/* ==========================================================================
   exo-2fa.js — verifikasi dua langkah (aplikasi autentikator TOTP & passkey)
   untuk pelanggan, mitra cleaning, dan mitra toko
   --------------------------------------------------------------------------
   Semua verifikasi terjadi di auth-server (duafaktor.js). Modul ini hanya
   jembatan + pembantu WebAuthn di peramban:
   · TOTP: daftar (QR + rahasia), aktifkan dengan kode, nonaktifkan.
   · Passkey: navigator.credentials.create/get dengan tantangan dari server;
     hasilnya dikirim ke server untuk diverifikasi (bukan diputuskan di sini).
   · Masuk: setelah OTP/login sosial, bila akun ber-2FA server memberi
     `sesiSementara` (5 menit) → selesaikan dengan kode TOTP, passkey, atau
     kode pemulihan → sesi penuh (EXO_BRANKAS.terimaSesi).
   Tanpa auth-server, 2FA tidak tersedia (tidak ada mode lokal — 2FA yang
   diputuskan di perangkat sendiri tidak berarti).
   ========================================================================== */
var EXO_2FA = (function () {
  'use strict';
  function server() { return window.EXO_SERVER || null; }
  function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dariB64u(s) { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function tersedia() { var s = server(); return !!(s && s.duaFaktorStatus); }
  function passkeyDidukung() { return !!(window.PublicKeyCredential && navigator.credentials); }
  function status() { return tersedia() ? server().duaFaktorStatus() : Promise.resolve({ ok:false, offline:true }); }
  function totpDaftar() { return server().duaFaktorTotpDaftar(); }
  function totpAktifkan(kode) { return server().duaFaktorTotpAktifkan(kode); }
  function nonaktif(kode) { return server().duaFaktorNonaktif(kode); }
  function pemulihanBaru(kode) { return server().duaFaktorPemulihanBaru(kode); }
  /* ---------- passkey: pendaftaran ---------- */
  function kredKeJson(cred, jenis) { var r = cred.response, o = { id:cred.id, rawId:b64u(cred.rawId), type:cred.type, response:{ clientDataJSON:b64u(r.clientDataJSON) } }; if (jenis === 'daftar') o.response.attestationObject = b64u(r.attestationObject); else { o.response.authenticatorData = b64u(r.authenticatorData); o.response.signature = b64u(r.signature); if (r.userHandle) o.response.userHandle = b64u(r.userHandle); } return o; }
  function passkeyDaftar(nama) {
    if (!passkeyDidukung()) return Promise.resolve({ ok:false, error:'Peramban/perangkat ini tidak mendukung passkey.' });
    return server().duaFaktorPasskeyTantangan('daftar').then(function (t) {
      if (!t.ok) return t;
      var d = t.data;
      return navigator.credentials.create({ publicKey:{ challenge:dariB64u(d.tantangan), rp:{ id:d.rpId, name:'EXOCLEAN' }, user:{ id:dariB64u(d.userId), name:d.userName, displayName:d.userName }, pubKeyCredParams:[{ type:'public-key', alg:-7 }], authenticatorSelection:{ userVerification:'preferred', residentKey:'preferred' }, timeout:60000, attestation:'none', excludeCredentials:(d.sudahAda || []).map(function (id) { return { type:'public-key', id:dariB64u(id) }; }) } })
        .then(function (cred) { return server().duaFaktorPasskeyDaftar(kredKeJson(cred, 'daftar'), nama || (navigator.platform || 'perangkat')); })
        .catch(function (e) { return { ok:false, error:e && e.name === 'NotAllowedError' ? 'Pendaftaran passkey dibatalkan.' : (e && e.message) || String(e) }; });
    });
  }
  function passkeyHapus(id) { return server().duaFaktorPasskeyHapus(id); }
  /* ---------- masuk dengan 2FA ---------- */
  function masukKode(sesiSementara, kode) { return server().duaFaktorVerifikasi(sesiSementara, kode); }
  function masukPemulihan(sesiSementara, kode) { return server().duaFaktorVerifikasi(sesiSementara, null, kode); }
  function masukPasskey(sesiSementara) {
    if (!passkeyDidukung()) return Promise.resolve({ ok:false, error:'Peramban ini tidak mendukung passkey.' });
    return server().duaFaktorPasskeyTantangan('masuk', sesiSementara).then(function (t) {
      if (!t.ok) return t;
      var d = t.data;
      return navigator.credentials.get({ publicKey:{ challenge:dariB64u(d.tantangan), rpId:d.rpId, allowCredentials:(d.izinkan || []).map(function (id) { return { type:'public-key', id:dariB64u(id) }; }), userVerification:'preferred', timeout:60000 } })
        .then(function (cred) { return server().duaFaktorPasskeyMasuk(sesiSementara, kredKeJson(cred, 'masuk')); })
        .catch(function (e) { return { ok:false, error:e && e.name === 'NotAllowedError' ? 'Passkey dibatalkan.' : (e && e.message) || String(e) }; });
    });
  }
  return { tersedia:tersedia, passkeyDidukung:passkeyDidukung, status:status, totpDaftar:totpDaftar, totpAktifkan:totpAktifkan, nonaktif:nonaktif, pemulihanBaru:pemulihanBaru, passkeyDaftar:passkeyDaftar, passkeyHapus:passkeyHapus, masukKode:masukKode, masukPemulihan:masukPemulihan, masukPasskey:masukPasskey };
})();
