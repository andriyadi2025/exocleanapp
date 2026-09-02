/* ==========================================================================
   seed.js — katalog layanan EXOCLEAN + data contoh
   --------------------------------------------------------------------------
   Harga mengikuti dokumen "Harga Layanan EXOCLEAN". Tanggal dibuat relatif
   terhadap hari ini supaya demo selalu terlihat hidup (ada order kemarin,
   hari ini, dan minggu depan).
   ========================================================================== */
var SEED = (function () {

  /* ---------- katalog layanan ----------
     DIKOSONGKAN 21 Agustus 2026 — katalog disusun ulang dari nol.
     Daftar lama ada di "seed-lama-20260821.js.bak" di akar proyek.

     Layanan di sini adalah yang BISA DIPESAN LANGSUNG tanpa survei, jadi
     hargaMin dan checklist wajib diisi — tanpa harga, tombol pesan tidak
     muncul sama sekali (lihat PESAN.bisaLangsung di pesan.js).

       { kode: "GC-GD", kategori: "Gedung & Komersial",
         nama: "General Cleaning Gedung", hargaMin: 45000, hargaMax: null,
         satuan: "m²", icon: "🏢", survei: false,
         checklist: ["Sapu & pel seluruh area lantai", "Bersihkan toilet"] }
  */
  var SERVICES = [
    /* ---------------------------------------------------------------- */
    /* JASA KEAHLIAN — yang dibeli klien adalah ORANGNYA, bukan hasil     */
    /* pekerjaan yang bisa diukur per meter. Alurnya ada di keahlian.js.  */
    /* ---------------------------------------------------------------- */
    {
      kode: 'JM', kategori: 'Keahlian', nama: 'Juru Masak',
      jenis: 'keahlian', fungsi: 'FK-MASAK', icon: '👨‍🍳',
      satuan: 'porsi', survei: false, hargaMin: 25000, hargaMax: null,
      ket: 'Juru masak bersertifikat untuk kebutuhan rumah, kantor, dan acara — indoor maupun outdoor. Tarif dihitung dari jenis masakan dan jumlah porsi.',
      keahlian: {
        fungsi: 'FK-MASAK',
        /* Mitra datang dengan tangan kosong. Ini bukan keterangan kecil:
           klien yang tidak menyiapkan wajan akan punya juru masak yang
           berdiri tanpa bisa bekerja, dan keduanya sama-sama rugi. */
        bawaAlat: false,
        catatanBawaan: 'Juru masak TIDAK membawa apa pun. Bahan makanan, alat masak, kompor, dan perlengkapan penyajian disediakan oleh klien.',
        responDetik: null,        /* null = ikut pengaturan global */
        /* Dua tingkat: NEGARA ASAL lalu NAMA MASAKAN. Klien memilih negara
           dulu, baru mencentang masakannya — daftar 50 nama tanpa
           pengelompokan adalah daftar yang tidak dibaca siapa pun.

           Bendera negara sengaja TIDAK dipakai: pada Windows 10 rangkaian
           regional-indicator tampil sebagai dua huruf, bukan bendera. */
        /* Tiga sumbu, bukan satu daftar: NEGARA ASAL, URUTAN HIDANGAN
           (pembuka / utama / penutup), lalu nama masakannya. Klien menyusun
           acara, dan acara punya urutan — sup dan puding yang tertumpuk
           dalam satu daftar memaksa orang memisahkannya sendiri di kepala.

           `ikon` sengaja ikon NEGARA, bukan ikon hidangan: ia dipakai pada
           chip pemilih negara. Ikon tiap hidangan datang dari
           KEAHLIAN.HIDANGAN.

           Bendera negara TIDAK dipakai — pada Windows 10 rangkaian
           regional-indicator tampil sebagai dua huruf, bukan bendera. */
        /* Tiap masakan punya NO ID MAKANAN sendiri (MKN-xxxxx) yang dibuat
           sistem dan tidak pernah berubah. Nama boleh diperbaiki ejaannya,
           negaranya boleh dipindah, tarifnya boleh naik — nomornya tetap,
           karena itulah yang ditunjuk keranjang, pesanan, dan invoice.

           `bahan` menentukan halal dan belanja apa yang harus disiapkan
           klien. `alergen` bukan pelengkap: alergi kacang dan seafood bisa
           berakibat fatal, dan klien berhak melihatnya SEBELUM memesan.

           `ikon` adalah ikon NEGARA (dipakai chip pemilih), bukan ikon
           hidangan — bendera tidak dipakai karena pada Windows 10 ia tampil
           sebagai dua huruf. */
        menu: [
          /* ------------------------------------ Indonesia ---- */
          { id: 'MKN-00001', negara: 'Indonesia', hidangan: 'pembuka',
            nama: 'Lumpia Semarang', bahan: 'ayam',
            tarif: 28000, minPorsi: 10, halal: true, pedas: 'tidak',
            alergen: ['telur', 'gluten'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00002', negara: 'Indonesia', hidangan: 'pembuka',
            nama: 'Sup Buntut', bahan: 'sapi',
            tarif: 55000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: [], menitMasak: 120, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00003', negara: 'Indonesia', hidangan: 'pembuka',
            nama: 'Tahu Isi Sayur', bahan: 'tahutempe',
            tarif: 20000, minPorsi: 10, halal: true, pedas: 'sedang',
            alergen: ['kedelai', 'gluten'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00004', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Rendang Daging', bahan: 'sapi',
            tarif: 55000, minPorsi: 5, halal: true, pedas: 'pedas',
            alergen: ['kacang'], menitMasak: 180, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00005', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Nasi Goreng Spesial', bahan: 'nasi',
            tarif: 35000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: ['telur', 'kedelai'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00006', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Soto Ayam', bahan: 'ayam',
            tarif: 35000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['telur'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00007', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Sate Ayam Bumbu Kacang', bahan: 'ayam',
            tarif: 40000, minPorsi: 10, halal: true, pedas: 'sedang',
            alergen: ['kacang', 'kedelai'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00008', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Ayam Bakar Bumbu Bali', bahan: 'ayam',
            tarif: 45000, minPorsi: 5, halal: true, pedas: 'pedas',
            alergen: ['kedelai'], menitMasak: 70, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00009', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Gado-gado', bahan: 'sayur',
            tarif: 30000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: ['kacang', 'telur', 'kedelai'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00010', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Rawon Daging', bahan: 'sapi',
            tarif: 50000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: [], menitMasak: 150, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00011', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Gudeg Komplit', bahan: 'ayam',
            tarif: 45000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['telur', 'kedelai'], menitMasak: 180, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00012', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Pempek Palembang', bahan: 'ikan',
            tarif: 35000, minPorsi: 10, halal: true, pedas: 'sedang',
            alergen: ['seafood', 'telur', 'gluten'], menitMasak: 90, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00013', negara: 'Indonesia', hidangan: 'utama',
            nama: 'Opor Ayam', bahan: 'ayam',
            tarif: 42000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kacang'], menitMasak: 75, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00014', negara: 'Indonesia', hidangan: 'penutup',
            nama: 'Es Campur', bahan: 'buah',
            tarif: 25000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 25, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00015', negara: 'Indonesia', hidangan: 'penutup',
            nama: 'Klepon', bahan: 'tepung',
            tarif: 18000, minPorsi: 10, halal: true, pedas: 'tidak',
            alergen: [], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍛' },
          { id: 'MKN-00016', negara: 'Indonesia', hidangan: 'penutup',
            nama: 'Pisang Goreng Keju', bahan: 'buah',
            tarif: 22000, minPorsi: 10, halal: true, pedas: 'tidak',
            alergen: ['susu', 'telur', 'gluten'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍛' },
          /* ------------------------------------ Jepang ---- */
          { id: 'MKN-00017', negara: 'Jepang', hidangan: 'pembuka',
            nama: 'Edamame', bahan: 'kacang',
            tarif: 25000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kedelai'], menitMasak: 15, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00018', negara: 'Jepang', hidangan: 'pembuka',
            nama: 'Gyoza Ayam', bahan: 'ayam',
            tarif: 40000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'kedelai'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00019', negara: 'Jepang', hidangan: 'pembuka',
            nama: 'Miso Soup', bahan: 'tahutempe',
            tarif: 20000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kedelai'], menitMasak: 20, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00020', negara: 'Jepang', hidangan: 'utama',
            nama: 'Sushi Roll Platter', bahan: 'ikan',
            tarif: 90000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'wijen'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00021', negara: 'Jepang', hidangan: 'utama',
            nama: 'Chicken Katsu Curry', bahan: 'ayam',
            tarif: 65000, minPorsi: 4, halal: true, pedas: 'sedang',
            alergen: ['telur', 'gluten'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00022', negara: 'Jepang', hidangan: 'utama',
            nama: 'Ramen Shoyu', bahan: 'ayam',
            tarif: 70000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['telur', 'gluten', 'kedelai'], menitMasak: 90, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00023', negara: 'Jepang', hidangan: 'utama',
            nama: 'Yakitori', bahan: 'ayam',
            tarif: 60000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['kedelai', 'wijen'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00024', negara: 'Jepang', hidangan: 'utama',
            nama: 'Gyudon', bahan: 'sapi',
            tarif: 68000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['kedelai'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00025', negara: 'Jepang', hidangan: 'utama',
            nama: 'Chawanmushi', bahan: 'telur',
            tarif: 45000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['telur', 'seafood'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00026', negara: 'Jepang', hidangan: 'penutup',
            nama: 'Mochi Ice Cream', bahan: 'tepung',
            tarif: 35000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍣' },
          { id: 'MKN-00027', negara: 'Jepang', hidangan: 'penutup',
            nama: 'Dorayaki', bahan: 'tepung',
            tarif: 28000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['telur', 'gluten', 'susu'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍣' },
          /* ------------------------------------ Korea ---- */
          { id: 'MKN-00028', negara: 'Korea', hidangan: 'pembuka',
            nama: 'Kimchi Pancake', bahan: 'sayur',
            tarif: 35000, minPorsi: 5, halal: true, pedas: 'pedas',
            alergen: ['gluten', 'telur'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00029', negara: 'Korea', hidangan: 'pembuka',
            nama: 'Mandu Goreng', bahan: 'ayam',
            tarif: 38000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'kedelai'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00030', negara: 'Korea', hidangan: 'utama',
            nama: 'Bulgogi Daging Sapi', bahan: 'sapi',
            tarif: 85000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['kedelai', 'wijen'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00031', negara: 'Korea', hidangan: 'utama',
            nama: 'Ayam Goreng Yangnyeom', bahan: 'ayam',
            tarif: 65000, minPorsi: 4, halal: true, pedas: 'pedas',
            alergen: ['gluten', 'kedelai', 'wijen'], menitMasak: 55, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00032', negara: 'Korea', hidangan: 'utama',
            nama: 'Tteokbokki', bahan: 'tepung',
            tarif: 45000, minPorsi: 5, halal: true, pedas: 'sangat',
            alergen: ['gluten', 'kedelai'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00033', negara: 'Korea', hidangan: 'utama',
            nama: 'Japchae', bahan: 'sayur',
            tarif: 55000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kedelai', 'wijen', 'telur'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00034', negara: 'Korea', hidangan: 'utama',
            nama: 'Kimchi Jjigae', bahan: 'tahutempe',
            tarif: 60000, minPorsi: 4, halal: true, pedas: 'pedas',
            alergen: ['kedelai', 'seafood'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00035', negara: 'Korea', hidangan: 'penutup',
            nama: 'Bingsu Kacang Merah', bahan: 'kacang',
            tarif: 45000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 25, deskripsi: '', foto: null, ikon: '🍜' },
          { id: 'MKN-00036', negara: 'Korea', hidangan: 'penutup',
            nama: 'Hotteok', bahan: 'tepung',
            tarif: 25000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'kacang'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🍜' },
          /* ------------------------------------ China ---- */
          { id: 'MKN-00037', negara: 'China', hidangan: 'pembuka',
            nama: 'Lumpia Udang', bahan: 'udang',
            tarif: 38000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'gluten', 'telur'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00038', negara: 'China', hidangan: 'pembuka',
            nama: 'Sup Jagung Kepiting', bahan: 'kerang',
            tarif: 42000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'telur'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00039', negara: 'China', hidangan: 'utama',
            nama: 'Nasi Hainan Ayam', bahan: 'ayam',
            tarif: 55000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kedelai'], menitMasak: 70, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00040', negara: 'China', hidangan: 'utama',
            nama: 'Sapo Tahu Seafood', bahan: 'kerang',
            tarif: 65000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'kedelai', 'telur'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00041', negara: 'China', hidangan: 'utama',
            nama: 'Dimsum Campur', bahan: 'udang',
            tarif: 50000, minPorsi: 10, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'gluten', 'telur'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00042', negara: 'China', hidangan: 'utama',
            nama: 'Kwetiau Goreng Sapi', bahan: 'sapi',
            tarif: 48000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: ['kedelai', 'telur'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00043', negara: 'China', hidangan: 'utama',
            nama: 'Ayam Kung Pao', bahan: 'ayam',
            tarif: 55000, minPorsi: 5, halal: true, pedas: 'pedas',
            alergen: ['kacang', 'kedelai'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00044', negara: 'China', hidangan: 'penutup',
            nama: 'Puding Mangga', bahan: 'buah',
            tarif: 28000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🥢' },
          { id: 'MKN-00045', negara: 'China', hidangan: 'penutup',
            nama: 'Tang Yuan Wijen', bahan: 'tepung',
            tarif: 30000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['wijen', 'kacang'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥢' },
          /* ------------------------------------ Italia ---- */
          { id: 'MKN-00046', negara: 'Italia', hidangan: 'pembuka',
            nama: 'Bruschetta', bahan: 'tepung',
            tarif: 32000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['gluten'], menitMasak: 25, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00047', negara: 'Italia', hidangan: 'pembuka',
            nama: 'Caprese Salad', bahan: 'susu',
            tarif: 45000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 15, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00048', negara: 'Italia', hidangan: 'pembuka',
            nama: 'Minestrone', bahan: 'sayur',
            tarif: 40000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['gluten'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00049', negara: 'Italia', hidangan: 'utama',
            nama: 'Spaghetti Aglio e Olio', bahan: 'mi',
            tarif: 55000, minPorsi: 4, halal: true, pedas: 'sedang',
            alergen: ['gluten'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00050', negara: 'Italia', hidangan: 'utama',
            nama: 'Fettuccine Carbonara', bahan: 'mi',
            tarif: 70000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'telur', 'susu'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00051', negara: 'Italia', hidangan: 'utama',
            nama: 'Lasagna Bolognese', bahan: 'sapi',
            tarif: 85000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'susu', 'telur'], menitMasak: 90, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00052', negara: 'Italia', hidangan: 'utama',
            nama: 'Pizza Margherita', bahan: 'tepung',
            tarif: 75000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'susu'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00053', negara: 'Italia', hidangan: 'utama',
            nama: 'Risotto Jamur', bahan: 'nasi',
            tarif: 80000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00054', negara: 'Italia', hidangan: 'penutup',
            nama: 'Tiramisu', bahan: 'susu',
            tarif: 48000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu', 'telur', 'gluten'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍝' },
          { id: 'MKN-00055', negara: 'Italia', hidangan: 'penutup',
            nama: 'Panna Cotta', bahan: 'susu',
            tarif: 42000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍝' },
          /* ------------------------------------ Timur Tengah ---- */
          { id: 'MKN-00056', negara: 'Timur Tengah', hidangan: 'pembuka',
            nama: 'Hummus & Roti Pita', bahan: 'kacang',
            tarif: 40000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['wijen', 'gluten'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00057', negara: 'Timur Tengah', hidangan: 'pembuka',
            nama: 'Falafel', bahan: 'kacang',
            tarif: 35000, minPorsi: 6, halal: true, pedas: 'sedang',
            alergen: ['wijen', 'gluten'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00058', negara: 'Timur Tengah', hidangan: 'pembuka',
            nama: 'Fattoush Salad', bahan: 'sayur',
            tarif: 38000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['gluten'], menitMasak: 20, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00059', negara: 'Timur Tengah', hidangan: 'utama',
            nama: 'Nasi Kebuli Kambing', bahan: 'kambing',
            tarif: 85000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: ['kacang'], menitMasak: 150, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00060', negara: 'Timur Tengah', hidangan: 'utama',
            nama: 'Shawarma Ayam', bahan: 'ayam',
            tarif: 60000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: ['gluten', 'wijen'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00061', negara: 'Timur Tengah', hidangan: 'utama',
            nama: 'Mandi Rice Ayam', bahan: 'ayam',
            tarif: 78000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['kacang'], menitMasak: 120, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00062', negara: 'Timur Tengah', hidangan: 'penutup',
            nama: 'Baklava', bahan: 'kacang',
            tarif: 40000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['kacang', 'gluten', 'susu'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🥙' },
          { id: 'MKN-00063', negara: 'Timur Tengah', hidangan: 'penutup',
            nama: 'Muhallabia', bahan: 'susu',
            tarif: 32000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['susu', 'kacang'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥙' },
          /* ------------------------------------ Amerika & Eropa ---- */
          { id: 'MKN-00064', negara: 'Amerika & Eropa', hidangan: 'pembuka',
            nama: 'Caesar Salad', bahan: 'sayur',
            tarif: 45000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['telur', 'susu', 'gluten', 'seafood'], menitMasak: 20, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00065', negara: 'Amerika & Eropa', hidangan: 'pembuka',
            nama: 'Creamy Mushroom Soup', bahan: 'sayur',
            tarif: 38000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu', 'gluten'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00066', negara: 'Amerika & Eropa', hidangan: 'pembuka',
            nama: 'Garlic Bread', bahan: 'tepung',
            tarif: 25000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'susu'], menitMasak: 20, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00067', negara: 'Amerika & Eropa', hidangan: 'utama',
            nama: 'Steak Sirloin', bahan: 'sapi',
            tarif: 145000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00068', negara: 'Amerika & Eropa', hidangan: 'utama',
            nama: 'BBQ Ribs', bahan: 'sapi',
            tarif: 130000, minPorsi: 4, halal: true, pedas: 'sedang',
            alergen: ['kedelai'], menitMasak: 180, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00069', negara: 'Amerika & Eropa', hidangan: 'utama',
            nama: 'Grilled Chicken Steak', bahan: 'ayam',
            tarif: 85000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00070', negara: 'Amerika & Eropa', hidangan: 'utama',
            nama: 'Fish & Chips', bahan: 'ikan',
            tarif: 75000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['seafood', 'gluten', 'telur'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00071', negara: 'Amerika & Eropa', hidangan: 'utama',
            nama: 'Burger Homemade', bahan: 'sapi',
            tarif: 65000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'telur', 'susu'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00072', negara: 'Amerika & Eropa', hidangan: 'penutup',
            nama: 'New York Cheesecake', bahan: 'susu',
            tarif: 55000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu', 'telur', 'gluten'], menitMasak: 90, deskripsi: '', foto: null, ikon: '🥩' },
          { id: 'MKN-00073', negara: 'Amerika & Eropa', hidangan: 'penutup',
            nama: 'Brownies Sundae', bahan: 'cokelat',
            tarif: 40000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: ['susu', 'telur', 'gluten'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🥩' },
          /* ------------------------------------ Thailand ---- */
          { id: 'MKN-00074', negara: 'Thailand', hidangan: 'pembuka',
            nama: 'Som Tam — Salad Pepaya', bahan: 'sayur',
            tarif: 35000, minPorsi: 4, halal: true, pedas: 'pedas',
            alergen: ['kacang', 'seafood'], menitMasak: 20, deskripsi: '', foto: null, ikon: '🍤' },
          { id: 'MKN-00075', negara: 'Thailand', hidangan: 'pembuka',
            nama: 'Spring Roll Thai', bahan: 'sayur',
            tarif: 32000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['gluten', 'kedelai'], menitMasak: 35, deskripsi: '', foto: null, ikon: '🍤' },
          { id: 'MKN-00076', negara: 'Thailand', hidangan: 'utama',
            nama: 'Tom Yum Goong', bahan: 'udang',
            tarif: 75000, minPorsi: 4, halal: true, pedas: 'pedas',
            alergen: ['seafood'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍤' },
          { id: 'MKN-00077', negara: 'Thailand', hidangan: 'utama',
            nama: 'Pad Thai', bahan: 'mi',
            tarif: 60000, minPorsi: 4, halal: true, pedas: 'sedang',
            alergen: ['kacang', 'telur', 'seafood'], menitMasak: 30, deskripsi: '', foto: null, ikon: '🍤' },
          { id: 'MKN-00078', negara: 'Thailand', hidangan: 'utama',
            nama: 'Green Curry Ayam', bahan: 'ayam',
            tarif: 65000, minPorsi: 4, halal: true, pedas: 'pedas',
            alergen: ['seafood'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍤' },
          { id: 'MKN-00079', negara: 'Thailand', hidangan: 'penutup',
            nama: 'Mango Sticky Rice', bahan: 'buah',
            tarif: 45000, minPorsi: 4, halal: true, pedas: 'tidak',
            alergen: [], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍤' },
          /* ------------------------------------ India ---- */
          { id: 'MKN-00080', negara: 'India', hidangan: 'pembuka',
            nama: 'Samosa', bahan: 'sayur',
            tarif: 25000, minPorsi: 6, halal: true, pedas: 'sedang',
            alergen: ['gluten'], menitMasak: 40, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00081', negara: 'India', hidangan: 'pembuka',
            nama: 'Papadum & Chutney', bahan: 'kacang',
            tarif: 18000, minPorsi: 6, halal: true, pedas: 'sedang',
            alergen: [], menitMasak: 20, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00082', negara: 'India', hidangan: 'utama',
            nama: 'Butter Chicken', bahan: 'ayam',
            tarif: 75000, minPorsi: 4, halal: true, pedas: 'sedang',
            alergen: ['susu', 'kacang'], menitMasak: 60, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00083', negara: 'India', hidangan: 'utama',
            nama: 'Biryani Kambing', bahan: 'kambing',
            tarif: 90000, minPorsi: 5, halal: true, pedas: 'pedas',
            alergen: ['susu'], menitMasak: 120, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00084', negara: 'India', hidangan: 'utama',
            nama: 'Dal Tadka', bahan: 'kacang',
            tarif: 45000, minPorsi: 5, halal: true, pedas: 'sedang',
            alergen: [], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00085', negara: 'India', hidangan: 'penutup',
            nama: 'Gulab Jamun', bahan: 'susu',
            tarif: 30000, minPorsi: 6, halal: true, pedas: 'tidak',
            alergen: ['susu', 'gluten'], menitMasak: 45, deskripsi: '', foto: null, ikon: '🍲' },
          { id: 'MKN-00086', negara: 'India', hidangan: 'penutup',
            nama: 'Kheer', bahan: 'susu',
            tarif: 32000, minPorsi: 5, halal: true, pedas: 'tidak',
            alergen: ['susu', 'kacang'], menitMasak: 50, deskripsi: '', foto: null, ikon: '🍲' }
        ]
      },
      checklist: [
        'Konfirmasi menu dan jumlah porsi dengan klien',
        'Periksa kelengkapan bahan makanan yang disediakan klien',
        'Periksa kelengkapan alat masak, kompor, dan sumber air',
        'Cuci tangan, pakai celemek dan penutup kepala',
        'Masak sesuai menu dan porsi yang dipesan',
        'Plating dan penyajian',
        'Bersihkan area masak dan peralatan yang dipakai',
        'Serah terima hasil masakan ke klien'
      ]
    }
  ];

  /* Paket berlangganan — dikosongkan bersama katalog layanan. */
  var PAKET = [];

  /* ---------- katalog produk toko (alat & chemical kebersihan) ---------- */
  var PRODUK = [
    // --- Chemical Pembersih ---
    { kode: 'CHM-01', kategori: 'Chemical Pembersih', nama: 'Floor Cleaner Lemon 5L', merek: 'ExoPro',
      harga: 85000, satuan: 'jerigen', stok: 48, minStok: 12, icon: '🧴',
      deskripsi: 'Pembersih lantai serbaguna aroma lemon, aman untuk keramik, vinyl & granit.' },
    { kode: 'CHM-02', kategori: 'Chemical Pembersih', nama: 'Glass Cleaner Konsentrat 5L', merek: 'ExoPro',
      harga: 95000, satuan: 'jerigen', stok: 32, minStok: 10, icon: '🪟',
      deskripsi: 'Konsentrat pembersih kaca, 1 : 20. Bebas noda air dan tidak meninggalkan bekas.' },
    { kode: 'CHM-03', kategori: 'Chemical Pembersih', nama: 'Degreaser Dapur 5L', merek: 'ExoPro',
      harga: 135000, satuan: 'jerigen', stok: 24, minStok: 8, icon: '🍳',
      deskripsi: 'Pelarut lemak berat untuk exhaust, kompor & area dapur komersial.' },
    { kode: 'CHM-04', kategori: 'Chemical Pembersih', nama: 'Disinfektan Multi Surface 5L', merek: 'ExoPro',
      harga: 110000, satuan: 'jerigen', stok: 40, minStok: 12, icon: '🦠',
      deskripsi: 'Membunuh 99,9% bakteri & virus. Cocok untuk klinik, kantor, sekolah.' },
    { kode: 'CHM-05', kategori: 'Chemical Pembersih', nama: 'Karbol Wangi Pinus 5L', merek: 'ExoPro',
      harga: 62000, satuan: 'jerigen', stok: 55, minStok: 15, icon: '🌲',
      deskripsi: 'Karbol pewangi lantai & toilet dengan daya bersih tinggi.' },
    { kode: 'CHM-06', kategori: 'Chemical Pembersih', nama: 'Toilet Bowl Cleaner 1L', merek: 'ExoPro',
      harga: 38000, satuan: 'botol', stok: 70, minStok: 20, icon: '🚽',
      deskripsi: 'Penghilang kerak & noda kuning pada kloset. Formula asam terkontrol.' },
    { kode: 'CHM-07', kategori: 'Chemical Pembersih', nama: 'Marble Polish Powder 5kg', merek: 'ExoStone',
      harga: 275000, satuan: 'ember', stok: 4, minStok: 4, icon: '✨',
      deskripsi: 'Serbuk poles marmer & granit untuk hasil kilap kristal.' },
    { kode: 'CHM-08', kategori: 'Chemical Pembersih', nama: 'Carpet Shampoo Low Foam 5L', merek: 'ExoPro',
      harga: 165000, satuan: 'jerigen', stok: 18, minStok: 6, icon: '🧶',
      deskripsi: 'Busa rendah, khusus mesin extractor. Cepat kering & tidak lengket.' },
    { kode: 'CHM-09', kategori: 'Chemical Pembersih', nama: 'Stain Remover Spot Lifter 1L', merek: 'ExoPro',
      harga: 72000, satuan: 'botol', stok: 26, minStok: 8, icon: '💧',
      deskripsi: 'Penghilang noda kopi, tinta & minyak pada karpet dan sofa.' },
    { kode: 'CHM-10', kategori: 'Chemical Pembersih', nama: 'Hand Soap Refill 5L', merek: 'ExoCare',
      harga: 78000, satuan: 'jerigen', stok: 44, minStok: 12, icon: '🧼',
      deskripsi: 'Sabun cuci tangan cair dengan pelembap, refill dispenser toilet kantor.' },

    // --- Alat Kebersihan ---
    { kode: 'ALT-01', kategori: 'Alat Kebersihan', nama: 'Mop Set Microfiber + Ember Pemeras', merek: 'ExoTools',
      harga: 185000, satuan: 'set', stok: 30, minStok: 8, icon: '🧹',
      deskripsi: 'Set pel microfiber lengkap dengan ember pemeras putar 12L.' },
    { kode: 'ALT-02', kategori: 'Alat Kebersihan', nama: 'Kain Microfiber 40×40 (isi 12)', merek: 'ExoTools',
      harga: 95000, satuan: 'pak', stok: 60, minStok: 15, icon: '🧽',
      deskripsi: 'Kain lap daya serap tinggi, bebas serat, bisa dicuci berulang.' },
    { kode: 'ALT-03', kategori: 'Alat Kebersihan', nama: 'Squeegee Kaca 35 cm + Gagang Teleskopik', merek: 'ExoTools',
      harga: 245000, satuan: 'set', stok: 20, minStok: 6, icon: '🪟',
      deskripsi: 'Karet squeegee premium dengan gagang teleskopik hingga 3 meter.' },
    { kode: 'ALT-04', kategori: 'Alat Kebersihan', nama: 'Sapu Lidi Gagang Panjang', merek: 'ExoTools',
      harga: 35000, satuan: 'unit', stok: 80, minStok: 20, icon: '🎋',
      deskripsi: 'Sapu halaman gagang kayu 120 cm.' },
    { kode: 'ALT-05', kategori: 'Alat Kebersihan', nama: 'Sikat Lantai Tangkai Panjang', merek: 'ExoTools',
      harga: 58000, satuan: 'unit', stok: 45, minStok: 12, icon: '🖌️',
      deskripsi: 'Bulu keras untuk lantai kasar, parkiran & area kamar mandi.' },
    { kode: 'ALT-06', kategori: 'Alat Kebersihan', nama: 'Trolley Cleaning Service 3 Rak', merek: 'ExoTools',
      harga: 1850000, satuan: 'unit', stok: 6, minStok: 2, icon: '🛒',
      deskripsi: 'Trolley housekeeping lengkap dengan kantong sampah & rak chemical.' },
    { kode: 'ALT-07', kategori: 'Alat Kebersihan', nama: 'Ember Pel Ganda 25L Beroda', merek: 'ExoTools',
      harga: 165000, satuan: 'unit', stok: 22, minStok: 6, icon: '🪣',
      deskripsi: 'Dua kompartemen (air bersih & kotor) dengan pemeras dan roda.' },
    { kode: 'ALT-08', kategori: 'Alat Kebersihan', nama: 'Dust Pan Set + Sapu', merek: 'ExoTools',
      harga: 48000, satuan: 'set', stok: 50, minStok: 15, icon: '🧺',
      deskripsi: 'Serokan sampah bergagang panjang, tidak perlu membungkuk.' },
    { kode: 'ALT-09', kategori: 'Alat Kebersihan', nama: 'Wet Floor Sign (Rambu Lantai Basah)', merek: 'ExoSafe',
      harga: 72000, satuan: 'unit', stok: 35, minStok: 10, icon: '⚠️',
      deskripsi: 'Rambu lipat kuning dua bahasa, wajib untuk area publik.' },
    { kode: 'ALT-10', kategori: 'Alat Kebersihan', nama: 'Tangga Lipat Aluminium 6 Step', merek: 'ExoSafe',
      harga: 685000, satuan: 'unit', stok: 3, minStok: 3, icon: '🪜',
      deskripsi: 'Tangga ringan anti selip, kapasitas 150 kg.' },

    // --- Mesin & Peralatan ---
    { kode: 'MSN-01', kategori: 'Mesin & Peralatan', nama: 'Vacuum Cleaner Wet & Dry 30L', merek: 'ExoMachine',
      harga: 3250000, satuan: 'unit', stok: 5, minStok: 2, icon: '🌀',
      deskripsi: 'Daya 1400W, dapat menyedot debu maupun cairan. Garansi 1 tahun.' },
    { kode: 'MSN-02', kategori: 'Mesin & Peralatan', nama: 'Floor Polisher 17 inch', merek: 'ExoMachine',
      harga: 8900000, satuan: 'unit', stok: 3, minStok: 1, icon: '⚙️',
      deskripsi: 'Mesin poles lantai profesional 154 rpm, lengkap pad holder & tank.' },
    { kode: 'MSN-03', kategori: 'Mesin & Peralatan', nama: 'High Pressure Cleaner 120 Bar', merek: 'ExoMachine',
      harga: 2750000, satuan: 'unit', stok: 4, minStok: 1, icon: '🚿',
      deskripsi: 'Untuk cuci fasad, parkiran, dan area outdoor. Selang 8 meter.' },
    { kode: 'MSN-04', kategori: 'Mesin & Peralatan', nama: 'Blower Karpet 3 Speed', merek: 'ExoMachine',
      harga: 1450000, satuan: 'unit', stok: 7, minStok: 2, icon: '💨',
      deskripsi: 'Pengering karpet dan lantai, dapat ditumpuk untuk penyimpanan.' },
    { kode: 'MSN-05', kategori: 'Mesin & Peralatan', nama: 'Carpet Extractor 20L', merek: 'ExoMachine',
      harga: 6500000, satuan: 'unit', stok: 1, minStok: 1, icon: '🧯',
      deskripsi: 'Mesin cuci karpet injeksi-ekstraksi untuk gedung & hotel.' },

    // --- APD & Keselamatan ---
    { kode: 'APD-01', kategori: 'APD & Keselamatan Kerja', nama: 'Sarung Tangan Karet (isi 12 pasang)', merek: 'ExoSafe',
      harga: 85000, satuan: 'pak', stok: 40, minStok: 12, icon: '🧤',
      deskripsi: 'Tahan chemical, panjang 30 cm, tekstur anti slip.' },
    { kode: 'APD-02', kategori: 'APD & Keselamatan Kerja', nama: 'Masker N95 (box isi 20)', merek: 'ExoSafe',
      harga: 95000, satuan: 'box', stok: 50, minStok: 15, icon: '😷',
      deskripsi: 'Filtrasi 95%, wajib untuk pekerjaan berdebu dan chemical kuat.' },
    { kode: 'APD-03', kategori: 'APD & Keselamatan Kerja', nama: 'Safety Helmet + Chin Strap', merek: 'ExoSafe',
      harga: 135000, satuan: 'unit', stok: 25, minStok: 8, icon: '⛑️',
      deskripsi: 'Standar SNI, dilengkapi tali dagu untuk kerja ketinggian.' },
    { kode: 'APD-04', kategori: 'APD & Keselamatan Kerja', nama: 'Full Body Harness Rope Access', merek: 'ExoSafe',
      harga: 1250000, satuan: 'unit', stok: 6, minStok: 2, icon: '🦺',
      deskripsi: 'Harness 5 titik dengan sertifikat CE, untuk gondola & rope access.' },
    { kode: 'APD-05', kategori: 'APD & Keselamatan Kerja', nama: 'Safety Shoes Anti Slip', merek: 'ExoSafe',
      harga: 385000, satuan: 'pasang', stok: 18, minStok: 6, icon: '🥾',
      deskripsi: 'Sol karet anti selip, ujung baja. Tersedia ukuran 39–44.' },
    { kode: 'APD-06', kategori: 'APD & Keselamatan Kerja', nama: 'Kacamata Safety Bening', merek: 'ExoSafe',
      harga: 45000, satuan: 'unit', stok: 30, minStok: 10, icon: '🥽',
      deskripsi: 'Pelindung mata dari percikan chemical, anti embun.' },

    // --- Consumable ---
    { kode: 'CNS-01', kategori: 'Consumable', nama: 'Tisu Toilet Jumbo Roll (isi 6)', merek: 'ExoCare',
      harga: 98000, satuan: 'pak', stok: 40, minStok: 12, icon: '🧻',
      deskripsi: 'Jumbo roll 500 meter, cocok untuk dispenser toilet gedung.' },
    { kode: 'CNS-02', kategori: 'Consumable', nama: 'Trash Bag 90×120 (isi 100)', merek: 'ExoCare',
      harga: 135000, satuan: 'pak', stok: 28, minStok: 10, icon: '🗑️',
      deskripsi: 'Kantong sampah tebal anti bocor untuk tempat sampah besar.' },
    { kode: 'CNS-03', kategori: 'Consumable', nama: 'Pengharum Ruangan Gel 500g', merek: 'ExoCare',
      harga: 42000, satuan: 'unit', stok: 55, minStok: 15, icon: '🌸',
      deskripsi: 'Tahan hingga 45 hari, tersedia aroma lavender & ocean.' },
    { kode: 'CNS-04', kategori: 'Consumable', nama: 'Hand Towel Tissue (isi 20 pak)', merek: 'ExoCare',
      harga: 165000, satuan: 'karton', stok: 20, minStok: 6, icon: '🧾',
      deskripsi: 'Tisu pengering tangan interfold untuk dispenser wastafel.' }
  ];

  /* ---------- berat & dimensi kirim untuk data contoh ----------------------
     Ongkir kurir dihitung dari berat DAN ukuran, jadi data contoh pun harus
     punya keduanya — tanpa itu setiap produk memakai perkiraan bawaan dan
     tarif yang muncul di layar tidak pernah masuk akal.

     Angka di bawah diturunkan dari SATUAN kemasannya, lalu ditimpa per kode
     untuk barang yang jelas menyimpang (mesin, tisu yang ringan tapi besar).
     Ini tetap perkiraan wajar untuk demo; produk sungguhan harus ditimbang. */
  var KIRIM_PER_SATUAN = {
    jerigen: { g: 5400, d: { p: 20, l: 20, t: 30 } },
    botol:   { g: 1150, d: { p: 10, l: 10, t: 26 } },
    ember:   { g: 21000, d: { p: 32, l: 32, t: 38 } },
    pak:     { g: 900,  d: { p: 30, l: 22, t: 12 } },
    box:     { g: 700,  d: { p: 28, l: 20, t: 16 } },
    set:     { g: 3200, d: { p: 45, l: 30, t: 28 } },
    pasang:  { g: 1400, d: { p: 32, l: 20, t: 14 } },
    karton:  { g: 6500, d: { p: 45, l: 35, t: 35 } },
    unit:    { g: 2500, d: { p: 30, l: 22, t: 20 } }
  };

  var KIRIM_PER_KODE = {
    /* mesin — berat sebenarnya jauh melebihi volumetriknya */
    'MSN-01': { g: 12500, d: { p: 48, l: 42, t: 62 } },
    'MSN-02': { g: 46000, d: { p: 62, l: 55, t: 42 } },
    'MSN-03': { g: 32000, d: { p: 58, l: 48, t: 40 } },
    'MSN-04': { g: 9800,  d: { p: 42, l: 38, t: 55 } },
    'MSN-05': { g: 58000, d: { p: 90, l: 60, t: 105 } },
    /* alat bergagang panjang — ukurannya yang menentukan tarif */
    'ALT-04': { g: 700,  d: { p: 140, l: 12, t: 10 } },
    'ALT-05': { g: 900,  d: { p: 130, l: 25, t: 8 } },
    'ALT-06': { g: 1600, d: { p: 120, l: 30, t: 22 } },
    'ALT-09': { g: 4200, d: { p: 60, l: 45, t: 90 } },
    'ALT-10': { g: 5800, d: { p: 70, l: 48, t: 95 } },
    /* ringan tetapi memakan tempat */
    'APD-02': { g: 420,  d: { p: 30, l: 22, t: 18 } },
    'CNS-01': { g: 3800, d: { p: 46, l: 34, t: 40 } },
    'CNS-02': { g: 2200, d: { p: 34, l: 24, t: 20 } },
    'CNS-04': { g: 4600, d: { p: 48, l: 36, t: 38 } },
    'APD-04': { g: 380,  d: { p: 24, l: 18, t: 12 } },
    'APD-06': { g: 1900, d: { p: 40, l: 30, t: 22 } }
  };

  function dataKirim(p) {
    var k = KIRIM_PER_KODE[p.kode] || KIRIM_PER_SATUAN[p.satuan] || KIRIM_PER_SATUAN.unit;
    return { beratGram: k.g, dimensi: { p: k.d.p, l: k.d.l, t: k.d.t } };
  }

  /* ---------- helper tanggal relatif ---------- */
  function hari(n) { return U.iso(U.addDays(new Date(), n)); }
  function saat(n, hhmm) {
    var p = (hhmm || '08:00').split(':');
    var d = U.addDays(new Date(), n);
    d.setHours(+p[0], +p[1], 0, 0);
    return d.toISOString();
  }

  /** Foto placeholder ringan (SVG data-URL) supaya demo laporan tidak kosong. */
  function foto(label, warna) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480">' +
      '<rect width="480" height="480" fill="' + warna + '"/>' +
      '<circle cx="380" cy="90" r="120" fill="rgba(255,255,255,.10)"/>' +
      '<circle cx="80" cy="400" r="150" fill="rgba(0,0,0,.08)"/>' +
      '<text x="240" y="230" font-family="Segoe UI,Arial" font-size="34" font-weight="700" ' +
      'fill="rgba(255,255,255,.95)" text-anchor="middle">' + label + '</text>' +
      '<text x="240" y="272" font-family="Segoe UI,Arial" font-size="19" ' +
      'fill="rgba(255,255,255,.7)" text-anchor="middle">Foto contoh EXOCLEAN</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- data contoh ---------- */
  /* Bahasa data contoh mengikuti bawaan aplikasi, bukan dipatok Indonesia.
     EXOCLEAN dipakai lintas negara; akun contoh yang selalu berbahasa
     Indonesia membuat penguji di luar negeri mengira bahasa bawaannya
     memang begitu. */
  var BAHASA_BAWAAN = (window.I18N && I18N.BAWAAN) || 'en';

  function apply(s) {
    /* No ID Makanan berikutnya melanjutkan nomor terakhir di katalog,
       supaya masakan yang ditambahkan admin tidak memakai nomor kembar. */
    s.counters.menuMakanan = 86;

    /* ---- layanan ---- */
    SERVICES.forEach(function (v, i) {
      s.services.push(Object.assign({
        id: 'svc_' + v.kode, aktif: true, urutan: i, tipe: 'layanan', createdAt: U.nowISO()
      }, v));
    });
    PAKET.forEach(function (v, i) {
      s.services.push(Object.assign({
        id: 'svc_' + v.kode, aktif: true, urutan: 100 + i, tipe: 'paket', kategori: 'Paket Berlangganan',
        hargaMin: null, hargaMax: null, satuan: 'bulan', survei: true, checklist: [], createdAt: U.nowISO()
      }, v));
    });
    /* Katalog "Layanan Jasa EXOCLEAN" — 22 kelompok layanan tanpa harga tetap;
       harganya keluar lewat penawaran setelah survei. */
    KATALOG.daftarLayanan().forEach(function (v, i) {
      s.services.push(Object.assign({
        id: 'svc_' + v.kode, aktif: true, urutan: 200 + i, tipe: 'layanan',
        checklist: [], createdAt: U.nowISO()
      }, v));
    });

    /* ---- produk toko ---- */
    PRODUK.forEach(function (p, i) {
      s.products.push(Object.assign({ id: 'prd_' + p.kode, aktif: true, urutan: i, createdAt: U.nowISO() },
        dataKirim(p), p));
    });

    /* ---- pengguna ---- */
    var users = [
      // admin
      { id: 'u_admin', role: 'admin', nama: 'Rina Kartika', jabatan: 'Admin & Operasional',
        email: 'admin@exoclean.id', pass: '123456', telp: '081234567001' },
      // supervisor
      { id: 'u_spv1', role: 'supervisor', nama: 'Budi Santoso', jabatan: 'Supervisor Lapangan',
        email: 'budi@exoclean.id', pass: '123456', telp: '081234567002' },
      { id: 'u_spv2', role: 'supervisor', nama: 'Dewi Anggraini', jabatan: 'Supervisor Lapangan',
        email: 'dewi@exoclean.id', pass: '123456', telp: '081234567003' },
      // tenaga kerja lapangan
      { id: 'u_w1', role: 'worker', nama: 'Agus Setiawan', jabatan: 'Leader Tim', email: 'agus@exoclean.id',
        pass: '123456', telp: '081234567011', sertifikat: ['K3 Umum', 'Rope Access L1'] },
      { id: 'u_w2', role: 'worker', nama: 'Joko Prasetyo', jabatan: 'Teknisi Kaca', email: 'joko@exoclean.id',
        pass: '123456', telp: '081234567012', sertifikat: ['Rope Access L1'] },
      { id: 'u_w3', role: 'worker', nama: 'Siti Rahayu', jabatan: 'Cleaner', email: 'siti@exoclean.id',
        pass: '123456', telp: '081234567013', sertifikat: [] },
      { id: 'u_w4', role: 'worker', nama: 'Rudi Hartono', jabatan: 'Operator Poles', email: 'rudi@exoclean.id',
        pass: '123456', telp: '081234567014', sertifikat: ['Operator Mesin Poles'] },
      { id: 'u_w5', role: 'worker', nama: 'Nurul Aini', jabatan: 'Cleaner', email: 'nurul@exoclean.id',
        pass: '123456', telp: '081234567015', sertifikat: [] },
      { id: 'u_w6', role: 'worker', nama: 'Eko Wibowo', jabatan: 'Teknisi Karpet & Sofa', email: 'eko@exoclean.id',
        pass: '123456', telp: '081234567016', sertifikat: [] },
      /* pendaftar paling baru — belum masuk tim mana pun */
      { id: 'u_w7', role: 'worker', nama: 'Fajar Nugroho', jabatan: 'Calon Mitra', email: 'fajar.n@gmail.com',
        pass: '123456', telp: '081234567017', sertifikat: [],
        alamat: 'Jl. Melati Raya No. 18, Ciputat, Tangerang Selatan' },
      // klien
      { id: 'u_c1', role: 'client', nama: 'Lestari Wijaya', perusahaan: 'PT Sinar Mandiri Abadi',
        email: 'lestari@sinarmandiri.co.id', pass: '123456', telp: '081298765001',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan', tipe: 'korporat' },
      { id: 'u_c2', role: 'client', nama: 'Hendra Gunawan', perusahaan: 'Ruko Grand Galaxy',
        email: 'hendra.g@gmail.com', pass: '123456', telp: '081298765002',
        alamat: 'Ruko Grand Galaxy Blok RSN No. 12, Bekasi Selatan', tipe: 'ruko' },
      { id: 'u_c3', role: 'client', nama: 'Maya Puspita', perusahaan: 'Klinik Sehat Bersama',
        email: 'admin@kliniksehatbersama.id', pass: '123456', telp: '081298765003',
        alamat: 'Jl. Raya Bogor No. 88, Depok', tipe: 'korporat' },
      { id: 'u_c4', role: 'client', nama: 'Andi Kurniawan', perusahaan: null,
        email: 'andi.k@gmail.com', pass: '123456', telp: '081298765004',
        alamat: 'Perum Citra Indah, Blok F5 No. 7, Cibubur', tipe: 'rumah' }
    ];
    /* Alamat & rekening tersimpan per pengguna. `alamat` (teks tunggal) tetap
       dipertahankan karena dipakai di seluruh aplikasi — isinya selalu
       disamakan dengan alamat utama. */
    var ALAMAT = {
      u_c1: [{ label: 'Kantor Pusat', penerima: 'Lestari Wijaya', telp: '081298765001',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21', kota: 'Jakarta Selatan',
        kodePos: '12930', patokan: 'Seberang halte TransJakarta Kuningan Barat', utama: true,
          koordinat: { lat: -6.235500, lng: 106.816700 } },
        { label: 'Gudang', penerima: 'Bpk. Sanusi (Logistik)', telp: '081298765011',
          alamat: 'Kawasan Pergudangan Sunter Blok C2 No. 9', kota: 'Jakarta Utara',
          kodePos: '14350', patokan: 'Pintu masuk sebelah pos security', utama: false,
            koordinat: { lat: -6.142800, lng: 106.879000 } }],
      u_c2: [{ label: 'Ruko', penerima: 'Hendra Gunawan', telp: '081298765002',
        alamat: 'Ruko Grand Galaxy Blok RSN No. 12', kota: 'Bekasi Selatan',
        kodePos: '17147', patokan: 'Sebelah Apotek Kimia Farma', utama: true,
          koordinat: { lat: -6.256000, lng: 107.000000 } }],
      u_c3: [{ label: 'Klinik', penerima: 'Maya Puspita', telp: '081298765003',
        alamat: 'Jl. Raya Bogor No. 88', kota: 'Depok', kodePos: '16431',
        patokan: 'Lantai 2 di atas Indomaret', utama: true,
          koordinat: { lat: -6.402500, lng: 106.822000 } }],
      u_c4: [{ label: 'Rumah', penerima: 'Andi Kurniawan', telp: '081298765004',
        alamat: 'Perum Citra Indah, Blok F5 No. 7', kota: 'Cibubur', kodePos: '16810',
        patokan: 'Pagar hitam, ada pohon mangga di depan', utama: true,
          koordinat: { lat: -6.398000, lng: 106.930000 } }]
    };
    var REKENING = {
      u_c1: [{ bank: 'BCA', nomor: '5271039884', atasNama: 'PT Sinar Mandiri Abadi', utama: true }],
      u_c2: [{ bank: 'Mandiri', nomor: '1290012345678', atasNama: 'Hendra Gunawan', utama: true }],
      u_c4: [{ bank: 'BNI', nomor: '0881234567', atasNama: 'Andi Kurniawan', utama: true }],
      u_w1: [{ bank: 'BCA', nomor: '7712004556', atasNama: 'Agus Setiawan', utama: true }],
      u_w2: [{ bank: 'BRI', nomor: '338901004422', atasNama: 'Joko Prasetyo', utama: true }],
      u_w3: [{ bank: 'BCA', nomor: '7712009981', atasNama: 'Siti Rahayu', utama: true }],
      u_w4: [{ bank: 'Mandiri', nomor: '1290098877665', atasNama: 'Rudi Hartono', utama: true }],
      u_w5: [{ bank: 'BNI', nomor: '0887654321', atasNama: 'Nurul Aini', utama: true }],
      u_w6: [{ bank: 'BCA', nomor: '7712006677', atasNama: 'Eko Wibowo', utama: true }],
      u_spv1: [{ bank: 'BCA', nomor: '7712001122', atasNama: 'Budi Santoso', utama: true }],
      u_spv2: [{ bank: 'Mandiri', nomor: '1290033445566', atasNama: 'Dewi Anggraini', utama: true }]
    };

    /* Berkas kepegawaian tenaga lapangan & supervisor. Sengaja tidak semuanya
       lengkap — supaya pengingat kelengkapan dan daftar kejar berkas di sisi
       admin ada isinya saat didemokan. */
    /* ---- data kepegawaian per orang ----
       Tanggalnya RELATIF terhadap hari ini, bukan tanggal mati. Dengan
       tanggal mati, kontrak yang hari ini 'segera habis' akan menjadi
       'sudah lewat' beberapa bulan lagi, dan keadaan yang ingin
       diperlihatkan justru tidak pernah muncul saat orang mencobanya.

       Sengaja beragam: tetap, kontrak panjang, kontrak segera habis,
       masa percobaan, harian lepas, dan mitra baru yang datanya masih
       banyak kosong — supaya seluruh tampilan bisa diperiksa sejak awal. */
    function hariRel(n) { return U.iso(U.addDays(new Date(), n)); }
    var KEPEGAWAIAN = {
      u_spv1: { nomorPegawai: 'EXO-2023-004', tglMasuk: hariRel(-1180), statusKerja: 'tetap',
        penempatan: 'Jakarta Selatan & Depok', atasanId: 'u_admin',
        bpjsTk: '19012345678', bpjsKes: '0001234567890', npwp: '091234567890000',
        catatan: 'Diangkat tetap setelah dua periode kontrak.' },
      u_spv2: { nomorPegawai: 'EXO-2024-011', tglMasuk: hariRel(-620), statusKerja: 'tetap',
        penempatan: 'Bekasi & Bogor', atasanId: 'u_admin',
        bpjsTk: '19023456789', bpjsKes: '0002345678901', npwp: '' },
      u_w1: { nomorPegawai: 'EXO-2024-018', tglMasuk: hariRel(-540), statusKerja: 'tetap',
        penempatan: 'Jakarta Selatan',
        bpjsTk: '19034567890', bpjsKes: '0003456789012', npwp: '' },
      u_w2: { nomorPegawai: 'EXO-2025-027', tglMasuk: hariRel(-300), statusKerja: 'kontrak',
        kontrakMulai: hariRel(-300), kontrakSelesai: hariRel(240),
        penempatan: 'Jakarta Pusat', bpjsTk: '19045678901', bpjsKes: '0004567890123' },
      /* kontrak segera habis — memicu peringatan di tab */
      u_w3: { nomorPegawai: 'EXO-2025-031', tglMasuk: hariRel(-350), statusKerja: 'kontrak',
        kontrakMulai: hariRel(-350), kontrakSelesai: hariRel(18),
        penempatan: 'Depok', bpjsTk: '19056789012', bpjsKes: '' },
      u_w4: { nomorPegawai: 'EXO-2026-042', tglMasuk: hariRel(-55), statusKerja: 'percobaan',
        penempatan: 'Bekasi', bpjsTk: '', bpjsKes: '' },
      u_w5: { nomorPegawai: 'EXO-2025-035', tglMasuk: hariRel(-210), statusKerja: 'harian',
        penempatan: 'Jakarta Timur' },
      u_w6: { nomorPegawai: 'EXO-2025-038', tglMasuk: hariRel(-180), statusKerja: 'harian',
        penempatan: 'Jakarta Barat' },
      u_w7: { statusKerja: 'mitra' }
    };

    var BERKAS = {
      u_w1: { idn: { jenis: 'ktp', nomor: '3273010207890003', namaSesuaiKartu: 'Agus Setiawan',
          tanggalLahir: '1989-07-02', berlakuHingga: '', diverifikasi: true,
          alamatKtp: 'Jl. Kebon Jeruk V No. 21, RT 003/RW 006, Kel. Kebon Jeruk, Kec. Kebon Jeruk, Jakarta Barat' },
        kd: [{ nama: 'Sri Wahyuni', hubungan: 'Istri', telp: '081355510001',
            alamat: 'Jl. Kebon Jeruk V No. 21, Jakarta Barat', utama: true },
          { nama: 'Slamet Riyadi', hubungan: 'Orang Tua', telp: '081355510002', alamat: 'Klaten, Jawa Tengah', utama: false }],
        at: { alamat: 'Jl. Kebon Jeruk V No. 21', rt: '003', rw: '006', kelurahan: 'Kebon Jeruk',
          kecamatan: 'Kebon Jeruk', kota: 'Jakarta Barat', provinsi: 'DKI Jakarta', kodePos: '11530',
          status: 'Milik sendiri', sejak: '2016-03-01', samaDenganKtp: true, patokan: 'Rumah pagar biru, dekat musala' } },

      u_w2: { idn: { jenis: 'ktp', nomor: '3276021511930007', namaSesuaiKartu: 'Joko Prasetyo',
          tanggalLahir: '1993-11-15', berlakuHingga: '', diverifikasi: true,
          alamatKtp: 'Perum Depok Mulya Blok C No. 4, RT 002/RW 011, Kel. Beji, Kec. Beji, Depok' },
        kd: [{ nama: 'Rina Marlina', hubungan: 'Istri', telp: '081355510003',
            alamat: 'Perum Depok Mulya Blok C No. 4, Depok', utama: true }],
        at: { alamat: 'Perum Depok Mulya Blok C No. 4', rt: '002', rw: '011', kelurahan: 'Beji',
          kecamatan: 'Beji', kota: 'Depok', provinsi: 'Jawa Barat', kodePos: '16421',
          status: 'Kontrak / sewa', sejak: '2021-08-15', samaDenganKtp: true, patokan: 'Sebelah warung Bu Tini' } },

      u_w3: { idn: { jenis: 'ktp', nomor: '3175042303950004', namaSesuaiKartu: 'Siti Rahayu',
          tanggalLahir: '1995-03-23', berlakuHingga: '', diverifikasi: true,
          alamatKtp: 'Jl. Cipinang Muara III No. 8, RT 010/RW 004, Kel. Cipinang Muara, Kec. Jatinegara, Jakarta Timur' },
        kd: [{ nama: 'Hartono', hubungan: 'Suami', telp: '081355510004',
            alamat: 'Jl. Cipinang Muara III No. 8, Jakarta Timur', utama: true }],
        at: { alamat: 'Jl. Cipinang Muara III No. 8', rt: '010', rw: '004', kelurahan: 'Cipinang Muara',
          kecamatan: 'Jatinegara', kota: 'Jakarta Timur', provinsi: 'DKI Jakarta', kodePos: '13420',
          status: 'Ikut keluarga', sejak: '2019-01-10', samaDenganKtp: true, patokan: '' } },

      /* SIM yang sebentar lagi habis — memicu peringatan masa berlaku */
      u_w4: { idn: { jenis: 'sim', nomor: '327604120887001', namaSesuaiKartu: 'Rudi Hartono',
          tanggalLahir: '1987-08-12', berlakuHingga: hari(38), diverifikasi: true,
          alamatKtp: 'Kp. Rawa Bugel No. 33, RT 005/RW 002, Kel. Kaliabang Tengah, Kec. Bekasi Utara, Bekasi' },
        kd: [{ nama: 'Endang Susilowati', hubungan: 'Istri', telp: '081355510005',
            alamat: 'Kp. Rawa Bugel No. 33, Bekasi', utama: true }],
        at: { alamat: 'Kp. Rawa Bugel No. 33', rt: '005', rw: '002', kelurahan: 'Kaliabang Tengah',
          kecamatan: 'Bekasi Utara', kota: 'Bekasi', provinsi: 'Jawa Barat', kodePos: '17125',
          status: 'Milik sendiri', sejak: '2014-06-01', samaDenganKtp: true, patokan: 'Depan lapangan voli' } },

      /* belum unggah foto kartu — berkas kurang lengkap */
      u_w5: { idn: { jenis: 'ktp', nomor: '3671060109970002', namaSesuaiKartu: 'Nurul Aini',
          tanggalLahir: '1997-09-01', berlakuHingga: '', diverifikasi: false, tanpaFoto: true,
          alamatKtp: 'Jl. Anggrek Raya No. 12, RT 001/RW 009, Kel. Pondok Benda, Kec. Pamulang, Tangerang Selatan' },
        kd: [{ nama: 'Aminah', hubungan: 'Orang Tua', telp: '081355510006',
            alamat: 'Jl. Anggrek Raya No. 12, Tangerang Selatan', utama: true }],
        at: { alamat: 'Jl. Anggrek Raya No. 12', rt: '001', rw: '009', kelurahan: 'Pondok Benda',
          kecamatan: 'Pamulang', kota: 'Tangerang Selatan', provinsi: 'Banten', kodePos: '15416',
          status: 'Kos', sejak: '2023-02-01', samaDenganKtp: false, patokan: 'Kos Bu Hajjah, kamar nomor 7' } },

      /* baru masuk — belum mengisi apa pun kecuali nomor KTP */
      u_w6: { idn: { jenis: 'ktp', nomor: '3174051806910005', namaSesuaiKartu: 'Eko Wibowo',
          tanggalLahir: '1991-06-18', berlakuHingga: '', diverifikasi: false, tanpaFoto: true,
          alamatKtp: '' },
        kd: [], at: null },

      u_spv1: { idn: { jenis: 'ktp', nomor: '3172031004850001', namaSesuaiKartu: 'Budi Santoso',
          tanggalLahir: '1985-04-10', berlakuHingga: '', diverifikasi: true,
          alamatKtp: 'Jl. Pluit Karang Barat No. 5, RT 007/RW 003, Kel. Pluit, Kec. Penjaringan, Jakarta Utara' },
        kd: [{ nama: 'Retno Palupi', hubungan: 'Istri', telp: '081355510007',
            alamat: 'Jl. Pluit Karang Barat No. 5, Jakarta Utara', utama: true }],
        at: { alamat: 'Jl. Pluit Karang Barat No. 5', rt: '007', rw: '003', kelurahan: 'Pluit',
          kecamatan: 'Penjaringan', kota: 'Jakarta Utara', provinsi: 'DKI Jakarta', kodePos: '14450',
          status: 'Milik sendiri', sejak: '2012-09-01', samaDenganKtp: true, patokan: '' } },

      u_spv2: { idn: { jenis: 'ktp', nomor: '3271052707880009', namaSesuaiKartu: 'Dewi Anggraini',
          tanggalLahir: '1988-07-27', berlakuHingga: '', diverifikasi: true,
          alamatKtp: 'Jl. Bangbarung Raya No. 44, RT 004/RW 005, Kel. Tegal Gundil, Kec. Bogor Utara, Bogor' },
        kd: [{ nama: 'Bambang Anggoro', hubungan: 'Suami', telp: '081355510008',
            alamat: 'Jl. Bangbarung Raya No. 44, Bogor', utama: true }],
        at: { alamat: 'Jl. Bangbarung Raya No. 44', rt: '004', rw: '005', kelurahan: 'Tegal Gundil',
          kecamatan: 'Bogor Utara', kota: 'Bogor', provinsi: 'Jawa Barat', kodePos: '16152',
          status: 'Milik sendiri', sejak: '2017-11-20', samaDenganKtp: true, patokan: '' } }
    };

    /** Gambar contoh kartu identitas — jelas ditandai contoh, bukan kartu asli. */
    function fotoKartu(nama, jenis) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="404">' +
        '<rect width="640" height="404" rx="18" fill="#E8EEF4"/>' +
        '<rect x="14" y="14" width="612" height="376" rx="12" fill="#F7FAFC" stroke="#B9C6D4"/>' +
        '<rect x="14" y="14" width="612" height="58" rx="12" fill="#14958A"/>' +
        '<text x="320" y="52" font-family="Segoe UI,Arial" font-size="22" font-weight="700" ' +
        'fill="#fff" text-anchor="middle">CONTOH ' + jenis + ' — BUKAN DOKUMEN ASLI</text>' +
        '<rect x="440" y="96" width="150" height="190" rx="8" fill="#CBD5E1"/>' +
        '<circle cx="515" cy="160" r="38" fill="#94A3B8"/>' +
        '<path d="M455 286c0-38 27-62 60-62s60 24 60 62z" fill="#94A3B8"/>' +
        '<text x="48" y="120" font-family="Segoe UI,Arial" font-size="15" fill="#64748B">NIK / NOMOR</text>' +
        '<rect x="48" y="132" width="330" height="16" rx="4" fill="#CBD5E1"/>' +
        '<text x="48" y="184" font-family="Segoe UI,Arial" font-size="15" fill="#64748B">NAMA</text>' +
        '<text x="48" y="208" font-family="Segoe UI,Arial" font-size="20" font-weight="700" fill="#0F172A">' +
        nama + '</text>' +
        '<text x="48" y="248" font-family="Segoe UI,Arial" font-size="15" fill="#64748B">ALAMAT</text>' +
        '<rect x="48" y="260" width="360" height="13" rx="4" fill="#D9E2EC"/>' +
        '<rect x="48" y="282" width="300" height="13" rx="4" fill="#D9E2EC"/>' +
        '<rect x="48" y="304" width="330" height="13" rx="4" fill="#D9E2EC"/>' +
        '<text x="320" y="368" font-family="Segoe UI,Arial" font-size="13" fill="#94A3B8" ' +
        'text-anchor="middle">Gambar contoh untuk demo aplikasi EXOCLEAN</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    /* Tarif pasar per mitra, dalam rupiah per jam. Yang tidak tercantum di
       sini belum ditetapkan Super Admin dan karena itu tidak tayang di
       EXOCLEAN App — lihat PASAR.tayang() di js/pasar.js. */
    var TARIF_PASAR = {
      u_w1: { tarif: 95000,  aktif: true  },   /* Agus — Leader Tim */
      u_w2: { tarif: 110000, aktif: true  },   /* Joko — Teknisi Kaca */
      u_w3: { tarif: 78000,  aktif: true  },   /* Siti — Cleaner */
      u_w4: { tarif: 100000, aktif: true  },   /* Rudi — Operator Poles */
      u_w5: { tarif: 78000,  aktif: true  },   /* Nurul — Cleaner */
      u_w6: { tarif: 105000, aktif: false }    /* Eko — tarif sudah ada, belum ditayangkan */
      /* u_w7 Fajar — calon mitra, tarifnya memang belum ditetapkan */
    };

    users.forEach(function (u, i) {
      var alamatList = (ALAMAT[u.id] || []).map(function (a) {
        return Object.assign({ id: U.uid('adr') }, a); });
      var rekening = (REKENING[u.id] || []).map(function (r) {
        return Object.assign({ id: U.uid('rek') }, r); });
      /* pengguna tanpa daftar alamat: teks alamat lamanya dijadikan alamat utama */
      if (!alamatList.length && u.alamat) {
        alamatList.push({ id: U.uid('adr'), label: 'Alamat Utama', penerima: u.nama, telp: u.telp,
          alamat: u.alamat, kota: '', kodePos: '', patokan: '', utama: true });
      }
      /* berkas kepegawaian (khusus petugas & supervisor) */
      var b = BERKAS[u.id], identitas = null, kontakDarurat = [], alamatTinggal = null;
      if (b) {
        identitas = Object.assign({ fotoDepan: null, fotoSelfie: null,
          diverifikasiOleh: null, diverifikasiAt: null }, b.idn);
        if (!b.idn.tanpaFoto) {
          var pd = U.uid('ph'), ps = U.uid('ph');
          s.photos[pd] = fotoKartu(b.idn.namaSesuaiKartu, b.idn.jenis.toUpperCase());
          s.photos[ps] = fotoKartu(b.idn.namaSesuaiKartu + ' (swafoto)', b.idn.jenis.toUpperCase());
          identitas.fotoDepan = pd; identitas.fotoSelfie = ps;
        }
        delete identitas.tanpaFoto;
        if (identitas.diverifikasi) {
          identitas.diverifikasiOleh = 'u_admin';
          identitas.diverifikasiAt = saat(-(120 - i * 7), '10:00');
        }
        kontakDarurat = (b.kd || []).map(function (k) { return Object.assign({ id: U.uid('kd') }, k); });
        alamatTinggal = b.at;
      }
      var kepeg = KEPEGAWAIAN[u.id] || null;

      /* Tarif pasar EXOCLEAN App — ditetapkan Super Admin, lihat js/pasar.js.
         Contohnya sengaja TIDAK seragam: Fajar (calon mitra, belum lulus)
         tidak punya tarif sama sekali, dan Eko punya tarif tetapi belum
         ditayangkan. Benih yang semuanya "sudah beres" menyembunyikan dua
         keadaan yang justru paling sering ditemui di layar Super Admin. */
      var pasar = null;
      if (u.role === 'worker') {
        var t = TARIF_PASAR[u.id];
        pasar = t
          ? { tarif: t.tarif, aktif: t.aktif, olehId: 'u_admin', olehNama: 'Rina Kartika',
              at: saat(-(30 - i), '11:00') }
          : { tarif: null, aktif: false, olehId: null, olehNama: null, at: null };
      }

      s.users.push(Object.assign({
        aktif: true, createdAt: saat(-(430 - i * 23), '09:00'), foto: null,
        alamatList: alamatList, rekening: rekening,
        identitas: identitas, kontakDarurat: kontakDarurat, alamatTinggal: alamatTinggal,
        kepegawaian: kepeg,
        preferensi: { bahasa: BAHASA_BAWAAN, notifWA: true, notifEmail: u.role === 'client', ringkasanMingguan: false }
      }, pasar ? { pasar: pasar } : null, u));
    });

    /* ---- tim ---- */
    s.teams.push({ id: 't_alpha', nama: 'Tim Alpha', supervisorId: 'u_spv1',
      memberIds: ['u_w1', 'u_w2', 'u_w3'], spesialisasi: 'Gedung & kaca ketinggian', createdAt: U.nowISO() });
    s.teams.push({ id: 't_bravo', nama: 'Tim Bravo', supervisorId: 'u_spv2',
      memberIds: ['u_w4', 'u_w5', 'u_w6'], spesialisasi: 'Rumah, poles lantai & upholstery', createdAt: U.nowISO() });

    /* ---- riwayat transaksi bulan-bulan sebelumnya ----------------------------
       Arsip pekerjaan & pembelian yang sudah tutup, dipakai grafik aktivitas
       klien, laporan bisnis, dan perhitungan segmen CRM. Dinomori lebih dulu
       supaya nomor dokumen tetap urut secara kronologis. */
    function tglBulan(n, tgl) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); d.setDate(tgl);
      return U.iso(d);
    }
    function saatBulan(n, tgl, hhmm) {
      var p = (hhmm || '09:00').split(':');
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); d.setDate(tgl);
      d.setHours(+p[0], +p[1], 0, 0);
      return d.toISOString();
    }

    var RIWAYAT_JASA = [
      [9, 12, 'u_c1', 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3', ['svc_GC-GD'], 36000000, 't_alpha', 'u_spv1'],
      [9, 21, 'u_c2', 'Cuci Kaca Ruko Grand Galaxy (3 Lantai)', ['svc_CK-RK'], 980000, 't_alpha', 'u_spv1'],
      [8,  9, 'u_c1', 'Cuci Kaca Fasad Rope Access — Lt. 4–9', ['svc_CK-RA'], 18500000, 't_alpha', 'u_spv1'],
      [8, 19, 'u_c3', 'Cuci Karpet Ruang Tunggu — Klinik Sehat Bersama', ['svc_CKP'], 1550000, 't_bravo', 'u_spv2'],
      [7, 11, 'u_c1', 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3', ['svc_GC-GD'], 36000000, 't_alpha', 'u_spv1'],
      [7, 24, 'u_c4', 'General Cleaning Rumah — Perum Citra Indah', ['svc_GC-RM'], 650000, 't_bravo', 'u_spv2'],
      [6, 10, 'u_c1', 'Poles Lantai Marmer Lobby — Sinar Mandiri', ['svc_PLM'], 5800000, 't_bravo', 'u_spv2'],
      [6, 22, 'u_c3', 'Cuci Sofa & Kursi — Klinik Sehat Bersama', ['svc_CSF'], 980000, 't_bravo', 'u_spv2'],
      [5, 13, 'u_c1', 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3', ['svc_GC-GD'], 36500000, 't_alpha', 'u_spv1'],
      [5, 26, 'u_c2', 'Cuci Kaca Ruko Grand Galaxy (3 Lantai)', ['svc_CK-RK'], 1010000, 't_alpha', 'u_spv1'],
      [4,  8, 'u_c1', 'Cuci Kaca Fasad Rope Access — Lt. 10–15', ['svc_CK-RA'], 21000000, 't_alpha', 'u_spv1'],
      [4, 20, 'u_c4', 'Deep Cleaning Rumah — Perum Citra Indah', ['svc_DC-RM'], 900000, 't_bravo', 'u_spv2'],
      [3, 12, 'u_c1', 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3', ['svc_GC-GD'], 36500000, 't_alpha', 'u_spv1'],
      [3, 23, 'u_c3', 'Cuci Karpet & Sofa — Klinik Sehat Bersama', ['svc_CKP', 'svc_CSF'], 2250000, 't_bravo', 'u_spv2'],
      [2,  9, 'u_c1', 'Poles Lantai Marmer Lobby — Sinar Mandiri', ['svc_PLM'], 6000000, 't_bravo', 'u_spv2'],
      [2, 18, 'u_c2', 'Cuci Kaca Ruko Grand Galaxy (3 Lantai)', ['svc_CK-RK'], 1010000, 't_alpha', 'u_spv1'],
      [1, 14, 'u_c1', 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3', ['svc_GC-GD'], 38250000, 't_alpha', 'u_spv1'],
      [1, 25, 'u_c3', 'Cuci Karpet Ruang Tunggu — Klinik Sehat Bersama', ['svc_CKP'], 1620000, 't_bravo', 'u_spv2']
    ];

    RIWAYAT_JASA.forEach(function (r, i) {
      var bulan = r[0], tgl = r[1], clientId = r[2], judul = r[3], svcIds = r[4],
          nilai = r[5], teamId = r[6], spvId = r[7];
      var tim = s.teams.filter(function (t) { return t.id === teamId; })[0];
      var id = 'ho' + (i + 1);
      var cl = mkChecklist(svcIds);
      cl.forEach(function (c) { c.done = true; c.byId = tim.memberIds[0]; c.at = saatBulan(bulan, tgl, '14:00'); });

      s.orders.push({
        id: id, no: U.docNo('ORD', ++s.counters.order, tglBulan(bulan, tgl)), clientId: clientId,
        quotationId: null, judul: judul,
        alamat: (users.filter(function (u) { return u.id === clientId; })[0] || {}).alamat || '',
        koordinat: null, serviceIds: svcIds, tgl: tglBulan(bulan, tgl), mulai: '08:00', selesai: '16:00',
        teamId: teamId, workerIds: tim.memberIds.slice(0, 2), supervisorId: spvId,
        status: 'diverifikasi', nilai: nilai, checklist: cl,
        mulaiAktual: saatBulan(bulan, tgl, '08:05'), selesaiAktual: saatBulan(bulan, tgl, '15:50'),
        createdAt: saatBulan(bulan, Math.max(1, tgl - 5), '10:00')
      });

      s.qc.push({ id: 'hqc' + (i + 1), orderId: id, supervisorId: spvId,
        skor: { kebersihan: 5, kerapihan: i % 3 === 0 ? 4 : 5, k3: 5, ketepatan: i % 4 === 0 ? 4 : 5 },
        hasil: 'lulus', catatan: 'Arsip — pekerjaan selesai sesuai lingkup.',
        at: saatBulan(bulan, tgl, '16:20'), createdAt: saatBulan(bulan, tgl, '16:20') });

      var ppn = 11, total = Math.round(nilai + nilai * ppn / 100);
      s.invoices.push({
        id: 'hinv' + (i + 1), no: U.docNo('INV', ++s.counters.invoice, tglBulan(bulan, tgl)),
        orderId: id, shopOrderId: null, clientId: clientId,
        subtotal: nilai, diskon: 0, ppn: ppn, total: total,
        jatuhTempo: tglBulan(bulan, Math.min(28, tgl + 14)), status: 'lunas',
        payments: [{ id: U.uid('pay'), at: saatBulan(bulan, Math.min(28, tgl + 9), '10:30'),
          jumlah: total, metode: 'Transfer BCA', ref: 'TRF/' + (700000 + i * 137), buktiPhotoId: null }],
        terbitAt: saatBulan(bulan, tgl, '17:00'), createdAt: saatBulan(bulan, tgl, '17:00')
      });
    });

    var RIWAYAT_TOKO = [
      [8, 14, 'u_c1', [['CHM-01', 8], ['CNS-01', 4]]],
      [6, 17, 'u_c1', [['CHM-10', 6], ['CNS-02', 3]]],
      [5,  9, 'u_c3', [['CHM-04', 6], ['APD-02', 3]]],
      [4, 15, 'u_c1', [['ALT-02', 4], ['CHM-02', 5]]],
      [3,  7, 'u_c2', [['ALT-03', 1], ['CHM-02', 2]]],
      [2, 21, 'u_c1', [['CHM-01', 10], ['CHM-05', 6], ['CNS-03', 8]]],
      [1, 11, 'u_c4', [['ALT-01', 1], ['CHM-05', 2]]]
    ];

    RIWAYAT_TOKO.forEach(function (r, i) {
      var bulan = r[0], tgl = r[1], clientId = r[2];
      var items = r[3].map(function (x) {
        var pr = s.products.filter(function (p) { return p.kode === x[0]; })[0];
        return { productId: pr.id, qty: x[1], harga: pr.harga };
      });
      var sub = items.reduce(function (a, it) { return a + it.qty * it.harga; }, 0);
      var ongkir = sub >= 2000000 ? 0 : 50000;
      var total = Math.round(sub + sub * 0.11 + ongkir);
      var id = 'hsh' + (i + 1);

      s.shopOrders.push({
        id: id, no: U.docNo('TKO', ++s.counters.shop, tglBulan(bulan, tgl)), clientId: clientId,
        status: 'selesai', historis: true, items: items,
        ongkir: ongkir, ppn: 11, diskon: 0, subtotal: sub, total: total,
        alamatKirim: (users.filter(function (u) { return u.id === clientId; })[0] || {}).alamat || '',
        metodeBayar: 'Transfer Bank', channelId: 'va_bca', catatan: '',
        kurir: 'Kurir Internal EXOCLEAN', resi: 'EXO-KRM-' + (10200 + i * 31),
        createdAt: saatBulan(bulan, tgl, '10:15'), dikonfirmasiAt: saatBulan(bulan, tgl, '11:00'),
        dikirimAt: saatBulan(bulan, tgl + 1, '09:00'), selesaiAt: saatBulan(bulan, tgl + 2, '14:00')
      });

      s.invoices.push({
        id: 'hinvt' + (i + 1), no: U.docNo('INV', ++s.counters.invoice, tglBulan(bulan, tgl)),
        orderId: null, shopOrderId: id, clientId: clientId,
        subtotal: sub, diskon: 0, ppn: 11, ongkir: ongkir, total: total,
        jatuhTempo: tglBulan(bulan, Math.min(28, tgl + 7)), status: 'lunas',
        payments: [{ id: U.uid('pay'), at: saatBulan(bulan, Math.min(28, tgl + 3), '13:20'),
          jumlah: total, metode: 'Transfer BCA', ref: 'TRF/' + (810000 + i * 53), buktiPhotoId: null }],
        terbitAt: saatBulan(bulan, tgl, '11:05'), createdAt: saatBulan(bulan, tgl, '11:05')
      });
    });

    /* ---- permintaan / booking ---- */
    s.counters.booking = 4;
    var bookings = [
      { id: 'bk1', no: U.docNo('REQ', 1), clientId: 'u_c3', status: 'baru',
        alamat: 'Jl. Raya Bogor No. 88, Depok',
        items: [{ serviceId: 'svc_DC-RM', qty: 1, catatan: 'Ruang tunggu + 3 ruang periksa' },
                { serviceId: 'svc_CSF', qty: 14, catatan: 'Kursi tunggu pasien' }],
        tglHarapan: hari(5), catatan: 'Pengerjaan harus di luar jam praktik (setelah 20.00).',
        createdAt: saat(-1, '09:14') },
      { id: 'bk2', no: U.docNo('REQ', 2), clientId: 'u_c4', status: 'baru',
        alamat: 'Perum Citra Indah, Blok F5 No. 7, Cibubur',
        items: [{ serviceId: 'svc_GC-RM', qty: 1, catatan: 'Rumah 2 lantai, ±120 m²' }],
        tglHarapan: hari(3), catatan: 'Mohon dihubungi via WhatsApp sore hari.',
        createdAt: saat(0, '07:42') },
      { id: 'bk3', no: U.docNo('REQ', 3), clientId: 'u_c1', status: 'dikutip',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan',
        items: [{ serviceId: 'svc_CK-RA', qty: 320, catatan: 'Fasad sisi timur & selatan, lantai 4–9' }],
        tglHarapan: hari(9), catatan: 'Butuh dokumen K3 & asuransi kerja.', createdAt: saat(-4, '10:05') },
      { id: 'bk4', no: U.docNo('REQ', 4), clientId: 'u_c2', status: 'dikutip',
        alamat: 'Ruko Grand Galaxy Blok RSN No. 12, Bekasi Selatan',
        items: [{ serviceId: 'svc_CK-RK', qty: 46, catatan: 'Kaca depan 3 lantai' }],
        tglHarapan: hari(2), catatan: '', createdAt: saat(-6, '14:30') }
    ];
    bookings.forEach(function (b) { s.bookings.push(b); });

    /* ---- penawaran ---- */
    s.counters.quotation = 3;
    s.quotations.push({
      id: 'q1', no: U.docNo('QUO', 1), bookingId: 'bk3', clientId: 'u_c1', status: 'terkirim',
      items: [
        { desc: 'Cuci Kaca Gedung (Tinggi / Rope Access) — fasad timur & selatan', qty: 320, satuan: 'm²', harga: 50000 },
        { desc: 'Mobilisasi alat & perlengkapan rope access', qty: 1, satuan: 'lot', harga: 2500000 }
      ],
      diskon: 1000000, ppn: 11, berlakuHingga: hari(10), catatan: 'Termasuk APD, asuransi kerja & dokumen K3.',
      dikirimAt: saat(-3, '16:20'), createdAt: saat(-3, '15:50')
    });
    s.quotations.push({
      id: 'q2', no: U.docNo('QUO', 2), bookingId: 'bk4', clientId: 'u_c2', status: 'disetujui',
      items: [{ desc: 'Cuci Kaca Ruko (3 lantai, dalam & luar)', qty: 46, satuan: 'm²', harga: 22000 }],
      diskon: 0, ppn: 0, berlakuHingga: hari(6), catatan: 'Harga sudah termasuk peralatan & bahan pembersih.',
      dikirimAt: saat(-5, '11:00'), disetujuiAt: saat(-4, '08:12'), createdAt: saat(-5, '10:40')
    });
    s.quotations.push({
      id: 'q3', no: U.docNo('QUO', 3), bookingId: null, clientId: 'u_c1', status: 'draft',
      items: [{ desc: 'General Cleaning Gedung — kontrak bulanan lantai 1–3', qty: 850, satuan: 'm²', harga: 45000 }],
      diskon: 3000000, ppn: 11, berlakuHingga: hari(14),
      catatan: 'Draft usulan kontrak bulanan, menunggu konfirmasi luas area final.', createdAt: saat(0, '08:05')
    });

    /* ---- order / penugasan ---- */
    /* nomor melanjutkan arsip di atas */
    function mkChecklist(serviceIds) {
      var out = [];
      serviceIds.forEach(function (sid) {
        var svc = null;
        s.services.forEach(function (x) { if (x.id === sid) svc = x; });
        (svc && svc.checklist || []).forEach(function (label) {
          out.push({ id: U.uid('ck'), label: label, grup: svc.nama, done: false, byId: null, at: null });
        });
      });
      return out;
    }

    var orders = [
      { id: 'o1', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c1', quotationId: null,
        judul: 'General Cleaning Gedung Sinar Mandiri — Lantai 1–3',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan',
        koordinat: { lat: -6.235500, lng: 106.816700 },
        serviceIds: ['svc_GC-GD'], tgl: hari(-7), mulai: '08:00', selesai: '15:00',
        teamId: 't_alpha', workerIds: ['u_w1', 'u_w3'], supervisorId: 'u_spv1',
        status: 'diverifikasi', nilai: 38250000, createdAt: saat(-12, '09:00') },

      { id: 'o2', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c4', quotationId: null,
        judul: 'Deep Cleaning Rumah — Perum Citra Indah',
        alamat: 'Perum Citra Indah, Blok F5 No. 7, Cibubur',
        koordinat: { lat: -6.398000, lng: 106.930000 },
        serviceIds: ['svc_DC-RM'], tgl: hari(-3), mulai: '09:00', selesai: '16:00',
        teamId: 't_bravo', workerIds: ['u_w5', 'u_w6'], supervisorId: 'u_spv2',
        status: 'diverifikasi', nilai: 950000, createdAt: saat(-9, '13:20') },

      { id: 'o3', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c3', quotationId: null,
        judul: 'Cuci Karpet & Sofa — Klinik Sehat Bersama',
        alamat: 'Jl. Raya Bogor No. 88, Depok',
        koordinat: { lat: -6.402500, lng: 106.822000 },
        serviceIds: ['svc_CKP', 'svc_CSF'], tgl: hari(-1), mulai: '19:00', selesai: '23:00',
        teamId: 't_bravo', workerIds: ['u_w6', 'u_w4'], supervisorId: 'u_spv2',
        status: 'selesai', nilai: 2380000, createdAt: saat(-6, '10:10') },

      { id: 'o4', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c2', quotationId: 'q2',
        judul: 'Cuci Kaca Ruko Grand Galaxy (3 Lantai)',
        alamat: 'Ruko Grand Galaxy Blok RSN No. 12, Bekasi Selatan',
        koordinat: { lat: -6.256000, lng: 107.000000 },
        serviceIds: ['svc_CK-RK'], tgl: hari(0), mulai: '08:00', selesai: '13:00',
        teamId: 't_alpha', workerIds: ['u_w2', 'u_w3'], supervisorId: 'u_spv1',
        status: 'berjalan', nilai: 1012000, createdAt: saat(-4, '09:30') },

      { id: 'o5', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c1', quotationId: null,
        judul: 'Poles Lantai Marmer Lobby — Sinar Mandiri',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan',
        koordinat: { lat: -6.235500, lng: 106.816700 },
        serviceIds: ['svc_PLM'], tgl: hari(0), mulai: '18:00', selesai: '23:00',
        teamId: 't_bravo', workerIds: ['u_w4'], supervisorId: 'u_spv2',
        status: 'dijadwalkan', nilai: 6000000, createdAt: saat(-3, '11:00') },

      { id: 'o6', no: U.docNo('ORD', ++s.counters.order), clientId: 'u_c1', quotationId: 'q1',
        judul: 'Cuci Kaca Fasad Rope Access — Sinar Mandiri Lt. 4–9',
        alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan',
        koordinat: { lat: -6.235500, lng: 106.816700 },
        serviceIds: ['svc_CK-RA'], tgl: hari(4), mulai: '07:00', selesai: '17:00',
        teamId: 't_alpha', workerIds: ['u_w1', 'u_w2'], supervisorId: 'u_spv1',
        status: 'dijadwalkan', nilai: 19425000, createdAt: saat(-1, '15:40') }
    ];

    orders.forEach(function (o) {
      o.checklist = mkChecklist(o.serviceIds);
      // order yang sudah lewat: semua checklist tercentang
      if (o.status === 'selesai' || o.status === 'diverifikasi') {
        o.checklist.forEach(function (c) { c.done = true; c.byId = o.workerIds[0]; c.at = saat(-1, '12:00'); });
      }
      // order berjalan: sebagian tercentang
      if (o.status === 'berjalan') {
        o.checklist.forEach(function (c, i) {
          if (i < Math.ceil(o.checklist.length / 2)) { c.done = true; c.byId = o.workerIds[0]; c.at = saat(0, '09:30'); }
        });
      }
      s.orders.push(o);
    });

    /* ---- absensi lapangan ---- */
    function absen(orderId, workerId, dOff, jamIn, jamOut, lat, lng) {
      s.attendance.push({ id: U.uid('at'), orderId: orderId, workerId: workerId, tipe: 'in',
        at: saat(dOff, jamIn), lat: lat, lng: lng, akurasi: 8 + Math.round(Math.random() * 14), createdAt: saat(dOff, jamIn) });
      if (jamOut) {
        s.attendance.push({ id: U.uid('at'), orderId: orderId, workerId: workerId, tipe: 'out',
          at: saat(dOff, jamOut), lat: lat, lng: lng, akurasi: 9 + Math.round(Math.random() * 12), createdAt: saat(dOff, jamOut) });
      }
    }
    absen('o1', 'u_w1', -7, '07:52', '15:08', -6.235512, 106.816688);
    absen('o1', 'u_w3', -7, '07:58', '15:05', -6.235498, 106.816712);
    absen('o2', 'u_w5', -3, '08:55', '16:12', -6.398021, 106.929987);
    absen('o2', 'u_w6', -3, '08:57', '16:10', -6.398010, 106.930015);
    absen('o3', 'u_w6', -1, '18:50', '23:20', -6.402511, 106.821988);
    absen('o3', 'u_w4', -1, '18:54', '23:18', -6.402490, 106.822010);
    absen('o4', 'u_w2', 0, '07:48', null, -6.256014, 106.999982);
    absen('o4', 'u_w3', 0, '07:55', null, -6.255990, 107.000021);

    /* ---- laporan lapangan (foto before/after) ---- */
    var pB1 = U.uid('ph'), pA1 = U.uid('ph'), pB2 = U.uid('ph'), pA2 = U.uid('ph'),
        pB3 = U.uid('ph'), pA3 = U.uid('ph'), pB4 = U.uid('ph');
    s.photos[pB1] = foto('SEBELUM', '#7C8794');
    s.photos[pA1] = foto('SESUDAH', '#14958A');
    s.photos[pB2] = foto('SEBELUM', '#8A7F73');
    s.photos[pA2] = foto('SESUDAH', '#0E9F6E');
    s.photos[pB3] = foto('SEBELUM', '#6B7280');
    s.photos[pA3] = foto('SESUDAH', '#0EA5E9');
    s.photos[pB4] = foto('SEBELUM', '#94A3B8');

    s.reports.push({ id: 'r1', orderId: 'o1', workerId: 'u_w1', before: [pB1], after: [pA1],
      catatan: 'Seluruh area lantai 1–3 selesai dibersihkan. Ada 2 keran toilet lantai 2 bocor, sudah dilaporkan ke building management.',
      submittedAt: saat(-7, '15:10'), createdAt: saat(-7, '15:10') });
    s.reports.push({ id: 'r2', orderId: 'o2', workerId: 'u_w5', before: [pB2], after: [pA2],
      catatan: 'Deep cleaning 2 lantai selesai. Kerak kamar mandi lantai atas cukup berat, butuh 2x treatment.',
      submittedAt: saat(-3, '16:14'), createdAt: saat(-3, '16:14') });
    s.reports.push({ id: 'r3', orderId: 'o3', workerId: 'u_w6', before: [pB3], after: [pA3],
      catatan: 'Karpet ruang tunggu 62 m² dan 14 kursi selesai. Karpet dikeringkan dengan blower sampai 23.00.',
      submittedAt: saat(-1, '23:22'), createdAt: saat(-1, '23:22') });
    s.reports.push({ id: 'r4', orderId: 'o4', workerId: 'u_w2', before: [pB4], after: [],
      catatan: 'Progress lantai 1 & 2 selesai, lanjut lantai 3.', submittedAt: saat(0, '10:40'), createdAt: saat(0, '10:40') });

    /* ---- QC supervisor ---- */
    s.qc.push({ id: 'qc1', orderId: 'o1', supervisorId: 'u_spv1', skor: { kebersihan: 5, kerapihan: 4, k3: 5, ketepatan: 5 },
      hasil: 'lulus', catatan: 'Hasil rapi, tim datang tepat waktu. Pengarahan K3 dijalankan.',
      at: saat(-7, '15:40'), createdAt: saat(-7, '15:40') });
    s.qc.push({ id: 'qc2', orderId: 'o2', supervisorId: 'u_spv2', skor: { kebersihan: 5, kerapihan: 5, k3: 4, ketepatan: 4 },
      hasil: 'lulus', catatan: 'Klien puas. Catatan: mulai 5 menit terlambat karena akses gerbang perumahan.',
      at: saat(-3, '16:45'), createdAt: saat(-3, '16:45') });

    /* ---- invoice ---- */
    /* nomor melanjutkan arsip di atas */
    s.invoices.push({ id: 'inv1', no: U.docNo('INV', ++s.counters.invoice), orderId: 'o1', clientId: 'u_c1',
      dp: 0, subtotal: 38250000, diskon: 0, ppn: 11, total: 42457500, jatuhTempo: hari(7),
      status: 'lunas', payments: [{ id: U.uid('pay'), at: saat(-2, '10:15'), jumlah: 42457500,
        metode: 'Transfer BCA', ref: 'TRF/8891201', buktiPhotoId: null }],
      terbitAt: saat(-6, '09:00'), createdAt: saat(-6, '09:00') });
    s.invoices.push({ id: 'inv2', no: U.docNo('INV', ++s.counters.invoice), orderId: 'o2', clientId: 'u_c4',
      dp: 0, subtotal: 950000, diskon: 50000, ppn: 0, total: 900000, jatuhTempo: hari(4),
      status: 'belum', payments: [], terbitAt: saat(-3, '17:00'), createdAt: saat(-3, '17:00') });
    s.invoices.push({ id: 'inv3', no: U.docNo('INV', ++s.counters.invoice), orderId: 'o3', clientId: 'u_c3',
      dp: 0, subtotal: 2380000, diskon: 0, ppn: 11, total: 2641800, jatuhTempo: hari(-2),
      status: 'jatuh_tempo', payments: [], terbitAt: saat(-1, '23:50'), createdAt: saat(-1, '23:50') });

    /* ---- pesanan toko ---- */
    /* nomor melanjutkan arsip di atas */
    function hrg(kode) { var r = 0; s.products.forEach(function (p) { if (p.kode === kode) r = p.harga; }); return r; }
    function item(kode, qty) { return { productId: 'prd_' + kode, qty: qty, harga: hrg(kode) }; }
    function totalToko(items, ongkir, ppn, diskon) {
      var sub = items.reduce(function (a, i) { return a + i.qty * i.harga; }, 0);
      var after = sub - (diskon || 0);
      return { subtotal: sub, total: Math.round(after + after * ((ppn || 0) / 100) + (ongkir || 0)) };
    }

    var pesanan = [
      { id: 'sh1', no: U.docNo('TKO', ++s.counters.shop), clientId: 'u_c1', status: 'dikirim',
        items: [item('CHM-01', 10), item('CHM-10', 6), item('CNS-01', 5)],
        ongkir: 75000, ppn: 11, diskon: 0,
        alamatKirim: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan (Lantai B1, Gudang Housekeeping)',
        metodeBayar: 'Transfer Bank', catatan: 'Kirim jam kerja, lapor ke security lobby.',
        kurir: 'Kurir Internal EXOCLEAN', resi: 'EXO-KRM-00812',
        createdAt: saat(-4, '10:22'), dikonfirmasiAt: saat(-4, '11:05'), dikirimAt: saat(-1, '09:15') },

      { id: 'sh2', no: U.docNo('TKO', ++s.counters.shop), clientId: 'u_c3', status: 'baru',
        items: [item('CHM-04', 8), item('APD-02', 4), item('CHM-10', 4)],
        ongkir: 50000, ppn: 11, diskon: 0,
        alamatKirim: 'Jl. Raya Bogor No. 88, Depok',
        metodeBayar: 'Transfer Bank', catatan: 'Mohon dikirim sebelum akhir pekan.',
        createdAt: saat(0, '08:47') },

      { id: 'sh3', no: U.docNo('TKO', ++s.counters.shop), clientId: 'u_c2', status: 'selesai',
        items: [item('ALT-03', 2), item('CHM-02', 3), item('ALT-02', 2)],
        ongkir: 40000, ppn: 0, diskon: 25000,
        alamatKirim: 'Ruko Grand Galaxy Blok RSN No. 12, Bekasi Selatan',
        metodeBayar: 'Transfer Bank', catatan: '',
        kurir: 'JNE Reguler', resi: 'JNE882201934',
        createdAt: saat(-12, '13:40'), dikonfirmasiAt: saat(-12, '14:10'),
        dikirimAt: saat(-11, '10:00'), selesaiAt: saat(-9, '15:30') },

      { id: 'sh4', no: U.docNo('TKO', ++s.counters.shop), clientId: 'u_c4', status: 'dikonfirmasi',
        items: [item('ALT-01', 1), item('CHM-05', 2), item('ALT-09', 1)],
        ongkir: 35000, ppn: 0, diskon: 0,
        alamatKirim: 'Perum Citra Indah, Blok F5 No. 7, Cibubur',
        metodeBayar: 'COD (Bayar di Tempat)', catatan: 'Titip ke satpam bila rumah kosong.',
        createdAt: saat(-1, '19:05'), dikonfirmasiAt: saat(0, '08:10') }
    ];
    pesanan.forEach(function (p) {
      var t = totalToko(p.items, p.ongkir, p.ppn, p.diskon);
      p.subtotal = t.subtotal; p.total = t.total;
      s.shopOrders.push(p);
    });

    /* Stok dipotong hanya untuk pesanan berjalan — arsip bulan lalu tidak
       ikut, karena angka stok yang tersimpan sudah keadaan hari ini. */
    pesanan.forEach(function (p) {
      if (['dikonfirmasi', 'dikemas', 'dikirim', 'selesai'].indexOf(p.status) < 0) return;
      p.items.forEach(function (it) {
        s.products.forEach(function (pr) { if (pr.id === it.productId) pr.stok = Math.max(0, pr.stok - it.qty); });
      });
    });

    /* invoice untuk pesanan toko */
    function pes(id) { return pesanan.filter(function (p) { return p.id === id; })[0]; }
    s.invoices.push({ id: 'inv4', no: U.docNo('INV', ++s.counters.invoice), orderId: null, shopOrderId: 'sh1', clientId: 'u_c1',
      subtotal: pes('sh1').subtotal, diskon: 0, ppn: 11, ongkir: 75000, total: pes('sh1').total,
      jatuhTempo: hari(3), status: 'belum', payments: [], terbitAt: saat(-4, '11:06'), createdAt: saat(-4, '11:06') });
    var invToko3 = {
      id: 'inv5', no: U.docNo('INV', ++s.counters.invoice), orderId: null, shopOrderId: 'sh3', clientId: 'u_c2',
      subtotal: pes('sh3').subtotal, diskon: 25000, ppn: 0, ongkir: 40000, total: pes('sh3').total,
      jatuhTempo: hari(-5), status: 'lunas',
      payments: [{ id: U.uid('pay'), at: saat(-11, '08:30'), jumlah: pes('sh3').total,
        metode: 'Transfer BCA', ref: 'TRF/7710233', buktiPhotoId: null }],
      terbitAt: saat(-12, '14:12'), createdAt: saat(-12, '14:12') };
    s.invoices.push(invToko3);

    /* ---- pengaturan pembayaran + transaksi contoh ---- */
    s.settings.payment = JSON.parse(JSON.stringify(PAY.BAWAAN));

    function jam(n) { return new Date(Date.now() + n * 3600000).toISOString(); }

    /* Nomor transaksi contoh mengikuti bentuk yang sama dengan yang dibuat
       PAY.buatTransaksi(): 24 karakter, huruf besar dan angka. Dibuat
       DETERMINISTIK dari nomor urutnya, bukan acak, supaya data contoh tetap
       sama setiap kali di-seed dan tangkapan layar dokumentasi tidak berubah
       sendiri di antara dua kali pemuatan. */
    function noTx(urut, benih) {
      var HURUF = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var h = 0, s = String(benih);
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      var ekor = '';
      while (ekor.length < 8) { h = (h * 1103515245 + 12345) >>> 0; ekor += HURUF[h % 36]; }
      var waktu = Date.now().toString(36).toUpperCase().slice(-9).padStart(9, '0');
      return ('PAY' + waktu + String(urut).padStart(4, '0') + ekor).slice(0, 24);
    }

    s.paytx.push({ id: 'pay1', no: noTx(1, 'pay1'),
      invoiceId: 'inv5', shopOrderId: 'sh3', clientId: 'u_c2',
      gateway: 'simulasi', channelId: 'va_bca', channelNama: 'BCA Virtual Account',
      jumlah: invToko3.total, biaya: 4440, dibebankan: 'merchant',
      totalBayar: invToko3.total, diterimaBersih: invToko3.total - 4440,
      status: 'paid', va: { bank: 'BCA', nomor: '39001284650173' },
      expiredAt: saat(-11, '14:12'), paidAt: saat(-11, '08:30'), gatewayRef: 'SIM-8841203756',
      createdAt: saat(-12, '14:12') });

    s.paytx.push({ id: 'pay2', no: noTx(2, 'pay2'),
      invoiceId: 'inv2', shopOrderId: null, clientId: 'u_c4',
      gateway: 'simulasi', channelId: 'qris', channelNama: 'QRIS — semua aplikasi',
      jumlah: 900000, biaya: 6993, dibebankan: 'merchant', totalBayar: 900000, diterimaBersih: 893007,
      status: 'pending', qrString: '00020101021226670016COM.EXOCLEAN.WWW0118936009110000000000021553119847220',
      expiredAt: jam(1.6), paidAt: null, gatewayRef: 'SIM-4471029388',
      createdAt: new Date(Date.now() - 24 * 60000).toISOString() });

    s.paytx.push({ id: 'pay3', no: noTx(3, 'pay3'),
      invoiceId: 'inv3', shopOrderId: null, clientId: 'u_c3',
      gateway: 'simulasi', channelId: 'va_mandiri', channelNama: 'Mandiri Virtual Account',
      jumlah: 2641800, biaya: 4440, dibebankan: 'merchant', totalBayar: 2641800, diterimaBersih: 2637360,
      status: 'expired', va: { bank: 'Mandiri', nomor: '89508332019746' },
      expiredAt: saat(-1, '23:50'), paidAt: null, gatewayRef: 'SIM-9920174455',
      createdAt: saat(-2, '23:50') });

    /* Transaksi DIBATALKAN — untuk menguji tampilan, penyaringan, dan laporan.
       Sengaja dibuat atas invoice yang sama dengan pay3 (inv3): itulah keadaan
       yang sesungguhnya terjadi di lapangan — klien memilih satu kanal, batal,
       lalu membuat transaksi baru dengan kanal lain. Satu invoice bisa punya
       beberapa transaksi, dan hanya boleh ada satu yang aktif. */
    s.paytx.push({ id: 'pay4', no: noTx(4, 'pay4'),
      invoiceId: 'inv3', shopOrderId: null, clientId: 'u_c3',
      gateway: 'simulasi', channelId: 'gopay', channelNama: 'GoPay',
      jumlah: 2641800, biaya: 52836, dibebankan: 'merchant',
      totalBayar: 2641800, diterimaBersih: 2588964,
      status: 'dibatalkan', catatan: 'Dibatalkan klien — ganti ke Virtual Account',
      deeplink: 'https://simulator.exoclean.test/gopay/pay4',
      expiredAt: saat(-3, '10:40'), paidAt: null,
      dibatalkanAt: saat(-3, '09:52'), gatewayRef: 'SIM-3310992047',
      createdAt: saat(-3, '09:40') });

    s.counters.pay = 4;

    /* samakan catatan pembayaran invoice toko dengan transaksi gateway-nya */
    invToko3.payments[0].metode = 'Mode Simulasi — BCA Virtual Account';
    invToko3.payments[0].ref = s.paytx[0].no;

    /* ---- rating & komplain ---- */
    s.ratings.push({ id: 'rt1', orderId: 'o1', clientId: 'u_c1', bintang: 5,
      komentar: 'Tim datang tepat waktu dan hasilnya bersih sekali. Lobby jadi terlihat seperti baru.',
      at: saat(-6, '08:30'), createdAt: saat(-6, '08:30') });
    s.ratings.push({ id: 'rt2', orderId: 'o2', clientId: 'u_c4', bintang: 4,
      komentar: 'Hasil bagus, hanya saja mulai agak telat dari jadwal.', at: saat(-2, '19:10'), createdAt: saat(-2, '19:10') });

    s.complaints.push({ id: 'cp1', orderId: 'o3', clientId: 'u_c3', status: 'baru',
      isi: 'Karpet di sudut dekat pintu masuk masih terlihat ada bekas noda kopi. Mohon dicek kembali.',
      photos: [], at: saat(0, '08:20'), createdAt: saat(0, '08:20'), reworkOrderId: null });

    /* ---- antrean pesan WhatsApp ---- */
    s.waOutbox.push({ id: 'wa1', to: 'u_c1', template: 'quotation_terkirim', refType: 'quotation', refId: 'q1',
      pesan: WA.render('quotation_terkirim', { quotationId: 'q1' }, s), status: 'terkirim',
      createdAt: saat(-3, '16:20'), sentAt: saat(-3, '16:21') });
    s.waOutbox.push({ id: 'wa2', to: 'u_c2', template: 'jadwal_dikonfirmasi', refType: 'order', refId: 'o4',
      pesan: WA.render('jadwal_dikonfirmasi', { orderId: 'o4' }, s), status: 'terkirim',
      createdAt: saat(-1, '17:00'), sentAt: saat(-1, '17:02') });
    s.waOutbox.push({ id: 'wa3', to: 'u_c3', template: 'invoice_jatuh_tempo', refType: 'invoice', refId: 'inv3',
      pesan: WA.render('invoice_jatuh_tempo', { invoiceId: 'inv3' }, s), status: 'antre',
      createdAt: saat(0, '07:00'), sentAt: null });
    s.waOutbox.push({ id: 'wa4', to: 'u_c1', template: 'reminder_h1', refType: 'order', refId: 'o6',
      pesan: WA.render('reminder_h1', { orderId: 'o6' }, s), status: 'antre',
      createdAt: saat(0, '07:05'), sentAt: null });
    s.waOutbox.push({ id: 'wa5', to: 'u_c3', template: 'toko_pesanan_diterima', refType: 'shop', refId: 'sh2',
      pesan: WA.render('toko_pesanan_diterima', { shopOrderId: 'sh2' }, s), status: 'antre',
      createdAt: saat(0, '08:48'), sentAt: null });
    s.waOutbox.push({ id: 'wa6', to: 'u_c1', template: 'toko_dikirim', refType: 'shop', refId: 'sh1',
      pesan: WA.render('toko_dikirim', { shopOrderId: 'sh1' }, s), status: 'terkirim',
      createdAt: saat(-1, '09:16'), sentAt: saat(-1, '09:17') });
    s.waOutbox.push({ id: 'wa7', to: 'u_c4', template: 'link_pembayaran', refType: 'paytx', refId: 'pay2',
      pesan: WA.render('link_pembayaran', { txId: 'pay2' }, s), status: 'antre',
      createdAt: new Date(Date.now() - 23 * 60000).toISOString(), sentAt: null });

    /* ---- CRM: prospek & aktivitas ---- */
    s.counters.lead = 9;
    var leads = [
      { id: 'ld1', tahap: 'baru', nama: 'Fitri Handayani', perusahaan: 'PT Karya Nusantara',
        telp: '081377712001', email: 'fitri@karyanusantara.co.id', sumber: 'website', tipe: 'korporat',
        alamat: 'Menara KN, Jl. TB Simatupang Kav. 18, Jakarta Selatan',
        kebutuhan: ['svc_GC-GD', 'svc_CK-EX'], estimasiNilai: 62000000,
        catatan: 'Isi form di website, butuh general cleaning 1.200 m² + cuci kaca lantai 1–5.',
        followUpAt: hari(0), createdAt: saat(-1, '11:20') },

      { id: 'ld2', tahap: 'baru', nama: 'Bpk. Surya', perusahaan: 'Apotek Sehat Sentosa',
        telp: '081377712002', email: '', sumber: 'whatsapp', tipe: 'ruko',
        alamat: 'Jl. Margonda Raya No. 210, Depok',
        kebutuhan: ['svc_PH'], estimasiNilai: 3600000,
        catatan: 'Tanya harga cleaning harian untuk 2 gerai apotek.',
        followUpAt: hari(1), createdAt: saat(0, '08:05') },

      { id: 'ld3', tahap: 'kontak', nama: 'Ratna Dewi', perusahaan: 'Hotel Grand Melati',
        telp: '081377712003', email: 'ratna@grandmelati.id', sumber: 'referensi', tipe: 'korporat',
        alamat: 'Jl. Pemuda No. 45, Bekasi',
        kebutuhan: ['svc_CKP', 'svc_CSF', 'svc_CSB'], estimasiNilai: 48000000,
        catatan: 'Referensi dari PT Sinar Mandiri. Cuci karpet 4 lantai + 120 kursi + 40 spring bed.',
        followUpAt: hari(-2), createdAt: saat(-6, '09:40') },

      { id: 'ld4', tahap: 'kontak', nama: 'Ir. Bambang Sutrisno', perusahaan: 'PT Logistik Prima',
        telp: '081377712004', email: 'bambang@logistikprima.co.id', sumber: 'google_ads', tipe: 'pabrik',
        alamat: 'Kawasan Industri MM2100 Blok C-8, Cikarang',
        kebutuhan: ['svc_SLB', 'svc_GC-GD'], estimasiNilai: 85000000,
        catatan: 'Gudang 3.000 m². Minta proposal resmi berkop untuk diajukan ke pusat.',
        followUpAt: hari(2), createdAt: saat(-8, '14:15') },

      { id: 'ld5', tahap: 'survei', nama: 'Yulia Prasetyo', perusahaan: 'Klinik Gigi Senyum',
        telp: '081377712005', email: 'admin@kliniksenyum.id', sumber: 'instagram', tipe: 'ruko',
        alamat: 'Ruko Green Park Blok B-3, Tangerang Selatan',
        kebutuhan: ['svc_DC-RM', 'svc_CK-RK'], estimasiNilai: 7500000,
        catatan: 'Survei dijadwalkan. Klinik baru renovasi, butuh deep cleaning sebelum buka.',
        followUpAt: hari(1), createdAt: saat(-5, '16:00') },

      { id: 'ld6', tahap: 'survei', nama: 'Hendrawan Lie', perusahaan: 'Tower Cemerlang',
        telp: '081377712006', email: 'building@towercemerlang.com', sumber: 'tender', tipe: 'korporat',
        alamat: 'Jl. Sudirman Kav. 52, Jakarta Pusat',
        kebutuhan: ['svc_CK-RA', 'svc_ACP'], estimasiNilai: 175000000,
        catatan: 'Undangan tender cuci fasad 22 lantai. Butuh dokumen K3, ISO, dan pengalaman rope access.',
        followUpAt: hari(3), createdAt: saat(-11, '10:30') },

      { id: 'ld7', tahap: 'penawaran', nama: 'Sinta Maharani', perusahaan: 'Sekolah Cendekia Bangsa',
        telp: '081377712007', email: 'sarpras@cendekiabangsa.sch.id', sumber: 'referensi', tipe: 'korporat',
        alamat: 'Jl. Raya Serpong No. 77, Tangerang Selatan',
        kebutuhan: ['svc_GC-GD', 'svc_PLM'], estimasiNilai: 54000000,
        catatan: 'Penawaran sudah dikirim, menunggu rapat yayasan pekan ini.',
        followUpAt: hari(2), createdAt: saat(-14, '13:00') },

      { id: 'ld8', tahap: 'negosiasi', nama: 'Agung Nugroho', perusahaan: 'Cafe Kopi Kita (5 cabang)',
        telp: '081377712008', email: 'agung@kopikita.id', sumber: 'walk_in', tipe: 'ruko',
        alamat: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
        kebutuhan: ['svc_PH', 'svc_CSF'], estimasiNilai: 18000000,
        catatan: 'Minta diskon 15% untuk kontrak 5 cabang. Sedang dihitung ulang marginnya.',
        followUpAt: hari(0), createdAt: saat(-18, '11:00') },

      { id: 'ld9', tahap: 'kalah', nama: 'Doni Saputra', perusahaan: 'Ruko Bintaro Sektor 9',
        telp: '081377712009', email: '', sumber: 'website', tipe: 'ruko',
        alamat: 'Bintaro Sektor 9, Tangerang Selatan',
        kebutuhan: ['svc_CK-RK'], estimasiNilai: 2200000,
        catatan: '', alasanKalah: 'Harga terlalu tinggi — memilih tukang harian',
        followUpAt: null, closedAt: saat(-4, '15:00'), createdAt: saat(-20, '09:00') }
    ];
    leads.forEach(function (l, i) {
      s.leads.push(Object.assign({
        no: U.docNo('LEAD', i + 1), ownerId: 'u_admin', clientId: null, quotationId: null,
        alasanKalah: null, closedAt: null, tahapAt: l.createdAt
      }, l));
    });

    /* prospek yang sudah jadi klien — menyambungkan CRM dengan data pelanggan */
    s.leads.push({ id: 'ld0', no: 'EXO/LEAD/' + (new Date().getFullYear() - 1) + '/0142', tahap: 'menang',
      nama: 'Lestari Wijaya', perusahaan: 'PT Sinar Mandiri Abadi', telp: '081298765001',
      email: 'lestari@sinarmandiri.co.id', sumber: 'referensi', tipe: 'korporat',
      alamat: 'Gedung Sinar Mandiri, Jl. Gatot Subroto Kav. 21, Jakarta Selatan',
      kebutuhan: ['svc_GC-GD', 'svc_CK-RA'], estimasiNilai: 57000000,
      catatan: 'Klien korporat pertama dari referensi. Kini kontrak berjalan.',
      ownerId: 'u_admin', clientId: 'u_c1', quotationId: null, alasanKalah: null,
      followUpAt: null, tahapAt: saat(-40, '10:00'), closedAt: saat(-40, '10:00'), createdAt: saat(-55, '09:00') });

    var akt = [
      { leadId: 'ld1', tipe: 'catatan', arah: 'masuk', judul: 'Prospek masuk dari Website / SEO',
        isi: 'Mengisi form "Minta Penawaran" di halaman harga.', hasil: 'terhubung', selesai: true, at: saat(-1, '11:20') },
      { leadId: 'ld1', tipe: 'telepon', arah: 'keluar', judul: 'Telepon perkenalan',
        isi: 'Belum diangkat, coba lagi siang ini.', hasil: 'tidak_angkat',
        followUpAt: hari(0), selesai: false, at: saat(0, '09:10') },

      { leadId: 'ld3', tipe: 'whatsapp', arah: 'keluar', judul: 'Sapaan pertama & tawaran survei',
        isi: 'Dibalas, minta dihubungi lagi setelah tanggal 15.', hasil: 'terhubung',
        followUpAt: hari(-2), selesai: false, at: saat(-6, '10:05') },

      { leadId: 'ld4', tipe: 'email', arah: 'keluar', judul: 'Kirim company profile & sertifikat K3',
        isi: 'Dokumen dikirim ke bambang@logistikprima.co.id, dibaca tapi belum dibalas.',
        hasil: 'terhubung', followUpAt: hari(2), selesai: false, at: saat(-4, '15:30') },

      { leadId: 'ld5', tipe: 'kunjungan', arah: 'keluar', judul: 'Survei lokasi klinik',
        isi: 'Luas total 180 m², 2 lantai. Kaca depan 24 m². Estimasi 1 hari kerja, 3 petugas.',
        hasil: 'terhubung', followUpAt: hari(1), selesai: false, at: saat(-2, '13:00') },

      { leadId: 'ld6', tipe: 'meeting', arah: 'keluar', judul: 'Aanwijzing tender',
        isi: 'Hadir bersama supervisor Budi. Pesaing: 3 vendor. Penilaian 60% teknis, 40% harga.',
        hasil: 'terhubung', followUpAt: hari(3), selesai: false, at: saat(-3, '10:00') },

      { leadId: 'ld7', tipe: 'whatsapp', arah: 'keluar', judul: 'Konfirmasi penerimaan penawaran',
        isi: 'Penawaran diterima, akan dibahas di rapat yayasan Jumat.', hasil: 'terhubung',
        followUpAt: hari(2), selesai: false, at: saat(-3, '16:20') },

      { leadId: 'ld8', tipe: 'telepon', arah: 'masuk', judul: 'Negosiasi harga kontrak 5 cabang',
        isi: 'Minta diskon 15%. Kami tawarkan 10% + gratis 1 kali deep cleaning.',
        hasil: 'terhubung', followUpAt: hari(0), selesai: false, at: saat(-1, '14:45') },

      { leadId: 'ld9', tipe: 'catatan', arah: 'keluar', judul: 'Tahap: Negosiasi → Kalah',
        isi: 'Alasan: Harga terlalu tinggi — memilih tukang harian', hasil: 'terhubung',
        selesai: true, at: saat(-4, '15:00') },

      { clientId: 'u_c1', tipe: 'meeting', arah: 'keluar', judul: 'Review kontrak triwulan',
        isi: 'Klien puas dengan hasil. Membuka peluang tambahan poles marmer lobby.',
        hasil: 'terhubung', selesai: true, at: saat(-9, '10:00') },
      { clientId: 'u_c3', tipe: 'telepon', arah: 'masuk', judul: 'Komplain karpet ruang tunggu',
        isi: 'Klien melaporkan noda kopi masih tersisa. Dijadwalkan pengerjaan ulang.',
        hasil: 'terhubung', followUpAt: hari(1), selesai: false, at: saat(0, '08:25') },
      { clientId: 'u_c2', tipe: 'whatsapp', arah: 'keluar', judul: 'Tawaran kontrak bulanan',
        isi: 'Ditawarkan paket cuci kaca bulanan, klien mempertimbangkan.',
        hasil: 'terhubung', followUpAt: hari(5), selesai: false, at: saat(-3, '11:15') }
    ];
    akt.forEach(function (a) {
      s.activities.push(Object.assign({
        id: U.uid('act'), leadId: null, clientId: null, byId: 'u_admin',
        followUpAt: null, selesai: true, createdAt: a.at
      }, a));
    });

    /* ---- promo & program (tampil di bagian bawah halaman Profil) ---- */
    var promos = [
      { id: 'pr1', kode: 'ACBARU50', judul: 'Cuci AC Split — Diskon 30%',
        deskripsi: 'Layanan baru! Cuci AC split ½–2 PK dengan mesin steam. Diskon 30% untuk 3 unit atau lebih.',
        untukRole: ['client'], target: 'jasa', tipe: 'diskon_persen', nilai: 30,
        minBelanja: 0, warna: '#0EA5E9', ikon: '❄️',
        berlakuHingga: hari(30), kuota: 100, terpakai: 12, aktif: true },

      { id: 'pr2', kode: 'GRATISONGKIR', judul: 'Gratis Ongkir Toko Perlengkapan',
        deskripsi: 'Belanja alat & chemical minimal Rp1.000.000, ongkos kirim area Jabodetabek kami tanggung.',
        untukRole: ['client'], target: 'toko', tipe: 'gratis_ongkir', nilai: 0,
        minBelanja: 1000000, warna: '#14958A', ikon: '🚚',
        berlakuHingga: hari(21), kuota: 200, terpakai: 47, aktif: true },

      { id: 'pr3', kode: 'KONTRAK12', judul: 'Kontrak Tahunan Hemat 15%',
        deskripsi: 'Ambil kontrak kebersihan 12 bulan dan dapatkan potongan 15% dibanding harga sekali panggil.',
        untukRole: ['client'], target: 'jasa', tipe: 'diskon_persen', nilai: 15,
        minBelanja: 0, warna: '#7C3AED', ikon: '📅',
        berlakuHingga: hari(60), kuota: 0, terpakai: 8, aktif: true },

      { id: 'pr4', kode: 'DEEPCLEAN100', judul: 'Potongan Rp100.000 Deep Cleaning Rumah',
        deskripsi: 'Khusus pemesanan Deep Cleaning Rumah pertama Anda. Berlaku satu kali per pelanggan.',
        untukRole: ['client'], target: 'jasa', tipe: 'diskon_nominal', nilai: 100000,
        minBelanja: 800000, warna: '#C2410C', ikon: '🫧',
        berlakuHingga: hari(14), kuota: 50, terpakai: 31, aktif: true },

      /* untuk tim internal, bagian ini berisi program & informasi */
      { id: 'pr5', kode: 'K3-2026', judul: 'Pelatihan & Sertifikasi K3 Gratis',
        deskripsi: 'Batch berikutnya dibuka bulan ini. Daftar ke supervisor Anda. Sertifikat berlaku 3 tahun.',
        untukRole: ['worker', 'supervisor'], target: 'internal', tipe: 'info', nilai: 0,
        minBelanja: 0, warna: '#B45309', ikon: '🦺',
        berlakuHingga: hari(25), kuota: 20, terpakai: 6, aktif: true },

      { id: 'pr6', kode: 'BONUS-QC', judul: 'Bonus Kinerja Rata QC ≥ 4,5',
        deskripsi: 'Petugas dengan rata-rata nilai QC minimal 4,5 bulan ini mendapat bonus Rp250.000.',
        untukRole: ['worker', 'supervisor'], target: 'internal', tipe: 'info', nilai: 250000,
        minBelanja: 0, warna: '#0E9F6E', ikon: '🏅',
        berlakuHingga: hari(18), kuota: 0, terpakai: 0, aktif: true },

      { id: 'pr7', kode: 'ROPE-L2', judul: 'Beasiswa Rope Access Level 2',
        deskripsi: 'Untuk teknisi yang sudah memegang Level 1 dan minimal 6 bulan masa kerja.',
        untukRole: ['worker'], target: 'internal', tipe: 'info', nilai: 0,
        minBelanja: 0, warna: '#4338CA', ikon: '🧗',
        berlakuHingga: hari(40), kuota: 4, terpakai: 1, aktif: true },

      { id: 'pr8', kode: 'REFERRAL', judul: 'Program Referral — Komisi 5%',
        deskripsi: 'Rekomendasikan EXOCLEAN ke rekanan Anda. Bila kontraknya jadi, Anda dapat komisi 5% dari nilai bulan pertama.',
        untukRole: ['client', 'supervisor', 'admin'], target: 'semua', tipe: 'info', nilai: 5,
        minBelanja: 0, warna: '#0F766E', ikon: '🤝',
        berlakuHingga: hari(90), kuota: 0, terpakai: 3, aktif: true }
    ];
    promos.forEach(function (p) {
      s.promos.push(Object.assign({ berlakuDari: hari(-10), createdAt: U.nowISO() }, p));
    });

    /* ---- LMS: syarat & ketentuan, kursus, progres, sertifikat ---- */
    s.settings.syaratMitra = KURIKULUM.SYARAT.map(function (b) {
      return Object.assign({ wajib: true }, b); });

    KURIKULUM.KURSUS.forEach(function (k, i) {
      s.kursus.push(Object.assign({ id: 'krs_' + k.kode, aktif: true, createdAt: U.nowISO(),
        sertifikat: true }, k, { urutan: k.urutan || i + 1 }));
    });
    /* Kursus pembuka fungsi kerja — bukan syarat menjadi mitra, melainkan
       syarat menerima penugasan pada layanan tertentu. */
    KURIKULUM_FUNGSI.KURSUS.forEach(function (k) {
      s.kursus.push(Object.assign({ id: 'krs_' + k.kode, aktif: true, createdAt: U.nowISO(),
        sertifikat: true }, k));
    });

    /* Keadaan tiap mitra dibuat berbeda supaya alur rekrutmen ada isinya:
       empat mitra aktif, satu sedang belajar, dua baru mendaftar. */
    /* `fungsi` = fungsi kerja yang didaftarkan mitra. Yang kursusnya ada di
       `lulus` menjadi tersertifikasi; sisanya tampil sebagai sedang ditempuh —
       itulah gunanya membedakan keduanya di data contoh. */
    var MITRA = {
      u_w1: { status: 'aktif', lulus: ['K3-DASAR', 'SOP-BERSIH', 'ALAT', 'LAYANAN', 'APLIKASI',
          'KETINGGIAN', 'FK-CLEAN', 'FK-UPHOL'],
        nilai: [95, 90, 100, 85, 95, 90, 95, 90], sejak: 300,
        fungsi: ['FK-KETINGGIAN', 'FK-CLEAN', 'FK-UPHOL', 'FK-POLES'] },
      u_w2: { status: 'aktif', lulus: ['K3-DASAR', 'SOP-BERSIH', 'ALAT', 'LAYANAN', 'APLIKASI',
          'KETINGGIAN', 'FK-CLEAN'],
        nilai: [90, 85, 90, 90, 100, 100, 90], sejak: 280,
        fungsi: ['FK-KETINGGIAN', 'FK-CLEAN'] },
      u_w3: { status: 'aktif', lulus: ['K3-DASAR', 'SOP-BERSIH', 'ALAT', 'LAYANAN', 'APLIKASI',
          'FK-CLEAN', 'FK-UPHOL', 'FK-LAUNDRY'],
        nilai: [85, 95, 85, 100, 90, 95, 90, 85], sejak: 250,
        fungsi: ['FK-CLEAN', 'FK-UPHOL', 'FK-LAUNDRY', 'FK-CARE'] },
      u_w4: { status: 'aktif', lulus: ['K3-DASAR', 'SOP-BERSIH', 'ALAT', 'LAYANAN', 'APLIKASI',
          'AC', 'FK-CLEAN'],
        nilai: [90, 90, 95, 85, 85, 95, 90], sejak: 220,
        fungsi: ['FK-AC', 'FK-CLEAN', 'FK-KENDARAAN'] },
      /* sedang menempuh — tiga kursus lulus, satu gagal sekali lalu lulus, satu belum */
      u_w5: { status: 'onboarding', lulus: ['K3-DASAR', 'SOP-BERSIH', 'ALAT'],
        nilai: [85, 80, 90], gagal: ['LAYANAN'], sejak: 18, setujuSK: true,
        fungsi: ['FK-CLEAN', 'FK-CARE'] },
      /* baru daftar — sudah setuju S&K, belum mulai belajar */
      u_w6: { status: 'onboarding', lulus: [], nilai: [], sejak: 6, setujuSK: true,
        fungsi: ['FK-KENDARAAN'] },
      /* pendaftar paling baru — belum menyetujui S&K, belum memilih fungsi */
      u_w7: { status: 'onboarding', lulus: [], nilai: [], sejak: 2, setujuSK: false }
    };

    s.counters.sertifikat = 0;
    function kodeSert(seed) {
      var h = 5381;
      for (var i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
      var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', t = '';
      for (var j = 0; j < 8; j++) { t += ab[h % ab.length]; h = Math.floor(h / ab.length) + j * 7919; }
      return t.slice(0, 4) + '-' + t.slice(4);
    }
    function terbitSert(userId, kursusId, judul, jenis, nilai, hariLalu, masaHari) {
      var no = U.docNo('CERT', ++s.counters.sertifikat, hari(-hariLalu));
      s.sertifikat.push({ id: U.uid('crt'), no: no, userId: userId, kursusId: kursusId,
        judul: judul, jenis: jenis, nilai: nilai, terbitAt: saat(-hariLalu, '14:00'),
        berlakuHingga: hari(-hariLalu + (masaHari || 1095)),
        kode: kodeSert(userId + '|' + kursusId + '|' + no), createdAt: saat(-hariLalu, '14:00') });
    }

    Object.keys(MITRA).forEach(function (uid) {
      var mt = MITRA[uid];
      var user = s.users.filter(function (x) { return x.id === uid; })[0];
      if (!user) return;
      user.statusMitra = mt.status;
      user.daftarAt = saat(-mt.sejak, '09:30');
      user.fungsiKerja = (mt.fungsi || []).slice();
      if (mt.status === 'aktif') {
        user.disetujuiAt = saat(-(mt.sejak - 12), '10:00');
        user.disetujuiOleh = 'u_admin';
      }
      if (mt.status === 'aktif' || mt.setujuSK) {
        user.persetujuanSK = { versi: LMS.VERSI_SK, at: saat(-mt.sejak, '09:45'),
          butir: KURIKULUM.SYARAT.map(function (b) { return b.id; }) };
      }

      /* kursus yang lulus */
      mt.lulus.forEach(function (kode, i) {
        var k = s.kursus.filter(function (x) { return x.kode === kode; })[0];
        if (!k) return;
        var nilai = mt.nilai[i];
        var jarak = mt.sejak - 4 - i * 2;
        s.lmsProgres.push({ id: U.uid('lp'), userId: uid, kursusId: k.id, status: 'selesai',
          materiSelesai: (k.materi || []).map(function (_, idx) { return idx; }),
          percobaan: [{ at: saat(-jarak, '20:00'), nilai: nilai,
            benar: Math.round(nilai / 100 * k.kuis.length), total: k.kuis.length, lulus: true }],
          nilaiTerbaik: nilai, mulaiAt: saat(-(jarak + 1), '19:00'), selesaiAt: saat(-jarak, '20:00'),
          createdAt: saat(-(jarak + 1), '19:00') });
        terbitSert(uid, k.id, k.judul, k.wajib ? 'wajib' : 'spesialisasi', nilai, jarak, k.masaBerlakuHari);
      });

      /* kursus yang sempat gagal — materi tuntas, kuis belum lulus */
      (mt.gagal || []).forEach(function (kode) {
        var k = s.kursus.filter(function (x) { return x.kode === kode; })[0];
        if (!k) return;
        s.lmsProgres.push({ id: U.uid('lp'), userId: uid, kursusId: k.id, status: 'berjalan',
          materiSelesai: (k.materi || []).map(function (_, idx) { return idx; }),
          percobaan: [{ at: saat(-2, '21:00'), nilai: 60, benar: 3, total: k.kuis.length, lulus: false }],
          nilaiTerbaik: 60, mulaiAt: saat(-3, '20:00'), selesaiAt: null, createdAt: saat(-3, '20:00') });
      });

      /* sertifikat mitra untuk yang seluruh kursus wajibnya lulus */
      var wajibKode = s.kursus.filter(function (k) { return k.wajib; }).map(function (k) { return k.kode; });
      if (wajibKode.every(function (kd) { return mt.lulus.indexOf(kd) >= 0; })) {
        var rata = Math.round(wajibKode.reduce(function (a, kd) {
          return a + mt.nilai[mt.lulus.indexOf(kd)]; }, 0) / wajibKode.length);
        terbitSert(uid, 'MITRA', 'Mitra Tersertifikasi EXOCLEAN', 'mitra', rata, mt.sejak - 12, 1095);
      }
    });

    /* ---- pengaturan & riwayat bagi hasil ---- */
    /* Porsi mitra per layanan (% nilai order untuk tim). Layanan padat alat &
       chemical porsinya lebih kecil; pekerjaan berisiko tinggi lebih besar. */
    var PORSI = {
      'GC-GD': 40, 'CK-EX': 42, 'CK-RA': 50, 'ACP': 45, 'PLM': 38, 'NB': 45, 'SLB': 45,
      'PH': 45, 'GC-RM': 45, 'DC-RM': 42, 'CK-RK': 45,
      'CKP': 38, 'CSF': 40, 'CSB': 40,
      'AC-SPL': 45, 'AC-CST': 45, 'AC-DCT': 40, 'AC-FRE': 35,
      'KF': 35, 'SLK': 35, 'CS': 35
    };
    s.services.forEach(function (sv) { if (PORSI[sv.kode]) sv.porsiMitra = PORSI[sv.kode]; });

    s.settings.bagiHasil = JSON.parse(JSON.stringify(BAGI.BAWAAN));

    /* ================================================================ DOMPET MITRA
       Dua periode terakhir dibuatkan slip lalu disetujui — dan slip yang
       disetujui langsung menjadi saldo di dompet mitra. Periode yang lebih
       lama sebagian sudah ditarik mitra, supaya buku besarnya terlihat hidup. */
    s.settings.dompet = JSON.parse(JSON.stringify(DOMPET.BAWAAN));

    var saldoBerjalan = {};
    function mutasiSeed(userId, jumlah, jenis, ket, ref, at) {
      saldoBerjalan[userId] = (saldoBerjalan[userId] || 0) + jumlah;
      s.mutasi.push({
        id: U.uid('mut'), userId: userId, jumlah: jumlah, jenis: jenis, ket: ket,
        refType: ref && ref.tipe || null, refId: ref && ref.id || null,
        saldoSetelah: saldoBerjalan[userId], at: at, createdAt: at
      });
    }

    var pSekarang = BAGI.periodeSekarang();
    var perBaru = BAGI.periodeDari(U.addDays(pSekarang.dari, -1));
    var perLama = BAGI.periodeDari(U.addDays(perBaru.dari, -1));

    /* periode lama dulu supaya penomoran slip urut secara kronologis */
    var slipLama = BAGI.buatPayoutMassal(perLama, 'u_admin');
    var slipBaru = BAGI.buatPayoutMassal(perBaru, 'u_admin');

    slipLama.forEach(function (pay) {
      DB.update('payouts', pay.id, { status: 'disetujui',
        disetujuiAt: saat(-19, '10:00'), disetujuiOleh: 'u_admin' });
      mutasiSeed(pay.mitraId, pay.total, 'bagihasil',
        'Slip ' + pay.no + ' • ' + pay.periodeLabel, { tipe: 'payout', id: pay.id },
        saat(-19, '10:00'));
    });

    /* sebagian mitra menarik hasil periode lama beberapa hari kemudian */
    slipLama.forEach(function (pay, i) {
      if (i % 3 === 2) return;                       /* satu dari tiga membiarkan saldonya */
      var jumlah = Math.floor((pay.total * 0.8) / 50000) * 50000;
      if (jumlah < 50000) return;
      var biaya = DOMPET.BAWAAN.biayaAdmin;
      var rek = (BIZ.user(pay.mitraId).rekening || [])[0] ||
        { bank: 'BCA', nomor: '0000000000', atasNama: BIZ.nama(pay.mitraId) };
      var no = U.docNo('TRK', DB.nextNo('tarik'));
      var x = DB.insert('penarikan', {
        no: no, userId: pay.mitraId, jumlah: jumlah, biaya: biaya, diterima: jumlah - biaya,
        rekening: { bank: rek.bank, nomor: rek.nomor, atasNama: rek.atasNama },
        status: 'selesai', ref: 'TRF/TRK/' + (90100 + i * 37),
        catatan: '', diprosesAt: saat(-17, '09:20'), selesaiAt: saat(-17, '11:05'),
        olehId: 'u_admin', createdAt: saat(-18, '20:14')
      });
      mutasiSeed(pay.mitraId, -jumlah, 'tarik',
        'Penarikan ' + no + ' → ' + rek.bank + ' ' + rek.nomor,
        { tipe: 'penarikan', id: x.id }, saat(-18, '20:14'));
      mutasiSeed(pay.mitraId, -biaya, 'biaya', 'Biaya transfer ' + no,
        { tipe: 'penarikan', id: x.id }, saat(-17, '11:05'));
    });

    slipBaru.forEach(function (pay) {
      DB.update('payouts', pay.id, { status: 'disetujui',
        disetujuiAt: saat(-4, '10:00'), disetujuiOleh: 'u_admin' });
      mutasiSeed(pay.mitraId, pay.total, 'bagihasil',
        'Slip ' + pay.no + ' • ' + pay.periodeLabel, { tipe: 'payout', id: pay.id },
        saat(-4, '10:00'));
    });

    /* satu bonus mutu supaya jenis mutasi selain bagi hasil ikut terlihat */
    if (saldoBerjalan['u_w1'] !== undefined) {
      mutasiSeed('u_w1', 150000, 'bonus',
        'Bonus mutu triwulan — rata-rata QC 4,8', null, saat(-6, '16:00'));
    }

    /* satu penarikan yang masih menunggu, supaya antrean admin tidak kosong */
    (function () {
      var mitra = 'u_w2';
      if (!(saldoBerjalan[mitra] > 150000)) return;
      var rek = (BIZ.user(mitra).rekening || [])[0];
      if (!rek) return;
      var jumlah = 150000, biaya = DOMPET.BAWAAN.biayaAdmin;
      var no = U.docNo('TRK', DB.nextNo('tarik'));
      var x = DB.insert('penarikan', {
        no: no, userId: mitra, jumlah: jumlah, biaya: biaya, diterima: jumlah - biaya,
        rekening: { bank: rek.bank, nomor: rek.nomor, atasNama: rek.atasNama },
        status: 'diajukan', ref: '', catatan: '',
        diprosesAt: null, selesaiAt: null, olehId: null, createdAt: saat(0, '07:42')
      });
      mutasiSeed(mitra, -jumlah, 'tarik',
        'Penarikan ' + no + ' → ' + rek.bank + ' ' + rek.nomor,
        { tipe: 'penarikan', id: x.id }, saat(0, '07:42'));
    })();

    /* ================================================================ AFILIASI & DROPSHIP
       Dua klien dijadikan contoh: satu affiliate yang sudah menghasilkan
       komisi, satu dropshipper yang etalasenya sudah terisi. */
    s.settings.afiliasi = JSON.parse(JSON.stringify(AFILIASI.BAWAAN));
    s.settings.dropship = JSON.parse(JSON.stringify(DROPSHIP.BAWAAN));
    s.settings.akun = JSON.parse(JSON.stringify(AKUN.BAWAAN));

    (function () {
      var af = s.users.filter(function (u) { return u.id === 'u_c1'; })[0];
      var ds = s.users.filter(function (u) { return u.id === 'u_c2'; })[0];
      if (!af || !ds) return;

      /* semua akun contoh dianggap sudah terverifikasi */
      s.users.forEach(function (u) {
        u.emailVerifiedAt = u.emailVerifiedAt || u.createdAt || saat(-200, '09:00');
        u.telpVerifiedAt = u.telpVerifiedAt || u.createdAt || saat(-200, '09:00');
        u.sosial = u.sosial || [];
        u.metodeDaftar = u.metodeDaftar || 'email';
      });
      /* satu akun contoh memakai Google, supaya tampilan "cara masuk" ada isinya */
      af.sosial = [{ provider: 'google', uid: 'g-500110', email: af.email,
        tautAt: saat(-120, '10:00') }];
      af.metodeDaftar = 'google';

      af.afiliasi = { kode: 'LEST7K4M', status: 'aktif', daftarAt: saat(-95, '11:00'),
        disetujuiAt: saat(-95, '11:00'), klik: 148 };

      /* dua referral: satu sudah bertransaksi, satu belum */
      var r1 = { id: U.uid('ref'), afiliatorId: af.id, userId: 'u_c3', kode: 'LEST7K4M',
        daftarAt: saat(-62, '19:20'), lekatSampai: hari(-62 + 90), transaksi: 1, komisiTotal: 0,
        createdAt: saat(-62, '19:20') };
      var r2 = { id: U.uid('ref'), afiliatorId: af.id, userId: 'u_c4', kode: 'LEST7K4M',
        daftarAt: saat(-21, '08:05'), lekatSampai: hari(-21 + 90), transaksi: 0, komisiTotal: 0,
        createdAt: saat(-21, '08:05') };
      s.referral.push(r1, r2);

      /* satu komisi sudah matang & masuk saldo, satu masih tertunda */
      var invRef = s.invoices.filter(function (i) { return i.clientId === 'u_c3'; })[0];
      var k1total = 0;
      if (invRef) {
        var dasar = invRef.subtotal || invRef.total;
        var nilai = Math.round(dasar * AFILIASI.BAWAAN.komisiJasa / 100);
        k1total = nilai + AFILIASI.BAWAAN.komisiPendaftaran;
        s.komisi.push({ id: U.uid('kom'), afiliatorId: af.id, dariUserId: 'u_c3',
          referralId: r1.id, jenis: 'jasa', dasar: dasar,
          skema: { persen: AFILIASI.BAWAAN.komisiJasa,
            bonusPendaftaran: AFILIASI.BAWAAN.komisiPendaftaran,
            hariTahan: AFILIASI.BAWAAN.hariTahan },
          nilai: nilai, bonus: AFILIASI.BAWAAN.komisiPendaftaran, total: k1total,
          refType: 'invoice', refId: invRef.id, judul: 'Invoice ' + invRef.no,
          status: 'matang', matangAt: hari(-40), matangRealAt: saat(-40, '06:00'),
          at: saat(-54, '15:00'), createdAt: saat(-54, '15:00') });
        r1.komisiTotal = k1total;

        mutasiSeed(af.id, k1total, 'komisi', 'Komisi afiliasi • Invoice ' + invRef.no,
          { tipe: 'komisi', id: s.komisi[s.komisi.length - 1].id }, saat(-40, '06:00'));
      }
      var soRef = s.shopOrders.filter(function (o) { return o.clientId === 'u_c3'; })[0];
      if (soRef) {
        var dasar2 = soRef.subtotal || 0;
        var nilai2 = Math.round(dasar2 * AFILIASI.BAWAAN.komisiProduk / 100);
        s.komisi.push({ id: U.uid('kom'), afiliatorId: af.id, dariUserId: 'u_c3',
          referralId: r1.id, jenis: 'produk', dasar: dasar2,
          skema: { persen: AFILIASI.BAWAAN.komisiProduk, bonusPendaftaran: 0,
            hariTahan: AFILIASI.BAWAAN.hariTahan },
          nilai: nilai2, bonus: 0, total: nilai2,
          refType: 'shop', refId: soRef.id, judul: 'Pesanan ' + soRef.no,
          status: 'tertunda', matangAt: hari(6), at: saat(-8, '13:30'),
          createdAt: saat(-8, '13:30') });
        r1.komisiTotal += nilai2;
      }

      /* dropshipper dengan etalase terisi */
      ds.dropship = { namaToko: 'Griya Bersih Store', deskripsi: 'Perlengkapan kebersihan rumah tangga.',
        kanal: 'Instagram', kota: 'Bekasi', status: 'aktif',
        daftarAt: saat(-70, '14:00'), disetujuiAt: saat(-68, '09:30') };

      var pilihProduk = s.products.filter(function (p) {
        return !p.sellerId && p.harga > 0; }).slice(0, 5);
      pilihProduk.forEach(function (p, i) {
        var b = Math.ceil(p.harga * (1 + (12 + i * 4) / 100) / 500) * 500;
        s.dropProduk.push({ id: U.uid('drp'), userId: ds.id, produkId: p.id,
          hargaJual: b, hargaDasar: p.harga, aktif: true, terjual: i < 2 ? (3 - i) : 0,
          at: saat(-60 + i, '10:00'), createdAt: saat(-60 + i, '10:00') });
      });

      /* satu penjualan dropship yang marginnya sudah masuk saldo */
      if (pilihProduk.length >= 2) {
        var b1 = pilihProduk[0], b2 = pilihProduk[1];
        var d1 = s.dropProduk[0], d2 = s.dropProduk[1];
        var baris = [
          { produkId: b1.id, nama: b1.nama, qty: 2, hargaDasar: d1.hargaDasar,
            hargaJual: d1.hargaJual, margin: (d1.hargaJual - d1.hargaDasar) * 2 },
          { produkId: b2.id, nama: b2.nama, qty: 1, hargaDasar: d2.hargaDasar,
            hargaJual: d2.hargaJual, margin: (d2.hargaJual - d2.hargaDasar) }
        ];
        var kotor = baris.reduce(function (a, x) { return a + x.margin; }, 0);
        var mId = U.uid('dmg');
        s.dropMargin.push({ id: mId, userId: ds.id, shopOrderId: 'so_contoh_drop',
          no: 'EXO/SHP/2026/D001', baris: baris, kotor: kotor, biayaPlatform: 0, bersih: kotor,
          skema: { biayaPlatform: 0, hariTahan: DROPSHIP.BAWAAN.hariTahan },
          status: 'matang', matangAt: hari(-25), matangRealAt: saat(-25, '07:00'),
          diterimaAt: saat(-32, '16:00'), at: saat(-35, '11:20'), createdAt: saat(-35, '11:20') });
        mutasiSeed(ds.id, kotor, 'margin', 'Margin dropship EXO/SHP/2026/D001',
          { tipe: 'dropMargin', id: mId }, saat(-25, '07:00'));
      }

      /* beberapa jejak berbagi supaya laporan admin ada isinya */
      [['whatsapp', 'produk', 12], ['facebook', 'layanan', 6], ['x', 'layanan', 3],
       ['telegram', 'produk', 4], ['salin', 'undangan', 8]].forEach(function (b) {
        for (var i = 0; i < b[2]; i++) {
          s.berbagi.push({ id: U.uid('bgi'), userId: i % 2 ? af.id : ds.id, jenis: b[1],
            judul: b[1] === 'produk' ? 'Floor Cleaner Lemon 5L' : 'General Cleaning Gedung',
            kanal: b[0], url: '', at: saat(-(i + 2), '12:00'), createdAt: saat(-(i + 2), '12:00') });
        }
      });
    })();

    /* ================================================================ KEAMANAN AKUN
       PIN dipasang untuk persona yang memegang uang (mitra lapangan & mitra
       toko). Akun contoh memakai PIN yang sama supaya mudah dicoba — nilainya
       tetap disimpan sebagai turunan PBKDF2, bukan angka polos.

       Perangkat browser yang sedang dipakai langsung dipercaya untuk semua
       akun contoh, supaya mencoba aplikasi tidak terhalang verifikasi. Alur
       perangkat barunya bisa dicoba lewat tombol simulasi di Profil → Keamanan. */
    var PIN_CONTOH = '246813';
    var kodeIni = KEAMANAN.idPerangkat();

    s.users.forEach(function (u) {
      if (['worker', 'seller'].indexOf(u.role) < 0) return;
      var t = KRIPTO.turunkan(PIN_CONTOH);
      u.pin = { garam: t.garam, hash: t.hash, putaran: t.putaran,
        dibuatAt: u.daftarAt || u.createdAt, diubahAt: u.daftarAt || u.createdAt };
      u.pinGagal = 0; u.pinKunciSampai = null;
    });

    s.users.forEach(function (u) {
      if (!u.aktif) return;
      s.perangkat.push({
        id: U.uid('per'), userId: u.id, kode: kodeIni,
        nama: KEAMANAN.namaPerangkat(), ua: (navigator.userAgent || '').slice(0, 180),
        dipercayaAt: u.createdAt, terakhirAt: U.nowISO(), aktif: true,
        catatan: 'perangkat pertama', createdAt: u.createdAt
      });
    });

    /* Agus dipakai sebagai contoh akun yang authenticator-nya sudah aktif,
       lengkap dengan satu perangkat lain yang pernah dipercaya. */
    (function () {
      var agus = s.users.filter(function (u) { return u.id === 'u_w1'; })[0];
      if (!agus) return;
      var pulih = [];
      ['A3K9-P2MT', 'R7XQ-4BND', 'H2VC-9JLW', 'K8ZP-3RTY'].forEach(function (k) {
        var t = KRIPTO.turunkan(KRIPTO.normalKode(k), null, 2000);
        pulih.push({ h: t, dipakaiAt: null });
      });
      agus.auth = {
        aktif: true, rahasia: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
        dipasangAt: saat(-45, '19:20'), terakhirAt: saat(-3, '08:12'),
        pemulihan: pulih,
        /* Penanda akun contoh: layar verifikasi menampilkan kode berjalan
           supaya alurnya bisa dicoba tanpa memasang aplikasi authenticator.
           Akun yang dipasang lewat aplikasi tidak pernah punya penanda ini. */
        demo: true
      };
      s.perangkat.push({
        id: U.uid('per'), userId: 'u_w1', kode: 'dev_contoh_hp_agus',
        nama: 'Chrome di Android', ua: 'Mozilla/5.0 (Linux; Android 13)',
        dipercayaAt: saat(-45, '19:22'), terakhirAt: saat(-3, '08:12'), aktif: true,
        catatan: 'diverifikasi authenticator', createdAt: saat(-45, '19:22')
      });
      [['Memasang authenticator', 'ok', saat(-45, '19:20'), ''],
       ['Perangkat dipercaya', 'ok', saat(-45, '19:22'), 'Chrome di Android'],
       ['Membuat PIN transaksi', 'ok', saat(-60, '10:05'), ''],
       ['Kata sandi salah saat masuk', 'gagal', saat(-9, '22:41'), 'Chrome di Android'],
       ['Mengajukan penarikan', 'ok', saat(-18, '20:14'), 'Rp' + '600.000']
      ].forEach(function (l) {
        s.keamananLog.push({ id: U.uid('sec'), userId: 'u_w1', aksi: l[0], hasil: l[1],
          kode: kodeIni, perangkat: l[3] || KEAMANAN.namaPerangkat(), ket: l[3] || '',
          at: l[2], createdAt: l[2] });
      });
    })();

    /* ================================================================ MARKETPLACE
       Mitra Toko: penjual pihak ketiga yang menitipkan produknya di aplikasi.
       Produk tanpa sellerId tetap milik Toko Resmi EXOCLEAN. */

    s.settings.marketplace = JSON.parse(JSON.stringify(SELLER.BAWAAN));

    var TOKO = [
      { id: 'u_s1', nama: 'Budi Hermawan', email: 'budi@bersihjaya.co.id', telp: '081377790001',
        toko: { nama: 'Bersih Jaya Supply', deskripsi: 'Distributor chemical dan alat kebersihan sejak 2015. ' +
            'Melayani gedung, hotel, dan rumah sakit di Jabodetabek & Bandung.',
          kota: 'Bandung', alamatGudang: 'Jl. Soekarno Hatta No. 412, Gudang B3, Bandung',
          telpToko: '022-7654321', kategoriUtama: 'Chemical Pembersih', status: 'aktif',
          koordinat: { lat: -6.943000, lng: 107.635000 },
          saldoIklan: 750000 }, sejak: 400 },
      { id: 'u_s2', nama: 'Maria Tanuwijaya', email: 'maria@mitrahigienis.com', telp: '081377790002',
        toko: { nama: 'Mitra Higienis Indonesia', deskripsi: 'Spesialis mesin kebersihan dan APD ' +
            'bersertifikat. Garansi resmi dan layanan servis.',
          kota: 'Surabaya', alamatGudang: 'Jl. Rungkut Industri III No. 27, Surabaya',
          telpToko: '031-8412300', kategoriUtama: 'Mesin & Peralatan', status: 'aktif',
          koordinat: { lat: -7.332000, lng: 112.766000 },
          saldoIklan: 1250000 }, sejak: 260 },
      { id: 'u_s3', nama: 'Rizky Ananda', email: 'rizky.ananda@gmail.com', telp: '081377790003',
        toko: { nama: 'Sinar Alat Kebersihan', deskripsi: 'Toko alat kebersihan rumah tangga dan ruko. ' +
            'Harga grosir untuk pembelian di atas 10 pcs.',
          kota: 'Bekasi', alamatGudang: 'Ruko Harapan Indah Blok C No. 8, Bekasi',
          telpToko: '021-88990011', kategoriUtama: 'Alat Kebersihan', status: 'verifikasi',
          koordinat: { lat: -6.172000, lng: 106.980000 },
          saldoIklan: 0 }, sejak: 5 }
    ];

    TOKO.forEach(function (t, i) {
      s.users.push({
        id: t.id, role: 'seller', nama: t.nama, email: t.email, pass: '123456', telp: t.telp,
        aktif: true, foto: null, alamatList: [], createdAt: saat(-t.sejak, '10:00'),
        preferensi: { bahasa: BAHASA_BAWAAN, notifWA: true, notifEmail: true, ringkasanMingguan: true },
        /* `cod` menentukan apakah toko ini muncul pada saringan COD di
           katalog. Dibuat berbeda antar toko supaya saringannya benar-benar
           memisahkan sesuatu, bukan meloloskan semuanya. */
        toko: Object.assign({ bergabungAt: t.toko.status === 'aktif' ? saat(-(t.sejak - 7), '09:00') : null,
          cod: i !== 1 }, t.toko),
        rekening: [{ id: U.uid('rek'), bank: ['BCA', 'Mandiri', 'BNI'][i],
          nomor: ['5271884400', '1290077665544', '0887711223'][i], atasNama: t.toko.nama, utama: true }],
        identitas: { jenis: 'ktp', nomor: ['3273041205850012', '3578062807880021', '3275031109940007'][i],
          namaSesuaiKartu: t.nama, tanggalLahir: ['1985-05-12', '1988-07-28', '1994-09-11'][i],
          berlakuHingga: '', alamatKtp: t.toko.alamatGudang, fotoDepan: null, fotoSelfie: null,
          diverifikasi: t.toko.status === 'aktif' },
        kontakDarurat: [{ id: U.uid('kd'), nama: ['Sari Hermawan', 'Andreas Tanuwijaya', 'Dewi Ananda'][i],
          hubungan: ['Istri', 'Saudara Kandung', 'Orang Tua'][i],
          telp: ['081355590011', '081355590021', '081355590031'][i], utama: true }],
        alamatTinggal: { alamat: t.toko.alamatGudang, rt: '', rw: '', kelurahan: '', kecamatan: '',
          kota: t.toko.kota, provinsi: ['Jawa Barat', 'Jawa Timur', 'Jawa Barat'][i], kodePos: '',
          status: 'Milik sendiri', sejak: '', samaDenganKtp: true, patokan: '' }
      });
    });

    /* ---- produk milik mitra toko ---- */
    var PRODUK_MITRA = [
      ['u_s1', 'BJ-CHM-01', 'Chemical Pembersih', 'Floor Cleaner Pine 20L (Jerigen Besar)', 'BersihPro',
        295000, 'jerigen', 24, 6, '🧴', 'Hemat untuk gedung. Pengenceran 1:40, aroma pinus tahan lama.', 'aktif'],
      ['u_s1', 'BJ-CHM-02', 'Chemical Pembersih', 'Glass Cleaner Siap Pakai 1L (isi 12)', 'BersihPro',
        168000, 'dus', 40, 10, '🪟', 'Botol semprot siap pakai, tanpa perlu diencerkan.', 'aktif'],
      ['u_s1', 'BJ-CHM-03', 'Chemical Pembersih', 'Descaler Kerak Kamar Mandi 5L', 'BersihPro',
        195000, 'jerigen', 18, 5, '🚿', 'Melarutkan kerak air dan lumut pada keramik & kloset.', 'aktif'],
      ['u_s1', 'BJ-ALT-01', 'Alat Kebersihan', 'Mop Flat Microfiber Set Profesional', 'BersihPro',
        275000, 'set', 30, 8, '🧹', 'Gagang aluminium, 3 kain microfiber cadangan, ember pemeras.', 'aktif'],
      ['u_s1', 'BJ-AKS-01', 'Aksesoris', 'Sarung Tangan Nitrile Panjang 45cm (isi 10)', 'BersihPro',
        142000, 'pak', 55, 12, '🧤', 'Tahan chemical kuat, panjang sampai siku.', 'aktif'],

      ['u_s2', 'MH-MSN-01', 'Mesin & Peralatan', 'Wet & Dry Vacuum 60L Industrial', 'HigienPro',
        7850000, 'unit', 6, 2, '🌀', 'Daya 2400W, tangki stainless 60L, garansi resmi 2 tahun.', 'aktif'],
      ['u_s2', 'MH-MSN-02', 'Mesin & Peralatan', 'Scrubber Dryer Walk Behind 50cm', 'HigienPro',
        24500000, 'unit', 2, 1, '⚙️', 'Cuci dan keringkan lantai sekaligus. Cocok gedung & mall.', 'aktif'],
      ['u_s2', 'MH-APD-01', 'APD & Keselamatan Kerja', 'Full Body Harness CE + Lanyard Ganda', 'SafeGrip',
        1875000, 'set', 12, 4, '🦺', 'Sertifikat CE EN361, lanyard ganda dengan absorber.', 'aktif'],
      ['u_s2', 'MH-APD-02', 'APD & Keselamatan Kerja', 'Helm Safety Ventilasi + Chin Strap (isi 6)', 'SafeGrip',
        720000, 'pak', 20, 5, '⛑️', 'Standar SNI & ANSI, berventilasi, tali dagu 4 titik.', 'aktif'],
      ['u_s2', 'MH-MSN-03', 'Mesin & Peralatan', 'Blower Karpet 3 Kecepatan Stackable', 'HigienPro',
        1680000, 'unit', 9, 3, '💨', 'Bisa ditumpuk, hemat tempat penyimpanan.', 'menunggu']
    ];

    PRODUK_MITRA.forEach(function (r, i) {
      s.products.push({
        id: 'prd_' + r[1], kode: r[1], sellerId: r[0], kategori: r[2], nama: r[3], merek: r[4],
        harga: r[5], satuan: r[6], stok: r[7], minStok: r[8], icon: r[9], deskripsi: r[10],
        statusProduk: r[11], aktif: r[11] === 'aktif', urutan: 200 + i,
        beratGram: dataKirim({ kode: r[1], satuan: r[6] }).beratGram,
        dimensi: dataKirim({ kode: r[1], satuan: r[6] }).dimensi,
        moderasi: r[11] === 'aktif' ? { oleh: 'u_admin', at: saat(-120, '11:00'), hasil: 'aktif', alasan: '' } : null,
        createdAt: saat(-130 + i * 3, '09:00')
      });
    });

    /* ---- sifat produk yang dipakai filter katalog ----------------------
       Kondisi dan preorder diisi untuk SELURUH produk, bukan hanya sebagian:
       produk tanpa kondisi akan dianggap baru saat disaring, dan itu benar —
       tetapi menuliskannya membuat kolomnya terlihat di formulir dan tidak
       tampak kosong seperti kolom yang lupa diisi.

       Yang ditandai bekas dan preorder adalah mesin: mesin bekas memang
       diperjualbelikan, dan mesin besar memang lazim dibuat setelah ada
       pesanan. */
    s.products.forEach(function (p) {
      if (p.tipe === 'layanan') return;
      p.kondisi = 'baru';
      p.preorder = false;
    });
    ['prd_MH-MSN-01', 'prd_MH-MSN-03'].forEach(function (id) {
      var p = s.products.filter(function (x) { return x.id === id; })[0];
      if (p) p.kondisi = 'bekas';
    });
    s.products.forEach(function (p) {
      if (p.kategori === 'Mesin & Peralatan' && p.harga >= 1500000) p.preorder = true;
    });

    /* ---- katalog voucher ----------------------------------------------
       Empat jenis sekaligus supaya seluruh alur bisa dicoba sejak awal.
       Nilainya contoh; super admin bebas mengubah semuanya di menu Voucher. */
    [
      { nama: 'Voucher Belanja Rp100.000', jenis: 'nilai', ic: '💳',
        deskripsi: 'Kartu hadiah untuk belanja jasa maupun produk.',
        nilai: 100000, hargaJual: 100000, hargaPoin: 1000,
        lingkup: 'semua', masaBerlakuHari: 180, kuota: 0 },
      { nama: 'Voucher Belanja Rp250.000', jenis: 'nilai', ic: '💳',
        deskripsi: 'Cocok untuk hadiah kolega dan pelanggan korporat.',
        nilai: 250000, hargaJual: 250000, hargaPoin: 2400,
        lingkup: 'semua', masaBerlakuHari: 180, kuota: 0 },
      { nama: 'Diskon 20% Jasa Kebersihan', jenis: 'diskon', ic: '🏷️',
        deskripsi: 'Potongan 20% untuk satu pekerjaan, maksimal Rp200.000.',
        persen: 20, maks: 200000, minBelanja: 300000, hargaJual: 0, hargaPoin: 800,
        lingkup: 'jasa', masaBerlakuHari: 90, kuota: 0 },
      { nama: 'Diskon 15% Toko Perlengkapan', jenis: 'diskon', ic: '🏷️',
        deskripsi: 'Potongan 15% belanja produk, maksimal Rp150.000.',
        persen: 15, maks: 150000, minBelanja: 200000, hargaJual: 50000, hargaPoin: 600,
        lingkup: 'toko', masaBerlakuHari: 90, kuota: 0 },
      { nama: 'Tiket Undian Berhadiah', jenis: 'undian', ic: '🎰',
        deskripsi: 'Ikut undian bulanan. Semakin banyak tiket, semakin besar peluang.',
        hadiah: 'Saldo tunai Rp2.500.000', nilaiHadiah: 2500000,
        hargaJual: 25000, hargaPoin: 250, masaBerlakuHari: 60, kuota: 500,
        bolehHadiah: false },
      { nama: 'Gratis Pelatihan & Sertifikasi', jenis: 'pelatihan', ic: '🎓',
        deskripsi: 'Membuka satu kursus di LMS beserta ujian sertifikasinya.',
        kursusId: null, hargaJual: 350000, hargaPoin: 3000,
        masaBerlakuHari: 365, kuota: 0 }
    ].forEach(function (v, i) {
      /* Voucher pelatihan diarahkan ke kursus pertama yang tersedia — tanpa
         kursus, jenis ini tidak punya makna. */
      if (v.jenis === 'pelatihan' && s.kursus.length) v.kursusId = s.kursus[0].id;
      s.voucherProduk.push(Object.assign({
        id: 'vpr' + (i + 1), urutan: i, aktif: true, bolehHadiah: v.bolehHadiah !== false,
        nilai: 0, persen: 0, maks: 0, minBelanja: 0, kursusId: null,
        hadiah: '', nilaiHadiah: 0, createdAt: U.nowISO()
      }, v));
    });

    /* ---- kampanye / event ---- */
    s.counters.kampanye = 2;
    s.kampanye.push({ id: 'kmp1', no: U.docNo('EVT', 1), nama: 'Flash Sale Awal Bulan',
      tipe: 'flash_sale', deskripsi: 'Diskon kilat 15% untuk chemical & alat pilihan selama 5 hari.',
      diskonPersen: 15, tanggunganSeller: 60, tanggunganExoclean: 40,
      mulai: hari(-2), selesai: hari(3), aktif: true, warna: '#C2410C', ikon: '⚡',
      produk: ['prd_BJ-CHM-01', 'prd_BJ-ALT-01', 'prd_CHM-01', 'prd_ALT-02'],
      createdAt: saat(-10, '09:00') });
    s.kampanye.push({ id: 'kmp2', no: U.docNo('EVT', 2), nama: 'Gratis Ongkir Akhir Bulan',
      tipe: 'gratis_ongkir', deskripsi: 'Ongkos kirim ditanggung bersama untuk belanja di atas Rp500.000.',
      diskonPersen: 0, tanggunganSeller: 50, tanggunganExoclean: 50,
      mulai: hari(12), selesai: hari(20), aktif: true, warna: '#14958A', ikon: '🚚',
      produk: [], createdAt: saat(-4, '10:00') });

    /* ---- iklan ---- */
    s.counters.iklan = 3;
    s.iklan.push({ id: 'ads1', no: U.docNo('ADS', 1), sellerId: 'u_s1', tipe: 'produk_sorot',
      produkId: 'prd_BJ-CHM-01', kategori: null, judul: 'Floor Cleaner Pine 20L',
      anggaranTotal: 500000, anggaranHarian: 50000, mulai: hari(-14), selesai: hari(16),
      tarif: 1500, model: 'klik', status: 'berjalan', tayang: 1842, klik: 118, terpakai: 177000,
      konversi: 9, createdAt: saat(-14, '10:00') });
    s.iklan.push({ id: 'ads2', no: U.docNo('ADS', 2), sellerId: 'u_s2', tipe: 'sponsor_kategori',
      produkId: 'prd_MH-MSN-01', kategori: 'Mesin & Peralatan', judul: 'Vacuum 60L Industrial',
      anggaranTotal: 1000000, anggaranHarian: 100000, mulai: hari(-9), selesai: hari(21),
      tarif: 2000, model: 'klik', status: 'berjalan', tayang: 964, klik: 73, terpakai: 146000,
      konversi: 4, createdAt: saat(-9, '14:00') });
    s.iklan.push({ id: 'ads3', no: U.docNo('ADS', 3), sellerId: 'u_s2', tipe: 'banner_beranda',
      produkId: null, kategori: null, judul: 'Mesin Kebersihan Bergaransi Resmi',
      anggaranTotal: 1050000, anggaranHarian: 150000, mulai: hari(-3), selesai: hari(4),
      tarif: 150000, model: 'harian', status: 'berjalan', tayang: 612, klik: 41, terpakai: 450000,
      konversi: 3, createdAt: saat(-3, '08:00') });

    /* ---- pesanan ke mitra toko ---- */
    function pesananMitra(id, sellerId, clientId, items, status, hariLalu) {
      var brs = items.map(function (x) {
        var pr = s.products.filter(function (p) { return p.kode === x[0]; })[0];
        return { productId: pr.id, qty: x[1], harga: pr.harga };
      });
      var sub = brs.reduce(function (a, i) { return a + i.qty * i.harga; }, 0);
      var ongkir = sub >= 2000000 ? 0 : 50000;
      var so = {
        id: id, no: U.docNo('TKO', ++s.counters.shop), sellerId: sellerId, clientId: clientId,
        status: status, items: brs, ongkir: ongkir, biayaKurir: ongkir ? 38000 : 0,
        ppn: 11, diskon: 0, subtotal: sub,
        total: Math.round(sub + sub * 0.11 + ongkir),
        alamatKirim: (s.users.filter(function (u) { return u.id === clientId; })[0] || {}).alamat || '',
        metodeBayar: 'BCA Virtual Account', channelId: 'va_bca', catatan: '',
        kurir: 'JNE Reguler', resi: 'JNE' + (77120000 + Math.round(sub / 1000)),
        createdAt: saat(-hariLalu, '10:30')
      };
      if (['dikonfirmasi', 'dikemas', 'dikirim', 'selesai'].indexOf(status) >= 0)
        so.dikonfirmasiAt = saat(-hariLalu + 0.2, '13:00');
      if (['dikirim', 'selesai'].indexOf(status) >= 0) so.dikirimAt = saat(-(hariLalu - 1), '09:00');
      if (status === 'selesai') so.selesaiAt = saat(-(hariLalu - 3), '15:00');
      s.shopOrders.push(so);
    }
    pesananMitra('msh1', 'u_s1', 'u_c1', [['BJ-CHM-01', 4], ['BJ-AKS-01', 3]], 'selesai', 24);
    pesananMitra('msh2', 'u_s1', 'u_c3', [['BJ-CHM-03', 3], ['BJ-CHM-02', 2]], 'selesai', 15);
    pesananMitra('msh3', 'u_s2', 'u_c1', [['MH-APD-01', 2]], 'selesai', 11);
    pesananMitra('msh4', 'u_s1', 'u_c2', [['BJ-ALT-01', 2]], 'dikirim', 2);
    pesananMitra('msh5', 'u_s2', 'u_c3', [['MH-APD-02', 1]], 'baru', 0);

    /* ---- riwayat pencairan penjual ---- */
    s.counters.sellerPayout = 1;
    (function () {
      var r1 = SELLER.rincianPesanan('msh1');
      s.sellerPayouts.push({ id: 'scr1', no: U.docNo('CAIR', 1), sellerId: 'u_s1',
        orderIds: ['msh1'], rincian: [r1], jumlahKotor: r1.diterimaSeller,
        biaya: 5000, jumlahBersih: r1.diterimaSeller - 5000,
        rekening: { bank: 'BCA', nomor: '5271884400', atasNama: 'Bersih Jaya Supply' },
        status: 'dibayar', diajukanAt: saat(-19, '09:00'), diprosesAt: saat(-19, '11:00'),
        dibayarAt: saat(-18, '14:00'), dibayarOleh: 'u_admin', refTransfer: 'TRF/CAIR/44120',
        catatan: '', createdAt: saat(-19, '09:00') });
    })();

    /* Peran bawaan tinggal di js/peran-bawaan.js — MCS EXOCLEAN memakai
       daftar yang persis sama tanpa ikut membawa benih pasar. */
    PERAN_BAWAAN.pasang(s);

    /* pasang peran ke pegawai yang sudah ada */
    s.users.forEach(function (u) {
      if (u.id === 'u_admin') u.roleId = 'rol_SUPER';
      else if (u.id === 'u_spv1') u.roleId = 'rol_SPV-SR';
      else if (u.id === 'u_spv2') u.roleId = 'rol_SPV';
      if (['admin', 'supervisor'].indexOf(u.role) >= 0) {
        u.izinTambahan = u.izinTambahan || [];
        u.izinDicabut = u.izinDicabut || [];
      }
    });

    /* beberapa staf tambahan supaya pembagian perannya terlihat nyata */
    [['u_adm2', 'Sari Melati', 'Admin Keuangan', 'sari.k@exoclean.id', '081234567004', 'rol_ADM-KEU'],
     ['u_adm3', 'Bayu Pratama', 'Admin Pemasaran', 'bayu.m@exoclean.id', '081234567005', 'rol_ADM-MKT'],
     ['u_adm4', 'Indah Permata', 'Admin Marketplace', 'indah.mp@exoclean.id', '081234567006', 'rol_ADM-MP']
    ].forEach(function (r, i) {
      s.users.push({
        id: r[0], role: 'admin', nama: r[1], jabatan: r[2], email: r[3], pass: '123456',
        telp: r[4], roleId: r[5], izinTambahan: [], izinDicabut: [],
        aktif: true, foto: null, alamatList: [], rekening: [],
        preferensi: { bahasa: BAHASA_BAWAAN, notifWA: true, notifEmail: true, ringkasanMingguan: true },
        createdAt: saat(-(200 - i * 30), '09:00')
      });
    });

    /* ---- verifikasi akun contoh ----
       Dijalankan paling akhir supaya pengguna yang ditambahkan di bagian mana
       pun sebelumnya (penjual, staf peran akses) ikut tercakup. */
    s.users.forEach(function (u) {
      u.emailVerifiedAt = u.emailVerifiedAt || u.createdAt || saat(-200, '09:00');
      u.telpVerifiedAt = u.telpVerifiedAt || u.createdAt || saat(-200, '09:00');
      u.sosial = u.sosial || [];
      u.metodeDaftar = u.metodeDaftar || 'email';
    });

    /* ---- log aktivitas ---- */
    s.activity.push({ id: U.uid('act'), actorId: 'u_admin', aksi: 'Mengirim penawaran ' + s.quotations[0].no,
      refType: 'quotation', refId: 'q1', at: saat(-3, '16:20') });
    s.activity.push({ id: U.uid('act'), actorId: 'u_spv1', aksi: 'Memverifikasi hasil kerja ORD/0001',
      refType: 'order', refId: 'o1', at: saat(-7, '15:40') });
    s.activity.push({ id: U.uid('act'), actorId: 'u_c3', aksi: 'Mengajukan komplain untuk ORD/0003',
      refType: 'complaint', refId: 'cp1', at: saat(0, '08:20') });

    /* Data contoh sisi jasa hanya masuk akal bila layanan yang dirujuknya
       ADA. Syaratnya bukan "katalog kosong" — itu keliru dan sudah pernah
       menipu: begitu satu layanan baru ditambahkan ke katalog, pembersihnya
       berhenti berjalan dan dua puluh empat pekerjaan contoh kembali dengan
       serviceIds yang menunjuk layanan lama yang sudah dihapus, checklist
       kosong, dan invoice atas pekerjaan yang tidak bisa dijelaskan.

       Yang benar: bersihkan bila ADA pekerjaan contoh yang layanannya tidak
       ada. Aturan ini memperbaiki dirinya sendiri — kalau suatu saat katalog
       lama dipasang kembali, data contohnya ikut hidup lagi. */
    if (adaPekerjaanYatim(s)) bersihkanSisiJasa(s);

    return s;
  }

  /**
   * Adakah pekerjaan contoh yang menunjuk layanan yang tidak ada?
   *
   * Satu saja sudah cukup: rantainya saling terkait — invoice menempel pada
   * pekerjaan, bagi hasil menghitung pekerjaan, QC memverifikasinya. Menyisakan
   * sebagian berarti menyisakan catatan yang tidak bisa dijelaskan.
   */
  function adaPekerjaanYatim(s) {
    var ada = {};
    (s.services || []).forEach(function (x) { ada[x.id] = 1; });
    return (s.orders || []).some(function (o) {
      return (o.serviceIds || []).some(function (id) { return !ada[id]; });
    });
  }

  /* Membuang seluruh rantai transaksi jasa dari data contoh, dan HANYA sisi
     jasa — invoice, pembayaran, dan komisi milik toko tetap berdiri. */
  function bersihkanSisiJasa(s) {
    var mati = {};
    function tandai(arr) { (arr || []).forEach(function (x) { if (x && x.id) mati[x.id] = 1; }); }

    var invJasa = (s.invoices || []).filter(function (i) { return !i.shopOrderId; });
    var idInvJasa = {};
    invJasa.forEach(function (i) { idInvJasa[i.id] = 1; });

    var idKomisiJasa = {};
    (s.komisi || []).forEach(function (k) { if (idInvJasa[k.refId]) idKomisiJasa[k.id] = 1; });

    tandai(s.bookings); tandai(s.quotations); tandai(s.orders); tandai(s.attendance);
    tandai(s.reports); tandai(s.qc); tandai(invJasa); tandai(s.ratings);
    tandai(s.complaints); tandai(s.payouts); tandai(s.penarikan);

    ['bookings', 'quotations', 'orders', 'attendance', 'reports', 'qc',
     'ratings', 'complaints', 'payouts', 'penarikan'].forEach(function (t) {
      if (s[t]) s[t] = [];
    });

    s.invoices = (s.invoices || []).filter(function (i) { return !!i.shopOrderId; });
    s.paytx = (s.paytx || []).filter(function (t) { return !idInvJasa[t.invoiceId]; });
    s.komisi = (s.komisi || []).filter(function (k) { return !idKomisiJasa[k.id]; });

    s.mutasi = (s.mutasi || []).filter(function (m) {
      if (m.refType === 'payout' || m.refType === 'penarikan') return false;
      if (m.refType === 'komisi' && idKomisiJasa[m.refId]) return false;
      return true;
    });

    /* saldoSetelah adalah saldo berjalan. Setelah baris dibuang angka itu
       berbohong, jadi dihitung ulang urut waktu per pengguna. */
    var perUser = {};
    s.mutasi.forEach(function (m) { (perUser[m.userId] = perUser[m.userId] || []).push(m); });
    Object.keys(perUser).forEach(function (uid) {
      var saldo = 0;
      perUser[uid].sort(function (a, b) {
        return new Date(a.at || a.createdAt) - new Date(b.at || b.createdAt);
      }).forEach(function (m) { saldo += (m.jumlah || 0); m.saldoSetelah = saldo; });
    });

    function hidup(r) { return !(r.refId && mati[r.refId]); }
    ['waOutbox', 'emailOutbox', 'activity', 'activities', 'berbagi'].forEach(function (t) {
      if (s[t]) s[t] = s[t].filter(hidup);
    });

    /* Prospek CRM tetap hidup — orangnya nyata; yang tidak berlaku lagi
       hanyalah penandaan layanan yang ia butuhkan. */
    (s.leads || []).forEach(function (l) { if (Array.isArray(l.kebutuhan)) l.kebutuhan = []; });

    if (s.photos && !Array.isArray(s.photos)) {
      Object.keys(s.photos).forEach(function (k) {
        var p = s.photos[k];
        if (p && p.refId && mati[p.refId]) delete s.photos[k];
      });
    }
  }

  return { apply: apply, SERVICES: SERVICES, PAKET: PAKET, PRODUK: PRODUK, foto: foto };
})();
