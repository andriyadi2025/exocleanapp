/* ==========================================================================
   keahlian.js — pemesanan jasa berbasis KEAHLIAN ORANG
   --------------------------------------------------------------------------
   BEDANYA DENGAN LAYANAN BIASA

   Layanan kebersihan dijual per meter, per unit, per titik: yang dibeli klien
   adalah HASIL, dan siapa yang mengerjakan boleh ditentukan penjadwal. Jasa
   keahlian sebaliknya — yang dibeli klien adalah ORANGNYA. Ia memilih juru
   masak tertentu setelah melihat wajah, nilai, dan rekam jejaknya. Karena itu
   pemesanan keahlian punya tiga hal yang tidak dimiliki alur biasa:

     1. HARGA DARI PEKERJAANNYA, BUKAN DARI LUASNYA.
        Juru masak dibayar menurut jenis masakan dan jumlah porsi. Sepuluh
        porsi rendang tidak sama dengan sepuluh porsi nasi goreng, dan tidak
        ada satuan "m²" yang bisa mewakili keduanya.

     2. ONGKOS JALAN DAN ASURANSI IKUT DIHITUNG.
        Mitra berangkat dari rumahnya sendiri ke tempat acara. Jaraknya nyata,
        biayanya nyata, dan menanggungkannya diam-diam ke mitra berarti mitra
        yang jauh selalu rugi. Keduanya dihitung dari titik alamat mitra ke
        titik lokasi acara — bukan ditebak, bukan diratakan.

     3. MITRA BERHAK MENOLAK, DENGAN BATAS WAKTU.
        Orang bukan barang di rak. Juru masak yang dipilih diberi tenggat untuk
        menerima atau menolak. Lewat tenggat, permintaan gugur sendiri dan
        klien memilih yang lain — supaya tidak ada klien yang menunggu semalam
        untuk jawaban yang tidak pernah datang.

   KENAPA TITIK ALAMAT WAJIB

   Transport dihitung dari koordinat. Mitra yang belum menandai titik alamatnya
   TIDAK ditawarkan untuk pekerjaan keahlian — bukan untuk menghukumnya,
   melainkan karena satu-satunya alternatif adalah menebak jaraknya, dan
   tebakan itu selalu jadi selisih yang ditanggung seseorang tanpa ia setujui.
   Mitra melihat alasannya di layarnya sendiri dan bisa langsung memperbaikinya.

   MITRA TIDAK MEMBAWA APA PUN

   Untuk juru masak, bahan dan alat masak disediakan klien. Ini bukan catatan
   kecil di bawah layar: klien yang tidak menyiapkan wajan akan punya juru
   masak yang berdiri tanpa bisa bekerja, dan keduanya sama-sama rugi. Karena
   itu `bawaAlat: false` ditampilkan sebagai peringatan yang harus dilewati,
   bukan sebagai keterangan yang mudah terlewat.
   ========================================================================== */
var KEAHLIAN = (function () {
  'use strict';

  var BAWAAN = {
    aktif: true,

    /* Tenggat mitra menjawab permintaan, dalam DETIK. Sengaja pendek: klien
       yang memesan juru masak untuk besok pagi tidak bisa menunggu berjam-jam
       untuk tahu apakah orangnya bisa. Bisa ditimpa per layanan. */
    responDetik: 60,

    /* Ongkos jalan mitra. `pulangPergi` mengalikan dua karena mitra pulang
       juga — perjalanan pulang tetap terjadi entah dibayar atau tidak. */
    transport: {
      aktif: true,
      perKm: 3500,
      minimum: 15000,
      pulangPergi: true,
      gratisRadiusKm: 0        /* di bawah ini tidak ditagih sama sekali */
    },

    /* Asuransi kerja mitra selama penugasan. Dihitung dari nilai pekerjaan
       karena itulah yang menentukan besar risikonya, dengan lantai supaya
       pekerjaan kecil tetap tertanggung. */
    asuransi: {
      aktif: true,
      persen: 1.5,
      minimum: 10000
    },

    biayaLayanan: 10000,       /* biaya tetap per pesanan, seperti PESAN */
    minPorsi: 1,
    tipAktif: true
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.keahlian) { s.keahlian = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.keahlian;
    /* Kunci baru yang muncul di versi berikutnya diisi dari bawaan, supaya
       pengaturan lama tidak kehilangan fitur baru tanpa pemberitahuan. */
    Object.keys(BAWAAN).forEach(function (k) {
      if (c[k] === undefined) { c[k] = JSON.parse(JSON.stringify(BAWAAN[k])); return; }
      if (BAWAAN[k] && typeof BAWAAN[k] === 'object' && !Array.isArray(BAWAAN[k])) {
        Object.keys(BAWAAN[k]).forEach(function (k2) {
          if (c[k][k2] === undefined) c[k][k2] = BAWAAN[k][k2];
        });
      }
    });
    return c;
  }

  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ================================================================ KATALOG */

  /** Layanan ini memakai alur keahlian. */
  function adalah(svc) { return !!(svc && svc.jenis === 'keahlian'); }

  /** Seluruh layanan keahlian yang sedang ditawarkan. */
  function katalog() {
    if (!config().aktif) return [];
    return DB.all('services').filter(function (s) {
      return adalah(s) && s.aktif !== false && menu(s).length;
    });
  }

  /**
   * Urutan hidangan dalam satu jamuan. Bukan sekadar label: klien menyusun
   * acara, dan acara punya urutan — pembuka lebih dulu, penutup paling akhir.
   * Daftar yang mencampur sup dan puding dalam satu tumpukan memaksa orang
   * memisahkannya sendiri di kepala.
   */
  var HIDANGAN = [
    { kode: 'pembuka', nama: 'Makanan Pembuka', ikon: '🥗', urut: 1 },
    { kode: 'utama',   nama: 'Makanan Utama',   ikon: '🍽️', urut: 2 },
    { kode: 'penutup', nama: 'Makanan Penutup', ikon: '🍰', urut: 3 }
  ];

  /**
   * Bahan baku utama. Bukan sekadar label: ia menentukan siapa yang boleh
   * memesannya (halal), apa yang harus disiapkan klien, dan belanja apa yang
   * perlu ia lakukan sebelum mitra datang.
   */
  var BAHAN = [
    { kode: 'sapi',     nama: 'Daging Sapi',      ikon: '🥩' },
    { kode: 'kambing',  nama: 'Daging Kambing',   ikon: '🐐' },
    { kode: 'domba',    nama: 'Daging Domba',     ikon: '🐑' },
    { kode: 'ayam',     nama: 'Ayam',             ikon: '🍗' },
    { kode: 'bebek',    nama: 'Bebek',            ikon: '🦆' },
    { kode: 'babi',     nama: 'Daging Babi',      ikon: '🐖', nonHalal: true },
    { kode: 'ikan',     nama: 'Ikan',             ikon: '🐟' },
    { kode: 'udang',    nama: 'Udang',            ikon: '🦐' },
    { kode: 'kerang',   nama: 'Cumi & Kerang',    ikon: '🦑' },
    { kode: 'telur',    nama: 'Telur',            ikon: '🥚' },
    { kode: 'tahutempe',nama: 'Tahu & Tempe',     ikon: '🫘' },
    { kode: 'sayur',    nama: 'Sayuran',          ikon: '🥦' },
    { kode: 'nasi',     nama: 'Nasi & Beras',     ikon: '🍚' },
    { kode: 'mi',       nama: 'Mi & Pasta',       ikon: '🍜' },
    { kode: 'susu',     nama: 'Susu & Keju',      ikon: '🧀' },
    { kode: 'kacang',   nama: 'Kacang-kacangan',  ikon: '🥜' },
    { kode: 'tepung',   nama: 'Tepung & Roti',    ikon: '🍞' },
    { kode: 'buah',     nama: 'Buah',             ikon: '🍓' },
    { kode: 'cokelat',  nama: 'Cokelat & Gula',   ikon: '🍫' },
    { kode: 'lainnya',  nama: 'Lainnya',          ikon: '🍽️' }
  ];

  function bahan(kode) {
    var r = null;
    BAHAN.forEach(function (b) { if (b.kode === kode) r = b; });
    return r || BAHAN[BAHAN.length - 1];
  }

  /* Tingkat pedas disebutkan di muka karena inilah keluhan paling sering
     terjadi pada katering, dan satu-satunya yang tidak bisa diperbaiki
     setelah makanannya tersaji. */
  var PEDAS = [
    { kode: 'tidak',  nama: 'Tidak pedas',  ikon: '' },
    { kode: 'sedang', nama: 'Pedas sedang', ikon: '🌶️' },
    { kode: 'pedas',  nama: 'Pedas',        ikon: '🌶️🌶️' },
    { kode: 'sangat', nama: 'Sangat pedas', ikon: '🌶️🌶️🌶️' }
  ];

  function pedas(kode) {
    var r = null;
    PEDAS.forEach(function (p) { if (p.kode === kode) r = p; });
    return r || PEDAS[0];
  }

  /**
   * Alergen yang wajib disebutkan.
   *
   * Ini bukan kolom pelengkap. Alergi kacang dan seafood bisa berakibat
   * fatal — kursus sertifikasi juru masak di aplikasi ini sendiri mengajarkan
   * hal itu. Menyimpannya di katalog berarti klien melihatnya SEBELUM memesan,
   * bukan mengandalkan ia ingat menuliskannya di kolom catatan.
   */
  var ALERGEN = [
    { kode: 'kacang',  nama: 'Kacang' },
    { kode: 'seafood', nama: 'Seafood' },
    { kode: 'telur',   nama: 'Telur' },
    { kode: 'susu',    nama: 'Susu' },
    { kode: 'gluten',  nama: 'Gluten' },
    { kode: 'kedelai', nama: 'Kedelai' },
    { kode: 'wijen',   nama: 'Wijen' }
  ];

  function alergenNama(kode) {
    var r = null;
    ALERGEN.forEach(function (a) { if (a.kode === kode) r = a; });
    return r ? r.nama : kode;
  }

  function hidangan(kode) {
    var r = null;
    HIDANGAN.forEach(function (h) { if (h.kode === kode) r = h; });
    /* Masakan lama yang belum punya penanda dianggap makanan utama — itu
       memang isinya sebelum sumbu ini ada. */
    return r || HIDANGAN[1];
  }

  /** Seluruh masakan APA ADANYA, termasuk yang sedang dijeda. Untuk admin. */
  function menuSemua(svc) {
    return ((svc && svc.keahlian && svc.keahlian.menu) || []).slice();
  }

  /** Masakan yang benar-benar ditawarkan ke klien. */
  function menu(svc) {
    return menuSemua(svc).filter(function (m) {
      return m && m.aktif !== false && (m.tarif || 0) > 0;
    });
  }

  /**
   * Menu dikelompokkan menurut NEGARA ASAL, urut sesuai urutan aslinya di
   * katalog — bukan diurut abjad. Urutan yang ditulis admin adalah urutan
   * yang ia maksud: yang paling sering dipesan diletakkan lebih dulu.
   */
  function perNegara(svc, semua) {
    var urut = [], peta = {};
    (semua ? menuSemua(svc) : menu(svc)).forEach(function (m) {
      var n = m.negara || 'Lainnya';
      if (!peta[n]) { peta[n] = { negara: n, ikon: m.ikon || '🍽️', masakan: [] }; urut.push(peta[n]); }
      peta[n].masakan.push(m);
    });

    /* Di dalam tiap negara, masakan dikelompokkan menurut urutan hidangannya. */
    urut.forEach(function (g) {
      var per = {}, susun = [];
      HIDANGAN.forEach(function (h) {
        per[h.kode] = { hidangan: h, masakan: [] };
        susun.push(per[h.kode]);
      });
      g.masakan.forEach(function (m) { per[hidangan(m.hidangan).kode].masakan.push(m); });
      /* Kelompok kosong dibuang, bukan ditampilkan sebagai judul tanpa isi. */
      g.perHidangan = susun.filter(function (x) { return x.masakan.length; });
    });
    return urut;
  }

  function menuItem(svc, menuId) {
    var r = null;
    menu(svc).forEach(function (m) { if (m.id === menuId) r = m; });
    return r;
  }

  /** Tarif per porsi termurah — angka "mulai dari" yang tampil di katalog. */
  function tarifTerendah(svc) {
    var m = menu(svc);
    if (!m.length) return 0;
    return m.reduce(function (a, x) { return Math.min(a, x.tarif || 0); }, Infinity) || 0;
  }

  /**
   * Samakan `hargaMin` layanan dengan tarif menu termurah.
   *
   * Katalog di seluruh aplikasi membaca `hargaMin` untuk menampilkan "mulai
   * dari". Kalau tarif menu diubah tetapi hargaMin tidak ikut, katalog
   * menjanjikan angka yang tidak bisa ditemukan di mana pun saat memesan.
   */
  function selaraskanHarga(svcId) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return null;
    var t = tarifTerendah(s);
    if ((s.hargaMin || 0) !== t) DB.update('services', svcId, { hargaMin: t, satuan: 'porsi' });
    return t;
  }

  /* ============================================================ UBAH MENU */

  function tulisMenu(svcId, daftar) {
    var s = BIZ.svc(svcId);
    DB.update('services', svcId, {
      keahlian: Object.assign({}, s.keahlian || {}, { menu: daftar })
    });
    selaraskanHarga(svcId);
    return BIZ.svc(svcId);
  }

  /**
   * No ID Makanan — dibuat sistem, tidak pernah diubah, tidak pernah dipakai
   * ulang.
   *
   * Ia adalah identitas baris ini di keranjang, pesanan, dan invoice. Nama
   * masakan boleh diperbaiki ejaannya dan negaranya boleh dipindah; nomornya
   * tetap. Membiarkannya diedit berarti membiarkan seseorang memutus tautan
   * ke pesanan yang sudah terbit tanpa galat apa pun.
   */
  function kodeBaru() {
    var n = DB.nextNo('menuMakanan');
    var kode = 'MKN-' + String(n).padStart(5, '0');
    /* Penghitung bisa tertinggal di belakang data yang diimpor. Naikkan
       sampai benar-benar bebas, daripada menerbitkan nomor kembar. */
    var dipakai = {};
    DB.all('services').forEach(function (s) {
      menuSemua(s).forEach(function (m) { dipakai[m.id] = 1; });
    });
    while (dipakai[kode]) {
      n = DB.nextNo('menuMakanan');
      kode = 'MKN-' + String(n).padStart(5, '0');
    }
    return kode;
  }

  /**
   * Susun isi satu baris masakan dari isian formulir.
   *
   * `id` sengaja TIDAK ikut: menambah membuatnya sendiri, mengubah
   * mempertahankan yang lama. Satu tempat, supaya tambah dan ubah tidak
   * pelan-pelan menyimpan bentuk yang berbeda.
   */
  function isiMasakan(d, lama) {
    var b = bahan(d.bahan);
    return {
      negara: String(d.negara).trim(),
      nama: String(d.nama).trim(),
      hidangan: hidangan(d.hidangan).kode,
      bahan: b.kode,
      tarif: Math.round(d.tarif),
      minPorsi: Math.max(1, Math.round(d.minPorsi || 1)),
      /* Bahan non-halal mengunci penandanya. Membiarkan babi ditandai halal
         bukan sekadar salah data — ia menyesatkan orang yang justru memakai
         penanda itu untuk memutuskan. */
      halal: b.nonHalal ? false : d.halal !== false,
      pedas: pedas(d.pedas).kode,
      alergen: (d.alergen || []).slice(),
      menitMasak: Math.max(0, Math.round(d.menitMasak || 0)),
      deskripsi: String(d.deskripsi || '').trim(),
      foto: d.foto !== undefined ? (d.foto || null) : (lama ? lama.foto || null : null),
      ikon: String(d.ikon || '').trim() || (lama && lama.ikon) || '🍽️',
      aktif: d.aktif !== false
    };
  }

  function periksaMasakan(svc, d, kecualiId) {
    if (!String(d.negara || '').trim()) return I18N.t('Asal negara belum diisi.');
    if (!String(d.nama || '').trim()) return I18N.t('Nama masakan belum diisi.');
    if (!(Math.round(d.tarif) > 0)) return I18N.t('Tarif per porsi harus lebih dari nol.');
    if (!d.bahan) return I18N.t('Bahan baku utama belum dipilih.');
    if (bahan(d.bahan).nonHalal && d.halal) {
      return I18N.t('Masakan berbahan babi tidak bisa ditandai halal.');
    }
    var kembar = menuSemua(svc).filter(function (m) {
      return m.id !== kecualiId &&
             String(m.negara).toLowerCase() === String(d.negara).trim().toLowerCase() &&
             String(m.nama).toLowerCase() === String(d.nama).trim().toLowerCase();
    });
    if (kembar.length) {
      return I18N.t('Masakan itu sudah ada di daftar {negara}.')
        .replace('{negara}', String(d.negara).trim());
    }
    return null;
  }

  function tambahMasakan(svcId, d) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return { error: I18N.t('Layanan keahlian tidak ditemukan.') };
    var sebab = periksaMasakan(s, d);
    if (sebab) return { error: sebab };

    var baris = Object.assign({ id: kodeBaru() }, isiMasakan(d, null));
    var daftar = menuSemua(s);
    daftar.push(baris);
    tulisMenu(svcId, daftar);
    return { ok: true, masakan: baris };
  }

  function ubahMasakan(svcId, menuId, d) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return { error: I18N.t('Layanan keahlian tidak ditemukan.') };
    var ada = menuSemua(s).filter(function (m) { return m.id === menuId; })[0];
    if (!ada) return { error: I18N.t('Masakan tidak ditemukan.') };
    var sebab = periksaMasakan(s, d, menuId);
    if (sebab) return { error: sebab };

    /* Id TIDAK ikut berubah meski nama atau negaranya berganti: keranjang dan
       pesanan yang sudah menunjuk ke sana akan putus tanpa galat apa pun. */
    var daftar = menuSemua(s).map(function (m) {
      return m.id !== menuId ? m : Object.assign({}, m, isiMasakan(d, m));
    });
    tulisMenu(svcId, daftar);
    return { ok: true };
  }

  /**
   * Jeda sebuah masakan.
   *
   * Berbeda dari menghapus: masakan yang dijeda berhenti ditawarkan ke klien,
   * tetapi tarif, minimum, dan ID-nya tetap utuh — jadi bisa dinyalakan lagi
   * persis seperti semula ketika bahannya kembali tersedia. Menghapus lalu
   * menulis ulang tidak sama: id-nya berbeda, dan riwayatnya terputus.
   */
  function jedaMasakan(svcId, menuId, aktif) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return { error: I18N.t('Layanan keahlian tidak ditemukan.') };
    var daftar = menuSemua(s).map(function (m) {
      return m.id !== menuId ? m : Object.assign({}, m, { aktif: !!aktif });
    });
    tulisMenu(svcId, daftar);
    return { ok: true };
  }

  /** Nyalakan atau jeda seluruh masakan satu negara sekaligus. */
  function jedaNegara(svcId, negara, aktif) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return { error: I18N.t('Layanan keahlian tidak ditemukan.') };
    var n = 0;
    var daftar = menuSemua(s).map(function (m) {
      if (m.negara !== negara) return m;
      n++;
      return Object.assign({}, m, { aktif: !!aktif });
    });
    tulisMenu(svcId, daftar);
    return { ok: true, jumlah: n };
  }

  /**
   * Berapa banyak baris keranjang yang masih menunjuk masakan ini.
   *
   * Pesanan yang sudah terbit TIDAK ikut dihitung: rinciannya sudah dibekukan
   * di pesanan itu sendiri, jadi menghapus masakannya tidak mengubah apa pun
   * di sana. Yang benar-benar terdampak hanyalah keranjang yang belum
   * di-checkout — dan pemiliknya berhak tahu sebelum, bukan sesudah.
   */
  function dipakaiMasakan(menuId) {
    var n = 0;
    DB.all('keranjangJasa').forEach(function (r) {
      (r.items || []).forEach(function (it) { if (it.menuId === menuId) n++; });
    });
    return n;
  }

  function hapusMasakan(svcId, menuId) {
    var s = BIZ.svc(svcId);
    if (!adalah(s)) return { error: I18N.t('Layanan keahlian tidak ditemukan.') };
    var daftar = menuSemua(s).filter(function (m) { return m.id !== menuId; });
    if (daftar.length === menuSemua(s).length) return { error: I18N.t('Masakan tidak ditemukan.') };
    tulisMenu(svcId, daftar);
    return { ok: true };
  }

  /** Batas waktu menjawab untuk satu layanan: timpaan per layanan, lalu global. */
  function batasRespon(svc) {
    var per = svc && svc.keahlian && svc.keahlian.responDetik;
    var n = (per === null || per === undefined || per === '') ? config().responDetik : per;
    n = Math.round(Number(n) || 0);
    /* Nol atau negatif berarti permintaan gugur sebelum sempat dibaca. */
    return Math.max(10, n);
  }

  /* ============================================================ JARAK & ONGKOS */

  /** Titik koordinat alamat utama seseorang, atau null bila belum ditandai. */
  function titik(u) {
    if (!u || !window.MAPS) return null;
    var a = BIZ.alamatUtama(u);
    if (a && MAPS.valid(a.koordinat)) return a.koordinat;
    /* Alamat lain yang sudah bertitik tetap dipakai daripada menyerah. */
    var k = null;
    BIZ.alamatList(u).forEach(function (x) { if (!k && MAPS.valid(x.koordinat)) k = x.koordinat; });
    return k;
  }

  /** Jarak mitra ke lokasi acara dalam km. null bila salah satu titik tak ada. */
  function jarakKm(workerId, koordinat) {
    if (!window.MAPS || !MAPS.valid(koordinat)) return null;
    var a = titik(DB.find('users', workerId));
    if (!a) return null;
    return MAPS.jarakKm(a, koordinat);
  }

  function biayaTransport(km) {
    var t = config().transport;
    if (!t.aktif || km === null || km === undefined) return 0;
    if (km <= (t.gratisRadiusKm || 0)) return 0;
    var tempuh = km * (t.pulangPergi ? 2 : 1);
    return Math.max(t.minimum || 0, Math.round(tempuh * (t.perKm || 0)));
  }

  function biayaAsuransi(nilaiPekerjaan) {
    var a = config().asuransi;
    if (!a.aktif) return 0;
    return Math.max(a.minimum || 0, Math.round((nilaiPekerjaan || 0) * (a.persen || 0) / 100));
  }

  /* ================================================================ MITRA */

  /**
   * Permintaan yang masih menunggu jawaban mitra pada rentang waktu tertentu.
   *
   * Dipakai sebagai KUNCI LEMBUT: selama mitra belum menjawab, jamnya tidak
   * boleh ditawarkan ke klien lain. Tanpa ini dua klien bisa memesan orang yang
   * sama untuk jam yang sama, dan yang menang adalah yang kebetulan dijawab
   * lebih dulu — yang satunya baru tahu setelah menunggu satu menit sia-sia.
   */
  function tertahan(workerId, tgl, mulai, selesai, kecualiOrderId) {
    return DB.all('orders').filter(function (o) {
      if (o.id === kecualiOrderId) return false;
      if (o.status !== 'menunggu_mitra' || !o.konfirmasi) return false;
      if (o.konfirmasi.status !== 'menunggu') return false;
      if (o.konfirmasi.workerId !== workerId) return false;
      if (o.tgl !== tgl) return false;
      if (sisaDetik(o) <= 0) return false;          /* sudah lewat tenggat */
      return !(selesai <= o.mulai || mulai >= o.selesai);
    });
  }

  /**
   * Mitra yang bisa ditawarkan untuk satu pekerjaan keahlian.
   *
   * Yang tidak lolos tetap dikembalikan dengan ALASANNYA, supaya admin dan
   * mitra bisa melihat kenapa seseorang tidak muncul di hadapan klien. Daftar
   * yang diam-diam menyusut adalah cara tercepat kehilangan kepercayaan mitra.
   */
  function mitraUntuk(svc, tgl, mulai, selesai, koordinat) {
    var kodeFungsi = (svc && svc.fungsi) || (svc && svc.keahlian && svc.keahlian.fungsi);
    var calon = kodeFungsi && window.KOMPETENSI
      ? KOMPETENSI.mitraFungsi(kodeFungsi)
      : BIZ.mitraAktif();

    return calon.map(function (u) {
      var km = MAPS.valid(koordinat) ? jarakKm(u.id, koordinat) : null;
      var sebab = null;

      if (!titik(u)) {
        sebab = I18N.t('Titik alamat mitra belum ditandai — ongkos jalannya tidak bisa dihitung.');
      } else if (tgl && BIZ.bentrok(null, tgl, mulai, selesai, [u.id]).length) {
        sebab = I18N.t('Sudah ada pekerjaan lain pada jam ini.');
      } else if (tgl && tertahan(u.id, tgl, mulai, selesai).length) {
        sebab = I18N.t('Sedang menunggu jawaban untuk permintaan lain di jam yang sama.');
      }

      var nilai = window.PESAN ? PESAN.nilaiPetugas(u.id) : null;
      return {
        id: u.id, nama: u.nama, foto: u.foto || null,
        jabatan: u.jabatan || '',
        nilai: nilai,
        km: km,
        transport: km === null ? null : biayaTransport(km),
        bisa: !sebab, sebab: sebab
      };
    }).sort(function (a, b) {
      if (a.bisa !== b.bisa) return a.bisa ? -1 : 1;
      var na = (a.nilai && a.nilai.rata) || 0, nb = (b.nilai && b.nilai.rata) || 0;
      if (nb !== na) return nb - na;
      /* Nilai sama: yang lebih dekat lebih dulu — ongkosnya lebih murah bagi
         klien dan perjalanannya lebih ringan bagi mitra. */
      return (a.km === null ? 1e9 : a.km) - (b.km === null ? 1e9 : b.km);
    });
  }

  /* ================================================================ HITUNG */

  /**
   * Rincian tagihan satu pemesanan keahlian.
   *
   * Urutannya sama dengan PESAN dan pesanan toko: potongan dulu, biaya
   * pass-through (transport, asuransi) sesudahnya karena bukan bagian dari
   * jasa yang bisa didiskon, biaya tetap, lalu poin sebagai alat bayar paling
   * akhir. Tiga alur yang menghitung dengan urutan berbeda menghasilkan tiga
   * struk yang tidak bisa dijelaskan berdampingan.
   */
  function hitung(p) {
    p = p || {};
    var c = config();
    var svc = BIZ.svc(p.serviceId);
    if (!adalah(svc)) return { sah: false, sebab: I18N.t('Layanan keahlian tidak ditemukan.'), total: 0 };
    if (svc.aktif === false) return { sah: false, sebab: I18N.t('Layanan ini sedang tidak ditawarkan.'), total: 0 };

    var baris = (p.items || []).map(function (it) {
      var m = menuItem(svc, it.menuId);
      var porsi = Math.max(0, Math.round(it.porsi || 0));
      return {
        menuId: it.menuId, nama: m ? m.nama : '—', ikon: m ? (m.ikon || '') : '',
        tarif: m ? (m.tarif || 0) : 0, porsi: porsi,
        minPorsi: m ? (m.minPorsi || c.minPorsi || 1) : 1,
        subtotal: (m ? (m.tarif || 0) : 0) * porsi,
        /* Ikut dibekukan ke pesanan: mitra harus melihat alergen dan bahan
           bakunya di layarnya sendiri, bukan mencarinya kembali ke katalog
           yang tarifnya bisa berubah besok. */
        negara: m ? m.negara : '', hidangan: m ? m.hidangan : '',
        bahan: m ? m.bahan : '', halal: m ? m.halal !== false : true,
        pedas: m ? m.pedas : 'tidak', alergen: m ? (m.alergen || []).slice() : [],
        menitMasak: m ? (m.menitMasak || 0) : 0,
        ada: !!m
      };
    }).filter(function (b) { return b.porsi > 0; });

    if (!baris.length) {
      return { sah: false, sebab: I18N.t('Pilih jenis masakan dan jumlah porsinya dulu.'), total: 0, baris: [] };
    }
    var hilang = baris.filter(function (b) { return !b.ada; })[0];
    if (hilang) {
      return { sah: false, sebab: I18N.t('Ada jenis masakan yang sudah tidak tersedia.'), total: 0, baris: baris };
    }
    var kurang = baris.filter(function (b) { return b.porsi < b.minPorsi; })[0];
    if (kurang) {
      return { sah: false, total: 0, baris: baris,
        sebab: I18N.t('{nama} minimal {n} porsi.')
          .replace('{nama}', kurang.nama).replace('{n}', kurang.minPorsi) };
    }

    var jasa = U.sum(baris, function (b) { return b.subtotal; });
    var porsiTotal = U.sum(baris, function (b) { return b.porsi; });

    var diskon = Math.min(Math.max(0, p.diskon || 0), jasa);
    var setelahDiskon = jasa - diskon;

    var km = p.workerId ? jarakKm(p.workerId, p.koordinat) : null;
    var transport = biayaTransport(km);
    var asuransi = biayaAsuransi(setelahDiskon);
    var biayaLayanan = c.biayaLayanan || 0;

    var sebelumPoin = setelahDiskon + transport + asuransi + biayaLayanan;
    var poinRp = Math.min(Math.max(0, p.poinRupiah || 0), sebelumPoin);

    return {
      sah: true,
      layanan: { id: svc.id, nama: svc.nama, ikon: svc.icon || '' },
      baris: baris, porsiTotal: porsiTotal,
      jasa: jasa, diskon: diskon,
      km: km, transport: transport, asuransi: asuransi,
      biayaLayanan: biayaLayanan,
      poinRupiah: poinRp,
      total: Math.max(0, sebelumPoin - poinRp),
      /* Ongkos jalan belum bisa dihitung selama mitra belum dipilih — ini
         dinyatakan, bukan disembunyikan di balik angka nol. */
      transportBelumPasti: !p.workerId || km === null
    };
  }

  /* ================================================================ PERMINTAAN */

  /** Detik tersisa bagi mitra untuk menjawab. 0 berarti sudah lewat. */
  function sisaDetik(o) {
    if (!o || !o.konfirmasi || !o.konfirmasi.batasAt) return 0;
    var sisa = Math.floor((new Date(o.konfirmasi.batasAt) - new Date()) / 1000);
    return sisa > 0 ? sisa : 0;
  }

  function blokKonfirmasi(workerId, detik) {
    var kini = new Date();
    return {
      workerId: workerId,
      status: 'menunggu',
      detik: detik,
      dimintaAt: kini.toISOString(),
      batasAt: new Date(kini.getTime() + detik * 1000).toISOString(),
      responAt: null, alasan: ''
    };
  }

  /**
   * Buat pesanan keahlian.
   *
   * Pesanan lahir sebagai `menunggu_mitra`, BUKAN `dijadwalkan`: belum ada
   * yang menyanggupi mengerjakannya. Menuliskannya sebagai terjadwal berarti
   * menjanjikan kepada klien sesuatu yang belum disetujui siapa pun.
   */
  function buat(clientId, d) {
    var svc = BIZ.svc(d.serviceId);
    if (!adalah(svc)) throw new Error(I18N.t('Layanan keahlian tidak ditemukan.'));
    if (!config().aktif) throw new Error(I18N.t('Pemesanan jasa keahlian sedang ditutup.'));
    if (!d.tgl || !d.mulai || !d.selesai) throw new Error(I18N.t('Tanggal dan jam pelaksanaan belum lengkap.'));
    if (!d.alamat) throw new Error(I18N.t('Alamat pelaksanaan belum diisi.'));
    if (!d.workerId) throw new Error(I18N.t('Pilih dulu mitra yang akan mengerjakan.'));

    var h = hitung(d);
    if (!h.sah) throw new Error(h.sebab);
    if (h.km === null) {
      throw new Error(I18N.t('Ongkos jalan tidak bisa dihitung — tandai titik lokasi acara di peta dulu.'));
    }

    /* Diperiksa lagi di sini, bukan hanya saat memilih: antara klien memilih
       dan menekan checkout, orang yang sama bisa sudah dipesan orang lain. */
    if (BIZ.bentrok(null, d.tgl, d.mulai, d.selesai, [d.workerId]).length ||
        tertahan(d.workerId, d.tgl, d.mulai, d.selesai).length) {
      throw new Error(I18N.t('Mitra ini baru saja terisi di jam tersebut. Pilih mitra lain.'));
    }

    var detik = batasRespon(svc);
    var o = BIZ.buatOrder({
      clientId: clientId,
      judul: svc.nama + ' — ' + h.porsiTotal + ' porsi',
      alamat: d.alamat, koordinat: d.koordinat || null,
      serviceIds: [d.serviceId],
      tgl: d.tgl, mulai: d.mulai, selesai: d.selesai,
      /* Belum ditugaskan: mitra baru masuk `workerIds` setelah ia menerima. */
      workerIds: [],
      nilai: h.total,
      /* Klien baru dikabari saat mitra MENERIMA — lihat terima(). */
      tanpaNotif: true
    });

    DB.update('orders', o.id, {
      status: 'menunggu_mitra',
      jalur: 'keahlian',
      keahlian: {
        serviceId: d.serviceId,
        baris: h.baris,
        porsiTotal: h.porsiTotal,
        catatan: d.catatan || '',
        bawaAlat: !!(svc.keahlian && svc.keahlian.bawaAlat)
      },
      konfirmasi: blokKonfirmasi(d.workerId, detik),
      konfirmasiRiwayat: [],
      rincian: h,
      kontak: d.kontak || null,
      metodeBayar: d.metodeBayar || '',
      poinDipakai: d.poinDipakai || 0,
      poinRupiah: h.poinRupiah
    });

    if (window.INSENTIF && d.poinDipakai) {
      try {
        INSENTIF.potongPoin(clientId, d.poinDipakai, { tipe: 'order', id: o.id },
          I18N.t('Dipakai pada pesanan') + ' ' + o.no);
      } catch (e) {
        DB.update('orders', o.id, { poinDipakai: 0, poinRupiah: 0, nilai: h.total + h.poinRupiah });
        DB.log(clientId, 'Poin tidak jadi dipakai pada ' + o.no + ' — ' + e.message, 'order', o.id);
      }
    }

    kabariMitra(o.id);
    DB.log(clientId, 'Memesan ' + svc.nama + ' — ' + o.no, 'order', o.id);
    return DB.find('orders', o.id);
  }

  function kabariMitra(orderId) {
    var o = BIZ.order(orderId);
    if (!o || !o.konfirmasi) return;
    if (!window.WA) return;
    WA.enqueue('keahlian_permintaan', o.konfirmasi.workerId,
      { orderId: orderId, workerId: o.konfirmasi.workerId, detik: o.konfirmasi.detik },
      { tipe: 'order', id: orderId });
  }

  /* ---------------------------------------------------------------- jawaban */

  function arsipkan(o, hasil, alasan) {
    var r = (o.konfirmasiRiwayat || []).slice();
    r.push(Object.assign({}, o.konfirmasi, {
      status: hasil, alasan: alasan || '', responAt: U.nowISO()
    }));
    return r;
  }

  /** Mitra menerima permintaan. Baru di sinilah pekerjaan benar-benar terjadwal. */
  function terima(orderId, workerId) {
    var o = BIZ.order(orderId);
    if (!o || o.status !== 'menunggu_mitra') return { error: I18N.t('Permintaan ini sudah tidak berlaku.') };
    if (!o.konfirmasi || o.konfirmasi.workerId !== workerId) return { error: I18N.t('Permintaan ini bukan untuk Anda.') };
    if (o.konfirmasi.status !== 'menunggu') return { error: I18N.t('Permintaan ini sudah dijawab.') };
    if (sisaDetik(o) <= 0) { kedaluwarsa(orderId); return { error: I18N.t('Waktu menjawab sudah habis.') }; }

    /* Jam bisa saja terisi oleh pekerjaan lain selama tenggat berjalan. */
    if (BIZ.bentrok(orderId, o.tgl, o.mulai, o.selesai, [workerId]).length) {
      return { error: I18N.t('Jam ini bentrok dengan pekerjaan Anda yang lain.') };
    }

    DB.update('orders', orderId, {
      status: 'dijadwalkan',
      workerIds: [workerId],
      konfirmasi: Object.assign({}, o.konfirmasi, { status: 'diterima', responAt: U.nowISO() })
    });
    if (window.BIZ && BIZ.notifJadwal) BIZ.notifJadwal(orderId);
    DB.log(workerId, 'Menerima permintaan ' + o.no, 'order', orderId);
    return { ok: true, order: BIZ.order(orderId) };
  }

  /** Mitra menolak. Pesanan tetap hidup; klien memilih mitra lain. */
  function tolak(orderId, workerId, alasan) {
    var o = BIZ.order(orderId);
    if (!o || o.status !== 'menunggu_mitra') return { error: I18N.t('Permintaan ini sudah tidak berlaku.') };
    if (!o.konfirmasi || o.konfirmasi.workerId !== workerId) return { error: I18N.t('Permintaan ini bukan untuk Anda.') };
    if (o.konfirmasi.status !== 'menunggu') return { error: I18N.t('Permintaan ini sudah dijawab.') };

    DB.update('orders', orderId, {
      konfirmasi: Object.assign({}, o.konfirmasi,
        { status: 'ditolak', responAt: U.nowISO(), alasan: alasan || '' }),
      konfirmasiRiwayat: arsipkan(o, 'ditolak', alasan)
    });
    if (window.WA) {
      WA.enqueue('keahlian_ditolak', o.clientId, { orderId: orderId }, { tipe: 'order', id: orderId });
    }
    DB.log(workerId, 'Menolak permintaan ' + o.no, 'order', orderId);
    return { ok: true };
  }

  /** Tenggat lewat tanpa jawaban. Sama akibatnya dengan menolak. */
  function kedaluwarsa(orderId) {
    var o = BIZ.order(orderId);
    if (!o || o.status !== 'menunggu_mitra' || !o.konfirmasi) return false;
    if (o.konfirmasi.status !== 'menunggu' || sisaDetik(o) > 0) return false;

    DB.update('orders', orderId, {
      konfirmasi: Object.assign({}, o.konfirmasi, { status: 'kedaluwarsa', responAt: U.nowISO() }),
      konfirmasiRiwayat: arsipkan(o, 'kedaluwarsa', '')
    });
    if (window.WA) {
      WA.enqueue('keahlian_kedaluwarsa', o.clientId, { orderId: orderId }, { tipe: 'order', id: orderId });
    }
    DB.log('u_admin', 'Permintaan ' + o.no + ' gugur tanpa jawaban', 'order', orderId);
    return true;
  }

  /**
   * Gugurkan semua permintaan yang tenggatnya sudah lewat.
   *
   * Dipanggil setiap aplikasi dibuka dan setiap detak penghitung. Tenggat
   * tidak boleh bergantung pada ada tidaknya seseorang yang kebetulan sedang
   * menonton layar — permintaan yang gugur harus gugur juga bagi klien yang
   * menunggu di perangkat lain.
   */
  function sapuKedaluwarsa() {
    var n = 0;
    DB.all('orders').forEach(function (o) {
      if (o.status === 'menunggu_mitra' && o.konfirmasi &&
          o.konfirmasi.status === 'menunggu' && sisaDetik(o) <= 0) {
        if (kedaluwarsa(o.id)) n++;
      }
    });
    return n;
  }

  /** Klien memilih mitra lain setelah ditolak atau gugur. Tenggat dimulai lagi. */
  function pilihMitraLain(orderId, workerId) {
    var o = BIZ.order(orderId);
    if (!o || o.status !== 'menunggu_mitra') return { error: I18N.t('Pesanan ini sudah tidak menunggu mitra.') };
    if (o.konfirmasi && o.konfirmasi.status === 'menunggu' && sisaDetik(o) > 0) {
      return { error: I18N.t('Masih menunggu jawaban mitra sebelumnya.') };
    }
    if (BIZ.bentrok(orderId, o.tgl, o.mulai, o.selesai, [workerId]).length ||
        tertahan(workerId, o.tgl, o.mulai, o.selesai, orderId).length) {
      return { error: I18N.t('Mitra ini tidak kosong di jam tersebut.') };
    }

    var svc = BIZ.svc((o.keahlian && o.keahlian.serviceId) || (o.serviceIds || [])[0]);

    /* Riwayat TIDAK ditambah di sini: tolak() dan kedaluwarsa() sudah
       mengarsipkan percobaan yang gagal saat kejadiannya. Mengarsipkan lagi
       membuat satu penolakan terhitung dua percobaan — dan hitungan itulah
       yang dibaca admin untuk menilai apakah sebuah pesanan bermasalah. */
    var riwayat = o.konfirmasiRiwayat || [];

    /* Ongkos jalan mengikuti mitra yang baru — jaraknya berbeda, dan menagih
       klien dengan ongkos mitra yang sudah menolak jelas keliru. */
    var h = hitung({
      serviceId: svc ? svc.id : null,
      items: (o.keahlian && o.keahlian.baris || []).map(function (b) {
        return { menuId: b.menuId, porsi: b.porsi }; }),
      workerId: workerId, koordinat: o.koordinat,
      poinRupiah: o.poinRupiah || 0
    });

    DB.update('orders', orderId, {
      konfirmasi: blokKonfirmasi(workerId, batasRespon(svc)),
      konfirmasiRiwayat: riwayat,
      rincian: h.sah ? h : o.rincian,
      nilai: h.sah ? h.total : o.nilai
    });
    kabariMitra(orderId);
    return { ok: true, order: BIZ.order(orderId) };
  }

  /** Klien membatalkan seluruh pesanan yang belum dapat mitra. */
  function batalkan(orderId, alasan) {
    var o = BIZ.order(orderId);
    if (!o || o.status !== 'menunggu_mitra') return { error: I18N.t('Pesanan ini tidak bisa dibatalkan di sini.') };

    /* Poin yang sudah dipotong dikembalikan — pekerjaannya tidak pernah ada. */
    if (window.INSENTIF && o.poinDipakai) {
      try { INSENTIF.kembalikanPoin(o.clientId, o.poinDipakai, { tipe: 'order', id: orderId },
        'Pesanan ' + o.no + ' dibatalkan'); } catch (e) {}
    }
    DB.update('orders', orderId, {
      status: 'dibatalkan',
      konfirmasi: o.konfirmasi
        ? Object.assign({}, o.konfirmasi, { status: 'batal', responAt: U.nowISO() })
        : null,
      catatanBatal: alasan || ''
    });
    DB.log(o.clientId, 'Membatalkan ' + o.no, 'order', orderId);
    return { ok: true };
  }

  /* ================================================================ DAFTAR */

  /** Permintaan yang sedang menunggu jawaban seorang mitra. */
  function permintaanMitra(workerId) {
    sapuKedaluwarsa();
    return DB.all('orders').filter(function (o) {
      return o.status === 'menunggu_mitra' && o.konfirmasi &&
             o.konfirmasi.status === 'menunggu' && o.konfirmasi.workerId === workerId;
    }).sort(function (a, b) { return sisaDetik(a) - sisaDetik(b); });
  }

  /** Pesanan keahlian milik klien yang masih menunggu mitra. */
  function menungguMitra(clientId) {
    sapuKedaluwarsa();
    return DB.all('orders').filter(function (o) {
      return o.status === 'menunggu_mitra' && o.jalur === 'keahlian' &&
             (!clientId || o.clientId === clientId);
    });
  }

  function statistik() {
    var o = DB.all('orders').filter(function (x) { return x.jalur === 'keahlian'; });
    var riwayat = [];
    o.forEach(function (x) {
      (x.konfirmasiRiwayat || []).forEach(function (r) { riwayat.push(r); });
      if (x.konfirmasi && x.konfirmasi.status !== 'menunggu') riwayat.push(x.konfirmasi);
    });
    return {
      pesanan: o.length,
      menunggu: o.filter(function (x) { return x.status === 'menunggu_mitra'; }).length,
      terjadwal: o.filter(function (x) { return x.status === 'dijadwalkan'; }).length,
      diterima: riwayat.filter(function (r) { return r.status === 'diterima'; }).length,
      ditolak: riwayat.filter(function (r) { return r.status === 'ditolak'; }).length,
      kedaluwarsa: riwayat.filter(function (r) { return r.status === 'kedaluwarsa'; }).length,
      layanan: katalog().length
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    adalah: adalah, katalog: katalog, menu: menu, menuItem: menuItem,
    HIDANGAN: HIDANGAN, hidangan: hidangan, menuSemua: menuSemua,
    BAHAN: BAHAN, bahan: bahan, PEDAS: PEDAS, pedas: pedas,
    ALERGEN: ALERGEN, alergenNama: alergenNama, kodeBaru: kodeBaru,
    perNegara: perNegara, tarifTerendah: tarifTerendah, selaraskanHarga: selaraskanHarga,
    tambahMasakan: tambahMasakan, ubahMasakan: ubahMasakan,
    jedaMasakan: jedaMasakan, jedaNegara: jedaNegara,
    hapusMasakan: hapusMasakan, dipakaiMasakan: dipakaiMasakan,
    batasRespon: batasRespon,
    titik: titik, jarakKm: jarakKm, biayaTransport: biayaTransport, biayaAsuransi: biayaAsuransi,
    mitraUntuk: mitraUntuk, tertahan: tertahan,
    hitung: hitung, buat: buat,
    sisaDetik: sisaDetik, terima: terima, tolak: tolak, kedaluwarsa: kedaluwarsa,
    sapuKedaluwarsa: sapuKedaluwarsa, pilihMitraLain: pilihMitraLain, batalkan: batalkan,
    permintaanMitra: permintaanMitra, menungguMitra: menungguMitra, statistik: statistik
  };
})();
