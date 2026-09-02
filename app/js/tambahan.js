/* ==========================================================================
   tambahan.js — layanan tambahan & asuransi pengiriman
   --------------------------------------------------------------------------
   KENAPA INI ADA SEBAGAI MODUL, BUKAN SEBAGAI BARIS DI LAYAR CHECKOUT

   Halaman checkout menampilkan hal-hal yang menambah tagihan: perlindungan
   barang, asuransi pengiriman, garansi pengembalian. Semuanya menyangkut uang
   dan janji kepada pembeli — kalau harganya dikarang di dalam kode tampilan,
   ia akan berbeda antara layar checkout dan pesanan yang tersimpan, dan yang
   ditagih belum tentu yang dijanjikan.

   Karena itu semuanya dihitung di sini, dari setelan yang bisa dilihat dan
   diubah admin, lalu DIBEKUKAN pada pesanan saat dibuat — sama seperti tarif
   kurir, skema bagi hasil, dan ketentuan voucher di aplikasi ini.

   YANG DISENGAJA: TIDAK ADA HARGA YANG DITEBAK
   Setiap angka di sini punya rumus yang bisa ditunjuk. Asuransi persentase
   dari nilai barang; perlindungan produk persentase dari harganya dengan
   batas bawah. Tidak ada "kira-kira sekian" — pembeli berhak tahu kenapa
   angkanya segitu, dan admin berhak bisa mengubahnya tanpa menyentuh kode.
   ========================================================================== */
var TAMBAHAN = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  var BAWAAN = {
    /* --- asuransi pengiriman --- */
    asuransi: {
      aktif: true,
      persen: 0.6,          /* dari nilai barang */
      minimum: 2500,        /* biaya terkecil yang masuk akal ditagih */
      /* Dicentang otomatis di atas nilai ini. Barang mahal yang hilang di
         jalan adalah kerugian yang tidak bisa ditutup ongkir; barang murah
         tidak sepadan dengan biayanya. */
      otomatisDiAtas: 1000000
    },

    /* --- perlindungan produk (garansi tambahan) --- */
    proteksi: {
      aktif: true,
      persen: 1.2,          /* dari harga barang */
      minimum: 15000,
      /* Hanya untuk kategori yang memang bisa rusak dan mahal diperbaiki.
         Menawarkannya untuk sabun cair hanya membuat orang berhenti membaca
         tawaran mana pun. */
      kategori: ['Mesin & Peralatan', 'APD & Keselamatan Kerja'],
      bulan: 12
    },

    /* --- garansi pengembalian --- */
    pengembalian: {
      aktif: true,
      hari: 7
    }
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.tambahan) { s.tambahan = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    Object.keys(BAWAAN).forEach(function (k) {
      if (s.tambahan[k] === undefined) s.tambahan[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    return s.tambahan;
  }

  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
        Object.assign(c[k], patch[k]);
      } else c[k] = patch[k];
    });
    DB.save(true);
    return c;
  }

  /* ================================================================ ASURANSI */
  /** Biaya asuransi untuk satu nilai barang. 0 bila fiturnya dimatikan. */
  function biayaAsuransi(nilaiBarang) {
    var c = config().asuransi;
    if (!c.aktif || !nilaiBarang) return 0;
    return Math.max(c.minimum, Math.round(nilaiBarang * c.persen / 100));
  }

  /** Apakah asuransi sebaiknya tercentang dari awal untuk nilai sebesar ini. */
  function asuransiBawaan(nilaiBarang) {
    var c = config().asuransi;
    return !!c.aktif && nilaiBarang >= c.otomatisDiAtas;
  }

  /* =============================================================== PROTEKSI */
  function bolehProteksi(produk) {
    var c = config().proteksi;
    return !!c.aktif && !!produk && c.kategori.indexOf(produk.kategori) >= 0;
  }

  function biayaProteksi(produk, qty) {
    var c = config().proteksi;
    if (!bolehProteksi(produk)) return 0;
    var ht = SELLER.hargaTayang(produk);
    return Math.max(c.minimum, Math.round(ht.harga * c.persen / 100)) * (qty || 1);
  }

  function namaProteksi() {
    return T('Proteksi Elektronik') + ' ' + config().proteksi.bulan + ' ' + T('Bulan');
  }

  /**
   * Layanan tambahan yang bisa dipilih untuk satu barang di keranjang.
   * Dikembalikan sebagai daftar supaya layar tidak perlu tahu ada berapa
   * jenis — menambah jenis baru nanti tidak menyentuh layar sama sekali.
   */
  function untukBarang(item) {
    var out = [];
    if (bolehProteksi(item.produk)) {
      out.push({
        kode: 'proteksi',
        nama: namaProteksi(),
        biaya: biayaProteksi(item.produk, item.qty),
        ket: T('Ganti rugi kerusakan bukan karena pemakaian salah, selama') + ' ' +
             config().proteksi.bulan + ' ' + T('bulan')
      });
    }
    return out;
  }

  /* ========================================================== PENGEMBALIAN */
  function bolehDikembalikan(produk) {
    var c = config().pengembalian;
    /* Barang habis pakai tidak bisa dikembalikan setelah dibuka, dan
       menjanjikannya akan berakhir sebagai sengketa yang kita kalah. */
    return !!c.aktif && !!produk && produk.kategori !== 'Consumable';
  }
  function hariPengembalian() { return config().pengembalian.hari; }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    biayaAsuransi: biayaAsuransi, asuransiBawaan: asuransiBawaan,
    bolehProteksi: bolehProteksi, biayaProteksi: biayaProteksi, namaProteksi: namaProteksi,
    untukBarang: untukBarang,
    bolehDikembalikan: bolehDikembalikan, hariPengembalian: hariPengembalian
  };
})();
