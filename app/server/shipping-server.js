/* ==========================================================================
 *  shipping-server.js — jembatan ke Biteship
 *  --------------------------------------------------------------------------
 *  KENAPA ADA SERVER INI SAMA SEKALI
 *  API key Biteship berhak MEMBUAT PESANAN KIRIM — artinya berhak
 *  mengeluarkan uang perusahaan. Menaruhnya di kode browser sama saja
 *  menyerahkannya kepada siapa pun yang membuka Inspect Element. Kunci hanya
 *  hidup di berkas .env di sini; browser bicara ke berkas ini, dan berkas ini
 *  yang bicara ke Biteship.
 *
 *  ENDPOINT
 *    GET  /api/kirim/health          → cek koneksi & jenis kunci
 *    GET  /api/kirim/couriers        → kurir yang aktif di akun Biteship
 *    GET  /api/kirim/areas?q=        → cari kelurahan / kode pos
 *    POST /api/kirim/rates           → tarif semua kurir untuk satu paket
 *    POST /api/kirim/orders          → buat pesanan kirim, kembalikan resi
 *    GET  /api/kirim/orders/:id      → status satu pesanan kirim
 *    GET  /api/kirim/tracking/:id    → riwayat perjalanan paket
 *    POST /api/kirim/webhook         → pemberitahuan status dari Biteship
 *
 *  Jalankan:  node shipping-server.js
 * ========================================================================== */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* ---------------------------------------------------------------- .env */
(function muatEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  const teks = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  for (const baris of teks.split(/\r?\n/)) {
    const m = baris.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
})();

const PORT = Number(process.env.SHIPPING_PORT || 4200);
const ASAL_BOLEH = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);

const BITESHIP = {
  base: 'https://api.biteship.com',
  get key() { return process.env.BITESHIP_API_KEY || ''; },
  /* Kunci uji berawalan `biteship_test.`, kunci produksi `biteship_live.`.
     Perbedaannya penting: yang satu tidak pernah memanggil kurir sungguhan,
     yang satu lagi menagih ongkos betulan pada setiap pesanan. */
  get jenis() {
    const k = this.key;
    if (k.startsWith('biteship_test.')) return 'test';
    if (k.startsWith('biteship_live.')) return 'live';
    return k ? 'tidak dikenali' : 'kosong';
  }
};

function wajibKey() {
  if (!BITESHIP.key) {
    const e = new Error('BITESHIP_API_KEY belum diisi di berkas .env');
    e.status = 503;
    throw e;
  }
}

/* ---------------------------------------------------------------- HTTP dasar */
function cors(req, res) {
  const asal = req.headers.origin;
  if (asal && ASAL_BOLEH.includes(asal)) {
    res.setHeader('Access-Control-Allow-Origin', asal);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function kirimJSON(res, kode, data) {
  const body = JSON.stringify(data);
  res.writeHead(kode, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function bacaBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const potongan = [];
    req.on('data', (c) => {
      n += c.length;
      /* Badan permintaan dibatasi: tanpa batas, satu unggahan raksasa bisa
         menghabiskan memori server hanya dengan satu permintaan. */
      if (n > 512 * 1024) { reject(new Error('Permintaan terlalu besar')); req.destroy(); return; }
      potongan.push(c);
    });
    req.on('end', () => {
      const s = Buffer.concat(potongan).toString('utf8');
      if (!s) return resolve({});
      try { resolve(JSON.parse(s)); } catch (e) { reject(new Error('Body bukan JSON yang sah')); }
    });
    req.on('error', reject);
  });
}

/**
 * Panggil Biteship. Sama seperti Midtrans, Biteship dapat membalas HTTP 200
 * sementara `success:false` di dalam badan pesan — memeriksa kode HTTP saja
 * membuat kegagalan lolos sebagai keberhasilan tanpa isi.
 */
async function biteship(jalur, opsi = {}) {
  wajibKey();
  const r = await fetch(BITESHIP.base + jalur, {
    method: opsi.method || 'GET',
    headers: {
      Authorization: BITESHIP.key,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: opsi.body ? JSON.stringify(opsi.body) : undefined
  });

  let json = {};
  try { json = await r.json(); } catch (e) { /* balasan kosong */ }

  if (!r.ok || json.success === false) {
    const err = new Error(json.error || json.message ||
      `Biteship menolak permintaan (HTTP ${r.status})`);
    err.status = r.status >= 400 && r.status < 500 ? 400 : 502;
    err.detail = json;
    throw err;
  }
  return json;
}

/* ---------------------------------------------------------------- pemetaan */
/**
 * Alamat tujuan boleh datang sebagai kode pos, sebagai koordinat, atau
 * keduanya. Koordinat didahulukan bila ada — ia jauh lebih tepat daripada
 * kode pos, yang di banyak kota mencakup wilayah beberapa kilometer.
 */
function titikKe(o, awalan) {
  const out = {};
  if (o && typeof o.lat === 'number' && typeof o.lng === 'number') {
    out[awalan + '_latitude'] = o.lat;
    out[awalan + '_longitude'] = o.lng;
  }
  if (o && o.kodePos) out[awalan + '_postal_code'] = Number(o.kodePos) || o.kodePos;
  if (o && o.areaId) out[awalan + '_area_id'] = o.areaId;
  if (o && o.alamat) out[awalan + '_address'] = String(o.alamat).slice(0, 250);
  return out;
}

function rapikanTarif(json) {
  return (json.pricing || []).map((p) => ({
    kurir: p.courier_code,
    kurirNama: p.courier_name,
    layanan: p.courier_service_code,
    layananNama: p.courier_service_name,
    tipe: p.type || 'kargo',
    harga: p.price,
    etd: p.duration || p.shipment_duration_range
      ? (p.duration || `${p.shipment_duration_range} ${p.shipment_duration_unit || ''}`).trim()
      : null,
    deskripsi: p.description || ''
  }));
}

function rapikanRiwayat(json) {
  const h = json.history || (json.courier && json.courier.history) || [];
  return h.map((x) => ({
    at: x.updated_at || x.date || null,
    judul: x.status || 'Pembaruan',
    ket: x.note || ''
  }));
}

/* ---------------------------------------------------------------- rute */
const rute = {

  'GET /api/kirim/health': async () => {
    if (!BITESHIP.key) {
      return { ok: false, mode: 'kosong',
        pesan: 'BITESHIP_API_KEY belum diisi di berkas .env pada server.' };
    }
    /* Daftar kurir dipakai sebagai uji hidup: ia ringan, tidak mengubah apa
       pun, dan sekaligus membuktikan kuncinya benar-benar diterima. */
    try {
      const j = await biteship('/v1/couriers');
      const kode = [...new Set((j.couriers || []).map((c) => c.courier_code))];
      return { ok: true, mode: BITESHIP.jenis,
        pesan: `Terhubung ke Biteship (kunci ${BITESHIP.jenis}). ${kode.length} kurir tersedia.`,
        kurir: kode };
    } catch (e) {
      return { ok: false, mode: BITESHIP.jenis, pesan: e.message };
    }
  },

  'GET /api/kirim/couriers': async () => {
    const j = await biteship('/v1/couriers');
    const peta = new Map();
    for (const c of j.couriers || []) {
      if (!peta.has(c.courier_code)) {
        peta.set(c.courier_code, { kurir: c.courier_code, nama: c.courier_name, layanan: [] });
      }
      peta.get(c.courier_code).layanan.push({
        kode: c.courier_service_code, nama: c.courier_service_name,
        tipe: c.shipping_type, deskripsi: c.description
      });
    }
    return { kurir: [...peta.values()] };
  },

  'GET /api/kirim/areas': async (req, res, url) => {
    const q = (url.searchParams.get('q') || '').trim();
    if (q.length < 3) return { areas: [] };
    const j = await biteship('/v1/maps/areas?countries=ID&type=single&input=' +
      encodeURIComponent(q));
    return {
      areas: (j.areas || []).slice(0, 20).map((a) => ({
        id: a.id, nama: a.name,
        kelurahan: a.administrative_division_level_4_name,
        kecamatan: a.administrative_division_level_3_name,
        kota: a.administrative_division_level_2_name,
        provinsi: a.administrative_division_level_1_name,
        kodePos: a.postal_code
      }))
    };
  },

  'POST /api/kirim/rates': async (req) => {
    const b = await bacaBody(req);
    if (!b.items || !b.items.length) {
      const e = new Error('Daftar barang kosong'); e.status = 400; throw e;
    }
    const body = Object.assign(
      titikKe(b.dari, 'origin'),
      titikKe(b.ke, 'destination'),
      {
        couriers: (b.kurir && b.kurir.length ? b.kurir : ['jne', 'jnt', 'sicepat']).join(','),
        items: b.items.map((i) => ({
          name: String(i.name || 'Barang').slice(0, 80),
          description: String(i.description || '').slice(0, 120),
          value: Math.max(0, Number(i.value) || 0),
          quantity: Math.max(1, Number(i.quantity) || 1),
          weight: Math.max(1, Number(i.weight) || 1000),
          length: Number(i.length) || 20,
          width: Number(i.width) || 15,
          height: Number(i.height) || 10
        }))
      }
    );
    const j = await biteship('/v1/rates/couriers', { method: 'POST', body });
    return { opsi: rapikanTarif(j) };
  },

  'POST /api/kirim/orders': async (req) => {
    const b = await bacaBody(req);
    if (!b.kurir || !b.layanan) {
      const e = new Error('Kurir dan layanan wajib dipilih lebih dulu'); e.status = 400; throw e;
    }
    const body = {
      shipper_contact_name: process.env.SHIPPER_NAME || 'EXOCLEAN',
      shipper_contact_phone: process.env.SHIPPER_PHONE || '081234567001',
      shipper_contact_email: process.env.SHIPPER_EMAIL || 'ops@exoclean.id',
      shipper_organization: 'EXOCLEAN',

      origin_contact_name: process.env.SHIPPER_NAME || 'EXOCLEAN',
      origin_contact_phone: process.env.SHIPPER_PHONE || '081234567001',
      origin_address: (b.dari && b.dari.alamat) || '',
      origin_postal_code: Number((b.dari && b.dari.kodePos) || 0) || undefined,
      origin_coordinate: b.dari && typeof b.dari.lat === 'number'
        ? { latitude: b.dari.lat, longitude: b.dari.lng } : undefined,

      destination_contact_name: (b.ke && b.ke.nama) || 'Penerima',
      destination_contact_phone: (b.ke && b.ke.telp) || '',
      destination_contact_email: (b.ke && b.ke.email) || undefined,
      destination_address: (b.ke && b.ke.alamat) || '',
      destination_postal_code: Number((b.ke && b.ke.kodePos) || 0) || undefined,
      destination_coordinate: b.ke && typeof b.ke.lat === 'number'
        ? { latitude: b.ke.lat, longitude: b.ke.lng } : undefined,
      destination_note: (b.ke && b.ke.catatan) || '',

      courier_company: b.kurir,
      courier_type: b.layanan,
      courier_insurance: b.asuransi ? Math.max(0, Number(b.nilaiBarang) || 0) : undefined,
      delivery_type: 'now',
      order_note: `Pesanan ${b.refId || ''}`.trim(),
      reference_id: b.refId || undefined,
      items: b.items || []
    };

    const j = await biteship('/v1/orders', { method: 'POST', body });
    return {
      orderId: j.id,
      resi: j.courier && (j.courier.waybill_id || j.courier.tracking_id) || null,
      trackingId: j.courier && j.courier.tracking_id || null,
      status: j.status || 'confirmed',
      harga: j.price || null
    };
  },

  'GET /api/kirim/orders/:id': async (req, res, url, params) => {
    const j = await biteship('/v1/orders/' + encodeURIComponent(params.id));
    return {
      orderId: j.id, status: j.status,
      resi: j.courier && j.courier.waybill_id || null,
      riwayat: rapikanRiwayat(j)
    };
  },

  'GET /api/kirim/tracking/:id': async (req, res, url, params) => {
    /* Biteship punya dua jalur pelacakan: menurut id pesanan dan menurut nomor
       resi. Yang dipakai aplikasi adalah id pesanan — nomor resi baru terbit
       belakangan dan kadang belum ada saat pengguna menekan "Lacak". */
    const j = await biteship('/v1/orders/' + encodeURIComponent(params.id));
    return { status: j.status, resi: j.courier && j.courier.waybill_id || null,
      riwayat: rapikanRiwayat(j) };
  },

  'POST /api/kirim/webhook': async (req) => {
    const b = await bacaBody(req);
    /* Webhook adalah SATU-SATUNYA sumber kebenaran status pengiriman: paket
       bergerak tanpa ada yang membuka aplikasi. Bila BITESHIP_WEBHOOK_SECRET
       diisi, cocokkan dulu — tanpa itu, siapa pun yang tahu alamat ini bisa
       mengaku paket sudah terkirim. */
    const rahasia = process.env.BITESHIP_WEBHOOK_SECRET || '';
    if (rahasia) {
      /* Panjang dibandingkan dalam BYTE, bukan panjang string. Header berisi
         karakter multibyte bisa punya panjang string yang sama tetapi jumlah
         byte berbeda, dan timingSafeEqual melempar galat untuk buffer yang
         tidak sama panjang — hasilnya 500, bukan 401, dan penyerang jadi tahu
         tebakannya diperlakukan berbeda. */
      const a = Buffer.from(String(req.headers['x-biteship-signature'] || ''), 'utf8');
      const b = Buffer.from(rahasia, 'utf8');
      const cocok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!cocok) { const e = new Error('Tanda tangan webhook tidak cocok'); e.status = 401; throw e; }
    }
    /* TODO produksi: perbarui status pesanan di database Anda di sini. */
    console.log('[webhook] pesanan %s → %s', b.order_id || b.id || '?', b.status || '?');
    return { diterima: true };
  }
};

/* ---------------------------------------------------------------- server */
const TLS = require('./tls');
const jadi = TLS.bikinServer(null, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const kunciLangsung = `${req.method} ${url.pathname}`;

  let penangan = rute[kunciLangsung];
  let params = {};

  if (!penangan) {
    /* cocokkan rute berparameter, mis. /api/kirim/tracking/:id */
    for (const k of Object.keys(rute)) {
      if (!k.includes('/:')) continue;
      const [metode, pola] = k.split(' ');
      if (metode !== req.method) continue;
      const bagianPola = pola.split('/');
      const bagianUrl = url.pathname.split('/');
      if (bagianPola.length !== bagianUrl.length) continue;
      const nilai = {};
      const cocok = bagianPola.every((seg, i) => {
        if (seg.startsWith(':')) { nilai[seg.slice(1)] = decodeURIComponent(bagianUrl[i]); return true; }
        return seg === bagianUrl[i];
      });
      if (cocok) { penangan = rute[k]; params = nilai; break; }
    }
  }

  if (!penangan) { kirimJSON(res, 404, { error: 'Rute tidak dikenali' }); return; }

  try {
    const hasil = await penangan(req, res, url, params);
    kirimJSON(res, 200, hasil);
  } catch (e) {
    const kode = e.status || 500;
    /* Pesan galat dari Biteship boleh diteruskan; kuncinya tidak pernah ikut
       karena ia tidak pernah ada di dalam pesan galat mana pun. */
    kirimJSON(res, kode, { error: e.message || 'Kesalahan server' });
  }
});

const server = jadi.server;
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('shipping-server', PORT, ALAMAT));
  console.log(`  kunci Biteship : ${BITESHIP.jenis}`);
  console.log(`  origin diizinkan: ${ASAL_BOLEH.join(', ')}`);
  if (BITESHIP.jenis === 'live') {
    console.log('  ⚠ KUNCI PRODUKSI — setiap pesanan kirim menagih ongkos sungguhan.');
  }
});
