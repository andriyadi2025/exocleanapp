/* ==========================================================================
   data-server.js — penyimpanan sungguhan untuk EXOCLEAN / MCS
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Sampai sekarang seluruh data aplikasi hidup di localStorage: satu perangkat,
   satu browser, dan hilang tanpa peringatan ketika penyimpanan dibersihkan.
   Itu sudah terjadi — data demo MCS lenyap di antara dua sesi.

   Server ini memindahkan datanya ke berkas SQLite di disk. Bukan sekadar
   "supaya tidak hilang": ia juga membuat DUA ORANG bisa melihat data yang
   sama, yang selama ini menjadi penghalang utama MCS dipakai sungguhan —
   building manager di komputernya dan supervisor di ponselnya.

   PERIZINAN — DIKERJAKAN DI SINI, BUKAN DI APLIKASI

   Sebelumnya server ini hanya mengenal SATU token yang dipakai bersama semua
   perangkat. Akibatnya tiga hal yang semuanya buruk:

     · Ponsel yang hilang tidak bisa dicabut sendiri — satu-satunya jalan
       adalah mengganti token dan memasang ulang di SETIAP perangkat.
     · Tidak ada yang tahu perangkat mana menulis apa; kolom `klien` pada
       oplog diisi klien sendiri, jadi ia keterangan, bukan bukti.
     · Dua perusahaan tidak mungkin berbagi satu server tanpa saling membaca.

   Sekarang setiap perangkat punya TOKENNYA SENDIRI, terikat pada satu
   penyewa, bisa dicabut satu per satu, dan disimpan sebagai HASH — bukan
   apa adanya. Bila berkas basis datanya bocor, tokennya tidak ikut bocor.

   Setiap baris data membawa kolom `penyewa`. Pull dan snapshot HANYA
   mengembalikan baris milik penyewa si penelepon; push menuliskan penyewa
   dari tokennya, bukan dari yang dikirim klien — klien tidak boleh memilih
   dirinya sendiri.

   DATA_TOKEN di .env kini menjadi TOKEN ADMIN: ia tidak lagi bisa membaca
   atau menulis data, hanya mengelola perangkat. Token yang bisa melakukan
   segalanya adalah token yang paling sering ditempel di catatan tempel.

   BENTUK DATANYA

   Satu tabel generik `baris(tabel, id, data)` — bukan satu tabel SQL per
   tabel aplikasi. Alasannya sama dengan alasan aplikasi ini bisa menambah
   tabel tanpa menaikkan versi basis data: tabel baru muncul begitu saja,
   tanpa migrasi. Menukarnya dengan skema kaku berarti setiap fitur baru
   menuntut perubahan di dua tempat.

   Menjalankan:  node app/server/data-server.js      (atau npm run start:data)
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

/* ------------------------------------------------------------------ env */
function bacaEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((baris) => {
    const s = baris.trim();
    if (!s || s.startsWith('#')) return;
    const i = s.indexOf('=');
    if (i < 0) return;
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  });
  return out;
}
const ENV = Object.assign({}, bacaEnv(), process.env);

const PORT = Number(ENV.DATA_PORT || 4500);
const BERKAS = ENV.DATA_FILE || path.join(__dirname, 'data', 'exoclean.db');
/* Token ADMIN. Tidak dipakai membaca atau menulis data — hanya membuat dan
   mencabut token perangkat. */
const TOKEN_ADMIN = String(ENV.DATA_TOKEN || '').trim();
const ASAL = (ENV.DATA_ORIGIN || 'http://localhost:8080').split(',').map((s) => s.trim());

/* Token WAJIB. Server data tanpa token adalah basis data yang terbuka bagi
   siapa pun yang bisa menjangkau portnya — termasuk perangkat lain di WiFi
   yang sama. Gagal berdiri lebih baik daripada berdiri tanpa pintu. */
if (!TOKEN_ADMIN) {
  console.error('DATA_TOKEN belum diisi di app/server/.env — server tidak dijalankan.');
  console.error('Isi baris:  DATA_TOKEN=<kalimat acak panjang milik Anda>');
  console.error('Token itu kini token ADMIN: dipakai membuat token perangkat,');
  console.error('bukan dipakai aplikasi sehari-hari.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(BERKAS), { recursive: true });
const db = new DatabaseSync(BERKAS);

/* WAL: pembaca tidak menghalangi penulis. Dengan dua orang memakai aplikasi
   bersamaan, tanpa ini yang satu akan melihat "database is locked". */
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS baris (
    tabel   TEXT NOT NULL,
    id      TEXT NOT NULL,
    data    TEXT NOT NULL,
    diubah  TEXT NOT NULL,
    dihapus INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tabel, id)
  );
  CREATE TABLE IF NOT EXISTS oplog (
    seq   INTEGER PRIMARY KEY AUTOINCREMENT,
    tabel TEXT NOT NULL,
    id    TEXT NOT NULL,
    aksi  TEXT NOT NULL,
    data  TEXT,
    at    TEXT NOT NULL,
    klien TEXT
  );
  CREATE INDEX IF NOT EXISTS oplog_seq ON oplog(seq);
  CREATE TABLE IF NOT EXISTS nomor (
    jenis  TEXT PRIMARY KEY,
    dipakai INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS meta (
    kunci TEXT PRIMARY KEY,
    nilai TEXT
  );
  /* Satu baris per PERANGKAT, bukan per orang: yang dicabut saat ponsel
     hilang adalah ponselnya, dan orangnya tetap bisa masuk dari komputer. */
  CREATE TABLE IF NOT EXISTS akses (
    id        TEXT PRIMARY KEY,
    penyewa   TEXT NOT NULL,
    nama      TEXT NOT NULL,
    hash      TEXT NOT NULL UNIQUE,
    peran     TEXT NOT NULL DEFAULT 'penuh',
    aktif     INTEGER NOT NULL DEFAULT 1,
    dibuat    TEXT NOT NULL,
    dicabut   TEXT,
    terakhir  TEXT,
    dipakai   INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS akses_hash ON akses(hash);
`);

/* Kolom `penyewa` ditambahkan ke tabel yang mungkin sudah berisi. ALTER yang
   gagal karena kolomnya sudah ada bukan galat — ia berarti pemutakhiran ini
   sudah pernah berjalan. */
['baris', 'oplog', 'nomor'].forEach((t) => {
  try { db.exec(`ALTER TABLE ${t} ADD COLUMN penyewa TEXT NOT NULL DEFAULT 'utama'`); }
  catch (e) { /* sudah ada */ }
});
try { db.exec('CREATE INDEX IF NOT EXISTS baris_penyewa ON baris(penyewa)'); } catch (e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS oplog_penyewa ON oplog(penyewa, seq)'); } catch (e) {}

/* Kunci utama nomor dokumen harus (penyewa, jenis), bukan jenis saja — dua
   penyewa berbeda tidak boleh berbagi hitungan nomor invoice. SQLite tidak
   bisa mengubah kunci utama, jadi tabelnya dibangun ulang bila masih lama. */
(function pastikanNomor() {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE name='nomor'").get();
  if (info && /PRIMARY KEY \(penyewa/.test(String(info.sql))) return;
  db.exec('BEGIN');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS nomor_baru (
      penyewa TEXT NOT NULL, jenis TEXT NOT NULL, dipakai INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (penyewa, jenis))`);
    db.exec(`INSERT OR IGNORE INTO nomor_baru (penyewa,jenis,dipakai)
      SELECT COALESCE(penyewa,'utama'), jenis, dipakai FROM nomor`);
    db.exec('DROP TABLE nomor');
    db.exec('ALTER TABLE nomor_baru RENAME TO nomor');
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); }
})();

/* Kunci utama tetap (tabel,id) — id aplikasi ini sudah unik menyeluruh, dan
   menjadikannya (penyewa,tabel,id) akan membuat satu id yang bocor antar
   penyewa diam-diam menjadi dua baris berbeda alih-alih ditolak. */
const qSet = db.prepare(
  'INSERT INTO baris (tabel,id,data,diubah,dihapus,penyewa) VALUES (?,?,?,?,0,?) ' +
  'ON CONFLICT(tabel,id) DO UPDATE SET data=excluded.data, diubah=excluded.diubah, ' +
  'dihapus=0 WHERE baris.penyewa = excluded.penyewa');
const qHapus = db.prepare(
  'INSERT INTO baris (tabel,id,data,diubah,dihapus,penyewa) VALUES (?,?,?,?,1,?) ' +
  'ON CONFLICT(tabel,id) DO UPDATE SET diubah=excluded.diubah, dihapus=1 ' +
  'WHERE baris.penyewa = excluded.penyewa');
const qOp = db.prepare(
  'INSERT INTO oplog (tabel,id,aksi,data,at,klien,penyewa) VALUES (?,?,?,?,?,?,?)');
const qSeq = db.prepare('SELECT COALESCE(MAX(seq),0) AS s FROM oplog');
const qSemua = db.prepare('SELECT tabel,id,data FROM baris WHERE dihapus=0 AND penyewa=?');
const qSejak = db.prepare(
  'SELECT seq,tabel,id,aksi,data,at,klien FROM oplog WHERE seq > ? AND penyewa=? ' +
  'ORDER BY seq LIMIT 5000');
const qHitung = db.prepare(
  'SELECT COUNT(*) AS n FROM baris WHERE dihapus=0 AND penyewa=?');

/* ------------------------------------------------------- nomor dokumen
   Dua perangkat yang sama-sama menghitung "nomor berikutnya" dari salinannya
   sendiri akan menerbitkan dua invoice bernomor sama. Karena itu nomor TIDAK
   dihitung di aplikasi melainkan DIPESAN di sini, sepetak sekaligus.

   Akibatnya bisa ada nomor yang terlewat ketika petak tidak habis dipakai.
   Itu ditukar dengan sengaja: nomor yang berlubang membingungkan, nomor yang
   kembar merusak pembukuan. */
const qNomorAmbil = db.prepare('SELECT dipakai FROM nomor WHERE penyewa=? AND jenis=?');
const qNomorSimpan = db.prepare(
  'INSERT INTO nomor (penyewa,jenis,dipakai) VALUES (?,?,?) ' +
  'ON CONFLICT(penyewa,jenis) DO UPDATE SET dipakai=excluded.dipakai');

function pesanNomor(jenis, n, penyewa) {
  const jml = Math.max(1, Math.min(500, Math.round(n || 25)));
  const kini = qNomorAmbil.get(penyewa, jenis);
  const mulai = (kini ? kini.dipakai : 0) + 1;
  qNomorSimpan.run(penyewa, jenis, mulai + jml - 1);
  return { dari: mulai, sampai: mulai + jml - 1 };
}

/* ------------------------------------------------------------- bantuan */
function seqKini() { return qSeq.get().s; }

/* Asal yang sudah pernah diperingatkan. Satu baris per asal, bukan per
   permintaan: aplikasi menarik tiap tiga detik, dan peringatan yang
   berulang tiga kali per detik sama tidak terbacanya dengan tidak ada
   peringatan sama sekali. */
const asalDiperingatkan = new Set();

function cors(req, res) {
  const asal = req.headers.origin;
  if (asal && ASAL.indexOf(asal) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', asal);
    res.setHeader('Vary', 'Origin');
  } else if (asal && !asalDiperingatkan.has(asal)) {
    /* Tanpa baris ini, salah tulis DATA_ORIGIN tidak meninggalkan jejak di
       mana pun: peramban memblokir jawabannya sendiri dan hanya berkata
       "network error", yang di layar aplikasi muncul sebagai "luring" —
       seolah WiFi-nya yang bermasalah. Kesalahan pengaturan harus terbaca
       di tempat pengaturannya diubah. */
    asalDiperingatkan.add(asal);
    console.warn('[cors] permintaan dari asal yang TIDAK diizinkan: ' + asal);
    console.warn('       peramban akan memblokir jawabannya, dan aplikasi akan');
    console.warn('       menampilkannya sebagai "luring". Bila asal ini memang sah,');
    console.warn('       tambahkan ke DATA_ORIGIN di app/server/.env:');
    console.warn('       DATA_ORIGIN=' + ASAL.concat([asal]).join(','));
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Exo-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function kirimJSON(res, kode, badan) {
  const s = JSON.stringify(badan);
  res.writeHead(kode, { 'Content-Type': 'application/json; charset=utf-8',
                        'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}

function bacaBody(req) {
  return new Promise((resolve, reject) => {
    let d = '', n = 0;
    req.on('data', (c) => {
      n += c.length;
      /* 40 MB: cukup untuk snapshot berisi foto, jauh di bawah titik di mana
         satu permintaan bisa menghabiskan memori server. */
      if (n > 40 * 1024 * 1024) { reject(new Error('Kiriman terlalu besar')); req.destroy(); return; }
      d += c;
    });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/* ------------------------------------------------------------ perizinan */

/* Token disimpan sebagai hash, bukan apa adanya. Bila berkas basis datanya
   bocor — dan berkas SQLite adalah satu berkas yang gampang tersalin — token
   yang ada di dalamnya tidak bisa dipakai siapa pun. */
function hashToken(t) {
  return crypto.createHash('sha256').update(String(t), 'utf8').digest('hex');
}

/* Perbandingan waktu-tetap. Perbandingan biasa berhenti pada huruf pertama
   yang berbeda, dan selisih waktunya — walau sangat kecil — bisa dipakai
   menebak token huruf demi huruf. */
function samaAman(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

const qAksesCari = db.prepare('SELECT * FROM akses WHERE hash=?');
const qAksesPakai = db.prepare(
  'UPDATE akses SET terakhir=?, dipakai=dipakai+1 WHERE id=?');
const qAksesTambah = db.prepare(
  'INSERT INTO akses (id,penyewa,nama,hash,peran,aktif,dibuat,dipakai) ' +
  "VALUES (?,?,?,?,?,1,?,0)");
const qAksesDaftar = db.prepare(
  'SELECT id,penyewa,nama,peran,aktif,dibuat,dicabut,terakhir,dipakai FROM akses ' +
  'ORDER BY penyewa, dibuat DESC');
const qAksesCabut = db.prepare("UPDATE akses SET aktif=0, dicabut=? WHERE id=?");
const qAksesHidup = db.prepare("UPDATE akses SET aktif=1, dicabut=NULL WHERE id=?");

/* Penundaan bertambah pada token salah, per alamat. Bukan penguncian: yang
   terkunci adalah orang yang salah ketik, sedangkan yang menebak-nebak
   berpindah alamat. Penundaan memperlambat penebakan tanpa mengunci siapa pun. */
const gagal = new Map();
function tundaGagal(ip) {
  const n = (gagal.get(ip) || 0) + 1;
  gagal.set(ip, n);
  setTimeout(() => {
    const v = (gagal.get(ip) || 1) - 1;
    if (v <= 0) gagal.delete(ip); else gagal.set(ip, v);
  }, 60000);
  return Math.min(2000, n * 120);
}

/**
 * Siapa penelepon ini.
 *
 * Mengembalikan { admin:true } untuk token admin, atau baris akses untuk
 * token perangkat, atau null. Token admin SENGAJA tidak mengembalikan
 * penyewa: ia tidak boleh menyentuh data, hanya mengelola perangkat.
 */
function siapa(req) {
  const t = String(req.headers['x-exo-token'] || '');
  if (!t) return null;
  if (samaAman(t, TOKEN_ADMIN)) return { admin: true, penyewa: null, peran: 'admin' };
  const a = qAksesCari.get(hashToken(t));
  if (!a || !a.aktif) return null;
  qAksesPakai.run(new Date().toISOString(), a.id);
  return a;
}

function tokenBaru() {
  /* 32 byte acak kriptografis, ditulis base64url — cukup panjang untuk tidak
     bisa ditebak, cukup pendek untuk disalin sekali ke satu perangkat. */
  return crypto.randomBytes(32).toString('base64url');
}

function buatAkses(penyewa, nama, peran) {
  const t = tokenBaru();
  const id = 'ak_' + crypto.randomBytes(6).toString('hex');
  qAksesTambah.run(id, String(penyewa || 'utama'), String(nama || 'Perangkat'),
    hashToken(t), peran === 'baca' ? 'baca' : 'penuh', new Date().toISOString());
  /* Token dikembalikan SEKALI. Tidak ada jalan membacanya lagi — yang
     tersimpan hanya hashnya. */
  return { id: id, token: t, penyewa: penyewa, nama: nama };
}

/* Satu transaksi untuk seluruh kiriman. Setengah kiriman yang tersimpan
   adalah keadaan yang tidak bisa dipulihkan siapa pun: klien mengira
   semuanya sampai, server menyimpan sebagian. */
/* Penyewa diambil dari TOKENNYA, bukan dari yang dikirim klien. Klien tidak
   boleh memilih dirinya sendiri — itu sama saja dengan tidak ada perizinan. */
/* Penulisan yang DITOLAK penjaga penyewa tidak boleh masuk oplog.

   Kalau ia masuk, penyewa yang ditolak akan menarik kembali perubahannya
   sendiri lewat /pull dan menerapkannya di salinan lokalnya — sehingga
   layarnya menampilkan baris yang tidak ada di server, tanpa pernah
   diperbaiki. Penolakan yang diam jauh lebih berbahaya daripada penolakan
   yang berisik: yang berisik ketahuan hari itu juga.

   `changes` bernilai 0 berarti klausa WHERE pada upsert menahannya, yaitu
   id itu sudah dimiliki penyewa lain. */
function terapkan(ops, klien, penyewa) {
  let ditolak = [];
  db.exec('BEGIN');
  try {
    ops.forEach((o) => {
      const tabel = String(o.tabel || '');
      const id = String(o.id || '');
      if (!tabel || !id) return;
      const at = String(o.at || new Date().toISOString());
      if (o.aksi === 'hapus') {
        const h = qHapus.run(tabel, id, '{}', at, penyewa);
        if (!h.changes) { ditolak.push({ tabel: tabel, id: id, aksi: 'hapus' }); return; }
        qOp.run(tabel, id, 'hapus', null, at, klien || null, penyewa);
      } else {
        const data = JSON.stringify(o.data === undefined ? null : o.data);
        const h = qSet.run(tabel, id, data, at, penyewa);
        if (!h.changes) { ditolak.push({ tabel: tabel, id: id, aksi: 'set' }); return; }
        qOp.run(tabel, id, 'set', data, at, klien || null, penyewa);
      }
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { seq: seqKini(), ditolak: ditolak };
}

/* ---------------------------------------------------------------- rute */
const TLS = require('./tls');
const jadi = TLS.bikinServer(ENV, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const jalur = url.pathname.replace(/\/+$/, '') || '/';

  try {
    /* Kesehatan boleh dibaca tanpa token: aplikasi perlu tahu servernya hidup
       sebelum ia punya alasan mengirim token ke mana pun. Isinya sengaja
       tidak memuat apa pun tentang datanya. */
    if (jalur === '/api/data/health') {
      return kirimJSON(res, 200, {
        siap: true, versi: 1,
        berkas: path.basename(BERKAS),
        butuhToken: true
      });
    }

    const aku = siapa(req);
    if (!aku) {
      /* Ditunda sebelum menjawab. Yang salah ketik menunggu seperempat detik;
         yang menebak-nebak kehilangan ribuan percobaan per menit. */
      const ip = req.socket.remoteAddress || '?';
      await new Promise((r) => setTimeout(r, tundaGagal(ip)));
      return kirimJSON(res, 401, { error: 'Token salah, dicabut, atau belum disetel.' });
    }

    /* ---- pengelolaan perangkat: HANYA token admin ---- */
    if (jalur.indexOf('/api/data/akses') === 0) {
      if (!aku.admin) {
        return kirimJSON(res, 403, {
          error: 'Hanya token admin yang boleh mengelola perangkat.' });
      }
      if (req.method === 'GET') {
        /* Hash TIDAK ikut dikirim. Ia memang tidak bisa dikembalikan menjadi
           token, tetapi mengirimkannya juga tidak ada gunanya — dan yang tidak
           berguna sebaiknya tidak melintasi jaringan. */
        return kirimJSON(res, 200, { akses: qAksesDaftar.all() });
      }
      if (req.method === 'POST') {
        const body = await bacaBody(req);
        if (jalur === '/api/data/akses/cabut') {
          if (!body.id) return kirimJSON(res, 400, { error: 'id perangkat belum disebut.' });
          qAksesCabut.run(new Date().toISOString(), String(body.id));
          return kirimJSON(res, 200, { ok: true });
        }
        if (jalur === '/api/data/akses/hidupkan') {
          if (!body.id) return kirimJSON(res, 400, { error: 'id perangkat belum disebut.' });
          qAksesHidup.run(String(body.id));
          return kirimJSON(res, 200, { ok: true });
        }
        if (jalur === '/api/data/akses') {
          if (!String(body.nama || '').trim()) {
            return kirimJSON(res, 400, { error: 'Beri nama perangkatnya.' });
          }
          const baru = buatAkses(body.penyewa, body.nama, body.peran);
          return kirimJSON(res, 200, Object.assign({ ok: true }, baru, {
            catatan: 'Token ini hanya ditampilkan SEKALI. Salin sekarang — yang ' +
              'tersimpan di server hanya hashnya.' }));
        }
      }
      return kirimJSON(res, 404, { error: 'Jalur akses tidak dikenal.' });
    }

    /* Token admin BERHENTI di sini. Ia tidak boleh menyentuh data — kalau
       boleh, ia menjadi kunci serba bisa lagi, dan seluruh pemisahan ini
       hanya menambah langkah tanpa menambah keamanan. */
    if (aku.admin) {
      return kirimJSON(res, 403, {
        error: 'Token admin tidak bisa membaca atau menulis data.',
        petunjuk: 'Buat token perangkat lewat POST /api/data/akses, lalu pakai itu.' });
    }
    const PENYEWA = aku.penyewa;
    const BOLEH_TULIS = aku.peran !== 'baca';

    /* ---- seluruh isi, untuk perangkat yang baru pertama menyambung ---- */
    if (jalur === '/api/data/snapshot') {
      const out = {};
      /* Setiap baris dikirim sebagai { id, data } — bukan datanya saja.
         Tabel biasa memang menyimpan id di dalam objeknya, tetapi foto dan
         pengaturan tidak: identitasnya ada pada BARISNYA. Mengirim datanya
         saja membuat foto pulang tanpa nama, dan hilang tanpa suara. */
      for (const b of qSemua.all(PENYEWA)) {
        (out[b.tabel] = out[b.tabel] || []).push({ id: b.id, data: JSON.parse(b.data) });
      }
      return kirimJSON(res, 200, {
        seq: seqKini(), isi: out, baris: qHitung.get(PENYEWA).n, penyewa: PENYEWA });
    }

    /* ---- kiriman perubahan dari satu perangkat ---- */
    if (jalur === '/api/data/push' && req.method === 'POST') {
      const body = await bacaBody(req);
      if (!BOLEH_TULIS) {
        return kirimJSON(res, 403, { error: 'Perangkat ini hanya boleh membaca.' });
      }
      const ops = Array.isArray(body.ops) ? body.ops : [];
      if (!ops.length) return kirimJSON(res, 200, { ok: true, seq: seqKini(), diterima: 0 });
      const hasil = terapkan(ops, String(body.klien || ''), PENYEWA);
      if (hasil.ditolak.length) {
        /* Dicatat di server juga: baris yang ditolak berarti satu id dipakai
           dua penyewa, dan itu pertanda yang layak dilihat manusia. */
        console.warn('[tolak] penyewa=' + PENYEWA + ' menulis id milik penyewa lain: ' +
          hasil.ditolak.map((d) => d.tabel + '/' + d.id).join(', '));
      }
      return kirimJSON(res, 200, {
        ok: true, seq: hasil.seq,
        diterima: ops.length - hasil.ditolak.length,
        ditolak: hasil.ditolak });
    }

    /* ---- perubahan dari perangkat LAIN sejak nomor urut tertentu ---- */
    if (jalur === '/api/data/pull') {
      const sejak = Number(url.searchParams.get('sejak') || 0);
      const klien = String(url.searchParams.get('klien') || '');
      const semua = qSejak.all(sejak, PENYEWA);
      /* Perubahan milik sendiri tidak dikirim balik — klien sudah punya, dan
         menerapkannya lagi hanya akan menimpa suntingan yang lebih baru. */
      const ops = semua.filter((o) => !klien || o.klien !== klien).map((o) => ({
        seq: o.seq, tabel: o.tabel, id: o.id, aksi: o.aksi,
        data: o.data ? JSON.parse(o.data) : null, at: o.at
      }));
      const seq = semua.length ? semua[semua.length - 1].seq : sejak;
      return kirimJSON(res, 200, { seq: seq, ops: ops, adaLagi: semua.length >= 5000 });
    }

    /* ---- pesan sepetak nomor dokumen ---- */
    if (jalur === '/api/data/nomor' && req.method === 'POST') {
      const body = await bacaBody(req);
      const jenis = String(body.jenis || '').trim();
      if (!jenis) return kirimJSON(res, 400, { error: 'Jenis nomor belum disebut.' });
      if (!BOLEH_TULIS) {
        return kirimJSON(res, 403, { error: 'Perangkat ini hanya boleh membaca.' });
      }
      return kirimJSON(res, 200, pesanNomor(jenis, body.jumlah, PENYEWA));
    }

    /* ---- unggah awal: seluruh isi localStorage dipindahkan ke sini ----
       Dipisahkan dari /push karena maksudnya berbeda: ini bukan perubahan,
       melainkan pemindahan pertama. Ia menolak berjalan bila server sudah
       berisi, supaya tidak ada yang tidak sengaja menimpa data bersama
       dengan salinan lama miliknya sendiri. */
    if (jalur === '/api/data/migrasi' && req.method === 'POST') {
      const body = await bacaBody(req);
      if (!BOLEH_TULIS) {
        return kirimJSON(res, 403, { error: 'Perangkat ini hanya boleh membaca.' });
      }
      const sudah = qHitung.get(PENYEWA).n;
      if (sudah > 0 && !body.paksa) {
        return kirimJSON(res, 409, {
          error: 'Server sudah berisi ' + sudah + ' baris.',
          petunjuk: 'Sambungkan saja perangkat ini — datanya akan diambil dari server. ' +
            'Kirim paksa:true hanya bila Anda memang ingin menimpanya.'
        });
      }
      const ops = Array.isArray(body.ops) ? body.ops : [];
      const hasil = terapkan(ops, String(body.klien || ''), PENYEWA);
      /* Nomor dokumen ikut dipindahkan supaya penomoran melanjutkan, bukan
         mengulang dari satu dan menabrak dokumen yang sudah terbit. */
      const counters = body.counters || {};
      Object.keys(counters).forEach((k) => {
        qNomorSimpan.run(PENYEWA, k, Math.max(0, Math.round(Number(counters[k]) || 0)));
      });
      return kirimJSON(res, 200, {
        ok: true, seq: hasil.seq, baris: qHitung.get(PENYEWA).n,
        ditolak: hasil.ditolak });
    }

    /* ---- keadaan, untuk layar pengaturan ---- */
    if (jalur === '/api/data/keadaan') {
      const perTabel = db.prepare(
        'SELECT tabel, COUNT(*) AS n FROM baris WHERE dihapus=0 AND penyewa=? ' +
        'GROUP BY tabel ORDER BY n DESC'
      ).all(PENYEWA);
      /* Ukuran DIJUMLAHKAN dengan berkas -wal dan -shm. Dalam mode WAL,
         tulisan terbaru belum tentu sudah pindah ke berkas utama — melaporkan
         berkas utama saja membuat basis data berisi seribu baris terlihat
         seperti empat kilobyte, dan orang menyimpulkan datanya tidak masuk. */
      let ukuran = 0;
      [BERKAS, BERKAS + '-wal', BERKAS + '-shm'].forEach(function (f) {
        try { ukuran += fs.statSync(f).size; } catch (e) {}
      });
      return kirimJSON(res, 200, {
        seq: seqKini(), baris: qHitung.get(PENYEWA).n, ukuranByte: ukuran,
        berkas: BERKAS, perTabel: perTabel,
        /* Aplikasi menampilkan ini di layar pengaturan: yang memakai perlu
           tahu perangkat mana yang sedang tersambung, supaya yang tidak
           dikenali bisa dicabut. */
        penyewa: PENYEWA, perangkat: aku.nama, peran: aku.peran
      });
    }

    kirimJSON(res, 404, { error: 'Jalur tidak dikenal: ' + jalur });
  } catch (e) {
    kirimJSON(res, 500, { error: e.message });
  }
});

/* ------------------------------------------------- pembuatan token dari CLI
   Perangkat pertama harus mendapat tokennya dari suatu tempat, dan tempat itu
   tidak boleh berupa endpoint tanpa token. Jadi: dari baris perintah, oleh
   orang yang sudah bisa masuk ke servernya.

     node app/server/data-server.js --token-baru utama "Ponsel Hendra"
*/
const arg = process.argv.slice(2);
if (arg[0] === '--token-baru') {
  const hasil = buatAkses(arg[1] || 'utama', arg[2] || 'Perangkat', arg[3]);
  console.log('');
  console.log('  Perangkat : ' + hasil.nama);
  console.log('  Penyewa   : ' + hasil.penyewa);
  console.log('  Token     : ' + hasil.token);
  console.log('');
  console.log('  Salin sekarang — token ini TIDAK bisa dibaca lagi.');
  console.log('  Yang tersimpan di server hanya hashnya.');
  process.exit(0);
}
if (arg[0] === '--daftar-token') {
  qAksesDaftar.all().forEach((a) => {
    console.log([a.aktif ? '  aktif  ' : '  DICABUT', a.penyewa, a.nama,
      a.peran, a.dipakai + 'x', a.terakhir || '-'].join('  '));
  });
  process.exit(0);
}
if (arg[0] === '--cabut') {
  if (!arg[1]) { console.error('Sebutkan id perangkatnya.'); process.exit(1); }
  qAksesCabut.run(new Date().toISOString(), arg[1]);
  console.log('Dicabut: ' + arg[1]);
  process.exit(0);
}

const server = jadi.server;
const ALAMAT = TLS.alamat(ENV, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('data-server', PORT, ALAMAT));
  console.log('  berkas     : ' + BERKAS);
  const nBaris = db.prepare('SELECT COUNT(*) AS n FROM baris WHERE dihapus=0').get().n;
  const nAkses = db.prepare('SELECT COUNT(*) AS n FROM akses WHERE aktif=1').get().n;
  console.log('  baris      : ' + nBaris + '  (seq ' + seqKini() + ')');
  console.log('  perangkat  : ' + nAkses + ' aktif');
  console.log('  asal boleh : ' + ASAL.join(', '));
  if (!nAkses) {
    /* Server yang berdiri tanpa satu pun token perangkat tidak berguna bagi
       siapa pun, dan itu keadaan yang mudah tidak disadari. */
    console.log('');
    console.log('  Belum ada token perangkat. Buat satu:');
    console.log('    node app/server/data-server.js --token-baru utama "Perangkat pertama"');
  }
});
