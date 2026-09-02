/* ==========================================================================
   ulasan.js — ulasan produk toko
   --------------------------------------------------------------------------
   SIAPA YANG BOLEH MENULIS, DAN KENAPA ITU YANG PALING MENENTUKAN

   Ulasan hanya boleh datang dari orang yang BENAR-BENAR MEMBELI dan
   BENAR-BENAR MENERIMA barangnya. Bukan aturan sopan-santun: rata-rata
   bintang di katalog memengaruhi keputusan belanja orang lain, dan daftar
   yang bisa diisi siapa saja akan diisi oleh penjual yang memuji barangnya
   sendiri dan pesaing yang menjatuhkannya. Begitu itu terjadi, angkanya tidak
   pernah bisa dipercaya lagi — dan tidak ada cara memperbaikinya surut.

   Karena itu setiap ulasan terikat pada satu PESANAN yang berstatus selesai.
   Haknya lahir dari transaksi, bukan dari akun.

   SATU ULASAN PER PESANAN, BUKAN PER PRODUK
   Membeli barang yang sama dua kali dalam dua pesanan berarti dua pengalaman
   yang berbeda — dan keduanya layak ditulis. Yang dicegah hanyalah menulis
   dua kali untuk pesanan yang sama.

   RATA-RATA DIHITUNG, TIDAK PERNAH DISIMPAN
   Menyimpan rata-rata di produk berarti ada dua sumber kebenaran, dan yang
   tersimpan akan melenceng begitu satu ulasan dihapus atau disunting. Sama
   seperti saldo dompet di aplikasi ini: yang benar selalu hasil penjumlahan.
   ========================================================================== */
var ULASAN = (function () {
  'use strict';

  var BINTANG_MIN = 1;
  var BINTANG_MAKS = 5;
  var KOMENTAR_MAKS = 500;

  /* Status pesanan toko yang berarti barangnya sudah di tangan pembeli. */
  var STATUS_BOLEH = ['selesai'];

  function semua() { return DB.all('productReviews'); }

  /** Seluruh ulasan satu produk, terbaru di atas. */
  function produk(productId) {
    return U.sortBy(DB.where('productReviews', { productId: productId }),
      function (r) { return r.at || r.createdAt; }, true);
  }

  /**
   * Ringkasan satu produk: { n, rata, sebaran }.
   *
   * Dihitung setiap kali diminta. Untuk katalog seukuran ini biayanya tidak
   * terasa, dan penyimpanan yang tidak ada tidak bisa melenceng.
   */
  function ringkas(productId) {
    var r = DB.where('productReviews', { productId: productId });
    if (!r.length) return { n: 0, rata: 0, sebaran: [0, 0, 0, 0, 0] };
    var jml = 0, sebaran = [0, 0, 0, 0, 0];
    r.forEach(function (x) {
      var b = Math.max(BINTANG_MIN, Math.min(BINTANG_MAKS, x.bintang || 0));
      jml += b;
      sebaran[b - 1]++;
    });
    return {
      n: r.length,
      /* Satu angka di belakang koma. Dua angka memberi kesan ketelitian yang
         tidak dimiliki data sekecil ini. */
      rata: Math.round((jml / r.length) * 10) / 10,
      sebaran: sebaran
    };
  }

  /** Ringkasan untuk banyak produk sekaligus — dipakai pengurutan katalog. */
  function ringkasSemua() {
    var out = {};
    DB.all('productReviews').forEach(function (x) {
      var o = out[x.productId] || (out[x.productId] = { n: 0, jml: 0 });
      o.n++; o.jml += x.bintang || 0;
    });
    Object.keys(out).forEach(function (k) {
      out[k].rata = Math.round((out[k].jml / out[k].n) * 10) / 10;
    });
    return out;
  }

  function sudahMenulis(shopOrderId, productId) {
    return DB.where('productReviews', function (r) {
      return r.shopOrderId === shopOrderId && r.productId === productId;
    })[0] || null;
  }

  /**
   * Barang pada satu pesanan yang masih boleh diulas.
   * Mengembalikan daftar kosong bila pesanannya belum diterima — hak menulis
   * lahir dari barang yang sudah sampai, bukan dari pesanan yang sudah dibuat.
   */
  function bisaDiulas(shopOrderId) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so || STATUS_BOLEH.indexOf(so.status) < 0) return [];
    return (so.items || []).filter(function (i) {
      return !sudahMenulis(shopOrderId, i.productId);
    }).map(function (i) {
      return { productId: i.productId, produk: BIZ.produk(i.productId), qty: i.qty };
    }).filter(function (x) { return !!x.produk; });
  }

  /** Berapa barang yang menunggu diulas di seluruh pesanan seorang klien. */
  function menungguUlasan(clientId) {
    var n = 0;
    DB.where('shopOrders', { clientId: clientId }).forEach(function (so) {
      n += bisaDiulas(so.id).length;
    });
    return n;
  }

  /**
   * Tulis satu ulasan.
   *
   * Seluruh syaratnya diperiksa DI SINI, bukan di layar. Layar bisa lebih dari
   * satu — halaman pesanan, halaman produk, notifikasi — dan syarat yang
   * ditegakkan di layar hanya berlaku pada layar yang mengingatnya.
   */
  function tulis(clientId, shopOrderId, productId, bintang, komentar) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) throw new Error(I18N.t('Pesanan tidak ditemukan'));
    if (so.clientId !== clientId) throw new Error(I18N.t('Hanya pembeli pesanan ini yang bisa menulis ulasannya'));
    if (STATUS_BOLEH.indexOf(so.status) < 0) {
      throw new Error(I18N.t('Ulasan baru bisa ditulis setelah barangnya diterima'));
    }
    if (!(so.items || []).some(function (i) { return i.productId === productId; })) {
      throw new Error(I18N.t('Barang itu tidak ada pada pesanan ini'));
    }
    if (sudahMenulis(shopOrderId, productId)) {
      throw new Error(I18N.t('Barang ini sudah Anda ulas pada pesanan tersebut'));
    }
    var b = Math.round(Number(bintang) || 0);
    if (b < BINTANG_MIN || b > BINTANG_MAKS) throw new Error('Beri bintang 1 sampai 5');

    return DB.insert('productReviews', {
      productId: productId,
      clientId: clientId,
      shopOrderId: shopOrderId,
      /* sellerId ikut dibekukan: produk bisa berpindah penjual, dan ulasan
         yang berpindah bersamanya akan memuji toko yang tidak pernah
         mengirimnya. */
      sellerId: (BIZ.produk(productId) || {}).sellerId || null,
      bintang: b,
      komentar: String(komentar || '').trim().slice(0, KOMENTAR_MAKS),
      at: U.nowISO()
    });
  }

  /** Hapus ulasan — hanya penulisnya sendiri, atau admin. */
  function hapus(user, ulasanId) {
    var r = DB.find('productReviews', ulasanId);
    if (!r) return false;
    var boleh = r.clientId === user.id || user.role === 'admin' || user.role === 'superadmin';
    if (!boleh) throw new Error(I18N.t('Hanya penulisnya yang bisa menghapus ulasan ini'));
    DB.remove('productReviews', ulasanId);
    return true;
  }

  return {
    BINTANG_MIN: BINTANG_MIN, BINTANG_MAKS: BINTANG_MAKS, KOMENTAR_MAKS: KOMENTAR_MAKS,
    semua: semua, produk: produk, ringkas: ringkas, ringkasSemua: ringkasSemua,
    sudahMenulis: sudahMenulis, bisaDiulas: bisaDiulas, menungguUlasan: menungguUlasan,
    tulis: tulis, hapus: hapus
  };
})();
