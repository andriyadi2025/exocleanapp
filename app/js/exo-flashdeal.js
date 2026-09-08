/* ==========================================================================
   exo-flashdeal.js — Flash Deal jasa layanan (pola flash sale Tokopedia,
   diterapkan pada jasa kebersihan)
   --------------------------------------------------------------------------
   Admin membuat sesi Flash Deal per layanan: tanggal, jendela jam (mulai–
   selesai), diskon %, kuota pemesanan. Selama jendela berjalan dan kuota
   tersisa, pemesanan layanan itu otomatis mendapat potongan (baris
   "Flash Deal" di ringkasan harga); tiap pemesanan sukses memakai 1 kuota.
   Tabel EXO_DB `flashDeal`. Perubahan lewat Persetujuan 'flash-deal'
   (tingkat sedang) + PIN di konsol admin → Promos & vouchers.
   ========================================================================== */
var EXO_FLASHDEAL = (function () {
  'use strict';
  var TABEL = 'flashDeal';
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function hariIni() { return new Date().toISOString().slice(0, 10); }
  function jamKini() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function semua() { var d = db(); return d ? d.all(TABEL).sort(function (a, b) { return (a.tgl + a.mulai).localeCompare(b.tgl + b.mulai); }) : []; }
  function sisa(f) { return Math.max(0, (f.kuota || 0) - (f.terpakai || 0)); }
  function keadaan(f) { var t = hariIni(), j = jamKini(); if (!f.aktif) return 'nonaktif'; if (f.tgl < t || (f.tgl === t && f.selesai <= j)) return 'selesai'; if (f.tgl > t || f.mulai > j) return 'akan datang'; return sisa(f) > 0 ? 'berjalan' : 'habis'; }
  /* Sesi yang tampil di beranda: berjalan & akan datang hari ini (maks 6). */
  function tampil() { var t = hariIni(); return semua().filter(function (f) { var k = keadaan(f); return f.tgl === t && (k === 'berjalan' || k === 'akan datang' || k === 'habis'); }).slice(0, 6).map(function (f) { return Object.assign({}, f, { keadaan:keadaan(f), sisa:sisa(f) }); }); }
  function berlaku(jasa) { return semua().filter(function (f) { return f.jasa === jasa && keadaan(f) === 'berjalan'; }).sort(function (a, b) { return b.diskonPct - a.diskonPct; })[0] || null; }
  function diskon(jasa, nilai) { var f = berlaku(jasa); return f ? Math.round((Number(nilai) || 0) * f.diskonPct / 100 / 1000) * 1000 : 0; }
  function pakai(jasa) { var d = db(), f = berlaku(jasa); if (!d || !f) return null; return d.update(TABEL, f.id, { terpakai:(f.terpakai || 0) + 1 }); }
  /* detik tersisa sampai jendela berakhir (berjalan) atau dimulai (akan datang) */
  function sisaDetik(f) { var k = keadaan(f), target = new Date(f.tgl + 'T' + (k === 'akan datang' ? f.mulai : f.selesai) + ':00'); return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000)); }
  function hitungMundur(f) { var s = sisaDetik(f), dua = function (n) { return String(n).padStart(2, '0'); }; return dua(Math.floor(s / 3600)) + ':' + dua(Math.floor(s % 3600 / 60)) + ':' + dua(s % 60); }
  function periksa(isi) { var g = []; if (!isi.jasa) g.push('Pilih layanan'); var p = Number(isi.diskonPct); if (!(p >= 5 && p <= 70)) g.push('Diskon 5–70%'); if (!/^\d{4}-\d{2}-\d{2}$/.test(isi.tgl || '')) g.push('Tanggal tidak valid'); if (!/^\d{2}:\d{2}$/.test(isi.mulai || '') || !/^\d{2}:\d{2}$/.test(isi.selesai || '') || isi.mulai >= isi.selesai) g.push('Jam mulai harus sebelum jam selesai'); if (!(Number(isi.kuota) >= 1)) g.push('Kuota minimal 1'); return g; }
  function simpan(isi) { var d = db(); if (!d) throw new Error('Basis data tidak tersedia'); var g = periksa(isi); if (g.length) throw new Error(g[0]); var baris = { jasa:isi.jasa, judul:String(isi.judul || '').trim().slice(0, 40), diskonPct:Math.round(Number(isi.diskonPct)), tgl:isi.tgl, mulai:isi.mulai, selesai:isi.selesai, kuota:Math.round(Number(isi.kuota)), aktif:isi.aktif !== false, oleh:isi.oleh || '' }; if (isi.id && d.find(TABEL, isi.id)) return d.update(TABEL, isi.id, baris); return d.insert(TABEL, Object.assign({ terpakai:0, at:new Date().toISOString() }, baris)); }
  function hapus(id) { var d = db(); if (d) d.remove(TABEL, id); return true; }
  function saklar(id, aktif) { var d = db(); return d ? d.update(TABEL, id, { aktif:!!aktif }) : null; }
  var sudah = false;
  function semai() {
    if (sudah) return; sudah = true; var d = db(); if (!d || d.all(TABEL).length) return;
    var t = hariIni(), kini = new Date(), h = kini.getHours(), m = String(kini.getMinutes()).padStart(2, '0'), jam = function (x) { return String(Math.max(0, Math.min(23, x))).padStart(2, '0'); };
    [['hourly', 'Cleaning per jam', 20, jam(h - 1) + ':00', jam(h + 2) + ':' + m, 30, 12], ['ac', 'Cuci AC', 15, jam(h - 1) + ':00', jam(h + 3) + ':' + m, 20, 5], ['deep', 'Deep cleaning', 25, jam(h + 3) + ':00', jam(h + 5) + ':00', 15, 0]].forEach(function (x) { d.insert(TABEL, { jasa:x[0], judul:x[1] + ' Flash Deal', diskonPct:x[2], tgl:t, mulai:x[3], selesai:x[4], kuota:x[5], terpakai:x[6], aktif:true, oleh:'contoh', contoh:true, at:new Date().toISOString() }); });
  }
  if (window.EXO_PERSETUJUAN) { try { EXO_PERSETUJUAN.TINGKAT['flash-deal'] = 'sedang'; EXO_PERSETUJUAN.daftarkanPenerap('flash-deal', function (u, oleh) { var m = u.muatan; if (m.aksi === 'hapus') return hapus(m.id); if (m.aksi === 'saklar') return saklar(m.id, m.aktif); return simpan(Object.assign({}, m.isi, { oleh:oleh.nama })); }); } catch (e) { /* konsol admin saja */ } }
  return { semua:semua, tampil:tampil, berlaku:berlaku, diskon:diskon, pakai:pakai, keadaan:keadaan, sisa:sisa, sisaDetik:sisaDetik, hitungMundur:hitungMundur, periksa:periksa, simpan:simpan, hapus:hapus, saklar:saklar, semai:semai };
})();
