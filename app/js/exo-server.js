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
  /* Alamat timpaan dari localStorage hanya diterima bila HTTPS, atau HTTP ke
     localhost/jaringan pribadi — supaya skrip asing yang sempat menulis
     localStorage tidak bisa membelokkan pembayaran ke server miliknya. */
  function alamatSah(u) {
    try { var x = new URL(String(u)); if (x.protocol === 'https:') return true; if (x.protocol !== 'http:') return false;
      return /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(x.hostname); } catch (e) { return false; }
  }
  function alamat() {
    var timpa = {};
    try { timpa = JSON.parse(localStorage.getItem('exoclean_server') || '{}') || {}; } catch (e) { timpa = {}; }
    var out = Object.assign({}, BAWAAN);
    Object.keys(timpa).forEach(function (k) { if (BAWAAN[k] && alamatSah(timpa[k])) out[k] = String(timpa[k]).replace(/\/+$/, ''); });
    return out;
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

  function kirim(nama, jalur, body, token) {
    var kepala = { 'Content-Type': 'application/json' }; if (token) kepala['X-Exo-Token'] = token;
    return fetch(alamat()[nama] + jalur, {
      method:'POST', headers:kepala, body:JSON.stringify(body || {})
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
  /* Token transaksi (dikembalikan sekali saat charge/authorize) wajib untuk
     status, capture, dan cancel — dibawa di header X-Exo-Token. */
  function statusBayar(orderId, token) { return kirim('pay', '/api/pay/status', { gateway:'midtrans', orderId:orderId }, token); }
  /* Penahanan dana (pre-authorization): di Midtrans hanya kartu kredit.
     Kanal lain dibalas { tunda:true } supaya aplikasi mencatat tagihan
     tertunda dan menagihnya lewat gateway setelah kunjungan selesai. */
  function tahan(id, orderId, amount, pelanggan) {
    if (id !== 'card') return Promise.resolve({ ok:false, tunda:true });
    return cekSehat('pay', '/api/pay/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('pay', '/api/pay/authorize', { gateway:'midtrans', orderId:orderId, channel:'cc', amount:amount, customer:pelanggan, keterangan:'EXOCLEAN ' + orderId + ' (hold)', invoiceNo:orderId });
    });
  }
  function tangkap(orderId, amount, token) { return kirim('pay', '/api/pay/capture', { gateway:'midtrans', orderId:orderId, amount:amount }, token); }
  function lepas(orderId, token) { return kirim('pay', '/api/pay/cancel', { gateway:'midtrans', orderId:orderId }, token); }

  /* -------------------------------------------------------------- OTP */
  function otpKirim(telp, captcha) {
    return cekSehat('auth', '/api/auth/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('auth', '/api/auth/otp/kirim', { jenis:'telp', tujuan:telp, captcha:captcha || undefined });
    });
  }
  function otpPeriksa(telp, kode) { return kirim('auth', '/api/auth/otp/periksa', { jenis:'telp', tujuan:telp, kode:kode }); }

  /* ---------------------------------------------------- login sosial
     Token dari Google Identity Services / Facebook SDK diverifikasi di
     auth-server (GOOGLE_CLIENT_ID dan rahasia aplikasi Facebook); browser tidak
     pernah memutuskan sendiri bahwa token itu sah. */
  function loginGoogle(idToken) { return kirim('auth', '/api/auth/google', { token:idToken }); }
  function loginFacebook(accessToken) { return kirim('auth', '/api/auth/facebook', { token:accessToken }); }

  /* -------------------------------------------------------- posisi
     Nomor pesanan bisa mengandung garis miring (EXO/ORD/2026/0025); di URL
     ia dijadikan kunci aman. Kedua sisi memakai fungsi yang sama, jadi
     kuncinya pasti cocok. */
  function kunciPosisi(orderId) { return String(orderId || '').replace(/[^A-Za-z0-9_\-]/g, '-').slice(0, 40); }
  /* Token posisi per pesanan: kiriman pertama menerima { tulis, baca } dari
     server; keduanya disimpan di perangkat ini. Sisi pelanggan membaca dengan
     token baca — di perangkat lain, token baca dibawa lewat catatan pesanan
     (exo.posisiBaca) yang ditulis sisi mitra saat kiriman pertama. */
  function tokenPosisi(orderId) { try { return JSON.parse(localStorage.getItem('exoclean_posisi_token:' + kunciPosisi(orderId)) || 'null'); } catch (e) { return null; } }
  function simpanTokenPosisi(orderId, t) { try { localStorage.setItem('exoclean_posisi_token:' + kunciPosisi(orderId), JSON.stringify(t)); } catch (e) { /* abaikan */ } }
  function posisiKirim(orderId, p) {
    return cekSehat('posisi', '/api/posisi/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      var t = tokenPosisi(orderId) || {};
      return kirim('posisi', '/api/posisi/' + kunciPosisi(orderId), { lat:p.lat, lng:p.lng, akurasi:p.akurasi }, t.tulis).then(function (r) {
        if (r.ok && r.data && r.data.tulis) { simpanTokenPosisi(orderId, { tulis:r.data.tulis, baca:r.data.baca }); r.tokenBaca = r.data.baca; }
        return r;
      });
    });
  }
  function posisiAmbil(orderId, tokenBaca) {
    return cekSehat('posisi', '/api/posisi/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      var t = tokenPosisi(orderId) || {}, tk = tokenBaca || t.baca || t.tulis || '';
      return fetch(alamat().posisi + '/api/posisi/' + kunciPosisi(orderId), { headers: tk ? { 'X-Exo-Token': tk } : {} })
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

  return { alamat:alamat, cekSehat:cekSehat, bayar:bayar, statusBayar:statusBayar, tahan:tahan, tangkap:tangkap, lepas:lepas, otpKirim:otpKirim, otpPeriksa:otpPeriksa,
    loginGoogle:loginGoogle, loginFacebook:loginFacebook, posisiKirim:posisiKirim, posisiAmbil:posisiAmbil, tokenPosisi:tokenPosisi, alamatSah:alamatSah, muatSkrip:muatSkrip, KANAL:KANAL };
})();
