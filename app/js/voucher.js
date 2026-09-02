/* ==========================================================================
   voucher.js — voucher EXOCLEAN
   --------------------------------------------------------------------------
   Empat jenis, dan bedanya bukan sekadar label — tiap jenis punya cara pakai,
   cara nilai, dan risiko keuangan yang berbeda:

     nilai      — kartu hadiah. Memotong tagihan sebesar rupiah tertera.
                  Uangnya sudah masuk saat dibeli, jadi ia UTANG, bukan promo.
     diskon     — potongan persentase dengan batas atas. Tanpa batas atas,
                  satu transaksi besar bisa menghabiskan margin berbulan-bulan.
     undian     — tiket, bukan alat bayar. Tidak pernah memotong tagihan;
                  nilainya baru ada bila menang, dan itu ditentukan pengundian.
     pelatihan  — membuka satu kursus/sertifikasi di LMS tanpa biaya.

   DUA JALAN MASUK
     Dibeli dengan uang, atau ditukar dengan poin. Keduanya menerbitkan voucher
     yang sama persis; yang membedakan hanya `asal`, supaya laporan bisa
     memisahkan voucher yang sudah dibayar dari yang menjadi beban promosi.

   KODE ADALAH KUNCI
     Voucher hadiah berpindah tangan lewat kodenya. Karena itu kode dibuat acak
     dan panjang, bukan berurutan. Kode berurutan berarti siapa pun yang punya
     satu voucher bisa menebak voucher orang lain.
   ========================================================================== */
var VOUCHER = (function () {

  var JENIS = {
    nilai: { nama: 'Bernilai uang', ic: '💳',
      ket: 'Memotong tagihan sebesar nilai rupiah tertera, seperti kartu hadiah.' },
    diskon: { nama: 'Diskon persentase', ic: '🏷️',
      ket: 'Memotong sekian persen dari tagihan, dibatasi nilai maksimum.' },
    undian: { nama: 'Tiket undian', ic: '🎰',
      ket: 'Bukan alat bayar. Mengikutkan pemilik pada pengundian berhadiah.' },
    pelatihan: { nama: 'Gratis pelatihan / sertifikasi', ic: '🎓',
      ket: 'Membuka satu kursus di LMS beserta ujian sertifikasinya tanpa biaya.' }
  };

  var LINGKUP = {
    semua: 'Jasa & Toko',
    jasa: 'Layanan kebersihan saja',
    toko: 'Belanja produk saja'
  };

  var STATUS = {
    aktif:       { t: 'Aktif', c: 'ok' },
    terpakai:    { t: 'Sudah dipakai', c: 'muted' },
    kedaluwarsa: { t: 'Kedaluwarsa', c: 'danger' },
    menang:      { t: 'Menang undian', c: 'brand' },
    kalah:       { t: 'Tidak menang', c: 'muted' },
    dibatalkan:  { t: 'Dibatalkan', c: 'danger' }
  };

  /* ================================================================ KODE */
  var HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* tanpa I, O, 0, 1 */

  /**
   * Kode acak, dikelompokkan berempat supaya bisa dibacakan lewat telepon
   * tanpa salah. Huruf yang mudah tertukar sengaja dibuang: pemilik voucher
   * tidak boleh gagal menukarkannya hanya karena membaca O sebagai angka nol.
   */
  function buatKode() {
    var s = '';
    for (var i = 0; i < 12; i++) s += HURUF.charAt(Math.floor(Math.random() * HURUF.length));
    return 'EXV-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
  }

  function kodeUnik() {
    for (var i = 0; i < 30; i++) {
      var k = buatKode();
      if (!DB.where('voucher', { kode: k }).length) return k;
    }
    /* Praktis tidak akan terjadi; kalau toh terjadi, lebih baik gagal berisik
       daripada menerbitkan dua voucher berkode sama. */
    throw new Error(I18N.t('Gagal membuat kode voucher yang unik. Coba lagi.'));
  }

  /* ================================================================ PRODUK */
  function produk(id) { return DB.find('voucherProduk', id); }
  function semuaProduk() { return U.sortBy(DB.all('voucherProduk'), function (p) { return p.urutan || 0; }); }
  function produkAktif() { return semuaProduk().filter(function (p) { return p.aktif !== false; }); }

  function bisaDibeli() {
    return produkAktif().filter(function (p) { return p.hargaJual > 0 && sisaKuota(p) !== 0; });
  }
  function bisaDitukarPoin() {
    return produkAktif().filter(function (p) { return p.hargaPoin > 0 && sisaKuota(p) !== 0; });
  }

  /** Sisa kuota; null berarti tak terbatas. */
  function sisaKuota(p) {
    if (!p || !p.kuota) return null;
    var terbit = DB.where('voucher', function (v) {
      return v.produkId === p.id && v.status !== 'dibatalkan'; }).length;
    return Math.max(0, p.kuota - terbit);
  }

  function simpanProduk(data, id) {
    var bersih = {
      nama: String(data.nama || '').trim(),
      jenis: JENIS[data.jenis] ? data.jenis : 'nilai',
      ic: data.ic || (JENIS[data.jenis] || {}).ic || '🎟️',
      deskripsi: data.deskripsi || '',
      lingkup: LINGKUP[data.lingkup] ? data.lingkup : 'semua',
      nilai: Math.max(0, Number(data.nilai) || 0),
      persen: Math.min(100, Math.max(0, Number(data.persen) || 0)),
      maks: Math.max(0, Number(data.maks) || 0),
      kursusId: data.kursusId || null,
      hadiah: data.hadiah || '',
      nilaiHadiah: Math.max(0, Number(data.nilaiHadiah) || 0),
      hargaJual: Math.max(0, Number(data.hargaJual) || 0),
      hargaPoin: Math.max(0, Number(data.hargaPoin) || 0),
      minBelanja: Math.max(0, Number(data.minBelanja) || 0),
      masaBerlakuHari: Math.max(1, Number(data.masaBerlakuHari) || 90),
      kuota: Math.max(0, Number(data.kuota) || 0),
      bolehHadiah: data.bolehHadiah !== false,
      aktif: data.aktif !== false
    };
    if (id) return DB.update('voucherProduk', id, bersih);
    bersih.urutan = DB.all('voucherProduk').length;
    return DB.insert('voucherProduk', bersih);
  }

  /**
   * Periksa kewarasan sebuah produk voucher sebelum disimpan. Dipisahkan
   * supaya halaman admin dan pengisian data contoh memakai pemeriksaan yang
   * sama persis.
   */
  function periksaProduk(d) {
    if (!String(d.nama || '').trim()) return I18N.t('Nama voucher wajib diisi.');
    if (d.jenis === 'nilai' && !(Number(d.nilai) > 0)) {
      return I18N.t('Voucher bernilai uang harus punya nilai rupiah.');
    }
    if (d.jenis === 'diskon') {
      if (!(Number(d.persen) > 0)) return I18N.t('Voucher diskon harus punya persentase.');
      if (!(Number(d.maks) > 0)) {
        return I18N.t('Diskon persentase wajib punya batas maksimum. Tanpa batas, satu') + ' ' +
          I18N.t('transaksi besar bisa menghabiskan margin berbulan-bulan.');
      }
    }
    if (d.jenis === 'pelatihan' && !d.kursusId) {
      return I18N.t('Pilih kursus yang akan dibuka voucher ini.');
    }
    if (d.jenis === 'undian' && !String(d.hadiah || '').trim()) {
      return I18N.t('Sebutkan hadiah undiannya supaya pembeli tahu apa yang diperebutkan.');
    }
    if (!(Number(d.hargaJual) > 0) && !(Number(d.hargaPoin) > 0)) {
      return I18N.t('Isi harga jual, harga poin, atau keduanya — kalau kosong, voucher ini') + ' ' +
        I18N.t('tidak akan pernah bisa didapat siapa pun.');
    }
    return null;
  }

  /* ================================================================ TERBIT */
  /**
   * Terbitkan satu voucher.
   * opsi = { asal, pemilikId, dariId, pesan, penerimaNama, penerimaKontak,
   *          hadiah, hargaBayar, poinDipakai }
   *
   * Voucher hadiah yang penerimanya belum punya akun tetap diterbitkan tanpa
   * pemilik — ia melekat pada KODEnya, dan siapa pun yang memegang kode itu
   * bisa mengklaimnya. Itulah cara kartu hadiah bekerja di dunia nyata.
   */
  function terbitkan(produkId, opsi) {
    opsi = opsi || {};
    var p = produk(produkId);
    if (!p) throw new Error(I18N.t('Produk voucher tidak ditemukan.'));
    if (p.aktif === false) throw new Error(I18N.t('Voucher ini sedang tidak tersedia.'));
    if (sisaKuota(p) === 0) {
      /* Frasa utuh: kalimat yang disambung dari tiga potongan tidak bisa
         diterjemahkan — tanda kutipnya sendiri berbeda di tiap bahasa. */
      throw new Error(I18N.t('Kuota voucher “{v}” sudah habis.')
        .replace('{v}', p.nama));
    }
    if (opsi.hadiah && p.bolehHadiah === false) {
      throw new Error(I18N.t('Voucher ini tidak boleh dihadiahkan.'));
    }

    var v = DB.insert('voucher', {
      kode: kodeUnik(), produkId: p.id, jenis: p.jenis, nama: p.nama, ic: p.ic,
      /* Ketentuan DIBEKUKAN saat terbit — persis seperti poin dan tarif kurir.
         Admin boleh mengubah katalog kapan saja; voucher yang sudah di tangan
         orang tetap berlaku menurut janji yang mereka terima. */
      ketentuan: {
        nilai: p.nilai, persen: p.persen, maks: p.maks, lingkup: p.lingkup,
        minBelanja: p.minBelanja, kursusId: p.kursusId,
        hadiah: p.hadiah, nilaiHadiah: p.nilaiHadiah
      },
      pemilikId: opsi.pemilikId || null,
      dariId: opsi.dariId || null,
      pesan: opsi.pesan || '',
      penerimaNama: opsi.penerimaNama || '',
      penerimaKontak: opsi.penerimaKontak || '',
      untukHadiah: !!opsi.hadiah,
      asal: opsi.asal || 'admin',
      hargaBayar: opsi.hargaBayar || 0,
      poinDipakai: opsi.poinDipakai || 0,
      status: 'aktif',
      berlakuHingga: U.addDays(new Date(), p.masaBerlakuHari).toISOString(),
      diklaimPada: null, dipakaiPada: null, refType: null, refId: null,
      undianId: null, hasilUndian: null
    });

    DB.log(opsi.dariId || opsi.pemilikId || 'u_admin', 'voucher.terbit', 'voucher', v.id,
      p.nama + ' — ' + v.kode + ' (' + v.asal + ')');
    return v;
  }

  /* ================================================================ KLAIM */
  function cariKode(kode) {
    var k = String(kode || '').toUpperCase().replace(/\s+/g, '');
    return DB.where('voucher', function (v) { return v.kode === k; })[0] || null;
  }

  function klaim(kode, userId) {
    var v = cariKode(kode);
    if (!v) throw new Error(I18N.t('Kode voucher tidak dikenali. Periksa kembali penulisannya.'));
    if (v.berlakuHingga && v.berlakuHingga < U.nowISO() && v.status === 'aktif') {
      DB.update('voucher', v.id, { status: 'kedaluwarsa' });
      throw new Error(I18N.t('Voucher ini sudah melewati masa berlakunya.'));
    }
    if (v.status !== 'aktif') {
      throw new Error(I18N.t('Voucher ini sudah tidak berlaku —') + ' ' + (STATUS[v.status] || {}).t + '.');
    }
    if (v.pemilikId === userId) throw new Error(I18N.t('Voucher ini sudah ada di akun Anda.'));
    if (v.pemilikId) throw new Error(I18N.t('Voucher ini sudah dimiliki orang lain.'));

    DB.update('voucher', v.id, { pemilikId: userId, diklaimPada: U.nowISO() });
    DB.log(userId, 'voucher.klaim', 'voucher', v.id, v.kode);
    return DB.find('voucher', v.id);
  }

  /* ================================================================ MILIK */
  function milik(userId) {
    return U.sortBy(DB.where('voucher', { pemilikId: userId }),
      function (v) { return v.createdAt; }, true);
  }

  function aktifMilik(userId) {
    var kini = U.nowISO();
    return milik(userId).filter(function (v) {
      return v.status === 'aktif' && (!v.berlakuHingga || v.berlakuHingga > kini);
    });
  }

  function hadiahDari(userId) {
    return U.sortBy(DB.where('voucher', { dariId: userId }),
      function (v) { return v.createdAt; }, true);
  }

  /* ================================================================ KASIR */
  /**
   * Voucher yang berlaku untuk satu konteks pembayaran.
   * Undian dan pelatihan TIDAK pernah muncul di kasir — keduanya bukan alat
   * bayar, dan menawarkannya di sana hanya membuat orang membuangnya.
   */
  function untukKasir(userId, konteks, subtotal) {
    return aktifMilik(userId).filter(function (v) {
      if (v.jenis !== 'nilai' && v.jenis !== 'diskon') return false;
      var k = v.ketentuan || {};
      if (k.lingkup && k.lingkup !== 'semua' && k.lingkup !== konteks) return false;
      if (k.minBelanja && (subtotal || 0) < k.minBelanja) return false;
      return true;
    });
  }

  /**
   * Berapa rupiah voucher ini memotong. Dibatasi pada tagihan yang tersedia —
   * voucher Rp200.000 pada belanja Rp80.000 memotong Rp80.000, bukan
   * menciptakan kembalian.
   */
  function potongan(v, subtotal) {
    if (!v) return { rp: 0, sisaHangus: 0, kenaBatas: false };
    var k = v.ketentuan || {};
    var dasar = Math.max(0, subtotal || 0);
    var seharusnya;
    if (v.jenis === 'diskon') {
      seharusnya = Math.round(dasar * (k.persen || 0) / 100);
      if (k.maks) seharusnya = Math.min(seharusnya, k.maks);
    } else {
      seharusnya = k.nilai || 0;
    }
    var rp = Math.min(seharusnya, dasar);
    return {
      rp: rp,
      sisaHangus: v.jenis === 'nilai' ? Math.max(0, (k.nilai || 0) - rp) : 0,
      kenaBatas: !!(v.jenis === 'diskon' && k.maks &&
        Math.round(dasar * (k.persen || 0) / 100) > k.maks)
    };
  }

  function pakai(voucherId, ref) {
    var v = DB.find('voucher', voucherId);
    if (!v || v.status !== 'aktif') return null;
    return DB.update('voucher', voucherId, {
      status: 'terpakai', dipakaiPada: U.nowISO(),
      refType: ref && ref.tipe || null, refId: ref && ref.id || null
    });
  }

  /**
   * Kembalikan voucher ketika transaksi yang memakainya batal. Voucher yang
   * tetap hangus setelah pesanan dibatalkan sama saja dengan menyita milik
   * orang tanpa memberi apa pun sebagai gantinya.
   */
  function kembalikan(ref) {
    if (!ref || !ref.id) return 0;
    var n = 0;
    DB.where('voucher', function (v) {
      return v.status === 'terpakai' && v.refType === ref.tipe && v.refId === ref.id;
    }).forEach(function (v) {
      DB.update('voucher', v.id, {
        status: 'aktif', dipakaiPada: null, refType: null, refId: null,
        /* Waktu yang terpakai selama transaksi berjalan bukan kesalahan
           pemiliknya, jadi masa berlakunya diperpanjang. */
        berlakuHingga: U.addDays(new Date(), 30).toISOString()
      });
      n++;
    });
    return n;
  }

  /* ================================================================ PELATIHAN */
  function voucherKursus(userId, kursusId) {
    return aktifMilik(userId).filter(function (v) {
      return v.jenis === 'pelatihan' && (v.ketentuan || {}).kursusId === kursusId;
    })[0] || null;
  }

  function tebusPelatihan(voucherId) {
    var v = DB.find('voucher', voucherId);
    if (!v || v.jenis !== 'pelatihan' || v.status !== 'aktif') return null;
    var kursusId = (v.ketentuan || {}).kursusId;
    DB.update('voucher', voucherId, {
      status: 'terpakai', dipakaiPada: U.nowISO(), refType: 'kursus', refId: kursusId
    });
    if (window.LMS && LMS.progresAtauBuat) LMS.progresAtauBuat(v.pemilikId, kursusId);
    DB.log(v.pemilikId, 'voucher.pelatihan', 'kursus', kursusId, v.kode);
    return DB.find('voucher', voucherId);
  }

  /* ================================================================ UNDIAN */
  function pesertaUndian(produkId) {
    return DB.where('voucher', function (v) {
      return v.produkId === produkId && v.jenis === 'undian' &&
        v.status === 'aktif' && v.pemilikId;
    });
  }

  /**
   * Undi pemenang.
   *
   * SELURUH tiket yang ikut dicatat bersama hasilnya, bukan hanya pemenangnya.
   * Undian yang hanya menyimpan pemenang tidak bisa dibuktikan adil ketika ada
   * yang bertanya — dan pada undian berhadiah, pertanyaan itu pasti datang.
   */
  function undi(produkId, jumlahPemenang, oleh) {
    var p = produk(produkId);
    if (!p || p.jenis !== 'undian') throw new Error(I18N.t('Produk ini bukan voucher undian.'));
    var peserta = pesertaUndian(produkId);
    if (!peserta.length) throw new Error(I18N.t('Belum ada tiket terdaftar yang bisa diundi.'));

    var n = Math.max(1, Math.min(Number(jumlahPemenang) || 1, peserta.length));
    var kolam = peserta.slice();
    var menang = [];
    for (var i = 0; i < n; i++) {
      menang.push(kolam.splice(Math.floor(Math.random() * kolam.length), 1)[0]);
    }

    var rec = DB.insert('undian', {
      no: 'UND-' + String(DB.nextNo('undian')).padStart(4, '0'),
      produkId: produkId, namaProduk: p.nama, hadiah: p.hadiah,
      nilaiHadiah: p.nilaiHadiah || 0,
      jumlahPeserta: peserta.length, jumlahPemenang: menang.length,
      pesertaIds: peserta.map(function (v) { return v.id; }),
      pemenangIds: menang.map(function (v) { return v.id; }),
      oleh: oleh || null, at: U.nowISO()
    });

    menang.forEach(function (v) {
      DB.update('voucher', v.id, { status: 'menang', undianId: rec.id,
        hasilUndian: { hadiah: p.hadiah, nilai: p.nilaiHadiah || 0, at: rec.at } });
      /* Hadiah berupa uang langsung masuk dompet — di situlah ia bisa ditarik,
         dan dari situ pula jejaknya terbaca. */
      if (p.nilaiHadiah > 0 && window.DOMPET) {
        DOMPET.kredit(v.pemilikId, p.nilaiHadiah, 'bonus',
          'Hadiah undian ' + p.nama + ' — ' + rec.no, { tipe: 'undian', id: rec.id });
      }
      if (window.WA) {
        DB.insert('waOutbox', { to: v.pemilikId, template: 'manual', status: 'antre', sentAt: null,
          refType: 'undian', refId: rec.id,
          pesan: (function () {
            var w = I18N.pesanUntuk(v.pemilikId);
            return '*' + w('SELAMAT!') + '* 🎉\n\n' +
              w('Tiket undian Anda {kode} memenangkan *{hadiah}*')
                .replace('{kode}', v.kode).replace('{hadiah}', p.hadiah) +
              (p.nilaiHadiah
                ? ' ' + w('senilai {v}').replace('{v}', U.rp(p.nilaiHadiah))
                : '') + '.\n\n' +
              w('Undian') + ' ' + rec.no + ' — ' + p.nama;
          })() });
      }
    });
    kolam.forEach(function (v) {
      DB.update('voucher', v.id, { status: 'kalah', undianId: rec.id });
    });

    DB.log(oleh, 'voucher.undi', 'undian', rec.id,
      p.nama + ': ' + menang.length + ' pemenang dari ' + peserta.length + ' tiket');
    return rec;
  }

  function riwayatUndian() {
    return U.sortBy(DB.all('undian'), function (u) { return u.at; }, true);
  }

  /* ================================================================ KEDALUWARSA */
  function segarkan() {
    var kini = U.nowISO(), n = 0;
    DB.where('voucher', function (v) {
      return v.status === 'aktif' && v.berlakuHingga && v.berlakuHingga < kini;
    }).forEach(function (v) { DB.update('voucher', v.id, { status: 'kedaluwarsa' }); n++; });
    return n;
  }

  /* ================================================================ RINGKASAN */
  function statistik() {
    var semua = DB.all('voucher');
    function n(f) { return semua.filter(f).length; }
    var beredar = semua.filter(function (v) { return v.status === 'aktif'; });
    /* Kewajiban = nilai voucher yang masih bisa ditagihkan ke perusahaan.
       Undian dan pelatihan tidak dihitung: yang satu belum tentu berhadiah,
       yang satu lagi tidak menguras kas. */
    var kewajiban = U.sum(beredar.filter(function (v) { return v.jenis === 'nilai'; }),
      function (v) { return (v.ketentuan || {}).nilai || 0; });
    return {
      total: semua.length, aktif: beredar.length,
      terpakai: n(function (v) { return v.status === 'terpakai'; }),
      kedaluwarsa: n(function (v) { return v.status === 'kedaluwarsa'; }),
      dibeli: n(function (v) { return v.asal === 'beli'; }),
      dariPoin: n(function (v) { return v.asal === 'poin'; }),
      hadiah: n(function (v) { return v.untukHadiah; }),
      belumDiklaim: n(function (v) { return v.untukHadiah && !v.pemilikId && v.status === 'aktif'; }),
      pendapatan: U.sum(semua, function (v) { return v.hargaBayar || 0; }),
      kewajibanRp: kewajiban
    };
  }

  /** Kalimat ringkas nilai sebuah voucher, dipakai di kartu dan daftar. */
  function nilaiTeks(v) {
    var k = v.ketentuan || v;
    if (v.jenis === 'nilai') return U.rp(k.nilai || 0);
    if (v.jenis === 'diskon') return (k.persen || 0) + '%' +
      (k.maks ? ' · maks ' + U.rp(k.maks) : '');
    if (v.jenis === 'undian') return k.hadiah || 'Hadiah undian';
    if (v.jenis === 'pelatihan') {
      var kur = k.kursusId && DB.find('kursus', k.kursusId);
      return kur ? kur.judul : 'Kursus pelatihan';
    }
    return '—';
  }

  return {
    JENIS: JENIS, LINGKUP: LINGKUP, STATUS: STATUS,
    buatKode: buatKode, cariKode: cariKode,
    produk: produk, semuaProduk: semuaProduk, produkAktif: produkAktif,
    bisaDibeli: bisaDibeli, bisaDitukarPoin: bisaDitukarPoin, sisaKuota: sisaKuota,
    simpanProduk: simpanProduk, periksaProduk: periksaProduk,
    terbitkan: terbitkan, klaim: klaim,
    milik: milik, aktifMilik: aktifMilik, hadiahDari: hadiahDari,
    untukKasir: untukKasir, potongan: potongan, pakai: pakai, kembalikan: kembalikan,
    voucherKursus: voucherKursus, tebusPelatihan: tebusPelatihan,
    pesertaUndian: pesertaUndian, undi: undi, riwayatUndian: riwayatUndian,
    segarkan: segarkan, statistik: statistik, nilaiTeks: nilaiTeks
  };
})();
