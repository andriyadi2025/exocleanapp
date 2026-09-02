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
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_PORT || 4100;

app.use(express.json({ limit: '256kb' }));

/* ---------------------------------------------------------------- CORS */
/* Hanya izinkan asal (origin) aplikasi EXOCLEAN Anda. Jangan pakai '*' —
   endpoint ini membuat sesi, jadi asal yang boleh memanggilnya harus jelas. */
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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

app.post('/api/auth/google', async (req, res) => {
  try {
    const profil = await verifikasiGoogle(req.body && req.body.token);
    res.json(profil);
  } catch (e) {
    console.error('[google]', e.message);
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/auth/facebook', async (req, res) => {
  try {
    const profil = await verifikasiFacebook(req.body && req.body.token);
    res.json(profil);
  } catch (e) {
    console.error('[facebook]', e.message);
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/auth/otp/kirim', async (req, res) => {
  try {
    const jenis = req.body && req.body.jenis;
    if (jenis !== 'email' && jenis !== 'telp') {
      return res.status(400).json({ error: 'jenis harus "email" atau "telp"' });
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
    console.error('[otp/kirim]', e.message);
    res.status(500).json({ error: 'Gagal mengirim kode: ' + e.message });
  }
});

app.post('/api/auth/otp/periksa', (req, res) => {
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
    return res.json({ ok: true });
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
  console.log('  Asal yang diizinkan: ' + ALLOWED.join(', '));
});

module.exports = app;
