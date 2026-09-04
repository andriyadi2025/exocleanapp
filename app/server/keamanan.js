/* ==========================================================================
   keamanan.js — lapisan keamanan bersama untuk semua server pendamping
   --------------------------------------------------------------------------
   Dipakai payment-server.js, auth-server.js, dan posisi-server.js supaya
   aturan yang sama berlaku di ketiganya, bukan diulang (dan dilupakan) di
   masing-masing berkas:

     · kepala()        — header pengaman: nosniff, no-frame, no-referrer,
                         no-store, CSP "default-src 'none'" untuk balasan JSON,
                         HSTS bila permintaannya lewat HTTPS.
     · cors(daftar)    — hanya asal yang terdaftar; '*' DITOLAK dan dilaporkan.
     · batasLaju(...)  — pembatas laju per alamat IP (jendela geser di memori).
     · wajibJson()     — POST harus berbadan JSON: menutup CSRF lewat <form>.
     · catat()         — log ringkas per permintaan tanpa badan dan tanpa PII
                         (IP disamarkan oktet terakhirnya).
     · samaAman()      — bandingkan rahasia tanpa membocorkan waktu.
     · tokenAcak()     — token kriptografis untuk per-transaksi/per-pesanan.
     · verifikasiTurnstile() — cek captcha Cloudflare di sisi server.
     · pasangDasar(app, env) — memasang semuanya sekaligus di satu baris.

   Yang sengaja TIDAK dilakukan di sini: TLS (lihat tls.js) dan autentikasi
   pengguna (OTP di auth-server). Pembatas laju di memori cukup untuk satu
   proses; bila server dijalankan lebih dari satu salinan, pindahkan ke Redis
   — antarmukanya sama.
   ========================================================================== */
'use strict';
const crypto = require('crypto');

/* ------------------------------------------------------------ pembantu */
function samaAman(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}
function tokenAcak(byte) { return crypto.randomBytes(byte || 24).toString('base64url'); }
function hashToken(t) { return crypto.createHash('sha256').update(String(t || '')).digest('hex'); }
function ipKlien(req) { return req.ip || (req.socket && req.socket.remoteAddress) || '0.0.0.0'; }
/** 203.0.113.42 → 203.0.113.x · 2001:db8::1 → 2001:db8::x */
function samarIp(ip) {
  const s = String(ip || '').replace(/^::ffff:/, '');
  if (s.indexOf('.') > 0) return s.replace(/\.\d+$/, '.x');
  const i = s.lastIndexOf(':'); return i > 0 ? s.slice(0, i) + ':x' : s;
}
function batasiTeks(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n); }
const POLA_ORDER = /^[A-Za-z0-9._\-\/]{4,60}$/;
function orderIdSah(id) { return POLA_ORDER.test(String(id || '')); }

/* ------------------------------------------------------------ header */
function kepala() {
  return function (req, res, next) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    const aman = req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
    if (aman) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

/* ------------------------------------------------------------ CORS */
function daftarAsal(env) {
  const raw = String((env || process.env).ALLOWED_ORIGINS || 'http://localhost:8080');
  const daftar = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const bersih = daftar.filter((a) => a !== '*');
  if (bersih.length !== daftar.length) console.warn('[keamanan] ALLOWED_ORIGINS memuat "*" — diabaikan; sebutkan asal aplikasi satu per satu.');
  return bersih;
}
function cors(daftar) {
  return function (req, res, next) {
    const origin = req.headers.origin;
    if (origin && daftar.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Exo-Token');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

/* ------------------------------------------------------------ pembatas laju
   Jendela geser sederhana: per kunci (bawaan: IP) simpan cap waktu
   permintaan dalam jendela; lebih dari `maks` → 429 + Retry-After. */
const semuaEmber = [];
function batasLaju(o) {
  const jendela = (o.jendelaDetik || 60) * 1000, maks = o.maks || 60;
  const ember = new Map(); semuaEmber.push({ ember, jendela });
  const kunciDari = o.kunci || ((req) => ipKlien(req));
  return function (req, res, next) {
    const k = kunciDari(req); if (k == null) return next();
    const now = Date.now();
    const daftar = (ember.get(k) || []).filter((t) => now - t < jendela);
    if (daftar.length >= maks) {
      const tunggu = Math.ceil((jendela - (now - daftar[0])) / 1000);
      res.setHeader('Retry-After', String(tunggu));
      return res.status(429).json({ error: o.pesan || ('Terlalu banyak permintaan. Coba lagi dalam ' + tunggu + ' detik.'), retryAfter: tunggu });
    }
    daftar.push(now); ember.set(k, daftar);
    next();
  };
}
/* buang ember yang sudah kosong tiap 5 menit supaya memori tidak tumbuh */
setInterval(() => {
  const now = Date.now();
  semuaEmber.forEach(({ ember, jendela }) => { for (const [k, v] of ember) if (!v.length || now - v[v.length - 1] > jendela) ember.delete(k); });
}, 300000).unref();

/* ------------------------------------------------------------ badan */
function wajibJson() {
  return function (req, res, next) {
    if (req.method === 'POST' && !req.is('application/json')) return res.status(415).json({ error: 'Kirim badan permintaan sebagai application/json' });
    next();
  };
}

/* ------------------------------------------------------------ log */
function catat(nama) {
  return function (req, res, next) {
    if (/\/health$/.test(req.path)) return next();
    const mulai = Date.now();
    res.on('finish', () => {
      console.log(`${new Date().toISOString()} [${nama}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - mulai}ms ${samarIp(ipKlien(req))}`);
    });
    next();
  };
}

/* ------------------------------------------------------------ Turnstile */
async function verifikasiTurnstile(secret, token, ip) {
  if (!secret) return true;                       /* tidak dikonfigurasi = tidak dipakai */
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: String(token).slice(0, 2048), remoteip: ip })
    });
    const j = await r.json();
    return !!j.success;
  } catch (e) { console.warn('[turnstile] gagal menghubungi Cloudflare:', e.message); return false; }
}

/* ------------------------------------------------------------ pasang */
function pasangDasar(app, env, nama) {
  env = env || process.env;
  /* Di belakang reverse proxy (nginx/Caddy) alamat klien ada di X-Forwarded-For;
     tanpa ini pembatas laju menghitung seluruh dunia sebagai satu IP proxy. */
  app.set('trust proxy', env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true' ? 1 : false);
  app.disable('x-powered-by');
  const asal = daftarAsal(env);
  app.use(kepala());
  app.use(cors(asal));
  app.use(catat(nama || 'server'));
  app.use(batasLaju({ jendelaDetik: 60, maks: Number(env.LAJU_UMUM_PER_MENIT || 300) }));
  app.use(wajibJson());
  return asal;
}

module.exports = { samaAman, tokenAcak, hashToken, ipKlien, samarIp, batasiTeks, orderIdSah, kepala, cors, daftarAsal, batasLaju, wajibJson, catat, verifikasiTurnstile, pasangDasar };
