/* ==========================================================================
   mcs.js — MCS EXOCLEAN: Management Cleaning Service untuk korporat
   --------------------------------------------------------------------------
   MODEL BISNIS YANG BERBEDA DARI SISA APLIKASI

   Di seluruh bagian lain, EXOCLEAN MENGERJAKAN kebersihannya: klien memesan,
   mitra EXOCLEAN datang, EXOCLEAN menagih. MCS kebalikannya — korporat sudah
   punya office boy, tukang kebun, dan cleaning service sendiri. Yang dibeli
   dari EXOCLEAN adalah PERANGKAT LUNAKNYA: daftar area, jadwal berulang,
   pengingat, dan bukti bahwa pekerjaannya benar-benar dilakukan.

   PEMISAHAN YANG TIDAK BOLEH KABUR

   Pekerja korporat BUKAN mitra EXOCLEAN. Ia tidak tersertifikasi EXOCLEAN,
   tidak masuk kolam penugasan, tidak dihitung dalam bagi hasil, dan tidak
   pernah muncul saat klien memilih mitra. Karena itu ia disimpan di tabelnya
   sendiri (`mcsPekerja`), bukan sebagai pengguna berperan `worker`.

   Kalau keduanya dicampur, office boy sebuah bank akan muncul sebagai pilihan
   juru masak bagi klien lain, ikut terhitung dalam slip bagi hasil EXOCLEAN,
   dan menerima permintaan kerja yang bukan urusannya. Kesalahan seperti itu
   tidak melempar galat apa pun — ia hanya salah, diam-diam, sampai ada yang
   menyadarinya dari sisi uang.

   AKUN KORPORAT HANYA DIBUAT ADMIN

   Tidak ada pendaftaran mandiri. Korporat adalah hubungan yang dinegosiasikan,
   bukan tombol daftar — dan akun yang bisa mendaftar sendiri berarti siapa pun
   bisa mengaku sebagai gedung perkantoran.

   TUGAS DIHITUNG, PENYELESAIANNYA DISIMPAN

   Jadwal "toilet lantai 3 tiap 2 jam, Senin–Jumat" menghasilkan ribuan baris
   setahun bila tiap kejadiannya ditulis ke basis data. Yang disimpan hanya
   JADWALNYA dan PENYELESAIANNYA; daftar tugas hari ini dihitung saat dibuka.
   ========================================================================== */
var MCS = (function () {
  'use strict';

  var BAWAAN = {
    aktif: true,
    /* ZONA WAKTU BAWAAN korporat, nama IANA. Kosong berarti mengikuti zona
       perangkat yang membuka — tafsir yang benar untuk korporat satu kota,
       yang tidak perlu tahu setelan ini ada. Cabang boleh menimpanya
       sendiri-sendiri; yang lintas pulau justru selalu perlu. */
    zona: '',
    /* Berapa menit sebelum jadwal pengingat dikirim. Nol berarti tepat waktu —
       terlalu awal membuat pengingat diabaikan, terlalu telat tidak menolong. */
    ingatMenitSebelum: 10,
    /* Setelah lewat berapa menit sebuah tugas dianggap TERLAMBAT. Bukan
       langsung merah begitu lewat semenit: petugas sedang berjalan ke sana. */
    telatMenit: 30,
    /* Kanal pengingat. WhatsApp dipakai karena pekerja korporat tidak punya
       akun aplikasi ini — hanya nomor telepon. */
    kanal: 'wa',

    /* ---------------------------------------------- BUKTI KEHADIRAN
       Tanpa ini, laporan kebersihan adalah pengakuan sendiri: siapa pun
       bisa mencentang apa pun dari mana pun. Dengan tag tertempel di area,
       laporan menuntut seseorang PERNAH BERADA di sana.

       Dimatikan secara bawaan. Menyalakannya di gedung yang tagnya belum
       terpasang akan mengunci seluruh pelaporan — korporat harus mencetak
       dan menempel dulu, baru menyalakan. */
    wajibPindai: false,
    /* Berapa lama sebuah pemindaian masih dianggap mewakili kehadiran.
       Terlalu pendek menghukum pekerjaan yang memang lama; terlalu panjang
       membuat satu pindaian pagi menutupi seharian penuh. */
    pindaiBerlakuMenit: 45,
    /* Jarak maksimal antara titik GPS saat memindai dan titik area, bila
       areanya sudah ditandai di peta. 0 = tidak diperiksa. GPS di dalam
       gedung meleset puluhan meter, jadi angkanya longgar dengan sengaja —
       ia penangkal pemindaian dari luar kota, bukan alat ukur presisi. */
    radiusMeter: 250,

    /* ------------------------------------------------- ADUAN PENGHUNI
       Jadwal menjawab 'kapan seharusnya dibersihkan'. Aduan menjawab
       'sekarang kotor' — dan tumpahan tidak menunggu jadwal berikutnya.

       Batas waktunya ditulis dalam menit per tingkat kegentingan. Angka ini
       JANJI kepada penghuni, jadi ia harus bisa diubah korporat: gedung
       rumah sakit dan gudang tidak menjanjikan hal yang sama. */
    aduanAktif: true,
    slaMenit: { mendesak: 30, biasa: 120, ringan: 480 },
    /* Tingkat kegentingan minimal yang diteruskan ke petugas lewat WhatsApp.
       'mendesak' saja secara bawaan: meneruskan setiap keluhan ringan akan
       membuat petugas mematikan notifikasinya dalam seminggu, dan yang
       benar-benar mendesak ikut hilang bersamanya. */
    teruskanAduan: 'mendesak',

    /* ------------------------------------------ PENGGANTIAN KODE TAG
       Berapa jam kode LAMA masih diterima setelah tagnya diganti.

       Bukan nol dengan sengaja. Mengganti kode lalu menolak yang lama
       seketika berarti setiap area yang tagnya belum sempat ditempel ulang
       mengunci pelaporan — dan yang dihukum petugas jujur yang datang lebih
       dulu daripada tukang tempel. Selama masa tenggang, kode lama tetap
       diterima TETAPI pemindaiannya ditandai, sehingga yang memakai tag
       yang sudah diganti terlihat, bukan sekadar terhalang. */
    tenggangKodeJam: 72
  };

  /* ------------------------------------------------------- SKALA MUTU
     Mengikuti tingkat kebersihan APPA (Association of Physical Plant
     Administrators) yang dipakai luas di manajemen gedung: 1 terbaik,
     5 terburuk. Dipakai apa adanya, bukan dikarang sendiri — angka yang
     sama dipahami sama oleh auditor mana pun, dan korporat yang berpindah
     penyedia tetap bisa membandingkan.

     Ditulis dari sudut pandang orang yang BERDIRI DI RUANGAN, bukan dari
     istilah teknis: penilainya seorang supervisor, bukan auditor bersertifikat. */
  var MUTU = [
    { skor: 1, nama: 'Bersih sekali', warna: 'ok',
      ket: 'Seperti baru. Tidak ada debu, noda, atau bau sama sekali.' },
    { skor: 2, nama: 'Bersih', warna: 'ok',
      ket: 'Bersih pada pandangan biasa. Debu hanya di sudut yang jarang dilihat.' },
    { skor: 3, nama: 'Cukup', warna: 'warn',
      ket: 'Terlihat dipakai. Ada debu dan bekas, tetapi masih pantas.' },
    { skor: 4, nama: 'Kurang', warna: 'warn',
      ket: 'Kotor terlihat jelas. Penghuni mulai mengeluh.' },
    { skor: 5, nama: 'Buruk', warna: 'danger',
      ket: 'Tidak layak. Perlu pembersihan menyeluruh sekarang.' }
  ];
  function mutu(skor) {
    return MUTU.filter(function (m) { return m.skor === Number(skor); })[0] || MUTU[2];
  }

  /* Kegentingan yang bisa dipilih penghuni. Sengaja hanya tiga: daftar
     panjang membuat semua orang memilih yang paling atas. */
  var GENTING = [
    { kode: 'mendesak', nama: 'Mendesak', ikon: '🚨',
      ket: 'Licin, bau menyengat, atau membahayakan orang' },
    { kode: 'biasa', nama: 'Biasa', ikon: '⚠️',
      ket: 'Kotor dan mengganggu, tetapi tidak membahayakan' },
    { kode: 'ringan', nama: 'Ringan', ikon: '📝',
      ket: 'Bisa menunggu pembersihan terjadwal berikutnya' }
  ];
  function genting(kode) {
    return GENTING.filter(function (g) { return g.kode === kode; })[0] || GENTING[1];
  }

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.mcs) { s.mcs = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.mcs;
    Object.keys(BAWAAN).forEach(function (k) { if (c[k] === undefined) c[k] = BAWAAN[k]; });
    return c;
  }
  /* Zona waktu bawaan korporat. Kosong berarti mengikuti zona perangkat
     yang membuka — tafsir yang benar untuk korporat satu kota, yang tidak
     perlu tahu bahwa setelan ini ada. */
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ================================================================ ACUAN */

  /** Jenis petugas kebersihan yang lazim di gedung perkantoran. */
  /* ---------------------------------------------------- OBJEK DI AREA
     Satu area jarang berisi satu benda. Toilet punya bilik, wastafel,
     cermin, dan tempat sampah — masing-masing dibersihkan berbeda dan
     rusak berbeda. Memberi tag sendiri pada tiap objek membuat bukti
     kehadiran turun satu tingkat: bukan 'pernah masuk toiletnya',
     melainkan 'pernah berdiri di depan wastafelnya'. */
  /* Objek = SEGALA YANG DIBERSIHKAN di dalam satu ruangan atau petak —
     termasuk permukaan bangunannya sendiri.

     Lantai, dinding, dan plafon dulu tidak ada di sini karena objek
     dimaknai sebagai 'perlengkapan bertag'. Padahal justru ketiganya yang
     paling banyak memakan waktu petugas, dan tanpa mereka daftar objek
     tidak pernah menjelaskan ke mana jam kerjanya pergi.

     `dalam` menandai objek yang hanya masuk akal di dalam ruangan; sisanya
     boleh berdiri di petak terbuka juga — bangku taman dan tempat sampah
     ada di keduanya. */
  /* `menit` — PERKIRAAN waktu sekali membersihkan satu objek jenis ini.

     Dipakai HANYA sebagai angka usulan yang muncul di formulir, sudah
     terisi tetapi terlihat dan bisa diubah. Ia bukan kebenaran: lantai
     lobi seluas dua ratus meter dan lantai toilet dua puluh meter sama-
     sama berjenis 'lantai', dan waktunya jelas berbeda sepuluh kali lipat.
     Yang tahu angkanya adalah orang yang pernah mengerjakannya.

     Nol berarti belum ditentukan — bukan berarti tidak makan waktu. Objek
     bernilai nol DIKELUARKAN dari pembagian biaya dan disebutkan jumlahnya,
     bukan diperlakukan sebagai gratis. */
  var JENIS_OBJEK = [
    /* --- permukaan bangunan --- */
    { kode: 'lantai',   nama: 'Lantai / karpet',     ikon: '🧽', menit: 8,
      muka: 'pl', dim: 'PL' },
    { kode: 'dinding',  nama: 'Dinding',             ikon: '🧱', dalam: true, menit: 4,
      muka: 'pt', dim: 'PT' },
    { kode: 'plafon',   nama: 'Plafon',              ikon: '⬜', dalam: true, menit: 3,
      muka: 'pl', dim: 'PL' },
    /* Kaca dan pintu dilap DUA SISI. Menghitungnya satu sisi membuat
       kebutuhan pembersih kaca separuh dari yang sebenarnya — dan gudang
       yang kehabisan di tengah bulan tidak pernah tahu sebabnya. */
    { kode: 'kaca',     nama: 'Kaca / jendela',      ikon: '🪟', menit: 5,
      muka: 'pt2', dim: 'PT' },
    { kode: 'pintu',    nama: 'Pintu',               ikon: '🚪', menit: 2,
      muka: 'pt2', dim: 'PT' },
    /* --- perabot, dipecah supaya bisa dinilai sendiri-sendiri --- */
    { kode: 'meja',     nama: 'Meja',                ikon: '🪑', menit: 2,
      muka: 'pl', dim: 'PL' },
    /* Kursi bukan bidang. Luasnya bisa dihitung di atas kertas, tetapi yang
       dikerjakan orang adalah menyeka sebuah kursi — bukan sekian meter
       persegi kursi. Diukur per satuan. */
    { kode: 'kursi',    nama: 'Kursi',               ikon: '💺', menit: 1,
      satuan: true, takaran: 10 },
    { kode: 'bangku',   nama: 'Bangku',              ikon: '🛋️', menit: 2,
      satuan: true, takaran: 20 },
    /* Lemari: muka depan DAN permukaan atas — dua bidang yang sama-sama
       dilap, dan menghitung salah satunya saja meleset separuh. */
    { kode: 'lemari',   nama: 'Lemari',              ikon: '🗄️', menit: 3,
      muka: 'plpt', dim: 'PLT' },
    { kode: 'hiasan',   nama: 'Hiasan dinding',      ikon: '🖼️', menit: 1,
      muka: 'pt', dim: 'PT' },
    { kode: 'perabot',  nama: 'Perabot lain',        ikon: '🪞', menit: 2,
      muka: 'pl', dim: 'PL' },
    /* --- sanitasi: takaran tetap, sebesar apa pun biliknya --- */
    { kode: 'bilik',    nama: 'Bilik / kloset',      ikon: '🚽', dalam: true, menit: 4,
      satuan: true, takaran: 50 },
    { kode: 'wastafel', nama: 'Wastafel',            ikon: '🚰', menit: 2,
      satuan: true, takaran: 20 },
    { kode: 'urinoir',  nama: 'Urinoir',             ikon: '🚻', dalam: true, menit: 2,
      satuan: true, takaran: 30 },
    { kode: 'cermin',   nama: 'Cermin',              ikon: '🪞', menit: 1,
      muka: 'pt', dim: 'PT' },
    /* --- lain-lain --- */
    { kode: 'elektronik', nama: 'Peralatan elektronik', ikon: '🔌', menit: 2,
      satuan: true, takaran: 10 },
    { kode: 'dispenser',nama: 'Dispenser / mesin',   ikon: '🧴', menit: 2,
      satuan: true, takaran: 15 },
    { kode: 'sampah',   nama: 'Tempat sampah',       ikon: '🗑️', menit: 2,
      satuan: true, takaran: 20 },
    { kode: 'tanaman',  nama: 'Tanaman',             ikon: '🪴', menit: 2,
      satuan: true, takaran: 5 },
    { kode: 'lainnya',  nama: 'Lainnya',             ikon: '📦', menit: 0 }
  ];

  /* ================================================ LUAS PERMUKAAN OBJEK

     Sebelumnya seluruh perkiraan bahan berdiri di atas LUAS LANTAI areanya.
     Untuk pembersih lantai itu benar. Untuk pembersih kaca tidak: diukur
     pada data contoh, pembersih kaca di lobi 180 m² diperkirakan butuh 234,6
     botol sebulan, sementara kaca yang sungguh dilap hanya menuntut 117,3 —
     dua kali lipat, karena penyebutnya lantai dan bukan kaca.

     `muka` menyatakan bidang mana yang dibersihkan:

       pl    P × L        lantai, plafon, meja, perabot
       pt    P × T        dinding, cermin, hiasan
       pt2   2 × P × T    kaca dan pintu — dilap dua sisi
       plpt  P×L + P×T    lemari: permukaan atas dan muka depan

     `satuan: true` menandai objek yang TIDAK diukur dengan luas sama sekali.
     Kloset menghabiskan takaran yang sama entah biliknya besar atau kecil;
     memaksakan panjang-lebar-tinggi padanya adalah ketelitian palsu yang
     akan diisi asal-asalan dan dipercaya seperti hasil ukur.

     `takaran` adalah USULAN mililiter sekali bersih untuk objek satuan —
     muncul terisi di formulir, terlihat, dan boleh diubah. Ia titik awal
     dari kebiasaan umum, bukan hasil pengukuran gedung ini.
     ==================================================================== */

  /* Ke METER. Formulir menerima cm maupun m karena meja ditulis 120 cm dan
     dinding ditulis 8 m — memaksa salah satunya menghasilkan salah ketik nol. */
  function keMeter(nilai, satuan) {
    var n = Number(nilai) || 0;
    return satuan === 'cm' ? n / 100 : n;
  }

  /**
   * Luas permukaan yang dibersihkan pada satu objek, dalam m².
   *
   * null bila jenisnya diukur per satuan, atau bila dimensinya belum diisi.
   * Nol TIDAK dipakai sebagai pengganti null: objek berluas nol dan objek
   * yang belum diukur adalah dua keadaan berbeda, dan yang kedua harus
   * keluar dari penyebut alih-alih mengecilkannya diam-diam.
   */
  function permukaanObjek(o) {
    if (!o) return null;
    var j = jenisObjek(o.jenis);
    if (j.satuan || !j.muka) return null;
    var sat = o.satuanDim || 'cm';
    var p = keMeter(o.panjang, sat), l = keMeter(o.lebar, sat), t = keMeter(o.tinggi, sat);
    var v = null;
    if (j.muka === 'pl') v = (p && l) ? p * l : null;
    else if (j.muka === 'pt') v = (p && t) ? p * t : null;
    else if (j.muka === 'pt2') v = (p && t) ? 2 * p * t : null;
    else if (j.muka === 'plpt') {
      var atas = (p && l) ? p * l : 0;
      var depan = (p && t) ? p * t : 0;
      v = (atas || depan) ? atas + depan : null;
    }
    if (v === null) return null;
    /* Dikali jumlahnya: enam bidang kaca yang seukuran didaftarkan sebagai
       satu objek berjumlah enam, bukan enam objek terpisah. */
    return Math.round(v * Math.max(1, Number(o.jumlah) || 1) * 100) / 100;
  }

  /** Takaran mililiter sekali bersih untuk objek yang diukur per satuan. */
  function takaranObjek(o) {
    if (!o) return null;
    var j = jenisObjek(o.jenis);
    if (!j.satuan) return null;
    var t = Number(o.takaranMl) || 0;
    if (!t) return null;
    return t * Math.max(1, Number(o.jumlah) || 1);
  }

  /** Usulan takaran menurut jenis. Nol bila jenisnya bukan objek satuan. */
  function takaranBaku(kodeJenis) {
    var j = jenisObjek(kodeJenis);
    return j.satuan && j.takaran ? j.takaran : 0;
  }

  /* Menit usulan untuk satu jenis objek. Nol bila jenisnya tidak dikenal —
     menebak angka untuk jenis yang tidak diketahui adalah mengarang. */
  function menitBaku(kodeJenis) {
    var j = JENIS_OBJEK.filter(function (x) { return x.kode === kodeJenis; })[0];
    return j && j.menit ? j.menit : 0;
  }
  /**
   * Objek yang HAMPIR SELALU ada di tiap jenis ruangan.
   *
   * Dipakai mengisikan daftar objek saat ruangan dibuat, bukan memaksakannya:
   * yang tidak ada tinggal dihapus. Mengisi daftar kosong menuntut orang
   * mengingat sendiri bahwa plafon juga dibersihkan — dan yang tidak teringat
   * tidak pernah didaftarkan, lalu tidak pernah dijadwalkan, lalu tidak
   * pernah dikerjakan.
   *
   * Lantai, dinding, dan plafon ada di hampir semua daftar karena ketiganya
   * memang ada di hampir semua ruangan, dan justru merekalah yang paling
   * banyak memakan waktu petugas.
   */
  var OBJEK_BAKU = {
    toilet:  ['lantai', 'dinding', 'plafon', 'bilik', 'wastafel', 'cermin', 'urinoir', 'sampah'],
    lobi:    ['lantai', 'dinding', 'plafon', 'kaca', 'pintu', 'meja', 'kursi', 'tanaman', 'sampah'],
    kerja:   ['lantai', 'dinding', 'plafon', 'meja', 'kursi', 'lemari', 'kaca', 'elektronik', 'sampah'],
    rapat:   ['lantai', 'dinding', 'plafon', 'meja', 'kursi', 'kaca', 'elektronik', 'hiasan'],
    pantry:  ['lantai', 'dinding', 'plafon', 'meja', 'kursi', 'wastafel', 'lemari', 'sampah'],
    koridor: ['lantai', 'dinding', 'plafon', 'kaca', 'hiasan', 'sampah'],
    lift:    ['lantai', 'dinding', 'plafon', 'cermin', 'pintu'],
    mushola: ['lantai', 'dinding', 'plafon', 'lemari', 'cermin'],
    ibadah:  ['lantai', 'dinding', 'plafon', 'lemari', 'cermin'],
    gudang:  ['lantai', 'dinding', 'lemari', 'sampah'],
    pos:     ['lantai', 'dinding', 'plafon', 'meja', 'kursi', 'kaca', 'sampah'],
    gardu:   ['lantai', 'dinding'],
    genset:  ['lantai', 'dinding'],
    /* Bidang terbuka: tidak ada plafon, dan dindingnya bukan urusan kebersihan
       harian. Yang ada justru yang tidak pernah ada di dalam ruangan. */
    taman:   ['tanaman', 'bangku', 'sampah'],
    parkir:  ['lantai', 'sampah'],
    jalan:   ['lantai', 'sampah'],
    bangunan:['lantai', 'dinding', 'kaca', 'pintu'],
    lainnya: ['lantai', 'dinding', 'sampah']
  };
  function objekBaku(jenisArea) {
    return (OBJEK_BAKU[jenisArea] || OBJEK_BAKU.lainnya).slice();
  }

  function jenisObjek(kode) {
    return JENIS_OBJEK.filter(function (j) { return j.kode === kode; })[0] ||
           JENIS_OBJEK[JENIS_OBJEK.length - 1];
  }

  /* ------------------------------------------------- STRUKTUR KOMANDO
     `jenis` menjawab APA yang dikerjakan (office boy, tukang kebun).
     `jabatan` menjawab SIAPA melapor kepada siapa. Dua hal yang sering
     dikira sama: seorang tukang kebun bisa menjadi koordinator, dan
     seorang cleaning service bisa menjadi atasannya.

     `level` kecil berarti lebih tinggi. Angkanya dipakai memeriksa bahwa
     atasan memang berada di atas — bukan sekadar orang lain. */
  var JABATAN = [
    { kode: 'koordinator', nama: 'Koordinator Kebersihan', level: 1, ikon: '🎖️',
      ket: 'Bertanggung jawab atas seluruh gedung' },
    { kode: 'leader', nama: 'Leader Regu', level: 2, ikon: '🔰',
      ket: 'Memimpin beberapa petugas pada satu lantai atau zona' },
    { kode: 'pelaksana', nama: 'Petugas Pelaksana', level: 3, ikon: '🧹',
      ket: 'Mengerjakan area yang ditugaskan' }
  ];
  function jabatan(kode) {
    return JABATAN.filter(function (j) { return j.kode === kode; })[0] || JABATAN[2];
  }

  var JENIS_PEKERJA = [
    { kode: 'ob',       nama: 'Office Boy / Girl', ikon: '🧹' },
    { kode: 'cleaning', nama: 'Cleaning Service',  ikon: '🧼' },
    { kode: 'kebun',    nama: 'Tukang Kebun',      ikon: '🌿' },
    { kode: 'toilet',   nama: 'Petugas Toilet',    ikon: '🚻' },
    { kode: 'lainnya',  nama: 'Lainnya',           ikon: '👤' }
  ];
  function jenisPekerja(k) {
    var r = null;
    JENIS_PEKERJA.forEach(function (x) { if (x.kode === k) r = x; });
    return r || JENIS_PEKERJA[JENIS_PEKERJA.length - 1];
  }

  /** Jenis area. Menentukan seberapa sering ia biasanya perlu dibersihkan. */
  var JENIS_AREA = [
    { kode: 'toilet',  nama: 'Toilet',            ikon: '🚻', saranJam: 2 },
    { kode: 'lobi',    nama: 'Lobi & Resepsionis', ikon: '🛋️', saranJam: 4 },
    { kode: 'kerja',   nama: 'Ruang Kerja',       ikon: '🏢', saranJam: 8 },
    { kode: 'rapat',   nama: 'Ruang Rapat',       ikon: '📊', saranJam: 8 },
    { kode: 'pantry',  nama: 'Pantry & Kantin',   ikon: '🍽️', saranJam: 3 },
    { kode: 'koridor', nama: 'Koridor & Tangga',  ikon: '🚶', saranJam: 6 },
    { kode: 'lift',    nama: 'Lift',              ikon: '🛗', saranJam: 4 },
    { kode: 'mushola', nama: 'Mushola',           ikon: '🕌', saranJam: 4 },
    { kode: 'taman',   nama: 'Taman & Halaman',   ikon: '🌳', saranJam: 24 },
    { kode: 'parkir',  nama: 'Area Parkir',       ikon: '🅿️', saranJam: 12 },
    { kode: 'gudang',  nama: 'Gudang',            ikon: '📦', saranJam: 24 },
    /* Yang di bawah ini bukan ruangan di dalam gedung, melainkan bangunan
       atau bidang tersendiri di dalam satu LOKASI. Satu lokasi seperti
       Sarinah Building berisi bangunan utama, pos security, gardu listrik,
       rumah genset, jalan, dan taman — dan tidak satu pun bisa disebut
       'ruangan'. Tanpa jenis sendiri, semuanya jatuh ke 'Lainnya' dan saran
       frekuensinya menjadi tebakan yang sama untuk hal yang sangat berbeda. */
    { kode: 'bangunan', nama: 'Bangunan (seluruhnya)', ikon: '🏬', saranJam: 8 },
    { kode: 'pos',      nama: 'Pos Security',      ikon: '🛡️', saranJam: 12 },
    /* Jalan dan area terbuka: disapu, bukan dipel. Frekuensinya rendah dan
       luasnya besar — memakai saran ruangan akan melahirkan jadwal yang
       tidak mungkin dikerjakan siapa pun. */
    { kode: 'jalan',    nama: 'Jalan & Selasar',   ikon: '🛣️', saranJam: 24 },
    /* Ruang teknis: dibersihkan jarang, dan TIDAK boleh dimasuki sembarang
       petugas. Jenisnya dipisah supaya penyelia melihatnya sebagai hal yang
       menuntut izin, bukan sebagai gudang biasa. */
    { kode: 'gardu',    nama: 'Gardu Listrik',     ikon: '⚡', saranJam: 168 },
    { kode: 'genset',   nama: 'Rumah Genset',      ikon: '🔌', saranJam: 168 },
    { kode: 'ibadah',   nama: 'Rumah Ibadah',      ikon: '🕌', saranJam: 4 },
    { kode: 'lainnya', nama: 'Lainnya',           ikon: '📍', saranJam: 8 }
  ];
  function jenisArea(k) {
    var r = null;
    JENIS_AREA.forEach(function (x) { if (x.kode === k) r = x; });
    return r || JENIS_AREA[JENIS_AREA.length - 1];
  }

  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /* ==================================================== SHIFT & JAM KERJA

     Sebelumnya `shift` hanyalah teks bebas — "Pagi 07:00–15:00" — yang
     ditampilkan di tiga tempat dan TIDAK DIPAKAI menghitung apa pun. Tidak
     bisa menjawab siapa yang sedang bertugas sekarang, tidak bisa menolak
     jadwal jam delapan pagi untuk petugas shift malam, tidak bisa
     dijumlahkan menjadi jam kerja sebulan.

     Sekarang berupa kode dengan jam bawaannya, dan jamnya tetap bisa
     diubah: gedung yang shift paginya mulai 06:00 tidak boleh dipaksa
     mengikuti angka di berkas ini.

     'nonshift' ada dan bukan sekadar pelengkap: banyak petugas kebersihan
     gedung bekerja jam kantor biasa tanpa rotasi, dan memaksa mereka
     memilih "Pagi" membuat kolom shift berarti dua hal berbeda. */
  var SHIFT = [
    { kode: 'nonshift', nama: 'Non-shift (jam kerja tetap)', ikon: '🕓',
      mulai: '08:00', selesai: '17:00' },
    { kode: 'pagi',   nama: 'Shift pagi',  ikon: '🌅', mulai: '07:00', selesai: '15:00' },
    { kode: 'siang',  nama: 'Shift siang', ikon: '☀️', mulai: '15:00', selesai: '23:00' },
    { kode: 'malam',  nama: 'Shift malam', ikon: '🌙', mulai: '23:00', selesai: '07:00' }
  ];

  function shiftJenis(kode) {
    return SHIFT.filter(function (x) { return x.kode === kode; })[0] || SHIFT[0];
  }

  /* Menit sejak tengah malam. Dipakai membandingkan jam, dan sengaja
     dipisah supaya perbandingannya tidak dikerjakan dengan untai teks —
     '09:00' < '15:00' kebetulan benar, '09:00' < '9:30' tidak. */
  function menitJam(jam) {
    var m = String(jam || '').match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  /**
   * Apakah satu jam berada di dalam rentang kerja seseorang.
   *
   * Shift malam MELEWATI TENGAH MALAM: 23:00–07:00. Membandingkannya seperti
   * rentang biasa membuat seluruh jamnya dianggap di luar shift, dan setiap
   * jadwal petugas malam akan diperingatkan tanpa alasan — sampai orang
   * berhenti membaca peringatannya.
   */
  function dalamJam(jam, mulai, selesai) {
    var j = menitJam(jam), a = menitJam(mulai), b = menitJam(selesai);
    if (j === null || a === null || b === null) return true;
    if (a === b) return true;                 /* 24 jam */
    return a < b ? (j >= a && j < b) : (j >= a || j < b);
  }

  /* ================================================= SIKLUS PENGULANGAN

     Pekerjaan kebersihan gedung ada dua jenis, dan sebelumnya hanya satu
     yang bisa dijadwalkan.

       · Harian/mingguan — pel lobi, buang sampah, isi ulang sabun.
       · Berkala panjang — cuci karpet tiga bulan sekali, poles lantai enam
         bulan sekali, cuci kaca luar setahun dua kali, kuras tandon.

     Yang kedua sebelumnya TIDAK BISA dijadwalkan sama sekali, karena
     jadwalnya hanya mengenal hari dalam minggu. Akibatnya pekerjaan berkala
     tidak pernah muncul sebagai tugas — dan karena itu tidak pernah muncul
     sebagai kelalaian. Ia hilang dari laporan seolah-olah selalu beres,
     persis pola kegagalan yang sama dengan area tanpa jadwal.
   */
  var SIKLUS = [
    { kode: 'mingguan', nama: 'Mingguan', bulan: 0, ikon: '📅',
      ket: 'Berulang pada hari-hari tertentu setiap minggu.' },
    { kode: 'bulanan', nama: 'Bulanan', bulan: 1, ikon: '🗓️',
      ket: 'Sekali sebulan pada tanggal yang sama.' },
    { kode: 'triwulan', nama: 'Tiga bulan sekali', bulan: 3, ikon: '🍂',
      ket: 'Cuci karpet, sedot debu jok, bersih saluran udara.' },
    { kode: 'semester', nama: 'Enam bulan sekali', bulan: 6, ikon: '🌗',
      ket: 'Poles lantai, kuras tandon, cuci kaca luar.' },
    { kode: 'tahunan', nama: 'Setahun sekali', bulan: 12, ikon: '🎊',
      ket: 'Pekerjaan besar yang dianggarkan tahunan.' }
  ];
  function siklus(kode) {
    return SIKLUS.filter(function (s) { return s.kode === kode; })[0] || SIKLUS[0];
  }

  /** Jumlah hari pada satu bulan — dipakai menjepit tanggal 29–31. */
  function hariDalamBulan(tahun, bulanIdx) {
    return new Date(tahun, bulanIdx + 1, 0).getDate();
  }

  /**
   * Apakah tanggal ini jatuh pada siklus jadwal berkala?
   *
   * Titik acuannya `mulaiDari`, bukan bulan Januari: jadwal cuci karpet yang
   * disusun bulan Mei harus jatuh Mei–Agustus–November, bukan tiba-tiba
   * mundur ke Januari–April–Juli.
   *
   * Tanggal 31 pada bulan yang hanya punya 30 hari DIJEPIT ke hari terakhir,
   * bukan dilewatkan. Melewatkannya membuat pekerjaan triwulanan tanggal 31
   * diam-diam tidak pernah terjadi di bulan Februari, April, Juni, September,
   * dan November — dan tidak ada yang tahu sampai lantainya kusam.
   */
  function jatuhBerkala(j, tanggal) {
    var s = siklus(j.siklus);
    if (!s.bulan) return false;
    var d = new Date(tanggal + 'T00:00:00');
    var acuan = new Date((j.mulaiDari || String(j.createdAt || '').slice(0, 10) ||
      tanggal) + 'T00:00:00');
    if (d < acuan) return false;

    var jarak = (d.getFullYear() - acuan.getFullYear()) * 12 + (d.getMonth() - acuan.getMonth());
    if (jarak < 0 || jarak % s.bulan !== 0) return false;

    var maks = hariDalamBulan(d.getFullYear(), d.getMonth());
    var target = j.tglBulan === 'akhir' ? maks : Math.min(Number(j.tglBulan) || 1, maks);
    return d.getDate() === target;
  }

  /* ============================================================== KORPORAT */

  function semua() { return DB.all('korporat'); }
  function korporat(id) { return DB.find('korporat', id); }

  /** Korporat milik pengguna yang sedang masuk. */
  function korporatUser(u) {
    u = u || (window.APP && APP.user);
    return u && u.korporatId ? korporat(u.korporatId) : null;
  }

  /** Staf korporat lain di perusahaan yang sama. */
  function stafKorporat(korporatId) {
    return DB.where('users', function (u) {
      return u.role === 'korporat' && u.korporatId === korporatId;
    });
  }

  /**
   * Tambah staf korporat baru — dipanggil dari dalam MCS, oleh Admin
   * Korporat sendiri.
   *
   * Berbeda dari buatKorporat: yang itu membuat PERUSAHAAN beserta staf
   * pertamanya dan hanya boleh dijalankan admin EXOCLEAN. Yang ini menambah
   * orang ke perusahaan yang sudah ada, dan itu memang pekerjaan pelanggan
   * — sebuah jaringan dengan delapan puluh enam cabang tidak bisa menunggu
   * EXOCLEAN setiap kali ada kepala cabang baru.
   *
   * Sandi awal dikembalikan SEKALI supaya bisa diserahkan, lalu tidak
   * pernah bisa dibaca lagi dari mana pun — yang tersimpan hanya
   * turunannya.
   */
  function tambahStaf(korporatId, d, oleh) {
    var k = korporat(korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama staf belum diisi.') };
    var email = String(d.email || '').trim().toLowerCase();
    if (!email) return { error: I18N.t('Email staf belum diisi.') };
    if (DB.first('users', function (u) {
      return String(u.email).toLowerCase() === email;
    })) return { error: I18N.t('Email itu sudah dipakai akun lain.') };

    var sandi = sandiAcak();
    var u = DB.insert('users', {
      role: 'korporat', korporatId: korporatId,
      nama: String(d.nama).trim(),
      jabatan: String(d.jabatan || '').trim() || 'Staf Korporat',
      email: email,
      telp: String(d.telp || '').trim(),
      aktif: true,
      /* Sandi buatan orang lain harus diganti pemakainya sendiri — sama
         seperti staf pertama. Tidak ada pengecualian untuk yang dibuat
         dari dalam: yang membuat tetap orang lain. */
      wajibGantiSandi: true,
      perusahaan: k.nama,
      alamatList: [], rekening: [],
      preferensi: { bahasa: (window.I18N && I18N.get && I18N.get()) || 'id',
                    notifWA: true, notifEmail: true, ringkasanMingguan: true },
      emailVerifiedAt: U.nowISO(), telpVerifiedAt: null, sosial: [],
      metodeDaftar: 'korporat',
      /* Peran DIPASANG DI SINI, bukan dibiarkan kosong. Kosong berarti
         Admin Korporat menurut MCSAKSES — tafsir yang benar untuk akun
         lama, tetapi berbahaya untuk akun baru: seorang leader regu akan
         lahir dengan akses penuh tanpa siapa pun memutuskannya. */
      mcsPeran: d.peran || 'leader',
      mcsLokasi: (d.lokasiIds || []).slice()
    });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(u.id, sandi);
    DB.log(oleh && oleh.id, 'Menambah staf korporat ' + u.nama, 'user', u.id);
    return { ok: true, user: u, sandiAwal: sandi };
  }

  function ubahStaf(userId, d) {
    var u = DB.find('users', userId);
    if (!u || u.role !== 'korporat') {
      return { error: I18N.t('Staf korporat tidak ditemukan.') };
    }
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama staf belum diisi.') };

    /* MENONAKTIFKAN yang terakhir bisa mengelola akses sama berbahayanya
       dengan menurunkan perannya — dan penjaga di pasangPeran tidak melihat
       jalan ini. Dua pintu ke ruangan yang sama harus dikunci keduanya. */
    if (u.aktif !== false && d.aktif === false && window.MCSAKSES) {
      var p = MCSAKSES.peranUser(u);
      if (p && p.kelolaAkses) {
        var sisa = stafKorporat(u.korporatId).filter(function (x) {
          if (x.id === userId || x.aktif === false) return false;
          var q = MCSAKSES.peranUser(x);
          return q && q.kelolaAkses;
        });
        if (!sisa.length) {
          return { error: I18N.t('Ini satu-satunya Admin Korporat yang tersisa. ' +
            'Angkat orang lain lebih dulu.') };
        }
      }
    }

    DB.update('users', userId, {
      nama: String(d.nama).trim(),
      jabatan: String(d.jabatan || '').trim() || 'Staf Korporat',
      telp: String(d.telp || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true };
  }

  /**
   * Buat akun korporat. HANYA dipanggil dari layar admin EXOCLEAN.
   *
   * Menghasilkan dua hal sekaligus: catatan perusahaannya dan satu akun staf
   * pertama. Akun itu wajib mengganti kata sandi saat pertama masuk — sandi
   * awal diketahui admin yang membuatnya, dan sandi yang diketahui orang lain
   * bukan sandi.
   */
  /* ================================================================ BENTUK USAHA
     Dua bentuk pemakai MCS, dan bedanya nyata:

       internal   perusahaan membersihkan gedungnya SENDIRI dengan petugasnya
                  sendiri. Tidak ada klien, jadi tidak ada kontrak layanan
                  dan tidak ada yang bisa ditagih.

       alihdaya   penyedia jasa kebersihan yang melayani gedung MILIK ORANG
                  LAIN. Kontrak dan tagihan justru inti pekerjaannya.

     KOSONG berarti BELUM DINYATAKAN — bukan cacat. Korporat yang sudah ada
     tidak punya medan ini, dan sebagian dari mereka punya kontrak serta
     tagihan sungguhan. Menebak 'internal' untuk mereka akan menyembunyikan
     data yang nyata. Yang belum dinyatakan melihat SELURUH menu. */
  var JENIS_USAHA = {
    internal: {
      nama: 'Mengelola sendiri',
      ket: 'Perusahaan membersihkan gedungnya sendiri dengan petugasnya sendiri.'
    },
    alihdaya: {
      nama: 'Penyedia jasa (alih daya)',
      ket: 'Melayani gedung milik pihak lain, dengan kontrak dan tagihan.'
    }
  };

  /** Benar bila korporat ini TIDAK punya klien untuk dikontrak dan ditagih. */
  function tanpaKlien(korporatId) {
    var k = korporat(korporatId);
    return !!k && k.jenis === 'internal';
  }

  function buatKorporat(d, olehUserId) {
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama perusahaan belum diisi.') };
    if (!String(d.emailStaf || '').trim()) return { error: I18N.t('Email staf korporat belum diisi.') };
    var email = String(d.emailStaf).trim().toLowerCase();
    if (DB.first('users', function (u) { return String(u.email).toLowerCase() === email; })) {
      return { error: I18N.t('Email itu sudah dipakai akun lain.') };
    }
    if (!String(d.namaStaf || '').trim()) return { error: I18N.t('Nama staf korporat belum diisi.') };

    /* Alamat masuk dalam bentuk terstruktur yang SAMA dengan Profil
       Perusahaan, lalu diturunkan lewat jalur yang sama pula. Admin boleh
       mengosongkannya — yang ia pegang hanya isi kontrak — dan staf korporat
       melengkapinya sendiri belakangan. */
    var alamat = turunkanAlamat({ wilayah: d.wilayah || null,
      alamat: d.alamat || '', kota: d.kota || '' });

    var k = DB.insert('korporat', {
      nama: String(d.nama).trim(),
      bidang: d.bidang || '',
      /* Bentuk usahanya: 'internal' (membersihkan gedung sendiri) atau
         'alihdaya' (melayani gedung milik orang lain). KOSONG berarti belum
         dinyatakan — lihat JENIS_USAHA di bawah. */
      jenis: JENIS_USAHA[d.jenis] ? d.jenis : '',
      wilayah: alamat.wilayah,
      alamat: alamat.alamat,
      kota: alamat.kota,
      telp: d.telp || '',
      npwp: d.npwp || '',
      pic: d.namaStaf || '',
      picTelp: d.telpStaf || '',
      /* Profil dianggap belum lengkap sampai staf korporat mengisinya sendiri.
         Admin EXOCLEAN hanya tahu yang tertulis di kontrak. */
      profilLengkap: false,
      aktif: true,
      dibuatOleh: olehUserId || null
    });

    var sandi = d.sandiAwal || sandiAcak();
    var u = DB.insert('users', {
      role: 'korporat', korporatId: k.id,
      nama: String(d.namaStaf).trim(),
      jabatan: d.jabatanStaf || 'Staf Korporat',
      email: email,
      telp: d.telpStaf || '',
      pass: sandi,
      aktif: true,
      /* Penanda inilah yang menahan aplikasi sampai sandinya diganti. */
      wajibGantiSandi: true,
      perusahaan: k.nama,
      alamatList: [], rekening: [],
      preferensi: { bahasa: (window.I18N && I18N.BAWAAN) || 'id',
                    notifWA: true, notifEmail: true, ringkasanMingguan: true },
      emailVerifiedAt: U.nowISO(), telpVerifiedAt: null, sosial: [], metodeDaftar: 'admin'
    });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(u.id, sandi);

    DB.log(olehUserId || 'u_admin', 'Membuat akun korporat ' + k.nama, 'korporat', k.id);
    /* Sandi awal dikembalikan SEKALI supaya admin bisa menyerahkannya, lalu
       tidak pernah bisa dibaca lagi dari mana pun. */
    return { ok: true, korporat: k, user: u, sandiAwal: sandi };
  }

  function sandiAcak() {
    var huruf = 'abcdefghjkmnpqrstuvwxyz', angka = '23456789';
    var s = '';
    for (var i = 0; i < 6; i++) s += huruf[Math.floor(Math.random() * huruf.length)];
    for (var j = 0; j < 3; j++) s += angka[Math.floor(Math.random() * angka.length)];
    return s;
  }

  /**
   * Terbitkan sandi sementara baru untuk staf korporat.
   *
   * Dipakai admin EXOCLEAN ketika staf kehilangan sandinya. Penanda
   * `wajibGantiSandi` dipasang lagi: sandi yang pernah diketahui admin harus
   * berhenti berlaku begitu pemiliknya masuk.
   */
  function buatSandiSementara(userId) {
    var s = sandiAcak();
    DB.update('users', userId, { wajibGantiSandi: true, pass: s });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(userId, s);
    DB.log(userId, I18N.t('Kata sandi diatur ulang oleh admin'), 'user', userId);
    return s;
  }

  /**
   * Bentuk satu baris diturunkan dari yang terstruktur.
   *
   * `wilayah` dipakai formulir dan penyaringan; `alamat`/`kota` dipakai
   * laporan, pesan pengingat, dan layar lama. Keduanya harus berasal dari
   * SATU sumber — dua tempat mengetik alamat yang sama pasti menyimpang.
   */
  function turunkanAlamat(isi) {
    if (!isi || !isi.wilayah || !window.WILAYAH) return isi;
    /* Formulir yang tidak disentuh tetap mengembalikan objek berisi negara
       bawaan. Menyimpannya apa adanya membuat korporat tanpa alamat terbaca
       'beralamat di Indonesia' — lebih menyesatkan daripada kosong. */
    if (!WILAYAH.terisi(isi.wilayah)) { isi.wilayah = null; return isi; }
    isi.alamat = WILAYAH.teks(isi.wilayah, { denganNegara: true });
    isi.kota = isi.wilayah.l2 || '';
    return isi;
  }

  function simpanProfil(korporatId, patch) {
    var k = korporat(korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var isi = {};
    ['nama', 'bidang', 'wilayah', 'alamat', 'kota', 'telp', 'npwp', 'pic', 'picTelp',
     'jumlahKaryawan', 'jamOperasional', 'catatan'].forEach(function (f) {
      if (patch[f] !== undefined) isi[f] = patch[f];
    });

    /* Bentuk pengelolaan disaring, bukan sekadar disalin: nilai yang tidak
       dikenali disimpan sebagai kosong — 'belum dinyatakan' — bukan sebagai
       tulisan asing yang diam-diam menyembunyikan menu. */
    if (patch.jenis !== undefined) {
      isi.jenis = JENIS_USAHA[patch.jenis] ? patch.jenis : '';
    }

    turunkanAlamat(isi);

    var alamatAkhir = isi.alamat !== undefined ? isi.alamat : k.alamat;
    isi.profilLengkap = !!(String(isi.nama || k.nama).trim() &&
                           String(alamatAkhir || '').trim() &&
                           String(isi.telp !== undefined ? isi.telp : k.telp).trim());
    DB.update('korporat', korporatId, isi);
    /* Nama perusahaan ikut ke akun stafnya supaya dokumen dan sapaan seragam. */
    if (isi.nama) {
      stafKorporat(korporatId).forEach(function (u) {
        DB.update('users', u.id, { perusahaan: isi.nama });
      });
    }
    return { ok: true, korporat: korporat(korporatId) };
  }

  /**
   * Kelengkapan penyiapan — dipakai sebagai penuntun langkah di layar korporat.
   *
   * Urutannya bukan selera: area tanpa petugas tidak bisa dijadwalkan, dan
   * jadwal tanpa keduanya tidak berarti apa-apa.
   */
  /**
   * Alamat terstruktur sebuah korporat, siap dipakai formulir.
   *
   * Korporat lama yang alamatnya masih satu baris tetap terbuka: barisnya
   * dijadikan kolom jalan, dan kolom lainnya dibiarkan kosong untuk diisi.
   * Menolak membuka formulirnya karena bentuknya lama berarti menghukum
   * pengguna atas keputusan yang bukan miliknya.
   */
  function wilayahKorporat(k) {
    if (!window.WILAYAH) return null;
    if (k && WILAYAH.terstruktur(k.wilayah)) return k.wilayah;
    var w = WILAYAH.kosong();
    if (k && k.alamat) w.jalan = k.alamat;
    if (k && k.kota) w.l2 = k.kota;
    return w;
  }

  function kelengkapan(korporatId) {
    var k = korporat(korporatId);
    var p = pekerja(korporatId), a = area(korporatId), j = jadwal(korporatId);
    var langkah = [
      { kode: 'profil',  nama: 'Lengkapi profil perusahaan', selesai: !!(k && k.profilLengkap),
        halaman: 'mcsProfil' },
      { kode: 'pekerja', nama: I18N.t('Daftarkan petugas kebersihan'), selesai: p.length > 0,
        halaman: 'mcsPekerja', jumlah: p.length },
      { kode: 'area',    nama: I18N.t('Daftarkan area yang dipantau'), selesai: a.length > 0,
        halaman: 'mcsArea', jumlah: a.length },
      { kode: 'jadwal',  nama: I18N.t('Susun jadwal pembersihan'), selesai: j.length > 0,
        halaman: 'mcsJadwal', jumlah: j.length }
    ];
    var selesai = langkah.filter(function (x) { return x.selesai; }).length;
    return { langkah: langkah, selesai: selesai, total: langkah.length,
             siap: selesai === langkah.length };
  }

  /* =============================================================== PEKERJA */

  /**
   * Daftar petugas — SUDAH DISARING menurut cabang yang dijangkau pengguna.
   *
   * Disaring di sini, bukan di tiap layar, dengan alasan yang persis sama
   * seperti LOKASI.semua dan area(): ada dua puluh tujuh tempat yang
   * memanggilnya, dan satu saja yang terlewat berarti kepala cabang melihat
   * seluruh Indonesia pada satu halaman sementara halaman lain
   * menyembunyikannya — keadaan yang lebih membingungkan daripada tidak
   * menyaring sama sekali.
   *
   * Terbukti perlu: pada data contoh, seorang kepala cabang dengan 8 dari 87
   * cabang melihat 8 lokasi dan 112 area — tetapi 258 dari 258 petugas, 237
   * di antaranya milik cabang yang bukan urusannya.
   *
   * IKUT TERSARING PULA seluruh hitungan yang berdiri di atasnya — gaji,
   * biaya, KPI, beban kerja, statistik absensi. Itu memang yang dikehendaki:
   * angka cabang harus menghitung orang cabang. Yang TIDAK boleh tersaring
   * adalah pemeriksaan keberadaan; lihat semuaPekerja() di bawah.
   */
  function pekerja(korporatId, semuaTermasukNonaktif) {
    return window.MCSAKSES
      ? MCSAKSES.saringPekerja(semuaPekerja(korporatId, semuaTermasukNonaktif))
      : semuaPekerja(korporatId, semuaTermasukNonaktif);
  }

  /**
   * Seluruh petugas korporat, TANPA penyaringan cabang.
   *
   * Hanya untuk pertanyaan “apakah ini sudah ada”, bukan untuk ditampilkan.
   * Pemeriksaan nama kembar yang hanya melihat cabang sendiri akan
   * meloloskan orang yang sama didaftarkan dua kali oleh dua cabang, dan
   * data ganda tidak pernah terlihat sampai ada yang menggaji keduanya.
   */
  function semuaPekerja(korporatId, semuaTermasukNonaktif) {
    return DB.where('mcsPekerja', function (p) {
      return p.korporatId === korporatId && (semuaTermasukNonaktif || p.aktif !== false);
    });
  }
  function pekerjaSatu(id) { return DB.find('mcsPekerja', id); }

  /**
   * Area yang benar-benar menjadi wilayah kerja seseorang.
   *
   * Satu tempat yang menjawabnya, dipakai layar petugas maupun pemeriksa
   * jadwal. Kalau aturannya ditulis ulang di tiap pemanggil, cepat atau
   * lambat dua layar akan menjawab berbeda tentang orang yang sama.
   */
  /* ============================================================== REGU
     Gedung besar tidak menugaskan orang satu per satu; ia menugaskan regu.
     Regu juga satuan yang dipakai membaca laporan — "Regu Lantai 1–5"
     lebih berarti bagi manajer gedung daripada delapan nama.

     Regu TIDAK menggantikan struktur komando yang sudah ada (jabatan dan
     atasan langsung). Keduanya menjawab hal berbeda: atasan menjawab siapa
     menegur siapa, regu menjawab siapa bekerja bersama siapa. Di gedung,
     keduanya sering tidak sama. */
  function tim(korporatId, semua) {
    return DB.where('mcsTim', function (t) {
      return t.korporatId === korporatId && (semua || t.aktif !== false);
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  function timSatu(id) { return DB.find('mcsTim', id); }

  function tambahTim(korporatId, d) {
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama regu belum diisi.') };
    var t = DB.insert('mcsTim', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      ketuaId: d.ketuaId || null,
      shiftKode: d.shiftKode ? shiftJenis(d.shiftKode).kode : '',
      catatan: d.catatan || '',
      aktif: d.aktif !== false
    });
    return { ok: true, tim: t };
  }

  function ubahTim(id, d) {
    if (!timSatu(id)) return { error: I18N.t('Regu tidak ditemukan.') };
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama regu belum diisi.') };
    DB.update('mcsTim', id, {
      nama: String(d.nama).trim(), ketuaId: d.ketuaId || null,
      shiftKode: d.shiftKode ? shiftJenis(d.shiftKode).kode : '',
      catatan: d.catatan || '', aktif: d.aktif !== false
    });
    return { ok: true };
  }

  /* Anggotanya DILEPAS, bukan ikut terhapus. Menghapus regu adalah keputusan
     tentang pengelompokan, bukan tentang orangnya. */
  function hapusTim(id) {
    if (!timSatu(id)) return { error: I18N.t('Regu tidak ditemukan.') };
    var n = 0;
    DB.where('mcsPekerja', function (p) { return p.timId === id; })
      .forEach(function (p) { DB.update('mcsPekerja', p.id, { timId: null }); n++; });
    DB.remove('mcsTim', id);
    return { ok: true, dilepas: n };
  }

  function anggotaTim(timId) {
    return DB.where('mcsPekerja', function (p) {
      return p.timId === timId && p.aktif !== false;
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  function wilayahKerja(pekerjaId) {
    var p = pekerjaSatu(pekerjaId);
    if (!p) return [];
    if ((p.areaIds || []).length) {
      return (p.areaIds || []).map(areaSatu).filter(Boolean);
    }
    if (!(p.lokasiIds || []).length) return [];
    var lok = {};
    (p.lokasiIds || []).forEach(function (id) { lok[id] = 1; });
    return area(p.korporatId).filter(function (a) {
      var lid = a.lokasiId || (a.lantaiId && lokasiDariLantai ? lokasiDariLantai(a.lantaiId) : null);
      return lid && lok[lid];
    });
  }

  /**
   * Apakah petugas ini tersedia untuk sebuah jadwal — dan bila tidak, kenapa.
   *
   * MEMPERINGATKAN, TIDAK MENOLAK. Petugas yang menggantikan rekannya sehari
   * adalah keadaan sehari-hari di gedung, dan aplikasi yang menolaknya akan
   * dilawan dengan mengosongkan kolom shift supaya berhenti mengganggu.
   * Yang dihasilkan adalah daftar sebab, bukan boleh/tidak.
   */
  function bentrokJadwal(pekerjaId, d) {
    var p = pekerjaSatu(pekerjaId);
    if (!p) return [];
    var sebab = [];

    /* --- hari --- */
    var hk = p.hariKerja || [];
    if (hk.length && (d.hari || []).length) {
      var luar = (d.hari || []).filter(function (h) { return hk.indexOf(h) < 0; });
      if (luar.length) {
        sebab.push(I18N.t('Dijadwalkan pada hari {h}, di luar hari kerjanya.')
          .replace('{h}', luar.map(function (h) { return I18N.t(HARI[h]); }).join(', ')));
      }
    }

    /* --- jam --- */
    var sh = p.shiftKode ? shiftJenis(p.shiftKode) : null;
    var mulai = p.jamMulai || (sh && sh.mulai);
    var selesai = p.jamSelesai || (sh && sh.selesai);
    if (mulai && selesai) {
      var jamCek = d.mode === 'interval'
        ? [d.mulai, d.selesai].filter(Boolean)
        : (d.jam || []);
      var jamLuar = jamCek.filter(function (j) { return !dalamJam(j, mulai, selesai); });
      if (jamLuar.length) {
        sebab.push(I18N.t('Jam {j} berada di luar {s} ({a}–{b}).')
          .replace('{j}', jamLuar.join(', '))
          .replace('{s}', sh ? I18N.t(sh.nama) : I18N.t('jam kerjanya'))
          .replace('{a}', mulai).replace('{b}', selesai));
      }
    }

    /* --- wilayah --- */
    var wil = wilayahKerja(pekerjaId);
    if (wil.length && d.areaId && !wil.some(function (a) { return a.id === d.areaId; })) {
      var ar = areaSatu(d.areaId);
      sebab.push(I18N.t('{a} bukan wilayah kerjanya.')
        .replace('{a}', ar ? ar.nama : I18N.t('Area itu')));
    }
    return sebab;
  }

  function tambahPekerja(korporatId, d) {
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama petugas belum diisi.') };
    /* semuaPekerja, BUKAN pekerja: pertanyaannya “sudah ada atau belum”,
       dan jawabannya tidak boleh bergantung pada cabang siapa yang bertanya. */
    var kembar = semuaPekerja(korporatId, true).filter(function (p) {
      return p.nama.toLowerCase() === String(d.nama).trim().toLowerCase(); });
    if (kembar.length) return { error: I18N.t('Petugas dengan nama itu sudah terdaftar.') };
    var p = DB.insert('mcsPekerja', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      jenis: jenisPekerja(d.jenis).kode,
      /* Kedudukan dalam struktur, terpisah dari jenis pekerjaannya. */
      jabatan: jabatan(d.jabatan).kode,
      atasanId: d.atasanId || null,
      /* Area yang menjadi tanggung jawabnya. Berbeda dari jadwal: jadwal
         menentukan KAPAN, ini menentukan WILAYAH KERJA — dan petugas yang
         masuk aplikasi hanya melihat area yang tercantum di sini. */
      areaIds: (d.areaIds || []).slice(),
      telp: String(d.telp || '').trim(),
      /* Teks shift lama. TIDAK dihapus dan tidak ditulis ulang: sebagian
         gedung sudah mengisinya dengan keterangan yang tidak ada padanannya
         di daftar kode, dan menghapusnya berarti membuang tulisan orang.
         Layar menawarkannya untuk dipindahkan, tidak memindahkan sendiri. */
      shift: d.shift || '',
      /* Shift terstruktur. Lihat catatan pada SHIFT di atas. */
      shiftKode: d.shiftKode ? shiftJenis(d.shiftKode).kode : '',
      jamMulai: d.jamMulai || '',
      jamSelesai: d.jamSelesai || '',
      /* Hari kerja, 0 = Minggu. Kosong berarti BELUM DITENTUKAN, bukan
         berarti tidak pernah bekerja — dan pemeriksa jadwal memperlakukan
         keduanya berbeda: yang belum ditentukan tidak diperingatkan. */
      hariKerja: Array.isArray(d.hariKerja) ? d.hariKerja.slice().sort() : [],
      /* Regu tempat ia bekerja. */
      timId: d.timId || null,
      /* Lokasi penempatan — penempatan KASAR. areaIds adalah yang halus.

         Aturannya satu, dan harus tetap satu supaya tidak ada dua sumber
         kebenaran: bila areaIds terisi, itulah wilayah kerjanya. Bila
         areaIds kosong sedangkan lokasiIds terisi, wilayah kerjanya adalah
         SELURUH area di lokasi itu. Berguna pada hari pertama penempatan,
         ketika areanya belum dirinci. */
      lokasiIds: Array.isArray(d.lokasiIds) ? d.lokasiIds.slice() : [],
      catatan: d.catatan || '',
      /* Pasfoto untuk kartu identitas. Disimpan sebagai satu id foto,
         bukan larik: satu orang satu wajah, dan larik hanya akan memancing
         pertanyaan mana yang dipakai saat mencetak. */
      foto: d.foto || null,
      /* Nomor induk pekerja di gedung itu — dicetak di kartu. Kosong pun
         sah: sebagian gedung tidak memberi nomor kepada petugas alih daya. */
      nip: String(d.nip || '').trim(),
      /* Akun aplikasi. null berarti petugas ini belum bisa masuk sendiri —
         laporannya diisikan atasannya, dan itu keadaan yang sah. */
      userId: null,
      aktif: d.aktif !== false
    });
    var salah = periksaAtasan(p.id, d.atasanId);
    if (salah) DB.update('mcsPekerja', p.id, { atasanId: null });
    return { ok: true, pekerja: pekerjaSatu(p.id), peringatan: salah || null };
  }

  /**
   * Bolehkah `atasanId` menjadi atasan `pekerjaId`?
   *
   * Tiga hal yang harus ditolak, dan ketiganya benar-benar terjadi di
   * lapangan ketika orang menyusun struktur sambil menebak: menjadikan
   * seseorang atasan dirinya sendiri, melingkar (A→B→A), dan menjadikan
   * bawahan sebagai atasan. Yang ketiga paling halus — strukturnya terlihat
   * masuk akal sampai ada yang menelusuri rantainya.
   */
  function periksaAtasan(pekerjaId, atasanId) {
    if (!atasanId) return null;
    if (atasanId === pekerjaId) return I18N.t('Seseorang tidak bisa menjadi atasan dirinya sendiri.');
    var diri = pekerjaSatu(pekerjaId);
    var atas = pekerjaSatu(atasanId);
    if (!atas || !diri || atas.korporatId !== diri.korporatId) {
      return I18N.t('Atasan harus petugas di gedung yang sama.');
    }
    if (jabatan(atas.jabatan).level >= jabatan(diri.jabatan).level) {
      return I18N.t('Atasan harus berjabatan lebih tinggi dari {nama}.')
        .replace('{nama}', diri.nama);
    }
    /* Telusuri ke atas: bila kita bertemu diri sendiri, rantainya melingkar. */
    var kursor = atas, langkah = 0;
    while (kursor && langkah++ < 20) {
      if (kursor.id === pekerjaId) return I18N.t('Struktur itu melingkar — atasan tidak boleh berada di bawahnya.');
      kursor = kursor.atasanId ? pekerjaSatu(kursor.atasanId) : null;
    }
    return null;
  }

  /** Bawahan langsung. */
  function bawahan(pekerjaId) {
    return DB.where('mcsPekerja', function (p) { return p.atasanId === pekerjaId; })
      .sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  /** Rantai komando ke atas, dari atasan langsung sampai puncak. */
  function rantaiKomando(pekerjaId) {
    var out = [], kursor = pekerjaSatu(pekerjaId), langkah = 0;
    while (kursor && kursor.atasanId && langkah++ < 20) {
      kursor = pekerjaSatu(kursor.atasanId);
      if (!kursor) break;
      out.push(kursor);
    }
    return out;
  }

  /**
   * Area kerja seorang petugas.
   *
   * Yang belum ditugasi area apa pun mengembalikan daftar KOSONG, bukan
   * seluruh area gedung. Menganggap 'belum diatur' berarti 'semuanya' adalah
   * cara paling mudah membuat petugas baru melihat seisi gedung pada hari
   * pertamanya.
   */
  function areaPekerja(pekerjaId) {
    var p = pekerjaSatu(pekerjaId);
    if (!p) return [];
    var ids = p.areaIds || [];
    return area(p.korporatId).filter(function (a) { return ids.indexOf(a.id) >= 0; });
  }

  /* ------------------------------------------------- PENJAGA BATAS CABANG

     Fungsi-fungsi di bawah ini menerima ID, bukan pilihan dari daftar —
     jadi penyaringan daftar tidak menjangkaunya sama sekali. Mengunci
     pintu depan (absensi, penyerahan alat, pengambilan bahan) sambil
     meninggalkan pintu samping ini terbuka membuat kunci yang pertama
     tidak berarti: siapa pun yang bisa menghapus petugas cabang lain juga
     bisa menghapus jadwalnya, dan itu kerusakan yang lebih besar daripada
     salah mengisi absensi.

     Tidak ada argumen `oleh` di sini, jadi yang dinilai APP.user — sama
     seperti MCSAKSES.saringLokasi dan seluruh penyaringan lain. Saat
     penyemaian data contoh, APP.user adalah admin dan tidak ada yang
     terhalang. */
  function tolakLuarCabang(p, a) {
    if (!window.MCSAKSES) return null;
    /* Lingkup yang belum diisi lolos dari SELURUH pemeriksaan di bawah —
       bolehPekerja/bolehArea mengembalikan true ketika jangkauannya null.
       Itulah sebabnya ia diperiksa lebih dulu, bukan sesudahnya. */
    var sb = MCSAKSES.sebabTakBolehTulis && MCSAKSES.sebabTakBolehTulis();
    if (sb && sb.kode === 'lingkup') return { error: sb.pesan };
    if (p && !MCSAKSES.bolehPekerja(p)) {
      return { error: I18N.t('{nama} bertugas di cabang yang tidak Anda kelola. Minta cabangnya ditambahkan ke akun Anda bila memang perlu.')
        .replace('{nama}', p.nama) };
    }
    if (a && !MCSAKSES.bolehArea(a)) {
      return { error: I18N.t('Area ini berada di cabang yang tidak Anda kelola.') };
    }
    return null;
  }

  function ubahPekerja(id, d) {
    var p = pekerjaSatu(id);
    if (!p) return { error: I18N.t('Petugas tidak ditemukan.') };
    var tolak = tolakLuarCabang(p); if (tolak) return tolak;
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama petugas belum diisi.') };
    /* Atasan diperiksa SEBELUM apa pun disimpan. Menyimpan dulu lalu
       membatalkan meninggalkan struktur melingkar untuk beberapa saat —
       dan beberapa saat itu cukup bagi layar lain untuk membacanya. */
    var salah = d.atasanId !== undefined ? periksaAtasan(id, d.atasanId) : null;
    if (salah) return { error: salah };

    var isi = {
      nama: String(d.nama).trim(), jenis: jenisPekerja(d.jenis).kode,
      jabatan: jabatan(d.jabatan).kode,
      telp: String(d.telp || '').trim(), shift: d.shift || '',
      shiftKode: d.shiftKode ? shiftJenis(d.shiftKode).kode : '',
      jamMulai: d.jamMulai || '', jamSelesai: d.jamSelesai || '',
      hariKerja: Array.isArray(d.hariKerja) ? d.hariKerja.slice().sort() : [],
      timId: d.timId || null,
      lokasiIds: Array.isArray(d.lokasiIds) ? d.lokasiIds.slice() : [],
      catatan: d.catatan || '', aktif: d.aktif !== false
    };
    if (d.atasanId !== undefined) isi.atasanId = d.atasanId || null;
    if (d.areaIds !== undefined) isi.areaIds = (d.areaIds || []).slice();
    if (d.foto !== undefined) isi.foto = d.foto || null;
    if (d.nip !== undefined) isi.nip = String(d.nip || '').trim();
    DB.update('mcsPekerja', id, isi);

    /* Nama pada akunnya ikut disamakan — dua nama berbeda untuk satu orang
       membuat laporan menyebut dua pelaku yang sebenarnya sama. */
    if (p.userId && DB.find('users', p.userId)) {
      DB.update('users', p.userId, { nama: isi.nama, jabatan: jabatan(isi.jabatan).nama,
        telp: isi.telp, aktif: isi.aktif });
    }
    return { ok: true };
  }

  /** Berapa jadwal yang akan kehilangan petugasnya bila ini dihapus. */
  function jadwalPekerja(id) {
    return DB.where('mcsJadwal', function (j) { return j.pekerjaId === id; });
  }

  function hapusPekerja(id) {
    var p = pekerjaSatu(id);
    if (!p) return { error: I18N.t('Petugas tidak ditemukan.') };
    var tolak = tolakLuarCabang(p); if (tolak) return tolak;
    /* Jadwalnya ikut dihapus, bukan ditinggalkan menunjuk orang yang tidak
       ada — jadwal tanpa petugas tidak mengingatkan siapa pun. */
    var j = jadwalPekerja(id);
    j.forEach(function (x) { DB.remove('mcsJadwal', x.id); });

    /* ALAT YANG SEDANG IA PEGANG DIKEMBALIKAN KE GUDANG lebih dulu.

       Tanpa ini, alat tetap berkeadaan 'dipakai' sementara pemegangnya
       lenyap dari daftar — dan layar Peralatan menuliskannya sebagai
       'Dipakai · tidak ada pemegang', kalimat yang persis sama dengan alat
       yang memang aman di gudang. Barang senilai jutaan rupiah menjadi
       tidak bisa ditanyakan kepada siapa pun, dan tidak ada satu pun layar
       yang menyebutnya hilang.

       Komentar pada ASET.serah() sudah menyatakannya sejak awal: barang
       'dipakai' tanpa pemegang tercatat adalah persis keadaan yang membuat
       kehilangan tidak bisa ditelusuri, dan itulah satu-satunya alasan
       modul aset ada. Menghapus orangnya tidak boleh menciptakan keadaan
       yang modul itu dibuat untuk mencegahnya.

       Dikembalikan lewat ASET.kembali(), BUKAN dengan DB.update langsung:
       jalur itu menulis baris riwayat, sehingga setahun kemudian masih bisa
       dijawab ke mana alat itu pergi dan kenapa. */
    var alatDilepas = 0;
    if (window.ASET && ASET.dipegang && ASET.kembali) {
      ASET.dipegang(id).forEach(function (a) {
        var r = ASET.kembali(a.id, null, {
          catatan: I18N.t('Dikembalikan otomatis: petugas {nama} dihapus dari daftar.')
            .replace('{nama}', p.nama)
        });
        if (!r || !r.error) alatDilepas++;
      });
    }

    DB.remove('mcsPekerja', id);
    return { ok: true, jadwalIkutTerhapus: j.length, alatDilepas: alatDilepas };
  }

  /* ================================================================== AREA */

  /**
   * Daftar area — SUDAH DISARING menurut jangkauan pengguna yang masuk.
   *
   * Sama alasannya dengan LOKASI.semua: disaring di satu tempat, bukan di
   * tiap layar. Area tanpa lokasiId ikut lolos — itu data dari masa sebelum
   * lokasi ada, dan menyembunyikannya membuat area yang masih dijadwalkan
   * lenyap tanpa satu pun petunjuk kenapa.
   */
  function area(korporatId, semuaTermasukNonaktif) {
    var hasil = DB.where('mcsArea', function (a) {
      return a.korporatId === korporatId && (semuaTermasukNonaktif || a.aktif !== false);
    });
    return window.MCSAKSES ? MCSAKSES.saringArea(hasil) : hasil;
  }
  function areaSatu(id) { return DB.find('mcsArea', id); }

  /* =========================================================== TAG AREA
     Kodenya pendek supaya bisa DIKETIK ketika kameranya tidak jalan —
     petugas di ruang genset tanpa cahaya tetap harus bisa melapor. Huruf
     yang mudah tertukar dibuang: 0/O, 1/I/L, 5/S, 8/B. Yang tersisa masih
     memberi 30^6 ≈ 729 juta kemungkinan. */
  var ABJAD_KODE = 'ACDEFGHJKMNPQRTUVWXYZ2346789';

  function kodePindaiBaru() {
    for (var coba = 0; coba < 50; coba++) {
      var s = '';
      for (var i = 0; i < 6; i++) {
        s += ABJAD_KODE.charAt(Math.floor(Math.random() * ABJAD_KODE.length));
      }
      if (!DB.first('mcsArea', function (a) { return a.kodePindai === s; })) return s;
    }
    /* Tabrakan lima puluh kali berturut-turut praktis mustahil; kalau toh
       terjadi, id area sendiri yang dipakai — unik dan tidak menghalangi. */
    return 'X' + U.uid('').slice(-5).toUpperCase();
  }

  /**
   * Area lama belum punya kode. Diberikan saat pertama dibutuhkan, bukan
   * lewat migrasi serentak: basis data ini hidup di browser tiap pengguna,
   * dan migrasi yang gagal separuh jalan tidak bisa diulang dari mana pun.
   */
  function pastikanKode(a) {
    if (!a) return null;
    if (a.kodePindai) return a.kodePindai;
    var k = kodePindaiBaru();
    DB.update('mcsArea', a.id, { kodePindai: k });
    a.kodePindai = k;
    return k;
  }

  function bakuKode(k) {
    return String(k || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  /** Cari area dari kode tag. Huruf besar-kecil dan spasi diabaikan. */
  function areaDariKode(kode) {
    var k = bakuKode(kode);
    if (!k) return null;
    return DB.first('mcsArea', function (a) {
      return bakuKode(a.kodePindai) === k; }) || null;
  }

  function objekDariKode(kode) {
    var k = bakuKode(kode);
    if (!k) return null;
    return DB.first('mcsObjek', function (o) {
      return bakuKode(o.kodePindai) === k; }) || null;
  }

  /**
   * Kode yang SUDAH DIGANTI tetapi masih dalam masa tenggang.
   *
   * Mengembalikan barisnya, bukan sekadar true — pemanggil perlu tahu kapan
   * kode itu diganti untuk menjelaskannya kepada orang yang memakainya.
   */
  function kodeLamaBerlaku(kode) {
    var k = bakuKode(kode);
    if (!k) return null;
    var batas = new Date(Date.now() - (config().tenggangKodeJam || 72) * 3600000).toISOString();
    return DB.first('mcsKode', function (r) {
      return bakuKode(r.kode) === k && r.digantiPada >= batas;
    });
  }

  /**
   * Ganti kode tag sebuah area atau objek.
   *
   * Kode lama DICATAT, bukan dibuang: ia tetap diterima selama masa tenggang
   * dan setiap pemakaiannya ditandai. Itulah yang membuat penggantian berguna
   * melawan tag yang difoto — bukan karena kode lama langsung mati, melainkan
   * karena pemakaiannya jadi terlihat.
   */
  function putarKode(jenis, id, oleh, sebab) {
    var tabel = jenis === 'objek' ? 'mcsObjek' : 'mcsArea';
    var row = DB.find(tabel, id);
    if (!row) return { error: I18N.t('Tag tidak ditemukan.') };
    var lama = row.kodePindai || null;
    var baru = kodePindaiBaru();
    DB.update(tabel, id, { kodePindai: baru });
    if (lama) {
      DB.insert('mcsKode', {
        korporatId: row.korporatId, jenis: jenis === 'objek' ? 'objek' : 'area',
        targetId: id, kode: lama, kodeBaru: baru,
        digantiPada: U.nowISO(), sebab: String(sebab || '').trim(),
        olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : ''
      });
    }
    return { ok: true, kodeBaru: baru, kodeLama: lama };
  }

  /** Riwayat penggantian kode, terbaru dulu. */
  function riwayatKode(korporatId, batas) {
    return DB.where('mcsKode', function (r) { return r.korporatId === korporatId; })
      .sort(function (a, b) { return String(b.digantiPada).localeCompare(String(a.digantiPada)); })
      .slice(0, batas || 30);
  }

  /**
   * Isi tag QR.
   *
   * Berbentuk ALAMAT, bukan kode telanjang, supaya satu tag melayani dua
   * orang: petugas yang memindai dari dalam aplikasi mendapat konfirmasi
   * kehadiran, dan penghuni gedung yang memindainya dengan kamera biasa
   * sampai ke formulir laporan masalah. Dua poster di dinding untuk satu
   * area hanya akan membuat keduanya diabaikan.
   */
  function tautanTag(a) {
    /* Objek sudah punya kodenya sejak dibuat; hanya area lama yang perlu
       diberi kode saat pertama dibutuhkan. */
    var kode = a && a.areaId ? a.kodePindai : pastikanKode(a);
    var asal = '';
    try { asal = location.origin + location.pathname.replace(/[^/]*$/, ''); } catch (e) {}
    return asal + 'mcs.html#tag=' + kode;
  }

  /**
   * Baca hasil pindaian apa pun bentuknya.
   *
   * Pemindai bisa mengembalikan alamat penuh, dan orang bisa mengetik
   * kodenya saja. Keduanya diterima — yang ditolak hanya yang bukan tag
   * milik gedung ini.
   */
  /**
   * Baca hasil pindaian, apa pun bentuk dan sasarannya.
   *
   * Satu kode bisa menunjuk AREA atau OBJEK di dalamnya, dan bisa pula kode
   * yang sudah diganti tetapi masih dalam masa tenggang. Ketiganya dijawab
   * di sini supaya pemanggil tidak perlu menebak-nebak sendiri.
   *
   * @return null | { area, objek?, kodeUsang? }
   */
  function bacaTag(teks) {
    var s = String(teks || '').trim();
    var m = s.match(/[#?&]tag=([A-Za-z0-9]+)/);
    var k = m ? m[1] : s;

    var o = objekDariKode(k);
    if (o) return { area: areaSatu(o.areaId), objek: o, kodeUsang: null };
    var a = areaDariKode(k);
    if (a) return { area: a, objek: null, kodeUsang: null };

    /* Kode yang sudah diganti: masih diterima selama masa tenggang, tetapi
       dikembalikan dengan penandanya supaya pemanggil bisa mencatatnya. */
    var usang = kodeLamaBerlaku(k);
    if (usang) {
      if (usang.jenis === 'objek') {
        var ob = DB.find('mcsObjek', usang.targetId);
        if (ob) return { area: areaSatu(ob.areaId), objek: ob, kodeUsang: usang };
      } else {
        var ar = areaSatu(usang.targetId);
        if (ar) return { area: ar, objek: null, kodeUsang: usang };
      }
    }
    return null;
  }

  /* ------------------------------------------------- OBJEK DI DALAM AREA */

  function objek(areaId, semua) {
    return DB.where('mcsObjek', function (o) {
      return o.areaId === areaId && (semua || o.aktif !== false);
    }).sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); });
  }
  function objekKorporat(korporatId) {
    return DB.where('mcsObjek', function (o) { return o.korporatId === korporatId; });
  }
  function objekSatu(id) { return DB.find('mcsObjek', id); }

  function tambahObjek(areaId, d) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama objek belum diisi.') };
    var o = DB.insert('mcsObjek', {
      korporatId: a.korporatId, areaId: a.id,
      nama: String(d.nama).trim(),
      jenis: jenisObjek(d.jenis).kode,
      /* Tag sendiri sejak dibuat. Objek tanpa kode adalah objek yang tidak
         bisa dibuktikan — dan memberi kode belakangan berarti ada masa di
         mana sebagian objek bisa dipindai dan sebagian tidak. */
      kodePindai: kodePindaiBaru(),
      /* Urutan pembersihan di dalam area — bukan abjad. Petugas bergerak
         dari pintu ke dalam, dan daftarnya harus mengikuti langkahnya. */
      urut: Number(d.urut) || (objek(areaId, true).length + 1),
      catatan: d.catatan || '',
      foto: (d.foto || []).slice(),
      /* Perkiraan menit sekali dibersihkan. Dipakai membagi biaya area ke
         objek-objeknya — lihat perObjek() di biaya.js. Nol berarti belum
         ditentukan, dan objeknya dikeluarkan dari pembagian, bukan dianggap
         gratis. */
      menitPerKali: Math.max(0, Number(d.menitPerKali) || 0),
      /* Berapa kali SEMINGGU objek ini benar-benar dikerjakan. Nol berarti
         ikut jadwal areanya — itulah bawaan, dan untuk lantai memang benar.

         Ada karena satu gedung sungguhan memperlihatkan angka yang mustahil:
         toilet dilewati 21 kali seminggu, dan perkiraan bahan menganggap tiap
         kloset menerima dosis penuh 50 ml sebanyak 21 kali — 450 botol
         pembersih toilet sebulan, sembilan kali lipat pemakaian nyata.
         Kenyataannya kloset DILAP tiap lewat dan DISIKAT PENUH sekali sehari.
         Kaca lebih jauh lagi: ikut jadwal harian ruangannya, padahal dicuci
         seminggu sekali. Tanpa isian ini, seluruh perkiraan bahan untuk benda
         — bukan bidang — salah dengan kelipatan, bukan dengan selisih. */
      kaliPerMinggu: Math.max(0, Number(d.kaliPerMinggu) || 0),
      /* Dimensi. Disimpan APA ADANYA beserta satuannya, tidak dinormalkan
         ke meter saat menyimpan: yang mengisi menuliskan 120 cm dan ingin
         melihat 120 cm lagi ketika membukanya, bukan 1,2. */
      panjang: Math.max(0, Number(d.panjang) || 0),
      lebar: Math.max(0, Number(d.lebar) || 0),
      tinggi: Math.max(0, Number(d.tinggi) || 0),
      satuanDim: d.satuanDim === 'm' ? 'm' : 'cm',
      /* Berapa BANYAK objek serupa yang diwakili baris ini. Enam bidang kaca
         seukuran tidak perlu didaftarkan enam kali. */
      jumlah: Math.max(1, Math.round(Number(d.jumlah) || 1)),
      /* Mililiter sekali bersih, untuk objek yang diukur per satuan. */
      takaranMl: Math.max(0, Number(d.takaranMl) || 0),
      /* Objek yang menuntut pemindaian sendiri, bukan cukup tag areanya. */
      wajibPindai: !!d.wajibPindai,
      aktif: d.aktif !== false
    });
    return { ok: true, objek: o };
  }

  function ubahObjek(id, d) {
    var o = objekSatu(id);
    if (!o) return { error: I18N.t('Objek tidak ditemukan.') };
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama objek belum diisi.') };
    var isi = {
      nama: String(d.nama).trim(), jenis: jenisObjek(d.jenis).kode,
      catatan: d.catatan || '', wajibPindai: !!d.wajibPindai,
      aktif: d.aktif !== false
    };
    if (d.urut !== undefined) isi.urut = Number(d.urut) || o.urut;
    if (d.kaliPerMinggu !== undefined) {
      isi.kaliPerMinggu = Math.max(0, Number(d.kaliPerMinggu) || 0);
    }
    if (d.menitPerKali !== undefined) {
      isi.menitPerKali = Math.max(0, Number(d.menitPerKali) || 0);
    }
    ['panjang', 'lebar', 'tinggi', 'takaranMl'].forEach(function (kk) {
      if (d[kk] !== undefined) isi[kk] = Math.max(0, Number(d[kk]) || 0);
    });
    if (d.satuanDim !== undefined) isi.satuanDim = d.satuanDim === 'm' ? 'm' : 'cm';
    if (d.jumlah !== undefined) isi.jumlah = Math.max(1, Math.round(Number(d.jumlah) || 1));
    if (d.foto !== undefined) isi.foto = (d.foto || []).slice();
    DB.update('mcsObjek', id, isi);
    return { ok: true };
  }

  function hapusObjek(id) {
    var o = objekSatu(id);
    if (o) (o.foto || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsObjek', id);
    return { ok: true };
  }

  /**
   * Objek yang menuntut pemindaian sendiri tetapi BELUM dipindai hari ini.
   *
   * Dipakai menahan penandaan selesai: area yang bilik-biliknya bertag
   * sendiri tidak boleh dinyatakan bersih hanya karena pintunya dipindai.
   */
  function objekBelumDipindai(areaId, sejakISO) {
    var c = config();
    var batas = sejakISO ||
      new Date(Date.now() - (c.pindaiBerlakuMenit || 45) * 60000).toISOString();
    return objek(areaId).filter(function (o) {
      if (!o.wajibPindai) return false;
      return !DB.first('mcsPindai', function (p) {
        return p.objekId === o.id && p.pada >= batas; });
    });
  }

  /* ------------------------------------------------------ pemindaian */

  /**
   * Catat satu pemindaian.
   *
   * `cara` disimpan apa adanya dan ditampilkan apa adanya. Kode yang
   * DIKETIK bukan bukti kehadiran yang setara dengan kode yang DIPINDAI —
   * ia bisa disalin ke buku catatan dan dipakai dari rumah. Menyamakan
   * keduanya di layar berarti berbohong tentang kekuatan buktinya.
   */
  /**
   * @param d.objekId    objek di dalam area, bila tag objek yang dipindai
   * @param d.kodeUsang  baris mcsKode, bila yang dipakai kode yang sudah diganti
   */
  function catatPindai(areaId, d) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    d = d || {};

    var c = config();
    var jarak = null;
    if (a.koordinat && d.lat != null && window.U && U.jarakMeter) {
      jarak = U.jarakMeter({ lat: d.lat, lng: d.lng }, a.koordinat);
    }
    if (jarak != null && c.radiusMeter > 0 && jarak > c.radiusMeter) {
      return { error: I18N.t('Anda terdeteksi {jarak} m dari area ini — terlalu jauh untuk dianggap hadir.')
        .replace('{jarak}', Math.round(jarak)) };
    }

    var p = DB.insert('mcsPindai', {
      korporatId: a.korporatId, areaId: a.id,
      pada: U.nowISO(),
      cara: d.cara === 'manual' ? 'manual' : 'kamera',
      lat: d.lat != null ? d.lat : null,
      lng: d.lng != null ? d.lng : null,
      akurasi: d.akurasi != null ? d.akurasi : null,
      jarakM: jarak != null ? Math.round(jarak) : null,
      pekerjaId: d.pekerjaId || null,
      objekId: d.objekId || null,
      /* Pemindaian yang memakai kode yang SUDAH DIGANTI dicatat apa adanya,
         bukan ditolak. Menolaknya hanya menyembunyikan kejadiannya; menandainya
         membuatnya bisa ditelusuri — dan tag yang difoto lalu dipindai dari
         kantin justru terlihat di sini. */
      kodeUsang: d.kodeUsang ? d.kodeUsang.kode : null,
      kodeUsangSejak: d.kodeUsang ? d.kodeUsang.digantiPada : null,
      olehId: d.oleh ? d.oleh.id : null,
      olehNama: d.oleh ? d.oleh.nama : ''
    });
    /* Diserap ke ronda yang sedang berjalan, bila pemindaiannya memang jatuh
       pada salah satu rute. Dibungkus penjaga: pemindaian tetap sah sebagai
       bukti kehadiran walaupun ia tidak cocok dengan ronda mana pun, dan
       kegagalan di sana tidak boleh menggagalkan pencatatannya. */
    try { if (window.RONDA) RONDA.serap(p); } catch (e) {}

    /* ---------------------------------------- KEHADIRAN TERCATAT SENDIRI

       Petugas yang memindai tag di area jam tujuh pagi SUDAH membuktikan
       kehadirannya — lebih kuat daripada tombol “Saya hadir” mana pun,
       karena tag itu tertempel di dinding gedung dan tidak bisa dipindai
       dari rumah.

       Meminta orang yang sudah memindai untuk juga menekan tombol hadir
       adalah menuntut bukti yang lebih lemah setelah bukti yang lebih kuat
       diberikan. Yang terjadi di lapangan: tombolnya tidak ditekan, dan
       absensi kosong sementara pekerjaannya penuh — dua tabel yang saling
       menyangkal, yang harus dibereskan seseorang di sore hari dari ingatan.

       TIGA BATAS YANG DIJAGA:

         · Hanya bila BELUM ada catatan hari itu. Absensi yang sudah diisi
           penyelia tidak boleh ditimpa mesin — penyelia yang menandai
           seseorang izin punya alasan yang tidak diketahui pemindai tag,
           dan orang yang izin memang bisa mampir sebentar.
         · Hanya pemindaian yang menyebut PETUGASNYA. Tag yang dipindai
           penghuni gedung tidak menghadirkan siapa pun.
         · Hanya bila korporatnya sama. */
    try {
      if (d.pekerjaId) {
        var pk = pekerjaSatu(d.pekerjaId);
        var tglP = String(p.pada).slice(0, 10);
        if (pk && pk.korporatId === a.korporatId) {
          var sudah = DB.first('mcsAbsensi', function (x) {
            return x.pekerjaId === d.pekerjaId && x.tgl === tglP;
          });
          if (!sudah) {
            tandaiHadir(a.korporatId, d.pekerjaId, tglP, 'hadir',
              { bukti: 'sendiri',
                catatan: I18N.t('Tercatat otomatis dari pemindaian tag.') }, d.oleh || null);
          }
        }
      }
    } catch (e) {}

    return { ok: true, pindai: p, area: a, jarakM: jarak };
  }

  /** Pemindaian terakhir yang masih berlaku untuk sebuah area. */
  function pindaiBerlaku(areaId, saatIni) {
    var c = config();
    var batas = (saatIni ? new Date(saatIni) : new Date()).getTime() -
                (c.pindaiBerlakuMenit || 45) * 60000;
    var pilih = null;
    DB.where('mcsPindai', function (p) { return p.areaId === areaId; }).forEach(function (p) {
      var t = new Date(p.pada).getTime();
      if (t >= batas && (!pilih || t > new Date(pilih.pada).getTime())) pilih = p;
    });
    return pilih;
  }

  /** Riwayat pemindaian sebuah area, terbaru dulu. */
  function riwayatPindai(areaId, batas) {
    return DB.where('mcsPindai', function (p) { return p.areaId === areaId; })
      .sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); })
      .slice(0, batas || 20);
  }

  /**
   * Lokasi mana yang memuat lantai ini.
   *
   * Ruangan hanya menyebut lantainya; lokasinya berada empat langkah di
   * atas — lantai → bangunan → petak → lokasi. Tanpa diturunkan di sini,
   * ruangan tersimpan tanpa lokasi dan muncul sebagai "belum ditetapkan"
   * di portofolio maupun biaya per lokasi. Tidak ada galat: hanya seluruh
   * isi gedung yang diam-diam tidak terhitung ke gedungnya sendiri.
   */
  function lokasiDariLantai(lantaiId) {
    if (!lantaiId || !window.BANGUNAN) return null;
    var l = BANGUNAN.lantaiSatu(lantaiId);
    var b = l ? BANGUNAN.satu(l.bangunanId) : null;
    var petak = b ? areaSatu(b.areaId) : null;
    return petak ? (petak.lokasiId || null) : null;
  }

  function tambahArea(korporatId, d) {
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama area belum diisi.') };
    var a = DB.insert('mcsArea', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      jenis: jenisArea(d.jenis).kode,
      /* Rujukan ke catatan gedung, bila korporat ini memakainya. Kolom
         teks `gedung` DIPERTAHANKAN di sebelahnya, bukan diganti: data
         lama yang sudah terisi tidak boleh hilang hanya karena cara
         menyimpannya berubah, dan ia menjadi bahan usulan pemindahan. */
      lokasiId: d.lokasiId || lokasiDariLantai(d.lantaiId) || null,
      /* Ada isinya berarti baris ini sebuah RUANGAN di dalam bangunan;
         kosong berarti ia petak langsung di bawah lokasi. Satu medan ini
         yang menentukan sebutannya di seluruh layar. */
      lantaiId: d.lantaiId || null,
      gedung: d.gedung || '',
      lantai: d.lantai || '',
      luas: Math.max(0, Math.round(d.luas || 0)),
      /* BERAPA KALI SEBULAN pekerjaan BERKALA dilakukan di area ini — poles
         lantai, cuci karpet, kristalisasi.

         Berbeda dari frekuensi jadwal rutin, dan bedanya bukan kecil.
         Pembersihan rutin terjadi tiap hari; memoles lantai showroom terjadi
         sebulan sekali. Menurunkan jam mesin poles dari frekuensi rutin sudah
         dicoba dan hasilnya berlipat: mesin berumur tujuh bulan terbaca 106%
         aus.

         NOL berarti TIDAK ADA pekerjaan berkala di area ini — bukan ‘belum
         diisi’. Akibatnya jam mesin poles dan steam di area itu tidak
         diperkirakan sama sekali, dan itu jawaban yang benar: menaksir dari
         angka yang tidak ada berarti mengarang. */
      berkalaPerBulan: Math.max(0, Number(d.berkalaPerBulan) || 0),
      /* Tag yang tertempel di dinding. Diberikan sejak awal dan TIDAK PERNAH
         berubah — mengganti kode berarti setiap poster yang sudah dicetak
         menjadi sampah, dan setiap pemindaian lama kehilangan rujukannya. */
      kodePindai: kodePindaiBaru(),
      /* Titik area di peta, bila ditandai. Dipakai memeriksa kewajaran jarak
         saat memindai — bukan untuk melacak orang. */
      koordinat: d.koordinat || null,
      checklist: (d.checklist || []).slice(),
      /* Foto acuan: seperti apa area ini, dan seperti apa ia ketika bersih.
         Petugas baru yang belum pernah ke lantai 3 tidak bisa menebaknya dari
         nama saja, dan "bersih" berarti hal yang berbeda bagi tiap orang. */
      foto: (d.foto || []).slice(),
      /* Area yang menuntut bukti foto sebelum-sesudah. Tidak semua menuntutnya:
         memaksa foto untuk menyapu koridor delapan kali sehari membuat
         petugas memotret asal-asalan, dan buktinya jadi tidak berarti. */
      wajibFoto: !!d.wajibFoto,
      /* Semua langkah wajib harus dicentang sebelum tugas bisa ditandai selesai. */
      wajibLangkah: !!d.wajibLangkah,
      /* Tiap langkah wajib menuntut foto sebelum DAN sesudah miliknya sendiri. */
      wajibFotoLangkah: !!d.wajibFotoLangkah,
      catatan: d.catatan || '',
      aktif: d.aktif !== false
    });
    return { ok: true, area: a };
  }

  function ubahArea(id, d) {
    var a = areaSatu(id);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var tolak = tolakLuarCabang(null, a); if (tolak) return tolak;
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama area belum diisi.') };
    DB.update('mcsArea', id, {
      nama: String(d.nama).trim(), jenis: jenisArea(d.jenis).kode,
      /* Hanya ditulis bila formulirnya memang mengirimnya. Formulir yang
         tidak memuat kolomnya — karena korporat ini belum punya gedung —
         tidak boleh melepaskan area dari gedungnya. */
      lokasiId: d.lokasiId !== undefined
        ? (d.lokasiId || null)
        : (d.lantaiId !== undefined
            ? (lokasiDariLantai(d.lantaiId) || a.lokasiId || null)
            : (a.lokasiId || null)),
      /* Hanya ditulis bila formulirnya memang mengirimnya — formulir yang
         tidak memuat kolomnya tidak boleh melepaskan ruangan dari lantainya. */
      lantaiId: d.lantaiId !== undefined ? (d.lantaiId || null) : (a.lantaiId || null),
      gedung: d.gedung !== undefined ? (d.gedung || '') : (a.gedung || ''),
      lantai: d.lantai || '',
      luas: Math.max(0, Math.round(d.luas || 0)),
      /* Hanya ditulis bila formulirnya memang mengirimnya — impor CSV dan
         pendaftaran cepat tidak memuat kolomnya, dan tidak boleh mengosongkan
         frekuensi berkala yang sudah disetel orang. */
      berkalaPerBulan: d.berkalaPerBulan !== undefined
        ? Math.max(0, Number(d.berkalaPerBulan) || 0)
        : (Number(a.berkalaPerBulan) || 0),
      /* Sama seperti foto: langkah hanya ditulis bila formulirnya memang
         mengirimnya. Dikelola dari dialognya sendiri, dan formulir area yang
         tidak memuat kolomnya tidak boleh menghapusnya. */
      checklist: d.checklist !== undefined ? d.checklist.slice() : (a.checklist || []),
      /* Foto acuan hanya diganti bila memang dikirim — formulir yang tidak
         memuat kolomnya tidak boleh menghapus foto yang sudah ada. */
      foto: d.foto !== undefined ? (d.foto || []).slice() : (a.foto || []),
      wajibFoto: d.wajibFoto !== undefined ? !!d.wajibFoto : !!a.wajibFoto,
      wajibLangkah: d.wajibLangkah !== undefined ? !!d.wajibLangkah : !!a.wajibLangkah,
      wajibFotoLangkah: d.wajibFotoLangkah !== undefined ? !!d.wajibFotoLangkah
                                                         : !!a.wajibFotoLangkah,
      catatan: d.catatan || '', aktif: d.aktif !== false
    });
    return { ok: true };
  }

  /**
   * Tempelkan foto acuan ke sebuah area.
   *
   * Dipisahkan dari ubahArea supaya unggahan bisa terjadi tanpa membuka
   * seluruh formulir — memotret area sambil berdiri di depannya adalah hal
   * yang paling sering dilakukan, dan ia tidak seharusnya menuntut sebelas
   * kolom lain ikut diisi ulang.
   */
  function tambahFotoArea(id, fotoIds) {
    var a = areaSatu(id);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    DB.update('mcsArea', id, { foto: (a.foto || []).concat(fotoIds || []) });
    return { ok: true };
  }

  function hapusFotoArea(id, fotoId) {
    var a = areaSatu(id);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    DB.update('mcsArea', id, {
      foto: (a.foto || []).filter(function (x) { return x !== fotoId; })
    });
    DB.delPhoto(fotoId);
    return { ok: true };
  }

  /* =========================================================== LANGKAH KERJA
     Checklist pembersihan sebuah area. Tiap langkah punya ID SENDIRI, bukan
     sekadar posisi dalam daftar: laporan yang tersimpan menunjuk id itu, dan
     kalau urutannya berubah sementara laporannya menunjuk indeks, catatan lama
     akan diam-diam berarti langkah yang berbeda. */

  /**
   * Langkah sebuah area dalam bentuk baku.
   *
   * Menerima dua bentuk: daftar teks (bentuk lama) dan daftar objek. Data lama
   * tidak dipaksa berubah bentuk hanya karena bentuk barunya lebih rapi — ia
   * ikut naik bentuk sendiri saat pertama kali disunting.
   */
  function langkahArea(area) {
    return ((area && area.checklist) || []).map(function (x, i) {
      if (typeof x === 'string') return { id: 'lk' + i, teks: x, wajib: true };
      return { id: x.id || ('lk' + i), teks: x.teks || '', wajib: x.wajib !== false };
    }).filter(function (x) { return String(x.teks).trim(); });
  }

  function idLangkahBaru(area) {
    var pakai = {};
    langkahArea(area).forEach(function (l) { pakai[l.id] = 1; });
    var n = 1, id;
    do { id = 'lk' + n; n++; } while (pakai[id]);
    return id;
  }

  function tulisLangkah(areaId, daftar) {
    DB.update('mcsArea', areaId, { checklist: daftar });
    return areaSatu(areaId);
  }

  function tambahLangkah(areaId, teks, wajib) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    if (!String(teks || '').trim()) return { error: I18N.t('Langkah belum diisi.') };
    var d = langkahArea(a);
    d.push({ id: idLangkahBaru(a), teks: String(teks).trim(), wajib: wajib !== false });
    tulisLangkah(areaId, d);
    return { ok: true };
  }

  function ubahLangkah(areaId, stepId, patch) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var ada = false;
    var d = langkahArea(a).map(function (l) {
      if (l.id !== stepId) return l;
      ada = true;
      return {
        id: l.id,
        teks: patch.teks !== undefined ? String(patch.teks).trim() : l.teks,
        wajib: patch.wajib !== undefined ? !!patch.wajib : l.wajib
      };
    }).filter(function (l) { return String(l.teks).trim(); });
    if (!ada) return { error: I18N.t('Langkah tidak ditemukan.') };
    tulisLangkah(areaId, d);
    return { ok: true };
  }

  /**
   * Hapus satu langkah.
   *
   * Centang pada laporan yang SUDAH tersimpan tidak ikut dibersihkan: ia
   * menunjuk id yang tidak ada lagi dan otomatis terabaikan saat dihitung.
   * Membersihkannya berarti mengubah catatan masa lalu, dan catatan yang bisa
   * berubah bukan catatan.
   */
  function hapusLangkah(areaId, stepId) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    tulisLangkah(areaId, langkahArea(a).filter(function (l) { return l.id !== stepId; }));
    return { ok: true };
  }

  function geserLangkah(areaId, stepId, arah) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var d = langkahArea(a);
    var i = -1;
    d.forEach(function (l, k) { if (l.id === stepId) i = k; });
    var j = i + (arah < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= d.length) return { ok: true };
    var tmp = d[i]; d[i] = d[j]; d[j] = tmp;
    tulisLangkah(areaId, d);
    return { ok: true };
  }

  /** Berapa langkah yang sudah dicentang pada satu laporan. */
  /**
   * Kemajuan checklist sebuah laporan.
   *
   * `fotoBelum` hanya diisi bila areanya memang menuntut foto per langkah —
   * daftar kekurangan yang muncul di area yang tidak menuntutnya hanya
   * membuat layar penuh peringatan yang tidak berarti apa-apa.
   */
  function progresLangkah(area, rec) {
    var d = langkahArea(area);
    var centang = (rec && rec.langkah) || {};
    var selesai = d.filter(function (l) { return centang[l.id]; }).length;
    var wajibBelum = d.filter(function (l) { return l.wajib && !centang[l.id]; });

    var perluFoto = !!(area && area.wajibFotoLangkah);
    var fotoBelum = !perluFoto ? [] : d.filter(function (l) {
      if (!l.wajib) return false;
      var f = fotoLangkah(rec, l.id);
      return !f.sebelum.length || !f.sesudah.length;
    });
    var berfoto = d.filter(function (l) {
      var f = fotoLangkah(rec, l.id);
      return f.sebelum.length && f.sesudah.length;
    }).length;

    return { total: d.length, selesai: selesai, wajibBelum: wajibBelum,
             perluFoto: perluFoto, fotoBelum: fotoBelum, berfoto: berfoto,
             persen: d.length ? Math.round(selesai / d.length * 100) : 0 };
  }

  function jadwalArea(id) {
    return DB.where('mcsJadwal', function (j) { return j.areaId === id; });
  }

  function hapusArea(id) {
    var a = areaSatu(id);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var tolak = tolakLuarCabang(null, a); if (tolak) return tolak;
    var j = jadwalArea(id);
    j.forEach(function (x) { DB.remove('mcsJadwal', x.id); });
    DB.remove('mcsArea', id);
    return { ok: true, jadwalIkutTerhapus: j.length };
  }

  /* ================================================================ JADWAL */

  /**
   * Daftar jadwal — SUDAH DISARING menurut cabang yang dijangkau pengguna,
   * lewat area masing-masing jadwal.
   *
   * Karena tugasHari() dan seluruh rekap berdiri di atas fungsi ini, satu
   * penyaringan di sini membuat halaman depan, capaian bulan, pemeriksaan
   * silang, dan laporan kinerja sekaligus berbicara tentang cabang yang
   * benar. Menyaringnya di tiap layar berarti dua puluh kesempatan untuk
   * lupa pada salah satunya.
   */
  function jadwal(korporatId, semuaTermasukNonaktif) {
    var l = semuaJadwal(korporatId, semuaTermasukNonaktif);
    return window.MCSAKSES ? MCSAKSES.saringJadwal(l) : l;
  }

  /** Seluruh jadwal korporat tanpa penyaringan cabang — untuk pemeriksaan
      keberadaan, bukan untuk ditampilkan. Alasannya sama dengan
      semuaPekerja(). */
  function semuaJadwal(korporatId, semuaTermasukNonaktif) {
    return DB.where('mcsJadwal', function (j) {
      return j.korporatId === korporatId && (semuaTermasukNonaktif || j.aktif !== false);
    });
  }
  function jadwalSatu(id) { return DB.find('mcsJadwal', id); }

  function periksaJadwal(d) {
    if (!d.areaId || !areaSatu(d.areaId)) return I18N.t('Area belum dipilih.');
    if (!d.pekerjaId || !pekerjaSatu(d.pekerjaId)) return I18N.t('Petugas belum dipilih.');
    /* Satu tempat, dua pintu: tambahJadwal dan ubahJadwal sama-sama lewat
       sini, jadi keduanya terjaga tanpa perlu diingat dua kali. */
    var tolak = tolakLuarCabang(pekerjaSatu(d.pekerjaId), areaSatu(d.areaId));
    if (tolak) return tolak.error;
    var sk = siklus(d.siklus);
    if (!sk.bulan) {
      if (!(d.hari || []).length) return I18N.t('Pilih setidaknya satu hari.');
    } else {
      var tb = d.tglBulan;
      if (tb !== 'akhir' && !(Number(tb) >= 1 && Number(tb) <= 31)) {
        return I18N.t('Pilih tanggal pelaksanaan dalam bulan.');
      }
      if (!d.mulaiDari) return I18N.t('Tentukan mulai berlaku dari kapan.');
    }
    if (d.mode === 'interval') {
      if (!(d.intervalJam > 0)) return I18N.t('Jarak pengulangan harus lebih dari nol jam.');
      if (!d.mulai || !d.selesai) return I18N.t('Jam mulai dan selesai belum lengkap.');
      if (d.selesai <= d.mulai) return I18N.t('Jam selesai harus setelah jam mulai.');
    } else {
      if (!(d.jam || []).length) return I18N.t('Isi setidaknya satu jam pembersihan.');
    }
    return null;
  }

  function tambahJadwal(korporatId, d) {
    var sebab = periksaJadwal(d);
    if (sebab) return { error: sebab };
    var j = DB.insert('mcsJadwal', {
      korporatId: korporatId,
      areaId: d.areaId, pekerjaId: d.pekerjaId,
      mode: d.mode === 'interval' ? 'interval' : 'jam',
      jam: (d.jam || []).slice().sort(),
      intervalJam: Math.max(1, Math.round(d.intervalJam || 2)),
      mulai: d.mulai || '07:00', selesai: d.selesai || '17:00',
      hari: (d.hari || []).slice().sort(),
      /* Siklus panjang memakai tglBulan + mulaiDari; siklus mingguan memakai
         hari[]. Keduanya disimpan apa adanya supaya berpindah siklus tidak
         menghapus setelan yang lain. */
      siklus: siklus(d.siklus).kode,
      tglBulan: d.tglBulan === 'akhir' ? 'akhir' : (Number(d.tglBulan) || 1),
      mulaiDari: d.mulaiDari || U.today(),
      catatan: d.catatan || '',
      aktif: d.aktif !== false
    });
    return { ok: true, jadwal: j };
  }

  function ubahJadwal(id, d) {
    var lama = jadwalSatu(id);
    if (!lama) return { error: I18N.t('Jadwal tidak ditemukan.') };
    /* Yang LAMA juga diperiksa, bukan hanya yang baru: tanpa ini sebuah
       jadwal milik cabang lain bisa “dipindahkan” ke cabang sendiri, dan
       pemeriksaan atas tujuannya akan meloloskannya. */
    var tolakLama = tolakLuarCabang(pekerjaSatu(lama.pekerjaId), areaSatu(lama.areaId));
    if (tolakLama) return tolakLama;
    var sebab = periksaJadwal(d);
    if (sebab) return { error: sebab };
    DB.update('mcsJadwal', id, {
      areaId: d.areaId, pekerjaId: d.pekerjaId,
      mode: d.mode === 'interval' ? 'interval' : 'jam',
      jam: (d.jam || []).slice().sort(),
      intervalJam: Math.max(1, Math.round(d.intervalJam || 2)),
      mulai: d.mulai || '07:00', selesai: d.selesai || '17:00',
      hari: (d.hari || []).slice().sort(),
      /* Siklus panjang memakai tglBulan + mulaiDari; siklus mingguan memakai
         hari[]. Keduanya disimpan apa adanya supaya berpindah siklus tidak
         menghapus setelan yang lain. */
      siklus: siklus(d.siklus).kode,
      tglBulan: d.tglBulan === 'akhir' ? 'akhir' : (Number(d.tglBulan) || 1),
      mulaiDari: d.mulaiDari || U.today(),
      catatan: d.catatan || '', aktif: d.aktif !== false
    });
    return { ok: true };
  }

  function jedaJadwal(id, aktif) {
    if (!jadwalSatu(id)) return { error: I18N.t('Jadwal tidak ditemukan.') };
    DB.update('mcsJadwal', id, { aktif: !!aktif });
    return { ok: true };
  }
  function hapusJadwal(id) {
    var j = jadwalSatu(id);
    if (!j) return { error: I18N.t('Jadwal tidak ditemukan.') };
    var tolak = tolakLuarCabang(pekerjaSatu(j.pekerjaId), areaSatu(j.areaId));
    if (tolak) return tolak;
    /* Catatan tugasnya ikut dibuang.
       Ini BUKAN membuang riwayat. Baris mcsTugas dikunci dengan
       jadwalId|tanggal|jam dan hanya bisa ditemukan lewat jadwal yang
       menghasilkannya — begitu jadwalnya hilang, tidak ada satu pun layar yang
       bisa mencapainya lagi. Yang tersisa hanyalah baris yang menumpuk di
       penyimpanan tanpa pernah terbaca, dan ikut terkirim tiap kali data
       disinkronkan. */
    var n = 0;
    DB.where('mcsTugas', function (t) { return t.jadwalId === id; })
      .slice().forEach(function (t) { DB.remove('mcsTugas', t.id); n++; });
    DB.remove('mcsJadwal', id);
    return { ok: true, catatanDibuang: n };
  }

  /** Jam-jam yang dituntut sebuah jadwal pada satu tanggal. */
  function slotJadwal(j, tanggal) {
    /* Jadwal lama tidak punya field `siklus`; ia mingguan, dan harus tetap
       berjalan persis seperti sebelumnya tanpa disentuh. */
    if (j.siklus && j.siklus !== 'mingguan') {
      if (!jatuhBerkala(j, tanggal)) return [];
    } else {
      var hari = new Date(tanggal + 'T00:00:00').getDay();
      if ((j.hari || []).indexOf(hari) < 0) return [];
    }
    if (j.mode !== 'interval') return (j.jam || []).slice();

    var out = [];
    var m = jamKeMenit(j.mulai), s = jamKeMenit(j.selesai);
    var langkah = Math.max(1, j.intervalJam) * 60;
    for (var t = m; t <= s; t += langkah) out.push(menitKeJam(t));
    return out;
  }

  function jamKeMenit(j) { var p = String(j || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function menitKeJam(m) {
    var h = Math.floor(m / 60), n = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (n < 10 ? '0' : '') + n;
  }

  /* ================================================================= TUGAS */

  function kunciTugas(jadwalId, tanggal, jam) { return jadwalId + '|' + tanggal + '|' + jam; }

  function catatan(korporatId, tanggal) {
    return DB.where('mcsTugas', function (t) {
      return t.korporatId === korporatId && t.tgl === tanggal;
    });
  }

  /**
   * Daftar tugas pada satu tanggal — DIHITUNG dari jadwal, bukan disimpan.
   *
   * Jadwal "toilet tiap 2 jam, Senin–Jumat" menghasilkan lebih dari dua ribu
   * baris setahun bila tiap kejadiannya ditulis. Yang disimpan hanya jadwalnya
   * dan penyelesaiannya; sisanya dihitung saat dibuka.
   */
  function tugasHari(korporatId, tanggal) {
    tanggal = tanggal || U.today();
    var c = config();
    var selesai = {};
    catatan(korporatId, tanggal).forEach(function (t) {
      selesai[kunciTugas(t.jadwalId, t.tgl, t.jam)] = t;
    });

    /* JAM DINDING DIAMBIL PER CABANG, bukan sekali untuk semuanya.

       Satu korporat bisa punya cabang di Makassar dan Jayapura. Sebelum ini
       `menitKini` dihitung sekali dari jam peramban yang sedang membuka,
       lalu dipakai menilai SELURUH cabang: tugas berjadwal 06.30 di Makassar
       baru dianggap lewat ketika Jakarta sudah pukul 06.31 — satu jam
       terlambat — dan di Jayapura dua jam terlambat.

       Begitu pula ‘hari ini’: pukul 23.30 di Jakarta sudah tanggal berikutnya
       di Jayapura, sehingga jadwal hari itu di sana terbaca sebagai hari yang
       sudah lewat selama dua jam setiap malam.

       Disimpan per zona, bukan dihitung ulang tiap slot: satu korporat
       memakai paling banyak tiga zona, sementara slotnya ribuan. */
    var jamZona = {};
    function kiniDi(tz) {
      if (!jamZona[tz]) {
        jamZona[tz] = window.ZONA
          ? { menit: ZONA.menitKini(tz), hari: ZONA.hariIni(tz) }
          : { menit: new Date().getHours() * 60 + new Date().getMinutes(), hari: U.today() };
      }
      return jamZona[tz];
    }

    var out = [];
    jadwal(korporatId).forEach(function (j) {
      var a = areaSatu(j.areaId), p = pekerjaSatu(j.pekerjaId);
      if (!a || !p || a.aktif === false || p.aktif === false) return;
      var tz = window.ZONA ? ZONA.area(a) : null;
      var kini = kiniDi(tz || '-');
      var hariIni = tanggal === kini.hari;
      var menitKini = kini.menit;
      /* Jadwal tidak berlaku surut. Korporat yang memasang MCS hari ini tidak
         seharusnya melihat dua minggu 'kegagalan' atas tugas yang belum pernah
         ada — laporan seperti itu menghukum orang untuk sesuatu yang tidak
         mungkin ia kerjakan, dan angkanya tidak berarti apa-apa. */
      var sejak = String(j.createdAt || '').slice(0, 10);
      if (sejak && tanggal < sejak) return;
      slotJadwal(j, tanggal).forEach(function (jam) {
        var k = kunciTugas(j.id, tanggal, jam);
        var rec = selesai[k];
        var status = 'akan';
        /* `proses` = sudah ada foto sebelum, tetapi belum ditandai selesai.
           Ia tetap harus diperlakukan sebagai belum selesai — termasuk ikut
           terhitung terlambat bila jamnya sudah lewat. */
        if (rec && rec.status !== 'proses') status = rec.status;
        else if (rec) status = 'proses';
        else if (!hariIni && tanggal < kini.hari) status = 'terlewat';
        else if (hariIni && menitKini > jamKeMenit(jam) + (c.telatMenit || 30)) status = 'terlambat';
        else if (hariIni && menitKini >= jamKeMenit(jam)) status = 'jatuhTempo';

        out.push({
          kunci: k, jadwalId: j.id, tgl: tanggal, jam: jam,
          /* ZONA tempat tugas ini dikerjakan. Sudah dihitung di atas untuk
             menentukan statusnya; dibawa serta supaya yang memakai tugas ini
             tidak menghitungnya lagi dengan cara sendiri — dan tidak salah
             menghitungnya. `jam` adalah waktu SETEMPAT di lokasi itu, bukan
             waktu perangkat yang membacanya. */
          zona: tz || '',
          area: a, pekerja: p, jadwal: j, status: status,
          catatan: rec ? rec.catatan : '', olehNama: rec ? rec.olehNama : '',
          selesaiAt: rec ? rec.selesaiAt : null,
          sebelum: rec ? (rec.sebelum || []) : [],
          sesudah: rec ? (rec.sesudah || []) : [],
          langkah: langkahArea(a),
          progres: progresLangkah(a, rec),
          wajibLangkah: !!a.wajibLangkah,
          wajibFotoLangkah: !!a.wajibFotoLangkah,
          fotoLangkah: function (stepId) { return fotoLangkah(rec, stepId); },
          /* Pelaksana sebenarnya bisa berbeda dari yang dijadwalkan. */
          pelaksana: rec && rec.pekerjaId ? (pekerjaSatu(rec.pekerjaId) || p) : p,
          wajibFoto: !!a.wajibFoto
        });
      });
    });
    return U.sortBy(out, function (t) { return t.jam; });
  }

  /**
   * Catat hasil satu tugas.
   *
   * `oleh` adalah yang MENCATAT (staf korporat yang sedang masuk), sedangkan
   * `d.pekerjaId` adalah yang MENGERJAKAN. Keduanya sering berbeda: petugas
   * kebersihan tidak punya akun di aplikasi ini, jadi laporannya masuk lewat
   * perangkat penyelianya. Menyatukan keduanya membuat bukti menunjuk orang
   * yang tidak pernah memegang pel.
   */
  function tandai(korporatId, jadwalId, tanggal, jam, status, oleh, d) {
    d = typeof d === 'string' ? { catatan: d } : (d || {});
    var j = jadwalSatu(jadwalId);
    if (!j || j.korporatId !== korporatId) return { error: I18N.t('Jadwal tidak ditemukan.') };

    var a = areaSatu(j.areaId);
    var ada = DB.first('mcsTugas', function (t) {
      return t.jadwalId === jadwalId && t.tgl === tanggal && t.jam === jam; });

    /* Area yang menuntut bukti tidak bisa ditandai selesai tanpa foto sesudah.
       Yang diperiksa adalah foto yang AKAN ADA sesudah panggilan ini — gabungan
       yang sudah tersimpan dan yang baru dikirim. Memeriksa hanya yang dikirim
       menolak laporan yang fotonya justru sudah lengkap, diunggah semenit lalu.

       Foto sebelum boleh kosong — petugas kadang baru ingat memotret setelah
       mulai, dan menolak laporannya justru membuat ia berhenti melaporkan. */
    var sesudahAkhir = d.sesudah !== undefined ? (d.sesudah || [])
                                               : ((ada && ada.sesudah) || []);
    if (status === 'selesai' && a && a.wajibFoto && !sesudahAkhir.length) {
      return { error: I18N.t('Area ini menuntut foto sesudah sebagai bukti.') };
    }

    /* Langkah wajib yang belum dicentang menahan penandaan selesai — tetapi
       HANYA bila areanya memang menuntutnya. Menegakkannya di mana-mana
       membuat petugas mencentang semuanya sekaligus tanpa membaca, dan
       checklist yang selalu penuh tidak memberi tahu apa pun. */
    if (status === 'selesai' && a && (a.wajibLangkah || a.wajibFotoLangkah)) {
      var pr = progresLangkah(a, ada);
      if (a.wajibLangkah && pr.wajibBelum.length) {
        return { error: I18N.t(pr.wajibBelum.length === 1
            ? 'Satu langkah wajib belum dicentang: {teks}'
            : I18N.t('Masih ada {n} langkah wajib yang belum dicentang: {teks}'))
          .replace('{n}', pr.wajibBelum.length)
          .replace('{teks}', pr.wajibBelum.map(function (l) { return l.teks; }).join(', ')) };
      }
      /* Foto sebelum DAN sesudah untuk tiap langkah wajib. Disebutkan
         langkahnya, bukan sekadar ditolak — orang yang tidak tahu mana yang
         kurang akan memotret ulang semuanya. */
      if (a.wajibFotoLangkah && pr.fotoBelum.length) {
        return { error: I18N.t(pr.fotoBelum.length === 1
            ? 'Foto sebelum-sesudah belum lengkap pada langkah: {teks}'
            : I18N.t('Foto sebelum-sesudah belum lengkap pada {n} langkah: {teks}'))
          .replace('{n}', pr.fotoBelum.length)
          .replace('{teks}', pr.fotoBelum.map(function (l) { return l.teks; }).join(', ')) };
      }
    }
    /* ------------------------------------------- BUKTI KEHADIRAN
       Ditegakkan HANYA saat menandai selesai, dan hanya bila korporat
       menyalakannya. Tugas yang ditandai batal atau dilewati tidak menuntut
       kehadiran — justru ketidakhadiran itu isi laporannya. */
    var pindaiDipakai = null;
    if (status === 'selesai' && a && config().wajibPindai) {
      pindaiDipakai = pindaiBerlaku(a.id);
      if (!pindaiDipakai) {
        return { error: I18N.t('Pindai dulu tag di {area}. Laporan tanpa bukti kehadiran ' +
          'hanya pengakuan sendiri.').replace('{area}', a.nama) };
      }
      /* Objek bertag sendiri harus ikut dipindai. Area yang biliknya
         bertag tidak boleh dinyatakan bersih hanya karena pintunya
         disentuh sekali. */
      var kurang = objekBelumDipindai(a.id);
      if (kurang.length) {
        return { error: I18N.t(kurang.length === 1
            ? 'Satu objek belum dipindai: {teks}'
            : I18N.t('{n} objek belum dipindai: {teks}'))
          .replace('{n}', kurang.length)
          .replace('{teks}', kurang.map(function (o) { return o.nama; }).join(', ')) };
      }
    }

    var isi = {
      korporatId: korporatId, jadwalId: jadwalId, tgl: tanggal, jam: jam,
      status: status, catatan: d.catatan || '',
      /* Siapa yang mengerjakan — bawaannya petugas yang dijadwalkan. */
      pekerjaId: d.pekerjaId || j.pekerjaId || null,
      sebelum: (d.sebelum || (ada && ada.sebelum) || []).slice(),
      sesudah: (d.sesudah || (ada && ada.sesudah) || []).slice(),
      langkah: Object.assign({}, (ada && ada.langkah) || {}, d.langkah || {}),
      langkahFoto: Object.assign({}, (ada && ada.langkahFoto) || {}, d.langkahFoto || {}),
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : '',
      /* Rujukan ke baris buku besar pemindaian, bukan salinan isinya.
         Satu sumber kebenaran: kalau nanti pemindaiannya perlu diperiksa
         ulang, yang dibaca tetap barisnya sendiri. Tugas yang ditandai
         tanpa kewajiban pindai menyimpan null, dan itu jujur. */
      pindaiId: pindaiDipakai ? pindaiDipakai.id
                              : ((ada && ada.pindaiId) || null),
      selesaiAt: U.nowISO()
    };
    if (ada) DB.update('mcsTugas', ada.id, isi);
    else DB.insert('mcsTugas', isi);
    return { ok: true };
  }

  /** Catatan tersimpan untuk satu slot — dipakai dialog laporan foto. */
  function catatanSlot(jadwalId, tanggal, jam) {
    return DB.first('mcsTugas', function (t) {
      return t.jadwalId === jadwalId && t.tgl === tanggal && t.jam === jam; }) || null;
  }

  /**
   * Simpan foto pada satu slot TANPA mengubah statusnya.
   *
   * Foto "sebelum" diambil ketika pekerjaan belum dimulai — statusnya belum
   * boleh berubah jadi selesai hanya karena ada foto.
   */
  function simpanFotoTugas(korporatId, jadwalId, tanggal, jam, jenis, fotoIds) {
    var j = jadwalSatu(jadwalId);
    if (!j || j.korporatId !== korporatId) return { error: I18N.t('Jadwal tidak ditemukan.') };
    var ada = catatanSlot(jadwalId, tanggal, jam);
    var kunci = jenis === 'sebelum' ? 'sebelum' : 'sesudah';
    if (ada) {
      var patch = {};
      patch[kunci] = (ada[kunci] || []).concat(fotoIds || []);
      DB.update('mcsTugas', ada.id, patch);
    } else {
      var isi = {
        korporatId: korporatId, jadwalId: jadwalId, tgl: tanggal, jam: jam,
        status: 'proses', catatan: '', pekerjaId: j.pekerjaId,
        sebelum: [], sesudah: [], olehId: null, olehNama: '', selesaiAt: null
      };
      isi[kunci] = (fotoIds || []).slice();
      DB.insert('mcsTugas', isi);
    }
    return { ok: true };
  }

  /**
   * Centang atau lepas satu langkah pada laporan sebuah tugas.
   *
   * Seperti foto, ini TIDAK mengubah status: mencentang tiga dari lima langkah
   * berarti pekerjaannya sedang berjalan, bukan selesai.
   */
  function setLangkahTugas(korporatId, jadwalId, tanggal, jam, stepId, nyala) {
    var j = jadwalSatu(jadwalId);
    if (!j || j.korporatId !== korporatId) return { error: I18N.t('Jadwal tidak ditemukan.') };
    var ada = catatanSlot(jadwalId, tanggal, jam);
    if (ada) {
      var l = Object.assign({}, ada.langkah || {});
      if (nyala) l[stepId] = U.nowISO(); else delete l[stepId];
      DB.update('mcsTugas', ada.id, { langkah: l });
    } else {
      var isi = {
        korporatId: korporatId, jadwalId: jadwalId, tgl: tanggal, jam: jam,
        status: 'proses', catatan: '', pekerjaId: j.pekerjaId,
        sebelum: [], sesudah: [], langkah: {},
        olehId: null, olehNama: '', selesaiAt: null
      };
      if (nyala) isi.langkah[stepId] = U.nowISO();
      DB.insert('mcsTugas', isi);
    }
    return { ok: true };
  }

  /* ==================================================== FOTO PER LANGKAH
     Bukti sebelum–sesudah untuk TIAP langkah, bukan hanya untuk areanya
     secara keseluruhan. Disimpan sebagai:
       langkahFoto: { stepId: { sebelum: [fotoId], sesudah: [fotoId] } }

     Kuncinya id langkah, bukan urutannya — sama seperti centangnya. Foto yang
     menempel pada posisi ke-3 akan menunjuk langkah yang berbeda begitu
     urutannya digeser, dan bukti yang salah tempel lebih buruk daripada
     tidak ada bukti. */

  function fotoLangkah(rec, stepId) {
    var p = (rec && rec.langkahFoto && rec.langkahFoto[stepId]) || {};
    return { sebelum: (p.sebelum || []).slice(), sesudah: (p.sesudah || []).slice() };
  }

  function simpanFotoLangkah(korporatId, jadwalId, tanggal, jam, stepId, jenis, fotoIds) {
    var j = jadwalSatu(jadwalId);
    if (!j || j.korporatId !== korporatId) return { error: I18N.t('Jadwal tidak ditemukan.') };
    var kunci = jenis === 'sebelum' ? 'sebelum' : 'sesudah';
    var ada = catatanSlot(jadwalId, tanggal, jam);
    if (!ada) {
      ada = DB.insert('mcsTugas', {
        korporatId: korporatId, jadwalId: jadwalId, tgl: tanggal, jam: jam,
        status: 'proses', catatan: '', pekerjaId: j.pekerjaId,
        sebelum: [], sesudah: [], langkah: {}, langkahFoto: {},
        olehId: null, olehNama: '', selesaiAt: null
      });
    }
    var peta = Object.assign({}, ada.langkahFoto || {});
    var slot = Object.assign({ sebelum: [], sesudah: [] }, peta[stepId] || {});
    slot[kunci] = (slot[kunci] || []).concat(fotoIds || []);
    peta[stepId] = slot;
    DB.update('mcsTugas', ada.id, { langkahFoto: peta });
    return { ok: true };
  }

  function hapusFotoLangkah(jadwalId, tanggal, jam, stepId, jenis, fotoId) {
    var ada = catatanSlot(jadwalId, tanggal, jam);
    if (!ada) return { ok: true };
    var kunci = jenis === 'sebelum' ? 'sebelum' : 'sesudah';
    var peta = Object.assign({}, ada.langkahFoto || {});
    var slot = Object.assign({ sebelum: [], sesudah: [] }, peta[stepId] || {});
    slot[kunci] = (slot[kunci] || []).filter(function (x) { return x !== fotoId; });
    peta[stepId] = slot;
    DB.update('mcsTugas', ada.id, { langkahFoto: peta });
    DB.delPhoto(fotoId);
    return { ok: true };
  }

  function hapusFotoTugas(jadwalId, tanggal, jam, jenis, fotoId) {
    var ada = catatanSlot(jadwalId, tanggal, jam);
    if (!ada) return { ok: true };
    var kunci = jenis === 'sebelum' ? 'sebelum' : 'sesudah';
    var patch = {};
    patch[kunci] = (ada[kunci] || []).filter(function (x) { return x !== fotoId; });
    DB.update('mcsTugas', ada.id, patch);
    DB.delPhoto(fotoId);
    return { ok: true };
  }

  function batalTandai(jadwalId, tanggal, jam) {
    var ada = DB.first('mcsTugas', function (t) {
      return t.jadwalId === jadwalId && t.tgl === tanggal && t.jam === jam; });
    if (ada) DB.remove('mcsTugas', ada.id);
    return { ok: true };
  }

  /* ============================================================ PENGINGAT */

  /**
   * Tugas yang sudah waktunya diingatkan dan belum pernah dikirimi pengingat.
   *
   * Pengingat dicatat di antrean WA dengan `refId` berisi kunci tugasnya, jadi
   * dua kali membuka aplikasi tidak menghasilkan dua pesan untuk jam yang sama.
   */
  /**
   * Tugas yang sudah waktunya diingatkan lewat WhatsApp.
   *
   * JAMNYA DIBANDINGKAN DI ZONA LOKASINYA, bukan di zona perangkat yang
   * kebetulan menjalankan pengiriman.
   *
   * Baris ini sempat menghitung `sekarang.getHours()` sekali lalu memakainya
   * untuk seluruh cabang. Pada korporat satu kota itu benar. Pada Buana yang
   * punya cabang di Makassar dan Jayapura, pengingat untuk cabang WITA baru
   * jatuh tempo ketika jam Jakarta mencapai angka yang sama — satu jam
   * setelah petugasnya seharusnya mulai. Dua jam untuk WIT. Tidak ada galat,
   * tidak ada yang tercatat; yang terlihat hanyalah petugas yang diingatkan
   * ketika jadwalnya sudah lewat.
   *
   * Statusnya sendiri SUDAH dihitung per zona di tugasHari(). Yang salah
   * hanya di sini — dan dua tempat yang menghitung “sekarang” dengan cara
   * berbeda pada akhirnya akan selalu berbeda jawabannya.
   */
  function perluDiingatkan(korporatId) {
    var c = config();
    if (!c.aktif) return [];
    var hariIni = U.today();
    var sekarang = new Date();
    /* Disimpan per zona: satu korporat memakai paling banyak tiga zona,
       sementara tugasnya ribuan. */
    var menitZona = {};
    function menitDi(tz) {
      var kunci = tz || '-';
      if (menitZona[kunci] === undefined) {
        menitZona[kunci] = (window.ZONA && tz)
          ? ZONA.menitKini(tz)
          : sekarang.getHours() * 60 + sekarang.getMinutes();
      }
      return menitZona[kunci];
    }

    var terkirim = {};
    DB.all('waOutbox').forEach(function (m) {
      if (m.refType === 'mcsTugas' && m.refId) terkirim[m.refId] = 1;
    });

    return tugasHari(korporatId, hariIni).filter(function (t) {
      if (t.status === 'selesai' || t.status === 'lewat') return false;
      if (terkirim[t.kunci]) return false;
      if (!t.pekerja.telp) return false;      /* tanpa nomor tidak bisa diingatkan */
      var jatuh = jamKeMenit(t.jam) - (c.ingatMenitSebelum || 0);
      return menitDi(t.zona) >= jatuh;
    });
  }

  function kirimPengingat(korporatId) {
    if (!window.WA) return { ok: true, terkirim: 0 };
    var daftar = perluDiingatkan(korporatId);
    daftar.forEach(function (t) {
      WA.enqueue('mcs_ingat', null, {
        korporatId: korporatId, kunci: t.kunci, jam: t.jam,
        /* Supaya pesannya bisa menulis “08.00 WITA”, bukan jam telanjang
           yang dibaca petugas menurut jamnya sendiri. */
        zona: t.zona,
        areaNama: t.area.nama, areaJenis: t.area.jenis,
        gedung: t.area.gedung, lantai: t.area.lantai,
        pekerjaNama: t.pekerja.nama, pekerjaTelp: t.pekerja.telp,
        /* Teksnya, bukan objeknya — pesan WhatsApp yang mencetak
           [object Object] adalah pesan yang tidak dibaca siapa pun. */
        checklist: langkahArea(t.area).map(function (l) {
          return l.teks + (l.wajib ? '' : ' (opsional)'); })
      }, { tipe: 'mcsTugas', id: t.kunci });
    });
    return { ok: true, terkirim: daftar.length };
  }

  /* =============================================================== RINGKAS */

  /**
   * Sisa ruang penyimpanan peramban.
   *
   * Foto per langkah menaikkan kebutuhan ruang secara tajam: enam langkah kali
   * dua foto kali delapan belas tugas sehari sudah melewati kuota localStorage
   * (~5 MB) dalam satu hari. Yang terjadi berikutnya BUKAN galat: `gcPhotos`
   * membuang foto TERLAMA untuk memberi ruang — artinya bukti kebersihan
   * kemarin hilang diam-diam supaya bukti hari ini muat.
   *
   * Karena itu keadaannya dilaporkan sebelum penuh, bukan sesudah.
   */
  var KUOTA_KB = 5120;
  function ruangPenyimpanan() {
    var kb = DB.ukuran();
    var persen = Math.min(100, Math.round(kb / KUOTA_KB * 100));
    return {
      kb: kb, kuotaKb: KUOTA_KB, persen: persen,
      genting: persen >= 85, waspada: persen >= 65,
      foto: Object.keys(DB.raw.photos || {}).length
    };
  }

  /**
   * Bukti kehadiran sebuah tugas, siap ditampilkan.
   *
   * Mengembalikan null bila memang tidak ada — layar yang menerima null
   * menampilkan ketiadaan itu apa adanya, bukan menyamarkannya menjadi
   * tanda centang.
   */
  function buktiKehadiran(tugas) {
    if (!tugas || !tugas.pindaiId) return null;
    var p = DB.find('mcsPindai', tugas.pindaiId);
    if (!p) return null;
    return { pada: p.pada, cara: p.cara, jarakM: p.jarakM,
             oleh: p.olehNama || '', kuat: p.cara === 'kamera' };
  }

  /* ============================================ JADWAL BERBASIS KEBUTUHAN

     Jadwal tetap menganggap semua area kotor dengan kecepatan yang sama.
     Kenyataannya toilet lobi di jam makan siang dan gudang arsip di lantai
     delapan tidak berada di dunia yang sama.

     Sistem kelas dunia memakai sensor (Tork Vision, Onvation) untuk
     membersihkan saat perlu, bukan saat jamnya. Kita tidak punya sensor —
     tetapi kita punya sesuatu yang sering lebih jujur daripada sensor:
     ADUAN PENGHUNI dan HASIL INSPEKSI. Keduanya adalah pengukuran kebutuhan
     yang sesungguhnya, dikumpulkan gratis.

     Yang dihasilkan hanya SARAN. Menaikkan frekuensi otomatis akan menambah
     beban kerja tanpa menambah orang — keputusan yang hanya boleh diambil
     manusia yang tahu berapa petugas yang ia punya. */

  /* ================================== JADWAL DILIHAT DARI SISI PETUGAS

     Ada dua tempat yang menyatakan siapa bertanggung jawab atas sebuah area:
     `mcsJadwal.pekerjaId` (siapa mengerjakan, kapan) dan `mcsPekerja.areaIds`
     (wilayah kerjanya). Keduanya sah dan tidak bisa disatukan begitu saja —
     seseorang bisa punya wilayah yang belum berjadwal, dan bisa dijadwalkan
     sekali di area yang bukan wilayahnya untuk menggantikan rekan.

     Yang berbahaya bukan perbedaannya, melainkan perbedaan yang TIDAK
     TERLIHAT. Fungsi di bawah ini membuatnya terlihat. */

  /** Berapa slot per minggu yang dihasilkan sebuah jadwal. */
  /**
   * Beban mingguan. Jadwal berkala panjang DIRATAKAN ke minggu, bukan
   * dihitung penuh: cuci karpet tiga bulan sekali bukan beban mingguan
   * sebesar pel lobi harian, dan menghitungnya penuh membuat petugas yang
   * memegang satu pekerjaan tahunan terlihat kelebihan beban.
   */
  function slotPerMinggu(j) {
    if (j.aktif === false) return 0;
    var sk = siklus(j.siklus);
    if (sk.bulan) {
      var perKejadian = j.mode !== 'interval' ? ((j.jam || []).length || 0) : (function () {
        var m = jamKeMenit(j.mulai), s = jamKeMenit(j.selesai);
        var langkah = Math.max(1, j.intervalJam) * 60, n = 0;
        for (var t = m; t <= s; t += langkah) n++;
        return n;
      })();
      /* 52 minggu ÷ (bulan siklus × 4,345 minggu per bulan) */
      return Math.round(perKejadian / (sk.bulan * 4.345) * 100) / 100;
    }
    var hari = (j.hari || []).length;
    if (!hari) return 0;
    if (j.mode !== 'interval') return hari * ((j.jam || []).length || 0);
    var m = jamKeMenit(j.mulai), s = jamKeMenit(j.selesai);
    var langkah = Math.max(1, j.intervalJam) * 60;
    var n = 0;
    for (var t = m; t <= s; t += langkah) n++;
    return hari * n;
  }

  /**
   * Jadwal dikelompokkan menurut PETUGAS, bukan menurut area.
   *
   * Layar jadwal yang hanya berurut area menyembunyikan hal yang paling
   * menentukan apakah gedung ini akan bersih: apakah bebannya masuk akal
   * bagi orang yang mengerjakannya. Satu petugas dengan tiga puluh empat
   * slot sehari tidak akan menyelesaikan semuanya, dan tidak ada satu pun
   * baris di layar lama yang mengatakannya.
   */
  function bebanPetugas(korporatId) {
    var semuaJadwal = jadwal(korporatId);
    return pekerja(korporatId).map(function (p) {
      var milik = semuaJadwal.filter(function (j) { return j.pekerjaId === p.id; });
      var wilayah = {};
      (p.areaIds || []).forEach(function (id) { wilayah[id] = true; });

      var areaBerjadwal = {};
      var perMinggu = 0;
      milik.forEach(function (j) {
        perMinggu += slotPerMinggu(j);
        areaBerjadwal[j.areaId] = true;
      });

      /* Dua bentuk selisih, dan keduanya berarti hal yang berbeda:
         - dijadwalkan di area yang BUKAN wilayahnya: mungkin menggantikan
           rekan, mungkin salah pilih saat menyusun jadwal;
         - punya wilayah yang BELUM berjadwal: area itu tidak akan pernah
           muncul sebagai tugas siapa pun. */
      var luarWilayah = Object.keys(areaBerjadwal)
        .filter(function (id) { return !wilayah[id]; })
        .map(function (id) { return areaSatu(id); })
        .filter(Boolean);
      var tanpaJadwal = (p.areaIds || [])
        .filter(function (id) { return !areaBerjadwal[id]; })
        .map(function (id) { return areaSatu(id); })
        .filter(Boolean);

      return {
        pekerja: p, jadwal: milik,
        perMinggu: perMinggu,
        perHari: Math.round(perMinggu / 7 * 10) / 10,
        areaBerjadwal: Object.keys(areaBerjadwal).length,
        luarWilayah: luarWilayah,
        tanpaJadwal: tanpaJadwal
      };
    }).sort(function (a, b) { return b.perMinggu - a.perMinggu; });
  }

  /**
   * Area yang tidak dijadwalkan kepada siapa pun.
   *
   * Berdiri terpisah dari bebanPetugas karena ia bukan milik petugas mana
   * pun — justru itu masalahnya.
   */
  function areaTanpaPenanggung(korporatId) {
    var berjadwal = {};
    jadwal(korporatId).forEach(function (j) { berjadwal[j.areaId] = true; });
    return area(korporatId).filter(function (a) { return !berjadwal[a.id]; });
  }

  /**
   * Siapa yang bertanggung jawab atas sebuah area HARI INI.
   *
   * Urutannya disengaja: yang dijadwalkan hari ini lebih dulu, baru yang
   * wilayah kerjanya mencakup area itu. Yang sedang tidak bekerja diganti
   * penggantinya bila ada — memberi tahu orang yang sedang sakit tentang
   * tumpahan di lobi tidak membuat lobinya bersih.
   */
  function penanggungArea(areaId, tanggal) {
    var a = areaSatu(areaId);
    if (!a) return [];
    var tgl = tanggal || U.today();
    var hari = new Date(tgl + 'T00:00:00').getDay();
    var urut = [], sudah = {};

    function tambah(p) {
      if (!p || sudah[p.id] || p.aktif === false) return;
      var ab = ketidakhadiran(p.id, tgl);
      if (ab) {
        if (ab.pengganti) tambah(ab.pengganti);
        return;
      }
      sudah[p.id] = true;
      urut.push(p);
    }

    jadwal(a.korporatId).forEach(function (j) {
      if (j.areaId !== areaId) return;
      if ((j.hari || []).indexOf(hari) < 0) return;
      tambah(pekerjaSatu(j.pekerjaId));
    });
    pekerja(a.korporatId).forEach(function (p) {
      if ((p.areaIds || []).indexOf(areaId) >= 0) tambah(p);
    });
    return urut;
  }

  function saranJadwal(korporatId, hariKebelakang) {
    var n = hariKebelakang || 30;
    var dari = U.iso(U.addDays(new Date(), -n));
    var sampai = U.today();

    var ad = DB.where('mcsAduan', function (x) {
      var t = String(x.pada).slice(0, 10);
      return x.korporatId === korporatId && t >= dari && t <= sampai;
    });
    var mutuPerArea = {};
    mutuArea(korporatId, dari, sampai).forEach(function (m) { mutuPerArea[m.areaId] = m; });

    return area(korporatId).map(function (a) {
      var aduanArea = ad.filter(function (x) { return x.areaId === a.id; });
      var jadwalArea_ = jadwalArea(a.id).filter(function (j) { return j.aktif !== false; });
      /* Berapa slot per minggu yang dijadwalkan sekarang. */
      var perMinggu = jadwalArea_.reduce(function (s, j) {
        return s + ((j.hari || []).length * ((j.jam || []).length || 1));
      }, 0);
      var m = mutuPerArea[a.id] || { rata: null, n: 0 };

      /* Dua sinyal, dinilai terpisah lalu digabung. Menggabungkannya menjadi
         satu skor tunggal akan menyembunyikan sebabnya — dan korporat perlu
         tahu apakah masalahnya keluhan orang atau hasil pemeriksaan. */
      var alasan = [];
      var naik = 0;
      if (aduanArea.length >= 3) {
        naik++;
        alasan.push({ kode: 'aduan', n: aduanArea.length });
      }
      if (m.rata != null && m.rata >= 3.5) {
        naik++;
        alasan.push({ kode: 'mutu', n: m.rata });
      }
      /* Turun disarankan HANYA bila buktinya kuat di kedua sisi: tidak ada
         keluhan sama sekali DAN mutunya terbukti baik lewat inspeksi yang
         benar-benar dilakukan. Menurunkan frekuensi karena 'tidak ada kabar'
         adalah cara paling umum membuat gedung pelan-pelan menjadi kotor. */
      var turun = (aduanArea.length === 0 && m.n >= 3 && m.rata != null && m.rata <= 2 &&
                   perMinggu >= 7);

      return {
        areaId: a.id, nama: a.nama, perMinggu: perMinggu,
        aduan: aduanArea.length, mutuRata: m.rata, mutuN: m.n,
        saran: naik ? 'naik' : (turun ? 'turun' : 'tetap'),
        kuat: naik >= 2,
        alasan: alasan
      };
    }).sort(function (p, q) {
      var urut = { naik: 0, tetap: 1, turun: 2 };
      if (urut[p.saran] !== urut[q.saran]) return urut[p.saran] - urut[q.saran];
      return q.aduan - p.aduan;
    });
  }

  /* ================================================== AKUN PETUGAS

     Sampai di sini petugas hanyalah baris data: laporannya diisikan
     supervisor, dan kolom 'dikerjakan oleh' adalah pengakuan pihak ketiga.
     Dengan akun sendiri, petugas memindai tagnya sendiri dan melaporkan
     pekerjaannya sendiri — dan barulah bukti kehadiran benar-benar berarti.

     Akunnya TETAP terpisah dari mitra lapangan EXOCLEAN. Perannya sendiri
     ('petugas', bukan 'worker') supaya ia tidak pernah masuk kolam
     penugasan EXOCLEAN maupun perhitungan bagi hasil — kekhawatiran yang
     dulu membuat mcsPekerja sengaja dipisah dari users tetap dijawab. */

  /* Huruf yang mudah tertukar dibuang, sama seperti kode tag area. */
  var ABJAD_MASUK = 'ACDEFGHJKMNPQRTUVWXYZ2346789';

  function kodeMasukBaru() {
    for (var coba = 0; coba < 50; coba++) {
      var s = '';
      for (var i = 0; i < 4; i++) {
        s += ABJAD_MASUK.charAt(Math.floor(Math.random() * ABJAD_MASUK.length));
      }
      var kode = 'MCS' + s;
      if (!DB.first('users', function (u) { return u.kodeMasuk === kode; })) return kode;
    }
    return 'MCS' + U.uid('').slice(-5).toUpperCase();
  }

  /**
   * Apakah nomor ini sudah dipakai akun lain?
   *
   * Dibandingkan lewat sembilan angka terakhir supaya 08123456789,
   * +628123456789, dan 62812-3456-789 terbaca sebagai satu nomor yang sama.
   * Dua akun bernomor sama membuat login memilih salah satu sekehendaknya —
   * dan yang terpilih belum tentu yang sedang mencoba masuk.
   */
  function ekorNomor(t) {
    var d = String(t || '').replace(/\D/g, '');
    return d.length > 9 ? d.slice(-9) : d;
  }
  function adaNomorSama(telp) {
    var e = ekorNomor(telp);
    if (!e) return false;
    return !!DB.first('users', function (u) {
      return u.telp && ekorNomor(u.telp) === e; });
  }

  function sandiPetugasAcak() {
    /* Enam angka, bukan campuran huruf-angka: sandi ini diketik di ponsel
       murah oleh orang yang sedang berdiri, dan dibaca dari kertas. */
    var s = '';
    for (var i = 0; i < 6; i++) s += String(Math.floor(Math.random() * 10));
    return s;
  }

  /**
   * Buatkan akun untuk seorang petugas.
   *
   * Sandi awal dikembalikan SEKALI. Yang tersimpan hanya turunannya lewat
   * KEAMANAN.pasangSandi — sama seperti akun korporat — sehingga tidak ada
   * seorang pun, termasuk staf yang membuatnya, bisa membacanya lagi nanti.
   */
  function buatAkunPetugas(pekerjaId, oleh) {
    var p = pekerjaSatu(pekerjaId);
    if (!p) return { error: I18N.t('Petugas tidak ditemukan.') };
    if (p.userId && DB.find('users', p.userId)) {
      return { error: I18N.t('Petugas ini sudah punya akun. Pakai Atur ulang sandi.') };
    }
    var k = korporat(p.korporatId);
    /* Nomor HP dipakai sebagai identitas bila ada DAN belum dipakai akun
       lain — dua akun dengan nomor sama membuat login memilih salah satu
       secara sewenang-wenang. */
    var telp = String(p.telp || '').trim();
    if (telp && adaNomorSama(telp)) telp = '';

    var sandi = sandiPetugasAcak();
    var kode = kodeMasukBaru();
    var u = DB.insert('users', {
      role: 'petugas', korporatId: p.korporatId, pekerjaId: p.id,
      nama: p.nama,
      jabatan: jabatan(p.jabatan).nama,
      /* Kode masuk adalah identitas utamanya; email sengaja kosong. */
      kodeMasuk: kode,
      email: '', telp: telp,
      pass: sandi,
      aktif: true,
      wajibGantiSandi: true,
      perusahaan: k ? k.nama : '',
      alamatList: [], rekening: [],
      preferensi: { bahasa: (window.I18N && I18N.BAWAAN) || 'id',
                    notifWA: true, notifEmail: false, ringkasanMingguan: false },
      emailVerifiedAt: null, telpVerifiedAt: null, sosial: [], metodeDaftar: 'korporat'
    });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(u.id, sandi);
    DB.update('mcsPekerja', p.id, { userId: u.id });
    DB.log(oleh ? oleh.id : null, 'Membuat akun petugas ' + p.nama, 'mcsPekerja', p.id);
    return { ok: true, user: u, kodeMasuk: kode, sandiAwal: sandi };
  }

  function resetSandiPetugas(pekerjaId, oleh) {
    var p = pekerjaSatu(pekerjaId);
    if (!p || !p.userId) return { error: I18N.t('Petugas ini belum punya akun.') };
    var u = DB.find('users', p.userId);
    if (!u) return { error: I18N.t('Akun petugas tidak ditemukan.') };
    var sandi = sandiPetugasAcak();
    DB.update('users', u.id, { pass: sandi, wajibGantiSandi: true });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(u.id, sandi);
    DB.log(oleh ? oleh.id : null, 'Mengatur ulang sandi petugas ' + p.nama, 'mcsPekerja', p.id);
    return { ok: true, user: DB.find('users', u.id), kodeMasuk: u.kodeMasuk, sandiAwal: sandi };
  }

  /**
   * Cabut akses tanpa menghapus orangnya.
   *
   * Akunnya dinonaktifkan, BUKAN dihapus: seluruh laporan, pemindaian, dan
   * absensi yang pernah ia buat menunjuk ke akun ini. Menghapusnya akan
   * mengubah riwayat menjadi 'dikerjakan oleh —'.
   */
  function cabutAkunPetugas(pekerjaId, oleh) {
    var p = pekerjaSatu(pekerjaId);
    if (!p || !p.userId) return { error: I18N.t('Petugas ini belum punya akun.') };
    DB.update('users', p.userId, { aktif: false });
    DB.log(oleh ? oleh.id : null, 'Mencabut akses petugas ' + p.nama, 'mcsPekerja', p.id);
    return { ok: true };
  }

  function aktifkanAkunPetugas(pekerjaId) {
    var p = pekerjaSatu(pekerjaId);
    if (!p || !p.userId) return { error: I18N.t('Petugas ini belum punya akun.') };
    DB.update('users', p.userId, { aktif: true });
    return { ok: true };
  }

  /** Keadaan akun seorang petugas, siap ditampilkan. */
  function akunPetugas(pekerjaId) {
    var p = pekerjaSatu(pekerjaId);
    if (!p || !p.userId) return null;
    var u = DB.find('users', p.userId);
    if (!u) return null;
    return { user: u, kodeMasuk: u.kodeMasuk, telp: u.telp,
             aktif: !!u.aktif, belumGantiSandi: !!u.wajibGantiSandi };
  }

  /** Petugas yang terhubung dengan seorang pengguna aplikasi. */
  function pekerjaDariUser(u) {
    if (!u || !u.pekerjaId) return null;
    return pekerjaSatu(u.pekerjaId);
  }

  /* ==================================================== KEHADIRAN PETUGAS */

  var HADIR = [
    { kode: 'hadir', nama: 'Hadir', ikon: '✅', warna: 'ok', bekerja: true },
    { kode: 'sakit', nama: 'Sakit', ikon: '🤒', warna: 'warn', bekerja: false },
    { kode: 'izin', nama: 'Izin', ikon: '📄', warna: 'warn', bekerja: false },
    { kode: 'libur', nama: 'Libur', ikon: '🌴', warna: 'muted', bekerja: false },
    { kode: 'alfa', nama: 'Tanpa kabar', ikon: '❌', warna: 'danger', bekerja: false }
  ];
  function statusHadir(kode) {
    return HADIR.filter(function (h) { return h.kode === kode; })[0] || HADIR[0];
  }

  /* ------------------------------------------- KEKUATAN BUKTI KEHADIRAN

     Tiga cara sebuah kehadiran bisa tercatat, dan ketiganya TIDAK sama
     kuatnya. Alasannya persis sama dengan yang sudah tertulis di
     catatPindai(): kode yang diketik bukan bukti yang setara dengan kode
     yang dipindai, dan menyamakan keduanya di layar berarti berbohong
     tentang kekuatan buktinya.

     Yang paling lemah adalah SWADEKLARASI — petugas menekan “Saya hadir”
     di ponselnya sendiri. Tombol itu bisa ditekan dari rumah, dari jalan,
     dari mana saja. Itu bukan alasan untuk menghapusnya: absensi yang
     terlalu sulit diisi tidak menghasilkan absensi yang jujur, ia
     menghasilkan absensi yang kosong. Yang salah bukan tombolnya,
     melainkan menampilkan hasilnya seolah-olah sekuat pemindaian tag di
     lokasi.

     Karena itu caranya DICATAT dan DISEBUT di layar — bukan dijadikan
     penghalang. */
  var BUKTI_ABSENSI = [
    { kode: 'pindai', nama: 'Dipindai di lokasi', ikon: '🏷️', kuat: true,
      ket: 'Tag area dipindai pada hari yang sama — orangnya sungguh berada di sana.' },
    { kode: 'penyelia', nama: 'Diisikan penyelia', ikon: '👤', kuat: true,
      ket: 'Dicatat orang lain yang bertanggung jawab atas isinya.' },
    { kode: 'sendiri', nama: 'Dinyatakan sendiri', ikon: '✋', kuat: false,
      ket: 'Petugas menekan tombol di ponselnya sendiri. Tidak ada bukti lokasi.' }
  ];
  /* Namanya sengaja BUKAN buktiHadir: mcs.js sudah punya
     buktiKehadiran(tugas) yang menjawab pertanyaan berbeda — apakah SATU
     TUGAS punya pemindaian pendukung. Dua nama yang nyaris sama untuk dua
     hal berbeda adalah undangan untuk memanggil yang keliru, dan keliru di
     sini berarti melaporkan kehadiran sebagai berbukti padahal bukan. */
  function buktiAbsensi(kode) {
    return BUKTI_ABSENSI.filter(function (b) { return b.kode === kode; })[0] ||
           BUKTI_ABSENSI[BUKTI_ABSENSI.length - 1];
  }

  /* --------------------------------------------- SEDANG BEKERJA SEKARANG

     “Hadir” dan “sedang bekerja” adalah dua pertanyaan yang berbeda, dan
     jawabannya sering berbeda pula. Hadir menjawab “apakah ia masuk hari
     ini” — pertanyaan tentang SATU HARI, dan tetap benar sepanjang hari itu
     termasuk setelah orangnya pulang. Sedang bekerja menjawab “apakah ia
     ada di gedung SEKARANG”, dan itulah yang ditanyakan penyelia ketika
     sesuatu perlu dikerjakan mendadak.

     DIHITUNG, TIDAK DISIMPAN — dan itu bukan kemalasan.

     Menyimpannya sebagai status menuntut seseorang menekan “selesai kerja”
     setiap hari. Tidak ada yang melakukannya: yang akan terjadi adalah
     seluruh petugas berstatus ‘sedang bekerja’ selamanya, termasuk pada
     tengah malam dan hari libur. Status yang tidak pernah dimatikan lebih
     buruk daripada tidak ada status sama sekali — ia terlihat seperti
     jawaban.

     Yang dipakai: absensi hari ini + jam shiftnya. Keduanya sudah ada dan
     keduanya diisi untuk alasan lain, jadi tidak ada beban isian baru.

     BATASNYA DISEBUT, bukan disembunyikan: ini menghitung jadwal, bukan
     keberadaan. Orang yang pulang lebih awal tetap terhitung bekerja sampai
     jam shiftnya habis. Yang sungguh membuktikan keberadaan hanyalah
     pemindaian tag — dan itu dilaporkan terpisah lewat `berbukti`. */
  function sedangBekerja(pekerjaId, saatIni) {
    var p = pekerjaSatu(pekerjaId);
    if (!p) return null;
    var kini = saatIni ? new Date(saatIni) : new Date();
    var tgl = U.iso(kini);

    var a = DB.first('mcsAbsensi', function (x) {
      return x.pekerjaId === pekerjaId && x.tgl === tgl;
    });
    var st = a && a.status ? statusHadir(a.status) : null;

    var sh = shiftJenis(p.shiftKode || p.shift);
    var m = kini.getHours() * 60 + kini.getMinutes();
    var mulai = jamKeMenit(sh.mulai), selesai = jamKeMenit(sh.selesai);
    /* Shift malam melewati tengah malam: 23.00–07.00 berarti DI LUAR
       rentang 23→07 pada penanggalan biasa. Membandingkannya seperti shift
       lain membuat seluruh regu malam terhitung tidak pernah bekerja. */
    var dalamJam = selesai > mulai
      ? (m >= mulai && m < selesai)
      : (m >= mulai || m < selesai);

    var pindai = pindaiPekerjaHari(pekerjaId, tgl);
    return {
      pekerja: p, shift: sh, tgl: tgl,
      absensi: a || null,
      /* null = belum dicatat sama sekali. Itu BUKAN sama dengan tidak
         bekerja, dan menyamakan keduanya membuat pagi hari terlihat seperti
         gedung kosong. */
      dicatat: !!(a && a.status),
      hadir: st ? st.bekerja : null,
      dalamJamKerja: dalamJam,
      bekerja: !!(st && st.bekerja && dalamJam),
      /* Dibuktikan pemindaian tag, bukan sekadar dijadwalkan. */
      berbukti: !!pindai,
      pindaiTerakhir: pindai ? pindai.pada : null
    };
  }

  /** Siapa saja yang sedang bekerja di satu korporat — untuk papan penyelia. */
  function yangSedangBekerja(korporatId, saatIni) {
    var out = [];
    pekerja(korporatId).forEach(function (p) {
      var s = sedangBekerja(p.id, saatIni);
      if (s && s.bekerja) out.push(s);
    });
    return out;
  }

  /** Pemindaian tag apa pun oleh seorang petugas pada satu tanggal. */
  function pindaiPekerjaHari(pekerjaId, tgl) {
    if (!pekerjaId) return null;
    return DB.first('mcsPindai', function (x) {
      return x.pekerjaId === pekerjaId && String(x.pada).slice(0, 10) === tgl;
    }) || null;
  }

  /**
   * Kehadiran seluruh petugas pada satu tanggal.
   *
   * Yang BELUM dicatat dikembalikan sebagai null — bukan diasumsikan hadir.
   * Menganggap semua hadir sampai ada yang menyatakan sebaliknya membuat
   * absensi yang tidak pernah diisi terlihat sempurna.
   */
  function absensiHari(korporatId, tanggal) {
    var tgl = tanggal || U.today();
    var rows = DB.where('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.tgl === tgl; });
    return pekerja(korporatId).map(function (p) {
      var r = rows.filter(function (x) { return x.pekerjaId === p.id; })[0] || null;
      return {
        pekerja: p, rec: r,
        status: r ? r.status : null,
        /* CARA pencatatannya ikut diteruskan. Tanpa baris ini layar membaca
           undefined dan buktiAbsensi() jatuh ke bawaannya — yang justru
           yang PALING LEMAH — sehingga tiap kehadiran, termasuk yang
           diisi penyelia dan yang berbukti pemindaian, ditampilkan sebagai
           'dinyatakan sendiri'. Menuduh seluruh catatan lemah sama
           merusaknya dengan menganggap semuanya kuat. */
        bukti: r ? r.bukti : null,
        catatan: r ? r.catatan : '',
        pengganti: r && r.penggantiId ? pekerjaSatu(r.penggantiId) : null
      };
    });
  }

  function tandaiHadir(korporatId, pekerjaId, tanggal, status, d, oleh) {
    var p = pekerjaSatu(pekerjaId);
    if (!p || p.korporatId !== korporatId) return { error: I18N.t('Petugas tidak ditemukan.') };
    /* DITOLAK, bukan diperingatkan — berbeda dari peringatan-peringatan lain
       di berkas ini.

       Peringatan dipakai untuk KETIDAKCOCOKAN data: pekerjaan dilaporkan
       sebelum absensi diisi, penyerahan dicatat menyusul. Semuanya keadaan
       yang sah dan sehari-hari, dan menolaknya memaksa orang berbohong.

       Ini bukan itu. Menandai hadir orang di cabang yang bukan urusannya
       bukan urutan pencatatan yang terbalik; ia memang di luar kewenangan.
       Dan sesudah daftar petugas disaring, orang itu tidak akan muncul di
       pilihan mana pun — satu-satunya cara mencapainya adalah lewat id yang
       tidak berasal dari layar ini.

       Sebabnya disebut, bukan sekadar “tidak boleh”: bila memang ada
       peminjaman antar cabang, yang membacanya jadi tahu harus meminta
       cabangnya ditambahkan, bukan mengira aplikasinya rusak. */
    if (window.MCSAKSES) {
      var sbA = MCSAKSES.sebabTakBolehTulis(oleh);
      if (sbA && sbA.kode === 'lingkup') return { error: sbA.pesan };
      if (!MCSAKSES.bolehPekerja(p, oleh)) {
        return { error: I18N.t('{nama} bertugas di cabang yang tidak Anda kelola. Minta cabangnya ditambahkan ke akun Anda bila memang perlu.')
          .replace('{nama}', p.nama) };
      }
    }
    var tgl = tanggal || U.today();
    d = d || {};
    /* Pengganti hanya masuk akal bila yang digantikan memang tidak bekerja.
       Menyimpannya pada petugas yang hadir akan muncul di layar sebagai
       dua orang mengerjakan satu tugas. */
    var penggantiId = statusHadir(status).bekerja ? null : (d.penggantiId || null);
    var ada = DB.first('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.pekerjaId === pekerjaId && x.tgl === tgl; });
    /* Cara pencatatannya ditentukan DI SINI, bukan diserahkan pemanggil:
       pemanggil yang boleh mengaku 'dipindai' tanpa ada pemindaiannya
       membuat kolom ini tidak berarti apa-apa. Yang disebut 'pindai' hanya
       yang sungguh punya baris pemindaian pada tanggal yang sama. */
    var bukti;
    if (d.bukti === 'sendiri') {
      bukti = pindaiPekerjaHari(pekerjaId, tgl) ? 'pindai' : 'sendiri';
    } else {
      bukti = 'penyelia';
    }

    var isi = {
      korporatId: korporatId, pekerjaId: pekerjaId, tgl: tgl,
      status: statusHadir(status).kode,
      penggantiId: penggantiId,
      bukti: bukti,
      catatan: String(d.catatan || '').trim(),
      pada: U.nowISO(),
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : ''
    };
    if (ada) DB.update('mcsAbsensi', ada.id, isi);
    else DB.insert('mcsAbsensi', isi);
    return { ok: true };
  }

  /** Apakah petugas ini sedang tidak bekerja hari itu, dan siapa penggantinya. */
  function ketidakhadiran(pekerjaId, tanggal) {
    var r = DB.first('mcsAbsensi', function (x) {
      return x.pekerjaId === pekerjaId && x.tgl === (tanggal || U.today()); });
    if (!r || statusHadir(r.status).bekerja) return null;
    return { status: r.status, catatan: r.catatan,
             pengganti: r.penggantiId ? pekerjaSatu(r.penggantiId) : null };
  }

  function statistikAbsensi(korporatId, tanggal) {
    var l = absensiHari(korporatId, tanggal);
    function n(k) { return l.filter(function (x) { return x.status === k; }).length; }
    var tidakBekerja = l.filter(function (x) {
      return x.status && !statusHadir(x.status).bekerja; });
    return {
      total: l.length,
      belumDicatat: l.filter(function (x) { return !x.status; }).length,
      hadir: n('hadir'), sakit: n('sakit'), izin: n('izin'),
      libur: n('libur'), alfa: n('alfa'),
      /* Yang paling penting bukan berapa yang absen, melainkan berapa yang
         absen TANPA pengganti — itulah pekerjaan yang tidak akan dikerjakan
         siapa pun hari ini. */
      tanpaPengganti: tidakBekerja.filter(function (x) { return !x.pengganti; }).length
    };
  }

  /* ================================================= BAHAN HABIS PAKAI

     Di gedung sungguhan, separuh keluhan penghuni bukan tentang lantai yang
     kotor melainkan tentang sabun, tisu, dan pengharum yang habis. Jadwal
     sebagus apa pun tidak menolong petugas yang datang tanpa bahan. */

  var SATUAN = ['pcs', 'roll', 'botol', 'liter', 'kg', 'pak', 'galon', 'set'];

  /* Satuan ISI di dalam satu satuan beli. Satu BOTOL berisi 500 ML; yang
     dibeli botolnya, yang dipakai mililiternya. Keduanya dipisah karena
     gudang menghitung botol sedangkan petugas menghabiskan mililiter. */
  var SATUAN_ISI = ['ml', 'liter', 'gram', 'kg', 'lembar', 'meter', 'pcs'];

  /* ================================================ TAKARAN BAHAN PER m²
     Rekomendasi takaran, supaya kolom cakupan tidak dimulai dari kosong.

     Kolom `cakupanM2` selama ini harus diketik sendiri dari label kemasan.
     Yang terjadi di lapangan: ia dikosongkan — dan bahan tanpa cakupan tidak
     ikut terhitung dalam perkiraan kebutuhan maupun penanda boros/irit,
     tanpa satu pun peringatan. Angka bawaan yang masuk akal jauh lebih
     berguna daripada kolom kosong yang benar.

     TIDAK SEMUA BAHAN DITAKAR PER METER PERSEGI, dan ini bukan detail kecil.
     Sabun cuci tangan habis menurut jumlah orang yang mencuci tangan; tisu
     dan kantong sampah menurut jumlah dispenser dan tempat sampah. Memberi
     mereka angka per m² berarti mengarang ukuran yang tidak pernah dipakai
     siapa pun — dan angka karangan yang terlihat resmi lebih berbahaya
     daripada kolom kosong. Bahan seperti itu bertakaran 0 di sini, dan
     formulirnya tidak menawarkan rekomendasi apa pun untuknya.

     Takaran adalah LARUTAN SIAP PAKAI per meter persegi — bukan konsentrat.
     Angkanya kisaran umum kebersihan gedung, dan tetap perkiraan: lantai
     berminyak menghabiskan pembersih dua kali lebih cepat daripada lantai
     berdebu. Karena itu ia bawaan yang BOLEH DIUBAH, bukan jatah. */
  var JENIS_BAHAN = [
    { kode: 'lantai',   nama: 'Pembersih lantai',      ikon: '🧴',
      takaran: 3,  isiNilai: 1000, isiSatuan: 'ml' },
    { kode: 'kaca',     nama: 'Pembersih kaca',        ikon: '🪟',
      takaran: 10, isiNilai: 500,  isiSatuan: 'ml' },
    { kode: 'toilet',   nama: 'Pembersih toilet',      ikon: '🚽',
      takaran: 8,  isiNilai: 700,  isiSatuan: 'ml' },
    { kode: 'disinfektan', nama: 'Disinfektan permukaan', ikon: '🧫',
      takaran: 25, isiNilai: 1000, isiSatuan: 'ml' },
    { kode: 'karbol',   nama: 'Karbol / pewangi lantai', ikon: '🌿',
      takaran: 5,  isiNilai: 1000, isiSatuan: 'ml' },
    { kode: 'poles',    nama: 'Poles / wax lantai',    ikon: '✨',
      takaran: 18, isiNilai: 5000, isiSatuan: 'ml' },
    { kode: 'karpet',   nama: 'Sampo karpet',          ikon: '🧹',
      takaran: 15, isiNilai: 1000, isiSatuan: 'ml' },
    { kode: 'stainless', nama: 'Pembersih stainless',  ikon: '🥄',
      takaran: 6,  isiNilai: 500,  isiSatuan: 'ml' },
    /* Takaran 0 = TIDAK DITAKAR PER m². Lihat keterangan di atas. */
    { kode: 'sabun',    nama: 'Sabun cuci tangan',     ikon: '🫧', takaran: 0 },
    { kode: 'tisu',     nama: 'Tisu / kertas',         ikon: '🧻', takaran: 0 },
    { kode: 'kantong',  nama: 'Kantong sampah',        ikon: '🗑️', takaran: 0 },
    { kode: 'pengharum', nama: 'Pengharum ruangan',    ikon: '🌸', takaran: 0 },
    { kode: 'alat',     nama: 'Alat bantu habis pakai', ikon: '🧶', takaran: 0 },
    { kode: 'lain',     nama: 'Bahan lain',            ikon: '📦', takaran: 0 }
  ];

  function jenisBahan(kode) {
    return JENIS_BAHAN.filter(function (j) { return j.kode === kode; })[0] || null;
  }

  /**
   * Rekomendasi untuk sebuah jenis bahan, atau null bila jenisnya tidak
   * ditakar per meter persegi.
   *
   * `cakupanM2` dihitung, tidak ditulis dua kali: satu botol 1.000 ml dengan
   * takaran 3 ml/m² menanggung 333 m². Menyimpan keduanya sebagai angka
   * terpisah berarti suatu hari salah satunya diubah dan yang lain tidak.
   */
  function rekomendasiBahan(kode, isiNilai, isiSatuan) {
    var j = jenisBahan(kode);
    if (!j || !j.takaran) return null;
    var nilai = Number(isiNilai) || j.isiNilai || 0;
    var satuan = isiSatuan || j.isiSatuan || 'ml';
    /* Gram disamakan dengan mililiter: takaran bahan kebersihan gedung
       ditulis per ml, dan bubuk yang dipakai di sini berkerapatan mendekati
       air. Satuan yang tidak bisa disamakan (lembar, pcs) tidak punya
       rekomendasi — dan itu memang jawabannya. */
    var ml = satuan === 'ml' || satuan === 'gram' ? nilai
           : satuan === 'liter' || satuan === 'kg' ? nilai * 1000
           : 0;
    if (!ml) return null;
    return {
      jenis: j,
      takaran: j.takaran,
      isiNilai: j.isiNilai || null,
      isiSatuan: j.isiSatuan || null,
      cakupanM2: Math.round(ml / j.takaran)
    };
  }

  /**
   * Daftar bahan habis pakai.
   *
   * KATALOGNYA TIDAK DISARING — berbeda dari petugas, peralatan, dan jadwal.
   * `mcsStok` tidak punya kolom lokasi karena ia memang milik bersama: satu
   * korporat dengan 87 cabang memakai 18 jenis barang yang sama, dan
   * menyembunyikan sebagiannya dari sebuah cabang tidak berarti apa pun.
   * Yang berbeda antar cabang adalah SALDONYA, bukan daftarnya.
   *
   * Maka yang disaring saldonya — dan hanya untuk barang yang memang sudah
   * pernah ditempatkan di sebuah gudang. Barang yang belum tetap memakai
   * angka korporat, dan `lingkupSaldo` mengatakan demikian supaya layarnya
   * bisa menyebutkannya. Angka yang benar dengan keterangan yang jujur
   * lebih berguna daripada angka per cabang yang dikarang.
   */
  function stok(korporatId) {
    var jangkau = window.MCSAKSES ? MCSAKSES.lokasiUser() : null;
    return DB.where('mcsStok', function (x) { return x.korporatId === korporatId; })
      .map(function (x) {
        var per = jangkau ? saldoPerLokasi(x.id) : null;
        /* DITENTUKAN PER BARANG, bukan per korporat.

           Sempat diputuskan di tingkat korporat — “sudah ada penempatan atau
           belum” — dan itu keliru dengan cara yang hanya terlihat setelah
           dicoba: begitu SATU barang ditempatkan, tujuh belas barang lain
           yang masih di keranjang tak-bertempat langsung terbaca nol, dan
           kepala cabang membuka layarnya menemukan 17 barang ‘HABIS’ yang
           sebenarnya penuh. Alarm palsu massal itu tidak dihindari oleh
           penjagaan tingkat korporat; ia hanya ditunda sampai penempatan
           yang pertama.

           Per barang, jawabannya selalu benar: yang sudah ditempatkan
           punya angka cabang yang nyata, yang belum tetap memakai angka
           korporat dan barisnya menyebut demikian. */
        var ditempatkan = !!per && Object.keys(per).some(function (k) {
          return k && per[k];
        });
        var s = ditempatkan
          ? jangkau.reduce(function (a, id) { return a + (per[id] || 0); }, 0)
          : saldoStok(x.id);
        return Object.assign({}, x, {
          saldo: s,
          /* 'korporat' berarti angka di atas adalah jumlah SELURUH cabang.
             Layar wajib menyebutkannya; saldo tanpa keterangan lingkupnya
             adalah saldo yang akan dibaca sebagai milik cabang sendiri. */
          lingkupSaldo: ditempatkan ? 'cabang' : 'korporat',
          /* Yang belum ditempatkan disebut terpisah, tidak dibagi rata dan
             tidak disembunyikan: ia bukan milik cabang mana pun sampai ada
             yang mencatatnya masuk gudang. */
          belumDitempatkan: ditempatkan ? (per[''] || 0) : 0,
          /* Tiga keadaan, bukan dua: habis dan menipis menuntut tindakan yang
             berbeda — yang satu darurat, yang lain jadwal belanja. */
          keadaan: s <= 0 ? 'habis' : (s <= x.minimum ? 'menipis' : 'aman')
        });
      })
      .sort(function (a, b) {
        var urut = { habis: 0, menipis: 1, aman: 2 };
        if (urut[a.keadaan] !== urut[b.keadaan]) return urut[a.keadaan] - urut[b.keadaan];
        return String(a.nama).localeCompare(String(b.nama));
      });
  }

  function stokSatu(id) { return DB.find('mcsStok', id); }

  /** Saldo DIHITUNG dari mutasi, tidak pernah disimpan. */
  /* ================================================== JENIS MUTASI STOK

     Mula-mula hanya ada dua: masuk dan keluar. Akibatnya barang yang tumpah
     di gudang harus dicatat sebagai "keluar" — satu-satunya pilihan yang
     ada — dan sejak itu ia terhitung sebagai PEMAKAIAN.

     Diukur pada data contoh: seratus botol dipakai membersihkan memberi
     rasio 0,80 (wajar) dan belanja bulan depan nol. Menambahkan lima puluh
     botol yang TUMPAH menaikkannya menjadi 1,20 dan belanja Rp460.000 —
     petugas mendekati tanda boros karena ada yang menjatuhkan dus di
     gudang, dan anggaran naik atas dasar yang salah.

     `pakai: true` menandai jenis yang BOLEH dihitung sebagai pemakaian.
     Hanya satu yang punya tanda itu, dan itu memang maksudnya: pemakaian
     adalah barang yang habis KARENA MEMBERSIHKAN, bukan barang yang habis.

     `arah` 0 berarti tandanya datang dari jumlahnya sendiri: opname bisa
     menambah maupun mengurangi, dan begitu pula perpindahan. */
  var JENIS_MUTASI = [
    { kode: 'masuk',      nama: 'Barang masuk',           arah: 1,  ikon: '📥' },
    { kode: 'keluar',     nama: 'Dipakai membersihkan',   arah: -1, ikon: '🧹',
      pakai: true },
    { kode: 'rusak',      nama: 'Rusak / tumpah',         arah: -1, ikon: '💧',
      hilang: true },
    { kode: 'kadaluarsa', nama: 'Kedaluwarsa',            arah: -1, ikon: '⏳',
      hilang: true },
    { kode: 'opname',     nama: 'Penyesuaian opname',     arah: 0,  ikon: '📋',
      opname: true },
    { kode: 'pindah',     nama: 'Pindah lokasi',          arah: 0,  ikon: '🔀',
      pindah: true },
    /* RETUR ke pemasok. Bukan pemakaian, dan BUKAN kehilangan.

       Sebelum ada jenis ini, barang cacat yang dikembalikan hanya bisa
       dicatat sebagai 'rusak' — dan sejak itu ia terhitung sebagai uang
       yang menguap di gudang, padahal uangnya kembali. Gudang yang rajin
       mengembalikan barang cacat justru terlihat paling boros. */
    { kode: 'retur',      nama: 'Retur ke pemasok',       arah: -1, ikon: '↩️',
      retur: true }
  ];

  function jenisMutasi(kode) {
    var j = JENIS_MUTASI.filter(function (x) { return x.kode === kode; })[0];
    /* Jenis yang tidak dikenal DIANGGAP BUKAN pemakaian.

       Arahnya penting: yang tidak dikenal keluar dari hitungan pemakaian,
       bukan masuk. Kalau sebaliknya, menambahkan satu jenis baru tanpa
       memperbarui berkas ini akan diam-diam menggelembungkan angka boros
       seluruh gedung. */
    return j || { kode: kode || 'lainnya', nama: 'Lainnya', arah: 0, ikon: '❓' };
  }

  /* Satu-satunya penentu apakah sebuah mutasi dihitung sebagai pemakaian.
     Dipakai perkiraan(), cakupan(), dan biaya.js — supaya ketiganya tidak
     pernah menjawab berbeda. */
  function adalahPemakaian(m) {
    return !!jenisMutasi(m && m.jenis).pakai && Number(m.jumlah) < 0;
  }

  function adalahKehilangan(m) {
    return !!jenisMutasi(m && m.jenis).hilang && Number(m.jumlah) < 0;
  }

  function saldoStok(stokId) {
    return DB.where('mcsStokMutasi', function (m) { return m.stokId === stokId; })
      .reduce(function (s, m) { return s + Number(m.jumlah || 0); }, 0);
  }

  /**
   * Saldo dipecah menurut gudang.
   *
   * Kunci '' adalah BELUM DITEMPATKAN. Ia bukan gudang, dan sengaja tidak
   * disamakan dengan gudang mana pun: seluruh catatan yang dibuat sebelum
   * penempatan diperkenalkan berada di sana, dan memindahkannya diam-diam ke
   * sebuah lokasi akan mengarang keterangan tentang barang yang tidak pernah
   * dihitung per gudang.
   */
  function saldoPerLokasi(stokId) {
    var out = {};
    DB.where('mcsStokMutasi', function (m) { return m.stokId === stokId; })
      .forEach(function (m) {
        var kk = m.lokasiId || '';
        out[kk] = (out[kk] || 0) + Number(m.jumlah || 0);
      });
    /* Gudang yang saldonya nol dibuang: daftar berisi delapan gudang yang
       tujuh di antaranya nol tidak memberi tahu apa pun. */
    Object.keys(out).forEach(function (kk) { if (!out[kk]) delete out[kk]; });
    return out;
  }

  function saldoDiLokasi(stokId, lokasiId) {
    return saldoPerLokasi(stokId)[lokasiId || ''] || 0;
  }

  /**
   * Pindahkan stok antar gudang.
   *
   * DUA mutasi, bukan satu. Satu angka yang berpindah dari kolom A ke kolom B
   * tidak meninggalkan jejak di riwayat gudang asalnya, dan riwayat gudang
   * yang bolong adalah riwayat yang tidak dipercaya.
   *
   * Saldo TOTAL tidak berubah — dan itu memang seharusnya: memindahkan
   * barang bukan memakainya.
   */
  function pindahStok(stokId, dari, ke, jumlah, catatan, oleh) {
    var x = stokSatu(stokId);
    if (!x) return { error: I18N.t('Barang tidak ditemukan.') };
    var n = Math.max(0, Math.round(Number(jumlah) || 0));
    if (!n) return { error: I18N.t('Jumlahnya belum diisi.') };
    if ((dari || '') === (ke || '')) {
      return { error: I18N.t('Gudang asal dan tujuan sama.') };
    }
    /* Dijaga terhadap saldo GUDANG ASAL, bukan saldo total. Gudang yang
       mengirim lebih banyak daripada isinya adalah kemustahilan yang sama
       dengan saldo minus, hanya lebih sulit terlihat karena totalnya masih
       masuk akal. */
    var ada = saldoDiLokasi(stokId, dari);
    if (n > ada) {
      return { error: I18N.t('Di {g} hanya ada {n} {satuan}.')
        .replace('{g}', dari ? (window.LOKASI ? LOKASI.nama(dari) : dari)
                             : I18N.t('barang belum ditempatkan'))
        .replace('{n}', ada).replace('{satuan}', x.satuan) };
    }

    var keluar = catatMutasi(stokId, -n, 'pindah', catatan, oleh, null,
      { lokasiId: dari || null });
    if (keluar.error) return keluar;
    var masuk = catatMutasi(stokId, n, 'pindah', catatan, oleh, null,
      { lokasiId: ke || null, pasanganId: keluar.mutasi.id });
    if (masuk.error) {
      /* Sisi pertama dibatalkan bila sisi kedua gagal. Perpindahan setengah
         jadi menghilangkan barang dari catatan tanpa ada yang menerimanya. */
      DB.remove('mcsStokMutasi', keluar.mutasi.id);
      return masuk;
    }
    DB.update('mcsStokMutasi', keluar.mutasi.id, { pasanganId: masuk.mutasi.id });
    return { ok: true, dari: keluar.mutasi, ke: masuk.mutasi };
  }

  function tambahStok(korporatId, d) {
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama barang belum diisi.') };
    var x = DB.insert('mcsStok', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      satuan: d.satuan || 'pcs',
      /* JENIS bahannya — yang menentukan rekomendasi takaran per m².
         Disimpan supaya angka cakupan bisa ditelusuri asalnya, dan supaya
         rekomendasi yang berubah kelak bisa dibandingkan dengan yang
         sungguh dipakai. */
      jenisBahan: d.jenisBahan || '',
      minimum: Math.max(0, Math.round(Number(d.minimum) || 0)),
      /* Kelas bahaya bahan pembersih. Dipakai modul K3 menyalakan peringatan
         bahan yang tidak boleh bertemu di troli yang sama. */
      /* Harga satuan terakhir. Disimpan pada BARANGNYA, bukan pada tiap
         mutasi: gudang gedung membeli sabun yang sama berkali-kali dengan
         harga yang berubah sedikit, dan meminta harga tiap kali barang
         keluar akan membuat kolomnya dikosongkan orang. Akibatnya angka
         biaya adalah PERKIRAAN dengan harga terkini, bukan harga historis —
         dan itu disebut di layar. */
      harga: Math.max(0, Math.round(Number(d.harga) || 0)),
      bahaya: d.bahaya || 'aman',
      /* Isi satu satuan beli — 500 ml dalam satu botol. Keterangan, bukan
         hitungan: yang dipakai menghitung cakupan adalah `cakupanM2`. */
      isiNilai: Math.max(0, Number(d.isiNilai) || 0),
      isiSatuan: d.isiSatuan || 'ml',
      /* Berapa METER PERSEGI yang bisa dibersihkan oleh SATU satuan beli.

         Angka ini datang dari label kemasan atau dari pengamatan sendiri,
         dan ia PERKIRAAN — lantai berminyak menghabiskan pembersih dua kali
         lebih cepat daripada lantai berdebu. Karena itu ia dipakai untuk
         memperkirakan kebutuhan dan menemukan pemakaian yang jauh menyimpang,
         BUKAN untuk menjatah petugas. */
      cakupanM2: Math.max(0, Number(d.cakupanM2) || 0),
      /* JENIS AREA tempat barang ini dipakai.

         Kosong berarti SELURUH area — dan itu benar untuk pembersih lantai
         serbaguna, yang memang dipakai di mana-mana.

         Untuk barang khusus, mengosongkannya membuat perkiraan kebutuhan
         salah besar. Diukur pada data contoh: pembersih toilet yang hanya
         dipakai di 6.257 m² toilet per bulan diperkirakan butuh 422 botol,
         padahal yang sebenarnya 125 — tiga koma empat kali lipat, karena
         penyebutnya ikut menghitung lobi dan pantry.

         Akibat terburuknya bukan pada angka belanja, melainkan pada penanda
         boros/irit: pemakaian yang 1,6 kali lebih boros daripada seharusnya
         terbaca 0,47 dan justru ditandai TERLALU IRIT. Peringatan yang
         menyala ke arah yang salah membuat orang berhenti membacanya. */
      jenisArea: Array.isArray(d.jenisArea) ? d.jenisArea.slice() : [],
      /* JENIS OBJEK yang dibersihkan barang ini.

         Lebih tepat daripada jenis area, dan menggantikannya bila diisi.
         Lingkup area menjawab "dipakai di ruangan mana"; lingkup objek
         menjawab "membersihkan benda apa" — dan yang kedua itulah yang
         menentukan luasnya.

         Diukur pada data contoh: pembersih kaca berlingkup area 'lobi'
         dihitung terhadap 14.078 m² lantai dan diperkirakan butuh 234,6
         botol; berlingkup objek 'kaca' ia dihitung terhadap luas kaca yang
         sungguh dilap. Dua kali lipat selisihnya. */
      jenisObjek: Array.isArray(d.jenisObjek) ? d.jenisObjek.slice() : [],
      /* Foto label barangnya. Bukan hiasan: yang membeli ulang sering bukan
         orang yang memakainya, dan "sabun cair" ada dua puluh macam di rak
         yang sama. Foto label menghentikan salah beli yang berulang. */
      foto: (d.foto || []).slice(),
      catatan: d.catatan || ''
    });
    /* Jumlah awal masuk sebagai MUTASI, bukan sebagai kolom pada barangnya —
       supaya riwayatnya utuh sejak baris pertama. */
    var awal = Math.round(Number(d.awal) || 0);
    if (awal) catatMutasi(x.id, awal, 'masuk', I18N.t('Stok awal'), null);
    return { ok: true, stok: x };
  }

  function ubahStok(id, d) {
    var x = stokSatu(id);
    if (!x) return { error: I18N.t('Barang tidak ditemukan.') };
    var isi = {};
    /* `jenisBahan` ikut di sini juga, bukan hanya saat mendaftar: kolom
       yang hanya ditulis sekali akan hilang diam-diam pada penyuntingan
       pertama, dan asal-usul angka cakupannya ikut hilang bersamanya. */
    ['nama', 'satuan', 'catatan', 'bahaya', 'jenisBahan'].forEach(function (f) {
      if (d[f] !== undefined) isi[f] = d[f]; });
    if (d.minimum !== undefined) isi.minimum = Math.max(0, Math.round(Number(d.minimum) || 0));
    if (d.harga !== undefined) isi.harga = Math.max(0, Math.round(Number(d.harga) || 0));
    if (d.isiNilai !== undefined) isi.isiNilai = Math.max(0, Number(d.isiNilai) || 0);
    if (d.isiSatuan !== undefined) isi.isiSatuan = d.isiSatuan || 'ml';
    if (d.cakupanM2 !== undefined) isi.cakupanM2 = Math.max(0, Number(d.cakupanM2) || 0);
    if (d.jenisArea !== undefined) {
      isi.jenisArea = Array.isArray(d.jenisArea) ? d.jenisArea.slice() : [];
    }
    if (d.jenisObjek !== undefined) {
      isi.jenisObjek = Array.isArray(d.jenisObjek) ? d.jenisObjek.slice() : [];
    }
    /* Hanya ditulis bila formulirnya memang mengirimnya — formulir yang tidak
       memuat kolom foto tidak boleh menghapus foto yang sudah ada. */
    if (d.foto !== undefined) isi.foto = (d.foto || []).slice();
    DB.update('mcsStok', id, isi);
    return { ok: true };
  }

  function hapusStok(id) {
    DB.where('mcsStokMutasi', function (m) { return m.stokId === id; })
      .forEach(function (m) { DB.remove('mcsStokMutasi', m.id); });
    DB.remove('mcsStok', id);
    return { ok: true };
  }

  /**
   * Catat pergerakan stok.
   *
   * `jumlah` ditulis bertanda: positif menambah, negatif mengurangi.
   * Menyimpan jenis DAN tanda memang berulang, tetapi jenisnya yang dibaca
   * manusia di riwayat, dan tandanya yang dijumlahkan mesin — memaksa salah
   * satunya menurunkan yang lain membuat koreksi negatif mustahil ditulis.
   */
  /**
   * @param opsi { lokasiId, pasanganId } — keduanya opsional.
   *   Ditaruh di argumen ketujuh sebagai objek, bukan ditambah dua argumen
   *   posisi lagi: fungsi ini sudah dipanggil dari sepuluh tempat, dan
   *   argumen posisi kedelapan adalah undangan untuk salah urutan.
   */
  function catatMutasi(stokId, jumlah, jenis, catatan, oleh, areaId, opsi) {
    var x = stokSatu(stokId);
    if (!x) return { error: I18N.t('Barang tidak ditemukan.') };
    var n = Math.round(Number(jumlah) || 0);
    if (!n) return { error: I18N.t('Jumlahnya belum diisi.') };

    /* Saldo minus ditolak DI SINI, bukan hanya di formulirnya.

       Penjaga yang hanya hidup di satu dialog akan dilewati oleh pemanggil
       berikutnya — dan saldo minus bukan sekadar angka jelek: ia satu-satunya
       angka yang dipakai memutuskan pembelian, dan yang mustahil selalu
       berarti ada catatan yang salah dan harus diperbaiki sekarang. */
    if (n < 0) {
      var saldo = saldoStok(stokId);
      if (saldo + n < 0) {
        return { error: I18N.t('Saldo hanya {n} {satuan}. Catat barang masuk dulu bila memang ada.')
          .replace('{n}', saldo).replace('{satuan}', x.satuan) };
      }
      /* DAN saldo gudangnya sendiri.

         Penjagaan terhadap total saja tidak cukup sejak stok bisa tersebar.
         Terbukti saat diuji: lima ratus botol berada di Gudang Pusat, lalu
         seratus dicatat keluar tanpa menyebut gudangnya — totalnya masih
         empat ratus dan lolos, tetapi keranjang "belum ditempatkan" menjadi
         minus seratus. Angka mustahil yang tidak terlihat pada totalnya
         adalah angka mustahil yang paling lama bertahan.

         Pada korporat yang belum memakai penempatan, seluruh stok berada di
         keranjang kosong, sehingga pemeriksaan ini sama persis dengan
         pemeriksaan total di atas — tidak ada yang berubah bagi mereka. */
      var gudang = (opsi && opsi.lokasiId) || null;
      var diGudang = saldoDiLokasi(stokId, gudang);
      if (diGudang + n < 0) {
        return { error: I18N.t('Di {g} hanya ada {n} {satuan}.')
          .replace('{g}', gudang
            ? (window.LOKASI ? LOKASI.nama(gudang) : gudang)
            : I18N.t('stok yang belum ditempatkan'))
          .replace('{n}', diGudang).replace('{satuan}', x.satuan) };
      }
    }
    /* Jenis yang tidak dikenal ditolak, bukan disimpan apa adanya.
       Catatan bertjenis salah ketik akan keluar dari hitungan pemakaian
       tanpa satu pun tanda — dan yang hilang dari hitungan tidak pernah
       terlihat, berbeda dengan yang salah hitung. */
    var kodeJenis = jenis || (n > 0 ? 'masuk' : 'keluar');
    if (!JENIS_MUTASI.some(function (j) { return j.kode === kodeJenis; })) {
      return { error: I18N.t('Jenis mutasi tidak dikenal: {v}').replace('{v}', kodeJenis) };
    }
    var m = DB.insert('mcsStokMutasi', {
      korporatId: x.korporatId, stokId: stokId,
      jumlah: n, jenis: kodeJenis,
      catatan: String(catatan || '').trim(),
      areaId: areaId || null,
      /* Gudang mana. Kosong berarti BELUM DITEMPATKAN — bukan berarti
         gudang pusat. Perbedaannya penting: barang yang belum ditempatkan
         tidak bisa dipindahkan dari lokasi mana pun, dan mengangganya
         milik gudang pusat akan membuat perpindahan pertama mengurangi
         stok gudang yang sebenarnya kosong. */
      lokasiId: (opsi && opsi.lokasiId) || null,
      /* SIAPA yang mengambilnya.

         Barang habis pakai keluar dari gudang ke troli seseorang, bukan ke
         ruangan. Tanpa nama pengambil, satu-satunya pertanyaan yang bisa
         dijawab adalah "berapa yang keluar" — dan yang benar-benar berguna
         adalah "kenapa troli yang satu menghabiskan dua kali lipat troli
         yang lain di lantai yang sama". */
      pekerjaId: (opsi && opsi.pekerjaId) || null,
      /* OBJEK mana yang diisi ulang. Dipakai pengisian dispenser: itu
         satu-satunya pemakaian yang benar-benar terjadi pada satu benda,
         pada satu waktu, dengan jumlah yang bulat dan diketahui petugas. */
      objekId: (opsi && opsi.objekId) || null,
      /* Dua sisi sebuah perpindahan saling menunjuk, supaya yang membaca
         riwayat satu gudang bisa menemukan lawan hitungnya. */
      pasanganId: (opsi && opsi.pasanganId) || null,
      /* NOTA PENERIMAAN yang melahirkan baris ini. Baris nota tidak
         disimpan tersendiri — mutasi inilah barisnya. */
      terimaId: (opsi && opsi.terimaId) || null,
      /* HARGA SATUAN SAAT ITU, bukan harga terkini.

         Harga di `mcsStok` adalah harga terakhir, dan dengannya biaya
         bulan Maret dihitung memakai harga bulan Agustus. Selama tidak
         ada penerimaan bernota, itu satu-satunya angka yang ada dan
         layarnya mengatakan demikian. Begitu ada, biaya bisa memakai
         harga rata-rata bergerak yang sungguh dibayar. Nol berarti tidak
         disebut, BUKAN gratis — dan dibedakan pada perhitungannya. */
      harga: Math.max(0, Math.round(Number(opsi && opsi.harga) || 0)),
      /* TANGGAL KEDALUWARSA barang yang masuk lewat baris ini.

         Jenis mutasi 'kadaluarsa' sudah ada sejak lama, tetapi ia hanya
         alat MENCATAT kerugian yang sudah terjadi. Tanpa tanggal pada
         barang yang masuk, tidak ada satu pun yang bisa memperingatkan
         SEBELUMNYA — dan peringatan sesudahnya tidak menyelamatkan
         sebotol pun disinfektan. */
      kedaluwarsa: (opsi && opsi.kedaluwarsa) || null,
      pada: U.nowISO(),
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : ''
    });
    return { ok: true, mutasi: m, saldo: saldoStok(stokId) };
  }

  function mutasiStok(stokId, batas) {
    return DB.where('mcsStokMutasi', function (m) { return m.stokId === stokId; })
      .sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); })
      .slice(0, batas || 30);
  }

  /**
   * Berapa meter persegi yang bisa dicakup barang ini, dan berapa lama.
   *
   * Tiga angka yang menjawab tiga pertanyaan berbeda:
   *
   *   · cakupanStok  — stok yang ada sekarang cukup untuk berapa m²
   *   · perluBulan   — berapa satuan yang DIPERKIRAKAN habis sebulan, dihitung
   *                    dari luas yang benar-benar dibersihkan dikali
   *                    frekuensinya
   *   · pakaiBulan   — berapa satuan yang SUNGGUH keluar sebulan terakhir
   *
   * Yang paling berguna adalah SELISIH dua yang terakhir. Perkiraan yang
   * meleset jauh berarti salah satu dari dua hal, dan keduanya layak
   * ditanyakan: angka cakupan di label tidak cocok dengan kenyataan lapangan,
   * atau pemakaiannya memang berlebihan.
   *
   * Mengembalikan null bila cakupannya belum diisi. Menghitungnya sebagai nol
   * akan menampilkan "stok cukup untuk 0 m²" pada barang yang sebenarnya
   * hanya belum diisi angkanya — dan angka yang salah lebih berbahaya
   * daripada angka yang tidak ada.
   */
  /**
   * @param lokasiId  bila diisi, SELURUH hitungan dipersempit ke gudang itu:
   *                  luas yang dibersihkan, saldo, dan pemakaian nyata.
   *
   * Yang memesan bahan bukan korporat, melainkan tiap gudang. Angka
   * se-korporat berguna untuk anggaran tahunan dan tidak berguna sama sekali
   * untuk orang yang harus menulis surat pesanan minggu ini.
   */
  function cakupan(korporatId, stokId, lokasiId) {
    var x = stokSatu(stokId);
    if (!x) return null;
    /* Dua cara sebuah barang bisa terukur, dan salah satunya sudah cukup:
     *
     *   · CAKUPAN m²  — untuk yang menyapu bidang: pembersih lantai, kaca.
     *   · TAKARAN ml  — untuk yang dituang ke benda: pembersih kloset.
     *
     * Sebelumnya hanya yang pertama diakui, sehingga barang berbasis takaran
     * gugur di baris ini dan seluruh jalur takaran yang ada di bawah tidak
     * pernah dijalankan sekali pun. Ketahuan saat diuji, bukan saat dibaca —
     * kodenya benar, hanya tidak pernah tercapai. */
    var bisaTakaran = (x.jenisObjek || []).length &&
      (x.isiSatuan === 'ml' || x.isiSatuan === 'liter') && Number(x.isiNilai);
    if (!x.cakupanM2 && !bisaTakaran) return null;
    /* Saldo gudang itu saja bila gudangnya disebut. */
    var saldo = lokasiId ? saldoDiLokasi(stokId, lokasiId) : saldoStok(stokId);

    /* --- luas yang dibersihkan sebulan, SEBATAS lingkup barang ini ---

       TIGA tingkat ketelitian, dipakai yang paling tepat yang tersedia:

         1. lingkup OBJEK  — luas permukaan objek yang sungguh dilap.
                             Paling tepat. Butuh dimensi objek terisi.
         2. lingkup AREA   — luas lantai ruangan yang jenisnya cocok.
                             Benar untuk pembersih lantai, dua kali lipat
                             terlalu besar untuk pembersih kaca.
         3. seluruh area   — bila keduanya kosong. Benar untuk serbaguna.

       Yang naik tingkat tidak pernah otomatis: ia naik ketika manusia
       mengisi lingkup objek dan dimensinya. Sampai itu terjadi, angkanya
       kasar — dan layar menyebut sedang memakai tingkat yang mana. */
    var lingkup = (x.jenisArea || []);
    var lingkupObjek = (x.jenisObjek || []);
    var luasBulan = 0, adaLuas = false, areaDipakai = [], areaLuar = 0;
    var dasarLuas = lingkupObjek.length ? 'objek' : (lingkup.length ? 'area' : 'semua');
    var objekIkut = 0, objekTanpaUkur = 0, takaranBulan = 0;

    if (window.BEBAN) {
      var cfg = BEBAN.config(korporatId);
      area(korporatId).forEach(function (a) {
        /* Area di luar gudang yang diminta tidak ikut menghitung luas — dan
           tidak ikut pula ke `areaLuar`, karena ia bukan area yang lingkup
           barangnya tidak cocok, melainkan area milik cabang lain. Dua hal
           berbeda yang kalau dicampur membuat angka “area di luar lingkup”
           membengkak dan tidak berarti apa-apa. */
        if (lokasiId && a.lokasiId !== lokasiId) return;
        var h = BEBAN.hitungArea(a, cfg);
        if (h.jamPerMinggu === null || !h.frekuensi) return;

        if (dasarLuas === 'objek') {
          /* Bila KEDUANYA diisi, keduanya berlaku — diiris, bukan yang satu
             menggantikan yang lain. Karbol wangi berlingkup objek 'lantai'
             dan area 'koridor;lift;lobi' berarti lantai KORIDOR, bukan
             seluruh lantai gedung. Sebelum ini lingkup areanya diabaikan
             diam-diam begitu lingkup objek terisi, sehingga barang yang
             dibatasi dengan hati-hati justru melebar ke mana-mana. */
          if (lingkup.length && lingkup.indexOf(a.jenis) < 0) { areaLuar++; return; }
          /* Objek di dalam area ini yang jenisnya termasuk lingkup. */
          var ikut = objek(a.id).filter(function (o) {
            return lingkupObjek.indexOf(o.jenis) >= 0;
          });
          if (!ikut.length) { areaLuar++; return; }
          var adaDiSini = false;
          ikut.forEach(function (o) {
            /* Frekuensi TIAP OBJEK, bukan frekuensi areanya. Kaca di ruang
               kerja ikut dilewati tiap hari, tetapi dicuci seminggu sekali;
               memakai frekuensi area membuat kebutuhannya tujuh kali lipat.
               Kosong berarti memang ikut areanya. Tidak pernah melebihi
               frekuensi area — objek tidak bisa dikerjakan lebih sering
               daripada petugas datang ke ruangannya. */
            var fo = Number(o.kaliPerMinggu) || 0;
            fo = fo ? Math.min(fo, h.frekuensi) : h.frekuensi;
            if (!fo) { return; }
            var pm = permukaanObjek(o);
            if (pm !== null) {
              adaLuas = true; luasBulan += pm * fo * 4.345;
              adaDiSini = true; objekIkut++; return;
            }
            var tk = takaranObjek(o);
            if (tk !== null) {
              /* Objek satuan menyumbang MILILITER, bukan meter persegi.
                 Dijumlahkan terpisah dan dipakai bila kemasan barangnya
                 memang diukur dalam ml atau liter. */
              takaranBulan += tk * fo * 4.345;
              adaDiSini = true; objekIkut++;
              return;
            }
            /* Belum diukur sama sekali — dikeluarkan, bukan dianggap nol. */
            objekTanpaUkur++;
          });
          if (!adaDiSini) return;
          areaDipakai.push(a.nama);
          return;
        }

        /* Lingkup kosong = seluruh area. Benar untuk pembersih serbaguna. */
        if (lingkup.length && lingkup.indexOf(a.jenis) < 0) { areaLuar++; return; }
        adaLuas = true;
        areaDipakai.push(a.nama);
        /* 4,345 minggu per bulan — bukan 4. Selisihnya delapan persen, dan
           delapan persen dari anggaran bahan setahun bukan angka kecil. */
        luasBulan += (Number(a.luas) || 0) * h.frekuensi * 4.345;
      });
    }

    /* --- pemakaian sungguhan sebulan terakhir ---
       PEMAKAIAN, bukan sekadar berkurang. Barang yang tumpah juga membuat
       saldo turun, tetapi ia tidak membersihkan satu meter pun. */
    var batas = U.iso(U.addDays(new Date(), -30));
    var keluar = 0;
    DB.where('mcsStokMutasi', function (m) {
      return m.stokId === stokId && adalahPemakaian(m) &&
             String(m.pada).slice(0, 10) >= batas &&
             /* Pemakaian gudang itu saja. Mutasi yang gudangnya belum pernah
                dicatat TIDAK ikut ke gudang mana pun — memasukkannya ke salah
                satu berarti membebankan pemakaian cabang lain kepadanya. */
             (!lokasiId || m.lokasiId === lokasiId);
    }).forEach(function (m) { keluar += Math.abs(m.jumlah); });

    /* Isi kemasan dalam MILILITER, untuk menghitung kebutuhan objek satuan.
       Hanya ml dan liter yang bisa dipakai — takaran diukur dalam ml, dan
       membandingkannya dengan kemasan berisi "5 kg" adalah membandingkan
       dua besaran yang berbeda. */
    var isiMl = x.isiSatuan === 'liter' ? (Number(x.isiNilai) || 0) * 1000
              : (x.isiSatuan === 'ml' ? (Number(x.isiNilai) || 0) : 0);
    /* Pembagi nol menghasilkan Infinity, dan Infinity botol tampil di layar
       sebagai angka yang tidak seorang pun tahu artinya. */
    var perluLuas = (adaLuas && x.cakupanM2) ? luasBulan / x.cakupanM2 : null;
    var perluTakaran = (takaranBulan && isiMl) ? takaranBulan / isiMl : null;
    var perluBulan = (perluLuas === null && perluTakaran === null) ? null
      : (perluLuas || 0) + (perluTakaran || 0);
    return {
      cakupanM2: x.cakupanM2,
      saldo: saldo,
      /* Lingkupnya DISEBUTKAN pada hasilnya, bukan hanya diketahui
         penghitungnya. Angka kebutuhan yang tidak menyebut area mana yang
         dihitung akan dibaca sebagai kebutuhan seluruh gedung. */
      jenisArea: lingkup.slice(),
      jenisObjek: lingkupObjek.slice(),
      seluruhArea: !lingkup.length && !lingkupObjek.length,
      areaDipakai: areaDipakai,
      areaLuar: areaLuar,
      /* Tingkat ketelitian yang sedang dipakai. Disebutkan pada hasilnya
         supaya layar bisa mengatakannya — angka kasar dan angka teliti yang
         tampil serupa akan sama-sama dipercaya. */
      dasarLuas: dasarLuas,
      objekIkut: objekIkut,
      /* Objek yang jenisnya cocok tetapi belum diukur sama sekali. Selama
         ada yang di sini, angkanya lebih KECIL daripada yang sebenarnya. */
      objekTanpaUkur: objekTanpaUkur,
      takaranBulanMl: Math.round(takaranBulan),
      /* Cakupan seluruh stok yang ada sekarang. */
      cakupanStok: Math.round(saldo * x.cakupanM2),
      luasBulan: Math.round(luasBulan),
      perluBulan: perluBulan === null ? null : Math.round(perluBulan * 10) / 10,
      pakaiBulan: keluar,
      /* Cukup untuk berapa bulan lagi, menurut pemakaian SUNGGUHAN bila ada,
         dan menurut perkiraan bila belum ada riwayatnya. Yang sungguhan
         didahulukan: ia sudah memperhitungkan kebiasaan gedung ini sendiri. */
      /* Dikembalikan dalam HARI, bukan bulan. Stok yang cukup untuk satu hari
         menghasilkan '0,0 bulan' — angka yang benar tetapi terbaca sebagai
         galat, dan yang membacanya berhenti mempercayai kolomnya. Layar yang
         memutuskan menyebutnya hari atau bulan. */
      hariLagi: (function () {
        var laju = keluar || perluBulan;
        if (!laju) return null;
        return Math.round(saldo / laju * 30.4 * 10) / 10;
      })(),
      /* Perbandingan pemakaian terhadap perkiraan. 1 berarti pas; 2 berarti
         dua kali lipat lebih boros daripada yang diperkirakan label. */
      rasio: (perluBulan && keluar) ? Math.round(keluar / perluBulan * 100) / 100 : null
    };
  }

  /**
   * Rencana belanja bahan habis pakai untuk beberapa bulan ke depan.
   *
   * Angka kebutuhannya sudah lama dihitung per barang oleh cakupan(); yang
   * belum ada adalah yang menjumlahkannya menjadi satu daftar yang bisa
   * dibawa ke rapat anggaran. Tanpa itu, orang gudang harus membuka dua
   * ratus baris satu per satu dan menjumlahkan sendiri di kertas.
   *
   * DASAR PERHITUNGAN DISEBUTKAN PER BARIS, bukan disembunyikan:
   *
   *   · 'pakai'  — dari pemakaian SUNGGUHAN barang ini sebulan terakhir.
   *                Paling dipercaya: ia sudah memuat kebiasaan gedung ini,
   *                lantainya, dan orang-orangnya.
   *   · 'takaran' — dari cakupan/takaran label kemasan. Dipakai bila belum
   *                ada riwayat keluar sama sekali — barang baru, atau barang
   *                yang mutasinya belum pernah dicatat.
   *
   * Dua barang dengan angka usul yang sama tetapi dasar berbeda TIDAK sama
   * kuat, dan yang menyetujui anggaran berhak tahu yang mana.
   *
   * YANG TIDAK BISA DIPERKIRAKAN TIDAK DIBUANG DIAM-DIAM. Barang tanpa
   * cakupan maupun takaran dikembalikan terpisah pada `takTerukur`, lengkap
   * dengan namanya. Daftar belanja yang diam-diam melewatkan tiga puluh
   * barang akan dipercaya sebagai daftar yang lengkap — dan kekurangannya
   * baru ketahuan di gudang, pada hari barangnya habis.
   */
  function rencanaBelanja(korporatId, opsi) {
    opsi = opsi || {};
    var bulan = Math.max(0.5, Number(opsi.bulan) || 1);
    var lokasiId = opsi.lokasiId || '';
    var out = [], takTerukur = [], cukup = 0;

    stok(korporatId).forEach(function (x) {
      var c = cakupan(korporatId, x.id, lokasiId);
      /* Laju pemakaian: yang SUNGGUHAN lebih dipercaya daripada label. */
      var lajuPakai = c ? Number(c.pakaiBulan) || 0 : 0;
      var lajuLabel = c ? Number(c.perluBulan) || 0 : 0;
      var laju = lajuPakai || lajuLabel;
      if (!laju) {
        takTerukur.push({ id: x.id, nama: x.nama, satuan: x.satuan,
          saldo: c ? c.saldo
            : (lokasiId ? saldoDiLokasi(x.id, lokasiId) : saldoStok(x.id)) });
        return;
      }
      var saldo = c.saldo;
      /* Kebutuhan sampai akhir rentang, DITAMBAH batas minimum yang memang
         harus tetap ada di rak. Membeli pas sampai nol berarti setiap
         keterlambatan kirim menjadi hari tanpa sabun. */
      var butuh = laju * bulan + (Number(x.minimum) || 0);
      var usul = Math.ceil(butuh - saldo);
      if (usul <= 0) { cukup++; return; }
      out.push({
        id: x.id, nama: x.nama, satuan: x.satuan,
        saldo: saldo, minimum: Number(x.minimum) || 0,
        laju: Math.round(laju * 10) / 10,
        dasar: lajuPakai ? 'pakai' : 'takaran',
        hariLagi: c.hariLagi,
        usul: usul,
        /* KETERANGAN DASARNYA ikut per baris, bukan hanya angkanya.

           Angka kebutuhan tanpa keterangan selalu dibaca sebagai kebutuhan
           satu gedung. Diukur pada data contoh: degreaser bengkel terhitung
           12.907 liter sebulan — aritmetikanya benar (1.548.819 m² lantai
           bengkel dibersihkan sebulan di 86 cabang, dibagi 120 m² per liter,
           yaitu ±150 liter per cabang), tetapi tanpa menyebut 86 cabang dan
           1,5 juta m² itu, angkanya terbaca sebagai salah hitung dan yang
           membacanya berhenti mempercayai seluruh daftarnya.

           `seluruhArea` dan `objekTanpaUkur` ikut karena keduanya membuat
           angkanya lemah ke arah yang BERBEDA: yang pertama melebihkan
           (penyebutnya ikut menghitung ruangan yang tidak dibersihkan bahan
           ini), yang kedua mengurangi (objek yang belum diukur tidak ikut
           terhitung sama sekali). */
        luasBulan: c.luasBulan,
        dasarLuas: c.dasarLuas,
        seluruhArea: c.seluruhArea,
        nArea: (c.areaDipakai || []).length,
        objekTanpaUkur: c.objekTanpaUkur,
        harga: Number(x.harga) || 0,
        biaya: (Number(x.harga) || 0) * usul
      });
    });

    /* Yang paling cepat habis lebih dulu — itulah urutan yang dipakai orang
       memutuskan mana yang dibeli hari ini bila uangnya tidak cukup untuk
       semuanya. Yang tidak punya sisa hari ditaruh di belakang. */
    out.sort(function (a, b) {
      var ha = a.hariLagi === null ? Infinity : a.hariLagi;
      var hb = b.hariLagi === null ? Infinity : b.hariLagi;
      return ha - hb;
    });

    return {
      bulan: bulan,
      /* Gudang yang sedang dihitung DISEBUT pada hasilnya. Daftar belanja
         tanpa nama gudang akan dibaca sebagai daftar seluruh korporat oleh
         siapa pun yang menerimanya lewat cetakan. */
      lokasiId: lokasiId,
      baris: out,
      cukup: cukup,
      takTerukur: takTerukur,
      totalBiaya: out.reduce(function (t, r) { return t + r.biaya; }, 0),
      /* Berapa baris yang harganya belum diisi — total biayanya lebih KECIL
         daripada yang sebenarnya selama ini di atas nol. */
      tanpaHarga: out.filter(function (r) { return !r.harga; }).length
    };
  }
  /**
   * Jenis area tempat barang ini SUNGGUH-SUNGGUH keluar selama ini.
   *
   * Diambil dari riwayat mutasi, bukan dari pernyataan. Dipakai sebagai
   * USULAN pada formulir — bukan diterapkan diam-diam, karena riwayat tiga
   * bulan bisa saja belum mencakup ruangan yang jarang dibersihkan, dan
   * mempersempit lingkup berdasarkan itu akan memperkecil perkiraan
   * kebutuhan tanpa ada yang tahu sebabnya.
   *
   * Mutasi tanpa areaId dilewati: ia bukan bukti barang ini dipakai
   * di mana-mana, ia hanya bukti areanya lupa dicatat.
   */
  function lingkupDariRiwayat(stokId) {
    var hitung = {};
    DB.where('mcsStokMutasi', function (m) {
      return m.stokId === stokId && m.jumlah < 0 && m.areaId;
    }).forEach(function (m) {
      var a = areaSatu(m.areaId);
      if (!a) return;
      hitung[a.jenis] = (hitung[a.jenis] || 0) + Math.abs(m.jumlah);
    });
    return Object.keys(hitung)
      .sort(function (a, b) { return hitung[b] - hitung[a]; })
      .map(function (kode) { return { jenis: kode, jumlah: hitung[kode] }; });
  }

  /**
   * Perkiraan kebutuhan bulan depan, untuk seluruh barang.
   *
   * Dua angka yang menjawab dua pertanyaan berbeda, dan keduanya diberikan
   * karena tidak ada satu pun yang benar sendirian:
   *
   *   perluBulan  — dari LUAS yang dibersihkan dibagi cakupan kemasan.
   *                 Berlaku bahkan untuk barang yang belum pernah dipakai.
   *                 Optimistis: angka label diukur di lantai bersih.
   *   pakaiBulan  — dari MUTASI KELUAR tiga puluh hari terakhir.
   *                 Sudah memuat kebiasaan gedung ini sendiri, termasuk
   *                 kebiasaan borosnya.
   *
   * Yang dipakai menyusun belanja adalah yang SUNGGUHAN bila ada, karena
   * gudang harus menyiapkan barang untuk kenyataan, bukan untuk keadaan
   * ideal. Yang label dipakai sebagai pembanding — dan selisih keduanya
   * itulah penanda boros atau irit.
   *
   * KENAPA SATU BULAN, BUKAN SATU MINGGU
   *
   * Pemesanan bahan pembersih di Indonesia umumnya bulanan, dan pemasok
   * memberi harga lebih baik pada volume bulanan. Angka mingguan akan
   * terlihat lebih presisi dan justru lebih sering meleset, karena satu
   * hari libur nasional menggesernya belasan persen.
   */
  function perkiraan(korporatId, opsi) {
    opsi = opsi || {};
    /* Cadangan pengaman: berapa persen di atas kebutuhan yang disiapkan.
       Nol berarti gudang kosong tepat di hari terakhir — dan hari terakhir
       itu selalu jatuh pada hari pengiriman pemasok terlambat. */
    var cadangan = opsi.cadangan === undefined ? 0.15 : Number(opsi.cadangan) || 0;

    var out = [], totalBelanja = 0;
    var tanpaHarga = 0, tanpaCakupan = 0, tanpaRiwayat = 0;

    stok(korporatId).forEach(function (x) {
      var saldo = saldoStok(x.id);
      var c = cakupan(korporatId, x.id);

      /* Pemakaian sungguhan dihitung terpisah dari cakupan(), supaya barang
         TANPA cakupan m2 — tisu, kantong sampah — tetap punya perkiraan.
         Kalau tidak, justru barang yang paling sering habis yang tidak
         pernah masuk daftar belanja. */
      var batas = U.iso(U.addDays(new Date(), -30));
      var keluar = 0, hilang = 0;
      DB.where('mcsStokMutasi', function (m) {
        return m.stokId === x.id && String(m.pada).slice(0, 10) >= batas;
      }).forEach(function (m) {
        if (adalahPemakaian(m)) keluar += Math.abs(m.jumlah);
        /* Kehilangan dihitung TERPISAH. Ia nyata dan berbiaya, tetapi ia
           bukan ukuran boros-tidaknya petugas dan bukan dasar belanja bulan
           depan: tumpahan bulan lalu tidak berulang tiap bulan. */
        else if (adalahKehilangan(m)) hilang += Math.abs(m.jumlah);
      });

      var dariLabel = c ? c.perluBulan : null;
      var dasar = keluar || dariLabel;
      var sumber = keluar ? 'riwayat' : (dariLabel ? 'label' : null);
      if (!keluar) tanpaRiwayat++;
      if (!x.harga) tanpaHarga++;
      if (!x.cakupanM2) tanpaCakupan++;

      var butuh = dasar === null ? null : dasar * (1 + cadangan);
      /* Yang perlu DIBELI, bukan yang perlu dipakai: stok yang sudah ada
         di gudang tidak perlu dibeli lagi. Minimum ikut diperhitungkan —
         gudang yang menyentuh nol sudah terlambat. */
      var kurang = butuh === null ? null
        : Math.max(0, Math.ceil(butuh + (Number(x.minimum) || 0) - saldo));
      var biaya = (kurang && x.harga) ? kurang * x.harga : 0;
      totalBelanja += biaya;

      out.push({
        stok: x, saldo: saldo,
        perluBulan: dariLabel,
        pakaiBulan: keluar,
        hilangBulan: hilang,
        nilaiHilang: hilang * (Number(x.harga) || 0),
        dasar: dasar === null ? null : Math.round(dasar * 10) / 10,
        sumber: sumber,
        butuh: butuh === null ? null : Math.round(butuh * 10) / 10,
        kurang: kurang, biaya: biaya,
        hariLagi: c ? c.hariLagi : (keluar ? Math.round(saldo / keluar * 30.4 * 10) / 10 : null),
        /* Pemakaian dibanding perkiraan label. Hanya ada bila KEDUANYA ada;
           membandingkan riwayat dengan dirinya sendiri tidak memberi tahu
           apa pun. */
        rasio: (dariLabel && keluar) ? Math.round(keluar / dariLabel * 100) / 100 : null,
        /* Lingkupnya dibaca dari BARANGNYA, bukan dari hasil cakupan().
           cakupan() memulangkan null untuk barang yang belum terukur, dan
           membaca lingkup dari sana membuat barang berlingkup objek tertulis
           'seluruh area' — keterangan yang salah pada barang yang justru
           paling sempit lingkupnya. */
        seluruhArea: !(x.jenisArea || []).length && !(x.jenisObjek || []).length,
        jenisArea: (x.jenisArea || []).slice(),
        jenisObjek: (x.jenisObjek || []).slice(),
        areaDipakai: c ? c.areaDipakai : []
      });
    });

    /* Yang harus dibeli lebih dulu, lalu yang paling mahal. Daftar belanja
       yang diurut abjad memaksa pembacanya menyisir seluruhnya. */
    out.sort(function (a, b) {
      if (!!b.kurang !== !!a.kurang) return (b.kurang ? 1 : 0) - (a.kurang ? 1 : 0);
      return b.biaya - a.biaya;
    });

    return {
      baris: out, cadangan: cadangan,
      totalBelanja: totalBelanja,
      /* Kehilangan gudang sebulan terakhir. Disebut sebagai angkanya
         sendiri: uang yang menguap di gudang tidak boleh bersembunyi di
         dalam biaya kebersihan, karena yang memperbaikinya bukan petugas
         kebersihan melainkan cara menyimpannya. */
      hilangNilai: out.reduce(function (t, b) { return t + b.nilaiHilang; }, 0),
      hilangBarang: out.filter(function (b) { return b.hilangBulan; }).length,
      perluDibeli: out.filter(function (b) { return b.kurang; }).length,
      /* Tiga sebab angka ini bisa meleset, dihitung supaya bisa dikatakan
         di layar alih-alih ditemukan sendiri sebulan kemudian. */
      tanpaHarga: tanpaHarga, tanpaCakupan: tanpaCakupan, tanpaRiwayat: tanpaRiwayat,
      /* Yang menyimpang jauh dari perkiraan label. Ambang 1,5 dan 0,5 sama
         dengan yang dipakai daftar barang — selisih dua puluh persen antara
         label dan lapangan adalah hal biasa, dan menandainya membuat
         tandanya berhenti dibaca. */
      boros: out.filter(function (b) { return b.rasio && b.rasio >= 1.5; }),
      irit: out.filter(function (b) { return b.rasio && b.rasio <= 0.5; })
    };
  }

  /* ============================================ AMBIL BARANG KE TROLI

     Peristiwa yang paling sering terjadi dan paling jarang tercatat:
     petugas mengambil lima botol dari gudang untuk trolinya hari itu.

     KENAPA INI YANG DICATAT, BUKAN PEMAKAIAN PER TUGAS

     Pemindaian QR saat tugas selesai mengatakan "saya di sini dan sudah
     selesai" — ia tidak membawa angka. Memotong stok otomatis dari rumus
     luas ÷ cakupan membuat pemakaian sama dengan perkiraan menurut
     definisinya sendiri: diukur pada data contoh, rasio boros/irit menjadi
     1,00 selamanya, untuk tiap barang, tiap bulan. Penandanya berhenti
     mengukur apa pun.

     Pengambilan dari gudang punya angka yang sungguh ada, dihitung manusia,
     sekali sehari. Itulah yang bisa dibandingkan dengan perkiraan.

     PENYEDERHANAAN YANG HARUS DISEBUT

     Yang naik ke troli belum tentu habis hari itu. Mencatat dua tahap —
     gudang ke troli, lalu troli ke pemakaian — lebih tepat, dan tidak akan
     ada yang melakukannya. Jadi pengambilan dianggap pemakaian, dan
     selisihnya muncul sebagai fluktuasi antar hari yang saling meratakan
     dalam sebulan. Untuk perkiraan bulanan itu cukup; untuk menghakimi
     satu hari, tidak.
     ==================================================================== */

  /**
   * @param baris [{ stokId, jumlah }]
   * @param opsi  { lokasiId, areaId, catatan }
   */
  function ambilBarang(korporatId, pekerjaId, baris, opsi, oleh) {
    opsi = opsi || {};
    var p = pekerjaSatu ? pekerjaSatu(pekerjaId) : null;
    if (pekerjaId && !p) return { error: I18N.t('Petugas tidak ditemukan.') };
    /* Ditolak dengan alasan yang sama seperti tandaiHadir(): batas
       kewenangan, bukan urutan pencatatan. Barang yang keluar atas nama
       orang di cabang lain mengurangi saldo yang bukan miliknya. */
    if (window.MCSAKSES) {
      var sbB = MCSAKSES.sebabTakBolehTulis(oleh);
      if (sbB && sbB.kode === 'lingkup') return { error: sbB.pesan };
      if (p && !MCSAKSES.bolehPekerja(p, oleh)) {
        return { error: I18N.t('{nama} bertugas di cabang yang tidak Anda kelola. Minta cabangnya ditambahkan ke akun Anda bila memang perlu.')
          .replace('{nama}', p.nama) };
      }
    }

    /* ------------------------------------------- PERINGATAN, BUKAN TOLAKAN

       Bahan yang keluar atas nama orang yang sudah berhenti bekerja adalah
       salah satu cara paling sederhana menguapkan persediaan tanpa jejak:
       namanya masih di daftar pilihan, saldonya berkurang, dan tidak ada
       satu pun layar yang menyebutnya aneh.

       Tidak ditolak, karena orang yang cuti sungguh bisa mampir mengambil
       bahan untuk regunya, dan absensi sering baru diisi sore hari.
       Menolaknya berarti memaksa penjaga gudang mengarang nama lain —
       dan nama karangan jauh lebih buruk daripada nama yang ditandai. */
    var peringatan = [];
    if (p && p.aktif === false) {
      peringatan.push(I18N.t('{nama} sudah tidak aktif sebagai petugas.')
        .replace('{nama}', p.nama));
    } else if (p) {
      var tglA = U.today();
      var ab = DB.first('mcsAbsensi', function (x) {
        return x.pekerjaId === p.id && x.tgl === tglA;
      });
      if (ab && ab.status && !statusHadir(ab.status).bekerja) {
        peringatan.push(I18N.t('{nama} hari ini tercatat {status}.')
          .replace('{nama}', p.nama)
          .replace('{status}', I18N.t(statusHadir(ab.status).nama).toLowerCase()));
      }
    }
    var isi = (baris || []).filter(function (b) {
      return b && b.stokId && Math.round(Number(b.jumlah) || 0) > 0;
    });
    if (!isi.length) return { error: I18N.t('Belum ada barang yang diisi jumlahnya.') };

    var berhasil = 0, gagal = [];
    isi.forEach(function (b) {
      var n = Math.round(Number(b.jumlah) || 0);
      var r = catatMutasi(b.stokId, -n, 'keluar',
        opsi.catatan || I18N.t('Diambil untuk troli'), oleh, opsi.areaId || null,
        { lokasiId: opsi.lokasiId || null, pekerjaId: pekerjaId || null });
      if (r.error) {
        var x = stokSatu(b.stokId);
        gagal.push((x ? x.nama : b.stokId) + ': ' + r.error);
        return;
      }
      berhasil++;
    });
    return { ok: true, berhasil: berhasil, gagal: gagal, peringatan: peringatan };
  }

  /**
   * Isi ulang satu dispenser.
   *
   * Berbeda dari pengambilan troli: ini terjadi pada SATU BENDA, dan
   * jumlahnya bulat. Ia satu-satunya pemakaian yang bisa dicatat per tugas
   * tanpa menebak apa pun — dan karena objeknya tercatat, kelak ia bisa
   * menjawab "dispenser mana yang paling cepat habis".
   */
  function isiUlang(stokId, objekId, jumlah, oleh, opsi) {
    opsi = opsi || {};
    var o = objekSatu(objekId);
    if (!o) return { error: I18N.t('Objek tidak ditemukan.') };
    var n = Math.round(Number(jumlah) || 0);
    if (n <= 0) return { error: I18N.t('Isi jumlah lebih dari nol.') };
    return catatMutasi(stokId, -n, 'keluar',
      opsi.catatan || (I18N.t('Isi ulang') + ' ' + o.nama), oleh, o.areaId,
      { lokasiId: opsi.lokasiId || null, pekerjaId: opsi.pekerjaId || null,
        objekId: o.id });
  }

  /**
   * Pemakaian per petugas sebulan terakhir.
   *
   * Lensa yang baru bisa ada setelah pengambilan tercatat atas nama orang.
   * Yang dicari BUKAN siapa yang paling banyak memakai — petugas yang
   * memegang dua lantai memang memakai dua kali lipat — melainkan siapa yang
   * menyimpang dari rekannya PADA JENIS AREA YANG SAMA. Karena itu angkanya
   * disajikan bersama jumlah tugas selesai, bukan sendirian.
   */
  function pemakaianPetugas(korporatId, hari) {
    var batas = U.iso(U.addDays(new Date(), -(hari || 30)));
    var stokPeta = {};
    stok(korporatId).forEach(function (x) { stokPeta[x.id] = x; });

    var per = {};
    DB.where('mcsStokMutasi', function (m) {
      return m.korporatId === korporatId && m.pekerjaId &&
             adalahPemakaian(m) && String(m.pada).slice(0, 10) >= batas;
    }).forEach(function (m) {
      var x = stokPeta[m.stokId];
      var o = per[m.pekerjaId] || (per[m.pekerjaId] = {
        pekerjaId: m.pekerjaId, nilai: 0, jml: 0, barang: {}
      });
      var n = Math.abs(m.jumlah);
      o.jml += n;
      o.nilai += n * ((x && Number(x.harga)) || 0);
      o.barang[m.stokId] = (o.barang[m.stokId] || 0) + n;
    });

    return Object.keys(per).map(function (pid) {
      var o = per[pid];
      var p = pekerjaSatu(pid);
      o.pekerja = p;
      o.nama = p ? p.nama : I18N.t('tidak dikenal');
      return o;
    }).sort(function (a, b) { return b.nilai - a.nilai; });
  }

  /* ====================================================== OPNAME GUDANG

     Menghitung barang secara fisik lalu mencocokkannya dengan catatan.
     Ini bukan kemewahan: saldo aplikasi hanya sebaik catatan yang
     memasukinya, dan barang yang diambil tanpa dicatat tidak meninggalkan
     jejak apa pun kecuali sebagai selisih pada hari opname.

     TIDAK MENIMPA, MELAINKAN MENCATAT SELISIH

     Cara termudah adalah menulis angka fisik langsung ke saldo. Cara itu
     ditolak: saldo di sini SELALU hasil penjumlahan riwayat, dan menimpanya
     berarti ada satu angka yang tidak bisa ditelusuri asalnya. Yang dicatat
     adalah selisihnya, sebagai mutasi berjenis 'opname' — sehingga setahun
     kemudian masih bisa dijawab pertanyaan "kenapa stoknya turun dua puluh
     pada bulan Maret".

     LEMBARNYA DISIMPAN

     Berbeda dari kebanyakan hal di sini yang dihitung ulang tiap kali, hasil
     opname DISIMPAN. Ia dokumen yang ditandatangani dan diserahkan kepada
     orang lain, dan dokumen yang sudah diserahkan tidak boleh berubah
     bentuknya ketika data di belakangnya bergeser.
     ==================================================================== */

  /** Lembar hitung: saldo aplikasi saat ini untuk seluruh barang. */
  function lembarOpname(korporatId) {
    return stok(korporatId).map(function (x) {
      return { stokId: x.id, nama: x.nama, satuan: x.satuan,
               sistem: x.saldo, harga: Number(x.harga) || 0 };
    });
  }

  /**
   * Simpan hasil opname.
   *
   * `baris` = [{ stokId, fisik }]. Barang yang TIDAK disebutkan dianggap
   * belum dihitung dan dilewati — bukan dianggap nol. Opname separuh gudang
   * adalah hal biasa, dan menganggap sisanya nol akan menghapus stok yang
   * sebenarnya utuh.
   */
  function simpanOpname(korporatId, d, oleh) {
    d = d || {};
    var isi = Array.isArray(d.baris) ? d.baris : [];
    var peta = {};
    stok(korporatId).forEach(function (x) { peta[x.id] = x; });

    var baris = [], adaSelisih = 0;
    isi.forEach(function (b) {
      var x = peta[b.stokId];
      if (!x) return;
      /* Kosong berarti BELUM DIHITUNG, bukan nol. Dua hal yang sangat
         berbeda, dan membedakannya adalah seluruh gunanya kolom ini. */
      if (b.fisik === '' || b.fisik === null || b.fisik === undefined) return;
      var fisik = Math.max(0, Math.round(Number(b.fisik) || 0));
      var selisih = fisik - x.saldo;
      baris.push({ stokId: x.id, nama: x.nama, satuan: x.satuan,
                   sistem: x.saldo, fisik: fisik, selisih: selisih,
                   harga: Number(x.harga) || 0,
                   nilaiSelisih: selisih * (Number(x.harga) || 0),
                   alasan: String(b.alasan || '').trim() });
      if (selisih) adaSelisih++;
    });

    if (!baris.length) {
      return { error: I18N.t('Belum ada satu pun hitungan fisik yang diisi.') };
    }
    /* Selisih tanpa keterangan adalah selisih yang akan ditanyakan lagi
       bulan depan, dan tidak ada yang ingat jawabannya. Diminta sekali, di
       saat orangnya masih berdiri di depan raknya. */
    if (adaSelisih && !String(d.catatan || '').trim()) {
      return { error: I18N.t('Ada selisih — tuliskan keterangannya sebelum menyimpan.') };
    }

    var dok = DB.insert('mcsOpname', {
      korporatId: korporatId,
      pada: U.nowISO(),
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : '',
      catatan: String(d.catatan || '').trim(),
      baris: baris,
      jmlBarang: baris.length,
      jmlSelisih: adaSelisih,
      nilaiSelisih: baris.reduce(function (t, b) { return t + b.nilaiSelisih; }, 0)
    });

    /* Mutasi penyesuaian, satu per barang yang selisih. Nol tidak dicatat:
       riwayat yang penuh baris “tidak ada perubahan” akan membuat baris yang
       benar-benar berubah tenggelam. */
    baris.forEach(function (b) {
      if (!b.selisih) return;
      var m = catatMutasi(b.stokId, b.selisih, 'opname',
        (b.alasan || d.catatan || I18N.t('Penyesuaian opname')), oleh, null);
      if (m.ok) DB.update('mcsStokMutasi', m.mutasi.id, { opnameId: dok.id });
    });

    return { ok: true, opname: DB.find('mcsOpname', dok.id) };
  }

  function riwayatOpname(korporatId) {
    return DB.where('mcsOpname', function (o) { return o.korporatId === korporatId; })
      .sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); });
  }

  function statistikStok(korporatId) {
    var l = stok(korporatId);
    return {
      jenis: l.length,
      habis: l.filter(function (x) { return x.keadaan === 'habis'; }).length,
      menipis: l.filter(function (x) { return x.keadaan === 'menipis'; }).length,
      perluDibeli: l.filter(function (x) { return x.keadaan !== 'aman'; })
    };
  }

  /* ============================================ PEMASOK & NOTA PENERIMAAN

     Sebelum bagian ini ada, "barang masuk" hanyalah sebuah angka: +100.
     Tanpa dari siapa, tanpa nomor nota, tanpa harga saat itu, tanpa umur
     barangnya. Tiga akibatnya nyata dan ketiganya terlihat pada data
     gedung sungguhan yang pertama dimasukkan:

       · Harga hanya SATU angka terakhir di barangnya, jadi biaya bulan
         Maret dihitung memakai harga bulan Agustus.
       · Jenis mutasi 'kedaluwarsa' ada, tetapi tidak ada yang bisa
         memperingatkan SEBELUM jatuh tempo — ia hanya alat mencatat
         kerugian yang sudah terjadi.
       · Barang cacat yang dikembalikan ke pemasok terpaksa dicatat
         'rusak', sehingga terhitung sebagai uang yang menguap padahal
         uangnya kembali.

     Yang TIDAK dibangun di sini, dan sengaja: rak, bin, gelombang picking,
     pemesanan bertahap. Gudang bahan pembersih sebuah gedung adalah lemari,
     bukan pusat distribusi. Langkah tambahan yang tidak dipercaya orang
     akan dilewati, dan gudang yang catatannya dilewati lebih buruk
     daripada gudang tanpa catatan — karena yang pertama terlihat benar. */

  function pemasok(korporatId) {
    return DB.where('mcsPemasok', function (p) {
      return p.korporatId === korporatId;
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  function pemasokSatu(id) { return DB.find('mcsPemasok', id); }

  function tambahPemasok(korporatId, d) {
    var nama = String(d.nama || '').trim();
    if (!nama) return { error: I18N.t('Nama pemasok belum diisi.') };
    /* Nama kembar ditolak. Dua "CV Sinar Jaya" membuat riwayat pembelian
       terbelah dua dan harga rata-rata dihitung dari separuh datanya. */
    var kembar = pemasok(korporatId).filter(function (p) {
      return p.nama.toLowerCase() === nama.toLowerCase();
    })[0];
    if (kembar) {
      return { error: I18N.t('Pemasok "{v}" sudah terdaftar.').replace('{v}', nama) };
    }
    var p = DB.insert('mcsPemasok', {
      korporatId: korporatId, nama: nama,
      kontak: String(d.kontak || '').trim(),
      telepon: String(d.telepon || '').trim(),
      alamat: String(d.alamat || '').trim(),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true, pemasok: p };
  }

  function ubahPemasok(id, d) {
    var p = pemasokSatu(id);
    if (!p) return { error: I18N.t('Pemasok tidak ditemukan.') };
    var nama = String(d.nama || '').trim();
    if (!nama) return { error: I18N.t('Nama pemasok belum diisi.') };
    var kembar = pemasok(p.korporatId).filter(function (x) {
      return x.id !== id && x.nama.toLowerCase() === nama.toLowerCase();
    })[0];
    if (kembar) {
      return { error: I18N.t('Pemasok "{v}" sudah terdaftar.').replace('{v}', nama) };
    }
    DB.update('mcsPemasok', id, {
      nama: nama,
      kontak: String(d.kontak || '').trim(),
      telepon: String(d.telepon || '').trim(),
      alamat: String(d.alamat || '').trim(),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true };
  }

  /**
   * Pemasok yang sudah punya nota TIDAK bisa dihapus.
   *
   * Menghapusnya membuat nota-nota lama menunjuk ke ketiadaan, dan sebuah
   * nota tanpa pemasok adalah dokumen yang tidak bisa dipertanggungjawabkan
   * kepada siapa pun. Yang berhenti dipakai DINONAKTIFKAN — ia hilang dari
   * pilihan, tetapi riwayatnya utuh.
   */
  function hapusPemasok(id) {
    var pakai = DB.where('mcsTerima', function (t) { return t.pemasokId === id; }).length;
    if (pakai) {
      return { error: I18N.t('Pemasok ini dipakai {n} nota penerimaan. Nonaktifkan saja — riwayatnya harus tetap bisa dibaca.')
        .replace('{n}', pakai) };
    }
    DB.remove('mcsPemasok', id);
    return { ok: true };
  }

  /* ----------------------------------------------------- NOTA PENERIMAAN */

  function terima(korporatId) {
    return DB.where('mcsTerima', function (t) {
      return t.korporatId === korporatId;
    }).sort(function (a, b) {
      return String(b.tglTerima).localeCompare(String(a.tglTerima));
    });
  }

  function terimaSatu(id) { return DB.find('mcsTerima', id); }

  /** Baris sebuah nota ADALAH mutasinya. Tidak ada tabel baris tersendiri. */
  function barisTerima(terimaId) {
    return DB.where('mcsStokMutasi', function (m) {
      return m.terimaId === terimaId;
    }).sort(function (a, b) { return String(a.pada).localeCompare(String(b.pada)); });
  }

  function nilaiTerima(terimaId) {
    return barisTerima(terimaId).reduce(function (n, m) {
      return n + (Number(m.harga) || 0) * Number(m.jumlah || 0);
    }, 0);
  }

  /**
   * Simpan satu nota penerimaan beserta seluruh barisnya.
   *
   * DIPERIKSA SELURUHNYA DULU, baru ditulis. Nota yang separuh barisnya
   * masuk dan separuhnya gagal adalah keadaan yang paling sulit dibereskan
   * seseorang: saldonya berubah, notanya ada, tetapi isinya tidak sama
   * dengan kertas yang dipegangnya.
   */
  function simpanTerima(korporatId, d, oleh) {
    var isi = (d.baris || []).filter(function (b) {
      return b && b.stokId && Math.round(Number(b.jumlah) || 0) > 0;
    });
    if (!isi.length) return { error: I18N.t('Belum ada barang yang diisi jumlahnya.') };

    var salah = [];
    isi.forEach(function (b) {
      var x = stokSatu(b.stokId);
      if (!x) { salah.push(I18N.t('Barang tidak ditemukan.')); return; }
      if (x.korporatId !== korporatId) {
        salah.push(x.nama + ': ' + I18N.t('bukan milik korporat ini'));
      }
      /* Kedaluwarsa yang sudah lewat ditolak di sini. Barang yang diterima
         hari ini dengan tanggal kedaluwarsa kemarin bukan salah ketik yang
         bisa dibiarkan — ia akan langsung muncul di daftar peringatan dan
         membuat seluruh daftar itu berhenti dipercaya. */
      if (b.kedaluwarsa && String(b.kedaluwarsa) < U.iso(new Date())) {
        salah.push(x.nama + ': ' +
          I18N.t('tanggal kedaluwarsa sudah lewat'));
      }
    });
    if (salah.length) return { error: salah.join('; ') };

    var t = DB.insert('mcsTerima', {
      korporatId: korporatId,
      pemasokId: d.pemasokId || null,
      lokasiId: d.lokasiId || null,
      noNota: String(d.noNota || '').trim(),
      tglNota: d.tglNota || null,
      tglTerima: d.tglTerima || U.iso(new Date()),
      catatan: String(d.catatan || '').trim(),
      olehId: oleh ? oleh.id : null,
      olehNama: oleh ? oleh.nama : '',
      pada: U.nowISO()
    });

    var berhasil = 0, gagal = [];
    isi.forEach(function (b) {
      var n = Math.round(Number(b.jumlah) || 0);
      var r = catatMutasi(b.stokId, n, 'masuk',
        b.catatan || d.noNota || I18N.t('Penerimaan barang'), oleh, null,
        { lokasiId: d.lokasiId || null, terimaId: t.id,
          harga: b.harga, kedaluwarsa: b.kedaluwarsa || null });
      if (r.error) {
        var x = stokSatu(b.stokId);
        gagal.push((x ? x.nama : b.stokId) + ': ' + r.error);
        return;
      }
      berhasil++;
      /* Harga TERAKHIR pada barangnya ikut diperbarui — itulah maknanya.
         Harga historis tetap hidup di mutasinya, dan itulah yang dipakai
         hargaRata(). */
      if (Number(b.harga) > 0) {
        DB.update('mcsStok', b.stokId, {
          harga: Math.max(0, Math.round(Number(b.harga)))
        });
      }
    });

    DB.save(true);
    return { ok: true, terima: t, berhasil: berhasil, gagal: gagal };
  }

  /**
   * Kembalikan barang ke pemasok.
   *
   * Ditulis sebagai mutasi 'retur' yang menunjuk nota asalnya, BUKAN dengan
   * menghapus atau mengurangi baris nota. Nota adalah dokumen yang sudah
   * ada di tangan orang lain; mengubahnya belakangan berarti dua pihak
   * memegang dua kertas berbeda dengan nomor yang sama.
   */
  function returTerima(terimaId, baris, oleh) {
    var t = terimaSatu(terimaId);
    if (!t) return { error: I18N.t('Nota penerimaan tidak ditemukan.') };
    var isi = (baris || []).filter(function (b) {
      return b && b.stokId && Math.round(Number(b.jumlah) || 0) > 0;
    });
    if (!isi.length) return { error: I18N.t('Belum ada barang yang diisi jumlahnya.') };

    /* Tidak boleh mengembalikan lebih banyak daripada yang diterima pada
       nota ini, dikurangi yang sudah pernah dikembalikan. */
    var diterima = {}, dikembalikan = {};
    barisTerima(terimaId).forEach(function (m) {
      var n = Number(m.jumlah) || 0;
      if (n > 0) diterima[m.stokId] = (diterima[m.stokId] || 0) + n;
      else dikembalikan[m.stokId] = (dikembalikan[m.stokId] || 0) + Math.abs(n);
    });

    var salah = [];
    isi.forEach(function (b) {
      var x = stokSatu(b.stokId);
      var sisa = (diterima[b.stokId] || 0) - (dikembalikan[b.stokId] || 0);
      var n = Math.round(Number(b.jumlah) || 0);
      if (n > sisa) {
        salah.push((x ? x.nama : b.stokId) + ': ' +
          I18N.t('nota ini hanya menyisakan {n} yang bisa dikembalikan')
            .replace('{n}', sisa));
      }
    });
    if (salah.length) return { error: salah.join('; ') };

    var berhasil = 0, gagal = [];
    isi.forEach(function (b) {
      var n = Math.round(Number(b.jumlah) || 0);
      var r = catatMutasi(b.stokId, -n, 'retur',
        I18N.t('Retur nota') + ' ' + (t.noNota || t.id), oleh, null,
        { lokasiId: t.lokasiId || null, terimaId: terimaId });
      if (r.error) {
        var x = stokSatu(b.stokId);
        gagal.push((x ? x.nama : b.stokId) + ': ' + r.error);
        return;
      }
      berhasil++;
    });

    DB.save(true);
    return { ok: true, berhasil: berhasil, gagal: gagal };
  }

  /* --------------------------------------------------- HARGA RATA-RATA

     Rata-rata BERTIMBANG dari harga yang sungguh dibayar, bukan harga
     terakhir. Seratus botol seharga 20.000 lalu sepuluh botol seharga
     30.000 memberi rata-rata 20.909 — bukan 30.000, yang akan menaikkan
     nilai seluruh gudang delapan belas persen atas dasar satu pembelian
     kecil yang kebetulan paling akhir.

     Mengembalikan null bila belum ada satu pun penerimaan berharga. Null
     BUKAN nol: pemanggilnya harus jatuh kembali ke harga terakhir dan
     mengatakan di layar bahwa itu yang sedang dipakai. */
  function hargaRata(stokId, sampai) {
    var batas = sampai || null;
    var jml = 0, nilai = 0;
    DB.where('mcsStokMutasi', function (m) {
      return m.stokId === stokId && m.jenis === 'masuk' &&
             Number(m.harga) > 0 && Number(m.jumlah) > 0 &&
             (!batas || String(m.pada).slice(0, 10) <= batas);
    }).forEach(function (m) {
      jml += Number(m.jumlah);
      nilai += Number(m.jumlah) * Number(m.harga);
    });
    if (!jml) return null;
    return { harga: Math.round(nilai / jml), jumlah: jml, nilai: Math.round(nilai) };
  }

  /**
   * Harga yang dipakai menghitung nilai, beserta ASALNYA.
   *
   * Asal disebutkan supaya layar bisa mengatakannya. Angka yang datang dari
   * nota dan angka yang datang dari isian tangan tampil serupa, dan yang
   * tampil serupa akan sama-sama dipercaya.
   */
  function hargaPakai(stokId, sampai) {
    var r = hargaRata(stokId, sampai);
    if (r) return { harga: r.harga, dasar: 'nota' };
    var x = stokSatu(stokId);
    return { harga: x ? Number(x.harga) || 0 : 0, dasar: 'terakhir' };
  }

  /* ------------------------------------------------------- KEDALUWARSA

     Berapa banyak dari tiap kiriman yang MASIH ADA, diperkirakan dengan
     anggapan FEFO — yang paling dekat kedaluwarsa dipakai lebih dulu.

     Ini PERKIRAAN, dan harus disebut begitu: aplikasi tidak tahu botol
     yang mana yang diambil petugas. Anggapan FEFO adalah anggapan yang
     paling murah hati terhadap gudangnya. Gudang yang tidak merotasi
     barangnya punya lebih banyak barang berisiko daripada yang tertera di
     sini, bukan lebih sedikit — jadi angka ini batas bawah, bukan
     kepastian. */
  function kiriman(korporatId) {
    /* DITELUSURI MENURUT URUTAN WAKTU, bukan sekadar dijumlahkan.

       Percobaan pertama menjumlahkan seluruh pengeluaran lalu
       membagikannya ke kiriman-kiriman menurut urutan kedaluwarsa saja.
       Salah, dan ketahuan pada layar sungguhan: sekiriman pembersih
       toilet yang baru datang HARI INI, bertanggal kedaluwarsa paling
       dekat, menyerap empat puluh sembilan botol yang habis BULAN LALU
       — lalu tampil sudah habis, dan hilang dari daftar peringatan
       justru pada hari ia paling perlu diperingatkan.

       Pemakaian hanya boleh mengambil dari kiriman yang SUDAH DATANG
       ketika pemakaian itu terjadi. Karena itu seluruh mutasi diurutkan
       menurut waktu, lalu dijalankan satu per satu: yang masuk membuka
       kiriman, yang keluar mengambil dari kiriman terbuka yang paling
       dekat kedaluwarsanya. */
  /* Kapan sebuah baris berdiri di dalam urutan waktu.

     Nota yang DIMUNDURKAN — kiriman minggu lalu yang baru sempat diketik
     hari ini — dikembalikan ke tanggalnya. Kalau tidak, pemakaian minggu
     ini tampak terjadi sebelum barangnya ada.

     Nota yang diketik pada HARI YANG SAMA dengan kedatangannya tetap
     memakai jam pencatatannya. Memaksanya ke pukul 00:00 membuat kiriman
     yang baru datang menyerap seluruh pemakaian yang dicatat sesudahnya
     hari itu juga — terlihat saat diuji: sekiriman pembersih toilet yang
     tiba hari ini tampil bersisa NOL sementara halaman stok menunjukkan
     77 botol di gudang. Dua angka yang saling menyangkal pada satu layar
     membuat orang berhenti memercayai keduanya, dan yang salah di situ
     bukan datanya melainkan tebakan urutan yang tidak pernah kita punya
     buktinya. Bila tidak tahu urutannya, pakai bukti yang ada: jam
     pencatatan. */
    function kapan(m) {
      if (m.terimaId) {
        var t = terimaSatu(m.terimaId);
        if (t && t.tglTerima && String(t.tglTerima) < String(m.pada).slice(0, 10)) {
          return String(t.tglTerima) + 'T00:00:00.000Z';
        }
      }
      return String(m.pada);
    }
    var urut = DB.where('mcsStokMutasi', function (m) {
      return m.korporatId === korporatId && Number(m.jumlah) !== 0;
    }).sort(function (a, b) {
      return kapan(a).localeCompare(kapan(b));
    });

    var buka = {};   /* stokId -> daftar kiriman yang masih ada sisanya */

    urut.forEach(function (m) {
      var n = Number(m.jumlah);
      if (!buka[m.stokId]) buka[m.stokId] = [];
      if (n > 0) {
        /* Setiap penambahan membuka kiriman — termasuk penyesuaian opname
           dan perpindahan masuk, yang tidak bertanggal. Kalau tidak, stok
           yang lahir dari opname tidak punya asal, dan pemakaian sesudahnya
           akan menggerogoti kiriman bertanggal yang sebenarnya tidak
           dipakai. */
        buka[m.stokId].push({
          mutasi: m, sisa: n, diterima: n,
          kedaluwarsa: (m.jenis === 'masuk' && m.kedaluwarsa) || null
        });
        return;
      }
      /* Yang keluar mengambil dari yang paling dekat kedaluwarsa lebih
         dulu. Tanpa tanggal = paling akhir: bukan karena ia awet,
         melainkan karena ia tidak bisa diperingatkan, dan menghabiskannya
         lebih dulu di atas kertas akan menyembunyikan barang bertanggal
         yang sungguh berisiko. */
      var perlu = Math.abs(n);
      buka[m.stokId].sort(function (a, b) {
        var ka = a.kedaluwarsa || '9999-12-31';
        var kb = b.kedaluwarsa || '9999-12-31';
        if (ka !== kb) return ka.localeCompare(kb);
        return String(a.mutasi.pada).localeCompare(String(b.mutasi.pada));
      });
      buka[m.stokId].forEach(function (b) {
        if (perlu <= 0 || b.sisa <= 0) return;
        var ambil = Math.min(b.sisa, perlu);
        b.sisa -= ambil; perlu -= ambil;
      });
      /* Sisa `perlu` yang tak tertutup berarti catatan lama yang tidak
         punya pasangan barang masuk — dibiarkan, bukan dipaksakan ke
         kiriman bertanggal. */
    });

    var out = [];
    Object.keys(buka).forEach(function (sid) {
      buka[sid].forEach(function (b) {
        if (!b.kedaluwarsa) return;
        out.push({
          mutasi: b.mutasi, stokId: sid, stok: stokSatu(sid),
          kedaluwarsa: b.kedaluwarsa,
          diterima: b.diterima, sisa: b.sisa,
          lokasiId: b.mutasi.lokasiId || null,
          terimaId: b.mutasi.terimaId || null,
          /* Berapa hari lagi. Negatif berarti SUDAH lewat. */
          hari: U.diffDays(b.kedaluwarsa, new Date())
        });
      });
    });
    return out.sort(function (a, b) {
      return String(a.kedaluwarsa).localeCompare(String(b.kedaluwarsa));
    });
  }

  /**
   * Yang perlu diurus sekarang: sudah lewat, atau tinggal beberapa hari.
   *
   * Yang SISANYA NOL tidak disebut. Kiriman yang sudah habis tidak menjadi
   * masalah hanya karena tanggalnya lewat — dan daftar peringatan yang
   * memuat barang yang sudah tidak ada adalah daftar yang akan ditutup
   * orang tanpa dibaca.
   */
  function akanKedaluwarsa(korporatId, hari) {
    var amb = hari === undefined ? 60 : hari;
    return kiriman(korporatId).filter(function (k) {
      return k.sisa > 0 && k.hari <= amb;
    });
  }

  /* ===================================================== INSPEKSI MUTU */

  /**
   * Catat satu inspeksi.
   *
   * Penilai disimpan sebagai pengguna aplikasi (staf korporat), BUKAN
   * sebagai petugas kebersihan. Itu bukan kelalaian: inspeksi yang diisi
   * orang yang mengerjakan bukan inspeksi, melainkan pengakuan sendiri
   * dengan nama lain.
   */
  function buatInspeksi(areaId, d, oleh) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var skor = Number(d && d.skor);
    if (!(skor >= 1 && skor <= 5)) return { error: I18N.t('Pilih tingkat kebersihannya dulu.') };

    var x = DB.insert('mcsInspeksi', {
      korporatId: a.korporatId, areaId: a.id,
      tgl: (d && d.tgl) || U.today(),
      pada: U.nowISO(),
      skor: skor,
      catatan: String((d && d.catatan) || '').trim(),
      foto: ((d && d.foto) || []).slice(),
      /* Petugas yang sedang bertanggung jawab atas area itu, bila diketahui.
         Dicatat untuk menelusuri pola — bukan untuk menghukum satu orang
         atas ruangan yang memang tidak pernah cukup waktunya. */
      pekerjaId: (d && d.pekerjaId) || null,
      olehId: oleh ? oleh.id : null, olehNama: oleh ? oleh.nama : ''
    });
    return { ok: true, inspeksi: x };
  }

  function inspeksi(korporatId, opsi) {
    opsi = opsi || {};
    var l = DB.where('mcsInspeksi', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (opsi.areaId && x.areaId !== opsi.areaId) return false;
      if (opsi.dari && x.tgl < opsi.dari) return false;
      if (opsi.sampai && x.tgl > opsi.sampai) return false;
      return true;
    });
    return l.sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); });
  }

  function hapusInspeksi(id) {
    var x = DB.find('mcsInspeksi', id);
    if (x) (x.foto || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsInspeksi', id);
    return { ok: true };
  }

  /**
   * Rata-rata skor per area pada satu rentang.
   *
   * Area yang BELUM PERNAH diinspeksi dikembalikan dengan skor null, bukan
   * dilewati. Ketiadaan penilaian adalah temuan tersendiri — area yang tak
   * pernah diperiksa justru yang paling mungkin bermasalah.
   */
  function mutuArea(korporatId, dari, sampai) {
    var l = inspeksi(korporatId, { dari: dari, sampai: sampai });
    var per = {};
    l.forEach(function (x) {
      var v = per[x.areaId] || (per[x.areaId] = { areaId: x.areaId, n: 0, jumlah: 0, terakhir: null });
      v.n++; v.jumlah += x.skor;
      if (!v.terakhir || x.pada > v.terakhir.pada) v.terakhir = x;
    });
    return area(korporatId).map(function (a) {
      var v = per[a.id];
      return { areaId: a.id, nama: a.nama, n: v ? v.n : 0,
        rata: v ? Math.round(v.jumlah / v.n * 10) / 10 : null,
        /* JUMLAH skor mentah ikut dikembalikan, bukan hanya rata-ratanya.
           LOKASI.ringkas() menjumlahkan skor beberapa area menjadi skor satu
           gedung, dan menjumlahkan RATA-RATA menghasilkan angka yang salah
           kecuali tiap area punya jumlah inspeksi yang sama persis.

           Sebelum ini baris itu membaca m.jumlah yang memang tidak pernah
           ada di sini: hasilnya undefined, dan 'jumSkor += undefined' menjadi
           NaN. Tujuh puluh empat gedung berinspeksi menampilkan skor NaN di
           portofolio — tanpa satu pun galat, karena NaN mengalir diam-diam
           sampai ke layar. */
        jumlah: v ? v.jumlah : 0,
        terakhir: v ? v.terakhir : null };
    }).sort(function (p, q) {
      /* Yang belum pernah dinilai ditaruh paling bawah, bukan dianggap
         sempurna: null bukan nol. */
      if (p.rata == null && q.rata == null) return 0;
      if (p.rata == null) return 1;
      if (q.rata == null) return -1;
      return q.rata - p.rata;
    });
  }

  function statistikMutu(korporatId, dari, sampai) {
    var l = inspeksi(korporatId, { dari: dari, sampai: sampai });
    var belum = area(korporatId).filter(function (a) {
      return !l.some(function (x) { return x.areaId === a.id; }); }).length;
    return {
      jumlah: l.length,
      rata: l.length ? Math.round(l.reduce(function (s, x) { return s + x.skor; }, 0) / l.length * 10) / 10 : null,
      buruk: l.filter(function (x) { return x.skor >= 4; }).length,
      areaBelumDinilai: belum
    };
  }

  /* ========================================================= ADUAN */

  /**
   * Catat aduan dari penghuni.
   *
   * Pelapor TIDAK diwajibkan menyebut nama. Gedung perkantoran penuh orang
   * yang enggan mengadu karena takut dianggap rewel oleh pengelola, dan
   * aduan anonim yang masuk lebih berguna daripada aduan bernama yang tidak
   * pernah dikirim. Yang WAJIB hanyalah areanya — tanpa itu tidak ada yang
   * bisa ditindaklanjuti.
   */
  function buatAduan(areaId, d) {
    var a = areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    d = d || {};
    if (!String(d.teks || '').trim() && !(d.foto || []).length) {
      return { error: I18N.t('Tuliskan masalahnya, atau lampirkan foto.') };
    }
    var g = genting(d.genting).kode;
    var c = config();
    var menit = (c.slaMenit && c.slaMenit[g]) || 120;
    var kini = new Date();

    var x = DB.insert('mcsAduan', {
      korporatId: a.korporatId, areaId: a.id,
      genting: g,
      teks: String(d.teks || '').trim(),
      foto: (d.foto || []).slice(),
      /* Nama dan kontak boleh kosong. Yang mengisi biasanya ingin dikabari
         hasilnya — dan itu satu-satunya alasan kolomnya ada. */
      pelapor: String(d.pelapor || '').trim(),
      kontak: String(d.kontak || '').trim(),
      pada: U.nowISO(),
      /* Batas waktu DIBEKUKAN saat aduan masuk, bukan dihitung ulang dari
         pengaturan yang berlaku hari ini. Korporat yang melonggarkan SLA
         bulan depan tidak boleh membuat aduan bulan lalu terlihat tepat
         waktu surut ke belakang. */
      slaMenit: menit,
      jatuhTempo: new Date(kini.getTime() + menit * 60000).toISOString(),
      status: 'baru',
      pekerjaId: null, catatanPetugas: '',
      olehId: null, olehNama: '',
      selesaiAt: null,
      diteruskanKe: []
    });
    teruskanAduan(x, a);
    return { ok: true, aduan: aduanSatu(x.id), area: a };
  }

  /**
   * Teruskan aduan ke petugas yang bertanggung jawab.
   *
   * Hanya yang cukup genting, dan hanya kepada orang yang benar-benar bisa
   * menanganinya hari ini — penanggungArea() sudah membuang yang sedang tidak
   * bekerja dan menggantinya dengan penggantinya.
   *
   * Kegagalan mengirim TIDAK membatalkan aduannya. Aduan yang hilang karena
   * nomor WhatsApp petugas kosong adalah kerugian dua kali.
   */
  function teruskanAduan(x, a) {
    var c = config();
    var ambang = { mendesak: 3, biasa: 2, ringan: 1 };
    if (!ambang[c.teruskanAduan]) return;
    if ((ambang[x.genting] || 0) < ambang[c.teruskanAduan]) return;
    if (!window.WA) return;

    var g = genting(x.genting);
    var tujuan = penanggungArea(a.id, String(x.pada).slice(0, 10));
    var terkirim = [];
    tujuan.forEach(function (p) {
      if (!p.telp) return;
      /* Nomor tujuan masuk lewat `params`, bukan argumen terpisah:
         WA.enqueue membacanya dari sana. Petugas korporat sebagian belum
         punya akun, jadi userId boleh null — nomornya yang menentukan. */
      WA.enqueue('mcs_aduan', p.userId || null, {
        pekerjaNama: p.nama, pekerjaTelp: p.telp,
        areaNama: a.nama, gedung: a.gedung, lantai: a.lantai,
        gentingNama: I18N.t(g.nama), ikon: g.ikon, teks: x.teks,
        batas: menitTerbaca(x.slaMenit)
      }, { tipe: 'mcsAduan', id: x.id });
      terkirim.push(p.id);
    });
    /* Tidak ada yang bisa dikirimi bukan berarti tidak ada yang perlu tahu.
       Aduan mendesak yang tidak sampai ke siapa pun — semua penanggungnya
       sedang absen tanpa pengganti, atau tak seorang pun punya nomor —
       ditandai supaya staf melihatnya, bukan dibiarkan menunggu jam habis
       dengan tenang. */
    DB.update('mcsAduan', x.id, {
      diteruskanKe: terkirim,
      tidakTersampaikan: terkirim.length ? false : true
    });
  }

  /** '2 jam 30 menit' dari 150 — untuk pesan yang dibaca manusia. */
  function menitTerbaca(menit) {
    var m = Math.max(0, Math.round(menit || 0));
    var j = Math.floor(m / 60), s = m % 60;
    if (!j) return m + ' ' + I18N.t('menit');
    return j + ' ' + I18N.t('jam') + (s ? ' ' + s + ' ' + I18N.t('menit') : '');
  }

  function aduan(korporatId, opsi) {
    opsi = opsi || {};
    var l = DB.where('mcsAduan', function (x) { return x.korporatId === korporatId; });
    if (!opsi.semua) l = l.filter(function (x) { return x.status !== 'selesai' && x.status !== 'ditutup'; });
    /* Terbaru dulu, tetapi yang MELEWATI batas waktu naik ke atas apa pun
       umurnya: yang sudah terlambat itulah yang butuh dilihat lebih dulu. */
    var kini = U.nowISO();
    return l.sort(function (p, q) {
      var lp = (p.status === 'baru' || p.status === 'ditugaskan') && p.jatuhTempo < kini;
      var lq = (q.status === 'baru' || q.status === 'ditugaskan') && q.jatuhTempo < kini;
      if (lp !== lq) return lp ? -1 : 1;
      return String(q.pada).localeCompare(String(p.pada));
    });
  }

  function aduanSatu(id) { return DB.find('mcsAduan', id); }

  /** Sisa waktu menuju batas, dalam menit. Negatif berarti sudah lewat. */
  function sisaSLA(x) {
    if (!x || !x.jatuhTempo) return null;
    if (x.status === 'selesai' || x.status === 'ditutup') {
      /* Yang sudah selesai dinilai dari KAPAN ia selesai, bukan dari jam
         sekarang — kalau tidak, setiap aduan lama akan terlihat gagal. */
      var s = x.selesaiAt || x.pada;
      return Math.round((new Date(x.jatuhTempo) - new Date(s)) / 60000);
    }
    return Math.round((new Date(x.jatuhTempo) - new Date()) / 60000);
  }

  function ubahAduan(id, patch, oleh) {
    var x = aduanSatu(id);
    if (!x) return { error: I18N.t('Aduan tidak ditemukan.') };
    var isi = {};
    ['genting', 'pekerjaId', 'catatanPetugas', 'status'].forEach(function (f) {
      if (patch[f] !== undefined) isi[f] = patch[f];
    });
    if (isi.status === 'selesai' || isi.status === 'ditutup') {
      isi.selesaiAt = x.selesaiAt || U.nowISO();
      isi.olehId = oleh ? oleh.id : null;
      isi.olehNama = oleh ? oleh.nama : '';
    }
    /* Dibuka kembali berarti belum selesai — jam selesainya ikut dihapus,
       kalau tidak laporan bulanan menghitungnya dua kali. */
    if (isi.status === 'baru' || isi.status === 'ditugaskan') {
      isi.selesaiAt = null;
    }
    DB.update('mcsAduan', id, isi);
    return { ok: true, aduan: aduanSatu(id) };
  }

  /** Ringkasan aduan untuk beranda dan laporan. */
  function statistikAduan(korporatId) {
    var semua = DB.where('mcsAduan', function (x) { return x.korporatId === korporatId; });
    var kini = U.nowISO();
    var terbuka = semua.filter(function (x) {
      return x.status === 'baru' || x.status === 'ditugaskan'; });
    return {
      total: semua.length,
      terbuka: terbuka.length,
      baru: semua.filter(function (x) { return x.status === 'baru'; }).length,
      lewatSLA: terbuka.filter(function (x) { return x.jatuhTempo < kini; }).length,
      selesai: semua.filter(function (x) { return x.status === 'selesai'; }).length
    };
  }

  function statistik(korporatId, tanggal) {
    var t = tugasHari(korporatId, tanggal || U.today());
    function n(s) { return t.filter(function (x) { return x.status === s; }).length; }
    var selesai = n('selesai');
    return {
      total: t.length, selesai: selesai, lewat: n('lewat'),
      /* `terlewat` = hari yang sudah lalu dan tidak pernah ditandai. Sempat
         tertinggal di sini dan membuat penjumlahan di layar jadi NaN — angka
         yang salah masih bisa dibaca, NaN tidak. */
      terlewat: n('terlewat'),
      terlambat: n('terlambat'), jatuhTempo: n('jatuhTempo'), akan: n('akan'),
      persen: t.length ? Math.round(selesai / t.length * 100) : 0,
      area: area(korporatId).length, pekerja: pekerja(korporatId).length,
      jadwal: jadwal(korporatId).length
    };
  }

  /** Rekap beberapa hari terakhir — untuk grafik dan penilaian kinerja. */
  /**
   * Rekap satu bulan penuh — bahan laporan yang diserahkan korporat kepada
   * pemilik gedung atau penyewanya.
   *
   * Dihitung ulang setiap dibuka, TIDAK disimpan. Laporan yang dibekukan
   * akan menyimpang dari datanya begitu satu tugas lama dilengkapi bukti
   * fotonya — dan dua angka berbeda untuk bulan yang sama menghancurkan
   * kepercayaan pada seluruh laporan.
   *
   * @param bulan 1–12 (bukan indeks JavaScript — laporan dibaca manusia)
   */
  function rekapBulan(korporatId, tahun, bulan) {
    var awal = new Date(tahun, bulan - 1, 1);
    var akhir = new Date(tahun, bulan, 0);          /* hari terakhir bulan itu */
    var iniHariIni = U.today();

    var hari = [], perArea = {}, perPetugas = {};
    var total = 0, selesai = 0, terlewat = 0, berbukti = 0, berfoto = 0;

    for (var d = new Date(awal); d <= akhir; d.setDate(d.getDate() + 1)) {
      var tgl = U.iso(d);
      /* Hari yang belum terjadi TIDAK dihitung. Memasukkannya sebagai nol
         membuat laporan bulan berjalan selalu terlihat gagal separuh. */
      if (tgl > iniHariIni) break;
      var t = tugasHari(korporatId, tgl);
      var s = 0;
      t.forEach(function (x) {
        /* JAM yang belum tiba juga tidak dihitung — penjaga di atas sudah
           melakukannya untuk HARI, dengan alasan yang sama persis, tetapi
           berhenti di batas hari.

           Akibatnya laporan bulan berjalan yang dibuka pagi hari menghukum
           seluruh gedung atas pekerjaan sore: pada pukul 07.36 sebuah area
           berjadwal 16.00 tertulis '0/1 = 0%', dan 844 dari 1.049 area
           terbaca gagal. Yang belum boleh dikerjakan tidak boleh dihitung
           sebagai tidak dikerjakan. */
        if (x.status === 'akan') return;
        total++;
        var rec = catatanSlot(x.jadwalId, x.tgl, x.jam);
        var kelar = x.status === 'selesai';
        if (kelar) { selesai++; s++; }
        if (x.status === 'terlewat') terlewat++;
        if (kelar && rec && rec.pindaiId) berbukti++;
        if (kelar && rec && (rec.sesudah || []).length) berfoto++;

        var ak = x.area ? x.area.id : '-';
        var A = perArea[ak] || (perArea[ak] = { nama: x.area ? x.area.nama : '—',
          total: 0, selesai: 0, terlewat: 0 });
        A.total++; if (kelar) A.selesai++; if (x.status === 'terlewat') A.terlewat++;

        /* Dihitung menurut yang MENGERJAKAN bila disebutkan, bukan menurut
           yang dijadwalkan — kalau tidak, petugas pengganti tidak pernah
           muncul di laporan mana pun sementara yang absen terlihat rajin. */
        var pid = (rec && rec.pekerjaId) || (x.pekerja && x.pekerja.id) || '-';
        var pn = pid === '-' ? '—' : ((pekerjaSatu(pid) || {}).nama || '—');
        var P = perPetugas[pid] || (perPetugas[pid] = { nama: pn, total: 0, selesai: 0 });
        P.total++; if (kelar) P.selesai++;
      });
      hari.push({ tgl: tgl, total: t.length, selesai: s,
                  persen: t.length ? Math.round(s / t.length * 100) : 0 });
    }

    /* ---- aduan pada rentang yang sama ---- */
    var dari = U.iso(awal), sampai = U.iso(akhir);
    var ad = DB.where('mcsAduan', function (x) {
      var t = String(x.pada).slice(0, 10);
      return x.korporatId === korporatId && t >= dari && t <= sampai;
    });
    var adSelesai = ad.filter(function (x) { return x.status === 'selesai'; });
    var adTepat = adSelesai.filter(function (x) { return sisaSLA(x) >= 0; });

    function urut(o) {
      return Object.keys(o).map(function (kk) {
        var v = o[kk];
        v.persen = v.total ? Math.round(v.selesai / v.total * 100) : 0;
        return v;
      }).sort(function (a, b) { return a.persen - b.persen; });
    }

    return {
      tahun: tahun, bulan: bulan, dari: dari, sampai: sampai,
      hariTerhitung: hari.length,
      total: total, selesai: selesai, terlewat: terlewat,
      persen: total ? Math.round(selesai / total * 100) : 0,
      /* Dua angka yang sering dikira sama padahal berbeda: berapa yang
         DILAPORKAN selesai, dan berapa yang selesainya bisa DIBUKTIKAN. */
      berbukti: berbukti,
      persenBukti: selesai ? Math.round(berbukti / selesai * 100) : 0,
      berfoto: berfoto,
      persenFoto: selesai ? Math.round(berfoto / selesai * 100) : 0,
      hari: hari, area: urut(perArea), petugas: urut(perPetugas),
      mutu: statistikMutu(korporatId, dari, sampai),
      mutuArea: mutuArea(korporatId, dari, sampai),
      aduan: {
        total: ad.length, selesai: adSelesai.length,
        tepatWaktu: adTepat.length,
        persenSLA: adSelesai.length ? Math.round(adTepat.length / adSelesai.length * 100) : 0,
        terbuka: ad.filter(function (x) {
          return x.status === 'baru' || x.status === 'ditugaskan'; }).length
      }
    };
  }

  function rekap(korporatId, hari) {
    hari = hari || 7;
    var out = [];
    for (var i = hari - 1; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var tgl = U.iso(d);
      var t = tugasHari(korporatId, tgl);
      var s = t.filter(function (x) { return x.status === 'selesai'; }).length;
      out.push({ tgl: tgl, total: t.length, selesai: s,
                 persen: t.length ? Math.round(s / t.length * 100) : 0 });
    }
    return out;
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    JENIS_PEKERJA: JENIS_PEKERJA, jenisPekerja: jenisPekerja,
    JENIS_AREA: JENIS_AREA, jenisArea: jenisArea, HARI: HARI,
    OBJEK_BAKU: OBJEK_BAKU, objekBaku: objekBaku,
    semua: semua, korporat: korporat, korporatUser: korporatUser, stafKorporat: stafKorporat,
    tambahStaf: tambahStaf, ubahStaf: ubahStaf,
    wilayahKorporat: wilayahKorporat,
    buatKorporat: buatKorporat, JENIS_USAHA: JENIS_USAHA, tanpaKlien: tanpaKlien, buatSandiSementara: buatSandiSementara,
    simpanProfil: simpanProfil, kelengkapan: kelengkapan,
    pekerja: pekerja, pekerjaSatu: pekerjaSatu, tambahPekerja: tambahPekerja,
    ubahPekerja: ubahPekerja, hapusPekerja: hapusPekerja, jadwalPekerja: jadwalPekerja,
    semuaPekerja: semuaPekerja, semuaJadwal: semuaJadwal,
    area: area, areaSatu: areaSatu, tambahArea: tambahArea, ubahArea: ubahArea,
    lokasiDariLantai: lokasiDariLantai,
    hapusArea: hapusArea, jadwalArea: jadwalArea,
    jadwal: jadwal, jadwalSatu: jadwalSatu, tambahJadwal: tambahJadwal, ubahJadwal: ubahJadwal,
    SIKLUS: SIKLUS, siklus: siklus, jatuhBerkala: jatuhBerkala,
    jedaJadwal: jedaJadwal, hapusJadwal: hapusJadwal, slotJadwal: slotJadwal,
    tambahFotoArea: tambahFotoArea, hapusFotoArea: hapusFotoArea,
    langkahArea: langkahArea, tambahLangkah: tambahLangkah, ubahLangkah: ubahLangkah,
    hapusLangkah: hapusLangkah, geserLangkah: geserLangkah, progresLangkah: progresLangkah,
    setLangkahTugas: setLangkahTugas, fotoLangkah: fotoLangkah,
    simpanFotoLangkah: simpanFotoLangkah, hapusFotoLangkah: hapusFotoLangkah,
    ruangPenyimpanan: ruangPenyimpanan,
    JABATAN: JABATAN, jabatan: jabatan,
    SHIFT: SHIFT, shiftJenis: shiftJenis, HARI: HARI,
    menitJam: menitJam, dalamJam: dalamJam,
    wilayahKerja: wilayahKerja, bentrokJadwal: bentrokJadwal,
    tim: tim, timSatu: timSatu, tambahTim: tambahTim, ubahTim: ubahTim,
    hapusTim: hapusTim, anggotaTim: anggotaTim,
    periksaAtasan: periksaAtasan, bawahan: bawahan, rantaiKomando: rantaiKomando,
    areaPekerja: areaPekerja,
    buatAkunPetugas: buatAkunPetugas, resetSandiPetugas: resetSandiPetugas,
    cabutAkunPetugas: cabutAkunPetugas, aktifkanAkunPetugas: aktifkanAkunPetugas,
    akunPetugas: akunPetugas, pekerjaDariUser: pekerjaDariUser,
    slotPerMinggu: slotPerMinggu, bebanPetugas: bebanPetugas,
    areaTanpaPenanggung: areaTanpaPenanggung, penanggungArea: penanggungArea,
    saranJadwal: saranJadwal,
    HADIR: HADIR, statusHadir: statusHadir,
    absensiHari: absensiHari, tandaiHadir: tandaiHadir,
    BUKTI_ABSENSI: BUKTI_ABSENSI, buktiAbsensi: buktiAbsensi,
    pindaiPekerjaHari: pindaiPekerjaHari,
    sedangBekerja: sedangBekerja, yangSedangBekerja: yangSedangBekerja,
    ketidakhadiran: ketidakhadiran, statistikAbsensi: statistikAbsensi,
    SATUAN: SATUAN, SATUAN_ISI: SATUAN_ISI, cakupan: cakupan,
    JENIS_BAHAN: JENIS_BAHAN, jenisBahan: jenisBahan,
    rencanaBelanja: rencanaBelanja,
    rekomendasiBahan: rekomendasiBahan,
    lingkupDariRiwayat: lingkupDariRiwayat, perkiraan: perkiraan,
    JENIS_MUTASI: JENIS_MUTASI, jenisMutasi: jenisMutasi,
    ambilBarang: ambilBarang, isiUlang: isiUlang,
    pemakaianPetugas: pemakaianPetugas,
    saldoPerLokasi: saldoPerLokasi, saldoDiLokasi: saldoDiLokasi,
    pindahStok: pindahStok,
    lembarOpname: lembarOpname, simpanOpname: simpanOpname,
    riwayatOpname: riwayatOpname,
    adalahPemakaian: adalahPemakaian, adalahKehilangan: adalahKehilangan,
    stok: stok, stokSatu: stokSatu, saldoStok: saldoStok,
    tambahStok: tambahStok, ubahStok: ubahStok, hapusStok: hapusStok,
    catatMutasi: catatMutasi, mutasiStok: mutasiStok, statistikStok: statistikStok,
    MUTU: MUTU, mutu: mutu,
    buatInspeksi: buatInspeksi, inspeksi: inspeksi, hapusInspeksi: hapusInspeksi,
    mutuArea: mutuArea, statistikMutu: statistikMutu,
    GENTING: GENTING, genting: genting,
    buatAduan: buatAduan, aduan: aduan, aduanSatu: aduanSatu,
    teruskanAduan: teruskanAduan,
    ubahAduan: ubahAduan, sisaSLA: sisaSLA, statistikAduan: statistikAduan,
    JENIS_OBJEK: JENIS_OBJEK, jenisObjek: jenisObjek, menitBaku: menitBaku,
    pemasok: pemasok, pemasokSatu: pemasokSatu, tambahPemasok: tambahPemasok,
    ubahPemasok: ubahPemasok, hapusPemasok: hapusPemasok,
    terima: terima, terimaSatu: terimaSatu, barisTerima: barisTerima,
    nilaiTerima: nilaiTerima, simpanTerima: simpanTerima, returTerima: returTerima,
    hargaRata: hargaRata, hargaPakai: hargaPakai,
    kiriman: kiriman, akanKedaluwarsa: akanKedaluwarsa,
    permukaanObjek: permukaanObjek, takaranObjek: takaranObjek,
    takaranBaku: takaranBaku, keMeter: keMeter,
    objek: objek, objekKorporat: objekKorporat, objekSatu: objekSatu,
    tambahObjek: tambahObjek, ubahObjek: ubahObjek, hapusObjek: hapusObjek,
    objekBelumDipindai: objekBelumDipindai, objekDariKode: objekDariKode,
    putarKode: putarKode, riwayatKode: riwayatKode, kodeLamaBerlaku: kodeLamaBerlaku,
    bakuKode: bakuKode,
    kodePindaiBaru: kodePindaiBaru, pastikanKode: pastikanKode,
    areaDariKode: areaDariKode, tautanTag: tautanTag, bacaTag: bacaTag,
    catatPindai: catatPindai, pindaiBerlaku: pindaiBerlaku,
    riwayatPindai: riwayatPindai, buktiKehadiran: buktiKehadiran,
    tugasHari: tugasHari, tandai: tandai, batalTandai: batalTandai,
    catatanSlot: catatanSlot, simpanFotoTugas: simpanFotoTugas, hapusFotoTugas: hapusFotoTugas,
    perluDiingatkan: perluDiingatkan, kirimPengingat: kirimPengingat,
    statistik: statistik, rekap: rekap, rekapBulan: rekapBulan
  };
})();
