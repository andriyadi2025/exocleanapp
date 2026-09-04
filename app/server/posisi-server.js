/* ==========================================================================
   posisi-server.js — posisi mitra langsung untuk EXOCLEAN App
   --------------------------------------------------------------------------
   Menyimpan hanya POSISI TERAKHIR per pesanan di memori, masa hidup 10 menit.
   Ponsel mitra mengirim, ponsel pelanggan membaca. Tidak ada riwayat —
   riwayat lokasi untuk pembuktian klaim (30 hari) adalah pekerjaan lain dan
   butuh penyimpanan sungguhan.

   KEAMANAN (diperketat 4 Sep 2026)
     · Token per pesanan. Kiriman PERTAMA untuk sebuah pesanan menerbitkan
       dua token acak: `tulis` (dipegang ponsel mitra) dan `baca` (diberikan
       ke pelanggan lewat catatan pesanan). Kiriman berikutnya wajib membawa
       header X-Exo-Token = tulis; pembacaan wajib membawa X-Exo-Token = baca
       (atau ?t=). Tanpa token, nomor pesanan yang mudah ditebak tidak lagi
       cukup untuk mengintip posisi petugas.
     · Header pengaman, CORS ketat, pembatas laju, log tanpa PII (keamanan.js).
     · HTTP-atau-HTTPS diputuskan tls.js: tanpa sertifikat hanya mendengar di
       127.0.0.1; dengan sertifikat HTTPS di seluruh antarmuka.

   Endpoint:
     POST /api/posisi/<orderId>   { lat, lng, akurasi }  → { ok, tulis?, baca? }
     GET  /api/posisi/<orderId>   X-Exo-Token: <baca>     → { lat, lng, akurasi, at } | 404
     GET  /api/posisi/health
   Menjalankan:  npm run start:posisi   (POSISI_PORT, bawaan 4200)
   ========================================================================== */
'use strict';
const express = require('express');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');

const app = express();
const PORT = Number(process.env.POSISI_PORT || 4200);
const TTL = 10 * 60 * 1000;
const posisi = new Map();   /* orderId → { lat, lng, akurasi, at, tulisHash, bacaHash } */

app.use(express.json({ limit: '2kb' }));
const ASAL = KEAMANAN.pasangDasar(app, process.env, 'posisi');
const lajuTulis = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_POSISI_PER_MENIT || 60) });

setInterval(() => { const now = Date.now(); for (const [k, v] of posisi) if (now - v.at > TTL) posisi.delete(k); }, 60000).unref();

function tokenDari(req) { return String(req.headers['x-exo-token'] || req.query.t || (req.body && req.body.token) || ''); }
function idSah(id) { return /^[A-Za-z0-9_\-]{1,40}$/.test(id); }
function cocok(token, hash) { return KEAMANAN.samaAman(KEAMANAN.hashToken(token), hash); }

app.get('/api/posisi/health', (req, res) => res.json({ ok: true, layanan: 'EXOCLEAN posisi server', aktif: posisi.size, token: true }));

app.get('/api/posisi/:id', (req, res) => {
  const id = req.params.id; if (!idSah(id)) return res.status(404).json({ error: 'Tidak ada' });
  const p = posisi.get(id);
  if (!p || Date.now() - p.at > TTL) return res.status(404).json({ error: 'Belum ada posisi untuk pesanan ini' });
  const t = tokenDari(req);
  if (!cocok(t, p.bacaHash) && !cocok(t, p.tulisHash)) return res.status(403).json({ error: 'Token baca tidak cocok' });
  res.json({ lat: p.lat, lng: p.lng, akurasi: p.akurasi, at: p.at });
});

app.post('/api/posisi/:id', lajuTulis, (req, res) => {
  const id = req.params.id; if (!idSah(id)) return res.status(404).json({ error: 'Tidak ada' });
  const b = req.body || {};
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: 'lat/lng tidak valid' });
  const akurasi = isFinite(Number(b.akurasi)) ? Math.max(0, Math.min(100000, Number(b.akurasi))) : null;
  const ada = posisi.get(id);
  if (ada && Date.now() - ada.at <= TTL) {
    if (!cocok(tokenDari(req), ada.tulisHash)) return res.status(403).json({ error: 'Token tulis tidak cocok — pesanan ini sudah dipegang perangkat lain' });
    Object.assign(ada, { lat, lng, akurasi, at: Date.now() });
    return res.json({ ok: true });
  }
  /* kiriman pertama: terbitkan pasangan token; hanya hash-nya yang disimpan */
  const tulis = KEAMANAN.tokenAcak(24), baca = KEAMANAN.tokenAcak(18);
  posisi.set(id, { lat, lng, akurasi, at: Date.now(), tulisHash: KEAMANAN.hashToken(tulis), bacaHash: KEAMANAN.hashToken(baca) });
  res.json({ ok: true, tulis, baca });
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN posisi-server', PORT, ALAMAT));
  console.log('  Asal yang diizinkan: ' + ASAL.join(', '));
});
module.exports = app;
