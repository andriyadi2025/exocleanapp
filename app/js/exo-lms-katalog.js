/* ==========================================================================
   exo-lms-katalog.js — katalog materi terbuka untuk Akademi EXOCLEAN
   --------------------------------------------------------------------------
   Kurasi 7 Sep 2026: video YouTube publik (disematkan lewat youtube-nocookie,
   tidak diunduh/disalin), bacaan ringkas yang ditulis ulang dari sumber
   resmi/terbuka (WHO, Kemenkes, BPOM, Kemnaker, Indonesia Safety Center,
   Kompas, dsb.) dengan atribusi, dan kuis per modul. Semua video diperiksa
   tersedia lewat oEmbed YouTube pada tanggal kurasi.

   Diterapkan EXO_LMS.perbaruiKatalog(): kursus baru ditambahkan bila kodenya
   belum ada, kursus lama diperkaya modul "sumber terbuka" sekali (ditandai
   katalogRev), jalur pembelajaran digabung. Idempoten per KATALOG.rev.
   Video pihak ketiga bisa dihapus pemiliknya sewaktu-waktu — admin dapat
   mengganti URL lewat LMS → Kursus & materi.
   ========================================================================== */
var EXO_LMS_KATALOG = (function () {
  'use strict';
  var REV = 1;
  function yt(id) { return 'https://www.youtube-nocookie.com/embed/' + id; }
  /* b = { video, bacaan, tautan, modul, soal } dari EXO_LMS */
  function bangun(b) {
    var V = function (judul, id, menit, kredit) { var m = b.video(judul, yt(id), menit); m.kredit = kredit || ''; return m; };
    var T = function (judul, url, isi, menit) { return b.tautan(judul, url, isi, menit); };
    var kursus = [
      { kode:'LMS-003', judul:'Kebersihan tangan & pencegahan infeksi (WHO / Kemenkes)', level:'dasar', target:['semua'], jam:1, wajib:true, kompetensi:['Cuci tangan 6 langkah','5 momen','Sarung tangan'], prasyarat:[], deskripsi:'Tangan petugas adalah jalur utama kuman berpindah dari toilet ke dapur, dari satu rumah ke rumah berikutnya. Kursus singkat berbasis panduan WHO dan Kemenkes: kapan dan bagaimana mencuci tangan, memakai hand rub, dan kapan sarung tangan tidak menggantikan cuci tangan.',
        modul:[
          b.modul('Cuci tangan 6 langkah', [
            V('Cuci Tangan Pakai Sabun minimal 20 detik — Kemenkes RI', 'rPPTzgob7KI', 3, 'Ayo Sehat · Kementerian Kesehatan RI'),
            V('WHO: How to handwash? With soap and water', '3PmVJQUCm4E', 2, 'World Health Organization'),
            V('6 Langkah Cuci Tangan', 'Jg8S09oHmpE', 3, 'Ini Kata Dokter'),
            b.bacaan('Kapan wajib cuci tangan di lokasi pelanggan', 'Lima momen EXOCLEAN (diturunkan dari "5 Moments" WHO):\n1. Sebelum masuk rumah pelanggan dan sebelum memegang barang mereka.\n2. Setelah membersihkan toilet, tempat sampah, atau area basah — sebelum berpindah ke dapur/kamar.\n3. Setelah melepas sarung tangan (sarung tangan bocor tanpa terlihat).\n4. Sebelum menyiapkan makanan atau memegang anak/lansia (pengasuh, juru masak).\n5. Sebelum meninggalkan lokasi dan menyentuh ponsel untuk foto/checklist.\n\nSabun + air mengalir 40–60 detik bila tangan terlihat kotor; hand rub alkohol 20–30 detik bila tidak. Keringkan dengan tisu sekali pakai, bukan lap serbaguna.\n\nSumber: WHO "Hand hygiene: when and how" & "Your 5 moments"; Kemenkes RI CTPS.', 4),
            T('Poster WHO: How to handrub / handwash (PDF)', 'https://cdn.who.int/media/docs/default-source/patient-safety/how-to-handrub-poster.pdf', 'Poster resmi WHO untuk ditempel di lemari peralatan. Bahasa Inggris, gambar langkah demi langkah.', 2),
            T('Leaflet WHO: Hand hygiene — when and how (PDF)', 'https://cdn.who.int/media/docs/default-source/integrated-health-services-(ihs)/infection-prevention-and-control/hand-hygiene-when-and-how-leaflet.pdf', 'Selebaran singkat kapan cuci tangan dan kapan cukup hand rub.', 3)
          ], { soal:[
            b.soal('Setelah membersihkan toilet dan sebelum mengelap meja dapur, yang benar adalah…', ['Cukup ganti lap','Lepas sarung tangan, cuci tangan dengan sabun, ganti lap kode warna','Semprot hand rub ke sarung tangan','Lanjut saja bila sarung tangan masih dipakai'], 1, 'Sarung tangan bisa bocor; cuci tangan setelah melepasnya dan pindah ke lap kode warna dapur.'),
            b.soal('Cuci tangan dengan sabun dan air mengalir dianjurkan selama…', ['5 detik','10 detik','40–60 detik','5 menit'], 2, 'WHO: 40–60 detik untuk sabun & air; 20–30 detik untuk hand rub.'),
            b.soal('Hand rub berbasis alkohol boleh dipakai bila…', ['Tangan terlihat kotor/berminyak','Tangan tidak terlihat kotor','Setelah memegang chemical pekat','Tidak pernah'], 1, 'Bila tangan terlihat kotor, wajib sabun dan air.')
          ] })
        ] },
      { kode:'LMS-004', judul:'Ergonomi & angkat beban aman (manual handling)', level:'dasar', target:['semua'], jam:1, wajib:true, kompetensi:['Angkat beban','Postur','Tangga'], prasyarat:[], deskripsi:'Cedera pinggang adalah alasan cuti terbanyak petugas kebersihan. Cara mengangkat ember, galon chemical, mesin poles, dan memindahkan sofa tanpa melukai punggung — plus kapan wajib berdua.',
        modul:[
          b.modul('Teknik angkat yang benar', [
            V('Manual Handling — animated safety video', 'qNqB8YroUg0', 5, 'TECH EHS (bahasa Inggris, animasi mudah diikuti)'),
            b.bacaan('Enam kunci angkat beban (ringkasan Indonesia Safety Center)', '1. Rencanakan: ke mana beban dibawa, apakah jalur bebas hambatan, perlu bantuan?\n2. Kaki dekat beban, jarak antar kaki 20–30 cm, satu kaki sedikit di depan.\n3. Tekuk lutut, punggung tetap lurus, dagu terangkat — jangan membungkuk dari pinggang.\n4. Pegang beban dengan mantap, angkat dengan otot kaki, beban sedekat mungkin ke tubuh (zona hijau: antara bahu dan lutut).\n5. Jangan memutar badan saat membawa beban; putar dengan langkah kaki.\n6. Turunkan dengan menekuk lutut, bukan membungkuk.\n\nBatas praktis EXOCLEAN: > 20 kg atau beban canggung (sofa, kasur, galon 19 L di tangga) → berdua atau pakai troli. Mesin poles/vacuum basah: angkat dari pegangan, bukan selang.\n\nSumber: Indonesia Safety Center "6 Teknik Kunci Pengangkatan Manual yang Benar"; Media K3 Indonesia.', 5),
            T('Artikel: 6 Teknik Kunci Pengangkatan Manual yang Benar', 'https://indonesiasafetycenter.org/6-teknik-kunci-pengangkatan-manual-yang-benar/', 'Bacaan lengkap berbahasa Indonesia dengan ilustrasi.', 4)
          ], { soal:[
            b.soal('Saat mengangkat galon chemical 19 L dari lantai, yang benar…', ['Membungkuk dari pinggang lalu tarik','Tekuk lutut, punggung lurus, angkat dengan kaki, beban dekat tubuh','Angkat dengan satu tangan agar cepat','Putar badan sambil mengangkat'], 1),
            b.soal('Memindahkan sofa 3 dudukan untuk dibersihkan bawahnya sebaiknya…', ['Sendiri, dorong dengan punggung','Berdua atau pakai alat bantu; komunikasikan aba-aba','Tarik dari kain sandarannya','Tidak perlu dipindahkan, cukup vakum sekeliling'], 1)
          ] }),
          b.modul('Tangga & posisi kerja', [
            b.bacaan('Tangga, jangkauan tinggi, dan kerja jongkok', 'Tangga: kaki tangga di lantai kering dan rata, sudut ±75°, tiga titik kontak (dua kaki satu tangan), tidak berdiri di dua anak tangga teratas, tidak menjangkau menyamping — turun dan geser tangga.\n\nMengelap tinggi: pakai gagang teleskopik, bukan berjinjit di kursi plastik.\n\nKerja jongkok (nat, kerak kamar mandi): berlutut dengan pelindung lutut, ganti posisi tiap 10–15 menit, regangkan punggung.\n\nDorong lebih baik daripada tarik (troli, mesin poles) — beban ke otot kaki, bukan punggung.\n\nSumber: Kemnaker e-training K3 (penggunaan tangga portabel), Media K3 Indonesia.', 4)
          ], { soal:[ b.soal('Membersihkan kaca setinggi 3 m dari tangga, yang benar…', ['Berdiri di anak tangga teratas','Tiga titik kontak, tidak menjangkau menyamping, geser tangga bila perlu','Minta pelanggan memegang tangga sambil Anda melompat','Pakai kursi plastik'], 1) ] })
        ] },
      { kode:'LMS-005', judul:'P3K dasar di lokasi pelanggan', level:'dasar', target:['semua'], jam:1.5, wajib:false, kompetensi:['Luka & pendarahan','Cipratan chemical','Pingsan'], prasyarat:['LMS-001'], deskripsi:'Apa yang dilakukan dalam 3 menit pertama saat rekan tersayat kaca, mata terkena chemical, atau pelanggan lansia pingsan — sebelum bantuan datang. Wajib untuk pengasuh; dianjurkan semua mitra.',
        modul:[
          b.modul('Pertolongan pertama dasar', [
            V('Video edukasi: Pelatihan dasar pertolongan pertama pada kecelakaan', '15wBdjtHMP0', 12, 'Universitas Syiah Kuala'),
            V('Pelatihan P3K bersama PMI Kabupaten Bantul', 'vqVh5ijJwU0', 15, 'PMI Bantul · SDIT Assalaam Sanden'),
            b.bacaan('Empat kejadian paling mungkin di lokasi kerja', 'Luka sayat (kaca, pisau): tekan dengan kain bersih 5–10 menit tanpa dibuka-buka, angkat lebih tinggi dari jantung, bilas bila kotor, tutup plester. Pendarahan tidak berhenti 15 menit → IGD.\n\nChemical ke mata: bilas dengan air mengalir 15 menit, kelopak dibuka, jangan digosok; bawa label/kemasan chemical ke faskes.\n\nChemical ke kulit: lepas pakaian yang terkena, bilas 15 menit, jangan dinetralkan dengan bahan lain.\n\nPingsan/lemas: baringkan, kaki ditinggikan, longgarkan pakaian, jangan beri minum bila tidak sadar; tidak bernapas → hubungi 112/119 dan mulai RJP bila terlatih.\n\nSemua kejadian dilaporkan lewat aplikasi (tombol Darurat) dalam 1 jam.\n\nSumber: materi PMI Pertolongan Pertama; Kemnaker Permenaker 15/2008 P3K di tempat kerja.', 5)
          ], { soal:[
            b.soal('Cipratan pembersih kerak ke mata rekan. Tindakan pertama…', ['Tetesi obat mata','Bilas air mengalir 15 menit, kelopak dibuka, jangan digosok','Kompres dengan lap kering','Netralkan dengan sabun'], 1),
            b.soal('Luka sayat berdarah di telapak tangan. Yang benar…', ['Biarkan mengalir agar bersih','Tekan dengan kain bersih 5–10 menit, angkat lebih tinggi dari jantung','Taburi bubuk kopi','Ikat kencang di pergelangan'], 1)
          ] })
        ] },
      { kode:'LMS-103', judul:'Kamar mandi & toilet: kerak, disinfeksi, kode warna', level:'menengah', target:['cleaner'], jam:2, wajib:true, kompetensi:['Kerak & noda','Disinfeksi','Kode warna'], prasyarat:['LMS-101','LMS-102'], deskripsi:'Area dengan risiko silang tertinggi. Urutan bersih→kotor, pembersih asam ringan untuk kerak, disinfektan dengan waktu kontak, dan mengapa lap merah tidak boleh keluar dari toilet.',
        modul:[
          b.modul('Kode warna & pencegahan kontaminasi silang', [
            V('How to Color Code Towels for Cleaning', 'koLSWsdeJjE', 4, 'OctoClean (bahasa Inggris)'),
            V('Colour Coded Cleaning — Preventing Cross Contamination', '1UpYdodJzug', 3, 'Astral Hygiene (bahasa Inggris)'),
            b.bacaan('Kode warna EXOCLEAN', 'Merah = toilet & urinoir. Kuning = wastafel, shower, dinding kamar mandi. Hijau = dapur & area makanan. Biru = area umum (meja, kaca, perabot).\n\nSatu warna satu area, tidak pernah bertukar — bahkan bila lap "masih bersih". Lap kotor masuk kantong warna yang sama; dicuci terpisah 60 °C.\n\nUrutan kerja kamar mandi: kering dulu (debu, sampah) → tinggi ke rendah → bersih ke kotor (cermin, wastafel, shower, terakhir toilet) → lantai keluar pintu.\n\nSumber: praktik colour-coded cleaning (British Institute of Cleaning Science); SOP EXOCLEAN D-001.', 4)
          ], { soal:[ b.soal('Lap merah dipakai untuk…', ['Dapur','Toilet & urinoir saja','Semua area basah','Kaca'], 1), b.soal('Urutan yang benar di kamar mandi…', ['Toilet dulu karena paling kotor','Cermin → wastafel → shower → toilet → lantai','Lantai dulu','Acak, yang penting semua bersih'], 1) ] }),
          b.modul('Kerak, noda, dan disinfeksi', [
            V('Tips membersihkan kerak membandel di toilet umum', 'xgioH3DQwv4', 10, 'Zulaikha Pratiwy'),
            V('Cara ampuh membersihkan kamar mandi berkerak membandel', 'rgh4JZjuV-c', 12, 'Teri Raradini'),
            b.bacaan('Kerak kapur, kerak sabun, jamur — beda bahan, beda cara', 'Kerak kapur/air (putih, keras): pembersih asam ringan (asam sitrat/asam ringan komersial) 1:10, kontak 3–5 menit, sikat nilon, bilas. Jangan di marmer/batu alam — asam merusaknya; pakai pH netral.\n\nKerak sabun (berminyak, abu-abu): pembersih alkali/degreaser ringan, sikat, bilas.\n\nJamur hitam pada nat/silikon: disinfektan klorin 1:100, kontak 10 menit, bilas — ruangan berventilasi, tidak dicampur pembersih asam (gas klorin!).\n\nDisinfeksi bukan sekadar semprot: permukaan harus bersih dulu, disinfektan didiamkan sesuai waktu kontak label (umumnya 5–10 menit), baru dilap.\n\nSumber: SOP EXOCLEAN B-006; label produsen; Kompas "8 bahan pembersih yang tidak boleh dicampur".', 5)
          ], { soal:[ b.soal('Kerak kapur di kloset dibersihkan dengan…', ['Pemutih klorin pekat','Pembersih asam ringan 1:10, kontak 3–5 menit, sikat, bilas','Degreaser dapur','Air panas saja'], 1), b.soal('Disinfektan bekerja bila…', ['Disemprot lalu langsung dilap','Permukaan bersih dulu, didiamkan sesuai waktu kontak label','Dicampur pembersih asam agar kuat','Dipakai tanpa bilas di area makanan'], 1) ] })
        ] },
      { kode:'LMS-104', judul:'Kaca, sofa & upholstery', level:'menengah', target:['cleaner'], jam:1.5, wajib:false, kompetensi:['Kaca tanpa bekas','Sofa kain','Noda'], prasyarat:['LMS-101'], deskripsi:'Dua hasil yang paling dilihat pelanggan: kaca tanpa garis dan sofa yang bersih tanpa bau lembap. Teknik squeegee, uji warna sebelum shampoo, dan pengeringan.',
        modul:[
          b.modul('Kaca & cermin tanpa bekas', [
            b.bacaan('Teknik squeegee', 'Basahi kaca dengan pembersih kaca bebas amonia (1:20) memakai washer/spons. Tarik squeegee dari atas ke bawah tumpang tindih 3–5 cm, lap karet squeegee tiap tarikan. Tepi dan sudut dikeringkan microfiber biru kering. Hindari saat kaca terpapar matahari langsung — larutan cepat kering meninggalkan garis.\n\nCermin: semprot ke lap, bukan ke cermin (cairan merembes ke lapisan perak). Kaca film: tanpa amonia, tanpa scraper.\n\nSumber: panduan Mitra10/GBP "cara membersihkan kaca jendela tanpa bekas"; SOP EXOCLEAN D-001.', 4)
          ], { soal:[ b.soal('Garis-garis tersisa di kaca paling sering karena…', ['Terlalu banyak air','Karet squeegee tidak dilap tiap tarikan dan kaca kena matahari langsung','Lap terlalu bersih','Kaca terlalu tebal'], 1) ] }),
          b.modul('Sofa kain & noda', [
            V('Tutorial cara membersihkan sofa kain', 'Lfkas2CXbtg', 8, 'Peso Widodo'),
            V('Tips & trick: bersihkan sofa kain yang dekil dengan mudah', 'RLveqiYd-jk', 7, 'ROx Project'),
            b.bacaan('Urutan: vakum → uji warna → shampoo → ekstraksi → kering', '1. Vakum seluruh permukaan termasuk celah (nozzle celah).\n2. Uji cairan di bagian tersembunyi 5 menit — luntur? berhenti, laporkan ke pelanggan.\n3. Shampoo upholstery pH netral, busa tipis, sikat lembut searah serat; jangan membanjiri (busa kering lebih aman dari air).\n4. Ekstraksi/angkat dengan vacuum basah atau lap microfiber bersih berulang.\n5. Keringkan dengan kipas/jendela terbuka; sofa lembap > 6 jam = bau dan jamur. Kode label: W = air, S = solvent saja, WS = keduanya, X = vakum saja.\n\nSumber: HydroClean "cara membersihkan sofa kain yang benar"; label perawatan tekstil.', 5)
          ], { soal:[ b.soal('Sebelum shampoo sofa kain, langkah yang tidak boleh dilewati…', ['Uji warna di bagian tersembunyi','Semprot pewangi','Membalik bantalan','Menambah air agar busa banyak'], 0), b.soal('Label perawatan "S" berarti…', ['Boleh air','Solvent kering saja, tanpa air','Vakum saja','Bebas'], 1) ] })
        ] },
      { kode:'LMS-105', judul:'Laundry & setrika ala profesional', level:'dasar', target:['cleaner'], jam:1.5, wajib:false, kompetensi:['Pemilahan','Setrika','Lipat seragam'], prasyarat:['LMS-002'], deskripsi:'Layanan laundry & setrika EXOCLEAN dinilai dari lipatan yang rapi dan seragam. Pemilahan warna/bahan, suhu setrika per kain, dan pola lipat ala laundry.',
        modul:[
          b.modul('Setrika & lipat', [
            V('Cara setrika pakaian agar ukuran sama · melipat rapi seperti di laundry', 'b5NEfxAeDw0', 9, 'Padang Mesin Laundry'),
            V('Tips dan cara setrika dan melipat baju gamis', 'R0tN2TLJC1U', 8, 'Yahman CN'),
            b.bacaan('Pemilahan, suhu, dan pola lipat', 'Pilah: putih / warna / gelap; handuk & seprai terpisah; kain halus (sutra, renda) di kantong jaring. Baca label: titik satu = 110 °C (sintetis, sutra), dua = 150 °C (wol, poliester campur), tiga = 200 °C (katun, linen).\n\nSetrika kemeja: kerah dari ujung ke tengah → bahu → lengan & manset → badan. Semprot air/pelicin tipis merata sebelum menyetrika.\n\nLipat: pakai pola karton 23 × 32 cm agar lebar lipatan seragam; tumpuk per jenis; pastikan kering sempurna sebelum dilipat (lembap = apek dan bekas lipatan).\n\nBarang tertinggal di saku (uang, kartu) → foto & laporkan, jangan disimpan.\n\nSumber: Padang Mesin Laundry; Fimela/Fitinline "menyetrika & melipat ala laundry"; SOP EXOCLEAN D-020.', 5)
          ], { soal:[ b.soal('Urutan menyetrika kemeja yang benar…', ['Badan → lengan → kerah','Kerah → bahu → lengan & manset → badan','Lengan → kerah → badan','Bebas'], 1), b.soal('Label setrika dengan satu titik berarti suhu…', ['200 °C','150 °C','110 °C','Tidak boleh disetrika'], 2) ] })
        ] },
      { kode:'LMS-501', judul:'Higiene pangan: 5 kunci keamanan pangan (WHO / BPOM)', level:'dasar', target:['jurumasak'], jam:2, wajib:true, kompetensi:['Kebersihan','Pisah mentah-matang','Suhu aman'], prasyarat:['LMS-003'], deskripsi:'Juru masak EXOCLEAN memasak di dapur pelanggan. Lima kunci WHO yang diadopsi BPOM: jaga kebersihan, pisahkan mentah dan matang, masak sampai matang, simpan pada suhu aman, pakai air dan bahan baku aman.',
        modul:[
          b.modul('Lima kunci keamanan pangan', [
            V('5 Kunci Keamanan Pangan — BPOM', 'P7l3n22a7dY', 4, 'Badan Pengawas Obat dan Makanan RI'),
            V('5 Kunci Keamanan Pangan Keluarga', 'JfjkNMq6fEU', 5, 'Klub Pompi BPOM'),
            V('Webinar Nasional: 5 Kunci Keamanan Pangan Keluarga bersama BPOM (opsional, panjang)', 'EQUSzRK361w', 60, 'Klub Pompi BPOM'),
            b.bacaan('Penerapan di dapur pelanggan', '1. Kebersihan: cuci tangan sebelum & selama memasak, setelah memegang daging mentah/telur; talenan dan pisau dicuci air panas + sabun.\n2. Pisahkan: talenan merah daging mentah, hijau sayur, putih matang; simpan daging mentah di rak bawah kulkas agar tidak menetes.\n3. Masak matang: daging, unggas, telur, seafood matang sempurna (unggas ≥ 74 °C bagian tengah); panaskan ulang sampai mendidih/beruap.\n4. Suhu aman: makanan matang tidak lebih dari 2 jam di suhu ruang; kulkas ≤ 5 °C; cairkan beku di kulkas, bukan di meja.\n5. Bahan aman: air matang/galon bersegel, buah-sayur dicuci air mengalir, periksa tanggal kedaluwarsa dan kemasan.\n\nAlergen: tanyakan alergi anggota keluarga sebelum memasak; catat di aplikasi.\n\nSumber: WHO "Five Keys to Safer Food"; BPOM & Kemenkes (Permenkes 2/2023 higiene sanitasi pangan).', 6)
          ], { soal:[ b.soal('Makanan matang boleh dibiarkan di suhu ruang paling lama…', ['30 menit','2 jam','6 jam','Semalaman bila ditutup'], 1), b.soal('Daging mentah di kulkas disimpan di…', ['Rak paling atas','Rak bawah, wadah tertutup, agar tidak menetes ke bahan lain','Pintu kulkas','Bersama sayur'], 1), b.soal('Mencairkan daging beku yang aman…', ['Di meja dapur semalaman','Di dalam kulkas atau air dingin mengalir','Dijemur','Di air panas'], 1) ] })
        ] },
      { kode:'LMS-601', judul:'Dasar pengasuhan bayi & anak yang aman', level:'dasar', target:['pengasuh'], jam:2, wajib:true, kompetensi:['Menggendong','Memandikan','Tidur aman','Keselamatan rumah'], prasyarat:['LMS-003','LMS-005'], deskripsi:'Pengasuh EXOCLEAN dipercaya menjaga yang paling berharga. Menggendong, memandikan, tidur aman, bahaya di rumah, dan batas: apa yang boleh dan tidak boleh dilakukan tanpa izin orang tua.',
        modul:[
          b.modul('Menggendong & memandikan', [
            V('Cara menggendong bayi baru lahir — dr. Dimple Nagrani, Sp.A', 'SU2WkOVl8LI', 6, 'HappyKids Parenting'),
            V('Cara memandikan bayi baru lahir yang benar', '3li13NOg8DI', 7, 'Teman Bumil dan Parenting'),
            V('Langkah-langkah memandikan bayi dengan aman di rumah', '4jzHVRicrlM', 6, 'Rumah Sakit Universitas Indonesia'),
            b.bacaan('Aturan yang tidak bisa ditawar', 'Bayi < 4 bulan: kepala & leher selalu ditopang; tidak pernah diguncang; tidak ditinggal di permukaan tinggi walau sedetik.\n\nMandi: air 37–38 °C (uji dengan siku), semua perlengkapan disiapkan dulu, satu tangan selalu memegang bayi, tidak pernah meninggalkan anak di air.\n\nTidur aman: telentang, kasur rata & keras, tanpa bantal/boneka/selimut tebal, tidak tidur bersama pengasuh di sofa.\n\nKeselamatan rumah: obat & chemical di atas jangkauan (pengasuh tidak membawa chemical EXOCLEAN ke area anak), stopkontak tertutup, air panas dispenser terkunci, tali gorden terikat, makanan kecil (anggur, kacang) dipotong.\n\nBatas: tidak memberi obat/suplemen apa pun tanpa instruksi tertulis orang tua di aplikasi; tidak memfoto anak; tamu tidak diizinkan masuk.\n\nSumber: IDAI (Ikatan Dokter Anak Indonesia) panduan perawatan bayi; RSUI; Skill Academy kelas persiapan baby sitter (silabus).', 6)
          ], { soal:[ b.soal('Suhu air mandi bayi yang aman…', ['30 °C','37–38 °C, diuji dengan siku','45 °C','Air keran langsung'], 1), b.soal('Posisi tidur bayi yang aman…', ['Tengkurap agar tidak tersedak','Miring dengan bantal','Telentang di kasur rata & keras tanpa bantal','Di sofa bersama pengasuh'], 2), b.soal('Anak demam dan orang tua tidak bisa dihubungi. Yang benar…', ['Beri parasetamol dari tas Anda','Kompres hangat, catat suhu, hubungi kontak darurat di aplikasi; obat hanya sesuai instruksi tertulis','Bawa ke tetangga','Abaikan sampai orang tua pulang'], 1) ] })
        ] }
    ];
    /* modul tambahan untuk kursus yang sudah ada */
    var tambahModul = {
      'LMS-101':[ b.modul('Video: dusting, sweeping, mopping, kaca & toilet (sumber terbuka)', [
        V('Cara dusting, sweeping, mopping, glass & toilet cleaning yang benar', 'Xr5FEw0S1zk', 12, 'Dutasukses Training'),
        b.bacaan('Yang dicocokkan dengan SOP D-001', 'Mopping: mulai dari sudut terjauh menuju pintu, pola angka 8 tumpang tindih, pel diperas sampai lembap (bukan basah), dua ember (larutan & bilas) — ganti air bila keruh. Dusting: atas ke bawah, lap microfiber dilipat 8 sisi, ganti sisi tiap permukaan. Sweeping: sapu lobby + dustpan, sudut dulu.\n\nVideo di atas memakai peralatan umum; di EXOCLEAN kode warna lap dan takaran chemical mengikuti SOP D-001 & B-006.', 3)
      ], { soal:[ b.soal('Mengepel dimulai dari…', ['Pintu masuk menuju dalam','Sudut terjauh menuju pintu, pola angka 8','Tengah ruangan','Mana saja'], 1), b.soal('Air pel diganti bila…', ['Setiap ruangan tanpa kecuali','Keruh/kotor','Tidak pernah, cukup tambah chemical','Setelah 5 ruangan'], 1) ] }) ],
      'LMS-102':[ b.modul('MSDS/LDKB & campuran yang dilarang (sumber terbuka)', [
        V('MSDS (Material Safety Data Sheet) bagian 1–4', 'D5KOuoOLa4Y', 10, 'EDU DAMKAR'),
        b.bacaan('Campuran yang menghasilkan gas beracun', 'Pemutih (klorin) + amonia (banyak pembersih kaca) → kloramin. Pemutih + asam (cuka, pembersih kerak/toilet) → gas klorin. Pemutih + alkohol → kloroform. Hidrogen peroksida + cuka → asam perasetat. Dua pembersih toilet berbeda → reaksi tak terduga.\n\nGejala: batuk, sesak, perih mata/tenggorokan, mual → keluar ke udara segar, lapor supervisor, ke faskes bila sesak berlanjut.\n\nAturan EXOCLEAN: satu chemical per permukaan, bilas sebelum ganti chemical, ruangan berventilasi, botol takar berlabel, tidak pernah mencampur di ember yang sama.\n\nMSDS/LDKB tiap chemical EXOCLEAN tersedia di aplikasi (Marketplace → produk) — bagian 2 (bahaya), 4 (P3K), 8 (APD).\n\nSumber: Kompas "8 bahan pembersih yang tidak boleh dicampur"; Indonesia Safety Center "Cara membaca MSDS".', 4),
        T('Artikel: Cara membaca MSDS pada bahan kimia', 'https://indonesiasafetycenter.org/cara-membaca-msds-pada-bahan-kimia/', 'Penjelasan 16 bagian LDKB dan simbol bahaya GHS berbahasa Indonesia.', 5)
      ], { soal:[ b.soal('Pemutih klorin dicampur pembersih kerak (asam) menghasilkan…', ['Busa lebih banyak','Gas klorin beracun','Pewangi','Tidak terjadi apa-apa'], 1), b.soal('Bagian MSDS yang memuat pertolongan pertama adalah bagian…', ['1','4','8','16'], 1) ] }) ],
      'LMS-201':[ b.modul('Video praktik cuci AC split (sumber terbuka)', [
        V('Cara mencuci AC sendiri — indoor & outdoor', 'C6Uavml2J6o', 10, 'Praja Wiratpa'),
        V('Tutorial service AC split duct', 's3hrpgA1SQk', 12, 'Agus Riyadi'),
        V('Cuci AC sendiri pakai alat murah', 'Jzqx1XVUdfM', 9, 'Balaxart Craft'),
        b.bacaan('Yang wajib di EXOCLEAN dan tidak selalu tampak di video', 'Matikan MCB (bukan hanya remote) dan uji dengan tespen. Pasang plastik pelindung & talang air sebelum menyemprot. Semprot evaporator searah sirip, tekanan rendah, hindari PCB/sensor/kabel — cairan evaporator (D-014) 1:5, kontak 5 menit, bilas. Outdoor: semprot dari dalam ke luar, jangan bengkokkan sirip. Setelah rakit: nyalakan 10 menit, cek suhu keluar (selisih ≥ 8 °C), tetesan air di indoor = talang belum benar. Foto sebelum/sesudah di aplikasi.', 4)
      ], { soal:[ b.soal('Sebelum menyemprot evaporator, yang wajib…', ['Matikan dari remote saja','Matikan MCB, uji tespen, pasang plastik pelindung & talang','Lepas semua kabel PCB','Semprot outdoor dulu'], 1) ] }) ],
      'LMS-401':[ b.modul('Video: pelayanan prima 3S (sumber terbuka)', [
        V('Pelayanan prima dengan 3S: senyum, salam, sapa', 'x9hlomBXf9g', 6, 'Neva Lita'),
        V('Tutorial inovasi pelayanan prima dan service excellence', 'R5jUms6wAtU', 14, 'Marketeers TV'),
        b.bacaan('3S versi EXOCLEAN', 'Senyum sebelum bel ditekan. Salam + nama: "Selamat pagi, Bu Dewi, saya Rangga dari EXOCLEAN untuk general cleaning jam 09.00." Sapa ulang di akhir: ringkas apa yang dikerjakan, tunjukkan foto sebelum/sesudah, tanyakan satu hal yang bisa lebih baik.\n\nKeluhan: dengar sampai selesai, ulangi intinya, minta maaf atas ketidaknyamanan (bukan mengaku salah sebelum dicek), tawarkan solusi dalam wewenang (kerjakan ulang area ≤ 30 menit) atau eskalasi ke supervisor lewat aplikasi — jangan berdebat, jangan menyalahkan rekan.', 3)
      ], { soal:[ b.soal('Pelanggan mengeluh lantai masih lengket. Respons pertama yang tepat…', ['"Itu karena lantainya memang begitu"','Dengarkan, ulangi intinya, minta maaf atas ketidaknyamanan, tawarkan pel ulang','Telepon supervisor sambil pelanggan menunggu','Diam dan pulang'], 1) ] }) ],
      'LMS-001':[ b.modul('Bacaan tambahan K3 (sumber terbuka)', [
        T('Kemnaker e-training: Menerapkan K3 di lembaga pelatihan kerja', 'https://e-training.kemnaker.go.id/belajarmandiri/modul/447/3284', 'Modul mandiri Kemnaker berisi video langkah penerapan K3: identifikasi bahaya, pengendalian risiko, APD, P3K, pemadam api ringan, tangga portabel.', 20),
        b.bacaan('APD per jenis tugas EXOCLEAN', 'General cleaning: sarung tangan nitril, sepatu tertutup anti-slip, masker bila berdebu. Kamar mandi/kerak: + kacamata pelindung. Chemical pekat (degreaser, klorin): + sarung tangan karet panjang, ventilasi. Cuci AC: + kacamata, sarung tangan, alas kaki kering, MCB mati. Poles lantai: + pelindung telinga bila > 85 dB, sepatu safety. Pengasuh & juru masak: tanpa chemical di area anak/makanan; celemek & hairnet untuk masak.', 3)
      ]) ]
    };
    var jalur = { 'JALUR-CLEANER':['LMS-003','LMS-004','LMS-103','LMS-104','LMS-105','LMS-005'], 'JALUR-TEKNISI':['LMS-003','LMS-004'], 'JALUR-SUPERVISOR':['LMS-003','LMS-004','LMS-005'], 'JALUR-STAF':['LMS-003'] };
    var jalurBaru = [
      { kode:'JALUR-PENGASUH', judul:'Jalur Pengasuh Bersertifikat', target:'pengasuh', kursus:['LMS-001','LMS-002','LMS-003','LMS-005','LMS-601'], deskripsi:'K3, etika, kebersihan tangan, P3K, lalu dasar pengasuhan bayi & anak yang aman.' },
      { kode:'JALUR-JURUMASAK', judul:'Jalur Juru Masak Rumahan', target:'jurumasak', kursus:['LMS-001','LMS-002','LMS-003','LMS-501'], deskripsi:'K3, etika, kebersihan tangan, lalu lima kunci keamanan pangan WHO/BPOM.' }
    ];
    return { rev:REV, kursus:kursus, tambahModul:tambahModul, jalur:jalur, jalurBaru:jalurBaru };
  }
  return { rev:REV, bangun:bangun };
})();
