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

## 5. Kendali perubahan pengaju–penyetuju (7 Sep 2026)

Menggantikan gagasan "dua PIN di satu layar" dengan dua orang, dua sesi (`js/exo-persetujuan.js`, modul **Persetujuan** di konsol admin):

| Tingkat | Aturan | Contoh |
|---|---|---|
| Rendah | PIN sendiri, langsung berlaku, tercatat, bisa dibatalkan | catatan, salah ketik |
| Sedang | 1 penyetuju (supervisor/super admin) dari sesi lain; pengaju tidak boleh menyetujui usulannya sendiri | SOP, tarif, promo, poin |
| Tinggi | 2 penyetuju berbeda, berlaku tertunda 30 menit (masih bisa dibatalkan), sesi > 15 menit wajib sandi lagi | peran & akun admin, merek, pembayaran |

- Peran admin: `staf` (mengajukan), `supervisor` dan `superadmin` (menyetujui). Akun pertama = super admin. Mengubah peran adalah usulan tingkat tinggi.
- Antrean menampilkan selisih sebelum–sesudah; setiap persetujuan/penolakan/pembatalan lewat PIN atau **passkey** (WebAuthn, sidik jari/wajah; kunci publik disimpan di baris admin, tanda tangan diverifikasi di peramban).
- **Log audit berantai hash** (SHA-256 atas entri sebelumnya): tombol "Verifikasi rantai" mendeteksi entri yang dihapus atau diubah.
- Anomali ditandai di log: > 10 penerapan per jam oleh satu akun, atau di luar jam 06–22.
- **Mode satu admin**: bila tidak ada penyetuju lain, super admin boleh menerapkan sendiri, tetapi entri ditandai "tanpa pemeriksa kedua" dan konsol menampilkan peringatan. Tambahkan supervisor untuk mengaktifkan aturan dua orang.
- Batas yang tetap berlaku: semua ini berjalan di peramban dengan data lokal. Struktur tabel `usulan` dan `audit` disiapkan untuk dipindahkan ke server, tempat penegakan sesungguhnya harus terjadi.

## 6. Cek bug & analisis keamanan ulang (7 Sep 2026)

Pemeriksaan otomatis: 26 tampilan konsol admin, 27 layar + 20 lembar aplikasi (4 bahasa) tanpa galat; tidak ada tombol/kolom tanpa penangan; sintaks semua berkas lulus; `npm audit` 0 kerentanan; 26 uji server lulus.

Temuan dan perbaikan:
- **CSP memblokir peta** (`maps.google.com` di iframe layar pelacakan/rute) — ditambahkan ke `frame-src` di semua halaman dan contoh nginx.
- **Sandi akun admin baru diminta lewat `window.prompt`** (teks polos tampak di layar, bisa terekam) — diganti formulir dengan kolom sandi tersembunyi, validasi email unik, minimal 10 karakter, tetap wajib PIN.
- **Cuti dibuat sebelum PIN** (baris "menunggu" yatim bila PIN dibatalkan) — baris kini dibuat setelah PIN; usulan yang ditolak/dibatalkan menandai cuti "ditolak" lewat kait penolakan baru di kendali perubahan.
- Rating tanpa nilai bisa menghasilkan NaN di papan kinerja — dijaga.
- Saldo dompet tampak negatif di neraca contoh (tanpa saldo awal) — jurnal saldo awal ditambahkan untuk mode contoh saja.
- Uji koneksi Integrasi bisa tertulis "tidak terjangkau" karena CORS — petunjuk ALLOWED_ORIGINS ditampilkan.

Yang tetap menjadi batas (bukan bug): seluruh kendali persetujuan, PIN, dan audit berjalan di peramban atas data localStorage; siapa pun yang memegang perangkat berlogin dapat memanggil fungsi langsung dari DevTools. Penegakan sungguhan menuntut server.

## 7. Data pribadi terenkripsi di server, bukan di perangkat (8 Sep 2026)

Menjawab temuan audit "PII polos di localStorage". Bidang data pribadi (telepon, email, alamat, koordinat, NIK, NPWP, rekening, kontak darurat) kini dititipkan ke **data-server** dan di perangkat hanya tersisa versi tersamar.

| Lapisan | Berkas | Teknologi |
|---|---|---|
| Kriptografi | `brankas.js` | Enkripsi amplop: kunci induk (KEK) 256-bit berversi dari `.env`, sub-kunci lewat HKDF-SHA256 (bungkus/indeks/audit); kunci data (DEK) 256-bit **acak per rekaman**; AES-256-GCM per bidang dengan IV 96-bit acak dan AAD `tabel\|id\|bidang\|versi` (ciphertext tidak bisa dipindah antar bidang/rekaman); DEK dibungkus AES-256-GCM oleh KEK; rotasi kunci = bungkus ulang DEK saja; indeks buta HMAC-SHA256 untuk mencari email/telepon tanpa dekripsi; penghapusan kriptografis (hak hapus UU PDP); log audit tanpa data pribadi dirantai HMAC; buffer kunci dinolkan setelah dipakai |
| Sesi | `sesi.js` | Token HS256 (HMAC-SHA256, rahasia 256-bit `SESI_SECRET`) diterbitkan auth-server setelah OTP/login sosial; `sub` = pseudonim HMAC atas nomor/email (tanpa data pribadi); `sisi` klien/mitra/toko/admin (admin hanya nomor di `ADMIN_TELP`); 12 jam; middleware `wajibSesi()` untuk server lain |
| Server | `data-server.js` | Port 4600; semua endpoint wajib Bearer sesi; rekaman terikat pemilik `sub`; admin bisa membaca semua; statistik, verifikasi audit, rotasi kunci hanya sesi admin; **tidak ada mode simulasi** — tanpa `SESI_SECRET`/`BRANKAS_KUNCI` server menolak berjalan |
| Klien | `js/exo-brankas.js` | Kait `EXO_DB.hooks`: setelah insert/update bidang pribadi dikirim ke brankas; sebelum localStorage ditulis, baris yang terkonfirmasi tersimpan diganti versi tersamar (`0812-••••-4417`, `d•••@gmail.com`, `Jl. Kemang…`); teks polos hanya di memori tab selama sesi; saat aplikasi dibuka dengan sesi aktif, rekaman diambil dari brankas dan digabung kembali; migrasi otomatis memindahkan data lama; bila brankas tidak terjangkau, data tetap lokal dan ditandai tertunda (tidak hilang) |
| Admin | `js/exo-admin-brankas.js` | IT → Keamanan → kartu *Brankas data pribadi*: status server, rekaman di perangkat vs di brankas, sesi admin lewat OTP, migrasi manual, verifikasi rantai audit server, rotasi kunci (PIN + audit) |

Menyiapkan di server produksi:

```bash
cd app/server
node sesi.js --buat-kunci      # → SESI_SECRET
node brankas.js --buat-kunci   # → BRANKAS_KUNCI, BRANKAS_KUNCI_VERSI=1
# isi keduanya + ADMIN_TELP di .env (hak akses 600); simpan kunci di brankas kata sandi tim
npm run start:data             # bersama start:auth; di nginx teruskan /api/data/ ke 127.0.0.1:4600
npm run test:brankas           # 24 uji kriptografi & sesi
```

Rotasi kunci induk: pindahkan kunci lama ke `BRANKAS_KUNCI_LAMA=1:<hex-lama>`, isi `BRANKAS_KUNCI` baru dan `BRANKAS_KUNCI_VERSI=2`, mulai ulang data-server, lalu konsol admin → Keamanan → *Putar kunci*. Setelah semua rekaman berversi 2, kosongkan `BRANKAS_KUNCI_LAMA`.

Yang masih menjadi batas: penyimpanan rekaman terenkripsi masih berkas JSON per rekaman (`data/brankas/`, di luar repo) — antarmuka `PENYIMPANAN` siap diganti PostgreSQL; kunci induk di `.env` sebaiknya dipindah ke KMS/HSM (Cloud KMS, Vault) saat volume naik; foto identitas belum dititipkan (tabel `foto` sudah diizinkan di `BRANKAS_TABEL`).

## 8. Program pengungkapan kerentanan (VDP) & bug bounty (8 Sep 2026)

| Bagian | Berkas | Isi |
|---|---|---|
| Kebijakan publik | `SECURITY.md` (akar repo, dikenali GitHub), `app/keamanan.html` | cakupan, di luar cakupan, aturan main & **safe harbor** (tidak menempuh jalur hukum/UU ITE atas riset beritikad baik), tingkat CVSS v3.1 & hadiah (Kritis Rp10–25 jt, Tinggi Rp3–10 jt, Sedang Rp1–3 jt, Rendah Rp250 rb–1 jt, Informasional = pengakuan), SLA (balasan 3 hari kerja, triase 7, perbaikan 30/90 hari, pembayaran 14 hari), penanganan temuan data pribadi sebagai insiden UU PDP |
| `security.txt` | `app/.well-known/security.txt` (RFC 9116) | Contact, Policy, Acknowledgments, Preferred-Languages, Canonical, Expires 8 Sep 2027 — **isi URL kunci PGP dan tanda tangani** sebelum tayang; perbarui sebelum kedaluwarsa |
| Penerima laporan | `vdp-server.js` (port 4700) | formulir → laporan disimpan **terenkripsi** lewat `brankas.js` (tabel `vdp`, tanpa pemilik → hanya sesi admin), 5 laporan/jam/IP, honeypot, Turnstile bila dikonfigurasi, nomor tanda terima `VDP-YYYYMMDD-XXXXXX`; indeks polos hanya nomor + waktu + tingkat dugaan |
| Konsol admin | `js/exo-admin-vdp.js` (IT → Bug bounty / VDP) | laporan dimuat dari brankas dengan sesi admin, triase: status (baru → triase → valid/duplikat/tidak berlaku → diperbaiki → dibayar), CVSS → tingkat → hadiah saran (interpolasi dalam rentang), PIN + audit tiap perubahan; penyunting kebijakan yang diterbitkan ke halaman publik; hall of fame dengan izin pelapor; penanda lewat SLA |

Menjalankan: `npm run start:vdp` (butuh `BRANKAS_KUNCI` yang sama dengan data-server); nginx meneruskan `/api/vdp/` ke 4700 dan melayani `/.well-known/security.txt` (contoh di `contoh/nginx-exoclean.conf`). Pembayaran hadiah dicatat di triase; masukkan ke Accounting sebagai beban keamanan saat dibayar.

### 7.1 Sesi wajib di semua server uang (8 Sep 2026)

Menutup temuan audit "server uang tanpa autentikasi". Setiap endpoint di bawah ini kini memakai `SESI.wajibDariEnv()`: Bearer sesi bertanda tangan dari auth-server wajib; rekaman terikat ke `sub` pembuatnya dan hanya boleh dibaca/diubah oleh pemilik yang sama atau sesi admin.

| Server | Wajib sesi (pengguna) | Hanya sesi admin | Bebas (dipanggil gateway/monitor) |
|---|---|---|---|
| payment | charge, authorize, status, capture, cancel (+ X-Exo-Token, + pemilik) | — | health, webhook Midtrans/Xendit |
| kirim | couriers, areas, rates, orders (pemilik), status/:ref (pemilik), tracking/:id | daftar | health, webhook |
| dwi | call, bayar (sub dicatat di log), perjalanan/akses, perjalanan/cari | balance, transaksi, cocokkan | health |
| posisi | baca (sesi apa pun + token baca) | — | health |
| posisi (tulis) | hanya sesi **mitra**/admin + token tulis | | |
| data (brankas) | semua (pemilik) | statistik, verifikasi-audit, putar-kunci | health |

Perilaku tanpa `SESI_SECRET`: `NODE_ENV=production` → 503 (endpoint menolak sampai rahasia diisi); pengembangan → lolos dengan satu peringatan di log (`req.sesi = null`). Klien (`js/exo-server.js`) selalu membawa Bearer dari sessionStorage pada GET maupun POST; balasan 401 ditandai `perluSesi` dan alur pembayaran mengarahkan pengguna ke OTP. Uji: `node alat/uji-keamanan.js` (kini juga menjalankan kirim & dwi dalam mode simulasi).

### 7.2 PIN transaksi terpisah dari sandi/OTP untuk semua pengguna (8 Sep 2026)

Pola Tokopedia/GoPay: masuk dengan OTP, tetapi setiap aksi uang meminta PIN 6 digit.

| Lapisan | Berkas | Perilaku |
|---|---|---|
| Server | `auth-server.js` `/api/auth/pin/{status,atur,verifikasi,ganti,reset}` (wajib sesi) | hash PBKDF2-SHA256 100k per `sub` di `data/pin.json` (di luar repo; `PIN_BERKAS` untuk mengganti lokasi); PIN lemah ditolak (sama semua, berurutan, pola berulang, pola tanggal); salah 5× → terkunci 30 menit; verifikasi berhasil → **PIN-token** HS256 (klaim `pin:true`, `PIN_TOKEN_DETIK` bawaan 300) terikat `sub`; reset hanya dengan sesi segar < 10 menit (OTP baru) |
| Penegakan | `sesi.js` `wajibPin()` | `payment` charge/authorize/capture dan `dwi` bayar wajib header `X-Exo-Pin` berisi PIN-token milik sesi yang sama (403 `perluPin` bila tidak ada/kedaluwarsa/milik sub lain) |
| Klien | `js/exo-pin.js`, `js/exo-screens-pin.js` | gerbang `X.denganPin(alasan, kerja)` membungkus: konfirmasi bayar/tahan (keypad PIN yang ada kini diverifikasi sungguhan), isi & tarik saldo, bayar keranjang toko, pencairan toko, isi saldo iklan, ganti rekening, permintaan hapus akun; PIN dibuat saat pendaftaran pelanggan atau saat aksi uang pertama; layar **PIN transaksi** (Akun) untuk ganti & reset lewat OTP; tanpa server → hash PBKDF2 150k lokal dengan kunci 30 menit; PIN-token disimpan di memori dan dibawa otomatis oleh `js/exo-server.js` |

Uji: `node alat/uji-keamanan.js` (53 uji, termasuk PIN lemah, salah 5× terkunci, PIN-token sub lain ditolak, reset dengan sesi segar).

### 7.3 Verifikasi dua langkah (aplikasi autentikator & passkey) untuk semua pengguna (8 Sep 2026)

Setara Tokopedia (Google Authenticator) dan GoPay (biometrik). Semua diputuskan di **auth-server** (`duafaktor.js`), bukan di perangkat.

| Bagian | Cara kerja |
|---|---|
| TOTP | RFC 6238: rahasia 160-bit base32, HMAC-SHA1, 30 detik, 6 digit, toleransi ±1 langkah, kode yang sama tidak boleh dipakai dua kali; rahasia disimpan **terenkripsi** (AES-256-GCM, kunci HKDF dari `SESI_SECRET`) di `data/2fa.json`; QR dibuat server (`qrcode`) — pengguna memindai dengan Google Authenticator/Authy/Microsoft Authenticator |
| Passkey | WebAuthn/FIDO2 ES256: tantangan acak 5 menit per akun; pendaftaran memeriksa clientDataJSON (type, challenge, origin ∈ `ALLOWED_ORIGINS`), `rpIdHash` (`DUA_RP_ID`), flag UP, lalu menyimpan kunci publik (COSE→JWK) + counter; masuk memverifikasi tanda tangan ECDSA atas `authenticatorData ‖ SHA-256(clientDataJSON)` dan counter yang naik (deteksi kloning). Attestation tidak dipercaya; CBOR decoder minimal tanpa dependensi |
| Kode pemulihan | 8 kode `XXXXX-XXXXX`, disimpan SHA-256, sekali pakai; dibuat saat 2FA pertama aktif, bisa dibuat ulang dengan kode yang berlaku |
| Alur masuk | OTP/login sosial pada akun ber-2FA → `{ perlu2fa, sesiSementara }` (klaim `tahap:'2fa'`, 5 menit) yang **ditolak** semua server lain (`wajibSesi` 401 `perlu2fa`) → `/api/auth/2fa/verifikasi` (kode/pemulihan) atau `/2fa/passkey/masuk` → sesi penuh |
| Klien | `js/exo-2fa.js` (jembatan + WebAuthn di peramban), `js/exo-screens-2fa.js`: layar **Verifikasi dua langkah** di Akun tiap sisi; lembar masuk 2FA otomatis setelah OTP |
| Endpoint | `/api/auth/2fa/{status, totp/daftar, totp/aktifkan, passkey/tantangan, passkey/daftar, passkey/hapus, passkey/masuk, verifikasi, pemulihan-baru, nonaktif}` — wajib sesi (kecuali verifikasi/masuk yang memakai sesi sementara); 30 permintaan/10 menit per akun |

Uji: `npm run test:duafaktor` (12 uji: vektor RFC 6238, anti pemakaian ulang, CBOR, pendaftaran & masuk passkey dengan autentikator tiruan, penolakan tantangan/origin/rpId/kunci asing/counter mundur) dan `node alat/uji-keamanan.js` (alur OTP → sesi sementara → TOTP/pemulihan/passkey → sesi penuh).

### 7.4 Notifikasi login perangkat baru & pengikatan perangkat (8 Sep 2026)

| Bagian | Cara kerja |
|---|---|
| Identitas perangkat | `js/exo-perangkat.js`: id acak 24 byte + pasangan kunci ECDSA P-256 (privat **tidak bisa diekspor**) di IndexedDB per peramban/perangkat; dikirim (id, kunci publik JWK, nama, platform) saat OTP/login sosial |
| Perangkat baru | auth-server (`perangkatCatat`) menyimpan daftar perangkat per akun di `data/perangkat.json` (`PERANGKAT_BERKAS`); perangkat yang belum dikenal → **notifikasi SMS/email** ("akun Anda baru saja masuk dari perangkat baru … Bukan Anda? …") lewat penyedia OTP yang sama, riwayat masuk (50 terakhir, IP disamarkan), balasan `perangkatBaru` ditampilkan aplikasi; id yang sama dengan kunci berbeda dianggap perangkat baru dan yang lama dicabut |
| Pengikatan sesi | sesi (dan sesi sementara 2FA) memuat klaim `dev` (id) & `dkt` (thumbprint JWK RFC 7638); setiap permintaan ke payment/dwi/kirim/posisi/data membawa `X-Exo-Perangkat` = base64url(JSON{ id, jwk, ts, sig }) dengan `sig` = ECDSA-SHA256(`id\|ts\|sub`) dari kunci privat perangkat; `SESI.wajibPerangkat()` menolak (403 `perluPerangkat`) bila thumbprint/id tidak cocok, tanda tangan salah, atau ts di luar ±5 menit — sesi yang dicuri tidak bisa dipakai di perangkat lain (pola DPoP) |
| Kelola | layar **Perangkat & aktivitas masuk** (Akun tiap sisi): daftar perangkat, perangkat ini, cabut perangkat lain (PIN transaksi), riwayat masuk, nama perangkat; endpoint `/api/auth/perangkat/{daftar,hapus}`; perangkat yang dicabut ditolak saat login (403 `perangkatDicabut`) |
| Kompatibilitas | sesi tanpa `dkt` (klien lama / uji) tetap diterima tanpa bukti; tanpa `SESI_SECRET` (pengembangan) tidak ada pengikatan |

Uji: `node alat/uji-keamanan.js` — sesi terikat tanpa bukti → 403, bukti kunci lain → 403, bukti kedaluwarsa → 403, bukti sah → lolos, notifikasi SMS tercatat, daftar & cabut perangkat.

### 7.5 Nominal pembayaran ditentukan server (8 Sep 2026)

Menutup temuan audit kritis "amount diambil dari klien".

| Bagian | Cara kerja |
|---|---|
| Katalog server | `harga.js` memuat `data/harga.json` (terbitan admin) atau `harga-bawaan.json` yang dibangkitkan dari `js/exo-data.js` oleh `alat/ekspor-harga.js` (`npm run harga:ekspor`) — tarif tiap jasa, add-on, faktor tarif tiap juru, voucher, flash deal, biaya aplikasi & regu, diskon langganan, minimum kuantitas, kebijakan ekstra |
| Tagihan | `POST /api/pay/tagihan` (wajib sesi + perangkat): klien mengirim **komposisi** (jasa, jam, juru, add-on, regu, frekuensi, voucher) → server menghitung dengan rumus yang sama dengan aplikasi → tagihan `TG-…` 15 menit, terikat `sub`, sekali pakai; `perkiraan` klien hanya dibandingkan dan dicatat |
| Charge/authorize | menerima **`tagihanId`** — bukan `amount`; bila ada sesi tanpa tagihanId → 400; tagihan milik akun lain → 403; nominal, rincian, dan versi katalog tersimpan di rekaman transaksi; PAY_MAKS_RUPIAH tetap berlaku |
| Tagihan akhir | kanal tertunda (`orderId-C`): `jenis:'akhir'` = nominal transaksi asal (dari rekaman server) + ekstra yang disetujui, dibatasi kebijakan (maks Rp500.000 per item, maks 50% dari nominal asal) |
| Terbitkan katalog | konsol admin → Services & pricing → kartu **Harga di server** → `POST /api/pay/harga` (sesi brankas admin + bukti perangkat + PIN + audit) memakai `EXO_HARGA.kumpulkan()` (tarif + terbitan admin, faktor juru dari basis data, voucher, flash deal aktif, biaya) |
| Klien | `js/exo-harga.js` menyusun komposisi; `EXO_SERVER.bayar/tahan` minta tagihan dulu; bila nominal server ≠ perkiraan aplikasi, aplikasi memakai nominal server dan memberi tahu pengguna |
| Mode pengembangan | tanpa `SESI_SECRET` (tanpa sesi) amount klien masih diterima dan ditandai di log — jangan di produksi |

Uji: `npm run test:harga` (13 uji rumus & validasi) dan `node alat/uji-keamanan.js` (tagihan, charge tanpa tagihan ditolak, tagihan akun lain ditolak, amount klien diabaikan, katalog terbitan admin dipakai).
