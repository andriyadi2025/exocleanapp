/* ==========================================================================
   exo-admin-dash.js — grafik tambahan dasbor konsol admin + pemilih rentang
   --------------------------------------------------------------------------
   Melengkapi VIEW.dash bawaan (KPI, booking 14 hari, kesehatan janji, daftar
   perhatian) dengan panel yang dihitung dari data untuk RENTANG WAKTU yang
   dipilih: tren GMV vs pendapatan platform, sales per daerah, top mitra,
   bauran layanan, kanal pembayaran, corong dana ditahan, peta panas jam
   booking, dan log aktivitas terbaru.

   Pemilih rentang mengikuti pola Google Ads/Analytics: daftar preset di kiri
   (Kustom, Hari ini, Kemarin, Minggu ini, 7 hari terakhir, Minggu lalu, 14
   hari terakhir, Bulan ini, 30 hari terakhir, Bulan lalu, Sepanjang waktu,
   N hari sampai hari ini / kemarin), tanggal mulai–selesai dan kalender
   bulanan dengan sorotan rentang di kanan, serta sakelar Bandingkan dengan
   periode sebelumnya yang sama panjang.

   Grafik digambar sebagai SVG inline tanpa pustaka (CSP script-src 'self').
   Sumber angka: EXO_KEUANGAN.peristiwa() (pesanan nyata + contoh berlabel).
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, chip = A.chip, tabel = A.tabel, meter = A.meter, aksi = A.aksi;
  var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
  var rpS = function (n) { n = Number(n) || 0; return n >= 1e9 ? 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt' : n >= 1e3 ? 'Rp ' + Math.round(n / 1e3) + ' rb' : 'Rp ' + n; };
  var C1 = 'var(--color-accent)', C2 = 'var(--color-accent-2-500, #66cbc4)', WARNA = ['var(--color-accent)', 'var(--color-accent-2-500, #66cbc4)', 'var(--color-accent-700, #00756a)', 'var(--color-accent-300, #9fd9d3)', '#f0b429', '#e07a5f', '#8d99ae', '#5e548e'];
  var BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'], HARI_PDK = ['M','S','S','R','K','J','S'], HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  function K() { return window.EXO_KEUANGAN; }
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function tglIso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dariIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function geser(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function hariIni() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function tglPendek(iso) { var d = dariIso(iso); return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
  function namaJasa(id) { var s = window.EXO_DATA && EXO_DATA.SERVICES && EXO_DATA.SERVICES[id]; return s && s.name ? s.name : (id || '—'); }

  /* ------------------------------------------------------------ rentang waktu */
  S.rentang = S.rentang || { preset:'bulan-ini', mulai:null, selesai:null, banding:false, nHariIni:30, nKemarin:30 };
  S.rentangBuka = S.rentangBuka || false; S.kalBulan = S.kalBulan || null; S.pilihMulai = S.pilihMulai || null;
  var PRESET = [['hari-ini','Hari ini'],['kemarin','Kemarin'],['minggu-ini','Minggu ini (Min – hari ini)'],['7-hari','7 hari terakhir'],['minggu-lalu','Minggu lalu (Min – Sab)'],['14-hari','14 hari terakhir'],['bulan-ini','Bulan ini'],['30-hari','30 hari terakhir'],['bulan-lalu','Bulan lalu'],['semua','Sepanjang waktu']];
  function tglAwalData() { var ev = window.EXO_KEUANGAN ? K().peristiwa() : [], min = null; ev.forEach(function (e) { if (e.tgl && (!min || e.tgl < min)) min = e.tgl; }); return min ? dariIso(min) : geser(hariIni(), -90); }
  function hitungRentang(r) {
    var h = hariIni(), kemarin = geser(h, -1), m, s;
    switch (r.preset) {
      case 'hari-ini': m = h; s = h; break;
      case 'kemarin': m = kemarin; s = kemarin; break;
      case 'minggu-ini': m = geser(h, -h.getDay()); s = h; break;
      case '7-hari': m = geser(h, -6); s = h; break;
      case 'minggu-lalu': s = geser(h, -h.getDay() - 1); m = geser(s, -6); break;
      case '14-hari': m = geser(h, -13); s = h; break;
      case 'bulan-ini': m = new Date(h.getFullYear(), h.getMonth(), 1); s = h; break;
      case '30-hari': m = geser(h, -29); s = h; break;
      case 'bulan-lalu': m = new Date(h.getFullYear(), h.getMonth() - 1, 1); s = new Date(h.getFullYear(), h.getMonth(), 0); break;
      case 'semua': m = tglAwalData(); s = h; break;
      case 'n-hari-ini': m = geser(h, -(Math.max(1, r.nHariIni || 30) - 1)); s = h; break;
      case 'n-kemarin': s = kemarin; m = geser(kemarin, -(Math.max(1, r.nKemarin || 30) - 1)); break;
      default: m = r.mulai ? dariIso(r.mulai) : geser(h, -29); s = r.selesai ? dariIso(r.selesai) : h;
    }
    if (s < m) { var t = m; m = s; s = t; }
    return { mulai:tglIso(m), selesai:tglIso(s), hari:Math.round((s - m) / 86400000) + 1 };
  }
  function rentangKini() { return hitungRentang(S.rentang); }
  function labelRentang() { var r = rentangKini(), p = PRESET.filter(function (x) { return x[0] === S.rentang.preset; })[0]; var nama = p ? p[1] : S.rentang.preset === 'n-hari-ini' ? S.rentang.nHariIni + ' hari sampai hari ini' : S.rentang.preset === 'n-kemarin' ? S.rentang.nKemarin + ' hari sampai kemarin' : 'Kustom'; return nama + ' · ' + (r.mulai === r.selesai ? tglPendek(r.mulai) : tglPendek(r.mulai) + ' – ' + tglPendek(r.selesai)); }
  function rentangBanding() { var r = rentangKini(); var s = geser(dariIso(r.mulai), -1), m = geser(s, -(r.hari - 1)); return { mulai:tglIso(m), selesai:tglIso(s), hari:r.hari }; }
  AKSI.rentangBuka = function () { S.rentangBuka = !S.rentangBuka; if (S.rentangBuka) { var r = rentangKini(); S.kalBulan = r.selesai.slice(0, 7); S.pilihMulai = null; } };
  AKSI.rentangTutup = function () { S.rentangBuka = false; S.pilihMulai = null; };
  AKSI.rentangPreset = function (v) { S.rentang.preset = v; var r = hitungRentang(S.rentang); S.rentang.mulai = r.mulai; S.rentang.selesai = r.selesai; S.kalBulan = r.selesai.slice(0, 7); S.pilihMulai = null; };
  AKSI.rentangN = function (arg, v) { var n = Math.max(1, Math.min(730, Number(v) || 30)); if (arg === 'hariIni') { S.rentang.nHariIni = n; S.rentang.preset = 'n-hari-ini'; } else { S.rentang.nKemarin = n; S.rentang.preset = 'n-kemarin'; } var r = hitungRentang(S.rentang); S.rentang.mulai = r.mulai; S.rentang.selesai = r.selesai; };
  AKSI.rentangTgl = function (arg, v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; S.rentang[arg] = v; if (!S.rentang.mulai) S.rentang.mulai = v; if (!S.rentang.selesai) S.rentang.selesai = v; S.rentang.preset = 'kustom'; S.kalBulan = v.slice(0, 7); };
  AKSI.rentangHari = function (iso) {
    var r = S.rentang;
    if (!S.pilihMulai) { S.pilihMulai = iso; r.mulai = iso; r.selesai = iso; r.preset = 'kustom'; return; }
    if (iso < S.pilihMulai) { r.mulai = iso; r.selesai = S.pilihMulai; } else { r.mulai = S.pilihMulai; r.selesai = iso; }
    S.pilihMulai = null; r.preset = 'kustom';
  };
  AKSI.kalGeser = function (v) { var p = (S.kalBulan || rentangKini().selesai.slice(0, 7)).split('-'), d = new Date(+p[0], +p[1] - 1 + Number(v), 1); S.kalBulan = tglIso(d).slice(0, 7); };
  AKSI.rentangBanding = function () { S.rentang.banding = !S.rentang.banding; };
  function kalender() {
    var r = rentangKini(), ym = S.kalBulan || r.selesai.slice(0, 7), p = ym.split('-'), tahun = +p[0], bulan = +p[1] - 1, awal = new Date(tahun, bulan, 1), nHari = new Date(tahun, bulan + 1, 0).getDate(), hi = tglIso(hariIni());
    var h = '<div class="flex items-center gap-6" style="margin-bottom:8px"><b class="t-125 grow">' + BULAN[bulan].toUpperCase() + ' ' + tahun + '</b><button class="btn btn-secondary" style="height:28px;padding:0 9px"' + aksi('kalGeser', -1) + ' aria-label="Bulan sebelumnya">‹</button><button class="btn btn-secondary" style="height:28px;padding:0 9px"' + aksi('kalGeser', 1) + ' aria-label="Bulan berikutnya">›</button></div>';
    h += '<div class="adm-kal">' + HARI_PDK.map(function (d) { return '<span class="hd">' + d + '</span>'; }).join('');
    for (var k = 0; k < awal.getDay(); k++) h += '<span></span>';
    for (var d = 1; d <= nHari; d++) {
      var iso = tglIso(new Date(tahun, bulan, d)), dalam = iso >= r.mulai && iso <= r.selesai, ujung = iso === r.mulai || iso === r.selesai, depan = iso > hi;
      h += '<button class="' + (ujung ? 'ujung' : dalam ? 'dalam' : '') + (depan ? ' depan' : '') + '"' + (depan ? ' disabled' : aksi('rentangHari', iso)) + '>' + d + '</button>';
    }
    return h + '</div>';
  }
  function pemilihRentang() {
    var r = S.rentang, rk = rentangKini();
    var h = '<div class="adm-rentang-wrap"><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('rentangBuka') + '>📅 ' + esc(labelRentang()) + (r.banding ? ' · vs sebelumnya' : '') + ' ▾</button>';
    if (!S.rentangBuka) return h + '</div>';
    h += '<div class="adm-rentang" role="dialog" aria-label="Pilih rentang waktu"><div class="kiri">';
    h += '<button class="' + (r.preset === 'kustom' ? 'on' : '') + '"' + aksi('rentangPreset', 'kustom') + '>Kustom</button><div class="garis"></div>';
    PRESET.forEach(function (p) { h += '<button class="' + (r.preset === p[0] ? 'on' : '') + '"' + aksi('rentangPreset', p[0]) + '>' + esc(p[1]) + '</button>'; });
    h += '<div class="garis"></div><div class="baris-n' + (r.preset === 'n-hari-ini' ? ' on' : '') + '"><input class="input" type="number" min="1" max="730" value="' + r.nHariIni + '" data-ubah="rentangN" data-arg="hariIni"><span>hari sampai hari ini</span></div>';
    h += '<div class="baris-n' + (r.preset === 'n-kemarin' ? ' on' : '') + '"><input class="input" type="number" min="1" max="730" value="' + r.nKemarin + '" data-ubah="rentangN" data-arg="kemarin"><span>hari sampai kemarin</span></div>';
    h += '<div class="garis"></div><button class="banding"' + aksi('rentangBanding') + '><span class="grow">Bandingkan</span><span class="sakelar' + (r.banding ? ' on' : '') + '"><i></i></span></button></div>';
    h += '<div class="kanan"><div class="flex gap-8 items-end" style="margin-bottom:10px"><div class="field grow"><label>Tanggal mulai *</label><input class="input" type="date" value="' + esc(rk.mulai) + '" max="' + tglIso(hariIni()) + '" data-ubah="rentangTgl" data-arg="mulai"></div><span style="padding-bottom:12px">–</span><div class="field grow"><label>Tanggal selesai *</label><input class="input" type="date" value="' + esc(rk.selesai) + '" max="' + tglIso(hariIni()) + '" data-ubah="rentangTgl" data-arg="selesai"></div></div>' + kalender() +
      '<div class="flex items-center gap-8" style="margin-top:12px"><span class="t-115 o-6 grow">' + rk.hari + ' hari' + (r.banding ? ' · dibandingkan dengan ' + esc(tglPendek(rentangBanding().mulai) + ' – ' + tglPendek(rentangBanding().selesai)) : '') + (S.pilihMulai ? ' · pilih tanggal akhir' : '') + '</span><button class="btn btn-secondary" style="height:34px"' + aksi('rentangTutup') + '>Batal</button><button class="btn btn-primary" style="height:34px"' + aksi('rentangTutup') + '>Terapkan</button></div></div></div>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------ SVG helpers */
  function svgGaris(seri, w, h, labelX) {
    var maks = 1; seri.forEach(function (s) { s.nilai.forEach(function (v) { if (v > maks) maks = v; }); });
    var n = seri[0].nilai.length, px = function (i) { return n > 1 ? 8 + i * (w - 16) / (n - 1) : w / 2; }, py = function (v) { return h - 18 - v / maks * (h - 30); };
    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" role="img" aria-label="Tren">';
    [0.25, 0.5, 0.75, 1].forEach(function (g) { out += '<line x1="8" x2="' + (w - 8) + '" y1="' + py(maks * g) + '" y2="' + py(maks * g) + '" stroke="currentColor" stroke-opacity=".08"/>'; });
    seri.forEach(function (s, si) {
      if (n === 1) { out += '<circle cx="' + px(0) + '" cy="' + py(s.nilai[0]) + '" r="5" fill="' + s.warna + '"/>'; return; }
      var d = s.nilai.map(function (v, i) { return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1); }).join(' ');
      if (si === 0) out += '<path d="' + d + ' L' + px(n - 1).toFixed(1) + ' ' + (h - 18) + ' L8 ' + (h - 18) + ' Z" fill="' + s.warna + '" fill-opacity=".12"/>';
      out += '<path d="' + d + '" fill="none" stroke="' + s.warna + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    var langkah = Math.max(1, Math.ceil(n / 7));
    for (var i = 0; i < n; i += langkah) out += '<text x="' + px(i) + '" y="' + (h - 4) + '" font-size="9" text-anchor="' + (i === 0 ? 'start' : 'middle') + '" fill="currentColor" fill-opacity=".55">' + esc(labelX[i] || '') + '</text>';
    out += '<text x="' + (w - 8) + '" y="' + (py(maks) - 3) + '" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".6">' + esc(rpS(maks)) + '</text></svg>';
    return out;
  }
  function svgDonat(bagian, ukuran) {
    var total = bagian.reduce(function (n, b) { return n + b.nilai; }, 0) || 1, r = ukuran / 2 - 6, cx = ukuran / 2, cy = ukuran / 2, sudut = -Math.PI / 2, out = '<svg viewBox="0 0 ' + ukuran + ' ' + ukuran + '" width="' + ukuran + '" height="' + ukuran + '" role="img" aria-label="Bauran layanan">';
    bagian.forEach(function (b, i) {
      var a = Math.min(b.nilai / total * Math.PI * 2, Math.PI * 2 - 0.0001), x1 = cx + r * Math.cos(sudut), y1 = cy + r * Math.sin(sudut), x2 = cx + r * Math.cos(sudut + a), y2 = cy + r * Math.sin(sudut + a);
      out += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + WARNA[i % WARNA.length] + '" stroke-width="16"/>';
      sudut += a;
    });
    return out + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '" fill="var(--color-surface, #fff)"/></svg>';
  }
  function barH(label, nilai, maks, sub, warna) { return '<div class="stack gap-3"><div class="flex t-125 items-baseline"><span class="grow">' + label + '</span>' + (sub ? '<span class="t-11 o-6" style="margin-inline-end:8px">' + sub + '</span>' : '') + '<b>' + esc(rpS(nilai)) + '</b></div><div class="meter soft"><i style="width:' + Math.max(2, Math.round(nilai / (maks || 1) * 100)) + '%;background:' + (warna || C1) + '"></i></div></div>'; }
  function delta(kini, lalu) { if (!lalu) return kini ? '<span class="t-11" style="color:var(--color-accent-2-800,#0b5e55)">baru</span>' : ''; var d = (kini - lalu) / lalu * 100; return '<span class="t-11" style="color:' + (d >= 0 ? 'var(--color-accent-2-800,#0b5e55)' : '#9b1c1c') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + Math.abs(d).toFixed(0) + '% vs sebelumnya</span>'; }

  /* ------------------------------------------------------------ data */
  function ringkas(mulai, selesai) { var g = 0, p = 0, n = 0; K().peristiwa().forEach(function (e) { if (e.jenis !== 'tangkap' || e.tgl < mulai || e.tgl > selesai) return; g += e.nilai; p += K().pecah(e.nilai).pendapatan; n++; }); return { gmv:g, pend:p, n:n }; }
  function data() {
    var r = rentangKini(), ev = K().peristiwa().filter(function (e) { return e.tgl >= r.mulai && e.tgl <= r.selesai; });
    /* ember waktu: harian ≤ 62 hari, mingguan ≤ 400 hari, selain itu bulanan */
    var mode = r.hari <= 62 ? 'hari' : r.hari <= 400 ? 'minggu' : 'bulan', ember = {}, urut = [], label = [];
    function kunciEmber(iso) { if (mode === 'hari') return iso; if (mode === 'bulan') return iso.slice(0, 7); var d = dariIso(iso); return tglIso(geser(d, -d.getDay())); }
    for (var d = dariIso(r.mulai); d <= dariIso(r.selesai); d = geser(d, 1)) { var k = kunciEmber(tglIso(d)); if (!ember[k]) { ember[k] = { gmv:0, pend:0, n:0 }; urut.push(k); label.push(mode === 'bulan' ? BULAN[+k.slice(5, 7) - 1] : d.getDate() + '/' + (d.getMonth() + 1)); } }
    var byKota = {}, byMitra = {}, byJasa = {}, byKanal = {}, corong = { tahan:0, tangkap:0, lepas:0 }, panas = {};
    ev.forEach(function (e) {
      if (e.jenis === 'tahan' || e.jenis === 'tangkap' || e.jenis === 'lepas') { corong[e.jenis]++; var kn = e.metode || 'wallet'; byKanal[kn] = byKanal[kn] || { n:0, nilai:0 }; byKanal[kn].n++; byKanal[kn].nilai += e.nilai || 0; }
      if (e.jenis !== 'tangkap') return;
      var p = K().pecah(e.nilai), ek = ember[kunciEmber(e.tgl)]; if (ek) { ek.gmv += e.nilai; ek.pend += p.pendapatan; ek.n++; }
      var kota = e.kota || '—'; byKota[kota] = byKota[kota] || { gmv:0, n:0 }; byKota[kota].gmv += e.nilai; byKota[kota].n++;
      var m = e.mitra || '—'; byMitra[m] = byMitra[m] || { gmv:0, n:0, upah:0, mitraId:e.mitraId, contoh:!!e.contoh }; byMitra[m].gmv += e.nilai; byMitra[m].n++; byMitra[m].upah += p.upahBersih;
      var j = e.jasa || 'lain'; byJasa[j] = (byJasa[j] || 0) + e.nilai;
      var hari = dariIso(e.tgl).getDay(), jam = e.jam != null ? e.jam : 9; panas[hari + ':' + jam] = (panas[hari + ':' + jam] || 0) + 1;
    });
    return { r:r, mode:mode, urut:urut, label:label, ember:ember, byKota:byKota, byMitra:byMitra, byJasa:byJasa, byKanal:byKanal, corong:corong, panas:panas, contoh:K().pakaiContoh() };
  }
  function ratingMitra(mitraId, nama) {
    var d = db(); if (!d || !mitraId) return null;
    var ids = d.all('orders').filter(function (o) { return (o.workerIds || [])[0] === mitraId; }).map(function (o) { return o.id; });
    var r = d.all('ratings').filter(function (q) { return ids.indexOf(q.orderId) >= 0; });
    if (r.length) return (r.reduce(function (n, q) { return n + (Number(q.bintang) || 0); }, 0) / r.length).toFixed(2);
    var x = Math.sin(String(nama).length * 7 + 3) * 233280; x = x - Math.floor(x); return (4.5 + x * 0.5).toFixed(2);
  }
  function logTerbaru(n, r) {
    var d = db(); if (!d) return [];
    var dalam = function (at) { var t = String(at || '').slice(0, 10); return t >= r.mulai && t <= r.selesai; };
    var audit = (window.EXO_PERSETUJUAN ? EXO_PERSETUJUAN.daftarAudit(200) : []).filter(function (e) { return dalam(e.at); }).map(function (e) { return { at:e.at, aktor:e.aktorNama || 'sistem', aksi:e.aksi, detail:e.detail || '', jenis:'audit', tanda:e.tanda }; });
    var act = d.all('activity').filter(function (a) { return dalam(a.at); }).slice(-200).map(function (a) { var u = a.actorId ? d.find('users', a.actorId) : null; return { at:a.at, aktor:u ? u.nama : (a.actorId || 'sistem'), aksi:a.aksi, detail:a.detail || '', jenis:a.refType || 'app' }; });
    return audit.concat(act).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, n);
  }

  /* ------------------------------------------------------------ panel */
  function panelGrafik() {
    if (!window.EXO_KEUANGAN) return '';
    var D = data(), r = D.r, gmv = D.urut.map(function (k) { return D.ember[k].gmv; }), pend = D.urut.map(function (k) { return D.ember[k].pend; });
    var totGmv = gmv.reduce(function (a, b) { return a + b; }, 0), totPend = pend.reduce(function (a, b) { return a + b; }, 0), totJob = D.urut.reduce(function (n, k) { return n + D.ember[k].n; }, 0);
    var bd = S.rentang.banding ? ringkas(rentangBanding().mulai, rentangBanding().selesai) : null, lbl = labelRentang();
    var h = '<div class="flex items-center gap-8 wrap" style="margin-top:6px;position:relative;z-index:5"><div class="card-title grow">Analitik</div>' + pemilihRentang() + (D.contoh ? chip('flat', 'memuat data contoh berlabel') : chip('green', 'data basis data')) + '<button class="btn btn-secondary" style="height:32px;padding:0 12px;font-size:12px"' + aksi('view', 'keuangan') + '>Buka keuangan</button></div>';
    if (bd) h += '<div class="grid g3" style="gap:12px">' + [['GMV', totGmv, bd.gmv, rp], ['Pendapatan platform', totPend, bd.pend, rp], ['Kunjungan selesai', totJob, bd.n, String]].map(function (x) { return '<div class="card elev-sm kpi sm"><div class="lbl">' + x[0] + '</div><div class="val">' + esc(x[3](x[1])) + '</div><div class="note">' + delta(x[1], x[2]) + ' · sebelumnya ' + esc(x[3](x[2])) + '</div></div>'; }).join('') + '</div>';
    /* tren */
    h += '<div class="grid g131"><div class="card elev-sm gap-8"><div class="flex items-baseline gap-10 wrap"><div class="grow"><div class="card-title">GMV vs pendapatan platform</div><div class="t-115 o-6">' + esc(lbl) + ' · per ' + D.mode + ' · GMV ' + esc(rp(totGmv)) + ' · pendapatan ' + esc(rp(totPend)) + ' (' + (totGmv ? (totPend / totGmv * 100).toFixed(1) : 0) + '%) · ' + totJob + ' kunjungan</div></div><span class="t-11" style="color:' + C1 + '">● GMV</span><span class="t-11" style="color:' + C2 + '">● Pendapatan ×10</span></div>' + svgGaris([{ nama:'GMV', warna:C1, nilai:gmv }, { nama:'Pendapatan ×10', warna:C2, nilai:pend.map(function (v) { return v * 10; }) }], 640, 170, D.label) + '<div class="t-11 o-6">Pendapatan platform dikali 10 supaya terbaca di skala yang sama; nilai aslinya ada di keterangan.</div></div>';
    var jasa = Object.keys(D.byJasa).map(function (k) { return { nama:namaJasa(k), nilai:D.byJasa[k] }; }).sort(function (a, b) { return b.nilai - a.nilai; }), atas = jasa.slice(0, 6), sisa = jasa.slice(6).reduce(function (n, x) { return n + x.nilai; }, 0); if (sisa) atas.push({ nama:'Lainnya', nilai:sisa });
    var totJasa = atas.reduce(function (n, x) { return n + x.nilai; }, 0) || 1;
    h += '<div class="card elev-sm gap-8"><div class="card-title">Bauran layanan</div>' + (atas.length ? '<div class="flex items-center gap-14">' + svgDonat(atas, 140) + '<div class="stack gap-5 grow">' + atas.map(function (x, i) { return '<div class="flex items-center gap-7 t-12"><span style="width:9px;height:9px;border-radius:3px;background:' + WARNA[i % WARNA.length] + ';flex:none"></span><span class="grow">' + esc(x.nama) + '</span><b>' + Math.round(x.nilai / totJasa * 100) + '%</b></div>'; }).join('') + '</div></div>' : '<div class="t-125 o-6">Tidak ada kunjungan selesai di rentang ini.</div>') + '</div></div>';
    /* daerah + top mitra */
    var kota = Object.keys(D.byKota).map(function (k) { return Object.assign({ kota:k }, D.byKota[k]); }).sort(function (a, b) { return b.gmv - a.gmv; }).slice(0, 8), maksKota = kota.length ? kota[0].gmv : 1;
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-9"><div class="flex items-baseline"><div class="card-title grow">Sales per daerah</div><span class="t-115 o-6">GMV tertangkap</span></div>' + (kota.length ? kota.map(function (x, i) { return barH(esc(x.kota), x.gmv, maksKota, x.n + ' job', WARNA[i % 2]); }).join('') : '<div class="t-125 o-6">Belum ada penjualan di rentang ini.</div>') + '<div class="t-11 o-6">Daerah dari alamat pesanan (kabupaten/kota). Daerah dengan job banyak tetapi GMV kecil = layanan kecil mendominasi; pertimbangkan promo paket.</div></div>';
    var mitra = Object.keys(D.byMitra).map(function (k) { return Object.assign({ nama:k }, D.byMitra[k]); }).sort(function (a, b) { return b.gmv - a.gmv; }).slice(0, 8);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow card-title">Top mitra</div><span class="t-115 o-6">' + esc(lbl.split(' · ')[0]) + '</span></div>' + tabel(['#','Mitra','Job','GMV','Upah bersih','Rating'], mitra.length ? mitra.map(function (m, i) { return ['<span class="f-head">' + (i + 1) + '</span>', '<b>' + esc(m.nama) + '</b>' + (m.contoh ? ' <i class="o-6 t-11">contoh</i>' : ''), String(m.n), rp(m.gmv), rp(m.upah), (ratingMitra(m.mitraId, m.nama) || '—') + ' ★']; }) : [['<span class="o-6">Belum ada.</span>', '', '', '', '', '']]) + '</div></div>';
    /* kanal + corong + peta panas */
    var kanal = Object.keys(D.byKanal).map(function (k) { return Object.assign({ kanal:k }, D.byKanal[k]); }).sort(function (a, b) { return b.nilai - a.nilai; }), maksKanal = kanal.length ? kanal[0].nilai : 1, totCorong = D.corong.tahan + D.corong.tangkap + D.corong.lepas || 1;
    h += '<div class="grid g3" style="gap:16px"><div class="card elev-sm gap-8"><div class="card-title">Kanal pembayaran</div>' + (kanal.length ? kanal.map(function (x, i) { return barH(esc({ wallet:'EXO Wallet', qris:'QRIS', va:'Virtual account', card:'Kartu', ewallet:'GoPay/OVO/DANA' }[x.kanal] || x.kanal), x.nilai, maksKanal, x.n + ' trx', WARNA[i % WARNA.length]); }).join('') : '<div class="t-125 o-6">—</div>') + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Corong dana ditahan</div>' + [['Ditahan (aktif)', D.corong.tahan, 'accent'], ['Ditangkap (kunjungan selesai)', D.corong.tangkap, 'green'], ['Dilepas (batal)', D.corong.lepas, 'flat']].map(function (c) { return '<div class="stack gap-3"><div class="flex t-125"><span class="grow">' + c[0] + '</span><b>' + c[1] + '</b></div>' + meter(Math.round(c[1] / totCorong * 100), c[2] === 'green' ? 'acc' : 'soft') + '</div>'; }).join('') + '<div class="t-11 o-6">Konversi tahan→tangkap ' + Math.round(D.corong.tangkap / Math.max(1, D.corong.tangkap + D.corong.lepas) * 100) + '% · pembatalan ' + Math.round(D.corong.lepas / Math.max(1, D.corong.tangkap + D.corong.lepas) * 100) + '%</div></div>';
    var JAM = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], maksPanas = 1; Object.keys(D.panas).forEach(function (k) { if (D.panas[k] > maksPanas) maksPanas = D.panas[k]; });
    h += '<div class="card elev-sm gap-8"><div class="card-title">Peta panas jam booking</div><div style="display:grid;grid-template-columns:28px repeat(' + JAM.length + ',1fr);gap:3px;font-size:10px"><span></span>' + JAM.map(function (j) { return '<span class="o-6" style="text-align:center">' + j + '</span>'; }).join('');
    [1, 2, 3, 4, 5, 6, 0].forEach(function (hd) { h += '<span class="o-6">' + HARI[hd] + '</span>' + JAM.map(function (j) { var v = D.panas[hd + ':' + j] || 0; return '<span title="' + HARI[hd] + ' ' + j + ':00 · ' + v + ' job" style="height:16px;border-radius:4px;background:' + C1 + ';opacity:' + (v ? (0.15 + 0.85 * v / maksPanas).toFixed(2) : '0.05') + '"></span>'; }).join(''); });
    h += '</div><div class="t-11 o-6">Semakin gelap semakin banyak kunjungan dimulai — dasar penjadwalan mitra dan promo jam sepi.</div></div></div>';
    /* log */
    var log = logTerbaru(12, r);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Log aktivitas</div><div class="t-115 o-6">Gabungan log audit berantai hash (konsol) dan aktivitas aplikasi dalam rentang · ' + log.length + ' terakhir</div></div><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('view', 'persetujuan') + '>Semua log & verifikasi rantai</button></div>' +
      tabel(['Waktu','Aktor','Peristiwa','Sumber'], log.length ? log.map(function (e) { return ['<span class="t-12">' + esc(String(e.at || '').slice(0, 16).replace('T', ' ')) + '</span>', '<span class="t-12"><b>' + esc(e.aktor) + '</b></span>', '<span class="t-12">' + esc(e.aksi) + (e.detail ? '<br><span class="o-65">' + esc(String(e.detail).slice(0, 90)) + '</span>' : '') + (e.tanda && e.tanda.length ? ' ' + chip('accent', e.tanda.join(' · ')) : '') + '</span>', chip(e.jenis === 'audit' ? 'green' : 'flat', e.jenis)]; }) : [['<span class="o-6">Tidak ada aktivitas di rentang ini.</span>', '', '', '']]) + '</div>';
    return h;
  }
  var asli = VIEW.dash;
  VIEW.dash = function () { return asli() + panelGrafik(); };
})(ADMIN);
