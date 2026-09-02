/* ==========================================================================
   seller.js — Mitra Toko (marketplace multi-penjual)
   --------------------------------------------------------------------------
   Siapa pun boleh mendaftar menjadi Mitra Toko dan menjual alat, perlengkapan,
   aksesoris, serta chemical kebersihan di dalam aplikasi EXOCLEAN.

   Produk tanpa `sellerId` adalah milik EXOCLEAN sendiri (Toko Resmi), sehingga
   seluruh data lama tetap berlaku tanpa perlu diubah.

   ALIRAN UANG SATU PESANAN
       pembeli bayar = subtotal barang + ongkir + PPN
       ─────────────────────────────────────────────────────────────
       ongkir        → biaya kurir (selisihnya margin logistik EXOCLEAN)
       komisi        → EXOCLEAN, persentasenya per kategori produk
       beban promosi → bagian diskon kampanye yang ditanggung penjual
       ─────────────────────────────────────────────────────────────
       diterima penjual = subtotal barang − komisi − beban promosi

   Dana pesanan baru bisa dicairkan setelah pembeli menerima barang dan lewat
   masa tahan (default 3 hari) — persis seperti rekening bersama marketplace.
   ========================================================================== */
var SELLER = (function () {

  /* ================================================================ PENGATURAN */
  var BAWAAN = {
    komisiDefault: 12,                  /* % dari subtotal barang */
    komisiKategori: {                   /* margin tiap kategori berbeda */
      'Chemical Pembersih': 12,
      'Alat Kebersihan': 15,
      'Mesin & Peralatan': 8,           /* nilai besar, margin tipis */
      'APD & Keselamatan Kerja': 12,
      'Consumable': 15,
      'Aksesoris': 15
    },
    hariTahan: 3,                       /* hari setelah pesanan diterima sebelum dana cair */
    minPencairan: 100000,
    biayaPencairan: 5000,               /* biaya transfer per pencairan */
    ongkirFlat: 50000,                  /* ditagih ke pembeli */
    biayaKurirFlat: 38000,              /* dibayarkan ke kurir; selisihnya margin logistik */
    gratisOngkirMin: 2000000,
    tarifKlikProduk: 1500,              /* iklan produk disorot — per klik */
    tarifKlikKategori: 2000,            /* iklan sponsor kategori — per klik */
    tarifBannerHarian: 150000,          /* banner beranda — per hari */
    minTopUpIklan: 50000
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.marketplace) { s.marketplace = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    return s.marketplace;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ================================================================ TOKO */
  var STATUS_TOKO = {
    onboarding: { t: 'Melengkapi Data', c: 'warn' },
    verifikasi: { t: 'Menunggu Verifikasi', c: 'info' },
    aktif:      { t: 'Toko Aktif', c: 'ok' },
    ditolak:    { t: 'Ditolak', c: 'danger' },
    ditutup:    { t: 'Ditutup', c: 'muted' }
  };

  function toko(u) {
    return Object.assign({ nama: '', deskripsi: '', logo: null, banner: null, kota: '',
      alamatGudang: '', telpToko: '', kategoriUtama: '', status: 'onboarding',
      bergabungAt: null, saldoIklan: 0 }, (u && u.toko) || {});
  }
  function statusToko(u) { return toko(u).status; }
  function tokoAktif(u) { return !!u && u.role === 'seller' && statusToko(u) === 'aktif' && u.aktif; }
  function semuaToko() { return DB.where('users', { role: 'seller' }); }
  function tokoAktifSemua() { return semuaToko().filter(tokoAktif); }
  function simpanToko(userId, patch) {
    var u = DB.find('users', userId);
    DB.update('users', userId, { toko: Object.assign(toko(u), patch) });
    return DB.find('users', userId);
  }
  /** Nama toko untuk ditampilkan; produk tanpa penjual = toko resmi. */
  function namaToko(sellerId) {
    if (!sellerId) return I18N.t('Toko Resmi EXOCLEAN');
    var u = DB.find('users', sellerId);
    return u ? (toko(u).nama || u.nama) : '—';
  }
  function tokoResmi(sellerId) { return !sellerId; }

  /** Lima langkah membuka toko — dihitung dari data, bukan status manual. */
  function langkahToko(u) {
    var t = toko(u);
    var berkas = BIZ.kelengkapanBerkas(u);
    var produk = produkToko(u.id);
    return [
      { k: 'profil', ic: '🏪', judul: I18N.t('Melengkapi profil toko'),
        ket: t.nama && t.kota && t.alamatGudang
          ? t.nama + ' — ' + t.kota
          : I18N.t('Nama toko, kota, alamat gudang, dan kategori utama.'),
        selesai: !!(t.nama && t.kota && t.alamatGudang), aksi: 'ke-profil-toko' },
      { k: 'berkas', ic: '🆔', judul: 'Melengkapi identitas penjual',
        ket: berkas.kurang.length
          ? I18N.t('Belum terisi:') + ' ' + berkas.kurang.map(function (p) { return p.label; }).join(', ')
          : I18N.t('Identitas, kontak darurat, dan alamat sudah lengkap.'),
        selesai: berkas.kurang.length === 0, aksi: 'ke-berkas' },
      { k: 'rekening', ic: '🏦', judul: 'Menambahkan rekening pencairan',
        ket: BIZ.rekeningUtama(u) ? BIZ.rekeningUtama(u).bank + ' ' + BIZ.rekeningUtama(u).nomor
          : 'Rekening tujuan hasil penjualan.',
        selesai: !!BIZ.rekeningUtama(u), aksi: 'ke-rekening' },
      { k: 'produk', ic: '📦', judul: I18N.t('Menambahkan produk pertama'),
        ket: produk.length ? produk.length + ' ' + I18N.t('produk terdaftar') : I18N.t('Minimal satu produk untuk dijual.'),
        selesai: produk.length > 0, aksi: 'ke-produk' },
      { k: 'verifikasi', ic: '✅', judul: 'Verifikasi admin EXOCLEAN',
        ket: t.status === 'aktif' ? I18N.t('Toko Anda sudah aktif dan tampil di katalog.')
          : t.status === 'ditolak' ? 'Ditolak: ' + (u.alasanTolakToko || '—')
          : I18N.t('Admin memeriksa profil, identitas, dan produk Anda.'),
        selesai: t.status === 'aktif', aksi: null }
    ];
  }
  function ringkasToko(u) {
    var l = langkahToko(u);
    var selesai = l.filter(function (x) { return x.selesai; }).length;
    return { langkah: l, selesai: selesai, total: l.length,
      pct: Math.round(selesai / l.length * 100),
      berikutnya: l.filter(function (x) { return !x.selesai; })[0] || null };
  }
  function siapVerifikasiToko(u) {
    return langkahToko(u).slice(0, 4).every(function (x) { return x.selesai; });
  }

  function ajukanToko(userId) {
    simpanToko(userId, { status: 'verifikasi', diajukanAt: U.nowISO() });
    var admin = BIZ.usersByRole('admin')[0];
    if (admin) {
      DB.insert('waOutbox', { to: admin.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'seller', refId: userId,
        pesan: (function () {
          var w = I18N.pesanUntuk(admin.id);
          return '*' + w('PENGAJUAN MITRA TOKO') + '* 🏪\n\n' +
            w('{toko} ({nama}) sudah melengkapi profil toko, identitas, rekening, dan produk.')
              .replace('{toko}', namaToko(userId)).replace('{nama}', BIZ.nama(userId)) + '\n\n' +
            w('Mohon periksa di menu Marketplace → Verifikasi Toko.');
        })() });
    }
    return DB.find('users', userId);
  }
  function setujuiToko(userId, adminId) {
    simpanToko(userId, { status: 'aktif', bergabungAt: U.nowISO() });
    DB.update('users', userId, { alasanTolakToko: null });
    DB.log(adminId, 'Menyetujui mitra toko ' + namaToko(userId), 'seller', userId);
    WA.enqueue('toko_disetujui', userId, { userId: userId }, { tipe: 'seller', id: userId });
    return DB.find('users', userId);
  }
  function tolakToko(userId, adminId, alasan) {
    simpanToko(userId, { status: 'ditolak' });
    DB.update('users', userId, { alasanTolakToko: alasan || '' });
    DB.log(adminId, 'Menolak mitra toko ' + namaToko(userId), 'seller', userId);
    WA.enqueue('toko_ditolak', userId, { userId: userId }, { tipe: 'seller', id: userId });
    return DB.find('users', userId);
  }

  /* ================================================================ PRODUK */
  var STATUS_PRODUK = {
    draf:     { t: 'Draf', c: 'muted' },
    menunggu: { t: 'Menunggu Moderasi', c: 'warn' },
    aktif:    { t: 'Tayang', c: 'ok' },
    ditolak:  { t: 'Ditolak', c: 'danger' },
    nonaktif: { t: 'Tidak Tayang', c: 'muted' }
  };
  function statusProduk(p) { return p.statusProduk || (p.aktif ? 'aktif' : 'nonaktif'); }
  function produkToko(sellerId) { return DB.where('products', { sellerId: sellerId }); }
  function produkMenungguModerasi() {
    return DB.where('products', function (p) { return p.sellerId && statusProduk(p) === 'menunggu'; });
  }
  /** Produk yang boleh tampil di katalog pembeli. */
  function produkTayang() {
    return DB.where('products', function (p) {
      if (!p.aktif) return false;
      if (!p.sellerId) return true;                       /* toko resmi */
      var u = DB.find('users', p.sellerId);
      return tokoAktif(u) && statusProduk(p) === 'aktif';
    });
  }
  function moderasiProduk(produkId, hasil, adminId, alasan) {
    DB.update('products', produkId, {
      statusProduk: hasil, aktif: hasil === 'aktif',
      moderasi: { oleh: adminId, at: U.nowISO(), hasil: hasil, alasan: alasan || '' }
    });
    var p = DB.find('products', produkId);
    if (p.sellerId) {
      WA.enqueue(hasil === 'aktif' ? 'produk_disetujui' : 'produk_ditolak', p.sellerId,
        { produkId: produkId }, { tipe: 'product', id: produkId });
    }
    DB.log(adminId, 'Moderasi produk ' + p.nama + ' → ' + hasil, 'product', produkId);
    return p;
  }

  function komisiPersen(p) {
    var c = config();
    if (typeof p.komisiPersen === 'number') return p.komisiPersen;
    return c.komisiKategori[p.kategori] !== undefined ? c.komisiKategori[p.kategori] : c.komisiDefault;
  }

  /* ================================================================ KAMPANYE / EVENT */
  var TIPE_KAMPANYE = {
    flash_sale:     { t: 'Flash Sale', ic: '⚡' },
    gratis_ongkir:  { t: 'Gratis Ongkir', ic: '🚚' },
    diskon_kategori:{ t: 'Diskon Kategori', ic: '🏷️' },
    hari_besar:     { t: 'Event Hari Besar', ic: '🎉' }
  };
  function kampanyeAktif() {
    var t = U.today();
    return DB.where('kampanye', function (k) {
      return k.aktif && k.mulai <= t && k.selesai >= t; });
  }
  function kampanyeMendatang() {
    var t = U.today();
    return DB.where('kampanye', function (k) { return k.aktif && k.mulai > t; });
  }
  function ikutKampanye(kampanyeId, produkId) {
    var k = DB.find('kampanye', kampanyeId);
    if (!k) return null;
    var list = (k.produk || []).slice();
    if (list.indexOf(produkId) < 0) list.push(produkId);
    DB.update('kampanye', kampanyeId, { produk: list });
    return DB.find('kampanye', kampanyeId);
  }
  function keluarKampanye(kampanyeId, produkId) {
    var k = DB.find('kampanye', kampanyeId);
    DB.update('kampanye', kampanyeId, {
      produk: (k.produk || []).filter(function (id) { return id !== produkId; }) });
    return DB.find('kampanye', kampanyeId);
  }
  /** Kampanye yang sedang berlaku untuk satu produk. */
  function kampanyeProduk(produkId) {
    return kampanyeAktif().filter(function (k) { return (k.produk || []).indexOf(produkId) >= 0; })[0] || null;
  }
  /** Harga setelah diskon kampanye, berikut siapa yang menanggung. */
  function hargaTayang(p) {
    var k = kampanyeProduk(p.id);
    if (!k || !k.diskonPersen) return { harga: p.harga, asli: p.harga, kampanye: null, potongan: 0 };
    var potongan = Math.round(p.harga * k.diskonPersen / 100);
    return { harga: p.harga - potongan, asli: p.harga, kampanye: k, potongan: potongan,
      bebanSeller: Math.round(potongan * (k.tanggunganSeller || 0) / 100),
      bebanExoclean: potongan - Math.round(potongan * (k.tanggunganSeller || 0) / 100) };
  }

  /* ================================================================ IKLAN */
  var TIPE_IKLAN = {
    produk_sorot:     { t: 'Produk Disorot', ic: '⭐', model: 'klik',
      ket: 'Produk Anda muncul di baris teratas katalog dengan label Iklan.' },
    sponsor_kategori: { t: 'Sponsor Kategori', ic: '🎯', model: 'klik',
      ket: 'Muncul di urutan atas ketika pembeli membuka kategori pilihan Anda.' },
    banner_beranda:   { t: 'Banner Beranda', ic: '🖼️', model: 'harian',
      ket: 'Spanduk besar di beranda klien. Ditagih per hari tayang.' }
  };
  var STATUS_IKLAN = {
    draf:      { t: 'Draf', c: 'muted' },
    berjalan:  { t: 'Berjalan', c: 'ok' },
    jeda:      { t: 'Dijeda', c: 'warn' },
    habis:     { t: 'Anggaran Habis', c: 'danger' },
    selesai:   { t: 'Selesai', c: 'muted' }
  };

  function tarifIklan(tipe) {
    var c = config();
    return tipe === 'banner_beranda' ? c.tarifBannerHarian
      : tipe === 'sponsor_kategori' ? c.tarifKlikKategori : c.tarifKlikProduk;
  }
  function saldoIklan(sellerId) { return toko(DB.find('users', sellerId)).saldoIklan || 0; }
  function topUpIklan(sellerId, jumlah) {
    var u = DB.find('users', sellerId);
    simpanToko(sellerId, { saldoIklan: (toko(u).saldoIklan || 0) + jumlah });
    DB.log(sellerId, 'Isi saldo iklan ' + U.rp(jumlah), 'seller', sellerId);
    return saldoIklan(sellerId);
  }

  function iklanSeller(sellerId) {
    return U.sortBy(DB.where('iklan', { sellerId: sellerId }), function (i) { return i.createdAt; }, true);
  }
  function buatIklan(sellerId, data) {
    var it = DB.insert('iklan', {
      no: U.docNo('ADS', DB.nextNo('iklan')), sellerId: sellerId,
      tipe: data.tipe, produkId: data.produkId || null, kategori: data.kategori || null,
      judul: data.judul || '', anggaranTotal: data.anggaranTotal || 0,
      anggaranHarian: data.anggaranHarian || 0,
      mulai: data.mulai, selesai: data.selesai,
      tarif: tarifIklan(data.tipe), model: TIPE_IKLAN[data.tipe].model,
      status: 'berjalan', tayang: 0, klik: 0, terpakai: 0, konversi: 0
    });
    DB.log(sellerId, 'Membuat iklan ' + it.no, 'iklan', it.id);
    return it;
  }

  /** Iklan yang layak tampil hari ini: berjalan, dalam rentang, saldo & anggaran cukup. */
  function iklanTayang(tipe, kategori) {
    var t = U.today();
    return DB.where('iklan', function (i) {
      if (i.status !== 'berjalan') return false;
      if (i.tipe !== tipe) return false;
      if (i.mulai > t || i.selesai < t) return false;
      if (i.anggaranTotal && i.terpakai >= i.anggaranTotal) return false;
      if (saldoIklan(i.sellerId) < i.tarif) return false;
      if (kategori && i.kategori && i.kategori !== kategori) return false;
      var u = DB.find('users', i.sellerId);
      if (!tokoAktif(u)) return false;
      if (i.produkId) {
        var p = DB.find('products', i.produkId);
        if (!p || statusProduk(p) !== 'aktif' || p.stok <= 0) return false;
      }
      return true;
    });
  }

  function catatTayang(iklanId) {
    var i = DB.find('iklan', iklanId);
    if (i) DB.update('iklan', iklanId, { tayang: (i.tayang || 0) + 1 });
  }
  /** Klik iklan → potong saldo sesuai tarif, hentikan bila anggaran/saldo habis. */
  function catatKlik(iklanId) {
    var i = DB.find('iklan', iklanId);
    if (!i || i.model !== 'klik') return;
    var biaya = i.tarif;
    var saldo = saldoIklan(i.sellerId);
    if (saldo < biaya) { DB.update('iklan', iklanId, { status: 'habis' }); return; }
    simpanToko(i.sellerId, { saldoIklan: saldo - biaya });
    var terpakai = (i.terpakai || 0) + biaya;
    DB.update('iklan', iklanId, { klik: (i.klik || 0) + 1, terpakai: terpakai,
      status: (i.anggaranTotal && terpakai >= i.anggaranTotal) ? 'habis' : i.status });
  }
  function jedaIklan(iklanId, jeda) {
    DB.update('iklan', iklanId, { status: jeda ? 'jeda' : 'berjalan' });
    return DB.find('iklan', iklanId);
  }

  function statistikIklan(sellerId) {
    var list = iklanSeller(sellerId);
    var klik = U.sum(list, function (i) { return i.klik || 0; });
    var tayang = U.sum(list, function (i) { return i.tayang || 0; });
    return { jumlah: list.length,
      berjalan: list.filter(function (i) { return i.status === 'berjalan'; }).length,
      tayang: tayang, klik: klik,
      ctr: tayang ? Math.round(klik / tayang * 1000) / 10 : 0,
      belanja: U.sum(list, function (i) { return i.terpakai || 0; }),
      saldo: saldoIklan(sellerId) };
  }

  /* ================================================================ PENDAPATAN PESANAN */
  /**
   * Rincian satu pesanan toko dari sisi penjual.
   * Ongkir tidak menjadi pendapatan penjual — itu milik kurir.
   */
  function rincianPesanan(shopOrderId) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) return null;
    var c = config();
    var baris = (so.items || []).map(function (it) {
      var p = DB.find('products', it.productId) || {};
      var bruto = it.qty * it.harga;
      var kp = komisiPersen(p);
      return { produkId: it.productId, nama: p.nama || '—', qty: it.qty, harga: it.harga,
        bruto: bruto, komisiPersen: kp, komisi: Math.round(bruto * kp / 100) };
    });
    var subtotal = U.sum(baris, function (b) { return b.bruto; });
    var komisi = U.sum(baris, function (b) { return b.komisi; });
    var bebanPromo = so.bebanSeller || 0;
    var ongkir = so.ongkir || 0;
    var biayaKurir = so.biayaKurir !== undefined ? so.biayaKurir : (ongkir ? c.biayaKurirFlat : 0);

    return {
      shopOrderId: shopOrderId, no: so.no, tgl: U.iso(so.createdAt), status: so.status,
      sellerId: so.sellerId || null, pembeli: BIZ.klien(so.clientId),
      baris: baris, subtotal: subtotal, komisi: komisi, bebanPromo: bebanPromo,
      ongkir: ongkir, biayaKurir: biayaKurir, marginLogistik: ongkir - biayaKurir,
      diterimaSeller: subtotal - komisi - bebanPromo,
      pendapatanExoclean: komisi + (ongkir - biayaKurir) - (so.bebanExoclean || 0)
    };
  }

  /** Kapan dana sebuah pesanan bisa dicairkan. */
  function tanggalCair(so) {
    var c = config();
    var acuan = so.selesaiAt || so.dikirimAt || so.createdAt;
    return U.iso(U.addDays(acuan, c.hariTahan));
  }

  function pesananToko(sellerId) {
    return U.sortBy(DB.where('shopOrders', { sellerId: sellerId }),
      function (p) { return p.createdAt; }, true);
  }

  /**
   * Saldo penjual: dana selesai yang sudah lewat masa tahan siap dicairkan;
   * yang belum, tertahan.
   */
  function saldo(sellerId) {
    var hariIni = U.today();
    var semua = pesananToko(sellerId);
    var sudahCair = {};
    DB.where('sellerPayouts', function (x) {
      return x.sellerId === sellerId && x.status !== 'ditolak'; })
      .forEach(function (x) { (x.orderIds || []).forEach(function (id) { sudahCair[id] = x.no; }); });

    var tersedia = 0, tertahan = 0, totalPenjualan = 0, totalKomisi = 0, siap = [], tahan = [];
    semua.forEach(function (so) {
      if (so.status === 'dibatalkan') return;
      var r = rincianPesanan(so.id);
      totalPenjualan += r.subtotal;
      if (so.status !== 'selesai') { tertahan += r.diterimaSeller; tahan.push(r); return; }
      totalKomisi += r.komisi;
      if (sudahCair[so.id]) return;
      if (tanggalCair(so) <= hariIni) { tersedia += r.diterimaSeller; siap.push(r); }
      else { tertahan += r.diterimaSeller; tahan.push(r); }
    });

    return { tersedia: tersedia, tertahan: tertahan, siap: siap, tahan: tahan,
      totalPenjualan: totalPenjualan, totalKomisi: totalKomisi,
      totalDicairkan: U.sum(DB.where('sellerPayouts', function (x) {
        return x.sellerId === sellerId && x.status === 'dibayar'; }), function (x) { return x.jumlahBersih; }),
      menunggu: U.sum(DB.where('sellerPayouts', function (x) {
        return x.sellerId === sellerId && ['diajukan', 'diproses'].indexOf(x.status) >= 0; }),
        function (x) { return x.jumlahBersih; }) };
  }

  /* ================================================================ PENCAIRAN */
  var STATUS_CAIR = {
    diajukan: { t: 'Diajukan', c: 'warn' },
    diproses: { t: 'Diproses', c: 'info' },
    dibayar:  { t: 'Sudah Ditransfer', c: 'ok' },
    ditolak:  { t: 'Ditolak', c: 'danger' }
  };

  function ajukanPencairan(sellerId) {
    var c = config();
    var s = saldo(sellerId);
    if (s.tersedia < c.minPencairan) {
      return { error: I18N.t('Saldo tersedia') + ' ' + U.rp(s.tersedia) + ' ' + I18N.t('belum mencapai minimum') + ' ' +
        U.rp(c.minPencairan) };
    }
    var rek = BIZ.rekeningUtama(DB.find('users', sellerId));
    if (!rek) return { error: I18N.t('Rekening pencairan belum diisi di Profil') };

    var x = DB.insert('sellerPayouts', {
      no: U.docNo('CAIR', DB.nextNo('sellerPayout')), sellerId: sellerId,
      orderIds: s.siap.map(function (r) { return r.shopOrderId; }),
      rincian: s.siap, jumlahKotor: s.tersedia, biaya: c.biayaPencairan,
      jumlahBersih: s.tersedia - c.biayaPencairan,
      rekening: { bank: rek.bank, nomor: rek.nomor, atasNama: rek.atasNama },
      status: 'diajukan', diajukanAt: U.nowISO(), refTransfer: null, catatan: ''
    });
    DB.log(sellerId, 'Mengajukan pencairan ' + x.no + ' — ' + U.rp(x.jumlahBersih), 'sellerPayout', x.id);
    var admin = BIZ.usersByRole('admin')[0];
    if (admin) {
      DB.insert('waOutbox', { to: admin.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'sellerPayout', refId: x.id,
        pesan: (function () {
          var w = I18N.pesanUntuk(admin.id);
          return '*' + w('PENGAJUAN PENCAIRAN TOKO') + '* 💸\n\n' +
            namaToko(sellerId) + '\n' + x.no + ' — ' +
            w('{v} dari {n} pesanan.').replace('{v}', U.rp(x.jumlahBersih))
              .replace('{n}', x.orderIds.length) + '\n\n' +
            w('Periksa di menu Marketplace → Pencairan.');
        })() });
    }
    return { payout: x };
  }

  function prosesPencairan(id, adminId) {
    DB.update('sellerPayouts', id, { status: 'diproses', diprosesAt: U.nowISO(), diprosesOleh: adminId });
    return DB.find('sellerPayouts', id);
  }
  function bayarPencairan(id, ref, adminId) {
    var x = DB.find('sellerPayouts', id);
    DB.update('sellerPayouts', id, { status: 'dibayar', dibayarAt: U.nowISO(),
      refTransfer: ref || '', dibayarOleh: adminId });
    WA.enqueue('toko_pencairan', x.sellerId, { payoutId: id }, { tipe: 'sellerPayout', id: id });
    DB.log(adminId, 'Mentransfer pencairan ' + x.no, 'sellerPayout', id);
    return DB.find('sellerPayouts', id);
  }
  function tolakPencairan(id, adminId, alasan) {
    DB.update('sellerPayouts', id, { status: 'ditolak', catatan: alasan || '' });
    return DB.find('sellerPayouts', id);
  }
  function pencairanSeller(sellerId) {
    return U.sortBy(DB.where('sellerPayouts', { sellerId: sellerId }),
      function (x) { return x.diajukanAt; }, true);
  }

  /* ================================================================ STATISTIK */
  function statistikToko(sellerId) {
    var pesanan = pesananToko(sellerId).filter(function (p) { return p.status !== 'dibatalkan'; });
    var selesai = pesanan.filter(function (p) { return p.status === 'selesai'; });
    var produk = produkToko(sellerId);
    var bulanIni = U.iso(new Date()).slice(0, 7);
    return {
      produk: produk.length,
      produkTayang: produk.filter(function (p) { return statusProduk(p) === 'aktif'; }).length,
      produkHabis: produk.filter(function (p) { return p.stok <= 0; }).length,
      pesananBaru: pesanan.filter(function (p) { return p.status === 'baru'; }).length,
      perluKirim: pesanan.filter(function (p) {
        return ['dikonfirmasi', 'dikemas'].indexOf(p.status) >= 0; }).length,
      pesanan: pesanan.length, selesai: selesai.length,
      penjualanBulanIni: U.sum(pesanan.filter(function (p) {
        return U.iso(p.createdAt).slice(0, 7) === bulanIni; }), function (p) { return p.subtotal || 0; }),
      saldo: saldo(sellerId), iklan: statistikIklan(sellerId)
    };
  }

  function statistikMarketplace() {
    var toko = semuaToko();
    var pesanan = DB.where('shopOrders', function (p) { return p.sellerId && p.status !== 'dibatalkan'; });
    var komisi = U.sum(pesanan, function (p) {
      var r = rincianPesanan(p.id); return r ? r.komisi : 0; });
    return {
      tokoTotal: toko.length,
      tokoAktif: toko.filter(tokoAktif).length,
      tokoVerifikasi: toko.filter(function (u) { return statusToko(u) === 'verifikasi'; }).length,
      produkMitra: DB.where('products', function (p) { return !!p.sellerId; }).length,
      moderasi: produkMenungguModerasi().length,
      pesananMitra: pesanan.length,
      gmv: U.sum(pesanan, function (p) { return p.subtotal || 0; }),
      komisi: komisi,
      pendapatanIklan: U.sum(DB.all('iklan'), function (i) { return i.terpakai || 0; }),
      cairDiajukan: DB.where('sellerPayouts', { status: 'diajukan' }),
      kampanyeAktif: kampanyeAktif().length
    };
  }

  function chip(map, key) {
    var m = map[key] || { t: key, c: 'muted' };
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    STATUS_TOKO: STATUS_TOKO, toko: toko, statusToko: statusToko, tokoAktif: tokoAktif,
    semuaToko: semuaToko, tokoAktifSemua: tokoAktifSemua, simpanToko: simpanToko,
    namaToko: namaToko, tokoResmi: tokoResmi,
    langkahToko: langkahToko, ringkasToko: ringkasToko, siapVerifikasiToko: siapVerifikasiToko,
    ajukanToko: ajukanToko, setujuiToko: setujuiToko, tolakToko: tolakToko,
    STATUS_PRODUK: STATUS_PRODUK, statusProduk: statusProduk, produkToko: produkToko,
    produkMenungguModerasi: produkMenungguModerasi, produkTayang: produkTayang,
    moderasiProduk: moderasiProduk, komisiPersen: komisiPersen,
    TIPE_KAMPANYE: TIPE_KAMPANYE, kampanyeAktif: kampanyeAktif, kampanyeMendatang: kampanyeMendatang,
    ikutKampanye: ikutKampanye, keluarKampanye: keluarKampanye,
    kampanyeProduk: kampanyeProduk, hargaTayang: hargaTayang,
    TIPE_IKLAN: TIPE_IKLAN, STATUS_IKLAN: STATUS_IKLAN, tarifIklan: tarifIklan,
    saldoIklan: saldoIklan, topUpIklan: topUpIklan, iklanSeller: iklanSeller, buatIklan: buatIklan,
    iklanTayang: iklanTayang, catatTayang: catatTayang, catatKlik: catatKlik, jedaIklan: jedaIklan,
    statistikIklan: statistikIklan,
    rincianPesanan: rincianPesanan, tanggalCair: tanggalCair, pesananToko: pesananToko, saldo: saldo,
    STATUS_CAIR: STATUS_CAIR, ajukanPencairan: ajukanPencairan, prosesPencairan: prosesPencairan,
    bayarPencairan: bayarPencairan, tolakPencairan: tolakPencairan, pencairanSeller: pencairanSeller,
    statistikToko: statistikToko, statistikMarketplace: statistikMarketplace, chip: chip
  };
})();
