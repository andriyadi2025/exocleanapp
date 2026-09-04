# Keamanan EXOCLEAN — audit 4 September 2026 dan panduan pengerasan server

Dokumen ini menjawab satu kekhawatiran: **server kami diretas**. Bagian 1
merangkum apa yang sudah diperkuat di kode. Bagian 2 adalah daftar tindakan di
server produksi yang tidak bisa dilakukan oleh kode — harus dikerjakan oleh
orang yang memegang servernya. Bagian 3 adalah rutinitas berkala.

## 1. Yang sudah diperkuat di kode (4 Sep 2026)

| Temuan audit | Risiko | Perbaikan |
|---|---|---|
| Konsol admin `exo-admin.html` terbuka tanpa login | Siapa pun yang tahu alamatnya melihat pesanan, pelanggan, mengubah tarif/promo | `js/exo-admin-auth.js`: login email+sandi (PBKDF2-SHA256 150.000 iterasi, garam acak), kunci 15 menit setelah 5 gagal, sesi 30 menit idle, akun pertama dibuat lewat gerbang, sandi bawaan `123456` dipaksa ganti, wajib HTTPS/localhost. Sandi teks polos di data contoh dimigrasi ke hash. |
| `capture` / `cancel` / `status` pembayaran hanya butuh nomor pesanan (berurutan, mudah ditebak) | Orang lain bisa membatalkan penahanan dana atau menagih pesanan yang bukan miliknya | Token acak 24 byte per transaksi, dikembalikan sekali saat `charge`/`authorize`; server hanya menyimpan hash-nya; ketiga endpoint wajib `X-Exo-Token`. `capture` dibatasi ≤ nominal yang ditahan. `orderId` tidak boleh dipakai ulang. |
| Server posisi tanpa autentikasi | Posisi petugas bisa diintip dengan menebak nomor pesanan | Token `tulis` (ponsel mitra) dan `baca` (pelanggan) per pesanan; ditulis lewat catatan pesanan (`exo.posisiBaca`). Server hanya menyimpan hash. |
| Tidak ada pembatas laju per IP | Banjir OTP ke ribuan nomor (SMS pumping), brute-force OTP, banjir transaksi | `keamanan.js` — jendela geser per IP: OTP kirim 10/jam/IP, periksa 30/10 menit/IP, transaksi 20/10 menit/IP, umum 300/menit, posisi 60/menit. Balasan 429 + `Retry-After`. |
| Captcha hanya dicek keberadaannya di browser | Bot melewati captcha dengan token kosong | `TURNSTILE_SECRET_KEY` → `/api/auth/otp/kirim` memverifikasi token ke Cloudflare di server. |
| Pembandingan signature Midtrans / callback token Xendit dengan `===` | Serangan waktu (timing) pada webhook | `timingSafeEqual` untuk keduanya. |
| Tanpa header pengaman; `X-Powered-By: Express` bocor | Clickjacking, sniffing MIME, fingerprinting | Header nosniff, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, CSP `default-src 'none'`, `Permissions-Policy`, HSTS bila HTTPS. |
| CORS menerima `*` bila ditulis di `.env` | Situs mana pun bisa memanggil API dari browser korban | `*` ditolak dan dilaporkan di log; hanya asal yang disebut satu per satu. |
| POST menerima badan non-JSON | CSRF lewat `<form>` sederhana | POST wajib `application/json` (415 bila tidak). |
| Nominal dan data pelanggan tidak dibatasi | Nominal fantastis, injeksi karakter kontrol ke gateway | `PAY_MAKS_RUPIAH`, panjang nama/email/telp dibatasi, pola `orderId` diperiksa. |
| Pesan galat penyedia SMS/email diteruskan ke klien | Nama penyedia dan konfigurasi bocor | Ke klien pesan umum; detail hanya di log server. |
| Aplikasi tanpa Content-Security-Policy; ada skrip inline | XSS punya ruang gerak penuh bila lolos | CSP `script-src 'self'` + asal Google/Facebook/Turnstile saja; skrip inline dipindah ke `js/exo-shim.js` dan `js/exo-analisa.js`; `object-src 'none'`, `base-uri 'self'`. |
| Alamat server bisa ditimpa lewat `localStorage` | Skrip asing membelokkan pembayaran ke server miliknya | Timpaan hanya diterima bila HTTPS, atau HTTP ke localhost/jaringan pribadi. |
| Server posisi memakai `http.createServer().listen(PORT)` (0.0.0.0, tanpa TLS) | Terbuka ke seluruh jaringan tanpa enkripsi | Dipindah ke `tls.js`: tanpa sertifikat hanya loopback, dengan sertifikat HTTPS. |
| Dependensi `qs`/`body-parser` rentan DoS (GHSA-4mjr-xmp4-gh2g) | Denial of service | `npm audit fix`; jadwalkan `npm audit` bulanan. |
| Log permintaan berisi PII | Kebocoran lewat berkas log | Log ringkas: metode, jalur, status, durasi, IP disamarkan oktet terakhirnya; badan tidak pernah dicatat. |

Yang **belum** bisa ditutup oleh kode dan harus disadari:

- Basis data aplikasi masih `localStorage` di perangkat (prototipe). Data pelanggan
  ada di setiap perangkat yang membuka konsol. Untuk produksi, pindahkan ke basis
  data server dengan autentikasi per pengguna; gerbang admin di browser hanya
  menahan akses sembarangan, bukan orang yang memegang perangkat.
- `otp/periksa` mengembalikan `{ok:true}` tanpa menerbitkan sesi/JWT. Aplikasi
  mempercayai jawaban itu di sisi klien. Saat ada server data, terbitkan token
  sesi di sini dan wajibkan token itu di setiap endpoint data.
- Penyimpanan transaksi server masih berkas JSON. Ganti dengan PostgreSQL saat
  produksi (fungsi `simpan`/`ambil` sudah dipisah untuk itu).

## 2. Pengerasan server produksi (tindakan manual, urut prioritas)

Semua contoh untuk Ubuntu 22.04/24.04. Contoh berkas ada di `contoh/`.

### 2.1 Akses ke server
1. **SSH hanya dengan kunci**, matikan sandi dan login root:
   `/etc/ssh/sshd_config` → `PasswordAuthentication no`, `PermitRootLogin no`,
   `AllowUsers <akun-anda>`; lalu `sudo systemctl restart ssh`.
2. **Firewall**: hanya 22 (SSH), 80, 443 yang terbuka. Port 4000/4100/4200
   TIDAK dibuka — server Node mendengar di 127.0.0.1 dan hanya nginx yang
   meneruskan.
   ```bash
   sudo ufw default deny incoming && sudo ufw default allow outgoing
   sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
   ```
3. **fail2ban** untuk SSH dan nginx (`sudo apt install fail2ban`), aktifkan
   jail `sshd`, `nginx-http-auth`, `nginx-limit-req`.
4. **Pembaruan otomatis**: `sudo apt install unattended-upgrades` dan aktifkan.
5. Satu akun per orang; tidak ada akun bersama; `sudo` dengan sandi.

### 2.2 nginx sebagai satu-satunya pintu (contoh: `contoh/nginx-exoclean.conf`)
- TLS Let's Encrypt (`certbot --nginx`), TLS 1.2/1.3 saja, HSTS.
- Header pengaman dan CSP di tingkat server (menutup semua berkas, bukan hanya
  halaman yang punya `<meta>`).
- **Konsol admin** (`exo-admin.html`, `exo-analisa.html`, `js/exo-admin*.js`,
  `data/contoh/`) dibatasi **allowlist IP kantor/VPN + Basic Auth**. Ini lapisan
  di atas gerbang login di dalam halaman.
- `location ^~ /server/ { deny all; }` — folder server tidak pernah terlayani
  sebagai berkas statis (`.env`, `transactions.json`, `data/`).
- `limit_req` per zona: API 30 r/s, autentikasi 5 r/s.
- `server_tokens off`, `client_max_body_size 2m`.

### 2.3 Server Node
- Jalankan sebagai **pengguna sistem tanpa shell** (`exoclean`), lewat systemd
  dengan pengerasan proses (`contoh/exoclean-pay.service`): `NoNewPrivileges`,
  `ProtectSystem=strict`, `MemoryDenyWriteExecute`, batas memori/berkas.
- `.env` **hak akses 600**, pemilik `exoclean`. Jangan pernah `git add .env`
  (sudah di `.gitignore`).
- `TRUST_PROXY=1` di `.env` supaya pembatas laju membaca IP klien dari
  `X-Forwarded-For` nginx — tanpa itu seluruh dunia dihitung sebagai satu IP.
- `ALLOWED_ORIGINS=https://app.exoclean.id` (persis, tanpa `*`).
- `MIDTRANS_MODE=production` hanya di server produksi; kunci sandbox dan
  produksi tidak pernah ada di mesin yang sama.
- Node versi LTS (20/22) dan `npm audit` tiap bulan.

### 2.4 Rahasia (secrets)
- Rahasia hanya ada di `.env` server dan di brankas (1Password/Bitwarden) tim.
  Tidak di chat, tidak di email, tidak di repo.
- **Rotasi segera** bila pernah terkirim lewat kanal yang tidak aman: Server Key
  Midtrans (dashboard → Settings → Access Keys), Secret Key Xendit, App Secret
  Facebook, API key SMS/email, `XENDIT_CALLBACK_TOKEN`.
- Riwayat git repo publik sudah dibersihkan (force push 4 Sep 2026). Bila ada
  kunci yang pernah masuk repo sebelum itu, anggap bocor dan rotasi.

### 2.5 Gateway pembayaran
- Midtrans: aktifkan **allowlist IP notifikasi** dan pastikan URL notifikasi
  memakai HTTPS; nyalakan 3DS untuk kartu (sudah `secure:true`).
- Xendit: isi `XENDIT_CALLBACK_TOKEN`; tanpa itu webhook Xendit ditolak (403).
- Rekonsiliasi harian: bandingkan `transactions.json`/tabel dengan laporan
  dashboard gateway; selisih = insiden.

### 2.6 Akun pihak ketiga
- **2FA wajib** di GitHub, Midtrans, Xendit, Cloudflare, Google Cloud, Meta,
  registrar domain, dan penyedia server. Gunakan aplikasi autentikator, bukan SMS.
- GitHub: *branch protection* pada `main`, *secret scanning* dan *Dependabot
  alerts* diaktifkan (Settings → Code security).
- Domain: kunci transfer (`clientTransferProhibited`), DNSSEC bila registrar
  mendukung, CAA record `0 issue "letsencrypt.org"`.

### 2.7 Cadangan (backup)
- Cadangan harian `app/server/data/`, `transactions.json`, dan `.env`
  **terenkripsi** (`age` atau `gpg`) ke lokasi terpisah (bucket objek di
  penyedia lain). Uji pemulihan tiap 3 bulan — cadangan yang tidak pernah
  dipulihkan tidak bisa dipercaya.
- Simpan minimal 30 hari; cadangan bulanan disimpan 1 tahun.

### 2.8 Pemantauan & respons insiden
- Kirim log systemd/nginx ke satu tempat (Grafana Loki, atau minimal
  `logrotate` + `journalctl` yang disimpan 90 hari).
- Peringatan untuk: lonjakan 429/403, webhook signature gagal berulang, restart
  server berulang, sertifikat < 14 hari, disk > 80 %.
- Uptime check eksternal ke `/api/pay/health` (tanpa membocorkan detail).
- Rencana insiden satu halaman: siapa yang dihubungi, cara mencabut kunci
  gateway dalam 5 menit, cara mengembalikan dari cadangan, kewajiban
  pemberitahuan pelanggan (UU PDP: maksimal 3×24 jam sejak diketahui).

## 3. Rutinitas

| Kapan | Apa |
|---|---|
| Harian | Lihat ringkasan log 4xx/5xx dan webhook gagal; rekonsiliasi transaksi |
| Mingguan | `apt update && apt upgrade`; cek `certbot renew --dry-run` |
| Bulanan | `npm audit` di `app/server`; tinjau akun admin & hak akses; uji pemulihan cadangan (triwulan) |
| Tiap 90 hari | Rotasi kunci API yang bisa dirotasi tanpa gangguan; tinjau allowlist IP |
| Setelah orang keluar dari tim | Cabut SSH key, akun admin, akses GitHub/gateway, ganti rahasia yang ia ketahui |

## 4. Menguji sendiri

```bash
# semua uji server (header, CORS, token, pembatas laju, OTP, webhook)
node alat/uji-keamanan.js
```

Uji ini menjalankan ketiga server di port sementara dengan penyedia OTP `log`,
lalu menembak setiap endpoint; hasil `LULUS`/`GAGAL` tercetak per kasus.
