/* ==========================================================================
   exo-admin-biaya.js — konsol admin: Biaya & asuransi (pola Tokopedia)
   --------------------------------------------------------------------------
   Tab: ringkasan (pendapatan biaya platform) · biaya pembeli (biaya jasa
   aplikasi, biaya layanan VA, bebas pembeli baru) · asuransi & proteksi ·
   biaya layanan penjual (Reguler / Power Merchant / Official Store, per
   kategori, program Gratis Ongkir) · poin & jasa kebersihan · simulasi.
   Semua perubahan: PIN → usulan Persetujuan 'biaya-setelan' (tingkat tinggi,
   penerap di exo-biaya.js) → audit. Tidak ada nilai yang ditulis langsung.
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, pill = A.pill, kpi = A.kpi, tabel = A.tabel;
  var B = function () { return window.EXO_BIAYA; }, T = function () { return window.EXO_TOKO; }, rp = function (n) { return T() ? T().rp(n) : 'Rp' + Number(n || 0).toLocaleString('id-ID'); };
  var METODE = [['wallet','EXO Wallet'],['qris','QRIS'],['ewallet','GoPay / OVO / DANA'],['va','Virtual account'],['card','Kartu kredit']];
  S.biayaTab = S.biayaTab || 'ringkasan';
  if (window.EXO_BIAYA) EXO_BIAYA.daftarkanPersetujuan();
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function form() { if (!S.biayaForm) S.biayaForm = JSON.parse(JSON.stringify(B().pengaturan())); return S.biayaForm; }
  function ambil(o, j) { return j.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
  function taruh(o, j, v) { var ks = j.split('.'), t = o; ks.slice(0, -1).forEach(function (k) { t = t[k] = t[k] || {}; }); t[ks[ks.length - 1]] = v; }
  function kategori() { return T() ? T().KATEGORI : []; }

  /* ---------- pembangun kendali ---------- */
  function angka(jalur, satuan) { var f = form(), b = B().BATAS[jalur] || [0, 0]; return '<div class="field"><label>' + esc(B().LABEL[jalur]) + '</label><div class="flex items-center gap-8"><input class="input" inputmode="decimal" style="max-width:180px" value="' + esc(ambil(f, jalur)) + '" data-ubah="biayaUbah" data-arg="' + jalur + '">' + (satuan ? '<span class="t-125 o-6">' + esc(satuan) + '</span>' : '') + '<span class="t-11 o-5">batas ' + b[0] + '–' + b[1] + '</span></div></div>'; }
  function saklar(jalur, ket) { var on = !!ambil(form(), jalur); return '<div class="flex items-center gap-10" style="padding:6px 0"><span class="grow t-125">' + esc(B().LABEL[jalur]) + (ket ? '<div class="t-11 o-6">' + esc(ket) + '</div>' : '') + '</span>' + pill(on, on ? 'Aktif' : 'Nonaktif', 'biayaSaklar', jalur, true) + '</div>'; }
  function pilihanArr(jalur, daftar, ket) { var arr = ambil(form(), jalur) || []; return '<div class="field"><label>' + esc(B().LABEL[jalur]) + '</label><div class="flex gap-6 wrap">' + daftar.map(function (k) { return pill(arr.indexOf(k[0]) >= 0, k[1], 'biayaArr', jalur + ':' + k[0], true); }).join('') + '</div>' + (ket ? '<div class="t-11 o-6">' + esc(ket) + '</div>' : '') + '</div>'; }
  function simpanBar() { var f = form(), beda = B().beda(B().pengaturan(), f); return '<div class="card elev-sm gap-8" style="position:sticky;bottom:8px"><div class="flex items-center gap-10 wrap"><div class="grow t-125">' + (beda.length ? '<b>' + beda.length + ' perubahan belum diajukan</b><div class="t-11 o-6">' + beda.slice(0, 4).map(function (b) { return esc(b.label) + ': ' + esc(B().fmt(b.dari)) + ' → ' + esc(B().fmt(b.ke)); }).join(' · ') + (beda.length > 4 ? ' · …' : '') + '</div>' : '<span class="o-6">Belum ada perubahan. Setelan berlaku dibaca langsung oleh checkout pelanggan & keuangan toko.</span>') + '</div><button class="btn btn-secondary" style="height:36px"' + aksi('biayaBatal') + '>Batalkan</button><button class="btn btn-secondary" style="height:36px"' + aksi('biayaBawaan') + '>Nilai bawaan</button><button class="btn btn-primary" style="height:36px"' + (beda.length ? '' : ' disabled') + aksi('biayaAjukan') + '>Ajukan · PIN + Persetujuan</button></div></div>'; }

  VIEW.biaya = function () {
    if (!B()) return '<div class="card elev-sm">Modul EXO_BIAYA belum dimuat.</div>';
    var h = '<div class="flex gap-8 wrap">' + [['ringkasan','Ringkasan'],['pembeli','Biaya pembeli'],['asuransi','Asuransi & proteksi'],['penjual','Biaya layanan penjual'],['program','Gratis Ongkir, poin & jasa'],['simulasi','Simulasi']].map(function (t) { return pill(S.biayaTab === t[0], t[1], 'biayaTab', t[0]); }).join('') + '</div><div class="spacer-14"></div>';
    return h + ({ ringkasan:tabRingkasan, pembeli:tabPembeli, asuransi:tabAsuransi, penjual:tabPenjual, program:tabProgram, simulasi:tabSimulasi }[S.biayaTab] || tabRingkasan)();
  };
  AKSI.biayaTab = function (v) { S.biayaTab = v; };

  function tabRingkasan() {
    var c = B().pengaturan(), l = B().laporan(), bulan = new Date().toISOString().slice(0, 7), lb = B().laporan(bulan);
    var h = kpi([{label:'Pendapatan biaya platform', value:rp(l.bersih), note:'komisi + biaya jasa + premi + proteksi − subsidi ongkir · ' + l.pesanan + ' pesanan'},{label:'Biaya layanan penjual', value:rp(l.komisi), note:l.selesai + ' pesanan selesai · akun 4120'},{label:'Biaya jasa & layanan pembeli', value:rp(l.biayaJasa + l.biayaLayananVA), note:'jasa aplikasi ' + rp(l.biayaJasa) + ' · VA ' + rp(l.biayaLayananVA)},{label:'Premi asuransi & proteksi', value:rp(l.asuransi + l.proteksi), note:'asuransi ' + rp(l.asuransi) + ' · proteksi ' + rp(l.proteksi)},{label:'Subsidi Gratis Ongkir', value:'− ' + rp(l.subsidi), note:'ditanggung EXOCLEAN', good:false}], true, 5);
    h += '<div class="spacer-14"></div><div class="grid g2" style="gap:16px">';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Setelan berlaku sekarang</div>' + tabel(['Komponen', 'Nilai', 'Pola Tokopedia'], [
      ['Biaya jasa aplikasi (pembeli)', rp(c.pembeli.biayaJasa) + '/transaksi · gratis ' + c.pembeli.bebasTransaksiPertama + ' transaksi pertama · bebas untuk ' + (c.pembeli.gratisMetode.join(', ') || '—'), 'Rp1.000, 4 transaksi pertama gratis'],
      ['Biaya layanan VA (pembeli)', rp(c.pembeli.biayaLayananVA) + ' · pembeli baru bebas ' + c.pembeli.hariPembeliBaru + ' hari', 'Rp1.000 khusus virtual account, 30 hari'],
      ['Asuransi pengiriman', (c.asuransi.aktif ? c.asuransi.pct + '% · min ' + rp(c.asuransi.min) + ' · wajib: ' + (c.asuransi.wajibKategori.join(', ') || '—') + ' / ≥ ' + rp(c.asuransi.wajibMinHarga) : 'nonaktif'), 'premi % nilai barang, wajib kategori tertentu'],
      ['Proteksi produk', (c.proteksi.aktif ? c.proteksi.pct + '% · ' + c.proteksi.bulanGaransi + ' bulan · ' + (c.proteksi.kategori.join(', ') || '—') + ' / ≥ ' + rp(c.proteksi.minHarga) : 'nonaktif'), 'garansi tambahan kategori terbatas'],
      ['Biaya layanan penjual', 'Reguler ' + c.komisi.reguler + '% · Power ' + c.komisi.power + '% · Official ' + c.komisi.official + '%' + (Object.keys(c.komisi.kategori).length ? ' · kategori khusus ' + Object.keys(c.komisi.kategori).length : '') + ' · +' + c.komisi.programOngkir + '% peserta ongkir', '1–10% per kategori & tingkat'],
      ['Gratis Ongkir', c.ongkir.aktif ? 'belanja ≥ ' + rp(c.ongkir.min) + ' → subsidi ≤ ' + rp(c.ongkir.maks) + (c.ongkir.hanyaPeserta ? ' (toko peserta)' : ' (semua toko)') : 'nonaktif', 'program bebas ongkir bersubsidi'],
      ['Poin', 'maks ' + c.poin.maksPct + '% total', 'poin/GoPay Coins sebagian'],
      ['Biaya aplikasi jasa kebersihan', rp(c.jasa.biayaAplikasi) + '/pesanan', 'biaya jasa aplikasi Gojek/Tokopedia']
    ]) + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Pendapatan per bulan</div>' + (lb.pesanan ? '<div class="t-115 o-6">Bulan ini ' + lb.pesanan + ' pesanan · bersih ' + rp(lb.bersih) + '</div>' : '') + tabel(['Bulan', 'Pesanan', 'Komisi', 'Biaya pembeli', 'Premi + proteksi', 'Subsidi'], l.daftarBulan.slice(0, 8).map(function (m) { return [m.bulan, String(m.pesanan), rp(m.komisi), rp(m.biayaJasa), rp(m.asuransi + m.proteksi), '− ' + rp(m.subsidi)]; })) + '<div class="t-11 o-6 lh-15">Komisi diakui saat pesanan selesai (jurnal otomatis 4120). Biaya pembeli & premi dikutip saat bayar; premi diteruskan ke mitra asuransi ' + esc(c.asuransi.mitra) + ' (klaim ≤ ' + c.asuransi.gantiMaksPct + '% nilai barang, ' + c.asuransi.klaimHari + ' hari setelah diterima).</div></div></div>';
    return h;
  }
  function tabPembeli() {
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Biaya jasa aplikasi</div><div class="t-115 o-6 lh-15">Tokopedia: Rp1.000 per transaksi barang, pembeli baru bebas untuk 4 transaksi pertama. Di EXOCLEAN juga digratiskan untuk metode bayar tertentu (bawaan: EXO Wallet) agar dompet internal lebih menarik.</div>' + angka('pembeli.biayaJasa', 'Rp') + angka('pembeli.bebasTransaksiPertama', 'transaksi') + pilihanArr('pembeli.gratisMetode', METODE, 'Metode yang dipilih tidak dikenai biaya jasa aplikasi.') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Biaya layanan virtual account</div><div class="t-115 o-6 lh-15">Tokopedia: Biaya Layanan Rp1.000 untuk pembayaran virtual account; pembeli baru bebas 30 hari sejak daftar. Di sini berlaku untuk metode "Bank transfer (VA)".</div>' + angka('pembeli.biayaLayananVA', 'Rp') + angka('pembeli.hariPembeliBaru', 'hari') + '<div class="t-11 o-6">Semua biaya pembeli ditampilkan terpisah di ringkasan checkout ("Biaya jasa aplikasi", "Biaya layanan (virtual account)") — tidak disembunyikan di harga barang.</div></div></div><div class="spacer-14"></div>';
    return h + simpanBar();
  }
  function tabAsuransi() {
    var kat = kategori();
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Asuransi pengiriman</div><div class="t-115 o-6 lh-15">Tokopedia: premi persentase nilai barang lewat mitra asuransi; tercentang otomatis, wajib untuk kategori tertentu (elektronik, barang pecah belah) dan bisa diwajibkan penjual per produk. Klaim bila paket hilang/rusak, ganti sesuai nilai barang.</div>' + saklar('asuransi.aktif', 'Bila nonaktif, baris asuransi hilang dari checkout.') + saklar('asuransi.bawaanCentang', 'Pembeli bisa melepas bila diizinkan di bawah.') + saklar('asuransi.bolehDilepas', 'Nonaktif = selalu disertakan (kecuali ambil di toko / diantar mitra).') + angka('asuransi.pct', '% nilai barang') + angka('asuransi.min', 'Rp') + angka('asuransi.pembulatan', 'Rp') + pilihanArr('asuransi.wajibKategori', kat, 'Kategori ini selalu diasuransikan; penjual juga bisa menandai "asuransi wajib" per produk.') + angka('asuransi.wajibMinHarga', 'Rp subtotal per toko (0 = tidak ada)') + angka('asuransi.gantiMaksPct', '%') + angka('asuransi.klaimHari', 'hari') + '<div class="field"><label>' + esc(B().LABEL['asuransi.mitra']) + '</label><input class="input" value="' + esc(form().asuransi.mitra) + '" data-ubah="biayaTeks" data-arg="asuransi.mitra"></div></div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Proteksi produk</div><div class="t-115 o-6 lh-15">Tokopedia: proteksi/garansi tambahan (mis. proteksi gadget) dengan harga persentase, hanya untuk kategori tertentu atau barang bernilai tinggi. Ditawarkan per barang di checkout.</div>' + saklar('proteksi.aktif') + angka('proteksi.pct', '% harga barang') + angka('proteksi.minHarga', 'Rp') + pilihanArr('proteksi.kategori', kat) + angka('proteksi.bulanGaransi', 'bulan') + '</div></div><div class="spacer-14"></div>';
    return h + simpanBar();
  }
  function tabPenjual() {
    var f = form(), kat = kategori();
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Biaya layanan per tingkat toko</div><div class="t-115 o-6 lh-15">Tokopedia: biaya layanan penjual dipotong dari setiap pesanan selesai, berbeda untuk Regular Merchant, Power Merchant, dan Official Store, serta bisa berbeda per kategori (1–10%). Peserta program Gratis Ongkir dikenai tambahan. Di EXOCLEAN dipotong saat pesanan selesai (akun 4120) sebelum dana cair ke toko.</div>' + angka('komisi.reguler', '%') + angka('komisi.power', '%') + angka('komisi.official', '%') + angka('komisi.programOngkir', '% tambahan') + angka('komisi.maksPerPesanan', 'Rp') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Biaya layanan khusus per kategori</div><div class="t-115 o-6 lh-15">Kosongkan untuk mengikuti tingkat toko. Bila diisi, persentase kategori menggantikan persentase tingkat (tambahan program ongkir tetap ditambahkan).</div>' + kat.map(function (k) { var v = f.komisi.kategori[k[0]]; return '<div class="field"><label>' + esc(k[1]) + '</label><div class="flex items-center gap-8"><input class="input" inputmode="decimal" style="max-width:140px" placeholder="ikut tingkat" value="' + (typeof v === 'number' ? v : '') + '" data-ubah="biayaKomisiKat" data-arg="' + k[0] + '"><span class="t-125 o-6">%</span></div></div>'; }).join('') + '</div></div><div class="spacer-14"></div>';
    var tk = T() ? T().semuaToko() : [];
    h += '<div class="card elev-sm gap-8"><div class="card-title">Dampak ke toko aktif</div>' + tabel(['Toko', 'Tingkat', 'Program ongkir', 'Biaya layanan berlaku', 'Contoh pesanan Rp500.000'], tk.map(function (t) { var pct = B().komisiPct(t); return [esc(t.nama), t.badge === 'official' ? 'Official Store' : t.badge === 'power' ? 'Power Merchant' : 'Reguler', t.programOngkir ? 'peserta' : '—', pct + '%', rp(B().komisiRp(t, 500000))]; })) + '<div class="t-11 o-6">Tingkat toko ditentukan skor (Power Merchant ≥ 85 & 20 pesanan selesai) atau ditetapkan admin di Marketplace → Mitra toko.</div></div><div class="spacer-14"></div>';
    return h + simpanBar();
  }
  function tabProgram() {
    var h = '<div class="grid g3" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Program Gratis Ongkir</div><div class="t-115 o-6 lh-15">Tokopedia: bebas ongkir bersubsidi dengan minimum belanja dan batas subsidi; toko mendaftar sebagai peserta dan dikenai biaya layanan tambahan. Subsidi dicatat sebagai beban pemasaran.</div>' + saklar('ongkir.aktif') + angka('ongkir.min', 'Rp per toko') + angka('ongkir.maks', 'Rp per toko') + saklar('ongkir.hanyaPeserta', 'Aktif = hanya toko yang ikut program (Pengaturan toko) yang dapat subsidi.') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Poin</div><div class="t-115 o-6 lh-15">Batas pemakaian poin per transaksi (Tokopedia: sebagian total dibayar koin).</div>' + angka('poin.maksPct', '% total') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Biaya aplikasi jasa kebersihan</div><div class="t-115 o-6 lh-15">Dikutip dari pelanggan di setiap pesanan jasa (baris "Platform fee" di ringkasan pesanan & lembar bayar). Fee mitra dan pajak diatur di Accounting & Finance → Setelan.</div>' + angka('jasa.biayaAplikasi', 'Rp per pesanan') + '</div></div><div class="spacer-14"></div>';
    return h + simpanBar();
  }
  function tabSimulasi() {
    var s = S.biayaSim || (S.biayaSim = { harga:750000, ongkir:18000, kategori:'mesin', badge:'reguler', programOngkir:false, metode:'va', nTransaksi:5, proteksi:true }), r = B().simulasi(s);
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Simulasi satu pesanan (setelan berlaku)</div><div class="grid g2" style="gap:8px"><div class="field"><label>Harga barang (Rp)</label><input class="input" inputmode="numeric" value="' + s.harga + '" data-ubah="biayaSim" data-arg="harga"></div><div class="field"><label>Ongkir (Rp)</label><input class="input" inputmode="numeric" value="' + s.ongkir + '" data-ubah="biayaSim" data-arg="ongkir"></div><div class="field"><label>Transaksi pembeli sebelumnya</label><input class="input" inputmode="numeric" value="' + s.nTransaksi + '" data-ubah="biayaSim" data-arg="nTransaksi"></div></div>';
    h += '<div class="field"><label>Kategori</label><div class="flex gap-6 wrap">' + kategori().map(function (k) { return pill(s.kategori === k[0], k[1], 'biayaSimSet', 'kategori:' + k[0], true); }).join('') + '</div></div>';
    h += '<div class="field"><label>Tingkat toko</label><div class="flex gap-6 wrap">' + [['reguler','Reguler'],['power','Power Merchant'],['official','Official Store']].map(function (k) { return pill(s.badge === k[0], k[1], 'biayaSimSet', 'badge:' + k[0], true); }).join('') + pill(s.programOngkir, 'Peserta Gratis Ongkir', 'biayaSimSet', 'programOngkir:toggle', true) + '</div></div>';
    h += '<div class="field"><label>Metode bayar</label><div class="flex gap-6 wrap">' + METODE.map(function (k) { return pill(s.metode === k[0], k[1], 'biayaSimSet', 'metode:' + k[0], true); }).join('') + pill(s.proteksi, 'Ambil proteksi', 'biayaSimSet', 'proteksi:toggle', true) + '</div></div></div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Hasil</div>' + tabel(['Komponen', 'Nilai', 'Keterangan'], [
      ['Harga barang', rp(r.harga), ''], ['Ongkir', rp(r.ongkir), r.subsidi ? 'subsidi Gratis Ongkir − ' + rp(r.subsidi) : 'tanpa subsidi'],
      ['Asuransi pengiriman', rp(r.premi), r.asuransiWajib ? 'wajib' : 'opsional (tercentang bawaan)'], ['Proteksi produk', r.proteksiBoleh ? rp(r.proteksi) : '—', r.proteksiBoleh ? (s.proteksi ? 'diambil' : 'tidak diambil') : 'tidak ditawarkan'],
      ['Biaya jasa aplikasi', rp(r.biayaJasa), r.biayaJasa ? '' : 'gratis (metode / transaksi awal)'], ['Biaya layanan VA', rp(r.biayaLayananVA), r.biayaLayananVA ? '' : 'tidak berlaku'],
      ['<b>Pembeli membayar</b>', '<b>' + rp(r.pembeliBayar) + '</b>', ''], ['Biaya layanan penjual', '− ' + rp(r.komisi), r.komisiPct + '%'], ['<b>Penjual menerima</b>', '<b>' + rp(r.penjualTerima) + '</b>', 'harga − biaya layanan + ongkir'],
      ['<b>Pendapatan platform</b>', '<b>' + rp(r.platform) + '</b>', 'komisi + biaya pembeli + premi/proteksi − subsidi']
    ]) + '<div class="t-11 o-6">Premi asuransi & proteksi sebagian diteruskan ke mitra asuransi — pendapatan bersih EXOCLEAN dari komponen ini adalah selisih premi.</div></div></div>';
    return h;
  }

  /* ---------- aksi ---------- */
  AKSI.biayaUbah = function (jalur, v) { taruh(form(), jalur, Number(String(v).replace(/[^\d.,]/g, '').replace(',', '.')) || 0); };
  AKSI.biayaTeks = function (jalur, v) { taruh(form(), jalur, String(v || '').slice(0, 80)); };
  AKSI.biayaSaklar = function (jalur) { taruh(form(), jalur, !ambil(form(), jalur)); };
  AKSI.biayaArr = function (arg) { var p = arg.split(':'), arr = (ambil(form(), p[0]) || []).slice(), i = arr.indexOf(p[1]); if (i >= 0) arr.splice(i, 1); else arr.push(p[1]); taruh(form(), p[0], arr); };
  AKSI.biayaKomisiKat = function (k, v) { var f = form(), s = String(v || '').trim(); if (!s) delete f.komisi.kategori[k]; else f.komisi.kategori[k] = Math.max(0, Math.min(20, Number(s.replace(',', '.')) || 0)); };
  AKSI.biayaBatal = function () { S.biayaForm = null; A.sekilas('Perubahan dibatalkan.'); };
  AKSI.biayaBawaan = function () { S.biayaForm = JSON.parse(JSON.stringify(B().BAWAAN)); A.sekilas('Formulir diisi nilai bawaan — belum diajukan.'); };
  AKSI.biayaSim = function (k, v) { S.biayaSim[k] = Number(String(v).replace(/\D/g, '')) || 0; };
  AKSI.biayaSimSet = function (arg) { var p = arg.split(':'); if (p[1] === 'toggle') S.biayaSim[p[0]] = !S.biayaSim[p[0]]; else S.biayaSim[p[0]] = p[1]; };
  AKSI.biayaAjukan = function () {
    var f = form(), g = B().periksa(f); if (g.length) { A.sekilas(g[0], 'err'); return; }
    var lama = B().pengaturan(), beda = B().beda(lama, f); if (!beda.length) { A.sekilas('Tidak ada perubahan.'); return; }
    var ringkas = beda.map(function (b) { return b.label + ': ' + B().fmt(b.dari) + ' → ' + B().fmt(b.ke); }).join('; ');
    denganPin('Ubah biaya & asuransi (' + beda.length + ' perubahan)', function (oleh) {
      var h = EXO_PERSETUJUAN.ajukan('biaya-setelan', 'Ubah biaya & asuransi', ringkas, lama, f, { setelan:f }, oleh);
      EXO_PERSETUJUAN.audit(oleh, 'Ajukan perubahan biaya & asuransi', h.usulan.id, ringkas);
      S.biayaForm = null; A.sekilas(h.langsung ? 'Setelan biaya & asuransi diterapkan.' : 'Usulan masuk antrean Persetujuan · butuh ' + h.usulan.butuh + ' penyetuju (tingkat tinggi).');
    });
  };
})(ADMIN);
