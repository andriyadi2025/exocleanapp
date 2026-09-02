/* ==========================================================================
   buat-menara-cakrawala.js — menghasilkan berkas CSV satu gedung utuh
   --------------------------------------------------------------------------
   Bukan data mainan. Ini gedung perkantoran enam lantai dengan ukuran yang
   masuk akal untuk Jakarta: satu tower di atas petak 1.200 m², halaman
   drop-off, parkir basement, dan pos satpam.

   KENAPA DIBUAT DENGAN SKRIP, BUKAN DIKETIK

   Enam lantai × tujuh ruangan × enam objek = lebih dari dua ratus baris. Yang
   diketik tangan akan salah di beberapa tempat, dan yang salahnya di tengah
   berkas tidak akan pernah ditemukan. Yang dihasilkan skrip bisa dibaca
   ulang, diperbaiki di satu tempat, dan dibuat ulang seluruhnya.

   ANGKANYA PERKIRAAN, DAN HARUS DIKOREKSI

   Luas ruangan, ukuran kaca, dan jumlah kloset di sini adalah angka yang
   lazim, bukan hasil ukur gedung Anda. Seluruh gunanya adalah menjadi titik
   awal yang bisa dibetulkan — mengisi dari kosong jauh lebih lama daripada
   membetulkan yang sudah ada.

   Jalankan:  node app/data/contoh/buat-menara-cakrawala.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const KELUAR = __dirname;

function csv(baris) {
  /* BOM supaya Excel berbahasa Indonesia tidak membaca berkasnya sebagai ANSI
     dan merusak nama berhuruf non-ASCII sejak baris pertama. */
  return '﻿' + baris.map(function (r) {
    return r.map(function (v) {
      const s = String(v === null || v === undefined ? '' : v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';');
  }).join('\r\n');
}

/* ======================================================== STRUKTUR TEMPAT */

const LOKASI = 'Menara Cakrawala';
const ALAMAT = 'Jl. Jenderal Sudirman Kav. 21';
const LUAS_TANAH = 3500;

/* Ruangan per lantai. Luas dalam m², angka lazim untuk tower sewa. */
const LANTAI_1 = [
  ['Lobi Utama',        'Lobi',        180],
  ['Resepsionis',       'Lobi',         24],
  ['Toilet Pria',       'Toilet',       18],
  ['Toilet Wanita',     'Toilet',       18],
  ['Koridor',           'Koridor',      60],
  ['Lift Lobby',        'Lift',         24]
];

const LANTAI_KANTOR = [
  ['Ruang Kerja',       'Ruang kerja', 320],
  ['Ruang Rapat',       'Rapat',        45],
  ['Pantry',            'Pantry',       20],
  ['Toilet Pria',       'Toilet',       18],
  ['Toilet Wanita',     'Toilet',       18],
  ['Koridor',           'Koridor',      55],
  ['Lift Lobby',        'Lift',         20]
];

const LANTAI_6 = [
  ['Kantin',            'Pantry',      150],
  ['Mushola',           'Mushola',      40],
  ['Toilet Pria',       'Toilet',       18],
  ['Toilet Wanita',     'Toilet',       18],
  ['Koridor',           'Koridor',      40],
  ['Lift Lobby',        'Lift',         20]
];

function ruanganLantai(n) {
  if (n === 1) return LANTAI_1;
  if (n === 6) return LANTAI_6;
  return LANTAI_KANTOR;
}

/* ============================================================ OBJEK & UKURAN

   TINGGI PLAFON dipakai menghitung dinding. Tiga meter adalah angka lazim
   untuk tower sewa; lobi biasanya lebih tinggi.

   PANJANG DINDING diisi KELILING ruangan, bukan satu sisi. Itu memang arti
   "panjang" bagi sebuah dinding yang mengelilingi ruangan, dan aturan muka
   `pt` di aplikasi mengalikannya dengan tinggi — hasilnya luas dinding
   seluruhnya. Mengisi satu sisi saja akan meleset empat kali lipat.             */

const TINGGI = 3;
const TINGGI_LOBI = 4.5;

/* Ruangan persegi panjang dengan perbandingan sisi yang masuk akal, sehingga
   P × L benar-benar sama dengan luas yang tercatat. Tanpa ini, objek "Lantai"
   akan punya luas yang berbeda dari ruangannya sendiri — dua angka yang
   seharusnya sama, dan selisihnya akan dikira galat perhitungan. */
function sisi(luas) {
  const l = Math.sqrt(luas / 1.6);              /* rasio 1,6 : 1 */
  const p = luas / l;
  return [Math.round(p * 10) / 10, Math.round(l * 10) / 10];
}

function keliling(luas) {
  const s = sisi(luas);
  return Math.round((s[0] + s[1]) * 2 * 10) / 10;
}

/* Objek yang lazim ada di tiap jenis ruangan, beserta cara mengukurnya.
   `dim(luas)` mengembalikan [panjang, lebar, tinggi, satuan, jumlah, takaran]. */
/* BERAPA KALI SEMINGGU tiap jenis objek benar-benar DIKERJAKAN — bukan
   berapa kali petugas lewat di ruangannya.

   Kosong berarti ikut jadwal ruangan, dan untuk lantai itu memang benar:
   lantai dipel tiap kali petugas datang. Yang lain tidak. Toilet kantor
   dilewati tiga kali sehari — 21 kali seminggu — tetapi klosetnya disikat
   penuh sekali sehari dan hanya dilap pada kunjungan berikutnya; kaca
   fasad ikut jadwal harian lobinya tetapi dicuci sepekan sekali.

   Tanpa angka-angka ini perkiraan bahan untuk BENDA salah dengan kelipatan:
   450 botol pembersih toilet sebulan untuk gedung enam lantai, sembilan
   kali pemakaian yang sungguh tercatat. Angka di bawah adalah kebiasaan
   gedung perkantoran pada umumnya, bukan hasil pengukuran — pengelola
   gedung yang sesungguhnya harus menimpanya dengan kebiasaannya sendiri. */
const KALI = {
  'Kaca / jendela': 1,
  'Dinding': 1,
  'Lemari': 2,
  'Pintu': 2,
  'Peralatan elektronik': 2,
  'Tanaman': 3,
  'Cermin': 7,
  'Bilik / kloset': 7,
  'Wastafel': 7,
  'Urinoir': 7
};

function objekRuangan(jenis, nama, luas) {
  const s = sisi(luas);
  const t = /Lobi/i.test(jenis) ? TINGGI_LOBI : TINGGI;
  const kel = keliling(luas);
  const out = [];
  function o(nm, jn, p, l, tg, jml, tak) {
    out.push({ nama: nm, jenis: jn, panjang: p, lebar: l, tinggi: tg,
               satuan: 'm', jumlah: jml, takaran: tak, kali: KALI[jn] || '' });
  }

  o('Lantai', 'Lantai / karpet', s[0], s[1], '', '', '');
  o('Dinding', 'Dinding', kel, '', t, '', '');

  if (/Toilet/i.test(jenis)) {
    /* Jumlah bilik mengikuti luas: satu bilik per enam meter persegi adalah
       kepadatan yang lazim di gedung perkantoran. */
    const bilik = Math.max(2, Math.round(luas / 6));
    o('Kloset', 'Bilik / kloset', '', '', '', bilik, 50);
    o('Wastafel', 'Wastafel', '', '', '', Math.max(2, Math.round(bilik / 2)), 20);
    if (/Pria/i.test(nama)) o('Urinoir', 'Urinoir', '', '', '', 2, 30);
    o('Cermin', 'Cermin', Math.round(luas / 6 * 10) / 10, '', 1, '', '');
    o('Dispenser Sabun', 'Dispenser / mesin', '', '', '', 1, 15);
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 2, 20);
    o('Pintu', 'Pintu', 0.9, '', 2.1, 1, '');
  } else if (/Lobi/i.test(jenis)) {
    o('Kaca Fasad', 'Kaca / jendela', 3, '', 2.5, Math.max(2, Math.round(luas / 30)), '');
    o('Meja Resepsionis', 'Meja', 2.4, 0.8, '', 1, '');
    o('Kursi Tunggu', 'Kursi', '', '', '', 6, 10);
    o('Tanaman Hias', 'Tanaman', '', '', '', 4, 5);
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 2, 20);
  } else if (/Ruang kerja/i.test(jenis)) {
    /* Satu meja per delapan meter persegi — kepadatan kantor sewa biasa. */
    const meja = Math.round(luas / 8);
    o('Kaca Jendela', 'Kaca / jendela', 2, '', 2.2, Math.max(4, Math.round(luas / 40)), '');
    o('Meja Kerja', 'Meja', 1.4, 0.7, '', meja, '');
    o('Kursi Kerja', 'Kursi', '', '', '', meja, 10);
    o('Lemari Arsip', 'Lemari', 1.2, 0.5, 1.8, 4, '');
    o('Tempat Sampah', 'Tempat sampah', '', '', '', Math.max(2, Math.round(meja / 8)), 20);
  } else if (/Rapat/i.test(jenis)) {
    o('Kaca Jendela', 'Kaca / jendela', 2, '', 2.2, 2, '');
    o('Meja Rapat', 'Meja', 3.6, 1.2, '', 1, '');
    o('Kursi Rapat', 'Kursi', '', '', '', 12, 10);
    o('Proyektor & Layar', 'Peralatan elektronik', '', '', '', 1, 10);
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 1, 20);
  } else if (/Pantry/i.test(jenis)) {
    o('Wastafel', 'Wastafel', '', '', '', 2, 20);
    o('Lemari Dapur', 'Lemari', 2.4, 0.6, 0.9, 1, '');
    o('Dispenser Air', 'Dispenser / mesin', '', '', '', 2, 15);
    o('Meja Makan', 'Meja', 1.8, 0.8, '', Math.max(1, Math.round(luas / 30)), '');
    o('Kursi', 'Kursi', '', '', '', Math.max(4, Math.round(luas / 8)), 10);
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 2, 20);
  } else if (/Koridor/i.test(jenis)) {
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 2, 20);
    o('Pintu Tangga Darurat', 'Pintu', 0.9, '', 2.1, 2, '');
  } else if (/Lift/i.test(jenis)) {
    o('Cermin Lift', 'Cermin', 1.8, '', 2, 2, '');
    o('Pintu Lift', 'Pintu', 1.1, '', 2.2, 2, '');
  } else if (/Mushola/i.test(jenis)) {
    o('Cermin', 'Cermin', 1.5, '', 1, 1, '');
    o('Lemari Mukena', 'Lemari', 1.2, 0.5, 1.8, 1, '');
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 1, 20);
  }
  return out;
}

/* Objek pada petak terbuka — tidak berbangunan, jadi tidak berdinding. */
function objekPetak(nama, jenis, luas) {
  const s = sisi(luas);
  const out = [];
  function o(nm, jn, p, l, tg, jml, tak) {
    out.push({ nama: nm, jenis: jn, panjang: p, lebar: l, tinggi: tg,
               satuan: 'm', jumlah: jml, takaran: tak, kali: KALI[jn] || '' });
  }
  if (/Taman/i.test(jenis)) {
    o('Paving & Drop-off', 'Lantai / karpet', s[0], s[1], '', '', '');
    o('Tanaman', 'Tanaman', '', '', '', 20, 5);
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 4, 20);
  } else if (/Parkir/i.test(jenis)) {
    o('Lantai Parkir', 'Lantai / karpet', s[0], s[1], '', '', '');
    o('Dinding Basement', 'Dinding', keliling(luas), '', 2.8, '', '');
    o('Tempat Sampah', 'Tempat sampah', '', '', '', 3, 20);
  } else if (/Pos/i.test(jenis)) {
    o('Lantai', 'Lantai / karpet', s[0], s[1], '', '', '');
    o('Kaca Pos', 'Kaca / jendela', 1.5, '', 1.2, 3, '');
    o('Meja Jaga', 'Meja', 1.2, 0.6, '', 1, '');
    o('Kursi', 'Kursi', '', '', '', 2, 10);
  }
  return out;
}

const KEPALA = [
  'Lokasi', 'Alamat', 'Luas tanah', 'Area', 'Jenis area', 'Luas area',
  'Bangunan', 'Lantai', 'Ruangan', 'Jenis ruangan', 'Luas ruangan',
  'Objek', 'Jenis objek', 'Panjang', 'Lebar', 'Tinggi', 'Satuan ukuran',
  'Jumlah', 'Takaran', 'Kali per minggu'
];

const struktur = [KEPALA];

function barisPetak(nama, jenis, luas, alamat, luasTanah) {
  const ob = objekPetak(nama, jenis, luas);
  if (!ob.length) {
    struktur.push([LOKASI, alamat || '', luasTanah || '', nama, jenis, luas,
      '', '', '', '', '', '', '', '', '', '', '', '', '']);
    return;
  }
  ob.forEach(function (o, i) {
    struktur.push([LOKASI, i ? '' : (alamat || ''), i ? '' : (luasTanah || ''),
      nama, jenis, luas, '', '', '', '', '',
      o.nama, o.jenis, o.panjang, o.lebar, o.tinggi, o.satuan, o.jumlah, o.takaran]);
  });
}

/* Petak yang berdiri sendiri — tanpa bangunan, objeknya menempel langsung. */
barisPetak('Halaman & Drop-off', 'Taman', 600, ALAMAT, LUAS_TANAH);
barisPetak('Parkir Basement', 'Parkir', 900);
barisPetak('Pos Satpam', 'Pos Security', 12);

/* Petak gedung, dengan towernya. */
for (let n = 1; n <= 6; n++) {
  ruanganLantai(n).forEach(function (r) {
    const ob = objekRuangan(r[1], r[0], r[2]);
    ob.forEach(function (o) {
      struktur.push([LOKASI, '', '', 'Gedung Utama', 'Bangunan', 1200,
        'Tower A', 'Lantai ' + n, r[0], r[1], r[2],
        o.nama, o.jenis, o.panjang, o.lebar, o.tinggi, o.satuan, o.jumlah,
        o.takaran, o.kali]);
    });
  });
}

fs.writeFileSync(path.join(KELUAR, 'menara-cakrawala-struktur.csv'), csv(struktur));

/* ========================================================= BAHAN HABIS PAKAI */

/* LINGKUP OBJEK, BUKAN LINGKUP AREA, untuk barang yang membersihkan BENDA.

   Ini pelajaran termahal dari memasukkan gedung sungguhan. Pembersih kaca
   yang dilingkupi area 'Lobi;Ruang kerja;Rapat' dihitung terhadap LUAS LANTAI
   ruangan-ruangan itu — 1.664 m² dikali frekuensi — dan perkiraannya menjadi
   958 botol sebulan seharga Rp27,8 juta, delapan puluh tiga persen dari
   seluruh daftar belanja. Yang sebenarnya dilap hanyalah kacanya.

   Aturannya sederhana: kalau barangnya membersihkan BENDA (kaca, kloset,
   wastafel, tempat sampah), lingkupi dengan objeknya. Kalau ia menyapu
   BIDANG luas (lantai, koridor), lingkup area sudah benar.                    */

const bahan = [[
  'Nama', 'Satuan', 'Harga', 'Stok awal', 'Minimum', 'Isi', 'Satuan isi',
  'Cakupan m2', 'Dipakai di area', 'Membersihkan objek', 'Bahaya', 'Catatan'
], [
  /* CAKUPAN adalah luas yang dibersihkan oleh SATU KEMASAN, bukan luas
     yang dibasahi oleh satu liter larutan siap pakai. Semula ditulis 80
     m² per botol — setara 12,5 ml konsentrat per meter persegi, kira-kira
     sepuluh kali lipat pemakaian sungguhan — dan perkiraannya menjadi
     2.404 botol sebulan. Satu liter konsentrat diencerkan 1:100 menjadi
     seratus liter larutan; mengepel memakai sekitar 50 ml larutan per
     meter persegi. Jadi sekitar 2.000 m² — diambil 800 supaya masih
     berpihak pada gudang, bukan pada anggaran. */
  'Pembersih Lantai Serbaguna', 'botol', 26000, 60, 15, 1000, 'ml',
  800, 'semua', 'Lantai', 'Iritasi kulit / mata', 'wangi lemon'
], [
  /* Diukur terhadap luas KACA dan CERMIN, bukan lantai ruangannya. */
  /* Siap pakai, disemprot langsung: sekitar 10 ml per m² kaca, jadi 500 ml
     menjangkau kira-kira 50 m². Ingat aplikasi menghitung kaca DUA SISI. */
  'Pembersih Kaca', 'botol', 29000, 24, 6, 500, 'ml',
  50, '', 'Kaca;Cermin', 'Mengandung amonia', ''
], [
  /* Kloset dan wastafel diukur per satuan dengan takaran ml, bukan per m² —
     karena itu cakupan m² dikosongkan dan isi kemasannya yang dipakai. */
  'Pembersih Toilet', 'botol', 34000, 36, 10, 500, 'ml',
  '', '', 'Bilik;Urinoir', 'Korosif (asam / basa kuat)', 'jangan dicampur pemutih'
], [
  /* Sengaja TIDAK dilingkupi objek: pemutih hanya keluar untuk noda
     membandel, bukan tiap kali bilik dibersihkan. Melingkupinya ke bilik
     akan meramalkan 50 ml per bilik per pembersihan — angka yang rapi,
     percaya diri, dan salah. Lebih baik tidak meramal sama sekali. */
  'Pemutih Klorin', 'liter', 22000, 12, 4, 1000, 'ml',
  '', 'Toilet', '', 'Pemutih berbasis klorin', 'hanya untuk noda membandel'
], [
  'Pengharum Ruangan', 'botol', 18000, 20, 6, 300, 'ml',
  '', 'Toilet;Lobi;Mushola', '', '', ''
], [
  /* Habis dipakai PENGUNJUNG, bukan dipakai membersihkan. Takaran objek
     'dispenser' adalah dosis untuk MENGELAP dispensernya; memakainya di
     sini akan meramalkan segelas sabun sebulan untuk gedung enam lantai.
     Dibiarkan tanpa lingkup ukur — pemakaiannya dipantau dari riwayat
     pengambilan, bukan dari rumus. */
  'Sabun Cuci Tangan', 'galon', 95000, 8, 3, 5000, 'ml',
  '', 'Toilet;Pantry', '', 'Iritasi kulit / mata', 'untuk isi ulang dispenser'
], [
  'Tisu Gulung', 'roll', 6500, 240, 60, '', '', '', 'Toilet', '', '', ''
], [
  'Tisu Tangan Lipat', 'pak', 21000, 40, 12, '', '', '', 'Toilet', '', '', ''
], [
  'Kantong Sampah 60x90', 'pak', 19000, 30, 8, '', '', '', 'semua', 'Tempat sampah', '', ''
], [
  'Kantong Sampah 90x120', 'pak', 27000, 15, 5, '', '', '', 'Parkir;Taman', '', '', ''
], [
  'Kain Lap Microfiber', 'pcs', 12000, 50, 20, '', '', '', 'semua', '', '', ''
], [
  /* Sama seperti pembersih lantai: konsentrat, bukan larutan siap pakai. */
  'Karbol Wangi', 'liter', 24000, 18, 6, 1000, 'ml',
  700, 'Koridor;Lift;Lobi', 'Lantai', 'Iritasi kulit / mata', ''
]];

fs.writeFileSync(path.join(KELUAR, 'menara-cakrawala-bahan.csv'), csv(bahan));

console.log('menara-cakrawala-struktur.csv  ' + (struktur.length - 1) + ' baris data');
console.log('menara-cakrawala-bahan.csv     ' + (bahan.length - 1) + ' baris data');
