# EXOCLEAN

EXOCLEAN App — marketplace jasa kebersihan: pelanggan memilih juru bersihnya sendiri, jadwal terkunci. Kode aplikasi di [`app/`](app/), pembungkus Android di [`exo-android/`](exo-android/); dokumentasi di [`app/README.md`](app/README.md).

| Berkas | Untuk siapa |
|---|---|
| `app/exo.html` | **EXOCLEAN App** — marketplace ponsel: pelanggan memilih petugasnya |
| `app/exo-admin.html` | Konsol backend marketplace, 14 modul |
| `app/exo-analisa.html` | Analisa pasar dan perbandingan layanan |
| `exo-android/` | Pembungkus Android (Capacitor) — APK/AAB, lihat `exo-android/BACA-DULU.md` |

Tanpa proses build: HTML/CSS/JavaScript murni. Jalankan server statis lokal:

```bash
powershell -ExecutionPolicy Bypass -File app/serve.ps1 -Port 8080
```

lalu buka `http://localhost:8080/exo.html`.

Server pendamping (pembayaran, OTP & login sosial, posisi mitra) ada di `app/server/`; salin `.env.example` menjadi `.env` dan isi kredensialnya. Berkas rahasia (`.env`, kunci API, sertifikat, basis data) sengaja tidak ikut ke repositori — lihat `.gitignore`.

Aplikasi manajemen operasional (MCS) adalah proyek terpisah — repositori **MCS EXOCLEAN**. Sejak 3 Sep 2026 kedua sistem tidak berbagi kode, kunci penyimpanan, maupun skema data.
