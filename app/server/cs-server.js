/* ==========================================================================
 *  cs-server.js — Customer Care AI EXOCLEAN (jembatan ke Claude)
 * --------------------------------------------------------------------------
 *  Aplikasi mengirim pertanyaan pengguna beserta LANDASAN (basis pengetahuan
 *  per sisi + konteks data dari EXO_CS) → server meminta jawaban Claude yang
 *  dibatasi pada landasan itu (tidak mengarang kebijakan), memakai bahasa
 *  Indonesia ramah, ringkas, dan menyarankan satu layar tujuan bila relevan.
 *
 *  Kunci API dibaca dari ANTHROPIC_API_KEY di .env (tidak pernah dikirim ke
 *  peramban). Tanpa kunci / tanpa paket @anthropic-ai/sdk, server berjalan
 *  dalam MODE SIMULASI (mengembalikan jawaban lokal terbaik dari landasan)
 *  agar aplikasi tetap berfungsi.
 *
 *  Pengaman (keamanan.js): header pengaman, CORS ketat (ALLOWED_ORIGINS),
 *  batas laju per IP, batas ukuran badan. Tidak menyimpan percakapan.
 *  Jalankan: npm run start:cs   (CS_PORT, bawaan 4500)
 *  Endpoint: GET /health · POST /tanya { sisi, pesan, riwayat[], landasan }
 * ========================================================================== */
const express = require('express');
require('dotenv').config();
const KEAMANAN = require('./keamanan');
const TLS = require('./tls');

const app = express();
const PORT = Number(process.env.CS_PORT || 4500);
const MODEL = process.env.CS_MODEL || 'claude-opus-5';
app.use(express.json({ limit: '96kb' }));
KEAMANAN.pasangDasar(app, process.env, 'cs');
const laju = KEAMANAN.batasLaju({ jendelaDetik: 60, maks: Number(process.env.LAJU_CS_PER_MENIT || 20) });

let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (e) { Anthropic = null; }
const KUNCI = (process.env.ANTHROPIC_API_KEY || '').trim();
const SIMULASI = !Anthropic || !KUNCI;
const client = SIMULASI ? null : new Anthropic({ apiKey: KUNCI });

const SISI = { klien: 'pelanggan EXOCLEAN', mitra: 'mitra cleaning (petugas kebersihan) EXOCLEAN', toko: 'mitra toko (penjual perlengkapan di marketplace EXOCLEAN)' };

function sistem(sisi, landasan) {
  const kb = (landasan && landasan.kb) || [];
  const konteks = (landasan && landasan.konteks) || [];
  return [
    'Kamu adalah Customer Care AI EXOCLEAN, layanan kebersihan & marketplace perlengkapan di Indonesia. Lawan bicara: ' + (SISI[sisi] || SISI.klien) + '.',
    'Jawab dalam bahasa Indonesia yang ramah, ringkas (maksimal 120 kata), dan konkret. Gunakan HANYA kebijakan/fakta dari BASIS PENGETAHUAN dan KONTEKS di bawah; bila tidak tercakup, katakan belum bisa memastikan dan sarankan "Hubungkan ke tim EXOCLEAN". Jangan mengarang angka, tarif, atau kebijakan. Jangan meminta data pribadi sensitif (sandi, PIN, nomor kartu).',
    'Bila ada layar aplikasi yang relevan, sebutkan nama layarnya sesuai daftar `layar` di basis pengetahuan.',
    'Balas dengan JSON persis berbentuk {"jawab": string, "layar": string|null, "labelAksi": string|null} tanpa teks lain.',
    '',
    'BASIS PENGETAHUAN:',
    kb.map((e, i) => (i + 1) + '. T: ' + e.q + '\n   J: ' + e.a + (e.layar && e.layar.length ? '\n   layar: ' + e.layar.join(', ') : '')).join('\n'),
    '',
    'KONTEKS DATA PENGGUNA SAAT INI:',
    konteks.length ? konteks.map((k) => '- ' + k).join('\n') : '- (tidak ada)'
  ].join('\n');
}
function simulasi(sisi, pesan, landasan) {
  const kb = (landasan && landasan.kb) || [], t = String(pesan || '').toLowerCase();
  let terbaik = null, skor = 0;
  kb.forEach((e) => { const s = e.q.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && t.includes(w)).length; if (s > skor) { skor = s; terbaik = e; } });
  return { jawab: terbaik ? terbaik.a : 'Maaf, saya belum bisa memastikan. Tekan "Hubungkan ke tim EXOCLEAN" agar dibantu manusia.', layar: terbaik && terbaik.layar ? terbaik.layar[0] || null : null, labelAksi: terbaik && terbaik.layar && terbaik.layar[0] ? 'Buka' : null, simulasi: true };
}

app.get('/health', (req, res) => res.json({ ok: true, layanan: 'cs', mode: SIMULASI ? 'simulasi' : 'claude', model: SIMULASI ? null : MODEL, sdk: !!Anthropic, kunci: !!KUNCI }));

app.post('/tanya', laju, async (req, res) => {
  const b = req.body || {}, sisi = ['klien', 'mitra', 'toko'].includes(b.sisi) ? b.sisi : 'klien', pesan = String(b.pesan || '').slice(0, 800);
  if (!pesan.trim()) return res.status(400).json({ error: 'pesan kosong' });
  if (SIMULASI) return res.json(simulasi(sisi, pesan, b.landasan));
  try {
    const riwayat = (Array.isArray(b.riwayat) ? b.riwayat : []).slice(-8).filter((p) => p && p.teks).map((p) => ({ role: p.peran === 'user' ? 'user' : 'assistant', content: String(p.teks).slice(0, 800) }));
    if (!riwayat.length || riwayat[riwayat.length - 1].role !== 'user') riwayat.push({ role: 'user', content: pesan });
    const messages = [];
    riwayat.forEach((m) => { if (messages.length && messages[messages.length - 1].role === m.role) messages[messages.length - 1].content += '\n' + m.content; else messages.push(m); });
    if (messages[0].role !== 'user') messages.shift();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: sistem(sisi, b.landasan), cache_control: { type: 'ephemeral' } }],
      messages,
      output_config: { effort: 'low' }
    });
    if (response.stop_reason === 'refusal') return res.json({ jawab: 'Maaf, pertanyaan ini tidak bisa saya jawab di sini. Tekan "Hubungkan ke tim EXOCLEAN".', layar: null, labelAksi: null });
    const teks = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    let hasil;
    try { hasil = JSON.parse(teks.replace(/^```json\s*|```\s*$/g, '')); } catch (e) { hasil = { jawab: teks, layar: null, labelAksi: null }; }
    return res.json({ jawab: String(hasil.jawab || teks).slice(0, 1200), layar: hasil.layar || null, labelAksi: hasil.labelAksi || null, model: MODEL });
  } catch (e) {
    const status = e && e.status ? e.status : 502;
    console.error('[cs] gagal', e && e.message);
    return res.status(status === 429 ? 429 : 502).json({ error: status === 429 ? 'AI sedang sibuk, coba lagi sebentar.' : 'AI tidak tersedia; memakai jawaban lokal.' });
  }
});

const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN cs-server', PORT, ALAMAT) + ' · mode ' + (SIMULASI ? 'SIMULASI (' + (!Anthropic ? 'paket @anthropic-ai/sdk belum terpasang' : 'ANTHROPIC_API_KEY kosong') + ')' : 'Claude ' + MODEL));
});
