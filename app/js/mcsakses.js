/* ==========================================================================
   mcsakses.js — hak akses staf korporat MCS
   --------------------------------------------------------------------------
   MASALAH YANG DIPECAHKAN

   Sampai berkas ini ada, `AKSES.bolehHalaman` memulangkan `true` untuk SETIAP
   halaman bagi peran `korporat`:

       if (['client','worker','seller','korporat','petugas'].indexOf(u.role) >= 0)
         return true;

   Alasannya masuk akal ketika ditulis — satu gedung, satu staf korporat, dan
   ia memang berhak atas seluruh datanya. Alasan itu berhenti berlaku pada
   perusahaan berjaringan: kepala cabang Surabaya tidak perlu melihat
   penggajian cabang Medan, dan auditor tidak boleh mengubah apa pun di mana
   pun.

   DUA HAL YANG DIBATASI, DAN KEDUANYA PERLU

     1. HALAMAN  — menu mana yang bisa dibuka.
     2. LOKASI   — cabang mana datanya terlihat.

   Membatasi halaman saja tidak cukup: kepala cabang yang boleh membuka
   halaman Penggajian akan melihat gaji seluruh Indonesia. Membatasi lokasi
   saja juga tidak cukup: leader regu tidak perlu halaman Kontrak sekalipun
   isinya hanya cabangnya sendiri.

   BATAS YANG HARUS DIKATAKAN, BUKAN DISEMBUNYIKAN

   Ini pembatasan ANTARMUKA di aplikasi yang seluruhnya berjalan di peramban.
   Siapa pun yang membuka Developer Tools bisa memanggil `DB` langsung dan
   membaca apa saja. Penjagaan yang sesungguhnya hanya bisa berdiri di server,
   dan server itu belum ada untuk data MCS.

   Yang berkas ini kerjakan tetap berguna dan tidak boleh diremehkan: ia
   mencegah orang tersandung ke tempat yang bukan urusannya, membuat menu
   setiap orang sesuai pekerjaannya, dan membuat "siapa boleh apa" menjadi
   pertanyaan yang ada jawabannya. Ia BUKAN penjagaan terhadap orang yang
   memang berniat menembus.
   ========================================================================== */
var MCSAKSES = (function () {
  'use strict';

  /* ------------------------------------------------------------ HALAMAN

     Dikelompokkan supaya peran bisa disusun dari kelompok, bukan dari dua
     puluh empat centang. Kelompok yang salah isi jauh lebih mudah terlihat
     daripada satu centang yang salah di antara dua puluh empat. */
  var KELOMPOK = [
    { kode: 'harian', nama: 'Pekerjaan harian', ikon: '🧹',
      ket: 'Yang disentuh tiap hari: kehadiran, aduan penghuni, ronda, dan tugas.',
      halaman: ['mcsBeranda', 'mcsAduan', 'mcsAbsensi', 'mcsRonda', 'mcsKerja'] },

    { kode: 'mutu', nama: 'Mutu & keselamatan', ikon: '🔍',
      ket: 'Inspeksi mutu, penilaian kinerja, dan pelatihan petugas.',
      halaman: ['mcsInspeksi', 'mcsKinerja', 'mcsLatih'] },

    { kode: 'susun', nama: 'Menyusun pekerjaan', ikon: '🗓️',
      ket: 'Jadwal, area yang dipantau, beban kerja, dan daftar petugas.',
      halaman: ['mcsJadwal', 'mcsArea', 'mcsBeban', 'mcsPekerja'] },

    { kode: 'barang', nama: 'Bahan & peralatan', ikon: '🧴',
      ket: 'Bahan habis pakai, penerimaan barang dari pemasok, dan peralatan.',
      halaman: ['mcsStok', 'mcsTerima', 'mcsAset'] },

    { kode: 'tempat', nama: 'Lokasi & bangunan', ikon: '🏙️',
      ket: 'Daftar cabang, areanya, bangunan, lantai, ruangan, dan objek.',
      halaman: ['mcsLokasi', 'mcsPortofolio'] },

    { kode: 'uang', nama: 'Keuangan', ikon: '💰',
      ket: 'Penggajian, tagihan, biaya kebersihan, dan kontrak. ' +
           'Kelompok yang paling sering tidak seharusnya dibuka semua orang.',
      halaman: ['mcsGaji', 'mcsTagihan', 'mcsBiaya', 'mcsKontrak'] },

    { kode: 'lapor', nama: 'Laporan & portal', ikon: '📈',
      ket: 'Laporan bulanan dan portal untuk pemilik gedung.',
      halaman: ['mcsLaporan', 'mcsPortal', 'mcsHirarki'] },

    { kode: 'perusahaan', nama: 'Profil perusahaan', ikon: '🏛️',
      ket: 'Data perusahaan dan pengaturan korporat.',
      halaman: ['mcsProfil'] }
  ];

  /* ------------------------------------------------------------- PERAN

     `tulis` dipisah dari daftar kelompok dengan sengaja. Auditor melihat
     SEMUA dan tidak boleh mengubah APA PUN — dan itu tidak bisa dinyatakan
     dengan daftar halaman, karena halaman yang sama dipakai membaca maupun
     mengubah.

     `semuaLokasi` juga dipisah: kepala cabang dan staf pusat boleh membuka
     kelompok halaman yang mirip, tetapi yang membedakan keduanya bukan
     halamannya melainkan seberapa jauh datanya terlihat. */
  var PERAN = [
    { kode: 'admin', nama: 'Admin Korporat', ikon: '👑', level: 1,
      ket: 'Seluruh halaman, seluruh cabang, dan satu-satunya yang boleh ' +
           'mengatur hak akses staf lain.',
      kelompok: '*', tulis: true, semuaLokasi: true, kelolaAkses: true },

    { kode: 'pusat', nama: 'Staf Pusat', ikon: '🏢', level: 2,
      ket: 'Seluruh cabang, seluruh halaman kecuali pengaturan hak akses.',
      kelompok: '*', tulis: true, semuaLokasi: true },

    /* AREA MANAGER berdiri di antara pusat dan kepala cabang: ia membawahi
       beberapa kepala cabang sekaligus.

       Jangkauannya TIDAK diturunkan otomatis dari daftar bawahannya,
       walaupun itu terdengar rapi. Jangkauan yang dihitung dari orang lain
       berubah diam-diam setiap kali seseorang pindah atau berhenti — dan
       orang yang tiba-tiba kehilangan separuh wilayahnya tidak akan pernah
       menemukan sebabnya. Daftarnya ditulis sendiri; tombol “ambil dari
       bawahan” hanya MENGISIKAN, tidak mengikat. */
    { kode: 'area', nama: 'Area Manager', ikon: '🗺️', level: 3,
      ket: 'Membawahi beberapa Kepala Cabang. Melihat seluruh cabang di ' +
           'wilayahnya beserta biaya, tagihan, dan laporannya — tetapi tidak ' +
           'penggajian, dengan alasan yang sama seperti Kepala Cabang.',
      kelompok: ['harian', 'mutu', 'susun', 'barang', 'tempat', 'lapor'],
      halamanTambahan: ['mcsBiaya', 'mcsTagihan'],
      tulis: true, semuaLokasi: false, membawahi: 'cabang' },

    { kode: 'cabang', nama: 'Kepala Cabang', ikon: '🔑', level: 4,
      ket: 'Hanya cabang yang ditugaskan kepadanya. Melihat biaya dan tagihan ' +
           'cabangnya, TIDAK melihat penggajian — daftar gaji rekan sekantor ' +
           'adalah hal yang paling cepat merusak suasana kerja.',
      kelompok: ['harian', 'mutu', 'susun', 'barang', 'tempat', 'lapor'],
      halamanTambahan: ['mcsBiaya', 'mcsTagihan'],
      tulis: true, semuaLokasi: false, atasan: 'area' },

    { kode: 'supervisor', nama: 'Supervisor', ikon: '🦺', level: 5,
      ket: 'Cabang yang ditugaskan. Menyusun jadwal, memeriksa mutu, dan ' +
           'mengurus bahan — tidak menyentuh keuangan.',
      kelompok: ['harian', 'mutu', 'susun', 'barang'],
      tulis: true, semuaLokasi: false },

    { kode: 'leader', nama: 'Leader Regu', ikon: '🔰', level: 6,
      ket: 'Cabang yang ditugaskan. Hanya pekerjaan harian dan mutu — ' +
           'yang ia butuhkan untuk memimpin regunya di lapangan.',
      kelompok: ['harian', 'mutu'],
      tulis: true, semuaLokasi: false },

    { kode: 'auditor', nama: 'Auditor', ikon: '🧾', level: 7,
      ket: 'MELIHAT seluruh cabang dan seluruh halaman, dan TIDAK BOLEH ' +
           'mengubah apa pun. Pemeriksa yang bisa mengubah bukan pemeriksa.',
      kelompok: '*', tulis: false, semuaLokasi: true }
  ];

  function peran(kode) {
    return PERAN.filter(function (p) { return p.kode === kode; })[0] || null;
  }

  /**
   * Peran seorang pengguna.
   *
   * Yang belum diberi peran DIANGGAP Admin Korporat. Terdengar longgar, dan
   * memang disengaja: seluruh akun korporat yang sudah ada dibuat sebelum
   * berkas ini, dan mengunci mereka menjadi peran paling sempit berarti satu
   * pagi ketika tidak seorang pun bisa membuka apa pun — termasuk halaman
   * untuk memperbaikinya.
   */
  function peranUser(u) {
    u = u || (window.APP && APP.user);
    if (!u || u.role !== 'korporat') return null;
    return peran(u.mcsPeran) || peran('admin');
  }

  /** Halaman yang boleh dibuka sebuah peran. */
  function halamanPeran(p) {
    if (!p) return [];
    var out = [];
    KELOMPOK.forEach(function (g) {
      if (p.kelompok === '*' || (p.kelompok || []).indexOf(g.kode) >= 0) {
        out = out.concat(g.halaman);
      }
    });
    (p.halamanTambahan || []).forEach(function (h) {
      if (out.indexOf(h) < 0) out.push(h);
    });
    return out;
  }

  function bolehHalaman(key, u) {
    var p = peranUser(u);
    if (!p) return true;   /* bukan staf korporat — bukan urusan berkas ini */
    /* Halaman hak akses TIDAK ikut kelompok mana pun. Menaruhnya di sebuah
       kelompok berarti ia bisa terbawa ke peran lain tanpa siapa pun
       bermaksud begitu — dan yang bisa membuka halaman ini bisa mengangkat
       dirinya sendiri. */
    if (key === 'mcsAkses') return !!p.kelolaAkses;
    return halamanPeran(p).indexOf(key) >= 0;
  }

  /** Apakah pengguna ini boleh MENGUBAH sesuatu sama sekali. */
  /**
   * LINGKUP YANG BELUM DIISI — dan kenapa ia menahan tulisan, bukan bacaan.
   *
   * lokasiUser() menafsirkan daftar cabang yang kosong sebagai SELURUHNYA,
   * dan untuk MEMBACA tafsir itu benar: kepala cabang yang lupa diberi
   * daftar akan melihat terlalu banyak dan segera mengeluh, sedangkan yang
   * tidak melihat apa-apa akan mengira aplikasinya rusak.
   *
   * Untuk MENULIS tafsir yang sama menjadi mahal. Sejak penyaringan cabang
   * ikut menentukan apa yang boleh diubah, seorang Area Manager yang
   * lingkupnya belum diisi bukan sekadar melihat 87 cabang — ia bisa
   * menghapus jadwal cabang mana pun, dan tidak satu pun penjaga akan
   * keberatan, karena “tanpa batas” adalah persis keadaan yang dilewati
   * semua pemeriksaan.
   *
   * Jadi bacaannya dibiarkan longgar dan tulisannya ditahan sampai
   * lingkupnya diisi. Yang tertahan akan bertanya; yang tidak tertahan
   * tidak akan pernah tahu ia sedang memegang seluruh Indonesia.
   *
   * Hanya berlaku bagi peran yang MEMANG dibatasi cabang. Admin, Staf
   * Pusat, dan Auditor ber-`semuaLokasi: true`: daftar kosong pada mereka
   * bukan kelalaian, itu memang artinya.
   */
  function lingkupBelumDiisi(u) {
    u = u || (window.APP && APP.user);
    var p = peranUser(u);
    if (!p || p.semuaLokasi) return false;
    return !((u && u.mcsLokasi) || []).length;
  }

  /**
   * Kenapa seseorang tidak boleh mengubah apa pun — atau null bila boleh.
   *
   * Mengembalikan SEBAB, bukan sekadar benar/salah, karena kedua sebabnya
   * menuntut perbuatan yang berbeda: yang satu memang perannya begitu dan
   * tidak ada yang perlu diperbaiki, yang lain adalah kelalaian pengaturan
   * yang harus diberitahukan kepada admin. Pesan yang menyamakan keduanya
   * membuat yang kedua tidak pernah diperbaiki.
   */
  function sebabTakBolehTulis(u) {
    u = u || (window.APP && APP.user);
    var p = peranUser(u);
    if (!p) return null;
    if (!p.tulis) {
      return { kode: 'peran',
        pesan: I18N.t('Peran {p} hanya boleh melihat, tidak mengubah.')
          .replace('{p}', I18N.t(p.nama)) };
    }
    if (lingkupBelumDiisi(u)) {
      return { kode: 'lingkup',
        pesan: I18N.t('Cabang yang Anda kelola belum diisi, jadi belum ada yang boleh diubah. Minta admin melengkapinya di Hak Akses.') };
    }
    return null;
  }

  function bolehTulis(u) { return !sebabTakBolehTulis(u); }

  function bolehKelolaAkses(u) {
    var p = peranUser(u);
    return p ? !!p.kelolaAkses : false;
  }

  /* -------------------------------------------------------------- LOKASI

     Kosong berarti SELURUHNYA, dan itu satu-satunya tafsir yang aman: seorang
     kepala cabang yang lupa diberi daftar cabang akan melihat semua, bukan
     tidak melihat apa-apa. Yang melihat terlalu banyak akan segera mengeluh;
     yang tidak melihat apa-apa akan mengira aplikasinya rusak. */
  function lokasiUser(u) {
    u = u || (window.APP && APP.user);
    var p = peranUser(u);
    if (!p || p.semuaLokasi) return null;             /* null = tanpa batas */
    var d = (u && u.mcsLokasi) || [];
    return d.length ? d.slice() : null;
  }

  function bolehLokasi(lokasiId, u) {
    var d = lokasiUser(u);
    if (!d) return true;
    return d.indexOf(lokasiId) >= 0;
  }

  /** Saring daftar lokasi menurut jangkauan pengguna. */
  function saringLokasi(daftar, u) {
    var d = lokasiUser(u);
    if (!d) return daftar;
    return (daftar || []).filter(function (l) { return d.indexOf(l.id) >= 0; });
  }

  /**
   * Saring daftar area menurut jangkauan pengguna.
   *
   * Area TANPA lokasiId ikut lolos. Ia data lama dari masa sebelum lokasi
   * ada, dan menyembunyikannya membuat area yang masih dijadwalkan lenyap
   * dari layar tanpa satu pun petunjuk kenapa.
   */
  function saringArea(daftar, u) {
    var d = lokasiUser(u);
    if (!d) return daftar;
    return (daftar || []).filter(function (a) {
      return !a.lokasiId || d.indexOf(a.lokasiId) >= 0;
    });
  }

  /**
   * Saring daftar PETUGAS menurut jangkauan pengguna.
   *
   * Seorang petugas boleh ditempatkan di lebih dari satu cabang, jadi yang
   * diperiksa adalah PERSINGGUNGAN: cukup satu cabangnya berada dalam
   * jangkauan. Petugas yang dipinjamkan antar cabang memang terlihat oleh
   * kedua kepala cabang, dan itu benar — keduanya sungguh perlu tahu.
   *
   * Petugas TANPA cabang sama sekali ikut lolos, dengan alasan yang persis
   * sama seperti area tanpa lokasiId di atas: ia data dari masa sebelum
   * lokasi ada, dan menyembunyikannya membuat orang yang masih dijadwalkan
   * lenyap dari layar tanpa satu pun petunjuk kenapa. Yang hilang diam-diam
   * jauh lebih mahal daripada yang terlihat berlebihan.
   */
  function saringPekerja(daftar, u) {
    var d = lokasiUser(u);
    if (!d) return daftar;
    return (daftar || []).filter(function (p) {
      var l = p.lokasiIds || [];
      if (!l.length) return true;
      return l.some(function (id) { return d.indexOf(id) >= 0; });
    });
  }

  /**
   * Cabang tempat sebuah peralatan berada.
   *
   * `mcsAset` TIDAK menyimpan lokasiId; yang disimpan areaId, dan areanya
   * yang tahu cabangnya. Bila areanya kosong — barang gudang yang belum
   * ditempatkan — pemegangnya yang menentukan: alat di tangan orang Medan
   * ada di Medan, betapa pun kolom areanya kosong.
   */
  function lokasiAset(x) {
    if (!x) return null;
    if (x.lokasiId) return x.lokasiId;
    if (x.areaId && window.MCS && MCS.areaSatu) {
      var a = MCS.areaSatu(x.areaId);
      if (a) {
        if (a.lokasiId) return a.lokasiId;
        if (a.lantaiId && MCS.lokasiDariLantai) return MCS.lokasiDariLantai(a.lantaiId);
      }
    }
    if (x.pemegangId && window.MCS && MCS.pekerjaSatu) {
      var p = MCS.pekerjaSatu(x.pemegangId);
      if (p) return (p.lokasiIds || [])[0] || null;
    }
    return null;
  }

  /** Saring daftar PERALATAN menurut jangkauan pengguna. Tanpa cabang yang
      bisa ditentukan, ikut lolos — alasan yang sama dengan saringPekerja. */
  function saringAset(daftar, u) {
    var d = lokasiUser(u);
    if (!d) return daftar;
    return (daftar || []).filter(function (x) {
      var l = lokasiAset(x);
      return !l || d.indexOf(l) >= 0;
    });
  }

  /**
   * Saring daftar JADWAL menurut jangkauan pengguna.
   *
   * Lewat AREANYA — sebuah jadwal berada di cabang tempat areanya berada.
   * Ini yang paling terasa: layar utama MCS menampilkan “Jadwal hari ini”,
   * dan tanpa penyaringan seorang kepala cabang dengan 8 dari 87 cabang
   * membuka halaman depannya dan membaca 1.745 tugas, 1.585 di antaranya
   * milik cabang yang bukan urusannya. Angka pencapaian di bawahnya pun
   * menjadi angka nasional yang dipakai menilai cabangnya sendiri.
   *
   * Jadwal yang areanya tidak ditemukan ikut lolos: ia sudah akan tersaring
   * sendiri di tugasHari(), yang membuang jadwal tanpa area — dan
   * membuangnya di sini akan menyembunyikan jadwal rusak dari satu-satunya
   * orang yang bisa memperbaikinya.
   */
  function saringJadwal(daftar, u) {
    var d = lokasiUser(u);
    if (!d) return daftar;
    if (!window.MCS || !MCS.areaSatu) return daftar;
    return (daftar || []).filter(function (j) {
      var a = MCS.areaSatu(j.areaId);
      if (!a) return true;
      var l = a.lokasiId ||
        (a.lantaiId && MCS.lokasiDariLantai ? MCS.lokasiDariLantai(a.lantaiId) : null);
      return !l || d.indexOf(l) >= 0;
    });
  }

  /* ------------------------------------------------------- BOLEH MENYENTUH

     Penyaringan di atas hanya mengatur APA YANG TERLIHAT. Layar yang
     menyembunyikan tetapi lapisan datanya menerima bukan pembatasan; ia
     hanya pembatasan sampai ada yang menebak sebuah id, membuka tautan
     lama, atau memanggilnya dari konsol. Yang membuat penyaringan berarti
     adalah penolakan di tempat data DITULIS.

     `oleh` yang kosong TIDAK ditolak. Ada pemanggil yang bukan manusia —
     penyemai data contoh, pemicu otomatis — dan menilai kewenangan orang
     yang tidak ada berarti mengarang jawaban. Yang tidak punya pelaku juga
     tidak punya batas yang bisa dilanggar. */

  function bolehPekerja(p, u) {
    if (!p) return true;
    var d = lokasiUser(u);
    if (!d) return true;
    var l = p.lokasiIds || [];
    if (!l.length) return true;
    return l.some(function (id) { return d.indexOf(id) >= 0; });
  }

  function bolehArea(a, u) {
    if (!a) return true;
    var d = lokasiUser(u);
    if (!d) return true;
    var l = a.lokasiId ||
      (a.lantaiId && window.MCS && MCS.lokasiDariLantai ? MCS.lokasiDariLantai(a.lantaiId) : null);
    return !l || d.indexOf(l) >= 0;
  }

  function bolehAset(x, u) {
    if (!x) return true;
    var d = lokasiUser(u);
    if (!d) return true;
    var l = lokasiAset(x);
    return !l || d.indexOf(l) >= 0;
  }

  /* ------------------------------------------------- ATASAN & BAWAHAN

     Hanya SATU tingkat: Kepala Cabang melapor kepada Area Manager. Rantai
     yang lebih panjang menggoda untuk dibuat, tetapi setiap tingkat
     tambahan menambah pertanyaan “siapa sebenarnya yang boleh memutuskan”
     tanpa menambah satu pun jawaban. */
  function bawahan(userId) {
    var u = DB.find('users', userId);
    if (!u) return [];
    return DB.all('users').filter(function (x) {
      return x.role === 'korporat' && x.korporatId === u.korporatId &&
             x.mcsAtasanId === userId && x.aktif !== false;
    });
  }

  function atasan(u) {
    return (u && u.mcsAtasanId) ? DB.find('users', u.mcsAtasanId) : null;
  }

  /** Calon atasan bagi sebuah peran — kosong bila perannya memang tidak
      melapor kepada siapa pun di dalam MCS. */
  function calonAtasan(korporatId, kodePeran) {
    var p = peran(kodePeran);
    if (!p || !p.atasan) return [];
    return DB.all('users').filter(function (x) {
      return x.role === 'korporat' && x.korporatId === korporatId &&
             x.aktif !== false &&
             (peranUser(x) || {}).kode === p.atasan;
    });
  }

  /** Gabungan cabang milik seluruh bawahan — untuk tombol “ambil dari
      bawahan”. Mengisikan, bukan mengikat: lihat catatan pada peran 'area'. */
  function lokasiBawahan(userId) {
    var out = {};
    bawahan(userId).forEach(function (x) {
      (x.mcsLokasi || []).forEach(function (id) { out[id] = 1; });
    });
    return Object.keys(out);
  }

  function pasangAtasan(userId, atasanId) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan.') };
    /* Lingkaran ditolak: A membawahi B yang membawahi A membuat setiap
       penelusuran struktur berputar selamanya. */
    if (atasanId && atasanId === userId) {
      return { error: I18N.t('Seseorang tidak bisa menjadi atasan dirinya sendiri.') };
    }
    if (atasanId) {
      var a = DB.find('users', atasanId);
      if (a && a.mcsAtasanId === userId) {
        return { error: I18N.t('Keduanya akan saling membawahi.') };
      }
    }
    DB.update('users', userId, { mcsAtasanId: atasanId || null });
    return { ok: true };
  }

  /* --------------------------------------------------- AKSI YANG MENGUBAH

     Kunci aksi di seluruh MCS berbentuk `xx-katakerja`: 'sk-baru',
     'op-simpan', 'as-hapus', 'im-jalan'. Kata kerjanya konsisten karena
     ditulis oleh satu tangan dalam satu bahasa, dan itulah yang membuat
     daftar di bawah bisa dipercaya.

     GAGALNYA MENGARAH KE MANA — ini yang menentukan bentuk daftarnya.
     Kata kerja yang TIDAK dikenali dibiarkan lewat, bukan ditahan. Auditor
     yang tidak bisa membuka rincian, mencetak, atau menyaring bukan auditor;
     ia hanya orang yang tidak bisa bekerja. Karena itu daftar ini memuat
     yang MENGUBAH, bukan yang boleh.

     Akibatnya jujur dan harus disebut: satu aksi pengubah dengan kata kerja
     baru yang lupa didaftarkan akan lolos. Ini pagar, bukan kunci — sama
     seperti seluruh berkas ini. */
  var KATA_UBAH = new RegExp('^(' + [
    'baru', 'tambah', 'add', 'simpan', 'ubah', 'edit', 'hapus', 'del',
    'buang', 'impor', 'jalan', 'terapkan', 'setuju', 'tolak', 'kirim',
    'catat', 'buat', 'pasang', 'opname', 'retur', 'ambil', 'massal',
    'pindah', 'isi', 'selesai', 'batal', 'lepas', 'rusak', 'servis',
    'serah', 'kembali', 'genting', 'kelola', 'set', 'atur', 'naik',
    'turun', 'aktif', 'nonaktif', 'salin', 'reset', 'ganti', 'mulai',
    'akhiri', 'tandai', 'verifikasi', 'nilai', 'slip', 'bayar', 'lunas'
  ].join('|') + ')');

  function aksiMengubah(kunci) {
    var i = String(kunci || '').indexOf('-');
    if (i < 0) return KATA_UBAH.test(String(kunci || ''));
    return KATA_UBAH.test(String(kunci).slice(i + 1));
  }

  /* ------------------------------------------------------------- PENUGASAN */

  function pasangPeran(userId, kode, lokasiIds) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan.') };
    if (u.role !== 'korporat') {
      return { error: I18N.t('Peran ini hanya untuk staf korporat.') };
    }
    var p = peran(kode);
    if (!p) return { error: I18N.t('Peran tidak dikenal.') };

    /* PENJAGA TERAKHIR: harus selalu tersisa satu Admin Korporat yang aktif.
       Tanpa ini, satu penurunan peran bisa membuat tidak seorang pun bisa
       membuka halaman hak akses lagi — dan tidak ada cara memperbaikinya
       dari dalam aplikasi. */
    if (u.mcsPeran === 'admin' && kode !== 'admin') {
      var sisa = DB.all('users').filter(function (x) {
        return x.role === 'korporat' && x.korporatId === u.korporatId &&
               x.aktif !== false && x.id !== userId &&
               (peran(x.mcsPeran) || peran('admin')).kode === 'admin';
      });
      if (!sisa.length) {
        return { error: I18N.t('Ini satu-satunya Admin Korporat yang tersisa. ' +
          'Angkat orang lain lebih dulu.') };
      }
    }

    DB.update('users', userId, {
      mcsPeran: kode,
      mcsLokasi: p.semuaLokasi ? [] : ((lokasiIds || []).slice())
    });
    if (window.KEAMANAN && KEAMANAN.catat) {
      KEAMANAN.catat(userId, 'Peran MCS diubah menjadi ' + p.nama, 'ok', '');
    }
    return { ok: true };
  }

  /** Ringkasan untuk layar: berapa orang memegang tiap peran. */
  function statistik(korporatId) {
    var staf = DB.all('users').filter(function (u) {
      return u.role === 'korporat' && u.korporatId === korporatId && u.aktif !== false;
    });
    return PERAN.map(function (p) {
      return { peran: p, jumlah: staf.filter(function (u) {
        return (peran(u.mcsPeran) || peran('admin')).kode === p.kode;
      }).length };
    });
  }

  return {
    KELOMPOK: KELOMPOK, PERAN: PERAN,
    peran: peran, peranUser: peranUser, halamanPeran: halamanPeran,
    bolehHalaman: bolehHalaman, bolehTulis: bolehTulis,
    bolehKelolaAkses: bolehKelolaAkses,
    lokasiUser: lokasiUser, bolehLokasi: bolehLokasi,
    saringLokasi: saringLokasi, saringArea: saringArea,
    saringPekerja: saringPekerja, saringAset: saringAset, lokasiAset: lokasiAset,
    saringJadwal: saringJadwal,
    bolehPekerja: bolehPekerja, bolehAset: bolehAset, bolehArea: bolehArea,
    lingkupBelumDiisi: lingkupBelumDiisi, sebabTakBolehTulis: sebabTakBolehTulis,
    aksiMengubah: aksiMengubah,
    bawahan: bawahan, atasan: atasan, calonAtasan: calonAtasan,
    lokasiBawahan: lokasiBawahan, pasangAtasan: pasangAtasan,
    pasangPeran: pasangPeran, statistik: statistik
  };
})();
