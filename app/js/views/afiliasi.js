/* ==========================================================================
   views/afiliasi.js — Afiliasi & Dropship
   Klien : dasbor afiliasi, etalase dropship, tautan berbagi
   Admin : pengaturan komisi, persetujuan, dan pemantauan
   --------------------------------------------------------------------------
   Dua program disatukan dalam satu berkas karena keduanya berbagi bentuk yang
   sama: mendaftar → disetujui → menghasilkan → dibayar lewat dompet. Yang
   berbeda hanya cara menghasilkannya.
   ========================================================================== */
var ViewAfiliasi = (function () {

  var T = function (s) { return I18N.t(s); };

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ BERBAGI (dipakai lintas halaman) */
  /** Panel berbagi untuk satu objek (produk / layanan / undangan). */
  function dialogBagikan(isi) {
    var u = APP.user;
    var pakaiRef = u && AFILIASI.aktif(u);

    UI.modal({
      title: T('Bagikan'), sub: U.potong(isi.judul, 46), size: 'narrow',
      body: (pakaiRef
          ? UI.alert('brand', T('Kode rujukan Anda') + ' <b>' + AFILIASI.data(u).kode + '</b> ' +
              T('otomatis disisipkan. Bila penerima mendaftar dan bertransaksi, komisinya menjadi ' +
                'milik Anda.'), '🤝')
          : (u && u.role === 'client'
              ? UI.alert('info', T('Ikut program afiliasi agar setiap tautan yang Anda bagikan ' +
                  'menghasilkan komisi.') + ' <a href="#" data-act="ke-afiliasi">' +
                  T('Pelajari') + ' →</a>', '💡')
              : '')) +

        '<div class="pratinjau-bagi mt-3">' +
          '<div class="pratinjau-bagi__teks">' + U.esc(isi.teks).replace(/\n/g, '<br>') + '</div>' +
          '<div class="pratinjau-bagi__url">' + U.esc(isi.url) + '</div>' +
        '</div>' +

        '<div class="kanal-grid mt-3">' + BAGIKAN.KANAL.map(function (k) {
          return '<button class="kanal" data-act="kanal" data-id="' + k.id + '">' +
            '<span class="kanal__ic" style="background:' + k.warna + '">' + k.ikon + '</span>' +
            '<span>' + U.esc(k.nama) + '</span></button>';
        }).join('') + '</div>',
      foot: (BAGIKAN.bisaShareBawaan()
          ? '<button class="btn btn--ghost" data-act="share-bawaan">📲 ' + T('Bagikan lain') +
            '</button>' : '') +
        '<button class="btn btn--ghost" data-act="salin-tautan">🔗 ' + T('Salin tautan') + '</button>' +
        '<button class="btn" data-close>' + T('Tutup') + '</button>',
      actions: {
        kanal: function (el) { BAGIKAN.buka(el.getAttribute('data-id'), isi); },
        'salin-tautan': function () {
          BAGIKAN.salin(isi).then(function (ok) {
            UI.toast(ok ? T('Tautan disalin') : T('Peramban tidak mengizinkan penyalinan'),
              ok ? 'ok' : 'err');
          });
        },
        'share-bawaan': function () { BAGIKAN.shareBawaan(isi); },
        'ke-afiliasi': function (el) { tutup(el); APP.go('afiliasi'); }
      }
    });
  }

  /** Tombol bagikan siap tempel di kartu produk / layanan. */
  function tombol(jenis, id, gaya) {
    return '<button class="btn btn--ghost ' + (gaya || 'btn--sm') + '" data-act="bagikan-' + jenis +
      '" data-id="' + id + '" title="' + T('Bagikan') + '">🔗 ' + T('Bagikan') + '</button>';
  }

  /** Handler bagikan — dipanggil dari mount() halaman mana pun. */
  function aksiBagikan(root) {
    U.delegate(root, {
      'bagikan-produk': function (el) {
        var p = DB.find('products', el.getAttribute('data-id'));
        if (p) dialogBagikan(BAGIKAN.produk(p));
      },
      'bagikan-layanan': function (el) {
        var s = DB.find('services', el.getAttribute('data-id'));
        if (s) dialogBagikan(BAGIKAN.layanan(s));
      },
      'bagikan-undangan': function () { dialogBagikan(BAGIKAN.undangan(APP.user)); }
    });
  }

  /* ================================================================ SISI KLIEN */
  var tab = 'afiliasi';

  function renderKlien() {
    var u = DB.find('users', APP.user.id) || APP.user;
    var punyaAf = !!AFILIASI.data(u), punyaDs = !!DROPSHIP.data(u);

    return UI.tabs([
      { key: 'afiliasi', label: '🤝 ' + T('Afiliasi') },
      { key: 'dropship', label: '📦 ' + T('Dropship') }
    ], tab, 'tab-af') +
    (tab === 'dropship'
      ? (punyaDs ? dasborDropship(u) : ajakanDropship(u))
      : (punyaAf ? dasborAfiliasi(u) : ajakanAfiliasi(u)));
  }

  /* ---------------------------------------------------------------- ajakan */
  function ajakanAfiliasi(u) {
    var c = AFILIASI.config();
    if (!c.aktif) {
      return UI.card({ body: UI.empty('🤝', T('Program afiliasi sedang ditutup'),
        T('Kami akan mengabari bila dibuka kembali.')) });
    }
    return '<div class="ajak-hero">' +
        '<div class="ajak-hero__ic">🤝</div>' +
        '<h2>' + T('Dapat komisi dari setiap orang yang Anda ajak') + '</h2>' +
        '<p>' + T('Bagikan tautan produk dan layanan EXOCLEAN. Bila orang yang Anda ajak mendaftar ' +
          'lalu bertransaksi, komisinya masuk ke dompet Anda.') + '</p>' +
      '</div>' +
      '<div class="grid g-3 mt-3">' +
        UI.stat({ label: T('Komisi jasa'), value: c.komisiJasa + '%', icon: '🧹',
          meta: T('dari nilai pekerjaan') }) +
        UI.stat({ label: T('Komisi produk'), value: c.komisiProduk + '%', icon: '🧴',
          meta: T('dari subtotal belanja') }) +
        UI.stat({ label: T('Bonus referral'), small: true,
          valueHTML: U.rpShort(c.komisiPendaftaran), icon: '🎁',
          meta: T('sekali per orang baru') }) +
      '</div>' +
      UI.card({ cls: 'mt-3', title: T('Cara kerjanya'), body:
        '<ol class="pay-steps">' +
          '<li>' + T('Anda dapat kode rujukan dan tautan sendiri.') + '</li>' +
          '<li>' + T('Bagikan tautan produk atau layanan ke media sosial Anda.') + '</li>' +
          '<li>' + T('Orang yang mendaftar lewat tautan itu menjadi referral Anda selama') + ' ' +
            c.masaLekatHari + ' ' + T('hari') + '.</li>' +
          '<li>' + T('Setiap transaksinya menghasilkan komisi, ditahan') + ' ' + c.hariTahan + ' ' +
            T('hari, lalu masuk saldo dompet.') + '</li>' +
          '<li>' + T('Tarik saldo kapan saja lewat menu Dompet, bergerbang PIN.') + '</li>' +
        '</ol>' +
        UI.alert('info', T('Masa tahan') + ' ' + c.hariTahan + ' ' + T('hari ada supaya komisi tidak ' +
          'terlanjur dibayar atas pesanan yang akhirnya dibatalkan.'), 'ℹ️'),
        foot: '<div class="spacer"></div><button class="btn btn--lg" data-act="daftar-afiliasi">' +
          T('Ikut Program Afiliasi') + '</button>' });
  }

  function ajakanDropship(u) {
    var c = DROPSHIP.config();
    if (!c.aktif) {
      return UI.card({ body: UI.empty('📦', T('Program dropship sedang ditutup'),
        T('Kami akan mengabari bila dibuka kembali.')) });
    }
    return '<div class="ajak-hero ajak-hero--ds">' +
        '<div class="ajak-hero__ic">📦</div>' +
        '<h2>' + T('Jual produk EXOCLEAN tanpa menyetok barang') + '</h2>' +
        '<p>' + T('Pilih produk, tentukan harga jual Anda sendiri, dan pasarkan. Barang dikirim ' +
          'langsung dari gudang ke pembeli atas nama toko Anda.') + '</p>' +
      '</div>' +
      '<div class="grid g-3 mt-3">' +
        UI.stat({ label: T('Markup minimum'), value: c.markupMin + '%', icon: '📈',
          meta: T('di atas harga dasar') }) +
        UI.stat({ label: T('Markup maksimum'), value: c.markupMaks + '%', icon: '🛡️',
          meta: T('menjaga nama EXOCLEAN') }) +
        UI.stat({ label: T('Tanpa modal'), value: 'Rp0', icon: '💰',
          meta: T('tidak perlu beli stok') }) +
      '</div>' +
      UI.card({ cls: 'mt-3', title: T('Bedanya dengan afiliasi'), body:
        '<dl class="kv">' +
          '<dt>' + T('Afiliasi') + '</dt><dd>' + T('Membagikan tautan. Harga tetap harga EXOCLEAN. ' +
            'Imbalan berupa persentase komisi yang ditentukan admin.') + '</dd>' +
          '<dt>' + T('Dropship') + '</dt><dd>' + T('Menentukan harga jual sendiri. Imbalannya adalah ' +
            'selisih harga. Anda yang menghadapi pembeli, jadi tanggung jawabnya lebih besar.') +
            '</dd>' +
        '</dl>' +
        UI.alert('warn', T('Pendaftaran dropship ditinjau admin lebih dulu karena Anda akan ' +
          'berhadapan langsung dengan pembeli atas nama produk EXOCLEAN.'), '⚠️'),
        foot: '<div class="spacer"></div><button class="btn btn--lg" data-act="daftar-dropship">' +
          T('Daftar Jadi Dropshipper') + '</button>' });
  }

  /* ---------------------------------------------------------------- dasbor afiliasi */
  function dasborAfiliasi(u) {
    var a = AFILIASI.data(u), r = AFILIASI.ringkas(u);
    if (a.status !== 'aktif') {
      return UI.card({ body: UI.empty(a.status === 'menunggu' ? '⏳' : '⛔',
        T(AFILIASI.STATUS[a.status].t),
        a.status === 'menunggu'
          ? T('Pengajuan Anda sedang ditinjau admin. Kami mengabari lewat WhatsApp.')
          : U.esc(a.catatan || T('Hubungi admin EXOCLEAN untuk penjelasannya.'))) });
    }
    var tautan = AFILIASI.tautan(u);

    return '<div class="ref-kartu">' +
        '<div class="ref-kartu__label">' + T('Kode rujukan Anda') + '</div>' +
        '<div class="ref-kartu__kode">' + U.esc(a.kode) + '</div>' +
        '<div class="ref-kartu__url">' + U.esc(tautan) + '</div>' +
        '<div class="row" style="gap:8px;margin-top:14px">' +
          '<button class="btn btn--sm" style="background:#fff;color:var(--brand-dark)" ' +
            'data-act="salin-ref">🔗 ' + T('Salin tautan') + '</button>' +
          '<button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:#fff" ' +
            'data-act="bagikan-undangan">📢 ' + T('Bagikan') + '</button>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-4 mt-3 mb-3">' +
        UI.stat({ label: T('Klik tautan'), value: r.klik, icon: '👆', meta: T('pengunjung unik/hari') }) +
        UI.stat({ label: T('Referral'), value: r.referral, icon: '👥',
          meta: r.referralTransaksi + ' ' + T('sudah bertransaksi') + ' (' + r.konversi + '%)' }) +
        UI.stat({ label: T('Komisi tertunda'), small: true, valueHTML: U.rpShort(r.tertunda),
          icon: '⏳', meta: T('menunggu masa tahan') }) +
        UI.stat({ label: T('Total masuk saldo'), small: true, valueHTML: U.rpShort(r.matang),
          icon: '✅', meta: T('sudah bisa ditarik') }) +
      '</div>' +

      (r.matang > 0
        ? UI.alert('ok', T('Saldo komisi Anda sudah masuk Dompet.') +
            ' <a href="#" data-act="ke-dompet">' + T('Buka Dompet') + ' →</a>', '💰') +
          '<div class="mb-3"></div>'
        : '') +

      UI.card({ title: T('Referral Anda'), flush: true, body: UI.table([
        { h: T('Nama'), r: function (x) { return '<div class="row">' +
          UI.avatar(BIZ.nama(x.userId), 'sm') + '<div><div class="tbl-title">' +
          U.esc(BIZ.nama(x.userId)) + '</div><div class="tbl-sub">' + T('bergabung') + ' ' +
          U.tgl(x.daftarAt) + '</div></div></div>'; } },
        { h: T('Transaksi'), cls: 'num', r: function (x) { return x.transaksi || '—'; } },
        { h: T('Komisi'), cls: 'num', r: function (x) { return x.komisiTotal
          ? '<b>' + U.rp(x.komisiTotal) + '</b>' : '—'; } },
        { h: T('Masa lekat'), r: function (x) {
          var sisa = U.diffDays(x.lekatSampai, new Date());
          return sisa >= 0 ? '<span class="tbl-sub">' + sisa + ' ' + T('hari lagi') + '</span>'
            : '<span class="chip chip--muted chip--xs">' + T('berakhir') + '</span>'; } }
      ], AFILIASI.referralSaya(u.id), { icon: '👥', judul: T('Belum ada yang mendaftar lewat tautan Anda'),
        teks: T('Bagikan tautan di atas ke media sosial Anda untuk memulai.') }) }) +

      '<div class="mt-3">' + UI.card({ title: T('Riwayat komisi'), flush: true, body: UI.table([
        { h: T('Sumber'), r: function (k) { return '<div class="tbl-title">' +
          U.esc(k.judul || k.refType) + '</div><div class="tbl-sub">' + T('dari') + ' ' +
          U.esc(BIZ.nama(k.dariUserId)) + ' • ' + U.tgl(k.at) + '</div>'; } },
        { h: T('Dasar'), cls: 'num', r: function (k) { return U.rpShort(k.dasar) +
          '<div class="tbl-sub">' + k.skema.persen + '%</div>'; } },
        { h: T('Komisi'), cls: 'num', r: function (k) { return '<b>' + U.rp(k.total) + '</b>' +
          (k.bonus ? '<div class="tbl-sub">' + T('termasuk bonus') + ' ' + U.rpShort(k.bonus) +
          '</div>' : ''); } },
        { h: T('Status'), r: function (k) { return AFILIASI.chipKomisi(k.status) +
          (k.status === 'tertunda' ? '<div class="tbl-sub">' + T('matang') + ' ' +
          U.tgl(k.matangAt) + '</div>' : ''); } }
      ], AFILIASI.komisiSaya(u.id), { icon: '💸', judul: T('Belum ada komisi') }) }) + '</div>';
  }

  /* ---------------------------------------------------------------- dasbor dropship */
  function dasborDropship(u) {
    var d = DROPSHIP.data(u);
    if (d.status !== 'aktif') {
      return UI.card({ body: UI.empty(d.status === 'menunggu' ? '⏳' : '⛔',
        T(DROPSHIP.STATUS[d.status].t),
        d.status === 'menunggu'
          ? T('Pengajuan toko Anda sedang ditinjau admin. Kami mengabari lewat WhatsApp.')
          : U.esc(d.catatan || T('Hubungi admin EXOCLEAN untuk penjelasannya.'))) });
    }
    var r = DROPSHIP.ringkas(u);
    var etalase = DROPSHIP.etalase(u.id);

    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Produk di etalase'), value: r.produk, icon: '📦',
          meta: r.terjual + ' ' + T('unit terjual') }) +
        UI.stat({ label: T('Pesanan'), value: r.pesanan, icon: '🧾', meta: T('lewat toko Anda') }) +
        UI.stat({ label: T('Margin tertunda'), small: true, valueHTML: U.rpShort(r.tertunda),
          icon: '⏳', meta: T('menunggu barang diterima') }) +
        UI.stat({ label: T('Masuk saldo'), small: true, valueHTML: U.rpShort(r.matang),
          icon: '✅', meta: T('sudah bisa ditarik') }) +
      '</div>' +

      UI.card({ title: '🏪 ' + U.esc(d.namaToko), sub: T('Toko dropship Anda'),
        tools: '<button class="btn btn--sm" data-act="tambah-produk">＋ ' + T('Tambah Produk') +
          '</button>',
        flush: true,
        body: etalase.length ? UI.table([
          { h: T('Produk'), r: function (x) {
            var p = DB.find('products', x.produkId);
            return '<div class="tbl-title">' + U.esc(p ? p.nama : '—') + '</div>' +
              '<div class="tbl-sub">' + U.esc(p ? p.kategori : '') + '</div>'; } },
          { h: T('Harga dasar'), cls: 'num', r: function (x) { return U.rp(x.hargaDasar); } },
          { h: T('Harga jual Anda'), cls: 'num', r: function (x) {
            return '<b>' + U.rp(x.hargaJual) + '</b>'; } },
          { h: T('Margin'), cls: 'num', r: function (x) {
            var m = x.hargaJual - x.hargaDasar;
            return '<b class="txt-ok">' + U.rp(m) + '</b><div class="tbl-sub">' +
              Math.round(m / x.hargaDasar * 100) + '%</div>'; } },
          { h: T('Terjual'), cls: 'num', r: function (x) { return x.terjual || '—'; } },
          { h: '', cls: 'act', r: function (x) {
            return '<button class="btn btn--ghost btn--sm" data-act="bagikan-produk" data-id="' +
              x.produkId + '">🔗</button>' +
              '<button class="btn btn--ghost btn--sm" data-act="ubah-harga" data-id="' + x.id +
              '">' + T('Harga') + '</button>' +
              '<button class="btn btn--ghost btn--danger btn--sm" data-act="hapus-drop" data-id="' +
              x.id + '">' + T('Hapus') + '</button>'; } }
        ], etalase) : UI.empty('📦', T('Etalase Anda masih kosong'),
          T('Tambahkan produk, tentukan harga jual Anda, lalu bagikan tautannya.')) }) +

      '<div class="mt-3">' + UI.card({ title: T('Riwayat margin'), flush: true, body: UI.table([
        { h: T('Pesanan'), r: function (m) { return '<div class="code">' + U.esc(m.no) + '</div>' +
          '<div class="tbl-sub">' + U.tgl(m.at) + ' • ' + m.baris.length + ' ' + T('item') +
          '</div>'; } },
        { h: T('Margin kotor'), cls: 'num', r: function (m) { return U.rp(m.kotor); } },
        { h: T('Diterima'), cls: 'num', r: function (m) { return '<b>' + U.rp(m.bersih) + '</b>'; } },
        { h: T('Status'), r: function (m) {
          var c = m.status === 'matang' ? 'ok' : m.status === 'batal' ? 'danger' : 'warn';
          var t = m.status === 'matang' ? T('Masuk saldo')
            : m.status === 'batal' ? T('Dibatalkan')
            : m.matangAt ? T('Matang') + ' ' + U.tgl(m.matangAt) : T('Menunggu barang diterima');
          return '<span class="chip chip--' + c + ' chip--dot">' + t + '</span>'; } }
      ], DROPSHIP.marginSaya(u.id), { icon: '💸', judul: T('Belum ada penjualan') }) }) + '</div>';
  }

  /* ---------------------------------------------------------------- dialog dropship */
  function dialogTambahProduk() {
    var u = DB.find('users', APP.user.id);
    var sudah = DROPSHIP.etalase(u.id).map(function (x) { return x.produkId; });
    var tersedia = DB.all('products').filter(function (p) {
      return p.aktif !== false && sudah.indexOf(p.id) < 0; });

    if (!tersedia.length) {
      UI.toast(T('Semua produk sudah ada di etalase Anda'), 'warn'); return;
    }
    var pilih = tersedia[0].id;

    function rincian(pid) {
      var p = DB.find('products', pid);
      var b = DROPSHIP.batasHarga(p);
      return '<dl class="kv">' +
          '<dt>' + T('Harga dasar') + '</dt><dd><b>' + U.rp(b.dasar) + '</b></dd>' +
          '<dt>' + T('Rentang harga jual') + '</dt><dd>' + U.rp(b.min) + ' – ' + U.rp(b.maks) +
            '</dd>' +
          '<dt>' + T('Margin Anda') + '</dt><dd>' + U.rp(b.min - b.dasar) + ' – ' +
            U.rp(b.maks - b.dasar) + '</dd>' +
        '</dl>';
    }

    UI.modal({
      title: T('Tambah produk ke etalase'), size: 'narrow',
      body: '<form data-form>' +
          UI.field({ name: 'produkId', label: T('Produk'), type: 'select', value: pilih,
            options: tersedia.map(function (p) {
              return { value: p.id, label: p.nama + ' — ' + U.rp(p.harga) }; }) }) +
          '<div data-rinci>' + rincian(pilih) + '</div>' +
          UI.field({ name: 'harga', label: T('Harga jual Anda (Rp)'), type: 'number',
            value: DROPSHIP.batasHarga(DB.find('products', pilih)).min }) +
        '</form>' +
        UI.alert('info', T('Batas atas menjaga agar produk yang sama tidak dijual jauh lebih mahal ' +
          'di kanal dropshipper — itu merusak kepercayaan pada toko resminya.'), 'ℹ️'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="simpan-drop">' + T('Tambahkan') + '</button>',
      onMount: function (root) {
        root.addEventListener('change', function (ev) {
          if (ev.target.name !== 'produkId') return;
          var b = DROPSHIP.batasHarga(DB.find('products', ev.target.value));
          root.querySelector('[data-rinci]').innerHTML = rincian(ev.target.value);
          root.querySelector('[name="harga"]').value = b.min;
        });
      },
      actions: {
        'simpan-drop': function (el) {
          var f = U.readForm(el.closest('.modal').querySelector('[data-form]'));
          var h = DROPSHIP.tambahProduk(APP.user.id, f.produkId, f.harga);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          UI.toast(T('Produk ditambahkan ke etalase'), 'ok');
          tutup(el); APP.refresh();
        }
      }
    });
  }

  function dialogUbahHarga(itemId) {
    var x = DB.find('dropProduk', itemId);
    var p = DB.find('products', x.produkId);
    var b = DROPSHIP.batasHarga(p);
    UI.formModal({
      title: T('Ubah harga jual'), sub: p.nama, size: 'narrow', okText: T('Simpan'),
      intro: UI.alert('brand', T('Harga dasar') + ' <b>' + U.rp(b.dasar) + '</b> • ' +
        T('rentang') + ' ' + U.rp(b.min) + ' – ' + U.rp(b.maks), '💰') + '<div class="mb-3"></div>',
      fields: [{ name: 'harga', label: T('Harga jual (Rp)'), type: 'number', value: x.hargaJual,
        required: true }]
    }).then(function (d) {
      if (!d) return;
      var h = DROPSHIP.ubahHarga(APP.user.id, itemId, d.harga);
      if (h.error) { UI.toast(h.error, 'err'); return; }
      UI.toast(T('Harga diperbarui'), 'ok'); APP.refresh();
    });
  }

  /* ---------------------------------------------------------------- aksi klien */
  function aksiKlien(root) {
    aksiBagikan(root);
    U.delegate(root, {
      'tab-af': function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },

      'daftar-afiliasi': function () {
        var c = AFILIASI.config();
        UI.konfirm({ title: T('Ikut program afiliasi?'),
          htmlText: T('Anda akan mendapat kode rujukan sendiri. Komisi') + ' <b>' + c.komisiJasa +
            '%</b> ' + T('untuk jasa dan') + ' <b>' + c.komisiProduk + '%</b> ' +
            T('untuk produk, ditahan') + ' ' + c.hariTahan + ' ' + T('hari sebelum masuk saldo.'),
          okText: T('Ya, ikut') }).then(function (ya) {
          if (!ya) return;
          var h = AFILIASI.daftar(APP.user.id);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          APP.perbaruiSesi(DB.find('users', APP.user.id));
          UI.toast(h.otomatis ? T('Selamat! Program afiliasi Anda aktif.')
            : T('Pengajuan terkirim — menunggu persetujuan admin.'), 'ok');
          APP.refresh();
        });
      },

      'daftar-dropship': function () {
        UI.formModal({
          title: T('Daftar Jadi Dropshipper'), size: 'narrow', okText: T('Kirim Pengajuan'),
          intro: UI.alert('info', T('Ceritakan sedikit tentang toko Anda. Admin meninjau pengajuan ' +
            'ini sebelum etalase Anda bisa dipakai.'), 'ℹ️') + '<div class="mb-3"></div>',
          fields: [
            { name: 'namaToko', label: T('Nama toko dropship'), required: true,
              placeholder: T('mis. Toko Bersih Sejahtera') },
            { name: 'kanal', label: T('Kanal penjualan utama'), type: 'select',
              options: ['Instagram', 'TikTok', 'WhatsApp', 'Facebook', 'Marketplace', 'Lainnya'] },
            { name: 'kota', label: T('Kota'), placeholder: T('mis. Bekasi') },
            { name: 'deskripsi', label: T('Ceritakan singkat'), type: 'textarea', rows: 2,
              placeholder: T('Sejak kapan berjualan online, siapa pembeli Anda.') }
          ]
        }).then(function (d) {
          if (!d) return;
          var h = DROPSHIP.daftar(APP.user.id, d);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          APP.perbaruiSesi(DB.find('users', APP.user.id));
          UI.toast(h.otomatis ? T('Toko dropship Anda aktif.')
            : T('Pengajuan terkirim — menunggu persetujuan admin.'), 'ok');
          tab = 'dropship'; APP.refresh();
        });
      },

      'salin-ref': function () {
        var u = DB.find('users', APP.user.id);
        var t = AFILIASI.tautan(u);
        if (navigator.clipboard) navigator.clipboard.writeText(t);
        UI.toast(T('Tautan rujukan disalin'), 'ok');
      },
      'ke-dompet': function () { APP.go('dompet'); },
      'tambah-produk': function () { dialogTambahProduk(); },
      'ubah-harga': function (el) { dialogUbahHarga(el.getAttribute('data-id')); },
      'hapus-drop': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus dari etalase?'),
          text: T('Riwayat penjualannya tetap tersimpan.'), okText: T('Hapus'), danger: true })
          .then(function (ya) {
            if (!ya) return;
            DROPSHIP.hapusProduk(APP.user.id, id);
            UI.toast(T('Produk dihapus dari etalase'), 'ok'); APP.refresh();
          });
      }
    });
  }

  /* ================================================================ SISI ADMIN */
  var tabAdmin = 'ringkas';

  function renderAdmin() {
    var af = AFILIASI.statistik(), ds = DROPSHIP.statistik(), bg = BAGIKAN.statistik();

    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Affiliate aktif'), value: af.aktif, icon: '🤝',
          meta: af.referral + ' ' + T('referral masuk') }) +
        UI.stat({ label: T('Dropshipper aktif'), value: ds.aktif, icon: '📦',
          meta: ds.produkTayang + ' ' + T('produk tayang') }) +
        UI.stat({ label: T('Komisi & margin tertunda'), small: true,
          valueHTML: U.rpShort(af.komisiTertunda + ds.marginTertunda), icon: '⏳',
          meta: T('belum masuk saldo') }) +
        UI.stat({ label: T('Sudah dibayarkan'), small: true,
          valueHTML: U.rpShort(af.komisiDibayar + ds.marginDibayar), icon: '✅',
          meta: bg.total + ' ' + T('kali dibagikan') }) +
      '</div>' +

      ((af.menunggu + ds.menunggu)
        ? UI.alert('warn', '<b>' + (af.menunggu + ds.menunggu) + ' ' + T('pengajuan menunggu') +
            '</b> — ' + af.menunggu + ' ' + T('affiliate') + ', ' + ds.menunggu + ' ' +
            T('dropshipper') + '.', '⏳') + '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'ringkas', label: '📊 ' + T('Ringkasan') },
        { key: 'peserta', label: '👥 ' + T('Peserta'), n: af.pendaftar + ds.pendaftar },
        { key: 'atur', label: '⚙️ ' + T('Ketentuan & Komisi') }
      ], tabAdmin, 'tab-afa') +

      (tabAdmin === 'peserta' ? tabPeserta()
        : tabAdmin === 'atur' ? tabAtur()
        : tabRingkas(af, ds, bg));
  }

  function tabRingkas(af, ds, bg) {
    return '<div class="grid g-2">' +
      UI.card({ title: T('Affiliate teratas'), flush: true, body: UI.table([
        { h: T('Nama'), r: function (x) { return '<div class="row">' + UI.avatar(x.user.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(x.user.nama) + '</div>' +
          '<div class="code">' + U.esc(x.r.kode) + '</div></div></div>'; } },
        { h: T('Referral'), cls: 'num', r: function (x) { return x.r.referral; } },
        { h: T('Komisi'), cls: 'num', r: function (x) { return '<b>' + U.rpShort(x.r.total) +
          '</b>'; } }
      ], af.teratas, { icon: '🤝', judul: T('Belum ada affiliate') }) }) +

      UI.card({ title: T('Kanal berbagi terpakai'), body: bg.teratas.length
        ? '<div class="mini-list">' + bg.teratas.map(function (k) {
            var kk = BAGIKAN.KANAL.filter(function (x) { return x.id === k.kanal; })[0];
            return '<div class="mini-item"><span class="kanal__ic" style="background:' +
              (kk ? kk.warna : '#64748B') + '">' + (kk ? kk.ikon : '🔗') + '</span>' +
              '<div style="flex:1"><b>' + U.esc(kk ? kk.nama : k.kanal) + '</b></div>' +
              '<b>' + k.n + '</b></div>';
          }).join('') + '</div>' +
          '<div class="tbl-sub mt-2">' + bg.produk + ' ' + T('produk') + ' • ' + bg.layanan + ' ' +
          T('layanan') + ' • ' + bg.undangan + ' ' + T('undangan') + '</div>'
        : UI.empty('🔗', T('Belum ada aktivitas berbagi')) }) +
    '</div>';
  }

  function tabPeserta() {
    var af = DB.all('users').filter(function (u) { return !!u.afiliasi; });
    var ds = DB.all('users').filter(function (u) { return !!u.dropship; });

    return UI.card({ title: T('Affiliate'), flush: true, body: UI.table([
        { h: T('Nama'), r: function (u) { return '<div class="row">' + UI.avatar(u.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(u.nama) + '</div><div class="code">' +
          U.esc(u.afiliasi.kode) + '</div></div></div>'; } },
        { h: T('Status'), r: function (u) { return AFILIASI.chip(u.afiliasi.status); } },
        { h: T('Klik'), cls: 'num', r: function (u) { return u.afiliasi.klik || 0; } },
        { h: T('Referral'), cls: 'num', r: function (u) {
          return AFILIASI.referralSaya(u.id).length; } },
        { h: T('Komisi'), cls: 'num', r: function (u) {
          return U.rpShort(AFILIASI.ringkas(u).total); } },
        { h: '', cls: 'act', r: function (u) {
          if (u.afiliasi.status === 'menunggu') {
            return '<button class="btn btn--ghost btn--sm" data-act="tolak-af" data-id="' + u.id +
              '">' + T('Tolak') + '</button><button class="btn btn--sm" data-act="setuju-af" data-id="' +
              u.id + '">' + T('Setujui') + '</button>';
          }
          return u.afiliasi.status === 'aktif'
            ? '<button class="btn btn--ghost btn--danger btn--sm" data-act="stop-af" data-id="' +
              u.id + '">' + T('Nonaktifkan') + '</button>'
            : '<button class="btn btn--ghost btn--sm" data-act="setuju-af" data-id="' + u.id +
              '">' + T('Aktifkan') + '</button>'; } }
      ], af, { icon: '🤝', judul: T('Belum ada pendaftar afiliasi') }) }) +

      '<div class="mt-3">' + UI.card({ title: T('Dropshipper'), flush: true, body: UI.table([
        { h: T('Toko'), r: function (u) { return '<div class="tbl-title">' +
          U.esc(u.dropship.namaToko) + '</div><div class="tbl-sub">' + U.esc(u.nama) + ' • ' +
          U.esc(u.dropship.kanal || '—') + '</div>'; } },
        { h: T('Status'), r: function (u) { return DROPSHIP.chip(u.dropship.status); } },
        { h: T('Produk'), cls: 'num', r: function (u) { return DROPSHIP.etalase(u.id).length; } },
        { h: T('Margin'), cls: 'num', r: function (u) {
          return U.rpShort(DROPSHIP.ringkas(u).total); } },
        { h: '', cls: 'act', r: function (u) {
          if (u.dropship.status === 'menunggu') {
            return '<button class="btn btn--ghost btn--sm" data-act="tolak-ds" data-id="' + u.id +
              '">' + T('Tolak') + '</button><button class="btn btn--sm" data-act="setuju-ds" data-id="' +
              u.id + '">' + T('Setujui') + '</button>';
          }
          return u.dropship.status === 'aktif'
            ? '<button class="btn btn--ghost btn--danger btn--sm" data-act="stop-ds" data-id="' +
              u.id + '">' + T('Nonaktifkan') + '</button>'
            : '<button class="btn btn--ghost btn--sm" data-act="setuju-ds" data-id="' + u.id +
              '">' + T('Aktifkan') + '</button>'; } }
      ], ds, { icon: '📦', judul: T('Belum ada pendaftar dropship') }) }) + '</div>';
  }

  function tabAtur() {
    var a = AFILIASI.config(), d = DROPSHIP.config();
    return '<div class="grid g-2">' +
      UI.card({ title: '🤝 ' + T('Ketentuan Afiliasi'),
        sub: T('Berlaku untuk komisi yang terbit setelah disimpan'),
        body: '<div class="grid g-2">' +
            UI.field({ name: 'komisiJasa', label: T('Komisi jasa (%)'), type: 'number',
              value: a.komisiJasa }) +
            UI.field({ name: 'komisiProduk', label: T('Komisi produk (%)'), type: 'number',
              value: a.komisiProduk }) +
            UI.field({ name: 'komisiPendaftaran', label: T('Bonus referral pertama (Rp)'),
              type: 'number', value: a.komisiPendaftaran }) +
            UI.field({ name: 'hariTahan', label: T('Masa tahan (hari)'), type: 'number',
              value: a.hariTahan }) +
            UI.field({ name: 'masaLekatHari', label: T('Masa lekat referral (hari)'), type: 'number',
              value: a.masaLekatHari }) +
            UI.field({ name: 'batasTransaksi', label: T('Batas transaksi berkomisi (0 = bebas)'),
              type: 'number', value: a.batasTransaksi }) +
          '</div>' +
          UI.field({ name: 'persetujuanOtomatis', type: 'checkbox',
            label: T('Setujui pendaftar afiliasi secara otomatis'),
            value: a.persetujuanOtomatis }) +
          UI.field({ name: 'aktif', type: 'checkbox', label: T('Program afiliasi dibuka'),
            value: a.aktif }) +
          UI.alert('info', T('Komisi yang sudah terbit membawa skemanya sendiri — mengubah angka di ' +
            'sini tidak pernah mengubah komisi lama.'), 'ℹ️'),
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-af">' +
          T('Simpan') + '</button>' }) +

      UI.card({ title: '📦 ' + T('Ketentuan Dropship'),
        sub: T('Batas markup menjaga harga tetap wajar'),
        body: '<div class="grid g-2">' +
            UI.field({ name: 'markupMin', label: T('Markup minimum (%)'), type: 'number',
              value: d.markupMin }) +
            UI.field({ name: 'markupMaks', label: T('Markup maksimum (%)'), type: 'number',
              value: d.markupMaks }) +
            UI.field({ name: 'hariTahan', label: T('Masa tahan setelah diterima (hari)'),
              type: 'number', value: d.hariTahan }) +
            UI.field({ name: 'biayaPlatform', label: T('Biaya platform (% dari margin)'),
              type: 'number', value: d.biayaPlatform }) +
            UI.field({ name: 'maksProduk', label: T('Maksimal produk per etalase'), type: 'number',
              value: d.maksProduk }) +
          '</div>' +
          UI.field({ name: 'persetujuanOtomatis', type: 'checkbox',
            label: T('Setujui pendaftar dropship secara otomatis'),
            value: d.persetujuanOtomatis }) +
          UI.field({ name: 'aktif', type: 'checkbox', label: T('Program dropship dibuka'),
            value: d.aktif }) +
          UI.alert('warn', T('Menaikkan markup maksimum berlaku untuk penetapan harga berikutnya. ' +
            'Harga yang sudah terpasang tidak ikut berubah.'), '⚠️'),
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-ds">' +
          T('Simpan') + '</button>' }) +
    '</div>';
  }

  function aksiAdmin(root) {
    U.delegate(root, AKSES.lindungi({
      'tab-afa': function (el) { tabAdmin = el.getAttribute('data-key'); APP.refresh(); },

      'setuju-af': function (el) {
        var h = AFILIASI.setujui(el.getAttribute('data-id'), APP.user.id);
        if (h.error) { UI.toast(h.error, 'err'); return; }
        UI.toast(T('Affiliate disetujui'), 'ok'); APP.refresh();
      },
      'tolak-af': function (el) { tolak('af', el.getAttribute('data-id')); },
      'stop-af': function (el) {
        AFILIASI.ubahStatus(el.getAttribute('data-id'), 'berhenti', APP.user.id, '');
        UI.toast(T('Affiliate dinonaktifkan'), 'warn'); APP.refresh();
      },

      'setuju-ds': function (el) {
        var h = DROPSHIP.setujui(el.getAttribute('data-id'), APP.user.id);
        if (h.error) { UI.toast(h.error, 'err'); return; }
        UI.toast(T('Dropshipper disetujui'), 'ok'); APP.refresh();
      },
      'tolak-ds': function (el) { tolak('ds', el.getAttribute('data-id')); },
      'stop-ds': function (el) {
        DROPSHIP.ubahStatus(el.getAttribute('data-id'), 'berhenti', APP.user.id, '');
        UI.toast(T('Dropshipper dinonaktifkan'), 'warn'); APP.refresh();
      },

      'simpan-af': function (el) {
        var f = U.readForm(el.closest('.card'));
        AFILIASI.simpanConfig({
          komisiJasa: Number(f.komisiJasa) || 0, komisiProduk: Number(f.komisiProduk) || 0,
          komisiPendaftaran: Number(f.komisiPendaftaran) || 0,
          hariTahan: Number(f.hariTahan) || 0, masaLekatHari: Number(f.masaLekatHari) || 30,
          batasTransaksi: Number(f.batasTransaksi) || 0,
          persetujuanOtomatis: !!f.persetujuanOtomatis, aktif: !!f.aktif
        }, APP.user.id);
        UI.toast(T('Ketentuan afiliasi disimpan'), 'ok'); APP.refresh();
      },
      'simpan-ds': function (el) {
        var f = U.readForm(el.closest('.card'));
        var min = Number(f.markupMin) || 0, maks = Number(f.markupMaks) || 0;
        if (maks <= min) { UI.toast(T('Markup maksimum harus di atas minimum'), 'err'); return; }
        DROPSHIP.simpanConfig({
          markupMin: min, markupMaks: maks,
          hariTahan: Number(f.hariTahan) || 0, biayaPlatform: Number(f.biayaPlatform) || 0,
          maksProduk: Number(f.maksProduk) || 50,
          persetujuanOtomatis: !!f.persetujuanOtomatis, aktif: !!f.aktif
        }, APP.user.id);
        UI.toast(T('Ketentuan dropship disimpan'), 'ok'); APP.refresh();
      }
    }, {
      'setuju-af': 'marketplace.toko', 'tolak-af': 'marketplace.toko', 'stop-af': 'marketplace.toko',
      'setuju-ds': 'marketplace.toko', 'tolak-ds': 'marketplace.toko', 'stop-ds': 'marketplace.toko',
      'simpan-af': 'marketplace.tarif', 'simpan-ds': 'marketplace.tarif'
    }));
  }

  function tolak(jenis, userId) {
    UI.formModal({
      title: T('Tolak pengajuan'), okText: T('Tolak'),
      fields: [{ name: 'alasan', label: T('Alasan penolakan'), type: 'textarea', rows: 3,
        required: true, hint: T('Alasan ini ditampilkan kepada pendaftar.') }]
    }).then(function (d) {
      if (!d) return;
      if (jenis === 'af') AFILIASI.ubahStatus(userId, 'ditolak', APP.user.id, d.alasan);
      else DROPSHIP.ubahStatus(userId, 'ditolak', APP.user.id, d.alasan);
      UI.toast(T('Pengajuan ditolak'), 'ok'); APP.refresh();
    });
  }

  /* ================================================================ PAGES */
  var pageKlien = {
    label: 'Afiliasi & Dropship', icon: '🤝', grup: 'Penghasilan',
    sub: 'Komisi rujukan & toko dropship Anda',
    render: renderKlien, mount: aksiKlien,
    badge: function () {
      var u = DB.find('users', APP.user.id) || APP.user;
      var r = AFILIASI.data(u) ? AFILIASI.ringkas(u) : null;
      return r && r.matang > 0 ? 1 : 0;
    }
  };

  var pagesAdmin = {
    afiliasi: {
      label: 'Afiliasi & Dropship', icon: '🤝', grup: 'Marketplace',
      sub: 'Komisi rujukan, dropshipper & aktivitas berbagi',
      render: renderAdmin, mount: aksiAdmin,
      badge: function () {
        return AFILIASI.statistik().menunggu + DROPSHIP.statistik().menunggu; }
    }
  };

  return { pageKlien: pageKlien, pagesAdmin: pagesAdmin,
           dialogBagikan: dialogBagikan, tombol: tombol, aksiBagikan: aksiBagikan };
})();
