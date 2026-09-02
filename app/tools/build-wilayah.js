/* ==========================================================================
   build-wilayah.js — menyusun data wilayah Indonesia untuk aplikasi
   --------------------------------------------------------------------------
   Menjalankan:  node app/tools/build-wilayah.js

   Mengunduh dua berkas resmi lalu mengubahnya menjadi JSON siap pakai di
   app/data/wilayah/id/.

   SUMBER
     https://github.com/cahyadsn/wilayah          (kode & nama wilayah)
     https://github.com/cahyadsn/wilayah_kodepos  (kode pos per desa)
   Keduanya berlisensi MIT dan mengikuti Kepmendagri No. 300.2.2-2138
   Tahun 2025 — daftar resmi yang juga dipakai instansi pemerintah.

   MENGAPA DIUNDUH, BUKAN DIKETIK
   -------------------------------
   Ada 83.762 desa/kelurahan. Mengetiknya dari ingatan berarti menaruh
   ribuan tebakan ke dalam alamat kirim, dan kesalahannya baru ketahuan
   ketika paket tidak sampai. Angka-angka ini harus berasal dari sumber
   yang bisa ditelusuri dan diperbarui, bukan dari hafalan.

   MEMPERBARUI
   -----------
   Kemendagri memperbarui daftar wilayah setiap ada pemekaran. Jalankan
   ulang perintah di atas; berkas lama ditimpa. Tanggal dan nomor keputusan
   yang sedang dipakai tercatat di index.json supaya bisa dibandingkan.

   BENTUK KELUARAN
   ---------------
   data/wilayah/id/index.json   provinsi + daftar kab/kota  (dimuat sekali)
   data/wilayah/id/<kode>.json  kecamatan + desa + kode pos (per kab/kota)

   Dipecah per kabupaten/kota, bukan satu berkas raksasa: pengguna hanya
   perlu satu wilayah, dan memaksa ponsel mengunduh seluruh Indonesia untuk
   memilih satu kelurahan adalah pemborosan yang terasa di kuota mereka.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUMBER = {
  wilayah: 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql',
  kodepos: 'https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/master/db/wilayah_kodepos.sql'
};

const AKAR = path.resolve(__dirname, '..');
const TUJUAN = path.join(AKAR, 'data', 'wilayah', 'id');
const SINGGAH = path.join(AKAR, 'tools', '.cache-wilayah');

/* ------------------------------------------------------------------ unduh */

function unduh(url, tujuan) {
  return new Promise(function (selesai, gagal) {
    function ambil(u, sisaLoncat) {
      if (sisaLoncat < 0) return gagal(new Error('Terlalu banyak pengalihan: ' + url));
      https.get(u, { headers: { 'User-Agent': 'exoclean-build-wilayah' } }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return ambil(new URL(res.headers.location, u).toString(), sisaLoncat - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return gagal(new Error('HTTP ' + res.statusCode + ' saat mengambil ' + u));
        }
        const bagian = [];
        res.on('data', function (b) { bagian.push(b); });
        res.on('end', function () {
          const isi = Buffer.concat(bagian);
          fs.writeFileSync(tujuan, isi);
          selesai(isi.toString('utf8'));
        });
      }).on('error', gagal);
    }
    ambil(url, 5);
  });
}

async function ambilBerkas(nama, url) {
  const simpan = path.join(SINGGAH, nama);
  if (fs.existsSync(simpan)) {
    console.log('  pakai salinan lokal  ' + nama);
    return fs.readFileSync(simpan, 'utf8');
  }
  console.log('  mengunduh            ' + nama);
  return unduh(url, simpan);
}

/* ------------------------------------------------------------------ urai */

/**
 * Membaca pasangan (kode, nilai) dari pernyataan INSERT.
 *
 * Nama wilayah memuat tanda kutip tunggal — "Ma'rang", "Lho' Nga" — dan di
 * dalam SQL ditulis rangkap. Pengurai yang berhenti pada kutip pertama akan
 * memenggal nama-nama itu diam-diam, jadi kutip rangkap dipulihkan di sini.
 */
function uraiPasangan(sql) {
  const hasil = [];
  const re = /\(\s*'([0-9][0-9.]*)'\s*,\s*'((?:[^']|'')*)'\s*\)/g;
  let m;
  while ((m = re.exec(sql))) {
    /* Sebagian nama pada sumber berspasi ekor ("Jakarta Utara "). Dibiarkan,
       spasi itu ikut tercetak di label pengiriman dan membuat pencocokan
       nama antar-berkas gagal tanpa alasan yang terlihat. */
    hasil.push([m[1], m[2].replace(/''/g, "'").replace(/\s+/g, ' ').trim()]);
  }
  return hasil;
}

/** Kode pos boleh ditulis dengan atau tanpa kutip pada berkas sumber. */
function uraiKodePos(sql) {
  const peta = new Map();
  const re = /\(\s*'([0-9][0-9.]*)'\s*,\s*'?([0-9]{5})'?\s*\)/g;
  let m;
  while ((m = re.exec(sql))) peta.set(m[1], m[2]);
  return peta;
}

/** Nomor keputusan yang mendasari berkas, dibaca dari komentar kepalanya. */
function bacaDasar(sql) {
  const m = sql.match(/Kepmendagri[^\r\n]*/i);
  return m ? m[0].trim() : 'tidak tercantum pada berkas sumber';
}

/* ------------------------------------------------------------------ susun */

async function main() {
  fs.mkdirSync(SINGGAH, { recursive: true });
  fs.mkdirSync(TUJUAN, { recursive: true });

  console.log('Mengambil sumber resmi…');
  const [sqlWilayah, sqlKodePos] = await Promise.all([
    ambilBerkas('wilayah.sql', SUMBER.wilayah),
    ambilBerkas('wilayah_kodepos.sql', SUMBER.kodepos)
  ]);

  const baris = uraiPasangan(sqlWilayah);
  const kodePos = uraiKodePos(sqlKodePos);
  const dasar = bacaDasar(sqlWilayah);

  /* Kode berjenjang lewat titik: 32 / 32.01 / 32.01.01 / 32.01.01.2001 —
     jumlah titiknya langsung menyatakan tingkat wilayahnya. */
  const provinsi = [], kabupaten = [], kecamatan = [], desa = [];
  baris.forEach(function (r) {
    const tingkat = r[0].split('.').length;
    if (tingkat === 1) provinsi.push(r);
    else if (tingkat === 2) kabupaten.push(r);
    else if (tingkat === 3) kecamatan.push(r);
    else if (tingkat === 4) desa.push(r);
  });

  if (!provinsi.length || !desa.length) {
    throw new Error('Berkas sumber tidak berisi data yang dikenali — pengurai perlu diperiksa.');
  }

  const indukKab = new Map();   // kode kab -> daftar kecamatan
  kecamatan.forEach(function (k) {
    const kab = k[0].split('.').slice(0, 2).join('.');
    if (!indukKab.has(kab)) indukKab.set(kab, []);
    indukKab.get(kab).push(k);
  });

  const indukKec = new Map();   // kode kecamatan -> daftar desa
  desa.forEach(function (d) {
    const kec = d[0].split('.').slice(0, 3).join('.');
    if (!indukKec.has(kec)) indukKec.set(kec, []);
    indukKec.get(kec).push(d);
  });

  const kabPerProv = new Map();
  kabupaten.forEach(function (k) {
    const prov = k[0].split('.')[0];
    if (!kabPerProv.has(prov)) kabPerProv.set(prov, []);
    kabPerProv.get(prov).push(k);
  });

  /* ---- berkas per kabupaten/kota ---- */
  let tanpaKodePos = 0, totalBerkas = 0, totalBytes = 0;

  kabupaten.forEach(function (kab) {
    const namaProv = (provinsi.find(function (p) { return p[0] === kab[0].split('.')[0]; }) || [, ''])[1];
    const isi = {
      k: kab[0], n: kab[1], p: namaProv,
      kec: (indukKab.get(kab[0]) || []).map(function (kec) {
        return {
          n: kec[1],
          /* [nama, kodepos] — pasangan, bukan objek: 83.762 kali "nama"
             dan "pos" sebagai kunci menambah megabyte tanpa menambah arti. */
          d: (indukKec.get(kec[0]) || []).map(function (ds) {
            const pos = kodePos.get(ds[0]);
            if (!pos) tanpaKodePos++;
            return [ds[1], pos || ''];
          })
        };
      })
    };
    const berkas = path.join(TUJUAN, kab[0].replace(/\./g, '') + '.json');
    const teks = JSON.stringify(isi);
    fs.writeFileSync(berkas, teks);
    totalBerkas++; totalBytes += Buffer.byteLength(teks);
  });

  /* ---- indeks provinsi + kab/kota ---- */
  const index = {
    negara: 'ID',
    dasar: dasar,
    dibuat: new Date().toISOString().slice(0, 10),
    jumlah: {
      provinsi: provinsi.length, kabupaten: kabupaten.length,
      kecamatan: kecamatan.length, desa: desa.length,
      desaTanpaKodePos: tanpaKodePos
    },
    prov: provinsi.map(function (p) {
      return {
        k: p[0], n: p[1],
        /* "f" adalah nama berkas rincian tanpa akhiran. Ditulis di sini, bukan
           dihitung ulang oleh aplikasi, supaya aplikasi memakai aturan yang
           sama untuk Indonesia maupun negara lain — satu jalur, satu tempat
           yang bisa salah. */
        kab: (kabPerProv.get(p[0]) || []).map(function (k) {
          return { k: k[0], n: k[1], f: k[0].replace(/\./g, '') };
        })
      };
    })
  };
  const teksIndex = JSON.stringify(index);
  fs.writeFileSync(path.join(TUJUAN, 'index.json'), teksIndex);

  console.log('');
  console.log('Dasar hukum   : ' + dasar);
  console.log('Provinsi      : ' + provinsi.length);
  console.log('Kab/Kota      : ' + kabupaten.length);
  console.log('Kecamatan     : ' + kecamatan.length);
  console.log('Desa/Kelurahan: ' + desa.length);
  console.log('Tanpa kode pos: ' + tanpaKodePos +
    (tanpaKodePos ? '  <-- kolom kode pos tetap bisa diketik manual' : ''));
  console.log('');
  console.log('index.json    : ' + Math.round(Buffer.byteLength(teksIndex) / 1024) + ' KB');
  console.log('berkas kab    : ' + totalBerkas + ' berkas, ' +
    Math.round(totalBytes / 1024) + ' KB total, rata-rata ' +
    Math.round(totalBytes / totalBerkas / 1024 * 10) / 10 + ' KB');
  console.log('Tersimpan di  : ' + TUJUAN);
}

main().catch(function (e) {
  console.error('GAGAL: ' + e.message);
  process.exit(1);
});
