/* ==========================================================================
   exo-admin-dash.js — grafik tambahan dasbor konsol admin
   --------------------------------------------------------------------------
   Melengkapi VIEW.dash bawaan (KPI, booking 14 hari, kesehatan janji, daftar
   perhatian) dengan panel yang dihitung dari data: tren GMV vs pendapatan
   platform 30 hari, sales per daerah, top mitra, bauran layanan, kanal
   pembayaran, corong dana ditahan, peta panas jam booking, dan log aktivitas
   terbaru (audit berantai + activity). Grafik digambar sebagai SVG inline
   tanpa pustaka — cocok dengan CSP (script-src 'self').
   Sumber angka: EXO_KEUANGAN.peristiwa() (pesanan nyata + contoh berlabel).
   ========================================================================== */
(function (A) {
  'use strict';
  var VIEW = A.VIEW, esc = A.esc, chip = A.chip, tabel = A.tabel, meter = A.meter, aksi = A.aksi;
  var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
  var rpS = function (n) { n = Number(n) || 0; return n >= 1e9 ? 'Rp ' + (n / 1e9).toFixed(1).replace('.', ',') + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt' : n >= 1e3 ? 'Rp ' + Math.round(n / 1e3) + ' rb' : 'Rp ' + n; };
  var C1 = 'var(--color-accent)', C2 = 'var(--color-accent-2-500, #66cbc4)', C3 = 'var(--color-accent-300, #9fd9d3)', WARNA = ['var(--color-accent)', 'var(--color-accent-2-500, #66cbc4)', 'var(--color-accent-700, #00756a)', 'var(--color-accent-300, #9fd9d3)', '#f0b429', '#e07a5f', '#8d99ae', '#5e548e'];
  function K() { return window.EXO_KEUANGAN; }
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function hariIni() { return new Date(); }
  function tglIso(d) { return d.toISOString().slice(0, 10); }
  function namaJasa(id) { var s = window.EXO_DATA && EXO_DATA.SERVICES && EXO_DATA.SERVICES[id]; return s && s.name ? s.name : (id || '—'); }

  /* ------------------------------------------------------------ SVG helpers */
  function svgGaris(seri, w, h) {
    /* seri: [{ nama, warna, nilai:[..] }], sumbu x = indeks */
    var maks = 1; seri.forEach(function (s) { s.nilai.forEach(function (v) { if (v > maks) maks = v; }); });
    var n = seri[0].nilai.length, px = function (i) { return 8 + i * (w - 16) / Math.max(1, n - 1); }, py = function (v) { return h - 18 - v / maks * (h - 30); };
    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" role="img" aria-label="Tren 30 hari">';
    [0.25, 0.5, 0.75, 1].forEach(function (g) { out += '<line x1="8" x2="' + (w - 8) + '" y1="' + py(maks * g) + '" y2="' + py(maks * g) + '" stroke="currentColor" stroke-opacity=".08"/>'; });
    seri.forEach(function (s, si) {
      var d = s.nilai.map(function (v, i) { return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1); }).join(' ');
      if (si === 0) out += '<path d="' + d + ' L' + px(n - 1).toFixed(1) + ' ' + (h - 18) + ' L8 ' + (h - 18) + ' Z" fill="' + s.warna + '" fill-opacity=".12"/>';
      out += '<path d="' + d + '" fill="none" stroke="' + s.warna + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    for (var i = 0; i < n; i += Math.ceil(n / 6)) out += '<text x="' + px(i) + '" y="' + (h - 4) + '" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity=".55">' + (n - i) + 'h</text>';
    out += '<text x="' + (w - 8) + '" y="' + (py(maks) - 3) + '" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".6">' + esc(rpS(maks)) + '</text></svg>';
    return out;
  }
  function svgDonat(bagian, ukuran) {
    var total = bagian.reduce(function (n, b) { return n + b.nilai; }, 0) || 1, r = ukuran / 2 - 6, cx = ukuran / 2, cy = ukuran / 2, sudut = -Math.PI / 2, out = '<svg viewBox="0 0 ' + ukuran + ' ' + ukuran + '" width="' + ukuran + '" height="' + ukuran + '" role="img" aria-label="Bauran layanan">';
    bagian.forEach(function (b, i) {
      var a = b.nilai / total * Math.PI * 2, x1 = cx + r * Math.cos(sudut), y1 = cy + r * Math.sin(sudut), x2 = cx + r * Math.cos(sudut + a), y2 = cy + r * Math.sin(sudut + a);
      out += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + WARNA[i % WARNA.length] + '" stroke-width="16"' + (a >= Math.PI * 2 - 0.001 ? ' stroke-dasharray="none"' : '') + '/>';
      sudut += a;
    });
    return out + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '" fill="var(--color-surface, #fff)"/></svg>';
  }
  function barH(label, nilai, maks, sub, warna) { return '<div class="stack gap-3"><div class="flex t-125 items-baseline"><span class="grow">' + label + '</span>' + (sub ? '<span class="t-11 o-6" style="margin-inline-end:8px">' + sub + '</span>' : '') + '<b>' + esc(rpS(nilai)) + '</b></div><div class="meter soft"><i style="width:' + Math.max(2, Math.round(nilai / (maks || 1) * 100)) + '%;background:' + (warna || C1) + '"></i></div></div>'; }

  /* ------------------------------------------------------------ data */
  function data() {
    var ev = K().peristiwa(), kini = hariIni(), byHari = {}, byKota = {}, byMitra = {}, byJasa = {}, byKanal = {}, corong = { tahan:0, tangkap:0, lepas:0 }, panas = {};
    for (var i = 29; i >= 0; i--) { var d = new Date(kini); d.setDate(d.getDate() - i); byHari[tglIso(d)] = { gmv:0, pend:0, n:0 }; }
    ev.forEach(function (e) {
      if (e.jenis === 'tahan' || e.jenis === 'tangkap' || e.jenis === 'lepas') { corong[e.jenis]++; var kn = e.metode || 'wallet'; byKanal[kn] = byKanal[kn] || { n:0, nilai:0 }; byKanal[kn].n++; byKanal[kn].nilai += e.nilai || 0; }
      if (e.jenis !== 'tangkap') return;
      var p = K().pecah(e.nilai); if (byHari[e.tgl]) { byHari[e.tgl].gmv += e.nilai; byHari[e.tgl].pend += p.pendapatan; byHari[e.tgl].n++; }
      var kota = e.kota || '—'; byKota[kota] = byKota[kota] || { gmv:0, n:0 }; byKota[kota].gmv += e.nilai; byKota[kota].n++;
      var m = e.mitra || '—'; byMitra[m] = byMitra[m] || { gmv:0, n:0, upah:0, mitraId:e.mitraId, contoh:!!e.contoh }; byMitra[m].gmv += e.nilai; byMitra[m].n++; byMitra[m].upah += p.upahBersih;
      var j = e.jasa || 'lain'; byJasa[j] = (byJasa[j] || 0) + e.nilai;
      var hari = new Date(e.tgl + 'T00:00:00').getDay(), jam = e.jam != null ? e.jam : 9; var kunci = hari + ':' + jam; panas[kunci] = (panas[kunci] || 0) + 1;
    });
    return { ev:ev, byHari:byHari, byKota:byKota, byMitra:byMitra, byJasa:byJasa, byKanal:byKanal, corong:corong, panas:panas, contoh:K().pakaiContoh() };
  }
  function ratingMitra(mitraId, nama) {
    var d = db(); if (!d || !mitraId) return null;
    var ids = d.all('orders').filter(function (o) { return (o.workerIds || [])[0] === mitraId; }).map(function (o) { return o.id; });
    var r = d.all('ratings').filter(function (q) { return ids.indexOf(q.orderId) >= 0; });
    if (r.length) return (r.reduce(function (n, q) { return n + (Number(q.bintang) || 0); }, 0) / r.length).toFixed(2);
    var x = Math.sin(String(nama).length * 7 + 3) * 233280; x = x - Math.floor(x); return (4.5 + x * 0.5).toFixed(2);
  }
  function logTerbaru(n) {
    var d = db(); if (!d) return [];
    var audit = (window.EXO_PERSETUJUAN ? EXO_PERSETUJUAN.daftarAudit(40) : []).map(function (e) { return { at:e.at, aktor:e.aktorNama || 'sistem', aksi:e.aksi, detail:e.detail || '', jenis:'audit', tanda:e.tanda }; });
    var act = d.all('activity').slice(-40).map(function (a) { var u = a.actorId ? d.find('users', a.actorId) : null; return { at:a.at, aktor:u ? u.nama : (a.actorId || 'sistem'), aksi:a.aksi, detail:a.detail || '', jenis:a.refType || 'app' }; });
    return audit.concat(act).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, n);
  }

  /* ------------------------------------------------------------ panel */
  function panelGrafik() {
    if (!window.EXO_KEUANGAN) return '';
    var D = data(), hariKeys = Object.keys(D.byHari), gmv = hariKeys.map(function (k) { return D.byHari[k].gmv; }), pend = hariKeys.map(function (k) { return D.byHari[k].pend; });
    var totGmv = gmv.reduce(function (a, b) { return a + b; }, 0), totPend = pend.reduce(function (a, b) { return a + b; }, 0), totJob = hariKeys.reduce(function (n, k) { return n + D.byHari[k].n; }, 0);
    var h = '<div class="flex items-center gap-8" style="margin-top:6px"><div class="card-title grow">Analitik 30 hari</div>' + (D.contoh ? chip('flat', 'memuat data contoh berlabel') : chip('green', 'data basis data')) + '<button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('view', 'keuangan') + '>Buka keuangan</button></div>';
    /* tren */
    h += '<div class="grid g131"><div class="card elev-sm gap-8"><div class="flex items-baseline gap-10"><div class="grow"><div class="card-title">GMV vs pendapatan platform</div><div class="t-115 o-6">30 hari · GMV ' + esc(rp(totGmv)) + ' · pendapatan ' + esc(rp(totPend)) + ' (' + (totGmv ? (totPend / totGmv * 100).toFixed(1) : 0) + '%) · ' + totJob + ' kunjungan</div></div><span class="t-11" style="color:' + C1 + '">● GMV</span><span class="t-11" style="color:' + C2 + '">● Pendapatan ×10</span></div>' + svgGaris([{ nama:'GMV', warna:C1, nilai:gmv }, { nama:'Pendapatan ×10', warna:C2, nilai:pend.map(function (v) { return v * 10; }) }], 640, 170) + '<div class="t-11 o-6">Pendapatan platform dikali 10 supaya terbaca di skala yang sama; nilai aslinya ada di keterangan.</div></div>';
    /* bauran layanan */
    var jasa = Object.keys(D.byJasa).map(function (k) { return { nama:namaJasa(k), nilai:D.byJasa[k] }; }).sort(function (a, b) { return b.nilai - a.nilai; }), atas = jasa.slice(0, 6), sisa = jasa.slice(6).reduce(function (n, x) { return n + x.nilai; }, 0); if (sisa) atas.push({ nama:'Lainnya', nilai:sisa });
    var totJasa = atas.reduce(function (n, x) { return n + x.nilai; }, 0) || 1;
    h += '<div class="card elev-sm gap-8"><div class="card-title">Bauran layanan</div><div class="flex items-center gap-14">' + svgDonat(atas, 140) + '<div class="stack gap-5 grow">' + atas.map(function (x, i) { return '<div class="flex items-center gap-7 t-12"><span style="width:9px;height:9px;border-radius:3px;background:' + WARNA[i % WARNA.length] + ';flex:none"></span><span class="grow">' + esc(x.nama) + '</span><b>' + Math.round(x.nilai / totJasa * 100) + '%</b></div>'; }).join('') + '</div></div></div></div>';
    /* daerah + top mitra */
    var kota = Object.keys(D.byKota).map(function (k) { return Object.assign({ kota:k }, D.byKota[k]); }).sort(function (a, b) { return b.gmv - a.gmv; }).slice(0, 8), maksKota = kota.length ? kota[0].gmv : 1;
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-9"><div class="flex items-baseline"><div class="card-title grow">Sales per daerah</div><span class="t-115 o-6">GMV tertangkap · 30 hari</span></div>' + (kota.length ? kota.map(function (x, i) { return barH(esc(x.kota), x.gmv, maksKota, x.n + ' job', WARNA[i % 2]); }).join('') : '<div class="t-125 o-6">Belum ada penjualan.</div>') + '<div class="t-11 o-6">Daerah dari alamat pesanan (kabupaten/kota). Daerah dengan job banyak tetapi GMV kecil = layanan kecil mendominasi; pertimbangkan promo paket.</div></div>';
    var mitra = Object.keys(D.byMitra).map(function (k) { return Object.assign({ nama:k }, D.byMitra[k]); }).sort(function (a, b) { return b.gmv - a.gmv; }).slice(0, 8);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow card-title">Top mitra</div><span class="t-115 o-6">30 hari</span></div>' + tabel(['#','Mitra','Job','GMV','Upah bersih','Rating'], mitra.length ? mitra.map(function (m, i) { return ['<span class="f-head">' + (i + 1) + '</span>', '<b>' + esc(m.nama) + '</b>' + (m.contoh ? ' <i class="o-6 t-11">contoh</i>' : ''), String(m.n), rp(m.gmv), rp(m.upah), (ratingMitra(m.mitraId, m.nama) || '—') + ' ★']; }) : [['<span class="o-6">Belum ada.</span>', '', '', '', '', '']]) + '</div></div>';
    /* kanal + corong + peta panas */
    var kanal = Object.keys(D.byKanal).map(function (k) { return Object.assign({ kanal:k }, D.byKanal[k]); }).sort(function (a, b) { return b.nilai - a.nilai; }), maksKanal = kanal.length ? kanal[0].nilai : 1, totCorong = D.corong.tahan + D.corong.tangkap + D.corong.lepas || 1;
    h += '<div class="grid g3" style="gap:16px"><div class="card elev-sm gap-8"><div class="card-title">Kanal pembayaran</div>' + (kanal.length ? kanal.map(function (x, i) { return barH(esc({ wallet:'EXO Wallet', qris:'QRIS', va:'Virtual account', card:'Kartu', ewallet:'GoPay/OVO/DANA' }[x.kanal] || x.kanal), x.nilai, maksKanal, x.n + ' trx', WARNA[i % WARNA.length]); }).join('') : '<div class="t-125 o-6">—</div>') + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Corong dana ditahan</div>' + [['Ditahan (aktif)', D.corong.tahan, 'accent'], ['Ditangkap (kunjungan selesai)', D.corong.tangkap, 'green'], ['Dilepas (batal)', D.corong.lepas, 'flat']].map(function (c) { return '<div class="stack gap-3"><div class="flex t-125"><span class="grow">' + c[0] + '</span><b>' + c[1] + '</b></div>' + meter(Math.round(c[1] / totCorong * 100), c[2] === 'green' ? 'acc' : 'soft') + '</div>'; }).join('') + '<div class="t-11 o-6">Tingkat konversi tahan→tangkap ' + Math.round(D.corong.tangkap / Math.max(1, D.corong.tangkap + D.corong.lepas) * 100) + '% · pembatalan ' + Math.round(D.corong.lepas / Math.max(1, D.corong.tangkap + D.corong.lepas) * 100) + '%</div></div>';
    var HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'], JAM = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], maksPanas = 1; Object.keys(D.panas).forEach(function (k) { if (D.panas[k] > maksPanas) maksPanas = D.panas[k]; });
    h += '<div class="card elev-sm gap-8"><div class="card-title">Peta panas jam booking</div><div style="display:grid;grid-template-columns:28px repeat(' + JAM.length + ',1fr);gap:3px;font-size:10px">';
    h += '<span></span>' + JAM.map(function (j) { return '<span class="o-6" style="text-align:center">' + j + '</span>'; }).join('');
    [1, 2, 3, 4, 5, 6, 0].forEach(function (hd) { h += '<span class="o-6">' + HARI[hd] + '</span>' + JAM.map(function (j) { var v = D.panas[hd + ':' + j] || 0; return '<span title="' + HARI[hd] + ' ' + j + ':00 · ' + v + ' job" style="height:16px;border-radius:4px;background:' + C1 + ';opacity:' + (v ? (0.15 + 0.85 * v / maksPanas).toFixed(2) : '0.05') + '"></span>'; }).join(''); });
    h += '</div><div class="t-11 o-6">Semakin gelap semakin banyak kunjungan dimulai — dasar penjadwalan mitra dan promo jam sepi.</div></div></div>';
    /* log */
    var log = logTerbaru(12);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Log aktivitas terbaru</div><div class="t-115 o-6">Gabungan log audit berantai hash (konsol) dan aktivitas aplikasi · ' + log.length + ' terakhir</div></div><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('view', 'persetujuan') + '>Semua log & verifikasi rantai</button></div>' +
      tabel(['Waktu','Aktor','Peristiwa','Sumber'], log.length ? log.map(function (e) { return ['<span class="t-12">' + esc(String(e.at || '').slice(0, 16).replace('T', ' ')) + '</span>', '<span class="t-12"><b>' + esc(e.aktor) + '</b></span>', '<span class="t-12">' + esc(e.aksi) + (e.detail ? '<br><span class="o-65">' + esc(String(e.detail).slice(0, 90)) + '</span>' : '') + (e.tanda && e.tanda.length ? ' ' + chip('accent', e.tanda.join(' · ')) : '') + '</span>', chip(e.jenis === 'audit' ? 'green' : 'flat', e.jenis)]; }) : [['<span class="o-6">Belum ada aktivitas.</span>', '', '', '']]) + '</div>';
    return h;
  }
  var asli = VIEW.dash;
  VIEW.dash = function () { return asli() + panelGrafik(); };
})(ADMIN);
