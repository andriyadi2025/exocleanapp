/* ==========================================================================
   exo-admin-auth.js — gerbang masuk konsol admin EXOCLEAN
   --------------------------------------------------------------------------
   Sebelum ini exo-admin.html terbuka bagi siapa pun yang tahu alamatnya.
   Gerbang ini memasang:
     · Login email + sandi untuk akun berperan 'admin' di basis data lokal
       (EXO_DB). Sandi disimpan sebagai PBKDF2-SHA256 (150.000 iterasi, garam
       16 byte) lewat WebCrypto — bukan teks polos. Akun lama yang masih
       memegang `pass` teks polos dimigrasikan ke hash saat gerbang dimuat.
     · Kunci 15 menit setelah 5 kali salah (per peramban).
     · Sesi 30 menit tanpa aktivitas → terkunci lagi; disimpan di
       sessionStorage supaya hilang saat tab ditutup.
     · Peringatan sandi bawaan (123456 dari data contoh) dan formulir ganti
       sandi; pemasangan baru tanpa admin diminta membuat akun pertama.
     · Wajib konteks aman (HTTPS atau localhost): tanpa crypto.subtle gerbang
       menolak, bukan jatuh ke hash lemah.
   Setiap masuk/keluar/gagal dicatat ke tabel activity.

   JUJUR TENTANG BATASNYA: ini gerbang di sisi peramban. Basis datanya ada di
   localStorage perangkat, jadi siapa pun yang memegang perangkat yang sudah
   login bisa membacanya lewat DevTools. Untuk produksi, halaman admin wajib
   juga dilindungi di server (allowlist IP + autentikasi di nginx, lihat
   app/server/KEAMANAN.md) dan datanya dipindah ke basis data server.
   ========================================================================== */
(function () {
  'use strict';
  var KUNCI_SESI = 'exoclean_admin_sesi', KUNCI_GAGAL = 'exoclean_admin_gagal';
  var SESI_MENIT = 30, MAKS_GAGAL = 5, KUNCI_MENIT = 15, ITERASI = 150000;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); };
  var subtle = (window.crypto && window.crypto.subtle) || null;

  /* ---------------------------------------------------------- hash */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function dariHex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function turunkan(sandi, garamHex, iterasi) {
    return subtle.importKey('raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:dariHex(garamHex), iterations:iterasi }, k, 256);
    }).then(hex);
  }
  function buatHash(sandi) {
    var garam = hex(window.crypto.getRandomValues(new Uint8Array(16)));
    return turunkan(sandi, garam, ITERASI).then(function (h) { return { alg:'pbkdf2-sha256', iter:ITERASI, garam:garam, hash:h }; });
  }
  function samaAman(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
  function periksaHash(sandi, rekam) { return turunkan(sandi, rekam.garam, rekam.iter).then(function (h) { return samaAman(h, rekam.hash); }); }

  /* ---------------------------------------------------------- akun */
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function admins() { var d = db(); return d ? d.where('users', function (u) { return u.role === 'admin' && u.aktif !== false; }) : []; }
  /* Sandi teks polos peninggalan data contoh → hash; teks polosnya dihapus. */
  function migrasi() {
    var d = db(); if (!d || !subtle) return Promise.resolve();
    d.where('users', function (u) { return u.role === 'admin' && !u.peran; }).forEach(function (u) { d.update('users', u.id, { peran:'superadmin' }); });
    var polos = d.where('users', function (u) { return u.role === 'admin' && u.pass && !u.passHash; });
    return Promise.all(polos.map(function (u) {
      return buatHash(String(u.pass)).then(function (h) { d.update('users', u.id, { passHash:h, pass:null, sandiBawaan: String(u.pass) === '123456' }); });
    }));
  }
  function catat(aksi, detail, actorId) { var d = db(); if (d && d.log) d.log(actorId || null, aksi, 'auth', null, detail || ''); }

  /* ---------------------------------------------------------- sesi */
  function sesi() { try { var s = JSON.parse(sessionStorage.getItem(KUNCI_SESI) || 'null'); return s && s.sampai > Date.now() ? s : null; } catch (e) { return null; } }
  function buatSesi(u) { var s = { id:u.id, nama:u.nama, email:u.email, mulai:Date.now(), sampai:Date.now() + SESI_MENIT * 60000 }; sessionStorage.setItem(KUNCI_SESI, JSON.stringify(s)); return s; }
  function segarkan() { var s = sesi(); if (s) { s.sampai = Date.now() + SESI_MENIT * 60000; sessionStorage.setItem(KUNCI_SESI, JSON.stringify(s)); } }
  function hapusSesi() { sessionStorage.removeItem(KUNCI_SESI); }
  function gagal() { try { return JSON.parse(localStorage.getItem(KUNCI_GAGAL) || '{"n":0}'); } catch (e) { return { n:0 }; } }
  function terkunciSampai() { var g = gagal(); return g.n >= MAKS_GAGAL && g.sampai > Date.now() ? g.sampai : 0; }
  function catatGagal() { var g = gagal(); g.n = (g.n || 0) + 1; if (g.n >= MAKS_GAGAL) g.sampai = Date.now() + KUNCI_MENIT * 60000; localStorage.setItem(KUNCI_GAGAL, JSON.stringify(g)); return g; }
  function hapusGagal() { localStorage.removeItem(KUNCI_GAGAL); }

  /* ---------------------------------------------------------- tampilan */
  var wadah = null, mode = 'masuk', pesan = '', sibuk = false, pengguna = null;
  function gaya() {
    var s = document.createElement('style');
    s.textContent = '#adm-gerbang{position:fixed;inset:0;z-index:9999;background:var(--color-bg,#f4f7f6);display:flex;align-items:center;justify-content:center;padding:24px}' +
      '#adm-gerbang .kotak{width:100%;max-width:400px;background:#fff;border-radius:24px;padding:28px 26px;box-shadow:0 20px 60px rgba(0,0,0,.12);display:flex;flex-direction:column;gap:14px}' +
      '#adm-gerbang h2{margin:0;font-size:22px}#adm-gerbang .sub{font-size:13px;opacity:.7;line-height:1.45}' +
      '#adm-gerbang label{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;opacity:.6;margin-bottom:6px}' +
      '#adm-gerbang input{width:100%;box-sizing:border-box;height:44px;border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:0 14px;font:inherit;font-size:14px}' +
      '#adm-gerbang .btn{height:46px;border:0;border-radius:16px;background:var(--color-accent,#009183);color:#fff;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer}' +
      '#adm-gerbang .btn[disabled]{opacity:.5;cursor:default}#adm-gerbang .tautan{background:none;border:0;color:var(--color-accent,#009183);font:inherit;font-size:13px;cursor:pointer;padding:0}' +
      '#adm-gerbang .galat{background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px;font-size:13px}#adm-gerbang .info{background:#e6f5f3;color:#0b5e55;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.45}' +
      'body.adm-terkunci > *:not(#adm-gerbang){filter:blur(6px);pointer-events:none;user-select:none}' +
      '#adm-keluar{position:fixed;right:18px;bottom:18px;z-index:9000;height:38px;padding:0 16px;border:0;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.14);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;color:#333}';
    document.head.appendChild(s);
  }
  function kunci() { document.body.classList.add('adm-terkunci'); }
  function buka() { document.body.classList.remove('adm-terkunci'); }
  function gambar() {
    if (!wadah) { wadah = document.createElement('div'); wadah.id = 'adm-gerbang'; document.body.appendChild(wadah); }
    var h = '<div class="kotak"><div><h2>Konsol admin EXOCLEAN</h2><div class="sub">';
    if (!subtle) {
      h += 'Konsol ini hanya boleh dibuka lewat <b>HTTPS</b> atau <b>localhost</b>. Peramban tidak menyediakan kriptografi di alamat yang tidak aman, dan gerbang ini menolak bekerja tanpanya.</div></div></div>';
      wadah.innerHTML = h; kunci(); return;
    }
    var sampai = terkunciSampai();
    if (mode === 'bootstrap') h += 'Belum ada akun admin di perangkat ini. Buat akun pertama — sandi minimal 10 karakter.';
    else if (mode === 'ganti') h += 'Sandi Anda masih sandi bawaan data contoh. Ganti sekarang sebelum melanjutkan.';
    else h += 'Masuk dengan akun admin. Sesi berakhir setelah ' + SESI_MENIT + ' menit tanpa aktivitas.';
    h += '</div></div>';
    if (pesan) h += '<div class="galat">' + esc(pesan) + '</div>';
    if (sampai) h += '<div class="galat">Terlalu banyak percobaan. Terkunci sampai ' + new Date(sampai).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) + '.</div>';
    h += '<form id="adm-form" autocomplete="off">';
    if (mode === 'bootstrap') h += '<div><label>Nama</label><input name="nama" required maxlength="80"></div>';
    if (mode !== 'ganti') h += '<div><label>Email</label><input name="email" type="email" required autocomplete="username" maxlength="120"></div>';
    if (mode === 'ganti') h += '<div><label>Sandi saat ini</label><input name="lama" type="password" required autocomplete="current-password"></div>';
    h += '<div><label>' + (mode === 'masuk' ? 'Sandi' : 'Sandi baru') + '</label><input name="sandi" type="password" required minlength="' + (mode === 'masuk' ? 1 : 10) + '" autocomplete="' + (mode === 'masuk' ? 'current-password' : 'new-password') + '"></div>';
    if (mode !== 'masuk') h += '<div><label>Ulangi sandi baru</label><input name="ulang" type="password" required autocomplete="new-password"></div>';
    h += '<div style="margin-top:6px"><button class="btn" style="width:100%"' + (sibuk || sampai ? ' disabled' : '') + '>' + (sibuk ? 'Memeriksa…' : mode === 'masuk' ? 'Masuk' : mode === 'ganti' ? 'Simpan sandi baru' : 'Buat akun admin') + '</button></div></form>';
    h += '<div class="info">Gerbang ini melindungi dari akses sembarangan di peramban. Untuk produksi, batasi juga halaman admin di server (allowlist IP + autentikasi di nginx) — lihat app/server/KEAMANAN.md.</div></div>';
    wadah.innerHTML = h; kunci();
    var f = document.getElementById('adm-form'); if (f) f.addEventListener('submit', kirim);
  }
  function selesai(u) {
    pengguna = u; buatSesi(u); hapusGagal(); pesan = '';
    if (wadah) { wadah.remove(); wadah = null; }
    buka(); tombolKeluar();
    if (window.ADMIN && ADMIN.gambar) { try { ADMIN.gambar(); } catch (e) { /* abaikan */ } }
    if (window.ADMIN && ADMIN.sekilas) { try { ADMIN.sekilas('Masuk sebagai ' + u.nama + ' · sesi ' + SESI_MENIT + ' menit'); } catch (e) { /* abaikan */ } }
  }
  function kirim(ev) {
    ev.preventDefault(); if (sibuk) return;
    var f = ev.target, d = db();
    var email = String(f.email ? f.email.value : '').trim().toLowerCase(), sandi = String(f.sandi.value);
    sibuk = true; pesan = ''; gambar();
    var janji;
    if (mode === 'bootstrap') {
      if (sandi.length < 10 || sandi !== f.ulang.value) { pesan = 'Sandi minimal 10 karakter dan harus sama dua kali.'; sibuk = false; gambar(); return; }
      janji = buatHash(sandi).then(function (h) {
        var u = d.insert('users', { role:'admin', nama:String(f.nama.value).trim().slice(0, 80), jabatan:'Super Admin', peran:'superadmin', email:email, passHash:h, aktif:true, sumber:'gerbang', createdAt:new Date().toISOString() });
        catat('Akun admin pertama dibuat lewat gerbang', email, u.id); selesai(u);
      });
    } else if (mode === 'ganti') {
      var lama = String(f.lama.value);
      janji = periksaHash(lama, pengguna.passHash).then(function (ok) {
        if (!ok) { pesan = 'Sandi saat ini salah.'; return; }
        if (sandi.length < 10 || sandi !== f.ulang.value) { pesan = 'Sandi baru minimal 10 karakter dan harus sama dua kali.'; return; }
        if (sandi === lama) { pesan = 'Sandi baru tidak boleh sama dengan yang lama.'; return; }
        return buatHash(sandi).then(function (h) { d.update('users', pengguna.id, { passHash:h, pass:null, sandiBawaan:false, sandiDigantiAt:new Date().toISOString() }); catat('Sandi admin diganti', '', pengguna.id); pengguna.passHash = h; selesai(pengguna); });
      });
    } else {
      if (terkunciSampai()) { sibuk = false; gambar(); return; }
      var u = admins().filter(function (x) { return String(x.email || '').toLowerCase() === email; })[0];
      janji = (u && u.passHash ? periksaHash(sandi, u.passHash) : new Promise(function (r) { setTimeout(function () { r(false); }, 400); })).then(function (ok) {
        if (!ok) { var g = catatGagal(); catat('Login admin gagal', email + ' · percobaan ' + g.n); pesan = 'Email atau sandi salah.' + (g.n >= MAKS_GAGAL ? '' : ' Sisa ' + (MAKS_GAGAL - g.n) + ' percobaan.'); return; }
        catat('Login admin', email, u.id);
        if (u.sandiBawaan) { pengguna = u; mode = 'ganti'; pesan = ''; return; }
        selesai(u);
      });
    }
    janji.catch(function (e) { pesan = 'Gagal: ' + (e && e.message || e); }).then(function () { sibuk = false; if (wadah) gambar(); });
  }
  function tombolKeluar() {
    if (document.getElementById('adm-keluar')) return;
    var b = document.createElement('button'); b.id = 'adm-keluar'; b.type = 'button';
    b.textContent = 'Keluar · ' + (pengguna ? pengguna.nama.split(' ')[0] : 'admin');
    b.addEventListener('click', function () { catat('Logout admin', '', pengguna && pengguna.id); hapusSesi(); location.reload(); });
    document.body.appendChild(b);
  }
  function jagaSesi() {
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { if (!wadah) segarkan(); }, { passive:true }); });
    setInterval(function () { if (!wadah && !sesi()) { catat('Sesi admin berakhir (idle)', '', pengguna && pengguna.id); location.reload(); } }, 30000);
  }

  /* ---------------------------------------------------------- mulai */
  function mulai() {
    gaya();
    var s = sesi();
    if (s) { var u = admins().filter(function (x) { return x.id === s.id; })[0]; if (u) { pengguna = u; buka(); tombolKeluar(); jagaSesi(); if (window.ADMIN && ADMIN.gambar) { try { ADMIN.gambar(); } catch (e) { /* abaikan */ } } return; } hapusSesi(); }
    kunci();
    migrasi().then(function () { mode = admins().length ? 'masuk' : 'bootstrap'; gambar(); jagaSesi(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  /* ---------------------------------------------------------- PIN transaksi
     Enam angka, terpisah dari sandi masuk, disimpan sebagai PBKDF2 di baris
     admin (pinHash). Dipakai untuk menyetujui perubahan yang berdampak ke
     lapangan (menerbitkan SOP, dsb.). Membuat/mengganti PIN wajib memasukkan
     sandi masuk. Lima kali salah → terkunci 15 menit (dicatat di baris
     admin, jadi berlaku di semua peramban yang memakai basis data ini). */
  var PIN_MAKS_GAGAL = 5, PIN_KUNCI_MENIT = 15;
  function adminKini() { var s = sesi(); if (!s) return null; var d = db(); return d ? d.find('users', s.id) : null; }
  function mintaPin(alasan, opsi) {
    opsi = opsi || {};
    return new Promise(function (selesaiJanji) {
      var u = adminKini();
      if (!u) { selesaiJanji(false); return; }
      if (!subtle) { alert('PIN butuh HTTPS atau localhost.'); selesaiJanji(false); return; }
      var kotak = document.createElement('div'); kotak.id = 'adm-pin';
      kotak.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(20,30,28,.45);display:flex;align-items:center;justify-content:center;padding:24px';
      document.body.appendChild(kotak);
      var st = { mode: u.pinHash ? 'masuk' : 'buat', pesan:'', sibuk:false, passkey: !!(u.passkey && window.PublicKeyCredential) };
      function tutup(hasil) { kotak.remove(); selesaiJanji(hasil); }
      function kunciSampai() { return u.pinKunciSampai && u.pinKunciSampai > Date.now() ? u.pinKunciSampai : 0; }
      function gambarPin() {
        var k = kunciSampai();
        var h = '<div class="kotak" style="width:100%;max-width:380px;background:#fff;border-radius:24px;padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:12px">' +
          '<div><h2 style="margin:0;font-size:20px">' + (st.mode === 'masuk' ? 'PIN persetujuan' : 'Buat PIN persetujuan') + '</h2><div style="font-size:13px;opacity:.7;line-height:1.45;margin-top:4px">' + esc(alasan || 'Perubahan ini butuh persetujuan PIN Anda.') +
          (st.mode === 'buat' ? ' Anda belum punya PIN — buat 6 angka, dikonfirmasi dengan sandi masuk.' : '') + '</div></div>';
        if (st.pesan) h += '<div style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px;font-size:13px">' + esc(st.pesan) + '</div>';
        if (k) h += '<div style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px;font-size:13px">PIN terkunci sampai ' + new Date(k).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) + ' setelah ' + PIN_MAKS_GAGAL + ' kali salah.</div>';
        h += '<form id="adm-pin-form" autocomplete="off" style="display:flex;flex-direction:column;gap:10px">';
        if (st.mode === 'buat') h += '<div><label style="display:block;font-size:11.5px;text-transform:uppercase;opacity:.6;margin-bottom:6px">Sandi masuk</label><input class="input" name="sandi" type="password" required autocomplete="current-password"></div>' +
          '<div><label style="display:block;font-size:11.5px;text-transform:uppercase;opacity:.6;margin-bottom:6px">PIN baru (6 angka)</label><input class="input" name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required type="password"></div>' +
          '<div><label style="display:block;font-size:11.5px;text-transform:uppercase;opacity:.6;margin-bottom:6px">Ulangi PIN</label><input class="input" name="ulang" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required type="password"></div>';
        else h += (opsi.sandiJuga ? '<div style="background:#e6f5f3;color:#0b5e55;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.45">Sesi Anda sudah lebih dari 15 menit — aksi berdampak tinggi meminta sandi masuk lagi, bukan hanya PIN.</div><div><label style="display:block;font-size:11.5px;text-transform:uppercase;opacity:.6;margin-bottom:6px">Sandi masuk</label><input class="input" name="sandi" type="password" required autocomplete="current-password"></div>' : '') +
          (st.passkey ? '<button type="button" class="btn btn-secondary" id="adm-pin-passkey" style="height:44px">🔐 Setujui dengan passkey (sidik jari / wajah)</button><div style="text-align:center;font-size:11.5px;opacity:.6">atau pakai PIN</div>' : '') +
          '<div><label style="display:block;font-size:11.5px;text-transform:uppercase;opacity:.6;margin-bottom:6px">PIN 6 angka</label><input class="input" name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required type="password" autofocus style="letter-spacing:.4em;font-size:20px;text-align:center"></div>';
        h += '<div style="display:flex;gap:8px;margin-top:4px"><button type="button" class="btn btn-secondary" style="flex:1;height:44px" id="adm-pin-batal">Batal</button><button class="btn btn-primary" style="flex:2;height:44px"' + (st.sibuk || k ? ' disabled' : '') + '>' + (st.sibuk ? 'Memeriksa…' : st.mode === 'buat' ? 'Simpan PIN & setujui' : 'Setujui') + '</button></div>' +
          (st.mode === 'masuk' ? '<button type="button" class="tautan" id="adm-pin-ganti" style="background:none;border:0;color:var(--color-accent,#009183);font:inherit;font-size:12.5px;cursor:pointer">Lupa PIN? Buat ulang dengan sandi masuk</button>' : '') + '</form></div>';
        kotak.innerHTML = h;
        document.getElementById('adm-pin-batal').addEventListener('click', function () { tutup(false); });
        var g = document.getElementById('adm-pin-ganti'); if (g) g.addEventListener('click', function () { st.mode = 'buat'; st.pesan = ''; gambarPin(); });
        var pk = document.getElementById('adm-pin-passkey'); if (pk) pk.addEventListener('click', function () { st.sibuk = true; gambarPin(); verifikasiPasskey(u).then(function (ok) { st.sibuk = false; if (ok) { catat('Persetujuan lewat passkey', alasan, u.id); tutup(true); } else { st.pesan = 'Passkey tidak terverifikasi — pakai PIN.'; gambarPin(); } }); });
        document.getElementById('adm-pin-form').addEventListener('submit', kirimPin);
        var f = kotak.querySelector('input'); if (f) f.focus();
      }
      function kirimPin(ev) {
        ev.preventDefault(); if (st.sibuk) return;
        var f = ev.target, d = db(), pin = String(f.pin.value).replace(/\D/g, '');
        if (pin.length !== 6) { st.pesan = 'PIN harus 6 angka.'; gambarPin(); return; }
        st.sibuk = true; st.pesan = ''; gambarPin();
        var janji;
        if (st.mode === 'buat') {
          if (pin !== String(f.ulang.value)) { st.pesan = 'PIN tidak sama dua kali.'; st.sibuk = false; gambarPin(); return; }
          if (/^(\d)\1{5}$/.test(pin) || pin === '123456' || pin === '654321') { st.pesan = 'PIN terlalu mudah ditebak.'; st.sibuk = false; gambarPin(); return; }
          janji = periksaHash(String(f.sandi.value), u.passHash).then(function (ok) {
            if (!ok) { st.pesan = 'Sandi masuk salah.'; return false; }
            return buatHash(pin).then(function (h) { u = d.update('users', u.id, { pinHash:h, pinGagal:0, pinKunciSampai:0, pinDibuatAt:new Date().toISOString() }); catat('PIN persetujuan dibuat/diganti', '', u.id); return true; });
          });
        } else {
          if (kunciSampai()) { st.sibuk = false; gambarPin(); return; }
          var cekSandi = opsi.sandiJuga ? periksaHash(String(f.sandi.value), u.passHash) : Promise.resolve(true);
          janji = cekSandi.then(function (sandiOk) {
            if (!sandiOk) { st.pesan = 'Sandi masuk salah.'; catat('Autentikasi ulang gagal', alasan, u.id); return false; }
            return periksaHash(pin, u.pinHash);
          }).then(function (ok) {
            if (ok === false && st.pesan) return false;
            if (ok) { if (u.pinGagal) d.update('users', u.id, { pinGagal:0 }); return true; }
            var n = (u.pinGagal || 0) + 1, patch = { pinGagal:n }; if (n >= PIN_MAKS_GAGAL) patch.pinKunciSampai = Date.now() + PIN_KUNCI_MENIT * 60000;
            u = d.update('users', u.id, patch); catat('PIN persetujuan salah', alasan + ' · percobaan ' + n, u.id);
            st.pesan = 'PIN salah.' + (n >= PIN_MAKS_GAGAL ? '' : ' Sisa ' + (PIN_MAKS_GAGAL - n) + ' percobaan.'); return false;
          });
        }
        janji.catch(function (e) { st.pesan = 'Gagal: ' + (e && e.message || e); return false; }).then(function (ok) { st.sibuk = false; if (ok) { catat('PIN persetujuan diverifikasi', alasan, u.id); tutup(true); } else gambarPin(); });
      }
      gambarPin();
    });
  }
  /* ---------------------------------------------------------- passkey (WebAuthn)
     Sidik jari / wajah di perangkat penyetuju: tidak bisa diintip atau
     dibagikan. Kunci publik (SPKI, ES256) disimpan di baris admin; tanda
     tangan diverifikasi di peramban ini lewat WebCrypto atas
     authenticatorData || SHA-256(clientDataJSON), dengan tantangan acak yang
     dicocokkan kembali. Tanpa server, verifikasi ini melindungi dari orang di
     depan layar, bukan dari orang yang memegang DevTools — sama seperti PIN. */
  function acak(n) { return window.crypto.getRandomValues(new Uint8Array(n)); }
  function b64u(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dariB64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function daftarPasskey() {
    var u = adminKini(); if (!u) return Promise.resolve({ ok:false, pesan:'Belum masuk' });
    if (!window.PublicKeyCredential) return Promise.resolve({ ok:false, pesan:'Peramban ini tidak mendukung passkey' });
    var idPengguna = new TextEncoder().encode(u.id).slice(0, 64);
    return navigator.credentials.create({ publicKey: { challenge:acak(32), rp:{ name:'EXOCLEAN Admin' }, user:{ id:idPengguna, name:u.email || u.nama, displayName:u.nama },
      pubKeyCredParams:[{ type:'public-key', alg:-7 }], authenticatorSelection:{ authenticatorAttachment:'platform', userVerification:'required', residentKey:'preferred' }, timeout:60000, attestation:'none' } })
      .then(function (cred) {
        var resp = cred.response, spki = resp.getPublicKey ? resp.getPublicKey() : null;
        if (!spki) throw new Error('Peramban tidak memberikan kunci publik');
        var d = db(); d.update('users', u.id, { passkey:{ id:b64u(cred.rawId), spki:b64u(spki), alg:resp.getPublicKeyAlgorithm ? resp.getPublicKeyAlgorithm() : -7, at:new Date().toISOString() } });
        catat('Passkey didaftarkan', '', u.id); return { ok:true };
      }).catch(function (e) { return { ok:false, pesan:e && e.message || String(e) }; });
  }
  function verifikasiPasskey(u) {
    if (!u.passkey || !window.PublicKeyCredential || !subtle) return Promise.resolve(false);
    var tantangan = acak(32);
    return navigator.credentials.get({ publicKey:{ challenge:tantangan, allowCredentials:[{ type:'public-key', id:dariB64u(u.passkey.id) }], userVerification:'required', timeout:60000 } }).then(function (cred) {
      var r = cred.response, cd = JSON.parse(new TextDecoder().decode(r.clientDataJSON));
      if (cd.type !== 'webauthn.get' || cd.challenge !== b64u(tantangan) || cd.origin !== location.origin) return false;
      var authData = new Uint8Array(r.authenticatorData); if (!(authData[32] & 0x04)) return false;   /* UV: pengguna diverifikasi */
      return subtle.digest('SHA-256', r.clientDataJSON).then(function (hashCd) {
        var data = new Uint8Array(authData.length + 32); data.set(authData, 0); data.set(new Uint8Array(hashCd), authData.length);
        return subtle.importKey('spki', dariB64u(u.passkey.spki), { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']).then(function (kunci) {
          return subtle.verify({ name:'ECDSA', hash:'SHA-256' }, kunci, derKeRaw(new Uint8Array(r.signature)), data);
        });
      });
    }).catch(function () { return false; });
  }
  /* tanda tangan ECDSA dari WebAuthn berbentuk DER; WebCrypto minta r||s mentah */
  function derKeRaw(der) {
    var i = 2, rLen = der[i + 1], r = der.slice(i + 2, i + 2 + rLen); i = i + 2 + rLen; var sLen = der[i + 1], s = der.slice(i + 2, i + 2 + sLen);
    function pad(x) { x = x[0] === 0 && x.length > 32 ? x.slice(1) : x; var o = new Uint8Array(32); o.set(x, 32 - x.length); return o; }
    var out = new Uint8Array(64); out.set(pad(r), 0); out.set(pad(s), 32); return out;
  }
  function hapusPasskey() { var u = adminKini(); if (!u) return; db().update('users', u.id, { passkey:null }); catat('Passkey dihapus', '', u.id); }
  window.EXO_ADMIN_AUTH = { buatHash:buatHash, periksaHash:periksaHash, sesi:sesi, pengguna:adminKini, mintaPin:mintaPin, daftarPasskey:daftarPasskey, hapusPasskey:hapusPasskey, keluar:function () { hapusSesi(); location.reload(); } };
})();
