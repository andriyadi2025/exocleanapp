/* ==========================================================================
   exo-ppob.js — Bayar tagihan & isi ulang (PPOB/TopUp) lewat Darmawisata H2H
   --------------------------------------------------------------------------
   Browser TIDAK pernah bicara ke Darmawisata: semua lewat EXO_SERVER.dwi*
   (dwi-server.js memegang kredensial agen, daftar putih, dan kunci
   idempotensi). Modul ini menyimpan transaksi pelanggan di EXO_DB `ppobTx`,
   menghitung harga jual (harga penyedia + biaya admin/margin EXOCLEAN),
   dan memotong EXO Wallet HANYA setelah penyedia menjawab SUCCESS.

   Keadaan transaksi: selesai · tertunda (masuk ke penyedia, status belum
   final — dompet tetap dipotong & ditandai, dicocokkan admin) · ragu (putus
   tanpa jawaban — dompet TIDAK dipotong, admin mencocokkan) · gagal.
   Sumber data selalu ditandai: live / simulasi / cadangan (contoh bawaan).
   ========================================================================== */
var EXO_PPOB = (function () {
  'use strict';
  var BAWAAN = { biayaAdminPPOB:2500, marginTopUp:500, aktif:{ ppob:true, topup:true } };
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function pengaturan() { var d = db(); var s = d && d.setting ? d.setting('ppob') : null; return Object.assign({}, BAWAAN, s || {}, { aktif:Object.assign({}, BAWAAN.aktif, (s && s.aktif) || {}) }); }
  function simpanPengaturan(patch) { var d = db(); if (d && d.setting) d.setting('ppob', Object.assign({}, pengaturan(), patch)); }
  function S() { return window.EXO_SERVER; }

  /* ------------------------------------------------------------ contoh (cadangan) */
  var CONTOH = {
    grup:['PLN', 'BPJS', 'PDAM', 'TELKOM', 'INTERNET', 'MULTI FINANCE'],
    produk:[{ code:'PLNPOST', name:'PLN Pascabayar', group:'PLN' }, { code:'BPJSKS', name:'BPJS Kesehatan', group:'BPJS' }, { code:'PDAMJKT', name:'PAM Jaya (Jakarta)', group:'PDAM' }, { code:'TELKOM', name:'Telkom / IndiHome', group:'TELKOM' }, { code:'FIRSTMEDIA', name:'First Media', group:'INTERNET' }, { code:'FIFGROUP', name:'FIF Group', group:'MULTI FINANCE' }],
    jenis:['Pulsa', 'Data', 'TokenPLN', 'E-Wallet'],
    penyedia:{ Pulsa:['Telkomsel', 'Indosat', 'XL', 'Tri', 'Smartfren'], Data:['Telkomsel Data', 'Indosat Data', 'XL Data'], TokenPLN:['PLN Prabayar'], 'E-Wallet':['GoPay', 'OVO', 'DANA', 'ShopeePay'] },
    produkTopUp:function (jenis, penyedia) { var h = jenis === 'TokenPLN' ? [20000, 50000, 100000] : jenis === 'E-Wallet' ? [25000, 50000, 100000] : jenis === 'Data' ? [15000, 30000, 55000] : [5000, 10000, 20000, 50000, 100000]; return h.map(function (x) { return { code:(penyedia || 'X').replace(/\s+/g, '').toUpperCase().slice(0, 6) + '|' + x, provider:penyedia, price:Math.round(x * 1.03), name:(penyedia || '') + ' ' + x.toLocaleString('id-ID'), type:String(jenis).toUpperCase(), isActive:true }; }); }
  };
  var IKON_GRUP = { PLN:'💡', BPJS:'🏥', PDAM:'🚰', TELKOM:'📞', INTERNET:'🌐', 'MULTI FINANCE':'🏦', Pulsa:'📱', Data:'📶', TokenPLN:'🔌', 'E-Wallet':'👛' };
  function ikon(k) { return IKON_GRUP[k] || '🧾'; }

  /* Pembungkus seragam: { sumber: live|simulasi|cadangan, data, catatan } */
  function baca(jalur, isi, ambil, contoh) {
    if (!S() || !S().dwiCall) return Promise.resolve({ sumber:'cadangan', data:contoh, catatan:'Jembatan server belum dimuat' });
    return S().dwiCall(jalur, isi).then(function (h) {
      if (!h.ok) return { sumber:'cadangan', data:contoh, catatan:h.error || 'Server Darmawisata tidak terjangkau — daftar contoh' };
      var d = h.data || {}; if (String(d.status).toUpperCase() !== 'SUCCESS') return { sumber:'cadangan', data:contoh, catatan:d.respMessage || 'Permintaan ditolak' };
      return { sumber:d.simulasi || h.mode === 'simulasi' ? 'simulasi' : 'live', data:ambil(d) || [], catatan:'' };
    });
  }
  function grupPPOB() { return baca('/PPOB/ProductGroup', {}, function (d) { return d.productGroups; }, CONTOH.grup); }
  function produkPPOB(grup) { return baca('/PPOB/Product', { productGroup:grup || '' }, function (d) { return d.productList; }, CONTOH.produk.filter(function (p) { return !grup || p.group === grup; })); }
  function jenisTopUp() { return baca('/TopUp/ProductType', {}, function (d) { return d.productTypes; }, CONTOH.jenis); }
  function penyediaTopUp(jenis) { return baca('/TopUp/Provider', { productType:jenis || '' }, function (d) { return d.providers; }, CONTOH.penyedia[jenis] || []); }
  function produkTopUp(jenis, penyedia) { return baca('/TopUp/Product', { productType:jenis || '', provider:penyedia || '' }, function (d) { return d.products; }, CONTOH.produkTopUp(jenis, penyedia)); }
  /* Cek tagihan: TIDAK pernah dikarang di klien — angka harus dari penyedia (atau simulasi server yang ditandai). */
  function cekTagihan(productCode, customerID, msisdn) {
    if (!S() || !S().dwiCall) return Promise.resolve({ ok:false, sumber:'cadangan', catatan:'Server Darmawisata tidak terhubung — cek tagihan tidak bisa dilakukan.' });
    return S().dwiCall('/PPOB/Inquiry', { productCode:productCode, customerID:customerID, customerMSISDN:msisdn || '' }).then(function (h) {
      if (!h.ok) return { ok:false, sumber:'cadangan', catatan:h.error || 'Server tidak terjangkau' };
      var d = h.data || {}; if (String(d.status).toUpperCase() !== 'SUCCESS') return { ok:false, sumber:'live', catatan:d.respMessage || 'Tagihan tidak ditemukan' };
      var p = pengaturan(), jumlah = Number(d.amount || d.totalAmount || 0), adminPenyedia = Number(d.adminFee || 0);
      return { ok:true, sumber:d.simulasi ? 'simulasi' : 'live', tagihan:d, rincian:{ tagihan:jumlah, adminPenyedia:adminPenyedia, biayaAdmin:p.biayaAdminPPOB, total:jumlah + adminPenyedia + p.biayaAdminPPOB } };
    });
  }
  function hargaJualTopUp(produk) { return Number(produk.price || 0) + pengaturan().marginTopUp; }

  /* ------------------------------------------------------------ transaksi pelanggan */
  function riwayat(pelangganNama) { var d = db(); return d ? d.all('ppobTx').filter(function (t) { return !pelangganNama || t.pelangganNama === pelangganNama; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function semua() { return riwayat(null); }
  function catat(t) { var d = db(); return d ? d.insert('ppobTx', Object.assign({ at:kini() }, t)) : null; }
  function ubah(id, patch) { var d = db(); return d ? d.update('ppobTx', id, patch) : null; }
  function terjemahBayar(r) {
    /* r dari EXO_SERVER.dwiBayar: { ok, status, data, error } */
    if (r.ok && String((r.data || {}).status).toUpperCase() === 'SUCCESS') return { keadaan:'selesai', data:r.data, diulang:!!r.data.idempotenDiulang };
    var j = r.data || {};
    if (j.keadaan === 'tertunda' || r.status === 202) return { keadaan:'tertunda', kunci:j.kunci || null, penanda:j.penanda || null, pesan:'Transaksi sudah masuk ke penyedia dan deposit bisa jadi terpotong, status akhir belum keluar.', data:j };
    if (j.keadaan === 'ragu' || r.offline) return { keadaan:'ragu', kunci:j.kunci || null, pesan:'Sambungan terputus sebelum ada jawaban. Jangan diulang — admin akan mencocokkan.', data:j };
    if (j.keadaan === 'berjalan') return { keadaan:'berjalan', pesan:'Permintaan yang sama sedang diproses. Tunggu sebentar.' };
    return { keadaan:'gagal', pesan:j.error || j.respMessage || r.error || 'Transaksi ditolak', data:j };
  }
  /* Bayar tagihan: potong dompet dilakukan PEMANGGIL setelah keadaan selesai/tertunda. */
  function bayarPPOB(tagihan, rincian, pelanggan, produk) {
    var tx = catat({ jenis:'ppob', produk:produk.name || produk.code, productCode:produk.code, grup:produk.group || '', nomor:tagihan.customerID, namaPelanggan:tagihan.customerName || '', periode:tagihan.billPeriod || '', tagihan:rincian.tagihan, adminPenyedia:rincian.adminPenyedia, biayaAdmin:rincian.biayaAdmin, total:rincian.total, hargaPenyedia:rincian.tagihan + rincian.adminPenyedia, kunci:'ppob:' + tagihan.billingReferenceID, keadaan:'berjalan', pelangganId:pelanggan.id || null, pelangganNama:pelanggan.nama, sumber:tagihan.simulasi ? 'simulasi' : 'live' });
    return S().dwiBayar('/PPOB/Payment', { billingReferenceID:tagihan.billingReferenceID }).then(function (r) { var h = terjemahBayar(r); ubah(tx.id, { keadaan:h.keadaan, penanda:h.data && (h.data.referenceID || h.data.transactionID) || h.penanda || null, pesan:h.pesan || (h.data && h.data.respMessage) || '', selesaiAt:h.keadaan === 'selesai' ? kini() : null }); h.tx = db().find('ppobTx', tx.id); return h; });
  }
  function pesanTopUp(produk, msisdn, pelanggan, jenis, penyedia) {
    var urutan = riwayat(null).filter(function (t) { return t.jenis === 'topup' && t.nomor === msisdn && t.productCode === produk.code && t.keadaan !== 'gagal'; }).length + 1;
    var harga = hargaJualTopUp(produk), tx = catat({ jenis:'topup', produk:produk.name || produk.code, productCode:produk.code, grup:jenis || produk.type || '', penyedia:penyedia || produk.provider || '', nomor:msisdn, hargaPenyedia:Number(produk.price || 0), biayaAdmin:pengaturan().marginTopUp, total:harga, kunci:'topup:' + msisdn + ':' + produk.code + ':' + urutan, urutan:urutan, keadaan:'berjalan', pelangganId:pelanggan.id || null, pelangganNama:pelanggan.nama, sumber:'live' });
    return S().dwiBayar('/TopUp/Order', { MSISDN:msisdn, productCode:produk.code, sequence:urutan }).then(function (r) { var h = terjemahBayar(r); ubah(tx.id, { keadaan:h.keadaan, penanda:h.data && (h.data.referenceID || h.data.transactionID) || h.penanda || null, token:h.data && (h.data.token || h.data.serialNumber) || '', pesan:h.pesan || (h.data && h.data.respMessage) || '', sumber:h.data && h.data.simulasi ? 'simulasi' : 'live', selesaiAt:h.keadaan === 'selesai' ? kini() : null }); h.tx = db().find('ppobTx', tx.id); return h; });
  }
  /* Pencocokan (admin): tanyakan nasib transaksi tertunda/ragu ke server → perbarui catatan lokal. */
  function cocokkan(txId) {
    var d = db(), t = d.find('ppobTx', txId); if (!t) return Promise.resolve({ ok:false, pesan:'Transaksi tidak ditemukan' });
    return S().dwiCocokkan(t.kunci).then(function (r) { var j = r.data || {}; var keadaan = j.keadaan === 'selesai' ? 'selesai' : j.keadaan === 'batal' ? 'gagal' : j.keadaan === 'tertunda' ? 'tertunda' : t.keadaan; ubah(txId, { keadaan:keadaan, pesan:j.catatan || j.error || t.pesan, dicocokkanAt:kini(), selesaiAt:keadaan === 'selesai' ? kini() : t.selesaiAt }); return { ok:r.ok, keadaan:keadaan, pesan:j.catatan || j.error || '', refundPerlu:keadaan === 'gagal' && t.dompetDipotong }; });
  }
  function ringkasan() { var s = semua(), sel = s.filter(function (t) { return t.keadaan === 'selesai'; }); return { total:s.length, selesai:sel.length, tertunda:s.filter(function (t) { return t.keadaan === 'tertunda'; }).length, ragu:s.filter(function (t) { return t.keadaan === 'ragu' || t.keadaan === 'berjalan'; }).length, gagal:s.filter(function (t) { return t.keadaan === 'gagal'; }).length, omzet:sel.reduce(function (n, t) { return n + t.total; }, 0), pendapatan:sel.reduce(function (n, t) { return n + (t.biayaAdmin || 0); }, 0), hargaPenyedia:sel.reduce(function (n, t) { return n + (t.hargaPenyedia || 0); }, 0) }; }

  return { BAWAAN:BAWAAN, CONTOH:CONTOH, rp:rp, ikon:ikon, pengaturan:pengaturan, simpanPengaturan:simpanPengaturan, grupPPOB:grupPPOB, produkPPOB:produkPPOB, jenisTopUp:jenisTopUp, penyediaTopUp:penyediaTopUp, produkTopUp:produkTopUp, cekTagihan:cekTagihan, hargaJualTopUp:hargaJualTopUp, bayarPPOB:bayarPPOB, pesanTopUp:pesanTopUp, cocokkan:cocokkan, riwayat:riwayat, semua:semua, ubah:ubah, ringkasan:ringkasan };
})();
