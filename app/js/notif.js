/* ==========================================================================
   notif.js — pemasangan aplikasi dan notifikasi perangkat
   --------------------------------------------------------------------------
   MASALAH YANG DIPECAHKAN

   Permintaan jasa keahlian gugur dalam 60 detik. Mitra yang sedang di jalan
   dengan layar mati tidak akan pernah melihatnya — dan permintaan yang tidak
   pernah terlihat sama saja dengan mitra yang menolak diam-diam. Klien
   menunggu satu menit untuk jawaban yang memang tidak mungkin datang.

   SAMPAI DI MANA INI MENOLONG, DAN DI MANA TIDAK

   Yang BISA dilakukan tanpa server push:
     • aplikasi dipasang ke layar utama, punya ikon dan nama sendiri
     • notifikasi sistem lengkap dengan getar dan suara, SELAMA aplikasinya
       masih hidup — termasuk saat tabnya di latar belakang
     • aplikasi tetap terbuka tanpa sinyal

   Yang TIDAK bisa, dan tidak boleh dijanjikan:
     • notifikasi saat aplikasinya benar-benar tertutup. Itu menuntut server
       push beserta kunci VAPID. Penanganannya sudah disiapkan di sw.js, tetapi
       servernya belum ada.

   Karena itu layar mitra menyebutkan keadaannya apa adanya. Mitra yang
   mengira dirinya akan dibangunkan padahal tidak, akan kehilangan pekerjaan
   dan menyalahkan aplikasinya — dengan alasan yang benar.
   ========================================================================== */
var NOTIF = (function () {
  'use strict';

  var reg = null;              /* pendaftaran service worker */
  var pasangEvent = null;      /* beforeinstallprompt yang ditahan */
  var pantauTimer = null;
  var sudah = {};              /* orderId yang sudah pernah diberitahukan */

  function didukung() {
    return typeof navigator !== 'undefined' &&
           'serviceWorker' in navigator && typeof Notification !== 'undefined';
  }

  function bisaPasang() { return !!pasangEvent; }

  /** Sudah berjalan sebagai aplikasi terpasang, bukan di dalam tab peramban. */
  function terpasang() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }

  function izin() {
    if (typeof Notification === 'undefined') return 'tidak-didukung';
    return Notification.permission;   /* granted | denied | default */
  }

  /* ================================================================ SIAP */

  /**
   * Daftarkan service worker.
   *
   * Dipanggil sekali saat aplikasi dibuka. Gagal mendaftar TIDAK boleh
   * menghentikan apa pun — di http:// non-localhost service worker memang
   * dilarang, dan aplikasinya harus tetap jalan seperti biasa.
   */
  function siap() {
    if (!didukung()) return Promise.resolve(null);
    return navigator.serviceWorker.register('sw.js').then(function (r) {
      reg = r;
      navigator.serviceWorker.addEventListener('message', function (e) {
        var d = e.data || {};
        if (d.tipe === 'buka' && window.APP) APP.go('permintaan');
      });
      return r;
    }).catch(function () { return null; });
  }

  /* Tombol "Pasang aplikasi" hanya masuk akal bila perambannya menawarkan. */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    pasangEvent = e;
    if (window.APP && APP.user) APP.refresh();
  });
  window.addEventListener('appinstalled', function () {
    pasangEvent = null;
    if (window.UI) UI.toast(I18N.t('Aplikasi terpasang di layar utama'), 'ok');
  });

  function pasang() {
    if (!pasangEvent) return Promise.resolve('tidak-tersedia');
    var e = pasangEvent;
    pasangEvent = null;
    e.prompt();
    return e.userChoice.then(function (h) { return h.outcome; });
  }

  /* ============================================================ IZIN */

  function mintaIzin() {
    if (typeof Notification === 'undefined') return Promise.resolve('tidak-didukung');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    return Notification.requestPermission();
  }

  /* ======================================================== KIRIM NOTIF */

  /**
   * Tampilkan notifikasi sistem.
   *
   * Lewat service worker bila ada — hanya jalur itu yang mendukung getar dan
   * notifikasi yang bertahan setelah tabnya ditutup. Notification biasa
   * dipakai sebagai cadangan.
   */
  function kirim(o) {
    if (izin() !== 'granted') return false;
    var isi = {
      tipe: 'notif',
      judul: o.judul || 'EXOCLEAN',
      isi: o.isi || '',
      tag: o.tag || 'exo',
      url: o.url || location.pathname,
      penting: !!o.penting,
      getar: o.getar || [200, 100, 200]
    };
    if (reg && reg.active) { reg.active.postMessage(isi); return true; }
    try {
      new Notification(isi.judul, { body: isi.isi, tag: isi.tag,
        icon: 'assets/icon-mitra-192.png' });
      return true;
    } catch (e) { return false; }
  }

  /**
   * Bunyi pendek untuk permintaan bertenggat.
   *
   * Dibangkitkan dengan WebAudio, bukan berkas suara: satu nada sinus tidak
   * perlu diunduh, tidak bisa gagal dimuat, dan tidak menambah berat aplikasi
   * yang dipakai di jaringan seluler.
   */
  function bunyi() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ac = new AC();
      [0, 0.18].forEach(function (jeda) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ac.currentTime + jeda);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + jeda + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + jeda + 0.14);
        o.connect(g); g.connect(ac.destination);
        o.start(ac.currentTime + jeda); o.stop(ac.currentTime + jeda + 0.15);
      });
      setTimeout(function () { try { ac.close(); } catch (e) {} }, 800);
    } catch (e) {}
  }

  function getar(pola) {
    try { if (navigator.vibrate) navigator.vibrate(pola || [200, 100, 200]); } catch (e) {}
  }

  /* ====================================================== PANTAU PERMINTAAN */

  /**
   * Awasi permintaan baru untuk mitra yang sedang masuk.
   *
   * Diperiksa tiap 5 detik. Bukan tiap detik: tenggatnya 60 detik, jadi
   * keterlambatan 5 detik masih menyisakan waktu menjawab yang layak,
   * sementara memeriksa tiap detik membangunkan perangkat 60 kali per menit
   * hanya untuk membaca localStorage.
   */
  /**
   * Pantau aduan penghuni yang jatuh di wilayah kerja seorang petugas.
   *
   * Terpisah dari pantau() milik mitra keahlian karena keduanya berbeda
   * sifatnya: permintaan keahlian gugur dalam hitungan detik dan menuntut
   * jawaban; aduan tidak gugur, tetapi punya batas waktu penanganan. Yang
   * pertama membangunkan, yang kedua memberi tahu.
   */
  var aduanTimer = null, aduanSudah = {};

  function pantauAduan(user) {
    berhentiAduan();
    if (!window.MCS || !user || user.role !== 'petugas') return;
    var me = MCS.pekerjaDariUser(user);
    if (!me) return;

    /* Yang SUDAH ada saat pantauan dimulai tidak diberitahukan — petugas
       baru saja membuka aplikasinya dan melihatnya sendiri di layar. */
    aduanSaya(me).forEach(function (x) { aduanSudah[x.id] = 1; });

    aduanTimer = setInterval(function () {
      if (!window.APP || !APP.user || APP.user.id !== user.id) { berhentiAduan(); return; }
      var segar = MCS.pekerjaDariUser(APP.user);
      if (!segar) return;
      var baru = aduanSaya(segar).filter(function (x) { return !aduanSudah[x.id]; });
      if (!baru.length) return;

      baru.forEach(function (x) {
        aduanSudah[x.id] = 1;
        var a = MCS.areaSatu(x.areaId);
        var g = MCS.genting(x.genting);
        var sisa = MCS.sisaSLA(x);
        kirim({
          judul: g.ikon + ' ' + I18N.t('Aduan di area Anda'),
          isi: (a ? a.nama : '') + ' — ' + (x.teks || I18N.t('tanpa keterangan')) +
               (sisa != null ? ' · ' + I18N.t('sisa') + ' ' + sisa + ' ' + I18N.t('menit') : ''),
          tag: 'aduan-' + x.id,
          url: 'mcs.html',
          penting: x.genting === 'mendesak'
        });
      });
      /* Hanya yang mendesak yang berbunyi. Bunyi untuk setiap keluhan ringan
         akan membuat orang mematikan suaranya, dan yang mendesak ikut diam. */
      if (baru.some(function (x) { return x.genting === 'mendesak'; })) {
        bunyi(); getar([250, 100, 250]);
      }
      if (window.APP && APP.refresh) APP.refresh();
    }, 15000);
  }

  /** Aduan terbuka yang jatuh di wilayah kerja petugas ini. */
  function aduanSaya(me) {
    var wilayah = {};
    (me.areaIds || []).forEach(function (id) { wilayah[id] = 1; });
    return MCS.aduan(me.korporatId).filter(function (x) {
      return wilayah[x.areaId] || x.pekerjaId === me.id;
    });
  }

  function berhentiAduan() {
    if (aduanTimer) { clearInterval(aduanTimer); aduanTimer = null; }
  }

  function pantau(userId) {
    berhenti();
    if (!window.KEAHLIAN || !userId) return;

    /* Permintaan yang SUDAH ada saat pantauan dimulai tidak diberitahukan —
       mitra baru saja membuka aplikasinya dan melihatnya sendiri di layar. */
    KEAHLIAN.permintaanMitra(userId).forEach(function (o) { sudah[o.id] = 1; });

    pantauTimer = setInterval(function () {
      if (!window.APP || !APP.user || APP.user.id !== userId) { berhenti(); return; }
      var baru = KEAHLIAN.permintaanMitra(userId).filter(function (o) { return !sudah[o.id]; });
      if (!baru.length) return;

      baru.forEach(function (o) {
        sudah[o.id] = 1;
        var svc = BIZ.svc((o.keahlian && o.keahlian.serviceId) || (o.serviceIds || [])[0]);
        var detik = KEAHLIAN.sisaDetik(o);
        kirim({
          judul: I18N.t('Permintaan baru — jawab sekarang'),
          isi: (svc ? svc.nama : o.judul) + ' · ' + U.tglPanjang(o.tgl) + ' ' + o.mulai +
               ' · ' + I18N.t('sisa') + ' ' + detik + ' ' + I18N.t('detik'),
          tag: 'permintaan-' + o.id,
          url: 'mitra.html',
          penting: true
        });
      });
      bunyi(); getar([300, 120, 300]);

      /* Halaman ikut digambar ulang supaya kartunya muncul tanpa perlu
         menunggu mitra berpindah halaman. */
      if (APP.page === 'permintaan' || APP.page === 'tugas') APP.refresh();
    }, 5000);
  }

  function berhenti() {
    berhentiAduan();
    if (pantauTimer) { clearInterval(pantauTimer); pantauTimer = null; }
  }

  /** Untuk layar pengaturan: apa yang benar-benar bisa dan tidak bisa. */
  function keadaan() {
    return {
      didukung: didukung(),
      terpasang: terpasang(),
      bisaPasang: bisaPasang(),
      izin: izin(),
      serviceWorker: !!reg,
      /* Sengaja dinyatakan: notifikasi saat aplikasi tertutup BELUM ada. */
      pushLatar: false
    };
  }

  return {
    siap: siap, didukung: didukung, terpasang: terpasang, bisaPasang: bisaPasang,
    pasang: pasang, izin: izin, mintaIzin: mintaIzin,
    kirim: kirim, bunyi: bunyi, getar: getar,
    pantau: pantau, pantauAduan: pantauAduan, berhentiAduan: berhentiAduan,
    berhenti: berhenti, keadaan: keadaan
  };
})();
