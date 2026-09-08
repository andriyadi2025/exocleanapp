/* ==========================================================================
 *  duafaktor.js — verifikasi dua langkah untuk semua pengguna EXOCLEAN
 * --------------------------------------------------------------------------
 *  · TOTP (RFC 6238 / aplikasi autentikator: Google Authenticator, Authy,
 *    Microsoft Authenticator): rahasia 160-bit base32, HMAC-SHA1, langkah 30
 *    detik, 6 digit, toleransi ±1 langkah, kode yang sama tidak boleh dipakai
 *    dua kali (langkah terakhir dicatat). Rahasia disimpan TERENKRIPSI
 *    (AES-256-GCM, kunci HKDF dari SESI_SECRET) — bukan teks polos.
 *  · Passkey (WebAuthn / FIDO2, ES256): pendaftaran memeriksa clientDataJSON
 *    (type, challenge, origin), rpIdHash, flag UP/UV, lalu menyimpan kunci
 *    publik COSE→JWK dan counter. Masuk memverifikasi tanda tangan ECDSA atas
 *    authenticatorData || SHA-256(clientDataJSON) dan counter yang naik.
 *    Attestation tidak dipercaya (format apa pun diterima seperti 'none');
 *    yang dipercaya adalah kunci publik yang terikat ke akun sejak pendaftaran.
 *  · Kode pemulihan: 8 kode 10 karakter, disimpan sebagai SHA-256, sekali pakai.
 *  Tanpa dependensi pihak ketiga: CBOR minimal & base32 ada di sini.
 * ========================================================================== */
'use strict';
const crypto = require('crypto');

/* ---------- base32 (RFC 4648, tanpa padding) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) { let bits = 0, nilai = 0, out = ''; for (const b of buf) { nilai = (nilai << 8) | b; bits += 8; while (bits >= 5) { out += B32[(nilai >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += B32[(nilai << (5 - bits)) & 31]; return out; }
function base32Decode(s) { s = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = 0, nilai = 0; const out = []; for (const c of s) { nilai = (nilai << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((nilai >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }

/* ---------- TOTP ---------- */
function totpKode(rahasia, langkah, digit) { const buf = Buffer.alloc(8); buf.writeUInt32BE(Math.floor(langkah / 0x100000000), 0); buf.writeUInt32BE(langkah >>> 0, 4); const h = crypto.createHmac('sha1', rahasia).update(buf).digest(); const o = h[h.length - 1] & 0x0f; const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % Math.pow(10, digit || 6)).padStart(digit || 6, '0'); }
function totpLangkah(detik) { return Math.floor((detik == null ? Date.now() / 1000 : detik) / 30); }
function totpBuatRahasia() { return base32Encode(crypto.randomBytes(20)); }
function totpUri(rahasiaB32, akun, penerbit) { return 'otpauth://totp/' + encodeURIComponent(penerbit) + ':' + encodeURIComponent(akun) + '?secret=' + rahasiaB32 + '&issuer=' + encodeURIComponent(penerbit) + '&algorithm=SHA1&digits=6&period=30'; }
/** Verifikasi kode; mengembalikan langkah yang cocok (≥ 0) atau -1. `langkahTerakhir` mencegah pemakaian ulang. */
function totpVerifikasi(rahasiaB32, kode, langkahTerakhir, detik) { kode = String(kode || '').replace(/\D/g, ''); if (kode.length !== 6) return -1; const rahasia = base32Decode(rahasiaB32), kini = totpLangkah(detik); for (let d = -1; d <= 1; d++) { const l = kini + d; if (langkahTerakhir != null && l <= langkahTerakhir) continue; const harap = totpKode(rahasia, l, 6); if (harap.length === kode.length && crypto.timingSafeEqual(Buffer.from(harap), Buffer.from(kode))) return l; } return -1; }

/* ---------- kode pemulihan ---------- */
function pemulihanBuat(n) { const out = []; for (let i = 0; i < (n || 8); i++) { const b = crypto.randomBytes(10); let s = ''; for (const x of b) s += B32[x & 31]; out.push(s.slice(0, 5) + '-' + s.slice(5, 10)); } return out; }
function pemulihanHash(kode) { return crypto.createHash('sha256').update(String(kode || '').toUpperCase().replace(/[^A-Z2-7]/g, '')).digest('hex'); }

/* ---------- enkripsi rahasia TOTP saat disimpan ---------- */
function kunciSimpan(rahasiaSesi) { return Buffer.from(crypto.hkdfSync('sha256', rahasiaSesi, Buffer.alloc(0), 'exoclean-2fa/simpan', 32)); }
function segel(rahasiaSesi, teks) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', kunciSimpan(rahasiaSesi), iv); const ct = Buffer.concat([c.update(String(teks), 'utf8'), c.final()]); return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64'); }
function buka(rahasiaSesi, b64) { const buf = Buffer.from(b64, 'base64'), iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16); const d = crypto.createDecipheriv('aes-256-gcm', kunciSimpan(rahasiaSesi), iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]).toString('utf8'); }

/* ---------- CBOR minimal (cukup untuk attestationObject & COSE key) ---------- */
function cborDecode(buf) { let pos = 0; function baca() { const ib = buf[pos++], mt = ib >> 5, ai = ib & 31; let n; if (ai < 24) n = ai; else if (ai === 24) n = buf[pos++]; else if (ai === 25) { n = buf.readUInt16BE(pos); pos += 2; } else if (ai === 26) { n = buf.readUInt32BE(pos); pos += 4; } else if (ai === 27) { n = Number(buf.readBigUInt64BE(pos)); pos += 8; } else throw new Error('CBOR: panjang tak tentu tidak didukung'); switch (mt) { case 0: return n; case 1: return -1 - n; case 2: { const b = buf.subarray(pos, pos + n); pos += n; return Buffer.from(b); } case 3: { const s = buf.subarray(pos, pos + n).toString('utf8'); pos += n; return s; } case 4: { const a = []; for (let i = 0; i < n; i++) a.push(baca()); return a; } case 5: { const m = new Map(); for (let i = 0; i < n; i++) { const k = baca(); m.set(k, baca()); } return m; } case 7: if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; throw new Error('CBOR: tipe sederhana tidak didukung'); default: throw new Error('CBOR: tag tidak didukung'); } } const v = baca(); return v; }

/* ---------- WebAuthn ---------- */
function b64uKeBuf(s) { return Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function bufKeB64u(b) { return Buffer.from(b).toString('base64url'); }
function urai(authData) { const rpIdHash = authData.subarray(0, 32), flags = authData[32], counter = authData.readUInt32BE(33); let idKred = null, coseKey = null; if (flags & 0x40) { const lenId = authData.readUInt16BE(53); idKred = authData.subarray(55, 55 + lenId); coseKey = authData.subarray(55 + lenId); } return { rpIdHash, flags, up: !!(flags & 0x01), uv: !!(flags & 0x04), counter, idKred, coseKey }; }
function coseKeJwk(coseBuf) { const m = cborDecode(coseBuf); const kty = m.get(1), alg = m.get(3), crv = m.get(-1), x = m.get(-2), y = m.get(-3); if (kty !== 2 || alg !== -7 || crv !== 1) throw new Error('Hanya passkey ES256 (P-256) yang didukung'); return { kty: 'EC', crv: 'P-256', x: bufKeB64u(x), y: bufKeB64u(y) }; }
function periksaClientData(cdBuf, tipe, tantanganB64u, asalBoleh) { let cd; try { cd = JSON.parse(cdBuf.toString('utf8')); } catch (e) { throw new Error('clientDataJSON rusak'); } if (cd.type !== tipe) throw new Error('type clientData bukan ' + tipe); if (cd.challenge !== tantanganB64u) throw new Error('tantangan tidak cocok'); if (asalBoleh && asalBoleh.length && !asalBoleh.includes(cd.origin)) throw new Error('origin ' + cd.origin + ' tidak diizinkan'); return cd; }
/** Pendaftaran: kembalikan { id, jwk, counter } bila sah. */
function passkeyDaftar(kred, tantanganB64u, rpId, asalBoleh) { const cdBuf = b64uKeBuf(kred.response.clientDataJSON); periksaClientData(cdBuf, 'webauthn.create', tantanganB64u, asalBoleh); const att = cborDecode(b64uKeBuf(kred.response.attestationObject)); const authData = att.get('authData'); if (!Buffer.isBuffer(authData)) throw new Error('authData tidak ada'); const u = urai(authData); const rpHash = crypto.createHash('sha256').update(rpId).digest(); if (!u.rpIdHash.equals(rpHash)) throw new Error('rpIdHash tidak cocok'); if (!u.up) throw new Error('kehadiran pengguna (UP) tidak ditandai'); if (!u.idKred) throw new Error('data kredensial tidak ada'); return { id: bufKeB64u(u.idKred), jwk: coseKeJwk(u.coseKey), counter: u.counter, uv: u.uv }; }
/** Masuk: verifikasi tanda tangan; kembalikan counter baru bila sah. */
function passkeyMasuk(kred, simpanan, tantanganB64u, rpId, asalBoleh) { const cdBuf = b64uKeBuf(kred.response.clientDataJSON); periksaClientData(cdBuf, 'webauthn.get', tantanganB64u, asalBoleh); const authData = b64uKeBuf(kred.response.authenticatorData); const u = urai(authData); const rpHash = crypto.createHash('sha256').update(rpId).digest(); if (!u.rpIdHash.equals(rpHash)) throw new Error('rpIdHash tidak cocok'); if (!u.up) throw new Error('kehadiran pengguna (UP) tidak ditandai'); const data = Buffer.concat([authData, crypto.createHash('sha256').update(cdBuf).digest()]); const kunci = crypto.createPublicKey({ key: simpanan.jwk, format: 'jwk' }); const sah = crypto.verify('sha256', data, { key: kunci, dsaEncoding: 'der' }, b64uKeBuf(kred.response.signature)); if (!sah) throw new Error('tanda tangan passkey tidak sah'); if (u.counter !== 0 && simpanan.counter !== 0 && u.counter <= simpanan.counter) throw new Error('counter tidak naik — kemungkinan kredensial diklon'); return { counter: u.counter, uv: u.uv }; }

/* ---------- simulasi autentikator (untuk uji otomatis) ---------- */
function simulasiAutentikator(rpId) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }), idKred = crypto.randomBytes(16); let counter = 0;
  function coseDari(j) { const x = b64uKeBuf(j.x), y = b64uKeBuf(j.y); return Buffer.concat([Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]), x, Buffer.from([0x22, 0x58, 0x20]), y]); }
  function authData(flags, denganKred) { const rp = crypto.createHash('sha256').update(rpId).digest(); const c = Buffer.alloc(4); c.writeUInt32BE(counter, 0); const bagian = [rp, Buffer.from([flags]), c]; if (denganKred) { const aaguid = Buffer.alloc(16); const len = Buffer.alloc(2); len.writeUInt16BE(idKred.length, 0); bagian.push(aaguid, len, idKred, coseDari(jwk)); } return Buffer.concat(bagian); }
  function cbor(mapObj) { /* peta kecil {fmt:'none', attStmt:{}, authData:Buffer} */ const teks = (s) => Buffer.concat([Buffer.from([0x60 + s.length]), Buffer.from(s)]); const ad = mapObj.authData; const lenAd = Buffer.alloc(2); lenAd.writeUInt16BE(ad.length, 0); return Buffer.concat([Buffer.from([0xa3]), teks('fmt'), teks('none'), teks('attStmt'), Buffer.from([0xa0]), teks('authData'), Buffer.from([0x59]), lenAd, ad]); }
  return {
    id: bufKeB64u(idKred),
    daftar(tantanganB64u, origin) { counter = 0; const cd = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: tantanganB64u, origin })); return { id: bufKeB64u(idKred), rawId: bufKeB64u(idKred), type: 'public-key', response: { clientDataJSON: bufKeB64u(cd), attestationObject: bufKeB64u(cbor({ authData: authData(0x45, true) })) } }; },
    masuk(tantanganB64u, origin) { counter++; const cd = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: tantanganB64u, origin })); const ad = authData(0x05, false); const sig = crypto.sign('sha256', Buffer.concat([ad, crypto.createHash('sha256').update(cd).digest()]), { key: privateKey, dsaEncoding: 'der' }); return { id: bufKeB64u(idKred), rawId: bufKeB64u(idKred), type: 'public-key', response: { clientDataJSON: bufKeB64u(cd), authenticatorData: bufKeB64u(ad), signature: bufKeB64u(sig) } }; }
  };
}
module.exports = { base32Encode, base32Decode, totpKode, totpLangkah, totpBuatRahasia, totpUri, totpVerifikasi, pemulihanBuat, pemulihanHash, segel, buka, cborDecode, passkeyDaftar, passkeyMasuk, simulasiAutentikator, bufKeB64u, b64uKeBuf };
