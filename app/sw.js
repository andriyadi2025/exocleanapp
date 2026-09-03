/* ==========================================================================
   sw.js — service worker untuk EXOCLEAN dan EXOCLEAN Mitra
   --------------------------------------------------------------------------
   Satu berkas untuk dua aplikasi. Cakupannya sama (folder app/), yang berbeda
   hanya pintu masuknya — jadi memisahkan service worker berarti dua salinan
   aturan singgahan yang akan menyimpang diam-diam.

   KENAPA JARINGAN DULU, BUKAN SINGGAHAN DULU

   Aplikasi ini masih berubah setiap hari. Singgahan-dulu membuat mitra
   membuka versi lama tanpa tahu, dan yang dilaporkannya nanti adalah bug yang
   sudah diperbaiki minggu lalu. Jaringan dulu: kalau ada sinyal, yang dipakai
   selalu yang terbaru; kalau tidak ada, barulah singgahan menyelamatkan.

   Untuk mitra lapangan yang bekerja di basement gedung atau rumah dengan
   sinyal buruk, "barulah singgahan menyelamatkan" itu bukan hiasan — itu
   satu-satunya cara aplikasinya tetap terbuka saat ia sudah sampai di lokasi.

   TENGGAT 60 DETIK DAN NOTIFIKASI

   Permintaan jasa keahlian gugur dalam hitungan detik. Notifikasi yang hanya
   muncul saat aplikasi terbuka tidak cukup — mitra sedang di jalan, layarnya
   mati. Penanganan `push` di bawah sudah siap menerima kiriman dari server
   push; yang belum ada adalah SERVER-nya beserta kunci VAPID. Sampai itu
   tersedia, notifikasi hanya muncul selama aplikasinya masih hidup di latar.
   Itu keterbatasan nyata, bukan sesuatu yang bisa ditutup dari sisi peramban.
   ========================================================================== */

/* Dinaikkan tiap kali KERANGKA berubah. Tanpa itu, pemasangan lama tetap
   memakai singgahan lamanya dan exo.html tidak pernah ikut tersimpan. */
var VERSI = 'exoclean-v5';

/* Kerangka yang membuat aplikasi tetap bisa dibuka tanpa sinyal. Sengaja
   pendek: berkas lain ikut tersinggah sendiri saat pertama diminta.

   EXOCLEAN App (exo.html) ikut di sini, bukan di service worker sendiri.
   Cakupannya sama — folder app/ — dan alasan di kepala berkas ini berlaku
   utuh: dua service worker untuk satu cakupan berarti dua salinan aturan
   singgahan yang akan menyimpang diam-diam. Yang berbeda hanya daftarnya;
   HURUFNYA ikut disinggah karena aplikasi itu memakai huruf tuan rumah
   sendiri, dan judul yang jatuh ke serif sistem membuat mereknya hilang
   justru pada saat luring. */
var KERANGKA = [
  './',
  './index.html',
  './mitra.html',
  './mcs.html',
  './exo.html',
  './css/style.css',
  './css/exo.css',
  './js/exo-brand.js',
  './js/exo-i18n.js',
  './js/exo-data.js',
  './js/exo-core.js',
  './js/exo-screens-customer.js',
  './js/exo-screens-customer2.js',
  './js/exo-screens-partner.js',
  './js/exo-sheets.js',
  './js/exo-server.js',
  './js/exo-config.js',
  './js/wilayah.js',
  './exo-analisa.html',
  './assets/foto/kadek-after.jpg',
  './exo-admin.html',
  './css/exo-admin.css',
  './js/exo-admin.js',
  './js/exo-admin-views.js',
  './assets/exoclean-mark.png',
  './assets/exoclean-wordmark.png',
  './js/utils.js',
  './js/ruang.js',
  './js/foto.js',
  './js/db.js',
  './js/pasar.js',
  './assets/fonts/caprasimo-latin.woff2',
  './assets/fonts/figtree-latin.woff2',
  './manifest.json',
  './manifest-mitra.json',
  './manifest-mcs.json',
  './manifest-exo.json',
  './assets/icon-192.png',
  './assets/icon-mitra-192.png',
  './assets/icon-mcs-192.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSI).then(function (c) {
      /* addAll gagal seluruhnya bila SATU berkas gagal. Ditambahkan satu per
         satu supaya satu berkas yang hilang tidak membatalkan pemasangan. */
      return Promise.all(KERANGKA.map(function (u) {
        return c.add(u).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nama) {
      return Promise.all(nama.map(function (n) {
        return n === VERSI ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  /* Hanya asal sendiri. Server pembayaran, peta, dan penerima berkas
     tidak boleh ikut disinggah — jawabannya bergantung waktu. */
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var salinan = res.clone();
        caches.open(VERSI).then(function (c) { c.put(req, salinan); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (c) {
        if (c) return c;
        /* Navigasi yang gagal tanpa singgahan tetap harus menghasilkan
           sesuatu — halaman kosong lebih buruk daripada kerangka lama. */
        if (req.mode === 'navigate') {
          /* Pulangkan pintu masuk YANG DIMINTA bila ada di singgahan.
             Memulangkan mitra.html kepada staf korporat yang sedang tanpa
             sinyal membuatnya melihat aplikasi yang salah dan mengira
             datanya hilang. */
          var berkas = url.pathname.split('/').pop();
          var minta = './' + (berkas || 'index.html');
          return caches.match(minta).then(function (m) {
            return m || caches.match('./index.html');
          });
        }
        return new Response('', { status: 504, statusText: 'Tidak ada sinyal' });
      });
    })
  );
});

/* ============================================================ NOTIFIKASI */

/**
 * Kiriman dari server push.
 *
 * Muatannya diharapkan JSON: { judul, isi, tag, url, getar }. Bila bukan JSON —
 * server lama, atau kiriman uji — teksnya dipakai apa adanya daripada gagal
 * diam-diam tanpa notifikasi apa pun.
 */
self.addEventListener('push', function (e) {
  var d = { judul: 'EXOCLEAN Mitra', isi: '', tag: 'exo', url: './mitra.html' };
  if (e.data) {
    try { d = Object.assign(d, e.data.json()); }
    catch (x) { d.isi = e.data.text(); }
  }
  e.waitUntil(self.registration.showNotification(d.judul, {
    body: d.isi,
    icon: './assets/icon-mitra-192.png',
    badge: './assets/icon-mitra-192.png',
    tag: d.tag,
    renotify: true,
    /* Permintaan bertenggat tidak boleh hilang sendiri dari bilah notifikasi
       sebelum dijawab. */
    requireInteraction: !!d.penting,
    vibrate: d.getar || [200, 100, 200],
    data: { url: d.url }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var tujuan = (e.notification.data && e.notification.data.url) || './mitra.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (daftar) {
      /* Jendela yang sudah terbuka difokuskan, bukan dibuka lagi — mitra yang
         menekan notifikasi tiga kali tidak seharusnya punya tiga tab. */
      for (var i = 0; i < daftar.length; i++) {
        if (daftar[i].url.indexOf(self.location.origin) === 0 && 'focus' in daftar[i]) {
          daftar[i].postMessage({ tipe: 'buka', url: tujuan });
          return daftar[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(tujuan);
    })
  );
});

/* Halaman bisa meminta service worker menampilkan notifikasi selagi aplikasi
   masih hidup. Ini jembatan sampai server push tersedia. */
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.tipe !== 'notif') return;
  self.registration.showNotification(d.judul || 'EXOCLEAN', {
    body: d.isi || '',
    icon: './assets/icon-mitra-192.png',
    badge: './assets/icon-mitra-192.png',
    tag: d.tag || 'exo',
    renotify: true,
    requireInteraction: !!d.penting,
    vibrate: d.getar || [200, 100, 200],
    data: { url: d.url || './mitra.html' }
  });
});
