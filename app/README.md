# EXOCLEAN — Sistem Manajemen Cleaning Service

Aplikasi web (dashboard) untuk seluruh operasional EXOCLEAN, dipakai oleh **5 peran**:
Klien, Admin, Supervisor Lapangan, Mitra Lapangan, dan Mitra Toko — ditambah jalur
notifikasi **WhatsApp** di setiap titik penting.

Enam modul berjalan dalam satu sistem:

- **CRM** — prospek masuk → pipeline → follow-up terjadwal → menang → jadi pelanggan
- **Jasa kebersihan** — permintaan → penawaran → penjadwalan → pengerjaan → QC → invoice
- **Toko perlengkapan** — katalog alat & chemical → keranjang → konfirmasi stok → pengiriman → invoice
- **Pembayaran** — Midtrans & Xendit (VA, QRIS, e-wallet, kartu, gerai retail)
- **Marketplace** — mitra toko daftar sendiri → moderasi produk → jual, beriklan, ikut kampanye
- **Kemitraan & LMS** — mitra daftar sendiri → belajar di aplikasi → tersertifikasi → baru boleh ditugaskan

Semuanya berbagi satu basis data, jadi profil pelanggan menampilkan riwayat jasa,
belanja toko, tagihan, dan percakapan CRM dalam satu layar.

---

## Cara menjalankan

**Cara paling cepat:** klik ganda `index.html`. Aplikasi berjalan langsung di browser,
tanpa install apa pun.

**Bila ingin lewat alamat web lokal** (mis. supaya bisa dibuka dari HP di jaringan
Wi-Fi yang sama):

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Lalu buka `http://localhost:8080`. Untuk berhenti, tekan Ctrl+C di jendela PowerShell.

> Node.js belum terpasang di komputer ini, jadi aplikasi sengaja dibuat **tanpa proses
> build** — HTML/CSS/JavaScript murni. Tidak ada `npm install`.

### Empat pintu masuk

| Berkas | Untuk siapa | Basis kode |
|---|---|---|
| `index.html` | Klien dan mitra toko | bersama |
| `mitra.html` | Mitra lapangan | bersama |
| `mcs.html` | Korporat yang memantau areanya sendiri | bersama |
| `exo.html` | **EXOCLEAN App** — orang memesan juru bersih untuk rumahnya | berdiri sendiri |

Tiga yang pertama memuat modul yang sama, hanya berbeda subsetnya. `exo.html`
sengaja tidak ikut: sistem warnanya berbeda (Organic krem–terakota, bukan teal
merek) dan yang dijualnya juga berbeda — di sini pelanggan **memilih orangnya**
dan tarif ditetapkan tiap juru bersih. Diturunkan dari rancangan Claude Design
*"EXOCLEAN App"*.

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
di `index.html` → *Mitra & Rekrutmen* → buka mitranya → **Tarif pasar**.
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
lewat `file://`), aplikasi memakai roster contoh dari rancangannya. Ia **tidak
pernah** membuat basis data baru — lihat `adaBasisData()` di `js/exo.js` dan
catatan di `exo.html`.

---

## Akun demo

Semua akun memakai kata sandi **`123456`**, dan mitra lapangan / mitra toko memakai PIN transaksi **`246813`**. Di halaman masuk tersedia tombol pintas
per peran, tidak perlu mengetik.

| Peran | Contoh akun | Email |
|---|---|---|
| Klien | Lestari Wijaya (PT Sinar Mandiri Abadi) | `lestari@sinarmandiri.co.id` |
| Admin — Super Admin (IT) | Rina Kartika | `admin@exoclean.id` |
| Admin — Keuangan | Sari Melati | `sari.k@exoclean.id` |
| Admin — Pemasaran & CRM | Bayu Pratama | `bayu.m@exoclean.id` |
| Admin — Marketplace | Indah Permata | `indah.mp@exoclean.id` |
| Supervisor | Budi Santoso (senior) / Dewi Anggraini | `budi@exoclean.id` |
| Mitra aktif | Agus, Joko, Siti, Rudi | `agus@exoclean.id` |
| Mitra sedang bergabung | Nurul (3/5 kursus), Eko (baru mulai), Fajar (baru daftar) | `nurul@exoclean.id` |
| Mitra Toko aktif | Bersih Jaya Supply · Mitra Higienis Indonesia | `budi@bersihjaya.co.id` |
| Mitra Toko menunggu verifikasi | Sinar Alat Kebersihan | `rizky.ananda@gmail.com` |

Masuk sebagai **Nurul** atau **Fajar** untuk melihat alur bergabung dan LMS dari
sisi calon mitra; masuk sebagai **Rina (admin)** → *Mitra & Rekrutmen* untuk sisi
persetujuannya.

---

## Alur kerja yang sudah berjalan

```
Klien pesan layanan
      ↓  (WA: konfirmasi permintaan)
Admin terima permintaan  →  jadwalkan survei (opsional)
      ↓
Admin buat Penawaran     →  kirim  (WA: penawaran + rincian harga)
      ↓
Klien setujui penawaran
      ↓
Admin/Supervisor jadwalkan Order + tugaskan tim
      ↓  (WA: konfirmasi jadwal ke klien + penugasan ke tiap petugas)
Petugas check-in GPS  →  foto sebelum  →  checklist  →  foto sesudah  →  check-out
      ↓  (WA: tim berangkat)
Petugas "Laporkan Selesai"
      ↓  (WA: minta verifikasi supervisor)
Supervisor verifikasi mutu (QC 4 kriteria)
      ├── LULUS      → invoice otomatis terbit  (WA: pekerjaan selesai + invoice + minta rating)
      └── PERBAIKAN  → instruksi perbaikan      (WA: ke tim lapangan)
      ↓
Klien bayar & konfirmasi  →  Admin catat pembayaran
      ↓
Klien beri rating / ajukan komplain (garansi kerja ulang)
```

### CRM — dari prospek menjadi pelanggan

```
Prospek masuk (website, WA, Instagram, Google Ads, referensi, tender, walk-in…)
      ↓
      Prospek Baru → Sudah Dikontak → Survei Lokasi → Penawaran → Negosiasi
                                                                      ↓
                                                            Menang ──┴── Kalah
                                                              ↓            ↓
                                                    jadi akun klien   alasan dicatat
                                                              ↓         untuk evaluasi
                                          masuk alur jasa / toko yang sudah ada
```

Tiap tahap punya bobot peluang (10% → 25% → 45% → 65% → 80%), sehingga sistem
bisa menampilkan **nilai pipeline tertimbang** — bukan sekadar total optimistis.
Setiap perpindahan tahap otomatis tercatat sebagai jejak aktivitas.

**Papan pipeline** menampilkan kartu prospek per tahap berikut nilai, sumber,
kebutuhan, dan jadwal follow-up (merah bila terlambat). Tersedia juga tampilan
daftar dan tampilan corong + analisis sumber prospek mana yang paling banyak
menghasilkan kemenangan.

**Agenda follow-up** mengelompokkan tugas menjadi *terlambat*, *hari ini*, dan
*14 hari ke depan* — plus daftar prospek yang **belum dijadwalkan tindak
lanjutnya sama sekali**, yang biasanya jadi penyebab prospek hilang diam-diam.

**Pelanggan 360°** menghitung segmen secara otomatis dari data yang ada, bukan
diinput manual, jadi selalu mengikuti keadaan sebenarnya:

| Segmen | Aturan |
|---|---|
| Perlu Perhatian | ada komplain terbuka, rating terakhir ≤3, atau invoice jatuh tempo |
| Pelanggan Setia | ≥3 pekerjaan selesai dan masih aktif |
| Aktif | ada transaksi dalam 60 hari terakhir |
| Dorman | tidak ada transaksi lebih dari 120 hari |
| Pelanggan Baru | belum ada pekerjaan selesai |

Profilnya menampilkan nilai seumur hidup, sudah dibayar, piutang, riwayat
pekerjaan, belanja toko, komplain, rating, asal prospek, dan seluruh aktivitas
CRM dalam satu modal.

**Kampanye WhatsApp** menyasar satu segmen, membuat draf pesan personal per
penerima, lalu memasukkannya ke WA Outbox — **tidak langsung terkirim**, supaya
nomor tidak berisiko diblokir karena blast massal. Tiap pengiriman tercatat
sebagai aktivitas di profil pelanggan.

### Kemitraan & LMS — dari mendaftar sampai tersertifikasi

Tenaga kerja lapangan EXOCLEAN adalah **Mitra**, bukan karyawan tetap. Mereka
**mendaftar sendiri lewat aplikasi** dari tombol *Daftar Jadi Mitra* di halaman
masuk, lalu melewati lima gerbang sebelum boleh menerima pekerjaan:

```
Daftar mandiri (nama, WA, email, kota, pengalaman, minat)
      ↓
1. Menyetujui Syarat & Ketentuan Mitra   — 10 butir, dicentang satu per satu
2. Melengkapi berkas kemitraan            — identitas, kontak darurat, alamat tinggal
3. Menyelesaikan pembelajaran wajib       — 5 kursus: materi + kuis
4. Lulus sertifikasi mitra                — sertifikat terbit otomatis
5. Persetujuan admin EXOCLEAN             — verifikasi berkas & hasil belajar
      ↓
Status "Mitra aktif" → baru muncul di daftar penugasan
```

**Kelima gerbang dihitung ulang dari data, bukan status yang ditulis manual** —
jadi tidak ada jalan pintas. Selama belum aktif, mitra tidak muncul di daftar
petugas saat admin menjadwalkan order maupun saat supervisor mengatur tim.
Menu mitra pun menyesuaikan: yang belum aktif hanya melihat *Bergabung*,
*Belajar*, dan *Profil* — tanpa menu Tugas.

#### Syarat & Ketentuan (checklist)

10 butir yang harus dibaca dan dicentang satu per satu — status kemitraan,
kebenaran data, kepatuhan K3, kehadiran & GPS, mutu dan dokumentasi, kerahasiaan
di lokasi klien, peralatan, pembayaran ke rekening sendiri, kewajiban lulus
pembelajaran, dan pengakhiran kemitraan. Tombol *Saya Setuju* baru aktif setelah
seluruh butir dicentang, dan persetujuannya disimpan berikut versi dokumen serta
waktunya sebagai bagian dari berkas kemitraan.

#### Kurikulum

| Kode | Kursus | Sifat | Materi | Soal | KKM |
|---|---|---|---|---|---|
| `K3-DASAR` | Keselamatan & Kesehatan Kerja Dasar | Wajib | 4 | 5 | 80 |
| `SOP-BERSIH` | SOP Pembersihan & Penggunaan Chemical | Wajib | 4 | 5 | 80 |
| `ALAT` | Pengenalan & Perawatan Alat Kebersihan | Wajib | 4 | 5 | 80 |
| `LAYANAN` | Etika Pelayanan & Komunikasi dengan Klien | Wajib | 4 | 5 | 80 |
| `APLIKASI` | Menggunakan Aplikasi EXOCLEAN di Lapangan | Wajib | 4 | 5 | 80 |
| `KETINGGIAN` | Bekerja di Ketinggian & Rope Access | Spesialisasi | 4 | 5 | 85 |
| `AC` | Perawatan & Cuci AC | Spesialisasi | 4 | 5 | 80 |

Isinya materi nyata, bukan pengisi tempat — larangan mencampur chemical berbasis
klorin dengan asam, aturan dua titik pengaman pada rope access, urutan sembilan
langkah cuci AC split, sampai apa yang harus dilakukan saat menemukan dompet
klien. Materinya ada di [kurikulum.js](js/kurikulum.js) dan mudah disunting.

**Aturan belajar:** kuis baru terbuka setelah seluruh materi dibaca. Nilai =
jawaban benar ÷ total × 100. Tidak ada batas percobaan — yang dihitung nilai
terbaik. Setiap percobaan tercatat, dan setelah kuis dikirim muncul pembahasan
per soal beserta jawaban yang benar.

#### Sertifikat

Lulus satu kursus → **sertifikat kursus** terbit otomatis. Lulus seluruh kursus
wajib → **Sertifikat Mitra Tersertifikasi EXOCLEAN** dengan nilai rata-rata.
Semuanya langsung muncul di **halaman Profil** mitra, lengkap dengan nomor
dokumen, nilai, masa berlaku (3 tahun untuk kursus wajib, 2 tahun untuk
spesialisasi), dan **kode verifikasi** yang bisa dicocokkan admin maupun klien.
Sertifikat dapat dibuka sebagai dokumen dan dicetak.

Kursus spesialisasi menambah jenis pekerjaan yang boleh diambil — rope access
dan cuci AC — sehingga sertifikat bukan sekadar hiasan profil.

#### Sisi admin

Dua halaman baru di grup **Kemitraan**:

- **Mitra & Rekrutmen** — memantau kemajuan onboarding setiap pendaftar, melihat
  nilai per kursus dan sertifikatnya, lalu menyetujui / menolak / menonaktifkan.
  Tombol Setujui terkunci selama masih ada tahap yang belum selesai. Persetujuan
  memicu pesan WhatsApp ucapan selamat berikut pengingat aturan lapangan.
- **Pembelajaran (LMS)** — daftar kursus dengan statistik kelulusan, pratinjau
  materi & kunci jawaban, matriks nilai seluruh mitra per kursus, dan daftar
  sertifikat terbit.

### Peta & lokasi

Google Maps dipakai untuk dua hal: **memastikan alamat tidak salah** dan
**menghitung ongkir dari jarak sebenarnya**.

> **Soal API key.** Google Maps JavaScript API dan Places Autocomplete menuntut
> API key dengan penagihan aktif, dan key itu ikut terunduh ke browser. Karena
> itu aplikasi ini bekerja **dua tingkat**: tanpa key semuanya tetap jalan, dan
> naik kelas otomatis begitu admin mengisi Embed API key di
> *Marketplace → Peta & Ongkir*.

| | Tanpa key (bawaan) | Dengan Embed API key |
|---|---|---|
| Pratinjau peta | mode `output=embed` | Embed API resmi |
| Tautan & petunjuk arah | ✅ | ✅ |
| Ambil titik dari GPS | ✅ | ✅ |
| Baca koordinat dari tautan Maps | ✅ | ✅ |
| Hitung jarak & ongkir | ✅ | ✅ |

Places Autocomplete, Geocoding, dan Distance Matrix **sengaja tidak dipanggil
dari browser** — ketiganya menagih kuota per permintaan dan akan terkuras bila
key-nya dipakai orang lain. Bila dibutuhkan, panggil lewat backend seperti pola
pada folder [`server/`](server/).

**Menandai titik** bisa lewat tiga cara, tanpa perlu peta interaktif berbayar:
ambil dari GPS perangkat, tempel tautan Google Maps (koordinatnya dibaca
otomatis dari `@lat,lng`, `?q=`, atau `!3d!4d`), atau ketik lintang–bujur
langsung. Tautan pendek `maps.app.goo.gl` ditolak dengan penjelasan agar
pengguna menyalin tautan panjangnya.

**Ongkir berjenjang menurut jarak** — bukan linier per kilometer, mengikuti pola
tarif kurir Indonesia:

| Jarak | Tarif |
|---|---|
| ≤5 km | Rp15.000 |
| ≤10 km | Rp25.000 |
| ≤20 km | Rp40.000 |
| ≤50 km | Rp65.000 |
| ≤200 km | Rp90.000 |
| ≤700 km | Rp150.000 |
| >700 km | Rp220.000 |

Bila titik pembeli atau gudang penjual belum ditandai, dipakai **tarif dasar
Rp50.000** dan pengguna diberi tahu alasannya. Jarak dihitung garis lurus, jadi
angkanya perkiraan — jarak tempuh sebenarnya biasanya 20–40% lebih jauh.

Peta muncul di: alamat tersimpan (Profil), detail order, layar tugas petugas
("Menuju Lokasi" + tombol Rute), profil gudang Mitra Toko, dan keranjang belanja.

### Marketplace — Mitra Toko

Toko EXOCLEAN bukan lagi toko satu penjual. Siapa pun bisa mendaftar jadi
**Mitra Toko** dan menjual alat, perlengkapan, aksesoris, serta chemical
kebersihan di dalam aplikasi. Produk tanpa penjual tetap milik **Toko Resmi
EXOCLEAN**, jadi katalog lama tidak terganggu.

```
Daftar Mitra Toko dari halaman masuk
      ↓
1. Lengkapi profil toko (nama, kota, gudang, kategori)
2. Isi identitas penjual
3. Tambahkan rekening pencairan
4. Daftarkan produk pertama
5. Verifikasi admin  →  toko tayang di katalog
      ↓
Produk tiap kali ditambah/diubah harganya → moderasi admin → tayang
```

#### Aliran uang satu pesanan

```
pembeli bayar = subtotal barang + ongkir + PPN
──────────────────────────────────────────────
ongkir        → kurir (selisihnya margin logistik EXOCLEAN)
komisi        → EXOCLEAN, 8–15% menurut kategori produk
beban promosi → porsi diskon kampanye yang ditanggung penjual
──────────────────────────────────────────────
diterima penjual = subtotal − komisi − beban promosi
```

| Kategori | Komisi |
|---|---|
| Mesin & Peralatan | 8% |
| Chemical Pembersih · APD & Keselamatan Kerja | 12% |
| Alat Kebersihan · Consumable · Aksesoris | 15% |

Dana pesanan **tertahan** sampai pembeli menerima barang + 3 hari, lalu masuk
saldo yang bisa dicairkan (minimum Rp100.000, biaya transfer Rp5.000).

#### Keranjang lintas toko

Satu keranjang berisi produk dari beberapa toko otomatis **dipecah menjadi
beberapa pesanan** saat checkout — masing-masing dengan ongkir, penjual, dan
nomor resi sendiri, disatukan oleh satu `groupId`. Pembeli tetap sekali bayar.

#### Iklan

Penjual mengisi **saldo iklan**, lalu memilih format:

| Format | Tarif | Cara kerja |
|---|---|---|
| Produk Disorot | Rp1.500/klik | Baris teratas katalog |
| Sponsor Kategori | Rp2.000/klik | Teratas pada kategori pilihan |
| Banner Beranda | Rp150.000/hari | Spanduk di beranda klien |

Yang berbasis klik **hanya menagih saat produk benar-benar ditekan** — tayangan
gratis. Iklan berhenti otomatis ketika anggaran atau saldo habis. Semua produk
bersponsor diberi label **Iklan** di katalog supaya pembeli tahu mana yang
berbayar.

#### Kampanye & event

Admin membuat kampanye (Flash Sale, Gratis Ongkir, Diskon Kategori, Event Hari
Besar) dengan **pembagian beban yang terbuka** — misal 60% penjual / 40%
EXOCLEAN. Penjual melihat persis berapa rupiah yang akan ia tanggung per unit
sebelum memutuskan ikut. Produk yang ikut tampil dengan harga coret.

### Bagi hasil dengan mitra

Mitra bukan karyawan bergaji — pendapatannya dihitung **per pekerjaan yang
selesai dan lulus verifikasi mutu**, persis seperti yang dijanjikan pada butir 1
Syarat & Ketentuan Mitra. Order yang belum diverifikasi supervisor tidak pernah
masuk hitungan.

**Rumus per order, per mitra:**

```
dasar        = nilai order × porsi mitra (%)           ← porsi berbeda tiap layanan
bagian saya  = dasar × (bobot saya ÷ total bobot tim)  ← leader 1,15× ; anggota 1×
tunjangan    = transport + makan (bila durasi jadwal ≥ 6 jam)
bonus mutu   = bagian saya × 5%  (bila rata-rata nilai QC ≥ 4,5)
─────────────────────────────────────────────────────────────
diterima     = bagian saya + tunjangan + bonus mutu
```

Porsi disetel per jenis layanan: pekerjaan berisiko tinggi seperti **rope access
50%**, layanan padat mesin & chemical seperti **poles lantai dan cuci karpet 38%**,
isi freon **35%** karena materialnya mahal. Semua bisa diubah admin di menu
*Bagi Hasil Mitra → Skema*.

**Alur pencairan** (dua kali sebulan: tanggal 1–15 dan 16–akhir bulan):

```
Pekerjaan lulus QC → masuk estimasi periode berjalan (angka hidup)
      ↓
Periode tutup → admin buat slip → angka DIBEKUKAN beserta skema saat itu
      ↓  (WA: slip bagi hasil + rincian per pekerjaan)
Admin setujui → transfer → tandai dibayar + no. referensi
      ↓  (WA: konfirmasi transfer)
Mitra lihat riwayat slip di menu Pendapatan
```

Yang penting untuk kepercayaan mitra:

- **Setiap rupiah bisa ditelusuri.** Tiap baris pendapatan bisa dibuka sampai
  rinciannya: nilai order, porsi %, pembagian tim beserta bobotnya, tunjangan,
  dan dasar bonus mutu.
- **Slip yang sudah terbit tidak berubah** meski skema diperbarui kemudian —
  skema saat penerbitan ikut disimpan di dalam slip dan dicetak di bawahnya.
- **Potongan tidak sepihak.** Penyesuaian (mis. penggantian alat hilang) selalu
  punya keterangan dan terlihat jelas di slip.
- Admin juga melihat **margin perusahaan** per periode: bruto − bagi hasil.

### Halaman Profil — dipakai keempat peran

Satu halaman Profil yang sama untuk Klien, Admin, Supervisor, dan Tenaga Lapangan,
dengan isi yang menyesuaikan peran. Susunannya mengikuti pola aplikasi
marketplace: kartu identitas, tab pengaturan, lalu promo di bawah.

| Bagian | Isi |
|---|---|
| Kartu identitas | Foto profil (bisa diunggah & diganti), nama, peran, segmen pelanggan, tanggal bergabung, bahasa aktif |
| Statistik | Menyesuaikan peran — klien: pekerjaan, belanja toko, nilai transaksi, penilaian. Petugas: tugas, jam kerja, rata QC, sertifikat. Supervisor: tim, anggota, pekerjaan, verifikasi. Admin: klien, petugas, order berjalan, pendapatan |
| Data Diri | Nama, perusahaan/jabatan, WhatsApp, email, jenis bangunan |
| Alamat Tersimpan | Banyak alamat berlabel (Rumah/Kantor/Gudang/…), penerima, telepon, kota, kode pos, patokan, tandai utama |
| Rekening Bank | Banyak rekening, tandai utama. Klien: tujuan pengembalian dana. Tim: tujuan gaji |
| Keamanan | Ubah kata sandi + informasi akun |
| Preferensi | Pilihan bahasa & pengaturan notifikasi |
| Promo | Blok promo di bagian bawah — lihat di bawah |

Alamat utama otomatis disalin ke field `alamat` yang sudah dipakai order, invoice,
dan pengiriman toko, jadi tidak ada data yang bercabang. Menghapus alamat utama
otomatis memindahkan status utama ke alamat berikutnya.

#### Berkas Kepegawaian (tenaga lapangan & supervisor)

Tab tambahan yang hanya muncul untuk pegawai lapangan — tidak ada di profil klien
maupun admin. Isinya empat bagian:

| Bagian | Isi |
|---|---|
| Identitas resmi | Jenis kartu (KTP / SIM / Paspor), nomor, nama sesuai kartu, tanggal lahir, masa berlaku, alamat sesuai kartu |
| Foto kartu | Foto tampak depan + swafoto memegang kartu |
| Kontak darurat | Beberapa kontak: nama, **hubungan** (Suami/Istri/Orang Tua/…), nomor telepon, alamat, tandai utama |
| Alamat tinggal sekarang | Alamat lengkap gaya Indonesia: jalan, RT/RW, kelurahan, kecamatan, kota, provinsi, kode pos, status tempat tinggal, tinggal sejak, patokan |

Alamat tinggal sengaja dipisah dari alamat kartu identitas — keduanya sering
berbeda, dan yang dipakai untuk penjemputan tim adalah alamat tinggal.

**Validasi nomor sesuai jenis kartu:** KTP 16 digit angka, SIM 12–16 digit,
Paspor 1 huruf + 6–8 angka. **Masa berlaku** dilacak: KTP tanpa tanggal dianggap
seumur hidup, sedangkan SIM/Paspor diberi peringatan ketika tersisa ≤60 hari dan
ditandai merah bila sudah lewat.

**Kelengkapan berkas** dihitung dari 5 poin dan ditampilkan sebagai bar progres
untuk petugas, sekaligus jadi daftar kejar di sisi admin — halaman *Tim & Pegawai*
menampilkan kolom status berkas dan spanduk berisi siapa saja yang perlu
ditindaklanjuti. Admin bisa menandai berkas **terverifikasi**; mengubah nomor atau
mengganti foto otomatis membatalkan verifikasi supaya diperiksa ulang.

Supervisor melihat **kontak darurat anggota timnya** langsung di halaman *Tim Saya*
berikut tombol telepon dan WhatsApp — ini kebutuhan keselamatan kerja, bukan
sekadar kelengkapan data.

##### Bagaimana data sensitif ini diperlakukan

- **Nomor identitas disamarkan** (`3273••••••••0003`) dan hanya terbuka setelah
  menekan tombol Lihat. Pembukaan nomor oleh orang lain dicatat di log aktivitas.
- **Akses dibatasi ke tiga pihak**: pemiliknya sendiri, admin, dan supervisor tim
  tempat orang itu berada. Supervisor tim lain, sesama petugas, dan klien ditolak
  dengan halaman *Akses ditolak* — bukan sekadar disembunyikan dari tampilan.
- **Peringatan penyimpanan** ditampilkan terus terang di halaman itu: pada
  prototipe ini foto identitas masih tersimpan di browser. Sebelum dipakai
  sungguhan, berkas seperti ini wajib pindah ke penyimpanan terenkripsi dengan
  kontrol akses dan jejak audit — lihat langkah berikutnya di bawah.
- Foto identitas pada data contoh sengaja berupa **gambar bertanda “CONTOH —
  BUKAN DOKUMEN ASLI”**, bukan kartu sungguhan.

#### Pemilihan bahasa

Indonesia ↔ English, tersimpan per pengguna dan langsung diterapkan tanpa
memuat ulang halaman. Kamusnya memakai teks Indonesia sebagai kunci
([i18n.js](js/i18n.js)), jadi menerjemahkan bagian baru cukup dengan
membungkusnya: `I18N.t('Beranda')`.

> **Batas cakupan, supaya jelas.** Yang diterjemahkan adalah **antarmuka** — menu,
> judul halaman, status, tombol, dan seluruh halaman Profil. **Isi bisnis tetap
> Bahasa Indonesia**: nama layanan, nama produk, isi dokumen penawaran/invoice,
> dan pesan WhatsApp — karena itu data yang dikirim ke klien dan tim di Indonesia,
> bukan label antarmuka.

#### Promo & program

Blok di bagian bawah profil, isinya menyesuaikan peran:

- **Klien** → promo nyata: diskon Cuci AC 30%, gratis ongkir toko, kontrak tahunan
  hemat 15%, potongan deep cleaning. Ada kode promo yang bisa disalin sekali klik,
  batas berlaku, dan sisa kuota.
- **Tim lapangan & supervisor** → program internal: pelatihan & sertifikasi K3,
  bonus kinerja QC, beasiswa Rope Access Level 2.
- **Semua peran** → program referral.

Promo yang kedaluwarsa atau kuotanya habis otomatis tidak ditampilkan.

### Grafik di area klien

Klien punya halaman **Ringkasan Aktivitas** berisi tiga grafik yang terisi
otomatis dari pemesanan layanan dan pembelian produknya:

| Grafik | Bentuk | Isi |
|---|---|---|
| Pengeluaran per bulan | kolom bertumpuk, 6 / 12 bulan | jasa kebersihan vs toko perlengkapan |
| Layanan paling sering dipesan | batang horizontal | 5 teratas berdasarkan nilai |
| Produk paling sering dibeli | batang horizontal | 5 teratas berdasarkan nilai |

Versi ringkas grafik bulanan juga tampil di **Beranda** klien.

Digambar dengan SVG di [chart.js](js/chart.js) — tanpa library, jadi tetap tanpa
build step. Aturan yang dipegang: batang maksimal 24px dengan ujung membulat 4px,
celah 2px antar segmen tumpukan (bukan garis tepi), grid garis rambut yang mundur
ke belakang, label angka hanya di kolom tertinggi, dan teks selalu memakai warna
teks — bukan warna seri.

**Warna dua seri sudah divalidasi, bukan dikira-kira:** teal `#14958A` (jasa) dan
oranye `#C2410C` (toko) diuji dengan validator palet — ΔE buta warna 13,9 ·
ΔE penglihatan normal 27,1 · kontras ≥ 3:1 di atas permukaan putih. Jangan ganti
hex-nya tanpa menjalankan ulang validator itu.

Setiap grafik punya **kembaran tabel** (tombol *Tampilkan tabel*) sehingga tidak
ada angka yang hanya bisa dibaca lewat warna atau tooltip.

### Alur Toko Perlengkapan

```
Klien pilih produk → keranjang → checkout
      ↓  (WA: pesanan diterima ke klien + notifikasi internal ke admin)
Admin cek stok
      ├── stok kurang → (WA: tawarkan tunggu restock / ganti produk / kirim sebagian)
      └── stok cukup  → KONFIRMASI
              • stok dipotong otomatis
              • invoice terbit otomatis
              • (WA: konfirmasi + rincian + instruksi pembayaran)
      ↓
Dikemas → Dikirim (input kurir + no. resi)   (WA: nomor resi ke klien)
      ↓
Klien tekan "Barang Diterima"                 (WA: terima kasih + tawaran restock berkala)
```

Pembatalan pesanan yang sudah dikonfirmasi **mengembalikan stok secara otomatis**.
Invoice toko dan invoice jasa masuk ke daftar tagihan yang sama, dibedakan dengan
penanda 🛒 / 🧹.

### Katalog toko (35 produk, 5 kategori)

| Kategori | Isi | Contoh |
|---|---|---|
| Chemical Pembersih | 10 | floor cleaner, glass cleaner, degreaser, disinfektan, marble polish, carpet shampoo |
| Alat Kebersihan | 10 | mop set, squeegee teleskopik, trolley housekeeping, ember pel ganda, wet floor sign |
| Mesin & Peralatan | 5 | vacuum wet&dry, floor polisher, high pressure cleaner, blower, carpet extractor |
| APD & Keselamatan Kerja | 6 | sarung tangan, masker N95, safety helmet, full body harness, safety shoes |
| Consumable | 4 | tisu jumbo roll, trash bag, pengharum ruangan, hand towel |

Setiap produk punya harga, satuan, stok, dan **batas minimum stok** — sistem otomatis
menandai produk yang perlu restock di dashboard admin. Ongkir flat Rp50.000 dan
**gratis ongkir di atas Rp2.000.000** (bisa diubah di `js/views/toko.js`).

### Pembayaran — Midtrans & Xendit

> **Kunci rahasia gateway tidak boleh ada di browser.** Server Key Midtrans dan
> Secret Key Xendit memberi akses penuh ke akun pembayaran Anda; kalau ditaruh di
> JavaScript, siapa pun bisa membacanya. Webhook "sudah dibayar" juga hanya bisa
> diterima server. Karena itu aplikasi ini bicara ke **backend Anda sendiri**,
> bukan langsung ke gateway. Kode backend siap pakai ada di [`server/`](server/).

Tiga mode, dipilih di **Admin → Pengaturan Pembayaran**:

| Mode | Kegunaan | Butuh backend? |
|---|---|---|
| **Simulasi** (bawaan) | Demo & pelatihan tim. Nomor VA/QRIS/kode bayar dibuat lokal, status dipicu manual. | Tidak |
| **Midtrans** | Snap & Core API | Ya |
| **Xendit** | Invoice, VA, e-wallet, retail API | Ya |

**17 kanal pembayaran**, aktif/nonaktif per kanal:

| Grup | Kanal | Biaya bawaan* |
|---|---|---|
| Virtual Account | BCA, Mandiri, BNI, BRI, Permata, CIMB | Rp4.000 |
| QRIS | semua aplikasi pembayaran | 0,7% |
| E-Wallet | GoPay, ShopeePay, OVO, DANA, LinkAja | 2% |
| Kartu | Visa, Mastercard, JCB | 2,9% + Rp2.000 |
| Gerai retail | Alfamart/Alfamidi, Indomaret | Rp5.000 |
| Tanpa gateway | Transfer manual, COD | — |

<small>*Angka bawaan, semua ditambah PPN 11% atas jasa gateway. Sesuaikan dengan
kesepakatan merchant Anda — biaya sesungguhnya ditentukan oleh gateway.*</small>

Biaya layanan bisa diatur **ditanggung EXOCLEAN** (klien bayar persis sesuai
tagihan) atau **ditanggung klien** (biaya ditambahkan ke nominal transfer).
Yang tercatat pada invoice selalu nilai tagihan, bukan termasuk biaya gateway,
supaya pembukuan tetap cocok.

**Alur pembayaran:**

```
Klien buka tagihan → pilih metode → sistem buat transaksi
      ↓                                    (WA: tautan bayar + nomor VA/QR)
Klien bayar di aplikasi bank / e-wallet / gerai
      ↓
Gateway kirim webhook ke backend Anda  →  backend verifikasi tanda tangan
      ↓
Status transaksi jadi "Berhasil" → pembayaran tercatat di invoice otomatis
      ↓                                    (WA: pembayaran diterima + sisa tagihan)
Invoice jadi Lunas / Dibayar Sebagian
```

Transaksi kedaluwarsa ditandai otomatis, dan membuat tautan baru akan
membatalkan tautan lama supaya tidak ada dua VA aktif untuk satu tagihan.

### Masuk & daftar mandiri — email, HP, Google, Facebook

Empat cara masuk, satu kolom identitas: pengguna mengetik **email atau nomor HP**
di kolom yang sama, sistem yang membedakannya. Nomor HP dibakukan ke bentuk
`628xxx`, jadi `08123…`, `+62 812-…`, dan `62812…` dikenali sebagai satu nomor
yang sama dan tidak bisa didaftarkan dua kali.

**Verifikasi bukan formalitas.** Pendaftaran berjalan sebagai empat langkah, dan
akunnya **baru benar-benar dibuat pada langkah terakhir**:

```
1. Data diri            nama, email, nomor HP
2. Verifikasi email     OTP 6 angka
3. Verifikasi nomor HP  OTP 6 angka
4. Kata sandi        →  akun dibuat
```

Berhenti di tengah jalan tidak meninggalkan apa pun — tidak ada akun "belum
terverifikasi" yang menumpuk di basis data. `AKUN.buatAkun()` menolak permintaan
tanpa bukti verifikasi keduanya, jadi aturannya ditegakkan di lapisan data, bukan
sekadar disembunyikan di tampilan.

OTP berlaku 5 menit, dibatasi **5 percobaan**, dan **60 detik jeda** sebelum boleh
minta kode baru. Kodenya disimpan sebagai turunan PBKDF2 ber-salt, bukan angka polos.

**Mendaftar lewat Google/Facebook** melompati verifikasi email — penyedia sudah
memverifikasinya — tetapi **tetap wajib verifikasi nomor HP**, karena penyedia
tidak menjamin nomor. Tiga jalur akun sosial semuanya berfungsi: akun yang sudah
tertaut langsung masuk; akun yang emailnya cocok dengan pengguna lama ditautkan
otomatis lalu masuk; akun yang benar-benar baru diarahkan ke pendaftaran.

**Tidak ada pilihan Mitra/Klien di formulir pendaftaran.** Semua akun baru masuk
sebagai **Klien** dan langsung bisa memesan layanan serta berbelanja. Pilihan
menjadi Affiliate, Dropshipper, Mitra Lapangan, atau Mitra Toko ada di
**Profil → Peran Akun**, kapan saja, tanpa membuat akun baru.

#### Dua mode, dan backend yang membuatnya nyata

Pengiriman OTP dan pertukaran token OAuth **tidak bisa** dikerjakan dari browser
saja: SMS butuh gateway berbayar, dan verifikasi `id_token` Google /
`access_token` Facebook **wajib** dilakukan di server memakai client secret —
menaruh secret di browser sama dengan membagikannya ke publik. Karena itu modul
ini punya dua mode, sama seperti modul pembayaran:

* **`simulasi`** (bawaan) — OTP tampil di layar dengan label jelas, pemilih akun Google/Facebook ditiru. Seluruh alur, batas percobaan, dan bentuk datanya persis seperti aslinya.
* **`nyata`** — menyala setelah Client ID / App ID dan alamat backend diisi di **Akun & Login**. Aplikasi memuat SDK resmi penyedia, lalu **mengirim tokennya ke backend** untuk diverifikasi; OTP pun sepenuhnya diurus server dan kodenya tidak pernah sampai ke browser.

Backend-nya ada di [`server/auth-server.js`](app/server/auth-server.js) —
lima endpoint, dijalankan dengan `npm run start:auth`. Yang diperiksanya:

| Yang diverifikasi | Bagaimana |
|---|---|
| `id_token` Google | Tanda tangan RS256 terhadap JWKS Google (dengan cache), penerbit, audience = Client ID, masa berlaku, `email_verified`. `alg` selain RS256 ditolak, sehingga serangan `alg=none` tidak lolos. |
| `access_token` Facebook | `/debug_token` memastikan token memang untuk App ID kita dan masih hidup, lalu `/me` dengan `appsecret_proof`. |
| OTP | `crypto.randomInt`, disimpan sebagai turunan PBKDF2-SHA256 100.000 putaran ber-salt, dibanding dengan `timingSafeEqual`, sekali pakai, plus jeda kirim, batas percobaan, dan batas per jam. |

Halaman **Akun & Login** (izin `sistem.akun` — bawaannya hanya Super Admin/IT)
mengatur mode, Client ID, App ID, alamat backend, dan ketentuan OTP, lengkap
dengan tombol **Uji koneksi**. Kolomnya **menolak nilai yang terlihat seperti
secret** — Client Secret dan App Secret hanya boleh ada di `.env` server.

> **Batas pengujian yang jujur.** Node.js belum terpasang di komputer ini,
> sehingga `auth-server.js` **belum pernah dijalankan**. Yang sudah dibuktikan
> adalah **logika verifikasinya**: alur verifikasi JWT yang sama direproduksi di
> browser dengan WebCrypto (algoritma identik, RSASSA-PKCS1-v1_5 + SHA-256), dan
> lolos delapan kasus — token sah diterima; payload yang dipalsukan, audience
> aplikasi lain, penerbit bukan Google, token kedaluwarsa, email belum
> diverifikasi, `kid` tak dikenal, dan `alg=none` semuanya ditolak. Yang belum
> teruji adalah pemanggilan API Node-nya dan jaringan ke Google/Meta, yang baru
> bisa dicoba setelah Node terpasang dan Client ID terdaftar.

### Berbagi ke media sosial

Tombol **🔗 Bagikan** ada di setiap kartu produk (45 produk) dan setiap kartu
layanan. Panelnya menampilkan pratinjau teks yang akan terkirim, lalu enam kanal:
WhatsApp, Facebook, X, Telegram, LINE, dan Email — ditambah **Web Share API**
bawaan perangkat bila tersedia, dan salin tautan.

Semua kanal dibuka lewat URL berbagi resmi masing-masing platform, bukan SDK:
tidak ada skrip pihak ketiga yang dimuat, tidak ada pelacak yang ikut masuk, dan
tautannya tetap berfungsi walau platformnya mengubah SDK-nya.

Bila pembagi adalah **affiliate aktif**, kode rujukannya otomatis disisipkan ke
tautan — berbagi dan afiliasi menjadi satu gerakan, bukan dua menu terpisah.

### Program afiliasi

Klien mendaftar dari *Profil → Peran Akun*, mendapat kode rujukan sendiri, lalu
membagikan tautan. Alur uangnya:

```
klik tautan            → tercatat (belum bernilai)
orang mendaftar        → jadi referral, melekat 90 hari
referral bertransaksi  → komisi TERTUNDA
masa tahan lewat       → komisi MATANG, masuk saldo Dompet
ditarik                → lewat menu Dompet, bergerbang PIN
```

**Komisi ditentukan admin sepenuhnya** di *Afiliasi & Dropship → Ketentuan &
Komisi*: persentase jasa, persentase produk, bonus referral pertama, masa tahan,
masa lekat, dan batas jumlah transaksi berkomisi.

Aturan yang dipegang kode:

* **Komisi jasa dihitung saat invoice LUNAS**, bukan saat terbit — menghitungnya lebih awal berarti membayar komisi atas uang yang belum tentu masuk. Diuji: pembayaran sebagian menghasilkan 0 komisi, pelunasan menghasilkan 1.
* **Komisi produk dihitung saat barang diterima pembeli**, bukan saat pesanan dibuat.
* **Masa tahan** mencegah membayar komisi atas transaksi yang akhirnya batal. Pesanan yang dibatalkan **menarik kembali** komisi yang sudah masuk saldo lewat mutasi tercatat — bukan diam-diam.
* Setiap komisi **membekukan skemanya sendiri**, jadi mengubah tarif tidak pernah mengubah komisi yang sudah terbit.
* Tidak bisa merujuk diri sendiri, dan komisi tidak pernah dobel untuk dokumen yang sama.

### Sistem dropshipper

Dropshipper menjual produk EXOCLEAN tanpa menyetok barang: ia memilih produk,
**menetapkan harga jualnya sendiri**, dan barangnya dikirim langsung dari gudang
ke pembeli atas nama tokonya.

| | Afiliasi | Dropship |
|---|---|---|
| Harga | tetap harga EXOCLEAN | ditentukan sendiri |
| Imbalan | persentase komisi dari admin | selisih harga jual − harga dasar |
| Hubungan dengan pembeli | tidak ada | ia yang menghadapi pembeli |
| Persetujuan | otomatis (dapat diubah) | ditinjau admin lebih dulu |

Admin menetapkan **batas bawah dan batas atas markup**. Batas atas bukan untuk
membatasi keuntungan, melainkan melindungi nama EXOCLEAN — produk yang sama
dijual dua kali lipat di kanal dropshipper akan merusak kepercayaan pada toko
resminya. Batas ini ditegakkan saat menambah produk **maupun** saat mengubah harga.

Margin ditahan sampai **barang benar-benar diterima pembeli**, baru masa tahannya
berjalan. Diuji: `segarkan()` mengembalikan 0 selama barang belum diterima, 0 lagi
selama masa tahan berjalan, dan baru 1 setelah keduanya lewat.

### Katalog layanan & Fungsi Kerja mitra

Katalog dari berkas **Layanan Jasa EXOCLEAN.xlsx** sudah masuk sistem: **22 kelompok
layanan, 98 sub-layanan, 137 varian** — dari Kurir, Care Giver, Waitress, Driver,
Gardener, Massage, Pest Control, Cuci Kendaraan, Beauty Care, Cleaning Service,
Cuci AC, Plumbing, Juru Masak, Pindahan, Guide Tour, Penerjemah, sampai Sedot Toilet.

Dua catatan penyalinan yang perlu diketahui:

* Berkas sumber **tidak memuat kolom harga**, jadi seluruh layanan baru ditandai *perlu survei* — harganya keluar lewat penawaran, bukan ditebak sistem. Begitu daftar harga tersedia, cukup isi `hargaMin`/`hargaMax` di [`js/katalog.js`](app/js/katalog.js).
* Ejaan dirapikan seperlunya (Umun→Umum, Complate→Complete, Laudry→Laundry, Freaon→Freon, Smooting→Smoothing, Chines→Chinese, Mattrs→Matras) karena nama-nama ini tampil di hadapan klien. Baris bertanda "( Pilihan : … )" bukan layanan terpisah — disimpan sebagai **opsi pesanan**.

#### Mitra mendaftar sendiri, sertifikasi yang membuka pekerjaannya

Setiap kelompok layanan terikat pada satu **Fungsi Kerja**. Ada **15 fungsi**, dan
masing-masing dibuka oleh **satu kursus sertifikasi** di LMS:

| Fungsi Kerja | Risiko | Kursus pembuka |
|---|---|---|
| Cleaning Service | rendah | Sertifikasi Cleaning Service Profesional |
| Cuci Furnitur & Tekstil | rendah | Sertifikasi Cuci Furnitur & Tekstil |
| Laundry & Setrika | rendah | Sertifikasi Laundry & Setrika |
| Cuci & Detailing Kendaraan | rendah | Sertifikasi Cuci & Detailing Kendaraan |
| Pelayanan Tamu & Pendampingan | rendah | Sertifikasi Pelayanan Tamu & Pendampingan |
| Perawatan AC | sedang | Perawatan & Cuci AC |
| Poles Lantai | sedang | Sertifikasi Poles Lantai & Batu Alam |
| Gardener & Pertamanan | sedang | Sertifikasi Gardener & Pertamanan |
| Juru Masak | sedang | Sertifikasi Juru Masak & Keamanan Pangan |
| Driver, Kurir & Pindahan | sedang | Sertifikasi Driver, Kurir & Pindahan |
| Kerja Ketinggian & Fasad | tinggi | Bekerja di Ketinggian & Rope Access |
| Pest Control & Disinfektan | tinggi | Sertifikasi Pest Control & Disinfektan |
| Plumbing & Sedot Toilet | tinggi | Sertifikasi Plumbing & Sedot Toilet |
| Care Giver | tinggi | Sertifikasi Care Giver (Lansia, Anak & Bayi) |
| Massage & Beauty Care | tinggi | Sertifikasi Massage & Beauty Care |

**Tiga lapis yang harus lengkap sebelum seorang mitra boleh ditugaskan:**

```
1. Onboarding mitra selesai   (S&K, berkas, 5 kursus wajib, disetujui admin)
2. Fungsi kerja didaftarkan   ← mitra memilih sendiri, sesuai keinginannya
3. Sertifikat fungsi berlaku  ← lulus kursusnya, belum kedaluwarsa
```

Mendaftar **belum memberi hak apa pun**. Mitra yang baru mendaftar Gardener tetap
tidak muncul sebagai kandidat pekerjaan potong rumput sampai kursusnya lulus.

Kursus fungsi kerja menuntut lebih daripada kursus wajib: nilai minimum **85–90**
(bukan 80), dan masa berlaku **1 tahun** untuk fungsi berisiko tinggi — kompetensi
teknis lebih cepat usang daripada pemahaman dasar. Materinya bukan basa-basi:
Pest Control membahas takaran pestisida dan waktu aman masuk kembali; Plumbing
melarang siapa pun masuk septic tank; Care Giver menegaskan care giver bukan
tenaga medis dan tidak boleh mengubah dosis obat.

**Status tidak pernah disimpan sebagai teks** — selalu dihitung ulang dari progres
belajar dan sertifikat yang ada. Akibatnya: tidak ada jalan menandai seseorang
"kompeten" tanpa ia benar-benar lulus, dan **sertifikat yang kedaluwarsa otomatis
menutup penugasan** tanpa perlu ada yang mengubahnya secara manual.

**Di layar penjadwalan admin**, memilih layanan langsung mengubah daftar petugas:
kompetensi yang dibutuhkan muncul sebagai chip, mitra yang belum tersertifikasi
tetap terlihat tetapi tidak bisa dicentang berikut **alasan spesifiknya**
("🔒 belum tersertifikasi: Perawatan AC"), dan petugas yang sudah tercentang
otomatis dilepas bila layanan baru membuatnya tidak kompeten. Bila tidak ada satu
pun mitra yang menguasai gabungan layanannya, muncul peringatan beserta jalan
keluarnya.

**Fungsi kerja yang sudah tersertifikasi tidak bisa dibatalkan sendiri** oleh
mitra — sertifikatnya sudah terbit dan menjadi rekam jejak; penonaktifan seperti
itu urusan admin.

Menu **Fungsi Kerja & Kompetensi** di sisi admin menampilkan peta kompetensi tim,
matriks mitra × fungsi, katalog layanan, serta peringatan **fungsi yang belum
punya mitra tersertifikasi** — artinya layanan itu belum bisa dijual.

### Dompet mitra & penarikan saldo

Sejak ada dompet, admin **tidak lagi mentransfer per slip**. Alur uangnya:

```
pekerjaan lulus QC → slip bagi hasil → admin menyetujui
   → dana MASUK SALDO mitra                    (mutasi kredit)
   → mitra menarik sendiri kapan saja + PIN     (mutasi debit + antrean)
   → admin mentransfer & menandai selesai       (biaya transfer dibukukan)
```

Mitra membuka menu **Dompet**: saldo besar di atas, tombol *Tarik Saldo*, lalu
riwayat mutasi, riwayat penarikan, dan ketentuannya.

**Aturan buku besar yang dipegang kode:**

* Saldo **tidak pernah disimpan sebagai angka** — selalu dihitung dari jumlah seluruh mutasi, sehingga tidak ada satu pun tempat yang bisa mengarang saldo.
* Dana **ditahan sejak penarikan diajukan** (didebit di muka) dan dikembalikan **utuh** bila dibatalkan mitra atau ditolak admin. Karena itu "saldo tersedia" selalu berarti dana yang benar-benar bisa dipakai.
* **Biaya transfer baru dibukukan setelah dana benar-benar dikirim**, bukan saat diajukan.
* **Rekening tujuan dibekukan pada dokumen penarikan** — mengganti rekening di profil tidak mengubah tujuan transfer yang sudah diajukan.
* Ketentuan yang diubah admin hanya berlaku untuk penarikan **baru**; dokumen lama membawa nominal dan biayanya sendiri.

Ketentuan bawaan: minimal **Rp50.000**, biaya transfer **Rp2.500**, maksimal
**3 pengajuan per hari**, jam layanan 08.00–15.00 WIB Senin–Jumat. Semuanya bisa
diubah admin keuangan di bagian bawah menu *Penarikan Mitra*.

### Keamanan: PIN, Authenticator, dan pengenalan perangkat

Tiga lapis yang saling menutupi — masing-masing menjawab kegagalan yang berbeda:

| Lapis | Untuk apa | Kapan diminta |
|---|---|---|
| **Kata sandi** | membuka aplikasi | setiap masuk |
| **PIN 6 angka** | menyetujui perpindahan uang | setiap penarikan saldo / pencairan toko |
| **Authenticator (TOTP)** | membuktikan identitas | perangkat baru, dan seluruh alur pemulihan |

**PIN dibuat saat mendaftar.** Formulir pendaftaran Mitra dan Mitra Toko kini
meminta PIN transaksi, dan menolak PIN yang lemah (angka sama semua, berurutan,
atau sama dengan kata sandi). PIN sengaja **terpisah dari kata sandi** supaya
sandi yang bocor tidak otomatis berarti saldo bisa ditarik.

**Yang tersimpan bukan PIN-nya.** PIN dan kode pemulihan disimpan sebagai
turunan **PBKDF2-HMAC-SHA1 ber-salt** — tidak ada layar mana pun, termasuk milik
admin, yang bisa menampilkannya kembali. Kata sandi ikut naik ke bentuk ber-hash
begitu diganti lewat aplikasi (akun contoh masih polos, dan ditandai begitu di
tab Keamanan). Salah PIN 5 kali → terkunci 15 menit + peringatan WhatsApp.

**Authenticator-nya sungguhan.** TOTP RFC 6238 (SHA-1, 6 digit, 30 detik) dan
pembuat QR ditulis sendiri di [`js/kripto.js`](app/js/kripto.js) dan
[`js/qr.js`](app/js/qr.js) — tanpa pustaka CDN, karena kunci rahasia TOTP tidak
boleh dikirim ke layanan pembuat QR pihak ketiga hanya demi gambar. Kodenya
cocok dengan Google Authenticator, Microsoft Authenticator, Authy, dan sejenisnya.
Toleransi ±1 jendela (±30 detik) supaya jam ponsel yang meleset sedikit tidak
menggagalkan pengguna.

Saat diaktifkan, aplikasi menerbitkan **8 kode pemulihan sekali pakai** yang
hanya bisa dilihat satu kali — itulah jalan masuk bila ponsel authenticator
hilang.

**Perangkat baru.** Setiap browser mendapat identitas perangkat. Saat akun
dibuka dari perangkat yang belum dikenal, sesi **belum terbuka** sampai pengguna
membuktikan diri: kode authenticator bila aktif, atau PIN bila belum. Pemilik
akun langsung dikabari lewat antrean WhatsApp, dan bisa mencabut perangkat mana
pun dari *Profil → Keamanan*. Perangkat yang sedang dipakai tidak bisa mencabut
dirinya sendiri.

**Pemulihan tidak pernah bergantung pada email saja** — justru email yang mungkin
sedang tidak bisa dibuka:

| Lupa | Yang dibutuhkan |
|---|---|
| Email akun | nomor WhatsApp terdaftar **+** kode authenticator → email ditampilkan |
| Kata sandi | kode authenticator → sandi baru, semua perangkat lain dikeluarkan |
| PIN transaksi | kata sandi **dan** kode authenticator (tiga langkah) |

Akun tanpa authenticator sengaja **tidak bisa** dipulihkan sendiri — diarahkan ke
verifikasi manual admin, karena tidak ada cara aman memastikan itu benar pemiliknya.

**Mencoba tanpa ponsel.** Akun contoh **Agus** (`agus@exoclean.id`) sudah punya
authenticator aktif; layar verifikasinya menampilkan kode yang sedang berlaku
dengan label *Akun contoh* supaya alurnya bisa dicoba langsung. Akun yang Anda
pasang sendiri tidak pernah menampilkan itu. Tombol **Simulasikan perangkat baru**
di *Profil → Keamanan* mengganti identitas perangkat browser ini, seolah aplikasi
dibuka di HP lain.

**PIN akun contoh: `246813`** (semua mitra lapangan & mitra toko).

> **Batas prototipe.** Seluruh pemeriksaan berjalan di browser, dan PBKDF2 murni-JS
> di sini memakai 6.000 putaran (±80 ms) — jauh di bawah standar server. Pada
> produksi, verifikasi PIN, TOTP, dan kepercayaan perangkat **wajib pindah ke
> server** dengan Argon2/bcrypt. Yang sudah benar di sini adalah bentuk data,
> alur, dan aturan bisnisnya.

### Peran & Hak Akses — diatur tim IT

Hak akses dipisah menjadi **dua lapis** supaya pengaturan sehari-hari tidak
pernah bisa merusak bentuk aplikasi:

| Lapis | Menentukan | Diubah dari |
|---|---|---|
| **Persona** (`user.role`) | aplikasi mana yang dipakai: admin, supervisor, klien, mitra lapangan, mitra toko | menu *Tim & Pegawai* |
| **Peran akses** (tabel `roles`) | menu dan aksi apa saja yang boleh dibuka di dalam persona itu | menu *Peran & Hak Akses* |

Klien, Mitra Lapangan, dan Mitra Toko adalah pihak eksternal — aksesnya melekat
pada personanya dan sengaja tidak bisa diatur di sini, supaya tidak ada jalan
untuk tidak sengaja memberi mereka akses ke data internal.

**34 izin dalam 9 modul.** Setiap izin ditulis sebagai kalimat kerja
("Terbitkan invoice & catat pembayaran"), bukan nama teknis, dan yang berdampak
uang atau data sensitif diberi tanda **berisiko**.

Delapan peran bawaan siap pakai:

| Kode | Peran | Ringkasnya |
|---|---|---|
| `SUPER` | Super Admin (IT) | seluruh 34 izin |
| `ADM-OPS` | Admin Operasional | jadwal, penugasan, komplain — tanpa keuangan |
| `ADM-KEU` | Admin Keuangan | invoice, pembayaran, bagi hasil, pencairan penjual |
| `ADM-MKT` | Admin Pemasaran & CRM | prospek, penawaran, kampanye |
| `ADM-MP` | Admin Marketplace | verifikasi toko, moderasi produk, kampanye toko |
| `ADM-HR` | Admin Kemitraan & Pelatihan | seleksi mitra + materi LMS |
| `SPV` | Supervisor Lapangan | monitoring + verifikasi mutu |
| `SPV-SR` | Supervisor Senior | ditambah penugasan & laporan |

Peran bawaan tidak bisa dihapus — **disalin** dulu bila ingin versi lain.
Selain itu tersedia **penyesuaian per orang**: centangan dimulai dari izin
perannya, dan perbedaan yang dibuat disimpan sebagai `izinTambahan` /
`izinDicabut` milik orang itu saja, sehingga peran tetap utuh untuk pengguna lain.

**Cara penyaringannya bekerja.** Satu tabel `IZIN_HALAMAN` di `akses.js`
memetakan kunci menu → izin. Penyaringan dilakukan di `pagesFor()` pada
`app.js`, satu tempat saja, sehingga menu sidebar, alamat `#hash`, dan halaman
bawaan selalu sepakat — tidak ada menu tersembunyi yang masih bisa dibuka lewat
alamat. Tombol yang mengubah data dijaga terpisah lewat `AKSES.lindungi()`,
karena tombol yang sama juga muncul di dialog lintas-halaman.

**Pengaman yang tidak bisa dilanggar dari antarmuka:**

* selalu tersisa minimal satu pengguna aktif yang memegang izin *Kelola peran & hak akses* — perubahan yang melanggar ini ditolak dengan penjelasan;
* seseorang tidak bisa mencabut izin itu dari dirinya sendiri (kotak centangnya dikunci);
* peran tidak bisa dihapus selama masih dipakai orang;
* peran hanya bisa dipasang ke persona yang sesuai;
* setiap perubahan tercatat di tab *Riwayat*.

Halaman ini sendiri dijaga izin `sistem.role`, jadi hanya tim IT yang melihatnya.
Masuk sebagai **Sari (Admin Keuangan)** atau **Indah (Admin Marketplace)** untuk
melihat aplikasi yang sama dengan menu yang jauh lebih ramping.

### Yang bisa dilakukan tiap peran

**Klien** — katalog layanan dengan estimasi harga otomatis, kirim permintaan,
pantau progres pekerjaan (timeline + checklist + foto), tinjau & setujui penawaran,
lihat & cetak invoice, **bayar online** lewat VA/QRIS/e-wallet/kartu/retail atau
unggah bukti transfer manual, beri penilaian bintang, ajukan komplain garansi.
**Ringkasan Aktivitas:** grafik pengeluaran per bulan (jasa vs produk), layanan
paling sering dipesan, dan produk paling sering dibeli — lengkap dengan tampilan
tabel untuk semua angkanya. **Toko:** cari & filter produk per
kategori, keranjang belanja dengan hitung PPN + ongkir otomatis, checkout, lacak
status pengiriman berikut nomor resi, konfirmasi barang diterima.

**Admin** — dashboard KPI, permintaan masuk, pembuat penawaran (rincian item,
diskon, PPN, cetak PDF), kalender penjadwalan bulanan, pembuatan order dengan
**deteksi bentrok jadwal**, daftar order, invoice & pencatatan pembayaran,
penanganan komplain (termasuk membuat order kerja-ulang), laporan bisnis
(pendapatan 6 bulan, mutu QC, layanan terlaris, produk terlaris, klien terbesar),
WhatsApp Outbox, serta master data klien / pegawai / tim / katalog layanan.
**Toko:** pengelolaan pesanan dari konfirmasi sampai pengiriman, master produk,
penyesuaian stok (barang masuk / keluar / stock opname), dan peringatan restock.
**Pembayaran:** daftar transaksi gateway berikut biaya & tingkat keberhasilan,
kirim tautan bayar ke klien lewat WhatsApp, dan pengaturan Midtrans/Xendit
(kanal aktif, kebijakan biaya, rekening manual, alamat webhook).
**CRM:** papan pipeline prospek, agenda follow-up, profil pelanggan 360° dengan
segmentasi otomatis, dan kampanye WhatsApp per segmen.
**Peran & Hak Akses** (khusus pemegang izin `sistem.role`): editor matriks izin
per modul, pemasangan peran ke tiap pegawai, penyesuaian izin per orang, tabel
perbandingan antar-peran untuk audit, dan riwayat perubahannya.

**Supervisor** — beranda tim, jadwal tim, monitoring lapangan real-time (absensi
GPS + jarak dari titik lokasi + foto yang masuk), pengaturan penugasan petugas
dengan peringatan bentrok, verifikasi mutu 4 kriteria (kebersihan, kerapihan, K3,
ketepatan waktu), dan rekap kinerja petugas (jam kerja, rata-rata QC).

**Tenaga Kerja Lapangan** — tampilan mobile: daftar tugas hari ini/mendatang/terlewat,
detail tugas + tautan Google Maps, check-in/check-out GPS dengan selfie opsional,
checklist per layanan, unggah foto sebelum/sesudah (dikompres otomatis), catatan
lapangan, riwayat, rekap absensi & jam kerja, penilaian dari supervisor.

---

## Tentang notifikasi WhatsApp

WhatsApp Business API resmi **berbayar** dan butuh verifikasi Meta. Supaya sistem
bisa dipakai hari ini tanpa biaya, pendekatannya:

1. Setiap kejadian penting otomatis menyusun pesan (15 template) dan memasukkannya
   ke **WA Outbox**.
2. Admin/Supervisor menekan **Kirim** → membuka `wa.me` dengan teks sudah terisi →
   tinggal tekan kirim di WhatsApp. Ada juga tombol *Kirim semua*.

Saat nanti berlangganan API resmi, **hanya fungsi `kirim()` di `js/wa.js`** yang perlu
diganti jadi pemanggilan endpoint. Seluruh template dan pemicunya tetap sama.

20 template tersedia:

- **Jasa** — konfirmasi permintaan, jadwal survei, penawaran harga, konfirmasi jadwal,
  pengingat H-1, tim berangkat, pekerjaan selesai, permintaan rating, invoice terbit,
  pengingat jatuh tempo, tanggapan komplain
- **Toko** — pesanan diterima, pesanan dikonfirmasi + instruksi bayar, barang dikirim
  + nomor resi, pesanan selesai, pemberitahuan stok tidak tersedia
- **Pembayaran** — tautan bayar (berikut nomor VA / kode bayar / batas waktu),
  pembayaran diterima + sisa tagihan, tautan bayar kedaluwarsa
- **CRM** — sapaan pertama prospek, tindak lanjut (menyesuaikan tahap pipeline),
  penawaran khusus, reaktivasi pelanggan dorman, apresiasi pelanggan setia,
  dan pesan kampanye bebas
- **Internal** — penugasan petugas, perubahan jadwal, minta verifikasi supervisor,
  instruksi perbaikan

---

## Struktur berkas

```
app/
├── index.html            kerangka halaman
├── serve.ps1             server statis lokal (pengganti Node)
├── assets/               logo EXOCLEAN
├── css/style.css         desain sistem (warna diambil dari logo, teal #14958A)
└── js/
    ├── utils.js          format Rupiah/tanggal Indonesia, GPS, kompresi foto
    ├── katalog.js        katalog 22 kelompok layanan dari berkas xlsx
    ├── kripto.js         SHA-1, HMAC-SHA1, PBKDF2, Base32, TOTP (RFC 6238)
    ├── qr.js             pembuat QR Code (mode byte, koreksi M, versi 1–12)
    ├── db.js             lapisan penyimpanan (localStorage) — CRUD generik
    ├── seed.js           katalog layanan & produk EXOCLEAN + data contoh
    ├── wa.js             template & antrean pesan WhatsApp
    ├── ui.js             komponen bersama (modal, tabel, chip status, dsb.)
    ├── biz.js            aturan bisnis: status order, QC, invoice, stok, notifikasi
    ├── pay.js            kanal bayar, biaya, siklus transaksi, adaptor gateway
    ├── maps.js           peta, baca koordinat, jarak & tarif ongkir
    ├── seller.js         marketplace: toko, komisi, iklan, kampanye, pencairan penjual
    ├── bagihasil.js      skema bagi hasil, periode, slip pencairan mitra
    ├── crm.js            pipeline prospek, aktivitas, segmentasi & profil pelanggan
    ├── chart.js          grafik SVG tanpa library (kolom bertumpuk, batang, tabel)
    ├── i18n.js           kamus & pemilihan bahasa antarmuka (ID / EN)
    ├── kurikulum.js      isi Syarat & Ketentuan Mitra + materi & soal 7 kursus
    ├── kurikulum-fungsi.js  13 kursus sertifikasi pembuka fungsi kerja
    ├── lms.js            gerbang onboarding, penilaian kuis, penerbitan sertifikat
    ├── kompetensi.js     fungsi kerja mitra, sertifikasi & gerbang penugasan
    ├── akses.js          katalog izin, peran, penyaring menu & penjaga aksi (RBAC)
    ├── keamanan.js       PIN transaksi, authenticator, perangkat & pemulihan akun
    ├── akun.js           pendaftaran mandiri, OTP email/HP, masuk lewat Google/Facebook
    ├── dompet.js         saldo mitra, buku besar mutasi & penarikan dana
    ├── afiliasi.js       kode rujukan, referral, komisi & masa tahan
    ├── dropship.js       etalase dropshipper, batas markup & margin
    ├── bagikan.js        berbagi produk/layanan ke enam kanal media sosial
    ├── app.js            sesi, router, kerangka tampilan
    └── views/
        ├── auth.js       halaman masuk
        ├── shared.js     detail order & pesanan toko, dokumen penawaran & invoice
        ├── toko.js       toko perlengkapan (katalog klien + stok/pesanan admin)
        ├── bayar.js      pemilih metode, halaman bayar, transaksi & setelan gateway
        ├── tokomitra.js  ruang kerja penjual: produk, pesanan, keuangan, iklan
        ├── marketplace.js pengelolaan marketplace oleh admin
        ├── hasil.js      pendapatan mitra + bagi hasil sisi admin
        ├── crm.js        papan pipeline, agenda, pelanggan 360°, kampanye
        ├── profil.js     halaman Profil bersama: identitas, alamat, rekening, bahasa, promo
        ├── belajar.js    onboarding mitra, kursus, kuis & sertifikat
        ├── mitra.js      sisi admin: rekrutmen mitra & rekap pembelajaran
        ├── kompetensi.js Fungsi Kerja mitra + peta kompetensi sisi admin
        ├── afiliasi.js   dasbor afiliasi & dropship + panel berbagi
        ├── akses.js      pengelolaan peran & hak akses oleh tim IT
        ├── daftar.js     layar daftar 4 langkah, OTP, pemilih akun sosial
        ├── keamanan.js   layar PIN, QR authenticator, perangkat & pemulihan
        ├── dompet.js     Dompet mitra + antrean penarikan sisi admin
        ├── client.js     tampilan klien
        ├── admin.js      tampilan admin
        ├── supervisor.js tampilan supervisor
        └── worker.js     tampilan tenaga lapangan (mobile)

server/                   backend pendamping (Node/Express) — deploy terpisah
├── payment-server.js     Midtrans Core+Snap, Xendit VA/e-wallet/retail/invoice,
│                         verifikasi webhook (SHA-512 & callback token)
├── auth-server.js        verifikasi id_token Google (RS256 + JWKS), access_token
│                         Facebook (debug_token + appsecret_proof), pengiriman
│                         & pemeriksaan OTP email/SMS
├── package.json          npm start (pembayaran) · npm run start:auth (autentikasi)
├── .env.example
└── README.md             cara pasang, daftar endpoint, checklist produksi
```

Harga layanan mengikuti dokumen **Harga Layanan EXOCLEAN** (16 layanan + 4 paket
berlangganan) dan bisa diubah lewat menu *Katalog Layanan*. Produk toko diubah
lewat menu *Produk & Stok*.

Di luar dokumen itu, ditambahkan kategori **Perawatan AC** (4 layanan):

| Kode | Layanan | Harga |
|---|---|---|
| `AC-SPL` | Cuci AC Split (½ – 2 PK) | Rp75.000 – Rp150.000 / unit |
| `AC-CST` | Cuci AC Cassette / Standing Floor | Rp250.000 – Rp450.000 / unit |
| `AC-DCT` | Cuci AC Ducting / Central | perlu survei |
| `AC-FRE` | Isi Freon & Cek Kebocoran (R32 / R410A) | Rp250.000 – Rp500.000 / unit |

Masing-masing sudah punya checklist pekerjaan sendiri yang otomatis muncul di
aplikasi tenaga lapangan — mulai dari memasang jetting cover sampai cek suhu
keluar dan kebocoran air.

---

## Batasan prototipe ini

- **Data tersimpan di browser** (localStorage), bukan di server. Artinya: data admin
  dan data petugas **tidak saling terhubung** antar perangkat. Ini cukup untuk demo
  dan uji alur kerja, belum untuk operasional sungguhan.
- Kapasitas ±5 MB. Foto dikompres otomatis (maks. 720 px, JPEG) agar muat; bila
  penuh, foto lama yang sudah tidak dipakai dibuang otomatis.
- Kata sandi disimpan apa adanya — hanya untuk demo.
- **Berkas identitas pegawai (nomor & foto KTP/SIM/Paspor) juga tersimpan di
  browser.** Ini tidak boleh dibawa ke produksi: data seperti ini termasuk data
  pribadi yang dilindungi UU PDP. Sebelum dipakai sungguhan, pindahkan ke
  penyimpanan terenkripsi di server dengan kontrol akses per peran, masa simpan
  yang dibatasi, dan jejak audit siapa membuka berkas siapa. Kerangka izinnya
  sudah ada di `BIZ.bolehLihatBerkas()` — tinggal ditegakkan juga di sisi server.
- **Pembayaran berjalan dalam mode simulasi** sampai backend di `server/` dipasang
  dan kunci gateway diisi. Nomor VA, QRIS, dan kode bayar yang muncul sekarang
  dibuat oleh aplikasi, bukan oleh Midtrans/Xendit, jadi tidak bisa dibayar
  sungguhan. Gambar QR pada mode simulasi juga tidak dapat dipindai.
- Ekspor/impor data JSON tersedia lewat ikon ⚙️ di kanan atas.

## Langkah berikutnya menuju produksi

1. **Pindahkan data ke server** — Supabase (PostgreSQL + Auth + Storage) paling pas:
   gratis di tahap awal, dan `js/db.js` sudah dirancang sebagai satu-satunya titik
   akses data, jadi cukup ganti isinya dengan pemanggilan API.
2. **Login sungguhan** — Supabase Auth atau OTP WhatsApp, plus aturan akses per peran.
3. **Foto ke cloud storage**, bukan base64 di database.
4. **WhatsApp Business API** untuk pengiriman otomatis penuh.
5. **Aktifkan gateway pembayaran** — deploy `server/`, isi kunci di `.env`,
   daftarkan URL webhook di dashboard Midtrans/Xendit, lalu pindahkan mode dari
   Simulasi ke Midtrans/Xendit di Pengaturan Pembayaran. Uji dulu dengan
   Sandbox/Test sebelum Production.
6. **Integrasi ekspedisi** untuk cek ongkir dan lacak resi otomatis,
   menggantikan ongkir flat saat ini.
5. **PWA** (manifest + service worker) agar petugas bisa "Add to Home Screen" dan
   tetap bisa mengisi laporan saat sinyal hilang, lalu tersinkron saat online.
