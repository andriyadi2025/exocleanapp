/* ==========================================================================
   exo-sheets.js — lembar bawah, peta AKSI, dan pemasangan EXOCLEAN App
   --------------------------------------------------------------------------
   Lembar digambar di #exo-lapis — DI LUAR .app — supaya menempel di dasar
   bingkai ponsel dan tidak ikut tergulir bersama isi layar.
   Tiap penangan AKSI hanya mengubah keadaan; penggambaran ulang dikerjakan
   oleh tekan() di exo-core.js sesudahnya.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, I = X.I, K = X.KEADAAN, esc = X.esc, rp = X.rp, aksi = X.aksi, kelas = X.kelas, av = X.av,
      ikon = X.ikon, garis = X.garis, IK = X.IK, IKON = X.IKON, t = I.t, tx = I.tx, sekilas = X.sekilas;

  var NOMINAL = [50000, 100000, 250000, 500000];

  function kerangka(judul, isi, kaki) {
    return '<div class="sheet-back' + (X.lembarBaru() ? ' baru' : '') + '"' + aksi('tutupLembar') + '>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(judul) + '" data-diam="1">' +
      '<div class="sheet-grip"></div><div class="sheet-head"><div class="sheet-title">' + judul + '</div>' +
      '<button class="btn btn-icon btn-soft"' + aksi('tutupLembar') + ' aria-label="Close">✕</button></div>' +
      '<div class="sheet-body">' + isi + '</div>' + (kaki ? '<div class="sheet-foot">' + kaki + '</div>' : '') + '</div></div>';
  }
  function petakNominal(batas) {
    var h = '<div class="grid-2">';
    for (var i = 0; i < NOMINAL.length; i++) {
      var n = NOMINAL[i], lewat = batas !== undefined && n > batas;
      h += '<button class="' + kelas('nominal', K.nominal === n) + '"' + (lewat ? ' disabled' : aksi('nominal', n)) + '>' + rp(n) + '</button>';
    }
    return h + '</div>';
  }

  X.LEMBAR.alamat = function () {
    var h = '';
    for (var i = 0; i < D.ADDRESSES.length; i++) {
      var a = D.ADDRESSES[i], on = K.alamat === a.id;
      h += '<button class="' + kelas('row', on) + '"' + aksi('pilihAlamat', a.id) + '><span class="row-main"><b>' + esc(tx(a.label)) + '</b><span>' + esc(a.brief) + '</span></span><span class="' + kelas('dot', on) + '"></span></button>';
    }
    return kerangka(esc(t('cleaningAt')), h + '<div class="t-115 o-6 lh-15" style="padding:2px 4px">Changing the address changes who is available — cleaners are listed by distance from it.</div>');
  };
  X.LEMBAR.notif = function () {
    var h = '';
    for (var i = 0; i < D.NOTIFS.length; i++) h += '<div class="card gap-6"><div class="flex items-center gap-8"><div class="grow t-135 bold">' + esc(D.NOTIFS[i].title) + '</div><span class="t-11 o-6">' + esc(D.NOTIFS[i].time) + '</span></div><div class="t-125 lh-15 o-8">' + esc(D.NOTIFS[i].body) + '</div></div>';
    if (!K.notifAktif) h += '<div class="card card-clay t-125 lh-15">Notifications are switched off in Profile, so nothing new will reach you — including the ones about your slot being moved.</div>';
    return kerangka(esc(tx('Notifications')), h);
  };
  X.LEMBAR.obrol = function () {
    var h = '';
    for (var i = 0; i < K.obrolan.length; i++) {
      var p = K.obrolan[i], saya = p.from === 'me';
      h += '<div class="stack" style="align-items:' + (saya ? 'flex-end' : 'flex-start') + '"><div class="bubble ' + (saya ? 'dari-saya' : 'dari-mereka') + '">' + esc(p.text) + '</div><div class="bubble-jam">' + esc(p.time) + '</div></div>';
    }
    if (K.mengetik) h += '<div class="bubble dari-mereka o-7" style="align-self:flex-start">Rahma is typing…</div>';
    var kaki = '<div class="chat-kirim"><input class="input" id="exo-pesan" data-simpan="pesanBaru" value="' + esc(K.pesanBaru) + '" placeholder="Type a message" aria-label="Message"><button class="btn btn-primary btn-icon"' + aksi('kirimPesan') + ' aria-label="Send">' + ikon(IKON.kirim, 18) + '</button></div>';
    return kerangka('Rahma · support', h, kaki);
  };
  X.LEMBAR.isi = function () {
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + (K.nominal ? aksi('isiSaldo') : ' disabled') + '>' + (K.nominal ? t('topUp') + ' ' + rp(K.nominal) : tx('Pick an amount')) + '</button>';
    return kerangka(esc(t('topUp')), petakNominal() + '<div class="row" style="cursor:default"><span class="paymark">VA</span><span class="row-main"><b>BCA Virtual Account</b><span>Lands instantly · no fee</span></span></div>' +
      '<div class="t-115 o-6 lh-15" style="padding:2px 4px">Wallet money is withdrawable to your bank at any time. Topping up never buys credit that expires.</div>', kaki);
  };
  X.LEMBAR.riwayat = function () {
    var h = '';
    for (var i = 0; i < K.mutasi.length; i++) {
      var m = K.mutasi[i], keluar = m.amount < 0;
      h += '<div class="flex items-center gap-11"><span class="txn-ic' + (keluar ? ' out' : '') + '">' + (keluar ? '↓' : '↑') + '</span><div class="grow"><div class="t-13 bold">' + esc(m.label) + '</div><div class="t-11 o-6">' + esc(m.date) + '</div></div><div class="txn-amt' + (keluar ? ' out' : '') + '">' + (keluar ? '− ' : '+ ') + rp(Math.abs(m.amount)) + '</div></div>';
    }
    var kaki = '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('lembar', 'tarik') + '>' + esc(tx('Withdraw')) + ' ' + esc(tx('to bank')) + '</button>';
    return kerangka(esc(t('history')), '<div class="card elev-sm gap-12">' + h + '</div>', kaki);
  };
  X.LEMBAR.tarik = function () {
    var cukup = K.nominal && K.nominal <= K.saldo;
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + (cukup ? aksi('tarikSaldo') : ' disabled') + '>' + (cukup ? tx('Withdraw') + ' ' + rp(K.nominal) : tx('Pick an amount')) + '</button>';
    return kerangka(esc(tx('Withdraw')), petakNominal(K.saldo) + '<div class="row" style="cursor:default"><span class="paymark">BCA</span><span class="row-main"><b>BCA ···4471</b><span>Dewi Anggraini · arrives in 1 working day</span></span></div>' +
      '<div class="t-115 o-6 lh-15" style="padding:2px 4px">' + esc(tx('Balance')) + ' ' + rp(K.saldo) + '. ' + esc(tx('Amounts above it are greyed out rather than failing after you tap.')) + '</div>', kaki);
  };
  X.LEMBAR.rincian = function () {
    var h = '<div class="card elev-sm gap-10">', total = 0;
    for (var i = 0; i < D.BARS.length; i++) {
      var n = X.upahHari(D.BARS[i][1]); total += n;
      h += '<div class="flex items-center gap-10"><div class="grow"><div class="t-13 bold">' + D.BARS[i][0] + '</div><div class="t-11 o-6">' + esc(D.BARS[i][2]) + '</div></div><div class="t-13">' + rp(n) + '</div></div>';
    }
    h += '<div class="rule"></div><div class="flex items-baseline between"><span class="f-head t-15">Terkumpul 7 hari</span><span class="f-head t-19">' + rp(total) + '</span></div></div>' +
      '<div class="t-115 o-6 lh-15" style="padding:2px 4px">' + (total > K.saldoMitra ? 'Lebih tinggi dari “Tersedia sekarang” karena ' + rp(total - K.saldoMitra) + ' sudah dicairkan ke rekening Anda.' : 'Lebih rendah dari “Tersedia sekarang”, yang juga memuat penghasilan sebelum minggu ini.') + ' Batang grafik digambar dari daftar yang sama.</div>';
    return kerangka('Rekap', h);
  };
  X.LEMBAR.pindah = function () {
    var hari = K.pindahHari === null ? K.hari : K.pindahHari, jam = K.pindahJam === null ? K.mulai : K.pindahJam;
    var h = '<div>' + X.labelBagian('New date') + '<div class="hscroll">';
    for (var i = 0; i < 7; i++) { var d = X.hariKe(i); h += '<button class="' + kelas('day', hari === i) + '"' + aksi('pindahHari', i) + '><em>' + esc(I.dowShort(d)) + '</em><b>' + ('0' + d.getDate()).slice(-2) + '</b></button>'; }
    h += '</div></div><div>' + X.labelBagian('New start time') + '<div class="flex wrap gap-8">';
    for (var j = 0; j < D.TIMES.length; j++) h += '<button class="' + kelas('pill', jam === D.TIMES[j]) + '"' + aksi('pindahJam', D.TIMES[j]) + '>' + D.TIMES[j] + '</button>';
    h += '</div><div class="t-115 o-6 lh-145" style="margin-top:8px">' + esc(tx('Times follow')) + ' ' + esc(K.addr.kabkota || K.addr.provinsi || K.addr.negara) + ' · ' + esc(X.labelZona()) + '</div></div>';
    /* Aturan 4 jam dihitung lewat UTC dari jam kota pesanan, bukan jam ponsel. */
    var sisa = X.menitKeMulai(), kunci = sisa < 240;
    h += '<div class="card ' + (kunci ? 'card-clay' : 'card-leaf') + ' t-125 lh-15">' + esc(kunci
      ? tx('Less than 4 hours before the start — moving it costs Rp50.000 per cleaner.')
      : tx('More than 4 hours before the start — moving it is free.')) + '</div>';
    h += '<div class="card card-leaf t-125 lh-15">' + esc(X.juruKini().name) + ' ' + esc(tx('keeps the job and the price. Only you can do this — we never move a confirmed booking, and if we ever did, Rp100.000 would already be in your wallet.')) + '</div>';
    var berubah = hari !== K.hari || jam !== K.mulai, dd = X.hariKe(hari);
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + (berubah ? aksi('pindahSimpan') : ' disabled') + '>' + (berubah ? esc(tx('Move to')) + ' ' + esc(I.dowShort(dd) + ' ' + I.dayMonth(dd)) + ' · ' + jam + ' ' + esc(X.labelZona()) : esc(tx('Pick a new slot'))) + '</button>';
    return kerangka(esc(tx('Move time')), h, kaki);
  };
  function totalItem(items) { return items.reduce(function (n, i) { return n + i.harga; }, 0); }
  X.LEMBAR.penawaran = function () {
    var p = K.penawaran; if (!p) return kerangka(esc(tx('Quote')), '<div class="t-125 o-7">' + esc(tx('No quote yet.')) + '</div>');
    var h = '<div class="card elev-sm gap-8">';
    p.items.forEach(function (i) { h += '<div class="kv"><span>' + esc(i.nama) + '</span><span>' + rp(i.harga) + '</span></div>'; });
    h += '<div class="kv"><span>' + esc(tx('Platform fee')) + '</span><span>' + rp(D.PLATFORM_FEE) + '</span></div><div class="rule"></div><div class="flex items-baseline between"><span class="f-head t-15">' + esc(t('totalLbl')) + '</span><span class="f-head t-20">' + rp(totalItem(p.items) + D.PLATFORM_FEE) + '</span></div></div>';
    h += '<div class="card card-leaf t-125 lh-15">' + esc(tx('Fixed price from the survey, valid 7 days. Accepting pays from your chosen method and locks the schedule to')) + ' ' + esc(X.namaDepan(X.juruKini())) + '. ' + esc(tx('Declining costs nothing.')) + '</div>';
    var kaki = p.status === 'menunggu'
      ? '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('tolakPenawaran') + '>' + esc(tx('Decline')) + '</button><button class="btn btn-primary" style="flex:1"' + aksi('terimaPenawaran') + '>' + esc(tx('Accept & pay')) + ' · ' + rp(totalItem(p.items) + D.PLATFORM_FEE) + '</button></div>'
      : '<div class="center t-125 o-7">' + esc(p.status === 'diterima' ? tx('Quote accepted') : tx('Quote declined')) + '</div>';
    return kerangka(esc(tx('Quote from the survey')), h, kaki);
  };
  X.LEMBAR.timbang = function () {
    var w = K.timbangan; if (!w) return kerangka(esc(tx('Weigh result')), '<div class="t-125 o-7">' + esc(tx('Not weighed yet.')) + '</div>');
    var total = w.total + X.addonTotal() + D.PLATFORM_FEE - (X.voucherApplied() ? X.voucherKini().amount : 0);
    var h = '<div class="card elev-sm gap-8"><div class="kv"><span>' + esc(tx('Weight at pickup')) + '</span><span>' + w.kg + ' kg</span></div><div class="kv"><span>' + esc(tx('Rate')) + '</span><span>' + rp(w.tarif) + ' / kg</span></div><div class="kv"><span>' + esc(tx('Add-ons')) + '</span><span>' + rp(X.addonTotal()) + '</span></div><div class="kv"><span>' + esc(tx('Platform fee')) + '</span><span>' + rp(D.PLATFORM_FEE) + '</span></div>' + (X.voucherApplied() ? '<div class="kv"><span>' + esc(X.voucherKini().code) + '</span><span>− ' + rp(X.voucherKini().amount) + '</span></div>' : '') + '<div class="rule"></div><div class="flex items-baseline between"><span class="f-head t-15">' + esc(t('totalLbl')) + '</span><span class="f-head t-20">' + rp(total) + '</span></div></div>';
    h += '<div class="card card-leaf t-125 lh-15">' + esc(tx('The estimate at booking was')) + ' ' + rp(X.totalN()) + '. ' + esc(tx('The final price follows the weight photographed at your door; approving charges it and the washing starts.')) + '</div>';
    var kaki = w.status === 'menunggu' ? '<button class="btn btn-primary btn-block btn-tall"' + aksi('setujuTimbang') + '>' + esc(tx('Approve & pay')) + ' · ' + rp(total) + '</button>' : '<div class="center t-125 o-7">' + esc(tx('Final price approved')) + '</div>';
    return kerangka(esc(tx('Final price after weighing')), h, kaki);
  };
  X.LEMBAR.struk = function () {
    var r = K.struk; if (!r) return kerangka(esc(tx('Receipt')), '<div class="t-125 o-7">' + esc(tx('No receipt yet.')) + '</div>');
    var h = '<div class="card elev-sm gap-8"><div class="kv"><span>' + esc(tx('Goods on the receipt')) + '</span><span>' + rp(r.total) + '</span></div><div class="kv"><span>' + esc(tx('Runner fee')) + '</span><span>' + esc(tx('paid at booking')) + '</span></div>' + (r.catatan ? '<div class="t-115 o-7">' + esc(r.catatan) + '</div>' : '') + '</div>';
    h += '<div class="card card-leaf t-125 lh-15">' + esc(tx('Goods are settled at cost against the photographed receipt — never marked up. Approving charges your EXO Wallet and the runner heads to you.')) + '</div>';
    var kaki = r.status === 'menunggu' ? '<button class="btn btn-primary btn-block btn-tall"' + aksi('setujuStruk') + '>' + esc(tx('Approve goods total')) + ' · ' + rp(r.total) + '</button>' : '<div class="center t-125 o-7">' + esc(tx('Goods total approved')) + '</div>';
    return kerangka(esc(tx('Shopping receipt')), h, kaki);
  };
  X.LEMBAR.ekstra = function () {
    var list = K.ekstra || [], h = '';
    if (!list.length) h = '<div class="t-125 o-7">' + esc(tx('No extra work proposed.')) + '</div>';
    list.forEach(function (e) {
      h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="grow"><div class="t-135 bold">' + esc(e.nama) + '</div><div class="t-115 o-65">' + rp(e.harga) + '</div></div>' +
        (e.status === 'menunggu' ? '<button class="btn btn-secondary" style="height:36px"' + aksi('ekstraPutus', e.id + ':tidak') + '>' + esc(tx('Decline')) + '</button><button class="btn btn-primary" style="height:36px"' + aksi('ekstraPutus', e.id + ':ya') + '>' + esc(tx('Approve')) + '</button>'
          : '<span class="tag ' + (e.status === 'diterima' ? 'tag-accent' : 'tag-neutral') + '">' + esc(e.status === 'diterima' ? tx('Approved') : tx('Declined')) + '</span>') + '</div></div>';
    });
    h += '<div class="card card-leaf t-125 lh-15">' + esc(tx('Anything found on site beyond the original scope is priced here first. Nothing extra is done, or charged, until you approve it.')) + '</div>';
    return kerangka(esc(tx('Extra work on site')), h);
  };
  /* ---- sisi mitra ---- */
  X.LEMBAR.kirimPenawaran = function () {
    var f = K.penawaranForm;
    var h = '<div class="t-125 lh-15 o-85">Hasil survei ditulis sebagai penawaran harga tetap. Pelanggan menyetujui atau menolak di aplikasinya; jadwal terkunci hanya setelah disetujui dan dibayar.</div>' +
      '<div class="field"><label>Lingkup 1</label><input class="input" data-simpan="penawaranForm.a" value="' + esc(f.a) + '" placeholder="mis. Deep cleaning 3 kamar + 2 kamar mandi"></div>' +
      '<div class="field"><label>Harga 1 (Rp)</label><input class="input" type="number" inputmode="numeric" data-simpan="penawaranForm.ha" value="' + esc(f.ha) + '"></div>' +
      '<div class="field"><label>Lingkup 2 (opsional)</label><input class="input" data-simpan="penawaranForm.b" value="' + esc(f.b) + '" placeholder="mis. Bahan kimia & mesin"></div>' +
      '<div class="field"><label>Harga 2 (Rp)</label><input class="input" type="number" inputmode="numeric" data-simpan="penawaranForm.hb" value="' + esc(f.hb) + '"></div>';
    return kerangka('Kirim penawaran survei', h, '<button class="btn btn-primary btn-block btn-tall"' + aksi('kirimPenawaran') + '>Kirim ke pelanggan</button>');
  };
  X.LEMBAR.kirimTimbang = function () {
    var h = '<div class="t-125 lh-15 o-85">Timbang di depan pelanggan dan foto angkanya. Harga akhir = kg × tarif Anda; pelanggan menyetujui di aplikasi sebelum cucian dibawa.</div>' +
      '<div class="field"><label>Berat (kg)</label><input class="input" type="number" step="0.1" inputmode="decimal" data-simpan="timbangForm" value="' + esc(K.timbangForm) + '" placeholder="mis. 6.5"></div>' +
      '<div class="t-115 o-6">Tarif Anda ' + rp(X.rateFor(X.juruKini())) + ' / kg</div>';
    return kerangka('Kirim hasil timbang', h, '<button class="btn btn-primary btn-block btn-tall"' + aksi('kirimTimbang') + '>Kirim ke pelanggan</button>');
  };
  X.LEMBAR.kirimStruk = function () {
    var f = K.strukForm;
    var h = '<div class="t-125 lh-15 o-85">Foto struk, tulis totalnya. Barang ditagih ke dompet pelanggan sesuai struk setelah disetujui — tidak ada mark-up.</div>' +
      '<div class="field"><label>Total belanja di struk (Rp)</label><input class="input" type="number" inputmode="numeric" data-simpan="strukForm.total" value="' + esc(f.total) + '"></div>' +
      '<div class="field"><label>Catatan (barang pengganti, kosong, dsb.)</label><input class="input" data-simpan="strukForm.catatan" value="' + esc(f.catatan) + '"></div>';
    return kerangka('Kirim struk belanja', h, '<button class="btn btn-primary btn-block btn-tall"' + aksi('kirimStruk') + '>Kirim ke pelanggan</button>');
  };
  X.LEMBAR.ajukanEkstra = function () {
    var f = K.ekstraForm;
    var h = '<div class="t-125 lh-15 o-85">Ada yang di luar lingkup (isi freon, noda membandel, item tambahan)? Ajukan dulu — jangan dikerjakan sebelum pelanggan menyetujui di aplikasinya.</div>' +
      '<div class="field"><label>Pekerjaan tambahan</label><input class="input" data-simpan="ekstraForm.nama" value="' + esc(f.nama) + '" placeholder="mis. Isi freon R32 1 unit"></div>' +
      '<div class="field"><label>Harga (Rp)</label><input class="input" type="number" inputmode="numeric" data-simpan="ekstraForm.harga" value="' + esc(f.harga) + '"></div>';
    var daftar = (K.ekstra || []).map(function (e) { return '<div class="kv"><span>' + esc(e.nama) + ' · ' + rp(e.harga) + '</span><span>' + esc(e.status) + '</span></div>'; }).join('');
    if (daftar) h += '<div class="card elev-sm gap-6"><div class="t-115 o-6">Sudah diajukan</div>' + daftar + '</div>';
    return kerangka('Ajukan pekerjaan tambahan', h, '<button class="btn btn-primary btn-block btn-tall"' + aksi('ajukanEkstra') + '>Ajukan ke pelanggan</button>');
  };
  X.LEMBAR.masalah = function () {
    var h = '';
    for (var i = 0; i < D.PARTNER_ISSUES.length; i++) h += '<button class="row"' + aksi('kirimMasalah', D.PARTNER_ISSUES[i].id) + '><span class="row-main"><b>' + esc(D.PARTNER_ISSUES[i].label) + '</b><span>' + esc(D.PARTNER_ISSUES[i].note) + '</span></span><span>' + garis(IK.kanan, 16) + '</span></button>';
    return kerangka('Laporkan masalah', h + '<div class="t-115 o-6 lh-15" style="padding:2px 4px">Ops menjawab dalam 60 detik. Melaporkan masalah tidak pernah mengurangi rating Anda.</div>');
  };
  X.LEMBAR.bayarTersimpan = function () {
    var h = '';
    for (var i = 0; i < D.PAYMENTS.length; i++) { var b = D.PAYMENTS[i]; h += '<div class="row" style="cursor:default"><span class="paymark">' + b.mark + '</span><span class="row-main"><b>' + esc(tx(b.name)) + '</b><span>' + esc(b.note ? tx(b.note) : rp(K.saldo) + ' · ' + tx('instant refunds here')) + '</span></span></div>'; }
    return kerangka(esc(tx('Payment methods')), h + '<div class="t-115 o-6 lh-15" style="padding:2px 4px">Cards and accounts are held by the payment provider, not by EXOCLEAN. We only ever see the last four digits.</div>');
  };

  /* Lembar pembayaran gateway: VA / QRIS / e-wallet / kartu dari
     payment-server.js (Midtrans). Muncul hanya bila servernya menjawab. */
  X.LEMBAR.gateway = function () {
    var g = K.gateway || {}, h = '';
    if (g.va) h += '<div class="card elev-sm gap-6"><div class="t-11 up o-6">' + esc(tx('Virtual account')) + ' ' + esc(g.va.bank) + '</div><div class="f-head t-22 tabular">' + esc(g.va.nomor) + '</div><div class="t-115 o-65">' + esc(tx('Transfer exactly')) + ' ' + rp(g.amount) + '. ' + esc(tx('The app polls the gateway every 5 seconds.')) + '</div></div>';
    if (g.qrImageUrl) h += '<div class="card elev-sm gap-8" style="align-items:center"><img src="' + esc(g.qrImageUrl) + '" alt="QRIS" style="width:220px;height:220px;border-radius:16px;background:#fff"><div class="t-115 o-65">Scan with any bank or e-wallet app · ' + rp(g.amount) + '</div></div>';
    if (g.kodeBayar) h += '<div class="card elev-sm gap-6"><div class="t-11 up o-6">Payment code</div><div class="f-head t-22 tabular">' + esc(g.kodeBayar) + '</div></div>';
    if (g.redirectUrl && !g.qrImageUrl) h += '<a class="btn btn-primary btn-block btn-tall" href="' + esc(g.redirectUrl) + '" target="_blank" rel="noopener">Open payment page</a>';
    h += '<div class="flex items-center gap-9 t-125"><span class="check-sm" style="background:' + (g.status === 'paid' ? 'var(--color-accent-2-500)' : 'var(--color-neutral-400)') + '">' + (g.status === 'paid' ? '✓' : '…') + '</span><span class="grow">Status: <b>' + esc(g.status || 'pending') + '</b>' + (g.gatewayRef ? ' · ref ' + esc(g.gatewayRef) : '') + '</span></div>';
    h += '<div class="t-115 o-6 lh-15" style="padding:2px 4px">Midtrans ' + esc(g.mode || 'sandbox') + ' · ' + esc(tx('Order')) + ' ' + esc(g.orderId) + '. ' + esc(tx('If payment is not completed within 30 minutes the order cancels itself.')) + '</div>';
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + aksi('gatewayCek') + '>' + esc(g.status === 'paid' ? tx('Paid ✓ · continue') : tx('I have paid · check now')) + '</button>';
    return kerangka('Complete payment', h, kaki);
  };

  /* Pembatalan: biaya 4 jam, dana yang ditahan, dan — bila kunjungan ini
     bagian dari paket — pilihan membatalkan paketnya sekalian dengan tarik
     kembali diskon bila komitmen minimal belum terpenuhi. */
  X.LEMBAR.batal = function () {
    var sisa = X.menitKeMulai(), telat = sisa < 240, fee = telat ? 50000 * K.regu : 0, j = X.juruKini();
    var h = '<div class="card elev-sm gap-6"><div class="f-head t-15">' + esc(I.svcName(K.jasa)) + ' · ' + esc(X.ringkasSlot()) + '</div><div class="t-115 o-65">' + esc(j.name) + ' · ' + esc(K.orderNo) + '</div></div>';
    h += '<div class="card ' + (telat ? 'card-clay' : 'card-leaf') + ' t-125 lh-15">' + esc(tx(telat ? 'Less than 4 hours before the start — cancelling costs Rp50.000 per cleaner.' : 'More than 4 hours before the start — cancelling is free.')) + '</div>';
    var hd = K.penahanan;
    if (hd && hd.status === 'ditahan') h += '<div class="card elev-sm gap-4"><div class="kv"><span>' + esc(tx('Funds held')) + '</span><span>' + rp(X.totalTahanan()) + '</span></div>' + (fee ? '<div class="kv"><span>' + esc(tx('Late cancellation fee')) + '</span><span>− ' + rp(fee) + '</span></div>' : '') + '<div class="rule"></div><div class="kv f-head"><span>' + esc(tx('Released')) + '</span><span>' + rp(Math.max(0, X.totalTahanan() - fee)) + '</span></div><div class="t-115 o-65">' + esc(tx(X.namaBayar(hd.metode))) + '</div></div>';
    var l = K.langganan;
    if (l && l.status === 'aktif') {
      var tarik = X.tarikDiskon();
      h += '<div class="card card-leaf gap-8"><div class="flex items-center gap-8"><span class="tag tag-accent">' + esc(tx(X.cariFrekuensi(l.frekuensi).label)) + '</span><span class="t-115 o-7">' + esc(tx('Visits completed')) + ' ' + l.kunjunganSelesai + ' ' + esc(tx('of minimum')) + ' ' + l.minKunjungan + '</span></div>' +
        '<div class="t-125 lh-15">' + esc(l.kunjunganSelesai < l.minKunjungan ? tx('Cancelling the plan now charges back the discount on completed visits:') + ' ' + rp(tarik) + '.' : tx('Commitment met — cancelling the plan is free.')) + '</div>' +
        '<button class="' + kelas('row', K.batalPaket) + '"' + aksi('batalPaket') + ' aria-pressed="' + K.batalPaket + '"><span class="row-main"><b>' + esc(tx(K.batalPaket ? 'Also cancel the plan' : 'Keep the plan — only this visit')) + '</b></span><span class="' + kelas('box', K.batalPaket) + '">✓</span></button></div>';
    }
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + aksi('batalSimpan') + '>' + esc(tx('Cancel booking')) + (fee ? ' · ' + rp(fee) : '') + '</button>';
    return kerangka(esc(tx('Cancel booking')), h, kaki);
  };

  /* ================================================================= AKSI */
  var A = X.AKSI;
  A.ke = function (v) { K.layar = v; };
  A.lompat = function (v) { K.layar = v; K.sisi = D.PARTNER_SCREENS.indexOf(v) >= 0 ? 'partner' : 'customer'; };
  A.pilihJasa = function (v) {
    K.jasa = v; K.layar = 'svc'; K.kit = {}; K.sopDone = {}; K.ppe = {}; K.sopFoto = {}; K.tambahan = {};
    K.jam = D.MIN_QTY[v] || D.DEFAULT_QTY[D.SERVICES[v].unit] || 1;
    K.regu = v === 'postreno' ? 2 : 1;
  };
  A.pesanCepat = function () {
    var d = X.daftarJuru();
    K.jasa = 'hourly'; K.jam = 3; K.regu = 1; K.hari = 1; K.mulai = '09:00'; K.tambahan = {};
    K.juru = d.length ? d[0].id : 'sw';   /* "petugas terbaik" = urutan pertama roster yang berlaku, bukan id contoh */
    K.layar = 'review';
  };
  A.jamKurang = function () { K.jam = Math.max(X.qtyMin(), K.jam - X.qtyStep()); };
  A.jamTambah = function () { K.jam = Math.min(X.qtyMax(), K.jam + X.qtyStep()); };
  A.regu = function (v) { K.regu = Number(v); };
  A.hari = function (v) { K.hari = Number(v); };
  A.mulai = function (v) { K.mulai = v; };
  A.tambahan = function (v) { K.tambahan[v] = !K.tambahan[v]; };
  A.syaratLayanan = function () { K.termTab = 'service'; K.layar = 'terms'; };
  A.saring = function (v) { K.saring = v; };
  A.juru = function (v) { K.juru = v; };
  A.voucher = function () { K.voucher = !K.voucher; };
  A.bayar = function (v) { K.bayar = v; };
  A.batalPin = function () { K.payPinOpen = false; K.payPin = ''; };
  A.payPinTekan = function (k) { K.payPin = k === '⌫' ? K.payPin.slice(0, -1) : (K.payPin + k).slice(0, 6); };
  function selesaiBayar() {
    K.layar = 'success'; K.tahap = 1; K.payPinOpen = false; K.payPin = ''; K.gatewaySibuk = false; K.dibatalkan = false; K.batalPaket = false;
    X.buatLangganan();   /* paket berkala bila pelanggan memilih frekuensi berulang */
    /* Tulis ke tabel orders basis data EXOCLEAN bila ada — pesanan ini lalu
       tampil di index.html dan di Orders konsol admin. */
    var o = X.tulisOrderDB();
    if (o) sekilas(tx('Order') + ' ' + o.no + ' ' + tx('written to the EXOCLEAN database · slot locked to') + ' ' + X.namaDepan(X.juruKini()) + '.');
  }
  /* Alur survei, timbang, dan kontrak tidak menagih apa pun saat ini: pesanan
     dibuat, tahap mulai dari nol, pembayaran menyusul saat pelanggan
     menyetujui penawaran / hasil timbang / tagihan bulanan. */
  function selesaiTanpaBayar() {
    K.layar = 'success'; K.tahap = 0; K.payPinOpen = false; K.payPin = ''; K.gatewaySibuk = false; K.dibatalkan = false; K.batalPaket = false; K.langganan = null; K.penahanan = null;
    K.penawaran = null; K.timbangan = null; K.struk = null; K.ekstra = [];
    var o = X.tulisOrderDB();
    if (o) sekilas(tx('Order') + ' ' + o.no + ' · ' + tx(X.alurMeta().tahap[0].title) + '.');
  }
  var PELANGGAN = { nama:'Dewi Anggraini', email:'dewi.anggraini@gmail.com', telp:'6281288904417' };
  /* Pesanan instan: dana DITAHAN, bukan ditagih — dompet memindahkan jumlah
     ke "tertahan", kartu lewat pre-auth gateway, kanal tanpa pre-auth
     (QRIS/VA/e-wallet) dicatat tertunda dan ditagih saat selesai. Alur lain
     yang menagih sekarang (titip: ongkos kurir) tetap dibayar langsung. */
  A.konfirmasi = function () {
    if (!X.tagihanSekarang()) { selesaiTanpaBayar(); return; }
    if (!K.payPinOpen) { K.payPinOpen = true; K.penawaran = null; K.timbangan = null; K.struk = null; K.ekstra = []; K.penahanan = null; return; }
    if (K.payPin.length < 6) return;
    var n = X.totalN(), tahan = X.ditahanDulu();
    if (K.bayar === 'wallet') {
      var tersedia = X.saldoTersedia();
      if (n > tersedia) { sekilas(tx('EXO Wallet is short by') + ' ' + rp(n - tersedia) + '. ' + tx('Top up or pick another method.'), 'err'); return; }
      if (tahan) { X.tahanDana(n, 'wallet'); selesaiBayar(); return; }
      K.saldo -= n; K.mutasi.unshift({ label:I.svcName(K.jasa) + ' · ' + X.namaDepan(X.juruKini()), date:'today · EXO-4471', amount:-n });
      selesaiBayar(); return;
    }
    /* Kanal lain lewat gateway bila server pendamping hidup; kalau tidak,
       simulasi — dan dikatakan begitu di pesan sekilas. */
    if (!window.EXO_SERVER) { if (tahan) X.tahanDana(n, K.bayar); selesaiBayar(); return; }
    K.gatewaySibuk = true;
    var orderId = 'EXO-' + Date.now().toString().slice(-6);
    var janji = tahan ? EXO_SERVER.tahan(K.bayar, orderId, n, PELANGGAN) : EXO_SERVER.bayar(K.bayar, orderId, n, PELANGGAN);
    janji.then(function (r) {
      K.gatewaySibuk = false;
      if (r.tunda) { X.tahanDana(n, K.bayar, { mode:'tunda', orderId:orderId }); sekilas(tx('No hold on this channel — you pay through the gateway once the visit is done.')); selesaiBayar(); X.gambar(); return; }
      if (r.offline) { sekilas(tx('Payment server offline — simulated confirmation (start app/server/payment-server.js for real Midtrans sandbox).'), 'err'); if (tahan) X.tahanDana(n, K.bayar); selesaiBayar(); X.gambar(); return; }
      if (!r.ok) { sekilas('Gateway refused: ' + (r.error || 'unknown') + '. Nothing was charged.', 'err'); X.gambar(); return; }
      K.gateway = Object.assign({ orderId:orderId, amount:n, status:'pending', mode:'sandbox', jenis: tahan ? 'tahan' : 'bayar' }, r.data);
      K.payPinOpen = false; K.payPin = ''; K.lembar = 'gateway';
      X.gambar();
    });
  };
  /* Gateway selesai: pembayaran biasa → sukses; penahanan → catat hold
     bermode gateway; penangkapan (kanal tertunda) → hold ditangkap. */
  function gatewaySukses() {
    var g = K.gateway; K.lembar = null; K.gateway = null;
    if (g.jenis === 'tahan') { X.tahanDana(g.amount, K.bayar, { mode:'gateway', orderId:g.orderId, ref:g.gatewayRef || null }); selesaiBayar(); return; }
    if (g.jenis === 'tangkap') {
      var h = K.penahanan;
      if (h && h.status === 'ditahan') { h.status = 'ditangkap'; h.ditangkap = g.amount; h.ditangkapAt = new Date().toISOString(); K.mutasi.unshift({ label:tx('Charged') + ' · ' + I.svcName(K.jasa) + ' · ' + tx(X.namaBayar(h.metode)), date:'today · ' + K.orderNo, amount:-g.amount }); }
      X.simpanAlurDB(); sekilas(tx('Visit done — charged') + ' ' + rp(g.amount) + '.'); return;
    }
    selesaiBayar();
  }
  function statusGatewayBeres(st) { return st === 'paid' || st === 'settlement' || st === 'capture' || st === 'authorize' || st === 'held'; }
  A.gatewayCek = function () {
    var g = K.gateway; if (!g) return;
    if (statusGatewayBeres(g.status)) { gatewaySukses(); return; }
    EXO_SERVER.statusBayar(g.orderId).then(function (r) {
      if (r.ok && r.data && r.data.status) { g.status = r.data.status; if (g.gatewayRef == null) g.gatewayRef = r.data.gatewayRef; }
      if (statusGatewayBeres(g.status)) { sekilas(tx(g.jenis === 'tahan' ? 'Funds held' : 'Payment confirmed by the gateway.')); gatewaySukses(); }
      else sekilas('Gateway says: ' + (g.status || 'pending') + '. Complete the payment, then check again.', 'err');
      X.gambar();
    });
  };
  /* Kunjungan dikonfirmasi selesai: dana yang ditahan ditangkap (termasuk
     tambahan yang disetujui), kunjungan paket dihitung. Dipanggil dari
     simulasi tahap pelanggan, tombol "selesai · nilai", dan "Selesaikan job"
     di aplikasi mitra. Mengembalikan jumlah yang ditagih. */
  function selesaikanKunjungan(diam) {
    K.tahap = X.tahapAlur().length - 1;
    var h = K.penahanan, total = X.totalTahanan(), l = K.langganan;
    if (l && l.status === 'aktif') l.kunjunganSelesai++;
    if (h && h.status === 'ditahan') {
      if (h.mode === 'tunda' && window.EXO_SERVER) {
        /* kanal tanpa pre-auth: tagihan dibuat sekarang lewat gateway */
        K.gatewaySibuk = true;
        EXO_SERVER.bayar(h.metode, h.orderId + '-C', total, PELANGGAN).then(function (r) {
          K.gatewaySibuk = false;
          if (!r.ok) { X.tangkapDana(); sekilas(tx('Visit done — charged') + ' ' + rp(total) + ' · ' + (r.offline ? 'simulated' : 'gateway: ' + (r.error || ''))); X.gambar(); return; }
          K.gateway = Object.assign({ orderId:h.orderId + '-C', amount:total, status:'pending', mode:'sandbox', jenis:'tangkap' }, r.data); K.lembar = 'gateway'; X.gambar();
        });
        X.simpanAlurDB(); return total;
      }
      if (h.mode === 'gateway' && window.EXO_SERVER) EXO_SERVER.tangkap(h.orderId, total).then(function (r) { if (!r.ok) sekilas('Gateway capture: ' + (r.error || 'failed'), 'err'); });
      X.tangkapDana();
      if (!diam) sekilas(tx('Visit done — charged') + ' ' + rp(total) + ' · ' + tx(X.namaBayar(h.metode)) + '.');
    }
    X.simpanAlurDB();
    return total;
  }
  /* Paket berlanjut: jadwal bergeser ke kunjungan berikutnya, tahap kembali
     ke "terkunci", dan dana kunjungan berikutnya ditahan lagi. */
  function kunjunganBerikutnya() {
    var l = K.langganan, h = K.penahanan;
    K.hari += l.hari; K.tahap = 1; K.ekstra = []; K.ceklis = {};
    var metode = h ? h.metode : K.bayar, jumlah = l.hargaKunjungan;
    if (metode === 'wallet' && jumlah > X.saldoTersedia()) { sekilas(tx('EXO Wallet is short by') + ' ' + rp(jumlah - X.saldoTersedia()) + '. ' + tx('Top up or pick another method.'), 'err'); K.penahanan = null; X.simpanAlurDB(); return; }
    X.tahanDana(jumlah, metode, h && h.mode === 'tunda' ? { mode:'tunda', orderId:K.orderNo + '-' + (l.kunjunganSelesai + 1) } : null);
    X.simpanAlurDB();
    sekilas(tx('Visit done — the next one is scheduled') + ' · ' + X.ringkasSlot() + ' · ' + tx('Next visit held') + ' ' + rp(jumlah) + '.');
  }
  A.kunjunganSelesaiNilai = function () { if (X.ditahanDulu() && K.penahanan && K.penahanan.status === 'ditahan') selesaikanKunjungan(); K.layar = 'rate'; };
  A.frekuensi = function (v) { K.frekuensi = v; };
  A.batalPaket = function () { K.batalPaket = !K.batalPaket; };
  A.bukaBatalPaket = function () { K.batalPaket = true; K.lembar = 'batal'; };
  /* Pembatalan pesanan: lepas dana yang ditahan (dipotong biaya bila < 4 jam),
     dan bila paketnya ikut dibatalkan sebelum komitmen minimal, diskon
     kunjungan yang sudah selesai ditagih kembali. */
  A.batalSimpan = function () {
    var fee = X.menitKeMulai() < 240 ? 50000 * K.regu : 0, pesan = [];
    var h = X.lepasDana(fee);
    if (h) { pesan.push(tx('Released') + ' ' + rp(h.dilepas)); if (h.mode === 'gateway' && window.EXO_SERVER) EXO_SERVER.lepas(h.orderId); }
    else if (fee && !tagihDompet(fee, tx('Late cancellation fee') + ' · ' + K.orderNo)) return;
    if (fee) pesan.push(tx('Late cancellation fee') + ' ' + rp(fee));
    var l = K.langganan;
    if (l && l.status === 'aktif' && K.batalPaket) {
      var tarik = X.tarikDiskon();
      if (tarik && !tagihDompet(tarik, tx('Discount charge-back') + ' · ' + l.kunjunganSelesai + ' ' + tx('visits'))) return;
      l.status = 'dibatalkan'; l.dibatalkanAt = new Date().toISOString(); pesan.push(tx('Plan cancelled.') + (tarik ? ' ' + tx('Discount charge-back') + ' ' + rp(tarik) : ''));
    }
    K.dibatalkan = true; K.tahap = 0; K.lembar = null; K.batalPaket = false; X.simpanAlurDB();
    K.layar = 'orders';
    sekilas(tx('Booking cancelled.') + (pesan.length ? ' ' + pesan.join(' · ') + '.' : ''), 'err');
  };
  /* Menagih dompet untuk jumlah yang baru disetujui pelanggan (penawaran,
     timbangan, struk, tambahan). Metode selain dompet dianggap ditagih lewat
     gateway saat pelunasan — di sini dicatat saja. */
  function tagihDompet(jumlah, label) {
    if (K.bayar === 'wallet') {
      if (jumlah > X.saldoTersedia()) { sekilas(tx('EXO Wallet is short by') + ' ' + rp(jumlah - X.saldoTersedia()) + '. ' + tx('Top up or pick another method.'), 'err'); return false; }
      K.saldo -= jumlah;
    }
    K.mutasi.unshift({ label:label, date:'today · ' + (K.orderNo || 'EXO'), amount:-jumlah });
    return true;
  }
  function penawaranContoh() {
    var dasar = X.lineFor(X.rateFor(X.juruKini()));
    return { status:'menunggu', at:new Date().toISOString(), items:[
      { nama:tx('Scope as surveyed') + ' · ' + I.svcName(K.jasa), harga:Math.round(dasar * 1.1 / 1000) * 1000 },
      { nama:tx('Materials & machines'), harga:Math.round(dasar * 0.15 / 1000) * 1000 } ] };
  }
  A.tahapMaju = function () {
    var a = X.alurKini(), n = X.tahapAlur().length, berikut = K.tahap + 1;
    if (berikut >= n) {
      if (K.langganan && K.langganan.status === 'aktif' && !K.dibatalkan) { kunjunganBerikutnya(); return; }
      K.tahap = 0; K.penawaran = null; K.timbangan = null; K.struk = null; K.ekstra = []; K.penahanan = null; K.dibatalkan = false; X.simpanAlurDB(); return;
    }
    /* tahap terakhir pesanan instan = kunjungan selesai → dana ditangkap */
    if (berikut === n - 1 && X.ditahanDulu()) { selesaikanKunjungan(); return; }
    /* tahap keputusan: mitra mengirim, pelanggan menyetujui — simulasi membuat kirimannya bila belum ada */
    if (a === 'survei' && berikut === 2 && !K.penawaran) K.penawaran = penawaranContoh();
    if (a === 'timbang' && berikut === 2 && !K.timbangan) { var kg = Math.max(2, K.jam + 1.5); K.timbangan = { status:'menunggu', kg:kg, tarif:X.rateFor(X.juruKini()), total:Math.round(kg * X.rateFor(X.juruKini())), at:new Date().toISOString() }; }
    if (a === 'titip' && berikut === 2 && !K.struk) K.struk = { status:'menunggu', total:187500, catatan:tx('Receipt photo attached'), at:new Date().toISOString() };
    /* tidak boleh melewati tahap keputusan sebelum pelanggan memutuskan */
    var tunggu = (a === 'survei' && K.penawaran) || (a === 'timbang' && K.timbangan) || (a === 'titip' && K.struk);
    if (berikut === 3 && tunggu && tunggu.status === 'menunggu') { sekilas(tx('Waiting for your decision — open the card above.'), 'err'); K.tahap = 2; X.simpanAlurDB(); return; }
    K.tahap = berikut; X.simpanAlurDB();
  };
  /* ---- keputusan pelanggan ---- */
  A.terimaPenawaran = function () {
    var p = K.penawaran; if (!p) return;
    var total = p.items.reduce(function (n, i) { return n + i.harga; }, 0) + D.PLATFORM_FEE;
    if (!tagihDompet(total, I.svcName(K.jasa) + ' · ' + tx('quote accepted'))) return;
    p.status = 'diterima'; p.total = total; K.tahap = 3; K.lembar = null; X.simpanAlurDB();
    sekilas(tx('Quote accepted') + ' · ' + rp(total) + ' · ' + tx('schedule locked to') + ' ' + X.namaDepan(X.juruKini()) + '.');
  };
  A.tolakPenawaran = function () { if (!K.penawaran) return; K.penawaran.status = 'ditolak'; K.lembar = null; X.simpanAlurDB(); sekilas(tx('Quote declined. Nothing is charged; the survey stays free.'), 'err'); };
  A.setujuTimbang = function () {
    var t = K.timbangan; if (!t) return;
    var total = t.total + X.addonTotal() + D.PLATFORM_FEE - (X.voucherApplied() ? X.voucherKini().amount : 0);
    if (!tagihDompet(total, I.svcName(K.jasa) + ' · ' + t.kg + ' kg')) return;
    t.status = 'diterima'; t.totalTagihan = total; K.tahap = 3; K.lembar = null; X.simpanAlurDB();
    sekilas(tx('Final price approved') + ' · ' + rp(total) + '.');
  };
  A.setujuStruk = function () {
    var r = K.struk; if (!r) return;
    if (!tagihDompet(r.total, tx('Goods') + ' · ' + I.svcName(K.jasa))) return;
    r.status = 'diterima'; K.tahap = 3; K.lembar = null; X.simpanAlurDB();
    sekilas(tx('Goods total approved') + ' · ' + rp(r.total) + '.');
  };
  A.ekstraPutus = function (v) {
    var p = String(v).split(':'), id = p[0], ya = p[1] === 'ya';
    var e = (K.ekstra || []).filter(function (x) { return x.id === id; })[0]; if (!e) return;
    if (ya) {
      if (X.ditahanDulu() && K.penahanan && K.penahanan.status === 'ditahan') {
        if (!X.tambahTahanan(e.harga)) { sekilas(tx('EXO Wallet is short by') + ' ' + rp(e.harga - X.saldoTersedia()) + '. ' + tx('Top up or pick another method.'), 'err'); return; }
        e.status = 'diterima'; sekilas(tx('Extra approved') + ' · ' + esc(e.nama) + ' · ' + rp(e.harga) + ' · ' + tx('Extras added to the hold — charged only when the visit is done.'));
      } else { if (!tagihDompet(e.harga, tx('Extra work') + ' · ' + e.nama)) return; e.status = 'diterima'; sekilas(tx('Extra approved') + ' · ' + esc(e.nama) + ' · ' + rp(e.harga)); }
    }
    else { e.status = 'ditolak'; sekilas(tx('Extra declined — the cleaner sticks to the original scope.'), 'err'); }
    if (!X.keputusanMenunggu().length) K.lembar = null;
    X.simpanAlurDB();
  };
  /* ---- kiriman mitra (formulir lewat data-simpan) ---- */
  A.kirimPenawaran = function () {
    var f = K.penawaranForm, items = [];
    if (f.a && Number(f.ha) > 0) items.push({ nama:f.a, harga:Number(f.ha) });
    if (f.b && Number(f.hb) > 0) items.push({ nama:f.b, harga:Number(f.hb) });
    if (!items.length) { sekilas('Isi minimal satu baris penawaran dengan harga.', 'err'); return; }
    K.penawaran = { status:'menunggu', at:new Date().toISOString(), items:items }; K.tahap = Math.max(K.tahap, 2); K.lembar = null; X.simpanAlurDB();
    sekilas('Penawaran terkirim ke pelanggan · ' + rp(items.reduce(function (n, i) { return n + i.harga; }, 0)) + '. Jadwal terkunci setelah disetujui.');
  };
  A.kirimTimbang = function () {
    var kg = Number(String(K.timbangForm).replace(',', '.'));
    if (!(kg > 0)) { sekilas('Isi berat dalam kg.', 'err'); return; }
    var tarif = X.rateFor(X.juruKini());
    K.timbangan = { status:'menunggu', kg:kg, tarif:tarif, total:Math.round(kg * tarif), at:new Date().toISOString() }; K.tahap = Math.max(K.tahap, 2); K.lembar = null; X.simpanAlurDB();
    sekilas('Hasil timbang terkirim · ' + kg + ' kg × ' + rp(tarif) + ' = ' + rp(Math.round(kg * tarif)) + '. Menunggu persetujuan pelanggan.');
  };
  A.kirimStruk = function () {
    var total = Number(K.strukForm.total);
    if (!(total > 0)) { sekilas('Isi total struk belanja.', 'err'); return; }
    K.struk = { status:'menunggu', total:total, catatan:K.strukForm.catatan || '', at:new Date().toISOString() }; K.tahap = Math.max(K.tahap, 2); K.lembar = null; X.simpanAlurDB();
    sekilas('Struk terkirim · ' + rp(total) + '. Barang ditagih setelah pelanggan menyetujui.');
  };
  A.ajukanEkstra = function () {
    var f = K.ekstraForm, harga = Number(f.harga);
    if (!f.nama || !(harga > 0)) { sekilas('Isi nama pekerjaan tambahan dan harganya.', 'err'); return; }
    K.ekstra = (K.ekstra || []).concat([{ id:'ex_' + Date.now().toString(36), nama:f.nama, harga:harga, status:'menunggu', at:new Date().toISOString() }]);
    K.ekstraForm = { nama:'', harga:'' }; K.lembar = null; X.simpanAlurDB();
    sekilas('Diajukan ke pelanggan: ' + f.nama + ' · ' + rp(harga) + '. Jangan dikerjakan sebelum disetujui.');
  };
  A.ceklis = function (v) { K.ceklis[v] = !K.ceklis[v]; };
  A.tabPesanan = function (v) { K.tabPesanan = v; };
  A.bintang = function (v) { K.bintang = Number(v); };
  A.pujian = function (v) { K.pujian[v] = !K.pujian[v]; };
  A.tip = function (v) { K.tip = Number(v); };
  A.kirimNilai = function () {
    var r = X.tulisRatingDB(K.bintang, K.catatanNilai);
    K.layar = 'orders';
    sekilas(tx('Thanks —') + ' ' + X.namaDepan(X.juruKini()) + ' ' + tx('gets your') + ' ' + K.bintang + '★' + (K.tip ? ' + ' + rp(K.tip) + ' ' + tx('tip') : '') + (r ? ' · ' + tx('saved to the database, her rating recomputes from it.') : '.'));
  };
  A.bagikanJuru = function () { K.shareTab = 'cleaner'; K.shared = false; K.layar = 'share'; };
  A.keluhan = function (v) { K.keluhan = v; };
  A.kirimKlaim = function () {
    var isu = null; for (var i = 0; i < D.ISSUES.length; i++) if (D.ISSUES[i].id === K.keluhan) isu = D.ISSUES[i];
    var c = X.tulisKomplainDB((isu ? isu.label : K.keluhan) + ' — EXOCLEAN App', K.fotoKlaim.map(function (f) { return f.id; }));
    K.layar = 'orders'; K.keluhan = null;
    sekilas(tx('Claim received. A human replies within 60 seconds; decision by tomorrow 17:00.') + (c ? ' · ' + c.id : ''));
  };
  A.shareTab = function (v) { K.shareTab = v; K.shared = false; };
  A.shareTarget = function (v) { K.shareTarget = v; K.shared = false; };
  A.bagikan = function () {
    var teks = 'Book your first clean on EXOCLEAN with my code DEWI50 — exoclean.id/r/DEWI50';
    if (K.shareTarget === 'link' && navigator.clipboard) navigator.clipboard.writeText('https://exoclean.id/r/DEWI50').catch(function () {});
    else if (navigator.share && K.shareTarget !== 'save') navigator.share({ title:'EXOCLEAN', text:teks, url:'https://exoclean.id/r/DEWI50' }).catch(function () {});
    K.shared = true;
  };
  A.termTab = function (v) { K.termTab = v; };
  A.bahasa = function (v) { K.lang = I.set(v); try { localStorage.setItem('exoclean_lang', K.lang); } catch (e) { /* abaikan */ } };
  A.daring = function () { K.daring = !K.daring; };
  A.keMitra = function () { K.sisi = 'partner'; K.layar = 'pjobs'; };
  A.kePelanggan = function () { K.sisi = 'customer'; K.layar = 'home'; };
  A.cariKosong = function () { K.cari = ''; };
  A.pilihAlamat = function (v) { K.alamat = v; K.lembar = null; sekilas(tx('Now booking for') + ' ' + tx(X.alamatKini().label) + ' · ' + X.alamatKini().short); };
  A.lembar = function (v) { K.lembar = v; K.nominal = null; K.pindahHari = null; K.pindahJam = null; };
  A.tutupLembar = function () { K.lembar = null; };
  A.nominal = function (v) { K.nominal = Number(v); };
  A.isiSaldo = function () { var n = K.nominal; K.saldo += n; K.mutasi.unshift({ label:'Top up · BCA VA', date:'today · instant', amount:n }); K.lembar = null; K.nominal = null; sekilas(rp(n) + ' ' + tx('added. Balance') + ' ' + rp(K.saldo) + '.'); };
  A.tarikSaldo = function () {
    var n = K.nominal; if (n > K.saldo) { sekilas(tx('Not enough balance for that.'), 'err'); return; }
    K.saldo -= n; K.mutasi.unshift({ label:'Withdraw · BCA ···4471', date:'today · by tomorrow', amount:-n }); K.lembar = null; K.nominal = null; sekilas(rp(n) + ' ' + tx('on the way to BCA ···4471.'));
  };
  A.lewati = function () { K.lewati = !K.lewati; sekilas(tx(K.lewati ? '30 Aug skipped. Your cleaner still holds 6 Sep.' : '30 Aug is back on. Nothing else changed.')); };
  A.pindahHari = function (v) { K.pindahHari = Number(v); };
  A.pindahJam = function (v) { K.pindahJam = v; };
  A.pindahSimpan = function () { if (K.pindahHari !== null) K.hari = K.pindahHari; if (K.pindahJam !== null) K.mulai = K.pindahJam; K.lembar = null; K.pindahHari = null; K.pindahJam = null; sekilas(tx('Moved to') + ' ' + X.ringkasSlot() + '. ' + tx('Same cleaner, same price.')); };
  A.kirimPesan = function () {
    var s = (K.pesanBaru || '').trim(); if (!s) return;
    K.obrolan.push({ from:'me', text:s, time:X.jamSekarang() }); K.pesanBaru = ''; K.mengetik = true;
    setTimeout(function () { K.mengetik = false; K.obrolan.push({ from:'them', text:'Got it — I have your booking open now. Give me half a minute.', time:X.jamSekarang() }); X.gambar(); }, 1400);
  };
  A.notifAktif = function () { K.notifAktif = !K.notifAktif; sekilas(tx(K.notifAktif ? 'Notifications on — including slot changes and refunds.' : 'Notifications off. You will not hear about slot changes.'), K.notifAktif ? 'ok' : 'err'); };
  A.prepaid = function (v) { K.prepaid = v; };
  A.beliPrepaid = function () {
    var p = null; for (var i = 0; i < D.PREPAID.length; i++) if (D.PREPAID[i].id === K.prepaid) p = D.PREPAID[i];
    K.mutasi.unshift({ label:t(p.nameKey) + ' · prepaid', date:'today · ' + p.hours + ' hours credited', amount:-p.price });
    K.layar = 'wallet'; sekilas(t(p.nameKey) + ' ' + tx('bought —') + ' ' + p.hours + ' ' + tx('hours ready to book.'));
  };

  /* -------- daftar / auth */
  /* Login sosial. Dengan client id di exo-config.js: token dari SDK
     resmi → diverifikasi auth-server → profil. Tanpa itu: simulasi, dan
     pesan sekilas mengatakannya. */
  function sosialSelesai(v, profil) {
    K.sosialSibuk = false; K.social = v; K.sosialProfil = profil || null;
    K.captcha = true; K.consent = true; K.authStep = 'otp'; K.layar = 'signup';
    if (profil && profil.nama) sekilas('Signed in as ' + profil.nama + ' via ' + v + ' — verified by the auth server.');
    X.gambar();
  }
  A.sosial = function (v) {
    var cfg = window.EXO_CONFIG || {};
    if (v === 'google' && cfg.googleClientId && window.EXO_SERVER) {
      K.sosialSibuk = true;
      EXO_SERVER.muatSkrip('https://accounts.google.com/gsi/client').then(function () {
        google.accounts.id.initialize({ client_id:cfg.googleClientId, callback:function (resp) {
          EXO_SERVER.loginGoogle(resp.credential).then(function (r) {
            if (r.ok) sosialSelesai('google', r.data);
            else { K.sosialSibuk = false; sekilas('Google token refused by the auth server: ' + (r.error || 'offline'), 'err'); X.gambar(); }
          });
        } });
        google.accounts.id.prompt(function (n) { if (n.isNotDisplayed && n.isNotDisplayed()) { K.sosialSibuk = false; sekilas('Google One Tap not shown (' + n.getNotDisplayedReason() + ').', 'err'); X.gambar(); } });
      }).catch(function () { K.sosialSibuk = false; sekilas('Google script could not load.', 'err'); X.gambar(); });
      return;
    }
    if (v === 'facebook' && cfg.facebookAppId && window.EXO_SERVER) {
      K.sosialSibuk = true;
      window.fbAsyncInit = function () { FB.init({ appId:cfg.facebookAppId, cookie:true, xfbml:false, version:'v19.0' }); };
      EXO_SERVER.muatSkrip('https://connect.facebook.net/en_US/sdk.js').then(function () {
        if (!window.FB) throw new Error('FB missing');
        if (!FB.getAuthResponse) window.fbAsyncInit();
        FB.login(function (resp) {
          if (resp.authResponse) {
            EXO_SERVER.loginFacebook(resp.authResponse.accessToken).then(function (r) {
              if (r.ok) sosialSelesai('facebook', r.data);
              else { K.sosialSibuk = false; sekilas('Facebook token refused: ' + (r.error || 'offline'), 'err'); X.gambar(); }
            });
          } else { K.sosialSibuk = false; sekilas('Facebook login cancelled.', 'err'); X.gambar(); }
        }, { scope:'public_profile,email' });
      }).catch(function () { K.sosialSibuk = false; sekilas('Facebook SDK could not load.', 'err'); X.gambar(); });
      return;
    }
    sosialSelesai(v, null);
    sekilas((v === 'google' ? 'Google' : 'Facebook') + ' login simulated — fill ' + (v === 'google' ? 'googleClientId' : 'facebookAppId') + ' in js/exo-config.js for the real flow.', 'err');
  };
  A.daftar = function () { K.social = null; K.authStep = 'form'; K.layar = 'signup'; };
  A.authStep = function (v) { K.authStep = v; };
  A.authBack = function () { if (K.authStep === 'form') K.layar = 'onboard'; else K.authStep = K.authStep === 'otp' ? 'form' : 'otp'; };
  A.captcha = function () {
    if (window.EXO_CONFIG && EXO_CONFIG.turnstileSiteKey) { sekilas('Solve the Turnstile widget above — the checkbox is not a substitute.', 'err'); return; }
    K.captcha = !K.captcha;
  };
  A.consent = function () { K.consent = !K.consent; };
  A.isiOtp = function () { K.otp = '408217'; };
  A.otpKirim = function () {
    K.otp = ''; K.authStep = 'otp';
    if (!window.EXO_SERVER) { K.otpServer = 'simulasi'; return; }
    K.otpSibuk = true;
    EXO_SERVER.otpKirim(K.otpTujuan).then(function (r) {
      K.otpSibuk = false;
      if (r.ok) { K.otpServer = 'terkirim'; sekilas('Code sent by the auth server · valid ' + Math.round((r.data.berlakuDetik || 300) / 60) + ' min.'); }
      else if (r.offline) { K.otpServer = 'simulasi'; sekilas(tx('Auth server offline — OTP simulated. Start app/server/auth-server.js for the real flow.'), 'err'); }
      else { K.otpServer = 'simulasi'; sekilas('Auth server refused: ' + (r.error || '') + ' — simulated instead.', 'err'); }
      X.gambar();
    });
  };
  A.otpPeriksa = function () {
    if (K.otp.length < 6) return;
    if (K.otpServer !== 'terkirim') { K.authStep = 'pin'; return; }
    K.otpSibuk = true;
    EXO_SERVER.otpPeriksa(K.otpTujuan, K.otp).then(function (r) {
      K.otpSibuk = false;
      if (r.ok) { K.authStep = 'pin'; sekilas(tx('Number verified by the auth server.')); }
      else { K.otp = ''; sekilas(r.error || tx('Wrong code.'), 'err'); }
      X.gambar();
    });
  };
  A.posisiAmbil = function () {
    if (!window.EXO_UTIL || !EXO_UTIL.getGPS) { K.posisiGalat = 'GPS helper missing'; return; }
    K.posisiSibuk = true; K.posisiGalat = null;
    EXO_UTIL.getGPS(10000).then(function (r) {
      K.posisiSibuk = false;
      if (r.ok) {
        K.posisi = { lat:r.lat, lng:r.lng, akurasi:r.akurasi, at:Date.now() }; X.simpanPosisi(K.posisi);
        /* Ke posisi-server supaya ponsel pelanggan (perangkat lain) ikut melihat. */
        if (window.EXO_SERVER) EXO_SERVER.posisiKirim(K.orderNo, K.posisi).then(function (h) {
          K.posisiServerAda = h.ok ? true : h.offline ? false : K.posisiServerAda;
          if (h.ok) sekilas('Posisi dikirim ke server — pelanggan melihatnya di perangkat mana pun.');
          X.gambar();
        });
      }
      else { K.posisi = null; K.posisiGalat = r.alasan; }
      X.gambar();
    });
  };

  /* Pemantauan posisi di layar pelacakan pelanggan: tanya posisi-server
     tiap 5 detik selama layarnya terbuka. Tanpa server, jatuh ke posisi
     perangkat yang sama (bacaPosisi). */
  var lacakTimer = null;
  function lacakTarik() {
    if (!window.EXO_SERVER) return;
    EXO_SERVER.posisiAmbil(K.orderNo).then(function (r) {
      var sebelum = K.posisiServerAda;
      K.posisiServerAda = r.offline ? false : true;
      if (r.ok && r.data) { var d = r.data; K.posisiServer = { lat:d.lat, lng:d.lng, akurasi:d.akurasi, at:d.at || Date.now() }; }
      else if (!r.ok && !r.offline) K.posisiServer = null;
      if (K.layar === 'track' && (sebelum !== K.posisiServerAda || r.ok)) X.gambar();
    });
  }
  X.hooks.push(function () {
    if (K.layar === 'track') { if (!lacakTimer) { lacakTarik(); lacakTimer = setInterval(lacakTarik, 5000); } }
    else if (lacakTimer) { clearInterval(lacakTimer); lacakTimer = null; }
  });

  /* Captcha Cloudflare Turnstile: dirender ke kotak di formulir daftar bila
     site key diisi di exo-config.js; kalau tidak, kotak centang simulasi. */
  X.hooks.push(function () {
    var kotak = document.getElementById('exo-turnstile');
    if (!kotak || !EXO_CONFIG.turnstileSiteKey || kotak.getAttribute('data-siap')) return;
    kotak.setAttribute('data-siap', '1');
    EXO_SERVER.muatSkrip('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(function () {
      if (!window.turnstile) return;
      turnstile.render(kotak, { sitekey:EXO_CONFIG.turnstileSiteKey, callback:function (token) { K.captchaToken = token; K.captcha = true; X.gambar(); },
        'expired-callback':function () { K.captchaToken = null; K.captcha = false; X.gambar(); } });
    }).catch(function () { sekilas('Captcha script could not load — check the network.', 'err'); });
  });

  /* Foto profil mitra. */
  A.fotoMitraHapus = function () { var a = X.daftarJuru()[0]; if (a && a.id) { X.simpanFotoMitra(a.id, null); sekilas('Foto profil dihapus.'); } };
  A.pinTekan = function (k) { K.pin = k === '⌫' ? K.pin.slice(0, -1) : (K.pin + k).slice(0, 6); };
  A.selesaiAuth = function () { K.layar = 'home'; sekilas(tx('Welcome, Dewi. Two-step verification and your PIN are set.')); };

  /* -------- mitra */
  A.terimaJob = function () { K.layar = 'pjob'; sekilas('Job diterima — jadwal terkunci untuk Anda. Ops tidak bisa memindahkannya.'); };
  A.gps = function () { K.gps = !K.gps; if (K.gps) A.posisiAmbil(); else { K.posisi = null; X.hapusPosisi(); } };
  A.tiba = function () { K.arrived = true; K.tibaJam = X.jamSekarang(); sekilas('Kedatangan terkonfirmasi ' + K.tibaJam + ' · jam tunggu 45 menit mulai.'); };
  A.ppe = function (v) { K.ppe[v] = !K.ppe[v]; };
  A.kit = function (v) { K.kit[v] = !K.kit[v]; };
  A.sopLangkah = function (v) {
    var n = Number(v), m = X.sopMeta(), row = m.steps[n - 1];
    if (K.sopDone[n]) { K.sopDone[n] = false; return; }
    if (!X.ppeComplete()) { sekilas('Centang semua APD dulu — langkah kerja terkunci.', 'err'); return; }
    if (n > 1 && !K.sopDone[n - 1]) { sekilas('Selesaikan langkah ' + (n - 1) + ' dulu.', 'err'); return; }
    var f = K.sopFoto[n] || {};
    if (row[2] && !(f.before && f.after)) { sekilas('Ambil foto sebelum dan sesudah dulu — langkah ini tidak bisa ditutup tanpa keduanya.', 'err'); return; }
    K.sopDone[n] = true;
  };
  A.temuan = function (v) { K.finding = v; };
  A.kirimSop = function () { K.layar = 'pjobs'; sekilas('Laporan H-002 terkirim ke supervisor untuk validasi.'); };
  A.kirimLaporan = function () { K.layar = 'pjobs'; sekilas('Laporan sebelum–sesudah terkirim ke pelanggan.'); };
  A.kirimMasalah = function (v) {
    var m = null; for (var i = 0; i < D.PARTNER_ISSUES.length; i++) if (D.PARTNER_ISSUES[i].id === v) m = D.PARTNER_ISSUES[i];
    K.lembar = null; sekilas('Terkirim ke ops: “' + (m ? m.label : v) + '”. Dijawab dalam 60 detik.');
  };
  A.selesaikanJob = function () {
    K.layar = 'pjobs'; K.saldoMitra += 231000; K.tertahan = Math.max(0, K.tertahan - 231000);
    var tagih = 0;
    if (X.ditahanDulu() && K.penahanan && K.penahanan.status === 'ditahan') tagih = selesaikanKunjungan(true);
    sekilas('Job selesai. Rp 231.000 masuk — ' + rp(K.saldoMitra) + ' tersedia.' + (tagih ? ' Dana pelanggan ' + rp(tagih) + ' ditangkap.' : ''));
  };
  A.ubahBank = function () { K.bank = null; K.bankPick = ''; K.bankAcc = ''; };
  A.bankPick = function (v) { K.bankPick = v; };
  A.simpanBank = function () { K.bank = { bank:K.bankPick, acc:K.bankPick + ' ···' + K.bankAcc.slice(-4) }; sekilas('Rekening tersimpan · penarikan pertama tertunda 24 jam setelah OTP.'); };
  A.wdAmount = function (v) { K.wdAmount = Number(v); };
  A.wdMethod = function (v) { K.wdMethod = v; };
  A.wdBatalPin = function () { K.wdPinOpen = false; K.wdPin = ''; };
  A.wdPinTekan = function (k) { K.wdPin = k === '⌫' ? K.wdPin.slice(0, -1) : (K.wdPin + k).slice(0, 6); };
  A.tarikMitra = function () {
    if (!K.bank) return;
    if (!K.wdPinOpen) { K.wdPinOpen = true; return; }
    if (K.wdPin.length < 6) return;
    var fee = K.wdMethod === 'instant' ? 2500 : 0, n = Math.min(K.wdAmount, K.saldoMitra);
    K.saldoMitra -= n; K.wdPinOpen = false; K.wdPin = ''; K.layar = 'pearn';
    if (K.wdAmount > K.saldoMitra) K.wdAmount = Math.min(K.wdAmount, Math.max(K.saldoMitra, 500000));
    sekilas(rp(n - fee) + (fee ? ' dikirim sekarang — masuk dalam 15 menit.' : ' dijadwalkan Senin pagi, tanpa biaya.'));
  };
  A.regBack = function () { if (K.regStep === 0) K.layar = 'pjobs'; else K.regStep -= 1; };
  A.regNext = function () { if (K.regStep >= 3) { K.layar = 'pjobs'; K.regStep = 0; } else K.regStep += 1; };
  A.addrPick = function (level, value) {
    var i = D.ADDR_ORDER.indexOf(level);
    K.addr[level] = value === '— pilih —' ? '' : value;
    for (var j = i + 1; j < D.ADDR_ORDER.length; j++) K.addr[D.ADDR_ORDER[j]] = '';
    var codes = X.wilayahDaftar('pos');
    if (K.addr.desa && codes && codes.length === 1) K.addr.pos = codes[0];
    X.wilayahSiapkan();   /* memuat berkas kab/kota resmi bila belum, lalu menggambar ulang */
  };
  A.dropPin = function () { K.pinDropped = !K.pinDropped; };
  A.radius = function (v) { K.radius = Number(v); };
  A.kinNama = function (i, v) { K.kin[Number(i)].name = v; };
  A.kinTelp = function (i, v) { K.kin[Number(i)].phone = v; K.kin[Number(i)].verified = false; };
  A.kinRel = function (v) { var p = v.split(':'); K.kin[Number(p[0])].rel = p.slice(1).join(':'); };
  A.kinVerif = function (i) { K.kin[Number(i)].verified = true; sekilas('OTP terkirim ke ' + K.kin[Number(i)].phone + ' · nomor terverifikasi.'); };
  A.regDoc = function (v) { K.regDocs[v] = !K.regDocs[v]; };

  /* -------- foto masuk (dipanggil exo-core setelah dikompres) */
  A.fotoMasuk = function (tujuan, rekam) {
    var p = tujuan.split(':');
    if (p[0] === 'klaim') { if (K.fotoKlaim.length >= 2) { sekilas(tx('Two photos is the limit.'), 'err'); return; } K.fotoKlaim.push(rekam); sekilas(tx('Photo attached.')); return; }
    if (p[0] === 'sop') { K.sopFoto[p[1]] = K.sopFoto[p[1]] || {}; K.sopFoto[p[1]][p[2]] = rekam; sekilas('Foto ' + (p[2] === 'before' ? 'sebelum' : 'sesudah') + ' terekam ' + rekam.jam + '.'); return; }
    if (p[0] === 'laporan') { K.shots[p[1]] = K.shots[p[1]] || {}; K.shots[p[1]][p[2]] = rekam; sekilas('Foto ' + (p[2] === 'before' ? 'sebelum' : 'sesudah') + ' terekam ' + rekam.jam + ' · lokasi menempel.'); return; }
    if (p[0] === 'mitra') {
      var a = X.daftarJuru()[0]; if (!a || !a.id) { sekilas('Tidak ada mitra aktif.', 'err'); return; }
      /* Dikecilkan lagi ke 256 px lewat kanvas supaya localStorage tidak
         penuh oleh satu foto profil. */
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'), s = Math.min(img.width, img.height), sz = 256;
        c.width = sz; c.height = sz;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, sz, sz);
        var ok = X.simpanFotoMitra(a.id, c.toDataURL('image/jpeg', 0.8));
        sekilas(ok ? 'Foto profil tersimpan — tampil di kartu petugas pelanggan.' : 'Penyimpanan penuh, foto tidak tersimpan.', ok ? 'ok' : 'err');
        X.gambar();
      };
      img.src = rekam.url;
    }
  };
  A.fotoBuang = function (v) { K.fotoKlaim = K.fotoKlaim.filter(function (f) { return f.id !== v; }); if (window.EXO_FOTO) EXO_FOTO.hapus(v); sekilas(tx('Photo removed.')); };

  document.addEventListener('DOMContentLoaded', function () {
    X.pasang(document.getElementById('exo-app'), document.getElementById('exo-lapis'));
  });
})(ExoApp);
