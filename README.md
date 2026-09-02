# EXOCLEAN

Aplikasi web EXOCLEAN — jasa kebersihan Jabodetabek. Seluruh kodenya ada di folder [`app/`](app/); dokumentasi lengkap di [`app/README.md`](app/README.md).

| Berkas | Untuk siapa |
|---|---|
| `app/index.html` | Sistem manajemen: klien, admin, supervisor, mitra toko |
| `app/mitra.html` | Mitra lapangan |
| `app/mcs.html` | Korporat yang memantau areanya sendiri (MCS) |
| `app/exo.html` | **EXOCLEAN App** — marketplace ponsel: pelanggan memilih petugasnya |
| `app/exo-admin.html` | Konsol backend marketplace, 14 modul |
| `app/exo-analisa.html` | Analisa pasar dan perbandingan layanan |

Tanpa proses build: HTML/CSS/JavaScript murni. Jalankan server statis lokal:

```bash
powershell -ExecutionPolicy Bypass -File app/serve.ps1 -Port 8080
```

lalu buka `http://localhost:8080/exo.html`.

Server pendamping (pembayaran, OTP & login sosial, posisi mitra, data) ada di `app/server/`; salin `.env.example` menjadi `.env` dan isi kredensialnya. Berkas rahasia (`.env`, kunci API, sertifikat, basis data) sengaja tidak ikut ke repositori — lihat `.gitignore`.
