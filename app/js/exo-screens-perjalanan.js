/* ==========================================================================
   exo-screens-perjalanan.js — layar pelanggan "Perjalanan" (Darmawisata)
   --------------------------------------------------------------------------
   perjalanan (pilih rumpun) · perjalananCari (form + hasil, minta dipesankan)
   · perjalananPesanan (permintaan saya: konfirmasi harga → bayar EXO Wallet
   + PIN → tiket). Hasil pencarian menampilkan lencana sumber.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, rp = X.rp, A = X.AKSI, P = function () { return window.EXO_PERJALANAN; };
  K.trv = K.trv || { rumpun:'', form:{ dari:'CGK', ke:'DPS', tanggal:'', penumpang:'1', kota:'Jakarta', checkin:'', checkout:'', kamar:'1', hari:'1', bulan:'', berat:'10' }, hasil:null, memuat:false, akses:null, pinOpen:false, bayarId:null, catatan:'' };
  function pemesan() { return { id:K.pelangganId || null, nama:'Dewi Anggraini', telp:K.telp || '081234567002' }; }
  function lencana(s) { return s === 'live' ? '<span class="tag tag-accent" style="font-size:10px">live</span>' : s === 'simulasi' ? '<span class="tag tag-accent-2" style="font-size:10px">simulasi</span>' : '<span class="tag tag-neutral" style="font-size:10px">contoh · server tidak terjangkau</span>'; }
  function statusTag(st) { var m = { diminta:'tag-accent-2', dikonfirmasi:'tag-accent', dibayar:'tag-accent-2', terbit:'tag-accent', dibatalkan:'tag-neutral' }; return '<span class="tag ' + (m[st] || 'tag-neutral') + '">' + esc(P().STATUS[st] || st) + '</span>'; }
  function tglDefault() { var d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }
  function muatAkses() { var t = K.trv; if (t.akses || t.aksesMemuat) return; t.aksesMemuat = true; P().akses().then(function (r) { t.aksesMemuat = false; t.akses = r && r.rumpun ? r.rumpun : {}; t.aksesMode = r && r.mode; if (K.layar === 'perjalanan') X.gambar(); }); }

  X.LAYAR.perjalanan = function () {
    var t = K.trv; muatAkses(); var saya = P().milik(pemesan().nama), aktif = saya.filter(function (x) { return x.status !== 'terbit' && x.status !== 'dibatalkan'; });
    var h = '<div class="screen">' + X.kepala('Perjalanan', 'Tiket, hotel, sewa mobil, tur & umroh · Darmawisata', 'home') + '<div class="stack gap-12 pad-x18">';
    if (aktif.length) h += '<button class="card card-leaf gap-3" style="text-align:start;cursor:pointer"' + aksi('ke', 'perjalananPesanan') + '><div class="flex items-center gap-8"><span class="tag tag-accent">' + aktif.length + ' permintaan berjalan</span><span class="t-11 o-6" style="margin-inline-start:auto">Lihat →</span></div><div class="t-125">' + esc(aktif[0].judul) + ' · ' + esc(P().STATUS[aktif[0].status]) + '</div></button>';
    h += '<div class="grid-2">' + P().RUMPUN.map(function (r) { var a = t.akses && t.akses[r.id]; var ket = t.aksesMemuat ? 'memeriksa…' : !t.akses ? '' : a && a.ok ? 'tersedia' + (a.n ? ' · ' + a.n + ' operator' : '') : a && a.pesan ? 'belum aktif di akun' : 'contoh'; return '<button class="card elev-sm gap-3" style="text-align:start;cursor:pointer"' + aksi('trvRumpun', r.id) + '><div style="font-size:26px;line-height:1">' + r.ikon + '</div><div class="t-125 bold">' + esc(r.nama) + '</div><div class="t-11 o-6">' + esc(ket) + '</div></button>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-4"><div class="f-head t-15">Cara kerjanya</div>' + ['Cari jadwal & harga (langsung dari Darmawisata bila server terhubung).', 'Pilih, lalu "Minta dipesankan" — tim EXOCLEAN memesan dan mengonfirmasi harga final + kode booking dalam jam kerja.', 'Bayar dari EXO Wallet dengan PIN dalam 2 jam setelah konfirmasi; tiket/e-voucher terbit di aplikasi.', 'Biaya layanan EXOCLEAN per pesanan: pesawat ' + rp(P().biaya('airline')) + ', hotel ' + rp(P().biaya('hotel')) + ', kereta ' + rp(P().biaya('train')) + '.'].map(function (x) { return '<div class="flex gap-8 t-115 lh-145"><span class="check-sm">✓</span><span>' + x + '</span></div>'; }).join('') + '</div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'perjalananPesanan') + '>Permintaan saya (' + saya.length + ')</button><div class="spacer-14"></div></div></div>';
    return h;
  };
  A.trvRumpun = function (id) { var t = K.trv; t.rumpun = id; t.hasil = null; if (!t.form.tanggal) t.form.tanggal = tglDefault(); if (!t.form.checkin) { t.form.checkin = tglDefault(); var d = new Date(t.form.checkin); d.setDate(d.getDate() + 2); t.form.checkout = d.toISOString().slice(0, 10); } if (!t.form.bulan) t.form.bulan = new Date().toISOString().slice(0, 7); K.layar = 'perjalananCari'; };

  var LABEL = { dari:['Dari (kota/bandara/stasiun)', 'text'], ke:['Ke', 'text'], tanggal:['Tanggal berangkat', 'date'], penumpang:['Penumpang', 'number'], kota:['Kota / lokasi', 'text'], checkin:['Check-in', 'date'], checkout:['Check-out', 'date'], kamar:['Kamar', 'number'], hari:['Jumlah hari', 'number'], bulan:['Bulan keberangkatan', 'month'], berat:['Berat (kg)', 'number'] };
  X.LAYAR.perjalananCari = function () {
    var t = K.trv, r = P().rumpun(t.rumpun); if (!r) { K.layar = 'perjalanan'; return X.LAYAR.perjalanan(); }
    var h = '<div class="screen">' + X.kepala(r.ikon + ' ' + r.nama, r.cari + ' · Darmawisata H2H', 'perjalanan') + '<div class="stack gap-12 pad-x18">';
    h += '<div class="card elev-sm gap-8">' + r.form.map(function (f) { var l = LABEL[f]; return '<div><div class="t-11 up o-6" style="margin-bottom:4px">' + esc(l[0]) + '</div><input class="input" type="' + l[1] + '" data-simpan="trv.form.' + f + '" value="' + esc(t.form[f] || '') + '"></div>'; }).join('') + '<button class="btn btn-primary" style="height:42px"' + (t.memuat ? ' disabled' : aksi('trvCari')) + '>' + (t.memuat ? 'Mencari…' : r.cari) + '</button></div>';
    if (t.hasil) {
      h += '<div class="flex items-center gap-8"><span class="t-115 up o-6 grow">' + t.hasil.items.length + ' hasil</span>' + lencana(t.hasil.sumber) + '</div>' + (t.hasil.catatan ? '<div class="t-11 o-6">' + esc(t.hasil.catatan) + '</div>' : '');
      if (!t.hasil.items.length) h += '<div class="card elev-sm t-125 o-7">Tidak ada hasil untuk pencarian ini.</div>';
      t.hasil.items.forEach(function (it, i) { var dipilih = t.pilih === i; h += '<div class="card ' + (dipilih ? 'card-leaf' : 'elev-sm') + ' gap-6"><div class="flex items-start gap-8"><div class="grow"><div class="t-135 bold">' + esc(it.judul) + '</div><div class="t-115 o-7 lh-145">' + esc(it.sub || '') + '</div></div><div class="right"><div class="f-head t-15">' + rp(it.harga) + '</div><div class="t-105 o-6">+ layanan ' + rp(P().biaya(r.id)) + '</div></div></div>' + (dipilih ? '<input class="input" data-simpan="trv.catatan" value="' + esc(t.catatan) + '" placeholder="Catatan: nama penumpang sesuai KTP, preferensi kursi/kamar"><button class="btn btn-primary" style="height:40px"' + aksi('trvMinta', i) + '>Minta dipesankan · perkiraan ' + rp(Number(it.harga) + P().biaya(r.id)) + '</button><div class="t-11 o-6">Harga final dikonfirmasi tim (bisa berubah mengikuti ketersediaan). Belum ada uang yang dipotong.</div>' : '<button class="btn btn-secondary" style="height:36px;align-self:flex-start"' + aksi('trvPilih', i) + '>Pilih</button>') + '</div>'; });
    }
    return h + '<div class="spacer-14"></div></div></div>';
  };
  A.trvCari = function () { var t = K.trv, r = P().rumpun(t.rumpun); if (!r) return; for (var i = 0; i < r.form.length; i++) { if (!String(t.form[r.form[i]] || '').trim()) { X.sekilas('Isi ' + LABEL[r.form[i]][0].toLowerCase() + ' dulu.', 'err'); return; } } t.memuat = true; t.hasil = null; t.pilih = null; var p = {}; r.form.forEach(function (f) { p[f] = t.form[f]; }); P().cari(r.id, p).then(function (h) { t.memuat = false; t.hasil = h; X.gambar(); }); };
  A.trvPilih = function (i) { K.trv.pilih = Number(i); };
  A.trvMinta = function (i) { var t = K.trv, it = t.hasil && t.hasil.items[Number(i)]; if (!it) return; try { var p = {}; P().rumpun(t.rumpun).form.forEach(function (f) { p[f] = t.form[f]; }); var x = P().minta(t.rumpun, it, p, pemesan(), t.catatan); t.catatan = ''; t.pilih = null; K.layar = 'perjalananPesanan'; X.sekilas('Permintaan ' + x.no + ' terkirim · tim mengonfirmasi harga dalam jam kerja.'); } catch (e) { X.sekilas(e.message, 'err'); } };

  X.LAYAR.perjalananPesanan = function () {
    var t = K.trv, saya = P().milik(pemesan().nama);
    saya.forEach(function (x) { if (x.status === 'dibatalkan' && x.perluRefund && !x.direfund) { K.saldo += x.refund; K.mutasi.unshift({ label:'Refund perjalanan · ' + x.no, date:'today', amount:x.refund }); EXO_DB.update('perjalananReq', x.id, { direfund:true }); } });
    var h = '<div class="screen">' + X.kepala('Permintaan perjalanan', saya.length + ' permintaan', 'perjalanan') + '<div class="stack gap-12 pad-x18">';
    if (!saya.length) h += '<div class="card elev-sm t-125 o-7">Belum ada. <button class="btn btn-ghost t-125"' + aksi('ke', 'perjalanan') + '>Cari perjalanan →</button></div>';
    saya.forEach(function (x) {
      var r = P().rumpun(x.rumpun) || { ikon:'🧳' };
      h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8">' + statusTag(x.status) + '<span class="t-11 o-6">' + esc(x.no) + ' · ' + esc(String(x.at).slice(0, 10)) + '</span></div><div class="t-135 bold">' + r.ikon + ' ' + esc(x.judul) + '</div><div class="t-115 o-7 lh-145">' + esc(x.sub || '') + '</div>';
      if (x.status === 'diminta') h += '<div class="t-115">Perkiraan ' + rp(x.hargaPerkiraan) + ' + layanan ' + rp(x.biaya) + ' · menunggu konfirmasi tim.</div><button class="btn btn-secondary" style="height:34px;align-self:flex-start"' + aksi('trvBatal', x.id) + '>Batalkan permintaan</button>';
      if (x.status === 'dikonfirmasi') { h += '<div class="card card-leaf gap-3"><div class="kv"><span>Harga final</span><b>' + rp(x.hargaFinal) + '</b></div><div class="kv"><span>Biaya layanan</span><b>' + rp(x.biaya) + '</b></div><div class="kv"><span>Total</span><b class="f-head t-18">' + rp(x.total) + '</b></div>' + (x.kodeBooking ? '<div class="t-11 o-7">Kode booking ' + esc(x.kodeBooking) + '</div>' : '') + (x.catatanAdmin ? '<div class="t-115">' + esc(x.catatanAdmin) + '</div>' : '') + '<div class="t-11 o-7">Bayar sebelum ' + esc(String(x.batasBayar || '').slice(11, 16)) + ' · saldo ' + rp(X.saldoTersedia()) + '</div>' + (t.pinOpen && t.bayarId === x.id ? '<div class="flex items-center gap-10"><div class="grow t-125 bold">PIN transaksi</div><button class="btn btn-ghost t-12"' + aksi('trvPinBatal') + '>Batal</button></div>' + X.pinDots(K.payPin, true) + X.keypad('payPinTekan', true) + '<button class="btn btn-primary" style="height:40px"' + (K.payPin.length < 6 ? ' disabled' : aksi('trvBayar', x.id)) + '>Konfirmasi bayar · ' + rp(x.total) + '</button>' : '<button class="btn btn-primary" style="height:40px"' + (x.total > X.saldoTersedia() ? ' disabled' : aksi('trvPinBuka', x.id)) + '>' + (x.total > X.saldoTersedia() ? 'Saldo kurang ' + rp(x.total - X.saldoTersedia()) : 'Bayar dengan EXO Wallet · ' + rp(x.total)) + '</button>') + '</div>'; }
      if (x.status === 'dibayar') h += '<div class="t-115">Dibayar ' + rp(x.total) + ' · tiket sedang diterbitkan tim.' + (x.kodeBooking ? ' Kode booking ' + esc(x.kodeBooking) + '.' : '') + '</div>';
      if (x.status === 'terbit') h += '<div class="card card-leaf" style="text-align:center"><div class="t-11 up o-6">Nomor tiket / e-voucher</div><div class="f-head t-18" style="letter-spacing:1px">' + esc(x.nomorTiket || x.kodeBooking || '—') + '</div><div class="t-11 o-7">Tunjukkan bersama identitas saat check-in.</div></div>';
      if (x.status === 'dibatalkan') h += '<div class="t-115 o-7">' + esc(x.alasanBatal || '') + (x.refund ? ' · refund ' + rp(x.refund) + ' ke EXO Wallet' : '') + '</div>';
      h += '</div>';
    });
    return h + '<div class="spacer-14"></div></div></div>';
  };
  A.trvPinBuka = function (id) { K.trv.pinOpen = true; K.trv.bayarId = id; K.payPin = ''; };
  A.trvPinBatal = function () { K.trv.pinOpen = false; K.trv.bayarId = null; K.payPin = ''; };
  A.trvBayar = function (id) { if (K.payPin.length < 6) return; try { var x = EXO_DB.find('perjalananReq', id); if (x.total > X.saldoTersedia()) throw new Error('Saldo EXO Wallet kurang'); P().tandaiBayar(id); K.saldo -= x.total; K.mutasi.unshift({ label:'Perjalanan · ' + x.judul, date:'today · ' + x.no, amount:-x.total }); K.trv.pinOpen = false; K.trv.bayarId = null; K.payPin = ''; X.sekilas('Pembayaran diterima · tiket diterbitkan tim segera.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.trvBatal = function (id) { try { P().batal(id, 'Dibatalkan pemesan', pemesan().nama); X.sekilas('Permintaan dibatalkan.'); } catch (e) { X.sekilas(e.message, 'err'); } };
})(ExoApp);
