/* ==========================================================================
   views/moderasi.js — halaman Moderasi Percakapan (admin)
   Setelan mode • kamus kata • pengecualian • catatan pelanggaran • alat uji
   ========================================================================== */
var ViewModerasi = (function () {

  var T = function (s) { return I18N.t(s); };
  var tab = 'catatan';
  var ujiTeks = '';

  function me() { return APP.user; }
  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ HALAMAN */
  function render() {
    var c = MODERASI.config();
    var s = MODERASI.ringkasan();

    return '<div class="page">' +
      (c.mode === 'mati'
        ? UI.alert('danger', '<b>' + T('Penyaring isi sedang dimatikan.') + '</b> ' +
            T('Semua pesan lewat tanpa diperiksa, termasuk ancaman dan pelecehan. ' +
              'Nyalakan kembali kecuali Anda sedang menelusuri masalah.'), '⛔')
        : UI.alert('brand', '<b>' + T('Penyaring isi aktif.') + '</b> ' +
            T('Ancaman, terorisme, konten seksual, pelecehan, dan hujatan SARA ') +
            (c.mode === 'blokir' ? T('ditolak sebelum terkirim') : T('hanya diperingatkan')) +
            T('. Makian selalu diperingatkan lalu ditutup bagi penerima, tidak pernah diblokir — ' +
              'menyamakannya dengan ancaman membuat orang belajar mengabaikan peringatan.'), '🛡️')) +

      '<div class="row wrap mt-2" style="gap:8px">' +
        UI.stat({ label: T('Total pelanggaran'), value: s.total, icon: '📋', small: true }) +
        UI.stat({ label: T('Pesan diblokir'), value: s.diblokir, icon: '⛔', small: true }) +
        UI.stat({ label: T('Kategori berat'), value: s.berat, icon: '🔴', small: true }) +
        UI.stat({ label: T('Belum ditinjau'), value: s.belumDitinjau, icon: '🕵️', small: true }) +
      '</div>' +

      UI.tabs([
        { key: 'catatan', label: T('Catatan Pelanggaran'), n: s.belumDitinjau },
        { key: 'setelan', label: T('Setelan Penyaring') },
        { key: 'kamus', label: T('Kamus & Pengecualian') },
        { key: 'uji', label: T('Uji Kalimat') }
      ], tab, 'tab') +

      '<div class="mt-3">' +
        (tab === 'catatan' ? renderCatatan()
        : tab === 'setelan' ? renderSetelan(c)
        : tab === 'kamus' ? renderKamus(c)
        : renderUji()) +
      '</div>' +
    '</div>';
  }

  /* ================================================================ CATATAN */
  function renderCatatan() {
    var log = U.sortBy(DB.all('moderasiLog'), function (l) { return l.createdAt; }, true);
    if (!log.length) {
      return UI.card({ body: UI.empty('🕊️', T('Belum ada pelanggaran tercatat'),
        T('Setiap pesan yang tertangkap penyaring akan muncul di sini — termasuk yang ' +
          'hanya diperingatkan lalu tetap dikirim. Pola perilaku baru terlihat dari ' +
          'rekaman, bukan dari satu pesan.')) });
    }

    return UI.card({ title: T('Catatan pelanggaran'), sub: log.length + ' ' + T('kejadian'),
      flush: true,
      body: log.slice(0, 100).map(function (l) {
        var u = BIZ.user(l.userId);
        var kat = (l.kategori || []).map(function (k) {
          var K = MODERASI.KATEGORI[k] || {};
          return '<span class="chip chip--' + (K.tingkat === 'berat' ? 'danger' : 'warn') +
            ' chip--xs">' + (K.ic || '') + ' ' + U.esc(K.nama || k) + '</span>';
        }).join(' ');

        return '<div class="mod-row' + (l.ditinjau ? ' ditinjau' : '') + '">' +
          '<div class="row">' +
            '<b>' + U.esc(u ? u.nama : '—') + '</b>' +
            '<span class="chip chip--muted chip--xs">' +
              U.esc(u ? T(peranTeks(u)) : '—') + '</span>' +
            '<span class="chip chip--' + (l.tindakan === 'diblokir' ? 'danger' : 'warn') +
              ' chip--xs">' + (l.tindakan === 'diblokir' ? '⛔ ' + T('diblokir')
                : '⚠️ ' + T('diperingatkan')) + '</span>' +
            '<div class="spacer"></div>' +
            '<span class="tbl-sub">' + U.tglJam(l.createdAt) + '</span>' +
          '</div>' +
          '<div class="mt-1">' + kat + '</div>' +
          '<div class="mod-row__teks">' + U.esc(l.cuplikan) + '</div>' +
          '<div class="row mt-1">' +
            '<span class="tbl-sub">' + T('Kata terdeteksi') + ': ' +
              U.esc((l.kata || []).join(', ')) + '</span>' +
            '<div class="spacer"></div>' +
            (l.refId ? '<button class="btn btn--ghost btn--sm" data-act="ke-ruang" ' +
              'data-k="' + U.esc(l.konteks) + '" data-id="' + U.esc(l.refId) + '">' +
              T('Buka percakapan') + '</button>' : '') +
            (l.ditinjau
              ? '<span class="chip chip--ok chip--xs">✓ ' + T('sudah ditinjau') + '</span>'
              : '<button class="btn btn--sm" data-act="tinjau" data-id="' + U.esc(l.id) + '">' +
                T('Tandai sudah ditinjau') + '</button>') +
          '</div>' +
        '</div>';
      }).join('') });
  }

  function peranTeks(u) {
    return { client: 'Klien', worker: 'Mitra', seller: T('Mitra Toko'),
             supervisor: 'Supervisor', admin: 'Admin' }[u.role] || u.role;
  }

  /* ================================================================ SETELAN */
  function renderSetelan(c) {
    function opsi(nilai, judul, ket, ic) {
      return '<label class="pm' + (c.mode === nilai ? ' on' : '') + '">' +
        '<input type="radio" name="mode" value="' + nilai + '" data-change="mode"' +
          (c.mode === nilai ? ' checked' : '') + '>' +
        '<span class="pm__ic">' + ic + '</span>' +
        '<span class="pm__body"><b>' + U.esc(judul) + '</b><small>' + U.esc(ket) + '</small></span>' +
      '</label>';
    }

    return UI.card({ title: T('Mode penyaring'),
      sub: T('Berlaku untuk seluruh percakapan klien–mitra'),
      body:
        opsi('blokir', T('Blokir (disarankan)'),
          T('Ancaman, terorisme, konten seksual, pelecehan, dan hujatan SARA ditolak ' +
            'sebelum terkirim. Makian tetap hanya diperingatkan.'), '🛡️') +
        opsi('peringatan', T('Peringatan saja'),
          T('Semua pesan tetap terkirim, tetapi pelanggarannya dicatat dan penerimanya ' +
            'melihat penandaan. Berguna saat menelusuri keluhan salah tangkap.'), '⚠️') +
        opsi('mati', T('Matikan penyaring'),
          T('Tidak ada pemeriksaan sama sekali. Hanya untuk keadaan darurat.'), '⛔') }) +

      UI.card({ title: T('Nomor HP & WhatsApp'),
        body: '<label class="check"><input type="checkbox" data-change="kontak"' +
            (c.blokirKontak !== false ? ' checked' : '') + '> <b>' +
            T('Tolak pesan yang memuat nomor HP atau WhatsApp') + '</b></label>' +
          '<p class="tbl-sub mt-2">' +
          T('Berlaku untuk klien, mitra lapangan, dan mitra toko. Pegawai internal — ' +
            'admin dan supervisor — dikecualikan, karena merekalah kanal resmi ' +
            'perusahaan bila sebuah urusan memang harus lewat telepon.') + '</p>' +
          '<p class="tbl-sub mt-2">' +
          T('Yang ditolak adalah bentuk nomor Indonesia (08…, +62…, 8…, dan telepon ' +
            'rumah), tautan wa.me, serta angka yang dieja seperti “kosong delapan satu ' +
            'dua…”. Nominal rupiah, nomor resi, dan nomor dokumen tidak ikut tertahan.') +
          '</p>' }) +

      UI.card({ title: T('Penyensoran tampilan'),
        body: '<label class="check"><input type="checkbox" data-change="sensor"' +
            (c.sensor ? ' checked' : '') + '> <b>' +
            T('Tutupi kata kasar bagi penerima') + '</b></label>' +
          '<p class="tbl-sub mt-2">' +
          T('Yang tersimpan selalu teks aslinya — kalau yang disimpan sudah disensor, ' +
            'bukti untuk penyelesaian sengketa ikut hilang. Penyensoran hanya terjadi ' +
            'saat pesan digambar. Pengirimnya sendiri dan pemegang izin moderasi tetap ' +
            'melihat teks utuh.') + '</p>' });
  }

  /* ================================================================ KAMUS */
  function renderKamus(c) {
    var kmus = MODERASI.kamus();

    return UI.alert('brand',
      T('Daftar bawaan sudah mencakup kata yang paling lazim. Yang Anda tambahkan di sini ' +
        'menumpuk di atasnya. Pengecualian dipakai untuk frasa kerja yang sah dan kebetulan ' +
        'mengandung kata bermuatan — misalnya “bunuh kuman”.'), '📚') +

      UI.card({ title: T('Kata tambahan'), sub: (c.tambahan || []).length + ' ' + T('kata'),
        tools: '<button class="btn btn--sm" data-act="tambah-kata">+ ' + T('Tambah kata') + '</button>',
        body: (c.tambahan || []).length
          ? '<div class="chip-pilih">' + c.tambahan.map(function (t, i) {
              var K = MODERASI.KATEGORI[t.kategori] || {};
              return '<span class="chip chip--muted">' + (K.ic || '') + ' ' + U.esc(t.kata) +
                ' <button class="chip-x" data-act="hapus-kata" data-i="' + i + '">✕</button></span>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + T('Belum ada kata tambahan.') + '</div>' }) +

      UI.card({ title: T('Pengecualian'), sub: (c.pengecualian || []).length + ' ' + T('frasa tambahan'),
        tools: '<button class="btn btn--sm" data-act="tambah-kecuali">+ ' + T('Tambah frasa') + '</button>',
        body: '<div class="chip-pilih">' +
          (c.pengecualian || []).map(function (x, i) {
            return '<span class="chip chip--ok">' + U.esc(x) +
              ' <button class="chip-x" data-act="hapus-kecuali" data-i="' + i + '">✕</button></span>';
          }).join('') + '</div>' +
          '<div class="nav-group" style="color:var(--muted);padding:12px 0 6px">' +
            T('Bawaan') + ' (' + MODERASI.PENGECUALIAN_BAWAAN.length + ')</div>' +
          '<div class="chip-pilih">' + MODERASI.PENGECUALIAN_BAWAAN.map(function (x) {
            return '<span class="chip chip--muted">' + U.esc(x) + '</span>'; }).join('') + '</div>' }) +

      UI.card({ title: T('Kamus bawaan'), sub: T('Hanya untuk ditinjau — tidak dapat diubah'),
        body: Object.keys(MODERASI.KATEGORI).map(function (k) {
          var K = MODERASI.KATEGORI[k];
          var isi = kmus[k];
          return '<div class="mt-2"><b>' + K.ic + ' ' + U.esc(T(K.nama)) + '</b>' +
            '<span class="chip chip--' + (K.tingkat === 'berat' ? 'danger' : 'warn') +
              ' chip--xs">' + U.esc(T(K.tingkat)) + '</span>' +
            '<div class="tbl-sub mt-1">' + U.esc(T(K.k)) + '</div>' +
            (isi
              ? '<div class="tbl-sub mt-1">' + isi.length + ' ' + T('kata terdaftar') + '</div>'
              : '<div class="tbl-sub mt-1">' +
                T('Dicocokkan sebagai frasa berkonteks, bukan kata tunggal — supaya ' +
                  '“bunuh kuman” tidak ikut tertangkap.') + '</div>') +
          '</div>';
        }).join('') });
  }

  /* ================================================================ UJI */
  function renderUji() {
    var hasil = ujiTeks ? MODERASI.periksa(ujiTeks) : null;

    return UI.card({ title: T('Uji kalimat'),
      sub: T('Tempel kalimat apa pun untuk melihat bagaimana penyaring membacanya'),
      body: '<textarea class="input" id="uji-teks" rows="3" ' +
          'placeholder="' + T('mis. Tolong bunuh kuman di kamar mandi ya') + '">' +
          U.esc(ujiTeks) + '</textarea>' +
        '<button class="btn mt-2" data-act="jalankan-uji">' + T('Periksa') + '</button>' +

        (hasil
          ? '<div class="mt-3">' +
            (hasil.aman
              ? UI.alert('ok', '<b>' + T('Aman.') + '</b> ' +
                  T('Kalimat ini akan terkirim tanpa penandaan.'), '✅')
              : UI.alert(hasil.tingkat === 'berat' ? 'danger' : 'warn',
                  '<b>' + (MODERASI.harusDiblokir(hasil)
                    ? T('Akan DIBLOKIR.') : T('Akan diperingatkan lalu tetap terkirim.')) + '</b> ' +
                  T('Kategori') + ': ' + hasil.kategori.map(function (k) {
                    var K = MODERASI.KATEGORI[k]; return K.ic + ' ' + U.esc(T(K.nama)); }).join(', ') +
                  '<br>' + T('Kata terdeteksi') + ': <span class="code">' +
                  U.esc(hasil.temuan.map(function (t) { return t.kata; }).join(', ')) + '</span>' +
                  '<br>' + T('Tampil bagi penerima') + ': “' +
                  U.esc(MODERASI.sensor(ujiTeks, true)) + '”',
                  hasil.tingkat === 'berat' ? '⛔' : '⚠️')) +
            '</div>'
          : '') +

        '<div class="nav-group" style="color:var(--muted);padding:16px 0 6px">' +
          T('Contoh cepat') + '</div>' +
        '<div class="chip-pilih">' +
          /* i18n:data */
          /* Contoh masukan untuk penyaring BERBAHASA INDONESIA. Polanya
             mengenali kata Indonesia; menerjemahkan contohnya membuat tombol
             "Contoh cepat" tidak lagi memicu apa pun, dan halaman ini justru
             ada untuk memperlihatkan penyaringnya bekerja. */
          ['Tolong bunuh kuman di kamar mandi ya',
           'Saya bunuh kamu kalau datang lagi',
           'Kerjanya lambat sekali, anjing',
           'Kirim foto kamu tanpa baju dong',
           'WA saya aja di 0812-3456-7890',
           'Nomor saya kosong delapan satu dua tiga empat lima',
           'Totalnya Rp 1.250.000 sudah termasuk Ppn',
           'Nomor resi JNE 123456789012 ya',
           'Tolong siapkan bom asap untuk fogging gudang'
          ] /* i18n:/data */.map(function (x) {
            return '<button class="chip chip--muted" data-act="contoh" data-t="' + U.esc(x) + '">' +
              U.esc(U.potong(x, 42)) + '</button>'; }).join('') +
        '</div>' });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    var map = AKSES.lindungi({
      tab: function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },

      mode: function (el) {
        MODERASI.simpanConfig({ mode: el.value });
        UI.toast(T('Mode penyaring diperbarui.'), 'ok');
        APP.refresh();
      },
      sensor: function (el) {
        MODERASI.simpanConfig({ sensor: el.checked });
        UI.toast(el.checked ? T('Kata kasar akan ditutup bagi penerima.')
          : T('Penyensoran tampilan dimatikan.'), 'ok');
      },
      kontak: function (el) {
        MODERASI.simpanConfig({ blokirKontak: el.checked });
        UI.toast(el.checked ? T('Nomor HP & WhatsApp kini ditolak.')
          : T('Penolakan nomor dimatikan — klien dan mitra bisa bertukar nomor.'),
          el.checked ? 'ok' : 'warn');
      },

      'tambah-kata': function () {
        UI.formModal({
          title: T('Tambah kata'),
          fields: [
            { name: 'kata', label: T('Kata atau frasa'), required: true,
              placeholder: T('huruf kecil, tanpa tanda baca') },
            { name: 'kategori', label: T('Kategori'), type: 'select', value: 'makian',
              options: Object.keys(MODERASI.KATEGORI).map(function (k) {
                return { value: k, label: MODERASI.KATEGORI[k].nama +
                  ' (' + MODERASI.KATEGORI[k].tingkat + ')' }; }) }
          ]
        }).then(function (v) {
          if (!v) return;
          var c = MODERASI.config();
          MODERASI.simpanConfig({ tambahan: (c.tambahan || [])
            .concat([{ kata: String(v.kata).toLowerCase().trim(), kategori: v.kategori }]) });
          UI.toast(T('Kata ditambahkan.'), 'ok');
          APP.refresh();
        });
      },
      'hapus-kata': function (el) {
        var i = Number(el.getAttribute('data-i'));
        var c = MODERASI.config();
        var baru = (c.tambahan || []).slice(); baru.splice(i, 1);
        MODERASI.simpanConfig({ tambahan: baru });
        APP.refresh();
      },

      'tambah-kecuali': function () {
        UI.formModal({
          title: T('Tambah pengecualian'),
          sub: T('Frasa yang selalu dianggap wajar meski mengandung kata bermuatan'),
          fields: [{ name: 'frasa', label: T('Frasa'), required: true,
            placeholder: T('mis. bunuh rayap') }]
        }).then(function (v) {
          if (!v) return;
          var c = MODERASI.config();
          MODERASI.simpanConfig({ pengecualian: (c.pengecualian || [])
            .concat([String(v.frasa).toLowerCase().trim()]) });
          UI.toast(T('Pengecualian ditambahkan.'), 'ok');
          APP.refresh();
        });
      },
      'hapus-kecuali': function (el) {
        var i = Number(el.getAttribute('data-i'));
        var c = MODERASI.config();
        var baru = (c.pengecualian || []).slice(); baru.splice(i, 1);
        MODERASI.simpanConfig({ pengecualian: baru });
        APP.refresh();
      },

      tinjau: function (el) {
        DB.update('moderasiLog', el.getAttribute('data-id'),
          { ditinjau: true, ditinjauOleh: me().id, ditinjauAt: U.nowISO() });
        UI.toast(T('Ditandai sudah ditinjau.'), 'ok');
        APP.refresh();
      },
      'ke-ruang': function (el) {
        APP.go('obrolan', { konteks: el.getAttribute('data-k'), refId: el.getAttribute('data-id') });
      },

      'jalankan-uji': function () {
        var ta = U.$('#uji-teks');
        ujiTeks = ta ? ta.value : '';
        APP.refresh();
      },
      contoh: function (el) { ujiTeks = el.getAttribute('data-t'); APP.refresh(); }
    }, {
      mode: 'komunikasi.moderasi', sensor: 'komunikasi.moderasi',
      kontak: 'komunikasi.moderasi',
      'tambah-kata': 'komunikasi.moderasi', 'hapus-kata': 'komunikasi.moderasi',
      'tambah-kecuali': 'komunikasi.moderasi', 'hapus-kecuali': 'komunikasi.moderasi',
      tinjau: 'komunikasi.moderasi'
    });

    U.delegate(root, map);
  }

  var pagesAdmin = {
    moderasi: {
      label: 'Moderasi Percakapan', icon: '🛡️', grup: 'Komunikasi',
      sub: 'Penyaring kata tidak pantas — melindungi klien dan mitra',
      render: render, mount: aksi,
      badge: function () { return MODERASI.ringkasan().belumDitinjau; }
    }
  };

  return { pagesAdmin: pagesAdmin, render: render };
})();
