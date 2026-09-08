/* ==========================================================================
   exo-admin-brankas.js — konsol admin: kartu "Brankas data pribadi" di menu
   IT → Keamanan
   --------------------------------------------------------------------------
   Status data-server (mode enkripsi, versi kunci, jumlah rekaman), ringkasan
   data pribadi di perangkat ini (sudah di brankas / masih tertunda), sesi
   admin brankas lewat OTP ke nomor yang terdaftar di ADMIN_TELP, migrasi
   manual, verifikasi rantai audit server, dan rotasi kunci (PIN + audit).
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip;
  var B = function () { return window.EXO_BRANKAS; };
  S.brankas = S.brankas || { telp:'', kode:'', tahap:'telp', pesan:'', audit:null, statistik:null };
  function denganPin(alasan, kerja) { if (!window.EXO_ADMIN_AUTH || !EXO_ADMIN_AUTH.pengguna()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(EXO_ADMIN_AUTH.pengguna()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function kartu() {
    if (!B()) return '';
    var r = B().ringkas(), f = S.brankas, sesi = r.sesi, sehat = r.sehat, info = r.info || {};
    var h = '<div class="card elev-sm gap-10"><div class="flex items-center gap-10"><div class="grow"><div class="card-title">Brankas data pribadi (server)</div><div class="t-115 o-6">Telepon, email, alamat, koordinat, NIK, NPWP, rekening, kontak darurat dienkripsi di data-server (AES-256-GCM amplop, kunci data per rekaman, kunci induk berversi, indeks buta HMAC). Di perangkat hanya tersisa versi tersamar.</div></div>' + chip(sehat ? 'green' : 'flat', sehat ? 'server aktif' : 'server tidak terjangkau') + '</div>';
    h += '<div class="grid g4" style="gap:10px">' + [['Mode', sehat ? esc(info.mode || 'aes-256-gcm') : '—'], ['Rekaman di server', sehat ? String(info.rekaman == null ? '—' : info.rekaman) : '—'], ['Di perangkat ini · di brankas', r.diBrankas + ' / ' + r.total], ['Masih tertunda di perangkat', String(r.tertunda)]].map(function (k) { return '<div class="card" style="background:var(--color-bg);padding:10px 12px"><div class="t-11 up o-6">' + k[0] + '</div><div class="bold t-14" style="margin-top:2px">' + k[1] + '</div></div>'; }).join('') + '</div>';
    if (sesi) {
      h += '<div class="flex items-center gap-8 wrap"><span class="tag" style="background:var(--color-accent-2-100);font-size:11px">Sesi brankas: ' + esc(sesi.sisi) + ' · sub ' + esc(String(sesi.sub).slice(0, 8)) + '… · berlaku sampai ' + esc(new Date(sesi.exp * 1000).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })) + '</span>' +
        '<button class="btn btn-primary" style="height:32px;font-size:12px"' + aksi('brankasMigrasi') + '>Pindahkan data tertunda ke brankas</button>' +
        (sesi.sisi === 'admin' ? '<button class="btn btn-secondary" style="height:32px;font-size:12px"' + aksi('brankasStatistik') + '>Statistik server</button><button class="btn btn-secondary" style="height:32px;font-size:12px"' + aksi('brankasAudit') + '>Verifikasi rantai audit</button><button class="btn btn-secondary" style="height:32px;font-size:12px"' + aksi('brankasPutar') + '>Putar kunci · PIN</button>' : '<span class="t-11 o-6">sesi bukan admin — statistik/rotasi tidak tersedia</span>') +
        '<button class="btn btn-ghost" style="height:32px;font-size:12px"' + aksi('brankasKeluar') + '>Keluar sesi</button></div>';
      if (S.brankas.statistik) h += '<div class="t-12" style="background:var(--color-bg);border-radius:12px;padding:10px 12px">Server: ' + esc(JSON.stringify(S.brankas.statistik)) + '</div>';
      if (S.brankas.audit) h += '<div class="t-12" style="background:' + (S.brankas.audit.ok ? '#e6f5f3;color:#0b5e55' : '#fdecec;color:#9b1c1c') + ';border-radius:12px;padding:10px 12px">Rantai audit server: ' + (S.brankas.audit.ok ? 'UTUH · ' + S.brankas.audit.jumlah + ' entri' : 'RUSAK di baris ' + S.brankas.audit.baris + ' — ' + esc(S.brankas.audit.sebab)) + '</div>';
    } else {
      h += '<div class="t-115 o-6">Tanpa sesi, data pribadi di perangkat ini hanya tampil tersamar. Masuk lewat OTP ke nomor admin yang terdaftar di <code>ADMIN_TELP</code> server.</div>' +
        '<div class="flex gap-8 items-end wrap"><div class="field" style="min-width:200px"><label>Nomor HP admin</label><input class="input" value="' + esc(f.telp) + '" data-ubah="brankasIsi" data-arg="telp" placeholder="08xxxxxxxxxx"' + (f.tahap === 'kode' ? ' disabled' : '') + '></div>' +
        (f.tahap === 'kode' ? '<div class="field" style="min-width:140px"><label>Kode OTP</label><input class="input" value="' + esc(f.kode) + '" data-ubah="brankasIsi" data-arg="kode" maxlength="6" inputmode="numeric"></div><button class="btn btn-primary" style="height:40px"' + aksi('brankasOtpPeriksa') + '>Masuk brankas</button><button class="btn btn-ghost" style="height:40px"' + aksi('brankasUlang') + '>Ganti nomor</button>' : '<button class="btn btn-primary" style="height:40px"' + aksi('brankasOtpKirim') + '>Kirim OTP</button>') + '</div>';
    }
    if (f.pesan) h += '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(f.pesan) + '</div>';
    if (r.migrasi) h += '<div class="t-11 o-6">Migrasi terakhir: ' + r.migrasi.selesai + ' / ' + r.migrasi.total + ' rekaman dipindahkan' + (r.migrasi.akhir ? ' · ' + esc(new Date(r.migrasi.akhir).toLocaleTimeString('id-ID')) : ' · berjalan…') + '</div>';
    return h + '</div><div class="spacer-14"></div>';
  }
  var asli = VIEW.keamanan;
  VIEW.keamanan = function () { return kartu() + (asli ? asli() : ''); };
  AKSI.brankasIsi = function (k, v) { S.brankas[k] = String(v || ''); S.brankas.pesan = ''; };
  AKSI.brankasUlang = function () { S.brankas.tahap = 'telp'; S.brankas.kode = ''; };
  AKSI.brankasOtpKirim = function () { var t = S.brankas.telp.replace(/\D/g, ''); if (t.length < 9) { S.brankas.pesan = 'Nomor tidak sah.'; return; } EXO_SERVER.otpKirim(t).then(function (r) { if (r.ok) { S.brankas.tahap = 'kode'; A.sekilas('OTP dikirim.'); } else S.brankas.pesan = r.offline ? 'auth-server tidak terjangkau.' : (r.error || 'Gagal mengirim OTP.'); A.gambar(); }); };
  AKSI.brankasOtpPeriksa = function () { EXO_SERVER.otpPeriksa(S.brankas.telp, S.brankas.kode, 'admin').then(function (r) { if (r.ok && r.data && r.data.sesi) { B().terimaSesi(r.data.sesi); S.brankas.tahap = 'telp'; S.brankas.kode = ''; S.brankas.pesan = ''; A.sekilas('Sesi brankas admin aktif — data dimuat dari server.'); if (window.EXO_PERSETUJUAN) EXO_PERSETUJUAN.audit(EXO_ADMIN_AUTH.pengguna(), 'Masuk sesi brankas admin', '', ''); } else S.brankas.pesan = r.ok ? ('Sesi tidak diterbitkan: ' + (r.data && r.data.sesiDitolak || 'SESI_SECRET belum diisi di server')) : (r.error || 'Kode salah.'); A.gambar(); }); };
  AKSI.brankasKeluar = function () { B().keluar(); S.brankas.statistik = null; S.brankas.audit = null; A.sekilas('Sesi brankas ditutup — teks polos dibuang dari memori.'); };
  AKSI.brankasMigrasi = function () { B().migrasi().then(function (r) { A.sekilas(r.dipindah + ' dari ' + (r.total || 0) + ' rekaman dipindahkan ke brankas' + (r.alasan ? ' (' + r.alasan + ')' : '') + '.'); A.gambar(); }); };
  AKSI.brankasStatistik = function () { EXO_SERVER.dataStatistik().then(function (r) { S.brankas.statistik = r.ok ? r.data : { error:r.error }; A.gambar(); }); };
  AKSI.brankasAudit = function () { EXO_SERVER.dataVerifikasiAudit().then(function (r) { S.brankas.audit = r.ok ? r.data.hasil : { ok:false, sebab:r.error }; A.gambar(); }); };
  AKSI.brankasPutar = function () { denganPin('Putar kunci brankas (bungkus ulang kunci data ke kunci induk aktif)', function (oleh) { EXO_SERVER.dataPutarKunci().then(function (r) { if (r.ok) { if (window.EXO_PERSETUJUAN) EXO_PERSETUJUAN.audit(oleh, 'Rotasi kunci brankas', '', r.data.dibungkusUlang + ' rekaman'); A.sekilas(r.data.dibungkusUlang + ' rekaman dibungkus ulang.'); } else A.sekilas('Gagal: ' + (r.error || ''), 'err'); A.gambar(); }); }); };
})(ADMIN);
