/* ==========================================================================
   insentif.js — cashback, pemakaian poin langsung, dan voucher ongkir
   --------------------------------------------------------------------------
   SATU BUKU BESAR, BUKAN TIGA

   Cashback TIDAK diberi tabel saldo sendiri. Ia dicatat sebagai POIN, lewat
   POIN.tulis(), memakai buku besar yang sudah ada.

   Alasannya bukan kemalasan. Saldo yang berdiri sendiri harus mengulang
   semuanya dari nol: kedaluwarsa, urutan pemakaian tertua dulu, pembatalan
   saat pesanan batal, dan penjumlahan yang harus cocok dengan riwayat. Tiap
   pengulangan itu adalah tempat baru untuk selisih — dan selisih pada saldo
   pelanggan tidak pernah ketahuan dari layar; ketahuannya saat pelanggan
   menghitung sendiri dan angkanya beda.

   Yang membedakan cashback dari poin biasa hanya SEBABNYA, dan itu sudah
   tercatat pada kolom sumber tiap mutasi.

   CASHBACK DIBAYAR SETELAH TUNTAS, BUKAN SAAT MEMBAYAR

   Diberikan ketika pekerjaan diverifikasi atau pesanan diterima — bukan saat
   uangnya masuk. Cashback yang dibayarkan lebih awal harus ditarik kembali
   bila pesanan batal, dan menarik kembali sesuatu yang sudah dipakai
   pelanggan adalah percakapan yang tidak pernah berakhir baik.

   POIN DIPAKAI SETELAH DISKON, SEBELUM PPN
   Urutannya menentukan angkanya. Poin adalah alat bayar, bukan potongan
   harga: memakainya sebelum PPN akan mengecilkan pajak yang seharusnya
   dipungut atas nilai barang yang sebenarnya.
   ========================================================================== */
var INSENTIF = (function () {
  'use strict';

  var BAWAAN = {
    /* --- cashback --- */
    cashback: {
      aktif: false,                /* sengaja mati sampai dinyalakan sendiri */
      jasa:  { aktif: true, persen: 2, maks: 50000, minBelanja: 200000 },
      toko:  { aktif: true, persen: 1, maks: 25000, minBelanja: 100000 },
      /* Cashback dibayar sebagai poin. Kursnya mengikuti nilai tukar poin,
         supaya "Rp10.000 cashback" benar-benar bisa dipakai senilai itu. */
      ket: 'Cashback dibayarkan sebagai poin setelah pekerjaan tuntas atau pesanan diterima.'
    },

    /* --- pemakaian poin langsung saat bayar --- */
    pakaiPoin: {
      aktif: true,
      /* Batas berapa persen dari tagihan yang boleh dibayar dengan poin.
         Tanpa batas, satu pelanggan bisa membayar seluruh tagihan dengan
         poin dan pendapatan tunai pesanan itu nol — sementara biaya kurir,
         komisi mitra, dan pajaknya tetap harus dibayar tunai. */
      maksPersen: 30,
      minSaldo: 100
    }
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.insentif) { s.insentif = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.insentif;
    Object.keys(BAWAAN).forEach(function (k) {
      if (c[k] === undefined) c[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
      else Object.keys(BAWAAN[k]).forEach(function (x) {
        if (c[k][x] === undefined) c[k][x] = JSON.parse(JSON.stringify(BAWAAN[k][x]));
      });
    });
    return c;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ============================================================== CASHBACK */

  function aturanCashback(lingkup) {
    var c = config().cashback;
    if (!c.aktif) return null;
    var a = c[lingkup === 'toko' ? 'toko' : 'jasa'];
    return a && a.aktif ? a : null;
  }

  /**
   * Berapa cashback untuk satu nilai belanja — dalam RUPIAH.
   *
   * Mengembalikan nol beserta sebabnya, bukan sekadar nol. Layar perlu bisa
   * mengatakan "belanja Rp50.000 lagi untuk dapat cashback", dan itu mustahil
   * bila yang dikembalikan hanya angka.
   */
  function hitungCashback(lingkup, nilai) {
    var a = aturanCashback(lingkup);
    if (!a) return { rp: 0, sebab: 'mati', kurang: 0 };
    var dasar = Math.max(0, nilai || 0);
    if (dasar < (a.minBelanja || 0)) {
      return { rp: 0, sebab: 'minimal', kurang: (a.minBelanja || 0) - dasar,
               minBelanja: a.minBelanja };
    }
    var rp = Math.floor(dasar * (a.persen || 0) / 100);
    var kena = !!(a.maks && rp > a.maks);
    if (kena) rp = a.maks;
    return { rp: rp, sebab: 'ok', persen: a.persen, maks: a.maks, kenaBatas: kena };
  }

  /** Rupiah cashback → poin, memakai nilai tukar poin yang berlaku. */
  function keP(rp) {
    var nilai = (POIN.config().nilaiTukar || 1);
    return Math.floor(rp / Math.max(1, nilai));
  }

  /**
   * Bayarkan cashback untuk satu pesanan.
   *
   * Idempoten lewat POIN.sudahAda: satu pesanan hanya menghasilkan satu
   * cashback, berapa kali pun fungsi ini dipanggil. Perubahan status yang
   * bolak-balik — diverifikasi, dibuka lagi, diverifikasi lagi — tidak boleh
   * membayar dua kali.
   */
  function bayarCashback(userId, lingkup, nilai, ref) {
    if (!userId || !POIN.aktif()) return null;
    var h = hitungCashback(lingkup, nilai);
    if (!h.rp) return null;
    var poin = keP(h.rp);
    if (!poin) return null;
    if (ref && ref.id && POIN.sudahAda(userId, 'cashback', ref.id)) return null;

    return POIN.tulis(userId, poin, 'perolehan',
      'Cashback ' + (h.persen || 0) + I18N.t('% dari') + ' ' + U.rp(nilai), ref, 'cashback',
      { persen: h.persen, maks: h.maks, dasar: nilai, rupiah: h.rp });
  }

  /* ========================================================= PAKAI POIN
     "Bonus dipakai" pada struk. Poin dipakai LANGSUNG sebagai alat bayar,
     tanpa harus ditukar jadi voucher dulu. */

  function bisaPakaiPoin(userId) {
    var c = config().pakaiPoin;
    if (!c.aktif || !POIN.aktif() || !userId) return false;
    return POIN.saldo(userId) >= (c.minSaldo || 0);
  }

  /**
   * Berapa poin yang boleh dipakai pada satu tagihan, dan berapa rupiahnya.
   *
   * `dasar` adalah nilai yang boleh dibayar dengan poin — subtotal setelah
   * diskon, TANPA ongkir dan TANPA PPN. Ongkir diteruskan ke kurir dan pajak
   * disetor ke negara; keduanya tidak bisa dibayar dengan poin milik program
   * loyalitas sendiri.
   */
  function batasPoin(userId, dasar) {
    var c = config().pakaiPoin;
    var kosong = { poin: 0, rp: 0, maksRp: 0, saldo: 0, alasan: 'mati' };
    if (!c.aktif || !POIN.aktif() || !userId) return kosong;

    var saldo = POIN.saldo(userId);
    var nilai = POIN.config().nilaiTukar || 1;
    if (saldo < (c.minSaldo || 0)) {
      return { poin: 0, rp: 0, maksRp: 0, saldo: saldo, alasan: 'minSaldo',
               minSaldo: c.minSaldo };
    }

    var maksRp = Math.floor(Math.max(0, dasar || 0) * (c.maksPersen || 0) / 100);
    var maksPoin = Math.floor(maksRp / Math.max(1, nilai));
    var poin = Math.min(saldo, maksPoin);
    return {
      poin: poin, rp: poin * nilai, maksRp: maksRp, saldo: saldo,
      nilaiTukar: nilai, maksPersen: c.maksPersen,
      alasan: poin ? 'ok' : 'terlaluKecil'
    };
  }

  /** Rupiah untuk sejumlah poin yang benar-benar dipilih pengguna. */
  function rupiahPoin(poin) {
    return Math.max(0, Math.round(poin || 0)) * (POIN.config().nilaiTukar || 1);
  }

  /**
   * Potong poin saat pesanan terbentuk.
   *
   * Dipanggil SETELAH pesanannya ada, bukan sebelum — supaya poin tidak
   * pernah terpotong untuk pesanan yang gagal dibuat. Mengembalikan mutasi
   * agar pemanggil bisa menyimpan rujukannya pada pesanan.
   */
  function potongPoin(userId, poin, ref, ket) {
    if (!poin || !userId) return null;
    var saldo = POIN.saldo(userId);
    if (poin > saldo) throw new Error(I18N.t('Poin tidak cukup.'));
    return POIN.tulis(userId, -Math.abs(poin), 'pemakaian',
      ket || I18N.t('Dipakai untuk pembayaran'), ref, 'pakaiBayar',
      { rupiah: rupiahPoin(poin) });
  }

  /** Kembalikan poin bila pesanannya dibatalkan. */
  function kembalikanPoin(userId, poin, ref) {
    if (!poin || !userId) return null;
    /* Idempoten: pembatalan yang diproses dua kali tidak boleh
       mengembalikan poin dua kali. */
    if (ref && ref.id && POIN.sudahAda(userId, 'pakaiBayarBatal', ref.id)) return null;
    return POIN.tulis(userId, Math.abs(poin), 'perolehan',
      I18N.t('Dikembalikan — pesanan dibatalkan'), ref, 'pakaiBayarBatal',
      { rupiah: rupiahPoin(poin) });
  }

  /* ==================================================== VOUCHER ONGKIR
     Voucher ongkir sudah ada di katalog penukaran poin. Yang belum ada adalah
     jalannya sampai ke perhitungan checkout — dan voucher yang dimiliki tetapi
     tidak bisa dipakai lebih mengecewakan daripada voucher yang tidak ada. */

  function voucherOngkir(userId) {
    if (!POIN.aktif() || !userId) return [];
    return POIN.voucherAktif(userId).filter(function (v) { return v.jenis === 'ongkir'; });
  }

  function voucherPotongan(userId) {
    if (!POIN.aktif() || !userId) return [];
    return POIN.voucherAktif(userId).filter(function (v) { return v.jenis === 'voucher'; });
  }

  /** Potongan ongkir dari satu voucher — tidak pernah melebihi ongkirnya. */
  function potonganOngkir(v, ongkir) {
    if (!v || v.jenis !== 'ongkir') return { rp: 0, sisaHangus: 0 };
    return POIN.potongan(v, { ongkir: ongkir || 0, subtotal: 0 });
  }

  /* ============================================================== RINGKASAN */

  /**
   * Semua insentif untuk satu tagihan, dalam satu panggilan.
   * Dipakai layar checkout supaya tidak ada dua tempat yang menghitung hal
   * yang sama dengan cara yang sedikit berbeda.
   */
  function untukCheckout(userId, opsi) {
    opsi = opsi || {};
    var subtotal = opsi.subtotal || 0;
    var ongkir = opsi.ongkir || 0;
    var diskon = opsi.diskon || 0;
    var lingkup = opsi.lingkup || 'toko';
    var dasarPoin = Math.max(0, subtotal - diskon);

    return {
      poin: batasPoin(userId, dasarPoin),
      bisaPoin: bisaPakaiPoin(userId),
      voucherOngkir: voucherOngkir(userId),
      cashback: hitungCashback(lingkup, dasarPoin),
      ongkir: ongkir
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    aturanCashback: aturanCashback, hitungCashback: hitungCashback,
    bayarCashback: bayarCashback, keP: keP,
    bisaPakaiPoin: bisaPakaiPoin, batasPoin: batasPoin, rupiahPoin: rupiahPoin,
    potongPoin: potongPoin, kembalikanPoin: kembalikanPoin,
    voucherOngkir: voucherOngkir, voucherPotongan: voucherPotongan,
    potonganOngkir: potonganOngkir, untukCheckout: untukCheckout
  };
})();
