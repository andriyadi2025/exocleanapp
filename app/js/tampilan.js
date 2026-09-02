/* ==========================================================================
   tampilan.js — kenyamanan mata: tema, warna aksen, ukuran teks, gerak
   --------------------------------------------------------------------------
   Staf kebersihan dan penyelia menatap layar ini sepanjang giliran kerja —
   sebagian di lobi yang terang benderang, sebagian di ruang panel yang remang,
   sebagian lagi di ponsel sambil berjalan. Satu setelan yang sama untuk semua
   keadaan itu bukan kenetralan, melainkan ketidakpedulian.

   DIPASANG SEBELUM APA PUN DIGAMBAR. Berkas ini dimuat di urutan awal dan
   memanggil terapkan() seketika, bukan menunggu APP.init(). Tema yang baru
   dipasang setelah halaman tergambar menghasilkan kedipan putih menyilaukan
   di ruang gelap — persis hal yang ingin dihindari orang yang menyalakannya.

   DUA TEMPAT SIMPAN, SENGAJA:
     · localStorage  — supaya layar masuk (sebelum ada pengguna) sudah benar,
                       dan supaya perangkat ini mengingatnya walau siapa pun
                       yang masuk.
     · preferensi pengguna — supaya ikut berpindah ke perangkat lain lewat
                       penyelarasan.
   Saat seseorang masuk, preferensi miliknyalah yang menang, lalu disalin ke
   localStorage. Selama belum masuk, localStorage yang dipakai.
   ========================================================================== */
window.TAMPILAN = (function () {
  'use strict';

  var KUNCI = 'exoclean.tampilan';

  /* Aksen yang boleh dipilih. Sengaja SEDIKIT dan sudah diperiksa
     keterbacaannya: pemilih warna bebas akan menghasilkan tombol kuning
     dengan tulisan putih, dan yang menderita karenanya bukan yang memilih. */
  var AKSEN = [
    { kode: 'app',    nama: 'Ikut aplikasi', warna: null },
    { kode: 'tosca',  nama: 'Tosca',   warna: '#14958A', gelap: '#0D6E65', tua: '#095049', muda: '#6DCBC2' },
    { kode: 'indigo', nama: 'Indigo',  warna: '#4F46E5', gelap: '#3730A3', tua: '#312E81', muda: '#A5B4FC' },
    { kode: 'laut',   nama: 'Biru laut', warna: '#0369A1', gelap: '#075985', tua: '#0C4A6E', muda: '#7DD3FC' },
    { kode: 'hutan',  nama: 'Hijau hutan', warna: '#15803D', gelap: '#166534', tua: '#14532D', muda: '#86EFAC' },
    { kode: 'plum',   nama: 'Plum',    warna: '#9D174D', gelap: '#831843', tua: '#500724', muda: '#F9A8D4' },
    { kode: 'arang',  nama: 'Arang',   warna: '#334155', gelap: '#1E293B', tua: '#0F172A', muda: '#94A3B8' }
  ];

  var BAWAAN = {
    tema: 'sistem',      /* terang | gelap | sistem */
    aksen: 'app',
    teks: 100,           /* 90 | 100 | 110 | 125 (persen) */
    padat: 'normal',     /* rapat | normal | lega */
    gerak: 'penuh',      /* penuh | kurang */
    kontras: false,      /* garis tepi dipertegas */
    notifBrowser: false  /* pemberitahuan peramban dinyalakan pengguna */
  };

  function aksen(kode) {
    return AKSEN.filter(function (a) { return a.kode === kode; })[0] || AKSEN[0];
  }

  /* ------------------------------------------------------------ simpanan */

  function dariLokal() {
    try {
      var v = JSON.parse(localStorage.getItem(KUNCI) || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }

  function keLokal(p) {
    try { localStorage.setItem(KUNCI, JSON.stringify(p)); } catch (e) {}
  }

  /** Setelan yang berlaku sekarang — bawaan ditimpa simpanan. */
  function baca() {
    var p = {}, l = dariLokal();
    Object.keys(BAWAAN).forEach(function (k) {
      p[k] = l[k] !== undefined ? l[k] : BAWAAN[k];
    });
    return p;
  }

  /* --------------------------------------------------------- penerapan */

  var mqGelap = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var mqGerak = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /** 'sistem' diterjemahkan di sini, BUKAN di CSS — supaya paletnya cuma ditulis sekali. */
  function temaNyata(pilihan) {
    if (pilihan === 'gelap') return 'gelap';
    if (pilihan === 'terang') return 'terang';
    return (mqGelap && mqGelap.matches) ? 'gelap' : 'terang';
  }

  function terapkan(p) {
    p = p || baca();
    var el = document.documentElement;
    var nyata = temaNyata(p.tema);

    el.setAttribute('data-tema', nyata);
    /* Pilihan aslinya disimpan terpisah supaya layar pengaturan bisa
       menampilkan "Ikut sistem" sebagai yang terpilih, bukan hasilnya. */
    el.setAttribute('data-tema-pilihan', p.tema);
    el.setAttribute('data-padat', p.padat);
    el.setAttribute('data-kontras', p.kontras ? 'tegas' : 'normal');

    /* Sistem operasi yang minta gerak dikurangi selalu dituruti, apa pun
       pilihan di sini. Yang bisa dilakukan pengguna aplikasi hanyalah
       MENAMBAH pembatasan, tidak membatalkannya — setelan itu dipasang
       orang karena gerak membuatnya pusing atau mual. */
    var kurangiGerak = p.gerak === 'kurang' || (mqGerak && mqGerak.matches);
    el.setAttribute('data-gerak', kurangiGerak ? 'kurang' : 'penuh');

    /* Aksen dipasang pada <body>, BUKAN <html>.
       Merek tiap aplikasi didefinisikan lewat body[data-app="mcs"] dan
       kawan-kawan; nilai yang dipasang di <html> akan dibayangi olehnya
       sebelum sempat terpakai, dan pilihan warna staf tidak akan berpengaruh
       sama sekali di MCS maupun aplikasi mitra. */
    var a = aksen(p.aksen);
    var b = document.body;
    if (b) {
      if (a.warna) {
        b.style.setProperty('--brand', a.warna);
        b.style.setProperty('--brand-dark', a.gelap);
        b.style.setProperty('--brand-darker', nyata === 'gelap' ? a.muda : a.tua);
        b.style.setProperty('--brand-light', a.muda);
        b.style.setProperty('--brand-deep', a.tua);
      } else {
        ['--brand', '--brand-dark', '--brand-darker', '--brand-light', '--brand-deep']
          .forEach(function (k) { b.style.removeProperty(k); });
      }
    }

    /* Ukuran teks memakai zoom, bukan font-size: seluruh CSS aplikasi ini
       ditulis dalam piksel, jadi mengubah font-size akar hanya menggeser
       segelintir teks dan meninggalkan sisanya — hasilnya tata letak yang
       timpang, bukan tampilan yang lebih besar. zoom membesarkan semuanya
       secara utuh, termasuk jarak dan ikon. */
    var z = Number(p.teks) || 100;
    if (z === 100) el.style.removeProperty('zoom');
    else el.style.setProperty('zoom', (z / 100).toFixed(2));

    /* Bilah alamat peramban ponsel ikut berwarna — layar yang gelap dengan
       bilah putih menyala di atasnya masih menyilaukan. */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', nyata === 'gelap' ? '#0E141C' : (a.warna || meta.getAttribute('data-asal') || '#14958A'));

    return p;
  }

  /** Simpan sebagian setelan, lalu langsung pasang. */
  function simpan(patch, user) {
    var p = baca();
    Object.keys(patch || {}).forEach(function (k) {
      if (BAWAAN[k] !== undefined) p[k] = patch[k];
    });
    keLokal(p);
    /* Ikut ke preferensi pengguna supaya berpindah bersama akunnya. Dibungkus
       karena BIZ belum tentu sudah dimuat saat layar masuk. */
    try {
      if (user && window.BIZ && BIZ.simpanPreferensi) BIZ.simpanPreferensi(user.id, { tampilan: p });
    } catch (e) {}
    terapkan(p);
    return p;
  }

  /**
   * Dipanggil setelah seseorang masuk: preferensi miliknya menang atas
   * setelan perangkat, lalu disalin ke perangkat supaya layar masuk
   * berikutnya sudah benar sebelum ada yang menekan apa pun.
   */
  function pakaiUser(user) {
    if (!user) return terapkan();
    var pref = null;
    try { pref = window.BIZ && BIZ.preferensi ? BIZ.preferensi(user).tampilan : null; } catch (e) {}
    if (!pref) {
      /* Pengguna baru: setelan perangkat yang berlaku, sekalian dicatat
         sebagai miliknya supaya ikut ke perangkat lain. */
      var p = baca();
      try {
        if (window.BIZ && BIZ.simpanPreferensi) BIZ.simpanPreferensi(user.id, { tampilan: p });
      } catch (e) {}
      return terapkan(p);
    }
    var gabung = {};
    Object.keys(BAWAAN).forEach(function (k) {
      gabung[k] = pref[k] !== undefined ? pref[k] : BAWAAN[k];
    });
    keLokal(gabung);
    return terapkan(gabung);
  }

  /* Sistem berganti tema di tengah jalan (senja otomatis di macOS/Windows).
     Hanya berpengaruh bagi yang memilih "ikut sistem". */
  function pantauSistem() {
    function ubah() { if (baca().tema === 'sistem') terapkan(); }
    if (mqGelap && mqGelap.addEventListener) mqGelap.addEventListener('change', ubah);
    else if (mqGelap && mqGelap.addListener) mqGelap.addListener(ubah);
    if (mqGerak && mqGerak.addEventListener) mqGerak.addEventListener('change', function () { terapkan(); });
  }

  /* Dipasang SEKARANG, bukan menunggu APP.init(). Lihat catatan di kepala.
     Berkas ini dimuat di dalam <head>, jadi <body> belum ada — tema, kepadatan
     dan gerak sudah menempel di <html> pada panggilan pertama, sedangkan aksen
     yang butuh <body> menyusul begitu badannya terurai. Urutan ini disengaja:
     yang menyilaukan adalah latar putih, dan itu sudah tertangani di panggilan
     pertama. */
  terapkan();
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', function () { terapkan(); });
  }
  pantauSistem();

  return {
    AKSEN: AKSEN, BAWAAN: BAWAAN, aksen: aksen,
    baca: baca, simpan: simpan, terapkan: terapkan,
    pakaiUser: pakaiUser, temaNyata: temaNyata
  };
})();
