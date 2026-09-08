/* ==========================================================================
   exo-screens-toko-profil.js — Seller Center: Akun / Profil toko (tprofil)
   --------------------------------------------------------------------------
   Pola tab "Akun" aplikasi Tokopedia Seller: kepala toko (inisial, nama,
   badge, skor, kota, jam buka), data pemilik & kontak, ringkasan toko
   (produk aktif, pesanan selesai, rating, saldo), menu akun (Pengaturan toko,
   Alamat & kurir, Rekening & pencairan, Program Gratis Ongkir, Iklan, Edukasi
   Seller, Bahasa, Bantuan), pintu ke aplikasi pelanggan/mitra, Keluar.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  var T = function () { return window.EXO_TOKO; }, rp = function (n) { return T().rp(n); };
  if (!window.EXO_TOKO) return;
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  function tokoSaya() { var a = aku(), semua = T().semuaToko(); return semua.filter(function (t) { return t.pemilikId && t.pemilikId === a.id; })[0] || (K.tokoSayaId ? T().toko(K.tokoSayaId) : null) || semua[0]; }
  function badge(b) { return b === 'official' ? '<span class="tag tag-accent">Official Store</span>' : b === 'power' ? '<span class="tag tag-accent-2">Power Merchant</span>' : '<span class="tag tag-neutral">Toko Reguler</span>'; }
  X.LAYAR.tprofil = function () {
    var t = tokoSaya(); if (!t) { K.layar = 'tdaftar'; return X.LAYAR.tdaftar(); }
    var sk = T().skorToko(t.id), ke = T().keuanganToko(t.id), pr = T().produkToko(t.id), a = aku(), langNow = null; for (var q = 0; q < X.I.LANGS.length; q++) if (X.I.LANGS[q].code === K.lang) langNow = X.I.LANGS[q];
    var h = '<div class="screen"><div class="hero hero--leaf" style="padding-bottom:16px"><div class="flex items-center gap-12"><span class="av av-solid" style="--s:56px;font-size:20px;font-weight:800">' + esc(t.nama.trim().slice(0, 1).toUpperCase()) + '</span><div class="grow" style="min-width:0"><div class="f-head t-17" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.nama) + '</div><div class="flex items-center gap-6 t-11 o-7" style="margin-top:3px">' + badge(sk.badge) + '<span>★ ' + sk.rating + ' · skor ' + sk.skor + '</span></div><div class="t-11 o-7">' + esc(t.kota) + ' · ' + (t.tutupSementara ? 'tutup sementara' : 'buka ' + esc(t.jamBuka)) + ' · sejak ' + esc(String(t.createdAt || '2026').slice(0, 4)) + '</div></div>' + X.tombolBahasa() + '</div>';
    h += '<div class="flex gap-9" style="margin-top:14px"><div class="stat"><b>' + pr.length + '</b><span>Produk aktif</span></div><div class="stat"><b>' + sk.selesai + '</b><span>Pesanan selesai</span></div><div class="stat"><b>' + rp(ke.saldo).replace('Rp ', 'Rp') + '</b><span>Saldo</span></div></div></div>';
    h += '<div class="stack gap-12" style="padding:14px 20px 0">';
    /* pemilik & kontak */
    h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><div class="f-head t-15 grow">Pemilik & kontak</div><button class="btn btn-ghost t-115"' + aksi('ke', 'tpengaturan') + '>Ubah →</button></div><div class="kv t-125"><span class="o-7">Pemilik</span><b>' + esc(t.pemilikNama || a.name) + '</b></div><div class="kv t-125"><span class="o-7">Telepon toko</span><b>' + esc(t.telp || '—') + '</b></div><div class="kv t-125"><span class="o-7">Alamat</span><span style="text-align:end;max-width:60%">' + esc(t.alamat || '—') + (t.kodePos ? ' · ' + esc(t.kodePos) : '') + '</span></div><div class="kv t-125"><span class="o-7">Deskripsi</span><span style="text-align:end;max-width:60%" class="o-8">' + esc(t.deskripsi || '—') + '</span></div></div>';
    /* menu akun */
    var menu = [['Pengaturan toko', 'profil, jam buka, kurir yang dilayani, template chat', 'tpengaturan', '⚙️'], ['Keuangan & pencairan', 'saldo, rekening, riwayat pencairan', 'tkeuangan', '💳'], ['Program Gratis Ongkir', t.programOngkir ? 'toko ini peserta' : 'belum ikut · subsidi ongkir untuk pembeli', 'tpengaturan', '🚚'], ['Iklan toko', 'saldo iklan & kampanye', 'tiklan', '📣'], ['Promosi & kupon', 'kupon toko, diskon produk, flash sale', 'tpromosi', '🏷️'], ['Skor & performa toko', 'rating, proses cepat, balas chat, penalti', 'tskor', '🏅'], ['Statistik', 'omzet, kunjungan, konversi', 'tstatistik', '📈'], ['Edukasi Seller', 'Akademi & tips berjualan', 'pbelajar', '🎓']];
    h += '<div class="card elev-sm gap-0" style="padding:4px 6px">' + menu.map(function (m) { return '<button class="row row-xs"' + aksi('ke', m[2]) + '><span style="font-size:20px">' + m[3] + '</span><span class="row-main"><b style="font-size:12.5px">' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></span><span class="o-5">›</span></button>'; }).join('') + '</div>';
    /* pengaturan aplikasi */
    h += '<div class="card elev-sm gap-0" style="padding:4px 6px"><button class="row row-xs"' + aksi('ke', 'duaFaktor') + '><span style="font-size:20px">🔐</span><span class="row-main"><b style="font-size:12.5px">Verifikasi dua langkah</b><span>aplikasi autentikator & passkey</span></span><span class="o-4">›</span></button><button class="row row-xs"' + aksi('ke', 'pinKelola') + '><span style="font-size:20px">🔢</span><span class="row-main"><b style="font-size:12.5px">PIN transaksi</b><span>diminta saat pencairan & isi saldo iklan</span></span><span class="o-4">›</span></button><button class="row row-xs"' + aksi('ke', 'privasi') + '><span style="font-size:20px">🔏</span><span class="row-main"><b style="font-size:12.5px">Privasi & data saya</b><span>persetujuan, salinan data, hapus akun · UU PDP</span></span><span class="o-4">›</span></button><button class="row row-xs"' + aksi('ke', 'lang') + '><span style="font-size:20px">🌐</span><span class="row-main"><b style="font-size:12.5px">Bahasa</b><span>' + esc(langNow ? langNow.native : K.lang) + '</span></span><span class="o-5">›</span></button><button class="row row-xs"' + aksi('ke', 'cs') + '><span style="font-size:20px">🤖</span><span class="row-main"><b style="font-size:12.5px">Bantuan seller · Customer Care AI</b><span>jawab instan · hubungkan ke tim dalam 60 detik</span></span><span class="o-5">›</span></button><button class="row row-xs"' + aksi('ke', 'terms') + '><span style="font-size:20px">📄</span><span class="row-main"><b style="font-size:12.5px">S&K Marketplace & privasi</b><span>komisi per tingkat, dana ditahan, retur</span></span><span class="o-5">›</span></button></div>';
    h += '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('kePelanggan') + '>← Aplikasi pelanggan</button><button class="btn btn-secondary" style="flex:1"' + aksi('keMitra') + '>Aplikasi mitra →</button></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0;color:#b12a5b"' + aksi('tokoKeluar') + '>Keluar dari Seller Center</button><div class="spacer-26"></div></div></div>';
    return h;
  };
  A.tokoKeluar = function () { K.sisi = 'customer'; K.layar = 'home'; X.sekilas('Keluar dari Seller Center.'); };
})(ExoApp);
