/* ==========================================================================
   semai-dummy.js — 20 klien + 50 mitra contoh dari berbagai kota Indonesia
   --------------------------------------------------------------------------
   Diminta pemilik 2 Sep 2026 untuk pengujian. Aturannya:

     · TANPA ORDER. Tidak ada booking, penawaran, order, invoice, rating,
       komplain yang dibuat. Yang ditambah hanya baris `users` beserta
       catatan pembelajaran (lmsProgres) dan sertifikat yang membuat mitra
       itu SAH sebagai mitra aktif.
     · TERISI PENUH DAN TERVERIFIKASI. Klien: email & HP terverifikasi,
       alamat berkoordinat, rekening. Mitra: kelima gerbang kemitraan
       lolos — S&K disetujui, berkas lengkap (KTP terverifikasi admin, dua
       kontak darurat, alamat tinggal), 5 kursus wajib lulus + sertifikat
       mitra, disetujui admin — plus tarif pasar ditetapkan dan ditayangkan
       supaya langsung tampil di EXOCLEAN App.
     · ADITIF DAN BISA DIULANG. Dikenali lewat email; menjalankan dua kali
       tidak menggandakan. Data yang sudah ada tidak disentuh.
     · DIBERI TANDA. Setiap baris membawa `sumber:'dummy'` supaya bisa
       disaring atau dibersihkan nanti tanpa menebak.

   Jalankan dari konsol peramban (index.html atau exo-admin.html):
       SEMAI_DUMMY.jalankan()
   atau lewat tombol di konsol admin → Cleaners.
   ========================================================================== */
var SEMAI_DUMMY = (function () {
  'use strict';

  /* Acak yang dapat diulang: dua kali jalan menghasilkan nama & nomor yang sama. */
  var benih = 20260902;
  function acak() { benih = (benih * 1103515245 + 12345) & 0x7fffffff; return benih / 0x7fffffff; }
  function bulat(a, b) { return Math.floor(a + acak() * (b - a + 1)); }
  function pilih(arr) { return arr[Math.floor(acak() * arr.length)]; }
  function digit(n) { var s = ''; for (var i = 0; i < n; i++) s += bulat(0, 9); return s; }
  function hariLalu(n, jam) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(jam || 9, bulat(0, 59), 0, 0); return d.toISOString(); }
  function tglLalu(n) { return hariLalu(n).slice(0, 10); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, ''); }

  /* Kota beserta wilayah administratif resminya (nama sesuai Kemendagri),
     satu kecamatan/kelurahan contoh, kode pos, dan titik koordinat pusat. */
  var KOTA = [
    { kota:'Kota Jakarta Selatan', prov:'DKI Jakarta', kec:'Kebayoran Baru', kel:'Melawai', pos:'12160', lat:-6.2446, lng:106.7991, tz:'WIB' },
    { kota:'Kota Bandung', prov:'Jawa Barat', kec:'Coblong', kel:'Dago', pos:'40135', lat:-6.8837, lng:107.6132, tz:'WIB' },
    { kota:'Kota Surabaya', prov:'Jawa Timur', kec:'Gubeng', kel:'Airlangga', pos:'60286', lat:-7.2653, lng:112.7521, tz:'WIB' },
    { kota:'Kota Medan', prov:'Sumatera Utara', kec:'Medan Baru', kel:'Petisah Hulu', pos:'20153', lat:3.5843, lng:98.6620, tz:'WIB' },
    { kota:'Kota Makassar', prov:'Sulawesi Selatan', kec:'Panakkukang', kel:'Masale', pos:'90231', lat:-5.1391, lng:119.4426, tz:'WITA' },
    { kota:'Kota Semarang', prov:'Jawa Tengah', kec:'Semarang Tengah', kel:'Pekunden', pos:'50241', lat:-6.9848, lng:110.4192, tz:'WIB' },
    { kota:'Kota Yogyakarta', prov:'DI Yogyakarta', kec:'Gondokusuman', kel:'Terban', pos:'55223', lat:-7.7797, lng:110.3742, tz:'WIB' },
    { kota:'Kota Denpasar', prov:'Bali', kec:'Denpasar Selatan', kel:'Renon', pos:'80226', lat:-8.6705, lng:115.2340, tz:'WITA' },
    { kota:'Kota Palembang', prov:'Sumatera Selatan', kec:'Ilir Barat I', kel:'Demang Lebar Daun', pos:'30137', lat:-2.9800, lng:104.7440, tz:'WIB' },
    { kota:'Kota Balikpapan', prov:'Kalimantan Timur', kec:'Balikpapan Selatan', kel:'Gunung Bahagia', pos:'76114', lat:-1.2654, lng:116.8312, tz:'WITA' },
    { kota:'Kota Pontianak', prov:'Kalimantan Barat', kec:'Pontianak Kota', kel:'Sungai Bangkong', pos:'78116', lat:-0.0263, lng:109.3425, tz:'WIB' },
    { kota:'Kota Manado', prov:'Sulawesi Utara', kec:'Wenang', kel:'Wenang Utara', pos:'95111', lat:1.4748, lng:124.8421, tz:'WITA' },
    { kota:'Kota Banjarmasin', prov:'Kalimantan Selatan', kec:'Banjarmasin Tengah', kel:'Kertak Baru Ilir', pos:'70111', lat:-3.3194, lng:114.5908, tz:'WITA' },
    { kota:'Kota Pekanbaru', prov:'Riau', kec:'Sukajadi', kel:'Kampung Melayu', pos:'28124', lat:0.5071, lng:101.4478, tz:'WIB' },
    { kota:'Kota Batam', prov:'Kepulauan Riau', kec:'Batam Kota', kel:'Teluk Tering', pos:'29461', lat:1.1301, lng:104.0529, tz:'WIB' },
    { kota:'Kota Malang', prov:'Jawa Timur', kec:'Klojen', kel:'Oro-oro Dowo', pos:'65119', lat:-7.9666, lng:112.6326, tz:'WIB' },
    { kota:'Kota Bogor', prov:'Jawa Barat', kec:'Bogor Tengah', kel:'Babakan', pos:'16128', lat:-6.5971, lng:106.8060, tz:'WIB' },
    { kota:'Kota Tangerang Selatan', prov:'Banten', kec:'Pondok Aren', kel:'Pondok Karya', pos:'15225', lat:-6.2754, lng:106.7139, tz:'WIB' },
    { kota:'Kota Bekasi', prov:'Jawa Barat', kec:'Bekasi Selatan', kel:'Pekayon Jaya', pos:'17148', lat:-6.2560, lng:107.0000, tz:'WIB' },
    { kota:'Kota Padang', prov:'Sumatera Barat', kec:'Padang Barat', kel:'Belakang Tangsi', pos:'25117', lat:-0.9471, lng:100.4172, tz:'WIB' },
    { kota:'Kota Samarinda', prov:'Kalimantan Timur', kec:'Samarinda Ulu', kel:'Air Putih', pos:'75124', lat:-0.4948, lng:117.1436, tz:'WITA' },
    { kota:'Kota Mataram', prov:'Nusa Tenggara Barat', kec:'Mataram', kel:'Pagesangan', pos:'83127', lat:-8.5833, lng:116.1167, tz:'WITA' },
    { kota:'Kota Kupang', prov:'Nusa Tenggara Timur', kec:'Oebobo', kel:'Oebobo', pos:'85111', lat:-10.1772, lng:123.6070, tz:'WITA' },
    { kota:'Kota Jayapura', prov:'Papua', kec:'Jayapura Selatan', kel:'Entrop', pos:'99224', lat:-2.5916, lng:140.6690, tz:'WIT' },
    { kota:'Kota Ambon', prov:'Maluku', kec:'Sirimau', kel:'Batu Merah', pos:'97128', lat:-3.6954, lng:128.1814, tz:'WIT' },
    { kota:'Kota Bandar Lampung', prov:'Lampung', kec:'Tanjung Karang Pusat', kel:'Enggal', pos:'35118', lat:-5.4292, lng:105.2610, tz:'WIB' }
  ];
  var JALAN = ['Jl. Merdeka', 'Jl. Diponegoro', 'Jl. Sudirman', 'Jl. Ahmad Yani', 'Jl. Gatot Subroto', 'Jl. Veteran', 'Jl. Kartini', 'Jl. Pahlawan', 'Jl. Melati', 'Jl. Kenanga', 'Jl. Anggrek', 'Jl. Cendana', 'Jl. Mawar', 'Jl. Flamboyan', 'Jl. Bukit Indah'];
  var PATOKAN = ['Seberang masjid', 'Sebelah Indomaret', 'Dekat SD Negeri', 'Pagar hijau, rumah pojok', 'Belakang kantor kelurahan', 'Samping bengkel motor', 'Depan taman', 'Ruko deret ketiga'];

  var NAMA_DEPAN_P = ['Siti', 'Dewi', 'Rina', 'Ayu', 'Nurul', 'Sari', 'Lestari', 'Putri', 'Intan', 'Maya', 'Fitri', 'Ratna', 'Wulan', 'Yuni', 'Dian', 'Novi', 'Rahma', 'Anisa', 'Mega', 'Indah', 'Lastri', 'Tuti', 'Eka', 'Winda', 'Sinta'];
  var NAMA_DEPAN_L = ['Agus', 'Budi', 'Joko', 'Rudi', 'Eko', 'Fajar', 'Teguh', 'Bagas', 'Hendra', 'Andi', 'Rizky', 'Dedi', 'Wahyu', 'Yusuf', 'Arif', 'Bayu', 'Doni', 'Galih', 'Iwan', 'Made', 'Kadek', 'Rendi', 'Tono', 'Ucok', 'Yanto'];
  var NAMA_BELAKANG = ['Setiawan', 'Wulandari', 'Prasetyo', 'Rahayu', 'Hartono', 'Wibowo', 'Nugroho', 'Anggita', 'Saputra', 'Fadhilah', 'Indriani', 'Saputri', 'Maharani', 'Kurniawan', 'Pratama', 'Permata', 'Santoso', 'Hidayat', 'Ramadhan', 'Lestari', 'Siregar', 'Nasution', 'Pangestu', 'Halim', 'Tanjung', 'Simanjuntak', 'Mahendra', 'Wijaya', 'Gunawan', 'Puspita'];
  var PERUSAHAAN = ['PT Cahaya Nusantara', 'CV Karya Bersama', 'Klinik Medika Sehat', 'Sekolah Tunas Bangsa', 'Hotel Grand Kencana', 'Kafe Kopi Senja', 'PT Logistik Prima', 'Apartemen Green View', 'Bank Perkreditan Mandiri Jaya', 'Rumah Makan Selera Nusantara'];
  var BANK = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'BSI'];
  var JABATAN = ['Cleaner', 'Cleaner', 'Cleaner', 'Leader Tim', 'Teknisi Kaca', 'Teknisi Karpet & Sofa', 'Operator Poles', 'Teknisi AC'];
  var TARIF = { 'Leader Tim':95000, 'Teknisi Kaca':110000, 'Teknisi Karpet & Sofa':105000, 'Operator Poles':100000, 'Teknisi AC':98000, 'Cleaner':78000 };
  var FUNGSI = { 'Cleaner':['FK-CLEAN', 'FK-LAUNDRY'], 'Leader Tim':['FK-CLEAN', 'FK-UPHOL', 'FK-POLES'], 'Teknisi Kaca':['FK-KETINGGIAN', 'FK-CLEAN'], 'Teknisi Karpet & Sofa':['FK-UPHOL', 'FK-CLEAN'], 'Operator Poles':['FK-POLES', 'FK-CLEAN'], 'Teknisi AC':['FK-AC', 'FK-CLEAN'] };
  var SERT_NAMA = { 'Leader Tim':['K3 Umum', 'Supervisi Kebersihan'], 'Teknisi Kaca':['K3 Umum', 'Rope Access L1'], 'Teknisi Karpet & Sofa':['Upholstery Care'], 'Operator Poles':['Operator Mesin Poles'], 'Teknisi AC':['Teknisi AC Split'], 'Cleaner':['K3 Umum'] };
  var HUBUNGAN = ['Suami', 'Istri', 'Orang Tua', 'Saudara Kandung', 'Anak'];

  function nama(perempuan) { return pilih(perempuan ? NAMA_DEPAN_P : NAMA_DEPAN_L) + ' ' + pilih(NAMA_BELAKANG); }
  function telp() { return '08' + pilih(['12', '13', '15', '21', '52', '56', '57', '58', '78', '81', '82', '85', '87', '89']) + digit(8); }
  function nik(k, lahir) {
    /* 6 digit kode wilayah (contoh), 6 digit tanggal lahir, 4 digit urut */
    var kodeProv = String(30 + KOTA.indexOf(k) % 60).padStart(2, '0');
    return kodeProv + digit(4) + lahir.slice(8, 10) + lahir.slice(5, 7) + lahir.slice(2, 4) + digit(4);
  }
  function fotoKartu(namaOrang, jenis) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="404"><rect width="640" height="404" rx="18" fill="#E8EEF4"/>' +
      '<rect x="14" y="14" width="612" height="376" rx="12" fill="#F7FAFC" stroke="#B9C6D4"/><rect x="14" y="14" width="612" height="58" rx="12" fill="#109080"/>' +
      '<text x="320" y="52" font-family="Segoe UI,Arial" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">CONTOH ' + jenis + ' — BUKAN DOKUMEN ASLI</text>' +
      '<rect x="440" y="96" width="150" height="190" rx="8" fill="#CBD5E1"/><circle cx="515" cy="160" r="38" fill="#94A3B8"/>' +
      '<text x="48" y="184" font-family="Segoe UI,Arial" font-size="15" fill="#64748B">NAMA</text>' +
      '<text x="48" y="208" font-family="Segoe UI,Arial" font-size="20" font-weight="700" fill="#0F172A">' + namaOrang + '</text>' +
      '<text x="48" y="330" font-family="Segoe UI,Arial" font-size="13" fill="#94A3B8">Data uji EXOCLEAN · semai-dummy.js</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function simpanFoto(id, data) {
    if (window.FOTO && FOTO.simpan) FOTO.simpan(id, data);
    else if (window.DB && DB.terimaFoto) DB.terimaFoto(id, data);
  }
  function alamatObj(k, jalan, nomor) {
    return { jalan: jalan + ' No. ' + nomor, negara:'ID', l1:k.prov, l2:k.kota, l3:k.kec, l4:k.kel, kodePos:k.pos, patokan:pilih(PATOKAN) };
  }
  function teksAlamat(w) { return [w.jalan, 'Kel. ' + w.l4, 'Kec. ' + w.l3, w.l2, w.l1, w.kodePos].join(', '); }

  /* ------------------------------------------------------------ klien */
  function buatKlien(i) {
    var k = KOTA[i % KOTA.length], perempuan = i % 2 === 0, nm = nama(perempuan);
    var tipe = ['rumah', 'rumah', 'ruko', 'korporat', 'apartemen'][i % 5];
    var perusahaan = tipe === 'korporat' || tipe === 'ruko' ? PERUSAHAAN[i % PERUSAHAAN.length] : null;
    var w = alamatObj(k, pilih(JALAN), bulat(1, 120));
    var email = slug(nm) + '.' + (i + 1) + '@' + (perusahaan ? slug(perusahaan).replace(/^(pt|cv)\./, '') + '.co.id' : 'gmail.com');
    var hp = telp(), sejak = bulat(30, 400);
    return {
      role:'client', nama:nm, perusahaan:perusahaan, tipe:tipe, email:email, pass:'123456', telp:hp,
      alamat: teksAlamat(w), wilayah:w, kota:k.kota, zonaWaktu:k.tz,
      alamatList:[{ id:U.uid('adr'), label: tipe === 'rumah' ? 'Rumah' : tipe === 'apartemen' ? 'Apartemen' : 'Kantor', penerima:nm, telp:hp,
        alamat:w.jalan, kota:k.kota, kodePos:k.pos, patokan:w.patokan, utama:true, wilayah:w,
        koordinat:{ lat:+(k.lat + (acak() - 0.5) * 0.02).toFixed(6), lng:+(k.lng + (acak() - 0.5) * 0.02).toFixed(6) } }],
      rekening:[{ id:U.uid('rek'), bank:pilih(BANK), nomor:digit(10), atasNama: perusahaan || nm, utama:true }],
      emailVerifiedAt: hariLalu(sejak, 10), telpVerifiedAt: hariLalu(sejak, 10),
      aktif:true, wajibGantiSandi:false, foto:null, createdAt: hariLalu(sejak, 9),
      preferensi:{ bahasa:'id', notifWA:true, notifEmail:true, ringkasanMingguan:false },
      sumber:'dummy'
    };
  }

  /* ------------------------------------------------------------ mitra */
  function buatMitra(i, kursusByKode, admin) {
    var k = KOTA[(i * 7 + 3) % KOTA.length], perempuan = i % 3 !== 0, nm = nama(perempuan);
    var jabatan = JABATAN[i % JABATAN.length];
    var lahir = (1978 + bulat(0, 24)) + '-' + String(bulat(1, 12)).padStart(2, '0') + '-' + String(bulat(1, 28)).padStart(2, '0');
    var w = alamatObj(k, pilih(JALAN), bulat(1, 90)), hp = telp(), sejak = bulat(60, 700);
    var email = slug(nm) + '.' + (i + 1) + '@' + pilih(['gmail.com', 'yahoo.co.id', 'outlook.com']);
    var fotoDepan = U.uid('ph'), fotoSelfie = U.uid('ph');
    simpanFoto(fotoDepan, fotoKartu(nm, 'KTP')); simpanFoto(fotoSelfie, fotoKartu(nm + ' (swafoto)', 'KTP'));
    var butir = (window.KURIKULUM && KURIKULUM.SYARAT ? KURIKULUM.SYARAT : []).map(function (b) { return b.id; });
    var kd1 = nama(!perempuan), kd2 = nama(bulat(0, 1) === 1);
    var u = {
      role:'worker', nama:nm, jabatan:jabatan, email:email, pass:'123456', telp:hp,
      sertifikat: (SERT_NAMA[jabatan] || []).slice(),
      alamat: teksAlamat(w), wilayah:w, kota:k.kota, zonaWaktu:k.tz,
      alamatList:[{ id:U.uid('adr'), label:'Rumah', penerima:nm, telp:hp, alamat:w.jalan, kota:k.kota, kodePos:k.pos, patokan:w.patokan, utama:true, wilayah:w,
        koordinat:{ lat:+(k.lat + (acak() - 0.5) * 0.03).toFixed(6), lng:+(k.lng + (acak() - 0.5) * 0.03).toFixed(6) } }],
      rekening:[{ id:U.uid('rek'), bank:pilih(BANK), nomor:digit(10), atasNama:nm, utama:true }],
      identitas:{ jenis:'ktp', nomor:nik(k, lahir), namaSesuaiKartu:nm.toUpperCase(), tanggalLahir:lahir, berlakuHingga:'',
        alamatKtp:teksAlamat(w), fotoDepan:fotoDepan, fotoSelfie:fotoSelfie,
        diverifikasi:true, diverifikasiOleh:admin, diverifikasiAt:hariLalu(sejak - 5, 10) },
      kontakDarurat:[
        { id:U.uid('kd'), nama:kd1, hubungan:pilih(HUBUNGAN), telp:telp(), utama:true, verifikasiAt:hariLalu(sejak - 1, 11) },
        { id:U.uid('kd'), nama:kd2, hubungan:pilih(HUBUNGAN), telp:telp(), utama:false, verifikasiAt:hariLalu(sejak - 1, 11) }
      ],
      alamatTinggal:{ alamat:w.jalan, rt:String(bulat(1, 12)).padStart(3, '0'), rw:String(bulat(1, 9)).padStart(3, '0'), kelurahan:k.kel, kecamatan:k.kec,
        kota:k.kota, provinsi:k.prov, kodePos:k.pos, status:pilih(['Milik sendiri', 'Kontrak / sewa', 'Ikut keluarga']), sejak:String(2015 + bulat(0, 10)), samaDenganKtp:true, patokan:w.patokan },
      kepegawaian:{ nomorPegawai:'EXO-' + tglLalu(sejak).slice(0, 4) + '-' + String(100 + i).padStart(3, '0'), tglMasuk:tglLalu(sejak - 12), statusKerja:'mitra',
        kontrakMulai:'', kontrakSelesai:'', penempatan:k.kota, atasanId:'', bpjsTk:'19' + digit(9), bpjsKes:'000' + digit(10), npwp:'', tglBerhenti:'', alasanBerhenti:'', catatan:'Data uji (semai-dummy)' },
      statusMitra:'aktif', daftarAt:hariLalu(sejak, 9), disetujuiAt:hariLalu(sejak - 12, 10), disetujuiOleh:admin, alasanTolak:null,
      persetujuanSK:{ versi:(window.LMS && LMS.versiSK) ? LMS.versiSK() : '2026.1', at:hariLalu(sejak, 9), butir:butir },
      fungsiKerja:(FUNGSI[jabatan] || ['FK-CLEAN']).slice(),
      pasar:{ tarif:TARIF[jabatan] + bulat(-2, 2) * 1000, aktif:true, olehId:admin, olehNama:'Rina Kartika', at:hariLalu(sejak - 13, 11) },
      emailVerifiedAt:hariLalu(sejak, 9), telpVerifiedAt:hariLalu(sejak, 9),
      aktif:true, wajibGantiSandi:false, foto:null, createdAt:hariLalu(sejak, 9),
      preferensi:{ bahasa:'id', notifWA:true, notifEmail:false, ringkasanMingguan:false },
      sumber:'dummy'
    };
    return { user:u, sejak:sejak };
  }

  /* Pembelajaran: 5 kursus wajib + kursus spesialisasi/fungsi yang tersedia,
     semuanya lulus, tiap kursus bersertifikat, lalu sertifikat mitra. */
  function buatPembelajaran(u, sejak, kursusByKode) {
    var kodeWajib = Object.keys(kursusByKode).filter(function (kd) { return kursusByKode[kd].wajib; });
    var kodeLain = [];
    (u.fungsiKerja || []).forEach(function (fk) {
      var f = window.KOMPETENSI && KOMPETENSI.FUNGSI ? KOMPETENSI.FUNGSI.filter(function (x) { return x.kode === fk; })[0] : null;
      var kd = f ? f.kursus : fk;
      if (kursusByKode[kd] && kodeWajib.indexOf(kd) < 0 && kodeLain.indexOf(kd) < 0) kodeLain.push(kd);
    });
    var semua = kodeWajib.concat(kodeLain), nilaiWajib = [], n = 0;
    semua.forEach(function (kd, i) {
      var k = kursusByKode[kd], nilai = bulat(Math.max(80, k.nilaiMin || 80), 100), jarak = Math.max(3, sejak - 4 - i * 2);
      DB.insert('lmsProgres', { userId:u.id, kursusId:k.id, status:'selesai',
        materiSelesai:(k.materi || []).map(function (_, idx) { return idx; }),
        percobaan:[{ at:hariLalu(jarak, 20), nilai:nilai, benar:Math.round(nilai / 100 * ((k.kuis || []).length || 5)), total:(k.kuis || []).length || 5, lulus:true }],
        nilaiTerbaik:nilai, mulaiAt:hariLalu(jarak + 1, 19), selesaiAt:hariLalu(jarak, 20), createdAt:hariLalu(jarak + 1, 19), sumber:'dummy' });
      terbitSert(u.id, k.id, k.judul, k.wajib ? 'wajib' : 'spesialisasi', nilai, jarak, k.masaBerlakuHari);
      if (k.wajib) nilaiWajib.push(nilai);
      n++;
    });
    if (kodeWajib.length && nilaiWajib.length === kodeWajib.length) {
      var rata = Math.round(nilaiWajib.reduce(function (a, b) { return a + b; }, 0) / nilaiWajib.length);
      terbitSert(u.id, 'MITRA', 'Mitra Tersertifikasi EXOCLEAN', 'mitra', rata, Math.max(2, sejak - 12), 1095);
      n++;
    }
    return n;
  }
  function kodeSert(seed) {
    var h = 5381; for (var i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', t = '';
    for (var j = 0; j < 8; j++) { t += ab[h % ab.length]; h = Math.floor(h / ab.length) + j * 7919; }
    return t.slice(0, 4) + '-' + t.slice(4);
  }
  function terbitSert(userId, kursusId, judul, jenis, nilai, hariKe, masaHari) {
    var no = U.docNo('CERT', DB.nextNo('sertifikat'), new Date(hariLalu(hariKe)));
    var hingga = new Date(); hingga.setDate(hingga.getDate() - hariKe + (masaHari || 1095));
    DB.insert('sertifikat', { no:no, userId:userId, kursusId:kursusId, judul:judul, jenis:jenis, nilai:nilai,
      terbitAt:hariLalu(hariKe, 14), berlakuHingga:hingga.toISOString().slice(0, 10), kode:kodeSert(userId + '|' + kursusId + '|' + no), createdAt:hariLalu(hariKe, 14), sumber:'dummy' });
  }

  /* ------------------------------------------------------------ jalankan */
  function jalankan(opsi) {
    opsi = opsi || {};
    if (!window.DB || !window.U) return { ok:false, alasan:'DB / U belum dimuat.' };
    try { if (!DB.raw) DB.init(); } catch (e) { return { ok:false, alasan:'Basis data tidak bisa dibuka: ' + e.message }; }
    if (!DB.all('users').length) return { ok:false, alasan:'Basis data kosong — buka index.html dulu supaya tersemai, baru jalankan ini.' };

    benih = 20260902;
    var adminRow = DB.where('users', function (x) { return x.role === 'admin'; })[0], admin = adminRow ? adminRow.id : 'u_admin';
    var kursusByKode = {}; DB.all('kursus').forEach(function (k) { kursusByKode[k.kode] = k; });
    var adaEmail = {}; DB.all('users').forEach(function (x) { if (x.email) adaEmail[x.email.toLowerCase()] = true; });
    var hasil = { klienBaru:0, klienLewat:0, mitraBaru:0, mitraLewat:0, pembelajaran:0, kota:{} };

    for (var i = 0; i < (opsi.klien || 20); i++) {
      var c = buatKlien(i);
      if (adaEmail[c.email.toLowerCase()]) { hasil.klienLewat++; continue; }
      DB.insert('users', c); adaEmail[c.email.toLowerCase()] = true; hasil.klienBaru++;
      hasil.kota[c.kota] = (hasil.kota[c.kota] || 0) + 1;
    }
    for (var j = 0; j < (opsi.mitra || 50); j++) {
      var m = buatMitra(j, kursusByKode, admin);
      if (adaEmail[m.user.email.toLowerCase()]) { hasil.mitraLewat++; continue; }
      var row = DB.insert('users', m.user); adaEmail[row.email.toLowerCase()] = true; hasil.mitraBaru++;
      hasil.kota[row.kota] = (hasil.kota[row.kota] || 0) + 1;
      hasil.pembelajaran += buatPembelajaran(row, m.sejak, kursusByKode);
    }
    if (DB.log) DB.log(admin, 'Menyemai data uji: ' + hasil.klienBaru + ' klien, ' + hasil.mitraBaru + ' mitra (semai-dummy.js)', 'user', null);
    DB.save(true);
    hasil.ok = true; hasil.jumlahKota = Object.keys(hasil.kota).length;
    return hasil;
  }

  /** Hapus kembali seluruh baris bertanda dummy — hanya bila diminta. */
  function bersihkan() {
    var n = 0;
    ['sertifikat', 'lmsProgres', 'users'].forEach(function (t) {
      DB.all(t).filter(function (r) { return r.sumber === 'dummy'; }).forEach(function (r) { DB.remove(t, r.id); n++; });
    });
    DB.save(true);
    return { dihapus:n };
  }

  return { jalankan:jalankan, bersihkan:bersihkan, KOTA:KOTA };
})();
