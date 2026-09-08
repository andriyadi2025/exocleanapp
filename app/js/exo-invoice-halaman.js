/* exo-invoice-halaman.js — mengisi invoice.html dari EXO_INVOICE (CSP melarang skrip sebaris). */
(function () {
  'use strict';
  var no = new URLSearchParams(location.search).get('no') || '', isi = document.getElementById('isi');
  document.getElementById('gaya-inv').textContent = EXO_INVOICE.CSS;
  var inv = EXO_INVOICE.valid(no) ? EXO_INVOICE.cari(no) : null;
  if (!inv) { isi.innerHTML = '<div class="kosong"><b>Invoice tidak ditemukan.</b><br>Nomor invoice harus 24 karakter huruf dan angka, dan struk hanya tersedia di peramban tempat pesanan dibuat (pratinjau lokal).</div>'; document.getElementById('cetak').hidden = true; return; }
  document.title = 'Invoice ' + no + ' — EXOCLEAN';
  document.getElementById('ket').textContent = (inv.jasa ? 'Struk pesanan jasa ' : 'Struk pesanan toko ') + (inv.refNo || '') + ' · ' + no;
  isi.innerHTML = EXO_INVOICE.html(inv);
  document.getElementById('cetak').addEventListener('click', function () { window.print(); });
})();
