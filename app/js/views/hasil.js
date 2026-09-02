/* ==========================================================================
   views/hasil.js — bagi hasil
   Mitra : halaman Pendapatan (estimasi berjalan, rincian, riwayat slip)
   Admin : halaman Bagi Hasil Mitra (periode, pencairan, skema)
   --------------------------------------------------------------------------
   Prinsip tampilannya: mitra harus bisa MENELUSURI setiap rupiah sampai ke
   order asalnya. Karena itu setiap baris dapat dibuka rinciannya — nilai
   order, porsi, pembagian tim, tunjangan, dan bonus mutu.
   ========================================================================== */
var ViewHasil = (function () {

  var T = function (s) { return I18N.t(s); };

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ RINCIAN SATU ORDER */
  function barisRinci(b) {
    return '<div class="bh-row" data-act="rinci-order" data-id="' + b.orderId + '">' +
      '<div style="min-width:0;flex:1">' +
        '<b>' + U.esc(U.potong(b.judul, 44)) + '</b>' +
        '<div class="bh-sub">' + U.tgl(b.tgl) + ' • ' + U.esc(b.no) + ' • ' + U.esc(b.klien) + '</div>' +
        '<div class="bh-tag">' +
          '<span>' + b.porsiPersen + T('% dari') + ' ' + U.rpShort(b.nilaiOrder) + '</span>' +
          '<span>' + (b.leader ? 'leader' : 'anggota') + ' • tim ' + b.anggotaTim + '</span>' +
          (b.bonus ? '<span class="bh-bonus">bonus mutu ' + b.rataQc + '★</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="bh-nom"><b>' + U.rp(b.total) + '</b><small>' + T('lihat rincian ›') + '</small></div>' +
      '</div>';
  }

  function dialogRinciOrder(orderId, mitraId) {
    var b = BAGI.hitungOrder(orderId, mitraId);
    if (!b) { UI.toast(T('Rincian tidak tersedia'), 'err'); return; }
    var c = BAGI.config();

    function baris(label, nilai, ket, tebal) {
      return '<div class="row" style="padding:7px 0' + (tebal ? ';border-top:1px solid var(--line)' : '') + '">' +
        '<div style="min-width:0"><span style="font-size:12.8px' + (tebal ? ';font-weight:700' : '') + '">' +
        label + '</span>' + (ket ? '<div class="tbl-sub">' + ket + '</div>' : '') + '</div>' +
        '<div class="spacer"></div><b style="font-size:' + (tebal ? '15px' : '13px') +
        (tebal ? ';color:var(--brand-dark)' : '') + '">' + nilai + '</b></div>';
    }

    UI.modal({
      title: 'Rincian bagi hasil', sub: b.no + ' • ' + U.tgl(b.tgl), size: 'narrow',
      body:
        '<div class="alert alert--brand"><span class="ic">🧮</span><div>' +
          '<b>' + U.esc(U.potong(b.judul, 60)) + '</b><br>' +
          'Klien ' + U.esc(b.klien) + ' ' + T('• durasi jadwal') + ' ' + b.jam + ' ' + T('jam') + '</div></div>' +
        '<div class="mt-3">' +
          baris(T('Nilai pekerjaan'), U.rp(b.nilaiOrder), T('yang ditagihkan ke klien')) +
          baris(T('Porsi mitra') + ' ' + b.porsiPersen + '%', U.rp(b.dasar),
            T('sesuai jenis layanan pada pekerjaan ini')) +
          baris(T('Bagian Anda'), U.rp(b.porsiSaya),
            b.anggotaTim > 1
              ? 'dibagi ' + b.anggotaTim + ' ' + T('orang, bobot Anda') + ' ' + b.bobot + ' ' + T('dari total') + ' ' +
                Math.round(b.totalBobot * 100) / 100 + (b.leader ? ' (leader)' : '')
              : 'dikerjakan sendiri') +
          baris('Tunjangan transport', U.rp(b.transport), T('per pekerjaan')) +
          (b.makan ? baris('Tunjangan makan', U.rp(b.makan),
            'durasi ≥ ' + c.makanMinJam + ' jam') : '') +
          baris('Bonus mutu', b.bonus ? U.rp(b.bonus) : '—',
            b.rataQc === null ? T('belum ada nilai QC')
              : b.dapatBonus ? 'nilai QC ' + b.rataQc + ' ≥ ' + c.bonusMutuAmbang + ' → +' + c.bonusMutuPersen + '%'
              : 'nilai QC ' + b.rataQc + ' < ' + c.bonusMutuAmbang + T(', belum memenuhi')) +
          baris(T('Total diterima'), U.rp(b.total), null, true) +
        '</div>' +
        UI.alert('info', T('Angka ini terhitung karena pekerjaan sudah') + ' <b>lulus verifikasi mutu</b>. ' +
          T('Pekerjaan yang belum diverifikasi belum masuk hitungan.'), 'ℹ️'),
      foot: '<button class="btn btn--ghost" data-act="buka-order" data-id="' + orderId + '">' + T('Lihat order') + '</button>' +
        '<button class="btn" data-close>' + T('Tutup') + '</button>',
      actions: { 'buka-order': function (el) { tutup(el); Panel.detailOrder(orderId); } }
    });
  }

  /* ================================================================ SLIP PENCAIRAN */
  function dokumenSlip(x) {
    var u = BIZ.user(x.mitraId);
    return '<div class="inv-doc">' +
      '<div class="inv-doc__head">' +
        '<div><img src="assets/logo-full.png" alt="EXOCLEAN">' +
        '<div class="tbl-sub mt-1">PT EXOCLEAN Indonesia<br>0812-3456-7001 • exoclean.id</div></div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:18px;font-weight:800;letter-spacing:-.02em">SLIP BAGI HASIL</div>' +
          '<div class="code mt-1">' + U.esc(x.no) + '</div>' +
          '<div class="tbl-sub">' + T('Periode') + ' ' + U.esc(x.periodeLabel) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row" style="align-items:flex-start"><div>' +
        '<div class="tbl-sub">' + T('Mitra') + '</div><b>' + U.esc(u ? u.nama : '—') + '</b>' +
        '<div class="tbl-sub">' + U.esc(u ? u.jabatan || 'Tenaga Kerja Lapangan' : '') + '</div>' +
      '</div><div class="spacer"></div><div style="text-align:right">' +
        '<div class="tbl-sub">' + T('Status') + '</div>' + BAGI.chipStatus(x.status) +
        '<div class="tbl-sub mt-1">Rencana transfer ' + U.tgl(x.jatuhBayar) + '</div>' +
      '</div></div>' +

      '<table class="mt-3"><thead><tr><th>' + T('Pekerjaan') + '</th>' +
      '<th style="width:110px;text-align:right">Nilai order</th>' +
      '<th style="width:80px;text-align:right">Porsi</th>' +
      '<th style="width:120px;text-align:right">' + T('Diterima') + '</th></tr></thead><tbody>' +
      (x.baris || []).map(function (b) {
        return '<tr><td>' + U.esc(U.potong(b.judul, 46)) +
          '<div class="tbl-sub">' + U.tgl(b.tgl) + ' • ' + U.esc(b.no) +
          (b.bonus ? ' • bonus mutu' : '') + '</div></td>' +
          '<td style="text-align:right">' + U.rp(b.nilaiOrder) + '</td>' +
          '<td style="text-align:right">' + b.porsiPersen + '%</td>' +
          '<td style="text-align:right"><b>' + U.rp(b.total) + '</b></td></tr>';
      }).join('') + '</tbody>' +
      '<tfoot>' +
        '<tr class="tot-row"><td colspan="3" style="text-align:right">' + T('Porsi pekerjaan') + '</td>' +
          '<td style="text-align:right">' + U.rp(x.porsi) + '</td></tr>' +
        '<tr class="tot-row"><td colspan="3" style="text-align:right">Tunjangan transport &amp; makan</td>' +
          '<td style="text-align:right">' + U.rp(x.tunjangan) + '</td></tr>' +
        '<tr class="tot-row"><td colspan="3" style="text-align:right">Bonus mutu</td>' +
          '<td style="text-align:right">' + U.rp(x.bonus) + '</td></tr>' +
        (x.penyesuaian || []).map(function (a) {
          return '<tr class="tot-row"><td colspan="3" style="text-align:right">' + U.esc(a.keterangan) + '</td>' +
            '<td style="text-align:right;color:' + (a.jumlah < 0 ? 'var(--danger)' : 'inherit') + '">' +
            (a.jumlah < 0 ? '-' : '') + U.rp(Math.abs(a.jumlah)) + '</td></tr>';
        }).join('') +
        '<tr class="tot-row grand"><td colspan="3" style="text-align:right">' + T('TOTAL DITERIMA') + '</td>' +
          '<td style="text-align:right">' + U.rp(x.total) + '</td></tr>' +
      '</tfoot></table>' +

      (x.rekening ? '<div class="alert alert--brand mt-3"><span class="ic">🏦</span><div><b>' + T('Rekening tujuan') + '</b><br>' +
        U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) + ' a.n. ' + U.esc(x.rekening.atasNama) +
        (x.refTransfer ? '<br>Ref. transfer: <b>' + U.esc(x.refTransfer) + '</b>' : '') + '</div></div>'
        : UI.alert('warn', T('Rekening tujuan belum diisi pada profil mitra.'), '⚠️')) +

      '<div class="tbl-sub mt-3">Skema saat slip diterbitkan: porsi layanan sesuai katalog, bobot leader ' +
      x.skema.bobotLeader + '×, transport ' + U.rp(x.skema.transportPerOrder) + '/pekerjaan, makan ' +
      U.rp(x.skema.makanPerOrder) + ' ' + T('bila durasi ≥') + ' ' + x.skema.makanMinJam + ' jam, bonus mutu ' +
      x.skema.bonusMutuPersen + T('% bila nilai QC ≥') + ' ' + x.skema.bonusMutuAmbang + '. ' +
      T('Angka pada slip ini dibekukan dan tidak berubah bila skema diperbarui kemudian.') + '</div>' +
      '</div>';
  }

  function lihatSlip(payoutId, opt) {
    opt = opt || {};
    var x = DB.find('payouts', payoutId);
    UI.modal({
      title: T('Slip') + ' ' + x.no, sub: x.periodeLabel, size: 'wide', body: dokumenSlip(x),
      foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ Cetak</button>' +
        (opt.foot || '') + '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: opt.actions || {}
    });
  }

  /* ================================================================ MITRA: PENDAPATAN */
  var periodeLihat = null;

  function renderPendapatan() {
    var u = APP.user;
    var per = periodeLihat ? BAGI.periodeDariKode(periodeLihat) : BAGI.periodeSekarang();
    var e = BAGI.estimasi(u.id, per);
    var slipPeriode = BAGI.payoutAda(u.id, per.kode);
    var semuaSlip = BAGI.payoutMitra(u.id);
    var c = BAGI.config();
    var bulanIni = BAGI.estimasi(u.id, { dari: U.iso(new Date()).slice(0, 8) + '01', sampai: U.today() });

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: 'Periode berjalan', small: true, valueHTML: U.rp(e.total), icon: '💰',
        meta: per.label + ' • ' + e.jumlahOrder + ' pekerjaan' }) +
      UI.stat({ label: T('Bulan ini'), small: true, valueHTML: U.rp(bulanIni.total), icon: '📅',
        meta: bulanIni.jumlahOrder + ' ' + T('pekerjaan lulus QC') }) +
      UI.stat({ label: 'Menunggu transfer', small: true, valueHTML: U.rp(BAGI.menungguBayar(u.id)), icon: '⏳',
        meta: semuaSlip.filter(function (x) { return x.status === 'disetujui'; }).length + ' slip disetujui' }) +
      UI.stat({ label: T('Total diterima'), small: true, valueHTML: U.rp(BAGI.totalDibayar(u.id)), icon: '✅',
        meta: semuaSlip.filter(function (x) { return x.status === 'dibayar'; }).length + ' slip dibayar' }) +
    '</div>' +

    (slipPeriode
      ? UI.alert('ok', T('Periode ini sudah dibuatkan slip') + ' <b>' + U.esc(slipPeriode.no) + '</b> — ' +
          BAGI.STATUS[slipPeriode.status].t.toLowerCase() + '. ' +
          '<a href="#" data-act="slip" data-id="' + slipPeriode.id + '">' + T('Lihat slip →') + '</a>', '🧾')
      : UI.alert('info', 'Angka periode berjalan masih <b>estimasi</b> ' + T('dan bertambah setiap pekerjaan Anda') + ' ' +
          T('lulus verifikasi mutu. Slip resmi terbit setelah periode ditutup pada') + ' ' +
          U.tglPanjang(per.sampai) + ', rencana transfer ' + U.tglPanjang(per.jatuhBayar) + '.', '📌')) +
    '<div class="mb-3"></div>' +

    '<div class="row wrap mb-2" style="gap:8px">' +
      '<select class="select" style="width:auto" data-change="ganti-periode">' +
        BAGI.daftarPeriode(8).map(function (p) {
          return '<option value="' + p.kode + '"' + (p.kode === per.kode ? ' selected' : '') + '>' +
            U.esc(p.label) + (p.kode === BAGI.periodeSekarang().kode ? ' — berjalan' : '') + '</option>';
        }).join('') +
      '</select>' +
    '</div>' +

    UI.card({ cls: 'mb-3', title: T('Rincian per pekerjaan'), sub: per.label, flush: true,
      body: e.baris.length
        ? '<div style="padding:6px 0">' + e.baris.map(barisRinci).join('') + '</div>' +
          '<div class="bh-total">' +
            '<div class="row"><span>' + T('Porsi pekerjaan') + '</span><div class="spacer"></div><b>' + U.rp(e.porsi) + '</b></div>' +
            '<div class="row"><span>Tunjangan transport &amp; makan</span><div class="spacer"></div><b>' +
              U.rp(e.tunjangan) + '</b></div>' +
            '<div class="row"><span>Bonus mutu</span><div class="spacer"></div><b>' + U.rp(e.bonus) + '</b></div>' +
            '<div class="row bh-grand"><span>' + T('Total periode ini') + '</span><div class="spacer"></div><b>' +
              U.rp(e.total) + '</b></div>' +
          '</div>'
        : UI.empty('📭', T('Belum ada pekerjaan pada periode ini'),
            T('Pekerjaan masuk hitungan setelah supervisor menyatakan lulus verifikasi mutu.')) }) +

    '<div class="grid g-2-1">' +
      UI.card({ title: 'Riwayat pencairan', flush: true,
        body: semuaSlip.length ? '<div class="mini-list">' + semuaSlip.map(function (x) {
          return '<div class="mini-item" data-act="slip" data-id="' + x.id + '" style="cursor:pointer">' +
            '<div class="prd__mini">🧾</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(x.no) + '</b>' +
            '<small>' + U.esc(x.periodeLabel) + ' • ' + (x.baris || []).length + ' pekerjaan' +
            (x.dibayarAt ? ' • ditransfer ' + U.tgl(x.dibayarAt) : '') + '</small></div>' +
            '<div class="right"><b>' + U.rp(x.total) + '</b><div class="mt-1">' +
            BAGI.chipStatus(x.status) + '</div></div></div>';
        }).join('') + '</div>'
          : UI.empty('🧾', T('Belum ada pencairan'), 'Slip pertama terbit setelah periode berjalan ditutup.') }) +

      UI.card({ title: 'Skema bagi hasil', sub: T('Berlaku untuk seluruh mitra'),
        body: '<dl class="kv" style="grid-template-columns:1fr auto">' +
          '<dt>' + T('Porsi mitra') + '</dt><dd>' + c.porsiDefault + '% (berbeda per layanan)</dd>' +
          '<dt>Bobot leader</dt><dd>' + c.bobotLeader + '×</dd>' +
          '<dt>Transport</dt><dd>' + U.rp(c.transportPerOrder) + ' / pekerjaan</dd>' +
          '<dt>Makan</dt><dd>' + U.rp(c.makanPerOrder) + ' ' + T('bila ≥') + ' ' + c.makanMinJam + ' ' + T('jam') + '</dd>' +
          '<dt>Bonus mutu</dt><dd>+' + c.bonusMutuPersen + T('% bila QC ≥') + ' ' + c.bonusMutuAmbang + '</dd>' +
          '<dt>Pencairan</dt><dd>2× sebulan</dd>' +
        '</dl>' +
        '<div class="tbl-sub mt-2">' + T('Porsi berbeda per jenis layanan: pekerjaan berisiko tinggi seperti') + ' ' +
        T('rope access porsinya lebih besar, layanan padat mesin dan chemical lebih kecil karena biayanya') + ' ' +
        'ditanggung perusahaan.</div>' +
        (BIZ.rekeningUtama(APP.user)
          ? '<div class="alert alert--ok mt-3"><span class="ic">🏦</span><div>' + T('Transfer ke') + ' <b>' +
            U.esc(BIZ.rekeningUtama(APP.user).bank) + ' ' + U.esc(BIZ.rekeningUtama(APP.user).nomor) +
            '</b></div></div>'
          : '<div class="alert alert--danger mt-3"><span class="ic">⚠️</span><div>' +
            '<b>' + T('Rekening belum diisi.') + '</b> ' + T('Tambahkan di menu Profil → Rekening Bank agar pencairan bisa ditransfer.') +
            '</div></div>') }) +
    '</div>';
  }

  function aksiMitra(root) {
    U.delegate(root, {
      'ganti-periode': function (el) { periodeLihat = el.value; APP.refresh(); },
      'rinci-order': function (el) { dialogRinciOrder(el.getAttribute('data-id'), APP.user.id); },
      slip: function (el) { lihatSlip(el.getAttribute('data-id')); }
    });
  }

  /* ================================================================ ADMIN: BAGI HASIL */
  var tabAdmin = 'periode';
  var periodeAdmin = null;

  function renderAdmin() {
    var st = BAGI.statistik();
    var per = periodeAdmin ? BAGI.periodeDariKode(periodeAdmin) : BAGI.periodeSekarang();

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: 'Estimasi periode berjalan', small: true, valueHTML: U.rpShort(st.estimasiPeriode),
        icon: '💰', meta: st.periode.label + ' • ' + st.mitraBerpendapatan + ' mitra' }) +
      UI.stat({ label: T('Menunggu ditarik mitra'), small: true, valueHTML: U.rpShort(st.perluDibayar), icon: '⏳',
        meta: st.disetujui.length + ' ' + T('slip sudah jadi saldo') }) +
      UI.stat({ label: T('Total dibayar'), small: true, valueHTML: U.rpShort(st.totalDibayarSemua), icon: '✅',
        meta: T('seluruh periode') }) +
      UI.stat({ label: T('Margin bulan ini'), small: true, valueHTML: U.rpShort(st.marginBulanIni.margin),
        icon: '📈', meta: st.marginBulanIni.marginPersen + T('% dari') + ' ' + U.rpShort(st.marginBulanIni.bruto) }) +
    '</div>' +

    UI.tabs([
      { key: 'periode', label: 'Periode & Estimasi' },
      { key: 'slip', label: 'Pencairan', n: st.draf.length + st.disetujui.length },
      { key: 'skema', label: 'Skema Bagi Hasil' }
    ], tabAdmin, 'tab-bh') +

    (tabAdmin === 'slip' ? tabSlip() : tabAdmin === 'skema' ? tabSkema() : tabPeriode(per));
  }

  function tabPeriode(per) {
    var rows = BIZ.mitraAktif().map(function (u) {
      var e = BAGI.estimasi(u.id, per);
      return { user: u, est: e, slip: BAGI.payoutAda(u.id, per.kode) };
    }).filter(function (r) { return r.est.total > 0 || r.slip; });

    var belumSlip = rows.filter(function (r) { return !r.slip; });
    var totalEst = U.sum(rows, function (r) { return r.est.total; });

    return '<div class="row wrap mb-3" style="gap:8px">' +
      '<select class="select" style="width:auto" data-change="periode-admin">' +
        BAGI.daftarPeriode(8).map(function (p) {
          return '<option value="' + p.kode + '"' + (p.kode === per.kode ? ' selected' : '') + '>' +
            U.esc(p.label) + (p.kode === BAGI.periodeSekarang().kode ? ' — berjalan' : '') + '</option>';
        }).join('') + '</select>' +
      '<div class="spacer"></div>' +
      (belumSlip.length
        ? '<button class="btn" data-act="buat-massal">🧾 Buat ' + belumSlip.length + ' slip pencairan</button>'
        : '<span class="chip chip--ok">' + T('Semua mitra sudah dibuatkan slip') + '</span>') +
    '</div>' +

    (per.kode === BAGI.periodeSekarang().kode
      ? UI.alert('warn', T('Periode ini') + ' <b>masih berjalan</b> sampai ' + U.tglPanjang(per.sampai) +
          '. Membuat slip sekarang akan membekukan angka yang ada saat ini — pekerjaan yang lulus QC ' +
          T('setelahnya tidak ikut masuk dan harus dibayar pada periode berikutnya.'), '⏳') + '<div class="mb-3"></div>'
      : '') +

    UI.card({ flush: true, body: UI.table([
      { h: T('Mitra'), r: function (r) { return '<div class="row">' + UI.avatar(r.user.nama, 'sm') +
        '<div><div class="tbl-title">' + U.esc(r.user.nama) + '</div>' +
        '<div class="tbl-sub">' + U.esc(r.user.jabatan || '') + '</div></div></div>'; } },
      { h: T('Pekerjaan'), cls: 'num', r: function (r) { return r.est.jumlahOrder; } },
      { h: 'Nilai dikerjakan', cls: 'num', r: function (r) { return U.rpShort(r.est.nilaiPekerjaan); } },
      { h: 'Porsi', cls: 'num', r: function (r) { return U.rp(r.est.porsi); } },
      { h: T('Tunjangan'), cls: 'num', r: function (r) { return U.rp(r.est.tunjangan); } },
      { h: 'Bonus', cls: 'num', r: function (r) { return r.est.bonus ? U.rp(r.est.bonus) : '—'; } },
      { h: T('Total'), cls: 'num', r: function (r) { return '<b>' + U.rp(r.slip ? r.slip.total : r.est.total) + '</b>'; } },
      { h: T('Slip'), r: function (r) { return r.slip ? BAGI.chipStatus(r.slip.status)
        : '<span class="tbl-sub">' + T('belum dibuat') + '</span>'; } },
      { h: '', cls: 'act', r: function (r) {
        return r.slip
          ? '<button class="btn btn--ghost btn--sm" data-act="slip-admin" data-id="' + r.slip.id + '">' + T('Slip') + '</button>'
          : '<button class="btn btn--sm" data-act="buat-satu" data-id="' + r.user.id + '">Buat slip</button>'; } }
    ], rows, { icon: '💰', judul: T('Belum ada pendapatan pada periode ini'),
      teks: T('Pekerjaan masuk hitungan setelah lulus verifikasi mutu.') }),
      foot: rows.length ? '<div class="spacer"></div><span class="tbl-sub">' + T('Total estimasi periode ini') + '</span>' +
        '<b style="font-size:16px;color:var(--brand-dark)">' + U.rp(totalEst) + '</b>' : '' });
  }

  var fSlip = 'aktif';
  function tabSlip() {
    var all = U.sortBy(DB.all('payouts'), function (x) { return x.periodeKode + x.no; }, true);
    var grup = {
      aktif: all.filter(function (x) { return ['draf', 'disetujui'].indexOf(x.status) >= 0; }),
      dibayar: all.filter(function (x) { return x.status === 'dibayar'; }),
      semua: all
    };
    var list = grup[fSlip] || all;

    return UI.tabs([
      { key: 'aktif', label: T('Perlu diproses'), n: grup.aktif.length },
      { key: 'dibayar', label: 'Arsip lama (transfer langsung)', n: grup.dibayar.length },
      { key: 'semua', label: T('Semua'), n: all.length }
    ], fSlip, 'tab-slip') +

    UI.card({ flush: true, body: UI.table([
      { h: 'No. Slip', r: function (x) { return '<div class="code">' + U.esc(x.no) + '</div>' +
        '<div class="tbl-sub">' + U.esc(x.periodeLabel) + '</div>'; } },
      { h: T('Mitra'), r: function (x) { return '<div class="tbl-title">' + U.esc(BIZ.nama(x.mitraId)) + '</div>' +
        '<div class="tbl-sub">' + (x.baris || []).length + ' pekerjaan</div>'; } },
      { h: T('Rekening'), r: function (x) { return x.rekening
        ? '<div style="font-size:12.4px">' + U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) + '</div>' +
          '<div class="tbl-sub">' + U.esc(x.rekening.atasNama) + '</div>'
        : '<span class="chip chip--danger" style="font-size:10px">' + T('belum diisi') + '</span>'; } },
      { h: T('Total'), cls: 'num', r: function (x) { return '<b>' + U.rp(x.total) + '</b>' +
        (x.totalPenyesuaian ? '<div class="tbl-sub">termasuk penyesuaian</div>' : ''); } },
      { h: 'Rencana transfer', r: function (x) { return U.tgl(x.jatuhBayar) +
        '<div class="tbl-sub">' + U.relatif(x.jatuhBayar) + '</div>'; } },
      { h: T('Status'), r: function (x) { return BAGI.chipStatus(x.status); } },
      { h: '', cls: 'act', r: function (x) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="slip-admin" data-id="' + x.id + '">' + T('Lihat') + '</button>';
        if (x.status === 'draf') b += ' <button class="btn btn--sm" data-act="setujui" data-id="' + x.id + '">' + T('Setujui') + '</button>';
        if (x.status === 'disetujui') b += ' <span class="chip chip--ok chip--xs">' + T('masuk saldo mitra') + '</span>';
        return b; } }
    ], list, { icon: '🧾', judul: T('Belum ada slip pencairan') }) });
  }

  function tabSkema() {
    var c = BAGI.config();
    var layanan = U.sortBy(DB.all('services').filter(function (s) { return s.tipe === 'layanan'; }),
      function (s) { return s.urutan; });

    return '<div class="grid g-2">' +
      UI.card({ title: 'Skema umum', sub: T('Berlaku untuk seluruh mitra'),
        body:
          UI.field({ name: 'porsiDefault', label: T('Porsi mitra bawaan (%)'), type: 'number', value: c.porsiDefault,
            hint: T('Dipakai bila layanan belum punya porsi sendiri.') }) +
          UI.field({ name: 'bobotLeader', label: 'Bobot leader', type: 'number', step: '0.05', value: c.bobotLeader,
            hint: T('Petugas pertama pada order dianggap leader. 1 = sama rata.') }) +
          '<div class="inline-2">' +
            UI.field({ name: 'transportPerOrder', label: 'Tunjangan transport (Rp)', type: 'number',
              value: c.transportPerOrder }) +
            UI.field({ name: 'makanPerOrder', label: 'Tunjangan makan (Rp)', type: 'number',
              value: c.makanPerOrder }) +
          '</div>' +
          '<div class="inline-3">' +
            UI.field({ name: 'makanMinJam', label: T('Makan bila ≥ (jam)'), type: 'number', value: c.makanMinJam }) +
            UI.field({ name: 'bonusMutuPersen', label: 'Bonus mutu (%)', type: 'number', value: c.bonusMutuPersen }) +
            UI.field({ name: 'bonusMutuAmbang', label: 'Ambang nilai QC', type: 'number', step: '0.1',
              value: c.bonusMutuAmbang }) +
          '</div>' +
          UI.field({ name: 'hariBayar', label: T('Transfer berapa hari setelah periode tutup'), type: 'number',
            value: c.hariBayar }) +
          UI.alert('warn', T('Perubahan hanya berlaku untuk perhitungan') + ' <b>' + T('ke depan') + '</b>. Slip yang sudah ' +
            T('terbit memakai skema yang tersimpan di dalamnya dan tidak ikut berubah.'), '⚠️'),
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-skema">' + T('Simpan Skema') + '</button>' }) +

      UI.card({ title: 'Porsi per layanan', sub: T('Persentase nilai order untuk tim mitra'), flush: true,
        body: '<div class="mini-list">' + layanan.map(function (s) {
          var p = typeof s.porsiMitra === 'number' ? s.porsiMitra : null;
          return '<div class="mini-item"><div class="prd__mini">' + s.icon + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(s.nama) + '</b>' +
            '<small>' + U.esc(s.kategori) + '</small></div>' +
            '<div class="right"><input class="input" type="number" style="width:78px;text-align:right" ' +
            'value="' + (p === null ? c.porsiDefault : p) + '" data-change="porsi-svc" data-id="' + s.id + '">' +
            '<small>' + (p === null ? 'bawaan' : 'khusus') + '</small></div></div>';
        }).join('') + '</div>' }) +
    '</div>';
  }

  function aksiAdmin(root) {
    U.delegate(root, AKSES.lindungi({
      'tab-bh': function (el) { tabAdmin = el.getAttribute('data-key'); APP.refresh(); },
      'tab-slip': function (el) { fSlip = el.getAttribute('data-key'); APP.refresh(); },
      'periode-admin': function (el) { periodeAdmin = el.value; APP.refresh(); },
      'rinci-order': function (el) { dialogRinciOrder(el.getAttribute('data-id'), APP.user.id); },

      'buat-satu': function (el) {
        var per = periodeAdmin ? BAGI.periodeDariKode(periodeAdmin) : BAGI.periodeSekarang();
        var p = BAGI.buatPayout(el.getAttribute('data-id'), per, APP.user.id);
        if (!p) { UI.toast(T('Tidak ada pekerjaan yang bisa dicairkan'), 'warn'); return; }
        UI.toast('Slip ' + p.no + ' dibuat sebagai draf', 'ok');
        APP.refresh();
      },
      'buat-massal': function () {
        var per = periodeAdmin ? BAGI.periodeDariKode(periodeAdmin) : BAGI.periodeSekarang();
        UI.konfirm({ title: 'Buat slip pencairan periode ' + per.label + '?',
          htmlText: T('Angka akan') + ' <b>dibekukan</b> ' + T('saat ini juga. Pekerjaan yang lulus QC setelah ini') + ' ' +
            T('akan masuk periode berikutnya.'), okText: 'Ya, buat slip' }).then(function (ya) {
          if (!ya) return;
          var hasil = BAGI.buatPayoutMassal(per, APP.user.id);
          UI.toast(hasil.length + ' slip dibuat sebagai draf', 'ok');
          tabAdmin = 'slip';
          APP.refresh();
        });
      },
      'slip-admin': function (el) {
        var id = el.getAttribute('data-id');
        var x = DB.find('payouts', id);
        lihatSlip(id, {
          foot: '<button class="btn btn--wa" data-act="wa-slip" data-id="' + id + '">' + T('💬 Kirim ke mitra') + '</button>' +
            '<button class="btn btn--ghost" data-act="adj" data-id="' + id + '">＋ Penyesuaian</button>' +
            (x.status === 'draf' ? '<button class="btn" data-act="ok-slip" data-id="' + id + '">' + T('Setujui') + '</button>' : '') +
            (x.status === 'disetujui' ? '<span class="chip chip--ok chip--dot">' + T('Dana sudah masuk saldo mitra') + '</span>' : ''),
          actions: {
            'wa-slip': function (e2) {
              var m = WA.enqueue('bagihasil_slip', x.mitraId, { payoutId: id }, { tipe: 'payout', id: id });
              tutup(e2); Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
            },
            adj: function (e2) { tutup(e2); dialogPenyesuaian(id); },
            'ok-slip': function (e2) { tutup(e2); setujuiSlip(id); },
            'bayar-slip': function (e2) { tutup(e2); dialogBayar(id); }
          }
        });
      },
      setujui: function (el) { setujuiSlip(el.getAttribute('data-id')); },
      bayar: function (el) { dialogBayar(el.getAttribute('data-id')); },

      'simpan-skema': function (el) {
        var f = U.readForm(el.closest('.card'));
        BAGI.simpanConfig({
          porsiDefault: Number(f.porsiDefault) || 40, bobotLeader: Number(f.bobotLeader) || 1,
          transportPerOrder: Number(f.transportPerOrder) || 0, makanPerOrder: Number(f.makanPerOrder) || 0,
          makanMinJam: Number(f.makanMinJam) || 6, bonusMutuPersen: Number(f.bonusMutuPersen) || 0,
          bonusMutuAmbang: Number(f.bonusMutuAmbang) || 4.5, hariBayar: Number(f.hariBayar) || 5
        });
        UI.toast('Skema bagi hasil disimpan', 'ok');
        APP.refresh();
      },
      'porsi-svc': function (el) {
        var n = Math.max(0, Math.min(100, Number(el.value) || 0));
        DB.update('services', el.getAttribute('data-id'), { porsiMitra: n });
        el.value = n;
        UI.toast('Porsi layanan diperbarui', 'ok');
      }
    }, {
      'buat-satu': 'keuangan.bagihasil.setujui',
      'buat-massal': 'keuangan.bagihasil.setujui',
      setujui: 'keuangan.bagihasil.setujui',
      bayar: 'keuangan.bagihasil.setujui',
      'simpan-skema': 'keuangan.bagihasil.setujui',
      'porsi-svc': 'keuangan.bagihasil.setujui'
    }));
  }

  function setujuiSlip(id) {
    var x = DB.find('payouts', id);
    if (!x.rekening) {
      UI.toast(T('Mitra belum mengisi rekening — minta dilengkapi dulu di profilnya'), 'err');
      return;
    }
    UI.konfirm({ title: 'Setujui slip ' + x.no + '?',
      htmlText: T('Total') + ' <b>' + U.rp(x.total) + '</b> ' + T('untuk') + ' ' + U.esc(BIZ.nama(x.mitraId)) +
        '. Slip akan dikirim ke mitra dan menunggu transfer.', okText: 'Ya, setujui' })
      .then(function (ya) {
        if (!ya) return;
        BAGI.setujui(id, APP.user.id);
        UI.toast(T('Slip disetujui — dana masuk saldo dompet mitra'), 'ok');
        APP.refresh();
      });
  }

  function dialogBayar(id) {
    var x = DB.find('payouts', id);
    UI.formModal({
      title: T('Tandai sudah ditransfer'), sub: x.no + ' • ' + U.rp(x.total) + ' → ' + BIZ.nama(x.mitraId),
      okText: T('Simpan'),
      intro: (x.rekening ? UI.alert('brand', 'Tujuan: <b>' + U.esc(x.rekening.bank) + ' ' +
        U.esc(x.rekening.nomor) + '</b> a.n. ' + U.esc(x.rekening.atasNama), '🏦') : '') + '<div class="mb-3"></div>',
      fields: [{ name: 'ref', label: T('No. referensi transfer'), required: true,
        placeholder: 'mis. TRF/BGH/52014' }]
    }).then(function (d) {
      if (!d) return;
      BAGI.tandaiDibayar(id, d.ref, APP.user.id);
      UI.toast(T('Ditandai sudah dibayar & konfirmasi disiapkan'), 'ok');
      APP.refresh();
    });
  }

  function dialogPenyesuaian(id) {
    UI.formModal({
      title: T('Tambah penyesuaian'), sub: 'Nilai positif menambah, negatif mengurangi', okText: T('Simpan'),
      fields: [
        { name: 'keterangan', label: T('Keterangan'), required: true,
          placeholder: 'mis. Ganti biaya transportasi luar kota / Penggantian squeegee hilang' },
        { name: 'jumlah', label: T('Jumlah (Rp) — pakai tanda minus untuk potongan'), type: 'number',
          value: 0, required: true }
      ],
      validate: function (d) { return Number(d.jumlah) === 0 ? T('Jumlah tidak boleh nol') : null; }
    }).then(function (d) {
      if (!d) return;
      BAGI.tambahPenyesuaian(id, d.keterangan, Number(d.jumlah), APP.user.id);
      UI.toast('Penyesuaian ditambahkan', 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ PAGES */
  var pageMitra = { label: 'Pendapatan', icon: '💰', grup: 'Utama',
    sub: 'Bagi hasil per pekerjaan & riwayat pencairan',
    render: renderPendapatan, mount: aksiMitra,
    badge: function () {
      return DB.where('payouts', function (x) {
        return x.mitraId === APP.user.id && x.status === 'disetujui'; }).length; } };

  var pagesAdmin = {
    bagihasil: { label: 'Bagi Hasil Mitra', icon: '💰', grup: 'Keuangan',
      sub: 'Estimasi periode, pencairan, dan skema', render: renderAdmin, mount: aksiAdmin,
      badge: function () { return DB.where('payouts', { status: 'draf' }).length; } }
  };

  return { pageMitra: pageMitra, pagesAdmin: pagesAdmin, lihatSlip: lihatSlip,
    dialogRinciOrder: dialogRinciOrder, dokumenSlip: dokumenSlip };
})();
