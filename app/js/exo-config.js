/* ==========================================================================
   exo-config.js — kunci PUBLIK integrasi pihak ketiga untuk EXOCLEAN App
   --------------------------------------------------------------------------
   Semua nilai di sini memang ditujukan untuk browser (client id, site key)
   — bukan rahasia. Rahasianya (client secret, secret key) tinggal di
   app/server/.env dan tidak pernah sampai ke sini.

   Kosong = fitur berjalan dalam SIMULASI dan layar mengatakannya. Isi lalu
   muat ulang; tidak perlu build.

     googleClientId   — Google Cloud Console → OAuth client (Web). Harus sama
                        dengan GOOGLE_CLIENT_ID di server/.env.
     facebookAppId    — Meta for Developers → App ID. Pasangannya
                        FACEBOOK_APP_ID dan rahasia aplikasi Facebook di server/.env.
     turnstileSiteKey — Cloudflare Turnstile site key (captcha tanpa teka-teki).
                        Secret key-nya diverifikasi server; belum ada endpoint
                        untuk itu, jadi token hanya dicek ADA-nya di klien.

   Boleh ditimpa per perangkat lewat localStorage 'exoclean_config' (JSON
   dengan kunci yang sama) — berguna untuk staging.
   ========================================================================== */
var EXO_CONFIG = (function () {
  'use strict';
  var BAWAAN = {
    googleClientId: '',
    facebookAppId: '',
    turnstileSiteKey: ''
  };
  var timpa = {};
  try { timpa = JSON.parse(localStorage.getItem('exoclean_config') || '{}') || {}; } catch (e) { /* abaikan */ }
  return Object.assign({}, BAWAAN, timpa);
})();
