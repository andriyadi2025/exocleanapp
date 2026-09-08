# Kepatuhan EXOCLEAN — pendaftaran PSE dan UU Pelindungan Data Pribadi

Panduan ini melengkapi `KEAMANAN.md`. Bagian 1 adalah langkah administratif yang harus dikerjakan orang (bukan kode). Bagian 2 memetakan kewajiban UU No. 27/2022 ke fitur yang sudah ada di aplikasi. Bagian 3 adalah rutinitas.

## 1. Pendaftaran PSE Lingkup Privat (Permenkominfo 5/2020 jo. 10/2021)

Wajib **sebelum** sistem dipakai publik di Indonesia; gratis; melalui OSS.

| # | Langkah | Yang disiapkan |
|---|---|---|
| 1 | Badan usaha punya **NIB** dari OSS-RBA (oss.go.id) | akta, NPWP badan, KBLI yang sesuai (mis. 62012/63122 portal web & platform digital, 96200 jasa kebersihan) |
| 2 | Masuk ke **pse.komdigi.go.id** dengan akun OSS → *Pendaftaran PSE Lingkup Privat* | akun OSS pemilik/direktur |
| 3 | Isi profil sistem elektronik | nama sistem (EXOCLEAN App), domain `app.exoclean.id`, `api.exoclean.id`, `exoclean.id`; deskripsi (marketplace jasa kebersihan & perlengkapan); kategori; data pribadi yang diproses (lihat *Catatan pemrosesan* di konsol admin → IT → UU PDP & PSE); lokasi server (Indonesia); URL kebijakan privasi `privasi.html`; syarat layanan; PIC & kontak (email, telepon) |
| 4 | Lampirkan dokumen | NIB/akta, kebijakan privasi, gambaran pengamanan (ringkasan `KEAMANAN.md` §1 & §7), prosedur pengaduan pengguna (Customer Care AI + email), pernyataan kepatuhan |
| 5 | Terima **Tanda Daftar PSE** (nomor & tanggal) | catat di konsol admin (status *Terdaftar*), tampilkan nomor di footer web |
| 6 | Kewajiban setelah terdaftar | mutakhirkan data bila ada perubahan sistem/PIC; tanggapi permintaan takedown konten (mendesak ≤ 4 jam, lainnya ≤ 24 jam); beri akses data untuk penegakan hukum sesuai prosedur dan hanya lewat permintaan resmi; simpan catatan sistem (log) minimal 3 bulan (`KEAMANAN.md` §2.8: 90 hari); pemutusan akses konten yang dilarang |

Catatan: satu pendaftaran bisa memuat beberapa sistem/domain milik badan usaha yang sama. Aplikasi Android didaftarkan dengan nama paket `id.exoclean.app` sebagai bagian sistem yang sama.

## 2. UU PDP No. 27/2022 → fitur di aplikasi

Berlaku penuh sejak 17 Oktober 2024. EXOCLEAN adalah **pengendali data** untuk pelanggan, mitra cleaning, dan mitra toko.

| Kewajiban (pasal) | Cara dipenuhi | Di mana |
|---|---|---|
| Dasar pemrosesan & persetujuan yang tegas, dapat dibuktikan (Ps. 20–24) | lembar persetujuan wajib sebelum memakai aplikasi, per sisi, per **versi kebijakan**; pilihan pemasaran terpisah; bukti tersimpan (waktu, versi, tujuan, cara, agen) | `js/exo-screens-privasi.js`, tabel `persetujuanPdp`, admin tab *Persetujuan* |
| Informasi kepada subjek data (Ps. 21): identitas pengendali, dasar hukum, tujuan, jenis data, retensi, hak, pihak ketiga | kebijakan privasi berversi 9 bagian | `privasi.html`, penyunting di admin tab *Kebijakan privasi* |
| Hak subjek data (Ps. 5–13): informasi, akses/salinan, perbaikan, hapus, tarik persetujuan, pembatasan, portabilitas, keberatan | menu **Akun → Privasi & data saya**: unduh salinan (JSON), saklar pemasaran, ajukan koreksi/hapus/portabilitas; antrean admin dengan tenggat | layar `privasi`, tabel `permintaanPdp`, admin tab *Permintaan subjek data* |
| Akses dalam **3×24 jam** (Ps. 32) | tenggat otomatis 72 jam pada setiap permintaan; penanda lewat tenggat | admin tab *Permintaan subjek data* |
| Penghapusan/pemusnahan (Ps. 43–44) | penghapusan kriptografis rekaman brankas + anonimisasi baris lokal; riwayat transaksi tetap untuk kewajiban pembukuan | `EXO_PRIVASI.hapusSubjek`, brankas `hapus` |
| Pengamanan data (Ps. 35–39) | enkripsi AES-256-GCM di server, sesi bertanda tangan, PIN/passkey, audit berantai, VDP | `KEAMANAN.md` §1, §7, §8 |
| Pemberitahuan kegagalan pelindungan **3×24 jam** ke subjek & lembaga (Ps. 46) | register insiden dengan hitung mundur, surat templat ke subjek dan lembaga, tanda kirim | admin tab *Insiden kebocoran* |
| Catatan kegiatan pemrosesan (Ps. 31) | RoPA otomatis: tabel, bidang, tujuan, dasar, retensi, enkripsi | admin tab *Catatan pemrosesan* |
| DPIA untuk pemrosesan berisiko tinggi (Ps. 34) | status & catatan; wajib untuk lokasi mitra, KTP/SKCK, penilaian otomatis, SOS | admin tab *Kepatuhan & PSE* |
| Pejabat Pelindungan Data (Ps. 53–54) | nama/email DPO tercantum di kebijakan & aplikasi; kontak di `privasi.html` | admin tab *Kepatuhan & PSE* |
| Prosesor berdasarkan perintah tertulis (Ps. 51) | daftar prosesor & status perjanjian (DPA) | admin tab *Kepatuhan & PSE* |
| Transfer ke luar negeri (Ps. 56) | hanya bila tingkat pelindungan setara/pengamanan memadai — dicantumkan di kebijakan; server di Indonesia | kebijakan bagian 5 |
| Data anak (Ps. 25) | layanan 18+; pernyataan di kebijakan | kebijakan bagian 8 |

Sanksi: administratif (peringatan, penghentian pemrosesan, penghapusan data, denda hingga 2% pendapatan tahunan — Ps. 57) dan pidana (Ps. 65–67). Lembaga pengawas: lembaga penyelenggara pelindungan data pribadi yang ditetapkan pemerintah (sampai terbentuk, koordinasi lewat Komdigi).

## 3. Rutinitas

| Kapan | Apa |
|---|---|
| Harian | cek antrean *Permintaan subjek data* (tenggat 3×24 jam) dan register insiden |
| Bulanan | tinjau persetujuan yang ditarik; hapus data yang lewat retensi (lokasi mitra 90 hari, log 90 hari, dokumen verifikasi selesai) |
| Tiap perubahan fitur yang menyentuh data pribadi | perbarui RoPA & kebijakan (versi baru → persetujuan ulang), DPIA bila berisiko tinggi |
| Tahunan | tinjau DPIA, perjanjian prosesor, data PSE; perbarui `security.txt` |
