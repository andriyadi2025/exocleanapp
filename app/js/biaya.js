/* ==========================================================================
   biaya.js — biaya kebersihan, diiris empat cara
   --------------------------------------------------------------------------
   PERTANYAAN YANG DIJAWAB

   "Area mana yang paling mahal dibersihkan, dan apakah itu wajar?"
   "Gedung mana yang paling mahal per meter persegi?"
   "Biaya tiap petugas jatuh ke area yang mana?"

   Gedung mengeluarkan uang untuk kebersihan setiap bulan, tetapi tidak ada
   yang tahu ke mana perginya. Toilet yang menghabiskan tiga kali lipat biaya
   lobi per meter persegi bukan pemborosan — memang begitu sifatnya. Yang tidak
   wajar adalah dua toilet berukuran sama dengan selisih biaya empat kali, dan
   itu tidak akan pernah terlihat tanpa perhitungan per area.

   TIGA SUMBER BIAYA YANG DIHITUNG

     · TENAGA    — dua dasar yang bisa dipilih, lihat di bawah
     · BAHAN     — mutasi keluar bahan habis pakai × harga satuan
     · PEKERJAAN — biaya pekerjaan tambahan yang sudah ditutup

   DUA DASAR BIAYA TENAGA, DAN KENAPA KEDUANYA ADA

     · BEBAN — jam teoretis dari luas area (laju ISSA) × tarif per jam yang
       diketik. Ini MODEL: berapa yang SEHARUSNYA dikeluarkan bila areanya
       dikerjakan menurut laju standar. Berguna sebelum penggajian diisi,
       dan berguna sebagai pembanding.

     · GAJI — biaya penggajian yang SUNGGUH dikeluarkan bulan itu, dibagi ke
       area menurut tugas yang benar-benar dikerjakan tiap petugas. Ini uang
       yang betul-betul keluar dari rekening.

   Keduanya disediakan karena keduanya menjawab pertanyaan berbeda, dan
   menampilkan salah satunya sebagai "biaya" tanpa menyebut yang mana adalah
   cara paling mudah membuat orang mengambil keputusan atas angka yang bukan
   uangnya. Selisih antara keduanya justru yang paling berguna: area yang
   nyatanya jauh lebih mahal daripada modelnya adalah area yang bebannya
   salah dihitung, atau yang dikerjakan berlebihan.

   YANG SENGAJA TIDAK DIBAGI KE AREA

   Biaya servis peralatan dan pembelian bahan yang tidak menyebut area tetap
   dihitung, tetapi ditampilkan sebagai BIAYA GEDUNG yang tidak teralokasi —
   bukan dibagi rata ke seluruh area.

   Membaginya rata akan menghasilkan angka yang terlihat lebih rapi dan lebih
   salah: mesin poles yang diservis tidak dipakai merata di semua area, dan
   sabun yang dibeli tanpa mencatat areanya tidak dipakai di mana-mana secara
   adil. Angka yang mengaku tahu sesuatu yang tidak diketahuinya lebih
   berbahaya daripada angka yang mengaku tidak tahu.

   BATAS YANG HARUS DISEBUT

     1. Tarif tenaga adalah ANGKA YANG DIMASUKKAN, bukan diambil dari
        penggajian — MCS tidak memegang data gaji, dan tidak seharusnya.
     2. Harga bahan memakai RATA-RATA BERTIMBANG dari nota penerimaan bila
        ada, dan harga terkini bila belum ada. Yang dipakai disebutkan per
        barang, tidak dicampur diam-diam.

        Dulu selalu harga terkini, sehingga biaya bulan Maret dihitung
        dengan harga bulan Agustus — kecil bagi barang yang harganya
        bergeser sedikit, menyesatkan bagi yang melonjak. Rata-ratanya
        BERTIMBANG, bukan rata-rata harga: seratus botol seharga 20.000
        lalu sepuluh seharga 30.000 memberi 20.909, bukan 25.000.
     3. Ini biaya OPERASIONAL, bukan biaya penuh. Tidak termasuk listrik, air,
        atau sewa gudang. Penyusutan peralatan dihitung dan dilaporkan, tetapi
        baru ikut dijumlahkan bila dinyalakan — lihat BAWAAN.masukPenyusutan.
     4. BIAYA PER OBJEK ADALAH PEMBAGIAN, BUKAN PENGUKURAN.

        Jadwal dan tugas disusun per AREA, bukan per objek. Yang tercatat
        tentang objek hanyalah bukti KEHADIRAN — pemindaian tag — dan itu
        bukan catatan pekerjaan.

        Karena itu biaya area TIDAK dibagi menurut jumlah pemindaian. Objek
        yang sering dipindai justru sering yang dilewati dalam perjalanan,
        bukan yang dikerjakan lama; angka yang lahir dari sana akan terlihat
        rinci dan hampir tidak berarti apa-apa.

        Yang dipakai membagi adalah PERKIRAAN MENIT sekali membersihkan tiap
        objek — angka yang diisi orang yang tahu pekerjaannya, bukan yang
        disimpulkan mesin dari jejak pemindaian. Formulir objek mengusulkan
        angka awal menurut jenisnya, terlihat dan bisa diubah.

        Tiga batasnya, dan semuanya disebutkan di layar:

          · yang dibagi hanya TENAGA. Bahan dan pekerjaan tambahan tidak
            melekat pada objek tertentu.
          · objek yang menitnya belum diisi dikeluarkan dari pembagian, bukan
            dianggap gratis; porsinya muncul sebagai "belum terbagi".
          · hasilnya tetap PEMBAGIAN. Ia menjawab "kira-kira ke mana tenaga
            ini pergi", bukan "berapa sebenarnya biaya wastafel ini".
   ========================================================================== */
window.BIAYA = (function () {
  'use strict';

  var BAWAAN = {
    /* Tarif tenaga per jam. Diisi korporat sendiri — dan sengaja dibiarkan nol
       secara bawaan supaya tidak ada yang membaca angka karangan sebagai
       kenyataan pada hari pertama membuka halaman ini. */
    tarifJam: 0,
    /* 'beban' = jam teoretis × tarif. 'gaji' = penggajian sungguhan.
       Bawaannya 'beban' karena ia bekerja tanpa data gaji sama sekali —
       memaksa orang mengisi seluruh gaji sebelum bisa melihat biaya berarti
       halaman ini kosong pada hari pertama, dan halaman kosong tidak pernah
       dibuka lagi. */
    dasarTenaga: 'beban',
    /* Penyusutan peralatan ikut dijumlahkan atau tidak.

       Bawaannya TIDAK, dan itu pilihan yang disengaja. Angka pada halaman
       ini paling sering dibandingkan dengan nilai kontrak, dan kontrak
       kebersihan membayar pekerjaan bulan itu -- bukan penghapusan nilai
       mesin yang dibeli tiga tahun lalu. Mencampurkan keduanya diam-diam
       membuat marjin terlihat lebih tipis daripada yang disepakati kedua
       pihak.

       Yang menyusun anggaran penggantian alat tetap memerlukannya, jadi
       angkanya SELALU dihitung dan selalu dilaporkan -- yang diatur di sini
       hanya apakah ia masuk ke dalam total. */
    masukPenyusutan: false
  };

  function config(korporatId) {
    var k = DB.find('korporat', korporatId);
    var simpan = (k && k.biayaConfig) || {};
    var out = {};
    Object.keys(BAWAAN).forEach(function (kk) {
      if (simpan[kk] === undefined) { out[kk] = BAWAAN[kk]; return; }
      /* Bentuknya mengikuti BAWAAN, bukan dipaksa menjadi angka.
         Sebelumnya seluruh nilai dilewatkan Number(), yang benar selama
         semua pengaturannya angka — dan diam-diam mengubah 'beban' menjadi
         NaN pada hari sebuah pengaturan berupa teks ditambahkan. NaN itu
         tidak melempar galat apa pun: ia hanya tidak pernah sama dengan
         'gaji', jadi pilihannya seolah tidak berpengaruh. */
      out[kk] = typeof BAWAAN[kk] === 'number' ? Number(simpan[kk]) : simpan[kk];
    });
    return out;
  }

  function simpanConfig(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var c = Object.assign({}, (k && k.biayaConfig) || {});
    if (patch.tarifJam !== undefined) {
      var t = Number(patch.tarifJam);
      if (!(t >= 0)) return { error: I18N.t('Tarif per jam tidak boleh negatif.') };
      c.tarifJam = Math.round(t);
    }
    if (patch.dasarTenaga !== undefined) {
      c.dasarTenaga = patch.dasarTenaga === 'gaji' ? 'gaji' : 'beban';
    }
    /* Kotak centang mengirim true/false, bukan teks. Tanpa baris ini ia
       tersimpan diam-diam sebagai tidak ada, dan saklarnya seolah rusak. */
    if (patch.masukPenyusutan !== undefined) c.masukPenyusutan = !!patch.masukPenyusutan;
    DB.update('korporat', korporatId, { biayaConfig: c });
    return { ok: true };
  }

  /* ------------------------------------------------------- perhitungan */

  /**
   * Berapa tugas yang BENAR-BENAR diselesaikan tiap petugas di tiap area.
   *
   * Periodenya disapu hari demi hari dengan fungsi yang sama yang dipakai
   * beranda dan KPI — tugas tidak tersimpan sebagai baris, ia dihasilkan dari
   * jadwal. Menghitungnya dengan cara lain akan menghasilkan angka ketiga yang
   * berbeda dari dua yang sudah ada.
   *
   * Dihitung SEKALI lalu dipakai untuk pembagian per area dan per petugas
   * sekaligus: menyapu tiga puluh satu hari dua kali hanya untuk mendapat
   * angka yang sama adalah setengah detik yang dibayar pengguna tanpa alasan.
   */
  function sapuTugas(korporatId, per) {
    var perOrang = {};     /* pekerjaId → { total, area: { areaId: n } } */
    var perArea = {};      /* areaId    → jumlah tugas selesai */
    var totalSelesai = 0;
    var hariIni = U.today();

    var d = new Date(per.dari + 'T00:00:00');
    var batas = new Date(per.sampai + 'T00:00:00');
    while (d <= batas) {
      var tgl = U.iso(d);
      if (tgl > hariIni) break;
      MCS.tugasHari(korporatId, tgl).forEach(function (t) {
        if (t.status !== 'selesai') return;
        /* Dihitung menurut yang MENGERJAKAN, bukan yang dijadwalkan — kalau
           tidak, biaya petugas pengganti jatuh ke orang yang justru tidak
           masuk hari itu. */
        var rec = MCS.catatanSlot(t.jadwalId, t.tgl, t.jam);
        var pid = (rec && rec.pekerjaId) || (t.pekerja && t.pekerja.id);
        var aid = t.area && t.area.id;
        if (!pid || !aid) return;
        var o = perOrang[pid] || (perOrang[pid] = { total: 0, area: {} });
        o.total++;
        o.area[aid] = (o.area[aid] || 0) + 1;
        perArea[aid] = (perArea[aid] || 0) + 1;
        totalSelesai++;
      });
      d.setDate(d.getDate() + 1);
    }
    return { perOrang: perOrang, perArea: perArea, total: totalSelesai };
  }


  /**
   * Biaya satu bulan, dipecah per area.
   *
   * @param tahun/bulan periode yang dihitung
   */
  function hitung(korporatId, tahun, bulan) {
    var cfg = config(korporatId);
    var per = KPI.periodeBulan(tahun, bulan);
    var bebanCfg = BEBAN.config(korporatId);

    var area = MCS.area(korporatId);
    var peta = {};
    area.forEach(function (a) {
      var h = BEBAN.hitungArea(a, bebanCfg);
      peta[a.id] = {
        area: a, jenis: MCS.jenisArea(a.jenis), luas: h.luas, adaLuas: h.adaLuas,
        /* Berapa kali seminggu area ini benar-benar dijadwalkan. Nol berarti
           tidak ada yang membersihkannya. */
        frekuensi: h.frekuensi,
        /* Jam per BULAN, bukan per minggu: biaya selalu dibaca per bulan, dan
           mengalikan 4,345 di layar membuat orang menghitungnya sendiri. */
        jam: h.jamPerMinggu === null ? null : Math.round(h.jamPerMinggu * 4.345 * 10) / 10,
        tenaga: 0, bahan: 0, kerja: 0, total: 0
      };
    });

    /* ---- tugas yang benar-benar dikerjakan ---- */
    var sapu = sapuTugas(korporatId, per);

    /* ---- tenaga ----
       Dua dasar, dan yang dipakai DISEBUTKAN pada hasilnya. Angka biaya yang
       tidak menyebut dari mana ia datang akan dibaca sebagai uang sungguhan
       oleh siapa pun yang tidak membuka berkas ini. */
    var perPetugas = [], tenagaTanpaArea = 0, gajiTakTerpakai = [];
    if (cfg.dasarTenaga === 'gaji' && window.GAJI) {
      MCS.pekerja(korporatId).forEach(function (p) {
        var h = GAJI.hitung(korporatId, p.id, tahun, bulan);
        if (!h || !h.bersih) return;
        var o = sapu.perOrang[p.id];
        var baris = { pekerja: p, biaya: h.bersih, tugas: o ? o.total : 0, area: [] };
        if (!o || !o.total) {
          /* Dibayar, tetapi tidak ada satu pun tugas selesai atas namanya.
             Biayanya TIDAK dibagi rata ke seluruh area — ia dipisahkan dan
             disebutkan, karena penyebabnya harus dilihat manusia: bisa jadi
             ia penyelia yang memang tidak memegang jadwal, bisa jadi
             absensinya tidak pernah ditutup menjadi tugas selesai. */
          tenagaTanpaArea += h.bersih;
          gajiTakTerpakai.push({ nama: p.nama, biaya: h.bersih });
        } else {
          Object.keys(o.area).forEach(function (aid) {
            var bagian = Math.round(h.bersih * o.area[aid] / o.total);
            if (peta[aid]) peta[aid].tenaga += bagian;
            else tenagaTanpaArea += bagian;
            baris.area.push({ areaId: aid,
              nama: peta[aid] ? peta[aid].area.nama : '?',
              tugas: o.area[aid], biaya: bagian });
          });
          baris.area.sort(function (a, b) { return b.biaya - a.biaya; });
        }
        perPetugas.push(baris);
      });
      perPetugas.sort(function (a, b) { return b.biaya - a.biaya; });
    } else {
      Object.keys(peta).forEach(function (id) {
        var v = peta[id];
        v.tenaga = v.jam === null ? 0 : Math.round(v.jam * (cfg.tarifJam || 0));
      });
      /* Pada dasar 'beban', biaya per petugas tidak bisa dihitung: jam
         teoretis melekat pada AREA, bukan pada orang. Dikembalikan kosong,
         dan layarnya yang menjelaskan — bukan diisi angka bagi rata. */
    }

    /* ---- bahan habis pakai ---- */
    var stokPeta = {}, hargaPeta = {};
    MCS.stok(korporatId).forEach(function (s) {
      stokPeta[s.id] = s;
      /* Sampai AKHIR PERIODE, bukan sampai hari ini: biaya bulan Maret
         tidak boleh mengetahui harga yang baru dibayar bulan Agustus. */
      hargaPeta[s.id] = MCS.hargaPakai
        ? MCS.hargaPakai(s.id, per.sampai)
        : { harga: Number(s.harga) || 0, dasar: 'terakhir' };
    });
    var bahanTanpaArea = 0, bahanTanpaHarga = 0, bahanHilang = 0, hilangJml = 0;
    var bahanDariNota = 0, bahanDariTerakhir = 0;
    DB.where('mcsStokMutasi', function (m) {
      var t = String(m.pada).slice(0, 10);
      return m.korporatId === korporatId && t >= per.dari && t <= per.sampai && m.jumlah < 0;
    }).forEach(function (m) {
      var s = stokPeta[m.stokId];
      if (!s) return;
      var hp = hargaPeta[m.stokId] || { harga: 0, dasar: 'terakhir' };
      if (!hp.harga) { bahanTanpaHarga++; return; }
      if (hp.dasar === 'nota') bahanDariNota++; else bahanDariTerakhir++;
      var nilai = Math.abs(m.jumlah) * hp.harga;

      /* KEHILANGAN GUDANG DIPISAH DARI BIAYA MEMBERSIHKAN.

         Sebelumnya setiap mutasi negatif jatuh ke areanya, termasuk barang
         yang tumpah atau kedaluwarsa. Akibatnya biaya membersihkan sebuah
         toilet naik karena ada dus jatuh di gudang — dan yang memperbaiki
         keadaan itu bukan petugas kebersihan melainkan cara menyimpannya.

         Uangnya tetap dihitung: ia nyata dan sudah keluar. Ia hanya tidak
         ditempelkan pada area, dan dilaporkan dengan namanya sendiri. */
      if (MCS.adalahKehilangan && MCS.adalahKehilangan(m)) {
        bahanHilang += nilai; hilangJml++;
        return;
      }
      /* Penyesuaian opname dan perpindahan antar lokasi juga bukan biaya
         membersihkan. Selisih opname adalah koreksi catatan, bukan pekerjaan;
         perpindahan hanya memindahkan barang yang sama ke rak lain. */
      var j = MCS.jenisMutasi ? MCS.jenisMutasi(m.jenis) : {};
      /* RETUR juga bukan biaya membersihkan — dan bukan kehilangan.
         Barang cacat yang dikembalikan mengurangi saldo, tetapi uangnya
         kembali; menghitungnya sebagai biaya berarti membebankan kepada
         sebuah toilet ongkos barang yang tidak pernah dipakai di mana pun,
         dan membuat gudang yang rajin mengembalikan barang cacat terlihat
         paling boros. */
      if (j.opname || j.pindah || j.retur) return;

      if (m.areaId && peta[m.areaId]) peta[m.areaId].bahan += nilai;
      /* Tidak dibagi rata — lihat catatan di kepala berkas. */
      else bahanTanpaArea += nilai;
    });

    /* ---- pekerjaan tambahan yang sudah ditutup ---- */
    var kerjaTanpaArea = 0;
    DB.where('mcsKerja', function (x) {
      var t = String(x.selesaiAt || x.diminta).slice(0, 10);
      return x.korporatId === korporatId && x.status === 'selesai' &&
             t >= per.dari && t <= per.sampai && x.biaya;
    }).forEach(function (x) {
      if (x.areaId && peta[x.areaId]) peta[x.areaId].kerja += x.biaya;
      else kerjaTanpaArea += x.biaya;
    });

    /* ---- servis peralatan: selalu tingkat gedung ---- */
    var asetId = {};
    DB.where('mcsAset', function (x) { return x.korporatId === korporatId; })
      .forEach(function (x) { asetId[x.id] = 1; });
    var servis = DB.where('mcsAsetRiwayat', function (r) {
      return asetId[r.asetId] && r.biaya && r.tgl >= per.dari && r.tgl <= per.sampai;
    }).reduce(function (s, r) { return s + r.biaya; }, 0);

    /* ---- penyusutan peralatan ----
       Servis di atas adalah uang yang KELUAR bulan ini. Penyusutan adalah
       nilai mesin yang HABIS bulan ini tanpa uang berpindah. Keduanya biaya,
       tetapi hanya yang pertama muncul di rekening -- dan itulah sebabnya
       yang kedua dilaporkan terpisah, bukan dilebur.

       Hanya alat yang sudah dibeli sebelum periode berakhir dan belum habis
       masa manfaatnya sebelum periode dimulai. Tanpa dua batas ini, vacuum
       yang dibeli tahun depan sudah membebani bulan ini, dan yang nilainya
       sudah nol lima tahun lalu masih ditagih terus. */
    var penyusutan = 0, asetSusut = 0, asetTanpaNilai = 0;
    if (window.ASET) {
      ASET.semua(korporatId).forEach(function (x) {
        var e = ASET.ekonomi(x);
        if (!e) return;
        if (!e.siap) { asetTanpaNilai++; return; }
        if (String(x.tglBeli).slice(0, 10) > per.sampai) return;
        if (e.habisPada <= per.dari) return;
        penyusutan += e.penyusutanBulan;
        asetSusut++;
      });
    }

    var baris = Object.keys(peta).map(function (id) {
      var v = peta[id];
      v.total = v.tenaga + v.bahan + v.kerja;
      v.perM2 = v.adaLuas && v.luas ? Math.round(v.total / v.luas) : null;
      /* Apakah luasnya boleh masuk penyebut biaya per meter persegi.

         Sejak lokasi bertingkat diperkenalkan, satu tanah bisa tercatat dua
         kali: sekali sebagai petak tempat gedung berdiri, sekali lagi
         sebagai ruangan-ruangan di dalam gedung itu. Petak 600 m yang
         berisi gedung dengan ruangan 100 m menjadi 700 m pada penjumlahan
         lugas, padahal yang disapu orang hanya salah satunya. Penyebut yang
         terlalu besar membuat biaya per meter terlihat lebih murah daripada
         yang sebenarnya -- dan itu angka yang dibawa orang ke meja
         perundingan.

         Penyebut yang benar adalah luas yang MEMANG DIBERSIHKAN: punya
         jadwal, atau memakan biaya bulan ini. Petak yang hanya menjadi
         wadah gedung tidak punya keduanya, jadi ia keluar dari penyebut --
         dan bila kelak halamannya ikut dijadwalkan disapu, ia masuk lagi
         dengan sendirinya, karena saat itu ia memang dibersihkan. */
      /* Yang menjawab "ada yang membersihkannya?" adalah FREKUENSI, bukan jam.
         jamPerMinggu bernilai NOL ketika tidak ada jadwal, dan null hanya
         ketika luasnya belum diisi — memakainya sebagai penanda membuat setiap
         petak berluas ikut penyebut, yaitu persis keadaan yang hendak
         diperbaiki di sini. */
      v.dibersihkan = v.frekuensi > 0 || v.total > 0;
      return v;
    }).sort(function (a, b) { return b.total - a.total; });

    /* ---- objek ----

       Mula-mula halaman ini hanya menyebut JUMLAH PEMINDAIAN, dan alasannya
       masih berlaku: membagi biaya area menurut jumlah pemindaian akan
       menghasilkan angka yang terlihat rinci dan hampir tidak berarti —
       objek yang sering dipindai justru sering yang dilewati di perjalanan,
       bukan yang dikerjakan lama.

       Yang berubah bukan cara membaginya, melainkan ADANYA MASUKAN BARU:
       tiap objek kini bisa diberi perkiraan menit sekali dibersihkan, dan
       angka itu diisi oleh orang yang tahu pekerjaannya. Biaya area dibagi
       menurut menit itu, bukan menurut pemindaian.

       Objek yang menitnya nol TIDAK dianggap gratis — ia dikeluarkan dari
       pembagian, dan porsi yang belum terbagi disebutkan tersendiri. Sebuah
       ruangan yang setengah objeknya belum diisi menitnya akan memperlihatkan
       setengah biayanya sebagai 'belum terbagi', bukan menumpuk seluruhnya
       ke objek yang kebetulan sudah diisi. */
    var perObjek = [], objekTanpaMenit = 0, objekBerbiaya = 0;
    var objekArea = {};
    var semuaObjek = MCS.objekKorporat ? MCS.objekKorporat(korporatId) : [];
    /* BOBOT sebuah objek adalah menit DIKALI berapa kali seminggu ia
       dikerjakan. Memakai menit saja menyamakan kaca yang dicuci sepekan
       sekali dengan lantai yang dipel tiap hari, lalu membebani kaca itu
       biaya tenaga tujuh kali lebih besar daripada yang sebenarnya
       dihabiskan untuknya. Frekuensi kosong berarti ikut areanya, dan
       karena pembilang dan penyebut sama-sama di dalam satu area, memakai
       angka satu untuk keduanya menghasilkan pembagian yang sama persis
       seperti sebelumnya. */
    function bobotObjek(o) {
      var m = Number(o.menitPerKali) || 0;
      if (!m) return 0;
      return m * (Number(o.kaliPerMinggu) || 1);
    }
    semuaObjek.forEach(function (o) {
      var w = bobotObjek(o);
      if (!w) { objekTanpaMenit++; return; }
      objekArea[o.areaId] = (objekArea[o.areaId] || 0) + w;
    });

    /* Berapa rupiah dari tiap area yang berhasil ditempelkan ke objek. */
    var objekTerbagi = 0;
    semuaObjek.forEach(function (o) {
      var n = DB.where('mcsPindai', function (x) {
        var t = String(x.pada || '').slice(0, 10);
        return x.objekId === o.id && t >= per.dari && t <= per.sampai;
      }).length;
      var m = bobotObjek(o);
      var totalMenit = objekArea[o.areaId] || 0;
      var v = peta[o.areaId];
      /* Bahan dan pekerjaan tambahan TIDAK ikut dibagi ke objek: sabun yang
         keluar untuk sebuah toilet tidak melekat pada wastafelnya, dan cuci
         kaca sekali setahun bukan bagian dari pekerjaan harian. Yang dibagi
         hanya TENAGA, karena menit memang mengukur tenaga. */
      var biaya = (m && totalMenit && v)
        ? Math.round(v.tenaga * m / totalMenit)
        : null;
      if (biaya) { objekTerbagi += biaya; objekBerbiaya++; }
      perObjek.push({ objek: o, areaId: o.areaId,
        area: v ? v.area.nama : '',
        menit: m, pindai: n, biaya: biaya });
    });
    /* Urut menurut biaya bila ada yang berbiaya; kalau belum ada satu pun
       menit terisi, kembali ke urutan pemindaian seperti dahulu — layar yang
       seluruhnya nol tidak memberi tahu apa pun. */
    perObjek.sort(function (a, b) {
      return objekBerbiaya ? (b.biaya || 0) - (a.biaya || 0) : b.pindai - a.pindai;
    });
    /* Tenaga yang tidak sampai ke objek mana pun: area yang belum punya satu
       pun objek bermenit. */
    var tenagaArea = baris.reduce(function (t, v) { return t + v.tenaga; }, 0);
    var objekBelumTerbagi = Math.max(0, tenagaArea - objekTerbagi);

    /* ---- per gedung ----
       Digulung dari area, bukan dihitung ulang: gedung tidak punya biaya
       sendiri, ia hanya wadah areanya. Area yang belum ditetapkan gedungnya
       mendapat barisnya sendiri, bukan dihilangkan — yang luput dari
       pembandingan adalah yang paling mudah terlupakan. */
    var perLokasi = [];
    if (window.LOKASI) {
      var wadah = {};
      baris.forEach(function (v) {
        var gid = v.area.lokasiId || '';
        var w = wadah[gid] || (wadah[gid] = {
          lokasiId: gid || null,
          nama: gid ? LOKASI.nama(gid) : I18N.t('Belum ditetapkan'),
          area: 0, luas: 0, luasBersih: 0,
          tenaga: 0, bahan: 0, kerja: 0, total: 0
        });
        w.area++; w.luas += v.luas; w.tenaga += v.tenaga;
        if (v.dibersihkan) w.luasBersih += v.luas;
        w.bahan += v.bahan; w.kerja += v.kerja; w.total += v.total;
      });
      perLokasi = Object.keys(wadah).map(function (kk) {
        var w = wadah[kk];
        w.perM2 = w.luasBersih ? Math.round(w.total / w.luasBersih) : null;
        return w;
      }).sort(function (a, b) { return b.total - a.total; });
      /* Satu gedung saja bukan portofolio — menampilkan tabel berisi satu
         baris yang isinya sama dengan totalnya hanya menambah layar. */
      if (perLokasi.length < 2) perLokasi = [];
    }

    var totalArea = baris.reduce(function (s, v) { return s + v.total; }, 0);
    var takTeralokasi = bahanTanpaArea + kerjaTanpaArea + servis + tenagaTanpaArea +
      bahanHilang + (cfg.masukPenyusutan ? penyusutan : 0);
    var luasTotal = baris.reduce(function (s, v) { return s + v.luas; }, 0);
    var luasBersih = baris.reduce(function (s, v) {
      return s + (v.dibersihkan ? v.luas : 0);
    }, 0);

    /* Kontrak yang berlaku pada periode ini — untuk dibandingkan. */
    var kontrak = window.KONTRAK ? KONTRAK.berlakuPada(korporatId, per.sampai) : [];
    var nilaiKontrak = kontrak.reduce(function (s, x) { return s + (x.nilaiBulanan || 0); }, 0);

    return {
      periode: per, cfg: cfg,
      /* Disebutkan pada hasilnya, bukan hanya diketahui pemanggilnya. */
      dasarTenaga: cfg.dasarTenaga,
      perPetugas: perPetugas, perLokasi: perLokasi, perObjek: perObjek,
      /* Berapa objek yang menitnya sudah diisi, berapa yang belum, dan
         berapa rupiah tenaga yang karenanya belum sampai ke objek mana pun.
         Tanpa tiga angka ini, tabel per objek terlihat lengkap padahal
         separuh biayanya tidak ada di sana. */
      objekBerbiaya: objekBerbiaya, objekTanpaMenit: objekTanpaMenit,
      objekTerbagi: objekTerbagi, objekBelumTerbagi: objekBelumTerbagi,
      tenagaTanpaArea: tenagaTanpaArea, gajiTakTerpakai: gajiTakTerpakai,
      tugasSelesai: sapu.total,
      baris: baris,
      tenaga: baris.reduce(function (s, v) { return s + v.tenaga; }, 0) + tenagaTanpaArea,
      bahan: baris.reduce(function (s, v) { return s + v.bahan; }, 0) + bahanTanpaArea,
      kerja: baris.reduce(function (s, v) { return s + v.kerja; }, 0) + kerjaTanpaArea,
      servis: servis,
      totalArea: totalArea,
      bahanTanpaArea: bahanTanpaArea, kerjaTanpaArea: kerjaTanpaArea,
      /* Barang yang rusak, tumpah, atau kedaluwarsa. Tetap masuk total —
         uangnya memang sudah keluar — tetapi tidak melekat pada area mana
         pun, dan disebut dengan namanya sendiri supaya bisa ditindaklanjuti
         oleh orang yang tepat. */
      bahanHilang: bahanHilang, hilangJml: hilangJml,
      takTeralokasi: takTeralokasi,
      total: totalArea + takTeralokasi,
      /* Seluruh luas yang TERDAFTAR -- termasuk petak yang hanya menjadi
         wadah gedung. Dilaporkan supaya selisihnya terhadap luasBersih
         terlihat, bukan hilang diam-diam. */
      luasTotal: luasTotal,
      /* Luas yang benar-benar dibersihkan -- penyebut biaya per meter. */
      luasBersih: luasBersih,
      perM2: luasBersih ? Math.round((totalArea + takTeralokasi) / luasBersih) : null,
      /* Nilai peralatan yang habis bulan ini. Masuk total HANYA bila
         diminta -- lihat catatan pada BAWAAN.masukPenyusutan. */
      penyusutan: penyusutan,
      masukPenyusutan: !!cfg.masukPenyusutan,
      asetSusut: asetSusut,
      /* Alat yang harga belinya, tanggalnya, atau masa manfaatnya belum
         diisi. Tanpa disebutkan, penyusutan terlihat kecil dan tidak ada
         yang tahu sebabnya -- sama seperti bahan tanpa harga. */
      asetTanpaNilai: asetTanpaNilai,
      /* Berapa banyak barang yang belum punya harga — tanpa ini, biaya bahan
         terlihat kecil dan tidak ada yang tahu sebabnya. */
      bahanTanpaHarga: bahanTanpaHarga,
      stokTanpaHarga: MCS.stok(korporatId).filter(function (s) { return !s.harga; }),
      /* Berapa baris yang dihargai dari nota, dan berapa dari harga
         terakhir yang diketik tangan. Disebut supaya layar bisa
         mengatakannya: dua angka yang tampil serupa akan dipercaya
         serupa, padahal yang satu terbukti dibayar dan yang lain tidak. */
      bahanDariNota: bahanDariNota,
      bahanDariTerakhir: bahanDariTerakhir,
      nilaiKontrak: nilaiKontrak, kontrak: kontrak,
      /* Selisih kontrak dikurangi biaya operasional yang tercatat. BUKAN laba:
         biaya penuh mengandung hal-hal yang tidak dilacak MCS. */
      selisihKontrak: nilaiKontrak ? nilaiKontrak - (totalArea + takTeralokasi) : null
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig, hitung: hitung
  };
})();
