/* ==========================================================================
   semai-buana-capaian.js — melengkapi hari yang penyemaiannya terputus
   --------------------------------------------------------------------------
   KENAPA BERKAS INI ADA, DAN KENAPA IA BUKAN "SEMAI LEBIH BANYAK HARI"

   semai-buana-operasi.js berhenti di tengah dengan sengaja: pengukur
   ruangnya menahan diri pada `sisaRuang() < 700000`, dan localStorage saat
   itu memang hampir penuh. Yang tertinggal terlihat begini pada layar mana
   pun yang membaca capaian:

       1.745 slot hari ini · 876 sudah lewat jamnya
       205 selesai · 671 terlambat tanpa catatan

   Angka 23% itu bukan kinerja buruk. Ia penyemaian yang terputus — dan
   satu-satunya cara membedakan keduanya adalah menghitung berapa slot yang
   sudah lewat jamnya tetapi tidak punya satu pun catatan.

   YANG TIDAK DILAKUKAN DI SINI: MENAMBAH HARI

   Godaannya adalah menyemai tiga puluh hari supaya laporan bulanan penuh.
   Itu keliru dan keliru dengan cara yang merusak: jadwal di akun ini
   ber-`createdAt` hari ini, dan MCS sengaja TIDAK memberlakukan jadwal
   secara surut — sehingga hari-hari sebelumnya menghasilkan NOL slot dan
   tidak menghukum siapa pun. Memundurkan `createdAt` ke empat puluh hari
   lalu akan menghidupkan 30 x 1.745 = 52.350 slot sekaligus, yang seluruh
   catatannya tidak akan pernah muat (19 MB pada batas 5 MB). Hasilnya bukan
   laporan yang penuh melainkan capaian yang jatuh ke sepuluh persen, dan
   kali ini benar-benar palsu.

   Jadi yang dilengkapi HARI INI saja, sampai selesai.

   WATAK PER CABANG, BUKAN ACAK PER TUGAS

   Kalau tiap tugas diundi sendiri-sendiri dengan peluang yang sama, seluruh
   delapan puluh tujuh cabang akan berakhir di sekitar angka yang sama, dan
   halaman Struktur & Capaian yang baru dibuat tidak akan pernah bisa
   menjawab pertanyaan yang menjadi alasan ia ada: cabang mana yang
   tertinggal. Data yang rata sempurna tidak menguji apa pun.

   Karena itu tiap cabang diberi watak TETAP, diturunkan dari idnya sendiri —
   sehingga cabang yang tertinggal tertinggal secara konsisten, sebagaimana
   cabang sungguhan. Yang diuji halaman itu memang perbedaannya, bukan
   angkanya.

   Jalankan sebagai Admin Korporat, sesudah semai-buana-operasi.js.
   ========================================================================== */
var SEMAI_BUANA_CAPAIAN = (function () {
  'use strict';

  function korporatBuana() {
    return DB.first('korporat', function (k) {
      return /Buana Indah Motorindo/i.test(k.nama || '');
    });
  }

  /* Pengukur ruang yang sama dengan penyemai operasi: DB.save(true) dulu,
     karena penyimpanan tertunda 120 md dan membaca tanpa menyiramnya
     mengukur keadaan beberapa ratus baris yang lalu — justru pada saat
     batasnya paling dekat. Diukur sungguhan tiap 60 baris; di antaranya
     ditaksir dari ukuran baris rata-rata. */
  function pembuatUkur() {
    var terakhir = 0, sejak = 0, taksir = 0;
    function ukurSungguhan() {
      DB.save(true);
      var n = 0;
      for (var i = 0; i < localStorage.length; i++) {
        n += (localStorage.getItem(localStorage.key(i)) || '').length;
      }
      terakhir = n; sejak = 0; taksir = 0;
      return n;
    }
    ukurSungguhan();
    return {
      sisa: function (perBaris) {
        if (sejak++ >= 60) return 5 * 1024 * 1024 - ukurSungguhan();
        taksir += perBaris || 376;
        return 5 * 1024 * 1024 - (terakhir + taksir);
      },
      ukurUlang: ukurSungguhan
    };
  }

  /* Watak cabang: 0,45 sampai 0,97, tetap dari idnya. Bukan Math.random —
     penyemai yang hasilnya berbeda tiap dijalankan tidak bisa dipakai
     membandingkan sebelum dan sesudah sebuah perubahan. */
  function watak(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
    return 0.45 + (h % 1000) / 1000 * 0.52;
  }

  function lokasiArea(a) {
    if (!a) return null;
    return a.lokasiId ||
      (a.lantaiId && MCS.lokasiDariLantai ? MCS.lokasiDariLantai(a.lantaiId) : null);
  }

  function menitJam(j) { var p = String(j).split(':'); return (+p[0]) * 60 + (+p[1]); }

  function jalankan(opsi) {
    opsi = opsi || {};
    var k = korporatBuana();
    if (!k) return { error: 'Korporat PT Buana Indah Motorindo tidak ditemukan.' };
    if (!APP.user || APP.user.role !== 'korporat' ||
        (MCSAKSES.peranUser(APP.user) || {}).kode !== 'admin') {
      return { error: 'Jalankan sebagai Admin Korporat Buana.' };
    }
    var kid = k.id, oleh = APP.user, hariIni = U.today();
    var ukur = pembuatUkur();
    var batasAman = opsi.batasAman === undefined ? 600000 : opsi.batasAman;

    var lap = { tugasDitambah: 0, tugasBerbukti: 0, dilewatiTidakHadir: 0,
                dilewatiWatak: 0, belumWaktunya: 0, inspeksiDitambah: 0,
                ruangHabis: false, pindaiDinyalakan: false,
                sisaKBawal: Math.round((5 * 1024 * 1024 - (5 * 1024 * 1024 - ukur.sisa(0))) / 1024) };

    /* ------------------------------------------- BUKTI KEHADIRAN DINYALAKAN

       Dimensi KPI ‘Bukti kehadiran’ berbobot 20 — seperlima dari nilai tiap
       petugas pelaksana — dan seluruh 258 orang bernilai NOL di sana, karena
       tidak satu pun tugas di akun ini punya pemindaian tag. Bukan karena
       petugasnya tidak memindai, melainkan karena `wajibPindai` mati,
       sehingga MCS.tandai tidak pernah mencari pemindaian dan `pindaiId`
       selalu null. Sebuah dimensi yang nol untuk semua orang tidak
       membedakan siapa pun; ia hanya menurunkan semua nilai bersama-sama
       dan membuat rapor terbaca ‘semua buruk’.

       Dinyalakan, bukan disiasati. Perusahaan dengan 87 cabang yang sungguh
       mengukur kebersihan memang memakai tag — seluruh 1.223 areanya sudah
       bertag sejak disemai, dan tidak ada satu pun objek bertag yang bisa
       menghalangi penandaan. Menyalakannya juga berarti demo ini akhirnya
       MEMAKAI jalur pindai yang sudah dibangun, bukan menyimpannya sebagai
       fitur yang tidak pernah tersentuh.

       DUA AKIBAT YANG HARUS DIKETAHUI:

         1. Sesudah ini, menandai tugas selesai MENUNTUT pemindaian tag
            lebih dulu — itu memang maksud fiturnya, dan layar Ronda
            menyediakannya.
         2. `MCS.config()` TIDAK menerima korporatId: setelan MCS berlaku
            untuk seluruh aplikasi, bukan per korporat. Menyalakannya di
            sini menyalakannya bagi setiap korporat yang ada — saat ini
            hanya Buana, tetapi itu kebetulan keadaan datanya, bukan
            jaminan. Disebut di sini supaya yang menambah korporat kedua
            tidak menemukannya sebagai kejutan. */
    if (MCS.simpanConfig && !MCS.config().wajibPindai) {
      MCS.simpanConfig({ wajibPindai: true });
      lap.pindaiDinyalakan = true;
    }

    /* Kehadiran hari ini, supaya tugas tidak ditandai selesai atas nama
       orang yang tercatat tidak masuk — dua tabel yang saling menyangkal
       di dalam satu basis data yang sama. */
    var absen = {};
    DB.where('mcsAbsensi', function (x) {
      return x.korporatId === kid && x.tgl === hariIni;
    }).forEach(function (x) { absen[x.pekerjaId] = x.status; });

    var kini = new Date();
    var menitKini = kini.getHours() * 60 + kini.getMinutes();

    /* ------------------------------------------------------- 1. TUGAS */
    var slot = MCS.tugasHari(kid, hariIni) || [];
    slot.forEach(function (s) {
      if (lap.ruangHabis) return;
      if (s.status === 'selesai') return;
      if (menitJam(s.jam) > menitKini) { lap.belumWaktunya++; return; }

      var pid = s.jadwal && s.jadwal.pekerjaId;
      var st = absen[pid];
      if (st && st !== 'hadir') { lap.dilewatiTidakHadir++; return; }

      var lid = lokasiArea(s.area);
      if (!lid) return;
      /* Undian per tugas TETAP ada, tetapi ambangnya milik cabangnya.
         Tanpa undian sama sekali, cabang berwatak 0,80 akan menyelesaikan
         persis delapan dari sepuluh tugas berturut-turut — keteraturan yang
         tidak pernah terjadi dan langsung terbaca sebagai karangan. */
      var kunci = lid + '|' + s.jadwal.id + '|' + s.jam;
      var h = 0;
      for (var i = 0; i < kunci.length; i++) h = (h * 33 + kunci.charCodeAt(i)) & 0x7fffffff;
      if ((h % 1000) / 1000 > watak(lid)) { lap.dilewatiWatak++; return; }

      /* Dua baris, bukan satu: pemindaian DULU, penandaan kemudian — urutan
         yang sama persis dengan yang dilakukan petugas di lapangan. Kalau
         dibalik, MCS.tandai menolak dan tidak ada satu pun tugas bertambah. */
      if (ukur.sisa(576) < batasAman) { lap.ruangHabis = true; return; }
      var rp = MCS.catatPindai(s.area.id, { pekerjaId: pid, cara: 'kamera' });
      if (rp && rp.error) return;
      var r = MCS.tandai(kid, s.jadwal.id, hariIni, s.jam, 'selesai', oleh, {});
      if (r && r.error) return;
      lap.tugasDitambah++;
      lap.tugasBerbukti++;
    });

    /* ------------------------------------ 1b. BUKTI YANG TERTINGGAL

       Tugas yang sudah ditandai selesai SEBELUM `wajibPindai` menyala tidak
       punya pindaiId, dan tidak akan pernah punya: MCS.tandai hanya mencari
       pemindaian ketika ia dipanggil. Membiarkannya berarti dimensi Bukti
       tetap nol bagi hampir semua orang, dan seluruh kerja di atas sia-sia.

       Ditandai ULANG, bukan disunting langsung: `pindaiId` diisi MCS.tandai
       dari baris pemindaian yang sungguh ada, dan menuliskannya sendiri ke
       tabel berarti mengarang bukti yang tidak berpasangan dengan apa pun.
       Penandaan ulang memperbarui baris yang sama, jadi tidak ada baris
       tugas baru — hanya baris pindainya.

       TIDAK SEMUANYA. Peluangnya mengikuti watak cabang yang sama:
       cabang yang tugasnya banyak terlewat juga cabang yang petugasnya
       lebih sering lupa memindai. Kalau semuanya diberi bukti, dimensi ini
       bernilai seratus untuk semua orang — sama tidak bergunanya dengan
       nol untuk semua orang, hanya terbalik. */
    lap.buktiDilengkapi = 0;
    (MCS.tugasHari(kid, hariIni) || []).forEach(function (s2) {
      if (lap.ruangHabis) return;
      if (s2.status !== 'selesai') return;
      var rec = MCS.catatanSlot(s2.jadwal.id, hariIni, s2.jam);
      if (!rec || rec.pindaiId) return;
      var lid2 = lokasiArea(s2.area);
      if (!lid2) return;
      var kun = 'b|' + lid2 + '|' + s2.jadwal.id + '|' + s2.jam;
      var hh = 0;
      for (var q = 0; q < kun.length; q++) hh = (hh * 33 + kun.charCodeAt(q)) & 0x7fffffff;
      if ((hh % 1000) / 1000 > watak(lid2)) return;
      if (ukur.sisa(200) < batasAman) { lap.ruangHabis = true; return; }
      var rp2 = MCS.catatPindai(s2.area.id, {
        pekerjaId: rec.pekerjaId || s2.jadwal.pekerjaId, cara: 'kamera' });
      if (rp2 && rp2.error) return;
      var r2 = MCS.tandai(kid, s2.jadwal.id, hariIni, s2.jam, 'selesai', oleh, {});
      if (r2 && r2.error) return;
      lap.buktiDilengkapi++;
    });

    /* --------------------------------------------------- 2. INSPEKSI

       Cabang tanpa satu pun inspeksi tampil ber-APPA kosong, dan kolom mutu
       yang kosong pada separuh cabang membuat pembandingan antar cabang —
       satu-satunya alasan halaman itu ada — tidak bisa dilakukan. Yang
       ditambahkan hanya pada cabang yang memang belum punya. */
    var sudah = {};
    MCS.inspeksi(kid, { dari: U.iso(U.addDays(new Date(), -29)), sampai: hariIni })
      .forEach(function (x) {
        var lid = lokasiArea(MCS.areaSatu(x.areaId));
        if (lid) sudah[lid] = (sudah[lid] || 0) + 1;
      });

    var penilai = DB.all('users').filter(function (u) {
      return u.korporatId === kid && u.role === 'korporat' &&
             ['supervisor', 'cabang', 'leader'].indexOf(u.mcsPeran) >= 0;
    });
    var areaPerLok = {};
    MCS.area(kid).forEach(function (a) {
      var lid = lokasiArea(a);
      if (lid) (areaPerLok[lid] = areaPerLok[lid] || []).push(a);
    });

    if (penilai.length) {
      LOKASI.semua(kid).forEach(function (l) {
        if (lap.ruangHabis) return;
        var perlu = 2 - (sudah[l.id] || 0);
        var kandidat = areaPerLok[l.id] || [];
        for (var n = 0; n < perlu && kandidat.length; n++) {
          if (ukur.sisa(300) < batasAman) { lap.ruangHabis = true; return; }
          /* Mutu mengikuti watak cabang yang sama dengan capaiannya: cabang
             yang tugasnya banyak terlewat memang cenderung lebih kotor, dan
             dua angka yang bergerak sendiri-sendiri akan membuat halaman itu
             menunjukkan cabang berapes 40% dengan mutu terbaik. */
          var w = watak(l.id);
          var skor = w > 0.85 ? 1 : (w > 0.72 ? 2 : (w > 0.60 ? 3 : (w > 0.52 ? 4 : 5)));
          var a3 = kandidat[(n + l.id.length) % kandidat.length];
          var ri = MCS.buatInspeksi(a3.id, {
            tgl: U.iso(U.addDays(new Date(), -(n + 1))),
            skor: skor,
            catatan: skor >= 4
              ? ['Debu tebal di sudut belakang.', 'Lantai masih berbekas.'][n % 2]
              : ''
          }, penilai[(n + l.id.length) % penilai.length]);
          if (ri.error) continue;
          lap.inspeksiDitambah++;
        }
      });
    }

    DB.save(true);
    var pakai = 0;
    for (var j = 0; j < localStorage.length; j++) {
      pakai += (localStorage.getItem(localStorage.key(j)) || '').length;
    }
    lap.terpakaiKB = Math.round(pakai / 1024);
    lap.sisaKB = Math.round((5 * 1024 * 1024 - pakai) / 1024);
    return lap;
  }

  return { jalankan: jalankan, watak: watak };
})();
