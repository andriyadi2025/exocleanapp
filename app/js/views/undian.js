/* ==========================================================================
   views/undian.js — Undian Berhadiah (halaman tersendiri)
   --------------------------------------------------------------------------
   Dipisahkan dari halaman Voucher karena pekerjaannya memang berbeda:
   voucher dikelola sekali lalu ditinggal, sedangkan undian punya siklus —
   dibuka, tiket terkumpul, diundi, diumumkan. Menyatukannya membuat tombol
   "Undi sekarang" — satu tombol yang tidak bisa dibatalkan — berbagi layar
   dengan pengaturan katalog sehari-hari.

   MESINNYA TETAP SATU (VOUCHER), dan itu disengaja: tiket undian SECARA
   TEKNIS adalah voucher — ia dibeli, ditukar poin, punya kode, punya masa
   berlaku, dan punya kuota. Menyalin seluruh mesin itu ke modul kedua berarti
   dua tempat yang harus diperbaiki setiap ada perubahan. Yang dipisah adalah
   HALAMAN dan HAK AKSESNYA, bukan datanya.
   ========================================================================== */
var ViewUndian = (function () {

  var T = function (s) { return I18N.t(s); };
  var tab = 'berjalan';

  function me() { return APP.user; }

  /** Produk voucher berjenis undian — inilah "undian" bagi pengguna halaman ini. */
  function daftarUndian() {
    return VOUCHER.semuaProduk().filter(function (p) { return p.jenis === 'undian'; });
  }

  function tiket(produkId) {
    return DB.where('voucher', function (v) { return v.produkId === produkId; });
  }

  function sudahDiundi(produkId) {
    return VOUCHER.riwayatUndian().filter(function (r) { return r.produkId === produkId; });
  }

  /* ================================================================ HALAMAN */
  function render() {
    var list = daftarUndian();
    var riwayat = VOUCHER.riwayatUndian();
    var semuaTiket = DB.all('voucher').filter(function (v) { return v.jenis === 'undian'; });
    var siap = U.sum(list, function (p) { return VOUCHER.pesertaUndian(p.id).length; });
    var totalHadiah = U.sum(riwayat, function (r) { return (r.nilaiHadiah || 0) * r.jumlahPemenang; });

    return '<div class="page">' +
      UI.alert('brand', '<b>' + T('Undian dikelola terpisah dari voucher biasa.') + '</b> ' +
        T('Tiket undian bukan alat bayar — ia tidak pernah muncul saat checkout. ' +
          'Nilainya baru ada setelah diundi, dan pengundian tidak bisa dibatalkan. ' +
          'Karena itu halamannya sendiri, dan izinnya sendiri.'), '🎰') +

      '<div class="row wrap mt-2" style="gap:8px">' +
        UI.stat({ label: T('Undian tersedia'), value: list.length, icon: '🎰', small: true,
          meta: list.filter(function (p) { return p.aktif !== false; }).length + ' ' + T('aktif') }) +
        UI.stat({ label: T('Tiket siap diundi'), value: U.num(siap), icon: '🎫', small: true }) +
        UI.stat({ label: T('Total tiket terbit'), value: U.num(semuaTiket.length), icon: '📊', small: true,
          meta: U.rp(U.sum(semuaTiket, function (v) { return v.hargaBayar || 0; })) }) +
        UI.stat({ label: T('Sudah diundi'), value: riwayat.length, icon: '🏆', small: true,
          meta: T('hadiah') + ' ' + U.rp(totalHadiah) }) +
      '</div>' +

      UI.tabs([
        { key: 'berjalan', label: T('Undian Berjalan'), n: list.length },
        { key: 'peserta', label: T('Peserta & Tiket'), n: siap },
        { key: 'riwayat', label: T('Riwayat & Pemenang'), n: riwayat.length }
      ], tab, 'tab-u') +

      '<div class="mt-3">' +
        (tab === 'peserta' ? tabPeserta(list)
        : tab === 'riwayat' ? tabRiwayat(riwayat)
        : tabBerjalan(list)) +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------------- berjalan */
  function tabBerjalan(list) {
    if (!list.length) {
      return UI.card({ body: UI.empty('🎰', T('Belum ada undian'),
        T('Buat undian pertama — Anda menentukan hadiah, harga tiket, kuota, dan ' +
          'berapa poin yang bisa ditukar dengannya.')),
        tools: '<button class="btn btn--sm" data-act="undian-baru">+ ' + T('Undian baru') + '</button>' });
    }

    return UI.card({ title: T('Undian berjalan'), sub: list.length + ' ' + T('undian'),
      tools: '<button class="btn btn--sm" data-act="undian-baru">+ ' + T('Undian baru') + '</button>',
      flush: true,
      body: list.map(function (p) {
        var peserta = VOUCHER.pesertaUndian(p.id);
        var semua = tiket(p.id);
        var sisa = VOUCHER.sisaKuota(p);
        var lalu = sudahDiundi(p.id);
        var terisi = p.kuota ? Math.round((p.kuota - sisa) / p.kuota * 100) : 0;

        return '<div class="und">' +
          '<div class="und__kepala">' +
            '<span class="und__ic">🎰</span>' +
            '<div style="min-width:0;flex:1">' +
              '<b>' + U.esc(p.nama) + '</b>' +
              '<div class="und__hadiah">🏆 ' + U.esc(p.hadiah || '—') +
                (p.nilaiHadiah ? ' · ' + U.rp(p.nilaiHadiah) : '') + '</div>' +
            '</div>' +
            '<span class="chip chip--' + (p.aktif !== false ? 'ok' : 'muted') + ' chip--xs">' +
              (p.aktif !== false ? T('dibuka') : T('ditutup')) + '</span>' +
          '</div>' +

          '<div class="und__angka">' +
            '<span><small>' + T('Tiket terjual') + '</small><b>' + U.num(semua.length) + '</b></span>' +
            '<span><small>' + T('Siap diundi') + '</small><b>' + U.num(peserta.length) + '</b></span>' +
            '<span><small>' + T('Harga tiket') + '</small><b>' +
              (p.hargaJual ? U.rpShort(p.hargaJual) : '—') + '</b></span>' +
            '<span><small>' + T('Harga poin') + '</small><b>' +
              (p.hargaPoin ? U.num(p.hargaPoin) : '—') + '</b></span>' +
            '<span><small>' + T('Kuota') + '</small><b>' +
              (p.kuota ? U.num(p.kuota - sisa) + '/' + U.num(p.kuota) : T('bebas')) + '</b></span>' +
          '</div>' +

          (p.kuota ? '<div class="mt-1">' + UI.progress(terisi) + '</div>' : '') +

          (lalu.length
            ? '<div class="tbl-sub mt-1">✓ ' + T('sudah pernah diundi') + ' ' + lalu.length + '× — ' +
              T('terakhir') + ' ' + U.tglJam(lalu[0].at) + '</div>'
            : '') +

          '<div class="row mt-2" style="gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn--sm" data-act="undi" data-id="' + U.esc(p.id) + '"' +
              (peserta.length ? '' : ' disabled') + '>🎲 ' +
              (peserta.length ? T('Undi') + ' ' + peserta.length + ' ' + T('tiket') : T('Belum ada tiket')) +
              '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="undian-ubah" data-id="' + U.esc(p.id) + '">' +
              T('Ubah ketentuan') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="buka-tutup" data-id="' + U.esc(p.id) + '">' +
              (p.aktif !== false ? '⏸️ ' + T('Tutup penjualan') : '▶️ ' + T('Buka penjualan')) + '</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn--ghost btn--sm btn--icon" data-act="undian-hapus" ' +
              'data-id="' + U.esc(p.id) + '" title="' + T('Hapus') + '">✕</button>' +
          '</div>' +
        '</div>';
      }).join('') });
  }

  /* ---------------------------------------------------------------- peserta */
  function tabPeserta(list) {
    if (!list.length) return UI.card({ body: UI.empty('🎫', T('Belum ada undian'), '') });

    return list.map(function (p) {
      var semua = U.sortBy(tiket(p.id), function (v) { return v.createdAt; }, true);
      if (!semua.length) {
        return UI.card({ title: p.nama, sub: T('belum ada tiket terjual'),
          body: '<div class="tbl-sub">' +
            T('Tiket akan muncul di sini begitu ada yang membeli atau menukar poin.') + '</div>' });
      }

      /* Dikelompokkan per orang: yang perlu diketahui staf saat ada pertanyaan
         adalah "berapa tiket milik si A", bukan daftar kode yang panjang. */
      var perOrang = {};
      semua.forEach(function (v) {
        var k = v.pemilikId || T('(belum diklaim)');
        if (!perOrang[k]) perOrang[k] = [];
        perOrang[k].push(v);
      });

      return UI.card({ title: p.nama,
        sub: semua.length + ' ' + T('tiket dari') + ' ' + Object.keys(perOrang).length + ' ' + T('pemilik'),
        flush: true,
        body: U.sortBy(Object.keys(perOrang), function (k) { return -perOrang[k].length; })
          .map(function (k) {
            var t = perOrang[k];
            var siap = t.filter(function (v) { return v.status === 'aktif'; }).length;
            return '<div class="row" style="padding:10px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
              '<div style="min-width:0;flex:1">' +
                '<b style="font-size:12.8px">' +
                  (k === T('(belum diklaim)') ? '<i>' + T('belum diklaim') + '</i>' : U.esc(BIZ.nama(k))) +
                '</b>' +
                '<div class="tbl-sub">' + t.map(function (v) {
                  return '<span class="und__kode ' + U.esc(v.status) + '">' + U.esc(v.kode) + '</span>';
                }).join(' ') + '</div>' +
              '</div>' +
              '<div style="text-align:right">' +
                '<b>' + t.length + '</b> ' + T('tiket') +
                '<div class="tbl-sub">' + siap + ' ' + T('siap diundi') + '</div>' +
              '</div>' +
            '</div>';
          }).join('') });
    }).join('');
  }

  /* ---------------------------------------------------------------- riwayat */
  function tabRiwayat(riwayat) {
    if (!riwayat.length) {
      return UI.card({ body: UI.empty('🏆', T('Belum ada pengundian'),
        T('Riwayat lengkap beserta seluruh peserta akan tercatat di sini setiap kali ' +
          'undian dijalankan.')) });
    }

    return riwayat.map(function (r) {
      return UI.card({ title: r.no + ' — ' + r.namaProduk,
        sub: U.tglJam(r.at) + ' • ' + T('oleh') + ' ' + U.esc(BIZ.nama(r.oleh)),
        body:
          '<div class="und__angka">' +
            '<span><small>' + T('Hadiah') + '</small><b>' + U.esc(r.hadiah) + '</b></span>' +
            (r.nilaiHadiah ? '<span><small>' + T('Nilai per pemenang') + '</small><b>' +
              U.rp(r.nilaiHadiah) + '</b></span>' : '') +
            '<span><small>' + T('Peserta') + '</small><b>' + U.num(r.jumlahPeserta) + '</b></span>' +
            '<span><small>' + T('Pemenang') + '</small><b>' + U.num(r.jumlahPemenang) + '</b></span>' +
            '<span><small>' + T('Peluang') + '</small><b>' +
              (r.jumlahPeserta ? (r.jumlahPemenang / r.jumlahPeserta * 100).toFixed(1) + '%' : '—') +
              '</b></span>' +
          '</div>' +

          '<div class="nav-group" style="color:var(--muted);padding:14px 0 6px">🏆 ' +
            T('Pemenang') + '</div>' +
          r.pemenangIds.map(function (id) {
            var v = DB.find('voucher', id);
            if (!v) return '';
            return '<div class="row" style="padding:8px 2px;border-bottom:1px solid var(--line-2);gap:9px">' +
              '<span style="font-size:17px">🏆</span>' +
              '<div style="min-width:0;flex:1"><b style="font-size:12.8px">' +
                U.esc(BIZ.nama(v.pemilikId)) + '</b>' +
                '<div class="und__kode menang">' + U.esc(v.kode) + '</div></div>' +
              (r.nilaiHadiah
                ? '<span class="chip chip--ok chip--xs">' + U.rp(r.nilaiHadiah) +
                  ' → ' + T('Dompet') + '</span>' : '') +
            '</div>';
          }).join('') +

          '<details class="mt-2"><summary class="tbl-sub" style="cursor:pointer">' +
            T('Lihat seluruh') + ' ' + r.jumlahPeserta + ' ' + T('tiket peserta') +
            ' — ' + T('bukti bahwa pengundiannya adil') + '</summary>' +
            '<div class="mt-2">' + r.pesertaIds.map(function (id) {
              var v = DB.find('voucher', id);
              if (!v) return '';
              var menang = r.pemenangIds.indexOf(id) >= 0;
              return '<span class="und__kode ' + (menang ? 'menang' : 'kalah') + '" ' +
                'title="' + U.esc(BIZ.nama(v.pemilikId)) + '">' +
                (menang ? '🏆 ' : '') + U.esc(v.kode) + '</span> ';
            }).join('') + '</div></details>' });
    }).join('');
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    var map = AKSES.lindungi({
      'tab-u': function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },

      'undian-baru': function () { dialogUndian(null); },
      'undian-ubah': function (el) { dialogUndian(el.getAttribute('data-id')); },

      'buka-tutup': function (el) {
        var p = VOUCHER.produk(el.getAttribute('data-id'));
        VOUCHER.simpanProduk(Object.assign({}, p, { aktif: p.aktif === false }), p.id);
        UI.toast(p.aktif === false ? T('Penjualan tiket dibuka.') : T('Penjualan tiket ditutup.'), 'ok');
        APP.refresh();
      },

      'undian-hapus': function (el) {
        var p = VOUCHER.produk(el.getAttribute('data-id'));
        var n = tiket(p.id).length;
        UI.konfirm({
          title: T('Hapus undian?'), danger: true,
          htmlText: U.esc(p.nama) + (n
            ? '<br><br>⚠️ <b>' + n + ' ' + T('tiket') + '</b> ' + T('sudah terjual.') + ' ' +
              T('Tiketnya TETAP ada dan tetap bisa diundi lewat riwayat, tetapi undian ini ' +
                'tidak akan bisa dijalankan lagi setelah dihapus. Pertimbangkan menutup ' +
                'penjualannya saja.')
            : ''),
          okText: T('Ya, hapus')
        }).then(function (ya) {
          if (!ya) return;
          DB.remove('voucherProduk', p.id);
          UI.toast(T('Undian dihapus.'), 'ok');
          APP.refresh();
        });
      },

      undi: function (el) { dialogUndi(el.getAttribute('data-id')); }
    }, {
      'undian-baru': 'sistem.undian', 'undian-ubah': 'sistem.undian',
      'buka-tutup': 'sistem.undian', 'undian-hapus': 'sistem.undian', undi: 'sistem.undian'
    });

    U.delegate(root, map);
  }

  /**
   * Formulir undian. Sengaja tidak memakai formulir voucher umum: yang perlu
   * diisi di sini hanya hadiah, harga tiket, dan kuota — kolom "persentase
   * diskon" atau "kursus yang dibuka" tidak berarti apa-apa pada undian, dan
   * menampilkannya hanya membuat staf ragu apakah wajib diisi.
   */
  function dialogUndian(id) {
    var p = id ? VOUCHER.produk(id) : null;
    UI.formModal({
      title: p ? T('Ubah undian') : T('Undian baru'), size: 'wide', okText: T('Simpan'),
      intro: UI.alert('brand',
        T('Tiket undian dijual seperti voucher, tetapi tidak pernah memotong tagihan. ' +
          'Bila nilai hadiah uang diisi, hadiah langsung masuk Dompet pemenang saat diundi.'),
        '🎰') + '<div class="mb-3"></div>',
      fields: [
        { name: 'nama', label: T('Nama undian'), value: p ? p.nama : '', required: true,
          placeholder: T('mis. Undian Akhir Tahun 2026') },
        { name: 'hadiah', label: T('Hadiah'), value: p ? p.hadiah : '', required: true,
          placeholder: T('mis. Saldo tunai Rp2.500.000') },
        { name: 'nilaiHadiah', label: T('Nilai hadiah uang (Rp)'), type: 'number',
          value: p ? p.nilaiHadiah : 0, min: 0,
          hint: T('Isi 0 bila hadiahnya berupa barang atau diserahkan di luar aplikasi.') },
        { name: 'deskripsi', label: T('Keterangan untuk pembeli'), value: p ? p.deskripsi : '',
          placeholder: T('mis. Diundi setiap akhir bulan, semakin banyak tiket semakin besar peluang.') },
        { name: 'hargaJual', label: T('Harga tiket (Rp)'), type: 'number',
          value: p ? p.hargaJual : 25000, min: 0, hint: T('Isi 0 bila tiket tidak dijual.') },
        { name: 'hargaPoin', label: T('Harga tiket dalam') + ' ' + POIN.nama(), type: 'number',
          value: p ? p.hargaPoin : 250, min: 0, hint: T('Isi 0 bila tidak bisa ditukar poin.') },
        { name: 'kuota', label: T('Kuota tiket'), type: 'number', value: p ? p.kuota : 500, min: 0,
          hint: T('Isi 0 untuk tanpa batas. Kuota menjaga peluang menang tetap masuk akal.') },
        { name: 'masaBerlakuHari', label: T('Tiket berlaku (hari)'), type: 'number',
          value: p ? p.masaBerlakuHari : 60, min: 1 },
        { name: 'ic', label: T('Ikon (emoji)'), value: p ? p.ic : '🎰' },
        { name: 'aktif', label: T('Buka penjualan tiket'), type: 'checkbox',
          value: p ? p.aktif !== false : true }
      ],
      validate: function (d) {
        return VOUCHER.periksaProduk(Object.assign({ jenis: 'undian' }, d));
      }
    }).then(function (d) {
      if (!d) return;
      /* Tiket undian tidak boleh dihadiahkan: peluang menang melekat pada
         pemiliknya, dan memindahtangankan tiket setelah tahu jumlah peserta
         membuka celah yang tidak perlu ada. */
      VOUCHER.simpanProduk(Object.assign({ jenis: 'undian', bolehHadiah: false }, d), id);
      UI.toast(p ? T('Undian diperbarui.') : T('Undian dibuat.'), 'ok');
      APP.refresh();
    });
  }

  function dialogUndi(produkId) {
    var p = VOUCHER.produk(produkId);
    var peserta = VOUCHER.pesertaUndian(produkId);
    var orang = Array.from(new Set(peserta.map(function (v) { return v.pemilikId; })));

    UI.formModal({
      title: T('Jalankan pengundian'), sub: p.nama, size: 'wide',
      okText: T('Undi Sekarang'),
      intro: UI.alert('warn',
        '<b>' + T('Pengundian tidak bisa dibatalkan.') + '</b><br>' +
        '<div class="und__angka mt-2">' +
          '<span><small>' + T('Tiket ikut') + '</small><b>' + U.num(peserta.length) + '</b></span>' +
          '<span><small>' + T('Peserta') + '</small><b>' + U.num(orang.length) + ' ' + T('orang') + '</b></span>' +
          '<span><small>' + T('Hadiah') + '</small><b>' + U.esc(p.hadiah) + '</b></span>' +
        '</div>' +
        '<div class="mt-2">' +
        T('Seluruh tiket peserta ikut tercatat bersama hasilnya, bukan hanya pemenangnya — ' +
          'sehingga keadilan pengundian bisa ditelusuri kapan pun ada yang bertanya.') +
        (p.nilaiHadiah
          ? '<br>' + T('Hadiah') + ' <b>' + U.rp(p.nilaiHadiah) + '</b> ' +
            T('akan langsung masuk ke Dompet tiap pemenang.') : '') +
        '</div>', '🎲') + '<div class="mb-3"></div>',
      fields: [
        { name: 'jumlah', label: T('Jumlah pemenang'), type: 'number', value: 1, min: 1, required: true,
          hint: T('Satu orang bisa menang lebih dari sekali bila punya beberapa tiket — ' +
            'itu memang konsekuensi membeli lebih banyak tiket.') }
      ],
      validate: function (d) {
        var n = Number(d.jumlah);
        if (!(n >= 1)) return T('Jumlah pemenang minimal satu.');
        if (n > peserta.length) return T('Hanya ada') + ' ' + peserta.length + ' tiket. ' +
          T('Jumlah pemenang tidak boleh melebihi jumlah tiket.');
        if (p.nilaiHadiah && n * p.nilaiHadiah > 50000000) {
          return T('Total hadiah') + ' ' + U.rp(n * p.nilaiHadiah) + ' terasa terlalu besar. ' +
            T('Periksa kembali jumlah pemenang dan nilai hadiahnya.');
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      try {
        var r = VOUCHER.undi(produkId, Number(d.jumlah), me().id);
        tab = 'riwayat';
        APP.refresh();
        UI.modal({
          title: T('Pengundian selesai 🎉'), size: 'narrow',
          body: '<div class="und__angka">' +
              '<span><small>' + T('Peserta') + '</small><b>' + r.jumlahPeserta + '</b></span>' +
              '<span><small>' + T('Pemenang') + '</small><b>' + r.jumlahPemenang + '</b></span>' +
            '</div>' +
            '<div class="mt-3">' + r.pemenangIds.map(function (id) {
              var v = DB.find('voucher', id);
              return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line-2)">' +
                '<span style="font-size:17px">🏆</span>' +
                '<div><b>' + U.esc(BIZ.nama(v.pemilikId)) + '</b>' +
                '<div class="und__kode menang">' + U.esc(v.kode) + '</div></div></div>';
            }).join('') + '</div>' +
            UI.alert('brand', T('Pemberitahuan WhatsApp untuk tiap pemenang sudah disiapkan ' +
              'di Outbox.') + (r.nilaiHadiah ? ' ' + T('Hadiah uang sudah masuk Dompet mereka.') : ''),
              '💬'),
          foot: '<button class="btn" data-close>' + T('Selesai') + '</button>'
        });
      } catch (e) { UI.toast(e.message, 'err'); }
    });
  }

  var pagesAdmin = {
    undian: {
      label: 'Undian Berhadiah', icon: '🎰', grup: 'Sistem',
      sub: 'Buka undian, pantau tiket, dan jalankan pengundian',
      render: render, mount: aksi,
      badge: function () {
        return U.sum(daftarUndian(), function (p) { return VOUCHER.pesertaUndian(p.id).length; });
      }
    }
  };

  return { pagesAdmin: pagesAdmin, render: render, daftarUndian: daftarUndian };
})();
