/* ============================================================================
 *  EXOCLEAN — server autentikasi (Google, Facebook & OTP)
 *  ---------------------------------------------------------------------------
 *  Inilah bagian yang TIDAK BISA dijalankan di browser:
 *
 *    • Verifikasi id_token Google wajib memeriksa TANDA TANGAN token terhadap
 *      kunci publik Google. Menguraikan JWT di browser tanpa memeriksa tanda
 *      tangannya sama sekali tidak aman — siapa pun bisa mengarang token
 *      berisi email orang lain.
 *    • Verifikasi access_token Facebook butuh App Secret. Menaruh App Secret
 *      di browser sama dengan mengumumkannya ke publik.
 *    • Pengiriman OTP butuh kredensial gateway SMS/WhatsApp dan SMTP.
 *    • Kode OTP tidak boleh dikirim ke browser. Ia hanya boleh ada di server
 *      dan di ponsel/inbox penerimanya.
 *
 *  Endpoint yang dipanggil aplikasi EXOCLEAN:
 *    GET  /api/auth/health        → cek koneksi (tombol "Uji koneksi")
 *    POST /api/auth/google        → tukar id_token  → profil terpercaya
 *    POST /api/auth/facebook      → tukar access_token → profil terpercaya
 *    POST /api/auth/otp/kirim     → kirim OTP ke email atau nomor HP
 *    POST /api/auth/otp/periksa   → periksa OTP, balikan { ok: true } saja
 *
 *  Menjalankan:
 *      npm install
 *      cp .env.example .env      # lalu isi kunci-kuncinya
 *      npm run start:auth
 *
 *  CATATAN PENYIMPANAN
 *  Contoh ini menyimpan OTP di memori supaya bisa langsung dicoba. Untuk
 *  produksi, ganti isi blok "PENYIMPANAN OTP" dengan Redis (punya TTL bawaan,
 *  paling cocok) atau tabel database — sisanya tidak perlu diubah.
 * ========================================================================== */

'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const KEAMANAN = require('./keamanan');
const SESI = require('./sesi');
const DUA = require('./duafaktor');
let QR = null; try { QR = require('qrcode'); } catch (e) { QR = null; }
/* Sesi bertanda tangan diterbitkan setelah OTP/login sosial berhasil (sesi.js).
   Tanpa SESI_SECRET server tetap jalan untuk OTP, tetapi tidak menerbitkan sesi —
   server data/brankas menolak semua permintaan sampai rahasia diisi. */
let RAHASIA_SESI = null;
try { RAHASIA_SESI = SESI.rahasiaDari(process.env); } catch (e) { console.warn('[auth] ' + e.message + ' — sesi tidak diterbitkan'); }
const ADMIN_TELP = new Set(String(process.env.ADMIN_TELP || '').split(',').map((t) => t.trim()).filter(Boolean).map((t) => bakuTelp(t)));
const SISI_SAH = ['klien', 'mitra', 'toko'];
function sesiUntuk(jenis, identitas, sisiDiminta) {
  if (!RAHASIA_SESI || !identitas) return {};
  let sisi = SISI_SAH.indexOf(sisiDiminta) >= 0 ? sisiDiminta : 'klien';
  if (sisiDiminta === 'admin') { if (jenis === 'telp' && ADMIN_TELP.has(identitas)) sisi = 'admin'; else return { sesiDitolak: 'nomor ini bukan admin terdaftar (ADMIN_TELP)' }; }
  const sub = SESI.subDari(RAHASIA_SESI, jenis, identitas);
  /* Akun ber-2FA: OTP saja belum cukup — beri sesi sementara (5 menit, klaim tahap:'2fa') yang ditolak semua server lain sampai diselesaikan lewat /api/auth/2fa/verifikasi atau passkey. */
  const d2 = duaBaca()[sub];
  if (d2 && d2.aktif) return { perlu2fa: true, sesiSementara: SESI.terbitkan(RAHASIA_SESI, { sub, sisi, tahap: '2fa' }, { detik: 300 }), metode: { totp: !!(d2.totp && d2.totp.aktif), passkey: (d2.passkeys || []).length > 0 }, sub, sisi };
  return { sesi: SESI.terbitkan(RAHASIA_SESI, { sub, sisi }, { detik: Number(process.env.SESI_DETIK || 12 * 3600) }), sub, sisi };
}
const DUA_BERKAS = process.env.DUA_BERKAS || path.join(__dirname, 'data', '2fa.json');
function duaBaca() { try { return JSON.parse(fs.readFileSync(DUA_BERKAS, 'utf8')); } catch (e) { return {}; } }
function duaTulis(o) { fs.mkdirSync(path.dirname(DUA_BERKAS), { recursive: true, mode: 0o700 }); fs.writeFileSync(DUA_BERKAS, JSON.stringify(o), { mode: 0o600 }); }
const app = express();
const PORT = process.env.AUTH_PORT || 4100;

app.use(express.json({ limit: '256kb' }));

/* ---------------------------------------------------------------- KEAMANAN
   Header pengaman, CORS ketat, POST wajib JSON, log tanpa PII (keamanan.js).
   Pembatas laju PER ALAMAT IP melengkapi batas per nomor tujuan yang sudah ada:
   tanpa ini satu penyerang bisa memakai satu IP untuk membanjiri ribuan nomor
   berbeda (SMS pumping) tanpa pernah menyentuh batas per nomor. */
const ALLOWED = KEAMANAN.pasangDasar(app, process.env, 'auth');
const lajuKirimIp = KEAMANAN.batasLaju({ jendelaDetik: 3600, maks: Number(process.env.LAJU_OTP_KIRIM_PER_JAM_IP || 10), pesan: 'Batas permintaan kode dari alamat ini tercapai. Coba lagi nanti.' });
const lajuPeriksaIp = KEAMANAN.batasLaju({ jendelaDetik: 600, maks: Number(process.env.LAJU_OTP_PERIKSA_10MENIT_IP || 30) });
const lajuSosial = KEAMANAN.batasLaju({ jendelaDetik: 600, maks: 30 });
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';

/* ================================================================ KONFIGURASI */
const CFG = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',

  otpTtlDetik: Number(process.env.OTP_TTL_DETIK || 300),
  otpJedaDetik: Number(process.env.OTP_JEDA_DETIK || 60),
  otpMaksSalah: Number(process.env.OTP_MAKS_SALAH || 5),
  otpMaksPerJam: Number(process.env.OTP_MAKS_PER_JAM || 5),

  smsProvider: (process.env.SMS_PROVIDER || 'log').toLowerCase(),
  smsApiKey: process.env.SMS_API_KEY || '',
  smsSender: process.env.SMS_SENDER || 'EXOCLEAN',

  emailProvider: (process.env.EMAIL_PROVIDER || 'log').toLowerCase(),
  emailApiKey: process.env.EMAIL_API_KEY || '',
  emailDari: process.env.EMAIL_DARI || 'EXOCLEAN <no-reply@exoclean.id>'
};

function wajib(nilai, nama) {
  if (!nilai) throw new Error('Konfigurasi ' + nama + ' belum diisi di .env');
  return nilai;
}

/* ================================================================ UTIL */
function bakuTelp(t) {
  let s = String(t || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (!s.startsWith('62') && s.length >= 9) s = '62' + s;
  return s;
}
function bakuEmail(e) { return String(e || '').trim().toLowerCase(); }

/** Bandingkan dua string tanpa membocorkan posisi karakter yang berbeda. */
function samaAman(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/* ================================================================ VERIFIKASI GOOGLE
   Kunci publik Google berganti berkala, jadi diambil dari endpoint JWKS-nya
   dan disimpan sementara sesuai header Cache-Control. */
let jwksCache = { kunci: null, sampai: 0 };

async function kunciGoogle() {
  if (jwksCache.kunci && Date.now() < jwksCache.sampai) return jwksCache.kunci;
  const r = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!r.ok) throw new Error('Gagal mengambil kunci publik Google');
  const body = await r.json();
  const cc = r.headers.get('cache-control') || '';
  const maxAge = Number((cc.match(/max-age=(\d+)/) || [])[1] || 3600);
  jwksCache = { kunci: body.keys, sampai: Date.now() + maxAge * 1000 };
  return body.keys;
}

function b64urlBuf(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function b64urlJson(s) { return JSON.parse(b64urlBuf(s).toString('utf8')); }

/**
 * Verifikasi id_token Google secara lengkap:
 * tanda tangan RS256 → penerbit → audience → masa berlaku → email terverifikasi.
 * Melewatkan salah satu langkah ini membuat seluruh pemeriksaan tidak berarti.
 */
async function verifikasiGoogle(idToken) {
  wajib(CFG.googleClientId, 'GOOGLE_CLIENT_ID');

  const bagian = String(idToken || '').split('.');
  if (bagian.length !== 3) throw new Error('Format id_token tidak sah');
  const [h64, p64, s64] = bagian;

  const header = b64urlJson(h64);
  const payload = b64urlJson(p64);
  if (header.alg !== 'RS256') throw new Error('Algoritma token tidak didukung');

  const keys = await kunciGoogle();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Kunci penanda tangan tidak dikenal');

  const pub = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const sah = crypto.verify(
    'RSA-SHA256',
    Buffer.from(h64 + '.' + p64),
    pub,
    b64urlBuf(s64)
  );
  if (!sah) throw new Error('Tanda tangan token tidak sah');

  const iss = payload.iss || '';
  if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
    throw new Error('Penerbit token bukan Google');
  }
  if (payload.aud !== CFG.googleClientId) {
    throw new Error('Token diterbitkan untuk aplikasi lain');
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token sudah kedaluwarsa');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('Token belum berlaku');
  if (payload.email_verified === false) {
    throw new Error('Email pada akun Google tersebut belum diverifikasi');
  }

  return {
    provider: 'google',
    uid: payload.sub,
    email: bakuEmail(payload.email),
    nama: payload.name || '',
    foto: payload.picture || null
  };
}

/* ================================================================ VERIFIKASI FACEBOOK
   Dua panggilan yang keduanya wajib:
     1. /debug_token — memastikan token memang untuk App ID kita dan masih hidup
     2. /me          — mengambil profilnya
   Melewatkan langkah 1 berarti menerima token milik aplikasi lain. */
async function verifikasiFacebook(accessToken) {
  wajib(CFG.facebookAppId, 'FACEBOOK_APP_ID');
  wajib(CFG.facebookAppSecret, 'FACEBOOK_APP_SECRET');

  const appToken = CFG.facebookAppId + '|' + CFG.facebookAppSecret;
  const dbg = await fetch(
    'https://graph.facebook.com/debug_token?input_token=' +
      encodeURIComponent(accessToken) + '&access_token=' + encodeURIComponent(appToken)
  );
  const dbgBody = await dbg.json();
  const d = dbgBody && dbgBody.data;
  if (!dbg.ok || !d) throw new Error('Facebook menolak memeriksa token');
  if (!d.is_valid) throw new Error('Token Facebook tidak sah');
  if (String(d.app_id) !== String(CFG.facebookAppId)) {
    throw new Error('Token diterbitkan untuk aplikasi lain');
  }
  if (d.expires_at && d.expires_at * 1000 < Date.now()) {
    throw new Error('Token Facebook sudah kedaluwarsa');
  }

  /* appsecret_proof menutup celah token curian dipakai dari tempat lain */
  const proof = crypto.createHmac('sha256', CFG.facebookAppSecret)
    .update(accessToken).digest('hex');

  const me = await fetch(
    'https://graph.facebook.com/v19.0/me?fields=id,name,email,picture' +
      '&access_token=' + encodeURIComponent(accessToken) +
      '&appsecret_proof=' + proof
  );
  const p = await me.json();
  if (!me.ok || !p.id) throw new Error('Gagal mengambil profil Facebook');
  if (!p.email) {
    throw new Error('Akun Facebook tersebut tidak membagikan email. ' +
      'Minta pengguna mendaftar dengan email atau Google.');
  }

  return {
    provider: 'facebook',
    uid: p.id,
    email: bakuEmail(p.email),
    nama: p.name || '',
    foto: (p.picture && p.picture.data && p.picture.data.url) || null
  };
}

/* ================================================================ PENYIMPANAN OTP
   Ganti isi blok ini dengan Redis untuk produksi. Bentuk datanya sudah sesuai:
   satu kunci per tujuan, dengan TTL. */
const otpStore = new Map();      /* kunci → { hash, garam, kedaluwarsa, percobaan, kirimAt } */
const kirimLog = new Map();      /* kunci → [timestamp, …] untuk batas per jam */

function kunciOtp(jenis, tujuan) { return jenis + ':' + tujuan; }

function bersihkanKedaluwarsa() {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.kedaluwarsa < now) otpStore.delete(k);
}
setInterval(bersihkanKedaluwarsa, 60000).unref();

function turunkanKode(kode, garamHex) {
  const garam = garamHex ? Buffer.from(garamHex, 'hex') : crypto.randomBytes(12);
  const hash = crypto.pbkdf2Sync(String(kode), garam, 100000, 32, 'sha256');
  return { garam: garam.toString('hex'), hash: hash.toString('hex') };
}

/* ================================================================ PENGIRIMAN
   Dua penyedia contoh per kanal. Menambah penyedia lain cukup menambah cabang
   di sini — pemanggilnya tidak berubah. */
async function kirimSms(tujuan, pesan) {
  if (CFG.smsProvider === 'log') {
    console.log('[SMS→' + tujuan + '] ' + pesan);
    return { terkirim: true, via: 'log' };
  }
  if (CFG.smsProvider === 'fonnte') {
    /* Fonnte — gateway WhatsApp yang lazim dipakai di Indonesia */
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: wajib(CFG.smsApiKey, 'SMS_API_KEY'),
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: tujuan, message: pesan })
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok || b.status === false) throw new Error(b.reason || 'Gateway WhatsApp menolak');
    return { terkirim: true, via: 'fonnte' };
  }
  if (CFG.smsProvider === 'twilio') {
    const sid = wajib(process.env.TWILIO_SID, 'TWILIO_SID');
    const auth = Buffer.from(sid + ':' + wajib(CFG.smsApiKey, 'SMS_API_KEY')).toString('base64');
    const form = new URLSearchParams({
      To: '+' + tujuan, From: CFG.smsSender, Body: pesan
    });
    const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth,
                 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    if (!r.ok) throw new Error('Twilio menolak: ' + r.status);
    return { terkirim: true, via: 'twilio' };
  }
  throw new Error('SMS_PROVIDER "' + CFG.smsProvider + '" tidak dikenal');
}

async function kirimEmail(tujuan, subjek, teks) {
  if (CFG.emailProvider === 'log') {
    console.log('[EMAIL→' + tujuan + '] ' + subjek + '\n' + teks);
    return { terkirim: true, via: 'log' };
  }
  if (CFG.emailProvider === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + wajib(CFG.emailApiKey, 'EMAIL_API_KEY'),
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: CFG.emailDari, to: [tujuan], subject: subjek, text: teks })
    });
    if (!r.ok) throw new Error('Resend menolak: ' + r.status);
    return { terkirim: true, via: 'resend' };
  }
  if (CFG.emailProvider === 'sendgrid') {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + wajib(CFG.emailApiKey, 'EMAIL_API_KEY'),
                 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: tujuan }] }],
        from: { email: CFG.emailDari.replace(/.*<|>.*/g, '') },
        subject: subjek,
        content: [{ type: 'text/plain', value: teks }]
      })
    });
    if (!r.ok) throw new Error('SendGrid menolak: ' + r.status);
    return { terkirim: true, via: 'sendgrid' };
  }
  throw new Error('EMAIL_PROVIDER "' + CFG.emailProvider + '" tidak dikenal');
}

/* ================================================================ ENDPOINT */
app.get('/api/auth/health', (req, res) => {
  res.json({
    ok: true,
    waktu: new Date().toISOString(),
    google: !!CFG.googleClientId,
    facebook: !!(CFG.facebookAppId && CFG.facebookAppSecret),
    sms: CFG.smsProvider,
    email: CFG.emailProvider,
    /* Pengingat: 'log' berarti kode hanya tercetak di konsol server, bukan
       benar-benar terkirim. Aman untuk uji coba, tidak untuk produksi. */
    siapProduksi: CFG.smsProvider !== 'log' && CFG.emailProvider !== 'log'
  });
});

app.post('/api/auth/google', lajuSosial, async (req, res) => {
  try {
    const profil = await verifikasiGoogle(req.body && req.body.token);
    res.json(Object.assign({}, profil, sesiUntuk('email', bakuEmail(profil.email), req.body && req.body.sisi)));
  } catch (e) {
    console.error('[google]', e.message);
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/auth/facebook', lajuSosial, async (req, res) => {
  try {
    const profil = await verifikasiFacebook(req.body && req.body.token);
    res.json(Object.assign({}, profil, sesiUntuk('email', bakuEmail(profil.email), req.body && req.body.sisi)));
  } catch (e) {
    console.error('[facebook]', e.message);
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/auth/otp/kirim', lajuKirimIp, async (req, res) => {
  try {
    const jenis = req.body && req.body.jenis;
    if (jenis !== 'email' && jenis !== 'telp') {
      return res.status(400).json({ error: 'jenis harus "email" atau "telp"' });
    }
    /* Captcha diverifikasi DI SERVER bila TURNSTILE_SECRET_KEY diisi — token
       yang hanya dicek keberadaannya di klien tidak membuktikan apa pun. */
    if (TURNSTILE_SECRET && !(await KEAMANAN.verifikasiTurnstile(TURNSTILE_SECRET, req.body.captcha, KEAMANAN.ipKlien(req)))) {
      return res.status(403).json({ error: 'Verifikasi captcha gagal. Muat ulang halaman lalu coba lagi.' });
    }
    const tujuan = jenis === 'email' ? bakuEmail(req.body.tujuan) : bakuTelp(req.body.tujuan);
    if (jenis === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(tujuan)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }
    if (jenis === 'telp' && !/^62[1-9]\d{7,12}$/.test(tujuan)) {
      return res.status(400).json({ error: 'Nomor HP tidak valid' });
    }

    const kunci = kunciOtp(jenis, tujuan);
    const now = Date.now();

    /* jeda antar-pengiriman */
    const ada = otpStore.get(kunci);
    if (ada && now - ada.kirimAt < CFG.otpJedaDetik * 1000) {
      const sisa = Math.ceil((CFG.otpJedaDetik * 1000 - (now - ada.kirimAt)) / 1000);
      return res.status(429).json({ error: 'Tunggu ' + sisa + ' detik', jeda: sisa });
    }

    /* batas per jam — menahan penyalahgunaan untuk membanjiri nomor orang lain */
    const jejak = (kirimLog.get(kunci) || []).filter((t) => now - t < 3600000);
    if (jejak.length >= CFG.otpMaksPerJam) {
      return res.status(429).json({ error: 'Batas permintaan kode per jam tercapai' });
    }
    jejak.push(now);
    kirimLog.set(kunci, jejak);

    /* kode acak kriptografis — bukan Math.random */
    const kode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const t = turunkanKode(kode);
    otpStore.set(kunci, {
      garam: t.garam, hash: t.hash,
      kedaluwarsa: now + CFG.otpTtlDetik * 1000,
      percobaan: 0, kirimAt: now
    });

    const menit = Math.round(CFG.otpTtlDetik / 60);
    const pesan = 'Kode verifikasi EXOCLEAN Anda: ' + kode + '\n\n' +
      'Berlaku ' + menit + ' menit. Jangan berikan kode ini kepada siapa pun — ' +
      'termasuk yang mengaku petugas EXOCLEAN.';

    const hasil = jenis === 'email'
      ? await kirimEmail(tujuan, 'Kode verifikasi EXOCLEAN', pesan)
      : await kirimSms(tujuan, pesan);

    /* Kodenya TIDAK PERNAH dikembalikan ke browser. */
    res.json({ ok: true, berlakuDetik: CFG.otpTtlDetik, jedaDetik: CFG.otpJedaDetik,
               via: hasil.via });
  } catch (e) {
    /* Pesan penyedia (SendGrid/Twilio) dicatat di server saja — ke klien cukup
       pesan umum supaya nama penyedia dan detail konfigurasi tidak bocor. */
    console.error('[otp/kirim]', e.message);
    res.status(500).json({ error: 'Gagal mengirim kode. Coba lagi beberapa saat lagi.' });
  }
});

app.post('/api/auth/otp/periksa', lajuPeriksaIp, (req, res) => {
  const jenis = req.body && req.body.jenis;
  const tujuan = jenis === 'email' ? bakuEmail(req.body.tujuan) : bakuTelp(req.body.tujuan);
  const kode = String((req.body && req.body.kode) || '').replace(/\D/g, '');
  const kunci = kunciOtp(jenis, tujuan);
  const rec = otpStore.get(kunci);

  if (!rec || rec.kedaluwarsa < Date.now()) {
    otpStore.delete(kunci);
    return res.status(400).json({ error: 'Kode sudah kedaluwarsa. Minta kode baru.' });
  }
  if (rec.percobaan >= CFG.otpMaksSalah) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Minta kode baru.' });
  }
  if (kode.length !== 6) return res.status(400).json({ error: 'Kode harus 6 angka' });

  const uji = turunkanKode(kode, rec.garam);
  if (samaAman(uji.hash, rec.hash)) {
    otpStore.delete(kunci);                    /* sekali pakai */
    return res.json(Object.assign({ ok: true }, sesiUntuk(jenis === 'email' ? 'email' : 'telp', tujuan, req.body && req.body.sisi)));
  }

  /* Angka dibaca dulu, baru disimpan — supaya hitungan sisa tidak meleset. */
  const terpakai = rec.percobaan + 1;
  rec.percobaan = terpakai;
  otpStore.set(kunci, rec);
  const sisa = Math.max(0, CFG.otpMaksSalah - terpakai);
  res.status(400).json({
    error: 'Kode salah.' + (sisa > 0 ? ' Sisa ' + sisa + ' percobaan.' : ' Minta kode baru.'),
    sisa
  });
});

/* ================================================================ DUA LANGKAH (2FA)
   TOTP (aplikasi autentikator) & passkey (WebAuthn) untuk semua pengguna, dicek di
   server. Rahasia TOTP terenkripsi (duafaktor.segel). Tantangan passkey disimpan di
   memori 5 menit per sub. RP id = DUA_RP_ID (bawaan host pertama ALLOWED_ORIGINS). */
const DUA_RP_ID = process.env.DUA_RP_ID || (() => { try { return new URL(ALLOWED[0] || 'http://localhost').hostname; } catch (e) { return 'localhost'; } })();
const duaTantangan = new Map();   /* sub:jenis → { tantangan, sampai } */
const wajibSesi2fa = SESI.wajibDariEnv(process.env), lajuDua = KEAMANAN.batasLaju({ jendelaDetik: 600, maks: 30, kunci: (req) => (req.sesi && req.sesi.sub) || KEAMANAN.ipKlien(req) });
function duaRek(sub) { const semua = duaBaca(); return { semua, rek: semua[sub] || { aktif: false, totp: null, passkeys: [], pemulihan: [] } }; }
function duaSimpan(semua, sub, rek) { rek.aktif = !!((rek.totp && rek.totp.aktif) || (rek.passkeys && rek.passkeys.length)); semua[sub] = rek; duaTulis(semua); return rek; }
function duaStatus(rek) { return { aktif: !!rek.aktif, totp: rek.totp && rek.totp.aktif ? { dibuatAt: rek.totp.dibuatAt } : null, passkeys: (rek.passkeys || []).map((p) => ({ id: p.id, nama: p.nama, dibuatAt: p.dibuatAt, terakhirAt: p.terakhirAt || null })), pemulihanSisa: (rek.pemulihan || []).filter((h) => !h.dipakaiAt).length }; }
/* kode autentikator ATAU kode pemulihan yang masih berlaku → true (dan mencatat pemakaian) */
function duaCekKode(semua, sub, rek, kode) { kode = String(kode || '').trim(); if (rek.totp && rek.totp.aktif && /^\d{6}$/.test(kode)) { const l = DUA.totpVerifikasi(DUA.buka(RAHASIA_SESI, rek.totp.rahasia), kode, rek.totp.langkahTerakhir); if (l >= 0) { rek.totp.langkahTerakhir = l; duaSimpan(semua, sub, rek); return true; } } const h = DUA.pemulihanHash(kode); const p = (rek.pemulihan || []).find((x) => !x.dipakaiAt && x.hash === h); if (p) { p.dipakaiAt = new Date().toISOString(); duaSimpan(semua, sub, rek); return true; } return false; }
function sesiPenuh(klaim) { return SESI.terbitkan(RAHASIA_SESI, { sub: klaim.sub, sisi: klaim.sisi }, { detik: Number(process.env.SESI_DETIK || 12 * 3600) }); }
function sesiSementaraDari(req, res) { const t = String((req.body || {}).sesiSementara || ''); const v = RAHASIA_SESI ? SESI.verifikasi(RAHASIA_SESI, t) : { ok: false, sebab: 'rahasia' }; if (!v.ok || v.klaim.tahap !== '2fa') { res.status(401).json({ error: 'Sesi sementara tidak sah atau kedaluwarsa — ulangi OTP.' }); return null; } return v.klaim; }
function pemulihanBaru(rek) { const kode = DUA.pemulihanBuat(8); rek.pemulihan = kode.map((k) => ({ hash: DUA.pemulihanHash(k), dibuatAt: new Date().toISOString() })); return kode; }
app.post('/api/auth/2fa/status', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); res.json(Object.assign({ ok: true, rpId: DUA_RP_ID, passkeyDidukung: true }, duaStatus(duaRek(req.sesi.sub).rek))); });
app.post('/api/auth/2fa/totp/daftar', wajibSesi2fa, lajuDua, async (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const { semua, rek } = duaRek(req.sesi.sub); if (rek.totp && rek.totp.aktif) return res.status(409).json({ error: 'Autentikator sudah terpasang. Nonaktifkan dulu untuk mengganti.' }); const rahasia = DUA.totpBuatRahasia(), akun = req.sesi.sisi + '-' + req.sesi.sub.slice(0, 8), uri = DUA.totpUri(rahasia, akun, 'EXOCLEAN'); rek.totp = { rahasia: DUA.segel(RAHASIA_SESI, rahasia), aktif: false, dibuatAt: new Date().toISOString() }; duaSimpan(semua, req.sesi.sub, rek); let qrSvg = ''; if (QR) { try { qrSvg = await QR.toString(uri, { type: 'svg', margin: 1, width: 200 }); } catch (e) { qrSvg = ''; } } res.json({ ok: true, rahasia, uri, qrSvg, akun }); });
app.post('/api/auth/2fa/totp/aktifkan', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const { semua, rek } = duaRek(req.sesi.sub); if (!rek.totp) return res.status(400).json({ error: 'Mulai pendaftaran dulu.' }); if (rek.totp.aktif) return res.status(409).json({ error: 'Sudah aktif.' }); const l = DUA.totpVerifikasi(DUA.buka(RAHASIA_SESI, rek.totp.rahasia), (req.body || {}).kode, null); if (l < 0) return res.status(400).json({ error: 'Kode salah. Pastikan jam ponsel akurat dan coba kode berikutnya.' }); rek.totp.aktif = true; rek.totp.langkahTerakhir = l; const kode = (rek.pemulihan || []).some((x) => !x.dipakaiAt) ? null : pemulihanBaru(rek); duaSimpan(semua, req.sesi.sub, rek); console.log('[2fa] TOTP aktif · ' + req.sesi.sub.slice(0, 8)); res.json({ ok: true, pemulihan: kode }); });
app.post('/api/auth/2fa/passkey/tantangan', lajuDua, (req, res) => { const b = req.body || {}; let klaim; if (b.jenis === 'masuk') { klaim = sesiSementaraDari(req, res); if (!klaim) return; } else { const auth = String(req.headers.authorization || ''); const v = RAHASIA_SESI && auth.startsWith('Bearer ') ? SESI.verifikasi(RAHASIA_SESI, auth.slice(7)) : { ok: false }; if (!v.ok || v.klaim.tahap) return res.status(401).json({ error: 'Perlu sesi.' }); klaim = v.klaim; } const rek = duaRek(klaim.sub).rek; const tantangan = crypto.randomBytes(32).toString('base64url'); duaTantangan.set(klaim.sub + ':' + (b.jenis === 'masuk' ? 'masuk' : 'daftar'), { tantangan, sampai: Date.now() + 300000 }); res.json({ ok: true, tantangan, rpId: DUA_RP_ID, userId: Buffer.from(klaim.sub).toString('base64url'), userName: klaim.sisi + '-' + klaim.sub.slice(0, 8), sudahAda: (rek.passkeys || []).map((p) => p.id), izinkan: (rek.passkeys || []).map((p) => p.id) }); });
app.post('/api/auth/2fa/passkey/daftar', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const t = duaTantangan.get(req.sesi.sub + ':daftar'); duaTantangan.delete(req.sesi.sub + ':daftar'); if (!t || t.sampai < Date.now()) return res.status(400).json({ error: 'Tantangan kedaluwarsa — ulangi.' }); try { const r = DUA.passkeyDaftar((req.body || {}).kredensial, t.tantangan, DUA_RP_ID, ALLOWED); const { semua, rek } = duaRek(req.sesi.sub); if ((rek.passkeys || []).some((p) => p.id === r.id)) return res.status(409).json({ error: 'Passkey ini sudah terdaftar.' }); rek.passkeys = (rek.passkeys || []).concat([{ id: r.id, jwk: r.jwk, counter: r.counter, nama: KEAMANAN.batasiTeks((req.body || {}).nama, 40) || 'Passkey', dibuatAt: new Date().toISOString() }]); const kode = (rek.pemulihan || []).some((x) => !x.dipakaiAt) ? null : pemulihanBaru(rek); duaSimpan(semua, req.sesi.sub, rek); console.log('[2fa] passkey terdaftar · ' + req.sesi.sub.slice(0, 8)); res.json({ ok: true, id: r.id, pemulihan: kode }); } catch (e) { res.status(400).json({ error: 'Passkey ditolak: ' + e.message }); } });
app.post('/api/auth/2fa/passkey/hapus', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const { semua, rek } = duaRek(req.sesi.sub); const id = String((req.body || {}).id || ''); rek.passkeys = (rek.passkeys || []).filter((p) => p.id !== id); duaSimpan(semua, req.sesi.sub, rek); res.json({ ok: true, aktif: rek.aktif }); });
app.post('/api/auth/2fa/verifikasi', lajuDua, (req, res) => { const klaim = sesiSementaraDari(req, res); if (!klaim) return; const { semua, rek } = duaRek(klaim.sub); const b = req.body || {}; if (!duaCekKode(semua, klaim.sub, rek, b.kode || b.pemulihan)) { console.log('[2fa] kode salah · ' + klaim.sub.slice(0, 8)); return res.status(400).json({ error: 'Kode salah atau sudah dipakai.' }); } res.json({ ok: true, sesi: sesiPenuh(klaim), sub: klaim.sub, sisi: klaim.sisi }); });
app.post('/api/auth/2fa/passkey/masuk', lajuDua, (req, res) => { const klaim = sesiSementaraDari(req, res); if (!klaim) return; const t = duaTantangan.get(klaim.sub + ':masuk'); duaTantangan.delete(klaim.sub + ':masuk'); if (!t || t.sampai < Date.now()) return res.status(400).json({ error: 'Tantangan kedaluwarsa — ulangi.' }); const { semua, rek } = duaRek(klaim.sub); const kred = (req.body || {}).kredensial || {}; const p = (rek.passkeys || []).find((x) => x.id === kred.id || x.id === kred.rawId); if (!p) return res.status(400).json({ error: 'Passkey tidak dikenal untuk akun ini.' }); try { const r = DUA.passkeyMasuk(kred, p, t.tantangan, DUA_RP_ID, ALLOWED); p.counter = r.counter; p.terakhirAt = new Date().toISOString(); duaSimpan(semua, klaim.sub, rek); res.json({ ok: true, sesi: sesiPenuh(klaim), sub: klaim.sub, sisi: klaim.sisi }); } catch (e) { res.status(400).json({ error: 'Passkey ditolak: ' + e.message }); } });
app.post('/api/auth/2fa/pemulihan-baru', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const { semua, rek } = duaRek(req.sesi.sub); if (!rek.aktif) return res.status(400).json({ error: 'Dua langkah belum aktif.' }); if (!duaCekKode(semua, req.sesi.sub, rek, (req.body || {}).kode)) return res.status(400).json({ error: 'Kode salah.' }); const kode = pemulihanBaru(rek); duaSimpan(semua, req.sesi.sub, rek); res.json({ ok: true, pemulihan: kode }); });
app.post('/api/auth/2fa/nonaktif', wajibSesi2fa, lajuDua, (req, res) => { if (!req.sesi) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const { semua, rek } = duaRek(req.sesi.sub); if (!rek.aktif) return res.status(400).json({ error: 'Dua langkah belum aktif.' }); if (!duaCekKode(semua, req.sesi.sub, rek, (req.body || {}).kode)) return res.status(400).json({ error: 'Kode salah.' }); duaSimpan(semua, req.sesi.sub, { aktif: false, totp: null, passkeys: [], pemulihan: [] }); console.log('[2fa] dinonaktifkan · ' + req.sesi.sub.slice(0, 8)); res.json({ ok: true }); });

/* ================================================================ PIN TRANSAKSI
   Terpisah dari OTP/sandi. Hash PBKDF2-SHA256 100k per `sub` sesi di data/pin.json
   (di luar repo). Salah 5 kali → terkunci 30 menit. Verifikasi berhasil menerbitkan
   PIN-token 5 menit yang wajib dibawa ke payment/dwi. Reset hanya dengan sesi segar
   (< 10 menit sejak OTP). */
const PIN_BERKAS = process.env.PIN_BERKAS || path.join(__dirname, 'data', 'pin.json'), PIN_MAKS_GAGAL = 5, PIN_KUNCI_MENIT = 30, PIN_TOKEN_DETIK = Number(process.env.PIN_TOKEN_DETIK || 300);
function pinBaca() { try { return JSON.parse(fs.readFileSync(PIN_BERKAS, 'utf8')); } catch (e) { return {}; } }
function pinTulis(o) { fs.mkdirSync(path.dirname(PIN_BERKAS), { recursive: true, mode: 0o700 }); fs.writeFileSync(PIN_BERKAS, JSON.stringify(o), { mode: 0o600 }); }
function pinHash(pin, garam) { return crypto.pbkdf2Sync(String(pin), Buffer.from(garam, 'hex'), 100000, 32, 'sha256').toString('hex'); }
function pinLemah(pin) { pin = String(pin || ''); if (!/^\d{6}$/.test(pin)) return 'PIN harus 6 angka.'; if (/^(\d)\1{5}$/.test(pin)) return 'Jangan pakai angka yang sama semua.'; if ('01234567890'.includes(pin) || '09876543210'.includes(pin)) return 'Jangan pakai angka berurutan.'; if (/^(\d\d)\1\1$/.test(pin) || /^(\d\d\d)\1$/.test(pin)) return 'Pola berulang terlalu mudah ditebak.'; if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d\d$/.test(pin) || /^(19|20)\d\d(0[1-9]|1[0-2])$/.test(pin)) return 'Hindari pola tanggal lahir.'; return null; }
const wajibSesiPin = SESI.wajibDariEnv(process.env), lajuPin = KEAMANAN.batasLaju({ jendelaDetik: 600, maks: 30, kunci: (req) => (req.sesi && req.sesi.sub) || KEAMANAN.ipKlien(req) });
function pinRek(req) { if (!req.sesi) return null; const semua = pinBaca(); return { semua, rek: semua[req.sesi.sub] || null }; }
app.post('/api/auth/pin/status', wajibSesiPin, lajuPin, (req, res) => { const p = pinRek(req); if (!p) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); res.json({ ok: true, ada: !!p.rek, terkunciSampai: p.rek && p.rek.gagal >= PIN_MAKS_GAGAL && p.rek.kunciSampai > Date.now() ? p.rek.kunciSampai : 0, digantiAt: p.rek && p.rek.digantiAt || null }); });
app.post('/api/auth/pin/atur', wajibSesiPin, lajuPin, (req, res) => { const p = pinRek(req); if (!p) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); if (p.rek) return res.status(409).json({ error: 'PIN sudah ada — pakai ganti atau reset.' }); const pin = String((req.body || {}).pin || ''); const l = pinLemah(pin); if (l) return res.status(400).json({ error: l }); const garam = crypto.randomBytes(16).toString('hex'); p.semua[req.sesi.sub] = { garam, hash: pinHash(pin, garam), gagal: 0, kunciSampai: 0, dibuatAt: new Date().toISOString(), digantiAt: new Date().toISOString() }; pinTulis(p.semua); res.json({ ok: true }); });
app.post('/api/auth/pin/verifikasi', wajibSesiPin, lajuPin, (req, res) => { const p = pinRek(req); if (!p) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); if (!p.rek) return res.status(404).json({ error: 'PIN belum dibuat.', belumAda: true }); if (p.rek.gagal >= PIN_MAKS_GAGAL && p.rek.kunciSampai > Date.now()) return res.status(429).json({ error: 'PIN terkunci ' + Math.ceil((p.rek.kunciSampai - Date.now()) / 60000) + ' menit lagi.', terkunciSampai: p.rek.kunciSampai }); const pin = String((req.body || {}).pin || ''); const cocok = /^\d{6}$/.test(pin) && samaAman(pinHash(pin, p.rek.garam), p.rek.hash); if (!cocok) { p.rek.gagal = (p.rek.gagal || 0) + 1; if (p.rek.gagal >= PIN_MAKS_GAGAL) p.rek.kunciSampai = Date.now() + PIN_KUNCI_MENIT * 60000; pinTulis(p.semua); console.log('[pin] salah · ' + req.sesi.sub.slice(0, 8) + ' · ' + p.rek.gagal); return res.status(400).json({ error: p.rek.gagal >= PIN_MAKS_GAGAL ? 'PIN salah 5 kali — terkunci ' + PIN_KUNCI_MENIT + ' menit.' : 'PIN salah. Sisa ' + (PIN_MAKS_GAGAL - p.rek.gagal) + ' percobaan.', sisa: Math.max(0, PIN_MAKS_GAGAL - p.rek.gagal) }); } p.rek.gagal = 0; p.rek.kunciSampai = 0; p.rek.terakhirOk = new Date().toISOString(); pinTulis(p.semua); res.json({ ok: true, pinToken: SESI.terbitkanPinToken(RAHASIA_SESI, req.sesi, PIN_TOKEN_DETIK), berlakuDetik: PIN_TOKEN_DETIK }); });
app.post('/api/auth/pin/ganti', wajibSesiPin, lajuPin, (req, res) => { const p = pinRek(req); if (!p || !p.rek) return res.status(404).json({ error: 'PIN belum dibuat.' }); if (p.rek.gagal >= PIN_MAKS_GAGAL && p.rek.kunciSampai > Date.now()) return res.status(429).json({ error: 'PIN terkunci.' }); const b = req.body || {}; if (!samaAman(pinHash(String(b.lama || ''), p.rek.garam), p.rek.hash)) { p.rek.gagal = (p.rek.gagal || 0) + 1; if (p.rek.gagal >= PIN_MAKS_GAGAL) p.rek.kunciSampai = Date.now() + PIN_KUNCI_MENIT * 60000; pinTulis(p.semua); return res.status(400).json({ error: 'PIN lama salah.' }); } const l = pinLemah(b.baru); if (l) return res.status(400).json({ error: l }); if (String(b.baru) === String(b.lama)) return res.status(400).json({ error: 'PIN baru tidak boleh sama.' }); const garam = crypto.randomBytes(16).toString('hex'); p.semua[req.sesi.sub] = Object.assign(p.rek, { garam, hash: pinHash(String(b.baru), garam), gagal: 0, kunciSampai: 0, digantiAt: new Date().toISOString() }); pinTulis(p.semua); res.json({ ok: true }); });
app.post('/api/auth/pin/reset', wajibSesiPin, lajuPin, (req, res) => { const p = pinRek(req); if (!p) return res.status(503).json({ error: 'SESI_SECRET belum diisi' }); const umur = Math.floor(Date.now() / 1000) - (req.sesi.iat || 0); if (umur > 600) return res.status(403).json({ error: 'Reset PIN butuh OTP baru (sesi harus lebih muda dari 10 menit).', perluOtp: true }); const l = pinLemah((req.body || {}).baru); if (l) return res.status(400).json({ error: l }); const garam = crypto.randomBytes(16).toString('hex'); p.semua[req.sesi.sub] = { garam, hash: pinHash(String(req.body.baru), garam), gagal: 0, kunciSampai: 0, dibuatAt: (p.rek && p.rek.dibuatAt) || new Date().toISOString(), digantiAt: new Date().toISOString(), diresetAt: new Date().toISOString() }; pinTulis(p.semua); console.log('[pin] direset lewat OTP · ' + req.sesi.sub.slice(0, 8)); res.json({ ok: true }); });

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak dikenal' }));

const TLS = require('./tls');
const jadi = TLS.bikinServer(null, app);
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('EXOCLEAN auth-server', PORT, ALAMAT));
  console.log('  Google   : ' + (CFG.googleClientId ? 'siap' : 'GOOGLE_CLIENT_ID belum diisi'));
  console.log('  Facebook : ' + (CFG.facebookAppId && CFG.facebookAppSecret
    ? 'siap' : 'FACEBOOK_APP_ID / SECRET belum diisi'));
  console.log('  SMS      : ' + CFG.smsProvider + (CFG.smsProvider === 'log'
    ? '  (kode hanya tercetak di konsol — belum benar-benar terkirim)' : ''));
  console.log('  Email    : ' + CFG.emailProvider + (CFG.emailProvider === 'log'
    ? '  (kode hanya tercetak di konsol — belum benar-benar terkirim)' : ''));
  console.log('  Sesi     : ' + (RAHASIA_SESI ? 'diterbitkan (HS256, ' + Number(process.env.SESI_DETIK || 43200) / 3600 + ' jam)' + (ADMIN_TELP.size ? ' · admin: ' + ADMIN_TELP.size + ' nomor' : ' · ADMIN_TELP kosong') : 'TIDAK — SESI_SECRET belum diisi'));
  console.log('  Asal yang diizinkan: ' + ALLOWED.join(', '));
});

module.exports = app;
