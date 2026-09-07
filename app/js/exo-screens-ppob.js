/* ==========================================================================
   exo-screens-ppob.js — layar pelanggan "Bayar & Isi Ulang" (Darmawisata)
   --------------------------------------------------------------------------
   Layar `tagihan`: tab Tagihan (PPOB: PLN, BPJS, PDAM, Telkom, …), Pulsa &
   Data (TopUp: pulsa, data, token PLN, e-wallet), Riwayat. Bayar dengan EXO
   Wallet + PIN. Dompet dipotong hanya bila penyedia menjawab selesai (atau
   tertunda — ditandai, dicocokkan admin). Setiap daftar membawa lencana
   sumber: live / simulasi / contoh (server tidak terjangkau).
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, rp = X.rp, A = X.AKSI, P = function () { return window.EXO_PPOB; };
  K.ppob = K.ppob || { tab:'ppob', grup:'', produk:null, nomor:'', hp:'', jenis:'', penyedia:'', pilihan:null, cek:null, hasil:null, memuat:'', cache:{}, pinOpen:false };
  function pembeli() { return { id:K.pelangganId || null, nama:'Dewi Anggraini' }; }
  function lencana(sumber) { return sumber === 'live' ? '<span class="tag tag-accent" style="font-size:10px">live</span>' : sumber === 'simulasi' ? '<span class="tag tag-accent-2" style="font-size:10px">simulasi</span>' : '<span class="tag tag-neutral" style="font-size:10px">contoh · server tidak terjangkau</span>'; }
  function keadaanTag(k) { var m = { selesai:['tag-accent', 'Berhasil'], tertunda:['tag-accent-2', 'Menunggu penyedia'], ragu:['tag-accent-2', 'Perlu dicocokkan'], berjalan:['tag-accent-2', 'Diproses'], gagal:['tag-neutral', 'Gagal'] }[k] || ['tag-neutral', k]; return '<span class="tag ' + m[0] + '">' + m[1] + '</span>'; }
  /* muat referensi sekali per kunci; gambar ulang saat datang */
  function muat(kunci, fn) { var c = K.ppob.cache; if (c[kunci]) return c[kunci]; c[kunci] = { memuat:true, data:[], sumber:'' }; fn().then(function (r) { c[kunci] = { memuat:false, data:r.data || [], sumber:r.sumber, catatan:r.catatan || '' }; if (K.layar === 'tagihan') X.gambar(); }); return c[kunci]; }
  function daftarPil(items, terpilih, aksiNama, label) { return '<div class="flex gap-6 wrap">' + items.map(function (x) { var v = typeof x === 'string' ? x : x.code, n = typeof x === 'string' ? x : x.name; return '<button class="' + kelas('pill pill-sm', terpilih === v) + '"' + aksi(aksiNama, v) + '>' + (label ? P().ikon(n) + ' ' : '') + esc(n) + '</button>'; }).join('') + '</div>'; }

  X.LAYAR.tagihan = function () {
    var s = K.ppob, p = P(), cfg = p.pengaturan();
    /* refund otomatis bila admin menyatakan transaksi gagal setelah dompet dipotong */
    p.riwayat(pembeli().nama).forEach(function (t) { if (t.keadaan === 'gagal' && t.dompetDipotong && !t.direfund) { K.saldo += t.total; K.mutasi.unshift({ label:'Refund ' + t.produk + ' · ' + t.nomor, date:'today · penyedia gagal', amount:t.total }); p.ubah(t.id, { direfund:true }); } });
    var h = '<div class="screen">' + X.kepala('Bayar & Isi Ulang', 'Tagihan, pulsa, data, token listrik · bayar EXO Wallet', 'home') + '<div class="stack gap-12 pad-x18">';
    h += '<div class="flex gap-8">' + [['ppob', '🧾 Tagihan'], ['topup', '📱 Pulsa & Data'], ['riwayat', 'Riwayat']].map(function (t) { return '<button class="' + kelas('pill', s.tab === t[0]) + '"' + aksi('ppobTab', t[0]) + '>' + t[1] + '</button>'; }).join('') + '</div>';
    if (s.hasil) h += kartuHasil(s.hasil);
    if (s.tab === 'ppob') h += tabPPOB(s, cfg); else if (s.tab === 'topup') h += tabTopUp(s, cfg); else h += tabRiwayat();
    h += '<div class="t-11 o-6 lh-145">Layanan oleh Darmawisata Indonesia (H2H) lewat server EXOCLEAN. Biaya admin ' + rp(cfg.biayaAdminPPOB) + ' per tagihan, margin ' + rp(cfg.marginTopUp) + ' per isi ulang. Uang dipotong dari EXO Wallet hanya setelah penyedia mengonfirmasi.</div><div class="spacer-14"></div></div></div>';
    return h;
  };
  function tabPPOB(s, cfg) {
    var g = muat('grup', P().grupPPOB), h = '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span class="t-115 up o-6 grow">Jenis tagihan</span>' + (g.memuat ? '<span class="t-11 o-6">memuat…</span>' : lencana(g.sumber)) + '</div>' + daftarPil(g.data, s.grup, 'ppobGrup', true);
    if (s.grup) { var pr = muat('produk:' + s.grup, function () { return P().produkPPOB(s.grup); }); h += '<div class="t-115 up o-6" style="margin-top:6px">Penyedia</div>' + (pr.memuat ? '<span class="t-11 o-6">memuat…</span>' : daftarPil(pr.data.filter(function (x) { return x.isActive !== false; }), s.produk && s.produk.code, 'ppobProduk')); }
    h += '</div>';
    if (s.produk) {
      h += '<div class="card elev-sm gap-8"><div class="t-125 bold">' + P().ikon(s.grup) + ' ' + esc(s.produk.name) + '</div><input class="input" inputmode="numeric" data-simpan="ppob.nomor" value="' + esc(s.nomor) + '" placeholder="' + esc(s.grup === 'PLN' ? 'ID pelanggan / nomor meter' : s.grup === 'BPJS' ? 'Nomor VA keluarga (88888…)' : 'Nomor pelanggan') + '"><input class="input" inputmode="tel" data-simpan="ppob.hp" value="' + esc(s.hp) + '" placeholder="Nomor HP untuk notifikasi (wajib)"><button class="btn btn-primary" style="height:40px"' + (s.memuat === 'cek' ? ' disabled' : aksi('ppobCek')) + '>' + (s.memuat === 'cek' ? 'Mengecek tagihan…' : 'Cek tagihan') + '</button>' + (s.cek && !s.cek.ok ? '<div class="t-12" style="color:#9b1c1c">' + esc(s.cek.catatan || 'Tagihan tidak ditemukan') + '</div>' : '') + '</div>';
      if (s.cek && s.cek.ok) { var t = s.cek.tagihan, r = s.cek.rincian; h += '<div class="card card-leaf gap-6"><div class="flex items-center gap-8"><b class="grow t-135">Tagihan ' + esc(s.produk.name) + '</b>' + lencana(s.cek.sumber) + '</div><div class="kv"><span>Nama</span><b>' + esc(t.customerName || '—') + '</b></div><div class="kv"><span>Nomor</span><b>' + esc(t.customerID || s.nomor) + '</b></div>' + (t.billPeriod ? '<div class="kv"><span>Periode</span><b>' + esc(t.billPeriod) + '</b></div>' : '') + '<div class="rule"></div><div class="kv"><span>Tagihan</span><b>' + rp(r.tagihan) + '</b></div>' + (r.adminPenyedia ? '<div class="kv"><span>Admin penyedia</span><b>' + rp(r.adminPenyedia) + '</b></div>' : '') + '<div class="kv"><span>Biaya admin EXOCLEAN</span><b>' + rp(r.biayaAdmin) + '</b></div><div class="kv"><span>Total bayar</span><b class="f-head t-18">' + rp(r.total) + '</b></div><div class="t-11 o-7">Saldo EXO Wallet ' + rp(X.saldoTersedia()) + '</div>' + tombolBayar(r.total, 'ppobBayar') + '</div>'; }
    }
    return h;
  }
  function tabTopUp(s, cfg) {
    var j = muat('jenis', P().jenisTopUp), h = '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span class="t-115 up o-6 grow">Jenis</span>' + (j.memuat ? '<span class="t-11 o-6">memuat…</span>' : lencana(j.sumber)) + '</div>' + daftarPil(j.data, s.jenis, 'ppobJenis', true);
    if (s.jenis) { var pv = muat('penyedia:' + s.jenis, function () { return P().penyediaTopUp(s.jenis); }); h += '<div class="t-115 up o-6" style="margin-top:6px">Operator / penyedia</div>' + (pv.memuat ? '<span class="t-11 o-6">memuat…</span>' : daftarPil(pv.data, s.penyedia, 'ppobPenyedia')); }
    h += '</div>';
    if (s.penyedia) {
      var pr = muat('topup:' + s.jenis + ':' + s.penyedia, function () { return P().produkTopUp(s.jenis, s.penyedia); });
      h += '<div class="card elev-sm gap-8"><input class="input" inputmode="tel" data-simpan="ppob.nomor" value="' + esc(s.nomor) + '" placeholder="' + esc(s.jenis === 'TokenPLN' ? 'Nomor meter / ID pelanggan' : 'Nomor HP tujuan (08…)') + '"><div class="flex items-center gap-8"><span class="t-115 up o-6 grow">Nominal</span>' + (pr.memuat ? '<span class="t-11 o-6">memuat…</span>' : lencana(pr.sumber)) + '</div><div class="grid-2">' + pr.data.filter(function (x) { return x.isActive !== false; }).map(function (x) { var jual = P().hargaJualTopUp(x), on = s.pilihan && s.pilihan.code === x.code; return '<button class="card ' + (on ? 'card-leaf' : 'elev-sm') + ' gap-2" style="text-align:start;cursor:pointer;padding:10px 12px"' + aksi('ppobPilih', x.code) + '><div class="t-125 bold">' + esc(x.name) + '</div><div class="t-11 o-7">' + rp(jual) + '</div></button>'; }).join('') + '</div></div>';
      if (s.pilihan) h += '<div class="card card-leaf gap-6"><div class="kv"><span>' + esc(s.pilihan.name) + ' → ' + esc(s.nomor || '(isi nomor)') + '</span><b class="f-head t-18">' + rp(P().hargaJualTopUp(s.pilihan)) + '</b></div><div class="t-11 o-7">Harga penyedia ' + rp(s.pilihan.price) + ' + margin ' + rp(cfg.marginTopUp) + ' · saldo ' + rp(X.saldoTersedia()) + '</div>' + tombolBayar(P().hargaJualTopUp(s.pilihan), 'ppobBeli') + '</div>';
    }
    return h;
  }
  function tombolBayar(total, aksiNama) {
    var s = K.ppob;
    if (s.memuat === 'bayar') return '<button class="btn btn-primary" style="height:42px" disabled>Memproses ke penyedia…</button>';
    if (s.pinOpen) return '<div class="stack gap-8"><div class="flex items-center gap-10"><div class="grow t-125 bold">PIN transaksi 6 digit</div><button class="btn btn-ghost t-12"' + aksi('ppobPinBatal') + '>Batal</button></div>' + X.pinDots(K.payPin, true) + X.keypad('payPinTekan', true) + '<button class="btn btn-primary" style="height:42px"' + (K.payPin.length < 6 ? ' disabled' : aksi(aksiNama)) + '>Konfirmasi bayar · ' + rp(total) + '</button></div>';
    return '<button class="btn btn-primary" style="height:42px"' + (total > X.saldoTersedia() ? ' disabled' : aksi('ppobPinBuka')) + '>' + (total > X.saldoTersedia() ? 'Saldo kurang ' + rp(total - X.saldoTersedia()) : 'Bayar dengan EXO Wallet · ' + rp(total)) + '</button>';
  }
  function kartuHasil(h) {
    var t = h.tx || {}, k = h.keadaan, warna = k === 'selesai' ? 'card-leaf' : k === 'gagal' ? 'elev-sm' : 'card-clay';
    return '<div class="card ' + warna + ' gap-6"><div class="flex items-center gap-8">' + keadaanTag(k) + '<b class="grow t-135">' + esc(t.produk || '') + '</b><button class="btn btn-ghost t-12"' + aksi('ppobTutupHasil') + '>Tutup</button></div><div class="t-125">' + esc(t.nomor || '') + (t.namaPelanggan ? ' · ' + esc(t.namaPelanggan) : '') + ' · ' + rp(t.total || 0) + '</div>' + (t.token ? '<div class="card elev-sm" style="text-align:center"><div class="t-11 up o-6">Token / SN</div><div class="f-head t-18" style="letter-spacing:1px">' + esc(t.token) + '</div></div>' : '') + (t.penanda ? '<div class="t-11 o-7">Ref penyedia ' + esc(t.penanda) + (t.sumber === 'simulasi' ? ' · simulasi' : '') + '</div>' : '') + (h.pesan ? '<div class="t-115 lh-145">' + esc(h.pesan) + '</div>' : k === 'selesai' ? '<div class="t-115 lh-145">Struk tersimpan di Riwayat. Dompet dipotong ' + rp(t.total || 0) + '.</div>' : '') + '</div>';
  }
  function tabRiwayat() { var d = P().riwayat(pembeli().nama); if (!d.length) return '<div class="card elev-sm t-125 o-7">Belum ada transaksi tagihan atau isi ulang.</div>'; return '<div class="stack gap-8">' + d.map(function (t) { return '<div class="card elev-sm gap-3"><div class="flex items-center gap-8">' + keadaanTag(t.keadaan) + '<span class="t-11 o-6">' + esc(String(t.at).slice(0, 16).replace('T', ' ')) + '</span><b style="margin-inline-start:auto">' + rp(t.total) + '</b></div><div class="t-125 bold">' + P().ikon(t.grup) + ' ' + esc(t.produk) + '</div><div class="t-11 o-7">' + esc(t.nomor) + (t.namaPelanggan ? ' · ' + esc(t.namaPelanggan) : '') + (t.token ? ' · token ' + esc(t.token) : '') + (t.penanda ? ' · ref ' + esc(t.penanda) : '') + (t.sumber === 'simulasi' ? ' · simulasi' : '') + '</div>' + (t.pesan && t.keadaan !== 'selesai' ? '<div class="t-11 o-7">' + esc(t.pesan) + '</div>' : '') + '</div>'; }).join('') + '</div>'; }

  A.ppobTab = function (v) { K.ppob.tab = v; K.ppob.hasil = null; K.ppob.pinOpen = false; };
  A.ppobGrup = function (v) { var s = K.ppob; s.grup = v; s.produk = null; s.cek = null; s.hasil = null; };
  A.ppobProduk = function (v) { var s = K.ppob, c = s.cache['produk:' + s.grup]; s.produk = (c && c.data || []).filter(function (x) { return x.code === v; })[0] || { code:v, name:v, group:s.grup }; s.cek = null; };
  A.ppobJenis = function (v) { var s = K.ppob; s.jenis = v; s.penyedia = ''; s.pilihan = null; s.hasil = null; };
  A.ppobPenyedia = function (v) { var s = K.ppob; s.penyedia = v; s.pilihan = null; };
  A.ppobPilih = function (v) { var s = K.ppob, c = s.cache['topup:' + s.jenis + ':' + s.penyedia]; s.pilihan = (c && c.data || []).filter(function (x) { return x.code === v; })[0] || null; s.pinOpen = false; };
  A.ppobCek = function () { var s = K.ppob; if (!s.nomor || s.nomor.replace(/\D/g, '').length < 6) { X.sekilas('Isi nomor pelanggan dengan benar.', 'err'); return; } if (!s.hp || s.hp.replace(/\D/g, '').length < 9) { X.sekilas('Nomor HP wajib untuk notifikasi penyedia.', 'err'); return; } s.memuat = 'cek'; s.cek = null; P().cekTagihan(s.produk.code, s.nomor.replace(/\D/g, ''), s.hp.replace(/\D/g, '')).then(function (r) { s.memuat = ''; s.cek = r; s.pinOpen = false; X.gambar(); }); };
  A.ppobPinBuka = function () { K.ppob.pinOpen = true; K.payPin = ''; };
  A.ppobPinBatal = function () { K.ppob.pinOpen = false; K.payPin = ''; };
  A.ppobTutupHasil = function () { K.ppob.hasil = null; };
  function setelahBayar(h) {
    var s = K.ppob; s.memuat = ''; s.pinOpen = false; K.payPin = '';
    if (h.keadaan === 'selesai' || h.keadaan === 'tertunda') { if (!h.diulang) { K.saldo -= h.tx.total; K.mutasi.unshift({ label:(h.tx.jenis === 'ppob' ? 'Bayar tagihan ' : 'Isi ulang ') + h.tx.produk + ' · ' + h.tx.nomor, date:'today' + (h.keadaan === 'tertunda' ? ' · menunggu penyedia' : ''), amount:-h.tx.total }); P().ubah(h.tx.id, { dompetDipotong:true }); h.tx.dompetDipotong = true; } s.cek = null; s.pilihan = null; }
    s.hasil = h; X.sekilas(h.keadaan === 'selesai' ? 'Transaksi berhasil.' : h.keadaan === 'gagal' ? 'Transaksi ditolak: ' + (h.pesan || '') : 'Transaksi ' + h.keadaan + ' — lihat keterangan.', h.keadaan === 'selesai' ? 'ok' : 'err'); X.gambar();
  }
  A.ppobBayar = function () { var s = K.ppob; if (K.payPin.length < 6 || !s.cek || !s.cek.ok) return; if (s.cek.rincian.total > X.saldoTersedia()) { X.sekilas('Saldo EXO Wallet kurang.', 'err'); return; } s.memuat = 'bayar'; X.gambar(); P().bayarPPOB(s.cek.tagihan, s.cek.rincian, pembeli(), s.produk).then(setelahBayar); };
  A.ppobBeli = function () { var s = K.ppob; if (K.payPin.length < 6 || !s.pilihan) return; var no = (s.nomor || '').replace(/\D/g, ''); if (no.length < 9) { X.sekilas('Isi nomor tujuan dengan benar.', 'err'); return; } if (P().hargaJualTopUp(s.pilihan) > X.saldoTersedia()) { X.sekilas('Saldo EXO Wallet kurang.', 'err'); return; } s.memuat = 'bayar'; X.gambar(); P().pesanTopUp(s.pilihan, no, pembeli(), s.jenis, s.penyedia).then(setelahBayar); };
})(ExoApp);
