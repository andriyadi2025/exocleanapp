/* ==========================================================================
   views/supervisor.js — tampilan untuk SUPERVISOR LAPANGAN
   Jadwal tim • penugasan • monitoring absensi/foto • verifikasi mutu (QC)
   ========================================================================== */
var ViewSupervisor = (function () {

  function me() { return APP.user; }
  function timSaya() { return DB.where('teams', { supervisorId: me().id }); }
  function anggota() {
    var ids = [];
    timSaya().forEach(function (t) { t.memberIds.forEach(function (m) { if (ids.indexOf(m) < 0) ids.push(m); }); });
    return ids.map(BIZ.user).filter(Boolean);
  }
  function orderSaya() { return BIZ.ordersUntuk(me()); }

  /* ================================================================ BERANDA */
  function renderBeranda() {
    var all = orderSaya();
    var hariIni = U.sortBy(all.filter(function (o) { return o.tgl === U.today() && o.status !== 'dibatalkan'; }),
      function (o) { return o.mulai; });
    var perluQC = all.filter(function (o) { return o.status === 'selesai'; });
    var berjalan = all.filter(function (o) { return o.status === 'berjalan'; });
    var minggu = all.filter(function (o) {
      var d = U.diffDays(o.tgl, new Date()); return d >= 0 && d < 7 && o.status !== 'dibatalkan'; });

    var belumAbsen = [];
    hariIni.forEach(function (o) {
      (o.workerIds || []).forEach(function (w) {
        if (BIZ.statusAbsen(o.id, w) === 'belum') belumAbsen.push({ o: o, w: w });
      });
    });

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Tugas hari ini'), value: hariIni.length, icon: '📅',
        meta: berjalan.length + ' sedang berjalan' }) +
      UI.stat({ label: I18N.t('Menunggu verifikasi'), value: perluQC.length, icon: '🔍',
        meta: perluQC.length ? I18N.t('perlu Anda nilai') : I18N.t('semua terverifikasi') }) +
      UI.stat({ label: I18N.t('Petugas di bawah Anda'), value: anggota().length, icon: '👷',
        meta: timSaya().map(function (t) { return t.nama; }).join(', ') || '—' }) +
      UI.stat({ label: I18N.t('Jadwal 7 hari ke depan'), value: minggu.length, icon: '🗓️', meta: I18N.t('termasuk hari ini') }) +
    '</div>' +

    (belumAbsen.length ? UI.alert('warn', '<b>' + belumAbsen.length + ' ' + I18N.t('petugas belum check-in') + '</b> ' + I18N.t('untuk tugas hari ini:') + ' ' +
      belumAbsen.slice(0, 4).map(function (x) { return U.esc(BIZ.nama(x.w)) + ' (' + x.o.mulai + ')'; }).join(', ') +
      '. <a href="#" data-act="ke-monitoring">Pantau lapangan →</a>', '⏰') + '<div class="mb-3"></div>' : '') +

    (perluQC.length ? UI.alert('brand', '<b>' + perluQC.length + ' ' + I18N.t('pekerjaan menunggu verifikasi mutu.') + '</b> ' +
      I18N.t('Invoice ke klien baru terbit setelah Anda menyatakan lulus QC.') + ' ' +
      '<a href="#" data-act="ke-verifikasi">Verifikasi sekarang →</a>', '🔍') + '<div class="mb-3"></div>' : '') +

    '<div class="grid g-2-1">' +
      UI.card({ title: I18N.t('Jadwal hari ini'), sub: U.tglPanjang(new Date()), flush: true,
        body: hariIni.length ? '<div style="padding:14px 18px">' + hariIni.map(kartuTugas).join('') + '</div>'
          : UI.empty('🌤️', I18N.t('Tidak ada tugas hari ini'), I18N.t('Nikmati harinya, atau cek jadwal minggu ini.')) }) +
      UI.card({ title: I18N.t('Beban petugas minggu ini'), flush: true,
        body: '<div class="mini-list">' + anggota().map(function (w) {
          var n = minggu.filter(function (o) { return (o.workerIds || []).indexOf(w.id) >= 0; }).length;
          var st = hariIni.filter(function (o) { return (o.workerIds || []).indexOf(w.id) >= 0; })
            .map(function (o) { return BIZ.statusAbsen(o.id, w.id); })[0];
          return '<div class="mini-item">' + UI.avatar(w.nama, 'sm') +
            '<div style="min-width:0;flex:1"><b>' + U.esc(w.nama) + '</b><small>' + U.esc(w.jabatan) + '</small></div>' +
            '<div class="right">' + (st === 'in' ? '<span class="chip chip--warn chip--dot">' + I18N.t('Di lokasi') + '</span>'
              : st === 'out' ? '<span class="chip chip--ok">' + I18N.t('Selesai') + '</span>'
              : '<span class="tbl-sub">' + n + ' ' + I18N.t('tugas') + '</span>') + '</div></div>';
        }).join('') + '</div>' }) +
    '</div>';
  }

  function kartuTugas(o) {
    var p = BIZ.progresChecklist(o);
    var hadir = (o.workerIds || []).filter(function (w) { return BIZ.statusAbsen(o.id, w) !== 'belum'; }).length;
    return '<div class="order-card"><div class="top"><div style="min-width:0;flex:1">' +
      '<div class="row" style="gap:8px"><b class="code">' + o.mulai + '–' + o.selesai + '</b>' +
        UI.statusChip('order', o.status) + '</div>' +
      '<h4 class="mt-1">' + U.esc(o.judul) + '</h4>' +
      '<div class="meta"><span>👤 ' + U.esc(BIZ.klien(o.clientId)) + '</span>' +
        '<span>📍 ' + U.esc(U.potong(o.alamat, 38)) + '</span>' +
        '<span>👥 ' + hadir + '/' + (o.workerIds || []).length + ' hadir</span></div>' +
      (p.total ? '<div class="mt-2">' + UI.progress(p.pct, p.pct === 100 ? 'ok' : '') +
        '<div class="tbl-sub mt-1">' + p.done + '/' + p.total + ' ' + I18N.t('langkah') + '</div></div>' : '') +
      '</div><div class="col" style="gap:6px">' +
      '<button class="btn btn--ghost btn--sm" data-act="detail" data-id="' + o.id + '">' + I18N.t('Detail') + '</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="tugaskan" data-id="' + o.id + '">Atur Tim</button>' +
      (o.status === 'selesai' ? '<button class="btn btn--sm" data-act="qc" data-id="' + o.id + '">' + I18N.t('Verifikasi') + '</button>' : '') +
      '</div></div></div>';
  }

  /* ================================================================ JADWAL TIM */
  var rentang = 'minggu';
  function renderJadwal() {
    var all = U.sortBy(orderSaya().filter(function (o) { return o.status !== 'dibatalkan'; }), function (o) { return o.tgl + o.mulai; });
    var batas = { minggu: 7, bulan: 31, semua: 9999 }[rentang];
    var list = all.filter(function (o) {
      var d = U.diffDays(o.tgl, new Date());
      return rentang === 'semua' ? true : d >= 0 && d < batas;
    });
    var perHari = U.groupBy(list, function (o) { return o.tgl; });

    return UI.tabs([
      { key: 'minggu', label: I18N.t('7 hari ke depan') }, { key: 'bulan', label: '30 hari' }, { key: 'semua', label: I18N.t('Semua') }
    ], rentang, 'tab-rentang') +
    (Object.keys(perHari).length ? Object.keys(perHari).sort().map(function (tgl) {
      return '<div class="nav-group" style="color:var(--muted);padding:16px 0 8px">' +
        U.tglPanjang(tgl) + ' <span class="chip chip--muted">' + U.relatif(tgl) + '</span></div>' +
        perHari[tgl].map(kartuTugas).join('');
    }).join('') : UI.empty('📅', I18N.t('Tidak ada jadwal'), I18N.t('Belum ada pekerjaan yang ditugaskan ke tim Anda pada rentang ini.')));
  }

  /* ================================================================ MONITORING */
  function renderMonitoring() {
    var hariIni = U.sortBy(orderSaya().filter(function (o) {
      return o.tgl === U.today() && o.status !== 'dibatalkan'; }), function (o) { return o.mulai; });

    if (!hariIni.length) return UI.empty('📡', I18N.t('Tidak ada aktivitas lapangan hari ini'),
      I18N.t('Halaman ini menampilkan absensi GPS dan foto yang masuk dari petugas secara langsung.'));

    return UI.alert('info', I18N.t('Data absensi dan foto muncul di sini segera setelah petugas mengunggahnya dari aplikasi lapangan.') + ' ' +
      I18N.t('Tekan tombol muat ulang untuk mengambil data terbaru.'), '📡') +
      '<div class="row mt-2 mb-3"><div class="spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="muat-ulang">' + I18N.t('↻ Muat ulang') + '</button></div>' +
      hariIni.map(function (o) {
        var reps = BIZ.laporan(o.id);
        var p = BIZ.progresChecklist(o);
        /* Zona lokasi kerjanya — supervisor bisa memegang order di kota lain. */
        return UI.card({ cls: 'mb-3', title: o.judul,
          sub: o.no + ' • ' + o.mulai + '–' + o.selesai +
            (window.ZONA ? ZONA.labelJam(ZONA.dariWilayah(o.wilayah)) : '') +
            ' • ' + BIZ.klien(o.clientId),
          tools: UI.statusChip('order', o.status) +
            ' <button class="btn btn--ghost btn--sm" data-act="detail" data-id="' + o.id + '">' + I18N.t('Detail') + '</button>',
          body: '<div class="grid g-2">' +
            '<div><div class="tbl-sub mb-1">' + I18N.t('Absensi petugas') + '</div>' + Panel.blokAbsensi(o) + '</div>' +
            '<div><div class="tbl-sub mb-1">Progres checklist (' + p.done + '/' + p.total + ')</div>' +
              UI.progress(p.pct, p.pct === 100 ? 'ok' : '') +
              '<div class="tbl-sub mt-2 mb-1">Foto masuk</div>' +
              (reps.length ? reps.map(function (r) {
                return '<div class="row mb-1" style="gap:6px;flex-wrap:wrap">' +
                  (r.before || []).concat(r.after || []).map(function (id) {
                    var src = DB.getPhoto(id);
                    return src ? '<img src="' + src + '" data-act="zoom" data-id="' + id +
                      '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;cursor:zoom-in;border:1px solid var(--line)">' : '';
                  }).join('') + '</div>' +
                  '<div class="tbl-sub">' + U.esc(BIZ.nama(r.workerId)) + ' • ' + U.jam(r.submittedAt) +
                  (r.catatan ? ' — ' + U.esc(U.potong(r.catatan, 70)) : '') + '</div>';
              }).join('') : '<div class="tbl-sub">' + I18N.t('Belum ada foto masuk.') + '</div>') +
            '</div></div>' });
      }).join('');
  }

  /* ================================================================ VERIFIKASI QC */
  var fQC = 'perlu';
  function renderVerifikasi() {
    var all = orderSaya();
    var grup = {
      perlu: all.filter(function (o) { return o.status === 'selesai'; }),
      perbaikan: all.filter(function (o) { return o.status === 'perbaikan'; }),
      selesai: U.sortBy(all.filter(function (o) { return o.status === 'diverifikasi'; }), function (o) { return o.tgl; }, true)
    };
    var list = grup[fQC] || [];

    return UI.tabs([
      { key: 'perlu', label: 'Perlu verifikasi', n: grup.perlu.length },
      { key: 'perbaikan', label: I18N.t('Perlu perbaikan'), n: grup.perbaikan.length },
      { key: 'selesai', label: I18N.t('Sudah diverifikasi'), n: grup.selesai.length }
    ], fQC, 'tab-qc') +
    (list.length ? list.map(function (o) {
      var reps = BIZ.laporan(o.id), qc = BIZ.qcOrder(o.id), p = BIZ.progresChecklist(o);
      return UI.card({ cls: 'mb-3',
        title: o.judul, sub: o.no + ' • ' + U.tglPanjang(o.tgl) + ' • ' + BIZ.klien(o.clientId),
        tools: UI.statusChip('order', o.status),
        body:
          '<div class="grid g-2">' +
            '<div>' +
              '<div class="tbl-sub mb-1">Checklist</div>' + UI.progress(p.pct, p.pct === 100 ? 'ok' : 'warn') +
              '<div class="tbl-sub mt-1">' + p.done + ' dari ' + p.total + ' langkah dikerjakan</div>' +
              '<div class="tbl-sub mt-3 mb-1">' + I18N.t('Kehadiran') + '</div>' + Panel.blokAbsensi(o) +
            '</div>' +
            '<div>' +
              '<div class="tbl-sub mb-1">' + I18N.t('Laporan lapangan') + '</div>' + Panel.blokLaporan(o) +
            '</div>' +
          '</div>' +
          (qc ? '<div class="mt-3">' + Panel.seksi('Hasil verifikasi', Panel.blokQC(o)) + '</div>' : ''),
        foot: '<button class="btn btn--ghost" data-act="detail" data-id="' + o.id + '">' + I18N.t('Lihat detail lengkap') + '</button>' +
          '<div class="spacer"></div>' +
          (o.status === 'selesai'
            ? '<button class="btn btn--ghost" data-act="qc-tolak" data-id="' + o.id + '">Minta Perbaikan</button>' +
              '<button class="btn" data-act="qc" data-id="' + o.id + '">✓ Verifikasi Mutu</button>'
            : o.status === 'perbaikan'
              ? '<button class="btn" data-act="qc" data-id="' + o.id + '">Verifikasi Ulang</button>'
              : '<span class="tbl-sub">Diverifikasi ' + (qc ? U.tglJam(qc.at) : '') + '</span>')
      });
    }).join('')
      : UI.empty('✅', I18N.t('Tidak ada yang perlu diverifikasi'),
        I18N.t('Pekerjaan akan muncul di sini setelah petugas lapangan menekan “Laporkan Selesai”.')));
  }

  function dialogQC(orderId) {
    var o = BIZ.order(orderId);
    var skor = { kebersihan: 5, kerapihan: 5, k3: 5, ketepatan: 5 };
    var kriteria = [
      { k: 'kebersihan', t: 'Kebersihan hasil', d: I18N.t('Tidak ada area terlewat, noda hilang') },
      { k: 'kerapihan', t: 'Kerapihan area', d: 'Perabot dikembalikan, alat dirapikan' },
      { k: 'k3', t: 'Penerapan K3', d: I18N.t('APD lengkap, rambu terpasang, prosedur aman') },
      { k: 'ketepatan', t: 'Ketepatan waktu', d: I18N.t('Datang & selesai sesuai jadwal') }
    ];

    function barisSkor() {
      return kriteria.map(function (c) {
        return '<div style="padding:9px 0;border-bottom:1px solid var(--line-2)">' +
          '<div class="row"><div><b style="font-size:13px">' + c.t + '</b>' +
          '<div class="tbl-sub">' + c.d + '</div></div><div class="spacer"></div>' +
          '<div data-grp="' + c.k + '">' + [1,2,3,4,5].map(function (i) {
            return '<button class="star-pick' + (i <= skor[c.k] ? ' on' : '') + '" style="font-size:22px" ' +
              'data-act="nilai" data-k="' + c.k + '" data-n="' + i + '">★</button>';
          }).join('') + '</div></div></div>';
      }).join('');
    }

    UI.modal({
      title: I18N.t('Verifikasi Mutu Pekerjaan'), sub: o.no + ' • ' + o.judul, size: 'wide',
      body: UI.alert('brand', 'Setelah dinyatakan <b>lulus</b>' + I18N.t(', sistem otomatis: menandai order selesai,') + ' ' +
          I18N.t('menyiapkan notifikasi WhatsApp ke klien, dan menerbitkan invoice.'), 'ℹ️') +
        '<div id="skorbox" class="mt-3">' + barisSkor() + '</div>' +
        '<div class="row mt-2"><b>' + I18N.t('Rata-rata') + '</b><div class="spacer"></div>' +
        '<b id="rata" style="font-size:17px;color:var(--brand-dark)">5.0 / 5</b></div>' +
        '<div class="field mt-3"><label>Catatan verifikasi</label>' +
        '<textarea class="textarea" id="qc-cat" rows="3" placeholder="Temuan di lapangan, hal yang perlu diperhatikan tim"></textarea></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn btn--danger" data-act="perbaikan">' + I18N.t('Perlu Perbaikan') + '</button>' +
        '<button class="btn" data-act="lulus">✓ Nyatakan Lulus</button>',
      actions: {
        nilai: function (el) {
          var k = el.getAttribute('data-k');
          skor[k] = Number(el.getAttribute('data-n'));
          U.$$('[data-grp="' + k + '"] .star-pick').forEach(function (b, i) { b.classList.toggle('on', i < skor[k]); });
          var r = (skor.kebersihan + skor.kerapihan + skor.k3 + skor.ketepatan) / 4;
          U.$('#rata').textContent = (Math.round(r * 10) / 10) + ' / 5';
        },
        lulus: function (el) {
          BIZ.verifikasiQC(orderId, me().id, skor, 'lulus', U.$('#qc-cat').value.trim());
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(I18N.t('Pekerjaan diverifikasi. Invoice & notifikasi klien disiapkan.'), 'ok');
          APP.refresh();
        },
        perbaikan: function (el) {
          var cat = U.$('#qc-cat').value.trim();
          if (cat.length < 8) { UI.toast(I18N.t('Isi catatan perbaikan agar tim tahu apa yang harus diulang'), 'err'); return; }
          BIZ.verifikasiQC(orderId, me().id, skor, 'perbaikan', cat);
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(I18N.t('Instruksi perbaikan dikirim ke tim'), 'warn');
          APP.refresh();
        }
      }
    });
  }

  /* ================================================================ TIM */
  function renderTim() {
    var list = anggota();
    var bulan = U.today().slice(0, 7);
    return '<div class="grid g-2 mb-3">' + timSaya().map(function (t) {
      return UI.card({ title: t.nama, sub: t.spesialisasi || '', flush: true,
        body: '<div class="mini-list">' + t.memberIds.map(function (id) {
          var w = BIZ.user(id);
          if (!w) return '';
          var kd = BIZ.kontakDaruratUtama(w);
          var st = BIZ.statusBerlakuId(BIZ.identitas(w));
          return '<div class="mini-item">' + UI.avatar(w.nama, 'sm') +
            '<div style="min-width:0;flex:1"><b>' + U.esc(w.nama) + '</b>' +
            '<small>' + U.esc(w.jabatan) + '</small>' +
            '<small>' + (kd
              ? '🆘 ' + U.esc(kd.nama) + ' (' + U.esc(kd.hubungan) + ') • ' + U.phoneDisplay(kd.telp)
              : '<span style="color:var(--danger)">' + I18N.t('🆘 kontak darurat belum diisi') + '</span>') + '</small>' +
            (st === 'kedaluwarsa' || st === 'segera'
              ? '<div class="mt-1"><span class="chip chip--' + (st === 'kedaluwarsa' ? 'danger' : 'warn') +
                '" style="font-size:10px">Identitas ' + (st === 'kedaluwarsa' ? 'kedaluwarsa' : 'segera habis') +
                '</span></div>' : '') +
            '</div>' +
            '<div class="right"><div class="row" style="gap:5px;justify-content:flex-end">' +
              '<button class="btn btn--ghost btn--sm" data-act="berkas-w" data-id="' + w.id + '">🆔</button>' +
              '<button class="btn btn--ghost btn--sm" data-act="wa-w" data-id="' + w.id + '">💬</button>' +
            '</div></div></div>';
        }).join('') + '</div>' });
    }).join('') + '</div>' +

    UI.card({ title: I18N.t('Rekap kinerja petugas'), sub: I18N.t('Bulan') + ' ' + U.bulanTahun(new Date()), flush: true,
      body: UI.table([
        { h: I18N.t('Petugas'), r: function (w) { return '<div class="row">' + UI.avatar(w.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(w.nama) + '</div><div class="tbl-sub">' + U.esc(w.jabatan) + '</div></div></div>'; } },
        { h: I18N.t('Tugas bulan ini'), cls: 'num', r: function (w) {
          return DB.all('orders').filter(function (o) {
            return (o.workerIds || []).indexOf(w.id) >= 0 && o.tgl.slice(0, 7) === bulan; }).length; } },
        { h: I18N.t('Selesai'), cls: 'num', r: function (w) {
          return DB.all('orders').filter(function (o) {
            return (o.workerIds || []).indexOf(w.id) >= 0 && o.status === 'diverifikasi'; }).length; } },
        { h: 'Jam kerja tercatat', cls: 'num', r: function (w) {
          var total = 0;
          DB.where('attendance', { workerId: w.id }).forEach(function (a) {
            if (a.tipe !== 'in') return;
            var out = DB.where('attendance', function (x) {
              return x.orderId === a.orderId && x.workerId === w.id && x.tipe === 'out'; })[0];
            if (out) total += (new Date(out.at) - new Date(a.at)) / 3600000;
          });
          return Math.round(total) + ' jam'; } },
        { h: I18N.t('Rata QC'), cls: 'num', r: function (w) {
          var qs = DB.all('qc').filter(function (q) {
            var o = BIZ.order(q.orderId); return o && (o.workerIds || []).indexOf(w.id) >= 0; });
          return qs.length ? (Math.round(U.sum(qs, BIZ.rataQC) / qs.length * 10) / 10) + ' ★' : '—'; } },
        { h: I18N.t('Sertifikat'), r: function (w) { return (w.sertifikat || []).length
          ? w.sertifikat.map(function (s) { return '<span class="chip" style="font-size:10.5px">' + U.esc(s) + '</span>'; }).join(' ')
          : '<span class="tbl-sub">—</span>'; } }
      ], list) });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    U.delegate(root, {
      detail: function (el) { Panel.detailOrder(el.getAttribute('data-id')); },
      zoom: function (el) { UI.lightbox(DB.getPhoto(el.getAttribute('data-id'))); },
      'ke-monitoring': function () { APP.go('monitoring'); },
      'ke-verifikasi': function () { APP.go('verifikasi'); },
      'muat-ulang': function () { APP.refresh(); UI.toast('Data diperbarui', 'ok'); },
      'tab-rentang': function (el) { rentang = el.getAttribute('data-key'); APP.refresh(); },
      'tab-qc': function (el) { fQC = el.getAttribute('data-key'); APP.refresh(); },
      qc: function (el) { dialogQC(el.getAttribute('data-id')); },
      'qc-tolak': function (el) { dialogQC(el.getAttribute('data-id')); },
      tugaskan: function (el) { dialogTugas(el.getAttribute('data-id')); },
      'wa-w': function (el) {
        var w = BIZ.user(el.getAttribute('data-id'));
        WA.chat(w.telp, 'Halo ' + w.nama + ', ');
      },
      'berkas-w': function (el) { Panel.detailBerkas(el.getAttribute('data-id')); }
    });
  }

  function dialogTugas(orderId) {
    var o = BIZ.order(orderId);
    var pilih = (o.workerIds || []).slice();
    /* hanya mitra aktif — yang masih onboarding belum boleh dijadwalkan */
    var kandidat = (anggota().length ? anggota() : BIZ.usersByRole('worker'))
      .filter(BIZ.bolehDitugaskan);

    function daftar() {
      return kandidat.map(function (w) {
        var hits = BIZ.bentrok(orderId, o.tgl, o.mulai, o.selesai, [w.id]);
        return '<label class="checklist-item" style="cursor:pointer">' +
          '<input type="checkbox" data-change="pilih" data-id="' + w.id + '"' +
            (pilih.indexOf(w.id) >= 0 ? ' checked' : '') + '>' +
          '<div style="flex:1"><span class="lbl">' + U.esc(w.nama) + '</span>' +
          '<small>' + U.esc(w.jabatan) +
          (hits.length ? ' • <span style="color:var(--danger)">' + I18N.t('bentrok dengan') + ' ' + U.esc(hits[0].order.no) + '</span>'
                       : ' • tersedia') + '</small></div></label>';
      }).join('');
    }

    UI.modal({
      title: 'Atur penugasan tim', sub: o.no + ' • ' + U.tglPanjang(o.tgl) + ' ' + o.mulai + '–' + o.selesai,
      body: '<div class="tbl-sub mb-2">' + I18N.t('Centang petugas yang akan dikirim ke lokasi. Petugas baru akan menerima') + ' ' +
        'notifikasi penugasan via WhatsApp.</div>' + daftar(),
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">' + I18N.t('Simpan Penugasan') + '</button>',
      actions: {
        pilih: function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) pilih.push(id); else pilih = pilih.filter(function (x) { return x !== id; });
        },
        simpan: function (el) {
          if (!pilih.length) { UI.toast(I18N.t('Pilih minimal satu petugas'), 'err'); return; }
          BIZ.tugaskan(orderId, pilih, o.teamId, me().id);
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast('Penugasan disimpan & notifikasi disiapkan', 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* ================================================================ PAGES */
  var pages = {
    beranda: { label: 'Beranda', icon: '📊', grup: 'Ringkasan', render: renderBeranda, mount: aksi },
    jadwal: { label: 'Jadwal Tim', icon: '📅', grup: 'Operasional', render: renderJadwal, mount: aksi },
    monitoring: { label: 'Monitoring Lapangan', icon: '📡', grup: 'Operasional', render: renderMonitoring, mount: aksi,
      badge: function () { return BIZ.ordersUntuk(APP.user).filter(function (o) { return o.status === 'berjalan'; }).length; } },
    verifikasi: { label: 'Verifikasi Mutu', icon: '🔍', grup: 'Operasional', render: renderVerifikasi, mount: aksi,
      badge: function () { return BIZ.ordersUntuk(APP.user).filter(function (o) { return o.status === 'selesai'; }).length; } },
    tim: { label: 'Tim Saya', icon: '👷', grup: 'Tim', render: renderTim, mount: aksi },
    wa: { label: 'WhatsApp Outbox', icon: '💬', grup: 'Tim', mount: aksi,
      render: function () {
        var list = U.sortBy(DB.where('waOutbox', function (m) { return m.to === APP.user.id || true; }),
          function (m) { return m.createdAt; }, true).slice(0, 40);
        return UI.alert('info', I18N.t('Pesan yang disiapkan sistem. Tekan Lihat untuk membaca isinya lalu kirim via WhatsApp.'), '💬') +
          '<div class="mb-3"></div>' +
          UI.card({ flush: true, body: list.map(function (m) {
            var u = BIZ.user(m.to);
            return '<div class="wa-out' + (m.status === 'terkirim' ? ' sent' : '') + '"><div class="ic">💬</div>' +
              '<div style="min-width:0;flex:1"><b style="font-size:13px">' + U.esc(u ? u.nama : '—') + '</b>' +
              '<div class="tbl-sub">' + U.esc(U.potong(m.pesan.replace(/\n/g, ' '), 80)) + '</div></div>' +
              '<div class="right"><button class="btn btn--ghost btn--sm" data-act="lihat-wa" data-id="' + m.id +
              '">' + I18N.t('Lihat') + '</button></div></div>';
          }).join('') });
      },
      badge: function () { return DB.where('waOutbox', { status: 'antre' }).length; } }
  };

  /* aksi tambahan khusus halaman WA supervisor */
  var aksiAsli = aksi;
  aksi = function (root) {
    aksiAsli(root);
    U.delegate(root, { 'lihat-wa': function (el) { Panel.pratinjauWA(el.getAttribute('data-id'), { onKirim: APP.refresh }); } });
  };
  Object.keys(pages).forEach(function (k) { pages[k].mount = aksi; });

  /* halaman Profil punya handler sendiri, jadi didaftarkan setelah baris di atas */
  pages.profil = ViewProfil.page('Akun');

  return { pages: pages };
})();
