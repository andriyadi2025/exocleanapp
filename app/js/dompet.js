/* ==========================================================================
   dompet.js — saldo mitra & penarikan dana
   --------------------------------------------------------------------------
   Alur uangnya:

     pekerjaan lulus QC → slip bagi hasil → admin menyetujui
        → dana MASUK SALDO mitra (mutasi kredit)
        → mitra menarik sendiri kapan saja (mutasi debit + antrean penarikan)
        → admin mentransfer & menandai selesai

   Yang berubah dari sebelumnya: admin tidak lagi mentransfer per slip.
   Slip yang disetujui langsung menjadi saldo, dan mitra yang memutuskan
   kapan mau mencairkan. Itu sebabnya penarikan butuh PIN — ini satu-satunya
   titik di aplikasi tempat uang berpindah atas perintah mitra sendiri.

   ATURAN BUKU BESAR
     • Saldo tidak pernah disimpan sebagai angka; selalu jumlah seluruh mutasi.
       Tidak ada satu pun tempat yang bisa "mengarang" saldo.
     • Dana ditahan sejak penarikan diajukan (didebit di muka), lalu
       dikembalikan utuh bila penarikan dibatalkan atau ditolak. Dengan begitu
       saldo yang tampil selalu = dana yang benar-benar bisa dipakai.
   ========================================================================== */
var DOMPET = (function () {

  var BAWAAN = {
    minTarik: 50000,          /* penarikan terkecil */
    biayaAdmin: 2500,         /* biaya transfer, dipotong dari nominal */
    maksPerHari: 3,           /* pengajuan per mitra per hari */
    tahanJam: 0,              /* dana bagi hasil langsung bisa ditarik */
    jamLayanan: '08.00 – 15.00 WIB, Senin–Jumat',
    estimasiJam: 24
  };

  function config() {
    return Object.assign({}, BAWAAN, (DB.raw.settings || {}).dompet || {});
  }
  function simpanConfig(patch) {
    DB.raw.settings = DB.raw.settings || {};
    DB.raw.settings.dompet = Object.assign({}, config(), patch);
    DB.save(true); DB.emit();
    return config();
  }

  /* ================================================================ BUKU BESAR */
  var JENIS = {
    bagihasil:  { t: 'Bagi hasil pekerjaan', ic: '🧹', arah: 1 },
    bonus:      { t: 'Bonus & insentif',     ic: '🎁', arah: 1 },
    /* Tip berdiri sendiri, tidak dilebur ke 'bonus': petugas berhak tahu
       mana uang yang datang dari klien yang puas dan mana dari program
       insentif perusahaan — keduanya dinilai berbeda oleh mereka. */
    tip:        { t: 'Tip dari klien',       ic: '💝', arah: 1 },
    penyesuaian:{ t: 'Penyesuaian saldo',    ic: '⚖️', arah: 0 },
    tarik:      { t: 'Penarikan saldo',      ic: '🏦', arah: -1 },
    biaya:      { t: 'Biaya transfer',       ic: '🧾', arah: -1 },
    batal:      { t: 'Pengembalian dana',    ic: '↩️', arah: 1 }
  };

  function mutasi(userId) {
    return U.sortBy(DB.where('mutasi', { userId: userId }),
      function (m) { return m.at; }, true);
  }

  /** Saldo = jumlah seluruh mutasi. Sengaja dihitung, bukan disimpan. */
  function saldo(userId) {
    return U.sum(DB.where('mutasi', { userId: userId }), function (m) { return m.jumlah; });
  }

  function tulis(userId, jumlah, jenis, ket, ref) {
    return DB.insert('mutasi', {
      userId: userId, jumlah: jumlah, jenis: jenis, ket: ket || '',
      refType: ref && ref.tipe || null, refId: ref && ref.id || null,
      saldoSetelah: saldo(userId) + jumlah, at: U.nowISO()
    });
  }

  function kredit(userId, jumlah, jenis, ket, ref) {
    return tulis(userId, Math.abs(jumlah), jenis, ket, ref);
  }
  function debit(userId, jumlah, jenis, ket, ref) {
    return tulis(userId, -Math.abs(jumlah), jenis, ket, ref);
  }

  /** Apakah satu slip bagi hasil sudah pernah masuk saldo. */
  function sudahMasuk(payoutId) {
    return DB.where('mutasi', function (m) {
      return m.refType === 'payout' && m.refId === payoutId; }).length > 0;
  }

  /** Dipanggil BAGI.setujui — slip yang disetujui langsung jadi saldo mitra. */
  function masukkanPayout(payout) {
    if (!payout || sudahMasuk(payout.id)) return null;
    var m = kredit(payout.mitraId, payout.total, 'bagihasil',
      'Slip ' + payout.no + ' • ' + payout.periodeLabel, { tipe: 'payout', id: payout.id });
    /* Bahasa PENERIMA, bukan bahasa orang yang menekan tombol setujui.
       Sebelumnya dua potongan di tengah kalimat dibungkus I18N.t() dan
       sisanya tidak, sehingga admin berantarmuka Inggris mengirim pesan
       yang separuhnya Inggris dan separuhnya Indonesia — lebih buruk
       daripada kalau seluruhnya dibiarkan satu bahasa. */
    var w = I18N.pesanUntuk(payout.mitraId);
    DB.insert('waOutbox', {
      to: payout.mitraId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'payout', refId: payout.id,
      pesan: '*' + w('SALDO MASUK') + '* 💰\n\n' +
        w('{v} dari slip {no} ({periode}) sudah masuk ke Dompet EXOCLEAN Anda.')
          .replace('{v}', U.rp(payout.total))
          .replace('{no}', payout.no)
          .replace('{periode}', payout.periodeLabel) + '\n\n' +
        w('Saldo sekarang:') + ' ' + U.rp(saldo(payout.mitraId)) + '\n\n' +
        w('Tarik kapan saja lewat menu *Dompet* di aplikasi. Butuh PIN transaksi Anda.')
    });
    return m;
  }

  /* ================================================================ PENARIKAN */
  var STATUS = {
    diajukan: { t: 'Menunggu diproses', c: 'warn' },
    diproses: { t: 'Sedang ditransfer', c: 'info' },
    selesai:  { t: 'Dana terkirim',     c: 'ok' },
    ditolak:  { t: 'Ditolak',           c: 'danger' },
    batal:    { t: 'Dibatalkan',        c: 'muted' }
  };
  function chip(s) {
    var m = STATUS[s] || STATUS.diajukan;
    return '<span class="chip chip--' + m.c + ' chip--dot">' + I18N.t(m.t) + '</span>';
  }

  function penarikan(userId) {
    return U.sortBy(DB.where('penarikan', { userId: userId }),
      function (x) { return x.createdAt; }, true);
  }
  function antrean() {
    return U.sortBy(DB.where('penarikan', function (x) {
      return ['diajukan', 'diproses'].indexOf(x.status) >= 0; }),
      function (x) { return x.createdAt; });
  }
  function tertahan(userId) {
    return U.sum(DB.where('penarikan', function (x) {
      return x.userId === userId && ['diajukan', 'diproses'].indexOf(x.status) >= 0; }),
      function (x) { return x.jumlah; });
  }
  /**
   * Cap harian dihitung memakai TANGGAL LOKAL, bukan potongan string ISO.
   * `createdAt` disimpan dalam UTC, sehingga memotong 10 karakter pertamanya
   * akan menggeser hari selama pukul 00.00–07.00 WIB dan diam-diam mengulang
   * jatah penarikan. U.iso() menerjemahkannya ke tanggal setempat dulu.
   */
  function jumlahHariIni(userId) {
    var hari = U.today();
    return DB.where('penarikan', function (x) {
      return x.userId === userId && U.iso(x.createdAt) === hari && x.status !== 'batal'; }).length;
  }

  /**
   * Periksa semua syarat penarikan TANPA menjalankannya — dipakai untuk
   * menyalakan/mematikan tombol dan menjelaskan alasannya di layar.
   */
  function periksaSyarat(u, jumlah) {
    var c = config();
    if (!u) return I18N.t('Pengguna tidak ditemukan');
    if (!KEAMANAN.punyaPin(u)) return I18N.t('Buat PIN transaksi dulu di Profil → Keamanan');
    if (!(u.rekening || []).length) return I18N.t('Tambahkan rekening bank dulu di Profil → Rekening Bank');
    if (saldo(u.id) < c.minTarik) return I18N.t('Saldo minimal') + ' ' + U.rp(c.minTarik) + ' ' + I18N.t('untuk bisa menarik');
    if (jumlahHariIni(u.id) >= c.maksPerHari) {
      return 'Batas ' + c.maksPerHari + ' ' + I18N.t('pengajuan per hari sudah tercapai. Coba lagi besok.');
    }
    if (jumlah !== undefined && jumlah !== null) {
      if (!(jumlah > 0)) return I18N.t('Nominal tidak valid');
      if (jumlah < c.minTarik) {
        return I18N.t('Nominal minimal {v}').replace('{v}', U.rp(c.minTarik));
      }
      if (jumlah > saldo(u.id)) {
        /* Frasa UTUH dengan penampung, bukan tiga potongan yang disambung.
           Kalimat rakitan tidak bisa diterjemahkan: urutan kata dan letak
           tanda kurungnya berbeda di tiap bahasa. */
        return I18N.t('Nominal melebihi saldo Anda ({v}).')
          .replace('{v}', U.rp(saldo(u.id)));
      }
      if (jumlah <= c.biayaAdmin) return I18N.t('Nominal harus di atas biaya transfer') + ' ' + U.rp(c.biayaAdmin);
    }
    return null;
  }

  function diterima(jumlah) { return Math.max(0, jumlah - config().biayaAdmin); }

  /**
   * Ajukan penarikan. PIN diperiksa DI SINI, bukan hanya di tampilan, supaya
   * tidak ada jalan memanggil fungsi ini tanpa membuktikan kepemilikan akun.
   */
  function ajukan(userId, jumlah, rekeningIndex, pin) {
    var u = DB.find('users', userId);
    var c = config();
    jumlah = Math.round(Number(jumlah) || 0);

    var salah = periksaSyarat(u, jumlah);
    if (salah) return { error: salah };

    var rek = (u.rekening || [])[rekeningIndex || 0];
    if (!rek) return { error: I18N.t('Rekening tujuan tidak ditemukan') };

    var cek = KEAMANAN.periksaPin(userId, pin);
    if (!cek.ok) return cek;

    /* Penerjemah terikat PEMILIK saldo — pesan konfirmasi penarikan
       ditujukan kepadanya, bukan kepada siapa pun yang sedang membuka
       aplikasi. */
    var w = I18N.pesanUntuk(userId);

    var no = U.docNo('TRK', DB.nextNo('tarik'));
    var x = DB.insert('penarikan', {
      no: no, userId: userId, jumlah: jumlah,
      biaya: c.biayaAdmin, diterima: diterima(jumlah),
      /* rekening dibekukan pada dokumen: mengubah rekening nanti tidak boleh
         mengubah tujuan transfer yang sudah terlanjur diajukan */
      rekening: { bank: rek.bank, nomor: rek.nomor, atasNama: rek.atasNama },
      status: 'diajukan', ref: '', catatan: '',
      diprosesAt: null, selesaiAt: null, olehId: null
    });

    debit(userId, jumlah, 'tarik', 'Penarikan ' + no + ' → ' + rek.bank + ' ' + rek.nomor,
      { tipe: 'penarikan', id: x.id });

    KEAMANAN.catat(userId, 'Mengajukan penarikan ' + no, 'ok', U.rp(jumlah));
    DB.log(userId, 'Mengajukan penarikan saldo ' + no + ' (' + U.rp(jumlah) + ')', 'penarikan', x.id);

    /* konfirmasi ke mitra + antrean kerja untuk admin keuangan */
    DB.insert('waOutbox', {
      to: userId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'penarikan', refId: x.id,
      pesan: '*' + w('PENARIKAN DIAJUKAN') + '* 🏦\n\n' +
        w('No.') + ' ' + no + '\n' +
        w('Nominal:') + ' ' + U.rp(jumlah) + '\n' +
        w('Biaya transfer:') + ' ' + U.rp(c.biayaAdmin) + '\n' +
        w('Diterima:') + ' *' + U.rp(diterima(jumlah)) + '*\n' +
        w('Tujuan:') + ' ' + rek.bank + ' ' + rek.nomor + ' a.n. ' + rek.atasNama + '\n\n' +
        w('Diproses pada jam layanan {jam} (perkiraan {n} jam kerja).')
          .replace('{jam}', c.jamLayanan).replace('{n}', c.estimasiJam) + '\n' +
        w('Sisa saldo Anda:') + ' ' + U.rp(saldo(userId))
    });
    var adm = DB.all('users').filter(function (a) {
      return a.role === 'admin' && a.aktif && AKSES.boleh('keuangan.bagihasil.setujui', a); })[0]
      || BIZ.usersByRole('admin')[0];
    if (adm) {
      DB.insert('waOutbox', {
        to: adm.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'penarikan', refId: x.id,
        /* Penerimanya ADMIN, jadi bahasanya bahasa admin — bukan bahasa
           mitra yang mengajukan. Dua pesan pada fungsi yang sama bisa
           berbeda bahasa, dan itu memang benar. */
        pesan: (function () {
          var w = I18N.pesanUntuk(adm.id);
          return '*' + w('PENARIKAN MITRA') + '* 🏦\n\n' +
            w('{nama} mengajukan {v}').replace('{nama}', u.nama)
              .replace('{v}', U.rp(jumlah)) + '\n' +
            w('No.') + ' ' + no + '\n' +
            w('Tujuan:') + ' ' + rek.bank + ' ' + rek.nomor + ' a.n. ' + rek.atasNama + '\n\n' +
            w('Proses di menu Penarikan Mitra.');
        })()
      });
    }
    return { ok: true, penarikan: x };
  }

  /** Dibatalkan mitra sendiri, hanya selama belum diproses admin. */
  function batalkan(id, userId) {
    var x = DB.find('penarikan', id);
    if (!x) return { error: I18N.t('Penarikan tidak ditemukan') };
    if (x.userId !== userId) return { error: I18N.t('Bukan penarikan milik Anda') };
    if (x.status !== 'diajukan') {
      return { error: I18N.t('Penarikan sudah') + ' ' + (STATUS[x.status] || {}).t + ' ' + I18N.t('dan tidak bisa dibatalkan.') };
    }
    DB.update('penarikan', id, { status: 'batal', selesaiAt: U.nowISO() });
    kredit(userId, x.jumlah, 'batal', 'Pembatalan penarikan ' + x.no, { tipe: 'penarikan', id: id });
    KEAMANAN.catat(userId, 'Membatalkan penarikan ' + x.no, 'ok', U.rp(x.jumlah));
    return { ok: true };
  }

  function proses(id, adminId) {
    var x = DB.find('penarikan', id);
    if (!x || x.status !== 'diajukan') return { error: I18N.t('Penarikan tidak dalam status diajukan') };
    DB.update('penarikan', id, { status: 'diproses', diprosesAt: U.nowISO(), olehId: adminId });
    DB.log(adminId, 'Memproses penarikan ' + x.no, 'penarikan', id);
    return { ok: true };
  }

  function selesaikan(id, ref, adminId) {
    var x = DB.find('penarikan', id);
    if (!x || ['diajukan', 'diproses'].indexOf(x.status) < 0) {
      return { error: I18N.t('Penarikan sudah selesai atau dibatalkan') };
    }
    DB.update('penarikan', id, { status: 'selesai', ref: ref || '', selesaiAt: U.nowISO(),
      olehId: adminId });
    /* biaya transfer baru dibukukan setelah dana benar-benar dikirim */
    debit(x.userId, x.biaya, 'biaya', 'Biaya transfer ' + x.no, { tipe: 'penarikan', id: id });
    DB.insert('waOutbox', {
      to: x.userId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'penarikan', refId: id,
      pesan: (function () {
        var w = I18N.pesanUntuk(x.userId);
        return '*' + w('DANA TERKIRIM') + '* ✅\n\n' +
          w('Penarikan {no} sebesar {v} sudah ditransfer ke {bank} {rek}.')
            .replace('{no}', x.no).replace('{v}', U.rp(x.diterima))
            .replace('{bank}', x.rekening.bank).replace('{rek}', x.rekening.nomor) + '\n' +
          w('No. referensi:') + ' ' + (ref || '-') + '\n\n' +
          w('Terima kasih sudah bekerja bersama EXOCLEAN.') + ' 🙏';
      })()
    });
    DB.log(adminId, 'Menyelesaikan penarikan ' + x.no + ' (' + (ref || '-') + ')', 'penarikan', id);
    return { ok: true };
  }

  function tolak(id, alasan, adminId) {
    var x = DB.find('penarikan', id);
    if (!x || ['diajukan', 'diproses'].indexOf(x.status) < 0) {
      return { error: I18N.t('Penarikan sudah selesai atau dibatalkan') };
    }
    DB.update('penarikan', id, { status: 'ditolak', catatan: alasan || '',
      selesaiAt: U.nowISO(), olehId: adminId });
    kredit(x.userId, x.jumlah, 'batal', 'Pengembalian ' + x.no + ' — ditolak',
      { tipe: 'penarikan', id: id });
    DB.insert('waOutbox', {
      to: x.userId, template: 'manual', status: 'antre', sentAt: null,
      refType: 'penarikan', refId: id,
      pesan: (function () {
        var w = I18N.pesanUntuk(x.userId);
        return '*' + w('PENARIKAN DITOLAK') + '* ⚠️\n\n' +
          w('Penarikan {no} ({v}) tidak dapat diproses.')
            .replace('{no}', x.no).replace('{v}', U.rp(x.jumlah)) + '\n\n' +
          w('Alasan:') + ' ' + (alasan || '-') + '\n\n' +
          w('Dana sudah dikembalikan penuh ke saldo Anda. Saldo sekarang: {v}')
            .replace('{v}', U.rp(saldo(x.userId)));
      })()
    });
    DB.log(adminId, 'Menolak penarikan ' + x.no, 'penarikan', id);
    return { ok: true };
  }

  /* ================================================================ RINGKASAN */
  function ringkasBulan(userId, bulanISO) {
    var pre = U.iso(bulanISO || new Date()).slice(0, 7);
    var m = DB.where('mutasi', function (x) {
      return x.userId === userId && U.iso(x.at).slice(0, 7) === pre; });
    return {
      masuk: U.sum(m.filter(function (x) { return x.jumlah > 0; }), function (x) { return x.jumlah; }),
      keluar: Math.abs(U.sum(m.filter(function (x) { return x.jumlah < 0; }),
        function (x) { return x.jumlah; }))
    };
  }

  function statistik() {
    var q = antrean();
    var mitra = DB.all('users').filter(function (u) { return u.role === 'worker'; });
    return {
      antre: q.length,
      nilaiAntre: U.sum(q, function (x) { return x.jumlah; }),
      diajukan: q.filter(function (x) { return x.status === 'diajukan'; }).length,
      diproses: q.filter(function (x) { return x.status === 'diproses'; }).length,
      totalSaldo: U.sum(mitra, function (u) { return saldo(u.id); }),
      mitraBersaldo: mitra.filter(function (u) { return saldo(u.id) > 0; }).length,
      dikirimBulanIni: U.sum(DB.where('penarikan', function (x) {
        return x.status === 'selesai' && U.iso(x.selesaiAt).slice(0, 7) === U.today().slice(0, 7);
      }), function (x) { return x.diterima; })
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    JENIS: JENIS, STATUS: STATUS, chip: chip,
    saldo: saldo, mutasi: mutasi, kredit: kredit, debit: debit,
    masukkanPayout: masukkanPayout, sudahMasuk: sudahMasuk,
    penarikan: penarikan, antrean: antrean, tertahan: tertahan,
    jumlahHariIni: jumlahHariIni, periksaSyarat: periksaSyarat, diterima: diterima,
    ajukan: ajukan, batalkan: batalkan, proses: proses, selesaikan: selesaikan, tolak: tolak,
    ringkasBulan: ringkasBulan, statistik: statistik
  };
})();
