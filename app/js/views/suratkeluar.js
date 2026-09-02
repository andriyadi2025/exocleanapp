/* ==========================================================================
   views/suratkeluar.js — kotak keluar email & pengingat pembayaran
   --------------------------------------------------------------------------
   SATU HALAMAN, DUA HAL YANG SALING MENJELASKAN

   Kotak keluar menjawab "apa yang sudah dikirim kepada siapa"; pengingat
   menjawab "apa yang akan dikirim, dan kapan". Memisahkannya ke dua halaman
   membuat orang harus bolak-balik untuk menjawab satu pertanyaan yang sama:
   sudah sampai belum tagihan saya ke klien itu.

   YANG SIMULASI DIKATAKAN SIMULASI

   Surat dalam mode simulasi diberi status tersendiri, bukan "terkirim".
   Menandainya terkirim padahal tidak pernah dikirim adalah kebohongan yang
   baru ketahuan pada saat paling buruk — ketika klien menagih haknya dan
   layar berkata surat itu sudah sampai.
   ========================================================================== */
var ViewSuratKeluar = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  var fSurat = 'semua';

  var STATUS = {
    antre:    { t: 'Menunggu dikirim', c: 'warn' },
    terkirim: { t: 'Terkirim', c: 'ok' },
    simulasi: { t: 'Simulasi — tidak dikirim', c: 'muted' },
    gagal:    { t: 'Gagal', c: 'err' }
  };

  function render() {
    var semua = EMAIL.daftar();
    var list = fSurat === 'semua' ? semua
      : semua.filter(function (m) { return m.status === fSurat; });

    var c = EMAIL.config();
    var pc = PENGINGAT.config();
    var rencana = PENGINGAT.rencana();

    return '<div>' +

      /* ---- keadaan pengiriman ---- */
      (EMAIL.siap()
        ? UI.alert('ok', '<b>' + T('Pengiriman email aktif.') + '</b> ' +
            T('Surat dikirim lewat server email Anda.'), '📧')
        : UI.alert('warn', '<b>' + T('Mode simulasi.') + '</b> ' +
            T('Surat disusun dan bisa dibaca di sini, tetapi tidak dikirim ke mana pun.'), '📧')) +
      '<div class="row mb-3"><div class="spacer"></div>' +
        '<button class="btn btn--ghost btn--sm" data-act="email-uji">' + T('Uji koneksi') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="email-setelan">' + T('Pengaturan Email') + '</button>' +
      '</div>' +

      /* ---- pengingat pembayaran ---- */
      UI.card({
        title: T('Pengingat pembayaran'),
        sub: T('Berjalan sendiri setiap aplikasi dibuka'),
        tools: '<button class="btn btn--ghost btn--sm" data-act="pengingat-setelan">' +
          T('Pengaturan') + '</button>',
        body:
          '<div class="row mb-2">' +
            '<button class="sw' + (pc.aktif ? ' sw--on' : '') + '" data-act="pengingat-aktif" ' +
              'role="switch" aria-checked="' + !!pc.aktif + '"><i></i></button>' +
            '<div style="min-width:0;flex:1">' +
              '<b>' + (pc.aktif ? T('Menyala') : T('Dimatikan')) + '</b>' +
              '<div class="tbl-sub">' +
                T('Tahap: 3 hari sebelum jatuh tempo, hari-H, 3 hari lewat, 7 hari lewat.') +
              '</div>' +
            '</div>' +
          '</div>' +

          (rencana.length
            ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
                '<th>' + T('Invoice') + '</th><th>' + T('Klien') + '</th>' +
                '<th>' + T('Tahap') + '</th><th>' + T('Lewat') + '</th>' +
              '</tr></thead><tbody>' +
              rencana.slice(0, 12).map(function (r) {
                var inv = DB.find('invoices', r.invoiceId);
                return '<tr>' +
                  '<td><span class="code">' + U.esc(r.no) + '</span></td>' +
                  '<td>' + U.esc(BIZ.klien(r.clientId)) + '</td>' +
                  '<td>' + U.esc(T(r.tahap.judul)) + '</td>' +
                  '<td>' +
                    (r.email ? '<span class="chip chip--ok chip--xs">' + T('Email') + '</span> ' : '') +
                    (r.wa ? '<span class="chip chip--brand chip--xs">WhatsApp</span>' : '') +
                    (r.tanpaEmail ? '<span class="chip chip--warn chip--xs">' +
                      T('klien tanpa email') + '</span>' : '') +
                  '</td></tr>';
              }).join('') + '</tbody></table></div>' +
              (rencana.length > 12
                ? '<div class="tbl-sub mt-1">' + T('dan') + ' ' + (rencana.length - 12) + ' ' +
                  T('lagi.') + '</div>' : '') +
              '<div class="row mt-2"><div class="spacer"></div>' +
                '<button class="btn" data-act="pengingat-jalan">' +
                  T('Jalankan sekarang') + ' (' + rencana.length + ')</button></div>'
            : '<div class="tbl-sub">' +
                T('Tidak ada pengingat yang jatuh temponya sudah tiba. Semua tagihan ' +
                  'yang berjalan masih di dalam tempo.') + '</div>') +

          /* Batasan yang jujur harus disebutkan di layarnya, bukan hanya di
             dokumentasi yang tidak pernah dibuka. */
          '<div class="tbl-sub mt-2">' +
            T('Pengingat berangkat saat aplikasi dibuka, bukan lewat penjadwal di luar — ' +
              'basis data ini hidup di browser. Selama aplikasi dibuka tiap hari kerja, ' +
              'hasilnya sama dengan penjadwal.') +
          '</div>'
      }) +

      '<div class="mb-3"></div>' +

      /* ---- kotak keluar ---- */
      UI.tabs([
        { key: 'semua', label: T('Semua'), n: semua.length },
        { key: 'antre', label: T('Menunggu'), n: semua.filter(function (m) { return m.status === 'antre'; }).length },
        { key: 'terkirim', label: T('Terkirim'), n: semua.filter(function (m) { return m.status === 'terkirim'; }).length },
        { key: 'gagal', label: T('Gagal'), n: semua.filter(function (m) { return m.status === 'gagal'; }).length }
      ], fSurat, 'tab-surat') +

      UI.card({ flush: true,
        tools: EMAIL.jumlahAntre()
          ? '<button class="btn btn--sm" data-act="surat-kirim-semua">' +
            T('Kirim semua yang menunggu') + '</button>'
          : '',
        body: list.length
          ? UI.table([
              { h: 'Kepada', r: function (m) {
                return '<div class="tbl-title">' + U.esc(m.nama || m.ke) + '</div>' +
                  '<div class="tbl-sub">' + U.esc(m.ke) + '</div>'; } },
              { h: 'Subjek', r: function (m) {
                return '<div class="tbl-title">' + U.esc(m.subjek) + '</div>' +
                  '<div class="tbl-sub">' + U.esc(m.jenis) +
                  (m.galat ? ' • <span style="color:var(--danger)">' + U.esc(m.galat) + '</span>' : '') +
                  '</div>'; } },
              { h: T('Status'), r: function (m) {
                var s = STATUS[m.status] || STATUS.antre;
                return '<span class="chip chip--' + s.c + ' chip--xs">' + T(s.t) + '</span>' +
                  (m.sentAt ? '<div class="tbl-sub">' + U.tglJam(m.sentAt) + '</div>' : ''); } },
              { h: '', cls: 'act', r: function (m) {
                return '<button class="btn btn--ghost btn--sm" data-act="surat-lihat" data-id="' +
                    U.esc(m.id) + '">' + T('Lihat') + '</button>' +
                  (m.status === 'antre' || m.status === 'gagal'
                    ? ' <button class="btn btn--sm" data-act="surat-kirim" data-id="' +
                      U.esc(m.id) + '">' + T('Kirim') + '</button>'
                    : ''); } }
            ], list)
          : UI.empty('📭', T('Belum ada surat'),
              T('Surat muncul di sini begitu invoice diterbitkan atau penawaran dikirim.'))
      }) +
    '</div>';
  }

  function dialogLihat(id) {
    var m = DB.find('emailOutbox', id);
    if (!m) return;
    var s = STATUS[m.status] || STATUS.antre;
    UI.modal({
      title: m.subjek, sub: m.nama ? m.nama + ' <' + m.ke + '>' : m.ke, size: 'wide',
      body:
        '<div class="row mb-2">' +
          '<span class="chip chip--' + s.c + ' chip--xs">' + T(s.t) + '</span>' +
          (m.via ? '<span class="tbl-sub">' + T('melalui') + ' ' + U.esc(m.via) + '</span>' : '') +
          (m.sentAt ? '<span class="tbl-sub">' + U.tglJam(m.sentAt) + '</span>' : '') +
        '</div>' +
        (m.galat ? UI.alert('err', U.esc(m.galat), '⚠️') + '<div class="mb-2"></div>' : '') +
        /* Isi surat ditampilkan di dalam bingkai terpisah supaya gaya sebaris
           di dalamnya tidak bertabrakan dengan gaya aplikasi — dan supaya yang
           terlihat memang yang akan dibaca klien. */
        '<div class="surat-pratinjau">' + m.html + '</div>',
      foot: (m.status === 'antre' || m.status === 'gagal'
        ? '<button class="btn" data-act="surat-kirim" data-id="' + U.esc(m.id) + '">' +
          T('Kirim sekarang') + '</button>' : '') +
        '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: {
        'surat-kirim': function (el) {
          var mid = el.getAttribute('data-id');
          EMAIL.kirim(mid).then(function (x) {
            UI.toast(x.status === 'simulasi'
              ? T('Simulasi — surat tidak dikirim ke mana pun')
              : T('Surat terkirim'), x.status === 'simulasi' ? 'info' : 'ok');
            var back = el.closest('.modal-back');
            var tutup = back && back.querySelector('[data-close]');
            if (tutup) tutup.click();
            APP.refresh();
          }).catch(function (e) { UI.toast(e.message, 'err'); APP.refresh(); });
        }
      }
    });
  }

  function aksi(root) {
    U.delegate(root, {
      'tab-surat': function (el) { fSurat = el.getAttribute('data-k'); APP.refresh(); },
      'surat-lihat': function (el) { dialogLihat(el.getAttribute('data-id')); },

      'surat-kirim': function (el) {
        EMAIL.kirim(el.getAttribute('data-id')).then(function (m) {
          UI.toast(m.status === 'simulasi'
            ? T('Simulasi — surat tidak dikirim ke mana pun')
            : T('Surat terkirim'), m.status === 'simulasi' ? 'info' : 'ok');
          APP.refresh();
        }).catch(function (e) { UI.toast(e.message, 'err'); APP.refresh(); });
      },

      'surat-kirim-semua': function () {
        var antre = DB.where('emailOutbox', { status: 'antre' });
        if (!antre.length) return;
        UI.konfirm({
          title: T('Kirim semua surat yang menunggu?'),
          text: antre.length + ' ' + T('surat akan dikirim sekarang.'),
          okText: T('Kirim')
        }).then(function (ya) {
          if (!ya) return;
          var ok = 0, gagal = 0;
          Promise.all(antre.map(function (m) {
            return EMAIL.kirim(m.id).then(function () { ok++; })
              .catch(function () { gagal++; });
          })).then(function () {
            UI.toast(ok + ' ' + T('terkirim') + (gagal ? ', ' + gagal + ' ' + T('gagal') : ''),
              gagal ? 'warn' : 'ok');
            APP.refresh();
          });
        });
      },

      'email-setelan': function () {
        var c = EMAIL.config();
        UI.formModal({
          title: T('Pengaturan Email'),
          sub: T('Kunci penyedia email TIDAK disimpan di sini'),
          okText: T('Simpan'),
          intro: UI.alert('info',
            T('Kunci penyedia email hanya hidup di berkas .env pada mail-server, bukan di ' +
              'aplikasi ini. Yang diisi di sini cuma alamat servernya dan token internal ' +
              'yang menjaga siapa boleh memakainya.'), '🔐') + '<div class="mb-3"></div>',
          fields: [
            { name: 'mode', label: T('Mode'), type: 'select', value: c.mode,
              options: [{ value: 'simulasi', label: T('Simulasi — surat tidak dikirim') },
                        { value: 'live', label: T('Live — surat benar-benar dikirim') }] },
            { name: 'backendUrl', label: T('Alamat mail-server'), value: c.backendUrl,
              hint: 'mis. http://localhost:4400' },
            { name: 'token', label: T('Token internal'), value: c.token,
              hint: T('Harus sama persis dengan MAIL_TOKEN di berkas .env mail-server.') }
          ]
        }).then(function (d) {
          if (!d) return;
          EMAIL.simpanConfig({ mode: d.mode, backendUrl: String(d.backendUrl || '').trim(),
            token: String(d.token || '').trim() });
          UI.toast(T('Pengaturan disimpan'), 'ok');
          APP.refresh();
        });
      },

      'email-uji': function () {
        EMAIL.ujiKoneksi().then(function (h) {
          UI.toast(T('Tersambung') + ' — ' + T('penyedia') + ': ' + h.provider +
            (h.simulasi ? ' (' + T('mode log, surat tidak dikirim') + ')' : '') +
            (h.tokenTerpasang ? '' : ' — ' + T('MAIL_TOKEN belum diisi di server')),
            h.tokenTerpasang ? 'ok' : 'warn');
        }).catch(function (e) { UI.toast(e.message, 'err'); });
      },

      'pengingat-aktif': function () {
        var c = PENGINGAT.config();
        PENGINGAT.simpanConfig({ aktif: !c.aktif });
        UI.toast(!c.aktif
          ? T('Pengingat pembayaran dinyalakan')
          : T('Pengingat pembayaran dimatikan'), !c.aktif ? 'ok' : 'info');
        APP.refresh();
      },

      'pengingat-jalan': function () {
        PENGINGAT.jalankan(true).then(function (h) {
          UI.toast(T('{e} email, {w} WhatsApp diantrekan')
            .replace('{e}', h.email).replace('{w}', h.wa) +
            (h.gagal ? ' · ' + h.gagal + ' ' + T('gagal') : ''),
            h.gagal ? 'warn' : 'ok');
          APP.refresh();
        });
      },

      'pengingat-setelan': function () {
        var c = PENGINGAT.config();
        UI.formModal({
          title: T('Pengaturan pengingat'),
          sub: T('Kapan dan lewat apa pengingat dikirim'),
          okText: T('Simpan'),
          fields: [
            { name: 'lewatEmail', label: T('Kirim lewat email'), type: 'checkbox', value: !!c.lewatEmail },
            { name: 'lewatWA', label: T('Antrekan pesan WhatsApp'), type: 'checkbox', value: !!c.lewatWA,
              hint: T('WhatsApp tetap dikirim dari Outbox oleh manusia — yang otomatis hanya penyusunannya.') },
            { name: 'abaikanLebihTuaDariHari', label: T('Abaikan tagihan yang lewat lebih dari (hari)'),
              type: 'number', value: c.abaikanLebihTuaDariHari,
              hint: T('Menahan tagihan lama menerima empat pesan sekaligus saat pengingat pertama kali dinyalakan.') }
          ]
        }).then(function (d) {
          if (!d) return;
          PENGINGAT.simpanConfig({
            lewatEmail: !!d.lewatEmail, lewatWA: !!d.lewatWA,
            abaikanLebihTuaDariHari: Math.max(0, Math.round(+d.abaikanLebihTuaDariHari || 0))
          });
          UI.toast(T('Pengaturan disimpan'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  function page() {
    return {
      label: T('Surat Keluar'), icon: '📧', grup: 'Komunikasi',
      sub: T('Email invoice & penawaran, dan pengingat pembayaran'),
      render: render, mount: aksi,
      badge: function () { return EMAIL.jumlahAntre(); }
    };
  }

  return { page: page, render: render, mount: aksi, dialogLihat: dialogLihat };
})();
