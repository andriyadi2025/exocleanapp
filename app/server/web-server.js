/* ==========================================================================
   web-server.js — melayani aplikasinya sendiri, dengan enkripsi
   --------------------------------------------------------------------------
   KENAPA INI ADA, PADAHAL SUDAH ADA serve.ps1

   serve.ps1 hanya mendengar di loopback. Itu keputusan yang benar untuk apa
   adanya — ia melayani HTTP polos, dan HTTP polos memang tidak boleh keluar
   dari satu mesin. Tetapi akibatnya seluruh kerja sinkronisasi tidak bisa
   dibuktikan: PONSEL TIDAK PERNAH BISA MEMBUKA APLIKASINYA. Building manager
   di komputernya dan supervisor di ponselnya — alasan utama MCS dibuat —
   berhenti di situ.

   Membuat HttpListener PowerShell berbicara HTTPS menuntut sertifikat
   dipasang ke port lewat `netsh http add sslcert`, dengan hak administrator
   dan sertifikat yang sudah masuk penyimpanan Windows. Itu tiga langkah yang
   gagalnya senyap. Node sudah wajib ada di sini untuk server data, jadi
   melayani berkas statis dari Node adalah jalan yang lebih pendek dan yang
   kegagalannya kelihatan.

   serve.ps1 TIDAK dihapus: ia tetap cara tercepat menjalankan aplikasi di
   satu komputer tanpa memikirkan sertifikat.

   ATURAN KEAMANAN YANG SAMA PERSIS

   Daftar segmen terlarang di sini WAJIB sama dengan yang di serve.ps1. Dua
   server yang melayani pohon berkas yang sama dengan aturan berbeda berarti
   satu di antaranya membocorkan app/server/.env — dan yang membocorkan
   adalah yang jarang diperiksa.

   Menjalankan:
     node app/server/web-server.js              (loopback, HTTP)
     EXO_TLS_CERT=… EXO_TLS_KEY=… node app/server/web-server.js
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const url = require('url');
const TLS = require('./tls');

/* Muat .env supaya EXO_TLS_* bisa diletakkan di tempat yang sama dengan
   pengaturan server lain, bukan diketik ulang di baris perintah. */
(function bacaEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((baris) => {
    const s = baris.trim();
    if (!s || s.startsWith('#')) return;
    const i = s.indexOf('=');
    if (i < 0) return;
    const k = s.slice(0, i).trim();
    if (process.env[k] === undefined) process.env[k] = s.slice(i + 1).trim();
  });
})();

const PORT = Number(process.env.EXO_WEB_PORT || 8443);
/* Akar layanan adalah app/, bukan folder ini — halaman-halamannya ada di
   app/index.html, app/mitra.html, app/mcs.html. */
const AKAR = path.resolve(__dirname, '..');

/* ------------------------------------------------------------ mime
   Daftar tertutup, bukan tebakan dari nama berkas. Berkas berakhiran aneh
   diserahkan sebagai octet-stream, yang membuat peramban mengunduhnya
   alih-alih menjalankannya. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

/* ----------------------------------------------------------- penjagaan
   SAMA DENGAN serve.ps1. 'data' sengaja TIDAK ada di sini: app/data/wilayah
   berisi daftar provinsi dan kabupaten yang memang harus terambil peramban.
   Basis data SQLite duduk di app/server/data, dan segmen 'server' sudah
   menutupnya. */
const TERLARANG = ['server', 'node_modules'];

function jalurAman(rel) {
  const seg = rel.split(/[\\/]+/);
  for (let i = 0; i < seg.length; i++) {
    const s = seg[i];
    if (!s) continue;
    if (s.charAt(0) === '.') return false;          /* .env, .git, dan sejenisnya */
    if (TERLARANG.indexOf(s.toLowerCase()) >= 0) return false;
  }
  return true;
}

function tangani(req, res) {
  let jalur;
  try {
    jalur = decodeURIComponent(url.parse(req.url).pathname || '/');
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 — alamat tidak sah');
  }
  if (jalur === '/') jalur = '/index.html';
  const rel = jalur.replace(/^\/+/, '');

  if (!jalurAman(rel)) return empatnolempat(res);

  /* Dinormalkan DULU, baru diperiksa masih di dalam akar. Memeriksa sebelum
     normalisasi membuat '../..' lolos, karena teksnya memang diawali akar
     sebelum sistem berkas menyelesaikannya. */
  const penuh = path.resolve(AKAR, rel);
  if (penuh !== AKAR && !penuh.startsWith(AKAR + path.sep)) return empatnolempat(res);

  let st;
  try { st = fs.statSync(penuh); } catch (e) { return empatnolempat(res); }
  if (!st.isFile()) return empatnolempat(res);

  const ext = path.extname(penuh).toLowerCase();
  const kepala = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': st.size,
    /* Peramban dilarang menebak tipe isi. Tanpa ini, berkas yang diunggah
       pengguna dan berakhiran tak dikenal bisa dijalankan sebagai HTML. */
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    /* Aplikasi ini tidak pernah pantas ditanam di dalam halaman orang lain. */
    'X-Frame-Options': 'DENY'
  };
  if (req.method === 'HEAD') { res.writeHead(200, kepala); return res.end(); }
  res.writeHead(200, kepala);
  fs.createReadStream(penuh).pipe(res);
}

function empatnolempat(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — berkas tidak ditemukan');
}

const jadi = TLS.bikinServer(null, tangani);
const ALAMAT = TLS.alamat(null, jadi.tls);

jadi.server.listen(PORT, ALAMAT.host, () => {
  console.log(TLS.keterangan('web-server', PORT, ALAMAT));
  console.log('  akar       : ' + AKAR);
  if (jadi.tls) {
    console.log('');
    console.log('  Dari ponsel di WiFi yang sama, buka:');
    console.log('    https://<alamat-ip-komputer-ini>:' + PORT + '/mcs.html');
    console.log('  Peringatan sertifikat muncul sekali per perangkat — itu wajar');
    console.log('  untuk sertifikat sendiri, dan enkripsinya tetap berlaku penuh.');
  }
});
