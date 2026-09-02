/* ==========================================================================
   kpi.js — penilaian kinerja petugas, leader, dan koordinator kebersihan
   --------------------------------------------------------------------------
   DARI MANA RANCANGAN INI DIAMBIL

   Ukurannya bukan karangan sendiri. Yang dipakai industri kebersihan gedung:

     · APPA Levels 1–5 — skala kebersihan yang sudah dipakai modul inspeksi.
       Nilai 1 terbaik, 5 terburuk; dibalik menjadi skor agar searah dengan
       ukuran lain.
     · ISSA / CIMS — Cleaning Industry Management Standard menuntut sistem
       mutu yang punya bukti terverifikasi, bukan laporan mandiri. Dari sinilah
       pemisahan "dilaporkan selesai" dan "bisa dibuktikan selesai".
     · Praktik umum kontraktor kebersihan (BSC): schedule adherence, inspection
       score, complaint response time, absenteeism, rework rate.

   YANG DIUKUR BERBEDA MENURUT JABATAN, DAN ITU DISENGAJA

   Koordinator tidak dinilai dari berapa toilet yang ia pel. Ia dinilai dari
   capaian regunya, apakah ia benar-benar berkeliling menginspeksi, dan
   seberapa cepat aduan penghuni di wilayahnya ditangani. Menilai penyelia
   dengan ukuran pelaksana akan mendorongnya mengambil alih pekerjaan anak
   buahnya — persis kebalikan dari tugasnya.

   YANG TIDAK BISA DILIHAT ANGKA INI

   Disebutkan di layar dan ikut tercetak, bukan disembunyikan di dokumentasi:
   kesungguhan, kesediaan menolong rekan, keselamatan kerja, dan mutu pekerjaan
   yang tidak pernah diinspeksi. Skor ini bahan percakapan penilaian, BUKAN
   penggantinya — dan siapa pun yang memakainya untuk memutus gaji atau
   hubungan kerja tanpa berbicara dengan orangnya sedang menyalahgunakannya.
   ========================================================================== */
window.KPI = (function () {
  'use strict';

  /* ------------------------------------------------------------- katalog */

  /**
   * `untuk`  : 'pelaksana' | 'penyelia' — jabatan level 3 vs level 1–2
   * `arah`   : 'naik' berarti makin besar makin baik
   * `bobot`  : bawaan; korporat boleh mengubahnya — pembobotan itu keputusan
   *            kebijakan, bukan keputusan teknis, dan menyembunyikannya di
   *            dalam kode membuat penilaian terasa turun dari langit.
   */
  var DIMENSI = [
    /* ---- pelaksana ---- */
    { kode: 'selesai', untuk: 'pelaksana', bobot: 30,
      nama: 'Penyelesaian tugas',
      ket: 'Tugas yang ditandai selesai dibagi tugas yang dijadwalkan untuknya.' },
    { kode: 'tepat', untuk: 'pelaksana', bobot: 15,
      nama: 'Ketepatan waktu',
      ket: 'Selesai sebelum lewat batas toleransi jam tugasnya.' },
    { kode: 'bukti', untuk: 'pelaksana', bobot: 20,
      nama: 'Bukti kehadiran',
      ket: 'Tugas selesai yang disertai pemindaian tag di lokasi. Selisihnya ' +
           'bukan berarti tidak dikerjakan — hanya tidak bisa ditunjukkan.' },
    { kode: 'foto', untuk: 'pelaksana', bobot: 10,
      nama: 'Kelengkapan foto',
      ket: 'Hanya dihitung pada area yang memang menuntut foto sesudah.' },
    { kode: 'mutu', untuk: 'pelaksana', bobot: 15,
      nama: 'Mutu hasil',
      ket: 'Rata-rata inspeksi APPA di area tanggung jawabnya. 1 terbaik, ' +
           '5 terburuk — dibalik menjadi skor.' },
    { kode: 'hadir', untuk: 'pelaksana', bobot: 10,
      nama: 'Kehadiran',
      ket: 'Hari bekerja dibagi hari yang kehadirannya tercatat.' },
    { kode: 'aduan', untuk: 'pelaksana', bobot: 0,
      nama: 'Aduan di areanya',
      ket: 'MATI secara bawaan, dan sebaiknya tetap begitu. Jumlah aduan lebih ' +
           'ditentukan oleh ramainya gedung daripada oleh rajinnya petugas; ' +
           'menyalakannya berarti menghukum orang atas area tempat ia ditugaskan. ' +
           'Tetap ditampilkan sebagai keterangan.' },

    /* ---- leader & koordinator ---- */
    { kode: 'timSelesai', untuk: 'penyelia', bobot: 30,
      nama: 'Capaian regu',
      ket: 'Penyelesaian tugas seluruh anak buahnya, langsung maupun tidak.' },
    { kode: 'inspeksi', untuk: 'penyelia', bobot: 20,
      nama: 'Cakupan inspeksi',
      ket: 'Area di bawahnya yang ia periksa setidaknya sekali pada periode ini. ' +
           'Penyelia yang tidak pernah menginspeksi tidak sedang menyelia.' },
    { kode: 'timMutu', untuk: 'penyelia', bobot: 20,
      nama: 'Mutu wilayah',
      ket: 'Rata-rata APPA seluruh area di bawahnya.' },
    { kode: 'sla', untuk: 'penyelia', bobot: 15,
      nama: 'Tanggap aduan',
      ket: 'Aduan penghuni di wilayahnya yang tuntas dalam batas waktu.' },
    { kode: 'pengganti', untuk: 'penyelia', bobot: 10,
      nama: 'Penanganan ketidakhadiran',
      ket: 'Anak buah yang absen dan ADA penggantinya. Absen bukan kesalahan ' +
           'penyelia; membiarkan areanya kosong adalah kesalahannya.' },
    { kode: 'hadir', untuk: 'penyelia', bobot: 5,
      nama: 'Kehadiran',
      ket: 'Hari bekerja dibagi hari yang kehadirannya tercatat.' }
  ];

  function dimensiUntuk(peran) {
    return DIMENSI.filter(function (d) { return d.untuk === peran; });
  }

  var GRADE = [
    { kode: 'A', min: 85, nama: 'Sangat baik', warna: 'ok' },
    { kode: 'B', min: 70, nama: 'Baik', warna: 'ok' },
    { kode: 'C', min: 55, nama: 'Cukup', warna: 'warn' },
    { kode: 'D', min: 0, nama: 'Perlu perbaikan', warna: 'danger' }
  ];
  function grade(skor) {
    if (skor === null || skor === undefined) return null;
    for (var i = 0; i < GRADE.length; i++) if (skor >= GRADE[i].min) return GRADE[i];
    return GRADE[GRADE.length - 1];
  }

  /**
   * Di bawah ambang ini skor TIDAK diberi grade.
   *
   * Petugas dengan tiga tugas sebulan bisa keluar sebagai 100% dan menyalip
   * rekan yang mengerjakan dua ratus tugas dengan 92%. Angkanya benar; artinya
   * yang tidak ada. Yang seperti itu ditandai "data belum cukup", bukan
   * dinaikkan ke puncak daftar.
   */
  var MIN_TUGAS = 5;

  /* --------------------------------------------------------- pembobotan */

  function bobot(korporatId) {
    var k = DB.find('korporat', korporatId);
    var simpan = (k && k.kpiBobot) || {};
    var out = {};
    DIMENSI.forEach(function (d) {
      var kunci = d.untuk + '.' + d.kode;
      out[kunci] = simpan[kunci] !== undefined ? Number(simpan[kunci]) : d.bobot;
    });
    return out;
  }

  function simpanBobot(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var b = Object.assign({}, (k && k.kpiBobot) || {});
    Object.keys(patch || {}).forEach(function (kk) {
      var n = Number(patch[kk]);
      if (!isNaN(n) && n >= 0 && n <= 100) b[kk] = n;
    });
    DB.update('korporat', korporatId, { kpiBobot: b });
    return { ok: true };
  }

  /* -------------------------------------------------------------- waktu */

  /**
   * Periode satu bulan penuh. Tanpa argumen: BULAN BERJALAN.
   *
   * Bawaan ini bukan kemudahan, ia penambal lubang yang sungguh menganga.
   * Dipanggil tanpa tahun/bulan, baris lama menghitung `new Date(undefined,
   * NaN, 1)` — Invalid Date — dan U.iso mengubahnya menjadi rentang
   * 'NaN-NaN-NaN' sampai 'NaN-NaN-NaN'. Tidak ada galat sama sekali: sapuan
   * harinya tidak pernah berputar sekali pun, dan seluruh laporan kembali
   * NOL.
   *
   * Terlihat lewat KONTRAK.periksa(kontrak), yang memang dirancang boleh
   * dipanggil tanpa periode: kontrak yang menaungi 1.744 tugas dan 160
   * inspeksi melaporkan SELURUH janjinya 'tidak ada data'. Nol yang salah
   * terlihat persis seperti nol yang benar — dan di sini artinya kontrak
   * yang sungguh dilanggar tampak seperti kontrak yang belum bisa dinilai.
   */
  function periodeBulan(tahun, bulan) {
    var kini = new Date();
    var th = Number(tahun) || kini.getFullYear();
    var bl = Number(bulan) || (kini.getMonth() + 1);
    var awal = new Date(th, bl - 1, 1);
    var akhir = new Date(th, bl, 0);
    return { dari: U.iso(awal), sampai: U.iso(akhir), tahun: th, bulan: bl };
  }

  function menit(jam) {
    var p = String(jam).split(':');
    return (+p[0] || 0) * 60 + (+p[1] || 0);
  }

  /* ------------------------------------------------------- pengumpulan */

  /**
   * Satu sapuan atas seluruh periode; hasilnya dipakai bersama oleh semua
   * orang yang dinilai. Memanggil tugasHari() sekali per orang per hari akan
   * menghitung ulang jadwal yang sama puluhan kali.
   */
  function kumpulkan(korporatId, dari, sampai) {
    var cfg = MCS.config();
    var toleransi = cfg.telatMenit || 30;
    var hariIni = U.today();

    var perOrang = {};             /* pekerjaId → hitungan tugas */
    var perHari = [];              /* untuk grafik */
    function orang(id) {
      return perOrang[id] || (perOrang[id] = {
        tugas: 0, selesai: 0, tepat: 0, tepatDinilai: 0,
        bukti: 0, perluFoto: 0, berfoto: 0
      });
    }

    var d = new Date(dari + 'T00:00:00');
    var batas = new Date(sampai + 'T00:00:00');
    while (d <= batas) {
      var tgl = U.iso(d);
      /* Hari yang belum terjadi tidak dihitung — memasukkannya sebagai nol
         membuat penilaian bulan berjalan selalu terlihat gagal separuh. */
      if (tgl > hariIni) break;
      var t = MCS.tugasHari(korporatId, tgl);
      var nSelesai = 0;
      var nDinilai = 0;
      t.forEach(function (x) {
        /* JAM yang belum tiba juga tidak dihitung.

           Penjaga di atas sudah melakukannya untuk HARI, dengan alasan yang
           sama persis — tetapi berhenti di batas hari. Akibatnya rapor yang
           dibuka siang hari menghukum orang atas pekerjaan sore: dari 1.745
           slot hari ini, 782 belum tiba jamnya dan seluruhnya masuk penyebut
           sebagai tugas yang tidak dikerjakan. Dimensi Penyelesaian tugas —
           bobot 30, yang terbesar — terbaca 39% sementara capaian yang
           sesungguhnya 64%, dan 174 orang jatuh ke grade D karena jam kerja
           mereka belum lewat.

           Cacat yang sama pernah ditemukan dan diperbaiki di MCS.rekapBulan;
           berkas ini tertinggal. Yang di sana hanya membuat laporan bulanan
           terlihat buruk; yang di sini dipakai menilai orang. */
        if (x.status === 'akan') return;
        nDinilai++;
        var rec = MCS.catatanSlot(x.jadwalId, x.tgl, x.jam);
        /* Dihitung menurut yang MENGERJAKAN bila disebutkan, bukan menurut
           yang dijadwalkan. Kalau tidak, petugas pengganti tidak pernah muncul
           sementara yang absen terlihat rajin. */
        var pid = (rec && rec.pekerjaId) || (x.pekerja && x.pekerja.id);
        if (!pid) return;
        var o = orang(pid);
        o.tugas++;
        var kelar = x.status === 'selesai';
        if (kelar) {
          o.selesai++; nSelesai++;
          if (rec && rec.pindaiId) o.bukti++;
          if (x.wajibFoto) { o.perluFoto++; if ((rec.sesudah || []).length) o.berfoto++; }
          /* Ketepatan hanya dinilai bila waktu selesainya tercatat. Menganggap
             yang tak tercatat sebagai terlambat menghukum data yang hilang. */
          if (rec && rec.selesaiAt) {
            o.tepatDinilai++;
            var jamSelesai = new Date(rec.selesaiAt);
            var mSelesai = jamSelesai.getHours() * 60 + jamSelesai.getMinutes();
            var samaHari = U.iso(jamSelesai) === x.tgl;
            if (samaHari && mSelesai <= menit(x.jam) + toleransi) o.tepat++;
          }
        }
      });
      /* Penyebutnya yang SUDAH DINILAI, bukan seluruh slot — kalau tidak,
         grafik hariannya akan menceritakan hal yang berbeda dari angka di
         atasnya pada halaman yang sama. */
      perHari.push({ tgl: tgl, total: nDinilai, selesai: nSelesai });
      d.setDate(d.getDate() + 1);
    }

    /* ---- kehadiran ---- */
    var absen = DB.where('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.tgl >= dari && x.tgl <= sampai; });

    /* ---- inspeksi & aduan ---- */
    var inspeksi = MCS.inspeksi(korporatId, { dari: dari, sampai: sampai });
    var aduan = DB.where('mcsAduan', function (x) {
      var t = String(x.pada).slice(0, 10);
      return x.korporatId === korporatId && t >= dari && t <= sampai; });

    return { perOrang: perOrang, perHari: perHari, absen: absen,
             inspeksi: inspeksi, aduan: aduan };
  }

  /* ------------------------------------------------------- perhitungan */

  function persen(atas, bawah) {
    if (!bawah) return null;                 /* null = tidak ada datanya */
    return Math.round(atas / bawah * 1000) / 10;
  }

  /** APPA 1–5 (1 terbaik) → skor 0–100 searah dengan ukuran lain. */
  function skorMutu(rata) {
    if (rata === null || rata === undefined) return null;
    return Math.round((5 - rata) / 4 * 1000) / 10;
  }

  /** Seluruh anak buah, langsung maupun berjenjang. */
  function seluruhBawahan(pekerjaId, kedalaman) {
    var out = [], lihat = MCS.bawahan(pekerjaId);
    var n = 0;
    while (lihat.length && n++ < 50) {
      var b = lihat.shift();
      if (out.some(function (x) { return x.id === b.id; })) continue;
      out.push(b);
      MCS.bawahan(b.id).forEach(function (c) { lihat.push(c); });
    }
    return out;
  }

  function hadirDari(absen, pekerjaId) {
    var milik = absen.filter(function (x) { return x.pekerjaId === pekerjaId && x.status; });
    if (!milik.length) return { nilai: null, atas: 0, bawah: 0 };
    var bekerja = milik.filter(function (x) {
      return MCS.statusHadir(x.status).bekerja; }).length;
    return { nilai: persen(bekerja, milik.length), atas: bekerja, bawah: milik.length };
  }

  function nilaiSatu(p, data, bb) {
    var jb = MCS.jabatan(p.jabatan);
    var penyelia = jb.level <= 2;
    var area = MCS.areaPekerja(p.id);
    var dim = [];

    /**
     * @param bentuk 'pecahan' — 18 dari 20 (bawaan)
     *               'rata'    — rata-rata 2,3 dari 12 penilaian
     *               'hitung'  — 4 kejadian pada 3 area
     *
     * Bentuknya dibedakan karena '2,3 / 12' terbaca sebagai 'dua koma tiga
     * dari dua belas' — padahal artinya 'rata-rata 2,3, dihitung dari dua
     * belas inspeksi'. Pada lembar yang dipakai memutus gaji, salah baca
     * seperti itu tidak boleh dibiarkan bergantung pada ketelitian pembaca.
     */
    function tambah(kode, nilai, atas, bawah, bentuk, satuan) {
      var def = DIMENSI.filter(function (d) {
        return d.kode === kode && d.untuk === (penyelia ? 'penyelia' : 'pelaksana'); })[0];
      if (!def) return;
      dim.push({
        kode: kode, nama: def.nama, ket: def.ket,
        bobot: bb[(penyelia ? 'penyelia' : 'pelaksana') + '.' + kode],
        nilai: nilai,
        atas: atas, bawah: bawah,
        bentuk: bentuk || 'pecahan', satuan: satuan || ''
      });
    }

    if (!penyelia) {
      var o = data.perOrang[p.id] || { tugas: 0, selesai: 0, tepat: 0, tepatDinilai: 0,
        bukti: 0, perluFoto: 0, berfoto: 0 };

      tambah('selesai', persen(o.selesai, o.tugas), o.selesai, o.tugas);
      tambah('tepat', persen(o.tepat, o.tepatDinilai), o.tepat, o.tepatDinilai);
      tambah('bukti', persen(o.bukti, o.selesai), o.bukti, o.selesai);
      tambah('foto', persen(o.berfoto, o.perluFoto), o.berfoto, o.perluFoto);

      var insMilik = data.inspeksi.filter(function (x) {
        return area.some(function (a) { return a.id === x.areaId; }); });
      var rata = insMilik.length
        ? Math.round(insMilik.reduce(function (s, x) { return s + x.skor; }, 0) / insMilik.length * 10) / 10
        : null;
      tambah('mutu', skorMutu(rata), rata, insMilik.length, 'rata', 'APPA');

      var h = hadirDari(data.absen, p.id);
      tambah('hadir', h.nilai, h.atas, h.bawah);

      var adMilik = data.aduan.filter(function (x) {
        return area.some(function (a) { return a.id === x.areaId; }); });
      /* Sengaja TIDAK diubah jadi persentase: tidak ada pembagi yang jujur.
         Angkanya ditampilkan apa adanya sebagai keterangan. */
      tambah('aduan', null, adMilik.length, area.length, 'hitung', 'aduan');

      return rakit(p, jb, dim, o.tugas, area);
    }

    /* ---- penyelia ---- */
    var tim = seluruhBawahan(p.id);
    var timId = tim.map(function (x) { return x.id; });
    var tTugas = 0, tSelesai = 0;
    timId.forEach(function (id) {
      var v = data.perOrang[id];
      if (v) { tTugas += v.tugas; tSelesai += v.selesai; }
    });
    tambah('timSelesai', persen(tSelesai, tTugas), tSelesai, tTugas);

    /* Wilayah = gabungan area seluruh anak buah, ditambah areanya sendiri. */
    var wil = {};
    area.forEach(function (a) { wil[a.id] = a; });
    tim.forEach(function (b) { MCS.areaPekerja(b.id).forEach(function (a) { wil[a.id] = a; }); });
    var wilId = Object.keys(wil);

    var insWil = data.inspeksi.filter(function (x) { return wil[x.areaId]; });
    var areaTerperiksa = {};
    insWil.forEach(function (x) { areaTerperiksa[x.areaId] = 1; });
    tambah('inspeksi', persen(Object.keys(areaTerperiksa).length, wilId.length),
      Object.keys(areaTerperiksa).length, wilId.length);

    var rataWil = insWil.length
      ? Math.round(insWil.reduce(function (s, x) { return s + x.skor; }, 0) / insWil.length * 10) / 10
      : null;
    tambah('timMutu', skorMutu(rataWil), rataWil, insWil.length, 'rata', 'APPA');

    var adWil = data.aduan.filter(function (x) { return wil[x.areaId]; });
    var adTuntas = adWil.filter(function (x) { return x.status === 'selesai'; });
    var adTepat = adTuntas.filter(function (x) { return MCS.sisaSLA(x) >= 0; });
    tambah('sla', persen(adTepat.length, adTuntas.length), adTepat.length, adTuntas.length);

    var absTim = data.absen.filter(function (x) {
      return timId.indexOf(x.pekerjaId) >= 0 && x.status &&
             !MCS.statusHadir(x.status).bekerja; });
    var adaPengganti = absTim.filter(function (x) { return !!x.penggantiId; }).length;
    tambah('pengganti', persen(adaPengganti, absTim.length), adaPengganti, absTim.length);

    var hp = hadirDari(data.absen, p.id);
    tambah('hadir', hp.nilai, hp.atas, hp.bawah);

    return rakit(p, jb, dim, tTugas, Object.keys(wil).map(function (k) { return wil[k]; }), tim);
  }

  /**
   * Rata-rata TERTIMBANG atas dimensi yang punya data.
   *
   * Dimensi tanpa data dikeluarkan dari pembagi, bukan dinilai nol. Petugas
   * yang areanya belum pernah diinspeksi bukan petugas yang mutunya buruk —
   * ia petugas yang tidak pernah diperiksa, dan itu kelalaian penyelianya.
   */
  function rakit(p, jb, dim, volume, area, tim) {
    var jumlah = 0, pembagi = 0, bobotTotal = 0, bobotAda = 0;
    dim.forEach(function (d) {
      bobotTotal += d.bobot;
      if (d.nilai === null || !d.bobot) return;
      jumlah += d.nilai * d.bobot;
      pembagi += d.bobot;
      bobotAda += d.bobot;
    });
    var skor = pembagi ? Math.round(jumlah / pembagi * 10) / 10 : null;

    /* Dua alasan berbeda mengapa skor tidak boleh dipakai — dibedakan supaya
       yang membaca tahu apa yang harus diperbaiki. */
    var kurangVolume = volume < MIN_TUGAS;
    var kurangDimensi = bobotTotal > 0 && bobotAda / bobotTotal < 0.5;
    var cukup = skor !== null && !kurangVolume && !kurangDimensi;

    return {
      pekerja: p, jabatan: jb, penyelia: jb.level <= 2,
      dimensi: dim, skor: skor, grade: cukup ? grade(skor) : null,
      cukupData: cukup, kurangVolume: kurangVolume, kurangDimensi: kurangDimensi,
      volume: volume, area: area, tim: tim || null,
      /* Berapa bagian dari bobot yang benar-benar terisi data. Angka ini ikut
         dicetak: skor yang lahir dari separuh dimensi bukan skor yang sama
         dengan skor yang lahir dari seluruhnya. */
      cakupanBobot: bobotTotal ? Math.round(bobotAda / bobotTotal * 100) : 0
    };
  }

  /* ------------------------------------------------------------- gerbang */

  function nilai(korporatId, dari, sampai) {
    var data = kumpulkan(korporatId, dari, sampai);
    var bb = bobot(korporatId);
    var orang = MCS.pekerja(korporatId).map(function (p) {
      return nilaiSatu(p, data, bb); });

    /* Yang datanya cukup diurutkan menurun; yang belum cukup ditaruh di bawah
       apa pun skornya — bukan dicampur ke tengah daftar seolah setara. */
    orang.sort(function (a, b) {
      if (a.cukupData !== b.cukupData) return a.cukupData ? -1 : 1;
      return (b.skor || 0) - (a.skor || 0);
    });

    var terukur = orang.filter(function (x) { return x.cukupData; });
    return {
      dari: dari, sampai: sampai,
      orang: orang,
      perHari: data.perHari,
      ringkas: {
        dinilai: orang.length,
        terukur: terukur.length,
        rata: terukur.length
          ? Math.round(terukur.reduce(function (s, x) { return s + x.skor; }, 0) / terukur.length * 10) / 10
          : null,
        sebaran: GRADE.map(function (g) {
          return { grade: g, n: terukur.filter(function (x) {
            return x.grade && x.grade.kode === g.kode; }).length };
        })
      }
    };
  }

  function satu(korporatId, pekerjaId, dari, sampai) {
    var p = MCS.pekerjaSatu(pekerjaId);
    if (!p) return null;
    return nilaiSatu(p, kumpulkan(korporatId, dari, sampai), bobot(korporatId));
  }

  /* ----------------------------------------------------------------- CSV
     Dipisah titik koma, bukan koma: Excel berbahasa Indonesia memakai koma
     sebagai pemisah desimal, dan berkas ber-koma akan tertumpuk pada satu
     kolom di komputer kantor mana pun di sini. */
  function csv(hasil) {
    function sel(v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var kodeSemua = [];
    DIMENSI.forEach(function (d) {
      if (kodeSemua.indexOf(d.kode) < 0) kodeSemua.push(d.kode); });

    var baris = [];
    baris.push(['Periode', hasil.dari + ' s/d ' + hasil.sampai].map(sel).join(';'));
    baris.push([]);
    baris.push(['Nama', 'Jabatan', 'Skor', 'Grade', 'Volume tugas', 'Cakupan bobot (%)', 'Keterangan']
      .concat(kodeSemua.map(function (k) {
        var d = DIMENSI.filter(function (x) { return x.kode === k; })[0];
        return d ? d.nama : k; })).map(sel).join(';'));

    hasil.orang.forEach(function (o) {
      var petaDim = {};
      o.dimensi.forEach(function (d) { petaDim[d.kode] = d; });
      baris.push([
        o.pekerja.nama, I18N.t(o.jabatan.nama),
        o.cukupData ? o.skor : '', o.grade ? o.grade.kode : '',
        o.volume, o.cakupanBobot,
        o.cukupData ? '' : (o.kurangVolume ? I18N.t('Volume tugas terlalu sedikit untuk dinilai')
                                           : I18N.t('Data dimensi belum cukup'))
      ].concat(kodeSemua.map(function (k) {
        var d = petaDim[k];
        if (!d) return '';
        if (d.nilai === null) {
          if (!d.bawah && !d.atas) return '';
          return d.bentuk === 'hitung' ? String(d.atas) : d.atas + '/' + d.bawah;
        }
        return String(d.nilai).replace('.', ',');
      })).map(sel).join(';'));
    });
    return baris.join('\r\n');
  }

  return {
    DIMENSI: DIMENSI, GRADE: GRADE, MIN_TUGAS: MIN_TUGAS,
    dimensiUntuk: dimensiUntuk, grade: grade,
    bobot: bobot, simpanBobot: simpanBobot,
    periodeBulan: periodeBulan, skorMutu: skorMutu,
    nilai: nilai, satu: satu, csv: csv
  };
})();
