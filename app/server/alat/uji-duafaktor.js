/* Uji duafaktor.js tanpa jaringan: node alat/uji-duafaktor.js */
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const D = require('../duafaktor');
let lulus = 0, gagal = 0;
function uji(nama, fn) { try { fn(); lulus++; console.log('LULUS  ' + nama); } catch (e) { gagal++; console.log('GAGAL  ' + nama + ' — ' + (e.message || e)); } }

const RAHASIA_RFC = Buffer.from('12345678901234567890', 'ascii'), B32_RFC = D.base32Encode(RAHASIA_RFC);
uji('base32 pulang-pergi', () => { assert.strictEqual(D.base32Decode(B32_RFC).toString('ascii'), '12345678901234567890'); assert.strictEqual(B32_RFC, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'); });
uji('TOTP vektor RFC 6238 (SHA1, 6 digit)', () => { assert.strictEqual(D.totpKode(RAHASIA_RFC, D.totpLangkah(59), 6), '287082'); assert.strictEqual(D.totpKode(RAHASIA_RFC, D.totpLangkah(1111111109), 6), '081804'); assert.strictEqual(D.totpKode(RAHASIA_RFC, D.totpLangkah(1234567890), 6), '005924'); assert.strictEqual(D.totpKode(RAHASIA_RFC, D.totpLangkah(2000000000), 6), '279037'); });
uji('TOTP verifikasi: toleransi ±1 langkah, tolak kode lama & pemakaian ulang', () => { const t = 1234567890; const kode = D.totpKode(RAHASIA_RFC, D.totpLangkah(t), 6); assert.ok(D.totpVerifikasi(B32_RFC, kode, null, t) >= 0); assert.ok(D.totpVerifikasi(B32_RFC, kode, null, t + 29) >= 0); assert.ok(D.totpVerifikasi(B32_RFC, kode, null, t + 59) >= 0, 'langkah berikutnya masih menerima (−1)'); assert.strictEqual(D.totpVerifikasi(B32_RFC, kode, null, t + 120), -1); const l = D.totpVerifikasi(B32_RFC, kode, null, t); assert.strictEqual(D.totpVerifikasi(B32_RFC, kode, l, t), -1, 'kode yang sama tidak boleh dipakai dua kali'); assert.strictEqual(D.totpVerifikasi(B32_RFC, '000000', null, t), -1); });
uji('rahasia TOTP acak 160 bit & URI otpauth', () => { const s = D.totpBuatRahasia(); assert.strictEqual(D.base32Decode(s).length, 20); const u = D.totpUri(s, 'dewi@exoclean.id', 'EXOCLEAN'); assert.ok(u.startsWith('otpauth://totp/EXOCLEAN:dewi%40exoclean.id?secret=' + s)); });
uji('kode pemulihan: 8 kode, hash tidak peka huruf/tanda', () => { const k = D.pemulihanBuat(8); assert.strictEqual(k.length, 8); assert.match(k[0], /^[A-Z2-7]{5}-[A-Z2-7]{5}$/); assert.strictEqual(D.pemulihanHash(k[0]), D.pemulihanHash(k[0].toLowerCase().replace('-', ' '))); });
const RS = crypto.randomBytes(32);
uji('rahasia TOTP terenkripsi saat disimpan (AES-256-GCM)', () => { const c = D.segel(RS, 'JBSWY3DPEHPK3PXP'); assert.ok(!c.includes('JBSWY3DP')); assert.strictEqual(D.buka(RS, c), 'JBSWY3DPEHPK3PXP'); assert.throws(() => D.buka(crypto.randomBytes(32), c)); });
uji('CBOR: peta, array, bytes, teks, negatif', () => { const m = D.cborDecode(Buffer.from('a301020326206161', 'hex')); assert.strictEqual(m.get(1), 2); assert.strictEqual(m.get(3), -7); assert.strictEqual(m.get(-1), 'a'); const a = D.cborDecode(Buffer.from('83010243aabbcc', 'hex')); assert.strictEqual(a[0], 1); assert.ok(Buffer.isBuffer(a[2]) && a[2].length === 3); });

/* WebAuthn dengan autentikator tiruan */
const RP = 'app.exoclean.id', ORIGIN = 'https://app.exoclean.id', auth = D.simulasiAutentikator(RP);
const tantangan = crypto.randomBytes(32).toString('base64url');
let simpanan;
uji('passkey daftar: clientData, rpIdHash, UP, kunci COSE → JWK', () => { const r = D.passkeyDaftar(auth.daftar(tantangan, ORIGIN), tantangan, RP, [ORIGIN]); assert.strictEqual(r.id, auth.id); assert.strictEqual(r.jwk.kty, 'EC'); assert.strictEqual(r.jwk.crv, 'P-256'); simpanan = { id: r.id, jwk: r.jwk, counter: r.counter }; });
uji('passkey daftar: tantangan salah / origin asing / rpId salah ditolak', () => { assert.throws(() => D.passkeyDaftar(auth.daftar('lain', ORIGIN), tantangan, RP, [ORIGIN]), /tantangan/); assert.throws(() => D.passkeyDaftar(auth.daftar(tantangan, 'https://jahat.example'), tantangan, RP, [ORIGIN]), /origin/); assert.throws(() => D.passkeyDaftar(auth.daftar(tantangan, ORIGIN), tantangan, 'lain.example', [ORIGIN]), /rpIdHash/); });
uji('passkey masuk: tanda tangan sah, counter naik', () => { const t2 = crypto.randomBytes(32).toString('base64url'); const r = D.passkeyMasuk(auth.masuk(t2, ORIGIN), simpanan, t2, RP, [ORIGIN]); assert.strictEqual(r.counter, 1); simpanan.counter = r.counter; });
uji('passkey masuk: tanda tangan dari kunci lain ditolak; counter mundur ditolak', () => { const t3 = crypto.randomBytes(32).toString('base64url'); const lain = D.simulasiAutentikator(RP); assert.throws(() => D.passkeyMasuk(lain.masuk(t3, ORIGIN), simpanan, t3, RP, [ORIGIN]), /tanda tangan/); const k = auth.masuk(t3, ORIGIN); D.passkeyMasuk(k, simpanan, t3, RP, [ORIGIN]); simpanan.counter = 5; assert.throws(() => D.passkeyMasuk(auth.masuk(t3, ORIGIN), simpanan, t3, RP, [ORIGIN]), /counter/); });
uji('passkey masuk: tantangan yang diubah ditolak (replay)', () => { const t4 = crypto.randomBytes(32).toString('base64url'); const k = auth.masuk(t4, ORIGIN); assert.throws(() => D.passkeyMasuk(k, { id: simpanan.id, jwk: simpanan.jwk, counter: 0 }, 'tantangan-lain', RP, [ORIGIN]), /tantangan/); });
console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal');
process.exit(gagal ? 1 : 0);
