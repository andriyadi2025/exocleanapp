/* ==========================================================================
   exo-pin.js — PIN transaksi 6 digit, terpisah dari sandi/OTP, untuk semua
   pengguna (pelanggan, mitra cleaning, mitra toko)
   --------------------------------------------------------------------------
   Pola Tokopedia/GoPay: login pakai OTP, tetapi setiap aksi uang (bayar,
   tahan dana, isi saldo, tarik saldo, pencairan toko, isi saldo iklan,
   hapus akun) meminta PIN.
   · Mode server (disarankan): PIN disimpan sebagai hash PBKDF2 di auth-server
     terikat `sub` sesi; verifikasi berhasil menerbitkan PIN-token 5 menit
     (HS256, klaim pin:true) yang WAJIB dibawa ke payment/dwi (X-Exo-Pin).
     Salah 5 kali → terkunci 30 menit di server.
   · Mode lokal (tanpa server/sesi): hash PBKDF2-SHA256 150.000 iterasi di
     tabel `pinTransaksi` perangkat ini, kunci 30 menit setelah 5 gagal.
   · PIN lemah ditolak (berurutan, berulang, pola tanggal umum). Reset PIN
     hanya setelah OTP baru (sesi segar < 10 menit).
   ========================================================================== */
var EXO_PIN = (function () {
  'use strict';
  var ITERASI = 150000, MAKS_GAGAL = 5, KUNCI_MENIT = 30;
  var subtle = (window.crypto && window.crypto.subtle) || null;
  var tokenServer = null;   /* { token, sampai } — memori saja */
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function server() { return window.EXO_SERVER || null; }
  function sesi() { try { return window.EXO_BRANKAS && EXO_BRANKAS.sesi(); } catch (e) { return null; } }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function dariHex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function turunkan(pin, garamHex) { return subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']).then(function (k) { return subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:dariHex(garamHex), iterations:ITERASI }, k, 256); }).then(hex); }
  function samaAman(a, b) { if (!a || !b || a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
  function lemah(pin) {
    pin = String(pin || '');
    if (!/^\d{6}$/.test(pin)) return 'PIN harus 6 angka.';
    if (/^(\d)\1{5}$/.test(pin)) return 'Jangan pakai angka yang sama semua.';
    var naik = '01234567890', turun = '09876543210';
    if (naik.indexOf(pin) >= 0 || turun.indexOf(pin) >= 0) return 'Jangan pakai angka berurutan.';
    if (/^(\d\d)\1\1$/.test(pin) || /^(\d\d\d)\1$/.test(pin)) return 'Pola berulang terlalu mudah ditebak.';
    if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d\d$/.test(pin) || /^(19|20)\d\d(0[1-9]|1[0-2])$/.test(pin)) return 'Hindari pola tanggal lahir.';
    return null;
  }
  function subjek(sisi) { return String(sisi || 'customer'); }
  function baris(sisi) { var d = db(); return d ? d.first('pinTransaksi', { subjek:subjek(sisi) }) : null; }
  function terkunciSampai(sisi) { var b = baris(sisi); return b && b.gagal >= MAKS_GAGAL && b.kunciSampai > Date.now() ? b.kunciSampai : 0; }
  function ada(sisi) { return !!baris(sisi); }
  function pakaiServer() { var s = server(); return !!(s && s.pinAtur && sesi()); }
  /* Panggil server hanya bila auth-server terjangkau (cek kesehatan 2,5 dtk, cache 30 dtk); kalau tidak, jatuh ke mode lokal tanpa menunggu lama. */
  function viaServer(fn, lokal) { if (!pakaiServer()) return lokal(); return server().cekSehat('auth', '/api/auth/health').then(function (ok) { if (!ok) return lokal(); return fn().then(function (r) { return r && r.offline ? lokal() : r; }); }); }

  /* ---------- lokal ---------- */
  function aturLokal(sisi, pin) { var d = db(); if (!d || !subtle) return Promise.reject(new Error('WebCrypto tidak tersedia')); var garam = hex(window.crypto.getRandomValues(new Uint8Array(16))); return turunkan(pin, garam).then(function (h) { var b = baris(sisi), rek = { subjek:subjek(sisi), alg:'pbkdf2-sha256', iter:ITERASI, garam:garam, hash:h, gagal:0, kunciSampai:0, digantiAt:new Date().toISOString() }; if (b) d.update('pinTransaksi', b.id, rek); else d.insert('pinTransaksi', Object.assign({ dibuatAt:new Date().toISOString() }, rek)); return { ok:true, mode:'lokal' }; }); }
  function verifikasiLokal(sisi, pin) {
    var d = db(), b = baris(sisi); if (!d || !b) return Promise.resolve({ ok:false, belumAda:true });
    var kunci = terkunciSampai(sisi); if (kunci) return Promise.resolve({ ok:false, terkunci:true, sampai:kunci, error:'PIN terkunci sampai ' + new Date(kunci).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) + '.' });
    return turunkan(pin, b.garam).then(function (h) {
      if (samaAman(h, b.hash)) { d.update('pinTransaksi', b.id, { gagal:0, kunciSampai:0, terakhirOk:new Date().toISOString() }); return { ok:true, mode:'lokal' }; }
      var g = (b.gagal || 0) + 1, patch = { gagal:g }; if (g >= MAKS_GAGAL) patch.kunciSampai = Date.now() + KUNCI_MENIT * 60000; d.update('pinTransaksi', b.id, patch);
      return { ok:false, sisa:Math.max(0, MAKS_GAGAL - g), error:g >= MAKS_GAGAL ? 'PIN salah 5 kali — terkunci ' + KUNCI_MENIT + ' menit.' : 'PIN salah. Sisa ' + (MAKS_GAGAL - g) + ' percobaan.' };
    });
  }

  /* ---------- gabungan: server bila ada sesi, lokal bila tidak ---------- */
  function atur(sisi, pin) { var s = lemah(pin); if (s) return Promise.resolve({ ok:false, error:s }); return viaServer(function () { return server().pinAtur(pin).then(function (r) { if (r.ok) { catatLokalAda(sisi); return { ok:true, mode:'server' }; } if (r.offline) return r; return { ok:false, error:r.error }; }); }, function () { return aturLokal(sisi, pin); }); }
  /* penanda lokal bahwa PIN sudah dibuat di server (agar UI tahu tanpa bertanya server) */
  function catatLokalAda(sisi) { var d = db(); if (!d) return; var b = baris(sisi); var rek = { subjek:subjek(sisi), diServer:true, digantiAt:new Date().toISOString(), gagal:0, kunciSampai:0 }; if (b) d.update('pinTransaksi', b.id, rek); else d.insert('pinTransaksi', Object.assign({ dibuatAt:new Date().toISOString() }, rek)); }
  function verifikasi(sisi, pin) {
    if (!/^\d{6}$/.test(String(pin || ''))) return Promise.resolve({ ok:false, error:'PIN harus 6 angka.' });
    return viaServer(function () { return server().pinVerifikasi(pin).then(function (r) { if (r.ok && r.data.pinToken) { tokenServer = { token:r.data.pinToken, sampai:Date.now() + (r.data.berlakuDetik || 300) * 1000 }; catatLokalAda(sisi); return { ok:true, mode:'server' }; } if (r.offline) return r; return { ok:false, error:r.error, terkunci:r.status === 429, belumAda:r.status === 404 }; }); }, function () { return verifikasiLokal(sisi, pin); });
  }
  function ganti(sisi, lama, baru) { var s = lemah(baru); if (s) return Promise.resolve({ ok:false, error:s }); if (String(lama) === String(baru)) return Promise.resolve({ ok:false, error:'PIN baru tidak boleh sama dengan yang lama.' }); return viaServer(function () { return server().pinGanti(lama, baru).then(function (r) { if (r.ok) return { ok:true, mode:'server' }; if (r.offline) return r; return { ok:false, error:r.error }; }); }, function () { return gantiLokal(sisi, lama, baru); }); }
  function gantiLokal(sisi, lama, baru) { return verifikasiLokal(sisi, lama).then(function (r) { return r.ok ? aturLokal(sisi, baru) : r; }); }
  /* reset setelah OTP baru: server menuntut sesi segar (< 10 menit) */
  function reset(sisi, baru) { var s = lemah(baru); if (s) return Promise.resolve({ ok:false, error:s }); return viaServer(function () { return server().pinReset(baru).then(function (r) { if (r.ok) { catatLokalAda(sisi); return { ok:true, mode:'server' }; } if (r.offline) return r; return { ok:false, error:r.error || 'Reset ditolak' }; }); }, function () { return aturLokal(sisi, baru); }); }
  function tokenAktif() { return tokenServer && tokenServer.sampai > Date.now() ? tokenServer.token : null; }
  function lupakanToken() { tokenServer = null; }
  function status(sisi) { var b = baris(sisi); return { ada:!!b, diServer:!!(b && b.diServer), dibuatAt:b && b.dibuatAt, digantiAt:b && b.digantiAt, terkunciSampai:terkunciSampai(sisi), gagal:b ? b.gagal || 0 : 0, mode:pakaiServer() ? 'server' : 'lokal', tokenAktif:!!tokenAktif() }; }
  return { MAKS_GAGAL:MAKS_GAGAL, KUNCI_MENIT:KUNCI_MENIT, lemah:lemah, ada:ada, atur:atur, verifikasi:verifikasi, ganti:ganti, reset:reset, status:status, tokenAktif:tokenAktif, lupakanToken:lupakanToken, pakaiServer:pakaiServer };
})();
