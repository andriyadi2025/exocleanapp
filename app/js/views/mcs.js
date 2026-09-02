/* ==========================================================================
   views/mcs.js — perakit layar MCS
   --------------------------------------------------------------------------
   Berkas ini dulu 15.166 baris dan memuat seluruh layar MCS. Isinya kini
   tersebar ke sepuluh berkas bertema; yang tinggal di sini hanya PERAKITAN.

   KENAPA URUTANNYA DITULIS DI SINI, BUKAN DIBIARKAN MENGIKUTI PEMUATAN

   MENU.susun memakai urutan kunci objek `pages` untuk halaman yang belum
   punya urutan tersimpan pada perannya. Bila tiap berkas mendaftarkan
   halamannya begitu saja, urutan menu akan menjadi urutan pemuatan berkas —
   sehingga memindahkan satu layar ke berkas lain diam-diam menggeser
   menunya, dan tidak ada satu pun tempat yang bisa dibaca untuk mengetahui
   urutan yang dimaksud.

   Daftar di bawah ini urutan yang dimaksud, dan ia bisa dibaca sekaligus.

   Halaman yang TIDAK ada di daftar tetap dimasukkan, di belakang. Layar baru
   yang lupa didaftarkan urutannya lebih baik muncul di posisi yang kurang
   tepat daripada hilang tanpa satu pun petunjuk kenapa.
   ========================================================================== */
var ViewMCS = (function () {
  'use strict';

  var URUT = {
    korporat: [
      "mcsBeranda",
      "mcsAduan",
      "mcsAbsensi",
      "mcsStok",
      "mcsTerima",
      "mcsInspeksi",
      "mcsJadwal",
      "mcsArea",
      "mcsTagihan",
      "mcsGaji",
      "mcsLokasi",
      "mcsPortofolio",
      "mcsPekerja",
      "mcsAkses",
      "mcsProfil",
      "mcsRonda",
      "mcsBiaya",
      "mcsKontrak",
      "mcsLatih",
      "mcsPortal",
      "mcsBeban",
      "mcsAset",
      "mcsK3",
      "mcsKerja",
      "mcsHirarki",
      "mcsKinerja",
      "mcsLaporan",
      "profil"
    ],
    petugas: [
      "pgBeranda",
      "pgArea",
      "profil"
    ],
    admin: [
      "korporat",
      "mcsNegara"
    ]
  };

  /* Akun sendiri — ganti sandi, bahasa, perangkat tepercaya. Dirakit di sini
     karena ia bukan layar MCS: ViewProfil yang memilikinya, dan dua peran
     memakai halaman yang sama persis. */
  VMCS.daftar('korporat', 'profil', ViewProfil.page('Akun'));
  VMCS.daftar('petugas', 'profil', ViewProfil.page('Akun'));

  function rakit(peta) {
    var sumber = VMCS._hal[peta] || {};
    var out = {};
    URUT[peta].forEach(function (k) { if (sumber[k]) out[k] = sumber[k]; });
    Object.keys(sumber).forEach(function (k) { if (!out[k]) out[k] = sumber[k]; });
    return out;
  }

  /* Layar yang dibuka TANPA masuk — portal pemilik gedung dan tag yang
     dipindai penghuni. Dipasang oleh views/mcs-lapor.js. */
  return {
    pagesKorporat: rakit('korporat'),
    pagesPetugas: rakit('petugas'),
    pagesAdmin: rakit('admin'),
    layarPublik: VMCS.layarPublik
  };
})();
