/* ==========================================================================
   exo-zona.js — zona waktu per kota (milik EXOCLEAN App; diturunkan dari modul zona MCS, kini berdiri sendiri)
   --------------------------------------------------------------------------
   MASALAH YANG DIPECAHKAN

   Satu korporat bisa punya cabang di Medan, Makassar, dan Jayapura. Seluruh
   cap waktu di aplikasi ini disimpan sebagai ISO UTC — itu benar dan tidak
   diubah. Yang salah adalah cara menampilkannya: sampai berkas ini ada,
   setiap jam digambar memakai zona PERAMBAN YANG SEDANG MEMBUKA, sehingga

     · Admin di Jakarta membuka pemindaian yang dilakukan pukul 08.00 WIT di
       Jayapura, dan membacanya sebagai 06.00. Petugas yang datang tepat waktu
       terlihat datang dua jam terlalu awal.
     · Tugas berjadwal 06.30 di Makassar sudah lewat pada 06.31 WITA — tetapi
       aplikasi membandingkannya dengan jam Jakarta, dan baru menganggapnya
       lewat satu jam kemudian.
     · Dan yang paling halus: TANGGAL pun bisa berbeda. 25 Agustus pukul
       16.30 UTC adalah 25 Agustus 23.30 di Jakarta, tetapi sudah 26 Agustus
       01.30 di Jayapura. Laporan "hari ini" untuk cabang Jayapura yang
       dihitung memakai tanggal Jakarta membaca hari yang salah selama dua
       jam setiap malam.

   YANG DISIMPAN TETAP UTC

   Tidak satu pun cap waktu diubah. Zona hanya dipakai saat MENAMPILKAN dan
   saat MEMBANDINGKAN dengan jam dinding. Menyimpan waktu lokal berarti data
   yang tidak bisa dibandingkan antar cabang, dan tidak bisa diperbaiki bila
   zonanya ternyata salah diisi.

   KENAPA NAMA IANA, BUKAN ANGKA OFFSET

   Menyimpan "+7" lebih sederhana, dan cukup untuk Indonesia yang tidak
   mengenal daylight saving. Tetapi aplikasi ini sudah berbahasa dua puluh
   lebih, dan korporat pertama di luar Indonesia yang memakai offset akan
   mendapati seluruh jamnya meleset satu jam selama separuh tahun — cacat
   yang muncul sendiri di tanggal tertentu tanpa ada yang mengubah apa pun.
   `Intl` sudah membawa seluruh basis data zona; yang perlu disimpan hanya
   namanya.
   ========================================================================== */
var EXO_ZONA = (function () {
  'use strict';

  /* PINTASAN, BUKAN BATAS.

     Daftar ini sempat menjadi satu-satunya pilihan yang bisa diambil dari
     layar, dan dua belas zona terdengar cukup sampai dihitung: peramban
     mengenal 418. Yang tidak ada di sini tidak bisa dipilih siapa pun — dan
     yang pertama tersandung bukan korporat di benua lain, melainkan
     `Asia/Pontianak`, zona Indonesia yang terlewat dari daftar buatan
     tangan ini.

     Sekarang ia hanya kelompok teratas pada pemilihnya. Seluruh 418 zona
     IANA ikut ditawarkan di bawahnya, dikelompokkan per wilayah. */
  var DAFTAR = [
    { id: 'Asia/Jakarta',  nama: 'WIB — Waktu Indonesia Barat',
      kota: 'Jakarta, Medan, Palembang, Bandung, Semarang, Surabaya, Pontianak' },
    { id: 'Asia/Pontianak', nama: 'WIB — Kalimantan Barat',
      kota: 'Pontianak, Singkawang' },
    { id: 'Asia/Makassar', nama: 'WITA — Waktu Indonesia Tengah',
      kota: 'Makassar, Denpasar, Balikpapan, Banjarmasin, Manado, Mataram, Kupang' },
    { id: 'Asia/Jayapura', nama: 'WIT — Waktu Indonesia Timur',
      kota: 'Jayapura, Ambon, Ternate, Sorong, Merauke' },
    { id: 'Asia/Singapore', nama: 'Singapura', kota: 'Singapura' },
    { id: 'Asia/Kuala_Lumpur', nama: 'Malaysia', kota: 'Kuala Lumpur, Johor' },
    { id: 'Asia/Manila', nama: 'Filipina', kota: 'Manila, Cebu' },
    { id: 'Asia/Bangkok', nama: 'Thailand', kota: 'Bangkok' },
    { id: 'Asia/Ho_Chi_Minh', nama: 'Vietnam', kota: 'Ho Chi Minh, Hanoi' },
    { id: 'Asia/Dubai', nama: 'Uni Emirat Arab', kota: 'Dubai, Abu Dhabi' },
    { id: 'Asia/Riyadh', nama: 'Arab Saudi', kota: 'Riyadh, Jeddah' },
    { id: 'Australia/Sydney', nama: 'Australia Timur', kota: 'Sydney, Melbourne' },
    { id: 'UTC', nama: 'UTC', kota: '—' }
  ];

  /* Kota → zona, untuk MENGISIKAN saat cabang baru dibuat. Mengisikan, bukan
     memutuskan: yang menyimpan tetap orangnya, dan tebakan yang salah lebih
     mudah diperbaiki daripada kolom kosong yang tidak pernah diisi. */
  /* CADANGAN untuk alamat yang masih satu baris teks bebas. Bila alamatnya
     sudah terstruktur, pakai dariWilayah() — provinsi menentukan zona
     dengan pasti, sedangkan daftar nama kota di bawah ini selalu tidak
     lengkap dan yang tidak tercantum jatuh diam-diam ke WIB.

     Daftar ini SUDAH pernah salah, dan salahnya tidak berbunyi:
     Palangkaraya tercantum di kelompok WITA, padahal Kalimantan Tengah
     adalah WIB. Cabang di sana dinilai satu jam lebih cepat — setiap hari,
     tanpa satu pun galat — dan yang terlihat hanyalah petugas yang seolah
     selalu terlambat. Itulah alasan provinsi lebih dipercaya daripada nama
     kota di sini. */
  var TEBAK = [
    /* WIB, tetapi zonanya sendiri: Kalimantan Barat dan Kalimantan Tengah. */
    { re: /pontianak|singkawang|ketapang|sintang|sanggau|palangkaraya|palangka raya|sampit|pangkalan bun|muara teweh/i,
      id: 'Asia/Pontianak' },
    { re: /balikpapan|samarinda|banjarmasin|tarakan|bontang|makassar|ujung pandang|manado|gorontalo|palu|kendari|mamuju|denpasar|bali|mataram|kupang|maumere|ende|bima|singaraja|tabanan/i,
      id: 'Asia/Makassar' },
    { re: /jayapura|ambon|ternate|sorong|merauke|manokwari|timika|nabire|biak|tual|fakfak|halmahera/i,
      id: 'Asia/Jayapura' }
  ];

  /* =========================================== ZONA DARI ALAMAT RESMI
     Batas ketiga zona waktu Indonesia mengikuti batas PROVINSI, bukan nama
     kota. Karena alamat kini terstruktur, provinsinya diketahui — dan
     jawabannya menjadi PASTI, bukan tebakan.

     Bandingkan dengan tebakDariKota() di bawah: daftar nama kota selalu
     tidak lengkap, dan yang tidak ada di dalamnya jatuh diam-diam ke WIB.
     Sebuah cabang di kota Papua yang namanya tidak terdaftar akan dinilai
     dengan jam Jakarta — dua jam lebih awal — dan yang terlihat hanyalah
     petugas yang seolah terlambat setiap hari.

     Ke-38 provinsi ditulis LENGKAP dengan nama resminya. Bukan demi
     kerapian: yang tidak tercantum mengembalikan '' — tidak tahu — dan
     itulah yang benar. Menebak bagi provinsi yang terlewat berarti
     memasang jam yang salah tanpa ada yang tahu dari mana asalnya. */
  /* i18n:data */
  var PROVINSI_ZONA = {
    /* WIB */
    'Aceh': 'Asia/Jakarta',
    'Sumatera Utara': 'Asia/Jakarta',
    'Sumatera Barat': 'Asia/Jakarta',
    'Riau': 'Asia/Jakarta',
    'Kepulauan Riau': 'Asia/Jakarta',
    'Jambi': 'Asia/Jakarta',
    'Sumatera Selatan': 'Asia/Jakarta',
    'Kepulauan Bangka Belitung': 'Asia/Jakarta',
    'Bengkulu': 'Asia/Jakarta',
    'Lampung': 'Asia/Jakarta',
    'Banten': 'Asia/Jakarta',
    'Daerah Khusus Ibukota Jakarta': 'Asia/Jakarta',
    'Jawa Barat': 'Asia/Jakarta',
    'Jawa Tengah': 'Asia/Jakarta',
    'Daerah Istimewa Yogyakarta': 'Asia/Jakarta',
    'Jawa Timur': 'Asia/Jakarta',
    /* WIB juga, tetapi zonanya sendiri. Offsetnya memang sama dengan
       Jakarta; namanya berbeda karena riwayat waktunya berbeda, dan nama
       yang benar itulah yang bertahan bila aturannya suatu hari berubah. */
    'Kalimantan Barat': 'Asia/Pontianak',
    'Kalimantan Tengah': 'Asia/Pontianak',
    /* WITA */
    'Kalimantan Selatan': 'Asia/Makassar',
    'Kalimantan Timur': 'Asia/Makassar',
    'Kalimantan Utara': 'Asia/Makassar',
    'Sulawesi Utara': 'Asia/Makassar',
    'Sulawesi Tengah': 'Asia/Makassar',
    'Sulawesi Selatan': 'Asia/Makassar',
    'Sulawesi Tenggara': 'Asia/Makassar',
    'Sulawesi Barat': 'Asia/Makassar',
    'Gorontalo': 'Asia/Makassar',
    'Bali': 'Asia/Makassar',
    'Nusa Tenggara Barat': 'Asia/Makassar',
    'Nusa Tenggara Timur': 'Asia/Makassar',
    /* WIT */
    'Maluku': 'Asia/Jayapura',
    'Maluku Utara': 'Asia/Jayapura',
    'Papua': 'Asia/Jayapura',
    'Papua Barat': 'Asia/Jayapura',
    'Papua Barat Daya': 'Asia/Jayapura',
    'Papua Selatan': 'Asia/Jayapura',
    'Papua Tengah': 'Asia/Jayapura',
    'Papua Pegunungan': 'Asia/Jayapura'
  };
  /* i18n:/data */

  /* Alamat lama menyimpan nama pendek. Dicantumkan terpisah supaya tabel di
     atas tetap terbaca sebagai daftar resmi ke-38 provinsi — tidak bercampur
     dengan ejaan yang kebetulan pernah dipakai. */
  /* i18n:data */
  var PROVINSI_LAMA = {
    'DKI Jakarta': 'Asia/Jakarta',
    'DI Yogyakarta': 'Asia/Jakarta',
    'Daerah Khusus Jakarta': 'Asia/Jakarta',
    'Yogyakarta': 'Asia/Jakarta'
  };
  /* i18n:/data */

  /**
   * Zona waktu sebuah alamat terstruktur, atau '' bila tidak dapat
   * dipastikan.
   *
   * HANYA Indonesia. Negara lain memang punya jawaban, tetapi jawaban itu
   * ada di tabel yang belum ditulis di sini — dan menebaknya berarti
   * memasang jam yang salah pada cabang yang paling jauh dari yang bisa
   * memeriksanya. '' berarti “tidak tahu”, dan pilihannya dibiarkan pada
   * yang mengisi.
   */
  /**
   * ‘ WITA’ — berikut spasi di depannya — untuk ditempel di belakang jam.
   * Zona yang tidak diketahui menghasilkan '' , BUKAN sebuah tebakan.
   *
   * Ada di sini, bukan di tiap pemakainya. Sebelum ini label jam ditulis
   * langsung sebagai teks “WIB” di sebelas tempat berbeda — pesan WhatsApp,
   * pemberitahuan keamanan, tiga layar — dan sebelas salinan aturan yang
   * sama adalah sebelas tempat yang harus diingat ketika aturannya berubah.
   * Satu di antaranya pasti terlewat.
   */
  function labelJam(tz) { return tz ? ' ' + singkat(tz) : ''; }

  function dariWilayah(w) {
    if (!w || String(w.negara || 'ID') !== 'ID') return '';
    var p = String(w.l1 || '').trim();
    return PROVINSI_ZONA[p] || PROVINSI_LAMA[p] || '';
  }

  function tebakDariKota(kota) {
    var s = String(kota || '');
    for (var i = 0; i < TEBAK.length; i++) if (TEBAK[i].re.test(s)) return TEBAK[i].id;
    return 'Asia/Jakarta';
  }

  /* HASILNYA DISIMPAN. `new Intl.DateTimeFormat` bukan panggilan murah, dan
     sah() dipanggil sekali untuk setiap jadwal pada setiap hari yang disapu
     — halaman Portofolio menyapu tiga puluh hari atas 1.223 jadwal, jadi
     tiga puluh enam ribu pembentukan objek Intl untuk menjawab pertanyaan
     yang jawabannya sama setiap kali. Terukur: halaman berat melambat dari
     0,5 detik menjadi 3,9 detik sebelum penyimpanan ini dipasang.

     Aman disimpan tanpa kedaluwarsa: apakah sebuah nama zona dikenali
     peramban tidak berubah selama halaman terbuka. */
  var sahnya = {};
  function sah(tz) {
    if (!tz) return false;
    if (sahnya[tz] === undefined) {
      try { new Intl.DateTimeFormat('en', { timeZone: tz }); sahnya[tz] = true; }
      catch (e) { sahnya[tz] = false; }
    }
    return sahnya[tz];
  }

  /** Zona peramban yang sedang membuka — titik acuan “waktu saya”. */
  /* Disimpan: resolvedOptions() membentuk objek Intl setiap kali, dan zona
     perangkat tidak berubah selama halaman terbuka. */
  var tzPerangkat = null;
  function perangkat() {
    if (tzPerangkat) return tzPerangkat;
    try { tzPerangkat = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'; }
    catch (e) { tzPerangkat = 'Asia/Jakarta'; }
    return tzPerangkat;
  }

  /** Bawaan korporat; dipakai cabang yang zonanya belum diisi. */
  /* EXOCLEAN App tidak punya cabang; bawaannya zona perangkat. */
  function bawaan() { return perangkat(); }
  function lokasi() { return bawaan(); }
  function area() { return bawaan(); }

  /* Pembentuk Intl DISIMPAN. tugasHari memanggil pembanding jam ribuan kali
     dalam satu penggambaran, dan membuat Intl.DateTimeFormat baru tiap
     panggilan adalah salah satu cara paling mudah membuat halaman tergantung
     tanpa satu pun galat. */
  var simpanan = {};
  function bentuk(tz, opsi, kunci) {
    var k = tz + '|' + kunci;
    if (!simpanan[k]) {
      simpanan[k] = new Intl.DateTimeFormat(opsi.locale || 'en-GB',
        Object.assign({ timeZone: sah(tz) ? tz : 'UTC' }, opsi.o));
    }
    return simpanan[k];
  }

  /** "HH:MM" pada zona itu. */
  function jam(iso, tz) {
    if (!iso) return '';
    return bentuk(tz, { o: { hour: '2-digit', minute: '2-digit', hour12: false } }, 'jam')
      .format(new Date(iso));
  }

  /** "YYYY-MM-DD" pada zona itu — sepadan dengan U.iso(), tetapi di sana. */
  function tgl(iso, tz) {
    return bentuk(tz, { locale: 'en-CA',
      o: { year: 'numeric', month: '2-digit', day: '2-digit' } }, 'tgl')
      .format(iso ? new Date(iso) : new Date());
  }

  /** Tanggal hari ini MENURUT cabang itu, bukan menurut peramban. */
  function hariIni(tz) { return tgl(null, tz); }

  /** Menit sejak tengah malam di zona itu — untuk membandingkan jam jadwal. */
  function menitKini(tz) {
    var t = jam(new Date().toISOString(), tz).split(':');
    return (+t[0]) * 60 + (+t[1]);
  }

  /**
   * Singkatan yang dikenal orang setempat: WIB, WITA, WIT.
   *
   * Diambil dengan locale id-ID karena hanya di sanalah ketiganya punya nama.
   * Locale Inggris mengembalikan "GMT+7", yang benar tetapi tidak dikenali
   * siapa pun yang bekerja di gedungnya.
   */
  function singkat(tz) {
    try {
      var p = new Intl.DateTimeFormat('id-ID', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0];
      return p ? p.value : tz;
    } catch (e) { return tz || ''; }
  }

  /** Apakah zona ini sama dengan zona pembacanya — penentu perlu-tidaknya
      jam diberi keterangan zona. Jam tanpa keterangan yang ternyata milik
      zona lain lebih menyesatkan daripada jam yang tidak ditampilkan. */
  /* Disimpan PER MENIT, bukan selamanya. Dua zona yang jamnya sama bisa
     berpisah ketika salah satunya melewati tengah malam atau pergantian
     musim; menyimpannya selamanya membuat tanda zona hilang tepat pada
     malam ia paling dibutuhkan. Semenit cukup: pemanggilnya ribuan kali
     dalam satu penggambaran, dan tidak ada penggambaran yang berlangsung
     semenit. */
  var samanya = {}, samaMenit = null;
  function samaDenganPerangkat(tz) {
    if (!tz) return true;
    if (tz === perangkat()) return true;
    var m = Math.floor(Date.now() / 60000);
    if (samaMenit !== m) { samanya = {}; samaMenit = m; }
    if (samanya[tz] === undefined) {
      /* Nama berbeda belum tentu waktu berbeda: Asia/Pontianak dan
         Asia/Jakarta menunjuk jam yang sama persis. Yang dibandingkan
         hasilnya, bukan namanya. */
      var d = new Date().toISOString();
      samanya[tz] = jam(d, tz) === jam(d, perangkat()) &&
                    tgl(d, tz) === tgl(d, perangkat());
    }
    return samanya[tz];
  }

  /** Nama zona untuk ditampilkan di daftar pilihan. */
  function nama(tz) {
    var d = DAFTAR.filter(function (z) { return z.id === tz; })[0];
    return d ? d.nama : (tz || '');
  }

  /**
   * Seluruh zona yang dikenal peramban — standar IANA, berformat
   * Wilayah/Kota, yang memang cara dunia menamai zona waktu.
   *
   * Diambil dari peramban, bukan ditulis di sini. Daftar zona berubah
   * beberapa kali setahun ketika sebuah negara memindahkan jamnya, dan
   * salinan yang ditulis tangan akan basi tanpa ada yang menyadarinya —
   * sementara peramban memperbaruinya sendiri.
   *
   * Peramban lama yang belum punya supportedValuesOf mengembalikan daftar
   * pintasan saja. Itu lebih sempit, tetapi tidak ada yang rusak.
   */
  function semua() {
    try {
      if (typeof Intl.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone');
      }
    } catch (e) {}
    return DAFTAR.map(function (z) { return z.id; });
  }

  /**
   * Label satu zona pada pemilih: nama IANA, offsetnya sekarang, dan
   * singkatan setempat bila ada.
   *
   *     Asia/Makassar · GMT+8 · WITA
   *
   * Ketiganya perlu dan tidak saling menggantikan. Nama IANA-lah yang
   * dicari orang yang tahu apa yang dicarinya; offset yang dipahami orang
   * yang tidak; singkatan setempat yang dikenali orang di gedungnya sendiri.
   */
  function label(tz) {
    var sk = singkat(tz);
    var off = offset(tz);
    var t = tz + (off ? '  ·  ' + off : '');
    return (sk && sk !== off && sk !== tz) ? t + '  ·  ' + sk : t;
  }

  /** “GMT+8” pada zona itu, sekarang. Dihitung, bukan disimpan: sebuah zona
      bisa berpindah offset dua kali setahun. */
  function offset(tz) {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
        .formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0];
      return p ? p.value : '';
    } catch (e) { return ''; }
  }

  /**
   * Pilihan siap pakai untuk UI.field({type:'select'}) — pintasan di atas,
   * lalu seluruh zona dikelompokkan per wilayah.
   *
   * `awal` menjadi pilihan pertama tanpa kelompok (mis. “Ikut bawaan
   * korporat”), karena itulah yang dipilih sebagian besar orang dan ia tidak
   * pantas disembunyikan di bawah empat ratus baris.
   */
  function pilihan(awal) {
    var out = awal ? [awal] : [];
    var punya = {};
    out.push({ grup: 'Sering dipakai', options: DAFTAR.map(function (z) {
      punya[z.id] = 1;
      return { value: z.id, label: z.nama + '  ·  ' + offset(z.id) };
    }) });

    var perWilayah = {}, urutan = [];
    semua().forEach(function (tz) {
      var w = tz.indexOf('/') > 0 ? tz.slice(0, tz.indexOf('/')) : 'Lainnya';
      if (!perWilayah[w]) { perWilayah[w] = []; urutan.push(w); }
      perWilayah[w].push(tz);
    });
    urutan.sort().forEach(function (w) {
      out.push({ grup: w, options: perWilayah[w].map(function (tz) {
        return { value: tz, label: label(tz) };
      }) });
    });
    return out;
  }

  return {
    DAFTAR: DAFTAR, sah: sah, perangkat: perangkat, bawaan: bawaan,
    lokasi: lokasi, area: area, tebakDariKota: tebakDariKota,
    jam: jam, tgl: tgl, hariIni: hariIni, menitKini: menitKini,
    singkat: singkat, samaDenganPerangkat: samaDenganPerangkat, nama: nama,
    semua: semua, offset: offset, label: label, pilihan: pilihan,
    dariWilayah: dariWilayah, labelJam: labelJam
  };
})();
