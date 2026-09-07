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


# kirim-server.js — kurir marketplace (Biteship)

Jembatan ke [Biteship](https://biteship.com) untuk marketplace perlengkapan:
tarif kurir saat checkout, pembuatan pesanan kirim (kurir menjemput ke alamat
toko) saat mitra toko memproses pesanan, pelacakan, dan webhook status.

## Kenapa di server
API key Biteship berhak **membuat pesanan kirim** — artinya mengeluarkan uang.
Kunci hanya ada di `.env` (`BITESHIP_API_KEY`); browser bicara ke server ini.
Kunci `biteship_test.…` tidak pernah memanggil kurir sungguhan; `biteship_live.…`
menagih ongkos betulan pada setiap pesanan.

## Menjalankan
```bash
npm run start:kirim        # KIRIM_PORT, bawaan 4300
```
Tanpa kunci, `/api/kirim/health` membalas `siap:false` dan aplikasi otomatis memakai
tarif statis (Reguler/Kilat/Ambil di toko).

## Endpoint
| Method | Path | Kegunaan |
|---|---|---|
| GET | `/api/kirim/health` | hidup, jenis kunci (test/live/kosong), daftar kurir, webhook terpasang |
| GET | `/api/kirim/couriers` | kurir & layanan aktif di akun |
| GET | `/api/kirim/areas?q=` | cari kelurahan / kode pos |
| POST | `/api/kirim/rates` | `{dari:{kodePos|lat,lng}, ke:{…}, items:[{name,value,quantity,weight}], kurir:[…]}` → `{opsi:[…]}` |
| POST | `/api/kirim/orders` | `{refId, kurir, layanan, dari, ke, items}` → `{orderId, resi, status}`; idempoten per `refId` |
| GET | `/api/kirim/daftar` | daftar pesanan kirim tersimpan (untuk konsol admin → H2H → Kurir) |
| GET | `/api/kirim/status/:ref` | status tersimpan (diperbarui webhook; disegarkan dari Biteship bila > 10 menit) |
| GET | `/api/kirim/tracking/:id` | riwayat langsung dari Biteship |
| POST | `/api/kirim/webhook` | pemberitahuan Biteship; header `x-biteship-signature` harus sama dengan `BITESHIP_WEBHOOK_SECRET` |

Status kurir dipetakan: confirmed/allocated/picking_up → diproses, picked/dropping_off → dikirim,
delivered → selesai, returned → retur, cancelled/rejected → gagal. Aplikasi mengikuti
pemetaan ini saat pembeli/toko menekan **Lacak** (pesanan otomatis selesai saat delivered).

## Webhook
Dashboard Biteship → Settings → Webhooks → `https://domain-anda/api/kirim/webhook`
(nginx meneruskan ke 4300). Isi `BITESHIP_WEBHOOK_SECRET` dengan nilai yang sama;
tanpa secret, server menolak webhook di `NODE_ENV=production`.

## Pengaman
CORS ketat (`ALLOWED_ORIGINS`), pembatas laju per IP (tarif 30/menit, pesanan kirim
20/jam, baca 60/menit), badan JSON ≤ 64 kB, teks disaring, log tanpa PII.
Penyimpanan `data/kirim.json` (refId → orderId, resi, status, riwayat).


# dwi-server.js — Darmawisata Indonesia H2H (PPOB & isi ulang)

Jembatan ke API H2H Darmawisata untuk **Bayar & Isi Ulang** di aplikasi pelanggan:
tagihan (PLN, BPJS, PDAM, Telkom, internet, multifinance) dan TopUp (pulsa, data,
token PLN, e-wallet). Jalur baca rumpun perjalanan ikut di daftar putih; jalur
Booking/Issued sengaja tidak dibuka.

## Kenapa di server
Model **agen prabayar**: tiap transaksi memotong deposit perusahaan, dan password
agen adalah kunci ke deposit itu. Password hanya di `.env`; yang dikirim ke
Darmawisata adalah `securityCode = MD5(token + MD5(password))` per login, dan
`accessToken` tidak pernah sampai ke browser. Server bukan proxy buta: hanya jalur
di `DAFTAR_PUTIH` yang lewat, dan jalur yang memotong deposit hanya lewat
`POST /api/dwi/bayar` yang punya **kunci idempotensi** (PPOB: `billingReferenceID`
sekali pakai; TopUp: `MSISDN + productCode + sequence`) — klik ganda, coba-ulang,
atau muat ulang halaman tidak pernah membayar dua kali.

## Menjalankan
```bash
npm run start:dwi          # DWI_PORT, bawaan 4400
```
`DWI_BASE_URL` bawaan UAT (`uat-backup…`); alamat apa pun tanpa "uat" dianggap
**produksi** dan memotong deposit sungguhan. `DWI_SIMULASI=1` memberi balasan tiruan
(produk, tagihan, pembayaran, saldo) untuk pengembangan tanpa akun.

## Endpoint
| Method | Path | Kegunaan |
|---|---|---|
| GET | `/api/dwi/health` | siap?, mode uat/produksi/simulasi, sesi, jumlah jalur terbuka (tanpa rahasia) |
| GET | `/api/dwi/balance` | sisa deposit agen |
| POST | `/api/dwi/call` | `{jalur, isi}` jalur BACA berdaftar-putih (ProductGroup, Product, Inquiry, …) |
| POST | `/api/dwi/bayar` | `{jalur, isi}` jalur UANG: 200 selesai · 202 tertunda · 409 berjalan/ragu · 400 ditolak |
| POST | `/api/dwi/cocokkan` | `{kunci}` tanyakan nasib transaksi tertunda/ragu ke TransactionDetail |
| GET | `/api/dwi/transaksi` | catatan idempotensi (untuk pencocokan admin) |

Keadaan: **selesai** · **berjalan** (di udara, permintaan kedua ditolak) · **tertunda**
(sudah masuk penyedia, status belum final — deposit bisa jadi terpotong) · **ragu**
(putus tanpa jawaban). Tertunda dan ragu **tidak pernah diulang otomatis**; admin
mencocokkan lewat konsol → Marketplace → Bayar & isi ulang. Catatan di
`data/dwi-transaksi.json`.

## Pengaman
CORS ketat, pembatas laju (baca 60/menit, jalur uang 10 per 10 menit per IP), badan
JSON ≤ 32 kB, teks disaring, log tanpa PII dan tanpa kredensial.
