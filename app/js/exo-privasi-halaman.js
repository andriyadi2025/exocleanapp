/* privasi.html — merender kebijakan privasi berversi dari terbitan admin */
(function () {
  'use strict';
  var k = EXO_PRIVASI.kebijakan(), el = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function tgl(iso) { try { return new Date(iso).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); } catch (e) { return iso; } }
  try { if (window.EXO_BRAND) EXO_BRAND.terapkan(); } catch (e) { /* abaikan */ }
  el('versi').textContent = k.versi; el('berlaku').textContent = tgl(k.berlaku); el('pengendali').textContent = k.pengendali.nama;
  el('daftarIsi').innerHTML = k.bagian.map(function (b, i) { return '<a href="#' + esc(b.id) + '">' + (i + 1) + '. ' + esc(b.judul) + '</a>'; }).join('');
  el('bagianIsi').innerHTML = k.bagian.map(function (b, i) { return '<div class="kartu" id="' + esc(b.id) + (b.id === 'hak' ? '" data-hak="1' : '') + '"><h2>' + (i + 1) + '. ' + esc(b.judul) + '</h2><div class="isi">' + esc(b.isi) + '</div></div>'; }).join('');
  var hak = document.querySelector('[data-hak]'); if (hak) hak.id = 'hak';
  el('kPengendali').innerHTML = esc(k.pengendali.nama) + '<br>' + esc(k.pengendali.alamat) + '<br>' + esc(k.pengendali.email) + (k.pengendali.telp ? ' · ' + esc(k.pengendali.telp) : '');
  el('kDpo').innerHTML = esc(k.dpo.nama) + '<br>' + esc(k.dpo.email) + (k.dpo.telp ? ' · ' + esc(k.dpo.telp) : '');
  var riw = (k.riwayat || []).slice(); riw.push({ versi:k.versi, berlaku:k.berlaku, catatan:k.catatanVersi || 'Versi yang berlaku' });
  el('riwayatIsi').innerHTML = riw.reverse().map(function (r) { return '<li><b>v' + esc(r.versi) + '</b> · ' + esc(tgl(r.berlaku)) + ' — ' + esc(r.catatan || '') + '</li>'; }).join('');
})();
