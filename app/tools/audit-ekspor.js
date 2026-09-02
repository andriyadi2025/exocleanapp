/* ==========================================================================
   audit-ekspor.js — mencari pemanggilan MODUL.namaYangTidakAda
   --------------------------------------------------------------------------
   `node --check` hanya memeriksa sintaks. Ia meloloskan `MCS.menitBaku(...)`
   pada hari nama itu terhapus dari daftar ekspor, dan galatnya baru muncul
   ketika seseorang membuka formulir yang memanggilnya — bisa berminggu-minggu
   kemudian, oleh orang lain, di layar yang sama sekali tidak sedang diubah.

   Itu bukan dugaan. Ia terjadi: satu tambalan mengganti baris ekspor dan ikut
   menghapus `menitBaku` dari daftarnya. Sintaksnya sah, seluruh berkas lolos
   pemeriksaan, dan formulir objek berhenti terbuka sama sekali.

   CARA KERJANYA

   Tiap berkas modul di sini berbentuk `var NAMA = (function () { … return
   { a: a, b: b }; })();`. Berkas ini membaca blok `return {…}` terakhir tiap
   modul sebagai daftar ekspornya, lalu mencari seluruh pemanggilan
   `NAMA.sesuatu` di seluruh berkas dan melaporkan yang tidak ada di daftar.

   YANG TIDAK DIPERIKSA, DAN KENAPA

   Nama yang diakses lewat variabel — `MCS[kunci]` — tidak bisa dilihat dari
   teks. Begitu pula modul yang tidak memakai bentuk IIFE. Keduanya dilewati
   diam-diam alih-alih dilaporkan sebagai salah: alat yang sering keliru
   membuat laporannya berhenti dibaca, dan laporan yang berhenti dibaca lebih
   buruk daripada tidak ada alat sama sekali.

   Jalankan:  node app/tools/audit-ekspor.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const AKAR = path.resolve(__dirname, '..');
const JS = path.join(AKAR, 'js');

function berkasJs(dir) {
  let hasil = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === 'node_modules') return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hasil = hasil.concat(berkasJs(p));
    else if (e.name.endsWith('.js')) hasil.push(p);
  });
  return hasil;
}

/* Blok return terakhir sebuah modul IIFE — di situlah daftar ekspornya. */
function ekspor(src) {
  const m = src.match(/\n  return \{([\s\S]*?)\n  \};\s*\n\}\)\(\);?\s*$/);
  if (!m) return null;
  const nama = new Set();
  /* `a: a`, `a` telanjang, dan `get a() {…}`. Yang terakhir penting: db.js
     mengekspor `raw` sebagai getter, dan tanpa mengenalinya alat ini
     melaporkan enam puluh satu pemanggilan sah sebagai salah — laporan yang
     sebagian besar keliru akan berhenti dibaca seluruhnya. */
  const isi = m[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
  let gm;
  const reGet = /\b(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(/g;
  while ((gm = reGet.exec(isi))) nama.add(gm[1]);
  isi.split(/[,\n]/).forEach(function (bagian) {
    const k = bagian.trim().split(':')[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(k)) nama.add(k);
  });
  return nama;
}

/* Nama modul global yang dideklarasikan berkas ini. */
function namaModul(src) {
  const m = src.match(/^(?:window\.)?(?:var\s+)?([A-Z][A-Z0-9_]*)\s*=\s*\(function/m);
  return m ? m[1] : null;
}

const berkas = berkasJs(JS);
const daftar = {};          /* NAMA -> Set ekspor */
const asal = {};

berkas.forEach(function (f) {
  const src = fs.readFileSync(f, 'utf8');
  const nm = namaModul(src);
  if (!nm) return;
  const ek = ekspor(src);
  if (!ek || !ek.size) return;
  daftar[nm] = ek;
  asal[nm] = path.relative(AKAR, f).replace(/\\/g, '/');
});

const modulNama = Object.keys(daftar);
if (!modulNama.length) { console.log('tidak ada modul terbaca'); process.exit(0); }

const temuan = [];
berkas.forEach(function (f) {
  const rel = path.relative(AKAR, f).replace(/\\/g, '/');
  const src = fs.readFileSync(f, 'utf8')
    /* Komentar dibuang: contoh pemakaian di dalam catatan sering menyebut
       nama yang memang sengaja belum ada. */
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const baris = src.split('\n');
  baris.forEach(function (b, i) {
    modulNama.forEach(function (nm) {
      const re = new RegExp('(?:^|[^\\w$.])' + nm + '\\.([A-Za-z_$][\\w$]*)', 'g');
      let m;
      while ((m = re.exec(b))) {
        const anggota = m[1];
        if (daftar[nm].has(anggota)) continue;
        temuan.push({ file: rel, baris: i + 1, modul: nm, anggota: anggota,
                      teks: b.trim().slice(0, 92) });
      }
    });
  });
});

if (!temuan.length) {
  console.log('SEHAT — ' + modulNama.length + ' modul, tidak ada pemanggilan ke nama yang tidak diekspor.');
  process.exit(0);
}

console.log('DITEMUKAN ' + temuan.length + ' pemanggilan ke nama yang TIDAK ADA di daftar ekspor:\n');
const perModul = {};
temuan.forEach(function (t) {
  const k = t.modul + '.' + t.anggota;
  (perModul[k] = perModul[k] || []).push(t);
});
Object.keys(perModul).sort().forEach(function (k) {
  const l = perModul[k];
  console.log('  ' + k + '   (' + l.length + 'x, diekspor dari ' + (asal[l[0].modul] || '?') + ')');
  l.slice(0, 3).forEach(function (t) {
    console.log('      ' + t.file + ':' + t.baris + '  ' + t.teks);
  });
  if (l.length > 3) console.log('      … ' + (l.length - 3) + ' lagi');
});
process.exit(1);
