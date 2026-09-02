/* ==========================================================================
   syarat.js — syarat & ketentuan pemakaian, beserta catatan persetujuannya
   --------------------------------------------------------------------------
   KENAPA BERVERSI

   Sebuah persetujuan yang tidak menyebut ia menyetujui APA tidak berguna
   ketika dipertanyakan. Karena itu yang disimpan bukan sekadar "sudah setuju"
   melainkan VERSI yang disetujui beserta waktunya. Saat isinya berubah,
   `VERSI` dinaikkan — dan semua orang diminta menyetujui lagi, otomatis,
   tanpa siapa pun perlu mengingat untuk memintanya.

   Menaikkan versi tanpa mengubah isinya berarti mengganggu semua orang tanpa
   alasan; mengubah isinya tanpa menaikkan versinya berarti orang terikat pada
   teks yang tidak pernah mereka baca. Keduanya salah, dan yang kedua lebih
   buruk.

   BAHASA YANG MENGIKAT

   Teksnya ditulis Bahasa Indonesia dan itulah yang mengikat. Terjemahannya
   disediakan agar bisa dibaca, bukan agar bisa dipersengketakan — dan
   kalimat itu sendiri ikut tertulis di dalam pasalnya, bukan hanya di dalam
   komentar ini.

   YANG BUKAN URUSAN BERKAS INI

   Ini aturan PEMAKAIAN aplikasi, bukan nasihat hukum dan bukan kontrak
   layanan kebersihan. Sebelum dipakai sungguhan pada pelanggan, isinya perlu
   diperiksa penasihat hukum perusahaan sendiri. Pasal terakhir mengatakan itu
   kepada pembacanya, bukan hanya kepada yang membaca kode.
   ========================================================================== */
var SYARAT = (function () {
  'use strict';

  /* Naikkan setiap kali isi pasal berubah. Bentuknya tanggal supaya terbaca
     manusia di dalam catatan persetujuan tanpa perlu tabel penerjemah. */
  var VERSI = '2026-08-24';

  var PASAL = [
    { judul: 'Untuk apa aplikasi ini',
      isi: [
        'MCS EXOCLEAN dipakai mengelola kebersihan gedung: mendaftarkan area ' +
        'dan objek, menyusun jadwal, mencatat kehadiran petugas, memantau ' +
        'mutu, mengelola bahan habis pakai, dan menyusun biaya.',
        'Angka biaya yang ditampilkan adalah biaya OPERASIONAL, bukan biaya ' +
        'penuh, dan sebagian angka lain adalah perkiraan yang disebut ' +
        'perkiraan di layarnya. Keputusan yang memakai angka itu tetap ' +
        'keputusan Anda.'
      ] },

    { judul: 'Akun ini milik Anda sendiri',
      isi: [
        'Satu akun untuk satu orang. Jangan dipakai bergantian, dan jangan ' +
        'diberikan kepada rekan kerja — seluruh catatan di aplikasi ini ' +
        'menyebut nama pemilik akun, dan catatan yang salah nama tidak bisa ' +
        'diperbaiki kemudian.',
        'Kata sandi sementara dari staf EXOCLEAN wajib diganti pada ' +
        'pemakaian pertama. Sandi yang diketahui dua orang tidak melindungi ' +
        'siapa pun.',
        'Bila Anda menduga akun Anda dipakai orang lain, ganti kata sandi ' +
        'sekarang juga dan beri tahu penyelia Anda.'
      ] },

    { judul: 'PIN transaksi', peran: ['korporat'],
      isi: [
        /* Yang disebut di sini HARUS sama dengan yang sungguh dijaga di
           kode. Naskah yang menjanjikan penjagaan yang belum ada lebih
           berbahaya daripada naskah yang tidak menjanjikan apa-apa: orang
           yang membacanya akan menyangka ada yang menahan, lalu berhenti
           berhati-hati sendiri. Saat jalur data keluar ditambahkan kelak,
           tambahkan penjagaannya lebih dulu, baru kalimatnya. */
        'PIN enam angka dipakai menyetujui perbuatan yang mengubah banyak ' +
        'data sekaligus: impor berkas CSV dan penyesuaian stok hasil opname.',
        'PIN berbeda dari kata sandi dan tidak pernah ditanyakan lewat ' +
        'telepon, WhatsApp, maupun surel oleh siapa pun — termasuk yang ' +
        'mengaku staf EXOCLEAN.',
        'PIN yang salah beberapa kali berturut-turut akan mengunci ' +
        'sementara. Itu disengaja.'
      ] },

    { judul: 'Data penghuni, petugas, dan foto', peran: ['korporat'],
      isi: [
        'Aplikasi ini menyimpan nama, nomor telepon, kehadiran, dan foto ' +
        'bukti kerja. Sebagian di antaranya data pribadi orang lain yang ' +
        'dipercayakan kepada Anda karena pekerjaan Anda.',
        'Pakailah sebatas keperluan pengelolaan kebersihan gedung. Jangan ' +
        'menyalin, mengunduh, atau meneruskannya untuk keperluan lain, dan ' +
        'jangan menyebarkannya kepada pihak yang tidak berkepentingan.',
        'Foto bukti kerja sering memuat wajah orang. Perlakukan seperti ' +
        'dokumen, bukan seperti gambar biasa.'
      ] },

    /* Pasal yang sama, ditulis ulang untuk pemilik ruangan. Ia BUKAN
       pengelola data siapa pun — ia justru orang yang namanya tercatat.
       Memberinya naskah pengelola berarti membebani orang dengan kewajiban
       yang tidak pernah bisa ia langgar, dan menyembunyikan satu-satunya
       hal yang benar-benar perlu ia ketahui: bahwa aduan dan penilaiannya
       BERNAMA. */
    { judul: 'Aduan dan penilaian Anda tercatat bernama', peran: ['penghuni'],
      isi: [
        'Aduan dan penilaian yang Anda kirim menyebut nama Anda, dan bisa ' +
        'dibaca staf kebersihan serta atasan mereka. Itu disengaja: aduan ' +
        'bernama bisa ditanyakan balik dan bisa dikabari hasilnya.',
        'Bila Anda lebih suka tidak menyebut nama, pakailah tag QR yang ' +
        'tertempel di ruangan. Aduan lewat tag tetap tanpa nama, dan tetap ' +
        'ditangani.',
        'Penilaian Anda menilai KEADAAN RUANGAN, bukan orangnya. Ia tidak ' +
        'dipakai sebagai nilai kinerja petugas kebersihan mana pun.'
      ] },

    { judul: 'Yang tidak boleh dilakukan', peran: ['korporat'],
      isi: [
        'Memasukkan data yang Anda tahu tidak benar — kehadiran fiktif, ' +
        'tugas yang ditandai selesai padahal belum, atau opname yang tidak ' +
        'dihitung.',
        'Mencoba membuka data korporat lain, menembus pembatasan hak akses, ' +
        'atau memakai cara otomatis untuk mengeruk isi aplikasi.',
        'Memakai aplikasi ini untuk hal di luar pengelolaan kebersihan ' +
        'gedung yang menjadi tanggung jawab Anda.'
      ] },

    { judul: 'Yang tidak boleh dilakukan', peran: ['penghuni'],
      isi: [
        'Mengirim aduan yang Anda tahu tidak benar, atau menilai ruangan ' +
        'yang tidak pernah Anda lihat hari itu.',
        'Memakai penilaian untuk menekan petugas tertentu. Bila ada masalah ' +
        'dengan seseorang, sampaikan kepada penyelianya — bukan lewat ' +
        'angka yang tidak bisa ia bantah.',
        'Mencoba membuka ruangan orang lain atau menembus pembatasan hak ' +
        'akses.'
      ] },

    { judul: 'Catatan aktivitas', peran: ['korporat'],
      isi: [
        'Perbuatan penting dicatat beserta nama, waktu, dan perangkatnya: ' +
        'masuk dan keluar, penggantian sandi dan PIN, impor, unduhan, ' +
        'opname, serta pembacaan percakapan orang lain.',
        'Catatan itu ada untuk melindungi Anda maupun perusahaan bila ' +
        'kelak ada yang dipertanyakan.'
      ] },

    /* Daftar yang sama tanpa perbuatan yang tidak pernah bisa ia lakukan.
       Menyebut PIN, impor, dan opname kepada orang yang tidak punya
       ketiganya bukan sekadar mubazir — ia membuat seluruh naskah terbaca
       sebagai formulir yang disalin, bukan sebagai keterangan tentang
       dirinya. */
    { judul: 'Catatan aktivitas', peran: ['penghuni'],
      isi: [
        'Perbuatan penting dicatat beserta nama, waktu, dan perangkatnya: ' +
        'masuk dan keluar, penggantian kata sandi, aduan yang Anda kirim, ' +
        'dan penilaian yang Anda beri.',
        'Catatan itu ada untuk melindungi Anda maupun perusahaan bila ' +
        'kelak ada yang dipertanyakan.'
      ] },

    { judul: 'Penghentian akses',
      isi: [
        'Akses dapat dihentikan bila Anda berhenti bekerja pada gedung ini, ' +
        'atau bila syarat ini dilanggar. Data yang sudah Anda masukkan tetap ' +
        'menjadi milik korporat pemilik gedung dan tidak ikut terhapus.'
      ] },

    { judul: 'Perubahan syarat',
      isi: [
        'Bila syarat ini berubah, aplikasi akan meminta persetujuan Anda ' +
        'sekali lagi sebelum bisa dipakai. Yang tercatat adalah versi yang ' +
        'Anda setujui beserta waktunya, bukan sekadar bahwa Anda pernah ' +
        'setuju.',
        'Naskah Bahasa Indonesia adalah naskah yang mengikat. Terjemahan ' +
        'disediakan agar isinya bisa dibaca, bukan untuk menggantikannya.',
        'Naskah ini mengatur pemakaian aplikasi dan bukan nasihat hukum. ' +
        'Sebelum dipakai pada pelanggan sungguhan, periksakan isinya kepada ' +
        'penasihat hukum perusahaan Anda.'
      ] }
  ];

  /**
   * Pasal yang berlaku bagi SATU peran.
   *
   * Tanpa `peran` berarti berlaku bagi semua. Penyaringan ini ada karena
   * naskah tunggal terbukti berbohong: pemilik ruangan dijanjikan akan
   * diminta PIN untuk impor CSV dan opname stok — dua hal yang tidak ada
   * satu pun di antara tiga halamannya, dengan PIN yang memang tidak pernah
   * ia buat. Naskah yang menjanjikan penjagaan yang tidak akan ia temui
   * mengajarinya bahwa naskah ini boleh tidak dibaca.
   */
  function pasal(peran) {
    if (!peran) return PASAL;
    return PASAL.filter(function (p) {
      return !p.peran || p.peran.indexOf(peran) >= 0;
    });
  }

  /* --------------------------------------------------------- persetujuan */

  function sudahSetuju(u) {
    return !!(u && u.syaratVersi === VERSI);
  }

  /**
   * Catat persetujuan.
   *
   * `bukti` menyebut CARA orangnya membuktikan diri manusia — bukan sekadar
   * bahwa ia melakukannya. Catatan yang hanya berbunyi "setuju" tidak bisa
   * menjawab pertanyaan apa pun setahun kemudian.
   */
  function setuju(userId, bukti) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan.') };
    var pada = U.nowISO();
    DB.update('users', userId, {
      syaratVersi: VERSI,
      syaratPada: pada,
      syaratBukti: String(bukti || '').slice(0, 120)
    });
    if (window.KEAMANAN && KEAMANAN.catat) {
      KEAMANAN.catat(userId, 'Menyetujui syarat & ketentuan versi ' + VERSI,
        'ok', window.KEAMANAN.namaPerangkat ? KEAMANAN.namaPerangkat() : '');
    }
    return { ok: true, versi: VERSI, pada: pada };
  }

  /* ------------------------------------------------- pembuktian manusia

     INI BUKAN PENJAGAAN KEAMANAN, dan jangan pernah diperlakukan begitu.

     Layar persetujuan berdiri DI BELAKANG kata sandi. Robot tidak bisa
     sampai ke sini tanpa sandinya, jadi tidak ada serangan otomatis yang
     dihalangi di tempat ini. Soalnya pun dibuat dan diperiksa di dalam
     peramban — siapa pun yang membuka Developer Tools bisa melewatinya
     dalam sepuluh detik.

     Gunanya satu, dan itu sah: menjadi bukti bahwa yang menekan "setuju"
     adalah seseorang yang membaca layarnya, bukan skrip yang menekan semua
     tombol. Karena itu jawabannya ikut tercatat pada persetujuannya.

     Tempat capcha benar-benar bekerja adalah formulir MASUK sesudah
     beberapa kali gagal — di sanalah percobaan otomatis sungguh terjadi,
     dan di sana ia harus diperiksa di server, bukan di peramban. */

  /* Bilangan ditulis dengan HURUF, bukan angka, supaya menjawabnya menuntut
     membaca — bukan sekadar menyalin apa yang terlihat.

     Kata operasinya 'ditambah' dan 'dikurangi', BUKAN 'tambah' dan 'kurang'.
     Dua yang terakhir sudah menjadi kunci kamus dengan arti lain — 'tambah'
     adalah tombol Add, dan 'kurang' adalah nilai mutu Poor. Memakainya di
     sini akan memunculkan soal berbunyi "six Add three". */
  var ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima',
               'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
               'sebelas', 'dua belas'];

  /**
   * Soal disimpan sebagai ANGKA, bukan sebagai kalimat jadi.
   *
   * Kalau kalimatnya disusun di sini, ia membeku pada bahasa yang berlaku
   * ketika soalnya dibuat — dan berpindah bahasa tidak memuat ulang halaman
   * di aplikasi ini, sehingga pemakai berbahasa Inggris membaca "enam tambah
   * tiga". Kalimatnya disusun oleh soalTeks() setiap kali digambar.
   */
  function tantangan() {
    var a = 2 + Math.floor(Math.random() * 7);
    var b = 1 + Math.floor(Math.random() * 5);
    var tambah = Math.random() < 0.6;
    if (!tambah && b > a) { var t = a; a = b; b = t; }
    return { a: a, b: b, tambah: tambah, jawab: tambah ? a + b : a - b };
  }

  function soalTeks(t) {
    if (!t) return '';
    return I18N.t(ANGKA[t.a]) + ' ' +
      I18N.t(t.tambah ? 'ditambah' : 'dikurangi') + ' ' +
      I18N.t(ANGKA[t.b]);
  }

  function cocok(t, isian) {
    if (!t) return false;
    var s = String(isian == null ? '' : isian).trim().toLowerCase();
    if (!s) return false;
    /* Angka maupun kata sama-sama diterima: yang diuji pemahamannya, bukan
       ketaatannya pada bentuk jawaban. */
    if (String(t.jawab) === s) return true;
    if (ANGKA[t.jawab] === s) return true;
    /* Yang membaca layar berbahasa Inggris akan mengetik "nine", bukan
       "sembilan". Menolaknya berarti menuntut orang menjawab dalam bahasa
       yang tidak sedang ia baca. */
    return String(I18N.t(ANGKA[t.jawab])).toLowerCase() === s;
  }

  return {
    VERSI: VERSI,
    pasal: pasal, sudahSetuju: sudahSetuju, setuju: setuju,
    tantangan: tantangan, soalTeks: soalTeks, cocok: cocok
  };
})();
