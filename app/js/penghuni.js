/* ==========================================================================
   penghuni.js — pemilik ruangan: yang memakai ruangannya sehari-hari
   --------------------------------------------------------------------------
   SIAPA DIA

   Bukan staf kebersihan, bukan staf korporat, bukan pemilik gedung. Ia orang
   yang RUANGANNYA dibersihkan: kepala bengkel atas bengkelnya, kepala
   showroom atas showroomnya, manajer kantor atas lantainya. Ia satu-satunya
   yang berada di ruangan itu setiap hari.

   KENAPA IA PERLU AKUN SENDIRI

   Selama ini aduan penghuni masuk lewat tag QR di dinding tanpa nama, dan
   itu memang disengaja — aduan anonim yang masuk lebih berguna daripada
   aduan bernama yang tidak pernah dikirim. Tetapi anonim punya harga: tidak
   ada yang bisa dikabari hasilnya, tidak ada riwayat, dan tidak ada cara
   menanyakan balik "yang mana yang masih kotor?".

   Akun ini melengkapi, bukan mengganti. Tag QR tetap ada dan tetap anonim.

   YANG SENGAJA TIDAK BISA IA LAKUKAN

     · Melihat ruangan orang lain.
     · Melihat gaji, biaya, kontrak, atau data petugas.
     · Menilai ORANG. Ia menilai HASIL di ruangannya — lihat catatan pada
       `nilai()` di bawah, karena perbedaan itu bukan soal kata-kata.
   ========================================================================== */
var PENGHUNI = (function () {
  'use strict';

  /* ------------------------------------------------------------ RUANGAN */

  /**
   * Ruangan yang menjadi tanggung jawabnya.
   *
   * Kosong berarti BELUM ADA, bukan berarti semuanya — kebalikan dari aturan
   * pada staf korporat, dan sengaja berbeda. Staf korporat yang belum
   * dibatasi masih punya pekerjaan yang bisa dikerjakan; penghuni yang tidak
   * punya ruangan tidak punya apa-apa untuk dilihat, dan menampilkan seluruh
   * gedung kepadanya adalah kebocoran, bukan kelonggaran.
   */
  function areaSaya(u) {
    u = u || (window.APP && APP.user);
    if (!u || u.role !== 'penghuni') return [];
    var d = (u.mcsArea || []);
    if (!d.length) return [];
    return d.map(function (id) { return MCS.areaSatu(id); })
      .filter(function (a) { return a && a.aktif !== false; });
  }

  function punyaArea(areaId, u) {
    return areaSaya(u).some(function (a) { return a.id === areaId; });
  }

  function objekSaya(u) {
    var out = [];
    areaSaya(u).forEach(function (a) {
      MCS.objek(a.id).forEach(function (o) { out.push(o); });
    });
    return out;
  }

  /* --------------------------------------------------------- KEADAAN

     Yang ditanyakan penghuni selalu sama: "kapan terakhir dibersihkan, dan
     apakah ada yang sedang dikerjakan hari ini?" Dua angka itu, bukan
     dasbor. */
  function keadaanArea(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return null;
    var hariIni = U.today();

    /* Tugas menunjuk JADWALNYA, bukan areanya — satu-satunya jalan dari
       area ke tugas melewati mcsJadwal.

       Sebelum ini baris di bawah menyaring `t.areaId`, kolom yang tidak
       pernah ada pada mcsTugas. Tidak ada galat: penyaringnya hanya selalu
       mengembalikan kosong, sehingga layar pemilik ruangan menulis 'belum
       pernah tercatat' dan 'tidak dijadwalkan' pada gedung yang tugasnya
       lengkap. Ketahuan dari layarnya, bukan dari alat mana pun — sebuah
       nol yang salah terlihat persis seperti nol yang benar. */
    var jadwalArea = {};
    DB.where('mcsJadwal', function (j) { return j.areaId === areaId; })
      .forEach(function (j) { jadwalArea[j.id] = 1; });
    function milikArea(t) { return !!jadwalArea[t.jadwalId]; }

    var tugas = DB.where('mcsTugas', function (t) {
      return milikArea(t) && String(t.tgl).slice(0, 10) === hariIni;
    });
    var selesai = tugas.filter(function (t) { return t.status === 'selesai'; });

    /* Pembersihan terakhir yang SUNGGUH selesai, bukan yang dijadwalkan. */
    var lalu = DB.where('mcsTugas', function (t) {
      return milikArea(t) && t.status === 'selesai';
    }).sort(function (p, q) {
      return String(q.selesaiAt || q.tgl).localeCompare(String(p.selesaiAt || p.tgl));
    })[0] || null;

    var aduanTerbuka = DB.where('mcsAduan', function (x) {
      return x.areaId === areaId && x.status !== 'selesai' && x.status !== 'ditutup';
    });

    return {
      area: a,
      tugasHariIni: tugas.length,
      selesaiHariIni: selesai.length,
      terakhir: lalu,
      aduanTerbuka: aduanTerbuka.length,
      /* Penilaian yang BELUM diberikan untuk pembersihan terakhir. Dipakai
         mengajak, bukan memaksa: penilaian yang dipaksa adalah penilaian
         yang diisi asal supaya layarnya berhenti bertanya. */
      belumDinilai: !!(lalu && !sudahMenilai(areaId, String(lalu.tgl).slice(0, 10)))
    };
  }

  /* ------------------------------------------------------------- ADUAN */

  function aduanSaya(u) {
    u = u || (window.APP && APP.user);
    if (!u) return [];
    return DB.where('mcsAduan', function (x) { return x.olehId === u.id; })
      .sort(function (p, q) { return String(q.pada).localeCompare(String(p.pada)); });
  }

  /**
   * Kirim aduan atas ruangan sendiri.
   *
   * Memakai MCS.buatAduan supaya SLA, penerusan ke petugas, dan seluruh alur
   * statusnya persis sama dengan aduan yang masuk lewat tag QR. Yang berbeda
   * hanya satu: aduan ini BERNAMA, sehingga pengirimnya bisa dikabari dan
   * bisa melihat riwayatnya sendiri.
   */
  function kirimAduan(areaId, d, u) {
    u = u || (window.APP && APP.user);
    if (!punyaArea(areaId, u)) {
      return { error: I18N.t('Ruangan itu bukan tanggung jawab Anda.') };
    }
    var r = MCS.buatAduan(areaId, Object.assign({}, d, {
      pelapor: u.nama, kontak: u.telp || u.email
    }));
    if (r.error) return r;
    DB.update('mcsAduan', r.aduan.id, { olehId: u.id, olehNama: u.nama });
    return { ok: true, aduan: MCS.aduanSatu(r.aduan.id) };
  }

  /* ---------------------------------------------------------- PENILAIAN

     YANG DINILAI ADALAH HASIL, BUKAN ORANG — dan ini bukan kehalusan bahasa.

     Penghuni melihat apa yang tampak: debu, bau, tempat sampah yang belum
     dikosongkan. Ia TIDAK melihat apakah petugas memakai bahan yang benar,
     mengikuti urutan kerja, memakai APD, atau apakah ruangan itu memang
     hanya dijatah lima belas menit. Menjadikan penilaiannya sebagai nilai
     seseorang berarti menghukum orang atas hal yang bukan keputusannya —
     paling sering atas jadwal yang disusun orang lain.

     Karena itu yang disimpan adalah kepuasan atas AREA pada TANGGAL, dan
     petugas yang bertugas dicatat sebagai keterangan, sama seperti pada
     inspeksi mutu. Layar menyebutnya "seberapa bersih ruangan ini", bukan
     "beri nilai petugas".

     Siapa yang menilai ORANG? Lihat catatan panjang di kepala berkas
     views/penghuni.js — jawabannya bukan penghuni, dan bukan pula satu
     pihak saja. */
  function sudahMenilai(areaId, tgl, u) {
    u = u || (window.APP && APP.user);
    if (!u) return false;
    return !!DB.first('mcsPuas', function (x) {
      return x.areaId === areaId && x.tgl === tgl && x.olehId === u.id;
    });
  }

  function nilai(areaId, d, u) {
    u = u || (window.APP && APP.user);
    if (!punyaArea(areaId, u)) {
      return { error: I18N.t('Ruangan itu bukan tanggung jawab Anda.') };
    }
    var skor = Number(d && d.skor);
    if (!(skor >= 1 && skor <= 5)) {
      return { error: I18N.t('Pilih tingkat kepuasannya dulu.') };
    }
    var a = MCS.areaSatu(areaId);
    var tgl = (d && d.tgl) || U.today();

    /* Satu penilaian per orang per ruangan per hari. Bukan untuk membatasi
       pendapat, melainkan supaya rata-ratanya berarti: satu orang yang
       menekan bintang sepuluh kali akan menenggelamkan sembilan orang
       lain. */
    var lama = DB.first('mcsPuas', function (x) {
      return x.areaId === areaId && x.tgl === tgl && x.olehId === u.id;
    });
    if (lama) {
      DB.update('mcsPuas', lama.id, {
        skor: skor, catatan: String((d && d.catatan) || '').trim(),
        pada: U.nowISO()
      });
      return { ok: true, puas: DB.find('mcsPuas', lama.id), diperbarui: true };
    }

    var x = DB.insert('mcsPuas', {
      korporatId: a.korporatId, areaId: areaId, tgl: tgl,
      skor: skor,
      catatan: String((d && d.catatan) || '').trim(),
      /* Petugas yang bertugas hari itu — KETERANGAN, bukan sasaran nilai.
         Sama persis alasannya dengan pekerjaId pada inspeksi mutu. */
      pekerjaId: (d && d.pekerjaId) || null,
      olehId: u.id, olehNama: u.nama,
      pada: U.nowISO()
    });
    return { ok: true, puas: x };
  }

  function penilaianSaya(u) {
    u = u || (window.APP && APP.user);
    if (!u) return [];
    return DB.where('mcsPuas', function (x) { return x.olehId === u.id; })
      .sort(function (p, q) { return String(q.pada).localeCompare(String(p.pada)); });
  }

  /**
   * Rata-rata kepuasan sebuah area.
   *
   * Mengembalikan null bila jawabannya SEDIKIT. Rata-rata dari dua jawaban
   * bukan rata-rata, ia dua pendapat yang kebetulan dibagi dua — dan angka
   * seperti itu akan tetap dibaca sebagai fakta begitu ia muncul di layar.
   */
  function rataArea(areaId, opsi) {
    opsi = opsi || {};
    var minimal = opsi.minimal === undefined ? 3 : opsi.minimal;
    var l = DB.where('mcsPuas', function (x) {
      if (x.areaId !== areaId) return false;
      if (opsi.dari && x.tgl < opsi.dari) return false;
      if (opsi.sampai && x.tgl > opsi.sampai) return false;
      return true;
    });
    if (l.length < minimal) return { n: l.length, rata: null, cukup: false };
    var jum = l.reduce(function (s, x) { return s + Number(x.skor || 0); }, 0);
    return { n: l.length, rata: Math.round(jum / l.length * 10) / 10, cukup: true };
  }

  /**
   * Kepuasan penghuni SELURUH korporat — dinyatakan sebagai PERSENTASE,
   * bukan sebagai angka 1–5.
   *
   * Bentuknya sengaja berbeda, dan ini keputusan yang perlu dibaca sebelum
   * diubah. Layar pengelola sudah memuat skor inspeksi APPA, yang juga 1–5
   * tetapi BERLAWANAN ARAH — 1 paling bersih. Menaruh dua angka 1–5 dengan
   * arah berlawanan pada satu layar adalah undangan untuk salah baca yang
   * tidak bisa ditutup oleh keterangan sebesar apa pun: mata membaca angka,
   * bukan catatan kaki.
   *
   * Persentase tidak punya arah yang bisa terbalik — 78% selalu lebih baik
   * daripada 40%, di skala mana pun — dan menjawab pertanyaan yang sungguh
   * ditanyakan pengelola: berapa banyak penghuni yang menyatakan ruangannya
   * bersih.
   *
   * 'Puas' berarti skor 4 atau 5 (Bersih / Bersih sekali). Ambang itu
   * disebut di layar, bukan disembunyikan: memilih ambang 3 akan membuat
   * angkanya jauh lebih bagus tanpa satu pun penghuni berubah pendapat.
   */
  function persenPuasKorporat(korporatId, opsi) {
    opsi = opsi || {};
    var minimal = opsi.minimal === undefined ? 5 : opsi.minimal;
    var l = DB.where('mcsPuas', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (opsi.dari && x.tgl < opsi.dari) return false;
      if (opsi.sampai && x.tgl > opsi.sampai) return false;
      return true;
    });
    /* Sedikit jawaban tidak diberi persentase. '100% puas' dari dua orang
       adalah kalimat yang akan dikutip di rapat, dan ia tidak berarti
       apa-apa. */
    if (l.length < minimal) {
      return { n: l.length, persen: null, cukup: false, area: 0 };
    }
    var puas = l.filter(function (x) { return Number(x.skor) >= 4; }).length;
    var area = {};
    l.forEach(function (x) { area[x.areaId] = 1; });
    return {
      n: l.length,
      puas: puas,
      persen: Math.round(puas / l.length * 100),
      cukup: true,
      area: Object.keys(area).length
    };
  }

  return {
    persenPuasKorporat: persenPuasKorporat,
    areaSaya: areaSaya, punyaArea: punyaArea, objekSaya: objekSaya,
    keadaanArea: keadaanArea,
    aduanSaya: aduanSaya, kirimAduan: kirimAduan,
    nilai: nilai, sudahMenilai: sudahMenilai, penilaianSaya: penilaianSaya,
    rataArea: rataArea
  };
})();
