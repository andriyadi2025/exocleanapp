/* Uji brankas.js + sesi.js tanpa jaringan: node alat/uji-brankas.js */
'use strict';
const assert = require('assert');
const { Brankas, penyimpananMemori, buatKunci } = require('../brankas');
const SESI = require('../sesi');
let lulus = 0, gagal = 0;
function uji(nama, fn) { try { fn(); lulus++; console.log('LULUS  ' + nama); } catch (e) { gagal++; console.log('GAGAL  ' + nama + ' — ' + (e.message || e)); } }

const K1 = buatKunci(), K2 = buatKunci();
const mem = penyimpananMemori();
const b = new Brankas({ kunci: K1, versi: 1, penyimpanan: mem });
const data = { telp: '0812 8890 4417', email: 'Dewi.Anggraini@gmail.com', alamat: 'Jl. Kemang Raya 12B, Jakarta Selatan', koordinat: { lat: -6.26, lng: 106.81 } };

uji('simpan & baca kembali utuh (AES-256-GCM)', () => { b.tulis('users', 'u1', data, { pemilik: 'subA', indeks: ['telp', 'email'] }); const r = b.baca('users', 'u1', { pemilik: 'subA' }); assert.deepStrictEqual(r.data, data); assert.strictEqual(r.versiKunci, 1); });
uji('yang tersimpan tidak memuat teks polos', () => { const raw = JSON.stringify(mem.baca('users', 'u1')); assert.ok(!raw.includes('4417') && !raw.includes('gmail') && !raw.includes('Kemang')); });
uji('bukan pemilik → ditolak 403', () => { assert.throws(() => b.baca('users', 'u1', { pemilik: 'subB' }), /bukan pemilik/); });
uji('admin boleh membaca rekaman siapa pun', () => { assert.deepStrictEqual(b.baca('users', 'u1', { admin: true }).data, data); });
uji('ciphertext yang diubah 1 byte → gagal (tag GCM)', () => { const rek = mem.baca('users', 'u1'); const buf = Buffer.from(rek.bidang.telp, 'base64'); buf[14] ^= 0x01; rek.bidang.telp = buf.toString('base64'); mem.tulis('users', 'u1', rek); assert.throws(() => b.baca('users', 'u1', { admin: true }), /auth|Unsupported state|rusak/i); b.tulis('users', 'u1', data, { pemilik: 'subA', indeks: ['telp', 'email'] }); });
uji('ciphertext dipindah antar bidang → gagal (AAD mengikat tabel|id|bidang)', () => { const rek = mem.baca('users', 'u1'); const t = rek.bidang.telp; rek.bidang.telp = rek.bidang.email; rek.bidang.email = t; mem.tulis('users', 'u1', rek); assert.throws(() => b.baca('users', 'u1', { admin: true })); b.tulis('users', 'u1', data, { pemilik: 'subA', indeks: ['telp', 'email'] }); });
uji('rekaman disalin ke id lain → gagal (AAD mengikat id)', () => { const rek = mem.baca('users', 'u1'); mem.tulis('users', 'u2', Object.assign({}, rek, { id: 'u2' })); assert.throws(() => b.baca('users', 'u2', { admin: true })); mem.hapus('users', 'u2'); });
uji('indeks buta: cari email tanpa dekripsi, tidak peka huruf/spasi', () => { assert.deepStrictEqual(b.cari('users', 'email', '  dewi.anggraini@GMAIL.com ', { admin: true }), ['u1']); assert.deepStrictEqual(b.cari('users', 'email', 'lain@x.id', { admin: true }), []); });
uji('indeks buta tidak membocorkan nilai (HMAC 128 bit)', () => { const rek = mem.baca('users', 'u1'); assert.match(rek.indeks.email, /^[0-9a-f]{32}$/); });
uji('DEK berbeda tiap rekaman & tiap simpan', () => { b.tulis('users', 'u3', { telp: '0811' }, { pemilik: 'subA' }); const a = mem.baca('users', 'u1').dekTerbungkus, c = mem.baca('users', 'u3').dekTerbungkus; assert.notStrictEqual(a, c); b.tulis('users', 'u3', { telp: '0811' }, { pemilik: 'subA' }); assert.notStrictEqual(c, mem.baca('users', 'u3').dekTerbungkus); });
uji('pemilik lain tidak bisa menimpa rekaman', () => { assert.throws(() => b.tulis('users', 'u1', { telp: 'x' }, { pemilik: 'subB' }), /milik pengguna lain/); });
uji('daftar hanya milik sesi; admin melihat semua', () => { b.tulis('users', 'u9', { telp: '0899' }, { pemilik: 'subB' }); assert.deepStrictEqual(b.daftar('users', { pemilik: 'subB' }).map((r) => r.id), ['u9']); assert.strictEqual(b.daftar('users', { admin: true }).length, 3); });
uji('hapus = penghapusan kriptografis', () => { assert.strictEqual(b.hapus('users', 'u9', { pemilik: 'subB' }), true); assert.strictEqual(mem.baca('users', 'u9'), null); assert.strictEqual(b.baca('users', 'u9', { admin: true }), null); });
uji('rotasi kunci: KEK baru membuka data lama, rekaman dibungkus ulang', () => { const b2 = new Brankas({ kunci: K2, versi: 2, kunciLama: { 1: K1 }, penyimpanan: mem }); assert.deepStrictEqual(b2.baca('users', 'u1', { admin: true }).data, data); const n = b2.putarKunci(); assert.ok(n >= 2); assert.strictEqual(mem.baca('users', 'u1').versiKunci, 2); const b3 = new Brankas({ kunci: K2, versi: 2, penyimpanan: mem }); assert.deepStrictEqual(b3.baca('users', 'u1', { admin: true }).data, data); });
uji('tanpa kunci lama, rekaman versi lama ditolak dengan pesan jelas', () => { const mem2 = penyimpananMemori(); const bx = new Brankas({ kunci: K1, versi: 1, penyimpanan: mem2 }); bx.tulis('users', 'z', { a: 1 }, {}); const by = new Brankas({ kunci: K2, versi: 2, penyimpanan: mem2 }); assert.throws(() => by.baca('users', 'z', { admin: true }), /versi 1 tidak tersedia/); });
uji('log audit tanpa data pribadi, rantai HMAC utuh', () => { const log = mem.bacaAudit(); assert.ok(log.length > 5); assert.ok(!JSON.stringify(log).includes('4417')); const b2 = new Brankas({ kunci: K2, versi: 2, kunciLama: { 1: K1 }, penyimpanan: mem }); assert.strictEqual(b2.verifikasiAudit().ok, true); });
uji('log audit yang diubah/dihapus terdeteksi', () => { const b2 = new Brankas({ kunci: K2, versi: 2, kunciLama: { 1: K1 }, penyimpanan: mem }); mem._log[2].catatan = 'diubah'; assert.strictEqual(b2.verifikasiAudit().ok, false); mem._log.splice(2, 1); assert.strictEqual(b2.verifikasiAudit().ok, false); });
uji('nama tabel/id yang tidak sah ditolak', () => { assert.throws(() => b.tulis('../etc', 'x', { a: 1 })); assert.throws(() => b.tulis('users', '../x', { a: 1 })); assert.throws(() => b.tulis('users', 'x', {})); });
uji('kunci lemah ditolak', () => { assert.throws(() => new Brankas({ kunci: 'abc', penyimpanan: mem }), /64 karakter/); });

/* ---------- sesi ---------- */
const R = Buffer.from(SESI.buatKunci(), 'hex');
uji('sesi: terbit → verifikasi, klaim utuh, tanpa data pribadi', () => { const sub = SESI.subDari(R, 'telp', '0812-8890-4417'); const t = SESI.terbitkan(R, { sub, sisi: 'klien' }); const v = SESI.verifikasi(R, t); assert.strictEqual(v.ok, true); assert.strictEqual(v.klaim.sub, sub); assert.ok(!t.includes('4417')); assert.strictEqual(SESI.subDari(R, 'telp', '081288904417'), sub); });
uji('sesi: tanda tangan diubah → ditolak', () => { const t = SESI.terbitkan(R, { sub: 's', sisi: 'klien' }); const p = t.split('.'); const buf = Buffer.from(p[2], 'base64url'); buf[3] ^= 1; assert.strictEqual(SESI.verifikasi(R, p[0] + '.' + p[1] + '.' + buf.toString('base64url')).ok, false); });
uji('sesi: payload diubah (sisi→admin) → ditolak', () => { const t = SESI.terbitkan(R, { sub: 's', sisi: 'klien' }); const p = t.split('.'); const k = JSON.parse(Buffer.from(p[1], 'base64url').toString()); k.sisi = 'admin'; const v = SESI.verifikasi(R, p[0] + '.' + Buffer.from(JSON.stringify(k)).toString('base64url') + '.' + p[2]); assert.strictEqual(v.ok, false); });
uji('sesi: kedaluwarsa ditolak; rahasia lain ditolak', () => { const t = SESI.terbitkan(R, { sub: 's', sisi: 'klien' }, { detik: -1 }); assert.strictEqual(SESI.verifikasi(R, t).sebab, 'kedaluwarsa'); const t2 = SESI.terbitkan(R, { sub: 's', sisi: 'klien' }); assert.strictEqual(SESI.verifikasi(Buffer.from(SESI.buatKunci(), 'hex'), t2).ok, false); });
uji('sesi: middleware menolak tanpa Bearer dan sisi yang salah', () => { const mw = SESI.wajibSesi(R, { sisi: ['admin'] }); let kode = 0; const res = { status(c) { kode = c; return this; }, json() { return this; } }; mw({ headers: {} }, res, () => { kode = -1; }); assert.strictEqual(kode, 401); const t = SESI.terbitkan(R, { sub: 's', sisi: 'klien' }); mw({ headers: { authorization: 'Bearer ' + t } }, res, () => { kode = -1; }); assert.strictEqual(kode, 403); const ta = SESI.terbitkan(R, { sub: 's', sisi: 'admin' }); let req = { headers: { authorization: 'Bearer ' + ta } }; mw(req, res, () => { kode = -1; }); assert.strictEqual(kode, -1); assert.strictEqual(req.sesi.sisi, 'admin'); });

console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal');
process.exit(gagal ? 1 : 0);
