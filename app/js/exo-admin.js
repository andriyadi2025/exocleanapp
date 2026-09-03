/* ==========================================================================
   exo-admin.js — konsol backend EXOCLEAN App: inti + modul 1–7
   --------------------------------------------------------------------------
   Data dan aturan disalin dari "EXOCLEAN Admin.dc.html". Satu keadaan S,
   satu gambar(), satu peta AKSI — pola yang sama dengan exo.html.

   Yang DITERBITKAN ke aplikasi (localStorage 'exoclean_admin_pub'):
     { svcOff:{id:true}, bands:{id:{floor,ceiling}}, promos:{CODE:{amount,live}},
       rewards:{...} }
   Merek diterbitkan lewat EXO_BRAND (kunci 'exoclean_brand').
   ========================================================================== */
var ADMIN = (function () {
  'use strict';

  var KUNCI_PUB = 'exoclean_admin_pub';
  function bacaPub() { try { return JSON.parse(localStorage.getItem(KUNCI_PUB) || '{}') || {}; } catch (e) { return {}; } }
  function tulisPub(p) { try { localStorage.setItem(KUNCI_PUB, JSON.stringify(p)); return true; } catch (e) { return false; } }

  var pub = bacaPub();
  var S = {
    view: (location.hash || '#dash').slice(1), orderFilter:'all', deskFilter:'all', sopTab:'lib', mapFilter:'all',
    svcEdits:{}, svcOff: pub.svcOff || {}, svcDirty:false, promoEdits:{}, promoOff:{}, promoDirty:false, approved:{}, requested:{},
    pointsPerRp:1000, pointRupiah:10, cashbackPct:3, cashbackCap:25000, tierBoost:true, cbWalletOnly:true, rewardDirty:false,
    brand: EXO_BRAND.baca(), brandDirty:false, sekilas:null
  };
  if (pub.rewards) Object.assign(S, pub.rewards);
  if (pub.promos) for (var pc in pub.promos) { if (pub.promos[pc].amount != null) S.promoEdits[pc] = pub.promos[pc].amount; }

  var SERVICES = [
    {id:'hourly', name:'Hourly cleaning', unit:'per hour', floor:60000, ceiling:95000, step:5000, fee:'Rp 3.000', warranty:'48h redo', live:true},
    {id:'deep', name:'Deep cleaning', unit:'per hour', floor:110000, ceiling:175000, step:5000, fee:'Rp 3.000', warranty:'7-day redo', live:true},
    {id:'ac', name:'AC service', unit:'per unit', floor:70000, ceiling:110000, step:5000, fee:'Rp 3.000', warranty:'30-day', live:true},
    {id:'sofa', name:'Sofa & mattress', unit:'per seat', floor:120000, ceiling:190000, step:5000, fee:'Rp 3.000', warranty:'14-day redo', live:true},
    {id:'laundry', name:'Laundry & pickup', unit:'per kg', floor:9000, ceiling:16000, step:500, fee:'Rp 3.000', warranty:'Item cover Rp1jt', live:true},
    {id:'iron', name:'Ironing service', unit:'per hour', floor:50000, ceiling:75000, step:5000, fee:'Rp 3.000', warranty:'48h redo', live:true},
    {id:'office', name:'Office cleaning', unit:'per hour', floor:80000, ceiling:130000, step:5000, fee:'Contract', warranty:'Contract SLA', live:true},
    {id:'disinfect', name:'Disinfection & fogging', unit:'per room', floor:240000, ceiling:360000, step:10000, fee:'Rp 3.000', warranty:'7-day redo', live:true},
    {id:'car', name:'Car wash at home', unit:'per car', floor:95000, ceiling:160000, step:5000, fee:'Rp 3.000', warranty:'48h redo', live:true},
    {id:'hydro', name:'Hydro cleaning', unit:'per m²', floor:75000, ceiling:120000, step:5000, fee:'Rp 3.000', warranty:'14-day redo', live:true},
    {id:'poles', name:'Floor polishing', unit:'per m²', floor:50000, ceiling:85000, step:5000, fee:'Rp 3.000', warranty:'30-day', live:true},
    {id:'pest', name:'Pest control', unit:'per visit', floor:350000, ceiling:600000, step:10000, fee:'Rp 3.000', warranty:'90-day', live:true},
    {id:'pool', name:'Swimming pool care', unit:'per visit', floor:420000, ceiling:700000, step:10000, fee:'Rp 3.000', warranty:'7-day water check', live:true},
    {id:'toren', name:'Water tank cleaning', unit:'per tank', floor:270000, ceiling:450000, step:10000, fee:'Rp 3.000', warranty:'6-month', live:true},
    {id:'postreno', name:'Post-renovation cleaning', unit:'per hour', floor:105000, ceiling:175000, step:5000, fee:'Rp 3.000', warranty:'7-day redo', live:true},
    {id:'tankbig', name:'Building tank & reservoir', unit:'per tank', floor:1800000, ceiling:3200000, step:100000, fee:'Contract', warranty:'6-month', live:true},
    {id:'care', name:'Elderly, child & patient care', unit:'per hour', floor:45000, ceiling:75000, step:5000, fee:'Rp 3.000', warranty:'Free replacement', live:true},
    {id:'errand', name:'Shopping & errands', unit:'per trip', floor:25000, ceiling:50000, step:5000, fee:'Rp 3.000', warranty:'Receipt cover Rp1jt', live:true},
    {id:'massage', name:'Massage & body care', unit:'per session', floor:120000, ceiling:220000, step:10000, fee:'Rp 3.000', warranty:'Certified', live:true},
    {id:'cook', name:'Cooking & meal prep', unit:'per hour', floor:50000, ceiling:90000, step:5000, fee:'Rp 3.000', warranty:'Hygiene-trained', live:true},
    {id:'building', name:'Building periodic package', unit:'per month', floor:3500000, ceiling:7500000, step:250000, fee:'Contract', warranty:'Contract SLA', live:true}
  ];
  if (pub.bands) SERVICES.forEach(function (x) { if (pub.bands[x.id]) { x.floor = pub.bands[x.id].floor; x.ceiling = pub.bands[x.id].ceiling; } });
  var PROMOS = [
    {code:'CLEAN25', amount:25000, type:'rp', step:5000, scope:'First 3 bookings', budget:'62%', redeemed:'1.482', ends:'30 Sep', live:true},
    {code:'SABTUPAGI', amount:15, type:'pct', step:5, scope:'Sat before 10:00', budget:'31%', redeemed:'406', ends:'31 Oct', live:true},
    {code:'ACPROMO', amount:40000, type:'rp', step:5000, scope:'AC service, 2+ units', budget:'100%', redeemed:'900', ends:'exhausted', live:false},
    {code:'KANTOR10', amount:10, type:'pct', step:5, scope:'Office contracts', budget:'12%', redeemed:'38', ends:'31 Dec', live:true},
    {code:'WELCOME50', amount:50000, type:'rp', step:10000, scope:'New customers', budget:'—', redeemed:'0', ends:'1 Oct', live:false}
  ];
  if (pub.promos) PROMOS.forEach(function (p) { if (pub.promos[p.code] && pub.promos[p.code].live != null) p.live = pub.promos[p.code].live; });

  var NAV = [
    ['dash','Dashboard',''], ['live','Live ops','24'], ['orders','Orders','128'], ['cleaners','Cleaners','7'],
    ['services','Services & pricing',''], ['crm','CRM','3'], ['sop','SOP & QC','8'], ['desk','Complaint desk','9'], ['claims','Claims & refunds','12'],
    ['promos','Promos & vouchers',''], ['rewards','Poin & cashback',''], ['brand','Appearance',''],
    ['roles','Roles & permissions','8'], ['team','Admins','9']
  ];
  var META = {
    dash:['Dashboard','Jabodetabek · today, ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),'New booking'],
    live:['Live ops','24 petugas di lapangan · peta armada dan status real time','Reassign job'],
    orders:['Orders','1.284 bookings this month','Create order'],
    cleaners:['Cleaners','412 aktif · 7 menunggu verifikasi · wajib 2 kontak darurat ber-OTP','Invite cleaner'],
    services:['Services & pricing', SERVICES.length + ' layanan · pagu tarif marketplace','Add service'],
    crm:['CRM','24.180 customers · one timeline across booking, payment, chat and campaigns','New segment'],
    sop:['SOP & QC','87 dokumen terkontrol · SOP, checklist dan formulir yang dipakai mitra di lapangan','New document'],
    desk:['Complaint desk','9 open · every case has a named owner and a deadline','Log a complaint'],
    claims:['Claims & refunds','12 open · 0 past deadline','New claim'],
    promos:['Promos & vouchers','5 codes · 2 live','Create code'],
    rewards:['Poin & cashback','Aturan poin, tier dan cashback yang berlaku di aplikasi pelanggan','Simulasi'],
    brand:['Appearance','Logo, colour and app name across every surface','Preview apps'],
    roles:['Roles & permissions','8 roles · least-privilege by default','New role'],
    team:['Admins','9 admins · 2FA enforced','Invite admin']
  };

  /* ---------------------------------------------------------- pembantu */
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function aksi(n, a) { return ' data-aksi="' + n + '"' + (a === undefined ? '' : ' data-arg="' + esc(a) + '"'); }
  function chip(tone, teks, extra) {
    var k = tone === 'accent' ? 'chip-solid' : tone === 'green' ? 'chip-line' : 'chip-flat';
    return '<span class="chip ' + k + '" style="font-size:11px;padding:4px 11px' + (extra || '') + '">' + esc(teks) + '</span>';
  }
  function chipBtn(tone, teks, aksiNama, arg) {
    var k = tone === 'accent' ? 'chip-solid' : tone === 'green' ? 'chip-line' : 'chip-flat';
    return '<button class="chip chip-btn ' + k + '" style="font-size:11px;padding:4px 11px"' + aksi(aksiNama, arg) + '>' + esc(teks) + '</button>';
  }
  function pill(on, teks, aksiNama, arg, kecil) { return '<button class="pill' + (on ? ' on' : '') + (kecil ? ' pill-sm' : '') + '"' + aksi(aksiNama, arg) + '>' + esc(teks) + '</button>'; }
  function kpi(items, kecil, cols) {
    var h = '<div class="grid g' + (cols || items.length) + '">';
    items.forEach(function (k) {
      h += '<div class="card elev-sm kpi' + (kecil ? ' sm' : '') + '"><div class="lbl">' + esc(k.label) + '</div><div class="val">' + esc(k.value) + '</div>' +
        '<div class="note" style="' + (k.good === true ? 'color:var(--color-accent-2-800)' : k.good === false ? 'color:var(--color-accent-700)' : 'opacity:.65') + '">' + esc(k.note || k.delta || '') + '</div></div>';
    });
    return h + '</div>';
  }
  function tabel(cols, rows) {
    var h = '<table class="table"><thead><tr>'; cols.forEach(function (c) { h += '<th>' + c + '</th>'; }); h += '</tr></thead><tbody>';
    rows.forEach(function (r) { h += '<tr>'; r.forEach(function (c) { h += '<td>' + c + '</td>'; }); h += '</tr>'; });
    return h + '</tbody></table>';
  }
  function meter(pct, cls) { return '<div class="meter' + (cls === 'soft' ? ' soft' : '') + '"><i' + (cls === 'acc' ? ' class="acc"' : '') + ' style="width:' + pct + '%"></i></div>'; }
  function av(ini, s, nada) { return '<div class="av' + (nada ? ' av-' + nada : '') + '" style="--s:' + s + 'px">' + esc(ini) + '</div>'; }
  function sekilas(teks, nada) { S.sekilas = { teks:teks, nada:nada || 'ok' }; setTimeout(function () { S.sekilas = null; gambar(); }, 3000); }

  var VIEW = {}, AKSI = {};

  /* ---------------------------------------------- basis data sungguhan
     Bila basis data EXOCLEAN ada di asal ini (index.html sudah pernah
     disemai), Orders / Cleaners / Claims membaca tabel orders, users,
     complaints, ratings. Tanpa itu, data contoh rancangan. JANGAN
     memanggil EXO_DB.init() bila basisnya belum ada — init() menulis basis
     data kosong (lihat catatan di exo-core.js). */
  var dbSiap = null;
  function adaDB() {
    if (dbSiap !== null) return dbSiap;
    /* Sejak MCS dipisah (3 Sep 2026) tidak ada lagi index.html yang menyemai
       basis data; konsol ini membuatnya sendiri bila belum ada — kosong, lalu
       tombol "Isi data dummy" atau pendaftaran mitra yang mengisinya. */
    try { if (window.EXO_DB && window.EXO_DB) { EXO_DB.init(); dbSiap = true; } }
    catch (e) { dbSiap = false; }
    return dbSiap;
  }
  var STATUS_ORDER = { survei:['Survey','accent'], penawaran:['Quote sent','accent'], jemput:['Pickup','accent'], proposal:['Proposal','accent'], belanja:['Shopping','accent'], dijadwalkan:['Locked','green'], berjalan:['In progress','accent'], selesai:['Done','flat'], diverifikasi:['Verified','flat'], ditagih:['Invoiced','flat'], lunas:['Paid','flat'], dibatalkan:['Cancelled','accent'] };
  function tglPendek(iso) { try { return new Date(iso).toLocaleDateString('id-ID', { day:'numeric', month:'short' }); } catch (e) { return iso || ''; } }
  function namaUser(id) { var u = EXO_DB.find('users', id); return u ? u.nama : '—'; }

  /* ============================================================ DASHBOARD */
  VIEW.dash = function () {
    var h = kpi([
      {label:'Bookings today', value:'186', delta:'+12% vs last Sat', good:true},
      {label:'GMV this week', value:'Rp 482jt', delta:'+8,4%', good:true},
      {label:'Slot-lock breaches', value:'2', delta:'Rp200.000 auto-credited', good:false},
      {label:'Avg. first reply', value:'38s', delta:'Target under 60s', good:true}
    ]);
    var hs = [52,61,58,70,66,88,94,63,72,69,81,77,92,86], cs = [4,3,5,2,4,6,3,2,3,4,2,3,2,1];
    h += '<div class="grid g21"><div class="card elev-sm gap-14"><div class="flex items-baseline gap-12"><div class="card-title">Bookings — last 14 days</div><div class="t-115 o-6" style="margin-inline-start:auto">Completed vs cancelled</div></div><div class="chartbars">';
    for (var i = 0; i < 14; i++) h += '<div><div class="c" style="height:' + (cs[i] * 2) + '%"></div><div class="b" style="height:' + hs[i] + '%"></div><span>' + (20 + i) + '</span></div>';
    h += '</div></div><div class="card elev-sm gap-12"><div class="card-title">Promise health</div>';
    [['Schedule kept','99,4%',99],['Refunds inside promised date','100%',100],['Voucher applied as shown','99,8%',99],['On-time arrival','96,1%',96]].forEach(function (x) {
      h += '<div class="stack gap-5"><div class="flex t-125"><span class="grow o-8">' + x[0] + '</span><span class="bold">' + x[1] + '</span></div>' + meter(x[2]) + '</div>';
    });
    h += '<div class="t-115 o-65 lh-15" style="margin-top:2px">Any breach auto-credits the customer and shows here within a minute.</div></div></div>';
    h += '<div class="card elev-sm gap-12"><div class="flex items-baseline"><div class="card-title">Needs attention now</div><a href="#desk" style="margin-inline-start:auto" class="t-125">Open queue</a></div>';
    [['Claim','Damage claim · glass table','EXO-4392 · Ayu I. · Rp1.2jt','Decision by 17:00','Open',true,'claims'],
     ['Slot','Cleaner cancelled 3h before start','EXO-4460 · needs replacement in Cipete','Starts in 2h 10m','Reassign',true,'live'],
     ['Verify','3 cleaners waiting on ID check','Submitted yesterday','SLA 24h','Review',false,'cleaners'],
     ['Refund','Refund approaching promised date','EXO-4310 · Rp180.000 · due 1 Sep','1 day left','Chase bank',false,'claims']].forEach(function (a) {
      h += '<div class="att">' + chip(a[5] ? 'accent' : 'flat', a[0]) + '<div class="grow"><div class="t-13 bold">' + a[1] + '</div><div class="t-115 o-65">' + a[2] + '</div></div><div class="t-115 o-6">' + a[3] + '</div><button class="btn btn-primary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('view', a[6]) + '>' + a[4] + '</button></div>';
    });
    return h + '</div>';
  };

  /* ============================================================= LIVE OPS */
  VIEW.live = function () {
    var h = kpi([
      {label:'Petugas di lapangan', value:'24', note:'8 dalam perjalanan · 16 bekerja', good:true},
      {label:'GPS aktif', value:'24/24', note:'tidak ada sinyal hilang', good:true},
      {label:'Terlambat > 10 menit', value:'1', note:'kredit otomatis berjalan', good:false},
      {label:'Job belum berpetugas', value:'1', note:'Cipete 15:00 · perlu reassign', good:false},
      {label:'Rata-rata akurasi ETA', value:'±4 mnt', note:'7 hari terakhir', good:true}
    ], true, 5);
    h += '<div class="grid g141"><div class="card elev-sm table-card"><div class="map-ph"><div class="ph">live fleet map placeholder · Jabodetabek</div><div class="filters">';
    [['all','Semua'],['moving','Perjalanan'],['working','Bekerja'],['issue','Perlu tindakan']].forEach(function (f) { h += pill(S.mapFilter === f[0], f[1], 'mapFilter', f[0], true); });
    h += '</div><div class="legend">';
    [['Dalam perjalanan','8','var(--color-accent-500)'],['Sedang bekerja','16','var(--color-accent-2-500)'],['Terlambat','1','var(--color-accent-800)'],['Hub EXOCLEAN','3','var(--color-neutral-400)']].forEach(function (l) { h += '<div class="flex items-center gap-8 t-115"><span class="ldot" style="background:' + l[2] + '"></span><span class="grow">' + l[0] + '</span><span class="bold">' + l[1] + '</span></div>'; });
    h += '</div></div></div><div class="card elev-sm gap-11"><div class="card-title">Needs a dispatcher now</div>';
    [['Kosong','EXO-4460 · Cipete 15:00 belum ada petugas','Hourly 4h · 3 kandidat dalam radius 5 km','Reassign',true],['Telat','Rizky A. 12 menit dari jadwal','EXO-4466 · kredit Rp25.000 sudah dikirim otomatis','Buka',true],['Diam','Teguh W. tidak bergerak 14 menit','Masih di lokasi · checklist berjalan normal','Cek',false],['Selesai','Nurul F. selesai lebih cepat 25 menit','Bisa ambil job Cipete 15:00','Tawarkan',false]].forEach(function (a) {
      h += '<div class="att" style="align-items:flex-start;padding:11px 12px;border-radius:18px">' + chip(a[4] ? 'accent' : 'flat', a[0]) + '<div class="grow"><div class="t-125 bold">' + a[1] + '</div><div class="t-11 o-65">' + a[2] + '</div></div><button class="btn btn-primary" style="height:30px;padding:0 13px;font-size:11.5px"' + aksi('toast', a[3] + ' · dispatcher notified') + '>' + a[3] + '</button></div>';
    });
    h += '<div class="t-11 o-6 lh-145">Ops can reassign an unstaffed job, but never move a schedule the customer locked — the customer is asked first, always.</div></div></div>';
    var fleet = [
      ['Sari Wulandari','Bekerja','EXO-4471','Kemang Residence','4 dtk','08:56 ✓','2/6','Sabtu 09:00','green'],['Ayu Indriani','Bekerja','EXO-4470','Senopati','6 dtk','13:02 ✓','4/8','—','green'],
      ['Nurul Fadhilah','Selesai','EXO-4468','Kebayoran','11 dtk','07:58 ✓','8/8','Besok 10:00','flat'],['Rizky Ananda','Terlambat','EXO-4466','Bintaro · 3,2 km lagi','3 dtk','est. 09:12','—','—','accent'],
      ['Teguh Wibowo','Bekerja','EXO-4463','Cipete','14 dtk','08:44 ✓','5/6','Minggu 08:00','green'],['Dian Saputri','Perjalanan','EXO-4472','2,4 km dari lokasi','2 dtk','est. 10:04','—','—','green'],
      ['Lastri Maharani','Perjalanan','EXO-4474','6,1 km dari lokasi','5 dtk','est. 10:22','—','—','green'],['Rina Anggita','Standby','—','Hub Kemang','off shift','—','—','14:00','flat']
    ].filter(function (p) { return S.mapFilter === 'all' || (S.mapFilter === 'moving' && p[1] === 'Perjalanan') || (S.mapFilter === 'working' && p[1] === 'Bekerja') || (S.mapFilter === 'issue' && p[8] === 'accent'); });
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Field staff — live</div><div class="t-115 o-6">Lokasi hanya terekam saat petugas dalam perjalanan atau bekerja</div></div>' + chip('green', 'Updated 4s ago') + '</div>' +
      tabel(['Petugas','Status','Order','Lokasi','GPS','Tiba','Checklist','Sisa jadwal'], fleet.map(function (p) { return ['<b>' + p[0] + '</b>', chip(p[8], p[1]), p[2], p[3], '<span style="' + (p[4] === 'off shift' ? 'opacity:.55' : 'font-weight:600') + '">' + p[4] + '</span>', p[5], p[6], '<span class="o-75">' + p[7] + '</span>']; })) + '</div>';
    h += '<div class="t-115 o-6">Pelanggan melihat titik dan ETA petugas yang menangani pesanannya saja; pusat melihat seluruh armada. Riwayat lokasi disimpan 30 hari untuk pembuktian klaim, lalu dihapus.</div>';
    return h;
  };

  /* =============================================================== ORDERS */
  VIEW.orders = function () {
    var h = '<div class="flex gap-8">';
    [['all','All'],['today','Today'],['progress','In progress'],['issue','With issue'],['sub','Subscriptions']].forEach(function (f) { h += pill(S.orderFilter === f[0], f[1], 'orderFilter', f[0]); });
    if (adaDB()) {
      /* "Hari ini" dinilai MENURUT KOTA PESANAN: order Jayapura sudah masuk
         hari berikutnya dua jam sebelum Jakarta. Jam diberi label zona
         (WIB/WITA/WIT) supaya admin di kota lain tidak salah baca. */
      var lokal = new Date(); var hariIni = lokal.getFullYear() + '-' + ('0' + (lokal.getMonth() + 1)).slice(-2) + '-' + ('0' + lokal.getDate()).slice(-2);
      function zonaOrder(o) { if (!window.EXO_ZONA) return ''; if (o.zona && EXO_ZONA.sah(o.zona)) return o.zona; return o.wilayah ? (EXO_ZONA.dariWilayah(o.wilayah) || '') : ''; }
      var nyata = EXO_DB.all('orders').sort(function (a, b) { return (b.tgl || '').localeCompare(a.tgl || ''); }).map(function (o) {
        var st = STATUS_ORDER[o.status] || [o.status, 'flat'], tz = zonaOrder(o);
        var tags = (o.tgl === (tz ? EXO_ZONA.hariIni(tz) : hariIni) ? 'today ' : '') + (o.status === 'berjalan' ? 'progress ' : '') + (EXO_DB.where('complaints', function (c) { return c.orderId === o.id; }).length ? 'issue' : '');
        return [o.no || o.id, namaUser(o.clientId), o.judul || '', (o.workerIds || []).map(namaUser).join(', ') || '—', tglPendek(o.tgl) + ' ' + (o.mulai || '') + (tz ? ' ' + EXO_ZONA.singkat(tz) : ''), rp(o.nilai), st[0], st[1], tags];
      }).filter(function (o) { return S.orderFilter === 'all' || o[8].indexOf(S.orderFilter) >= 0; });
      h += '</div><div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Orders from the EXOCLEAN database</div><div class="t-115 o-6">' + nyata.length + ' shown · table orders on this origin · schedules locked to the customer · times labelled in the order\'s own zone (WIB/WITA/WIT)</div></div></div>' +
        tabel(['Order','Customer','Service','Cleaner','Schedule','Value','Status'], nyata.length ? nyata.map(function (o) { return ['<span class="id">' + esc(o[0]) + '</span>', esc(o[1]), esc(o[2]), esc(o[3]), esc(o[4]), o[5], chip(o[7], o[6])]; })
          : [['<span class="o-6">No orders in the database on this origin' + (S.orderFilter !== 'all' ? ' for this filter' : '') + '. The marketplace app does not write orders yet; index.html seeds sample orders on first open.</span>', '', '', '', '', '', '']]) + '</div>';
      return h + '<div class="t-115 o-6">Admins can cancel or refund an order, but cannot move a locked schedule — that right sits with the customer only.</div>';
    }
    var rows = [
      ['EXO-4471','Dewi Anggraini','Hourly · 3h','Sari Wulandari','Today 09:00','Rp 237.000','In progress','accent','today progress'],
      ['EXO-4470','Rangga P.','AC · 3 units','Ayu Indriani','Today 13:00','Rp 258.000','Locked','green','today'],
      ['EXO-4468','Maya S.','Deep clean · 5h','Nurul Fadhilah','Today 08:00','Rp 703.000','Done','flat','today'],
      ['EXO-4460','Bagus H.','Hourly · 4h','— reassigning','Today 15:00','Rp 315.000','Needs cleaner','accent','today issue'],
      ['EXO-4455','Intan K.','Sofa · 6 seats','Dian Saputri','Tomorrow 10:00','Rp 903.000','Locked','green',''],
      ['EXO-4451','PT Karya Mitra','Office · 8h','Crew of 3','Sun 06:00','Rp 2.280.000','Locked','green','sub'],
      ['EXO-4392','Farah N.','Deep clean · 4h','Ayu Indriani','28 Aug','Rp 562.000','Claim open','accent','issue'],
      ['EXO-4310','Hendra W.','AC · 2 units','Rizky A.','21 Aug','Rp 173.000','Refunding','flat','issue']
    ].filter(function (o) { return S.orderFilter === 'all' || o[8].indexOf(S.orderFilter) >= 0; });
    h += '</div><div class="card elev-sm table-card">' + tabel(['Order','Customer','Service','Cleaner','Schedule','Value','Status'], rows.map(function (o) { return ['<span class="id">' + o[0] + '</span>', o[1], o[2], o[3], o[4], o[5], chip(o[7], o[6])]; })) + '</div>';
    return h + '<div class="t-115 o-6">Admins can cancel or refund an order, but cannot move a locked schedule — that right sits with the customer only.</div>';
  };

  /* ============================================================= CLEANERS */
  VIEW.cleaners = function () {
    var q = [
      {ini:'RA', name:'Rina Anggita', area:'Bintaro', applied:'2 days ago', docs:[['KTP','Verified',true],['Police record (SKCK)','Verified',true],['Skills test','Scheduled 2 Sep',false],['Bank account','Missing',false],['Kontak darurat (2 nomor)','1 dari 2',false]]},
      {ini:'TW', name:'Teguh Wibowo', area:'Cipete', applied:'3 days ago', docs:[['KTP','Verified',true],['Police record (SKCK)','In review',false],['Skills test','Passed',true],['Bank account','Verified',true],['Kontak darurat (2 nomor)','Terverifikasi',true]]},
      {ini:'LM', name:'Lastri Maharani', area:'Kebayoran', applied:'yesterday', docs:[['KTP','Verified',true],['Police record (SKCK)','Verified',true],['Skills test','Passed',true],['Bank account','Verified',true],['Kontak darurat (2 nomor)','Terverifikasi',true]]}
    ].filter(function (v) { return !S.approved[v.name]; });
    var h = '<div class="grid g3">';
    q.forEach(function (v) {
      var ok = v.docs.every(function (d) { return d[2]; });
      h += '<div class="card elev-sm gap-12"><div class="flex items-center gap-11">' + av(v.ini, 44, 'leaf') + '<div class="grow"><div class="f-head t-15">' + v.name + '</div><div class="t-115 o-65">' + v.area + ' · applied ' + v.applied + '</div></div></div><div class="stack gap-7">';
      v.docs.forEach(function (d) { h += '<div class="flex items-center gap-8 t-12"><span class="ldot" style="width:8px;height:8px;background:' + (d[2] ? 'var(--color-accent-2-500)' : 'var(--color-accent-400)') + '"></span><span class="grow o-85">' + d[0] + '</span><span class="t-11 o-6">' + d[1] + '</span></div>'; });
      h += '</div><div class="flex gap-8"><button class="btn btn-primary" style="flex:1;height:36px;font-size:12.5px"' + (ok ? aksi('approve', v.name) : ' disabled') + '>' + (ok ? 'Setujui mitra' : 'Dokumen belum lengkap') + '</button><button class="btn btn-secondary" style="flex:1;height:36px;font-size:12.5px"' + aksi('request', v.name) + '>' + (S.requested[v.name] ? 'Permintaan terkirim ✓' : 'Minta dokumen') + '</button></div>' +
        '<div class="t-11 o-65 lh-14">' + (ok ? 'Menyetujui akan membuka akun mitra, mengirim kontrak digital, dan menjadwalkan orientasi (SOP A-001).' : 'Persetujuan terkunci sampai KTP, SKCK, uji keterampilan, rekening, dan dua kontak darurat terverifikasi (masing-masing dikonfirmasi lewat OTP).') + '</div></div>';
    });
    if (!q.length) h += '<div class="card elev-sm t-125 o-7">Antrian verifikasi kosong.</div>';
    h += '</div>';
    if (adaDB() && window.SEMAI_DUMMY) {
      var nDummy = EXO_DB.where('users', function (u) { return u.sumber === 'dummy'; }).length;
      h += '<div class="card elev-sm" style="flex-direction:row;align-items:center;gap:12px">' + chip(nDummy ? 'green' : 'flat', nDummy ? nDummy + ' data uji' : 'Belum ada data uji') +
        '<div class="grow t-125 o-75">Data uji: 20 klien + 50 mitra dari 26 kota Indonesia, terisi penuh dan terverifikasi (S&amp;K, KTP, 2 kontak darurat, 5 kursus wajib, sertifikat, tarif pasar). Tanpa order. Bisa diulang tanpa menggandakan.</div>' +
        '<button class="btn btn-primary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('semaiDummy') + '>Semai data uji</button>' +
        (nDummy ? '<button class="btn btn-secondary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('hapusDummy') + '>Hapus data uji</button>' : '') + '</div>';
    }
    if (adaDB() && window.EXO_ROSTER) {
      var pekerja = EXO_DB.where('users', function (u) { return u.role === 'worker'; }).map(function (u) {
        var p = EXO_ROSTER.data(u), s = EXO_ROSTER.statistik(u.id), tayang = EXO_ROSTER.tayang(u);
        return ['<b>' + esc(u.nama) + '</b>', esc(u.jabatan || '—'), s.bintang === null ? '<span class="o-55">not rated</span>' : String(s.bintang).replace('.', ','), String(s.kerja), (u.sertifikat || []).join(', ') || '—', p.tarif ? rp(p.tarif) + '/h' : '<span class="o-55">not set</span>', chip(tayang ? 'green' : p.tarif ? 'flat' : 'accent', tayang ? 'Listed' : p.tarif ? 'Hidden' : 'No rate')];
      });
      h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Roster from the EXOCLEAN database</div><div class="t-115 o-6">' + pekerja.length + ' workers · rate is set by Super admin in index.html → Mitra & Rekrutmen → Tarif pasar; ratings computed from completed orders</div></div></div>' +
        tabel(['Cleaner','Role','Rating','Jobs','Certificates','Marketplace rate','Standing'], pekerja) + '</div>';
      return h;
    }
    var roster = [['Ayu Indriani','Kemang','4,8','2.106','97%','Rp 88.000/h','Top rated','green'],['Sari Wulandari','Kemang','4,9','1.284','99%','Rp 78.000/h','Top rated','green'],['Nurul Fadhilah','Senopati','4,9','812','98%','Rp 72.000/h','Good','flat'],['Dian Saputri','Cipete','4,7','344','94%','Rp 65.000/h','New','flat'],['Rizky Ananda','Bintaro','4,5','520','88%','Rp 70.000/h','Coaching','accent']];
    h += '<div class="card elev-sm table-card">' + tabel(['Cleaner','Area','Rating','Jobs','On-time','Own rate','Standing'], roster.map(function (r) { return ['<b>' + r[0] + '</b>', r[1], r[2], r[3], r[4], r[5], chip(r[7], r[6])]; })) + '</div>';
    return h;
  };

  /* ============================================================= SERVICES */
  function val(id, f) { var v = S.svcEdits[id + '.' + f]; return v == null ? SERVICES.filter(function (x) { return x.id === id; })[0][f] : v; }
  VIEW.services = function () {
    var h = '<div class="card elev-sm" style="flex-direction:row;align-items:center;gap:10px">' + chip(S.svcDirty ? 'accent' : 'green', S.svcDirty ? 'Perubahan belum tayang' : 'Semua harga tayang') +
      '<div class="grow t-125 o-75">Ketik langsung angkanya di kolom, atau pakai tombol − / +. Klik status di kolom terakhir untuk menghentikan sementara sebuah layanan.<span style="display:block" class="t-11 o-75">' + (S.svcDirty ? 'Harga baru hanya berlaku untuk pesanan baru; pesanan terjadwal memakai harga saat dipesan.' : 'Layanan yang dijeda langsung hilang dari katalog dan beranda EXOCLEAN App.') + '</span></div>' +
      '<button class="btn btn-secondary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('resetServices') + '>Revert</button><button class="btn btn-primary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('publishServices') + '>Publish price changes</button></div>';
    var rows = SERVICES.map(function (x) {
      var live = S.svcOff[x.id] ? false : x.live, dirty = S.svcEdits[x.id + '.floor'] != null || S.svcEdits[x.id + '.ceiling'] != null;
      function stp(f) { return '<span class="step"><button' + aksi('bump', x.id + ':' + f + ':-1') + '>−</button><input class="' + (dirty ? 'dirty' : '') + '" value="' + val(x.id, f).toLocaleString('id-ID') + '" data-ubah="setPrice" data-arg="' + x.id + ':' + f + '"><button' + aksi('bump', x.id + ':' + f + ':1') + '>+</button></span>'; }
      return ['<b>' + x.name + '</b>', x.unit, stp('floor'), stp('ceiling'), x.fee, x.warranty, chipBtn(live ? 'green' : 'accent', live ? 'Live' : 'Paused', 'toggleLive', x.id)];
    });
    h += '<div class="card elev-sm table-card">' + tabel(['Service','Unit','Rate floor','Rate ceiling','Platform fee','Warranty','Live'], rows) + '</div>';
    h += '<div class="card elev-sm gap-10" style="max-width:620px"><div class="f-head t-16">Why floors and ceilings</div><div class="t-125 lh-15 o-85">Cleaners set their own rate inside this band. The floor protects earnings, the ceiling keeps the marketplace honest, and the fee stays flat per booking — no surge pricing anywhere in the product.</div></div>';
    return h;
  };

  /* =============================================================== CLAIMS */
  VIEW.claims = function () {
    var h = kpi([{label:'Open claims', value:'12', note:'0 past their promised date'},{label:'Median decision', value:'6h 20m', note:'Promise: same working day'},{label:'Auto-credits this week', value:'Rp 1,4jt', note:'Paid without a ticket'}]);
    if (adaDB()) {
      var kompl = EXO_DB.all('complaints').map(function (c) {
        var o = EXO_DB.find('orders', c.orderId) || {};
        var st = c.status === 'baru' ? ['Open', 'accent'] : c.status === 'selesai' ? ['Closed', 'flat'] : [c.status, 'green'];
        return ['<span class="id">' + esc(c.id.toUpperCase()) + '</span>', esc(o.no || c.orderId), 'Quality', esc(c.reworkOrderId ? 'Re-clean booked' : 'Free redo'), esc(tglPendek(c.at)), '<span class="t-12">' + (c.status === 'baru' ? 'next working day 17:00' : '—') + '</span>', esc(namaUser(c.clientId)), chip(st[1], st[0])];
      });
      h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Complaints from the EXOCLEAN database</div><div class="t-115 o-6">' + kompl.length + ' rows · table complaints on this origin</div></div></div>' +
        tabel(['Claim','Order','Type','Amount','Opened','Decision due','Customer','State'], kompl.length ? kompl : [['<span class="o-6">No complaints in the database on this origin — the queue is genuinely empty, not hidden.</span>', '', '', '', '', '', '', '']]) + '</div>';
      return h + '<div class="t-115 o-6">Every claim carries a named human owner and a dated deadline. The person who raises a claim never approves it; refunds above Rp5jt need Finance + Super admin.</div>';
    }
    var rows = [['CLM-118','EXO-4392','Damage','Rp 1.200.000','2h ago','Today 17:00','Rahma','With insurer','accent'],['CLM-117','EXO-4460','Slot moved','Rp 100.000','3h ago','Auto-paid','System','Credited','green'],['CLM-115','EXO-4380','Quality','Free redo','yesterday','Tomorrow 12:00','Bagas','Redo booked','green'],['CLM-113','EXO-4310','Refund','Rp 180.000','21 Aug','1 Sep','Rahma','At bank','flat'],['CLM-111','EXO-4288','Late arrival','Rp 50.000','19 Aug','Auto-paid','System','Credited','green'],['CLM-109','EXO-4241','Quality','Rp 237.000','17 Aug','Closed','Bagas','Refunded','flat']];
    h += '<div class="card elev-sm table-card">' + tabel(['Claim','Order','Type','Amount','Opened','Decision due','Owner','State'], rows.map(function (c) { return ['<span class="id">' + c[0] + '</span>', c[1], c[2], c[3], c[4], '<span class="t-12' + (c[5].indexOf('Today') === 0 ? ' bold c-accent-700' : '') + '">' + c[5] + '</span>', c[6], chip(c[8], c[7])]; })) + '</div>';
    return h + '<div class="t-115 o-6">Every claim carries a named human owner and a dated deadline. Missing the deadline credits the customer automatically — the queue cannot go quiet. The person who raises a claim never approves it; refunds above Rp5jt need Finance + Super admin.</div>';
  };

  /* =============================================================== PROMOS */
  VIEW.promos = function () {
    var rows = PROMOS.map(function (p) {
      var amt = S.promoEdits[p.code] == null ? p.amount : S.promoEdits[p.code], live = S.promoOff[p.code] ? !p.live : p.live;
      return ['<span class="id">' + p.code + '</span>', '<span class="step"><button' + aksi('promo', p.code + ':-1') + '>−</button><span class="v' + (S.promoEdits[p.code] != null ? ' dirty' : '') + '">' + (p.type === 'rp' ? rp(amt) : amt + '%') + ' off</span><button' + aksi('promo', p.code + ':1') + '>+</button></span>', p.scope, p.budget, p.redeemed, p.ends, chipBtn(live ? 'green' : 'accent', live ? 'Live' : 'Stopped', 'togglePromo', p.code)];
    });
    var h = '<div class="card elev-sm" style="flex-direction:row;align-items:center;gap:10px">' + chip(S.promoDirty ? 'accent' : 'green', S.promoDirty ? 'Perubahan belum tayang' : 'Kode tayang sesuai tabel') + '<div class="grow t-125 o-75">CLEAN25 divalidasi di keranjang EXOCLEAN App: nominal dan statusnya diambil dari sini setelah dipublikasikan.</div><button class="btn btn-primary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('publishPromos') + '>Publish codes</button></div>';
    h += '<div class="card elev-sm table-card">' + tabel(['Code','Discount','Applies to','Budget used','Redeemed','Ends','State'], rows) + '</div>';
    return h + '<div class="card elev-sm gap-10" style="max-width:620px"><div class="f-head t-16">Validation rules run before checkout</div><div class="t-125 lh-15 o-85">A code that cannot apply to the customer\'s cart is refused at the cart, with the reason shown in the app — never accepted and then silently dropped at payment.</div></div>';
  };

  /* ================================================================ AKSI */
  AKSI.view = function (v) { S.view = v; location.hash = v; };
  AKSI.toast = function (v) { sekilas(v); };
  AKSI.orderFilter = function (v) { S.orderFilter = v; };
  AKSI.deskFilter = function (v) { S.deskFilter = v; };
  AKSI.mapFilter = function (v) { S.mapFilter = v; };
  AKSI.sopTab = function (v) { S.sopTab = v; };
  AKSI.semaiDummy = function () {
    var r = SEMAI_DUMMY.jalankan();
    if (!r.ok) { sekilas(r.alasan, 'err'); return; }
    sekilas(r.klienBaru + ' klien + ' + r.mitraBaru + ' mitra baru dari ' + r.jumlahKota + ' kota' + (r.klienLewat + r.mitraLewat ? ' · ' + (r.klienLewat + r.mitraLewat) + ' sudah ada, dilewati' : '') + '.');
  };
  AKSI.hapusDummy = function () {
    if (!window.confirm('Hapus semua baris bertanda data uji (klien, mitra, pembelajaran, sertifikat)?')) return;
    var r = SEMAI_DUMMY.bersihkan(); sekilas(r.dihapus + ' baris data uji dihapus.');
  };
  AKSI.approve = function (v) { S.approved[v] = true; sekilas(v + ' disetujui · kontrak digital dan orientasi A-001 dikirim.'); };
  AKSI.request = function (v) { S.requested[v] = true; sekilas('Permintaan dokumen dikirim ke ' + v + ' lewat WhatsApp.'); };
  /* Pagu: floor tidak boleh melampaui ceiling. Ditahan di batasnya dan
     diberi tahu, bukan diam-diam ditukar. */
  function pasangPagu(id, f, n) {
    var lain = val(id, f === 'floor' ? 'ceiling' : 'floor');
    if (f === 'floor' && n > lain) { n = lain; sekilas('Floor cannot exceed the ceiling — held at ' + rp(lain) + '.', 'err'); }
    if (f === 'ceiling' && n < lain) { n = lain; sekilas('Ceiling cannot go below the floor — held at ' + rp(lain) + '.', 'err'); }
    S.svcEdits[id + '.' + f] = n; S.svcDirty = true;
  }
  AKSI.bump = function (v) {
    var p = v.split(':'), id = p[0], f = p[1], dir = Number(p[2]), base = SERVICES.filter(function (x) { return x.id === id; })[0];
    pasangPagu(id, f, Math.max(base.step, val(id, f) + dir * base.step));
  };
  AKSI.setPrice = function (arg, raw) { var p = arg.split(':'), n = parseInt(String(raw).replace(/[^\d]/g, ''), 10); if (isNaN(n)) return; pasangPagu(p[0], p[1], Math.max(1000, n)); };
  AKSI.toggleLive = function (id) { S.svcOff[id] = !S.svcOff[id]; S.svcDirty = true; };
  AKSI.publishServices = function () {
    var p = bacaPub(); p.svcOff = {}; for (var k in S.svcOff) if (S.svcOff[k]) p.svcOff[k] = true;
    p.bands = {}; SERVICES.forEach(function (x) { x.floor = val(x.id, 'floor'); x.ceiling = val(x.id, 'ceiling'); p.bands[x.id] = { floor:x.floor, ceiling:x.ceiling }; });
    S.svcEdits = {}; S.svcDirty = false; sekilas(tulisPub(p) ? 'Harga dan status layanan tayang di EXOCLEAN App.' : 'Gagal menyimpan — penyimpanan peramban ditolak.', 'ok');
  };
  AKSI.resetServices = function () { S.svcEdits = {}; S.svcOff = (bacaPub().svcOff) || {}; S.svcDirty = false; };
  AKSI.promo = function (v) {
    var p = v.split(':'), code = p[0], dir = Number(p[1]), pr = PROMOS.filter(function (x) { return x.code === code; })[0];
    var cur = S.promoEdits[code] == null ? pr.amount : S.promoEdits[code], n = Math.max(pr.step, cur + dir * pr.step);
    if (pr.type === 'pct' && n > 100) { n = 100; sekilas('A percentage discount cannot exceed 100%.', 'err'); }
    S.promoEdits[code] = n; S.promoDirty = true;
  };
  AKSI.togglePromo = function (code) { S.promoOff[code] = !S.promoOff[code]; S.promoDirty = true; };
  AKSI.publishPromos = function () {
    var p = bacaPub(); p.promos = {};
    PROMOS.forEach(function (pr) { var live = S.promoOff[pr.code] ? !pr.live : pr.live; pr.live = live; p.promos[pr.code] = { amount: S.promoEdits[pr.code] == null ? pr.amount : S.promoEdits[pr.code], live: live }; });
    S.promoOff = {}; S.promoDirty = false; sekilas(tulisPub(p) ? 'Kode voucher tayang — CLEAN25 divalidasi di keranjang dengan nominal ini.' : 'Gagal menyimpan.', 'ok');
  };

  /* ============================================================== GAMBAR */
  function gambar() {
    if (!VIEW[S.view]) S.view = 'dash';
    var side = document.getElementById('adm-side'), top = document.getElementById('adm-top'), body = document.getElementById('adm-body'), lapis = document.getElementById('adm-lapis');
    var b = S.brand;
    var h = '<div class="adm-brand"><img src="' + esc(b.markSrc) + '" data-brand="mark" alt=""><div><div class="n">' + esc(b.appName) + '</div><div class="tg">We clean all purpose</div><div class="sub">Backend console</div></div></div><div class="adm-nav">';
    NAV.forEach(function (n) { h += '<button class="' + (S.view === n[0] ? 'on' : '') + '"' + aksi('view', n[0]) + '><span class="lbl">' + n[1] + '</span>' + (n[2] ? '<span class="bd">' + n[2] + '</span>' : '') + '</button>'; });
    h += '<a href="exo-analisa.html" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:18px;font-size:13.5px;font-weight:600;text-decoration:none;color:inherit;opacity:.8"><span class="lbl" style="flex:1">Analisa pasar ↗</span></a>' +
      '<a href="exo.html" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:18px;font-size:13.5px;font-weight:600;text-decoration:none;color:inherit;opacity:.8"><span class="lbl" style="flex:1">Buka EXOCLEAN App ↗</span></a>';
    h += '</div><div class="adm-me">' + av('AN', 34) + '<div class="grow"><div class="t-125 bold">Andriyadi N.</div><div class="t-105 o-6">Super admin' + (adaDB() ? ' · DB connected' : ' · sample data') + '</div></div></div>';
    side.innerHTML = h;
    var m = META[S.view];
    top.innerHTML = '<div class="grow"><h3>' + esc(m[0]) + '</h3><div class="sub">' + esc(m[1]) + '</div></div><div class="adm-search">Search order, cleaner, customer…</div><button class="btn btn-secondary"' + aksi('toast', 'Export queued — CSV lands in your inbox.') + '>Export</button><button class="btn btn-primary"' + aksi('toast', m[2] + ' — form opens in the full build.') + '>' + esc(m[2]) + '</button>';
    var gulir = window.scrollY;
    body.innerHTML = VIEW[S.view]();
    window.scrollTo(0, gulir);
    lapis.innerHTML = S.sekilas ? '<div class="adm-toast ' + S.sekilas.nada + '">' + esc(S.sekilas.teks) + '</div>' : '';
    EXO_BRAND.terapkan(S.brand);
    document.title = b.appName + ' — Backend console';
  }
  function pasang() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-aksi]') : null; if (!t || t.disabled) return;
      var fn = AKSI[t.getAttribute('data-aksi')]; if (!fn) return;
      if (t.tagName !== 'LABEL' && t.tagName !== 'A') ev.preventDefault();
      fn(t.getAttribute('data-arg')); gambar();
    });
    document.addEventListener('change', function (ev) {
      var el = ev.target; if (!el.getAttribute) return;
      var ubah = el.getAttribute('data-ubah'); if (ubah && AKSI[ubah]) { AKSI[ubah](el.getAttribute('data-arg'), el.value, el); gambar(); }
    });
    window.addEventListener('hashchange', function () { var v = location.hash.slice(1); if (VIEW[v]) { S.view = v; gambar(); } });
    gambar();
  }

  return { S:S, VIEW:VIEW, AKSI:AKSI, SERVICES:SERVICES, PROMOS:PROMOS, rp:rp, esc:esc, aksi:aksi, chip:chip, chipBtn:chipBtn, pill:pill, kpi:kpi, tabel:tabel, meter:meter, av:av, sekilas:sekilas, bacaPub:bacaPub, tulisPub:tulisPub, gambar:gambar, pasang:pasang };
})();
