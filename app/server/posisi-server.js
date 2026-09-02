/* ==========================================================================
   posisi-server.js — posisi mitra langsung untuk EXOCLEAN App
   --------------------------------------------------------------------------
   KENAPA BERKAS TERPISAH, BUKAN DI data-server.js

   data-server.js menyimpan DATA: setiap tulisan masuk oplog dan SQLite,
   dengan token per perangkat. Posisi petugas bukan data — ia denyut yang
   berubah tiap beberapa detik dan basi dalam sepuluh menit. Memasukkannya ke
   oplog berarti ribuan baris sehari yang tidak pernah dibaca lagi.

   Server ini hanya menyimpan POSISI TERAKHIR per pesanan di memori, dengan
   masa hidup 10 menit. Ponsel mitra mengirim, ponsel pelanggan membaca.
   Tidak ada riwayat — riwayat lokasi untuk pembuktian klaim (30 hari)
   adalah pekerjaan lain dan butuh penyimpanan sungguhan.

   YANG TIDAK DILAKUKAN, DAN HARUS DIKATAKAN
     · Tidak ada autentikasi. Siapa pun yang tahu nomor pesanan bisa
       membaca posisinya. Cukup untuk uji coba di jaringan lokal; untuk
       produksi, pasang token per pesanan yang diterbitkan saat checkout.
     · Tidak ada TLS. Sama seperti server pendamping lain di folder ini,
       pasang di belakang reverse proxy ber-HTTPS.

   Endpoint:
     POST /api/posisi/<orderId>   { lat, lng, akurasi }   → { ok:true }
     GET  /api/posisi/<orderId>                            → { lat, lng, akurasi, at } | 404
     GET  /api/posisi/health

   Menjalankan:  node app/server/posisi-server.js     (npm run start:posisi)
   Port: POSISI_PORT di .env, bawaan 4200. CORS mengikuti ALLOWED_ORIGINS.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');

function bacaEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((b) => {
    const m = b.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
  return out;
}
const ENV = Object.assign(bacaEnv(), process.env);
const PORT = Number(ENV.POSISI_PORT || 4200);
const ASAL = String(ENV.ALLOWED_ORIGINS || 'http://localhost:8080').split(',').map((s) => s.trim()).filter(Boolean);
const TTL = 10 * 60 * 1000;

const posisi = new Map();   /* orderId → { lat, lng, akurasi, at } */
setInterval(() => { const now = Date.now(); for (const [k, v] of posisi) if (now - v.at > TTL) posisi.delete(k); }, 60000).unref();

function kirim(res, kode, obj) {
  res.writeHead(kode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && (ASAL.indexOf(origin) >= 0 || ASAL.indexOf('*') >= 0)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const m = url.pathname.match(/^\/api\/posisi\/([A-Za-z0-9_\-]{1,40})$/);
  if (url.pathname === '/api/posisi/health') return kirim(res, 200, { ok: true, layanan: 'EXOCLEAN posisi server', aktif: posisi.size });
  if (!m) return kirim(res, 404, { error: 'Tidak ada' });
  const id = m[1];

  if (req.method === 'GET') {
    const p = posisi.get(id);
    if (!p || Date.now() - p.at > TTL) return kirim(res, 404, { error: 'Belum ada posisi untuk pesanan ini' });
    return kirim(res, 200, p);
  }
  if (req.method === 'POST') {
    let badan = '';
    req.on('data', (c) => { badan += c; if (badan.length > 2048) req.destroy(); });
    req.on('end', () => {
      let b; try { b = JSON.parse(badan || '{}'); } catch (e) { return kirim(res, 400, { error: 'JSON tidak valid' }); }
      const lat = Number(b.lat), lng = Number(b.lng);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return kirim(res, 400, { error: 'lat/lng tidak valid' });
      posisi.set(id, { lat, lng, akurasi: Number(b.akurasi) || null, at: Date.now() });
      kirim(res, 200, { ok: true });
    });
    return;
  }
  kirim(res, 405, { error: 'Metode tidak didukung' });
}).listen(PORT, () => {
  console.log(`EXOCLEAN posisi server: http://localhost:${PORT}/api/posisi/health`);
  console.log('  Asal yang diizinkan: ' + ASAL.join(', '));
});
