/* ==========================================================================
 *  kirim-server.js — jembatan EXOCLEAN ke Biteship (tarif, pesanan kirim,
 *  pelacakan, webhook) untuk marketplace perlengkapan.
 *  --------------------------------------------------------------------------
 *  KENAPA ADA SERVER INI
 *  API key Biteship berhak MEMBUAT PESANAN KIRIM — artinya mengeluarkan uang
 *  perusahaan. Kunci hanya hidup di .env di sini; browser bicara ke server
 *  ini, dan server ini yang bicara ke Biteship.
 *
 *  ENDPOINT (semua di bawah /api/kirim)
 *    GET  /health            → hidup? jenis kunci (test/live/kosong), kurir
 *    GET  /couriers          → kurir & layanan yang aktif di akun Biteship
 *    GET  /areas?q=          → cari kelurahan / kode pos
 *    POST /rates             → tarif kurir untuk satu paket (dari, ke, items)
 *    POST /orders            → buat pesanan kirim → id, resi; disimpan per refId
 *    GET  /status/:ref       → status tersimpan (diperbarui webhook/pelacakan)
 *    GET  /tracking/:id      → riwayat perjalanan langsung dari Biteship
 *    POST /webhook           → pemberitahuan status dari Biteship (tanda tangan)
 *
 *  Pengaman (keamanan.js): header pengaman, CORS ketat (ALLOWED_ORIGINS),
 *  pembatas laju per IP, JSON-only, log tanpa PII. Pesanan kirim dibatasi
 *  per IP (LAJU_KIRIM_ORDER_PER_JAM) karena setiap pesanan = biaya.
 *  Penyimpanan: data/kirim.json (refId → {orderId, resi, status, riwayat}).
 *
 *  Jalankan: npm run start:kirim   (KIRIM_PORT, bawaan 4300)
 * ========================================================================== */
'use strict';

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');
const SESI = require('./sesi');

const app = express();
const PORT = Number(process.env.KIRIM_PORT || process.env.SHIPPING_PORT || 4300);
const BERKAS = path.join(__dirname, 'data', 'kirim.json');

app.use(express.json({ limit: '64kb' }));
const ASAL = KEAMANAN.pasangDasar(app, process.env, 'kirim');
const lajuTarif = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_KIRIM_TARIF_PER_MENIT || 30) });
const lajuPesan = KEAMANAN.batasLaju({ jendelaDetik: 3600, maks: Number(process.env.LAJU_KIRIM_ORDER_PER_JAM || 20) });
const lajuBaca = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_KIRIM_BACA_PER_MENIT || 60) });
/* Sesi wajib: semua endpoint yang memanggil Biteship (berbayar) atau membuka data pesanan; daftar hanya admin; webhook & health bebas. */
const wajibSesi = SESI.wajibDariEnv(process.env), wajibAdmin = SESI.wajibDariEnv(process.env, { sisi: ['admin'] });

/* ---------------------------------------------------------------- Biteship */
const BITESHIP = {
  base: 'https://api.biteship.com',
  get key() { return (process.env.BITESHIP_API_KEY || '').trim(); },
  get jenis() { const k = this.key; if (k.startsWith('biteship_test.')) return 'test'; if (k.startsWith('biteship_live.')) return 'live'; return k ? 'tidak dikenali' : 'kosong'; }
};
/* Mode simulasi (KIRIM_SIMULASI=1): tarif & pesanan kirim tiruan untuk
   pengembangan tanpa saldo Biteship. Tidak pernah memanggil Biteship. Status
   pesanan tiruan maju sendiri: 1 menit → dijemput, 3 menit → terkirim. */
const SIMULASI = process.env.KIRIM_SIMULASI === '1';
function jarakKm(a, b) { if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return 18; const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180, x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
function tarifSimulasi(dari, ke, items) {
  const km = jarakKm(dari, ke), kg = Math.max(1, Math.ceil(items.reduce((n, i) => n + i.weight * i.quantity, 0) / 1000)), dasar = 8000 + 1500 * (kg - 1) + Math.round(km * 150 / 100) * 100;
  const opsi = [
    { kurir: 'jne', kurirNama: 'JNE', layanan: 'reg', layananNama: 'Reguler', tipe: 'reguler', harga: dasar, etd: '2 - 3 hari', deskripsi: 'simulasi' },
    { kurir: 'jne', kurirNama: 'JNE', layanan: 'yes', layananNama: 'Yakin Esok Sampai', tipe: 'next_day', harga: dasar + 9000, etd: '1 hari', deskripsi: 'simulasi' },
    { kurir: 'sicepat', kurirNama: 'SiCepat', layanan: 'reg', layananNama: 'Reguler', tipe: 'reguler', harga: dasar - 1000, etd: '2 - 3 hari', deskripsi: 'simulasi' },
    { kurir: 'anteraja', kurirNama: 'AnterAja', layanan: 'nextday', layananNama: 'Next Day', tipe: 'next_day', harga: dasar + 6000, etd: '1 hari', deskripsi: 'simulasi' }
  ];
  if (km < 40) opsi.push({ kurir: 'grab', kurirNama: 'Grab', layanan: 'instant', layananNama: 'Instant', tipe: 'same_day', harga: 12000 + Math.round(km * 2500 / 500) * 500, etd: '1 - 3 jam', deskripsi: 'simulasi' });
  return opsi;
}
function majukanSimulasi(r) { if (!r.simulasi || ['selesai', 'dibatalkan', 'gagal', 'retur'].indexOf(r.status) >= 0) return r; const menit = (Date.now() - new Date(r.at).getTime()) / 60000; const tahap = menit >= 3 ? ['delivered', 'selesai', 'Paket diterima penerima'] : menit >= 1 ? ['dropping_off', 'dikirim', 'Kurir dalam perjalanan ke penerima'] : null; if (tahap && r.statusKurir !== tahap[0]) { r.statusKurir = tahap[0]; r.status = tahap[1]; r.riwayat = (r.riwayat || []).concat([{ at: new Date().toISOString(), judul: tahap[0], ket: tahap[2] }]); r.diperbarui = new Date().toISOString(); } return r; }
function galat(pesan, status, detail) { const e = new Error(pesan); e.status = status || 500; if (detail) e.detail = detail; return e; }
async function biteship(jalur, opsi) {
  opsi = opsi || {};
  if (!BITESHIP.key) throw galat('BITESHIP_API_KEY belum diisi di berkas .env', 503);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
  let r;
  try {
    r = await fetch(BITESHIP.base + jalur, { method: opsi.method || 'GET', signal: ctl.signal,
      headers: { Authorization: BITESHIP.key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: opsi.body ? JSON.stringify(opsi.body) : undefined });
  } catch (e) { throw galat('Biteship tidak terjangkau: ' + (e.name === 'AbortError' ? 'waktu habis' : e.message), 502); }
  finally { clearTimeout(timer); }
  let json = {}; try { json = await r.json(); } catch (e) { /* kosong */ }
  /* Biteship bisa membalas HTTP 200 dengan success:false di badan. */
  if (!r.ok || json.success === false) throw galat(json.error || json.message || ('Biteship menolak permintaan (HTTP ' + r.status + ')'), r.status >= 400 && r.status < 500 ? 400 : 502, json);
  return json;
}

/* ---------------------------------------------------------------- penyimpanan */
function bacaSimpanan() { try { return JSON.parse(fs.readFileSync(BERKAS, 'utf8')) || {}; } catch (e) { return {}; } }
function tulisSimpanan(obj) { fs.mkdirSync(path.dirname(BERKAS), { recursive: true }); const tmp = BERKAS + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj, null, 2)); fs.renameSync(tmp, BERKAS); }
function refSah(ref) { return /^[A-Za-z0-9_\-]{1,40}$/.test(String(ref || '')); }
const PETA_STATUS = { confirmed: 'diproses', allocated: 'diproses', picking_up: 'diproses', picked: 'dikirim', dropping_off: 'dikirim', on_hold: 'dikirim', delivered: 'selesai', return_in_transit: 'retur', returned: 'retur', rejected: 'gagal', cancelled: 'dibatalkan', courier_not_found: 'gagal', disposed: 'gagal' };
function statusApp(s) { return PETA_STATUS[String(s || '').toLowerCase()] || 'diproses'; }

/* ---------------------------------------------------------------- pemetaan */
function titik(o, awalan) {
  const out = {}; if (!o) return out;
  if (typeof o.lat === 'number' && typeof o.lng === 'number') { out[awalan + '_latitude'] = o.lat; out[awalan + '_longitude'] = o.lng; }
  if (o.kodePos) out[awalan + '_postal_code'] = Number(o.kodePos) || undefined;
  if (o.areaId) out[awalan + '_area_id'] = KEAMANAN.batasiTeks(o.areaId, 80);
  return out;
}
function rapikanBarang(items) {
  return (items || []).slice(0, 50).map((i) => ({
    name: KEAMANAN.batasiTeks(i.name || 'Barang', 80), description: KEAMANAN.batasiTeks(i.description || '', 120),
    value: Math.max(0, Math.round(Number(i.value) || 0)), quantity: Math.max(1, Math.min(999, Math.round(Number(i.quantity) || 1))),
    weight: Math.max(1, Math.min(200000, Math.round(Number(i.weight) || 1000))),
    length: Number(i.length) || 20, width: Number(i.width) || 15, height: Number(i.height) || 10
  }));
}
function rapikanTarif(json) {
  return (json.pricing || []).map((p) => ({ kurir: p.courier_code, kurirNama: p.courier_name, layanan: p.courier_service_code, layananNama: p.courier_service_name, tipe: p.type || '', harga: p.price, etd: p.duration || (p.shipment_duration_range ? (p.shipment_duration_range + ' ' + (p.shipment_duration_unit || '')).trim() : null), deskripsi: p.description || '' }));
}
function rapikanRiwayat(json) { const h = json.history || (json.courier && json.courier.history) || []; return h.map((x) => ({ at: x.updated_at || x.date || null, judul: x.status || 'Pembaruan', ket: x.note || '' })); }
const KURIR_BAWAAN = ['jne', 'jnt', 'sicepat', 'anteraja', 'grab', 'gojek'];

/* ---------------------------------------------------------------- rute */
app.get('/api/kirim/health', lajuBaca, async (req, res) => {
  if (SIMULASI) return res.json({ ok: true, layanan: 'EXOCLEAN kirim-server', siap: true, mode: 'simulasi', kurir: ['jne', 'sicepat', 'anteraja', 'grab'], webhook: !!process.env.BITESHIP_WEBHOOK_SECRET, pesan: 'MODE SIMULASI — tarif & resi tiruan, tidak memanggil Biteship.' });
  if (!BITESHIP.key) return res.json({ ok: true, layanan: 'EXOCLEAN kirim-server', siap: false, mode: 'kosong', pesan: 'BITESHIP_API_KEY belum diisi — aplikasi memakai tarif statis.' });
  try { const j = await biteship('/v1/couriers'); const kode = [...new Set((j.couriers || []).map((c) => c.courier_code))]; res.json({ ok: true, layanan: 'EXOCLEAN kirim-server', siap: true, mode: BITESHIP.jenis, kurir: kode, webhook: !!process.env.BITESHIP_WEBHOOK_SECRET, pesan: 'Terhubung ke Biteship (kunci ' + BITESHIP.jenis + '), ' + kode.length + ' kurir.' }); }
  catch (e) { res.json({ ok: true, layanan: 'EXOCLEAN kirim-server', siap: false, mode: BITESHIP.jenis, pesan: e.message }); }
});

app.get('/api/kirim/couriers', wajibSesi, lajuBaca, async (req, res, next) => {
  try { const j = await biteship('/v1/couriers'); const peta = new Map();
    for (const c of j.couriers || []) { if (!peta.has(c.courier_code)) peta.set(c.courier_code, { kurir: c.courier_code, nama: c.courier_name, layanan: [] }); peta.get(c.courier_code).layanan.push({ kode: c.courier_service_code, nama: c.courier_service_name, tipe: c.shipping_type, deskripsi: c.description }); }
    res.json({ kurir: [...peta.values()] }); } catch (e) { next(e); }
});

app.get('/api/kirim/areas', wajibSesi, lajuBaca, async (req, res, next) => {
  try { const q = KEAMANAN.batasiTeks(req.query.q, 60); if (q.length < 3) return res.json({ areas: [] });
    const j = await biteship('/v1/maps/areas?countries=ID&type=single&input=' + encodeURIComponent(q));
    res.json({ areas: (j.areas || []).slice(0, 20).map((a) => ({ id: a.id, nama: a.name, kelurahan: a.administrative_division_level_4_name, kecamatan: a.administrative_division_level_3_name, kota: a.administrative_division_level_2_name, provinsi: a.administrative_division_level_1_name, kodePos: a.postal_code })) }); } catch (e) { next(e); }
});

app.post('/api/kirim/rates', wajibSesi, lajuTarif, async (req, res, next) => {
  try {
    const b = req.body || {}; const items = rapikanBarang(b.items);
    if (!items.length) throw galat('Daftar barang kosong', 400);
    const dari = titik(b.dari, 'origin'), ke = titik(b.ke, 'destination');
    if (!Object.keys(dari).length || !Object.keys(ke).length) throw galat('Alamat asal dan tujuan butuh kode pos atau koordinat', 400);
    if (SIMULASI) return res.json({ opsi: tarifSimulasi(b.dari, b.ke, items), mode: 'simulasi' });
    const kurir = (Array.isArray(b.kurir) && b.kurir.length ? b.kurir : KURIR_BAWAAN).map((k) => KEAMANAN.batasiTeks(k, 20).toLowerCase()).filter((k) => /^[a-z0-9_]+$/.test(k)).slice(0, 12);
    const j = await biteship('/v1/rates/couriers', { method: 'POST', body: Object.assign(dari, ke, { couriers: kurir.join(','), items }) });
    res.json({ opsi: rapikanTarif(j), mode: BITESHIP.jenis });
  } catch (e) { next(e); }
});

app.post('/api/kirim/orders', wajibSesi, lajuPesan, async (req, res, next) => {
  try {
    const b = req.body || {};
    const ref = KEAMANAN.batasiTeks(b.refId, 40);
    if (!refSah(ref)) throw galat('refId (nomor pesanan) wajib dan hanya huruf/angka/-/_', 400);
    if (!b.kurir || !b.layanan) throw galat('Kurir dan layanan wajib dipilih lebih dulu', 400);
    const simpanan = bacaSimpanan();
    if (simpanan[ref] && simpanan[ref].orderId) { if (!SESI.pemilikCocok(req, simpanan[ref].pemilik)) throw galat('Pesanan kirim ini milik akun lain', 403); return res.json(Object.assign({ sudahAda: true }, simpanan[ref])); }   /* idempoten: tidak membuat pesanan kirim dua kali */
    const items = rapikanBarang(b.items); if (!items.length) throw galat('Daftar barang kosong', 400);
    const dari = b.dari || {}, ke = b.ke || {};
    const body = {
      shipper_contact_name: process.env.SHIPPER_NAME || 'EXOCLEAN', shipper_contact_phone: process.env.SHIPPER_PHONE || '081234567001', shipper_contact_email: process.env.SHIPPER_EMAIL || 'ops@exoclean.id', shipper_organization: 'EXOCLEAN',
      origin_contact_name: KEAMANAN.batasiTeks(dari.nama || process.env.SHIPPER_NAME || 'EXOCLEAN', 60), origin_contact_phone: KEAMANAN.batasiTeks(dari.telp || process.env.SHIPPER_PHONE || '081234567001', 20),
      origin_address: KEAMANAN.batasiTeks(dari.alamat, 250), origin_postal_code: Number(dari.kodePos) || undefined, origin_coordinate: typeof dari.lat === 'number' ? { latitude: dari.lat, longitude: dari.lng } : undefined,
      destination_contact_name: KEAMANAN.batasiTeks(ke.nama || 'Penerima', 60), destination_contact_phone: KEAMANAN.batasiTeks(ke.telp, 20), destination_contact_email: ke.email ? KEAMANAN.batasiTeks(ke.email, 80) : undefined,
      destination_address: KEAMANAN.batasiTeks(ke.alamat, 250), destination_postal_code: Number(ke.kodePos) || undefined, destination_coordinate: typeof ke.lat === 'number' ? { latitude: ke.lat, longitude: ke.lng } : undefined, destination_note: KEAMANAN.batasiTeks(ke.catatan, 120),
      courier_company: KEAMANAN.batasiTeks(b.kurir, 20).toLowerCase(), courier_type: KEAMANAN.batasiTeks(b.layanan, 30).toLowerCase(), courier_insurance: b.asuransi ? Math.max(0, Number(b.nilaiBarang) || 0) : undefined,
      delivery_type: 'now', order_note: 'EXOCLEAN ' + ref, reference_id: ref, items
    };
    if (SIMULASI) { const rs = { refId: ref, orderId: 'sim_' + ref.toLowerCase(), trackingId: 'SIM' + Date.now().toString(36).toUpperCase(), resi: 'SIM' + Date.now().toString(36).toUpperCase(), kurir: body.courier_company, layanan: body.courier_type, status: 'diproses', statusKurir: 'confirmed', harga: null, riwayat: [{ at: new Date().toISOString(), judul: 'confirmed', ket: 'Pesanan kirim tiruan dibuat (simulasi)' }], at: new Date().toISOString(), diperbarui: new Date().toISOString(), simulasi: true, pemilik: SESI.subDariReq(req) }; simpanan[ref] = rs; tulisSimpanan(simpanan); return res.json(rs); }
    const j = await biteship('/v1/orders', { method: 'POST', body });
    const rekam = { refId: ref, orderId: j.id, trackingId: j.courier && j.courier.tracking_id || null, resi: j.courier && (j.courier.waybill_id || j.courier.tracking_id) || null, kurir: body.courier_company, layanan: body.courier_type, status: statusApp(j.status), statusKurir: j.status || 'confirmed', harga: j.price || null, riwayat: [], at: new Date().toISOString(), diperbarui: new Date().toISOString(), pemilik: SESI.subDariReq(req) };
    simpanan[ref] = rekam; tulisSimpanan(simpanan);
    console.log('[kirim] pesanan kirim dibuat untuk ' + ref + ' (' + body.courier_company + '/' + body.courier_type + ') mode ' + BITESHIP.jenis);
    res.json(rekam);
  } catch (e) { next(e); }
});

app.get('/api/kirim/daftar', wajibAdmin, lajuBaca, (req, res) => { const s = bacaSimpanan(); const daftar = Object.keys(s).map((k) => { const r = s[k]; if (r.simulasi) majukanSimulasi(r); return { refId:r.refId, orderId:r.orderId, resi:r.resi, kurir:r.kurir, layanan:r.layanan, status:r.status, statusKurir:r.statusKurir, at:r.at, diperbarui:r.diperbarui, simulasi:!!r.simulasi }; }).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200); res.json({ total:Object.keys(s).length, daftar }); });

app.get('/api/kirim/status/:ref', wajibSesi, lajuBaca, async (req, res) => {
  const ref = req.params.ref; if (!refSah(ref)) return res.status(404).json({ error: 'Tidak ada' });
  const simpanan = bacaSimpanan(), r = simpanan[ref];
  if (!r) return res.status(404).json({ error: 'Belum ada pesanan kirim untuk nomor ini' });
  if (!SESI.pemilikCocok(req, r.pemilik)) return res.status(403).json({ error: 'Pesanan kirim ini milik akun lain' });
  if (r.simulasi) { majukanSimulasi(r); simpanan[ref] = r; tulisSimpanan(simpanan); return res.json(r); }
  /* Segarkan dari Biteship bila sudah > 10 menit dan belum final (webhook bisa tidak sampai saat pengembangan). */
  if (r.orderId && ['selesai', 'dibatalkan', 'gagal', 'retur'].indexOf(r.status) < 0 && Date.now() - new Date(r.diperbarui).getTime() > 600000 && BITESHIP.key) {
    try { const j = await biteship('/v1/orders/' + encodeURIComponent(r.orderId)); r.statusKurir = j.status || r.statusKurir; r.status = statusApp(j.status); r.resi = j.courier && j.courier.waybill_id || r.resi; r.riwayat = rapikanRiwayat(j); r.diperbarui = new Date().toISOString(); simpanan[ref] = r; tulisSimpanan(simpanan); } catch (e) { /* tetap pakai yang tersimpan */ }
  }
  res.json(r);
});

app.get('/api/kirim/tracking/:id', wajibSesi, lajuBaca, async (req, res, next) => {
  try { const id = KEAMANAN.batasiTeks(req.params.id, 60); if (!/^[A-Za-z0-9_\-]+$/.test(id)) throw galat('Id tidak sah', 400);
    const j = await biteship('/v1/orders/' + encodeURIComponent(id)); res.json({ status: statusApp(j.status), statusKurir: j.status, resi: j.courier && j.courier.waybill_id || null, riwayat: rapikanRiwayat(j) }); } catch (e) { next(e); }
});

app.post('/api/kirim/webhook', lajuBaca, (req, res) => {
  /* Webhook adalah sumber kebenaran status: paket bergerak tanpa ada yang membuka
     aplikasi. BITESHIP_WEBHOOK_SECRET dicocokkan dengan header x-biteship-signature. */
  const rahasia = process.env.BITESHIP_WEBHOOK_SECRET || '';
  if (rahasia) { if (!KEAMANAN.samaAman(String(req.headers['x-biteship-signature'] || ''), rahasia)) return res.status(401).json({ error: 'Tanda tangan webhook tidak cocok' }); }
  else if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'BITESHIP_WEBHOOK_SECRET belum diisi' });
  const b = req.body || {}, simpanan = bacaSimpanan();
  const ref = KEAMANAN.batasiTeks(b.reference_id || b.order_reference_id || '', 40), oid = KEAMANAN.batasiTeks(b.order_id || b.id || '', 60);
  const kunci = Object.keys(simpanan).find((k) => (ref && k === ref) || (oid && simpanan[k].orderId === oid));
  if (kunci) {
    const r = simpanan[kunci]; r.statusKurir = b.status || r.statusKurir; r.status = statusApp(b.status); if (b.courier_waybill_id) r.resi = b.courier_waybill_id; if (b.courier_tracking_id) r.trackingId = b.courier_tracking_id;
    r.riwayat = (r.riwayat || []).concat([{ at: new Date().toISOString(), judul: b.status || 'Pembaruan', ket: KEAMANAN.batasiTeks(b.note || b.courier_driver_name || '', 120) }]).slice(-30); r.diperbarui = new Date().toISOString();
    tulisSimpanan(simpanan); console.log('[webhook] ' + kunci + ' → ' + r.statusKurir);
  } else console.log('[webhook] pesanan tidak dikenal: ' + (ref || oid || '?'));
  res.json({ diterima: true });
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));
app.use((err, req, res, next) => { const kode = err.status || 500; if (kode >= 500) console.error('[kirim] ' + (err.message || err)); res.status(kode).json({ error: err.message || 'Kesalahan server' }); }); // eslint-disable-line no-unused-vars

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN kirim-server', PORT, ALAMAT));
  if (SIMULASI) console.log('  MODE SIMULASI  : tarif & resi tiruan (KIRIM_SIMULASI=1) — jangan di produksi');
  console.log('  Kunci Biteship : ' + BITESHIP.jenis + (BITESHIP.jenis === 'live' ? '  ⚠ PRODUKSI — setiap pesanan kirim menagih ongkos sungguhan' : ''));
  console.log('  Webhook secret : ' + (process.env.BITESHIP_WEBHOOK_SECRET ? 'terpasang' : 'KOSONG'));
  console.log('  Asal yang diizinkan: ' + ASAL.join(', '));
});
module.exports = app;
