/* ==========================================================================
   views/marketplace.js — pengelolaan marketplace oleh ADMIN
   Verifikasi toko • Moderasi produk • Pencairan penjual • Kampanye & komisi
   ========================================================================== */
var ViewMarket = (function () {

  var tab = 'toko';

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ HALAMAN */
  function render() {
    var st = SELLER.statistikMarketplace();

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Toko aktif'), value: st.tokoAktif + '/' + st.tokoTotal, icon: '🏪',
        meta: st.tokoVerifikasi ? st.tokoVerifikasi + ' menunggu verifikasi' : I18N.t('tidak ada antrean') }) +
      UI.stat({ label: I18N.t('GMV mitra toko'), small: true, valueHTML: U.rpShort(st.gmv), icon: '🛒',
        meta: st.pesananMitra + ' pesanan' }) +
      UI.stat({ label: 'Komisi diterima', small: true, valueHTML: U.rpShort(st.komisi), icon: '💰',
        meta: I18N.t('dari penjualan mitra') }) +
      UI.stat({ label: 'Pendapatan iklan', small: true, valueHTML: U.rpShort(st.pendapatanIklan), icon: '📣',
        meta: st.kampanyeAktif + ' kampanye berjalan' }) +
    '</div>' +

    ((st.tokoVerifikasi || st.moderasi || st.cairDiajukan.length)
      ? UI.alert('warn',
          [st.tokoVerifikasi ? '<b>' + st.tokoVerifikasi + ' ' + I18N.t('toko') + '</b> menunggu verifikasi' : '',
           st.moderasi ? '<b>' + st.moderasi + ' ' + I18N.t('produk') + '</b> menunggu moderasi' : '',
           st.cairDiajukan.length ? '<b>' + st.cairDiajukan.length + ' pencairan</b> menunggu diproses' : ''
          ].filter(Boolean).join(' · ') + '.', '🔔') + '<div class="mb-3"></div>' : '') +

    UI.tabs([
      { key: 'toko', label: I18N.t('🏪 Verifikasi Toko'), n: st.tokoVerifikasi },
      { key: 'produk', label: I18N.t('📦 Moderasi Produk'), n: st.moderasi },
      { key: 'cair', label: '💸 Pencairan', n: st.cairDiajukan.length },
      { key: 'kampanye', label: '🎉 Kampanye' },
      { key: 'komisi', label: '⚙️ Komisi & Tarif' },
      { key: 'peta', label: '🗺️ Peta & Ongkir' }
    ].filter(function (t) {
      /* tab pengaturan hanya muncul bila izinnya ada, supaya tidak ada tombol
         yang menolak sendiri saat ditekan */
      if (t.key === 'komisi') return AKSES.boleh('marketplace.tarif');
      if (t.key === 'peta') return AKSES.boleh('sistem.peta');
      if (t.key === 'cair') return AKSES.boleh('marketplace.pencairan');
      return true;
    }), tab, 'tab-mp') +

    (tab === 'produk' ? tabProduk()
      : tab === 'cair' && AKSES.boleh('marketplace.pencairan') ? tabCair()
      : tab === 'kampanye' ? tabKampanye()
      : tab === 'komisi' && AKSES.boleh('marketplace.tarif') ? tabKomisi()
      : tab === 'peta' && AKSES.boleh('sistem.peta') ? tabPeta()
      : tabToko());
  }

  /* ================================================================ TOKO */
  function tabToko() {
    var list = U.sortBy(SELLER.semuaToko(), function (u) {
      var urut = { verifikasi: 0, onboarding: 1, aktif: 2, ditolak: 3, ditutup: 4 };
      return urut[SELLER.statusToko(u)] + '|' + u.nama;
    });

    return UI.card({ flush: true, body: UI.table([
      { h: I18N.t('Toko'), r: function (u) { var t = SELLER.toko(u);
        return '<div class="row">' + UI.avatar(t.nama || u.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(t.nama || I18N.t('(belum diisi)')) + '</div>' +
          '<div class="tbl-sub">' + U.esc(u.nama) + ' • ' + U.esc(t.kota || '—') + '</div></div></div>'; } },
      { h: I18N.t('Kontak'), r: function (u) { return U.phoneDisplay(u.telp) +
        '<div class="tbl-sub">' + U.esc(u.email) + '</div>'; } },
      { h: I18N.t('Kategori'), r: function (u) { return '<span class="tbl-sub">' +
        U.esc(SELLER.toko(u).kategoriUtama || '—') + '</span>'; } },
      { h: I18N.t('Produk'), cls: 'num', r: function (u) { var p = SELLER.produkToko(u.id);
        return p.length + '<div class="tbl-sub">' +
          p.filter(function (x) { return SELLER.statusProduk(x) === 'aktif'; }).length + ' tayang</div>'; } },
      { h: I18N.t('Penjualan'), cls: 'num', r: function (u) {
        return U.rpShort(SELLER.statistikToko(u.id).saldo.totalPenjualan); } },
      { h: I18N.t('Kelengkapan'), w: '120px', r: function (u) { var r = SELLER.ringkasToko(u);
        return UI.progress(r.pct, r.pct === 100 ? 'ok' : '') +
          '<div class="tbl-sub mt-1">' + r.selesai + '/' + r.total + '</div>'; } },
      { h: I18N.t('Status'), r: function (u) { return SELLER.chip(SELLER.STATUS_TOKO, SELLER.statusToko(u)); } },
      { h: '', cls: 'act', r: function (u) {
        return '<button class="btn btn--ghost btn--sm" data-act="detail-toko" data-id="' + u.id + '">' + I18N.t('Periksa') + '</button>'; } }
    ], list, { icon: '🏪', judul: I18N.t('Belum ada pendaftar mitra toko') }) });
  }

  function detailToko(id) {
    var u = DB.find('users', id);
    var t = SELLER.toko(u);
    var r = SELLER.ringkasToko(u);
    var idn = BIZ.identitas(u);
    var rek = BIZ.rekeningUtama(u);
    var produk = SELLER.produkToko(id);
    var siap = SELLER.siapVerifikasiToko(u);

    UI.modal({
      title: t.nama || u.nama, sub: I18N.t('Pengajuan Mitra Toko •') + ' ' + (t.kota || '—'), size: 'wide',
      body:
        '<div class="row wrap mb-3">' + SELLER.chip(SELLER.STATUS_TOKO, t.status) +
          '<span class="chip chip--muted">' + produk.length + ' ' + I18N.t('produk') + '</span>' +
          '<span class="chip chip--' + (r.pct === 100 ? 'ok' : 'warn') + '">' + I18N.t('Kelengkapan') + ' ' + r.pct + '%</span>' +
        '</div>' +
        '<dl class="kv">' +
          '<dt>Pemilik</dt><dd>' + U.esc(u.nama) + ' • ' + U.phoneDisplay(u.telp) + '<br>' + U.esc(u.email) + '</dd>' +
          '<dt>Deskripsi</dt><dd>' + U.esc(t.deskripsi || '—') + '</dd>' +
          '<dt>' + I18N.t('Gudang') + '</dt><dd>' + U.esc(t.alamatGudang || '—') + '</dd>' +
          '<dt>' + I18N.t('Kategori utama') + '</dt><dd>' + U.esc(t.kategoriUtama || '—') + '</dd>' +
          '<dt>Identitas</dt><dd>' + (idn.nomor
            ? BIZ.jenisId(idn.jenis).nama + ' ' + BIZ.samarkanNomorId(idn.nomor) +
              (idn.diverifikasi ? ' <span class="chip chip--ok" style="font-size:10px">' + I18N.t('terverifikasi') + '</span>' : '')
            : '<span style="color:var(--danger)">' + I18N.t('belum diisi') + '</span>') + '</dd>' +
          '<dt>' + I18N.t('Rekening') + '</dt><dd>' + (rek ? U.esc(rek.bank) + ' ' + U.esc(rek.nomor) + ' a.n. ' + U.esc(rek.atasNama)
            : '<span style="color:var(--danger)">' + I18N.t('belum diisi') + '</span>') + '</dd>' +
        '</dl>' +

        Panel.seksi('Kelengkapan Pengajuan', '<div>' + r.langkah.map(function (l) {
          return '<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line-2)">' +
            '<span style="width:22px">' + (l.selesai ? '✅' : '⬜') + '</span>' +
            '<div style="min-width:0;flex:1"><b style="font-size:12.8px">' + U.esc(l.judul) + '</b>' +
            '<div class="tbl-sub">' + U.esc(l.ket) + '</div></div></div>';
        }).join('') + '</div>') +

        Panel.seksi(I18N.t('Produk yang Didaftarkan'), produk.length
          ? '<div class="mini-list" style="margin:0 -18px">' + produk.map(function (p) {
              return '<div class="mini-item"><div class="prd__mini">' + p.icon + '</div>' +
                '<div style="min-width:0;flex:1"><b>' + U.esc(p.nama) + '</b>' +
                '<small>' + U.esc(p.kode) + ' • ' + U.esc(p.kategori) + ' ' + I18N.t('• stok') + ' ' + p.stok + '</small></div>' +
                '<div class="right"><b>' + U.rp(p.harga) + '</b><div class="mt-1">' +
                SELLER.chip(SELLER.STATUS_PRODUK, SELLER.statusProduk(p)) + '</div></div></div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + I18N.t('Belum ada produk didaftarkan.') + '</div>'),

      foot: '<button class="btn btn--wa" data-act="wa-toko" data-id="' + id + '">💬 Hubungi</button>' +
        (t.status === 'aktif'
          ? '<button class="btn btn--ghost" data-act="tutup-toko" data-id="' + id + '">' + I18N.t('Nonaktifkan Toko') + '</button>'
          : '<button class="btn btn--ghost" data-act="tolak-toko" data-id="' + id + '">' + I18N.t('Tolak') + '</button>' +
            '<button class="btn" data-act="setujui-toko" data-id="' + id + '"' + (siap ? '' : ' disabled') +
            '>✅ Setujui &amp; Aktifkan</button>'),
      actions: AKSES.lindungi({
        'wa-toko': function () {
          WA.chat(u.telp, 'Halo ' + u.nama + ', mengenai pengajuan Mitra Toko "' + (t.nama || '-') +
            '" di EXOCLEAN — ');
        },
        'setujui-toko': function (el) {
          tutup(el);
          UI.konfirm({ title: I18N.t('Aktifkan toko') + ' ' + (t.nama || u.nama) + '?',
            htmlText: I18N.t('Produk yang sudah lolos moderasi akan langsung tampil di katalog pembeli.'),
            okText: 'Ya, aktifkan' }).then(function (ya) {
            if (!ya) return;
            SELLER.setujuiToko(id, APP.user.id);
            UI.toast(I18N.t('Toko diaktifkan & notifikasi disiapkan'), 'ok');
            APP.refresh();
          });
        },
        'tolak-toko': function (el) {
          tutup(el);
          UI.formModal({ title: I18N.t('Tolak pengajuan toko'), okText: I18N.t('Kirim penolakan'),
            fields: [{ name: 'alasan', label: I18N.t('Alasan penolakan'), type: 'textarea', rows: 3, required: true,
              hint: I18N.t('Alasan ini dikirim ke penjual agar bisa diperbaiki.') }] }).then(function (d) {
            if (!d) return;
            SELLER.tolakToko(id, APP.user.id, d.alasan);
            UI.toast('Pengajuan ditolak & alasan dikirim', 'ok');
            APP.refresh();
          });
        },
        'tutup-toko': function (el) {
          tutup(el);
          UI.konfirm({ title: I18N.t('Nonaktifkan toko ini?'), danger: true,
            text: I18N.t('Produknya berhenti tayang. Pesanan berjalan tetap harus diselesaikan.'),
            okText: 'Ya, nonaktifkan' }).then(function (ya) {
            if (!ya) return;
            SELLER.simpanToko(id, { status: 'ditutup' });
            UI.toast(I18N.t('Toko dinonaktifkan'), 'ok');
            APP.refresh();
          });
        }
      }, {
        'wa-toko': 'komunikasi.wa.kirim',
        'setujui-toko': 'marketplace.toko',
        'tolak-toko': 'marketplace.toko',
        'tutup-toko': 'marketplace.toko'
      })
    });
  }

  /* ================================================================ MODERASI PRODUK */
  var fProduk = 'menunggu';
  function tabProduk() {
    var mitra = DB.where('products', function (p) { return !!p.sellerId; });
    var grup = {
      menunggu: mitra.filter(function (p) { return SELLER.statusProduk(p) === 'menunggu'; }),
      aktif: mitra.filter(function (p) { return SELLER.statusProduk(p) === 'aktif'; }),
      ditolak: mitra.filter(function (p) { return SELLER.statusProduk(p) === 'ditolak'; }),
      semua: mitra
    };
    var list = grup[fProduk] || mitra;

    return UI.tabs([
      { key: 'menunggu', label: I18N.t('Menunggu'), n: grup.menunggu.length },
      { key: 'aktif', label: I18N.t('Tayang'), n: grup.aktif.length },
      { key: 'ditolak', label: I18N.t('Ditolak'), n: grup.ditolak.length },
      { key: 'semua', label: I18N.t('Semua'), n: mitra.length }
    ], fProduk, 'tab-mod') +

    UI.card({ flush: true, body: UI.table([
      { h: I18N.t('Produk'), r: function (p) { return '<div class="row">' +
        '<div class="prd__mini">' + p.icon + '</div>' +
        '<div style="min-width:0"><div class="tbl-title">' + U.esc(p.nama) + '</div>' +
        '<div class="tbl-sub">' + U.esc(p.kode) + ' • ' + U.esc(p.merek || '—') + '</div></div></div>'; } },
      { h: I18N.t('Toko'), r: function (p) { return '<div class="tbl-title">' + U.esc(SELLER.namaToko(p.sellerId)) + '</div>' +
        '<div class="tbl-sub">' + U.esc(SELLER.toko(DB.find('users', p.sellerId)).kota || '') + '</div>'; } },
      { h: I18N.t('Kategori'), r: function (p) { return '<span class="tbl-sub">' + U.esc(p.kategori) + '</span>'; } },
      { h: I18N.t('Harga'), cls: 'num', r: function (p) { return '<b>' + U.rp(p.harga) + '</b>' +
        '<div class="tbl-sub">/ ' + U.esc(p.satuan) + '</div>'; } },
      { h: I18N.t('Komisi'), cls: 'num', r: function (p) { return SELLER.komisiPersen(p) + '%'; } },
      { h: I18N.t('Stok'), cls: 'num', r: function (p) { return U.num(p.stok); } },
      { h: I18N.t('Status'), r: function (p) { return SELLER.chip(SELLER.STATUS_PRODUK, SELLER.statusProduk(p)); } },
      { h: '', cls: 'act', r: function (p) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-produk" data-id="' + p.id + '">' + I18N.t('Periksa') + '</button>';
        if (SELLER.statusProduk(p) === 'menunggu')
          b += ' <button class="btn btn--sm" data-act="acc-produk" data-id="' + p.id + '">' + I18N.t('Setujui') + '</button>';
        return b; } }
    ], list, { icon: '📦', judul: I18N.t('Tidak ada produk pada kategori ini') }) });
  }

  function lihatProduk(id) {
    var p = DB.find('products', id);
    var seller = DB.find('users', p.sellerId);
    UI.modal({
      title: p.nama, sub: p.kode + ' • ' + SELLER.namaToko(p.sellerId), size: 'narrow',
      body: '<div class="row wrap mb-3">' + SELLER.chip(SELLER.STATUS_PRODUK, SELLER.statusProduk(p)) +
          '<span class="chip chip--brand">' + U.rp(p.harga) + ' / ' + U.esc(p.satuan) + '</span></div>' +
        '<dl class="kv">' +
          '<dt>' + I18N.t('Kategori') + '</dt><dd>' + U.esc(p.kategori) + '</dd>' +
          '<dt>' + I18N.t('Merek') + '</dt><dd>' + U.esc(p.merek || '—') + '</dd>' +
          '<dt>' + I18N.t('Stok') + '</dt><dd>' + U.num(p.stok) + ' ' + U.esc(p.satuan) + '</dd>' +
          '<dt>' + I18N.t('Komisi') + '</dt><dd>' + SELLER.komisiPersen(p) + '% = ' +
            U.rp(Math.round(p.harga * SELLER.komisiPersen(p) / 100)) + ' per unit</dd>' +
          '<dt>Deskripsi</dt><dd>' + U.esc(p.deskripsi || '—') + '</dd>' +
          '<dt>Penjual</dt><dd>' + U.esc(seller ? seller.nama : '—') + ' • ' +
            U.phoneDisplay(seller ? seller.telp : '') + '</dd>' +
          (p.moderasi ? '<dt>Moderasi terakhir</dt><dd>' + U.tglJam(p.moderasi.at) + ' — ' +
            U.esc(p.moderasi.hasil) + (p.moderasi.alasan ? ': ' + U.esc(p.moderasi.alasan) : '') + '</dd>' : '') +
        '</dl>' +
        UI.alert('info', I18N.t('Periksa kewajaran nama, harga, dan deskripsi. Tolak bila menyesatkan,') + ' ' +
          I18N.t('melanggar merek, atau kategorinya salah.'), '🔍'),
      foot: '<button class="btn btn--ghost" data-act="tolak-produk" data-id="' + id + '">' + I18N.t('Tolak') + '</button>' +
        '<button class="btn" data-act="acc-produk" data-id="' + id + '">✅ Setujui Tayang</button>',
      actions: {
        'acc-produk': function (el) { tutup(el); setujuiProduk(id); },
        'tolak-produk': function (el) { tutup(el); tolakProduk(id); }
      }
    });
  }

  function setujuiProduk(id) {
    SELLER.moderasiProduk(id, 'aktif', APP.user.id, '');
    UI.toast(I18N.t('Produk disetujui & tayang di katalog'), 'ok');
    APP.refresh();
  }
  function tolakProduk(id) {
    UI.formModal({ title: I18N.t('Tolak produk'), okText: I18N.t('Kirim penolakan'),
      fields: [{ name: 'alasan', label: I18N.t('Alasan'), type: 'textarea', rows: 3, required: true,
        hint: I18N.t('Dikirim ke penjual agar bisa diperbaiki.') }] }).then(function (d) {
      if (!d) return;
      SELLER.moderasiProduk(id, 'ditolak', APP.user.id, d.alasan);
      UI.toast(I18N.t('Produk ditolak & alasan dikirim'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ PENCAIRAN */
  function tabCair() {
    var list = U.sortBy(DB.all('sellerPayouts'), function (x) { return x.diajukanAt; }, true);
    return UI.card({ flush: true, body: UI.table([
      { h: I18N.t('No.'), r: function (x) { return '<div class="code">' + U.esc(x.no) + '</div>' +
        '<div class="tbl-sub">' + U.sejak(x.diajukanAt) + '</div>'; } },
      { h: I18N.t('Toko'), r: function (x) { return '<div class="tbl-title">' + U.esc(SELLER.namaToko(x.sellerId)) + '</div>' +
        '<div class="tbl-sub">' + (x.orderIds || []).length + ' ' + I18N.t('pesanan') + '</div>'; } },
      { h: I18N.t('Rekening'), r: function (x) { return '<div style="font-size:12.4px">' + U.esc(x.rekening.bank) +
        ' ' + U.esc(x.rekening.nomor) + '</div><div class="tbl-sub">' + U.esc(x.rekening.atasNama) + '</div>'; } },
      { h: I18N.t('Kotor'), cls: 'num', r: function (x) { return U.rp(x.jumlahKotor); } },
      { h: I18N.t('Bersih'), cls: 'num', r: function (x) { return '<b>' + U.rp(x.jumlahBersih) + '</b>' +
        '<div class="tbl-sub">' + I18N.t('biaya') + ' ' + U.rp(x.biaya) + '</div>'; } },
      { h: I18N.t('Status'), r: function (x) { return SELLER.chip(SELLER.STATUS_CAIR, x.status); } },
      { h: '', cls: 'act', r: function (x) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-cair" data-id="' + x.id + '">' + I18N.t('Lihat') + '</button>';
        if (x.status === 'diajukan')
          b += ' <button class="btn btn--sm" data-act="proses-cair" data-id="' + x.id + '">' + I18N.t('Proses') + '</button>';
        if (x.status === 'diproses')
          b += ' <button class="btn btn--sm" data-act="bayar-cair" data-id="' + x.id + '">Tandai Transfer</button>';
        return b; } }
    ], list, { icon: '💸', judul: I18N.t('Belum ada pengajuan pencairan') }) });
  }

  /* ================================================================ KAMPANYE */
  function tabKampanye() {
    var list = U.sortBy(DB.all('kampanye'), function (k) { return k.mulai; }, true);
    var t = U.today();

    return '<div class="row mb-3"><div class="spacer"></div>' +
      '<button class="btn btn--sm" data-act="kampanye-baru">＋ Buat Kampanye</button></div>' +
      (list.length ? '<div class="grid g-2">' + list.map(function (k) {
        var jalan = k.aktif && k.mulai <= t && k.selesai >= t;
        var pesertaToko = {};
        (k.produk || []).forEach(function (id) {
          var p = DB.find('products', id);
          if (p) pesertaToko[p.sellerId || 'resmi'] = 1;
        });
        return '<div class="promo" style="--promo:' + k.warna + '">' +
          '<div class="promo__ic">' + k.ikon + '</div>' +
          '<div class="promo__isi">' +
            '<div class="row" style="gap:7px"><b>' + U.esc(k.nama) + '</b>' +
            '<div class="spacer"></div>' +
            (jalan ? '<span class="chip chip--ok">' + I18N.t('Berjalan') + '</span>'
              : k.mulai > t ? '<span class="chip chip--info">' + I18N.t('Akan datang') + '</span>'
              : '<span class="chip chip--muted">' + I18N.t('Selesai') + '</span>') + '</div>' +
            '<p>' + U.esc(k.deskripsi) + '</p>' +
            '<div class="row wrap mt-2" style="gap:6px">' +
              '<span class="chip chip--muted" style="font-size:10.5px">' + U.tgl(k.mulai) + ' – ' + U.tgl(k.selesai) + '</span>' +
              (k.diskonPersen ? '<span class="chip chip--danger" style="font-size:10.5px">−' + k.diskonPersen + '%</span>' : '') +
              '<span class="chip chip--warn" style="font-size:10.5px">Penjual ' + k.tanggunganSeller +
                '% / EXOCLEAN ' + k.tanggunganExoclean + '%</span>' +
            '</div>' +
            '<div class="promo__kode" style="border-top-style:solid">' +
              '<span class="tbl-sub">' + (k.produk || []).length + ' ' + I18N.t('produk dari') + ' ' +
                Object.keys(pesertaToko).length + ' ' + I18N.t('toko') + '</span>' +
              '<div class="spacer"></div>' +
              '<button class="btn btn--ghost btn--sm" data-act="toggle-kampanye" data-id="' + k.id + '">' +
                (k.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +
            '</div>' +
          '</div></div>';
      }).join('') + '</div>'
        : UI.card({ body: UI.empty('🎉', I18N.t('Belum ada kampanye'),
            I18N.t('Buat kampanye untuk mendorong penjualan pada periode tertentu.')) }));
  }

  function dialogKampanye() {
    UI.formModal({
      title: 'Buat Kampanye / Event', size: 'wide', okText: 'Buat Kampanye',
      intro: UI.alert('info', I18N.t('Beban diskon dibagi antara penjual dan EXOCLEAN. Porsi penjual') + ' ' +
        I18N.t('ditampilkan terbuka saat mereka memutuskan ikut atau tidak.'), 'ℹ️') + '<div class="mb-3"></div>',
      fields: [
        { name: 'nama', label: I18N.t('Nama kampanye'), required: true, placeholder: 'mis. Flash Sale Akhir Tahun' },
        { name: 'tipe', label: I18N.t('Jenis'), type: 'select', value: 'flash_sale',
          options: Object.keys(SELLER.TIPE_KAMPANYE).map(function (k) {
            return { value: k, label: SELLER.TIPE_KAMPANYE[k].ic + ' ' + SELLER.TIPE_KAMPANYE[k].t }; }) },
        { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 2, required: true },
        { name: 'diskonPersen', label: I18N.t('Diskon (%) — kosongkan untuk gratis ongkir'), type: 'number', value: 15 },
        { name: 'tanggunganSeller', label: 'Ditanggung penjual (%)', type: 'number', value: 60 },
        { name: 'mulai', label: I18N.t('Mulai'), type: 'date', value: U.today(), required: true },
        { name: 'selesai', label: I18N.t('Selesai'), type: 'date', value: U.iso(U.addDays(new Date(), 7)), required: true }
      ],
      validate: function (d) {
        if (d.selesai < d.mulai) return I18N.t('Tanggal selesai harus setelah tanggal mulai');
        if (d.tanggunganSeller < 0 || d.tanggunganSeller > 100) return 'Porsi penjual 0–100%';
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var ikon = SELLER.TIPE_KAMPANYE[d.tipe].ic;
      DB.insert('kampanye', {
        no: U.docNo('EVT', DB.nextNo('kampanye')), nama: d.nama, tipe: d.tipe, deskripsi: d.deskripsi,
        diskonPersen: Number(d.diskonPersen) || 0,
        tanggunganSeller: Number(d.tanggunganSeller) || 0,
        tanggunganExoclean: 100 - (Number(d.tanggunganSeller) || 0),
        mulai: d.mulai, selesai: d.selesai, aktif: true,
        warna: d.tipe === 'flash_sale' ? '#C2410C' : d.tipe === 'gratis_ongkir' ? '#14958A' : '#7C3AED',
        ikon: ikon, produk: []
      });
      UI.toast(I18N.t('Kampanye dibuat — penjual bisa mendaftarkan produknya'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ KOMISI & TARIF */
  function tabKomisi() {
    var c = SELLER.config();
    return '<div class="grid g-2">' +
      UI.card({ title: 'Komisi per kategori', sub: I18N.t('Dipotong dari subtotal barang tiap penjualan'),
        body: Object.keys(c.komisiKategori).map(function (k) {
          return '<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line-2)">' +
            '<span style="flex:1;font-size:12.8px">' + U.esc(k) + '</span>' +
            '<input class="input" type="number" style="width:88px;text-align:right" value="' +
            c.komisiKategori[k] + '" data-change="komisi-kat" data-k="' + U.esc(k) + '">' +
            '<span class="tbl-sub" style="width:16px">%</span></div>';
        }).join('') +
          UI.field({ name: 'komisiDefault', label: 'Komisi bawaan (%)', type: 'number', value: c.komisiDefault,
            hint: I18N.t('Dipakai bila kategori tidak ada di daftar di atas.') }) +
          '<div class="tbl-sub">' + I18N.t('Perubahan berlaku untuk pesanan baru. Pesanan lama tetap memakai') + ' ' +
          I18N.t('komisi yang berlaku saat itu karena sudah tercatat pada rincian pencairan.') + '</div>',
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-komisi">' + I18N.t('Simpan Komisi') + '</button>' }) +

      UI.card({ title: 'Ongkir, pencairan & tarif iklan',
        body: '<div class="inline-2">' +
            UI.field({ name: 'ongkirFlat', label: I18N.t('Ongkir ditagih ke pembeli (Rp)'), type: 'number',
              value: c.ongkirFlat }) +
            UI.field({ name: 'biayaKurirFlat', label: I18N.t('Biaya dibayar ke kurir (Rp)'), type: 'number',
              value: c.biayaKurirFlat, hint: 'Selisihnya menjadi margin logistik EXOCLEAN.' }) +
          '</div>' +
          UI.field({ name: 'gratisOngkirMin', label: 'Gratis ongkir mulai belanja (Rp)', type: 'number',
            value: c.gratisOngkirMin }) +
          '<div class="inline-3">' +
            UI.field({ name: 'hariTahan', label: 'Masa tahan dana (hari)', type: 'number', value: c.hariTahan }) +
            UI.field({ name: 'minPencairan', label: 'Min. pencairan (Rp)', type: 'number', value: c.minPencairan }) +
            UI.field({ name: 'biayaPencairan', label: I18N.t('Biaya transfer (Rp)'), type: 'number', value: c.biayaPencairan }) +
          '</div>' +
          '<div class="inline-3">' +
            UI.field({ name: 'tarifKlikProduk', label: I18N.t('Tarif produk disorot (Rp/klik)'), type: 'number',
              value: c.tarifKlikProduk }) +
            UI.field({ name: 'tarifKlikKategori', label: 'Tarif sponsor kategori (Rp/klik)', type: 'number',
              value: c.tarifKlikKategori }) +
            UI.field({ name: 'tarifBannerHarian', label: 'Tarif banner (Rp/hari)', type: 'number',
              value: c.tarifBannerHarian }) +
          '</div>',
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-tarif">' + I18N.t('Simpan Tarif') + '</button>' }) +
    '</div>';
  }

  /* ================================================================ PETA & ONGKIR */
  function tabPeta() {
    var c = MAPS.config();
    var tanpaTitik = BIZ.usersByRole('client').filter(function (u) {
      return !MAPS.titikAlamatUtama(u); });
    var tokoTanpaTitik = SELLER.semuaToko().filter(function (u) {
      return !MAPS.valid(SELLER.toko(u).koordinat); });

    return '<div class="grid g-2 mb-3">' +
      UI.card({ title: 'Google Maps API Key', sub: I18N.t('Opsional — aplikasi tetap jalan tanpa ini'),
        body: UI.alert(MAPS.adaKey() ? 'ok' : 'info', MAPS.adaKey()
            ? 'Key terisi. Pratinjau peta memakai <b>Google Maps Embed API</b> resmi.'
            : '<b>Berjalan tanpa key.</b> Peta tetap tampil memakai mode embed tanpa key, ' +
              I18N.t('dan seluruh tautan ke Google Maps berfungsi normal. Mengisi key membuat') + ' ' +
              I18N.t('pratinjau memakai Embed API resmi yang lebih stabil.'), '🗺️') +
          UI.field({ name: 'apiKey', label: 'Embed API key', value: c.apiKey,
            placeholder: 'AIza…',
            hint: I18N.t('Key ini ikut terunduh ke browser — batasi per domain di Google Cloud Console') + ' ' +
              I18N.t('(HTTP referrer) dan aktifkan hanya Maps Embed API.') }) +
          UI.alert('warn', '<b>' + I18N.t('Yang sengaja tidak dipakai dari browser:') + '</b> Places Autocomplete, ' +
            I18N.t('Geocoding, dan Distance Matrix. Ketiganya menagih kuota per permintaan dan akan') + ' ' +
            I18N.t('terkuras bila key-nya dipakai orang lain. Bila dibutuhkan, panggil lewat backend') + ' ' +
            I18N.t('seperti pola pada folder') + ' <code>server/</code>.', '⚠️'),
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-peta">' + I18N.t('Simpan Key') + '</button>' }) +

      UI.card({ title: I18N.t('Gudang Toko Resmi'), sub: I18N.t('Titik asal pengiriman produk EXOCLEAN sendiri'),
        body: MAPS.petaHTML(c.gudangResmi, { tinggi: 190, aksiPilih: 'titik-gudang' }) }) +
    '</div>' +

    ((tanpaTitik.length || tokoTanpaTitik.length)
      ? UI.alert('warn',
          [tanpaTitik.length ? '<b>' + tanpaTitik.length + ' klien</b> ' + I18N.t('belum menandai titik alamatnya') : '',
           tokoTanpaTitik.length ? '<b>' + tokoTanpaTitik.length + ' ' + I18N.t('toko') + '</b> ' + I18N.t('belum menandai gudangnya') : ''
          ].filter(Boolean).join(' · ') +
          '. Selama titiknya kosong, ongkir memakai tarif dasar ' + U.rp(c.ongkirTanpaKoordinat) + '.', '📍') +
        '<div class="mb-3"></div>' : '') +

    UI.card({ title: 'Tarif ongkir per jarak', sub: I18N.t('Dihitung dari jarak gudang ke titik alamat pembeli'),
      body: '<div class="mini-list" style="margin:0 -18px 12px">' + c.zona.map(function (z, i) {
          return '<div class="mini-item"><div style="min-width:0;flex:1">' +
            '<b style="font-size:12.6px">' + U.esc(z.nama) + '</b></div>' +
            '<div class="right"><input class="input" type="number" style="width:110px;text-align:right" ' +
            'value="' + z.tarif + '" data-change="zona-tarif" data-i="' + i + '"></div></div>';
        }).join('') + '</div>' +
        '<div class="inline-3">' +
          UI.field({ name: 'tarifTerjauh', label: I18N.t('Di atas pita terakhir (Rp)'), type: 'number',
            value: c.tarifTerjauh }) +
          UI.field({ name: 'ongkirTanpaKoordinat', label: 'Tarif dasar tanpa titik (Rp)', type: 'number',
            value: c.ongkirTanpaKoordinat }) +
          UI.field({ name: 'gratisOngkirMin', label: 'Gratis ongkir mulai (Rp)', type: 'number',
            value: c.gratisOngkirMin }) +
        '</div>' +
        '<div class="tbl-sub">Jarak dihitung garis lurus antar koordinat, jadi angkanya perkiraan — ' +
        I18N.t('jarak tempuh sebenarnya biasanya 20–40% lebih jauh. Untuk tarif kurir yang presisi,') + ' ' +
        'sambungkan API ekspedisi lewat backend.</div>',
      foot: '<div class="spacer"></div><button class="btn" data-act="simpan-zona">' + I18N.t('Simpan Tarif') + '</button>' });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    U.delegate(root, AKSES.lindungi({
      'tab-mp': function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },
      'tab-mod': function (el) { fProduk = el.getAttribute('data-key'); APP.refresh(); },

      'detail-toko': function (el) { detailToko(el.getAttribute('data-id')); },
      'lihat-produk': function (el) { lihatProduk(el.getAttribute('data-id')); },
      'acc-produk': function (el) { setujuiProduk(el.getAttribute('data-id')); },
      'tolak-produk': function (el) { tolakProduk(el.getAttribute('data-id')); },

      'proses-cair': function (el) {
        SELLER.prosesPencairan(el.getAttribute('data-id'), APP.user.id);
        UI.toast('Pencairan ditandai sedang diproses', 'ok'); APP.refresh();
      },
      'bayar-cair': function (el) {
        var id = el.getAttribute('data-id'), x = DB.find('sellerPayouts', id);
        UI.formModal({ title: I18N.t('Tandai sudah ditransfer'),
          sub: x.no + ' • ' + U.rp(x.jumlahBersih) + ' → ' + SELLER.namaToko(x.sellerId), okText: I18N.t('Simpan'),
          intro: UI.alert('brand', 'Tujuan: <b>' + U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) +
            '</b> a.n. ' + U.esc(x.rekening.atasNama), '🏦') + '<div class="mb-3"></div>',
          fields: [{ name: 'ref', label: I18N.t('No. referensi transfer'), required: true }]
        }).then(function (d) {
          if (!d) return;
          SELLER.bayarPencairan(id, d.ref, APP.user.id);
          UI.toast('Pencairan ditandai dibayar & penjual diberi tahu', 'ok');
          APP.refresh();
        });
      },
      'lihat-cair': function (el) {
        var x = DB.find('sellerPayouts', el.getAttribute('data-id'));
        UI.modal({ title: 'Pencairan ' + x.no, sub: SELLER.namaToko(x.sellerId), size: 'wide',
          body: '<dl class="kv">' +
              '<dt>' + I18N.t('Jumlah kotor') + '</dt><dd>' + U.rp(x.jumlahKotor) + '</dd>' +
              '<dt>' + I18N.t('Biaya transfer') + '</dt><dd>−' + U.rp(x.biaya) + '</dd>' +
              '<dt>Dibayarkan</dt><dd><b>' + U.rp(x.jumlahBersih) + '</b></dd>' +
              '<dt>' + I18N.t('Rekening') + '</dt><dd>' + U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) + '</dd>' +
              '<dt>' + I18N.t('Status') + '</dt><dd>' + SELLER.chip(SELLER.STATUS_CAIR, x.status) + '</dd>' +
            '</dl>' +
            Panel.seksi(I18N.t('Pesanan yang dicairkan'), '<div>' + (x.rincian || []).map(function (r) {
              return '<div class="bh-row" style="cursor:default"><div style="min-width:0;flex:1">' +
                '<b>' + U.esc(r.no) + '</b><div class="bh-sub">' + U.esc(r.pembeli) + ' • ' +
                U.tgl(r.tgl) + ' • subtotal ' + U.rp(r.subtotal) + ' − komisi ' + U.rp(r.komisi) + '</div></div>' +
                '<div class="bh-nom"><b>' + U.rp(r.diterimaSeller) + '</b></div></div>';
            }).join('') + '</div>'),
          foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>' });
      },

      /* --- peta & ongkir --- */
      'simpan-peta': function (el) {
        var f = U.readForm(el.closest('.card'));
        var k = String(f.apiKey || '').trim();
        if (k && !/^AIza[0-9A-Za-z_\-]{20,}$/.test(k)) {
          UI.toast(I18N.t('Format key tidak sesuai — Google Maps key biasanya diawali “AIza”'), 'err');
          return;
        }
        MAPS.simpanConfig({ apiKey: k });
        UI.toast(k ? 'API key tersimpan — pratinjau memakai Embed API resmi'
                   : I18N.t('Key dikosongkan — kembali ke mode tanpa key'), 'ok');
        APP.refresh();
      },
      'titik-gudang': function () {
        MAPS.pilihTitik({ judul: I18N.t('Gudang Toko Resmi EXOCLEAN'),
          sub: I18N.t('Titik asal perhitungan ongkir produk milik EXOCLEAN'),
          awal: MAPS.config().gudangResmi }).then(function (hasil) {
          if (!hasil || hasil.hapus) return;
          MAPS.simpanConfig({ gudangResmi: hasil });
          UI.toast('Titik gudang tersimpan', 'ok');
          APP.refresh();
        });
      },
      'zona-tarif': function (el) {
        var c = MAPS.config();
        var zona = c.zona.map(function (z, i) {
          return i === Number(el.getAttribute('data-i'))
            ? Object.assign({}, z, { tarif: Math.max(0, Number(el.value) || 0) }) : z; });
        MAPS.simpanConfig({ zona: zona });
        UI.toast('Tarif zona diperbarui', 'ok');
      },
      'simpan-zona': function (el) {
        var f = U.readForm(el.closest('.card'));
        MAPS.simpanConfig({
          tarifTerjauh: Number(f.tarifTerjauh) || 0,
          ongkirTanpaKoordinat: Number(f.ongkirTanpaKoordinat) || 0,
          gratisOngkirMin: Number(f.gratisOngkirMin) || 0
        });
        UI.toast('Tarif ongkir disimpan', 'ok');
        APP.refresh();
      },

      'kampanye-baru': function () { dialogKampanye(); },
      'toggle-kampanye': function (el) {
        var id = el.getAttribute('data-id'), k = DB.find('kampanye', id);
        DB.update('kampanye', id, { aktif: !k.aktif });
        UI.toast(k.aktif ? 'Kampanye dinonaktifkan' : 'Kampanye diaktifkan', 'ok');
        APP.refresh();
      },

      'komisi-kat': function (el) {
        var c = SELLER.config();
        var kk = Object.assign({}, c.komisiKategori);
        kk[el.getAttribute('data-k')] = Math.max(0, Math.min(100, Number(el.value) || 0));
        SELLER.simpanConfig({ komisiKategori: kk });
        UI.toast('Komisi kategori diperbarui', 'ok');
      },
      'simpan-komisi': function (el) {
        var f = U.readForm(el.closest('.card'));
        SELLER.simpanConfig({ komisiDefault: Number(f.komisiDefault) || 12 });
        UI.toast('Komisi disimpan', 'ok'); APP.refresh();
      },
      'simpan-tarif': function (el) {
        var f = U.readForm(el.closest('.card'));
        SELLER.simpanConfig({
          ongkirFlat: Number(f.ongkirFlat) || 0, biayaKurirFlat: Number(f.biayaKurirFlat) || 0,
          gratisOngkirMin: Number(f.gratisOngkirMin) || 0, hariTahan: Number(f.hariTahan) || 3,
          minPencairan: Number(f.minPencairan) || 0, biayaPencairan: Number(f.biayaPencairan) || 0,
          tarifKlikProduk: Number(f.tarifKlikProduk) || 0,
          tarifKlikKategori: Number(f.tarifKlikKategori) || 0,
          tarifBannerHarian: Number(f.tarifBannerHarian) || 0
        });
        UI.toast('Tarif disimpan', 'ok'); APP.refresh();
      }
    }, {
      'acc-produk': 'marketplace.produk',
      'tolak-produk': 'marketplace.produk',
      'proses-cair': 'marketplace.pencairan',
      'bayar-cair': 'marketplace.pencairan',
      'kampanye-baru': 'marketplace.kampanye',
      'toggle-kampanye': 'marketplace.kampanye',
      'komisi-kat': 'marketplace.tarif',
      'simpan-komisi': 'marketplace.tarif',
      'simpan-tarif': 'marketplace.tarif',
      'simpan-peta': 'sistem.peta',
      'titik-gudang': 'sistem.peta',
      'zona-tarif': 'sistem.peta',
      'simpan-zona': 'sistem.peta'
    }));
  }

  var pagesAdmin = {
    marketplace: { label: 'Marketplace', icon: '🏬', grup: 'Penjualan',
      sub: 'Mitra toko, moderasi produk, kampanye & komisi', render: render, mount: aksi,
      badge: function () {
        var st = SELLER.statistikMarketplace();
        return st.tokoVerifikasi + st.moderasi + st.cairDiajukan.length; } }
  };

  return { pagesAdmin: pagesAdmin, detailToko: detailToko };
})();
