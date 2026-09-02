/* ==========================================================================
   buat-buana-motorindo.js — data contoh PT Buana Indah Motorindo
   --------------------------------------------------------------------------
   Menjalankan:  node app/data/contoh/buat-buana-motorindo.js

   Menghasilkan satu berkas JSON yang dibaca layar penyemai di aplikasi.
   TIDAK menulis ke basis data mana pun; yang menulis adalah aplikasinya,
   lewat jalur yang sama dengan yang dipakai manusia.

   KENAPA BUKAN CSV SEPERTI MENARA CAKRAWALA

   Impor CSV hanya mengerti STRUKTUR TEMPAT. Data ini juga memuat pengguna
   beserta perannya, petugas beserta penempatannya, peralatan, dan titik peta
   — yang tidak punya kolom di berkas struktur mana pun. Memaksakannya ke CSV
   berarti empat berkas yang harus diimpor berurutan dan saling menunggu.

   ANGKANYA DARI MANA

   Luas dan jumlah petugas disusun dari pola dealer mobil yang lazim di
   Indonesia, bukan diambil dari satu perusahaan sungguhan:

     · Dealer 3S (Sales-Service-Sparepart) menengah menempati 1.800–3.500 m²:
       showroom berkaca penuh, bengkel dengan 6–14 lift, gudang sparepart,
       ruang tunggu, kantor, dan halaman parkir yang biasanya lebih luas
       daripada bangunannya sendiri.
     · Beban petugas kebersihan dealer berkisar 900–1.400 m² per orang per
       shift. Showroom kaca menurunkan angka itu; parkir terbuka menaikkannya.

   Titik peta memakai koordinat kota yang sesungguhnya, digeser acak dalam
   radius beberapa kilometer supaya delapan puluh enam cabang tidak menumpuk
   pada satu titik yang sama persis di peta.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

/* Acak yang DAPAT DIULANG. Tanpa benih tetap, menjalankan berkas ini dua kali
   menghasilkan dua kumpulan data yang berbeda — dan perbedaan yang tidak
   disengaja pada data contoh adalah perbedaan yang akan dikira bug. */
let benih = 20260824;
function acak() {
  benih = (benih * 1103515245 + 12345) & 0x7fffffff;
  return benih / 0x7fffffff;
}
function antara(a, b) { return a + acak() * (b - a); }
function bulat(a, b) { return Math.round(antara(a, b)); }
function pilih(arr) { return arr[Math.floor(acak() * arr.length)]; }

/* ============================================================ KOTA & TITIK

   Koordinat pusat kota yang sungguhan. Cabang digeser dari titik ini supaya
   dua cabang di kota yang sama tidak berhimpit. */
const KOTA = [
  ['Jakarta Pusat', 'DKI Jakarta', -6.1865, 106.8340, 4],
  ['Jakarta Selatan', 'DKI Jakarta', -6.2615, 106.8106, 4],
  ['Jakarta Barat', 'DKI Jakarta', -6.1683, 106.7588, 3],
  ['Jakarta Timur', 'DKI Jakarta', -6.2250, 106.9004, 3],
  /* Kolom kedua (provinsi) hanya sisa sejarah: yang dipakai sekarang adalah
     provinsi dari daftar resmi lewat wilayahKota(). Dibiarkan supaya baris
     ini tetap terbaca sebagai satu kesatuan oleh yang menyuntingnya. */
  ['Jakarta Utara', 'DKI Jakarta', -6.1214, 106.8746, 2],
  ['Bekasi', 'Jawa Barat', -6.2383, 106.9756, 3],
  ['Depok', 'Jawa Barat', -6.4025, 106.7942, 2],
  ['Tangerang', 'Banten', -6.1783, 106.6300, 3],
  ['Tangerang Selatan', 'Banten', -6.2886, 106.7179, 2],
  ['Bogor', 'Jawa Barat', -6.5950, 106.8166, 2],
  ['Bandung', 'Jawa Barat', -6.9175, 107.6191, 4],
  ['Cimahi', 'Jawa Barat', -6.8722, 107.5425, 1],
  ['Cirebon', 'Jawa Barat', -6.7320, 108.5523, 1],
  ['Tasikmalaya', 'Jawa Barat', -7.3274, 108.2207, 1],
  ['Semarang', 'Jawa Tengah', -6.9932, 110.4203, 3],
  ['Solo', 'Jawa Tengah', -7.5755, 110.8243, 2],
  ['Yogyakarta', 'DI Yogyakarta', -7.7956, 110.3695, 2],
  ['Magelang', 'Jawa Tengah', -7.4698, 110.2177, 1],
  ['Tegal', 'Jawa Tengah', -6.8694, 109.1402, 1],
  ['Purwokerto', 'Jawa Tengah', -7.4249, 109.2394, 1],
  ['Surabaya', 'Jawa Timur', -7.2575, 112.7521, 4],
  ['Sidoarjo', 'Jawa Timur', -7.4478, 112.7183, 2],
  ['Malang', 'Jawa Timur', -7.9666, 112.6326, 2],
  ['Kediri', 'Jawa Timur', -7.8480, 112.0178, 1],
  ['Jember', 'Jawa Timur', -8.1729, 113.7003, 1],
  ['Madiun', 'Jawa Timur', -7.6298, 111.5239, 1],
  ['Denpasar', 'Bali', -8.6705, 115.2126, 2],
  ['Mataram', 'Nusa Tenggara Barat', -8.5833, 116.1167, 1],
  ['Kupang', 'Nusa Tenggara Timur', -10.1772, 123.6070, 1],
  ['Medan', 'Sumatera Utara', 3.5952, 98.6722, 3],
  ['Pematangsiantar', 'Sumatera Utara', 2.9595, 99.0687, 1],
  ['Pekanbaru', 'Riau', 0.5071, 101.4478, 2],
  ['Batam', 'Kepulauan Riau', 1.0456, 104.0305, 2],
  ['Padang', 'Sumatera Barat', -0.9471, 100.4172, 1],
  ['Palembang', 'Sumatera Selatan', -2.9761, 104.7754, 2],
  ['Jambi', 'Jambi', -1.6101, 103.6131, 1],
  ['Bandar Lampung', 'Lampung', -5.4294, 105.2610, 2],
  ['Bengkulu', 'Bengkulu', -3.7928, 102.2608, 1],
  ['Banda Aceh', 'Aceh', 5.5483, 95.3238, 1],
  ['Pontianak', 'Kalimantan Barat', -0.0263, 109.3425, 1],
  ['Banjarmasin', 'Kalimantan Selatan', -3.3186, 114.5944, 1],
  ['Balikpapan', 'Kalimantan Timur', -1.2379, 116.8529, 1],
  ['Samarinda', 'Kalimantan Timur', -0.5022, 117.1536, 1],
  ['Palangkaraya', 'Kalimantan Tengah', -2.2096, 113.9108, 1],
  ['Makassar', 'Sulawesi Selatan', -5.1477, 119.4327, 2],
  ['Manado', 'Sulawesi Utara', 1.4748, 124.8421, 1],
  ['Palu', 'Sulawesi Tengah', -0.8917, 119.8707, 1],
  ['Kendari', 'Sulawesi Tenggara', -3.9985, 122.5127, 1],
  ['Gorontalo', 'Gorontalo', 0.5435, 123.0568, 1],
  ['Ambon', 'Maluku', -3.6954, 128.1814, 1],
  ['Jayapura', 'Papua', -2.5916, 140.6690, 1],
  ['Sorong', 'Papua Barat', -0.8762, 131.2558, 1]
];

/* ================================================== WILAYAH RESMI
   Nama kota pada tabel di atas adalah nama SEHARI-HARI — “Solo”, “Bandung”,
   “Jakarta Selatan”. Daftar resmi Kemendagri menulis “Kota Surakarta”,
   “Kota Bandung”, “Kota Administrasi Jakarta Selatan”, dan alamat
   terstruktur harus memakai nama resmi itu: pemilih di formulir hanya
   mengenal nama yang ada di daftarnya, dan nilai yang tidak dikenalinya
   dibuang peramban tanpa memberi tahu siapa pun.

   Tiga hal yang tidak bisa ditebak dari nama sehari-hari, karena itu
   ditulis di sini satu per satu:
     · “Solo” bukan nama resmi mana pun — kotanya bernama Surakarta.
     · “Purwokerto” bukan kota; ia ibukota KABUPATEN BANYUMAS.
     · “Jember” dan “Sidoarjo” adalah kabupaten, bukan kota — dan menebak
       “Kota” untuk keduanya akan menghasilkan wilayah yang tidak ada.
   Nama yang dipakai dua wilayah sekaligus (Bandung, Bekasi, Malang, …)
   dibaca sebagai KOTA-nya: koordinat pada tabel di atas adalah titik pusat
   kota, bukan ibukota kabupatennya. */
const KABKOTA = {
  'Jakarta Pusat': 'Kota Administrasi Jakarta Pusat',
  'Jakarta Selatan': 'Kota Administrasi Jakarta Selatan',
  'Jakarta Barat': 'Kota Administrasi Jakarta Barat',
  'Jakarta Timur': 'Kota Administrasi Jakarta Timur',
  'Jakarta Utara': 'Kota Administrasi Jakarta Utara',
  'Solo': 'Kota Surakarta',
  'Purwokerto': 'Kabupaten Banyumas',
  'Jember': 'Kabupaten Jember',
  'Sidoarjo': 'Kabupaten Sidoarjo'
};

/* Daftar resmi yang dipakai aplikasi itu sendiri — bukan salinan di berkas
   ini. Kolom provinsi pada tabel KOTA sempat ditulis tangan dan sudah basi:
   ia menyebut Sorong ada di “Papua Barat”, padahal sejak pemekaran 2022
   kotanya berada di Papua Barat Daya. Provinsi kini DITURUNKAN dari daftar
   resmi, sehingga tidak ada salinan kedua yang bisa basi sendiri. */
const IDX = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'wilayah', 'id', 'index.json'), 'utf8'));
const RESMI = [];
IDX.prov.forEach(function (p) {
  (p.kab || []).forEach(function (k) { RESMI.push({ prov: p.n, nama: k.n }); });
});

/**
 * Alamat TERSTRUKTUR sebuah cabang, dari nama kota sehari-hari.
 *
 * Berhenti dengan galat bila kotanya tidak ada di daftar resmi. Data contoh
 * yang alamatnya diam-diam kosong akan dikira cacat aplikasi oleh orang
 * yang membukanya, dan dicari berhari-hari di tempat yang salah.
 */
function wilayahKota(namaKota, jalan) {
  const resmiNama = KABKOTA[namaKota] || ('Kota ' + namaKota);
  const r = RESMI.filter(function (x) { return x.nama === resmiNama; })[0];
  if (!r) throw new Error('Wilayah tidak ada di daftar resmi: ' + namaKota +
    ' (dicari sebagai "' + resmiNama + '") — tambahkan ke KABKOTA.');
  /* Kecamatan, kelurahan, dan kode pos SENGAJA kosong. Ketiganya tidak bisa
     diturunkan dari “Jl. Sudirman No. 42”, dan mengarangnya berarti menaruh
     alamat palsu yang terlihat sungguhan. periksa() memang tidak mewajibkan
     ketiganya: yang wajib hanya negara, provinsi, kota, dan jalan. */
  return { negara: 'ID', l1: r.prov, l2: r.nama, l3: '', l4: '',
           kodePos: '', jalan: jalan, patokan: '' };
}

/* Nama jalan yang lazim menjadi koridor dealer di kota-kota Indonesia. */
const JALAN = [
  'Jl. Ahmad Yani', 'Jl. Gatot Subroto', 'Jl. Sudirman', 'Jl. Diponegoro',
  'Jl. Soekarno-Hatta', 'Jl. MT Haryono', 'Jl. Raya Bypass',
  'Jl. Pahlawan', 'Jl. Imam Bonjol', 'Jl. Gajah Mada', 'Jl. Veteran',
  'Jl. Raya Industri', 'Jl. Hasanuddin', 'Jl. Dr. Sutomo'
];

/* ==================================================== SUSUNAN AREA DEALER

   `per` = pembagi luas: berapa m² area ini untuk tiap 1.000 m² luas dealer.
   Jumlahnya kira-kira 1.000 supaya luas areanya menjumlah mendekati luas
   dealer, dengan sisa yang wajar sebagai selisih yang belum terdaftar —
   dan selisih itu memang berguna, karena ia pertanyaan yang harus muncul. */
const AREA_DEALER = [
  { nama: 'Showroom',            jenis: 'Lobi',           per: 210 },
  { nama: 'Ruang Tunggu Pelanggan', jenis: 'Lobi',        per: 55 },
  { nama: 'Bengkel Servis',      jenis: 'Bangunan',       per: 260 },
  { nama: 'Gudang Sparepart',    jenis: 'Gudang',         per: 85 },
  { nama: 'Kantor Penjualan',    jenis: 'Ruang Kerja',    per: 90 },
  { nama: 'Ruang Rapat',         jenis: 'Rapat',          per: 25 },
  { nama: 'Toilet Pelanggan',    jenis: 'Toilet',         per: 18 },
  { nama: 'Toilet Karyawan',     jenis: 'Toilet',         per: 14 },
  { nama: 'Pantry & Kantin',     jenis: 'Pantry',         per: 22 },
  { nama: 'Mushola',             jenis: 'Mushola',        per: 18 },
  { nama: 'Koridor & Tangga',    jenis: 'Koridor',        per: 33 },
  { nama: 'Parkir Pelanggan',    jenis: 'Parkir',         per: 130 },
  { nama: 'Halaman & Taman',     jenis: 'Taman',          per: 30 },
  { nama: 'Pos Satpam',          jenis: 'Pos Security',   per: 10 }
];

/* Kantor pusat bukan dealer: tidak ada bengkel, tetapi ada banyak lantai
   kantor, ruang server, dan arsip. */
const AREA_PUSAT = [
  { nama: 'Lobi Utama',              jenis: 'Lobi',        luas: 320 },
  { nama: 'Showroom Pusat',          jenis: 'Lobi',        luas: 460 },
  { nama: 'Kantor Direksi',          jenis: 'Ruang Kerja', luas: 380 },
  { nama: 'Kantor Keuangan',         jenis: 'Ruang Kerja', luas: 420 },
  { nama: 'Kantor Pemasaran',        jenis: 'Ruang Kerja', luas: 460 },
  { nama: 'Kantor Operasional',      jenis: 'Ruang Kerja', luas: 400 },
  { nama: 'Ruang Rapat Besar',       jenis: 'Rapat',       luas: 180 },
  { nama: 'Ruang Rapat Kecil',       jenis: 'Rapat',       luas: 90 },
  { nama: 'Ruang Server',            jenis: 'Gudang',      luas: 60 },
  { nama: 'Gudang Arsip',            jenis: 'Gudang',      luas: 140 },
  { nama: 'Kantin Karyawan',         jenis: 'Pantry',      luas: 260 },
  { nama: 'Mushola',                 jenis: 'Mushola',     luas: 120 },
  { nama: 'Toilet Lantai 1-3',       jenis: 'Toilet',      luas: 96 },
  { nama: 'Toilet Lantai 4-6',       jenis: 'Toilet',      luas: 96 },
  { nama: 'Koridor & Tangga',        jenis: 'Koridor',     luas: 340 },
  { nama: 'Lift & Lobi Lift',        jenis: 'Lift',        luas: 80 },
  { nama: 'Parkir Basement',         jenis: 'Parkir',      luas: 1800 },
  { nama: 'Halaman & Taman Depan',   jenis: 'Taman',       luas: 520 },
  { nama: 'Pos Satpam Utama',        jenis: 'Pos Security', luas: 18 }
];

/* ======================================================= PERALATAN

   Dipilih menurut FUNGSI KERJA, bukan menurut daftar belanja. Alat yang
   dipegang seorang petugas toilet berbeda dari yang dipegang tim bengkel,
   dan mencampurnya membuat daftar peralatan tidak bisa menjawab pertanyaan
   "siapa memegang apa". */
const ALAT = [
  /* dipakai di mana saja */
  { nama: 'Trolley Cleaning Service', jenis: 'troli', harga: 2850000, umur: 60,
    untuk: 'semua', per: 1 },
  { nama: 'Vacuum Cleaner Wet & Dry 30L', jenis: 'vacuum', harga: 4200000, umur: 48,
    untuk: 'semua', per: 1 },
  { nama: 'Mesin Poles Lantai 17 inci', jenis: 'poles', harga: 12500000, umur: 84,
    untuk: 'dealer', per: 1 },
  { nama: 'Single Disc Scrubber', jenis: 'scrubber', harga: 9800000, umur: 72,
    untuk: 'besar', per: 1 },
  { nama: 'Blower Pengering Lantai', jenis: 'blower', harga: 2100000, umur: 48,
    untuk: 'dealer', per: 1 },
  { nama: 'High Pressure Cleaner 130 bar', jenis: 'jet', harga: 6400000, umur: 60,
    untuk: 'bengkel', per: 1 },
  { nama: 'Tangga Lipat Aluminium 3 m', jenis: 'tangga', harga: 1350000, umur: 84,
    untuk: 'semua', per: 1 },
  { nama: 'Window Washer Set + Squeegee', jenis: 'lain', harga: 780000, umur: 24,
    untuk: 'showroom', per: 1 },
  { nama: 'Telescopic Pole 6 m', jenis: 'lain', harga: 1450000, umur: 48,
    untuk: 'showroom', per: 1 },
  { nama: 'Mop Set Microfiber + Ember Perah', jenis: 'lain', harga: 620000, umur: 18,
    untuk: 'semua', per: 2 },
  { nama: 'Sapu Lidi & Serokan Halaman', jenis: 'lain', harga: 185000, umur: 12,
    untuk: 'semua', per: 1 },
  { nama: 'Mesin Sedot Debu Punggung', jenis: 'vacuum', harga: 5600000, umur: 60,
    untuk: 'besar', per: 1 },
  { nama: 'Sikat Toilet & Caddy Sanitasi', jenis: 'lain', harga: 320000, umur: 12,
    untuk: 'semua', per: 1 },
  { nama: 'Safety Sign "Lantai Basah"', jenis: 'lain', harga: 145000, umur: 36,
    untuk: 'semua', per: 2 }
];

/* ==================================================== BAHAN HABIS PAKAI

   Lingkup objek dipakai untuk barang yang membersihkan BENDA — pelajaran
   dari Menara Cakrawala, tempat pembersih kaca berlingkup AREA diperkirakan
   butuh 958 botol sebulan karena diukur terhadap luas lantai. Showroom
   dealer justru kasus terburuknya: kacanya jauh lebih luas daripada gedung
   kantor biasa. */
const BAHAN = [
  ['Pembersih Lantai Serbaguna', 'botol', 27000, 240, 60, 1000, 'ml', 800, 'semua', 'Lantai',
   'Iritasi kulit / mata', 'konsentrat, encerkan 1:100'],
  ['Pembersih Kaca Showroom', 'botol', 31000, 180, 45, 500, 'ml', 50, '', 'Kaca;Cermin',
   'Mengandung amonia', 'kaca showroom dilap dua sisi'],
  ['Pembersih Toilet', 'botol', 34000, 150, 40, 500, 'ml', '', '', 'Bilik;Urinoir',
   'Korosif (asam / basa kuat)', 'jangan dicampur pemutih'],
  ['Degreaser Lantai Bengkel', 'liter', 48000, 120, 30, 1000, 'ml', 120, 'Bangunan', '',
   'Iritasi kulit / mata', 'untuk noda oli dan gemuk'],
  ['Pemutih Klorin', 'liter', 23000, 60, 15, 1000, 'ml', '', 'Toilet', '',
   'Pemutih berbasis klorin', 'hanya untuk noda membandel'],
  ['Karbol Wangi', 'liter', 25000, 90, 24, 1000, 'ml', 700, 'Koridor;Lift;Lobi', 'Lantai',
   'Iritasi kulit / mata', ''],
  ['Pengharum Ruangan', 'botol', 19000, 120, 30, 300, 'ml', '', 'Toilet;Lobi;Mushola', '', '', ''],
  ['Sabun Cuci Tangan', 'galon', 98000, 45, 12, 5000, 'ml', '', 'Toilet;Pantry', '',
   'Iritasi kulit / mata', 'untuk isi ulang dispenser'],
  ['Semir Ban & Dashboard', 'botol', 42000, 60, 15, 500, 'ml', '', 'Showroom', '',
   '', 'mobil pajangan showroom'],
  ['Kain Lap Microfiber', 'pcs', 13000, 400, 100, '', '', '', 'semua', '', '', ''],
  ['Kanebo Pengering', 'pcs', 24000, 120, 30, '', '', '', 'Showroom', '', '', ''],
  ['Tisu Gulung', 'roll', 6800, 900, 200, '', '', '', 'Toilet', '', '', ''],
  ['Tisu Tangan Lipat', 'pak', 22000, 260, 60, '', '', '', 'Toilet', '', '', ''],
  ['Kantong Sampah 60x90', 'pak', 19500, 180, 45, '', '', '', 'semua', 'Tempat sampah', '', ''],
  ['Kantong Sampah 90x120', 'pak', 28000, 90, 24, '', '', '', 'Parkir;Taman', '', '', ''],
  ['Sarung Tangan Karet', 'pasang', 15000, 300, 80, '', '', '', 'semua', '', '', 'APD wajib'],
  ['Masker Kain 3 Lapis', 'pak', 26000, 120, 30, '', '', '', 'semua', '', '', 'APD wajib'],
  ['Sepatu Boot Anti Slip', 'pasang', 165000, 90, 24, '', '', '', 'Bangunan', '', '', 'APD bengkel']
];

/* ================================================================ PERAN

   Enam peran yang sama dengan MCSAKSES. Jumlah orangnya disusun seperti
   perusahaan sungguhan: sedikit di puncak, banyak di lapangan. */
const PERAN_STAF = [
  { kode: 'admin',      jabatan: 'Kepala Divisi General Affair',      jumlah: 1 },
  { kode: 'pusat',      jabatan: 'Staf General Affair Pusat',         jumlah: 4 },
  { kode: 'auditor',    jabatan: 'Auditor Internal',                  jumlah: 2 },
  { kode: 'cabang',     jabatan: 'Kepala Cabang',                     jumlah: 12 },
  { kode: 'supervisor', jabatan: 'Supervisor Kebersihan Area',        jumlah: 9 },
  { kode: 'leader',     jabatan: 'Leader Regu Kebersihan',            jumlah: 14 }
];

const DEPAN = ['Andi', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hendra',
  'Indra', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri',
  'Rizal', 'Sari', 'Taufik', 'Umi', 'Vina', 'Wawan', 'Yudi', 'Zaki',
  'Agus', 'Bayu', 'Dian', 'Erwin', 'Fitri', 'Galih', 'Hesti', 'Ilham',
  'Jamal', 'Kurnia', 'Lina', 'Mira', 'Novi', 'Panji', 'Ratna', 'Slamet'];
const BELAKANG = ['Wijaya', 'Santoso', 'Pratama', 'Kusuma', 'Nugroho', 'Hidayat',
  'Saputra', 'Lestari', 'Maulana', 'Rahmawati', 'Setiawan', 'Anggraini',
  'Firmansyah', 'Puspita', 'Hartono', 'Wibowo', 'Permata', 'Susanto',
  'Handayani', 'Prasetyo', 'Ramadhan', 'Cahyani', 'Gunawan', 'Utami'];

let namaDipakai = {};
function namaOrang() {
  for (let i = 0; i < 200; i++) {
    const n = pilih(DEPAN) + ' ' + pilih(BELAKANG);
    if (!namaDipakai[n]) { namaDipakai[n] = 1; return n; }
  }
  return pilih(DEPAN) + ' ' + pilih(BELAKANG) + ' ' + Object.keys(namaDipakai).length;
}

function email(nama, domain) {
  return nama.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.') + '@' + domain;
}

/* =============================================================== SUSUN */

const lokasi = [];
const petugas = [];
const aset = [];

/* ---- kantor pusat ---- */
const luasPusat = AREA_PUSAT.reduce(function (n, a) { return n + a.luas; }, 0);
lokasi.push({
  kode: 'HO-01',
  nama: 'Kantor Pusat Buana Indah Motorindo',
  jenis: 'pusat',
  alamat: 'Jl. Gatot Subroto Kav. 42',
  kota: 'Jakarta Selatan',
  provinsi: wilayahKota('Jakarta Selatan', '').l1,
  wilayah: wilayahKota('Jakarta Selatan', 'Jl. Gatot Subroto Kav. 42'),
  koordinat: { lat: -6.2345, lng: 106.8210 },
  lantai: 6,
  luasTanah: 9800,
  area: AREA_PUSAT.map(function (a) {
    return { nama: a.nama, jenis: a.jenis, luas: a.luas };
  })
});

/* ---- 86 cabang ---- */
let nomor = 0;
KOTA.forEach(function (k) {
  const [namaKota, prov, lat, lng, banyak] = k;
  for (let i = 0; i < banyak; i++) {
    if (nomor >= 86) return;
    nomor++;
    /* Luas dealer: 1.800–3.500 m², dibulatkan ke 50 m² terdekat supaya tidak
       terlihat seperti angka yang dikarang mesin sampai satuan meter. */
    const luas = Math.round(antara(1800, 3500) / 50) * 50;
    const sufiks = banyak > 1 ? ' ' + (i + 1) : '';
    /* Dihitung SEKALI. pilih() dan bulat() menggerakkan benih acak; memanggil
       keduanya dua kali akan menggeser seluruh data sesudahnya. */
    const jalan = pilih(JALAN) + ' No. ' + bulat(5, 289);
    const wil = wilayahKota(namaKota, jalan);
    lokasi.push({
      kode: 'CB-' + String(nomor).padStart(3, '0'),
      nama: 'Dealer Buana ' + namaKota + sufiks,
      jenis: 'cabang',
      alamat: jalan,
      kota: namaKota,
      provinsi: wil.l1,
      wilayah: wil,
      /* Digeser sampai kira-kira 6 km supaya cabang di kota yang sama tidak
         menumpuk pada satu titik. 0,01 derajat kira-kira 1,1 km. */
      koordinat: {
        lat: Math.round((lat + antara(-0.055, 0.055)) * 1e6) / 1e6,
        lng: Math.round((lng + antara(-0.055, 0.055)) * 1e6) / 1e6
      },
      lantai: luas > 2800 ? 2 : 1,
      luasTanah: Math.round(luas * antara(1.25, 1.6) / 50) * 50,
      area: AREA_DEALER.map(function (a) {
        return { nama: a.nama, jenis: a.jenis,
          luas: Math.max(8, Math.round(luas * a.per / 1000)) };
      })
    });
  }
});

/* ---- petugas kebersihan per lokasi ---- */
/* `jabatan` memakai KODE yang dikenal MCS (koordinator/leader/pelaksana);
   sebutan rincinya disimpan sebagai catatan, karena "Petugas Bengkel" bukan
   kedudukan dalam struktur melainkan keterangan tugasnya. */
const JABATAN_PETUGAS = [
  { sebutan: 'Leader Regu Kebersihan', jabatan: 'leader',    jenis: 'cleaning' },
  { sebutan: 'Petugas Showroom',      jabatan: 'pelaksana', jenis: 'cleaning' },
  { sebutan: 'Petugas Bengkel',       jabatan: 'pelaksana', jenis: 'cleaning' },
  { sebutan: 'Petugas Toilet & Pantry', jabatan: 'pelaksana', jenis: 'toilet' },
  { sebutan: 'Petugas Halaman & Parkir', jabatan: 'pelaksana', jenis: 'kebun' },
  { sebutan: 'Office Boy Kantor',     jabatan: 'pelaksana', jenis: 'ob' }
];

lokasi.forEach(function (l) {
  const luasBersih = l.area.reduce(function (n, a) { return n + a.luas; }, 0);
  /* Beban 900–1.400 m² per orang. Dibulatkan ke atas: setengah orang tidak
     bisa dikirim, dan membulatkan ke bawah berarti ada bagian gedung yang
     memang tidak ada yang membersihkan. */
  let n = Math.max(2, Math.ceil(luasBersih / bulat(900, 1400)));
  if (l.jenis === 'pusat') n = Math.max(n, 14);
  l.jumlahPetugas = n;

  for (let i = 0; i < n; i++) {
    const j = i === 0 ? JABATAN_PETUGAS[0]
      : JABATAN_PETUGAS[1 + ((i - 1) % (JABATAN_PETUGAS.length - 1))];
    petugas.push({
      lokasiKode: l.kode,
      nama: namaOrang(),
      jabatan: j.jabatan,
      sebutan: j.sebutan,
      jenis: j.jenis,
      /* Dealer buka pagi sampai sore; kantor pusat memakai dua shift karena
         lobinya dipakai sampai malam. */
      shift: l.jenis === 'pusat' ? (i % 2 === 0 ? 'pagi' : 'siang') : 'nonshift',
      upah: Math.round(antara(2900000, 4300000) / 50000) * 50000
    });
  }
});

/* ---- peralatan per lokasi ---- */
lokasi.forEach(function (l) {
  const luasBersih = l.area.reduce(function (n, a) { return n + a.luas; }, 0);
  const besar = luasBersih > 2600 || l.jenis === 'pusat';
  ALAT.forEach(function (a) {
    let ikut = a.untuk === 'semua';
    if (a.untuk === 'dealer') ikut = l.jenis === 'cabang';
    if (a.untuk === 'bengkel') ikut = l.jenis === 'cabang';
    if (a.untuk === 'showroom') ikut = true;
    if (a.untuk === 'besar') ikut = besar;
    if (!ikut) return;
    const jml = a.per * (l.jenis === 'pusat' ? 2 : 1);
    for (let i = 0; i < jml; i++) {
      aset.push({
        lokasiKode: l.kode,
        nama: a.nama + (jml > 1 ? ' #' + (i + 1) : ''),
        jenis: a.jenis,
        harga: a.harga,
        umurBulan: a.umur
      });
    }
  });
});

/* ---- staf korporat beserta perannya ---- */
const staf = [];
const kodeCabang = lokasi.filter(function (l) { return l.jenis === 'cabang'; })
  .map(function (l) { return l.kode; });
let sisaCabang = kodeCabang.slice();

PERAN_STAF.forEach(function (p) {
  for (let i = 0; i < p.jumlah; i++) {
    const nama = namaOrang();
    let punya = [];
    /* DIBAGI RATA, bukan dipotong sekian-sekian.

       Semula tiap kepala cabang mengambil `ceil(86/12)` = 8 cabang, yang
       berarti 96 jatah untuk 86 cabang — dan orang kedua belas kebagian NOL.
       Nol pada peran berbatas cabang berarti TANPA BATAS menurut MCSAKSES,
       jadi ia justru melihat seluruh jaringan. Ketahuan bukan dari kode
       ini melainkan dari lencana di layar hak akses, yang memang dipasang
       untuk menangkap persis keadaan itu.

       Pembagian rata memberi sisa kepada yang pertama-tama: 86 untuk 12
       orang menjadi 8,8,7,7,7,7,7,7,7,7,7,7. */
    function bagiRata(daftar, banyakOrang, urutan) {
      var dasar = Math.floor(daftar.length / banyakOrang);
      var lebih = daftar.length % banyakOrang;
      var mulai = urutan * dasar + Math.min(urutan, lebih);
      var jml = dasar + (urutan < lebih ? 1 : 0);
      return daftar.slice(mulai, mulai + jml);
    }
    if (p.kode === 'cabang') {
      punya = bagiRata(kodeCabang, p.jumlah, i);
    } else if (p.kode === 'supervisor' || p.kode === 'leader') {
      /* Supervisor dan leader boleh bertumpang tindih dengan kepala cabang —
         mereka memang membawahi wilayah yang sama dari sisi berbeda. */
      punya = bagiRata(kodeCabang, p.jumlah, i);
    }
    staf.push({
      nama: nama,
      email: email(nama, 'buanamotorindo.co.id'),
      jabatan: p.jabatan,
      peran: p.kode,
      lokasiKode: punya
    });
  }
});

/* =============================================================== KELUAR */

const hasil = {
  korporat: {
    nama: 'PT Buana Indah Motorindo',
    bidang: 'Dealer & bengkel resmi mobil',
    alamat: 'Jl. Gatot Subroto Kav. 42',
    kota: 'Jakarta Selatan',
    wilayah: wilayahKota('Jakarta Selatan', 'Jl. Gatot Subroto Kav. 42'),
    telp: '021-5250880',
    npwp: '01.884.720.3-014.000',
    /* Dealer group yang membersihkan dealernya SENDIRI dengan petugasnya
       sendiri — tidak ada klien untuk dikontrak atau ditagih. */
    jenis: 'internal'
  },
  lokasi: lokasi,
  petugas: petugas,
  aset: aset,
  staf: staf,
  bahan: BAHAN
};

const KELUAR = __dirname;
fs.writeFileSync(path.join(KELUAR, 'buana-motorindo.json'),
  JSON.stringify(hasil, null, 1));

const totalArea = lokasi.reduce(function (n, l) { return n + l.area.length; }, 0);
const totalLuas = lokasi.reduce(function (n, l) {
  return n + l.area.reduce(function (m, a) { return m + a.luas; }, 0);
}, 0);

console.log('buana-motorindo.json');
console.log('  lokasi   : ' + lokasi.length + '  (1 pusat + ' +
  (lokasi.length - 1) + ' cabang)');
console.log('  area     : ' + totalArea + '  (' + totalLuas.toLocaleString('id') + ' m²)');
console.log('  petugas  : ' + petugas.length);
console.log('  alat     : ' + aset.length);
console.log('  staf     : ' + staf.length);
console.log('  bahan    : ' + BAHAN.length);
