/* ==========================================================================
   exo-usulan.js — usulan layanan/tarif dari mitra & moderasi ulasan
   --------------------------------------------------------------------------
   Mitra cleaning mengajukan: layanan/paket baru, tarif di luar rentang, atau
   area layanan baru → tabel usulanLayanan (menunggu → disetujui/ditolak).
   Admin memutus di Operasional → Moderasi dengan PIN + audit; tarif yang
   disetujui ditulis ke users.tarif bila mitra ada di basis data. Ulasan
   produk bisa disembunyikan/ditampilkan (tabel ulasanProduk.disembunyikan).
   ========================================================================== */
var EXO_USULAN = (function () {
  'use strict';
  var JENIS = [['layanan', 'Layanan / paket baru'], ['tarif', 'Tarif di luar rentang'], ['area', 'Area layanan baru'], ['jadwal', 'Jam kerja khusus']];
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function namaJenis(j) { for (var i = 0; i < JENIS.length; i++) if (JENIS[i][0] === j) return JENIS[i][1]; return j; }
  function ajukan(mitra, isi) {
    var d = db(); if (!d) throw new Error('Basis data tidak tersedia');
    var judul = String(isi.judul || '').trim(), ket = String(isi.keterangan || '').trim();
    if (judul.length < 4) throw new Error('Judul minimal 4 karakter');
    if (ket.length < 20) throw new Error('Jelaskan usulan minimal 20 karakter');
    var terbuka = d.all('usulanLayanan').filter(function (u) { return u.mitraId === mitra.id && u.status === 'menunggu'; }).length;
    if (terbuka >= 3) throw new Error('Maksimal 3 usulan menunggu sekaligus');
    return d.insert('usulanLayanan', { mitraId:mitra.id, mitraNama:mitra.nama, jenis:isi.jenis || 'layanan', judul:judul.slice(0, 80), keterangan:ket.slice(0, 600), harga:Number(isi.harga) || 0, satuan:String(isi.satuan || '').trim().slice(0, 20), status:'menunggu', at:kini() });
  }
  function semua() { var d = db(); return d ? d.all('usulanLayanan').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function milik(mitraId) { return semua().filter(function (u) { return u.mitraId === mitraId; }); }
  function putus(id, status, oleh, catatan) {
    var d = db(), u = d.find('usulanLayanan', id); if (!u || u.status !== 'menunggu') throw new Error('Usulan tidak dalam status menunggu');
    if (status === 'disetujui' && u.jenis === 'tarif' && u.harga > 0) { var m = d.find('users', u.mitraId); if (m) d.update('users', u.mitraId, { tarif:u.harga, tarifDisetujuiAt:kini() }); }
    return d.update('usulanLayanan', id, { status:status, oleh:oleh ? oleh.nama : '', catatan:catatan || '', putusAt:kini() });
  }
  function ringkasan() { var s = semua(); return { total:s.length, menunggu:s.filter(function (u) { return u.status === 'menunggu'; }).length, disetujui:s.filter(function (u) { return u.status === 'disetujui'; }).length, ditolak:s.filter(function (u) { return u.status === 'ditolak'; }).length }; }
  /* ulasan produk */
  function ulasanSemua() { var d = db(); return d ? d.all('ulasanProduk').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function sembunyikanUlasan(id, on, oleh, alasan) { var d = db(); return d.update('ulasanProduk', id, { disembunyikan:!!on, moderasiOleh:oleh ? oleh.nama : '', moderasiAlasan:alasan || '', moderasiAt:kini() }); }
  return { JENIS:JENIS, namaJenis:namaJenis, ajukan:ajukan, semua:semua, milik:milik, putus:putus, ringkasan:ringkasan, ulasanSemua:ulasanSemua, sembunyikanUlasan:sembunyikanUlasan };
})();
