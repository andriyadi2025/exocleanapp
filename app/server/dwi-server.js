/* ==========================================================================
 *  dwi-server.js — jembatan EXOCLEAN ke Darmawisata Indonesia H2H (PPOB,
 *  TopUp pulsa/data/token, dan jalur baca rumpun perjalanan).
 *  --------------------------------------------------------------------------
 *  KENAPA ADA SERVER INI
 *  Darmawisata memakai model AGEN PRABAYAR: setiap transaksi memotong saldo
 *  deposit perusahaan, dan PASSWORD agen adalah kunci ke saldo itu. Kunci
 *  hanya hidup di .env di sini. Yang dikirim ke Darmawisata bukan password,
 *  melainkan securityCode = MD5(token + MD5(password)) yang dihitung ulang
 *  tiap login; accessToken hasil login pun tidak pernah sampai ke browser.
 *
 *  BUKAN PROXY BUTA: hanya jalur di DAFTAR_PUTIH yang boleh lewat, dan jalur
 *  yang MEMOTONG DEPOSIT hanya lewat POST /api/dwi/bayar — pintu yang punya
 *  catatan transaksi dan kunci idempotensi (satu maksud = satu pembayaran).
 *
 *  ENDPOINT (semua di bawah /api/dwi)
 *    GET  /health      → siap?, lingkungan uat/produksi, sesi (tanpa rahasia)
 *    GET  /balance     → sisa deposit agen
 *    POST /call        → jalur BACA berdaftar-putih {jalur, isi}
 *    POST /bayar       → jalur UANG, tepat sekali per kunci idempotensi
 *    POST /cocokkan    → tanyakan nasib transaksi tertunda/ragu {kunci}
 *    GET  /transaksi   → catatan transaksi uang (untuk pencocokan admin)
 *
 *  Keadaan transaksi uang: selesai · berjalan · tertunda (sudah masuk ke
 *  penyedia, status belum final) · ragu (putus tanpa jawaban — TIDAK pernah
 *  diulang otomatis; harus dicocokkan manusia).
 *
 *  DWI_SIMULASI=1: balasan tiruan (produk, tagihan, pembayaran, saldo) untuk
 *  pengembangan tanpa akun — tidak pernah memanggil Darmawisata.
 *  Jalankan: npm run start:dwi   (DWI_PORT, bawaan 4400)
 * ========================================================================== */
'use strict';

const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');

const app = express();
const PORT = Number(process.env.DWI_PORT || 4400);
const SIMULASI = process.env.DWI_SIMULASI === '1';
const CATATAN_FILE = path.join(__dirname, 'data', 'dwi-transaksi.json');

app.use(express.json({ limit: '32kb' }));
const ASAL = KEAMANAN.pasangDasar(app, process.env, 'dwi');
const lajuBaca = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_DWI_BACA_PER_MENIT || 60) });
const lajuUang = KEAMANAN.batasLaju({ jendelaDetik: 600, maks: Number(process.env.LAJU_DWI_BAYAR_10MENIT || 10) });

const DWI = {
  /* Bawaan UAT (uat-backup: host "uat" lama tidak menjawab). Apa pun yang bukan uat dianggap PRODUKSI. */
  get base() { return (process.env.DWI_BASE_URL || 'https://uat-backup.darmawisataindonesiah2h.co.id:7080/H2H').replace(/\/+$/, ''); },
  get userID() { return process.env.DWI_USER_ID || ''; },
  get password() { return process.env.DWI_PASSWORD || ''; },
  get bahasa() { return Number(process.env.DWI_LANGUAGE || 1); },
  get produksi() { return !/uat/i.test(this.base); }
};

/* ---------------------------------------------------------------- daftar putih */
const DAFTAR_PUTIH = {
  '/PPOB/ProductGroup': { uang: false }, '/PPOB/Product': { uang: false }, '/PPOB/TransactionList': { uang: false }, '/PPOB/TransactionDetail': { uang: false }, '/PPOB/Inquiry': { uang: false },
  '/TopUp/ProductType': { uang: false }, '/TopUp/Provider': { uang: false }, '/TopUp/Product': { uang: false }, '/TopUp/TransactionList': { uang: false }, '/TopUp/TransactionDetail': { uang: false },
  '/PPOB/Payment': { uang: true }, '/PPOB/OpenPayment': { uang: true }, '/TopUp/Order': { uang: true },
  /* perjalanan: hanya jalur baca (Booking/Issued sengaja tidak dibuka) */
  '/Airline/List': { uang: false }, '/Airline/Route': { uang: false }, '/Airline/Schedule': { uang: false }, '/Airline/Price': { uang: false }, '/Airline/City': { uang: false },
  '/Train/List': { uang: false }, '/Train/Route': { uang: false }, '/Train/Schedule': { uang: false },
  '/Bus/List': { uang: false }, '/Bus/Route': { uang: false }, '/Bus/Schedule': { uang: false },
  '/Hotel/Country': { uang: false }, '/Hotel/City': { uang: false }, '/Hotel/Search': { uang: false },
  '/Ship/Route': { uang: false }, '/ShipDlu/Route': { uang: false }, '/Shuttle/List': { uang: false }, '/CarRental/Location': { uang: false }, '/Tour/Categories': { uang: false }, '/Umroh/Search': { uang: false }, '/Cargo/Supplier': { uang: false }
};
function galat(pesan, status, detail) { const e = new Error(pesan); e.status = status || 500; if (detail) e.detail = detail; return e; }
function wajibKredensial() { if (!DWI.userID || !DWI.password) throw galat('DWI_USER_ID / DWI_PASSWORD belum diisi di berkas .env', 503); }

/* ---------------------------------------------------------------- sesi */
const UMUR_TOKEN_MS = 20 * 60 * 1000;
let sesi = { accessToken: '', waktu: 0, userID: '' }, sedangLogin = null;
function tokenWaktu() { const utc = String(process.env.DWI_TOKEN_UTC || '') === '1', d = new Date(), dua = (n) => String(n).padStart(2, '0'); const g = (a, b) => (utc ? d[a]() : d[b]()); return g('getUTCFullYear', 'getFullYear') + '-' + dua(g('getUTCMonth', 'getMonth') + 1) + '-' + dua(g('getUTCDate', 'getDate')) + 'T' + dua(g('getUTCHours', 'getHours')) + ':' + dua(g('getUTCMinutes', 'getMinutes')) + ':' + dua(g('getUTCSeconds', 'getSeconds')); }
function md5(s) { return crypto.createHash('md5').update(s, 'utf8').digest('hex'); }
function securityCode(token) { return md5(token + md5(DWI.password)); }
async function panggilMentah(jalur, body) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 60000);
  let r;
  try { r = await fetch(DWI.base + jalur, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw galat('Darmawisata tidak terjangkau: ' + (e.name === 'AbortError' ? 'waktu habis' : e.message), 502); }
  finally { clearTimeout(timer); }
  let json = {}; try { json = await r.json(); } catch (e) { /* kosong */ }
  if (!r.ok) throw galat(json.respMessage || ('Darmawisata menolak permintaan (HTTP ' + r.status + ')'), r.status >= 400 && r.status < 500 ? 400 : 502, json);
  return json;   /* HTTP 200 bisa berisi status FAILED — diperiksa pemanggil */
}
async function login() {
  wajibKredensial();
  if (sedangLogin) return sedangLogin;
  sedangLogin = (async () => {
    const token = tokenWaktu();
    const j = await panggilMentah('/Session/Login', { userID: DWI.userID, token, securityCode: securityCode(token), language: DWI.bahasa });
    if (String(j.status).toUpperCase() !== 'SUCCESS' || !j.accessToken) throw galat(j.respMessage || 'Login Darmawisata ditolak', 401, j);
    sesi = { accessToken: j.accessToken, waktu: Date.now(), userID: j.userID || DWI.userID };
    return sesi;
  })();
  try { return await sedangLogin; } finally { sedangLogin = null; }
}
async function sesiHidup() { if (sesi.accessToken && Date.now() - sesi.waktu < UMUR_TOKEN_MS) return sesi; return login(); }
function soalSesi(j) { return /token|session|sesi|expired|kadaluarsa|unauthor/.test(String((j && j.respMessage) || '').toLowerCase()); }
async function panggil(jalur, isi, opsi) {
  if (SIMULASI) return simulasi(jalur, isi);
  const s = await sesiHidup();
  let j = await panggilMentah(jalur, Object.assign({}, isi, { userID: s.userID, accessToken: s.accessToken }));
  if (String(j.status).toUpperCase() === 'FAILED' && soalSesi(j) && !(opsi && opsi.sudahUlang)) { sesi = { accessToken: '', waktu: 0, userID: '' }; return panggil(jalur, isi, { sudahUlang: true }); }
  return j;
}

/* ---------------------------------------------------------------- simulasi */
const SIM = {
  grup: ['PLN', 'BPJS', 'PDAM', 'TELKOM', 'INTERNET', 'MULTI FINANCE'],
  produk: [{ code: 'PLNPOST', name: 'PLN Pascabayar', group: 'PLN' }, { code: 'BPJSKS', name: 'BPJS Kesehatan', group: 'BPJS' }, { code: 'PDAMJKT', name: 'PAM Jaya (Jakarta)', group: 'PDAM' }, { code: 'PDAMTGR', name: 'PDAM Tirta Kerta Raharja', group: 'PDAM' }, { code: 'TELKOM', name: 'Telkom / IndiHome', group: 'TELKOM' }, { code: 'FIRSTMEDIA', name: 'First Media', group: 'INTERNET' }, { code: 'FIFGROUP', name: 'FIF Group', group: 'MULTI FINANCE' }],
  jenis: ['Pulsa', 'Data', 'TokenPLN', 'E-Wallet'],
  penyedia: { Pulsa: ['Telkomsel', 'Indosat', 'XL', 'Tri', 'Smartfren'], Data: ['Telkomsel Data', 'Indosat Data', 'XL Data'], TokenPLN: ['PLN Prabayar'], 'E-Wallet': ['GoPay', 'OVO', 'DANA', 'ShopeePay'] },
  produkTopUp(jenis, penyedia) {
    const harga = jenis === 'TokenPLN' ? [20000, 50000, 100000, 200000] : jenis === 'E-Wallet' ? [25000, 50000, 100000] : jenis === 'Data' ? [15000, 30000, 55000, 100000] : [5000, 10000, 20000, 25000, 50000, 100000];
    return harga.map((h, i) => ({ code: (penyedia || 'X').replace(/\s+/g, '').toUpperCase().slice(0, 6) + '|' + h, provider: penyedia, price: Math.round(h * (jenis === 'Pulsa' ? 1.03 : 1.015)) + (i % 2 ? 50 : 0), name: (penyedia || '') + ' ' + (jenis === 'Data' ? ['1 GB', '3 GB', '8 GB', '20 GB'][i] || h : h.toLocaleString('id-ID')), type: jenis.toUpperCase(), isActive: true }));
  }
};
function acakRef() { return Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100); }
function simulasi(jalur, isi) {
  isi = isi || {};
  switch (jalur) {
    case '/Agent/Balance': return { status: 'SUCCESS', balance: 16588438, respTime: new Date().toISOString() };
    case '/PPOB/ProductGroup': return { status: 'SUCCESS', productGroups: SIM.grup };
    case '/PPOB/Product': return { status: 'SUCCESS', productList: SIM.produk.filter((p) => !isi.productGroup || p.group === isi.productGroup).map((p) => Object.assign({ isActive: true, isOpenPayment: false }, p)) };
    case '/TopUp/ProductType': return { status: 'SUCCESS', productTypes: SIM.jenis };
    case '/TopUp/Provider': return { status: 'SUCCESS', providers: SIM.penyedia[isi.productType] || [] };
    case '/TopUp/Product': return { status: 'SUCCESS', products: SIM.produkTopUp(isi.productType, isi.provider) };
    case '/PPOB/Inquiry': {
      const id = String(isi.customerID || ''); if (id.length < 6) return { status: 'FAILED', respMessage: 'customerID invalid' };
      if (/0000$/.test(id)) return { status: 'FAILED', respMessage: 'Tagihan sudah lunas / tidak ada tagihan' };
      const jumlah = 50000 + (parseInt(id.slice(-4), 10) % 250) * 1000, admin = 2500;
      return { status: 'SUCCESS', billingReferenceID: 'SIMBR' + acakRef(), productCode: isi.productCode, customerID: id, customerName: ['BUDI SANTOSO', 'SITI AMINAH', 'ANDI WIJAYA', 'DEWI LESTARI'][parseInt(id.slice(-1), 10) % 4], billPeriod: new Date().toISOString().slice(0, 7), amount: jumlah, adminFee: admin, totalAmount: jumlah + admin, simulasi: true };
    }
    case '/PPOB/Payment': return { status: 'SUCCESS', transactionStatus: 'SUCCESS', referenceID: 'SIMPAY' + acakRef(), transactionID: String(800000000 + Math.floor(Math.random() * 9999999)), billingReferenceID: isi.billingReferenceID, transactionDate: new Date().toISOString().slice(0, 10), respMessage: 'Pembayaran berhasil (simulasi)', simulasi: true };
    case '/TopUp/Order': { const token = /PLN/i.test(String(isi.productCode)) ? Array.from({ length: 5 }, () => String(Math.floor(1000 + Math.random() * 8999))).join('-') : null; return { status: 'SUCCESS', transactionStatus: 'SUCCESS', referenceID: 'SIMTOP' + acakRef(), transactionID: String(800000000 + Math.floor(Math.random() * 9999999)), MSISDN: isi.MSISDN, productCode: isi.productCode, sequence: isi.sequence, serialNumber: token || ('SN' + acakRef()), token, transactionDate: new Date().toISOString().slice(0, 10), respMessage: 'Transaksi berhasil (simulasi)', simulasi: true }; }
    case '/PPOB/TransactionDetail': case '/TopUp/TransactionDetail': return { status: 'SUCCESS', detail: { referenceID: isi.referenceID, transactionStatus: 'SUCCESS' } };
    default: return { status: 'SUCCESS', simulasi: true, catatan: 'Jalur ' + jalur + ' tidak disimulasikan', airlines: [], trains: [], busses: [], countries: [], origins: [], shuttles: [], locations: [], categories: [], packages: [], suppliers: [] };
  }
}

/* ---------------------------------------------------------------- catatan transaksi & idempotensi */
let catatan = {};
try { catatan = JSON.parse(fs.readFileSync(CATATAN_FILE, 'utf8')) || {}; } catch (e) { catatan = {}; }
function tulisCatatan() { try { fs.mkdirSync(path.dirname(CATATAN_FILE), { recursive: true }); const tmp = CATATAN_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(catatan, null, 2)); fs.renameSync(tmp, CATATAN_FILE); } catch (e) { console.error('[dwi] gagal menulis catatan: ' + e.message); } }
function simpanCatatan(kunci, data) { catatan[kunci] = Object.assign({}, catatan[kunci], data, { diubah: new Date().toISOString() }); tulisCatatan(); return catatan[kunci]; }
/* Kunci diturunkan dari MAKSUD: PPOB → billingReferenceID (sekali pakai); TopUp → MSISDN + produk + sequence. */
function kunciDari(jalur, isi) {
  if (jalur === '/PPOB/Payment' || jalur === '/PPOB/OpenPayment') { const ref = KEAMANAN.batasiTeks(isi.billingReferenceID, 80); return ref ? 'ppob:' + ref : null; }
  if (jalur === '/TopUp/Order') { const m = KEAMANAN.batasiTeks(isi.MSISDN, 20), k = KEAMANAN.batasiTeks(isi.productCode, 40); if (!m || !k) return null; return 'topup:' + m + ':' + k + ':' + String(isi.sequence == null ? 1 : isi.sequence); }
  return null;
}
function penandaTransaksi(j) { const p = j && (j.referenceID || j.transactionID || j.agentReferenceID); return p ? String(p) : null; }
function statusTertunda(j) { return ['PENDING', 'PROCESS', 'PROCESSING', 'ONPROCESS'].indexOf(String((j && j.transactionStatus) || '').toUpperCase()) >= 0; }
const JALUR_DETAIL = { '/TopUp/Order': '/TopUp/TransactionDetail', '/PPOB/Payment': '/PPOB/TransactionDetail', '/PPOB/OpenPayment': '/PPOB/TransactionDetail' };
const BATAS_BERJALAN_MS = 3 * 60 * 1000;
async function panggilUang(jalur, isi) {
  const kunci = kunciDari(jalur, isi);
  if (!kunci) return { kode: 400, badan: { error: 'Tidak ada bahan kunci idempotensi: PPOB butuh billingReferenceID dari inquiry; TopUp butuh MSISDN dan productCode.' } };
  const ada = catatan[kunci];
  if (ada) {
    if (ada.keadaan === 'selesai') return { kode: 200, badan: Object.assign({}, ada.balasan, { idempotenDiulang: true }) };
    if (ada.keadaan === 'tertunda') return { kode: 409, badan: { error: 'Transaksi yang sama sudah masuk ke penyedia dan belum final. Cocokkan dulu (POST /api/dwi/cocokkan).', kunci, keadaan: 'tertunda', penanda: ada.penanda || null } };
    if (ada.keadaan === 'ragu') return { kode: 409, badan: { error: 'Transaksi sebelumnya berakhir tanpa kepastian. Periksa TransactionList Darmawisata sebelum mencoba lagi — mengulang bisa membayar dua kali.', kunci, keadaan: 'ragu' } };
    if (ada.keadaan === 'berjalan') { if (Date.now() - new Date(ada.mulai).getTime() < BATAS_BERJALAN_MS) return { kode: 409, badan: { error: 'Permintaan yang sama sedang diproses.', kunci, keadaan: 'berjalan' } }; simpanCatatan(kunci, { keadaan: 'ragu', sebab: 'melewati batas tanpa jawaban' }); return { kode: 409, badan: { error: 'Permintaan sebelumnya melewati batas waktu tanpa jawaban. Cocokkan dulu.', kunci, keadaan: 'ragu' } }; }
  }
  simpanCatatan(kunci, { keadaan: 'berjalan', jalur, mulai: new Date().toISOString(), permintaan: { jalur, isi: { customerID: isi.customerID, MSISDN: isi.MSISDN, productCode: isi.productCode, sequence: isi.sequence, billingReferenceID: isi.billingReferenceID } }, simulasi: SIMULASI });
  let j;
  try { j = await panggil(jalur, isi); }
  catch (e) { simpanCatatan(kunci, { keadaan: 'ragu', sebab: e.message }); return { kode: 502, badan: { error: 'Panggilan terputus sebelum ada jawaban. Status belum pasti — jangan diulang sebelum dicocokkan.', kunci, keadaan: 'ragu' } }; }
  const status = String(j.status).toUpperCase(), penanda = penandaTransaksi(j);
  if (status === 'SUCCESS' && !statusTertunda(j)) { simpanCatatan(kunci, { keadaan: 'selesai', balasan: j, penanda, selesai: new Date().toISOString() }); return { kode: 200, badan: Object.assign({ kunci }, j) }; }
  /* FAILED/PENDING tetapi sudah tercatat di sana (TopUp membalas FAILED "status is PENDING" padahal deposit terpotong). */
  if (penanda || statusTertunda(j)) { simpanCatatan(kunci, { keadaan: 'tertunda', balasan: j, penanda, sebab: j.respMessage || ('status ' + status) }); return { kode: 202, badan: Object.assign({}, j, { keadaan: 'tertunda', kunci, penanda, petunjuk: 'Transaksi sudah masuk ke penyedia; deposit bisa jadi terpotong. Jangan diulang — cocokkan statusnya.' }) }; }
  delete catatan[kunci]; tulisCatatan();   /* ditolak sebelum ada yang bergerak: boleh dicoba lagi setelah diperbaiki */
  return { kode: 400, badan: Object.assign({ error: j.respMessage || 'Transaksi ditolak penyedia' }, j) };
}
async function cocokkan(kunci) {
  const c = catatan[kunci]; if (!c) return { kode: 404, badan: { error: 'Kunci tidak dikenal: ' + kunci } };
  if (c.keadaan === 'selesai') return { kode: 200, badan: { kunci, keadaan: 'selesai', catatan: 'Sudah final sebelumnya.', balasan: c.balasan || null } };
  const jalurDetail = JALUR_DETAIL[c.jalur], penanda = c.penanda || penandaTransaksi(c.balasan);
  if (!jalurDetail || !penanda) return { kode: 409, badan: { error: 'Tidak ada penanda transaksi untuk ditanyakan. Cocokkan manual lewat TransactionList Darmawisata.', kunci, keadaan: c.keadaan } };
  let d; try { d = await panggil(jalurDetail, { referenceID: penanda }); } catch (e) { return { kode: 502, badan: { error: 'Gagal menanyakan status: ' + e.message, kunci, keadaan: c.keadaan } }; }
  const detail = d && d.detail, st = String((detail && detail.transactionStatus) || '').toUpperCase();
  if (st === 'SUCCESS' || st === 'SUKSES') { simpanCatatan(kunci, { keadaan: 'selesai', detail, selesai: new Date().toISOString() }); return { kode: 200, badan: { kunci, keadaan: 'selesai', detail } }; }
  if (['FAILED', 'GAGAL', 'CANCELED', 'CANCELLED'].indexOf(st) >= 0) { delete catatan[kunci]; tulisCatatan(); return { kode: 200, badan: { kunci, keadaan: 'batal', detail, catatan: 'Penyedia menyatakan gagal; dana kembali ke deposit. Kunci dilepas.' } }; }
  simpanCatatan(kunci, { keadaan: 'tertunda', detail: detail || null }); return { kode: 202, badan: { kunci, keadaan: 'tertunda', detail: detail || null, catatan: 'Belum final. Coba lagi nanti.' } };
}

/* ---------------------------------------------------------------- rute */
app.get('/api/dwi/health', lajuBaca, async (req, res) => {
  const punya = Boolean(DWI.userID && DWI.password);
  const hasil = { ok: true, layanan: 'EXOCLEAN dwi-server', siap: SIMULASI || punya, mode: SIMULASI ? 'simulasi' : (DWI.produksi ? 'produksi' : 'uat'), base: SIMULASI ? '(simulasi)' : DWI.base, userID: DWI.userID ? DWI.userID.slice(0, 3) + '***' : '(kosong)', sesiAktif: Boolean(sesi.accessToken), jalurTerbuka: Object.keys(DAFTAR_PUTIH).length, contohToken: tokenWaktu() };
  if (SIMULASI) return res.json(Object.assign(hasil, { pesan: 'MODE SIMULASI — produk, tagihan, dan pembayaran tiruan; deposit tidak terpotong.' }));
  if (!punya) return res.json(Object.assign(hasil, { pesan: 'Isi DWI_USER_ID dan DWI_PASSWORD di app/server/.env' }));
  try { await login(); hasil.sesiAktif = true; hasil.pesan = 'Login berhasil (' + hasil.mode + ').'; } catch (e) { hasil.siap = false; hasil.pesan = e.message; }
  res.json(hasil);
});
app.get('/api/dwi/balance', lajuBaca, async (req, res, next) => { try { const j = await panggil('/Agent/Balance', {}); if (String(j.status).toUpperCase() !== 'SUCCESS') throw galat(j.respMessage || 'Gagal membaca saldo', 400); res.json({ saldo: j.balance, waktu: j.respTime, simulasi: SIMULASI }); } catch (e) { next(e); } });
app.post('/api/dwi/call', lajuBaca, async (req, res, next) => {
  try {
    const target = KEAMANAN.batasiTeks((req.body || {}).jalur, 60), izin = Object.prototype.hasOwnProperty.call(DAFTAR_PUTIH, target) ? DAFTAR_PUTIH[target] : null;
    if (!izin) throw galat('Jalur "' + target + '" tidak ada di daftar putih server ini.', 403);
    if (izin.uang) throw galat('Jalur ini memotong deposit dan harus lewat POST /api/dwi/bayar.', 400);
    const isi = req.body && typeof req.body.isi === 'object' && req.body.isi ? req.body.isi : {};
    res.json(await panggil(target, isi));
  } catch (e) { next(e); }
});
app.post('/api/dwi/bayar', lajuUang, async (req, res, next) => {
  try {
    const target = KEAMANAN.batasiTeks((req.body || {}).jalur, 60), izin = Object.prototype.hasOwnProperty.call(DAFTAR_PUTIH, target) ? DAFTAR_PUTIH[target] : null;
    if (!izin || !izin.uang) throw galat('Pintu ini hanya untuk jalur yang memotong deposit; jalur baca memakai /api/dwi/call.', 400);
    const isi = req.body && typeof req.body.isi === 'object' && req.body.isi ? req.body.isi : {};
    const hasil = await panggilUang(target, isi);
    if (hasil.kode === 200 && !hasil.badan.idempotenDiulang) console.log('[dwi] ' + target + ' selesai · kunci ' + kunciDari(target, isi) + (SIMULASI ? ' (simulasi)' : ''));
    res.status(hasil.kode).json(hasil.badan);
  } catch (e) { next(e); }
});
app.post('/api/dwi/cocokkan', lajuBaca, async (req, res, next) => { try { const kunci = KEAMANAN.batasiTeks((req.body || {}).kunci, 160); if (!kunci) throw galat('Sebutkan kunci transaksinya.', 400); const h = await cocokkan(kunci); res.status(h.kode).json(h.badan); } catch (e) { next(e); } });
app.get('/api/dwi/transaksi', lajuBaca, (req, res) => {
  const daftar = Object.keys(catatan).map((k) => { const c = catatan[k]; return { kunci: k, keadaan: c.keadaan, jalur: c.jalur, penanda: c.penanda || null, mulai: c.mulai, selesai: c.selesai || null, sebab: c.sebab || null, permintaan: c.permintaan || null, simulasi: !!c.simulasi }; }).sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)));
  const n = (k) => daftar.filter((x) => x.keadaan === k).length;
  res.json({ total: daftar.length, ragu: n('ragu'), tertunda: n('tertunda'), berjalan: n('berjalan'), selesai: n('selesai'), daftar: daftar.slice(0, 200) });
});
app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));
app.use((err, req, res, next) => { const kode = err.status || 500; if (kode >= 500) console.error('[dwi] ' + (err.message || err)); res.status(kode).json({ error: err.message || 'Kesalahan server', detail: err.detail && err.detail.respMessage ? { respMessage: err.detail.respMessage } : undefined }); }); // eslint-disable-line no-unused-vars

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN dwi-server', PORT, ALAMAT));
  if (SIMULASI) console.log('  MODE SIMULASI  : balasan tiruan (DWI_SIMULASI=1) — jangan di produksi');
  else { console.log('  Target         : ' + DWI.base + '  (' + (DWI.produksi ? 'PRODUKSI — deposit sungguhan terpotong' : 'uat') + ')'); console.log('  Kredensial     : ' + (DWI.userID && DWI.password ? 'terisi' : 'BELUM DIISI di .env')); }
  console.log('  Asal yang diizinkan: ' + ASAL.join(', '));
});
module.exports = app;
