/* ==========================================================================
   exo-brankas.js — data pribadi tersimpan di brankas server, bukan di perangkat
   --------------------------------------------------------------------------
   Prinsip: localStorage perangkat TIDAK PERNAH memuat bidang data pribadi
   (telepon, email, alamat, koordinat, NIK, NPWP, rekening, kontak darurat).
   Bidang-bidang itu dititipkan ke data-server (brankas.js: AES-256-GCM amplop,
   DEK per rekaman, KEK berversi) dan di perangkat hanya tersisa versi tersamar
   (0812-••••-4417, d•••@gmail.com, "Jl. Kemang…").

   Cara kerja:
   · Sesi: setelah OTP/login sosial, auth-server menerbitkan token bertanda
     tangan → disimpan di sessionStorage (hilang saat tab ditutup), dibawa
     sebagai Bearer ke data-server.
   · Kait EXO_DB: setelah insert/update pada tabel yang punya bidang pribadi,
     bidang itu dikirim ke brankas; sebelum localStorage ditulis, baris yang
     sudah dikonfirmasi tersimpan di brankas diganti versi tersamarnya.
     Teks polos hanya hidup di memori tab selama sesi.
   · Saat aplikasi dibuka dengan sesi aktif, rekaman milik sesi diambil dari
     brankas dan digabungkan kembali ke baris di memori — kode layar lain tidak
     perlu berubah. Tanpa sesi, layar menampilkan versi tersamar.
   · Migrasi: data pribadi yang sudah terlanjur ada di localStorage dipindahkan
     ke brankas saat sesi pertama kali aktif (atau lewat tombol admin), lalu
     dihapus dari perangkat.
   · Bila brankas tidak terjangkau, baris tetap disimpan utuh secara lokal dan
     ditandai; tidak ada data yang hilang, dan dipindahkan saat tersambung.
   ========================================================================== */
var EXO_BRANKAS = (function () {
  'use strict';
  var KUNCI_SESI = 'exoclean_sesi';
  /* bidang pribadi per tabel; fungsi `pakai` memilih baris mana yang ikut (admin dikecualikan agar login lokal tetap jalan) */
  var BIDANG = {
    users:        { bidang:['telp', 'email', 'alamat', 'koordinat', 'nik', 'npwp', 'rekening', 'tglLahir'], indeks:['telp', 'email'], pakai:function (r) { return r.role !== 'admin'; } },
    orders:       { bidang:['alamat', 'koordinat', 'catatanAlamat', 'telp'], indeks:[] },
    kontakDarurat:{ bidang:['nama', 'nomor', 'hubungan'], indeks:[] },
    toko:         { bidang:['rekening', 'nik', 'telpPemilik', 'alamatPemilik', 'npwp', 'telp', 'email', 'alamat', 'lat', 'lng'], indeks:[] },
    penarikanToko:{ bidang:['rekening'], indeks:[] },
    pendaftaran:  { bidang:['nik', 'alamat', 'telp', 'email', 'skck', 'rekening'], indeks:[] },
    sosInsiden:   { bidang:['lokasi', 'alamat', 'telp'], indeks:[] }
  };
  var RAHASIA = {};            /* tabel → id → { bidang: nilai } (teks polos, memori saja) */
  var antre = {}, timerAntre = {}, status = { sehat:null, cek:0, tersimpan:0, gagal:0, migrasi:null };
  function db() { return window.EXO_DB || null; }
  function server() { return window.EXO_SERVER || null; }

  /* ---------- sesi ---------- */
  function sesi() { try { var t = sessionStorage.getItem(KUNCI_SESI); if (!t) return null; var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (!p || !p.exp || p.exp * 1000 < Date.now()) { sessionStorage.removeItem(KUNCI_SESI); return null; } return { token:t, sub:p.sub, sisi:p.sisi, exp:p.exp }; } catch (e) { return null; } }
  function terimaSesi(token) { if (!token) return false; try { sessionStorage.setItem(KUNCI_SESI, String(token)); } catch (e) { return false; } setTimeout(function () { muat().then(function () { migrasi(); }); }, 10); return true; }
  function keluar() { try { sessionStorage.removeItem(KUNCI_SESI); } catch (e) { /* abaikan */ } RAHASIA = {}; }
  function aktif() { return !!(sesi() && server() && status.sehat); }
  function cekSehat() { var s = server(); if (!s || !s.dataSehat) return Promise.resolve(false); return s.dataSehat().then(function (r) { status.sehat = !!(r && r.ok); status.cek = Date.now(); status.info = r && r.data; return status.sehat; }); }

  /* ---------- penyamaran ---------- */
  function samar(bidang, nilai) {
    if (nilai == null || nilai === '') return nilai;
    var s = String(typeof nilai === 'object' ? '' : nilai);
    if (/telp|nomor|hp|phone/i.test(bidang)) { var d = s.replace(/\D/g, ''); return d.length >= 8 ? d.slice(0, 4) + '-••••-' + d.slice(-4) : '••••'; }
    if (/email/i.test(bidang)) { var p = s.split('@'); return p.length === 2 ? p[0].charAt(0) + '•••@' + p[1] : '•••'; }
    if (/alamat/i.test(bidang)) { return s.split(/[,\n]/)[0].trim().slice(0, 18) + '…'; }
    if (/koordinat/i.test(bidang)) return null;
    if (/rekening/i.test(bidang)) { var r = s.replace(/\D/g, ''); return r.length >= 6 ? '••••' + r.slice(-4) : '••••'; }
    if (/nama/i.test(bidang)) { return s.split(' ')[0].charAt(0) + '•••'; }
    return '••••';
  }
  function pilih(tabel, baris) { var k = BIDANG[tabel], out = {}, ada = false; if (!k || (k.pakai && !k.pakai(baris))) return null; k.bidang.forEach(function (b) { if (baris[b] != null && baris[b] !== '' && !(typeof baris[b] === 'string' && /••••/.test(baris[b]))) { out[b] = baris[b]; ada = true; } }); return ada ? out : null; }

  /* ---------- kait EXO_DB ---------- */
  function setelahTulis(tabel, baris) {
    if (!BIDANG[tabel] || !baris || !baris.id) return;
    var pii = pilih(tabel, baris); if (!pii) return;
    RAHASIA[tabel] = RAHASIA[tabel] || {}; RAHASIA[tabel][baris.id] = Object.assign(RAHASIA[tabel][baris.id] || {}, pii);
    baris._brankas = Object.assign({}, baris._brankas || {}, { bidang:Object.keys(RAHASIA[tabel][baris.id]), tersimpan:false });
    if (!aktif()) { baris._brankas.tertunda = true; return; }
    antre[tabel + ':' + baris.id] = true; clearTimeout(timerAntre[tabel + ':' + baris.id]);
    timerAntre[tabel + ':' + baris.id] = setTimeout(function () { kirimSatu(tabel, baris.id); }, 250);
  }
  function kirimSatu(tabel, id) {
    var s = server(), d = db(); if (!s || !d) return Promise.resolve(false);
    var data = RAHASIA[tabel] && RAHASIA[tabel][id]; if (!data) return Promise.resolve(false);
    return s.dataSimpan(tabel, id, data, BIDANG[tabel].indeks).then(function (r) {
      delete antre[tabel + ':' + id];
      var baris = d.find(tabel, id); if (!baris) return false;
      if (r && r.ok) { status.tersimpan++; baris._brankas = { bidang:r.data.bidang, tersimpan:true, versiKunci:r.data.versiKunci, at:Date.now() }; d.save(); return true; }
      status.gagal++; baris._brankas = Object.assign({}, baris._brankas || {}, { tersimpan:false, tertunda:true, galat:r && r.error }); d.save(); return false;
    });
  }
  /* Sebelum ditulis ke localStorage: baris yang sudah terkonfirmasi di brankas diganti versi tersamar. */
  function sebelumSimpan(state) {
    var salin = Object.assign({}, state);
    Object.keys(BIDANG).forEach(function (tabel) {
      if (!Array.isArray(state[tabel])) return;
      salin[tabel] = state[tabel].map(function (baris) {
        if (!baris._brankas || !baris._brankas.tersimpan) return baris;
        var b = Object.assign({}, baris); (baris._brankas.bidang || []).forEach(function (k) { if (b[k] != null && b[k] !== '') b[k] = samar(k, b[k]); });
        return b;
      });
    });
    return salin;
  }
  /* Setelah muat dari brankas / perubahan lintas tab: gabungkan teks polos dari memori ke baris. */
  function gabung() { var d = db(); if (!d || !d.raw) return; Object.keys(RAHASIA).forEach(function (tabel) { var rows = d.raw[tabel] || []; rows.forEach(function (r) { var p = RAHASIA[tabel][r.id]; if (p) Object.keys(p).forEach(function (k) { r[k] = p[k]; }); }); }); }
  function muat() {
    var s = server(), d = db(); if (!s || !d || !sesi()) return Promise.resolve(0);
    try { d.init(); } catch (e) { /* abaikan */ }
    return cekSehat().then(function (ok) {
      if (!ok) return 0;
      var n = 0;
      return Object.keys(BIDANG).reduce(function (p, tabel) { return p.then(function () { return s.dataAmbilSemua(tabel).then(function (r) { if (!r || !r.ok) return; RAHASIA[tabel] = RAHASIA[tabel] || {}; (r.data.rekaman || []).forEach(function (x) { RAHASIA[tabel][x.id] = x.data; n++; }); }); }); }, Promise.resolve()).then(function () { gabung(); d.save(); try { if (window.ExoApp && ExoApp.gambar) ExoApp.gambar(); if (window.ADMIN && ADMIN.gambar) ADMIN.gambar(); } catch (e) { /* abaikan */ } return n; });
    });
  }
  /* Pindahkan data pribadi yang masih polos di localStorage ke brankas. */
  function migrasi() {
    var d = db(); if (!d || !aktif()) return Promise.resolve({ dipindah:0, alasan:'brankas tidak aktif' });
    var tugas = [];
    Object.keys(BIDANG).forEach(function (tabel) { (d.raw[tabel] || []).forEach(function (r) { if (r._brankas && r._brankas.tersimpan && !r._brankas.tertunda) return; var pii = pilih(tabel, r); if (!pii) return; RAHASIA[tabel] = RAHASIA[tabel] || {}; RAHASIA[tabel][r.id] = Object.assign(RAHASIA[tabel][r.id] || {}, pii); tugas.push([tabel, r.id]); }); });
    status.migrasi = { total:tugas.length, selesai:0, mulai:Date.now() };
    return tugas.reduce(function (p, t) { return p.then(function () { return kirimSatu(t[0], t[1]).then(function (ok) { if (ok) status.migrasi.selesai++; }); }); }, Promise.resolve()).then(function () { status.migrasi.akhir = Date.now(); d.save(true); return { dipindah:status.migrasi.selesai, total:tugas.length }; });
  }
  function hapus(tabel, id) { var s = server(); delete (RAHASIA[tabel] || {})[id]; return s && sesi() ? s.dataHapus(tabel, id) : Promise.resolve({ ok:false, offline:true }); }
  function ringkas() {
    var d = db(), total = 0, diBrankas = 0, tertunda = 0;
    if (d && d.raw) Object.keys(BIDANG).forEach(function (t) { (d.raw[t] || []).forEach(function (r) { if (!pilih(t, r) && !(r._brankas && r._brankas.tersimpan)) return; total++; if (r._brankas && r._brankas.tersimpan && !r._brankas.tertunda) diBrankas++; else tertunda++; }); });
    return { sesi:sesi(), sehat:status.sehat, info:status.info, total:total, diBrankas:diBrankas, tertunda:tertunda, tersimpan:status.tersimpan, gagal:status.gagal, migrasi:status.migrasi };
  }
  function pasang() {
    var d = db(); if (!d || !d.hooks) return;
    d.hooks.setelahTulis = setelahTulis; d.hooks.sebelumSimpan = sebelumSimpan;
    d.onChange(function () { gabung(); });
    /* jaringan ditunda sampai seluruh halaman termuat (exo-server.js ada di bawah); kait dipasang sekarang agar insert awal ikut tertangkap */
    var mulai = function () { if (sesi()) muat().then(function () { migrasi(); }); else cekSehat(); };
    if (document.readyState === 'complete') setTimeout(mulai, 0); else window.addEventListener('load', function () { setTimeout(mulai, 0); });
  }
  pasang();
  return { BIDANG:BIDANG, sesi:sesi, terimaSesi:terimaSesi, keluar:keluar, aktif:aktif, cekSehat:cekSehat, samar:samar, muat:muat, migrasi:migrasi, hapus:hapus, ringkas:ringkas, pasang:pasang };
})();
