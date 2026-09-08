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

  var BAWAAN = { pay:'http://localhost:4000', auth:'http://localhost:4100', posisi:'http://localhost:4200', kirim:'http://localhost:4300', dwi:'http://localhost:4400', cs:'http://localhost:4500', data:'http://localhost:4600', vdp:'http://localhost:4700' };
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
  /* Header sesi bertanda tangan (setelah OTP) untuk semua permintaan ke server pendamping. */
  function kepalaSesi(dasar) { var k = Object.assign({}, dasar || {}); try { var ss = window.EXO_BRANKAS && EXO_BRANKAS.sesi(); if (ss) k.Authorization = 'Bearer ' + ss.token; var pt = window.EXO_PIN && EXO_PIN.tokenAktif(); if (pt) k['X-Exo-Pin'] = pt; } catch (e) { /* tanpa sesi */ } return k; }
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
    /* Sesi bertanda tangan (setelah OTP) dibawa ke semua server sebagai Bearer; data-server mewajibkannya. */
    kepala = kepalaSesi(kepala);
    return fetch(alamat()[nama] + jalur, {
      method:'POST', headers:kepala, body:JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) return { ok:false, error: j.error || ('HTTP ' + r.status), data:j, perluSesi: r.status === 401, status:r.status };
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
  /* Brankas data pribadi (data-server) */
  function dataSehat() { var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 2500) : null; return fetch(alamat().data + '/api/data/health', { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (timer) clearTimeout(timer); sehat.data = { ok:!!(r.ok && j.ok), at:Date.now() }; return { ok:!!(r.ok && j.ok), data:j }; }); }).catch(function () { if (timer) clearTimeout(timer); sehat.data = { ok:false, at:Date.now() }; return { ok:false, offline:true }; }); }
  function dataSimpan(tabel, id, data, indeks) { return kirim('data', '/api/data/simpan', { tabel:tabel, id:id, data:data, indeks:indeks || [] }); }
  function dataAmbil(tabel, id) { return kirim('data', '/api/data/ambil', { tabel:tabel, id:id }); }
  function dataAmbilSemua(tabel) { return kirim('data', '/api/data/ambil-semua', { tabel:tabel }); }
  function dataCari(tabel, bidang, nilai) { return kirim('data', '/api/data/cari', { tabel:tabel, bidang:bidang, nilai:nilai }); }
  function dataHapus(tabel, id) { return kirim('data', '/api/data/hapus', { tabel:tabel, id:id }); }
  function dataStatistik() { return kirim('data', '/api/data/statistik', {}); }
  function dataVerifikasiAudit() { return kirim('data', '/api/data/verifikasi-audit', {}); }
  function dataPutarKunci(tabel) { return kirim('data', '/api/data/putar-kunci', tabel ? { tabel:tabel } : {}); }
  /* VDP / bug bounty: laporan kerentanan → vdp-server (disimpan terenkripsi) */
  /* Verifikasi dua langkah (auth-server): TOTP & passkey; sesi sementara dari OTP diselesaikan di sini */
  function duaFaktorStatus() { return kirim('auth', '/api/auth/2fa/status', {}); }
  function duaFaktorTotpDaftar() { return kirim('auth', '/api/auth/2fa/totp/daftar', {}); }
  function duaFaktorTotpAktifkan(kode) { return kirim('auth', '/api/auth/2fa/totp/aktifkan', { kode:kode }); }
  function duaFaktorPasskeyTantangan(jenis, sesiSementara) { return kirim('auth', '/api/auth/2fa/passkey/tantangan', { jenis:jenis, sesiSementara:sesiSementara || undefined }); }
  function duaFaktorPasskeyDaftar(kredensial, nama) { return kirim('auth', '/api/auth/2fa/passkey/daftar', { kredensial:kredensial, nama:nama }); }
  function duaFaktorPasskeyHapus(id) { return kirim('auth', '/api/auth/2fa/passkey/hapus', { id:id }); }
  function duaFaktorVerifikasi(sesiSementara, kode, pemulihan) { return kirim('auth', '/api/auth/2fa/verifikasi', { sesiSementara:sesiSementara, kode:kode || undefined, pemulihan:pemulihan || undefined }); }
  function duaFaktorPasskeyMasuk(sesiSementara, kredensial) { return kirim('auth', '/api/auth/2fa/passkey/masuk', { sesiSementara:sesiSementara, kredensial:kredensial }); }
  function duaFaktorPemulihanBaru(kode) { return kirim('auth', '/api/auth/2fa/pemulihan-baru', { kode:kode }); }
  function duaFaktorNonaktif(kode) { return kirim('auth', '/api/auth/2fa/nonaktif', { kode:kode }); }
  /* PIN transaksi (auth-server): hash di server per sub sesi; verifikasi → PIN-token 5 menit */
  function pinStatus() { return kirim('auth', '/api/auth/pin/status', {}); }
  function pinAtur(pin) { return kirim('auth', '/api/auth/pin/atur', { pin:pin }); }
  function pinVerifikasi(pin) { return kirim('auth', '/api/auth/pin/verifikasi', { pin:pin }); }
  function pinGanti(lama, baru) { return kirim('auth', '/api/auth/pin/ganti', { lama:lama, baru:baru }); }
  function pinReset(baru) { return kirim('auth', '/api/auth/pin/reset', { baru:baru }); }
  function vdpLapor(isi) { return kirim('vdp', '/api/vdp/lapor', isi); }
  function vdpSehat() { return cekSehat('vdp', '/api/vdp/health'); }
  function otpKirim(telp, captcha) {
    return cekSehat('auth', '/api/auth/health').then(function (ok) {
      if (!ok) return { ok:false, offline:true };
      return kirim('auth', '/api/auth/otp/kirim', { jenis:'telp', tujuan:telp, captcha:captcha || undefined });
    });
  }
  /* sisi (klien/mitra/toko/admin) menentukan hak sesi yang diterbitkan auth-server */
  function otpPeriksa(telp, kode, sisi) { return kirim('auth', '/api/auth/otp/periksa', { jenis:'telp', tujuan:telp, kode:kode, sisi:sisi || 'klien' }); }

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
      return fetch(alamat().posisi + '/api/posisi/' + kunciPosisi(orderId), { headers: kepalaSesi(tk ? { 'X-Exo-Token': tk } : {}) })
        .then(function (r) { return r.ok ? r.json().then(function (j) { return { ok:true, data:j }; }) : { ok:false, kosong:true }; })
        .catch(function () { return { ok:false, offline:true }; });
    });
  }

  /* -------------------------------------------------------- kurir (Biteship)
     kirim-server.js memegang API key; browser hanya minta tarif, membuat
     pesanan kirim atas nomor pesanan (idempoten di server), dan membaca
     status yang diperbarui webhook. Bila server mati atau kunci kosong,
     aplikasi memakai tarif statis. */
  var infoKirim = null;
  function ambil(nama, jalur) {
    return fetch(alamat()[nama] + jalur, { headers:kepalaSesi() }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok ? { ok:true, data:j } : { ok:false, error:j.error || ('HTTP ' + r.status), perluSesi:r.status === 401, status:r.status }; }); })
      .catch(function (e) { sehat[nama] = { ok:false, at:Date.now() }; return { ok:false, offline:true, error:e.message }; });
  }
  function kirimInfo(segar) {
    if (infoKirim && !segar && Date.now() - infoKirim.at < 60000) return Promise.resolve(infoKirim.j);
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 2500) : null;
    return fetch(alamat().kirim + '/api/kirim/health', { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.ok ? r.json() : { ok:false, siap:false }; }).catch(function () { return { ok:false, siap:false, offline:true }; })
      .then(function (j) { if (timer) clearTimeout(timer); infoKirim = { at:Date.now(), j:j }; sehat.kirim = { ok:!!j.ok, at:Date.now() }; return j; });
  }
  function tarifKirim(dari, ke, items, kurir) { return kirimInfo().then(function (j) { if (!j.siap) return { ok:false, offline:!j.ok, siap:false }; return kirim('kirim', '/api/kirim/rates', { dari:dari, ke:ke, items:items, kurir:kurir }); }); }
  function buatKirim(isi) { return kirimInfo().then(function (j) { if (!j.siap) return { ok:false, offline:!j.ok, siap:false, error:'Server kurir belum siap' }; return kirim('kirim', '/api/kirim/orders', isi); }); }
  function statusKirim(ref) { return ambil('kirim', '/api/kirim/status/' + encodeURIComponent(String(ref || '').replace(/[^A-Za-z0-9_\-]/g, '-').slice(0, 40))); }
  function lacakKirim(id) { return ambil('kirim', '/api/kirim/tracking/' + encodeURIComponent(id)); }
  function cariArea(q) { return ambil('kirim', '/api/kirim/areas?q=' + encodeURIComponent(q)); }

  /* -------------------------------------------------------- Darmawisata (PPOB/TopUp)
     dwi-server.js memegang kredensial agen, daftar putih jalur, dan kunci
     idempotensi. Browser hanya memanggil jalur baca lewat /call dan jalur uang
     lewat /bayar; balasan memuat status HTTP supaya 202 (tertunda) dan 409
     (berjalan/ragu) bisa dibedakan dari sukses. */
  var infoDwi = null;
  function dwiInfo(segar) {
    if (infoDwi && !segar && Date.now() - infoDwi.at < 60000) return Promise.resolve(infoDwi.j);
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
    return fetch(alamat().dwi + '/api/dwi/health', { signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.ok ? r.json() : { ok:false, siap:false }; }).catch(function () { return { ok:false, siap:false, offline:true }; })
      .then(function (j) { if (timer) clearTimeout(timer); infoDwi = { at:Date.now(), j:j }; sehat.dwi = { ok:!!j.ok, at:Date.now() }; return j; });
  }
  /* Customer Care AI: kesehatan dicek sekali (cache 60 dtk); tanya lewat POST /tanya. */
  var csInfoCache = null;
  function csSehat() { if (!csInfoCache || Date.now() - csInfoCache.at > 60000) { csInfoCache = { at:Date.now(), ok:false }; ambil('cs', '/health').then(function (r) { csInfoCache = { at:Date.now(), ok:!!(r.ok && r.data && r.data.ok), mode:r.data && r.data.mode }; }); } return !!csInfoCache.ok; }
  function csTanya(body) { return kirimStatus('cs', '/tanya', body); }
  function kirimStatus(nama, jalur, body) {
    return fetch(alamat()[nama] + jalur, { method:'POST', headers:kepalaSesi({ 'Content-Type': 'application/json' }), body:JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok:r.ok, status:r.status, data:j, error:r.ok ? '' : (j.error || ('HTTP ' + r.status)), perluSesi:r.status === 401 }; }); })
      .catch(function (e) { sehat[nama] = { ok:false, at:Date.now() }; return { ok:false, offline:true, status:0, data:{}, error:e.message }; });
  }
  function dwiCall(jalur, isi) { return dwiInfo().then(function (j) { if (!j.siap) return { ok:false, offline:!j.ok, siap:false, error:j.pesan || 'Server Darmawisata belum siap' }; return kirimStatus('dwi', '/api/dwi/call', { jalur:jalur, isi:isi || {} }).then(function (r) { r.mode = j.mode; return r; }); }); }
  function dwiBayar(jalur, isi) { return dwiInfo().then(function (j) { if (!j.siap) return { ok:false, offline:!j.ok, siap:false, error:j.pesan || 'Server Darmawisata belum siap' }; return kirimStatus('dwi', '/api/dwi/bayar', { jalur:jalur, isi:isi || {} }); }); }
  function dwiPerjalananAkses(segar) { return dwiInfo().then(function (j) { if (!j.ok) return { ok:false, rumpun:{}, pesan:j.pesan || 'Server Darmawisata mati' }; return ambil('dwi', '/api/dwi/perjalanan/akses' + (segar ? '?segar=1' : '')).then(function (r) { return r.ok ? r.data : { ok:false, rumpun:{}, pesan:r.error }; }); }); }
  function dwiPerjalananCari(rumpun, param) { return dwiInfo().then(function (j) { if (!j.siap) return { ok:false, offline:!j.ok, siap:false, error:j.pesan || 'Server Darmawisata belum siap' }; return kirimStatus('dwi', '/api/dwi/perjalanan/cari', { rumpun:rumpun, param:param || {} }); }); }
  function dwiCocokkan(kunci) { return kirimStatus('dwi', '/api/dwi/cocokkan', { kunci:kunci }); }
  function dwiSaldo() { return ambil('dwi', '/api/dwi/balance'); }
  function dwiTransaksi() { return ambil('dwi', '/api/dwi/transaksi'); }

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

  return { duaFaktorStatus:duaFaktorStatus, duaFaktorTotpDaftar:duaFaktorTotpDaftar, duaFaktorTotpAktifkan:duaFaktorTotpAktifkan, duaFaktorPasskeyTantangan:duaFaktorPasskeyTantangan, duaFaktorPasskeyDaftar:duaFaktorPasskeyDaftar, duaFaktorPasskeyHapus:duaFaktorPasskeyHapus, duaFaktorVerifikasi:duaFaktorVerifikasi, duaFaktorPasskeyMasuk:duaFaktorPasskeyMasuk, duaFaktorPemulihanBaru:duaFaktorPemulihanBaru, duaFaktorNonaktif:duaFaktorNonaktif, pinStatus:pinStatus, pinAtur:pinAtur, pinVerifikasi:pinVerifikasi, pinGanti:pinGanti, pinReset:pinReset, vdpLapor:vdpLapor, vdpSehat:vdpSehat, dataSehat:dataSehat, dataSimpan:dataSimpan, dataAmbil:dataAmbil, dataAmbilSemua:dataAmbilSemua, dataCari:dataCari, dataHapus:dataHapus, dataStatistik:dataStatistik, dataVerifikasiAudit:dataVerifikasiAudit, dataPutarKunci:dataPutarKunci, csSehat:csSehat, csTanya:csTanya, alamat:alamat, cekSehat:cekSehat, bayar:bayar, statusBayar:statusBayar, tahan:tahan, tangkap:tangkap, lepas:lepas, otpKirim:otpKirim, otpPeriksa:otpPeriksa,
    loginGoogle:loginGoogle, loginFacebook:loginFacebook, posisiKirim:posisiKirim, posisiAmbil:posisiAmbil, tokenPosisi:tokenPosisi, dwiInfo:dwiInfo, dwiCall:dwiCall, dwiBayar:dwiBayar, dwiCocokkan:dwiCocokkan, dwiPerjalananAkses:dwiPerjalananAkses, dwiPerjalananCari:dwiPerjalananCari, dwiSaldo:dwiSaldo, dwiTransaksi:dwiTransaksi, kirimInfo:kirimInfo, tarifKirim:tarifKirim, buatKirim:buatKirim, statusKirim:statusKirim, lacakKirim:lacakKirim, cariArea:cariArea, alamatSah:alamatSah, muatSkrip:muatSkrip, KANAL:KANAL };
})();
