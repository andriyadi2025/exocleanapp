/* ==========================================================================
   aset.js — peralatan kebersihan: mesin, troli, tangga
   --------------------------------------------------------------------------
   YANG DITUTUP BERKAS INI

   MCS melacak BAHAN HABIS PAKAI (sabun, tisu, chemical) tetapi tidak melacak
   BARANG TAHAN LAMA. Mesin poles seharga puluhan juta, scrubber, vacuum
   basah-kering, tangga aluminium — semuanya tidak tercatat di mana pun.

   Tiga akibatnya, dan ketiganya mahal:

     · HILANG TANPA JEJAK. Barang yang tidak punya pemegang tercatat adalah
       barang yang hilangnya baru ketahuan saat dibutuhkan, dan saat itu tidak
       ada yang bisa ditanya.
     · RUSAK KARENA TIDAK PERNAH DISERVIS. Mesin poles punya jadwal servis;
       tanpa pengingat, servisnya terjadi setelah rusak — dan biaya perbaikan
       selalu lebih besar daripada biaya perawatan.
     · TIDAK ADA YANG BERTANGGUNG JAWAB. Kerusakan tanpa catatan siapa yang
       memegang saat itu berakhir sebagai "sudah begitu dari dulu".

   BUKU BESAR, BUKAN KOLOM

   Riwayat serah terima, servis, dan kerusakan disimpan sebagai baris tersendiri
   di mcsAsetRiwayat — bukan sebagai kolom `pemegangTerakhir` yang ditimpa.
   Pertanyaan yang perlu dijawab bukan "siapa yang pegang sekarang" melainkan
   "siapa yang pegang WAKTU ITU", dan kolom yang ditimpa tidak bisa menjawabnya.
   ========================================================================== */
window.ASET = (function () {
  'use strict';

  /* `manfaatBulan` = masa manfaat ekonomis bawaan, dalam BULAN.

     Angkanya perkiraan lazim untuk peralatan kebersihan gedung yang dipakai
     harian, bukan ketentuan pajak maupun kebijakan akuntansi siapa pun. Ia
     titik awal yang boleh — dan sebaiknya — ditimpa: mesin yang dipakai dua
     shift habis jauh lebih cepat daripada yang dipakai seminggu sekali. */
  /* `umurJam` = umur pakai bawaan dalam JAM OPERASI — bukan bulan.

     Dua ukuran yang berbeda, dan keduanya perlu. Umur BULAN menjawab
     “kapan nilainya habis di pembukuan”; umur JAM menjawab “kapan mesinnya
     benar-benar aus”. Vacuum yang dipakai dua jam sehari dan yang dipakai
     sepuluh jam sehari sama-sama berumur lima tahun di atas kertas, tetapi
     yang kedua sudah selesai jauh sebelum itu.

     NOL berarti TIDAK BERLAKU, bukan “belum diisi”. Troli, tangga, dan radio
     tidak punya umur jam operasi — tidak ada motor yang berputar di dalamnya
     — dan memberi mereka angka jam hanya melahirkan peringatan aus yang
     tidak berarti apa-apa. Gondola pun begitu: yang menentukan layak
     tidaknya adalah inspeksi tali dan rem, bukan lamanya dipakai.

     Angkanya kisaran umum kelas alat kebersihan gedung, bukan spesifikasi
     satu merek — karena itu ia REKOMENDASI yang boleh ditimpa. Buku manual
     pabrikan selalu lebih tahu daripada daftar bawaan mana pun. */
  var JENIS = [
    { kode: 'vacuum',   nama: 'Vacuum cleaner',        ikon: '🌀', servisBulan: 6,  manfaatBulan: 60, umurJam: 1500, servisJam: 250 },
    { kode: 'poles',    nama: 'Mesin poles lantai',    ikon: '💫', servisBulan: 3,  manfaatBulan: 96, umurJam: 2000, servisJam: 200 },
    { kode: 'scrubber', nama: 'Scrubber / auto-scrubber', ikon: '🚜', servisBulan: 3, manfaatBulan: 84, umurJam: 3000, servisJam: 250 },
    { kode: 'blower',   nama: 'Blower pengering',      ikon: '🌬️', servisBulan: 6,  manfaatBulan: 60, umurJam: 1500, servisJam: 300 },
    { kode: 'steam',    nama: 'Mesin steam / uap',     ikon: '♨️', servisBulan: 6,  manfaatBulan: 60, umurJam: 1200, servisJam: 200 },
    { kode: 'jet',      nama: 'Jet cleaner tekanan tinggi', ikon: '💦', servisBulan: 6, manfaatBulan: 60, umurJam: 1000, servisJam: 200 },
    { kode: 'troli',    nama: 'Troli kebersihan',      ikon: '🛒', servisBulan: 0,  manfaatBulan: 48, umurJam: 0, servisJam: 0 },
    { kode: 'tangga',   nama: 'Tangga',                ikon: '🪜', servisBulan: 12, manfaatBulan: 60, umurJam: 0, servisJam: 0 },
    { kode: 'gondola',  nama: 'Gondola / alat ketinggian', ikon: '🪢', servisBulan: 3, manfaatBulan: 120, umurJam: 0, servisJam: 0 },
    { kode: 'radio',    nama: 'Radio komunikasi',      ikon: '📻', servisBulan: 0,  manfaatBulan: 36, umurJam: 0, servisJam: 0 },
    { kode: 'lain',     nama: 'Peralatan lain',        ikon: '🧰', servisBulan: 0,  manfaatBulan: 60, umurJam: 0, servisJam: 0 }
  ];
  /**
   * Apakah nilai dari formulir ini berarti "tidak diisi".
   *
   * U.readForm mengembalikan **null** untuk kolom angka yang dikosongkan —
   * bukan '' dan bukan undefined. Penjaga yang hanya memeriksa keduanya
   * meloloskan null, lalu Number(null) menjadi 0, dan 0 di sini berarti
   * "tidak perlu servis berkala".
   *
   * Akibatnya: mesin poles yang didaftarkan tanpa mengetik jadwal servis
   * tersimpan sebagai mesin yang tidak pernah perlu diservis, dan
   * pengingatnya tidak akan pernah muncul. Tidak ada galat, tidak ada
   * tanda — hanya mesin yang pelan-pelan rusak.
   */
  function kosong(v) {
    return v === undefined || v === null || v === '' ||
           (typeof v === 'number' && isNaN(v));
  }

  function jenis(kode) {
    return JENIS.filter(function (j) { return j.kode === kode; })[0] || JENIS[JENIS.length - 1];
  }

  var KEADAAN = [
    { kode: 'dipakai', nama: 'Dipakai',       ikon: '🟢', warna: 'ok',
      ket: 'Sedang dipegang petugas dan berfungsi.' },
    { kode: 'gudang',  nama: 'Di gudang',     ikon: '📦', warna: 'muted',
      ket: 'Baik, tetapi sedang tidak dipakai siapa pun.' },
    { kode: 'servis',  nama: 'Sedang diservis', ikon: '🔧', warna: 'warn',
      ket: 'Di bengkel atau sedang diperbaiki.' },
    { kode: 'rusak',   nama: 'Rusak',         ikon: '⛔', warna: 'danger',
      ket: 'Tidak bisa dipakai dan belum diperbaiki.' },
    { kode: 'lepas',   nama: 'Dilepas',       ikon: '🗑️', warna: 'muted',
      ket: 'Dijual, dibuang, atau tidak lagi milik gedung.' }
  ];
  function keadaan(kode) {
    return KEADAAN.filter(function (k) { return k.kode === kode; })[0] || KEADAAN[1];
  }
  var AKTIF = ['dipakai', 'gudang', 'servis', 'rusak'];

  /* Jenis peristiwa pada buku besar riwayat. */
  var PERISTIWA = [
    { kode: 'daftar',  nama: 'Didaftarkan',    ikon: '📝' },
    { kode: 'serah',   nama: 'Serah terima',   ikon: '🤝' },
    { kode: 'kembali', nama: 'Dikembalikan',   ikon: '📦' },
    { kode: 'servis',  nama: 'Diservis',       ikon: '🔧' },
    { kode: 'rusak',   nama: 'Dilaporkan rusak', ikon: '⛔' },
    { kode: 'perbaiki',nama: 'Selesai diperbaiki', ikon: '✅' },
    { kode: 'pakai',   nama: 'Jam pakai dicatat', ikon: '⏱️' },
    { kode: 'lepas',   nama: 'Dilepas',        ikon: '🗑️' }
  ];
  function peristiwa(kode) {
    return PERISTIWA.filter(function (p) { return p.kode === kode; })[0] || PERISTIWA[0];
  }

  /* ============================================== JAM PAKAI & KEAUSAN
     Umur alat bermotor tidak habis oleh kalender, melainkan oleh jam
     berputarnya. Vacuum yang menganggur di gudang lima tahun masih baru;
     vacuum yang dipakai sepuluh jam sehari selama setahun sudah selesai. */

  /**
   * Total jam operasi sebuah alat — DIHITUNG dari riwayatnya, tidak disimpan.
   *
   * Penghitung yang disimpan hanya menyimpan angka terakhir: salah catat
   * sekali, dan tidak ada cara mengetahui angka mana yang keliru maupun
   * membatalkannya tanpa menebak. Dari riwayat, tiap penambahan punya
   * tanggal, pencatat, dan catatan — dan totalnya selalu bisa dihitung ulang.
   */
  function jamPakai(asetId) {
    return DB.where('mcsAsetRiwayat', function (r) { return r.asetId === asetId; })
      .reduce(function (t, r) { return t + (Number(r.jam) || 0); }, 0);
  }

  /**
   * Catat jam operasi. Menambah, tidak menimpa.
   *
   * Yang dicatat adalah jam yang BARU dipakai, bukan angka penunjuk pada
   * mesinnya. Keduanya sering dikira sama, dan menyalin angka penunjuk ke
   * kolom penambah akan melipatgandakan totalnya setiap kali dicatat.
   */
  function catatJam(asetId, jam, oleh, d) {
    d = d || {};
    var x = satu(asetId);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    var n = Number(jam) || 0;
    if (n <= 0) return { error: I18N.t('Jam pakai belum diisi.') };
    /* Batas kewarasan: 24 jam sehari adalah batas fisik, bukan aturan
       kebijakan. Angka di atasnya SELALU salah ketik — dan salah ketik pada
       kolom ini menua-kan alat yang sebenarnya masih baru. */
    if (n > 24 * 366) return { error: I18N.t('Jam pakai tidak masuk akal untuk satu catatan.') };
    catat(asetId, 'pakai', oleh, { jam: n, tgl: d.tgl || U.today(),
      catatan: d.catatan || '', pekerjaId: d.pekerjaId || null,
      pekerjaNama: d.pekerjaNama || '' });
    return { ok: true, jamPakai: jamPakai(asetId) };
  }

  /**
   * Keausan menurut jam operasi, atau null bila memang tidak berlaku.
   *
   * NULL, bukan nol persen. Troli dan tangga tidak punya umur jam; menampilkan
   * “0% aus” pada mereka berarti menjanjikan ukuran yang tidak pernah akan
   * bergerak, dan yang membacanya akan menyangka alatnya belum pernah dipakai.
   */
  /**
   * Umur jam yang BERLAKU untuk sebuah alat.
   *
   * Nilai pada alatnya adalah PENIMPA; bila belum pernah disetel, bawaan
   * jenisnya yang berlaku. Bedakan dua hal yang mudah tertukar:
   *
   *   · `undefined` = kolomnya belum pernah ada. Alat yang didaftarkan
   *     sebelum kolom ini lahir semuanya begini, dan membacanya sebagai nol
   *     berarti seluruh peralatan lama kehilangan ukuran keausannya diam-diam.
   *   · `0` = disetel sengaja, artinya “memang tidak diukur dengan jam”.
   *     Ini harus DIHORMATI, bukan diganti bawaan jenisnya.
   */
  function umurJamBerlaku(x) {
    if (!x) return 0;
    if (x.umurJam !== undefined && x.umurJam !== null && x.umurJam !== '') {
      return Math.max(0, Number(x.umurJam) || 0);
    }
    var jn = jenis(x.jenis);
    return (jn && jn.umurJam) || 0;
  }

  function ausJam(x) {
    if (!x) return null;
    var umur = umurJamBerlaku(x);
    if (!umur) return null;
    /* Jam yang dicatat menang; perkiraan dari jadwal hanya mengisi
       kekosongan. `dasar` ikut dikembalikan supaya layar bisa mengatakan
       yang mana — angka perkiraan dan angka terukur yang tampil serupa akan
       sama-sama dipercaya, dan yang perkiraan tidak pantas. */
    var e = jamEfektif(x);
    var jam = e.jam;
    /* PENJAGA: taksiran yang MELEBIHI umur alatnya hampir pasti berarti
       modelnya tidak cocok untuk jenis mesin itu, bukan bahwa mesinnya
       benar-benar habis.

       Terlihat saat mencoba menurunkan jam mesin poles dari frekuensi
       pembersihan rutin: mesin berumur tujuh bulan terbaca 106% aus, karena
       memoles adalah pekerjaan berkala dan bukan bagian kunjungan harian.
       Angka semacam itu tidak sekadar salah — ia membuat orang berhenti
       mempercayai angka lain di layar yang sama. Ditandai supaya layar bisa
       mengatakan ‘perkiraannya tidak masuk akal’ alih-alih memamerkan
       persentase yang mustahil.

       Hanya berlaku untuk taksiran. Jam yang SUNGGUH dicatat boleh melebihi
       umur alatnya — itu justru keadaan yang ingin dilaporkan. */
    var meragukan = e.dasar === 'jadwal' && jam > umur;
    return {
      jam: jam, umur: umur, dasar: e.dasar, rincian: e.rincian || null,
      meragukan: meragukan,
      sisa: Math.max(0, umur - jam),
      persen: Math.round(jam / umur * 100),
      habis: jam >= umur
    };
  }

  /** Alat yang jam pakainya sudah melewati umurnya. */
  function ausTerlewat(korporatId) {
    return semua(korporatId).filter(function (x) {
      var a = ausJam(x);
      return a && a.habis;
    });
  }
  /* ---------------------------------------------------------------- baca */

  /**
   * Daftar peralatan — SUDAH DISARING menurut cabang yang dijangkau
   * pengguna, sama seperti MCS.pekerja dan MCS.area.
   *
   * Cabang sebuah alat ditentukan MCSAKSES.lokasiAset(): lewat areanya, dan
   * bila areanya kosong lewat pemegangnya. Alat yang cabangnya tidak bisa
   * ditentukan sama sekali ikut lolos — lebih baik terlihat berlebihan
   * daripada hilang tanpa jejak.
   */
  function semua(korporatId, opsi) {
    opsi = opsi || {};
    var l = DB.where('mcsAset', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && AKTIF.indexOf(x.keadaan) < 0) return false;
      if (opsi.keadaan && x.keadaan !== opsi.keadaan) return false;
      if (opsi.pemegangId && x.pemegangId !== opsi.pemegangId) return false;
      return true;
    });
    if (window.MCSAKSES) l = MCSAKSES.saringAset(l);
    /* Yang butuh perhatian naik ke atas: rusak dulu, lalu yang servisnya
       terlewat, baru sisanya menurut nama. */
    return l.sort(function (a, b) {
      var pa = prioritas(a), pb = prioritas(b);
      if (pa !== pb) return pa - pb;
      return String(a.nama).localeCompare(String(b.nama));
    });
  }
  function prioritas(x) {
    if (x.keadaan === 'rusak') return 0;
    if (servisTerlewat(x)) return 1;
    if (x.keadaan === 'servis') return 2;
    return 3;
  }
  function satu(id) { return DB.find('mcsAset', id); }

  /* -------------------------------------------------------------- servis */

  /**
   * Kapan servis berikutnya jatuh tempo.
   *
   * Dihitung dari servis TERAKHIR, bukan dari tanggal beli: mesin yang baru
   * diservis bulan lalu tidak jatuh tempo hanya karena umurnya sudah tiga
   * tahun. Bila belum pernah diservis, tanggal beli yang jadi acuan.
   */
  function servisBerikut(x) {
    var bulan = Number(x.servisBulan);
    if (!bulan) return null;                    /* 0 = tidak perlu servis berkala */
    var acuan = x.servisTerakhir || x.tglBeli;
    if (!acuan) return null;
    var d = new Date(acuan + 'T00:00:00');
    d.setMonth(d.getMonth() + bulan);
    return U.iso(d);
  }
  /* ---------------------------------------------- servis menurut JAM PAKAI

     Mesin diservis menurut YANG LEBIH DULU TERCAPAI: kalender atau jam
     operasi. Vacuum yang menganggur tetap perlu diservis setahun sekali
     karena karetnya mengeras; vacuum yang berputar sepuluh jam sehari perlu
     diservis jauh sebelum setahun. Memakai satu ukuran saja selalu salah
     pada salah satu dari keduanya. */

  /* ======================================== JAM PAKAI DARI JADWAL

     Mencatat jam pakai dengan tangan adalah pekerjaan yang tidak pernah
     benar-benar dikerjakan orang. Sementara itu sistem ini SUDAH tahu berapa
     luas yang dibersihkan tiap area dan berapa kali seminggu — dan sebuah
     mesin yang ditempatkan di area itu berputar selama pembersihannya.

     RUJUKAN LAJU MESIN

     Laju di bawah dikonversi dari angka industri yang dipublikasikan (satuan
     aslinya kaki persegi per jam, dibagi 10,764), sekeluarga dengan ISSA 612
     yang sudah dipakai `BEBAN` untuk laju ORANG:

       · Auto-scrubber jalan-belakang  10.000–20.000 sqft/jam → 930–1.860 m²/jam
       · Auto-scrubber kendarai         20.000–40.000 sqft/jam → 1.860–3.720
       · Vacuum tegak (upright)          2.500–3.500 sqft/jam → 230–325
       · Vacuum gendong (backpack)       7.500–10.000 sqft/jam → 700–930
       · Pel & ember (pembanding)        3.000–5.000 sqft/jam → 280–465
       · Mesin poles cakram tunggal 175 rpm  1.250 sqft/jam → 116
       · Poles/burnish kecepatan tinggi 17"  2.000–3.000 sqft/jam → 186–279
       · Jet cleaner tongkat, air dingin      500–700 sqft/jam → 46–65
       · Jet cleaner + surface cleaner panas 1.000–1.300 sqft/jam → 93–121

     Yang dipakai di sini angka BAWAH kisarannya, bukan tengahnya: laju yang
     ditaksir terlalu tinggi menghasilkan jam pakai yang terlalu KECIL, dan
     mesin yang sebenarnya sudah aus akan terbaca masih muda. Salah ke arah
     itu jauh lebih mahal daripada sebaliknya.

     NOL PUNYA TIGA SEBAB YANG BERBEDA, dan membedakannya penting karena
     ketiganya butuh hal yang berbeda untuk dibuka:

       1. LAJUNYA BELUM DITEMUKAN — steam, jet cleaner. Jet cleaner memang
          jarang diukur per meter persegi: pekerjaannya bergantung tingkat
          kotor, bukan luas. Yang dibutuhkan: angka dari buku manual
          pabrikan yang dipakai korporatnya.

       2. FREKUENSINYA BELUM DIKETAHUI — mesin poles. Lajunya JUSTRU sudah
          ada (cakram tunggal 175 rpm ≈ 116 m²/jam), tetapi memoles adalah
          pekerjaan BERKALA, bukan bagian pembersihan rutin harian.
          Menurunkannya dari frekuensi rutin menghasilkan angka yang salah
          bukan sedikit melainkan berlipat: diukur saat dicoba, sebuah mesin
          poles berumur tujuh bulan terbaca 288 jam/bulan — 9,6 jam sehari
          memoles showroom — dan sampai 106% aus. Angka yang terbaca omong
          kosong tidak sekadar tidak berguna: ia membuat orang berhenti
          mempercayai angka lain di layar yang sama. Yang dibutuhkan:
          frekuensi pekerjaan BERKALA per area, yang belum disimpan sistem
          ini (BEBAN punya laju `dalam`, tetapi tidak punya frekuensinya).

       3. SATUANNYA MEMANG BUKAN m²/jam — blower. Ia menyala selama lantai
          perlu kering: jam per kali pengeringan. Memasukkannya ke tabel ini
          menghasilkan angka yang bentuknya benar tetapi artinya tidak ada.
          Yang dibutuhkan: model tersendiri, bukan laju.

     APA YANG DIANDAIKAN, DAN KENAPA ITU BATAS ATAS

     Perkiraan ini mengandaikan mesinnya dipakai pada SETIAP kunjungan
     terjadwal, atas SELURUH luas areanya. Untuk vacuum di ruang kerja itu
     mendekati benar. Untuk auto-scrubber itu terlalu tinggi — lantai keras
     tidak di-scrub tiap hari. Karena itu hasilnya SELALU disebut sebagai
     perkiraan, tidak pernah menggantikan jam yang sungguh dicatat, dan
     layar menyebutkan dasarnya. */

  /**
   * CARA sebuah mesin memakan jam — tiga model yang berbeda, bukan satu.
   *
   *   'rutin'  — ikut frekuensi pembersihan harian. Vacuum, scrubber, jet:
   *              mesinnya menyala sebagai bagian dari kunjungan biasa.
   *   'berkala'— ikut frekuensi pekerjaan BERKALA area itu. Mesin poles:
   *              lantai tidak dipoles tiap hari, dan menurunkannya dari
   *              frekuensi rutin menghasilkan angka berlipat-lipat.
   *   'kering' — tidak per meter persegi sama sekali. Blower menyala selama
   *              lantai perlu kering: JAM PER KALI, bukan m² per jam.
   *
   * Membedakan ketiganya adalah inti persoalannya. Memaksakan satu model ke
   * semua jenis sudah terbukti keliru saat dicoba: mesin poles berumur tujuh
   * bulan terbaca 106% aus karena diperlakukan sebagai mesin rutin.
   */
  var CARA_JAM = {
    vacuum: 'rutin', scrubber: 'rutin',
    /* JET CLEANER berkala, bukan rutin — dan ini kekeliruan yang sudah
       terulang dua kali, jadi ditulis terang-terangan di sini.

       Menyemprot tekanan tinggi adalah pemeliharaan berkala: area parkir
       dicuci sebulan sekali, bukan tiap hari. Menaruhnya di 'rutin' terukur
       sekali coba: 726 jam per bulan — dua puluh empat jam sehari menyemprot
       satu area parkir. Lajunya memang lambat (46 m²/jam), dan laju lambat
       dikali frekuensi harian selalu menghasilkan angka mustahil.

       ATURANNYA: sebelum menaruh jenis baru di 'rutin', tanyakan apakah
       mesinnya benar-benar menyala pada SETIAP kunjungan pembersihan. Kalau
       tidak, ia 'berkala'. */
    jet: 'berkala',
    poles: 'berkala', steam: 'berkala',
    blower: 'kering',
    troli: '', tangga: '', gondola: '', radio: '', lain: ''
  };

  /* m² per jam operasi mesin. 0 = belum ada rujukan yang bisa dipertanggung-
     jawabkan; lihat keterangan di atas. Semuanya BISA DITIMPA per korporat
     lewat konfig() — buku manual pabrikan yang dipakai gedungnya selalu lebih
     tahu daripada kisaran industri mana pun. */
  var LAJU_MESIN = {
    vacuum:   250,   /* upright wet & dry, ujung bawah kisaran */
    scrubber: 930,   /* auto-scrubber jalan-belakang, ujung bawah */
    /* Cakram tunggal 175 rpm. Sekarang bisa dipakai karena frekuensinya
       diambil dari kolom BERKALA area, bukan dari frekuensi rutin. */
    poles:    116,
    blower:   0,
    steam:    0,
    /* Tongkat air dingin, ujung bawah kisaran — bentuk pemakaian yang paling
       lazim di area parkir dan selasar gedung. Yang memakai surface cleaner
       air panas dua kali lebih cepat, dan itulah gunanya angka ini bisa
       ditimpa per korporat. */
    jet:      46,
    troli:    0,
    tangga:   0,
    gondola:  0,
    radio:    0,
    lain:     0
  };


  /* ==================================== PARAMETER MESIN PER KORPORAT
     Angka bawaan di atas adalah kisaran industri, dan kisaran industri tidak
     pernah persis menggambarkan satu gedung. Yang memakai jet cleaner dengan
     surface cleaner air panas dua kali lebih cepat daripada yang memakai
     tongkat; yang lantainya berminyak jauh lebih lambat.

     Karena itu semuanya bisa ditimpa. Yang TIDAK bisa saya isi dari sini —
     laju mesin steam, dan lama pengeringan blower — memang dikosongkan, dan
     kosongnya berarti fiturnya tidak berjalan untuk jenis itu sampai ada yang
     mengisinya. Itu jauh lebih baik daripada angka karangan yang terlihat
     resmi. */
  var KONFIG_BAWAAN = {
    /* Jam sebuah blower menyala untuk satu kali pengeringan. Nol = belum
       diisi, dan jam blower tidak dihitung sama sekali. */
    jamPengeringan: 0,
    /* Berapa bagian dari kunjungan rutin yang memerlukan pengeringan. 1
       berarti setiap kali; 0,3 berarti tiga dari sepuluh kali. */
    porsiPengeringan: 1
  };

  /** Parameter mesin yang BERLAKU untuk korporat ini. */
  function konfig(korporatId) {
    var k = DB.find('korporat', korporatId);
    var simpan = (k && k.asetConfig) || {};
    var out = { laju: {} };
    Object.keys(KONFIG_BAWAAN).forEach(function (kk) {
      out[kk] = simpan[kk] !== undefined ? Number(simpan[kk]) : KONFIG_BAWAAN[kk];
    });
    var lajuSimpan = simpan.laju || {};
    JENIS.forEach(function (j) {
      out.laju[j.kode] = lajuSimpan[j.kode] !== undefined
        ? Number(lajuSimpan[j.kode]) : (LAJU_MESIN[j.kode] || 0);
    });
    return out;
  }

  function simpanKonfig(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var c = Object.assign({ laju: {} }, k.asetConfig || {});
    c.laju = Object.assign({}, c.laju || {});
    if (patch.laju) {
      var salah = null;
      Object.keys(patch.laju).forEach(function (kode) {
        var v = patch.laju[kode];
        if (v === '' || v === null || v === undefined) { delete c.laju[kode]; return; }
        var n = Number(v);
        /* Batas kewarasan. Laju di atas 10.000 m²/jam berarti satu mesin
           membersihkan satu lapangan bola dalam sejam — selalu salah ketik,
           dan salah ketik di sini membuat jam pakai terbaca nyaris nol. */
        if (!(n >= 0 && n <= 10000)) { salah = kode; return; }
        c.laju[kode] = Math.round(n);
      });
      if (salah) return { error: I18N.t('Laju mesin tidak masuk akal.') };
    }
    if (patch.jamPengeringan !== undefined) {
      var j = Number(patch.jamPengeringan);
      if (!(j >= 0 && j <= 24)) return { error: I18N.t('Lama pengeringan tidak masuk akal.') };
      c.jamPengeringan = Math.round(j * 10) / 10;
    }
    if (patch.porsiPengeringan !== undefined) {
      var pp = Number(patch.porsiPengeringan);
      if (!(pp >= 0 && pp <= 1)) return { error: I18N.t('Porsi pengeringan harus antara 0 dan 1.') };
      c.porsiPengeringan = Math.round(pp * 100) / 100;
    }
    DB.update('korporat', korporatId, { asetConfig: c });
    return { ok: true };
  }
  /**
   * Perkiraan jam operasi sebulan dari jadwal areanya, atau null bila tidak
   * dapat dihitung.
   *
   * DIBAGI RATA di antara mesin sejenis yang ditempatkan di area yang sama.
   * Tanpa itu, tiga vacuum di satu lobi masing-masing tercatat memakan
   * seluruh jam pembersihan lobi — tiga kali lipat jam yang sungguh terjadi,
   * dan ketiganya akan terbaca aus bersamaan padahal beban dibagi bertiga.
   */
  function jamDariJadwal(x) {
    if (!x || !x.areaId) return null;
    if (!window.MCS || !MCS.areaSatu || !window.BEBAN) return null;
    var cara = CARA_JAM[x.jenis] || '';
    if (!cara) return null;
    var a = MCS.areaSatu(x.areaId);
    if (!a) return null;
    var c = konfig(x.korporatId);
    var laju = c.laju[x.jenis] || 0;
    var h = BEBAN.hitungArea(a, BEBAN.config(x.korporatId));
    if (!h || !h.frekuensi) return null;
    var luas = Number(a.luas) || 0;
    /* 4,345 minggu per bulan — angka yang sama dengan yang dipakai
       perhitungan bahan, supaya dua layar tidak berbeda delapan persen. */
    var kunjunganBulan = h.frekuensi * 4.345;
    var jamBulan = 0, dasarHitung = '';

    if (cara === 'kering') {
      /* BLOWER — jam per kali pengeringan, bukan m² per jam. Luas areanya
         tidak ikut sama sekali: mengeringkan lobi 400 m² dan lobi 40 m²
         sama-sama menuntut blower menyala sampai lantainya kering. */
      if (!c.jamPengeringan) return null;
      jamBulan = kunjunganBulan * c.jamPengeringan * (c.porsiPengeringan || 0);
      dasarHitung = 'kering';
    } else if (cara === 'berkala') {
      /* MESIN POLES / STEAM — ikut frekuensi pekerjaan BERKALA area itu,
         bukan kunjungan rutin. Area yang belum diisi frekuensi berkalanya
         tidak menghasilkan taksiran sama sekali — dan itu jawaban yang
         benar, bukan kekurangan yang perlu ditambal dengan angka rutin. */
      var berkala = Number(a.berkalaPerBulan) || 0;
      if (!berkala || !laju || !luas) return null;
      jamBulan = luas * berkala / laju;
      dasarHitung = 'berkala';
    } else {
      /* RUTIN — vacuum, scrubber, jet. */
      if (!laju || !luas) return null;
      jamBulan = luas * kunjunganBulan / laju;
      dasarHitung = 'rutin';
    }
    var luasBulan = luas * kunjunganBulan;
    /* DB.where LANGSUNG, bukan semua().

       semua() mengurutkan daftarnya memakai prioritas(), yang memanggil
       servisTerlewat() → servisPerluJam() → jamDariJadwal() — yaitu fungsi
       ini sendiri. Rekursi saling-panggil yang tidak pernah berhenti, dan
       galatnya bukan ‘terlalu dalam’ di tempat yang jelas melainkan
       RangeError di dalam beban.js, sepuluh bingkai jauhnya dari sebabnya.
       Ketahuan hanya karena dijalankan. */
    var berbagi = DB.where('mcsAset', function (y) {
      return y.korporatId === x.korporatId && y.areaId === x.areaId &&
             y.jenis === x.jenis && y.keadaan !== 'lepas';
    }).length || 1;
    return {
      jamPerBulan: Math.round(jamBulan / berbagi * 10) / 10,
      luasBulan: Math.round(luasBulan),
      luas: luas,
      laju: laju,
      cara: dasarHitung,
      kunjunganBulan: Math.round(kunjunganBulan * 10) / 10,
      berkalaPerBulan: Number(a.berkalaPerBulan) || 0,
      jamPengeringan: c.jamPengeringan,
      berbagi: berbagi,
      areaNama: a.nama
    };
  }

  /**
   * Jam operasi yang DIPAKAI menghitung keausan, berikut dasarnya.
   *
   *   'catat'  — dijumlahkan dari yang sungguh dicatat orang. Selalu menang.
   *   'jadwal' — perkiraan dari jadwal areanya, dipakai HANYA bila belum ada
   *              satu pun catatan. Sebuah perkiraan tidak boleh menutupi
   *              angka yang sungguh diukur; ia hanya mengisi kekosongan.
   *
   * Sejak tanggal beli sampai hari ini, supaya perkiraannya sepadan dengan
   * jam kumulatif — bukan jam sebulan.
   */
  function jamEfektif(x) {
    var dicatat = jamPakai(x.id);
    if (dicatat > 0) return { jam: dicatat, dasar: 'catat' };
    var j = jamDariJadwal(x);
    if (!j) return { jam: 0, dasar: 'tidakTahu' };
    var mulai = x.tglBeli || '';
    if (!mulai) return { jam: 0, dasar: 'tidakTahu' };
    var hari = Math.max(0, (new Date(U.today() + 'T00:00:00') -
      new Date(mulai + 'T00:00:00')) / 86400000);
    return {
      jam: Math.round(j.jamPerBulan * (hari / 30.44) * 10) / 10,
      dasar: 'jadwal', rincian: j
    };
  }
  /** Selang servis jam yang BERLAKU — aturan sama dengan umurJamBerlaku(). */
  function servisJamBerlaku(x) {
    if (!x) return 0;
    if (x.servisJam !== undefined && x.servisJam !== null && x.servisJam !== '') {
      return Math.max(0, Number(x.servisJam) || 0);
    }
    var jn = jenis(x.jenis);
    return (jn && jn.servisJam) || 0;
  }

  /**
   * Jam operasi SEJAK servis terakhir — bukan jam seumur hidup alatnya.
   *
   * Yang menentukan perlu-tidaknya diservis adalah pemakaian sesudah servis
   * yang lalu. Memakai total seumur hidup berarti alat yang baru saja
   * diservis tetap tercatat terlewat selamanya, dan peringatan yang tidak
   * pernah bisa dipadamkan akan berhenti dibaca orang.
   *
   * Tanpa tanggal servis terakhir, acuannya tanggal beli; tanpa keduanya,
   * seluruh riwayat dihitung — itu memang yang benar untuk alat yang belum
   * pernah diservis sama sekali.
   */
  function jamSejakServis(x) {
    if (!x) return 0;
    var acuan = x.servisTerakhir || x.tglBeli || '';
    return DB.where('mcsAsetRiwayat', function (r) {
      return r.asetId === x.id && r.peristiwa === 'pakai' &&
             (!acuan || String(r.tgl || '') >= acuan);
    }).reduce(function (t, r) { return t + (Number(r.jam) || 0); }, 0);
  }

  /**
   * Keadaan servis menurut jam, atau null bila jenisnya tidak diukur begitu.
   *
   * `belumAdaCatatan` DISEBUT, bukan disamakan dengan “masih aman”. Alat yang
   * jam pakainya tidak pernah dicatat akan selamanya terbaca 0 jam — dan
   * itu bukan berarti ia belum dipakai, melainkan bahwa tidak ada yang tahu.
   * Layar yang menyamakan keduanya menjanjikan pengawasan yang tidak terjadi.
   */
  function servisPerluJam(x) {
    var selang = servisJamBerlaku(x);
    if (!selang) return null;
    var totalCatatan = jamPakai(x.id);
    var dasar = 'catat';
    var jam = jamSejakServis(x);
    if (!totalCatatan) {
      /* Belum ada catatan sama sekali — pakai perkiraan dari jadwal, dihitung
         sejak servis terakhir (atau sejak dibeli bila belum pernah). */
      var j = jamDariJadwal(x);
      var acuan = x.servisTerakhir || x.tglBeli || '';
      if (j && acuan) {
        var hari = Math.max(0, (new Date(U.today() + 'T00:00:00') -
          new Date(acuan + 'T00:00:00')) / 86400000);
        jam = Math.round(j.jamPerBulan * (hari / 30.44) * 10) / 10;
        dasar = 'jadwal';
      }
    }
    return {
      selang: selang,
      jam: jam,
      dasar: dasar,
      sisa: Math.max(0, selang - jam),
      persen: Math.round(jam / selang * 100),
      /* PERKIRAAN TIDAK PERNAH MENJADIKAN ALAT ‘TERLEWAT’.

         Ia mengandaikan mesinnya dipakai setiap kunjungan atas seluruh luas
         area — batas atas, bukan kenyataan. Menuduh sebuah alat terlambat
         servis atas dasar taksiran akan membuat orang mengirim mesin yang
         sebenarnya masih baik, dan sesudah dua tiga kali seperti itu seluruh
         peringatan servis berhenti dipercaya. Perkiraan boleh MENGINGATKAN;
         hanya jam yang sungguh dicatat yang boleh MENUDUH. */
      terlewat: dasar === 'catat' && jam >= selang,
      segera: jam >= selang * 0.8,
      belumAdaCatatan: totalCatatan === 0
    };
  }
  function servisTerlewat(x) {
    if (x.keadaan === 'lepas' || x.keadaan === 'servis') return false;
    /* YANG LEBIH DULU TERCAPAI — kalender atau jam operasi. */
    var pj = servisPerluJam(x);
    if (pj && pj.terlewat) return true;
    var b = servisBerikut(x);
    return !!b && b < U.today();
  }
  /** Jatuh tempo dalam 30 hari ke depan — untuk diingatkan sebelum telat. */
  function servisSegera(x) {
    if (x.keadaan === 'lepas' || x.keadaan === 'servis') return false;
    var pjs = servisPerluJam(x);
    if (pjs && pjs.segera) return true;
    var b = servisBerikut(x);
    if (!b) return false;
    var batas = new Date(); batas.setDate(batas.getDate() + 30);
    return b >= U.today() && b <= U.iso(batas);
  }

  /* -------------------------------------------------------------- tulis */

  function daftar(korporatId, d, oleh) {
    d = d || {};
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama peralatan belum diisi.') };
    var jn = jenis(d.jenis);
    var x = DB.insert('mcsAset', {
      korporatId: korporatId,
      no: nomorAset(korporatId),
      nama: String(d.nama).trim(),
      jenis: jn.kode,
      merek: String(d.merek || '').trim(),
      model: String(d.model || '').trim(),
      nomorSeri: String(d.nomorSeri || '').trim(),
      tglBeli: d.tglBeli || null,
      hargaBeli: Math.max(0, Math.round(Number(d.hargaBeli) || 0)),
      /* Bawaan diambil dari jenisnya, tetapi boleh ditimpa: buku manual
         pabrikan lebih tahu daripada daftar bawaan mana pun. */
      servisBulan: kosong(d.servisBulan)
        ? jn.servisBulan : Math.max(0, Math.round(Number(d.servisBulan))),
      servisTerakhir: d.servisTerakhir || null,
      /* Masa manfaat SELALU disimpan dalam bulan, betapa pun satuan yang
         dipilih di formulir. Menyimpan angka beserta satuannya berarti "3"
         menjadi tidak jelas selamanya bagi setiap kode yang membacanya
         nanti, dan tiap pembaca harus ingat memeriksa satuannya. */
      manfaatBulan: kosong(d.manfaatBulan)
        ? jn.manfaatBulan : Math.max(0, Math.round(Number(d.manfaatBulan))),
      /* Umur pakai dalam JAM OPERASI. Bawaan dari jenisnya, boleh ditimpa. */
      umurJam: kosong(d.umurJam)
        ? (jn.umurJam || 0) : Math.max(0, Math.round(Number(d.umurJam))),
      /* Servis tiap berapa JAM OPERASI. Berdampingan dengan servisBulan,
         bukan menggantikannya — lihat servisPerluJam(). */
      servisJam: kosong(d.servisJam)
        ? (jn.servisJam || 0) : Math.max(0, Math.round(Number(d.servisJam))),
      keadaan: keadaan(d.keadaan || 'gudang').kode,
      pemegangId: d.pemegangId || null,
      areaId: d.areaId || null,
      /* Kode pindai sejak didaftarkan — supaya stikernya bisa langsung
         ditempel di badan mesin, dan riwayatnya bisa dibuka dengan kamera
         tanpa mencari-cari di daftar. */
      kodePindai: MCS.kodePindaiBaru(),
      catatan: String(d.catatan || '').trim(),
      foto: (d.foto || []).slice()
    });
    catat(x.id, 'daftar', oleh, { catatan: d.catatan || '' });
    return { ok: true, aset: satu(x.id) };
  }

  function nomorAset(korporatId) {
    var n = DB.where('mcsAset', function (x) { return x.korporatId === korporatId; }).length + 1;
    return 'AST-' + String(n).padStart(4, '0');
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    if (d.nama !== undefined && !String(d.nama).trim()) {
      return { error: I18N.t('Nama peralatan belum diisi.') };
    }
    var isi = {};
    ['nama', 'merek', 'model', 'nomorSeri', 'catatan'].forEach(function (k) {
      if (d[k] !== undefined) isi[k] = String(d[k] || '').trim();
    });
    if (d.jenis !== undefined) isi.jenis = jenis(d.jenis).kode;
    if (d.tglBeli !== undefined) isi.tglBeli = d.tglBeli || null;
    if (d.servisTerakhir !== undefined) isi.servisTerakhir = d.servisTerakhir || null;
    if (d.areaId !== undefined) isi.areaId = d.areaId || null;
    if (d.hargaBeli !== undefined) isi.hargaBeli = Math.max(0, Math.round(Number(d.hargaBeli) || 0));
    /* Dikosongkan berarti "kembali ke bawaan jenisnya", BUKAN "nol".
       Sebelumnya mengubah alat apa pun tanpa menyentuh kolom ini menolkan
       jadwal servisnya — kerusakan yang terjadi diam-diam pada tiap suntingan. */
    if (!kosong(d.servisBulan)) {
      isi.servisBulan = Math.max(0, Math.round(Number(d.servisBulan)));
    } else if (d.servisBulan !== undefined) {
      isi.servisBulan = jenis(d.jenis !== undefined ? d.jenis : x.jenis).servisBulan;
    }
    if (!kosong(d.manfaatBulan)) {
      isi.manfaatBulan = Math.max(0, Math.round(Number(d.manfaatBulan)));
    } else if (d.manfaatBulan !== undefined) {
      isi.manfaatBulan = jenis(d.jenis !== undefined ? d.jenis : x.jenis).manfaatBulan;
    }
    /* Foto sebelumnya TIDAK PERNAH tersimpan saat mengubah — medannya ada di
       daftar() tetapi tidak di sini, jadi foto yang ditambahkan lewat Ubah
       hilang begitu dialognya ditutup, tanpa galat apa pun.

       Hanya ditulis bila formulirnya memang mengirimnya: formulir yang tidak
       memuat kolom foto tidak boleh menghapus foto yang sudah ada. */
    if (d.foto !== undefined) isi.foto = (d.foto || []).slice();
    DB.update('mcsAset', id, isi);
    return { ok: true };
  }

  /**
   * Nilai ekonomis peralatan pada hari ini.
   *
   * Memakai penyusutan GARIS LURUS: harga beli dibagi rata sepanjang masa
   * manfaatnya, tanpa nilai sisa. Itu cara paling sederhana yang ada, dan
   * dipilih justru karena itu — yang dibutuhkan gedung adalah "kapan alat ini
   * harus dianggarkan penggantinya", bukan angka yang bisa dipertahankan di
   * hadapan pemeriksa pajak.
   *
   * Mengembalikan null bila harga beli atau tanggal belinya belum diisi.
   * Menghitungnya dari nol akan menghasilkan nilai buku nol untuk mesin yang
   * baru dibeli kemarin — dan angka yang salah lebih berbahaya daripada
   * angka yang tidak ada, karena ia dipercaya.
   */
  function ekonomi(x) {
    if (!x) return null;
    var harga = Number(x.hargaBeli) || 0;
    var bulan = x.manfaatBulan !== undefined && x.manfaatBulan !== null
      ? Number(x.manfaatBulan) : jenis(x.jenis).manfaatBulan;
    if (!harga || !bulan || !x.tglBeli) {
      return { siap: false, harga: harga, manfaatBulan: bulan || 0,
               kurang: !harga ? 'harga' : (!x.tglBeli ? 'tanggal' : 'manfaat') };
    }
    var beli = new Date(x.tglBeli + 'T00:00:00');
    var kini = new Date();
    var umur = (kini.getFullYear() - beli.getFullYear()) * 12 +
               (kini.getMonth() - beli.getMonth());
    if (kini.getDate() < beli.getDate()) umur--;
    umur = Math.max(0, umur);

    var perBulan = harga / bulan;
    var terpakai = Math.min(umur, bulan);
    var nilaiBuku = Math.max(0, Math.round(harga - terpakai * perBulan));
    var habis = new Date(beli.getFullYear(), beli.getMonth() + bulan, beli.getDate());

    return {
      siap: true,
      harga: harga,
      manfaatBulan: bulan,
      umurBulan: umur,
      sisaBulan: Math.max(0, bulan - umur),
      penyusutanBulan: Math.round(perBulan),
      nilaiBuku: nilaiBuku,
      persen: Math.min(100, Math.round(umur * 100 / bulan)),
      habisPada: U.iso(habis),
      /* Sudah lewat masa manfaatnya. BUKAN berarti rusak — banyak mesin masih
         bekerja baik sesudahnya. Ia berarti nilainya sudah habis dibukukan dan
         penggantinya layak masuk anggaran. */
      habis: umur >= bulan
    };
  }

  /** Ringkasan nilai seluruh peralatan — untuk kepala halaman. */
  function nilaiTotal(korporatId) {
    var l = semua(korporatId);
    var harga = 0, buku = 0, susut = 0, belumLengkap = 0, sudahHabis = 0;
    l.forEach(function (x) {
      var e = ekonomi(x);
      if (!e || !e.siap) { belumLengkap++; return; }
      harga += e.harga; buku += e.nilaiBuku; susut += e.penyusutanBulan;
      if (e.habis) sudahHabis++;
    });
    return { alat: l.length, harga: harga, nilaiBuku: buku,
             penyusutanBulan: susut, belumLengkap: belumLengkap, sudahHabis: sudahHabis };
  }

  function hapus(id) {
    var x = satu(id);
    if (x) (x.foto || []).forEach(function (f) { DB.delPhoto(f); });
    riwayat(id).forEach(function (r) { DB.remove('mcsAsetRiwayat', r.id); });
    DB.remove('mcsAset', id);
    return { ok: true };
  }

  /* ------------------------------------------------------------ riwayat */

  /**
   * Satu baris riwayat.
   *
   * DUA orang disebut di baris yang sama, dan keduanya perlu:
   *
   *   pekerjaId / pekerjaNama — SUBJEKNYA. Siapa yang menerima, memakai,
   *       atau mengembalikan barangnya.
   *   olehId / olehNama       — PENGINPUTNYA. Siapa yang mengetikkan baris
   *       ini. Bukan orang yang sama, dan sering bukan orang yang sama:
   *       penyerahan hampir selalu dicatat penyelia, bukan penerimanya.
   *
   * `olehId` sempat tidak ada — hanya namanya yang disimpan. Nama bisa
   * berubah, bisa kembar, dan tidak bisa ditelusuri kembali ke akun mana
   * pun; riwayat yang menyebut “Budi” pada korporat dengan dua Budi tidak
   * menjawab apa-apa. Absensi dan mutasi stok sudah menyimpan keduanya sejak
   * awal; berkas ini tertinggal.
   *
   * Baris lama TIDAK diisi mundur. Tidak ada yang tahu id siapa yang
   * seharusnya di sana, dan menebaknya berarti mengarang bukti.
   */
  function catat(asetId, kode, oleh, d) {
    d = d || {};
    return DB.insert('mcsAsetRiwayat', {
      asetId: asetId,
      peristiwa: peristiwa(kode).kode,
      pada: U.nowISO(),
      tgl: d.tgl || U.today(),
      pekerjaId: d.pekerjaId || null,
      pekerjaNama: d.pekerjaNama || '',
      biaya: Math.max(0, Math.round(Number(d.biaya) || 0)),
      /* JAM OPERASI yang ditambahkan oleh peristiwa ini.

         Ditaruh di riwayat, BUKAN sebagai penghitung pada asetnya. Sebuah
         penghitung hanya menyimpan angka terakhir: begitu ada yang salah
         catat, tidak ada cara mengetahui angka mana yang keliru maupun
         membatalkannya. Dari riwayat, totalnya selalu bisa dihitung ulang,
         dan tiap penambahan punya tanggal, pencatat, serta catatannya. */
      jam: Math.max(0, Number(d.jam) || 0),
      catatan: String(d.catatan || '').trim(),
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : ''
    });
  }

  function riwayat(asetId, batas) {
    var l = DB.where('mcsAsetRiwayat', function (r) { return r.asetId === asetId; })
      .sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); });
    return batas ? l.slice(0, batas) : l;
  }

  /**
   * Serah terima ke petugas.
   *
   * Menuntut nama petugas, bukan boleh kosong: barang yang "dipakai" tanpa
   * pemegang tercatat adalah persis keadaan yang membuat kehilangan tidak bisa
   * ditelusuri — dan itulah satu-satunya alasan modul ini ada.
   */
  function serah(id, pekerjaId, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    var p = MCS.pekerjaSatu(pekerjaId);
    if (!p) return { error: I18N.t('Pilih petugas yang menerima.') };
    /* DUA yang diperiksa, bukan satu: alatnya dan penerimanya. Alat cabang
       lain tidak boleh diserahkan dari sini, dan alat cabang sendiri tidak
       boleh berpindah ke orang cabang lain — yang kedua justru cara paling
       rapi sebuah mesin meninggalkan gedung tanpa ada yang keberatan.
       Ditolak, bukan diperingatkan: batas kewenangan, bukan ketidakcocokan
       pencatatan. Lihat catatan panjang di MCS.tandaiHadir(). */
    if (window.MCSAKSES) {
      var sb = MCSAKSES.sebabTakBolehTulis(oleh);
      if (sb && sb.kode === 'lingkup') return { error: sb.pesan };
      if (!MCSAKSES.bolehAset(x, oleh)) {
        return { error: I18N.t('Peralatan ini tercatat di cabang yang tidak Anda kelola.') };
      }
      if (!MCSAKSES.bolehPekerja(p, oleh)) {
        return { error: I18N.t('{nama} bertugas di cabang yang tidak Anda kelola. Minta cabangnya ditambahkan ke akun Anda bila memang perlu.')
          .replace('{nama}', p.nama) };
      }
    }
    if (x.keadaan === 'rusak' || x.keadaan === 'servis') {
      return { error: I18N.t('Peralatan sedang {keadaan} — perbaiki dulu sebelum diserahkan.')
        .replace('{keadaan}', I18N.t(keadaan(x.keadaan).nama).toLowerCase()) };
    }
    /* ------------------------------------------- PERINGATAN, BUKAN TOLAKAN

       Dua keadaan yang perlu disebut sebelum barang berpindah tangan:

         · Penerimanya sudah TIDAK AKTIF. Menyerahkan mesin senilai belasan
           juta kepada orang yang sudah berhenti bekerja adalah cara paling
           sunyi kehilangan terjadi — namanya masih ada di daftar pilihan,
           dan tidak ada satu pun layar yang menyebutnya aneh.
         · Penerimanya hari ini TIDAK MASUK. Alatnya akan tercatat di
           gedung sementara orangnya tidak ada.

       Tidak ditolak: penyerahan sering dicatat menyusul, dan absensi
       sering baru diisi sore hari. Menolaknya berarti memaksa orang
       memilih nama lain — dan nama yang salah jauh lebih berbahaya
       daripada nama yang benar tetapi ditandai. */
    var peringatan = [];
    if (p.aktif === false) {
      peringatan.push(I18N.t('{nama} sudah tidak aktif sebagai petugas.')
        .replace('{nama}', p.nama));
    } else if (window.MCS && MCS.absensiHari) {
      var tgl = U.today();
      var ab = DB.first('mcsAbsensi', function (x) {
        return x.pekerjaId === p.id && x.tgl === tgl;
      });
      if (ab && ab.status && !MCS.statusHadir(ab.status).bekerja) {
        peringatan.push(I18N.t('{nama} hari ini tercatat {status}.')
          .replace('{nama}', p.nama)
          .replace('{status}', I18N.t(MCS.statusHadir(ab.status).nama).toLowerCase()));
      }
    }

    DB.update('mcsAset', id, { keadaan: 'dipakai', pemegangId: p.id });
    catat(id, 'serah', oleh, { pekerjaId: p.id, pekerjaNama: p.nama, catatan: (d && d.catatan) || '' });
    return { ok: true, peringatan: peringatan };
  }

  function kembali(id, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    var p = x.pemegangId ? MCS.pekerjaSatu(x.pemegangId) : null;
    DB.update('mcsAset', id, { keadaan: 'gudang', pemegangId: null });
    catat(id, 'kembali', oleh, { pekerjaId: p ? p.id : null, pekerjaNama: p ? p.nama : '',
      catatan: (d && d.catatan) || '' });
    return { ok: true };
  }

  /**
   * Melaporkan rusak.
   *
   * Pemegang saat itu DISALIN ke barisnya, bukan sekadar dirujuk: kalau
   * belakangan barangnya diserahkan ke orang lain, rujukan akan menunjuk
   * pemegang yang salah — dan pertanyaan "siapa yang pegang waktu rusak"
   * justru yang paling sering ditanyakan.
   */
  function lapoRusak(id, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    if (!String((d && d.catatan) || '').trim()) {
      return { error: I18N.t('Ceritakan kerusakannya.') };
    }
    var p = x.pemegangId ? MCS.pekerjaSatu(x.pemegangId) : null;
    DB.update('mcsAset', id, { keadaan: 'rusak' });
    catat(id, 'rusak', oleh, { pekerjaId: p ? p.id : null, pekerjaNama: p ? p.nama : '',
      catatan: d.catatan });
    return { ok: true };
  }

  function mulaiServis(id, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    DB.update('mcsAset', id, { keadaan: 'servis', pemegangId: null });
    catat(id, 'servis', oleh, { catatan: (d && d.catatan) || '' });
    return { ok: true };
  }

  /**
   * Selesai diservis atau diperbaiki. Ini yang MENGULANG hitungan servis
   * berkala — bukan tanggal beli, dan bukan tanggal laporan rusak.
   */
  function selesaiServis(id, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    d = d || {};
    var tgl = d.tgl || U.today();
    DB.update('mcsAset', id, { keadaan: 'gudang', servisTerakhir: tgl });
    catat(id, 'perbaiki', oleh, { tgl: tgl, biaya: d.biaya, catatan: d.catatan || '' });
    return { ok: true };
  }

  function lepas(id, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Peralatan tidak ditemukan.') };
    if (!String((d && d.catatan) || '').trim()) {
      return { error: I18N.t('Tulis alasan pelepasannya — dijual, dibuang, atau hilang.') };
    }
    DB.update('mcsAset', id, { keadaan: 'lepas', pemegangId: null });
    catat(id, 'lepas', oleh, { catatan: d.catatan });
    return { ok: true };
  }

  /* ---------------------------------------------------------- ringkasan */

  function statistik(korporatId) {
    var l = DB.where('mcsAset', function (x) { return x.korporatId === korporatId; });
    var aktif = l.filter(function (x) { return AKTIF.indexOf(x.keadaan) >= 0; });
    function n(k) { return l.filter(function (x) { return x.keadaan === k; }).length; }
    return {
      total: aktif.length, semua: l.length,
      dipakai: n('dipakai'), gudang: n('gudang'), servis: n('servis'),
      rusak: n('rusak'), lepas: n('lepas'),
      terlewat: aktif.filter(servisTerlewat),
      segera: aktif.filter(servisSegera),
      /* Nilai perolehan, BUKAN nilai sekarang. Penyusutan tidak dihitung —
         menyebut angka susut tanpa kaidah akuntansi korporatnya sendiri hanya
         akan dibantah bagian keuangan. */
      nilaiPerolehan: aktif.reduce(function (s, x) { return s + (x.hargaBeli || 0); }, 0),
      biayaServis: DB.all('mcsAsetRiwayat').filter(function (r) {
        return l.some(function (x) { return x.id === r.asetId; }) && r.biaya;
      }).reduce(function (s, r) { return s + r.biaya; }, 0)
    };
  }

  /**
   * Alat yang sudah lama dipegang tanpa pernah kembali ke gudang.
   *
   * Bukan tuduhan: troli dan tangga memang tinggal pada pemegangnya
   * berbulan-bulan, dan itu benar. Yang dicari adalah alat yang seharusnya
   * berputar — mesin poles, scrubber, jet cleaner — dan tidak pernah
   * tercatat kembali sekali pun. Alat yang tidak pernah kembali juga tidak
   * pernah diperiksa, dan servis yang terlewat berakhir sebagai perbaikan.
   *
   * Dihitung dari RIWAYAT, bukan dari kolom baru: tanggal serah terakhir
   * sudah tersimpan di sana untuk alasan lain.
   */
  function tertahanLama(korporatId, hariBatas) {
    hariBatas = hariBatas || 60;
    var batas = U.iso(U.addDays(new Date(), -hariBatas));
    var out = [];
    /* Lewat MCSAKSES juga: temuan cabang lain pada kartu “Perlu tindakan”
       kepala cabang bukan bantuan, ia kebisingan yang membuat kartunya
       berhenti dibaca. */
    var kandidat = DB.where('mcsAset', function (x) {
      return x.korporatId === korporatId && x.keadaan === 'dipakai' && x.pemegangId;
    });
    if (window.MCSAKSES) kandidat = MCSAKSES.saringAset(kandidat);
    kandidat.forEach(function (x) {
      var jn = jenis(x.jenis);
      /* Yang memang menetap pada orangnya tidak dihitung. */
      if (jn.menetap) return;
      var serah = riwayat(x.id, 50).filter(function (r) { return r.peristiwa === 'serah'; })[0];
      var sejak = serah ? String(serah.tgl).slice(0, 10) : null;
      if (!sejak || sejak > batas) return;
      out.push({ aset: x, sejak: sejak,
        hari: U.diffDays(U.today(), sejak),
        pekerja: MCS.pekerjaSatu(x.pemegangId) || null });
    });
    return out.sort(function (a, b) { return b.hari - a.hari; });
  }

  /** Peralatan yang dipegang seorang petugas — dipakai halaman Petugas. */
  function dipegang(pekerjaId) {
    return DB.where('mcsAset', function (x) {
      return x.pemegangId === pekerjaId && x.keadaan === 'dipakai'; });
  }

  /** Dicari dari kode pindai stiker di badan mesin. */
  function dariKode(kode) {
    if (!kode) return null;
    /* Memakai pembakuan MILIK MCS, bukan tiruannya: dua aturan berbeda untuk
       kode yang sama berarti stiker yang terbaca di satu tempat dan gagal di
       tempat lain — kegagalan yang paling sulit dipercaya orang. */
    var k = MCS.bakuKode(kode);
    return DB.first('mcsAset', function (x) { return x.kodePindai === k; }) || null;
  }

  return {
    JENIS: JENIS, KEADAAN: KEADAAN, PERISTIWA: PERISTIWA, AKTIF: AKTIF,
    jenis: jenis, keadaan: keadaan, peristiwa: peristiwa,
    semua: semua, satu: satu, dariKode: dariKode, dipegang: dipegang,
    daftar: daftar, ubah: ubah, hapus: hapus,
    riwayat: riwayat, catat: catat,
    serah: serah, kembali: kembali, lapoRusak: lapoRusak,
    mulaiServis: mulaiServis, selesaiServis: selesaiServis, lepas: lepas,
    tertahanLama: tertahanLama,
    jamPakai: jamPakai, catatJam: catatJam, ausJam: ausJam, ausTerlewat: ausTerlewat,
    LAJU_MESIN: LAJU_MESIN, CARA_JAM: CARA_JAM,
    konfig: konfig, simpanKonfig: simpanKonfig,
    jamDariJadwal: jamDariJadwal, jamEfektif: jamEfektif,
    umurJamBerlaku: umurJamBerlaku, servisJamBerlaku: servisJamBerlaku,
    jamSejakServis: jamSejakServis, servisPerluJam: servisPerluJam,
    servisBerikut: servisBerikut, ekonomi: ekonomi, nilaiTotal: nilaiTotal, servisTerlewat: servisTerlewat, servisSegera: servisSegera,
    statistik: statistik
  };
})();
