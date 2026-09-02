/* ==========================================================================
   audit-i18n.js — melacak teks antarmuka yang belum diterjemahkan
   --------------------------------------------------------------------------
   Menjalankan:  node app/tools/audit-i18n.js [--rinci|--json] [berkas...]

   Mencari dua jenis masalah yang berbeda:

     A. TIDAK DIBUNGKUS — teks Indonesia yang ditulis langsung ke layar tanpa
        melewati I18N.t()/T(). Ini tidak akan pernah berubah bahasanya, apa pun
        yang dipilih pengguna.

     B. DIBUNGKUS TAPI HILANG — teks yang sudah dibungkus T(), tetapi kuncinya
        tidak ada di kamus Inggris. Ini tampil apa adanya dalam Bahasa
        Indonesia, dan diam-diam terlihat "sudah beres" karena kodenya benar.

   YANG SENGAJA TIDAK DIHITUNG
   ---------------------------
   Isi bisnis tetap Bahasa Indonesia menurut rancangan aplikasi (lihat kepala
   i18n.js): nama layanan, nama produk, isi dokumen, dan pesan WhatsApp adalah
   DATA yang dikirim ke klien di Indonesia, bukan antarmuka. Karena itu
   js/seed.js, js/wa.js, js/katalog.js, dan js/kurikulum*.js dilewati.

   Pemindai ini memakai heuristik, bukan pemahaman bahasa. Ia bisa menandai
   yang sebenarnya aman dan melewatkan yang seharusnya kena — hasilnya daftar
   periksa untuk manusia, bukan vonis.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const AKAR = path.resolve(__dirname, '..');
const JS = path.join(AKAR, 'js');

/* Berkas yang isinya DATA, bukan antarmuka. */
const LEWATI = [
  'seed.js', 'katalog.js', 'kurikulum.js', 'kurikulum-fungsi.js',
  'i18n.js', 'lang',
  /* Nama provinsi dan kabupaten. Nama tempat tidak diterjemahkan — "Kulon
     Progo" tetap Kulon Progo dalam bahasa apa pun — dan sebagian di antaranya
     dipakai sebagai KUNCI pencarian ('ID|DI Yogyakarta'), sehingga
     menerjemahkannya membuat daftar kotanya kosong. */
  'wilayah.js'
];

/* CATATAN: 'wa.js' dan 'email.js' PERNAH ada di daftar ini.

   Alasannya waktu itu: pesan WhatsApp dan badan surel dikirim kepada klien
   di Indonesia, jadi ia data, bukan antarmuka. Alasan itu sudah tidak
   berlaku sejak pengguna bisa memilih bahasanya sendiri — dan yang
   dikecualikan dari audit tidak pernah ketahuan salahnya. Yang ketahuan
   setelah keduanya dimasukkan kembali:

     · email.js SETENGAH dibungkus I18N.t(): sebagian label mengikuti bahasa
       layar PENGIRIM sementara sebagian lain tidak diterjemahkan sama
       sekali, sehingga satu tabel bisa memuat “SUBTOTAL PRODUCT PRICE”
       tepat di atas “Diskon”.
     · WA.LABEL — nama jenis pesan pada daftar Outbox — dipakai apa adanya
       di dua layar, sehingga admin berbahasa Inggris membaca daftar
       berbahasa Indonesia.

   Keduanya kini memakai I18N.pesanUntuk(penerima): bahasa ditentukan oleh
   yang MEMBACA, bukan oleh yang menekan tombol kirim. Jangan kembalikan
   keduanya ke daftar di atas. */

/* Kata Indonesia yang paling sering muncul di teks antarmuka. Dipakai sebagai
   penanda bahasa — bukan daftar lengkap, hanya cukup untuk membedakan kalimat
   Indonesia dari nama kelas CSS dan potongan HTML. */
const PENANDA = new RegExp('\\b(' + [
  'yang', 'dan', 'atau', 'tidak', 'belum', 'sudah', 'akan', 'bisa', 'dapat',
  'untuk', 'dari', 'ke', 'di', 'pada', 'dengan', 'oleh', 'bila', 'kalau',
  'ini', 'itu', 'anda', 'saya', 'kami', 'mereka',
  'silakan', 'mohon', 'harap', 'wajib', 'hanya', 'setiap', 'semua', 'seluruh',
  'tambah', 'tambahkan', 'simpan', 'hapus', 'ubah', 'batal', 'batalkan',
  'pilih', 'cari', 'buka', 'tutup', 'kirim', 'lihat', 'unduh', 'muat',
  'pesan', 'pesanan', 'pekerjaan', 'petugas', 'mitra', 'klien', 'pelanggan',
  'tagihan', 'pembayaran', 'penawaran', 'laporan', 'jadwal', 'alamat',
  'nama', 'nomor', 'tanggal', 'jumlah', 'harga', 'total', 'status',
  'berhasil', 'gagal', 'selesai', 'kosong', 'lengkap', 'kurang',
  'produk', 'barang', 'stok', 'toko', 'saldo', 'dompet', 'poin', 'voucher'
].join('|') + ')\\b', 'i');

/**
 * Sisakan hanya bagian yang benar-benar dibaca manusia.
 *
 * Potongan HTML seperti '<div class="poin-hero">' memuat kata "poin" dan lolos
 * penanda bahasa, padahal tidak ada satu pun kata di situ yang muncul di layar.
 * Tag, atribut, dan nama kelas dibuang lebih dulu; yang tersisa barulah teks.
 */
function teksTampak(s) {
  return s
    .replace(/<[^>]*>?/g, ' ')        /* tag utuh maupun potongannya */
    .replace(/^[^<]*"\s*$/, function (m) { return /="/.test(s) ? ' ' : m; })
    .replace(/\b[a-z-]+="[^"]*"?/gi, ' ')   /* sisa atribut */
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nilai yang jelas bukan kalimat untuk dibaca manusia.
 *
 * Tiap aturan di sini dibayar dengan risiko: yang terlalu longgar akan
 * menyembunyikan teks yang sungguh perlu diterjemahkan, dan itu kerusakan
 * yang tidak terlihat sampai ada yang membuka aplikasinya dalam bahasa
 * Inggris. Karena itu semuanya BERJANGKAR di kedua ujung (^ dan $) dan
 * menuntut bentuk yang tidak mungkin dimiliki kalimat.
 */
function bukanTeksLayar(s) {
  if (s.length < 3) return true;
  if (!/[a-z]/i.test(s)) return true;
  if (/^[a-z0-9_-]+$/i.test(s) && s.indexOf(' ') < 0) return true;  /* kunci, id, kelas */

  /* PENGENAL BERTITIK — 'crm.lihat', 'sistem.poin', 'marketplace.toko'.
     Ini kode izin: ia dibandingkan dengan isi tabel hak akses, dan
     menerjemahkannya akan mematikan seluruh pemeriksaan izin tanpa satu
     pun galat. Delapan puluh tujuh dari 178 laporan kategori A adalah ini.
     Menuntut huruf kecil dan tanpa spasi: kalimat tidak pernah berbentuk
     begitu. */
  if (/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/.test(s)) return true;

  /* PATH BERKAS — 'mitra.html', 'assets/icon-mitra-192.png'. */
  if (/^[a-z0-9_\-./]+\.(html?|js|css|png|jpe?g|svg|webp|ico|json|txt|pdf)$/i.test(s)) return true;

  /* SELEKTOR DOM — '[name=selesai]', '[data-foto-hapus]'. */
  if (/^\[[a-z-]+([=~^$*|]?=[^\]]*)?\]$/i.test(s)) return true;

  /* PLACEHOLDER TUNGGAL — '{nama}', '{dari}'. Ia disisipkan ke dalam
     kalimat yang SUDAH diterjemahkan; membungkusnya sendiri tidak
     menerjemahkan apa pun. */
  if (/^\{[a-z_][a-z0-9_]*\}$/i.test(s)) return true;

  /* POTONGAN URL — '&klien=', '?ref='. */
  if (/^[&?][a-z0-9_]+=$/i.test(s)) return true;

  /* POLA REGEX — moderasi.js menyimpan pola bahasa Indonesia untuk
     MENDETEKSI ancaman dan pertukaran nomor. Ia memang harus berbahasa
     Indonesia: menerjemahkannya membuat penyaringnya berhenti mengenali
     kalimat yang sedang dicarinya. Dikenali dari lolosnya escape regex
     yang tidak pernah muncul di kalimat biasa. */
  if (/\\[bsdwSDW]|\\s\?|\(\?:/.test(s)) return true;
  if (/^(https?:|mailto:|tel:|data:|blob:|#|\.|\/)/i.test(s)) return true;
  if (/^[<>&/{}[\]().,;:+*%$-]+$/.test(s)) return true;
  if (/^(px|em|rem|%|auto|none|flex|grid|block|inline|center|left|right|top|bottom)$/i.test(s)) return true;
  if (/^[A-Z_]+$/.test(s)) return true;                              /* KONSTANTA */
  if (/^\d/.test(s) && !/[a-z]{3}/i.test(s)) return true;
  return false;
}

/**
 * Baca seluruh string literal beserta posisinya.
 * Penguraiannya sadar konteks: tanda kutip di dalam komentar atau di dalam
 * string lain tidak dianggap pembuka string baru — tanpa itu, satu apostrof
 * pada komentar berbahasa Indonesia akan menggeser seluruh sisa berkas.
 */
function bacaLiteral(src) {
  const out = [];
  let i = 0, baris = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { baris++; i++; continue; }
    /* komentar */
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') baris++; i++; }
      i += 2;
      continue;
    }
    /* string */
    if (c === '"' || c === "'" || c === '`') {
      const kutip = c, mulai = i, barisMulai = baris;
      i++;
      let isi = '';
      while (i < n) {
        if (src[i] === '\\') { isi += src[i + 1] === 'n' ? ' ' : src[i + 1]; i += 2; continue; }
        if (src[i] === kutip) break;
        if (src[i] === '\n') { baris++; if (kutip !== '`') break; }
        isi += src[i]; i++;
      }
      i++;
      out.push({ isi: isi, baris: barisMulai, mulai: mulai, akhir: i });
      continue;
    }
    i++;
  }
  return out;
}

/**
 * Kumpulkan setiap panggilan T( … ) / I18N.t( … ) beserta KUNCI sebenarnya.
 *
 * Kalimat panjang di berkas ini ditulis sebagai sambungan beberapa literal:
 *
 *     T('Obrolan terbuka otomatis begitu ada pekerjaan ' +
 *       'yang melibatkan Anda.')
 *
 * Yang sampai ke kamus adalah HASIL sambungannya — satu teks utuh. Memeriksa
 * tiap potongan sendiri-sendiri memberi jawaban yang salah dua kali: potongan
 * pertama dilaporkan hilang dari kamus padahal kuncinya bukan itu, dan
 * potongan berikutnya dilaporkan tidak dibungkus padahal jelas dibungkus.
 * Terjemahan yang dibuat dari laporan seperti itu tidak akan pernah terpakai.
 *
 * Mengembalikan { kunci, dipakai }: daftar kunci yang benar-benar dicari di
 * kamus, dan posisi setiap literal yang sudah termakan sebuah pembungkus.
 */
function panggilanT(src, literal) {
  const perPosisi = {};
  literal.forEach(function (l) { perPosisi[l.mulai] = l; });

  const kunci = [];
  const dipakai = new Set();
  /* `w` adalah penerjemah TERIKAT PENERIMA yang dikembalikan
     I18N.pesanUntuk() — dipakai menyusun pesan WhatsApp dan surel, yang
     bahasanya harus mengikuti PENERIMA, bukan pengirim. Ia pembungkus yang
     sah, dan kuncinya dicari di kamus yang sama dengan T(). */
  const buka = /(^|[^A-Za-z0-9_$.])(?:T|Tt|w|I18N\.t|I18N\.untuk)\s*\(/g;
  let m;

  while ((m = buka.exec(src))) {
    let i = buka.lastIndex;
    const potong = [];
    let baris = null;

    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      const l = perPosisi[i];
      if (!l) break;
      if (baris === null) baris = l.baris;
      potong.push(l);
      i = l.akhir;
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] !== '+') break;
      i = j + 1;
    }
    if (!potong.length) continue;

    while (i < src.length && /\s/.test(src[i])) i++;
    /* Argumennya murni literal hanya bila di sini berhenti. Bila masih ada
       lanjutan — sebuah variabel, misalnya — kuncinya disusun saat berjalan
       dan tidak mungkin ada di kamus mana pun; potongannya tetap ditandai
       terpakai supaya tidak salah dilaporkan sebagai teks telanjang. */
    const murni = src[i] === ')' || src[i] === ',';
    potong.forEach(function (l) { dipakai.add(l.mulai); });
    if (murni) {
      kunci.push({
        teks: potong.map(function (l) { return l.isi; }).join(''),
        baris: baris
      });
    }
  }
  return { kunci: kunci, dipakai: dipakai };
}

/**
 * Rentang yang sengaja dikecualikan lewat penanda di dalam kodenya.
 *
 *     /* i18n:data *\/  … isi berbahasa Indonesia …  /* i18n:/data *\/
 *
 * Dipakai untuk ISI, bukan antarmuka: badan pesan template obrolan, teks
 * WhatsApp, daftar kata yang dicocokkan penyaring. Semuanya dikirim kepada
 * atau dibaca dari orang Indonesia — menerjemahkannya justru merusak.
 *
 * Penandanya ditaruh di berkasnya sendiri, bukan di daftar di sini, supaya
 * alasannya terbaca di tempat keputusan itu dibuat. Daftar pengecualian yang
 * jauh dari kodenya selalu berakhir usang tanpa ada yang menyadarinya.
 */
/* Panggilan yang argumennya CATATAN atau PESAN, bukan teks layar.

   `DB.log(userId, 'Check-in di ' + o.no, ...)` menuliskan baris riwayat
   aktivitas; `WA.chat(...)` dan `kabari(...)` menyusun pesan WhatsApp untuk
   orang di Indonesia. Keduanya sudah dinyatakan tetap Bahasa Indonesia oleh
   rancangan aplikasi — tetapi selama ini hanya dikenali per BERKAS (wa.js),
   bukan per panggilan, sehingga pesan yang ditulis di berkas lain tetap
   dilaporkan sebagai antarmuka yang lupa diterjemahkan. Laporan yang memuat
   ratusan hal yang memang tidak akan pernah dikerjakan adalah laporan yang
   berhenti dibaca orang. */
/* `new Error(...)` ikut dikecualikan: pesan lemparan tidak pernah sampai
   ke pengguna. Ia muncul di konsol ketika sebuah pemanggil salah memakai
   API — pembacanya orang yang sedang memperbaiki kode, dan menerjemahkannya
   justru menyulitkan penelusuran, karena pesan yang dicari di berkas sumber
   tidak lagi sama dengan yang tampil di konsol. */
const PANGGILAN_DATA =
  /(?:^|[^A-Za-z0-9_$.])(?:DB\.log|WA\.[a-zA-Z]+|kabari|catat|antreWA|kirimWA|new Error)$/;

/**
 * Nama panggilan yang paling dalam menyelubungi sebuah posisi.
 *
 * Ditelusuri MUNDUR sambil menghitung kurung, bukan dengan melihat beberapa
 * baris ke atas. Cara yang kedua sempat saya pakai dan langsung salah: satu
 * objek antarmuka di views/profil.js tertandai data hanya karena ada
 * pemanggilan NOTIF beberapa baris di atasnya — dan teks yang salah
 * dikecualikan tidak akan pernah diterjemahkan siapa pun, tanpa satu pun
 * tanda bahwa ia hilang.
 */
function panggilanSekitar(src, pos) {
  let d = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const c = src[i];
    if (c === ')' || c === ']' || c === '}') { d++; continue; }
    if (c === '[' || c === '{') { if (d) { d--; continue; } return null; }
    if (c === '(') {
      if (d) { d--; continue; }
      return src.slice(Math.max(0, i - 40), i);
    }
    if (c === ';') return null;
  }
  return null;
}

function dalamPanggilanData(src, pos) {
  const depan = panggilanSekitar(src, pos);
  return depan !== null && PANGGILAN_DATA.test(depan);
}

function rentangData(src) {
  const out = [];
  const buka = /\/\*\s*i18n:data\s*\*\//g;
  const tutup = '/* i18n:/data */';
  let m;
  while ((m = buka.exec(src))) {
    const akhir = src.indexOf(tutup, m.index);
    out.push([m.index, akhir < 0 ? src.length : akhir + tutup.length]);
  }
  return out;
}

function diRentang(rentang, pos) {
  return rentang.some(function (r) { return pos >= r[0] && pos < r[1]; });
}

function berkasJs(dir) {
  let hasil = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (LEWATI.indexOf(e.name) >= 0) return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hasil = hasil.concat(berkasJs(p));
    else if (e.name.endsWith('.js')) hasil.push(p);
  });
  return hasil;
}

/**
 * Posisi literal yang menjadi BAGIAN dari sebuah rantai sambungan yang
 * hasil gabungannya sudah ada di kamus.
 *
 * Keterangan izin di akses.js ditulis begini:
 *
 *     k: 'Membuka percakapan milik orang lain untuk penyelesaian sengketa. ' +
 *        'Hanya membaca, tidak bisa membalas, dan setiap pembacaan tercatat.'
 *
 * Yang dicari di kamus saat digambar — lewat I18N.t(x.k) — adalah GABUNGAN
 * keduanya, dan gabungan itu memang sudah diterjemahkan. Memeriksa tiap
 * potongan sendiri-sendiri melaporkan dua teks "tidak akan pernah berbahasa
 * Inggris" untuk sesuatu yang di layar sudah berbahasa Inggris.
 *
 * Delapan belas laporan seperti itu bertahan sampai layarnya dibuka dan
 * ternyata sudah benar. Laporan yang salah menuduh sama merusaknya dengan
 * laporan yang melewatkan: keduanya membuat angkanya berhenti berarti.
 */
function rantaiTerkamus(src, literal, kamus) {
  const perPosisi = {};
  literal.forEach(function (l) { perPosisi[l.mulai] = l; });
  const tertutup = new Set();
  const sudah = new Set();

  literal.forEach(function (awal) {
    if (sudah.has(awal.mulai)) return;
    /* Hanya awal rantai: yang di depannya bukan '+' menyusul literal lain. */
    let p = awal.mulai - 1;
    while (p >= 0 && /\s/.test(src[p])) p--;
    if (src[p] === '+') return;

    const potong = [awal];
    let i = awal.akhir;
    for (;;) {
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] !== '+') break;
      j++;
      while (j < src.length && /\s/.test(src[j])) j++;
      const l = perPosisi[j];
      if (!l) break;
      potong.push(l);
      i = l.akhir;
    }
    if (potong.length < 2) return;
    potong.forEach(function (l) { sudah.add(l.mulai); });
    const gabung = potong.map(function (l) { return l.isi; }).join('');
    if (kamus.has(gabung) || kamus.has(gabung.trim())) {
      potong.forEach(function (l) { tertutup.add(l.mulai); });
    }
  });
  return tertutup;
}

function main() {
  const rinci = process.argv.indexOf('--rinci') >= 0;

  /* --json memuntahkan hasilnya apa adanya. --rinci memotong teks di 90 huruf
     supaya daftarnya terbaca manusia; potongan itu merusak alat lain yang
     memakai teks tersebut sebagai KUNCI kamus — kunci yang terpenggal tidak
     akan pernah cocok, dan terjemahannya diam-diam tidak terpakai. */
  const json = process.argv.indexOf('--json') >= 0;

  const argFile = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; });

  /* Kamus Inggris. Isinya tersebar di dua berkas — i18n.js dan lang/en-extra.js
     yang digabungkan ke EN saat muat. Membaca satu saja membuat pemindai ini
     melaporkan ribuan teks "hilang" yang sebenarnya sudah diterjemahkan. */
  const kamus = new Set();
  [path.join(JS, 'i18n.js'), path.join(JS, 'lang', 'en-extra.js')].forEach(function (p) {
    bacaLiteral(fs.readFileSync(p, 'utf8')).forEach(function (l) { kamus.add(l.isi); });
  });

  const files = argFile.length
    ? argFile.map(function (f) { return path.resolve(f); })
    : berkasJs(JS);

  const takBungkus = [];
  let adaPadanan = 0;
  const bungkusHilang = [];

  files.forEach(function (f) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(AKAR, f).replace(/\\/g, '/');
    const dikecualikan = rentangData(src);
    const literal = bacaLiteral(src);
    const bungkus = panggilanT(src, literal);
    const rantai = rantaiTerkamus(src, literal, kamus);

    /* B — sudah dibungkus, kuncinya utuh, tetapi tidak ada padanan Inggrisnya. */
    bungkus.kunci.forEach(function (k) {
      if (!kamus.has(k.teks)) bungkusHilang.push({ file: rel, baris: k.baris, teks: k.teks });
    });

    /* A — teks yang sama sekali tidak lewat pembungkus.
       Kecuali bila teksnya ADA di kamus. Pola yang paling sering dipakai di
       aplikasi ini menaruh teks sebagai data lalu menerjemahkannya di tempat
       ia digambar — T(g.grup), T(it.label), T(r.jenis). Pembungkusnya
       memegang variabel, jadi tidak ada cara melihatnya dari literalnya
       sendiri; yang bisa dilihat hanyalah bahwa padanan Inggrisnya ada.
       Melaporkannya sebagai "tidak akan pernah berbahasa Inggris" keliru,
       dan ribuan laporan keliru membuat laporan yang benar ikut diabaikan. */
    literal.forEach(function (l) {
      if (bungkus.dipakai.has(l.mulai)) return;
      if (diRentang(dikecualikan, l.mulai)) return;
      if (dalamPanggilanData(src, l.mulai)) return;
      const s = l.isi.trim();
      if (kamus.has(s) || kamus.has(l.isi)) { adaPadanan++; return; }
      if (rantai.has(l.mulai)) { adaPadanan++; return; }
      /* Penanda bahasa diuji pada TEKS TAMPAKNYA saja, bukan pada seluruh
         literal — kalau tidak, nama kelas CSS yang kebetulan berbahasa
         Indonesia membuat setiap potongan HTML ikut terhitung. */
      const tampak = teksTampak(s);
      if (bukanTeksLayar(tampak)) return;
      if (!PENANDA.test(tampak)) return;
      if (tampak.split(/\s+/).length < 2 && tampak.length < 6) return;
      takBungkus.push({ file: rel, baris: l.baris, teks: s });
    });
  });

  function perFile(arr) {
    const m = {};
    arr.forEach(function (x) { m[x.file] = (m[x.file] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; })
      .map(function (k) { return { file: k, n: m[k] }; });
  }

  if (json) {
    console.log(JSON.stringify({ takBungkus: takBungkus, bungkusHilang: bungkusHilang }, null, 1));
    return;
  }

  console.log('=== A. TIDAK DIBUNGKUS T() — tidak akan pernah berbahasa Inggris ===');
  console.log('(' + adaPadanan + ' teks lain dilewati: tidak dibungkus di tempatnya, ' +
    'tetapi\npadanan Inggrisnya ada — pola T(variabel) yang diterjemahkan saat digambar)');
  console.log('total: ' + takBungkus.length + ' teks di ' + perFile(takBungkus).length + ' berkas\n');
  perFile(takBungkus).forEach(function (x) {
    console.log(String(x.n).padStart(5) + '  ' + x.file);
  });

  console.log('\n=== B. DIBUNGKUS TAPI TIDAK ADA DI KAMUS — tampil Bahasa Indonesia ===');
  console.log('total: ' + bungkusHilang.length + ' teks\n');
  perFile(bungkusHilang).forEach(function (x) {
    console.log(String(x.n).padStart(5) + '  ' + x.file);
  });

  if (rinci) {
    console.log('\n--- rincian A ---');
    takBungkus.forEach(function (x) {
      console.log(x.file + ':' + x.baris + '  ' + JSON.stringify(x.teks.slice(0, 90)));
    });
    console.log('\n--- rincian B ---');
    bungkusHilang.forEach(function (x) {
      console.log(x.file + ':' + x.baris + '  ' + JSON.stringify(x.teks.slice(0, 90)));
    });
  }

  console.log('\nJalankan dengan --rinci untuk melihat teksnya satu per satu,' +
    '\natau --json untuk hasil utuh yang tidak dipotong.');
}

/* Dipanggil sebagai alat baris perintah, bukan saat diimpor — supaya
   perkakas lain bisa memakai penguraiannya tanpa ikut mencetak laporan. */
if (require.main === module) main();

/* Penyaringnya ikut dibuka, bukan hanya penguraiannya.
   Kalau perkakas lain menulis penyaringnya sendiri, akan ada DUA definisi
   tentang "teks yang harus diterjemahkan" — dan yang kedua pasti berbeda.
   Percobaan pertama membungkus otomatis memakai penyaring sendiri, dan ia
   melaporkan 11.513 teks: kamusnya sendiri, nama wilayah, dan pesan WhatsApp
   yang justru sengaja tetap Bahasa Indonesia semuanya ikut terjaring. */
module.exports = {
  bacaLiteral: bacaLiteral, panggilanT: panggilanT, rentangData: rentangData,
  dalamPanggilanData: dalamPanggilanData,
  teksTampak: teksTampak, bukanTeksLayar: bukanTeksLayar,
  LEWATI: LEWATI, PENANDA: PENANDA
};
