/* ==========================================================================
   exo-harga.js — komposisi tagihan & katalog harga untuk server
   --------------------------------------------------------------------------
   · komposisi(): menyusun komposisi pesanan jasa yang sedang dibayar (jasa,
     jam, juru, add-on, regu, frekuensi, voucher) — server menghitung
     nominalnya sendiri (payment-server /api/pay/tagihan); aplikasi hanya
     menampilkan angka server dan memberi tahu bila berbeda dari perkiraan.
   · kumpulkan(): katalog harga lengkap dari data yang berlaku di aplikasi
     (tarif layanan + terbitan admin, add-on, faktor tarif tiap juru dari
     basis data, voucher, flash deal, biaya) untuk diterbitkan admin ke server
     (POST /api/pay/harga) — sehingga server dan aplikasi memakai angka yang
     sama, tetapi server yang berkuasa.
   ========================================================================== */
var EXO_HARGA = (function () {
  'use strict';
  function X() { return window.ExoApp; }
  function D() { return window.EXO_DATA; }
  function komposisi() {
    var x = X(), K = x.KEADAAN, juru = x.juruKini ? x.juruKini() : null;
    return { jenis:'jasa', jasa:K.jasa, jam:K.jam, juru:juru && juru.id ? juru.id : undefined, tambahan:Object.keys(K.tambahan || {}).filter(function (id) { return K.tambahan[id]; }), regu:K.regu === 2 ? 2 : 1, frekuensi:K.frekuensi || 'sekali', voucher:(x.voucherApplied && x.voucherApplied()) ? (x.voucherKini ? x.voucherKini().code : D().VOUCHER.code) : undefined, flash:true, perkiraan:x.totalN ? x.totalN() : undefined };
  }
  function komposisiAkhir(orderIdAsal, ekstra) { return { jenis:'akhir', orderIdAsal:orderIdAsal, ekstra:(ekstra || []).filter(function (e) { return e.status === 'diterima'; }).map(function (e) { return { nama:e.nama || e.label || 'Ekstra', harga:Number(e.harga) || 0 }; }) }; }
  function kumpulkan() {
    var d = D(), x = X(), pub = {}; try { pub = JSON.parse(localStorage.getItem('exoclean_admin_pub') || '{}') || {}; } catch (e) { pub = {}; }
    var jasa = {}; Object.keys(d.SERVICES).forEach(function (id) { var s = d.SERVICES[id], ov = (pub.services || {})[id] || {}; jasa[id] = { tarif:ov.rate != null ? Number(ov.rate) : s.rate, satuan:s.unit, aktif:!(pub.svcOff || {})[id] }; });
    var addon = {}; Object.keys(d.ADDON_SETS).forEach(function (id) { addon[id] = d.ADDON_SETS[id].map(function (a) { return { id:a.id, harga:a.price }; }); });
    var juru = {}; (x && x.daftarJuru ? x.daftarJuru() : d.CLEANERS).forEach(function (j) { if (j && j.id) juru[j.id] = Number(j.factor) || 1; });
    var voucher = {}; var v = x && x.voucherKini ? x.voucherKini() : d.VOUCHER; voucher[v.code] = { potongan:v.amount, min:v.min != null ? v.min : d.VOUCHER.min, aktif:v.live !== false };
    var flash = []; try { if (window.EXO_FLASHDEAL) EXO_FLASHDEAL.tampil().forEach(function (f) { if (f.keadaan === 'berjalan' || f.keadaan === 'akan') flash.push({ jasa:f.jasa, diskonPct:f.diskonPct, mulai:f.mulai, sampai:f.sampai }); }); } catch (e) { /* tanpa flash */ }
    var biaya = window.EXO_BIAYA ? EXO_BIAYA.pengaturan() : null;
    return { versi:'app-' + new Date().toISOString().slice(0, 16), sumber:'konsol admin', jasa:jasa, addon:addon, juru:juru, faktorMin:d.MIN_FACTOR || 0.76, faktorMaks:1.6, voucher:voucher, biayaAplikasi:biaya && biaya.pembeli && biaya.pembeli.jasaAplikasi != null ? Number(biaya.pembeli.jasaAplikasi) : d.PLATFORM_FEE, biayaRegu:d.CREW_FEE, langganan:{ layanan:d.LANGGANAN.layanan, pilihan:d.LANGGANAN.pilihan.map(function (p) { return { id:p.id, diskon:p.diskon }; }) }, minQty:d.MIN_QTY, stepQty:d.STEP_QTY, flash:flash, ekstra:{ maksPerItem:500000, maksPersenDasar:50 } };
  }
  return { komposisi:komposisi, komposisiAkhir:komposisiAkhir, kumpulkan:kumpulkan };
})();
