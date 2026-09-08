/* ==========================================================================
 *  vdp-server.js — penerima laporan kerentanan (VDP / bug bounty) EXOCLEAN
 * --------------------------------------------------------------------------
 *  Formulir di keamanan.html mengirim laporan ke sini. Laporan berisi detail
 *  eksploitasi dan kontak pelapor, jadi disimpan TERENKRIPSI lewat brankas.js
 *  (AES-256-GCM amplop, kunci yang sama dengan data-server) di tabel `vdp`,
 *  tanpa pemilik — hanya sesi admin (lewat data-server) yang bisa membacanya.
 *  Yang tersisa polos hanya indeks ringkas tanpa isi: nomor, waktu, tingkat
 *  dugaan (data/vdp-indeks.jsonl).
 *
 *  Pengaman: keamanan.js (header, CORS, limiter), batas 5 laporan/jam/IP,
 *  honeypot, panjang bidang dibatasi, Turnstile bila TURNSTILE_SECRET_KEY
 *  diisi. Nomor laporan dikembalikan ke pelapor sebagai bukti tanda terima.
 *  Jalankan: npm run start:vdp (VDP_PORT 4700).
 * ========================================================================== */
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');
const { Brankas } = require('./brankas');

const PORT = Number(process.env.VDP_PORT || 4700);
let brankas;
try {
  const lama = {}; if (process.env.BRANKAS_KUNCI_LAMA) String(process.env.BRANKAS_KUNCI_LAMA).split(',').forEach((p) => { const m = p.trim().match(/^(\d+):([0-9a-fA-F]{64})$/); if (m) lama[m[1]] = m[2]; });
  brankas = new Brankas({ kunci: process.env.BRANKAS_KUNCI, versi: process.env.BRANKAS_KUNCI_VERSI || 1, kunciLama: lama, dir: process.env.BRANKAS_DIR });
} catch (e) { console.error('[vdp] TIDAK BISA BERJALAN: ' + e.message + ' (laporan kerentanan wajib terenkripsi)'); process.exit(1); }

const app = express();
KEAMANAN.pasangDasar(app, process.env, 'vdp');
app.use(express.json({ limit: '256kb' }));
const lajuLapor = KEAMANAN.batasLaju({ jendelaDetik: 3600, maks: Number(process.env.LAJU_VDP_PER_JAM || 5) });
const TINGKAT = ['kritis', 'tinggi', 'sedang', 'rendah', 'info'];
const INDEKS = path.join(process.env.BRANKAS_DIR || path.join(__dirname, 'data', 'brankas'), '..', 'vdp-indeks.jsonl');
function nomor() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = require('crypto').randomBytes(6); let s = ''; for (let i = 0; i < 6; i++) s += a[b[i] % a.length]; return 'VDP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + s; }

app.get('/api/vdp/health', (req, res) => res.json({ ok: true, layanan: 'vdp', terenkripsi: true, turnstile: !!process.env.TURNSTILE_SECRET_KEY }));

app.post('/api/vdp/lapor', lajuLapor, async (req, res) => {
  const b = req.body || {}, T = KEAMANAN.batasiTeks;
  try {
    if (b.situs) return res.json({ ok: true, nomor: nomor() });          /* honeypot: bot mengisi bidang tersembunyi → pura-pura sukses */
    if (process.env.TURNSTILE_SECRET_KEY && !(await KEAMANAN.verifikasiTurnstile(process.env.TURNSTILE_SECRET_KEY, b.captcha, KEAMANAN.ipKlien(req)))) return res.status(400).json({ error: 'Verifikasi captcha gagal.' });
    const judul = T(b.judul, 160), aset = T(b.aset, 200), langkah = T(b.langkah, 8000), dampak = T(b.dampak, 2000), nama = T(b.nama, 80), email = T(b.email, 120).toLowerCase(), kontakLain = T(b.kontakLain, 200);
    const tingkat = TINGKAT.includes(b.tingkat) ? b.tingkat : 'sedang';
    if (judul.length < 8) return res.status(400).json({ error: 'Judul terlalu pendek.' });
    if (langkah.length < 40) return res.status(400).json({ error: 'Langkah reproduksi minimal 40 karakter — kami butuh cara mengulanginya.' });
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return res.status(400).json({ error: 'Email pelapor tidak sah (dipakai untuk balasan dan hadiah).' });
    const id = nomor(), at = new Date().toISOString();
    brankas.tulis('vdp', id, { judul, aset, tingkatDugaan: tingkat, langkah, dampak, nama, email, kontakLain, ipSamar: KEAMANAN.samarIp(KEAMANAN.ipKlien(req)), agen: T(req.headers['user-agent'], 200), at }, { pemilik: null, indeks: ['email'] });
    try { fs.appendFileSync(INDEKS, JSON.stringify({ id, at, tingkatDugaan: tingkat }) + '\n', { mode: 0o600 }); } catch (e) { /* indeks opsional */ }
    console.log(`[vdp] laporan baru ${id} · tingkat dugaan ${tingkat}`);
    res.json({ ok: true, nomor: id, sla: { responHari: Number(process.env.VDP_SLA_RESPON_HARI || 3) } });
  } catch (e) { console.error('[vdp]', e.message); res.status(500).json({ error: 'Laporan belum bisa disimpan. Kirim lewat email ' + (process.env.VDP_EMAIL || 'security@exoclean.id') + '.' }); }
});
app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => console.log(TLS.keterangan('EXOCLEAN vdp-server', PORT, ALAMAT) + '\n  laporan disimpan terenkripsi di brankas (tabel vdp) · email tim: ' + (process.env.VDP_EMAIL || 'security@exoclean.id')));
module.exports = app;
