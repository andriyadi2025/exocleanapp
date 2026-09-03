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
| `js/ruang.js`, `utils.js`, `zona.js`, `foto.js`, `db.js`, `pasar.js`, `wilayah.js`, `kurikulum.js`, `kompetensi.js` | Modul bersama dengan aplikasi manajemen MCS (repositori terpisah); perubahan perlu diterapkan di keduanya |
| `server/` | payment-server (Midtrans), auth-server (OTP, Google, Facebook), posisi-server (posisi mitra lintas perangkat) |
| `data/wilayah/` | Data wilayah Indonesia (Kepmendagri) dan ASEAN |

> Aplikasi manajemen operasional (index.html, mitra.html, mcs.html) sejak 3 Sep 2026 menjadi proyek terpisah: repositori **MCS EXOCLEAN**.

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

