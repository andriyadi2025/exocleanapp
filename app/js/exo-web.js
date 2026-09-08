/* exo-web.js — mengisi web.html (tata letak ala Tokopedia) dari EXO_KONTEN,
   EXO_DATA (semua layanan, paket), EXO_FLASHDEAL (Flash Deal jasa), dan
   EXO_DB (produk toko, sedikit saja — layanan lebih ditonjolkan). CSP melarang
   skrip sebaris. */
(function () {
  'use strict';
  var w = (window.EXO_KONTEN ? EXO_KONTEN.baca('web') : null) || {}, kl = (window.EXO_KONTEN ? EXO_KONTEN.baca('klien') : null) || {}, D = window.EXO_DATA || {}, I = window.EXO_I18N || null;
  if (I && I.set) I.set('id');
  function el(id) { return document.getElementById(id); }
  function teks(id, t) { var e = el(id); if (e) e.textContent = t || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function rp(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function namaJasa(k) { var e = I && I.SERVICE_NAMES ? I.SERVICE_NAMES[k] : null; return (e && (e.id || e.en)) || (D.SERVICES && D.SERVICES[k] ? D.SERVICES[k].name : k); }
  function satuan(u) { var e = I && I.UNIT_LABELS ? I.UNIT_LABELS[u] : null; return (e && (e.id || e.en)) || u; }
  function svg(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
  var EMOJI = { hourly:'🧹', deep:'✨', ac:'❄️', sofa:'🛋️', laundry:'🧺', office:'🏢', iron:'👔', disinfect:'🧯', car:'🚗', hydro:'💦', poles:'🪞', pest:'🐜', pool:'🏊', toren:'🚰', postreno:'🏗️', tankbig:'🏭', care:'🧑‍⚕️', errand:'🛍️', massage:'💆', cook:'🍳', building:'🏬' };
  function ikonJasa(id) { var ov = window.EXO_KONTEN ? EXO_KONTEN.ikonLayanan('klien', id) : null; if (ov) return EXO_KONTEN.ikonHtml(ov, 22); var t = (D.HOME_TILES || []).filter(function (x) { return x.id === id; })[0]; return t ? svg(t.d) : (EMOJI[id] || '🧼'); }
  if (window.EXO_KONTEN && EXO_KONTEN.pratinjau()) el('pratinjau').hidden = false;
  if (w.warna && /^#[0-9a-f]{6}$/i.test(w.warna)) document.documentElement.style.setProperty('--aksen', w.warna);

  /* bilah atas & tautan */
  var t = w.tautan || {}; ['btnHeader', 'tautanApp', 'btnMasuk'].forEach(function (id) { if (t.app && el(id)) el(id).href = t.app; }); if (t.mitra && el('tautanMitra')) el('tautanMitra').href = t.mitra;
  if (t.playstore) { el('tautanPlay').href = t.playstore; el('tautanPlay').hidden = false; } if (t.apk) { el('tautanApk').href = t.apk; el('tautanApk').hidden = false; }
  el('formCari').addEventListener('submit', function (ev) { ev.preventDefault(); var q = el('cariInput').value.trim(); location.href = 'exo.html?layar=catalog' + (q ? '&cari=' + encodeURIComponent(q) : ''); });
  el('jaminan').innerHTML = (w.keunggulan || []).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('');

  /* korsel: hero web + banner beranda klien */
  var hero = w.hero || {}, slides = [{ warna:'linear-gradient(135deg,#0b5f52,#1a9a86)', judul:hero.judul || 'Kami bersihkan segalanya.', sub:hero.sub || '', cta:hero.cta || 'Pesan sekarang', ke:'exo.html?layar=catalog', cta2:hero.cta2 || 'Jadi mitra', ke2:t.mitra || 'exo.html?layar=preg', ikon:(w.layanan && w.layanan[0] && w.layanan[0].ikon) || '🧹' }]
    .concat(((w.slide && w.slide.some(function (b) { return b.aktif !== false; })) ? w.slide : (kl.banner || [])).filter(function (b) { return b.aktif !== false; }).map(function (b) { return { warna:(window.EXO_KONTEN && EXO_KONTEN.WARNA[b.warna]) || b.warna || 'linear-gradient(135deg,#0a8f5c,#12b981)', judul:b.judul, sub:b.sub, cta:b.cta, ke:'exo.html?layar=' + encodeURIComponent(b.ke || 'home'), ikon:b.ikon }; }));
  var kor = el('korsel'), dots = el('dots'), idx = 0, timer = null;
  slides.forEach(function (s, i) { var d = document.createElement('div'); d.className = 'slide' + (i === 0 ? ' on' : ''); d.style.background = s.warna; d.innerHTML = '<div><h1>' + esc(s.judul) + '</h1><p>' + esc(s.sub) + '</p><div class="cta"><a class="btn btn-s" href="' + esc(s.ke) + '">' + esc(s.cta) + '</a>' + (s.cta2 ? '<a class="btn btn-p" style="background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.6)" href="' + esc(s.ke2) + '">' + esc(s.cta2) + '</a>' : '') + '</div></div><div class="ikon">' + esc(s.ikon || '') + '</div>'; kor.insertBefore(d, dots); var o = document.createElement('i'); if (i === 0) o.className = 'on'; o.addEventListener('click', function () { tampil(i); }); dots.appendChild(o); });
  function tampil(i) { idx = (i + slides.length) % slides.length; kor.querySelectorAll('.slide').forEach(function (s, j) { s.classList.toggle('on', j === idx); }); dots.querySelectorAll('i').forEach(function (o, j) { o.classList.toggle('on', j === idx); }); }
  function putar() { clearInterval(timer); timer = setInterval(function () { tampil(idx + 1); }, 6000); }
  el('prev').addEventListener('click', function () { tampil(idx - 1); putar(); }); el('next').addEventListener('click', function () { tampil(idx + 1); putar(); }); putar();

  /* semua layanan (grid kategori) — dari EXO_DATA.SERVICES, urutan HOME_TILES dulu */
  var urut = (D.HOME_TILES || []).map(function (x) { return x.id; }), semuaJasa = Object.keys(D.SERVICES || {}).sort(function (a, b) { var ia = urut.indexOf(a), ib = urut.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  el('kategori').innerHTML = semuaJasa.map(function (k) { var s = D.SERVICES[k]; return '<a href="exo.html?layar=svc&jasa=' + esc(k) + '"><i>' + ikonJasa(k) + '</i><b>' + esc(namaJasa(k)) + '</b><small>mulai ' + rp(s.rate) + ' ' + esc(satuan(s.unit)) + '</small></a>'; }).join('');
  el('footLayanan').innerHTML = semuaJasa.slice(0, 8).map(function (k) { return '<a href="exo.html?layar=svc&jasa=' + esc(k) + '">' + esc(namaJasa(k)) + '</a>'; }).join('');

  /* Flash Deal jasa */
  if (window.EXO_FLASHDEAL) { try { EXO_FLASHDEAL.semai(); var deals = EXO_FLASHDEAL.tampil(); if (deals.length) { el('flashwrap').hidden = false; var acuan = deals.filter(function (f) { return f.keadaan === 'berjalan'; })[0] || deals[0]; el('flash').innerHTML = deals.map(function (f) { var s = D.SERVICES[f.jasa]; if (!s) return ''; var hemat = Math.round(s.rate * f.diskonPct / 100 / 1000) * 1000, pct = f.kuota ? Math.min(100, Math.round((f.terpakai || 0) / f.kuota * 100)) : 0; return '<a class="deal" href="exo.html?layar=svc&jasa=' + esc(f.jasa) + '"><span class="tag">−' + f.diskonPct + '%</span><b>' + esc(namaJasa(f.jasa)) + '</b><div class="harga">' + rp(s.rate - hemat) + '<s>' + rp(s.rate) + '</s></div><div style="font-size:12px;color:var(--muted)">' + esc(satuan(s.unit)) + ' · hemat ' + rp(hemat) + '</div><div class="meter"><i style="width:' + pct + '%"></i></div><small>' + (f.keadaan === 'habis' ? 'Kuota habis' : f.keadaan === 'akan datang' ? 'Mulai ' + esc(f.mulai) : 'Tersisa ' + f.sisa + ' dari ' + f.kuota) + '</small></a>'; }).join(''); var tik = function () { el('hitung').textContent = (acuan.keadaan === 'berjalan' ? 'berakhir ' : 'mulai ') + EXO_FLASHDEAL.hitungMundur(acuan); }; tik(); setInterval(tik, 1000); } } catch (e) { /* tanpa flash deal */ } }

  /* layanan unggulan: dari konten web.layanan, dilengkapi harga & jaminan dari EXO_DATA bila cocok */
  function cocokJasa(l) { var j = String(l.judul || '').toLowerCase(); return semuaJasa.filter(function (k) { return namaJasa(k).toLowerCase().split(' ')[0] === j.split(' ')[0]; })[0] || null; }
  el('daftarLayanan').innerHTML = (w.layanan || []).map(function (l) { var k = cocokJasa(l), s = k ? D.SERVICES[k] : null, jaminan = k && I && I.WARRANTY && I.WARRANTY[s.warranty] ? (I.WARRANTY[s.warranty].id || I.WARRANTY[s.warranty].en) : (s ? s.warranty : ''); return '<a class="svc" href="' + (k ? 'exo.html?layar=svc&jasa=' + esc(k) : 'exo.html?layar=catalog') + '"><div class="ikon">' + esc(l.ikon) + '</div><h3>' + esc(l.judul) + '</h3><p>' + esc(l.teks) + '</p>' + (s ? '<div class="harga">' + rp(s.rate) + ' <span>' + esc(satuan(s.unit)) + '</span></div>' : '') + (jaminan ? '<div class="jaminan">✓ ' + esc(jaminan) + '</div>' : '') + '</a>'; }).join('');

  /* paket & langganan */
  var NAMA_PAKET = { p10:['Paket 10 jam', 'Cocok untuk apartemen, 3–4 kunjungan'], p20:['Paket 20 jam', 'Terpopuler · rumah keluarga, 6–7 kunjungan'], p40:['Paket 40 jam', 'Paling hemat · rumah besar atau kantor kecil'] }, LENCANA = { badgeTop:'Terpopuler', badgeSave:'Paling hemat' };
  el('daftarPaket').innerHTML = (D.PREPAID || []).map(function (p) { var n = NAMA_PAKET[p.id] || [p.id, ''], perJam = Math.round(p.price / p.hours / 1000) * 1000; return '<div class="kartu">' + (p.badge ? '<span class="badge">' + esc(LENCANA[p.badge] || p.badge) + '</span>' : '') + '<h3 style="margin:0">' + esc(n[0]) + '</h3><div class="harga">' + rp(p.price) + '</div><div class="per">≈ ' + rp(perJam) + ' per jam · ' + esc(n[1]) + '</div><a class="btn btn-p" style="align-self:flex-start;margin-top:6px" href="exo.html?layar=prepaid">Ambil paket</a></div>'; }).join('');

  /* toko perlengkapan — hanya 6 produk, porsi kecil dibanding layanan */
  try { var pr = (window.EXO_DB ? EXO_DB.all('produk') : []).filter(function (p) { return p.status === 'aktif'; }).sort(function (a, b) { return (b.terjual || 0) - (a.terjual || 0); }).slice(0, 6); el('daftarProduk').innerHTML = pr.length ? pr.map(function (p) { var harga = p.diskonPct ? Math.round(p.harga * (100 - p.diskonPct) / 100) : p.harga; return '<a class="pr" href="exo.html?layar=toko"><div class="ikon">' + esc(p.ikon || '📦') + '</div><b>' + esc(p.nama) + '</b><div class="harga">' + rp(harga) + '</div><small>' + (p.rating ? '★ ' + p.rating + ' · ' : '') + (p.terjual || 0) + ' terjual</small></a>'; }).join('') : '<div class="kartu" style="grid-column:1/-1;color:var(--muted)">Katalog produk tersedia di aplikasi.</div>'; } catch (e) { el('daftarProduk').innerHTML = ''; }

  el('daftarKeunggulan').innerHTML = (w.keunggulan || []).map(function (k) { return '<div class="kartu"><div class="ikon">✅</div><p style="margin:0;font-weight:600">' + esc(k) + '</p></div>'; }).join('');
  el('daftarTestimoni').innerHTML = (w.testimoni || []).map(function (x) { var b = Math.max(1, Math.min(5, Number(x.bintang) || 5)); return '<div class="kartu"><div class="bintang">' + '★'.repeat(b) + '</div>“' + esc(x.teks) + '”<div class="nama">' + esc(x.nama) + '</div></div>'; }).join('');
  var k = w.kontak || {}; el('kontakIsi').innerHTML = [k.wa ? 'WhatsApp <b>' + esc(k.wa) + '</b>' : '', k.email ? 'Email <b>' + esc(k.email) + '</b>' : '', k.alamat ? esc(k.alamat) : '', k.jam ? esc(k.jam) : ''].filter(Boolean).join('<br>');
  teks('tahun', String(new Date().getFullYear()));
})();
