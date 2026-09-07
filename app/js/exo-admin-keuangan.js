/* ==========================================================================
   exo-admin-keuangan.js — modul Accounting & Finance di konsol admin
   --------------------------------------------------------------------------
   Tampilan atas EXO_KEUANGAN. Setiap tindakan yang menggerakkan uang atau
   mengubah buku (jurnal manual, batch payout, biaya, setelan pajak, tutup
   buku) TIDAK dieksekusi langsung: ia diajukan lewat EXO_PERSETUJUAN dan
   baru diterapkan setelah penyetuju dari sesi lain menyetujui (payout dan
   tutup buku = tingkat tinggi: dua penyetuju, berlaku tertunda).
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, pill = A.pill, kpi = A.kpi, tabel = A.tabel, meter = A.meter;
  var K = function () { return window.EXO_KEUANGAN; };
  var rp = function (n) { return K().rp(n); };
  S.keuTab = S.keuTab || 'ringkasan'; S.keuBulan = S.keuBulan || (window.EXO_KEUANGAN ? EXO_KEUANGAN.bulanIni() : '');
  S.keuJurnal = S.keuJurnal || { tgl:'', ket:'', baris:[{ akun:'6900', debit:'', kredit:'' }, { akun:'1100', debit:'', kredit:'' }] };
  S.keuBiaya = S.keuBiaya || { tgl:'', akun:'6200', nilai:'', ket:'', ref:'' };
  S.keuPilihPayout = S.keuPilihPayout || {};
  S.keuSetelan = S.keuSetelan || null;

  var TAB = [['ringkasan','Ringkasan'],['piutang','Piutang & invoice'],['rekon','Rekonsiliasi'],['payout','Payout mitra'],['dompet','Dompet & dana ditahan'],['pajak','Pajak'],['jurnal','Jurnal & buku besar'],['biaya','Biaya & anggaran'],['laporan','Laporan'],['periode','Tutup buku & setelan']];
  function namaBulan(b) { var p = b.split('-'); return ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][+p[1] - 1] + ' ' + p[0]; }
  function bulanSebelum(b, n) { var p = b.split('-'), d = new Date(+p[0], +p[1] - 1 - n, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function catatanContoh(r) { return r.contoh || K().pakaiContoh() ? '<div class="card card-clay t-125 lh-15">Basis data ini belum punya cukup pesanan tertangkap, jadi laporan memuat <b>deretan contoh yang ditandai “contoh”</b> agar bentuk laporannya terbaca. Angka nyata dari tabel orders selalu tampil terpisah dan tidak dicampur diam-diam.</div>' : ''; }
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja, opsi) {
    if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; }
    EXO_ADMIN_AUTH.mintaPin(alasan, opsi).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); });
  }
  function lapor(h, judul) { A.sekilas(h.langsung ? judul + ' diterapkan' + (h.usulan.cara === 'tanpa-pemeriksa-kedua' ? ' (mode satu admin, ditandai di log).' : '.') : judul + ' masuk antrean Persetujuan · butuh ' + h.usulan.butuh + ' penyetuju.'); }
  function tertutup() { return K().periodeTertutup(S.keuBulan); }

  /* ---- penerap usulan keuangan ---- */
  if (window.EXO_PERSETUJUAN) {
    var P = EXO_PERSETUJUAN;
    P.TINGKAT.jurnal = 'sedang'; P.TINGKAT.biaya = 'sedang'; P.TINGKAT.payout = 'tinggi'; P.TINGKAT['tutup-buku'] = 'tinggi'; P.TINGKAT['keuangan-setelan'] = 'tinggi'; P.TINGKAT.invoice = 'sedang';
    P.daftarkanPenerap('jurnal', function (u, oleh) { var m = u.muatan; return EXO_DB.insert('jurnal', { tgl:m.tgl, ref:m.ref || 'JM', ket:m.ket, baris:m.baris, sumber:'manual', oleh:oleh.nama, diusulkan:u.pengajuNama }); });
    P.daftarkanPenerap('biaya', function (u, oleh) { var m = u.muatan; return EXO_DB.insert('biaya', { tgl:m.tgl, akun:m.akun, nilai:m.nilai, ket:m.ket, ref:m.ref || '', status:'disetujui', oleh:oleh.nama, diusulkan:u.pengajuNama }); });
    P.daftarkanPenerap('payout', function (u, oleh) { var m = u.muatan; return K().buatPayout(m.daftar, oleh, 'Usulan ' + u.pengajuNama); });
    P.daftarkanPenerap('tutup-buku', function (u, oleh) { var cfg = K().pengaturan(); if (cfg.tutup.indexOf(u.muatan.bulan) < 0) cfg.tutup.push(u.muatan.bulan); K().simpanPengaturan({ tutup:cfg.tutup }); return true; });
    P.daftarkanPenerap('keuangan-setelan', function (u, oleh) { K().simpanPengaturan(u.muatan); return true; });
    P.daftarkanPenerap('invoice', function (u, oleh) { var m = u.muatan; return EXO_DB.insert('invoice', Object.assign({}, m, { oleh:oleh.nama })); });
  }

  /* ================================================================ VIEW */
  VIEW.keuangan = function () {
    if (!window.EXO_KEUANGAN) return '<div class="card elev-sm">Modul keuangan (js/exo-keuangan.js) belum dimuat.</div>';
    var h = '<div class="flex gap-8 wrap items-center">';
    TAB.forEach(function (t) { h += pill(S.keuTab === t[0], t[1], 'keuTab', t[0], true); });
    h += '<div class="grow"></div><div class="flex gap-6 items-center"><span class="t-115 o-6">Periode</span>';
    [2, 1, 0].forEach(function (n) { var b = bulanSebelum(K().bulanIni(), n); h += pill(S.keuBulan === b, namaBulan(b) + (K().periodeTertutup(b) ? ' 🔒' : ''), 'keuBulan', b, true); });
    h += '</div></div>';
    var f = { ringkasan:tabRingkasan, piutang:tabPiutang, rekon:tabRekon, payout:tabPayout, dompet:tabDompet, pajak:tabPajak, jurnal:tabJurnal, biaya:tabBiaya, laporan:tabLaporan, periode:tabPeriode }[S.keuTab] || tabRingkasan;
    return h + f();
  };
  AKSI.keuTab = function (v) { S.keuTab = v; };
  AKSI.keuBulan = function (v) { S.keuBulan = v; };

  /* ---- ringkasan ---- */
  function tabRingkasan() {
    var r = K().ringkasan(S.keuBulan), kw = r.kewajiban;
    var h = catatanContoh(r);
    h += kpi([{label:'GMV tertangkap', value:rp(r.gmv), note:r.jobs + ' kunjungan selesai · ' + r.langganan + ' dari paket'},{label:'Pendapatan platform', value:rp(r.pendapatanPlatform), note:'fee pelanggan + fee mitra · bukan GMV'},{label:'Upah mitra (kewajiban)', value:rp(r.upahMitra), note:'terhutang belum dicairkan ' + rp(r.payoutTerhutang)},{label:'Laba periode', value:rp(r.lr.laba), note:'pendapatan ' + rp(r.lr.totalPendapatan) + ' − beban ' + rp(r.lr.totalBeban), good:r.lr.laba >= 0}], true, 4);
    h += kpi([{label:'Dana ditahan (bukan kas kita)', value:rp(kw.danaDitahan), note:kw.nTahan + ' penahanan aktif · di luar neraca sampai ditangkap'},{label:'Saldo dompet pelanggan', value:rp(kw.saldoDompet), note:'LIABILITAS · + kredit jaminan ' + rp(kw.kreditJaminan)},{label:'Kontrak B2B bulan ini', value:rp(r.kontrak), note:'invoice bulanan · lihat Piutang'},{label:'Arus kas bersih', value:rp(r.kas.bersih), note:'masuk ' + rp(r.kas.masuk) + ' · keluar ' + rp(r.kas.keluar), good:r.kas.bersih >= 0}], true, 4);
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Ke mana uang pergi dari satu kunjungan</div>';
    var p = K().pecah(237000);
    [['Dibayar pelanggan', p.nilai, 100], ['Upah mitra (bersih setelah PPh 21)', p.upahBersih, p.upahBersih / p.nilai * 100], ['PPh 21 dipotong, disetor ke negara', p.pph, p.pph / p.nilai * 100], ['Fee platform pelanggan', p.feePelanggan, p.feePelanggan / p.nilai * 100], ['Fee platform mitra', p.feeMitra, p.feeMitra / p.nilai * 100]].forEach(function (x) { h += '<div class="stack gap-4"><div class="flex t-125"><span class="grow">' + x[0] + '</span><b>' + rp(x[1]) + '</b></div>' + meter(Math.max(2, Math.round(x[2])), 'soft') + '</div>'; });
    h += '<div class="t-115 o-6 lh-15">Contoh pesanan Rp237.000: pendapatan EXOCLEAN hanya ' + rp(p.pendapatan) + ' (' + (p.pendapatan / p.nilai * 100).toFixed(1) + '%). Sisanya milik mitra dan negara — itulah sebabnya GMV bukan pendapatan.</div></div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Perhatian finance sekarang</div>';
    var rk = K().rekonsiliasi(S.keuBulan), ag = K().umurPiutang(), pj = K().pajak(S.keuBulan), av = K().anggaranVsRealisasi(S.keuBulan).filter(function (x) { return x.pct > 90; });
    var poin = [[rk.tahanLama.length ? 'accent' : 'green', rk.tahanLama.length + ' penahanan > 24 jam belum ditangkap', 'Rekonsiliasi'], [ag.ember['>60'] + ag.ember['31-60'] ? 'accent' : 'green', 'Piutang lewat 30 hari ' + rp(ag.ember['31-60'] + ag.ember['>60']), 'Piutang'], ['flat', 'PPN keluaran ' + rp(pj.ppnKeluaran + pj.ppnKontrak) + ' · PPh 21 ' + rp(pj.pph21), 'Pajak'], [r.payoutTerhutang ? 'accent' : 'green', 'Payout terhutang ' + rp(r.payoutTerhutang) + ' · jadwal ' + K().pengaturan().jadwalPayout, 'Payout'], [av.length ? 'accent' : 'green', av.length + ' pos biaya > 90% anggaran', 'Biaya']];
    poin.forEach(function (x) { h += '<div class="flex items-center gap-9">' + chip(x[0], x[2]) + '<span class="t-125 grow">' + esc(x[1]) + '</span></div>'; });
    h += '</div></div>';
    return h;
  }

  /* ---- piutang ---- */
  function tabPiutang() {
    var inv = K().invoice().sort(function (a, b) { return b.tgl.localeCompare(a.tgl); }), ag = K().umurPiutang();
    var h = kpi([{label:'Piutang berjalan', value:rp(ag.total), note:'invoice terkirim, belum lunas'},{label:'Lancar', value:rp(ag.ember.lancar), note:'belum jatuh tempo', good:true},{label:'1–30 hari', value:rp(ag.ember['1-30']), note:'kirim pengingat'},{label:'> 30 hari', value:rp(ag.ember['31-60'] + ag.ember['>60']), note:'eskalasi account manager', good:!(ag.ember['31-60'] + ag.ember['>60'])}], true, 4);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Invoice kontrak & B2B</div><div class="t-115 o-6">Kontrak bulanan diinvoice tanggal 1, jatuh tempo 14 hari · PPN ' + K().pengaturan().ppn + '% termasuk · nomor INV/tahun/bulan/urut</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('keuUnduh', 'invoice') + '>Ekspor CSV</button></div>' +
      tabel(['No. invoice','Tanggal','Jatuh tempo','Klien','Keterangan','Nilai','Status'], inv.length ? inv.map(function (i) { return ['<span class="id">' + esc(i.no) + '</span>', esc(i.tgl), esc(i.jatuhTempo), '<b>' + esc(i.klien) + '</b>', '<span class="t-12">' + esc(i.ket) + (i.contoh ? ' · <i class="o-6">contoh</i>' : '') + '</span>', rp(i.nilai), chip(i.status === 'lunas' ? 'green' : i.status === 'terkirim' ? 'accent' : 'flat', i.status)]; }) : [['<span class="o-6">Belum ada invoice.</span>', '', '', '', '', '', '']]) + '</div>';
    h += '<div class="t-115 o-6 lh-15">Yang perlu dibangun berikutnya di server: pengiriman invoice PDF + e-Faktur ke klien, pengingat otomatis H-3 dan H+1, dan pencocokan pembayaran masuk ke invoice (virtual account per klien).</div>';
    return h;
  }

  /* ---- rekonsiliasi ---- */
  function tabRekon() {
    var r = K().rekonsiliasi(S.keuBulan), rows = Object.keys(r.perMetode).map(function (m) { var s = r.perMetode[m]; return ['<b>' + esc(m) + '</b>', s.nTangkap + ' · ' + rp(s.tangkap), s.nTahan + ' · ' + rp(s.tahan), s.nLepas + ' · ' + rp(s.lepas), chip(s.nTahan ? 'accent' : 'green', s.nTahan ? 'ada hold terbuka' : 'seimbang')]; });
    var h = catatanContoh({});
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Pesanan vs pembayaran per kanal · ' + namaBulan(S.keuBulan) + '</div><div class="t-115 o-6">Ditangkap = uang benar-benar masuk · Ditahan = komitmen, belum kas · Dilepas = dikembalikan ke pelanggan</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('keuUnduh', 'peristiwa') + '>Ekspor peristiwa CSV</button></div>' + tabel(['Kanal','Ditangkap','Ditahan','Dilepas','Status'], rows.length ? rows : [['<span class="o-6">Belum ada transaksi bulan ini.</span>', '', '', '', '']]) + '</div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Penahanan > 24 jam tanpa penangkapan (' + r.tahanLama.length + ')</div>' + tabel(['Pesanan','Klien','Mitra','Kanal','Nilai','Sejak'], r.tahanLama.length ? r.tahanLama.map(function (e) { return ['<span class="id">' + esc(e.orderNo) + '</span>', esc(e.klien), esc(e.mitra), esc(e.metode), rp(e.nilai), esc(String(e.at || e.tgl).slice(0, 16).replace('T', ' '))]; }) : [['<span class="o-6">Tidak ada — semua penahanan ditangkap atau dilepas tepat waktu.</span>', '', '', '', '', '']]) + '</div>';
    h += '<div class="t-115 o-6 lh-15">Untuk produksi: tarik laporan settlement Midtrans/Xendit (API) dan cocokkan per transaction_id; selisih fee gateway dijurnal otomatis ke 5300. Penahanan kartu yang tidak ditangkap dalam 7 hari kedaluwarsa di gateway — tandai dan tagih ulang.</div>';
    return h;
  }

  /* ---- payout ---- */
  function tabPayout() {
    var cfg = K().pengaturan(), th = K().payoutTerhutang(), batch = K().payoutBatch().slice().reverse(), dipilih = th.filter(function (m) { return S.keuPilihPayout[m.mitraId || m.mitra]; }), total = dipilih.reduce(function (n, m) { return n + m.bersih; }, 0);
    var h = kpi([{label:'Terhutang ke mitra', value:rp(th.reduce(function (n, m) { return n + m.bersih; }, 0)), note:th.length + ' mitra · upah bersih setelah PPh 21'},{label:'PPh 21 ikut dipotong', value:rp(th.reduce(function (n, m) { return n + m.pph; }, 0)), note:cfg.pph21 + '% × upah kotor · disetor ke negara'},{label:'Jadwal', value:cfg.jadwalPayout, note:'setiap ' + cfg.hariPayout + ' · instan Rp2.500 ditanggung mitra'},{label:'Dipilih untuk batch', value:rp(total), note:dipilih.length + ' mitra · ' + (total >= cfg.ambangPayoutTinggi ? 'tingkat tinggi (2 penyetuju, tunda 30 menit)' : 'di bawah ambang ' + rp(cfg.ambangPayoutTinggi))}], true, 4);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Upah terhutang per mitra</div><div class="t-115 o-6">Hanya kunjungan yang sudah DITANGKAP dananya. Batch pencairan diajukan lewat Persetujuan; rekening tujuan wajib atas nama mitra sendiri.</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('keuPilihSemua') + '>' + (dipilih.length === th.length && th.length ? 'Batal pilih' : 'Pilih semua') + '</button><button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px;margin-inline-start:8px"' + (dipilih.length && !tertutup() ? aksi('keuPayoutAjukan') : ' disabled') + '>Ajukan batch · PIN</button></div>' +
      tabel(['','Mitra','Job','Upah kotor','PPh 21','Bersih dicairkan'], th.length ? th.map(function (m) { var k = m.mitraId || m.mitra; return ['<button class="pill pill-sm' + (S.keuPilihPayout[k] ? ' on' : '') + '"' + aksi('keuPilihPayout', k) + '>' + (S.keuPilihPayout[k] ? '✓' : '○') + '</button>', '<b>' + esc(m.mitra) + '</b>' + (m.contoh ? ' <i class="o-6 t-11">contoh</i>' : ''), String(m.jobs), rp(m.kotor), '− ' + rp(m.pph), '<b>' + rp(m.bersih) + '</b>']; }) : [['', '<span class="o-6">Tidak ada upah terhutang.</span>', '', '', '', '']]) + '</div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Batch pencairan</div>' + tabel(['No. batch','Tanggal','Mitra','Total bersih','PPh 21','Oleh'], batch.length ? batch.map(function (b) { return ['<span class="id">' + esc(b.no) + '</span>', esc(b.tgl), String(b.jumlahMitra), rp(b.total), rp(b.pph), '<span class="t-12">' + esc(b.oleh || '') + ' · ' + esc(b.catatan || '') + '</span>']; }) : [['<span class="o-6">Belum ada batch.</span>', '', '', '', '', '']]) + '</div>';
    return h;
  }
  AKSI.keuPilihPayout = function (k) { S.keuPilihPayout[k] = !S.keuPilihPayout[k]; };
  AKSI.keuPilihSemua = function () { var th = K().payoutTerhutang(), semua = th.every(function (m) { return S.keuPilihPayout[m.mitraId || m.mitra]; }); S.keuPilihPayout = {}; if (!semua) th.forEach(function (m) { S.keuPilihPayout[m.mitraId || m.mitra] = true; }); };
  AKSI.keuPayoutAjukan = function () {
    var th = K().payoutTerhutang().filter(function (m) { return S.keuPilihPayout[m.mitraId || m.mitra]; }), total = th.reduce(function (n, m) { return n + m.bersih; }, 0);
    if (!th.length) return;
    var P = EXO_PERSETUJUAN, cfg = K().pengaturan(); P.TINGKAT.payout = total >= cfg.ambangPayoutTinggi ? 'tinggi' : 'sedang';
    var judul = 'Batch payout ' + th.length + ' mitra · ' + rp(total);
    denganPin('Ajukan ' + judul + (P.TINGKAT.payout === 'tinggi' ? ' (tingkat tinggi: 2 penyetuju, berlaku tertunda)' : ''), function (oleh) {
      var h = P.ajukan('payout', judul, 'Pencairan upah mitra ' + namaBulan(S.keuBulan), null, { mitra:th.map(function (m) { return m.mitra + ': ' + rp(m.bersih); }) }, { daftar:th }, oleh);
      S.keuPilihPayout = {}; lapor(h, judul);
    }, { sandiJuga: P.butuhSesiUlang(EXO_ADMIN_AUTH.sesi(), { tingkat:P.TINGKAT.payout }) });
  };

  /* ---- dompet ---- */
  function tabDompet() {
    var kw = K().kewajibanPelanggan(S.keuBulan), total = kw.saldoDompet + kw.kreditJaminan + kw.poinCashback + kw.prabayar;
    var h = catatanContoh(kw);
    h += kpi([{label:'Total kewajiban ke pelanggan', value:rp(total), note:'harus tersedia di kas/bank setiap saat'},{label:'Saldo EXO Wallet', value:rp(kw.saldoDompet), note:'akun 2200 · bukan pendapatan'},{label:'Prabayar belum terpakai', value:rp(kw.prabayar), note:'akun 2400 · diakui saat jam dipakai'},{label:'Dana ditahan aktif', value:rp(kw.danaDitahan), note:kw.nTahan + ' hold · di luar neraca'}], true, 4);
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Aturan yang dijaga finance</div>' +
      ['Saldo dompet, kredit jaminan, poin/cashback, dan prabayar adalah UTANG ke pelanggan. Kas yang menutupnya tidak boleh dipakai untuk biaya operasional (rekening escrow terpisah).', 'Dana yang DITAHAN belum pindah tangan: tidak boleh dihitung sebagai pemasukan dan tidak boleh dicairkan ke mitra sebelum ditangkap.', 'Kredit jaminan Rp100.000 (jadwal digeser oleh kami) dan refund adalah BEBAN periode saat diberikan, bukan pengurang pendapatan berikutnya.', 'Poin ditukar dan cashback dicatat sebagai beban pemasaran saat diterbitkan, dan liabilitas sampai ditukar.'].map(function (t) { return '<div class="flex gap-9 t-125 lh-15"><i class="check-sm">✓</i><span class="o-85">' + t + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Rasio kecukupan escrow</div>' + meter(kw.contoh ? 100 : 100, 'acc') + '<div class="t-125">Kas escrow ≥ total kewajiban pelanggan: <b>' + (kw.contoh ? 'terpenuhi (contoh)' : 'hubungkan saldo bank escrow untuk menghitung') + '</b></div><div class="t-115 o-6 lh-15">Di produksi angka ini diambil dari saldo rekening escrow bank lewat API/statement harian dan dibandingkan otomatis; di bawah 100% memicu peringatan ke Finance dan Super admin.</div></div></div>';
    return h;
  }

  /* ---- pajak ---- */
  function tabPajak() {
    var p = K().pajak(S.keuBulan);
    var h = catatanContoh({});
    h += kpi([{label:'PPN keluaran · fee platform', value:rp(p.ppnKeluaran), note:p.tarif.ppn + '% × DPP ' + rp(p.dppPpn)},{label:'PPN · kontrak B2B', value:rp(p.ppnKontrak), note:'termasuk dalam nilai invoice'},{label:'PPh 21 dipotong dari mitra', value:rp(p.pph21), note:p.tarif.pph21 + '% × upah kotor ' + rp(p.dppPph)},{label:'Setor & lapor', value:'10 / 20', note:'PPh: setor tgl 10, lapor tgl 20 · PPN: akhir bulan berikutnya'}], true, 4);
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Perlakuan pajak yang dipakai</div>' +
      ['PPN dikenakan atas JASA PLATFORM (fee pelanggan + fee mitra) dan atas kontrak B2B; upah mitra perorangan bukan objek PPN EXOCLEAN.', 'Mitra perorangan: PPh 21 bukan pegawai, tarif efektif ' + p.tarif.pph21 + '% (50% × 5% lapisan pertama, ber-NPWP; tanpa NPWP 120%). Mitra badan/PT: PPh 23 ' + p.tarif.pph23 + '%.', 'Bukti potong diterbitkan per mitra per bulan dan bisa diunduh mitra dari aplikasinya.', 'Tarif diubah lewat Tutup buku & setelan → usulan tingkat tinggi. Konfirmasikan perlakuan ini dengan konsultan pajak sebelum SPT pertama.'].map(function (t) { return '<div class="flex gap-9 t-125 lh-15"><i class="check-sm">✓</i><span class="o-85">' + t + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Ekspor untuk e-Faktur & e-Bupot</div><div class="t-125 lh-15 o-85">CSV berisi tanggal, nomor pesanan, DPP, PPN, dan PPh per transaksi periode ' + namaBulan(S.keuBulan) + ' — siap diimpor ke aplikasi pajak atau diserahkan ke konsultan.</div><div class="flex gap-8"><button class="btn btn-secondary" style="height:34px"' + aksi('keuUnduh', 'pajak') + '>Ekspor CSV pajak</button></div></div></div>';
    return h;
  }

  /* ---- jurnal & buku besar ---- */
  function tabJurnal() {
    var j = K().jurnal(S.keuBulan), bb = K().bukuBesar(S.keuBulan), totD = 0, totK = 0; bb.forEach(function (a) { totD += a.debit; totK += a.kredit; });
    var f = S.keuJurnal, sb = K().seimbang(f.baris.map(function (b) { return { debit:Number(b.debit) || 0, kredit:Number(b.kredit) || 0 }; }));
    var h = catatanContoh({});
    h += '<div class="grid g121"><div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Neraca saldo · ' + namaBulan(S.keuBulan) + '</div><div class="t-115 o-6">Debit ' + rp(totD) + ' · Kredit ' + rp(totK) + ' · ' + (Math.abs(totD - totK) < 1 ? 'seimbang' : 'TIDAK SEIMBANG') + '</div></div><button class="btn btn-secondary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('keuUnduh', 'jurnal') + '>Ekspor jurnal CSV</button></div>' +
      tabel(['Akun','Nama','Tipe','Debit','Kredit','Saldo'], bb.length ? bb.map(function (a) { return ['<span class="id">' + a.kode + '</span>', esc(a.nama), '<span class="t-11 o-7">' + a.tipe + '</span>', rp(a.debit), rp(a.kredit), '<b>' + rp(a.saldo) + '</b>']; }) : [['<span class="o-6">Belum ada jurnal periode ini.</span>', '', '', '', '', '']]) + '</div>';
    h += '<div class="stack gap-16"><div class="card elev-sm gap-10"><div class="card-title">Jurnal manual → Persetujuan</div><div class="t-115 o-6 lh-15">Untuk koreksi, akrual, dan penyesuaian. Harus seimbang; ke periode terkunci ditolak. Diajukan dengan PIN, diterapkan setelah penyetuju lain menyetujui.</div>' +
      '<div class="grid g2" style="gap:8px"><div class="field"><label>Tanggal</label><input class="input" type="date" value="' + esc(f.tgl) + '" data-ubah="keuJurnalUbah" data-arg="tgl"></div><div class="field"><label>Keterangan</label><input class="input" value="' + esc(f.ket) + '" data-ubah="keuJurnalUbah" data-arg="ket" placeholder="Apa yang dikoreksi dan mengapa"></div></div>';
    f.baris.forEach(function (b, i) {
      h += '<div class="flex gap-6 items-center"><select class="input" style="flex:2;height:38px" data-ubah="keuJurnalUbah" data-arg="' + i + ':akun">' + K().COA.map(function (a) { return '<option value="' + a.kode + '"' + (a.kode === b.akun ? ' selected' : '') + '>' + a.kode + ' · ' + esc(a.nama) + '</option>'; }).join('') + '</select>' +
        '<input class="input" style="flex:1;height:38px" inputmode="numeric" placeholder="Debit" value="' + esc(b.debit) + '" data-ubah="keuJurnalUbah" data-arg="' + i + ':debit"><input class="input" style="flex:1;height:38px" inputmode="numeric" placeholder="Kredit" value="' + esc(b.kredit) + '" data-ubah="keuJurnalUbah" data-arg="' + i + ':kredit">' +
        '<button class="btn btn-secondary" style="height:34px;padding:0 9px"' + (f.baris.length > 2 ? aksi('keuJurnalHapus', i) : ' disabled') + '>✕</button></div>';
    });
    h += '<div class="flex gap-8 items-center"><button class="btn btn-secondary" style="height:34px"' + aksi('keuJurnalTambah') + '>+ Baris</button><span class="t-115 ' + (sb.ok ? 'o-7' : '') + '" style="' + (sb.ok ? '' : 'color:#9b1c1c') + '">Dr ' + rp(sb.debit) + ' · Cr ' + rp(sb.kredit) + (sb.ok ? ' · seimbang' : ' · belum seimbang') + '</span><button class="btn btn-primary" style="height:34px;margin-inline-start:auto"' + (sb.ok && f.tgl && f.ket && !K().periodeTertutup(f.tgl.slice(0, 7)) ? aksi('keuJurnalAjukan') : ' disabled') + '>Ajukan · PIN</button></div></div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Jurnal periode (' + j.length + ')</div><div style="max-height:420px;overflow:auto">' + tabel(['Tgl','Ref','Keterangan','Baris','Sumber'], j.slice(0, 80).map(function (x) { var sb2 = K().seimbang(x.baris); return [esc(x.tgl), '<span class="id" style="font-size:11.5px">' + esc(x.ref || '') + '</span>', '<span class="t-12">' + esc(x.ket) + '</span>', '<span class="t-11">' + x.baris.map(function (b) { return (b.debit ? 'Dr ' : 'Cr ') + b.akun + ' ' + rp(b.debit || b.kredit); }).join('<br>') + '</span>', chip(x.sumber === 'contoh' ? 'flat' : x.sumber === 'manual' ? 'accent' : 'green', x.sumber) + (sb2.ok ? '' : ' ⚠')]; })) + '</div></div></div></div>';
    return h;
  }
  AKSI.keuJurnalUbah = function (arg, v) { var f = S.keuJurnal; if (arg === 'tgl' || arg === 'ket') { f[arg] = v; return; } var p = arg.split(':'), b = f.baris[+p[0]]; if (!b) return; b[p[1]] = p[1] === 'akun' ? v : String(v).replace(/[^\d]/g, ''); if (p[1] === 'debit' && b.debit) b.kredit = ''; if (p[1] === 'kredit' && b.kredit) b.debit = ''; };
  AKSI.keuJurnalTambah = function () { S.keuJurnal.baris.push({ akun:'6900', debit:'', kredit:'' }); };
  AKSI.keuJurnalHapus = function (i) { S.keuJurnal.baris.splice(+i, 1); };
  AKSI.keuJurnalAjukan = function () {
    var f = S.keuJurnal, baris = f.baris.map(function (b) { return { akun:b.akun, debit:Number(b.debit) || 0, kredit:Number(b.kredit) || 0 }; }), sb = K().seimbang(baris);
    if (!sb.ok) { A.sekilas('Jurnal belum seimbang.', 'err'); return; }
    var P = EXO_PERSETUJUAN; P.TINGKAT.jurnal = sb.debit >= K().pengaturan().ambangJurnalTinggi ? 'tinggi' : 'sedang';
    var judul = 'Jurnal manual ' + f.tgl + ' · ' + rp(sb.debit) + ' · ' + f.ket.slice(0, 40);
    denganPin('Ajukan ' + judul, function (oleh) { var h = P.ajukan('jurnal', judul, f.ket, null, { baris:baris.map(function (b) { return b.akun + ' ' + K().akun(b.akun).nama + ': ' + (b.debit ? 'Dr ' + rp(b.debit) : 'Cr ' + rp(b.kredit)); }) }, { tgl:f.tgl, ket:f.ket, baris:baris, ref:'JM' }, oleh); S.keuJurnal = { tgl:'', ket:'', baris:[{ akun:'6900', debit:'', kredit:'' }, { akun:'1100', debit:'', kredit:'' }] }; lapor(h, judul); });
  };

  /* ---- biaya & anggaran ---- */
  function tabBiaya() {
    var av = K().anggaranVsRealisasi(S.keuBulan), daftar = K().biaya().filter(function (b) { return String(b.tgl).slice(0, 7) === S.keuBulan; }).reverse(), f = S.keuBiaya;
    var h = '<div class="grid g121"><div class="card elev-sm gap-10"><div class="card-title">Anggaran vs realisasi · ' + namaBulan(S.keuBulan) + '</div>';
    av.forEach(function (x) { h += '<div class="stack gap-4"><div class="flex t-125"><span class="grow">' + esc(x.akun + ' · ' + x.nama) + '</span><span>' + rp(x.realisasi) + ' / ' + rp(x.anggaran) + '</span><b style="width:44px;text-align:end;color:' + (x.pct > 100 ? '#9b1c1c' : 'inherit') + '">' + x.pct + '%</b></div>' + meter(Math.min(100, x.pct), x.pct > 90 ? 'acc' : 'soft') + '</div>'; });
    h += '<div class="t-115 o-6 lh-15">Anggaran diubah lewat Tutup buku & setelan (usulan tingkat tinggi). Pos di atas 90% ditandai di Ringkasan.</div></div>';
    h += '<div class="stack gap-16"><div class="card elev-sm gap-10"><div class="card-title">Catat biaya operasional → Persetujuan</div>' +
      '<div class="grid g2" style="gap:8px"><div class="field"><label>Tanggal</label><input class="input" type="date" value="' + esc(f.tgl) + '" data-ubah="keuBiayaUbah" data-arg="tgl"></div><div class="field"><label>Pos anggaran</label><select class="input" style="height:40px" data-ubah="keuBiayaUbah" data-arg="akun">' + K().COA.filter(function (a) { return a.tipe === 'beban'; }).map(function (a) { return '<option value="' + a.kode + '"' + (a.kode === f.akun ? ' selected' : '') + '>' + a.kode + ' · ' + esc(a.nama) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Nilai (Rp)</label><input class="input" inputmode="numeric" value="' + esc(f.nilai) + '" data-ubah="keuBiayaUbah" data-arg="nilai"></div><div class="field"><label>No. bukti / referensi</label><input class="input" value="' + esc(f.ref) + '" data-ubah="keuBiayaUbah" data-arg="ref" placeholder="Nota, PO, invoice vendor"></div></div>' +
      '<div class="field"><label>Keterangan</label><input class="input" value="' + esc(f.ket) + '" data-ubah="keuBiayaUbah" data-arg="ket" placeholder="Untuk apa, vendor siapa"></div>' +
      '<div class="flex"><button class="btn btn-primary" style="height:36px;margin-inline-start:auto"' + (f.tgl && Number(f.nilai) > 0 && f.ket && !K().periodeTertutup(f.tgl.slice(0, 7)) ? aksi('keuBiayaAjukan') : ' disabled') + '>Ajukan · PIN</button></div></div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Biaya tercatat (' + daftar.length + ')</div>' + tabel(['Tgl','Pos','Keterangan','Ref','Nilai','Oleh'], daftar.length ? daftar.map(function (b) { return [esc(b.tgl), '<span class="id" style="font-size:11.5px">' + esc(b.akun) + '</span>', '<span class="t-12">' + esc(b.ket) + '</span>', '<span class="t-12">' + esc(b.ref || '') + '</span>', rp(b.nilai), '<span class="t-12">' + esc(b.oleh || '') + '</span>']; }) : [['<span class="o-6">Belum ada biaya tercatat bulan ini.</span>', '', '', '', '', '']]) + '</div></div></div>';
    return h;
  }
  AKSI.keuBiayaUbah = function (arg, v) { S.keuBiaya[arg] = arg === 'nilai' ? String(v).replace(/[^\d]/g, '') : v; };
  AKSI.keuBiayaAjukan = function () {
    var f = S.keuBiaya, nilai = Number(f.nilai), judul = 'Biaya ' + K().akun(f.akun).nama + ' · ' + rp(nilai) + ' · ' + f.ket.slice(0, 40);
    var P = EXO_PERSETUJUAN; P.TINGKAT.biaya = nilai >= K().pengaturan().ambangJurnalTinggi ? 'tinggi' : 'sedang';
    denganPin('Ajukan ' + judul, function (oleh) { var h = P.ajukan('biaya', judul, f.ket, null, { pos:f.akun + ' ' + K().akun(f.akun).nama, nilai:rp(nilai), ref:f.ref }, { tgl:f.tgl, akun:f.akun, nilai:nilai, ket:f.ket, ref:f.ref }, oleh); S.keuBiaya = { tgl:'', akun:'6200', nilai:'', ket:'', ref:'' }; lapor(h, judul); });
  };

  /* ---- laporan ---- */
  function tabLaporan() {
    var lr = K().labaRugi(S.keuBulan), nr = K().neraca(S.keuBulan), ak = K().arusKas(S.keuBulan);
    var h = catatanContoh({});
    h += '<div class="flex gap-8"><button class="btn btn-secondary" style="height:34px"' + aksi('keuUnduh', 'labarugi') + '>Ekspor laba rugi CSV</button><button class="btn btn-secondary" style="height:34px"' + aksi('keuUnduh', 'neraca') + '>Ekspor neraca CSV</button><button class="btn btn-secondary" style="height:34px"' + aksi('keuUnduh', 'jurnal') + '>Ekspor jurnal CSV</button></div>';
    h += '<div class="grid g3" style="gap:16px"><div class="card elev-sm table-card"><div class="card-head card-title">Laba rugi · ' + namaBulan(S.keuBulan) + '</div>' + tabel(['Akun','Nilai'], lr.pendapatan.map(function (a) { return ['<span class="t-12">' + a.kode + ' ' + esc(a.nama) + '</span>', rp(a.saldo)]; }).concat([['<b>Total pendapatan</b>', '<b>' + rp(lr.totalPendapatan) + '</b>']], lr.beban.map(function (a) { return ['<span class="t-12">' + a.kode + ' ' + esc(a.nama) + '</span>', '(' + rp(a.saldo) + ')']; }), [['<b>Total beban</b>', '<b>(' + rp(lr.totalBeban) + ')</b>'], ['<b>Laba (rugi) bersih</b>', '<b style="color:' + (lr.laba >= 0 ? 'inherit' : '#9b1c1c') + '">' + rp(lr.laba) + '</b>']])) + '</div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Neraca (mutasi periode)</div>' + tabel(['Akun','Nilai'], nr.aset.map(function (a) { return ['<span class="t-12">' + a.kode + ' ' + esc(a.nama) + '</span>', rp(a.saldo)]; }).concat([['<b>Total aset</b>', '<b>' + rp(nr.totalAset) + '</b>']], nr.liabilitas.map(function (a) { return ['<span class="t-12">' + a.kode + ' ' + esc(a.nama) + '</span>', rp(a.saldo)]; }), [['<b>Total liabilitas</b>', '<b>' + rp(nr.totalLiabilitas) + '</b>'], ['<span class="t-12">Laba periode → ekuitas</span>', rp(nr.labaPeriode)], ['<b>Liabilitas + ekuitas</b>', '<b>' + rp(nr.totalLiabilitas + nr.totalEkuitas) + '</b>']])) + '</div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Arus kas</div>' + tabel(['Sumber','Bersih'], Object.keys(ak.rinci).map(function (k) { return [esc(k), rp(ak.rinci[k])]; }).concat([['<b>Kas masuk</b>', '<b>' + rp(ak.masuk) + '</b>'], ['<b>Kas keluar</b>', '<b>(' + rp(ak.keluar) + ')</b>'], ['<b>Arus kas bersih</b>', '<b>' + rp(ak.bersih) + '</b>']])) + '</div></div>';
    h += '<div class="t-115 o-6 lh-15">Neraca di sini menampilkan mutasi periode (belum ada saldo awal karena buku dimulai di prototipe). Saat pindah ke server, saldo awal per akun dimuat dari neraca penutup periode sebelumnya.</div>';
    return h;
  }

  /* ---- periode & setelan ---- */
  function tabPeriode() {
    var cfg = K().pengaturan(), s = S.keuSetelan || (S.keuSetelan = { ppn:cfg.ppn, pph21:cfg.pph21, pph23:cfg.pph23, feePelanggan:cfg.feePelanggan, feeMitra:cfg.feeMitra, ambangPayoutTinggi:cfg.ambangPayoutTinggi, ambangJurnalTinggi:cfg.ambangJurnalTinggi, jadwalPayout:cfg.jadwalPayout });
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Tutup buku</div><div class="t-125 lh-15 o-85">Menutup periode mengunci jurnal, biaya, dan payout bertanggal di bulan itu. Syarat: rekonsiliasi tanpa penahanan menggantung, neraca saldo seimbang, pajak sudah dihitung. Tutup buku adalah usulan <b>tingkat tinggi</b> (2 penyetuju, berlaku tertunda 30 menit).</div><div class="flex wrap gap-6">';
    [3, 2, 1, 0].forEach(function (n) { var b = bulanSebelum(K().bulanIni(), n), t = K().periodeTertutup(b); h += '<button class="pill pill-sm' + (t ? ' on' : '') + '"' + (t ? ' disabled' : aksi('keuTutupAjukan', b)) + '>' + (t ? '🔒 ' : '') + namaBulan(b) + (t ? ' · terkunci' : ' · tutup')+ '</button>'; });
    h += '</div></div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Setelan pajak, fee & ambang</div><div class="grid g2" style="gap:8px">';
    [['ppn','PPN (%)'],['pph21','PPh 21 mitra perorangan (%)'],['pph23','PPh 23 mitra badan (%)'],['feePelanggan','Fee platform pelanggan (Rp)'],['feeMitra','Fee platform mitra (Rp)'],['ambangPayoutTinggi','Ambang payout tingkat tinggi (Rp)'],['ambangJurnalTinggi','Ambang jurnal/biaya tingkat tinggi (Rp)']].forEach(function (f) { h += '<div class="field"><label>' + f[1] + '</label><input class="input" inputmode="decimal" value="' + esc(s[f[0]]) + '" data-ubah="keuSetelanUbah" data-arg="' + f[0] + '"></div>'; });
    h += '<div class="field"><label>Jadwal payout</label><select class="input" style="height:40px" data-ubah="keuSetelanUbah" data-arg="jadwalPayout">' + ['mingguan','dua-mingguan','harian'].map(function (x) { return '<option value="' + x + '"' + (s.jadwalPayout === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="flex"><button class="btn btn-primary" style="height:36px;margin-inline-start:auto"' + aksi('keuSetelanAjukan') + '>Ajukan perubahan setelan · PIN (tingkat tinggi)</button></div></div></div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Pemisahan tugas yang diterapkan</div>' + [['Staf finance','mencatat biaya, menyusun jurnal manual, menyiapkan batch payout, mengekspor laporan'],['Supervisor finance','menyetujui jurnal & biaya (tingkat sedang), menjadi penyetuju pertama payout/tutup buku'],['Super admin / direktur','penyetuju kedua payout & tutup buku, mengubah tarif pajak dan fee, membuka kembali periode (usulan tinggi)']].map(function (r) { return '<div class="flex gap-10 t-125"><b style="width:170px;flex:none">' + r[0] + '</b><span class="o-85">' + r[1] + '</span></div>'; }).join('') + '<div class="t-115 o-6 lh-15">Semua langkah tercatat di log audit berantai hash (modul Persetujuan). Tidak ada satu orang yang bisa mencatat DAN mencairkan uang sendirian.</div></div>';
    return h;
  }
  AKSI.keuSetelanUbah = function (arg, v) { S.keuSetelan[arg] = arg === 'jadwalPayout' ? v : Number(String(v).replace(',', '.')) || 0; };
  AKSI.keuSetelanAjukan = function () {
    var s = S.keuSetelan, cfg = K().pengaturan(), sebelum = {}, sesudah = {}; Object.keys(s).forEach(function (k) { if (String(cfg[k]) !== String(s[k])) { sebelum[k] = cfg[k]; sesudah[k] = s[k]; } });
    if (!Object.keys(sesudah).length) { A.sekilas('Tidak ada setelan yang berubah.'); return; }
    var judul = 'Setelan keuangan: ' + Object.keys(sesudah).join(', ');
    denganPin('Ajukan ' + judul + ' (tingkat tinggi)', function (oleh) { var h = EXO_PERSETUJUAN.ajukan('keuangan-setelan', judul, 'Perubahan tarif/fee/ambang', sebelum, sesudah, sesudah, oleh); S.keuSetelan = null; lapor(h, judul); }, { sandiJuga: EXO_PERSETUJUAN.butuhSesiUlang(EXO_ADMIN_AUTH.sesi(), { tingkat:'tinggi' }) });
  };
  AKSI.keuTutupAjukan = function (b) {
    var rk = K().rekonsiliasi(b), bb = K().bukuBesar(b), d = 0, k = 0; bb.forEach(function (a) { d += a.debit; k += a.kredit; });
    if (rk.tahanLama.length) { A.sekilas('Tutup buku ditolak: masih ada ' + rk.tahanLama.length + ' penahanan menggantung di ' + namaBulan(b) + '.', 'err'); return; }
    if (Math.abs(d - k) >= 1) { A.sekilas('Tutup buku ditolak: neraca saldo tidak seimbang.', 'err'); return; }
    var judul = 'Tutup buku ' + namaBulan(b);
    denganPin('Ajukan ' + judul + ' (tingkat tinggi: 2 penyetuju, berlaku tertunda)', function (oleh) { var h = EXO_PERSETUJUAN.ajukan('tutup-buku', judul, 'Periode dikunci · neraca saldo Dr ' + rp(d) + ' = Cr ' + rp(k), { status:'terbuka' }, { status:'terkunci' }, { bulan:b }, oleh); lapor(h, judul); }, { sandiJuga: EXO_PERSETUJUAN.butuhSesiUlang(EXO_ADMIN_AUTH.sesi(), { tingkat:'tinggi' }) });
  };

  /* ---- ekspor ---- */
  AKSI.keuUnduh = function (jenis) {
    var Kk = K(), b = S.keuBulan, rows, nama = 'exoclean-' + jenis + '-' + b + '.csv';
    if (jenis === 'jurnal') { rows = [['Tanggal','Ref','Keterangan','Akun','Nama akun','Debit','Kredit','Sumber']]; Kk.jurnal(b).forEach(function (j) { j.baris.forEach(function (x) { rows.push([j.tgl, j.ref, j.ket, x.akun, Kk.akun(x.akun).nama, x.debit || 0, x.kredit || 0, j.sumber]); }); }); }
    else if (jenis === 'peristiwa') { rows = [['Tanggal','Pesanan','Jenis','Kanal','Nilai','Klien','Mitra','Jasa','Contoh']]; Kk.peristiwa().filter(function (e) { return String(e.tgl).slice(0, 7) === b; }).forEach(function (e) { rows.push([e.tgl, e.orderNo, e.jenis, e.metode || '', e.nilai, e.klien, e.mitra || '', e.jasa || '', e.contoh ? 'ya' : 'tidak']); }); }
    else if (jenis === 'pajak') { rows = [['Tanggal','Pesanan','DPP PPN (fee platform)','PPN','Upah kotor mitra','PPh 21','Mitra','Contoh']]; Kk.peristiwa().filter(function (e) { return e.jenis === 'tangkap' && String(e.tgl).slice(0, 7) === b; }).forEach(function (e) { var p = Kk.pecah(e.nilai); rows.push([e.tgl, e.orderNo, p.pendapatan, p.ppn, p.upahKotor, p.pph, e.mitra, e.contoh ? 'ya' : 'tidak']); }); }
    else if (jenis === 'invoice') { rows = [['No','Tanggal','Jatuh tempo','Klien','Keterangan','Nilai','Status']]; Kk.invoice().forEach(function (i) { rows.push([i.no, i.tgl, i.jatuhTempo, i.klien, i.ket, i.nilai, i.status]); }); }
    else if (jenis === 'labarugi') { var lr = Kk.labaRugi(b); rows = [['Akun','Nama','Nilai']]; lr.pendapatan.forEach(function (a) { rows.push([a.kode, a.nama, a.saldo]); }); rows.push(['', 'Total pendapatan', lr.totalPendapatan]); lr.beban.forEach(function (a) { rows.push([a.kode, a.nama, -a.saldo]); }); rows.push(['', 'Total beban', -lr.totalBeban], ['', 'Laba bersih', lr.laba]); }
    else { var nr = Kk.neraca(b); rows = [['Akun','Nama','Tipe','Nilai']]; nr.aset.concat(nr.liabilitas, nr.ekuitas).forEach(function (a) { rows.push([a.kode, a.nama, a.tipe, a.saldo]); }); rows.push(['', 'Laba periode', 'ekuitas', nr.labaPeriode]); }
    if (Kk.unduh(nama, Kk.csv(rows))) { A.sekilas('Ekspor ' + nama + ' (' + (rows.length - 1) + ' baris).'); if (window.EXO_PERSETUJUAN) EXO_PERSETUJUAN.audit(siapa(), 'Mengekspor ' + jenis + ' ' + b, null, nama); }
    else A.sekilas('Unduhan diblokir peramban.', 'err');
  };
})(ADMIN);
