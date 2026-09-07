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
