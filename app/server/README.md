# Server Pembayaran EXOCLEAN

Jembatan aman antara aplikasi EXOCLEAN (browser) dan gateway **Midtrans** / **Xendit**.

## Kenapa server ini wajib ada

Server Key Midtrans dan Secret Key Xendit memberi akses penuh ke akun pembayaran
Anda — bisa dipakai membuat transaksi, menarik dana, dan membaca data pelanggan.
Kalau kunci itu ditaruh di JavaScript yang diunduh browser, **siapa pun bisa
membacanya lewat View Source**. Karena itu:

| Boleh di browser | Wajib di server |
|---|---|
| Client Key (Midtrans) | Server Key (Midtrans) |
| Public Key (Xendit) | Secret Key (Xendit) |
| URL backend | Callback Verification Token |
| — | Penerimaan & verifikasi webhook |

Alasan kedua: webhook. Gateway mengirim notifikasi "sudah dibayar" ke sebuah URL
publik. Browser tidak punya URL yang bisa dihubungi dari luar, jadi hanya server
yang bisa menerimanya. Tanpa webhook, status pembayaran tidak akan pernah
terbarui otomatis.

## Menjalankan

```bash
cd server
npm install
cp .env.example .env
```

Isi `.env` dengan kunci dari dashboard gateway, lalu:

```bash
npm start
```

Server berjalan di `http://localhost:4000`. Cek dengan membuka
`http://localhost:4000/api/pay/health` — atau tekan tombol **Uji koneksi backend**
di aplikasi EXOCLEAN (Pengaturan Pembayaran).

## Menyambungkan ke aplikasi

Di aplikasi EXOCLEAN, masuk sebagai Admin → **Pengaturan Pembayaran**:

1. Pilih gateway (Midtrans atau Xendit) sebagai gateway aktif.
2. Isi **Client Key / Public Key** dan **URL backend** (`http://localhost:4000`
   saat pengembangan, atau domain server Anda saat produksi).
3. Simpan, lalu tekan **Uji koneksi backend**.

## Mendaftarkan webhook

Ini langkah yang paling sering terlewat. Tanpa ini, pembayaran masuk tapi status
di aplikasi tetap "menunggu".

**Midtrans** — Dashboard → Settings → Configuration → *Payment Notification URL*:

```
https://domain-server-anda.com/api/pay/webhook/midtrans
```

**Xendit** — Dashboard → Settings → Callbacks. Aktifkan minimal:
*Invoices paid*, *Virtual Account paid*, *eWallet*, *Retail outlets*:

```
https://domain-server-anda.com/api/pay/webhook/xendit
```

Saat pengembangan di komputer sendiri, gateway tidak bisa menghubungi
`localhost`. Pakai terowongan seperti `ngrok http 4000`, lalu daftarkan URL
publik yang diberikan ngrok.

## Endpoint

| Method | Path | Kegunaan |
|---|---|---|
| GET | `/api/pay/health` | Cek server hidup & kunci mana yang sudah terisi |
| POST | `/api/pay/charge` | Buat transaksi baru; balasannya sudah dinormalkan |
| POST | `/api/pay/status` | Tanya status satu transaksi berdasarkan `orderId` |
| POST | `/api/pay/webhook/midtrans` | Notifikasi Midtrans (signature SHA-512 diverifikasi) |
| POST | `/api/pay/webhook/xendit` | Callback Xendit (header `x-callback-token` diverifikasi) |

### Bentuk balasan `/api/pay/charge`

Aplikasi tidak perlu tahu bedanya Midtrans dan Xendit — server menormalkan
balasannya menjadi:

```json
{
  "gatewayRef": "id transaksi di gateway",
  "va":         { "bank": "BCA", "nomor": "39001284650173" },
  "kodeBayar":  "kode untuk Alfamart/Indomaret",
  "qrString":   "payload QRIS",
  "qrImageUrl": "URL gambar QR",
  "deeplink":   "URL buka aplikasi e-wallet",
  "redirectUrl":"URL halaman pembayaran",
  "expiredAt":  "2026-08-12T10:00:00.000Z"
}
```

Field yang tidak relevan untuk kanal tersebut bernilai `null`.

## Pemetaan kanal

| Kanal aplikasi | Midtrans | Xendit |
|---|---|---|
| `va_bca`, `va_bni`, `va_bri`, `va_permata`, `va_cimb` | Core API `bank_transfer` | `/callback_virtual_accounts` |
| `va_mandiri` | Core API `echannel` (bill key) | `/callback_virtual_accounts` |
| `qris` | Core API `qris` | Invoice API (`QRIS`) |
| `gopay` | Core API `gopay` | — (lewat QRIS) |
| `shopeepay` | Core API `shopeepay` | `/ewallets/charges` |
| `ovo`, `dana`, `linkaja` | — | `/ewallets/charges` |
| `cc` | Snap (3DS ditangani Snap) | Invoice API (`CREDIT_CARD`) |
| `alfamart`, `indomaret` | Core API `cstore` | `/fixed_payment_code` |

Ketersediaan tiap kanal tergantung yang **diaktifkan pada akun merchant Anda**.
Hubungi tim gateway bila ada kanal yang ditolak.

## Sebelum masuk produksi

- [ ] Ganti penyimpanan dari `transactions.json` ke database sungguhan — lihat
      blok `PENYIMPANAN` dan dua komentar `TODO produksi` di webhook.
- [ ] Ganti `MIDTRANS_MODE=production` dan Secret Key Xendit ke versi live.
- [ ] Pastikan server memakai **HTTPS** — gateway menolak webhook ke HTTP biasa.
- [ ] Batasi `ALLOWED_ORIGINS` hanya ke domain aplikasi Anda, jangan `*`.
- [ ] Terapkan **idempotensi**: webhook bisa dikirim lebih dari sekali untuk
      transaksi yang sama, jadi pastikan invoice tidak terbayar dobel.
- [ ] Simpan log webhook mentah untuk keperluan rekonsiliasi dan sengketa.
- [ ] Cocokkan (rekonsiliasi) setoran gateway dengan mutasi rekening tiap hari —
      biaya layanan gateway dipotong sebelum dana masuk.

---

# Server Autentikasi (`auth-server.js`)

Bagian ini yang membuat **Login Google / Facebook** dan **verifikasi OTP** menjadi
nyata. Tanpa server ini, aplikasi berjalan pada mode **simulasi** — alurnya sama
persis, tetapi kode OTP hanya tampil di layar dan pemilih akun Google/Facebook
ditiru.

## Kenapa harus di server

| Yang dikerjakan | Kenapa tidak bisa di browser |
|---|---|
| Verifikasi `id_token` Google | Harus memeriksa **tanda tangan** token terhadap kunci publik Google. Menguraikan JWT tanpa memeriksa tanda tangannya membuat siapa pun bisa mengarang token berisi email orang lain. |
| Verifikasi `access_token` Facebook | Butuh **App Secret**. Menaruhnya di browser sama dengan mengumumkannya. |
| Mengirim OTP | Butuh kredensial gateway SMS/WhatsApp dan SMTP. |
| Menyimpan OTP | Kodenya **tidak boleh** sampai ke browser. Ia hanya boleh ada di server dan di ponsel/inbox penerimanya. |

## Menjalankan

```bash
cd app/server
npm install
cp .env.example .env      # lalu isi kunci-kuncinya
npm run start:auth        # http://localhost:4100
```

Server pembayaran dan server autentikasi berdiri sendiri-sendiri dan boleh
dijalankan bersamaan (`npm start` dan `npm run start:auth` di dua terminal).

## Endpoint

| Metode | Jalur | Fungsi |
|---|---|---|
| `GET` | `/api/auth/health` | Cek koneksi — dipakai tombol **Uji koneksi** di aplikasi |
| `POST` | `/api/auth/google` | `{ token }` → profil terpercaya `{ provider, uid, email, nama, foto }` |
| `POST` | `/api/auth/facebook` | idem, memakai `access_token` |
| `POST` | `/api/auth/otp/kirim` | `{ jenis, tujuan }` → mengirim kode. **Kodenya tidak dikembalikan.** |
| `POST` | `/api/auth/otp/periksa` | `{ jenis, tujuan, kode }` → `{ ok: true }` atau pesan galat |

## Pemeriksaan yang dilakukan

**Google** — tanda tangan RS256 terhadap JWKS Google (dengan cache sesuai
`Cache-Control`), penerbit, audience harus sama dengan `GOOGLE_CLIENT_ID`,
masa berlaku, dan `email_verified`. Header `alg` selain RS256 ditolak, sehingga
serangan `alg=none` tidak lolos.

**Facebook** — `/debug_token` memastikan token memang untuk App ID kita dan
masih hidup, lalu `/me` mengambil profilnya dengan `appsecret_proof`.
Melewatkan langkah pertama berarti menerima token milik aplikasi lain.

**OTP** — kode dibuat dengan `crypto.randomInt` (bukan `Math.random`), disimpan
sebagai turunan PBKDF2-SHA256 100.000 putaran ber-salt, dibandingkan dengan
`timingSafeEqual`, sekali pakai, dengan jeda antar-kirim, batas percobaan, dan
batas permintaan per jam.

## Menyalakan mode nyata di aplikasi

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* → Web application. Tambahkan origin aplikasi (mis. `http://localhost:8080`) pada **Authorized JavaScript origins**.
2. **developers.facebook.com** → My Apps → Facebook Login. Catat App ID dan App Secret.
3. Isi `.env` di folder ini, lalu jalankan `npm run start:auth`.
4. Di aplikasi, masuk sebagai **Super Admin (IT)** → menu **Akun & Login**:
   * Mode → *Nyata*
   * Google Client ID, Facebook App ID, dan alamat backend
   * Tekan **Uji koneksi** untuk memastikan
5. Ganti `SMS_PROVIDER` dan `EMAIL_PROVIDER` dari `log` ke gateway sungguhan — selama masih `log`, kode hanya tercetak di konsol server dan belum benar-benar terkirim. Endpoint `/api/auth/health` mengembalikan `siapProduksi: false` selama itu terjadi.

> **Client Secret dan App Secret tidak pernah masuk ke aplikasi.** Halaman
> *Akun & Login* hanya menyimpan nilai publik, dan kolomnya menolak nilai yang
> terlihat seperti secret.

## Penyimpanan

OTP disimpan di memori supaya bisa langsung dicoba. Untuk produksi, ganti isi
blok **PENYIMPANAN OTP** dengan Redis (punya TTL bawaan, paling cocok) atau
tabel database — bentuk datanya sudah sesuai dan sisanya tidak perlu diubah.

---

# Darmawisata Indonesia H2H — `dwi-server.js`

Jembatan ke API agen Darmawisata (Swagger 2.0 v2.1, 154 endpoint, 15 rumpun
layanan). Jalankan dengan `npm run start:dwi` (bawaan port **4300**).

## Kenapa harus lewat server, bukan langsung dari browser

Darmawisata memakai model **agen prabayar**: setiap transaksi memotong saldo
deposit perusahaan, bukan menagih pelanggan lebih dulu. Tiga akibatnya:

1. `securityCode` sekelas **Server Key Midtrans** — ia kunci ke saldo itu.
2. `accessToken` hasil login bukan sekadar penanda sesi, melainkan **surat
   kuasa membelanjakan deposit**. Kalau browser memegangnya, satu skrip pihak
   ketiga di halaman mana pun bisa menghabiskannya.
3. Host produksinya `61.8.74.42:7080` — alamat IP dengan port. Tidak ada
   alasan berharap ia mengirim header CORS untuk asal aplikasi kita.

## Daftar putih, bukan proxy buta

Godaan terbesar adalah meneruskan jalur apa pun dari browser. Itu memindahkan
lubangnya, bukan menutupnya. `dwi-server.js` hanya melayani jalur yang
terdaftar di `DAFTAR_PUTIH`, dan jalur yang **memotong deposit**
(`/PPOB/Payment`, `/PPOB/OpenPayment`, `/TopUp/Order`) **sengaja belum
dibuka** — menunggu catatan transaksi dan kunci idempotensi di sisi kita.

Tanpa itu, satu ketukan ganda pada tombol bayar, satu jaringan lambat yang
dicoba ulang, atau satu kali muat ulang halaman di saat yang salah akan
membayar tagihan yang sama dua kali. Uangnya nyata dan tidak kembali sendiri.

Bahannya sudah disediakan Darmawisata: `TopUp/Order` punya field `sequence`
untuk membedakan pengulangan yang disengaja, dan `PPOB/Payment` memakai
`billingReferenceID` dari inquiry yang hanya berlaku sekali.

## Endpoint

| Jalur | Guna |
|---|---|
| `GET /api/dwi/health` | Cek koneksi, kredensial (tersamar), dan sesi |
| `GET /api/dwi/balance` | Sisa deposit agen |
| `POST /api/dwi/call` | Panggil jalur H2H yang ada di daftar putih |

## Sesi

Login menghasilkan `accessToken`. **Spesifikasinya tidak menyebutkan masa
berlaku sama sekali** — tidak ada field kedaluwarsa pada `AuthResponse` — jadi
masa hidupnya tidak ditebak. Dipakai dua jaring: token disegarkan tiap 20
menit, dan setiap panggilan yang ditolak *karena sesi* akan login ulang lalu
dicoba sekali lagi. Kegagalan lain tidak pernah diulang.

## Kontrak login

Swagger tidak menjelaskan bagaimana `token` dan `securityCode` dibentuk;
rinciannya hanya ada di gambar manual (`/manual/img/login-request-param.png`)
yang tidak ikut dalam berkas spec. Isinya:

| Field | Isi |
|---|---|
| `userID` | API User ID |
| `token` | Cap waktu `yyyy-MM-dd'T'HH:mm:ss` — mis. `2015-12-21T15:10:20` |
| `securityCode` | `MD5(token + MD5(Password))` |

Dua akibatnya penting:

1. **`securityCode` bukan kredensial tetap.** Ia dihitung ulang tiap login,
   jadi yang disimpan di `.env` adalah **password**-nya (`DWI_PASSWORD`).
   Menyimpan hasil hitungannya berarti mengunci nilai yang hanya sah pada
   satu detik tertentu, dan login akan gagal pada detik berikutnya.
2. Karena terikat cap waktu, rekaman satu permintaan tidak bisa diputar
   ulang. Yang tidak dilindunginya: passwordnya sendiri tetap harus ada di
   server ini, dan MD5 sudah lama tidak layak untuk hal baru. Keduanya
   pilihan protokol mereka — yang bisa kita jaga hanyalah password itu tidak
   pernah keluar dari `.env`.

Cap waktunya memakai **waktu lokal**. Manual tidak menyebut zona waktu dan
server mereka ada di Indonesia; UTC akan menggeser tujuh jam, yang pada API
yang memeriksa kesegaran token terbaca sebagai permintaan basi.
`DWI_TOKEN_UTC=1` mengubahnya bila ternyata mereka menuntut UTC.

## Host mana yang dipakai

Host `uat.darmawisataindonesiah2h.co.id` (61.8.74.42) **tidak menjawab satu
port pun** dari luar — koneksinya timeout, bukan ditolak, dan itu tanda
paketnya dibuang firewall. Yang dipakai `uat-backup.darmawisataindonesiah2h.co.id`
(180.250.182.125); host itu tersambung normal dan login berhasil.

## Bentuk balasan yang tidak ada di swagger

Nama field pada balasan berbeda dari yang bisa diduga dari nama definisi,
dan hanya ketahuan dengan memanggilnya sungguhan:

| Endpoint | Balasan |
|---|---|
| `/PPOB/ProductGroup` | `productGroups` — array string |
| `/PPOB/Product` | `productList` — `{code,name,group,isActive,isOpenPayment}` |
| `/TopUp/ProductType` | `productTypes` — array string |
| `/TopUp/Provider` | `providers` — array string, **wajib** `productType` |
| `/TopUp/Product` | `products` — `{code,provider,price,name,type,isActive}` |

Menebaknya dari swagger menghasilkan daftar kosong yang terlihat seperti
"belum ada produk", bukan seperti kesalahan.

## Yang masih menggantung

Berkas `h2h-doc.json` itu sendiri **bukan JSON yang sah**: ada baris baru
mentah di dalam string dan koma menggantung sebelum `}`. Harus diperbaiki dulu
sebelum bisa diurai alat mana pun.
