/* ==========================================================================
   buat-ikon.js — menyiapkan bahan ikon & splash untuk @capacitor/assets
   --------------------------------------------------------------------------
   Sumbernya satu: app/assets/icon-512.png — nila penuh sampai tepi dengan
   pita "MCS" di bawah.

   KENAPA TIDAK DIPAKAI MENTAH

   Ikon adaptif Android memotong lapisan depan dengan topeng yang bentuknya
   ditentukan peluncur — bundar, kotak membulat, atau tetesan. Hanya bagian
   TENGAH (sekitar 66%) yang dijamin terlihat. Memakai gambar yang penuh
   sampai tepi berarti pita "MCS" itu terpotong pada sebagian besar ponsel.

   Karena itu dipisah dua lapis:
     · belakang  — nila polos, diambil dari sudut gambar aslinya sendiri
                   supaya warnanya tidak ditebak
     · depan     — seluruh gambar diperkecil ke zona aman, di atas latar
                   tembus pandang

   Menjalankan:  node buat-ikon.js
   Lalu:         npx @capacitor/assets generate --android
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUMBER = path.resolve(__dirname, '..', 'app', 'assets', 'icon-512.png');
const KELUAR = path.resolve(__dirname, 'assets');

async function jalan() {
  if (!fs.existsSync(SUMBER)) {
    console.error('BERHENTI — ikon sumber tidak ada: ' + SUMBER);
    process.exit(1);
  }
  fs.mkdirSync(KELUAR, { recursive: true });

  /* Warna latar diambil dari piksel sudut kiri-atas gambar aslinya, bukan
     diketik dari ingatan: nila di manifest dan nila di gambar belum tentu
     sama, dan bedanya akan terlihat sebagai garis di tepi ikon adaptif. */
  const sudut = await sharp(SUMBER).extract({ left: 2, top: 2, width: 4, height: 4 })
    .raw().toBuffer();
  const bg = { r: sudut[0], g: sudut[1], b: sudut[2] };
  const hex = '#' + [bg.r, bg.g, bg.b]
    .map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  console.log('warna latar diambil dari gambar: ' + hex);

  /* 1. icon.png — ikon biasa (bukan adaptif), 1024. */
  await sharp(SUMBER).resize(1024, 1024, { kernel: 'lanczos3' })
    .png().toFile(path.join(KELUAR, 'icon.png'));

  /* 2. icon-background.png — nila polos. */
  await sharp({ create: { width: 1024, height: 1024, channels: 4,
      background: { r: bg.r, g: bg.g, b: bg.b, alpha: 1 } } })
    .png().toFile(path.join(KELUAR, 'icon-background.png'));

  /* 3. icon-foreground.png — LAMBANGNYA SAJA.

     Gambar aslinya memuat empat hal bertumpuk: lambang rumah, gelombang,
     wordmark EXOCLEAN, dan pita MCS yang penuh sampai tepi. Memasukkan
     keempatnya ke dalam topeng bundar membuat semuanya mengecil sampai tak
     terbaca, dan pita MCS-nya terpotong lebih dulu.

     Pada ikon peluncur 48dp, teks memang tidak pernah terbaca — nama
     aplikasinya sudah ditulis peluncur di bawah ikon. Yang pantas dipakai
     hanya LAMBANGNYA. Batasnya diukur dari gambarnya sendiri (blok pertama
     dan kedua: y 68-279, x 168-342), bukan ditebak. */
  const L = { left: 168, top: 68, width: 342 - 168 + 1, height: 279 - 68 + 1 };

  /* Lapisan depan diberi inset 16,7% oleh mipmap-anydpi-v26/ic_launcher.xml,
     sehingga isi berkas ini persis menempati area topeng. Lambangnya diberi
     ruang napas: 72% dari sisi itu. */
  const tinggi = Math.round(1024 * 0.72);
  const lebar = Math.round(tinggi * L.width / L.height);
  const lambang = await sharp(SUMBER).extract(L)
    .resize(lebar, tinggi, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: lambang, gravity: 'centre' }])
    .png().toFile(path.join(KELUAR, 'icon-foreground.png'));

  /* 4. splash — 2732 persegi, logo di tengah seperempat lebarnya.

     Persegi, bukan seukuran layar: @capacitor/assets memotongnya sendiri
     untuk tiap orientasi dan kerapatan, dan yang di tengah tidak pernah
     hilang pada rasio mana pun. */
  const logo = await sharp(SUMBER).resize(700, 700, { kernel: 'lanczos3' })
    .png().toBuffer();
  for (const nama of ['splash.png', 'splash-dark.png']) {
    await sharp({ create: { width: 2732, height: 2732, channels: 4,
        background: { r: bg.r, g: bg.g, b: bg.b, alpha: 1 } } })
      .composite([{ input: logo, gravity: 'centre' }])
      .png().toFile(path.join(KELUAR, nama));
  }

  const daftar = fs.readdirSync(KELUAR);
  console.log('\nbahan siap di ' + KELUAR + ':');
  daftar.forEach(function (f) {
    const st = fs.statSync(path.join(KELUAR, f));
    console.log('  ' + f.padEnd(24) + Math.round(st.size / 1024) + ' KB');
  });
  console.log('\nlanjut: npx @capacitor/assets generate --android');
}

jalan().catch(function (e) {
  console.error('BERHENTI — ' + e.message);
  process.exit(1);
});
