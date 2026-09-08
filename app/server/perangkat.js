/* ==========================================================================
 *  perangkat.js — pengikatan perangkat (device binding) & bukti kepemilikan
 * --------------------------------------------------------------------------
 *  Setiap perangkat/peramban membuat pasangan kunci ECDSA P-256 (kunci privat
 *  tidak bisa diekspor, tersimpan di IndexedDB) dan id acak. Saat OTP/login
 *  sosial, kunci publiknya (JWK) dikirim ke auth-server yang:
 *   · mencatat perangkat per akun (sub) — perangkat yang belum dikenal =
 *     "login dari perangkat baru" → notifikasi SMS/email + riwayat;
 *   · menanam klaim `dev` (id) dan `dkt` (thumbprint JWK, RFC 7638) di sesi.
 *  Server lain (payment, dwi, data, kirim, posisi) meminta BUKTI kepemilikan
 *  kunci pada tiap permintaan: header X-Exo-Perangkat = base64url(JSON{ id,
 *  jwk, ts, sig }) dengan sig = ECDSA-SHA256(`id|ts|sub`) — thumbprint JWK
 *  harus sama dengan `dkt` di sesi, ts dalam ±5 menit. Sesi yang dicuri dari
 *  perangkat lain jadi tidak berguna tanpa kunci privatnya (pola DPoP).
 * ========================================================================== */
'use strict';
const crypto = require('crypto');
const TOLERANSI_DETIK = 300;
function b64u(buf) { return Buffer.from(buf).toString('base64url'); }
function dariB64u(s) { return Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function jwkSah(j) { return !!(j && j.kty === 'EC' && j.crv === 'P-256' && typeof j.x === 'string' && typeof j.y === 'string' && j.x.length >= 40 && j.y.length >= 40); }
/** Thumbprint JWK (RFC 7638): SHA-256 atas JSON kanonis {crv,kty,x,y}. */
function thumbprint(jwk) { return b64u(crypto.createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest()); }
function idSah(id) { return /^[A-Za-z0-9_-]{16,64}$/.test(String(id || '')); }
function pesanBukti(id, ts, sub) { return String(id) + '|' + String(ts) + '|' + String(sub); }
/** Verifikasi header X-Exo-Perangkat terhadap klaim sesi { sub, dev, dkt }. Mengembalikan { ok, sebab }. */
function verifikasiBukti(header, klaim, kini) {
  let b; try { b = JSON.parse(dariB64u(header).toString('utf8')); } catch (e) { return { ok: false, sebab: 'format' }; }
  if (!b || !idSah(b.id) || !jwkSah(b.jwk) || typeof b.sig !== 'string') return { ok: false, sebab: 'isi' };
  if (b.id !== klaim.dev) return { ok: false, sebab: 'id perangkat berbeda' };
  if (thumbprint(b.jwk) !== klaim.dkt) return { ok: false, sebab: 'kunci perangkat berbeda' };
  const ts = Number(b.ts), now = kini == null ? Math.floor(Date.now() / 1000) : kini;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANSI_DETIK) return { ok: false, sebab: 'waktu bukti kedaluwarsa' };
  try {
    const kunci = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b.jwk.x, y: b.jwk.y }, format: 'jwk' });
    const sah = crypto.verify('sha256', Buffer.from(pesanBukti(b.id, ts, klaim.sub), 'utf8'), { key: kunci, dsaEncoding: 'ieee-p1363' }, dariB64u(b.sig));
    return sah ? { ok: true } : { ok: false, sebab: 'tanda tangan tidak sah' };
  } catch (e) { return { ok: false, sebab: 'kunci tidak bisa dibaca' }; }
}
/** Nama perangkat yang ramah dari user-agent + platform yang dikirim klien. */
function namaPerangkat(ua, platform) {
  ua = String(ua || ''); let os = platform || (/Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Perangkat');
  const br = /Edg\//i.test(ua) ? 'Edge' : /OPR\//i.test(ua) ? 'Opera' : /Chrome\//i.test(ua) ? 'Chrome' : /Safari\//i.test(ua) ? 'Safari' : /Firefox\//i.test(ua) ? 'Firefox' : '';
  return String(os).slice(0, 20) + (br ? ' · ' + br : '');
}
/* ---------- simulasi perangkat (untuk uji otomatis) ---------- */
function simulasiPerangkat() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }), id = crypto.randomBytes(24).toString('base64url');
  return { id, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, dkt: thumbprint({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }),
    info(nama) { return { id, kunciPublik: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, nama: nama || 'Uji', platform: 'Uji' }; },
    bukti(sub, ts) { ts = ts == null ? Math.floor(Date.now() / 1000) : ts; const sig = crypto.sign('sha256', Buffer.from(pesanBukti(id, ts, sub), 'utf8'), { key: privateKey, dsaEncoding: 'ieee-p1363' }); return b64u(Buffer.from(JSON.stringify({ id, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, ts, sig: b64u(sig) }))); } };
}
module.exports = { TOLERANSI_DETIK, jwkSah, idSah, thumbprint, verifikasiBukti, namaPerangkat, simulasiPerangkat, pesanBukti };
