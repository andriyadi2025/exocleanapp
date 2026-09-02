/* ==========================================================================
   afiliasi.js — program afiliasi untuk pengguna klien
   --------------------------------------------------------------------------
   Klien membagikan tautan berkode miliknya. Bila orang lain mendaftar dan
   berbelanja lewat tautan itu, klien mendapat komisi. Besaran komisinya
   ditentukan admin, bukan tertanam di kode.

   ALUR UANGNYA

     klik tautan          → tercatat (belum bernilai)
     orang mendaftar      → menjadi referral, melekat permanen ke pengupline
     referral bertransaksi→ komisi TERTUNDA (belum bisa ditarik)
     masa tahan lewat     → komisi MATANG, masuk saldo dompet
     ditarik              → lewat menu Dompet, bergerbang PIN

   KENAPA ADA MASA TAHAN
   Pesanan bisa dibatalkan, dikembalikan, atau gagal bayar setelah komisi
   terhitung. Menahan komisi beberapa hari mencegah membayar komisi atas
   transaksi yang akhirnya batal — dan itu jauh lebih mudah daripada menagih
   kembali uang yang sudah ditarik.

   Komisi TIDAK PERNAH disimpan sebagai angka bebas: setiap barisnya merujuk
   dokumen sumbernya (invoice atau pesanan toko) dan menyimpan dasar
   perhitungan yang dibekukan saat itu, sehingga perubahan tarif kemudian
   tidak pernah mengubah komisi yang sudah terbit.
   ========================================================================== */
var AFILIASI = (function () {

  var BAWAAN = {
    aktif: true,
    persetujuanOtomatis: true,   /* klien langsung jadi affiliate tanpa antre */
    komisiJasa: 5,               /* % dari nilai pekerjaan */
    komisiProduk: 3,             /* % dari subtotal produk */
    komisiPendaftaran: 10000,    /* rupiah per referral yang transaksi pertama */
    hariTahan: 14,
    masaLekatHari: 90,           /* berapa lama referral tetap dihitung */
    minTarik: 50000,
    batasTransaksi: 0            /* 0 = tanpa batas jumlah transaksi berkomisi */
  };

  function config() {
    return Object.assign({}, BAWAAN, (DB.raw.settings || {}).afiliasi || {});
  }
  function simpanConfig(patch, adminId) {
    DB.raw.settings = DB.raw.settings || {};
    DB.raw.settings.afiliasi = Object.assign({}, config(), patch);
    DB.save(true); DB.emit();
    if (adminId) DB.log(adminId, 'Mengubah ketentuan program afiliasi', 'setting', 'afiliasi');
    return config();
  }

  /* ================================================================ KEANGGOTAAN */
  var STATUS = {
    menunggu: { t: 'Menunggu persetujuan', c: 'warn' },
    aktif:    { t: 'Aktif', c: 'ok' },
    ditolak:  { t: 'Ditolak', c: 'danger' },
    berhenti: { t: 'Dinonaktifkan', c: 'muted' }
  };
  function chip(s) {
    var m = STATUS[s] || STATUS.menunggu;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  function data(u) { return (u && u.afiliasi) || null; }
  function aktif(u) { var a = data(u); return !!(a && a.status === 'aktif'); }

  /** Kode rujukan yang mudah diucapkan lewat telepon — tanpa huruf rancu. */
  function buatKode(nama) {
    var dasar = String(nama || 'EXO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'EXO';
    var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var putar = 0; putar < 50; putar++) {
      var ekor = '';
      KRIPTO.acakByte(4).forEach(function (b) { ekor += ab[b % ab.length]; });
      var kode = dasar + ekor;
      if (!cariKode(kode)) return kode;
    }
    return dasar + Date.now().toString(36).toUpperCase().slice(-5);
  }

  function cariKode(kode) {
    var k = String(kode || '').toUpperCase();
    if (!k) return null;
    return DB.all('users').filter(function (u) {
      return u.afiliasi && u.afiliasi.kode === k; })[0] || null;
  }

  function daftar(userId) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (!config().aktif) return { error: I18N.t('Program afiliasi sedang tidak dibuka') };
    if (data(u)) return { error: I18N.t('Anda sudah terdaftar di program afiliasi') };
    if (!AKUN.statusVerifikasi(u).telp) {
      return { error: I18N.t('Verifikasi nomor HP Anda dulu sebelum mengikuti program afiliasi') };
    }

    var otomatis = config().persetujuanOtomatis;
    DB.update('users', userId, {
      afiliasi: {
        kode: buatKode(u.nama),
        status: otomatis ? 'aktif' : 'menunggu',
        daftarAt: U.nowISO(),
        disetujuiAt: otomatis ? U.nowISO() : null,
        klik: 0
      }
    });
    DB.log(userId, 'Mendaftar program afiliasi', 'user', userId);
    if (!otomatis) {
      var adm = BIZ.usersByRole('admin')[0];
      if (adm) DB.insert('waOutbox', { to: adm.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'user', refId: userId,
        pesan: (function () { var w = I18N.pesanUntuk(adm.id); return '*' + w('PENDAFTAR AFFILIATE BARU') + '* 🤝\n\n' +
          u.nama + '\n' + U.phoneDisplay(u.telp) + '\n\n' +
          w('Tinjau di menu Afiliasi & Dropship.'); })() });
    }
    return { ok: true, otomatis: otomatis };
  }

  function setujui(userId, adminId) {
    var u = DB.find('users', userId);
    if (!data(u)) return { error: I18N.t('Pengguna belum mendaftar afiliasi') };
    DB.update('users', userId, {
      afiliasi: Object.assign({}, u.afiliasi, { status: 'aktif', disetujuiAt: U.nowISO() }) });
    DB.insert('waOutbox', { to: userId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'user', refId: userId,
      pesan: (function () {
        var w = I18N.pesanUntuk(userId);
        return '*' + w('AFFILIATE DISETUJUI') + '* 🎉\n\n' +
          w('Kode rujukan Anda:') + ' *' + u.afiliasi.kode + '*\n\n' +
          w('Bagikan tautan produk dan layanan dari aplikasi — komisi otomatis tercatat.');
      })() });
    DB.log(adminId, 'Menyetujui affiliate ' + u.nama, 'user', userId);
    return { ok: true };
  }

  function ubahStatus(userId, status, adminId, alasan) {
    var u = DB.find('users', userId);
    if (!data(u)) return { error: I18N.t('Pengguna belum mendaftar afiliasi') };
    DB.update('users', userId, {
      afiliasi: Object.assign({}, u.afiliasi, { status: status, catatan: alasan || '' }) });
    DB.log(adminId, 'Mengubah status affiliate ' + u.nama + ' → ' + status, 'user', userId);
    return { ok: true };
  }

  /* ================================================================ TAUTAN & KLIK */
  function tautan(u, jenis, id) {
    var a = data(u);
    var dasar = location.origin + location.pathname;
    var q = '?ref=' + (a ? a.kode : '');
    if (jenis && id) q += '&' + jenis + '=' + encodeURIComponent(id);
    return dasar + q;
  }

  /** Klik dicatat sekali per pengunjung per hari, bukan per muat halaman. */
  function catatKlik(kode) {
    var pemilik = cariKode(kode);
    if (!pemilik || !aktif(pemilik)) return null;
    var kunci = RUANG.kunci('ref_klik');
    var hariIni = U.today();
    try {
      if (localStorage.getItem(kunci) === kode + '|' + hariIni) return null;
      localStorage.setItem(kunci, kode + '|' + hariIni);
    } catch (e) { /* storage diblokir — tetap catat */ }
    DB.update('users', pemilik.id, {
      afiliasi: Object.assign({}, pemilik.afiliasi, { klik: (pemilik.afiliasi.klik || 0) + 1 }) });
    return pemilik;
  }

  /** Simpan kode rujukan sampai pengunjung menyelesaikan pendaftaran. */
  function simpanRujukan(kode) {
    try { localStorage.setItem(RUANG.kunci('ref'), String(kode).toUpperCase()); } catch (e) {}
  }
  function ambilRujukan() {
    try { return localStorage.getItem(RUANG.kunci('ref')) || null; } catch (e) { return null; }
  }
  function hapusRujukan() { try { localStorage.removeItem(RUANG.kunci('ref')); } catch (e) {} }

  /* ================================================================ REFERRAL */
  function catatPendaftaran(kode, userBaruId) {
    var pemilik = cariKode(kode);
    if (!pemilik || !aktif(pemilik)) return null;
    if (pemilik.id === userBaruId) return null;               /* tidak bisa merujuk diri sendiri */
    var r = DB.insert('referral', {
      afiliatorId: pemilik.id, userId: userBaruId, kode: kode,
      daftarAt: U.nowISO(),
      /* masa lekat dibekukan saat pendaftaran — mengubah ketentuan nanti tidak
         boleh memperpanjang atau memangkas hak yang sudah melekat */
      lekatSampai: U.iso(U.addDays(new Date(), config().masaLekatHari)),
      transaksi: 0, komisiTotal: 0
    });
    hapusRujukan();
    DB.insert('waOutbox', { to: pemilik.id, template: 'manual', status: 'antre', sentAt: null,
      refType: 'referral', refId: r.id,
      pesan: (function () {
        var w = I18N.pesanUntuk(pemilik.id);
        return '*' + w('REFERRAL BARU') + '* 🎉\n\n' +
          w('{nama} mendaftar lewat tautan Anda.')
            .replace('{nama}', BIZ.nama(userBaruId)) + '\n\n' +
          w('Komisi masuk otomatis begitu ia bertransaksi.');
      })() });
    return r;
  }

  function referralSaya(userId) {
    return U.sortBy(DB.where('referral', { afiliatorId: userId }),
      function (r) { return r.daftarAt; }, true);
  }

  /** Referral yang menaungi satu pengguna, bila masih dalam masa lekat. */
  function upline(userId) {
    var r = DB.where('referral', { userId: userId })[0];
    if (!r) return null;
    if (U.diffDays(r.lekatSampai, new Date()) < 0) return null;   /* sudah lewat */
    var a = DB.find('users', r.afiliatorId);
    return aktif(a) ? { referral: r, afiliator: a } : null;
  }

  /* ================================================================ KOMISI */
  var ST_KOMISI = {
    tertunda: { t: 'Tertunda', c: 'warn' },
    matang:   { t: 'Masuk saldo', c: 'ok' },
    batal:    { t: 'Dibatalkan', c: 'danger' }
  };
  function chipKomisi(s) {
    var m = ST_KOMISI[s] || ST_KOMISI.tertunda;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  function sudahAda(refType, refId) {
    return DB.where('komisi', function (k) {
      return k.refType === refType && k.refId === refId; }).length > 0;
  }

  /**
   * Catat komisi dari satu transaksi milik referral.
   * Dipanggil dari BIZ (invoice lunas) dan dari alur pesanan toko.
   */
  function catatKomisi(userId, jenis, dasar, ref) {
    var c = config();
    if (!c.aktif || !(dasar > 0)) return null;
    var up = upline(userId);
    if (!up) return null;
    if (sudahAda(ref.tipe, ref.id)) return null;               /* jangan dobel */

    if (c.batasTransaksi && up.referral.transaksi >= c.batasTransaksi) return null;

    var persen = jenis === 'jasa' ? c.komisiJasa : c.komisiProduk;
    var nilai = Math.round(dasar * persen / 100);

    /* bonus satu kali untuk transaksi pertama referral */
    var bonus = up.referral.transaksi === 0 ? (c.komisiPendaftaran || 0) : 0;

    var k = DB.insert('komisi', {
      afiliatorId: up.afiliator.id, dariUserId: userId, referralId: up.referral.id,
      jenis: jenis, dasar: dasar,
      /* skema dibekukan pada dokumen — perubahan tarif kemudian tidak mengubah
         komisi yang sudah terbit */
      skema: { persen: persen, bonusPendaftaran: bonus, hariTahan: c.hariTahan },
      nilai: nilai, bonus: bonus, total: nilai + bonus,
      refType: ref.tipe, refId: ref.id, judul: ref.judul || '',
      status: 'tertunda',
      matangAt: U.iso(U.addDays(new Date(), c.hariTahan)),
      at: U.nowISO()
    });

    DB.update('referral', up.referral.id, {
      transaksi: up.referral.transaksi + 1,
      komisiTotal: (up.referral.komisiTotal || 0) + k.total
    });

    DB.insert('waOutbox', { to: up.afiliator.id, template: 'manual', status: 'antre', sentAt: null,
      refType: 'komisi', refId: k.id,
      pesan: '*KOMISI AFILIASI* 💸\n\n' + U.rp(k.total) + ' ' + I18N.t('dari transaksi') + ' ' +
        BIZ.nama(userId) + '.\n\nMasuk saldo pada ' + U.tglPanjang(k.matangAt) +
        ' (masa tahan ' + c.hariTahan + ' hari).' });
    return k;
  }

  /**
   * Matangkan komisi yang masa tahannya lewat, lalu kreditkan ke dompet.
   * Dipanggil sekali saat aplikasi dibuka — sama seperti penyegaran invoice.
   */
  function segarkan() {
    var n = 0;
    DB.where('komisi', { status: 'tertunda' }).forEach(function (k) {
      if (U.diffDays(k.matangAt, new Date()) > 0) return;      /* belum waktunya */
      DB.update('komisi', k.id, { status: 'matang', matangRealAt: U.nowISO() });
      DOMPET.kredit(k.afiliatorId, k.total, 'komisi',
        'Komisi afiliasi • ' + (k.judul || k.refType), { tipe: 'komisi', id: k.id });
      n++;
    });
    return n;
  }

  /** Batalkan komisi bila transaksi sumbernya dibatalkan. */
  function batalkan(refType, refId, alasan) {
    var out = 0;
    DB.where('komisi', function (k) {
      return k.refType === refType && k.refId === refId; }).forEach(function (k) {
      if (k.status === 'batal') return;
      if (k.status === 'matang') {
        /* sudah masuk saldo — tarik kembali lewat mutasi, bukan diam-diam */
        DOMPET.debit(k.afiliatorId, k.total, 'penyesuaian',
          'Pembatalan komisi • ' + (k.judul || ''), { tipe: 'komisi', id: k.id });
      }
      DB.update('komisi', k.id, { status: 'batal', catatan: alasan || '' });
      out++;
    });
    return out;
  }

  function komisiSaya(userId) {
    return U.sortBy(DB.where('komisi', { afiliatorId: userId }),
      function (k) { return k.at; }, true);
  }

  function ringkas(u) {
    var k = komisiSaya(u.id);
    var ref = referralSaya(u.id);
    var a = data(u) || {};
    return {
      kode: a.kode || null, status: a.status || null, klik: a.klik || 0,
      referral: ref.length,
      referralTransaksi: ref.filter(function (r) { return r.transaksi > 0; }).length,
      tertunda: U.sum(k.filter(function (x) { return x.status === 'tertunda'; }),
        function (x) { return x.total; }),
      matang: U.sum(k.filter(function (x) { return x.status === 'matang'; }),
        function (x) { return x.total; }),
      total: U.sum(k.filter(function (x) { return x.status !== 'batal'; }),
        function (x) { return x.total; }),
      konversi: ref.length ? Math.round(ref.filter(function (r) {
        return r.transaksi > 0; }).length / ref.length * 100) : 0
    };
  }

  function statistik() {
    var semua = DB.all('users').filter(function (u) { return !!u.afiliasi; });
    var k = DB.all('komisi');
    return {
      pendaftar: semua.length,
      aktif: semua.filter(function (u) { return u.afiliasi.status === 'aktif'; }).length,
      menunggu: semua.filter(function (u) { return u.afiliasi.status === 'menunggu'; }).length,
      referral: DB.all('referral').length,
      komisiTertunda: U.sum(k.filter(function (x) { return x.status === 'tertunda'; }),
        function (x) { return x.total; }),
      komisiDibayar: U.sum(k.filter(function (x) { return x.status === 'matang'; }),
        function (x) { return x.total; }),
      teratas: U.sortBy(semua.map(function (u) {
        return { user: u, r: ringkas(u) }; }), function (x) { return x.r.total; }, true).slice(0, 5)
    };
  }

  return {
    BAWAAN: BAWAAN, STATUS: STATUS, ST_KOMISI: ST_KOMISI,
    config: config, simpanConfig: simpanConfig, chip: chip, chipKomisi: chipKomisi,
    data: data, aktif: aktif, buatKode: buatKode, cariKode: cariKode,
    daftar: daftar, setujui: setujui, ubahStatus: ubahStatus,
    tautan: tautan, catatKlik: catatKlik,
    simpanRujukan: simpanRujukan, ambilRujukan: ambilRujukan, hapusRujukan: hapusRujukan,
    catatPendaftaran: catatPendaftaran, referralSaya: referralSaya, upline: upline,
    catatKomisi: catatKomisi, segarkan: segarkan, batalkan: batalkan,
    komisiSaya: komisiSaya, ringkas: ringkas, statistik: statistik
  };
})();
