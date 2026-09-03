/* ==========================================================================
   perbaiki-adaptif.js — membetulkan ikon adaptif setelah @capacitor/assets
   --------------------------------------------------------------------------
   MASALAH YANG DIBETULKAN

   @capacitor/assets menulis mipmap-anydpi-v26/ic_launcher.xml seperti ini:

       <background><inset drawable="@mipmap/ic_launcher_background"
                          inset="16.7%" /></background>

   Lapisan BELAKANG diberi inset. Artinya nila polosnya menyusut ke area
   topeng, dan sisi luarnya tembus pandang. Selama peluncur menggambar
   ikonnya persis seukuran topeng, itu tidak terlihat. Begitu peluncur
   memperbesarnya sedikit — animasi buka, efek gerak, atau topeng kotak
   membulat yang sudutnya menjulur lebih jauh — yang muncul di tepi adalah
   kekosongan, bukan nila.

   Lapisan belakang ikon adaptif memang seharusnya MEMENUHI seluruh kanvas.
   Cara paling pasti bukan bitmap, melainkan warna padat: warna tidak punya
   tepi untuk bocor.

   KENAPA BERKAS TERSENDIRI

   `npx @capacitor/assets generate` MENIMPA ic_launcher.xml setiap kali
   dijalankan. Tambalan yang ditulis tangan sekali akan hilang diam-diam pada
   pembangkitan berikutnya, dan tidak ada yang bersuara. Karena itu ia
   dijadikan langkah yang selalu ikut — lihat skrip "ikon" di package.json.

   Menjalankan:  node perbaiki-adaptif.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RES = path.resolve(__dirname, 'android', 'app', 'src', 'main', 'res');
const SUMBER = path.resolve(__dirname, '..', 'app', 'assets', 'icon-512.png');

function henti(p) { console.error('BERHENTI — ' + p); process.exit(1); }

async function jalan() {
  if (!fs.existsSync(RES)) henti('proyek Android belum ada: jalankan `npx cap add android` dulu');

  /* Warna diambil dari gambarnya sendiri, sama seperti di buat-ikon.js —
     bukan disalin sebagai angka yang bisa berbeda tanpa ada yang tahu. */
  const sudut = await sharp(SUMBER).extract({ left: 2, top: 2, width: 4, height: 4 })
    .raw().toBuffer();
  const hex = '#' + [sudut[0], sudut[1], sudut[2]]
    .map(function (v) { return v.toString(16).padStart(2, '0').toUpperCase(); }).join('');

  /* 1. warna latar */
  const berkasWarna = path.join(RES, 'values', 'ic_launcher_background.xml');
  fs.writeFileSync(berkasWarna, [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Diambil dari piksel sudut app/assets/icon-512.png oleh',
    '     perbaiki-adaptif.js. Jangan disunting tangan: ia ditulis ulang. -->',
    '<resources>',
    '    <color name="ic_launcher_background">' + hex + '</color>',
    '</resources>',
    ''
  ].join('\n'));

  /* 2. ic_launcher.xml dan ic_launcher_round.xml */
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Ditulis ulang oleh perbaiki-adaptif.js setiap kali ikon dibangkitkan.',
    '',
    '     Lapisan BELAKANG memakai warna padat, bukan bitmap ber-inset: warna',
    '     memenuhi seluruh kanvas 108dp dan tidak punya tepi yang bisa bocor',
    '     ketika peluncur memperbesar ikonnya.',
    '',
    '     Lapisan DEPAN tetap diberi inset 16,7% — itulah yang membuat isi',
    '     berkasnya jatuh persis di area topeng 72dp. -->',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    '    <background android:drawable="@color/ic_launcher_background" />',
    '    <foreground>',
    '        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />',
    '    </foreground>',
    /* TIDAK ada <monochrome>. Ikon bertema Android 13+ hanya membaca kanal
       alfa lapisan depan, sedangkan potongan lambang ini membawa serta nila
       aslinya dan sepenuhnya pejal — ia akan tampil sebagai persegi penuh
       tanpa bentuk apa pun. Tanpa <monochrome>, Android memakai ikon biasa,
       dan itu jauh lebih baik daripada ikon bertema yang salah. */
    '</adaptive-icon>',
    ''
  ].join('\n');

  const dir = path.join(RES, 'mipmap-anydpi-v26');
  if (!fs.existsSync(dir)) henti('mipmap-anydpi-v26 tidak ada: jalankan `npx @capacitor/assets generate --android` dulu');
  let n = 0;
  for (const nama of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const p = path.join(dir, nama);
    if (!fs.existsSync(p)) continue;
    fs.writeFileSync(p, xml);
    n++;
  }
  if (!n) henti('tidak ada ic_launcher.xml untuk dibetulkan');

  console.log('ikon adaptif dibetulkan:');
  console.log('  latar   : warna padat ' + hex + ' (memenuhi kanvas)');
  console.log('  depan   : lambang, inset 16,7%');
  console.log('  berkas  : ' + n + ' xml + ic_launcher_background.xml');
}

jalan().catch(function (e) { henti(e.message); });
