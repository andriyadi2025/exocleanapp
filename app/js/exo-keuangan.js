/* ==========================================================================
   exo-keuangan.js — model Accounting & Finance untuk konsol admin EXOCLEAN
   --------------------------------------------------------------------------
   Apa yang dibutuhkan tim accounting & finance marketplace jasa kebersihan,
   dan bagaimana modul ini menjawabnya:

     1. Ringkasan   — GMV, pendapatan platform, dana ditahan (bukan pendapatan),
                      kewajiban upah mitra, saldo dompet pelanggan (liabilitas).
     2. Piutang     — invoice kontrak bulanan (kantor/gedung), umur piutang.
     3. Rekonsiliasi— pesanan vs pembayaran per kanal (dompet, QRIS, VA, kartu);
                      penahanan > 24 jam tanpa penangkapan ditandai.
     4. Payout mitra— upah per job setelah selesai, potongan platform, batch
                      pencairan mingguan/instan lewat persetujuan.
     5. Dompet & dana ditahan — kewajiban ke pelanggan: saldo, hold, kredit
                      jaminan, cashback/poin yang belum ditukar.
     6. Pajak       — PPN keluaran atas jasa platform, PPh 21 dipotong dari
                      upah mitra perorangan (PPh 23 untuk badan), siap e-Faktur.
     7. Jurnal & buku besar — bagan akun, jurnal OTOMATIS dari peristiwa
                      pesanan (tahan/tangkap/lepas/refund/payout), jurnal
                      manual lewat persetujuan, neraca saldo.
     8. Biaya & anggaran — pengeluaran operasional per kategori vs anggaran.
     9. Laporan     — laba rugi, neraca, arus kas; ekspor CSV.
    10. Tutup buku  — periode terkunci; tidak ada jurnal ke bulan yang ditutup.

   Sumber angka: tabel orders EXO_DB (exo.penahanan, langganan, alur) dan
   tabel keuangan (jurnal, invoice, biaya, payout). Bila basis data belum
   punya cukup pesanan tertangkap, deretan CONTOH yang deterministik
   ditambahkan dan SELALU ditandai "contoh" — angka contoh tidak pernah
   bercampur diam-diam dengan angka nyata.

   Aturan akuntansi yang dipegang:
     · Dana yang DITAHAN bukan pendapatan dan bukan kas kita: dicatat sebagai
       komitmen di luar neraca sampai ditangkap.
     · Saat ditangkap: Dr Kas/Piutang gateway (nilai) — Cr Utang upah mitra
       (nilai − fee pelanggan − fee mitra) — Cr Pendapatan platform (kedua fee).
     · Saldo dompet pelanggan adalah LIABILITAS, bukan pendapatan.
     · Refund mengurangi kas dan liabilitas/pendapatan, tidak pernah dihapus.
   ========================================================================== */
var EXO_KEUANGAN = (function () {
  'use strict';
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function D() { return window.EXO_DATA || {}; }
  function hariIni() { return new Date().toISOString().slice(0, 10); }
  function bulanIni() { return hariIni().slice(0, 7); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }

  /* ------------------------------------------------------------ bagan akun */
  var COA = [
    ['1100','Kas & bank','aset'], ['1110','Piutang gateway (settlement)','aset'], ['1200','Piutang usaha (kontrak)','aset'], ['1300','Uang muka & deposit','aset'], ['1500','Persediaan perlengkapan (chemical, habis pakai, APD)','aset'], ['1600','Alat kerja cleaning','aset'], ['1610','Akumulasi penyusutan alat kerja','aset'], ['1400','Deposit agen Darmawisata (PPOB)','aset'],
    ['2100','Utang upah mitra','liabilitas'], ['2200','Saldo dompet pelanggan','liabilitas'], ['2210','Kredit jaminan pelanggan','liabilitas'], ['2220','Cashback & poin belum ditukar','liabilitas'],
    ['2300','PPN keluaran','liabilitas'], ['2310','PPh 21/23 dipotong','liabilitas'], ['2400','Pendapatan diterima di muka (prabayar)','liabilitas'], ['2520','Kredit iklan mitra toko belum terpakai','liabilitas'], ['2500','Dana pembeli marketplace ditahan','liabilitas'], ['2510','Utang ke mitra toko (marketplace)','liabilitas'],
    ['3100','Modal','ekuitas'], ['3200','Laba ditahan','ekuitas'],
    ['4100','Pendapatan fee platform — pelanggan','pendapatan'], ['4110','Pendapatan fee platform — mitra','pendapatan'], ['4200','Pendapatan kontrak B2B','pendapatan'], ['4300','Pendapatan langganan & prabayar','pendapatan'], ['4120','Pendapatan biaya layanan marketplace','pendapatan'], ['4150','Pendapatan iklan marketplace','pendapatan'], ['4130','Pendapatan biaya admin PPOB & isi ulang','pendapatan'], ['4140','Pendapatan biaya layanan perjalanan','pendapatan'],
    ['5100','Beban refund & kompensasi jaminan','beban'], ['5200','Beban voucher & cashback','beban'], ['5300','Beban gateway pembayaran','beban'], ['5400','Beban SMS/OTP & server','beban'],
    ['6100','Gaji & tunjangan kantor','beban'], ['6200','Chemical, alat & APD','beban'], ['6210','Penyusutan alat kerja','beban'], ['6300','Pemasaran','beban'], ['6400','Sewa, utilitas & operasional','beban'], ['6500','Pelatihan & sertifikasi mitra','beban'], ['6900','Beban lain-lain','beban']
  ].map(function (a) { return { kode:a[0], nama:a[1], tipe:a[2], normal:a[0] === '1610' ? 'kredit' : (a[2] === 'aset' || a[2] === 'beban') ? 'debit' : 'kredit' }; });
  function akun(kode) { for (var i = 0; i < COA.length; i++) if (COA[i].kode === kode) return COA[i]; return { kode:kode, nama:kode, tipe:'?', normal:'debit' }; }

  /* ------------------------------------------------------------ pengaturan */
  var BAWAAN = { ppn:11, pph21:2.5, pph23:2, feePelanggan:3000, feeMitra:3000, biayaGatewayPct:0.7, jadwalPayout:'mingguan', hariPayout:'Senin', ambangPayoutTinggi:5000000, ambangJurnalTinggi:10000000,
    anggaran:{ '6100':45000000, '6200':12000000, '6300':20000000, '6400':9000000, '6500':4000000, '5400':2500000, '6900':2000000 }, tutup:[] };
  function pengaturan() { var d = db(); var s = d ? d.setting('keuangan') : null; return Object.assign({}, BAWAAN, s || {}, { anggaran:Object.assign({}, BAWAAN.anggaran, (s && s.anggaran) || {}) }); }
  function simpanPengaturan(patch) { var d = db(); if (!d) return; d.setting('keuangan', Object.assign({}, pengaturan(), patch)); }
  function periodeTertutup(bulan) { return pengaturan().tutup.indexOf(bulan) >= 0; }

  /* ------------------------------------------------------------ peristiwa dari pesanan */
  var CONTOH_CACHE = null;
  function acakDet(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function namaUser(id) { var d = db(); var u = d && id ? d.find('users', id) : null; return u ? u.nama : '—'; }
  /* Peristiwa nyata dari tabel orders: tangkap (dana ditagih), tahan (masih ditahan), lepas (dibatalkan). */
  function peristiwaNyata() {
    var d = db(); if (!d) return [];
    var out = [];
    d.all('orders').forEach(function (o) {
      var x = o.exo || {}, p = x.penahanan, mitra = (o.workerIds || [])[0], tgl = (o.tgl || (o.createdAt || '').slice(0, 10));
      if (p && p.status === 'ditangkap') out.push({ id:'ev_' + o.id + '_c', tgl:(p.ditangkapAt || o.updatedAt || '').slice(0, 10) || tgl, jenis:'tangkap', nilai:p.ditangkap || o.nilai, metode:p.metode || x.bayar, kota:(o.wilayah && (o.wilayah.l2 || o.wilayah.l1)) || '—', jam:Number(String(o.mulai || '09:00').slice(0, 2)), orderNo:o.no, orderId:o.id, mitraId:mitra, mitra:namaUser(mitra), klien:namaUser(o.clientId), jasa:x.jasa, langganan:!!x.langganan, contoh:false });
      else if (p && p.status === 'ditahan') out.push({ id:'ev_' + o.id + '_h', tgl:(p.at || '').slice(0, 10) || tgl, jenis:'tahan', nilai:(p.jumlah || 0) + (p.ekstra || 0), metode:p.metode, orderNo:o.no, orderId:o.id, mitraId:mitra, mitra:namaUser(mitra), klien:namaUser(o.clientId), jasa:x.jasa, at:p.at, contoh:false });
      else if (p && p.status === 'dilepas') out.push({ id:'ev_' + o.id + '_r', tgl:(p.dilepasAt || '').slice(0, 10) || tgl, jenis:'lepas', nilai:p.dilepas || 0, potongan:p.potongan || 0, metode:p.metode, orderNo:o.no, orderId:o.id, mitraId:mitra, mitra:namaUser(mitra), klien:namaUser(o.clientId), jasa:x.jasa, contoh:false });
      else if (o.status === 'selesai' || o.status === 'lunas') out.push({ id:'ev_' + o.id + '_s', tgl:tgl, jenis:'tangkap', nilai:o.nilai || 0, metode:x.bayar || 'wallet', kota:(o.wilayah && (o.wilayah.l2 || o.wilayah.l1)) || '—', jam:Number(String(o.mulai || '09:00').slice(0, 2)), orderNo:o.no, orderId:o.id, mitraId:mitra, mitra:namaUser(mitra), klien:namaUser(o.clientId), jasa:x.jasa, contoh:false });
      if (x.alur === 'kontrak' && (o.status === 'dijadwalkan' || o.status === 'proposal' || o.status === 'ditagih')) out.push({ id:'ev_' + o.id + '_k', tgl:tgl, jenis:'kontrak', nilai:o.nilai || 0, orderNo:o.no, orderId:o.id, klien:namaUser(o.clientId), jasa:x.jasa, status:o.status, contoh:false });
    });
    return out;
  }
  /* Contoh deterministik untuk bulan berjalan supaya laporan bisa dibaca sebelum data nyata cukup. */
  function peristiwaContoh() {
    if (CONTOH_CACHE) return CONTOH_CACHE;
    var jasa = ['hourly','deep','ac','sofa','laundry','iron','car','pool','hydro','pest'], mitra = ['Sari Wulandari','Ayu Indriani','Nurul Fadhilah','Dian Saputri','Rizky A.','Teguh Wibowo'], klien = ['Dewi A.','Rangga P.','Maya S.','Bagus H.','Intan K.','Farah N.','Hendra W.'];
    var metode = ['wallet','wallet','qris','va','card','ewallet'], bulan = bulanIni(), out = [];
    var KOTA = ['Jakarta Selatan','Jakarta Selatan','Kota Tangerang Selatan','Jakarta Barat','Depok','Bekasi','Jakarta Timur','Bogor','Kota Tangerang','Denpasar'];
    for (var i = 0; i < 64; i++) {
      var hari = 1 + Math.floor(acakDet(i + 1) * 27), nilai = 150000 + Math.round(acakDet(i + 7) * 900000 / 1000) * 1000;
      var jenis = acakDet(i + 13) < 0.86 ? 'tangkap' : acakDet(i + 13) < 0.93 ? 'tahan' : 'lepas';
      out.push({ id:'contoh_' + i, tgl:bulan + '-' + ('0' + hari).slice(-2), jenis:jenis, nilai:nilai, metode:metode[i % metode.length], kota:KOTA[Math.floor(acakDet(i + 31) * KOTA.length)], jam:7 + Math.floor(acakDet(i + 37) * 11), orderNo:'EXO-C' + (4400 + i), mitraId:'contoh_m' + (i % 6), mitra:mitra[i % 6], klien:klien[i % 7], jasa:jasa[i % 10], langganan:i % 5 === 0, potongan:jenis === 'lepas' && i % 2 ? 50000 : 0, contoh:true, at:new Date(Date.now() - (i % 3) * 20 * 3600000).toISOString() });
    }
    for (var k = 0; k < 3; k++) out.push({ id:'contoh_k' + k, tgl:bulan + '-01', jenis:'kontrak', nilai:[2280000, 5600000, 3900000][k], orderNo:'EXO-K' + (4451 + k), klien:['PT Karya Mitra','Grand Kemang Apartment','Sekolah Cendekia'][k], jasa:['office','building','office'][k], status:['ditagih','dijadwalkan','lunas'][k], contoh:true });
    CONTOH_CACHE = out; return out;
  }
  function pakaiContoh() { return peristiwaNyata().filter(function (e) { return e.jenis === 'tangkap'; }).length < 5; }
  function peristiwa() { var n = peristiwaNyata(); return pakaiContoh() ? n.concat(peristiwaContoh()) : n; }
  function dalamBulan(e, bulan) { return String(e.tgl || '').slice(0, 7) === bulan; }

  /* ------------------------------------------------------------ pembagian nilai satu job */
  function pecah(nilai, cfg) {
    cfg = cfg || pengaturan();
    var feeP = Math.min(cfg.feePelanggan, nilai), feeM = Math.min(cfg.feeMitra, Math.max(0, nilai - feeP));
    var upah = Math.max(0, nilai - feeP - feeM), pph = Math.round(upah * cfg.pph21 / 100), ppn = Math.round((feeP + feeM) * cfg.ppn / 100);
    return { nilai:nilai, feePelanggan:feeP, feeMitra:feeM, upahKotor:upah, pph:pph, upahBersih:upah - pph, ppn:ppn, pendapatan:feeP + feeM };
  }

  /* ------------------------------------------------------------ jurnal */
  function jurnalOtomatis(bulan) {
    var cfg = pengaturan(), out = [];
    peristiwa().filter(function (e) { return dalamBulan(e, bulan); }).forEach(function (e) {
      if (e.jenis === 'tangkap') {
        var p = pecah(e.nilai, cfg), kas = e.metode === 'wallet' ? '2200' : '1110';   /* dompet: kurangi liabilitas; kanal lain: piutang settlement */
        out.push({ id:'j_' + e.id, tgl:e.tgl, ref:e.orderNo, ket:'Kunjungan selesai · ' + (e.jasa || '') + ' · ' + e.klien + ' → ' + e.mitra, sumber:e.contoh ? 'contoh' : 'otomatis',
          baris:[{ akun:kas, debit:e.nilai, kredit:0 }, { akun:'2100', debit:0, kredit:p.upahBersih }, { akun:'2310', debit:0, kredit:p.pph }, { akun:'4100', debit:0, kredit:p.feePelanggan }, { akun:'4110', debit:0, kredit:p.feeMitra }] });
        if (e.metode !== 'wallet') { var bg = Math.round(e.nilai * cfg.biayaGatewayPct / 100); out.push({ id:'jg_' + e.id, tgl:e.tgl, ref:e.orderNo, ket:'Biaya gateway ' + e.metode, sumber:e.contoh ? 'contoh' : 'otomatis', baris:[{ akun:'5300', debit:bg, kredit:0 }, { akun:'1110', debit:0, kredit:bg }] }); }
      } else if (e.jenis === 'lepas' && e.potongan) {
        out.push({ id:'j_' + e.id, tgl:e.tgl, ref:e.orderNo, ket:'Biaya pembatalan mendadak', sumber:e.contoh ? 'contoh' : 'otomatis', baris:[{ akun:e.metode === 'wallet' ? '2200' : '1110', debit:e.potongan, kredit:0 }, { akun:'4100', debit:0, kredit:e.potongan }] });
      } else if (e.jenis === 'kontrak' && e.status === 'ditagih') {
        out.push({ id:'j_' + e.id, tgl:e.tgl, ref:e.orderNo, ket:'Invoice kontrak bulanan · ' + e.klien, sumber:e.contoh ? 'contoh' : 'otomatis', baris:[{ akun:'1200', debit:e.nilai, kredit:0 }, { akun:'4200', debit:0, kredit:Math.round(e.nilai / (1 + cfg.ppn / 100)) }, { akun:'2300', debit:0, kredit:e.nilai - Math.round(e.nilai / (1 + cfg.ppn / 100)) }] });
      } else if (e.jenis === 'kontrak' && e.status === 'lunas') {
        out.push({ id:'j_' + e.id, tgl:e.tgl, ref:e.orderNo, ket:'Pelunasan invoice kontrak · ' + e.klien, sumber:e.contoh ? 'contoh' : 'otomatis', baris:[{ akun:'1100', debit:e.nilai, kredit:0 }, { akun:'1200', debit:0, kredit:e.nilai }] });
      }
    });
    /* Marketplace perlengkapan (EXO_TOKO): dana pembeli ditahan (2500) saat bayar,
       diakui saat pesanan selesai: biaya layanan 5% → 4120, sisanya utang ke
       toko (2510); refund mengembalikan ke dompet; pencairan menutup 2510. */
    if (window.EXO_TOKO && window.EXO_DB) {
      var contohOk = pakaiContoh(), dlm = function (t) { return String(t || '').slice(0, 7) === bulan; };
      EXO_DB.all('pesananToko').forEach(function (o) {
        if (o.contoh && !contohOk) return; var src = o.contoh ? 'contoh' : 'otomatis', fee = o.biayaLayanan || 0;
        if (dlm(o.at)) out.push({ id:'jt_' + o.id, tgl:String(o.at).slice(0, 10), ref:o.no, ket:'Marketplace · pembayaran ditahan · ' + o.pembeliNama, sumber:src, baris:[{ akun:'2200', debit:o.total, kredit:0 }, { akun:'2500', debit:0, kredit:o.total }] });
        if (o.status === 'selesai' && dlm(o.selesaiAt)) { var keToko = o.total - (o.refund || 0) - fee; out.push({ id:'jts_' + o.id, tgl:String(o.selesaiAt).slice(0, 10), ref:o.no, ket:'Marketplace · pesanan selesai → biaya layanan & utang toko', sumber:src, baris:[{ akun:'2500', debit:o.total, kredit:0 }, { akun:'4120', debit:0, kredit:fee }, { akun:'2510', debit:0, kredit:keToko }].concat(o.refund ? [{ akun:'2200', debit:0, kredit:o.refund }] : []) }); }
        if (o.status === 'dibatalkan' && o.refund && dlm(o.dibatalkanAt || o.selesaiAt)) out.push({ id:'jtb_' + o.id, tgl:String(o.dibatalkanAt || o.selesaiAt).slice(0, 10), ref:o.no, ket:'Marketplace · refund ke dompet pembeli', sumber:src, baris:[{ akun:'2500', debit:o.refund, kredit:0 }, { akun:'2200', debit:0, kredit:o.refund }] });
      });
      EXO_DB.all('penarikanToko').forEach(function (p) { if (p.status === 'dibayar' && dlm(p.putusAt)) out.push({ id:'jtp_' + p.id, tgl:String(p.putusAt).slice(0, 10), ref:'Pencairan toko', ket:'Marketplace · pencairan saldo mitra toko', sumber:'otomatis', baris:[{ akun:'2510', debit:p.jumlah, kredit:0 }, { akun:'1100', debit:0, kredit:p.jumlah }] }); });
      /* Perlengkapan kerja (EXO_PERLENGKAPAN): pemakaian chemical & habis pakai per hari → 6200 ← 1500; penyusutan alat per hari → 6210 ← 1610; PO gudang → 1500 ← 1100. */
      var agrP = {}, agrS = {}; EXO_DB.all('pemakaianStok').forEach(function (x) { if (x.nilai && dlm(x.tgl)) agrP[x.tgl] = (agrP[x.tgl] || 0) + x.nilai; }); EXO_DB.all('penyusutanAlat').forEach(function (x) { if (x.nilai && dlm(x.tgl)) agrS[x.tgl] = (agrS[x.tgl] || 0) + x.nilai; });
      Object.keys(agrP).forEach(function (t) { out.push({ id:'jpk_' + t.replace(/-/g, ''), tgl:t, ref:'Pemakaian perlengkapan', ket:'Perlengkapan · chemical & habis pakai terpakai di lapangan', sumber:'otomatis', baris:[{ akun:'6200', debit:Math.round(agrP[t]), kredit:0 }, { akun:'1500', debit:0, kredit:Math.round(agrP[t]) }] }); });
      Object.keys(agrS).forEach(function (t) { out.push({ id:'jps_' + t.replace(/-/g, ''), tgl:t, ref:'Penyusutan alat', ket:'Perlengkapan · penyusutan alat kerja per job', sumber:'otomatis', baris:[{ akun:'6210', debit:Math.round(agrS[t]), kredit:0 }, { akun:'1610', debit:0, kredit:Math.round(agrS[t]) }] }); });
      EXO_DB.all('po').forEach(function (p) { var total = p.total || (p.baris || []).reduce(function (n, b) { return n + (b.qty || 0) * (b.harga || 0); }, 0); if (!total || !dlm(p.tgl)) return; out.push({ id:'jpo_' + p.id, tgl:p.tgl, ref:'PO gudang', ket:'Perlengkapan · pembelian stok gudang', sumber:'otomatis', baris:[{ akun:'1500', debit:total, kredit:0 }, { akun:'1100', debit:0, kredit:total }] }); });
      /* Iklan toko (EXO_IKLAN): isi saldo → kredit iklan 2520 (dari utang toko 2510 atau kas 1100); biaya klik per hari per toko → pendapatan iklan 4150. */
      EXO_DB.all('iklanTopup').forEach(function (p) { if (p.status !== 'dibayar' || !dlm(p.at) || (p.contoh && !contohOk)) return; out.push({ id:'jia_' + p.id, tgl:String(p.at).slice(0, 10), ref:'Isi saldo iklan', ket:'Iklan toko · isi saldo iklan ' + (p.sumber === 'saldo' ? 'dari saldo toko' : 'via gateway'), sumber:p.contoh ? 'contoh' : 'otomatis', baris:[{ akun:p.sumber === 'saldo' ? '2510' : '1100', debit:p.jumlah, kredit:0 }, { akun:'2520', debit:0, kredit:p.jumlah }] }); });
      var agr = {}; EXO_DB.all('iklanHarian').forEach(function (x) { if (!x.biaya || !dlm(x.tgl)) return; var k = x.tgl + '|' + x.tokoId; agr[k] = (agr[k] || 0) + x.biaya; }); Object.keys(agr).forEach(function (k) { var p = k.split('|'); out.push({ id:'jik_' + k.replace(/[^a-z0-9]/gi, ''), tgl:p[0], ref:'Biaya iklan', ket:'Iklan toko · biaya klik terpakai', sumber:'otomatis', baris:[{ akun:'2520', debit:agr[k], kredit:0 }, { akun:'4150', debit:0, kredit:agr[k] }] }); });
    }
    /* PPOB & isi ulang (EXO_PPOB): pelanggan bayar dari dompet (2200 turun);
       harga penyedia memotong deposit agen (1400); biaya admin/margin → 4130. */
    if (window.EXO_PERJALANAN && window.EXO_DB) {
      EXO_DB.all('perjalananReq').forEach(function (t) { if ((t.status !== 'dibayar' && t.status !== 'terbit') || String(t.dibayarAt || '').slice(0, 7) !== bulan) return; var fee = t.biaya || 0; out.push({ id:'jv_' + t.id, tgl:String(t.dibayarAt).slice(0, 10), ref:t.no, ket:'Perjalanan · ' + t.rumpunNama + ' · ' + t.judul, sumber:'otomatis', baris:[{ akun:'2200', debit:t.total, kredit:0 }, { akun:'1400', debit:0, kredit:t.total - fee }, { akun:'4140', debit:0, kredit:fee }] }); });
    }
    if (window.EXO_PPOB && window.EXO_DB) {
      EXO_DB.all('ppobTx').forEach(function (t) { if (t.keadaan !== 'selesai' || !t.dompetDipotong || String(t.selesaiAt || t.at).slice(0, 7) !== bulan) return; var fee = t.biayaAdmin || 0; out.push({ id:'jp_' + t.id, tgl:String(t.selesaiAt || t.at).slice(0, 10), ref:t.penanda || t.kunci, ket:(t.jenis === 'ppob' ? 'Bayar tagihan ' : 'Isi ulang ') + t.produk + ' · ' + t.nomor, sumber:t.sumber === 'simulasi' ? 'contoh' : 'otomatis', baris:[{ akun:'2200', debit:t.total, kredit:0 }, { akun:'1400', debit:0, kredit:t.total - fee }, { akun:'4130', debit:0, kredit:fee }] }); });
    }
    /* Saldo awal (hanya mode contoh): kas escrow menutup kewajiban dompet,
       jaminan, poin, dan prabayar — tanpa ini mutasi dompet bulan berjalan
       membuat liabilitas 2200 tampak negatif. */
    if (pakaiContoh()) {
      var kw = kewajibanPelanggan(bulan);
      out.unshift({ id:'j_awal_' + bulan, tgl:bulan + '-01', ref:'SALDO-AWAL', ket:'Saldo awal periode (contoh): kas escrow vs kewajiban pelanggan', sumber:'contoh',
        baris:[{ akun:'1100', debit:kw.saldoDompet + kw.kreditJaminan + kw.poinCashback + kw.prabayar, kredit:0 }, { akun:'2200', debit:0, kredit:kw.saldoDompet }, { akun:'2210', debit:0, kredit:kw.kreditJaminan }, { akun:'2220', debit:0, kredit:kw.poinCashback }, { akun:'2400', debit:0, kredit:kw.prabayar }] });
    }
    /* biaya operasional yang sudah disetujui */
    biaya().filter(function (b) { return dalamBulan(b, bulan) && b.status === 'disetujui'; }).forEach(function (b) { out.push({ id:'jb_' + b.id, tgl:b.tgl, ref:b.ref || 'BIAYA', ket:b.ket, sumber:'biaya', baris:[{ akun:b.akun, debit:b.nilai, kredit:0 }, { akun:'1100', debit:0, kredit:b.nilai }] }); });
    /* payout yang sudah diterapkan */
    payoutBatch().filter(function (p) { return dalamBulan(p, bulan); }).forEach(function (p) { out.push({ id:'jp_' + p.id, tgl:p.tgl, ref:p.no, ket:'Pencairan upah mitra · ' + p.jumlahMitra + ' mitra', sumber:'payout', baris:[{ akun:'2100', debit:p.total, kredit:0 }, { akun:'1100', debit:0, kredit:p.total }] }); });
    return out;
  }
  function jurnalManual(bulan) { var d = db(); return d ? d.all('jurnal').filter(function (j) { return !bulan || dalamBulan(j, bulan); }) : []; }
  function jurnal(bulan) { return jurnalOtomatis(bulan).concat(jurnalManual(bulan)).sort(function (a, b) { return (a.tgl || '').localeCompare(b.tgl || ''); }); }
  function seimbang(baris) { var dr = 0, cr = 0; (baris || []).forEach(function (b) { dr += Number(b.debit) || 0; cr += Number(b.kredit) || 0; }); return { debit:dr, kredit:cr, ok:Math.abs(dr - cr) < 1 && dr > 0 }; }
  function bukuBesar(bulan) {
    var saldo = {};
    jurnal(bulan).forEach(function (j) { j.baris.forEach(function (b) { var s = saldo[b.akun] = saldo[b.akun] || { debit:0, kredit:0 }; s.debit += Number(b.debit) || 0; s.kredit += Number(b.kredit) || 0; }); });
    return COA.map(function (a) { var s = saldo[a.kode] || { debit:0, kredit:0 }; var net = a.normal === 'debit' ? s.debit - s.kredit : s.kredit - s.debit; return Object.assign({}, a, s, { saldo:net }); }).filter(function (a) { return a.debit || a.kredit; });
  }
  function labaRugi(bulan) {
    var bb = bukuBesar(bulan), pend = bb.filter(function (a) { return a.tipe === 'pendapatan'; }), beban = bb.filter(function (a) { return a.tipe === 'beban'; });
    var tp = pend.reduce(function (n, a) { return n + a.saldo; }, 0), tb = beban.reduce(function (n, a) { return n + a.saldo; }, 0);
    return { pendapatan:pend, beban:beban, totalPendapatan:tp, totalBeban:tb, laba:tp - tb };
  }
  function neraca(bulan) {
    var bb = bukuBesar(bulan), grup = function (t) { return bb.filter(function (a) { return a.tipe === t; }); }, jml = function (l) { return l.reduce(function (n, a) { return n + a.saldo; }, 0); };
    var lr = labaRugi(bulan), aset = grup('aset'), liab = grup('liabilitas'), ek = grup('ekuitas');
    return { aset:aset, liabilitas:liab, ekuitas:ek, totalAset:jml(aset), totalLiabilitas:jml(liab), totalEkuitas:jml(ek) + lr.laba, labaPeriode:lr.laba };
  }
  function arusKas(bulan) {
    var masuk = 0, keluar = 0, rinci = {};
    jurnal(bulan).forEach(function (j) { j.baris.forEach(function (b) { if (b.akun === '1100' || b.akun === '1110') { var d = Number(b.debit) || 0, k = Number(b.kredit) || 0; masuk += d; keluar += k; var key = j.sumber === 'payout' ? 'Payout mitra' : j.sumber === 'biaya' ? 'Biaya operasional' : /gateway/i.test(j.ket) ? 'Biaya gateway' : /kontrak/i.test(j.ket) ? 'Kontrak B2B' : 'Pesanan'; rinci[key] = (rinci[key] || 0) + d - k; } }); });
    return { masuk:masuk, keluar:keluar, bersih:masuk - keluar, rinci:rinci };
  }

  /* ------------------------------------------------------------ piutang / invoice */
  function invoice() {
    var d = db(), manual = d ? d.all('invoice') : [];
    var auto = peristiwa().filter(function (e) { return e.jenis === 'kontrak'; }).map(function (e) {
      var jatuh = new Date(e.tgl + 'T00:00:00'); jatuh.setDate(jatuh.getDate() + 14);
      return { id:'inv_' + e.id, no:'INV/' + e.tgl.slice(0, 7).replace('-', '/') + '/' + e.orderNo.slice(-4), tgl:e.tgl, jatuhTempo:jatuh.toISOString().slice(0, 10), klien:e.klien, ket:'Kontrak ' + (e.jasa || '') + ' · ' + e.orderNo, nilai:e.nilai, status:e.status === 'lunas' ? 'lunas' : e.status === 'ditagih' ? 'terkirim' : 'draf', contoh:!!e.contoh };
    });
    return auto.concat(manual);
  }
  function umurPiutang() {
    var hari = new Date(hariIni() + 'T00:00:00'), ember = { lancar:0, '1-30':0, '31-60':0, '>60':0 }, total = 0;
    invoice().forEach(function (i) { if (i.status === 'lunas' || i.status === 'draf') return; var telat = Math.floor((hari - new Date(i.jatuhTempo + 'T00:00:00')) / 86400000); var k = telat <= 0 ? 'lancar' : telat <= 30 ? '1-30' : telat <= 60 ? '31-60' : '>60'; ember[k] += i.nilai; total += i.nilai; });
    return { ember:ember, total:total };
  }

  /* ------------------------------------------------------------ rekonsiliasi */
  function rekonsiliasi(bulan) {
    var per = {}, tahanLama = [], now = Date.now();
    peristiwa().filter(function (e) { return dalamBulan(e, bulan); }).forEach(function (e) {
      if (e.jenis === 'tangkap' || e.jenis === 'tahan' || e.jenis === 'lepas') { var m = e.metode || 'wallet'; var s = per[m] = per[m] || { tangkap:0, nTangkap:0, tahan:0, nTahan:0, lepas:0, nLepas:0 }; s[e.jenis] += e.nilai; s['n' + e.jenis.charAt(0).toUpperCase() + e.jenis.slice(1)]++; }
      if (e.jenis === 'tahan' && e.at && now - new Date(e.at).getTime() > 24 * 3600000) tahanLama.push(e);
    });
    return { perMetode:per, tahanLama:tahanLama };
  }

  /* ------------------------------------------------------------ payout mitra */
  function payoutBatch() { var d = db(); return d ? d.all('payout') : []; }
  function jobSudahDibayar() { var s = {}; payoutBatch().forEach(function (p) { (p.eventIds || []).forEach(function (id) { s[id] = true; }); }); return s; }
  function payoutTerhutang() {
    var cfg = pengaturan(), dibayar = jobSudahDibayar(), per = {};
    peristiwa().filter(function (e) { return e.jenis === 'tangkap' && !dibayar[e.id]; }).forEach(function (e) {
      var p = pecah(e.nilai, cfg), k = e.mitraId || e.mitra; var s = per[k] = per[k] || { mitraId:e.mitraId, mitra:e.mitra, jobs:0, kotor:0, pph:0, bersih:0, eventIds:[], contoh:!!e.contoh };
      s.jobs++; s.kotor += p.upahKotor; s.pph += p.pph; s.bersih += p.upahBersih; s.eventIds.push(e.id);
    });
    return Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.bersih - a.bersih; });
  }
  function buatPayout(daftar, oleh, catatan) {
    var d = db(), total = 0, ids = [], pph = 0; daftar.forEach(function (m) { total += m.bersih; pph += m.pph; ids = ids.concat(m.eventIds); });
    var n = (payoutBatch().length + 1);
    return d.insert('payout', { no:'PAY/' + bulanIni().replace('-', '/') + '/' + ('00' + n).slice(-3), tgl:hariIni(), total:total, pph:pph, jumlahMitra:daftar.length, eventIds:ids, rincian:daftar.map(function (m) { return { mitra:m.mitra, jobs:m.jobs, bersih:m.bersih, pph:m.pph }; }), oleh:oleh.nama, catatan:catatan || '' });
  }

  /* ------------------------------------------------------------ dompet & dana ditahan (liabilitas ke pelanggan) */
  function kewajibanPelanggan(bulan) {
    var ev = peristiwa(), tahan = ev.filter(function (e) { return e.jenis === 'tahan'; });
    var contoh = pakaiContoh();
    return { danaDitahan:tahan.reduce(function (n, e) { return n + e.nilai; }, 0), nTahan:tahan.length, saldoDompet:contoh ? 184300000 : 0, kreditJaminan:contoh ? 6200000 : 0, poinCashback:contoh ? 3850000 : 0, prabayar:contoh ? 42000000 : 0, contoh:contoh };
  }

  /* ------------------------------------------------------------ pajak */
  function pajak(bulan) {
    var cfg = pengaturan(), ppnKeluaran = 0, dppPpn = 0, pph21 = 0, dppPph = 0, ppnKontrak = 0;
    peristiwa().filter(function (e) { return dalamBulan(e, bulan); }).forEach(function (e) {
      if (e.jenis === 'tangkap') { var p = pecah(e.nilai, cfg); dppPpn += p.pendapatan; ppnKeluaran += p.ppn; dppPph += p.upahKotor; pph21 += p.pph; }
      if (e.jenis === 'kontrak' && e.status !== 'draf') { var dpp = Math.round(e.nilai / (1 + cfg.ppn / 100)); ppnKontrak += e.nilai - dpp; }
    });
    return { ppnKeluaran:ppnKeluaran, dppPpn:dppPpn, ppnKontrak:ppnKontrak, pph21:pph21, dppPph:dppPph, tarif:{ ppn:cfg.ppn, pph21:cfg.pph21, pph23:cfg.pph23 }, jatuhTempo:{ ppn:'akhir bulan berikutnya (SPT Masa PPN)', pph:'tanggal 10 bulan berikutnya (setor), 20 (lapor)' } };
  }

  /* ------------------------------------------------------------ biaya & anggaran */
  function biaya() { var d = db(); return d ? d.all('biaya') : []; }
  function anggaranVsRealisasi(bulan) {
    var cfg = pengaturan(), real = {};
    biaya().filter(function (b) { return dalamBulan(b, bulan) && b.status === 'disetujui'; }).forEach(function (b) { real[b.akun] = (real[b.akun] || 0) + b.nilai; });
    return Object.keys(cfg.anggaran).map(function (k) { return { akun:k, nama:akun(k).nama, anggaran:cfg.anggaran[k], realisasi:real[k] || 0, pct:cfg.anggaran[k] ? Math.round((real[k] || 0) / cfg.anggaran[k] * 100) : 0 }; });
  }

  /* ------------------------------------------------------------ ringkasan */
  function ringkasan(bulan) {
    var cfg = pengaturan(), ev = peristiwa().filter(function (e) { return dalamBulan(e, bulan); }), gmv = 0, pend = 0, upah = 0, n = 0, langganan = 0, refund = 0;
    ev.forEach(function (e) { if (e.jenis === 'tangkap') { var p = pecah(e.nilai, cfg); gmv += e.nilai; pend += p.pendapatan; upah += p.upahBersih; n++; if (e.langganan) langganan++; } if (e.jenis === 'lepas') refund += e.nilai; });
    var kontrak = ev.filter(function (e) { return e.jenis === 'kontrak'; }).reduce(function (s, e) { return s + e.nilai; }, 0);
    var terhutang = payoutTerhutang().reduce(function (s, m) { return s + m.bersih; }, 0);
    return { gmv:gmv, pendapatanPlatform:pend, upahMitra:upah, jobs:n, langganan:langganan, refund:refund, kontrak:kontrak, payoutTerhutang:terhutang, kewajiban:kewajibanPelanggan(bulan), lr:labaRugi(bulan), kas:arusKas(bulan), contoh:pakaiContoh() };
  }

  /* ------------------------------------------------------------ CSV */
  function csv(baris) { return baris.map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';'); }).join('\r\n'); }
  function unduh(nama, teks) {
    try { var b = new Blob(['﻿' + teks], { type:'text/csv;charset=utf-8' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 500); return true; } catch (e) { return false; }
  }

  return { COA:COA, akun:akun, rp:rp, bulanIni:bulanIni, hariIni:hariIni, pengaturan:pengaturan, simpanPengaturan:simpanPengaturan, periodeTertutup:periodeTertutup, peristiwa:peristiwa, pakaiContoh:pakaiContoh, pecah:pecah,
    jurnal:jurnal, jurnalOtomatis:jurnalOtomatis, jurnalManual:jurnalManual, seimbang:seimbang, bukuBesar:bukuBesar, labaRugi:labaRugi, neraca:neraca, arusKas:arusKas,
    invoice:invoice, umurPiutang:umurPiutang, rekonsiliasi:rekonsiliasi, payoutBatch:payoutBatch, payoutTerhutang:payoutTerhutang, buatPayout:buatPayout, kewajibanPelanggan:kewajibanPelanggan, pajak:pajak, biaya:biaya, anggaranVsRealisasi:anggaranVsRealisasi, ringkasan:ringkasan, csv:csv, unduh:unduh };
})();
