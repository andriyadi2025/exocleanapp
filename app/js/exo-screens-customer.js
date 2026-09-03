/* ==========================================================================
   exo-screens-customer.js — layar pelanggan 1–10
   onboard · signup · home · catalog · prepaid · svc · cleaner · review ·
   success · track
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, I = X.I, K = X.KEADAAN, esc = X.esc, rp = X.rp, aksi = X.aksi, kelas = X.kelas, av = X.av,
      ikon = X.ikon, garis = X.garis, IK = X.IK, IKON = X.IKON, t = I.t, tx = I.tx;

  /* ================================================================ ONBOARD */
  X.LAYAR.onboard = function () {
    var poin = ['Schedule-locked bookings', 'Refunds with a dated deadline', 'A human on chat in 60 seconds'];
    var h = '<div class="screen" style="padding:26px 22px 22px">' + X.merek(38, 18);
    h += '<div class="onboard-art"><div class="plate"><img src="' + esc(K.fotoContoh.hero) + '" alt="Hasil pembersihan EXOCLEAN"></div><div class="score">4.9<br>★</div></div>';
    h += '<h2 style="margin:26px 0 0" class="t-31">' + esc(tx('We clean')) + '<br>' + esc(tx('all purpose.')) + '</h2>' +
         '<p style="margin:12px 0 0" class="t-135 lh-16 o-8">' + esc(tx('Real profiles, real rates, a schedule only you can change — and a Rp100.000 promise if we break it.')) + '</p>';
    h += '<div class="stack gap-9" style="margin-top:20px">';
    for (var i = 0; i < poin.length; i++) h += '<div class="tick"><i>✓</i>' + esc(tx(poin[i])) + '</div>';
    h += '</div>';
    var cfg = window.EXO_CONFIG || {}, sibuk = K.sosialSibuk ? ' disabled' : '';
    h += '<div class="mt-auto stack gap-9">' +
      '<button class="social"' + aksi('sosial', 'google') + sibuk + '><i>G</i><span class="grow left">' + esc(tx('Continue with Google')) + '</span>' + (cfg.googleClientId ? '' : '<span class="t-105 o-55">simulated</span>') + '</button>' +
      '<button class="social"' + aksi('sosial', 'facebook') + sibuk + '><i>f</i><span class="grow left">' + esc(tx('Continue with Facebook')) + '</span>' + (cfg.facebookAppId ? '' : '<span class="t-105 o-55">simulated</span>') + '</button>' +
      '<div class="divider-or"><span></span><em>' + esc(tx('or')) + '</em><span></span></div>' +
      '<button class="btn btn-primary btn-block btn-tall"' + aksi('daftar') + '>' + esc(tx('Sign up with email or phone')) + '</button>' +
      '<div class="center t-115 o-55">By continuing you accept our <a href="#"' + aksi('ke', 'terms') + '>terms</a> and privacy policy.</div>' +
    '</div>';
    return h + '</div>';
  };

  /* ================================================================= SIGNUP */
  X.LAYAR.signup = function () {
    var s = K.authStep, urut = ['form','otp','pin'], idx = urut.indexOf(s);
    var judul = s === 'form' ? t('createAcc') : s === 'otp' ? 'Verify it is you' : 'Secure your money';
    var sub = s === 'form' ? (K.social ? 'Confirm the details from ' + K.social : 'Step 1 of 3 · your details')
            : s === 'otp' ? 'Step 2 of 3 · two-step verification' : 'Step 3 of 3 · transaction PIN';
    var h = '<div class="screen" style="padding:20px 20px 18px">';
    h += '<div class="flex items-center gap-12">' + X.tombolKembali('', 'authBack') +
      '<div class="grow"><div class="f-head t-17">' + esc(judul) + '</div><div class="t-115 o-6">' + esc(sub) + '</div></div></div>';
    h += '<div class="progress4" style="margin-top:14px">';
    for (var i = 0; i < 3; i++) h += '<i class="' + (idx >= i ? 'on' : '') + '"></i>';
    h += '</div>';

    if (s === 'form') {
      var ok = K.captcha && K.consent;
      h += '<div class="stack gap-12" style="margin-top:18px">' +
        '<div class="field"><label>' + esc(t('fullName')) + '</label><input class="input" value="Dewi Anggraini"></div>' +
        '<div class="field"><label>' + esc(t('username')) + '</label><input class="input" value="dewi.a"><div class="field-hint">Available · shown to your cleaner instead of your full name</div></div>' +
        '<div class="field"><label>' + esc(t('email')) + '</label><input class="input" value="dewi.anggraini@gmail.com"></div>' +
        '<div class="field"><label>' + esc(t('mobile')) + '</label><input class="input" value="+62 812 8890 4417"><div class="field-hint">We verify this by WhatsApp OTP — it is also your login</div></div>' +
        (window.EXO_CONFIG && EXO_CONFIG.turnstileSiteKey
          ? '<div class="captcha"><div class="grow"><div class="t-125 bold">' + (K.captcha ? 'Verified — you are human' : 'Prove you are human') + '</div><div class="turnstile-box" id="exo-turnstile"></div><div class="t-11 o-6">Cloudflare Turnstile · no puzzles</div></div></div>'
          : '<div class="captcha"><button class="' + kelas('box', K.captcha) + '"' + aksi('captcha') + ' aria-pressed="' + K.captcha + '">✓</button>' +
          '<div class="grow"><div class="t-125 bold">' + (K.captcha ? 'Verified — you are human' : 'I am not a robot') + '</div>' +
          '<div class="t-11 o-6">' + (K.captcha ? 'Simulated challenge · set turnstileSiteKey in exo-config.js for the real one' : 'Tap to run the challenge (simulated)') + '</div></div><div class="cap">CAP</div></div>') +
        '<div class="flex gap-9 items-start t-115 lh-145 o-75"><button class="' + kelas('box', K.consent) + '"' + aksi('consent') + ' aria-pressed="' + K.consent + '">✓</button>' +
          '<span>I accept the EXOCLEAN terms of service and privacy policy (PT EXO POINT).</span></div>' +
      '</div>';
      h += '<div class="mt-auto" style="padding-top:16px"><button class="btn btn-primary btn-block btn-tall"' + (ok && !K.otpSibuk ? aksi('otpKirim') : ' disabled') + '>' +
        (K.otpSibuk ? 'Sending…' : !K.captcha ? 'Complete the captcha' : !K.consent ? 'Accept the terms to continue' : 'Send verification code') + '</button></div>';
    } else if (s === 'otp') {
      var srv = K.otpServer === 'terkirim';
      h += '<div class="center" style="margin-top:24px"><div class="auth-icon">' + ikon(IKON.hp, 28) + '</div>' +
        '<div class="f-head t-20" style="margin-top:14px">' + esc(t('twoStep')) + '</div>' +
        '<div class="t-125 o-7 lh-15" style="margin-top:6px">' + (srv ? esc(tx('Code sent by the EXOCLEAN auth server to')) + ' ' + esc(K.otpTujuan) + '.<br>' + esc(tx('SMS provider is in log mode — read the code from the server console.')) : esc(tx('Code sent by WhatsApp to')) + ' ' + esc(K.otpTujuan) + '.<br>' + esc(tx('Auth server is offline — simulation, tap paste below.'))) + '</div>' +
        '<div class="otp">';
      for (var o = 0; o < 6; o++) h += '<i class="' + (K.otp[o] ? 'on' : '') + '">' + esc(K.otp[o] || '') + '</i>';
      h += '</div>';
      if (srv) h += '<div style="margin-top:14px;padding:0 30px"><input class="input center" id="exo-otp" inputmode="numeric" maxlength="6" data-simpan="otp" data-gambar="1" value="' + esc(K.otp) + '" placeholder="6-digit code" aria-label="Code"></div>';
      else h += '<button class="btn btn-ghost t-125" style="margin-top:12px"' + aksi('isiOtp') + '>Paste code from WhatsApp</button>';
      h += '<div class="t-115 o-6" style="margin-top:4px"><a href="#"' + aksi('otpKirim') + '>Resend code</a> · <a href="#">use authenticator instead</a></div></div>';
      h += '<div class="mt-auto stack gap-9"><div class="card card-leaf gap-7"><div class="t-125 lh-15">After this, two-step verification stays on for new devices, password changes and any withdrawal — you can add an authenticator app in Profile.</div></div>' +
        '<button class="btn btn-primary btn-block btn-tall"' + (K.otp.length < 6 || K.otpSibuk ? ' disabled' : aksi('otpPeriksa')) + '>' + (K.otpSibuk ? 'Checking…' : 'Verify and continue') + '</button></div>';
    } else {
      h += '<div class="center" style="margin-top:24px"><div class="auth-icon leaf">' + ikon(IKON.gembok, 28) + '</div>' +
        '<div class="f-head t-20" style="margin-top:14px">' + esc(t('createPin')) + '</div>' +
        '<div class="t-125 o-7 lh-15" style="margin-top:6px">Six digits, required for every payment, wallet top-up and refund — separate from your login.</div>' +
        '<div style="margin-top:22px">' + X.pinDots(K.pin) + '</div>' +
        '<div class="t-115 o-65" style="margin-top:10px">' + (K.pin.length < 6 ? 'Enter 6 digits' : 'Confirmed · we never show this to anyone, including support') + '</div></div>' +
        '<div style="margin-top:20px">' + X.keypad('pinTekan') + '</div>';
      h += '<div class="mt-auto stack gap-9" style="padding-top:14px"><div class="t-115 o-6 lh-145">Avoid 123456 or your birth date. Five wrong tries locks transactions for 30 minutes; unlock needs two-step verification.</div>' +
        '<button class="btn btn-primary btn-block btn-tall"' + (K.pin.length < 6 ? ' disabled' : aksi('selesaiAuth')) + '>Finish and enable Face ID</button></div>';
    }
    return h + '</div>';
  };

  /* =================================================================== HOME */
  X.LAYAR.home = function () {
    var b = EXO_BRAND.baca(), j = X.juruKini();
    var h = '<div class="screen">';
    h += '<div class="hero"><div class="flex items-start gap-12">' + X.logoMark(34, 'margin-top:2px') +
      '<button class="grow" style="all:unset;box-sizing:border-box;cursor:pointer;flex:1;min-width:0"' + aksi('lembar', 'alamat') + '>' +
        '<div class="hero-eyebrow">' + esc(t('cleaningAt')) + '</div>' +
        '<div class="hero-place"><span>' + esc(X.alamatKini().short) + '</span>' + garis(IK.bawah, 15) + '</div></button>' +
      '<div class="flex gap-8"><button class="lang-btn"' + aksi('ke', 'lang') + '>' + K.lang.toUpperCase() + '</button>' +
        '<button class="btn btn-icon btn-secondary btn-plain"' + aksi('ke', 'wallet') + ' aria-label="Wallet">' + ikon(IKON.dompet) + '</button>' +
        '<button class="btn btn-icon btn-secondary btn-plain"' + aksi('lembar', 'notif') + ' aria-label="Notifications">' + ikon(IKON.lonceng) + '</button></div></div>' +
      '<div class="flex gap-8" style="margin-top:14px"><div class="searchbox">' + ikon(IKON.cari, 15) +
        '<input id="exo-cari" data-simpan="cari" data-gambar="1" value="' + esc(K.cari) + '" placeholder="' + esc(t('searchHint')) + '" aria-label="Search services">' +
        (K.cari ? '<button class="hapus"' + aksi('cariKosong') + ' aria-label="Clear">✕</button>' : '') + '</div></div>';
    if (b.tickerOn && b.tickerText) {
      h += '<div class="ticker"><div class="ticker-badge"><i></i>' + esc(b.tickerBadge) + '</div><div class="ticker-win"><div class="ticker-track">' +
        '<span>' + esc(b.tickerText) + '</span><span>' + esc(b.tickerText) + '</span></div></div></div>';
    }
    h += '</div>';

    var cari = K.cari.trim().toLowerCase();
    var tiles = D.HOME_TILES.filter(function (s) {
      if (X.layananDijeda(s.id)) return false;
      return !cari || D.SERVICES[s.id].name.toLowerCase().indexOf(cari) >= 0 || I.svcName(s.id).toLowerCase().indexOf(cari) >= 0;
    });
    var jumlah = Object.keys(D.SERVICES).filter(function (k) { return !X.layananDijeda(k); }).length;
    h += '<div style="padding:18px 20px 0"><div class="sec-head"><h4 style="margin:0;font-size:19px">' + esc(t('whatNeeds')) + '</h4>' +
      '<button class="btn btn-ghost t-125"' + aksi('ke', 'catalog') + '>' + esc(t('services9').replace('{n}', jumlah)) + ' →</button></div>';
    if (!tiles.length) {
      h += '<div class="kosong">' + esc(tx('Nothing matches')) + ' “' + esc(K.cari) + '”. <button class="btn btn-ghost t-125"' + aksi('ke', 'catalog') + '>' + esc(tx('See all')) + ' ' + jumlah + '</button></div>';
    } else {
      h += '<div class="svc-grid">';
      for (var i = 0; i < tiles.length; i++) {
        h += '<button class="svc' + (tiles[i].daun ? ' leaf' : '') + '"' + aksi('pilihJasa', tiles[i].id) + '><i>' + ikon(tiles[i].d, 20) + '</i><b>' + esc(I.svcName(tiles[i].id)) + '</b></button>';
      }
      h += '</div>';
    }
    h += '</div>';

    h += '<div style="padding:18px 20px 0" class="flex gap-10">' +
      '<button class="quick solid"' + aksi('pesanCepat') + '><b>' + esc(t('quickBook')) + '</b><span>' + esc(t('quickNote')) + '</span></button>' +
      '<button class="quick"' + aksi('ke', 'prepaid') + '><b>' + esc(t('prepaidTtl')) + '</b><span>' + esc(t('prepaidSave')) + '</span></button></div>';

    h += '<div style="padding:20px 20px 0"><div class="card card-leaf elev-sm gap-11"><div class="flex items-center gap-8">' +
      '<span class="av av-leaf" style="--s:26px">' + ikon(IKON.perisaiCentang, 14) + '</span><div class="f-head t-15">' + esc(t('guarantee')) + '</div></div>' +
      '<div class="t-125 lh-15 o-85">' + esc(tx('Once confirmed, only you can move the time. If we ever reschedule you, Rp100.000 credit lands in your wallet the same minute — no ticket, no chasing.')) + '</div></div></div>';

    h += '<div style="padding:20px 20px 0"><div class="sec-head"><h4 style="margin:0;font-size:19px">' + esc(t('nextVisit')) + '</h4>' +
      '<button class="btn btn-ghost t-125"' + aksi('ke', 'track') + '>' + esc(t('trackLive')) + '</button></div>' +
      '<div class="card elev-md gap-12" style="margin-top:11px"><div class="flex items-center gap-11">' + X.avJuru(j, 44) +
        '<div class="grow"><div class="f-head t-16">' + esc(j.name) + '</div><div class="t-12 o-65">' + esc(I.svcName(K.jasa)) + ' · ' + esc(X.qtyText(K.jam)) + ' · ' + esc(tx('Today').toLowerCase()) + ' ' + esc(K.mulai + ' ' + X.labelZona()) + '</div></div>' +
        '<span class="tag tag-accent-2">' + esc(t('onTheWay')) + '</span></div>' +
      '<div class="progress"><i style="width:46%"></i></div>' +
      '<div class="flex between t-115 o-65"><span>' + esc(tx('Arriving')) + ' 08:56</span><span>' + esc(t('slotLocked')) + '</span></div></div></div>';

    var dekat = X.daftarJuru().slice(0, 3);
    h += '<div style="padding:20px 20px 0"><div class="sec-head"><h4 style="margin:0;font-size:19px">' + esc(t('nearYou')) + '</h4>' +
      '<button class="btn btn-ghost t-125"' + aksi('pilihJasa', 'hourly') + '>' + esc(t('seeAll')) + '</button></div>' +
      '<div class="hscroll" style="gap:11px;margin-top:11px">';
    if (!dekat.length) h += '<div class="kosong" style="padding:14px 6px">No cleaner has a rate yet, so there is nobody to show.</div>';
    for (var c = 0; c < dekat.length; c++) {
      var cl = dekat[c];
      h += '<div class="near"><div class="flex items-center gap-8">' + X.avJuru(cl, 34, 'leaf') + '<div class="t-12 bold" style="line-height:1.2">' + esc(X.namaDepan(cl)) + '</div></div>' +
        '<div class="t-115 o-7" style="margin-top:9px">' + (cl.rating ? '★ ' + esc(cl.rating) + ' · ' : '') + esc(cl.jobs) + ' ' + esc(tx('jobs')) + '</div>' +
        '<div class="f-head t-14" style="margin-top:5px">' + rp(X.rateFor(cl)) + '</div>' +
        '<div class="t-11 o-6">' + esc(cl.distance ? cl.distance + ' ' + tx('away') : (cl.years ? cl.years + ' ' + tx('with EXOCLEAN') : tx('new'))) + '</div></div>';
    }
    h += '</div></div><div class="spacer-26"></div>';
    return h + '</div>';
  };

  /* ================================================================ CATALOG */
  X.LAYAR.catalog = function () {
    var jumlah = Object.keys(D.SERVICES).filter(function (k) { return !X.layananDijeda(k); }).length;
    var h = '<div class="screen">' + X.kepala(esc(t('whatNeeds')), esc(t('catalogSub').replace('{n}', jumlah)), 'home');
    h += '<div class="stack gap-16 pad-x18">';
    for (var g = 0; g < D.CATALOG_GROUPS.length; g++) {
      var grp = D.CATALOG_GROUPS[g];
      h += '<div class="stack gap-9"><div class="t-12 up o-6">' + esc(t(grp.key)) + '</div>';
      for (var i = 0; i < grp.keys.length; i++) {
        var k = grp.keys[i], sv = D.SERVICES[k];
        if (X.layananDijeda(k)) continue;
        var min = X.bulat(sv.rate * D.MIN_FACTOR);
        h += '<button class="' + kelas('cat-item', K.jasa === k) + '"' + aksi('pilihJasa', k) + '>' +
          '<span class="grow left"><span class="t-135 bold">' + esc(I.svcName(k)) + '</span><span style="display:block" class="t-115 o-65">' + esc(I.warrantyText(sv.warranty)) + '</span></span>' +
          '<span class="right"><span class="f-head t-14">' + esc(t('fromPrefix')) + ' ' + rp(min) + '</span><span style="display:block" class="t-105 o-6">' + esc(I.unitLabel(sv.unit)) + '</span></span></button>';
      }
      h += '</div>';
    }
    return h + '<div class="spacer-16"></div></div></div>';
  };

  /* ================================================================ PREPAID */
  X.LAYAR.prepaid = function () {
    var h = '<div class="screen">' + X.kepala(esc(t('prepaidTtl')), esc(t('prepaidSub')), 'home');
    h += '<div class="stack gap-11 pad-x18">';
    var pilih = null;
    for (var i = 0; i < D.PREPAID.length; i++) {
      var p = D.PREPAID[i], on = K.prepaid === p.id; if (on) pilih = p;
      h += '<button class="' + kelas('pack', on) + '"' + aksi('prepaid', p.id) + '>' +
        '<div class="flex items-start gap-12" style="width:100%"><div class="grow left"><div class="flex items-center gap-7"><span class="f-head t-17">' + esc(t(p.nameKey)) + '</span>' +
        (p.badge ? '<span class="' + (p.badge === 'badgeTop' ? 'badge-top' : 'badge-save') + '">' + esc(t(p.badge)) + '</span>' : '') + '</div>' +
        '<div class="t-115 o-7" style="margin-top:3px">' + esc(t(p.detailKey)) + '</div></div>' +
        '<div class="right"><div class="f-head t-17">' + rp(p.price) + '</div><div class="t-105 o-6">' + rp(Math.round(p.price / p.hours)) + ' ' + esc(t('perHour')) + '</div></div></div>' +
        '<div class="pack-save">' + esc(t(p.saveKey)) + '</div></button>';
    }
    h += '<div class="card card-leaf gap-8"><div class="f-head t-15">' + esc(t('packTerms')) + '</div><div class="t-12 lh-15 o-85">' + esc(t('packTermsBody')) + '</div></div><div class="spacer-12"></div></div>';
    h += '<div class="actionbar actionbar--tight" style="gap:12px"><div><div class="price-lbl">' + esc(pilih ? t(pilih.nameKey) : '') + '</div><div class="price-val t-18">' + rp(pilih ? pilih.price : 0) + '</div></div>' +
      '<button class="btn btn-primary" style="flex:1;height:46px"' + aksi('beliPrepaid') + '>' + esc(t('buyPack')) + '</button></div>';
    return h + '</div>';
  };

  /* ============================================================== BOOK 1 */
  X.LAYAR.svc = function () {
    var s = X.jasaKini(), perJam = s.unit === '/hour';
    var hint = !perJam ? tx('from') + ' ' + rp(X.minRate()) + ' ' + tx('each, rate set by the cleaner')
             : K.jam <= 2 ? tx('Good for a studio or 1BR') : K.jam === 3 ? tx('Typical 2BR apartment') : tx('House or post-party reset');
    var h = '<div class="screen">' + X.kepala(esc(I.svcName(K.jasa)), esc(tx('Step 1 of 3 · what & when')), 'home') + X.langkah(1);
    h += '<div class="stack gap-18" style="padding:20px 18px 0">';
    h += '<div>' + X.labelBagian(esc(perJam ? t('howLong') : t('howMany') + ' ' + I.countWord(s.unit))) +
      '<div class="stepper"><button class="btn btn-icon btn-plain"' + aksi('jamKurang') + ' aria-label="Less">' + garis(IK.kurang) + '</button>' +
      '<div class="grow center"><div class="stepper-val">' + esc(X.qtyText(K.jam)) + '</div><div class="stepper-hint">' + esc(hint) + '</div></div>' +
      '<button class="btn btn-icon btn-plain"' + aksi('jamTambah') + ' aria-label="More">' + garis(IK.tambah) + '</button></div></div>';
    h += '<div>' + X.labelBagian(esc(t('crewSize'))) + '<div class="flex gap-9">' +
      '<button class="' + kelas('crew', K.regu === 1) + '"' + aksi('regu', 1) + '>' + esc(t('crew1')) + '<span>' + esc(perJam ? X.qtyText(K.jam) + ' ' + t('onSite') : t('standardPace')) + '</span></button>' +
      '<button class="' + kelas('crew', K.regu === 2) + '"' + aksi('regu', 2) + '>' + esc(t('crew2')) + '<span>' + esc(perJam ? (K.jam / 2) + ' ' + I.countWord('/hour') + ' · ' + t('samePrice') : t('halfTime')) + '</span></button></div></div>';
    h += '<div>' + X.labelBagian(esc(t('dateLbl'))) + '<div class="hscroll">';
    for (var i = 0; i < 7; i++) {
      var d = X.hariKe(i);
      h += '<button class="' + kelas('day', K.hari === i) + '"' + aksi('hari', i) + '><em>' + esc(I.dowShort(d)) + '</em><b>' + ('0' + d.getDate()).slice(-2) + '</b></button>';
    }
    h += '</div></div>';
    h += '<div>' + X.labelBagian(esc(t('startTime'))) + '<div class="flex wrap gap-8">';
    for (var j = 0; j < D.TIMES.length; j++) h += '<button class="' + kelas('pill', K.mulai === D.TIMES[j]) + '"' + aksi('mulai', D.TIMES[j]) + '>' + D.TIMES[j] + '</button>';
    h += '</div><div class="t-115 o-6 lh-145" style="margin-top:8px">' + esc(tx('Times follow')) + ' ' + esc(K.addr.kabkota || K.addr.provinsi || K.addr.negara) + ' · ' + esc(X.labelZona()) +
      (X.zonaBeda() ? ' · ' + esc(tx('on your phone')) + ' ' + esc(X.jamPonsel(K.mulai)) + ' ' + esc(X.labelPerangkat()) : '') + '</div></div>';
    var adds = X.addonsKini();
    if (adds.length) {
      h += '<div>' + X.labelBagian(esc(t('addonsLbl'))) + '<div class="stack gap-8">';
      for (var a = 0; a < adds.length; a++) {
        var x = adds[a], on = !!K.tambahan[x.id];
        h += '<button class="' + kelas('row', on) + '"' + aksi('tambahan', x.id) + ' aria-pressed="' + on + '">' +
          '<span class="row-main"><b>' + esc(tx(x.name)) + '</b><span>' + esc(tx(x.note)) + '</span></span>' +
          '<span class="f-head t-13">+' + rp(x.price) + '</span><span class="' + kelas('box', on) + '">✓</span></button>';
      }
      h += '</div></div>';
    }
    if (D.SURVEY_FIRST[K.jasa]) {
      h += '<div class="card card-clay gap-8"><div class="flex items-center gap-8"><span class="survey-num">1</span><div class="grow f-head t-15">' + esc(tx('Free survey first')) + '</div></div>' +
        '<div class="t-12 lh-15 o-85">' + esc(tx('A supervisor visits free within 24 hours, agrees a fixed price with you, and only then do we book the crew. The figure below is an estimate until the survey is signed.')) + '</div></div>';
    }
    h += '<div class="card card-leaf gap-6"><div class="flex items-center gap-7 f-head t-14">' + garis(IK.perisai, 15) + esc(I.warrantyText(s.warranty)) + '</div>' +
      '<div class="t-12 lh-15 o-8">' + esc(tx('Not happy? Raise it while the cleaner is still on site and we re-clean free, or refund to your EXO Wallet within 3 working days.')) + '</div>' +
      '<button class="btn btn-secondary" style="height:34px;font-size:12px;align-self:flex-start"' + aksi('syaratLayanan') + '>' + esc(tx('What is and is not included →')) + '</button></div>';
    h += '<div class="spacer-12"></div></div>';
    h += '<div class="actionbar"><div><div class="price-lbl">' + esc(t('fromLbl')) + '</div><div class="price-val">' + rp(X.lineFor(X.minRate()) + X.addonTotal() + X.crewFee()) + '</div></div>' +
      '<button class="btn btn-primary" style="flex:1;height:48px;font-size:15px"' + aksi('ke', 'cleaner') + '>' + esc(t('chooseCl')) + '</button></div>';
    return h + '</div>';
  };

  /* ============================================================== BOOK 2 */
  X.LAYAR.cleaner = function () {
    var s = X.jasaKini(), daftar = X.daftarJuru(), pilih = X.juruKini();
    var saringan = [['best','Best match'],['fav','Booked before'],['cheap','Lowest rate'],['near','Nearest']];
    var h = '<div class="screen">' + X.kepala(esc(tx('Available cleaners')), esc(X.ringkasSlot()), 'svc') + X.langkah(2);
    h += '<div class="hscroll" style="padding:14px 18px 0">';
    for (var f = 0; f < saringan.length; f++) h += '<button class="' + kelas('pill', K.saring === saringan[f][0]) + '"' + aksi('saring', saringan[f][0]) + '>' + esc(tx(saringan[f][1])) + '</button>';
    h += '</div><div class="stack gap-11" style="padding:14px 18px 0">';
    var urut = daftar.slice();
    if (K.saring === 'cheap') urut.sort(function (a, b) { return X.rateFor(a) - X.rateFor(b); });
    if (K.saring === 'near') urut.sort(function (a, b) { return parseFloat(String(a.distance || 99).replace(',', '.')) - parseFloat(String(b.distance || 99).replace(',', '.')); });
    if (K.saring === 'fav') urut.sort(function (a, b) { return (b.tags.join(' ').indexOf('Booked by you') >= 0) - (a.tags.join(' ').indexOf('Booked by you') >= 0); });
    if (!urut.length) {
      h += '<div class="card card-clay gap-8"><div class="f-head t-16">No cleaners listed yet</div><div class="t-125 lh-15">Every cleaner needs a rate before they can appear here, and only a super admin sets it — in the EXOCLEAN admin app, under <strong>Mitra &amp; Rekrutmen → the cleaner → Tarif pasar</strong>.</div></div>';
    }
    for (var c = 0; c < urut.length; c++) {
      var j = urut[c], on = pilih.id === j.id, meta = [];
      if (!j.rating) meta.push(tx('not rated yet'));
      meta.push(j.jobs + ' ' + tx('jobs'));
      if (j.distance) meta.push(j.distance);
      if (j.years) meta.push(j.years.replace('yrs', tx('yrs')));
      h += '<button class="' + kelas('cleaner', on) + '"' + aksi('juru', j.id) + ' aria-pressed="' + on + '">' +
        '<div class="flex gap-12 items-start" style="width:100%">' + X.avJuru(j, 50) +
        '<div class="grow left"><div class="flex items-baseline gap-6"><span class="cleaner-name">' + esc(j.name) + '</span>' + (j.rating ? '<span class="t-115 o-65">★ ' + esc(j.rating) + '</span>' : '') + '</div>' +
        '<div class="t-115 o-65" style="margin-top:1px">' + esc(meta.join(' · ')) + '</div><div class="flex wrap gap-5" style="margin-top:7px">';
      for (var tg = 0; tg < j.tags.length; tg++) h += '<span class="tag tag-neutral tag-xs">' + esc(tx(j.tags[tg])) + '</span>';
      h += '</div></div><div class="right" style="flex:none"><div class="cleaner-rate">' + rp(X.rateFor(j)) + '</div><div class="t-105 o-6">' + esc(I.unitLabel(s.unit)) + '</div>' +
        '<div class="t-11 c-leaf-800" style="margin-top:6px">' + rp(X.lineFor(X.rateFor(j)) + X.addonTotal() + X.crewFee()) + ' ' + esc(tx('total')) + '</div></div></div>' +
        '<div class="cleaner-note">' + esc(tx(j.note)) + '</div></button>';
    }
    if (urut.length) {
      h += '<div class="t-115 o-55 lh-15" style="padding:0 4px">' + esc(tx(X.pakaiDB()
        ? 'Rates are set by EXOCLEAN, the same for every customer — no surge, no bidding. The Rp3.000 platform fee is the only thing added.'
        : 'Rates are set by each cleaner. EXOCLEAN adds a Rp3.000 platform fee — nothing else, no surge.')) + '</div>';
    }
    h += '<div class="spacer-12"></div></div>';
    h += '<div class="actionbar"><div><div class="price-lbl">' + esc(pilih.name) + '</div><div class="price-val">' + rp(X.subtotalN()) + '</div></div>' +
      '<button class="btn btn-primary" style="flex:1;height:48px;font-size:15px"' + (urut.length ? aksi('ke', 'review') : ' disabled') + '>' + esc(t('reviewBk')) + '</button></div>';
    return h + '</div>';
  };

  /* ============================================================== BOOK 3 */
  X.LAYAR.review = function () {
    var s = X.jasaKini(), j = X.juruKini(), v = X.voucherKini(), elig = X.voucherEligible(), app = X.voucherApplied();
    var h = '<div class="screen">' + X.kepala(esc(tx('Review & pay')), esc(tx('Step 3 of 3')), 'cleaner') + X.langkah(3);
    h += '<div class="stack gap-14" style="padding:16px 18px 0">';
    h += '<div class="card elev-sm gap-10"><div class="flex items-center gap-11">' + X.avJuru(j, 42) +
      '<div class="grow"><div class="f-head t-15">' + esc(j.name) + '</div><div class="t-115 o-65">' + esc(I.svcName(K.jasa)) + ' · ' + esc(X.ringkasSlot()) + '</div></div></div>' +
      '<div class="rule"></div><div class="flex gap-8 items-start t-125 lh-145"><span style="flex:none;margin-top:2px;color:var(--color-accent-2-700)">' + garis(IK.perisai, 15) + '</span><span>' + esc(tx(X.alamatKini().full)) + '</span></div></div>';
    var status = !v.live ? tx('This code is paused by EXOCLEAN right now.')
      : !elig ? tx('Not valid under') + ' ' + rp(v.min) + ' — ' + tx('your cart is') + ' ' + rp(X.subtotalN()) + '. ' + tx('We tell you now, not at payment.')
      : app ? tx('Checked against this cart — valid, applied. No surprises at payment.') : tx('Tap apply and we validate it before you pay.');
    h += '<div>' + X.labelBagian(esc(t('voucherLbl'))) + '<div class="card card-leaf gap-9"><div class="flex items-center gap-9"><div class="grow t-135 bold">' + esc(v.code) + ' — ' + rp(v.amount) + ' ' + esc(tx('off')) + '</div>' +
      '<button class="pill pill-sm' + (elig ? (K.voucher ? ' on' : '') : ' off') + '"' + (elig ? aksi('voucher') : ' disabled') + '>' + esc(!elig ? tx('Not eligible') : app ? tx('Applied ✓') : tx('Apply')) + '</button></div>' +
      '<div class="flex gap-7 items-center t-115 lh-14 o-85"><span class="check-sm">✓</span><span>' + esc(status) + '</span></div></div></div>';
    h += '<div>' + X.labelBagian(esc(t('payWith'))) + '<div class="stack gap-8">';
    for (var p = 0; p < D.PAYMENTS.length; p++) {
      var b = D.PAYMENTS[p], on = K.bayar === b.id;
      h += '<button class="' + kelas('row', on) + '"' + aksi('bayar', b.id) + ' aria-pressed="' + on + '"><span class="paymark">' + b.mark + '</span>' +
        '<span class="row-main"><b>' + esc(tx(b.name)) + '</b><span>' + esc(b.note ? tx(b.note) : rp(K.saldo) + ' · ' + tx('instant refunds here')) + '</span></span><span class="' + kelas('dot', on) + '"></span></button>';
    }
    h += '</div></div>';
    var lines = [
      [I.svcName(K.jasa) + ' · ' + X.qtyText(K.jam) + ' × ' + X.namaDepan(j), rp(X.lineFor(X.rateFor(j)))],
      [tx('Add-ons') + ' (' + X.addonCount() + ')', rp(X.addonTotal())],
      [tx('2-cleaner coordination'), K.regu === 2 ? rp(D.CREW_FEE) : tx('not applied')],
      [tx('Platform fee'), rp(D.PLATFORM_FEE)],
      [tx('Transport · 12 km from Kemang hub'), tx('Free')],
      [v.code, app ? '− ' + rp(v.amount) : tx('not applied')]
    ];
    h += '<div class="card elev-sm gap-8">';
    for (var l = 0; l < lines.length; l++) h += '<div class="kv"><span>' + esc(lines[l][0]) + '</span><span>' + esc(lines[l][1]) + '</span></div>';
    h += '<div class="rule"></div><div class="flex items-baseline between"><span class="f-head t-15">' + esc(t('totalLbl')) + '</span><span class="f-head t-22">' + rp(X.totalN()) + '</span></div></div>';
    h += '<div class="note-i"><i>i</i><span>' + esc(tx('Charged after the visit is confirmed done. Cancelling or rescheduling within 4 hours costs Rp50.000 per cleaner. Refunds go to your EXO Wallet within 3 working days.')) + '</span></div><div class="spacer-12"></div></div>';
    h += '<div class="actionbar actionbar--col">';
    if (K.payPinOpen) {
      h += '<div class="stack gap-11" style="padding-bottom:12px"><div class="flex items-center gap-10"><span class="av av-leaf" style="--s:26px">' + ikon(IKON.gembok, 14) + '</span>' +
        '<div class="grow t-125 bold">' + esc(tx('Enter your 6-digit transaction PIN')) + '</div><button class="btn btn-ghost t-12"' + aksi('batalPin') + '>' + esc(tx('Cancel')) + '</button></div>' +
        X.pinDots(K.payPin, true) + X.keypad('payPinTekan', true) + '<div class="center t-11 o-6">Or use Face ID · PIN is never shared with support</div></div>';
    }
    var lbl = K.gatewaySibuk ? 'Contacting payment gateway…' : !K.payPinOpen ? tx('Lock this slot') + ' · ' + rp(X.totalN()) : K.payPin.length < 6 ? tx('Enter PIN to pay') : tx('Confirm payment') + ' · ' + rp(X.totalN());
    h += '<button class="btn btn-primary btn-block" style="height:50px;font-size:15px;margin:0"' + (K.gatewaySibuk ? ' disabled' : aksi('konfirmasi')) + '>' + esc(lbl) + '</button></div>';
    return h + '</div>';
  };

  /* ============================================================= SUCCESS */
  X.LAYAR.success = function () {
    var s = X.jasaKini(), j = X.juruKini(), b = D.PAYMENTS[0];
    for (var i = 0; i < D.PAYMENTS.length; i++) if (D.PAYMENTS[i].id === K.bayar) b = D.PAYMENTS[i];
    var h = '<div class="screen center" style="padding:28px 22px 22px;align-items:center">' + X.logoMark(52, 'margin-top:10px');
    h += '<div class="done-mark"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-2-800)" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="' + IK.centang + '"/></svg></div>';
    h += '<h3 style="margin:22px 0 0;font-size:26px">' + esc(t('slotLocked')) + '</h3>' +
      '<p style="margin:10px 0 0;max-width:280px" class="t-135 lh-16 o-8">' + esc(j.name) + ' ' + esc(tx('is confirmed for')) + ' ' + esc(X.ringkasSlot()) + '. ' + esc(tx('Only you can move this booking — and we’ll tell you the moment she starts.')) + '</p>';
    h += '<div class="card elev-sm gap-9" style="margin-top:22px;width:100%;text-align:start">' +
      '<div class="kv"><span>' + esc(tx('Order')) + '</span><span class="f-head">' + esc(K.orderNo) + '</span></div>' +
      '<div class="kv"><span>' + esc(tx('Paid with')) + '</span><span>' + esc(tx(b.name)) + '</span></div>' +
      '<div class="kv"><span>' + esc(t('totalLbl')) + '</span><span>' + rp(X.totalN()) + '</span></div>' +
      '<div class="kv"><span>' + esc(tx('Warranty')) + '</span><span>' + esc(I.warrantyText(s.warranty)) + '</span></div></div>';
    h += '<div class="mt-auto stack gap-9" style="width:100%">' +
      '<button class="btn btn-primary btn-block btn-tall"' + aksi('ke', 'track') + '>' + esc(t('trackVisit')) + '</button>' +
      '<button class="btn btn-secondary btn-block" style="height:44px;margin:0"' + aksi('ke', 'share') + '>' + esc(tx('Share this to my friends')) + '</button>' +
      '<button class="btn btn-ghost" style="align-self:center"' + aksi('ke', 'home') + '>' + esc(tx('Back to home')) + '</button></div>';
    return h + '</div>';
  };

  /* =============================================================== TRACK */
  X.barisCeklis = function (bisaDitekan) {
    var h = '', mitra = K.sisi === 'partner';
    for (var i = 0; i < D.CHECK_IDS.length; i++) {
      var id = D.CHECK_IDS[i], on = !!K.ceklis[id];
      var label = mitra ? D.CHECK_ID_LABELS[i] : t(D.CHECK_KEYS[i]);
      var isi = '<span class="' + kelas('box', on) + '">✓</span><span class="t-13' + (on ? ' strike' : '') + '">' + esc(label) + '</span>' +
                '<span style="margin-inline-start:auto" class="t-11 o-6">' + D.CHECK_TIMES[i] + '</span>';
      h += bisaDitekan ? '<button class="row row-tight"' + aksi('ceklis', id) + ' aria-pressed="' + on + '">' + isi + '</button>'
                       : '<div class="flex items-center gap-9 t-13">' + isi + '</div>';
    }
    return h;
  };
  X.LAYAR.track = function () {
    var j = X.juruKini(), pos = X.posisiMitra(), jarak = pos && window.U ? U.jarakMeter(pos, X.alamatKini().point) : null;
    var eta = K.tahap <= 1 ? (jarak != null ? tx('Arriving') + ' ' + tx('in ~') + X.menitTempuh(jarak) + ' ' + tx('min') + ' · ' + X.teksJarak(jarak) : tx('Arriving') + ' 08:56') : K.tahap === 2 ? tx('Working') + ' · 1h 12m ' + tx('left') : tx('Finished') + ' 12:04';
    var h = '<div class="screen"><div class="map">' + X.petaHTML(pos && K.tahap <= 1 ? { lat:pos.lat, lng:pos.lng } : X.alamatKini().point, pos ? 'Cleaner position' : 'Map of the visit address') + '<div class="tirai"></div>' +
      '<div class="back"><button class="btn btn-icon btn-plain"' + aksi('ke', 'home') + ' aria-label="Back">' + garis(IK.kembali) + '</button></div><div class="eta">' + esc(eta) + '</div></div>';
    h += '<div class="stack gap-14" style="padding:16px 18px 0">';
    var jamPos = pos ? X.jamZona(new Date(pos.at).toISOString()) + ' ' + X.labelZona() : '';
    h += '<div class="t-11 o-6 lh-145" style="margin-top:-4px">' + (pos
      ? (pos.sumber === 'server' ? 'Live position from the EXOCLEAN position server (' + esc(jamPos) + ', refreshed every 5 s).' : 'Cleaner\'s last position from the partner app on this device (' + esc(jamPos) + '). ' + (K.posisiServerAda === false ? 'Position server offline — start app/server/posisi-server.js for other devices.' : 'Waiting for the position server.'))
      : 'Map shows the visit address. ' + (K.posisiServerAda === false ? 'Position server offline (app/server/posisi-server.js) and no position on this device yet.' : K.posisiServerAda ? 'Position server connected — no position sent for ' + esc(K.orderNo) + ' yet.' : 'Checking the position server…')) + '</div>';
    h += '<div class="card elev-md gap-12"><div class="flex items-center gap-11">' + X.avJuru(j, 46) +
      '<div class="grow"><div class="f-head t-16">' + esc(j.name) + '</div><div class="t-115 o-65">★ ' + esc(j.rating || '—') + ' · B 3421 QLX · ' + esc(tx(D.STAGES[K.tahap].title)) + '</div></div>' +
      '<a class="btn btn-icon btn-primary" href="tel:+6281288904417" aria-label="Call">' + garis(IK.telepon, 17) + '</a>' +
      '<button class="btn btn-icon btn-secondary btn-soft"' + aksi('lembar', 'obrol') + ' aria-label="Chat">' + garis(IK.obrol, 17) + '</button></div><div class="stack">';
    for (var i = 0; i < D.STAGES.length; i++) {
      var lewat = i <= K.tahap;
      h += '<div class="stage"><div class="stage-rail"><span class="' + kelas('stage-dot', lewat) + '">' + (lewat ? '✓' : '') + '</span><span class="' + kelas('stage-line', i < K.tahap) + '"></span></div>' +
        '<div class="stage-body"><b>' + esc(tx(D.STAGES[i].title)) + '</b><span>' + esc(D.STAGES[i].note) + '</span></div></div>';
    }
    h += '</div><button class="btn btn-secondary btn-block" style="margin:0"' + aksi('tahapMaju') + '>' + esc(tx('Simulate next status')) + '</button></div>';
    h += '<div class="card card-leaf gap-10"><div class="f-head t-15">' + esc(t('liveCheck')) + '</div>' + X.barisCeklis(false) + '</div>';
    h += '<div class="card elev-sm gap-9"><div class="flex items-center gap-9">' + av('RA', 30, 'soft') + '<div class="grow"><div class="t-13 bold">' + esc(tx('Rahma from support')) + '</div><div class="t-11 o-6">' + esc(tx('Human, replies in ~40s · not a bot')) + '</div></div>' +
      '<button class="btn btn-ghost t-125"' + aksi('lembar', 'obrol') + '>' + esc(tx('Chat')) + '</button></div></div><div class="spacer-14"></div></div>';
    h += '<div class="actionbar actionbar--tight"><button class="btn btn-secondary" style="flex:1"' + aksi('ke', 'issue') + '>' + esc(t('reportIss')) + '</button>' +
      '<button class="btn btn-secondary" style="flex:1"' + aksi('ke', 'report') + '>' + esc(t('reportShort')) + '</button>' +
      '<button class="btn btn-primary" style="flex:1"' + aksi('ke', 'rate') + '>' + esc(tx('Visit done · rate')) + '</button></div>';
    return h + '</div>';
  };
})(ExoApp);
