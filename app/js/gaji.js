/* ==========================================================================
   gaji.js — dari absensi menjadi slip gaji
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Absensi sudah dicatat tiap hari, tetapi berhenti sebagai angka di layar.
   Yang membayar orang tetap dihitung ulang di kertas atau spreadsheet, dan
   di situlah dua kesalahan lahir: petugas yang alfa tetap dibayar penuh
   karena tidak ada yang menyilangkan daftarnya, dan petugas yang masuk
   ekstra tidak pernah dibayar karena tidak ada yang mencatatnya.

   YANG DIHITUNG DARI HARI, BUKAN DARI JAM

   Absensi di aplikasi ini mencatat KEHADIRAN HARIAN — hadir, sakit, izin,
   libur, tanpa kabar — tanpa jam masuk dan jam pulang. Maka slip gaji di
   sini berbasis HARI, dan tidak boleh berpura-pura tahu berapa jam orang
   bekerja. Untunglah itu memang bentuk yang lazim di jasa kebersihan
   Indonesia: gaji bulanan tetap, dipotong ketika tidak masuk tanpa kabar.

   Bila suatu hari jam masuk dan pulang benar-benar dicatat, lembur bisa
   ditambahkan di atas dasar ini. Sampai saat itu, TIDAK ADA baris lembur —
   kolom lembur yang selalu nol lebih buruk daripada tidak ada kolomnya,
   karena ia menyiratkan lemburnya sudah diperhitungkan.

   SLIP DISIMPAN, BUKAN DIHITUNG ULANG

   Hampir seluruh rekap di aplikasi ini dihitung setiap kali dibuka, dan itu
   benar: angka yang disimpan akan basi diam-diam. Slip gaji adalah
   pengecualian, dan pengecualiannya disengaja.

   Slip yang sudah diterbitkan adalah DOKUMEN YANG SUDAH DITERIMA ORANG.
   Menghitungnya ulang bulan depan — setelah gaji pokoknya naik, atau setelah
   satu absensi diperbaiki — akan diam-diam mengubah isi kertas yang sudah
   ditandatangani. Karena itu nilai gaji pokok, tunjangan, dan hitungan
   harinya DIBEKUKAN ke dalam slip pada saat diterbitkan.

   YANG TIDAK DIJANJIKAN, DAN HARUS DIKATAKAN

   Ini BUKAN penggajian yang sah secara hukum. Tidak ada PPh 21, tidak ada
   BPJS Kesehatan maupun Ketenagakerjaan, tidak ada THR, tidak ada
   perhitungan lembur menurut Kepmenaker. Yang ada adalah dasar yang jujur —
   berapa hari orang bekerja dan berapa yang harus dibayarkan atas dasar itu.
   Potongan dan tunjangan lain diisi manual, dan angkanya tetap harus
   diperiksa orang yang memang mengurus penggajian.
   ========================================================================== */
var GAJI = (function () {

  /* Status absensi mana yang DIBAYAR.

     Bawaannya mengikuti praktik gaji bulanan: sakit, izin, dan libur tetap
     dibayar — hanya tanpa kabar yang dipotong. Itu juga sejalan dengan UU
     Ketenagakerjaan untuk sakit yang dibuktikan. Korporat boleh mengubahnya,
     karena perjanjian kerjanya yang berlaku, bukan bawaan kami. */
  var BAWAAN = {
    dibayar: { hadir: true, sakit: true, izin: true, libur: true, alfa: false },
    /* Berapa hari kerja dalam sebulan menurut perjanjian. Dipakai sebagai
       PEMBAGI untuk menghitung nilai satu hari. Diisi, bukan dihitung dari
       kalender: gaji bulanan tidak berubah karena Februari lebih pendek. */
    hariPerBulan: 25,
    /* Upah satu hari untuk pekerjaan tambahan di luar jadwal. Nol berarti
       tidak dipakai. */
    upahLembur: 0
  };

  function config(korporatId) {
    var k = DB.find('korporat', korporatId);
    var s = (k && k.gajiConfig) || {};
    var out = {
      dibayar: Object.assign({}, BAWAAN.dibayar, s.dibayar || {}),
      hariPerBulan: s.hariPerBulan !== undefined ? Number(s.hariPerBulan) : BAWAAN.hariPerBulan,
      upahLembur: s.upahLembur !== undefined ? Number(s.upahLembur) : BAWAAN.upahLembur
    };
    if (!(out.hariPerBulan > 0)) out.hariPerBulan = BAWAAN.hariPerBulan;
    return out;
  }

  function simpanConfig(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var c = Object.assign({}, (k && k.gajiConfig) || {});
    if (patch.dibayar) c.dibayar = Object.assign({}, c.dibayar || {}, patch.dibayar);
    if (patch.hariPerBulan !== undefined) {
      var h = Number(patch.hariPerBulan);
      if (!(h > 0 && h <= 31)) return { error: I18N.t('Hari kerja sebulan harus antara 1 dan 31.') };
      c.hariPerBulan = Math.round(h);
    }
    if (patch.upahLembur !== undefined) {
      var u = Number(patch.upahLembur);
      if (!(u >= 0)) return { error: I18N.t('Upah tidak boleh negatif.') };
      c.upahLembur = Math.round(u);
    }
    DB.update('korporat', korporatId, { gajiConfig: c });
    return { ok: true, config: config(korporatId) };
  }

  /* ------------------------------------------------------- upah petugas */

  /**
   * Gaji pokok dan tunjangan seorang petugas.
   *
   * Disimpan pada catatan petugasnya sendiri karena ia sifat pekerjaannya,
   * bukan sifat satu bulan. Yang membekukannya per bulan adalah slip.
   */
  function upah(pekerjaId) {
    var p = MCS.pekerjaSatu(pekerjaId);
    var u = (p && p.upah) || {};
    return {
      pokok: Math.max(0, Math.round(Number(u.pokok) || 0)),
      tunjangan: Math.max(0, Math.round(Number(u.tunjangan) || 0)),
      /* Potongan tetap: koperasi, cicilan seragam, kasbon berjalan. */
      potongan: Math.max(0, Math.round(Number(u.potongan) || 0)),
      catatan: String(u.catatan || '')
    };
  }

  function simpanUpah(pekerjaId, d) {
    var p = MCS.pekerjaSatu(pekerjaId);
    if (!p) return { error: I18N.t('Petugas tidak ditemukan.') };
    ['pokok', 'tunjangan', 'potongan'].forEach(function (f) {
      if (d[f] !== undefined && !(Number(d[f]) >= 0)) d[f] = 0;
    });
    DB.update('mcsPekerja', pekerjaId, {
      upah: {
        pokok: Math.max(0, Math.round(Number(d.pokok) || 0)),
        tunjangan: Math.max(0, Math.round(Number(d.tunjangan) || 0)),
        potongan: Math.max(0, Math.round(Number(d.potongan) || 0)),
        catatan: String(d.catatan || '').trim()
      }
    });
    return { ok: true, upah: upah(pekerjaId) };
  }

  /* ---------------------------------------------------------- perhitungan */

  function periode(tahun, bulan) {
    var d = new Date(tahun, bulan - 1, 1);
    var akhir = new Date(tahun, bulan, 0);
    return { dari: U.iso(d), sampai: U.iso(akhir), hariKalender: akhir.getDate() };
  }

  /**
   * Hitung gaji satu petugas untuk satu bulan — TANPA menyimpannya.
   *
   * Mengembalikan juga rincian per status, karena angka akhirnya tidak bisa
   * dipertanggungjawabkan tanpa memperlihatkan dari mana ia datang. Petugas
   * yang menerima slip berhak tahu hari mana yang dipotong.
   */
  function hitung(korporatId, pekerjaId, tahun, bulan) {
    var p = MCS.pekerjaSatu(pekerjaId);
    if (!p || p.korporatId !== korporatId) return null;
    var c = config(korporatId);
    var per = periode(tahun, bulan);
    var u = upah(pekerjaId);

    var rows = DB.where('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.pekerjaId === pekerjaId &&
             x.tgl >= per.dari && x.tgl <= per.sampai;
    });

    var hitungan = { hadir: 0, sakit: 0, izin: 0, libur: 0, alfa: 0 };
    var dibayar = 0, tidakDibayar = 0;
    rows.forEach(function (r) {
      var k = r.status;
      if (hitungan[k] === undefined) hitungan[k] = 0;
      hitungan[k]++;
      if (c.dibayar[k]) dibayar++; else tidakDibayar++;
    });

    /* Hari yang TIDAK PERNAH DICATAT dihitung terpisah, dan tidak dianggap
       apa pun. Menganggapnya hadir membayar orang untuk hari yang tak ada
       buktinya; menganggapnya alfa memotong orang karena penyelianya lupa
       mengisi absensi. Keduanya salah, jadi ia dilaporkan apa adanya dan
       manusia yang memutuskan. */
    var tercatat = rows.length;
    var belumDicatat = Math.max(0, c.hariPerBulan - tercatat);

    var nilaiHari = Math.round(u.pokok / c.hariPerBulan);
    var potonganAbsen = nilaiHari * tidakDibayar;

    /* Pekerjaan tambahan yang SELESAI dan melibatkan petugas ini. Dibayar
       hanya bila upah lemburnya disetel — kalau nol, ia hanya ditampilkan
       sebagai keterangan, bukan sebagai uang yang tidak pernah dibayarkan. */
    var kerja = DB.where('mcsKerja', function (x) {
      return x.korporatId === korporatId && x.status === 'selesai' &&
             (x.pekerjaIds || []).indexOf(pekerjaId) >= 0 &&
             String(x.selesaiAt || x.dibuat || '').slice(0, 10) >= per.dari &&
             String(x.selesaiAt || x.dibuat || '').slice(0, 10) <= per.sampai;
    });
    var upahTambahan = c.upahLembur * kerja.length;

    var kotor = u.pokok + u.tunjangan + upahTambahan;
    var potongan = potonganAbsen + u.potongan;
    var bersih = Math.max(0, kotor - potongan);

    return {
      pekerjaId: pekerjaId, nama: p.nama, jabatan: p.jabatan, nip: p.nip || '',
      tahun: tahun, bulan: bulan, periode: per,
      hariPerBulan: c.hariPerBulan,
      hitungan: hitungan, tercatat: tercatat, belumDicatat: belumDicatat,
      hariDibayar: dibayar, hariTidakDibayar: tidakDibayar,
      nilaiHari: nilaiHari,
      pokok: u.pokok, tunjangan: u.tunjangan,
      kerjaTambahan: kerja.length, upahTambahan: upahTambahan,
      potonganAbsen: potonganAbsen, potonganTetap: u.potongan,
      kotor: kotor, potongan: potongan, bersih: bersih,
      catatanUpah: u.catatan
    };
  }

  function hitungSemua(korporatId, tahun, bulan) {
    return MCS.pekerja(korporatId).map(function (p) {
      return hitung(korporatId, p.id, tahun, bulan);
    }).filter(Boolean);
  }

  /* ------------------------------------------------------------- slip */

  function slip(korporatId, tahun, bulan) {
    return DB.where('mcsSlip', function (x) {
      return x.korporatId === korporatId && x.tahun === tahun && x.bulan === bulan;
    });
  }

  function slipSatu(pekerjaId, tahun, bulan) {
    return DB.first('mcsSlip', function (x) {
      return x.pekerjaId === pekerjaId && x.tahun === tahun && x.bulan === bulan;
    });
  }

  /**
   * Terbitkan slip — membekukan angkanya.
   *
   * Menolak menerbitkan ulang tanpa membatalkan yang lama lebih dulu. Dua
   * slip untuk satu orang di satu bulan adalah dua jawaban berbeda atas satu
   * pertanyaan, dan yang memegang kertasnya tidak punya cara tahu mana yang
   * berlaku.
   */
  function terbitkan(korporatId, pekerjaId, tahun, bulan, oleh) {
    if (slipSatu(pekerjaId, tahun, bulan)) {
      return { error: I18N.t('Slip bulan itu sudah pernah diterbitkan. Batalkan dulu bila ingin menghitung ulang.') };
    }
    var h = hitung(korporatId, pekerjaId, tahun, bulan);
    if (!h) return { error: I18N.t('Petugas tidak ditemukan.') };
    if (!h.pokok) {
      return { error: I18N.t('Gaji pokok petugas ini belum diisi — slipnya akan bernilai nol.') };
    }
    var x = DB.insert('mcsSlip', Object.assign({}, h, {
      korporatId: korporatId,
      no: nomorSlip(korporatId, tahun, bulan, pekerjaId),
      diterbitkan: U.nowISO(),
      olehId: oleh ? oleh.id : null,
      olehNama: oleh ? oleh.nama : ''
    }));
    return { ok: true, slip: x };
  }

  function terbitkanSemua(korporatId, tahun, bulan, oleh) {
    var out = { terbit: 0, lewat: [], gagal: [] };
    MCS.pekerja(korporatId).forEach(function (p) {
      if (slipSatu(p.id, tahun, bulan)) { out.lewat.push(p.nama); return; }
      var r = terbitkan(korporatId, p.id, tahun, bulan, oleh);
      if (r.error) out.gagal.push({ nama: p.nama, sebab: r.error });
      else out.terbit++;
    });
    return out;
  }

  function batalkan(id) {
    var x = DB.find('mcsSlip', id);
    if (!x) return { error: I18N.t('Slip tidak ditemukan.') };
    DB.remove('mcsSlip', id);
    return { ok: true };
  }

  /* Nomor slip: tahun-bulan-urutan petugas. Tidak memakai penomoran server
     karena ia tidak perlu berurutan menyeluruh — yang penting ia unik dan
     bisa dibaca manusia di atas kertas. */
  function nomorSlip(korporatId, tahun, bulan, pekerjaId) {
    var n = slip(korporatId, tahun, bulan).length + 1;
    return 'SG/' + tahun + '/' + ('0' + bulan).slice(-2) + '/' + ('00' + n).slice(-3);
  }

  /** Ringkasan sebulan untuk kepala halaman dan laporan. */
  function statistik(korporatId, tahun, bulan) {
    var h = hitungSemua(korporatId, tahun, bulan);
    var s = slip(korporatId, tahun, bulan);
    var kotor = 0, bersih = 0, potongan = 0, tanpaUpah = 0, adaAbsenKosong = 0;
    h.forEach(function (x) {
      kotor += x.kotor; bersih += x.bersih; potongan += x.potongan;
      if (!x.pokok) tanpaUpah++;
      if (x.belumDicatat) adaAbsenKosong++;
    });
    return {
      petugas: h.length, kotor: kotor, bersih: bersih, potongan: potongan,
      tanpaUpah: tanpaUpah, adaAbsenKosong: adaAbsenKosong,
      terbit: s.length, belumTerbit: h.length - s.length
    };
  }

  function csv(korporatId, tahun, bulan) {
    var h = hitungSemua(korporatId, tahun, bulan);
    var kol = ['NIP', 'Nama', 'Jabatan', 'Hari tercatat', 'Hari dibayar',
      I18N.t('Hari tidak dibayar'), 'Gaji pokok', 'Tunjangan', 'Upah tambahan',
      'Potongan absen', 'Potongan tetap', 'Diterima'];
    var baris = h.map(function (x) {
      return [x.nip, x.nama, x.jabatan, x.tercatat, x.hariDibayar,
        x.hariTidakDibayar, x.pokok, x.tunjangan, x.upahTambahan,
        x.potonganAbsen, x.potonganTetap, x.bersih];
    });
    return [kol].concat(baris).map(function (r) {
      return r.map(function (v) {
        var s = String(v === null || v === undefined ? '' : v);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    upah: upah, simpanUpah: simpanUpah,
    periode: periode, hitung: hitung, hitungSemua: hitungSemua,
    slip: slip, slipSatu: slipSatu, terbitkan: terbitkan,
    terbitkanSemua: terbitkanSemua, batalkan: batalkan,
    statistik: statistik, csv: csv
  };
})();
