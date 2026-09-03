/* ==========================================================================
   exo-screens-customer2.js — layar pelanggan 11–20
   report · orders · wallet · rate · issue · share · terms · lang · profile
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, I = X.I, K = X.KEADAAN, esc = X.esc, rp = X.rp, aksi = X.aksi, kelas = X.kelas, av = X.av,
      ikon = X.ikon, garis = X.garis, IK = X.IK, IKON = X.IKON, t = I.t, tx = I.tx;

  /* ============================================================== REPORT */
  X.LAYAR.report = function () {
    var j = X.juruKini();
    var h = '<div class="screen">' + X.kepala(esc(t('beforeAfter')), 'EXO-4471 · ' + esc(j.name), 'orders');
    h += '<div class="stack gap-14 pad-x18">';
    var log = [['logAccept','logAcceptN','20:41'],['logLeft','logLeftN','08:34'],['logArrive','logArriveN','08:56'],['logDone','logDoneN','12:04']];
    h += '<div class="card elev-sm gap-11"><div class="f-head t-15">' + esc(t('arrivalLog')) + '</div>';
    for (var i = 0; i < log.length; i++) {
      h += '<div class="flex items-center gap-10"><span class="stage-dot lg on">✓</span><div class="grow"><div class="t-125 bold">' + esc(t(log[i][0])) + '</div><div class="t-11 o-65">' + esc(t(log[i][1])) + '</div></div><div class="t-12 tabular">' + log[i][2] + '</div></div>';
    }
    h += '</div>';
    for (var a = 0; a < D.REPORT_AREAS.length; a++) {
      var ar = D.REPORT_AREAS[a], sh = K.shots[ar.id] || {};
      var ub = sh.before && sh.before.url ? sh.before.url : ar.id === 'bed' ? K.fotoContoh.bed[0] : null;
      var ua = sh.after && sh.after.url ? sh.after.url : ar.id === 'bed' ? K.fotoContoh.bed[1] : null;
      h += '<div class="card elev-sm gap-10"><div class="flex items-center gap-9"><div class="grow f-head t-15">' + esc(t(ar.key)) + '</div><span class="t-11 o-6">' + esc(t('doneAt')) + ' 1' + ar.t + ':2' + ar.t + '</span></div>' +
        '<div class="flex gap-9"><div class="grow stack gap-5"><div class="shot">' + (ub ? '<img src="' + esc(ub) + '" alt="">' : esc(t('beforeLbl'))) + '</div><div class="t-105 o-6">09:0' + ar.t + ' · Kemang Residence 12B</div></div>' +
        '<div class="grow stack gap-5"><div class="shot after">' + (ua ? '<img src="' + esc(ua) + '" alt="">' : esc(t('afterLbl'))) + '</div><div class="t-105 o-6">1' + ar.t + ':2' + ar.t + ' · Kemang Residence 12B</div></div></div></div>';
    }
    h += '<div class="card card-leaf gap-8"><div class="t-125 lh-15">' + esc(t('reportProof')) + '</div><button class="btn btn-secondary" style="align-self:flex-start"' + aksi('ke', 'issue') + '>' + esc(t('claimW')) + '</button></div><div class="spacer-16"></div></div>';
    return h + '</div>';
  };

  /* ============================================================== ORDERS */
  X.LAYAR.orders = function () {
    var j = X.juruKini();
    var h = '<div class="screen"><div style="padding:18px 20px 12px"><h3 style="margin:0">' + esc(t('orders')) + '</h3></div>';
    h += '<div class="flex gap-8 pad-x"><button class="' + kelas('pill', K.tabPesanan === 'up') + '"' + aksi('tabPesanan', 'up') + '>' + esc(t('upcoming')) + '</button>' +
      '<button class="' + kelas('pill', K.tabPesanan === 'past') + '"' + aksi('tabPesanan', 'past') + '>' + esc(t('past')) + '</button></div>';
    h += '<div class="stack gap-12" style="padding:16px 20px 0">';
    if (K.tabPesanan === 'up') {
      h += '<div class="card elev-md gap-12"><div class="flex items-center gap-10"><span class="tag tag-accent-2">' + esc(tx('Today')) + '</span><span class="t-115 o-6">EXO-4471</span><span style="margin-inline-start:auto" class="t-115 c-leaf-800">' + esc(tx(X.tahapAlur()[Math.min(K.tahap, X.tahapAlur().length - 1)].title)) + '</span></div>' +
        '<div class="flex items-center gap-11">' + X.avJuru(j, 44) + '<div class="grow"><div class="f-head t-15">' + esc(j.name) + '</div><div class="t-115 o-65">' + esc(I.svcName(K.jasa)) + ' · ' + esc(X.ringkasSlot()) + '</div></div></div>' +
        '<div class="flex gap-8"><button class="btn btn-primary" style="flex:1"' + aksi('ke', 'track') + '>' + esc(tx('Track')) + '</button><button class="btn btn-secondary" style="flex:1"' + aksi('lembar', 'pindah') + '>' + esc(tx('Move time')) + '</button></div></div>';
      h += '<div class="card elev-sm gap-11"><div class="flex items-center gap-9"><span class="av av-leaf" style="--s:26px">' + ikon(IKON.kalender, 14) + '</span>' +
        '<div class="grow"><div class="f-head t-15">Every Saturday · 09:00</div><div class="t-115 o-65">Same cleaner held for you · 3h hourly</div></div><span class="tag tag-accent">' + esc(tx('Active')) + '</span></div>' +
        '<div class="flex gap-7 wrap"><span class="tag tag-neutral' + (K.lewati ? ' strike' : '') + '">30 Aug</span><span class="tag tag-neutral">6 Sep</span><span class="tag tag-neutral">13 Sep</span>' +
        '<button class="tag ' + (K.lewati ? 'tag-accent' : 'tag-outline') + '" style="cursor:pointer;border:1px solid ' + (K.lewati ? 'transparent' : 'var(--color-accent)') + '"' + aksi('lewati') + '>' + (K.lewati ? 'Skipped ✓ · undo' : esc(tx('Skip one'))) + '</button></div>' +
        '<div class="t-115 o-7 lh-15">' + (K.lewati ? esc(tx('30 Aug is skipped and you are not charged for it.')) + ' ' + esc(X.namaDepan(j)) + ' ' + esc(tx('still holds your 6 Sep slot — skipping never costs you the cleaner.')) : esc(tx('Subscription price is fixed for 3 months. Pause any week without losing your cleaner.'))) + '</div></div>';
      h += '<div class="card card-clay elev-sm gap-10"><div class="flex items-center gap-8"><span class="tag tag-accent">' + esc(tx('Refund in progress')) + '</span><span style="margin-inline-start:auto" class="t-115">Rp180.000</span></div>' +
        '<div class="refund-bar"><i class="on"></i><i class="on"></i><i></i></div>' +
        '<div class="t-125 lh-15">Step 2 of 3 — approved, sent to your bank. <strong>Money by Fri 28 Aug</strong>. If it misses that date we add Rp50.000 credit automatically.</div></div>';
    } else {
      for (var i = 0; i < D.PAST_ORDERS.length; i++) {
        var o = D.PAST_ORDERS[i];
        h += '<div class="card elev-sm gap-10"><div class="flex items-center gap-10">' + av(o.initials, 38, 'leaf') + '<div class="grow"><div class="t-135 bold">' + esc(o.service) + '</div><div class="t-115 o-65">' + esc(o.meta) + '</div></div>' +
          '<div class="right"><div class="f-head t-14">' + o.price + '</div><div class="t-11 o-6">' + o.stars + '</div></div></div>' +
          '<div class="flex gap-8"><button class="btn btn-primary" style="flex:1"' + aksi('pilihJasa', o.svc) + '>' + esc(t('rebook')) + '</button><button class="btn btn-secondary" style="flex:1"' + aksi('ke', 'report') + '>' + esc(t('reportShort')) + '</button><button class="btn btn-secondary" style="flex:1"' + aksi('ke', 'issue') + '>' + esc(t('claimW')) + '</button></div></div>';
      }
    }
    return h + '<div class="spacer-14"></div></div></div>';
  };

  /* ============================================================== WALLET */
  X.LAYAR.wallet = function () {
    var h = '<div class="screen"><div class="hero"><h3 style="margin:0">' + esc(t('wallet')) + '</h3><div class="balance">' + rp(K.saldo) + '</div>' +
      '<div class="t-12 o-7" style="margin-top:4px">' + esc(tx('Includes Rp100.000 guarantee credit')) + '</div>' +
      '<div class="flex gap-8" style="margin-top:16px"><button class="btn btn-primary" style="flex:1"' + aksi('lembar', 'isi') + '>' + esc(t('topUp')) + '</button>' +
      '<button class="btn btn-secondary btn-plain" style="flex:1"' + aksi('lembar', 'riwayat') + '>' + esc(t('history')) + '</button></div></div>';
    h += '<div class="stack gap-14" style="padding:18px 20px 0"><div class="flex gap-10">' +
      '<div class="card" style="flex:1;gap:3px"><div class="f-head t-22">' + K.poin.toLocaleString('id-ID') + '</div><div class="t-115 o-65">' + esc(t('points')) + '</div></div>' +
      '<div class="card" style="flex:1;gap:3px"><div class="f-head t-22">Gold</div><div class="t-115 o-65">' + esc(tx('5% off every visit')) + '</div></div></div>';
    h += '<div>' + X.labelBagian(esc(t('activity'))) + '<div class="card elev-sm gap-12">';
    for (var i = 0; i < K.mutasi.length; i++) {
      var m = K.mutasi[i], keluar = m.amount < 0;
      h += '<div class="flex items-center gap-11"><span class="txn-ic' + (keluar ? ' out' : '') + '">' + (keluar ? '↓' : '↑') + '</span><div class="grow"><div class="t-13 bold">' + esc(m.label) + '</div><div class="t-11 o-6">' + esc(m.date) + '</div></div>' +
        '<div class="txn-amt' + (keluar ? ' out' : '') + '">' + (keluar ? '− ' : '+ ') + rp(Math.abs(m.amount)) + '</div></div>';
    }
    h += '</div></div><div class="card card-leaf gap-8"><div class="f-head t-15">' + esc(tx('Why the balance can\'t disappear')) + '</div><div class="t-125 lh-15 o-85">' + esc(tx('Refunds land here within 3 working days, and every guarantee credit shows the order it came from. Balance never expires, and the refund tracker always carries a date.')) + '</div></div><div class="spacer-14"></div></div>';
    return h + '</div>';
  };

  /* ================================================================ RATE */
  X.LAYAR.rate = function () {
    var j = X.juruKini(), nd = X.namaDepan(j);
    var hint = K.bintang === 5 ? nd + ' ' + tx('will be offered your Saturday slot first') : K.bintang >= 4 ? tx('Tell us what to improve below') : tx('We will call you — this triggers a review, not a penalty');
    var h = '<div class="screen screen-pad"><div class="flex items-center gap-12">' + X.tombolKembali('orders') + '<div class="f-head t-17">' + esc(t('howWasIt')) + '</div></div>';
    h += '<div class="center" style="margin-top:26px"><div style="display:flex;justify-content:center">' + X.avJuru(j, 76) + '</div><div class="f-head t-20" style="margin-top:12px">' + esc(j.name) + '</div>' +
      '<div class="t-12 o-65">' + esc(I.svcName(K.jasa)) + ' · ' + esc(tx('Finished').toLowerCase()) + ' 12:04</div><div class="flex gap-8 jc-center" style="margin-top:20px">';
    for (var n = 1; n <= 5; n++) h += '<button class="' + kelas('star', n <= K.bintang) + '"' + aksi('bintang', n) + ' aria-label="' + n + ' stars">★</button>';
    h += '</div><div class="t-125 o-7" style="margin-top:9px">' + esc(hint) + '</div></div>';
    h += '<div style="margin-top:22px">' + X.labelBagian(esc(tx('What stood out'))) + '<div class="flex wrap gap-8">';
    for (var p = 0; p < D.PRAISE.length; p++) h += '<button class="' + kelas('pill', !!K.pujian[D.PRAISE[p]]) + '"' + aksi('pujian', D.PRAISE[p]) + '>' + esc(tx(D.PRAISE[p])) + '</button>';
    h += '</div></div><div style="margin-top:18px"><div class="field"><label for="exo-nilai">' + esc(tx('Anything else? (optional)')) + '</label><textarea class="input" id="exo-nilai" data-simpan="catatanNilai" placeholder="Kitchen looked brand new.">' + esc(K.catatanNilai) + '</textarea></div></div>';
    h += '<div class="card card-leaf gap-9" style="margin-top:14px"><div class="t-13 bold">' + esc(tx('Add a tip — she keeps 100%')) + '</div><div class="flex gap-8">';
    for (var i = 0; i < D.TIPS.length; i++) h += '<button class="' + kelas('pill', K.tip === D.TIPS[i]) + '"' + aksi('tip', D.TIPS[i]) + '>' + (D.TIPS[i] ? rp(D.TIPS[i]) : esc(tx('No tip'))) + '</button>';
    h += '</div></div>';
    h += '<div class="mt-auto stack gap-9" style="padding-top:14px"><button class="btn btn-primary btn-block btn-tall"' + aksi('kirimNilai') + '>' + esc(t('submitRt')) + '</button>' +
      '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('bagikanJuru') + '>' + esc(tx('Recommend')) + ' ' + esc(nd) + ' ' + esc(tx('to friends')) + '</button>' +
      '<button class="btn btn-ghost" style="align-self:center"' + aksi('ke', 'issue') + '>' + esc(tx('Something went wrong instead')) + '</button></div>';
    return h + '</div>';
  };

  /* =============================================================== ISSUE */
  X.LAYAR.issue = function () {
    var janji = '';
    for (var i = 0; i < D.ISSUES.length; i++) if (D.ISSUES[i].id === K.keluhan) janji = D.ISSUES[i].out;
    var h = '<div class="screen screen-pad"><div class="flex items-center gap-12">' + X.tombolKembali('orders') + '<div class="hdr-txt"><div class="f-head t-17">' + esc(t('claimTtl')) + '</div><div class="hdr-sub">EXO-4471 · within warranty</div></div></div>';
    h += '<div class="card card-clay elev-sm gap-8" style="margin-top:18px"><div class="f-head t-16">You’re covered up to Rp100.000</div><div class="t-125 lh-15">Pick what happened. We answer with a human in under 60 seconds and give you a decision date up front — no open-ended tickets.</div></div>';
    h += '<div class="stack gap-9" style="margin-top:18px">';
    for (var k = 0; k < D.ISSUES.length; k++) {
      var x = D.ISSUES[k], on = K.keluhan === x.id;
      h += '<button class="' + kelas('row', on) + '"' + aksi('keluhan', x.id) + ' aria-pressed="' + on + '"><span class="row-main"><b>' + esc(tx(x.label)) + '</b><span>' + esc(tx(x.note)) + '</span></span><span class="' + kelas('dot', on) + '"></span></button>';
    }
    h += '</div><div style="margin-top:16px">' + X.labelBagian(esc(t('photos'))) + '<div class="flex gap-9">';
    for (var f = 0; f < 2; f++) {
      var foto = K.fotoKlaim[f];
      h += foto ? '<div class="photo-slot isi"><img src="' + foto.url + '" alt="Claim photo ' + (f + 1) + '"><button class="photo-x"' + aksi('fotoBuang', foto.id) + ' aria-label="Remove">✕</button></div>'
                : '<label class="photo-slot" style="cursor:pointer">add<br>photo<input type="file" accept="image/*" capture="environment" data-foto="klaim" aria-label="Add a photo"></label>';
    }
    h += '</div>' + (K.fotoKlaim.length ? '<div class="t-11 o-6" style="margin-top:8px">Stored on this device only until you submit.</div>' : '') + '</div>';
    if (K.keluhan) h += '<div class="card card-leaf gap-7" style="margin-top:16px"><div class="t-125 lh-15"><strong>What happens next:</strong> ' + esc(janji) + '</div></div>';
    h += '<div class="mt-auto stack gap-9" style="padding-top:14px"><button class="btn btn-primary btn-block btn-tall"' + (K.keluhan ? aksi('kirimKlaim') : ' disabled') + '>' + esc(t('submitCl')) + '</button><div class="center t-115 o-6">Decision promised by tomorrow 17:00</div></div>';
    return h + '</div>';
  };

  /* =============================================================== SHARE */
  X.LAYAR.share = function () {
    var j = X.juruKini(), nd = X.namaDepan(j), tab = K.shareTab;
    var tabs = [['invite', tx('Invite a friend')], ['result', tx('My clean')], ['cleaner', tx('Recommend') + ' ' + nd]];
    var kicker = tab === 'invite' ? 'Referral' : tab === 'result' ? 'Before / after' : 'Recommendation';
    var head = tab === 'invite' ? tx('Rp50.000 for you,\nRp50.000 for me.') : tab === 'result' ? tx('3 hours.\nWhole flat.\nZero chasing.') : nd + ' ' + tx('cleans\nlike it is her own place.');
    var body = tab === 'invite' ? tx('Book your first clean on EXOCLEAN with my code and we both get wallet credit.')
             : tab === 'result' ? tx('Picked my own cleaner, kept my slot, paid') + ' ' + rp(X.totalN()) + '. ' + tx('Photos from the visit attached.')
             : '★ ' + (j.rating || '—') + ' · ' + j.jobs + ' ' + tx('jobs') + '. ' + tx('Book her directly — her rate is her own, no surge.');
    var h = '<div class="screen screen-pad"><div class="flex items-center gap-12">' + X.tombolKembali('home') + '<div class="hdr-txt"><div class="f-head t-17">' + esc(tx('Share')) + '</div><div class="hdr-sub">Both of you get Rp50.000 when a friend books</div></div></div>';
    h += '<div class="flex gap-8" style="margin-top:16px">';
    for (var i = 0; i < tabs.length; i++) h += '<button class="' + kelas('pill', tab === tabs[i][0]) + '"' + aksi('shareTab', tabs[i][0]) + '>' + esc(tabs[i][1]) + '</button>';
    h += '</div>';
    h += '<div class="sharecard"><div class="flex items-center gap-9">' + X.logoMark(30) + '<span class="t-11 up o-75">' + esc(kicker) + '</span></div>' +
      '<div class="headline" style="font-size:' + (tab === 'invite' ? 30 : 28) + 'px">' + esc(head) + '</div><div class="t-13 lh-15 o-85" style="margin-top:10px">' + esc(body) + '</div>' +
      '<div class="flex items-center gap-10" style="margin-top:16px"><div class="code">DEWI50</div><div class="t-115 o-8">exoclean.id/r/DEWI50</div><div class="t-95 up o-7" style="margin-inline-start:auto">We clean all purpose</div></div></div>';
    h += '<div class="t-115 o-6 lh-145" style="margin-top:10px">Card is rendered at 1080×1350 for feed and 1080×1920 for Stories. Nothing about your address or cleaner\'s surname is ever printed on it.</div>';
    h += '<div style="margin-top:16px">' + X.labelBagian(esc(t('shareTo'))) + '<div class="share-grid">';
    for (var s = 0; s < D.SHARE_TARGETS.length; s++) {
      var tg = D.SHARE_TARGETS[s];
      h += '<button class="' + kelas('share-t', K.shareTarget === tg.id) + '"' + aksi('shareTarget', tg.id) + '><i>' + esc(tg.short) + '</i><b>' + esc(tg.label) + '</b></button>';
    }
    h += '</div></div>';
    h += '<div class="card card-leaf gap-9" style="margin-top:16px"><div class="flex items-center gap-10"><div class="grow"><div class="t-13 bold">3 friends joined</div><div class="t-115 o-7">Rp150.000 earned · credited to wallet</div></div><button class="btn btn-ghost t-125"' + aksi('ke', 'wallet') + '>' + esc(t('wallet')) + '</button></div></div>';
    var tgt = null; for (var q = 0; q < D.SHARE_TARGETS.length; q++) if (D.SHARE_TARGETS[q].id === K.shareTarget) tgt = D.SHARE_TARGETS[q];
    var cta = K.shared ? tx('Shared ✓') : K.shareTarget === 'link' ? tx('Copy my link') : K.shareTarget === 'save' ? tx('Save to gallery') : tx('Open') + ' ' + (tgt ? tgt.app : 'app');
    var note = K.shared ? 'Tracked to your code — credit lands when they finish their first visit.' : 'Image and caption are prepared for you; you can edit the caption in the app you pick.';
    h += '<div class="mt-auto stack gap-9" style="padding-top:14px"><button class="btn btn-primary btn-block btn-tall"' + aksi('bagikan') + '>' + esc(cta) + '</button><div class="center t-115 o-6">' + esc(note) + '</div></div>';
    return h + '</div>';
  };

  /* =============================================================== TERMS */
  /* tanggal berlaku ketentuan (v2.3) — dibentuk lewat Intl sesuai bahasa aktif */
  function tglBerlaku() {
    var d = new Date(2026, 7, 1), o = { day:'numeric', month:'short', year:'numeric' };
    try { return new Intl.DateTimeFormat(I.locale(), o).format(d); } catch (e) { return '1 Aug 2026'; }
  }
  function blokSyarat(tab) {
    function bungkus(list) {
      var h = '';
      for (var b = 0; b < list.length; b++) {
        h += '<div class="termcard"><div class="f-head t-15">' + esc(list[b].title) + '</div>';
        for (var i = 0; i < list[b].items.length; i++) {
          var it = list[b].items[i];
          h += '<div class="flex gap-9 t-125 lh-15"><i class="term-mark' + (it[0] === 'warn' ? ' warn' : '') + '">' + (it[0] === 'warn' ? '!' : '✓') + '</i><span class="grow o-85">' + esc(it[1]) + '</span></div>';
        }
        h += '</div>';
      }
      return h;
    }
    if (tab === 'prepaid') return bungkus(D.PREPAID_TERMS);
    if (tab === 'privacy') return bungkus(D.PRIVACY_TERMS);
    if (tab === 'service') {
      var s = D.SERVICE_TERMS[K.jasa], nm = I.svcName(K.jasa);
      return bungkus([
        { title:nm, items:[['ok', s.min], ['warn', s.note]] },
        { title:'What is included', items:s.can.map(function (x) { return ['ok', x]; }) },
        { title:'What is not included', items:s.cant.map(function (x) { return ['warn', x]; }) },
        { title:'We bring', items:s.weBring.map(function (x) { return ['ok', x]; }) },
        { title:'You provide', items:s.youBring.map(function (x) { return ['warn', x]; }) }
      ]);
    }
    return bungkus(D.GENERAL_TERMS);
  }
  X.LAYAR.terms = function () {
    var tabs = [['general','General'],['service','This service'],['prepaid','Prepaid'],['privacy','Privacy']];
    var h = '<div class="screen">' + X.kepala(esc(tx('Terms & policies')), esc('PT EXO POINT · v2.3 · ' + tx('in force') + ' ' + tglBerlaku()), 'profile');
    h += '<div class="hscroll pad-x18">';
    for (var i = 0; i < tabs.length; i++) h += '<button class="' + kelas('pill pill-sm', K.termTab === tabs[i][0]) + '"' + aksi('termTab', tabs[i][0]) + '>' + esc(tx(tabs[i][1])) + '</button>';
    h += '</div><div class="stack gap-14" style="padding:16px 18px 0">' + blokSyarat(K.termTab);
    if (K.termTab === 'general') {
      h += '<div class="card elev-sm gap-10"><div class="f-head t-15">Transport from the nearest EXOCLEAN hub</div>';
      for (var r = 0; r < D.TRANSPORT.length; r++) h += '<div class="flex t-125"><span class="grow o-85">' + D.TRANSPORT[r].range + '</span><span class="bold">' + D.TRANSPORT[r].fee + '</span></div>';
      h += '<div class="t-115 o-65">Maximum travel distance 35 km. The fee is shown in your cart before you pay, never added afterwards.</div></div>';
    }
    h += '<div class="t-115 o-6 lh-15">Terms may change at any time; the version in force when you booked is the one that applies to that order, and every version is kept here.</div><div class="spacer-16"></div></div>';
    return h + '</div>';
  };

  /* ================================================================ LANG */
  X.LAYAR.lang = function () {
    var h = '<div class="screen">' + X.kepala(esc(t('language')), I.LANGS.length + ' languages · applies to the app, receipts and notifications', 'profile');
    h += '<div class="stack gap-8" style="padding:12px 18px 0">';
    for (var i = 0; i < I.LANGS.length; i++) {
      var l = I.LANGS[i], on = K.lang === l.code;
      h += '<button class="' + kelas('lang-row', on) + '"' + aksi('bahasa', l.code) + ' lang="' + l.code + '"><span class="lang-code">' + l.code.toUpperCase() + '</span>' +
        '<span class="grow left"><span class="t-135 bold">' + esc(l.native) + '</span><span style="display:block" class="t-11 o-6">' + esc(l.label) + ' · ' + esc(l.region) + '</span></span><span class="' + kelas('dot', on) + '"></span></button>';
    }
    h += '<div class="card card-leaf gap-8" style="margin-top:6px"><div class="t-125 lh-15">Arabic switches the whole app to right-to-left. Prices stay in Rupiah, and your cleaner still receives instructions in Indonesian so nothing is lost in translation on site.</div></div><div class="spacer-16"></div></div>';
    return h + '</div>';
  };

  /* ============================================================= PROFILE */
  X.LAYAR.profile = function () {
    if (K.sisi === 'partner') return X.profilMitra();
    var fav = X.daftarJuru().slice(0, 2), langNow = null;
    for (var q = 0; q < I.LANGS.length; q++) if (I.LANGS[q].code === K.lang) langNow = I.LANGS[q];
    var h = '<div class="screen"><div style="padding:18px 20px 0"><h3 style="margin:0">' + esc(t('profile')) + '</h3></div><div class="stack gap-14" style="padding:16px 20px 0">';
    h += '<div class="card elev-sm gap-11"><div class="flex items-center gap-12">' + av('DA', 52, 'leaf') + '<div class="grow"><div class="f-head t-17">Dewi Anggraini</div><div class="t-12 o-65">+62 812 8890 4417 · ' + esc(tx('Gold member')) + '</div></div></div></div>';
    h += '<div>' + X.labelBagian(esc(tx('Saved addresses'))) + '<div class="stack gap-9">';
    for (var a = 0; a < D.ADDRESSES.length; a++) {
      var ad = D.ADDRESSES[a];
      h += '<button class="card" style="gap:4px;cursor:pointer;text-align:start;border:0"' + aksi('pilihAlamat', ad.id) + '><div class="flex items-center gap-8"><span class="t-135 bold">' + esc(tx(ad.label)) + '</span>' + (K.alamat === ad.id ? '<span class="tag tag-accent" style="font-size:10px">' + esc(tx('Default')) + '</span>' : '') + '</div><div class="t-12 o-7">' + esc(ad.brief) + '</div></button>';
    }
    h += '</div></div>';
    h += '<div>' + X.labelBagian(esc(tx('Favourite cleaners'))) + '<div class="flex gap-9">';
    for (var f = 0; f < fav.length; f++) h += '<div class="card" style="flex:1;align-items:center;gap:6px">' + X.avJuru(fav[f], 40, f ? 'leaf' : null) + '<div class="t-12 bold">' + esc(X.namaDepan(fav[f])) + '</div><div class="t-105 o-6">' + (f ? '1 visit' : '3 visits') + '</div></div>';
    h += '<div class="card" style="flex:1;align-items:center;gap:6px;justify-content:center;opacity:.6"><div class="t-11 center">Invite<br>a cleaner</div></div></div></div>';
    h += '<div class="card elev-sm gap-10">';
    for (var i = 0; i < D.SETTINGS.length; i++) {
      var s = D.SETTINGS[i], nilai = s.value === 'saved' ? D.PAYMENTS.length + ' ' + tx('saved') : s.value === 'lang' ? (langNow ? langNow.native : K.lang) : s.value === null ? (K.notifAktif ? tx('On') : tx('Off')) : tx(s.value);
      var label = s.label === 'Language' ? t('language') : tx(s.label);
      h += '<button class="setting"' + (s.sheet ? aksi('lembar', s.sheet) : s.go ? aksi('ke', s.go) : aksi(s.act)) + '><span class="grow left">' + esc(label) + '</span><span class="t-115 o-6">' + esc(nilai) + '</span><span class="o-45">' + garis(IK.kanan, 16) + '</span></button>';
    }
    h += '</div>';
    h += '<div class="card card-clay elev-sm gap-10"><div class="flex items-center gap-10"><div class="grow"><div class="f-head t-15">Invite friends · code DEWI50</div><div class="t-115 o-7">Rp50.000 each, both sides, after their first visit</div></div><button class="btn btn-primary" style="height:36px;padding:0 16px;font-size:12.5px"' + aksi('ke', 'share') + '>' + esc(tx('Share')) + '</button></div></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('keMitra') + '>' + esc(tx('Open the partner app →')) + '</button><div class="spacer-14"></div></div>';
    return h + '</div>';
  };
})(ExoApp);
