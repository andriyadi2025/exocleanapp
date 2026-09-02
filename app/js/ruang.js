/* RUANG PENYIMPANAN — memisahkan data satu aplikasi dari aplikasi lain.

   Sebuah peramban hanya punya SATU localStorage per asal (origin). Selama
   exoclean dan MCS EXOCLEAN berbagi asal, keduanya juga berbagi sepuluh kunci
   penyimpanan: basis data, sesi, perangkat tepercaya, antrean WhatsApp, foto,
   berkas, dan setelan sinkronisasi. Bagi MCS yang berdiri sendiri, itu berarti
   ia menumpang di rumah orang lain.

   Penandanya `data-simpan` pada <body>:

     <body data-app="mcs">                     -> exoclean_*   (satu asal)
     <body data-app="mcs" data-simpan="mcs">   -> mcs_*        (rumah sendiri)

   Di repositori ini TIDAK ADA satu pun halaman yang memakai penandanya, dan
   itu disengaja: keempatnya dilayani dari satu asal, dan mcs.html memang
   harus melihat korporat yang didaftarkan admin lewat index.html. Memisahkan
   kuncinya di sini hanya akan menyembunyikan data yang sudah ada.

   Penandanya dipasang saat MCS dipasang SENDIRIAN di tempat pelanggan —
   tanpa EXOCLEAN di sebelahnya. Sudah diuji: dengan data-simpan="mcs", MCS
   membuka basis data kosong, menanam benihnya sendiri lewat js/semai-mcs.js,
   dan seluruh 34 layarnya berjalan tanpa satu pun modul pasar.

   Berkas ini harus dimuat PALING AWAL — db.js dan yang lain membaca kuncinya
   saat dimuat, bukan saat dipakai. */
var RUANG = (function () {

  var awalan = 'exoclean';
  try {
    var n = document.body && document.body.getAttribute('data-simpan');
    if (n) awalan = String(n).trim();
  } catch (e) { /* body belum ada: pakai bawaan */ }

  /** Nama kunci penyimpanan untuk aplikasi ini. kunci('db') -> 'mcs_db' */
  function kunci(nama) { return awalan + '_' + nama; }

  /** Benar bila aplikasi ini menyimpan datanya sendiri, terpisah. */
  function terpisah() { return awalan !== 'exoclean'; }

  return { awalan: awalan, kunci: kunci, terpisah: terpisah };
})();
