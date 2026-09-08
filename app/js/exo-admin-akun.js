/* ==========================================================================
   exo-admin-akun.js — konsol admin: kelola pengguna & sandi (unit IT)
   --------------------------------------------------------------------------
   Menu IT → Admins & akun. Admin IT (super admin, atau supervisor berunit IT)
   dapat:
     · mengubah data pengguna: nama, email masuk, jabatan;
     · mereset sandi: sandi sementara (acak atau diketik) → pengguna WAJIB
       mengganti saat masuk pertama (sandiBawaan);
     · mereset PIN persetujuan (pengguna membuat PIN baru dengan sandinya);
     · menonaktifkan / mengaktifkan akun.
   Batas: supervisor IT tidak bisa menyentuh akun super admin; tidak ada yang
   bisa menonaktifkan dirinya sendiri atau super admin aktif terakhir.
   Setiap aksi = PIN (sesi > 15 menit minta sandi lagi) + catatan audit.
   Setiap pengguna juga bisa mengganti sandinya sendiri (sandi lama + baru).
   Sandi tidak pernah ditampilkan ulang setelah formulir ditutup.
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, tabel = A.tabel;
  function saya() { return window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna ? EXO_ADMIN_AUTH.pengguna() : null; }
  function peran(u) { return window.EXO_PERSETUJUAN ? EXO_PERSETUJUAN.peranDari(u) : (u && u.peran) || 'staf'; }
  function namaPeran(p) { return { staf:'Staf', supervisor:'Supervisor', superadmin:'Super admin' }[p] || p; }
  function adminIT(u) { u = u || saya(); if (!u) return false; var pr = peran(u); return pr === 'superadmin' || (pr === 'supervisor' && A.unitKini(u).indexOf('it') >= 0); }
  /* Boleh mengelola akun `target`? Tanpa target: boleh membuka fitur kelola sama sekali. */
  function bolehKelola(u, target) { u = u || saya(); if (!adminIT(u)) return false; if (!target) return true; if (peran(u) === 'superadmin') return true; return peran(target) !== 'superadmin'; }
  function opsiTinggi() { var s = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.sesi(); return { sandiJuga: window.EXO_PERSETUJUAN && EXO_PERSETUJUAN.butuhSesiUlang(s, { tingkat:'tinggi' }) }; }
  function denganPin(alasan, kerja) {
    if (!saya()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; }
    EXO_ADMIN_AUTH.mintaPin(alasan, opsiTinggi()).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui, tidak ada yang berubah.', 'err'); A.gambar(); return; } try { var r = kerja({ id:saya().id, nama:saya().nama }); if (r && r.then) r.then(function () { A.gambar(); }); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); });
  }
  function audit(oleh, judul, ref, detail) { if (window.EXO_PERSETUJUAN && EXO_PERSETUJUAN.audit) EXO_PERSETUJUAN.audit(oleh, judul, ref, detail); }
  function akun() { return window.EXO_DB ? EXO_DB.where('users', function (u) { return u.role === 'admin'; }) : []; }
  function superadminAktif() { return akun().filter(function (u) { return u.aktif !== false && peran(u) === 'superadmin'; }).length; }
  function tgl(iso) { return iso ? String(iso).slice(0, 10) : '—'; }
  function sandiAcak() { var abjad = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', b = window.crypto.getRandomValues(new Uint8Array(12)), s = ''; for (var i = 0; i < b.length; i++) s += abjad[b[i] % abjad.length]; return s; }
  function emailSah(e) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e); }

  /* ------------------------------------------------------------ tampilan */
  function kartuKelola() {
    var me = saya(); if (!me || !bolehKelola(me)) return '';
    var daftar = akun();
    var h = '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Pengguna & sandi (IT)</div><div class="t-115 o-6">Ubah nama/email/jabatan, reset sandi (sandi sementara wajib diganti saat masuk pertama), reset PIN, nonaktifkan akun. Setiap aksi: PIN + catatan audit. ' + (peran(me) === 'superadmin' ? 'Anda super admin — semua akun bisa dikelola.' : 'Anda supervisor IT — akun super admin tidak bisa disentuh.') + '</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('akunSandiSayaBuka') + '>Ganti sandi saya</button></div>' +
      tabel(['Nama', 'Email masuk', 'Jabatan', 'Peran', 'Sandi', 'PIN', 'Status', ''], daftar.map(function (u) {
        var boleh = bolehKelola(me, u), diri = me.id === u.id;
        var sandi = u.sandiBawaan ? chip('flat', 'sementara · wajib ganti') : chip('green', 'diganti ' + tgl(u.sandiDigantiAt || u.createdAt));
        var tombol = boleh ? '<div class="flex gap-4 wrap"><button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('akunKelola', u.id) + '>Kelola</button>' +
          (diri ? '' : '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('akunKelola', u.id + ':sandi') + '>Reset sandi</button>' +
          (u.pinHash ? '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('akunPinReset', u.id) + '>Reset PIN</button>' : '') +
          '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('akunSaklar', u.id) + '>' + (u.aktif === false ? 'Aktifkan' : 'Nonaktifkan') + '</button>') + '</div>' : '<span class="t-11 o-6">—</span>';
        return ['<b>' + esc(u.nama) + '</b>' + (diri ? ' <span class="o-6">(Anda)</span>' : ''), '<span class="t-12">' + esc(u.email || '—') + '</span>', '<span class="t-12">' + esc(u.jabatan || '—') + '</span>', chip(peran(u) === 'superadmin' ? 'accent' : peran(u) === 'supervisor' ? 'green' : 'flat', namaPeran(peran(u))), sandi, u.pinHash ? chip('green', 'ada') : chip('flat', 'belum'), chip(u.aktif === false ? 'flat' : 'green', u.aktif === false ? 'nonaktif' : 'aktif'), tombol];
      })) + '</div>';
    return h + formKelola() + formSandiSaya();
  }
  function formKelola() {
    var f = S.akunKelola; if (!f) return '';
    var u = EXO_DB.find('users', f.id); if (!u) { S.akunKelola = null; return ''; }
    var h = '<div class="card elev-sm gap-10" id="akun-kelola"><div class="card-title">Kelola akun · ' + esc(u.nama) + ' <span class="o-6 t-12">' + esc(namaPeran(peran(u))) + '</span></div>';
    h += '<div class="grid g3" style="gap:8px"><div class="field"><label>Nama</label><input class="input" value="' + esc(f.nama) + '" data-ubah="akunKelolaUbah" data-arg="nama" maxlength="80"></div>' +
      '<div class="field"><label>Email masuk</label><input class="input" type="email" value="' + esc(f.email) + '" data-ubah="akunKelolaUbah" data-arg="email" maxlength="120"></div>' +
      '<div class="field"><label>Jabatan</label><input class="input" value="' + esc(f.jabatan) + '" data-ubah="akunKelolaUbah" data-arg="jabatan" maxlength="60" placeholder="mis. Staf Ops"></div></div>' +
      '<div class="flex gap-8"><button class="btn btn-primary" style="height:36px"' + aksi('akunKelolaSimpan') + '>Simpan data · PIN</button><button class="btn btn-secondary" style="height:36px"' + aksi('akunKelolaBatal') + '>Tutup</button></div>';
    if (u.id !== saya().id) {
      h += '<div style="border-top:1px solid var(--color-line,#e6ebe9);padding-top:12px"><div class="bold t-13">Reset sandi</div><div class="t-115 o-6 lh-15">Sandi sementara diberikan ke pengguna lewat jalur aman (bukan chat umum). Saat masuk pertama pengguna wajib menggantinya; sandi lama langsung tidak berlaku.</div>' +
        '<div class="flex gap-8 items-end wrap" style="margin-top:8px"><div class="field" style="min-width:260px"><label>Sandi sementara (min. 10 karakter)</label><input class="input" type="' + (f.tampil ? 'text' : 'password') + '" autocomplete="new-password" value="' + esc(f.sandi) + '" data-ubah="akunKelolaUbah" data-arg="sandi"></div>' +
        '<button class="btn btn-secondary" style="height:40px"' + aksi('akunSandiAcak') + '>Buat acak</button><button class="btn btn-secondary" style="height:40px"' + aksi('akunSandiTampil') + '>' + (f.tampil ? 'Sembunyikan' : 'Tampilkan') + '</button><button class="btn btn-primary" style="height:40px"' + aksi('akunSandiReset') + '>Reset sandi · PIN</button></div></div>';
    }
    if (f.pesan) h += '<div class="t-12" style="background:' + (f.ok ? '#e6f5f3;color:#0b5e55' : '#fdecec;color:#9b1c1c') + ';border-radius:12px;padding:10px 12px;white-space:pre-line">' + esc(f.pesan) + '</div>';
    return h + '</div>';
  }
  function formSandiSaya() {
    var f = S.akunSandiSaya; if (!f) return '';
    return '<div class="card elev-sm gap-10" id="akun-sandi-saya"><div class="card-title">Ganti sandi saya</div><div class="grid g3" style="gap:8px">' +
      '<div class="field"><label>Sandi lama</label><input class="input" type="password" autocomplete="current-password" value="' + esc(f.lama) + '" data-ubah="akunSandiSayaUbah" data-arg="lama"></div>' +
      '<div class="field"><label>Sandi baru (min. 10 karakter)</label><input class="input" type="password" autocomplete="new-password" value="' + esc(f.baru) + '" data-ubah="akunSandiSayaUbah" data-arg="baru"></div>' +
      '<div class="field"><label>Ulangi sandi baru</label><input class="input" type="password" autocomplete="new-password" value="' + esc(f.ulang) + '" data-ubah="akunSandiSayaUbah" data-arg="ulang"></div></div>' +
      (f.pesan ? '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(f.pesan) + '</div>' : '') +
      '<div class="flex gap-8"><button class="btn btn-primary" style="height:36px"' + aksi('akunSandiSayaSimpan') + '>Simpan sandi baru</button><button class="btn btn-secondary" style="height:36px"' + aksi('akunSandiSayaBatal') + '>Batal</button></div></div>';
  }
  var teamAsli = VIEW.team;
  VIEW.team = function () { return kartuKelola() + (teamAsli ? teamAsli() : ''); };

  /* ------------------------------------------------------------ aksi */
  AKSI.akunKelola = function (arg) { var p = String(arg).split(':'), u = EXO_DB.find('users', p[0]); if (!u || !bolehKelola(saya(), u)) { A.sekilas('Akun ini tidak bisa Anda kelola.', 'err'); return; } S.akunKelola = { id:u.id, nama:u.nama || '', email:u.email || '', jabatan:u.jabatan || '', sandi:'', tampil:false, pesan:'' }; setTimeout(function () { var el = document.getElementById('akun-kelola'); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 50); };
  AKSI.akunKelolaUbah = function (arg, v) { if (S.akunKelola) { S.akunKelola[arg] = v; S.akunKelola.pesan = ''; } };
  AKSI.akunKelolaBatal = function () { S.akunKelola = null; };
  AKSI.akunSandiAcak = function () { if (S.akunKelola) { S.akunKelola.sandi = sandiAcak(); S.akunKelola.tampil = true; } };
  AKSI.akunSandiTampil = function () { if (S.akunKelola) S.akunKelola.tampil = !S.akunKelola.tampil; };
  AKSI.akunKelolaSimpan = function () {
    var f = S.akunKelola; if (!f) return; var u = EXO_DB.find('users', f.id); if (!u || !bolehKelola(saya(), u)) return;
    var nama = String(f.nama || '').trim().slice(0, 80), email = String(f.email || '').trim().toLowerCase(), jabatan = String(f.jabatan || '').trim().slice(0, 60);
    if (!nama || !emailSah(email)) { f.pesan = 'Nama dan email yang sah wajib diisi.'; f.ok = false; return; }
    if (akun().some(function (x) { return x.id !== u.id && String(x.email || '').toLowerCase() === email; })) { f.pesan = 'Email ini sudah dipakai akun lain.'; f.ok = false; return; }
    var beda = []; if (nama !== u.nama) beda.push('nama ' + u.nama + ' → ' + nama); if (email !== String(u.email || '').toLowerCase()) beda.push('email ' + (u.email || '—') + ' → ' + email); if (jabatan !== (u.jabatan || '')) beda.push('jabatan ' + (u.jabatan || '—') + ' → ' + (jabatan || '—'));
    if (!beda.length) { f.pesan = 'Tidak ada yang berubah.'; f.ok = false; return; }
    denganPin('Ubah data akun ' + u.nama + ': ' + beda.join('; '), function (oleh) {
      EXO_DB.update('users', u.id, { nama:nama, email:email, jabatan:jabatan, diubahAt:new Date().toISOString(), diubahOleh:oleh.nama });
      audit(oleh, 'Ubah data akun ' + u.nama, u.id, beda.join('; '));
      f.nama = nama; f.email = email; f.jabatan = jabatan; f.pesan = 'Tersimpan: ' + beda.join('; ') + (email !== String(u.email || '').toLowerCase() ? '\nPengguna masuk dengan email baru mulai sekarang.' : ''); f.ok = true; A.sekilas('Data akun ' + nama + ' diperbarui.');
    });
  };
  AKSI.akunSandiReset = function () {
    var f = S.akunKelola; if (!f) return; var u = EXO_DB.find('users', f.id), me = saya(); if (!u || !bolehKelola(me, u)) return;
    if (u.id === me.id) { f.pesan = 'Ganti sandi Anda sendiri lewat tombol "Ganti sandi saya".'; f.ok = false; return; }
    var sandi = String(f.sandi || ''); if (sandi.length < 10) { f.pesan = 'Sandi sementara minimal 10 karakter — atau tekan "Buat acak".'; f.ok = false; return; }
    denganPin('Reset sandi akun ' + u.nama + ' (sandi lama tidak berlaku, wajib ganti saat masuk)', function (oleh) {
      return EXO_ADMIN_AUTH.buatHash(sandi).then(function (h) {
        EXO_DB.update('users', u.id, { passHash:h, pass:null, sandiBawaan:true, sandiDiresetAt:new Date().toISOString(), sandiDiresetOleh:oleh.nama });
        audit(oleh, 'Reset sandi akun ' + u.nama, u.id, 'sandi sementara diberikan · wajib ganti saat masuk pertama');
        f.pesan = 'Sandi ' + u.nama + ' direset. Sampaikan sandi sementara ini lewat jalur aman, lalu tutup formulir — sandi tidak akan ditampilkan lagi:\n' + sandi; f.ok = true; f.tampil = true; A.sekilas('Sandi ' + u.nama + ' direset · wajib diganti saat masuk pertama.');
      });
    });
  };
  AKSI.akunPinReset = function (id) {
    var u = EXO_DB.find('users', id), me = saya(); if (!u || !bolehKelola(me, u) || u.id === me.id) { A.sekilas('Akun ini tidak bisa Anda kelola.', 'err'); return; }
    denganPin('Reset PIN persetujuan ' + u.nama, function (oleh) { EXO_DB.update('users', u.id, { pinHash:null, pinGagal:0, pinKunciSampai:0, pinDiresetAt:new Date().toISOString() }); audit(oleh, 'Reset PIN persetujuan ' + u.nama, u.id, 'pengguna membuat PIN baru dengan sandi masuknya'); A.sekilas('PIN ' + u.nama + ' direset — ia membuat PIN baru saat aksi berikutnya.'); });
  };
  AKSI.akunSaklar = function (id) {
    var u = EXO_DB.find('users', id), me = saya(); if (!u || !bolehKelola(me, u)) { A.sekilas('Akun ini tidak bisa Anda kelola.', 'err'); return; }
    if (u.id === me.id) { A.sekilas('Anda tidak bisa menonaktifkan akun sendiri.', 'err'); return; }
    var nonaktifkan = u.aktif !== false;
    if (nonaktifkan && peran(u) === 'superadmin' && superadminAktif() <= 1) { A.sekilas('Super admin aktif terakhir tidak bisa dinonaktifkan.', 'err'); return; }
    denganPin((nonaktifkan ? 'Nonaktifkan' : 'Aktifkan kembali') + ' akun ' + u.nama, function (oleh) { EXO_DB.update('users', u.id, { aktif:!nonaktifkan, statusDiubahAt:new Date().toISOString(), statusDiubahOleh:oleh.nama }); audit(oleh, (nonaktifkan ? 'Nonaktifkan' : 'Aktifkan') + ' akun ' + u.nama, u.id, nonaktifkan ? 'tidak bisa masuk sampai diaktifkan lagi' : 'bisa masuk kembali'); A.sekilas('Akun ' + u.nama + (nonaktifkan ? ' dinonaktifkan.' : ' diaktifkan kembali.')); });
  };
  AKSI.akunSandiSayaBuka = function () { S.akunSandiSaya = { lama:'', baru:'', ulang:'', pesan:'' }; setTimeout(function () { var el = document.getElementById('akun-sandi-saya'); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 50); };
  AKSI.akunSandiSayaUbah = function (arg, v) { if (S.akunSandiSaya) { S.akunSandiSaya[arg] = v; S.akunSandiSaya.pesan = ''; } };
  AKSI.akunSandiSayaBatal = function () { S.akunSandiSaya = null; };
  AKSI.akunSandiSayaSimpan = function () {
    var f = S.akunSandiSaya, me = saya(); if (!f || !me) return; var u = EXO_DB.find('users', me.id); if (!u) return;
    if (f.baru.length < 10 || f.baru !== f.ulang) { f.pesan = 'Sandi baru minimal 10 karakter dan harus sama dua kali.'; return; }
    if (f.baru === f.lama) { f.pesan = 'Sandi baru tidak boleh sama dengan yang lama.'; return; }
    EXO_ADMIN_AUTH.periksaHash(f.lama, u.passHash).then(function (ok) {
      if (!ok) { f.pesan = 'Sandi lama salah.'; A.gambar(); return; }
      return EXO_ADMIN_AUTH.buatHash(f.baru).then(function (h) { EXO_DB.update('users', u.id, { passHash:h, pass:null, sandiBawaan:false, sandiDigantiAt:new Date().toISOString() }); audit({ id:u.id, nama:u.nama }, 'Ganti sandi sendiri', u.id, ''); S.akunSandiSaya = null; A.sekilas('Sandi Anda diganti.'); A.gambar(); });
    });
  };
  A.bolehKelolaAkun = bolehKelola;
})(ADMIN);
