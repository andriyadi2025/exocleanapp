/* ==========================================================================
 *  sesi.js — sesi pengguna bertanda tangan (dipakai auth-server → server lain)
 * --------------------------------------------------------------------------
 *  Setelah OTP/login sosial berhasil, auth-server menerbitkan token ringkas
 *  (format JWT: header.payload.tanda-tangan, HMAC-SHA256 dengan SESI_SECRET
 *  256-bit). Isi token TIDAK memuat data pribadi: `sub` adalah pseudonim
 *  (HMAC atas nomor/email dengan sub-kunci HKDF), `sisi` = klien/mitra/toko/
 *  admin, `iat`, `exp` (bawaan 12 jam), `jti` acak.
 *
 *  Server lain (data, pay, kirim, dwi, posisi) memverifikasi dengan rahasia
 *  yang sama lewat middleware wajibSesi(): header Authorization: Bearer <token>.
 *  Pembandingan tanda tangan memakai timingSafeEqual.
 * ========================================================================== */
'use strict';
const crypto = require('crypto');

function b64u(buf) { return Buffer.from(buf).toString('base64url'); }
function rahasiaDari(env) {
  const s = String((env || process.env).SESI_SECRET || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(s)) throw new Error('SESI_SECRET harus 64 karakter heksadesimal (256 bit). Buat dengan: node sesi.js --buat-kunci');
  return Buffer.from(s, 'hex');
}
function kunciTanda(rahasia) { return Buffer.from(crypto.hkdfSync('sha256', rahasia, Buffer.alloc(0), 'exoclean-sesi/tanda', 32)); }
function kunciSub(rahasia) { return Buffer.from(crypto.hkdfSync('sha256', rahasia, Buffer.alloc(0), 'exoclean-sesi/sub', 32)); }

/** Pseudonim stabil untuk identitas (telepon/email) — dipakai sebagai `sub` dan pemilik rekaman brankas. */
function subDari(rahasia, jenis, identitas) {
  let baku = String(identitas || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '');
  /* telepon dibakukan seperti bakuTelp() di auth-server: hanya digit, awalan 0 → 62 */
  if (jenis === 'telp') { baku = baku.replace(/[^\d+]/g, '').replace(/^\+/, ''); if (baku.startsWith('0')) baku = '62' + baku.slice(1); else if (!baku.startsWith('62') && baku.length >= 9) baku = '62' + baku; }
  return crypto.createHmac('sha256', kunciSub(rahasia)).update(jenis + ':' + baku).digest('base64url').slice(0, 32);
}
function terbitkan(rahasia, klaim, opsi) {
  opsi = opsi || {};
  const kini = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: kini, exp: kini + (opsi.detik || 12 * 3600), jti: crypto.randomBytes(12).toString('base64url') }, klaim);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64u(JSON.stringify(payload));
  const tanda = crypto.createHmac('sha256', kunciTanda(rahasia)).update(h + '.' + p).digest();
  return h + '.' + p + '.' + b64u(tanda);
}
function verifikasi(rahasia, token) {
  const bagian = String(token || '').split('.');
  if (bagian.length !== 3) return { ok: false, sebab: 'format' };
  let header; try { header = JSON.parse(Buffer.from(bagian[0], 'base64url').toString('utf8')); } catch (e) { return { ok: false, sebab: 'header' }; }
  if (!header || header.alg !== 'HS256') return { ok: false, sebab: 'alg' };
  const harap = crypto.createHmac('sha256', kunciTanda(rahasia)).update(bagian[0] + '.' + bagian[1]).digest();
  const dapat = Buffer.from(bagian[2], 'base64url');
  if (dapat.length !== harap.length || !crypto.timingSafeEqual(dapat, harap)) return { ok: false, sebab: 'tanda-tangan' };
  let klaim; try { klaim = JSON.parse(Buffer.from(bagian[1], 'base64url').toString('utf8')); } catch (e) { return { ok: false, sebab: 'payload' }; }
  const kini = Math.floor(Date.now() / 1000);
  if (!klaim || typeof klaim.exp !== 'number' || klaim.exp < kini) return { ok: false, sebab: 'kedaluwarsa' };
  if (typeof klaim.iat === 'number' && klaim.iat > kini + 60) return { ok: false, sebab: 'iat' };
  if (!klaim.sub || !klaim.sisi) return { ok: false, sebab: 'klaim' };
  return { ok: true, klaim };
}
/** Middleware Express: wajib Bearer token sah. opsi.sisi = daftar sisi yang boleh (mis. ['admin']). */
function wajibSesi(rahasia, opsi) {
  opsi = opsi || {};
  return function (req, res, next) {
    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Perlu sesi. Masuk lewat OTP dulu.' });
    const v = verifikasi(rahasia, token);
    if (!v.ok) return res.status(401).json({ error: 'Sesi tidak sah (' + v.sebab + '). Masuk lagi.' });
    if (v.klaim.tahap || v.klaim.pin) return res.status(401).json({ error: v.klaim.tahap ? 'Selesaikan verifikasi dua langkah dulu.' : 'Token ini bukan sesi.', perlu2fa: !!v.klaim.tahap });
    if (opsi.sisi && opsi.sisi.indexOf(v.klaim.sisi) < 0) return res.status(403).json({ error: 'Sesi ini tidak berhak untuk operasi ini.' });
    req.sesi = v.klaim;
    next();
  };
}
/** Pelindung dari .env: bila SESI_SECRET terisi → wajibSesi; bila kosong: produksi menolak (503), pengembangan meloloskan dengan peringatan sekali (req.sesi = null). */
function wajibDariEnv(env, opsi) {
  env = env || process.env;
  let rahasia = null; try { rahasia = rahasiaDari(env); } catch (e) { rahasia = null; }
  if (rahasia) return wajibSesi(rahasia, opsi);
  const produksi = env.NODE_ENV === 'production';
  let sudahDiperingatkan = false;
  return function (req, res, next) {
    if (produksi) return res.status(503).json({ error: 'SESI_SECRET belum diisi di server — endpoint ini wajib sesi.' });
    if (!sudahDiperingatkan) { sudahDiperingatkan = true; console.warn('[sesi] SESI_SECRET kosong: endpoint berjalan TANPA sesi (hanya untuk pengembangan). Buat: node sesi.js --buat-kunci'); }
    req.sesi = null; next();
  };
}
/** Benar bila permintaan boleh menyentuh rekaman milik `pemilik`: admin, pemilik yang sama, atau mode pengembangan tanpa sesi. */
function pemilikCocok(req, pemilik) { if (!req.sesi) return true; if (req.sesi.sisi === 'admin') return true; return !pemilik || req.sesi.sub === pemilik; }
function subDariReq(req) { return req.sesi ? req.sesi.sub : null; }
/** PIN-token: bukti PIN transaksi baru saja diverifikasi (klaim pin:true, 5 menit), diterbitkan auth-server, diwajibkan payment/dwi lewat header X-Exo-Pin. */
function terbitkanPinToken(rahasia, klaimSesi, detik) { return terbitkan(rahasia, { sub: klaimSesi.sub, sisi: klaimSesi.sisi, pin: true }, { detik: detik || 300 }); }
function wajibPin(env) {
  env = env || process.env;
  let rahasia = null; try { rahasia = rahasiaDari(env); } catch (e) { rahasia = null; }
  return function (req, res, next) {
    if (!rahasia || !req.sesi) return next();                         /* tanpa SESI_SECRET (pengembangan) tidak ada yang bisa diverifikasi */
    const t = String(req.headers['x-exo-pin'] || '');
    if (!t) return res.status(403).json({ error: 'Perlu PIN transaksi.', perluPin: true });
    const v = verifikasi(rahasia, t);
    if (!v.ok || !v.klaim.pin || v.klaim.sub !== req.sesi.sub) return res.status(403).json({ error: 'PIN transaksi belum diverifikasi atau sudah kedaluwarsa.', perluPin: true });
    req.pinOk = true; next();
  };
}
/** Pengikatan perangkat: bila sesi memuat klaim dev/dkt, header X-Exo-Perangkat (bukti ECDSA kunci perangkat) wajib cocok. Sesi tanpa dkt (lama/uji) lolos. */
function wajibPerangkat() {
  const P = require('./perangkat');
  return function (req, res, next) {
    if (!req.sesi || !req.sesi.dkt) return next();
    const h = String(req.headers['x-exo-perangkat'] || '');
    if (!h) return res.status(403).json({ error: 'Perlu bukti perangkat (sesi terikat perangkat).', perluPerangkat: true });
    const v = P.verifikasiBukti(h, req.sesi);
    if (!v.ok) return res.status(403).json({ error: 'Bukti perangkat ditolak: ' + v.sebab, perluPerangkat: true });
    req.perangkatOk = true; next();
  };
}
function buatKunci() { return crypto.randomBytes(32).toString('hex'); }
if (require.main === module) {
  if (process.argv.includes('--buat-kunci')) console.log('SESI_SECRET=' + buatKunci()); else console.log('pakai: node sesi.js --buat-kunci');
}
module.exports = { rahasiaDari, subDari, terbitkan, verifikasi, wajibSesi, wajibDariEnv, pemilikCocok, subDariReq, terbitkanPinToken, wajibPin, wajibPerangkat, buatKunci };
