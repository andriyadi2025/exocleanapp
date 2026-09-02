/* ==========================================================================
   akses.js — Peran & Hak Akses (RBAC)
   --------------------------------------------------------------------------
   Dua lapis yang sengaja dipisah:

     1. PERSONA (field `role` pada user) — menentukan BENTUK aplikasi yang
        dipakai: admin, supervisor, client, worker, seller. Ini bukan urusan
        pengaturan sehari-hari; mengubahnya berarti mengganti aplikasi yang
        dilihat orang tersebut.

     2. PERAN AKSES (tabel `roles`) — menentukan MENU dan AKSI apa saja yang
        boleh dibuka di dalam persona itu. Inilah yang dikelola tim IT: bisa
        dibuat baru, diubah izinnya, dan dipasang ke tiap pegawai.

   Klien, Mitra Lapangan, dan Mitra Toko adalah pihak eksternal — aksesnya
   melekat pada personanya dan tidak diatur di sini, supaya tidak ada jalan
   untuk tidak sengaja memberi mereka akses ke data internal.

   PENGAMAN
     • Selalu tersisa minimal satu pengguna aktif dengan izin `sistem.role`.
     • Seseorang tidak bisa mencabut izin `sistem.role` miliknya sendiri.
     • Peran bawaan tidak bisa dihapus, hanya disalin lalu diubah.
   ========================================================================== */
var AKSES = (function () {

  /* ================================================================ KATALOG IZIN */
  var MODUL = [
    { id: 'crm', nama: 'CRM & Pelanggan', ic: '🎯' },
    { id: 'penjualan', nama: 'Penjualan', ic: '📄' },
    { id: 'operasional', nama: 'Operasional Lapangan', ic: '🧹' },
    { id: 'keuangan', nama: 'Keuangan', ic: '💰' },
    { id: 'marketplace', nama: 'Marketplace', ic: '🏬' },
    { id: 'mitra', nama: 'Kemitraan & Pembelajaran', ic: '🎓' },
    { id: 'master', nama: 'Master Data', ic: '🗂️' },
    { id: 'komunikasi', nama: 'Komunikasi', ic: '💬' },
    { id: 'sistem', nama: 'Sistem & Pengaturan', ic: '⚙️' }
  ];

  /** Setiap izin: id, modul, nama, keterangan, dan apakah tergolong berisiko. */
  var IZIN = [
    /* --- CRM --- */
    { id: 'crm.lihat', m: 'crm', n: 'Lihat pipeline & pelanggan',
      k: 'Membuka papan prospek, agenda follow-up, dan profil pelanggan.' },
    { id: 'crm.kelola', m: 'crm', n: 'Kelola prospek & aktivitas',
      k: 'Menambah/mengubah prospek, memindahkan tahap, mencatat aktivitas.' },
    { id: 'crm.kampanye', m: 'crm', n: 'Jalankan kampanye WhatsApp',
      k: 'Menyiapkan pesan massal ke segmen pelanggan.', risiko: true },

    /* --- Penjualan --- */
    { id: 'penjualan.permintaan', m: 'penjualan', n: 'Kelola permintaan masuk',
      k: 'Menindaklanjuti permintaan layanan dari klien.' },
    { id: 'penjualan.penawaran.lihat', m: 'penjualan', n: 'Lihat penawaran',
      k: 'Membuka daftar dan isi dokumen penawaran.' },
    { id: 'penjualan.penawaran.kelola', m: 'penjualan', n: 'Buat & kirim penawaran',
      k: 'Menyusun penawaran harga dan mengirimkannya ke klien.', risiko: true },

    /* --- Operasional --- */
    { id: 'operasional.order.lihat', m: 'operasional', n: 'Lihat order & jadwal',
      k: 'Membuka kalender, daftar order, dan detail pekerjaan.' },
    { id: 'operasional.order.kelola', m: 'operasional', n: 'Buat & ubah order',
      k: 'Menjadwalkan pekerjaan, menugaskan tim, membatalkan order.' },
    { id: 'operasional.qc', m: 'operasional', n: 'Verifikasi mutu (QC)',
      k: 'Menilai hasil kerja dan menyatakan lulus atau perlu perbaikan.' },
    { id: 'operasional.monitoring', m: 'operasional', n: 'Pantau lapangan',
      k: 'Melihat absensi GPS dan foto yang masuk dari petugas.' },
    { id: 'operasional.komplain', m: 'operasional', n: 'Tangani komplain',
      k: 'Menindaklanjuti keluhan klien dan menjadwalkan pengerjaan ulang.' },

    /* --- Keuangan --- */
    { id: 'keuangan.invoice.lihat', m: 'keuangan', n: 'Lihat invoice & tagihan',
      k: 'Membuka daftar invoice dan riwayat pembayaran.' },
    { id: 'keuangan.invoice.kelola', m: 'keuangan', n: 'Terbitkan invoice & catat pembayaran',
      k: 'Menerbitkan tagihan dan mencatat dana masuk.', risiko: true },
    { id: 'keuangan.bagihasil.lihat', m: 'keuangan', n: 'Lihat bagi hasil mitra',
      k: 'Melihat estimasi dan slip pencairan mitra lapangan.' },
    { id: 'keuangan.bagihasil.setujui', m: 'keuangan', n: 'Setujui & bayar bagi hasil',
      k: 'Menyetujui slip dan menandai transfer ke mitra.', risiko: true },
    { id: 'keuangan.laporan', m: 'keuangan', n: 'Lihat laporan bisnis',
      k: 'Membuka pendapatan, margin, dan rekap kinerja.' },

    /* --- Marketplace --- */
    { id: 'marketplace.lihat', m: 'marketplace', n: 'Lihat marketplace',
      k: 'Membuka daftar mitra toko, produk, dan pesanan.' },
    { id: 'marketplace.toko', m: 'marketplace', n: 'Verifikasi mitra toko',
      k: 'Menyetujui, menolak, atau menonaktifkan toko.', risiko: true },
    { id: 'marketplace.produk', m: 'marketplace', n: 'Moderasi produk',
      k: 'Menyetujui atau menolak produk yang didaftarkan penjual.' },
    { id: 'marketplace.pencairan', m: 'marketplace', n: 'Proses pencairan penjual',
      k: 'Memproses dan menandai transfer dana ke mitra toko.', risiko: true },
    { id: 'marketplace.kampanye', m: 'marketplace', n: 'Kelola kampanye & event',
      k: 'Membuat kampanye diskon dan mengatur pembagian bebannya.' },
    { id: 'marketplace.tarif', m: 'marketplace', n: 'Atur komisi & tarif',
      k: 'Mengubah persentase komisi, ongkir, dan tarif iklan.', risiko: true },

    /* --- Kemitraan & LMS --- */
    { id: 'mitra.lihat', m: 'mitra', n: 'Lihat rekrutmen mitra',
      k: 'Membuka progres onboarding dan hasil belajar calon mitra.' },
    { id: 'mitra.setujui', m: 'mitra', n: 'Setujui / tolak mitra',
      k: 'Memutuskan calon mitra diterima atau ditolak.', risiko: true },
    { id: 'mitra.lms', m: 'mitra', n: 'Kelola pembelajaran',
      k: 'Mengubah kursus, materi, dan soal ujian.' },
    /* Tarif pasar SENGAJA berdiri sendiri, terpisah dari 'mitra.setujui'.
       Menyetujui mitra adalah keputusan mutu; menetapkan tarifnya adalah
       keputusan harga yang langsung terlihat pelanggan di EXOCLEAN App dan
       langsung menentukan penghasilan mitra. Keduanya pantas dipegang orang
       yang berbeda — dan karena peran Super Admin (IT) ditandai `semuaIzin`,
       izin baru ini otomatis hanya dimilikinya sampai diberikan ke peran lain. */
    { id: 'mitra.tarif', m: 'mitra', n: 'Tetapkan tarif pasar mitra',
      k: 'Menentukan tarif per jam tiap juru bersih dan menayangkannya di EXOCLEAN App.',
      risiko: true },

    /* --- Master Data --- */
    { id: 'master.layanan', m: 'master', n: 'Kelola katalog layanan',
      k: 'Mengubah nama, harga, dan checklist layanan.' },
    { id: 'master.produk', m: 'master', n: 'Kelola produk & stok EXOCLEAN',
      k: 'Menambah produk toko resmi dan menyesuaikan stok.' },
    { id: 'master.pegawai', m: 'master', n: 'Kelola pegawai & tim',
      k: 'Menambah akun, mengubah data, menyusun tim.', risiko: true },

    /* --- Komunikasi --- */
    { id: 'komunikasi.wa.lihat', m: 'komunikasi', n: 'Lihat WhatsApp Outbox',
      k: 'Membaca antrean pesan yang disiapkan sistem.' },
    { id: 'komunikasi.wa.kirim', m: 'komunikasi', n: 'Kirim pesan WhatsApp',
      k: 'Membuka WhatsApp dan menandai pesan terkirim.' },
    { id: 'komunikasi.surat', m: 'komunikasi', n: 'Kirim surat & atur pengingat',
      k: 'Membaca kotak keluar email, mengirim invoice dan penawaran ke email klien, ' +
         'serta menyalakan pengingat pembayaran otomatis.' },
    { id: 'komunikasi.moderasi', m: 'komunikasi', n: 'Kelola moderasi percakapan',
      k: 'Mengatur mode penyaring kata tidak pantas, kamus, dan pengecualiannya, ' +
         'serta meninjau catatan pelanggaran. Pemegang izin ini juga melihat teks ' +
         'yang disensor dalam bentuk utuh.', risiko: true },
    { id: 'komunikasi.chat.awasi', m: 'komunikasi', n: 'Baca obrolan klien–mitra',
      k: 'Membuka percakapan milik orang lain untuk penyelesaian sengketa. ' +
         'Hanya membaca, tidak bisa membalas, dan setiap pembacaan tercatat di log aktivitas.',
      risiko: true },

    /* --- Sistem --- */
    { id: 'sistem.bayar', m: 'sistem', n: 'Pengaturan pembayaran',
      k: 'Mengatur gateway, kanal bayar, dan kebijakan biaya.', risiko: true },
    { id: 'sistem.peta', m: 'sistem', n: 'Pengaturan peta & ongkir',
      k: 'Mengubah API key peta dan tarif ongkos kirim.', risiko: true },
    { id: 'sistem.akun', m: 'sistem', n: 'Pengaturan akun & login',
      k: 'Mengatur Client ID Google/Facebook dan ketentuan verifikasi OTP.', risiko: true },
    { id: 'sistem.poin', m: 'sistem', n: 'Tentukan ketentuan poin reward',
      k: 'Mengubah aturan perolehan, jenjang member, katalog penukaran, dan masa berlaku poin. ' +
         'Poin adalah utang perusahaan kepada pelanggan — setiap perubahan di sini berdampak langsung ke biaya.',
      risiko: true },
    { id: 'sistem.voucher', m: 'sistem', n: 'Tentukan ketentuan voucher',
      k: 'Membuat produk voucher beserta nilainya, menerbitkan voucher manual, ' +
         'membatalkan voucher, dan menjalankan pengundian. Voucher bernilai uang ' +
         'adalah utang perusahaan — setiap perubahan di sini berdampak langsung ke kas.',
      risiko: true },
    { id: 'sistem.undian', m: 'sistem', n: 'Kelola undian berhadiah',
      k: 'Membuka undian, mengatur hadiah dan kuota tiket, serta MENJALANKAN ' +
         'pengundian. Pengundian tidak bisa dibatalkan dan hadiah uang langsung ' +
         'masuk Dompet pemenang — karena itu izinnya dipisah dari voucher biasa.',
      risiko: true },
    { id: 'sistem.role', m: 'sistem', n: 'Kelola peran & hak akses',
      k: 'Membuat peran, mengubah izin, dan memasangnya ke pegawai.', risiko: true },
    { id: 'sistem.data', m: 'sistem', n: 'Ekspor / impor / reset data',
      k: 'Mengunduh salinan data dan mengembalikan ke data contoh.', risiko: true }
  ];

  function izin(id) { var r = null; IZIN.forEach(function (x) { if (x.id === id) r = x; }); return r; }
  function izinModul(m) { return IZIN.filter(function (x) { return x.m === m; }); }
  function semuaIzinId() { return IZIN.map(function (x) { return x.id; }); }

  /* ================================================================ PETA MENU → IZIN
     Ditaruh terpusat di sini supaya menambah menu baru tidak perlu menyunting
     berkas view mana pun — cukup daftarkan kuncinya di tabel ini. */
  var IZIN_HALAMAN = {
    /* admin */
    dashboard: null,                         /* selalu boleh */
    profil: null,
    pipeline: 'crm.lihat', agenda: 'crm.lihat', pelanggan: 'crm.lihat', kampanye: 'crm.kampanye',
    permintaan: 'penjualan.permintaan', penawaran: 'penjualan.penawaran.lihat',
    jadwal: 'operasional.order.lihat', order: 'operasional.order.lihat',
    komplain: 'operasional.komplain',
    invoice: 'keuangan.invoice.lihat', bagihasil: 'keuangan.bagihasil.lihat',
    penarikan: 'keuangan.bagihasil.lihat',
    laporan: 'keuangan.laporan', pembayaran: 'keuangan.invoice.lihat',
    setelanBayar: 'sistem.bayar', setelanAkun: 'sistem.akun',
    setelanKirim: 'sistem.peta',
    poin: 'sistem.poin',
    voucher: 'sistem.voucher',
    undian: 'sistem.undian',
    marketplace: 'marketplace.lihat', pesananToko: 'marketplace.lihat', produk: 'master.produk',
    afiliasi: 'marketplace.lihat',
    mitra: 'mitra.lihat', lms: 'mitra.lms', kompetensi: 'mitra.lihat',
    layanan: 'master.layanan', pegawai: 'master.pegawai',
    wa: 'komunikasi.wa.lihat',
    surat: 'komunikasi.surat',
    obrolan: 'komunikasi.chat.awasi',
    moderasi: 'komunikasi.moderasi',
    akses: 'sistem.role',
    /* supervisor */
    beranda: null, monitoring: 'operasional.monitoring', verifikasi: 'operasional.qc',
    tim: null
  };

  /* ================================================================ PERAN */
  function peran(id) { return DB.find('roles', id); }
  function semuaPeran() { return U.sortBy(DB.all('roles'), function (r) { return r.urutan || 99; }); }
  function peranPersona(p) { return semuaPeran().filter(function (r) { return r.persona === p && r.aktif; }); }

  function peranUser(u) {
    if (!u) return null;
    var r = u.roleId ? peran(u.roleId) : null;
    if (r) return r;
    /* pengguna lama tanpa roleId: pakai peran bawaan personanya */
    return semuaPeran().filter(function (x) {
      return x.persona === u.role && x.bawaanPersona; })[0] || null;
  }
  function namaPeran(u) {
    var r = peranUser(u);
    return r ? r.nama : (u && u.role === 'admin' ? 'Admin' : '—');
  }

  /** Daftar izin efektif seorang pengguna: izin peran + tambahan − cabutan. */
  function izinUser(u) {
    if (!u) return [];
    if (['client', 'worker', 'seller'].indexOf(u.role) >= 0) return [];
    var r = peranUser(u);

    /* Peran "semua izin" berarti SELURUH izin yang ada sekarang, bukan
       daftar yang tersimpan waktu peran itu dibuat.

       Bedanya menentukan: daftar tersimpan adalah cuplikan hari itu, jadi
       tiap izin yang ditambahkan pengembang sesudahnya tidak dimiliki siapa
       pun — termasuk Super Admin, yang lalu tidak bisa membuka halaman
       Peran & Hak Akses untuk memberikannya kepada dirinya sendiri. Fitur
       barunya ada, tetapi tidak terlihat oleh seorang pun, dan tidak ada
       galat yang menjelaskan kenapa.

       `kode === 'SUPER'` ikut diperiksa supaya basis data yang sudah
       terlanjur menyimpan cuplikan lama tetap pulih tanpa perlu dihapus. */
    if (r && (r.semuaIzin || r.kode === 'SUPER')) return semuaIzinId();

    var dasar = r ? (r.izin || []).slice() : [];
    (u.izinTambahan || []).forEach(function (i) { if (dasar.indexOf(i) < 0) dasar.push(i); });
    var cabut = u.izinDicabut || [];
    return dasar.filter(function (i) { return cabut.indexOf(i) < 0; });
  }

  /** Apakah pengguna (bawaan: yang sedang masuk) memiliki satu izin. */
  function boleh(izinId, u) {
    u = u || (window.APP && APP.user);
    if (!u) return false;
    if (!izinId) return true;
    return izinUser(u).indexOf(izinId) >= 0;
  }
  function bolehSalahSatu(list, u) {
    return (list || []).some(function (i) { return boleh(i, u); });
  }

  /**
   * Penjaga aksi: dipakai di awal handler yang mengubah data penting.
   * Mengembalikan false sambil memberi tahu pengguna bila izinnya tidak ada,
   * sehingga tombol yang lolos dari penyaringan tampilan tetap tertahan.
   */
  function jaga(izinId) {
    if (boleh(izinId)) return true;
    var x = izin(izinId);
    if (window.UI) {
      UI.toast(I18N.t('Akses ditolak — Anda tidak memiliki izin “{izin}”. ' +
        'Hubungi tim IT bila memang dibutuhkan.')
        .replace('{izin}', x ? x.n : izinId), 'err');
    }
    return false;
  }

  /**
   * Bungkus sebuah peta handler `data-act` dengan pemeriksaan izin.
   * aturan = { namaAksi: 'id.izin' }. Handler yang tidak disebut dibiarkan apa
   * adanya, sehingga cukup mendaftarkan aksi yang benar-benar mengubah data.
   */
  function lindungi(map, aturan) {
    Object.keys(aturan || {}).forEach(function (k) {
      var asli = map[k];
      if (!asli) return;
      map[k] = function (el, ev) { if (jaga(aturan[k])) asli(el, ev); };
    });
    return map;
  }

  /** Apakah satu kunci halaman boleh dibuka pengguna ini. */
  function bolehHalaman(key, u) {
    u = u || (window.APP && APP.user);
    if (!u) return false;
    /* Peran yang menunya ditentukan personanya sendiri, bukan matriks izin
       admin. Korporat termasuk: ia hanya melihat area dan petugasnya sendiri,
       dan tidak pernah menyentuh data EXOCLEAN. */
    /* Staf korporat MCS punya penjaganya sendiri sejak ada perusahaan
       berjaringan: kepala cabang Surabaya tidak perlu penggajian cabang
       Medan. Selama MCSAKSES belum termuat — index.html dan mitra.html
       tidak memuatnya — perilakunya persis seperti dulu. */
    if (u.role === 'korporat' && window.MCSAKSES) {
      return MCSAKSES.bolehHalaman(key, u);
    }
    if (['client', 'worker', 'seller', 'korporat', 'petugas', 'penghuni']
        .indexOf(u.role) >= 0) return true;
    if (!(key in IZIN_HALAMAN)) return true;   /* menu yang belum dipetakan tidak diblokir diam-diam */
    return boleh(IZIN_HALAMAN[key], u);
  }

  /* ================================================================ PENGAMAN */
  /** Pengguna aktif yang masih memegang izin pengelolaan peran. */
  function pemegangKunci() {
    return DB.all('users').filter(function (u) {
      return u.aktif && ['admin', 'supervisor'].indexOf(u.role) >= 0 && boleh('sistem.role', u); });
  }
  /**
   * Periksa apakah sebuah perubahan aman dijalankan.
   * Mengembalikan pesan penolakan, atau null bila aman.
   */
  function periksaPerubahan(simulasi) {
    var sisa = DB.all('users').filter(function (u) {
      if (!u.aktif || ['admin', 'supervisor'].indexOf(u.role) < 0) return false;
      return simulasi(u);
    });
    if (!sisa.length) {
      return I18N.t('Perubahan ini membuat tidak ada lagi pengguna yang bisa mengelola hak akses.') + ' ' +
        I18N.t('Beri izin "Kelola peran & hak akses" ke pengguna lain terlebih dahulu.');
    }
    return null;
  }

  /* ================================================================ CRUD PERAN */
  function buatPeran(data, olehId) {
    var r = DB.insert('roles', {
      kode: data.kode, nama: data.nama, deskripsi: data.deskripsi || '',
      persona: data.persona || 'admin', izin: data.izin || [],
      bawaan: false, bawaanPersona: false, aktif: true,
      urutan: DB.all('roles').length + 1
    });
    DB.log(olehId, 'Membuat peran akses "' + r.nama + '"', 'role', r.id);
    return r;
  }

  function simpanPeran(id, patch, olehId) {
    var lama = peran(id);
    if (!lama) return { error: I18N.t('Peran tidak ditemukan') };

    /* bila izin sistem.role dicabut dari peran ini, pastikan masih ada pemegangnya */
    if (patch.izin && (lama.izin || []).indexOf('sistem.role') >= 0 &&
        patch.izin.indexOf('sistem.role') < 0) {
      var pesan = periksaPerubahan(function (u) {
        var r = peranUser(u);
        if (r && r.id === id) {
          return (u.izinTambahan || []).indexOf('sistem.role') >= 0;
        }
        return boleh('sistem.role', u);
      });
      if (pesan) return { error: pesan };
    }

    DB.update('roles', id, patch);
    DB.log(olehId, 'Mengubah peran akses "' + (patch.nama || lama.nama) + '"', 'role', id);
    return { peran: peran(id) };
  }

  function hapusPeran(id, olehId) {
    var r = peran(id);
    if (!r) return { error: I18N.t('Peran tidak ditemukan') };
    if (r.bawaan) return { error: I18N.t('Peran bawaan tidak bisa dihapus. Salin dulu bila ingin versi lain.') };
    var dipakai = DB.all('users').filter(function (u) { return u.roleId === id; });
    if (dipakai.length) {
      return { error: I18N.t('Masih dipakai {n} pengguna ({nama}). ' +
        'Pindahkan mereka ke peran lain dulu.')
        .replace('{n}', dipakai.length)
        .replace('{nama}', dipakai.slice(0, 3)
          .map(function (u) { return u.nama; }).join(', ')) };
    }
    DB.remove('roles', id);
    DB.log(olehId, 'Menghapus peran akses "' + r.nama + '"', 'role', id);
    return { ok: true };
  }

  function salinPeran(id, olehId) {
    var r = peran(id);
    if (!r) return null;
    return buatPeran({ kode: r.kode + '-COPY', nama: r.nama + ' (salinan)',
      deskripsi: r.deskripsi, persona: r.persona, izin: (r.izin || []).slice() }, olehId);
  }

  /* ================================================================ PASANG KE PENGGUNA */
  function pasangPeran(userId, roleId, olehId) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    var r = peran(roleId);
    if (!r) return { error: I18N.t('Peran tidak ditemukan') };
    if (r.persona !== u.role) {
      return { error: 'Peran "' + r.nama + '" diperuntukkan bagi persona ' + r.persona +
        I18N.t(', sedangkan pengguna ini') + ' ' + u.role + '.' };
    }
    /* jangan sampai pemegang kunci terakhir kehilangan aksesnya */
    if (boleh('sistem.role', u) && (r.izin || []).indexOf('sistem.role') < 0) {
      var pesan = periksaPerubahan(function (x) {
        return x.id === userId ? false : boleh('sistem.role', x); });
      if (pesan) return { error: pesan };
    }
    DB.update('users', userId, { roleId: roleId, izinTambahan: [], izinDicabut: [] });
    DB.log(olehId, 'Memasang peran "' + r.nama + '" ke ' + u.nama, 'user', userId);
    return { user: DB.find('users', userId) };
  }

  /** Penyesuaian izin khusus satu orang, di luar peran yang dipakainya. */
  function aturIzinKhusus(userId, tambahan, dicabut, olehId) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (window.APP && APP.user && APP.user.id === userId &&
        (dicabut || []).indexOf('sistem.role') >= 0) {
      return { error: I18N.t('Anda tidak bisa mencabut izin pengelolaan hak akses milik sendiri.') };
    }
    DB.update('users', userId, { izinTambahan: tambahan || [], izinDicabut: dicabut || [] });
    DB.log(olehId, 'Menyesuaikan izin khusus ' + u.nama, 'user', userId);
    return { user: DB.find('users', userId) };
  }

  /* ================================================================ RINGKASAN */
  function pegawai() {
    return DB.all('users').filter(function (u) {
      return ['admin', 'supervisor'].indexOf(u.role) >= 0; });
  }
  function jumlahPemakai(roleId) {
    return DB.all('users').filter(function (u) { return u.roleId === roleId; }).length;
  }
  function statistik() {
    var p = pegawai();
    return {
      peran: DB.all('roles').length,
      pegawai: p.length,
      tanpaPeran: p.filter(function (u) { return !u.roleId; }).length,
      denganPenyesuaian: p.filter(function (u) {
        return (u.izinTambahan || []).length || (u.izinDicabut || []).length; }).length,
      pemegangKunci: pemegangKunci().length,
      izin: IZIN.length, modul: MODUL.length
    };
  }

  /** Riwayat perubahan hak akses, diambil dari log aktivitas. */
  function riwayat(batas) {
    return U.sortBy(DB.all('activity').filter(function (a) {
      return a.refType === 'role' || /peran|hak akses|izin khusus/i.test(a.aksi || '');
    }), function (a) { return a.at; }, true).slice(0, batas || 30);
  }

  return {
    MODUL: MODUL, IZIN: IZIN, IZIN_HALAMAN: IZIN_HALAMAN,
    izin: izin, izinModul: izinModul, semuaIzinId: semuaIzinId,
    peran: peran, semuaPeran: semuaPeran, peranPersona: peranPersona,
    peranUser: peranUser, namaPeran: namaPeran, izinUser: izinUser,
    boleh: boleh, bolehSalahSatu: bolehSalahSatu, bolehHalaman: bolehHalaman, jaga: jaga, lindungi: lindungi,
    pemegangKunci: pemegangKunci, periksaPerubahan: periksaPerubahan,
    buatPeran: buatPeran, simpanPeran: simpanPeran, hapusPeran: hapusPeran, salinPeran: salinPeran,
    pasangPeran: pasangPeran, aturIzinKhusus: aturIzinKhusus,
    pegawai: pegawai, jumlahPemakai: jumlahPemakai, statistik: statistik, riwayat: riwayat
  };
})();
