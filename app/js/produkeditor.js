/* ==========================================================================
   produkeditor.js — aturan penyusunan produk toko
   --------------------------------------------------------------------------
   DRAF DISIMPAN SEJAK LANGKAH PERTAMA, BUKAN SAAT SELESAI

   Formulir panjang yang baru menyimpan di ujung adalah formulir yang
   menghukum orang karena tab tertutup, baterai habis, atau salah tekan.
   Produk dibuatkan barisnya sejak nama diisi, berstatus `draf`, lalu
   disempurnakan langkah demi langkah. Draf tidak pernah tampil di katalog —
   yang menahannya `aktif:false` DAN `statusProduk:'draf'`, dua-duanya, supaya
   satu kelalaian tidak cukup untuk membocorkannya.

   Foto juga menuntut hal yang sama: MEDIA menyimpan ke sebuah produk, jadi
   produknya harus sudah ada sebelum fotonya bisa ditempel. Tanpa draf, langkah
   foto mustahil ditaruh di mana pun kecuali paling akhir.

   HARGA GROSIR DAN DISKON KAMPANYE TIDAK DITUMPUK

   Keduanya sama-sama menurunkan harga. Menumpuknya membuat flash sale di atas
   harga grosir jatuh ke angka yang tidak pernah diniatkan penjual, dan yang
   menanggung selisihnya adalah orang yang tidak pernah menghitungnya. Yang
   dipakai adalah yang LEBIH MURAH bagi pembeli — satu aturan, bisa dijelaskan
   dalam satu kalimat, dan tidak pernah mengejutkan siapa pun.
   ========================================================================== */
var PRODUKED = (function () {
  'use strict';

  var KATEGORI = ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
                  'APD & Keselamatan Kerja', 'Consumable', 'Aksesoris'];

  var LANGKAH = [
    { id: 'info',   nama: 'Informasi Produk', ic: '📝' },
    { id: 'media',  nama: 'Foto & Video',     ic: '🖼️' },
    { id: 'varian', nama: 'Varian',           ic: '🎨' },
    { id: 'harga',  nama: 'Harga',            ic: '💰' },
    { id: 'stok',   nama: 'Stok & SKU',       ic: '📦' },
    { id: 'kirim',  nama: 'Pengiriman',       ic: '🚚' },
    { id: 'spek',   nama: 'Spesifikasi',      ic: '📋' }
  ];

  var STATUS = {
    draf:      { t: 'Draf', c: 'muted', ket: 'Belum dikirim — hanya Anda yang melihatnya.' },
    menunggu:  { t: 'Menunggu moderasi', c: 'warn', ket: 'Sedang diperiksa admin sebelum tayang.' },
    aktif:     { t: 'Tayang', c: 'ok', ket: 'Sudah bisa dibeli di katalog.' },
    ditolak:   { t: 'Ditolak', c: 'err', ket: 'Perbaiki sesuai catatan admin lalu ajukan lagi.' }
  };

  /* ============================================================== DRAF BARU */

  function baru(sellerId) {
    return DB.insert('products', {
      sellerId: sellerId,
      nama: '', kode: '', kategori: KATEGORI[0], merek: '',
      harga: 0, satuan: 'unit', stok: 0, minStok: 5,
      icon: '📦', deskripsi: '',
      kondisi: 'baru', preorder: false,
      minOrder: 1, grosir: [], spesifikasi: [], media: [],
      beratGram: 0, dimensi: null,
      statusProduk: 'draf', aktif: false,
      urutan: 300 + DB.all('products').length,
      createdAt: U.nowISO()
    });
  }

  function simpan(id, patch) { return DB.update('products', id, patch); }

  /**
   * Draf yang dibuat tetapi belum diisi apa-apa.
   *
   * Dipakai ulang saat menekan "Tambah Produk" lagi. Tanpa ini, tiap ketukan
   * meninggalkan satu baris kosong di basis data — dan yang paling sering
   * menekannya adalah orang yang membuka halamannya lalu berubah pikiran.
   */
  function drafKosong(sellerId) {
    return drafToko(sellerId).filter(function (p) {
      return !String(p.nama || '').trim() && !String(p.kode || '').trim() &&
             !p.harga && !(p.media || []).length;
    })[0] || null;
  }

  /** Buang draf. Hanya draf — yang sudah diajukan tidak boleh lenyap begitu saja. */
  function hapusDraf(id) {
    var p = DB.find('products', id);
    if (!p) return false;
    if (p.statusProduk !== 'draf') {
      throw new Error(I18N.t('Hanya draf yang bisa dihapus. Produk yang sudah diajukan ditarik lewat moderasi.'));
    }
    DB.remove('products', id);
    return true;
  }

  /** Draf milik satu toko — yang belum pernah diajukan sama sekali. */
  function drafToko(sellerId) {
    return DB.where('products', function (p) {
      return p.sellerId === sellerId && p.statusProduk === 'draf'; });
  }

  /* ================================================================ HARGA
     Tingkat grosir: makin banyak, makin murah. Disimpan urut naik menurut
     jumlah minimum supaya pembacaannya tidak bergantung urutan pengisian. */

  function grosirRapi(list) {
    return (list || []).map(function (g) {
      return { minQty: Math.max(0, Math.round(+g.minQty || 0)),
               harga: Math.max(0, Math.round(+g.harga || 0)) };
    }).filter(function (g) { return g.minQty > 0 && g.harga > 0; })
      .sort(function (a, b) { return a.minQty - b.minQty; });
  }

  /**
   * Periksa satu daftar tingkat grosir terhadap harga satuan dan minimum
   * pembelian. Mengembalikan pesan pertama yang salah, atau null.
   */
  function periksaGrosir(list, hargaSatuan, minOrder) {
    var g = grosirRapi(list);
    var pesan = null;
    g.forEach(function (x, i) {
      if (pesan) return;
      if (x.harga >= hargaSatuan) {
        pesan = I18N.t('Harga grosir untuk {n} pcs harus lebih murah daripada harga satuan.')
          .replace('{n}', x.minQty);
        return;
      }
      if (x.minQty <= (minOrder || 1)) {
        pesan = I18N.t('Jumlah minimum grosir harus lebih besar daripada minimum pembelian ({n}).')
          .replace('{n}', minOrder || 1);
        return;
      }
      if (i > 0) {
        var s = g[i - 1];
        if (x.minQty === s.minQty) {
          pesan = I18N.t('Ada dua tingkat grosir dengan jumlah yang sama.'); return; }
        /* Tingkat yang lebih banyak tetapi lebih mahal membuat pembeli
           dihukum karena membeli lebih banyak — hampir selalu salah ketik. */
        if (x.harga >= s.harga) {
          pesan = I18N.t('Tingkat {a} pcs tidak lebih murah daripada tingkat {b} pcs.')
            .replace('{a}', x.minQty).replace('{b}', s.minQty);
        }
      }
    });
    return pesan;
  }

  /** Harga satuan untuk jumlah tertentu, sebelum diskon kampanye. */
  function hargaGrosir(p, qty) {
    var g = grosirRapi(p.grosir);
    var h = p.harga;
    g.forEach(function (x) { if (qty >= x.minQty) h = x.harga; });
    return h;
  }

  /**
   * Harga tayang untuk jumlah tertentu — grosir DAN kampanye dipertimbangkan,
   * lalu diambil yang lebih murah bagi pembeli. Lihat catatan di kepala berkas.
   */
  function hargaUntuk(p, qty) {
    var kampanye = window.SELLER ? SELLER.hargaTayang(p) : { harga: p.harga, asli: p.harga, kampanye: null };
    var grosir = hargaGrosir(p, qty || 1);
    if (grosir < kampanye.harga) {
      return { harga: grosir, asli: p.harga, kampanye: null, grosir: true, potongan: p.harga - grosir };
    }
    return Object.assign({}, kampanye, { grosir: false });
  }

  function minOrder(p) { return Math.max(1, Math.round(p.minOrder || 1)); }

  /* ========================================================= KELENGKAPAN
     Bukan sekadar hitungan persen: yang berguna adalah DAFTAR apa yang masih
     kurang. Angka sendirian cuma memberi tahu bahwa ada yang salah, tanpa
     memberi tahu di mana. */

  function periksa(p) {
    var kurang = [];
    function w(syarat, langkah, teks) { if (!syarat) kurang.push({ langkah: langkah, teks: teks }); }

    w(String(p.nama || '').trim().length >= 10, 'info',
      I18N.t('Nama produk minimal 10 huruf — sebutkan jenis, ukuran, dan isi kemasan.'));
    w(!!p.kategori, 'info', I18N.t('Kategori belum dipilih.'));
    w(String(p.deskripsi || '').trim().length >= 30, 'info',
      'Deskripsi minimal 30 huruf.');
    w(MEDIA.ringkas(p).foto >= 1, 'media', I18N.t('Belum ada satu pun foto produk.'));
    /* Pada produk bervarian, harga dan stok produk adalah HASIL — yang harus
       diperiksa adalah variannya, bukan angka turunannya. */
    if (window.VARIAN && VARIAN.punya(p)) {
      var salahVarian = VARIAN.periksa(p);
      w(!salahVarian, 'varian', salahVarian || '');
      w(VARIAN.stokTotal(p) > 0, 'varian', I18N.t('Semua varian kosong stoknya.'));
    } else {
      w(+p.harga > 0, 'harga', I18N.t('Harga jual belum diisi.'));
    }
    w(String(p.kode || '').trim().length > 0, 'stok', I18N.t('Kode produk (SKU) belum diisi.'));
    w(+p.beratGram > 0, 'kirim', I18N.t('Berat kirim belum diisi — ongkir tidak bisa dihitung tanpanya.'));

    var total = 7;
    return { kurang: kurang, persen: Math.round((total - kurang.length) / total * 100),
             siap: kurang.length === 0 };
  }

  /** Yang masih kurang pada satu langkah saja. */
  function kurangDi(p, langkah) {
    return periksa(p).kurang.filter(function (x) { return x.langkah === langkah; });
  }

  /* ================================================================ TERBIT */

  function kodeBentrok(kode, id) {
    return DB.all('products').filter(function (x) {
      return String(x.kode || '').toUpperCase() === String(kode || '').toUpperCase() && x.id !== id;
    }).length > 0;
  }

  /**
   * Ajukan produk untuk moderasi.
   *
   * Sengaja TIDAK langsung menayangkan. Barang yang bisa dibeli orang lain
   * melewati pemeriksaan admin dulu — itu aturan yang sudah berlaku di
   * aplikasi ini, dan editor baru tidak boleh jadi jalan memutarnya.
   */
  function ajukan(id) {
    var p = DB.find('products', id);
    if (!p) throw new Error(I18N.t('Produk tidak ditemukan.'));
    var cek = periksa(p);
    if (!cek.siap) {
      var n = cek.kurang.length;
      throw new Error(I18N.t(n === 1 ? 'Masih ada 1 hal yang perlu dilengkapi.'
                                    : I18N.t('Masih ada {n} hal yang perlu dilengkapi.'))
        .replace('{n}', n));
    }
    if (kodeBentrok(p.kode, p.id)) throw new Error(I18N.t('Kode produk sudah dipakai produk lain.'));
    var salah = periksaGrosir(p.grosir, p.harga, minOrder(p));
    if (salah) throw new Error(salah);
    if (window.VARIAN) {
      var salahV = VARIAN.periksa(p);
      if (salahV) throw new Error(salahV);
    }
    DB.update('products', id, { statusProduk: 'menunggu', aktif: false, grosir: grosirRapi(p.grosir) });
    return DB.find('products', id);
  }

  return {
    KATEGORI: KATEGORI, LANGKAH: LANGKAH, STATUS: STATUS,
    baru: baru, simpan: simpan, drafToko: drafToko, drafKosong: drafKosong, hapusDraf: hapusDraf,
    grosirRapi: grosirRapi, periksaGrosir: periksaGrosir,
    hargaGrosir: hargaGrosir, hargaUntuk: hargaUntuk, minOrder: minOrder,
    periksa: periksa, kurangDi: kurangDi, kodeBentrok: kodeBentrok, ajukan: ajukan
  };
})();
