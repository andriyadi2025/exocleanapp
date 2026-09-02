/* ==========================================================================
   
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Sampai sekarang `gedung` hanya kolom teks bebas pada area. Akibatnya tiga
   hal yang semuanya menghalangi pelanggan besar:

     · Tidak ada yang menyatukan "Menara A" dengan "menara a" dan "Tower A".
     · Tidak ada tempat menyimpan apa pun TENTANG gedungnya — alamatnya,
       siapa penanggung jawabnya, berapa luas totalnya.
     · Tidak ada cara membandingkan gedung satu dengan yang lain, padahal
       justru itu pertanyaan yang dibawa pelanggan lima menara: MANA YANG
       SEDANG TERTINGGAL.

   Pelanggan satu gedung tidak membutuhkan apa pun dari berkas ini, dan
   itulah sebabnya seluruhnya OPSIONAL: selama gedungnya belum didaftarkan,
   aplikasi berperilaku persis seperti sebelumnya. Penyaring gedung dan
   halaman portofolio baru muncul ketika gedungnya memang lebih dari satu.
   Menuntut pelanggan satu gedung mendaftarkan "gedung" lebih dulu adalah
   biaya yang dibebankan kepada yang kecil demi melayani yang besar.

   YANG DIHITUNG, BUKAN DISIMPAN

   Angka portofolio — berapa area, berapa tugas selesai, berapa aduan
   terbuka — TIDAK disimpan di catatan gedung. Ia dihitung dari data yang
   sudah ada setiap kali dibuka, sama seperti seluruh rekap lain di aplikasi
   ini. Angka yang disimpan akan basi diam-diam, dan angka portofolio yang
   basi persis kebalikan dari gunanya.

   YANG TIDAK DIJANJIKAN

   Ini pengelompokan, bukan pemisahan. Petugas, bahan, dan aset tetap milik
   korporatnya, bukan milik gedung — karena di lapangan memang begitu:
   satu tim sering melayani dua menara, dan alat berpindah. Yang dipisahkan
   adalah AREA, dan segala yang menempel pada area mengikutinya.
   ========================================================================== */
var LOKASI = (function () {

  /* ------------------------------------------------------------- dasar */

  /**
   * Daftar lokasi — SUDAH DISARING menurut jangkauan pengguna yang masuk.
   *
   * Disaring DI SINI, bukan di tiap layar. Ada lebih dari sepuluh tempat
   * yang memanggil fungsi ini, dan satu saja yang terlewat berarti kepala
   * cabang melihat seluruh Indonesia pada satu halaman sementara halaman
   * lain menyembunyikannya — keadaan yang lebih membingungkan daripada
   * tidak menyaring sama sekali.
   */
  function semua(korporatId, termasukNonaktif) {
    var hasil = DB.where('mcsLokasi', function (g) {
      return g.korporatId === korporatId && (termasukNonaktif || g.aktif !== false);
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
    return window.MCSAKSES ? MCSAKSES.saringLokasi(hasil) : hasil;
  }

  function satu(id) { return id ? DB.find('mcsLokasi', id) : null; }

  function nama(id) {
    var g = satu(id);
    return g ? g.nama : '';
  }

  /**
   * Apakah korporat ini memakai banyak gedung.
   *
   * Dipakai untuk memutuskan apakah penyaring dan halaman portofolio
   * ditampilkan. Satu gedung terdaftar TIDAK dihitung sebagai "banyak":
   * pelanggan yang mendaftarkan satu gedung untuk mencatat alamatnya tidak
   * dengan sendirinya meminta seluruh lapisan pembanding.
   */
  function banyak(korporatId) {
    return semua(korporatId).length > 1;
  }

  /**
   * Alamat terstruktur → kolom teks yang sudah dipakai seluruh aplikasi.
   *
   * `alamat` dan `kota` TIDAK dihapus ketika alamat menjadi terstruktur.
   * Keduanya dibaca di banyak tempat — portofolio, baris pohon Struktur,
   * tebakan zona waktu, cetakan, dan surel — dan mengubah seluruhnya
   * sekaligus berarti satu perubahan besar yang gagalnya baru terlihat di
   * layar yang jarang dibuka. Yang benar: sumbernya satu (`wilayah`), dan
   * kolom lama DITURUNKAN darinya setiap kali disimpan.
   *
   * `kota` diisi lewat WILAYAH.pendek(), yang MEMPERTAHANKAN awalan “Kota”
   * dan hanya meringkas “Kabupaten” menjadi “Kab.”. Itu disengaja di sana:
   * “Kota Bandung” dan “Kabupaten Bandung” adalah dua wilayah berbeda, dan
   * membuang awalannya menyatukan keduanya menjadi satu nama yang tidak
   * bisa dibedakan lagi. Penebak zona waktu tetap cocok karena ia mencari
   * nama kotanya di dalam teks, bukan menyamakan seluruh baris.
   */
  function turunkanAlamat(isi, d) {
    if (!window.WILAYAH || d.wilayah === undefined) return;
    var w = d.wilayah || WILAYAH.kosong();
    isi.wilayah = w;
    if (WILAYAH.terisi(w)) {
      isi.alamat = WILAYAH.teks(w, { denganNegara: false });
      isi.kota = WILAYAH.pendek(w.l2 || '') || isi.kota || '';
    }
  }

  function tambah(korporatId, d) {
    var nm = String(d.nama || '').trim();
    if (!nm) return { error: I18N.t('Nama lokasi belum diisi.') };
    var kembar = semua(korporatId, true).filter(function (g) {
      return g.nama.toLowerCase() === nm.toLowerCase();
    });
    if (kembar.length) return { error: I18N.t('Lokasi dengan nama itu sudah ada.') };
    turunkanAlamat(d, d);
    var g = DB.insert('mcsLokasi', {
      korporatId: korporatId,
      nama: nm,
      alamat: String(d.alamat || '').trim(),
      kota: String(d.kota || '').trim(),
      /* Alamat TERSTRUKTUR — negara, provinsi, kota/kabupaten, kecamatan,
         kelurahan/desa, kode pos. Kolom `alamat` dan `kota` di atas
         diturunkan darinya oleh turunkanAlamat(). */
      wilayah: (window.WILAYAH ? (d.wilayah || WILAYAH.kosong()) : null),
      /* ZONA WAKTU cabang ini, nama IANA (‘Asia/Makassar’).

         Kosong berarti “ikut bawaan korporat”, bukan “UTC” — korporat yang
         seluruh cabangnya sezona tidak perlu mengisi apa pun.

         Diturunkan dari PROVINSI bila alamatnya terstruktur, dan hanya
         ditebak dari nama kota bila tidak. Urutan ini penting: batas
         WIB/WITA/WIT adalah batas provinsi, sedangkan daftar nama kota
         selalu tidak lengkap — dan pernah salah. Palangkaraya tercantum di
         kelompok WITA padahal Kalimantan Tengah adalah WIB, jadi cabang di
         sana masuk dengan jam yang meleset satu jam sejak hari pertama,
         tanpa satu pun galat yang bisa dilihat. */
      zona: String(d.zona || '').trim() ||
        (window.ZONA && window.WILAYAH && d.wilayah
          ? ZONA.dariWilayah(d.wilayah) : '') ||
        (window.ZONA && d.kota ? ZONA.tebakDariKota(d.kota) : ''),
      /* Penanggung jawab di SISI PELANGGAN — building manager gedung itu,
         bukan petugas kebersihan. Ia yang dihubungi ketika ada yang perlu
         diputuskan, dan nomornya sering berbeda per menara. */
      pj: String(d.pj || '').trim(),
      telp: String(d.telp || '').trim(),
      /* Jumlah lantai dipakai memeriksa kewajaran, bukan untuk menghitung:
         area lantai 12 di gedung berlantai 8 hampir pasti salah ketik. */
      lantai: Math.max(0, Math.round(d.lantai || 0)),
      /* Luas TANAH seluruh lokasi — bukan jumlah luas areanya.

         Keduanya sengaja dipisah karena selisihnya justru yang berguna:
         lokasi 5.000 m² yang areanya baru terdaftar 2.400 m² berarti ada
         2.600 m² yang tidak diketahui siapa yang membersihkannya. Menghitung
         luas lokasi dari penjumlahan areanya akan membuat selisih itu
         selalu nol, dan pertanyaannya tidak pernah muncul. */
      luasTanah: Math.max(0, Math.round(Number(d.luasTanah) || 0)),
      /* TITIK PETA lokasi ini.

         Alamat tertulis tidak cukup untuk perusahaan berjaringan: "Jl.
         Ahmad Yani No. 45" ada di puluhan kota, dan petugas yang dikirim
         ke cabang yang salah baru ketahuan setelah sampai. Titiknya juga
         yang dipakai membuka rute di ponsel.

         Disimpan null bila tidak sah — BUKAN {lat:0,lng:0}. Nol derajat
         lintang nol derajat bujur adalah tempat yang sungguh ada di Teluk
         Guinea, dan peta yang menunjuk ke sana terlihat seperti data yang
         sudah terisi. */
      koordinat: (window.MAPS && MAPS.valid(d.koordinat)) ? d.koordinat : null,
      /* Nomor kontrak atau kode internal pelanggan untuk lokasi ini. */
      kode: String(d.kode || '').trim(),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true, lokasi: g };
  }

  function ubah(id, d) {
    var g = satu(id);
    if (!g) return { error: I18N.t('Lokasi tidak ditemukan.') };
    var nm = String(d.nama || '').trim();
    if (!nm) return { error: I18N.t('Nama lokasi belum diisi.') };
    var kembar = semua(g.korporatId, true).filter(function (x) {
      return x.id !== id && x.nama.toLowerCase() === nm.toLowerCase();
    });
    if (kembar.length) return { error: I18N.t('Lokasi dengan nama itu sudah ada.') };
    var isi0 = {};
    turunkanAlamat(isi0, d);
    DB.update('mcsLokasi', id, Object.assign(isi0, {
      nama: nm,
      alamat: isi0.alamat !== undefined ? isi0.alamat : String(d.alamat || '').trim(),
      kota: isi0.kota !== undefined ? isi0.kota : String(d.kota || '').trim(),
      /* Ditulis apa adanya, TERMASUK kosong: mengosongkannya adalah cara
         mengembalikan cabang ini ke bawaan korporat, dan menolak nilai
         kosong akan membuat pilihan itu tidak bisa dibatalkan. */
      zona: String(d.zona || '').trim(),
      pj: String(d.pj || '').trim(),
      telp: String(d.telp || '').trim(),
      lantai: Math.max(0, Math.round(d.lantai || 0)),
      luasTanah: Math.max(0, Math.round(Number(d.luasTanah) || 0)),
      /* TITIK PETA lokasi ini.

         Alamat tertulis tidak cukup untuk perusahaan berjaringan: "Jl.
         Ahmad Yani No. 45" ada di puluhan kota, dan petugas yang dikirim
         ke cabang yang salah baru ketahuan setelah sampai. Titiknya juga
         yang dipakai membuka rute di ponsel.

         Disimpan null bila tidak sah — BUKAN {lat:0,lng:0}. Nol derajat
         lintang nol derajat bujur adalah tempat yang sungguh ada di Teluk
         Guinea, dan peta yang menunjuk ke sana terlihat seperti data yang
         sudah terisi. */
      koordinat: (window.MAPS && MAPS.valid(d.koordinat)) ? d.koordinat : null,
      kode: String(d.kode || '').trim(),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    }));
    return { ok: true, lokasi: satu(id) };
  }

  /**
   * Hapus gedung.
   *
   * Areanya TIDAK ikut terhapus — ia dilepaskan menjadi "belum ditetapkan".
   * Menghapus gedung berarti "saya tidak lagi mengelompokkan begini", bukan
   * "gedung ini beserta seluruh riwayat kebersihannya tidak pernah ada".
   * Menghapus berantai di sini akan membuang jadwal, tugas, foto bukti, dan
   * inspeksi berbulan-bulan hanya karena seseorang merapikan pengelompokan.
   */
  function hapus(id) {
    var g = satu(id);
    if (!g) return { error: I18N.t('Lokasi tidak ditemukan.') };
    var a = areaLokasi(g.korporatId, id);
    a.forEach(function (x) { DB.update('mcsArea', x.id, { lokasiId: null }); });
    DB.remove('mcsLokasi', id);
    return { ok: true, areaDilepas: a.length };
  }

  /* -------------------------------------------------------------- area */

  function areaLokasi(korporatId, lokasiId) {
    return MCS.area(korporatId).filter(function (a) {
      return (a.lokasiId || null) === (lokasiId || null);
    });
  }

  /** Area yang belum ditetapkan gedungnya. */
  function areaLepas(korporatId) { return areaLokasi(korporatId, null); }

  function pindahkanArea(areaId, lokasiId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    if (lokasiId && !satu(lokasiId)) return { error: I18N.t('Lokasi tidak ditemukan.') };
    DB.update('mcsArea', areaId, { lokasiId: lokasiId || null });
    return { ok: true };
  }

  /* ------------------------------------------------------- pemindahan
     Nilai teks lama pada kolom `gedung` diubah menjadi catatan gedung
     sungguhan. Dijalankan atas permintaan, BUKAN otomatis saat aplikasi
     dibuka: menebak bahwa "Halaman" adalah nama gedung — dan itu nilai yang
     benar-benar ada di data ini — lalu membuatkan catatannya diam-diam
     adalah menaruh sampah ke dalam data orang tanpa ditanya.

     Karena itu ia mengembalikan USULAN lebih dulu, dan baru menulis setelah
     dipilih. */

  function usulanDariTeks(korporatId) {
    var out = {};
    MCS.area(korporatId, true).forEach(function (a) {
      var t = String(a.gedung || '').trim();
      if (!t || a.lokasiId) return;
      var k = t.toLowerCase();
      if (!out[k]) out[k] = { nama: t, area: [] };
      out[k].area.push(a);
    });
    var sudah = {};
    semua(korporatId, true).forEach(function (g) { sudah[g.nama.toLowerCase()] = g.id; });
    return Object.keys(out).map(function (k) {
      return { nama: out[k].nama, jml: out[k].area.length,
               areaIds: out[k].area.map(function (a) { return a.id; }),
               sudahAda: sudah[k] || null };
    }).sort(function (a, b) { return b.jml - a.jml; });
  }

  /** Terapkan satu usulan: buat gedungnya bila belum ada, lalu pindahkan areanya. */
  function terapkanUsulan(korporatId, u) {
    var id = u.sudahAda;
    if (!id) {
      var r = tambah(korporatId, { nama: u.nama });
      if (r.error) return r;
      id = r.lokasi.id;
    }
    (u.areaIds || []).forEach(function (aid) {
      DB.update('mcsArea', aid, { lokasiId: id });
    });
    return { ok: true, lokasiId: id, jml: (u.areaIds || []).length };
  }

  /**
   * Bagaimana luas tanah lokasi ini terpakai.
   *
   * Angka yang dicari adalah BELUM TERDAFTAR: berapa meter persegi dari tanah
   * yang dibayar pelanggan belum punya area yang bertanggung jawab atasnya.
   * Itu bukan kesalahan hitung — itu daftar pekerjaan yang belum dibuat, dan
   * ia satu-satunya angka di layar ini yang menuntut tindakan.
   *
   * Bila luas tanah belum diisi, "belum" dikembalikan null — BUKAN nol.
   * Nol berarti "semuanya sudah terdaftar", dan itu janji yang tidak boleh
   * dibuat atas dasar kolom yang kosong.
   */
  function luas(korporatId, lokasiId) {
    var a = areaLokasi(korporatId, lokasiId);
    var g = satu(lokasiId);
    var terdaftar = 0, tanpaLuas = 0;
    var bangunan = 0, terbuka = 0;
    /* Jenis yang berupa BIDANG TERBUKA — tidak berdiri bangunan di atasnya.
       Dipisahkan karena biaya dan cara membersihkannya berbeda jauh, dan
       karena pelanggan menanyakannya terpisah. */
    var TERBUKA = { taman: 1, parkir: 1, jalan: 1 };
    a.forEach(function (x) {
      var l = Number(x.luas) || 0;
      if (!l) { tanpaLuas++; return; }
      terdaftar += l;
      if (TERBUKA[x.jenis]) terbuka += l; else bangunan += l;
    });
    var tanah = g ? (Number(g.luasTanah) || 0) : 0;
    return {
      luasTanah: tanah,
      terdaftar: terdaftar,
      bangunan: bangunan,
      terbuka: terbuka,
      area: a.length,
      tanpaLuas: tanpaLuas,
      belum: tanah ? Math.max(0, tanah - terdaftar) : null,
      /* Lebih besar daripada luas tanahnya sendiri hampir selalu berarti satu
         area dihitung dua kali, atau luas tanahnya salah ketik. Ia disebut,
         bukan dibulatkan menjadi nol. */
      lebih: tanah && terdaftar > tanah ? terdaftar - tanah : 0
    };
  }

  /* --------------------------------------------------------- portofolio */

  /**
   * Angka satu gedung untuk satu rentang hari.
   *
   * Yang dipilih bukan segalanya, melainkan yang menjawab satu pertanyaan:
   * gedung mana yang sedang tertinggal. Karena itu tiap angka di sini punya
   * arah — lebih tinggi selalu lebih baik, atau lebih rendah selalu lebih
   * baik — dan tidak ada yang ambigu.
   */
  function ringkas(korporatId, lokasiId, hari, pra) {
    hari = Math.max(1, hari || 30);
    var a = areaLokasi(korporatId, lokasiId);
    var ids = {};
    a.forEach(function (x) { ids[x.id] = 1; });

    var sampai = U.today();
    var dari = U.iso(U.addDays(new Date(), -(hari - 1)));

    /* --- tugas ---
       Tugas TIDAK tersimpan sebagai baris; ia dihasilkan dari jadwal setiap
       kali dibutuhkan. Karena itu periodenya disapu hari demi hari dengan
       fungsi yang sama yang dipakai beranda dan KPI — bukan dengan kueri
       tabel yang isinya memang tak pernah lengkap. Cara ketiga menghitung
       hal yang sama adalah cara ketiga salah menghitungnya. */
    var tugas = 0, selesai = 0, tertinggal = 0, dilewati = 0;
    /* Bila pemanggilnya sudah menyapu harinya sendiri, ia menyerahkan
       hasilnya lewat `pra` dan sapuan di bawah dilewati sama sekali — lihat
       catatan panjang di portofolio(). Dipanggil sendirian, fungsi ini tetap
       bekerja persis seperti dulu. */
    if (pra) {
      var v = pra[lokasiId || ''] || {};
      tugas = v.tugas || 0; selesai = v.selesai || 0;
      tertinggal = v.tertinggal || 0; dilewati = v.dilewati || 0;
    } else if (a.length) {
      var d = new Date(dari + 'T00:00:00');
      var batas = new Date(sampai + 'T00:00:00');
      while (d <= batas) {
        var tgl = U.iso(d);
        MCS.tugasHari(korporatId, tgl).forEach(function (t) {
          if (!t.area || !ids[t.area.id]) return;
          /* 'lewat' berarti SENGAJA DILEWATI — libur, area ditutup, lantai
             sedang direnovasi. Ia bukan kegagalan dan tidak boleh ikut ke
             penyebut: menghukum gedung karena lantainya sedang direnovasi
             membuat angka portofolio berhenti dipercaya. */
          if (t.status === 'lewat') { dilewati++; return; }
          tugas++;
          if (t.status === 'selesai') selesai++;
          else if (t.status === 'terlewat' || t.status === 'terlambat') tertinggal++;
        });
        d.setDate(d.getDate() + 1);
      }
    }

    /* --- mutu ---
       Dipakai fungsi milik MCS sendiri, supaya angka di portofolio dan angka
       di halaman Inspeksi tidak bisa berbeda. */
    var nInsp = 0, jumSkor = 0;
    MCS.mutuArea(korporatId, dari, sampai).forEach(function (m) {
      if (!ids[m.areaId]) return;
      nInsp += m.n;
      jumSkor += m.jumlah;
    });

    /* --- aduan penghuni yang masih terbuka ---
       'Terbuka' memakai definisi yang sama dengan MCS.statistikAduan: baru
       atau sudah ditugaskan tetapi belum selesai. */
    var terbuka = 0, lewatSLA = 0;
    var kini = U.nowISO();
    DB.where('mcsAduan', function (x) {
      return x.korporatId === korporatId && ids[x.areaId] &&
             (x.status === 'baru' || x.status === 'ditugaskan');
    }).forEach(function (x) {
      terbuka++;
      if (x.jatuhTempo && x.jatuhTempo < kini) lewatSLA++;
    });

    var luas = 0;
    a.forEach(function (x) { luas += Number(x.luas) || 0; });

    return {
      lokasiId: lokasiId || null,
      nama: lokasiId ? nama(lokasiId) : I18N.t('Belum ditetapkan'),
      area: a.length,
      luas: luas,
      tugas: tugas,
      selesai: selesai,
      tertinggal: tertinggal,
      dilewati: dilewati,
      /* null, BUKAN 0, ketika tidak ada tugas sama sekali. Nol persen dan
         "tidak ada yang dijadwalkan" adalah dua keadaan yang sangat berbeda,
         dan menampilkan keduanya sebagai 0% membuat gedung yang belum
         dijadwalkan terlihat seperti gedung yang gagal total. */
      persen: tugas ? Math.round(selesai * 100 / tugas) : null,
      inspeksi: nInsp,
      /* Skor APPA 1-5, dan di sana KECIL lebih baik. Arahnya disebut di
         layar, bukan diserahkan pada tebakan pembacanya. */
      skor: nInsp ? jumSkor / nInsp : null,
      aduanTerbuka: terbuka,
      aduanLewatSLA: lewatSLA
    };
  }

  /**
   * Seluruh gedung, plus baris "belum ditetapkan" bila memang ada isinya.
   *
   * Baris itu tidak disembunyikan ketika kosong dan tidak dikarang ketika
   * ada: area yang tidak masuk gedung mana pun adalah area yang luput dari
   * pembandingan, dan yang luput dari pembandingan adalah yang paling mudah
   * terlupakan.
   */
  /**
   * Rekap tugas seluruh gedung dalam SATU sapuan hari.
   *
   * Sebelumnya tiap gedung menyapu periodenya sendiri, sehingga MCS.tugasHari
   * dipanggil (jumlah gedung × jumlah hari) kali — dan tiap panggilan itu
   * sendiri menelusuri SELURUH jadwal korporat. Pada delapan puluh tujuh
   * cabang dengan seribu dua ratus dua puluh tiga jadwal, membuka halaman
   * portofolio selama tiga puluh hari berarti dua ribu enam ratus sepuluh
   * penelusuran atas seribu dua ratus jadwal. Halamannya tidak lambat — ia
   * menggantung, dan peramban menawarkan untuk menghentikannya.
   *
   * Hasilnya sama persis; yang berubah hanya urutan pekerjaannya. Satu
   * sapuan hari, tiap tugas dimasukkan ke ember gedungnya sendiri.
   */
  function rekapTugas(korporatId, hari) {
    hari = Math.max(1, hari || 30);
    var sampai = U.today();
    var dari = U.iso(U.addDays(new Date(), -(hari - 1)));
    var per = {};
    function ember(id) {
      return per[id] || (per[id] =
        { tugas: 0, selesai: 0, tertinggal: 0, dilewati: 0 });
    }
    var d = new Date(dari + 'T00:00:00');
    var batas = new Date(sampai + 'T00:00:00');
    while (d <= batas) {
      MCS.tugasHari(korporatId, U.iso(d)).forEach(function (t) {
        if (!t.area) return;
        var v = ember(t.area.lokasiId || '');
        /* Aturan 'lewat' persis sama dengan yang dulu ada di ringkas().
           Menyalin logikanya ke tempat kedua adalah cara kedua salah
           menghitungnya — karena itu ringkas() kini TIDAK lagi punya
           salinannya sendiri ketika `pra` diberikan. */
        if (t.status === 'lewat') { v.dilewati++; return; }
        v.tugas++;
        if (t.status === 'selesai') v.selesai++;
        else if (t.status === 'terlewat' || t.status === 'terlambat') v.tertinggal++;
      });
      d.setDate(d.getDate() + 1);
    }
    return per;
  }

  function portofolio(korporatId, hari) {
    var pra = rekapTugas(korporatId, hari);
    var baris = semua(korporatId).map(function (g) {
      return ringkas(korporatId, g.id, hari, pra);
    });
    var lepas = areaLepas(korporatId);
    if (lepas.length) baris.push(ringkas(korporatId, null, hari, pra));
    return baris;
  }

  /** Jumlah seluruh gedung, untuk baris total di bawah tabel. */
  function total(baris) {
    var t = { area: 0, luas: 0, tugas: 0, selesai: 0, tertinggal: 0, dilewati: 0,
              inspeksi: 0, aduanTerbuka: 0, aduanLewatSLA: 0 };
    var jumSkor = 0, nSkor = 0;
    baris.forEach(function (b) {
      t.area += b.area; t.luas += b.luas; t.tugas += b.tugas;
      t.selesai += b.selesai; t.tertinggal += b.tertinggal; t.dilewati += b.dilewati;
      t.inspeksi += b.inspeksi; t.aduanTerbuka += b.aduanTerbuka;
      t.aduanLewatSLA += b.aduanLewatSLA;
      /* Rata-rata ditimbang JUMLAH INSPEKSI, bukan jumlah gedung. Gedung
         dengan satu inspeksi tidak boleh menarik rata-rata sekuat gedung
         dengan lima puluh. */
      if (b.skor != null) { jumSkor += b.skor * b.inspeksi; nSkor += b.inspeksi; }
    });
    t.persen = t.tugas ? Math.round(t.selesai * 100 / t.tugas) : null;
    t.skor = nSkor ? jumSkor / nSkor : null;
    return t;
  }

  return {
    semua: semua, satu: satu, nama: nama, banyak: banyak,
    tambah: tambah, ubah: ubah, hapus: hapus,
    areaLokasi: areaLokasi, areaLepas: areaLepas, pindahkanArea: pindahkanArea,
    luas: luas,
    usulanDariTeks: usulanDariTeks, terapkanUsulan: terapkanUsulan,
    ringkas: ringkas, portofolio: portofolio, total: total
  };
})();
