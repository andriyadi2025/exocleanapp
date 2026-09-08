/* ==========================================================================
   exo-invoice.js — nomor invoice 24 karakter & struk "ORDER RECEIPT"
   --------------------------------------------------------------------------
   · nomor(): 24 karakter acak huruf besar A–Z + angka 0–9 (crypto), selalu
     memuat huruf dan angka, unik terhadap tabel `invoiceTerbit`.
   · terbitkan(jenis, ref, data): simpan salinan struk (snapshot) sekali per
     referensi (pesanan toko / pesanan jasa) → dipakai invoice.html.
   · html(inv): tata letak mengikuti contoh struk yang diberikan (judul
     ORDER RECEIPT, nomor, Penjual/Pembeli/Tanggal/Alamat, tabel INFO PRODUK ·
     JUMLAH · HARGA SATUAN · TOTAL HARGA dengan berat, rincian voucher/ongkir/
     biaya, TOTAL BELANJA, Biaya Layanan, TOTAL TAGIHAN, catatan, metode
     pembayaran, pernyataan PPN, kaki EXOCLEAN).
   Dimuat oleh exo.html, exo-admin.html, dan invoice.html.
   ========================================================================== */
var EXO_INVOICE = (function () {
  'use strict';
  var TABEL = 'invoiceTerbit', HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ', ANGKA = '23456789', SEMUA = HURUF + ANGKA, PANJANG = 24;
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function acak(n) { var out = '', buf = new Uint32Array(n); try { crypto.getRandomValues(buf); } catch (e) { for (var i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 4294967296); } for (var j = 0; j < n; j++) out += SEMUA[buf[j] % SEMUA.length]; return out; }
  /* Nomor 24 karakter: campuran huruf & angka (karakter mirip 0/O/1/I dihindari agar mudah dibaca & diketik). */
  function nomor() {
    var d = db(), ada = {}; if (d) d.all(TABEL).forEach(function (x) { ada[x.no] = 1; });
    for (var coba = 0; coba < 50; coba++) { var n = acak(PANJANG); if (/[A-Z]/.test(n) && /[0-9]/.test(n) && !ada[n]) return n; }
    return acak(PANJANG - 2) + 'A7';
  }
  function valid(no) { return /^[A-Z0-9]{24}$/.test(String(no || '')); }
  function rp(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function tglId(iso) { var d = new Date(iso || Date.now()); return isNaN(d) ? String(iso || '') : d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }

  /* ---------- penerbitan ---------- */
  function cari(no) { var d = db(); return d ? d.all(TABEL).filter(function (x) { return x.no === no; })[0] || null : null; }
  function untukRef(jenis, ref) { var d = db(); return d ? d.all(TABEL).filter(function (x) { return x.jenis === jenis && x.ref === ref; })[0] || null : null; }
  function terbitkan(jenis, ref, data, noTetap) {
    var d = db(); if (!d) return null; var ada = untukRef(jenis, ref); if (ada) return ada;
    var no = valid(noTetap) ? noTetap : nomor();
    return d.insert(TABEL, Object.assign({ no:no, jenis:jenis, ref:ref, at:new Date().toISOString() }, data || {}));
  }
  /* Pesanan toko lama (sebelum fitur ini) mendapat nomor saat pertama kali ditampilkan. */
  function pastikanToko(o, toko) { if (!o) return ''; if (o.invoiceNo) return o.invoiceNo; var d = db(); if (!d) return ''; var inv = terbitkan('toko', o.id, dariPesananToko(o, toko)); if (inv) { d.update('pesananToko', o.id, { invoiceNo:inv.no }); o.invoiceNo = inv.no; return inv.no; } return ''; }
  function semua() { var d = db(); return d ? d.all(TABEL).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function tautan(no) { return 'invoice.html?no=' + encodeURIComponent(no); }

  /* Salinan struk dari pesanan toko (EXO_TOKO.pesananToko). */
  function dariPesananToko(o, toko) {
    var metode = { wallet:'EXO Wallet', qris:'QRIS', ewallet:'GoPay / OVO / DANA', va:'Bank Virtual Account', card:'Kartu kredit' }[o.bayar] || o.bayar || 'EXO Wallet';
    return { penjual:toko ? toko.nama : '', pembeli:o.pembeliNama, telp:o.pembeliTelp || '', tanggal:o.at, alamat:o.alamat || '', kurir:(o.kurir || '') + (o.layanan ? ' · ' + o.layanan : ''), resi:o.resi || '', metode:metode, refNo:o.no,
      baris:(o.items || []).map(function (it) { return { nama:it.nama + (it.varian ? ' / ' + it.varian : ''), catatan:it.berat ? 'Berat: ' + (it.berat * it.qty >= 1000 ? (Math.round(it.berat * it.qty / 100) / 10) + ' kg' : (it.berat * it.qty) + ' g') : '', qty:it.qty, harga:it.harga, total:it.harga * it.qty }; }),
      subtotal:o.subtotal, voucherPlatform:0, kuponToko:o.diskon || 0, ongkir:o.ongkir, voucherOngkir:o.diskonOngkir || 0, biayaJasa:o.biayaJasa || 0, poin:o.poinDipakai || 0, asuransi:o.asuransi || 0, proteksi:o.proteksi || 0, biayaLayanan:o.biayaLayananVA || 0, total:o.total + (o.biayaJasa || 0) + (o.biayaLayananVA || 0) - (o.poinDipakai || 0) };
  }
  /* Salinan struk dari pesanan jasa kebersihan (dihitung di aplikasi pelanggan). */
  function dariJasa(p) {
    return { penjual:'EXOCLEAN · ' + (p.mitra || 'mitra cleaning'), pembeli:p.pembeli, telp:p.telp || '', tanggal:p.tanggal || new Date().toISOString(), alamat:p.alamat || '', jadwal:p.jadwal || '', metode:p.metode || 'EXO Wallet', refNo:p.no, jasa:true,
      baris:[{ nama:p.layanan, catatan:p.jadwal ? 'Jadwal: ' + p.jadwal : '', qty:p.qty || 1, harga:p.harga || 0, total:(p.harga || 0) * (p.qty || 1) }].concat((p.tambahan || []).map(function (a) { return { nama:a.nama, catatan:'', qty:1, harga:a.harga, total:a.harga }; })),
      subtotal:p.subtotal, voucherPlatform:p.voucher || 0, kuponToko:0, ongkir:0, voucherOngkir:0, biayaJasa:p.biayaAplikasi || 0, poin:0, asuransi:0, proteksi:0, biayaLayanan:0, diskonLangganan:p.diskonLangganan || 0, total:p.total };
  }

  /* ---------- tata letak struk (mengikuti contoh) ---------- */
  function html(inv) {
    var d = inv, baris = d.baris || [], rows = [];
    function kv(label, nilai, tebal, minus) { return '<tr' + (tebal ? ' class="tebal"' : '') + '><td class="lbl">' + esc(label) + '</td><td class="num">' + (minus ? '-' : '') + rp(nilai) + '</td></tr>'; }
    rows.push(kv(d.jasa ? 'SUBTOTAL HARGA LAYANAN' : 'SUBTOTAL HARGA PRODUK', d.subtotal, true));
    if (d.voucherPlatform) rows.push(kv('Voucher dari platform', d.voucherPlatform, false, true));
    if (d.kuponToko) rows.push(kv('Kupon toko', d.kuponToko, false, true));
    if (d.diskonLangganan) rows.push(kv('Diskon langganan', d.diskonLangganan, false, true));
    if (!d.jasa) rows.push(kv('Total ongkos kirim', d.ongkir || 0));
    if (d.voucherOngkir) rows.push(kv('Voucher ongkir platform', d.voucherOngkir, false, true));
    if (d.asuransi) rows.push(kv('Asuransi pengiriman', d.asuransi));
    if (d.proteksi) rows.push(kv('Proteksi produk', d.proteksi));
    rows.push(kv('Biaya jasa aplikasi', d.biayaJasa || 0));
    if (d.poin) rows.push(kv(d.poin.toLocaleString('id-ID') + ' Poin dipakai', d.poin, false, true));
    rows.push(kv('TOTAL BELANJA', (d.total || 0) - (d.biayaLayanan || 0), true));
    rows.push(kv('Biaya Layanan', d.biayaLayanan || 0));
    rows.push(kv('TOTAL TAGIHAN', d.total || 0, true));
    return '<div class="inv"><div class="judul">ORDER RECEIPT</div><div class="nomor">' + esc(d.no) + '</div>' +
      '<table class="kepala"><tr><td class="k">Penjual</td><td>: ' + esc(d.penjual) + '</td><td class="k">Pembeli</td><td>: ' + esc(d.pembeli) + '</td></tr>' +
      '<tr><td></td><td></td><td class="k">Tanggal Pembelian</td><td>: ' + esc(tglId(d.tanggal)) + '</td></tr>' +
      '<tr><td></td><td></td><td class="k">' + (d.jasa ? 'Alamat Layanan' : 'Alamat Pengiriman') + '</td><td>: ' + esc(d.pembeli) + (d.telp ? ' (' + esc(d.telp) + ')' : '') + '<br><span class="alamat">' + esc(d.alamat) + '</span></td></tr>' +
      (d.refNo ? '<tr><td></td><td></td><td class="k">No. Pesanan</td><td>: ' + esc(d.refNo) + (d.resi ? ' · resi ' + esc(d.resi) : '') + '</td></tr>' : '') + '</table>' +
      '<table class="produk"><thead><tr><th>' + (d.jasa ? 'INFO LAYANAN' : 'INFO PRODUK') + '</th><th class="num">JUMLAH</th><th class="num">HARGA SATUAN</th><th class="num">TOTAL HARGA</th></tr></thead><tbody>' +
      baris.map(function (b) { return '<tr><td><div>' + esc(b.nama) + '</div>' + (b.catatan ? '<div class="cat">' + esc(b.catatan) + '</div>' : '') + '</td><td class="num">' + b.qty + '</td><td class="num">' + rp(b.harga) + '</td><td class="num">' + rp(b.total) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<table class="rincian">' + rows.join('') + '</table>' +
      '<div class="catatan">*Cashback yang didapat bisa berubah, Syarat &amp; Ketentuan berlaku</div>' +
      '<div class="metode"><b>Metode Pembayaran:</b><br>' + esc(d.metode) + '</div>' +
      '<div class="catatan">*Biaya-biaya yang merupakan bagian dari tagihan milik perusahaan (jika ada), sudah termasuk Pajak Pertambahan Nilai (PPN) sesuai dengan tarif yang berlaku.</div>' +
      '<div class="catatan">Struk ini berfungsi sebagai Bukti Pemesanan dan/atau Pembelian</div>' +
      '<div class="kaki"><img src="assets/exoclean-wordmark.png" alt="EXOCLEAN"><span>PT EXO POINT · EXOCLEAN · ' + esc(d.no) + '</span></div></div>';
  }
  var CSS = '.inv{font-family:"Nunito",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:28px 32px;background:#fff}.inv .judul{text-align:right;font-weight:800;font-size:14px;letter-spacing:.06em}.inv .nomor{text-align:right;font-size:13px;letter-spacing:.08em;margin:4px 0 18px;font-variant-numeric:tabular-nums}.inv table{width:100%;border-collapse:collapse;font-size:12.5px}.inv .kepala td{vertical-align:top;padding:2px 0}.inv .kepala .k{width:130px;white-space:nowrap}.inv .kepala .alamat{display:block;max-width:300px;line-height:1.45}.inv .produk{margin-top:22px}.inv .produk th{text-align:left;font-size:11.5px;letter-spacing:.04em;padding:8px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd}.inv .produk td{padding:10px 0;vertical-align:top;border-bottom:1px solid #eee}.inv .produk .cat{color:#666;font-size:11.5px;margin-top:4px}.inv .num{text-align:right;white-space:nowrap}.inv .rincian{margin-top:18px;width:auto;margin-left:auto;min-width:340px}.inv .rincian td{padding:4px 0}.inv .rincian .lbl{padding-right:40px}.inv .rincian .tebal td{font-weight:800;padding-top:10px}.inv .catatan{margin-top:14px;font-size:11px;color:#444;max-width:360px;margin-left:auto;line-height:1.45}.inv .metode{margin-top:14px;font-size:12px;max-width:360px;margin-left:auto}.inv .kaki{margin-top:28px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#666}.inv .kaki img{height:26px}@media print{body{margin:0;background:#fff}.inv{padding:0}.no-print{display:none!important}}';
  return { PANJANG:PANJANG, nomor:nomor, valid:valid, cari:cari, untukRef:untukRef, terbitkan:terbitkan, pastikanToko:pastikanToko, semua:semua, tautan:tautan, dariPesananToko:dariPesananToko, dariJasa:dariJasa, html:html, CSS:CSS, rp:rp };
})();
