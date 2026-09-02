/* ==========================================================================
   views/tokomitra.js — ruang kerja MITRA TOKO (penjual)
   Dashboard • Produk • Pesanan • Keuangan • Iklan • Kampanye • Profil Toko
   --------------------------------------------------------------------------
   Menu menyesuaikan status toko: selama belum aktif, penjual hanya melihat
   langkah bergabung dan pengaturan profilnya — belum bisa berjualan.
   ========================================================================== */
var ViewToko = (function () {

  var T = function (s) { return I18N.t(s); };
  function aku() { return APP.user; }
  function segar() { return DB.find('users', aku().id) || aku(); }
  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }
  function terapkan() { APP.perbaruiSesi(segar()); }

  /* ================================================================ BERGABUNG */
  function renderGabung() {
    var u = segar();
    var r = SELLER.ringkasToko(u);
    var t = SELLER.toko(u);

    return '' +
    '<div class="card mb-3" style="background:linear-gradient(130deg,#0E5C55,#14958A);border:none;color:#fff">' +
      '<div class="card__body">' +
        '<div class="row wrap" style="gap:18px">' +
          '<div style="min-width:240px;flex:1">' +
            '<h2 style="font-size:20px">' + T('Buka toko Anda di EXOCLEAN 🏪') + '</h2>' +
            '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:8px 0 0">' +
              T('Jual alat, perlengkapan, aksesoris, dan chemical kebersihan kepada ribuan klien') + ' ' +
              T('EXOCLEAN — gedung, kantor, klinik, hotel, dan rumah tangga.') + '</p>' +
            '<div class="row wrap mt-3" style="gap:8px">' +
              '<span class="chip" style="background:rgba(255,255,255,.16);color:#fff">Komisi mulai 8%</span>' +
              '<span class="chip" style="background:rgba(255,255,255,.16);color:#fff">Pencairan cepat</span>' +
              '<span class="chip" style="background:rgba(255,255,255,.16);color:#fff">Iklan & kampanye</span>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:center">' +
            '<div style="font-size:38px;font-weight:800;letter-spacing:-.02em">' + r.pct + '%</div>' +
            '<div style="font-size:12px;color:rgba(255,255,255,.8)">' + r.selesai + ' dari ' + r.total + ' ' + T('langkah') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    (t.status === 'ditolak'
      ? UI.alert('danger', '<b>Pengajuan ditolak.</b> ' + U.esc(u.alasanTolakToko || '—') +
          ' Perbaiki datanya lalu ajukan kembali.', '⛔') + '<div class="mb-3"></div>'
      : t.status === 'verifikasi'
        ? UI.alert('info', '<b>Pengajuan sedang diperiksa admin.</b> ' + T('Biasanya selesai dalam 1×24 jam kerja.') + ' ' +
            T('Anda masih bisa menambah produk sambil menunggu.'), '⏳') + '<div class="mb-3"></div>'
        : '') +

    UI.card({ cls: 'mb-3', title: T('Langkah membuka toko'), sub: T('Semua dihitung otomatis dari data Anda'), flush: true,
      body: '<div style="padding:6px 0">' + r.langkah.map(function (l, i) {
        return '<div class="ob-step' + (l.selesai ? ' done' : '') + '">' +
          '<div class="ob-num">' + (l.selesai ? '✓' : i + 1) + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<b>' + l.ic + ' ' + U.esc(l.judul) + '</b>' +
            '<div class="ob-ket">' + U.esc(l.ket) + '</div>' +
          '</div>' +
          (l.aksi && !l.selesai
            ? '<button class="btn btn--sm" data-act="' + l.aksi + '">Lengkapi</button>'
            : l.selesai ? '<span class="chip chip--ok">' + T('Selesai') + '</span>' : '') +
          '</div>';
      }).join('') + '</div>',
      foot: SELLER.siapVerifikasiToko(u) && t.status === 'onboarding'
        ? '<div class="spacer"></div><button class="btn btn--lg" data-act="ajukan-toko">' +
          T('Ajukan Verifikasi Toko') + '</button>'
        : '<span class="tbl-sub">' + T('Selesaikan empat langkah pertama untuk bisa mengajukan verifikasi.') + '</span>' }) +

    UI.card({ title: 'Bagaimana pendapatan dihitung', sub: 'Transparan sejak awal',
      body: '<div class="bh-rumus">' +
        '<div><span>Pembeli bayar</span><b>' + T('subtotal barang + ongkir + Ppn') + '</b></div>' +
        '<div class="minus"><span>Komisi EXOCLEAN</span><b>' + T('8–15% dari subtotal, sesuai kategori') + '</b></div>' +
        '<div class="minus"><span>Beban promosi</span><b>' + T('hanya bila produk Anda ikut kampanye diskon') + '</b></div>' +
        '<div class="hasil"><span>' + T('Diterima toko Anda') + '</span><b>subtotal − komisi − beban promosi</b></div>' +
        '</div>' +
        '<div class="tbl-sub mt-2">' + T('Ongkos kirim bukan pendapatan toko — itu diteruskan ke kurir.') + ' ' +
        T('Dana pesanan bisa dicairkan') + ' ' + SELLER.config().hariTahan + ' ' + T('hari setelah pembeli menerima barang,') + ' ' +
        'minimum pencairan ' + U.rp(SELLER.config().minPencairan) + '.</div>' });
  }

  /* ================================================================ DASHBOARD */
  function renderDashboard() {
    var u = segar();
    var st = SELLER.statistikToko(u.id);
    var s = st.saldo;
    var pesanan = SELLER.pesananToko(u.id);
    var perluProses = pesanan.filter(function (p) {
      return ['baru', 'dikonfirmasi', 'dikemas'].indexOf(p.status) >= 0; });

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Penjualan bulan ini'), small: true, valueHTML: U.rp(st.penjualanBulanIni),
        icon: '🛒', meta: st.pesanan + ' ' + T('pesanan seluruhnya') }) +
      UI.stat({ label: T('Saldo bisa dicairkan'), small: true, valueHTML: U.rp(s.tersedia), icon: '💰',
        meta: s.tertahan ? 'tertahan ' + U.rpShort(s.tertahan) : T('tidak ada yang tertahan') }) +
      UI.stat({ label: T('Perlu diproses'), value: perluProses.length, icon: '📦',
        meta: st.pesananBaru + ' ' + T('pesanan baru') }) +
      UI.stat({ label: T('Produk tayang'), value: st.produkTayang + '/' + st.produk, icon: '🏷️',
        meta: st.produkHabis ? st.produkHabis + ' ' + T('stok habis') : T('stok aman') }) +
    '</div>' +

    (st.pesananBaru
      ? UI.alert('warn', '<b>' + st.pesananBaru + ' ' + T('pesanan baru menunggu konfirmasi.') + '</b> ' +
          T('Konfirmasi cepat menaikkan peringkat toko Anda di katalog.') + ' ' +
          '<a href="#" data-act="ke-pesanan">Proses sekarang →</a>', '🔔') + '<div class="mb-3"></div>' : '') +
    (st.produkHabis
      ? UI.alert('danger', '<b>' + st.produkHabis + ' ' + T('produk kehabisan stok') + '</b> ' + T('dan otomatis tidak tampil') + ' ' +
          T('di katalog.') + ' <a href="#" data-act="ke-produk">' + T('Perbarui stok →') + '</a>', '📉') + '<div class="mb-3"></div>' : '') +

    '<div class="grid g-2-1">' +
      UI.card({ title: T('Pesanan terbaru'), flush: true,
        tools: '<button class="btn btn--ghost btn--sm" data-act="ke-pesanan">' + T('Lihat semua') + '</button>',
        body: pesanan.length ? '<div class="mini-list">' + pesanan.slice(0, 6).map(function (p) {
          var r = SELLER.rincianPesanan(p.id);
          return '<div class="mini-item" data-act="detail-pesanan" data-id="' + p.id + '" style="cursor:pointer">' +
            '<div class="prd__mini">🛒</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(p.no) + '</b>' +
            '<small>' + U.esc(BIZ.klien(p.clientId)) + ' • ' + (p.items || []).length + ' ' + T('barang •') + ' ' +
            U.sejak(p.createdAt) + '</small></div>' +
            '<div class="right"><b>' + U.rp(r.diterimaSeller) + '</b>' +
            '<div class="mt-1">' + UI.statusChip('shop', p.status) + '</div></div></div>';
        }).join('') + '</div>' : UI.empty('🛒', T('Belum ada pesanan'),
          T('Pesanan pertama biasanya datang setelah produk Anda tayang dan dipromosikan.')) }) +

      '<div class="col">' +
        UI.card({ title: 'Performa iklan', sub: '30 hari terakhir',
          body: '<div class="grid g-2">' +
            UI.stat({ label: T('Tayang'), value: U.num(st.iklan.tayang), small: true }) +
            UI.stat({ label: T('Klik'), value: U.num(st.iklan.klik), small: true, meta: 'CTR ' + st.iklan.ctr + '%' }) +
          '</div>' +
          '<div class="row mt-3"><span class="tbl-sub">' + T('Saldo iklan') + '</span><div class="spacer"></div>' +
          '<b>' + U.rp(st.iklan.saldo) + '</b></div>' +
          '<button class="btn btn--soft btn--block mt-2" data-act="ke-iklan">Kelola Iklan</button>' }) +

        UI.card({ title: 'Kampanye berjalan', flush: true,
          body: (function () {
            var k = SELLER.kampanyeAktif();
            if (!k.length) return '<div style="padding:14px 18px" class="tbl-sub">' + T('Belum ada kampanye berjalan.') + '</div>';
            return '<div class="mini-list">' + k.map(function (x) {
              var ikut = (x.produk || []).filter(function (id) {
                var p = DB.find('products', id); return p && p.sellerId === u.id; }).length;
              return '<div class="mini-item"><div class="prd__mini">' + x.ikon + '</div>' +
                '<div style="min-width:0;flex:1"><b>' + U.esc(x.nama) + '</b>' +
                '<small>sampai ' + U.tgl(x.selesai) + '</small></div>' +
                '<div class="right">' + (ikut ? '<span class="chip chip--ok">' + ikut + ' ' + T('produk') + '</span>'
                  : '<span class="chip chip--muted">' + T('belum ikut') + '</span>') + '</div></div>';
            }).join('') + '</div>';
          })() }) +
      '</div>' +
    '</div>';
  }

  /* ================================================================ PRODUK */
  var fProduk = 'semua';
  function renderProduk() {
    var u = segar();
    var all = SELLER.produkToko(u.id);
    var grup = {
      semua: all,
      draf: all.filter(function (p) { return p.statusProduk === 'draf'; }),
      aktif: all.filter(function (p) { return SELLER.statusProduk(p) === 'aktif'; }),
      menunggu: all.filter(function (p) { return SELLER.statusProduk(p) === 'menunggu'; }),
      habis: all.filter(function (p) { return p.stok <= 0; })
    };
    var list = grup[fProduk] || all;

    return UI.tabs([
      { key: 'semua', label: T('Semua'), n: all.length },
      /* Draf punya tabnya sendiri. Tanpa itu ia cuma menumpuk tak terlihat di
         "Semua" bersama produk sungguhan, dan tidak ada yang tahu mana yang
         belum selesai. */
      { key: 'draf', label: T('Draf'), n: grup.draf.length },
      { key: 'aktif', label: T('Tayang'), n: grup.aktif.length },
      { key: 'menunggu', label: T('Menunggu moderasi'), n: grup.menunggu.length },
      { key: 'habis', label: T('Stok habis'), n: grup.habis.length }
    ], fProduk, 'tab-produk') +

    UI.card({ flush: true,
      tools: '<button class="btn btn--sm" data-act="produk-baru">' + T('＋ Tambah Produk') + '</button>',
      body: UI.table([
        { h: T('Produk'), r: function (p) {
          var ht = SELLER.hargaTayang(p);
          return '<div class="row">' +
            '<div class="prd__mini">' + p.icon + '</div>' +
            '<div style="min-width:0"><div class="tbl-title">' + U.esc(p.nama) + '</div>' +
            '<div class="tbl-sub">' + U.esc(p.kode) + ' • ' + U.esc(p.kategori) +
            (ht.kampanye ? ' • <span style="color:var(--danger)">' + ht.kampanye.ikon + ' ' +
              U.esc(ht.kampanye.nama) + '</span>' : '') + '</div></div></div>'; } },
        { h: T('Harga'), cls: 'num', r: function (p) {
          var ht = SELLER.hargaTayang(p);
          return ht.kampanye
            ? '<div style="text-decoration:line-through;color:var(--muted-2);font-size:11.5px">' +
              U.rp(ht.asli) + '</div><b style="color:var(--danger)">' + U.rp(ht.harga) + '</b>'
            : '<b>' + U.rp(p.harga) + '</b>'; } },
        { h: T('Komisi'), cls: 'num', r: function (p) { return SELLER.komisiPersen(p) + '%' +
          '<div class="tbl-sub">' + U.rp(Math.round(p.harga * SELLER.komisiPersen(p) / 100)) + '</div>'; } },
        { h: T('Diterima'), cls: 'num', r: function (p) {
          return '<b style="color:var(--brand-dark)">' +
            U.rp(p.harga - Math.round(p.harga * SELLER.komisiPersen(p) / 100)) + '</b>'; } },
        { h: T('Stok'), cls: 'num', r: function (p) { return '<b style="color:' +
          (p.stok <= 0 ? 'var(--danger)' : p.stok <= p.minStok ? 'var(--warn)' : 'inherit') + '">' +
          U.num(p.stok) + '</b><div class="tbl-sub">' + U.esc(p.satuan) + '</div>'; } },
        { h: T('Status'), r: function (p) { return SELLER.chip(SELLER.STATUS_PRODUK, SELLER.statusProduk(p)) +
          (p.moderasi && p.moderasi.alasan
            ? '<div class="tbl-sub mt-1">' + U.esc(U.potong(p.moderasi.alasan, 30)) + '</div>' : ''); } },
        { h: 'Media', r: function (p) {
          var n = MEDIA.ringkas(p);
          var jml = n.foto + n.video + n.embed;
          if (!jml) return '<span class="tbl-sub">' + T('belum ada') + '</span>';
          return '<div class="row" style="gap:6px">' +
            (n.foto ? '<span class="chip chip--muted chip--xs">🖼️ ' + n.foto + '</span>' : '') +
            (n.video ? '<span class="chip chip--muted chip--xs">🎬 ' + n.video + '</span>' : '') +
            (n.embed ? '<span class="chip chip--brand chip--xs">🔗 ' + n.embed + '</span>' : '') +
            '</div>'; } },
        { h: '', cls: 'act', r: function (p) {
          return '<button class="btn btn--ghost btn--sm" data-act="stok-cepat" data-id="' + p.id + '">' + T('Stok') + '</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="media-produk" data-id="' + p.id + '">Media</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="edit-produk" data-id="' + p.id + '">' + T('Ubah') + '</button>'; } }
      ], list, { icon: '📦', judul: T('Belum ada produk'),
        teks: T('Tambahkan produk pertama Anda. Setelah lolos moderasi, produk langsung tayang di katalog.') }) });
  }

  /* ==================================================== KELOLA MEDIA PRODUK
     Dipisahkan dari formulir produk, bukan digabung: mengunggah berkas dan
     menempel tautan adalah pekerjaan yang berjalan sendiri — penjual sering
     bolak-balik menambah satu video tanpa berniat mengubah harga atau stok,
     dan memaksa mereka melewati formulir penuh hanya menambah risiko salah
     simpan pada kolom yang tidak mereka sentuh. */
  function dialogMedia(produkId) {
    var p = BIZ.produk(produkId);
    if (!p) { UI.toast(T('Produk tidak ditemukan'), 'err'); return; }
    var daftar = MEDIA.produk(p);
    /* Media yang dibuang penjual ditampung dulu; berkas fisiknya baru
       dilepas kalau Simpan benar-benar ditekan. */
    var buangan = [];

    function gambar() {
      var kotak = U.$('#med-list');
      if (kotak) kotak.innerHTML = isiDaftar();
      var sisa = U.$('#med-sisa');
      if (sisa) sisa.textContent = daftar.length + ' / ' + MEDIA.BATAS.perProduk + ' media';
    }

    function isiDaftar() {
      if (!daftar.length) {
        return '<div class="tbl-sub" style="padding:14px 0">' + T('Belum ada media.') + ' ' +
          T('Produk akan tampil dengan ikon bawaannya saja.') + '</div>';
      }
      return '<div class="medk">' + daftar.map(function (m, i) {
        return '<div class="medk__i">' +
          '<div class="medk__t" id="medt-' + i + '">' + MEDIA.ikon(m) + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<b style="font-size:12.4px">' + U.esc(MEDIA.label(m)) + '</b>' +
            '<div class="tbl-sub">' + U.esc(m.jenis === 'embed'
                ? (MEDIA.alamatTautan(m) || '—')
                : (m.nama || 'berkas perangkat')) + '</div>' +
          '</div>' +
          '<div class="row" style="gap:4px">' +
            (i > 0 ? '<button class="btn btn--ghost btn--sm btn--icon" data-act="med-naik" ' +
              'data-i="' + i + '" title="Naikkan">↑</button>' : '') +
            '<button class="btn btn--ghost btn--sm btn--icon" data-act="med-buang" ' +
              'data-i="' + i + '" title="Hapus">✕</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }

    UI.modal({
      title: T('Media Produk'), sub: p.nama, size: 'wide',
      body:
        UI.alert('info', T('Urutan di bawah menentukan urutan tampil di halaman produk.') + ' ' +
          'Media pertama menjadi gambar utama.', '🖼️') +

        '<div class="row mt-3"><b style="font-size:13px">Daftar media</b>' +
          '<div class="spacer"></div><span class="tbl-sub" id="med-sisa">' +
          daftar.length + ' / ' + MEDIA.BATAS.perProduk + ' media</span></div>' +
        '<div id="med-list">' + isiDaftar() + '</div>' +

        '<div class="row mt-3" style="gap:8px">' +
          '<button class="btn btn--soft btn--sm" data-act="med-unggah">📤 Unggah foto / video</button>' +
          '<input type="file" hidden id="med-file" accept="image/*,video/*" multiple ' +
            'data-change="med-terpilih">' +
        '</div>' +

        '<div class="field mt-3"><label>Tautan video (YouTube, TikTok, Instagram)</label>' +
          '<div class="row" style="gap:8px">' +
            '<input class="input" id="med-url" placeholder="https://www.youtube.com/watch?v=…" ' +
              'style="flex:1" autocomplete="off">' +
            '<button class="btn btn--sm" data-act="med-tambah-url">' + T('Tambah') + '</button>' +
          '</div>' +
          '<div class="hint">Tempelkan <b>tautan</b> videonya, bukan kode sematan. ' +
            'Maksimal ' + MEDIA.BATAS.embedPerProduk + ' ' + T('video sematan per produk.') + '</div></div>' +

        UI.alert('warn', '<b>' + T('Video sematan dimuat dari server YouTube, TikTok, atau Instagram.') + '</b> ' +
          T('Saat pembeli menekan putar, alamat IP dan peramban mereka terkirim ke perusahaan itu.') + ' ' +
          T('Karena itu videonya tidak dimuat sebelum ditekan.'), '🔒') +
        UI.alert('warn', '<b>' + T('Foto dan video unggahan tersimpan di perangkat ini saja') + '</b> ' +
          T('(prototipe). Pembeli di perangkat lain belum bisa melihatnya sampai penyimpanan') + ' ' +
          T('berkas dipindahkan ke server.'), '📦'),

      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
            '<button class="btn" data-act="med-simpan">' + T('Simpan Media') + '</button>',

      actions: {
        'med-unggah': function () { var f = U.$('#med-file'); if (f) f.click(); },

        'med-terpilih': function (el) {
          var files = Array.prototype.slice.call(el.files || []);
          el.value = '';
          if (!files.length) return;
          var sisa = MEDIA.BATAS.perProduk - daftar.length;
          if (sisa <= 0) { UI.toast(T('Batas media sudah tercapai'), 'warn'); return; }
          if (files.length > sisa) {
            UI.toast('Hanya ' + sisa + ' ' + T('berkas pertama yang dipakai — sisanya melebihi batas.'), 'warn');
            files = files.slice(0, sisa);
          }
          UI.toast('Memproses ' + files.length + ' berkas…', 'info');
          BERKAS.siapkanBanyak(files).then(function (hasil) {
            (hasil.lampiran || []).forEach(function (h) {
              daftar.push({
                jenis: h.jenis === 'video' ? 'video' : 'foto',
                berkasId: h.id, thumb: h.thumb || null,
                nama: h.nama || '', durasi: h.durasi || 0, at: U.nowISO()
              });
            });
            gambar();
            /* Yang gagal disebut satu per satu berikut alasannya, bukan
               dihitung saja: penjual perlu tahu berkas MANA yang tidak
               masuk supaya bisa memperbaikinya. */
            if ((hasil.gagal || []).length) {
              UI.toast(hasil.gagal.join(' · '), 'err');
            }
          }).catch(function (e) { UI.toast(e.message, 'err'); });
        },

        'med-tambah-url': function () {
          var kolom = U.$('#med-url');
          var boleh = MEDIA.bolehTambah({ media: daftar }, 'embed');
          if (!boleh.ok) { UI.toast(boleh.pesan, 'warn'); return; }
          var hasil = MEDIA.uraiTautan(kolom.value);
          if (!hasil.ok) { UI.toast(hasil.pesan, 'err'); return; }
          var kembar = daftar.filter(function (m) {
            return m.jenis === 'embed' && m.platform === hasil.media.platform &&
              m.videoId === hasil.media.videoId; }).length;
          if (kembar) { UI.toast(T('Video itu sudah ada di daftar.'), 'warn'); return; }
          daftar.push(hasil.media);
          kolom.value = '';
          gambar();
          UI.toast(MEDIA.label(hasil.media) + ' ditambahkan', 'ok');
        },

        'med-naik': function (el) {
          var i = Number(el.getAttribute('data-i'));
          if (i > 0) { var x = daftar[i - 1]; daftar[i - 1] = daftar[i]; daftar[i] = x; gambar(); }
        },

        'med-buang': function (el) {
          var i = Number(el.getAttribute('data-i'));
          var m = daftar[i];
          daftar.splice(i, 1);
          /* Berkas fisiknya baru dihapus saat Simpan ditekan — kalau dibuang
             sekarang lalu penjual menutup dialog tanpa menyimpan, medianya
             tetap tercatat di produk sementara isinya sudah lenyap. */
          if (m) buangan.push(m);
          gambar();
        },

        'med-simpan': function (el) {
          MEDIA.simpan(p.id, daftar);
          /* Berkas yang benar-benar tidak lagi dipakai baru dilepas di sini. */
          buangan.forEach(function (m) {
            var masih = daftar.filter(function (x) { return x.berkasId && x.berkasId === m.berkasId; }).length;
            if (m.berkasId && !masih) BERKAS.hapus(m.berkasId);
          });
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(T('Media produk disimpan'), 'ok');
          APP.refresh();
        }
      }
    });

    /* Thumbnail dimuat setelah dialog tergambar: URL objek baru bisa dibuat
       ketika berkasnya sudah dibaca dari IndexedDB. */
    setTimeout(function () { muatThumb(daftar); }, 60);
  }

  /** Isi kotak thumbnail dengan gambar sungguhan bila berkasnya ada. */
  function muatThumb(daftar) {
    daftar.forEach(function (m, i) {
      var kotak = document.getElementById('medt-' + i);
      if (!kotak) return;
      if (m.thumb) { kotak.innerHTML = '<img src="' + U.esc(m.thumb) + '" alt="">'; return; }
      if (m.jenis === 'foto' && m.berkasId && window.BERKAS) {
        BERKAS.url(m.berkasId).then(function (u) {
          if (u && document.body.contains(kotak)) kotak.innerHTML = '<img src="' + U.esc(u) + '" alt="">';
        });
      }
    });
  }

  function dialogStok(id) {
    var p = DB.find('products', id);
    UI.formModal({
      title: T('Perbarui stok'), sub: p.kode + ' • ' + p.nama, okText: T('Simpan'),
      intro: UI.alert('info', T('Stok saat ini') + ' <b>' + p.stok + ' ' + U.esc(p.satuan) + '</b>. ' +
        T('Perubahan stok langsung berlaku tanpa moderasi.'), '📦') + '<div class="mb-3"></div>',
      fields: [{ name: 'stok', label: T('Stok baru'), type: 'number', value: p.stok, required: true, min: 0 }]
    }).then(function (d) {
      if (!d) return;
      DB.update('products', id, { stok: Math.max(0, Number(d.stok) || 0) });
      UI.toast(T('Stok diperbarui'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ PESANAN */
  var fPesanan = 'aktif';
  function renderPesanan() {
    var u = segar();
    var all = SELLER.pesananToko(u.id);
    var grup = {
      aktif: all.filter(function (p) { return ['baru', 'dikonfirmasi', 'dikemas', 'dikirim'].indexOf(p.status) >= 0; }),
      baru: all.filter(function (p) { return p.status === 'baru'; }),
      selesai: all.filter(function (p) { return p.status === 'selesai'; }),
      semua: all
    };
    var list = grup[fPesanan] || all;

    return UI.tabs([
      { key: 'aktif', label: T('Perlu diproses'), n: grup.aktif.length },
      { key: 'baru', label: T('Baru'), n: grup.baru.length },
      { key: 'selesai', label: T('Selesai'), n: grup.selesai.length },
      { key: 'semua', label: T('Semua'), n: all.length }
    ], fPesanan, 'tab-pesanan') +

    UI.card({ flush: true, body: UI.table([
      { h: 'No. / Waktu', r: function (p) { return '<div class="code">' + U.esc(p.no) + '</div>' +
        '<div class="tbl-sub">' + U.sejak(p.createdAt) + '</div>'; } },
      { h: T('Pembeli'), r: function (p) { return '<div class="tbl-title">' + U.esc(BIZ.klien(p.clientId)) + '</div>' +
        '<div class="tbl-sub">' + U.esc(U.potong(p.alamatKirim || '', 38)) + '</div>'; } },
      { h: T('Barang'), r: function (p) { return (p.items || []).slice(0, 2).map(function (i) {
          var pr = DB.find('products', i.productId);
          return '<div style="font-size:12.3px">' + U.esc(U.potong(pr ? pr.nama : '—', 30)) +
            ' <span class="tbl-sub">×' + i.qty + '</span></div>'; }).join('') +
          ((p.items || []).length > 2 ? '<div class="tbl-sub">+' + (p.items.length - 2) + ' lagi</div>' : ''); } },
      { h: T('Diterima'), cls: 'num', r: function (p) { var r = SELLER.rincianPesanan(p.id);
        return '<b>' + U.rp(r.diterimaSeller) + '</b><div class="tbl-sub">komisi ' + U.rp(r.komisi) + '</div>'; } },
      { h: T('Status'), r: function (p) { return UI.statusChip('shop', p.status); } },
      { h: '', cls: 'act', r: function (p) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="detail-pesanan" data-id="' + p.id + '">' + T('Detail') + '</button>';
        var next = BIZ.statusBerikut(p.status);
        if (next && p.status !== 'selesai') {
          var lbl = { dikonfirmasi: 'Konfirmasi', dikemas: 'Kemas', dikirim: 'Kirim' }[next];
          if (lbl) b += ' <button class="btn btn--sm" data-act="maju-pesanan" data-id="' + p.id +
            '" data-next="' + next + '">' + lbl + '</button>';
        }
        return b; } }
    ], list, { icon: '📭', judul: T('Belum ada pesanan pada kategori ini') }) });
  }

  function detailPesanan(id) {
    var r = SELLER.rincianPesanan(id);
    var so = DB.find('shopOrders', id);
    var next = BIZ.statusBerikut(so.status);
    var lbl = { dikonfirmasi: T('Konfirmasi Pesanan'), dikemas: 'Tandai Dikemas', dikirim: T('Kirim Barang') }[next];

    Panel.detailPesananToko(id, {
      foot: '<button class="btn btn--wa" data-act="wa-pembeli">💬 Chat pembeli</button>' +
        (next && lbl ? '<button class="btn" data-act="maju">' + lbl + '</button>' : ''),
      actions: {
        'wa-pembeli': function () {
          var c = BIZ.user(so.clientId);
          WA.chat(c.telp, 'Halo ' + c.nama + ', mengenai pesanan ' + so.no + ' dari ' +
            SELLER.namaToko(so.sellerId) + ' — ');
        },
        maju: function (el) { tutup(el); majuPesanan(id, next); }
      }
    });

    /* sisipkan rincian pendapatan penjual ke dalam modal */
    var body = document.querySelector('.modal-back:last-of-type .modal__body');
    if (body) {
      body.insertAdjacentHTML('beforeend',
        Panel.seksi(T('Pendapatan Toko Anda'),
          '<div class="bh-total" style="border-radius:12px;border:1px solid var(--line)">' +
            '<div class="row"><span>' + T('Subtotal barang') + '</span><div class="spacer"></div><b>' +
              U.rp(r.subtotal) + '</b></div>' +
            '<div class="row"><span>Komisi EXOCLEAN</span><div class="spacer"></div>' +
              '<b style="color:var(--danger)">−' + U.rp(r.komisi) + '</b></div>' +
            (r.bebanPromo ? '<div class="row"><span>Beban promosi kampanye</span><div class="spacer"></div>' +
              '<b style="color:var(--danger)">−' + U.rp(r.bebanPromo) + '</b></div>' : '') +
            '<div class="row bh-grand"><span>' + T('Diterima toko Anda') + '</span><div class="spacer"></div><b>' +
              U.rp(r.diterimaSeller) + '</b></div>' +
          '</div>' +
          '<div class="tbl-sub mt-2">Ongkir ' + U.rp(r.ongkir) + ' ' + T('diteruskan ke kurir, bukan pendapatan toko.') + ' ' +
          (so.status === 'selesai'
            ? T('Dana bisa dicairkan mulai') + ' ' + U.tglPanjang(SELLER.tanggalCair(so)) + '.'
            : T('Dana masuk saldo tertahan sampai pembeli menerima barang.')) + '</div>'));
    }
  }

  /**
   * Menyerahkan barang ke kurir.
   *
   * Pesanan kirim baru didaftarkan ke Biteship DI SINI, bukan saat pembeli
   * checkout — pesanan kirim yang dibuat sebelum barangnya siap akan
   * menghanguskan slot penjemputan dan sebagian kurir menagih biaya
   * pembatalan. Nomor resi datang dari Biteship; penjual tidak perlu
   * mengetiknya, dan karena itu tidak bisa salah ketik.
   */
  function kirimBarang(id) {
    var so = DB.find('shopOrders', id);
    if (!so) return;
    var pil = so.kurirPilihan;

    /* Tanpa pilihan kurir — pesanan lama, atau gratis ongkir yang diantar
       sendiri — jalur manualnya tetap dipertahankan. */
    if (!pil || !pil.kurir) {
      UI.formModal({ title: T('Kirim barang'), okText: 'Tandai Dikirim',
        sub: T('Pembeli tidak memilih kurir, jadi isi manual'),
        fields: [
          { name: 'kurir', label: 'Kurir / ekspedisi', value: 'JNE Reguler', required: true },
          { name: 'resi', label: T('No. resi'), required: true }
        ] }).then(function (d) {
        if (!d) return;
        BIZ.ubahStatusToko(id, 'dikirim', { kurir: d.kurir, resi: d.resi });
        UI.toast(T('Pesanan ditandai dikirim & pembeli diberi tahu'), 'ok');
        APP.refresh();
      });
      return;
    }

    UI.konfirm({
      title: T('Serahkan ke kurir'),
      htmlText: T('Pesanan') + ' <b>' + U.esc(so.no) + '</b> ' + T('akan didaftarkan ke') + ' ' +
        '<b>' + U.esc(KIRIM.ringkas(pil)) + '</b>.' +
        (KIRIM.siap()
          ? '<br><br>' + T('Nomor resi akan diterbitkan otomatis dan kurir dijadwalkan menjemput.') + ' ' +
            T('Pastikan barangnya sudah benar-benar siap — pembatalan setelah ini bisa dikenai biaya.')
          : '<br><br><i>' + T('Mode simulasi: nomor resi dibuat aplikasi dan tidak bisa dilacak di situs kurir.') + '</i>'),
      okText: T('Ya, serahkan ke kurir')
    }).then(function (ya) {
      if (!ya) return;
      UI.toast('Mendaftarkan pengiriman…', 'info');
      KIRIM.buatPengiriman(id).then(function (h) {
        var kini = DB.find('shopOrders', id);
        BIZ.ubahStatusToko(id, 'dikirim',
          { kurir: kini.kurir || KIRIM.ringkas(pil), resi: kini.resi || h.resi || null });
        UI.toast(h.resi || kini.resi
          ? 'Resi ' + (kini.resi || h.resi) + ' ' + T('terbit — pembeli sudah diberi tahu')
          : T('Pengiriman terdaftar — pembeli sudah diberi tahu'), 'ok');
        APP.refresh();
      }).catch(function (e) {
        /* Kegagalan mendaftarkan pengiriman TIDAK boleh menyembunyikan pilihan
           lain: penjual tetap harus bisa menyerahkan barang secara manual. */
        UI.konfirm({
          title: T('Pendaftaran kurir gagal'), danger: true,
          htmlText: U.esc(e.message) + '<br><br>' + T('Tandai dikirim secara manual dan isi resinya sendiri?'),
          okText: 'Isi manual'
        }).then(function (manual) {
          if (!manual) return;
          UI.formModal({ title: T('Kirim barang'), okText: 'Tandai Dikirim',
            fields: [
              { name: 'kurir', label: 'Kurir / ekspedisi', value: KIRIM.ringkas(pil), required: true },
              { name: 'resi', label: T('No. resi'), required: true }
            ] }).then(function (d) {
            if (!d) return;
            BIZ.ubahStatusToko(id, 'dikirim', { kurir: d.kurir, resi: d.resi });
            APP.refresh();
          });
        });
      });
    });
  }

  function majuPesanan(id, next) {
    if (next === 'dikirim') { kirimBarang(id); return; }
    var teks = { dikonfirmasi: T('Konfirmasi pesanan ini? Stok akan dipotong otomatis.'),
      dikemas: T('Tandai pesanan sedang dikemas?') }[next];
    UI.konfirm({ title: teks || 'Lanjutkan?', okText: T('Ya') }).then(function (ya) {
      if (!ya) return;
      BIZ.ubahStatusToko(id, next, next === 'dikemas' ? { dikemasAt: U.nowISO() } : {});
      UI.toast(T('Status pesanan diperbarui'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ KEUANGAN */
  function renderKeuangan() {
    var u = segar();
    var s = SELLER.saldo(u.id);
    var c = SELLER.config();
    var cair = SELLER.pencairanSeller(u.id);

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Saldo bisa dicairkan'), small: true, valueHTML: U.rp(s.tersedia), icon: '💰',
        meta: s.siap.length + ' ' + T('pesanan siap cair') }) +
      UI.stat({ label: T('Saldo tertahan'), small: true, valueHTML: U.rp(s.tertahan), icon: '⏳',
        meta: T('menunggu pesanan diterima +') + ' ' + c.hariTahan + ' hari' }) +
      UI.stat({ label: T('Sedang diproses'), small: true, valueHTML: U.rp(s.menunggu), icon: '🔄',
        meta: 'pengajuan berjalan' }) +
      UI.stat({ label: T('Total dicairkan'), small: true, valueHTML: U.rp(s.totalDicairkan), icon: '✅',
        meta: cair.filter(function (x) { return x.status === 'dibayar'; }).length + ' pencairan' }) +
    '</div>' +

    (s.tersedia >= c.minPencairan
      ? UI.alert('ok', '<b>' + U.rp(s.tersedia) + ' siap dicairkan</b> ' + T('dari') + ' ' + s.siap.length +
          ' ' + T('pesanan. Biaya transfer') + ' ' + U.rp(c.biayaPencairan) + ' ' + T('dipotong dari jumlah pencairan.'), '💸')
      : UI.alert('info', 'Minimum pencairan <b>' + U.rp(c.minPencairan) + '</b>. Saldo tersedia saat ini ' +
          U.rp(s.tersedia) + '.', 'ℹ️')) +
    '<div class="mb-3"></div>' +

    '<div class="grid g-2-1">' +
      UI.card({ title: T('Rincian saldo per pesanan'), flush: true,
        tools: s.tersedia >= c.minPencairan
          ? '<button class="btn btn--sm" data-act="ajukan-cair">💸 Ajukan Pencairan</button>' : '',
        body: (s.siap.length || s.tahan.length)
          ? '<div>' + s.siap.map(function (r) { return barisSaldo(r, true); }).join('') +
            s.tahan.map(function (r) { return barisSaldo(r, false); }).join('') + '</div>'
          : UI.empty('💰', T('Belum ada saldo'), T('Saldo bertambah setiap pesanan Anda selesai.')) }) +

      UI.card({ title: 'Riwayat pencairan', flush: true,
        body: cair.length ? '<div class="mini-list">' + cair.map(function (x) {
          return '<div class="mini-item" data-act="detail-cair" data-id="' + x.id + '" style="cursor:pointer">' +
            '<div class="prd__mini">💸</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(x.no) + '</b>' +
            '<small>' + (x.orderIds || []).length + ' ' + T('pesanan •') + ' ' + U.tgl(x.diajukanAt) + '</small></div>' +
            '<div class="right"><b>' + U.rp(x.jumlahBersih) + '</b>' +
            '<div class="mt-1">' + SELLER.chip(SELLER.STATUS_CAIR, x.status) + '</div></div></div>';
        }).join('') + '</div>' : UI.empty('💸', T('Belum ada pencairan'), '') }) +
    '</div>';
  }

  function barisSaldo(r, siap) {
    var so = DB.find('shopOrders', r.shopOrderId);
    return '<div class="bh-row" data-act="detail-pesanan" data-id="' + r.shopOrderId + '">' +
      '<div style="min-width:0;flex:1">' +
        '<b>' + U.esc(r.no) + ' — ' + U.esc(r.pembeli) + '</b>' +
        '<div class="bh-sub">' + U.tgl(r.tgl) + ' • ' + r.baris.length + ' ' + T('jenis barang') + '</div>' +
        '<div class="bh-tag">' +
          '<span>subtotal ' + U.rpShort(r.subtotal) + '</span>' +
          '<span>komisi ' + U.rpShort(r.komisi) + '</span>' +
          (siap ? '<span class="bh-bonus">siap dicairkan</span>'
                : '<span>cair ' + U.tgl(SELLER.tanggalCair(so)) + '</span>') +
        '</div>' +
      '</div>' +
      '<div class="bh-nom"><b>' + U.rp(r.diterimaSeller) + '</b><small>' +
        (siap ? 'tersedia' : 'tertahan') + '</small></div></div>';
  }

  /* ================================================================ IKLAN */
  function renderIklan() {
    var u = segar();
    var st = SELLER.statistikIklan(u.id);
    var list = SELLER.iklanSeller(u.id);
    var c = SELLER.config();

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Saldo iklan'), small: true, valueHTML: U.rp(st.saldo), icon: '💳',
        meta: st.berjalan + ' iklan berjalan' }) +
      UI.stat({ label: T('Tayang'), value: U.num(st.tayang), icon: '👁️', meta: T('total impresi') }) +
      UI.stat({ label: T('Klik'), value: U.num(st.klik), icon: '🖱️', meta: 'CTR ' + st.ctr + '%' }) +
      UI.stat({ label: 'Belanja iklan', small: true, valueHTML: U.rp(st.belanja), icon: '📊',
        meta: st.klik ? U.rp(Math.round(st.belanja / st.klik)) + ' / klik' : '—' }) +
    '</div>' +

    (st.saldo < c.tarifKlikProduk * 10
      ? UI.alert('warn', '<b>' + T('Saldo iklan menipis.') + '</b> ' + T('Iklan otomatis berhenti tayang bila saldo tidak cukup') + ' ' +
          T('untuk satu klik.') + ' <a href="#" data-act="topup">' + T('Isi saldo →') + '</a>', '⚠️') + '<div class="mb-3"></div>' : '') +

    '<div class="row wrap mb-3" style="gap:8px">' +
      '<button class="btn" data-act="iklan-baru">＋ Buat Iklan</button>' +
      '<button class="btn btn--ghost" data-act="topup">' + T('💳 Isi Saldo Iklan') + '</button>' +
    '</div>' +

    UI.card({ cls: 'mb-3', flush: true, body: UI.table([
      { h: T('Iklan'), r: function (i) { var t = SELLER.TIPE_IKLAN[i.tipe];
        return '<div class="tbl-title">' + t.ic + ' ' + U.esc(i.judul) + '</div>' +
          '<div class="tbl-sub">' + U.esc(i.no) + ' • ' + U.esc(t.t) +
          (i.kategori ? ' • ' + U.esc(i.kategori) : '') + '</div>'; } },
      { h: T('Periode'), r: function (i) { return U.tgl(i.mulai) + ' – ' + U.tgl(i.selesai) +
        '<div class="tbl-sub">' + U.relatif(i.selesai) + '</div>'; } },
      { h: T('Tarif'), cls: 'num', r: function (i) { return U.rp(i.tarif) +
        '<div class="tbl-sub">' + (i.model === 'klik' ? 'per klik' : 'per hari') + '</div>'; } },
      { h: T('Tayang'), cls: 'num', r: function (i) { return U.num(i.tayang || 0); } },
      { h: T('Klik'), cls: 'num', r: function (i) { return U.num(i.klik || 0) +
        '<div class="tbl-sub">CTR ' + (i.tayang ? Math.round((i.klik || 0) / i.tayang * 1000) / 10 : 0) + '%</div>'; } },
      { h: 'Terpakai', cls: 'num', r: function (i) {
        var pct = i.anggaranTotal ? Math.round((i.terpakai || 0) / i.anggaranTotal * 100) : 0;
        return '<b>' + U.rp(i.terpakai || 0) + '</b>' +
          (i.anggaranTotal ? '<div class="tbl-sub">' + pct + T('% dari') + ' ' + U.rpShort(i.anggaranTotal) + '</div>' : ''); } },
      { h: T('Status'), r: function (i) { return SELLER.chip(SELLER.STATUS_IKLAN, i.status); } },
      { h: '', cls: 'act', r: function (i) {
        return i.status === 'berjalan'
          ? '<button class="btn btn--ghost btn--sm" data-act="jeda" data-id="' + i.id + '">⏸ Jeda</button>'
          : i.status === 'jeda'
            ? '<button class="btn btn--sm" data-act="lanjut" data-id="' + i.id + '">▶ Lanjutkan</button>'
            : ''; } }
    ], list, { icon: '📣', judul: T('Belum ada iklan'),
      teks: T('Iklan membuat produk Anda muncul di urutan teratas katalog dengan label Iklan.') }) }) +

    UI.card({ title: 'Pilihan format iklan', sub: T('Tarif berlaku saat ini'),
      body: '<div class="grid g-3">' + Object.keys(SELLER.TIPE_IKLAN).map(function (k) {
        var t = SELLER.TIPE_IKLAN[k];
        return '<div class="ads-opt"><div class="ads-opt__ic">' + t.ic + '</div>' +
          '<b>' + U.esc(t.t) + '</b>' +
          '<p>' + U.esc(t.ket) + '</p>' +
          '<div class="ads-opt__tarif">' + U.rp(SELLER.tarifIklan(k)) +
          '<small>' + (t.model === 'klik' ? 'per klik' : 'per hari') + '</small></div></div>';
      }).join('') + '</div>' +
      '<div class="tbl-sub mt-3">' + T('Iklan berbasis klik hanya menagih ketika pembeli benar-benar menekan') + ' ' +
      T('produk Anda — tayang saja tidak dikenai biaya. Semua iklan diberi label') + ' <b>' + T('Iklan') + '</b> ' + T('di katalog') + ' ' +
      T('agar pembeli tahu mana yang bersponsor.') + '</div>' });
  }

  function dialogIklan() {
    var u = segar();
    var produk = SELLER.produkToko(u.id).filter(function (p) { return SELLER.statusProduk(p) === 'aktif'; });
    if (!produk.length) { UI.toast(T('Belum ada produk tayang yang bisa diiklankan'), 'warn'); return; }

    UI.formModal({
      title: 'Buat Iklan Baru', size: 'wide', okText: 'Mulai Tayangkan',
      intro: UI.alert('brand',
        T('Biaya dipotong dari <b>saldo iklan</b> Anda ({v}). Iklan berhenti otomatis ' +
          'bila anggaran atau saldo habis.').replace('{v}', U.rp(SELLER.saldoIklan(u.id))),
        '💳') + '<div class="mb-3"></div>',
      fields: [
        { name: 'tipe', label: 'Format iklan', type: 'select', value: 'produk_sorot',
          options: Object.keys(SELLER.TIPE_IKLAN).map(function (k) {
            return { value: k, label: SELLER.TIPE_IKLAN[k].ic + ' ' + SELLER.TIPE_IKLAN[k].t +
              ' — ' + U.rp(SELLER.tarifIklan(k)) + (SELLER.TIPE_IKLAN[k].model === 'klik' ? '/klik' : '/hari') }; }) },
        { name: 'produkId', label: T('Produk yang diiklankan'), type: 'select',
          options: produk.map(function (p) { return { value: p.id, label: p.nama }; }) },
        { name: 'kategori', label: 'Kategori sasaran (khusus Sponsor Kategori)', type: 'select',
          options: [{ value: '', label: T('— semua kategori —') }].concat(
            ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
             'APD & Keselamatan Kerja', 'Consumable', 'Aksesoris'].map(function (k) {
              return { value: k, label: k }; })) },
        { name: 'anggaranTotal', label: T('Anggaran total (Rp)'), type: 'number', value: 300000, required: true },
        { name: 'anggaranHarian', label: 'Batas harian (Rp)', type: 'number', value: 50000 },
        { name: 'mulai', label: 'Mulai tayang', type: 'date', value: U.today(), required: true },
        { name: 'selesai', label: 'Berhenti tayang', type: 'date',
          value: U.iso(U.addDays(new Date(), 14)), required: true }
      ],
      validate: function (d) {
        if (d.selesai < d.mulai) return T('Tanggal berhenti harus setelah tanggal mulai');
        if (Number(d.anggaranTotal) > SELLER.saldoIklan(u.id))
          return T('Anggaran melebihi saldo iklan Anda. Isi saldo dulu.');
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var p = DB.find('products', d.produkId);
      SELLER.buatIklan(u.id, Object.assign(d, { judul: p ? p.nama : T('Iklan toko') }));
      UI.toast('Iklan mulai tayang', 'ok');
      APP.refresh();
    });
  }

  function dialogTopUp() {
    var c = SELLER.config();
    UI.formModal({
      title: T('Isi Saldo Iklan'), okText: T('Lanjutkan Pembayaran'),
      intro: UI.alert('info', T('Saldo iklan dipakai untuk membayar klik dan tayangan iklan Anda.') + ' ' +
        'Minimum pengisian ' + U.rp(c.minTopUpIklan) + '.', '💳') + '<div class="mb-3"></div>',
      fields: [{ name: 'jumlah', label: T('Jumlah pengisian (Rp)'), type: 'number', value: 250000, required: true }],
      validate: function (d) {
        return Number(d.jumlah) < c.minTopUpIklan ? 'Minimum ' + U.rp(c.minTopUpIklan) : null; }
    }).then(function (d) {
      if (!d) return;
      SELLER.topUpIklan(aku().id, Number(d.jumlah));
      terapkan();
      UI.toast(T('Saldo iklan bertambah') + ' ' + U.rp(d.jumlah), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ KAMPANYE */
  function renderKampanye() {
    var u = segar();
    var aktif = SELLER.kampanyeAktif();
    var nanti = SELLER.kampanyeMendatang();
    var produkSaya = SELLER.produkToko(u.id).filter(function (p) { return SELLER.statusProduk(p) === 'aktif'; });

    function kartu(k, berjalan) {
      var ikut = (k.produk || []).filter(function (id) {
        var p = DB.find('products', id); return p && p.sellerId === u.id; });
      return '<div class="promo" style="--promo:' + k.warna + '">' +
        '<div class="promo__ic">' + k.ikon + '</div>' +
        '<div class="promo__isi">' +
          '<b>' + U.esc(k.nama) + '</b>' +
          '<p>' + U.esc(k.deskripsi) + '</p>' +
          '<div class="row wrap mt-2" style="gap:6px">' +
            '<span class="chip chip--muted" style="font-size:10.5px">' +
              U.tgl(k.mulai) + ' – ' + U.tgl(k.selesai) + '</span>' +
            (k.diskonPersen ? '<span class="chip chip--danger" style="font-size:10.5px">' + T('Diskon') + ' ' +
              k.diskonPersen + '%</span>' : '') +
            '<span class="chip chip--warn" style="font-size:10.5px">Beban penjual ' +
              k.tanggunganSeller + '%</span>' +
          '</div>' +
          '<div class="tbl-sub mt-2">' + (k.diskonPersen
            ? T('Dari setiap potongan harga,') + ' ' + k.tanggunganSeller + T('% ditanggung toko Anda dan') + ' ' +
              k.tanggunganExoclean + '% ditanggung EXOCLEAN.'
            : T('Ongkos kirim ditanggung bersama sesuai porsi di atas.')) + '</div>' +
          '<div class="promo__kode" style="border-top-style:solid">' +
            (ikut.length
              ? '<span class="chip chip--ok">' + ikut.length + ' ' + T('produk ikut') + '</span>'
              : '<span class="chip chip--muted">' + T('Belum ikut') + '</span>') +
            '<div class="spacer"></div>' +
            '<button class="btn btn--soft btn--sm" data-act="atur-kampanye" data-id="' + k.id + '">' +
              (ikut.length ? T('Atur produk') : 'Ikut kampanye') + '</button>' +
          '</div>' +
        '</div></div>';
    }

    return UI.alert('brand', '<b>Kampanye adalah cara tercepat menaikkan penjualan.</b> ' + T('Produk yang ikut') + ' ' +
      T('kampanye tampil di halaman promo dengan harga coret, dan biaya diskonnya ditanggung bersama') + ' ' +
      T('EXOCLEAN — jadi Anda tidak menanggung sendirian.'), '🎉') + '<div class="mb-3"></div>' +

    (produkSaya.length === 0
      ? UI.alert('warn', T('Anda belum punya produk tayang, jadi belum bisa ikut kampanye.'), '⚠️') + '<div class="mb-3"></div>'
      : '') +

    '<div class="nav-group" style="color:var(--muted);padding:4px 0 10px">' + T('Sedang berjalan') + ' ' +
      '<span class="chip chip--muted">' + aktif.length + '</span></div>' +
    (aktif.length ? '<div class="grid g-2">' + aktif.map(function (k) { return kartu(k, true); }).join('') + '</div>'
      : UI.card({ body: UI.empty('🎉', T('Tidak ada kampanye berjalan'), 'Kampanye baru diumumkan admin secara berkala.') })) +

    (nanti.length ? '<div class="nav-group" style="color:var(--muted);padding:22px 0 10px">' + T('Akan datang') + ' ' +
      '<span class="chip chip--muted">' + nanti.length + '</span></div>' +
      '<div class="grid g-2">' + nanti.map(function (k) { return kartu(k, false); }).join('') + '</div>' : '');
  }

  function dialogAturKampanye(kampanyeId) {
    var u = segar();
    var k = DB.find('kampanye', kampanyeId);
    var produk = SELLER.produkToko(u.id).filter(function (p) { return SELLER.statusProduk(p) === 'aktif'; });
    var pilih = (k.produk || []).filter(function (id) {
      var p = DB.find('products', id); return p && p.sellerId === u.id; });

    UI.modal({
      title: k.ikon + ' ' + k.nama, sub: U.tgl(k.mulai) + ' – ' + U.tgl(k.selesai), size: 'wide',
      body: UI.alert('warn', k.diskonPersen
        ? T('Harga produk yang ikut akan turun') + ' <b>' + k.diskonPersen + '%</b> selama kampanye. ' +
          T('Dari potongan itu,') + ' <b>' + k.tanggunganSeller + T('% ditanggung toko Anda') + '</b> ' + T('dan sisanya EXOCLEAN.') + ' ' +
          T('Komisi tetap dihitung dari harga setelah diskon.')
        : T('Ongkos kirim ditanggung bersama:') + ' ' + k.tanggunganSeller + T('% toko Anda,') + ' ' +
          k.tanggunganExoclean + '% EXOCLEAN.', '⚠️') +
        '<div class="mt-3">' + (produk.length ? produk.map(function (p) {
          var potongan = Math.round(p.harga * (k.diskonPersen || 0) / 100);
          var beban = Math.round(potongan * k.tanggunganSeller / 100);
          return '<label class="checklist-item" style="cursor:pointer">' +
            '<input type="checkbox" data-change="pilih-produk" data-id="' + p.id + '"' +
              (pilih.indexOf(p.id) >= 0 ? ' checked' : '') + '>' +
            '<div style="flex:1;min-width:0"><span class="lbl">' + p.icon + ' ' + U.esc(p.nama) + '</span>' +
            '<small>' + (k.diskonPersen
              ? U.rp(p.harga) + ' → <b style="color:var(--danger)">' + U.rp(p.harga - potongan) + '</b>' +
                ' ' + T('• beban Anda') + ' ' + U.rp(beban) + ' per unit terjual'
              : 'Ikut program gratis ongkir') + '</small></div></label>';
        }).join('') : '<div class="tbl-sub">' + T('Tidak ada produk tayang.') + '</div>') + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="simpan-kampanye">' + T('Simpan Keikutsertaan') + '</button>',
      actions: {
        'pilih-produk': function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) { if (pilih.indexOf(id) < 0) pilih.push(id); }
          else pilih = pilih.filter(function (x) { return x !== id; });
        },
        'simpan-kampanye': function (el) {
          var lain = (k.produk || []).filter(function (id) {
            var p = DB.find('products', id); return !p || p.sellerId !== u.id; });
          DB.update('kampanye', kampanyeId, { produk: lain.concat(pilih) });
          tutup(el);
          UI.toast(pilih.length ? pilih.length + ' ' + T('produk ikut kampanye') : T('Produk dikeluarkan dari kampanye'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* ================================================================ PROFIL TOKO */
  function renderProfilToko() {
    var u = segar();
    var t = SELLER.toko(u);
    var logo = t.logo ? DB.getPhoto(t.logo) : null;

    return '<div class="grid g-2-1">' +
      UI.card({ title: T('Profil Toko'), sub: T('Tampil di katalog dan halaman produk'),
        body:
          '<div class="row mb-3" style="gap:14px;align-items:center">' +
            '<div class="toko-logo">' + (logo ? '<img src="' + logo + '" alt="">'
              : '<span>' + U.esc(U.initials(t.nama || u.nama)) + '</span>') +
              '<button class="toko-logo__btn" data-act="pilih-logo">📷</button>' +
              '<input type="file" accept="image/*" hidden id="inp-logo" data-change="unggah-logo">' +
            '</div>' +
            '<div><b style="font-size:15px">' + U.esc(t.nama || T('Belum ada nama toko')) + '</b>' +
            '<div class="tbl-sub">' + (t.kota || '—') + '</div>' +
            '<div class="mt-1">' + SELLER.chip(SELLER.STATUS_TOKO, t.status) + '</div></div>' +
          '</div>' +
          UI.field({ name: 'nama', label: T('Nama toko'), value: t.nama, required: true,
            hint: T('Nama ini yang dilihat pembeli di katalog.') }) +
          UI.field({ name: 'deskripsi', label: T('Deskripsi toko'), type: 'textarea', rows: 3,
            value: t.deskripsi, hint: T('Ceritakan spesialisasi dan keunggulan toko Anda.') }) +
          UI.field({ name: 'telpToko', label: T('Telepon toko'), value: t.telpToko }) +
          '<div class="tbl-sub" style="margin:10px 0 4px"><b>' + T('Alamat gudang / pengiriman') + '</b>' +
            ' ' + T('&mdash; titik jemput kurir saat ada pesanan.') + '</div>' +
          WILAYAH.fields(wilGudang(t)).map(function (f) { return UI.field(f); }).join('') +
          UI.field({ name: 'kategoriUtama', label: T('Kategori utama'), type: 'select', value: t.kategoriUtama,
            options: ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
                      'APD & Keselamatan Kerja', 'Consumable', 'Aksesoris'] }) +
          '<div class="field"><label>' + T('Titik gudang di peta') + '</label>' +
            MAPS.petaHTML(t.koordinat, { tinggi: 180, aksiPilih: 'titik-gudang-toko' }) +
            '<div class="hint mt-1">' + T('Ongkir pembeli dihitung dari titik ini. Selama belum ditandai,') + ' ' +
            T('pembeli dikenai tarif dasar yang mungkin tidak sesuai jarak sebenarnya.') + '</div></div>',
        foot: '<div class="spacer"></div><button class="btn" data-act="simpan-toko">' + T('Simpan Profil Toko') + '</button>' }) +

      '<div class="col">' +
        UI.card({ title: 'Ringkasan komisi', sub: T('Yang dipotong tiap penjualan'),
          body: '<div class="mini-list" style="margin:0 -18px">' +
            Object.keys(SELLER.config().komisiKategori).map(function (k) {
              return '<div class="mini-item"><div style="min-width:0;flex:1"><b style="font-size:12.6px">' +
                U.esc(k) + '</b></div><div class="right"><b>' +
                SELLER.config().komisiKategori[k] + '%</b></div></div>';
            }).join('') + '</div>' +
            '<div class="tbl-sub mt-2">' + T('Komisi dihitung dari subtotal barang, bukan termasuk ongkir.') + '</div>' }) +

        UI.card({ title: T('Performa toko'),
          body: (function () {
            var st = SELLER.statistikToko(u.id);
            return '<dl class="kv" style="grid-template-columns:1fr auto">' +
              '<dt>' + T('Total pesanan') + '</dt><dd>' + st.pesanan + '</dd>' +
              '<dt>' + T('Pesanan selesai') + '</dt><dd>' + st.selesai + '</dd>' +
              '<dt>' + T('Produk tayang') + '</dt><dd>' + st.produkTayang + ' / ' + st.produk + '</dd>' +
              '<dt>' + T('Bergabung') + '</dt><dd>' + (t.bergabungAt ? U.tgl(t.bergabungAt) : '—') + '</dd>' +
              '</dl>'; })() }) +
      '</div>' +
    '</div>';
  }

  /* ================================================================ AKSI */
  /**
   * Alamat gudang dalam bentuk terstruktur. Toko lama hanya punya kota +
   * satu baris teks, jadi diurai dulu supaya mitra yang sudah berjualan
   * tidak menemukan formulirnya kosong dan mengira datanya hilang.
   */
  function wilGudang(t) {
    if (WILAYAH.terstruktur(t.wilayahGudang)) return t.wilayahGudang;
    var w = WILAYAH.dariTeksLama(t.alamatGudang);
    if (t.kota) {
      w.l2 = t.kota;
      /* Kota kerap diulang di ekor teks alamat. Dibiarkan, mitra melihat
         nama kota dua kali dan alamat cetaknya jadi berulang. */
      w.jalan = String(w.jalan || '')
        .replace(new RegExp(',\\s*' + t.kota.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '')
        .trim();
    }
    return w;
  }

  function aksi(root) {
    /* Berjenjang: mengganti negara menyusun ulang label dan pilihan di
       bawahnya. Dipasang di sini karena kartunya bukan modal. */
    if (root.querySelector('#f_negara')) WILAYAH.pasang(root);
    U.delegate(root, {
      /* navigasi */
      'ke-pesanan': function () { APP.go('pesanan'); },
      'ke-produk': function () { APP.go('produk'); },
      'ke-iklan': function () { APP.go('iklan'); },
      'ke-profil-toko': function () { APP.go('tokoprofil'); },
      'ke-berkas': function () { APP.go('profil'); },
      'ke-rekening': function () { APP.go('profil'); },

      /* onboarding */
      'ajukan-toko': function () {
        UI.konfirm({ title: T('Ajukan verifikasi toko?'),
          text: T('Admin akan memeriksa profil toko, identitas, rekening, dan produk Anda.'),
          okText: T('Ya, ajukan') }).then(function (ya) {
          if (!ya) return;
          SELLER.ajukanToko(aku().id);
          terapkan();
          UI.toast(T('Pengajuan terkirim. Admin akan memeriksanya.'), 'ok');
          APP.refresh();
        });
      },

      /* produk */
      'tab-produk': function (el) { fProduk = el.getAttribute('data-key'); APP.refresh(); },
      /* Menyusun produk pindah ke halaman penuh bertahap. dialogProduk yang
         lama DIBUANG, bukan disimpan sebagai jalan kedua: dua formulir untuk
         benda yang sama akan menyimpan bidang yang berbeda-beda, dan yang
         satu tidak akan pernah tahu bidang yang ditambahkan ke yang lain. */
      'produk-baru': function () {
        var kosong = PRODUKED.drafKosong(APP.user.id);
        APP.go('produkEditor', kosong ? { id: kosong.id } : {});
      },
      'edit-produk': function (el) { APP.go('produkEditor', { id: el.getAttribute('data-id') }); },
      'media-produk': function (el) { dialogMedia(el.getAttribute('data-id')); },
      'stok-cepat': function (el) { dialogStok(el.getAttribute('data-id')); },

      /* pesanan */
      'tab-pesanan': function (el) { fPesanan = el.getAttribute('data-key'); APP.refresh(); },
      'detail-pesanan': function (el) { detailPesanan(el.getAttribute('data-id')); },
      'maju-pesanan': function (el) { majuPesanan(el.getAttribute('data-id'), el.getAttribute('data-next')); },

      /* keuangan — pencairan adalah perpindahan uang, jadi digerbang PIN
         seperti penarikan saldo mitra lapangan */
      'ajukan-cair': function () {
        var s = SELLER.saldo(aku().id);
        if (!KEAMANAN.punyaPin(aku())) {
          UI.toast(T('Buat PIN transaksi dulu di Profil → Keamanan'), 'err');
          APP.go('profil', { tab: 'keamanan' });
          return;
        }
        ViewKeamanan.mintaPin({
          judul: 'Setujui pencairan',
          sub: U.rp(s.tersedia) + ' dari ' + s.siap.length + ' pesanan',
          rincian: UI.alert('brand', '<b>' + U.rp(s.tersedia) + '</b> ' + T('akan diajukan untuk dicairkan') + ' ' +
            T('ke rekening toko Anda.'), '💸')
        }).then(function (pin) {
          if (!pin) return;
          var cek = KEAMANAN.periksaPin(aku().id, pin);
          if (!cek.ok) { UI.toast(cek.error, 'err'); return; }
          var r = SELLER.ajukanPencairan(aku().id);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          KEAMANAN.catat(aku().id, 'Mengajukan pencairan ' + r.payout.no, 'ok', U.rp(s.tersedia));
          UI.toast('Pengajuan pencairan ' + r.payout.no + ' ' + T('terkirim ke admin'), 'ok');
          APP.refresh();
        });
      },
      'detail-cair': function (el) { detailPencairan(el.getAttribute('data-id')); },

      /* iklan */
      'iklan-baru': function () { dialogIklan(); },
      topup: function () { dialogTopUp(); },
      jeda: function (el) { SELLER.jedaIklan(el.getAttribute('data-id'), true);
        UI.toast('Iklan dijeda', 'ok'); APP.refresh(); },
      lanjut: function (el) { SELLER.jedaIklan(el.getAttribute('data-id'), false);
        UI.toast('Iklan dilanjutkan', 'ok'); APP.refresh(); },

      /* kampanye */
      'atur-kampanye': function (el) { dialogAturKampanye(el.getAttribute('data-id')); },

      /* profil toko */
      'titik-gudang-toko': function () {
        var t = SELLER.toko(segar());
        MAPS.pilihTitik({ judul: 'Titik gudang — ' + (t.nama || T('Toko Anda')),
          sub: T('Menentukan ongkir yang dilihat pembeli'),
          alamat: t.alamatGudang, awal: t.koordinat }).then(function (hasil) {
          if (!hasil) return;
          SELLER.simpanToko(aku().id, { koordinat: hasil.hapus ? null : hasil });
          terapkan();
          UI.toast(hasil.hapus ? 'Titik gudang dihapus' : 'Titik gudang tersimpan', 'ok');
          APP.refresh();
        });
      },
      'pilih-logo': function () { U.$('#inp-logo').click(); },
      'unggah-logo': function (el) {
        UI.handleFotoInput(el, function (ids) {
          var t = SELLER.toko(segar());
          if (t.logo) DB.delPhoto(t.logo);
          ids.slice(1).forEach(DB.delPhoto);
          SELLER.simpanToko(aku().id, { logo: ids[0] });
          terapkan();
          UI.toast(T('Logo toko diperbarui'), 'ok');
          APP.refresh();
        });
      },
      'simpan-toko': function (el) {
        var f = U.readForm(el.closest('.card'));
        if (!f.nama) { UI.toast(T('Nama toko wajib diisi'), 'err'); return; }
        var wil = WILAYAH.dariForm(f);
        var salah = WILAYAH.periksa(wil);
        if (salah) { UI.toast(salah, 'err'); return; }
        /* kota + alamatGudang tetap ditulis: dipakai katalog, kartu toko, dan
           perhitungan ongkir yang belum membaca bentuk terstruktur. */
        SELLER.simpanToko(aku().id, Object.assign({}, f, {
          wilayahGudang: wil, kota: wil.l2,
          alamatGudang: WILAYAH.teks(wil, { denganNegara: false }),
          kodePos: wil.kodePos
        }));
        terapkan();
        UI.toast(T('Profil toko disimpan'), 'ok');
        APP.refresh();
      }
    });
  }

  function detailPencairan(id) {
    var x = DB.find('sellerPayouts', id);
    UI.modal({
      title: 'Pencairan ' + x.no, sub: U.tglPanjang(x.diajukanAt), size: 'wide',
      body: '<div class="row wrap mb-3">' + SELLER.chip(SELLER.STATUS_CAIR, x.status) +
          '<span class="chip chip--brand">' + U.rp(x.jumlahBersih) + '</span>' +
          '<span class="chip chip--muted">' + (x.orderIds || []).length + ' ' + T('pesanan') + '</span></div>' +
        '<dl class="kv">' +
          '<dt>' + T('Jumlah kotor') + '</dt><dd>' + U.rp(x.jumlahKotor) + '</dd>' +
          '<dt>' + T('Biaya transfer') + '</dt><dd style="color:var(--danger)">−' + U.rp(x.biaya) + '</dd>' +
          '<dt>' + T('Diterima') + '</dt><dd><b>' + U.rp(x.jumlahBersih) + '</b></dd>' +
          '<dt>' + T('Rekening') + '</dt><dd>' + U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) +
            '<br>a.n. ' + U.esc(x.rekening.atasNama) + '</dd>' +
          (x.refTransfer ? '<dt>Ref. transfer</dt><dd>' + U.esc(x.refTransfer) + '</dd>' : '') +
          (x.dibayarAt ? '<dt>Ditransfer</dt><dd>' + U.tglJam(x.dibayarAt) + '</dd>' : '') +
          (x.catatan ? '<dt>' + T('Catatan') + '</dt><dd>' + U.esc(x.catatan) + '</dd>' : '') +
        '</dl>' +
        Panel.seksi(T('Pesanan yang dicairkan'), '<div>' + (x.rincian || []).map(function (r) {
          return '<div class="bh-row" style="cursor:default"><div style="min-width:0;flex:1">' +
            '<b>' + U.esc(r.no) + '</b><div class="bh-sub">' + U.esc(r.pembeli) + ' • ' + U.tgl(r.tgl) + '</div></div>' +
            '<div class="bh-nom"><b>' + U.rp(r.diterimaSeller) + '</b></div></div>';
        }).join('') + '</div>'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
    });
  }

  /* ================================================================ PAGES */
  /**
   * Menu Mitra Toko. Isinya berbeda menurut status tokonya: yang belum aktif
   * hanya melihat langkah pendaftaran, yang sudah aktif melihat seluruh
   * perangkat jualannya.
   *
   * `opsi.semua` mengembalikan GABUNGAN kedua keadaan itu. Dipakai layar
   * Susunan Menu, yang dibuka Super Admin — bukan mitra. Tanpa itu, yang
   * tampil untuk diatur adalah menu milik toko yang belum aktif, karena
   * status yang diperiksa adalah status Super Admin sendiri: enam menu
   * hilang dari daftar, dan satu menu yang tidak pernah dilihat mitra
   * sungguhan justru ikut terdaftar.
   */
  function susunPages(opsi) {
    var semua = !!(opsi && opsi.semua);
    var u = APP.user;
    var aktif = semua || (u && SELLER.statusToko(u) === 'aktif');
    var p = {};

    if (!aktif || semua) {
      p.gabung = { label: T('Buka Toko'), icon: '🏪', grup: T('Toko Saya'),
        sub: T('Langkah bergabung sebagai Mitra Toko'), render: renderGabung, mount: aksi };
    }
    if (aktif) {
      p.dashboard = { label: T('Dashboard Toko'), icon: '📊', grup: T('Toko Saya'),
        render: renderDashboard, mount: aksi };
      p.pesanan = { label: T('Pesanan'), icon: '🛒', grup: T('Toko Saya'), render: renderPesanan, mount: aksi,
        badge: function () { return DB.where('shopOrders', function (x) {
          return x.sellerId === APP.user.id && x.status === 'baru'; }).length; } };
    }

    p.produk = { label: T('Produk Saya'), icon: '📦', grup: T('Toko Saya'), render: renderProduk, mount: aksi,
      badge: function () { return SELLER.produkToko(APP.user.id).filter(function (x) {
        return x.stok <= 0; }).length; } };

    if (aktif) {
      p.keuangan = { label: T('Keuangan Toko'), icon: '💰', grup: 'Penjualan',
        sub: T('Saldo, komisi & pencairan'), render: renderKeuangan, mount: aksi };
      p.iklan = { label: T('Iklan'), icon: '📣', grup: 'Penjualan',
        sub: T('Promosikan produk Anda'), render: renderIklan, mount: aksi };
      p.kampanye = { label: T('Kampanye & Event'), icon: '🎉', grup: 'Penjualan',
        render: renderKampanye, mount: aksi };
    }

    /* Editor produk: halaman penuh, tidak muncul di menu. Ia selalu dibuka
       dari daftar produk dan selalu membawa satu produk. */
    p.produkEditor = ViewProdukEditor.page();
    p.tokoprofil = { label: T('Profil Toko'), icon: '🏪', grup: 'Akun', render: renderProfilToko, mount: aksi };
    p.profil = ViewProfil.page('Akun');
    return p;
  }

  return {
    get pages() { return susunPages(); },
    /* Seluruh menu yang MUNGKIN dilihat mitra, apa pun status tokonya. */
    semuaPages: function () { return susunPages({ semua: true }); },
    detailPesanan: detailPesanan,
    /* Dipakai editor produk: pengelola media sudah lengkap di sini, dan
       menyalinnya ke sana berarti dua tempat yang akan mulai berbeda. */
    dialogMedia: dialogMedia
  };
})();
