/* ==========================================================================
   exo-screens-2fa.js — layar "Verifikasi dua langkah" & lembar masuk 2FA
   (pelanggan, mitra cleaning, mitra toko)
   --------------------------------------------------------------------------
   · Layar `duaFaktor` (Akun → Keamanan akun): status, aktifkan aplikasi
     autentikator (QR + kunci manual → kode 6 digit), passkey (daftar/hapus),
     kode pemulihan (tampil sekali), nonaktifkan dengan kode.
   · Lembar `duaFaktorMasuk`: dipasang otomatis saat OTP/login sosial dibalas
     `perlu2fa` — pilih passkey, kode autentikator, atau kode pemulihan.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  var F = function () { return window.EXO_2FA; };
  if (!window.EXO_2FA) return;
  K.dua = K.dua || { status:null, daftar:null, kode:'', pesan:'', pemulihan:null, sibuk:false, namaPasskey:'' };
  K.duaMasuk = null;
  function sisi() { return K.sisi === 'toko' ? 'toko' : K.sisi === 'partner' ? 'partner' : 'customer'; }
  function muatStatus() { K.dua.sibuk = true; F().status().then(function (r) { K.dua.sibuk = false; K.dua.status = r.ok ? r.data : { offline:!!r.offline, error:r.error, perluSesi:!!r.perluSesi }; X.gambar(); }); }

  X.LAYAR.duaFaktor = function () {
    var d = K.dua, st = d.status, kembali = sisi() === 'toko' ? 'tprofil' : 'profile';
    if (!st && !d.sibuk) setTimeout(muatStatus, 0);
    var h = '<div class="screen">' + X.kepala('Verifikasi dua langkah', 'Aplikasi autentikator & passkey · terpisah dari OTP dan PIN', kembali) + '<div class="stack gap-12 pad-x18" style="padding-bottom:40px">';
    if (!st) return h + '<div class="card elev-sm"><div class="t-125 o-6">Memuat status dari server…</div></div></div></div>';
    if (st.offline || st.perluSesi) return h + '<div class="card elev-sm gap-8"><div class="bold t-14">' + (st.perluSesi ? 'Masuk dulu lewat OTP' : 'Server autentikasi tidak terjangkau') + '</div><div class="t-12 o-6 lh-15">' + (st.perluSesi ? 'Verifikasi dua langkah terikat ke akun yang sudah masuk (sesi bertanda tangan). Masuk lewat OTP, lalu buka menu ini lagi.' : 'Verifikasi dua langkah diperiksa di auth-server, bukan di perangkat, supaya tidak bisa dilewati dari peramban. Coba lagi saat tersambung.') + '</div><button class="btn btn-secondary" style="height:36px"' + aksi('duaMuat') + '>Coba lagi</button></div></div></div>';
    h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="grow"><div class="bold t-14">' + (st.aktif ? 'Aktif — akun dilindungi dua langkah' : 'Belum aktif') + '</div><div class="t-12 o-6">' + (st.aktif ? 'Setelah OTP, masuk butuh ' + (st.passkeys && st.passkeys.length ? 'passkey' : '') + (st.passkeys && st.passkeys.length && st.totp ? ' atau ' : '') + (st.totp ? 'kode autentikator' : '') + '. Kode pemulihan tersisa: ' + (st.pemulihanSisa || 0) + '.' : 'Tambahkan aplikasi autentikator atau passkey. Seperti Tokopedia (Google Authenticator) dan GoPay (biometrik).') + '</div></div>' + (st.aktif ? '<span class="tag tag-accent" style="font-size:10.5px">aktif</span>' : '') + '</div></div>';
    /* TOTP */
    h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span style="font-size:22px">📱</span><div class="grow"><div class="bold t-14">Aplikasi autentikator (TOTP)</div><div class="t-12 o-6">Google Authenticator, Authy, Microsoft Authenticator, 1Password</div></div>' + (st.totp ? '<span class="tag tag-accent" style="font-size:10.5px">terpasang</span>' : '') + '</div>';
    if (!st.totp && !d.daftar) h += '<button class="btn btn-primary" style="height:38px"' + aksi('duaTotpDaftar') + '>Pasang autentikator</button>';
    if (d.daftar) {
      var svg = String(d.daftar.qrSvg || ''); svg = /^\s*<svg[\s\S]*<\/svg>\s*$/.test(svg) && svg.indexOf('<script') < 0 ? svg : '';
      h += '<div class="t-12 lh-15">1. Buka aplikasi autentikator → tambah akun → pindai QR ini, atau ketik kunci manual.<br>2. Masukkan kode 6 digit yang muncul untuk mengaktifkan.</div>' + (svg ? '<div style="max-width:200px;margin:0 auto;background:#fff;padding:8px;border-radius:12px">' + svg + '</div>' : '') + '<div class="t-11 center" style="font-family:monospace;letter-spacing:.08em;word-break:break-all">' + esc(d.daftar.rahasia) + '</div>' +
        '<div class="flex gap-8"><input class="input" inputmode="numeric" maxlength="6" placeholder="kode 6 digit" value="' + esc(d.kode) + '" data-ubah="duaKode" data-arg="kode" style="flex:1"><button class="btn btn-primary" style="height:40px"' + aksi('duaTotpAktifkan') + '>Aktifkan</button></div>';
    }
    if (st.totp) h += '<div class="t-11 o-6">Terpasang ' + esc(String(st.totp.dibuatAt || '').slice(0, 10)) + '. Kode hanya dibuat di ponsel Anda; server hanya menyimpan rahasia terenkripsi.</div>';
    h += '</div>';
    /* Passkey */
    h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span style="font-size:22px">🔐</span><div class="grow"><div class="bold t-14">Passkey (sidik jari / wajah / kunci keamanan)</div><div class="t-12 o-6">FIDO2/WebAuthn · tahan phishing · ' + (F().passkeyDidukung() ? 'didukung perangkat ini' : 'tidak didukung peramban ini') + '</div></div></div>';
    (st.passkeys || []).forEach(function (p) { h += '<div class="row row-xs"><span class="row-main"><b style="font-size:12.5px">' + esc(p.nama || 'Passkey') + '</b><span>didaftarkan ' + esc(String(p.dibuatAt || '').slice(0, 10)) + (p.terakhirAt ? ' · dipakai ' + esc(String(p.terakhirAt).slice(0, 10)) : '') + '</span></span><button class="pill pill-sm"' + aksi('duaPasskeyHapus', p.id) + '>Hapus</button></div>'; });
    h += '<div class="flex gap-8"><input class="input" placeholder="nama perangkat (opsional)" value="' + esc(d.namaPasskey) + '" data-ubah="duaKode" data-arg="namaPasskey" style="flex:1"><button class="btn btn-primary" style="height:40px"' + (F().passkeyDidukung() ? aksi('duaPasskeyDaftar') : ' disabled') + '>+ Passkey</button></div></div>';
    /* pemulihan & nonaktif */
    if (d.pemulihan) h += '<div class="card card-leaf gap-6"><div class="bold t-14">Kode pemulihan — simpan sekarang</div><div class="t-12 lh-15">Masing-masing sekali pakai, untuk masuk bila ponsel/passkey hilang. Tidak akan ditampilkan lagi.</div><div style="font-family:monospace;font-size:14px;letter-spacing:.06em;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">' + d.pemulihan.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div><button class="btn btn-secondary" style="height:34px"' + aksi('duaPemulihanTutup') + '>Sudah saya simpan</button></div>';
    if (st.aktif) h += '<div class="card elev-sm gap-8"><div class="bold t-14">Kelola</div><div class="flex gap-8"><input class="input" inputmode="numeric" placeholder="kode autentikator / pemulihan" value="' + esc(d.kode) + '" data-ubah="duaKode" data-arg="kode" style="flex:1"></div><div class="flex gap-8 wrap"><button class="btn btn-secondary" style="height:36px;font-size:12.5px"' + aksi('duaPemulihanBaru') + '>Buat kode pemulihan baru</button><button class="btn btn-secondary" style="height:36px;font-size:12.5px;color:#9b1c1c"' + aksi('duaNonaktif') + '>Nonaktifkan dua langkah</button></div><div class="t-11 o-6">Keduanya butuh kode autentikator atau kode pemulihan yang masih berlaku.</div></div>';
    if (d.pesan) h += '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(d.pesan) + '</div>';
    return h + '</div></div>';
  };
  A.duaMuat = function () { K.dua.status = null; muatStatus(); };
  A.duaKode = function (k, v) { K.dua[k] = String(v || ''); K.dua.pesan = ''; };
  A.duaTotpDaftar = function () { K.dua.sibuk = true; F().totpDaftar().then(function (r) { K.dua.sibuk = false; if (r.ok) { K.dua.daftar = r.data; K.dua.kode = ''; } else K.dua.pesan = r.error || 'Gagal.'; X.gambar(); }); };
  A.duaTotpAktifkan = function () { var kode = K.dua.kode.replace(/\D/g, ''); if (kode.length !== 6) { K.dua.pesan = 'Masukkan 6 digit dari aplikasi autentikator.'; return; } F().totpAktifkan(kode).then(function (r) { if (r.ok) { K.dua.daftar = null; K.dua.kode = ''; K.dua.pemulihan = r.data.pemulihan || null; X.sekilas('Aplikasi autentikator aktif.'); muatStatus(); } else { K.dua.pesan = r.error || 'Kode salah.'; X.gambar(); } }); };
  A.duaPasskeyDaftar = function () { K.dua.sibuk = true; X.gambar(); F().passkeyDaftar(K.dua.namaPasskey).then(function (r) { K.dua.sibuk = false; if (r.ok) { K.dua.namaPasskey = ''; if (r.data && r.data.pemulihan) K.dua.pemulihan = r.data.pemulihan; X.sekilas('Passkey terdaftar.'); muatStatus(); } else { K.dua.pesan = r.error || 'Gagal mendaftarkan passkey.'; X.gambar(); } }); };
  A.duaPasskeyHapus = function (id) { F().passkeyHapus(id).then(function (r) { if (r.ok) { X.sekilas('Passkey dihapus.'); muatStatus(); } else { K.dua.pesan = r.error || 'Gagal.'; X.gambar(); } }); };
  A.duaPemulihanBaru = function () { F().pemulihanBaru(K.dua.kode).then(function (r) { if (r.ok) { K.dua.pemulihan = r.data.pemulihan; K.dua.kode = ''; muatStatus(); } else { K.dua.pesan = r.error || 'Gagal.'; X.gambar(); } }); };
  A.duaPemulihanTutup = function () { K.dua.pemulihan = null; };
  A.duaNonaktif = function () { F().nonaktif(K.dua.kode).then(function (r) { if (r.ok) { K.dua.kode = ''; X.sekilas('Verifikasi dua langkah dinonaktifkan.'); muatStatus(); } else { K.dua.pesan = r.error || 'Gagal.'; X.gambar(); } }); };

  /* ---------- lembar masuk 2FA ---------- */
  X.mulaiDuaFaktorMasuk = function (data, setelah) { K.duaMasuk = { sesiSementara:data.sesiSementara, metode:data.metode || {}, kode:'', pesan:'', sibuk:false, modePemulihan:false, setelah:setelah || null }; K.lembar = 'duaFaktorMasuk'; };
  X.LEMBAR.duaFaktorMasuk = function () {
    var m = K.duaMasuk; if (!m) return '';
    var isi = '<div class="stack gap-10"><div class="t-125 lh-15">Akun ini dilindungi verifikasi dua langkah. Selesaikan salah satu untuk masuk.</div>' +
      (m.metode.passkey && F().passkeyDidukung() ? '<button class="btn btn-primary btn-block btn-tall"' + aksi('duaMasukPasskey') + '>🔐 Gunakan passkey</button>' : '') +
      (m.metode.totp || m.modePemulihan ? '<div class="field"><label>' + (m.modePemulihan ? 'Kode pemulihan' : 'Kode aplikasi autentikator') + '</label><input class="input" inputmode="' + (m.modePemulihan ? 'text' : 'numeric') + '" maxlength="12" value="' + esc(m.kode) + '" data-ubah="duaMasukKode" placeholder="' + (m.modePemulihan ? 'XXXXX-XXXXX' : '6 digit') + '"></div><button class="btn btn-secondary btn-block"' + aksi('duaMasukKirim') + '>' + (m.sibuk ? 'Memeriksa…' : 'Verifikasi') + '</button>' : '') +
      '<button class="btn btn-ghost t-12"' + aksi('duaMasukPemulihan') + '>' + (m.modePemulihan ? 'Kembali ke kode autentikator' : 'Pakai kode pemulihan') + '</button>' +
      (m.pesan ? '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(m.pesan) + '</div>' : '') + '<div class="t-11 o-6 center">Berlaku 5 menit setelah OTP.</div></div>';
    return '<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true" aria-label="Verifikasi dua langkah" data-diam="1"><div class="sheet-grip"></div><div class="sheet-head"><div class="sheet-title">Verifikasi dua langkah</div><button class="btn btn-icon btn-soft"' + aksi('duaMasukBatal') + ' aria-label="Batal">✕</button></div><div class="sheet-body">' + isi + '</div></div></div>';
  };
  function selesaiMasuk(r) { var m = K.duaMasuk; if (!m) return; m.sibuk = false; if (r.ok && r.data && r.data.sesi) { if (window.EXO_BRANKAS) EXO_BRANKAS.terimaSesi(r.data.sesi); K.lembar = null; K.duaMasuk = null; X.sekilas('Verifikasi dua langkah berhasil.'); if (m.setelah) { try { m.setelah(r.data); } catch (e) { /* abaikan */ } } } else m.pesan = r.error || 'Verifikasi gagal.'; X.gambar(); }
  A.duaMasukKode = function (a, v) { if (K.duaMasuk) { K.duaMasuk.kode = String(v || ''); K.duaMasuk.pesan = ''; } };
  A.duaMasukPemulihan = function () { if (K.duaMasuk) { K.duaMasuk.modePemulihan = !K.duaMasuk.modePemulihan; K.duaMasuk.kode = ''; } };
  A.duaMasukBatal = function () { K.duaMasuk = null; K.lembar = null; };
  A.duaMasukKirim = function () { var m = K.duaMasuk; if (!m || m.sibuk) return; m.sibuk = true; X.gambar(); (m.modePemulihan ? F().masukPemulihan(m.sesiSementara, m.kode) : F().masukKode(m.sesiSementara, m.kode)).then(selesaiMasuk); };
  A.duaMasukPasskey = function () { var m = K.duaMasuk; if (!m || m.sibuk) return; m.sibuk = true; X.gambar(); F().masukPasskey(m.sesiSementara).then(selesaiMasuk); };
})(ExoApp);
