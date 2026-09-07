/* ==========================================================================
   exo-screens-home.js — Beranda pelanggan ala Tokopedia
   --------------------------------------------------------------------------
   Susunan (dianalisis dari beranda Tokopedia): bilah cari + keranjang +
   lonceng → "Dikirim ke <alamat>" → korsel promo → strip dompet (Saldo ·
   Poin · Top up · Bayar) → menu ikon (jasa utama, Toko, Bayar & Isi Ulang,
   Perjalanan, Semua) → kunjungan berikutnya → Flash sale (produk diskon,
   hitung mundur) → Toko pilihan → Mitra terdekat → Rekomendasi untuk kamu
   (feed produk 2 kolom). Pencarian menggabungkan jasa dan produk.
   Menimpa X.LAYAR.home bila modul marketplace dimuat; beranda lama tetap
   dipakai bila tidak.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, rp = X.rp, I = X.I, ikon = X.ikon, IKON = X.IKON, A = X.AKSI;
  var t = function (k) { return I.t(k); }, tx = function (s) { return I.tx(s); };
  var T = function () { return window.EXO_TOKO; };
  if (!window.EXO_TOKO) return;
  var homeLama = X.LAYAR.home;
  var BANNER = [
    { warna:'linear-gradient(135deg,#0a8f5c,#12b981)', judul:'Gratis ongkir', sub:'belanja perlengkapan ≥ Rp150.000 per toko', cta:'Belanja', ke:'toko', ikon:'🚚' },
    { warna:'linear-gradient(135deg,#0b5f52,#1a9a86)', judul:'Langganan mingguan −10%', sub:'harga terkunci 3 bulan, jadwal tetap', cta:'Pilih paket', ke:'catalog', ikon:'📅' },
    { warna:'linear-gradient(135deg,#7a3e9d,#b15ad9)', judul:'Bayar tagihan & pulsa', sub:'PLN, BPJS, PDAM, token dari EXO Wallet', cta:'Bayar', ke:'tagihan', ikon:'🧾' },
    { warna:'linear-gradient(135deg,#1d4ed8,#3b82f6)', judul:'Tiket & hotel', sub:'pesawat, kereta, hotel, umroh · Darmawisata', cta:'Cari', ke:'perjalanan', ikon:'✈️' }
  ];
  var MENU = [
    { id:'hourly', jasa:true, ikon:'🧹', label:'Per jam' }, { id:'deep', jasa:true, ikon:'✨', label:'Deep clean' }, { id:'ac', jasa:true, ikon:'❄️', label:'Cuci AC' }, { id:'sofa', jasa:true, ikon:'🛋️', label:'Sofa & kasur' },
    { id:'toko', ke:'toko', ikon:'🛒', label:'Toko' }, { id:'tagihan', ke:'tagihan', ikon:'🧾', label:'Tagihan' }, { id:'perjalanan', ke:'perjalanan', ikon:'✈️', label:'Perjalanan' }, { id:'catalog', ke:'catalog', ikon:'▦', label:'Semua' }
  ];
  function jumlahKeranjang() { return (K.keranjang || []).reduce(function (n, it) { return n + it.qty; }, 0); }
  function hitungMundur() { var d = new Date(), sisa = 24 * 3600 - (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()), j = Math.floor(sisa / 3600), m = Math.floor(sisa % 3600 / 60), s = sisa % 60, dua = function (n) { return String(n).padStart(2, '0'); }; return dua(j) + ':' + dua(m) + ':' + dua(s); }
  function kartu(p) { return X.kartuProduk ? X.kartuProduk(p) : '<button class="card elev-sm gap-3" style="text-align:start;cursor:pointer"' + aksi('tokoProduk', p.id) + '><div style="font-size:30px">' + p.ikon + '</div><div class="t-12">' + esc(p.nama) + '</div><b>' + rp(T().hargaSetelahDiskon(p, null)) + '</b></button>'; }

  X.LAYAR.home = function () {
    var b = window.EXO_BRAND ? EXO_BRAND.baca() : {}, j = X.juruKini(), cari = (K.cari || '').trim().toLowerCase(), alamat = X.alamatKini();
    var h = '<div class="screen">';
    /* bilah atas: cari + keranjang + lonceng */
    h += '<div style="padding:14px 16px 0;background:linear-gradient(180deg,var(--color-accent-2-100,#e6f4ef),var(--color-bg) 90%)"><div class="flex items-center gap-8"><div class="searchbox" style="background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)">' + ikon(IKON.cari, 15) + '<input id="exo-cari" data-simpan="cari" data-gambar="1" value="' + esc(K.cari || '') + '" placeholder="' + esc('Cari jasa, produk, tagihan…') + '" aria-label="Cari">' + (cari ? '<button class="hapus"' + aksi('cariKosong') + ' aria-label="Hapus">✕</button>' : '') + '</div>' +
      '<button class="btn btn-icon btn-secondary btn-plain" style="position:relative"' + aksi('ke', 'keranjangDaftar') + ' aria-label="Keranjang">🛒' + (jumlahKeranjang() ? '<span class="tag tag-accent" style="position:absolute;top:-5px;right:-5px;padding:1px 6px;font-size:10px">' + jumlahKeranjang() + '</span>' : '') + '</button>' +
      '<button class="btn btn-icon btn-secondary btn-plain"' + aksi('lembar', 'notif') + ' aria-label="Notifikasi">' + ikon(IKON.lonceng) + '</button><button class="lang-btn"' + aksi('ke', 'lang') + '>' + (K.lang || 'id').toUpperCase() + '</button></div>';
    h += '<button class="flex items-center gap-6 t-125" style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:6px;margin-top:10px;width:100%"' + aksi('lembar', 'alamat') + '><span>📍</span><span class="o-7">' + esc(t('cleaningAt')) + '</span><b style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(tx(alamat.label)) + ' · ' + esc(alamat.short) + '</b><span class="o-6">⌄</span></button>';
    if (b.tickerOn && b.tickerText) h += '<div class="ticker" style="margin-top:10px"><div class="ticker-badge"><i></i>' + esc(b.tickerBadge) + '</div><div class="ticker-win"><div class="ticker-track"><span>' + esc(b.tickerText) + '</span><span>' + esc(b.tickerText) + '</span></div></div></div>';
    h += '</div>';

    /* pencarian gabungan jasa + produk */
    if (cari) {
      var jasaCocok = D.HOME_TILES.filter(function (s) { return !X.layananDijeda(s.id) && (D.SERVICES[s.id].name.toLowerCase().indexOf(cari) >= 0 || I.svcName(s.id).toLowerCase().indexOf(cari) >= 0); });
      var produkCocok = T().katalogFilter(cari, 'semua', {}, alamat.point).daftar.slice(0, 8);
      h += '<div style="padding:14px 16px 0" class="stack gap-10">';
      h += '<div class="t-115 up o-6">Jasa · ' + jasaCocok.length + '</div>' + (jasaCocok.length ? '<div class="svc-grid">' + jasaCocok.map(function (s) { return '<button class="svc' + (s.daun ? ' leaf' : '') + '"' + aksi('pilihJasa', s.id) + '><i>' + ikon(s.d, 20) + '</i><b>' + esc(I.svcName(s.id)) + '</b></button>'; }).join('') + '</div>' : '<div class="t-125 o-6">Tidak ada jasa yang cocok.</div>');
      h += '<div class="t-115 up o-6" style="margin-top:6px">Produk · ' + produkCocok.length + '</div>' + (produkCocok.length ? '<div class="grid-2">' + produkCocok.map(kartu).join('') + '</div>' : '<div class="t-125 o-6">Tidak ada produk yang cocok.</div>') + '<button class="btn btn-secondary btn-block" style="margin:6px 0 0"' + aksi('homeCariToko') + '>Cari "' + esc(K.cari) + '" di Toko →</button></div><div class="spacer-26"></div></div>';
      return h;
    }

    /* korsel promo */
    h += '<div class="hscroll" style="gap:10px;padding:14px 16px 0">' + BANNER.map(function (bn) { return '<button style="all:unset;box-sizing:border-box;cursor:pointer;flex:none;width:262px;height:112px;border-radius:18px;padding:14px 16px;color:#fff;background:' + bn.warna + ';display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden"' + aksi('ke', bn.ke) + '><span style="position:absolute;right:-6px;top:-8px;font-size:64px;opacity:.25">' + bn.ikon + '</span><div><div style="font-weight:800;font-size:16px;line-height:1.15">' + esc(bn.judul) + '</div><div style="font-size:11.5px;opacity:.9;margin-top:3px">' + esc(bn.sub) + '</div></div><span style="align-self:flex-start;background:#fff;color:#0b5f52;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px">' + esc(bn.cta) + ' →</span></button>'; }).join('') + '</div>';

    /* strip dompet */
    h += '<div style="padding:12px 16px 0"><div class="card elev-sm" style="flex-direction:row;align-items:center;gap:0;padding:10px 12px">' +
      '<button style="all:unset;cursor:pointer;flex:1;min-width:0"' + aksi('ke', 'wallet') + '><div class="t-11 o-6">EXO Wallet</div><div class="t-135 bold">' + rp(K.saldo || 0) + '</div></button><div style="width:1px;height:28px;background:var(--color-neutral-200,#e5ebe8)"></div>' +
      '<button style="all:unset;cursor:pointer;flex:1;min-width:0;padding-inline-start:12px"' + aksi('ke', 'wallet') + '><div class="t-11 o-6">Poin</div><div class="t-135 bold">⭐ ' + (K.poin || 0).toLocaleString('id-ID') + '</div></button>' +
      '<button class="pill pill-sm"' + aksi('homeTopUp') + '>+ Top up</button><button class="pill pill-sm" style="margin-inline-start:6px"' + aksi('ke', 'tagihan') + '>Bayar</button></div></div>';

    /* menu ikon */
    h += '<div style="padding:14px 16px 0"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px">' + MENU.filter(function (m) { return !m.jasa || !X.layananDijeda(m.id); }).map(function (m) { var on = m.jasa ? aksi('pilihJasa', m.id) : aksi('ke', m.ke); return '<button style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center"' + on + '><span style="width:50px;height:50px;border-radius:16px;background:var(--color-surface);display:grid;place-items:center;font-size:24px;box-shadow:0 1px 2px rgba(0,0,0,.05)">' + m.ikon + '</span><span class="t-11" style="line-height:1.15">' + esc(m.jasa ? I.svcName(m.id) : m.label) + '</span></button>'; }).join('') + '</div></div>';

    /* kunjungan berikutnya */
    h += '<div style="padding:16px 16px 0"><div class="card elev-md gap-10"><div class="flex items-center gap-8"><span class="tag tag-accent-2">' + esc(t('nextVisit')) + '</span><span class="t-11 o-6">' + esc(tx('Today')) + ' ' + esc(K.mulai) + '</span><button class="btn btn-ghost t-115" style="margin-inline-start:auto"' + aksi('ke', 'track') + '>' + esc(t('trackLive')) + ' →</button></div><div class="flex items-center gap-10">' + X.avJuru(j, 40) + '<div class="grow"><div class="f-head t-15">' + esc(j.name) + '</div><div class="t-115 o-65">' + esc(I.svcName(K.jasa)) + ' · ' + esc(X.qtyText(K.jam)) + ' · ' + esc(t('slotLocked')) + '</div></div></div><div class="progress"><i style="width:46%"></i></div></div></div>';

    /* flash sale */
    var fs = T().katalogFilter('', 'semua', { diskon:true, urut:'terlaris' }, alamat.point).daftar.slice(0, 8);
    if (fs.length) h += '<div style="padding:18px 0 0 16px"><div class="flex items-center gap-8" style="padding-right:16px"><div class="f-head t-17" style="color:#b12a5b">⚡ Flash Sale</div><span class="tag" style="background:#1f1f1f;color:#fff;font-size:10px;font-variant-numeric:tabular-nums">' + hitungMundur() + '</span><button class="btn btn-ghost t-115" style="margin-inline-start:auto;color:#0a8f5c"' + aksi('homeLihatDiskon') + '>Lihat semua →</button></div><div class="hscroll" style="gap:8px;margin-top:8px;padding-right:16px">' + fs.map(function (p) { return '<div style="width:150px">' + kartu(p) + '</div>'; }).join('') + '</div></div>';

    /* toko pilihan */
    var toko = T().semuaToko().filter(function (x) { return x.status === 'aktif'; }).sort(function (a, c) { return (T().skorToko(c.id).skor) - (T().skorToko(a.id).skor); }).slice(0, 6);
    h += '<div style="padding:18px 0 0 16px"><div class="flex items-center gap-8" style="padding-right:16px"><div class="f-head t-17">Toko pilihan</div><button class="btn btn-ghost t-115" style="margin-inline-start:auto;color:#0a8f5c"' + aksi('ke', 'toko') + '>Lihat semua →</button></div><div class="hscroll" style="gap:8px;margin-top:8px;padding-right:16px">' + toko.map(function (x) { var sk = T().skorToko(x.id); return '<button class="card elev-sm gap-3" style="width:160px;text-align:start;cursor:pointer"' + aksi('tokoLihat', x.id) + '><div class="flex items-center gap-6">' + (x.badge === 'official' ? '<span class="tag tag-accent" style="font-size:10px">Official</span>' : x.badge === 'power' ? '<span class="tag tag-accent-2" style="font-size:10px">Power</span>' : '<span class="tag tag-neutral" style="font-size:10px">Toko</span>') + '</div><div class="t-125 bold lh-14" style="min-height:32px">' + esc(x.nama) + '</div><div class="t-11 o-6">⭐ ' + sk.rating + ' · ' + esc(x.kota || '') + '</div></button>'; }).join('') + '</div></div>';

    /* mitra terdekat */
    var dekat = X.daftarJuru().slice(0, 6);
    h += '<div style="padding:18px 0 0 16px"><div class="flex items-center gap-8" style="padding-right:16px"><div class="f-head t-17">' + esc(t('nearYou')) + '</div><button class="btn btn-ghost t-115" style="margin-inline-start:auto;color:#0a8f5c"' + aksi('pilihJasa', 'hourly') + '>' + esc(t('seeAll')) + ' →</button></div><div class="hscroll" style="gap:10px;margin-top:8px;padding-right:16px">' + dekat.map(function (cl) { return '<div class="near"><div class="flex items-center gap-8">' + X.avJuru(cl, 34, 'leaf') + '<div class="t-12 bold" style="line-height:1.2">' + esc(X.namaDepan(cl)) + '</div></div><div class="t-115 o-7" style="margin-top:9px">' + (cl.rating ? '★ ' + esc(cl.rating) + ' · ' : '') + esc(cl.jobs) + ' ' + esc(tx('jobs')) + '</div><div class="f-head t-14" style="margin-top:5px">' + rp(X.rateFor(cl)) + '</div><div class="t-11 o-6">' + esc(cl.distance ? cl.distance + ' ' + tx('away') : (cl.years ? cl.years + ' ' + tx('with EXOCLEAN') : tx('new'))) + '</div></div>'; }).join('') + '</div></div>';

    /* jaminan singkat */
    h += '<div style="padding:16px 16px 0"><div class="card card-leaf gap-6" style="flex-direction:row;align-items:center"><span class="av av-leaf" style="--s:30px">' + ikon(IKON.perisaiCentang, 15) + '</span><div class="t-115 lh-145 o-85"><b>' + esc(t('guarantee')) + '.</b> ' + esc(tx('Once confirmed, only you can move the time. If we ever reschedule you, Rp100.000 credit lands in your wallet the same minute — no ticket, no chasing.')) + '</div></div></div>';

    /* rekomendasi */
    var rek = T().rekomendasi(K.tokoDilihat || [], K.keranjang || [], 8);
    h += '<div style="padding:18px 16px 0"><div class="f-head t-17" style="color:#0a8f5c">Rekomendasi untuk kamu</div><div style="width:72px;height:2px;background:#0a8f5c;margin:4px 0 10px"></div><div class="grid-2">' + rek.map(kartu).join('') + '</div><button class="btn btn-secondary btn-block" style="margin:12px 0 0"' + aksi('ke', 'toko') + '>Lihat semua produk</button></div><div class="spacer-26"></div>';
    return h + '</div>';
  };
  A.homeCariToko = function () { K.tokoCari = K.cari; K.cari = ''; K.layar = 'toko'; };
  A.homeLihatDiskon = function () { K.tokoFilter = K.tokoFilter || {}; K.tokoFilter.diskon = true; K.tokoCari = ''; K.tokoKategori = 'semua'; K.layar = 'toko'; };
  A.homeTopUp = function () { K.layar = 'wallet'; K.lembar = 'isi'; };
})(ExoApp);
