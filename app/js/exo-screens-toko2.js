/* ==========================================================================
   exo-screens-toko2.js — jelajah & keranjang marketplace (pola Tokopedia)
   --------------------------------------------------------------------------
   · Katalog `toko`: bilah cari + "Dikirim ke <alamat>" + tombol Filter/Urutkan,
     bagian "Lanjut eksplor" (terakhir dilihat) dan "Buat kamu" (rekomendasi),
     kartu produk: badge −%, label GRATIS ONGKIR / PLUS-kupon, nama 2 baris,
     harga tebal, chip "+Diskon", rating · terjual, kota toko.
   · Lembar Filter: gratis ongkir, jarak toko ke alamat (5/20 km), lokasi,
     jenis toko (Official/Power), harga (min–maks + preset tertil), rating ≥4,
     penawaran (harga diskon, kupon toko), kondisi, terakhir ditambahkan,
     lainnya (stok tersedia, preorder), durasi pengiriman (instan/same day).
   · Keranjang `keranjangDaftar`: pilih per produk & per toko, "N produk
     terpilih · Hapus", dropdown varian, harga coret + %, "Hemat Rp… pakai
     Gratis Ongkir", sisa stok, tempat sampah + stepper, bilah "Beli (N)".
   Memakai mesin EXO_TOKO (katalogFilter, ATURAN) dan layar Checkout yang ada.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, rp = X.rp, A = X.AKSI, T = function () { return window.EXO_TOKO; };
  K.tokoFilter = K.tokoFilter || { gratisOngkir:false, radius:0, kota:[], jenis:[], hargaMin:'', hargaMaks:'', rating4:false, diskon:false, kupon:false, kondisi:[], hari:0, stok:false, preorder:false, durasi:[], urut:'terkait' };
  K.tokoDilihat = K.tokoDilihat || [];
  var URUT = [['terkait','Paling sesuai'],['terbaru','Terbaru'],['terlaris','Terlaris'],['termurah','Harga terendah'],['termahal','Harga tertinggi'],['rating','Rating tertinggi']];
  function kerangka(judul, isi, kaki) { return '<div class="sheet-back' + (X.lembarBaru() ? ' baru' : '') + '"' + aksi('tutupLembar') + '><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(judul) + '" data-diam="1"><div class="sheet-grip"></div><div class="sheet-head"><div class="sheet-title">' + judul + '</div><button class="btn btn-icon btn-soft"' + aksi('tutupLembar') + ' aria-label="Tutup">✕</button></div><div class="sheet-body">' + isi + '</div>' + (kaki ? '<div class="sheet-foot">' + kaki + '</div>' : '') + '</div></div>'; }
  function badgeToko(t) { return t.badge === 'official' ? '<span class="tag tag-accent" style="font-size:10px">Official</span>' : t.badge === 'power' ? '<span class="tag tag-accent-2" style="font-size:10px">Power</span>' : ''; }
  function jumlahFilter() { var f = K.tokoFilter, n = 0; ['gratisOngkir','rating4','diskon','kupon','stok','preorder'].forEach(function (k) { if (f[k]) n++; }); ['kota','jenis','kondisi','durasi'].forEach(function (k) { n += (f[k] || []).length; }); if (f.radius) n++; if (f.hargaMin || f.hargaMaks) n++; if (f.hari) n++; return n; }
  function jumlahKeranjang() { return K.keranjang.reduce(function (n, it) { return n + it.qty; }, 0); }
  function tombolKeranjang() { var n = jumlahKeranjang(); return '<button class="btn btn-icon btn-secondary btn-plain" style="position:relative"' + aksi('ke', 'keranjangDaftar') + ' aria-label="Keranjang">🛒' + (n ? '<span class="tag tag-accent" style="position:absolute;top:-6px;right:-6px;padding:1px 6px;font-size:10px">' + n + '</span>' : '') + '</button>'; }

  /* ---- kartu produk ala feed ---- */
  function kartuProduk(p, lebar) {
    var harga = T().hargaSetelahDiskon(p, null), gratis = harga >= T().ATURAN.gratisOngkirMin, kupon = p.adaKupon;
    return '<button class="card elev-sm" style="text-align:start;cursor:pointer;padding:0;overflow:hidden;gap:0' + (lebar ? ';min-width:' + lebar + 'px' : '') + '"' + aksi('tokoProduk', p.id) + '><div style="position:relative;background:var(--color-surface);height:110px;display:grid;place-items:center;font-size:44px">' + p.ikon + (p.diskonPct ? '<span style="position:absolute;top:8px;right:8px;background:#b12a5b;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px">−' + p.diskonPct + '%</span>' : '') + (gratis ? '<span style="position:absolute;left:0;bottom:8px;background:#0a8f5c;color:#fff;font-size:9px;font-weight:800;padding:3px 7px;border-radius:0 6px 6px 0;line-height:1.1">GRATIS<br>ONGKIR</span>' : kupon ? '<span style="position:absolute;left:0;bottom:8px;background:#0a8f5c;color:#fff;font-size:10px;font-weight:800;padding:3px 7px;border-radius:0 6px 6px 0">PLUS</span>' : '') + (p.preorder ? '<span class="tag tag-neutral" style="position:absolute;left:8px;top:8px;font-size:9px">Preorder</span>' : '') + '</div><div class="stack gap-3" style="padding:8px 10px 10px"><div class="t-12 lh-14" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:34px">' + esc(p.nama) + '</div><div class="flex items-center gap-6 wrap"><b class="t-135" style="color:#b12a5b">' + rp(harga) + '</b>' + (p.diskonPct ? '<span class="t-11 o-6" style="text-decoration:line-through">' + rp(p.harga) + '</span>' : '') + '</div>' + (kupon ? '<span class="tag" style="background:#fff4d6;color:#7a5200;font-size:10px;align-self:flex-start">🎟️ +Kupon toko</span>' : '') + '<div class="t-11 o-7">⭐ ' + (p.rating || '—') + ' · ' + (p.terjual || 0) + ' terjual' + (p.stok <= 5 && p.stok > 0 ? ' · sisa ' + p.stok : p.stok <= 0 ? ' · habis' : '') + '</div><div class="t-11 o-6">' + esc(p.toko.kota || '') + (p.jarakKm != null ? ' · ' + p.jarakKm + ' km' : '') + '</div></div></button>';
  }
  X.kartuProduk = kartuProduk;
  X.LAYAR.toko = function () {
    var f = K.tokoFilter, alamat = X.alamatKini(), titik = alamat && alamat.point, hasil = T().katalogFilter(K.tokoCari, K.tokoKategori, f, titik), daftar = hasil.daftar, toko = T().semuaToko().filter(function (t) { return t.status === 'aktif'; });
    var h = '<div class="screen">' + X.kepala('Toko perlengkapan', toko.length + ' toko mitra · chemical, alat, APD sesuai SOP', 'home', tombolKeranjang()) + '<div class="stack gap-12 pad-x18">';
    h += '<div class="searchbox">🔍<input data-simpan="tokoCari" data-gambar="1" value="' + esc(K.tokoCari) + '" placeholder="Cari produk atau toko" aria-label="Cari produk">' + (K.tokoCari ? '<button class="hapus"' + aksi('tokoCariHapus') + ' aria-label="Hapus">✕</button>' : '') + '</div>';
    h += '<button class="flex items-center gap-6 t-125" style="all:unset;cursor:pointer;display:flex"' + aksi('lembar', 'alamat') + '><span>📍</span><span class="o-7">Dikirim ke</span><b>' + esc(alamat.label) + ', ' + esc((X.namaDepan && X.namaDepan({ name:'Dewi Anggraini' })) || 'Dewi') + '</b><span class="o-6">⌄</span></button>';
    h += '<div class="flex gap-8 items-center"><button class="pill pill-sm"' + aksi('lembar', 'tokoFilter') + '>⚙ Filter' + (jumlahFilter() ? ' · ' + jumlahFilter() : '') + '</button><button class="pill pill-sm"' + aksi('lembar', 'tokoUrut') + '>⇅ ' + esc(URUT.filter(function (u) { return u[0] === f.urut; })[0][1]) + '</button>' + (f.gratisOngkir ? '<span class="tag tag-accent" style="font-size:10px">Gratis ongkir</span>' : '') + (jumlahFilter() ? '<button class="btn btn-ghost t-11"' + aksi('tokoFilterReset') + '>Reset</button>' : '') + '</div>';
    h += '<div class="hscroll" style="gap:6px">' + [['semua','Semua']].concat(T().KATEGORI).map(function (k) { return '<button class="' + kelas('pill pill-sm', K.tokoKategori === k[0]) + '"' + aksi('tokoKategori', k[0]) + '>' + esc(k[1]) + '</button>'; }).join('') + '</div>';
    /* Lanjut eksplor: terakhir dilihat */
    var dilihat = K.tokoDilihat.map(function (id) { return T().produk(id); }).filter(function (p) { return p && p.status === 'aktif'; }).slice(0, 8);
    if (!K.tokoCari && K.tokoKategori === 'semua' && !jumlahFilter() && dilihat.length) { h += '<div><div class="f-head t-16" style="margin-bottom:8px">Lanjut eksplor</div><div class="hscroll" style="gap:8px">' + dilihat.map(function (p) { return kartuProduk(Object.assign({ adaKupon:hasil.kuponToko[p.tokoId] }, p), 150); }).join('') + '</div></div>'; }
    /* Buat kamu: rekomendasi */
    if (!K.tokoCari && K.tokoKategori === 'semua' && !jumlahFilter()) { var rek = T().rekomendasi(K.tokoDilihat, K.keranjang, 6); h += '<div><div class="f-head t-16" style="margin-bottom:2px;color:#0a8f5c">Buat kamu</div><div style="width:64px;height:2px;background:#0a8f5c;margin-bottom:8px"></div><div class="grid-2">' + rek.map(function (p) { return kartuProduk(Object.assign({ adaKupon:hasil.kuponToko[p.tokoId] }, p)); }).join('') + '</div></div><div class="f-head t-16">Semua produk · ' + daftar.length + '</div>'; }
    else h += '<div class="t-115 o-6">' + daftar.length + ' produk' + (K.tokoCari ? ' untuk "' + esc(K.tokoCari) + '"' : '') + '</div>';
    h += '<div class="grid-2">' + daftar.map(function (p) { return kartuProduk(p); }).join('') + (daftar.length ? '' : '<div class="card elev-sm t-125 o-7" style="grid-column:1/-1">Tidak ada produk yang cocok. Coba longgarkan filter.</div>') + '</div>';
    h += '<div class="t-11 o-6" style="margin-top:4px">Toko mitra: ' + toko.map(function (t) { return '<button class="btn btn-ghost t-11"' + aksi('tokoLihat', t.id) + '>' + esc(t.nama) + '</button>'; }).join(' · ') + '</div><div class="spacer-14"></div></div></div>';
    return h;
  };
  A.tokoCariHapus = function () { K.tokoCari = ''; };
  A.tokoFilterReset = function () { K.tokoFilter = { gratisOngkir:false, radius:0, kota:[], jenis:[], hargaMin:'', hargaMaks:'', rating4:false, diskon:false, kupon:false, kondisi:[], hari:0, stok:false, preorder:false, durasi:[], urut:K.tokoFilter.urut }; };
  A.tokoUrut = function (v) { K.tokoFilter.urut = v; K.lembar = null; };
  A.tokoFilterToggle = function (v) { var p = v.split(':'), f = K.tokoFilter, k = p[0], nilai = p[1]; if (nilai === undefined) f[k] = !f[k]; else if (Array.isArray(f[k])) { var i = f[k].indexOf(nilai); if (i >= 0) f[k].splice(i, 1); else f[k].push(nilai); } else f[k] = f[k] === (isNaN(nilai) ? nilai : Number(nilai)) ? (typeof f[k] === 'number' ? 0 : '') : (isNaN(nilai) ? nilai : Number(nilai)); };
  A.tokoHargaPreset = function (v) { var p = v.split('-'); K.tokoFilter.hargaMin = p[0]; K.tokoFilter.hargaMaks = p[1]; };
  var _tokoProdukLama = A.tokoProduk;
  A.tokoProduk = function (id) { K.tokoDilihat = [id].concat(K.tokoDilihat.filter(function (x) { return x !== id; })).slice(0, 12); _tokoProdukLama(id); };

  X.LEMBAR.tokoFilter = function () {
    var f = K.tokoFilter, alamat = X.alamatKini(), info = T().infoFilter(), pil = function (on, label, v) { return '<button class="' + kelas('pill pill-sm', on) + '"' + aksi('tokoFilterToggle', v) + '>' + label + '</button>'; }, bag = function (judul, isi, kanan) { return '<div class="stack gap-6" style="margin-bottom:12px"><div class="flex items-center gap-8"><b class="t-135 grow">' + judul + '</b>' + (kanan || '') + '</div><div class="flex gap-6 wrap">' + isi + '</div></div>'; };
    var h = bag('Gratis Ongkir', pil(f.gratisOngkir, '🚚 Gratis Ongkir', 'gratisOngkir'));
    h += bag('Jarak toko ke alamatmu', pil(f.radius === 5, 'Radius 5 km', 'radius:5') + pil(f.radius === 20, 'Radius 20 km', 'radius:20') + '<span class="t-11 o-6" style="align-self:center">dari ' + esc(alamat.label) + '</span>');
    h += bag('Lokasi', info.kota.map(function (k) { return pil(f.kota.indexOf(k) >= 0, esc(k), 'kota:' + k); }).join(''));
    h += bag('Jenis toko', pil(f.jenis.indexOf('official') >= 0, '✓ Official Store', 'jenis:official') + pil(f.jenis.indexOf('power') >= 0, 'Power Merchant', 'jenis:power'));
    h += '<div class="stack gap-6" style="margin-bottom:12px"><b class="t-135">Harga</b><div class="flex gap-8 items-center"><div class="searchbox" style="padding:7px 12px">Rp<input inputmode="numeric" data-simpan="tokoFilter.hargaMin" data-gambar="1" value="' + esc(f.hargaMin) + '" placeholder="Harga terendah"></div><span class="o-6">—</span><div class="searchbox" style="padding:7px 12px">Rp<input inputmode="numeric" data-simpan="tokoFilter.hargaMaks" data-gambar="1" value="' + esc(f.hargaMaks) + '" placeholder="Harga tertinggi"></div></div><div class="flex gap-6 wrap">' + info.preset.map(function (r) { var on = String(f.hargaMin) === String(r[0]) && String(f.hargaMaks) === String(r[1]); return '<button class="' + kelas('pill pill-sm', on) + '"' + aksi('tokoHargaPreset', r[0] + '-' + r[1]) + '>' + rp(r[0]) + ' – ' + rp(r[1]) + '</button>'; }).join('') + '</div></div>';
    h += bag('Rating 4 ke atas', pil(f.rating4, '⭐ Rating 4 ke atas', 'rating4'));
    h += bag('Penawaran', pil(f.diskon, 'Harga diskon', 'diskon') + pil(f.kupon, 'Ada kupon toko', 'kupon'));
    h += bag('Kondisi', pil(f.kondisi.indexOf('baru') >= 0, 'Baru', 'kondisi:baru') + pil(f.kondisi.indexOf('bekas') >= 0, 'Bekas', 'kondisi:bekas'));
    h += bag('Terakhir ditambahkan', [[7, '7 hari'], [14, '14 hari'], [30, '1 bulan'], [90, '3 bulan']].map(function (x) { return pil(f.hari === x[0], x[1], 'hari:' + x[0]); }).join(''));
    h += bag('Lainnya', pil(f.stok, 'Stok tersedia', 'stok') + pil(f.preorder, 'Preorder', 'preorder'));
    h += bag('Durasi pengiriman', pil(f.durasi.indexOf('instan') >= 0, 'Instan', 'durasi:instan') + pil(f.durasi.indexOf('sameday') >= 0, 'Same day', 'durasi:sameday') + pil(f.durasi.indexOf('ambil') >= 0, 'Ambil di toko', 'durasi:ambil'));
    var n = T().katalogFilter(K.tokoCari, K.tokoKategori, f, alamat && alamat.point).daftar.length;
    return kerangka('Filter', h, '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('tokoFilterReset') + '>Reset</button><button class="btn btn-primary" style="flex:2"' + aksi('tutupLembar') + '>Tampilkan ' + n + ' produk</button></div>');
  };
  X.LEMBAR.tokoUrut = function () { return kerangka('Urutkan', URUT.map(function (u) { var on = K.tokoFilter.urut === u[0]; return '<button class="' + kelas('row', on) + '"' + aksi('tokoUrut', u[0]) + '><span class="row-main"><b>' + esc(u[1]) + '</b></span><span class="' + kelas('dot', on) + '"></span></button>'; }).join('')); };

  /* ---- keranjang dengan pilihan ---- */
  function terpilih() { return K.keranjang.filter(function (it) { return it.pilih !== false; }); }
  X.LAYAR.keranjangDaftar = function () {
    var h = '<div class="screen">' + X.kepala('Keranjang', jumlahKeranjang() + ' barang', 'toko') + '<div class="stack gap-12 pad-x18">';
    if (!K.keranjang.length) return h + '<div class="card elev-sm t-125 o-7">Keranjang kosong. <button class="btn btn-ghost t-125"' + aksi('ke', 'toko') + '>Lihat produk →</button></div></div></div>';
    var per = {}; K.keranjang.forEach(function (it) { var p = T().produk(it.produkId); if (!p) return; (per[p.tokoId] = per[p.tokoId] || { toko:p.toko, items:[] }).items.push({ it:it, p:p }); });
    var nPilih = terpilih().length, semuaPilih = nPilih === K.keranjang.length;
    h += '<div class="flex items-center gap-8 t-125"><button class="flex items-center gap-8" style="all:unset;cursor:pointer;display:flex"' + aksi('keranjangPilihSemua') + '>' + kotak(semuaPilih) + '<span>' + nPilih + ' produk terpilih</span></button><button class="btn btn-ghost t-125" style="margin-inline-start:auto;color:#0a8f5c"' + (nPilih ? aksi('keranjangHapusTerpilih') : ' disabled') + '>Hapus</button></div>';
    var r = nPilih ? T().hitungKeranjang(terpilih(), '', K.tokoKurir, K.tokoTarif, {}) : null;
    Object.keys(per).forEach(function (tid) {
      var g = per[tid], semuaToko = g.items.every(function (x) { return x.it.pilih !== false; }), rt = r && r.toko.filter(function (x) { return x.toko.id === tid; })[0], sub = g.items.filter(function (x) { return x.it.pilih !== false; }).reduce(function (n, x) { var v = x.p.varian.filter(function (q) { return q.nama === x.it.varian; })[0] || x.p.varian[0]; return n + T().hargaSetelahDiskon(x.p, v) * x.it.qty; }, 0), gratis = sub >= T().ATURAN.gratisOngkirMin;
      h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><button style="all:unset;cursor:pointer;display:flex"' + aksi('keranjangPilihToko', tid) + '>' + kotak(semuaToko) + '</button><b class="t-125 grow">' + esc(g.toko.nama) + '</b>' + badgeToko(g.toko) + (gratis ? '<span style="color:#0a8f5c;font-size:10px;font-weight:800">GRATIS ONGKIR</span>' : '') + '</div>';
      g.items.forEach(function (x) { var it = x.it, p = x.p, v = p.varian.filter(function (q) { return q.nama === it.varian; })[0] || p.varian[0], harga = T().hargaSetelahDiskon(p, v), on = it.pilih !== false, kunci = it.produkId + '|' + it.varian;
        h += '<div class="flex items-start gap-8"><button style="all:unset;cursor:pointer;display:flex;margin-top:14px"' + aksi('keranjangPilih', kunci) + '>' + kotak(on) + '</button><div style="font-size:30px;line-height:1;width:44px;height:44px;display:grid;place-items:center;background:var(--color-surface);border-radius:10px">' + p.ikon + '</div><div class="grow" style="min-width:0"><div class="t-125 lh-14" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.nama) + '</div>' + (p.varian.length > 1 ? '<select class="input" style="height:28px;padding:0 8px;font-size:11px;width:auto;max-width:100%" data-ubah="keranjangVarian" data-arg="' + esc(kunci) + '">' + p.varian.map(function (q) { return '<option value="' + esc(q.nama) + '"' + (q.nama === v.nama ? ' selected' : '') + (q.stok ? '' : ' disabled') + '>' + esc(q.nama) + (q.stok ? '' : ' · habis') + '</option>'; }).join('') + '</select>' : '<div class="t-11 o-6">' + esc(v.nama) + '</div>') + (p.diskonPct >= 15 ? '<span class="tag" style="background:#fde2ea;color:#b12a5b;font-size:10px">⚡ Flash sale</span>' : '') + '<div class="flex items-center gap-6" style="margin-top:2px">' + (p.diskonPct ? '<span class="t-11 o-6" style="text-decoration:line-through">' + rp(v.harga) + '</span><span class="t-11" style="color:#b12a5b;font-weight:700">' + p.diskonPct + '%</span>' : '') + '<b class="t-135">' + rp(harga) + '</b></div>' + (v.stok <= 5 ? '<div class="t-11" style="color:#b12a5b">Sisa ' + v.stok + '</div>' : '') + '</div><div class="stack gap-4 items-end" style="flex:none"><div class="flex items-center gap-4"><button class="pill pill-sm"' + aksi('keranjangHapusItem', kunci) + ' aria-label="Hapus">🗑</button><button class="pill pill-sm"' + aksi('keranjangQty', it.produkId + '|' + it.varian + '|-1') + '>−</button><b style="min-width:18px;text-align:center">' + it.qty + '</b><button class="pill pill-sm"' + aksi('keranjangQty', it.produkId + '|' + it.varian + '|1') + (it.qty >= v.stok ? ' disabled' : '') + '>+</button></div></div></div>'; });
      if (rt && rt.diskonOngkir) h += '<div class="t-11" style="color:#0a8f5c">🚚 Hemat ' + rp(rt.diskonOngkir) + ' pakai Gratis Ongkir</div>';
      h += '</div>';
    });
    var diskonTotal = r ? r.ringkas.diskonProduk + r.ringkas.diskonOngkir : 0;
    h += '<div class="spacer-14"></div></div><div class="actionbar actionbar--tight" style="align-items:center"><div class="grow"><div class="f-head t-18" style="color:#b12a5b">' + rp(r ? r.total : 0) + '</div><div class="t-11 o-7">' + (diskonTotal ? 'Total diskon ' + rp(diskonTotal) + ' ⌄' : nPilih + ' produk · ongkir & asuransi dihitung di checkout') + '</div></div><button class="btn btn-primary" style="height:44px;padding:0 22px"' + (nPilih ? aksi('ke', 'keranjang') : ' disabled') + '>Beli (' + nPilih + ')</button></div></div>';
    return h;
  };
  function kotak(on) { return '<span style="width:22px;height:22px;border-radius:6px;display:inline-grid;place-items:center;flex:none;border:2px solid ' + (on ? '#0a8f5c' : 'var(--color-neutral-300, #cbd5d1)') + ';background:' + (on ? '#0a8f5c' : 'transparent') + ';color:#fff;font-size:13px">' + (on ? '✓' : '') + '</span>'; }
  A.keranjangPilih = function (kunci) { var p = kunci.split('|'); K.keranjang.forEach(function (it) { if (it.produkId === p[0] && it.varian === p[1]) it.pilih = it.pilih === false; }); };
  A.keranjangPilihToko = function (tid) { var target = K.keranjang.filter(function (it) { var p = T().produk(it.produkId); return p && p.tokoId === tid; }), semua = target.every(function (it) { return it.pilih !== false; }); target.forEach(function (it) { it.pilih = !semua; }); };
  A.keranjangPilihSemua = function () { var semua = K.keranjang.every(function (it) { return it.pilih !== false; }); K.keranjang.forEach(function (it) { it.pilih = !semua; }); };
  A.keranjangHapusTerpilih = function () { var n = terpilih().length; K.keranjang = K.keranjang.filter(function (it) { return it.pilih === false; }); X.sekilas(n + ' produk dihapus dari keranjang.'); };
  A.keranjangHapusItem = function (kunci) { var p = kunci.split('|'); K.keranjang = K.keranjang.filter(function (it) { return !(it.produkId === p[0] && it.varian === p[1]); }); };
  A.keranjangVarian = function (kunci, v) { var p = kunci.split('|'), it = K.keranjang.filter(function (x) { return x.produkId === p[0] && x.varian === p[1]; })[0]; if (!it) return; var lain = K.keranjang.filter(function (x) { return x !== it && x.produkId === p[0] && x.varian === v; })[0]; if (lain) { lain.qty += it.qty; K.keranjang = K.keranjang.filter(function (x) { return x !== it; }); } else it.varian = v; X.gambar(); };
  /* ---- checkout gabungan: jasa kebersihan + produk ---- */
  A.jasaKeKeranjang = function () {
    var I = X.I; K.keranjangJasa = { jasa:K.jasa, jam:K.jam, regu:K.regu, hari:K.hari, mulai:K.mulai, tambahan:JSON.parse(JSON.stringify(K.tambahan || {})), juru:K.juru, alamatId:K.alamat, total:X.totalN(), tahan:X.ditahanDulu(), nama:I.svcName(K.jasa), slot:X.ringkasSlot(), juruNama:X.juruKini().name, dibuat:Date.now() };
    K.payPinOpen = false; K.payPin = ''; K.layar = K.keranjang.length ? 'keranjang' : 'toko';
    X.sekilas('Jasa ' + K.keranjangJasa.nama + ' masuk keranjang · pilih produk, lalu bayar sekaligus.');
  };
  A.jasaGabunganHapus = function () { K.keranjangJasa = null; X.sekilas('Jasa dikeluarkan dari checkout gabungan — pesan terpisah lewat alur jasa.'); };
  A.jasaAlamat = function (id) { if (K.keranjangJasa) K.keranjangJasa.alamatId = id; };
  A.tokoAlamatToko = function (v) { var p = v.split('|'); K.tokoOpsi.alamatToko = K.tokoOpsi.alamatToko || {}; K.tokoOpsi.alamatToko[p[0]] = p[1]; K.tokoKurir = K.tokoKurir || {}; delete K.tokoKurir[p[0]]; };
  /* Dipanggil tokoBayar setelah pesanan produk dibuat: pulihkan snapshot jasa,
     tahan/potong dompet untuk jasa, lalu jalankan penyelesaian jasa yang sama
     dengan alur pesan biasa (tulis orders, langganan, layar sukses). */
  A.jasaGabunganSelesai = function (hasil) {
    var Jk = K.keranjangJasa; if (!Jk) return; var metode = (hasil && hasil.metode) || 'wallet';
    K.jasa = Jk.jasa; K.jam = Jk.jam; K.regu = Jk.regu; K.hari = Jk.hari; K.mulai = Jk.mulai; K.tambahan = Jk.tambahan; K.juru = Jk.juru; K.alamat = Jk.alamatId; K.bayar = metode;
    var n = Jk.total;
    if (Jk.tahan) X.tahanDana(n, metode, metode === 'wallet' ? undefined : { mode:'tunda', orderId:'EXO-' + Date.now().toString().slice(-6) });
    else if (metode === 'wallet') { K.saldo -= n; K.mutasi.unshift({ label:Jk.nama + ' · ' + Jk.juruNama, date:'today · checkout gabungan', amount:-n }); }
    K.gabunganTerakhir = { pesanan:(hasil && hasil.pesanan || []).map(function (o) { return o.no; }), metode:metode, at:Date.now() };
    K.keranjangJasa = null;
    if (X.selesaiBayarJasa) X.selesaiBayarJasa();
  };
  var _successLama = X.LAYAR.success;
  X.LAYAR.success = function () {
    var h = _successLama(); var g = K.gabunganTerakhir; if (!g || !g.pesanan.length || Date.now() - g.at > 600000) return h;
    var kartu = '<button class="card card-leaf gap-3" style="text-align:start;cursor:pointer;width:100%;margin-top:12px"' + aksi('ke', 'pesananToko') + '><div class="flex items-center gap-8"><span class="tag tag-accent">Checkout gabungan</span><span class="t-11 o-6" style="margin-inline-start:auto">Lihat →</span></div><div class="t-125">' + g.pesanan.length + ' pesanan produk juga dibuat (' + esc(g.pesanan.join(', ')) + ')' + (g.metode === 'wallet' ? '' : ' · selesaikan pembayaran ' + esc(String(g.metode).toUpperCase()) + ' di Pesanan toko') + '.</div></button>';
    var i = h.lastIndexOf('</div></div>'); return i > 0 ? h.slice(0, i) + kartu + h.slice(i) : h + kartu;
  };
})(ExoApp);
