/* ==========================================================================
   exo-server.js — jembatan EXOCLEAN App ke server pendamping (app/server/)
   --------------------------------------------------------------------------
   Dua server yang sudah ada di repo:
     payment-server.js  (PORT 4000)      POST /api/pay/charge · /api/pay/status
     auth-server.js     (AUTH_PORT 4100) POST /api/auth/otp/kirim · /otp/periksa

   Alamatnya boleh ditimpa lewat localStorage 'exoclean_server' =
   {"pay":"https://…","auth":"https://…"} supaya build yang sama dipakai di
   staging tanpa diubah.

   JUJUR SAAT SERVER TIDAK ADA. Tiap pemanggil menerima {ok:false, offline:true}
   bila servernya tidak bisa dihubungi, lalu memutuskan sendiri apakah jatuh
   ke simulasi — dan layar harus MENGATAKAN bahwa itu simulasi. Kesehatan
   server dicek sekali per 30 detik supaya layar tidak menunggu 8 detik
   setiap kali tombol ditekan.

   Catatan CORS: ALLOWED_ORIGINS di server/.env menentukan asal yang boleh
   memanggil. Bawaannya http://localhost:8080 (port serve.ps1).
   ========================================================================== */
var EXO_SERVER = (function () {
  'use strict';

  var BAWAAN = { pay:'http://localhost:4000', auth:'http://localhost:4100', posisi:'http://localhost:4200' };
  function alamat() {
    try { return Object.assign({}, BAWAAN, JSON.parse(localStorage.getItem('exoclean_server') || '{}')); }
    catch (e) { return Object.assign({}, BAWAAN); }
  }

  var sehat = {};   /* nama → { ok, at } */
  function cekSehat(nama, jalur) {
    var s = sehat[nama];
    if (s && Date.now() - s.at < 30000) return Promise.resolve(s.ok);
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 2500) : null;
    return fetch(alamat()[nama] + jalur, { signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok; })
      .catch(function () { return false; })
      .then(function (ok) { if (timer) clearTimeout(timer); sehat[nama] = { ok:ok, at:Date.now() }; return ok; });
  }

  function kirim(nama, jalur, body) {
    return fetch(alamat()[nama] + jalur, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) return { ok:false, error: j.error || ('HTTP ' + r.status), data:j };
        return { ok:true, data:j };
      });
    }).catch(function (e) { sehat[nama] = { ok:false, at:Date.now() }; return { ok:false, offline:true, error:e.message }; });
  }

  /* ------------------------------------------------------------ pembayaran
     channel mengikuti peta CHANNEL di payment-server.js. */
  var KANAL = { qris:'qris', ewallet:'gopay', va:'va_bca', card:'cc' };
  function bayar(id, orderId, amount, pelanggan) {
    var channel = KANAL[id];
    if (!channel) return Promise.resolve({ ok:false, error:'Kanal ' + id + ' tidak lewat gateway' });
    return cekSehat('pay', '/api/pay/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('pay', '/api/pay/charge', { gateway:'midtrans', orderId:orderId, channel:channel, amount:amount, customer:pelanggan, keterangan:'EXOCLEAN ' + orderId, invoiceNo:orderId });
    });
  }
  function statusBayar(orderId) { return kirim('pay', '/api/pay/status', { gateway:'midtrans', orderId:orderId }); }

  /* -------------------------------------------------------------- OTP */
  function otpKirim(telp) {
    return cekSehat('auth', '/api/auth/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('auth', '/api/auth/otp/kirim', { jenis:'telp', tujuan:telp });
    });
  }
  function otpPeriksa(telp, kode) { return kirim('auth', '/api/auth/otp/periksa', { jenis:'telp', tujuan:telp, kode:kode }); }

  /* ---------------------------------------------------- login sosial
     Token dari Google Identity Services / Facebook SDK diverifikasi di
     auth-server (GOOGLE_CLIENT_ID / FACEBOOK_APP_SECRET); browser tidak
     pernah memutuskan sendiri bahwa token itu sah. */
  function loginGoogle(idToken) { return kirim('auth', '/api/auth/google', { token:idToken }); }
  function loginFacebook(accessToken) { return kirim('auth', '/api/auth/facebook', { token:accessToken }); }

  /* -------------------------------------------------------- posisi
     Nomor pesanan bisa mengandung garis miring (EXO/ORD/2026/0025); di URL
     ia dijadikan kunci aman. Kedua sisi memakai fungsi yang sama, jadi
     kuncinya pasti cocok. */
  function kunciPosisi(orderId) { return String(orderId || '').replace(/[^A-Za-z0-9_\-]/g, '-').slice(0, 40); }
  function posisiKirim(orderId, p) {
    return cekSehat('posisi', '/api/posisi/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('posisi', '/api/posisi/' + kunciPosisi(orderId), { lat:p.lat, lng:p.lng, akurasi:p.akurasi });
    });
  }
  function posisiAmbil(orderId) {
    return cekSehat('posisi', '/api/posisi/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return fetch(alamat().posisi + '/api/posisi/' + kunciPosisi(orderId))
        .then(function (r) { return r.ok ? r.json().then(function (j) { return { ok:true, data:j }; }) : { ok:false, kosong:true }; })
        .catch(function () { return { ok:false, offline:true }; });
    });
  }

  /* Pemuat skrip pihak ketiga, sekali per URL. */
  var dimuat = {};
  function muatSkrip(url) {
    if (dimuat[url]) return dimuat[url];
    dimuat[url] = new Promise(function (ok, gagal) {
      var s = document.createElement('script'); s.src = url; s.async = true; s.defer = true;
      s.onload = function () { ok(true); }; s.onerror = function () { delete dimuat[url]; gagal(new Error('Gagal memuat ' + url)); };
      document.head.appendChild(s);
    });
    return dimuat[url];
  }

  return { alamat:alamat, cekSehat:cekSehat, bayar:bayar, statusBayar:statusBayar, otpKirim:otpKirim, otpPeriksa:otpPeriksa,
    loginGoogle:loginGoogle, loginFacebook:loginFacebook, posisiKirim:posisiKirim, posisiAmbil:posisiAmbil, muatSkrip:muatSkrip, KANAL:KANAL };
})();
