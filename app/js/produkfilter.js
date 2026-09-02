/* ==========================================================================
   produkfilter.js — keadaan dan aturan filter katalog produk
   --------------------------------------------------------------------------
   KENAPA TERPISAH DARI toko.js

   Yang ada di sini bukan tampilan, melainkan JAWABAN atas satu pertanyaan:
   "produk ini lolos saringan atau tidak". Layar boleh berganti bentuk berkali
   kali; aturannya tidak ikut berubah, dan aturan yang bercampur dengan HTML
   tidak bisa diuji tanpa membuka layar.

   SATU HAL YANG MEMBEDAKAN INI DARI FILTER BIASA

   Beberapa saringan BUTUH data yang belum tentu ada:
     – jarak dan durasi kirim butuh koordinat alamat pembeli
     – rating butuh ulasan yang sudah masuk
   Ketika datanya tidak ada, saringannya TIDAK diam-diam meloloskan semuanya
   dan TIDAK diam-diam menyaring habis. Ia dinyatakan tidak tersedia lewat
   bisaJarak(), supaya layar bisa mematikan pilihannya sambil menyebutkan
   sebabnya. Pilihan yang bisa ditekan tetapi tidak mengubah apa pun adalah
   cara tercepat membuat orang berhenti mempercayai seluruh filternya.
   ========================================================================== */
var PFILTER = (function () {
  'use strict';

  /* Keadaan filter. Sengaja hidup di memori, bukan di DB: ini pilihan sesaat
     milik satu sesi penelusuran, bukan pengaturan yang berlaku bagi orang
     lain atau bagi kunjungan berikutnya. */
  var F = kosong();

  function kosong() {
    return {
      gratisOngkir: false,
      radiusKm: 0,          /* 0 = tanpa batas jarak */
      lokasi: [],           /* nama kota toko */
      jenisToko: [],        /* 'resmi' | 'mitra' */
      hargaMin: null,
      hargaMax: null,
      rating4: false,
      penawaran: [],        /* 'cod' | 'diskon' */
      kondisi: [],          /* 'baru' | 'bekas' */
      baruHari: 0,          /* 0 | 7 | 14 | 30 | 90 */
      lainnya: [],          /* 'stok' | 'preorder' */
      kirim: []             /* 'instan' | 'sameday' */
    };
  }

  function state() { return F; }
  function reset() { F = kosong(); return F; }

  /** Salinan lepas, untuk layar yang menyunting dulu baru menerapkan. */
  function salin(s) { return JSON.parse(JSON.stringify(s || F)); }
  function pakai(s) { F = Object.assign(kosong(), s || {}); return F; }

  function nyalaMati(daftar, nilai) {
    var i = daftar.indexOf(nilai);
    if (i >= 0) daftar.splice(i, 1); else daftar.push(nilai);
    return daftar;
  }

  /* ================================================================ HITUNGAN
     Jumlah saringan yang sedang menyala — untuk lencana pada tombol Filter.
     Dihitung per PILIHAN, bukan per bagian: memilih tiga kota adalah tiga
     hal yang sedang membatasi hasil, dan menyebutnya "1" membuat orang
     mengira sisanya sudah lepas. */
  function jumlahAktif(s) {
    s = s || F;
    var n = 0;
    if (s.gratisOngkir) n++;
    if (s.radiusKm) n++;
    n += s.lokasi.length + s.jenisToko.length + s.penawaran.length +
         s.kondisi.length + s.lainnya.length + s.kirim.length;
    if (s.hargaMin !== null || s.hargaMax !== null) n++;
    if (s.rating4) n++;
    if (s.baruHari) n++;
    return n;
  }

  function adaYangAktif(s) { return jumlahAktif(s) > 0; }

  /* ================================================================== TOKO */

  /** Data toko penjual sebuah produk. Tanpa sellerId berarti Toko Resmi. */
  function tokoDari(p) {
    if (!p.sellerId) return null;
    var u = DB.find('users', p.sellerId);
    return u && window.SELLER ? SELLER.toko(u) : null;
  }

  function kotaToko(p) {
    var t = tokoDari(p);
    if (t && t.kota) return t.kota;
    /* Toko Resmi tidak punya baris kota tersendiri; kotanya adalah kota
       alamat asal pengiriman, yang memang dari sanalah barangnya berangkat. */
    return 'Jakarta Selatan';
  }

  /** Daftar kota yang BENAR-BENAR punya produk, bukan daftar kota Indonesia. */
  function kotaList(katalog) {
    var out = [], hitung = {};
    (katalog || []).forEach(function (p) {
      var k = kotaToko(p);
      if (!k) return;
      if (hitung[k] === undefined) { hitung[k] = 0; out.push(k); }
      hitung[k]++;
    });
    return out.map(function (k) { return { kota: k, n: hitung[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  /* ================================================================= JARAK
     Titik pembeli diambil dari alamat utamanya. Tanpa koordinat, tidak ada
     jarak yang bisa dihitung — dan menebaknya dari nama kota akan
     menghasilkan angka yang terlihat pasti padahal karangan. */
  function titikSaya() {
    var u = window.APP ? APP.user : null;
    if (!u || !window.BIZ || !window.MAPS) return null;
    var a = BIZ.alamatUtama(u);
    if (!a || !MAPS.valid(a.koordinat)) return null;
    return a.koordinat;
  }

  function bisaJarak() { return !!titikSaya(); }

  /** Jarak pembeli ke toko produk ini, dalam km. null bila tidak terhitung. */
  function jarakKe(p) {
    var saya = titikSaya();
    if (!saya || !window.KIRIM || !window.MAPS) return null;
    var asal = KIRIM.asalToko(p.sellerId || null);
    if (!asal || typeof asal.lat !== 'number') return null;
    return MAPS.jarakKm(saya, { lat: asal.lat, lng: asal.lng });
  }

  /* Jangkauan kurir instan dan sehari-sampai, dalam km. Angka simulasi:
     dalam mode live, yang menentukan adalah jawaban Biteship untuk alamat
     tujuan sebenarnya, bukan angka di sini. */
  function radiusKirim(jenis) {
    var c = window.KIRIM ? KIRIM.config() : {};
    if (jenis === 'instan') return c.radiusInstanKm || 25;
    return c.radiusSameDayKm || 60;
  }

  /* ================================================================= HARGA
     Rentang siap-pakai dihitung dari harga yang BENAR-BENAR ada di katalog,
     bukan angka bulat yang enak dilihat. Rentang karangan menghasilkan
     pilihan yang isinya nol — dan pilihan kosong membuat orang menyimpulkan
     barangnya tidak ada, bukan bahwa rentangnya yang salah. */
  function rentangHarga(katalog) {
    var h = (katalog || []).map(function (p) {
      return window.SELLER ? SELLER.hargaTayang(p).harga : p.harga;
    }).filter(function (x) { return typeof x === 'number' && x > 0; })
      .sort(function (a, b) { return a - b; });
    if (h.length < 4) return [];
    var q = function (f) { return h[Math.min(h.length - 1, Math.floor(h.length * f))]; };
    var batas = [h[0], q(0.34), q(0.67), h[h.length - 1]];
    var out = [];
    for (var i = 0; i < 3; i++) {
      if (batas[i + 1] <= batas[i]) continue;
      out.push({ min: batas[i], max: batas[i + 1] });
    }
    return out;
  }

  /* ================================================================ SARINGAN */

  function hargaProduk(p) {
    return window.SELLER ? SELLER.hargaTayang(p).harga : p.harga;
  }

  function kampanyeTipe(p) {
    if (!window.SELLER) return null;
    var k = SELLER.kampanyeProduk(p.id);
    return k ? k.tipe : null;
  }

  function ratingProduk(p) {
    if (!window.ULASAN) return null;
    var r = ULASAN.ringkas(p.id);
    return r && r.n ? r.rata : null;
  }

  function codToko(p) {
    var t = tokoDari(p);
    /* Toko Resmi mengikuti pengaturan pembayaran aplikasi; mitra menentukan
       sendiri. `cod === false` berarti sengaja dimatikan, bukan belum diisi. */
    if (!t) return true;
    return t.cod !== false;
  }

  function umurHari(p) {
    if (!p.createdAt) return null;
    var t = Date.parse(p.createdAt);
    if (isNaN(t)) return null;
    return (Date.now() - t) / 86400000;
  }

  /**
   * Lolos tidaknya satu produk terhadap keadaan filter.
   *
   * Di dalam satu bagian, pilihan bersifat ATAU (dua kota berarti kedua kota
   * ikut). Antar bagian bersifat DAN. Itu yang diharapkan orang dari daftar
   * kotak pilihan, dan membaliknya membuat memilih lebih banyak justru
   * menghasilkan lebih sedikit.
   */
  function cocok(p, s) {
    s = s || F;

    if (s.gratisOngkir && kampanyeTipe(p) !== 'gratis_ongkir') return false;

    if (s.radiusKm) {
      var km = jarakKe(p);
      if (km === null || km > s.radiusKm) return false;
    }

    if (s.lokasi.length && s.lokasi.indexOf(kotaToko(p)) < 0) return false;

    if (s.jenisToko.length) {
      var jenis = p.sellerId ? 'mitra' : 'resmi';
      if (s.jenisToko.indexOf(jenis) < 0) return false;
    }

    var h = hargaProduk(p);
    if (s.hargaMin !== null && h < s.hargaMin) return false;
    if (s.hargaMax !== null && h > s.hargaMax) return false;

    if (s.rating4) {
      var r = ratingProduk(p);
      /* Produk belum berulas TIDAK dianggap berbintang nol. Ia hanya tidak
         memenuhi syarat "rating 4 ke atas", karena memang belum ada
         ratingnya — bukan karena dinilai buruk. */
      if (r === null || r < 4) return false;
    }

    if (s.penawaran.length) {
      var lolosTawar = s.penawaran.some(function (x) {
        if (x === 'cod') return codToko(p);
        if (x === 'diskon') {
          var t = kampanyeTipe(p);
          return t === 'flash_sale' || t === 'diskon_kategori' || t === 'hari_besar';
        }
        return false;
      });
      if (!lolosTawar) return false;
    }

    if (s.kondisi.length && s.kondisi.indexOf(p.kondisi || 'baru') < 0) return false;

    if (s.baruHari) {
      var u = umurHari(p);
      if (u === null || u > s.baruHari) return false;
    }

    if (s.lainnya.length) {
      var lolosLain = s.lainnya.some(function (x) {
        if (x === 'stok') return (p.stok || 0) > 0;
        if (x === 'preorder') return !!p.preorder;
        return false;
      });
      if (!lolosLain) return false;
    }

    if (s.kirim.length) {
      var jarak = jarakKe(p);
      if (jarak === null) return false;
      var lolosKirim = s.kirim.some(function (x) { return jarak <= radiusKirim(x); });
      if (!lolosKirim) return false;
    }

    return true;
  }

  return {
    kosong: kosong, state: state, reset: reset, salin: salin, pakai: pakai,
    nyalaMati: nyalaMati, jumlahAktif: jumlahAktif, adaYangAktif: adaYangAktif,
    tokoDari: tokoDari, kotaToko: kotaToko, kotaList: kotaList,
    titikSaya: titikSaya, bisaJarak: bisaJarak, jarakKe: jarakKe, radiusKirim: radiusKirim,
    rentangHarga: rentangHarga, hargaProduk: hargaProduk, ratingProduk: ratingProduk,
    codToko: codToko, cocok: cocok
  };
})();
