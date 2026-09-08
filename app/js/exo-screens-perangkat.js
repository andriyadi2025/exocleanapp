/* ==========================================================================
   exo-screens-perangkat.js — layar "Perangkat & aktivitas masuk" (semua sisi)
   --------------------------------------------------------------------------
   Daftar perangkat yang pernah masuk ke akun (dari auth-server), perangkat
   ini ditandai, cabut perangkat lain (PIN transaksi), riwayat masuk dengan
   penanda "perangkat baru", nama perangkat ini. Notifikasi login perangkat
   baru dikirim server lewat SMS/email; di aplikasi ditampilkan saat masuk.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  if (!window.EXO_PERANGKAT) return;
  K.perangkat = K.perangkat || { data:null, sibuk:false, pesan:'', nama:'' };
  function sisi() { return K.sisi === 'toko' ? 'toko' : K.sisi === 'partner' ? 'partner' : 'customer'; }
  function waktu(iso) { return esc(String(iso || '').slice(0, 16).replace('T', ' ')); }
  function muat() { K.perangkat.sibuk = true; EXO_SERVER.perangkatDaftar().then(function (r) { K.perangkat.sibuk = false; K.perangkat.data = r.ok ? r.data : { offline:!!r.offline, perluSesi:!!r.perluSesi, error:r.error }; X.gambar(); }); }
  X.LAYAR.perangkat = function () {
    var p = K.perangkat, d = p.data, kembali = sisi() === 'toko' ? 'tprofil' : 'profile';
    if (!d && !p.sibuk) setTimeout(muat, 0);
    var h = '<div class="screen">' + X.kepala('Perangkat & aktivitas masuk', 'Notifikasi login baru · sesi terikat kunci perangkat', kembali) + '<div class="stack gap-12 pad-x18" style="padding-bottom:40px">';
    if (!d) return h + '<div class="card elev-sm"><div class="t-125 o-6">Memuat dari server…</div></div></div></div>';
    if (d.offline || d.perluSesi) return h + '<div class="card elev-sm gap-8"><div class="bold t-14">' + (d.perluSesi ? 'Masuk dulu lewat OTP' : 'Server autentikasi tidak terjangkau') + '</div><div class="t-12 o-6 lh-15">Daftar perangkat dan riwayat masuk disimpan di auth-server dan terikat ke akun yang sudah masuk.</div><button class="btn btn-secondary" style="height:36px"' + aksi('perangkatMuat') + '>Coba lagi</button></div></div></div>';
    h += '<div class="card elev-sm gap-8"><div class="bold t-14">Perangkat ini</div><div class="t-12 o-6 lh-15">Sesi Anda hanya berlaku bersama kunci rahasia yang tersimpan di perangkat ini — sesi yang disalin ke perangkat lain ditolak server.</div><div class="flex gap-8"><input class="input" style="flex:1" placeholder="nama perangkat (mis. HP Dewi)" value="' + esc(p.nama) + '" data-ubah="perangkatNama"><button class="btn btn-secondary" style="height:40px"' + aksi('perangkatSimpanNama') + '>Simpan</button></div></div>';
    h += '<div class="card elev-sm gap-6"><div class="bold t-14">Perangkat yang pernah masuk (' + (d.daftar || []).length + ')</div>' + ((d.daftar || []).length ? d.daftar.map(function (x) { var kini = x.id === d.kini; return '<div class="row row-xs"><span style="font-size:20px">' + (/Android|iOS/.test(x.platform || '') ? '📱' : '💻') + '</span><span class="row-main"><b style="font-size:12.5px">' + esc(x.nama || 'Perangkat') + (kini ? ' <span class="tag tag-accent" style="font-size:10px">perangkat ini</span>' : '') + (x.dicabutAt ? ' <span class="tag" style="font-size:10px;background:#fde2e7">dicabut</span>' : '') + '</b><span>pertama ' + waktu(x.pertamaAt) + ' · terakhir ' + waktu(x.terakhirAt) + '</span></span>' + (!kini && !x.dicabutAt ? '<button class="pill pill-sm"' + aksi('perangkatCabut', x.id) + '>Cabut</button>' : '') + '</div>'; }).join('') : '<div class="t-12 o-6">Belum ada.</div>') + '<div class="t-11 o-6">Mencabut perangkat memutus sesinya dan memaksa OTP (dan 2FA bila aktif) saat masuk lagi. Butuh PIN transaksi.</div></div>';
    h += '<div class="card elev-sm gap-6"><div class="bold t-14">Riwayat masuk</div>' + ((d.riwayat || []).length ? d.riwayat.slice(0, 20).map(function (r) { return '<div class="row row-xs"><span class="row-main"><b style="font-size:12.5px">' + esc(r.nama || 'Perangkat') + (r.baru ? ' <span class="tag" style="font-size:10px;background:#fff4d6">perangkat baru</span>' : '') + '</b><span>' + waktu(r.at) + (r.ip ? ' · IP ' + esc(r.ip) : '') + '</span></span></div>'; }).join('') : '<div class="t-12 o-6">Belum ada.</div>') + '<div class="t-11 o-6">Setiap masuk dari perangkat baru diberitahukan ke nomor/email terdaftar. Bukan Anda? Cabut perangkatnya dan ganti PIN.</div></div>';
    if (p.pesan) h += '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(p.pesan) + '</div>';
    return h + '</div></div>';
  };
  A.perangkatMuat = function () { K.perangkat.data = null; muat(); };
  A.perangkatNama = function (a, v) { K.perangkat.nama = String(v || ''); };
  A.perangkatSimpanNama = function () { EXO_PERANGKAT.namai(K.perangkat.nama); X.sekilas('Nama perangkat disimpan — dipakai saat masuk berikutnya.'); };
  A.perangkatCabut = function (id) { var kerja = function () { EXO_SERVER.perangkatHapus(id).then(function (r) { if (r.ok) { X.sekilas('Perangkat dicabut.'); muat(); } else { K.perangkat.pesan = r.error || 'Gagal.'; X.gambar(); } }); }; if (X.denganPin) X.denganPin('Cabut perangkat dari akun', kerja); else kerja(); };
})(ExoApp);
