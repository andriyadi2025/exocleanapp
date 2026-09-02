/* ==========================================================================
   exo-admin-views.js — konsol backend EXOCLEAN App: modul 8–14
   crm · sop · desk · rewards · brand · roles · team
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, rp = A.rp, esc = A.esc, aksi = A.aksi, chip = A.chip, chipBtn = A.chipBtn, pill = A.pill, kpi = A.kpi, tabel = A.tabel, meter = A.meter, av = A.av;
  function bullets(list) { var h = ''; list.forEach(function (x) { h += '<div class="bullet"><i></i><span class="o-85">' + x + '</span></div>'; }); return h; }

  /* ================================================================== CRM */
  VIEW.crm = function () {
    var h = kpi([{label:'Active customers', value:'24.180', note:'+612 this month'},{label:'Repeat rate', value:'63%', note:'2nd booking within 45 days'},{label:'Subscribers', value:'3.412', note:'weekly or fortnightly slot'},{label:'Churn risk', value:'740', note:'no booking in 60 days'},{label:'LTV · 12 months', value:'Rp 4,1jt', note:'Gold cohort Rp 7,3jt'}], true, 5);
    h += '<div class="grid g131"><div class="card elev-sm gap-14"><div class="flex items-baseline"><div class="card-title">Lifecycle pipeline</div><div class="t-115 o-6" style="margin-inline-start:auto">Last 90 days · 24.180 customers</div></div><div class="stack gap-10">';
    [['Signed up','24.180','—',100],['First booking','19.640','81% convert',81],['Repeat (2+)','12.370','63%',63],['Favourite cleaner','8.902','45%',45],['Subscriber','3.412','17%',17],['Dormant 60d','740','win-back running',9]].forEach(function (l) {
      h += '<div class="lifecycle"><div class="nm">' + l[0] + '</div><div class="bar"><i style="width:' + Math.max(l[3], 6) + '%;background:var(--color-accent-' + (l[3] > 60 ? '500' : l[3] > 30 ? '400' : '300') + ')"></i></div><div class="f-head t-14" style="width:64px;text-align:end">' + l[1] + '</div><div class="t-115 o-65" style="width:96px;text-align:end">' + l[2] + '</div></div>';
    });
    h += '</div><div class="t-115 o-6 lh-15">Stages update from booking, payment and claim events in real time — no nightly import, so support and marketing always see the same customer state.</div></div>';
    h += '<div class="card elev-sm gap-12"><div class="card-title">Segments</div>';
    [['Gold, no booking 45d','LTV > Rp5jt · last order > 45d','318'],['Loved a cleaner','Same cleaner 3+ times · not subscribed','2.104'],['Voucher-only','Every order used a code','1.876'],['Office decision makers','Company billing · 2+ sites','214'],['Bad first experience','Rated ≤3 on first visit','96'],['AC seasonal','Booked AC service last dry season','3.640']].forEach(function (s) {
      h += '<div class="seg-row"><div class="grow"><div class="t-125 bold">' + s[0] + '</div><div class="t-11 o-65">' + s[1] + '</div></div><div class="f-head t-14">' + s[2] + '</div></div>';
    });
    h += '</div></div>';
    h += '<div class="grid g12"><div class="card elev-sm gap-12"><div class="flex items-center gap-10">' + av('DA', 44, 'leaf') + '<div class="grow"><div class="f-head t-16">Dewi Anggraini</div><div class="t-115 o-65">Gold · customer since Mar 2025 · Kemang</div></div>' + chip('green', 'Healthy') + '</div><div class="grid g3" style="gap:10px">';
    [['14','Orders'],['Rp 3,2jt','Lifetime value'],['4,9','Avg. rating given']].forEach(function (c) { h += '<div style="background:var(--color-surface);border-radius:18px;padding:10px 12px"><div class="f-head t-17">' + c[0] + '</div><div class="t-105 o-65">' + c[1] + '</div></div>'; });
    h += '</div><div class="timeline stack">';
    [['Booking locked · EXO-4471','Hourly 3h · Sari Wulandari · Rp237.000','today','var(--color-accent)'],['Shared referral card to WhatsApp','Code DEWI50 · 2 friends joined','2d','var(--color-accent-2-500)'],['Win-back WhatsApp not sent','Suppressed — she already had an open booking','6d','var(--color-neutral-400)'],['Claim resolved · late arrival','Rp25.000 auto-credit, no ticket needed','12d','var(--color-accent-2-500)'],['Subscription started · Saturdays 09:00','Same cleaner held','21d','var(--color-accent)'],['Support chat · gate access question','Rahma · resolved in 3 min','28d','var(--color-neutral-400)']].forEach(function (t) {
      h += '<div class="row-t"><div class="rail"><span style="background:' + t[3] + '"></span><i></i></div><div class="grow" style="padding-bottom:12px"><div class="t-125 bold">' + t[0] + '</div><div class="t-11 o-65">' + t[1] + '</div></div><div class="t-11 o-55">' + t[2] + '</div></div>';
    });
    h += '</div><div class="t-115 o-6 lh-15">One timeline for bookings, payments, claims, chats and campaigns — an agent never has to ask “what happened last time”.</div></div>';
    h += '<div class="stack gap-16"><div class="card elev-sm table-card"><div class="card-head"><div class="grow card-title">Automations</div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('toast', 'Journey builder opens in the full build.') + '>New journey</button></div>' +
      tabel(['Journey','Trigger','Channel','Sent 30d','Converted','State'], [['First-clean welcome','Order completed · 1st','WhatsApp → push','1.940','38%','Live','green'],['Rebook your cleaner','21 days since last visit','Push','6.120','22%','Live','green'],['Subscription nudge','3rd booking, same cleaner','In-app card','2.104','19%','Live','green'],['Win-back 60 days','Dormant 60d','WhatsApp + voucher','740','11%','Live','green'],['Service recovery','Rating ≤ 3','Human call, no marketing','96','71% stayed','Live','accent'],['AC dry-season reminder','Seasonal · last AC order','Push','—','—','Scheduled','flat']].map(function (j) { return ['<b class="t-125">' + j[0] + '</b>', '<span class="t-12">' + j[1] + '</span>', '<span class="t-12">' + j[2] + '</span>', j[3], j[4], chip(j[6], j[5])]; })) + '</div>';
    h += '<div class="card elev-sm gap-11"><div class="f-head t-16">How channels stay coordinated</div>' + bullets(['One frequency cap across every channel: maximum two marketing messages a week, counted together, not per channel.','Operational messages (cleaner on the way, claim decision) always win — marketing is suppressed while a booking is open.','A customer with an open claim or a rating of 3 or lower is excluded from every campaign until a human closes the loop.','Support sees the same timeline as marketing, so an agent knows which campaign the customer just received.','Unsubscribing from one channel stops that channel only — and is honoured within a minute, logged in the audit trail.']) + '</div></div></div>';
    return h;
  };

  /* ================================================================== SOP */
  VIEW.sop = function () {
    var h = '<div class="flex gap-8">';
    [['lib','Document register'],['assign','Assigned to contracts'],['qc','QC & evidence']].forEach(function (t) { h += pill(S.sopTab === t[0], t[1], 'sopTab', t[0]); });
    h += '</div>';
    if (S.sopTab === 'lib') {
      h += kpi([{label:'Dokumen terkontrol', value:'87', note:'66 SOP · 11 checklist · 10 formulir'},{label:'Menunggu persetujuan', value:'8', note:'7 SOP layanan baru + rev.01 A-011'},{label:'Jatuh tempo tinjau', value:'6', note:'dalam 30 hari'},{label:'Dipakai di lapangan', value:'92%', note:'7 SOP layanan baru belum berlaku'}], true, 4);
      var docs = [['A-008','Penanganan Keluhan Kebersihan','Administrasi','00','1 Jul 2026','Semua kontrak','1 Jul 2027','Berlaku','green'],['A-011','Inspeksi Kualitas oleh Supervisor','Administrasi','01','menunggu','Semua kontrak','—','Diperiksa','accent'],['D-005','Pembersihan Lobby Utama','Area','00','1 Jul 2026','12 gedung','1 Jul 2027','Berlaku','green'],['D-012','Pembersihan Toilet & Urinal','Area','00','1 Jul 2026','Semua kontrak','1 Jul 2027','Berlaku','green'],['D-021','Pembersihan Kaca & Jendela Eksterior','Area · risiko tinggi','00','1 Jul 2026','7 gedung','1 Jan 2027','Berlaku','green'],['B-003','Pengelolaan Limbah B3','K3 & lingkungan','00','1 Jul 2026','Semua kontrak','1 Jan 2027','Berlaku','green'],['B-006','Penanganan Tumpahan Bahan Kimia','K3 & lingkungan','01','draf','—','—','Disusun','flat'],['D-031','Hydro Cleaning (Vakum Tungau)','Area · layanan baru','00','draf','—','—','Disusun','flat'],['D-032','Poles Lantai & Kristalisasi Marmer','Area · layanan baru','00','draf','—','—','Disusun','flat'],['B-009','Pest Control & Penggunaan Pestisida Berizin','K3 & lingkungan','00','draf','—','—','Diperiksa','accent'],['D-033','Perawatan Kolam Renang & Log Kimia','Area · layanan baru','00','draf','—','—','Disusun','flat'],['D-034','Pembersihan Toren & Tangki Air','Area · layanan baru','00','draf','—','—','Diperiksa','accent'],['D-035','Pembersihan Pasca Renovasi','Area · layanan baru','00','draf','—','—','Disusun','flat'],['B-010','Kerja di Ruang Terbatas (Tangki & Reservoir Gedung)','K3 & lingkungan','00','draf','—','—','Diperiksa','accent'],['C-021','Checklist Alat, Chemical & APD per Layanan','Checklist','00','draf','—','—','Disusun','flat'],['H-002','Formulir Laporan Kerja Harian Petugas','Formulir','00','1 Jul 2026','Semua petugas','1 Jul 2027','Berlaku','green'],['H-006','Formulir Penanganan Keluhan','Formulir','00','1 Jul 2026','Supervisor','1 Jul 2027','Berlaku','green'],['H-008','Formulir Tindakan Koreksi & Pencegahan','Formulir','00','1 Jul 2026','Supervisor','1 Jul 2027','Berlaku','green']];
      h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Controlled document register</div><div class="t-115 o-6">Kode A/D/H · setiap revisi butuh Disusun → Diperiksa → Disetujui</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('toast', 'Upload revision — file picker opens in the full build.') + '>Upload revision</button></div>' +
        tabel(['Kode','Dokumen','Kelompok','Rev','Berlaku','Terpakai di','Tinjau ulang','Status'], docs.map(function (d) { return ['<span class="id" style="font-size:12.5px">' + d[0] + '</span>', '<span class="t-125">' + d[1] + '</span>', '<span class="t-12 o-75">' + d[2] + '</span>', d[3], '<span class="t-12">' + d[4] + '</span>', '<span class="t-12">' + d[5] + '</span>', '<span class="t-12">' + d[6] + '</span>', chip(d[8], d[7])]; })) + '</div>';
      h += '<div class="t-115 o-6">Petugas selalu melihat revisi berlaku terakhir di app — versi lama otomatis ditarik, dan tidak ada checklist kertas yang beredar. Sumber dokumen: folder dokumen-sop di paket desain (66 SOP, 11 checklist, 10 formulir).</div>';
    } else if (S.sopTab === 'assign') {
      h += '<div class="grid g2" style="gap:16px">';
      [['PT Karya Mitra — HQ Tower','8 lantai · 3 shift · 14 petugas','Aktif','green',['D-005','D-012','D-021','B-003','H-002'],'Laporan bulanan otomatis terkirim tiap tanggal 1, dirakit dari checklist harian.',[['98,2%','Checklist tuntas'],['4,7','Skor inspeksi'],['2','Keluhan 30d']]],
       ['Sekolah Cendekia','24 ruang kelas · 1 shift · 6 petugas','Aktif','green',['D-030','D-012','D-009','H-002'],'SOP ruang kelas dijalankan setelah jam sekolah; area steril UKS pakai D-018.',[['96,4%','Checklist tuntas'],['4,5','Skor inspeksi'],['1','Keluhan 30d']]],
       ['Grand Kemang Apartment','Lobby, koridor, kolam · 2 shift','Aktif','green',['D-005','D-016','D-024','B-003'],'Kolam renang wajib log kimia harian; hasil dilampirkan ke laporan pengelola.',[['99,1%','Checklist tuntas'],['4,8','Skor inspeksi'],['0','Keluhan 30d']]],
       ['RS Mitra Sehat — non-klinis','Lobby, kantin, koridor · 3 shift','Onboarding','accent',['D-018','D-012','B-003','B-006','H-002'],'Menunggu rev.01 A-011 disetujui sebelum go-live 15 Sep.',[['—','Checklist tuntas'],['—','Skor inspeksi'],['—','Keluhan 30d']]]].forEach(function (c) {
        h += '<div class="card elev-sm gap-12"><div class="flex items-center gap-10"><div class="grow"><div class="f-head t-16">' + c[0] + '</div><div class="t-115 o-65">' + c[1] + '</div></div>' + chip(c[3], c[2]) + '</div><div class="flex wrap gap-6">';
        c[4].forEach(function (code) { h += '<span class="chip" style="background:var(--color-surface);font-family:var(--font-heading);font-size:11px">' + code + '</span>'; });
        h += '</div><div class="grid g3" style="gap:9px">';
        c[6].forEach(function (s) { h += '<div style="background:var(--color-surface);border-radius:16px;padding:9px 11px"><div class="f-head t-16">' + s[0] + '</div><div class="t-105 o-65">' + s[1] + '</div></div>'; });
        h += '</div><div class="t-115 o-7 lh-145">' + c[5] + '</div></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="grid g121"><div class="card elev-sm table-card"><div class="card-head card-title">Inspeksi supervisor — 7 hari terakhir</div>' +
        tabel(['Tanggal','Area','Supervisor','Skor','Temuan','Koreksi (H-008)'], [['30 Aug','HQ Tower · lantai 3–5','Bagas','4,8','1 minor','Ditutup',true,'green'],['29 Aug','Grand Kemang · lobby','Rina','4,9','—','—',true,'flat'],['28 Aug','Sekolah Cendekia · toilet','Bagas','3,9','3 minor','Berjalan',false,'accent'],['27 Aug','HQ Tower · pantry','Rina','4,6','1 minor','Ditutup',true,'green'],['26 Aug','Grand Kemang · kolam','Teguh','4,4','log kimia telat','Ditutup',true,'green'],['25 Aug','Sekolah Cendekia · kelas','Bagas','4,7','—','—',true,'flat']].map(function (i) { return ['<span class="t-12">' + i[0] + '</span>', '<span class="t-125">' + i[1] + '</span>', i[2], chip(i[6] ? 'green' : 'accent', i[3]), '<span class="t-12">' + i[4] + '</span>', chip(i[7], i[5])]; })) + '</div>';
      h += '<div class="stack gap-16"><div class="card elev-sm gap-11"><div class="card-title">Kepatuhan bukti kerja</div>';
      [['Checklist ditutup dengan foto sebelum–sesudah','97%',97],['Jam & lokasi terekam otomatis','100%',100],['Serah terima shift ditandatangani digital','94%',94],['Temuan berujung tindakan koreksi','89%',89]].forEach(function (e) { h += '<div class="stack gap-5"><div class="flex t-125"><span class="grow o-85">' + e[0] + '</span><span class="bold">' + e[1] + '</span></div>' + meter(e[2], 'soft') + '</div>'; });
      h += '<div class="t-11 o-6 lh-145">Checklist tidak bisa ditutup tanpa foto sebelum–sesudah, jam, dan lokasi. Laporan bulanan klien dirakit dari data ini.</div></div><div class="card elev-sm gap-10"><div class="card-title">Dari kertas ke app</div>';
      [['D-xxx','SOP area → daftar tugas berurutan di app mitra, lengkap alat, bahan dan APD wajib'],['C-xxx','Checklist harian/mingguan → checklist digital, wajib foto, tidak bisa ditutup separuh'],['H-002','Laporan kerja harian → terisi sendiri dari checklist, supervisor tinggal memvalidasi'],['H-006','Formulir keluhan → kasus di Complaint desk dengan pemilik dan tenggat'],['H-008','Tindakan koreksi → CAPA yang menempel pada temuan inspeksi sampai ditutup']].forEach(function (m) { h += '<div class="flex items-center gap-9 t-12"><span class="chip chip-soft" style="font-family:var(--font-heading);font-size:10.5px;flex:none">' + m[0] + '</span><span class="grow o-85">' + m[1] + '</span></div>'; });
      h += '</div></div></div>';
    }
    return h;
  };

  /* ================================================================= DESK */
  VIEW.desk = function () {
    var h = kpi([{label:'Open complaints', value:'9', note:'0 past deadline', good:true},{label:'Median first reply', value:'38s', note:'promise: under 60s', good:true},{label:'Resolved in one touch', value:'71%', note:'no hand-offs', good:true},{label:'Reopened', value:'3', note:'2,1% of closed cases', good:false},{label:'Complaint rate', value:'1,4%', note:'of completed visits', good:true}], true, 5);
    h += '<div class="grid g4">';
    [['S1','Safety, theft or injury','Anything involving a person or the police.','immediate','4h','0','100%',100,'accent'],['S2','Damage or money lost','Broken item, wrong charge, refund overdue.','5 min','same day','2','100%',100,'accent'],['S3','Service quality','Rooms missed, cleaner late, checklist not done.','60 sec','24h','5','98%',98,'flat'],['S4','App or admin friction','Voucher confusing, receipt wrong, notification noise.','60 sec','3 days','2','96%',96,'flat']].forEach(function (s) {
      h += '<div class="card elev-sm sev"><div class="flex items-center gap-8">' + chip(s[8], s[0]) + '<span class="f-head t-18" style="margin-inline-start:auto">' + s[5] + '</span></div><div class="t-125 bold">' + s[1] + '</div><div class="t-115 lh-145 o-7">' + s[2] + '</div><div class="flex gap-8 t-11 o-75"><span>First reply ' + s[3] + '</span><span>·</span><span>Resolve ' + s[4] + '</span></div><div class="bar"><i style="width:' + s[7] + '%"></i></div><div class="t-11 o-6">' + s[6] + ' inside SLA this week</div></div>';
    });
    h += '</div>';
    var cases = [['CMP-241','Farah N.','Glass table chipped during deep clean','In-app photo','S2','Rahma','2h 41m left','Insurer quote → offer today',true],['CMP-240','Bagus H.','Cleaner cancelled 3h before start','Auto-detected','S2','System → Ops','Credited','Replacement cleaner confirmed',false],['CMP-238','Intan K.','Bathroom not done, photos attached','Rating ≤3','S3','Bagas','18h left','Free redo offered, awaiting slot',false],['CMP-237','Hendra W.','Refund not received after 5 days','WhatsApp','S2','Finance','6h left','Bank trace opened, credit if late',true],['CMP-235','Maya S.','Voucher rejected at payment','In-app chat','S4','Nadia','2 days left','Bug filed, one-off credit issued',false],['CMP-233','PT Karya Mitra','Crew arrived 40 min late','Email','S3','Bagas','11h left','Auto-credit paid, coaching booked',false],['CMP-230','Rangga P.','Cleaner smoked on balcony','Call','S3','Partner ops','20h left','Cleaner statement, written warning',false]]
      .filter(function (c) { return S.deskFilter === 'all' || (S.deskFilter === 's12' && (c[4] === 'S1' || c[4] === 'S2')) || (S.deskFilter === 'due' && c[8]) || (S.deskFilter === 'mine' && c[5] === 'Rahma'); });
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow card-title">Live queue — sorted by deadline, not by age</div>';
    [['all','All'],['s12','S1–S2'],['due','Due in 2h'],['mine','Mine']].forEach(function (f) { h += pill(S.deskFilter === f[0], f[1], 'deskFilter', f[0], true); });
    h += '</div>' + tabel(['Case','Customer','Complaint','Channel','Sev','Owner','Clock','Next step'], cases.map(function (c) { return ['<span class="id" style="font-size:12.5px">' + c[0] + '</span>', '<span class="t-125">' + c[1] + '</span>', '<span class="t-125">' + c[2] + '</span>', '<span class="t-12 o-75">' + c[3] + '</span>', chip(c[4] === 'S1' || c[4] === 'S2' ? 'accent' : 'flat', c[4]), '<span class="t-125">' + c[5] + '</span>', '<span class="t-12 bold" style="' + (c[8] ? 'color:var(--color-accent-700)' : 'opacity:.75') + '">' + c[6] + '</span>', '<span class="t-12 o-8">' + c[7] + '</span>']; })) + '</div>';
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-12"><div class="card-title">Root cause — last 30 days</div>';
    [['Rooms or tasks missed','38','−12%',100,'Partner ops','checklist made mandatory before finishing'],['Late arrival','26','−31%',68,'Ops','travel buffer added to back-to-back jobs'],['Voucher / pricing confusion','19','+4%',50,'Product','cart-time validation shipped 28 Aug'],['Refund slower than promised','11','−48%',29,'Finance','bank trace automated at day 3'],['Damage','7','flat',18,'Partner ops','fragile-item briefing in cleaner app'],['Communication / attitude','6','−20%',16,'Partner ops','coaching, not deactivation']].forEach(function (r) {
      h += '<div class="stack gap-5"><div class="flex t-125"><span class="grow o-85">' + r[0] + '</span><span class="bold">' + r[1] + '</span><span class="t-115 o-65" style="width:74px;text-align:end">' + r[2] + '</span></div>' + meter(r[3], 'acc') + '<div class="t-11 o-6">Fix owner: ' + r[4] + ' · ' + r[5] + '</div></div>';
    });
    h += '</div><div class="stack gap-16"><div class="card elev-sm gap-11"><div class="card-title">Escalation ladder</div>';
    [['1','Support agent','Any complaint, any channel','0 min'],['2','Claims lead','S2, or agent cannot resolve','15 min'],['3','Ops manager + Finance','Money above Rp5jt, or SLA at 75%','2h'],['4','Super admin (on call)','S1, or any missed deadline','immediate']].forEach(function (l) { h += '<div class="flex items-center gap-11"><span class="ladder-n">' + l[0] + '</span><div class="grow"><div class="t-125 bold">' + l[1] + '</div><div class="t-11 o-65">' + l[2] + '</div></div><div class="t-115 o-7">' + l[3] + '</div></div>'; });
    h += '</div><div class="card elev-sm gap-10"><div class="card-title">Rules that make it work</div>' + bullets(['Every complaint gets a named human and a dated deadline within 60 seconds — no queue number, no bot loop.','The clock is public: the customer sees the same countdown and owner that the desk sees.','Miss a deadline and the customer is credited automatically, before anyone apologises.','The agent who receives a complaint cannot approve their own compensation.','Every closed case is tagged with a root cause and a fix owner; causes that keep repeating become product work, not scripts.','A case only closes when the customer confirms — and reopening keeps the original owner.']) + '</div></div></div>';
    return h;
  };

  /* ============================================================== REWARDS */
  function stepRow(label, note, value, key) {
    return '<div class="flex items-center gap-12"><div class="grow"><div class="t-13 bold">' + label + '</div><div class="t-11 o-65">' + note + '</div></div><span class="step"><button' + aksi('reward', key + ':-1') + '>−</button><span class="v bold" style="min-width:82px">' + value + '</span><button' + aksi('reward', key + ':1') + '>+</button></span></div>';
  }
  VIEW.rewards = function () {
    var poin = Math.floor(237000 / S.pointsPerRp * (S.tierBoost ? 1.5 : 1));
    var h = '<div class="grid g2" style="gap:16px;max-width:1000px"><div class="card elev-sm gap-16"><div class="card-title">Poin reward</div>' +
      stepRow('Rupiah per 1 poin', 'Belanja ' + rp(S.pointsPerRp) + ' menghasilkan 1 poin', rp(S.pointsPerRp), 'pointsPerRp') + stepRow('Nilai tukar 1 poin', 'Dipakai sebagai potongan di keranjang', rp(S.pointRupiah), 'pointRupiah') +
      '<div class="flex items-center gap-12"><div class="grow"><div class="t-13 bold">Pengali tier</div><div class="t-11 o-65">Silver 1× · Gold 1,5× · Platinum 2×</div></div>' + chipBtn(S.tierBoost ? 'green' : 'flat', S.tierBoost ? 'Aktif' : 'Mati', 'toggleTier') + '</div>' +
      '<div style="background:var(--color-surface);border-radius:18px;padding:12px 14px" class="t-125 lh-15">Pesanan Rp237.000 dari pelanggan Gold menghasilkan ' + poin + ' poin, setara ' + rp(poin * S.pointRupiah) + ' potongan berikutnya.</div></div>';
    h += '<div class="card elev-sm gap-16"><div class="card-title">Cashback</div>' + stepRow('Cashback per transaksi', 'Dikreditkan ke EXO Wallet setelah pekerjaan selesai', S.cashbackPct + '%', 'cashbackPct') + stepRow('Batas cashback', 'Per pesanan, mencegah kebocoran di order besar', rp(S.cashbackCap), 'cashbackCap') +
      '<div class="flex items-center gap-12"><div class="grow"><div class="t-13 bold">Hanya untuk EXO Wallet</div><div class="t-11 o-65">Mendorong saldo mengendap dan menekan biaya kanal</div></div>' + chipBtn(S.cbWalletOnly ? 'green' : 'flat', S.cbWalletOnly ? 'Ya' : 'Semua metode', 'toggleCbWallet') + '</div>' +
      '<div style="background:var(--color-surface);border-radius:18px;padding:12px 14px" class="t-125 lh-15">Pesanan Rp237.000 mendapat ' + rp(Math.min(Math.round(237000 * S.cashbackPct / 100), S.cashbackCap)) + ' cashback' + (S.cbWalletOnly ? ' bila dibayar dengan EXO Wallet.' : ' untuk semua metode pembayaran.') + '</div></div></div>';
    var gmv = 482000000, pc = gmv / S.pointsPerRp * S.pointRupiah * (S.tierBoost ? 1.25 : 1), cc = gmv * S.cashbackPct / 100 * (S.cbWalletOnly ? 0.55 : 1);
    h += '<div class="card elev-sm table-card" style="max-width:1000px"><div class="card-head card-title">Dampak bulanan pada margin</div>' + tabel(['Komponen','Aturan berlaku','Estimasi biaya / bulan','% dari GMV'], [
      ['<b>Poin reward</b>', '<span class="t-125">1 poin / ' + rp(S.pointsPerRp) + ' · nilai ' + rp(S.pointRupiah) + (S.tierBoost ? ' · tier aktif' : '') + '</span>', rp(Math.round(pc)), (pc / gmv * 100).toFixed(2) + '%'],
      ['<b>Cashback</b>', '<span class="t-125">' + S.cashbackPct + '% · batas ' + rp(S.cashbackCap) + (S.cbWalletOnly ? ' · hanya wallet' : '') + '</span>', rp(Math.round(cc)), (cc / gmv * 100).toFixed(2) + '%'],
      ['<b>Voucher aktif</b>', '<span class="t-125">CLEAN25, SABTUPAGI, KANTOR10</span>', 'Rp 38.400.000', '0,80%'],
      ['<b>Referral</b>', '<span class="t-125">Rp50.000 dua sisi setelah kunjungan pertama</span>', 'Rp 21.000.000', '0,44%']]) + '</div>';
    h += '<div class="flex items-center gap-12" style="max-width:1000px">' + chip(S.rewardDirty ? 'accent' : 'green', S.rewardDirty ? 'Aturan belum diterapkan' : 'Aturan berlaku') + '<button class="btn btn-primary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('publishRewards') + '>Terapkan aturan</button><button class="btn btn-secondary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('resetRewards') + '>Kembalikan default</button><div class="t-115 o-6">Perubahan berlaku untuk transaksi baru; poin yang sudah didapat tidak pernah dihapus surut.</div></div>';
    return h;
  };
  var REWARD_STEP = { pointsPerRp:[500, 500], pointRupiah:[1, 1], cashbackPct:[1, 0], cashbackCap:[5000, 0] };
  AKSI.reward = function (v) { var p = v.split(':'), k = p[0], d = Number(p[1]), st = REWARD_STEP[k]; S[k] = Math.max(st[1], S[k] + d * st[0]); S.rewardDirty = true; };
  AKSI.toggleTier = function () { S.tierBoost = !S.tierBoost; S.rewardDirty = true; };
  AKSI.toggleCbWallet = function () { S.cbWalletOnly = !S.cbWalletOnly; S.rewardDirty = true; };
  AKSI.publishRewards = function () { var p = A.bacaPub(); p.rewards = { pointsPerRp:S.pointsPerRp, pointRupiah:S.pointRupiah, cashbackPct:S.cashbackPct, cashbackCap:S.cashbackCap, tierBoost:S.tierBoost, cbWalletOnly:S.cbWalletOnly }; A.tulisPub(p); S.rewardDirty = false; A.sekilas('Aturan poin & cashback diterapkan untuk transaksi baru.'); };
  AKSI.resetRewards = function () { Object.assign(S, { pointsPerRp:1000, pointRupiah:10, cashbackPct:3, cashbackCap:25000, tierBoost:true, cbWalletOnly:true, rewardDirty:true }); };

  /* ================================================================ BRAND */
  VIEW.brand = function () {
    var b = S.brand, dirty = S.brandDirty;
    var h = '<div class="grid g2" style="gap:16px;max-width:1000px"><div class="card elev-sm gap-16"><div class="flex items-center gap-10"><div class="card-title">Logo &amp; identity</div>' + chip(dirty ? 'accent' : 'green', dirty ? 'Unpublished changes' : 'Live') + '</div>';
    h += '<div><div class="t-115 up o-6" style="margin-bottom:9px">App mark — square, min 512px</div><div class="flex gap-14 items-center"><div class="logo-box" style="width:88px;height:88px;flex:none"><img src="' + esc(b.markSrc) + '" alt=""></div><div class="grow stack gap-8"><label class="upload">Upload new mark<input type="file" accept="image/*" data-ubah="brandFile" data-arg="markSrc"></label><div class="t-115 o-6 lh-145">Transparent PNG or SVG. The 48/96/192/512 sets and the Android adaptive icon are generated on upload.</div></div></div></div>';
    h += '<div><div class="t-115 up o-6" style="margin-bottom:9px">Wordmark</div><div class="flex gap-14 items-center"><div class="logo-box grow" style="height:62px;border-radius:20px"><img src="' + esc(b.wordSrc) + '" alt=""></div><label class="upload">Replace<input type="file" accept="image/*" data-ubah="brandFile" data-arg="wordSrc"></label></div></div>';
    h += '<div><div class="t-115 up o-6" style="margin-bottom:9px">Brand colour</div><div class="flex gap-10 items-center">';
    Object.keys(EXO_BRAND.RAMP).forEach(function (c) { h += '<button class="brand-swatch' + (b.accent === c ? ' on' : '') + '" style="background:' + c + '"' + aksi('brandAccent', c) + ' aria-label="' + c + '"></button>'; });
    h += '<div class="f-head t-13" style="margin-inline-start:auto">' + b.accent.toUpperCase() + '</div></div><div class="t-115 o-6 lh-145" style="margin-top:9px">Contrast against the app ground is checked on save; anything under 3:1 is refused with the reason. Only these five ramps have been checked.</div></div>';
    h += '<div class="field"><label>App display name</label><input class="input" value="' + esc(b.appName) + '" data-ubah="brandName"></div>';
    h += '<div><div class="flex items-center gap-9" style="margin-bottom:9px"><div class="grow t-115 up o-6">Running text — home banner</div>' + chipBtn(b.tickerOn ? 'green' : 'flat', b.tickerOn ? 'On' : 'Off', 'tickerToggle') + '</div>' +
      '<input class="input" value="' + esc(b.tickerBadge) + '" data-ubah="tickerBadge" placeholder="Label, e.g. PROMO"><textarea class="input" style="margin-top:8px;min-height:70px" data-ubah="tickerText">' + esc(b.tickerText) + '</textarea>' +
      '<div class="flex items-center gap-9" style="margin-top:9px"><span class="t-115 o-6">Speed</span>';
    [['Slow',34],['Normal',22],['Fast',13]].forEach(function (sp) { h += pill(b.tickerSpeed === sp[1], sp[0], 'tickerSpeed', sp[1], true); });
    h += '</div><div class="t-11 o-6 lh-145" style="margin-top:8px">Shows on the customer home header. Schedule a start/end date on publish; an expired message hides itself.</div></div>';
    h += '<div class="flex gap-10"><button class="btn btn-primary" style="flex:1"' + aksi('brandPublish') + '>Publish to all apps</button><button class="btn btn-secondary"' + aksi('brandReset') + '>Revert</button></div>' +
      '<div class="t-115 o-6 lh-145">' + esc(dirty ? 'Nothing is live yet. Publishing pushes to both apps immediately — assets are fetched at runtime.' : b.published) + '</div></div>';
    h += '<div class="stack gap-16"><div class="card elev-sm gap-12"><div class="card-title">Where it lands</div>';
    [['Customer app · header, splash, app icon','instant'],['Partner app · header, job sheet','instant'],['Invoices & receipts (PDF)','next issue'],['Transactional email & WhatsApp','~5 min']].forEach(function (s) { h += '<div class="flex items-center gap-9 t-125"><span class="check-sm" style="background:var(--color-accent-2-500)">✓</span><span class="grow o-85">' + s[0] + '</span><span class="t-11 o-55">' + s[1] + '</span></div>'; });
    h += '<div class="t-115 o-6 lh-145">Assets are fetched at runtime, so a logo change needs no app-store release. <a href="exo.html" target="_blank" rel="noopener">Open EXOCLEAN App</a> to see it.</div></div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Who can change branding</div>';
    [['Super admin','upload logo, colour, app name','Full','accent'],['Ops manager','view only, can roll back','Read','flat'],['Support','no access to branding','None','flat']].forEach(function (r) { h += '<div class="flex items-center gap-9 t-125"><span class="grow"><strong>' + r[0] + '</strong> — ' + r[1] + '</span>' + chip(r[3], r[2]) + '</div>'; });
    h += '</div><div class="card elev-sm gap-10"><div class="card-title">Recent brand changes</div>';
    (b.audit || []).forEach(function (a) { h += '<div class="flex gap-10 t-12 items-center"><span class="ldot" style="width:7px;height:7px;background:var(--color-accent)"></span><span class="grow o-85">' + esc(a.what) + '</span><span class="o-55">' + esc(a.when) + '</span><a href="#brand" class="t-115"' + aksi('brandReset') + '>Roll back</a></div>'; });
    h += '</div></div></div>';
    return h;
  };
  AKSI.brandAccent = function (c) { S.brand.accent = c; S.brandDirty = true; };
  AKSI.brandName = function (a, v) { S.brand.appName = v || 'EXOCLEAN'; S.brandDirty = true; };
  AKSI.tickerToggle = function () { S.brand.tickerOn = !S.brand.tickerOn; S.brandDirty = true; };
  AKSI.tickerBadge = function (a, v) { S.brand.tickerBadge = v; S.brandDirty = true; };
  AKSI.tickerText = function (a, v) { S.brand.tickerText = v; S.brandDirty = true; };
  AKSI.tickerSpeed = function (v) { S.brand.tickerSpeed = Number(v); S.brandDirty = true; };
  AKSI.brandFile = function (key, v, el) {
    var f = el && el.files && el.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { S.brand[key] = r.result; S.brandDirty = true; A.gambar(); }; r.readAsDataURL(f);
  };
  AKSI.brandPublish = function () {
    var kini = new Date(), stamp = kini.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][kini.getMonth()] + ' ' + kini.getFullYear() + ', ' + ('0' + kini.getHours()).slice(-2) + ':' + ('0' + kini.getMinutes()).slice(-2);
    S.brand.published = 'Published ' + stamp + ' by andriyadi@exoclean.id';
    S.brand.audit = [{ what:'Appearance published · andriyadi@', when:stamp.split(',')[0] }].concat(S.brand.audit || []).slice(0, 5);
    if (EXO_BRAND.simpan(S.brand)) { S.brandDirty = false; A.sekilas('Published — EXOCLEAN App picks it up on next load.'); }
    else A.sekilas('Logo too large for browser storage — use a PNG under 1 MB.', 'err');
  };
  AKSI.brandReset = function () { EXO_BRAND.hapus(); S.brand = EXO_BRAND.baca(); S.brandDirty = false; A.sekilas('Reverted to the EXOCLEAN defaults — live in both apps.'); };

  /* ================================================================ ROLES */
  VIEW.roles = function () {
    var h = '<div class="grid g4">';
    [['Super admin','2','Everything, including branding, roles and payout rails.','Board','2FA + hardware key'],['Ops manager','3','Dispatch, reassignment, cleaner standing and coaching.','COO','2FA'],['Dispatcher','6','Live board only — reassign an unstaffed job, no money rights.','Ops manager','2FA'],['Claims lead','2','Guarantee decisions, insurer contact, credits up to Rp5jt.','COO','2FA'],['Finance','2','Payouts, refund execution, reconciliation and tax exports.','CFO','2FA + hardware key'],['Marketing','3','Promo codes, running text, referral budget, push campaigns.','CMO','2FA'],['Partner ops','4','Cleaner recruitment, ID/SKCK verification, skills tests.','Ops manager','2FA'],['Support agent','14','Chat, order lookup, raise claims — never decides them.','Support lead','2FA']].forEach(function (r) {
      h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="grow f-head t-15">' + r[0] + '</div>' + chip('flat', r[1]) + '</div><div class="t-115 lh-15 o-75">' + r[2] + '</div><div class="t-11 o-6 lh-145">Reports to ' + r[3] + ' · ' + r[4] + '</div></div>';
    });
    h += '</div>';
    var names = ['Super','Ops','Disp.','Claims','Fin.','Mktg','P.Ops','Supp.'];
    var matrix = [['Orders — view & search',['Full','Full','Full','Full','View','View','View','Full']],['Reassign / cancel a job',['Full','Full','Edit','Edit','—','—','—','—']],['Move a locked schedule',['—','—','—','—','—','—','—','—']],['Cleaner verification',['Full','Approve','—','—','—','—','Full','—']],['Cleaner standing & coaching',['Full','Full','View','View','—','—','Edit','View']],['Services & rate bands',['Full','Edit','—','—','View','View','—','—']],['Promos, vouchers, running text',['Full','View','—','—','View','Full','—','—']],['Branding & app identity',['Full','View','—','—','—','View','—','—']],['Claims decisions',['Full','View','—','Full','View','—','—','Raise']],['Refunds & manual credits',['Full','Approve','—','Approve','Full','—','—','Request']],['Cleaner payouts',['Full','View','—','—','Full','—','View','—']],['Customer PII & addresses',['Full','View','View','View','View','—','—','View']],['Admins, roles & 2FA policy',['Full','—','—','—','—','—','—','—']],['Audit log & data export',['Full','View','—','View','Full','View','—','—']]];
    h += '<div class="card elev-sm table-card"><div class="card-head" style="padding:16px 20px"><div class="grow"><div class="card-title">Permission matrix</div><div class="t-115 o-6">Full · Approve · Edit · View · —</div></div><button class="btn btn-secondary" style="height:34px;padding:0 16px;font-size:12.5px"' + aksi('toast', 'New role — opens in the full build.') + '>New role</button></div><table class="table mat"><thead><tr><th>Function</th>';
    names.forEach(function (n) { h += '<th style="font-size:11px">' + n + '</th>'; });
    h += '</tr></thead><tbody>';
    matrix.forEach(function (m) {
      h += '<tr><td class="bold t-125">' + m[0] + '</td>';
      m[1].forEach(function (lv) { var k = lv === 'Full' ? 'lv-full' : lv === 'Approve' ? 'lv-approve' : lv === 'Edit' ? 'lv-edit' : lv === '—' ? 'lv-none' : 'lv-view'; h += '<td><span class="lv ' + k + '">' + lv + '</span></td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="f-head t-16">Rules that cannot be delegated</div>' + bullets(['No role can move a booking the customer has locked — not even Super admin. Only the customer, or the cleaner declining outright, can release a slot.','The person who raises a claim can never approve it; Support raises, Claims lead decides.','Branding publishes and payout-rail changes require a hardware key, not just 2FA.','Customer address and phone are masked for Marketing and hidden from exports below Finance level.']) + '</div>' +
      '<div class="card elev-sm gap-10"><div class="f-head t-16">Approval thresholds</div>';
    [['Manual credit up to Rp500.000','Claims lead'],['Refund or credit above Rp5jt','Finance + Super admin'],['Promo budget above Rp50jt/month','CMO + Finance'],['Deactivating a cleaner','Ops manager + Partner ops']].forEach(function (t) { h += '<div class="flex items-center gap-10 t-125"><span class="grow o-85">' + t[0] + '</span><span class="bold">' + t[1] + '</span></div>'; });
    h += '<div class="t-11 o-6 lh-145">Anything above the threshold needs a second approver; both names land in the audit log.</div></div></div>';
    return h;
  };

  /* ================================================================= TEAM */
  VIEW.team = function () {
    var h = '<div class="card elev-sm table-card" style="max-width:900px">' + tabel(['Admin','Email','Role','Branding','Refunds','Last active'], [['Andriyadi N.','andriyadi@exoclean.id','Super admin','Edit','Approve','now','accent'],['Rahma Putri','rahma@exoclean.id','Claims lead','View','Approve','12 min ago','flat'],['Bagas Setiawan','bagas@exoclean.id','Ops manager','View','Request','1h ago','flat'],['Nadia Rahmi','nadia@exoclean.id','Support','None','Request','yesterday','flat']].map(function (t) { return ['<b>' + t[0] + '</b>', t[1], chip(t[6], t[2]), t[3], t[4], t[5]]; })) + '</div>';
    return h + '<div class="t-115 o-6">Two-factor is mandatory for Super admin. Every branding publish, refund and manual credit is written to the audit log.</div>';
  };

  document.addEventListener('DOMContentLoaded', A.pasang);
})(ADMIN);
