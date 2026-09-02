/* ==========================================================================
   views/crm.js — tampilan CRM untuk Admin
   Pipeline prospek (kanban) • Agenda follow-up • Pelanggan 360° • Kampanye WA
   ========================================================================== */
var ViewCRM = (function () {

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }
  function aku() { return APP.user ? APP.user.id : 'u_admin'; }

  /* ================================================================ PIPELINE */
  var tampilan = 'kanban';
  var filterSumber = 'semua';

  function renderPipeline() {
    var st = CRM.statistik();
    var siklus = CRM.rataSiklus();

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: 'Nilai pipeline aktif', small: true, valueHTML: U.rpShort(st.nilaiPipeline), icon: '🎯',
        meta: st.aktif + ' prospek berjalan' }) +
      UI.stat({ label: 'Perkiraan tertimbang', small: true, valueHTML: U.rpShort(st.nilaiTertimbang), icon: '📈',
        meta: 'nilai × peluang per tahap' }) +
      UI.stat({ label: 'Tingkat konversi', value: st.konversi + '%', icon: '🏆',
        meta: st.menang + ' menang / ' + st.kalah + ' kalah' }) +
      UI.stat({ label: 'Rata-rata siklus', value: siklus !== null ? siklus + ' hari' : '—', icon: '⏱️',
        meta: 'prospek masuk sampai ditutup' }) +
    '</div>' +

    (st.followUpTerlambat || st.tanpaTindakLanjut
      ? UI.alert('warn',
          (st.followUpTerlambat ? '<b>' + st.followUpTerlambat + ' follow-up terlambat.</b> ' : '') +
          (st.tanpaTindakLanjut ? '<b>' + st.tanpaTindakLanjut + ' prospek</b> ' + I18N.t('belum dijadwalkan tindak lanjutnya.') + ' ' : '') +
          '<a href="#" data-act="ke-agenda">' + I18N.t('Buka agenda →') + '</a>', '⏰') + '<div class="mb-3"></div>' : '') +

    '<div class="row wrap mb-3" style="gap:8px">' +
      UI.tabs([{ key: 'kanban', label: '▦ Papan Pipeline' }, { key: 'daftar', label: '☰ Daftar' },
        { key: 'corong', label: '📊 Corong & Sumber' }], tampilan, 'tab-view') +
      '<div class="spacer"></div>' +
      '<select class="select" style="width:auto" data-change="f-sumber">' +
        '<option value="semua">' + I18N.t('Semua sumber') + '</option>' +
        CRM.SUMBER.map(function (s) {
          return '<option value="' + s.id + '"' + (filterSumber === s.id ? ' selected' : '') + '>' +
            s.ic + ' ' + U.esc(s.nama) + '</option>'; }).join('') +
      '</select>' +
      '<button class="btn btn--sm" data-act="lead-baru">＋ Prospek Baru</button>' +
    '</div>' +

    (tampilan === 'kanban' ? papanKanban() : tampilan === 'daftar' ? daftarLead() : corongLead());
  }

  function leadTersaring(tahapId) {
    return CRM.leadPerTahap(tahapId).filter(function (l) {
      return filterSumber === 'semua' || l.sumber === filterSumber; });
  }

  function papanKanban() {
    return '<div class="kanban">' + CRM.TAHAP_AKTIF.map(function (id) {
      var t = CRM.tahap(id), list = U.sortBy(leadTersaring(id), function (l) { return l.followUpAt || '9999'; });
      var nilai = U.sum(list, function (l) { return l.estimasiNilai || 0; });
      return '<div class="kb-col">' +
        '<div class="kb-head">' +
          '<div class="row" style="gap:7px"><span>' + t.ic + '</span>' +
            '<b>' + U.esc(t.nama) + '</b>' +
            '<span class="chip chip--muted" style="font-size:10px">' + list.length + '</span></div>' +
          '<div class="kb-sum">' + U.rpShort(nilai) + ' • peluang ' + t.prob + '%</div>' +
        '</div>' +
        '<div class="kb-body">' + (list.length ? list.map(kartuLead).join('')
          : '<div class="kb-kosong">' + I18N.t('Belum ada prospek') + '</div>') + '</div>' +
      '</div>';
    }).join('') + '</div>' +

    '<div class="grid g-2 mt-3">' + ['menang', 'kalah'].map(function (id) {
      var t = CRM.tahap(id), list = leadTersaring(id);
      return UI.card({ title: t.ic + ' ' + t.nama, sub: list.length + ' prospek • ' +
          U.rp(U.sum(list, function (l) { return l.estimasiNilai || 0; })), flush: true,
        body: list.length ? '<div class="mini-list">' + U.sortBy(list, function (l) { return l.closedAt; }, true)
          .slice(0, 6).map(function (l) {
            return '<div class="mini-item" data-act="detail-lead" data-id="' + l.id + '" style="cursor:pointer">' +
              UI.avatar(l.perusahaan || l.nama, 'sm') +
              '<div style="min-width:0;flex:1"><b>' + U.esc(l.perusahaan || l.nama) + '</b>' +
              '<small>' + U.esc(CRM.sumberNama(l.sumber)) +
              (l.closedAt ? ' • ' + U.sejak(l.closedAt) : '') + '</small></div>' +
              '<div class="right"><b>' + U.rpShort(l.estimasiNilai) + '</b>' +
              (l.alasanKalah ? '<small>' + U.esc(U.potong(l.alasanKalah, 22)) + '</small>' : '') + '</div></div>';
          }).join('') + '</div>' : UI.empty(t.ic, I18N.t('Belum ada'), '') });
    }).join('') + '</div>';
  }

  function kartuLead(l) {
    var telat = l.followUpAt && l.followUpAt < U.today();
    var akt = CRM.aktivitasUntuk({ leadId: l.id })[0];
    return '<div class="kb-card" data-act="detail-lead" data-id="' + l.id + '">' +
      '<div class="row" style="gap:6px"><b>' + U.esc(U.potong(l.perusahaan || l.nama, 26)) + '</b>' +
        '<div class="spacer"></div>' +
        '<span class="kb-src" title="' + U.esc(CRM.sumberNama(l.sumber)) + '">' +
        ((CRM.sumber(l.sumber) || {}).ic || '•') + '</span></div>' +
      (l.perusahaan ? '<div class="kb-sub">' + U.esc(l.nama) + '</div>' : '') +
      '<div class="kb-val">' + U.rp(l.estimasiNilai) + '</div>' +
      (l.kebutuhan && l.kebutuhan.length
        ? '<div class="kb-sub">' + U.esc(U.potong(l.kebutuhan.map(BIZ.svcNama).join(', '), 40)) + '</div>' : '') +
      '<div class="kb-foot">' +
        '<span class="' + (telat ? 'kb-telat' : 'kb-sub') + '">' +
          (l.followUpAt ? (telat ? '⚠ ' : '🕐 ') + U.relatif(l.followUpAt) : I18N.t('— belum dijadwalkan')) + '</span>' +
        '<div class="spacer"></div>' +
        (CRM.tahapSebelum(l.tahap) ? '<button class="kb-b" data-act="mundur" data-id="' + l.id + '" title="Mundur">‹</button>' : '') +
        '<button class="kb-b" data-act="maju" data-id="' + l.id + '" title="Tahap berikutnya">›</button>' +
      '</div>' +
      (akt ? '<div class="kb-akt">' + ((CRM.tipeAktivitas(akt.tipe) || {}).ic || '') + ' ' +
        U.esc(U.potong(akt.judul, 32)) + '</div>' : '') +
      '</div>';
  }

  function daftarLead() {
    var list = U.sortBy(DB.all('leads').filter(function (l) {
      return filterSumber === 'semua' || l.sumber === filterSumber; }),
      function (l) { return l.tahapAt || l.createdAt; }, true);

    return UI.card({ flush: true, body: UI.table([
      { h: 'No. / Masuk', r: function (l) { return '<div class="code">' + U.esc(l.no) + '</div>' +
        '<div class="tbl-sub">' + U.sejak(l.createdAt) + '</div>'; } },
      { h: 'Prospek', r: function (l) { return '<div class="row">' + UI.avatar(l.perusahaan || l.nama, 'sm') +
        '<div><div class="tbl-title">' + U.esc(l.perusahaan || l.nama) + '</div>' +
        '<div class="tbl-sub">' + U.esc(l.nama) + ' • ' + U.phoneDisplay(l.telp) + '</div></div></div>'; } },
      { h: I18N.t('Sumber'), r: function (l) { var s = CRM.sumber(l.sumber) || {};
        return '<span class="chip">' + (s.ic || '') + ' ' + U.esc(s.nama || l.sumber) + '</span>'; } },
      { h: 'Kebutuhan', r: function (l) { return '<span class="tbl-sub">' +
        U.esc(U.potong((l.kebutuhan || []).map(BIZ.svcNama).join(', ') || '—', 34)) + '</span>'; } },
      { h: 'Estimasi', cls: 'num', r: function (l) { return '<b>' + U.rp(l.estimasiNilai) + '</b>' +
        '<div class="tbl-sub">bobot ' + U.rpShort(CRM.nilaiTertimbang(l)) + '</div>'; } },
      { h: I18N.t('Tahap'), r: function (l) { return UI.statusChip('lead', l.tahap); } },
      { h: 'Follow-up', r: function (l) {
        if (!l.followUpAt || ['menang', 'kalah'].indexOf(l.tahap) >= 0) return '<span class="tbl-sub">—</span>';
        var telat = l.followUpAt < U.today();
        return '<span style="' + (telat ? 'color:var(--danger);font-weight:600' : '') + '">' +
          U.relatif(l.followUpAt) + '</span>'; } },
      { h: '', cls: 'act', r: function (l) {
        return '<button class="btn btn--ghost btn--sm" data-act="wa-lead" data-id="' + l.id + '">💬</button>' +
          ' <button class="btn btn--ghost btn--sm" data-act="detail-lead" data-id="' + l.id + '">' + I18N.t('Detail') + '</button>'; } }
    ], list, { icon: '🌱', judul: I18N.t('Belum ada prospek'), teks: I18N.t('Tambahkan prospek pertama Anda dengan tombol di atas.') }) });
  }

  function corongLead() {
    var corong = CRM.corong();
    var maks = Math.max.apply(null, corong.map(function (c) { return c.jumlah; }).concat([1]));
    var st = CRM.statistik();
    var sumberList = U.sortBy(Object.keys(st.perSumber).map(function (k) {
      return Object.assign({ id: k }, st.perSumber[k]); }), function (x) { return x.total; }, true);

    return '<div class="grid g-2">' +
      UI.card({ title: I18N.t('Corong penjualan'), sub: I18N.t('Jumlah prospek per tahap'),
        body: corong.map(function (c) {
          return '<div style="padding:7px 0">' +
            '<div class="row"><span style="font-size:12.8px">' + c.tahap.ic + ' ' + U.esc(c.tahap.nama) + '</span>' +
            '<div class="spacer"></div><b style="font-size:12.8px">' + c.jumlah + '</b>' +
            '<span class="tbl-sub" style="margin-left:8px;width:74px;text-align:right">' + U.rpShort(c.nilai) + '</span></div>' +
            '<div class="funnel"><i style="width:' + Math.max(3, c.jumlah / maks * 100) + '%;' +
            'background:var(--' + (c.tahap.id === 'kalah' ? 'danger' : c.tahap.id === 'menang' ? 'ok' : 'brand') + ')"></i></div>' +
            '</div>';
        }).join('') }) +

      UI.card({ title: 'Sumber prospek', sub: I18N.t('Mana yang paling menghasilkan'), flush: true,
        body: sumberList.length ? '<div class="mini-list">' + sumberList.map(function (s) {
          var src = CRM.sumber(s.id) || {};
          var rasio = s.total ? Math.round(s.menang / s.total * 100) : 0;
          return '<div class="mini-item"><div class="prd__mini">' + (src.ic || '•') + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(src.nama || s.id) + '</b>' +
            '<small>' + s.total + ' prospek • ' + s.menang + ' menang (' + rasio + '%)</small>' +
            '<div class="mt-1">' + UI.progress(rasio, rasio >= 50 ? 'ok' : rasio >= 25 ? '' : 'warn') + '</div></div>' +
            '<div class="right"><b>' + U.rpShort(s.nilai) + '</b><small>nilai menang</small></div></div>';
        }).join('') + '</div>' : UI.empty('📊', I18N.t('Belum ada data'), '') }) +
    '</div>';
  }

  /* ================================================================ DETAIL PROSPEK */
  function detailLead(leadId) {
    var l = CRM.lead(leadId);
    if (!l) { UI.toast(I18N.t('Prospek tidak ditemukan'), 'err'); return; }
    var akt = CRM.aktivitasUntuk({ leadId: leadId });
    var t = CRM.tahap(l.tahap);

    var tombolTahap = CRM.TAHAP.map(function (x) {
      return '<button class="btn btn--sm ' + (x.id === l.tahap ? '' : 'btn--ghost') + '" ' +
        'data-act="set-tahap" data-id="' + leadId + '" data-t="' + x.id + '">' + x.ic + ' ' + U.esc(x.nama) + '</button>';
    }).join(' ');

    UI.modal({
      title: l.perusahaan || l.nama, sub: l.no + ' • ' + CRM.sumberNama(l.sumber), size: 'wide',
      body:
        '<div class="row wrap mb-3">' + UI.statusChip('lead', l.tahap) +
          '<span class="chip chip--brand">' + U.rp(l.estimasiNilai) + '</span>' +
          '<span class="chip chip--muted">peluang ' + (t ? t.prob : 0) + '% → ' +
            U.rp(CRM.nilaiTertimbang(l)) + '</span>' +
          (l.clientId ? '<span class="chip chip--ok">' + I18N.t('Sudah jadi klien') + '</span>' : '') +
        '</div>' +
        '<dl class="kv">' +
          '<dt>' + I18N.t('Kontak') + '</dt><dd>' + U.esc(l.nama) + ' • ' + U.phoneDisplay(l.telp) +
            (l.email ? '<br>' + U.esc(l.email) : '') + '</dd>' +
          '<dt>' + I18N.t('Alamat') + '</dt><dd>' + (l.alamat ? U.esc(l.alamat) : '<span class="tbl-sub">—</span>') + '</dd>' +
          '<dt>' + I18N.t('Jenis') + '</dt><dd>' + U.esc(l.tipe) + '</dd>' +
          '<dt>Kebutuhan</dt><dd>' + ((l.kebutuhan || []).map(function (id) {
            var s = BIZ.svc(id); return s ? '<span class="chip">' + s.icon + ' ' + U.esc(s.nama) + '</span>' : ''; })
            .join(' ') || '<span class="tbl-sub">' + I18N.t('belum dicatat') + '</span>') + '</dd>' +
          '<dt>' + I18N.t('Penanggung jawab') + '</dt><dd>' + U.esc(BIZ.nama(l.ownerId)) + '</dd>' +
          '<dt>Follow-up</dt><dd>' + (l.followUpAt
            ? U.tglPanjang(l.followUpAt) + ' <span class="tbl-sub">(' + U.relatif(l.followUpAt) + ')</span>'
            : '<span class="tbl-sub">' + I18N.t('belum dijadwalkan') + '</span>') + '</dd>' +
          (l.catatan ? '<dt>' + I18N.t('Catatan') + '</dt><dd>' + U.esc(l.catatan) + '</dd>' : '') +
          (l.alasanKalah ? '<dt>Alasan kalah</dt><dd style="color:var(--danger)">' + U.esc(l.alasanKalah) + '</dd>' : '') +
        '</dl>' +

        Panel.seksi('Pindahkan Tahap', '<div class="row wrap" style="gap:6px">' + tombolTahap + '</div>') +

        Panel.seksi('Riwayat Aktivitas (' + akt.length + ')',
          '<button class="btn btn--soft btn--sm mb-2" data-act="catat" data-lead="' + leadId + '">＋ Catat aktivitas</button>' +
          (akt.length ? '<div class="timeline">' + akt.map(function (a) {
            var ta = CRM.tipeAktivitas(a.tipe) || {};
            return '<div class="tl-item ' + (a.selesai ? 'done' : 'now') + '">' +
              '<b>' + (ta.ic || '') + ' ' + U.esc(a.judul || ta.nama) + '</b>' +
              '<small>' + U.tglJam(a.at) + ' • ' + U.esc(BIZ.nama(a.byId)) +
              (a.hasil ? ' • ' + UI.statusText('hasil', a.hasil) : '') + '</small>' +
              (a.isi ? '<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px">' + U.esc(a.isi) + '</div>' : '') +
              (a.followUpAt && !a.selesai
                ? '<div class="chip chip--warn mt-1" style="font-size:10.5px">Tindak lanjut ' +
                  U.relatif(a.followUpAt) + '</div>' : '') +
              '</div>';
          }).join('') + '</div>' : '<div class="tbl-sub">' + I18N.t('Belum ada aktivitas tercatat.') + '</div>')),

      foot:
        '<button class="btn btn--wa" data-act="wa-lead" data-id="' + leadId + '">' + I18N.t('💬 Kirim WhatsApp') + '</button>' +
        '<button class="btn btn--ghost" data-act="edit-lead" data-id="' + leadId + '">' + I18N.t('Ubah') + '</button>' +
        (l.tahap === 'menang' && !l.clientId
          ? '<button class="btn" data-act="konversi" data-id="' + leadId + '">' + I18N.t('👤 Jadikan Klien') + '</button>'
          : l.clientId
            ? '<button class="btn btn--ghost" data-act="buka-klien" data-id="' + l.clientId + '">' + I18N.t('Lihat profil klien') + '</button>'
            : '<button class="btn" data-act="buat-quo-lead" data-id="' + leadId + '">' + I18N.t('📄 Buat Penawaran') + '</button>') +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',

      actions: aksiLead(function () { tutupSemua(); detailLead(leadId); })
    });
  }

  function tutupSemua() {
    document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
    document.body.style.overflow = '';
  }

  /** Kumpulan aksi yang dipakai baik di halaman maupun di dalam modal detail. */
  function aksiLead(segarkan) {
    segarkan = segarkan || APP.refresh;
    return {
      'detail-lead': function (el) { detailLead(el.getAttribute('data-id')); },
      'lead-baru': function () { formLead(null); },
      'edit-lead': function (el) { tutupSemua(); formLead(el.getAttribute('data-id')); },
      maju: function (el) {
        var l = CRM.lead(el.getAttribute('data-id'));
        var next = CRM.tahapBerikut(l.tahap);
        if (!next) return;
        if (next === 'menang') { dialogMenang(l.id, segarkan); return; }
        CRM.pindahTahap(l.id, next, aku());
        UI.toast(I18N.t('Dipindah ke') + ' ' + CRM.tahap(next).nama, 'ok');
        segarkan();
      },
      mundur: function (el) {
        var l = CRM.lead(el.getAttribute('data-id'));
        var prev = CRM.tahapSebelum(l.tahap);
        if (!prev) return;
        CRM.pindahTahap(l.id, prev, aku());
        segarkan();
      },
      'set-tahap': function (el) {
        var id = el.getAttribute('data-id'), t = el.getAttribute('data-t');
        if (t === 'kalah') { dialogKalah(id, segarkan); return; }
        if (t === 'menang') { dialogMenang(id, segarkan); return; }
        CRM.pindahTahap(id, t, aku());
        UI.toast('Tahap diperbarui', 'ok');
        segarkan();
      },
      konversi: function (el) {
        var id = el.getAttribute('data-id');
        var k = CRM.konversiKeKlien(id, aku());
        tutupSemua();
        UI.toast(I18N.t('Prospek menjadi klien:') + ' ' + k.nama + ' (kata sandi awal 123456)', 'ok');
        APP.refresh();
      },
      'buka-klien': function (el) { tutupSemua(); detailKlien(el.getAttribute('data-id')); },
      'buat-quo-lead': function (el) {
        var l = CRM.lead(el.getAttribute('data-id'));
        var k = CRM.konversiKeKlien(l.id, aku());
        CRM.pindahTahap(l.id, 'penawaran', aku());
        tutupSemua();
        UI.toast(I18N.t('Klien dibuat dari prospek. Silakan susun penawarannya.'), 'ok');
        APP.go('penawaran');
        setTimeout(function () { ViewAdmin.dialogQuotation(null, null, k.id); }, 60);
      },
      'wa-lead': function (el) { dialogWaLead(el.getAttribute('data-id'), segarkan); },
      catat: function (el) { formAktivitas({ leadId: el.getAttribute('data-lead') }, segarkan); }
    };
  }

  function dialogMenang(leadId, segarkan) {
    var l = CRM.lead(leadId);
    UI.konfirm({ title: 'Tandai ' + (l.perusahaan || l.nama) + ' sebagai MENANG?',
      htmlText: I18N.t('Nilai') + ' <b>' + U.rp(l.estimasiNilai) + '</b> ' + I18N.t('akan dihitung sebagai deal tertutup.') + ' ' +
        I18N.t('Setelah ini Anda bisa mengubah prospek menjadi akun klien.'), okText: '🎉 Ya, menang' })
      .then(function (ya) {
        if (!ya) return;
        CRM.pindahTahap(leadId, 'menang', aku());
        UI.toast('Selamat! Prospek ditandai menang.', 'ok');
        segarkan();
      });
  }

  function dialogKalah(leadId, segarkan) {
    UI.formModal({
      title: 'Tandai prospek kalah', okText: I18N.t('Simpan'),
      fields: [
        { name: 'alasanKalah', label: I18N.t('Alasan'), type: 'select', value: I18N.t('Harga terlalu tinggi'),
          options: [I18N.t('Harga terlalu tinggi'), 'Memilih vendor lain', 'Anggaran ditunda',
                    I18N.t('Tidak ada respons'), 'Kebutuhan berubah', I18N.t('Di luar area layanan'), 'Lainnya'] },
        { name: 'catatan', label: 'Catatan tambahan', type: 'textarea', rows: 2 }
      ]
    }).then(function (d) {
      if (!d) return;
      CRM.pindahTahap(leadId, 'kalah', aku(),
        { alasanKalah: d.alasanKalah + (d.catatan ? ' — ' + d.catatan : '') });
      UI.toast(I18N.t('Prospek ditandai kalah. Alasannya tercatat untuk evaluasi.'), 'ok');
      segarkan();
    });
  }

  function formLead(leadId) {
    var l = leadId ? CRM.lead(leadId) : null;
    var pilih = l ? (l.kebutuhan || []).slice() : [];

    /* Kolom alamat yang sama dengan seluruh aplikasi. Prospek yang naik
       menjadi order membawa alamat ini apa adanya — kalau di sini teks
       bebas, order-nya pun lahir dengan alamat yang tidak bisa dicari. */
    var wLead = (function () {
      if (!window.WILAYAH) return null;
      if (l && WILAYAH.terstruktur(l.wilayah)) return l.wilayah;
      return l && l.alamat ? WILAYAH.dariTeksLama(l.alamat) : WILAYAH.kosong();
    })();

    UI.modal({
      title: l ? I18N.t('Ubah prospek') + ' ' + l.no : 'Prospek Baru', size: 'wide',
      body:
        '<div class="inline-2">' +
          UI.field({ name: 'nama', label: I18N.t('Nama kontak'), value: l ? l.nama : '', required: true }) +
          UI.field({ name: 'perusahaan', label: I18N.t('Perusahaan (kosongkan bila perorangan)'), value: l ? l.perusahaan : '' }) +
        '</div>' +
        '<div class="inline-2">' +
          UI.field({ name: 'telp', label: I18N.t('No. WhatsApp'), value: l ? l.telp : '', required: true, placeholder: '08xxxxxxxxxx' }) +
          UI.field({ name: 'email', label: I18N.t('Email'), type: 'email', value: l ? l.email : '' }) +
        '</div>' +
        '<div class="mcs-fs">' + I18N.t('Alamat / lokasi') +
          '<span>' + I18N.t('Boleh dikosongkan selama prospeknya belum jelas.') + '</span></div>' +
        WILAYAH.fields(wLead, { wajib: false }).map(function (fl) { return UI.field(fl); }).join('') +
        '<div class="inline-3">' +
          UI.field({ name: 'sumber', label: 'Sumber prospek', type: 'select', value: l ? l.sumber : 'whatsapp',
            options: CRM.SUMBER.map(function (s) { return { value: s.id, label: s.ic + ' ' + s.nama }; }) }) +
          UI.field({ name: 'tipe', label: 'Jenis bangunan', type: 'select', value: l ? l.tipe : 'korporat',
            options: [{ value: 'korporat', label: 'Gedung / kantor' }, { value: 'ruko', label: 'Ruko' },
                      { value: 'rumah', label: I18N.t('Rumah') }, { value: 'pabrik', label: 'Pabrik / gudang' }] }) +
          UI.field({ name: 'estimasiNilai', label: 'Estimasi nilai (Rp)', type: 'number',
            value: l ? l.estimasiNilai : 0 }) +
        '</div>' +
        '<div class="inline-2">' +
          UI.field({ name: 'ownerId', label: I18N.t('Penanggung jawab'), type: 'select', value: l ? l.ownerId : aku(),
            options: BIZ.usersByRole('admin').concat(BIZ.usersByRole('supervisor')).map(function (u) {
              return { value: u.id, label: u.nama }; }) }) +
          UI.field({ name: 'followUpAt', label: I18N.t('Jadwal follow-up'), type: 'date',
            value: l ? l.followUpAt : U.iso(U.addDays(new Date(), 1)) }) +
        '</div>' +
        '<div class="field"><label>' + I18N.t('Layanan yang dibutuhkan') + '</label>' +
          '<div style="max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 11px">' +
          DB.all('services').filter(function (s) { return s.tipe === 'layanan'; }).map(function (s) {
            return '<label class="check" style="padding:4px 0"><input type="checkbox" data-change="keb" data-id="' +
              s.id + '"' + (pilih.indexOf(s.id) >= 0 ? ' checked' : '') + '>' +
              '<span>' + s.icon + ' ' + U.esc(s.nama) + '</span></label>'; }).join('') + '</div></div>' +
        UI.field({ name: 'catatan', label: I18N.t('Catatan'), type: 'textarea', rows: 2, value: l ? l.catatan : '' }),
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">' + (l ? 'Simpan Perubahan' : I18N.t('Simpan Prospek')) + '</button>',
      onMount: function (back) { WILAYAH.pasang(back); },
      actions: {
        keb: function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) pilih.push(id); else pilih = pilih.filter(function (x) { return x !== id; });
        },
        simpan: function (el) {
          var f = U.readForm(el.closest('.modal'));
          if (!f.nama || !f.telp) { UI.toast(I18N.t('Nama dan nomor WhatsApp wajib diisi'), 'err'); return; }
          var wil = WILAYAH.dariForm(f);
          /* Sama seperti di layar admin: hasil urai alamat lama boleh jadi
             belum lengkap, jadi yang diperiksa dan disimpan hanya bila
             blok alamatnya memang disunting. */
          var disunting = JSON.stringify(wil) !== JSON.stringify(wLead || WILAYAH.kosong());
          if (disunting) {
            var salahAlamat = WILAYAH.periksa(wil, { wajib: false });
            if (salahAlamat) { UI.toast(salahAlamat, 'err'); return; }
          }
          ['negara', 'l1', 'l2', 'l3', 'l4', 'kodePos', 'jalan', 'patokan']
            .forEach(function (x) { delete f[x]; });
          if (disunting) {
            f.wilayah = WILAYAH.terisi(wil) ? wil : null;
            f.alamat = f.wilayah ? WILAYAH.teks(wil, { denganNegara: false }) : '';
          } else {
            f.wilayah = (l && l.wilayah) || null;
            f.alamat = (l && l.alamat) || '';
          }
          f.kebutuhan = pilih;
          if (l) { DB.update('leads', l.id, f); UI.toast('Prospek diperbarui', 'ok'); }
          else { CRM.buatLead(f, aku()); UI.toast(I18N.t('Prospek ditambahkan ke pipeline'), 'ok'); }
          tutup(el); APP.refresh();
        }
      }
    });
  }

  function dialogWaLead(leadId, segarkan) {
    var l = CRM.lead(leadId);
    var tpl = l.tahap === 'baru' ? 'lead_sapaan' : 'lead_follow_up';
    UI.modal({
      title: I18N.t('Kirim WhatsApp ke') + ' ' + l.nama, sub: U.phoneDisplay(l.telp),
      body: '<div class="field"><label>' + I18N.t('Pilih template') + '</label>' +
        '<select class="select" id="wa-tpl" data-change="ganti">' +
        [['lead_sapaan', 'Sapaan pertama'], ['lead_follow_up', 'Tindak lanjut'],
         ['lead_penawaran_khusus', I18N.t('Penawaran khusus')]].map(function (o) {
          return '<option value="' + o[0] + '"' + (tpl === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="wa-thread"><div class="wa-msg" id="wa-pratinjau">' +
        U.esc(WA.render(tpl, { leadId: leadId })) + '</div></div>' +
        '<div class="field mt-3"><label>Jadwalkan tindak lanjut berikutnya</label>' +
        '<input class="input" type="date" id="wa-fu" value="' + U.iso(U.addDays(new Date(), 3)) + '"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn btn--wa" data-act="kirim">' + I18N.t('💬 Buka WhatsApp &amp; catat') + '</button>',
      actions: {
        ganti: function (el) {
          U.$('#wa-pratinjau').textContent = WA.render(el.value, { leadId: leadId });
        },
        kirim: function (el) {
          var t = U.$('#wa-tpl').value, fu = U.$('#wa-fu').value;
          var pesan = WA.render(t, { leadId: leadId });
          WA.chat(l.telp, pesan);
          CRM.catatAktivitas({ leadId: leadId, tipe: 'whatsapp', arah: 'keluar',
            judul: WA.LABEL[t] || I18N.t('Pesan WhatsApp'), isi: U.potong(pesan.replace(/\n/g, ' '), 140),
            hasil: 'terhubung', followUpAt: fu || null, selesai: !fu }, aku());
          if (fu) DB.update('leads', leadId, { followUpAt: fu });
          if (l.tahap === 'baru') CRM.pindahTahap(leadId, 'kontak', aku());
          tutup(el);
          UI.toast('WhatsApp dibuka & aktivitas tercatat', 'ok');
          segarkan();
        }
      }
    });
  }

  /* ================================================================ AGENDA */
  function renderAgenda() {
    var ag = CRM.agenda();
    var tanpa = CRM.tanpaTindakLanjut();

    function blok(judul, list, warna, kosong) {
      return UI.card({ cls: 'mb-3', title: judul, sub: list.length + ' tugas', flush: true,
        body: list.length ? '<div class="mini-list">' + list.map(function (a) {
          var ta = CRM.tipeAktivitas(a.tipe) || {};
          var l = a.leadId ? CRM.lead(a.leadId) : null;
          var c = a.clientId ? BIZ.user(a.clientId) : null;
          var nama = l ? (l.perusahaan || l.nama) : (c ? (c.perusahaan || c.nama) : '—');
          return '<div class="mini-item">' +
            '<div class="prd__mini">' + (ta.ic || '📝') + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(nama) + '</b>' +
            '<small>' + U.esc(a.judul || ta.nama) + ' • dijadwalkan ' + U.tgl(a.followUpAt) +
            ' <span style="color:var(--' + warna + ')">(' + U.relatif(a.followUpAt) + ')</span></small>' +
            (a.isi ? '<div class="tbl-sub" style="margin-top:3px">' + U.esc(U.potong(a.isi, 70)) + '</div>' : '') +
            '</div>' +
            '<div class="right"><div class="row" style="gap:5px;justify-content:flex-end">' +
            (l ? '<button class="btn btn--ghost btn--sm" data-act="detail-lead" data-id="' + l.id + '">' + I18N.t('Buka') + '</button>'
               : c ? '<button class="btn btn--ghost btn--sm" data-act="detail-klien" data-id="' + c.id + '">' + I18N.t('Buka') + '</button>' : '') +
            '<button class="btn btn--sm" data-act="selesai-akt" data-id="' + a.id + '">' + I18N.t('✓ Selesai') + '</button>' +
            '</div></div></div>';
        }).join('') + '</div>' : UI.empty('✅', kosong || I18N.t('Tidak ada tugas'), '') });
    }

    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Terlambat'), value: ag.terlambat.length, icon: '🔴',
        meta: ag.terlambat.length ? 'segera hubungi' : 'bersih' }) +
      UI.stat({ label: I18N.t('Hari ini'), value: ag.hariIni.length, icon: '📅', meta: U.tglPanjang(new Date()) }) +
      UI.stat({ label: I18N.t('14 hari ke depan'), value: ag.mendatang.length, icon: '🗓️', meta: I18N.t('sudah terjadwal') }) +
      UI.stat({ label: I18N.t('Prospek tanpa jadwal'), value: tanpa.length, icon: '⚠️',
        meta: tanpa.length ? 'berisiko terlupakan' : I18N.t('semua terjadwal') }) +
    '</div>' +

    (tanpa.length ? UI.card({ cls: 'mb-3', title: '⚠️ Prospek tanpa tindak lanjut terjadwal',
      sub: 'Diam ' + 5 + ' ' + I18N.t('hari atau lebih'), flush: true,
      body: '<div class="mini-list">' + tanpa.map(function (l) {
        return '<div class="mini-item">' + UI.avatar(l.perusahaan || l.nama, 'sm') +
          '<div style="min-width:0;flex:1"><b>' + U.esc(l.perusahaan || l.nama) + '</b>' +
          '<small>' + UI.statusText('lead', l.tahap) + ' • ' + U.rp(l.estimasiNilai) + '</small></div>' +
          '<div class="right"><div class="row" style="gap:5px;justify-content:flex-end">' +
          '<button class="btn btn--wa btn--sm" data-act="wa-lead" data-id="' + l.id + '">💬</button>' +
          '<button class="btn btn--sm" data-act="jadwalkan" data-id="' + l.id + '">Jadwalkan</button>' +
          '</div></div></div>';
      }).join('') + '</div>' }) : '') +

    blok('🔴 Terlambat', ag.terlambat, 'danger', I18N.t('Tidak ada follow-up yang terlewat')) +
    blok(I18N.t('📅 Hari ini'), ag.hariIni, 'warn', I18N.t('Tidak ada agenda hari ini')) +
    blok(I18N.t('🗓️ 14 hari ke depan'), ag.mendatang, 'muted', I18N.t('Belum ada agenda mendatang'));
  }

  function formAktivitas(ref, segarkan) {
    var judulRef = ref.leadId ? (function () { var l = CRM.lead(ref.leadId); return l.perusahaan || l.nama; })()
      : BIZ.klien(ref.clientId);
    UI.formModal({
      title: 'Catat aktivitas', sub: judulRef, okText: I18N.t('Simpan'),
      fields: [
        { name: 'tipe', label: I18N.t('Jenis'), type: 'select', value: 'telepon',
          options: CRM.TIPE_AKTIVITAS.map(function (t) { return { value: t.id, label: t.ic + ' ' + t.nama }; }) },
        { name: 'arah', label: 'Arah', type: 'select', value: 'keluar',
          options: [{ value: 'keluar', label: I18N.t('Kami menghubungi') }, { value: 'masuk', label: I18N.t('Mereka menghubungi') }] },
        { name: 'judul', label: I18N.t('Ringkasan'), required: true, placeholder: I18N.t('mis. Telepon konfirmasi jadwal survei') },
        { name: 'isi', label: I18N.t('Catatan lengkap'), type: 'textarea', rows: 3 },
        { name: 'hasil', label: I18N.t('Hasil'), type: 'select', value: 'terhubung',
          options: [{ value: 'terhubung', label: I18N.t('Terhubung') }, { value: 'tidak_angkat', label: I18N.t('Tidak diangkat') },
                    { value: 'dijadwalkan', label: I18N.t('Dijadwalkan') }, { value: 'ditolak', label: I18N.t('Ditolak') }] },
        { name: 'followUpAt', label: I18N.t('Tindak lanjut berikutnya (kosongkan bila selesai)'), type: 'date',
          value: U.iso(U.addDays(new Date(), 3)) }
      ]
    }).then(function (d) {
      if (!d) return;
      CRM.catatAktivitas(Object.assign({}, ref, d, { selesai: !d.followUpAt }), aku());
      if (ref.leadId && d.followUpAt) DB.update('leads', ref.leadId, { followUpAt: d.followUpAt });
      UI.toast('Aktivitas tercatat', 'ok');
      (segarkan || APP.refresh)();
    });
  }

  /* ================================================================ PELANGGAN 360° */
  var fSegmen = 'semua';

  function renderPelanggan() {
    var semua = BIZ.usersByRole('client');
    var list = semua.filter(function (c) { return fSegmen === 'semua' || CRM.segmen(c.id) === fSegmen; });
    var hitung = CRM.statistik().segmenKlien;

    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Total pelanggan'), value: semua.length, icon: '🧑‍💼',
        meta: DB.all('leads').filter(function (l) { return l.clientId; }).length + ' ' + I18N.t('berasal dari prospek') }) +
      UI.stat({ label: I18N.t('Nilai seluruh pelanggan'), small: true,
        valueHTML: U.rpShort(U.sum(semua, function (c) { return CRM.nilaiSeumurHidup(c.id); })), icon: '💎',
        meta: I18N.t('akumulasi jasa + toko') }) +
      UI.stat({ label: 'Perlu perhatian', value: hitung.berisiko || 0, icon: '⚠️',
        meta: I18N.t('komplain, rating rendah, atau tunggakan') }) +
      UI.stat({ label: I18N.t('Dorman'), value: hitung.dorman || 0, icon: '😴',
        meta: 'tak ada transaksi >120 hari' }) +
    '</div>' +

    UI.tabs([{ key: 'semua', label: I18N.t('Semua'), n: semua.length }].concat(
      Object.keys(CRM.SEGMEN).map(function (k) {
        return { key: k, label: CRM.SEGMEN[k].nama, n: hitung[k] || 0 }; })),
      fSegmen, 'tab-segmen') +

    (fSegmen !== 'semua' ? UI.alert('info', U.esc(CRM.SEGMEN[fSegmen].ket) +
      '. <a href="#" data-act="ke-kampanye" data-seg="' + fSegmen + '">' + I18N.t('Kirim kampanye ke segmen ini →') + '</a>', '🎯') +
      '<div class="mb-3"></div>' : '') +

    UI.card({ flush: true, title: I18N.t('Daftar Pelanggan'), sub: list.length + ' ditampilkan',
      tools: '<button class="btn btn--sm" data-act="klien-baru">' + I18N.t('＋ Pelanggan Baru') + '</button>', body: UI.table([
      { h: 'Pelanggan', r: function (c) { return '<div class="row">' + UI.avatar(c.perusahaan || c.nama, 'sm') +
        '<div><div class="tbl-title">' + U.esc(c.perusahaan || c.nama) + '</div>' +
        '<div class="tbl-sub">' + U.esc(c.nama) + ' • ' + U.phoneDisplay(c.telp) + '</div></div></div>'; } },
      { h: I18N.t('Segmen'), r: function (c) { return UI.statusChip('segmen', CRM.segmen(c.id)); } },
      { h: I18N.t('Order'), cls: 'num', r: function (c) { var p = CRM.profil(c.id);
        return p.order.length + '<div class="tbl-sub">' + p.belanja.length + ' belanja</div>'; } },
      { h: I18N.t('Nilai rupiah'), cls: 'num', r: function (c) { return '<b>' + U.rpShort(CRM.nilaiSeumurHidup(c.id)) + '</b>' +
        (CRM.piutang(c.id) ? '<div class="tbl-sub" style="color:var(--danger)">' + I18N.t('piutang') + ' ' +
          U.rpShort(CRM.piutang(c.id)) + '</div>' : ''); } },
      { h: I18N.t('Terakhir aktif'), r: function (c) { var t = CRM.terakhirAktif(c.id);
        return t ? U.tgl(t) + '<div class="tbl-sub">' + U.relatif(t) + '</div>' : '<span class="tbl-sub">—</span>'; } },
      { h: 'Rating', r: function (c) { var p = CRM.profil(c.id);
        return p.rataRating ? UI.stars(Math.round(p.rataRating)) : '<span class="tbl-sub">—</span>'; } },
      { h: '', cls: 'act', r: function (c) {
        return '<button class="btn btn--ghost btn--sm" data-act="wa-klien" data-id="' + c.id + '">💬</button>' +
          ' <button class="btn btn--ghost btn--sm" data-act="detail-klien" data-id="' + c.id + '">Profil 360°</button>'; } }
    ], list, { icon: '🧑‍💼', judul: I18N.t('Tidak ada pelanggan pada segmen ini') }) });
  }

  function detailKlien(clientId) {
    var p = CRM.profil(clientId);
    var c = p.user;
    if (!c) { UI.toast(I18N.t('Pelanggan tidak ditemukan'), 'err'); return; }

    UI.modal({
      title: c.perusahaan || c.nama, sub: c.nama + ' • ' + U.phoneDisplay(c.telp), size: 'wide',
      body:
        '<div class="row wrap mb-3">' + UI.statusChip('segmen', p.segmen) +
          '<span class="chip chip--brand">' + I18N.t('Nilai') + ' ' + U.rp(p.nilai) + '</span>' +
          (p.piutang ? '<span class="chip chip--danger">Piutang ' + U.rp(p.piutang) + '</span>' : '') +
          (p.rataRating ? '<span class="chip chip--muted">' + p.rataRating + ' ★</span>' : '') +
          (p.leadAsal ? '<span class="chip">' + I18N.t('dari') + ' ' + U.esc(CRM.sumberNama(p.leadAsal.sumber)) + '</span>' : '') +
        '</div>' +

        '<div class="grid g-4 mb-3">' +
          UI.stat({ label: I18N.t('Pekerjaan'), value: p.order.length, small: true,
            meta: p.orderSelesai + ' selesai' }) +
          UI.stat({ label: I18N.t('Belanja toko'), value: p.belanja.length, small: true,
            meta: U.rpShort(U.sum(p.belanja, function (x) { return x.total; })) }) +
          UI.stat({ label: I18N.t('Sudah dibayar'), small: true, valueHTML: U.rpShort(p.dibayar) }) +
          UI.stat({ label: I18N.t('Terakhir aktif'), small: true,
            valueHTML: p.terakhirAktif ? U.tgl(p.terakhirAktif) : '—',
            meta: p.terakhirAktif ? U.relatif(p.terakhirAktif) : '' }) +
        '</div>' +

        '<dl class="kv">' +
          '<dt>' + I18N.t('Email') + '</dt><dd>' + U.esc(c.email) + '</dd>' +
          '<dt>' + I18N.t('Alamat') + '</dt><dd>' + U.esc(c.alamat || '—') + '</dd>' +
          '<dt>' + I18N.t('Jenis') + '</dt><dd>' + U.esc(c.tipe || '—') + '</dd>' +
        '</dl>' +

        Panel.seksi(I18N.t('Riwayat Pekerjaan'), p.order.length
          ? '<div class="mini-list" style="margin:0 -18px">' +
            U.sortBy(p.order, function (o) { return o.tgl; }, true).slice(0, 6).map(function (o) {
              return '<div class="mini-item"><div style="min-width:0;flex:1"><b>' +
                U.esc(U.potong(o.judul, 40)) + '</b><small>' + U.esc(o.no) + ' • ' + U.tgl(o.tgl) + '</small></div>' +
                '<div class="right">' + UI.statusChip('order', o.status) +
                '<div class="tbl-sub mt-1">' + U.rp(o.nilai) + '</div></div></div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + I18N.t('Belum ada pekerjaan.') + '</div>') +

        Panel.seksi(I18N.t('Belanja Toko'), p.belanja.length
          ? '<div class="mini-list" style="margin:0 -18px">' + p.belanja.slice(0, 5).map(function (b) {
              return '<div class="mini-item"><div class="prd__mini">🛒</div>' +
                '<div style="min-width:0;flex:1"><b>' + U.esc(b.no) + '</b><small>' +
                (b.items || []).length + ' jenis • ' + U.tgl(b.createdAt) + '</small></div>' +
                '<div class="right">' + UI.statusChip('shop', b.status) +
                '<div class="tbl-sub mt-1">' + U.rp(b.total) + '</div></div></div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + I18N.t('Belum pernah belanja di toko.') + '</div>') +

        (p.komplain.length ? Panel.seksi('Komplain', p.komplain.map(function (k) {
          return '<div class="order-card mb-2"><div class="row">' + UI.statusChip('complaint', k.status) +
            '<div class="spacer"></div><span class="tbl-sub">' + U.sejak(k.at) + '</span></div>' +
            '<p style="font-size:12.6px;margin:6px 0 0">' + U.esc(U.potong(k.isi, 160)) + '</p></div>';
        }).join('')) : '') +

        Panel.seksi('Aktivitas CRM (' + p.aktivitas.length + ')',
          '<button class="btn btn--soft btn--sm mb-2" data-act="catat-klien" data-id="' + clientId + '">＋ Catat aktivitas</button>' +
          (p.aktivitas.length ? '<div class="timeline">' + p.aktivitas.slice(0, 10).map(function (a) {
            var ta = CRM.tipeAktivitas(a.tipe) || {};
            return '<div class="tl-item ' + (a.selesai ? 'done' : 'now') + '">' +
              '<b>' + (ta.ic || '') + ' ' + U.esc(a.judul || ta.nama) + '</b>' +
              '<small>' + U.tglJam(a.at) + ' • ' + U.esc(BIZ.nama(a.byId)) + '</small>' +
              (a.isi ? '<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px">' + U.esc(a.isi) + '</div>' : '') +
              '</div>';
          }).join('') + '</div>' : '<div class="tbl-sub">' + I18N.t('Belum ada aktivitas CRM.') + '</div>')),

      foot: '<button class="btn btn--wa" data-act="wa-klien" data-id="' + clientId + '">💬 WhatsApp</button>' +
        '<button class="btn btn--ghost" data-act="order-untuk" data-id="' + clientId + '">＋ Order Baru</button>' +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',
      actions: {
        'wa-klien': function (el) { dialogWaKlien(el.getAttribute('data-id')); },
        'catat-klien': function (el) {
          var id = el.getAttribute('data-id');
          tutupSemua();
          formAktivitas({ clientId: id }, function () { detailKlien(id); });
        },
        'order-untuk': function (el) {
          var id = el.getAttribute('data-id'), u = BIZ.user(id);
          tutupSemua();
          APP.go('jadwal');
          setTimeout(function () {
            var a = BIZ.alamatUtama(u);
            ViewAdmin.dialogOrder(null, { clientId: id, alamat: u.alamat || '',
              wilayah: (a && WILAYAH.terstruktur(a.wilayah)) ? a.wilayah : null });
          }, 60);
        }
      }
    });
  }

  function dialogWaKlien(clientId) {
    var c = BIZ.user(clientId), seg = CRM.segmen(clientId);
    var tpl = seg === 'dorman' ? 'pelanggan_reaktivasi' : seg === 'setia' ? 'pelanggan_terima_kasih' : 'pelanggan_reaktivasi';
    UI.modal({
      title: I18N.t('Kirim WhatsApp'), sub: (c.perusahaan || c.nama) + ' • ' + U.phoneDisplay(c.telp),
      body: '<div class="field"><label>Template</label><select class="select" id="wk-tpl" data-change="ganti">' +
        [['pelanggan_reaktivasi', I18N.t('Reaktivasi pelanggan')], ['pelanggan_terima_kasih', I18N.t('Apresiasi pelanggan setia')]]
          .map(function (o) { return '<option value="' + o[0] + '"' + (tpl === o[0] ? ' selected' : '') +
            '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="wa-thread"><div class="wa-msg" id="wk-pratinjau">' +
        U.esc(WA.render(tpl, { clientId: clientId }, null, clientId)) + '</div></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn btn--wa" data-act="kirim">' + I18N.t('💬 Buka WhatsApp &amp; catat') + '</button>',
      actions: {
        ganti: function (el) { U.$('#wk-pratinjau').textContent = WA.render(el.value, { clientId: clientId }, null, clientId); },
        kirim: function (el) {
          var t = U.$('#wk-tpl').value, pesan = WA.render(t, { clientId: clientId }, null, clientId);
          WA.chat(c.telp, pesan);
          CRM.catatAktivitas({ clientId: clientId, tipe: 'whatsapp', arah: 'keluar',
            judul: WA.LABEL[t], isi: U.potong(pesan.replace(/\n/g, ' '), 140), hasil: 'terhubung', selesai: true }, aku());
          tutup(el); UI.toast('WhatsApp dibuka & aktivitas tercatat', 'ok'); APP.refresh();
        }
      }
    });
  }

  /* ================================================================ KAMPANYE */
  var kampanyeSegmen = 'dorman';
  var kampanyeTpl = 'pelanggan_reaktivasi';
  var kampanyePesan = null;

  function renderKampanye() {
    var target = CRM.pelangganSegmen(kampanyeSegmen);
    var contoh = target[0];
    var pratinjau = kampanyePesan !== null ? kampanyePesan
      : (contoh ? WA.render(kampanyeTpl, { clientId: contoh.id }, null, contoh.id) : I18N.t('(belum ada penerima pada segmen ini)'));

    return UI.alert('brand', '<b>' + I18N.t('Kampanye membuat draf pesan untuk setiap penerima') + '</b> ' + I18N.t('dan memasukkannya ke') + ' ' +
      I18N.t('WhatsApp Outbox — tidak langsung terkirim. Anda tetap menekan kirim satu per satu, jadi tidak ada') + ' ' +
      I18N.t('risiko nomor diblokir karena blast massal.'), '📣') + '<div class="mb-3"></div>' +

    '<div class="grid g-1-2">' +
      UI.card({ title: 'Sasaran', sub: target.length + ' penerima',
        body: '<div class="field"><label>' + I18N.t('Segmen pelanggan') + '</label>' +
          '<select class="select" data-change="seg-kampanye">' +
          [{ id: 'semua', nama: I18N.t('Semua pelanggan'), ket: '' }].concat(
            Object.keys(CRM.SEGMEN).map(function (k) {
              return { id: k, nama: CRM.SEGMEN[k].nama, ket: CRM.SEGMEN[k].ket }; }))
            .map(function (s) {
              var n = CRM.pelangganSegmen(s.id).length;
              return '<option value="' + s.id + '"' + (kampanyeSegmen === s.id ? ' selected' : '') + '>' +
                U.esc(s.nama) + ' (' + n + ')</option>'; }).join('') +
          '</select>' +
          (CRM.SEGMEN[kampanyeSegmen] ? '<div class="hint">' + U.esc(CRM.SEGMEN[kampanyeSegmen].ket) + '</div>' : '') +
          '</div>' +
          '<div class="field"><label>' + I18N.t('Template pesan') + '</label>' +
          '<select class="select" data-change="tpl-kampanye">' +
          [['pelanggan_reaktivasi', I18N.t('Reaktivasi pelanggan dorman')],
           ['pelanggan_terima_kasih', I18N.t('Apresiasi pelanggan setia')],
           ['kampanye', 'Tulis sendiri']].map(function (o) {
            return '<option value="' + o[0] + '"' + (kampanyeTpl === o[0] ? ' selected' : '') + '>' +
              o[1] + '</option>'; }).join('') + '</select></div>' +
          '<div class="tbl-sub mb-1">' + I18N.t('Penerima') + '</div>' +
          '<div style="max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:10px">' +
          (target.length ? target.map(function (c) {
            return '<div class="mini-item" style="padding:8px 11px">' + UI.avatar(c.perusahaan || c.nama, 'sm') +
              '<div style="min-width:0;flex:1"><b style="font-size:12.4px">' + U.esc(c.perusahaan || c.nama) + '</b>' +
              '<small>' + U.phoneDisplay(c.telp) + '</small></div>' +
              '<div class="right">' + UI.statusChip('segmen', CRM.segmen(c.id)) + '</div></div>';
          }).join('') : '<div class="tbl-sub" style="padding:14px">' + I18N.t('Tidak ada penerima.') + '</div>') +
          '</div>',
        foot: '<button class="btn btn--block" data-act="jalankan-kampanye"' + (target.length ? '' : ' disabled') +
          '>📣 Siapkan ' + target.length + ' ' + I18N.t('pesan ke Outbox') + '</button>' }) +

      UI.card({ title: I18N.t('Pratinjau pesan'), sub: contoh ? I18N.t('Contoh untuk') + ' ' + (contoh.perusahaan || contoh.nama) : '',
        body: (kampanyeTpl === 'kampanye'
          ? '<div class="field"><label>' + I18N.t('Tulis pesan Anda') + '</label>' +
            '<textarea class="textarea" rows="9" data-change="pesan-kampanye" ' +
            'placeholder="Halo, EXOCLEAN sedang ada promo...">' + U.esc(kampanyePesan || '') + '</textarea>' +
            '<div class="hint">' + I18N.t('Pesan yang sama dikirim ke semua penerima. Untuk sapaan personal,') + ' ' +
            I18N.t('pakai salah satu template di sebelah kiri.') + '</div></div>'
          : '') +
          '<div class="wa-thread mt-2"><div class="wa-msg">' + U.esc(pratinjau) + '</div></div>' })
    + '</div>' +

    UI.card({ cls: 'mt-3', title: 'Riwayat kampanye', flush: true,
      body: (function () {
        var k = U.sortBy(DB.where('waOutbox', function (m) { return m.refType === 'kampanye'; }),
          function (m) { return m.createdAt; }, true);
        if (!k.length) return UI.empty('📣', I18N.t('Belum ada kampanye'), I18N.t('Pesan kampanye yang sudah disiapkan akan tercatat di sini.'));
        var grup = U.groupBy(k, function (m) { return m.refId; });
        return '<div class="mini-list">' + Object.keys(grup).map(function (id) {
          var g = grup[id], terkirim = g.filter(function (m) { return m.status === 'terkirim'; }).length;
          return '<div class="mini-item"><div class="prd__mini">📣</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(id) + '</b>' +
            '<small>' + g.length + ' penerima • ' + U.sejak(g[0].createdAt) + '</small>' +
            '<div class="mt-1">' + UI.progress(g.length ? terkirim / g.length * 100 : 0, 'ok') + '</div></div>' +
            '<div class="right"><b>' + terkirim + '/' + g.length + '</b><small>' + I18N.t('terkirim') + '</small></div></div>';
        }).join('') + '</div>';
      })() });
  }

  /* ================================================================ AKSI HALAMAN */
  function aksi(root) {
    U.delegate(root, Object.assign(aksiLead(APP.refresh), {
      'tab-view': function (el) { tampilan = el.getAttribute('data-key'); APP.refresh(); },
      'f-sumber': function (el) { filterSumber = el.value; APP.refresh(); },
      'ke-agenda': function () { APP.go('agenda'); },
      'tab-segmen': function (el) { fSegmen = el.getAttribute('data-key'); APP.refresh(); },
      'detail-klien': function (el) { detailKlien(el.getAttribute('data-id')); },
      'wa-klien': function (el) { dialogWaKlien(el.getAttribute('data-id')); },
      'ke-kampanye': function (el) { kampanyeSegmen = el.getAttribute('data-seg'); APP.go('kampanye'); },

      'selesai-akt': function (el) {
        DB.update('activities', el.getAttribute('data-id'), { selesai: true, selesaiAt: U.nowISO() });
        UI.toast(I18N.t('Tugas ditandai selesai'), 'ok'); APP.refresh();
      },
      jadwalkan: function (el) {
        var id = el.getAttribute('data-id');
        UI.formModal({ title: 'Jadwalkan tindak lanjut', sub: (CRM.lead(id) || {}).nama, okText: I18N.t('Simpan'),
          fields: [
            { name: 'followUpAt', label: I18N.t('Tanggal'), type: 'date', value: U.iso(U.addDays(new Date(), 2)), required: true },
            { name: 'judul', label: 'Rencana', value: 'Telepon tindak lanjut', required: true }
          ] }).then(function (d) {
          if (!d) return;
          CRM.catatAktivitas({ leadId: id, tipe: 'telepon', arah: 'keluar', judul: d.judul,
            hasil: 'dijadwalkan', followUpAt: d.followUpAt, selesai: false }, aku());
          DB.update('leads', id, { followUpAt: d.followUpAt });
          UI.toast('Tindak lanjut dijadwalkan', 'ok'); APP.refresh();
        });
      },

      'seg-kampanye': function (el) { kampanyeSegmen = el.value; APP.refresh(); },
      'tpl-kampanye': function (el) { kampanyeTpl = el.value; kampanyePesan = null; APP.refresh(); },
      'pesan-kampanye': function (el) { kampanyePesan = el.value; },
      'jalankan-kampanye': function () {
        var target = CRM.pelangganSegmen(kampanyeSegmen);
        if (!target.length) { UI.toast(I18N.t('Tidak ada penerima'), 'err'); return; }
        if (kampanyeTpl === 'kampanye' && !(kampanyePesan || '').trim()) {
          UI.toast('Tulis dulu isi pesannya', 'err'); return;
        }
        UI.konfirm({ title: 'Siapkan ' + target.length + ' ' + I18N.t('pesan?'),
          htmlText: I18N.t('Draf pesan untuk') + ' <b>' + target.length + ' penerima</b> ' + I18N.t('akan masuk ke WhatsApp Outbox.') + ' ' +
            I18N.t('Belum ada yang terkirim sampai Anda menekan kirim di sana.'), okText: 'Ya, siapkan' })
          .then(function (ya) {
            if (!ya) return;
            var kode = 'KMP-' + U.iso(new Date()).replace(/-/g, '') + '-' + kampanyeSegmen;
            target.forEach(function (c) {
              var pesan = kampanyeTpl === 'kampanye'
                ? kampanyePesan
                : WA.render(kampanyeTpl, { clientId: c.id }, null, c.id);
              DB.insert('waOutbox', { to: c.id, template: kampanyeTpl, pesan: pesan, status: 'antre',
                refType: 'kampanye', refId: kode, sentAt: null });
              CRM.catatAktivitas({ clientId: c.id, tipe: 'whatsapp', arah: 'keluar',
                judul: 'Kampanye ' + kode, isi: U.potong(pesan.replace(/\n/g, ' '), 120),
                hasil: 'dijadwalkan', selesai: true }, aku());
            });
            DB.log(aku(), 'Menyiapkan kampanye ' + kode + ' untuk ' + target.length + ' pelanggan', 'kampanye', kode);
            UI.toast(target.length + ' ' + I18N.t('pesan masuk ke WhatsApp Outbox'), 'ok');
            APP.go('wa');
          });
      }
    }));
  }

  /* ================================================================ PAGES */
  var pagesAdmin = {
    pipeline: { label: 'Pipeline Prospek', icon: '🎯', grup: 'CRM', sub: 'Corong penjualan',
      render: renderPipeline, mount: aksi,
      badge: function () { return CRM.leadPerTahap('baru').length; } },
    agenda: { label: 'Agenda Follow-up', icon: '📌', grup: 'CRM', render: renderAgenda, mount: aksi,
      badge: function () { var a = CRM.agenda(); return a.terlambat.length + a.hariIni.length; } },
    pelanggan: { label: 'Pelanggan 360°', icon: '🧑‍💼', grup: 'CRM', render: renderPelanggan, mount: aksi,
      badge: function () { return (CRM.statistik().segmenKlien.berisiko || 0); } },
    kampanye: { label: 'Kampanye WhatsApp', icon: '📣', grup: 'CRM', render: renderKampanye, mount: aksi }
  };

  return { pagesAdmin: pagesAdmin, detailLead: detailLead, detailKlien: detailKlien, aksi: aksi };
})();
