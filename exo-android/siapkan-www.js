/* ==========================================================================
   siapkan-www.js — menyusun isi web EXOCLEAN App yang dibungkus ke dalam APK
   --------------------------------------------------------------------------
   KENAPA BUKAN SEKADAR MENUNJUK KE FOLDER app/

   Sebuah APK adalah berkas zip. Siapa pun yang memegangnya bisa membukanya
   dan membaca seluruh isinya. Folder `app/` memuat `app/server/.env`, dan di
   dalamnya ada FACEBOOK_APP_SECRET, SMS_API_KEY, dan Server Key Midtrans.
   Menunjuk webDir ke `app/` berarti mengirim seluruh rahasia itu ke setiap
   ponsel yang memasang aplikasinya — sekali, permanen, dan tidak bisa ditarik
   kembali.

   Karena itu isi bundel disusun dari DAFTAR IZIN, bukan dengan menyalin
   semuanya lalu membuang yang tidak diinginkan. Yang tidak disebut, tidak
   ikut. Dan setelah tersalin, hasilnya DIPERIKSA ulang: bila ada berkas yang
   tampak memuat rahasia, skrip ini berhenti dan tidak meninggalkan bundel
   setengah jadi.

   APA YANG IKUT

     · seluruh <script src> dan <link href> yang benar-benar dirujuk exo.html
     · css/ dan assets/ seutuhnya (tidak ada rahasia di sana, dan CSS merujuk
       gambar lewat url() yang tidak terbaca dari HTML)
     · data/wilayah/<negara> — HANYA negara yang dilayani

   APA YANG SENGAJA TIDAK IKUT

     · app/server/**            rahasia, basis data, node_modules
     · sw.js                    service worker
     · data/contoh/**           penyemai data contoh
     · index.html, mcs.html,    aplikasi manajemen dan portal lama; ini bungkus
       mitra.html                EXOCLEAN App (exo.html) untuk pelanggan dan mitra

   KENAPA sw.js TIDAK IKUT

   Di dalam APK seluruh berkasnya sudah lokal, jadi singgahan luring tidak
   menambah apa pun. Yang ia tambahkan justru satu lapisan yang bisa
   menyajikan berkas LAMA setelah aplikasinya diperbarui — kegagalan yang
   sudah lazim pada aplikasi terbungkus dan sulit dijelaskan kepada pengguna.
   NOTIF.siap() sudah menangani ketiadaannya: pendaftarannya gagal, ditangkap,
   dan aplikasinya berjalan seperti biasa. Untuk notifikasi dorong di Android
   yang dipakai nanti adalah FCM lewat Capacitor, bukan web push.

   KENAPA HANYA SEBAGIAN data/wilayah

   Seluruhnya 40 MB untuk 57 negara. Yang dilayani hanya ASEAN (lihat
   BAWAAN_DILAYANI di app/js/wilayah.js), dan itu 3,5 MB. Negara yang datanya
   tidak ikut TIDAK membuat aplikasi patah: app/js/wilayah.js menangkap
   kegagalan muat dan mengalihkan kolomnya ke ketik manual. Bila daftar negara
   yang dilayani diubah lewat layar "Negara yang Dilayani", sesuaikan NEGARA di
   bawah lalu bungkus ulang — atau terima alamatnya diketik manual.

   Menjalankan:  node siapkan-www.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const AKAR = path.resolve(__dirname, '..', 'app');
const TUJUAN = path.resolve(__dirname, 'www');
const HALAMAN = 'exo.html';

/* Negara yang data wilayahnya ikut dibungkus. Sepadan dengan BAWAAN_DILAYANI
   di app/js/wilayah.js. Singapura tidak punya data — memang tidak berprovinsi. */
const NEGARA = ['id', 'my', 'th', 'vn', 'ph', 'bn', 'kh', 'la', 'mm', 'tl'];

/* Folder yang seluruh isinya ikut. */
const FOLDER = ['css', 'assets'];

/* Tidak boleh ikut, apa pun alasannya. Diperiksa pada SETIAP berkas. */
const TERLARANG = [
  path.sep + 'server' + path.sep,
  path.sep + 'node_modules' + path.sep,
  path.sep + 'contoh' + path.sep
];
const NAMA_TERLARANG = ['.env', '.env.example', 'sw.js', 'serve.ps1'];
const EKSTENSI_TERLARANG = ['.db', '.db-wal', '.db-shm', '.ps1', '.pem', '.key'];

/* Penanda rahasia. Bila salah satu muncul di berkas yang tersalin, berhenti. */
const PENANDA_RAHASIA = [
  'Mid-server-', 'SECRET_KEY', 'APP_SECRET', 'API_KEY', 'PRIVATE_KEY',
  'BEGIN RSA PRIVATE KEY', 'BEGIN PRIVATE KEY', 'SERVER_KEY'
];

let jumlah = 0, bita = 0;
const disalin = [];

function henti(pesan) {
  console.error('\nBERHENTI — ' + pesan);
  console.error('Bundel TIDAK dibuat. Tidak ada berkas yang ditinggalkan setengah jadi.\n');
  process.exit(1);
}

function bolehIkut(relatif) {
  const p = path.sep + relatif.split('/').join(path.sep);
  for (const t of TERLARANG) if (p.indexOf(t) >= 0) return 'berada di dalam ' + t.trim();
  const nama = path.basename(relatif);
  if (NAMA_TERLARANG.indexOf(nama) >= 0) return 'bernama ' + nama;
  for (const e of EKSTENSI_TERLARANG) if (nama.endsWith(e)) return 'berekstensi ' + e;
  return null;
}

function salin(relatif, sebagai) {
  const larangan = bolehIkut(relatif);
  if (larangan) henti('berkas terlarang hendak disalin: ' + relatif + ' (' + larangan + ')');

  const asal = path.join(AKAR, relatif.split('/').join(path.sep));
  if (!fs.existsSync(asal)) henti('berkas yang dirujuk tidak ada: ' + relatif);

  const tujuan = path.join(TUJUAN, (sebagai || relatif).split('/').join(path.sep));
  fs.mkdirSync(path.dirname(tujuan), { recursive: true });
  fs.copyFileSync(asal, tujuan);

  const st = fs.statSync(tujuan);
  jumlah++; bita += st.size;
  disalin.push(sebagai || relatif);
}

function salinFolder(relatif) {
  const asal = path.join(AKAR, relatif);
  if (!fs.existsSync(asal)) henti('folder tidak ada: ' + relatif);
  for (const nama of fs.readdirSync(asal)) {
    const anak = relatif + '/' + nama;
    if (fs.statSync(path.join(AKAR, anak)).isDirectory()) salinFolder(anak);
    else if (!bolehIkut(anak)) salin(anak);
  }
}

/* ------------------------------------------------------------------ mulai */
console.log('Menyusun bundel EXOCLEAN App (pelanggan + mitra) untuk Android');
console.log('  sumber : ' + AKAR);
console.log('  tujuan : ' + TUJUAN);

if (fs.existsSync(TUJUAN)) fs.rmSync(TUJUAN, { recursive: true, force: true });
fs.mkdirSync(TUJUAN, { recursive: true });

/* 1. Halaman utama — menjadi index.html, pintu masuk Capacitor. */
const html = fs.readFileSync(path.join(AKAR, HALAMAN), 'utf8');
fs.writeFileSync(path.join(TUJUAN, 'index.html'), html);
jumlah++; bita += Buffer.byteLength(html);
disalin.push('index.html');

/* 2. Setiap berkas yang benar-benar dirujuk halaman itu.

   Diambil DARI HTML-nya, bukan dari daftar yang ditulis tangan: daftar tangan
   akan tertinggal begitu ada skrip baru ditambahkan, dan gejalanya adalah
   aplikasi yang mati tanpa sebab yang terlihat. */
const rujukan = (html.match(/(?:src|href)="([^"]+)"/g) || [])
  .map(function (s) { return s.replace(/^(?:src|href)="/, '').replace(/"$/, ''); })
  .filter(function (u) {
    return u && u.indexOf('//') < 0 && u.charAt(0) !== '#' && u.indexOf('data:') !== 0;
  })
  .filter(function (u, i, a) { return a.indexOf(u) === i; });

let dilewati = [];
for (const u of rujukan) {
  const larangan = bolehIkut(u);
  if (larangan) { dilewati.push(u + '  (' + larangan + ')'); continue; }
  /* css/ dan assets/ disalin utuh di langkah 3; jangan dobel. */
  if (FOLDER.some(function (f) { return u.indexOf(f + '/') === 0; })) continue;
  salin(u);
}

/* 3. Folder yang ikut seutuhnya. */
for (const f of FOLDER) salinFolder(f);

/* 4. Data wilayah, hanya negara yang dilayani. */
for (const kode of NEGARA) {
  const rel = 'data/wilayah/' + kode;
  if (!fs.existsSync(path.join(AKAR, rel))) {
    console.warn('  ! data wilayah tidak ada, dilewati: ' + kode);
    continue;
  }
  salinFolder(rel);
}

/* ------------------------------------------------- PEMERIKSAAN SETELAH SALIN

   Daftar izin di atas sudah menjaga, tetapi penjaga yang tidak pernah diuji
   adalah penjaga yang tidak diketahui rusak. Hasilnya diperiksa ulang seolah
   daftar izinnya tidak ada. */
const TEKS = ['.js', '.json', '.html', '.css', '.txt', '.md', '.env'];
const temuan = [];
(function sisir(dir) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) { sisir(p); continue; }
    const rel = path.relative(TUJUAN, p).split(path.sep).join('/');
    const larangan = bolehIkut(rel);
    if (larangan) temuan.push(rel + ' — ' + larangan);
    if (!TEKS.some(function (e) { return nama.endsWith(e); })) continue;
    /* Berkas besar dilewati: data wilayah tidak memuat rahasia, dan menyisir
       40.000 berkas JSON menghabiskan waktu tanpa menemukan apa pun. */
    if (fs.statSync(p).size > 400 * 1024) continue;
    const isi = fs.readFileSync(p, 'utf8');
    for (const tanda of PENANDA_RAHASIA) {
      if (isi.indexOf(tanda) >= 0) temuan.push(rel + ' — memuat "' + tanda + '"');
    }
  }
})(TUJUAN);

if (temuan.length) {
  console.error('\nPEMERIKSAAN GAGAL — bundel memuat yang tidak boleh:');
  temuan.forEach(function (t) { console.error('   ' + t); });
  fs.rmSync(TUJUAN, { recursive: true, force: true });
  henti('bundel dihapus supaya tidak ada yang terbungkus tanpa sengaja');
}

/* ---------------------------------------------------------------- laporan */
function mb(n) { return (n / 1024 / 1024).toFixed(2) + ' MB'; }
console.log('\n  berkas  : ' + jumlah);
console.log('  ukuran  : ' + mb(bita));
console.log('  negara  : ' + NEGARA.join(', '));
if (dilewati.length) {
  console.log('\n  dirujuk halaman tetapi SENGAJA tidak ikut:');
  dilewati.forEach(function (d) { console.log('    ' + d); });
}
console.log('\n  pemeriksaan rahasia: bersih');
console.log('  siap dibungkus: npx cap sync android\n');
