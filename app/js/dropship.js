/* ==========================================================================
   dropship.js — sistem dropshipper
   --------------------------------------------------------------------------
   Dropshipper menjual produk EXOCLEAN dan produk mitra toko tanpa menyetok
   barang. Ia memilih produk, menetapkan harga jualnya sendiri di atas harga
   dasar, lalu memasarkannya. Barang dikirim langsung dari gudang ke pembeli
   dengan nama pengirim si dropshipper.

   BEDANYA DENGAN AFILIASI

     Afiliasi  — membagikan tautan; harga tetap harga EXOCLEAN; imbalan berupa
                 persentase komisi yang ditentukan admin.
     Dropship  — menentukan harga jual sendiri; imbalannya adalah SELISIH
                 antara harga jual dan harga dasar. Ia yang menghadapi
                 pembelinya, sehingga tanggung jawabnya lebih besar.

   ATURAN MARGIN
   Admin menetapkan batas bawah dan batas atas markup. Batas atas bukan untuk
   membatasi keuntungan, melainkan melindungi nama EXOCLEAN: produk yang sama
   dijual dua kali lipat di kanal dropshipper akan merusak kepercayaan pada
   toko resminya.

   ALUR UANGNYA sama disiplinnya dengan afiliasi: margin ditahan sampai
   pesanan benar-benar diterima pembeli, baru masuk saldo dompet.
   ========================================================================== */
var DROPSHIP = (function () {

  var BAWAAN = {
    aktif: true,
    persetujuanOtomatis: false,  /* dropshipper menghadapi pembeli — ditinjau dulu */
    markupMin: 5,                /* % di atas harga dasar */
    markupMaks: 40,
    hariTahan: 7,                /* setelah pesanan diterima */
    biayaPlatform: 0,            /* % dari margin, bila ingin dipungut */
    maksProduk: 100
  };

  function config() {
    return Object.assign({}, BAWAAN, (DB.raw.settings || {}).dropship || {});
  }
  function simpanConfig(patch, adminId) {
    DB.raw.settings = DB.raw.settings || {};
    DB.raw.settings.dropship = Object.assign({}, config(), patch);
    DB.save(true); DB.emit();
    if (adminId) DB.log(adminId, 'Mengubah ketentuan dropship', 'setting', 'dropship');
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

  function data(u) { return (u && u.dropship) || null; }
  function aktif(u) { var d = data(u); return !!(d && d.status === 'aktif'); }

  function daftar(userId, d) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (!config().aktif) return { error: I18N.t('Program dropship sedang tidak dibuka') };
    if (data(u)) return { error: I18N.t('Anda sudah terdaftar sebagai dropshipper') };
    var v = AKUN.statusVerifikasi(u);
    if (!v.telp || !v.email) {
      return { error: I18N.t('Verifikasi email dan nomor HP Anda dulu sebelum menjadi dropshipper') };
    }
    if (!d || !d.namaToko || d.namaToko.trim().length < 3) {
      return { error: I18N.t('Nama toko dropship wajib diisi') };
    }

    var otomatis = config().persetujuanOtomatis;
    DB.update('users', userId, {
      dropship: {
        namaToko: d.namaToko.trim(), deskripsi: d.deskripsi || '',
        kanal: d.kanal || '', kota: d.kota || '',
        status: otomatis ? 'aktif' : 'menunggu',
        daftarAt: U.nowISO(), disetujuiAt: otomatis ? U.nowISO() : null
      }
    });
    DB.log(userId, 'Mendaftar sebagai dropshipper: ' + d.namaToko, 'user', userId);
    if (!otomatis) {
      var adm = BIZ.usersByRole('admin')[0];
      if (adm) DB.insert('waOutbox', { to: adm.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'user', refId: userId,
        pesan: (function () { var w = I18N.pesanUntuk(adm.id);
          return '*' + w('PENDAFTAR DROPSHIPPER BARU') + '* 📦\n\n' +
            d.namaToko + '\n' + u.nama + ' • ' + U.phoneDisplay(u.telp) + '\n' +
            w('Kanal:') + ' ' + (d.kanal || '-') + '\n\n' +
            w('Tinjau di menu Afiliasi & Dropship.'); })() });
    }
    return { ok: true, otomatis: otomatis };
  }

  function setujui(userId, adminId) {
    var u = DB.find('users', userId);
    if (!data(u)) return { error: I18N.t('Pengguna belum mendaftar dropship') };
    DB.update('users', userId, {
      dropship: Object.assign({}, u.dropship, { status: 'aktif', disetujuiAt: U.nowISO() }) });
    DB.insert('waOutbox', { to: userId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'user', refId: userId,
      pesan: (function () {
        var w = I18N.pesanUntuk(userId);
        return '*' + w('DROPSHIP DISETUJUI') + '* 🎉\n\n' +
          w('Toko *{toko}* sudah aktif.').replace('{toko}', u.dropship.namaToko) + '\n\n' +
          w('Pilih produk yang ingin Anda jual dan tentukan harganya di menu Dropship.');
      })() });
    DB.log(adminId, 'Menyetujui dropshipper ' + u.nama, 'user', userId);
    return { ok: true };
  }

  function ubahStatus(userId, status, adminId, alasan) {
    var u = DB.find('users', userId);
    if (!data(u)) return { error: I18N.t('Pengguna belum mendaftar dropship') };
    DB.update('users', userId, {
      dropship: Object.assign({}, u.dropship, { status: status, catatan: alasan || '' }) });
    DB.log(adminId, 'Mengubah status dropshipper ' + u.nama + ' → ' + status, 'user', userId);
    return { ok: true };
  }

  /* ================================================================ ETALASE */
  /** Harga dasar satu produk — inilah yang harus disetor ke EXOCLEAN/penjual. */
  function hargaDasar(p) { return p ? (p.harga || 0) : 0; }

  function batasHarga(p) {
    var c = config(), d = hargaDasar(p);
    return {
      dasar: d,
      min: Math.ceil(d * (1 + c.markupMin / 100)),
      maks: Math.floor(d * (1 + c.markupMaks / 100))
    };
  }

  function etalase(userId) {
    return DB.where('dropProduk', { userId: userId });
  }
  function itemEtalase(userId, produkId) {
    return DB.where('dropProduk', function (x) {
      return x.userId === userId && x.produkId === produkId; })[0] || null;
  }

  function tambahProduk(userId, produkId, hargaJual) {
    var u = DB.find('users', userId);
    if (!aktif(u)) return { error: I18N.t('Akun dropship Anda belum aktif') };
    var p = DB.find('products', produkId);
    if (!p || p.aktif === false) return { error: I18N.t('Produk tidak tersedia') };
    if (itemEtalase(userId, produkId)) return { error: I18N.t('Produk ini sudah ada di etalase Anda') };
    if (etalase(userId).length >= config().maksProduk) {
      return { error: 'Etalase penuh (maksimal ' + config().maksProduk + ' ' + I18N.t('produk)') };
    }
    var b = batasHarga(p);
    var harga = Math.round(Number(hargaJual) || b.min);
    if (harga < b.min) return { error: I18N.t('Harga jual minimal') + ' ' + U.rp(b.min) };
    if (harga > b.maks) return { error: I18N.t('Harga jual maksimal') + ' ' + U.rp(b.maks) };

    var x = DB.insert('dropProduk', {
      userId: userId, produkId: produkId, hargaJual: harga, hargaDasar: b.dasar,
      aktif: true, terjual: 0, at: U.nowISO()
    });
    return { ok: true, item: x };
  }

  function ubahHarga(userId, itemId, hargaJual) {
    var x = DB.find('dropProduk', itemId);
    if (!x || x.userId !== userId) return { error: I18N.t('Item tidak ditemukan') };
    var p = DB.find('products', x.produkId);
    var b = batasHarga(p);
    var harga = Math.round(Number(hargaJual) || 0);
    if (harga < b.min) return { error: I18N.t('Harga jual minimal') + ' ' + U.rp(b.min) };
    if (harga > b.maks) return { error: I18N.t('Harga jual maksimal') + ' ' + U.rp(b.maks) };
    DB.update('dropProduk', itemId, { hargaJual: harga, hargaDasar: b.dasar });
    return { ok: true };
  }

  function hapusProduk(userId, itemId) {
    var x = DB.find('dropProduk', itemId);
    if (!x || x.userId !== userId) return { error: I18N.t('Item tidak ditemukan') };
    DB.remove('dropProduk', itemId);
    return { ok: true };
  }

  /* ================================================================ PESANAN & MARGIN */
  /**
   * Catat margin dari satu pesanan yang dijual lewat dropshipper.
   * Margin dibekukan per baris pesanan — perubahan harga etalase setelahnya
   * tidak boleh mengubah hak yang sudah timbul.
   */
  function catatMargin(dropUserId, shopOrderId, baris) {
    var c = config();
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) return null;
    if (DB.where('dropMargin', function (m) { return m.shopOrderId === shopOrderId; }).length) {
      return null;                                   /* sudah pernah dicatat */
    }

    var kotor = U.sum(baris, function (b) {
      return (b.hargaJual - b.hargaDasar) * b.qty; });
    if (kotor <= 0) return null;
    var biaya = Math.round(kotor * (c.biayaPlatform || 0) / 100);

    var m = DB.insert('dropMargin', {
      userId: dropUserId, shopOrderId: shopOrderId, no: so.no,
      baris: baris.map(function (b) {
        return { produkId: b.produkId, nama: b.nama, qty: b.qty,
          hargaDasar: b.hargaDasar, hargaJual: b.hargaJual,
          margin: (b.hargaJual - b.hargaDasar) * b.qty }; }),
      kotor: kotor, biayaPlatform: biaya, bersih: kotor - biaya,
      skema: { biayaPlatform: c.biayaPlatform, hariTahan: c.hariTahan },
      status: 'tertunda', matangAt: null, at: U.nowISO()
    });

    etalase(dropUserId).forEach(function (it) {
      var b = baris.filter(function (x) { return x.produkId === it.produkId; })[0];
      if (b) DB.update('dropProduk', it.id, { terjual: (it.terjual || 0) + b.qty });
    });
    return m;
  }

  /**
   * Dipanggil saat pesanan ditandai diterima pembeli — mulai hitung masa tahan.
   * Sebelum barang diterima, margin belum boleh matang: pesanan masih bisa
   * dikembalikan.
   */
  function pesananDiterima(shopOrderId) {
    var m = DB.where('dropMargin', function (x) {
      return x.shopOrderId === shopOrderId && x.status === 'tertunda'; })[0];
    if (!m) return null;
    DB.update('dropMargin', m.id, {
      matangAt: U.iso(U.addDays(new Date(), m.skema.hariTahan)), diterimaAt: U.nowISO() });
    return DB.find('dropMargin', m.id);
  }

  function batalkan(shopOrderId, alasan) {
    var out = 0;
    DB.where('dropMargin', function (x) { return x.shopOrderId === shopOrderId; })
      .forEach(function (m) {
        if (m.status === 'batal') return;
        if (m.status === 'matang') {
          DOMPET.debit(m.userId, m.bersih, 'penyesuaian',
            'Pembatalan margin dropship ' + m.no, { tipe: 'dropMargin', id: m.id });
        }
        DB.update('dropMargin', m.id, { status: 'batal', catatan: alasan || '' });
        out++;
      });
    return out;
  }

  /** Matangkan margin yang masa tahannya lewat. Dipanggil saat aplikasi dibuka. */
  function segarkan() {
    var n = 0;
    DB.where('dropMargin', { status: 'tertunda' }).forEach(function (m) {
      if (!m.matangAt) return;                       /* barang belum diterima */
      if (U.diffDays(m.matangAt, new Date()) > 0) return;
      DB.update('dropMargin', m.id, { status: 'matang', matangRealAt: U.nowISO() });
      DOMPET.kredit(m.userId, m.bersih, 'margin',
        'Margin dropship ' + m.no, { tipe: 'dropMargin', id: m.id });
      n++;
    });
    return n;
  }

  function marginSaya(userId) {
    return U.sortBy(DB.where('dropMargin', { userId: userId }),
      function (m) { return m.at; }, true);
  }

  function ringkas(u) {
    var m = marginSaya(u.id), e = etalase(u.id);
    return {
      produk: e.length,
      terjual: U.sum(e, function (x) { return x.terjual || 0; }),
      pesanan: m.filter(function (x) { return x.status !== 'batal'; }).length,
      tertunda: U.sum(m.filter(function (x) { return x.status === 'tertunda'; }),
        function (x) { return x.bersih; }),
      matang: U.sum(m.filter(function (x) { return x.status === 'matang'; }),
        function (x) { return x.bersih; }),
      total: U.sum(m.filter(function (x) { return x.status !== 'batal'; }),
        function (x) { return x.bersih; })
    };
  }

  function statistik() {
    var semua = DB.all('users').filter(function (u) { return !!u.dropship; });
    var m = DB.all('dropMargin');
    return {
      pendaftar: semua.length,
      aktif: semua.filter(function (u) { return u.dropship.status === 'aktif'; }).length,
      menunggu: semua.filter(function (u) { return u.dropship.status === 'menunggu'; }).length,
      produkTayang: DB.all('dropProduk').length,
      pesanan: m.filter(function (x) { return x.status !== 'batal'; }).length,
      marginTertunda: U.sum(m.filter(function (x) { return x.status === 'tertunda'; }),
        function (x) { return x.bersih; }),
      marginDibayar: U.sum(m.filter(function (x) { return x.status === 'matang'; }),
        function (x) { return x.bersih; })
    };
  }

  return {
    BAWAAN: BAWAAN, STATUS: STATUS,
    config: config, simpanConfig: simpanConfig, chip: chip,
    data: data, aktif: aktif, daftar: daftar, setujui: setujui, ubahStatus: ubahStatus,
    hargaDasar: hargaDasar, batasHarga: batasHarga,
    etalase: etalase, itemEtalase: itemEtalase,
    tambahProduk: tambahProduk, ubahHarga: ubahHarga, hapusProduk: hapusProduk,
    catatMargin: catatMargin, pesananDiterima: pesananDiterima, batalkan: batalkan,
    segarkan: segarkan, marginSaya: marginSaya, ringkas: ringkas, statistik: statistik
  };
})();
