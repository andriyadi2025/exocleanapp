/* ==========================================================================
   i18n.js — pemilihan bahasa antarmuka
   --------------------------------------------------------------------------
   Kunci kamusnya adalah teks Bahasa Indonesia itu sendiri, jadi menerjemahkan
   satu bagian cukup dengan membungkusnya: I18N.t('Beranda'). Teks yang belum
   punya terjemahan dikembalikan apa adanya — tidak pernah kosong.

   CAKUPAN: yang diterjemahkan adalah *antarmuka* — menu, judul halaman, status,
   tombol, dan halaman Profil. Isi bisnis (nama layanan, nama produk, dokumen,
   dan pesan WhatsApp) sengaja tetap Bahasa Indonesia karena itu data yang
   dikirim ke klien dan tim di Indonesia.
   ========================================================================== */
var I18N = (function () {

  /* Bahasa yang tersedia. `rtl` menandai tulisan kanan-ke-kiri — bukan
     sekadar penataan huruf, karena seluruh tata letak ikut dicerminkan. */
  var BAHASA = [
    { id: 'en', asli: 'English', nama: 'English', bendera: '🇬🇧' },
    { id: 'id', asli: 'Bahasa Indonesia', nama: 'Indonesian', bendera: '🇮🇩' },
    { id: 'ms', asli: 'Bahasa Melayu', nama: 'Malay', bendera: '🇲🇾' },
    { id: 'zh', asli: '中文（简体）', nama: 'Chinese (Simplified)', bendera: '🇨🇳' },
    { id: 'zt', asli: '中文（繁體）', nama: 'Chinese (Traditional)', bendera: '🇹🇼' },
    { id: 'ja', asli: '日本語', nama: 'Japanese', bendera: '🇯🇵' },
    { id: 'ko', asli: '한국어', nama: 'Korean', bendera: '🇰🇷' },
    { id: 'th', asli: 'ไทย', nama: 'Thai', bendera: '🇹🇭' },
    { id: 'vi', asli: 'Tiếng Việt', nama: 'Vietnamese', bendera: '🇻🇳' },
    { id: 'tl', asli: 'Filipino', nama: 'Filipino', bendera: '🇵🇭' },
    { id: 'hi', asli: 'हिन्दी', nama: 'Hindi', bendera: '🇮🇳' },
    { id: 'bn', asli: 'বাংলা', nama: 'Bengali', bendera: '🇧🇩' },
    { id: 'ur', asli: 'اردو', nama: 'Urdu', bendera: '🇵🇰', rtl: true },
    { id: 'ar', asli: 'العربية', nama: 'Arabic', bendera: '🇸🇦', rtl: true },
    { id: 'fa', asli: 'فارسی', nama: 'Persian', bendera: '🇮🇷', rtl: true },
    { id: 'he', asli: 'עברית', nama: 'Hebrew', bendera: '🇮🇱', rtl: true },
    { id: 'tr', asli: 'Türkçe', nama: 'Turkish', bendera: '🇹🇷' },
    { id: 'es', asli: 'Español', nama: 'Spanish', bendera: '🇪🇸' },
    { id: 'pt', asli: 'Português', nama: 'Portuguese', bendera: '🇧🇷' },
    { id: 'fr', asli: 'Français', nama: 'French', bendera: '🇫🇷' },
    { id: 'de', asli: 'Deutsch', nama: 'German', bendera: '🇩🇪' },
    { id: 'it', asli: 'Italiano', nama: 'Italian', bendera: '🇮🇹' },
    { id: 'nl', asli: 'Nederlands', nama: 'Dutch', bendera: '🇳🇱' },
    { id: 'pl', asli: 'Polski', nama: 'Polish', bendera: '🇵🇱' },
    { id: 'ru', asli: 'Русский', nama: 'Russian', bendera: '🇷🇺' },
    { id: 'uk', asli: 'Українська', nama: 'Ukrainian', bendera: '🇺🇦' },
    { id: 'sw', asli: 'Kiswahili', nama: 'Swahili', bendera: '🇰🇪' }
  ];

  /* Bahasa bawaan aplikasi adalah INGGRIS — EXOCLEAN dipakai lintas negara,
     dan bawaan yang hanya dimengerti satu negara memaksa pengguna baru
     menebak isi menu sebelum sempat menggantinya. */
  var BAWAAN = 'en';
  var aktif = BAWAAN;

  var EN = {
    /* ---- peran & kerangka ---- */
    'Admin EXOCLEAN': 'EXOCLEAN Admin', 'Supervisor': 'Supervisor', 'Klien': 'Client',
    'Tenaga Kerja Lapangan': 'Field Crew', 'Keluar': 'Sign out', 'Menu': 'Menu',

    /* ---- grup menu ---- */
    'Ringkasan': 'Overview', 'Penjualan': 'Sales', 'Operasional': 'Operations',
    'Keuangan': 'Finance', 'Komunikasi': 'Communication', 'Master Data': 'Master Data',
    'CRM': 'CRM', 'Utama': 'Main', 'Dokumen': 'Documents', 'Tim': 'Team', 'Akun': 'Account',

    /* ---- halaman ---- */
    'Dashboard': 'Dashboard', 'Beranda': 'Home', 'Permintaan Masuk': 'Incoming Requests',
    'Penawaran': 'Quotations', 'Kalender Jadwal': 'Schedule Calendar', 'Order': 'Orders',
    'Komplain': 'Complaints', 'Invoice & Pembayaran': 'Invoices & Payments',
    'Laporan Bisnis': 'Business Report', 'WhatsApp Outbox': 'WhatsApp Outbox',
    'Tim & Pegawai': 'Team & Staff', 'Katalog Layanan': 'Service Catalogue',
    'Pipeline Prospek': 'Lead Pipeline', 'Agenda Follow-up': 'Follow-up Agenda',
    'Pelanggan 360°': 'Customer 360°', 'Kampanye WhatsApp': 'WhatsApp Campaign',
    'Pesanan Toko': 'Shop Orders', 'Transaksi': 'Transactions',
  'Keranjang belanja': 'Shopping cart', 'baru': 'new',
  'Urutkan': 'Sort by', 'Ketersediaan': 'Availability', 'Tarif': 'Pricing', 'Jenis': 'Type',
  'Toko': 'Store', 'Harga': 'Price', 'Kategori': 'Category',
  'Di bawah Rp100.000': 'Under Rp100,000', 'Rp100.000 – Rp500.000': 'Rp100,000 – Rp500,000',
  'Rp500.000 – Rp2 juta': 'Rp500,000 – Rp2m', 'Di atas Rp2 juta': 'Above Rp2m',
  'Reset': 'Reset', 'hasil': 'results', 'produk': 'products', 'layanan': 'services',
  'Paling sesuai': 'Best match', 'Harga terendah': 'Lowest price', 'Harga tertinggi': 'Highest price',
  'Nama A–Z': 'Name A–Z', 'Stok terbanyak': 'Most stock', 'Terbaru': 'Newest',
  'Semua toko': 'All stores', 'Toko Resmi EXOCLEAN': 'Official EXOCLEAN Store', 'Mitra Toko': 'Partner Store',
  'Semua ketersediaan': 'All availability', 'Tersedia': 'In stock', 'Stok menipis': 'Low stock',
  'Semua harga': 'All prices', 'Sedang diskon': 'On discount',
  'Semua kategori': 'All categories', 'Semua jenis': 'All types', 'Semua tarif': 'All pricing',
  'Layanan satuan': 'Individual service', 'Paket berlangganan': 'Subscription package',
  'Ada harga pasti': 'Fixed price', 'Perlu survei': 'Survey required',
  'Pesan layanan & pantau pesanan toko': 'Order services & track shop orders', 'Produk & Stok': 'Products & Stock',
    'Transaksi Pembayaran': 'Payment Transactions', 'Pengaturan Pembayaran': 'Payment Settings',
    'Pesan Layanan': 'Book a Service', 'Pekerjaan Saya': 'My Jobs', 'Tagihan': 'Bills',
    'Penilaian & Komplain': 'Ratings & Complaints', 'Ringkasan Aktivitas': 'Activity Summary',
    'Toko Perlengkapan': 'Supply Shop', 'Jadwal Tim': 'Team Schedule',
    'Monitoring Lapangan': 'Field Monitoring', 'Verifikasi Mutu': 'Quality Check',
    'Tim Saya': 'My Team', 'Tugas': 'Tasks', 'Riwayat': 'History', 'Absensi': 'Attendance',
    'Profil': 'Profile', 'Profil Saya': 'My Profile',

    /* ---- status: order ---- */
    'Dijadwalkan': 'Scheduled', 'Sedang Dikerjakan': 'In Progress',
    'Menunggu Verifikasi': 'Awaiting Verification', 'Selesai & Terverifikasi': 'Completed & Verified',
    'Perlu Perbaikan': 'Needs Rework', 'Dibatalkan': 'Cancelled',
    /* ---- status: invoice & bayar ---- */
    'Belum Dibayar': 'Unpaid', 'Dibayar Sebagian': 'Partially Paid', 'Lunas': 'Paid',
    'Jatuh Tempo': 'Overdue', 'Menunggu Pembayaran': 'Awaiting Payment', 'Berhasil': 'Successful',
    'Kedaluwarsa': 'Expired', 'Gagal': 'Failed', 'Dikembalikan': 'Refunded',
    /* ---- status: penawaran & permintaan ---- */
    'Draft': 'Draft', 'Menunggu Persetujuan': 'Awaiting Approval', 'Disetujui': 'Approved',
    'Ditolak': 'Rejected', 'Permintaan Baru': 'New Request', 'Survei Dijadwalkan': 'Survey Scheduled',
    'Sudah Ditawar': 'Quoted', 'Diproses': 'Processing',
    /* ---- status: toko & stok ---- */
    'Menunggu Konfirmasi': 'Awaiting Confirmation', 'Dikonfirmasi': 'Confirmed',
    'Sedang Dikemas': 'Being Packed', 'Dalam Pengiriman': 'Shipping', 'Diterima': 'Received',
    'Stok Aman': 'In Stock', 'Stok Menipis': 'Low Stock', 'Stok Habis': 'Out of Stock',
    /* ---- status: CRM & QC ---- */
    'Prospek Baru': 'New Lead', 'Sudah Dikontak': 'Contacted', 'Survei Lokasi': 'Site Survey',
    'Penawaran Terkirim': 'Quote Sent', 'Negosiasi': 'Negotiation', 'Menang': 'Won', 'Kalah': 'Lost',
    'Lulus QC': 'QC Passed', 'Baru': 'New', 'Pelanggan Baru': 'New Customer', 'Aktif': 'Active',
    'Pelanggan Setia': 'Loyal Customer', 'Dorman': 'Dormant', 'Perlu Perhatian': 'Needs Attention',
    'Terhubung': 'Connected', 'Tidak diangkat': 'No answer', 'Dijadwalkan ulang': 'Rescheduled',
    'Terkirim': 'Sent', 'Menunggu Dikirim': 'Queued',

    /* ---- tombol & kata umum ---- */
    'Simpan': 'Save', 'Batal': 'Cancel', 'Tutup': 'Close', 'Ubah': 'Edit', 'Hapus': 'Delete',
    'Tambah': 'Add', 'Lihat': 'View', 'Detail': 'Details', 'Kirim': 'Send', 'Cetak': 'Print',
    'Lihat semua': 'View all', 'Lihat rincian': 'View details', 'Mengerti': 'Got it',
    'Ya, lanjutkan': 'Yes, continue', 'Konfirmasi': 'Confirm', 'Cari': 'Search',
    'Semua': 'All', 'Belum ada data': 'No data yet', 'Nama lengkap': 'Full name',
    'Email': 'Email', 'Alamat': 'Address', 'Utama': 'Primary', 'Wajib diisi': 'Required',

    /* ---- halaman profil ---- */
    'Data Diri': 'Personal Details', 'Alamat Tersimpan': 'Saved Addresses',
    'Rekening Bank': 'Bank Accounts', 'Keamanan': 'Security', 'Preferensi': 'Preferences',
    'Bahasa': 'Language', 'Bahasa antarmuka': 'Interface language',
    'Notifikasi': 'Notifications', 'Ubah Kata Sandi': 'Change Password',
    'Kata sandi saat ini': 'Current password', 'Kata sandi baru': 'New password',
    'Ulangi kata sandi baru': 'Repeat new password',
    'Foto profil': 'Profile photo', 'Ganti foto': 'Change photo', 'Hapus foto': 'Remove photo',
    'Tambah Alamat': 'Add Address', 'Tambah Rekening': 'Add Bank Account',
    'Label alamat': 'Address label', 'Nama penerima': 'Recipient name',
    'No. telepon penerima': 'Recipient phone', 'Alamat lengkap': 'Full address',
    'Kota / Kabupaten': 'City / Regency', 'Kode pos': 'Postal code',
    'Patokan (opsional)': 'Landmark (optional)', 'Jadikan alamat utama': 'Set as primary address',
    'Jadikan rekening utama': 'Set as primary account', 'Nama bank': 'Bank name',
    'Nomor rekening': 'Account number', 'Atas nama': 'Account holder',
    'Promo untuk Anda': 'Offers for You', 'Program & Informasi': 'Programs & Information',
    'Salin kode': 'Copy code', 'Kode disalin': 'Code copied', 'Berlaku sampai': 'Valid until',
    'Belum ada promo': 'No offers yet', 'Simpan Perubahan': 'Save Changes',
    'Profil diperbarui': 'Profile updated', 'Bergabung sejak': 'Member since',
    'Terima notifikasi WhatsApp': 'Receive WhatsApp notifications',
    'Terima notifikasi email': 'Receive email notifications',
    'Ringkasan mingguan': 'Weekly summary',
    'Belum ada alamat tersimpan': 'No saved addresses',
    'Belum ada rekening tersimpan': 'No saved bank accounts',
    'Rumah': 'Home', 'Kantor': 'Office', 'Gudang': 'Warehouse', 'Lainnya': 'Other',

    /* ---- profil: keterangan & label statistik ---- */
    'Data diri, alamat, rekening & preferensi': 'Personal details, addresses, bank accounts & preferences',
    'Informasi dasar akun Anda': 'Basic information for your account',
    'Nama perusahaan (kosongkan bila perorangan)': 'Company name (leave blank if personal)',
    'Jabatan': 'Job title', 'No. WhatsApp': 'WhatsApp number',
    'Dipakai untuk semua notifikasi jadwal & tagihan.': 'Used for all schedule and billing notifications.',
    'Sekaligus dipakai untuk masuk ke aplikasi.': 'Also used to sign in to the app.',
    'Jenis bangunan utama': 'Primary building type',
    'Jadikan utama': 'Set as primary', 'alamat': 'addresses',
    'Tambahkan alamat agar tidak perlu mengetik ulang saat memesan layanan atau berbelanja.':
      'Add an address so you do not have to retype it when booking a service or shopping.',
    'Dipakai bila ada pengembalian dana atau kelebihan bayar.':
      'Used for refunds or overpayments.',
    'Dipakai untuk pembayaran gaji dan penggantian biaya lapangan.':
      'Used for payroll and reimbursement of field expenses.',
    'Nomor rekening hanya terlihat oleh Anda dan bagian keuangan EXOCLEAN. Kami tidak pernah meminta PIN, kata sandi m-banking, atau kode OTP lewat WhatsApp maupun telepon.':
      'Your account number is visible only to you and EXOCLEAN finance. We never ask for your PIN, mobile banking password, or OTP over WhatsApp or by phone.',
    'Minimal 6 karakter': 'At least 6 characters',
    'Informasi Akun': 'Account Information', 'Email masuk': 'Sign-in email', 'Peran': 'Role',
    'Status akun': 'Account status', 'Nonaktif': 'Inactive', 'Bergabung': 'Joined',
    'Sandi diubah': 'Password changed', 'belum pernah': 'never',
    'Catatan prototipe.': 'Prototype note.',
    'Kata sandi masih disimpan apa adanya di browser ini. Sebelum dipakai sungguhan, ganti dengan autentikasi server yang menyimpan sandi dalam bentuk hash — lihat bagian langkah berikutnya di README.':
      'Passwords are still stored as plain text in this browser. Before real use, replace this with server-side authentication that stores hashed passwords — see the next-steps section in the README.',
    'Bawaan aplikasi': 'App default',
    'Yang diterjemahkan adalah antarmuka: menu, judul halaman, status, tombol, dan halaman Profil. Nama layanan, nama produk, isi dokumen, dan pesan WhatsApp tetap Bahasa Indonesia karena itu data yang dikirim ke klien dan tim di Indonesia.':
      'Only the interface is translated: menus, page titles, statuses, buttons, and the Profile page. Service names, product names, document contents, and WhatsApp messages stay in Indonesian because that is the data sent to clients and crews in Indonesia.',
    'Pilih kabar apa saja yang ingin Anda terima': 'Choose which updates you want to receive',
    'Jadwal, pengingat, tagihan, dan hasil pekerjaan.': 'Schedules, reminders, bills, and job results.',
    'Salinan invoice dan dokumen penawaran.': 'Copies of invoices and quotation documents.',
    'Rekap pekerjaan dan tagihan setiap Senin pagi.': 'Job and billing recap every Monday morning.',
    'Rekap tugas, absensi, dan nilai QC setiap Senin pagi.': 'Task, attendance, and QC recap every Monday morning.',
    'Perubahan tersimpan otomatis.': 'Changes are saved automatically.',
    'Berlaku untuk layanan kebersihan maupun belanja di toko':
      'Valid for cleaning services and shop purchases alike',
    'Program internal dan informasi untuk tim EXOCLEAN':
      'Internal programmes and information for the EXOCLEAN team',
    'Promo baru akan muncul di sini.': 'New offers will appear here.',
    'Sisa kuota': 'Remaining quota', 'dari': 'of',
    'Sebutkan kode promo saat mengirim permintaan layanan atau tulis di catatan pesanan toko — admin akan menerapkannya pada penawaran/invoice Anda.':
      'Mention the promo code when sending a service request or write it in the shop order notes — admin will apply it to your quotation/invoice.',
    'Panduan Singkat Lapangan': 'Field Quick Guide',

    /* ---- berkas kepegawaian ---- */
    'Berkas Kepegawaian': 'Employment File', 'Kelengkapan Berkas': 'File Completeness',
    'Identitas Resmi': 'Official ID', 'Kartu identitas yang masih berlaku': 'A valid identity card',
    'Kontak Darurat': 'Emergency Contact', 'Tambah Kontak': 'Add Contact',
    'Alamat Tinggal Sekarang': 'Current Residential Address',
    'Data Identitas Resmi': 'Official ID Details', 'Ubah Data Identitas': 'Edit ID Details',
    'Jenis kartu identitas': 'Identity card type', 'Nomor identitas': 'ID number',
    'Nama sesuai kartu': 'Name as printed on card', 'Tanggal lahir': 'Date of birth',
    'Alamat sesuai kartu': 'Address as printed on card', 'Nomor': 'Number',
    'Foto Kartu Identitas': 'Identity Card Photos', 'Unggah foto': 'Upload photo',
    'Foto kartu (tampak depan)': 'Card photo (front)', 'Swafoto memegang kartu': 'Selfie holding the card',
    'Ganti': 'Replace', 'Lihat': 'Show', 'Sembunyikan': 'Hide',
    'Berlaku seumur hidup': 'Valid for life', 'Segera kedaluwarsa': 'Expiring soon',
    'Sudah kedaluwarsa': 'Expired', 'Belum diisi': 'Not filled in',
    'Terverifikasi admin': 'Verified by admin', 'Menunggu verifikasi': 'Awaiting verification',
    'Hubungan dengan Anda': 'Relationship to you', 'Nomor telepon / WhatsApp': 'Phone / WhatsApp number',
    'Alamat (opsional)': 'Address (optional)', 'Jadikan kontak utama': 'Set as primary contact',
    'Kontak utama': 'Primary contact', 'Belum ada kontak darurat': 'No emergency contact yet',
    'Kelurahan / Desa': 'Urban village', 'Kecamatan': 'District', 'Provinsi': 'Province',
    'Status tempat tinggal': 'Residence status', 'Tinggal sejak': 'Living here since', 'Sejak': 'Since',
    'Sama dengan alamat di kartu identitas': 'Same as the address on the identity card',
    'Sama dengan alamat kartu': 'Same as card address', 'Alamat kartu': 'Card address',
    'Alamat kartu belum diisi.': 'Card address is not filled in yet.',
    'Ubah Alamat Tinggal': 'Edit Residential Address', 'Isi Alamat Tinggal': 'Fill in Residential Address',
    'Alamat tinggal belum diisi': 'Residential address not filled in',
    'Berkas Anda sudah lengkap.': 'Your file is complete.',
    'Terima kasih — data ini dipakai untuk asuransi kerja dan penanganan keadaan darurat.':
      'Thank you — this data is used for work insurance and emergency response.',
    'bagian terisi': 'sections filled', 'Belum terisi': 'Not yet filled',
    'Berkas kepegawaian belum lengkap': 'Employment file is incomplete',
    'Lengkapi sekarang': 'Complete it now',
    'Berkas yang lengkap diperlukan untuk klaim asuransi kerja dan agar tim dapat menghubungi keluarga Anda bila terjadi keadaan darurat di lapangan.':
      'A complete file is needed for work insurance claims and so the team can reach your family in a field emergency.',
    'Orang terdekat yang bisa kami hubungi bila terjadi sesuatu di lapangan':
      'Someone close to you we can reach if something happens in the field',
    'Isi minimal satu orang terdekat. Ini yang pertama kami hubungi bila terjadi kecelakaan kerja.':
      'Add at least one close contact. They are the first we call in a workplace accident.',
    'Tempat tinggal saat ini — boleh berbeda dengan alamat di kartu identitas':
      'Where you live now — may differ from the address on your identity card',
    'Dipakai untuk penugasan terdekat dan penjemputan tim saat pekerjaan dini hari.':
      'Used for nearest-assignment matching and crew pickup on early-morning jobs.',
    'Foto identitas di sini masih tersimpan di browser Anda sendiri. Untuk dipakai sungguhan, berkas seperti ini wajib disimpan di penyimpanan terenkripsi dengan kontrol akses dan jejak audit — bukan di perangkat.':
      'ID photos here are still stored in your own browser. For real use, files like these must be kept in encrypted storage with access control and an audit trail — not on the device.',
    'Isi sesuai yang tertulis di kartu. Data ini dipakai untuk kontrak kerja, asuransi, dan syarat masuk area klien tertentu.':
      'Fill in exactly as printed on the card. This is used for employment contracts, insurance, and access requirements at certain client sites.',
    'KTP 16 digit • SIM 12–16 digit • Paspor 1 huruf + 6–8 angka':
      'ID card 16 digits • Driving licence 12–16 digits • Passport 1 letter + 6–8 digits',
    'Tulis persis seperti tercetak, termasuk gelar bila ada.':
      'Write it exactly as printed, including any titles.',
    'Kosongkan bila KTP seumur hidup.': 'Leave blank if the ID card is valid for life.',
    'Nama jalan, nomor rumah, blok, nama perumahan/gang.':
      'Street name, house number, block, housing estate or alley name.',
    'Membantu tim menjemput saat pekerjaan dini hari.': 'Helps the crew pick you up on early-morning jobs.',
    'Pastikan seluruh kartu terlihat, tidak silau, dan tulisannya terbaca.':
      'Make sure the whole card is visible, glare-free, and readable.',
    'Wajah dan kartu terlihat jelas dalam satu bingkai.': 'Face and card clearly visible in one frame.',
    'Data identitas tersimpan — menunggu verifikasi admin': 'ID details saved — awaiting admin verification',
    'Foto identitas diunggah — menunggu verifikasi admin': 'ID photo uploaded — awaiting admin verification',
    'Hapus foto identitas ini?': 'Delete this ID photo?', 'Foto dihapus': 'Photo deleted',
    'Hapus kontak darurat ini?': 'Delete this emergency contact?',
    'Kontak darurat diperbarui': 'Emergency contact updated',
    'Kontak darurat ditambahkan': 'Emergency contact added',
    'Kontak utama diperbarui': 'Primary contact updated', 'Kontak dihapus': 'Contact deleted',
    'Alamat tinggal tersimpan': 'Residential address saved',
    'Nomor telepon tidak valid': 'Invalid phone number', 'Ya, hapus': 'Yes, delete', 'tahun': 'years old',
    /* hubungan keluarga */
    'Suami': 'Husband', 'Istri': 'Wife', 'Orang Tua': 'Parent', 'Anak': 'Child',
    'Saudara Kandung': 'Sibling', 'Kerabat': 'Relative', 'Teman': 'Friend', 'Wali': 'Guardian',
    /* status tempat tinggal */
    'Milik sendiri': 'Owned', 'Kontrak / sewa': 'Rented', 'Kos': 'Boarding house',
    'Ikut keluarga': 'With family', 'Mess perusahaan': 'Company housing',

    /* ---- kata pendek pada kartu statistik ---- */
    'Pekerjaan': 'Jobs', 'Belanja toko': 'Shop purchases', 'Nilai transaksi': 'Transaction value',
    'Penilaian diberikan': 'Ratings given', 'Jam kerja': 'Work hours', 'Rata QC': 'Avg QC',
    'Sertifikat': 'Certificates', 'Tim dipegang': 'Teams led', 'Anggota': 'Members',
    'Verifikasi QC': 'QC verifications', 'Order berjalan': 'Active orders',
    'Pendapatan bulan ini': 'Revenue this month', 'Petugas': 'Crew',
    'selesai': 'completed', 'tercatat': 'logged', 'verifikasi': 'verifications',
    'belum ada': 'none yet', 'petugas': 'crew', 'terverifikasi': 'verified',
    'dilakukan': 'performed', 'terdaftar': 'registered', 'aktif': 'active',
    'hari ini': 'today', 'piutang': 'receivable', 'tidak ada piutang': 'no receivables', 'rata': 'avg',

    /* ---- peran & hak akses ---- */
    'Peran & Hak Akses': 'Roles & Permissions',
    'Atur menu dan aksi yang boleh dibuka tiap pegawai': 'Set the menus and actions each employee may open',
    'Sistem': 'System',
    'Peran akses': 'Access roles', 'Pegawai internal': 'Internal staff',
    'Penyesuaian pribadi': 'Personal adjustments', 'Pengelola akses': 'Access managers',
    'Daftar Peran': 'Roles', 'Pegawai': 'Staff', 'Matriks Izin': 'Permission Matrix',
    'Peran baru': 'New role', 'Atur izin': 'Edit permissions', 'Salin': 'Duplicate',
    'Sesuaikan': 'Adjust', 'Kembalikan ke peran': 'Reset to role', 'Hapus peran': 'Delete role',
    'Izin efektif': 'Effective permissions', 'Penyesuaian': 'Adjustments', 'Kunci': 'Key',
    'Persona': 'Persona', 'berisiko': 'sensitive', 'bawaan': 'built-in', 'nonaktif': 'inactive',
    'beda dari peran': 'differs from role', 'mengikuti peran': 'follows the role',
    'pengelola akses': 'access manager', 'izin': 'permissions', 'pengguna': 'users',
    'Perubahan hak akses': 'Permission changes',
    /* nama modul izin (Penjualan/Keuangan/Komunikasi/Master Data sudah ada di atas) */
    'CRM & Pelanggan': 'CRM & Customers',
    'Operasional Lapangan': 'Field Operations',
    'Kemitraan & Pembelajaran': 'Partnership & Learning',
    'Sistem & Pengaturan': 'System & Settings',
    /* nama peran bawaan */
    'Super Admin (IT)': 'Super Admin (IT)', 'Admin Operasional': 'Operations Admin',
    'Admin Keuangan': 'Finance Admin', 'Admin Pemasaran & CRM': 'Marketing & CRM Admin',
    'Admin Marketplace': 'Marketplace Admin', 'Admin Kemitraan & Pelatihan': 'Partnership & Training Admin',
    'Supervisor Lapangan': 'Field Supervisor', 'Supervisor Senior': 'Senior Supervisor',

    /* ---- dompet & penarikan ---- */
    'Dompet': 'Wallet', 'Saldo, penarikan & riwayat': 'Balance, withdrawals & history',
    'Saldo tersedia': 'Available balance', 'Tarik Saldo': 'Withdraw',
    'Sedang diproses': 'Being processed', 'sudah dipotong dari saldo di atas': 'already deducted above',
    'Masuk bulan ini': 'In this month', 'Ditarik bulan ini': 'Withdrawn this month',
    'Rekening tujuan': 'Destination account', 'belum diatur': 'not set yet',
    'Riwayat Saldo': 'Balance History', 'Penarikan': 'Withdrawals', 'Ketentuan': 'Terms',
    'Belum ada mutasi': 'No transactions yet', 'saldo': 'balance',
    'Bagi hasil pekerjaan': 'Job revenue share', 'Bonus & insentif': 'Bonus & incentive',
    'Penarikan saldo': 'Balance withdrawal', 'Biaya transfer': 'Transfer fee',
    'Pengembalian dana': 'Refund', 'Penyesuaian saldo': 'Balance adjustment',
    'Menunggu diproses': 'Awaiting processing', 'Sedang ditransfer': 'Transfer in progress',
    'Dana terkirim': 'Funds sent',   /* Ditolak & Dibatalkan sudah ada di atas */
    'Nominal penarikan': 'Withdrawal amount', 'Diterima di rekening': 'Received in account',
    'Sisa saldo': 'Remaining balance', 'Penarikan diajukan': 'Withdrawal submitted',
    'Penarikan minimal': 'Minimum withdrawal', 'Batas per hari': 'Daily limit',
    'Jam proses': 'Processing hours', 'Perkiraan sampai': 'Estimated arrival',
    'Penarikan Mitra': 'Partner Withdrawals', 'Antrean pencairan saldo mitra': 'Partner payout queue',
    'Perlu diproses': 'Needs processing', 'Sudah ditransfer': 'Mark as transferred',
    'Total saldo mitra': 'Total partner balance', 'Dikirim bulan ini': 'Sent this month',

    /* ---- PIN & authenticator ---- */
    'PIN Transaksi': 'Transaction PIN', 'PIN transaksi': 'transaction PIN',
    'Buat PIN transaksi': 'Create transaction PIN', 'Ubah PIN transaksi': 'Change transaction PIN',
    'Masukkan PIN transaksi': 'Enter your transaction PIN',
    'PIN 6 angka yang Anda buat saat mendaftar': 'The 6-digit PIN you created at sign-up',
    'Lupa PIN?': 'Forgot your PIN?', 'Setujui penarikan': 'Approve withdrawal',
    'PIN baru': 'New PIN', 'Ulangi PIN baru': 'Repeat new PIN', 'Simpan PIN': 'Save PIN',
    'Authenticator': 'Authenticator', 'Pasang Authenticator': 'Set Up Authenticator',
    'Pasang Sekarang': 'Set Up Now', 'Aktifkan': 'Activate', 'Nanti saja': 'Later',
    'Kode dari authenticator': 'Code from your authenticator',
    'Verifikasi authenticator': 'Authenticator verification',
    'Simpan kode pemulihan Anda': 'Save your recovery codes',
    'Kode pemulihan': 'Recovery codes', 'Kode pemulihan baru': 'New recovery codes',
    'Sudah saya simpan': 'I have saved them', 'tersisa': 'remaining',
    'Masuk dari perangkat baru': 'Sign-in from a new device',
    'Perangkat yang dipercaya': 'Trusted devices', 'perangkat ini': 'this device',
    'Dipercaya sejak': 'Trusted since', 'Aktivitas terakhir': 'Last activity',
    'Cabut': 'Revoke', 'Keluarkan perangkat lain': 'Sign out other devices',
    'Simulasikan perangkat baru': 'Simulate a new device',
    'Aktivitas keamanan': 'Security activity', 'Keamanan akun': 'Account security',
    'kuat': 'strong', 'cukup': 'moderate', 'lemah': 'weak', 'lapis': 'layers',
    'Butuh bantuan masuk?': 'Need help signing in?',
    'Lupa email akun': 'Forgot account email', 'Lupa kata sandi': 'Forgot password',
    'Lupa PIN transaksi': 'Forgot transaction PIN', 'Email akun Anda': 'Your account email',
    'Setel ulang PIN': 'Reset PIN', 'Verifikasi': 'Verify', 'Batal masuk': 'Cancel sign-in',
    'Akun contoh': 'Demo account', 'berganti dalam': 'changes in', ' detik': ' seconds',

    /* ---- fungsi kerja & kompetensi ---- */
    'Fungsi Kerja': 'Work Functions', 'Fungsi Kerja Saya': 'My Work Functions',
    'Daftar Fungsi Baru': 'Register New Function',
    'Pilih pekerjaan yang ingin Anda jalani': 'Choose the work you want to do',
    'Fungsi Kerja & Kompetensi': 'Work Functions & Competency',
    'Peta kompetensi mitra & katalog layanan': 'Partner competency map & service catalogue',
    'Fungsi kerja aktif': 'Active work functions', 'Sedang ditempuh': 'In progress',
    'Layanan terbuka': 'Services unlocked', 'boleh menerima penugasan': 'may receive assignments',
    'jenis pekerjaan yang bisa Anda ambil': 'job types you can take',
    'Belum didaftarkan': 'Not registered', 'Menunggu onboarding selesai': 'Awaiting onboarding',
    'Sedang belajar': 'Studying', 'Siap ujian sertifikasi': 'Ready for certification exam',
    'Tersertifikasi': 'Certified', 'Sertifikat kedaluwarsa': 'Certificate expired',
    'Risiko rendah': 'Low risk', 'Risiko sedang': 'Medium risk', 'Risiko tinggi': 'High risk',
    'Mulai Belajar': 'Start Learning', 'Lanjut Belajar': 'Continue Learning',
    'Ikuti Ujian': 'Take the Exam', 'Ulangi Kursus': 'Retake Course',
    'Lihat Sertifikat': 'View Certificate', 'Daftar': 'Register', 'Batalkan': 'Cancel',
    'Rincian': 'Details', 'Layanan': 'Services', 'layanan': 'services',
    'Sertifikasi pembuka': 'Unlocking certification', 'Layanan yang terbuka': 'Services unlocked',
    'Peta Kompetensi': 'Competency Map', 'Per Mitra': 'Per Partner',
    'Katalog Layanan': 'Service Catalogue',
    'Fungsi tanpa mitra': 'Functions without partners', 'Belum berkompetensi': 'No competency yet',
    'mitra siap': 'partners ready', 'opsi pesanan': 'order options',
    'Sertifikasi Fungsi Kerja': 'Work Function Certification',
    'Pilih fungsi kerja': 'Choose a work function',
    'Belum ada fungsi kerja terdaftar': 'No work function registered yet',
    /* nama fungsi kerja */
    'Cleaning Service': 'Cleaning Service', 'Cuci Furnitur & Tekstil': 'Furniture & Textile Cleaning',
    'Perawatan AC': 'Air Conditioning', 'Poles Lantai': 'Floor Polishing',
    'Kerja Ketinggian & Fasad': 'Height Work & Façade',
    'Pest Control & Disinfektan': 'Pest Control & Disinfection',
    'Cuci & Detailing Kendaraan': 'Vehicle Wash & Detailing',
    'Gardener & Pertamanan': 'Gardening & Landscaping',
    'Plumbing & Sedot Toilet': 'Plumbing & Septic Service',
    'Laundry & Setrika': 'Laundry & Ironing', 'Care Giver': 'Care Giver',
    'Massage & Beauty Care': 'Massage & Beauty Care', 'Juru Masak': 'Cook',
    'Driver, Kurir & Pindahan': 'Driver, Courier & Moving',
    'Pelayanan Tamu & Pendampingan': 'Hospitality & Companion Services',

    /* ---- pendaftaran, verifikasi & akun sosial ---- */
    'Buat Akun EXOCLEAN': 'Create an EXOCLEAN Account', 'Daftar Sekarang': 'Sign Up',
    'Lanjutkan dengan Google': 'Continue with Google',
    'Lanjutkan dengan Facebook': 'Continue with Facebook',
    'Email atau nomor HP': 'Email or phone number', 'Nomor HP aktif': 'Active phone number',
    'atau': 'or', 'Pilih akun': 'Choose an account', 'Ini simulasi.': 'This is a simulation.',
    'Verifikasi': 'Verify', 'Verifikasi email': 'Verify email',
    'Verifikasi nomor HP': 'Verify phone number', 'Kirim ulang': 'Resend',
    'Tidak menerima kode?': 'Did not get the code?', 'Simulasi': 'Simulation',
    'Buat kata sandi': 'Create a password', 'Selesaikan Pendaftaran': 'Finish Sign-Up',
    'Lengkapi pendaftaran': 'Complete your sign-up', 'Akun Anda siap 🎉': 'Your account is ready 🎉',
    'Mulai': 'Get started',

    /* ---- berbagi ---- */
    'Bagikan': 'Share', 'Salin tautan': 'Copy link', 'Tautan disalin': 'Link copied',
    'Bagikan lain': 'More options',

    /* ---- afiliasi & dropship ---- */
    'Afiliasi': 'Affiliate', 'Dropship': 'Dropship',
    'Afiliasi & Dropship': 'Affiliate & Dropship',
    'Komisi rujukan & toko dropship Anda': 'Your referral commission & dropship store',
    'Kode rujukan Anda': 'Your referral code', 'Klik tautan': 'Link clicks',
    'Referral': 'Referrals', 'Komisi tertunda': 'Pending commission',
    'Total masuk saldo': 'Credited to balance', 'Riwayat komisi': 'Commission history',
    'Referral Anda': 'Your referrals', 'Masa lekat': 'Attribution window',
    'Tertunda': 'Pending', 'Masuk saldo': 'Credited', 'Dibatalkan': 'Cancelled',
    'Ikut Program Afiliasi': 'Join the Affiliate Program',
    'Daftar Jadi Dropshipper': 'Become a Dropshipper',
    'Produk di etalase': 'Products listed', 'Margin tertunda': 'Pending margin',
    'Harga dasar': 'Base price', 'Harga jual Anda': 'Your selling price', 'Margin': 'Margin',
    'Tambah Produk': 'Add Product', 'Riwayat margin': 'Margin history',
    'Markup minimum': 'Minimum markup', 'Markup maksimum': 'Maximum markup',
    'Menunggu persetujuan': 'Awaiting approval', 'Dinonaktifkan': 'Deactivated',
    'Peran Akun': 'Account Roles', 'Affiliate': 'Affiliate', 'Dropshipper': 'Dropshipper',
    'Mitra Lapangan': 'Field Partner', 'Mitra Toko': 'Shop Partner',
    'Pelajari & Daftar': 'Learn & Join', 'Buka Dasbor': 'Open Dashboard',
    'Ketentuan & Komisi': 'Terms & Commission', 'Peserta': 'Participants',
    'Setujui': 'Approve', 'Tolak': 'Reject',
    'Nonaktifkan': 'Deactivate', 'Aktifkan': 'Activate',
    /* ---- data kepegawaian ---- */
    'Pekerjaan ini sudah selesai — obrolannya ditutup.': 'This job is finished — the chat is closed.',
    'Obrolan dengan klien terbuka sejak Anda menerima order sampai pekerjaannya tuntas. Riwayatnya tetap bisa Anda baca. Bila masih ada yang perlu disampaikan, hubungi supervisor Anda.': 'Chat with the client is open from the moment you receive the order until the job is done. You can still read the history. If anything remains, contact your supervisor.',
    'Data pekerjaannya tidak ditemukan lagi.': 'The job data can no longer be found.',
    'Pusat Bantuan': 'Help Centre',
    'Pengaturan': 'Settings',
    'kendala pekerjaan': 'job issues',
    'Pembayaran, akun, dan aplikasi': 'Payments, account, and the app',
    'Jam layanan Senin–Sabtu 08.00–17.00 WIB.': 'Service hours Mon–Sat 08:00–17:00 WIB.',
    'Kontak admin belum tersedia pada data aplikasi.': 'No admin contact is available in the app data yet.',
    'Ada kendala di lapangan, pertanyaan soal pembayaran, atau butuh bantuan aplikasi? Hubungi kami lewat salah satu jalur di bawah.': 'Trouble on site, a question about payment, or need help with the app? Reach us through one of the channels below.',
    'Menu Lainnya': 'More Menu',
    'Tanggal berakhir kontrak': 'Contract end date',
    'bulan': 'months',
    'kurang dari sebulan': 'less than a month',
    'Data Kepegawaian': 'Employment Data',
    'Status Kerja': 'Employment Status',
    'Ditetapkan perusahaan — tidak dapat diubah sendiri': 'Set by the company — you cannot edit this',
    'Masa kerja': 'Length of service',
    'Nomor pegawai': 'Employee number',
    'Tanggal masuk': 'Start date',
    'Masa kontrak': 'Contract period',
    'Tanggal berhenti': 'End date',
    'Penempatan': 'Placement',
    'Lokasi / wilayah': 'Location / area',
    'Atasan langsung': 'Direct supervisor',
    'Jaminan Sosial & Pajak': 'Social Security & Tax',
    'Nomor disamarkan demi keamanan': 'Numbers are masked for safety',
    'BPJS Ketenagakerjaan': 'BPJS Employment',
    'BPJS Kesehatan': 'BPJS Health',
    'NPWP': 'Tax ID (NPWP)',
    'Kelengkapan Data': 'Data Completeness',
    'terisi': 'filled in',
    'belum diisi': 'not filled in',
    'Data kepegawaian sudah lengkap.': 'Employment data is complete.',
    'Ubah Data Kepegawaian': 'Edit Employment Data',
    'Data kepegawaian tersimpan': 'Employment data saved',
    'Kontrak kerja segera berakhir': 'Employment contract ending soon',
    'Kontrak kerja sudah berakhir': 'Employment contract has ended',
    'berakhir': 'ends',
    'tinggal': 'only',
    'hari lagi': 'days left',
    'hari lalu': 'days ago',
    'Hubungi admin untuk perpanjangan atau pengakhiran resmi.': 'Contact admin for renewal or formal termination.',
    'Ada yang keliru? Hubungi admin — data ini hanya bisa diubah oleh mereka.': 'Something wrong? Contact admin — only they can change this data.',
    'Kelengkapan ini tugas admin, bukan Anda — dipajang di sini supaya Anda tahu apa yang tercatat tentang diri Anda.': 'Completing this is admin work, not yours — it is shown here so you know what is on record about you.',
    'Lengkapi lewat tombol Ubah Data Kepegawaian di atas.': 'Complete it using the Edit Employment Data button above.',
    'Belum ada nomor yang tercatat. Untuk mitra lepas, pendaftaran jaminan sosial memang bukan kewajiban perusahaan.': 'No numbers on record yet. For freelance partners, social security registration is not a company obligation.',
    'Masa Percobaan': 'Probation',
    'Kontrak (PKWT)': 'Fixed-term contract',
    'Karyawan Tetap (PKWTT)': 'Permanent employee',
    'Harian Lepas': 'Daily casual',
    'Mitra Lepas': 'Freelance partner',
    'Sudah Berhenti': 'No longer employed',
    'Tiga bulan pertama, dievaluasi sebelum diangkat.': 'First three months, reviewed before confirmation.',
    'Perjanjian kerja waktu tertentu, ada tanggal berakhir.': 'Fixed-term agreement with an end date.',
    'Perjanjian kerja waktu tidak tertentu.': 'Open-ended employment agreement.',
    'Dibayar per hari kerja, tanpa ikatan waktu tertentu.': 'Paid per working day, with no fixed term.',
    'Bukan hubungan kerja — kemitraan per pekerjaan.': 'Not employment — a per-job partnership.',
    'Tidak lagi bekerja di EXOCLEAN.': 'No longer works at EXOCLEAN.',

    'Memuat…': 'Loading…',
    'data lama': 'legacy entry',
    'Kode pos terisi otomatis dari wilayah yang dipilih.':
      'Postal code is filled in automatically from the selected area.',
    'Kode pos diisi sendiri — daftar resmi untuk negara ini belum tersedia.':
      'Enter the postal code yourself — no official list is available for this country yet.',

    /* ---- menu & fitur yang lahir belakangan ----
       Sejak Inggris menjadi bahasa BAWAAN, celah di sini bukan lagi sekadar
       kurang rapi — ia langsung tampil sebagai menu berbahasa asing kepada
       pengguna yang tidak pernah memilih Bahasa Indonesia. */
    'Corong penjualan': 'Sales funnel',
    'Mitra & Rekrutmen': 'Partners & Recruitment',
    'Kemitraan': 'Partnership',
    'Pendaftaran, onboarding & persetujuan': 'Registration, onboarding & approval',
    'Pembelajaran (LMS)': 'Learning (LMS)',
    'Kursus, nilai & sertifikat': 'Courses, scores & certificates',
    'Bagi Hasil Mitra': 'Partner Revenue Share',
    'Estimasi periode, pencairan, dan skema': 'Period estimate, payout & scheme',
    'Marketplace': 'Marketplace',
    'Mitra toko, moderasi produk, kampanye & komisi': 'Store partners, product moderation, campaigns & commission',
    'Midtrans, Xendit, kanal & biaya': 'Midtrans, Xendit, channels & fees',
    'Komisi rujukan, dropshipper & aktivitas berbagi': 'Referral commission, dropshipping & sharing activity',
    'Akun & Login': 'Accounts & Sign-in',
    'Google, Facebook, dan verifikasi OTP': 'Google, Facebook & OTP verification',
    'Obrolan': 'Chat',
    'Obrolan Klien–Mitra': 'Client–Partner Chat',
    'Percakapan dengan mitra — tersimpan permanen': 'Conversations with partners — stored permanently',
    'Cari percakapan menurut nama, nomor dokumen, atau isi pesan — hanya dapat dibaca': 'Search conversations by name, document number or message content — read only',
    'Moderasi Percakapan': 'Chat Moderation',
    'Penyaring kata tidak pantas — melindungi klien dan mitra': 'Inappropriate-language filter — protects clients and partners',
    'Pengaturan Pengiriman': 'Shipping Settings',
    'Biteship — tarif kurir, pesanan kirim, dan pelacakan': 'Biteship — courier rates, shipment orders & tracking',
    'Poin Reward': 'Reward Points',
    'Ketentuan perolehan, jenjang, dan penukaran poin': 'Earning rules, tiers & point redemption',
    'Kumpulkan poin dari tiap transaksi, tukar jadi potongan': 'Earn points on every transaction, redeem them for discounts',
    'Voucher': 'Vouchers',
    'Tentukan jenis, nilai, harga, dan kuota voucher': 'Set voucher type, value, price and quota',
    'Beli, hadiahkan, tukar poin, dan klaim kode': 'Buy, gift, redeem points and claim codes',
    'Undian Berhadiah': 'Prize Draw',
    'Buka undian, pantau tiket, dan jalankan pengundian': 'Open draws, monitor tickets and run the drawing',
    'Grafik pemesanan layanan & pembelian produk': 'Chart of service bookings & product purchases',
    'Alat & chemical kebersihan': 'Cleaning tools & chemicals',
    'Penghasilan': 'Earnings',
    'Belajar': 'Learn',
    'Pendapatan': 'Income',
    'Bagi hasil per pekerjaan & riwayat pencairan': 'Revenue share per job & payout history',
    'Dashboard Toko': 'Store Dashboard',
    'Toko Saya': 'My Store',
    'Pesanan': 'Orders',
    'Produk Saya': 'My Products',
    'Keuangan Toko': 'Store Finance',
    'Saldo, komisi & pencairan': 'Balance, commission & payouts',
    'Iklan': 'Advertising',
    'Promosikan produk Anda': 'Promote your products',
    'Kampanye & Event': 'Campaigns & Events',
    'Profil Toko': 'Store Profile',
    'Country': 'Country',
    'Full address': 'Full address',
    'Landmark': 'Landmark',
    'Street, building number, floor, unit.': 'Street, building number, floor, unit.',
    'Helps the crew and courier find the place faster.': 'Helps the crew and courier find the place faster.',
    'Type to search area…': 'Type to search area…',
    'bahasa tersedia': 'languages available',
    'Search language…': 'Search language…',
    'No language matches that search.': 'No language matches that search.',
    'kanan ke kiri': 'right to left',
    'diterjemahkan': 'translated',
    'Angka persen menunjukkan berapa banyak antarmuka yang sudah punya padanan dalam bahasa itu. Bagian yang belum diterjemahkan tampil dalam Bahasa Inggris, bukan kosong. Nama layanan, nama produk, dan isi dokumen tetap apa adanya karena itu data, bukan antarmuka.': 'The percentage shows how much of the interface has been translated into that language. Anything not yet translated appears in English, never blank. Service names, product names and document contents stay as they are — those are data, not interface.'
  };

  /* Kamus per bahasa. KUNCInya tetap teks Bahasa Indonesia — itulah bahasa
     sumber kode ini ditulis. Mengganti seluruh kunci menjadi Inggris berarti
     menyentuh setiap baris di setiap berkas tampilan, dan satu salah ketik
     akan membuat teksnya lenyap tanpa jejak. Yang berubah adalah bahasa
     BAWAAN, bukan bahasa sumbernya.

     Kamus bahasa lain dimuat dari berkas terpisah (js/lang/*.js) yang
     menempelkan dirinya ke window.I18N_LANG — supaya menambah bahasa tidak
     pernah berarti menyentuh berkas ini lagi. */
  /* Sisa kamus Inggris tinggal di js/lang/en-extra.js. Isinya sama derajatnya
     dengan EN di atas — dipisah semata karena jumlahnya, supaya berkas ini
     tetap terbaca sebagai mesin bahasa dan bukan gudang teks. Digabungkan ke
     EN, bukan didaftarkan sebagai bahasa tersendiri: 'en' harus tetap satu
     kamus utuh, kalau tidak, jalur cadangan ke Inggris hanya akan menemukan
     separuhnya. */
  Object.assign(EN, window.I18N_EN_EXTRA || {});

  var KAMUS = Object.assign({ en: EN }, window.I18N_LANG || {});

  /**
   * Terjemahkan satu teks.
   *
   * Bertingkat: bahasa terpilih -> Inggris -> teks aslinya. Lapisan Inggris di
   * tengah itulah yang penting: bahasa yang baru sebagian diterjemahkan jatuh
   * ke Inggris, bukan ke Bahasa Indonesia yang tidak dimengerti penggunanya
   * sama sekali.
   */
  function t(teks) { return untuk(aktif, teks); }

  /**
   * Terjemahkan ke SATU bahasa tertentu, bukan ke bahasa yang sedang aktif.
   *
   * Ada karena t() menerjemahkan ke bahasa ORANG YANG SEDANG MEMBUKA
   * APLIKASI, dan itu jawaban yang salah untuk satu hal: pesan yang DIKIRIM
   * KELUAR — WhatsApp dan surel. Penerimanya bukan orang yang sedang
   * menekan tombol.
   *
   * Tanpa fungsi ini, membungkus pesan keluar dengan t() bukan perbaikan
   * melainkan cacat baru: admin yang memakai antarmuka Inggris menyetujui
   * seorang mitra, dan mitra itu menerima WhatsApp berbahasa Inggris yang
   * tidak ia mengerti. Yang lebih buruk lagi — dan itu sudah terjadi —
   * membungkus SEBAGIAN kalimatnya saja menghasilkan pesan campur dua
   * bahasa di tengah kalimat.
   *
   * Pemakainya wajib menyebut bahasa penerima, biasanya dari
   * BIZ.preferensi(penerima).bahasa.
   */
  function untuk(kode, teks) {
    if (teks == null) return teks;
    /* Bahasa sumbernya sendiri: tidak ada yang perlu dicari. */
    if (kode === 'id') return teks;
    var d = KAMUS[kode];
    if (d && d[teks] !== undefined) return d[teks];
    /* Inggris sebagai jaring: lebih banyak orang mengerti Inggris daripada
       Indonesia di luar Indonesia, dan teks yang belum berpadanan lebih baik
       tampil Inggris daripada kosong. */
    return EN[teks] !== undefined ? EN[teks] : teks;
  }

  /**
   * Bahasa yang dipahami seorang PENERIMA pesan.
   *
   * Dipisahkan supaya tiap pemanggil tidak menyusun rantai
   * `BIZ.preferensi(u).bahasa` sendiri-sendiri — rantai yang disalin ke dua
   * belas tempat akan berbeda di salah satunya, dan yang berbeda itu tidak
   * akan ketahuan sampai ada yang menerima pesan berbahasa asing.
   */
  function bahasaPenerima(u) {
    if (!u) return BAWAAN;
    if (typeof u === 'string') {
      u = (window.DB && DB.find) ? DB.find('users', u) : null;
    }
    if (!u) return BAWAAN;
    if (window.BIZ && BIZ.preferensi) return BIZ.preferensi(u).bahasa || BAWAAN;
    return (u.preferensi && u.preferensi.bahasa) || BAWAAN;
  }

  /**
   * Penerjemah TERIKAT satu penerima — dipakai menyusun pesan keluar.
   *
   *     var w = I18N.pesanUntuk(mitraId);
   *     w('Saldo sekarang:') + ' ' + U.rp(saldo)
   *
   * Bentuk terikat ini disengaja: sekali bahasanya ditentukan di atas, tidak
   * ada satu pun baris di bawahnya yang bisa lupa menyebutnya — dan lupa
   * pada satu baris saja sudah cukup untuk menghasilkan pesan dua bahasa.
   */
  function pesanUntuk(u) {
    var kode = bahasaPenerima(u);
    var w = function (teks) { return untuk(kode, teks); };
    /* Kodenya ikut dibawa karena ada yang tidak bisa dilayani `w`: nama
       bulan dan hari disimpan sebagai larik di utils.js, bukan sebagai
       kalimat, dan U.tglPanjang perlu tahu bahasanya — bukan menerima satu
       teks yang sudah jadi. Tanpa ini, surel Inggris yang seluruh
       kalimatnya benar tetap menuliskan “Due: 21 Des 2025”. */
    w.kode = kode;
    return w;
  }

  function info(kode) {
    var r = BAHASA[0];
    BAHASA.forEach(function (b) { if (b.id === (kode || aktif)) r = b; });
    return r;
  }

  function rtl(kode) { return !!info(kode || aktif).rtl; }

  /**
   * Pasang bahasa. Atribut lang dan dir ikut disetel pada <html> supaya
   * peramban memilih pemenggalan kata, urutan tanda baca, dan bentuk angka
   * yang benar — hal yang tidak bisa ditiru dengan CSS saja.
   */
  function set(kode) {
    aktif = (kode === 'id' || KAMUS[kode]) ? kode : BAWAAN;
    try {
      var h = document.documentElement;
      h.setAttribute('lang', aktif === 'zt' ? 'zh-Hant' : aktif);
      h.setAttribute('dir', rtl(aktif) ? 'rtl' : 'ltr');
    } catch (e) { /* dipanggil sebelum DOM siap */ }
    return aktif;
  }

  function get() { return aktif; }

  /**
   * Berapa persen antarmuka yang benar-benar punya padanan.
   *
   * Angka ini SENGAJA ditampilkan apa adanya. Bahasa yang baru 40% selesai
   * lebih baik dikatakan 40% daripada membiarkan pengguna menyimpulkan
   * sendiri bahwa aplikasinya rusak.
   */
  function cakupan(kode) {
    kode = kode || aktif;
    if (kode === 'id' || kode === 'en') return 100;
    var d = KAMUS[kode];
    if (!d) return 0;
    var total = Object.keys(EN).length;
    var ada = Object.keys(d).filter(function (k) { return EN[k] !== undefined; }).length;
    return Math.min(100, Math.round(ada / total * 100));
  }

  /** Bahasa peramban, dipakai sebagai tebakan awal bagi pengguna baru. */
  function tebakBahasa() {
    try {
      var l = (navigator.language || 'en').toLowerCase();
      if (l.indexOf('zh') === 0) return /hant|tw|hk|mo/.test(l) ? 'zt' : 'zh';
      var dua = l.slice(0, 2);
      return BAHASA.some(function (b) { return b.id === dua; }) ? dua : BAWAAN;
    } catch (e) { return BAWAAN; }
  }

  return { BAHASA: BAHASA, BAWAAN: BAWAAN, KAMUS: KAMUS, EN: EN,
    t: t, untuk: untuk, bahasaPenerima: bahasaPenerima, pesanUntuk: pesanUntuk,
    set: set, get: get, info: info, rtl: rtl, cakupan: cakupan,
    tebakBahasa: tebakBahasa };
})();
