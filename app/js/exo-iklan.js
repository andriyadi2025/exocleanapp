/* ==========================================================================
   exo-iklan.js — mesin iklan mitra toko (pola Tokopedia TopAds)
   --------------------------------------------------------------------------
   Mitra toko mengisi saldo iklan (dari saldo toko atau gateway), lalu
   memasang iklan produk / iklan toko dengan kata kunci, tawaran per klik
   (bid), dan anggaran harian. Iklan tayang di slot berlabel "Iklan": atas
   hasil pencarian & kategori Toko, beranda pelanggan (Rekomendasi), dan
   halaman produk. Tagihan model CPC: saldo dipotong setiap klik sebesar
   bid; anggaran harian dan saldo yang habis menghentikan tayang otomatis.
   Admin: moderasi iklan (PIN + audit), setelan tarif & slot (PIN +
   Persetujuan 'iklan-setelan'), laporan pendapatan iklan.
   Tabel EXO_DB: iklan · iklanTopup · iklanHarian (agregat tayang/klik/biaya
   per hari per iklan — sumber jurnal 2520 → 4150 di EXO_KEUANGAN).
   ========================================================================== */
var EXO_IKLAN = (function () {
  'use strict';
  var KUNCI = 'iklan', KUNCI_KLIK = 'exoclean_iklan_klik';
  var BAWAAN = { aktif:true, bidMin:200, bidMaks:5000, anggaranHarianMin:10000, topupMin:50000, slotCari:2, slotBeranda:1, slotProduk:2, moderasi:true, label:'Iklan', durasiMaks:60 };
  var STATUS = { moderasi:'Menunggu moderasi', aktif:'Aktif', dijeda:'Dijeda', ditolak:'Ditolak', habis:'Saldo/anggaran habis', selesai:'Selesai' };
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function T() { return window.EXO_TOKO; }
  function kini() { return new Date().toISOString(); }
  function hariIni() { return kini().slice(0, 10); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function pengaturan() { var d = db(); return Object.assign({}, BAWAAN, d ? (d.setting(KUNCI) || {}) : {}); }
  function simpanPengaturan(patch) { var d = db(); if (!d) throw new Error('Basis data tidak tersedia'); var c = Object.assign({}, pengaturan(), patch || {}); if (c.bidMin < 50 || c.bidMin > c.bidMaks) throw new Error('Bid minimum harus ≥ 50 dan ≤ bid maksimum'); if (c.anggaranHarianMin < c.bidMin) throw new Error('Anggaran harian minimum harus ≥ bid minimum'); d.setting(KUNCI, c); return c; }

  /* ---------- saldo & isi ulang ---------- */
  function topupToko(tokoId) { var d = db(); return d ? d.all('iklanTopup').filter(function (t) { return t.tokoId === tokoId; }) : []; }
  function saldoIklan(tokoId) { var masuk = topupToko(tokoId).filter(function (t) { return t.status === 'dibayar'; }).reduce(function (n, t) { return n + t.jumlah; }, 0), pakai = daftarIklan(tokoId).reduce(function (n, i) { return n + (i.biaya || 0); }, 0); return masuk - pakai; }
  function topup(tokoId, jumlah, sumber, oleh) {
    var d = db(), c = pengaturan(); jumlah = Math.round(Number(jumlah) || 0); if (!d) throw new Error('Basis data tidak tersedia');
    if (jumlah < c.topupMin) throw new Error('Isi saldo iklan minimal ' + rp(c.topupMin));
    if (sumber === 'saldo') { var k = T().keuanganToko(tokoId); if (k.saldo < jumlah) throw new Error('Saldo toko tersedia ' + rp(k.saldo) + ' — kurang untuk isi ' + rp(jumlah)); }
    return d.insert('iklanTopup', { tokoId:tokoId, jumlah:jumlah, sumber:sumber === 'saldo' ? 'saldo' : 'gateway', status:'dibayar', ref:sumber === 'saldo' ? 'potong saldo toko' : 'simulasi gateway', oleh:oleh || '', at:kini() });
  }

  /* ---------- iklan ---------- */
  function daftarIklan(tokoId) { var d = db(); return d ? d.all('iklan').filter(function (i) { return !tokoId || i.tokoId === tokoId; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function iklan(id) { var d = db(); return d ? d.find('iklan', id) : null; }
  function bersihkanKata(s) { return String(s || '').split(/[,\n;]/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).slice(0, 15); }
  function periksa(isi, c) {
    var g = []; c = c || pengaturan(); var bid = Math.round(Number(isi.bid) || 0), ang = Math.round(Number(isi.anggaranHarian) || 0), dur = Number(isi.durasi) || 0;
    if (isi.jenis === 'produk' && !isi.produkId) g.push('Pilih produk yang diiklankan');
    if (!String(isi.judul || '').trim()) g.push('Judul iklan wajib diisi');
    if (bid < c.bidMin || bid > c.bidMaks) g.push('Bid per klik harus ' + rp(c.bidMin) + '–' + rp(c.bidMaks));
    if (ang < c.anggaranHarianMin) g.push('Anggaran harian minimal ' + rp(c.anggaranHarianMin));
    if (ang < bid) g.push('Anggaran harian harus ≥ bid');
    if (dur < 1 || dur > c.durasiMaks) g.push('Durasi 1–' + c.durasiMaks + ' hari');
    return g;
  }
  function buat(tokoId, isi, oleh) {
    var d = db(), c = pengaturan(); if (!d) throw new Error('Basis data tidak tersedia'); if (!c.aktif) throw new Error('Fasilitas iklan sedang dinonaktifkan admin');
    var g = periksa(isi, c); if (g.length) throw new Error(g[0]);
    if (saldoIklan(tokoId) < Number(isi.bid)) throw new Error('Saldo iklan kurang — isi saldo dulu (minimal ' + rp(c.topupMin) + ')');
    var p = isi.jenis === 'produk' ? T().produk(isi.produkId) : null; if (isi.jenis === 'produk' && (!p || p.tokoId !== tokoId)) throw new Error('Produk bukan milik toko ini'); if (p && p.status !== 'aktif') throw new Error('Produk harus berstatus aktif');
    var mulai = hariIni(), sampai = new Date(Date.now() + Number(isi.durasi) * 86400000).toISOString().slice(0, 10);
    return d.insert('iklan', { tokoId:tokoId, jenis:isi.jenis === 'toko' ? 'toko' : 'produk', produkId:p ? p.id : null, judul:String(isi.judul).trim().slice(0, 60), kataKunci:bersihkanKata(isi.kataKunci), bid:Math.round(Number(isi.bid)), anggaranHarian:Math.round(Number(isi.anggaranHarian)), mulai:mulai, sampai:sampai, status:c.moderasi ? 'moderasi' : 'aktif', tayang:0, klik:0, biaya:0, konversi:0, nilaiKonversi:0, hariIni:{ tgl:mulai, biaya:0, klik:0 }, alasanTolak:'', oleh:oleh || '', at:kini() });
  }
  function ubah(id, patch) { var d = db(), ik = iklan(id); if (!ik) throw new Error('Iklan tidak ditemukan'); var c = pengaturan(), baru = Object.assign({}, ik, patch); var g = periksa(Object.assign({ durasi:1 }, baru), c).filter(function (x) { return x.indexOf('Durasi') < 0; }); if (g.length) throw new Error(g[0]); if (patch.kataKunci !== undefined) patch.kataKunci = bersihkanKata(patch.kataKunci); var ulang = c.moderasi && ((patch.judul && patch.judul !== ik.judul) || (patch.kataKunci && patch.kataKunci.join() !== (ik.kataKunci || []).join())); return d.update('iklan', id, Object.assign({}, patch, ulang ? { status:'moderasi' } : {}, patch.bid ? { bid:Math.round(Number(patch.bid)) } : {}, patch.anggaranHarian ? { anggaranHarian:Math.round(Number(patch.anggaranHarian)) } : {})); }
  function jeda(id) { var d = db(), ik = iklan(id); if (!ik || ik.status !== 'aktif') throw new Error('Hanya iklan aktif yang bisa dijeda'); return d.update('iklan', id, { status:'dijeda' }); }
  function lanjut(id) { var d = db(), ik = iklan(id); if (!ik || ['dijeda', 'habis'].indexOf(ik.status) < 0) throw new Error('Iklan tidak bisa dilanjutkan'); if (saldoIklan(ik.tokoId) < ik.bid) throw new Error('Saldo iklan kurang — isi saldo dulu'); return d.update('iklan', id, { status:'aktif' }); }
  function hapus(id) { var d = db(), ik = iklan(id); if (!ik) return false; if (ik.klik > 0) return d.update('iklan', id, { status:'selesai' }); d.remove('iklan', id); return true; }
  /* Admin: setujui / tolak. */
  function putus(id, status, alasan, oleh) { var d = db(), ik = iklan(id); if (!ik) throw new Error('Iklan tidak ditemukan'); if (status === 'ditolak' && !String(alasan || '').trim()) throw new Error('Alasan penolakan wajib diisi'); return d.update('iklan', id, { status:status === 'ditolak' ? 'ditolak' : 'aktif', alasanTolak:status === 'ditolak' ? String(alasan).trim() : '', diputusOleh:oleh || '', diputusAt:kini() }); }

  /* ---------- penayangan ---------- */
  function segarkanHari(ik) { var t = hariIni(); if (!ik.hariIni || ik.hariIni.tgl !== t) { ik.hariIni = { tgl:t, biaya:0, klik:0 }; var d = db(); if (d) d.update('iklan', ik.id, { hariIni:ik.hariIni }); } return ik; }
  function layak(ik) {
    if (ik.status !== 'aktif') return false; var t = hariIni(); if (ik.mulai > t || ik.sampai < t) return false;
    segarkanHari(ik); if (ik.hariIni.biaya + ik.bid > ik.anggaranHarian) return false;
    if (saldoIklan(ik.tokoId) < ik.bid) return false;
    if (ik.jenis === 'produk') { var p = T().produk(ik.produkId); if (!p || p.status !== 'aktif') return false; }
    var tk = T().toko(ik.tokoId); return !!tk && tk.status === 'aktif' && !tk.tutupSementara;
  }
  function cocok(ik, q) {
    var p = ik.jenis === 'produk' ? T().produk(ik.produkId) : null, cari = String(q.cari || '').trim().toLowerCase();
    if (q.kecualiToko && ik.tokoId === q.kecualiToko) return false;
    if (q.kecualiProduk && ik.produkId === q.kecualiProduk) return false;
    if (cari) { var teks = [ik.judul].concat(ik.kataKunci || [], p ? [p.nama, p.merek || '', T().namaKategori(p.kategori)] : []).join(' ').toLowerCase(); return cari.split(/\s+/).some(function (w) { return w && teks.indexOf(w) >= 0; }); }
    if (q.kategori && q.kategori !== 'semua') return !!p && p.kategori === q.kategori || (ik.kataKunci || []).indexOf(q.kategori) >= 0;
    return true;
  }
  function skor(ik) { var ctr = ik.tayang ? ik.klik / ik.tayang : 0.02; return ik.bid * (0.5 + Math.min(ctr, 0.3) * 5) * (0.9 + Math.random() * 0.2); }
  /* Pilih iklan untuk slot; mencatat tayang. Kembalikan [{ iklan, produk, toko }]. */
  function pilih(konteks, q, n) {
    var c = pengaturan(); if (!c.aktif) return []; semai(); q = q || {}; n = n || (konteks === 'beranda' ? c.slotBeranda : konteks === 'produk' ? c.slotProduk : c.slotCari); if (n <= 0) return [];
    var d = db(), kandidat = daftarIklan().filter(function (ik) { return layak(ik) && cocok(ik, q); }).map(function (ik) { return { ik:ik, s:skor(ik) }; }).sort(function (a, b) { return b.s - a.s; });
    var dipilihToko = {}, out = [];
    kandidat.forEach(function (k) { if (out.length >= n || dipilihToko[k.ik.tokoId]) return; dipilihToko[k.ik.tokoId] = 1; out.push(k.ik); });
    out.forEach(function (ik) { d.update('iklan', ik.id, { tayang:(ik.tayang || 0) + 1 }); catatHarian(ik, 'tayang', 0); });
    return out.map(function (ik) { var tk = T().toko(ik.tokoId), p = ik.jenis === 'produk' ? T().produk(ik.produkId) : (T().produkToko(ik.tokoId).filter(function (x) { return x.status === 'aktif'; })[0] || null); return { iklan:ik, produk:p, toko:tk }; });
  }
  function catatHarian(ik, jenis, biaya) { var d = db(), t = hariIni(), r = d.all('iklanHarian').filter(function (x) { return x.iklanId === ik.id && x.tgl === t; })[0]; if (!r) r = d.insert('iklanHarian', { tgl:t, tokoId:ik.tokoId, iklanId:ik.id, tayang:0, klik:0, biaya:0, konversi:0 }); var patch = {}; if (jenis === 'tayang') patch.tayang = r.tayang + 1; if (jenis === 'klik') { patch.klik = r.klik + 1; patch.biaya = r.biaya + biaya; } if (jenis === 'konversi') patch.konversi = (r.konversi || 0) + 1; d.update('iklanHarian', r.id, patch); }
  /* Klik: potong saldo sebesar bid; simpan jejak klik untuk atribusi konversi 7 hari. */
  function klik(id) {
    var d = db(), ik = iklan(id); if (!ik || !layak(ik)) return null; segarkanHari(ik);
    var patch = { klik:(ik.klik || 0) + 1, biaya:(ik.biaya || 0) + ik.bid, hariIni:{ tgl:ik.hariIni.tgl, biaya:ik.hariIni.biaya + ik.bid, klik:ik.hariIni.klik + 1 } };
    d.update('iklan', id, patch); catatHarian(ik, 'klik', ik.bid);
    if (saldoIklan(ik.tokoId) < ik.bid) d.update('iklan', id, { status:'habis' });
    try { var m = JSON.parse(localStorage.getItem(KUNCI_KLIK) || '{}'); if (ik.produkId) m[ik.produkId] = { iklanId:id, at:Date.now() }; m['toko:' + ik.tokoId] = { iklanId:id, at:Date.now() }; localStorage.setItem(KUNCI_KLIK, JSON.stringify(m)); } catch (e) { /* abaikan */ }
    return d.find('iklan', id);
  }
  /* Konversi: dipanggil setelah checkout — pesanan yang produknya/tokonya diklik dari iklan ≤ 7 hari dihitung sebagai konversi. */
  function konversi(pesanan) {
    var d = db(); if (!d) return; var m; try { m = JSON.parse(localStorage.getItem(KUNCI_KLIK) || '{}'); } catch (e) { m = {}; }
    (pesanan || []).forEach(function (o) { var hit = null; (o.items || []).forEach(function (it) { var j = m[it.produkId]; if (j && Date.now() - j.at < 7 * 86400000) hit = hit || j; }); var jt = m['toko:' + o.tokoId]; if (!hit && jt && Date.now() - jt.at < 7 * 86400000) hit = jt; if (!hit) return; var ik = iklan(hit.iklanId); if (!ik) return; d.update('iklan', ik.id, { konversi:(ik.konversi || 0) + 1, nilaiKonversi:(ik.nilaiKonversi || 0) + (o.subtotal || 0) }); catatHarian(ik, 'konversi', 0); });
  }

  /* ---------- laporan ---------- */
  function laporanToko(tokoId) {
    var ds = daftarIklan(tokoId), t = { tayang:0, klik:0, biaya:0, konversi:0, nilai:0 }; ds.forEach(function (i) { t.tayang += i.tayang || 0; t.klik += i.klik || 0; t.biaya += i.biaya || 0; t.konversi += i.konversi || 0; t.nilai += i.nilaiKonversi || 0; });
    t.ctr = t.tayang ? Math.round(t.klik / t.tayang * 1000) / 10 : 0; t.roas = t.biaya ? Math.round(t.nilai / t.biaya * 10) / 10 : 0; t.saldo = saldoIklan(tokoId); t.aktif = ds.filter(function (i) { return i.status === 'aktif'; }).length; t.iklan = ds; t.topup = topupToko(tokoId).slice().reverse();
    var d = db(), batas = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10); t.biaya7 = d ? d.all('iklanHarian').filter(function (x) { return x.tokoId === tokoId && x.tgl >= batas; }).reduce(function (n, x) { return n + x.biaya; }, 0) : 0;
    return t;
  }
  function ringkasanAdmin() {
    var d = db(), ds = daftarIklan(), tp = d ? d.all('iklanTopup') : [], masuk = tp.filter(function (t) { return t.status === 'dibayar'; }).reduce(function (n, t) { return n + t.jumlah; }, 0), pakai = ds.reduce(function (n, i) { return n + (i.biaya || 0); }, 0);
    var bulan = kini().slice(0, 7), bulanIni = d ? d.all('iklanHarian').filter(function (x) { return x.tgl.slice(0, 7) === bulan; }).reduce(function (n, x) { return n + x.biaya; }, 0) : 0;
    return { iklan:ds, aktif:ds.filter(function (i) { return i.status === 'aktif'; }).length, moderasi:ds.filter(function (i) { return i.status === 'moderasi'; }), pendapatan:pakai, pendapatanBulan:bulanIni, kredit:masuk - pakai, topup:tp.slice().reverse(), tayang:ds.reduce(function (n, i) { return n + (i.tayang || 0); }, 0), klik:ds.reduce(function (n, i) { return n + (i.klik || 0); }, 0), tokoBeriklan:Object.keys(ds.reduce(function (m, i) { m[i.tokoId] = 1; return m; }, {})).length };
  }

  /* ---------- contoh awal (sekali, hanya bila toko contoh ada) ---------- */
  var sudahSemai = false;
  function semai() {
    if (sudahSemai) return; sudahSemai = true; var d = db(); if (!d || !T() || d.all('iklan').length) return; var tk = T().semuaToko().filter(function (t) { return t.status === 'aktif'; }).slice(0, 2); if (tk.length < 2) return;
    tk.forEach(function (t, i) { d.insert('iklanTopup', { tokoId:t.id, jumlah:200000, sumber:'saldo', status:'dibayar', ref:'contoh', oleh:'contoh', at:kini(), contoh:true }); var p = T().produkToko(t.id).filter(function (x) { return x.status === 'aktif'; })[0]; if (!p) return; var kl = 18 + i * 9, bid = 300 + i * 150; d.insert('iklan', { tokoId:t.id, jenis:i ? 'toko' : 'produk', produkId:p.id, judul:i ? t.nama + ' — grosir untuk mitra' : p.nama + ' promo', kataKunci:[T().namaKategori(p.kategori).toLowerCase(), p.nama.split(' ')[0].toLowerCase(), 'sop'], bid:bid, anggaranHarian:25000, mulai:hariIni(), sampai:new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10), status:'aktif', tayang:kl * 24, klik:kl, biaya:kl * bid, konversi:Math.round(kl / 6), nilaiKonversi:Math.round(kl / 6) * p.harga, hariIni:{ tgl:hariIni(), biaya:0, klik:0 }, alasanTolak:'', oleh:'contoh', at:kini(), contoh:true }); });
  }

  if (window.EXO_PERSETUJUAN) { try { EXO_PERSETUJUAN.TINGKAT['iklan-setelan'] = 'sedang'; EXO_PERSETUJUAN.daftarkanPenerap('iklan-setelan', function (u) { return simpanPengaturan(u.muatan); }); } catch (e) { /* konsol admin saja */ } }
  return { BAWAAN:BAWAAN, STATUS:STATUS, rp:rp, pengaturan:pengaturan, simpanPengaturan:simpanPengaturan, saldoIklan:saldoIklan, topup:topup, topupToko:topupToko, daftarIklan:daftarIklan, iklan:iklan, periksa:periksa, buat:buat, ubah:ubah, jeda:jeda, lanjut:lanjut, hapus:hapus, putus:putus, layak:layak, pilih:pilih, klik:klik, konversi:konversi, laporanToko:laporanToko, ringkasanAdmin:ringkasanAdmin, semai:semai };
})();
