/* ==========================================================================
   views/worker.js — tampilan untuk TENAGA KERJA LAPANGAN (mobile-first)
   Jadwal • check-in GPS • checklist • foto sebelum/sesudah • check-out
   ========================================================================== */
var ViewWorker = (function () {

  function me() { return APP.user; }
  function tugasSaya() { return BIZ.ordersUntuk(me()).filter(function (o) { return o.status !== 'dibatalkan'; }); }

  /* ================================================================ DAFTAR TUGAS */
  function renderTugas(params) {
    if (params && params.orderId) return renderDetail(params.orderId);

    var all = U.sortBy(tugasSaya(), function (o) { return o.tgl + o.mulai; });
    var hariIni = all.filter(function (o) { return o.tgl === U.today(); });
    var mendatang = all.filter(function (o) { return U.diffDays(o.tgl, new Date()) > 0; });
    var tertunda = all.filter(function (o) {
      return U.diffDays(o.tgl, new Date()) < 0 && ['dijadwalkan', 'berjalan', 'perbaikan'].indexOf(o.status) >= 0; });

    return '' +
      (tertunda.length ? UI.alert('danger', '<b>' + tertunda.length + ' tugas terlewat</b> ' + I18N.t('belum ditutup.') + ' ' +
        'Segera lengkapi laporannya.', '⚠️') + '<div class="mb-3"></div>' : '') +

      ringkasHarian(all) +

      '<div class="nav-group" style="color:var(--muted);padding:0 0 8px">' + I18N.t('Hari ini •') + ' ' + U.tglPanjang(new Date()) + '</div>' +
      (hariIni.length ? hariIni.map(kartuTugas).join('')
        : '<div class="card"><div class="card__body">' +
          UI.empty('☕', I18N.t('Tidak ada tugas hari ini'), I18N.t('Tetap siaga — jadwal bisa berubah sewaktu-waktu.')) + '</div></div>') +

      (tertunda.length ? '<div class="nav-group" style="color:var(--danger);padding:20px 0 8px">' + I18N.t('Terlewat') + '</div>' +
        tertunda.map(kartuTugas).join('') : '') +

      (mendatang.length ? '<div class="nav-group" style="color:var(--muted);padding:20px 0 8px">' + I18N.t('Jadwal berikutnya') + '</div>' +
        mendatang.slice(0, 8).map(kartuTugas).join('') : '');
  }

  /* ================================================== RINGKASAN HARIAN
     Halaman tugas sering hanya berisi satu kartu, menyisakan layar kosong
     sampai ke bilah bawah. Yang mengisi kekosongan itu bukan hiasan: tiga
     angka yang paling sering ditanyakan sendiri oleh petugas — sudah berapa
     yang masuk bulan ini, berapa pekerjaan selesai, dan bagaimana nilai
     mutunya.

     Seluruhnya DIHITUNG dari data yang sudah ada. Tidak ada target, lencana,
     atau peringkat buatan — angka yang tidak berdasar hanya membuat orang
     berhenti mempercayai layar ini. */
  function ringkasHarian(semuaTugas) {
    var u = APP.user;
    var bulan = DOMPET.ringkasBulan(u.id);

    /* Selesai bulan ini: yang tanggalnya di bulan berjalan DAN sudah lewat
       tahap pengerjaan. Memakai seluruh riwayat akan menampilkan angka yang
       tidak pernah berubah, dan angka yang tidak bergerak berhenti dibaca. */
    var pre = U.iso(new Date()).slice(0, 7);
    var selesai = semuaTugas.filter(function (o) {
      return String(o.tgl).slice(0, 7) === pre &&
        ['selesai', 'diverifikasi'].indexOf(o.status) >= 0;
    }).length;

    /* Nilai QC dirata-ratakan dari verifikasi pekerjaan yang memang diikuti
       petugas ini. Bila belum ada satu pun, ditulis apa adanya — bukan 0,
       karena nol berarti "dinilai buruk", bukan "belum pernah dinilai". */
    var nilai = [];
    semuaTugas.forEach(function (o) {
      var q = BIZ.qcOrder(o.id);
      var r = q ? BIZ.rataQC(q) : null;
      if (r) nilai.push(r);
    });
    var rata = nilai.length
      ? (nilai.reduce(function (a, b) { return a + b; }, 0) / nilai.length).toFixed(1)
      : null;

    return '<div class="wring">' +
      '<button class="wring__i" data-act="ke-dompet">' +
        '<span class="wring__l">' + I18N.t('Masuk bulan ini') + '</span>' +
        '<b class="wring__v">' + U.rpShort(bulan.masuk) + '</b>' +
      '</button>' +
      '<div class="wring__i">' +
        '<span class="wring__l">' + I18N.t('Selesai bulan ini') + '</span>' +
        '<b class="wring__v">' + selesai + '</b>' +
      '</div>' +
      '<div class="wring__i">' +
        '<span class="wring__l">Rata nilai QC</span>' +
        '<b class="wring__v">' + (rata ? rata + '★' : '—') + '</b>' +
      '</div>' +
    '</div>';
  }

  function kartuTugas(o) {
    var st = BIZ.statusAbsen(o.id, me().id);
    var p = BIZ.progresChecklist(o);
    var kini = o.tgl === U.today();
    return '<div class="wjob' + (kini && o.status === 'berjalan' ? ' now' : '') + '" data-act="buka" data-id="' + o.id + '">' +
      '<div class="row"><span class="time">🕐 ' + o.mulai + ' – ' + o.selesai + '</span>' +
      '<div class="spacer"></div>' + UI.statusChip('order', o.status) + '</div>' +
      '<h4>' + U.esc(o.judul) + '</h4>' +
      '<div class="addr">📍 ' + U.esc(o.alamat) + '</div>' +
      '<div class="row mt-2" style="gap:8px;flex-wrap:wrap">' +
        '<span class="chip chip--muted">' + U.esc(o.no) + '</span>' +
        (kini ? '' : '<span class="chip chip--muted">' + U.tglPendek(o.tgl) + ' • ' + U.relatif(o.tgl) + '</span>') +
        (st === 'in' ? '<span class="chip chip--warn chip--dot">' + I18N.t('Sudah check-in') + '</span>' : '') +
        (st === 'out' ? '<span class="chip chip--ok">' + I18N.t('Sudah check-out') + '</span>' : '') +
      '</div>' +
      (p.total ? '<div class="mt-2">' + UI.progress(p.pct, p.pct === 100 ? 'ok' : '') +
        '<div class="tbl-sub mt-1">' + p.done + '/' + p.total + ' ' + I18N.t('langkah selesai') + '</div></div>' : '') +
      '</div>';
  }

  /* ================================================================ DETAIL TUGAS */
  function renderDetail(orderId) {
    var o = BIZ.order(orderId);
    if (!o) return UI.empty('❓', I18N.t('Tugas tidak ditemukan'), '');
    var st = BIZ.statusAbsen(orderId, me().id);
    var masuk = BIZ.jamAbsen(orderId, me().id, 'in'), keluar = BIZ.jamAbsen(orderId, me().id, 'out');
    var p = BIZ.progresChecklist(o);
    var lap = BIZ.laporan(orderId).filter(function (r) { return r.workerId === me().id; })[0];
    var svc = (o.serviceIds || []).map(BIZ.svcNama).join(', ');
    var adaK3 = (o.serviceIds || []).some(function (id) { var s = BIZ.svc(id); return s && s.k3; });

    return '' +
      '<button class="btn btn--ghost btn--sm mb-2" data-act="kembali">' + I18N.t('‹ Kembali ke daftar') + '</button>' +

      '<div class="card mb-3"><div class="card__body">' +
        '<div class="row mb-2">' + UI.statusChip('order', o.status) +
        '<div class="spacer"></div><span class="code">' + U.esc(o.no) + '</span></div>' +
        '<h3 style="font-size:16px">' + U.esc(o.judul) + '</h3>' +
        '<dl class="kv mt-2">' +
          '<dt>Waktu</dt><dd>' + U.tglPanjang(o.tgl) + '<br>' + o.mulai + ' – ' + o.selesai +
            (window.ZONA ? ZONA.labelJam(ZONA.dariWilayah(o.wilayah)) : '') + '</dd>' +
          '<dt>' + I18N.t('Lokasi') + '</dt><dd>' + U.esc(o.alamat) + '</dd>' +
          '<dt>' + I18N.t('Klien') + '</dt><dd>' + U.esc(BIZ.klien(o.clientId)) + '</dd>' +
          '<dt>' + I18N.t('Layanan') + '</dt><dd>' + U.esc(svc) + '</dd>' +
          '<dt>Rekan tim</dt><dd>' + ((o.workerIds || []).filter(function (w) { return w !== me().id; })
            .map(BIZ.nama).join(', ') || '—') + '</dd>' +
          '<dt>' + I18N.t('Supervisor') + '</dt><dd>' + U.esc(BIZ.nama(o.supervisorId)) +
            (BIZ.user(o.supervisorId) ? ' <button class="btn btn--wa btn--sm" data-act="wa-spv" data-id="' +
              o.supervisorId + '">💬</button>' : '') + '</dd>' +
        '</dl>' +
      '</div></div>' +

      /* peta menuju lokasi — layar yang paling sering dibuka petugas sebelum berangkat */
      UI.card({ cls: 'mb-3', title: 'Menuju Lokasi', sub: U.potong(o.alamat, 46),
        body: MAPS.petaHTML(o.koordinat, { tinggi: 190 }) }) +

      (adaK3 ? UI.alert('warn', '<b>' + I18N.t('Pekerjaan berisiko tinggi.') + '</b> ' + I18N.t('Wajib briefing K3, cek APD (helm, full body harness,') + ' ' +
        I18N.t('sarung tangan), pastikan anchor point aman dan area bawah dibarikade sebelum mulai.'), '🦺') + '<div class="mb-3"></div>' : '') +

      /* ---- kotak absensi ---- */
      '<div class="gps-box mb-3">' +
        '<div class="row"><div>' +
          '<small>' + I18N.t('Status kehadiran') + '</small>' +
          '<div class="big">' + (st === 'belum' ? I18N.t('Belum masuk') : st === 'in' ? U.jam(masuk.at) : U.durasi(masuk.at, keluar.at)) + '</div>' +
          '<small>' + (st === 'belum' ? I18N.t('Tekan check-in saat tiba di lokasi')
            : st === 'in' ? 'Check-in pukul ' + U.jam(masuk.at) + (masuk.akurasi ? ' • akurasi ±' + masuk.akurasi + ' m' : '')
            : 'Masuk ' + U.jam(masuk.at) + ' • Pulang ' + U.jam(keluar.at)) + '</small>' +
        '</div><div class="spacer"></div>' +
        (st === 'belum'
          ? '<button class="btn" style="background:#fff;color:var(--brand-dark)" data-act="checkin" data-id="' + o.id + '">📍 Check-in</button>'
          : st === 'in'
            ? '<button class="btn" style="background:#fff;color:var(--brand-dark)" data-act="checkout" data-id="' + o.id + '">🏁 Check-out</button>'
            : '<span style="font-size:22px">✅</span>') +
        '</div>' +
        (masuk && masuk.gpsGagal ? '<div style="margin-top:9px;font-size:11.5px;background:rgba(0,0,0,.18);padding:7px 10px;border-radius:8px">' +
          I18N.t('⚠️ GPS tidak terekam:') + ' ' + U.esc(masuk.gpsGagal) + '</div>' : '') +
        (masuk && masuk.lat ? '<div style="margin-top:9px;font-size:11.5px">📌 <a href="' +
          U.mapsLink(masuk.lat, masuk.lng) + '" target="_blank" rel="noopener" style="color:#CFF3EF">' +
          masuk.lat + ', ' + masuk.lng + '</a>' +
          (o.koordinat ? ' • ' + U.jarakMeter({ lat: masuk.lat, lng: masuk.lng }, o.koordinat) + ' ' + I18N.t('m dari titik lokasi') : '') +
          '</div>' : '') +
      '</div>' +

      /* ---- checklist ---- */
      UI.card({ cls: 'mb-3', title: I18N.t('Checklist Pekerjaan'), sub: p.done + ' dari ' + p.total + ' langkah',
        body: (p.total ? UI.progress(p.pct, p.pct === 100 ? 'ok' : '') + '<div class="mt-2">' +
          Object.keys(U.groupBy(o.checklist, function (c) { return c.grup || 'Umum'; })).map(function (g) {
            var items = o.checklist.filter(function (c) { return (c.grup || 'Umum') === g; });
            return '<div class="tbl-sub mt-2 mb-1">' + U.esc(g) + '</div>' + items.map(function (c) {
              return '<label class="checklist-item' + (c.done ? ' done' : '') + '">' +
                '<input type="checkbox" data-change="ck" data-id="' + c.id + '" data-order="' + o.id + '"' +
                (c.done ? ' checked' : '') + (st === 'belum' ? ' disabled' : '') + '>' +
                '<div><span class="lbl">' + U.esc(c.label) + '</span>' +
                (c.done && c.at ? '<small>✓ ' + U.esc(BIZ.nama(c.byId)) + ' • ' + U.jam(c.at) + '</small>' : '') +
                '</div></label>';
            }).join('');
          }).join('') + '</div>' +
          (st === 'belum' ? '<div class="tbl-sub mt-2">' + I18N.t('Checklist terbuka setelah Anda check-in.') + '</div>' : '')
          : '<div class="tbl-sub">' + I18N.t('Tidak ada checklist untuk layanan ini.') + '</div>') }) +

      /* ---- foto ---- */
      UI.card({ cls: 'mb-3', title: 'Foto Sebelum & Sesudah', sub: I18N.t('Wajib untuk laporan ke klien'),
        body: '<div class="tbl-sub mb-1">Sebelum dikerjakan</div>' +
          '<div id="foto-before">' + UI.photoGrid(lap ? lap.before : [], {
            addAct: 'foto-before', delAct: 'hapus-before', addLabel: 'Foto sebelum' }) + '</div>' +
          '<div class="tbl-sub mb-1 mt-3">Sesudah dikerjakan</div>' +
          '<div id="foto-after">' + UI.photoGrid(lap ? lap.after : [], {
            addAct: 'foto-after', delAct: 'hapus-after', addLabel: 'Foto sesudah' }) + '</div>' +
          '<div class="field mt-3"><label>Catatan lapangan</label>' +
          '<textarea class="textarea" id="catatan" rows="3" data-change="catatan" ' +
          'placeholder="Kendala, temuan kerusakan, hal yang perlu dilaporkan ke supervisor">' +
          U.esc(lap ? lap.catatan : '') + '</textarea>' +
          '<div class="hint">Tersimpan otomatis.</div></div>' }) +

      /* ---- tombol akhir ---- */
      (['dijadwalkan', 'berjalan', 'perbaikan'].indexOf(o.status) >= 0
        ? '<button class="btn btn--lg btn--block" data-act="lapor-selesai" data-id="' + o.id + '"' +
          (st === 'belum' ? ' disabled' : '') + '>' + I18N.t('✅ Laporkan Pekerjaan Selesai') + '</button>' +
          '<div class="tbl-sub mt-2" style="text-align:center">' + I18N.t('Supervisor akan memverifikasi hasil kerja Anda.') + '</div>'
        : o.status === 'selesai'
          ? UI.alert('brand', I18N.t('Laporan sudah dikirim. Menunggu verifikasi supervisor.'), '⏳')
          : UI.alert('ok', I18N.t('Pekerjaan sudah diverifikasi supervisor. Terima kasih! 🎉'), '✅'));
  }

  /* ================================================================ RIWAYAT */
  function renderRiwayat() {
    var list = U.sortBy(tugasSaya().filter(function (o) {
      return ['selesai', 'diverifikasi'].indexOf(o.status) >= 0; }), function (o) { return o.tgl; }, true);
    if (!list.length) return UI.empty('📚', I18N.t('Belum ada riwayat'), I18N.t('Tugas yang sudah selesai akan tersimpan di sini.'));
    return '<div class="nav-group" style="color:var(--muted);padding:0 0 8px">' + list.length + ' ' + I18N.t('pekerjaan selesai') + '</div>' +
      list.map(function (o) {
        var qc = BIZ.qcOrder(o.id);
        return '<div class="wjob" data-act="buka" data-id="' + o.id + '">' +
          '<div class="row"><span class="time">' + U.tgl(o.tgl) + '</span><div class="spacer"></div>' +
          (qc ? UI.statusChip('qc', qc.hasil) : UI.statusChip('order', o.status)) + '</div>' +
          '<h4>' + U.esc(o.judul) + '</h4>' +
          '<div class="addr">' + U.esc(BIZ.klien(o.clientId)) + '</div>' +
          (qc ? '<div class="row mt-2" style="gap:6px">' + UI.stars(Math.round(BIZ.rataQC(qc))) +
            '<span class="tbl-sub">' + BIZ.rataQC(qc) + '/5 dari supervisor</span></div>' : '') +
          '</div>';
      }).join('');
  }

  /* ================================================================ ABSENSI */
  function renderAbsensi() {
    var abs = U.sortBy(DB.where('attendance', { workerId: me().id }), function (a) { return a.at; }, true);
    var perOrder = {};
    abs.forEach(function (a) {
      perOrder[a.orderId] = perOrder[a.orderId] || { in: null, out: null, orderId: a.orderId };
      if (a.tipe === 'in' && !perOrder[a.orderId].in) perOrder[a.orderId].in = a;
      if (a.tipe === 'out' && !perOrder[a.orderId].out) perOrder[a.orderId].out = a;
    });
    var rows = U.sortBy(Object.keys(perOrder).map(function (k) { return perOrder[k]; }),
      function (r) { return r.in ? r.in.at : ''; }, true);

    var totalJam = 0;
    rows.forEach(function (r) { if (r.in && r.out) totalJam += (new Date(r.out.at) - new Date(r.in.at)) / 3600000; });

    var bulanIni = rows.filter(function (r) { return r.in && U.iso(r.in.at).slice(0, 7) === U.today().slice(0, 7); });

    return '<div class="grid g-2 mb-3">' +
      UI.stat({ label: I18N.t('Total jam kerja tercatat'), value: Math.round(totalJam) + ' jam', icon: '⏱️' }) +
      UI.stat({ label: I18N.t('Kehadiran bulan ini'), value: bulanIni.length + '×', icon: '📆',
        meta: U.bulanTahun(new Date()) }) +
    '</div>' +
    UI.card({ title: 'Riwayat absensi', flush: true,
      body: rows.length ? '<div class="mini-list">' + rows.map(function (r) {
        var o = BIZ.order(r.orderId);
        return '<div class="mini-item"><div style="min-width:0;flex:1">' +
          '<b>' + U.esc(o ? U.potong(o.judul, 30) : '—') + '</b>' +
          '<small>' + (r.in ? U.tgl(r.in.at) : '—') + ' • masuk ' + (r.in ? U.jam(r.in.at) : '—') +
          (r.out ? ' • pulang ' + U.jam(r.out.at) : ' ' + I18N.t('• belum pulang')) + '</small></div>' +
          '<div class="right">' + (r.in && r.out
            ? '<b>' + U.durasi(r.in.at, r.out.at) + '</b>'
            : '<span class="chip chip--warn">berjalan</span>') + '</div></div>';
      }).join('') + '</div>' : UI.empty('⏱️', I18N.t('Belum ada absensi'), I18N.t('Riwayat check-in/check-out akan muncul di sini.')) });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    U.delegate(root, {
      'ke-dompet': function () { APP.go('dompet'); },
      buka: function (el) { APP.go('tugas', { orderId: el.getAttribute('data-id') }); },
      kembali: function () { APP.go('tugas'); },
      zoom: function (el) { UI.lightbox(DB.getPhoto(el.getAttribute('data-id'))); },
      'wa-spv': function (el) {
        var s = BIZ.user(el.getAttribute('data-id'));
        WA.chat(s.telp, 'Halo Pak/Bu ' + s.nama.split(' ')[0] + ', saya ' + me().nama + '. ');
      },

      checkin: function (el) { dialogCheckIn(el.getAttribute('data-id')); },
      checkout: function (el) { dialogCheckOut(el.getAttribute('data-id')); },

      ck: function (el) {
        var o = BIZ.order(el.getAttribute('data-order'));
        var id = el.getAttribute('data-id'), on = el.checked;
        var cl = (o.checklist || []).map(function (c) {
          if (c.id !== id) return c;
          return Object.assign({}, c, { done: on, byId: on ? me().id : null, at: on ? U.nowISO() : null });
        });
        DB.update('orders', o.id, { checklist: cl });
        var lbl = el.closest('.checklist-item');
        if (lbl) lbl.classList.toggle('done', on);
        APP.refresh();
      },

      'foto-before': function (el) { tambahFoto(el, 'before'); },
      'foto-after': function (el) { tambahFoto(el, 'after'); },
      'hapus-before': function (el) { hapusFoto(el, 'before'); },
      'hapus-after': function (el) { hapusFoto(el, 'after'); },

      catatan: function (el) {
        var orderId = APP.params.orderId;
        var lap = pastikanLaporan(orderId);
        DB.update('reports', lap.id, { catatan: el.value, submittedAt: U.nowISO() });
      },

      'lapor-selesai': function (el) { dialogSelesai(el.getAttribute('data-id')); }
    });
  }

  /** Ambil (atau buat) laporan milik petugas ini untuk order tsb. */
  function pastikanLaporan(orderId) {
    var lap = BIZ.laporan(orderId).filter(function (r) { return r.workerId === me().id; })[0];
    if (!lap) lap = DB.insert('reports', { orderId: orderId, workerId: me().id, before: [], after: [],
      catatan: '', submittedAt: U.nowISO() });
    return lap;
  }

  function tambahFoto(el, jenis) {
    var orderId = APP.params.orderId;
    UI.handleFotoInput(el, function (ids) {
      var lap = pastikanLaporan(orderId);
      var patch = {};
      patch[jenis] = (lap[jenis] || []).concat(ids);
      patch.submittedAt = U.nowISO();
      DB.update('reports', lap.id, patch);
      UI.toast(ids.length + ' foto ditambahkan', 'ok');
      APP.refresh();
    });
  }

  function hapusFoto(el, jenis) {
    var orderId = APP.params.orderId, id = el.getAttribute('data-id');
    var lap = pastikanLaporan(orderId);
    var patch = {};
    patch[jenis] = (lap[jenis] || []).filter(function (x) { return x !== id; });
    DB.update('reports', lap.id, patch);
    DB.delPhoto(id);
    APP.refresh();
  }

  /* ---- check-in ---- */
  function dialogCheckIn(orderId) {
    var o = BIZ.order(orderId);
    var gps = null, selfie = null;

    var close = UI.modal({
      title: 'Check-in lokasi', sub: o.no + ' • ' + U.potong(o.alamat, 44),
      body: '<div id="gps-status">' + UI.alert('info', 'Mengambil lokasi GPS…', '📡') + '</div>' +
        '<div class="field mt-3"><label>' + I18N.t('Foto selfie di lokasi (opsional)') + '</label>' +
        '<div id="selfie">' + UI.photoGrid([], { addAct: 'ambil-selfie', addLabel: 'Ambil foto' }) + '</div></div>' +
        '<div class="field"><label>Catatan (opsional)</label>' +
        '<input class="input" id="ci-cat" placeholder="mis. akses lewat pintu samping"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan" disabled id="btn-ci">Check-in Sekarang</button>',
      actions: {
        'ambil-selfie': function (el) {
          UI.handleFotoInput(el, function (ids) {
            if (selfie) DB.delPhoto(selfie);
            selfie = ids[0];
            ids.slice(1).forEach(DB.delPhoto);
            U.$('#selfie').innerHTML = UI.photoGrid([selfie], { addAct: 'ambil-selfie', addLabel: 'Ganti foto' });
          });
        },
        simpan: function () {
          BIZ.checkIn(orderId, me().id, gps, selfie, U.$('#ci-cat').value.trim());
          close();
          UI.toast('Check-in tercatat. Selamat bekerja!', 'ok');
          APP.refresh();
        }
      },
      onMount: function () {
        U.getGPS().then(function (g) {
          gps = g;
          var box = U.$('#gps-status');
          if (!box) return;
          if (g.ok) {
            var jarak = o.koordinat ? U.jarakMeter({ lat: g.lat, lng: g.lng }, o.koordinat) : null;
            var jauh = jarak !== null && jarak > 500;
            box.innerHTML = UI.alert(jauh ? 'warn' : 'ok',
              '<b>Lokasi terdeteksi</b><br>' + g.lat + ', ' + g.lng + ' (akurasi ±' + g.akurasi + ' m)' +
              (jarak !== null ? '<br>' + I18N.t('Jarak ke titik lokasi kerja:') + ' <b>' + jarak + ' m</b>' +
                (jauh ? ' ' + I18N.t('— cukup jauh, pastikan Anda sudah di lokasi yang benar.') : '') : ''),
              jauh ? '⚠️' : '📍');
          } else {
            box.innerHTML = UI.alert('warn', '<b>' + I18N.t('GPS tidak tersedia') + '</b><br>' + U.esc(g.alasan) +
              '. Check-in tetap bisa dilakukan, namun tanpa koordinat lokasi.', '📡');
          }
          var b = U.$('#btn-ci');
          if (b) b.disabled = false;
        });
      }
    });
  }

  /* ---- check-out ---- */
  function dialogCheckOut(orderId) {
    var o = BIZ.order(orderId);
    var p = BIZ.progresChecklist(o);
    var lap = BIZ.laporan(orderId).filter(function (r) { return r.workerId === me().id; })[0];
    var gps = null;

    var close = UI.modal({
      title: 'Check-out', sub: o.no,
      body: (p.total && p.done < p.total
          ? UI.alert('warn', '<b>' + (p.total - p.done) + ' ' + I18N.t('langkah checklist belum dicentang.') + '</b> ' +
              I18N.t('Pastikan semua pekerjaan benar-benar sudah dikerjakan.'), '⚠️') + '<div class="mb-2"></div>' : '') +
        (!lap || !(lap.after || []).length
          ? UI.alert('warn', I18N.t('Belum ada <b>foto sesudah</b>. Foto ini dipakai ' +
              'supervisor dan klien untuk menilai hasil kerja.'), '📷') +
            '<div class="mb-2"></div>' : '') +
        '<div id="gps-status">' + UI.alert('info', 'Mengambil lokasi GPS…', '📡') + '</div>' +
        '<div class="field mt-3"><label>Catatan penutup (opsional)</label>' +
        '<textarea class="textarea" id="co-cat" rows="2" placeholder="Kondisi akhir, serah terima ke siapa"></textarea></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">Check-out Sekarang</button>',
      actions: {
        simpan: function () {
          BIZ.checkOut(orderId, me().id, gps, U.$('#co-cat').value.trim());
          close();
          UI.toast('Check-out tercatat', 'ok');
          APP.refresh();
        }
      },
      onMount: function () {
        U.getGPS().then(function (g) {
          gps = g;
          var box = U.$('#gps-status');
          if (!box) return;
          box.innerHTML = g.ok
            ? UI.alert('ok', '<b>Lokasi terdeteksi</b><br>' + g.lat + ', ' + g.lng + ' (±' + g.akurasi + ' m)', '📍')
            : UI.alert('warn', I18N.t('GPS tidak tersedia:') + ' ' + U.esc(g.alasan), '📡');
        });
      }
    });
  }

  /* ---- lapor selesai ---- */
  function dialogSelesai(orderId) {
    var o = BIZ.order(orderId);
    var p = BIZ.progresChecklist(o);
    var lap = BIZ.laporan(orderId).filter(function (r) { return r.workerId === me().id; })[0];
    var masalah = [];
    if (p.total && p.done < p.total) masalah.push((p.total - p.done) + ' ' + I18N.t('langkah checklist belum dicentang'));
    if (!lap || !(lap.before || []).length) masalah.push(I18N.t('belum ada foto sebelum'));
    if (!lap || !(lap.after || []).length) masalah.push(I18N.t('belum ada foto sesudah'));
    if (BIZ.statusAbsen(orderId, me().id) !== 'out') masalah.push(I18N.t('Anda belum check-out'));

    UI.modal({
      title: I18N.t('Laporkan pekerjaan selesai?'), sub: o.no + ' • ' + o.judul, size: 'narrow',
      body: (masalah.length
          ? UI.alert('warn', '<b>Perhatian:</b><br>• ' + masalah.map(U.esc).join('<br>• ') +
              '<br><br>' + I18N.t('Anda tetap bisa melanjutkan, tetapi supervisor mungkin meminta perbaikan.'), '⚠️')
          : UI.alert('ok', I18N.t('Semua checklist, foto, dan absensi sudah lengkap. Siap dilaporkan.'), '✅')) +
        '<p class="mt-3" style="font-size:13px;color:var(--ink-2)">Setelah dilaporkan, supervisor ' +
        '<b>' + U.esc(BIZ.nama(o.supervisorId)) + '</b> ' + I18N.t('akan memeriksa hasil kerja dan foto Anda.') + '</p>',
      foot: '<button class="btn btn--ghost" data-close>Belum</button>' +
        '<button class="btn" data-act="ya">' + I18N.t('Ya, laporkan selesai') + '</button>',
      actions: {
        ya: function (el) {
          BIZ.laporSelesai(orderId, me().id);
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(I18N.t('Laporan terkirim ke supervisor. Terima kasih! 🙌'), 'ok');
          APP.go('tugas');
        }
      }
    });
  }

  /* ================================================================ PAGES */
  /**
   * Menu mitra menyesuaikan status kemitraannya: yang belum aktif hanya
   * melihat proses bergabung, pembelajaran, dan profil — belum ada penugasan.
   */
  function susunPages() {
    var u = APP.user;
    var aktif = u && u.statusMitra === 'aktif';
    var p = {};

    if (aktif) {
      /* Ikon rumah, bukan sapu: halaman ini adalah layar pertama yang dibuka
         mitra setiap hari — berisi ringkasan dan jadwal, bukan hanya daftar
         tugas. Sapu juga dipakai di banyak tempat lain sebagai lambang
         "pekerjaan jasa", jadi memakainya di bilah bawah membuat ikonnya
         tidak lagi menandai satu tempat tertentu. */
      /* Permintaan jasa keahlian punya TENGGAT. Diletakkan sebelum Tugas
         supaya yang berbatas waktu terlihat lebih dulu daripada yang tidak. */
      if (window.ViewKeahlian && KEAHLIAN.katalog().length) {
        p.permintaan = ViewKeahlian.pageMitra;
      }
      p.tugas = { label: I18N.t('Tugas'), icon: '🏠', render: renderTugas, mount: aksi,
        badge: function () { return BIZ.ordersUntuk(APP.user).filter(function (o) {
          return o.tgl === U.today() && ['dijadwalkan', 'berjalan'].indexOf(o.status) >= 0; }).length; } };
    } else {
      p.gabung = ViewBelajar.pages.gabung;
      p.fungsi = ViewKompetensi.pageMitra;
    }

    p.belajar = ViewBelajar.pages.belajar;

    /* Obrolan mengikuti PENUGASAN, bukan status kemitraan. Mitra yang masih
       onboarding tetapi sudah terpasang pada sebuah pekerjaan harus tetap bisa
       membalas kliennya — kalau tidak, pesan masuk tanpa ada jalan menjawabnya. */
    if (aktif || CHAT.ruangUntuk(u).length) p.obrolan = ViewObrolan.halaman;

    if (aktif) {
      p.hasil = ViewHasil.pageMitra;
      p.dompet = ViewDompet.pageMitra;
      p.fungsi = ViewKompetensi.pageMitra;
      p.riwayat = { label: I18N.t('Riwayat'), icon: '📚', render: renderRiwayat, mount: aksi };
      p.absensi = { label: I18N.t('Absensi'), icon: '⏱️', render: renderAbsensi, mount: aksi };
    }

    p.poin = ViewPoin.halamanUser;
    p.voucher = ViewVoucher.halamanUser;
    p.profil = ViewProfil.page();
    return p;
  }

  return { get pages() { return susunPages(); } };
})();
