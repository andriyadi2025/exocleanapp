/* ==========================================================================
   exo-admin-teks.js — bahasa antarmuka konsol admin (ID / EN)
   --------------------------------------------------------------------------
   Sakelar bahasa di header kanan atas konsol. Kamus ini menerjemahkan kerangka
   konsol: nama kelompok, label menu, judul & keterangan modul, tombol header.
   Isi tabel/kartu di dalam modul mengikuti bahasa penulisan aslinya (sebagian
   Inggris dari rancangan, modul baru berbahasa Indonesia) — diterjemahkan
   bertahap lewat kamus yang sama: tambahkan pasangan kunci → { id, en }.
   Pilihan tersimpan di localStorage 'exoclean_admin_lang' (bawaan 'id').
   ========================================================================== */
var EXO_ADMIN_TEKS = (function () {
  'use strict';
  var KUNCI = 'exoclean_admin_lang', lang = 'id';
  try { lang = localStorage.getItem(KUNCI) === 'en' ? 'en' : 'id'; } catch (e) { lang = 'id'; }
  var T = {
    /* kelompok */
    'Operasional':{ en:'Operations' }, 'Marketplace':{ en:'Marketplace' }, 'Pembelajaran & sertifikasi (LMS)':{ en:'Learning & certification (LMS)' }, 'Sertifikasi & kepatuhan':{ en:'Certification & compliance' }, 'Marketplace perlengkapan':{ en:'Supplies marketplace' }, 'Bayar & isi ulang (PPOB)':{ en:'Bills & top-up (PPOB)' }, 'H2H':{ en:'H2H' }, 'Kurir — Biteship':{ en:'Courier — Biteship' }, 'Bayar & isi ulang — Darmawisata':{ en:'Bills & top-up — Darmawisata' }, 'Perjalanan — Darmawisata':{ en:'Travel — Darmawisata' }, 'Mitra':{ en:'Partners' }, 'Accounting & Finance':{ en:'Accounting & Finance' }, 'HRD':{ en:'HR' }, 'IT':{ en:'IT' },
    /* menu */
    'Dashboard':{ id:'Dasbor' }, 'Live ops':{ id:'Operasi langsung' }, 'Orders':{ id:'Pesanan' }, 'Services & pricing':{ id:'Layanan & harga' }, 'SOP & QC':{ id:'SOP & QC' },
    'Inventaris & perlengkapan':{ en:'Inventory & supplies' }, 'CRM':{ id:'CRM' }, 'Complaint desk':{ id:'Meja keluhan' }, 'Promos & vouchers':{ id:'Promo & voucher' }, 'Poin & cashback':{ en:'Points & cashback' },
    'Cleaners & rekrutmen':{ en:'Cleaners & recruiting' }, 'Absensi & timesheet':{ en:'Attendance & timesheet' }, 'Jadwal & cuti':{ en:'Schedule & leave' }, 'Kinerja & sanksi':{ en:'Performance & sanctions' }, 'Pelatihan & sertifikasi':{ en:'Training & certification' },
    'Pembelajaran (LMS)':{ en:'Learning (LMS)' }, 'Payout mitra':{ en:'Partner payouts' }, 'Komunikasi tim':{ en:'Team communication' }, 'Claims & refunds':{ id:'Klaim & refund' },
    'Penggajian karyawan':{ en:'Staff payroll' }, 'Belajar saya':{ en:'My learning' }, 'Persetujuan & audit':{ en:'Approvals & audit' }, 'Keamanan':{ en:'Security' }, 'Roles & permissions':{ id:'Peran & izin' }, 'Admins & akun':{ en:'Admins & accounts' },
    'Integrasi & kunci':{ en:'Integrations & keys' }, 'Cadangan & data':{ en:'Backup & data' }, 'Appearance':{ id:'Tampilan' },
    /* judul modul (META) */
    'Persetujuan perubahan':{ en:'Change approvals' }, 'Payout mitra ':{ en:'Partner payouts' },
    /* keterangan modul (META sub) */
    'Jabodetabek · today, ':{ id:'Jabodetabek · hari ini, ' },
    '24 petugas di lapangan · peta armada dan status real time':{ en:'24 cleaners in the field · fleet map and real-time status' },
    '1.284 bookings this month':{ id:'1.284 pesanan bulan ini' },
    '412 aktif · 7 menunggu verifikasi · wajib 2 kontak darurat ber-OTP':{ en:'412 active · 7 awaiting verification · 2 OTP-verified emergency contacts required' },
    '24.180 customers · one timeline across booking, payment, chat and campaigns':{ id:'24.180 pelanggan · satu linimasa untuk pesanan, pembayaran, chat dan kampanye' },
    '87 dokumen terkontrol · SOP, checklist dan formulir yang dipakai mitra di lapangan':{ en:'87 controlled documents · SOPs, checklists and forms used by cleaners on site' },
    '9 open · every case has a named owner and a deadline':{ id:'9 terbuka · tiap kasus punya pemilik dan tenggat' },
    '12 open · 0 past deadline':{ id:'12 terbuka · 0 lewat tenggat' }, '5 codes · 2 live':{ id:'5 kode · 2 aktif' },
    'Aturan poin, tier dan cashback yang berlaku di aplikasi pelanggan':{ en:'Point, tier and cashback rules live in the customer app' },
    'Logo, colour and app name across every surface':{ id:'Logo, warna dan nama aplikasi di semua permukaan' },
    '8 roles · least-privilege by default':{ id:'8 peran · hak seminimal mungkin' }, '9 admins · 2FA enforced':{ id:'9 admin · 2FA wajib' },
    'GMV · pendapatan platform · dana ditahan · payout mitra · pajak · jurnal · laporan':{ en:'GMV · platform revenue · held funds · partner payouts · tax · journal · reports' },
    'Pengaju–penyetuju · tingkat risiko · berlaku tertunda · log berantai hash':{ en:'Maker–checker · risk tiers · delayed effect · hash-chained log' },
    'Clock-in/out ber-GPS dari aplikasi mitra · dasar upah & lembur':{ en:'GPS clock-in/out from the partner app · basis for wages & overtime' },
    'Ketersediaan mingguan mitra · cuti/izin disetujui lewat Persetujuan':{ en:'Weekly partner availability · leave approved via Approvals' },
    'Kurikulum wajib per fungsi · sertifikat & dokumen kepatuhan · pengingat kedaluwarsa':{ en:'Mandatory curriculum per role · certificates & compliance documents · expiry reminders' },
    'Rating, keluhan, inspeksi, ketepatan · poin pelanggaran 90 hari · penghargaan':{ en:'Ratings, complaints, inspections, punctuality · 90-day penalty points · rewards' },
    'Gaji kantor · BPJS · PPh 21 · payroll bulanan lewat Persetujuan (tinggi)':{ en:'Office salaries · BPJS · PPh 21 · monthly payroll via Approvals (high)' },
    'Stok chemical, alat, APD · permintaan dari lapangan (H-005) · PO lewat Persetujuan':{ en:'Chemical, tool, PPE stock · field requests (H-005) · POs via Approvals' },
    'Pengumuman ke aplikasi mitra · target per fungsi/kota · disetujui sebelum tayang':{ en:'Announcements to the partner app · targeted by role/city · approved before publishing' },
    'Konteks aman, login & PIN gagal, passkey, kontrol yang aktif · peristiwa autentikasi':{ en:'Secure context, failed logins & PINs, passkeys, active controls · authentication events' },
    'Status server pendamping & gateway · kunci publik klien · rahasia tetap di server/.env':{ en:'Companion server & gateway status · client public keys · secrets stay in server/.env' },
    'Ekspor/impor basis data lokal · reset · ukuran penyimpanan':{ en:'Export/import local database · reset · storage size' },
    'Kursus → modul → materi + kuis · level & prasyarat · jalur per fungsi · sertifikat otomatis · ala Coursera':{ en:'Course → module → lesson + quiz · levels & prerequisites · paths per role · automatic certificates · Coursera-style' },
    'Akademi EXOCLEAN untuk staf kantor — kursus, kuis, sertifikat':{ en:'EXOCLEAN Academy for office staff — courses, quizzes, certificates' },
    'Upah terhutang per mitra · batch pencairan lewat Persetujuan (dari Accounting & Finance)':{ en:'Wages owed per partner · payout batches via Approvals (from Accounting & Finance)' },
    /* tombol header (META aksi) */
    'New booking':{ id:'Pesanan baru' }, 'Reassign job':{ id:'Alihkan job' }, 'Create order':{ id:'Buat pesanan' }, 'Invite cleaner':{ id:'Undang petugas' }, 'Add service':{ id:'Tambah layanan' }, 'New segment':{ id:'Segmen baru' }, 'New document':{ id:'Dokumen baru' }, 'Log a complaint':{ id:'Catat keluhan' }, 'New claim':{ id:'Klaim baru' }, 'Create code':{ id:'Buat kode' }, 'Simulasi':{ en:'Simulate' }, 'Preview apps':{ id:'Pratinjau aplikasi' }, 'New role':{ id:'Peran baru' }, 'Invite admin':{ id:'Undang admin' },
    'Ekspor':{ en:'Export' }, 'Verifikasi rantai':{ en:'Verify chain' }, 'Cuti baru':{ en:'New leave' }, 'Kursus baru':{ en:'New course' }, 'Catat':{ en:'Record' }, 'Jalankan':{ en:'Run' }, 'PO baru':{ en:'New PO' }, 'Pengumuman':{ en:'Announcement' }, 'Uji':{ en:'Test' }, 'Uji koneksi':{ en:'Test connection' }, 'Ajukan batch':{ en:'Submit batch' }, 'Lanjutkan':{ en:'Continue' },
    /* header */
    'Search order, cleaner, customer…':{ id:'Cari pesanan, petugas, pelanggan…' }, 'Export':{ id:'Ekspor' },
    'Export queued — CSV lands in your inbox.':{ id:'Ekspor dijadwalkan — CSV dikirim ke email Anda.' }, ' — form opens in the full build.':{ id:' — formulir dibuka di versi lengkap.' },
    'Backend console':{ id:'Konsol backend' }, 'We clean all purpose':{ id:'We clean all purpose' },
    /* kartu profil */
    'Super admin':{ en:'Super admin' }, 'Supervisor':{ en:'Supervisor' }, 'Staf':{ en:'Staff' }, 'semua unit':{ en:'all units' }, 'Belum masuk':{ en:'Not signed in' }, 'gerbang terkunci':{ en:'gate locked' },
    'Menu ini tidak tersedia untuk peran/unit Anda.':{ en:'This menu is not available for your role/unit.' }
  };
  function t(s) { if (s == null) return ''; var e = T[s]; if (!e) return s; if (lang === 'en') return e.en || s; return e.id || s; }
  function set(k) { lang = k === 'en' ? 'en' : 'id'; try { localStorage.setItem(KUNCI, lang); } catch (e) { /* abaikan */ } try { document.documentElement.lang = lang; } catch (e) { /* abaikan */ } return lang; }
  function get() { return lang; }
  try { document.documentElement.lang = lang; } catch (e) { /* abaikan */ }
  return { t:t, set:set, get:get, T:T };
})();
