/* ==========================================================================
   exo-perlengkapan.js — perlengkapan kerja mitra cleaning: checklist bawaan,
   pemakaian chemical & habis pakai, penyusutan alat kerja
   --------------------------------------------------------------------------
   · Katalog stok gudang (tabel `stok`, dipakai juga admin → Inventaris):
     nama, kategori (chemical · habis pakai · apd · alat), stok (satuan
     kemasan, boleh pecahan), min, harga, isiUnit (ml/pcs per kemasan),
     umurPakai (jumlah job untuk alat).
   · NORMA pemakaian per jasa: takaran per job dan per jam (ml/pcs). Bisa
     ditimpa admin (setting `perlengkapanNorma`, PIN + Persetujuan).
   · rencana(jasa, jam) → daftar bawaan untuk satu job (qty & nilai).
   · konsumsi(job, bawa) dipanggil saat laporan job dikirim: stok berkurang
     (chemical & habis pakai → tabel `pemakaianStok`), alat kerja dicatat
     penyusutannya per job (harga ÷ umurPakai → tabel `penyusutanAlat`),
     alat di tangan mitra dihitung pemakaiannya (tabel `alatMitra`).
   · EXO_KEUANGAN membaca kedua tabel: 6200 ← 1500 (pemakaian) dan
     6210 ← 1610 (penyusutan). PO gudang: 1500 ← 1100.
   ========================================================================== */
var EXO_PERLENGKAPAN = (function () {
  'use strict';
  var KATEGORI = { chemical:'Chemical', 'habis pakai':'Habis pakai', apd:'APD', alat:'Alat kerja' };
  /* nama, kategori, stok, min, harga, isiUnit, satuanIsi, umurPakai(job) */
  var KATALOG = [
    ['Pembersih lantai multi-purpose 5 L', 'chemical', 24, 10, 85000, 5000, 'ml', 0],
    ['Degreaser dapur 5 L', 'chemical', 6, 8, 120000, 5000, 'ml', 0],
    ['Desinfektan permukaan 5 L', 'chemical', 14, 8, 95000, 5000, 'ml', 0],
    ['Pembersih kaca 1 L', 'chemical', 12, 6, 32000, 1000, 'ml', 0],
    ['Penghilang kerak kamar mandi 1 L', 'chemical', 10, 6, 48000, 1000, 'ml', 0],
    ['Cairan pembersih evaporator AC 1 L', 'chemical', 9, 6, 58000, 1000, 'ml', 0],
    ['Sampo upholstery 5 L', 'chemical', 5, 4, 140000, 5000, 'ml', 0],
    ['Lap microfiber (lusin)', 'alat', 30, 12, 60000, 12, 'pcs', 40],
    ['Sarung tangan nitril (box 100)', 'apd', 9, 10, 65000, 100, 'pcs', 0],
    ['Masker (box 50)', 'apd', 22, 10, 35000, 50, 'pcs', 0],
    ['Kantong sampah 60 L (roll)', 'habis pakai', 40, 15, 28000, 20, 'pcs', 0],
    ['Sikat toilet', 'alat', 18, 6, 15000, 1, 'pcs', 60],
    ['Pad poles 17"', 'alat', 4, 6, 145000, 1, 'pcs', 25],
    ['Cover bag AC', 'alat', 7, 5, 180000, 1, 'pcs', 120],
    ['Mop set + ember', 'alat', 12, 4, 210000, 1, 'pcs', 150],
    ['Vacuum 1200 W', 'alat', 6, 2, 1450000, 1, 'pcs', 600],
    ['Steam cleaner', 'alat', 3, 1, 2600000, 1, 'pcs', 400],
    ['Jet pump bertekanan', 'alat', 4, 2, 1900000, 1, 'pcs', 500],
    ['Mesin wet vacuum', 'alat', 3, 1, 3200000, 1, 'pcs', 400],
    ['Sikat upholstery lembut', 'alat', 10, 4, 25000, 1, 'pcs', 50]
  ];
  /* Norma per jasa: [nama item, perJob, perJam] dalam satuan isi (ml/pcs); alat cukup dicantumkan (perJob 0) untuk penyusutan. */
  var NORMA_BAWAAN = {
    hourly:[['Pembersih lantai multi-purpose 5 L', 0, 60], ['Pembersih kaca 1 L', 30, 0], ['Sarung tangan nitril (box 100)', 2, 0], ['Masker (box 50)', 1, 0], ['Kantong sampah 60 L (roll)', 2, 0], ['Lap microfiber (lusin)', 0, 0], ['Mop set + ember', 0, 0], ['Vacuum 1200 W', 0, 0], ['Sikat toilet', 0, 0]],
    deep:[['Degreaser dapur 5 L', 250, 0], ['Penghilang kerak kamar mandi 1 L', 120, 0], ['Desinfektan permukaan 5 L', 150, 0], ['Pembersih lantai multi-purpose 5 L', 0, 80], ['Sarung tangan nitril (box 100)', 2, 0], ['Masker (box 50)', 2, 0], ['Kantong sampah 60 L (roll)', 4, 0], ['Lap microfiber (lusin)', 0, 0], ['Steam cleaner', 0, 0], ['Pad poles 17"', 0, 0], ['Vacuum 1200 W', 0, 0]],
    ac:[['Cairan pembersih evaporator AC 1 L', 100, 0], ['Desinfektan permukaan 5 L', 50, 0], ['Sarung tangan nitril (box 100)', 2, 0], ['Masker (box 50)', 1, 0], ['Cover bag AC', 0, 0], ['Jet pump bertekanan', 0, 0], ['Lap microfiber (lusin)', 0, 0]],
    sofa:[['Sampo upholstery 5 L', 200, 0], ['Desinfektan permukaan 5 L', 60, 0], ['Sarung tangan nitril (box 100)', 2, 0], ['Masker (box 50)', 1, 0], ['Mesin wet vacuum', 0, 0], ['Sikat upholstery lembut', 0, 0], ['Lap microfiber (lusin)', 0, 0]],
    laundry:[['Sarung tangan nitril (box 100)', 2, 0], ['Masker (box 50)', 1, 0], ['Kantong sampah 60 L (roll)', 2, 0]]
  };
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function hariIni() { return kini().slice(0, 10); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function bulat2(n) { return Math.round(n * 100) / 100; }

  /* ---------- katalog / stok ---------- */
  function semai() {
    var d = db(); if (!d) return; var ada = d.all('stok'), peta = {}; ada.forEach(function (s) { peta[s.nama] = s; });
    KATALOG.forEach(function (k) { var s = peta[k[0]]; if (!s) d.insert('stok', { nama:k[0], kategori:k[1], stok:k[2], min:k[3], harga:k[4], isiUnit:k[5], satuanIsi:k[6], umurPakai:k[7] }); else if (s.isiUnit == null) d.update('stok', s.id, { isiUnit:k[5], satuanIsi:k[6], umurPakai:k[7], kategori:s.kategori || k[1] }); });
  }
  function stok() { var d = db(); if (!d) return []; semai(); return d.all('stok'); }
  function item(nama) { return stok().filter(function (s) { return s.nama === nama; })[0] || null; }
  function cariItem(namaSop) { var s = String(namaSop || '').toLowerCase(), semua = stok(); return semua.filter(function (x) { return x.nama.toLowerCase().indexOf(s) === 0; })[0] || semua.filter(function (x) { var kata = s.split(/[\s(]+/)[0]; return kata.length > 3 && x.nama.toLowerCase().indexOf(kata) >= 0; })[0] || null; }
  function norma(jasa) { var d = db(), o = d ? (d.setting('perlengkapanNorma') || {}) : {}; return (o[jasa] || NORMA_BAWAAN[jasa] || []).slice(); }
  function simpanNorma(jasa, daftar) { var d = db(); if (!d) throw new Error('Basis data tidak tersedia'); var o = d.setting('perlengkapanNorma') || {}; o[jasa] = (daftar || []).map(function (n) { return [String(n[0]), Number(n[1]) || 0, Number(n[2]) || 0]; }); d.setting('perlengkapanNorma', o); return o[jasa]; }

  /* ---------- rencana bawaan untuk satu job ---------- */
  function rencana(jasa, jam, metaSop) {
    jam = Number(jam) || 1; var out = [], dipakai = {};
    norma(jasa).forEach(function (n) { var it = item(n[0]); if (!it) return; dipakai[it.id] = 1; var qty = it.kategori === 'alat' ? 1 : (n[1] + n[2] * jam), unit = it.kategori === 'alat' ? 0 : qty / (it.isiUnit || 1), nilai = it.kategori === 'alat' ? (it.umurPakai ? it.harga / it.umurPakai : 0) : unit * it.harga; out.push({ id:it.id, nama:it.nama, kategori:it.kategori, qty:qty, satuan:it.kategori === 'alat' ? 'unit' : it.satuanIsi, unit:bulat2(unit), nilai:Math.round(nilai), stok:it.stok, min:it.min, habis:it.stok <= 0, rendah:it.stok < it.min, susutPerJob:it.kategori === 'alat' && it.umurPakai ? Math.round(it.harga / it.umurPakai) : 0 }); });
    /* alat dari SOP yang belum ada di norma tetap masuk daftar bawaan (tanpa nilai) */
    var meta = metaSop && metaSop.alat ? metaSop : (window.EXO_DATA && EXO_DATA.SOP_META ? EXO_DATA.SOP_META[jasa] : null);
    if (meta) meta.alat.concat(meta.chem).forEach(function (a) { var it = cariItem(a[0]); if (it && !dipakai[it.id]) { dipakai[it.id] = 1; out.push({ id:it.id, nama:it.nama, kategori:it.kategori, qty:it.kategori === 'alat' ? 1 : 0, satuan:it.kategori === 'alat' ? 'unit' : it.satuanIsi, unit:0, nilai:0, stok:it.stok, min:it.min, habis:it.stok <= 0, rendah:it.stok < it.min, susutPerJob:it.kategori === 'alat' && it.umurPakai ? Math.round(it.harga / it.umurPakai) : 0, catatan:a[1] || '' }); } });
    var urut = ['chemical', 'habis pakai', 'apd', 'alat']; return out.sort(function (a, b) { return urut.indexOf(a.kategori) - urut.indexOf(b.kategori); });
  }
  function ringkasRencana(daftar) { var r = { chemical:0, habis:0, susut:0, n:daftar.length }; daftar.forEach(function (x) { if (x.kategori === 'alat') r.susut += x.susutPerJob; else if (x.kategori === 'chemical') r.chemical += x.nilai; else r.habis += x.nilai; }); r.total = r.chemical + r.habis + r.susut; return r; }

  /* ---------- pemakaian saat job selesai ---------- */
  function konsumsi(job, bawa) {
    var d = db(); if (!d) return null; var daftar = rencana(job.jasa, job.jam), hasil = { pemakaian:[], penyusutan:[], nilaiPemakaian:0, nilaiPenyusutan:0, jobNo:job.no };
    if (d.all('pemakaianStok').some(function (p) { return p.jobNo === job.no && job.no; })) { hasil.sudah = true; return hasil; }
    daftar.forEach(function (x) {
      if (bawa && bawa[x.id] === false) return; var it = d.find('stok', x.id); if (!it) return;
      if (x.kategori === 'alat') {
        if (x.susutPerJob) { d.insert('penyusutanAlat', { tgl:hariIni(), jobNo:job.no || '', jasa:job.jasa, mitra:job.mitra || '', itemId:it.id, nama:it.nama, nilai:x.susutPerJob, at:kini() }); hasil.penyusutan.push({ nama:it.nama, nilai:x.susutPerJob }); hasil.nilaiPenyusutan += x.susutPerJob; }
        var am = d.all('alatMitra').filter(function (a) { return a.mitra === (job.mitra || '') && a.itemId === it.id; })[0];
        if (am) d.update('alatMitra', am.id, { jobDipakai:(am.jobDipakai || 0) + 1, terakhir:hariIni() }); else d.insert('alatMitra', { mitra:job.mitra || '', itemId:it.id, nama:it.nama, diterima:hariIni(), jobDipakai:1, umurPakai:it.umurPakai || 0, harga:it.harga, kondisi:'baik', terakhir:hariIni() });
      } else if (x.unit > 0) {
        d.update('stok', it.id, { stok:bulat2(Math.max(0, (it.stok || 0) - x.unit)) });
        d.insert('pemakaianStok', { tgl:hariIni(), jobNo:job.no || '', jasa:job.jasa, mitra:job.mitra || '', lokasi:job.lokasi || '', itemId:it.id, nama:it.nama, kategori:it.kategori, qty:x.qty, satuan:x.satuan, unit:x.unit, nilai:x.nilai, at:kini() });
        hasil.pemakaian.push({ nama:it.nama, qty:x.qty, satuan:x.satuan, nilai:x.nilai }); hasil.nilaiPemakaian += x.nilai;
      }
    });
    return hasil;
  }
  function minta(nama, mitra, lokasi, urgensi) { var d = db(); if (!d) return null; return d.insert('permintaanStok', { barang:nama, mitra:mitra || '', lokasi:lokasi || '', urgensi:urgensi || 'sedang', status:'menunggu', tgl:hariIni() }); }
  function alatMitra(mitra) { var d = db(); return d ? d.all('alatMitra').filter(function (a) { return !mitra || a.mitra === mitra; }).map(function (a) { var sisa = a.umurPakai ? Math.max(0, a.umurPakai - (a.jobDipakai || 0)) : null; return Object.assign({}, a, { sisaJob:sisa, nilaiBuku:a.umurPakai ? Math.round(a.harga * (sisa / a.umurPakai)) : a.harga, pct:a.umurPakai ? Math.round((a.jobDipakai || 0) / a.umurPakai * 100) : 0 }); }) : []; }
  function lapor(mitra, alatId, kondisi, lokasi) { var d = db(); var a = d.find('alatMitra', alatId); if (!a) return null; d.update('alatMitra', alatId, { kondisi:kondisi }); if (kondisi === 'rusak') minta(a.nama + ' (ganti — rusak)', mitra, lokasi, 'tinggi'); return a; }

  /* ---------- laporan admin ---------- */
  function laporan(bulan) {
    var d = db(); if (!d) return null; var dlm = function (t) { return !bulan || String(t || '').slice(0, 7) === bulan; };
    var pk = d.all('pemakaianStok').filter(function (p) { return dlm(p.tgl); }), ps = d.all('penyusutanAlat').filter(function (p) { return dlm(p.tgl); });
    var perItem = {}, perMitra = {}, perJasa = {};
    pk.forEach(function (p) { var i = perItem[p.nama] = perItem[p.nama] || { nama:p.nama, kategori:p.kategori, qty:0, satuan:p.satuan, unit:0, nilai:0, n:0 }; i.qty += p.qty; i.unit += p.unit; i.nilai += p.nilai; i.n++; var m = perMitra[p.mitra] = perMitra[p.mitra] || { mitra:p.mitra, job:{}, pemakaian:0, susut:0 }; m.job[p.jobNo] = 1; m.pemakaian += p.nilai; var j = perJasa[p.jasa] = perJasa[p.jasa] || { jasa:p.jasa, job:{}, pemakaian:0, susut:0 }; j.job[p.jobNo] = 1; j.pemakaian += p.nilai; });
    ps.forEach(function (p) { var m = perMitra[p.mitra] = perMitra[p.mitra] || { mitra:p.mitra, job:{}, pemakaian:0, susut:0 }; m.job[p.jobNo] = 1; m.susut += p.nilai; var j = perJasa[p.jasa] = perJasa[p.jasa] || { jasa:p.jasa, job:{}, pemakaian:0, susut:0 }; j.job[p.jobNo] = 1; j.susut += p.nilai; });
    var nilaiStok = stok().reduce(function (n, s) { return n + (s.stok || 0) * (s.harga || 0); }, 0);
    return { pemakaian:pk.reduce(function (n, p) { return n + p.nilai; }, 0), penyusutan:ps.reduce(function (n, p) { return n + p.nilai; }, 0), jobs:Object.keys(pk.concat(ps).reduce(function (m, p) { m[p.jobNo] = 1; return m; }, {})).length, perItem:Object.keys(perItem).map(function (k) { return perItem[k]; }).sort(function (a, b) { return b.nilai - a.nilai; }), perMitra:Object.keys(perMitra).map(function (k) { var m = perMitra[k]; m.nJob = Object.keys(m.job).length; return m; }).sort(function (a, b) { return (b.pemakaian + b.susut) - (a.pemakaian + a.susut); }), perJasa:Object.keys(perJasa).map(function (k) { var j = perJasa[k]; j.nJob = Object.keys(j.job).length; return j; }), nilaiStok:nilaiStok, alat:alatMitra() };
  }

  if (window.EXO_PERSETUJUAN) { try { EXO_PERSETUJUAN.TINGKAT['perlengkapan-norma'] = 'sedang'; EXO_PERSETUJUAN.daftarkanPenerap('perlengkapan-norma', function (u) { return simpanNorma(u.muatan.jasa, u.muatan.daftar); }); } catch (e) { /* konsol admin saja */ } }
  return { KATEGORI:KATEGORI, KATALOG:KATALOG, NORMA_BAWAAN:NORMA_BAWAAN, rp:rp, semai:semai, stok:stok, item:item, cariItem:cariItem, norma:norma, simpanNorma:simpanNorma, rencana:rencana, ringkasRencana:ringkasRencana, konsumsi:konsumsi, minta:minta, alatMitra:alatMitra, lapor:lapor, laporan:laporan };
})();
