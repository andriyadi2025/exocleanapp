/* ==========================================================================
   exo-brand.js — tampilan merek EXOCLEAN App yang diatur dari backend
   --------------------------------------------------------------------------
   Modul "Appearance" di konsol admin (exo-admin.html) menerbitkan logo,
   warna aksen, nama aplikasi, dan running text. Aplikasi pelanggan/mitra
   (exo.html) membacanya SAAT DIMUAT dan memasangnya ke variabel CSS — tanpa
   rilis app-store, persis janji rancangannya ("assets are fetched at
   runtime").

   Penyimpanannya localStorage pada asal yang sama. Di produksi ini adalah
   satu endpoint JSON kecil yang di-cache; bentuk datanya sudah dibuat siap
   dipindahkan: satu objek datar, tanpa rujukan ke tabel lain.

   Dimuat oleh exo.html DAN exo-admin.html. Tidak bergantung pada apa pun.
   ========================================================================== */
var EXO_BRAND = (function () {
  'use strict';

  var KUNCI = 'exoclean_brand';

  /* Tangga nada per warna aksen yang boleh dipilih. Diambil apa adanya dari
     rancangan (RAMP di "EXOCLEAN App.dc.html"). Warna di luar daftar ini
     ditolak: kontras terhadap latar aplikasi belum diperiksa untuknya. */
  var RAMP = {
    '#109080': ['#e5f4f1','#c7eae4','#9edcd2','#54bdb0','#109080','#0d8072','#0b6b60','#08544b','#063c36'],
    '#70d0c0': ['#edf9f7','#d9f2ee','#b9e8e0','#a3e4d8','#70d0c0','#4bb8a7','#26786c','#1a564d','#123f38'],
    '#c67139': ['#f8e9dd','#f0d2ba','#e3b48e','#d6935f','#c67139','#b26232','#94512a','#733f21','#522d17'],
    '#2f6fd0': ['#e4edfb','#c5daf6','#9cbfef','#679ce6','#2f6fd0','#2a63ba','#22529b','#1a3f78','#122c54'],
    '#7a8a5e': ['#eef1e8','#dbe1cd','#c1cbab','#a2b083','#7a8a5e','#6d7c54','#5b6746','#475237','#333b28']
  };

  var BAWAAN = {
    accent:      '#109080',
    markSrc:     'assets/exoclean-mark.png',
    wordSrc:     'assets/exoclean-wordmark.png',
    appName:     'EXOCLEAN',
    tickerOn:    true,
    tickerBadge: 'Promo',
    tickerText:  'CLEAN25 — Rp25.000 off your first three bookings  ·  Saturday morning slots 15% off with SABTUPAGI  ·  Slot-locked guarantee: we move your booking, you get Rp100.000',
    tickerSpeed: 22,
    published:   'Last published 26 Aug 2026, 09:12 by andriyadi@exoclean.id',
    audit: [
      { what:'Wordmark replaced · andriyadi@', when:'26 Aug' },
      { what:'Brand colour → #109080 · andriyadi@', when:'26 Aug' },
      { what:'App mark replaced · andriyadi@', when:'24 Aug' }
    ]
  };

  function baca() {
    try {
      var s = localStorage.getItem(KUNCI);
      return s ? Object.assign({}, BAWAAN, JSON.parse(s)) : Object.assign({}, BAWAAN);
    } catch (e) { return Object.assign({}, BAWAAN); }
  }

  function simpan(b) {
    try { localStorage.setItem(KUNCI, JSON.stringify(b)); return true; }
    catch (e) { return false; }   /* logo data-URL terlalu besar, atau storage diblokir */
  }

  function hapus() { try { localStorage.removeItem(KUNCI); } catch (e) { /* abaikan */ } }

  /**
   * Pasang merek ke dokumen: tangga aksen ke :root, logo ke setiap
   * <img data-brand>, nama ke <title> dan meta theme-color.
   */
  function terapkan(b) {
    b = b || baca();
    var ramp = RAMP[b.accent] || RAMP['#109080'];
    var r = document.documentElement.style;
    r.setProperty('--color-accent', ramp[4]);
    for (var i = 0; i < ramp.length; i++) r.setProperty('--color-accent-' + ((i + 1) * 100), ramp[i]);
    r.setProperty('--ticker-speed', (b.tickerSpeed || 22) + 's');

    var marks = document.querySelectorAll('img[data-brand="mark"]');
    for (var m = 0; m < marks.length; m++) if (marks[m].getAttribute('src') !== b.markSrc) marks[m].src = b.markSrc;
    var words = document.querySelectorAll('img[data-brand="word"]');
    for (var w = 0; w < words.length; w++) if (words[w].getAttribute('src') !== b.wordSrc) words[w].src = b.wordSrc;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', ramp[4]);
    return b;
  }

  return { KUNCI: KUNCI, RAMP: RAMP, BAWAAN: BAWAAN, baca: baca, simpan: simpan, hapus: hapus, terapkan: terapkan };
})();
