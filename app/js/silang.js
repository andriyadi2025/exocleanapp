/* ==========================================================================
   silang.js — pemeriksaan SILANG antar catatan yang seharusnya saling cocok
   --------------------------------------------------------------------------
   APA YANG SEBENARNYA DIPERIKSA DI SINI

   MCS mencatat empat hal yang berjalan sendiri-sendiri:

       kehadiran  — siapa bekerja hari ini
       tugas      — pekerjaan apa yang dinyatakan selesai
       alat       — barang mahal, siapa yang memegangnya
       bahan      — apa yang diambil dari gudang

   Tiap catatan itu benar menurut dirinya sendiri. Yang TIDAK pernah
   diperiksa siapa pun adalah apakah keempatnya sepakat — dan justru di
   sanalah kebohongan menumpuk tanpa satu pun galat:

     · Tugas ditandai selesai atas nama orang yang hari itu tercatat alfa.
     · Alat berkeadaan "dipakai" oleh orang yang sudah berhenti bekerja.
     · Seribu lima ratus tugas selesai, nol bahan keluar dari gudang.

   Ketiganya pernah terjadi pada data sungguhan aplikasi ini, dan ketiganya
   lolos karena tiap tabel diperiksa terpisah.

   KENAPA MENUNJUKKAN, BUKAN MENOLAK

   Godaannya adalah menolak: melarang tugas ditandai selesai bila petugasnya
   tercatat tidak masuk. Itu keliru, dan keliru dengan cara yang mahal.

   Di lapangan, urutannya sering terbalik — pekerjaan dilaporkan lebih dulu,
   absensi diisi penyelia menjelang sore. Menolak laporan pagi karena
   absensinya belum diisi berarti aplikasi memaksa orang berbohong pada
   kolom kehadiran supaya bisa melaporkan pekerjaan yang sungguh ia
   kerjakan. Data yang dipaksa konsisten oleh penjaga bukan data yang benar;
   ia hanya data yang tidak bisa lagi menunjukkan bahwa ada yang salah.

   Karena itu modul ini TIDAK memblokir apa pun. Ia menghitung
   ketidakcocokan dan menyerahkannya kepada manusia, dengan menyebut
   kemungkinan penjelasan yang wajar di sebelah tiap temuan.

   TIDAK ADA YANG DISIMPAN

   Seluruhnya dihitung saat diminta, dari tabel yang sudah ada. Menyimpan
   hasil pemeriksaan berarti punya dua kebenaran yang bisa berbeda — dan
   yang tersimpan selalu yang basi.
   ========================================================================== */
var SILANG = (function () {
  'use strict';

  /* ------------------------------------------------------------ bantuan */

  function petaAbsen(korporatId, tgl) {
    var p = {};
    DB.where('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.tgl === tgl;
    }).forEach(function (x) { p[x.pekerjaId] = x; });
    return p;
  }

  /* Nama yang aman ditampilkan walaupun petugasnya sudah dihapus. */
  function namaPekerja(id) {
    if (!id) return null;
    var p = MCS.pekerjaSatu(id);
    return p ? p.nama : null;
  }

  /* ============================================ 1. TUGAS vs KEHADIRAN

     Tugas dinyatakan selesai atas nama orang yang hari itu TIDAK bekerja.

     Yang dilaporkan hanya tugas dengan pelaksana yang absensinya SUDAH
     diisi dan berbunyi tidak-bekerja. Petugas yang absensinya belum diisi
     sama sekali TIDAK dihitung sebagai ketidakcocokan — itu keadaan yang
     sangat biasa di tengah hari, dan menyebutnya salah akan membuat daftar
     ini penuh sejak pagi lalu berhenti dibaca sebelum tengah hari.
     ==================================================================== */
  function tugasTanpaKehadiran(korporatId, tgl) {
    tgl = tgl || U.today();
    var abs = petaAbsen(korporatId, tgl);
    var out = [];

    MCS.tugasHari(korporatId, tgl).forEach(function (t) {
      if (t.status !== 'selesai') return;
      /* Pelaksana sebenarnya, bukan yang dijadwalkan — petugas pengganti
         yang hadir tidak boleh dituduh atas nama orang yang digantikannya. */
      var pid = (t.pelaksana && t.pelaksana.id) || (t.pekerja && t.pekerja.id);
      if (!pid) return;
      var a = abs[pid];
      if (!a || !a.status) return;                    /* belum diisi — bukan temuan */
      var s = MCS.statusHadir(a.status);
      if (s.bekerja) return;
      /* Digantikan orang lain dan penggantinya yang mengerjakan: itu justru
         alur yang benar, dan absensinya memang menyebut penggantinya. */
      if (a.penggantiId && a.penggantiId === pid) return;

      out.push({
        tgl: tgl, jam: t.jam,
        area: t.area, pekerja: t.pelaksana || t.pekerja,
        status: s,
        adaPengganti: !!a.penggantiId,
        penggantiNama: namaPekerja(a.penggantiId)
      });
    });
    return out;
  }

  /* ============================================ 2. ALAT vs PEMEGANGNYA

     Dua keadaan yang berbeda sebabnya dan berbeda pula penanganannya:

       · YATIM  — keadaan 'dipakai', tetapi pemegangnya sudah tidak ada di
                  daftar petugas. Ini bukan kelalaian pengisian: MCS.hapusPekerja
                  menghapus orangnya beserta jadwalnya tanpa melepaskan alat
                  yang sedang ia pegang. Layar peralatan lalu menulis
                  "Dipakai · tidak ada pemegang" — kalimat yang persis sama
                  dengan alat di gudang, sehingga barang hilang terlihat
                  seperti barang aman.
       · NONAKTIF — pemegangnya masih terdaftar tetapi sudah tidak bekerja.
                  Alatnya belum tentu hilang; yang pasti, tidak ada yang
                  bertanggung jawab atasnya sampai seseorang menerimanya
                  kembali.
     ==================================================================== */
  function alatSalahPemegang(korporatId) {
    var yatim = [], nonaktif = [];
    DB.where('mcsAset', function (x) {
      return x.korporatId === korporatId && x.keadaan === 'dipakai';
    }).forEach(function (x) {
      if (!x.pemegangId) {
        /* 'dipakai' tanpa pemegang sama sekali — data lama atau isian
           setengah jalan. Diperlakukan sama dengan yatim: sama-sama tidak
           bisa ditanyakan kepada siapa pun. */
        yatim.push({ aset: x, pemegangNama: null });
        return;
      }
      var p = MCS.pekerjaSatu(x.pemegangId);
      if (!p) { yatim.push({ aset: x, pemegangNama: null }); return; }
      if (p.aktif === false) nonaktif.push({ aset: x, pekerja: p });
    });
    return { yatim: yatim, nonaktif: nonaktif };
  }

  /**
   * Alat yang dipegang orang yang HARI INI tidak bekerja.
   *
   * Bukan kesalahan — orang sakit membawa pulang kunci trolinya, dan itu
   * wajar. Yang perlu diketahui penyelia: alat itu tidak ada di gedung hari
   * ini, jadi jangan dicari dan jangan dijadwalkan.
   */
  function alatDipegangYangTidakMasuk(korporatId, tgl) {
    tgl = tgl || U.today();
    var abs = petaAbsen(korporatId, tgl);
    var out = [];
    DB.where('mcsAset', function (x) {
      return x.korporatId === korporatId && x.keadaan === 'dipakai' && x.pemegangId;
    }).forEach(function (x) {
      var a = abs[x.pemegangId];
      if (!a || !a.status) return;
      var s = MCS.statusHadir(a.status);
      if (s.bekerja) return;
      var p = MCS.pekerjaSatu(x.pemegangId);
      if (!p) return;                                  /* sudah ditangkap yatim */
      out.push({ aset: x, pekerja: p, status: s });
    });
    return out;
  }

  /* ========================================= 3. BAHAN vs PEKERJAAN

     Hari dengan banyak tugas selesai tetapi NOL bahan keluar dari gudang.

     Ini tidak selalu salah: gudang bisa mengeluarkan sekali untuk beberapa
     hari, dan troli kemarin masih terisi. Karena itu ambangnya tinggi dan
     yang dilaporkan hanya keadaan yang sungguh mencurigakan — pekerjaan
     berjalan penuh sementara buku gudang diam sama sekali.

     Yang diukur BUKAN kecukupan bahan (itu pekerjaan cakupan/forecast),
     melainkan apakah bukunya diisi. Buku gudang yang tidak pernah diisi
     membuat seluruh angka pemakaian, biaya bahan, dan penanda boros/irit
     berhenti berarti — diam-diam, karena nol terlihat seperti hemat.
     ==================================================================== */
  function hariTanpaPengambilan(korporatId, tgl, opsi) {
    tgl = tgl || U.today();
    opsi = opsi || {};
    var minTugas = opsi.minTugas === undefined ? 20 : opsi.minTugas;

    var selesai = 0;
    MCS.tugasHari(korporatId, tgl).forEach(function (t) {
      if (t.status === 'selesai') selesai++;
    });
    if (selesai < minTugas) return null;

    var keluar = DB.where('mcsStokMutasi', function (m) {
      return m.korporatId === korporatId &&
             String(m.pada).slice(0, 10) === tgl &&
             m.jenis === 'keluar';
    });
    if (keluar.length) return null;

    /* Berapa hari berturut-turut bukunya diam — satu hari sepi biasa, lima
       hari berturut-turut berarti tidak ada yang mengisi sama sekali. */
    var beruntun = 0;
    for (var i = 0; i < 14; i++) {
      var t2 = U.iso(U.addDays(U.d(tgl), -i));
      var ada = DB.first('mcsStokMutasi', function (m) {
        return m.korporatId === korporatId &&
               String(m.pada).slice(0, 10) === t2 && m.jenis === 'keluar';
      });
      if (ada) break;
      beruntun++;
    }
    return { tgl: tgl, tugasSelesai: selesai, hariBeruntun: beruntun };
  }

  /* ================================================== RINGKASAN SEKALIGUS

     Satu panggilan untuk layar yang ingin menampilkan semuanya. Tiap bagian
     tetap bisa dipanggil sendiri — halaman Peralatan hanya butuh yang
     tentang alat, dan menghitung sisanya di sana adalah pekerjaan yang
     dibuang.
     ==================================================================== */
  function ringkas(korporatId, tgl) {
    tgl = tgl || U.today();
    var alat = alatSalahPemegang(korporatId);
    var t = tugasTanpaKehadiran(korporatId, tgl);
    var d = alatDipegangYangTidakMasuk(korporatId, tgl);
    var b = hariTanpaPengambilan(korporatId, tgl);
    /* Alat yang tidak pernah kembali juga tidak pernah diperiksa — dan
       servis yang terlewat berakhir sebagai perbaikan. */
    var lama = (window.ASET && ASET.tertahanLama)
      ? ASET.tertahanLama(korporatId) : [];
    return {
      tgl: tgl,
      tugasTanpaKehadiran: t,
      alatYatim: alat.yatim,
      alatPemegangNonaktif: alat.nonaktif,
      alatDibawaYangTidakMasuk: d,
      alatTertahanLama: lama,
      bukuGudangDiam: b,
      /* Satu angka untuk lencana menu. Yang dihitung hanya yang MENUNTUT
         perbuatan: alat yang dibawa pulang orang sakit bukan masalah. */
      perluDitangani: t.length + alat.yatim.length + alat.nonaktif.length +
        lama.length + (b ? 1 : 0)
    };
  }

  return {
    tugasTanpaKehadiran: tugasTanpaKehadiran,
    alatSalahPemegang: alatSalahPemegang,
    alatDipegangYangTidakMasuk: alatDipegangYangTidakMasuk,
    hariTanpaPengambilan: hariTanpaPengambilan,
    ringkas: ringkas
  };
})();
