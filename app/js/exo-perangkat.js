/* ==========================================================================
   exo-perangkat.js — identitas perangkat & bukti kepemilikan kunci (device
   binding) untuk pelanggan, mitra cleaning, mitra toko
   --------------------------------------------------------------------------
   · Sekali per peramban/perangkat: id acak 24 byte + pasangan kunci ECDSA
     P-256 (privat TIDAK bisa diekspor) disimpan di IndexedDB `exoclean_perangkat`.
   · Saat OTP/login sosial, id + kunci publik (JWK) + nama perangkat dikirim;
     auth-server menandai perangkat baru dan mengikat sesi (klaim dev/dkt).
   · Setiap permintaan ke server pendamping membawa header X-Exo-Perangkat =
     base64url(JSON{ id, jwk, ts, sig }) dengan sig = ECDSA-SHA256(`id|ts|sub`)
     — sesi yang dicuri tidak berguna di perangkat lain (pola DPoP).
   · Tanpa IndexedDB/WebCrypto (peramban lama) modul ini memakai kunci di
     memori sesi saja; server memperlakukannya sebagai perangkat baru tiap kali.
   ========================================================================== */
var EXO_PERANGKAT = (function () {
  'use strict';
  var NAMA_DB = 'exoclean_perangkat', STORE = 'kunci', subtle = (window.crypto && window.crypto.subtle) || null;
  var siapJanji = null, rekam = null;   /* { id, kunci:CryptoKeyPair, jwk } */
  function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function acakId() { var a = new Uint8Array(24); window.crypto.getRandomValues(a); return b64u(a); }
  function bukaDb() { return new Promise(function (res, rej) { if (!window.indexedDB) return rej(new Error('tanpa IndexedDB')); var r = indexedDB.open(NAMA_DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(STORE); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function baca(db) { return new Promise(function (res, rej) { var t = db.transaction(STORE, 'readonly').objectStore(STORE).get('utama'); t.onsuccess = function () { res(t.result || null); }; t.onerror = function () { rej(t.error); }; }); }
  function tulis(db, v) { return new Promise(function (res, rej) { var t = db.transaction(STORE, 'readwrite').objectStore(STORE).put(v, 'utama'); t.onsuccess = function () { res(true); }; t.onerror = function () { rej(t.error); }; }); }
  function buatKunci() { return subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, false, ['sign', 'verify']).then(function (kp) { return subtle.exportKey('jwk', kp.publicKey).then(function (jwk) { return { id:acakId(), kunci:kp, jwk:{ kty:'EC', crv:'P-256', x:jwk.x, y:jwk.y }, dibuatAt:new Date().toISOString() }; }); }); }
  function siap() {
    if (siapJanji) return siapJanji;
    siapJanji = (function () {
      if (!subtle) return Promise.resolve(null);
      return bukaDb().then(function (db) { return baca(db).then(function (r) { if (r && r.kunci && r.jwk && r.id) { rekam = r; return r; } return buatKunci().then(function (baru) { return tulis(db, baru).then(function () { rekam = baru; return baru; }); }); }); })
        .catch(function () { return buatKunci().then(function (baru) { rekam = baru; return baru; }).catch(function () { return null; }); });
    })();
    return siapJanji;
  }
  function platform() { var ua = navigator.userAgent || ''; return /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Web'; }
  function namaPeramban() { var ua = navigator.userAgent || ''; return /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Peramban'; }
  /** Info untuk dikirim saat login: { id, kunciPublik, nama, platform }. */
  function info() { return siap().then(function (r) { if (!r) return null; var nama = platform() + ' · ' + namaPeramban(); try { var kustom = localStorage.getItem('exoclean_perangkat_nama'); if (kustom) nama = kustom; } catch (e) { /* abaikan */ } return { id:r.id, kunciPublik:r.jwk, nama:nama.slice(0, 40), platform:platform() }; }); }
  function id() { return rekam ? rekam.id : null; }
  /** Bukti kepemilikan kunci untuk header X-Exo-Perangkat (memakai sub dari sesi). */
  function bukti(sub) { return siap().then(function (r) { if (!r || !sub) return null; var ts = Math.floor(Date.now() / 1000), pesan = new TextEncoder().encode(r.id + '|' + ts + '|' + sub); return subtle.sign({ name:'ECDSA', hash:'SHA-256' }, r.kunci.privateKey, pesan).then(function (sig) { return b64u(new TextEncoder().encode(JSON.stringify({ id:r.id, jwk:r.jwk, ts:ts, sig:b64u(sig) }))); }).catch(function () { return null; }); }); }
  function namai(nama) { try { localStorage.setItem('exoclean_perangkat_nama', String(nama || '').slice(0, 40)); } catch (e) { /* abaikan */ } }
  siap();
  return { siap:siap, info:info, id:id, bukti:bukti, namai:namai, platform:platform };
})();
