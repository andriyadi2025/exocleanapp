/* ==========================================================================
 *  dwi-server.js — jembatan ke Darmawisata Indonesia H2H API
 *  --------------------------------------------------------------------------
 *  KENAPA ADA SERVER INI SAMA SEKALI
 *
 *  API Darmawisata memakai model AGEN PRABAYAR: setiap transaksi memotong
 *  saldo deposit perusahaan, dan PASSWORD agen adalah kunci untuk masuk ke
 *  saldo itu. Menaruhnya di kode browser sama saja menyerahkan dompet
 *  perusahaan kepada siapa pun yang membuka Inspect Element — sekelas dengan
 *  Server Key Midtrans dan API key Biteship, dan berlaku aturan yang sama:
 *  kunci hanya hidup di .env pada server ini.
 *
 *  Yang dikirim ke Darmawisata bukan passwordnya, melainkan
 *  securityCode = MD5(token + MD5(password)) yang dihitung ulang tiap login.
 *  Passwordnya sendiri tidak pernah meninggalkan berkas ini.
 *
 *  Ada alasan kedua yang tidak kalah penting. `accessToken` hasil login
 *  BUKAN sekadar penanda sesi — ia surat kuasa membelanjakan deposit. Kalau
 *  browser memegangnya, satu skrip pihak ketiga di halaman mana pun bisa
 *  menghabiskan saldo agen tanpa menyentuh kode kita sedikit pun.
 *
 *  YANG SENGAJA TIDAK DIBUAT: proxy buta
 *  Godaan terbesar di sini adalah meneruskan jalur apa pun dari browser ke
 *  Darmawisata. Itu memindahkan lubangnya, bukan menutupnya — browser tetap
 *  bisa memanggil /PPOB/Payment dan menghabiskan deposit. Karena itu hanya
 *  jalur yang terdaftar di DAFTAR_PUTIH yang boleh lewat, dan jalur yang
 *  MEMINDAHKAN UANG ditandai tersendiri supaya perlakuannya berbeda.
 *
 *  ENDPOINT
 *    GET  /api/dwi/health            → cek koneksi, kredensial, & sesi
 *    GET  /api/dwi/balance           → sisa deposit agen
 *    GET  /api/dwi/transaksi         → catatan transaksi uang & yang berakhir ragu
 *    POST /api/dwi/call              → jalur BACA yang ada di daftar putih
 *    POST /api/dwi/bayar             → jalur UANG, tepat sekali per kunci idempotensi
 *
 *  Jalankan:  node dwi-server.js
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

const PORT = Number(process.env.DWI_PORT || 4300);
const ASAL_BOLEH = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);

const DWI = {
  /* Bawaannya UAT, bukan produksi. Server produksi memotong deposit
     sungguhan; alamat yang salah ketik di .env sebaiknya berujung pada
     kegagalan koneksi, bukan pada uang yang benar-benar keluar. */
  get base() {
    /* uat-backup, bukan uat: host uat yang lama tidak menjawab satu port pun
       dari luar (paketnya dibuang, bukan ditolak), sedangkan uat-backup
       menjawab normal. */
    return (process.env.DWI_BASE_URL || 'https://uat-backup.darmawisataindonesiah2h.co.id:7080/H2H')
      .replace(/\/+$/, '');
  },
  get userID() { return process.env.DWI_USER_ID || ''; },
  /* Yang disimpan PASSWORD, bukan securityCode.
     securityCode bukan kredensial tetap — ia dihitung ulang setiap login dari
     cap waktu, sehingga tidak ada nilai yang bisa dipakai lagi bila seseorang
     sempat merekam satu permintaan. Menyimpan hasil hitungannya di .env
     berarti mengunci nilai yang hanya sah pada satu detik tertentu, dan
     login akan gagal pada detik berikutnya.

     DWI_SECURITY_CODE tetap dibaca demi pemasangan lama, tetapi hanya bila
     DWI_PASSWORD kosong — dan kalau begitu, isinya memang password. */
  get password() { return process.env.DWI_PASSWORD || process.env.DWI_SECURITY_CODE || ''; },
  get bahasa() { return Number(process.env.DWI_LANGUAGE || 1); },
  /* Apa pun yang bukan uat dianggap PRODUKSI. Sengaja dibalik seperti ini:
     alamat baru yang belum dikenal lebih baik diperlakukan sebagai tempat
     uang sungguhan keluar daripada disangka uji coba. */
  get produksi() { return !/(^|\/\/)uat/i.test(this.base) && !/uat[-.]/i.test(this.base); }
};

/* ==========================================================================
 *  DAFTAR PUTIH
 *  --------------------------------------------------------------------------
 *  Jalur yang boleh dipanggil dari browser. Ditulis lengkap, bukan pola:
 *  pola seperti /PPOB/* akan ikut membuka /PPOB/Payment begitu Darmawisata
 *  menambah jalur baru, dan yang membukanya tidak akan sadar telah melakukannya.
 *
 *  uang:true menandai jalur yang MEMOTONG DEPOSIT. Untuk sekarang jalur
 *  seperti itu belum dibuka sama sekali — lihat catatan di bawah.
 * ========================================================================== */
const DAFTAR_PUTIH = {
  /* --- referensi: aman dibaca, tidak memindahkan apa pun --- */
  '/PPOB/ProductGroup':      { uang: false },
  '/PPOB/Product':           { uang: false },
  '/PPOB/TransactionList':   { uang: false },
  '/PPOB/TransactionDetail': { uang: false },
  '/TopUp/ProductType':      { uang: false },
  '/TopUp/Provider':         { uang: false },
  '/TopUp/Product':          { uang: false },
  '/TopUp/TransactionList':  { uang: false },
  '/TopUp/TransactionDetail':{ uang: false },

  /* --- inquiry: membaca tagihan pelanggan, belum membayar --- */
  '/PPOB/Inquiry':           { uang: false },

  /* --- MEMOTONG DEPOSIT ---
     Hanya bisa lewat POST /api/dwi/bayar, tidak pernah lewat /api/dwi/call.
     Pemisahan pintunya disengaja: pintu biasa tidak punya catatan transaksi,
     dan jalur uang tanpa catatan adalah jalur yang bisa terpanggil dua kali
     tanpa ada yang tahu. */
  '/PPOB/Payment':           { uang: true },
  '/PPOB/OpenPayment':       { uang: true },
  '/TopUp/Order':            { uang: true },

  /* ======================================================== PERJALANAN
     Hanya jalur yang MEMBACA. Dasarnya diagram alur resmi mereka
     (manual-img/*-reservation-flow.png): Search/Schedule → Price → detail →
     Booking → Issued. Empat langkah pertama hanya bertanya; dua terakhir
     mengikat kursi, kamar, atau kendaraan pada pemasok yang sungguhan.

     Ada satu hal yang perlu diingat saat nanti membuka jalur Booking:
     manual mereka menuntut SATU rangkaian pemesanan memakai accessToken dan
     search spec yang SAMA dari awal sampai akhir. Sesi yang disegarkan di
     tengah alur akan membatalkan pemesanan yang sedang berjalan. */

  /* --- Airline (13) --- */
  '/Airline/BaggageAndMeal':           { uang: false },
  '/Airline/BookingDetail':            { uang: false },
  '/Airline/BookingList':              { uang: false },
  '/Airline/City':                     { uang: false },
  '/Airline/List':                     { uang: false },
  '/Airline/Nationality':              { uang: false },
  '/Airline/Preview':                  { uang: false },
  '/Airline/Price':                    { uang: false },
  '/Airline/PriceAllAirline':          { uang: false },
  '/Airline/Route':                    { uang: false },
  '/Airline/Schedule':                 { uang: false },
  '/Airline/ScheduleAllAirline':       { uang: false },
  '/Airline/Seat':                     { uang: false },

  /* --- Bus (8) --- */
  '/Bus/BookingDetail':                { uang: false },
  '/Bus/BookingList':                  { uang: false },
  '/Bus/List':                         { uang: false },
  '/Bus/Route':                        { uang: false },
  '/Bus/Schedule':                     { uang: false },
  '/Bus/SeatMap':                      { uang: false },
  '/Bus/Terminal':                     { uang: false },
  '/Bus/TerminalSearch':               { uang: false },

  /* --- CarRental (7) --- */
  '/CarRental/Airport':                { uang: false },
  '/CarRental/CarType':                { uang: false },
  '/CarRental/Location':               { uang: false },
  '/CarRental/PacketType':             { uang: false },
  '/CarRental/Search':                 { uang: false },
  '/CarRental/TransactionDetail':      { uang: false },
  '/CarRental/TransactionList':        { uang: false },

  /* --- Cargo (14) --- */
  '/Cargo/AdditionalCost':             { uang: false },
  '/Cargo/BookingDetail':              { uang: false },
  '/Cargo/BookingList':                { uang: false },
  '/Cargo/Content':                    { uang: false },
  '/Cargo/DestinationArea':            { uang: false },
  '/Cargo/Goods':                      { uang: false },
  '/Cargo/Handling':                   { uang: false },
  '/Cargo/HandlingSurcharge':          { uang: false },
  '/Cargo/PickupLocation':             { uang: false },
  '/Cargo/PriceDetail':                { uang: false },
  '/Cargo/Reference':                  { uang: false },
  '/Cargo/Supplier':                   { uang: false },
  '/Cargo/Tariff':                     { uang: false },
  '/Cargo/Tracking':                   { uang: false },

  /* --- Hotel (27) --- */
  '/Hotel/AllCity5':                   { uang: false },
  '/Hotel/AllCountry5':                { uang: false },
  '/Hotel/AllCountryAllCity':          { uang: false },
  '/Hotel/AllCountryAllCity5':         { uang: false },
  '/Hotel/AllHotel5':                  { uang: false },
  '/Hotel/AvailableRooms':             { uang: false },
  '/Hotel/AvailableRooms5':            { uang: false },
  '/Hotel/BookingDetail':              { uang: false },
  '/Hotel/BookingList':                { uang: false },
  '/Hotel/City':                       { uang: false },
  '/Hotel/City5':                      { uang: false },
  '/Hotel/Country':                    { uang: false },
  '/Hotel/Country5':                   { uang: false },
  '/Hotel/DetailInfo':                 { uang: false },
  '/Hotel/HotelList5':                 { uang: false },
  '/Hotel/Image':                      { uang: false },
  '/Hotel/Images':                     { uang: false },
  '/Hotel/Images5':                    { uang: false },
  '/Hotel/Logo':                       { uang: false },
  '/Hotel/Passport':                   { uang: false },
  '/Hotel/Passport5':                  { uang: false },
  '/Hotel/PriceAndPolicyInfo':         { uang: false },
  '/Hotel/PriceAndPolicyInfoOLD':      { uang: false },
  '/Hotel/RoomImage':                  { uang: false },
  '/Hotel/Search':                     { uang: false },
  '/Hotel/Search5':                    { uang: false },
  '/Hotel/SearchAllSupplier':          { uang: false },

  /* --- Ship (6) --- */
  '/Ship/Availability':                { uang: false },
  '/Ship/BookingDetail':               { uang: false },
  '/Ship/BookingList':                 { uang: false },
  '/Ship/GetRoom':                     { uang: false },
  '/Ship/Route':                       { uang: false },
  '/Ship/Schedule':                    { uang: false },

  /* --- Ship Dharma Lautan (9) --- */
  '/ShipDlu/ClassTypes':               { uang: false },
  '/ShipDlu/GetEticket':               { uang: false },
  '/ShipDlu/Price':                    { uang: false },
  '/ShipDlu/RoomClasses':              { uang: false },
  '/ShipDlu/Route':                    { uang: false },
  '/ShipDlu/Schedule':                 { uang: false },
  '/ShipDlu/SelectDLUSchedule':        { uang: false },
  '/ShipDlu/TicketTypes':              { uang: false },
  '/ShipDlu/VehicleTypes':             { uang: false },

  /* --- Shuttle (6) --- */
  '/Shuttle/BookingDetail':            { uang: false },
  '/Shuttle/BookingList':              { uang: false },
  '/Shuttle/List':                     { uang: false },
  '/Shuttle/Route':                    { uang: false },
  '/Shuttle/Schedule':                 { uang: false },
  '/Shuttle/SeatMap':                  { uang: false },

  /* --- Tour (10) --- */
  '/Tour/Categories':                  { uang: false },
  '/Tour/DPTimeLimitNotification':     { uang: false },
  '/Tour/Detail':                      { uang: false },
  '/Tour/Image':                       { uang: false },
  '/Tour/Images':                      { uang: false },
  '/Tour/Provinces':                   { uang: false },
  '/Tour/Search':                      { uang: false },
  '/Tour/TransactionDetail':           { uang: false },
  '/Tour/TransactionList':             { uang: false },
  '/Tour/Type':                        { uang: false },

  /* --- Train (6) --- */
  '/Train/BookingDetail':              { uang: false },
  '/Train/BookingList':                { uang: false },
  '/Train/List':                       { uang: false },
  '/Train/Route':                      { uang: false },
  '/Train/Schedule':                   { uang: false },
  '/Train/SeatMap':                    { uang: false },

  /* --- Umroh (7) --- */
  '/Umroh/DPTimeLimitNotification':    { uang: false },
  '/Umroh/Detail':                     { uang: false },
  '/Umroh/Image':                      { uang: false },
  '/Umroh/Images':                     { uang: false },
  '/Umroh/Search':                     { uang: false },
  '/Umroh/TransactionDetail':          { uang: false },
  '/Umroh/TransactionList':            { uang: false }

  /* --- BELUM DIBUKA, dan itu disengaja ---------------------------------
     /PPOB/Payment, /PPOB/OpenPayment, /TopUp/Order langsung memotong
     deposit. Ketiganya baru boleh masuk sini bersama kunci idempotensi yang
     sungguh-sungguh: satu ketukan ganda pada tombol bayar, satu jaringan yang
     lambat lalu dicoba ulang, atau satu kali muat ulang halaman di saat yang
     salah — semuanya menghasilkan pembayaran kedua atas tagihan yang sama.
     Uangnya nyata dan tidak kembali sendiri.

     Darmawisata menyediakan bahannya: TopUp/Order punya field `sequence`
     untuk membedakan pengulangan yang disengaja dari yang tidak, dan
     PPOB/Payment memakai `billingReferenceID` dari inquiry yang hanya berlaku
     sekali. Keduanya harus dipasang bersama catatan transaksi di sisi kita
     sebelum jalur ini dibuka. ------------------------------------------- */
};

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

function wajibKredensial() {
  if (!DWI.userID || !DWI.password) {
    const e = new Error('DWI_USER_ID / DWI_PASSWORD belum diisi di berkas .env');
    e.status = 503;
    throw e;
  }
}

/* ==========================================================================
 *  SESI
 *  --------------------------------------------------------------------------
 *  Login menghasilkan accessToken. Spesifikasi tidak menyebutkan masa
 *  berlakunya sama sekali — tidak ada field kedaluwarsa pada AuthResponse —
 *  jadi masa hidupnya TIDAK BOLEH ditebak. Yang dipakai di sini dua jaring:
 *  token disegarkan sesudah jeda yang konservatif, DAN setiap panggilan yang
 *  ditolak karena sesi akan login ulang lalu mencoba sekali lagi.
 *
 *  Menebak "pasti tahan sejam" berarti setiap transaksi di menit ke-61 gagal
 *  tanpa ada yang tahu sebabnya.
 * ========================================================================== */
const UMUR_TOKEN_MS = 20 * 60 * 1000;      /* segarkan tiap 20 menit */
let sesi = { accessToken: '', waktu: 0, userID: '' };
let sedangLogin = null;

/**
 * Cap waktu untuk field `token`, bentuk yyyy-MM-dd'T'HH:mm:ss.
 * Contoh dari manual: 2015-12-21T15:10:20.
 *
 * Waktu LOKAL, bukan UTC. Manual tidak menyebut zona waktu sama sekali, dan
 * server mereka berada di Indonesia — memakai UTC akan menggeser cap waktu
 * tujuh jam, yang pada API yang memeriksa kesegaran token terbaca sebagai
 * permintaan basi. Bila ternyata mereka menuntut UTC, DWI_TOKEN_UTC=1
 * mengubahnya tanpa menyentuh kode.
 */
function tokenWaktu() {
  const utc = String(process.env.DWI_TOKEN_UTC || '') === '1';
  const d = new Date();
  const dua = (n) => String(n).padStart(2, '0');
  const th = utc ? d.getUTCFullYear() : d.getFullYear();
  const bl = (utc ? d.getUTCMonth() : d.getMonth()) + 1;
  const tg = utc ? d.getUTCDate() : d.getDate();
  const jm = utc ? d.getUTCHours() : d.getHours();
  const mn = utc ? d.getUTCMinutes() : d.getMinutes();
  const dt = utc ? d.getUTCSeconds() : d.getSeconds();
  return th + '-' + dua(bl) + '-' + dua(tg) + 'T' + dua(jm) + ':' + dua(mn) + ':' + dua(dt);
}

function md5(s) { return crypto.createHash('md5').update(s, 'utf8').digest('hex'); }

/**
 * securityCode = MD5(token + MD5(Password))   — sesuai manual H2H.
 *
 * Bentuknya membuat kode ini hanya sah untuk SATU cap waktu, jadi rekaman
 * satu permintaan tidak bisa diputar ulang. Yang tidak dilindunginya:
 * passwordnya sendiri tetap harus ada di server ini, dan MD5 sudah lama
 * tidak layak untuk hal baru. Keduanya pilihan protokol mereka, bukan kita —
 * yang bisa kita jaga hanyalah password itu tidak pernah meninggalkan .env.
 */
function securityCode(token) {
  return md5(token + md5(DWI.password));
}

async function panggilMentah(jalur, body) {
  const r = await fetch(DWI.base + jalur, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });

  let json = {};
  try { json = await r.json(); } catch (e) { /* balasan kosong */ }

  /* Darmawisata membalas HTTP 200 sambil menaruh kegagalan di dalam badan
     pesan (`status: "FAILED"`). Memeriksa kode HTTP saja membuat kegagalan
     lolos sebagai keberhasilan yang isinya kosong — dan pada jalur uang,
     "berhasil tapi kosong" adalah bentuk kesalahan yang paling mahal. */
  if (!r.ok) {
    const e = new Error(json.respMessage || `Darmawisata menolak permintaan (HTTP ${r.status})`);
    e.status = r.status >= 400 && r.status < 500 ? 400 : 502;
    e.detail = json;
    throw e;
  }
  return json;
}

async function login() {
  wajibKredensial();
  if (sedangLogin) return sedangLogin;      /* satu login, bukan sepuluh */

  sedangLogin = (async () => {
    const token = tokenWaktu();
    const j = await panggilMentah('/Session/Login', {
      userID: DWI.userID,
      token: token,
      securityCode: securityCode(token),
      language: DWI.bahasa
    });
    if (String(j.status).toUpperCase() !== 'SUCCESS' || !j.accessToken) {
      const e = new Error(j.respMessage || 'Login Darmawisata ditolak');
      e.status = 401;
      e.detail = j;
      throw e;
    }
    sesi = { accessToken: j.accessToken, waktu: Date.now(), userID: j.userID || DWI.userID };
    return sesi;
  })();

  try { return await sedangLogin; }
  finally { sedangLogin = null; }
}

async function sesiHidup() {
  if (sesi.accessToken && Date.now() - sesi.waktu < UMUR_TOKEN_MS) return sesi;
  return login();
}

/** Apakah kegagalan ini soal sesi, bukan soal isi permintaan. */
function soalSesi(j) {
  const s = (j && (j.respMessage || '')).toString().toLowerCase();
  return /token|session|sesi|expired|kadaluarsa|unauthor/.test(s);
}

/**
 * Panggil satu jalur H2H dengan amplop {userID, accessToken} yang diminta
 * setiap endpoint. Sekali coba ulang bila ditolak karena sesi — dan HANYA
 * karena sesi. Mengulang kegagalan lain berarti mengulang permintaan yang
 * sudah ditolak dengan alasan yang tidak akan berubah, dan pada jalur uang
 * itu bisa berarti membayar dua kali.
 */
async function panggil(jalur, isi, opsi = {}) {
  const s = await sesiHidup();
  const kirim = Object.assign({}, isi, { userID: s.userID, accessToken: s.accessToken });
  let j = await panggilMentah(jalur, kirim);

  if (String(j.status).toUpperCase() === 'FAILED' && soalSesi(j) && !opsi.sudahUlang) {
    sesi = { accessToken: '', waktu: 0, userID: '' };
    return panggil(jalur, isi, { sudahUlang: true });
  }
  return j;
}

/* ==========================================================================
 *  CATATAN TRANSAKSI & KUNCI IDEMPOTENSI
 *  --------------------------------------------------------------------------
 *  MASALAH YANG DIPECAHKAN DI SINI
 *
 *  Jalur seperti /PPOB/Payment memotong deposit perusahaan begitu dipanggil.
 *  Empat kejadian sehari-hari membuatnya terpanggil dua kali untuk satu
 *  maksud yang sama:
 *
 *    • pengguna menekan tombol bayar dua kali karena layarnya terasa lambat
 *    • jaringan putus setelah permintaan terkirim, lalu aplikasi mencoba ulang
 *    • halaman dimuat ulang di detik yang salah
 *    • dua perangkat membuka akun yang sama dan menekan bayar bersamaan
 *
 *  Keempatnya membayar tagihan yang sama dua kali. Uangnya nyata dan tidak
 *  kembali sendiri.
 *
 *  CARA KERJANYA
 *  Setiap permintaan uang membawa KUNCI yang diturunkan dari MAKSUDNYA —
 *  bukan angka acak per klik. Untuk PPOB kuncinya billingReferenceID (dari
 *  inquiry, sekali pakai); untuk TopUp gabungan MSISDN + kode produk +
 *  sequence. Dua klik pada tagihan yang sama menghasilkan kunci yang sama,
 *  dan yang kedua tidak pernah sampai ke Darmawisata.
 *
 *  TIGA KEADAAN, DAN YANG KETIGA YANG PALING PENTING
 *    selesai  — sudah pernah dijalankan; balasan lama dikembalikan apa adanya
 *    berjalan — sedang di udara; permintaan kedua DITOLAK, bukan diantre
 *    ragu     — panggilan putus sebelum ada jawaban
 *
 *  "ragu" adalah keadaan yang sesungguhnya berbahaya: uang mungkin sudah
 *  keluar, mungkin belum, dan TIDAK ADA cara mengetahuinya dari sisi kita.
 *  Karena itu ia tidak pernah dicoba ulang otomatis — mencoba ulang sesuatu
 *  yang mungkin sudah berhasil persis sama dengan membayar dua kali. Ia harus
 *  dicocokkan dulu ke TransactionList/TransactionDetail milik Darmawisata,
 *  dan itu keputusan manusia.
 * ========================================================================== */
const CATATAN_FILE = path.join(__dirname, 'dwi-transaksi.json');
let catatan = {};
try { catatan = JSON.parse(fs.readFileSync(CATATAN_FILE, 'utf8')); } catch (e) { catatan = {}; }

function tulisCatatan() {
  try { fs.writeFileSync(CATATAN_FILE, JSON.stringify(catatan, null, 2)); }
  catch (e) { console.error('Gagal menulis catatan transaksi:', e.message); }
}

function simpanCatatan(kunci, data) {
  catatan[kunci] = Object.assign({}, catatan[kunci], data, { diubah: new Date().toISOString() });
  tulisCatatan();
  return catatan[kunci];
}

/**
 * Turunkan kunci dari MAKSUD permintaan, bukan dari waktu atau angka acak.
 *
 * Kalau kuncinya acak, dua klik pada tagihan yang sama menghasilkan dua kunci
 * berbeda dan keduanya lolos — persis kejadian yang ingin dicegah. Kunci yang
 * benar adalah yang SAMA ketika maksudnya sama, dan BERBEDA ketika pengguna
 * memang sengaja mengulang (lewat 'sequence' pada TopUp).
 */
function kunciDari(jalur, isi) {
  if (jalur === '/PPOB/Payment' || jalur === '/PPOB/OpenPayment') {
    /* billingReferenceID lahir dari inquiry dan hanya berlaku sekali —
       persis sifat yang dibutuhkan sebuah kunci idempotensi. */
    const ref = String(isi.billingReferenceID || '').trim();
    return ref ? 'ppob:' + ref : null;
  }
  if (jalur === '/TopUp/Order') {
    const msisdn = String(isi.MSISDN || '').trim();
    const kode = String(isi.productCode || '').trim();
    if (!msisdn || !kode) return null;
    /* sequence memang disediakan Darmawisata untuk membedakan pengulangan
       yang DISENGAJA pada nomor dan produk yang sama. Ia bagian dari maksud,
       jadi ia bagian dari kunci. */
    const urut = String(isi.sequence === undefined || isi.sequence === null ? 1 : isi.sequence);
    return 'topup:' + msisdn + ':' + kode + ':' + urut;
  }
  return null;
}

/**
 * Penanda transaksi dari jawaban penyedia.
 *
 * Adanya penanda berarti permintaan SUDAH sampai ke switch mereka dan
 * tercatat di sisi sana. Uangnya mungkin sudah keluar — dan pada TopUp,
 * memang begitu kenyataannya.
 */
function penandaTransaksi(j) {
  if (!j) return null;
  const p = j.referenceID || j.transactionID || j.agentReferenceID;
  return p ? String(p) : null;
}

/** Status transaksi yang belum final — belum tentu gagal, belum tentu jadi. */
function statusTertunda(j) {
  const s = String((j && j.transactionStatus) || '').toUpperCase();
  return s === 'PENDING' || s === 'PROCESS' || s === 'PROCESSING' || s === 'ONPROCESS';
}

/** Jalur untuk menanyakan status sebuah transaksi uang. */
const JALUR_DETAIL = {
  '/TopUp/Order': '/TopUp/TransactionDetail',
  '/PPOB/Payment': '/PPOB/TransactionDetail',
  '/PPOB/OpenPayment': '/PPOB/TransactionDetail'
};

/** Berapa lama sebuah permintaan boleh dianggap "masih berjalan". */
const BATAS_BERJALAN_MS = 3 * 60 * 1000;

/**
 * Jalankan satu panggilan uang, tepat sekali.
 *
 * Mengembalikan { kode, badan } — kode HTTP dan isinya — supaya pemanggil
 * tidak perlu menebak arti tiap keadaan.
 */
async function panggilUang(jalur, isi) {
  const kunci = kunciDari(jalur, isi);
  if (!kunci) {
    return { kode: 400, badan: { error: 'Permintaan ini tidak punya bahan untuk kunci idempotensi. ' +
      'PPOB membutuhkan billingReferenceID dari inquiry; TopUp membutuhkan MSISDN dan productCode.' } };
  }

  const ada = catatan[kunci];
  if (ada) {
    if (ada.keadaan === 'selesai') {
      /* Balasan LAMA dikembalikan, panggilan baru tidak pernah dibuat.
         Inilah inti idempotensi: maksud yang sama menghasilkan jawaban yang
         sama, berapa kali pun ditanyakan. */
      return { kode: 200, badan: Object.assign({}, ada.balasan, { idempotenDiulang: true }) };
    }
    if (ada.keadaan === 'tertunda') {
      /* Sudah masuk ke penyedia dan belum final. Mengulang di sini berarti
         berpeluang membayar dua kali untuk maksud yang sama. */
      return { kode: 409, badan: { error: 'Transaksi yang sama sudah masuk ke penyedia dan ' +
        'statusnya belum final. Tanyakan dulu lewat POST /api/dwi/cocokkan sebelum mencoba lagi.',
        kunci: kunci, keadaan: 'tertunda', penanda: ada.penanda || null } };
    }
    if (ada.keadaan === 'ragu') {
      return { kode: 409, badan: { error: 'Transaksi sebelumnya berakhir tanpa kepastian dan belum dicocokkan. ' +
        'Periksa di TransactionList Darmawisata sebelum mencoba lagi — mencoba ulang bisa berarti membayar dua kali.',
        kunci: kunci, keadaan: 'ragu' } };
    }
    if (ada.keadaan === 'berjalan') {
      const umur = Date.now() - new Date(ada.mulai).getTime();
      if (umur < BATAS_BERJALAN_MS) {
        return { kode: 409, badan: { error: 'Permintaan yang sama sedang diproses. Tunggu sampai selesai.',
          kunci: kunci, keadaan: 'berjalan' } };
      }
      /* Lewat batas tanpa kabar: bukan berarti gagal, hanya berarti tidak
         diketahui. Diturunkan menjadi "ragu", bukan diulang. */
      simpanCatatan(kunci, { keadaan: 'ragu', sebab: 'melewati batas tanpa jawaban' });
      return { kode: 409, badan: { error: 'Permintaan sebelumnya melewati batas waktu tanpa jawaban. ' +
        'Cocokkan dulu ke Darmawisata sebelum mencoba lagi.', kunci: kunci, keadaan: 'ragu' } };
    }
  }

  simpanCatatan(kunci, { keadaan: 'berjalan', jalur: jalur, mulai: new Date().toISOString(),
    /* Permintaannya ikut dicatat supaya pencocokan manual nanti punya bahan.
       customerID dan MSISDN disimpan; tidak ada kredensial di sini. */
    permintaan: { jalur: jalur, isi: isi } });

  let j;
  try {
    j = await panggil(jalur, isi);
  } catch (e) {
    /* Panggilan putus. Uang MUNGKIN sudah keluar — tidak ada yang tahu. */
    simpanCatatan(kunci, { keadaan: 'ragu', sebab: e.message });
    return { kode: 502, badan: { error: 'Panggilan terputus sebelum ada jawaban. Status transaksi belum pasti — ' +
      'jangan diulang sebelum dicocokkan ke Darmawisata.', kunci: kunci, keadaan: 'ragu' } };
  }

  const status = String(j.status).toUpperCase();
  const penanda = penandaTransaksi(j);

  if (status === 'SUCCESS') {
    simpanCatatan(kunci, { keadaan: 'selesai', balasan: j, penanda: penanda,
      selesai: new Date().toISOString() });
    return { kode: 200, badan: j };
  }

  /* BUKAN SUCCESS, TETAPI SUDAH TERCATAT DI SANA.

     Inilah jebakan yang sesungguhnya. TopUp/Order membalas status "FAILED"
     dengan respMessage "transaction status is PENDING" untuk transaksi yang
     BERHASIL masuk — deposit sudah terpotong, nomor transaksi sudah terbit.
     Membacanya sebagai penolakan lalu menghapus catatannya berarti membuang
     satu-satunya bukti bahwa uang itu pernah bergerak, dan membuka pintu
     bagi pembayaran kedua atas maksud yang sama.

     Yang menahan percobaan kedua saat diuji ternyata dedup milik Darmawisata
     sendiri — perlindungan yang kebetulan ada, bukan yang kita rancang, dan
     tidak berlaku untuk hari yang berbeda atau sequence yang berbeda. */
  if (penanda || statusTertunda(j)) {
    simpanCatatan(kunci, { keadaan: 'tertunda', balasan: j, penanda: penanda,
      sebab: j.respMessage || ('status ' + status), selesai: null });
    return { kode: 202, badan: Object.assign({}, j, {
      keadaan: 'tertunda', kunci: kunci, penanda: penanda,
      petunjuk: 'Transaksi sudah masuk ke penyedia dan deposit bisa jadi sudah terpotong. ' +
        'Jangan diulang — tanyakan statusnya lewat POST /api/dwi/cocokkan.'
    }) };
  }

  /* Tidak ada penanda apa pun: penyedia menolak sebelum ada yang bergerak
     (parameter salah, produk mati, saldo kurang). Maksud yang sama boleh
     dicoba lagi setelah diperbaiki, jadi catatannya dibuang. */
  delete catatan[kunci];
  tulisCatatan();
  return { kode: 400, badan: j };
}

/**
 * Tanyakan nasib sebuah transaksi yang belum final, lalu tutup catatannya.
 *
 * Tanpa jalan ini, satu transaksi PENDING mengunci kuncinya selamanya —
 * pelanggan yang sama tidak akan pernah bisa membeli produk yang sama lagi.
 * Statusnya TIDAK ditebak dari lamanya waktu: ia ditanyakan ke Darmawisata.
 */
async function cocokkan(kunci) {
  const c = catatan[kunci];
  if (!c) return { kode: 404, badan: { error: 'Kunci tidak dikenal: ' + kunci } };
  if (c.keadaan === 'selesai') return { kode: 200, badan: { kunci: kunci, keadaan: 'selesai',
    catatan: 'Sudah final sebelumnya.', balasan: c.balasan || null } };

  const jalurDetail = JALUR_DETAIL[c.jalur];
  const penanda = c.penanda || penandaTransaksi(c.balasan);
  if (!jalurDetail || !penanda) {
    return { kode: 409, badan: { error: 'Tidak ada penanda transaksi untuk ditanyakan. ' +
      'Cocokkan manual lewat TransactionList Darmawisata pada tanggal transaksinya.',
      kunci: kunci, keadaan: c.keadaan } };
  }

  let d;
  try {
    d = await panggil(jalurDetail, { referenceID: penanda });
  } catch (e) {
    return { kode: 502, badan: { error: 'Gagal menanyakan status: ' + e.message,
      kunci: kunci, keadaan: c.keadaan } };
  }

  const detail = d && d.detail;
  const st = String((detail && detail.transactionStatus) || '').toUpperCase();

  if (st === 'SUCCESS' || st === 'SUKSES') {
    simpanCatatan(kunci, { keadaan: 'selesai', detail: detail, selesai: new Date().toISOString() });
    return { kode: 200, badan: { kunci: kunci, keadaan: 'selesai', detail: detail } };
  }
  if (st === 'FAILED' || st === 'GAGAL' || st === 'CANCELED' || st === 'CANCELLED') {
    /* Gagal di sisi mereka berarti dananya dikembalikan ke deposit. Kuncinya
       dilepas supaya pembelian yang sama boleh diulang. */
    delete catatan[kunci];
    tulisCatatan();
    return { kode: 200, badan: { kunci: kunci, keadaan: 'batal', detail: detail,
      catatan: 'Penyedia menyatakan gagal. Kunci dilepas, pembelian boleh diulang.' } };
  }

  /* Masih belum final. Dibiarkan terkunci — itu memang gunanya. */
  simpanCatatan(kunci, { keadaan: 'tertunda', detail: detail || null });
  return { kode: 202, badan: { kunci: kunci, keadaan: 'tertunda', detail: detail || null,
    catatan: 'Penyedia belum memberi status akhir. Coba tanyakan lagi nanti.' } };
}

/* ---------------------------------------------------------------- ROUTING */
const TLS = require('./tls');
const jadi = TLS.bikinServer(null, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const jalur = url.pathname.replace(/\/+$/, '') || '/';

  try {
    /* ---- kesehatan: tidak pernah membocorkan securityCode ---- */
    if (jalur === '/api/dwi/health') {
      const punya = Boolean(DWI.userID && DWI.password);
      const hasil = {
        siap: punya,
        base: DWI.base,
        lingkungan: DWI.produksi ? 'produksi' : 'uat',
        userID: DWI.userID ? DWI.userID.slice(0, 3) + '***' : '(kosong)',
        password: DWI.password ? '***terisi***' : '(kosong)',
        /* Contoh cap waktu, BUKAN securityCode-nya: yang terakhir itu
           turunan password, dan menampilkannya di layar kesehatan berarti
           membocorkan bahan yang justru dijaga. */
        contohToken: tokenWaktu(),
        sesiAktif: Boolean(sesi.accessToken),
        jalurTerbuka: Object.keys(DAFTAR_PUTIH).length
      };
      if (!punya) return kirimJSON(res, 200, Object.assign(hasil, {
        pesan: 'Isi DWI_USER_ID dan DWI_PASSWORD di app/server/.env'
      }));
      try {
        await login();
        hasil.sesiAktif = true;
        hasil.pesan = 'Login berhasil.';
      } catch (e) {
        hasil.siap = false;
        hasil.pesan = e.message;
      }
      return kirimJSON(res, 200, hasil);
    }

    /* ---- saldo deposit agen ---- */
    if (jalur === '/api/dwi/balance') {
      const j = await panggil('/Agent/Balance', {});
      if (String(j.status).toUpperCase() !== 'SUCCESS') {
        return kirimJSON(res, 400, { error: j.respMessage || 'Gagal membaca saldo' });
      }
      return kirimJSON(res, 200, { saldo: j.balance, waktu: j.respTime });
    }

    /* ---- panggilan berdaftar-putih ---- */
    if (jalur === '/api/dwi/call' && req.method === 'POST') {
      const body = await bacaBody(req);
      const target = String(body.jalur || '');
      const izin = Object.prototype.hasOwnProperty.call(DAFTAR_PUTIH, target)
        ? DAFTAR_PUTIH[target] : null;

      if (!izin) {
        return kirimJSON(res, 403, {
          error: 'Jalur "' + target + '" tidak ada di daftar putih server ini.',
          petunjuk: 'Jalur yang memotong deposit sengaja belum dibuka. ' +
            'Lihat catatan DAFTAR_PUTIH di dwi-server.js.'
        });
      }
      /* Jalur uang TIDAK PERNAH lewat pintu ini, sekalipun ia ada di daftar
         putih. Pintu ini tidak punya catatan transaksi; yang punya hanya
         /api/dwi/bayar. Menolak di sini, bukan sekadar mengandalkan pemanggil
         memakai pintu yang benar. */
      if (izin.uang) {
        return kirimJSON(res, 400, {
          error: 'Jalur ini memotong deposit dan harus lewat POST /api/dwi/bayar, ' +
            'bukan /api/dwi/call — di sanalah kunci idempotensinya diperiksa.'
        });
      }

      const isi = (body.isi && typeof body.isi === 'object') ? body.isi : {};
      const j = await panggil(target, isi);
      return kirimJSON(res, 200, j);
    }

    /* ---- satu-satunya pintu yang boleh memotong deposit ---- */
    if (jalur === '/api/dwi/bayar' && req.method === 'POST') {
      const body = await bacaBody(req);
      const target = String(body.jalur || '');
      const izin = Object.prototype.hasOwnProperty.call(DAFTAR_PUTIH, target)
        ? DAFTAR_PUTIH[target] : null;
      if (!izin || !izin.uang) {
        return kirimJSON(res, 400, {
          error: 'Pintu ini hanya untuk jalur yang memotong deposit. ' +
            'Jalur baca memakai /api/dwi/call.'
        });
      }
      const isi = (body.isi && typeof body.isi === 'object') ? body.isi : {};
      const hasil = await panggilUang(target, isi);
      return kirimJSON(res, hasil.kode, hasil.badan);
    }

    /* ---- menanyakan nasib transaksi yang belum final ---- */
    if (jalur === '/api/dwi/cocokkan' && req.method === 'POST') {
      const body = await bacaBody(req);
      const kunci = String(body.kunci || '').trim();
      if (!kunci) return kirimJSON(res, 400, { error: 'Sebutkan kunci transaksinya.' });
      const hasil = await cocokkan(kunci);
      return kirimJSON(res, hasil.kode, hasil.badan);
    }

    /* ---- catatan transaksi: untuk mencocokkan yang berakhir ragu ----
       Dibuka sebagai bacaan karena justru di sinilah orang mencari jawaban
       ketika sebuah pembayaran tidak jelas nasibnya. */
    if (jalur === '/api/dwi/transaksi') {
      const daftar = Object.keys(catatan).map(function (k) {
        const c = catatan[k];
        return { kunci: k, keadaan: c.keadaan, jalur: c.jalur, penanda: c.penanda || null,
                 mulai: c.mulai, selesai: c.selesai || null, sebab: c.sebab || null,
                 permintaan: c.permintaan || null };
      }).sort(function (a, b) { return String(b.mulai).localeCompare(String(a.mulai)); });
      const hitung = function (k) {
        return daftar.filter(function (x) { return x.keadaan === k; }).length;
      };
      return kirimJSON(res, 200, { total: daftar.length, ragu: hitung('ragu'),
        tertunda: hitung('tertunda'), berjalan: hitung('berjalan'), selesai: hitung('selesai'),
        daftar: daftar });
    }

    kirimJSON(res, 404, { error: 'Jalur tidak dikenal: ' + jalur });
  } catch (e) {
    kirimJSON(res, e.status || 500, { error: e.message, detail: e.detail || null });
  }
});

const server = jadi.server;
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('dwi-server', PORT, ALAMAT));
  const siap = DWI.userID && DWI.password;
  console.log('  target     : ' + DWI.base + '  (' + (DWI.produksi ? 'PRODUKSI' : 'uat') + ')');
  console.log('  kredensial : ' + (siap ? 'terisi' : 'BELUM DIISI di .env'));
  console.log('  asal boleh : ' + ASAL_BOLEH.join(', '));
  if (DWI.produksi) {
    console.log('  PERHATIAN  : ini server PRODUKSI — setiap transaksi memotong deposit sungguhan.');
  }
});
