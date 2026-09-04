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
    var polos = d.where('users', function (u) { return u.role === 'admin' && u.pass && !u.passHash; });
    return Promise.all(polos.map(function (u) {
      return buatHash(String(u.pass)).then(function (h) { d.update('users', u.id, { passHash:h, pass:null, sandiBawaan: String(u.pass) === '123456' }); });
    }));
  }
  function catat(aksi, detail, actorId) { var d = db(); if (d && d.log) d.log(actorId || null, aksi, 'auth', null, detail || ''); }

  /* ---------------------------------------------------------- sesi */
  function sesi() { try { var s = JSON.parse(sessionStorage.getItem(KUNCI_SESI) || 'null'); return s && s.sampai > Date.now() ? s : null; } catch (e) { return null; } }
  function buatSesi(u) { var s = { id:u.id, nama:u.nama, email:u.email, sampai:Date.now() + SESI_MENIT * 60000 }; sessionStorage.setItem(KUNCI_SESI, JSON.stringify(s)); return s; }
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
        var u = d.insert('users', { role:'admin', nama:String(f.nama.value).trim().slice(0, 80), jabatan:'Super Admin', email:email, passHash:h, aktif:true, sumber:'gerbang', createdAt:new Date().toISOString() });
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
    if (s) { var u = admins().filter(function (x) { return x.id === s.id; })[0]; if (u) { pengguna = u; buka(); tombolKeluar(); jagaSesi(); return; } hapusSesi(); }
    kunci();
    migrasi().then(function () { mode = admins().length ? 'masuk' : 'bootstrap'; gambar(); jagaSesi(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.EXO_ADMIN_AUTH = { buatHash:buatHash, periksaHash:periksaHash, sesi:sesi, keluar:function () { hapusSesi(); location.reload(); } };
})();
