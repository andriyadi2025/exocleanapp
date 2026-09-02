/* ==========================================================================
   views/client.js — tampilan untuk KLIEN
   Pesan layanan • pantau order • setujui penawaran • bayar • beri penilaian
   ========================================================================== */
var ViewClient = (function () {

  function me() { return APP.user; }
  function orderSaya() { return U.sortBy(BIZ.ordersUntuk(me()), function (o) { return o.tgl; }, true); }
  function tagihanSaya() { return U.sortBy(DB.where('invoices', { clientId: me().id }), function (i) { return i.terbitAt; }, true); }
  function penawaranSaya() {
    return U.sortBy(DB.where('quotations', function (q) {
      return q.clientId === me().id && q.status !== 'draft';
    }), function (q) { return q.dikirimAt || q.createdAt; }, true);
  }

  /* ================================================================ BERANDA */
  function renderBeranda() {
    var u = me();
    var orders = orderSaya();
    var aktif = orders.filter(function (o) { return ['dijadwalkan', 'berjalan', 'selesai', 'perbaikan'].indexOf(o.status) >= 0; });
    var tagihan = tagihanSaya().filter(function (i) { return i.status !== 'lunas'; });
    var quo = penawaranSaya().filter(function (q) { return q.status === 'terkirim'; });
    var perluNilai = orders.filter(function (o) { return o.status === 'diverifikasi' && !BIZ.ratingOrder(o.id); });

    return '' +
    '<div class="card" style="background:linear-gradient(130deg,#0E5C55,#14958A);border:none;color:#fff;margin-bottom:16px">' +
      '<div class="card__body">' +
        '<div class="row wrap" style="gap:18px">' +
          '<div style="min-width:230px;flex:1">' +
            '<h2 style="font-size:20px">Halo, ' + U.esc(u.nama.split(' ')[0]) + ' 👋</h2>' +
            '<p style="color:rgba(255,255,255,.82);font-size:13px;margin:6px 0 0">' +
              (aktif.length ? 'Ada <b>' + aktif.length + ' ' + I18N.t('pekerjaan aktif') + '</b> ' + I18N.t('untuk') + ' ' + U.esc(u.perusahaan || 'Anda') + '.'
                            : I18N.t('Belum ada pekerjaan aktif. Ajukan permintaan kapan saja — survei gratis.')) +
            '</p>' +
          '</div>' +
          '<div class="row wrap" style="gap:8px">' +
            '<button class="btn" style="background:#fff;color:var(--brand-dark)" data-act="ke-pesan">' + I18N.t('＋ Pesan Layanan') + '</button>' +
            '<button class="btn" style="background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3)" ' +
              'data-act="ke-toko">🛒 Belanja Perlengkapan</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Pekerjaan aktif'), value: aktif.length, icon: '🧹',
        meta: aktif.length ? U.esc(U.potong(aktif[0].judul, 34)) : I18N.t('tidak ada') }) +
      UI.stat({ label: I18N.t('Menunggu persetujuan'), value: quo.length, icon: '📄',
        meta: quo.length ? I18N.t('penawaran perlu Anda tinjau') : I18N.t('tidak ada penawaran baru') }) +
      UI.stat({ label: I18N.t('Tagihan belum dibayar'), small: true, valueHTML: U.rp(U.sum(tagihan, function (i) { return BIZ.sisaTagihan(i); })),
        icon: '🧾', meta: tagihan.length + ' invoice' }) +
      UI.stat({ label: I18N.t('Total pekerjaan selesai'), value: orders.filter(function (o) { return o.status === 'diverifikasi'; }).length,
        icon: '✅', meta: 'sejak bergabung' }) +
    '</div>' +

    (quo.length ? UI.alert('warn',
      '<b>' + quo.length + ' ' + I18N.t('penawaran menunggu keputusan Anda.') + '</b> ' +
      'Penawaran ' + U.esc(quo[0].no) + ' berlaku sampai ' + U.tgl(quo[0].berlakuHingga) + '. ' +
      '<a href="#" data-act="ke-penawaran">Tinjau sekarang →</a>', '⏳') + '<div class="mb-3"></div>' : '') +

    (perluNilai.length ? UI.alert('brand',
      I18N.t('Pekerjaan') + ' <b>' + U.esc(perluNilai[0].judul) + '</b> ' + I18N.t('sudah selesai.') + ' ' +
      '<a href="#" data-act="nilai" data-id="' + perluNilai[0].id + '">Beri penilaian →</a>', '🌟') + '<div class="mb-3"></div>' : '') +

    (function () {
      var bln = BIZ.ringkasanBulanan(u.id, 6);
      if (!U.sum(bln, function (b) { return b.total; })) return '';
      return UI.card({ cls: 'mb-3', title: 'Aktivitas 6 bulan terakhir',
        sub: I18N.t('Pemesanan layanan & pembelian produk'),
        tools: '<button class="btn btn--ghost btn--sm" data-act="ke-aktivitas">' + I18N.t('Lihat rincian') + '</button>',
        body: Chart.kolom({
          seri: SERI, satuan: U.rp,
          sumber: { teks: I18N.t('Setiap pesanan jasa dan pembelian produk ' +
            'yang sudah dibayar, dijumlahkan per bulan. Pesanan yang ' +
            'dibatalkan tidak ikut dihitung.'), hal: 'aktivitas' },
          judulA11y: I18N.t('Pengeluaran enam bulan terakhir, dipisah jasa kebersihan dan toko perlengkapan'),
          data: bln.map(function (b) {
            return { label: b.label, sub: String(b.tahun).slice(2), values: [b.jasa, b.toko] }; })
        }) });
    })() +

    '<div class="grid g-2-1">' +
      UI.card({ title: I18N.t('Pekerjaan Anda'), sub: 'Terbaru lebih dulu', flush: true,
        tools: '<button class="btn btn--ghost btn--sm" data-act="ke-order">' + I18N.t('Lihat semua') + '</button>',
        body: orders.length
          ? '<div style="padding:14px 18px">' + orders.slice(0, 4).map(kartuOrder).join('') + '</div>'
          : UI.empty('🧽', I18N.t('Belum ada pekerjaan'), I18N.t('Ajukan permintaan layanan, tim kami akan menghubungi Anda dalam 1x24 jam.')) }) +
      '<div class="col">' +
        UI.card({ title: I18N.t('Tagihan'), flush: true,
          body: tagihan.length ? '<div class="mini-list">' + tagihan.slice(0, 4).map(function (i) {
            var tx = PAY.txAktif(i.id);
            return '<div class="mini-item"><div style="min-width:0"><b>' + U.esc(i.no) + '</b>' +
              '<small>Jatuh tempo ' + U.tgl(i.jatuhTempo) + ' • ' + U.rp(BIZ.sisaTagihan(i)) + '</small></div>' +
              '<div class="right">' + UI.statusChip('invoice', i.status) +
              '<div class="mt-1"><button class="btn btn--sm" data-act="' +
                (tx ? 'lanjut-bayar" data-id="' + tx.id : 'bayar-online" data-id="' + i.id) + '">' +
                (tx ? 'Lanjutkan' : '💳 Bayar') + '</button></div>' +
              '</div></div>';
          }).join('') + '</div>' : UI.empty('🎉', I18N.t('Tidak ada tagihan'), I18N.t('Semua invoice sudah lunas.')) }) +
        (function () {
          var so = U.sortBy(DB.where('shopOrders', function (p) {
            return p.clientId === u.id && ['baru', 'dikonfirmasi', 'dikemas', 'dikirim'].indexOf(p.status) >= 0;
          }), function (p) { return p.createdAt; }, true);
          if (!so.length) return '';
          return UI.card({ title: I18N.t('Pesanan Toko'), sub: so.length + ' sedang diproses', flush: true,
            tools: '<button class="btn btn--ghost btn--sm" data-act="ke-belanja">' + I18N.t('Lihat') + '</button>',
            body: '<div class="mini-list">' + so.slice(0, 3).map(function (p) {
              return '<div class="mini-item" data-act="detail-toko-beranda" data-id="' + p.id + '" style="cursor:pointer">' +
                '<div class="prd__mini">🛒</div>' +
                '<div style="min-width:0;flex:1"><b>' + U.esc(p.no) + '</b>' +
                '<small>' + (p.items || []).length + ' ' + I18N.t('jenis barang •') + ' ' + U.rp(p.total) + '</small></div>' +
                '<div class="right">' + UI.statusChip('shop', p.status) + '</div></div>';
            }).join('') + '</div>' });
        })() +
        UI.card({ title: 'Butuh bantuan?',
          body: '<p style="font-size:12.8px;color:var(--ink-2)">' + I18N.t('Tim marketing kami siap membantu survei & konsultasi gratis.') + '</p>' +
            '<button class="btn btn--wa btn--block mt-2" data-act="wa-admin">💬 Chat Admin EXOCLEAN</button>' }) +
      '</div>' +
    '</div>';
  }

  function kartuOrder(o) {
    var p = BIZ.progresChecklist(o);
    return '<div class="order-card" data-act="detail" data-id="' + o.id + '" style="cursor:pointer">' +
      '<div class="top"><div style="min-width:0;flex:1">' +
        '<h4>' + U.esc(o.judul) + '</h4>' +
        '<div class="meta"><span>📅 ' + U.tgl(o.tgl) + ' • ' + o.mulai + '</span>' +
        '<span>🏷️ ' + U.esc(o.no) + '</span>' +
        (o.nilai ? '<span>💰 ' + U.rp(o.nilai) + '</span>' : '') + '</div>' +
      '</div>' + UI.statusChip('order', o.status) + '</div>' +
      (p.total ? '<div class="mt-2">' + UI.progress(p.pct, p.pct === 100 ? 'ok' : '') +
        '<div class="tbl-sub mt-1">' + p.done + '/' + p.total + ' ' + I18N.t('langkah selesai') + '</div></div>' : '') +
      /* Aman bersarang di dalam kartu yang sendirinya ber-data-act:
         U.delegate memakai closest(), sehingga yang terpanggil adalah
         data-act TERDEKAT — tombol ini, bukan 'detail' milik kartunya. */
      '<div class="row mt-2"><div class="spacer"></div>' +
        '<button class="btn btn--soft btn--sm" data-act="pesan-lagi-order" data-id="' + o.id +
        '">' + I18N.t('🔁 Pesan Lagi') + '</button></div>' +
      '</div>';
  }

  /* ================================================================ RINGKASAN AKTIVITAS */
  var rentangBulan = 6;
  var tampilTabel = false;

  var SERI = [
    { nama: 'Jasa kebersihan', warna: Chart.WARNA.s1 },
    { nama: 'Toko perlengkapan', warna: Chart.WARNA.s2 }
  ];

  function specBulanan() {
    var bulan = BIZ.ringkasanBulanan(me().id, rentangBulan);
    return {
      seri: SERI, satuan: U.rp,
      judulA11y: I18N.t('Pengeluaran per bulan, dipisah jasa kebersihan dan toko perlengkapan'),
      /* Grafik ini SUDAH berada di halaman aktivitas, jadi tidak ada halaman
         lain yang perlu dituju — sumbernya cukup disebutkan. Tautan yang
         mengarah ke halaman yang sedang dibuka hanya membuat orang mengira
         kliknya tidak berfungsi. */
      sumber: { teks: I18N.t('Tanggal Anda memesan layanan dan membeli ' +
        'produk, dijumlahkan per bulan. Yang dipakai adalah tanggal ' +
        'pesanannya, bukan tanggal pembayaran.') },
      data: bulan.map(function (b) {
        return { label: b.label, sub: String(b.tahun).slice(2), values: [b.jasa, b.toko] };
      })
    };
  }

  function renderAktivitas() {
    var bulan = BIZ.ringkasanBulanan(me().id, rentangBulan);
    var totJasa = U.sum(bulan, function (b) { return b.jasa; });
    var totToko = U.sum(bulan, function (b) { return b.toko; });
    var nJasa = U.sum(bulan, function (b) { return b.nJasa; });
    var nToko = U.sum(bulan, function (b) { return b.nToko; });
    var adaData = totJasa + totToko > 0;
    var aktif = bulan.filter(function (b) { return b.total > 0; }).length;

    var specKol = specBulanan();
    var layanan = BIZ.layananTerbanyak(me().id, 5);
    var produk = BIZ.produkTerbanyak(me().id, 5);

    var specLayanan = {
      sumber: { teks: I18N.t('Seluruh pesanan layanan Anda pada rentang ' +
        'ini, dijumlahkan menurut NILAI pekerjaannya — bukan menurut berapa ' +
        'kali dipesan. Lima teratas yang digambar.') },
      data: layanan.map(function (l) {
        return { nama: l.nama, icon: l.icon, nilai: l.nilai,
          ket: l.jumlah + '× dipesan' }; }),
      warna: Chart.WARNA.s1, satuan: U.rp, kolomNama: 'Layanan', kolomKet: 'Dipesan',
      ikonKosong: '🧹', judulKosong: I18N.t('Belum ada layanan dipesan'),
      tksKosong: I18N.t('Grafik ini terisi setelah Anda memesan layanan pertama.')
    };
    var specProduk = {
      sumber: { teks: I18N.t('Seluruh pembelian produk Anda pada rentang ' +
        'ini, dijumlahkan menurut nilai pembeliannya. Lima teratas yang ' +
        'digambar.') },
      data: produk.map(function (p) {
        return { nama: p.nama, icon: p.icon, nilai: p.nilai,
          ket: U.num(p.qty) + ' ' + p.satuan + ' dibeli' }; }),
      warna: Chart.WARNA.s2, satuan: U.rp, kolomNama: 'Produk', kolomKet: 'Dibeli',
      ikonKosong: '🛒', judulKosong: I18N.t('Belum ada produk dibeli'),
      tksKosong: I18N.t('Buka menu Toko Perlengkapan untuk melihat katalog alat & chemical.')
    };

    return '' +
    /* satu baris filter di atas semua grafik — bukan filter per kartu */
    '<div class="row wrap mb-3" style="gap:8px">' +
      UI.tabs([{ key: '6', label: '6 bulan' }, { key: '12', label: '12 bulan' }],
        String(rentangBulan), 'tab-rentang') +
      '<div class="spacer"></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="toggle-tabel">' +
        (tampilTabel ? '▦ Tampilkan grafik' : '☰ Tampilkan tabel') + '</button>' +
    '</div>' +

    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Total belanja') + ' ' + rentangBulan + ' bulan', small: true,
        valueHTML: U.rp(totJasa + totToko), icon: '💳',
        meta: aktif ? I18N.t('aktif di') + ' ' + aktif + ' dari ' + rentangBulan + ' bulan' : I18N.t('belum ada transaksi') }) +
      UI.stat({ label: I18N.t('Pesanan layanan'), value: nJasa, icon: '🧹',
        meta: totJasa ? U.rpShort(totJasa) : I18N.t('belum ada') }) +
      UI.stat({ label: I18N.t('Pembelian produk'), value: nToko, icon: '🛒',
        meta: totToko ? U.rpShort(totToko) : I18N.t('belum ada') }) +
      UI.stat({ label: 'Rata-rata per bulan', small: true,
        valueHTML: U.rpShort(Math.round((totJasa + totToko) / rentangBulan)), icon: '📅',
        meta: I18N.t('dari') + ' ' + rentangBulan + ' bulan terakhir' }) +
    '</div>' +

    UI.card({ cls: 'mb-3', title: 'Pengeluaran per bulan',
      sub: I18N.t('Dihitung dari tanggal Anda memesan layanan dan membeli produk'),
      body: adaData
        ? (tampilTabel ? Chart.tabel(Object.assign({ tipe: 'kolom' }, specKol))
                       : Chart.kolom(specKol))
        : UI.empty('📈', I18N.t('Belum ada aktivitas'),
            I18N.t('Grafik ini terisi otomatis begitu Anda memesan layanan atau berbelanja di toko.')) }) +

    '<div class="grid g-2">' +
      UI.card({ title: 'Layanan paling sering dipesan', sub: I18N.t('Berdasarkan nilai pekerjaan'),
        body: tampilTabel && layanan.length ? Chart.tabel(specLayanan) : Chart.batang(specLayanan) }) +
      UI.card({ title: I18N.t('Produk paling sering dibeli'), sub: 'Berdasarkan nilai pembelian',
        body: tampilTabel && produk.length ? Chart.tabel(specProduk) : Chart.batang(specProduk) }) +
    '</div>' +

    (adaData ? '<div class="tbl-sub mt-3">' + I18N.t('Arahkan kursor ke sebuah kolom untuk melihat rinciannya.') + ' ' +
      I18N.t('Semua angka juga tersedia lewat tombol') + ' <b>Tampilkan tabel</b> ' + I18N.t('di atas.') + '</div>' : '');
  }

  /* ================================================================ PESAN LAYANAN */
  var keranjang = [];
  var draft = { alamat: null, tgl: null, jam: '08:00', catatan: '' };

  /** Simpan isian form sebelum halaman digambar ulang. */
  function simpanDraft() {
    if (!U.$('#alamat')) return;
    draft.alamat = U.$('#alamat').value;
    draft.tgl = U.$('#tgl').value;
    draft.jam = U.$('#jam').value;
    draft.catatan = U.$('#catatan').value;
  }

  /* ================================================================ CARI LAYANAN
     Katalog layanan tumbuh menjadi 22 kelompok dan ratusan varian, sehingga
     menggulung daftar sampai ketemu sudah tidak masuk akal. Bentuk bilahnya
     sengaja sama persis dengan katalog produk — pembeli yang sudah hafal letak
     "Urutkan" di satu katalog akan mencarinya di tempat yang sama di sini. */
  var URUT_LAYANAN = [
    { v: 'sesuai', l: 'Paling sesuai' },
    { v: 'nama',   l: 'Nama A–Z' },
    { v: 'murah',  l: 'Harga terendah' },
    { v: 'mahal',  l: 'Harga tertinggi' }
  ];
  var F_JENIS = [
    { v: 'semua',   l: 'Semua jenis' },
    { v: 'layanan', l: 'Layanan satuan' },
    { v: 'paket',   l: 'Paket berlangganan' }
  ];
  var F_TARIF = [
    { v: 'semua',  l: 'Semua tarif' },
    { v: 'pasti',  l: 'Ada harga pasti' },
    { v: 'survei', l: 'Perlu survei' }
  ];

  var cariSvc = '', urutSvc = 'sesuai', fKat = 'semua', fJenis = 'semua', fTarif = 'semua';

  function layananAktif() {
    return DB.all('services').filter(function (s) { return s.aktif !== false; });
  }
  function kategoriLayanan() {
    var out = [];
    layananAktif().forEach(function (s) {
      if (s.kategori && out.indexOf(s.kategori) < 0) out.push(s.kategori); });
    out.sort();
    /* Paket berlangganan tetap di paling bawah seperti sebelumnya — ia bukan
       jenis pekerjaan, melainkan cara berlangganan pekerjaan yang lain. */
    var i = out.indexOf('Paket Berlangganan');
    if (i >= 0) out.push(out.splice(i, 1)[0]);
    return out;
  }
  function filterSvcAktif() {
    return !!(cariSvc || urutSvc !== 'sesuai' || fKat !== 'semua' ||
      fJenis !== 'semua' || fTarif !== 'semua');
  }

  function layananTampil() {
    var q = cariSvc.toLowerCase().trim();
    var hasil = layananAktif().filter(function (s) {
      if (fKat !== 'semua' && s.kategori !== fKat) return false;
      if (fJenis !== 'semua' && s.tipe !== fJenis) return false;
      if (fTarif === 'pasti' && (s.survei || s.hargaMin === null)) return false;
      if (fTarif === 'survei' && !(s.survei || s.hargaMin === null)) return false;
      if (q && (s.nama + ' ' + (s.kategori || '') + ' ' + (s.satuan || '') + ' ' +
        (s.ket || '') + ' ' + (s.kode || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    /* Layanan bersurvei tidak punya angka; ditaruh di belakang saat mengurutkan
       harga supaya deretan angka di layar tetap runtut. */
    function harga(s) {
      return (s.survei || s.hargaMin === null) ? null : s.hargaMin;
    }
    if (urutSvc === 'nama') return U.sortBy(hasil, function (s) { return (s.nama || '').toLowerCase(); });
    if (urutSvc === 'murah' || urutSvc === 'mahal') {
      var berharga = hasil.filter(function (s) { return harga(s) !== null; });
      var tanpa = hasil.filter(function (s) { return harga(s) === null; });
      return U.sortBy(berharga, harga, urutSvc === 'mahal').concat(tanpa);
    }
    return U.sortBy(hasil, function (s) { return s.urutan; });
  }

  function renderPesan() {
    var list = layananTampil();
    var menyaring = filterSvcAktif();

    /* Tanpa penyaringan, daftar tetap dikelompokkan per kategori seperti
       semula — itu cara terbaik menelusuri katalog yang belum dipersempit.
       Begitu ada kata kunci atau penyaring, kelompoknya dilepas: yang dicari
       pengguna adalah hasilnya, bukan tempat hasil itu bernaung. */
    var isi = menyaring
      ? (list.length
          ? '<div class="grid g-2">' + list.map(kartuLayanan).join('') + '</div>'
          : UI.empty('🔍', I18N.t('Layanan tidak ditemukan'),
              I18N.t('Coba kata kunci lain, atau longgarkan penyaringnya.') + ' ' +
              I18N.t('Pencarian menjangkau nama layanan, kategori, dan satuannya.')))
      : kategoriLayanan().map(function (k) {
          var grup = list.filter(function (s) { return s.kategori === k; });
          if (!grup.length) return '';
          return '<div class="nav-group" style="color:var(--muted);padding:16px 0 8px">' + U.esc(k) + '</div>' +
            '<div class="grid g-2">' + grup.map(kartuLayanan).join('') + '</div>';
        }).join('');

    return '<div class="grid g-2-1">' +
      '<div>' +
        UI.alert('brand', '<b>' + I18N.t('Pilih layanan yang Anda butuhkan.') + '</b> ' + I18N.t('Estimasi harga muncul otomatis.') + ' ' +
          I18N.t('Untuk layanan bertanda') + ' <i>perlu survei</i>' + I18N.t(', tim kami akan datang mengukur lokasi — gratis dan tidak mengikat.'), '🧭') +

        kartuPesanLagi() +

        UI.bilahCari({
          cari: { id: 'cari-layanan', nilai: cariSvc, act: 'cari-svc',
                  placeholder: I18N.t('Cari layanan — mis. karpet, AC, taman…') },
          kontrol: [
            { label: I18N.t('Urutkan'), nilai: urutSvc, act: 'urut-svc', opsi: URUT_LAYANAN },
            { label: I18N.t('Kategori'), nilai: fKat, act: 'f-kat',
              opsi: [{ v: 'semua', l: I18N.t('Semua kategori') }].concat(
                kategoriLayanan().map(function (k) { return { v: k, l: k }; })) },
            { label: I18N.t('Jenis'), nilai: fJenis, act: 'f-jenis', opsi: F_JENIS },
            { label: I18N.t('Tarif'), nilai: fTarif, act: 'f-tarif', opsi: F_TARIF }
          ],
          aktif: menyaring, resetAct: 'reset-svc',
          hasil: list.length, satuanHasil: 'layanan'
        }) +

        '<div id="katalog">' + isi + '</div>' +
      '</div>' +
      '<div><div id="ringkas" style="position:sticky;top:78px">' + ringkasan() + '</div></div>' +
    '</div>';
  }

  /* ============================================================ PESAN LAGI
     Pekerjaan kebersihan hampir selalu berulang — cuci sofa tiap beberapa
     bulan, perawatan AC tiap kuartal. Tanpa jalan pintas ini, pelanggan
     lama harus menelusuri katalog dan mengingat sendiri layanan mana yang
     dulu dipesan, padahal jawabannya sudah tersimpan di riwayatnya. */

  var BATAS_PESAN_LAGI = 4;

  /**
   * Riwayat yang bisa dipesan ulang: permintaan DAN pekerjaan.
   *
   * Tidak semua pekerjaan lahir dari permintaan yang diajukan sendiri oleh
   * klien — sebagian dibuatkan admin setelah survei atau kesepakatan lisan.
   * Bila kartu ini hanya membaca tabel permintaan, pelanggan lama justru
   * tidak menemukan pekerjaan yang paling sering mereka ulang.
   */
  function riwayatPermintaan() {
    var u = me();
    var dariPermintaan = DB.where('bookings', function (b) {
      return b.clientId === u.id && (b.items || []).length;
    }).map(function (b) {
      return { tipe: 'booking', id: b.id, no: b.no, at: b.createdAt,
        serviceIds: (b.items || []).map(function (i) { return i.serviceId; }) };
    });

    /* Pekerjaan yang jejaknya sampai ke permintaan di atas tidak ditampilkan
       dua kali — isinya sama, dan dua baris kembar hanya membuat pelanggan
       ragu mana yang benar. */
    var sudah = {};
    dariPermintaan.forEach(function (r) { sudah[r.serviceIds.slice().sort().join('|')] = true; });

    var dariOrder = BIZ.ordersUntuk(u).filter(function (o) {
      return (o.serviceIds || []).length &&
        !sudah[(o.serviceIds || []).slice().sort().join('|')];
    }).map(function (o) {
      return { tipe: 'order', id: o.id, no: o.no, at: o.createdAt || o.tgl,
        serviceIds: o.serviceIds || [] };
    });

    /* Riwayat yang memuat layanan yang SUDAH DIMATIKAN admin tidak
       ditawarkan lagi. Pekerjaan lamanya tetap ada di Pekerjaan Saya — yang
       dihentikan hanya jalan pintas memesannya kembali, karena layanan itu
       memang tidak dijual lagi. Menawarkannya berarti mengundang pesanan
       yang akan ditolak setelah pelanggan menunggu. */
    function masihDijual(r) {
      return (r.serviceIds || []).length && (r.serviceIds || []).every(function (id) {
        var s = BIZ.svc(id);
        return s && s.aktif !== false;
      });
    }

    return U.sortBy(dariPermintaan.concat(dariOrder).filter(masihDijual),
      function (r) { return r.at; }, true).slice(0, BATAS_PESAN_LAGI);
  }

  function kartuPesanLagi() {
    var riwayat = riwayatPermintaan();
    if (!riwayat.length) return '';

    return UI.card({
      title: I18N.t('Pesan Lagi'), sub: I18N.t('Ulangi permintaan yang pernah Anda buat'), flush: true,
      body: '<div class="mini-list" style="margin:0">' + riwayat.map(function (r) {
        var nama = r.serviceIds.map(function (id) {
          var s = BIZ.svc(id);
          return s ? s.nama : null;
        }).filter(Boolean);
        return '<div class="mini-item">' +
          '<div style="min-width:0;flex:1">' +
            '<b style="font-size:12.6px">' + U.esc(nama.slice(0, 2).join(', ') || 'Layanan') +
              (nama.length > 2 ? ' <span class="tbl-sub">+' + (nama.length - 2) + ' lagi</span>' : '') + '</b>' +
            '<div class="tbl-sub">' + U.esc(r.no) + ' • ' + U.tglPendek(r.at) + '</div>' +
          '</div>' +
          '<div class="right"><button class="btn btn--soft btn--sm" ' +
            'data-act="' + (r.tipe === 'order' ? 'pesan-lagi-order' : 'pesan-lagi') + '" ' +
            'data-id="' + r.id + '">' + I18N.t('🔁 Pesan Lagi') + '</button></div>' +
          '</div>';
      }).join('') + '</div>'
    }) + '<div class="mb-3"></div>';
  }

  /**
   * Salin layanan sebuah permintaan lama ke keranjang.
   *
   * Yang disalin hanya layanan, jumlah, catatan per layanan, dan alamatnya.
   * TANGGAL sengaja tidak ikut: tanggal permintaan lama sudah lewat, dan
   * mengisikannya kembali hanya melahirkan permintaan bertanggal mundur yang
   * harus dikoreksi admin. Harga juga tidak disalin — estimasi selalu
   * dihitung ulang dari tarif yang berlaku sekarang.
   */
  function pesanLagi(bookingId) {
    var b = DB.find('bookings', bookingId);
    if (!b) { UI.toast(I18N.t('Permintaan tidak ditemukan'), 'err'); return; }
    ulangLayanan(b.no, b.items || [], b.alamat);
  }

  /**
   * Pesan ulang dari sebuah PEKERJAAN yang sudah berjalan atau selesai.
   *
   * Order hanya menyimpan daftar serviceIds tanpa jumlah. Bila order itu
   * masih bisa dilacak ke permintaan asalnya (order → penawaran → permintaan),
   * jumlah dan catatan diambil dari sana — itu angka yang benar-benar pernah
   * dipesan pelanggan. Kalau jejaknya putus, barulah dipakai 1 per layanan;
   * lebih baik pelanggan menaikkan sendiri angkanya daripada kami menebak.
   */
  function pesanLagiOrder(orderId) {
    var o = BIZ.order(orderId);
    if (!o) { UI.toast(I18N.t('Pekerjaan tidak ditemukan'), 'err'); return; }

    var items = null;
    if (o.quotationId) {
      var q = DB.find('quotations', o.quotationId);
      var b = q && q.bookingId ? DB.find('bookings', q.bookingId) : null;
      if (b && (b.items || []).length) items = b.items;
    }
    if (!items) {
      items = (o.serviceIds || []).map(function (id) {
        return { serviceId: id, qty: 1, catatan: '' };
      });
    }
    ulangLayanan(o.no, items, o.alamat);
  }

  function ulangLayanan(nomorSumber, items, alamatSumber) {
    var masuk = [], lewat = [];
    (items || []).forEach(function (i) {
      var s = BIZ.svc(i.serviceId);
      if (!s || s.aktif === false) { lewat.push(s ? s.nama : 'Layanan lama'); return; }
      masuk.push({ svc: s, qty: i.qty || 1, catatan: i.catatan || '' });
    });

    if (!masuk.length) {
      UI.modal({
        title: I18N.t('Layanan sudah tidak tersedia'), size: 'narrow',
        body: UI.alert('warn', I18N.t('Layanan pada') + ' <b>' + U.esc(nomorSumber) + '</b> ' + I18N.t('sudah tidak ada') + ' ' +
          I18N.t('di katalog kami. Silakan pilih layanan lain — atau hubungi admin bila Anda') + ' ' +
          I18N.t('membutuhkan pekerjaan yang sama.'), '🧹'),
        foot: '<div class="spacer"></div><button class="btn" data-close>' + I18N.t('Tutup') + '</button>'
      });
      return;
    }

    var adaIsi = keranjang.length > 0;
    UI.modal({
      title: I18N.t('Pesan lagi') + ' ' + nomorSumber, size: 'narrow',
      sub: masuk.length + ' ' + I18N.t('layanan akan dimasukkan'),
      body:
        '<div class="mini-list" style="margin:0 -18px">' + masuk.map(function (m) {
          return '<div class="mini-item"><div style="min-width:0;flex:1">' +
            '<b style="font-size:12.6px">' + U.esc(m.svc.nama) + '</b>' +
            (m.catatan ? '<div class="tbl-sub">' + U.esc(m.catatan) + '</div>' : '') +
            '</div><div class="right"><b>' + m.qty + ' ' + U.esc(m.svc.satuan) + '</b></div></div>';
        }).join('') + '</div>' +
        (lewat.length
          ? '<div class="mt-2">' + UI.alert('warn', '<b>' + lewat.length + ' ' + I18N.t('layanan') + '</b> tidak ' +
              I18N.t('dimasukkan karena sudah tidak ada di katalog:') + ' ' + U.esc(lewat.join(', ')) + '.', '⚠️') + '</div>'
          : '') +
        '<div class="mt-2">' + UI.alert('info', I18N.t('Tarif mengikuti daftar harga') + ' <b>' + I18N.t('yang berlaku') + ' ' +
          I18N.t('sekarang') + '</b>' + I18N.t(', bukan harga permintaan lama. Tanggal pengerjaan tetap Anda pilih sendiri.'), '💡') + '</div>' +
        (adaIsi
          ? '<div class="mt-2">' + UI.alert('brand', I18N.t('Keranjang Anda sudah berisi') + ' ' + keranjang.length +
              ' ' + I18N.t('layanan. Yang di atas akan') + ' <b>ditambahkan</b>.', '🧺') + '</div>'
          : ''),
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
            '<button class="btn" data-act="ok-ulang">' + I18N.t('Masukkan ke Permintaan') + '</button>',
      actions: {
        'ok-ulang': function (el) {
          masuk.forEach(function (m) {
            var ada = keranjang.filter(function (k) { return k.serviceId === m.svc.id; })[0];
            if (ada) { ada.qty += m.qty; if (!ada.catatan) ada.catatan = m.catatan; }
            else keranjang.push({ serviceId: m.svc.id, qty: m.qty, catatan: m.catatan });
          });
          /* Alamat ikut, tanggal tidak. Alamat pekerjaan berulang hampir
             selalu sama, sedangkan tanggalnya pasti berbeda. */
          if (alamatSumber) draft.alamat = alamatSumber;
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(masuk.length + ' ' + I18N.t('layanan masuk ke permintaan'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  function kartuLayanan(s) {
    var on = keranjang.some(function (k) { return k.serviceId === s.id; });
    /* Keahlian selalu "mulai dari": tarifnya berbeda per jenis pekerjaan,
       dan menampilkan rentang membuat yang termahal terlihat sebagai harga
       yang pasti padahal klien belum memilih apa pun. */
    var keahlian = window.KEAHLIAN && KEAHLIAN.adalah(s);
    var harga = keahlian
      ? 'mulai ' + U.rp(KEAHLIAN.tarifTerendah(s))
      : (s.survei || s.hargaMin === null ? 'Perlu survei'
          : (s.hargaMax ? U.rp(s.hargaMin) + ' – ' + U.rp(s.hargaMax) : 'mulai ' + U.rp(s.hargaMin)));
    return '<div class="svc-card' + (on ? ' on' : '') + '">' +
      '<button class="svc-card__bagi" data-act="bagikan-layanan" data-id="' + s.id +
        '" title="Bagikan layanan ini">🔗</button>' +
      '<div class="svc-card__klik" data-act="pilih" data-id="' + s.id + '"></div>' +
      '<div class="ic">' + (s.icon || s.ikon || '🧹') + '</div>' +
      '<div style="min-width:0"><b>' + U.esc(s.nama) + '</b>' +
      '<div class="price">' + harga + ' <span class="unit">' + (s.survei ? '' : '/ ' + U.esc(s.satuan)) + '</span></div>' +
      (s.k3 ? '<span class="chip chip--warn mt-1" style="font-size:10px">' + I18N.t('⚠️ Pekerjaan ketinggian — SOP K3') + '</span>' : '') +
      '</div>' +
      /* Layanan berharga tetap bisa langsung dipesan tanpa menunggu survei.
         Tombolnya berdiri sendiri supaya tidak tertukar dengan menambahkan
         ke daftar permintaan survei — dua hal yang berbeda hasilnya. */
      (window.KEAHLIAN && KEAHLIAN.adalah(s) && KEAHLIAN.menu(s).length
        ? '<button class="svc-card__pesan" data-act="pesan-keahlian" data-id="' + s.id +
          '">' + I18N.t('Pesan') + '</button>'
        : (window.PESAN && PESAN.bisaLangsung(s)
            ? '<button class="svc-card__pesan" data-act="pesan-langsung" data-id="' + s.id +
              '">' + I18N.t('Pesan') + '</button>'
            : '')) +
      '<div style="margin-left:auto;font-size:17px;color:' + (on ? 'var(--brand)' : 'var(--muted-2)') + '">' +
        (on ? '✓' : '＋') + '</div>' +
      '</div>';
  }

  function ringkasan() {
    var est = BIZ.estimasi(keranjang);
    var u = me();
    return UI.card({
      title: 'Ringkasan Permintaan', sub: keranjang.length + ' layanan dipilih',
      body:
        (keranjang.length ? keranjang.map(function (k) {
          var s = BIZ.svc(k.serviceId);
          return '<div style="padding:10px 0;border-bottom:1px solid var(--line-2)">' +
            '<div class="row"><b style="font-size:12.8px">' + U.esc(s.nama) + '</b>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn--ghost btn--sm btn--icon" data-act="buang" data-id="' + s.id + '" title="Hapus">✕</button></div>' +
            '<div class="row mt-1">' +
              '<input class="input" type="number" min="1" step="any" style="width:100px" value="' + k.qty +
                '" data-change="qty" data-id="' + s.id + '">' +
              '<span class="tbl-sub">' + U.esc(s.satuan) + '</span>' +
              '<div class="spacer"></div>' +
              '<span class="tbl-sub">' + (s.survei || s.hargaMin === null ? 'perlu survei'
                : U.rp(s.hargaMin * k.qty) + (s.hargaMax ? ' – ' + U.rp(s.hargaMax * k.qty) : '')) + '</span>' +
            '</div>' +
            '<input class="input mt-1" style="font-size:12px" placeholder="Catatan (mis. lantai 3, ruang meeting)" ' +
              'value="' + U.esc(k.catatan || '') + '" data-change="cat" data-id="' + s.id + '">' +
            '</div>';
        }).join('') : '<div class="tbl-sub" style="padding:8px 0">' + I18N.t('Belum ada layanan dipilih.') + '</div>') +

        '<div class="row mt-3" style="align-items:flex-end">' +
          '<div><div class="tbl-sub">' + I18N.t('Estimasi harga') + '</div>' +
          '<div style="font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--brand-dark)">' +
            BIZ.teksEstimasi(est) + '</div></div>' +
        '</div>' +
        (est.perluSurvei.length ? '<div class="tbl-sub mt-1">' + est.perluSurvei.length +
          ' ' + I18N.t('layanan perlu survei lokasi untuk harga pastinya.') + '</div>' : '') +

        '<div class="field mt-3"><label>' + I18N.t('Alamat lokasi') + ' <span class="req">*</span></label>' +
          '<textarea class="textarea" id="alamat" rows="2">' +
            U.esc(draft.alamat !== null ? draft.alamat : (u.alamat || '')) + '</textarea></div>' +
        '<div class="inline-2">' +
          '<div class="field"><label>' + I18N.t('Tanggal diharapkan') + ' <span class="req">*</span></label>' +
            '<input class="input" type="date" id="tgl" min="' + U.today() + '" value="' +
              U.esc(draft.tgl || U.iso(U.addDays(new Date(), 3))) + '"></div>' +
          '<div class="field"><label>Perkiraan jam mulai</label>' +
            '<input class="input" type="time" id="jam" value="' + U.esc(draft.jam || '08:00') + '"></div>' +
        '</div>' +
        '<div class="field"><label>Catatan tambahan</label>' +
          '<textarea class="textarea" id="catatan" rows="2" placeholder="mis. pengerjaan di luar jam kerja, ada akses khusus, dll">' +
          U.esc(draft.catatan || '') + '</textarea></div>',
      foot: '<button class="btn btn--block btn--lg" data-act="kirim-permintaan"' +
        (keranjang.length ? '' : ' disabled') + '>' + I18N.t('Kirim Permintaan') + '</button>'
    }) +
    '<div class="tbl-sub mt-2" style="text-align:center">' + I18N.t('Estimasi bersifat perkiraan. Harga final ditetapkan') + ' ' +
    I18N.t('setelah survei &amp; tertuang dalam penawaran resmi.') + '</div>';
  }

  /* ================================================================ ORDER SAYA */
  var filterOrder = 'semua';

  function renderOrder() {
    var all = orderSaya();
    var f = {
      semua: all,
      aktif: all.filter(function (o) { return ['dijadwalkan', 'berjalan', 'selesai', 'perbaikan'].indexOf(o.status) >= 0; }),
      selesai: all.filter(function (o) { return o.status === 'diverifikasi'; })
    };
    var list = f[filterOrder] || all;

    return UI.tabs([
      { key: 'semua', label: I18N.t('Semua'), n: all.length },
      { key: 'aktif', label: I18N.t('Aktif'), n: f.aktif.length },
      { key: 'selesai', label: I18N.t('Selesai'), n: f.selesai.length }
    ], filterOrder, 'tab-order') +
    (list.length ? list.map(kartuOrder).join('')
      : UI.empty('📋', I18N.t('Tidak ada pekerjaan di kategori ini'), I18N.t('Coba pilih tab lain atau ajukan permintaan baru.')));
  }

  /* ================================================================ PENAWARAN */
  function renderPenawaran() {
    var list = penawaranSaya();
    return UI.card({
      title: I18N.t('Penawaran Harga'), sub: I18N.t('Penawaran resmi dari EXOCLEAN'), flush: true,
      body: UI.table([
        { h: I18N.t('No. Penawaran'), r: function (q) {
          return '<div class="code">' + U.esc(q.no) + '</div><div class="tbl-sub">' +
            (q.items || []).length + ' item • dikirim ' + (q.dikirimAt ? U.tgl(q.dikirimAt) : '—') + '</div>'; } },
        { h: I18N.t('Uraian'), r: function (q) { return '<div class="tbl-title">' +
            U.esc(U.potong((q.items[0] || {}).desc || '-', 46)) + '</div>'; } },
        { h: I18N.t('Berlaku s/d'), r: function (q) {
          var lewat = U.diffDays(new Date(), q.berlakuHingga) > 0;
          return U.tgl(q.berlakuHingga) + (lewat && q.status === 'terkirim'
            ? '<div class="tbl-sub" style="color:var(--danger)">kedaluwarsa</div>' : ''); } },
        { h: I18N.t('Total'), cls: 'num', r: function (q) { return '<b>' + U.rp(BIZ.totalQuotation(q)) + '</b>'; } },
        { h: I18N.t('Status'), r: function (q) { return UI.statusChip('quotation', q.status); } },
        { h: '', cls: 'act', r: function (q) {
          return '<button class="btn btn--ghost btn--sm" data-act="lihat-quo" data-id="' + q.id + '">' + I18N.t('Lihat') + '</button>' +
            (q.status === 'terkirim' ? ' <button class="btn btn--sm" data-act="setuju-quo" data-id="' + q.id +
              '">' + I18N.t('Setujui') + '</button>' : ''); } }
      ], list, { icon: '📄', judul: I18N.t('Belum ada penawaran'), teks: I18N.t('Penawaran akan muncul di sini setelah tim kami memprosesnya.') })
    });
  }

  /* ================================================================ TAGIHAN */
  function renderTagihan() {
    var list = tagihanSaya();
    var belum = list.filter(function (i) { return i.status !== 'lunas'; });
    return '<div class="grid g-3 mb-3">' +
      UI.stat({ label: I18N.t('Total tagihan berjalan'), small: true, valueHTML: U.rp(U.sum(belum, function (i) { return BIZ.sisaTagihan(i); })),
        icon: '🧾', meta: belum.length + ' ' + I18N.t('invoice belum lunas') }) +
      UI.stat({ label: I18N.t('Sudah dibayar tahun ini'), small: true,
        valueHTML: U.rp(U.sum(list, function (i) { return BIZ.terbayar(i); })), icon: '✅', meta: I18N.t('akumulasi pembayaran') }) +
      UI.stat({ label: 'Jatuh tempo terdekat', small: true,
        valueHTML: belum.length ? U.tgl(U.sortBy(belum, function (i) { return i.jatuhTempo; })[0].jatuhTempo) : '—',
        icon: '📆', meta: belum.length ? U.relatif(U.sortBy(belum, function (i) { return i.jatuhTempo; })[0].jatuhTempo) : I18N.t('tidak ada') }) +
    '</div>' +
    UI.card({ title: 'Daftar Invoice', flush: true, body: UI.table([
      { h: 'No. Invoice', r: function (i) { return '<div class="code">' + U.esc(i.no) + '</div>' +
        '<div class="tbl-sub">' + I18N.t('Terbit') + ' ' + U.tgl(i.terbitAt) + '</div>'; } },
      { h: 'Untuk', r: function (i) { var s = BIZ.sumberInvoice(i);
        return '<div class="tbl-title">' + (s.tipe === 'toko' ? '🛒 ' : '🧹 ') + U.esc(U.potong(s.judul, 40)) + '</div>' +
          '<div class="tbl-sub">' + U.esc(s.no) + '</div>'; } },
      { h: I18N.t('Jatuh tempo'), r: function (i) { return U.tgl(i.jatuhTempo) +
        '<div class="tbl-sub">' + U.relatif(i.jatuhTempo) + '</div>'; } },
      { h: I18N.t('Total'), cls: 'num', r: function (i) { return '<b>' + U.rp(i.total) + '</b>' +
        (BIZ.terbayar(i) ? '<div class="tbl-sub">' + I18N.t('sisa') + ' ' + U.rp(BIZ.sisaTagihan(i)) + '</div>' : ''); } },
      { h: I18N.t('Status'), r: function (i) { return UI.statusChip('invoice', i.status); } },
      { h: '', cls: 'act', r: function (i) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-inv" data-id="' + i.id + '">' + I18N.t('Lihat') + '</button>';
        if (i.status !== 'lunas') {
          var tx = PAY.txAktif(i.id);
          b += tx
            ? ' <button class="btn btn--sm" data-act="lanjut-bayar" data-id="' + tx.id + '">' + I18N.t('Lanjutkan Pembayaran') + '</button>'
            : ' <button class="btn btn--sm" data-act="bayar-online" data-id="' + i.id + '">💳 Bayar</button>';
        }
        return b; } }
    ], list, { icon: '🧾', judul: I18N.t('Belum ada tagihan'), teks: I18N.t('Invoice terbit setelah pekerjaan selesai diverifikasi.') }) });
  }

  /* ================================================================ PENILAIAN */
  function renderPenilaian() {
    var orders = orderSaya().filter(function (o) { return ['diverifikasi', 'selesai'].indexOf(o.status) >= 0; });
    var komplain = DB.where('complaints', { clientId: me().id });

    return '<div class="grid g-2-1">' +
      UI.card({ title: 'Beri Penilaian', sub: I18N.t('Bantu kami menjaga mutu tim lapangan'), flush: true,
        body: orders.length ? '<div style="padding:14px 18px">' + orders.map(function (o) {
          var r = BIZ.ratingOrder(o.id);
          return '<div class="order-card"><div class="top"><div style="min-width:0;flex:1">' +
            '<h4>' + U.esc(o.judul) + '</h4>' +
            '<div class="meta"><span>' + U.esc(o.no) + '</span><span>' + U.tgl(o.tgl) + '</span></div>' +
            (r ? '<div class="mt-1">' + UI.stars(r.bintang) +
              (r.komentar ? '<div class="tbl-sub mt-1">“' + U.esc(r.komentar) + '”</div>' : '') + '</div>' : '') +
            '</div>' +
            '<div class="col" style="gap:6px">' +
            '<button class="btn btn--sm ' + (r ? 'btn--ghost' : '') + '" data-act="nilai" data-id="' + o.id + '">' +
              (r ? I18N.t('Ubah penilaian') : '★ Beri nilai') + '</button>' +
            (function () {
              /* Tombol tip hanya muncul bila memang bisa dipakai. Tombol yang
                 selalu ada lalu menolak saat ditekan mengajari orang untuk
                 berhenti menekannya. */
              var sudah = TIP.tipOrder(o.id).filter(function (x) { return x.status === 'lunas'; });
              if (sudah.length) {
                return '<div class="chip chip--ok" style="font-size:10.5px">💝 Tip ' +
                  U.rp(U.sum(sudah, function (x) { return x.jumlah; })) + ' ' + I18N.t('terkirim') + '</div>';
              }
              return TIP.boleh(o.id, me().id).ok
                ? '<button class="btn btn--soft btn--sm" data-act="tip" data-id="' + o.id +
                  '">💝 Beri tip</button>'
                : '';
            })() +
            '<button class="btn btn--ghost btn--sm" data-act="komplain" data-id="' + o.id + '">Ajukan komplain</button>' +
            '</div></div></div>';
        }).join('') + '</div>' : UI.empty('🌟', I18N.t('Belum ada pekerjaan selesai'), I18N.t('Penilaian bisa diberikan setelah pekerjaan diverifikasi.')) }) +

      UI.card({ title: 'Komplain & Garansi', flush: true,
        body: '<div style="padding:14px 18px">' +
          UI.alert('brand', '<b>Garansi pembersihan ulang.</b> ' + I18N.t('Bila hasil belum memuaskan, laporkan dalam 3 hari') + ' ' +
            I18N.t('setelah pekerjaan selesai — kami kerjakan ulang tanpa biaya tambahan.'), '🛡️') +
          (komplain.length ? komplain.map(function (c) {
            var o = BIZ.order(c.orderId);
            return '<div class="order-card mt-2"><div class="row">' + UI.statusChip('complaint', c.status) +
              '<div class="spacer"></div><span class="tbl-sub">' + U.sejak(c.at) + '</span></div>' +
              '<div class="tbl-sub mt-1">' + U.esc(o ? o.no : '') + '</div>' +
              '<p style="font-size:12.8px;margin:6px 0 0">' + U.esc(c.isi) + '</p></div>';
          }).join('') : '<div class="tbl-sub mt-2">' + I18N.t('Belum ada komplain yang diajukan.') + '</div>') +
        '</div>' })
    + '</div>';
  }

  /* ================================================================ AKSI */
  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  function aksi(root) {
    var map = {
      'ke-pesan': function () { APP.go('transaksi', { tab: 'layanan' }); },
      'ke-toko': function () { APP.go('toko'); },
      'ke-belanja': function () { APP.go('transaksi', { tab: 'toko' }); },
      /* Namanya SENGAJA berbeda dari 'detail-tk' milik toko.js.

         Halaman Transaksi memasang kedua peta aksi pada akar yang sama, dan
         U.delegate menambah satu pendengar per pemanggilan. Dengan nama yang
         sama, keduanya ikut terpanggil dan dialog detail terbuka DUA KALI,
         bertumpuk persis — yang di depan menutupi yang di belakang, sehingga
         tombol yang ada di salah satunya seolah-olah tidak pernah muncul. */
      'detail-toko-beranda': function (el) {
        var id = el.getAttribute('data-id');
        Panel.detailPesananToko(id, {
          foot: '<button class="btn btn--soft" data-act="ulang-dari-detail">🔁 Beli Lagi</button>',
          actions: {
            'ulang-dari-detail': function (b) {
              b.closest('.modal-back').remove(); document.body.style.overflow = '';
              Toko.beliLagi(id);
            }
          }
        });
      },
      'ke-order': function () { APP.go('order'); },
      'ke-penawaran': function () { APP.go('penawaran'); },
      'wa-admin': function () {
        var admin = BIZ.usersByRole('admin')[0];
        WA.chat(admin.telp, 'Halo EXOCLEAN, saya ' + me().nama +
          (me().perusahaan ? ' dari ' + me().perusahaan : '') + '. Saya ingin bertanya mengenai layanan kebersihan.');
      },
      detail: function (el) {
        var id = el.getAttribute('data-id');
        Panel.detailOrder(id, {
          foot: '<button class="btn btn--soft" data-act="ulang-dari-detail">' + I18N.t('🔁 Pesan Lagi') + '</button>',
          actions: {
            'ulang-dari-detail': function (b) {
              b.closest('.modal-back').remove(); document.body.style.overflow = '';
              pesanLagiOrder(id);
            }
          }
        });
      },
      'pesan-lagi-order': function (el, ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        pesanLagiOrder(el.getAttribute('data-id'));
      },

      /* --- cari, urutkan & filter katalog layanan --- */
      'cari-svc': function (el) {
        simpanDraft(); cariSvc = el.value; APP.refresh();
        UI.fokusCari(document, 'cari-layanan');
      },
      'urut-svc': function (el) { simpanDraft(); urutSvc = el.value; APP.refresh(); },
      'f-kat': function (el) { simpanDraft(); fKat = el.value; APP.refresh(); },
      'f-jenis': function (el) { simpanDraft(); fJenis = el.value; APP.refresh(); },
      'f-tarif': function (el) { simpanDraft(); fTarif = el.value; APP.refresh(); },
      'reset-svc': function () {
        simpanDraft();
        cariSvc = ''; urutSvc = 'sesuai'; fKat = 'semua'; fJenis = 'semua'; fTarif = 'semua';
        APP.refresh();
      },

      'pesan-lagi': function (el) { simpanDraft(); pesanLagi(el.getAttribute('data-id')); },

      /* --- katalog & keranjang --- */
      'pesan-langsung': function (el) {
        simpanDraft();
        APP.go('pesanLayanan', { id: el.getAttribute('data-id') });
      },
      'pesan-keahlian': function (el) {
        simpanDraft();
        APP.go('pesanKeahlian', { id: el.getAttribute('data-id') });
      },
      pilih: function (el) {
        simpanDraft();
        var id = el.getAttribute('data-id');
        var i = keranjang.findIndex(function (k) { return k.serviceId === id; });
        if (i >= 0) keranjang.splice(i, 1);
        else keranjang.push({ serviceId: id, qty: 1, catatan: '' });
        APP.refresh();
      },
      buang: function (el) {
        simpanDraft();
        var id = el.getAttribute('data-id');
        keranjang = keranjang.filter(function (k) { return k.serviceId !== id; });
        APP.refresh();
      },
      qty: function (el) {
        var id = el.getAttribute('data-id');
        keranjang.forEach(function (k) { if (k.serviceId === id) k.qty = Math.max(1, Number(el.value) || 1); });
        simpanDraft();
        var box = U.$('#ringkas');
        if (box) box.innerHTML = ringkasan();
      },
      cat: function (el) {
        var id = el.getAttribute('data-id');
        keranjang.forEach(function (k) { if (k.serviceId === id) k.catatan = el.value; });
      },
      'kirim-permintaan': function () {
        var alamat = U.$('#alamat').value.trim(), tgl = U.$('#tgl').value, catatan = U.$('#catatan').value.trim();
        var jam = U.$('#jam').value;
        if (!keranjang.length) { UI.toast(I18N.t('Pilih minimal satu layanan'), 'err'); return; }
        if (!alamat) { UI.toast(I18N.t('Alamat lokasi wajib diisi'), 'err'); return; }
        if (!tgl) { UI.toast(I18N.t('Tanggal diharapkan wajib diisi'), 'err'); return; }
        var b = BIZ.buatBooking(me().id, {
          alamat: alamat, tglHarapan: tgl,
          items: keranjang.map(function (k) { return { serviceId: k.serviceId, qty: k.qty, catatan: k.catatan }; }),
          catatan: (jam ? 'Perkiraan mulai ' + jam + '. ' : '') + catatan
        });
        keranjang = [];
        draft = { alamat: null, tgl: null, jam: '08:00', catatan: '' };
        UI.modal({
          title: 'Permintaan terkirim ✅', size: 'narrow',
          body: '<p>' + I18N.t('Nomor permintaan Anda:') + ' <b class="code">' + U.esc(b.no) + '</b></p>' +
            '<p style="font-size:13px;color:var(--ink-2)">' + I18N.t('Tim admin EXOCLEAN akan menghubungi Anda dalam 1×24 jam') + ' ' +
            I18N.t('untuk konfirmasi kebutuhan dan penjadwalan survei bila diperlukan.') + '</p>' +
            UI.alert('ok', I18N.t('Notifikasi konfirmasi otomatis sudah disiapkan dan akan dikirim ke WhatsApp Anda.'), '💬'),
          foot: '<button class="btn" data-close>' + I18N.t('Mengerti') + '</button>'
        });
        APP.go('beranda');
      },

      /* --- penawaran --- */
      'tab-order': function (el) { filterOrder = el.getAttribute('data-key'); APP.refresh(); },
      'tab-rentang': function (el) { rentangBulan = Number(el.getAttribute('data-key')); APP.refresh(); },
      'toggle-tabel': function () { tampilTabel = !tampilTabel; APP.refresh(); },
      'ke-aktivitas': function () { APP.go('aktivitas'); },
      'lihat-quo': function (el) { lihatQuotation(el.getAttribute('data-id')); },
      'setuju-quo': function (el) { setujuiQuotation(el.getAttribute('data-id')); },

      /* --- tagihan --- */
      'lihat-inv': function (el) {
        var inv = DB.find('invoices', el.getAttribute('data-id'));
        UI.modal({ title: 'Order Receipt ' + inv.no, size: 'wide', body: Panel.dokumenInvoice(inv),
          foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ Cetak / PDF</button>' +
                (inv.status !== 'lunas'
                  ? '<button class="btn btn--ghost" data-act="manual" data-id="' + inv.id + '">Unggah bukti transfer</button>' +
                    '<button class="btn" data-act="bayar" data-id="' + inv.id + '">💳 Bayar Sekarang</button>'
                  : '') +
                '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',
          actions: {
            bayar: function (e2) { tutupModal(e2); Bayar.pilihMetode(inv.id, APP.refresh); },
            manual: function (e2) { tutupModal(e2); konfirmasiBayar(inv.id); }
          } });
      },
      'bayar-online': function (el) { Bayar.pilihMetode(el.getAttribute('data-id'), APP.refresh); },
      'lanjut-bayar': function (el) { Bayar.halamanBayar(el.getAttribute('data-id'), APP.refresh); },
      bayar: function (el) { konfirmasiBayar(el.getAttribute('data-id')); },

      /* --- penilaian --- */
      nilai: function (el) { dialogRating(el.getAttribute('data-id')); },
      tip: function (el) { dialogTip(el.getAttribute('data-id')); },
      komplain: function (el) { dialogKomplain(el.getAttribute('data-id')); }
    };
    ViewAfiliasi.aksiBagikan(root);   /* tombol bagikan pada kartu layanan */
    U.delegate(root, map);
  }

  function lihatQuotation(qid) {
    var q = DB.find('quotations', qid);
    UI.modal({
      title: I18N.t('Penawaran') + ' ' + q.no, size: 'wide', body: Panel.dokumenQuotation(q),
      foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ Cetak / PDF</button>' +
        (q.status === 'terkirim'
          ? '<button class="btn btn--ghost" data-act="tolak">' + I18N.t('Tolak') + '</button>' +
            '<button class="btn" data-act="setuju">' + I18N.t('✓ Setujui Penawaran') + '</button>'
          : '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>'),
      actions: {
        setuju: function (el) { el.closest('.modal-back').remove(); document.body.style.overflow = ''; setujuiQuotation(qid); },
        tolak: function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.formModal({ title: I18N.t('Tolak penawaran') + ' ' + q.no, okText: I18N.t('Kirim'),
            fields: [{ name: 'alasan', label: I18N.t('Alasan (opsional)'), type: 'textarea',
              placeholder: I18N.t('mis. harga di atas anggaran, jadwal tidak cocok') }] })
            .then(function (d) {
              if (!d) return;
              BIZ.responQuotation(qid, false, d.alasan);
              UI.toast(I18N.t('Penawaran ditolak. Tim kami akan menghubungi Anda.'), 'ok');
              APP.refresh();
            });
        }
      }
    });
  }

  function setujuiQuotation(qid) {
    var q = DB.find('quotations', qid);
    UI.konfirm({ title: I18N.t('Setujui penawaran') + ' ' + q.no + '?',
      htmlText: I18N.t('Total') + ' <b>' + U.rp(BIZ.totalQuotation(q)) + '</b>. Setelah disetujui, admin EXOCLEAN akan ' +
        I18N.t('menjadwalkan pekerjaan dan mengirim konfirmasi jadwal ke WhatsApp Anda.'),
      okText: 'Ya, setujui' }).then(function (ya) {
      if (!ya) return;
      BIZ.responQuotation(qid, true);
      UI.toast(I18N.t('Penawaran disetujui. Menunggu penjadwalan dari admin.'), 'ok');
      APP.refresh();
    });
  }

  function konfirmasiBayar(invId) {
    var inv = DB.find('invoices', invId);
    var sisa = BIZ.sisaTagihan(inv);
    var fotoBukti = [];
    UI.modal({
      title: I18N.t('Konfirmasi Pembayaran'), sub: inv.no + ' • sisa ' + U.rp(sisa),
      body: UI.alert('brand', '<b>' + I18N.t('Rekening tujuan') + '</b><br>BCA 1234567890 a.n. PT EXOCLEAN Indonesia<br>' +
          'Cantumkan <b>' + U.esc(inv.no) + '</b> ' + I18N.t('pada berita transfer.'), '🏦') +
        '<form data-form class="mt-3">' +
        UI.field({ name: 'jumlah', label: I18N.t('Jumlah yang ditransfer'), type: 'number', value: sisa, required: true }) +
        UI.field({ name: 'metode', label: I18N.t('Metode'), type: 'select', value: 'Transfer BCA',
          options: ['Transfer BCA', 'Transfer Mandiri', 'Transfer BNI', 'QRIS', 'Tunai'] }) +
        UI.field({ name: 'ref', label: 'No. referensi / berita transfer', placeholder: 'mis. TRF/8891201' }) +
        '</form>' +
        '<div class="field"><label>Bukti transfer (opsional)</label><div id="bukti">' +
          UI.photoGrid([], { addAct: 'tambah-bukti', addLabel: 'Unggah bukti' }) + '</div></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
            '<button class="btn" data-act="simpan">' + I18N.t('Kirim Konfirmasi') + '</button>',
      actions: {
        'tambah-bukti': function (el) {
          UI.handleFotoInput(el, function (ids) {
            fotoBukti = fotoBukti.concat(ids);
            U.$('#bukti').innerHTML = UI.photoGrid(fotoBukti, { addAct: 'tambah-bukti', addLabel: 'Unggah bukti', delAct: 'hapus-bukti' });
          });
        },
        'hapus-bukti': function (el) {
          var id = el.getAttribute('data-id');
          fotoBukti = fotoBukti.filter(function (x) { return x !== id; });
          DB.delPhoto(id);
          U.$('#bukti').innerHTML = UI.photoGrid(fotoBukti, { addAct: 'tambah-bukti', addLabel: 'Unggah bukti', delAct: 'hapus-bukti' });
        },
        simpan: function (el) {
          var f = U.readForm(el.closest('.modal').querySelector('[data-form]'));
          if (!f.jumlah || f.jumlah <= 0) { UI.toast(I18N.t('Jumlah pembayaran tidak valid'), 'err'); return; }
          BIZ.catatPembayaran(invId, f.jumlah, f.metode, f.ref, fotoBukti[0] || null);
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(I18N.t('Konfirmasi pembayaran terkirim. Admin akan memverifikasi.'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  function dialogRating(orderId) {
    var o = BIZ.order(orderId), ada = BIZ.ratingOrder(orderId);
    var nilai = ada ? ada.bintang : 0;
    UI.modal({
      title: 'Beri penilaian', sub: o.judul,
      body: '<div style="text-align:center;padding:6px 0 12px" id="starbox">' +
          [1,2,3,4,5].map(function (i) {
            return '<button class="star-pick' + (i <= nilai ? ' on' : '') + '" data-act="star" data-n="' + i + '">★</button>';
          }).join('') +
          '<div class="tbl-sub mt-1" id="starlbl">' + labelBintang(nilai) + '</div>' +
        '</div>' +
        '<div class="field"><label>Komentar (opsional)</label>' +
        '<textarea class="textarea" id="komentar" rows="3" placeholder="Apa yang sudah baik, apa yang bisa ditingkatkan?">' +
        U.esc(ada ? ada.komentar : '') + '</textarea></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
            '<button class="btn" data-act="simpan">' + I18N.t('Kirim Penilaian') + '</button>',
      actions: {
        star: function (el) {
          nilai = Number(el.getAttribute('data-n'));
          U.$$('#starbox .star-pick').forEach(function (b, i) { b.classList.toggle('on', i < nilai); });
          U.$('#starlbl').textContent = labelBintang(nilai);
        },
        simpan: function (el) {
          if (!nilai) { UI.toast(I18N.t('Pilih jumlah bintang dulu'), 'err'); return; }
          BIZ.beriRating(orderId, me().id, nilai, U.$('#komentar').value.trim());
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast('Terima kasih atas penilaiannya! 🙏', 'ok');
          APP.refresh();
          /* Tawaran tip menyusul SETELAH penilaian tersimpan, dan hanya bila
             memang bisa diberikan — menawarkan lalu ditolak sistem lebih
             mengecewakan daripada tidak ditawarkan sama sekali. */
          if (window.TIP && TIP.boleh(orderId, me().id).ok && !TIP.tipOrder(orderId).length) {
            setTimeout(function () { dialogTip(orderId); }, 450);
          }
        }
      }
    });
  }

  function labelBintang(n) {
    return [I18N.t('Belum dipilih'), I18N.t('Sangat kurang'), 'Kurang', 'Cukup', 'Baik', 'Sangat baik'][n] || '';
  }

  /* ================================================================ TIP
     Tip ditawarkan SESUDAH penilaian terkirim, bukan sebelumnya. Menaruh
     kolom nominal di layar penilaian membuat orang merasa penilaian jujur
     mereka sedang ditawar — dan yang paling dirugikan justru petugas yang
     bekerja baik tetapi kliennya sedang tidak punya uang lebih. */

  function dialogTip(orderId) {
    var o = BIZ.order(orderId);
    var izin = TIP.boleh(orderId, me().id);
    if (!izin.ok) { UI.toast(izin.pesan, 'warn'); return; }

    var kru = TIP.penerima(orderId);
    var pilih = kru.map(function (u) { return u.id; });   /* bawaan: seluruh kru */
    var jumlah = 0;
    /* Kanal dipilih yang PALING MURAH untuk nominalnya, bukan yang pertama di
       daftar. Tip Rp50.000 lewat Virtual Account berbiaya Rp4.440 — hampir
       sembilan persen — sementara QRIS hanya Rp389. Biaya itu ditanggung
       EXOCLEAN atau klien, dan keduanya tidak pantas membayar sembilan persen
       hanya karena urutan daftar kanal kebetulan begitu.

       Kanal manual (transfer, COD) dikecualikan: tip yang menunggu transfer
       manual dan konfirmasi admin bukan lagi "langsung masuk dompet". */
    function kanalTermurah(nominal) {
      var daftar = PAY.kanalTersedia().filter(function (c) { return !c.manual; });
      if (!daftar.length) return PAY.kanalTersedia()[0] || null;
      return daftar.slice().sort(function (a, b) {
        return PAY.biayaGateway(a, nominal) - PAY.biayaGateway(b, nominal);
      })[0];
    }
    var kanal = kanalTermurah(50000);

    function ringkas() {
      if (!jumlah) return '';
      var p = TIP.pratinjau(jumlah, pilih, kanal ? kanal.id : 'qris');
      return '<div class="tipr">' +
        p.bagian.map(function (b) {
          return '<div class="tipr__b"><span>' + U.esc(b.nama) + '</span>' +
            '<b>' + U.rp(b.jumlah) + '</b></div>';
        }).join('') +
        '<div class="tipr__t"><span>Dibayar' +
          (p.dibebankan === 'klien' && p.biaya ? ' (termasuk biaya ' + U.rp(p.biaya) + ')' : '') +
          '</span><b>' + U.rp(p.dibayarKlien) + '</b></div>' +
        '</div>' +
        (p.dibebankan === 'merchant' && p.biaya
          ? '<div class="tbl-sub mt-1">' + I18N.t('Biaya pembayaran') + ' ' + U.rp(p.biaya) +
            ' ' + I18N.t('ditanggung EXOCLEAN — petugas tetap menerima utuh.') + '</div>'
          : '');
    }

    function gambar() {
      /* Kanal termurah bisa berbeda antar nominal — biaya tetap menang pada
         nominal besar, biaya persen menang pada nominal kecil — jadi dihitung
         ulang setiap kali angkanya berubah, bukan sekali di awal. */
      if (jumlah) kanal = kanalTermurah(jumlah);
      var box = U.$('#tip-ringkas');
      if (box) box.innerHTML = ringkas();
      var b = U.$('#tip-kirim');
      if (b) b.disabled = !(jumlah >= TIP.BATAS.min && pilih.length);
    }

    UI.modal({
      title: I18N.t('Beri Tip untuk Petugas'), sub: o.judul, size: 'narrow',
      body:
        UI.alert('brand', '<b>' + I18N.t('Seluruh tip diterima petugas.') + '</b> ' + I18N.t('EXOCLEAN tidak mengambil') + ' ' +
          I18N.t('potongan apa pun dari tip Anda.'), '💝') +

        '<div class="field mt-3"><label>Nominal tip</label>' +
          '<div class="tipq">' + TIP.CEPAT.map(function (n) {
            return '<button class="tipq__b" data-act="tip-cepat" data-n="' + n + '">' +
              U.rp(n) + '</button>';
          }).join('') + '</div>' +
          '<input class="input mt-2" id="tip-nominal" type="number" inputmode="numeric" ' +
            'min="' + TIP.BATAS.min + '" max="' + TIP.BATAS.maks + '" ' +
            'placeholder="Nominal lain" data-change="tip-ubah">' +
          '<div class="hint">' + I18N.t('Minimal') + ' ' + U.rp(TIP.BATAS.min) + ', maksimal ' + U.rp(TIP.BATAS.maks) + '.</div></div>' +

        (kru.length > 1
          ? '<div class="field"><label>' + I18N.t('Penerima') + '</label>' +
            '<div class="mini-list" style="margin:0">' + kru.map(function (u) {
              return '<label class="mini-item" style="cursor:pointer">' +
                '<input type="checkbox" data-change="tip-kru" data-id="' + u.id + '" checked>' +
                UI.avatar(u.nama, 'sm') +
                '<div style="min-width:0;flex:1"><b style="font-size:12.6px">' + U.esc(u.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(u.jabatan || 'Petugas') + '</div></div></label>';
            }).join('') + '</div>' +
            '<div class="hint">' + I18N.t('Tip dibagi rata ke petugas yang dicentang.') + '</div></div>'
          : '') +

        '<div class="field"><label>' + I18N.t('Pesan untuk petugas (opsional)') + '</label>' +
          '<input class="input" id="tip-pesan" maxlength="200" ' +
            'placeholder="mis. Terima kasih, rumah jadi wangi sekali"></div>' +

        '<div id="tip-ringkas"></div>',

      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Nanti saja') + '</button>' +
            '<button class="btn" id="tip-kirim" data-act="tip-kirim" disabled>Lanjut Bayar</button>',

      actions: {
        'tip-cepat': function (el) {
          jumlah = Number(el.getAttribute('data-n'));
          U.$('#tip-nominal').value = jumlah;
          U.$$('.tipq__b').forEach(function (b) {
            b.classList.toggle('on', Number(b.getAttribute('data-n')) === jumlah); });
          gambar();
        },
        'tip-ubah': function (el) {
          jumlah = Math.round(Number(el.value) || 0);
          U.$$('.tipq__b').forEach(function (b) {
            b.classList.toggle('on', Number(b.getAttribute('data-n')) === jumlah); });
          gambar();
        },
        'tip-kru': function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) { if (pilih.indexOf(id) < 0) pilih.push(id); }
          else pilih = pilih.filter(function (x) { return x !== id; });
          gambar();
        },
        'tip-kirim': function (el) {
          try {
            var tip = TIP.buat(orderId, me().id, jumlah, pilih,
              U.$('#tip-pesan').value, kanal ? kanal.id : 'qris');
            el.closest('.modal-back').remove(); document.body.style.overflow = '';
            bayarTip(tip.id);
          } catch (e) { UI.toast(e.message, 'err'); }
        }
      }
    });
  }

  /**
   * Layar bayar tip.
   *
   * Dalam mode simulasi, tombolnya menandai lunas seketika dan itu ditulis
   * apa adanya di layar — supaya tidak ada yang mengira uang sungguhan sudah
   * berpindah. Pada gateway sungguhan, tip harus melewati alur bayar yang
   * sama dengan tagihan lain sebelum menyentuh dompet siapa pun.
   */
  function bayarTip(tipId) {
    var t = DB.find('tips', tipId);
    if (!t) return;
    var simulasi = PAY.modeSimulasi();

    UI.modal({
      title: 'Bayar Tip', sub: t.no, size: 'narrow',
      body:
        '<div class="tipbig">' + U.rp(t.dibayarKlien) + '</div>' +
        '<div class="tbl-sub" style="text-align:center">' +
          (t.bagian || []).length + ' ' + I18N.t('petugas menerima') + '</div>' +
        '<dl class="kv mt-3">' +
          '<dt>Nominal tip</dt><dd>' + U.rp(t.jumlah) + '</dd>' +
          (t.biaya ? '<dt>' + I18N.t('Biaya pembayaran') + '</dt><dd>' + U.rp(t.biaya) +
            ' <span class="tbl-sub">(' + (t.dibebankan === 'klien' ? 'Anda' : 'EXOCLEAN') +
            ')</span></dd>' : '') +
          '<dt>' + I18N.t('Metode') + '</dt><dd>' + U.esc((PAY.channel(t.channelId) || {}).nama || t.channelId) + '</dd>' +
        '</dl>' +
        (simulasi
          ? UI.alert('warn', '<b>' + I18N.t('Mode simulasi.') + '</b> ' + I18N.t('Tidak ada uang sungguhan yang berpindah.') + ' ' +
              I18N.t('Menekan tombol di bawah langsung menandai tip ini lunas supaya alurnya') + ' ' +
              I18N.t('bisa dicoba dari ujung ke ujung.'), '🧪')
          : UI.alert('info', I18N.t('Anda akan diarahkan ke halaman pembayaran. Tip baru masuk ke') + ' ' +
              I18N.t('dompet petugas setelah pembayarannya dikonfirmasi.'), '💳')),

      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        (simulasi
          ? '<button class="btn" data-act="tip-lunas">' + I18N.t('Simulasikan Pembayaran') + '</button>'
          : '<button class="btn" data-act="tip-lunas" disabled>' + I18N.t('Belum tersambung gateway') + '</button>'),

      actions: {
        'tip-lunas': function (el) {
          try {
            TIP.lunasi(tipId, I18N.t('Simulasi pembayaran'));
            el.closest('.modal-back').remove(); document.body.style.overflow = '';
            UI.modal({ title: 'Tip terkirim 💝', size: 'narrow',
              body: UI.alert('ok', I18N.t('Tip Anda sudah masuk ke dompet petugas.') + ' ' +
                I18N.t('Terima kasih sudah menghargai kerja mereka.'), '🙏'),
              foot: '<button class="btn" data-close>' + I18N.t('Selesai') + '</button>' });
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        }
      }
    });
  }

  function dialogKomplain(orderId) {
    var o = BIZ.order(orderId), foto = [];
    UI.modal({
      title: 'Ajukan komplain', sub: o.no + ' • ' + o.judul,
      body: UI.alert('brand', I18N.t('Sesuai garansi layanan, komplain yang masuk dalam') + ' <b>3 hari</b> ' + I18N.t('setelah pekerjaan') + ' ' +
          I18N.t('selesai akan dikerjakan ulang tanpa biaya tambahan.'), '🛡️') +
        '<div class="field mt-3"><label>' + I18N.t('Apa yang perlu diperbaiki?') + ' <span class="req">*</span></label>' +
        '<textarea class="textarea" id="isi" rows="4" placeholder="Jelaskan bagian mana yang belum memuaskan"></textarea></div>' +
        '<div class="field"><label>Foto pendukung (opsional)</label><div id="fotok">' +
        UI.photoGrid([], { addAct: 'tambah-foto', addLabel: I18N.t('Tambah foto') }) + '</div></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
            '<button class="btn btn--danger" data-act="kirim">' + I18N.t('Kirim Komplain') + '</button>',
      actions: {
        'tambah-foto': function (el) {
          UI.handleFotoInput(el, function (ids) {
            foto = foto.concat(ids);
            U.$('#fotok').innerHTML = UI.photoGrid(foto, { addAct: 'tambah-foto', addLabel: I18N.t('Tambah foto'), delAct: 'hapus-foto' });
          });
        },
        'hapus-foto': function (el) {
          var id = el.getAttribute('data-id');
          foto = foto.filter(function (x) { return x !== id; }); DB.delPhoto(id);
          U.$('#fotok').innerHTML = UI.photoGrid(foto, { addAct: 'tambah-foto', addLabel: I18N.t('Tambah foto'), delAct: 'hapus-foto' });
        },
        kirim: function (el) {
          var isi = U.$('#isi').value.trim();
          if (isi.length < 10) { UI.toast(I18N.t('Mohon jelaskan keluhannya lebih rinci'), 'err'); return; }
          BIZ.ajukanKomplain(orderId, me().id, isi, foto);
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(I18N.t('Komplain terkirim. Supervisor akan menghubungi Anda.'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* ================================================================ TRANSAKSI
     "Pesan Layanan" dan "Pesanan Toko" disatukan menjadi satu menu. Keduanya
     adalah transaksi klien — yang satu memesan jasa, yang lain memantau
     pesanan barang — dan memisahkannya membuat klien harus mengingat menu
     mana yang menyimpan apa. Isinya tetap dua halaman yang sudah ada, hanya
     dipindah ke dalam tab; tidak ada logika pemesanan yang ditulis ulang. */
  var tabTx = 'layanan';

  function badgeToko() {
    return DB.where('shopOrders', function (p) {
      return p.clientId === APP.user.id && p.status === 'dikirim'; }).length;
  }

  function renderTransaksi(params) {
    params = params || {};
    if (params.tab === 'layanan' || params.tab === 'toko') tabTx = params.tab;

    return UI.tabs([
      { key: 'layanan', label: I18N.t('Pesan Layanan') },
      { key: 'toko', label: I18N.t('Pesanan Toko'), n: badgeToko() }
    ], tabTx, 'tab-tx') +
      '<div class="mt-3">' +
        (tabTx === 'layanan' ? renderPesan(params) : Toko.pagesClient.belanja.render(params)) +
      '</div>';
  }

  function mountTransaksi(root, params) {
    /* Perpindahan tab lewat APP.go, bukan APP.refresh: params halaman ikut
       diperbarui, sehingga tab yang dipilih tidak tertimpa nilai lama saat
       halaman digambar ulang oleh perubahan data. */
    U.delegate(root, {
      'tab-tx': function (el) { APP.go('transaksi', { tab: el.getAttribute('data-key') }); }
    });
    aksi(root);
    if (tabTx === 'toko') Toko.clientAksi(root, params);
  }

  /* ================================================================ PAGES */
  var pages = {
    /* Pesan layanan langsung — halaman penuh, tidak muncul di menu karena
       selalu dibuka dari satu layanan tertentu di katalog. */
    pesanLayanan: ViewPesanJasa.page(),
    beranda: { label: 'Beranda', icon: '🏠', grup: 'Utama', render: renderBeranda,
      mount: function (root) { aksi(root); Chart.pasang(root); } },
    transaksi: { label: 'Transaksi', icon: '🛍️', grup: 'Utama',
      sub: 'Pesan layanan & pantau pesanan toko',
      render: renderTransaksi, mount: mountTransaksi, badge: badgeToko },
    order: { label: 'Pekerjaan Saya', icon: '📋', grup: 'Utama', render: renderOrder, mount: aksi,
      badge: function () { return BIZ.ordersUntuk(APP.user).filter(function (o) { return o.status === 'berjalan'; }).length; } },
    penawaran: { label: 'Penawaran', icon: '📄', grup: 'Dokumen', render: renderPenawaran, mount: aksi,
      badge: function () { return DB.where('quotations', function (q) {
        return q.clientId === APP.user.id && q.status === 'terkirim'; }).length; } },
    tagihan: { label: 'Tagihan', icon: '🧾', grup: 'Dokumen', render: renderTagihan, mount: aksi,
      badge: function () { return DB.where('invoices', function (i) {
        return i.clientId === APP.user.id && i.status === 'jatuh_tempo'; }).length; } },
    obrolan: ViewObrolan.halaman,
    penilaian: { label: 'Penilaian & Komplain', icon: '⭐', grup: 'Dokumen', render: renderPenilaian, mount: aksi },
    aktivitas: { label: 'Ringkasan Aktivitas', icon: '📈', grup: 'Dokumen',
      sub: 'Grafik pemesanan layanan & pembelian produk',
      render: renderAktivitas, mount: function (root) { aksi(root); Chart.pasang(root); } },
    poin: ViewPoin.halamanUser,
    voucher: ViewVoucher.halamanUser,
    profil: ViewProfil.page('Akun')
  };

  /* Halaman Toko disuntikkan dari views/toko.js — handler-nya digabung dengan
     handler klien supaya aksi umum (detail order, chat admin) tetap jalan.
     `belanja` sengaja dilewati: isinya kini menjadi tab di menu Transaksi. */
  Object.keys(Toko.pagesClient).forEach(function (k) {
    if (k === 'belanja') return;
    var p = Object.assign({}, Toko.pagesClient[k]);
    var mountToko = p.mount;
    /* params WAJIB diteruskan. Membuangnya membuat halaman yang butuh
       parameter — detail produk perlu tahu produk mana — dipasang tanpa tahu
       apa yang sedang dibuka: layarnya tergambar benar (render menerima
       params) tetapi perilakunya mati diam-diam, tanpa error apa pun. */
    p.mount = function (root, params) { aksi(root); mountToko(root, params); };
    pages[k] = p;
  });

  /* Bayar & Isi Ulang (Darmawisata) hanya muncul bila rumpunnya dinyalakan
     admin. Halaman yang tetap tampil sementara layanannya dimatikan akan
     menjanjikan sesuatu yang tidak bisa dipenuhi, dan pemakainya menyalahkan
     aplikasi — bukan setelan yang memang sengaja dimatikan.

     `tersembunyi` dipasang sebagai GETTER, bukan nilai. Daftar halaman ini
     dibangun sekali saat berkas dimuat — saat itu DB belum terbuka, dan
     membaca setelan di sini melempar galat yang mematikan seluruh menu.
     Sebagai getter, ia baru dibaca ketika menunya digambar, dan ikut
     berubah begitu admin mengubah setelannya tanpa perlu muat ulang. */
  Object.keys(ViewDWI.pagesClient).forEach(function (k) {
    var p = Object.assign({}, ViewDWI.pagesClient[k]);
    var mountDWI = p.mount;
    p.mount = function (root, params) { aksi(root); mountDWI(root, params); };
    Object.defineProperty(p, 'tersembunyi', {
      get: function () {
        if (!window.DWI || !DB.raw || !DB.raw.settings) return true;
        return !(DWI.aktif('ppob') || DWI.aktif('topup'));
      }
    });
    pages[k] = p;
  });

  /* Afiliasi & Dropship terbuka untuk semua klien. Dompet baru muncul setelah
     ada penghasilan atau saldo — supaya menu klien biasa tidak penuh oleh
     halaman yang belum ada isinya. */
  /* Jasa keahlian: layar pemesanannya tersembunyi (selalu dibuka dari satu
     layanan tertentu), keranjangnya hanya muncul kalau ada layanan keahlian
     yang benar-benar ditawarkan — menu kosong yang tidak bisa diapa-apakan
     lebih membingungkan daripada tidak ada sama sekali. */
  Object.keys(ViewKeahlian.pagesClient).forEach(function (k) {
    var p = Object.assign({}, ViewKeahlian.pagesClient[k]);
    var mountKh = p.mount;
    p.mount = function (root, params) { aksi(root); mountKh(root, params); };
    if (k === 'keranjangJasa') {
      Object.defineProperty(p, 'tersembunyi', {
        get: function () {
          if (!window.KEAHLIAN || !DB.raw) return true;
          return !KEAHLIAN.katalog().length;
        }
      });
    }
    pages[k] = p;
  });

  pages.afiliasi = ViewAfiliasi.pageKlien;

  function punyaPenghasilan(u) {
    return !!(u && (u.afiliasi || u.dropship)) || DOMPET.saldo(u.id) > 0 ||
      DOMPET.mutasi(u.id).length > 0;
  }

  function susun() {
    var u = APP.user;
    var out = {};
    Object.keys(pages).forEach(function (k) { out[k] = pages[k]; });
    if (u && punyaPenghasilan(u)) out.dompet = ViewDompet.pageMitra;
    return out;
  }

  return { get pages() { return susun(); } };
})();
