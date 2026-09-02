/* ==========================================================================
   kurikulum.js — isi Syarat & Ketentuan Mitra dan materi pembelajaran
   --------------------------------------------------------------------------
   Dipisahkan dari seed.js supaya isinya mudah disunting tanpa menyentuh kode
   pembangkit data. Lima kursus wajib menjadi syarat sertifikasi mitra; kursus
   spesialisasi bersifat pilihan dan menambah kompetensi di profil.
   ========================================================================== */
var KURIKULUM = (function () {

  /* ================================================================ SYARAT & KETENTUAN */
  var SYARAT = [
    { id: 'sk1', judul: 'Status kemitraan, bukan hubungan kerja tetap',
      isi: 'Saya memahami bahwa saya bergabung sebagai <b>Mitra EXOCLEAN</b>, bukan karyawan tetap. ' +
        'Penugasan diberikan per pekerjaan sesuai jadwal yang saya sanggupi, dan pembayaran dihitung ' +
        'per pekerjaan yang selesai dan lulus verifikasi mutu.' },
    { id: 'sk2', judul: 'Data diri yang benar dan dapat dipertanggungjawabkan',
      isi: 'Saya menyatakan seluruh data yang saya isi — nomor identitas, foto kartu, kontak darurat, ' +
        'dan alamat tinggal — adalah <b>benar dan milik saya sendiri</b>. Pemalsuan data mengakibatkan ' +
        'pembatalan kemitraan tanpa kompensasi.' },
    { id: 'sk3', judul: 'Kepatuhan pada standar K3',
      isi: 'Saya bersedia mengikuti seluruh prosedur Keselamatan dan Kesehatan Kerja: memakai APD yang ' +
        'diwajibkan, mengikuti briefing sebelum bekerja, dan <b>menolak pekerjaan yang tidak aman</b> ' +
        'serta melaporkannya ke supervisor.' },
    { id: 'sk4', judul: 'Kehadiran dan ketepatan waktu',
      isi: 'Saya bersedia melakukan <b>check-in dan check-out dengan GPS</b> di lokasi kerja, hadir tepat ' +
        'waktu, dan memberi kabar ke supervisor paling lambat 12 jam sebelumnya bila berhalangan.' },
    { id: 'sk5', judul: 'Mutu pekerjaan dan dokumentasi',
      isi: 'Saya bersedia mengerjakan seluruh langkah checklist, mengunggah <b>foto sebelum dan sesudah</b>, ' +
        'serta menerima penilaian mutu (QC) dari supervisor. Bila hasil dinilai perlu perbaikan, saya ' +
        'bersedia mengerjakan ulang tanpa biaya tambahan bagi klien.' },
    { id: 'sk6', judul: 'Kerahasiaan dan etika di lokasi klien',
      isi: 'Saya berjanji menjaga kerahasiaan segala hal yang saya lihat di lokasi klien, tidak memotret ' +
        'selain untuk keperluan laporan pekerjaan, <b>tidak menyentuh barang pribadi klien</b>, dan tidak ' +
        'menerima pekerjaan sampingan langsung dari klien EXOCLEAN tanpa sepengetahuan perusahaan.' },
    { id: 'sk7', judul: 'Peralatan dan bahan',
      isi: 'Peralatan dan chemical yang dipinjamkan adalah milik EXOCLEAN. Saya bertanggung jawab ' +
        'merawatnya, mengembalikannya dalam kondisi baik, dan melaporkan kerusakan atau kehilangan ' +
        'sesegera mungkin.' },
    { id: 'sk8', judul: 'Pembayaran melalui rekening terdaftar',
      isi: 'Saya memahami bahwa pembayaran hanya dikirim ke <b>rekening atas nama saya sendiri</b> yang ' +
        'terdaftar di aplikasi, dan EXOCLEAN tidak pernah meminta uang, PIN, kata sandi, atau OTP ' +
        'dalam bentuk apa pun untuk proses pendaftaran maupun penugasan.' },
    { id: 'sk9', judul: 'Wajib lulus pembelajaran sebelum ditugaskan',
      isi: 'Saya memahami bahwa saya <b>belum dapat menerima penugasan</b> sebelum menyelesaikan seluruh ' +
        'kursus wajib di aplikasi dengan nilai minimal 80 dan berkas saya disetujui admin.' },
    { id: 'sk10', judul: 'Pengakhiran kemitraan',
      isi: 'Kemitraan dapat diakhiri oleh salah satu pihak dengan pemberitahuan. EXOCLEAN dapat ' +
        'menonaktifkan mitra yang melanggar ketentuan K3, terbukti memalsukan laporan, atau menerima ' +
        'komplain berat berulang dari klien.' }
  ];

  /* ================================================================ KURSUS */
  function m(judul, isi, tipe) { return { judul: judul, isi: isi, tipe: tipe || 'teks' }; }
  function s(soal, opsi, jawaban, pembahasan) {
    return { soal: soal, opsi: opsi, jawaban: jawaban, pembahasan: pembahasan };
  }

  var KURSUS = [
    /* ---------------------------------------------------------------- 1 */
    { kode: 'K3-DASAR', judul: 'Keselamatan & Kesehatan Kerja (K3) Dasar', ikon: '🦺',
      wajib: true, urutan: 1, durasiMenit: 25, nilaiMin: 80, masaBerlakuHari: 1095,
      deskripsi: 'Dasar keselamatan kerja yang wajib dipahami setiap mitra sebelum turun ke lapangan.',
      materi: [
        m('Kenapa K3 bukan formalitas',
          'Pekerjaan kebersihan terlihat sederhana, tetapi tiga penyebab kecelakaan paling sering di ' +
          'lapangan adalah <b>terpeleset di lantai basah</b>, <b>jatuh dari ketinggian</b>, dan ' +
          '<b>terpapar chemical</b>. Ketiganya bisa dicegah dengan prosedur yang sama setiap hari.\n\n' +
          'Aturan pertama EXOCLEAN: <b>tidak ada pekerjaan yang begitu mendesak sampai boleh dikerjakan ' +
          'dengan cara tidak aman.</b> Anda berhak menolak dan melapor ke supervisor.'),
        m('APD dan kapan memakainya',
          'APD (Alat Pelindung Diri) wajib disesuaikan dengan jenis pekerjaan:\n\n' +
          '• <b>Sarung tangan karet</b> — semua pekerjaan yang menyentuh chemical\n' +
          '• <b>Masker</b> — area berdebu, pekerjaan dengan chemical menyengat\n' +
          '• <b>Sepatu anti selip</b> — semua pekerjaan basah\n' +
          '• <b>Kacamata safety</b> — penyemprotan chemical, cuci fasad\n' +
          '• <b>Helm + full body harness</b> — wajib untuk semua pekerjaan ketinggian\n\n' +
          'APD yang rusak harus diganti, bukan dipakai terus. Laporkan ke supervisor.'),
        m('Rambu dan pengamanan area',
          'Sebelum mengepel atau membersihkan area publik, <b>pasang rambu lantai basah</b> di kedua ' +
          'arah jalur orang lewat. Untuk pekerjaan di atas kepala atau fasad, <b>barikade area bawah</b> ' +
          'agar tidak ada orang berjalan di bawah titik kerja.\n\n' +
          'Rambu dilepas hanya setelah lantai benar-benar kering.'),
        m('Bila terjadi kecelakaan',
          'Urutannya: <b>amankan diri → amankan korban → hubungi supervisor → dokumentasikan</b>.\n\n' +
          'Jangan memindahkan korban yang jatuh dari ketinggian kecuali ada bahaya lanjutan. ' +
          'Nomor kontak darurat Anda yang terdaftar di aplikasi akan dihubungi oleh EXOCLEAN — ' +
          'itulah sebabnya data tersebut wajib diisi dan selalu diperbarui.')
      ],
      kuis: [
        s('Anda diminta klien mengelap kaca luar lantai 3 dengan berdiri di kusen, tanpa harness. Apa yang benar?',
          ['Kerjakan cepat-cepat agar tidak lama berisiko', 'Tolak dan laporkan ke supervisor untuk dijadwalkan dengan alat yang sesuai',
           'Kerjakan bila klien bersedia bertanggung jawab', 'Minta rekan memegangi kaki Anda'], 1,
          'Pekerjaan ketinggian wajib memakai alat dan APD yang sesuai. Persetujuan klien tidak menghilangkan risiko jatuh.'),
        s('Kapan rambu lantai basah boleh dilepas?', ['Setelah selesai mengepel', 'Setelah lantai benar-benar kering',
          'Setelah 5 menit', 'Bila tidak ada orang lewat'], 1,
          'Risiko terpeleset ada selama lantai masih basah, bukan selama Anda masih mengepel.'),
        s('APD minimum untuk pekerjaan cuci toilet dengan chemical asam adalah…',
          ['Masker saja', 'Sarung tangan saja', 'Sarung tangan, masker, dan kacamata safety', 'Tidak perlu APD bila hati-hati'], 2,
          'Chemical asam berisiko mengenai kulit, saluran napas, dan mata sekaligus.'),
        s('Urutan yang benar saat rekan Anda terpeleset dan terluka:',
          ['Foto dulu untuk laporan, baru tolong', 'Amankan diri, amankan korban, hubungi supervisor, dokumentasikan',
           'Langsung antar pulang', 'Selesaikan pekerjaan dulu agar tidak molor'], 1,
          'Dokumentasi penting, tetapi keselamatan orang selalu didahulukan.'),
        s('Siapa yang dihubungi EXOCLEAN bila Anda mengalami kecelakaan kerja?',
          ['Klien di lokasi', 'Kontak darurat yang Anda daftarkan di aplikasi', 'Rekan satu tim', 'Tidak ada'], 1,
          'Karena itu kontak darurat wajib diisi dan diperbarui bila berubah.')
      ] },

    /* ---------------------------------------------------------------- 2 */
    { kode: 'SOP-BERSIH', judul: 'SOP Pembersihan & Penggunaan Chemical', ikon: '🧴',
      wajib: true, urutan: 2, durasiMenit: 30, nilaiMin: 80, masaBerlakuHari: 1095,
      deskripsi: 'Urutan kerja baku dan cara memakai chemical dengan aman serta hemat.',
      materi: [
        m('Urutan kerja: atas ke bawah, kering ke basah',
          'Selalu bersihkan <b>dari atas ke bawah</b> — plafon, dinding, perabot, baru lantai — supaya ' +
          'debu yang jatuh tidak mengotori area yang sudah bersih.\n\n' +
          'Dan <b>dari kering ke basah</b>: sapu/vakum dulu sampai bersih, baru mengepel. Mengepel di ' +
          'atas debu hanya membuat lumpur tipis dan meninggalkan bekas.'),
        m('Mengenal chemical dan pengencerannya',
          '• <b>Floor cleaner</b> — pembersih lantai harian, netral, aman untuk keramik & vinyl\n' +
          '• <b>Degreaser</b> — pelarut lemak, untuk dapur dan exhaust; jangan untuk marmer\n' +
          '• <b>Toilet bowl cleaner</b> — berbasis asam, khusus kerak kloset\n' +
          '• <b>Glass cleaner</b> — konsentrat, umumnya 1 : 20\n' +
          '• <b>Disinfektan</b> — membunuh kuman, butuh <i>contact time</i> (didiamkan) agar bekerja\n\n' +
          '<b>Lebih pekat tidak berarti lebih bersih.</b> Takaran yang salah membuat lantai lengket, ' +
          'meninggalkan residu, dan memboroskan biaya.'),
        m('Larangan mutlak: jangan mencampur chemical',
          'Jangan pernah mencampur <b>pembersih berbasis klorin (pemutih) dengan pembersih asam</b> — ' +
          'campurannya menghasilkan gas klorin yang berbahaya bila terhirup.\n\n' +
          'Jangan pula memindahkan chemical ke botol bekas minuman. Selalu pakai wadah berlabel jelas.',
          'peringatan'),
        m('Uji di area kecil dulu',
          'Untuk permukaan yang belum pernah Anda tangani — marmer, kayu, ACP berwarna, kain sofa — ' +
          '<b>uji chemical di area kecil yang tersembunyi</b> dan tunggu hasilnya sebelum mengerjakan ' +
          'seluruh permukaan. Satu menit pengujian mencegah kerusakan yang harus diganti perusahaan.')
      ],
      kuis: [
        s('Urutan membersihkan ruangan yang benar adalah…',
          ['Lantai dulu agar cepat kering', 'Dari atas ke bawah, kering ke basah',
           'Bagian yang paling kotor dulu', 'Bebas, yang penting selesai'], 1,
          'Membersihkan dari atas ke bawah mencegah area yang sudah bersih kembali kotor.'),
        s('Mencampur pembersih pemutih (klorin) dengan pembersih asam akan…',
          ['Membuat daya bersih dua kali lipat', 'Menghasilkan gas klorin yang berbahaya',
           'Menghemat chemical', 'Tidak berpengaruh apa-apa'], 1,
          'Ini salah satu penyebab keracunan paling sering pada pekerjaan kebersihan.'),
        s('Chemical yang TIDAK boleh dipakai pada lantai marmer:',
          ['Floor cleaner netral', 'Air bersih', 'Degreaser / pembersih berbasis asam kuat', 'Marble polish'], 2,
          'Asam kuat merusak dan membuat marmer kusam permanen.'),
        s('Anda akan mencuci sofa berbahan kain yang belum pernah ditangani. Langkah pertama:',
          ['Langsung shampoo seluruh permukaan', 'Uji chemical di area kecil tersembunyi lalu tunggu hasilnya',
           'Pakai chemical paling kuat agar sekali kerja', 'Tanya klien saja warnanya luntur atau tidak'], 1,
          'Uji di area kecil adalah standar sebelum menangani permukaan yang belum dikenal.'),
        s('Disinfektan bekerja optimal bila…', ['Langsung dilap setelah disemprot', 'Dibiarkan sesuai contact time sebelum dilap',
          'Dicampur floor cleaner', 'Disemprot sebanyak mungkin'], 1,
          'Disinfektan butuh waktu kontak tertentu untuk benar-benar membunuh kuman.')
      ] },

    /* ---------------------------------------------------------------- 3 */
    { kode: 'ALAT', judul: 'Pengenalan & Perawatan Alat Kebersihan', ikon: '🧹',
      wajib: true, urutan: 3, durasiMenit: 20, nilaiMin: 80, masaBerlakuHari: 1095,
      deskripsi: 'Memakai alat dengan benar agar hasil maksimal dan alat awet.',
      materi: [
        m('Alat dasar dan fungsinya',
          '• <b>Mop microfiber</b> — menyerap lebih baik dari kain biasa, wajib dibilas tiap ±20 m²\n' +
          '• <b>Ember pel ganda</b> — satu sisi air bersih, satu sisi air kotor. Jangan dibalik.\n' +
          '• <b>Squeegee</b> — karetnya harus rata dan tidak sobek; karet cacat meninggalkan garis\n' +
          '• <b>Kain microfiber berwarna</b> — pisahkan warna per area agar tidak silang kontaminasi\n\n' +
          'Aturan warna EXOCLEAN: <b>merah</b> toilet, <b>kuning</b> wastafel, <b>biru</b> perabot & kaca, ' +
          '<b>hijau</b> dapur.'),
        m('Mesin: vacuum, poles, dan blower',
          '<b>Vacuum wet & dry</b> — ganti mode dan filter sesuai kering/basah. Menyedot air dengan ' +
          'filter kering merusak motor.\n\n' +
          '<b>Floor polisher</b> — pad harus sesuai jenis lantai; salah pad bisa menggores permanen.\n\n' +
          '<b>Blower</b> — arahkan menyilang permukaan, bukan tegak lurus, agar pengeringan merata.\n\n' +
          'Semua mesin dicek kabelnya sebelum dipakai. <b>Kabel terkelupas = jangan dipakai</b>, lapor.'),
        m('Setelah pekerjaan selesai',
          'Alat yang dikembalikan kotor akan merugikan mitra berikutnya dan memperpendek umur alat:\n\n' +
          '1. Bilas mop dan kain, peras, jemur atau gantung — jangan disimpan dalam keadaan basah terlipat\n' +
          '2. Kosongkan dan bilas ember, keringkan\n' +
          '3. Lap bodi mesin, gulung kabel dengan rapi (jangan ditekuk tajam)\n' +
          '4. Kosongkan tangki vacuum dan bersihkan filter\n' +
          '5. Laporkan kerusakan lewat catatan lapangan di aplikasi'),
        m('Kehilangan dan kerusakan',
          'Alat adalah milik EXOCLEAN yang dipinjamkan. Kerusakan karena pemakaian wajar adalah ' +
          'tanggung jawab perusahaan. <b>Kerusakan karena kelalaian atau kehilangan wajib dilaporkan ' +
          'segera</b> — melaporkan lebih awal selalu lebih baik daripada ketahuan belakangan.')
      ],
      kuis: [
        s('Kain microfiber warna merah pada standar EXOCLEAN dipakai untuk…',
          ['Kaca', 'Perabot', 'Toilet', 'Dapur'], 2,
          'Pemisahan warna mencegah kontaminasi silang dari area paling kotor.'),
        s('Menyedot air memakai vacuum dengan filter kering akan…',
          ['Mempercepat pekerjaan', 'Merusak motor mesin', 'Membuat hasil lebih bersih', 'Tidak masalah'], 1,
          'Wet & dry vacuum harus diganti mode dan filternya sesuai jenis material yang disedot.'),
        s('Ember pel ganda dipakai dengan cara…',
          ['Dua-duanya diisi air bersih', 'Satu sisi air bersih, satu sisi air kotor',
           'Bergantian sesuai kebutuhan', 'Satu untuk chemical, satu untuk sampah'], 1,
          'Memisahkan air bersih dan kotor menjaga lantai benar-benar bersih, bukan sekadar dipindah kotorannya.'),
        s('Anda menemukan kabel floor polisher terkelupas sebelum mulai bekerja. Tindakan yang benar:',
          ['Bungkus lakban lalu pakai', 'Pakai hati-hati sambil menghindari bagian terkelupas',
           'Jangan dipakai dan laporkan ke supervisor', 'Pinjam kabel dari klien'], 2,
          'Kabel terkelupas berisiko sengatan listrik, terlebih di area basah.'),
        s('Cara menyimpan mop microfiber setelah dipakai:',
          ['Dilipat basah dan dimasukkan tas', 'Dibilas, diperas, lalu digantung atau dijemur',
           'Langsung dimasukkan ember', 'Dibiarkan di lokasi klien'], 1,
          'Mop yang disimpan basah dan terlipat menjadi bau dan berjamur.')
      ] },

    /* ---------------------------------------------------------------- 4 */
    { kode: 'LAYANAN', judul: 'Etika Pelayanan & Komunikasi dengan Klien', ikon: '🤝',
      wajib: true, urutan: 4, durasiMenit: 20, nilaiMin: 80, masaBerlakuHari: 1095,
      deskripsi: 'Cara bersikap di lokasi klien — sering menentukan kontrak diperpanjang atau tidak.',
      materi: [
        m('Anda adalah wajah EXOCLEAN',
          'Klien menilai perusahaan dari mitra yang mereka temui, bukan dari brosur. Tiga hal yang paling ' +
          'diingat klien: <b>datang tepat waktu</b>, <b>berpakaian rapi dan beratribut</b>, dan ' +
          '<b>menyapa lebih dulu</b>.\n\n' +
          'Saat tiba: lapor ke security atau penanggung jawab lokasi, sebutkan nama, perusahaan, dan ' +
          'pekerjaan yang akan dilakukan.'),
        m('Batas yang tidak boleh dilewati',
          '• Jangan menyentuh, memindahkan, atau membuka barang pribadi klien tanpa izin\n' +
          '• Jangan memotret apa pun selain untuk laporan pekerjaan\n' +
          '• Jangan membicarakan klien lain di lokasi klien\n' +
          '• Jangan menerima pekerjaan sampingan langsung dari klien EXOCLEAN\n' +
          '• Jangan menggunakan fasilitas klien (lift khusus, pantry, wifi) tanpa izin\n\n' +
          'Bila menemukan uang atau barang berharga, <b>jangan disentuh</b> — foto posisinya dan lapor ' +
          'ke penanggung jawab lokasi serta supervisor.', 'peringatan'),
        m('Menghadapi permintaan tambahan dan komplain',
          'Klien sering meminta pekerjaan di luar lingkup. Jawaban yang benar bukan "tidak bisa", ' +
          'melainkan: <i>"Baik Bapak/Ibu, itu di luar lingkup hari ini. Saya catat dan sampaikan ke ' +
          'supervisor agar dijadwalkan."</i>\n\n' +
          'Bila klien komplain di tempat: <b>dengarkan sampai selesai, jangan membantah, minta maaf atas ' +
          'ketidaknyamanannya, catat, dan sampaikan ke supervisor.</b> Jangan pernah berdebat atau ' +
          'menyalahkan rekan di depan klien.'),
        m('Serah terima pekerjaan',
          'Sebelum meninggalkan lokasi: rapikan alat, pastikan tidak ada barang tertinggal, kembalikan ' +
          'perabot ke posisi semula, dan <b>ajak penanggung jawab lokasi melihat hasil kerja</b>. ' +
          'Serah terima langsung mencegah komplain susulan dan mempercepat verifikasi.')
      ],
      kuis: [
        s('Klien meminta Anda sekalian membersihkan gudang yang tidak ada di lingkup pekerjaan. Jawaban terbaik:',
          ['Langsung kerjakan agar klien senang', 'Tolak dengan tegas karena tidak dibayar',
           'Catat permintaannya, sampaikan akan dijadwalkan lewat supervisor', 'Minta bayaran tambahan langsung ke klien'], 2,
          'Pekerjaan di luar lingkup harus lewat penjadwalan resmi, bukan kesepakatan pribadi.'),
        s('Anda menemukan dompet di meja saat membersihkan ruangan. Tindakan yang benar:',
          ['Simpan dan serahkan nanti ke security', 'Jangan disentuh, foto posisinya, lapor ke penanggung jawab lokasi dan supervisor',
           'Pindahkan ke laci agar aman', 'Abaikan saja'], 1,
          'Menyentuh barang berharga membuat Anda rentan dituduh. Melapor tanpa menyentuh melindungi Anda.'),
        s('Klien marah karena hasil pekerjaan dianggap kurang bersih. Sikap yang benar:',
          ['Jelaskan bahwa itu sudah sesuai prosedur', 'Salahkan rekan yang mengerjakan bagian itu',
           'Dengarkan sampai selesai, minta maaf atas ketidaknyamanannya, catat, lapor ke supervisor',
           'Diam dan langsung pulang'], 2,
          'Mendengarkan dan mengeskalasikan jauh lebih efektif daripada membela diri di tempat.'),
        s('Hal pertama yang dilakukan saat tiba di lokasi klien:',
          ['Langsung mulai bekerja agar cepat selesai', 'Lapor ke security/penanggung jawab dan sebutkan keperluan',
           'Cari colokan listrik', 'Foto lokasi'], 1,
          'Melapor lebih dulu adalah prosedur akses dan bentuk sopan santun profesional.'),
        s('Manakah yang DIPERBOLEHKAN?', ['Menerima order pribadi dari klien EXOCLEAN',
          'Memotret hasil kerja untuk laporan di aplikasi', 'Memakai wifi klien tanpa izin',
          'Membicarakan klien lain di lokasi'], 1,
          'Foto sebelum/sesudah untuk laporan justru diwajibkan; tiga lainnya melanggar ketentuan mitra.')
      ] },

    /* ---------------------------------------------------------------- 5 */
    { kode: 'APLIKASI', judul: 'Menggunakan Aplikasi EXOCLEAN di Lapangan', ikon: '📱',
      wajib: true, urutan: 5, durasiMenit: 15, nilaiMin: 80, masaBerlakuHari: 1095,
      deskripsi: 'Alur harian di aplikasi: check-in, checklist, foto, check-out, laporan.',
      materi: [
        m('Alur harian dalam enam langkah',
          '1. Buka menu <b>Tugas</b> dan pilih pekerjaan hari ini\n' +
          '2. Tiba di lokasi → tekan <b>Check-in</b> (GPS aktif)\n' +
          '3. Ambil <b>foto sebelum</b> sebelum mulai bekerja\n' +
          '4. Centang <b>checklist</b> sambil mengerjakan, bukan diborong di akhir\n' +
          '5. Ambil <b>foto sesudah</b> dan tulis catatan bila ada temuan\n' +
          '6. Tekan <b>Check-out</b>, lalu <b>Laporkan Selesai</b>'),
        m('Kenapa check-in GPS penting',
          'Check-in mencatat waktu dan titik lokasi Anda. Data ini dipakai untuk menghitung jam kerja, ' +
          'membuktikan kehadiran bila klien bertanya, dan <b>melindungi Anda</b> bila ada tuduhan tidak ' +
          'datang.\n\n' +
          'Bila GPS gagal (di basement atau sinyal buruk), check-in tetap bisa dilakukan dan aplikasi ' +
          'mencatat alasannya. Jangan menitipkan check-in ke rekan — itu pelanggaran.'),
        m('Foto sebelum & sesudah yang layak',
          'Foto adalah bukti kerja Anda dan dasar penilaian supervisor:\n\n' +
          '• Ambil dari <b>sudut yang sama</b> untuk sebelum dan sesudah\n' +
          '• Pastikan area <b>terang</b> dan objeknya jelas\n' +
          '• Foto bagian yang paling kotor, bukan yang paling mudah\n' +
          '• Minimal satu pasang per area utama\n\n' +
          'Foto yang buram atau tidak sebanding membuat verifikasi tertunda.'),
        m('Catatan lapangan dan temuan',
          'Gunakan kolom catatan untuk melaporkan hal di luar pekerjaan: keran bocor, kabel terkelupas, ' +
          'kerusakan perabot, atau area yang tidak bisa diakses. Catatan ini <b>melindungi Anda</b> agar ' +
          'kerusakan yang sudah ada sebelumnya tidak dianggap akibat pekerjaan Anda.')
      ],
      kuis: [
        s('Kapan foto "sebelum" diambil?', ['Setelah selesai bekerja', 'Sebelum mulai bekerja',
          'Saat istirahat', 'Kapan saja asal ada'], 1,
          'Foto sebelum harus menunjukkan kondisi awal — kalau diambil setelah bekerja, tidak ada gunanya.'),
        s('GPS tidak menangkap sinyal karena Anda di basement. Yang benar:',
          ['Jangan check-in sama sekali', 'Minta rekan check-in-kan dari luar',
           'Tetap check-in — aplikasi mencatat bahwa GPS tidak tersedia', 'Tunggu sampai sinyal muncul walau pekerjaan tertunda'], 2,
          'Aplikasi mengizinkan check-in tanpa koordinat dan mencatat alasannya. Menitipkan check-in adalah pelanggaran.'),
        s('Checklist sebaiknya dicentang…', ['Semua sekaligus di akhir pekerjaan',
          'Sambil mengerjakan setiap langkah', 'Sebelum mulai agar tidak lupa', 'Oleh supervisor saja'], 1,
          'Mencentang sambil bekerja membuat catatan waktunya akurat dan tidak ada langkah terlewat.'),
        s('Anda menemukan keran bocor yang bukan akibat pekerjaan Anda. Sebaiknya…',
          ['Diamkan, bukan urusan Anda', 'Perbaiki sendiri', 'Tulis di catatan lapangan dan lapor supervisor',
           'Beri tahu klien secara lisan saja'], 2,
          'Catatan tertulis di aplikasi melindungi Anda dari tuduhan menyebabkan kerusakan itu.'),
        s('Langkah terakhir setelah pekerjaan selesai di aplikasi:',
          ['Check-out lalu Laporkan Selesai', 'Langsung pulang', 'Menunggu supervisor datang', 'Menghapus foto agar hemat memori'], 0,
          'Laporan selesai memicu verifikasi supervisor dan perhitungan pembayaran Anda.')
      ] },

    /* ---------------------------------------------------------------- spesialisasi */
    { kode: 'KETINGGIAN', judul: 'Bekerja di Ketinggian & Rope Access', ikon: '🧗',
      wajib: false, urutan: 6, durasiMenit: 30, nilaiMin: 85, masaBerlakuHari: 730,
      deskripsi: 'Spesialisasi untuk pekerjaan fasad, cuci kaca gedung, dan rope access.',
      materi: [
        m('Siapa yang boleh bekerja di ketinggian',
          'Hanya mitra yang <b>lulus kursus ini</b>, <b>sehat</b> (tidak vertigo, tidak dalam pengaruh obat ' +
          'yang menyebabkan kantuk), dan <b>didampingi minimal satu rekan</b>. Bekerja sendirian di ' +
          'ketinggian dilarang tanpa pengecualian.'),
        m('Pemeriksaan alat sebelum naik',
          'Periksa satu per satu, setiap kali, tanpa terkecuali:\n\n' +
          '• <b>Harness</b> — jahitan utuh, gesper berfungsi, tidak ada serat putus\n' +
          '• <b>Tali utama & tali cadangan</b> — dua tali terpisah, tidak ada bagian terkelupas\n' +
          '• <b>Anchor point</b> — terpasang pada struktur bangunan, bukan pada pipa atau railing dekoratif\n' +
          '• <b>Karabiner</b> — kunci berfungsi, tidak retak\n\n' +
          'Alat yang meragukan tidak dipakai. Tidak ada toleransi "kelihatannya masih kuat".', 'peringatan'),
        m('Aturan saat bekerja',
          '• Selalu <b>dua titik pengaman</b> — tali kerja dan tali cadangan\n' +
          '• Barikade area bawah dan pasang penjaga bila jalur ramai\n' +
          '• Alat kerja diikat (<i>tethered</i>) agar tidak jatuh menimpa orang\n' +
          '• Berhenti bekerja bila <b>angin kencang, hujan, atau petir</b>\n' +
          '• Komunikasi dengan rekan di bawah setiap perpindahan bay'),
        m('Turun dan penutupan pekerjaan',
          'Turun perlahan dan terkendali. Setelah sampai bawah: lepas dan periksa ulang alat, gulung tali ' +
          'tanpa simpul, catat jam pemakaian, dan laporkan setiap gesekan atau kerusakan sekecil apa pun. ' +
          '<b>Alat rope access yang pernah menahan jatuh harus dipensiunkan</b>, tidak boleh dipakai lagi.')
      ],
      kuis: [
        s('Berapa titik pengaman minimum saat bekerja dengan rope access?',
          ['Satu, asal kuat', 'Dua — tali kerja dan tali cadangan', 'Tiga', 'Tidak ada ketentuan'], 1,
          'Sistem dua tali adalah standar rope access: bila satu gagal, satu lagi menahan.'),
        s('Anchor point boleh dipasang pada…', ['Pipa air', 'Railing dekoratif', 'Struktur bangunan yang dirancang menahan beban', 'Tiang antena'], 2,
          'Hanya struktur yang memang dirancang menahan beban yang boleh dijadikan anchor.'),
        s('Cuaca berubah menjadi angin kencang saat Anda sedang di lantai 8. Tindakan:',
          ['Percepat pekerjaan agar cepat selesai', 'Hentikan pekerjaan dan turun secara terkendali',
           'Lanjut karena tinggal sedikit', 'Tunggu di posisi sampai angin reda'], 1,
          'Angin kencang membuat posisi tidak stabil dan alat bisa terbentur struktur.'),
        s('Harness yang pernah menahan jatuh sebaiknya…', ['Dipakai lagi setelah dicuci', 'Dipakai untuk pekerjaan ringan saja',
          'Dipensiunkan dan tidak dipakai lagi', 'Diperbaiki jahitannya'], 2,
          'Beban kejut merusak serat di dalam yang tidak terlihat dari luar.'),
        s('Bekerja di ketinggian seorang diri…', ['Boleh bila pekerjaannya kecil', 'Boleh bila sudah berpengalaman',
          'Dilarang tanpa pengecualian', 'Boleh bila klien mengizinkan'], 2,
          'Bila terjadi sesuatu, tidak ada yang bisa menolong atau memanggil bantuan.')
      ] },

    { kode: 'AC', judul: 'Perawatan & Cuci AC', ikon: '❄️',
      wajib: false, urutan: 7, durasiMenit: 25, nilaiMin: 80, masaBerlakuHari: 730,
      deskripsi: 'Spesialisasi layanan cuci AC split, cassette, dan penanganan freon.',
      materi: [
        m('Jenis unit dan perbedaannya',
          '• <b>Split</b> — unit indoor di dinding + outdoor terpisah; paling umum di rumah & ruko\n' +
          '• <b>Cassette</b> — tertanam di plafon, panel bisa diturunkan; umum di kantor\n' +
          '• <b>Standing floor</b> — unit berdiri, kapasitas besar\n' +
          '• <b>Ducting / central</b> — satu unit melayani banyak ruang lewat saluran udara\n\n' +
          'Semakin besar unit, semakin panjang waktu kerja dan makin perlu survei sebelum penawaran.'),
        m('Urutan cuci AC split yang benar',
          '1. <b>Matikan aliran listrik dari MCB</b>, bukan sekadar remote\n' +
          '2. Buka casing indoor dan lepas filter\n' +
          '3. Pasang <b>jetting cover</b> dan lindungi dinding serta lantai\n' +
          '4. Semprot evaporator dengan mesin steam bertekanan, dari atas ke bawah\n' +
          '5. Cuci dan sikat filter sampai bersih, keringkan\n' +
          '6. Cuci blower indoor\n' +
          '7. Cuci kondensor unit outdoor\n' +
          '8. Bersihkan saluran pembuangan air (drainase)\n' +
          '9. Pasang kembali, nyalakan, cek suhu keluar dan kebocoran air'),
        m('Kesalahan yang paling sering dan akibatnya',
          '• <b>Tidak mematikan MCB</b> — risiko sengatan listrik dan korsleting PCB\n' +
          '• <b>Tekanan air terlalu tinggi ke evaporator</b> — sirip aluminium penyok, pendinginan turun\n' +
          '• <b>Jetting cover tidak rapat</b> — air kotor membasahi dinding dan plafon klien\n' +
          '• <b>Drainase tidak dibersihkan</b> — AC menetes beberapa hari kemudian dan klien komplain\n' +
          '• <b>Filter dipasang saat masih basah</b> — timbul bau apek', 'peringatan'),
        m('Freon: batas kewenangan mitra',
          'Pengecekan tekanan freon boleh dilakukan mitra yang lulus kursus ini. Namun <b>pengisian freon ' +
          'dan perbaikan kebocoran hanya boleh oleh teknisi bersertifikat</b> yang ditunjuk EXOCLEAN.\n\n' +
          'Bila menemukan indikasi kebocoran (unit tidak dingin walau sudah bersih, ada bunga es di pipa), ' +
          'catat di laporan dan sampaikan ke supervisor — jangan mengisi sendiri.')
      ],
      kuis: [
        s('Langkah pertama sebelum membuka casing AC indoor:',
          ['Matikan lewat remote', 'Matikan aliran listrik dari MCB', 'Lepas filter', 'Pasang jetting cover'], 1,
          'Remote hanya menghentikan operasi; listrik ke unit tetap mengalir dan berisiko.'),
        s('Akibat menyemprot evaporator dengan tekanan air terlalu tinggi:',
          ['AC jadi lebih dingin', 'Sirip aluminium penyok dan pendinginan menurun',
           'Hemat waktu tanpa efek', 'Filter jadi lebih bersih'], 1,
          'Sirip yang penyok menghambat aliran udara sehingga performa pendinginan turun.'),
        s('Klien komplain AC menetes tiga hari setelah dicuci. Penyebab paling mungkin:',
          ['Freon kurang', 'Saluran pembuangan air (drainase) tidak dibersihkan', 'Filter terlalu bersih', 'Casing longgar'], 1,
          'Drainase tersumbat membuat air kondensasi meluber keluar dari unit indoor.'),
        s('Anda menduga ada kebocoran freon. Tindakan yang benar:',
          ['Isi freon sendiri sampai dingin', 'Catat temuan di laporan dan sampaikan ke supervisor',
           'Tambal dengan lem', 'Sarankan klien beli AC baru'], 1,
          'Pengisian freon dan perbaikan kebocoran hanya boleh oleh teknisi bersertifikat yang ditunjuk.'),
        s('Fungsi jetting cover saat mencuci AC adalah…',
          ['Melindungi mesin steam', 'Menampung dan mengarahkan air kotor agar tidak membasahi ruangan',
           'Menahan filter', 'Menurunkan suhu unit'], 1,
          'Jetting cover yang tidak rapat membuat air kotor mengenai dinding dan plafon klien.')
      ] }
  ];

  return { SYARAT: SYARAT, KURSUS: KURSUS };
})();
