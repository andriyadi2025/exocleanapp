/* ==========================================================================
   kompetensi.js — Fungsi Kerja mitra & sertifikasi kompetensinya
   --------------------------------------------------------------------------
   Mitra memilih sendiri fungsi kerja yang ingin ia jalani. Pilihan itu belum
   memberi hak apa pun — ia baru menjadi hak setelah kursus pembukanya lulus
   dan sertifikatnya terbit.

   TIGA LAPIS YANG HARUS LENGKAP SEBELUM SEORANG MITRA BOLEH DITUGASKAN:

     1. Onboarding mitra selesai   (S&K, berkas, 5 kursus wajib, disetujui)
     2. Fungsi kerja didaftarkan   (mitra memilih sendiri)
     3. Sertifikat fungsi berlaku  (lulus kursus fungsi, belum kedaluwarsa)

   Status kompetensi TIDAK PERNAH DISIMPAN sebagai teks — selalu dihitung
   ulang dari progres belajar dan sertifikat yang ada. Dengan begitu tidak
   ada jalan menandai seseorang "kompeten" tanpa ia benar-benar lulus, dan
   sertifikat yang kedaluwarsa otomatis menutup penugasan tanpa perlu ada
   yang mengubahnya secara manual.
   ========================================================================== */
var KOMPETENSI = (function () {

  /* ================================================================ FUNGSI KERJA
     Tiap fungsi dibuka oleh satu kursus. Dua di antaranya memakai kursus
     spesialisasi yang sudah ada sejak awal (Ketinggian & AC). */
  var FUNGSI = [
    { kode: 'FK-CLEAN', nama: 'Cleaning Service', ikon: '🧹', kursus: 'FK-CLEAN', risiko: 'rendah',
      ket: 'Pembersihan ruangan, toilet, dapur, kulkas, toren, dan kolam renang.' },
    { kode: 'FK-UPHOL', nama: 'Cuci Furnitur & Tekstil', ikon: '🛋️', kursus: 'FK-UPHOL', risiko: 'rendah',
      ket: 'Cuci kasur, sofa, kursi, karpet, gorden, boneka, dan vakum tungau.' },
    { kode: 'FK-AC', nama: 'Perawatan AC', ikon: '❄️', kursus: 'AC', risiko: 'sedang',
      ket: 'Cuci, pengecekan, overhaul, vacuum, dan pengisian freon.' },
    { kode: 'FK-POLES', nama: 'Poles Lantai', ikon: '✨', kursus: 'FK-POLES', risiko: 'sedang',
      ket: 'Kristalisasi dan pemolesan marmer, granit, dan traso.' },
    { kode: 'FK-KETINGGIAN', nama: 'Kerja Ketinggian & Fasad', ikon: '🧗', kursus: 'KETINGGIAN', risiko: 'tinggi',
      ket: 'Cuci kaca gedung, fasad, ACP, dan pekerjaan dengan rope access.' },
    { kode: 'FK-PEST', nama: 'Pest Control & Disinfektan', ikon: '🐛', kursus: 'FK-PEST', risiko: 'tinggi',
      ket: 'Pengendalian hama, disinfektan ruangan, dan fumigasi.' },
    { kode: 'FK-KENDARAAN', nama: 'Cuci & Detailing Kendaraan', ikon: '🚿', kursus: 'FK-KENDARAAN', risiko: 'rendah',
      ket: 'Cuci reguler, drywash, detailing, fogging, dan cuci mesin.' },
    { kode: 'FK-TAMAN', nama: 'Gardener & Pertamanan', ikon: '🌿', kursus: 'FK-TAMAN', risiko: 'sedang',
      ket: 'Potong rumput, pemangkasan pohon, penanaman, dan land clearing.' },
    { kode: 'FK-PLUMB', nama: 'Plumbing & Sedot Toilet', ikon: '🔧', kursus: 'FK-PLUMB', risiko: 'tinggi',
      ket: 'Perbaikan jalur air, saluran mampet, dan penyedotan tinja.' },
    { kode: 'FK-LAUNDRY', nama: 'Laundry & Setrika', ikon: '👔', kursus: 'FK-LAUNDRY', risiko: 'rendah',
      ket: 'Pencucian, dry cleaning, dan jasa setrika per jam.' },
    { kode: 'FK-CARE', nama: 'Care Giver', ikon: '🤱', kursus: 'FK-CARE', risiko: 'tinggi',
      ket: 'Pendampingan lansia, anak, dan bayi di rumah klien.' },
    { kode: 'FK-BEAUTY', nama: 'Massage & Beauty Care', ikon: '💆', kursus: 'FK-BEAUTY', risiko: 'tinggi',
      ket: 'Pijat panggilan, hair care, body care, pedicure, dan waxing.' },
    { kode: 'FK-MASAK', nama: 'Juru Masak', ikon: '👨‍🍳', kursus: 'FK-MASAK', risiko: 'sedang',
      ket: 'Juru masak panggilan untuk berbagai jenis masakan.' },
    { kode: 'FK-DRIVER', nama: 'Driver, Kurir & Pindahan', ikon: '🚗', kursus: 'FK-DRIVER', risiko: 'sedang',
      ket: 'Mengemudi, kurir, pindahan, dan pengiriman kendaraan.' },
    { kode: 'FK-HOSPITALITY', nama: 'Pelayanan Tamu & Pendampingan', ikon: '🍽️', kursus: 'FK-HOSPITALITY', risiko: 'rendah',
      ket: 'Waitress, travel assistant, guide tour, dan penerjemah.' }
  ];

  var RISIKO = {
    rendah: { t: 'Risiko rendah', c: 'ok' },
    sedang: { t: 'Risiko sedang', c: 'warn' },
    tinggi: { t: 'Risiko tinggi', c: 'danger' }
  };

  /* Layanan lama (sebelum katalog xlsx) yang perlu dipetakan ke fungsi kerja.
     Layanan dari katalog membawa field `fungsi` sendiri. */
  var PETA_LAMA = {
    'GC-GD': 'FK-CLEAN', 'GC-RM': 'FK-CLEAN', 'DC-RM': 'FK-CLEAN', 'PH': 'FK-CLEAN',
    'NB': 'FK-CLEAN', 'SLB': 'FK-CLEAN', 'CK-RK': 'FK-CLEAN',
    'CK-EX': 'FK-KETINGGIAN', 'CK-RA': 'FK-KETINGGIAN', 'ACP': 'FK-KETINGGIAN',
    'PLM': 'FK-POLES',
    'CKP': 'FK-UPHOL', 'CSF': 'FK-UPHOL', 'CSB': 'FK-UPHOL',
    'AC-SPL': 'FK-AC', 'AC-CST': 'FK-AC', 'AC-DCT': 'FK-AC', 'AC-FRE': 'FK-AC',
    'KF': 'FK-KETINGGIAN', 'SLK': 'FK-KETINGGIAN', 'CS': 'FK-KETINGGIAN'
  };

  function fungsi(kode) { var r = null; FUNGSI.forEach(function (f) { if (f.kode === kode) r = f; }); return r; }
  function semuaFungsi() { return FUNGSI.slice(); }

  /** Fungsi kerja yang dibutuhkan satu layanan. */
  function fungsiLayanan(svc) {
    if (!svc) return null;
    if (svc.fungsi) return svc.fungsi;
    return PETA_LAMA[svc.kode] || null;
  }

  function layananFungsi(kodeFungsi) {
    return DB.all('services').filter(function (s) {
      return s.tipe !== 'paket' && fungsiLayanan(s) === kodeFungsi; });
  }

  /* ================================================================ KURSUS PEMBUKA */
  /** Record kursus di tabel `kursus` untuk satu fungsi kerja. */
  function kursusFungsi(kodeFungsi) {
    var f = fungsi(kodeFungsi);
    if (!f) return null;
    return DB.all('kursus').filter(function (k) { return k.kode === f.kursus; })[0] || null;
  }

  /* ================================================================ PENDAFTARAN
     Pilihan mitra disimpan sebagai daftar kode fungsi pada user. Ini satu-
     satunya bagian yang berupa keinginan; sisanya dihitung dari bukti. */
  function pilihan(u) { return (u && u.fungsiKerja) || []; }

  function daftarkan(userId, kodeFungsi) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (!fungsi(kodeFungsi)) return { error: I18N.t('Fungsi kerja tidak dikenal') };
    var list = pilihan(u).slice();
    if (list.indexOf(kodeFungsi) >= 0) return { error: I18N.t('Fungsi kerja ini sudah Anda daftarkan') };
    list.push(kodeFungsi);
    DB.update('users', userId, { fungsiKerja: list });
    DB.log(userId, 'Mendaftar fungsi kerja ' + fungsi(kodeFungsi).nama, 'user', userId);
    return { ok: true };
  }

  /**
   * Batalkan pendaftaran. Fungsi yang sudah tersertifikasi tidak bisa
   * dibatalkan sendiri — sertifikatnya sudah terbit dan menjadi rekam jejak;
   * penonaktifan seperti itu urusan admin.
   */
  function batalkan(userId, kodeFungsi) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (status(u, kodeFungsi).kode === 'aktif') {
      return { error: I18N.t('Fungsi kerja yang sudah tersertifikasi tidak bisa dibatalkan sendiri.') + ' ' +
        I18N.t('Hubungi admin bila Anda ingin berhenti menerima pekerjaan ini.') };
    }
    DB.update('users', userId, {
      fungsiKerja: pilihan(u).filter(function (k) { return k !== kodeFungsi; }) });
    DB.log(userId, 'Membatalkan pendaftaran fungsi kerja ' + kodeFungsi, 'user', userId);
    return { ok: true };
  }

  /* ================================================================ STATUS (dihitung) */
  var TAHAP = {
    belum:    { t: 'Belum didaftarkan', c: 'muted', ic: '○' },
    terkunci: { t: 'Menunggu onboarding selesai', c: 'muted', ic: '🔒' },
    belajar:  { t: 'Sedang belajar', c: 'info', ic: '📖' },
    ujian:    { t: 'Siap ujian sertifikasi', c: 'warn', ic: '📝' },
    aktif:    { t: 'Tersertifikasi', c: 'ok', ic: '✅' },
    kedaluwarsa: { t: 'Sertifikat kedaluwarsa', c: 'danger', ic: '⏰' }
  };

  /**
   * Status satu fungsi kerja bagi satu mitra — selalu dihitung ulang dari
   * progres dan sertifikat, tidak pernah dari field status yang disimpan.
   */
  function status(u, kodeFungsi) {
    var f = fungsi(kodeFungsi);
    var hasil = function (kode, extra) {
      return Object.assign({ kode: kode, fungsi: f }, TAHAP[kode], extra || {});
    };
    if (!u || !f) return hasil('belum');
    if (pilihan(u).indexOf(kodeFungsi) < 0) return hasil('belum');

    var k = kursusFungsi(kodeFungsi);
    if (!k) return hasil('belajar', { persen: 0 });

    /* sertifikat yang pernah terbit untuk kursus ini */
    var sert = DB.where('sertifikat', function (x) {
      return x.userId === u.id && x.kursusId === k.id; });
    var berlaku = sert.filter(function (x) { return LMS.sertifikatBerlaku(x); });
    if (berlaku.length) {
      var terbaru = U.sortBy(berlaku, function (x) { return x.terbitAt; }, true)[0];
      return hasil('aktif', { sertifikat: terbaru, kursus: k });
    }
    if (sert.length) {
      return hasil('kedaluwarsa', {
        sertifikat: U.sortBy(sert, function (x) { return x.terbitAt; }, true)[0], kursus: k });
    }

    /* belum bersertifikat: apakah onboarding dasarnya sudah beres? */
    if (!LMS.semuaWajibLulus(u.id)) return hasil('terkunci', { kursus: k });

    var persen = LMS.persenKursus(u.id, k.id);
    var materiSelesai = LMS.materiTuntas(u.id, k.id);
    return hasil(materiSelesai ? 'ujian' : 'belajar', { kursus: k, persen: persen });
  }

  /** Ringkasan seluruh fungsi kerja seorang mitra. */
  function rekap(u) {
    return FUNGSI.map(function (f) {
      return Object.assign({ f: f }, status(u, f.kode)); });
  }

  function fungsiAktif(u) {
    return FUNGSI.filter(function (f) { return status(u, f.kode).kode === 'aktif'; });
  }

  /* ================================================================ GERBANG PENUGASAN */
  /**
   * Bolehkah mitra ini mengerjakan layanan tersebut?
   * Layanan yang belum dipetakan ke fungsi mana pun tidak diblokir — supaya
   * menambah layanan baru tidak diam-diam mengunci seluruh tim.
   */
  function bolehLayanan(u, svc) {
    var kode = fungsiLayanan(svc);
    if (!kode) return true;
    return status(u, kode).kode === 'aktif';
  }

  /** Fungsi kerja yang dibutuhkan satu order (gabungan layanannya). */
  function fungsiOrder(o) {
    var out = [];
    (o && o.serviceIds || []).forEach(function (id) {
      var k = fungsiLayanan(BIZ.svc(id));
      if (k && out.indexOf(k) < 0) out.push(k);
    });
    return out;
  }

  /**
   * Periksa kesiapan seorang mitra untuk satu order.
   * Mengembalikan { boleh, kurang: [fungsi…] }.
   */
  function periksaOrder(u, o) {
    var perlu = fungsiOrder(o);
    var kurang = perlu.filter(function (k) { return status(u, k).kode !== 'aktif'; });
    return { boleh: kurang.length === 0, perlu: perlu, kurang: kurang.map(fungsi) };
  }

  /** Mitra aktif yang tersertifikasi untuk seluruh layanan pada order ini. */
  function mitraUntukOrder(o) {
    return BIZ.mitraAktif().filter(function (u) { return periksaOrder(u, o).boleh; });
  }

  /** Mitra aktif yang tersertifikasi untuk satu fungsi kerja. */
  function mitraFungsi(kodeFungsi) {
    return BIZ.mitraAktif().filter(function (u) { return status(u, kodeFungsi).kode === 'aktif'; });
  }

  /* ================================================================ RINGKASAN ADMIN */
  function statistik() {
    var mitra = DB.all('users').filter(function (u) { return u.role === 'worker' && u.aktif; });
    var perFungsi = FUNGSI.map(function (f) {
      var r = mitra.map(function (u) { return status(u, f.kode); });
      return {
        fungsi: f,
        aktif: r.filter(function (x) { return x.kode === 'aktif'; }).length,
        proses: r.filter(function (x) { return ['belajar', 'ujian'].indexOf(x.kode) >= 0; }).length,
        kedaluwarsa: r.filter(function (x) { return x.kode === 'kedaluwarsa'; }).length,
        layanan: layananFungsi(f.kode).length
      };
    });
    return {
      fungsi: FUNGSI.length,
      mitra: mitra.length,
      tanpaFungsi: mitra.filter(function (u) { return !fungsiAktif(u).length; }).length,
      kosong: perFungsi.filter(function (x) { return x.aktif === 0; }),
      perFungsi: perFungsi,
      rataFungsiPerMitra: mitra.length
        ? Math.round(U.sum(mitra, function (u) { return fungsiAktif(u).length; }) / mitra.length * 10) / 10
        : 0
    };
  }

  function chipRisiko(r) {
    var m = RISIKO[r] || RISIKO.rendah;
    return '<span class="chip chip--' + m.c + ' chip--xs">' + I18N.t(m.t) + '</span>';
  }
  function chipStatus(kode) {
    var m = TAHAP[kode] || TAHAP.belum;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  return {
    FUNGSI: FUNGSI, TAHAP: TAHAP, RISIKO: RISIKO, PETA_LAMA: PETA_LAMA,
    fungsi: fungsi, semuaFungsi: semuaFungsi,
    fungsiLayanan: fungsiLayanan, layananFungsi: layananFungsi, kursusFungsi: kursusFungsi,
    pilihan: pilihan, daftarkan: daftarkan, batalkan: batalkan,
    status: status, rekap: rekap, fungsiAktif: fungsiAktif,
    bolehLayanan: bolehLayanan, fungsiOrder: fungsiOrder, periksaOrder: periksaOrder,
    mitraUntukOrder: mitraUntukOrder, mitraFungsi: mitraFungsi,
    statistik: statistik, chipRisiko: chipRisiko, chipStatus: chipStatus
  };
})();
