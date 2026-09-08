# EXOCLEAN App — marketplace pelanggan & mitra

Aplikasi ponsel EXOCLEAN: pelanggan memilih juru bersihnya sendiri, jadwal terkunci, pelacakan langsung, dompet, dan klaim jaminan bertanggal — ditambah sisi mitra (job, rute, SOP berfoto, penghasilan). Web murni tanpa proses build; dipasang sebagai PWA atau dibungkus menjadi APK Android lewat `../exo-android`.

## Cara menjalankan

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
```

lalu buka `http://localhost:8080/exo.html` (aplikasi), `exo-admin.html` (konsol backend), atau `exo-analisa.html` (analisa pasar).

| Berkas | Isi |
|---|---|
| `exo.html` | Aplikasi pelanggan + mitra |
| `exo-admin.html` | Konsol backend, 14 modul |
| `exo-analisa.html` | Analisa pasar & perbandingan layanan |
| `js/exo-util.js`, `exo-db.js`, `exo-foto.js`, `exo-roster.js`, `exo-zona.js`, `exo-wilayah.js` | Modul dasar milik EXOCLEAN App sendiri: pembantu, basis data lokal (`exoclean_app_db`), foto, roster & tarif, zona waktu, wilayah |
| `server/` | payment-server (Midtrans), auth-server (OTP, Google, Facebook), posisi-server (posisi mitra lintas perangkat) |
| `data/wilayah/` | Data wilayah Indonesia (Kepmendagri) dan ASEAN |

> EXOCLEAN App tidak berbagi kode, kunci penyimpanan, maupun skema data dengan aplikasi lain. Aplikasi manajemen operasional (MCS) adalah proyek terpisah di repositori **MCS EXOCLEAN**.

---

Dibangun ulang 2 Sep 2026 dari paket desain **"Mobile cleaning service app"**
(sistem Organic dengan aksen resmi logo #109080 / #70d0c0). Berkasnya:

| Berkas | Isi |
|---|---|
| `exo.html` | Aplikasi pelanggan + mitra, bingkai 412×892 dengan bilah lompat layar di layar lebar |
| `exo-admin.html` | Konsol backend marketplace, 14 modul |
| `css/exo.css`, `css/exo-admin.css` | Token teal, komponen, kerangka |
| `js/exo-brand.js` | Tampilan merek runtime (logo, warna, nama, running text) — dibaca kedua halaman |
| `js/exo-i18n.js` | Kamus 12 bahasa (en id ja ko zh ar ms th vi tl km my); Arab RTL |
| `js/exo-data.js` | 16 layanan, add-on, SOP per layanan, wilayah ASEAN/Kemendagri, ketentuan |
| `js/exo-core.js` | Keadaan, hitungan harga, penggambar |
| `js/exo-screens-customer.js`, `-customer2.js` | 20 layar pelanggan |
| `js/exo-screens-partner.js` | 7 layar mitra |
| `js/exo-sheets.js` | Lembar bawah, peta aksi, pemasangan |
| `js/exo-admin.js`, `js/exo-admin-views.js` | Konsol admin |

Tiga modul bersama tetap dipinjam **sebagai ALAT**: `ruang.js`, `utils.js`
(`compressImage`, `getGPS`), `foto.js` (lumbung foto IndexedDB). `db.js` +
`pasar.js` dibawa supaya roster yang tayang adalah mitra sungguhan.

**27 layar.** Pelanggan: onboarding, daftar (captcha → OTP → PIN), beranda
(running text, 9 ubin, quick book, prepaid), katalog 16 layanan, prepaid,
pemesanan 3 langkah, konfirmasi, pelacakan, laporan sebelum–sesudah, pesanan,
dompet, penilaian, klaim, bagikan/referral, ketentuan (4 tab), bahasa, profil.
Mitra: pendaftaran (alamat berjenjang + 2 kontak darurat ber-OTP + radius),
feed job, job berjalan, rute, checklist SOP (gerbang APD, langkah berurutan,
foto wajib), laporan foto, penghasilan, dompet & penarikan (rekening atas
nama sendiri + PIN).

**Aturan bisnis yang dipertahankan** (dari README paket desain): tarif =
`round(rate layanan × faktor petugas)`; satuan mengikuti layanan (m² kelipatan
4 mulai 12); voucher divalidasi sebelum bayar (min Rp150.000); biaya platform
flat Rp3.000; APD wajib per layanan sebelum langkah terbuka; langkah N
terkunci sampai N−1 selesai dan langkah berfoto tidak bisa ditutup tanpa foto
sebelum–sesudah; penarikan mitra hanya ke rekening atas nama sendiri + PIN.

**Yang tersambung konsol admin → aplikasi** (localStorage asal yang sama,
siap diganti endpoint): Appearance (logo, warna aksen, nama, running text),
Services (layanan dijeda hilang dari katalog), Promos (nominal & status
CLEAN25 dipakai keranjang), Poin & cashback (tersimpan). Orders, Cleaners,
dan Claims membaca tabel `orders`/`users`/`complaints` basis data EXOCLEAN
bila ada di asal yang sama; tanpa itu data contoh rancangan.

**Yang sudah sungguhan (2 Sep 2026, lanjutan):**

- **Alamat mitra** memakai `js/wilayah.js` + `data/wilayah/id/`
  (Kepmendagri 300.2.2-2138/2025: 38 provinsi, 514 kab/kota, 7.285 kecamatan,
  83.762 desa berikut kode pos) dan 56 negara lain. Daftar contoh hanya
  cadangan bila berkasnya gagal dimuat.
- **GPS mitra** dari perangkat (`U.getGPS`): jarak dan ETA ke alamat dihitung
  sungguhan; check-in hanya terbuka dalam radius 100 m (aturan desain).
  Posisi terakhir disimpan di asal yang sama sehingga layar pelacakan
  pelanggan di perangkat yang sama menampilkannya — pelacakan lintas
  perangkat masih butuh server posisi.
- **Pembayaran QRIS/VA/e-wallet/kartu** memanggil `server/payment-server.js`
  (Midtrans sandbox, port 4000) lewat `js/exo-server.js`; lembar pembayaran
  menampilkan nomor VA / QR dan memeriksa status. Bila server mati, aplikasi
  mengatakan itu simulasi.
- **OTP daftar** memanggil `server/auth-server.js` (port 4100). Provider SMS
  masih mode `log` — kode dibaca dari konsol server. Bila mati, simulasi.
- **Foto contoh** dari FOTO PROJECT (`assets/foto/`) di layar pembuka dan
  laporan sebelum–sesudah. Foto petugas belum ada.
- **Analisa pasar** (`exo-analisa.html`): dua dokumen dari paket desain,
  diperbarui mengikuti keadaan aplikasi; tautan di sidebar konsol admin.

**Lanjutan kedua (2 Sep 2026 sore):**

- **Checkout menulis tabel `orders`** basis data EXOCLEAN (bentuk mengikuti
  `BIZ.buatOrder`, status `dijadwalkan`, `sumber:'exo-app'`, petugas = id
  mitra sungguhan). Pelanggan marketplace dibuat sebagai baris `users` role
  client bila belum ada. Penilaian menulis `ratings` (rating petugas di
  marketplace dihitung dari sini), klaim menulis `complaints`. Hanya bila
  basis datanya ada di asal yang sama dan roster berasal dari DB.
- **Posisi mitra lintas perangkat** lewat `server/posisi-server.js`
  (port 4200, tanpa dependensi): ponsel mitra mengirim posisi GPS, layar
  pelacakan pelanggan menariknya tiap 5 detik. Tanpa server, jatuh ke posisi
  perangkat yang sama. Belum ada autentikasi per pesanan — cukup untuk uji
  jaringan lokal, bukan produksi.
- **Login Google/Facebook dan captcha Turnstile** tersambung ke SDK resmi dan
  diverifikasi `auth-server.js`, DIAKTIFKAN dengan mengisi kunci publik di
  `js/exo-config.js` (`googleClientId`, `facebookAppId`,
  `turnstileSiteKey`) berpasangan dengan rahasia di `server/.env`. Kosong =
  simulasi, dan tombolnya berlabel "simulated".
- **Foto profil mitra** diunggah dari Profil sisi mitra (256 px, disimpan
  per id di `exoclean_foto_mitra`) dan tampil di kartu petugas pelanggan.

Menjalankan server pendamping (dari `app/server/`): `npm run dev` (pembayaran),
`npm run dev:auth` (OTP & login sosial), `npm run dev:posisi` (posisi mitra).
`ALLOWED_ORIGINS` di `.env` harus memuat asal aplikasi (bawaan
http://localhost:8080).

**Alur transaksi per layanan (3 Sep 2026).** Hasil analisa bTaskee, KliknClean, Urban Company, Helpling, Laundryheap, dan Sejasa (tab *Alur transaksi* di `exo-analisa.html`, lengkap dengan sumber). Tiap layanan membawa kode alur di `ALUR` (`exo-data.js`): `langsung` (per jam/unit: jadwal terkunci → petugas mengonfirmasi ≤60 menit → dikerjakan → ditagih setelah selesai), `survei` (deep cleaning, poles, pasca renovasi, tangki gedung: survei gratis → penawaran harga tetap → disetujui & dibayar → jadwal terkunci), `timbang` (laundry: jemput → ditimbang → harga akhir disetujui → dicuci → diantar), `kontrak` (kantor, paket gedung: proposal → survei → kontrak → tagihan bulanan), `titip` (belanja: ongkos di muka → belanja → struk disetujui → diantar). Pekerjaan tambahan di lokasi diajukan mitra dan wajib disetujui pelanggan sebelum dikerjakan. Book 3, layar sukses, pelacakan (5 tahap per alur + kartu "Perlu keputusan Anda"), aplikasi mitra (formulir penawaran/timbang/struk/tambahan), daftar pesanan, basis data, dan status konsol admin mengikutinya. Penahanan dana di gateway untuk "ditagih setelah selesai" masih simulasi dompet.

**Merek sesuai Brand Guidelines EXOCLEAN 2023 (3 Sep 2026).** Warna aksen diganti ke warna resmi: tosca `#009183` (aksen utama, tangga 100–900 dihitung ulang), teal `#66cbc4` (aksen kedua), hitam merek `#333333` untuk teks; `exo-brand.js` menjadikan tosca pilihan bawaan konsol Appearance dan memigrasikan aksen lama `#109080` yang sudah tersimpan. Huruf mengikuti bab Typography: judul Baskerville, teks Seravek. Keduanya berlisensi komersial, jadi yang disematkan adalah padanan terbukanya — Libre Baskerville (400/700) dan Nunito Sans (variabel) dari Google Fonts, subset latin di `assets/fonts/`; nama aslinya tetap pertama di tumpukan font sehingga perangkat yang memilikinya memakai huruf asli. Logo tidak diubah: aplikasi sudah memakai logogram dan wordmark resmi (`exoclean-mark.png`, `exoclean-wordmark.png`). Ikon aplikasi (`icon-512/192.png`) dibuat ulang: logo versi putih di atas tosca dengan area aman 14%, dipakai juga untuk ikon Android. Font Caprasimo dan Figtree dihapus. SW VERSI v12.

**Aplikasi Android (3 Sep 2026).** Folder `../exo-android` membungkus EXOCLEAN App (sisi pelanggan dan mitra dari `exo.html`) dengan Capacitor 8 menjadi APK/AAB, meniru pola `mcs-android`. `siapkan-www.js` menyusun bundel dari daftar izin (tanpa `server/`, `.env`, `sw.js`, data contoh) dan memeriksa ulang isinya sebelum dibungkus; data wilayah hanya untuk negara ASEAN yang dilayani. Ikon dan splash dibangkitkan dari `assets/icon-512.png`; appId `id.exoclean.app`. Karena Android Studio 2026.1 membawa JBR 25 sedangkan Gradle 8.14 hanya mendukung sampai Java 24, JDK 21 portabel disimpan di `../alat` (tidak masuk repo) dan dipakai `bangun.ps1`. Build pertama berhasil: `app-debug.apk` 7 MB, 1.131 entri, 666 berkas web, tanpa berkas server. Belum diuji di perangkat.

**Katalog 21 layanan (3 Sep 2026).** Lima layanan ditambahkan menyusul dokumen analisa kompetitor ("Yang mereka punya, kita belum"): perawatan lansia/anak/pasien (`care`, per jam, minimal 4 jam), belanja & titip barang (`errand`, per trip), pijat & perawatan tubuh (`massage`, per sesi 60 menit), memasak & meal prep (`cook`, per jam, minimal 2 jam) dalam grup katalog baru *Perawatan & pribadi*, serta paket kebersihan berkala gedung (`building`, per bulan, bersurvei) di grup *Bisnis*. Tiap layanan lengkap: harga dan pita harga admin, add-on, ketentuan (termasuk/tidak/kami bawa/Anda sediakan) dalam 12 bahasa, SOP mitra (C-001–C-004, B-011), nama dan garansi 12 bahasa, unit baru `/trip`, `/session`, `/month`. Risiko dibatasi lewat ketentuan: pengasuh bukan tenaga medis, belanja dibuktikan struk (jaminan Rp1jt), pijat hanya kebugaran dengan terapis bersertifikat, memasak memakai bahan pelanggan. `exo-analisa.html` diperbarui (matriks layanan, KPI 21, status celah, catatan keputusan 3 Sep 2026).

**Zona waktu per kota (3 Sep 2026).** Jam pesanan EXOCLEAN mengikuti kota alamat, bukan jam ponsel. `exo-core.js` memakai `js/zona.js` (milik aplikasi manajemen) untuk menentukan zona dari provinsi alamat (WIB/WITA/WIT, termasuk Asia/Pontianak) atau tebakan nama kota; negara ASEAN lain memakai zona negaranya. Tujuh hari pilihan dihitung dari "hari ini" menurut kota pesanan; jam mulai ditampilkan berlabel zona ("09:00 WITA") dan, bila ponsel berada di zona lain, disertai padanannya ("di ponsel Anda 08:00 WIB"). Aturan 4 jam pada lembar pindah jadwal dihitung lewat UTC. Pesanan ke basis data kini menyimpan `wilayah` (dipakai wa.js untuk melabeli jam), `zona` (IANA), `mulaiUtc`, dan `selesaiUtc` di samping `tgl`/`mulai`/`selesai` jam dinding. Konsol admin memberi label zona pada kolom jadwal dan menilai filter "Today" menurut zona tiap pesanan. Cap obrolan, kedatangan mitra, dan foto SOP memakai jam kota pesanan. Diuji: Banten→WIB, Makassar→WITA (09:00 = 01:00Z, ponsel WIB 08:00), Jayapura→WIT, Pontianak→WIB, Malaysia→GMT+8.

**Ketentuan layanan & kebijakan privasi 12 bahasa (3 Sep 2026).** `js/exo-i18n-terms.js` memegang daftar 194 kalimat ketentuan (umum, prepaid, privasi, 16 layanan, tarif transport, judul kartu) dalam urutan tetap `EXO_TERMS.KUNCI`; tiap bahasa satu berkas `js/exo-i18n-terms-<kode>.js` (ja, ko, zh, ar, ms, th, vi, tl, km, my) yang memanggil `EXO_TERMS.pasang(kode, [194 baris])` — baris kosong jatuh ke Inggris, jumlah baris yang salah ditolak dengan peringatan konsol. Inggris dan Indonesia tetap di `exo-data.js` / `exo-i18n-str.js`. Subjudul tanggal berlaku dibentuk lewat Intl sesuai bahasa. Verifikasi: layar Ketentuan (4 tab + 16 layanan) dirender di 12 bahasa tanpa galat dan tanpa sisa teks Inggris selain nama layanan yang memang sama di kamus desain (id/ms/vi/tl). Khmer dan Burma perlu ditinjau penutur asli sebelum dijadikan dokumen mengikat; versi Inggris tetap rujukan hukum.

**Terjemahan (2 Sep 2026 malam).** `js/exo-i18n-str.js` melengkapi kamus: Bahasa Indonesia LENGKAP untuk seluruh teks pelanggan (285 teks, termasuk ketentuan layanan, kebijakan privasi, notifikasi, riwayat dompet, pesan sekilas); 11 bahasa lain untuk ±120 label, judul, tombol, dan pesan inti, sisanya jatuh ke Inggris. Penerjemah pasca-render di `exo-core.js` (`terjemahkanDOM`) mencocokkan setiap simpul teks dan atribut dengan kamus, sehingga teks dari data ikut berbahasa. Sisi mitra sengaja Bahasa Indonesia. Yang tidak diterjemahkan: nama orang, kode voucher, running text (isinya ditulis admin).

**Masih butuh dari pemilik, bukan kode:** kredensial Midtrans sandbox, provider
SMS/WhatsApp (sekarang mode log), Google client id, Facebook app id/secret,
Turnstile site/secret key, foto petugas asli. Verifikasi secret Turnstile di
server belum ada endpoint-nya.

Berkas lama (`exo.js` tunggal, palet krem) disimpan di `backup-exo-20260902/`.

#### Tarif pasar — siapa yang menetapkan

Yang tayang di marketplace adalah **mitra sungguhan dari basis data yang sama**,
bukan nama karangan. Tarif per jam tiap juru bersih ditetapkan **Super Admin**
di aplikasi manajemen MCS (repositori terpisah) → *Mitra & Rekrutmen* → buka mitranya → **Tarif pasar**, atau lewat konsol admin EXOCLEAN.
Aturannya, seluruhnya di `js/pasar.js`:

- Mitra **tanpa tarif tidak tayang**. Tidak ada tarif yang terisi sendiri —
  tarif tebakan yang terlanjur tayang adalah uang orang lain.
- Izinnya `mitra.tarif`, terpisah dari `mitra.setujui`: menyetujui mitra
  adalah keputusan mutu, menetapkan tarifnya keputusan harga. Bawaannya hanya
  dimiliki peran **Super Admin (IT)**.
- Batas yang diterima Rp30.000–Rp500.000; di luar itu ditolak sebagai
  kemungkinan salah ketik. Tiap perubahan tercatat siapa dan kapan.
- Bintang dan jumlah pekerjaan **dihitung** dari order selesai + tabel
  `ratings`, tidak disimpan. Yang belum pernah dinilai tertulis
  “not rated yet”, bukan diberi 5,0.
- Layanan per jam memakai tarif ORANGNYA; layanan per unit/kg/mobil memakai
  harga LAYANAN-nya — mencuci satu AC tidak berubah biayanya karena yang
  datang orang yang lebih senior.

Tanpa basis data EXOCLEAN di asal yang sama (mis. `exo.html` dibuka sendirian
lewat `file://`), aplikasi pelanggan memakai roster contoh dari rancangannya dan
tidak membuat basis data — lihat `adaBasisData()` di `js/exo-core.js`. Yang
membuat basis data adalah konsol admin `exo-admin.html` saat pertama dibuka.


## Penahanan dana & paket berkala (3 Sep 2026)

- **Pesanan instan tidak ditagih saat memesan.** Jumlahnya *ditahan* (pre-authorization) di EXO Wallet atau kartu, *ditangkap* setelah kunjungan dikonfirmasi selesai — termasuk tambahan yang disetujui pelanggan di lokasi — atau *dilepas* bila dibatalkan (dipotong biaya bila kurang dari 4 jam). Saldo dompet yang bisa dipakai = saldo − yang sedang ditahan. Kanal tanpa pre-auth (QRIS, VA, e-wallet) dicatat sebagai tagihan tertunda dan ditagih lewat gateway saat selesai. Server pembayaran: `POST /api/pay/authorize` (kartu Midtrans, `type: authorize`), `/api/pay/capture`, `/api/pay/cancel`.
- **Paket berkala** (mingguan −10 %, dua mingguan −7 %, bulanan −5 %) untuk layanan berulang (per jam, setrika, perawatan, memasak, kolam, pijat, mobil) dengan **komitmen minimal 4 kunjungan** (3 untuk bulanan): membatalkan paket sebelum itu menagih kembali diskon kunjungan yang sudah selesai; melewati satu kunjungan gratis; harga terkunci 3 bulan. Tiap kunjungan ditahan saat dijadwalkan dan ditagih setelah selesai. Data: `EXO_DATA.TAHAN_DANA`, `EXO_DATA.LANGGANAN`; keadaan: `penahanan`, `langganan`, `saldoTertahan`; pesanan di basis data membawa `exo.penahanan` dan `exo.langganan` (tampil di kolom Value/Service konsol admin).

## Keamanan (4 Sep 2026)

Audit dan pengerasan lengkap ada di [server/KEAMANAN.md](server/KEAMANAN.md): gerbang login konsol admin (PBKDF2, kunci percobaan, sesi idle), token per transaksi untuk status/capture/cancel, token tulis/baca server posisi, pembatas laju per IP, verifikasi Turnstile di server, header pengaman + CSP, validasi masukan, dan panduan server produksi (nginx, systemd, firewall, rahasia, cadangan, pemantauan). Uji otomatis: `node server/alat/uji-keamanan.js`.

## SOP dapat disunting admin dengan PIN persetujuan (7 Sep 2026)

Konsol admin → SOP & QC → "SOP layanan — dipakai aplikasi mitra": tiap SOP layanan (21) bisa disunting kapan pun (kode, judul, APD wajib, alat, chemical, langkah kerja berurutan dengan wajib foto). Menyimpan/menerbitkan, mengembalikan revisi lama, atau menarik revisi **wajib PIN persetujuan** 6 angka milik admin yang login (terpisah dari sandi masuk, dibuat pertama kali dengan konfirmasi sandi, salah 5 kali terkunci 15 menit). Revisi naik otomatis, riwayat lengkap tersimpan (`EXO_DB` tabel `sop`), dan aplikasi mitra memakai revisi terbit seketika lewat `exoclean_admin_pub.sop` (`js/exo-sop.js`, `sopMeta()` di exo-core).

## Kendali perubahan pengaju–penyetuju (7 Sep 2026)

Modul **Persetujuan** di konsol admin: perubahan diajukan (PIN pengaju) lalu disetujui supervisor dari sesinya sendiri (PIN atau passkey), bertingkat menurut risiko (rendah/sedang/tinggi; tinggi = 2 penyetuju + berlaku tertunda 30 menit + autentikasi ulang), dengan selisih sebelum–sesudah, log audit berantai hash yang bisa diverifikasi, penanda anomali, peran admin (staf/supervisor/super admin), dan mode satu admin yang ditandai jujur di log. Penerbitan SOP kini lewat jalur ini. Rincian: `server/KEAMANAN.md` bagian 5.

## Accounting & Finance (7 Sep 2026)

Modul **Accounting & Finance** di konsol admin (`js/exo-keuangan.js` model, `js/exo-admin-keuangan.js` tampilan), 10 tab: Ringkasan (GMV vs pendapatan platform, kewajiban upah mitra, dana ditahan di luar neraca, saldo dompet sebagai liabilitas, arus kas), Piutang & invoice kontrak B2B dengan umur piutang, Rekonsiliasi per kanal + penahanan > 24 jam, Payout mitra (upah bersih setelah PPh 21, batch lewat persetujuan; ≥ ambang = tingkat tinggi), Dompet & dana ditahan (kewajiban ke pelanggan, rasio escrow), Pajak (PPN atas fee platform & kontrak, PPh 21/23 dipotong, ekspor e-Faktur/e-Bupot), Jurnal & buku besar (bagan akun, jurnal otomatis dari peristiwa pesanan, jurnal manual lewat persetujuan, neraca saldo), Biaya & anggaran, Laporan (laba rugi, neraca, arus kas, ekspor CSV), Tutup buku & setelan (periode terkunci, tarif pajak/fee/ambang lewat usulan tingkat tinggi). Semua yang menggerakkan uang atau mengubah buku lewat modul Persetujuan. Bila basis data belum punya cukup pesanan tertangkap, deretan contoh ditambahkan dan selalu ditandai "contoh".

## Pengelompokan menu konsol admin (7 Sep 2026)

Bilah samping dikelompokkan mengikuti pola aplikasi sejenis (Jobber/Housecall Pro/ZenMaid, Swept/Connecteam, Urban Company, konsol perusahaan):

| Kelompok | Menu |
|---|---|
| **Operasional** | Dashboard, Live ops, Orders, Services & pricing, SOP & QC, **Inventaris & perlengkapan** (baru), CRM, Complaint desk, Promos & vouchers, Poin & cashback, **Komunikasi tim** (baru: pengumuman ke aplikasi mitra) |
| **Accounting & Finance** | Accounting & Finance, Claims & refunds |
| **HRD** | Cleaners & rekrutmen, **Absensi & timesheet** (baru), **Jadwal & cuti** (baru), **Pelatihan & sertifikasi** (baru), **Kinerja & sanksi** (baru), **Penggajian karyawan** (baru) |
| **IT** | Persetujuan & audit, **Keamanan** (baru), Roles & permissions, Admins & akun, **Integrasi & kunci** (baru), **Cadangan & data** (baru), Appearance |

Modul baru ada di `js/exo-admin-modul.js`; semua tindakan berdampak (cuti, sanksi, PO, pengumuman, payroll, impor/reset data) lewat Persetujuan. Pengumuman yang disetujui tampil di beranda job aplikasi mitra.

## Menu sesuai peran & unit (7 Sep 2026)

Bilah samping hanya menggambar menu yang berhak: **super admin** semua menu; **supervisor** menu unit yang ditugaskan (bawaan Operasional, Accounting & Finance, HRD) + Persetujuan; **staf** menu unit yang ditugaskan (bawaan Operasional) + Persetujuan, tanpa menu IT. Roles, Admins, Integrasi, Cadangan & data, dan Appearance hanya untuk super admin. Navigasi lewat hash atau tombol ke menu yang tidak berhak ditolak dan dialihkan ke menu pertama yang boleh. Unit per akun ditugaskan super admin di Admins & akun (usulan tingkat tinggi) atau saat membuat akun baru; kartu profil menampilkan peran dan unit pengguna yang masuk.

## Learning Management System — Akademi EXOCLEAN (7 Sep 2026)

Pola Coursera: **kursus → modul → materi (video/bacaan/tautan) + kuis per modul**, level dasar/menengah/lanjutan dengan **prasyarat** yang mengunci kursus lanjutan, **kuis** pilihan ganda berambang lulus 80% dan maksimal 3 percobaan dengan penjelasan per soal, **jalur pembelajaran** per fungsi (cleaner, teknisi AC, pengasuh, juru masak, supervisor, staf kantor), progres per peserta, **sertifikat otomatis** (tabel `sertifikat`, berlaku 24 bulan), dan kursus **wajib** yang tampil sebagai pengingat di beranda mitra.

- Mesin bersama `js/exo-lms.js` (7 kursus benih berisi materi SOP EXOCLEAN, 4 jalur); terbitan ke aplikasi lewat `exoclean_admin_pub.lms`.
- Konsol admin → HRD → **Pembelajaran (LMS)**: ringkasan (tingkat penyelesaian, nilai), editor kursus lengkap (modul, materi, kuis, jawaban benar, prasyarat, target, wajib), jalur, peserta & progres. Terbit/tarik kursus lewat Persetujuan; **Belajar saya** untuk staf kantor.
- Aplikasi mitra → tab **Akademi** (`js/exo-screens-belajar.js`): beranda dengan jalur & kursus wajib, detail kursus, pembaca materi (video YouTube/Vimeo diizinkan CSP), kuis dengan hasil dan pembahasan, sertifikat di profil.

## Kelompok menu Mitra (7 Sep 2026)

Menu yang berkaitan dengan mitra dipisah dari HRD ke kelompok **Mitra**: Cleaners & rekrutmen, Absensi & timesheet, Jadwal & cuti, Kinerja & sanksi, Pelatihan & sertifikasi, Pembelajaran (LMS), **Payout mitra** (tampilan yang sama dengan tab payout di Accounting & Finance), dan Komunikasi tim. HRD kini berisi Penggajian karyawan dan Belajar saya. Unit kerja baru `mitra` ikut dalam hak menu; akun yang sudah memegang unit HRD otomatis mendapat unit Mitra sekali saat migrasi.

## Dasbor admin diperkaya (7 Sep 2026)

`js/exo-admin-dash.js` menambah panel analitik 30 hari di bawah KPI bawaan, semuanya SVG inline tanpa pustaka (sesuai CSP): tren GMV vs pendapatan platform, bauran layanan (donat), sales per daerah (kabupaten/kota dari alamat pesanan), top mitra (job, GMV, upah bersih, rating), kanal pembayaran, corong dana ditahan → ditangkap → dilepas, peta panas jam booking (hari × jam), dan log aktivitas terbaru (audit berantai + aktivitas aplikasi). Sumber: `EXO_KEUANGAN.peristiwa()`; peristiwa kini membawa `kota` dan `jam`. Data contoh selalu berlabel.

## Pemilih rentang waktu di dasbor (7 Sep 2026)

Analitik dasbor mengikuti rentang yang dipilih lewat pemilih bergaya Google Ads/Analytics: preset (Kustom, Hari ini, Kemarin, Minggu ini, 7 hari terakhir, Minggu lalu, 14 hari terakhir, Bulan ini, 30 hari terakhir, Bulan lalu, Sepanjang waktu, N hari sampai hari ini / kemarin), tanggal mulai–selesai, kalender bulanan dengan sorotan rentang (klik dua tanggal), dan sakelar **Bandingkan** yang menampilkan selisih GMV, pendapatan, dan kunjungan terhadap periode sebelumnya yang sama panjang. Tren diagregasi per hari (≤ 62 hari), per minggu (≤ 400 hari), atau per bulan.

## Sakelar bahasa konsol admin (7 Sep 2026)

Header kanan atas konsol admin punya sakelar **ID / EN** (`js/exo-admin-teks.js`, tersimpan di `exoclean_admin_lang`). Kamus menerjemahkan kerangka konsol: nama kelompok, label menu, judul dan keterangan modul, tombol header, kartu profil, dan pesan hak menu. Isi tabel/kartu di dalam modul masih mengikuti bahasa penulisan aslinya dan diterjemahkan bertahap lewat kamus yang sama. Aplikasi pelanggan sudah punya tombol bahasa (kode ID/EN) di kanan atas beranda yang membuka layar 12 bahasa.

## Tombol bahasa di semua layar (7 Sep 2026)

Aplikasi pelanggan & mitra: setiap layar punya tombol bahasa (kode ID/EN/…) — di header untuk layar berjudul, atau mengambang di kanan atas untuk layar tanpa header (beranda, pesanan, dompet, pelacakan, job mitra, Akademi, dst.). Menekannya membuka layar 12 bahasa; tombol kembali mengarah ke layar asal. Konsol admin (staf): sakelar ID/EN di header kanan atas. Catatan: layar mitra ditulis dalam bahasa Indonesia; pilihan bahasa di sisi mitra memengaruhi bagian yang sudah berkamus (label umum, ketentuan), penerjemahan penuh layar mitra menyusul.

## Bagan perbandingan tiga sisi (7 Sep 2026)

Halaman analisa (`exo-analisa.html#perbandingan`) memuat bagan perbandingan EXOCLEAN vs pemain sejenis untuk aplikasi pelanggan (Helpling, Urban Company, bTaskee, KliknClean, Handy), aplikasi mitra (Helpling Partner, UC Partner, bTaskee Tasker, Handy Pro), dan konsol admin (Jobber, Housecall Pro, ZenMaid, Swept, Connecteam, BookingKoala): 52 fitur dengan nilai Ada/Sebagian/Tidak, skor cakupan per aplikasi, kekuatan khas, kesenjangan, dan sumber. Penilaian dari materi publik dan dapat berubah.

## Marketplace perlengkapan — pola Tokopedia (7 Sep 2026)
Tiga sisi memakai satu mesin `js/exo-toko.js` (tabel `toko`, `produk`, `pesananToko`, `kuponToko`, `ulasanProduk`, `chatToko`, `penarikanToko`, `komplainToko`; benih 4 toko & 15 produk saat kosong).
- **Pembeli (aplikasi pelanggan)** — kartu "Toko perlengkapan" di beranda → layar `toko` (cari, kategori, toko unggulan), `tokoProfil`, `produk` (varian, stok, ulasan, skor toko), `keranjang` (dikelompokkan per toko, kurir Reguler/Kilat/Ambil, kupon toko, bayar EXO Wallet dengan PIN 6 digit), `pesananToko` (lacak baru→diproses→dikirim→selesai, batalkan sebelum diproses, terima, ulas, komplain/retur, beli lagi). Dana ditahan EXOCLEAN sampai pembeli menerima atau otomatis 3 hari setelah dikirim.
- **Mitra toko — Seller Center (sisi `toko`, tab Beranda · Pesanan · Produk · Chat · Keuangan)** — dianalisis dari Tokopedia Seller Center: Beranda (omzet, skor, saldo, "perlu ditangani"), Pesanan per status dengan SLA 1×24 jam, terima/tolak, input resi, tangani komplain (kirim ulang / refund 50% / penuh); Produk + varian/harga/stok/etalase/unggulan/diskon (produk baru masuk moderasi admin); Promosi (kupon potongan/persen/ongkir dengan kuota & masa berlaku, diskon produk, syarat flash sale); Chat & ulasan (template balasan, balas ulasan publik); Keuangan (bruto, biaya layanan 5%, ongkir diteruskan, saldo cair setelah selesai, penarikan min. Rp50.000 lewat Persetujuan); Statistik (omzet harian, corong, terlaris); Skor toko 0–100 (rating 40 · proses <1 hari 25 · batal 20 · balas chat 15, penalti −5/poin; Power Merchant ≥85 & ≥20 pesanan); Pengaturan (profil, jam buka, kurir, template); `tdaftar` untuk mitra membuka toko baru (status menunggu verifikasi). Akses dari profil pelanggan dan layar job mitra ("Seller Center").
- **Admin — kelompok Marketplace (unit `pasar`)** `js/exo-admin-pasar.js`: ringkasan GMV/komisi/dana tertahan, Mitra toko (verifikasi = usulan tingkat sedang, tangguhkan = tinggi, penalti dengan PIN), Produk & moderasi (setujui/tolak/turunkan dengan PIN + audit), Pesanan, Komisi & pencairan (pencairan lewat Persetujuan; ≥ ambang payout menjadi tinggi), Komplain & retur (admin memutus refund), Promo & flash sale (kandidat diskon ≥15% & stok ≥20).
- **Akuntansi**: akun baru 2500 Dana pembeli marketplace ditahan, 2510 Utang ke mitra toko, 4120 Pendapatan biaya layanan marketplace; jurnal otomatis saat bayar, selesai, refund, dan pencairan (`jurnalOtomatis`).
- sw `exoclean-v24`. Belum ada: integrasi kurir/ongkir nyata, foto produk (pakai ikon), dispute pihak ketiga; di produksi kunjungan/keranjang statistik diambil dari peristiwa aplikasi.

## Kurir marketplace tersambung ke Biteship (7 Sep 2026)
Server baru `server/kirim-server.js` (port 4300, `npm run start:kirim`; pengaman `keamanan.js`; simpanan `data/kirim.json`) memegang `BITESHIP_API_KEY` — browser hanya minta tarif, membuat pesanan kirim per nomor pesanan (idempoten), dan membaca status yang diperbarui webhook `/api/kirim/webhook` (tanda tangan `BITESHIP_WEBHOOK_SECRET`). Variabel dikembalikan ke `.env.example`; contoh `contoh/exoclean-kirim.service` dan blok nginx `/api/kirim/`.
- **Keranjang**: tarif kurir per toko diambil langsung (JNE/SiCepat/AnterAja/Grab… dari akun Biteship) berdasarkan kode pos/koordinat toko dan titik alamat pembeli serta berat barang; pilihan per toko; label "Biteship · tarif langsung". Bila server mati/kunci kosong/saldo Biteship habis → otomatis "tarif standar" (Reguler/Kilat/Ambil di toko).
- **Seller Center → Pesanan**: tombol "Buat pesanan kirim … (Biteship)" saat memproses; kurir menjemput ke alamat toko (Pengaturan toko kini punya alamat, kode pos, telepon); resi terisi otomatis dan status menjadi Dikirim; resi manual tetap bisa.
- **Pembeli & toko → Lacak**: status kurir dipetakan (picked/dropping_off → dikirim, delivered → selesai otomatis, returned → retur, cancelled → gagal) dan riwayat perjalanan tampil.
- **Konsol admin → IT → Integrasi**: kartu "Server kurir" (hidup, kunci test/live/kosong, jumlah kurir, webhook terpasang) dan baris Biteship di daftar integrasi.
- `KIRIM_SIMULASI=1`: tarif & resi tiruan (status maju sendiri 1 menit → dijemput, 3 menit → terkirim) untuk pengembangan tanpa saldo Biteship — jangan di produksi. Catatan: akun Biteship uji saat ini membalas "No sufficient balance to call rates API"; isi saldo di dashboard Biteship sebelum memakai tarif nyata.

## Bayar & Isi Ulang — Darmawisata Indonesia H2H (7 Sep 2026)
Server baru `server/dwi-server.js` (port 4400, `npm run start:dwi`, pengaman `keamanan.js`) menyambungkan aplikasi ke Darmawisata H2H: PPOB (PLN, BPJS, PDAM, Telkom, internet, multifinance) dan TopUp (pulsa, data, token PLN, e-wallet). Model agen prabayar: kredensial agen hanya di `.env`, `securityCode = MD5(token + MD5(password))` dihitung server per login, `accessToken` tidak pernah ke browser; hanya jalur di daftar putih yang lewat, dan jalur uang hanya lewat `/api/dwi/bayar` dengan kunci idempotensi (PPOB `billingReferenceID`, TopUp `MSISDN+produk+sequence`). Keadaan tertunda/ragu tidak pernah diulang otomatis; admin mencocokkan. `DWI_SIMULASI=1` untuk pengembangan tanpa akun; catatan di `data/dwi-transaksi.json`.
- **Pelanggan**: kartu "Bayar & Isi Ulang" di beranda dan tombol di Dompet → layar `tagihan` (`js/exo-screens-ppob.js`): pilih jenis → penyedia → nomor + HP → Cek tagihan (angka selalu dari penyedia, tidak dikarang) → Bayar EXO Wallet + PIN; TopUp: jenis → operator → nominal (harga penyedia + margin) → Beli; token PLN/SN tampil; Riwayat dengan keadaan berhasil/menunggu penyedia/perlu dicocokkan/gagal. Dompet dipotong hanya setelah penyedia menjawab; bila admin menyatakan gagal, dompet dikembalikan otomatis.
- **Mesin** `js/exo-ppob.js`: tabel `ppobTx`, biaya admin (Rp2.500) & margin (Rp500) dari setelan, pencocokan.
- **Admin → Marketplace → Bayar & isi ulang (PPOB)** `js/exo-admin-ppob.js`: status server (uat/produksi/simulasi), deposit agen (uang perusahaan, dipisah dari dompet pelanggan), transaksi pelanggan dengan Cocokkan · PIN, catatan idempotensi server, setelan biaya admin & margin (PIN + audit). Kartu "Server Darmawisata" di IT → Integrasi.
- **Akuntansi**: akun 1400 Deposit agen Darmawisata dan 4130 Pendapatan biaya admin PPOB; jurnal otomatis per transaksi selesai (Dr 2200 dompet · Cr 1400 harga penyedia · Cr 4130 fee).
- Rumpun perjalanan (pesawat, hotel, kereta, …) hanya jalur baca di daftar putih; Booking/Issued sengaja belum dibuka. sw `exoclean-v25`. Catatan `.env` New App: `DWI_PORT` masih 4300 (bentrok dengan kurir) → ganti 4400.

## Pelatihan & sertifikasi digabung ke Pembelajaran (LMS) (7 Sep 2026)
Menu "Pelatihan & sertifikasi" dihapus dari sidebar; isinya (sertifikat mitra, kurikulum wajib per fungsi, dokumen kepatuhan, pengingat kedaluwarsa < 60 hari) menjadi tab **Sertifikasi & kepatuhan** di menu **Pembelajaran & sertifikasi (LMS)**, satu tempat dengan kursus, jalur, dan progres peserta. Tautan lama ke view `pelatihan` dialihkan otomatis ke tab tersebut.

## Katalog materi terbuka untuk Akademi (7 Sep 2026)
`js/exo-lms-katalog.js` (rev 1) menambah materi hasil kurasi web ke LMS lewat `EXO_LMS.perbaruiKatalog()` (idempoten per revisi; kursus lama diperkaya sekali, kursus baru ditambahkan, jalur digabung; dicatat di activity):
- **Kursus baru (8)**: LMS-003 Kebersihan tangan & pencegahan infeksi (video Kemenkes CTPS, WHO handwash, poster/leaflet WHO), LMS-004 Ergonomi & angkat beban aman (animasi TECH EHS, ringkasan Indonesia Safety Center), LMS-005 P3K dasar (video Unsyiah & PMI Bantul), LMS-103 Kamar mandi & toilet (kode warna OctoClean/Astral, kerak), LMS-104 Kaca, sofa & upholstery, LMS-105 Laundry & setrika (Padang Mesin Laundry), LMS-501 Higiene pangan 5 kunci WHO/BPOM (video BPOM & Klub Pompi), LMS-601 Dasar pengasuhan bayi & anak (dr. Dimple Nagrani, RSUI, Teman Bumil).
- **Kursus lama diperkaya**: LMS-101 (video dusting/sweeping/mopping Dutasukses + kuis), LMS-102 (video MSDS EDU DAMKAR, bacaan campuran chemical yang dilarang, tautan cara membaca MSDS), LMS-201 (3 video praktik cuci AC), LMS-401 (video pelayanan prima 3S, Marketeers TV), LMS-001 (tautan modul K3 Kemnaker e-training, bacaan APD per tugas).
- **Jalur**: Cleaner 10 kursus, Teknisi 5, Supervisor 8, Staf 3; jalur baru Pengasuh (5) dan Juru Masak (4). Total 15 kursus · 29 video · 5 tautan · 24 kuis, lolos `periksa()`.
- Video disematkan lewat `youtube-nocookie.com` (tidak diunduh; kredit pembuat tampil di bawah pemutar; semua ID diverifikasi tersedia lewat oEmbed pada 7 Sep 2026). Bacaan ditulis ulang ringkas dengan atribusi sumber (WHO, Kemenkes, BPOM, Kemnaker, Indonesia Safety Center, Kompas, HydroClean, IDAI). Video pihak ketiga dapat hilang sewaktu-waktu — ganti URL di LMS → Kursus & materi. sw `exoclean-v26`.

## SOP → kursus wajib per fungsi kerja (7 Sep 2026)
`js/exo-lms-sop.js`: setiap SOP yang berlaku (21 SOP di `SOP_META`, atau revisi terbitan admin) menjadi kursus wajib `SOP-<kode>` dengan tiga modul yang dibangkitkan dari isi SOP — persiapan APD/alat/chemical, langkah kerja berurutan dengan tanda foto bukti, mutu & sanksi — beserta kuis yang juga dibangkitkan (APD wajib, takaran chemical, langkah pertama/berikutnya, langkah wajib foto). SOP yang sudah punya kursus rancangan (D-001 → LMS-101, D-014 → LMS-201) tidak digandakan, hanya diberi modul SOP dan ditandai wajib.
- **Pemetaan fungsi** (`PETA_FUNGSI`): cleaner (D-001, D-002, D-005, D-016, D-020, D-022, D-026, D-031, D-032, D-035, B-004, D-034, B-011), teknisi (D-014, B-004, D-033, D-034, B-009, B-010, D-032), supervisor (D-005, B-010, B-011), pengasuh (C-001), juru masak (C-004), terapis pijat (C-003, fungsi baru), semua (C-002). Prasyarat tambahan untuk SOP berisiko (mis. B-010 ruang terbatas → LMS-004 ergonomi & LMS-005 P3K; C-001 perawatan → LMS-601). Masa berlaku sertifikat SOP 12 bulan.
- **Sinkron otomatis** `EXO_LMS.sinkronSop()`: dipanggil saat LMS dibuka dan langsung setelah admin menerbitkan revisi SOP (PIN). Revisi naik → modul SOP dibangkitkan ulang, rev kursus naik, dan pendaftaran mitra yang sudah lulus dikembalikan ke "berjalan" dengan tanda `perluUlang` (sertifikat lama tetap tercatat).
- Jalur per fungsi otomatis memuat kursus SOP-nya (Cleaner 22 kursus, Teknisi 11, Supervisor 11, Pengasuh 6, Juru masak 5, Terapis 5 baru, Staf 3). Tab Sertifikasi & kepatuhan menampilkan kurikulum wajib per fungsi langsung dari LMS. Aplikasi mitra kini memuat `exo-sop.js` agar sinkron juga berjalan tanpa konsol admin. sw `exoclean-v27`.

## Kursus SOP wajib per layanan, bukan per semua job (7 Sep 2026)
Kursus SOP kini bertanda `wajibLayanan` (id jasa: hourly, deep, ac, …). Dua tingkat kewajiban:
- **Wajib dasar** (`wajib:true` tanpa `wajibLayanan`: K3, kode etik, kebersihan tangan, ergonomi, dan kursus wajib fungsi dari katalog) — `EXO_LMS.wajibBelum(u)` — menahan semua job.
- **Wajib per layanan** (`EXO_LMS.sopBelum(u)`, `EXO_LMS.bolehLayanan(u, jasa)`) — hanya menahan job layanan itu: di layar Job mitra, permintaan layanan yang SOP-nya belum lulus menampilkan kartu "🔒 Lulus SOP dulu" dengan tombol ke kursus, sementara job layanan lain tetap bisa diterima. `PARTNER_JOBS` kini membawa `jasa`.
- Akademi mitra memisahkan hitungan "Wajib dasar" dan "SOP layanan" dan menyarankan lulus SOP layanan yang paling sering diambil. Konsol admin menandai kursus dengan chip "wajib · <layanan>". Kursus SOP lama dimigrasi otomatis (sinkron ulang mengisi `wajibLayanan`). sw `exoclean-v28`.

## Kelompok menu H2H: Biteship & Darmawisata (7 Sep 2026)
Sidebar konsol admin mendapat kelompok **H2H** (unit `pasar`) berisi **Kurir — Biteship** (`js/exo-admin-kurir.js`, baru: status server & jenis kunci, kurir aktif di akun, webhook; catatan pesanan kirim dari server lewat endpoint baru `GET /api/kirim/daftar` dan pesanan marketplace berpengiriman dengan tombol segarkan status; uji tarif memakai jalur keranjang; panduan sambung) dan **Bayar & isi ulang — Darmawisata** (dipindah dari kelompok Marketplace). sw `exoclean-v29`.

## Perjalanan — rumpun Darmawisata lainnya (7 Sep 2026)
Sepuluh rumpun H2H tersambung lewat jalur baca: pesawat, hotel, kereta, bus, kapal (Pelni & DLU), shuttle, sewa mobil, paket wisata, umroh, kargo.
- **Server** `dwi-server.js`: daftar putih diperluas (Schedule/Search/Tariff/Price per rumpun), `GET /api/dwi/perjalanan/akses` (ketuk 10 rumpun ke akun agen, cache 10 menit) dan `POST /api/dwi/perjalanan/cari` `{rumpun, param}` dengan pemetaan `PERJALANAN` (rumpun → jalur & nama parameter H2H; sesuaikan di sini bila UAT membalas "<field> invalid") dan perapi hasil ke bentuk seragam `items[{judul, sub, harga, detail}]`. Mode simulasi memberi jadwal/harga tiruan.
- **Booking/Issued tidak dipanggil browser** (manual H2H menuntut satu rangkaian accessToken + search spec dan mengikat kursi/kamar di pemasok). Alur: pelanggan mencari → "Minta dipesankan" (tabel `perjalananReq`) → tim memesan di portal/API Darmawisata lalu mengonfirmasi harga final + kode booking (PIN, konsol H2H → Perjalanan) → pelanggan membayar dari EXO Wallet dengan PIN dalam 2 jam → tim menerbitkan nomor tiket (PIN) → tampil di aplikasi. Pembatalan setelah bayar mengembalikan dompet otomatis.
- **Pelanggan** (`js/exo-perjalanan.js`, `js/exo-screens-perjalanan.js`): kartu "Perjalanan" di beranda; layar rumpun dengan status ketersediaan di akun, form per rumpun, hasil dengan lencana live/simulasi/contoh, permintaan saya. **Admin** (`js/exo-admin-perjalanan.js`, menu H2H → Perjalanan — Darmawisata): antrean permintaan, akses rumpun, biaya layanan per rumpun (PIN + audit). Akuntansi: akun 4140 dan jurnal saat dibayar. sw `exoclean-v30`.

## Checkout marketplace ala Tokopedia (7 Sep 2026)
Dianalisis dari layar checkout Tokopedia (alamat → per toko: produk + diskon, Tambahan/proteksi, pengiriman dengan gratis ongkir & estimasi tiba, asuransi, catatan → promo → metode bayar → ringkasan → "Kamu hemat" → tombol bayar). Diterapkan pada layar Keranjang → **Checkout**:
- **Aturan** (`EXO_TOKO.ATURAN`): gratis ongkir platform bila subtotal toko ≥ Rp150.000 (maks Rp20.000), asuransi pengiriman 0,5% (min Rp2.500, bawaan aktif, bisa dimatikan; tidak untuk ambil di toko), proteksi produk 12 bulan 5% untuk kategori mesin atau harga ≥ Rp500.000, biaya jasa aplikasi Rp1.000 digratiskan untuk EXO Wallet (dicoret di ringkasan), poin dapat dipakai sampai 10% total.
- **Layar**: spanduk "Gratis ongkir untuk pesanan ini", kartu alamat (ganti lewat lembar alamat), per toko "bersama <toko>" dengan harga coret + badge %, stepper qty, baris Tambahan proteksi (centang), baris kurir dengan tag GRATIS ONGKIR, harga dicoret → Rp0, estimasi tiba (tanggal dari ETD kurir), pilihan kurir lipat/buka, asuransi (centang), catatan untuk toko; kartu promo (gratis ongkir, kupon toko, Pakai Poin); metode pembayaran radio (EXO Wallet, QRIS, GoPay/OVO/DANA, VA, kartu); ringkasan transaksi dengan Promo belanja yang bisa dibuka (diskon ongkir, kupon, poin); S&K; "Kamu hemat Rp…"; bilah bawah Total tagihan + "Bayar sekarang".
- **Metode non-dompet**: pesanan dibuat berstatus **menunggu-bayar** (batch per checkout) dengan tombol simulasi gateway "saya sudah bayar" / batalkan (stok dikembalikan); di produksi diganti halaman Midtrans/Xendit. Seller Center mendapat tab "Belum bayar" dan kartu catatan pembeli. Pesanan menyimpan asuransi, proteksi, diskon ongkir, poin dipakai, metode. sw `exoclean-v31`.

## Jelajah, Filter & Keranjang ala Tokopedia (7 Sep 2026)
Dari tiga layar Tokopedia (lembar Filter, Keranjang berpilihan, feed produk) → `js/exo-screens-toko2.js` + mesin `EXO_TOKO.katalogFilter/infoFilter/rekomendasi`:
- **Feed produk** (`toko`): bilah cari dengan hapus, chip "Dikirim ke <alamat>" (ganti lewat lembar alamat), tombol Filter (jumlah aktif) & Urutkan (paling sesuai, terbaru, terlaris, termurah, termahal, rating), kategori bergulir, bagian **Lanjut eksplor** (terakhir dilihat, `K.tokoDilihat`) dan **Buat kamu** (rekomendasi kategori yang dilihat/di keranjang, lalu rating & terjual), kartu produk: gambar + badge −%, label GRATIS ONGKIR (harga ≥ ambang) atau PLUS (toko punya kupon), nama 2 baris, harga tebal, chip "+Kupon toko", rating · terjual · sisa stok, kota & jarak km dari alamat.
- **Lembar Filter**: Gratis Ongkir; jarak toko ke alamat (radius 5/20 km, haversine dari koordinat toko); lokasi (kota toko); jenis toko (Official/Power Merchant); harga min–maks + preset tertil harga katalog; rating ≥ 4; penawaran (harga diskon, ada kupon toko); kondisi baru/bekas (field `kondisi`); terakhir ditambahkan 7/14/30/90 hari; lainnya (stok tersedia, preorder — field `preorder`); durasi pengiriman (instan ≤ 20 km & kurir kilat, same day, ambil di toko); tombol "Tampilkan N produk" & Reset.
- **Keranjang** (`keranjangDaftar`): centang per produk dan per toko, "N produk terpilih · Hapus", dropdown varian (gabung bila varian sama), harga coret + %, tag Flash sale (diskon ≥ 15%), "Sisa N", tempat sampah + stepper (dibatasi stok), "Hemat Rp… pakai Gratis Ongkir" per toko, bilah total terpilih + total diskon + **Beli (N)** → Checkout hanya untuk item terpilih; "Beli sekarang" dari produk memilih item itu saja; setelah bayar, item yang tidak dipilih tetap di keranjang. sw `exoclean-v32`.

## Checkout gabungan: jasa kebersihan + produk, lokasi sama atau berbeda (7 Sep 2026)
- Di layar Tinjau & bayar jasa (alur langsung) ada tombol **"Tambah produk perlengkapan & bayar bersama"**: pemesanan jasa disimpan sebagai snapshot `K.keranjangJasa` (layanan, jam, juru, jadwal, alamat, total, apakah ditahan) lalu pelanggan memilih produk. Di Checkout, blok **Jasa kebersihan** tampil di atas produk dengan pemilih **lokasi jasa** sendiri; tiap toko punya pemilih **Kirim ke** (alamat berbeda per toko), tarif kurir dihitung per alamat toko.
- Produk yang dikirim ke alamat yang sama dengan lokasi jasa mendapat opsi kurir **"Dibawa mitra saat kunjungan"** (ongkir Rp0, tanpa asuransi) — pesanan toko menyimpan `serahMitra` dan Seller Center menampilkan kartu "Serahkan ke mitra EXOCLEAN <nama>" dengan tombol yang menandai barang diserahkan (resi `MITRA-<no>`).
- Satu total (jasa + produk), satu PIN. Setelah pesanan toko dibuat, `AKSI.jasaGabunganSelesai` memulihkan snapshot, menahan dana jasa (`tahanDana`, ditagih setelah kunjungan) atau memotong dompet, lalu menjalankan penyelesaian jasa yang sama dengan alur biasa (tulis `orders`, langganan, layar sukses). Layar sukses menampilkan kartu "Checkout gabungan · N pesanan produk juga dibuat". Metode non-dompet: produk menunggu-bayar (simulasi gateway), jasa ditahan bermode tunda. sw `exoclean-v33`.

## Beranda pelanggan ala Tokopedia (7 Sep 2026)
`js/exo-screens-home.js` menimpa `LAYAR.home` bila marketplace dimuat. Susunan dianalisis dari beranda Tokopedia: bilah cari (jasa + produk + tagihan) dengan ikon keranjang berhitung dan lonceng → chip "Bersih-bersih di <alamat>" → korsel promo (gratis ongkir, langganan −10%, bayar tagihan, tiket & hotel) → strip dompet (Saldo · Poin · Top up · Bayar) → menu ikon 4 kolom (Per jam, Deep cleaning, Cuci AC, Sofa & kasur, Toko, Tagihan, Perjalanan, Semua) → kartu Kunjungan berikutnya → **Flash Sale** (produk diskon terlaris, hitung mundur sampai tengah malam, "Lihat semua" membuka Toko dengan filter diskon) → **Toko pilihan** (urut skor toko) → Petugas di dekat Anda → jaminan singkat → **Rekomendasi untuk kamu** (feed 2 kolom dari riwayat lihat/keranjang). Pencarian menampilkan hasil jasa dan produk sekaligus dengan tombol lanjut cari di Toko. Beranda lama tetap dipakai bila modul toko tidak dimuat. sw `exoclean-v34`.

## Tambah produk ala Tokopedia Seller (7 Sep 2026)
Diteliti dari Tokopedia Care "Cara Menambah dan Edit Produk" dan Pusat Edukasi Seller "Fitur Varian": foto maks 5 (≤ 5 MB, min 700×700, foto pertama utama), nama produk deskriptif (jenis + merek + keterangan, maks 70), kategori, etalase, merek, kondisi, deskripsi, varian maks 2 tipe (mis. Ukuran × Warna, maks 10 opsi per tipe) dengan harga/stok/SKU per kombinasi, harga grosir (minimum pesanan → harga satuan), minimum pembelian, pre-order (durasi proses), berat & dimensi, asuransi, kurir, SKU opsional. Diterapkan di `js/exo-screens-toko-produk.js` (menimpa layar Produk Seller Center):
- **Foto produk** lewat `<input type="file" data-foto="produk:N">` → dikompresi `EXO_UTIL.compressImage` dan disimpan `EXO_FOTO` (data URL); foto pertama jadi foto utama; foto tampil di kartu produk katalog, halaman produk (galeri + tombol video), keranjang, dan checkout (`X.gambarProduk`, `X.fotoProdukUtama`). Ikon emoji tetap sebagai cadangan.
- **Form**: skor **kelengkapan produk** (foto ≥ 3, nama ≥ 40 karakter, deskripsi ≥ 100, harga semua varian, berat & dimensi, merek, video, etalase, SKU) dengan saran; nama & deskripsi berpenghitung karakter; kondisi baru/bekas; varian 2 tipe dengan tabel kombinasi + "samakan harga & stok"; grosir sampai 3 tingkat; minimum pembelian; pre-order 1–90 hari; unggulan; diskon; berat, dimensi P×L×T (berat tagih volumetrik = maks(berat, P×L×T/6)), asuransi wajib, kurir per produk; tombol **Simpan draf** (status `draf`, tidak tayang) dan **Simpan & ajukan moderasi**. Produk aktif yang disunting tetap aktif.
- Mesin `EXO_TOKO.simpanProduk` memvalidasi & membersihkan semua field baru (`foto, video, merek, kondisi, varianTipe, sku, grosir, minBeli, preorder, dimensi, beratTagih, asuransiWajib, kurir`). Halaman produk menampilkan chip merek/kondisi/min. beli/pre-order/grosir. Daftar produk penjual menampilkan skor kelengkapan dan status Draf/Moderasi/Aktif/Nonaktif/Ditolak. sw `exoclean-v35`.

## Moderasi & editor halaman depan (7 Sep 2026)
- **Moderasi** (Operasional → Moderasi, `js/exo-admin-moderasi.js` + mesin `js/exo-usulan.js`): mitra cleaning mengajukan layanan/paket baru, tarif di luar rentang, area, atau jam kerja khusus dari layar Penghasilan (tabel `usulanLayanan`, maks 3 menunggu); admin menyetujui/menolak dengan PIN + audit dan catatan yang tampil ke mitra; tarif yang disetujui ditulis ke `users.tarif`. Tab Produk & toko merangkum antrean moderasi produk dan verifikasi toko (tautan ke Marketplace). Tab Ulasan produk: sembunyikan/tampilkan ulasan (PIN, alasan tercatat) — rating produk dihitung ulang tanpa ulasan tersembunyi (`EXO_TOKO.hitungUlangRating`, `ulasan()` menyaring `disembunyikan`).
- **Halaman & konten** (IT → Halaman & konten, `js/exo-admin-konten.js` + mesin `js/exo-konten.js`): rancangan disimpan di EXO_DB setting `konten`; empat halaman: **Beranda klien** (banner korsel: judul/subjudul/tombol/tujuan/warna/ikon/tayang/urutan, menu ikon 4 kolom: ikon/label/tampil, bagian beranda hidup-mati & urutan, placeholder cari, judul bagian, teks jaminan), **Seller Center** (sapaan, kartu flash sale, tips), **Beranda mitra cleaning** (sapaan, area, kartu, tombol daftar), **Web depan** (hero, warna, layanan unggulan, keunggulan, testimoni, kontak, tautan aplikasi/mitra/Play Store/APK); **Riwayat versi** (10 terakhir, pulihkan ke rancangan). **Pratinjau** membuka `exo.html?pratinjau=1` / `web.html?pratinjau=1` yang membaca rancangan; **Terbitkan · PIN** membuat usulan Persetujuan jenis `konten` (tingkat sedang) yang saat disetujui menyalin rancangan ke `exoclean_admin_pub.konten` (dibaca `EXO_KONTEN.baca()` oleh beranda klien `exo-screens-home.js`, Seller Center, layar Job mitra) dan mencatat riwayat.
- **Web depan** `web.html` + `js/exo-web.js`: landing page publik (hero, layanan, keunggulan, testimoni, kontak, tautan) yang diisi dari konten terbitan; di produksi konten diterbitkan server sebagai JSON statis. sw `exoclean-v36`.

## Biaya & asuransi — kendali admin ala Tokopedia (7 Sep 2026)
- Menu baru konsol admin → Marketplace → **Biaya & asuransi** (`js/exo-admin-biaya.js`) di atas mesin `js/exo-biaya.js` (`EXO_BIAYA`, setting `biaya`). Tab: Ringkasan (pendapatan biaya platform per komponen & per bulan), Biaya pembeli, Asuransi & proteksi, Biaya layanan penjual, Gratis Ongkir/poin/jasa, Simulasi.
- Pola Tokopedia yang ditiru: biaya jasa aplikasi Rp1.000/transaksi dengan 4 transaksi pertama gratis (di sini juga bebas untuk EXO Wallet); biaya layanan Rp1.000 khusus virtual account, pembeli baru bebas 30 hari; asuransi pengiriman premi % nilai barang (min, pembulatan, tercentang otomatis, boleh dilepas atau tidak, wajib per kategori/nilai/produk, batas ganti rugi & hari klaim, nama mitra); proteksi produk (%, kategori, ambang harga, masa garansi); biaya layanan penjual per tingkat Reguler / Power Merchant / Official Store, per kategori, tambahan peserta Gratis Ongkir, batas maksimum per pesanan; program Gratis Ongkir (ambang, subsidi maksimum, hanya peserta); batas poin; biaya aplikasi jasa kebersihan (menggantikan konstanta `PLATFORM_FEE`).
- Semua perubahan lewat PIN → usulan Persetujuan `biaya-setelan` (tingkat **tinggi**) → penerap `EXO_BIAYA.simpan` → audit. Ringkasan usulan memuat tiap nilai lama → baru. Tidak ada nilai yang ditulis langsung; tombol "Nilai bawaan" hanya mengisi formulir.
- Checkout pelanggan membaca setelan saat dihitung: baris asuransi bisa bertanda **Wajib** (terkunci), baris "Biaya layanan (virtual account)", alasan bebas biaya jasa ("gratis 4 transaksi pertama"), catatan biaya per metode bayar. Pesanan menyimpan `komisiPct`, `biayaLayanan`, `biayaLayananVA`, `asuransiWajib`. Layar penjual (Keuangan toko, Pesanan) menampilkan persentase sesuai tingkat toko; Pengaturan toko punya tombol ikut program Gratis Ongkir.
- Rujukan: [Tokopedia Care — S&K Biaya Jasa Aplikasi](https://www.tokopedia.com/help/article/syarat-dan-ketentuan-biaya-jasa-aplikasi), [S&K Biaya Layanan](https://www.tokopedia.com/help/article/syarat-dan-ketentuan-biaya-layanan), [Asuransi Pengiriman](https://www.tokopedia.com/help/article/bagaimana-layanan-asuransi-pengiriman-di-tokopedia), [Biaya Layanan Seller Regular & Power Shop](https://www.tokopedia.com/help/article/biaya-layanan-seller-regular-dan-power-shop).

## Studio beranda — editor visual halaman depan (7 Sep 2026)
- Konsol admin → IT → **Halaman & konten** kini berupa Studio: pratinjau ponsel langsung di kiri (iframe `exo.html?pratinjau=1&layar=…` yang membaca rancangan dan memuat ulang otomatis setiap perubahan) dan bagian akordeon di kanan. `js/exo-admin-konten.js`, gaya `.studio*` di `css/exo-admin.css`.
- **Teks berjalan** (running text) kini bagian konten per halaman: beranda klien, Seller Center, dan beranda mitra cleaning (`teksBerjalan { aktif, label, teks, kecepatan }`) dengan pratinjau marquee di editor. Di beranda klien teks kosong berarti memakai running text lama dari IT → Appearance, jadi tidak ada yang hilang.
- **Pemilih ikon**: menu ikon beranda, ikon layanan katalog ("Apa yang perlu dibersihkan") dan hasil cari, ikon banner, dan ikon layanan web bisa diganti lewat palet emoji per kategori, ketik emoji sendiri, atau unggah gambar (PNG/JPG/SVG/WebP, diperkecil ke 96 px, disimpan di EXO_FOTO). `klien.ikonLayanan[id] = { jenis:'emoji'|'gambar', nilai }`; `EXO_KONTEN.ikonLayanan()` / `ikonHtml()` dipakai `exo-screens-home.js` dan `exo-screens-customer.js`. Tombol "Kembalikan bawaan" memulihkan ikon garis merek.
- Banner promo tampil sebagai kartu mini persis seperti di aplikasi dengan swatch warna gradien; susunan beranda bisa diseret-lepas (HTML5 drag & drop) selain tombol ↑↓; aplikasi mendukung `?layar=<nama>` saat dimuat.
- Alur tayang tidak berubah: Terbitkan → PIN → Persetujuan `konten` (tingkat sedang) → riwayat versi.

## Iklan toko (Ads) ala Tokopedia TopAds (7 Sep 2026)
- Mesin `js/exo-iklan.js` (`EXO_IKLAN`): tabel `iklan`, `iklanTopup`, `iklanHarian`; setelan `iklan` (bid min/maks, anggaran harian min, isi saldo min, slot cari/beranda/produk, moderasi wajib, label, durasi maks). Model bayar per klik: saldo iklan dipotong sebesar bid setiap klik; anggaran harian atau saldo habis → iklan berhenti otomatis; peringkat = bid × kualitas (CTR); satu toko maksimal satu slot per halaman; konversi diatribusikan ke iklan yang diklik ≤ 7 hari (ROAS = nilai pesanan ÷ biaya).
- **Seller Center → Iklan** (`js/exo-screens-toko-iklan.js`, layar `tiklan`): saldo iklan & isi ulang (potong saldo toko — ikut mengurangi saldo tersedia di Keuangan toko — atau gateway simulasi), buat iklan produk / iklan toko (produk, judul, kata kunci, bid, anggaran harian, durasi 7/14/30 hari, estimasi klik), daftar iklan dengan tayang · klik · CTR · biaya · konversi · ROAS, jeda/lanjut/akhiri, ubah bid & kata kunci (kata kunci baru kembali ke moderasi), riwayat isi saldo, tips.
- **Slot iklan pelanggan**: kartu produk berlabel "Iklan" di atas hasil cari/kategori Toko, di awal Rekomendasi beranda, dan baris "Sponsor" di halaman produk (kategori sama, toko lain). Klik → `EXO_IKLAN.klik` → buka produk/profil toko.
- **Admin → Marketplace → Iklan toko (Ads)** (`js/exo-admin-iklan.js`): ringkasan (pendapatan iklan, kredit belum terpakai, tayang/klik, iklan berkinerja tertinggi), moderasi setujui/tolak dengan alasan (PIN + audit), semua iklan dengan jeda paksa, riwayat isi saldo, setelan & tarif lewat PIN + Persetujuan `iklan-setelan` (tingkat sedang).
- Keuangan: akun baru **2520 Kredit iklan mitra toko belum terpakai** dan **4150 Pendapatan iklan marketplace**; jurnal otomatis isi saldo (2510/1100 → 2520) dan biaya klik per hari per toko (2520 → 4150).

## Beranda Seller Center ala Tokopedia Seller (8 Sep 2026)
- `X.LAYAR.tberanda` disusun ulang mengikuti aplikasi Tokopedia Seller: kepala toko (avatar inisial, nama, badge, saklar **Toko buka / tutup sementara** — toko tutup disembunyikan dari katalog & slot iklan, tombol chat dengan hitungan belum dibaca) → kartu **Skor performa toko** 0–100 dengan bilah warna (Sangat baik ≥ 85, Baik ≥ 60) → kartu saldo ganda (saldo toko · Tarik, saldo iklan · Isi) → **Pesanan** 4 ubin hitung (baru, siap dikirim, dalam pengiriman, komplain) → **Rangkuman 7 hari** dengan panah ▲▼ dibanding 7 hari sebelumnya (penjualan, pesanan, pengunjung, konversi, rating) → menu fitur 4 kolom 12 ikon (termasuk Iklan, Edukasi Seller, Lihat sebagai pembeli) → **Tugas untuk naikkan performa** (misi otomatis: proses pesanan, input resi, balas chat/ulasan, lengkapi foto < 3, stok habis, komplain, pasang iklan, buat kupon) → Produk terlaris 7 hari → Program & info (Gratis Ongkir, flash sale, biaya layanan per tingkat) → Pusat Edukasi Seller (tips dari konten toko).
- Rujukan: [Pusat Seller Tokopedia — skor toko](https://seller.tokopedia.com/edu/skor-toko/), [fitur statistik](https://seller.tokopedia.com/edu/fitur-statistik/), [Tokopedia Care — performa toko](https://www.tokopedia.com/help/article/informasi-seputar-performa-toko).

## Aplikasi pelanggan ala pembeli Tokopedia: Transaksi, Akun, Wishlist, Kupon, Notifikasi (8 Sep 2026)
- Navigasi bawah pelanggan menjadi **Beranda · Toko · Transaksi · Wishlist · Akun** (dompet dibuka dari strip beranda dan Akun). `js/exo-screens-akun.js` menimpa `orders` & `profile` dan menambah layar `wishlist`, `tokoFavorit`, `kuponSaya`, `notifikasi`.
- **Daftar transaksi**: satu daftar gabungan jasa kebersihan (pesanan aktif + riwayat), belanja toko, tagihan & isi ulang, perjalanan. Kotak cari, chip status Semua/Berlangsung/Berhasil/Tidak berhasil dengan hitungan, chip kategori, rentang 30/90 hari/semua. Kartu ala Tokopedia: ikon kategori + tanggal + nomor + chip status, gambar/ikon barang + "+n produk lainnya" + toko, total belanja, tombol Lacak / Bayar / Beli lagi / Ulas / Pesan lagi. Kartu langganan aktif dan refund tetap di atas.
- **Akun**: kepala profil dengan tingkat member (Member/Silver/Gold/Platinum dari poin) dan bilah progres, strip EXO Wallet · Poin · Kupon saya, menu cepat 4 kolom dengan lencana hitungan (Transaksi, Wishlist, Toko favorit, Kupon saya, Ulasan saya, Alamat, Langganan, Pembayaran), alamat tersimpan, juru bersih favorit, pengaturan akun, undang teman, pintu ke Seller Center & aplikasi mitra.
- **Wishlist** (♡ di header halaman produk, grid kartu produk dengan hati untuk menghapus, rekomendasi "Mungkin kamu suka") dan **Toko favorit** (tombol Ikuti di halaman toko; daftar toko dengan 3 produk teratas).
- **Kupon saya**: tiket kupon platform (CLEAN25) dan kupon toko aktif dengan syarat, masa berlaku, tombol Pakai (mengisi kode di checkout toko tersebut), kolom klaim kode.
- **Notifikasi** (dari lonceng beranda dan Akun) dengan tab Transaksi (pesanan berlangsung) · Promo (kupon toko, flash sale, penanda wishlist) · Info.

## Perlengkapan kerja mitra: checklist bawaan, pemakaian stok otomatis, penyusutan alat (8 Sep 2026)
- Mesin `js/exo-perlengkapan.js` (`EXO_PERLENGKAPAN`): katalog gudang di tabel `stok` (chemical · habis pakai · APD · alat kerja) dengan `isiUnit` (ml/pcs per kemasan) dan `umurPakai` (job) untuk alat; **norma pemakaian per jasa** (takaran per job & per jam, setting `perlengkapanNorma`, dapat diubah admin lewat PIN + Persetujuan `perlengkapan-norma`); `rencana(jasa, jam, sop)` menyusun daftar bawaan satu job dengan nilai rupiah; `konsumsi(job, bawa)` **memotong stok** chemical & habis pakai (tabel `pemakaianStok`) dan **mencatat penyusutan alat** = harga ÷ umur pakai (tabel `penyusutanAlat`), sekaligus memperbarui alat di tangan mitra (tabel `alatMitra`); idempoten per nomor job.
- Mitra cleaning (`js/exo-screens-partner-kit.js`): layar **Perlengkapan dibawa** (`pkit`) muncul saat menekan Mulai rute bila belum dikonfirmasi — takaran per item, nilai, peringatan stok gudang menipis/kosong, tombol "Habis? → minta gudang" (masuk Permintaan dari lapangan), konfirmasi "Semua sudah di tas". Tombol yang sama ada di Job berjalan. **Pemicu**: saat "Kirim laporan" sebelum–sesudah, stok gudang otomatis dipotong dan penyusutan alat dicatat (toast menampilkan nilainya). Layar **Alat kerja saya** (`palat`, dari Profil mitra): sisa umur pakai, nilai buku, lapor rusak → permintaan pengganti otomatis.
- Admin → Inventaris & perlengkapan (`js/exo-admin-perlengkapan.js`): KPI pemakaian & penyusutan bulan ini, biaya perlengkapan per job, nilai persediaan; tabel pemakaian per item, per mitra & per jasa; editor **norma pemakaian per jasa** (per job, per jam, biaya/job) lewat PIN + Persetujuan; tabel alat di tangan mitra dengan meter umur pakai.
- Keuangan: akun baru 1500 Persediaan perlengkapan, 1600 Alat kerja, 1610 Akumulasi penyusutan (normal kredit), 6210 Penyusutan alat kerja; jurnal otomatis per hari: pemakaian 6200 ← 1500, penyusutan 6210 ← 1610, PO gudang 1500 ← 1100.

## Tas mitra & isi ulang mingguan · serah terima alat onboarding (8 Sep 2026)
- **Tas mitra** (tabel `tasMitra`): persediaan kecil di tangan mitra untuk chemical, habis pakai, dan APD dengan kapasitas satu kemasan per item (gabungan norma semua jasa). Setiap laporan job mengurangi isi tas sesuai takaran; layar **Tas & isi ulang mingguan** (`ptas`) menampilkan meter isi per item, jatuh tempo tiap 7 hari, daftar kekurangan, dan tombol "Minta isi ulang ke gudang" (tabel `isiUlangTas`). Kartu pengingat muncul di beranda Job saat jatuh tempo atau saat paket sedang disiapkan. Admin → Inventaris: antrean isi ulang dengan "Tandai diserahkan · PIN" yang mengembalikan isi tas ke kapasitas (stok gudang tidak dipotong lagi karena sudah dipotong per job).
- **Serah terima alat (onboarding)**: Admin → Inventaris → pilih mitra, paket alat standar per jasa (dari norma), catatan, lalu "Serahkan · PIN" → alat keluar dari stok gudang, tercatat di `alatMitra` berstatus *diserahkan*, dan berita acara `bast` dibuat. Mitra melihat kartu BAST di **Alat kerja saya** dan menekan "Konfirmasi terima" → status *baik*, umur pakai mulai dihitung. Tabel BAST terakhir tampil di admin dengan status konfirmasi.

## Admin → Mitra → Isi tas mitra (8 Sep 2026)
- Menu baru `js/exo-admin-tas.js`: **profil isi tas per layanan** (Cleaning per jam, Deep cleaning, AC, Sofa, Laundry) — tambah item dari stok gudang, kurangi, ubah kapasitas (ml/pcs), lihat nilai isi tas; tombol "Isi dari norma jasa" mengembalikan bawaan. Perubahan diajukan lewat PIN + Persetujuan `tas-standar` (setting `tasStandar`).
- **Layanan tiap mitra (fungsi kerja)**: centang layanan yang dijalankan mitra (setting `tasMitraJasa`, PIN + audit). Profil tas mitra = gabungan layanan yang dicentang (kapasitas terbesar bila item sama); bawaan semua layanan.
- Tas mitra **sinkron otomatis** ke profil saat dibuka: item baru dibuat penuh, item yang dihapus admin ikut hilang, kapasitas menyesuaikan (sisa dipangkas bila melebihi). Tabel "Isi tas mitra saat ini" menampilkan sisa/kapasitas setiap mitra.

## Beranda mitra cleaning ala aplikasi mitra jasa kebersihan (8 Sep 2026)
- Pola dianalisis dari aplikasi Mitra KliknClean / Clean Dash Mitra / GoLife partner (deskripsi publik: [Mitra KliknClean di Google Play](https://play.google.com/store/apps/details?id=com.kliknclean.cleaner&hl=en), [halaman partner KliknClean](https://www.kliknclean.com/partners), [KliknClean di App Store](https://apps.apple.com/us/app/kliknclean/id1473286262)): kepala profil dengan tingkat (Bronze/Silver/Gold) dan skor performa, saklar **ONLINE/OFFLINE** besar, ringkasan hari ini (job, pendapatan, order masuk), **Order masuk** dengan hitung mundur 10 menit dan tombol Terima/Tolak (alasan tolak: jadwal bentrok, terlalu jauh, tidak sesuai keahlian; gerbang SOP tetap berlaku), job berikutnya (Mulai rute · Navigasi · Chat), **Jadwal hari ini** (linimasa), **Absen shift** masuk/keluar, menu cepat 4 kolom (Jadwal, Job berjalan, Riwayat, Pendapatan, Insentif, Absen, Perlengkapan, Akademi), **Insentif & target mingguan** dengan bilah progres, lalu kartu tas, pengumuman, Akademi, dan tips.
- Layar baru `js/exo-screens-partner-home.js`: `pjadwal` (kalender 7 hari dengan titik penanda job, daftar per hari), `pinsentif` (target job/rating/tepat waktu + riwayat bonus), `pabsen` (jam besar, absen masuk/keluar, riwayat 7 hari), `priwayat` (job selesai + order ditolak). Order yang diterima masuk jadwal pada tanggalnya.
- Navigasi bawah mitra menjadi **Beranda · Jadwal · Berjalan · Pendapatan · Akun**; Akademi tetap di kartu beranda dan menu Akun (Akademi, Insentif, Absen, Riwayat, Alat kerja saya).

## Grup menu admin "Mitra Toko" (8 Sep 2026)
- Grup Marketplace diganti menjadi **Mitra Toko** dengan menu terpisah: Ringkasan marketplace · Verifikasi & mitra toko · Produk & moderasi · Pesanan toko · Komisi & pencairan · Komplain & retur · Promo & flash sale · Iklan toko (Ads) · Biaya & asuransi. Menu sub-marketplace membuka tab yang sesuai di `VIEW.pasar` (bilah tab tetap tampil untuk pindah cepat); unit akses tetap `pasar` (nama unit "Mitra Toko").

## Invoice / struk "ORDER RECEIPT" dengan nomor 24 karakter (8 Sep 2026)
- Mesin `js/exo-invoice.js` (`EXO_INVOICE`): nomor invoice **24 karakter** acak huruf besar + angka (crypto, selalu ada huruf dan angka, unik di tabel `invoiceTerbit`, karakter mirip 0/O/1/I dihindari), salinan struk disimpan sekali per pesanan (`terbitkan`), `pastikanToko` memberi nomor pada pesanan lama saat pertama ditampilkan.
- Halaman cetak `invoice.html?no=<24 karakter>` (+ `js/exo-invoice-halaman.js`) dengan tata letak mengikuti contoh struk yang diberikan: judul ORDER RECEIPT dan nomor, blok Penjual / Pembeli / Tanggal Pembelian / Alamat Pengiriman (nama + telepon), tabel INFO PRODUK · JUMLAH · HARGA SATUAN · TOTAL HARGA dengan berat, rincian SUBTOTAL, voucher/kupon, ongkir & voucher ongkir, asuransi, proteksi, biaya jasa aplikasi, poin dipakai, TOTAL BELANJA, Biaya Layanan, TOTAL TAGIHAN, catatan cashback, Metode Pembayaran, pernyataan PPN, "Struk ini berfungsi sebagai Bukti Pemesanan dan/atau Pembelian", kaki EXOCLEAN. Tombol Cetak / Simpan PDF memakai dialog cetak peramban.
- Nomor terbit otomatis saat checkout marketplace (per toko, tersimpan di `pesananToko.invoiceNo`) dan saat pesanan jasa kebersihan berhasil (layar sukses). Tautan invoice tampil di pesanan pembeli, Daftar transaksi, Seller Center → Pesanan, dan admin → Pesanan toko.
- Seller Center → beranda: menu fitur dikelompokkan per fungsi kerja mitra toko — **Penjualan** (Pesanan dengan lencana hitungan, Chat & ulasan, Komplain, Lihat sebagai pembeli), **Produk & promosi** (Produk, Promosi, Iklan, Statistik), **Keuangan & performa** (Keuangan, Skor toko, Saldo iklan, Tarik saldo), **Toko** (Pengaturan, Profil toko, Edukasi Seller, Kurir & ongkir).

## Keselamatan mitra cleaning: SOS, kontak darurat berkala, pemantau respons (8 Sep 2026)
- Pendaftaran mitra sudah mewajibkan **dua kontak darurat** (nama, hubungan, nomor, OTP). Tambahan kini (`js/exo-keselamatan.js`, `EXO_KESELAMATAN`, tabel `kontakDarurat` · `sosInsiden` · `jobLapangan`):
- **Tombol SOS** melayang di layar Job berjalan, Rute, Checklist SOP, dan Laporan (`js/exo-screens-partner-safety.js`): konfirmasi → insiden aktif; ops dan dua kontak darurat diberi tahu (simulasi kirim), lokasi dan nomor job terkirim; panel berisi Telepon 112, Chat ops, "Salah tekan" (≤ 30 detik) dan "Saya aman".
- **Pengingat pembaruan kontak darurat** tiap 180 hari atau bila nomor belum diverifikasi: kartu di beranda mitra dan layar **Kontak darurat** (`pkontak`, dari menu Akun) untuk mengubah, OTP ulang, dan "Konfirmasi data masih benar".
- **Pemantau respons job**: Mulai rute dan Kirim laporan mencatat jejak; job yang lewat 30 menit dari jadwal tanpa mulai rute memunculkan kartu merah di beranda mitra dan daftar "Mitra tidak merespons job" di admin.
- **Admin → Mitra → Keselamatan mitra** (`js/exo-admin-keselamatan.js`): KPI SOS aktif / tidak merespons / kontak perlu diperbarui, tabel insiden SOS (Ditangani · Selesai dengan PIN + audit, tautan peta lokasi), tabel mitra terlambat, tabel kontak darurat dengan nomor tersamar — "Buka · PIN" menampilkan nomor untuk sesi ini dan mencatat pembukaan di audit.

## Flash Deal jasa layanan (8 Sep 2026)
- Mesin `js/exo-flashdeal.js` (`EXO_FLASHDEAL`, tabel `flashDeal`): sesi per layanan dengan tanggal, jendela jam, diskon % (5–70), kuota; keadaan berjalan / akan datang / habis / selesai / nonaktif. Selama jendela berjalan dan kuota tersisa, `EXO_FLASHDEAL.diskon(jasa, nilai)` memotong tarif × durasi (dibulatkan ke ribuan) secara otomatis; pemesanan sukses memakai satu kuota.
- Aplikasi pelanggan (`js/exo-screens-flashdeal.js`): bagian **⚡ Flash Deal Jasa** di beranda, selalu di atas Flash Sale produk (bagian `flashJasa` di konten, disisipkan otomatis sebelum `flash` bila konten lama belum memuatnya), dengan hitung mundur, kartu layanan berharga coret, tag diskon, meter sisa kuota, tombol Pesan; spanduk deal di layar layanan; baris "⚡ Flash Deal −x%" di ringkasan harga (`totalN` memperhitungkan `diskonFlash`).
- Admin → Promos & vouchers (`js/exo-admin-flashdeal.js`): tabel sesi (keadaan, kuota terpakai), formulir sesi baru/ubah, saklar aktif, hapus — semua lewat PIN + Persetujuan `flash-deal` (tingkat sedang). Editor Halaman & konten mengenal bagian "Flash Deal jasa" untuk urutan/sembunyi.

## Web depan ala Tokopedia — layanan lebih ditonjolkan (8 Sep 2026)
- `web.html` + `js/exo-web.js` ditulis ulang mengikuti susunan web Tokopedia: bilah atas lengket (wordmark · kolom cari yang membuka katalog aplikasi dengan `?cari=` · Masuk · Buka aplikasi), strip jaminan, **korsel banner** (hero web + banner beranda klien dari Halaman & konten, panah, titik, putar otomatis), **grid semua layanan** (21 layanan dari EXO_DATA dengan ikon garis/emoji, nama Indonesia dari EXO_I18N, "mulai Rp… per satuan", tautan `exo.html?layar=svc&jasa=<id>`), **Flash Deal Jasa** dengan hitung mundur (EXO_FLASHDEAL), **layanan unggulan** dari konten + harga & jaminan, **paket & langganan** (PREPAID), baris kecil **Toko perlengkapan** (6 produk terlaris saja — porsi lebih kecil dari layanan), Kenapa EXOCLEAN, testimoni, spanduk Jadi mitra, footer berkolom (Layanan · Pelanggan · Mitra · Unduh aplikasi).
- Aplikasi mendukung `?jasa=<id>` (langsung ke layar layanan) dan `?cari=` (isi kolom cari) saat dimuat.

## Banner, slider & promosi bisa disunting admin di seluruh aplikasi (8 Sep 2026)
- Editor banner generik di Studio (`bagBannerUmum`): tambah, ubah (judul, subjudul, teks tombol, tujuan, warna swatch, ikon emoji/palet), geser urutan, tayang/sembunyi, hapus — untuk **beranda klien** (`klien.banner`, korsel), **halaman Toko** (`klien.bannerToko`, di atas katalog perlengkapan), **Seller Center** (`toko.banner`, Program & info), **beranda mitra cleaning** (`mitra.banner`, korsel di beranda Job), dan **korsel web** (`web.slide`; kosong = memakai banner beranda klien). Tujuan per sisi: `EXO_KONTEN.TUJUAN`, `TUJUAN_TOKO`, `TUJUAN_MITRA`. Semua lewat rancangan → Terbitkan (PIN + Persetujuan) seperti konten lain.
- Promosi lain yang sudah punya menu admin: Flash Deal jasa (Promos & vouchers), flash sale & kupon toko (Mitra Toko → Promo & flash sale), kode voucher platform (Promos & vouchers), Iklan toko (Ads), teks berjalan tiap sisi (Studio), pengumuman mitra (Komunikasi tim).

## Seller Center → tab Akun (profil toko) (8 Sep 2026)
- Layar `tprofil` (`js/exo-screens-toko-profil.js`) menggantikan tab Keuangan di navigasi bawah Seller Center menjadi **Beranda · Pesanan · Produk · Chat · Akun** (Keuangan tetap di menu beranda dan di Akun). Isi: kepala toko (inisial, nama, badge, rating & skor, kota, jam buka), ringkasan produk aktif / pesanan selesai / saldo, kartu pemilik & kontak dengan tombol Ubah, menu akun (Pengaturan toko, Keuangan & pencairan, Program Gratis Ongkir, Iklan toko, Promosi & kupon, Skor & performa, Statistik, Edukasi Seller), pengaturan aplikasi (Bahasa, Bantuan seller, S&K), pintu ke aplikasi pelanggan/mitra, dan Keluar dari Seller Center. Menu "Akun & profil toko" juga ada di grup Toko pada beranda.

## Customer Care AI — pelanggan, mitra cleaning & mitra toko (8 Sep 2026)
- Layar `cs` (`js/exo-screens-cs.js`) di ketiga sisi: gelembung percakapan, chip pertanyaan populer per sisi, tombol aksi ke layar terkait, nilai 👍/👎, dan **Hubungi tim** (tiket eskalasi ke manusia). Pintu masuk: Akun pelanggan (menu cepat *Bantuan AI* & Pengaturan *Help*), Seller Center → Akun → *Bantuan seller · Customer Care AI*, beranda & profil mitra (*Bantuan AI*).
- Mesin `EXO_CS` (`js/exo-cs.js`): basis pengetahuan (KB) per sisi — 13 topik pelanggan (pesan, tarif, jadwal, batal/refund, bayar, garansi, kupon/Flash Deal, toko, lacak, komplain, akun, langganan, invoice), 12 topik mitra (order, SOP/Akademi, upah, insentif, tas & isi ulang, SOS, absen, skor, reschedule, laporan, pendaftaran, usulan), 11 topik toko (buka toko, produk, komisi, pencairan, kirim/resi, iklan, kupon/flash sale, skor, komplain, Gratis Ongkir, invoice). Pencocokan kata kunci + sinonim (kata umum berbobot rendah) dan **jawaban berbasis data langsung**: pesanan aktif, saldo & poin, Flash Deal, tas/alat & kontak darurat mitra, saldo/tertahan/skor/iklan toko. Pertanyaan tanpa jawaban dicatat di `csTanyaLog`; eskalasi membuat tiket `tiketCs` berisi ringkasan percakapan.
- Admin → Operasional → **Customer Care AI** (`js/exo-admin-cs.js`): KPI, tiket eskalasi (Tangani/Selesai · PIN + audit), pertanyaan belum terjawab → *Jadikan entri KB*, editor KB per sisi (tambah/ubah/hapus, entri bawaan bisa dipulihkan; PIN + audit; timpaan tersimpan di setting `csKB`), uji jawaban.
- AI cloud opsional: `server/cs-server.js` (`npm run start:cs`, `CS_PORT=4500`) meneruskan pertanyaan + landasan (KB & konteks) ke Claude (`@anthropic-ai/sdk`, model `CS_MODEL`, bawaan `claude-opus-5`) dengan sistem prompt yang membatasi jawaban pada landasan; jawaban JSON `{jawab, layar, labelAksi}`. Tanpa `ANTHROPIC_API_KEY` server berjalan dalam **mode simulasi** dan aplikasi tetap memakai mesin lokal. Jembatan `EXO_SERVER.csSehat()/csTanya()` (`js/exo-server.js`); kunci API hanya di `.env` server, tidak pernah ke peramban. Cache SW `exoclean-v54`.

## Admin IT: kelola pengguna & sandi (8 Sep 2026)
- Menu IT → **Admins & akun** kini memuat kartu **Pengguna & sandi (IT)** (`js/exo-admin-akun.js`): ubah nama / email masuk / jabatan, **reset sandi** (sandi sementara acak 12 karakter atau diketik ≥ 10 karakter; pengguna wajib menggantinya saat masuk pertama, sandi lama langsung tidak berlaku), **reset PIN** persetujuan, **nonaktifkan/aktifkan** akun, dan **Ganti sandi saya** (sandi lama + baru) untuk setiap admin.
- Hak: super admin mengelola semua akun; **supervisor berunit IT** ikut mendapat menu Admins & akun (`bolehLihat` di `js/exo-admin.js`) dan bisa mengelola akun staf/supervisor, tetapi tidak akun super admin dan tidak bisa membuat akun super admin. Tidak ada yang bisa menonaktifkan dirinya sendiri atau super admin aktif terakhir.
- Setiap aksi meminta PIN (sesi > 15 menit meminta sandi lagi) dan dicatat di audit (siapa, akun mana, apa yang berubah). Sandi sementara hanya ditampilkan sekali di formulir dan tidak disimpan sebagai teks polos. Perubahan peran & unit tetap lewat Persetujuan tingkat tinggi. Cache SW `exoclean-v55`.

## Tagline merek & rekomendasi ukuran gambar (8 Sep 2026)
- **Appearance → Wordmark & tagline**: field *Tagline (di bawah wordmark)* (`EXO_BRAND` `tagline`, bawaan "We clean all purpose"; maks. 48 karakter; kosongkan untuk menyembunyikan). Diterbitkan bersama merek dan diterapkan `EXO_BRAND.terapkan()` ke setiap elemen `[data-brand="tag"]`: header aplikasi pelanggan & mitra (`merek()` di `js/exo-core.js`), bilah samping konsol admin, web depan (`web.html` kini memuat `js/exo-brand.js`), dan kartu referral.
- **Rekomendasi ukuran di setiap unggahan gambar**: app mark 1024×1024 px (min. 512, PNG/SVG transparan, maks. 1 MB) · wordmark 1200×300 px (4:1, tinggi min. 160, maks. 1 MB) · ikon layanan Studio 192×192 px (min. 96, diperkecil ke 96 px, maks. 300 KB) · foto produk toko 1000×1000 px (min. 700, 1:1, maks. 5 MB) · foto profil mitra 600×600 px (min. 400, maks. 2 MB) · foto SOP & laporan sebelum–sesudah lanskap 4:3 min. 1280×960 px · foto klaim pelanggan min. 1024 px sisi panjang, maks. 5 MB. Cache SW `exoclean-v56`.

## Data pribadi terenkripsi di server, bukan di perangkat (8 Sep 2026)
- **Brankas server** (`server/brankas.js`, `server/data-server.js`, port 4600): enkripsi amplop AES-256-GCM — kunci data acak per rekaman, kunci induk 256-bit berversi dengan rotasi tanpa enkripsi ulang, AAD mengikat tabel/id/bidang, indeks buta HMAC-SHA256, penghapusan kriptografis, log audit berantai HMAC tanpa data pribadi. Tanpa kunci server menolak berjalan. 24 uji: `npm run test:brankas`.
- **Sesi bertanda tangan** (`server/sesi.js`): auth-server menerbitkan token HS256 setelah OTP/login sosial (`sub` pseudonim, `sisi` klien/mitra/toko/admin) — sekaligus menutup temuan audit "OTP tidak menerbitkan sesi". Semua permintaan ke data-server wajib Bearer.
- **Klien** (`js/exo-brankas.js`): bidang pribadi (`telp, email, alamat, koordinat, nik, npwp, rekening`, kontak darurat, rekening toko/penarikan, pendaftaran) tidak pernah ditulis polos ke localStorage — hanya versi tersamar; teks polos hidup di memori selama sesi dan digabung kembali dari brankas saat aplikasi dibuka; migrasi data lama otomatis; tanpa server data tetap lokal & ditandai tertunda.
- **Admin** → IT → Keamanan → kartu *Brankas data pribadi* (`js/exo-admin-brankas.js`): status, migrasi, sesi admin via OTP (`ADMIN_TELP`), verifikasi audit server, rotasi kunci (PIN). Panduan produksi & rotasi di `server/KEAMANAN.md` §7. Cache SW `exoclean-v57`.

## Program bug bounty / VDP (8 Sep 2026)
- **Kebijakan publik**: `SECURITY.md` di akar repo dan halaman `keamanan.html` (cakupan, di luar cakupan, aturan & safe harbor, tingkat CVSS & hadiah Rp250 rb – Rp25 jt, SLA, hall of fame) plus `/.well-known/security.txt` (RFC 9116). Kebijakan yang tayang dibaca dari terbitan admin (`exoclean_admin_pub.vdp`) dengan bawaan di `js/exo-vdp.js`.
- **Formulir laporan** di `keamanan.html` → `server/vdp-server.js` (`npm run start:vdp`, port 4700): laporan dan kontak pelapor disimpan terenkripsi lewat brankas (tabel `vdp`), rate limit 5/jam/IP, honeypot, nomor tanda terima.
- **Admin → IT → Bug bounty / VDP** (`js/exo-admin-vdp.js`): muat laporan dari brankas (sesi admin), triase status, CVSS → tingkat → hadiah saran, catatan & riwayat, penanda lewat SLA — semua PIN + audit; penyunting kebijakan & cakupan yang diterbitkan ke halaman publik; hall of fame. Panduan di `server/KEAMANAN.md` §8. Cache SW `exoclean-v58`.

## UU PDP & pendaftaran PSE (8 Sep 2026)
- **Kebijakan privasi berversi** (`privasi.html`, bawaan di `js/exo-privasi.js`, penyunting di admin): 9 bagian sesuai Pasal 21 UU No. 27/2022 — pengendali, data, tujuan & dasar hukum, retensi, prosesor & transfer, hak subjek, keamanan, anak, perubahan; riwayat versi; kontak DPO.
- **Persetujuan wajib** saat pertama pakai per sisi (`js/exo-screens-privasi.js`, lembar tanpa tombol tutup), pilihan pemasaran terpisah, bukti tersimpan (`persetujuanPdp`: waktu, versi, tujuan, cara, agen). Versi kebijakan baru → persetujuan ulang.
- **Privasi & data saya** (Akun pelanggan, profil mitra, Akun toko): unduh salinan data (JSON), saklar pemasaran, ajukan perbaikan/penghapusan/portabilitas, status permintaan dengan tenggat 3×24 jam.
- **Admin → IT → UU PDP & PSE** (`js/exo-admin-pdp.js`): skor & checklist kepatuhan, langkah pendaftaran PSE Lingkup Privat (NIB → pse.komdigi.go.id → tanda daftar), DPO, DPIA, perjanjian prosesor; antrean permintaan subjek data (penuhi/tolak PIN + audit; penghapusan kriptografis lewat brankas); register insiden kebocoran dengan hitung mundur 3×24 jam dan surat pemberitahuan ke subjek & lembaga; bukti persetujuan; catatan pemrosesan (RoPA) otomatis; penerbitan kebijakan berversi. Panduan langkah demi langkah: `server/KEPATUHAN.md`. Cache SW `exoclean-v59`.

## Sesi bertanda tangan wajib di server uang (8 Sep 2026)
- Setelah OTP/login sosial, auth-server menerbitkan sesi HS256 (`server/sesi.js`); kini **semua endpoint pembayaran, pengiriman, DWI, posisi, dan brankas mewajibkannya** lewat `SESI.wajibDariEnv()` — transaksi/pesanan kirim terikat ke `sub` pembuatnya (pemilik lain → 403), daftar/saldo/transaksi hanya sesi admin, tulis posisi hanya sesi mitra. Webhook & health tetap bebas.
- Tanpa `SESI_SECRET`: produksi → 503, pengembangan → lolos dengan peringatan. Klien membawa Bearer di GET & POST (`kepalaSesi()` di `js/exo-server.js`); balasan 401 mengarahkan ke OTP. Rincian di `server/KEAMANAN.md` §7.1; uji `node alat/uji-keamanan.js`.

## PIN transaksi untuk semua pengguna (8 Sep 2026)
- PIN 6 digit terpisah dari OTP/sandi (pola Tokopedia/GoPay) untuk pelanggan, mitra cleaning, dan mitra toko: diminta saat bayar/tahan dana, isi & tarik saldo, bayar keranjang toko, pencairan toko, isi saldo iklan, ganti rekening, dan permintaan hapus akun (`js/exo-pin.js`, `js/exo-screens-pin.js`, gerbang `X.denganPin`).
- Server (`auth-server` `/api/auth/pin/*`): hash PBKDF2 per `sub` sesi, PIN lemah ditolak, 5× salah terkunci 30 menit, verifikasi → PIN-token 5 menit yang wajib dibawa ke payment/dwi (`X-Exo-Pin`, `SESI.wajibPin`); reset hanya lewat OTP baru. Tanpa server: hash lokal di perangkat. Layar **PIN transaksi** di Akun tiap sisi (ganti, reset). Cache SW `exoclean-v60`; rincian `server/KEAMANAN.md` §7.2.

## Verifikasi dua langkah untuk semua pengguna (8 Sep 2026)
- **Aplikasi autentikator (TOTP RFC 6238)** dan **passkey (WebAuthn/FIDO2)** untuk pelanggan, mitra cleaning, dan mitra toko, diverifikasi di auth-server (`server/duafaktor.js`): rahasia TOTP terenkripsi, QR dibuat server, anti pemakaian ulang kode; passkey diperiksa tantangan/origin/rpId/tanda tangan/counter; 8 kode pemulihan sekali pakai.
- Alur masuk: OTP pada akun ber-2FA hanya memberi sesi sementara 5 menit yang ditolak semua server sampai kode autentikator, passkey, atau kode pemulihan diverifikasi. Layar **Verifikasi dua langkah** di Akun tiap sisi (`js/exo-screens-2fa.js`); lembar 2FA muncul otomatis setelah OTP. Uji: `npm run test:duafaktor`; rincian `server/KEAMANAN.md` §7.3. Cache SW `exoclean-v61`.
