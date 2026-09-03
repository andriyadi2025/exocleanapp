/* ==========================================================================
   exo-util.js — pembantu kecil milik EXOCLEAN App
   --------------------------------------------------------------------------
   Sejak 3 Sep 2026 EXOCLEAN App tidak lagi memakai satu pun modul aplikasi
   manajemen (MCS). Yang dulu diambil dari utils.js/ruang.js ditulis di sini:
   hanya fungsi yang benar-benar dipakai aplikasi ini.
   ========================================================================== */
var EXO_UTIL = (function () {
  'use strict';
  var seq = 0;
  /* Semua kunci localStorage aplikasi ini berawalan sama, terpisah dari
     aplikasi lain yang mungkin dilayani dari asal (origin) yang sama. */
  var AWALAN = 'exoclean_app_';
  function kunci(nama) { return AWALAN + nama; }
  function uid(prefix) { seq++; return (prefix || 'id') + '_' + Date.now().toString(36) + seq.toString(36); }
  function nowISO() { return new Date().toISOString(); }
  function docNo(kind, n, date) {
    var d = date ? new Date(date) : new Date();
    return 'EXO/' + kind + '/' + d.getFullYear() + '/' + String(n).padStart(4, '0');
  }
  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sortBy(arr, fn, desc) {
    return (arr || []).slice().sort(function (a, b) { var x = fn(a), y = fn(b); if (x === y) return 0; return (x > y ? 1 : -1) * (desc ? -1 : 1); });
  }
  /* Jarak garis lurus dua titik {lat,lng} dalam meter (haversine). */
  function jarakMeter(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    var R = 6371000, toRad = function (x) { return x * Math.PI / 180; };
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
  }
  function getGPS(timeout) {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) return resolve({ ok: false, alasan: 'Perangkat tidak mendukung GPS' });
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ ok: true, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), akurasi: Math.round(p.coords.accuracy) }); },
        function (e) { resolve({ ok: false, alasan: e.code === 1 ? 'Izin lokasi ditolak' : e.code === 2 ? 'Lokasi tidak terdeteksi' : 'Waktu tunggu GPS habis' }); },
        { enableHighAccuracy: true, timeout: timeout || 8000, maximumAge: 30000 });
    });
  }
  function compressImage(file, maxSide, quality) {
    maxSide = maxSide || 720; quality = quality || 0.55;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Gagal membaca file')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('File bukan gambar yang valid')); };
        img.onload = function () {
          var w = img.width, h = img.height, s = Math.min(1, maxSide / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  return { kunci: kunci, uid: uid, nowISO: nowISO, docNo: docNo, initials: initials, esc: esc, sortBy: sortBy, jarakMeter: jarakMeter, getGPS: getGPS, compressImage: compressImage };
})();
