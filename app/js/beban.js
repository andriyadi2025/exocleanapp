/* ==========================================================================
   beban.js — perhitungan beban kerja berbasis luas area (workloading)
   --------------------------------------------------------------------------
   PERTANYAAN YANG DIJAWAB

   "Berapa orang yang sebenarnya saya butuhkan untuk gedung ini?"

   Sebelum ini MCS hanya bisa menjawab "berapa slot jadwal per minggu" — angka
   yang naik-turun mengikuti cara jadwalnya disusun, bukan mengikuti besarnya
   pekerjaan. Dua gedung dengan luas sama bisa punya jumlah slot yang jauh
   berbeda hanya karena yang satu menjadwalkan per lantai dan yang lain per
   ruangan.

   DASAR PERHITUNGANNYA

   ISSA (International Sanitary Supply Association) menerbitkan laju produksi
   baku — berapa meter persegi yang bisa dibersihkan satu orang dalam satu jam,
   menurut jenis ruangannya. Rumusnya sederhana:

       jam = luas (m²) ÷ laju (m²/jam)

   Angka di bawah ini dikonversi dari ISSA 612 (satuan aslinya kaki persegi
   per jam) dan DIBULATKAN. Contoh acuan yang banyak dikutip: kantor umum
   4.200 sqft/jam ≈ 390 m²/jam, toilet 1.000 sqft/jam ≈ 93 m²/jam, gudang
   6.000 sqft/jam ≈ 557 m²/jam.

   TIGA BATAS YANG HARUS DISEBUT, BUKAN DISEMBUNYIKAN

     1. Angka ISSA adalah patokan gedung Amerika dengan peralatan dan bahan
        tertentu. Gedung yang petugasnya memakai sapu dan pel gagang kayu
        tidak akan mencapainya. Karena itu ada PENGALI PENYESUAIAN yang bisa
        diubah tiap korporat.
     2. Laju itu mengandaikan LINGKUP PEKERJAAN tertentu. "Bersih" yang
        termasuk cuci karpet bukan "bersih" yang sama dengan sapu-pel-buang
        sampah.
     3. Ini menghitung TENAGA, bukan MUTU. Gedung yang orangnya cukup masih
        bisa kotor; gedung yang kekurangan orang hampir pasti kotor. Angka ini
        menjawab yang kedua, tidak menjanjikan yang pertama.
   ========================================================================== */
window.BEBAN = (function () {
  'use strict';

  /**
   * Laju produksi m²/jam menurut jenis area.
   *
   * `laju`   — pembersihan harian rutin (sapu, pel, buang sampah, lap)
   * `dalam`  — pembersihan menyeluruh berkala; jauh lebih lambat
   *
   * Toilet paling lambat dan itu benar: satu toilet 20 m² menghabiskan waktu
   * lebih lama daripada ruang kerja 200 m². Menyamakan keduanya adalah
   * kesalahan penjadwalan yang paling sering terjadi.
   */
  var LAJU = {
    toilet:  { laju: 93,  dalam: 46 },
    lobi:    { laju: 300, dalam: 140 },
    kerja:   { laju: 390, dalam: 180 },
    rapat:   { laju: 330, dalam: 160 },
    pantry:  { laju: 180, dalam: 90 },
    koridor: { laju: 460, dalam: 220 },
    lift:    { laju: 110, dalam: 55 },
    mushola: { laju: 200, dalam: 100 },
    taman:   { laju: 520, dalam: 260 },
    parkir:  { laju: 900, dalam: 450 },
    gudang:  { laju: 557, dalam: 280 },
    /* Unsur LOKASI, bukan ruangan di dalam gedung.

       Angkanya diturunkan dari laju ISSA untuk jenis yang paling mirip,
       bukan dari tabel resmi — ISSA menghitung ruangan berlantai, bukan
       jalan aspal dan gardu listrik. Karena itu ia diperlakukan sebagai
       TITIK AWAL yang harus dikoreksi setelah beberapa minggu pengamatan,
       dan bukan sebagai angka yang boleh dipakai menawar kontrak. */
    bangunan:{ laju: 400, dalam: 190 },
    pos:     { laju: 200, dalam: 100 },
    /* Jalan dan selasar luar disapu, bukan dipel — lebih cepat daripada
       area parkir karena tidak ada kendaraan yang harus dihindari. */
    jalan:   { laju: 1000, dalam: 500 },
    /* Ruang teknis kecil dan padat peralatan: luasnya sedikit, tetapi tiap
       meter menuntut kehati-hatian. Lebih lambat daripada gudang. */
    gardu:   { laju: 300, dalam: 150 },
    genset:  { laju: 300, dalam: 150 },
    ibadah:  { laju: 200, dalam: 100 },
    lainnya: { laju: 350, dalam: 170 }
  };
  function laju(jenisKode) { return LAJU[jenisKode] || LAJU.lainnya; }

  /* --------------------------------------------------------- pengaturan */

  var BAWAAN = {
    /* Pengali penyesuaian. 1,0 = persis angka ISSA. Di bawah 1 berarti tim
       ini lebih lambat daripada patokan — yang normal untuk gedung dengan
       peralatan sederhana. Diubah setelah membandingkan hasil hitungan dengan
       kenyataan di lapangan, bukan ditebak di awal. */
    pengali: 0.85,
    /* Jam kerja bersih seorang petugas per hari, SETELAH dikurangi istirahat,
       apel pagi, perjalanan antarlantai, dan menyiapkan alat. Tujuh jam dari
       delapan adalah patokan yang lazim; menghitung delapan penuh menghasilkan
       jumlah petugas yang selalu kurang. */
    jamPerHari: 7,
    hariPerMinggu: 6
  };

  function config(korporatId) {
    var k = DB.find('korporat', korporatId);
    var simpan = (k && k.bebanConfig) || {};
    var out = {};
    Object.keys(BAWAAN).forEach(function (kk) {
      out[kk] = simpan[kk] !== undefined ? Number(simpan[kk]) : BAWAAN[kk];
    });
    return out;
  }

  function simpanConfig(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var c = Object.assign({}, (k && k.bebanConfig) || {});
    if (patch.pengali !== undefined) {
      var p = Number(patch.pengali);
      if (!(p > 0 && p <= 3)) return { error: I18N.t('Pengali harus antara 0,1 dan 3.') };
      c.pengali = Math.round(p * 100) / 100;
    }
    if (patch.jamPerHari !== undefined) {
      var j = Number(patch.jamPerHari);
      if (!(j > 0 && j <= 24)) return { error: I18N.t('Jam kerja per hari tidak masuk akal.') };
      c.jamPerHari = Math.round(j * 10) / 10;
    }
    if (patch.hariPerMinggu !== undefined) {
      var h = Number(patch.hariPerMinggu);
      if (!(h > 0 && h <= 7)) return { error: I18N.t('Hari kerja per minggu harus 1 sampai 7.') };
      c.hariPerMinggu = Math.round(h);
    }
    DB.update('korporat', korporatId, { bebanConfig: c });
    return { ok: true };
  }

  /* ------------------------------------------------------- perhitungan */

  /** Berapa kali sebuah area dijadwalkan per minggu, dari jadwal yang ada. */
  function frekuensiMingguan(areaId) {
    return MCS.jadwalArea(areaId).reduce(function (s, j) {
      return s + (MCS.slotPerMinggu(j) || 0); }, 0);
  }

  /**
   * Hitungan satu area.
   *
   * Mengembalikan null pada `jamPerKali` bila luasnya belum diisi — BUKAN nol.
   * Nol akan terjumlah diam-diam dan membuat total kebutuhan tenaga terlihat
   * lebih kecil daripada sebenarnya, yang persis kebalikan dari gunanya
   * perhitungan ini.
   */
  function hitungArea(area, cfg) {
    var lj = laju(area.jenis);
    var luas = Number(area.luas) || 0;
    var lajuEfektif = lj.laju * (cfg.pengali || 1);
    var freq = frekuensiMingguan(area.id);
    var jamPerKali = luas ? Math.round(luas / lajuEfektif * 100) / 100 : null;
    return {
      area: area, luas: luas, adaLuas: !!luas,
      jenis: MCS.jenisArea(area.jenis),
      lajuBaku: lj.laju, lajuEfektif: Math.round(lajuEfektif),
      frekuensi: freq,
      jamPerKali: jamPerKali,
      jamPerMinggu: jamPerKali === null ? null : Math.round(jamPerKali * freq * 100) / 100,
      /* Area yang punya luas tetapi TIDAK dijadwalkan sama sekali disebut
         terpisah: ia tidak menambah beban, tetapi juga tidak dibersihkan.

         KECUALI petak yang menjadi WADAH sebuah bangunan. Petak seluas 1.200 m²
         tempat tower berdiri memang tidak pernah dijadwalkan — yang dibersihkan
         adalah ruangan di dalamnya, dan luasnya sudah terwakili di sana.
         Memperingatkannya berarti menuntut orang menjadwalkan pembersihan
         sebuah petak yang seluruhnya tertutup gedung.

         Ketahuan saat satu gedung sungguhan dimasukkan: halaman ini
         memperingatkan "Gedung Utama" sementara halaman Biaya justru sudah
         mengeluarkannya dari penyebut. Dua halaman menjawab berbeda tentang
         petak yang sama. */
      tanpaJadwal: !!luas && !freq && !wadahBangunan(area)
    };
  }

  /* Petak ini menampung bangunan yang punya ruangan? Kalau ya, ia wadah,
     bukan area yang terlupakan dijadwalkan. */
  function wadahBangunan(area) {
    if (!window.BANGUNAN || !area || area.lantaiId) return false;
    return BANGUNAN.semua(area.id).some(function (b) {
      return BANGUNAN.lantai(b.id).length > 0;
    });
  }

  function hitung(korporatId) {
    var cfg = config(korporatId);
    var l = MCS.area(korporatId).map(function (a) { return hitungArea(a, cfg); });

    var terhitung = l.filter(function (x) { return x.jamPerMinggu !== null; });
    var tanpaLuas = l.filter(function (x) { return !x.adaLuas; });
    var jamMinggu = terhitung.reduce(function (s, x) { return s + x.jamPerMinggu; }, 0);
    var jamPerOrang = (cfg.jamPerHari || 7) * (cfg.hariPerMinggu || 6);
    var butuh = jamPerOrang ? jamMinggu / jamPerOrang : 0;

    /* Hanya PELAKSANA yang dihitung sebagai kapasitas. Koordinator dan leader
       memang bekerja, tetapi pekerjaannya menyelia — memasukkannya sebagai
       tenaga pembersih akan membuat gedung terlihat cukup orang padahal
       penyelianya sedang mengambil alih pekerjaan anak buahnya. */
    var pelaksana = MCS.pekerja(korporatId).filter(function (p) {
      return MCS.jabatan(p.jabatan).level >= 3; });

    return {
      cfg: cfg,
      area: l.sort(function (a, b) {
        return (b.jamPerMinggu || 0) - (a.jamPerMinggu || 0); }),
      tanpaLuas: tanpaLuas,
      tanpaJadwal: l.filter(function (x) { return x.tanpaJadwal; }),
      luasTotal: l.reduce(function (s, x) { return s + x.luas; }, 0),
      jamPerMinggu: Math.round(jamMinggu * 10) / 10,
      jamPerOrang: jamPerOrang,
      butuhOrang: Math.round(butuh * 100) / 100,
      adaOrang: pelaksana.length,
      selisih: Math.round((pelaksana.length - butuh) * 100) / 100,
      /* Cakupan data: berapa bagian area yang luasnya sudah diisi. Angka
         kebutuhan yang lahir dari separuh area bukan angka yang sama dengan
         yang lahir dari seluruhnya, dan itu harus terbaca. */
      cakupan: l.length ? Math.round((l.length - tanpaLuas.length) / l.length * 100) : 0,
      pelaksana: pelaksana
    };
  }

  /**
   * Berapa jam per minggu yang benar-benar dipikul seorang petugas, menurut
   * jadwal yang atas namanya. Dipakai membandingkan beban antarorang — yang
   * merata di atas kertas belum tentu merata dalam jam.
   */
  function perPetugas(korporatId) {
    var cfg = config(korporatId);
    var petaArea = {};
    MCS.area(korporatId).forEach(function (a) { petaArea[a.id] = hitungArea(a, cfg); });

    return MCS.pekerja(korporatId).map(function (p) {
      var jam = 0, kurangLuas = 0;
      MCS.jadwalPekerja(p.id).forEach(function (j) {
        var h = petaArea[j.areaId];
        if (!h) return;
        if (!h.adaLuas) { kurangLuas++; return; }
        jam += (h.jamPerKali || 0) * (MCS.slotPerMinggu(j) || 0);
      });
      return {
        pekerja: p, jabatan: MCS.jabatan(p.jabatan),
        jamPerMinggu: Math.round(jam * 10) / 10,
        kapasitas: (cfg.jamPerHari || 7) * (cfg.hariPerMinggu || 6),
        kurangLuas: kurangLuas,
        persen: cfg.jamPerHari && cfg.hariPerMinggu
          ? Math.round(jam / ((cfg.jamPerHari) * (cfg.hariPerMinggu)) * 100) : 0
      };
    }).sort(function (a, b) { return b.jamPerMinggu - a.jamPerMinggu; });
  }

  return {
    LAJU: LAJU, BAWAAN: BAWAAN, laju: laju,
    config: config, simpanConfig: simpanConfig,
    hitungArea: hitungArea, hitung: hitung, perPetugas: perPetugas,
    frekuensiMingguan: frekuensiMingguan
  };
})();
