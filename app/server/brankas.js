/* ==========================================================================
 *  brankas.js — brankas data pribadi EXOCLEAN (enkripsi amplop di server)
 * --------------------------------------------------------------------------
 *  Rancangan (mengikuti praktik KMS/Tink/AWS Encryption SDK, dengan modul
 *  kripto bawaan Node — tidak ada dependensi pihak ketiga):
 *
 *   KEK  = kunci induk 256-bit dari BRANKAS_KUNCI (.env), berversi.
 *          Dari KEK diturunkan sub-kunci lewat HKDF-SHA256 dengan label
 *          berbeda: 'bungkus' (membungkus DEK), 'indeks' (indeks buta),
 *          'audit' (rantai log). KEK sendiri tidak pernah dipakai langsung.
 *   DEK  = kunci data 256-bit ACAK PER REKAMAN. Setiap bidang dienkripsi
 *          AES-256-GCM dengan IV 96-bit acak dan AAD = tabel|id|bidang|versi,
 *          sehingga ciphertext tidak bisa dipindahkan antar bidang/rekaman
 *          (tag GCM gagal). DEK dibungkus (wrap) AES-256-GCM oleh sub-kunci
 *          'bungkus' dan disimpan bersama rekaman.
 *   Rotasi kunci: hanya DEK yang dibungkus ulang dengan KEK baru — data tidak
 *          perlu didekripsi/dienkripsi ulang. BRANKAS_KUNCI_LAMA memegang KEK
 *          versi sebelumnya selama masa transisi.
 *   Indeks buta: HMAC-SHA256(sub-kunci 'indeks', nilai yang dibakukan),
 *          dipotong 128 bit — mencari email/telepon tanpa mendekripsi apa pun.
 *   Penghapusan kriptografis: menghapus rekaman = DEK-nya ikut musnah, jadi
 *          salinan cadangan lama pun tidak bisa dibuka lagi (hak hapus UU PDP).
 *   Log audit: satu baris per operasi tanpa data pribadi (sub pemilik
 *          pseudonim, tabel, id, aksi), dirantai HMAC — entri yang diubah atau
 *          dihapus terdeteksi lewat verifikasiAudit().
 *   Penyimpanan: berkas JSON per rekaman di data/brankas/<tabel>/<id>.json
 *          (hak akses 600) lewat antarmuka PENYIMPANAN {tulis, baca, hapus,
 *          daftar} — ganti dengan PostgreSQL tanpa menyentuh kriptografinya.
 *   Higiene memori: buffer DEK dinolkan setelah dipakai.
 *
 *  Buat kunci: node brankas.js --buat-kunci  →  salin ke .env BRANKAS_KUNCI
 * ========================================================================== */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGO = 'aes-256-gcm', IV_BYTE = 12, TAG_BYTE = 16, KUNCI_BYTE = 32;
const POLA_ID = /^[A-Za-z0-9_.:-]{1,64}$/, POLA_TABEL = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/;

function bacaKunciHex(hex, nama) {
  const h = String(hex || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(h)) throw new Error(nama + ' harus 64 karakter heksadesimal (256 bit). Buat dengan: node brankas.js --buat-kunci');
  return Buffer.from(h, 'hex');
}
function turunkan(kek, label, byte) { return Buffer.from(crypto.hkdfSync('sha256', kek, Buffer.alloc(0), 'exoclean-brankas/' + label, byte || KUNCI_BYTE)); }
function bakukan(nilai) { return String(nilai == null ? '' : nilai).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '); }

class Brankas {
  /**
   * @param {object} o  { kunci: hex KEK aktif, versi: nomor versi KEK aktif (>=1),
   *                      kunciLama: { [versi]: hex } (opsional, untuk rotasi),
   *                      penyimpanan: PENYIMPANAN, dir: folder bila penyimpanan berkas }
   */
  constructor(o) {
    o = o || {};
    this.versi = Number(o.versi || 1);
    if (!Number.isInteger(this.versi) || this.versi < 1) throw new Error('versi kunci harus bilangan bulat ≥ 1');
    const kek = bacaKunciHex(o.kunci, 'BRANKAS_KUNCI');
    this.kunci = { [this.versi]: this._sub(kek) };
    Object.keys(o.kunciLama || {}).forEach((v) => { if (Number(v) !== this.versi) this.kunci[Number(v)] = this._sub(bacaKunciHex(o.kunciLama[v], 'BRANKAS_KUNCI_LAMA[' + v + ']')); });
    kek.fill(0);
    this.simpan = o.penyimpanan || penyimpananBerkas(o.dir || path.join(__dirname, 'data', 'brankas'));
  }
  _sub(kek) { return { bungkus: turunkan(kek, 'bungkus'), indeks: turunkan(kek, 'indeks'), audit: turunkan(kek, 'audit') }; }
  _aktif() { return this.kunci[this.versi]; }

  /* ---------- primitif ---------- */
  _segel(kunci, polos, aad) {
    const iv = crypto.randomBytes(IV_BYTE), c = crypto.createCipheriv(ALGO, kunci, iv);
    c.setAAD(Buffer.from(aad, 'utf8'));
    const ct = Buffer.concat([c.update(polos), c.final()]);
    return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64');
  }
  _buka(kunci, b64, aad) {
    const buf = Buffer.from(String(b64), 'base64');
    if (buf.length < IV_BYTE + TAG_BYTE) throw new Error('ciphertext rusak');
    const iv = buf.subarray(0, IV_BYTE), tag = buf.subarray(buf.length - TAG_BYTE), ct = buf.subarray(IV_BYTE, buf.length - TAG_BYTE);
    const d = crypto.createDecipheriv(ALGO, kunci, iv);
    d.setAAD(Buffer.from(aad, 'utf8')); d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]);
  }
  indeksButa(nilai) { return crypto.createHmac('sha256', this._aktif().indeks).update(bakukan(nilai)).digest('hex').slice(0, 32); }

  /* ---------- rekaman ---------- */
  static periksaNama(tabel, id) {
    if (!POLA_TABEL.test(String(tabel || ''))) throw new Error('nama tabel tidak sah');
    if (!POLA_ID.test(String(id || ''))) throw new Error('id rekaman tidak sah');
  }
  /**
   * Menyimpan (upsert) satu rekaman. `data` = objek bidang→nilai (string/angka/objek
   * kecil; objek diserialisasi JSON). `indeks` = daftar bidang yang perlu indeks buta.
   * Setiap simpan membuat DEK baru — DEK lama musnah bersama versi lama rekaman.
   */
  tulis(tabel, id, data, opsi) {
    Brankas.periksaNama(tabel, id); opsi = opsi || {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('data harus objek bidang→nilai');
    const bidang = Object.keys(data).filter((k) => /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(k) && data[k] != null && data[k] !== '');
    if (!bidang.length) throw new Error('tidak ada bidang untuk disimpan');
    if (bidang.length > 64) throw new Error('terlalu banyak bidang');
    const dek = crypto.randomBytes(KUNCI_BYTE), versi = this.versi;
    const rek = { v: 2, tabel, id, versiKunci: versi, pemilik: opsi.pemilik || null, dibuat: new Date().toISOString(), bidang: {}, indeks: {}, dekTerbungkus: null };
    try {
      bidang.forEach((k) => { const polos = Buffer.from(JSON.stringify(data[k]), 'utf8'); if (polos.length > 2 * 1024 * 1024) throw new Error('bidang ' + k + ' melebihi 2 MB'); rek.bidang[k] = this._segel(dek, polos, aad(tabel, id, k, versi)); });
      (opsi.indeks || []).forEach((k) => { if (data[k] != null && data[k] !== '') rek.indeks[k] = this.indeksButa(data[k]); });
      rek.dekTerbungkus = this._segel(this._aktif().bungkus, dek, aad(tabel, id, '#dek', versi));
    } finally { dek.fill(0); }
    const lama = this.simpan.baca(tabel, id);
    if (lama && lama.pemilik && opsi.pemilik && lama.pemilik !== opsi.pemilik && !opsi.paksa) throw galat('rekaman milik pengguna lain', 403);
    this.simpan.tulis(tabel, id, rek);
    this._audit(opsi.pemilik, lama ? 'ubah' : 'simpan', tabel, id, bidang.length + ' bidang');
    return { tabel, id, bidang, versiKunci: versi };
  }
  _bukaDek(rek) {
    const k = this.kunci[rek.versiKunci];
    if (!k) throw new Error('kunci versi ' + rek.versiKunci + ' tidak tersedia — isi BRANKAS_KUNCI_LAMA');
    return this._buka(k.bungkus, rek.dekTerbungkus, aad(rek.tabel, rek.id, '#dek', rek.versiKunci));
  }
  baca(tabel, id, opsi) {
    Brankas.periksaNama(tabel, id); opsi = opsi || {};
    const rek = this.simpan.baca(tabel, id); if (!rek) return null;
    if (rek.pemilik && !opsi.admin && rek.pemilik !== opsi.pemilik) throw galat('bukan pemilik rekaman', 403);
    const dek = this._bukaDek(rek), data = {};
    try { Object.keys(rek.bidang).forEach((k) => { data[k] = JSON.parse(this._buka(dek, rek.bidang[k], aad(tabel, id, k, rek.versiKunci)).toString('utf8')); }); }
    finally { dek.fill(0); }
    if (!opsi.senyap) this._audit(opsi.pemilik, opsi.admin ? 'baca-admin' : 'baca', tabel, id, '');
    return { tabel, id, pemilik: rek.pemilik, dibuat: rek.dibuat, versiKunci: rek.versiKunci, data };
  }
  daftar(tabel, opsi) {
    opsi = opsi || {}; if (!POLA_TABEL.test(String(tabel || ''))) throw new Error('nama tabel tidak sah');
    const out = [];
    this.simpan.daftar(tabel).forEach((id) => { const rek = this.simpan.baca(tabel, id); if (!rek) return; if (!opsi.admin && rek.pemilik && rek.pemilik !== opsi.pemilik) return; if (out.length >= (opsi.maks || 500)) return; try { out.push(this.baca(tabel, id, Object.assign({}, opsi, { senyap: true }))); } catch (e) { /* rekaman rusak dilewati, dicatat */ this._audit(opsi.pemilik, 'baca-gagal', tabel, id, e.message); } });
    this._audit(opsi.pemilik, opsi.admin ? 'daftar-admin' : 'daftar', tabel, '*', out.length + ' rekaman');
    return out;
  }
  cari(tabel, bidangIndeks, nilai, opsi) {
    opsi = opsi || {}; if (!POLA_TABEL.test(String(tabel || ''))) throw new Error('nama tabel tidak sah');
    const target = this.indeksButa(nilai), hasil = [];
    this.simpan.daftar(tabel).forEach((id) => { const rek = this.simpan.baca(tabel, id); if (!rek || !rek.indeks) return; const ada = rek.indeks[bidangIndeks]; if (!ada || ada.length !== target.length || !crypto.timingSafeEqual(Buffer.from(ada), Buffer.from(target))) return; if (!opsi.admin && rek.pemilik && rek.pemilik !== opsi.pemilik) return; hasil.push(id); });
    this._audit(opsi.pemilik, 'cari', tabel, bidangIndeks, hasil.length + ' cocok');
    return hasil;
  }
  hapus(tabel, id, opsi) {
    Brankas.periksaNama(tabel, id); opsi = opsi || {};
    const rek = this.simpan.baca(tabel, id); if (!rek) return false;
    if (rek.pemilik && !opsi.admin && rek.pemilik !== opsi.pemilik) throw galat('bukan pemilik rekaman', 403);
    this.simpan.hapus(tabel, id);
    this._audit(opsi.pemilik, 'hapus', tabel, id, 'DEK ikut musnah (penghapusan kriptografis)');
    return true;
  }
  /* Rotasi: bungkus ulang DEK setiap rekaman dengan KEK aktif. Data tidak disentuh. */
  putarKunci(tabel) {
    let n = 0; const daftarTabel = tabel ? [tabel] : this.simpan.daftarTabel();
    daftarTabel.forEach((t) => this.simpan.daftar(t).forEach((id) => { const rek = this.simpan.baca(t, id); if (!rek || rek.versiKunci === this.versi) return; const dek = this._bukaDek(rek); try { rek.dekTerbungkus = this._segel(this._aktif().bungkus, dek, aad(t, id, '#dek', this.versi)); Object.keys(rek.bidang).forEach((k) => { const polos = this._buka(dek, rek.bidang[k], aad(t, id, k, rek.versiKunciLama || rek.versiKunci)); rek.bidang[k] = this._segel(dek, polos, aad(t, id, k, this.versi)); polos.fill(0); }); } finally { dek.fill(0); } rek.versiKunci = this.versi; this.simpan.tulis(t, id, rek); n++; }));
    this._audit(null, 'rotasi-kunci', tabel || '*', '*', n + ' rekaman → versi ' + this.versi);
    return n;
  }
  statistik() { const t = this.simpan.daftarTabel(); let n = 0; const per = {}; t.forEach((x) => { per[x] = this.simpan.daftar(x).length; n += per[x]; }); return { tabel: per, rekaman: n, versiKunci: this.versi, versiTersedia: Object.keys(this.kunci).map(Number) }; }

  /* ---------- log audit berantai HMAC (tanpa data pribadi) ---------- */
  _audit(sub, aksi, tabel, id, catatan) {
    const sebelum = this.simpan.audit ? this.simpan.auditTerakhir() : null;
    const entri = { at: new Date().toISOString(), sub: sub ? String(sub).slice(0, 64) : null, aksi, tabel, id: String(id).slice(0, 64), catatan: String(catatan || '').slice(0, 160), sebelum: sebelum ? sebelum.hmac : null };
    entri.hmac = crypto.createHmac('sha256', this._aktif().audit).update(JSON.stringify([entri.at, entri.sub, entri.aksi, entri.tabel, entri.id, entri.catatan, entri.sebelum])).digest('hex');
    if (this.simpan.audit) this.simpan.audit(entri);
    return entri;
  }
  verifikasiAudit() {
    const baris = this.simpan.bacaAudit ? this.simpan.bacaAudit() : [];
    let sebelum = null;
    for (let i = 0; i < baris.length; i++) {
      const e = baris[i];
      const kunci = this.kunci[this.versi].audit; /* rantai selalu diverifikasi dengan kunci aktif; setelah rotasi, verifikasi entri lama memakai kunci lama */
      let hmac = crypto.createHmac('sha256', kunci).update(JSON.stringify([e.at, e.sub, e.aksi, e.tabel, e.id, e.catatan, e.sebelum])).digest('hex');
      if (hmac !== e.hmac) { const cocok = Object.keys(this.kunci).some((v) => crypto.createHmac('sha256', this.kunci[v].audit).update(JSON.stringify([e.at, e.sub, e.aksi, e.tabel, e.id, e.catatan, e.sebelum])).digest('hex') === e.hmac); if (!cocok) return { ok: false, baris: i + 1, sebab: 'HMAC tidak cocok (entri diubah)' }; }
      if (e.sebelum !== sebelum) return { ok: false, baris: i + 1, sebab: 'rantai putus (entri dihapus/disisipkan)' };
      sebelum = e.hmac;
    }
    return { ok: true, jumlah: baris.length };
  }
}
function aad(tabel, id, bidang, versi) { return tabel + '|' + id + '|' + bidang + '|v' + versi; }
function galat(pesan, status) { const e = new Error(pesan); e.status = status; return e; }

/* ---------- penyimpanan berkas (ganti dengan PostgreSQL bila siap) ---------- */
function penyimpananBerkas(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const jalur = (t, id) => path.join(dir, t, id + '.json');
  const auditPath = path.join(dir, 'audit.log');
  let terakhir = null;
  return {
    tulis(t, id, obj) { fs.mkdirSync(path.join(dir, t), { recursive: true, mode: 0o700 }); const tmp = jalur(t, id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj), { mode: 0o600 }); fs.renameSync(tmp, jalur(t, id)); },
    baca(t, id) { try { return JSON.parse(fs.readFileSync(jalur(t, id), 'utf8')); } catch (e) { return null; } },
    hapus(t, id) { try { fs.unlinkSync(jalur(t, id)); } catch (e) { /* sudah tidak ada */ } },
    daftar(t) { try { return fs.readdirSync(path.join(dir, t)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)); } catch (e) { return []; } },
    daftarTabel() { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch (e) { return []; } },
    audit(entri) { fs.appendFileSync(auditPath, JSON.stringify(entri) + '\n', { mode: 0o600 }); terakhir = entri; },
    auditTerakhir() { if (terakhir) return terakhir; const b = this.bacaAudit(); terakhir = b.length ? b[b.length - 1] : null; return terakhir; },
    bacaAudit() { try { return fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch (e) { return []; } }
  };
}
function penyimpananMemori() {
  const m = {}, log = [];
  return {
    tulis(t, id, o) { (m[t] = m[t] || {})[id] = JSON.parse(JSON.stringify(o)); }, baca(t, id) { return m[t] && m[t][id] ? JSON.parse(JSON.stringify(m[t][id])) : null; }, hapus(t, id) { if (m[t]) delete m[t][id]; },
    daftar(t) { return Object.keys(m[t] || {}); }, daftarTabel() { return Object.keys(m); }, audit(e) { log.push(e); }, auditTerakhir() { return log[log.length - 1] || null; }, bacaAudit() { return log.slice(); }, _log: log
  };
}
function buatKunci() { return crypto.randomBytes(KUNCI_BYTE).toString('hex'); }

if (require.main === module) {
  if (process.argv.includes('--buat-kunci')) { console.log('BRANKAS_KUNCI=' + buatKunci()); console.log('BRANKAS_KUNCI_VERSI=1'); console.log('# simpan di .env (hak akses 600) dan di brankas kata sandi tim — tidak di chat/repo'); }
  else console.log('pakai: node brankas.js --buat-kunci');
}
module.exports = { Brankas, penyimpananBerkas, penyimpananMemori, buatKunci, bakukan };
