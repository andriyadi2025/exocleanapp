/* ==========================================================================
 *  data-server.js — server brankas data pribadi EXOCLEAN
 * --------------------------------------------------------------------------
 *  Aplikasi (pelanggan, mitra, toko, admin) menitipkan bidang data pribadi ke
 *  sini alih-alih menyimpannya di localStorage perangkat. Setiap permintaan
 *  wajib membawa sesi bertanda tangan dari auth-server (sesi.js). Rekaman
 *  terikat ke `sub` pemilik; hanya pemilik (atau sesi admin) yang bisa
 *  membaca/mengubah/menghapus. Kriptografi ada di brankas.js (AES-256-GCM
 *  amplop, DEK per rekaman, KEK berversi, indeks buta HMAC).
 *
 *  Endpoint (semua POST JSON kecuali health; Authorization: Bearer <sesi>):
 *   GET  /api/data/health            → { ok, mode, versiKunci, rekaman }
 *   POST /api/data/simpan            { tabel, id, data:{…}, indeks:[…] }
 *   POST /api/data/ambil             { tabel, id }
 *   POST /api/data/ambil-semua       { tabel }          (rekaman milik sesi; admin: semua)
 *   POST /api/data/cari              { tabel, bidang, nilai }  → daftar id
 *   POST /api/data/hapus             { tabel, id }      (penghapusan kriptografis)
 *   POST /api/data/statistik         (admin)            → jumlah per tabel, versi kunci
 *   POST /api/data/verifikasi-audit  (admin)            → integritas rantai log
 *   POST /api/data/putar-kunci       (admin)            → bungkus ulang DEK ke KEK aktif
 *
 *  Tanpa BRANKAS_KUNCI atau SESI_SECRET server MENOLAK berjalan — brankas
 *  tidak punya mode simulasi. Jalankan: npm run start:data (DATA_PORT 4600).
 * ========================================================================== */
const express = require('express');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');
const SESI = require('./sesi');
const { Brankas } = require('./brankas');

const PORT = Number(process.env.DATA_PORT || 4600);
let RAHASIA_SESI, brankas;
try {
  RAHASIA_SESI = SESI.rahasiaDari(process.env);
  const lama = {}; if (process.env.BRANKAS_KUNCI_LAMA) { String(process.env.BRANKAS_KUNCI_LAMA).split(',').forEach((p) => { const m = p.trim().match(/^(\d+):([0-9a-fA-F]{64})$/); if (m) lama[m[1]] = m[2]; }); }
  brankas = new Brankas({ kunci: process.env.BRANKAS_KUNCI, versi: process.env.BRANKAS_KUNCI_VERSI || 1, kunciLama: lama, dir: process.env.BRANKAS_DIR });
} catch (e) { console.error('[data] TIDAK BISA BERJALAN: ' + e.message); process.exit(1); }

const app = express();
KEAMANAN.pasangDasar(app, process.env, 'data');
app.use(express.json({ limit: '3mb' }));
const lajuTulis = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_DATA_TULIS_PER_MENIT || 60), kunci: (req) => (req.sesi && req.sesi.sub) || KEAMANAN.ipKlien(req) });
const lajuBaca = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_DATA_BACA_PER_MENIT || 120), kunci: (req) => (req.sesi && req.sesi.sub) || KEAMANAN.ipKlien(req) });
const wajib = SESI.wajibSesi(RAHASIA_SESI), wajibAdmin = SESI.wajibSesi(RAHASIA_SESI, { sisi: ['admin'] });
const TABEL_BOLEH = new Set(String(process.env.BRANKAS_TABEL || 'users,orders,kontakDarurat,toko,penarikanToko,pendaftaran,sosInsiden,foto,vdp').split(',').map((s) => s.trim()).filter(Boolean));
function tabelSah(t) { if (!TABEL_BOLEH.has(String(t || ''))) throw Object.assign(new Error('tabel tidak diizinkan'), { status: 400 }); return t; }
function opsiDari(req) { return { pemilik: req.sesi.sub, admin: req.sesi.sisi === 'admin' }; }
function tangani(fn) { return async (req, res) => { try { res.json(await fn(req)); } catch (e) { const st = e.status || 400; if (st >= 500) console.error('[data]', e.message); res.status(st).json({ error: st >= 500 ? 'Gangguan brankas' : e.message }); } }; }

app.get('/api/data/health', (req, res) => { const st = brankas.statistik(); res.json({ ok: true, layanan: 'data', mode: 'aes-256-gcm amplop · DEK per rekaman · KEK v' + st.versiKunci, versiKunci: st.versiKunci, rekaman: st.rekaman, sesi: true }); });
app.post('/api/data/simpan', wajib, lajuTulis, tangani(async (req) => { const b = req.body || {}; tabelSah(b.tabel); const idx = Array.isArray(b.indeks) ? b.indeks.slice(0, 4).map(String) : []; const r = brankas.tulis(b.tabel, b.id, b.data, Object.assign(opsiDari(req), { indeks: idx, paksa: req.sesi.sisi === 'admin' })); return { ok: true, tabel: r.tabel, id: r.id, bidang: r.bidang, versiKunci: r.versiKunci }; }));
app.post('/api/data/ambil', wajib, lajuBaca, tangani(async (req) => { const b = req.body || {}; tabelSah(b.tabel); const r = brankas.baca(b.tabel, b.id, opsiDari(req)); if (!r) throw Object.assign(new Error('rekaman tidak ada'), { status: 404 }); return { ok: true, tabel: r.tabel, id: r.id, data: r.data, versiKunci: r.versiKunci }; }));
app.post('/api/data/ambil-semua', wajib, lajuBaca, tangani(async (req) => { const b = req.body || {}; tabelSah(b.tabel); const r = brankas.daftar(b.tabel, Object.assign(opsiDari(req), { maks: 500 })); return { ok: true, tabel: b.tabel, rekaman: r.map((x) => ({ id: x.id, data: x.data })) }; }));
app.post('/api/data/cari', wajib, lajuBaca, tangani(async (req) => { const b = req.body || {}; tabelSah(b.tabel); if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(String(b.bidang || ''))) throw new Error('bidang tidak sah'); return { ok: true, id: brankas.cari(b.tabel, b.bidang, KEAMANAN.batasiTeks(b.nilai, 200), opsiDari(req)) }; }));
app.post('/api/data/hapus', wajib, lajuTulis, tangani(async (req) => { const b = req.body || {}; tabelSah(b.tabel); return { ok: true, terhapus: brankas.hapus(b.tabel, b.id, opsiDari(req)) }; }));
app.post('/api/data/statistik', wajibAdmin, tangani(async () => Object.assign({ ok: true }, brankas.statistik())));
app.post('/api/data/verifikasi-audit', wajibAdmin, tangani(async () => Object.assign({ ok: true }, { hasil: brankas.verifikasiAudit() })));
app.post('/api/data/putar-kunci', wajibAdmin, tangani(async (req) => ({ ok: true, dibungkusUlang: brankas.putarKunci((req.body || {}).tabel) })));
app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => { const st = brankas.statistik(); console.log(TLS.keterangan('EXOCLEAN data-server (brankas)', PORT, ALAMAT) + '\n  enkripsi : AES-256-GCM amplop, DEK per rekaman, KEK versi ' + st.versiKunci + ' (tersedia: ' + st.versiTersedia.join(',') + ')\n  rekaman  : ' + st.rekaman + ' · tabel diizinkan: ' + [...TABEL_BOLEH].join(', ')); });
module.exports = app;
