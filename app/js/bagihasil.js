/* ==========================================================================
   bagihasil.js — bagi hasil pekerjaan dengan Mitra EXOCLEAN
   --------------------------------------------------------------------------
   Sesuai janji pada Syarat & Ketentuan Mitra butir 1: pembayaran dihitung
   PER PEKERJAAN yang selesai DAN lulus verifikasi mutu. Jadi order hanya
   masuk hitungan setelah statusnya 'diverifikasi'.

   Rumus per order, per mitra:

       dasar        = nilai order × porsi mitra (%)          ← porsi per layanan
       porsi saya   = dasar × (bobot saya ÷ total bobot tim) ← leader sedikit lebih besar
       tunjangan    = transport + (makan bila durasi ≥ 6 jam)
       bonus mutu   = porsi saya × bonus% (bila rata QC ≥ ambang)
       ────────────────────────────────────────────────────────
       pendapatan   = porsi saya + tunjangan + bonus mutu

   Angka ditampilkan hidup (estimasi) selama periode berjalan, lalu
   DIBEKUKAN saat admin membuat pencairan — supaya perubahan pengaturan di
   kemudian hari tidak mengubah slip yang sudah terbit.
   ========================================================================== */
var BAGI = (function () {

  /* ================================================================ PENGATURAN */
  var BAWAAN = {
    porsiDefault: 40,        /* % nilai order untuk tim mitra, bila layanan tak punya porsi sendiri */
    bobotLeader: 1.15,       /* petugas pertama pada order dianggap leader */
    transportPerOrder: 25000,
    makanPerOrder: 25000,
    makanMinJam: 6,          /* tunjangan makan bila durasi jadwal ≥ jam ini */
    bonusMutuPersen: 5,      /* % tambahan dari porsi bila mutu bagus */
    bonusMutuAmbang: 4.5,    /* rata-rata nilai QC minimum untuk dapat bonus */
    hariBayar: 5             /* pencairan ditransfer ± hari setelah periode tutup */
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.bagiHasil) { s.bagiHasil = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    return s.bagiHasil;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /** Porsi mitra untuk sebuah order: rata-rata porsi layanan yang dikerjakan. */
  function porsiOrder(o) {
    var c = config();
    var ids = (o.serviceIds || []);
    if (!ids.length) return c.porsiDefault;
    var total = 0, n = 0;
    ids.forEach(function (id) {
      var sv = BIZ.svc(id);
      total += (sv && typeof sv.porsiMitra === 'number') ? sv.porsiMitra : c.porsiDefault;
      n++;
    });
    return n ? Math.round(total / n * 10) / 10 : c.porsiDefault;
  }

  /** Durasi jadwal order dalam jam (dari jam mulai & selesai). */
  function jamOrder(o) {
    if (!o.mulai || !o.selesai) return 0;
    var a = o.mulai.split(':'), b = o.selesai.split(':');
    var m = (+b[0] * 60 + +b[1]) - (+a[0] * 60 + +a[1]);
    if (m < 0) m += 24 * 60;                /* pekerjaan melewati tengah malam */
    return Math.round(m / 60 * 10) / 10;
  }

  /* ================================================================ HITUNGAN */
  /**
   * Rincian bagi hasil satu order untuk satu mitra.
   * Mengembalikan null bila order belum layak dibayar.
   */
  function hitungOrder(orderId, mitraId) {
    var o = BIZ.order(orderId);
    if (!o) return null;
    if (o.status !== 'diverifikasi') return null;                  /* wajib lulus QC */
    var tim = (o.workerIds || []);
    if (tim.indexOf(mitraId) < 0) return null;

    var c = config();
    var porsi = porsiOrder(o);
    var dasar = Math.round((o.nilai || 0) * porsi / 100);

    /* bobot: petugas pertama = leader */
    var bobot = tim.map(function (id, i) { return i === 0 ? c.bobotLeader : 1; });
    var totalBobot = U.sum(bobot);
    var iSaya = tim.indexOf(mitraId);
    var porsiSaya = totalBobot ? Math.round(dasar * bobot[iSaya] / totalBobot) : 0;

    var jam = jamOrder(o);
    var transport = c.transportPerOrder;
    var makan = jam >= c.makanMinJam ? c.makanPerOrder : 0;

    var qc = BIZ.qcOrder(orderId);
    var rataQc = qc ? BIZ.rataQC(qc) : null;
    var dapatBonus = rataQc !== null && rataQc >= c.bonusMutuAmbang;
    var bonus = dapatBonus ? Math.round(porsiSaya * c.bonusMutuPersen / 100) : 0;

    return {
      orderId: orderId, no: o.no, judul: o.judul, tgl: o.tgl, klien: BIZ.klien(o.clientId),
      nilaiOrder: o.nilai || 0, porsiPersen: porsi, dasar: dasar,
      leader: iSaya === 0, anggotaTim: tim.length, bobot: bobot[iSaya], totalBobot: totalBobot,
      porsiSaya: porsiSaya, jam: jam, transport: transport, makan: makan,
      rataQc: rataQc, dapatBonus: dapatBonus, bonusPersen: c.bonusMutuPersen, bonus: bonus,
      total: porsiSaya + transport + makan + bonus
    };
  }

  /* ================================================================ PERIODE */
  /** Periode pencairan setengah bulanan: P1 = tgl 1–15, P2 = tgl 16–akhir. */
  function periodeDari(tgl) {
    var d = U.d(tgl);
    var th = d.getFullYear(), bl = d.getMonth(), hr = d.getDate();
    var p2 = hr > 15;
    var akhirBulan = new Date(th, bl + 1, 0).getDate();
    var dari = new Date(th, bl, p2 ? 16 : 1);
    var sampai = new Date(th, bl, p2 ? akhirBulan : 15);
    return {
      kode: U.iso(dari).slice(0, 7) + (p2 ? '-P2' : '-P1'),
      dari: U.iso(dari), sampai: U.iso(sampai),
      label: dari.getDate() + '–' + sampai.getDate() + ' ' + U.BULAN_S[bl] + ' ' + th,
      jatuhBayar: U.iso(U.addDays(sampai, config().hariBayar))
    };
  }
  function periodeSekarang() { return periodeDari(new Date()); }
  function periodeSebelumnya(kode) {
    var p = kode ? periodeDariKode(kode) : periodeSekarang();
    return periodeDari(U.addDays(p.dari, -1));
  }
  function periodeDariKode(kode) {
    var m = /^(\d{4})-(\d{2})-(P1|P2)$/.exec(kode || '');
    if (!m) return periodeSekarang();
    var th = +m[1], bl = +m[2] - 1;
    return periodeDari(U.iso(new Date(th, bl, m[3] === 'P2' ? 16 : 1)));
  }
  /** Beberapa periode terakhir, terbaru lebih dulu. */
  function daftarPeriode(n) {
    var out = [], p = periodeSekarang();
    for (var i = 0; i < (n || 6); i++) { out.push(p); p = periodeDari(U.addDays(p.dari, -1)); }
    return out;
  }

  /* ================================================================ ESTIMASI */
  /** Semua order yang layak dibayar untuk satu mitra pada satu periode. */
  function barisPeriode(mitraId, periode) {
    var p = periode || periodeSekarang();
    return BIZ.ordersUntuk(BIZ.user(mitraId))
      .filter(function (o) { return o.status === 'diverifikasi' && o.tgl >= p.dari && o.tgl <= p.sampai; })
      .map(function (o) { return hitungOrder(o.id, mitraId); })
      .filter(Boolean)
      .sort(function (a, b) { return a.tgl < b.tgl ? -1 : 1; });
  }

  /** Ringkasan estimasi satu mitra pada satu periode (belum dibekukan). */
  function estimasi(mitraId, periode) {
    var baris = barisPeriode(mitraId, periode);
    return {
      periode: periode || periodeSekarang(), baris: baris,
      jumlahOrder: baris.length,
      nilaiPekerjaan: U.sum(baris, function (b) { return b.nilaiOrder; }),
      porsi: U.sum(baris, function (b) { return b.porsiSaya; }),
      tunjangan: U.sum(baris, function (b) { return b.transport + b.makan; }),
      bonus: U.sum(baris, function (b) { return b.bonus; }),
      total: U.sum(baris, function (b) { return b.total; })
    };
  }

  /** Total yang pernah diterima mitra (pencairan berstatus dibayar). */
  function totalDibayar(mitraId) {
    return U.sum(DB.where('payouts', function (x) {
      return x.mitraId === mitraId && x.status === 'dibayar'; }), function (x) { return x.total; });
  }
  function menungguBayar(mitraId) {
    return U.sum(DB.where('payouts', function (x) {
      return x.mitraId === mitraId && x.status !== 'dibayar' && x.status !== 'dibatalkan';
    }), function (x) { return x.total; });
  }
  function payoutMitra(mitraId) {
    return U.sortBy(DB.where('payouts', { mitraId: mitraId }), function (x) { return x.periodeKode; }, true);
  }
  function payoutPeriode(kode) { return DB.where('payouts', { periodeKode: kode }); }
  function payoutAda(mitraId, kode) {
    return DB.where('payouts', function (x) {
      return x.mitraId === mitraId && x.periodeKode === kode; })[0] || null;
  }

  /* ================================================================ PENCAIRAN */
  /**
   * Bekukan estimasi menjadi slip pencairan. Rincian ikut disimpan supaya
   * perubahan pengaturan di kemudian hari tidak mengubah slip yang terbit.
   */
  function buatPayout(mitraId, periode, adminId) {
    var p = periode || periodeSekarang();
    var ada = payoutAda(mitraId, p.kode);
    if (ada) return ada;
    var e = estimasi(mitraId, p);
    if (!e.baris.length) return null;

    var u = BIZ.user(mitraId);
    var rek = BIZ.rekeningUtama(u);
    var c = config();

    var pay = DB.insert('payouts', {
      no: U.docNo('BGH', DB.nextNo('payout')),
      mitraId: mitraId, periodeKode: p.kode, periodeLabel: p.label,
      dari: p.dari, sampai: p.sampai, jatuhBayar: p.jatuhBayar,
      baris: e.baris, penyesuaian: [],
      porsi: e.porsi, tunjangan: e.tunjangan, bonus: e.bonus,
      subtotal: e.total, totalPenyesuaian: 0, total: e.total,
      /* pengaturan & rekening disalin sebagai bukti dasar perhitungan */
      skema: JSON.parse(JSON.stringify(c)),
      rekening: rek ? { bank: rek.bank, nomor: rek.nomor, atasNama: rek.atasNama } : null,
      status: 'draf', dibuatOleh: adminId || 'u_admin',
      disetujuiAt: null, dibayarAt: null, refTransfer: null, catatan: ''
    });
    DB.log(adminId || 'u_admin', 'Membuat pencairan ' + pay.no + ' untuk ' + BIZ.nama(mitraId), 'payout', pay.id);
    return pay;
  }

  /** Buat pencairan untuk seluruh mitra yang punya pendapatan pada periode itu. */
  function buatPayoutMassal(periode, adminId) {
    var p = periode || periodeSekarang();
    var hasil = [];
    BIZ.mitraAktif().forEach(function (u) {
      if (payoutAda(u.id, p.kode)) return;
      var pay = buatPayout(u.id, p, adminId);
      if (pay) hasil.push(pay);
    });
    return hasil;
  }

  function hitungUlangTotal(payoutId) {
    var x = DB.find('payouts', payoutId);
    var tp = U.sum(x.penyesuaian || [], function (a) { return a.jumlah; });
    DB.update('payouts', payoutId, { totalPenyesuaian: tp, total: x.subtotal + tp });
    return DB.find('payouts', payoutId);
  }

  /** Penyesuaian manual (mis. ganti biaya transport tambahan, potongan alat hilang). */
  function tambahPenyesuaian(payoutId, keterangan, jumlah, adminId) {
    var x = DB.find('payouts', payoutId);
    var list = (x.penyesuaian || []).concat([{ id: U.uid('adj'), keterangan: keterangan,
      jumlah: jumlah, olehId: adminId, at: U.nowISO() }]);
    DB.update('payouts', payoutId, { penyesuaian: list });
    DB.log(adminId, 'Penyesuaian ' + U.rp(jumlah) + ' pada ' + x.no + ' — ' + keterangan, 'payout', payoutId);
    return hitungUlangTotal(payoutId);
  }
  function hapusPenyesuaian(payoutId, adjId) {
    var x = DB.find('payouts', payoutId);
    DB.update('payouts', payoutId, { penyesuaian: (x.penyesuaian || []).filter(function (a) {
      return a.id !== adjId; }) });
    return hitungUlangTotal(payoutId);
  }

  /**
   * Menyetujui slip = dana masuk ke saldo dompet mitra saat itu juga.
   * Sejak ada dompet, admin tidak lagi mentransfer per slip — mitra sendiri
   * yang menentukan kapan menariknya (lihat dompet.js).
   */
  function setujui(payoutId, adminId) {
    var x = DB.find('payouts', payoutId);
    DB.update('payouts', payoutId, { status: 'disetujui', disetujuiAt: U.nowISO(), disetujuiOleh: adminId });
    if (window.DOMPET) DOMPET.masukkanPayout(DB.find('payouts', payoutId));
    else WA.enqueue('bagihasil_slip', x.mitraId, { payoutId: payoutId }, { tipe: 'payout', id: payoutId });
    DB.log(adminId, 'Menyetujui pencairan ' + x.no + ' — masuk saldo mitra', 'payout', payoutId);
    return DB.find('payouts', payoutId);
  }

  function tandaiDibayar(payoutId, ref, adminId) {
    var x = DB.find('payouts', payoutId);
    DB.update('payouts', payoutId, { status: 'dibayar', dibayarAt: U.nowISO(),
      refTransfer: ref || '', dibayarOleh: adminId });
    WA.enqueue('bagihasil_dibayar', x.mitraId, { payoutId: payoutId }, { tipe: 'payout', id: payoutId });
    DB.log(adminId, 'Menandai ' + x.no + ' sudah dibayar (' + (ref || '-') + ')', 'payout', payoutId);
    return DB.find('payouts', payoutId);
  }

  function batalkan(payoutId, adminId, alasan) {
    var x = DB.find('payouts', payoutId);
    DB.update('payouts', payoutId, { status: 'dibatalkan', catatan: alasan || '' });
    DB.log(adminId, 'Membatalkan pencairan ' + x.no, 'payout', payoutId);
    return DB.find('payouts', payoutId);
  }

  /* ================================================================ SISI PERUSAHAAN */
  /**
   * Margin perusahaan pada satu periode: pendapatan jasa dikurangi bagi hasil.
   * Biaya chemical, alat, dan overhead tidak dihitung di sini.
   */
  function marginPeriode(dari, sampai) {
    var orders = DB.all('orders').filter(function (o) {
      return o.status === 'diverifikasi' && o.tgl >= dari && o.tgl <= sampai; });
    var bruto = U.sum(orders, function (o) { return o.nilai || 0; });
    var kePartner = U.sum(orders, function (o) {
      return U.sum((o.workerIds || []).map(function (w) {
        var h = hitungOrder(o.id, w); return h ? h.total : 0; }));
    });
    return { orders: orders.length, bruto: bruto, kePartner: kePartner,
      margin: bruto - kePartner, marginPersen: bruto ? Math.round((bruto - kePartner) / bruto * 100) : 0 };
  }

  function statistik() {
    var p = periodeSekarang();
    var aktif = BIZ.mitraAktif();
    var estimasiPeriode = U.sum(aktif, function (u) { return estimasi(u.id, p).total; });
    var semua = DB.all('payouts');
    return {
      periode: p,
      mitraBerpendapatan: aktif.filter(function (u) { return estimasi(u.id, p).total > 0; }).length,
      estimasiPeriode: estimasiPeriode,
      draf: semua.filter(function (x) { return x.status === 'draf'; }),
      disetujui: semua.filter(function (x) { return x.status === 'disetujui'; }),
      totalDibayarSemua: U.sum(semua.filter(function (x) { return x.status === 'dibayar'; }),
        function (x) { return x.total; }),
      perluDibayar: U.sum(semua.filter(function (x) { return x.status === 'disetujui'; }),
        function (x) { return x.total; }),
      marginBulanIni: marginPeriode(U.iso(new Date()).slice(0, 8) + '01', U.today())
    };
  }

  var STATUS = {
    draf: { t: 'Draf', c: 'muted' },
    disetujui: { t: 'Masuk saldo mitra', c: 'ok' },
    dibayar: { t: 'Sudah dibayar', c: 'ok' },
    dibatalkan: { t: 'Dibatalkan', c: 'danger' }
  };
  function chipStatus(s) {
    var m = STATUS[s] || STATUS.draf;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    porsiOrder: porsiOrder, jamOrder: jamOrder, hitungOrder: hitungOrder,
    periodeDari: periodeDari, periodeSekarang: periodeSekarang, periodeSebelumnya: periodeSebelumnya,
    periodeDariKode: periodeDariKode, daftarPeriode: daftarPeriode,
    barisPeriode: barisPeriode, estimasi: estimasi,
    totalDibayar: totalDibayar, menungguBayar: menungguBayar,
    payoutMitra: payoutMitra, payoutPeriode: payoutPeriode, payoutAda: payoutAda,
    buatPayout: buatPayout, buatPayoutMassal: buatPayoutMassal,
    tambahPenyesuaian: tambahPenyesuaian, hapusPenyesuaian: hapusPenyesuaian,
    setujui: setujui, tandaiDibayar: tandaiDibayar, batalkan: batalkan,
    marginPeriode: marginPeriode, statistik: statistik, STATUS: STATUS, chipStatus: chipStatus
  };
})();
