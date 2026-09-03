# EXOCLEAN App — Aplikasi Android (pelanggan + mitra)

Proyek Android natif untuk EXOCLEAN App. Lapisan tampilannya adalah aplikasi
web yang sudah ada di `../app`, dibungkus Capacitor menjadi APK/AAB sungguhan
yang bisa diterbitkan ke Play Store atau dipasang lewat MDM.

**Yang belum pernah diuji: aplikasinya sendiri di perangkat.** Mesin tempat
proyek ini disusun tidak punya JDK maupun Android SDK, jadi APK-nya belum
pernah dibangun, apalagi dijalankan. Yang sudah dibuktikan hanya bahwa isi
bundel webnya lengkap dan berjalan — lihat bagian **Apa yang sudah dibuktikan**.

---

## Yang perlu dipasang lebih dulu

| | Versi | Catatan |
|---|---|---|
| **JDK** | 21 | Android Gradle Plugin 8.13 mensyaratkannya |
| **Android Studio** | terbaru | membawa Android SDK sekaligus |
| **Android SDK** | API 36 | `compileSdk` dan `targetSdk` proyek ini |
| Node.js | 18+ | untuk skrip penyusun bundel |

Gradle tidak perlu dipasang sendiri — proyek ini membawa wrapper (8.14.3).

---

## Cara tercepat di laptop ini (3 Sep 2026)

Android Studio 2026.1 membawa JBR **25**, sedangkan Gradle 8.14 (template
Capacitor 8) hanya berjalan sampai Java 24 — build langsung gagal dengan
"Unsupported class file major version 69". Karena itu JDK 21 portabel
(Temurin, zip tanpa installer) disimpan di `../alat/jdk-21*` dan hanya
dipakai untuk build ini. Skrip `bangun.ps1` mengatur JAVA_HOME dan
ANDROID_HOME sendiri:

```powershell
.angun.ps1 -Sync      # susun www/ dari ../app, sinkron, lalu APK debug
.angun.ps1            # APK debug saja
.angun.ps1 -Rilis     # AAB rilis (perlu keystore)
```

Hasil: `androidappuildoutputsapkdebugapp-debug.apk`.

## Membangun

```bash
cd exo-android
npm install
npm run sync      # susun ulang www/ dari ../app, lalu salin ke proyek Android
npm run buka      # membuka proyek di Android Studio
```

Dari Android Studio: **Build → Build APK(s)** untuk uji coba, atau
**Build → Generate Signed Bundle / APK** untuk Play Store.

Tanpa Android Studio:

```bash
cd android
./gradlew assembleDebug          # APK uji  → app/build/outputs/apk/debug/
./gradlew bundleRelease          # AAB rilis → app/build/outputs/bundle/release/
```

### Setiap kali kode web berubah

```bash
npm run sync
```

`www/` **selalu disusun ulang dari nol**. Jangan menyunting apa pun di
dalamnya — suntingannya akan hilang tanpa peringatan pada sinkronisasi
berikutnya. Yang disunting adalah `../app`.

### Kalau ikonnya berubah

```bash
npm run ikon
```

Menjalankan tiga langkah berurutan: menyiapkan bahan dari
`../app/assets/icon-512.png`, membangkitkan seluruh kerapatan, lalu
membetulkan ikon adaptifnya. Langkah ketiga wajib ikut — lihat
`perbaiki-adaptif.js`.

---

## Rahasia tidak boleh ikut terbungkus

**APK adalah berkas zip.** Siapa pun yang memegangnya bisa membukanya dan
membaca seluruh isinya.

`../app/server/.env` memuat `FACEBOOK_APP_SECRET`, `SMS_API_KEY`, dan Server
Key Midtrans. Mengarahkan `webDir` ke `../app` berarti mengirim seluruh
rahasia itu ke setiap ponsel yang memasang aplikasinya — sekali, permanen,
dan tidak bisa ditarik kembali.

Karena itu isi bundel disusun `siapkan-www.js` dari **daftar izin**: yang
tidak disebut, tidak ikut. Setelah tersalin, hasilnya diperiksa ulang seolah
daftar izinnya tidak ada; bila ada berkas yang tampak memuat rahasia, skrip
berhenti dan **menghapus bundelnya** supaya tidak ada yang terbungkus tanpa
sengaja.

Penjaga itu sudah diuji dengan menanam rahasia palsu di salah satu berkas
kode: ia berhenti, menyebutkan berkasnya, dan menghapus bundelnya.

**Jangan pernah** mengganti `webDir` di `capacitor.config.json` menjadi
`../app`.

---

## Apa yang ikut dan tidak ikut

| Ikut | |
|---|---|
| `index.html` | salinan `app/mcs.html` |
| 67 skrip + `css/` + `assets/` | persis yang dirujuk halamannya |
| `data/wilayah/` | **10 negara ASEAN saja**, 3,5 MB |

| Sengaja **tidak** ikut | Sebabnya |
|---|---|
| `app/server/**` | rahasia, basis data, node_modules |
| `sw.js` | lihat di bawah |
| `data/contoh/**` | penyemai data contoh |
| `index.html`, `mitra.html` milik app | itu aplikasi pasar; ini bungkus MCS |
| 47 negara lain | 40 MB untuk yang tidak dilayani |

Total bundel: **±5,5 MB**, 692 berkas.

**Kenapa `sw.js` tidak ikut.** Di dalam APK seluruh berkasnya sudah lokal,
jadi singgahan luring tidak menambah apa pun. Yang ia tambahkan justru satu
lapisan yang bisa menyajikan berkas **lama** setelah aplikasinya diperbarui —
kegagalan yang lazim pada aplikasi terbungkus dan sulit dijelaskan kepada
pengguna. `NOTIF.siap()` sudah menangani ketiadaannya: pendaftarannya gagal,
ditangkap, aplikasinya berjalan seperti biasa.

**Kenapa hanya ASEAN.** Daftar negara yang dilayani diatur di layar admin
**Negara yang Dilayani**; bawaannya ASEAN. Negara yang datanya tidak ikut
tidak membuat aplikasi patah — `app/js/wilayah.js` menangkap kegagalan muat
dan mengalihkan kolomnya ke ketik manual. Bila daftar itu diubah, sesuaikan
`NEGARA` di `siapkan-www.js` lalu bungkus ulang.

---

## Izin Android

Ditulis karena kode webnya memang memakainya, bukan karena "biasanya perlu" —
meminta izin yang tidak dipakai membuat orang menolak izin yang dipakai.

| Izin | Dipakai oleh |
|---|---|
| `INTERNET` | sinkronisasi ke data-server; tanpanya aplikasi tetap jalan penuh luring |
| `CAMERA` | `<input capture="environment">` untuk bukti foto, dan `getUserMedia` |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | `navigator.geolocation` di `app/js/utils.js`, untuk absen di lokasi |
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` | memilih foto yang sudah ada (Android 13+) |
| `READ_EXTERNAL_STORAGE` (maxSdk 32) | hal yang sama di Android 12 ke bawah |

Kamera dan GPS ditandai `required="false"`, sehingga tablet tanpa kamera tetap
boleh memasangnya.

---

## Cadangan Google dimatikan — dan konsekuensinya

`allowBackup="false"`, dan `res/xml/data_extraction_rules.xml` menolak
`cloud-backup` maupun `device-transfer`.

Sebabnya: seluruh data MCS tersimpan di localStorage WebView — akun staf,
nomor induk kependudukan, alamat rumah, kontak darurat, catatan gaji. Itu data
pribadi **pegawai orang lain**, bukan data pribadi pemilik ponsel, dan tidak
pantas naik ke akun Google siapa pun yang kebetulan memegang perangkatnya.

**Konsekuensinya harus disadari:** ponsel hilang berarti data lokalnya hilang.
Ketahanan data datang dari sinkronisasi ke `data-server`, bukan dari cadangan
Google. **Selama sinkronisasi belum dinyalakan, aplikasi ini menyimpan
satu-satunya salinan datanya di ponsel itu sendiri.**

---

## Sebelum diterbitkan

- [ ] **Buat keystore rilis dan simpan cadangannya di tempat terpisah.**
      Kehilangannya tidak bisa dipulihkan: aplikasi yang sudah terbit di Play
      Store tidak bisa lagi diperbarui tanpa kunci aslinya.
- [ ] Naikkan `versionCode` dan `versionName` di `android/app/build.gradle`
      setiap kali menerbitkan.
- [ ] Nyalakan sinkronisasi ke `data-server` — lihat konsekuensi cadangan di
      atas.
- [ ] Ganti sandi bawaan `admin@mcs.local` / `ubah-saya`. Aplikasi yang baru
      dipasang menanamnya lewat `app/js/semai-mcs.js`.
- [ ] Kalau nanti perlu notifikasi saat aplikasi tertutup: pakai **FCM** lewat
      `@capacitor/push-notifications`, bukan web push. Kunci VAPID tidak
      berlaku di jalur natif.
- [ ] Isi kebijakan privasi Play Store — aplikasi ini meminta kamera dan lokasi.

---

## Apa yang sudah dibuktikan, dan apa yang belum

**Sudah dibuktikan di mesin ini:**

- bundel `www/` tersusun lengkap, 692 berkas, 5,51 MB
- penjaga rahasia menggigit ketika rahasia palsu ditanam, lalu menghapus bundel
- tidak ada berkas `server/`, `.env`, `.db`, atau modul pasar di dalam bundel
- bundel itu **dijalankan lewat peramban**: seluruh skrip termuat, `VMCS`,
  `ViewMCS`, dan `SEMAI_MCS` terbentuk, `BIZ` tidak ada
- data wilayah terbaca dari bundel — 38 provinsi Indonesia muncul di kolom
  provinsi; `jp` dan `de` menjawab 404 seperti yang memang dirancang
- ikon adaptif dirakit ulang seperti yang akan digambar peluncur dan diperiksa
  dengan mata: lambangnya utuh di dalam topeng bundar, tidak ada tepi bocor

**Belum pernah diuji, dan tidak bisa diuji di sini:**

- APK-nya sendiri — belum pernah dibangun (tidak ada JDK dan Android SDK)
- kamera lewat `<input capture>` dan `getUserMedia` di dalam WebView
- `navigator.geolocation` di dalam WebView setelah izin diberikan
- tombol Kembali perangkat, rotasi layar, dan perilaku saat aplikasi di latar
- ketahanan localStorage setelah Android membersihkan memori

Tiga hal pertama pada daftar kedua adalah yang **paling perlu diuji lebih
dulu** di perangkat sungguhan: keduanya jalur inti petugas lapangan, dan
keduanya bergantung pada perilaku WebView yang tidak bisa ditebak dari kode.
