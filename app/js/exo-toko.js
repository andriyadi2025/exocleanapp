/* ==========================================================================
   exo-toko.js — mesin marketplace perlengkapan EXOCLEAN (pola Tokopedia)
   --------------------------------------------------------------------------
   Tiga pihak memakai mesin yang sama:
     · PEMBELI (aplikasi pelanggan): jelajah produk, keranjang per toko, kupon,
       ongkir, bayar EXO Wallet, lacak pesanan, ulasan, komplain/retur.
     · MITRA TOKO (Seller Center di aplikasi): beranda & skor toko, pesanan
       (baru → diproses → dikirim → selesai), produk + varian + stok +
       etalase, promosi (kupon toko, diskon, flash sale), chat & ulasan,
       keuangan (saldo, biaya layanan, penarikan), statistik, pengaturan toko
       (profil, jam operasional, kurir, template balasan).
     · ADMIN (konsol): verifikasi toko, moderasi produk, komisi & pencairan
       (lewat Persetujuan), komplain & retur, penalti skor toko.

   Aturan yang dipegang (meniru Tokopedia Seller Center):
     · Biaya layanan platform dipotong dari harga barang saat pesanan
       SELESAI, bukan saat dibayar; ongkir diteruskan utuh ke toko/kurir.
     · Dana pembeli ditahan platform sampai pesanan selesai (atau otomatis
       3 hari setelah dikirim) — retur/komplain menahan pencairan.
     · Skor toko: rating produk, kecepatan proses (< 1 hari), tingkat batal,
       balas chat; poin penalti mengurangi skor; badge Power Merchant bila
       skor ≥ 85 dan ≥ 20 pesanan selesai.
   Data: tabel toko, produk, pesananToko, kuponToko, ulasanProduk, chatToko,
   penarikanToko, komplainToko di EXO_DB. Benih deterministik saat kosong.
   ========================================================================== */
var EXO_TOKO = (function () {
  'use strict';
  var BIAYA_LAYANAN = 0.05, TAHAN_OTOMATIS_HARI = 3;
  var KATEGORI = [['chemical','Chemical'],['alat','Alat kebersihan'],['apd','APD'],['habis','Habis pakai'],['mesin','Mesin & elektronik']];
  var KURIR = [['reguler','Reguler · 2–3 hari',12000],['kilat','Kilat · besok sampai',25000],['ambil','Ambil di toko',0]];
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function uid(p) { return (window.EXO_UTIL && EXO_UTIL.uid) ? EXO_UTIL.uid(p) : p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function acak(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function hariLalu(n, jam) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(jam || 10, 0, 0, 0); return d.toISOString(); }
  function namaKategori(k) { for (var i = 0; i < KATEGORI.length; i++) if (KATEGORI[i][0] === k) return KATEGORI[i][1]; return k; }
  function kurir(id) { for (var i = 0; i < KURIR.length; i++) if (KURIR[i][0] === id) return { id:KURIR[i][0], nama:KURIR[i][1], harga:KURIR[i][2] }; return { id:'reguler', nama:KURIR[0][1], harga:KURIR[0][2] }; }

  /* ------------------------------------------------------------ benih */
  function semai() {
    var d = db(); if (!d || d.all('toko').length) return false;
    var T = [
      { nama:'EXOCLEAN Official Store', slug:'exoclean-official', deskripsi:'Perlengkapan standar SOP EXOCLEAN: chemical berlabel takaran, microfiber kode warna, APD.', kota:'Jakarta Selatan', alamat:'Jl. Kemang Raya 8, Bangka, Mampang Prapatan', kodePos:'12730', lat:-6.2607, lng:106.8140, telp:'081234567001', badge:'official', status:'aktif', jamBuka:'08:00–20:00', kurir:['reguler','kilat','ambil'], catatan:'Pesanan sebelum 14:00 dikirim hari yang sama.', templateBalasan:['Terima kasih, pesanan sedang kami siapkan.','Resi sudah diinput, mohon ditunggu ya.'], pemilikId:null, pemilikNama:'PT EXO POINT', daftarAt:hariLalu(120), skorDasar:96 },
      { nama:'Kimia Bersih Nusantara', slug:'kimia-bersih', deskripsi:'Distributor chemical pembersih profesional. Grosir untuk mitra & gedung.', kota:'Kota Tangerang Selatan', alamat:'Ruko BSD Sektor 7 Blok RL 12, Lengkong Gudang', kodePos:'15310', lat:-6.3010, lng:106.6650, telp:'081234567011', badge:'power', status:'aktif', jamBuka:'09:00–18:00', kurir:['reguler','kilat'], catatan:'Grosir ≥ 10 pcs hubungi chat untuk harga khusus.', templateBalasan:['Halo kak, stok tersedia. Silakan checkout.','Untuk grosir kami beri harga khusus, cek chat ya.'], pemilikId:null, pemilikNama:'Bagus Hermawan', daftarAt:hariLalu(80), skorDasar:88 },
      { nama:'Toko Alat Kebersihan Sejahtera', slug:'alat-sejahtera', deskripsi:'Mop, ember, sikat, vacuum, dan sparepart mesin poles.', kota:'Depok', alamat:'Jl. Margonda Raya 210, Kemiri Muka', kodePos:'16423', lat:-6.3810, lng:106.8320, telp:'081234567021', badge:'reguler', status:'aktif', jamBuka:'09:00–17:00', kurir:['reguler','ambil'], catatan:'', templateBalasan:['Terima kasih sudah berbelanja.'], pemilikId:null, pemilikNama:'Sri Rahayu', daftarAt:hariLalu(40), skorDasar:74 },
      { nama:'APD Mandiri', slug:'apd-mandiri', deskripsi:'Sarung tangan, masker, sepatu safety, goggles.', kota:'Bekasi', alamat:'Jl. Ahmad Yani 5, Marga Jaya', kodePos:'17141', lat:-6.2450, lng:106.9930, telp:'081234567031', badge:'reguler', status:'menunggu', jamBuka:'09:00–17:00', kurir:['reguler'], catatan:'', templateBalasan:[], pemilikId:null, pemilikNama:'Dedi Kurniawan', daftarAt:hariLalu(2), skorDasar:0 }
    ];
    var peta = {}; T.forEach(function (t) { var r = d.insert('toko', Object.assign({ poinPenalti:0, saldoDitarik:0 }, t)); peta[t.slug] = r.id; });
    var P = [
      ['exoclean-official','Pembersih lantai multi-purpose EXO 5 L','chemical',85000,60,'Takaran 1:40 · aman untuk keramik, vinyl, marmer. Sesuai SOP D-001.',[['5 L',85000,60],['1 L',22000,120]],'Chemical SOP',true,'🧴',312,4.8],
      ['exoclean-official','Degreaser dapur EXO 5 L','chemical',120000,35,'1:10, kontak 5 menit. Angkat lemak hood & backsplash.',[['5 L',120000,35]],'Chemical SOP',true,'🧴',188,4.7],
      ['exoclean-official','Desinfektan permukaan EXO 5 L','chemical',95000,48,'1:100 · food-grade untuk meja makan & mainan anak.',[['5 L',95000,48]],'Chemical SOP',false,'🧴',201,4.9],
      ['exoclean-official','Lap microfiber kode warna (set 4 warna, 12 pcs)','alat',60000,90,'Biru umum, merah toilet, hijau dapur, kuning kamar mandi.',[['12 pcs',60000,90],['24 pcs',110000,40]],'Alat SOP',true,'🧻',540,4.9],
      ['exoclean-official','Sarung tangan nitril EXO (box 100)','apd',65000,25,'Bebas lateks, tebal 4 mil. Ukuran S/M/L.',[['S',65000,8],['M',65000,10],['L',65000,7]],'APD',false,'🧤',420,4.6],
      ['exoclean-official','Masker 3 lapis (box 50)','apd',35000,80,'Earloop, BFE 98%.',[['Box 50',35000,80]],'APD',false,'😷',760,4.7],
      ['kimia-bersih','Penghilang kerak kamar mandi 1 L','chemical',48000,70,'Asam ringan, aman porselen. Kontak 3 menit.',[['1 L',48000,70],['5 L',190000,15]],'Kamar mandi',true,'🧴',133,4.6],
      ['kimia-bersih','Pembersih kaca & cermin 1 L','chemical',32000,110,'Bebas amonia, tanpa bekas.',[['1 L',32000,110]],'Umum',false,'🧴',98,4.5],
      ['kimia-bersih','Klorin pemutih 5 L','chemical',70000,30,'JANGAN dicampur asam/amonia. Untuk area basah non-logam.',[['5 L',70000,30]],'Umum',false,'⚠️',61,4.4],
      ['kimia-bersih','Cairan pembersih evaporator AC 500 ml','chemical',58000,44,'Busa aktif, bilas air. Untuk D-014.',[['500 ml',58000,44]],'AC',true,'❄️',210,4.7],
      ['alat-sejahtera','Mop set + ember pemeras 20 L','alat',185000,18,'Ember dua sekat, mop microfiber 40 cm.',[['Biru',185000,10],['Merah',185000,8]],'Lantai',true,'🪣',77,4.5],
      ['alat-sejahtera','Sikat nat & scraper set','alat',45000,60,'Sikat nilon keras + scraper plastik anti gores.',[['Set',45000,60]],'Kamar mandi',false,'🧹',150,4.6],
      ['alat-sejahtera','Vacuum basah-kering 1200 W','mesin',1450000,6,'Tangki 20 L, kabel 6 m, garansi 1 tahun.',[['Unit',1450000,6]],'Mesin',true,'🔌',24,4.3],
      ['alat-sejahtera','Pad poles 17" (set 5 warna)','alat',145000,14,'Untuk mesin poles single disc.',[['Set',145000,14]],'Mesin',false,'⭕',31,4.2],
      ['exoclean-official','Kantong sampah 60 L (roll 20)','habis',28000,200,'Tebal 30 mikron, hitam.',[['Roll 20',28000,200],['Roll 50',60000,80]],'Habis pakai',false,'🗑️',890,4.8]
    ];
    var prodIds = [];
    P.forEach(function (x, i) { var r = d.insert('produk', { tokoId:peta[x[0]], nama:x[1], kategori:x[2], harga:x[3], stok:x[4], deskripsi:x[5], varian:x[6].map(function (v) { return { nama:v[0], harga:v[1], stok:v[2] }; }), etalase:x[7], unggulan:x[8], ikon:x[9], terjual:x[10], rating:x[11], status:'aktif', berat:500 + Math.round(acak(i) * 4000), diskonPct:i % 5 === 0 ? 10 : 0, createdAt:hariLalu(60 - i) }); prodIds.push(r); });
    /* pesanan contoh */
    var pembeli = ['Dewi Anggraini','Rangga Pratama','Maya Sari','Intan Kusuma','Farah Nabila','PT Karya Mitra'], status = ['selesai','selesai','selesai','dikirim','diproses','baru','selesai','komplain','dibatalkan','selesai','selesai','baru'];
    for (var k = 0; k < 12; k++) {
      var pr = prodIds[(k * 3) % prodIds.length], qty = 1 + Math.floor(acak(k + 7) * 3), v = pr.varian[0], sub = v.harga * qty, kr = kurir(k % 3 === 0 ? 'kilat' : 'reguler'), total = sub + kr.harga;
      d.insert('pesananToko', { no:'TK-' + (240 + k), tokoId:pr.tokoId, pembeliId:null, pembeliNama:pembeli[k % pembeli.length], items:[{ produkId:pr.id, nama:pr.nama, varian:v.nama, qty:qty, harga:v.harga, ikon:pr.ikon }], subtotal:sub, ongkir:kr.harga, diskon:0, total:total, biayaLayanan:Math.round(sub * BIAYA_LAYANAN), kurir:kr.nama, resi:status[k] === 'dikirim' || status[k] === 'selesai' ? 'EXO' + (883100 + k) : '', status:status[k], alamat:'Kemang Residence 12B, Jakarta Selatan', catatan:'', at:hariLalu(11 - k, 9), diprosesAt:status[k] !== 'baru' ? hariLalu(11 - k, 13) : null, dikirimAt:['dikirim','selesai','komplain'].indexOf(status[k]) >= 0 ? hariLalu(10 - k, 16) : null, selesaiAt:status[k] === 'selesai' ? hariLalu(8 - k, 12) : null, contoh:true });
    }
    /* kupon, ulasan, chat, komplain */
    d.insert('kuponToko', { tokoId:peta['exoclean-official'], kode:'SOPHEMAT', jenis:'persen', nilai:10, minBelanja:150000, kuota:200, terpakai:64, aktif:true, sampai:'2026-09-30' });
    d.insert('kuponToko', { tokoId:peta['kimia-bersih'], kode:'ONGKIRKB', jenis:'ongkir', nilai:12000, minBelanja:100000, kuota:100, terpakai:22, aktif:true, sampai:'2026-09-15' });
    d.insert('kuponToko', { tokoId:peta['alat-sejahtera'], kode:'MOP20', jenis:'potongan', nilai:20000, minBelanja:150000, kuota:50, terpakai:3, aktif:true, sampai:'2026-10-31' });
    [[0,'Dewi Anggraini',5,'Takaran jelas, lantai kesat. Repeat order.'],[3,'Maya Sari',5,'Kode warna memudahkan tim, tebal.'],[6,'Rangga Pratama',4,'Kerak hilang, bau agak menyengat.'],[10,'Intan Kusuma',4,'Pemeras kuat, ember agak tipis.'],[12,'PT Karya Mitra',4,'Daya hisap bagus, kabel pendek untuk gedung.']].forEach(function (u, i) { d.insert('ulasanProduk', { produkId:prodIds[u[0]].id, tokoId:prodIds[u[0]].tokoId, pembeliNama:u[1], bintang:u[2], teks:u[3], balasan:i === 0 ? 'Terima kasih kak, ditunggu order berikutnya!' : '', at:hariLalu(20 - i * 3) }); });
    d.insert('chatToko', { tokoId:peta['kimia-bersih'], pembeliNama:'Farah Nabila', pesan:[{ dari:'pembeli', teks:'Kak, degreaser 5 L kalau ambil 10 ada harga khusus?', at:hariLalu(0, 8) }], belumDibaca:1 });
    d.insert('chatToko', { tokoId:peta['exoclean-official'], pembeliNama:'Dewi Anggraini', pesan:[{ dari:'pembeli', teks:'Microfiber 24 pcs restock kapan?', at:hariLalu(1, 15) }, { dari:'toko', teks:'Halo kak, restock besok siang ya.', at:hariLalu(1, 16) }], belumDibaca:0 });
    var kompl = d.all('pesananToko').filter(function (o) { return o.status === 'komplain'; })[0];
    if (kompl) d.insert('komplainToko', { pesananId:kompl.id, tokoId:kompl.tokoId, pembeliNama:kompl.pembeliNama, jenis:'barang rusak', isi:'Botol bocor saat diterima, isi berkurang separuh.', foto:1, status:'menunggu-toko', at:hariLalu(2, 11), solusi:'' });
    return true;
  }

  /* ------------------------------------------------------------ katalog */
  function semuaToko() { var d = db(); if (d) semai(); return d ? d.all('toko') : []; }
  function toko(id) { var d = db(); return d ? d.find('toko', id) : null; }
  function produkToko(tokoId, semuaStatus) { var d = db(); return d ? d.all('produk').filter(function (p) { return p.tokoId === tokoId && (semuaStatus || p.status === 'aktif'); }) : []; }
  function katalog(q, kategori) {
    var d = db(); if (d) semai(); var aktifToko = {}; semuaToko().forEach(function (t) { if (t.status === 'aktif') aktifToko[t.id] = t; });
    var s = String(q || '').toLowerCase();
    return (d ? d.all('produk') : []).filter(function (p) { return p.status === 'aktif' && aktifToko[p.tokoId] && (!kategori || kategori === 'semua' || p.kategori === kategori) && (!s || p.nama.toLowerCase().indexOf(s) >= 0 || (p.deskripsi || '').toLowerCase().indexOf(s) >= 0); }).map(function (p) { return Object.assign({ toko:aktifToko[p.tokoId] }, p); }).sort(function (a, b) { return (b.unggulan - a.unggulan) || (b.terjual - a.terjual); });
  }
  function produk(id) { var d = db(); var p = d ? d.find('produk', id) : null; if (!p) return null; return Object.assign({ toko:toko(p.tokoId) }, p); }
  function hargaSetelahDiskon(p, v) { var dasar = v ? v.harga : p.harga; return p.diskonPct ? Math.round(dasar * (100 - p.diskonPct) / 100 / 100) * 100 : dasar; }
  function ulasan(produkId) { var d = db(); return d ? d.all('ulasanProduk').filter(function (u) { return u.produkId === produkId; }).slice().reverse() : []; }

  /* ------------------------------------------------------------ keranjang & checkout */
  /* Opsi kurir untuk satu toko: tarif langsung dari kirim-server (Biteship)
     bila tersedia di peta tarif, kalau tidak tabel statis; "Ambil di toko"
     selalu ikut bila toko melayaninya. */
  function opsiKurir(t, tarif) {
    var daftar = tarif && tarif[t.id] && tarif[t.id].length ? tarif[t.id].slice() : KURIR.filter(function (k) { return k[0] !== 'ambil' && (t.kurir || ['reguler']).indexOf(k[0]) >= 0; }).map(function (k) { return { id:k[0], nama:k[1], harga:k[2], statis:true }; });
    if (!daftar.length) daftar.push({ id:'reguler', nama:KURIR[0][1], harga:KURIR[0][2], statis:true });
    if ((t.kurir || []).indexOf('ambil') >= 0) daftar.push({ id:'ambil', nama:'Ambil di toko', harga:0, statis:true });
    return daftar;
  }
  function hitungKeranjang(items, kuponKode, kurirId, tarif) {
    var perToko = {}, d = db();
    (items || []).forEach(function (it) { var p = produk(it.produkId); if (!p) return; var v = (p.varian || []).filter(function (x) { return x.nama === it.varian; })[0] || p.varian[0] || { nama:'', harga:p.harga, stok:p.stok }; var g = perToko[p.tokoId] = perToko[p.tokoId] || { toko:p.toko, items:[], subtotal:0, ongkir:0, diskon:0, total:0, kupon:null, galat:[], peringatan:'' }; var harga = hargaSetelahDiskon(p, v), sub = harga * it.qty; if (it.qty > v.stok) g.galat.push(p.nama + ' (' + v.nama + ') stok hanya ' + v.stok); g.items.push({ produkId:p.id, nama:p.nama, varian:v.nama, qty:it.qty, harga:harga, ikon:p.ikon, berat:p.berat || 500 }); g.subtotal += sub; });
    Object.keys(perToko).forEach(function (tid) {
      var g = perToko[tid], opsi = opsiKurir(g.toko, tarif), pilih = typeof kurirId === 'object' && kurirId ? kurirId[tid] : kurirId;
      var kr = opsi.filter(function (o) { return o.id === pilih; })[0] || opsi[0];
      g.opsiKurir = opsi; g.kurir = kr; g.ongkir = kr.harga; g.berat = g.items.reduce(function (n, it) { return n + it.berat * it.qty; }, 0);
      if (kuponKode) { var k = d ? d.all('kuponToko').filter(function (x) { return x.tokoId === tid && x.aktif && x.kode.toUpperCase() === String(kuponKode).toUpperCase() && x.terpakai < x.kuota && (!x.sampai || x.sampai >= new Date().toISOString().slice(0, 10)); })[0] : null;
        if (k) { if (g.subtotal >= k.minBelanja) { g.kupon = k; g.diskon = k.jenis === 'persen' ? Math.round(g.subtotal * k.nilai / 100) : k.jenis === 'ongkir' ? Math.min(k.nilai, g.ongkir) : k.nilai; } else g.peringatan = 'Kupon ' + k.kode + ' butuh belanja minimal ' + rp(k.minBelanja) + ' di toko ini — belum dipotong'; } }
      g.total = Math.max(0, g.subtotal + g.ongkir - g.diskon);
    });
    var daftar = Object.keys(perToko).map(function (k) { return perToko[k]; });
    return { toko:daftar, total:daftar.reduce(function (n, g) { return n + g.total; }, 0), galat:daftar.reduce(function (a, g) { return a.concat(g.galat); }, []), peringatan:daftar.map(function (g) { return g.peringatan; }).filter(Boolean) };
  }
  /* Membuat pesanan per toko setelah pembayaran dompet berhasil di lapisan pemanggil. */
  function checkout(items, kuponKode, kurirId, pembeli, alamat, catatan, tarif) {
    var d = db(), h = hitungKeranjang(items, kuponKode, kurirId, tarif); if (h.galat.length) throw new Error(h.galat[0]);
    var dibuat = [];
    h.toko.forEach(function (g) {
      var n = d.nextNo('pesananToko'), o = d.insert('pesananToko', { no:'TK-' + (1000 + n), tokoId:g.toko.id, pembeliId:pembeli.id || null, pembeliNama:pembeli.nama, items:g.items, subtotal:g.subtotal, ongkir:g.ongkir, diskon:g.diskon, kupon:g.kupon ? g.kupon.kode : '', total:g.total, biayaLayanan:Math.round(g.subtotal * BIAYA_LAYANAN), kurir:g.kurir.nama, kurirId:g.kurir.id, kurirKode:g.kurir.kurir || '', layanan:g.kurir.layanan || '', kurirEtd:g.kurir.etd || '', berat:g.berat, resi:'', status:'baru', alamat:alamat, titik:pembeli.titik || null, pembeliTelp:pembeli.telp || '', catatan:catatan || '', bayar:'wallet', at:kini(), contoh:false });
      g.items.forEach(function (it) { var p = d.find('produk', it.produkId); if (!p) return; var vr = (p.varian || []).map(function (v) { if (v.nama === it.varian) v.stok = Math.max(0, v.stok - it.qty); return v; }); d.update('produk', p.id, { varian:vr, stok:vr.reduce(function (s, v) { return s + v.stok; }, 0), terjual:(p.terjual || 0) + it.qty }); });
      if (g.kupon) d.update('kuponToko', g.kupon.id, { terpakai:(g.kupon.terpakai || 0) + 1 });
      dibuat.push(o);
    });
    if (d.log) d.log(pembeli.id || null, 'Belanja perlengkapan ' + dibuat.map(function (o) { return o.no; }).join(', ') + ' · ' + rp(h.total), 'toko', dibuat[0] && dibuat[0].id);
    return { pesanan:dibuat, total:h.total };
  }
  function pesananPembeli(pembeliNama, pembeliId) { var d = db(); return d ? d.all('pesananToko').filter(function (o) { return (pembeliId && o.pembeliId === pembeliId) || o.pembeliNama === pembeliNama; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function pesanan(id) { var d = db(); return d ? d.find('pesananToko', id) : null; }
  var ALUR_STATUS = ['baru','diproses','dikirim','selesai'];
  function labelStatus(s) { return { baru:'Menunggu diproses', diproses:'Sedang disiapkan', dikirim:'Dalam pengiriman', selesai:'Selesai', dibatalkan:'Dibatalkan', komplain:'Komplain / retur' }[s] || s; }
  /* transisi oleh toko */
  function proses(id) { var d = db(), o = pesanan(id); if (!o || o.status !== 'baru') throw new Error('Pesanan tidak menunggu diproses'); return d.update('pesananToko', id, { status:'diproses', diprosesAt:kini() }); }
  function kirim(id, resi) { var d = db(), o = pesanan(id); if (!o || o.status !== 'diproses') throw new Error('Pesanan belum diproses'); if (!resi || String(resi).length < 6) throw new Error('Nomor resi minimal 6 karakter'); return d.update('pesananToko', id, { status:'dikirim', resi:String(resi).trim(), dikirimAt:kini() }); }
  /* Pesanan kirim dari kirim-server: simpan resi/status, dan ikuti status
     kurir (dikirim → selesai otomatis saat 'delivered'; retur/gagal ditandai). */
  function simpanPengiriman(id, info) { var d = db(), o = pesanan(id); if (!o) return null; var patch = { pengiriman:Object.assign({}, o.pengiriman || {}, info, { diperbarui:kini() }) }; var resi = info.resi || info.trackingId || info.orderId; if (resi && !o.resi) patch.resi = String(resi); if (o.status === 'diproses' && (patch.resi || o.resi)) { patch.status = 'dikirim'; patch.dikirimAt = kini(); } return d.update('pesananToko', id, patch); }
  function terapkanStatusKurir(id, info) { var d = db(), o = pesanan(id); if (!o) return null; var patch = { pengiriman:Object.assign({}, o.pengiriman || {}, info, { diperbarui:kini() }) }; if (info.resi) patch.resi = info.resi; if (info.status === 'dikirim' && o.status === 'diproses') { patch.status = 'dikirim'; patch.dikirimAt = kini(); } if (info.status === 'selesai' && (o.status === 'dikirim' || o.status === 'diproses')) { patch.status = 'selesai'; patch.selesaiAt = kini(); patch.otomatis = true; if (!o.dikirimAt) patch.dikirimAt = kini(); } if ((info.status === 'retur' || info.status === 'gagal') && o.status !== 'selesai') patch.masalahKurir = info.statusKurir || info.status; return d.update('pesananToko', id, patch); }
  function tolak(id, alasan) { var d = db(), o = pesanan(id); if (!o || o.status === 'selesai' || o.status === 'dibatalkan') throw new Error('Pesanan tidak bisa ditolak'); kembalikanStok(o); return d.update('pesananToko', id, { status:'dibatalkan', alasanBatal:alasan || 'Ditolak toko', dibatalkanAt:kini(), refund:o.total }); }
  function kembalikanStok(o) { var d = db(); (o.items || []).forEach(function (it) { var p = d.find('produk', it.produkId); if (!p) return; var vr = (p.varian || []).map(function (v) { if (v.nama === it.varian) v.stok += it.qty; return v; }); d.update('produk', p.id, { varian:vr, stok:vr.reduce(function (s, v) { return s + v.stok; }, 0) }); }); }
  /* oleh pembeli */
  function terima(id) { var d = db(), o = pesanan(id); if (!o || o.status !== 'dikirim') throw new Error('Pesanan belum dikirim'); return d.update('pesananToko', id, { status:'selesai', selesaiAt:kini() }); }
  function batalPembeli(id) { var d = db(), o = pesanan(id); if (!o || o.status !== 'baru') throw new Error('Hanya pesanan yang belum diproses yang bisa dibatalkan'); kembalikanStok(o); return d.update('pesananToko', id, { status:'dibatalkan', alasanBatal:'Dibatalkan pembeli', dibatalkanAt:kini(), refund:o.total }); }
  function komplain(id, jenis, isi, pembeliNama) { var d = db(), o = pesanan(id); if (!o || o.status !== 'dikirim' && o.status !== 'selesai') throw new Error('Komplain hanya untuk pesanan yang sudah dikirim'); d.update('pesananToko', id, { status:'komplain' }); return d.insert('komplainToko', { pesananId:id, tokoId:o.tokoId, pembeliNama:pembeliNama || o.pembeliNama, jenis:jenis, isi:isi, status:'menunggu-toko', at:kini(), solusi:'' }); }
  function selesaikanKomplain(komplainId, solusi, refund, oleh) { var d = db(), k = d.find('komplainToko', komplainId); if (!k) throw new Error('Komplain tidak ditemukan'); d.update('komplainToko', komplainId, { status:'selesai', solusi:solusi, refund:refund || 0, oleh:oleh, selesaiAt:kini() }); var o = pesanan(k.pesananId); if (o) d.update('pesananToko', o.id, { status: refund >= o.total ? 'dibatalkan' : 'selesai', refund:refund || 0, selesaiAt:kini() }); return k; }
  function ulas(produkId, pembeliNama, bintang, teks) { var d = db(), p = d.find('produk', produkId); var u = d.insert('ulasanProduk', { produkId:produkId, tokoId:p ? p.tokoId : null, pembeliNama:pembeliNama, bintang:bintang, teks:teks, balasan:'', at:kini() }); if (p) { var semua = ulasan(produkId); d.update('produk', produkId, { rating:Math.round(semua.reduce(function (n, x) { return n + x.bintang; }, 0) / semua.length * 10) / 10 }); } return u; }
  function balasUlasan(ulasanId, teks) { var d = db(); return d.update('ulasanProduk', ulasanId, { balasan:teks, balasAt:kini() }); }
  /* penyelesaian otomatis 3 hari setelah dikirim */
  function selesaikanOtomatis() { var d = db(); if (!d) return 0; var n = 0, batas = Date.now() - TAHAN_OTOMATIS_HARI * 86400000; d.all('pesananToko').forEach(function (o) { if (o.status === 'dikirim' && o.dikirimAt && new Date(o.dikirimAt).getTime() < batas) { d.update('pesananToko', o.id, { status:'selesai', selesaiAt:kini(), otomatis:true }); n++; } }); return n; }

  /* ------------------------------------------------------------ toko: produk, kupon, chat, keuangan, skor */
  function simpanProduk(tokoId, isi) { var d = db(); var bersih = { tokoId:tokoId, nama:String(isi.nama || '').trim(), kategori:isi.kategori || 'alat', deskripsi:String(isi.deskripsi || '').trim(), etalase:String(isi.etalase || 'Umum').trim(), unggulan:!!isi.unggulan, ikon:isi.ikon || '📦', berat:Number(isi.berat) || 500, diskonPct:Math.max(0, Math.min(90, Number(isi.diskonPct) || 0)), varian:(isi.varian || []).map(function (v) { return { nama:String(v.nama || 'Standar').trim(), harga:Number(v.harga) || 0, stok:Math.max(0, Number(v.stok) || 0) }; }).filter(function (v) { return v.nama && v.harga > 0; }) }; if (!bersih.nama || bersih.nama.length < 4) throw new Error('Nama produk minimal 4 karakter'); if (!bersih.varian.length) throw new Error('Minimal satu varian dengan harga > 0'); bersih.harga = Math.min.apply(null, bersih.varian.map(function (v) { return v.harga; })); bersih.stok = bersih.varian.reduce(function (s, v) { return s + v.stok; }, 0); if (isi.id && d.find('produk', isi.id)) return d.update('produk', isi.id, bersih); return d.insert('produk', Object.assign({ status:'moderasi', terjual:0, rating:0 }, bersih)); }
  function ubahStatusProduk(id, status) { var d = db(); return d.update('produk', id, { status:status }); }
  function kuponToko(tokoId) { var d = db(); return d ? d.all('kuponToko').filter(function (k) { return k.tokoId === tokoId; }) : []; }
  function simpanKupon(tokoId, isi) { var d = db(); var k = { tokoId:tokoId, kode:String(isi.kode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12), jenis:isi.jenis || 'potongan', nilai:Number(isi.nilai) || 0, minBelanja:Number(isi.minBelanja) || 0, kuota:Math.max(1, Number(isi.kuota) || 1), terpakai:0, aktif:true, sampai:isi.sampai || '' }; if (k.kode.length < 4) throw new Error('Kode kupon minimal 4 karakter'); if (k.nilai <= 0) throw new Error('Nilai kupon harus > 0'); if (k.jenis === 'persen' && k.nilai > 50) throw new Error('Diskon persen maksimal 50%'); if (kuponToko(tokoId).some(function (x) { return x.kode === k.kode; })) throw new Error('Kode sudah dipakai'); return d.insert('kuponToko', k); }
  function chatToko(tokoId) { var d = db(); return d ? d.all('chatToko').filter(function (c) { return c.tokoId === tokoId; }) : []; }
  function balasChat(chatId, teks) { var d = db(), c = d.find('chatToko', chatId); if (!c) return null; return d.update('chatToko', chatId, { pesan:(c.pesan || []).concat([{ dari:'toko', teks:teks, at:kini() }]), belumDibaca:0 }); }
  function kirimChatPembeli(tokoId, pembeliNama, teks) { var d = db(), c = chatToko(tokoId).filter(function (x) { return x.pembeliNama === pembeliNama; })[0]; if (c) return d.update('chatToko', c.id, { pesan:c.pesan.concat([{ dari:'pembeli', teks:teks, at:kini() }]), belumDibaca:(c.belumDibaca || 0) + 1 }); return d.insert('chatToko', { tokoId:tokoId, pembeliNama:pembeliNama, pesan:[{ dari:'pembeli', teks:teks, at:kini() }], belumDibaca:1 }); }
  function keuanganToko(tokoId) {
    var d = db(), ps = d ? d.all('pesananToko').filter(function (o) { return o.tokoId === tokoId; }) : [];
    var selesai = ps.filter(function (o) { return o.status === 'selesai'; }), tertahan = ps.filter(function (o) { return ['baru','diproses','dikirim','komplain'].indexOf(o.status) >= 0; });
    var bruto = selesai.reduce(function (n, o) { return n + o.subtotal - (o.refund || 0); }, 0), biaya = selesai.reduce(function (n, o) { return n + (o.biayaLayanan || Math.round(o.subtotal * BIAYA_LAYANAN)); }, 0), ongkir = selesai.reduce(function (n, o) { return n + o.ongkir; }, 0);
    var ditarik = d ? d.all('penarikanToko').filter(function (p) { return p.tokoId === tokoId && p.status !== 'ditolak'; }).reduce(function (n, p) { return n + p.jumlah; }, 0) : 0;
    return { bruto:bruto, biayaLayanan:biaya, ongkir:ongkir, bersih:bruto - biaya + ongkir, tertahan:tertahan.reduce(function (n, o) { return n + o.total; }, 0), nTertahan:tertahan.length, ditarik:ditarik, saldo:bruto - biaya + ongkir - ditarik, pesananSelesai:selesai.length, penarikan:d ? d.all('penarikanToko').filter(function (p) { return p.tokoId === tokoId; }).slice().reverse() : [] };
  }
  function ajukanPenarikan(tokoId, jumlah, rekening) { var d = db(), k = keuanganToko(tokoId); jumlah = Number(jumlah) || 0; if (jumlah < 50000) throw new Error('Penarikan minimal Rp50.000'); if (jumlah > k.saldo) throw new Error('Saldo tersedia ' + rp(k.saldo)); return d.insert('penarikanToko', { tokoId:tokoId, jumlah:jumlah, rekening:rekening || '', status:'menunggu', at:kini() }); }
  function putusPenarikan(id, status, oleh) { var d = db(); return d.update('penarikanToko', id, { status:status, oleh:oleh, putusAt:kini() }); }
  function skorToko(tokoId) {
    var d = db(), t = toko(tokoId); if (!t) return null;
    var ps = d.all('pesananToko').filter(function (o) { return o.tokoId === tokoId; }), selesai = ps.filter(function (o) { return o.status === 'selesai'; }), batal = ps.filter(function (o) { return o.status === 'dibatalkan' && /toko/i.test(o.alasanBatal || ''); });
    var cepat = ps.filter(function (o) { return o.diprosesAt && o.at && new Date(o.diprosesAt) - new Date(o.at) <= 86400000; }).length, punyaProses = ps.filter(function (o) { return o.diprosesAt; }).length;
    var ul = d.all('ulasanProduk').filter(function (u) { return u.tokoId === tokoId; }), rating = ul.length ? ul.reduce(function (n, u) { return n + u.bintang; }, 0) / ul.length : 0;
    var ch = chatToko(tokoId), dibalas = ch.filter(function (c) { return !c.belumDibaca; }).length;
    var komp = { rating:Math.round(rating / 5 * 40), proses:punyaProses ? Math.round(cepat / punyaProses * 25) : 20, batal:ps.length ? Math.round(Math.max(0, 1 - batal.length / ps.length * 5) * 20) : 20, chat:ch.length ? Math.round(dibalas / ch.length * 15) : 15 };
    var skor = Math.max(0, Math.min(100, komp.rating + komp.proses + komp.batal + komp.chat - (t.poinPenalti || 0) * 5));
    if (!ps.length && t.skorDasar) skor = t.skorDasar;
    var badge = t.badge === 'official' ? 'official' : (skor >= 85 && selesai.length >= 20) || t.badge === 'power' && skor >= 75 ? 'power' : 'reguler';
    return { skor:skor, komponen:komp, rating:Math.round(rating * 10) / 10, nUlasan:ul.length, pesanan:ps.length, selesai:selesai.length, batal:batal.length, prosesCepatPct:punyaProses ? Math.round(cepat / punyaProses * 100) : 100, chatBalasPct:ch.length ? Math.round(dibalas / ch.length * 100) : 100, penalti:t.poinPenalti || 0, badge:badge };
  }
  function statistikToko(tokoId, hari) {
    var d = db(), ps = d.all('pesananToko').filter(function (o) { return o.tokoId === tokoId && o.status !== 'dibatalkan'; }), batas = Date.now() - (hari || 7) * 86400000, harian = {}, produkJual = {};
    for (var i = (hari || 7) - 1; i >= 0; i--) { var dd = new Date(); dd.setDate(dd.getDate() - i); harian[dd.toISOString().slice(0, 10)] = { omzet:0, n:0 }; }
    ps.forEach(function (o) { var k = String(o.at).slice(0, 10); if (harian[k]) { harian[k].omzet += o.subtotal; harian[k].n++; } if (new Date(o.at).getTime() >= batas) (o.items || []).forEach(function (it) { produkJual[it.nama] = (produkJual[it.nama] || 0) + it.qty; }); });
    var top = Object.keys(produkJual).map(function (k) { return { nama:k, qty:produkJual[k] }; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    var kunjungan = Math.max(40, ps.length * 23), keranjang = Math.max(ps.length, Math.round(kunjungan * 0.18));
    return { harian:harian, top:top, omzet:Object.keys(harian).reduce(function (n, k) { return n + harian[k].omzet; }, 0), pesanan:Object.keys(harian).reduce(function (n, k) { return n + harian[k].n; }, 0), kunjungan:kunjungan, keranjang:keranjang, konversi:kunjungan ? Math.round(ps.filter(function (o) { return new Date(o.at).getTime() >= batas; }).length / kunjungan * 1000) / 10 : 0 };
  }
  function simpanPengaturan(tokoId, patch) { var d = db(); return d.update('toko', tokoId, patch); }
  function daftarToko(isi, pemilik) { var d = db(); return d.insert('toko', { nama:String(isi.nama || '').trim(), slug:String(isi.nama || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), deskripsi:isi.deskripsi || '', kota:isi.kota || '', badge:'reguler', status:'menunggu', jamBuka:'09:00–17:00', kurir:['reguler'], catatan:'', templateBalasan:[], pemilikId:pemilik.id, pemilikNama:pemilik.nama, daftarAt:kini(), poinPenalti:0, skorDasar:0 }); }
  /* admin */
  function verifikasiToko(id, status, oleh) { var d = db(); return d.update('toko', id, { status:status, verifikasiOleh:oleh, verifikasiAt:kini() }); }
  function penalti(id, poin, alasan, oleh) { var d = db(), t = toko(id); return d.update('toko', id, { poinPenalti:(t.poinPenalti || 0) + Number(poin), riwayatPenalti:(t.riwayatPenalti || []).concat([{ poin:Number(poin), alasan:alasan, oleh:oleh, at:kini() }]) }); }
  function ringkasanAdmin() {
    var d = db(); if (d) semai(); var tk = semuaToko(), ps = d ? d.all('pesananToko') : [], pr = d ? d.all('produk') : [];
    var selesai = ps.filter(function (o) { return o.status === 'selesai'; }), gmv = selesai.reduce(function (n, o) { return n + o.subtotal; }, 0), komisi = selesai.reduce(function (n, o) { return n + (o.biayaLayanan || Math.round(o.subtotal * BIAYA_LAYANAN)); }, 0);
    return { toko:tk.length, tokoAktif:tk.filter(function (t) { return t.status === 'aktif'; }).length, tokoMenunggu:tk.filter(function (t) { return t.status === 'menunggu'; }), produk:pr.length, produkModerasi:pr.filter(function (p) { return p.status === 'moderasi'; }), pesanan:ps.length, gmv:gmv, komisi:komisi, komplain:d ? d.all('komplainToko').filter(function (k) { return k.status !== 'selesai'; }) : [], penarikan:d ? d.all('penarikanToko').filter(function (p) { return p.status === 'menunggu'; }) : [], tertahan:ps.filter(function (o) { return ['baru','diproses','dikirim','komplain'].indexOf(o.status) >= 0; }).reduce(function (n, o) { return n + o.total; }, 0) };
  }

  return { BIAYA_LAYANAN:BIAYA_LAYANAN, KATEGORI:KATEGORI, KURIR:KURIR, ALUR_STATUS:ALUR_STATUS, rp:rp, namaKategori:namaKategori, kurir:kurir, labelStatus:labelStatus, semai:semai, semuaToko:semuaToko, toko:toko, produkToko:produkToko, katalog:katalog, produk:produk, hargaSetelahDiskon:hargaSetelahDiskon, ulasan:ulasan,
    hitungKeranjang:hitungKeranjang, opsiKurir:opsiKurir, checkout:checkout, simpanPengiriman:simpanPengiriman, terapkanStatusKurir:terapkanStatusKurir, pesananPembeli:pesananPembeli, pesanan:pesanan, proses:proses, kirim:kirim, tolak:tolak, terima:terima, batalPembeli:batalPembeli, komplain:komplain, selesaikanKomplain:selesaikanKomplain, ulas:ulas, balasUlasan:balasUlasan, selesaikanOtomatis:selesaikanOtomatis,
    simpanProduk:simpanProduk, ubahStatusProduk:ubahStatusProduk, kuponToko:kuponToko, simpanKupon:simpanKupon, chatToko:chatToko, balasChat:balasChat, kirimChatPembeli:kirimChatPembeli, keuanganToko:keuanganToko, ajukanPenarikan:ajukanPenarikan, putusPenarikan:putusPenarikan, skorToko:skorToko, statistikToko:statistikToko, simpanPengaturan:simpanPengaturan, daftarToko:daftarToko, verifikasiToko:verifikasiToko, penalti:penalti, ringkasanAdmin:ringkasanAdmin, uid:uid };
})();
