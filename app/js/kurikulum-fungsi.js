/* ==========================================================================
   kurikulum-fungsi.js — kursus sertifikasi per FUNGSI KERJA
   --------------------------------------------------------------------------
   Lima kursus wajib di kurikulum.js membuat seseorang menjadi mitra. Kursus
   di berkas ini berbeda perannya: masing-masing membuka SATU fungsi kerja.
   Mitra memilih sendiri fungsi kerja yang ia inginkan, lalu wajib lulus
   kursus pembukanya sebelum boleh menerima penugasan di layanan tersebut.

   Nilai minimum sengaja lebih tinggi daripada kursus wajib (85–90), dan masa
   berlakunya lebih pendek untuk pekerjaan berisiko — kompetensi teknis lebih
   cepat usang daripada pemahaman dasar.
   ========================================================================== */
var KURIKULUM_FUNGSI = (function () {

  /* Pintasan penulisan materi & soal, sama bentuknya dengan kurikulum.js */
  function m(judul, isi) { return { judul: judul, isi: isi }; }
  function s(soal, pilihan, jawaban, bahas) {
    return { soal: soal, pilihan: pilihan, jawaban: jawaban, bahas: bahas };
  }

  var KURSUS = [
    /* ================================================================ CLEANING */
    { kode: 'FK-CLEAN', judul: 'Sertifikasi Cleaning Service Profesional', ikon: '🧹',
      wajib: false, fungsi: true, urutan: 20, durasiMenit: 30, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Standar pembersihan ruangan, toilet, dapur, dan peralatan rumah tangga.',
      materi: [
        m('Urutan yang tidak boleh dibalik',
          'Aturan pertama pembersihan: <b>dari atas ke bawah, dari kering ke basah, dari bersih ke ' +
          'kotor</b>. Membalik urutan berarti mengotori ulang area yang sudah selesai.\n\n' +
          'Contoh nyata di kamar mandi: bersihkan langit-langit dan dinding atas dulu, baru wastafel, ' +
          'kloset terakhir, lantai paling akhir. Mengepel lantai sebelum menyikat kloset membuat ' +
          'pekerjaan Anda terhitung dua kali.\n\n' +
          'Di dapur, sisi yang paling kotor — kompor dan hood — dikerjakan setelah rak dan keramik ' +
          'belakang, supaya minyak yang jatuh tidak mengenai area bersih.'),
        m('Kloset, urinoir, dan bath tube',
          'Kloset memerlukan chemical <b>asam</b> (toilet bowl cleaner) untuk kerak urin dan kapur. ' +
          'Bath tube dan wastafel akrilik <b>tidak boleh</b> disikat dengan chemical asam pekat atau ' +
          'sikat kawat — permukaannya akan buram permanen dan itu menjadi tanggungan EXOCLEAN.\n\n' +
          'Urutan kloset: siram → tuang chemical ke dinding dalam → diamkan 5–10 menit agar bereaksi → ' +
          'sikat → siram. Menyikat sebelum chemical bereaksi hanya membuang tenaga.\n\n' +
          'Urinoir: periksa saringan bawahnya. Bau yang tidak hilang setelah dibersihkan hampir selalu ' +
          'berasal dari saringan yang tersumbat, bukan dari permukaan.'),
        m('Kulkas, freezer, dan steam cleaning',
          'Kulkas <b>wajib dicabut dari listrik</b> sebelum dibersihkan, dan isinya dipindahkan ke ' +
          'wadah terpisah milik klien. Jangan pernah memakai chemical berbau tajam di dalam kulkas — ' +
          'baunya menempel ke makanan. Pakai air hangat dan larutan food grade.\n\n' +
          'Untuk bunga es pada freezer, <b>jangan dicungkil</b> dengan benda tajam; itu penyebab ' +
          'kebocoran freon paling sering. Cairkan dengan air hangat dan tunggu.\n\n' +
          'Steam cleaning bekerja pada suhu tinggi. Jaga jarak nozzle dari permukaan cat, stiker, dan ' +
          'karet pintu, dan jangan arahkan uap ke sambungan listrik.'),
        m('Serah terima pekerjaan',
          'Pekerjaan belum selesai saat area bersih — pekerjaan selesai saat <b>klien melihat dan ' +
          'setuju</b>. Ajak klien berkeliling, tunjukkan area yang dikerjakan, dan sampaikan apa yang ' +
          'tidak bisa dihilangkan beserta alasannya (mis. noda yang sudah meresap ke pori keramik).\n\n' +
          'Foto sebelum dan sesudah diambil dari <b>sudut yang sama</b>. Foto dari sudut berbeda tidak ' +
          'bisa dipakai membuktikan hasil kerja bila nanti ada komplain.')
      ],
      kuis: [
        s('Anda membersihkan kamar mandi. Mana urutan yang benar?',
          ['Lantai → kloset → dinding', 'Kloset → lantai → dinding',
           'Dinding atas → wastafel → kloset → lantai', 'Wastafel → lantai → dinding → kloset'], 2,
          'Dari atas ke bawah dan dari bersih ke kotor, sehingga area yang sudah selesai tidak terkotori ulang.'),
        s('Klien meminta bath tube akriliknya disikat dengan chemical asam pekat agar cepat kinclong. Sikap yang benar?',
          ['Turuti karena klien yang menanggung', 'Tolak dan jelaskan risikonya, tawarkan chemical yang sesuai',
           'Kerjakan setengah bagian dulu sebagai contoh', 'Kerjakan dengan sikat kawat agar lebih cepat'], 1,
          'Akrilik akan buram permanen. Kerusakan permukaan menjadi tanggungan EXOCLEAN, bukan klien.'),
        s('Bunga es tebal di freezer sebaiknya…',
          ['Dicungkil dengan obeng agar cepat', 'Disiram air panas mendidih langsung',
           'Dicairkan dengan air hangat dan ditunggu', 'Dipukul perlahan sampai retak'], 2,
          'Mencungkil bunga es adalah penyebab kebocoran freon paling sering pada pekerjaan pembersihan kulkas.'),
        s('Foto sebelum dan sesudah harus diambil…', ['Dari sudut yang sama', 'Sebanyak mungkin dari segala sudut',
          'Hanya sesudah saja bila hasilnya bagus', 'Dari jarak sedekat mungkin'], 0,
          'Sudut yang sama adalah satu-satunya cara foto tersebut membuktikan perubahan bila ada komplain.')
      ] },

    /* ================================================================ FURNITUR & TEKSTIL */
    { kode: 'FK-UPHOL', judul: 'Sertifikasi Cuci Furnitur & Tekstil', ikon: '🛋️',
      wajib: false, fungsi: true, urutan: 21, durasiMenit: 30, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Cuci kasur, sofa, karpet, gorden, dan vakum tungau tanpa merusak bahan.',
      materi: [
        m('Kenali bahan sebelum menyentuh chemical',
          'Kesalahan termahal di pekerjaan ini adalah menyemprot chemical sebelum tahu bahannya. ' +
          'Periksa <b>label perawatan</b> di balik bantalan atau jahitan bawah:\n\n' +
          '• <b>W</b> — boleh dengan bahan berbasis air\n' +
          '• <b>S</b> — hanya pelarut khusus, air akan meninggalkan lingkaran noda\n' +
          '• <b>WS</b> — boleh keduanya\n' +
          '• <b>X</b> — vakum saja, tidak boleh dibasahi sama sekali\n\n' +
          'Bila label hilang, <b>uji di area tersembunyi</b> lebih dulu — balik bantalan atau bagian ' +
          'belakang yang menempel dinding — dan tunggu sampai kering sebelum melanjutkan.'),
        m('Kasur, tungau, dan takaran air',
          'Musuh utama pada kasur bukan noda, melainkan <b>tungau dan sisa lembap</b>. Kasur yang ' +
          'dicuci terlalu basah akan berjamur di dalam busa dalam beberapa hari — kliennya tidak ' +
          'melihatnya hari itu, tetapi akan komplain seminggu kemudian.\n\n' +
          'Aturannya: <b>hisap dulu, baru basahi seperlunya, lalu hisap kembali sampai kering</b>. ' +
          'Hydro vacuum dipakai untuk mengangkat tungau dan debu halus; ia bukan pengganti pencucian, ' +
          'dan pencucian bukan pengganti dia.\n\n' +
          'Kasur dua sisi berarti dua kali pekerjaan dan dua kali waktu kering — pastikan itu tercatat ' +
          'di order, bukan dikerjakan diam-diam sebagai bonus.'),
        m('Karpet, gorden, dan boneka',
          'Karpet berbahan wol menyusut bila kena air panas. Pakai air dingin dan low foam shampoo, ' +
          'lalu keringkan dengan blower — bukan dijemur terlipat.\n\n' +
          'Gorden diukur <b>sebelum</b> dilepas dan difoto posisi kaitannya, supaya bisa dipasang ' +
          'kembali persis. Gorden lipatan (vitrase) memerlukan penanganan lebih hati-hati karena ' +
          'jahitan lipatannya mudah tertarik.\n\n' +
          'Boneka: periksa apakah ada bagian elektronik atau baterai di dalamnya sebelum dibasahi. ' +
          'Ini kelihatan sepele dan justru paling sering terlewat.'),
        m('Waktu kering adalah bagian dari layanan',
          'Klien menilai pekerjaan Anda dari <b>hasil setelah kering</b>, bukan saat masih basah. ' +
          'Sampaikan perkiraan waktu kering di akhir pekerjaan dan tuliskan di catatan lapangan:\n\n' +
          '• Sofa fabric: 4–6 jam dengan blower\n' +
          '• Kasur: 6–8 jam, jangan dipakai malam itu bila selesai sore\n' +
          '• Karpet tebal: 8–12 jam\n\n' +
          'Bila klien butuh dipakai malam itu juga, sampaikan lebih dulu bahwa hasilnya berisiko ' +
          'lembap dan berbau — jangan diamkan lalu menerima komplainnya.')
      ],
      kuis: [
        s('Label perawatan sofa bertanda "S". Artinya…',
          ['Boleh dicuci dengan air', 'Hanya boleh dengan pelarut khusus, bukan air',
           'Boleh keduanya', 'Cukup dijemur'], 1,
          'Kode S berarti solvent only. Air akan meninggalkan lingkaran noda yang sulit dihilangkan.'),
        s('Label sofa hilang dan Anda tidak yakin bahannya. Langkah yang benar?',
          ['Pakai chemical paling ringan langsung ke seluruh permukaan',
           'Uji di area tersembunyi dan tunggu kering dulu',
           'Tanya klien lalu ikuti tebakannya', 'Vakum saja dan tagih penuh'], 1,
          'Uji tersembunyi adalah satu-satunya cara memastikan tanpa merusak bagian yang terlihat.'),
        s('Kasur yang dicuci terlalu basah paling berisiko…',
          ['Warnanya pudar', 'Berjamur di dalam busa beberapa hari kemudian',
           'Menjadi keras', 'Kehilangan garansi pabrik'], 1,
          'Komplain jenis ini datang terlambat, saat mitra sudah lama meninggalkan lokasi.'),
        s('Sebelum melepas gorden untuk dicuci, yang wajib dilakukan adalah…',
          ['Menimbangnya', 'Mengukur dan memotret posisi kaitannya',
           'Mencucinya sebagian di tempat', 'Meminta klien melepas sendiri'], 1,
          'Tanpa foto posisi kait, pemasangan kembali hampir selalu meleset dan memicu komplain.')
      ] },

    /* ================================================================ POLES LANTAI */
    { kode: 'FK-POLES', judul: 'Sertifikasi Poles Lantai & Batu Alam', ikon: '✨',
      wajib: false, fungsi: true, urutan: 22, durasiMenit: 25, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Kristalisasi marmer, granit, dan traso dengan mesin poles.',
      materi: [
        m('Tiga batu, tiga perlakuan',
          '<b>Marmer</b> lunak dan bereaksi dengan asam — cuka, pembersih kamar mandi, bahkan air ' +
          'jeruk akan meninggalkan bekas kusam yang hanya bisa hilang dengan dipoles ulang.\n\n' +
          '<b>Granit</b> jauh lebih keras dan tahan asam, tetapi karena itu pula butuh pad dan powder ' +
          'yang lebih agresif untuk mengkilap.\n\n' +
          '<b>Traso</b> adalah campuran semen dan pecahan batu; permukaannya tidak seragam, sehingga ' +
          'hasil kilapnya tidak akan sesempurna marmer. Sampaikan ini ke klien <b>sebelum</b> mulai, ' +
          'bukan setelah selesai.'),
        m('Urutan grit dan kesabaran',
          'Poles bukan satu langkah. Urutannya dari pad kasar ke halus, dan <b>tidak boleh melompat</b>: ' +
          'goresan dari pad kasar hanya bisa dihilangkan oleh grit berikutnya secara berurutan.\n\n' +
          'Melompat dari grit kasar langsung ke powder kristalisasi menghasilkan lantai yang mengkilap ' +
          'tetapi <b>bergaris</b> — dan garisnya baru terlihat jelas ketika lampu dinyalakan malam hari.\n\n' +
          'Mesin dijalankan dengan gerakan tumpang tindih setengah lebar pad, kecepatan tetap. Berhenti ' +
          'terlalu lama di satu titik akan membakar permukaan.'),
        m('Keselamatan mesin poles',
          'Mesin poles menarik operatornya, bukan sebaliknya. Pegang dengan <b>kedua tangan</b>, kaki ' +
          'sedikit terbuka, dan pastikan kabel selalu di belakang — kabel yang terlindas pad adalah ' +
          'penyebab kejut listrik paling sering.\n\n' +
          'Area kerja wajib diberi rambu dan dibatasi. Lantai yang sedang dipoles jauh lebih licin ' +
          'daripada lantai basah biasa karena ada powder dan air sekaligus.\n\n' +
          'Cabut steker sebelum mengganti pad. Selalu.')
      ],
      kuis: [
        s('Klien menumpahkan air jeruk di lantai marmer yang baru dipoles. Yang terjadi…',
          ['Tidak apa-apa, marmer tahan asam', 'Timbul bekas kusam yang perlu dipoles ulang',
           'Lantai menjadi lebih mengkilap', 'Warnanya berubah permanen menjadi kuning'], 1,
          'Marmer bereaksi dengan asam. Ini alasan klien perlu diberi tahu cara merawat setelah pekerjaan selesai.'),
        s('Melompati urutan grit menghasilkan…',
          ['Hasil lebih cepat tanpa efek samping', 'Lantai mengkilap tetapi bergaris',
           'Lantai menjadi kasar', 'Powder terbuang lebih banyak'], 1,
          'Goresan pad kasar hanya hilang bila dilalui grit berikutnya secara berurutan.'),
        s('Sebelum mengganti pad mesin poles, yang wajib dilakukan adalah…',
          ['Mematikan tombol saja', 'Mencabut steker dari stopkontak',
           'Menunggu mesin dingin', 'Memiringkan mesin'], 1,
          'Mematikan tombol tidak memutus arus. Steker harus dicabut.')
      ] },

    /* ================================================================ PEST CONTROL */
    { kode: 'FK-PEST', judul: 'Sertifikasi Pest Control & Disinfektan', ikon: '🐛',
      wajib: false, fungsi: true, urutan: 23, durasiMenit: 35, nilaiMin: 90, masaBerlakuHari: 365,
      deskripsi: 'Penanganan hama dan penggunaan pestisida secara aman dan terukur.',
      materi: [
        m('Pekerjaan ini menyangkut racun',
          'Berbeda dari pekerjaan kebersihan lain, di sini Anda membawa <b>bahan beracun</b> ke rumah ' +
          'orang. Satu kesalahan takaran bisa berakibat pada anak, lansia, hewan peliharaan, atau ' +
          'makanan klien.\n\n' +
          'Tiga aturan yang tidak bisa ditawar:\n' +
          '1. <b>Takaran mengikuti label produk</b>, bukan perkiraan. Lebih pekat tidak berarti lebih ' +
          'efektif — hanya lebih beracun.\n' +
          '2. <b>Penghuni, hewan, dan makanan keluar dari area</b> sebelum aplikasi.\n' +
          '3. <b>Waktu aman masuk kembali</b> disampaikan tertulis ke klien, bukan lisan.\n\n' +
          'APD lengkap wajib: sarung tangan nitril, masker respirator, kacamata, dan pakaian panjang.'),
        m('Survei dulu, semprot kemudian',
          'Pest control yang benar dimulai dari <b>survei</b>, bukan dari penyemprotan. Yang dicari:\n\n' +
          '• Jalur masuk — celah pipa, ventilasi, bawah pintu\n' +
          '• Sumber air dan makanan — bocoran, sampah, remah\n' +
          '• Sarang — di balik kabinet, plafon, tumpukan kardus\n\n' +
          'Menyemprot tanpa menutup jalur masuk dan sumber makanan hanya menunda: hama akan kembali ' +
          'dalam hitungan minggu, dan klien akan menagih garansi. Rekomendasi perbaikan lingkungan ' +
          'adalah bagian dari laporan, bukan tambahan.'),
        m('Beda hama, beda metode',
          '<b>Rayap</b> — perlu injeksi tanah atau umpan (baiting), bukan semprot permukaan. Semprot ' +
          'permukaan pada rayap hanya membunuh yang terlihat dan membuat koloni pindah jalur.\n\n' +
          '<b>Kecoa</b> — gel baiting jauh lebih efektif daripada semprot, karena kecoa membawa racun ' +
          'kembali ke sarang.\n\n' +
          '<b>Tikus</b> — kombinasi umpan dan penutupan jalur. Bangkai wajib dicari dan diambil; ' +
          'bila tidak, klien akan menelepon karena bau.\n\n' +
          '<b>Nyamuk & lalat</b> — fogging hanya membunuh yang dewasa dan terbang saat itu. Tanpa ' +
          'menghilangkan genangan tempat bertelur, hasilnya hanya bertahan beberapa hari.\n\n' +
          '<b>Tawon</b> — pekerjaan berisiko sengatan massal; kerjakan pada malam hari saat koloni ' +
          'tidak aktif, dengan APD penuh, dan jangan pernah sendirian.'),
        m('Disinfektan dan fumigasi',
          'Disinfektan bekerja bila permukaannya <b>basah selama waktu kontak</b> yang tertulis di ' +
          'label — biasanya 1–10 menit. Menyemprot lalu langsung mengelapnya membuat prosesnya sia-sia.\n\n' +
          'Fumigasi hanya boleh dilakukan pada ruangan yang bisa <b>ditutup rapat</b> dan dikosongkan ' +
          'total. Pasang tanda peringatan di semua pintu, dan pastikan tidak ada orang tertinggal di ' +
          'dalam sebelum memulai — hitung dan catat jumlah orang yang keluar.')
      ],
      kuis: [
        s('Klien meminta takaran pestisida digandakan supaya "lebih ampuh". Sikap yang benar?',
          ['Turuti, klien yang menanggung risikonya', 'Gandakan setengahnya saja sebagai kompromi',
           'Tolak dan jelaskan bahwa takaran mengikuti label produk', 'Ganti dengan produk lain yang lebih kuat'], 2,
          'Melebihi takaran label tidak menambah efektivitas, hanya menambah racun di rumah klien.'),
        s('Penanganan rayap yang tepat adalah…',
          ['Semprot permukaan kayu yang terlihat', 'Injeksi tanah atau sistem umpan',
           'Fogging seluruh ruangan', 'Menjemur perabot di bawah matahari'], 1,
          'Semprot permukaan hanya membunuh yang terlihat dan membuat koloni memindahkan jalurnya.'),
        s('Disinfektan yang disemprot lalu langsung dilap…',
          ['Bekerja lebih cepat', 'Tidak sempat bekerja karena waktu kontaknya kurang',
           'Sama efektifnya', 'Lebih hemat bahan dan tetap efektif'], 1,
          'Disinfektan butuh permukaan tetap basah selama waktu kontak yang tertera di label.'),
        s('Pekerjaan sarang tawon sebaiknya dilakukan…',
          ['Siang hari agar terang', 'Malam hari saat koloni tidak aktif, dengan APD penuh dan tidak sendirian',
           'Kapan saja asal cepat', 'Setelah disiram air dari jauh'], 1,
          'Risiko sengatan massal jauh lebih kecil saat koloni tidak aktif, dan pendamping diperlukan bila terjadi sengatan.')
      ] },

    /* ================================================================ KENDARAAN */
    { kode: 'FK-KENDARAAN', judul: 'Sertifikasi Cuci & Detailing Kendaraan', ikon: '🚿',
      wajib: false, fungsi: true, urutan: 24, durasiMenit: 25, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Cuci reguler, drywash, detailing, dan cuci mesin tanpa merusak kendaraan.',
      materi: [
        m('Baret halus datang dari kain, bukan dari kotoran',
          'Penyebab baret melingkar (swirl mark) pada cat mobil hampir selalu <b>kain kotor</b> atau ' +
          'satu ember untuk semua. Pakai <b>metode dua ember</b>: satu berisi sampo, satu berisi air ' +
          'bilas untuk membersihkan mitt sebelum kembali ke ember sampo.\n\n' +
          'Cuci dari <b>atap ke bawah</b>. Bagian bawah bodi dan roda paling kotor, jadi dikerjakan ' +
          'terakhir dengan kain yang berbeda — kain roda tidak pernah menyentuh bodi.\n\n' +
          'Jangan mencuci di bawah terik matahari langsung: sampo mengering sebelum dibilas dan ' +
          'meninggalkan bercak air yang sulit hilang.'),
        m('Drywash dan batasnya',
          'Drywash memakai cairan pelicin dan microfiber, cocok untuk mobil yang <b>berdebu</b>, ' +
          'bukan yang berlumpur. Memaksakan drywash pada mobil kotor berat sama dengan menggosok ' +
          'pasir ke cat.\n\n' +
          'Aturan praktis: bila debu terasa berpasir saat disentuh dengan punggung tangan, kendaraan ' +
          'itu harus dicuci basah dulu. Sampaikan ke klien dan catat di order — jangan diam lalu ' +
          'menanggung risikonya sendiri.'),
        m('Cuci mesin: yang wajib ditutup',
          'Cuci mesin adalah pekerjaan berisiko tertinggi di layanan ini. Sebelum air menyentuh apa ' +
          'pun, <b>tutup rapat</b>: kotak sekring, alternator, filter udara, dan soket kelistrikan ' +
          'terbuka. Mesin harus dalam keadaan <b>dingin</b> — menyiram mesin panas dapat meretakkan ' +
          'blok dan membuat kepala silinder melengkung.\n\n' +
          'Jangan pernah memakai tekanan tinggi langsung ke arah soket, ECU, atau sensor. Pakai ' +
          'degreaser, kuas, lalu bilas bertekanan rendah.\n\n' +
          'Setelah selesai, keringkan dengan angin dan <b>nyalakan mesin</b> untuk memastikan tidak ' +
          'ada gangguan sebelum kendaraan diserahkan kembali.'),
        m('Serah terima dan bukti kondisi awal',
          'Foto kondisi kendaraan <b>sebelum</b> dikerjakan, termasuk baret dan penyok yang sudah ada. ' +
          'Ini melindungi Anda dan EXOCLEAN dari tuduhan kerusakan yang tidak Anda buat.\n\n' +
          'Periksa dan catat: kaca spion terlipat/tidak, antena, aksesori tambahan, dan barang di ' +
          'dalam kabin bila mengerjakan interior. Barang berharga milik klien sebaiknya diminta ' +
          'dikeluarkan sendiri oleh pemiliknya, bukan dipindahkan oleh Anda.')
      ],
      kuis: [
        s('Penyebab baret melingkar pada cat mobil paling sering adalah…',
          ['Sampo yang terlalu pekat', 'Kain kotor atau satu ember untuk semua bagian',
           'Air yang terlalu dingin', 'Mengeringkan terlalu lama'], 1,
          'Kotoran yang terbawa kembali ke kain adalah amplas halus bagi cat.'),
        s('Mobil datang dalam kondisi berlumpur dan klien meminta drywash. Sikap yang benar?',
          ['Kerjakan drywash sesuai permintaan', 'Jelaskan risikonya dan tawarkan cuci basah lebih dulu',
           'Drywash bagian atas saja', 'Tambah cairan pelicin sebanyak mungkin'], 1,
          'Drywash pada kotoran berat sama dengan menggosokkan pasir ke permukaan cat.'),
        s('Sebelum mencuci mesin, kondisi mesin harus…',
          ['Panas agar kotoran mudah lepas', 'Hangat suam-suam', 'Dingin', 'Menyala pada putaran rendah'], 2,
          'Menyiram mesin panas berisiko meretakkan blok dan melengkungkan kepala silinder.'),
        s('Foto kondisi awal kendaraan berguna untuk…',
          ['Bahan promosi', 'Membuktikan baret dan penyok yang sudah ada sebelum dikerjakan',
           'Menghitung harga', 'Mengisi laporan supervisor saja'], 1,
          'Tanpa bukti kondisi awal, kerusakan lama bisa dituduhkan kepada mitra.')
      ] },

    /* ================================================================ TAMAN */
    { kode: 'FK-TAMAN', judul: 'Sertifikasi Gardener & Pertamanan', ikon: '🌿',
      wajib: false, fungsi: true, urutan: 25, durasiMenit: 25, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Potong rumput, pemangkasan pohon, penanaman, dan land clearing.',
      materi: [
        m('Mesin potong dan jarak aman',
          'Mesin potong rumput melemparkan batu dan pecahan kaca dengan kecepatan tinggi. Sebelum ' +
          'menyalakan mesin, <b>bersihkan area dari benda keras</b> dan pastikan tidak ada orang, ' +
          'anak, atau hewan dalam radius <b>15 meter</b>.\n\n' +
          'APD wajib: kacamata pelindung, sepatu tertutup, pelindung telinga, dan celana panjang. ' +
          'Sandal di pekerjaan potong rumput adalah pelanggaran, bukan kebiasaan.\n\n' +
          'Bila mesin tersangkut, <b>matikan mesin dan tunggu mata pisau berhenti</b> sebelum ' +
          'menyentuhnya — bukan sekadar melepas gas.'),
        m('Memangkas tanpa membunuh pohon',
          'Pemangkasan yang salah membuat pohon membusuk dari titik potong. Potong tepat di luar ' +
          '<b>kerah cabang</b> (bagian menonjol di pangkal), bukan rata dengan batang, dan tidak ' +
          'menyisakan tonggak panjang.\n\n' +
          'Untuk dahan besar, pakai <b>potong tiga tahap</b>: torehan bawah, potong atas dari luar, ' +
          'baru rapikan di kerah cabang. Memotong sekaligus dari atas membuat kulit batang terkelupas ' +
          'panjang ke bawah.\n\n' +
          'Jangan memangkas lebih dari sekitar seperempat tajuk dalam satu musim — pohon bisa stres ' +
          'dan mati beberapa bulan kemudian, saat mitra sudah lama pergi.'),
        m('Pekerjaan ketinggian dan kabel',
          'Setiap pemangkasan yang mengharuskan kaki meninggalkan tanah adalah <b>pekerjaan ' +
          'ketinggian</b> — berlaku aturan K3 ketinggian, termasuk harness dan pendamping di bawah.\n\n' +
          'Perhatikan <b>kabel listrik</b> di sekitar tajuk. Dahan basah menghantarkan listrik. Bila ' +
          'ada kabel dalam jangkauan dahan yang akan dipotong, pekerjaan dihentikan dan dilaporkan ke ' +
          'supervisor untuk dikoordinasikan dengan pihak berwenang — tidak diteruskan dengan hati-hati.'),
        m('Land clearing dan sisa pekerjaan',
          'Land clearing menyisakan volume sampah hijau yang besar. Sepakati sejak awal dengan klien: ' +
          '<b>siapa yang membuang, ke mana, dan atas biaya siapa</b>. Ini penyebab sengketa paling ' +
          'sering pada pekerjaan taman.\n\n' +
          'Jangan membakar sampah hijau di lokasi klien tanpa izin tertulis — di banyak daerah itu ' +
          'melanggar aturan setempat dan asapnya menjadi masalah dengan tetangga.')
      ],
      kuis: [
        s('Radius aman minimum dari orang lain saat mengoperasikan mesin potong rumput adalah…',
          ['2 meter', '5 meter', '15 meter', 'Cukup di belakang operator'], 2,
          'Batu dan pecahan kaca terlempar jauh dengan kecepatan tinggi.'),
        s('Memotong dahan rata dengan batang (menghilangkan kerah cabang) menyebabkan…',
          ['Pohon tumbuh lebih cepat', 'Titik potong membusuk dan sulit menutup',
           'Tidak ada pengaruh', 'Dahan tumbuh dua kali lipat'], 1,
          'Kerah cabang adalah jaringan yang menutup luka. Menghilangkannya membuka jalan pembusukan.'),
        s('Ada kabel listrik dalam jangkauan dahan yang akan dipotong. Yang benar…',
          ['Kerjakan pelan-pelan dengan alat berisolasi seadanya', 'Siram dahan dulu agar tidak menghantar',
           'Hentikan pekerjaan dan laporkan ke supervisor', 'Potong dari sisi berlawanan'], 2,
          'Dahan basah justru menghantarkan listrik. Pekerjaan seperti ini butuh koordinasi pihak berwenang.'),
        s('Sebelum land clearing dimulai, yang wajib disepakati dengan klien adalah…',
          ['Warna seragam tim', 'Pembuangan sampah hijau: siapa, ke mana, atas biaya siapa',
           'Jam istirahat', 'Merek mesin yang dipakai'], 1,
          'Volume sampah hijau besar dan menjadi sumber sengketa paling sering bila tidak disepakati di awal.')
      ] },

    /* ================================================================ PLUMBING */
    { kode: 'FK-PLUMB', judul: 'Sertifikasi Plumbing & Sedot Toilet', ikon: '🔧',
      wajib: false, fungsi: true, urutan: 26, durasiMenit: 30, nilaiMin: 90, masaBerlakuHari: 365,
      deskripsi: 'Perbaikan jalur air, penanganan saluran mampet, dan penyedotan tinja.',
      materi: [
        m('Matikan sumber sebelum membuka apa pun',
          'Urutan yang menyelamatkan rumah klien: <b>tutup stop kran → buang tekanan sisa → baru ' +
          'buka sambungan</b>. Membuka sambungan bertekanan membuat air menyembur dan merusak plafon ' +
          'atau perabot dalam hitungan detik.\n\n' +
          'Untuk pekerjaan yang menyentuh pompa atau water heater, <b>matikan juga listriknya</b> ' +
          'di panel, bukan hanya sakelarnya.\n\n' +
          'Sebelum pergi, nyalakan kembali dan <b>amati sambungan selama beberapa menit</b>. Rembesan ' +
          'kecil yang tidak terlihat saat itu akan menjadi genangan besok pagi.'),
        m('Mampet: cari sebabnya, bukan hanya dorong',
          'Menyodok saluran mampet tanpa tahu penyebabnya sering hanya memindahkan sumbatan lebih ' +
          'jauh ke dalam. Tanyakan dan periksa: apakah mampetnya <b>satu titik</b> (hanya wastafel) ' +
          'atau <b>seluruh jalur</b> (semua saluran naik)?\n\n' +
          '• Satu titik → biasanya sumbatan lokal: rambut, lemak, sisa makanan\n' +
          '• Seluruh jalur → saluran utama atau septic tank penuh; menyodok tidak akan menyelesaikan\n\n' +
          'Chemical pembuka saluran bersifat <b>sangat kaustik</b>. Jangan pernah mencampurnya dengan ' +
          'chemical lain, dan jangan menyodok setelah menuangnya — cipratannya dapat mengenai mata.'),
        m('Sedot tinja: bahaya yang tidak terlihat',
          'Septic tank mengandung <b>gas beracun</b> — hidrogen sulfida dan metana — yang dapat ' +
          'membuat pingsan dalam hitungan detik dan mudah terbakar.\n\n' +
          'Aturan mutlak:\n' +
          '• <b>Tidak seorang pun masuk ke dalam tangki.</b> Tidak dengan tali, tidak sebentar\n' +
          '• Buka tutup dan <b>biarkan berventilasi</b> sebelum bekerja\n' +
          '• <b>Tidak ada api, rokok, atau percikan</b> di dekat lubang\n' +
          '• Bekerja minimal berdua, satu orang selalu di luar mengawasi\n\n' +
          'Sarung tangan, masker, kacamata, dan sepatu boot wajib. Cuci tangan dan ganti pakaian ' +
          'sebelum menyentuh apa pun setelah pekerjaan selesai.'),
        m('Higiene setelah pekerjaan',
          'Pekerjaan ini membawa bakteri patogen. Sebelum meninggalkan lokasi: bersihkan area kerja, ' +
          '<b>disinfeksi permukaan yang tersentuh</b>, dan jangan meletakkan peralatan kotor di ' +
          'area bersih rumah klien.\n\n' +
          'Selang dan peralatan dibilas di lokasi pembuangan, bukan di keran rumah klien.')
      ],
      kuis: [
        s('Urutan yang benar sebelum membuka sambungan pipa adalah…',
          ['Buka sambungan lalu tutup kran', 'Tutup stop kran, buang tekanan sisa, baru buka sambungan',
           'Tutup kran lalu langsung buka sambungan', 'Siapkan ember lalu buka sambungan'], 1,
          'Tekanan sisa cukup untuk menyemburkan air dan merusak plafon serta perabot.'),
        s('Semua saluran di rumah naik air bersamaan. Kemungkinan terbesar…',
          ['Sumbatan rambut di wastafel', 'Saluran utama atau septic tank penuh',
           'Kran rusak', 'Tekanan air terlalu tinggi'], 1,
          'Mampet di satu titik hanya memengaruhi satu saluran. Seluruh jalur naik menandakan masalah di hilir.'),
        s('Untuk mengambil benda yang jatuh ke dalam septic tank, yang benar adalah…',
          ['Masuk sebentar dengan tali pengaman', 'Masuk setelah tangki diventilasi 5 menit',
           'Tidak seorang pun masuk; gunakan alat dari luar', 'Masuk berdua agar aman'], 2,
          'Gas hidrogen sulfida dapat membuat pingsan dalam hitungan detik. Tidak ada pengecualian untuk masuk ke tangki.'),
        s('Chemical pembuka saluran boleh dicampur dengan chemical lain bila…',
          ['Takarannya kecil', 'Tidak pernah boleh dicampur',
           'Keduanya sama-sama pembuka saluran', 'Diaduk perlahan'], 1,
          'Campuran chemical kaustik dapat menghasilkan gas beracun dan reaksi panas yang menyembur.')
      ] },

    /* ================================================================ LAUNDRY */
    { kode: 'FK-LAUNDRY', judul: 'Sertifikasi Laundry & Setrika', ikon: '👔',
      wajib: false, fungsi: true, urutan: 27, durasiMenit: 20, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Pemilahan, pencucian, dry cleaning, dan penyetrikaan sesuai jenis bahan.',
      materi: [
        m('Memilah sebelum mencuci',
          'Pemilahan adalah pekerjaan yang paling sering dilewati dan paling mahal akibatnya. Pilah ' +
          'berdasarkan <b>warna, bahan, dan tingkat kotor</b> — bukan sekadar warna.\n\n' +
          'Periksa saku setiap helai. Satu pulpen yang tertinggal merusak satu mesin penuh pakaian ' +
          'klien, dan itu tidak bisa diperbaiki.\n\n' +
          'Baca label: suhu maksimum, boleh/tidaknya pemutih, dan cara pengeringan. Simbol segitiga ' +
          'bersilang berarti <b>tidak boleh diputihkan</b>; lingkaran berarti <b>dry clean saja</b>.'),
        m('Noda: dingin dulu, panas belakangan',
          'Aturan yang menyelamatkan banyak pakaian: <b>noda protein (darah, susu, telur) dicuci ' +
          'dengan air dingin</b>. Air panas membuat protein menggumpal dan noda terkunci permanen di ' +
          'serat.\n\n' +
          'Noda minyak justru butuh air hangat dan degreaser. Noda tinta ditangani dengan pelarut, ' +
          'bukan digosok — menggosok hanya melebarkan noda.\n\n' +
          'Selalu <b>uji di jahitan bagian dalam</b> sebelum memakai penghilang noda pada pakaian ' +
          'berwarna.'),
        m('Setrika: suhu, uap, dan bahan',
          'Setiap bahan punya batas suhunya:\n\n' +
          '• <b>Sutra & sintetis</b> — suhu rendah, alas kain, tanpa uap langsung\n' +
          '• <b>Wol</b> — suhu sedang dengan uap, ditekan bukan digosok\n' +
          '• <b>Katun & linen</b> — suhu tinggi, boleh uap banyak\n\n' +
          'Setrika bagian <b>dalam</b> untuk pakaian gelap dan bahan mengkilap, supaya tidak timbul ' +
          'bekas kilap permanen.\n\n' +
          'Jangan pernah meninggalkan setrika panas menempel di atas kain, sekalipun sebentar. Ini ' +
          'penyebab kerusakan pakaian klien nomor satu pada layanan setrika per jam.')
      ],
      kuis: [
        s('Noda darah pada kemeja sebaiknya dicuci dengan…',
          ['Air panas agar cepat larut', 'Air dingin', 'Air mendidih dan pemutih', 'Uap setrika'], 1,
          'Air panas menggumpalkan protein sehingga noda terkunci permanen di serat kain.'),
        s('Simbol lingkaran pada label pakaian berarti…',
          ['Boleh diputihkan', 'Dry clean saja', 'Setrika suhu tinggi', 'Boleh dikeringkan mesin'], 1,
          'Lingkaran adalah simbol dry cleaning. Mencucinya dengan air berisiko menyusut atau berubah bentuk.'),
        s('Pakaian gelap dan bahan mengkilap sebaiknya disetrika…',
          ['Dari sisi luar dengan suhu tinggi', 'Dari sisi dalam',
           'Dengan uap sebanyak mungkin', 'Tanpa alas apa pun'], 1,
          'Menyetrika sisi luar bahan gelap meninggalkan bekas kilap yang permanen.')
      ] },

    /* ================================================================ CARE GIVER */
    { kode: 'FK-CARE', judul: 'Sertifikasi Care Giver (Lansia, Anak & Bayi)', ikon: '🤱',
      wajib: false, fungsi: true, urutan: 28, durasiMenit: 35, nilaiMin: 90, masaBerlakuHari: 365,
      deskripsi: 'Pendampingan aman untuk lansia, anak, dan bayi di rumah klien.',
      materi: [
        m('Batas peran: mendampingi, bukan mengobati',
          'Care giver EXOCLEAN <b>bukan tenaga medis</b>. Yang boleh dilakukan: mendampingi, membantu ' +
          'aktivitas harian, mengingatkan jadwal, dan memantau kondisi.\n\n' +
          'Yang <b>tidak boleh</b>, tanpa kecuali:\n' +
          '• Menentukan atau mengubah dosis obat\n' +
          '• Menyuntik, memasang infus, atau tindakan medis apa pun\n' +
          '• Memberi obat yang tidak diresepkan untuk orang tersebut\n\n' +
          'Obat diberikan hanya sesuai jadwal dan dosis tertulis dari keluarga atau dokter, dan ' +
          '<b>dicatat setiap kali</b>: jam, nama obat, jumlah. Catatan ini melindungi Anda.'),
        m('Mencegah jatuh pada lansia',
          'Jatuh adalah penyebab cedera serius nomor satu pada lansia, dan sebagian besar terjadi di ' +
          'kamar mandi dan saat bangun dari tempat tidur.\n\n' +
          'Yang bisa Anda lakukan setiap hari:\n' +
          '• Pastikan lantai kering dan jalur berjalan bebas kabel serta karpet terlipat\n' +
          '• Pencahayaan cukup, terutama jalur ke kamar mandi malam hari\n' +
          '• Saat membantu bangun: <b>duduk dulu di tepi ranjang selama beberapa saat</b> sebelum ' +
          'berdiri, karena tekanan darah turun mendadak menyebabkan pusing\n' +
          '• Jangan menarik lengan lansia untuk membantunya berdiri — topang dari punggung dan ' +
          'pinggang; menarik lengan berisiko cedera bahu'),
        m('Bayi dan anak: tidur, mandi, dan pengawasan',
          'Bayi ditidurkan <b>telentang</b>, di alas rata dan padat, tanpa bantal, boneka, atau ' +
          'selimut tebal di sekitar wajah — ini standar pencegahan kematian mendadak pada bayi.\n\n' +
          'Air mandi diuji dengan <b>siku atau punggung pergelangan tangan</b>, bukan telapak tangan. ' +
          'Telapak tangan kurang peka terhadap panas.\n\n' +
          'Aturan yang tidak bisa ditawar: <b>anak dan bayi tidak pernah ditinggal sendiri di dekat ' +
          'air</b> — bak, ember, kolam — walau hanya sebentar untuk mengambil handuk. Bawa anaknya ' +
          'bersama Anda.\n\n' +
          'Ponsel disimpan selama mengasuh, kecuali untuk menghubungi keluarga atau EXOCLEAN.'),
        m('Keadaan darurat dan pelaporan',
          'Sebelum mulai bertugas, catat dan simpan di tempat yang mudah dijangkau: <b>nomor keluarga, ' +
          'nomor dokter, alamat lengkap rumah</b>, serta riwayat alergi dan penyakit.\n\n' +
          'Bila terjadi keadaan darurat: pastikan keselamatan → hubungi layanan darurat → hubungi ' +
          'keluarga → laporkan ke EXOCLEAN. Jangan menunda menghubungi karena takut disalahkan.\n\n' +
          'Semua kejadian di luar kebiasaan — jatuh walau ringan, menolak makan, demam, perubahan ' +
          'perilaku — dicatat dan disampaikan ke keluarga di akhir tugas, bukan disimpan sendiri.')
      ],
      kuis: [
        s('Keluarga meminta Anda menaikkan dosis obat karena "sepertinya kurang". Sikap yang benar?',
          ['Naikkan sedikit saja', 'Tolak; dosis hanya berubah atas keputusan dokter',
           'Naikkan bila kondisi memang memburuk', 'Beri obat lain yang lebih kuat'], 1,
          'Care giver bukan tenaga medis. Perubahan dosis adalah keputusan dokter.'),
        s('Membantu lansia bangun dari tempat tidur sebaiknya…',
          ['Ditarik lengannya agar cepat', 'Didudukkan dulu di tepi ranjang beberapa saat sebelum berdiri',
           'Langsung diangkat dari ketiak', 'Dibiarkan mandiri sepenuhnya'], 1,
          'Tekanan darah turun mendadak saat berdiri; menarik lengan juga berisiko cedera bahu.'),
        s('Posisi tidur bayi yang benar adalah…',
          ['Tengkurap agar tidak gumoh', 'Miring dengan bantal penyangga',
           'Telentang di alas rata tanpa bantal atau boneka', 'Telentang dengan selimut tebal menutupi dada'], 2,
          'Ini standar pencegahan kematian mendadak pada bayi.'),
        s('Anda sedang memandikan balita dan handuk tertinggal di kamar. Yang benar…',
          ['Tinggalkan sebentar, hanya beberapa detik', 'Bawa anak bersama Anda mengambil handuk',
           'Minta anak berpegangan pada bak', 'Kurangi air lalu tinggalkan'], 1,
          'Anak tidak pernah ditinggal sendiri di dekat air, walau hanya sebentar.')
      ] },

    /* ================================================================ BEAUTY & MASSAGE */
    { kode: 'FK-BEAUTY', judul: 'Sertifikasi Massage & Beauty Care', ikon: '💆',
      wajib: false, fungsi: true, urutan: 29, durasiMenit: 30, nilaiMin: 90, masaBerlakuHari: 365,
      deskripsi: 'Pijat dan perawatan panggilan dengan batas profesional yang tegas.',
      materi: [
        m('Batas profesional dan keselamatan diri',
          'Layanan ini dilakukan di rumah klien, satu ruangan, sering hanya berdua. Karena itu ' +
          'batasnya harus jelas sejak awal dan tidak dinegosiasikan di lokasi.\n\n' +
          '• Layanan EXOCLEAN adalah <b>pijat kesehatan dan perawatan</b>. Permintaan di luar itu ' +
          'ditolak, pekerjaan dihentikan, dan dilaporkan ke supervisor <b>saat itu juga</b>\n' +
          '• Mitra berhak menghentikan pekerjaan dan meninggalkan lokasi bila merasa tidak aman — ' +
          'tanpa perlu izin siapa pun, dan tanpa kehilangan haknya\n' +
          '• Nyalakan berbagi lokasi selama bertugas, dan kabari supervisor saat tiba dan selesai\n\n' +
          'EXOCLEAN berpihak pada mitra dalam hal ini. Melaporkan bukan mempersulit diri.'),
        m('Kondisi yang tidak boleh dipijat',
          'Tanyakan kondisi klien sebelum mulai. <b>Jangan memijat</b> bila ada:\n\n' +
          '• Demam atau infeksi aktif\n' +
          '• Luka terbuka, luka bakar, atau penyakit kulit menular di area pijat\n' +
          '• Patah tulang, keseleo baru, atau memar besar\n' +
          '• Varises berat dan riwayat penggumpalan darah\n' +
          '• Kehamilan — kecuali Anda bersertifikat khusus pijat kehamilan\n\n' +
          'Bila ragu, <b>jangan dilanjutkan</b> dan sarankan klien berkonsultasi ke dokter. Menolak ' +
          'satu pekerjaan jauh lebih murah daripada mencederai klien.'),
        m('Higiene dan chemical perawatan',
          'Alas, handuk, dan seprai <b>diganti setiap klien</b> — tidak ada pengecualian. Peralatan ' +
          'yang menyentuh kulit (alat pedicure, spatula waxing) disterilkan atau sekali pakai.\n\n' +
          'Spatula waxing <b>tidak dicelup ulang</b> ke wadah wax setelah menyentuh kulit. Ini jalur ' +
          'penularan yang paling sering diabaikan.\n\n' +
          'Untuk coloring, smoothing, dan waxing: lakukan <b>uji tempel (patch test)</b> di area kecil ' +
          'dan tunggu reaksinya. Klien yang belum pernah memakai produk tersebut berisiko alergi, dan ' +
          'reaksinya bisa berat.'),
        m('Ruang, privasi, dan komunikasi',
          'Siapkan ruang dengan pencahayaan cukup dan suhu nyaman. Klien ditutupi handuk pada bagian ' +
          'yang tidak sedang dikerjakan — hanya area kerja yang terbuka.\n\n' +
          'Tanyakan tekanan pijat di awal dan periksa ulang di tengah sesi. Rasa sakit bukan tanda ' +
          'pijat yang berhasil; nyeri tajam berarti berhenti.\n\n' +
          'Jangan memberi diagnosis atau saran medis. Anda boleh menyampaikan apa yang Anda rasakan ' +
          '(otot tegang di area tertentu), bukan menyimpulkan penyakitnya.')
      ],
      kuis: [
        s('Klien meminta layanan di luar pijat kesehatan. Yang benar…',
          ['Tolak halus dan lanjutkan pekerjaan', 'Tolak, hentikan pekerjaan, dan laporkan ke supervisor saat itu juga',
           'Selesaikan dulu lalu laporkan besok', 'Naikkan tarif sebagai penolakan halus'], 1,
          'Melanjutkan pekerjaan setelah permintaan seperti itu membahayakan mitra. EXOCLEAN berpihak pada mitra.'),
        s('Klien sedang demam dan meminta dipijat agar enak badan. Sikap yang benar?',
          ['Pijat ringan saja', 'Pijat bagian kaki saja', 'Tidak dipijat, sarankan konsultasi dokter',
           'Pijat dengan minyak hangat'], 2,
          'Demam menandakan infeksi aktif; pijat dapat memperburuk penyebarannya.'),
        s('Spatula waxing yang sudah menyentuh kulit klien…',
          ['Boleh dicelup ulang bila kulitnya bersih', 'Tidak boleh dicelup ulang ke wadah wax',
           'Boleh setelah dilap tisu', 'Boleh untuk klien yang sama saja'], 1,
          'Mencelup ulang mencemari seluruh wadah wax dan menjadi jalur penularan.'),
        s('Sebelum coloring pada klien baru, yang wajib dilakukan…',
          ['Mencuci rambut dua kali', 'Uji tempel (patch test) dan menunggu reaksinya',
           'Memotong ujung rambut', 'Memakai suhu paling rendah'], 1,
          'Reaksi alergi terhadap pewarna bisa berat dan hanya terdeteksi lewat uji tempel.')
      ] },

    /* ================================================================ JURU MASAK */
    { kode: 'FK-MASAK', judul: 'Sertifikasi Juru Masak & Keamanan Pangan', ikon: '👨‍🍳',
      wajib: false, fungsi: true, urutan: 30, durasiMenit: 25, nilaiMin: 90, masaBerlakuHari: 365,
      deskripsi: 'Memasak di rumah klien dengan standar keamanan pangan.',
      materi: [
        m('Zona bahaya suhu',
          'Bakteri berkembang paling cepat antara <b>5 °C dan 60 °C</b> — inilah zona bahaya. Makanan ' +
          'tidak boleh berada di rentang itu lebih dari <b>2 jam</b> total.\n\n' +
          'Praktiknya:\n' +
          '• Bahan beku dicairkan di <b>kulkas</b>, bukan di suhu ruang atau air panas\n' +
          '• Makanan matang yang akan disimpan didinginkan cepat lalu masuk kulkas, tidak dibiarkan ' +
          'semalaman di meja\n' +
          '• Makanan dipanaskan ulang sampai <b>benar-benar panas menyeluruh</b>, bukan sekadar hangat\n\n' +
          'Ayam dan telur dimasak sampai matang sempurna — tidak ada bagian merah muda di dekat tulang.'),
        m('Kontaminasi silang',
          'Talenan dan pisau untuk <b>bahan mentah</b> tidak pernah dipakai untuk bahan matang atau ' +
          'sayur yang dimakan mentah, kecuali sudah dicuci bersih dengan sabun di antaranya.\n\n' +
          'Di kulkas, bahan mentah diletakkan di <b>rak paling bawah</b> agar tetesannya tidak jatuh ' +
          'ke makanan lain.\n\n' +
          'Cuci tangan dengan sabun: sebelum mulai, setelah menyentuh bahan mentah, setelah menyentuh ' +
          'wajah atau ponsel, dan setelah dari kamar mandi. Ini urutan yang paling sering dilanggar ' +
          'justru pada poin ponsel.'),
        m('Alergi dan pantangan klien',
          'Tanyakan <b>sebelum belanja dan memasak</b>: alergi, pantangan agama, dan preferensi ' +
          'keluarga. Alergi kacang, seafood, telur, dan susu bisa berakibat fatal — bukan sekadar ' +
          'tidak suka.\n\n' +
          'Untuk klien dengan pantangan halal, peralatan dan minyak tidak boleh bercampur dengan bahan ' +
          'non-halal. Bila dapur klien dipakai bersama, tanyakan alat mana yang boleh dipakai.\n\n' +
          'Simpan kemasan bahan sampai makanan disajikan, agar komposisinya bisa diperiksa bila ada ' +
          'reaksi.'),
        m('Meninggalkan dapur klien',
          'Dapur diserahkan dalam keadaan <b>lebih bersih daripada saat Anda datang</b>: kompor dilap, ' +
          'wastafel kosong, sampah dibuang, dan bahan sisa disimpan dengan label tanggal.\n\n' +
          'Matikan kompor dan gas dari sumbernya, dan pastikan tidak ada alat listrik yang tertinggal ' +
          'menyala. Periksa sekali lagi sebelum pergi — kebiasaan ini yang membedakan juru masak ' +
          'profesional.')
      ],
      kuis: [
        s('Zona bahaya pertumbuhan bakteri pada makanan adalah…',
          ['0–5 °C', '5–60 °C', '60–100 °C', 'Di atas 100 °C'], 1,
          'Makanan tidak boleh berada di rentang ini lebih dari 2 jam total.'),
        s('Cara mencairkan daging beku yang benar adalah…',
          ['Direndam air panas', 'Dibiarkan di meja dapur semalaman',
           'Di dalam kulkas', 'Dijemur di bawah matahari'], 2,
          'Mencairkan di suhu ruang membuat permukaan daging masuk zona bahaya jauh sebelum bagian dalamnya cair.'),
        s('Di dalam kulkas, bahan mentah diletakkan di…',
          ['Rak paling atas', 'Rak tengah', 'Rak paling bawah', 'Pintu kulkas'], 2,
          'Agar tetesan cairan bahan mentah tidak jatuh mengenai makanan lain.'),
        s('Klien menyebut anaknya alergi kacang. Yang wajib Anda lakukan…',
          ['Kurangi kacang seminimal mungkin', 'Hindari kacang sepenuhnya dan periksa komposisi semua bahan',
           'Masak terpisah di wajan yang sama', 'Sajikan kacang di piring terpisah'], 1,
          'Alergi kacang dapat berakibat fatal; jejak pada bahan lain dan alat pun berbahaya.')
      ] },

    /* ================================================================ DRIVER & LOGISTIK */
    { kode: 'FK-DRIVER', judul: 'Sertifikasi Driver, Kurir & Pindahan', ikon: '🚗',
      wajib: false, fungsi: true, urutan: 31, durasiMenit: 25, nilaiMin: 85, masaBerlakuHari: 365,
      deskripsi: 'Mengemudi, mengantar barang, dan memindahkan barang milik klien dengan aman.',
      materi: [
        m('Dokumen, kondisi, dan kelayakan',
          'Sebelum berangkat, pastikan <b>SIM sesuai golongan kendaraan</b> dan masih berlaku, serta ' +
          'STNK ada di kendaraan. Mengemudi dengan SIM tidak sesuai golongan membatalkan asuransi ' +
          'bila terjadi kecelakaan.\n\n' +
          'Periksa cepat sebelum jalan: <b>rem, lampu, ban, dan kaca spion</b>. Bila ada yang tidak ' +
          'layak, laporkan dan jangan berangkat — tekanan jadwal bukan alasan.\n\n' +
          'Kelelahan adalah penyebab kecelakaan yang paling diremehkan. Untuk perjalanan luar kota, ' +
          'istirahat setiap 3–4 jam. Bila mengantuk, berhenti — tidak ada pengantaran yang sepadan.'),
        m('Barang klien adalah tanggung jawab Anda',
          'Setiap serah terima barang dicatat dan difoto: <b>jumlah, kondisi, dan keutuhan segel</b>. ' +
          'Foto saat menerima dan saat menyerahkan.\n\n' +
          'Barang berharga, dokumen asli, dan uang tunai <b>tidak dititipkan tanpa berita acara</b>. ' +
          'Bila klien memaksa menitipkan tanpa catatan, sampaikan bahwa itu justru melindungi kedua ' +
          'pihak.\n\n' +
          'Jangan pernah meninggalkan kendaraan dengan barang klien di dalamnya dalam keadaan tidak ' +
          'terkunci, sekalipun sebentar.'),
        m('Memuat dan mengangkat',
          'Angkat dengan <b>lutut, bukan punggung</b>: dekati barang, jongkok, punggung lurus, angkat ' +
          'dengan kaki. Barang berat diangkat berdua — bukan diuji sendiri dulu.\n\n' +
          'Susunan muatan: <b>berat di bawah dan di depan</b>, ringan di atas. Muatan diikat agar tidak ' +
          'bergeser saat pengereman; barang yang bergeser di tikungan adalah penyebab kerusakan ' +
          'terbesar pada jasa pindahan.\n\n' +
          'Barang pecah belah dibungkus dan diberi tanda, lalu dimuat terakhir dan dibongkar pertama.'),
        m('Selama perjalanan',
          'Ponsel <b>tidak dipegang</b> saat mengemudi. Bila harus menjawab, menepi. Aplikasi EXOCLEAN ' +
          'diisi saat berhenti, bukan sambil jalan.\n\n' +
          'Untuk layanan driver dengan klien di dalam kendaraan: berkendara halus, patuhi batas ' +
          'kecepatan, dan jangan menyalakan musik atau menelepon tanpa izin penumpang.\n\n' +
          'Bila terjadi kecelakaan atau kendaraan mogok: amankan lokasi, pasang segitiga pengaman, ' +
          'kabari supervisor, dan jangan membuat kesepakatan ganti rugi sendiri di lokasi.')
      ],
      kuis: [
        s('Mengemudi dengan SIM tidak sesuai golongan kendaraan berakibat…',
          ['Hanya denda ringan', 'Asuransi batal bila terjadi kecelakaan',
           'Tidak ada akibat bila hati-hati', 'Kendaraan tidak bisa dinyalakan'], 1,
          'Selain melanggar hukum, klaim asuransi akan ditolak — kerugiannya menjadi tanggungan pribadi.'),
        s('Cara mengangkat barang berat yang benar adalah…',
          ['Membungkuk dan mengangkat dengan punggung', 'Jongkok, punggung lurus, angkat dengan kaki',
           'Menarik sambil memutar badan', 'Mengangkat cepat agar tidak lama'], 1,
          'Mengangkat dengan punggung adalah penyebab cedera pinggang paling umum pada jasa pindahan.'),
        s('Susunan muatan yang benar adalah…',
          ['Berat di atas agar mudah dibongkar', 'Berat di bawah dan di depan, diikat',
           'Acak asal padat', 'Pecah belah di bawah agar tidak jatuh'], 1,
          'Muatan berat di bawah menjaga kestabilan; ikatan mencegah pergeseran saat pengereman.'),
        s('Klien memaksa menitipkan dokumen asli tanpa berita acara. Sikap yang benar?',
          ['Terima saja karena klien yang meminta', 'Terima dan foto seadanya',
           'Jelaskan bahwa berita acara melindungi kedua pihak dan tetap buat catatannya', 'Tolak pengantaran'], 2,
          'Catatan serah terima melindungi mitra maupun klien bila terjadi selisih di kemudian hari.')
      ] },

    /* ================================================================ HOSPITALITY */
    { kode: 'FK-HOSPITALITY', judul: 'Sertifikasi Pelayanan Tamu & Pendampingan', ikon: '🍽️',
      wajib: false, fungsi: true, urutan: 32, durasiMenit: 25, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Waitress, travel assistant, guide tour, dan penerjemah.',
      materi: [
        m('Penampilan, sikap, dan jarak',
          'Pada layanan ini Anda mewakili klien di hadapan tamunya. Seragam rapi, kuku pendek dan ' +
          'bersih, rambut terikat, parfum secukupnya, dan <b>tanpa aksesori yang berlebihan</b>.\n\n' +
          'Sikap dasar: berdiri tegak di posisi yang mudah dipanggil tetapi tidak mengganggu ' +
          'percakapan, tidak menguping, dan tidak ikut dalam obrolan tamu kecuali diajak.\n\n' +
          'Ponsel pribadi disimpan selama bertugas. Ini terlihat kecil, tetapi paling sering dikeluhkan ' +
          'klien pada layanan waitress dan pendampingan.'),
        m('Menyajikan dan menangani makanan',
          'Piring dibawa dari <b>tepi</b>, gelas dari <b>batang atau alasnya</b> — jari tidak menyentuh ' +
          'permukaan yang bersentuhan dengan makanan atau bibir tamu.\n\n' +
          'Sajikan dari sisi kanan tamu dan angkat dari sisi kanan pula, kecuali tata ruang tidak ' +
          'memungkinkan. Sebutkan nama hidangan saat meletakkannya.\n\n' +
          'Bila tamu menyebut alergi, <b>sampaikan ke dapur atau tuan rumah</b> dan jangan menebak ' +
          'sendiri isi hidangan. Menjawab "sepertinya tidak ada" pada pertanyaan alergi adalah ' +
          'kesalahan yang berbahaya.'),
        m('Pendampingan perjalanan dan guide',
          'Sebelum berangkat: pastikan Anda memegang <b>rencana perjalanan, kontak darurat klien, dan ' +
          'titik temu cadangan</b> bila terpisah.\n\n' +
          'Hormati budaya dan aturan setempat, terutama di tempat ibadah dan kawasan adat. Sampaikan ' +
          'aturan itu kepada klien <b>sebelum</b> tiba, bukan setelah ditegur petugas setempat.\n\n' +
          'Jangan pernah memegang paspor atau dokumen asli klien kecuali diminta dan dicatat. Uang ' +
          'pembelian tiket atau tiket masuk dicatat dengan bukti, sekecil apa pun jumlahnya.'),
        m('Penerjemah: netral dan lengkap',
          'Penerjemah menyampaikan <b>apa adanya</b> — tidak menambah, tidak mengurangi, tidak ' +
          'memperhalus isi yang tidak nyaman. Bila ada istilah yang tidak Anda pahami, katakan dan ' +
          'minta penjelasan; menebak istilah dalam urusan hukum atau medis berakibat serius.\n\n' +
          'Segala isi percakapan bersifat <b>rahasia</b>. Untuk dokumen resmi, pastikan klien tahu ' +
          'perbedaan penerjemah tersumpah dan tidak tersumpah — hanya terjemahan tersumpah yang ' +
          'diterima instansi resmi.')
      ],
      kuis: [
        s('Gelas dibawa dengan memegang…',
          ['Bagian bibir gelas', 'Batang atau alas gelas', 'Bagian tengah dengan dua jari', 'Bebas asal mantap'], 1,
          'Jari tidak boleh menyentuh bagian yang bersentuhan dengan bibir tamu.'),
        s('Tamu bertanya apakah hidangan mengandung udang dan Anda tidak yakin. Yang benar…',
          ['Jawab "sepertinya tidak"', 'Tanyakan ke dapur atau tuan rumah sebelum menjawab',
           'Sarankan tamu mencicipi sedikit', 'Jawab bahwa semua aman'], 1,
          'Menebak pada pertanyaan alergi dapat berakibat fatal bagi tamu.'),
        s('Sebelum mendampingi perjalanan klien, yang wajib Anda pegang adalah…',
          ['Uang saku pribadi', 'Rencana perjalanan, kontak darurat, dan titik temu cadangan',
           'Kamera', 'Peta kertas'], 1,
          'Titik temu cadangan adalah hal pertama yang dibutuhkan saat rombongan terpisah.'),
        s('Sebagai penerjemah, isi pembicaraan yang kasar dari salah satu pihak sebaiknya…',
          ['Diperhalus agar tidak memicu konflik', 'Disampaikan apa adanya',
           'Dilewati saja', 'Diganti dengan ringkasan'], 1,
          'Penerjemah bersikap netral dan lengkap; memperhalus isi berarti mengubah makna yang disepakati para pihak.')
      ] }
  ];

  return { KURSUS: KURSUS };
})();
