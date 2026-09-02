/* ==========================================================================
   semai-alihdaya.js — korporat contoh berbentuk PENYEDIA JASA (alih daya)
   --------------------------------------------------------------------------
   KENAPA ADA

   Dua korporat contoh yang sudah ada — Buana Motorindo dan Graha Cakrawala —
   keduanya MENGELOLA SENDIRI: mereka membersihkan gedungnya sendiri dengan
   petugasnya sendiri. Bentuk pemakai MCS yang kedua belum terwakili sama
   sekali: perusahaan alih daya yang melayani gedung MILIK ORANG LAIN.

   Bedanya bukan sekadar label. Pada alih daya:
     · tiap gedung punya PEMILIK yang berbeda, dan itulah pihak dalam kontrak;
     · kontrak dan tagihan bukan pelengkap, melainkan inti pekerjaannya;
     · satu perusahaan menangani gedung dengan sifat yang sangat berbeda —
       perkantoran, rumah sakit, pusat belanja, pabrik — dan pola kebersihan
       keempatnya tidak sama.

   Audit yang hanya menguji satu bentuk usaha akan melewatkan kesalahan yang
   hanya muncul pada bentuk yang lain.

   YANG BELUM BISA DIWAKILI

   `lokasi` tidak punya medan "klien". Untuk alih daya, gedungnya milik pihak
   lain, dan satu-satunya tempat nama pemiliknya tercatat adalah
   `KONTRAK.pihak`. Di sini nama itu ditulis juga di `catatan` lokasi supaya
   terbaca di layar — bukan karena itu tempatnya yang benar, melainkan karena
   medan yang benar belum ada. Jangan diandalkan untuk penyaringan.

   CARA PAKAI

   Buka konsol di layar MCS sebagai staf admin, lalu:

       SEMAI_ALIHDAYA.jalankan()

   Aditif dan bisa diulang: kalau korporatnya sudah ada, ia berhenti dan
   berkata begitu, tanpa menyentuh apa pun.

   ANGKA-ANGKANYA

   Tarif kontrak Rp 9.000–14.000 per m² per bulan mengikuti kisaran yang
   dipakai semai-audit.js. Upah mengikuti kisaran UMP DKI Jakarta 2026 untuk
   tenaga kebersihan. Keduanya PERKIRAAN untuk data contoh, bukan patokan
   harga — jangan dikutip sebagai acuan.

   Seluruh nama perusahaan dan gedung di sini FIKTIF.
   ========================================================================== */
var SEMAI_ALIHDAYA = (function () {
  'use strict';

  var NAMA_KORPORAT = 'PT Cakra Bersih Nusantara';

  /* Acak yang dapat diulang: benih tetap, jadi menjalankannya dua kali di
     basis data kosong menghasilkan angka yang sama persis. */
  var benih = 20260826;
  function acak() {
    benih = (benih * 1103515245 + 12345) & 0x7fffffff;
    return benih / 0x7fffffff;
  }
  function antara(a, b) { return a + acak() * (b - a); }
  function bulat(a, b) { return Math.round(antara(a, b)); }
  function pilih(arr) { return arr[Math.floor(acak() * arr.length)]; }

  /* ---------------------------------------------------------------- KLIEN */
  /* Empat gedung dengan sifat yang sengaja berbeda. Yang membedakan bukan
     hanya namanya: jenis area, jam operasional, dan kepadatan petugasnya
     memang tidak sama antara rumah sakit dan pabrik. */
  var GEDUNG = [
    {
      kode: 'ARK', nama: 'Menara Arkadia', klien: 'PT Arkadia Properti Utama',
      kota: 'Kota Administrasi Jakarta Selatan', provinsi: 'DKI Jakarta',
      kecamatan: 'Setiabudi', kelurahan: 'Kuningan Timur', kodePos: '12950',
      jalan: 'Jl. H. R. Rasuna Said Kav. C-18', lantai: 24, luas: 31000,
      sifat: 'Perkantoran sewa, 24 lantai',
      area: [
        ['Lobi Utama', 'lobi', 620], ['Resepsionis Lantai 1', 'lobi', 90],
        ['Ruang Kerja Lt. 5–12', 'kerja', 9800], ['Ruang Kerja Lt. 13–20', 'kerja', 9200],
        ['Ruang Rapat Lt. 3', 'rapat', 480], ['Toilet Umum (12 titik)', 'toilet', 360],
        ['Koridor & Tangga Darurat', 'koridor', 1900], ['Lift Penumpang (6 unit)', 'lift', 110],
        ['Mushola Lt. 2', 'mushola', 180], ['Basement Parkir P1–P3', 'parkir', 7800]
      ],
      petugas: 8, shift: ['pagi', 'siang']
    },
    {
      kode: 'BND', nama: 'RS Bunda Anindya', klien: 'Yayasan Anindya Medika',
      kota: 'Kota Administrasi Jakarta Timur', provinsi: 'DKI Jakarta',
      kecamatan: 'Duren Sawit', kelurahan: 'Klender', kodePos: '13470',
      jalan: 'Jl. Raden Inten II No. 40', lantai: 7, luas: 14500,
      sifat: 'Rumah sakit, layanan 24 jam',
      /* Rumah sakit dibersihkan sepanjang hari, termasuk malam — karena itu
         tiga shift, bukan dua, dan petugasnya lebih rapat per meter persegi
         daripada perkantoran. */
      area: [
        ['Lobi & Pendaftaran', 'lobi', 410], ['Instalasi Gawat Darurat', 'kerja', 520],
        ['Poliklinik Lt. 2', 'kerja', 1450], ['Ruang Rawat Inap Lt. 3–5', 'kerja', 4600],
        ['Ruang Tunggu Keluarga', 'lobi', 380], ['Toilet Pasien & Umum', 'toilet', 420],
        ['Koridor & Tangga', 'koridor', 1650], ['Lift Pasien & Barang', 'lift', 95],
        ['Mushola', 'mushola', 120], ['Kantin & Pantry', 'pantry', 340],
        ['Area Parkir Depan', 'parkir', 2900]
      ],
      petugas: 11, shift: ['pagi', 'siang', 'malam']
    },
    {
      kode: 'PSB', nama: 'Mal Pesona Bintaro', klien: 'PT Pesona Ritel Nusantara',
      kota: 'Kota Tangerang Selatan', provinsi: 'Banten',
      kecamatan: 'Pondok Aren', kelurahan: 'Pondok Jaya', kodePos: '15224',
      jalan: 'Jl. Bintaro Utama Sektor 3A No. 1', lantai: 5, luas: 42000,
      sifat: 'Pusat belanja, buka 10.00–22.00',
      area: [
        ['Lobi Utama & Atrium', 'lobi', 1800], ['Area Tenant Lt. G', 'kerja', 7400],
        ['Area Tenant Lt. 1–2', 'kerja', 11200], ['Food Court Lt. 3', 'pantry', 2600],
        ['Toilet Umum (18 titik)', 'toilet', 540], ['Koridor & Eskalator', 'koridor', 3100],
        ['Lift Pengunjung & Barang', 'lift', 130], ['Mushola Lt. 3', 'mushola', 220],
        ['Parkir Basement & Gedung', 'parkir', 12400],
        ['Taman Depan & Drop-off', 'taman', 1600]
      ],
      petugas: 14, shift: ['pagi', 'siang']
    },
    {
      kode: 'STP', nama: 'Pabrik Sentosa Polimer', klien: 'PT Sentosa Polimer Indonesia',
      kota: 'Kabupaten Bekasi', provinsi: 'Jawa Barat',
      kecamatan: 'Cikarang Selatan', kelurahan: 'Sukaresmi', kodePos: '17530',
      jalan: 'Kawasan Industri Jababeka II, Jl. Industri Selatan 6 Blok PP No. 12',
      lantai: 2, luas: 26000,
      sifat: 'Pabrik, dua shift produksi',
      /* Pabrik: yang dominan bukan ruang kerja, melainkan bangunan produksi,
         gudang, jalan, dan pos — dan itulah jenis area yang jarang dipakai
         gedung perkantoran. Justru karena itu ia perlu ada di data contoh. */
      area: [
        ['Gedung Produksi A', 'bangunan', 8400], ['Gedung Produksi B', 'bangunan', 6900],
        ['Gudang Bahan Baku', 'gudang', 3800], ['Gudang Barang Jadi', 'gudang', 3200],
        ['Kantor Pabrik Lt. 1–2', 'kerja', 1150], ['Kantin Karyawan', 'pantry', 480],
        ['Toilet & Ruang Ganti', 'toilet', 390], ['Mushola', 'mushola', 160],
        ['Pos Security Gerbang', 'pos', 45], ['Jalan Internal & Loading Bay', 'parkir', 4300]
      ],
      petugas: 9, shift: ['pagi', 'siang']
    }
  ];

  var NAMA_DEPAN = ['Ahmad', 'Siti', 'Budi', 'Rina', 'Joko', 'Dewi', 'Agus', 'Ratna',
    'Hendra', 'Lestari', 'Bambang', 'Wulan', 'Slamet', 'Endah', 'Rudi', 'Tuti',
    'Yanto', 'Murni', 'Darto', 'Sari'];
  var NAMA_BELAKANG = ['Saputra', 'Wijaya', 'Nugroho', 'Handayani', 'Pratama',
    'Rahayu', 'Setiawan', 'Maulana', 'Kurniawan', 'Safitri', 'Hidayat', 'Puspita'];

  function namaOrang(i) {
    return NAMA_DEPAN[i % NAMA_DEPAN.length] + ' ' +
      NAMA_BELAKANG[(i * 7 + 3) % NAMA_BELAKANG.length];
  }

  /* ------------------------------------------------------------ PENJALAN */
  function jalankan() {
    if (!window.MCS || !window.LOKASI) {
      return { error: 'Modul MCS/LOKASI belum dimuat. Jalankan dari layar MCS.' };
    }
    var sudah = DB.all('korporat').filter(function (k) {
      return k.nama === NAMA_KORPORAT;
    })[0];
    if (sudah) {
      return { error: 'Korporat "' + NAMA_KORPORAT + '" sudah ada — tidak ada yang diubah.' };
    }

    var lap = { salah: [] };

    /* ---- 1. korporat + staf pertama ---- */
    var rk = MCS.buatKorporat({
      nama: NAMA_KORPORAT,
      bidang: 'Jasa kebersihan gedung (alih daya)',
      /* INILAH yang membedakannya dari dua korporat contoh lainnya. */
      jenis: 'alihdaya',
      wilayah: {
        negara: 'ID', l1: 'DKI Jakarta', l2: 'Kota Administrasi Jakarta Selatan',
        l3: 'Mampang Prapatan', l4: 'Tegal Parang', kodePos: '12790',
        jalan: 'Jl. Mampang Prapatan Raya No. 88', patokan: ''
      },
      telp: '021-79180450',
      npwp: '02.551.907.8-011.000',
      namaStaf: 'Yuni Prasetyo', jabatanStaf: 'Operations Manager',
      emailStaf: 'yuni@cakrabersih.co.id', telpStaf: '0811-1900-455'
    }, 'u_admin');
    if (rk.error) return { error: rk.error };

    var kid = rk.korporat.id;
    lap.korporat = rk.korporat.nama;
    lap.jenis = DB.find('korporat', kid).jenis;
    lap.adminEmail = rk.user.email;
    lap.sandiAwal = rk.sandiAwal;
    DB.update('users', rk.user.id, { mcsPeran: 'admin', mcsLokasi: [] });

    /* ---- 2. gedung klien + areanya ---- */
    lap.gedung = 0; lap.area = 0;
    var petaLokasi = {}, petaArea = {};
    GEDUNG.forEach(function (g) {
      var rl = LOKASI.tambah(kid, {
        nama: g.nama, kode: g.kode,
        wilayah: {
          negara: 'ID', l1: g.provinsi, l2: g.kota, l3: g.kecamatan,
          l4: g.kelurahan, kodePos: g.kodePos, jalan: g.jalan, patokan: ''
        },
        lantai: g.lantai, luasTanah: g.luas,
        /* Nama kliennya ditulis di catatan karena `lokasi` belum punya medan
           untuk itu. Tempat yang BENAR adalah kontraknya, dan di sanalah ia
           juga ditulis — ini hanya supaya terbaca di daftar gedung. */
        catatan: 'Klien: ' + g.klien + ' — ' + g.sifat
      });
      if (rl.error) { lap.salah.push(g.nama + ': ' + rl.error); return; }
      petaLokasi[g.kode] = rl.lokasi.id;
      lap.gedung++;

      petaArea[g.kode] = [];
      g.area.forEach(function (a) {
        var ra = MCS.tambahArea(kid, {
          nama: a[0], jenis: a[1], luas: a[2], lokasiId: rl.lokasi.id
        });
        if (ra.error) { lap.salah.push(g.nama + ' / ' + a[0] + ': ' + ra.error); return; }
        petaArea[g.kode].push(ra.area.id);
        lap.area++;
      });
    });

    /* ---- 3. petugas ---- */
    lap.petugas = 0;
    var no = 0;
    GEDUNG.forEach(function (g) {
      var lid = petaLokasi[g.kode];
      if (!lid) return;
      for (var i = 0; i < g.petugas; i++) {
        var jabatan = i === 0 ? 'Leader' : (i === 1 && g.petugas > 6 ? 'Wakil Leader' : 'Anggota');
        var r = MCS.tambahPekerja(kid, {
          nama: namaOrang(no) + ' (' + g.kode + ')',
          jenis: i === 0 ? 'cleaning' : pilih(['ob', 'cleaning', 'cleaning', 'toilet']),
          jabatan: jabatan,
          areaIds: petaArea[g.kode] || [],
          lokasiIds: [lid],
          shiftKode: g.shift[i % g.shift.length],
          /* Kisaran UMP DKI 2026 untuk tenaga kebersihan; leader di atasnya. */
          upah: jabatan === 'Anggota' ? bulat(5300000, 5900000) : bulat(6200000, 7100000),
          catatan: 'Ditempatkan di ' + g.nama
        });
        if (r.error) { lap.salah.push(namaOrang(no) + ': ' + r.error); no++; continue; }
        lap.petugas++;
        no++;
      }
    });

    /* ---- 4. kontrak, satu per gedung klien ---- */
    lap.kontrak = 0;
    if (window.KONTRAK) {
      var mulai = U.iso(U.addDays(new Date(), -bulat(200, 400)));
      GEDUNG.forEach(function (g) {
        var lid = petaLokasi[g.kode];
        if (!lid) return;
        /* Rp 9.000–14.000 per m² per bulan, dibulatkan ke ratusan ribu. */
        var nilai = Math.round(g.luas * antara(9000, 14000) / 100000) * 100000;
        var r = KONTRAK.buat(kid, {
          nama: 'Jasa kebersihan — ' + g.nama,
          /* Pihak dalam kontrak adalah KLIENNYA, bukan korporat itu sendiri.
             Di korporat yang mengelola sendiri, dua nama itu sama; di alih
             daya justru bedanya yang menjadi inti. */
          pihak: g.klien,
          mulai: mulai,
          sampai: U.iso(U.addDays(new Date(mulai + 'T00:00:00'), 1095)),
          nilaiBulanan: nilai,
          areaIds: (petaArea[g.kode] || []).slice(),
          lingkupTeks: 'Pembersihan harian seluruh area ' + g.nama + '. ' + g.sifat + '.',
          /* 'berjalan', BUKAN bawaan 'draf'. TAGIHAN.susun hanya membaca
             kontrak berjalan; kontrak draf menghasilkan nol baris tagihan
             dengan pesan "tidak ada yang bisa ditagihkan" — terdengar seperti
             keadaan yang wajar, padahal penyebabnya status yang salah. */
          status: 'berjalan'
        }, null);
        if (r.error) { lap.salah.push('kontrak ' + g.nama + ': ' + r.error); return; }
        lap.kontrak++;
      });
    } else {
      lap.kontrakDilewati = 'modul KONTRAK tidak dimuat';
    }

    /* ---- 5. tagihan tiga bulan terakhir ---- */
    lap.tagihan = 0; lap.tagihanLunas = 0;
    if (window.TAGIHAN && lap.kontrak) {
      var kini = new Date();
      /* Tiga bulan yang SUDAH LEWAT, dari yang paling lama. Bulan berjalan
         sengaja tidak ditagih: menagih bulan yang belum selesai membuat
         angkanya berubah sendiri setiap hari. */
      for (var b = 3; b >= 1; b--) {
        var d = new Date(kini.getFullYear(), kini.getMonth() - b, 1);
        var rt = TAGIHAN.terbitkan(kid, d.getFullYear(), d.getMonth() + 1, null);
        if (rt.error) { lap.salah.push('tagihan ' + (d.getMonth() + 1) + ': ' + rt.error); continue; }
        lap.tagihan++;

        /* TANGGALNYA DIMUNDURKAN ke awal bulan berikutnya setelah periode
           yang ditagih — itulah kapan tagihan bulanan sungguhan terbit.
           TAGIHAN.terbitkan() selalu memakai hari ini, yang benar untuk
           pemakaian nyata tetapi salah untuk data contoh: tagihan Januari
           yang tertanggal hari ini terbaca janggal, dan jatuh temponya
           belum lewat sehingga tidak satu pun tagihan tampak menunggak.
           Tanpa ini, layar Tagihan tidak punya keadaan menunggak untuk
           ditunjukkan sama sekali. */
        var terbit = U.iso(new Date(d.getFullYear(), d.getMonth() + 1, 1));
        DB.update('mcsTagihan', rt.tagihan.id, {
          tanggal: terbit,
          jatuhTempo: U.iso(U.addDays(new Date(terbit + 'T00:00:00'),
            TAGIHAN.config(kid).tempoHari)),
          diterbitkan: terbit + 'T09:00:00.000Z'
        });

        /* Dua yang paling lama sudah dibayar; yang terbaru dibiarkan
           menunggak dan sekarang benar-benar LEWAT TEMPO — supaya lencana
           di menu Tagihan punya alasan nyata untuk menyala, bukan sekadar
           dianggap akan menyala. */
        if (b > 1) {
          /* catatan adalah TEKS, bukan objek. */
          var rl2 = TAGIHAN.tandaiLunas(rt.tagihan.id, 'Transfer BCA, sesuai jadwal', null);
          if (!rl2 || !rl2.error) lap.tagihanLunas++;
        }
      }
    } else if (!window.TAGIHAN) {
      lap.tagihanDilewati = 'modul TAGIHAN tidak dimuat';
    }

    DB.save(true);
    return lap;
  }

  return { jalankan: jalankan, NAMA: NAMA_KORPORAT, GEDUNG: GEDUNG };
})();
