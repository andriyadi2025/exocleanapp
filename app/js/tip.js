/* ==========================================================================
   tip.js — tip dari klien untuk tenaga kerja lapangan
   --------------------------------------------------------------------------
   Klien yang puas bisa menambahkan tip setelah pekerjaan selesai. Tip masuk
   ke DOMPET petugas dan bisa ditarik bersama saldo bagi hasil.

   TIGA ATURAN YANG MENJAGA UANGNYA
   --------------------------------
   1. SALDO TIDAK BERTAMBAH SEBELUM KLIEN MEMBAYAR.
      Menuliskan tip ke dompet begitu tombol ditekan berarti EXOCLEAN
      membayari tip itu lebih dulu dari kasnya sendiri — dan bila klien
      akhirnya tidak jadi membayar, uangnya sudah telanjur ditarik petugas.
      Karena itu tip punya status: menunggu → lunas, dan hanya perpindahan
      ke "lunas" yang menyentuh dompet.

   2. TIP UTUH SAMPAI KE PETUGAS.
      EXOCLEAN tidak mengambil potongan apa pun dari tip. Biaya gateway
      ditanggung sesuai pengaturan pembayaran yang sudah ada — entah oleh
      klien (ditambahkan di atas nominal tip) atau oleh EXOCLEAN. Yang tidak
      pernah terjadi: petugas menerima kurang dari yang diniatkan klien.

   3. PEMBAGIAN TIDAK MENCIPTAKAN ATAU MENGHILANGKAN RUPIAH.
      Rp10.000 untuk 3 orang tidak habis dibagi. Pembulatan ke bawah membuang
      Rp1, pembulatan ke atas menciptakan Rp2 yang tidak pernah dibayar
      siapa pun. Sisanya dibagikan satu-satu ke penerima pertama sehingga
      jumlah seluruh bagian SELALU sama persis dengan tipnya.
   ========================================================================== */
var TIP = (function () {

  /* Batas bawah menghindari tip yang biaya gatewaynya lebih besar daripada
     tipnya sendiri. Batas atas adalah rem terhadap salah ketik nol. */
  var BATAS = { min: 5000, maks: 2000000 };
  var CEPAT = [10000, 20000, 50000, 100000];

  var STATUS = {
    menunggu: { t: 'Menunggu Pembayaran', c: 'warn' },
    lunas:    { t: 'Sudah Masuk Dompet', c: 'ok' },
    batal:    { t: 'Dibatalkan', c: 'muted' }
  };

  function chip(s) {
    var x = STATUS[s] || { t: s, c: 'muted' };
    return '<span class="chip chip--' + x.c + '">' + U.esc(x.t) + '</span>';
  }

  /* ================================================================ PENERIMA */

  /**
   * Petugas yang berhak menerima tip dari sebuah pekerjaan.
   *
   * Supervisor TIDAK ikut secara otomatis: yang datang mengerjakan adalah
   * petugas lapangan, dan klien memberi tip atas pekerjaan yang mereka lihat.
   * Bila supervisor ikut turun tangan, admin bisa menambahkannya sebagai
   * anggota tim pada order tersebut.
   */
  function penerima(orderId) {
    var o = BIZ.order(orderId);
    if (!o) return [];
    return (o.workerIds || []).map(function (id) { return DB.find('users', id); })
      .filter(function (u) { return u && u.aktif !== false; });
  }

  /** Boleh diberi tip hanya setelah pekerjaannya benar-benar selesai. */
  function boleh(orderId, clientId) {
    var o = BIZ.order(orderId);
    if (!o) return { ok: false, pesan: I18N.t('Pekerjaan tidak ditemukan.') };
    if (o.clientId !== clientId) return { ok: false, pesan: I18N.t('Ini bukan pekerjaan Anda.') };
    if (['selesai', 'diverifikasi'].indexOf(o.status) < 0) {
      return { ok: false, pesan: I18N.t('Tip bisa diberikan setelah pekerjaannya selesai.') };
    }
    if (!penerima(orderId).length) {
      return { ok: false, pesan: I18N.t('Belum ada petugas yang tercatat pada pekerjaan ini.') };
    }
    return { ok: true };
  }

  /* ================================================================ PEMBAGIAN */

  /**
   * Bagi rata sebuah nominal ke sejumlah penerima tanpa kehilangan rupiah.
   * Sisa pembagian diberikan satu-satu ke penerima paling awal.
   */
  function bagiRata(jumlah, n) {
    if (n <= 0) return [];
    var dasar = Math.floor(jumlah / n);
    var sisa = jumlah - dasar * n;
    var hasil = [];
    for (var i = 0; i < n; i++) hasil.push(dasar + (i < sisa ? 1 : 0));
    return hasil;
  }

  /** Pratinjau pembagian sebelum tip dibuat — dipakai layar konfirmasi. */
  function pratinjau(jumlah, penerimaIds, channelId) {
    var n = (penerimaIds || []).length;
    var bagian = bagiRata(jumlah, n);
    var r = PAY.rincian(channelId || 'qris', jumlah);
    return {
      tip: jumlah,
      biaya: r.biaya,
      dibebankan: r.dibebankan,
      dibayarKlien: r.totalBayar,
      /* Diterima petugas SELALU sebesar tipnya, apa pun siapa yang menanggung
         biaya gateway. Tip yang menyusut di tengah jalan bukan tip. */
      diterimaTotal: jumlah,
      bagian: (penerimaIds || []).map(function (id, i) {
        var u = DB.find('users', id);
        return { userId: id, nama: u ? u.nama : '—', jumlah: bagian[i] };
      })
    };
  }

  /* ================================================================ BUAT */

  function buat(orderId, clientId, jumlah, penerimaIds, pesan, channelId) {
    var izin = boleh(orderId, clientId);
    if (!izin.ok) throw new Error(izin.pesan);

    jumlah = Math.round(Number(jumlah) || 0);
    if (jumlah < BATAS.min) {
      throw new Error('Tip minimal ' + U.rp(BATAS.min) + '.');
    }
    if (jumlah > BATAS.maks) {
      throw new Error('Tip maksimal ' + U.rp(BATAS.maks) + '. Untuk nominal lebih besar, ' +
        'hubungi admin agar tercatat sebagai bonus resmi.');
    }

    var sah = penerima(orderId).map(function (u) { return u.id; });
    var pilih = (penerimaIds && penerimaIds.length ? penerimaIds : sah)
      .filter(function (id) { return sah.indexOf(id) >= 0; });
    if (!pilih.length) throw new Error(I18N.t('Pilih minimal satu petugas penerima tip.'));

    var r = PAY.rincian(channelId || 'qris', jumlah);
    var bagian = bagiRata(jumlah, pilih.length);

    var t = DB.insert('tips', {
      no: 'TIP-' + String(DB.nextNo('tip')).padStart(4, '0'),
      orderId: orderId, clientId: clientId,
      jumlah: jumlah, biaya: r.biaya, dibebankan: r.dibebankan,
      dibayarKlien: r.totalBayar,
      channelId: channelId || 'qris',
      pesan: String(pesan || '').slice(0, 200),
      /* Bagian DIBEKUKAN saat tip dibuat. Susunan tim sebuah pekerjaan bisa
         berubah setelahnya, dan yang berhak atas tip ini adalah orang yang
         mengerjakannya — bukan siapa pun yang kebetulan ada di tim nanti. */
      bagian: pilih.map(function (id, i) { return { userId: id, jumlah: bagian[i] }; }),
      status: 'menunggu', lunasAt: null, at: U.nowISO()
    });

    DB.log(clientId, 'Memberi tip ' + U.rp(jumlah) + ' untuk ' + pilih.length + ' petugas',
      'order', orderId);
    return t;
  }

  /* ================================================================ PELUNASAN */

  /** Apakah tip ini sudah pernah masuk dompet. */
  function sudahMasuk(tipId) {
    return DB.where('mutasi', function (m) {
      return m.refType === 'tip' && m.refId === tipId; }).length > 0;
  }

  /**
   * Tandai tip sudah dibayar dan masukkan ke dompet penerimanya.
   *
   * Dijaga agar hanya bisa terjadi SEKALI. Tanpa penjagaan itu, satu tombol
   * yang tertekan dua kali karena jaringan lambat akan membayar tipnya dua
   * kali — dan uang yang salah masuk ke dompet jauh lebih sulit ditarik
   * kembali daripada dicegah.
   */
  function lunasi(tipId, catatan) {
    var t = DB.find('tips', tipId);
    if (!t) throw new Error(I18N.t('Tip tidak ditemukan'));
    if (t.status === 'lunas' || sudahMasuk(tipId)) {
      throw new Error(I18N.t('Tip ini sudah masuk dompet sebelumnya.'));
    }
    if (t.status === 'batal') throw new Error(I18N.t('Tip ini sudah dibatalkan.'));

    var klien = BIZ.user(t.clientId);
    var o = BIZ.order(t.orderId);
    (t.bagian || []).forEach(function (b) {
      if (!b.jumlah) return;
      DOMPET.kredit(b.userId, b.jumlah, 'tip',
        I18N.t('Tip dari') + ' ' + (klien ? klien.nama : 'klien') + (o ? ' — ' + o.no : ''),
        { tipe: 'tip', id: tipId });
    });

    DB.update('tips', tipId, { status: 'lunas', lunasAt: U.nowISO(),
      catatan: catatan || '' });

    (t.bagian || []).forEach(function (b) {
      if (window.WA) {
        WA.enqueue('tip_diterima', b.userId,
          { tipId: tipId, jumlah: b.jumlah }, { tipe: 'tip', id: tipId });
      }
    });
    DB.log(t.clientId, 'Tip ' + t.no + ' masuk dompet petugas', 'order', t.orderId);
    return DB.find('tips', tipId);
  }

  function batalkan(tipId, alasan) {
    var t = DB.find('tips', tipId);
    if (!t) throw new Error(I18N.t('Tip tidak ditemukan'));
    if (t.status === 'lunas') {
      throw new Error(I18N.t('Tip yang sudah masuk dompet tidak bisa dibatalkan —') + ' ' +
        I18N.t('buat penyesuaian saldo bila memang perlu dikoreksi.'));
    }
    DB.update('tips', tipId, { status: 'batal', catatan: alasan || '' });
    return DB.find('tips', tipId);
  }

  /* ================================================================ BACA */

  function tipOrder(orderId) { return DB.where('tips', { orderId: orderId }); }

  /** Seluruh tip yang pernah diterima seorang petugas. */
  function untukPetugas(userId) {
    return DB.where('tips', function (t) {
      return t.status === 'lunas' &&
        (t.bagian || []).some(function (b) { return b.userId === userId; });
    }).map(function (t) {
      var b = (t.bagian || []).filter(function (x) { return x.userId === userId; })[0];
      return { tip: t, jumlah: b ? b.jumlah : 0 };
    });
  }

  function totalPetugas(userId) {
    return U.sum(untukPetugas(userId), function (x) { return x.jumlah; });
  }

  function statistik() {
    var all = DB.all('tips');
    var lunas = all.filter(function (t) { return t.status === 'lunas'; });
    return {
      total: all.length,
      lunas: lunas.length,
      menunggu: all.filter(function (t) { return t.status === 'menunggu'; }).length,
      nilai: U.sum(lunas, function (t) { return t.jumlah; }),
      rata: lunas.length ? Math.round(U.sum(lunas, function (t) { return t.jumlah; }) / lunas.length) : 0
    };
  }

  return {
    BATAS: BATAS, CEPAT: CEPAT, STATUS: STATUS, chip: chip,
    penerima: penerima, boleh: boleh, bagiRata: bagiRata, pratinjau: pratinjau,
    buat: buat, lunasi: lunasi, batalkan: batalkan, sudahMasuk: sudahMasuk,
    tipOrder: tipOrder, untukPetugas: untukPetugas, totalPetugas: totalPetugas,
    statistik: statistik
  };
})();
