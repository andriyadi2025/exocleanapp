/* ==========================================================================
   poin.js — poin loyalitas EXOCLEAN
   --------------------------------------------------------------------------
   Poin adalah UTANG PERUSAHAAN kepada pelanggan. Sekali diberikan ia harus
   bisa ditukar, dan tiap penukaran mengurangi pendapatan. Karena itu tiga
   hal dipegang teguh di berkas ini:

     1. SALDO SELALU DIHITUNG, TIDAK PERNAH DISIMPAN.
        Saldo = jumlah seluruh mutasi, sama seperti dompet. Angka saldo yang
        disimpan terpisah pasti akan menyimpang cepat atau lambat, dan ketika
        menyimpang tidak ada cara mengetahui mana yang benar.

     2. KETENTUAN DIBEKUKAN SAAT POIN TERBIT.
        Aturan boleh diubah admin kapan saja. Poin yang sudah terlanjur
        diberikan memakai aturan yang berlaku SAAT ITU — mengubah aturan
        tidak boleh diam-diam mengubah nilai poin yang sudah di tangan orang.

     3. KEDALUWARSA DIPAKAI URUT TERTUA (FIFO).
        Poin yang paling lama menganggur itulah yang hangus lebih dulu, dan
        hangusnya DICATAT sebagai mutasi negatif — bukan dengan menghapus
        catatan lama. Riwayat harus tetap bisa dibaca setelah kejadiannya.
   ========================================================================== */
var POIN = (function () {

  /* ================================================================ BAWAAN */
  var BAWAAN = {
    aktif: true,
    nama: 'EXOPOIN',
    /* Berapa rupiah nilai satu poin saat ditukar. Dipisah dari kurs perolehan
       supaya admin bisa mengatur margin program tanpa mengubah cara poin
       diperoleh. */
    nilaiTukar: 100,
    minimalTukar: 500,
    kedaluwarsaBulan: 12,
    bulatkan: 'bawah',        /* bawah | terdekat */

    /* --- perolehan --- */
    aturan: {
      belanjaJasa:   { aktif: true,  per: 10000, poin: 1,
                       nama: 'Belanja jasa kebersihan',
                       ket: 'Setiap kelipatan rupiah pada invoice yang lunas.' },
      belanjaToko:   { aktif: true,  per: 10000, poin: 1,
                       nama: 'Belanja produk di toko',
                       ket: 'Dihitung saat pesanan berstatus selesai.' },
      pekerjaanTuntas: { aktif: true, poin: 25,
                       nama: 'Pekerjaan selesai diverifikasi',
                       ket: 'Bonus tetap untuk klien tiap pekerjaan tuntas.' },
      beriNilai:     { aktif: true,  poin: 20,
                       nama: 'Memberi penilaian',
                       ket: 'Sekali per pekerjaan, mendorong umpan balik jujur.' },
      pendaftaran:   { aktif: true,  poin: 100,
                       nama: 'Bonus pendaftaran',
                       ket: 'Diberikan sekali saat akun terverifikasi.' },
      rujukan:       { aktif: true,  poin: 250,
                       nama: 'Mengajak teman',
                       ket: 'Saat orang yang diajak menyelesaikan transaksi pertamanya.' },

      /* --- khusus mitra: yang dihargai adalah MUTU, bukan jumlah --- */
      mitraTuntas:   { aktif: true,  poin: 30,
                       nama: 'Mitra — pekerjaan tuntas',
                       ket: 'Untuk setiap petugas yang bertugas pada pekerjaan itu.' },
      mitraQcLulus:  { aktif: true,  poin: 40,
                       nama: 'Mitra — lulus verifikasi mutu',
                       ket: 'Hanya bila hasil QC dinyatakan lulus.' },
      mitraBintang5: { aktif: true,  poin: 60,
                       nama: 'Mitra — mendapat nilai 5',
                       ket: 'Ketika klien memberi lima bintang.' },
      mitraSertifikat: { aktif: true, poin: 150,
                       nama: 'Mitra — sertifikat kompetensi baru',
                       ket: 'Sekali per sertifikat yang terbit.' }
    },

    /* --- jenjang --- */
    jenjang: [
      { kode: 'bronze',   nama: 'Bronze',   minPoin: 0,    kali: 1,    ic: '🥉', warna: '#B45309' },
      { kode: 'silver',   nama: 'Silver',   minPoin: 1000, kali: 1.25, ic: '🥈', warna: '#64748B' },
      { kode: 'gold',     nama: 'Gold',     minPoin: 5000, kali: 1.5,  ic: '🥇', warna: '#B7791F' },
      { kode: 'platinum', nama: 'Platinum', minPoin: 15000, kali: 2,   ic: '💎', warna: '#0E7490' }
    ],
    jenjangBulan: 12,          /* jendela penilaian jenjang */

    /* --- katalog penukaran --- */
    katalog: [
      { id: 'v50',  jenis: 'voucher', nama: 'Potongan Rp50.000',  poin: 500,  nilai: 50000,  ic: '🎟️', aktif: true },
      { id: 'v150', jenis: 'voucher', nama: 'Potongan Rp150.000', poin: 1400, nilai: 150000, ic: '🎟️', aktif: true },
      /* 500 poin, bukan 300: minimalTukar juga 500, dan item di bawah ambang
         itu tayang tetapi tidak pernah bisa ditukar — cacat yang hanya
         ketahuan setelah pengguna mencoba dan gagal. */
      { id: 'ongkir', jenis: 'ongkir', nama: 'Gratis ongkir sekali kirim', poin: 500, nilai: 50000, ic: '🚚', aktif: true },
      { id: 'saldo', jenis: 'saldo',  nama: 'Tukar ke saldo dompet', poin: 1000, nilai: 100000, ic: '💰', aktif: true,
        ket: 'Masuk ke Dompet dan bisa ditarik seperti saldo biasa.' }
    ]
  };

  /* ================================================================ SETELAN */
  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.poin) { s.poin = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    Object.keys(BAWAAN).forEach(function (k) {
      if (s.poin[k] === undefined) s.poin[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    /* aturan bisa bertambah di versi berikutnya — lengkapi yang belum ada */
    Object.keys(BAWAAN.aturan).forEach(function (k) {
      if (!s.poin.aturan[k]) s.poin.aturan[k] = JSON.parse(JSON.stringify(BAWAAN.aturan[k]));
    });
    return s.poin;
  }

  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  function aktif() { return config().aktif !== false; }
  function nama() { return config().nama || 'Poin'; }

  /* ================================================================ BUKU BESAR */
  function mutasi(userId) {
    return U.sortBy(DB.where('poinMutasi', { userId: userId }),
      function (m) { return m.at; }, true);
  }

  /** Saldo poin = jumlah seluruh mutasi. Sengaja dihitung, bukan disimpan. */
  function saldo(userId) {
    return U.sum(DB.where('poinMutasi', { userId: userId }), function (m) { return m.poin; });
  }

  /**
   * Tulis satu mutasi. `sumber` menandai aturan yang melahirkannya, dan
   * `ketentuan` membekukan angka aturan itu apa adanya saat poin terbit —
   * tanpa itu, laporan bulan lalu ikut berubah setiap admin menyetel ulang.
   */
  function tulis(userId, poin, jenis, ket, ref, sumber, ketentuan) {
    if (!userId || !poin) return null;
    return DB.insert('poinMutasi', {
      userId: userId, poin: Math.round(poin), jenis: jenis, ket: ket || '',
      sumber: sumber || null, ketentuan: ketentuan || null,
      refType: ref && ref.tipe || null, refId: ref && ref.id || null,
      at: U.nowISO()
    });
  }

  /** Sudah pernah diberi poin untuk kejadian yang sama persis? */
  function sudahAda(userId, sumber, refId) {
    return DB.where('poinMutasi', function (m) {
      return m.userId === userId && m.sumber === sumber && m.refId === refId;
    }).length > 0;
  }

  /* ================================================================ JENJANG */
  /**
   * Jenjang dinilai dari poin yang DIPEROLEH dalam jendela terakhir, bukan
   * dari saldo. Kalau memakai saldo, menukarkan poin akan menurunkan jenjang
   * — pelanggan jadi menimbun poin dan program kehilangan gunanya.
   */
  function poinPeriode(userId) {
    var c = config();
    var batas = U.addDays(new Date(), -Math.round(c.jenjangBulan * 30.44));
    return U.sum(DB.where('poinMutasi', function (m) {
      return m.userId === userId && m.poin > 0 && new Date(m.at) >= batas;
    }), function (m) { return m.poin; });
  }

  function jenjang(userId) {
    var c = config();
    var n = poinPeriode(userId);
    var urut = U.sortBy(c.jenjang, function (j) { return j.minPoin; });
    var pilih = urut[0];
    urut.forEach(function (j) { if (n >= j.minPoin) pilih = j; });

    var berikut = urut.filter(function (j) { return j.minPoin > n; })[0] || null;
    return Object.assign({}, pilih, {
      poinPeriode: n,
      berikut: berikut,
      kurang: berikut ? berikut.minPoin - n : 0,
      /* persentase menuju jenjang berikutnya, untuk bilah kemajuan */
      persen: berikut
        ? Math.min(100, Math.round((n - pilih.minPoin) / (berikut.minPoin - pilih.minPoin) * 100))
        : 100
    });
  }

  /* ================================================================ PEROLEHAN */
  /**
   * Hitung poin untuk satu aturan. Pengali jenjang diterapkan di sini supaya
   * satu-satunya tempat yang menentukan besaran poin tetap satu.
   */
  function hitung(kode, userId, nilaiRupiah) {
    var c = config();
    var a = c.aturan[kode];
    if (!aktif() || !a || !a.aktif) return { poin: 0, ketentuan: null };

    var dasar;
    if (a.per) {
      var kelipatan = nilaiRupiah / a.per;
      dasar = c.bulatkan === 'terdekat' ? Math.round(kelipatan) : Math.floor(kelipatan);
      dasar = dasar * a.poin;
    } else {
      dasar = a.poin;
    }

    var j = jenjang(userId);
    var kali = Number(j.kali) || 1;
    var total = c.bulatkan === 'terdekat' ? Math.round(dasar * kali) : Math.floor(dasar * kali);

    return {
      poin: Math.max(0, total),
      dasar: dasar,
      ketentuan: { aturan: kode, per: a.per || null, poinAturan: a.poin,
                   jenjang: j.kode, kali: kali, nilaiRupiah: nilaiRupiah || null }
    };
  }

  /**
   * Berikan poin untuk sebuah kejadian. Kejadian yang sama tidak pernah
   * dihitung dua kali — pemeriksaannya di sini, bukan di pemanggil, karena
   * pemanggilnya banyak dan satu yang lupa memeriksa sudah cukup untuk
   * membocorkan poin.
   */
  function beri(userId, kode, ref, nilaiRupiah, ketTambahan) {
    if (!aktif() || !userId) return null;
    var refId = ref && ref.id;
    if (refId && sudahAda(userId, kode, refId)) return null;

    var h = hitung(kode, userId, nilaiRupiah);
    if (!h.poin) return null;

    var a = config().aturan[kode];
    return tulis(userId, h.poin, 'perolehan',
      ketTambahan || a.nama, ref, kode, h.ketentuan);
  }

  /* ================================================================ KEDALUWARSA
     Poin dipakai urut tertua. Fungsi ini menyusun ulang antrean batch dari
     seluruh mutasi, sehingga bisa dijawab: dari batch mana sisa saldo
     sekarang berasal, dan mana yang sudah waktunya hangus. */
  function batch(userId) {
    var semua = U.sortBy(DB.where('poinMutasi', { userId: userId }),
      function (m) { return m.at; });
    var antre = [];

    semua.forEach(function (m) {
      if (m.poin > 0) {
        antre.push({ at: m.at, awal: m.poin, sisa: m.poin, id: m.id });
        return;
      }
      /* mutasi negatif menggerus batch tertua lebih dulu */
      var pakai = -m.poin;
      for (var i = 0; i < antre.length && pakai > 0; i++) {
        var ambil = Math.min(antre[i].sisa, pakai);
        antre[i].sisa -= ambil;
        pakai -= ambil;
      }
    });

    return antre.filter(function (b) { return b.sisa > 0; });
  }

  /** Poin yang akan hangus dalam `hari` ke depan — dipakai untuk pengingat. */
  function akanHangus(userId, hari) {
    var c = config();
    if (!c.kedaluwarsaBulan) return { poin: 0, tanggal: null };
    var batas = U.addDays(new Date(), hari || 30);
    var out = 0, paling = null;
    batch(userId).forEach(function (b) {
      var mati = U.addDays(new Date(b.at), Math.round(c.kedaluwarsaBulan * 30.44));
      if (mati <= batas) {
        out += b.sisa;
        if (!paling || mati < paling) paling = mati;
      }
    });
    return { poin: out, tanggal: paling ? U.iso(paling) : null };
  }

  /**
   * Hanguskan poin yang sudah lewat masanya. Dijalankan sekali tiap aplikasi
   * dibuka — pola yang sama dengan penyegaran invoice dan komisi afiliasi.
   */
  function segarkan() {
    var c = config();
    if (!aktif() || !c.kedaluwarsaBulan) return 0;
    var sekarang = new Date();
    var n = 0;

    DB.all('users').forEach(function (u) {
      var hangus = 0, tertua = null;
      batch(u.id).forEach(function (b) {
        var mati = U.addDays(new Date(b.at), Math.round(c.kedaluwarsaBulan * 30.44));
        if (mati <= sekarang) { hangus += b.sisa; if (!tertua) tertua = b.at; }
      });
      if (hangus > 0) {
        tulis(u.id, -hangus, 'kedaluwarsa',
          I18N.t('Poin hangus setelah') + ' ' + c.kedaluwarsaBulan + ' bulan',
          { tipe: 'sistem', id: 'exp_' + U.iso(sekarang) }, 'kedaluwarsa',
          { sejak: tertua, bulan: c.kedaluwarsaBulan });
        n++;
      }
    });
    return n;
  }

  /* ================================================================ PENUKARAN */
  function katalogAktif() {
    return (config().katalog || []).filter(function (k) { return k.aktif !== false; });
  }

  function itemKatalog(id) {
    return (config().katalog || []).filter(function (k) { return k.id === id; })[0] || null;
  }

  /**
   * Tukarkan poin. Mengembalikan objek penukaran; melempar bila tidak
   * memenuhi syarat — kegagalan harus terlihat, bukan diam-diam tidak terjadi.
   */
  function tukar(userId, itemId) {
    if (!aktif()) throw new Error(I18N.t('Program poin sedang dinonaktifkan.'));
    var c = config();
    var item = itemKatalog(itemId);
    if (!item || item.aktif === false) throw new Error(I18N.t('Item penukaran tidak tersedia.'));

    var punya = saldo(userId);
    if (punya < item.poin) {
      throw new Error(I18N.t('Poin Anda') + ' ' + U.num(punya) + I18N.t(', kurang') + ' ' +
        U.num(item.poin - punya) + ' ' + I18N.t('untuk menukar') + ' ' + item.nama + '.');
    }
    if (item.poin < (c.minimalTukar || 0)) {
      /* Ini kesalahan PENGATURAN, bukan kesalahan pengguna — jadi pesannya
         menunjuk ke sana, bukan menyalahkan orang yang menekan tombol. */
      throw new Error(I18N.t('Item ini dipatok') + ' ' + U.num(item.poin) + ' ' + I18N.t('poin, di bawah batas') + ' ' +
        'minimal penukaran ' + U.num(c.minimalTukar) + ' ' + I18N.t('poin. Hubungi admin —') + ' ' +
        'ketentuannya perlu diperbaiki.');
    }

    var rec = DB.insert('poinTukar', {
      no: 'PTK-' + String(DB.nextNo('poinTukar')).padStart(4, '0'),
      userId: userId, itemId: item.id, jenis: item.jenis, nama: item.nama,
      poin: item.poin, nilai: item.nilai,
      status: item.jenis === 'saldo' ? 'selesai' : 'aktif',
      dipakaiPada: null, kedaluwarsaAt: U.addDays(new Date(), 90).toISOString()
    });

    tulis(userId, -item.poin, 'penukaran', 'Tukar ' + item.nama,
      { tipe: 'poinTukar', id: rec.id }, 'tukar',
      { itemId: item.id, nilai: item.nilai, jenis: item.jenis });

    /* Penukaran ke saldo langsung masuk dompet — di situlah uangnya berada,
       dan dari situ pula penarikannya sudah punya jalur yang teruji. */
    if (item.jenis === 'saldo' && window.DOMPET) {
      /* Dicatat sebagai 'bonus' — jenis mutasi yang sudah ada di dompet dan
         sudah punya ikon serta label sendiri. Menambah jenis baru hanya untuk
         ini akan memaksa setiap laporan dompet diperbarui juga. */
      DOMPET.kredit(userId, item.nilai, 'bonus',
        'Penukaran ' + U.num(item.poin) + ' ' + nama() + ' — ' + rec.no,
        { tipe: 'poinTukar', id: rec.id });
    }

    DB.log(userId, 'poin.tukar', 'poinTukar', rec.id,
      item.nama + ' (' + item.poin + ' poin)');
    return rec;
  }

  /**
   * Tukar poin dengan sebuah PRODUK VOUCHER.
   *
   * Katalog voucher sengaja tinggal di satu tempat saja — VOUCHER — bukan
   * disalin ke sini. Dua katalog yang harus dijaga tetap sama adalah dua
   * katalog yang cepat atau lambat berbeda, dan admin tidak akan tahu yang
   * mana yang benar.
   */
  function tukarVoucher(userId, produkId) {
    if (!aktif()) throw new Error(I18N.t('Program poin sedang dinonaktifkan.'));
    var p = VOUCHER.produk(produkId);
    if (!p || p.aktif === false) throw new Error(I18N.t('Voucher ini sedang tidak tersedia.'));
    if (!(p.hargaPoin > 0)) throw new Error(I18N.t('Voucher ini tidak dapat ditukar dengan poin.'));

    var punya = saldo(userId);
    if (punya < p.hargaPoin) {
      throw new Error(I18N.t('Poin Anda') + ' ' + U.num(punya) + I18N.t(', kurang') + ' ' +
        U.num(p.hargaPoin - punya) + ' ' + I18N.t('untuk menukar') + ' ' + p.nama + '.');
    }
    var c = config();
    if (p.hargaPoin < (c.minimalTukar || 0)) {
      throw new Error(I18N.t('Voucher ini dipatok') + ' ' + U.num(p.hargaPoin) + ' ' + I18N.t('poin, di bawah batas') + ' ' +
        'minimal penukaran ' + U.num(c.minimalTukar) + ' ' + I18N.t('poin. Hubungi admin.'));
    }

    /* Voucher diterbitkan LEBIH DULU. Bila kuotanya ternyata habis, poin tidak
       boleh sudah terpotong. */
    var v = VOUCHER.terbitkan(produkId, {
      asal: 'poin', pemilikId: userId, poinDipakai: p.hargaPoin
    });

    tulis(userId, -p.hargaPoin, 'penukaran', 'Tukar ' + p.nama,
      { tipe: 'voucher', id: v.id }, 'tukar',
      { produkId: p.id, jenis: p.jenis, kode: v.kode });

    DB.log(userId, 'poin.tukar', 'voucher', v.id, p.nama + ' (' + p.hargaPoin + ' poin)');
    return v;
  }

  /** Voucher aktif milik seseorang yang belum dipakai dan belum kedaluwarsa. */
  function voucherAktif(userId) {
    var kini = U.nowISO();
    return DB.where('poinTukar', function (t) {
      return t.userId === userId && t.status === 'aktif' &&
        t.jenis !== 'saldo' && (!t.kedaluwarsaAt || t.kedaluwarsaAt > kini);
    });
  }

  function pakaiVoucher(tukarId, ref) {
    var t = DB.find('poinTukar', tukarId);
    if (!t || t.status !== 'aktif') return null;
    return DB.update('poinTukar', tukarId, {
      status: 'terpakai', dipakaiPada: U.nowISO(),
      refType: ref && ref.tipe || null, refId: ref && ref.id || null
    });
  }

  /**
   * Kembalikan voucher ketika transaksi yang memakainya batal.
   *
   * Voucher yang tetap hangus setelah pesanan dibatalkan sama saja dengan
   * menyita poin orang tanpa memberi apa pun — itu tuntutan yang wajar dan
   * mahal. Masa berlakunya sengaja diperpanjang 30 hari sejak dikembalikan,
   * karena waktu yang terpakai selama pesanan berjalan bukan kesalahan
   * pemiliknya.
   */
  function kembalikanVoucher(ref) {
    if (!ref || !ref.id) return 0;
    var n = 0;
    DB.where('poinTukar', function (t) {
      return t.status === 'terpakai' && t.refType === ref.tipe && t.refId === ref.id;
    }).forEach(function (t) {
      DB.update('poinTukar', t.id, {
        status: 'aktif', dipakaiPada: null, refType: null, refId: null,
        kedaluwarsaAt: U.addDays(new Date(), 30).toISOString()
      });
      n++;
    });
    return n;
  }

  /* ================================================================ PAKAI DI KASIR
     Dua konteks yang berbeda aturannya:
       'toko'    — belanja produk: voucher potongan DAN voucher ongkir berlaku
       'invoice' — tagihan jasa: hanya voucher potongan; tidak ada ongkir
                   pada pekerjaan yang dikerjakan di tempat klien. */
  function voucherUntuk(userId, konteks) {
    return voucherAktif(userId).filter(function (v) {
      if (v.jenis === 'voucher') return true;
      if (v.jenis === 'ongkir') return konteks === 'toko';
      return false;   /* saldo sudah cair, barang bukan urusan kasir */
    });
  }

  /**
   * Berapa rupiah voucher ini benar-benar memotong.
   *
   * Dibatasi pada jumlah yang tersedia untuk dipotong — voucher Rp150.000
   * pada belanja Rp80.000 memotong Rp80.000, bukan menciptakan kembalian.
   * Selisih yang tidak terpakai HANGUS, dan itu dikatakan terus terang di
   * layar supaya pembeli bisa memilih menundanya untuk belanja yang lebih besar.
   */
  function potongan(v, dasar) {
    if (!v) return { rp: 0, sisaHangus: 0 };
    var tersedia = v.jenis === 'ongkir' ? (dasar.ongkir || 0) : (dasar.subtotal || 0);
    var rp = Math.min(v.nilai || 0, Math.max(0, tersedia));
    return { rp: rp, sisaHangus: Math.max(0, (v.nilai || 0) - rp), jenis: v.jenis };
  }

  /* ================================================================ RINGKASAN */
  function ringkasUser(userId) {
    var j = jenjang(userId);
    var hangus = akanHangus(userId, 30);
    return {
      saldo: saldo(userId), jenjang: j,
      nilaiRupiah: saldo(userId) * (config().nilaiTukar || 0),
      akanHangus: hangus,
      voucher: voucherAktif(userId).length
    };
  }

  /** Angka untuk halaman admin. */
  function statistik() {
    var semua = DB.all('poinMutasi');
    var terbit = U.sum(semua.filter(function (m) { return m.poin > 0; }), function (m) { return m.poin; });
    var tertukar = -U.sum(semua.filter(function (m) { return m.jenis === 'penukaran'; }), function (m) { return m.poin; });
    var hangus = -U.sum(semua.filter(function (m) { return m.jenis === 'kedaluwarsa'; }), function (m) { return m.poin; });
    var beredar = terbit - tertukar - hangus;
    return {
      terbit: terbit, tertukar: tertukar, hangus: hangus, beredar: beredar,
      /* Poin beredar adalah kewajiban yang belum jatuh tempo — angka inilah
         yang harus dilihat keuangan, bukan jumlah poin yang pernah terbit. */
      kewajibanRp: beredar * (config().nilaiTukar || 0),
      pemilik: Object.keys(semua.reduce(function (a, m) { a[m.userId] = 1; return a; }, {})).length,
      penukaran: DB.all('poinTukar').length
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig, aktif: aktif, nama: nama,
    mutasi: mutasi, saldo: saldo, tulis: tulis, sudahAda: sudahAda,
    poinPeriode: poinPeriode, jenjang: jenjang,
    hitung: hitung, beri: beri,
    batch: batch, akanHangus: akanHangus, segarkan: segarkan,
    katalogAktif: katalogAktif, itemKatalog: itemKatalog, tukar: tukar,
    voucherAktif: voucherAktif, pakaiVoucher: pakaiVoucher, tukarVoucher: tukarVoucher,
    kembalikanVoucher: kembalikanVoucher, voucherUntuk: voucherUntuk, potongan: potongan,
    ringkasUser: ringkasUser, statistik: statistik
  };
})();
