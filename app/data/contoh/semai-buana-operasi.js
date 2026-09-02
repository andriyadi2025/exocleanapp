/* ==========================================================================
   semai-buana-operasi.js — menghidupkan akun PT Buana Indah Motorindo
   --------------------------------------------------------------------------
   Dijalankan di dalam peramban, SESUDAH semai-buana.js. Ia menambahkan yang
   membuat sebuah akun benar-benar hidup: jadwal, kehadiran, tugas yang
   sungguh dikerjakan, inspeksi mutu, aduan, dan pemakaian bahan.

   ANGGARAN RUANG — DIBACA DULU SEBELUM MENAIKKAN ANGKA MANA PUN

   Seluruh data aplikasi ini tinggal di localStorage, yang batasnya sekitar
   5 MB dan yang GAGAL SECARA DIAM-DIAM ketika penuh: tidak ada galat, tidak
   ada pesan, hanya perubahan yang tidak pernah tersimpan. Karena itu tiap
   bagian di bawah punya jatah, dan jatahnya dihitung dari ukuran barisnya
   yang sungguh diukur, bukan ditebak:

       tugas    376 byte     absensi  273 byte
       jadwal   376 byte     mutasi   313 byte

   Dengan 1.223 area dan 258 petugas, membuat tujuh hari tugas untuk semua
   area berarti 8.561 baris = 3,2 MB, dan akun ini akan menabrak batas
   sebelum selesai. Yang dipilih: SATU hari tugas untuk SELURUH cabang,
   bukan tujuh hari untuk sebagian. Delapan puluh tujuh cabang yang semuanya
   hidup pada satu hari lebih jujur daripada dua puluh cabang yang hidup
   seminggu sementara enam puluh tujuh lainnya kosong tanpa sebab.

   Yang benar untuk data sebesar ini bukan mengecilkan datanya, melainkan
   memindahkannya ke server — dan server data itu sudah ada (port 4500),
   hanya belum dipakai MCS. Itu pekerjaan tersendiri, dan sampai dikerjakan
   batas ini nyata.
   ========================================================================== */
window.__semaiOperasi = function (opsi) {
  opsi = opsi || {};
  var lap = { salah: [] };
  var t0 = Date.now();

  var k = DB.all('korporat').filter(function (x) {
    return /Buana Indah Motorindo/.test(x.nama);
  })[0];
  if (!k) return { error: 'Korporat PT Buana Indah Motorindo belum ada.' };
  var kid = k.id;
  var oleh = APP.user;

  /* Acak yang dapat diulang — sama alasannya dengan pembangkitnya. */
  var benih = 7723140;
  function acak() { benih = (benih * 1103515245 + 12345) & 0x7fffffff; return benih / 0x7fffffff; }
  function antara(a, b) { return a + acak() * (b - a); }
  function bulat(a, b) { return Math.round(antara(a, b)); }
  function pilih(arr) { return arr[Math.floor(acak() * arr.length)]; }

  /* Pengukur ruang yang JUJUR dan MURAH sekaligus — dua hal yang di sini
     saling bertentangan dan harus didamaikan:

       · Jujur: DB.save() tertunda 120 ms, jadi membaca localStorage tanpa
         menyiramnya dulu mengukur keadaan beberapa ratus baris yang lalu —
         justru pada saat batasnya paling dekat.
       · Murah: membaca seluruh localStorage berarti menyalin 2,3 MB teks.
         Melakukannya untuk tiap baris membuat penyemaian ini berjalan
         berjam-jam, bukan berdetik.

     Jalan tengahnya: ukur sungguhan tiap 60 baris, dan di antaranya pakai
     angka terakhir dikurangi perkiraan yang SENGAJA berlebih (500 byte per
     baris, di atas baris terbesar yang pernah diukur 376 byte). Salah
     tebaknya selalu ke arah aman: ia berhenti terlalu cepat, bukan terlambat. */
  var ukurTerakhir = -1, sejakUkur = 0;
  function ukur() {
    var t = 0;
    Object.keys(localStorage).forEach(function (x) { t += (localStorage.getItem(x) || '').length; });
    return 5 * 1048576 - t;
  }
  function sisaRuang() {
    if (ukurTerakhir < 0 || sejakUkur >= 60) {
      DB.save(true);
      ukurTerakhir = ukur(); sejakUkur = 0;
    } else {
      sejakUkur++;
    }
    return ukurTerakhir - sejakUkur * 500;
  }

  var area = DB.where('mcsArea', function (a) { return a.korporatId === kid; });
  var pekerja = DB.where('mcsPekerja', function (p) { return p.korporatId === kid; });
  var perLokasi = {};
  area.forEach(function (a) { (perLokasi[a.lokasiId] = perLokasi[a.lokasiId] || []).push(a); });
  var pekerjaLokasi = {};
  pekerja.forEach(function (p) {
    (p.lokasiIds || []).forEach(function (id) {
      (pekerjaLokasi[id] = pekerjaLokasi[id] || []).push(p);
    });
  });

  /* ---------------------------------------------------------- 1. JADWAL

     Frekuensi mengikuti JENIS AREA, bukan diseragamkan. Toilet dealer
     disentuh tiga kali sehari; gudang sparepart dua kali seminggu; pos
     satpam sekali. Menyeragamkannya membuat beban kerja dan biaya per meter
     persegi kehilangan seluruh artinya. */
  var POLA = {
    toilet:  { jam: ['08:00', '12:00', '16:00'], hari: [1, 2, 3, 4, 5, 6] },
    lobi:    { jam: ['07:30', '13:00'],          hari: [1, 2, 3, 4, 5, 6] },
    kerja:   { jam: ['07:00'],                   hari: [1, 2, 3, 4, 5] },
    rapat:   { jam: ['07:15'],                   hari: [1, 2, 3, 4, 5] },
    pantry:  { jam: ['09:00', '14:00'],          hari: [1, 2, 3, 4, 5, 6] },
    koridor: { jam: ['07:45', '15:00'],          hari: [1, 2, 3, 4, 5, 6] },
    lift:    { jam: ['08:30'],                   hari: [1, 2, 3, 4, 5, 6] },
    mushola: { jam: ['11:00'],                   hari: [1, 2, 3, 4, 5, 6] },
    bangunan:{ jam: ['17:00'],                   hari: [1, 2, 3, 4, 5, 6] },
    gudang:  { jam: ['10:00'],                   hari: [2, 5] },
    parkir:  { jam: ['06:30'],                   hari: [1, 2, 3, 4, 5, 6] },
    taman:   { jam: ['06:45'],                   hari: [1, 3, 5] },
    pos:     { jam: ['09:30'],                   hari: [3] },
    lainnya: { jam: ['08:00'],                   hari: [1, 3, 5] }
  };

  lap.jadwal = 0;
  if (!opsi.lewatiJadwal) {
    area.forEach(function (a) {
      /* Yang sudah punya jadwal dilewati — penyemai ini boleh dijalankan
         dua kali tanpa menggandakan apa pun. */
      if (DB.first('mcsJadwal', function (j) { return j.areaId === a.id; })) return;
      var pol = POLA[a.jenis] || POLA.lainnya;
      var pk = pekerjaLokasi[a.lokasiId] || [];
      if (!pk.length) return;
      var r = MCS.tambahJadwal(kid, {
        areaId: a.id,
        pekerjaId: pilih(pk).id,
        mode: 'jam', jam: pol.jam, hari: pol.hari,
        mulai: '06:00', selesai: '18:00', siklus: 'mingguan'
      });
      if (r.error) { lap.salah.push(a.nama + ': ' + r.error); return; }
      lap.jadwal++;
    });
  }

  /* ------------------------------------------------------- 2. KEHADIRAN

     Tiga hari ke belakang. Sebagian besar hadir; sisanya sakit, izin, atau
     tanpa kabar — dengan perbandingan yang wajar, bukan seratus persen.
     Kehadiran sempurna membuat seluruh laporan kepatuhan tidak bisa diuji. */
  lap.absensi = 0;
  var hariMundur = opsi.hariAbsensi === undefined ? 3 : opsi.hariAbsensi;
  for (var h = 0; h < hariMundur; h++) {
    var tgl = U.iso(U.addDays(new Date(), -h));
    var hariKe = U.d(tgl).getDay();
    if (hariKe === 0) continue;                 /* Minggu: dealer tutup */
    pekerja.forEach(function (p) {
      if (sisaRuang() < 900000) return;
      var u = acak();
      var st = u < 0.90 ? 'hadir' : (u < 0.945 ? 'sakit' : (u < 0.98 ? 'izin' : 'alfa'));
      var r = MCS.tandaiHadir(kid, p.id, tgl, st, {}, oleh);
      if (r && r.error) return;
      lap.absensi++;
    });
  }

  /* ----------------------------------------------------------- 3. TUGAS

     URUTANNYA MENGIKAT: absensi di atas harus sudah tertulis sebelum bagian
     ini berjalan. Terbukti saat diuji — dijalankan dengan hariAbsensi:0,
     176 tugas tercatat selesai atas nama orang yang belakangan tercatat
     sakit, izin, atau tanpa kabar pada hari yang sama. Tidak ada galat, dan
     tidak ada satu pun angka ringkasan yang berubah; yang saling menyangkal
     hanya terlihat bila dua tabelnya dibaca bersamaan.

     Satu hari, seluruh cabang — lihat catatan anggaran di kepala berkas.
     Tidak semuanya selesai: yang petugasnya tidak hadir, dan sebagian kecil
     lainnya, memang terlewat. Data yang seratus persen selesai membuat
     halaman kepatuhan tidak pernah bisa membuktikan dirinya bekerja. */
  lap.tugas = 0; lap.tugasSelesai = 0; lap.tugasLewat = 0; lap.belumWaktunya = 0;
  var hariIni = U.today();
  var absenHariIni = {};
  DB.where('mcsAbsensi', function (x) {
    return x.korporatId === kid && x.tgl === hariIni;
  }).forEach(function (x) { absenHariIni[x.pekerjaId] = x.status; });

  /* Batas jam yang HARUS ada. Terbukti saat diuji: 77 tugas pukul 17.00
     dilaporkan selesai pada pukul 16.17 — pengakuan yang mustahil, dan
     mustahil dengan cara yang tidak terlihat pada angka ringkasannya.
     Yang belum tiba jamnya dilewati; slotnya tetap ada dan akan muncul
     sebagai 'akan' pada waktunya sendiri. */
  var kini = new Date();
  var menitKini = kini.getHours() * 60 + kini.getMinutes();
  function menitJam(j) { var p = String(j).split(':'); return (+p[0]) * 60 + (+p[1]); }

  var slot = MCS.tugasHari(kid, hariIni) || [];
  slot.forEach(function (s) {
    if (sisaRuang() < 700000) { lap.ruangHabis = true; return; }
    if (s.status === 'selesai') return;
    if (menitJam(s.jam) > menitKini) { lap.belumWaktunya++; return; }
    var st = absenHariIni[s.jadwal && s.jadwal.pekerjaId];
    /* Petugas yang tidak bekerja tidak menyelesaikan tugas. Menandai
       selesai untuknya adalah data yang saling menyangkal di dalam satu
       basis data yang sama. */
    if (st && st !== 'hadir') { lap.tugasLewat++; return; }
    if (acak() > 0.88) { lap.tugasLewat++; return; }
    var r = MCS.tandai(kid, s.jadwal.id, hariIni, s.jam, 'selesai', oleh, {});
    if (r && r.error) { return; }
    lap.tugas++; lap.tugasSelesai++;
  });

  /* -------------------------------------------------------- 4. INSPEKSI

     Diisi SUPERVISOR, bukan petugas — dan itu bukan kelalaian rancangan
     melainkan intinya. Sebarannya condong ke bagus, dengan ekor yang jelek:
     inspeksi yang semuanya lima membuat nilainya tidak berguna. */
  lap.inspeksi = 0;
  var supervisor = DB.all('users').filter(function (u) {
    return u.korporatId === kid && u.role === 'korporat' &&
           ['supervisor', 'cabang', 'leader'].indexOf(u.mcsPeran) >= 0;
  });
  var sasaran = opsi.inspeksi === undefined ? 160 : opsi.inspeksi;
  for (var i = 0; i < sasaran && supervisor.length; i++) {
    if (sisaRuang() < 600000) break;
    var a2 = pilih(area);
    var u2 = acak();
    var skor = u2 < 0.32 ? 5 : (u2 < 0.70 ? 4 : (u2 < 0.90 ? 3 : (u2 < 0.97 ? 2 : 1)));
    var ri = MCS.buatInspeksi(a2.id, {
      tgl: U.iso(U.addDays(new Date(), -bulat(0, 6))),
      skor: skor,
      catatan: skor <= 2
        ? pilih(['Debu tebal di sudut belakang.', 'Kaca berbekas lap.',
                 'Tempat sampah belum dikosongkan.', 'Lantai masih licin berminyak.'])
        : ''
    }, pilih(supervisor));
    if (ri.error) continue;
    lap.inspeksi++;
  }

  /* ----------------------------------------------------------- 5. ADUAN

     Teks aduan HARUS mengikuti jenis ruangannya.

     Sebelumnya satu daftar dipakai untuk semua area, diambil acak. Tidak
     ada galat, dan angka ringkasannya benar semua — tetapi kotak masuknya
     berisi 'wastafel toilet tersumbat' di taman dan 'halaman depan banyak
     daun kering' di dalam toilet. Aduan datang dari orang yang BERDIRI di
     ruangan itu; kalimat yang mustahil ditulis dari sana membuat seluruh
     halaman terbaca sebagai karangan, dan halaman yang jelas karangan
     berhenti berguna untuk menguji apa pun. Ketahuan dari membuka layarnya,
     bukan dari alat mana pun. */
  lap.aduan = 0;
  var TEKS_JENIS = {
    toilet: ['Toilet bau sejak pagi, pengharum sepertinya habis.',
             'Wastafel tersumbat, air menggenang.',
             'Tisu di bilik kedua habis sejak kemarin.',
             'Lantai toilet licin dan ada genangan di sudut.'],
    lobi:   ['Lantai showroom ada bekas sepatu, mobil pajangan jadi kurang rapi.',
             'Kaca depan berbekas lap, terlihat jelas kalau kena matahari.',
             'Tempat sampah ruang tunggu penuh sejak kemarin sore.',
             'Sofa ruang tunggu berdebu di sela-sela dudukan.'],
    kerja:  ['Debu tebal di atas lemari arsip.',
             'Tempat sampah di bawah meja belum dikosongkan.',
             'Kaca jendela ruang kerja berbekas air hujan.'],
    rapat:  ['Meja rapat masih ada bekas gelas kopi.',
             'Lantai ruang rapat berdebu, tadi ada tamu.',
             'Tempat sampah ruang rapat penuh.'],
    pantry: ['Wastafel pantry penuh piring kotor sejak siang.',
             'Meja pantry lengket bekas tumpahan.',
             'Bau tidak sedap dari tempat sampah pantry.'],
    mushola: ['Karpet mushola berdebu dan berbau apak.',
             'Tempat wudhu kotor dan lantainya licin.',
             'Sajadah belum dirapikan sejak zuhur.'],
    gudang: ['Debu tebal di rak sparepart bagian atas.',
             'Lantai gudang banyak serpihan kardus.',
             'Sarang laba-laba di sudut langit-langit gudang.'],
    bangunan: ['Lantai bengkel licin, ada tumpahan oli yang belum dibersihkan.',
             'Lantai dekat pintu bengkel masih ada bekas oli.',
             'Selokan kecil di area servis tersumbat.'],
    koridor: ['Lantai koridor kotor bekas sepatu dari luar.',
             'Debu menumpuk di sudut tangga.',
             'Pegangan tangga lengket.'],
    parkir: ['Banyak puntung rokok di area parkir.',
             'Genangan air di parkir basement belum disapu.',
             'Daun kering menumpuk di parkir pelanggan.'],
    taman:  ['Halaman depan banyak daun kering menumpuk.',
             'Rumput taman depan sudah tinggi.',
             'Sampah plastik tersangkut di tanaman pagar.'],
    pos:    ['Kaca pos satpam berdebu tebal.',
             'Tempat sampah dekat pos satpam penuh.'],
    lift:   ['Lantai lift ada bekas sepatu basah.',
             'Cermin lift berbekas tangan.'],
    lainnya: ['Ruangan ini berdebu dan belum tersentuh sejak kemarin.',
             'Tempat sampah belum dikosongkan.']
  };
  var sasaranAduan = opsi.aduan === undefined ? 45 : opsi.aduan;
  for (var j2 = 0; j2 < sasaranAduan; j2++) {
    if (sisaRuang() < 500000) break;
    var a3 = pilih(area);
    var ra = MCS.buatAduan(a3.id, {
      genting: acak() < 0.12 ? 'mendesak' : (acak() < 0.55 ? 'biasa' : 'ringan'),
      teks: pilih(TEKS_JENIS[a3.jenis] || TEKS_JENIS.lainnya)
    });
    if (ra.error) continue;
    lap.aduan++;
  }

  /* ------------------------------------------------- 6. PEMAKAIAN BAHAN

     Pengambilan ke troli, bukan pemotongan otomatis. Alasannya sudah
     diputuskan dan dibuktikan sebelumnya: memotong dari rumus membuat
     pemakaian sama dengan perkiraan menurut definisinya sendiri, dan
     penanda boros/irit berhenti mengukur apa pun. */
  lap.ambil = 0;
  var stok = DB.where('mcsStok', function (x) { return x.korporatId === kid; });
  var lokasi = DB.where('mcsLokasi', function (l) { return l.korporatId === kid; });
  var sasaranAmbil = opsi.ambil === undefined ? 320 : opsi.ambil;
  for (var m = 0; m < sasaranAmbil; m++) {
    if (sisaRuang() < 400000) break;
    var lok = pilih(lokasi);
    var pk2 = pekerjaLokasi[lok.id] || [];
    if (!pk2.length) continue;
    var baris = [];
    var berapa = bulat(1, 3);
    for (var b = 0; b < berapa; b++) {
      baris.push({ stokId: pilih(stok).id, jumlah: bulat(1, 4) });
    }
    var rr = MCS.ambilBarang(kid, pilih(pk2).id, baris, {
      lokasiId: lok.id, catatan: 'Diambil untuk troli'
    }, oleh);
    if (rr && rr.error) continue;
    lap.ambil += (rr && rr.berhasil) || 0;
  }

  DB.save(true);
  lap.detik = Math.round((Date.now() - t0) / 100) / 10;
  var pakai = 0;
  Object.keys(localStorage).forEach(function (x) { pakai += (localStorage.getItem(x) || '').length; });
  lap.terpakaiMB = Math.round(pakai / 1048576 * 100) / 100;
  return lap;
};
'penyemai operasi siap';
