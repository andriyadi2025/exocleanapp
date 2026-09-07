/* ==========================================================================
   exo-screens-toko-iklan.js — Iklan toko (Seller Center) & slot iklan pelanggan
   --------------------------------------------------------------------------
   Seller Center → Iklan (tiklan): saldo iklan & isi ulang (saldo toko /
   gateway simulasi), buat iklan produk / iklan toko (kata kunci, bid per
   klik, anggaran harian, durasi), daftar iklan dengan tayang · klik · CTR ·
   biaya · konversi · ROAS, jeda/lanjut/hapus, ubah bid & anggaran.
   Sisi pelanggan: X.kartuIklanDaftar(konteks, q) merangkai kartu produk
   berlabel "Iklan" untuk feed Toko, beranda, dan halaman produk; klik
   memotong saldo iklan (EXO_IKLAN.klik) lalu membuka produk/toko.
   Konversi dicatat dengan membungkus EXO_TOKO.checkout.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, A = X.AKSI;
  var T = function () { return window.EXO_TOKO; }, I = function () { return window.EXO_IKLAN; }, rp = function (n) { return I().rp(n); };
  if (!window.EXO_TOKO || !window.EXO_IKLAN) return;
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  function tokoSaya() { var a = aku(), semua = T().semuaToko(); return semua.filter(function (t) { return t.pemilikId && t.pemilikId === a.id; })[0] || (K.tokoSayaId ? T().toko(K.tokoSayaId) : null) || semua[0]; }
  var CHIP = { moderasi:'tag-neutral', aktif:'tag-accent-2', dijeda:'tag-neutral', ditolak:'tag-neutral', habis:'tag-neutral', selesai:'tag-neutral' };

  /* ---------------------------------------------------- sisi pelanggan */
  function kartuIklan(hasil) {
    var ik = hasil.iklan, p0 = hasil.produk, label = I().pengaturan().label || 'Iklan'; if (!p0 || !X.kartuProduk || !hasil.toko) return '';
    /* kartuProduk memakai baris katalog yang sudah diperkaya (toko, hargaJual, adaKupon) — lengkapi baris mentah dari EXO_DB. */
    var alamat = X.alamatKini ? X.alamatKini() : null, p = Object.assign({ toko:hasil.toko }, p0); p.hargaJual = T().hargaSetelahDiskon(p, null); p.adaKupon = !!T().kuponToko(p.tokoId).filter(function (k) { return k.aktif; }).length; p.jarakKm = alamat && alamat.point ? T().jarakKm(alamat.point, hasil.toko) : null;
    var h = X.kartuProduk(p).replace('data-aksi="tokoProduk" data-arg="' + p.id + '"', 'data-aksi="iklanKlik" data-arg="' + ik.id + ':' + p.id + ':' + (ik.jenis === 'toko' ? 'toko' : 'produk') + '"');
    return h.replace('<div class="stack gap-3" style="padding:8px 10px 10px">', '<div class="stack gap-3" style="padding:8px 10px 10px"><div class="flex items-center gap-4"><span class="tag tag-neutral" style="font-size:9px;padding:1px 6px">' + esc(label) + '</span>' + (ik.jenis === 'toko' ? '<span class="t-10 o-6" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(hasil.toko ? hasil.toko.nama : '') + '</span>' : '') + '</div>');
  }
  X.kartuIklanDaftar = function (konteks, q, n) { try { return I().pilih(konteks, q || {}, n).map(kartuIklan).join(''); } catch (e) { return ''; } };
  X.kartuIklanBaris = function (konteks, q) { var h = X.kartuIklanDaftar(konteks, q); return h ? '<div>' + X.labelBagian('Sponsor · ' + esc(I().pengaturan().label || 'Iklan')) + '<div class="grid-2">' + h + '</div></div>' : ''; };
  A.iklanKlik = function (arg) { var p = arg.split(':'); I().klik(p[0]); if (p[2] === 'toko') { var ik = I().iklan(p[0]); A.tokoLihat ? A.tokoLihat(ik ? ik.tokoId : '') : A.tokoProduk(p[1]); } else A.tokoProduk(p[1]); };
  var checkoutAsli = T().checkout; T().checkout = function () { var h = checkoutAsli.apply(this, arguments); try { if (h && h.pesanan) I().konversi(h.pesanan); } catch (e) { /* abaikan */ } return h; };

  /* ---------------------------------------------------- Seller Center: Iklan */
  K.tiklanForm = K.tiklanForm || null; K.tiklanTopup = K.tiklanTopup || null;
  X.LAYAR.tiklan = function () {
    var t = tokoSaya(); if (!t) { K.layar = 'tdaftar'; return X.LAYAR.tdaftar(); }
    var c = I().pengaturan(), L = I().laporanToko(t.id), f = K.tiklanForm, tp = K.tiklanTopup, pr = T().produkToko(t.id);
    var h = '<div class="screen">' + X.kepala('Iklan toko', 'Tampil di atas pencarian, beranda & halaman produk', 'tberanda', '<button class="btn btn-primary" style="height:34px"' + aksi('tiklanBaru') + '>+ Iklan</button>') + '<div class="stack gap-10 pad-x18">';
    if (!c.aktif) h += '<div class="card card-leaf t-125">Fasilitas iklan sedang dinonaktifkan admin. Iklan yang ada tidak tayang sementara.</div>';
    /* saldo */
    h += '<div class="card elev-md gap-8"><div class="flex items-center gap-8"><div class="grow"><div class="t-11 o-6">Saldo iklan</div><div class="f-head t-20">' + rp(L.saldo) + '</div><div class="t-11 o-6">' + L.aktif + ' iklan aktif · biaya 7 hari ' + rp(L.biaya7) + '</div></div><button class="btn btn-secondary" style="height:34px"' + aksi('tiklanTopupBuka') + '>Isi saldo</button></div>';
    if (tp) h += '<div class="card card-leaf gap-8"><div class="f-head t-14">Isi saldo iklan</div><div class="flex gap-6 wrap">' + [50000, 100000, 250000, 500000].map(function (n) { return '<button class="' + kelas('pill pill-sm', tp.jumlah === n) + '"' + aksi('tiklanTopupJumlah', n) + '>' + rp(n).replace('Rp ', 'Rp') + '</button>'; }).join('') + '</div><input class="input" inputmode="numeric" data-simpan="tiklanTopup.jumlah" value="' + esc(tp.jumlah) + '" placeholder="Nominal (min ' + rp(c.topupMin) + ')"><div class="flex gap-6 wrap">' + [['saldo', 'Potong saldo toko (' + rp(T().keuanganToko(t.id).saldo) + ')'], ['gateway', 'Bayar via VA/QRIS (simulasi)']].map(function (s) { return '<button class="' + kelas('pill pill-sm', tp.sumber === s[0]) + '"' + aksi('tiklanTopupSumber', s[0]) + '>' + s[1] + '</button>'; }).join('') + '</div><div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('tiklanTopupTutup') + '>Batal</button><button class="btn btn-primary" style="flex:1"' + aksi('tiklanTopupKirim') + '>Isi ' + rp(tp.jumlah) + '</button></div></div>';
    h += '</div>';
    /* KPI */
    h += '<div class="grid-2">' + [['Tayang', L.tayang.toLocaleString('id-ID')], ['Klik · CTR', L.klik + ' · ' + L.ctr + '%'], ['Biaya iklan', rp(L.biaya)], ['Konversi · ROAS', L.konversi + ' · ' + L.roas + '×']].map(function (k) { return '<div class="card elev-sm gap-2"><div class="t-11 o-6">' + k[0] + '</div><b class="t-135">' + k[1] + '</b></div>'; }).join('') + '</div>';
    /* form buat iklan */
    if (f) {
      var g = I().periksa(f, c), saldoKurang = L.saldo < Number(f.bid || 0);
      h += '<div class="card card-leaf gap-8"><div class="f-head t-15">Iklan baru</div><div class="flex gap-6">' + [['produk', '📦 Iklan produk'], ['toko', '🏪 Iklan toko']].map(function (j) { return '<button class="' + kelas('pill pill-sm', f.jenis === j[0]) + '"' + aksi('tiklanJenis', j[0]) + '>' + j[1] + '</button>'; }).join('') + '</div>';
      if (f.jenis === 'produk') h += '<div class="t-11 up o-6">Produk</div><div class="hscroll" style="gap:6px">' + (pr.length ? pr.map(function (p) { return '<button class="' + kelas('pill pill-sm', f.produkId === p.id) + '" style="flex:none"' + aksi('tiklanProduk', p.id) + '>' + esc(p.ikon) + ' ' + esc(p.nama.slice(0, 22)) + '</button>'; }).join('') : '<span class="t-125 o-6">Belum ada produk aktif.</span>') + '</div>';
      h += '<input class="input" data-simpan="tiklanForm.judul" value="' + esc(f.judul) + '" placeholder="Judul iklan (maks 60 huruf)"><input class="input" data-simpan="tiklanForm.kataKunci" value="' + esc(f.kataKunci) + '" placeholder="Kata kunci, pisahkan koma (mis. chemical, lantai, sop)">';
      h += '<div class="grid-2"><div><div class="t-11 up o-6">Bid per klik (Rp)</div><input class="input" inputmode="numeric" data-simpan="tiklanForm.bid" value="' + esc(f.bid) + '"><div class="t-10 o-6">' + rp(c.bidMin) + '–' + rp(c.bidMaks) + ' · bid tinggi = posisi lebih atas</div></div><div><div class="t-11 up o-6">Anggaran harian (Rp)</div><input class="input" inputmode="numeric" data-simpan="tiklanForm.anggaranHarian" value="' + esc(f.anggaranHarian) + '"><div class="t-10 o-6">min ' + rp(c.anggaranHarianMin) + ' · berhenti otomatis bila habis</div></div></div>';
      h += '<div class="flex gap-6 wrap"><span class="t-11 o-6" style="align-self:center">Durasi</span>' + [7, 14, 30].map(function (d) { return '<button class="' + kelas('pill pill-sm', Number(f.durasi) === d) + '"' + aksi('tiklanDurasi', d) + '>' + d + ' hari</button>'; }).join('') + '</div>';
      h += '<div class="t-11 o-6 lh-15">Estimasi: anggaran ' + rp(f.anggaranHarian) + '/hari ÷ bid ' + rp(f.bid) + ' ≈ ' + Math.floor((Number(f.anggaranHarian) || 0) / Math.max(1, Number(f.bid) || 1)) + ' klik/hari · maks ' + rp((Number(f.anggaranHarian) || 0) * (Number(f.durasi) || 0)) + ' selama ' + f.durasi + ' hari. ' + (c.moderasi ? 'Iklan tayang setelah lolos moderasi admin.' : 'Iklan langsung tayang.') + '</div>';
      if (g.length || saldoKurang) h += '<div class="t-115" style="color:#b12a5b">' + esc(saldoKurang ? 'Saldo iklan ' + rp(L.saldo) + ' — isi saldo dulu.' : g[0]) + '</div>';
      h += '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('tiklanBatal') + '>Batal</button><button class="btn btn-primary" style="flex:1"' + (g.length || saldoKurang ? ' disabled' : aksi('tiklanKirim')) + '>' + (c.moderasi ? 'Ajukan iklan' : 'Pasang iklan') + '</button></div></div>';
    }
    /* daftar iklan */
    h += X.labelBagian('Iklan saya (' + L.iklan.length + ')');
    if (!L.iklan.length) h += '<div class="card elev-sm t-125 o-7">Belum ada iklan. Iklan produk menaikkan posisi produk di hasil cari dan beranda; bayar hanya per klik.</div>';
    L.iklan.forEach(function (ik) {
      var p = ik.produkId ? T().produk(ik.produkId) : null, ctr = ik.tayang ? Math.round(ik.klik / ik.tayang * 1000) / 10 : 0, roas = ik.biaya ? Math.round((ik.nilaiKonversi || 0) / ik.biaya * 10) / 10 : 0, ub = K.tiklanUbah === ik.id;
      h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><span style="font-size:24px">' + (ik.jenis === 'toko' ? '🏪' : esc(p ? p.ikon : '📦')) + '</span><div class="grow" style="min-width:0"><div class="t-125 bold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(ik.judul) + '</div><div class="t-11 o-6">' + (ik.jenis === 'toko' ? 'Iklan toko' : esc(p ? p.nama : 'produk dihapus')) + ' · ' + esc(ik.mulai) + ' → ' + esc(ik.sampai) + '</div></div><span class="tag ' + (CHIP[ik.status] || 'tag-neutral') + '" style="font-size:10px">' + esc(I().STATUS[ik.status] || ik.status) + '</span></div>';
      if (ik.status === 'ditolak' && ik.alasanTolak) h += '<div class="t-11" style="color:#b12a5b">Ditolak: ' + esc(ik.alasanTolak) + '</div>';
      h += '<div class="flex gap-8 t-11 o-7 wrap"><span>👁 ' + (ik.tayang || 0).toLocaleString('id-ID') + ' tayang</span><span>👆 ' + (ik.klik || 0) + ' klik · CTR ' + ctr + '%</span><span>💸 ' + rp(ik.biaya) + '</span><span>🛒 ' + (ik.konversi || 0) + ' konversi · ROAS ' + roas + '×</span></div>';
      h += '<div class="t-11 o-6">Bid ' + rp(ik.bid) + '/klik · anggaran ' + rp(ik.anggaranHarian) + '/hari (terpakai hari ini ' + rp(ik.hariIni && ik.hariIni.tgl === new Date().toISOString().slice(0, 10) ? ik.hariIni.biaya : 0) + ')' + ((ik.kataKunci || []).length ? ' · kata kunci: ' + esc(ik.kataKunci.join(', ')) : '') + '</div>';
      if (ub) h += '<div class="grid-2"><input class="input" inputmode="numeric" data-simpan="tiklanUbahForm.bid" value="' + esc(K.tiklanUbahForm.bid) + '" placeholder="Bid"><input class="input" inputmode="numeric" data-simpan="tiklanUbahForm.anggaranHarian" value="' + esc(K.tiklanUbahForm.anggaranHarian) + '" placeholder="Anggaran/hari"></div><input class="input" data-simpan="tiklanUbahForm.kataKunci" value="' + esc(K.tiklanUbahForm.kataKunci) + '" placeholder="Kata kunci"><div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('tiklanUbahTutup') + '>Batal</button><button class="btn btn-primary" style="flex:1"' + aksi('tiklanUbahSimpan', ik.id) + '>Simpan</button></div>';
      else h += '<div class="flex gap-6 wrap">' + (ik.status === 'aktif' ? '<button class="pill pill-sm"' + aksi('tiklanJeda', ik.id) + '>⏸ Jeda</button>' : '') + (ik.status === 'dijeda' || ik.status === 'habis' ? '<button class="pill pill-sm"' + aksi('tiklanLanjut', ik.id) + '>▶ Lanjutkan</button>' : '') + (['selesai'].indexOf(ik.status) < 0 ? '<button class="pill pill-sm"' + aksi('tiklanUbahBuka', ik.id) + '>✎ Bid & kata kunci</button>' : '') + '<button class="pill pill-sm"' + aksi('tiklanHapus', ik.id) + '>✕ ' + (ik.klik ? 'Akhiri' : 'Hapus') + '</button></div>';
      h += '</div>';
    });
    /* riwayat isi saldo */
    if (L.topup.length) h += X.labelBagian('Riwayat isi saldo') + '<div class="card elev-sm gap-4">' + L.topup.slice(0, 5).map(function (tp) { return '<div class="kv t-115"><span>' + esc(String(tp.at).slice(0, 10)) + ' · ' + esc(tp.sumber === 'saldo' ? 'saldo toko' : 'gateway') + '</span><b>+ ' + rp(tp.jumlah) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="card card-leaf gap-4"><div class="f-head t-14">Tips iklan (pola TopAds)</div><div class="t-115 lh-15 o-85">· Mulai dari bid minimum, naikkan bila posisi belum di atas.<br>· Kata kunci = kata yang diketik pembeli (mis. "chemical lantai", "mop").<br>· Produk dengan foto ≥ 3, rating ≥ 4,5, dan gratis ongkir punya CTR lebih tinggi.<br>· Pantau ROAS: nilai pesanan ÷ biaya iklan. ROAS < 3× → perbaiki halaman produk dulu.</div></div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.tiklanBaru = function () { var c = I().pengaturan(); K.tiklanForm = { jenis:'produk', produkId:'', judul:'', kataKunci:'', bid:c.bidMin, anggaranHarian:c.anggaranHarianMin, durasi:7 }; K.tiklanTopup = null; };
  A.tiklanBatal = function () { K.tiklanForm = null; };
  A.tiklanJenis = function (j) { K.tiklanForm.jenis = j; if (j === 'toko') K.tiklanForm.produkId = ''; };
  A.tiklanProduk = function (id) { var p = T().produk(id); K.tiklanForm.produkId = id; if (!K.tiklanForm.judul && p) K.tiklanForm.judul = p.nama; };
  A.tiklanDurasi = function (d) { K.tiklanForm.durasi = Number(d); };
  A.tiklanKirim = function () { var t = tokoSaya(); try { var ik = I().buat(t.id, K.tiklanForm, aku().name); K.tiklanForm = null; X.sekilas(ik.status === 'aktif' ? 'Iklan tayang.' : 'Iklan diajukan — menunggu moderasi admin.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.tiklanJeda = function (id) { try { I().jeda(id); X.sekilas('Iklan dijeda.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.tiklanLanjut = function (id) { try { I().lanjut(id); X.sekilas('Iklan dilanjutkan.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.tiklanHapus = function (id) { I().hapus(id); X.sekilas('Iklan dihentikan.'); };
  A.tiklanUbahBuka = function (id) { var ik = I().iklan(id); K.tiklanUbah = id; K.tiklanUbahForm = { bid:ik.bid, anggaranHarian:ik.anggaranHarian, kataKunci:(ik.kataKunci || []).join(', ') }; };
  A.tiklanUbahTutup = function () { K.tiklanUbah = null; };
  A.tiklanUbahSimpan = function (id) { try { var r = I().ubah(id, { bid:Number(K.tiklanUbahForm.bid), anggaranHarian:Number(K.tiklanUbahForm.anggaranHarian), kataKunci:K.tiklanUbahForm.kataKunci }); K.tiklanUbah = null; X.sekilas(r.status === 'moderasi' ? 'Perubahan disimpan — kata kunci baru menunggu moderasi.' : 'Perubahan disimpan.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.tiklanTopupBuka = function () { K.tiklanTopup = { jumlah:100000, sumber:'saldo' }; K.tiklanForm = null; };
  A.tiklanTopupTutup = function () { K.tiklanTopup = null; };
  A.tiklanTopupJumlah = function (n) { K.tiklanTopup.jumlah = Number(n); };
  A.tiklanTopupSumber = function (s) { K.tiklanTopup.sumber = s; };
  A.tiklanTopupKirim = function () { var t = tokoSaya(); try { I().topup(t.id, K.tiklanTopup.jumlah, K.tiklanTopup.sumber, aku().name); X.sekilas('Saldo iklan bertambah ' + rp(K.tiklanTopup.jumlah) + '.'); K.tiklanTopup = null; } catch (e) { X.sekilas(e.message, 'err'); } };
})(ExoApp);
