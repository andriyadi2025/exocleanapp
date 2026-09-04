/* ============================================================================
 *  EXOCLEAN — server pembayaran (Midtrans & Xendit)
 *  ---------------------------------------------------------------------------
 *  Inilah bagian yang TIDAK BISA dijalankan di browser: Server Key / Secret Key
 *  hanya boleh ada di sini, dan webhook dari gateway hanya bisa diterima server.
 *
 *  Menyediakan 4 endpoint yang dipanggil aplikasi EXOCLEAN:
 *    GET  /api/pay/health            → cek koneksi (dipakai tombol "Uji koneksi")
 *    POST /api/pay/charge            → buat transaksi, balikan dinormalkan
 *    POST /api/pay/status            → tanya status satu transaksi
 *    POST /api/pay/authorize         → tahan dana (pre-auth kartu kredit Midtrans)
 *    POST /api/pay/capture           → tangkap dana yang ditahan setelah kunjungan selesai
 *    POST /api/pay/cancel            → lepas dana yang ditahan (pesanan dibatalkan)
 *    POST /api/pay/webhook/midtrans  → notifikasi Midtrans (verifikasi signature)
 *    POST /api/pay/webhook/xendit    → callback Xendit (verifikasi callback token)
 *
 *  Menjalankan:
 *      npm install
 *      cp .env.example .env      # lalu isi kunci-kuncinya
 *      npm start
 *
 *  CATATAN PENYIMPANAN
 *  Contoh ini menyimpan transaksi di memori + berkas JSON supaya bisa langsung
 *  dicoba. Untuk produksi, ganti fungsi di blok "PENYIMPANAN" dengan database
 *  sungguhan (PostgreSQL/Supabase) — sisanya tidak perlu diubah.
 * ========================================================================== */

'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

/* Midtrans mengirim notifikasi sebagai JSON biasa; kita butuh raw body-nya
   TIDAK untuk Midtrans (signature dihitung dari field, bukan body), tapi
   Xendit cukup memakai header token. Jadi JSON parser biasa sudah memadai. */
app.use(express.json({ limit: '1mb' }));

/* ---------------------------------------------------------------- CORS */
/* Hanya izinkan asal (origin) aplikasi EXOCLEAN Anda. Jangan pakai '*' di
   produksi bila endpoint ini nanti menerima data sensitif. */
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED.includes(origin) || ALLOWED.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ================================================================ PENYIMPANAN */
const DB_FILE = path.join(__dirname, 'transactions.json');
let store = {};
try { store = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (_) { store = {}; }

function simpan(orderId, data) {
  store[orderId] = Object.assign({}, store[orderId], data, { updatedAt: new Date().toISOString() });
  try { fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2)); } catch (e) { console.error('Gagal menulis berkas:', e.message); }
  return store[orderId];
}
function ambil(orderId) { return store[orderId] || null; }

/* ================================================================ KONFIGURASI */
const MT = {
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  mode: process.env.MIDTRANS_MODE || 'sandbox',
  get coreBase() { return this.mode === 'production' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'; },
  get snapBase() { return this.mode === 'production' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'; },
  get auth() { return 'Basic ' + Buffer.from(this.serverKey + ':').toString('base64'); }
};

const XD = {
  secretKey: process.env.XENDIT_SECRET_KEY || '',
  callbackToken: process.env.XENDIT_CALLBACK_TOKEN || '',
  base: 'https://api.xendit.co',
  get auth() { return 'Basic ' + Buffer.from(this.secretKey + ':').toString('base64'); }
};

/* Pemetaan id kanal aplikasi → parameter masing-masing gateway. */
const CHANNEL = {
  va_bca:     { mtType: 'bank_transfer', mtBank: 'bca',     xdBank: 'BCA' },
  va_bni:     { mtType: 'bank_transfer', mtBank: 'bni',     xdBank: 'BNI' },
  va_bri:     { mtType: 'bank_transfer', mtBank: 'bri',     xdBank: 'BRI' },
  va_permata: { mtType: 'bank_transfer', mtBank: 'permata', xdBank: 'PERMATA' },
  va_cimb:    { mtType: 'bank_transfer', mtBank: 'cimb',    xdBank: 'CIMB' },
  va_mandiri: { mtType: 'echannel',      mtBank: 'mandiri', xdBank: 'MANDIRI' },
  qris:       { mtType: 'qris',                             xdInvoiceMethods: ['QRIS'] },
  gopay:      { mtType: 'gopay',                            xdInvoiceMethods: ['QRIS'] },
  shopeepay:  { mtType: 'shopeepay',                        xdEwallet: 'SHOPEEPAY' },
  ovo:        {                                             xdEwallet: 'OVO' },
  dana:       {                                             xdEwallet: 'DANA' },
  linkaja:    {                                             xdEwallet: 'LINKAJA' },
  cc:         { mtSnap: true,                               xdInvoiceMethods: ['CREDIT_CARD'] },
  alfamart:   { mtType: 'cstore', mtStore: 'alfamart',      xdRetail: 'ALFAMART' },
  indomaret:  { mtType: 'cstore', mtStore: 'indomaret',     xdRetail: 'INDOMARET' }
};

/* ================================================================ UTIL */
async function panggil(url, opsi) {
  const res = await fetch(url, opsi);
  const teks = await res.text();
  let json = {};
  try { json = teks ? JSON.parse(teks) : {}; } catch (_) { json = { raw: teks }; }
  if (!res.ok) {
    const pesan = json.error_messages ? json.error_messages.join(', ')
      : (json.message || json.status_message || `HTTP ${res.status}`);
    const err = new Error(pesan);
    err.detail = json;
    throw err;
  }

  /* Midtrans membalas HTTP 200 SEKALIPUN permintaannya gagal — kegagalannya
     ditandai lewat `status_code` di dalam badan pesan (mis. 404 "Merchant pop
     id is not found" ketika sebuah kanal belum diaktifkan di akun merchant).
     Tanpa pemeriksaan ini, aplikasi menerima "sukses" tanpa nomor VA maupun
     QR, dan klien menatap halaman bayar yang kosong tanpa tahu sebabnya. */
  if (json.status_code !== undefined) {
    const kode = Number(json.status_code);
    if (!(kode >= 200 && kode < 300)) {
      const err = new Error(json.status_message ||
        `Gateway menolak (status_code ${json.status_code})`);
      err.detail = json;
      err.statusGateway = kode;
      throw err;
    }
  }
  return json;
}

function wajib(nilai, nama) {
  if (!nilai) throw new Error(`${nama} belum diisi di berkas .env`);
}

/**
 * Alamat kepulangan klien setelah membayar, diturunkan dari RETURN_URL supaya
 * cukup satu setelan yang diubah saat pindah ke domain produksi.
 *
 * Nilainya sengaja dikirim bersama setiap permintaan Snap, tidak menumpang
 * "Redirection Settings" di dashboard Midtrans. Alasannya: setelan dashboard
 * berlaku per-lingkungan dan mudah tertinggal saat berpindah Sandbox↔Produksi,
 * sementara alamat yang dikirim per-transaksi selalu cocok dengan tempat
 * aplikasinya benar-benar berjalan. Bila dikirim, ia menimpa setelan dashboard.
 */
function alamatPulang(tanda) {
  const dasar = process.env.RETURN_URL;
  if (!dasar) return undefined;
  try {
    const u = new URL(dasar);
    u.searchParams.set('bayar', tanda);
    return u.toString();
  } catch { return dasar; }
}

/* ================================================================ MIDTRANS */
async function chargeMidtrans({ orderId, channel, amount, customer, keterangan, invoiceNo }) {
  wajib(MT.serverKey, 'MIDTRANS_SERVER_KEY');
  const c = CHANNEL[channel];
  if (!c) throw new Error(`Kanal "${channel}" tidak dipetakan untuk Midtrans`);

  const pelanggan = {
    first_name: (customer.nama || 'Pelanggan').slice(0, 60),
    email: customer.email || undefined,
    phone: customer.telp || undefined
  };

  /* Kartu kredit lewat Snap: penanganan 3D Secure jauh lebih aman diserahkan
     ke halaman Snap daripada dibangun sendiri. */
  if (c.mtSnap) {
    const snap = await panggil(`${MT.snapBase}/snap/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: MT.auth },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: pelanggan,
        item_details: [{ id: invoiceNo || orderId, price: amount, quantity: 1, name: (keterangan || 'Pembayaran').slice(0, 50) }],
        enabled_payments: ['credit_card'],
        credit_card: { secure: true },
        callbacks: { finish: alamatPulang('selesai'), error: alamatPulang('gagal') }
      })
    });
    return { gatewayRef: snap.token, redirectUrl: snap.redirect_url };
  }

  /* Kanal lain lewat Core API supaya nomor VA / kode bayar / QR bisa
     ditampilkan langsung di dalam aplikasi. */
  const body = {
    payment_type: c.mtType,
    transaction_details: { order_id: orderId, gross_amount: amount },
    customer_details: pelanggan,
    item_details: [{ id: invoiceNo || orderId, price: amount, quantity: 1, name: (keterangan || 'Pembayaran').slice(0, 50) }]
  };

  if (c.mtType === 'bank_transfer') body.bank_transfer = { bank: c.mtBank };
  if (c.mtType === 'echannel') body.echannel = { bill_info1: 'Pembayaran', bill_info2: invoiceNo || orderId };
  if (c.mtType === 'cstore') body.cstore = { store: c.mtStore, message: invoiceNo || orderId };
  if (c.mtType === 'qris') body.qris = { acquirer: 'gopay' };
  if (c.mtType === 'gopay') body.gopay = { enable_callback: true, callback_url: process.env.RETURN_URL || undefined };

  const r = await panggil(`${MT.coreBase}/v2/charge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: MT.auth },
    body: JSON.stringify(body)
  });

  /* Normalkan bentuk balasan supaya aplikasi tidak perlu tahu bedanya. */
  const aksi = r.actions || [];
  const cari = (nama) => (aksi.find(a => a.name === nama) || {}).url;

  return {
    gatewayRef: r.transaction_id,
    va: r.va_numbers && r.va_numbers[0]
      ? { bank: r.va_numbers[0].bank.toUpperCase(), nomor: r.va_numbers[0].va_number }
      : r.permata_va_number ? { bank: 'PERMATA', nomor: r.permata_va_number }
      : r.biller_code ? { bank: 'MANDIRI', nomor: `${r.biller_code} / ${r.bill_key}` }
      : null,
    kodeBayar: r.payment_code || null,
    qrImageUrl: cari('generate-qr-code') || null,
    deeplink: cari('deeplink-redirect') || null,
    redirectUrl: cari('deeplink-redirect') || null,
    expiredAt: r.expiry_time ? new Date(r.expiry_time.replace(' ', 'T') + '+07:00').toISOString() : null
  };
}

async function statusMidtrans(orderId) {
  wajib(MT.serverKey, 'MIDTRANS_SERVER_KEY');
  const r = await panggil(`${MT.coreBase}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: MT.auth }
  });
  return { status: r.transaction_status, gatewayRef: r.transaction_id, mentah: r };
}

/* ---- penahanan dana (pre-authorization) ----------------------------------
   Aplikasi EXOCLEAN menahan dana pesanan instan saat memesan dan baru
   menagih (capture) setelah kunjungan dikonfirmasi selesai; pembatalan
   melepas dana (cancel). Di Midtrans pre-auth hanya tersedia untuk kartu
   kredit (type "authorize"); QRIS/VA/e-wallet ditagih saat selesai. */
async function authorizeMidtrans({ orderId, amount, customer, keterangan, invoiceNo }) {
  wajib(MT.serverKey, 'MIDTRANS_SERVER_KEY');
  const pelanggan = {
    first_name: (customer.nama || 'Pelanggan').slice(0, 60),
    email: customer.email || undefined,
    phone: customer.telp || undefined
  };
  const snap = await panggil(`${MT.snapBase}/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: MT.auth },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: pelanggan,
      item_details: [{ id: invoiceNo || orderId, price: amount, quantity: 1, name: (keterangan || 'Penahanan dana').slice(0, 50) }],
      enabled_payments: ['credit_card'],
      credit_card: { secure: true, type: 'authorize' },
      callbacks: { finish: alamatPulang('selesai'), error: alamatPulang('gagal') }
    })
  });
  return { gatewayRef: snap.token, redirectUrl: snap.redirect_url, jenis: 'tahan' };
}
async function captureMidtrans(orderId, amount) {
  wajib(MT.serverKey, 'MIDTRANS_SERVER_KEY');
  const st = await statusMidtrans(orderId);
  if (st.status !== 'authorize') throw new Error(`Transaksi ${orderId} berstatus "${st.status}", bukan authorize — tidak bisa di-capture`);
  const r = await panggil(`${MT.coreBase}/v2/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: MT.auth },
    body: JSON.stringify({ transaction_id: st.gatewayRef, gross_amount: amount })
  });
  return { status: r.transaction_status, gatewayRef: r.transaction_id, amount };
}
async function cancelMidtrans(orderId) {
  wajib(MT.serverKey, 'MIDTRANS_SERVER_KEY');
  const r = await panggil(`${MT.coreBase}/v2/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: MT.auth }
  });
  return { status: r.transaction_status, gatewayRef: r.transaction_id };
}

/** Verifikasi keaslian notifikasi Midtrans. */
function signatureMidtransValid(n) {
  const hitung = crypto.createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${MT.serverKey}`)
    .digest('hex');
  return hitung === n.signature_key;
}

/* ================================================================ XENDIT */
async function chargeXendit({ orderId, channel, amount, customer, keterangan, invoiceNo }) {
  wajib(XD.secretKey, 'XENDIT_SECRET_KEY');
  const c = CHANNEL[channel];
  if (!c) throw new Error(`Kanal "${channel}" tidak dipetakan untuk Xendit`);

  const H = { 'Content-Type': 'application/json', Authorization: XD.auth };

  /* Virtual Account langsung — supaya nomor VA bisa tampil di aplikasi. */
  if (c.xdBank) {
    const r = await panggil(`${XD.base}/callback_virtual_accounts`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        external_id: orderId, bank_code: c.xdBank,
        name: (customer.nama || 'EXOCLEAN').slice(0, 50),
        expected_amount: amount, is_closed: true, is_single_use: true,
        expiration_date: new Date(Date.now() + 24 * 3600000).toISOString()
      })
    });
    return {
      gatewayRef: r.id,
      va: { bank: r.bank_code, nomor: r.account_number },
      expiredAt: r.expiration_date || null
    };
  }

  /* E-wallet langsung — mengembalikan deeplink / URL checkout. */
  if (c.xdEwallet) {
    const r = await panggil(`${XD.base}/ewallets/charges`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        reference_id: orderId, currency: 'IDR', amount: amount,
        checkout_method: 'ONE_TIME_PAYMENT', channel_code: c.xdEwallet,
        channel_properties: {
          success_redirect_url: process.env.RETURN_URL || 'https://exoclean.id',
          ...(c.xdEwallet === 'OVO' ? { mobile_number: customer.telp ? '+' + customer.telp : undefined } : {})
        }
      })
    });
    const a = r.actions || {};
    return {
      gatewayRef: r.id,
      deeplink: a.mobile_deeplink_checkout_url || a.mobile_web_checkout_url || null,
      redirectUrl: a.desktop_web_checkout_url || a.mobile_web_checkout_url || null,
      qrString: a.qr_checkout_string || null
    };
  }

  /* Gerai retail. */
  if (c.xdRetail) {
    const r = await panggil(`${XD.base}/fixed_payment_code`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        external_id: orderId, retail_outlet_name: c.xdRetail,
        name: (customer.nama || 'EXOCLEAN').slice(0, 20).toUpperCase(),
        expected_amount: amount, is_single_use: true
      })
    });
    return { gatewayRef: r.id, kodeBayar: r.payment_code, expiredAt: r.expiration_date || null };
  }

  /* Sisanya (QRIS, kartu) lewat Invoice API — paling sederhana & lengkap. */
  const r = await panggil(`${XD.base}/v2/invoices`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      external_id: orderId, amount: amount,
      description: keterangan || `Pembayaran ${invoiceNo || orderId}`,
      payer_email: customer.email || undefined,
      customer: { given_names: customer.nama, email: customer.email, mobile_number: customer.telp ? '+' + customer.telp : undefined },
      payment_methods: c.xdInvoiceMethods || undefined,
      invoice_duration: 7200,
      success_redirect_url: process.env.RETURN_URL || undefined,
      currency: 'IDR'
    })
  });
  return {
    gatewayRef: r.id, redirectUrl: r.invoice_url,
    expiredAt: r.expiry_date || null
  };
}

async function statusXendit(orderId) {
  wajib(XD.secretKey, 'XENDIT_SECRET_KEY');
  /* Cari lewat external_id pada Invoice API; untuk VA/e-wallet status
     datang lewat callback dan sudah tersimpan di store. */
  const lokal = ambil(orderId);
  if (lokal && lokal.status) return { status: lokal.status, gatewayRef: lokal.gatewayRef };
  const r = await panggil(`${XD.base}/v2/invoices?external_id=${encodeURIComponent(orderId)}`, {
    headers: { Authorization: XD.auth }
  });
  const inv = Array.isArray(r) ? r[0] : r;
  return { status: inv ? String(inv.status).toLowerCase() : 'unknown', gatewayRef: inv && inv.id, mentah: inv };
}

/* ================================================================ ENDPOINT */
app.get('/api/pay/health', (req, res) => {
  res.json({
    ok: true,
    layanan: 'EXOCLEAN payment server',
    waktu: new Date().toISOString(),
    midtrans: { siap: Boolean(MT.serverKey), mode: MT.mode },
    xendit: { siap: Boolean(XD.secretKey), callbackToken: Boolean(XD.callbackToken) },
    transaksiTersimpan: Object.keys(store).length
  });
});

app.post('/api/pay/charge', async (req, res) => {
  const { gateway, orderId, channel, amount, customer = {}, keterangan, invoiceNo } = req.body || {};
  try {
    if (!orderId || !channel || !amount) throw new Error('orderId, channel, dan amount wajib diisi');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('amount harus bilangan bulat rupiah');

    const hasil = gateway === 'xendit'
      ? await chargeXendit({ orderId, channel, amount, customer, keterangan, invoiceNo })
      : await chargeMidtrans({ orderId, channel, amount, customer, keterangan, invoiceNo });

    simpan(orderId, {
      orderId, gateway, channel, amount, status: 'pending',
      gatewayRef: hasil.gatewayRef, createdAt: new Date().toISOString()
    });
    res.json(hasil);
  } catch (e) {
    console.error('[charge]', e.message, e.detail || '');
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/pay/status', async (req, res) => {
  const { gateway, orderId } = req.body || {};
  try {
    if (!orderId) throw new Error('orderId wajib diisi');
    const hasil = gateway === 'xendit' ? await statusXendit(orderId) : await statusMidtrans(orderId);
    simpan(orderId, { status: hasil.status });
    res.json(hasil);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/pay/authorize', async (req, res) => {
  const { gateway, orderId, channel, amount, customer = {}, keterangan, invoiceNo } = req.body || {};
  try {
    if (!orderId || !amount) throw new Error('orderId dan amount wajib diisi');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('amount harus bilangan bulat rupiah');
    if (gateway === 'xendit' || (channel && channel !== 'cc')) {
      return res.status(400).json({ error: 'Penahanan dana hanya tersedia untuk kartu kredit Midtrans', unsupported: true });
    }
    const hasil = await authorizeMidtrans({ orderId, amount, customer, keterangan, invoiceNo });
    simpan(orderId, { orderId, gateway: 'midtrans', channel: 'cc', amount, status: 'pending', jenis: 'tahan', gatewayRef: hasil.gatewayRef, createdAt: new Date().toISOString() });
    res.json(hasil);
  } catch (e) {
    console.error('[authorize]', e.message, e.detail || '');
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/pay/capture', async (req, res) => {
  const { orderId, amount } = req.body || {};
  try {
    if (!orderId || !amount) throw new Error('orderId dan amount wajib diisi');
    if (!Number.isInteger(amount) || amount < 1) throw new Error('amount harus bilangan bulat rupiah');
    const hasil = await captureMidtrans(orderId, amount);
    simpan(orderId, { status: 'paid', ditangkap: amount, capturedAt: new Date().toISOString() });
    res.json(hasil);
  } catch (e) {
    console.error('[capture]', e.message, e.detail || '');
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/pay/cancel', async (req, res) => {
  const { orderId } = req.body || {};
  try {
    if (!orderId) throw new Error('orderId wajib diisi');
    const hasil = await cancelMidtrans(orderId);
    simpan(orderId, { status: 'cancelled', cancelledAt: new Date().toISOString() });
    res.json(hasil);
  } catch (e) {
    console.error('[cancel]', e.message, e.detail || '');
    res.status(400).json({ error: e.message });
  }
});

/* ---------------------------------------------------------------- webhook */
app.post('/api/pay/webhook/midtrans', (req, res) => {
  const n = req.body || {};
  if (!signatureMidtransValid(n)) {
    console.warn('[webhook midtrans] signature tidak cocok untuk', n.order_id);
    return res.status(403).json({ error: 'Signature tidak valid' });
  }
  const s = n.transaction_status;
  const status = (s === 'capture' && n.fraud_status === 'accept') || s === 'settlement' ? 'paid'
    : s === 'authorize' ? 'held'
    : s === 'cancel' ? 'cancelled'
    : s === 'pending' ? 'pending'
    : s === 'expire' ? 'expired' : 'failed';

  simpan(n.order_id, { status, gatewayRef: n.transaction_id, mentah: n });
  console.log(`[webhook midtrans] ${n.order_id} → ${status}`);

  /* TODO produksi: perbarui invoice di database Anda di sini, mis.
     await db.query('UPDATE invoices SET status=$1 WHERE payment_ref=$2', [status, n.order_id]); */

  res.json({ ok: true });
});

app.post('/api/pay/webhook/xendit', (req, res) => {
  const token = req.headers['x-callback-token'];
  if (!XD.callbackToken || token !== XD.callbackToken) {
    console.warn('[webhook xendit] callback token tidak cocok');
    return res.status(403).json({ error: 'Callback token tidak valid' });
  }
  const b = req.body || {};
  /* Invoice callback memakai external_id + status; VA callback memakai
     external_id + amount tanpa status (artinya dana sudah masuk). */
  const orderId = b.external_id || (b.data && b.data.reference_id);
  const raw = String(b.status || (b.data && b.data.status) || 'PAID').toUpperCase();
  const status = raw === 'PAID' || raw === 'SETTLED' || raw === 'SUCCEEDED' ? 'paid'
    : raw === 'EXPIRED' ? 'expired'
    : raw === 'PENDING' ? 'pending' : 'failed';

  if (orderId) simpan(orderId, { status, gatewayRef: b.id || (b.data && b.data.id), mentah: b });
  console.log(`[webhook xendit] ${orderId} → ${status}`);

  /* TODO produksi: perbarui invoice di database Anda di sini. */

  res.json({ ok: true });
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));

const TLS = require('./tls');
const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN payment server', PORT, ALAMAT));
  console.log(`  Midtrans : ${MT.serverKey ? 'siap (' + MT.mode + ')' : 'BELUM dikonfigurasi'}`);
  console.log(`  Xendit   : ${XD.secretKey ? 'siap' : 'BELUM dikonfigurasi'}`);
  console.log(`  CORS     : ${ALLOWED.join(', ')}`);
});
