/* ==========================================================================
   views/mitra.js — sisi ADMIN untuk kemitraan & pembelajaran
     • Mitra & Rekrutmen — memantau onboarding, menyetujui / menolak pendaftar
     • Pembelajaran (LMS) — daftar kursus, rekap nilai, dan sertifikat terbit
   ========================================================================== */
var ViewMitra = (function () {

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }
  function aku() { return APP.user ? APP.user.id : 'u_admin'; }

  var LABEL_STATUS = {
    onboarding: { t: 'Sedang bergabung', c: 'info' },
    aktif: { t: 'Mitra aktif', c: 'ok' },
    ditolak: { t: 'Ditolak', c: 'danger' },
    nonaktif: { t: 'Nonaktif', c: 'muted' }
  };
  function chipStatus(u) {
    var m = LABEL_STATUS[BIZ.statusMitra(u)] || LABEL_STATUS.onboarding;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + m.t + '</span>';
  }

  /* ================================================================ MITRA & REKRUTMEN */
  var fMitra = 'perlu';

  function renderMitra() {
    var rekap = LMS.rekapMitra();
    var st = LMS.statistikLMS();
    var grup = {
      perlu: rekap.filter(function (r) { return r.siap && BIZ.statusMitra(r.user) !== 'aktif'; }),
      proses: rekap.filter(function (r) { return !r.siap && BIZ.statusMitra(r.user) === 'onboarding'; }),
      aktif: rekap.filter(function (r) { return BIZ.statusMitra(r.user) === 'aktif'; }),
      semua: rekap
    };
    var list = grup[fMitra] || rekap;

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Mitra aktif'), value: st.aktif, icon: '👷',
        meta: 'siap menerima penugasan' }) +
      UI.stat({ label: 'Sedang bergabung', value: st.onboarding, icon: '🚀',
        meta: st.siapVerifikasi ? '<span class="down">' + st.siapVerifikasi + ' menunggu persetujuan</span>'
                                : I18N.t('belum ada yang siap') }) +
      UI.stat({ label: I18N.t('Sertifikat terbit'), value: st.sertifikatTerbit, icon: '🎓',
        meta: st.kursus + ' kursus tersedia' }) +
      UI.stat({ label: 'Rata-rata nilai', value: st.rataNilai || '—', icon: '📊',
        meta: st.percobaan + ' kali pengerjaan kuis' }) +
    '</div>' +

    (grup.perlu.length
      ? UI.alert('warn', '<b>' + grup.perlu.length + ' ' + I18N.t('pendaftar sudah menyelesaikan seluruh tahap') + '</b> ' + I18N.t('dan') + ' ' +
          I18N.t('menunggu persetujuan Anda:') + ' ' + grup.perlu.map(function (r) {
            return '<a href="#" data-act="detail-mitra" data-id="' + r.user.id + '">' +
              U.esc(r.user.nama) + '</a>'; }).join(', '), '⏳') + '<div class="mb-3"></div>'
      : '') +

    UI.tabs([
      { key: 'perlu', label: I18N.t('Menunggu persetujuan'), n: grup.perlu.length },
      { key: 'proses', label: 'Sedang bergabung', n: grup.proses.length },
      { key: 'aktif', label: I18N.t('Mitra aktif'), n: grup.aktif.length },
      { key: 'semua', label: I18N.t('Semua'), n: rekap.length }
    ], fMitra, 'tab-mitra') +

    UI.card({ flush: true, body: UI.table([
      { h: I18N.t('Mitra'), r: function (r) { return '<div class="row">' + UI.avatar(r.user.nama, 'sm') +
        '<div><div class="tbl-title">' + U.esc(r.user.nama) + '</div>' +
        '<div class="tbl-sub">' + U.phoneDisplay(r.user.telp) +
        (r.user.daftarAt ? ' • daftar ' + U.sejak(r.user.daftarAt) : '') + '</div></div></div>'; } },
      { h: 'Kemajuan bergabung', w: '190px', r: function (r) {
        return UI.progress(r.ringkas.pct, r.ringkas.pct === 100 ? 'ok' : '') +
          '<div class="tbl-sub mt-1">' + r.ringkas.selesai + '/' + r.ringkas.total + ' langkah' +
          (r.ringkas.berikutnya ? ' • ' + U.esc(U.potong(r.ringkas.berikutnya.judul, 26)) : '') + '</div>'; } },
      { h: I18N.t('Kursus wajib'), cls: 'num', r: function (r) {
        var w = LMS.kursusWajib();
        var l = w.filter(function (k) { return LMS.lulusKursus(r.user.id, k.id); }).length;
        return '<b>' + l + '/' + w.length + '</b>' +
          (r.nilaiRata ? '<div class="tbl-sub">' + I18N.t('rata') + ' ' + r.nilaiRata + '</div>' : ''); } },
      { h: I18N.t('Sertifikat'), cls: 'num', r: function (r) {
        var mitra = LMS.punyaSertifikat(r.user.id, 'MITRA');
        return r.sertifikat.length + (mitra ? ' <span class="chip chip--ok" style="font-size:10px">🏅</span>' : ''); } },
      { h: I18N.t('Status'), r: function (r) { return chipStatus(r.user); } },
      { h: '', cls: 'act', r: function (r) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="detail-mitra" data-id="' + r.user.id + '">' + I18N.t('Detail') + '</button>';
        if (r.siap && BIZ.statusMitra(r.user) !== 'aktif')
          b += ' <button class="btn btn--sm" data-act="setujui-mitra" data-id="' + r.user.id + '">✓ Setujui</button>';
        return b; } }
    ], list, { icon: '👷', judul: I18N.t('Tidak ada mitra pada kategori ini') }) });
  }

  /* ---------------------------------------------------------------- detail mitra */
  /* ============================================================ TARIF PASAR
     Panel ini adalah satu-satunya tempat tarif EXOCLEAN App ditetapkan.
     Hanya muncul bagi pemegang izin `mitra.tarif` — bawaannya Super Admin
     (IT) saja. Bagi yang lain, tarifnya tetap DITAMPILKAN tetapi tidak bisa
     diubah: Admin Kemitraan perlu tahu berapa yang dibayar pelanggan saat
     berbicara dengan mitranya, dan menyembunyikannya hanya memindahkan
     pertanyaan itu ke grup WhatsApp. */
  function panelTarif(u) {
    if (u.role !== 'worker') return '';

    var p = PASAR.data(u);
    var boleh = AKSES.boleh('mitra.tarif');
    var status = !p.tarif
      ? '<span class="chip chip--warn">Belum ditetapkan</span>'
      : p.aktif ? '<span class="chip chip--ok chip--dot">Tayang di EXOCLEAN App</span>'
                : '<span class="chip chip--muted">Tidak ditayangkan</span>';

    var jejak = p.at
      ? '<div class="tbl-sub mt-1">Terakhir diubah ' + U.tgl(p.at) +
        (p.olehNama ? ' oleh ' + U.esc(p.olehNama) : '') + '.</div>'
      : '';

    var isi =
      '<div class="row wrap mb-3" style="gap:8px">' + status +
        (p.tarif ? '<span class="chip chip--brand">' + U.rp(p.tarif) + ' / jam</span>' : '') +
      '</div>';

    if (boleh) {
      isi +=
        '<div class="row wrap" style="gap:14px;align-items:flex-end">' +
          '<div class="field" style="min-width:190px;margin-bottom:0">' +
            '<label for="tarif-pasar">Tarif per jam (Rp)</label>' +
            '<input id="tarif-pasar" class="input" type="number" inputmode="numeric" ' +
              'min="' + PASAR.MIN + '" max="' + PASAR.MAX + '" step="1000" ' +
              'value="' + (p.tarif || '') + '" placeholder="' + PASAR.usulan(u) + '">' +
          '</div>' +
          '<label class="check" style="padding-bottom:9px"><input type="checkbox" id="tarif-tayang"' +
            (p.aktif ? ' checked' : '') + '><span>Tayangkan di EXOCLEAN App</span></label>' +
          '<button class="btn" data-act="simpan-tarif" data-id="' + u.id + '" ' +
            'style="margin-bottom:1px">Simpan tarif</button>' +
        '</div>' +
        '<div class="tbl-sub mt-2">Usulan untuk ' + U.esc(u.jabatan || 'mitra') + ': ' +
          U.rp(PASAR.usulan(u)) + ' / jam. Batas yang diterima ' + U.rp(PASAR.MIN) +
          '–' + U.rp(PASAR.MAX) + '. Angka ini yang dilihat pelanggan dan yang menjadi ' +
          'penghasilan mitra, jadi tidak pernah terisi sendiri.</div>' + jejak;
    } else {
      isi += '<div class="tbl-sub">Hanya Super Admin (IT) yang menetapkan tarif pasar. ' +
        'Hubungi tim IT bila angkanya perlu diubah.</div>' + jejak;
    }

    return Panel.seksi('Tarif pasar — EXOCLEAN App', isi);
  }

  function simpanTarif(userId, el) {
    var root = el.closest('.modal');
    var nilai = root.querySelector('#tarif-pasar').value;
    var tayang = root.querySelector('#tarif-tayang').checked;

    var hasil = PASAR.setTarif(userId, nilai, tayang);
    if (!hasil.ok) {
      /* AKSES.jaga() sudah bersuara sendiri saat izinnya kurang; sisanya
         adalah kesalahan isi yang harus dikatakan apa adanya. */
      if (hasil.alasan !== 'Tidak berizin.') UI.toast(hasil.alasan, 'err');
      return;
    }
    UI.toast('Tarif tersimpan' + (tayang ? ' dan sudah tayang di EXOCLEAN App.' : ', belum ditayangkan.'), 'ok');
    tutup(el);
    detailMitra(userId);
  }

  function detailMitra(userId) {
    var u = BIZ.user(userId);
    if (!u) return;
    var r = LMS.ringkasOnboarding(u);
    var siap = LMS.siapDiverifikasi(u);
    var sert = LMS.sertifikatSaya(userId);
    var status = BIZ.statusMitra(u);

    UI.modal({
      title: u.nama, sub: I18N.t('Mitra •') + ' ' + U.phoneDisplay(u.telp) + ' • ' + U.esc(u.email), size: 'wide',
      body:
        '<div class="row wrap mb-3" style="gap:8px">' + chipStatus(u) +
          '<span class="chip chip--muted">' + I18N.t('Daftar') + ' ' + (u.daftarAt ? U.tgl(u.daftarAt) : U.tgl(u.createdAt)) + '</span>' +
          (u.disetujuiAt ? '<span class="chip chip--ok">' + I18N.t('Disetujui') + ' ' + U.tgl(u.disetujuiAt) + '</span>' : '') +
          '<span class="chip chip--brand">Kemajuan ' + r.pct + '%</span>' +
        '</div>' +

        (status === 'ditolak' && u.alasanTolak
          ? UI.alert('danger', '<b>Ditolak:</b> ' + U.esc(u.alasanTolak), '⛔') + '<div class="mb-3"></div>' : '') +

        '<div class="ob-list">' + r.langkah.map(function (l, i) {
          return '<div class="ob-step' + (l.selesai ? ' done' : '') + '">' +
            '<div class="ob-step__n">' + (l.selesai ? '✓' : (i + 1)) + '</div>' +
            '<div class="ob-step__isi"><b>' + l.ic + ' ' + U.esc(l.judul) + '</b>' +
            '<p>' + U.esc(l.ket) + '</p></div>' +
            (l.detail ? '<span class="chip chip--muted">' + l.detail + '</span>' : '') +
            '</div>';
        }).join('') + '</div>' +

        panelTarif(u) +

        Panel.seksi('Nilai per Kursus', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>Kursus</th><th>' + I18N.t('Jenis') + '</th><th class="num">' + I18N.t('Percobaan') + '</th><th class="num">Nilai terbaik</th>' +
          '<th>' + I18N.t('Status') + '</th></tr></thead><tbody>' +
          LMS.semuaKursus().map(function (k) {
            var p = LMS.progres(userId, k.id);
            var lulus = LMS.lulusKursus(userId, k.id);
            return '<tr><td><div class="tbl-title">' + k.ikon + ' ' + U.esc(k.judul) + '</div></td>' +
              '<td>' + (k.wajib ? '<span class="chip chip--brand" style="font-size:10px">' + I18N.t('Wajib') + '</span>'
                                : '<span class="chip chip--muted" style="font-size:10px">' + I18N.t('Spesialisasi') + '</span>') + '</td>' +
              '<td class="num">' + (p ? (p.percobaan || []).length : 0) + '</td>' +
              '<td class="num">' + (p && p.nilaiTerbaik !== null ? '<b>' + p.nilaiTerbaik + '</b>' : '—') + '</td>' +
              '<td>' + (lulus ? '<span class="chip chip--ok">' + I18N.t('Lulus') + '</span>'
                : p ? '<span class="chip chip--warn">' + I18N.t('Belum lulus') + '</span>'
                    : '<span class="tbl-sub">' + I18N.t('belum mulai') + '</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div>') +

        Panel.seksi('Sertifikat (' + sert.length + ')', sert.length
          ? '<div class="grid g-2">' + sert.map(function (s) {
              return '<div class="sert' + (s.jenis === 'mitra' ? ' utama' : '') + '">' +
                '<div class="sert__pita">' + (s.jenis === 'mitra' ? '🏅' : s.jenis === 'spesialisasi' ? '⭐' : '🎓') + '</div>' +
                '<div class="sert__isi"><div class="tbl-sub">' + U.esc(s.no) + '</div>' +
                '<b>' + U.esc(s.judul) + '</b>' +
                '<div class="row mt-1" style="gap:6px"><span class="chip chip--brand" style="font-size:10.5px">' + I18N.t('Nilai') + ' ' +
                s.nilai + '</span><span class="chip chip--muted" style="font-size:10.5px">' +
                U.esc(s.kode) + '</span></div></div>' +
                '<button class="btn btn--ghost btn--sm" data-act="lihat-sert-adm" data-id="' + s.id + '">' + I18N.t('Lihat') + '</button>' +
                '</div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + I18N.t('Belum ada sertifikat terbit.') + '</div>'),

      foot: '<button class="btn btn--ghost" data-act="berkas-mitra" data-id="' + userId + '">🆔 Berkas</button>' +
        '<button class="btn btn--wa" data-act="wa-mitra" data-id="' + userId + '">💬 Chat</button>' +
        '<div class="spacer"></div>' +
        (status === 'aktif'
          ? '<button class="btn btn--ghost" data-act="nonaktif-mitra" data-id="' + userId + '">' + I18N.t('Nonaktifkan') + '</button>'
          : '<button class="btn btn--ghost" data-act="tolak-mitra" data-id="' + userId + '">' + I18N.t('Tolak') + '</button>' +
            '<button class="btn" data-act="setujui-mitra" data-id="' + userId + '"' +
            (siap ? '' : ' disabled title="Belum semua tahap selesai"') + '>' + I18N.t('✓ Setujui Mitra') + '</button>') +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',

      actions: {
        'simpan-tarif': function (el) { simpanTarif(userId, el); },
        'berkas-mitra': function (el) { tutup(el); Panel.detailBerkas(userId); },
        'wa-mitra': function () { WA.chat(u.telp, 'Halo ' + u.nama + ', dari EXOCLEAN. '); },
        'lihat-sert-adm': function (el) { tutup(el); ViewBelajar.lihatSertifikat(el.getAttribute('data-id')); },
        'setujui-mitra': function (el) { tutup(el); setujui(userId); },
        'tolak-mitra': function (el) { tutup(el); tolak(userId); },
        'nonaktif-mitra': function (el) { tutup(el); nonaktifkan(userId); }
      }
    });
  }

  function setujui(userId) {
    var u = BIZ.user(userId);
    if (!LMS.siapDiverifikasi(u)) {
      UI.toast(I18N.t('Belum bisa disetujui — masih ada tahap yang belum selesai'), 'err');
      return;
    }
    UI.konfirm({ title: I18N.t('Setujui') + ' ' + u.nama + ' ' + I18N.t('sebagai mitra aktif?'),
      htmlText: 'Setelah disetujui, ' + U.esc(u.nama) + ' <b>' + I18N.t('dapat mulai menerima penugasan') + '</b> ' + I18N.t('dan akan') + ' ' +
        I18N.t('muncul pada daftar petugas saat menjadwalkan order.'), okText: '✓ Ya, setujui' })
      .then(function (ya) {
        if (!ya) return;
        BIZ.setujuiMitra(userId, aku());
        var m = WA.enqueue('mitra_disetujui', userId, { userId: userId }, { tipe: 'user', id: userId });
        UI.toast(u.nama + ' ' + I18N.t('kini mitra aktif'), 'ok');
        APP.refresh();
        if (m) Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
      });
  }

  function tolak(userId) {
    var u = BIZ.user(userId);
    UI.formModal({ title: 'Tolak pendaftaran ' + u.nama, okText: I18N.t('Simpan'),
      fields: [
        { name: 'alasan', label: I18N.t('Alasan penolakan'), type: 'select', value: I18N.t('Berkas identitas tidak valid'),
          options: [I18N.t('Berkas identitas tidak valid'), I18N.t('Data tidak dapat diverifikasi'),
                    I18N.t('Tidak memenuhi syarat usia/kesehatan'), I18N.t('Di luar area layanan'),
                    I18N.t('Kuota mitra area ini penuh'), 'Lainnya'] },
        { name: 'catatan', label: I18N.t('Catatan tambahan (disampaikan ke pendaftar)'), type: 'textarea', rows: 2 }
      ] }).then(function (d) {
      if (!d) return;
      BIZ.tolakMitra(userId, aku(), d.alasan + (d.catatan ? ' — ' + d.catatan : ''));
      UI.toast('Pendaftaran ditolak', 'warn');
      APP.refresh();
    });
  }

  function nonaktifkan(userId) {
    var u = BIZ.user(userId);
    UI.konfirm({ title: I18N.t('Nonaktifkan mitra') + ' ' + u.nama + '?', danger: true,
      text: I18N.t('Mitra tidak akan muncul lagi pada daftar penugasan. Riwayat pekerjaannya tetap tersimpan.'),
      okText: 'Ya, nonaktifkan' }).then(function (ya) {
      if (!ya) return;
      BIZ.nonaktifkanMitra(userId, aku());
      UI.toast(u.nama + ' dinonaktifkan', 'warn');
      APP.refresh();
    });
  }

  /* ================================================================ PEMBELAJARAN (LMS) */
  var fLms = 'kursus';

  function renderLMS() {
    var st = LMS.statistikLMS();
    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: 'Kursus tersedia', value: st.kursus, icon: '📚',
        meta: LMS.kursusWajib().length + ' ' + I18N.t('wajib •') + ' ' + LMS.kursusPilihan().length + ' spesialisasi' }) +
      UI.stat({ label: I18N.t('Sertifikat terbit'), value: st.sertifikatTerbit, icon: '🎓',
        meta: DB.where('sertifikat', { jenis: 'mitra' }).length + ' ' + I18N.t('sertifikat mitra') }) +
      UI.stat({ label: 'Pengerjaan kuis', value: st.percobaan, icon: '📝',
        meta: I18N.t('total semua percobaan') }) +
      UI.stat({ label: 'Rata-rata nilai', value: st.rataNilai || '—', icon: '📊',
        meta: I18N.t('nilai terbaik seluruh mitra') }) +
    '</div>' +

    UI.tabs([{ key: 'kursus', label: 'Daftar Kursus' }, { key: 'nilai', label: I18N.t('Rekap Nilai Mitra') },
      { key: 'sertifikat', label: 'Sertifikat Terbit' }], fLms, 'tab-lms') +

    (fLms === 'nilai' ? tabelNilai() : fLms === 'sertifikat' ? tabelSertifikat() : daftarKursusAdmin());
  }

  function daftarKursusAdmin() {
    return LMS.semuaKursus().map(function (k) {
      var r = LMS.rekapKursus(k.id);
      return UI.card({ cls: 'mb-3',
        title: k.ikon + ' ' + k.judul,
        sub: k.deskripsi,
        tools: (k.wajib ? '<span class="chip chip--brand">' + I18N.t('Wajib') + '</span>'
                        : '<span class="chip chip--muted">' + I18N.t('Spesialisasi') + '</span>') +
          ' <button class="btn btn--ghost btn--sm" data-act="pratinjau-kursus" data-id="' + k.id + '">Pratinjau</button>',
        body: '<div class="grid g-4">' +
            UI.stat({ label: I18N.t('Materi'), value: (k.materi || []).length, small: true,
              meta: '±' + k.durasiMenit + ' menit' }) +
            UI.stat({ label: 'Soal kuis', value: (k.kuis || []).length, small: true,
              meta: I18N.t('KKM') + ' ' + k.nilaiMin }) +
            UI.stat({ label: I18N.t('Mitra mengikuti'), value: r.ikut, small: true,
              meta: r.lulus + ' lulus' }) +
            UI.stat({ label: 'Rata-rata nilai', value: r.rata || '—', small: true,
              meta: r.ikut ? Math.round(r.lulus / r.ikut * 100) + '% kelulusan' : I18N.t('belum ada data') }) +
          '</div>' });
    }).join('');
  }

  function tabelNilai() {
    var kursus = LMS.semuaKursus();
    var mitra = BIZ.usersByRole('worker');
    return UI.card({ flush: true,
      body: '<div class="tbl-wrap"><table class="tbl" style="min-width:' + (260 + kursus.length * 92) + 'px">' +
        '<thead><tr><th>' + I18N.t('Mitra') + '</th>' +
        kursus.map(function (k) { return '<th class="num" title="' + U.esc(k.judul) + '">' +
          k.ikon + '<div class="tbl-sub" style="font-weight:600">' + U.esc(k.kode) + '</div></th>'; }).join('') +
        '<th class="num">' + I18N.t('Rata wajib') + '</th><th>' + I18N.t('Status') + '</th></tr></thead><tbody>' +
        mitra.map(function (u) {
          return '<tr><td><div class="row">' + UI.avatar(u.nama, 'sm') +
            '<div class="tbl-title">' + U.esc(u.nama) + '</div></div></td>' +
            kursus.map(function (k) {
              var p = LMS.progres(u.id, k.id);
              var lulus = LMS.lulusKursus(u.id, k.id);
              if (!p || p.nilaiTerbaik === null) return '<td class="num"><span class="tbl-sub">—</span></td>';
              return '<td class="num"><b style="color:' + (lulus ? 'var(--ok)' : 'var(--danger)') + '">' +
                p.nilaiTerbaik + '</b></td>';
            }).join('') +
            '<td class="num"><b>' + (LMS.nilaiRataWajib(u.id) || '—') + '</b></td>' +
            '<td>' + chipStatus(u) + '</td></tr>';
        }).join('') + '</tbody></table></div>' });
  }

  function tabelSertifikat() {
    var list = U.sortBy(DB.all('sertifikat'), function (s) { return s.terbitAt; }, true);
    return UI.card({ flush: true, body: UI.table([
      { h: 'No. Sertifikat', r: function (s) { return '<div class="code">' + U.esc(s.no) + '</div>' +
        '<div class="tbl-sub">' + U.tgl(s.terbitAt) + '</div>'; } },
      { h: I18N.t('Mitra'), r: function (s) { var u = BIZ.user(s.userId);
        return '<div class="tbl-title">' + U.esc(u ? u.nama : '—') + '</div>'; } },
      { h: I18N.t('Sertifikat'), r: function (s) { return '<div class="tbl-title">' +
        (s.jenis === 'mitra' ? '🏅 ' : s.jenis === 'spesialisasi' ? '⭐ ' : '🎓 ') + U.esc(s.judul) + '</div>'; } },
      { h: I18N.t('Nilai'), cls: 'num', r: function (s) { return '<b>' + s.nilai + '</b>'; } },
      { h: I18N.t('Berlaku s/d'), r: function (s) {
        var ok = LMS.sertifikatBerlaku(s);
        return '<span style="' + (ok ? '' : 'color:var(--danger)') + '">' + U.tgl(s.berlakuHingga) + '</span>'; } },
      { h: I18N.t('Kode'), r: function (s) { return '<span class="code">' + U.esc(s.kode) + '</span>'; } },
      { h: '', cls: 'act', r: function (s) { return '<button class="btn btn--ghost btn--sm" ' +
        'data-act="lihat-sert-adm" data-id="' + s.id + '">' + I18N.t('Lihat') + '</button>'; } }
    ], list, { icon: '🎓', judul: I18N.t('Belum ada sertifikat terbit') }) });
  }

  function pratinjauKursus(kursusId) {
    var k = LMS.kursus(kursusId);
    UI.modal({
      title: k.ikon + ' ' + k.judul, sub: k.deskripsi, size: 'wide',
      body: '<div class="row wrap mb-3" style="gap:8px">' +
          (k.wajib ? '<span class="chip chip--brand">' + I18N.t('Wajib') + '</span>' : '<span class="chip chip--muted">' + I18N.t('Spesialisasi') + '</span>') +
          '<span class="chip chip--muted">' + (k.materi || []).length + ' ' + I18N.t('materi') + '</span>' +
          '<span class="chip chip--muted">' + (k.kuis || []).length + ' ' + I18N.t('soal') + '</span>' +
          '<span class="chip chip--muted">' + I18N.t('KKM') + ' ' + k.nilaiMin + '</span>' +
          '<span class="chip chip--muted">±' + k.durasiMenit + ' ' + I18N.t('menit') + '</span>' +
        '</div>' +
        Panel.seksi('Materi', (k.materi || []).map(function (m, i) {
          return '<div class="order-card mb-2"><b>' + (i + 1) + '. ' + U.esc(m.judul) + '</b>' +
            '<div class="tbl-sub mt-1">' + U.esc(U.potong(String(m.isi).replace(/<[^>]+>/g, ''), 180)) + '</div></div>';
        }).join('')) +
        Panel.seksi('Soal Kuis', (k.kuis || []).map(function (s, i) {
          return '<div class="order-card mb-2"><b>' + (i + 1) + '. ' + U.esc(s.soal) + '</b>' +
            s.opsi.map(function (o, j) {
              return '<div style="font-size:12.5px;color:' + (j === s.jawaban ? 'var(--ok);font-weight:600' : 'var(--muted)') +
                ';margin-top:4px">' + (j === s.jawaban ? '✓ ' : '• ') + U.esc(o) + '</div>';
            }).join('') +
            (s.pembahasan ? '<div class="pembahasan mt-2">💡 ' + U.esc(s.pembahasan) + '</div>' : '') + '</div>';
        }).join('')),
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>'
    });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    U.delegate(root, AKSES.lindungi({
      'tab-mitra': function (el) { fMitra = el.getAttribute('data-key'); APP.refresh(); },
      'tab-lms': function (el) { fLms = el.getAttribute('data-key'); APP.refresh(); },
      'detail-mitra': function (el) { detailMitra(el.getAttribute('data-id')); },
      'setujui-mitra': function (el) { setujui(el.getAttribute('data-id')); },
      'tolak-mitra': function (el) { tolak(el.getAttribute('data-id')); },
      'nonaktif-mitra': function (el) { nonaktifkan(el.getAttribute('data-id')); },
      'pratinjau-kursus': function (el) { pratinjauKursus(el.getAttribute('data-id')); },
      'lihat-sert-adm': function (el) { ViewBelajar.lihatSertifikat(el.getAttribute('data-id')); },
      'ke-mitra': function () { APP.go('mitra'); }
    }, {
      'setujui-mitra': 'mitra.setujui',
      'tolak-mitra': 'mitra.setujui',
      'nonaktif-mitra': 'mitra.setujui'
    }));
  }

  var pagesAdmin = {
    mitra: { label: 'Mitra & Rekrutmen', icon: '👷', grup: 'Kemitraan',
      sub: 'Pendaftaran, onboarding & persetujuan', render: renderMitra, mount: aksi,
      badge: function () { return LMS.statistikLMS().siapVerifikasi; } },
    lms: { label: 'Pembelajaran (LMS)', icon: '🎓', grup: 'Kemitraan',
      sub: 'Kursus, nilai & sertifikat', render: renderLMS, mount: aksi }
  };

  return { pagesAdmin: pagesAdmin, detailMitra: detailMitra, aksi: aksi };
})();
