/* ==========================================================================
   exo-screens-akun.js — layar pelanggan ala aplikasi pembeli Tokopedia
   --------------------------------------------------------------------------
   Dianalisis dari aplikasi Tokopedia (pembeli): navigasi bawah Beranda ·
   Toko · Transaksi · Wishlist · Akun; halaman Daftar Transaksi (cari,
   chip status Semua/Berlangsung/Berhasil/Tidak berhasil, filter kategori &
   rentang tanggal, kartu transaksi: ikon kategori + tanggal + chip status,
   barang + "+n lainnya", total, tombol Beli lagi / Ulas / Lacak / Bayar);
   halaman Akun (kepala profil + tingkat member & progres, strip Saldo ·
   Poin · Kupon, menu cepat, "Aktivitas saya", pengaturan, undang teman);
   Wishlist (hati di kartu & halaman produk); Toko favorit (ikuti toko);
   Kupon saya (tiket kupon platform & kupon toko, tombol Pakai); Notifikasi
   dengan tab Transaksi · Promo · Info. Menimpa X.LAYAR.orders & profile;
   semua transaksi (jasa, belanja toko, tagihan & isi ulang, perjalanan)
   digabung dalam satu daftar.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, I = X.I, K = X.KEADAAN, esc = X.esc, rp = X.rp, aksi = X.aksi, kelas = X.kelas, av = X.av, ikon = X.ikon, IKON = X.IKON, A = X.AKSI, t = I.t, tx = I.tx;
  var T = function () { return window.EXO_TOKO; };
  K.wishlist = K.wishlist || []; K.tokoFavorit = K.tokoFavorit || []; K.trxTab = K.trxTab || 'semua'; K.trxKat = K.trxKat || 'semua'; K.trxCari = K.trxCari || ''; K.trxRentang = K.trxRentang || 0; K.notifTab = K.notifTab || 'transaksi';
  var KAT = { jasa:['🧹', 'Jasa kebersihan'], toko:['🛒', 'Belanja toko'], ppob:['🧾', 'Tagihan & isi ulang'], perjalanan:['✈️', 'Perjalanan'] };
  function pembeli() { return { nama:'Dewi Anggraini', id:K.pelangganId || null }; }
  function tglId(iso) { var d = new Date(iso); return isNaN(d) ? String(iso || '') : d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); }
  function tanggalDariMeta(meta) { var m = String(meta || '').match(/(\d{1,2}) (\w{3})/); if (!m) return '2026-08-01'; var bulan = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' }[m[2]] || '08'; return '2026-' + bulan + '-' + String(m[1]).padStart(2, '0'); }
  function chipStatus(s, label) { var w = { berjalan:['#fff4d6', '#7a5200'], berhasil:['var(--color-accent-2-100)', 'var(--color-accent-2-900)'], gagal:['#fde2e7', '#8a1d3b'] }[s] || ['var(--color-bg)', 'inherit']; return '<span class="tag" style="font-size:10px;background:' + w[0] + ';color:' + w[1] + ';flex:none">' + esc(label) + '</span>'; }

  /* ---------------------------------------------------- gabungan transaksi */
  function semuaTransaksi() {
    var out = [], j = X.juruKini();
    /* jasa kebersihan: pesanan aktif + riwayat contoh */
    if (!K.dibatalkan && K.tahap != null) out.push({ id:'jasa-aktif', jenis:'jasa', tgl:new Date().toISOString(), judul:I.svcName(K.jasa) + ' · ' + X.qtyText(K.jam), sub:X.ringkasSlot() + ' · ' + j.name, thumb:X.avJuru(j, 40), total:X.totalN ? X.totalN() : 0, status:'berjalan', statusLabel:tx(X.tahapAlur()[Math.min(K.tahap, X.tahapAlur().length - 1)].title), no:'EXO-4471', aksi:[['Lacak', 'ke', 'track', true], ['Pindah jadwal', 'lembar', 'pindah']] });
    D.PAST_ORDERS.forEach(function (o, i) { out.push({ id:'jasa-' + i, jenis:'jasa', tgl:tanggalDariMeta(o.meta), judul:o.service, sub:o.meta, thumb:av(o.initials, 40, 'leaf'), total:Number(String(o.price).replace(/\D/g, '')) || 0, status:'berhasil', statusLabel:'Selesai · ' + o.stars, no:'EXO-44' + (60 - i), aksi:[['Pesan lagi', 'pilihJasa', o.svc, true], ['Laporan', 'ke', 'report'], ['Klaim', 'ke', 'issue']] }); });
    /* belanja toko */
    if (T()) T().pesananPembeli(pembeli().nama, pembeli().id).forEach(function (o) {
      var st = o.status === 'selesai' ? 'berhasil' : o.status === 'dibatalkan' ? 'gagal' : 'berjalan', p0 = o.items && o.items[0], pr = p0 ? T().produk(p0.produkId) : null, tk = T().toko(o.tokoId);
      var ak = [];
      if (o.status === 'menunggu-bayar') ak.push(['Bayar', 'ke', 'pesananToko', true]); else if (o.status === 'dikirim') ak.push(['Lacak', 'ke', 'pesananToko', true]); else if (o.status === 'selesai') ak.push(['Beli lagi', 'tokoProduk', p0 ? p0.produkId : '', true], ['Ulas', 'ke', 'pesananToko']); else ak.push(['Lihat', 'ke', 'pesananToko', true]);
      out.push({ id:'toko-' + o.id, jenis:'toko', tgl:o.at, judul:p0 ? p0.nama + (o.items.length > 1 ? ' +' + (o.items.length - 1) + ' produk lainnya' : '') : 'Pesanan toko', sub:(tk ? tk.nama : '') + (p0 && p0.varian ? ' · ' + p0.varian + ' × ' + p0.qty : ''), thumb:'<span class="av av-plain" style="--s:40px;font-size:22px">' + (pr && X.fotoProdukUtama && X.fotoProdukUtama(pr) ? '<img src="' + X.fotoProdukUtama(pr) + '" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:12px">' : esc(p0 ? p0.ikon || '📦' : '📦')) + '</span>', total:o.total, status:st, statusLabel:T().labelStatus(o.status), no:o.no, aksi:ak });
    });
    /* tagihan & isi ulang */
    if (window.EXO_PPOB) EXO_PPOB.riwayat().forEach(function (x) { var st = x.keadaan === 'selesai' ? 'berhasil' : x.keadaan === 'gagal' ? 'gagal' : 'berjalan'; out.push({ id:'ppob-' + x.id, jenis:'ppob', tgl:x.at, judul:x.produk, sub:x.nomor + (x.periode ? ' · ' + x.periode : ''), thumb:'<span class="av av-soft" style="--s:40px;font-size:20px">' + (x.jenis === 'topup' ? '📱' : '🧾') + '</span>', total:x.total, status:st, statusLabel:{ selesai:'Berhasil', tertunda:'Diproses', ragu:'Perlu pencocokan', berjalan:'Diproses', gagal:'Gagal' }[x.keadaan] || x.keadaan, no:x.ref || x.id, aksi:[['Bayar lagi', 'ke', 'tagihan', true]] }); });
    /* perjalanan */
    if (window.EXO_PERJALANAN) EXO_PERJALANAN.semua().forEach(function (x) { var st = x.status === 'terbit' ? 'berhasil' : x.status === 'dibatalkan' ? 'gagal' : 'berjalan'; out.push({ id:'perj-' + x.id, jenis:'perjalanan', tgl:x.at, judul:x.judul, sub:x.rumpunNama + (x.sub ? ' · ' + x.sub : ''), thumb:'<span class="av av-soft" style="--s:40px;font-size:20px">✈️</span>', total:x.hargaFinal || x.hargaPerkiraan, status:st, statusLabel:EXO_PERJALANAN.STATUS[x.status] || x.status, no:x.no, aksi:[[x.status === 'dikonfirmasi' ? 'Bayar' : 'Lihat', 'ke', 'perjalanan', true]] }); });
    return out.sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });
  }
  function kartuTrx(x) {
    var k = KAT[x.jenis];
    return '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span style="font-size:16px">' + k[0] + '</span><div class="grow" style="min-width:0"><div class="t-12 bold">' + esc(k[1]) + '</div><div class="t-10 o-6">' + esc(tglId(x.tgl)) + ' · ' + esc(x.no || '') + '</div></div>' + chipStatus(x.status, x.statusLabel) + '</div>' +
      '<div class="flex items-center gap-10">' + x.thumb + '<div class="grow" style="min-width:0"><div class="t-125 bold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.judul) + '</div><div class="t-11 o-6" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.sub) + '</div></div></div>' +
      '<div class="flex items-center gap-8"><div class="grow"><div class="t-10 o-6">Total belanja</div><b class="t-125">' + rp(x.total) + '</b></div>' + (x.aksi || []).map(function (a) { return '<button class="btn ' + (a[3] ? 'btn-primary' : 'btn-secondary') + '" style="height:32px;padding:0 12px;font-size:12px"' + aksi(a[1], a[2]) + '>' + esc(a[0]) + '</button>'; }).join('') + '</div></div>';
  }
  X.LAYAR.orders = function () {
    var semua = semuaTransaksi(), cari = K.trxCari.trim().toLowerCase(), batas = K.trxRentang ? Date.now() - K.trxRentang * 86400000 : 0;
    var daftar = semua.filter(function (x) { return (K.trxTab === 'semua' || x.status === K.trxTab) && (K.trxKat === 'semua' || x.jenis === K.trxKat) && (!batas || new Date(x.tgl).getTime() >= batas) && (!cari || (x.judul + ' ' + x.sub + ' ' + (x.no || '')).toLowerCase().indexOf(cari) >= 0); });
    var n = { semua:semua.length, berjalan:0, berhasil:0, gagal:0 }; semua.forEach(function (x) { n[x.status]++; });
    var h = '<div class="screen"><div class="flex items-center gap-8" style="padding:18px 20px 10px"><h3 class="grow" style="margin:0">Daftar transaksi</h3>' + X.tombolBahasa() + '</div>';
    h += '<div class="pad-x"><div class="searchbox">' + ikon(IKON.cari, 15) + '<input data-simpan="trxCari" data-gambar="1" value="' + esc(K.trxCari) + '" placeholder="Cari transaksi, produk, nomor pesanan" aria-label="Cari transaksi">' + (K.trxCari ? '<button class="hapus"' + aksi('trxCariKosong') + ' aria-label="Hapus">✕</button>' : '') + '</div></div>';
    h += '<div class="hscroll" style="gap:6px;padding:10px 20px 0">' + [['semua', 'Semua'], ['berjalan', 'Berlangsung'], ['berhasil', 'Berhasil'], ['gagal', 'Tidak berhasil']].map(function (s) { return '<button class="' + kelas('pill pill-sm', K.trxTab === s[0]) + '"' + aksi('trxTab', s[0]) + '>' + s[1] + (n[s[0]] ? ' · ' + n[s[0]] : '') + '</button>'; }).join('') + '</div>';
    h += '<div class="hscroll" style="gap:6px;padding:8px 20px 0">' + [['semua', 'Semua produk']].concat(Object.keys(KAT).map(function (k) { return [k, KAT[k][0] + ' ' + KAT[k][1]]; })).map(function (s) { return '<button class="' + kelas('pill pill-sm', K.trxKat === s[0]) + '" style="background:' + (K.trxKat === s[0] ? '' : 'var(--color-surface)') + '"' + aksi('trxKat', s[0]) + '>' + s[1] + '</button>'; }).join('') + '<span style="width:6px"></span>' + [[30, '30 hari'], [90, '90 hari'], [0, 'Semua tanggal']].map(function (s) { return '<button class="' + kelas('pill pill-sm', K.trxRentang === s[0]) + '"' + aksi('trxRentang', s[0]) + '>📅 ' + s[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="stack gap-10" style="padding:12px 20px 0">';
    if (K.trxTab !== 'berhasil' && K.trxTab !== 'gagal' && K.trxKat === 'semua' && !cari) {
      var lg = K.langganan;
      if (lg && lg.status === 'aktif' && !K.dibatalkan) { var fr = X.cariFrekuensi(lg.frekuensi); h += '<div class="card card-leaf gap-6"><div class="flex items-center gap-8"><span class="av av-leaf" style="--s:26px">' + ikon(IKON.kalender, 14) + '</span><div class="grow"><div class="t-125 bold">Langganan ' + esc(tx(fr.label)) + ' · ' + esc(I.dowShort(X.hariKe(K.hari))) + ' ' + K.mulai + '</div><div class="t-11 o-7">' + lg.kunjunganSelesai + ' dari ' + lg.minKunjungan + ' kunjungan · −' + Math.round(lg.diskon * 100) + '% · ' + rp(lg.hargaKunjungan) + '</div></div><span class="tag tag-accent">Aktif</span></div><div class="flex gap-8"><button class="btn btn-secondary" style="flex:1;height:32px;font-size:12px"' + aksi('lewati') + '>Lewati satu</button><button class="btn btn-secondary" style="flex:1;height:32px;font-size:12px"' + aksi('bukaBatalPaket') + '>Batalkan paket</button></div></div>'; }
      h += '<div class="card card-clay gap-6"><div class="flex items-center gap-8"><span class="tag tag-accent">' + esc(tx('Refund in progress')) + '</span><span style="margin-inline-start:auto" class="t-115">Rp180.000</span></div><div class="refund-bar"><i class="on"></i><i class="on"></i><i></i></div><div class="t-115 lh-15">Tahap 2 dari 3 — disetujui, dikirim ke bank. <strong>Dana masuk Jumat 28 Agu</strong>. Bila terlambat, kredit Rp50.000 ditambahkan otomatis.</div></div>';
    }
    if (!daftar.length) h += '<div class="card elev-sm" style="align-items:center;text-align:center;gap:6px;padding:26px 16px"><div style="font-size:40px">🧾</div><div class="t-135 bold">Belum ada transaksi</div><div class="t-115 o-6">Coba ubah filter, atau mulai pesan jasa dan belanja perlengkapan.</div><div class="flex gap-8" style="margin-top:6px"><button class="btn btn-primary" style="height:34px"' + aksi('ke', 'catalog') + '>Pesan jasa</button><button class="btn btn-secondary" style="height:34px"' + aksi('ke', 'toko') + '>Belanja</button></div></div>';
    h += daftar.map(kartuTrx).join('');
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.trxTab = function (v) { K.trxTab = v; }; A.trxKat = function (v) { K.trxKat = v; }; A.trxRentang = function (v) { K.trxRentang = Number(v); }; A.trxCariKosong = function () { K.trxCari = ''; };

  /* ---------------------------------------------------- Akun */
  function tingkatMember() { var p = K.poin || 0, tk = p >= 5000 ? ['Platinum', 5000, null] : p >= 1000 ? ['Gold', 1000, 5000] : p >= 300 ? ['Silver', 300, 1000] : ['Member', 0, 300]; return { nama:tk[0], pct:tk[2] ? Math.min(100, Math.round((p - tk[1]) / (tk[2] - tk[1]) * 100)) : 100, ke:tk[2] }; }
  function jumlahKupon() { var n = D.VOUCHER ? 1 : 0; if (T()) n += window.EXO_DB.all('kuponToko').filter(function (k) { return k.aktif && k.terpakai < k.kuota; }).length; return n; }
  X.LAYAR.profile = function () {
    if (K.sisi === 'partner') return X.profilMitra();
    var m = tingkatMember(), langNow = null, trx = semuaTransaksi(); for (var q = 0; q < I.LANGS.length; q++) if (I.LANGS[q].code === K.lang) langNow = I.LANGS[q];
    var berjalan = trx.filter(function (x) { return x.status === 'berjalan'; }).length, ulasBelum = trx.filter(function (x) { return x.jenis === 'toko' && x.status === 'berhasil'; }).length;
    var h = '<div class="screen"><div class="hero" style="padding-bottom:16px"><div class="flex items-center gap-12">' + av('DA', 52, 'solid') + '<div class="grow" style="min-width:0"><div class="f-head t-17">Dewi Anggraini</div><div class="t-115 o-7">+62 812 8890 4417 · dewi@contoh.id</div></div><button class="btn btn-icon btn-secondary btn-plain"' + aksi('ke', 'notifikasi') + ' aria-label="Notifikasi">' + ikon(IKON.lonceng) + '</button>' + X.tombolBahasa() + '</div>';
    h += '<div class="card elev-sm gap-6" style="margin-top:12px;padding:10px 14px"><div class="flex items-center gap-8"><span class="tag tag-accent">★ ' + m.nama + ' member</span><span class="t-11 o-6 grow">' + (m.ke ? (m.ke - (K.poin || 0)).toLocaleString('id-ID') + ' poin lagi ke tingkat berikutnya' : 'Tingkat tertinggi') + '</span><button class="btn btn-ghost t-11"' + aksi('ke', 'wallet') + '>Poin →</button></div><div class="progress"><i style="width:' + m.pct + '%"></i></div></div></div>';
    h += '<div class="stack gap-12" style="padding:14px 20px 0">';
    /* strip saldo · poin · kupon */
    h += '<div class="card elev-md" style="flex-direction:row;align-items:center;gap:0;padding:10px 12px">' + [['EXO Wallet', rp(K.saldo || 0), 'wallet'], ['Poin', '⭐ ' + (K.poin || 0).toLocaleString('id-ID'), 'wallet'], ['Kupon saya', jumlahKupon() + ' kupon', 'kuponSaya']].map(function (s, i) { return (i ? '<div style="width:1px;height:28px;background:var(--color-neutral-200,#e5ebe8)"></div>' : '') + '<button style="all:unset;cursor:pointer;flex:1;min-width:0;padding:0 8px"' + aksi('ke', s[2]) + '><div class="t-10 o-6">' + s[0] + '</div><div class="t-125 bold">' + s[1] + '</div></button>'; }).join('') + '</div>';
    /* menu cepat */
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px 6px">' + [['orders', '🧾', 'Transaksi', berjalan], ['wishlist', '❤️', 'Wishlist', K.wishlist.length], ['tokoFavorit', '🏪', 'Toko favorit', K.tokoFavorit.length], ['kuponSaya', '🎟️', 'Kupon saya', 0], ['rate', '⭐', 'Ulasan saya', ulasBelum], ['profileAlamat', '📍', 'Alamat', D.ADDRESSES.length], ['prepaid', '📅', 'Langganan', 0], ['wallet', '💳', 'Pembayaran', 0]].map(function (m) { return '<button style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;position:relative"' + aksi('ke', m[0]) + '><span style="width:50px;height:50px;border-radius:16px;background:var(--color-surface);display:grid;place-items:center;font-size:23px;box-shadow:0 1px 2px rgba(0,0,0,.05);position:relative">' + m[1] + (m[3] ? '<span class="tag tag-accent" style="position:absolute;top:-6px;right:-6px;padding:1px 6px;font-size:10px">' + m[3] + '</span>' : '') + '</span><span class="t-11" style="line-height:1.15">' + m[2] + '</span></button>'; }).join('') + '</div>';
    /* alamat & juru favorit */
    h += '<div>' + X.labelBagian(esc(tx('Saved addresses'))) + '<div class="stack gap-8">' + D.ADDRESSES.map(function (ad) { return '<button class="card" style="gap:4px;cursor:pointer;text-align:start;border:0;padding:10px 12px"' + aksi('pilihAlamat', ad.id) + '><div class="flex items-center gap-8"><span class="t-125 bold">' + esc(tx(ad.label)) + '</span>' + (K.alamat === ad.id ? '<span class="tag tag-accent" style="font-size:10px">' + esc(tx('Default')) + '</span>' : '') + '</div><div class="t-11 o-7">' + esc(ad.brief) + '</div></button>'; }).join('') + '</div></div>';
    var fav = X.daftarJuru().slice(0, 3);
    h += '<div>' + X.labelBagian(esc(tx('Favourite cleaners'))) + '<div class="hscroll" style="gap:8px">' + fav.map(function (c, i) { return '<button class="card" style="width:110px;align-items:center;gap:6px;cursor:pointer"' + aksi('pilihJasa', 'hourly') + '>' + X.avJuru(c, 40, i ? 'leaf' : null) + '<div class="t-12 bold">' + esc(X.namaDepan(c)) + '</div><div class="t-105 o-6">★ ' + esc(c.rating || '5,0') + '</div></button>'; }).join('') + '</div></div>';
    /* pengaturan */
    h += '<div>' + X.labelBagian('Pengaturan akun') + '<div class="card elev-sm gap-10">';
    D.SETTINGS.forEach(function (s) { var nilai = s.value === 'saved' ? D.PAYMENTS.length + ' ' + tx('saved') : s.value === 'lang' ? (langNow ? langNow.native : K.lang) : s.value === null ? (K.notifAktif ? tx('On') : tx('Off')) : tx(s.value); var label = s.label === 'Language' ? t('language') : tx(s.label); h += '<button class="setting"' + (s.sheet ? aksi('lembar', s.sheet) : s.go ? aksi('ke', s.go) : aksi(s.act)) + '><span class="grow left">' + esc(label) + '</span><span class="t-115 o-6">' + esc(nilai) + '</span><span class="o-45">›</span></button>'; });
    h += '</div></div>';
    h += '<div class="card card-clay elev-sm gap-10"><div class="flex items-center gap-10"><div class="grow"><div class="f-head t-15">Undang teman · kode DEWI50</div><div class="t-115 o-7">Rp50.000 untuk kamu dan temanmu setelah kunjungan pertamanya</div></div><button class="btn btn-primary" style="height:36px;padding:0 16px;font-size:12.5px"' + aksi('ke', 'share') + '>' + esc(tx('Share')) + '</button></div></div>';
    if (window.EXO_TOKO) h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('keToko') + '>Buka Seller Center (mitra toko) →</button>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('keMitra') + '>' + esc(tx('Open the partner app →')) + '</button><div class="spacer-26"></div></div></div>';
    return h;
  };
  X.LAYAR.profileAlamat = function () { K.lembar = 'alamat'; K.layar = 'profile'; return X.LAYAR.profile(); };

  /* ---------------------------------------------------- Wishlist & Toko favorit */
  X.diWishlist = function (id) { return K.wishlist.indexOf(id) >= 0; };
  X.tombolWishlist = function (id) { var on = X.diWishlist(id); return '<button class="btn btn-icon btn-secondary btn-plain" style="color:' + (on ? '#b12a5b' : 'inherit') + '"' + aksi('wishlistToggle', id) + ' aria-label="Wishlist">' + (on ? '♥' : '♡') + '</button>'; };
  A.wishlistToggle = function (id) { var i = K.wishlist.indexOf(id); if (i >= 0) { K.wishlist.splice(i, 1); X.sekilas('Dihapus dari wishlist.'); } else { K.wishlist.unshift(id); X.sekilas('Ditambahkan ke wishlist ♥'); } };
  X.LAYAR.wishlist = function () {
    var daftar = T() ? K.wishlist.map(function (id) { return T().katalogFilter('', 'semua', {}, null).daftar.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean) : [];
    var h = '<div class="screen"><div class="flex items-center gap-8" style="padding:18px 20px 10px"><h3 class="grow" style="margin:0">Wishlist</h3><span class="t-115 o-6">' + daftar.length + ' produk</span>' + X.tombolBahasa() + '</div><div class="stack gap-12 pad-x18">';
    if (!daftar.length) h += '<div class="card elev-sm" style="align-items:center;text-align:center;gap:6px;padding:26px 16px"><div style="font-size:40px">♡</div><div class="t-135 bold">Wishlist masih kosong</div><div class="t-115 o-6">Ketuk ♡ di halaman produk untuk menyimpannya di sini.</div><button class="btn btn-primary" style="height:34px;margin-top:6px"' + aksi('ke', 'toko') + '>Jelajahi Toko</button></div>';
    else h += '<div class="grid-2">' + daftar.map(function (p) { return '<div style="position:relative">' + X.kartuProduk(p) + '<button style="all:unset;cursor:pointer;position:absolute;top:8px;left:8px;width:28px;height:28px;border-radius:999px;background:#fff;display:grid;place-items:center;color:#b12a5b;box-shadow:0 1px 3px rgba(0,0,0,.2)"' + aksi('wishlistToggle', p.id) + ' aria-label="Hapus dari wishlist">♥</button></div>'; }).join('') + '</div>';
    if (T() && K.wishlist.length) h += '<div class="card card-leaf t-115 lh-15">Harga turun & flash sale untuk produk wishlist akan muncul di Notifikasi → Promo.</div>';
    var rek = T() ? T().rekomendasi(K.tokoDilihat || [], K.keranjang || [], 4) : [];
    if (rek.length) h += '<div>' + X.labelBagian('Mungkin kamu suka') + '<div class="grid-2">' + rek.map(function (p) { return X.kartuProduk(p); }).join('') + '</div></div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  X.diFavorit = function (id) { return K.tokoFavorit.indexOf(id) >= 0; };
  X.tombolFavorit = function (id) { var on = X.diFavorit(id); return '<button class="' + kelas('pill pill-sm', on) + '" style="flex:none"' + aksi('favoritToggle', id) + '>' + (on ? '✓ Diikuti' : '+ Ikuti') + '</button>'; };
  A.favoritToggle = function (id) { var i = K.tokoFavorit.indexOf(id); if (i >= 0) { K.tokoFavorit.splice(i, 1); X.sekilas('Berhenti mengikuti toko.'); } else { K.tokoFavorit.unshift(id); X.sekilas('Toko diikuti — promo toko akan muncul di Notifikasi.'); } };
  X.LAYAR.tokoFavorit = function () {
    var daftar = T() ? K.tokoFavorit.map(function (id) { return T().toko(id); }).filter(Boolean) : [];
    var h = '<div class="screen">' + X.kepala('Toko favorit', daftar.length + ' toko diikuti', 'profile') + '<div class="stack gap-10 pad-x18">';
    if (!daftar.length) h += '<div class="card elev-sm" style="align-items:center;text-align:center;gap:6px;padding:26px 16px"><div style="font-size:40px">🏪</div><div class="t-135 bold">Belum ada toko favorit</div><div class="t-115 o-6">Ketuk "Ikuti" di halaman toko untuk memantau promo dan produk barunya.</div><button class="btn btn-primary" style="height:34px;margin-top:6px"' + aksi('ke', 'toko') + '>Lihat toko</button></div>';
    daftar.forEach(function (tk) { var sk = T().skorToko(tk.id), pr = T().produkToko(tk.id).slice(0, 3); h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-10"><span class="av av-leaf" style="--s:40px;font-weight:800">' + esc(tk.nama.slice(0, 1)) + '</span><div class="grow" style="min-width:0"><button style="all:unset;cursor:pointer" class="t-125 bold"' + aksi('tokoLihat', tk.id) + '>' + esc(tk.nama) + '</button><div class="t-11 o-6">' + (tk.badge === 'official' ? 'Official Store' : sk.badge === 'power' ? 'Power Merchant' : 'Toko') + ' · ★ ' + sk.rating + ' · ' + esc(tk.kota) + '</div></div>' + X.tombolFavorit(tk.id) + '</div><div class="hscroll" style="gap:6px">' + pr.map(function (p) { return '<button class="card" style="width:110px;padding:8px;gap:4px;cursor:pointer;align-items:center"' + aksi('tokoProduk', p.id) + '><span style="font-size:26px">' + esc(p.ikon) + '</span><span class="t-105" style="line-height:1.2;text-align:center;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(p.nama) + '</span><b class="t-11">' + rp(T().hargaSetelahDiskon(p, null)) + '</b></button>'; }).join('') + '</div></div>'; });
    return h + '<div class="spacer-26"></div></div></div>';
  };

  /* ---------------------------------------------------- Kupon saya */
  function tiketKupon(k) {
    return '<div class="card elev-sm" style="flex-direction:row;gap:0;padding:0;overflow:hidden"><div style="width:84px;flex:none;background:' + k.warna + ';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:10px 6px;text-align:center"><span style="font-size:22px">' + k.ikon + '</span><b class="t-10" style="line-height:1.15">' + esc(k.jenisLabel) + '</b></div><div class="grow stack gap-3" style="padding:10px 12px;min-width:0"><div class="flex items-center gap-6"><b class="t-125 grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(k.judul) + '</b><span class="tag tag-neutral" style="font-size:10px">' + esc(k.kode) + '</span></div><div class="t-11 o-7">' + esc(k.syarat) + '</div><div class="flex items-center gap-6"><span class="t-10 o-6 grow">' + esc(k.masa) + '</span><button class="btn btn-primary" style="height:28px;padding:0 12px;font-size:11.5px"' + aksi(k.aksi, k.arg) + '>Pakai</button></div></div></div>';
  }
  X.LAYAR.kuponSaya = function () {
    var daftar = [];
    if (D.VOUCHER) daftar.push({ warna:'linear-gradient(135deg,#0b5f52,#1a9a86)', ikon:'🧹', jenisLabel:'Jasa kebersihan', judul:'Potongan ' + rp(D.VOUCHER.amount), kode:D.VOUCHER.code, syarat:'Min. transaksi jasa ' + rp(D.VOUCHER.min) + ' · 3 pemesanan pertama', masa:'Berlaku sampai 30 Sep 2026', aksi:'ke', arg:'catalog' });
    if (T()) window.EXO_DB.all('kuponToko').filter(function (k) { return k.aktif && k.terpakai < k.kuota && (!k.sampai || k.sampai >= new Date().toISOString().slice(0, 10)); }).forEach(function (k) { var tk = T().toko(k.tokoId); if (!tk || tk.status !== 'aktif') return; daftar.push({ warna:k.jenis === 'ongkir' ? 'linear-gradient(135deg,#0a8f5c,#12b981)' : 'linear-gradient(135deg,#7a3e9d,#b15ad9)', ikon:k.jenis === 'ongkir' ? '🚚' : '🏷️', jenisLabel:k.jenis === 'ongkir' ? 'Gratis ongkir' : 'Kupon toko', judul:(k.jenis === 'persen' ? 'Diskon ' + k.nilai + '%' : k.jenis === 'ongkir' ? 'Potongan ongkir ' + rp(k.nilai) : 'Potongan ' + rp(k.nilai)) + ' · ' + tk.nama, kode:k.kode, syarat:'Min. belanja ' + rp(k.minBelanja) + ' di ' + tk.nama + ' · sisa ' + (k.kuota - k.terpakai), masa:k.sampai ? 'Berlaku sampai ' + k.sampai : 'Tanpa batas waktu', aksi:'kuponPakai', arg:k.kode + ':' + k.tokoId }); });
    var h = '<div class="screen">' + X.kepala('Kupon saya', daftar.length + ' kupon bisa dipakai', 'profile') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="flex gap-6"><input class="input" style="flex:1;height:38px" data-simpan="kuponKodeMasuk" value="' + esc(K.kuponKodeMasuk || '') + '" placeholder="Masukkan kode kupon"><button class="btn btn-secondary" style="height:38px"' + aksi('kuponKlaim') + '>Klaim</button></div>';
    if (!daftar.length) h += '<div class="card elev-sm t-125 o-7">Belum ada kupon yang bisa dipakai.</div>';
    h += daftar.map(tiketKupon).join('');
    h += '<div class="card card-leaf t-115 lh-15">Kupon toko otomatis diperiksa saat checkout; kupon jasa dipakai di langkah pembayaran. Satu kupon per toko per transaksi.</div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.kuponPakai = function (arg) { var p = arg.split(':'); K.tokoKupon = p[0]; K.tokoLihatId = p[1]; K.layar = 'tokoProfil'; X.sekilas('Kupon ' + p[0] + ' siap dipakai saat checkout di toko ini.'); };
  A.kuponKlaim = function () { var kode = String(K.kuponKodeMasuk || '').trim().toUpperCase(); if (!kode) return; var ada = (D.VOUCHER && D.VOUCHER.code === kode) || (T() && window.EXO_DB.all('kuponToko').some(function (k) { return k.aktif && k.kode.toUpperCase() === kode; })); X.sekilas(ada ? 'Kupon ' + kode + ' tersedia di daftar.' : 'Kode ' + kode + ' tidak ditemukan atau sudah habis.', ada ? '' : 'err'); K.kuponKodeMasuk = ''; };

  /* ---------------------------------------------------- Notifikasi */
  X.LAYAR.notifikasi = function () {
    var trx = semuaTransaksi().filter(function (x) { return x.status === 'berjalan'; }).slice(0, 6), promo = [], info = [];
    if (T()) { var kup = window.EXO_DB.all('kuponToko').filter(function (k) { return k.aktif && k.terpakai < k.kuota; }).slice(0, 3); kup.forEach(function (k) { var tk = T().toko(k.tokoId); if (tk) promo.push({ judul:'Kupon ' + k.kode + ' dari ' + tk.nama, isi:(k.jenis === 'persen' ? 'Diskon ' + k.nilai + '%' : 'Potongan ' + rp(k.nilai)) + ' · min. belanja ' + rp(k.minBelanja), ke:'kuponSaya', waktu:'Hari ini' }); }); var fs = T().katalogFilter('', 'semua', { diskon:true }, null).daftar.slice(0, 2); fs.forEach(function (p) { promo.push({ judul:'⚡ Flash sale: ' + p.nama, isi:'Diskon ' + p.diskonPct + '% · ' + rp(T().hargaSetelahDiskon(p, null)) + (X.diWishlist(p.id) ? ' · ada di wishlist-mu' : ''), ke:'toko', waktu:'Hari ini' }); }); }
    D.NOTIFS.forEach(function (n) { info.push({ judul:n.title, isi:n.body, ke:'orders', waktu:n.time }); });
    var daftar = K.notifTab === 'transaksi' ? trx.map(function (x) { return { judul:KAT[x.jenis][0] + ' ' + x.judul, isi:x.statusLabel + ' · ' + x.sub, ke:'orders', waktu:tglId(x.tgl) }; }) : K.notifTab === 'promo' ? promo : info;
    var h = '<div class="screen">' + X.kepala('Notifikasi', '', 'home') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="flex gap-6">' + [['transaksi', 'Transaksi', trx.length], ['promo', 'Promo', promo.length], ['info', 'Info', info.length]].map(function (s) { return '<button class="' + kelas('pill pill-sm', K.notifTab === s[0]) + '"' + aksi('notifTab', s[0]) + '>' + s[1] + (s[2] ? ' · ' + s[2] : '') + '</button>'; }).join('') + '</div>';
    if (!K.notifAktif) h += '<div class="card card-clay t-115 lh-15">Notifikasi dimatikan di Akun → Pengaturan. Kamu tidak akan menerima kabar pesanan, termasuk perubahan jadwal.</div>';
    if (!daftar.length) h += '<div class="card elev-sm t-125 o-7">Tidak ada notifikasi di tab ini.</div>';
    h += daftar.map(function (n) { return '<button class="card elev-sm gap-3" style="text-align:start;cursor:pointer"' + aksi('ke', n.ke) + '><div class="flex items-center gap-8"><div class="grow t-125 bold" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.judul) + '</div><span class="t-10 o-6" style="flex:none">' + esc(n.waktu) + '</span></div><div class="t-115 lh-14 o-8">' + esc(n.isi) + '</div></button>'; }).join('');
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.notifTab = function (v) { K.notifTab = v; };
})(ExoApp);
