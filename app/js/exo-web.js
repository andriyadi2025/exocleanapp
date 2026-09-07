/* exo-web.js — mengisi web.html dari EXO_KONTEN (terbitan; ?pratinjau=1 → rancangan). CSP melarang skrip sebaris. */
(function () {
  'use strict';
  var w = (window.EXO_KONTEN ? EXO_KONTEN.baca('web') : null) || {};
  function el(id) { return document.getElementById(id); }
  function teks(id, t) { var e = el(id); if (e) e.textContent = t || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  if (EXO_KONTEN.pratinjau()) el('pratinjau').hidden = false;
  if (w.warna && /^#[0-9a-f]{6}$/i.test(w.warna)) document.documentElement.style.setProperty('--aksen', w.warna);
  var hero = w.hero || {}; teks('heroJudul', hero.judul); teks('heroSub', hero.sub); teks('cta1', hero.cta || 'Pesan sekarang'); teks('cta2', hero.cta2 || 'Jadi mitra');
  var t = w.tautan || {}; ['cta1', 'tautanApp', 'btnHeader'].forEach(function (id) { if (t.app && el(id)) el(id).href = t.app; }); ['cta2', 'tautanMitra'].forEach(function (id) { if (t.mitra && el(id)) el(id).href = t.mitra; });
  if (t.playstore) { el('tautanPlay').href = t.playstore; el('tautanPlay').hidden = false; } if (t.apk) { el('tautanApk').href = t.apk; el('tautanApk').hidden = false; }
  el('jaminan').innerHTML = (w.keunggulan || []).slice(0, 3).map(function (k) { return '<span>✓ ' + esc(k) + '</span>'; }).join('');
  el('daftarLayanan').innerHTML = (w.layanan || []).map(function (l) { return '<div class="kartu"><div class="ikon">' + esc(l.ikon) + '</div><h3>' + esc(l.judul) + '</h3><p>' + esc(l.teks) + '</p></div>'; }).join('');
  el('daftarKeunggulan').innerHTML = (w.keunggulan || []).map(function (k) { return '<div class="kartu"><div class="ikon">✅</div><p style="color:var(--tinta);font-weight:600">' + esc(k) + '</p></div>'; }).join('');
  el('daftarTestimoni').innerHTML = (w.testimoni || []).map(function (x) { var b = Math.max(1, Math.min(5, Number(x.bintang) || 5)); return '<div class="kartu"><div class="bintang">' + '★'.repeat(b) + '</div>“' + esc(x.teks) + '”<div class="nama">' + esc(x.nama) + '</div></div>'; }).join('');
  var k = w.kontak || {}; el('kontakIsi').innerHTML = [k.wa ? 'WhatsApp <b>' + esc(k.wa) + '</b>' : '', k.email ? 'Email <b>' + esc(k.email) + '</b>' : '', k.alamat ? esc(k.alamat) : '', k.jam ? esc(k.jam) : ''].filter(Boolean).join('<br>');
  var v = (w.layanan || [])[0]; if (v && v.ikon) el('visual').textContent = v.ikon;
  teks('tahun', String(new Date().getFullYear()));
})();
