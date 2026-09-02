/* ==========================================================================
   views/obrolan.js — antarmuka obrolan klien ↔ mitra
   Daftar ruang • percakapan • pemilih template • pengawasan (admin)
   ========================================================================== */
var ViewObrolan = (function () {

  var T = function (s) { return I18N.t(s); };

  function me() { return APP.user; }
  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ DAFTAR RUANG */
  /* Keadaan pencarian bertahan di luar render supaya menyegarkan daftar —
     mis. setelah pesan baru masuk — tidak menghapus kata kunci yang sedang
     diketik admin. */
  var cari = { kueri: '', jenis: '', status: '', lampiran: false, belum: false };
  var tundaCari = null;

  function renderDaftar(params) {
    if (params && params.refId) return renderRuang(params.konteks, params.refId);

    var pengawas = AKSES.boleh('komunikasi.chat.awasi', me());
    var s = CHAT.statistik(me());

    if (!s.ruang && !adaFilter()) {
      return '<div class="page">' + UI.empty('💬', T('Belum ada obrolan'),
        T('Obrolan terbuka otomatis begitu ada pekerjaan atau pesanan toko yang ' +
          'melibatkan Anda. Semua percakapan tersimpan dan bisa dibuka kembali kapan saja.')) + '</div>';
    }

    return '<div class="page">' +
      (pengawas
        ? UI.alert('warn', '<b>' + T('Mode pengawasan.') + '</b> ' +
            T('Anda dapat menelusuri percakapan milik klien dan mitra untuk keperluan ' +
              'penyelesaian sengketa. Setiap percakapan yang dibuka tercatat di log aktivitas, ' +
              'dan Anda tidak dapat ikut membalas.'), '👁️')
        : UI.alert('brand', '<b>' + T('Obrolan tersimpan di dalam aplikasi.') + '</b> ' +
            T('Setiap percakapan terikat pada satu pekerjaan atau pesanan, dan riwayatnya ' +
              'tidak hilang. Demi keamanan kedua pihak, nomor telepon tidak ditampilkan dan ' +
              'seluruh kesepakatan sebaiknya tetap tercatat di sini.'), '🔒')) +

      (pengawas ? '<div class="row wrap mt-2" style="gap:8px">' +
        UI.stat({ label: T('Ruang percakapan'), value: s.ruang, icon: '💬', small: true }) +
        UI.stat({ label: T('Sedang aktif'), value: s.aktif, icon: '🟢', small: true }) +
        UI.stat({ label: T('Total pesan'), value: s.pesan, icon: '✉️', small: true }) +
        UI.stat({ label: T('Lampiran'), value: s.lampiran, icon: '📎', small: true }) +
      '</div>' : '') +

      bilahCari() +
      '<div id="chat-hasil">' + hasilHTML() + '</div>' +
    '</div>';
  }

  function adaFilter() {
    return !!(cari.kueri || cari.jenis || cari.status || cari.lampiran || cari.belum);
  }

  function bilahCari() {
    function chip(nama, nilai, label) {
      var on = cari[nama] === nilai || (nilai === true && cari[nama] === true);
      return '<button type="button" class="chip' + (on ? ' chip--brand' : ' chip--muted') + '" ' +
        'data-act="filter" data-n="' + nama + '" data-v="' + U.esc(String(nilai)) + '">' +
        U.esc(T(label)) + '</button>';
    }

    return '<div class="chat-cari mt-3">' +
      '<div class="chat-cari__box">' +
        '<span class="chat-cari__ic">🔍</span>' +
        '<input type="search" class="input" id="chat-q" autocomplete="off" ' +
          'value="' + U.esc(cari.kueri) + '" ' +
          'placeholder="' + T('Cari nama klien, mitra, nomor pekerjaan, atau isi pesan…') + '">' +
        (adaFilter() ? '<button type="button" class="chat-cari__x" data-act="bersihkan" ' +
          'title="' + T('Bersihkan') + '">✕</button>' : '') +
      '</div>' +
      '<div class="chip-pilih mt-2">' +
        chip('jenis', '', T('Semua jenis')) +
        chip('jenis', 'order', T('🧹 Pekerjaan')) +
        chip('jenis', 'toko', T('🛒 Pesanan toko')) +
        '<span style="width:12px"></span>' +
        chip('status', '', 'Aktif & arsip') +
        chip('status', 'aktif', 'Aktif saja') +
        chip('status', 'arsip', 'Arsip saja') +
        '<span style="width:12px"></span>' +
        chip('lampiran', true, '📎 Ada lampiran') +
        chip('belum', true, T('● Belum dibaca')) +
      '</div>' +
    '</div>';
  }

  /** Hanya bagian ini yang digambar ulang saat mengetik, supaya fokus tidak lepas. */
  function hasilHTML() {
    var hasil = CHAT.cari(me(), cari.kueri, {
      jenis: cari.jenis || null, status: cari.status || null,
      lampiran: cari.lampiran || null, belum: cari.belum || null
    });

    if (!hasil.length) {
      return UI.empty('🔍', T('Tidak ada yang cocok'),
        adaFilter()
          ? T('Coba kata kunci lain, atau longgarkan penyaringnya. Pencarian menjangkau ' +
              'nama peserta, nomor dokumen, judul pekerjaan, isi pesan, dan nama berkas lampiran.')
          : T('Belum ada percakapan yang bisa ditampilkan.'));
    }

    var aktif = hasil.filter(function (h) { return h.ruang.status === 'aktif'; });
    var arsip = hasil.filter(function (h) { return h.ruang.status === 'arsip'; });

    return (adaFilter()
      ? '<div class="tbl-sub mt-2" style="padding:0 2px 4px">' +
        hasil.length + ' ' + T('percakapan cocok') +
        (cari.kueri ? ' ' + T('untuk') + ' “' + U.esc(cari.kueri) + '”' : '') + '</div>'
      : '') +

      (aktif.length ? UI.card({ title: T('Percakapan aktif'),
        sub: aktif.length + ' ' + T('ruang'), flush: true,
        body: aktif.map(barisHasil).join('') }) : '') +

      (arsip.length ? UI.card({ title: T('Arsip'),
        sub: T('Selesai lebih dari') + ' ' + CHAT.HARI_ARSIP + ' ' + T('hari — hanya bisa dibaca'),
        flush: true, body: arsip.map(barisHasil).join('') }) : '');
  }

  /**
   * Tebalkan bagian yang cocok. Teks di-escape LEBIH DULU, penandanya
   * disisipkan setelahnya — kalau dibalik, isi pesan yang memuat tanda kurung
   * siku bisa menyuntikkan markup ke halaman.
   */
  function sorot(teks, kata) {
    var aman = U.esc(String(teks || ''));
    if (!kata || !kata.length) return aman;
    kata.forEach(function (k) {
      if (!k) return;
      var pola = new RegExp('(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      aman = aman.replace(pola, '<mark>$1</mark>');
    });
    return aman;
  }

  function barisHasil(h) {
    var r = h.ruang;
    var belum = CHAT.belumDibacaRuang(me(), r);
    var lawan = CHAT.lawanBicara(me(), r);
    var namaLawan = lawan.length
      ? lawan.map(function (u) { return u.nama; }).join(', ')
      : T('Belum ada lawan bicara');

    /* Untuk pengawas, sebutkan siapa kliennya secara terpisah — "lawan bicara"
       tidak bermakna bagi orang yang bukan peserta. */
    var pengawas = !CHAT.peserta(me(), r);
    var judulBaris = pengawas
      ? r.pesertaIds.map(function (id) { return BIZ.nama(id); }).join(' ↔ ')
      : namaLawan;

    return '<div class="chat-row' + (belum ? ' unread' : '') + '" data-act="buka" ' +
        'data-k="' + U.esc(r.konteks) + '" data-id="' + U.esc(r.refId) + '">' +
      '<div class="chat-row__ic">' + r.ic + '</div>' +
      '<div class="chat-row__body">' +
        '<div class="row"><b>' + sorot(U.potong(judulBaris, 46), h.kata) + '</b>' +
          (belum ? '<span class="chip chip--brand chip--xs">' + belum + ' ' + T('baru') + '</span>' : '') +
          (r.status === 'arsip' ? '<span class="chip chip--muted chip--xs">' + T('arsip') + '</span>' : '') +
          '<div class="spacer"></div>' +
          '<span class="tbl-sub">' + (r.terakhir ? U.sejak(r.terakhir.createdAt) : '') + '</span>' +
        '</div>' +
        '<div class="tbl-sub">' + sorot(r.no, h.kata) + ' • ' + sorot(U.potong(r.judul, 40), h.kata) +
          (h.berkas ? ' • 📎 ' + h.berkas : '') + '</div>' +

        (h.cuplikan.length
          ? '<div class="chat-row__hit">' + h.cuplikan.map(function (m) {
              return '<div><span class="muted">' + U.esc(BIZ.nama(m.dari)) + ': </span>' +
                sorot(U.potong(CHAT.ringkas(m), 96), h.kata) + '</div>';
            }).join('') +
            (h.jumlahCocok > h.cuplikan.length
              ? '<div class="muted">+' + (h.jumlahCocok - h.cuplikan.length) + ' ' +
                T('pesan lain yang cocok') + '</div>' : '') +
            '</div>'
          : '<div class="chat-row__last">' +
            (r.terakhir
              ? (r.terakhir.dari === me().id ? '<span class="muted">' + T('Anda') + ': </span>' : '') +
                U.esc(U.potong(CHAT.ringkas(r.terakhir), 72))
              : '<span class="muted">' + T('Belum ada pesan — mulai percakapan') + '</span>') +
            '</div>') +
      '</div>' +
    '</div>';
  }

  /* ================================================================ SATU RUANG */
  function renderRuang(konteks, refId) {
    var r = CHAT.ruang(konteks, refId);
    if (!r) return '<div class="page">' + UI.empty('🚫', T('Obrolan tidak ditemukan'),
      T('Pekerjaan atau pesanan yang menaunginya sudah tidak ada.')) + '</div>';

    if (!CHAT.bolehBaca(me(), r)) {
      return '<div class="page">' + UI.empty('🔒', T('Tidak dapat dibuka'),
        T('Anda bukan peserta percakapan ini.')) + '</div>';
    }

    var pengawas = !CHAT.peserta(me(), r);
    /* Pengawas membaca tanpa jejak baca supaya hitungan "belum dibaca" milik
       peserta tidak terganggu; kunjungannya dicatat di log aktivitas. */
    if (pengawas) DB.log(me().id, 'chat.awasi', konteks, refId, r.no);
    else CHAT.tandaiDibaca(me(), konteks, refId);

    var ps = CHAT.pesan(konteks, refId);
    var lawan = CHAT.lawanBicara(me(), r);

    return '<div class="page chat-page">' +
      '<button class="btn btn--ghost btn--sm" data-act="kembali">← ' + T('Semua obrolan') + '</button>' +

      '<div class="chat-head mt-2">' +
        '<div class="chat-head__ic">' + r.ic + '</div>' +
        '<div style="min-width:0">' +
          '<b>' + U.esc(lawan.map(function (u) { return u.nama; }).join(', ') || '—') + '</b>' +
          '<div class="tbl-sub">' + U.esc(T(r.jenis)) + ' ' + U.esc(r.no) + ' • ' + U.esc(r.sub) + '</div>' +
        '</div>' +
        '<div class="spacer"></div>' +
        (r.status === 'arsip'
          ? '<span class="chip chip--muted">' + T('Arsip') + '</span>'
          : '<span class="chip chip--ok chip--dot">' + T('Aktif') + '</span>') +
      '</div>' +

      (pengawas ? UI.alert('warn', '<b>' + T('Mode pengawasan.') + '</b> ' +
        T('Anda membaca percakapan milik orang lain sebagai admin. ' +
          'Pembacaan ini tercatat di log aktivitas dan Anda tidak dapat mengirim pesan.'), '👁️') : '') +

      '<div class="chat-body" id="chat-body">' +
        (ps.length ? gelembungSemua(ps, r) : UI.empty('👋', T('Belum ada pesan'),
          T('Mulai dengan salah satu template di bawah, atau tulis sendiri.'))) +
      '</div>' +

      (CHAT.bolehTulis(me(), r) ? komposer(r) : blokTertutup(r, pengawas)) +
    '</div>';
  }

  /**
   * Keterangan saat kotak ketik tidak tersedia.
   *
   * Sebabnya dibaca dari CHAT.kunciTulis(), bukan ditebak dari status ruang:
   * ruang bisa masih "aktif" bagi klien sementara jendela menulis mitra sudah
   * tertutup, dan menebak dari status ruang akan menampilkan alasan yang salah
   * kepada orang yang paling perlu memahaminya.
   */
  function blokTertutup(r, pengawas) {
    if (pengawas) {
      return '<div class="chat-tutup">' + T('Pengawas hanya dapat membaca.') + '</div>';
    }
    var k = CHAT.kunciTulis(me(), r) || {};
    var pesan;
    if (k.sebab === 'arsip') {
      pesan = T('Percakapan ini sudah diarsipkan ') + CHAT.HARI_ARSIP +
        T(' hari setelah pekerjaan selesai. Riwayatnya tetap tersimpan, tetapi tidak bisa diisi lagi.');
    } else if (k.sebab === 'pekerjaan-tuntas') {
      pesan = '<b>' + T('Pekerjaan ini sudah selesai — obrolannya ditutup.') + '</b><br>' +
        T('Obrolan dengan klien terbuka sejak Anda menerima order sampai pekerjaannya tuntas. ' +
          'Riwayatnya tetap bisa Anda baca. Bila masih ada yang perlu disampaikan, hubungi supervisor Anda.');
    } else if (k.sebab === 'order-hilang') {
      pesan = T('Data pekerjaannya tidak ditemukan lagi.');
    } else {
      pesan = T('Anda tidak dapat menulis di percakapan ini.');
    }
    return '<div class="chat-tutup">' + pesan + '</div>';
  }

  function gelembungSemua(ps, r) {
    var hariTerakhir = null;
    return ps.map(function (m) {
      var hari = U.iso(m.createdAt);
      var pemisah = '';
      if (hari !== hariTerakhir) {
        hariTerakhir = hari;
        pemisah = '<div class="chat-day"><span>' +
          (hari === U.today() ? T('Hari ini') : U.tglPanjang(hari)) + '</span></div>';
      }
      return pemisah + gelembung(m, r);
    }).join('');
  }

  function gelembung(m, r) {
    var saya = m.dari === me().id;
    var pengirim = BIZ.user(m.dari);
    var dibaca = (m.dibacaOleh || []).filter(function (id) { return id !== m.dari; }).length;
    return '<div class="chat-msg' + (saya ? ' mine' : '') + '">' +
      (saya ? '' : '<div class="chat-msg__ava">' + UI.avatar(pengirim ? pengirim.nama : '?') + '</div>') +
      '<div class="chat-msg__bubble">' +
        (saya ? '' : '<div class="chat-msg__who">' + U.esc(pengirim ? pengirim.nama : '—') +
          ' <span class="chip chip--muted chip--xs">' + U.esc(labelPeran(m.peran)) + '</span></div>') +
        ((m.lampiran || []).length ? lampiranHTML(m.lampiran) : '') +
        (m.isi ? '<div class="chat-msg__isi">' + isiTampil(m) + '</div>' : '') +
        (m.ditandai ? tandaModerasi(m) : '') +
        '<div class="chat-msg__meta">' + U.jam(m.createdAt) +
          (saya ? ' • ' + (dibaca ? T('dibaca') : T('terkirim')) : '') + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ================================================================ LAMPIRAN */
  /**
   * Foto dan video digambar dari thumbnail yang tersimpan di dalam pesan,
   * bukan dari IndexedDB — supaya seluruh percakapan tampil seketika tanpa
   * menunggu pembacaan asinkron satu per satu. Berkas aslinya baru diambil
   * ketika benar-benar dibuka atau diunduh.
   */
  function lampiranHTML(list) {
    var media = list.filter(function (l) { return l.jenis === 'foto' || l.jenis === 'video'; });
    var dok = list.filter(function (l) { return l.jenis === 'berkas'; });

    return (media.length
      ? '<div class="lam-grid' + (media.length === 1 ? ' one' : '') + '">' +
        media.map(function (l) {
          return '<button type="button" class="lam-media" data-act="buka-lampiran" ' +
              'data-id="' + U.esc(l.id) + '" title="' + U.esc(l.nama) + '">' +
            (l.thumb
              ? '<img src="' + l.thumb + '" alt="' + U.esc(l.nama) + '">'
              : '<span class="lam-media__kosong">' + BERKAS.ikon(l) + '</span>') +
            (l.jenis === 'video'
              ? '<span class="lam-media__play">▶</span>' +
                (l.durasi ? '<span class="lam-media__dur">' + BERKAS.durasiTeks(l.durasi) + '</span>' : '')
              : '') +
          '</button>';
        }).join('') + '</div>'
      : '') +

      (dok.length
        ? dok.map(function (l) {
          return '<div class="lam-file">' +
            '<span class="lam-file__ic">' + BERKAS.ikon(l) + '</span>' +
            '<span class="lam-file__body">' +
              '<b>' + U.esc(U.potong(l.nama, 34)) + '</b>' +
              '<small>' + BERKAS.ukuranTeks(l.ukuran) + '</small>' +
            '</span>' +
            '<button type="button" class="lam-file__dl" data-act="unduh-lampiran" ' +
              'data-id="' + U.esc(l.id) + '" title="' + T('Unduh') + '">⬇</button>' +
          '</div>';
        }).join('')
        : '');
  }

  /** Cari keterangan lampiran dari seluruh pesan di ruang yang sedang dibuka. */
  function cariLampiran(id, params) {
    var hasil = null;
    CHAT.pesan(params.konteks, params.refId).forEach(function (m) {
      (m.lampiran || []).forEach(function (l) { if (l.id === id) hasil = l; });
    });
    return hasil;
  }

  /** Buka foto/video ukuran penuh dari IndexedDB. */
  function bukaLampiran(l) {
    BERKAS.url(l.id).then(function (u) {
      if (!u) { UI.toast(T('Berkas tidak ada di perangkat ini. ' +
        'Lampiran tersimpan lokal, jadi tidak ikut berpindah antar perangkat.'), 'warn'); return; }

      UI.modal({
        title: l.nama, sub: BERKAS.ukuranTeks(l.ukuran) +
          (l.durasi ? ' • ' + BERKAS.durasiTeks(l.durasi) : ''),
        size: 'wide',
        body: '<div class="lam-lihat">' +
          (l.jenis === 'video'
            ? '<video src="' + u + '" controls playsinline preload="metadata"></video>'
            : '<img src="' + u + '" alt="' + U.esc(l.nama) + '">') +
        '</div>',
        foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
          '<button class="btn" data-act="unduh-ini">⬇ ' + T('Simpan ke perangkat') + '</button>',
        actions: { 'unduh-ini': function () { BERKAS.unduh(l); } }
      });
    });
  }

  function labelPeran(p) {
    return { client: 'Klien', mitra: 'Mitra', supervisor: 'Supervisor' }[p] || 'Peserta';
  }

  /* ================================================================ MODERASI */
  /**
   * Yang TERSIMPAN selalu teks aslinya; penyensoran terjadi saat digambar.
   * Kalau yang disimpan sudah disensor, bukti untuk penyelesaian sengketa
   * ikut hilang — padahal justru itu yang paling dibutuhkan nanti.
   *
   * Pengirimnya sendiri tetap melihat tulisannya utuh: menyensor kalimat
   * seseorang di hadapannya sendiri tidak melindungi siapa pun, hanya
   * membingungkan.
   */
  function isiTampil(m) {
    var teks = m.isi;
    var bolehUtuh = m.dari === me().id || AKSES.boleh('komunikasi.moderasi', me());
    if (m.ditandai && !bolehUtuh) {
      /* Penyensoran mengikuti temuan yang benar-benar berlaku bagi
         PENGIRIMNYA — nomor hotline dari supervisor tidak ikut ditutup. */
      teks = MODERASI.sensor(teks, false, BIZ.user(m.dari));
    }
    return U.esc(teks).replace(/\n/g, '<br>');
  }

  function tandaModerasi(m) {
    var d = m.ditandai;
    var nama = (d.kategori || []).map(function (k) {
      return (MODERASI.KATEGORI[k] || {}).nama || k; }).join(', ');
    var pengawas = AKSES.boleh('komunikasi.moderasi', me());
    return '<div class="chat-flag ' + U.esc(d.tingkat) + '">' +
      '<span>⚠️</span><span>' +
      (m.dari === me().id
        ? T('Pesan ini ditandai sistem') + ' — ' + U.esc(nama.toLowerCase()) + '. ' +
          T('Isi seperti ini tercatat dan dapat ditinjau admin.')
        : pengawas
          ? T('Ditandai sistem') + ': ' + U.esc(nama.toLowerCase()) +
            ' — ' + T('Anda melihat teks utuh sebagai pemegang izin moderasi.')
          : T('Sebagian kata ditutup karena melanggar aturan percakapan.')) +
      '</span></div>';
  }

  /* Lampiran yang sudah disiapkan tetapi pesannya belum dikirim. Disimpan di
     luar render supaya tidak hilang saat halaman digambar ulang. */
  var draftLampiran = [];

  function komposer(r) {
    var bisaLampir = BERKAS.tersedia();
    return '<form class="chat-komposer" data-submit="kirim">' +
      '<div class="chat-komposer__tools">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-act="template">💬 ' +
          T('Template pesan') + '</button>' +

        (bisaLampir
          ? '<label class="btn btn--ghost btn--sm" title="' + T('Foto atau video') + '">📷 ' +
              T('Foto / Video') +
              '<input type="file" hidden multiple accept="image/*,video/*" data-change="pilih-media"></label>' +
            '<label class="btn btn--ghost btn--sm" title="' + T('Dokumen') + '">📎 ' + T('Berkas') +
              '<input type="file" hidden multiple data-change="pilih-berkas"></label>'
          : '') +

        '<div class="spacer"></div>' +
        '<span class="tbl-sub">' + T('Nomor telepon sengaja tidak ditampilkan — ' +
          'semua percakapan tercatat di sini.') + '</span>' +
      '</div>' +

      (bisaLampir ? '' : UI.alert('warn',
        T('Browser ini memblokir penyimpanan berkas (biasanya karena mode penyamaran), ' +
          'jadi lampiran tidak bisa dikirim. Teks tetap bisa.'), '📎')) +

      '<div id="chat-lampiran">' + draftHTML() + '</div>' +

      '<div class="chat-komposer__row">' +
        '<textarea class="input" id="chat-isi" name="isi" rows="2" ' +
          'placeholder="' + T('Tulis pesan…') + '"></textarea>' +
        '<button class="btn btn--lg" type="submit">' + T('Kirim') + '</button>' +
      '</div>' +
      '<div id="chat-warn"></div>' +
    '</form>';
  }

  function draftHTML() {
    if (!draftLampiran.length) return '';
    return '<div class="lam-draft">' + draftLampiran.map(function (l) {
      return '<div class="lam-draft__item">' +
        (l.thumb ? '<img src="' + l.thumb + '" alt="">'
          : '<span class="lam-draft__ic">' + BERKAS.ikon(l) + '</span>') +
        '<span class="lam-draft__nama">' + U.esc(U.potong(l.nama, 22)) + '<br>' +
          '<small>' + BERKAS.ukuranTeks(l.ukuran) +
          (l.durasi ? ' • ' + BERKAS.durasiTeks(l.durasi) : '') + '</small></span>' +
        '<button type="button" class="lam-draft__x" data-act="buang-lampiran" ' +
          'data-id="' + U.esc(l.id) + '" title="' + T('Buang') + '">✕</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  function gambarDraft() {
    var box = U.$('#chat-lampiran');
    if (box) box.innerHTML = draftHTML();
  }

  /** Proses berkas yang dipilih pengguna, lalu tampilkan sebagai draf. */
  function terimaBerkas(inputEl) {
    var files = Array.prototype.slice.call(inputEl.files || []);
    if (!files.length) return;
    var sisa = BERKAS.BATAS.perPesan - draftLampiran.length;
    if (sisa <= 0) {
      UI.toast(T('Maksimal') + ' ' + BERKAS.BATAS.perPesan + ' ' + T('lampiran per pesan.'), 'warn');
      inputEl.value = '';
      return;
    }
    var box = U.$('#chat-lampiran');
    if (box) box.innerHTML = '<div class="tbl-sub" style="padding:8px 2px">⏳ ' +
      T('Memproses berkas…') + '</div>';

    BERKAS.siapkanBanyak(files.slice(0, sisa)).then(function (h) {
      inputEl.value = '';
      draftLampiran = draftLampiran.concat(h.lampiran);
      gambarDraft();
      if (h.gagal.length) UI.toast(h.gagal.join(' • '), 'err');
      if (files.length > sisa) {
        UI.toast(T('Hanya') + ' ' + sisa + ' ' + T('berkas pertama yang diambil — batasnya') +
          ' ' + BERKAS.BATAS.perPesan + ' ' + T('per pesan.'), 'warn');
      }
    });
  }

  /** Buang satu draf sekaligus hapus blob-nya — jangan tinggalkan sampah. */
  function buangDraft(id) {
    draftLampiran = draftLampiran.filter(function (l) { return l.id !== id; });
    BERKAS.hapus(id);
    gambarDraft();
  }

  /**
   * Meninggalkan ruang tanpa mengirim berarti lampirannya batal. Blob-nya
   * dihapus sekarang juga; kalau tidak, ia menjadi yatim di IndexedDB dan
   * baru terbuang saat pembersihan berikutnya.
   */
  function buangSemuaDraft() {
    draftLampiran.forEach(function (l) { BERKAS.hapus(l.id); });
    draftLampiran = [];
  }

  /* ================================================================ TEMPLATE */
  function dialogTemplate(r) {
    var set = CHAT.templateUntuk(me(), r);
    var ctx = CHAT.ctxRuang(me(), r);

    UI.modal({
      title: T('Template pesan'),
      sub: T('Pilih satu, teksnya masuk ke kolom tulis dan masih bisa disunting'),
      size: 'wide',
      body: set.map(function (g) {
        return '<div class="nav-group" style="color:var(--muted);padding:14px 0 6px">' +
            g.ic + ' ' + U.esc(T(g.grup)) + '</div>' +
          g.items.map(function (it) {
            return '<button type="button" class="tpl-item" data-act="pakai" data-k="' + U.esc(it.k) + '">' +
              '<b>' + U.esc(T(it.label)) + '</b>' +
              '<span>' + U.esc(U.potong(it.teks(ctx), 118)) + '</span>' +
            '</button>';
          }).join('');
      }).join(''),
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>',
      actions: {
        pakai: function (el) {
          var teks = CHAT.susun(el.getAttribute('data-k'), me(), r);
          tutupModal(el);
          var ta = U.$('#chat-isi');
          if (ta) { ta.value = teks || ''; ta.focus(); periksa(ta.value); }
        }
      }
    });
  }

  /**
   * Peringatan langsung saat mengetik. Dua lapis yang berbeda tujuannya:
   * moderasi isi (melindungi orangnya) dan peringatan transaksi luar
   * (melindungi haknya). Yang berat ditampilkan lebih dulu dan tombol Kirim
   * dimatikan — memberi tahu sesudah ditolak jauh lebih menjengkelkan
   * daripada memberi tahu sebelum menekan tombol.
   */
  function periksa(teks) {
    var box = U.$('#chat-warn');
    if (!box) return;

    var mod = MODERASI.saring(MODERASI.periksa(teks), me());
    var tolak = MODERASI.harusDiblokir(mod, me());
    var luar = CHAT.periksaIsi(teks);
    var html = '';

    if (!mod.aman) {
      var nama = mod.kategori.map(function (k) {
        return MODERASI.KATEGORI[k].ic + ' ' + T(MODERASI.KATEGORI[k].nama); }).join(', ');
      var adaKontak = mod.kategori.indexOf('kontak') >= 0;

      html += tolak
        ? UI.alert('danger', '<b>' + T('Pesan ini tidak akan terkirim.') + '</b> ' +
            T('Terdeteksi') + ' ' + nama + '. ' +
            (adaKontak
              ? T('Seluruh percakapan sengaja dijaga tetap di dalam aplikasi — di sinilah ' +
                  'riwayatnya tersimpan dan pembayarannya terlindungi. Untuk urusan yang ' +
                  'butuh telepon, hubungi admin EXOCLEAN.')
              : T('Aturan ini melindungi klien maupun mitra. Silakan tulis ulang tanpa bagian tersebut.')),
            adaKontak ? '📵' : '⛔')
        : UI.alert('warn', '<b>' + T('Terdeteksi') + ' ' + nama + '.</b> ' +
            T('Pesan tetap bisa dikirim, tetapi bagian tersebut akan ditutup bagi penerima ' +
              'dan kejadiannya tercatat untuk ditinjau admin.'), '⚠️');
    }

    if (luar.length) {
      html += UI.alert('warn', '<b>' + T('Periksa lagi sebelum mengirim.') + '</b> ' +
        luar.map(function (x) { return U.esc(T(x)); }).join(' ') + ' ' +
        T('Menyepakati pekerjaan atau pembayaran di luar aplikasi membuat Anda ' +
          'kehilangan jaminan, bukti, dan perlindungan bagi hasil.'), '⚠️');
    }

    box.innerHTML = html;

    var btn = box.closest('form') && box.closest('form').querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = tolak;
      btn.textContent = tolak ? T('Tidak dapat dikirim') : T('Kirim');
    }
  }

  /* ================================================================ AKSI */
  function aksi(root, params) {
    var map = {
      buka: function (el) {
        buangSemuaDraft();
        APP.go('obrolan', {
          konteks: el.getAttribute('data-k'), refId: el.getAttribute('data-id')
        });
      },

      /* --- pencarian --- */
      filter: function (el) {
        var n = el.getAttribute('data-n'), v = el.getAttribute('data-v');
        /* Penyaring boolean berperilaku sebagai sakelar; yang bernilai teks
           diganti begitu saja, dengan '' berarti "semua". */
        if (v === 'true') cari[n] = !cari[n];
        else cari[n] = v;
        APP.refresh();
      },
      bersihkan: function () {
        cari = { kueri: '', jenis: '', status: '', lampiran: false, belum: false };
        APP.refresh();
      },
      kembali: function () { buangSemuaDraft(); APP.go('obrolan', {}); },
      template: function () {
        var r = CHAT.ruang(params.konteks, params.refId);
        if (r) dialogTemplate(r);
      },
      'pilih-media': function (el) { terimaBerkas(el); },
      'pilih-berkas': function (el) { terimaBerkas(el); },
      'buang-lampiran': function (el) { buangDraft(el.getAttribute('data-id')); },
      'buka-lampiran': function (el) {
        var l = cariLampiran(el.getAttribute('data-id'), params);
        if (l) bukaLampiran(l);
      },
      'unduh-lampiran': function (el) {
        var l = cariLampiran(el.getAttribute('data-id'), params);
        if (l) BERKAS.unduh(l);
      },
      kirim: function (el, ev) {
        ev.preventDefault();
        var ta = U.$('#chat-isi');
        var isi = ta ? ta.value : '';
        try {
          CHAT.kirim(me(), params.konteks, params.refId, isi, null, draftLampiran);
          draftLampiran = [];
          APP.refresh();
        } catch (e) { UI.toast(e.message, 'err'); }
      }
    };
    U.delegate(root, map);

    var ta = root.querySelector('#chat-isi');
    if (ta) {
      ta.addEventListener('input', function () { periksa(ta.value); });
      /* Enter mengirim, Shift+Enter membuat baris baru — kebiasaan yang sudah
         terbentuk dari aplikasi pesan lain, jadi tidak perlu dipelajari. */
      ta.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          var f = ta.closest('form');
          if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
    }

    /* Mengetik hanya menggambar ulang DAFTAR HASIL, bukan seluruh halaman —
       kalau halaman dirender ulang, kolom pencarian kehilangan fokus dan
       posisi kursor pada setiap huruf yang diketik. */
    var q = root.querySelector('#chat-q');
    if (q) {
      q.addEventListener('input', function () {
        cari.kueri = q.value;
        if (tundaCari) clearTimeout(tundaCari);
        tundaCari = setTimeout(function () {
          var box = U.$('#chat-hasil');
          if (box) box.innerHTML = hasilHTML();
          var x = root.querySelector('.chat-cari__x');
          /* tombol bersihkan menyusul muncul begitu ada yang diketik */
          if (!x && adaFilter()) {
            var kotak = root.querySelector('.chat-cari__box');
            if (kotak) {
              var b = document.createElement('button');
              b.type = 'button'; b.className = 'chat-cari__x';
              b.setAttribute('data-act', 'bersihkan');
              b.title = T('Bersihkan'); b.textContent = '✕';
              kotak.appendChild(b);
            }
          }
        }, 160);
      });
      q.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { cari.kueri = ''; q.value = ''; APP.refresh(); }
      });
    }

    var body = root.querySelector('#chat-body');
    if (body) body.scrollTop = body.scrollHeight;

    /* Membuka percakapan menandai pesannya terbaca — itu terjadi saat render,
       setelah bilah atas tergambar. Lencananya disegarkan di sini supaya
       angkanya turun seketika, bukan pada render berikutnya. */
    if (params && params.refId && APP.segarkanTopbar) APP.segarkanTopbar();
  }

  /* ================================================================ HALAMAN */
  function lencana() { return CHAT.belumDibaca(APP.user); }

  var halaman = {
    label: 'Obrolan', icon: '💬', grup: 'Utama',
    sub: 'Percakapan dengan mitra — tersimpan permanen',
    render: renderDaftar,
    mount: function (root, params) { aksi(root, params || {}); },
    badge: lencana
  };

  var pages = { obrolan: halaman };

  /* Halaman admin memakai render yang sama: hak baca sudah dijaga CHAT,
     dan pengawas otomatis mendapat mode baca-saja. */
  var pagesAdmin = {
    obrolan: {
      label: 'Obrolan Klien–Mitra', icon: '💬', grup: 'Komunikasi',
      sub: 'Cari percakapan menurut nama, nomor dokumen, atau isi pesan — hanya dapat dibaca',
      render: renderDaftar,
      mount: function (root, params) { aksi(root, params || {}); }
    }
  };

  return { pages: pages, pagesAdmin: pagesAdmin, halaman: halaman, lencana: lencana };
})();
