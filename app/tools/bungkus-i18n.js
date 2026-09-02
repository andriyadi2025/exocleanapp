/* ==========================================================================
   bungkus-i18n.js — membungkus teks Indonesia dengan T()
   --------------------------------------------------------------------------
   Alat pendamping audit-i18n.js. Yang diaudit di sana adalah teks kategori A:
   teks yang muncul di layar tetapi tidak pernah lewat pembungkus terjemahan,
   sehingga selamanya berbahasa Indonesia betapapun bahasa dipindah.

   SATU DEFINISI, BUKAN DUA

   Penyaringnya DIPINJAM dari audit-i18n.js, tidak ditulis ulang. Percobaan
   pertama memakai penyaring sendiri dan melaporkan 11.513 teks — kamusnya
   sendiri, lima ratus nama wilayah, dan seluruh naskah pesan WhatsApp ikut
   terjaring, padahal ketiganya sengaja tetap Bahasa Indonesia karena dikirim
   kepada orang Indonesia. Dua definisi tentang "teks yang harus
   diterjemahkan" selalu berakhir berbeda, dan yang kedua akan merusak.

   YANG DIBUNGKUS OTOMATIS, DAN YANG TIDAK

   Dibungkus hanya literal yang BERDIRI SENDIRI: satu untai utuh yang bukan
   potongan HTML dan tidak sedang disambung dengan untai lain. Contohnya

       UI.toast('Pesanan berhasil disimpan.', 'ok')
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ dibungkus

   Yang TIDAK disentuh:

     · potongan bermarkah — '">Lihat</button>' bukan kalimat, ia separuh tag.
       Membungkusnya memasukkan markah ke dalam kunci kamus, dan penerjemah
       berikutnya akan mengubah nama kelas CSS tanpa tahu.

     · untai yang disambung + dengan untai lain. Kalimat panjang ditulis
       terpotong-potong; membungkus tiap potongnya menghasilkan enam kunci
       kamus yang tidak satu pun berupa kalimat. Yang benar adalah membungkus
       seluruh rangkaiannya sekaligus — dan menentukan batas rangkaian itu
       menuntut penilaian manusia, karena sebagian sambungan memuat variabel
       di tengahnya.

   Keduanya BUKAN pekerjaan yang bisa ditebak mesin, dan alat ini mengatakan
   berapa banyak yang tersisa daripada menebak dan merusak.

   Jalankan:
     node app/tools/bungkus-i18n.js                    -- hitung saja
     node app/tools/bungkus-i18n.js --tulis js/x.js    -- bungkus satu berkas
     node app/tools/bungkus-i18n.js --kamus            -- teks yang perlu
                                                          terjemahan (JSON)
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./audit-i18n.js');

const AKAR = path.resolve(__dirname, '..');
const JS = path.join(AKAR, 'js');

function berkasJs(dir) {
  let hasil = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (A.LEWATI.indexOf(e.name) >= 0) return;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hasil = hasil.concat(berkasJs(p));
    else if (e.name.endsWith('.js')) hasil.push(p);
  });
  return hasil;
}

function kamusKini() {
  const k = new Set();
  [path.join(JS, 'i18n.js'), path.join(JS, 'lang', 'en-extra.js')].forEach(function (p) {
    A.bacaLiteral(fs.readFileSync(p, 'utf8')).forEach(function (l) { k.add(l.isi); });
  });
  return k;
}

function diRentang(rentang, pos) {
  return rentang.some(function (r) { return pos >= r[0] && pos < r[1]; });
}

/* Apakah literal ini bagian dari sambungan + dengan literal lain. */
function bersambung(src, l, perPosisi) {
  /* di belakangnya */
  let j = l.akhir;
  while (j < src.length && /\s/.test(src[j])) j++;
  if (src[j] === '+') {
    let m = j + 1;
    while (m < src.length && /\s/.test(src[m])) m++;
    if (perPosisi[m]) return true;
  }
  /* di depannya */
  let i = l.mulai - 1;
  while (i >= 0 && /\s/.test(src[i])) i--;
  if (src[i] === '+') return true;
  return false;
}

/* Kutip pembuka literal, supaya pembungkusnya menulis ulang persis. */
function petik(src, l) { return src.slice(l.mulai, l.akhir); }

/**
 * Berapa badan fungsi yang menyelubungi tiap posisi.
 *
 * KENAPA INI PENTING, DAN BAGAIMANA KETAHUANNYA
 *
 * Berpindah bahasa di aplikasi ini TIDAK memuat ulang halaman — ia memanggil
 * I18N.set lalu APP.refresh(). Artinya teks yang diterjemahkan pada saat modul
 * DIEVALUASI membeku pada bahasa yang berlaku ketika aplikasi dibuka, dan
 * tidak pernah ikut berubah sesudahnya. Yang diterjemahkan di dalam fungsi
 * aman, karena fungsinya dijalankan ulang tiap kali layar digambar.
 *
 * Seluruh berkas di sini berbentuk IIFE — semuanya berada di dalam satu badan
 * fungsi. Karena itu syaratnya DUA: satu untuk IIFE-nya, satu lagi untuk
 * fungsi sungguhan di dalamnya.
 *
 * Percobaan pertama mengabaikan hal ini dan membungkus 1.052 teks sekaligus.
 * Yang di tingkat atas memanggil T( sebelum pintasan T terdefinisi, dan
 * seluruh modulnya gagal terdefinisi: APP, BIZ, dan AKSES lenyap, aplikasinya
 * mati. node --check meloloskan semuanya — sintaksnya memang sah.
 */
function kedalamanFungsi(src) {
  const dalam = new Int8Array(src.length);
  const tumpuk = [];
  let jml = 0, menanti = false;
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    /* komentar */
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { dalam[i] = jml; i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { dalam[i] = jml; i++; }
      dalam[i] = jml; dalam[i + 1] = jml; i += 2;
      continue;
    }
    /* untai — isinya dilewati, tetapi kedalamannya tetap dicatat */
    if (c === '"' || c === "'" || c === '`') {
      const kutip = c;
      dalam[i] = jml; i++;
      while (i < n) {
        dalam[i] = jml;
        if (src[i] === '\\') { dalam[i + 1] = jml; i += 2; continue; }
        if (src[i] === kutip) { i++; break; }
        if (src[i] === '\n' && kutip !== '`') { i++; break; }
        i++;
      }
      continue;
    }
    /* kata kunci function */
    if (c === 'f' && src.substr(i, 8) === 'function' &&
        !/[A-Za-z0-9_$]/.test(src[i - 1] || '') &&
        !/[A-Za-z0-9_$]/.test(src[i + 8] || '')) {
      menanti = true;
      for (let k = 0; k < 8; k++) { dalam[i + k] = jml; }
      i += 8;
      continue;
    }
    if (c === '{') {
      dalam[i] = jml;
      tumpuk.push(menanti);
      if (menanti) { jml++; menanti = false; }
      i++;
      continue;
    }
    if (c === '}') {
      const adalahFungsi = tumpuk.pop();
      if (adalahFungsi) jml--;
      dalam[i] = jml;
      i++;
      continue;
    }
    dalam[i] = jml;
    i++;
  }
  return dalam;
}

/* Daftar putih: bila diisi, HANYA teks di dalamnya yang dibungkus.
   Diperlukan karena urutannya begini — terjemahannya dimasukkan ke kamus
   LEBIH DULU, supaya tidak ada teks yang sempat dibungkus tanpa padanan
   Inggris (itu kategori B, yang harus tetap nol). Tetapi begitu masuk kamus,
   pemeriksa di bawah menganggapnya sudah beres, karena "ada di kamus" adalah
   penanda pola T(variabel) yang sah. Daftar putih memutus lingkaran itu. */
var putih = null;

/* MODE BERANI — dinyalakan dengan --berani.

   Dua penolakan di bawah dibuat sengaja terlalu berhati-hati pada mulanya,
   dan keduanya menahan ratusan kalimat yang sebenarnya aman:

     · SPASI TEPI. 'Anda masih bisa menunggu. ' ditolak karena spasinya
       bermakna bagi tata letak. Benar — tetapi spasinya bisa ditinggal DI
       LUAR pembungkus: ' ' tetap untai biasa, T() hanya membungkus intinya.
       Kuncinya pun jadi sama dengan kunci yang sama di tempat lain yang
       kebetulan tidak berspasi.

     · BERSAMBUNG. Kalimat panjang ditulis sebagai beberapa untai yang
       disambung +. Membungkus salah satu potongannya tidak merusak apa pun;
       yang terjadi hanyalah kuncinya menjadi sepotong kalimat. Itu memang
       bukan terjemahan yang indah, tetapi aplikasi ini sudah berisi 4.400
       kunci sepotong dan semuanya bekerja. Sepotong yang diterjemahkan
       lebih berguna daripada sepotong yang tidak pernah berubah bahasa.

   Yang TIDAK dilonggarkan: potongan yang berakhir pada kurung buka atau
   tanda kutip, pengenal, jalur berkas, pola regex, daftar kelas CSS, untai
   templat, escape selain kutip, dan syarat harus berada di dalam fungsi.

   Tiap penggantian tetap DIBUKTIKAN: hasilnya dijalankan dengan pembungkus
   tanpa-ubah dan dibandingkan huruf demi huruf dengan untai aslinya. */
let berani = false;

/* MODE KAMUS — dinyalakan dengan --kamus.

   TITIK BUTA YANG PALING MAHAL, dan yang paling lama tidak terlihat.

   Pemeriksa di bawah melewati untai yang teksnya SUDAH ADA di kamus
   Inggris, dengan anggapan ia diterjemahkan lewat pola T(variabel) saat
   digambar. Untuk sebagian besar memang begitu. Tetapi tidak semuanya:

       UI.card({ title: 'Jadwal hari ini', ... })

   'Jadwal hari ini' punya terjemahan sejak lama, tidak pernah dibungkus,
   dan tidak pernah dilaporkan — karena laporannya menganggap adanya
   terjemahan sebagai bukti bahwa ia terpakai. Ketahuannya bukan dari
   laporan mana pun, melainkan dari MEMBACA LAYARNYA: halaman admin
   berbahasa Inggris masih menampilkan "Jadwal hari ini", "Stok menipis",
   "Peran akses", dan "Matriks Izin".

   Membungkusnya adalah pembungkusan yang paling aman yang ada: kuncinya
   sudah ada di kamus, jadi tidak ada kunci baru, tidak ada kategori B
   baru, dan tidak ada terjemahan yang perlu dikarang. */
let modeKamus = false;

/* Untai yang berdiri sebagai NILAI dari sebuah nama yang jelas-jelas judul.

   Penyaring bahasa menolak kata tunggal, dan itu benar: 'aktif', 'selesai',
   dan 'baru' jauh lebih sering menjadi KODE STATUS yang dibandingkan
   daripada teks layar. Membungkus `x.status === 'selesai'` tidak
   menghasilkan galat apa pun — ia hanya membuat perbandingannya gagal saat
   bahasa Inggris dipilih, dan seluruh penyaringan status berhenti bekerja
   tanpa satu pun tanda.

   Tetapi judul kolom juga kata tunggal: { h: 'Toko' }, { label: 'Satuan' }.
   Yang membedakannya bukan isinya melainkan LETAKNYA — ia nilai dari nama
   yang memang berarti judul. Daftar di bawah sengaja pendek: menambah satu
   nama yang ternyata juga dipakai menyimpan kode adalah cara paling mudah
   untuk merusak penyaringan diam-diam. */
const NAMA_TAMPILAN =
  /(?:^|[^A-Za-z0-9_$])(?:h|label|title|judul|sub|teks|text|placeholder|hint|okText|batalText|meta|kosong)\s*:\s*$/;

function posisiTampilan(src, mulai) {
  return NAMA_TAMPILAN.test(src.slice(Math.max(0, mulai - 60), mulai));
}

function periksa(f) {
  const src = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const rel = path.relative(AKAR, f).replace(/\\/g, '/');
  const kamus = putih ? new Set() : kamusKini();
  const dikecualikan = A.rentangData(src);
  const literal = A.bacaLiteral(src);
  const bungkus = A.panggilanT(src, literal);
  const perPosisi = {};
  literal.forEach(function (l) { perPosisi[l.mulai] = l; });

  const bisa = [], tangan = { bermarkah: 0, bersambung: 0, pengenal: 0, tingkatAtas: 0 };
  const dalam = kedalamanFungsi(src);

  literal.forEach(function (l) {
    if (bungkus.dipakai.has(l.mulai)) return;
    if (diRentang(dikecualikan, l.mulai)) return;
    /* Catatan aktivitas dan pesan WhatsApp — lihat PANGGILAN_DATA di audit. */
    if (A.dalamPanggilanData(src, l.mulai)) return;
    const s = l.isi.trim();
    if (!modeKamus && (kamus.has(s) || kamus.has(l.isi))) return;
    /* Dalam mode kamus, HANYA yang sudah punya terjemahan yang dikerjakan. */
    if (modeKamus && !kamus.has(s) && !kamus.has(l.isi)) return;
    /* KUNCI OBJEK dan label `case` diikuti titik dua — membungkusnya
       menghasilkan galat sintaks. Cabang pertama sebuah ternary juga
       diikuti titik dua; ia aman dibungkus, tetapi ikut dilewati karena
       melewatkan yang aman jauh lebih murah daripada merusak yang tidak. */
    if (modeKamus) {
      let z = l.akhir;
      while (z < src.length && /\s/.test(src[z])) z++;
      if (src[z] === ':') return;
    }
    const tampak = A.teksTampak(s);
    /* Ketiga penyaring bahasa di bawah adalah TEBAKAN: teks layar atau nama
       kelas CSS. Dalam mode kamus tebakan itu tidak diperlukan — ada bukti
       yang lebih baik, yaitu bahwa seorang manusia sudah pernah menuliskan
       terjemahan Inggrisnya. Tanpa pengecualian ini, judul kolom satu kata
       seperti "Toko", "Klien", dan "Satuan" tetap tertolak sebagai pengenal
       — dan itulah yang masih berbahasa Indonesia di layar admin sesudah
       semua pekerjaan sebelumnya. */
    if (!modeKamus || !posisiTampilan(src, l.mulai)) {
      if (A.bukanTeksLayar(tampak)) return;
      if (!A.PENANDA.test(tampak)) return;
      if (tampak.split(/\s+/).length < 2 && tampak.length < 6) return;
    }

    /* PENGENAL BERTITIK — bukan kalimat, melainkan kunci.
       "crm.lihat", "penjualan.penawaran.kelola": kunci izin yang dibandingkan
       apa adanya. Ia lolos penyaring bahasa karena "lihat" dan "kelola"
       memang kata Indonesia. Membungkusnya tidak langsung merusak — T()
       memulangkan masukannya bila tidak ada terjemahan — tetapi ia memasukkan
       kunci izin ke dalam kamus, dan pada hari seseorang menerjemahkan
       "crm.lihat" menjadi "crm.view", perizinannya berhenti bekerja tanpa
       satu pun galat. */
    if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(s)) { tangan.pengenal++; return; }

    /* JALUR BERKAS. "assets/icon-mitra-192.png" lolos karena "mitra" ada di
       daftar penanda bahasa. Menerjemahkannya membuat ikonnya hilang. */
    if (/\.(png|jpe?g|svg|gif|webp|css|js|json|html?|ico)$/i.test(s)) { tangan.pengenal++; return; }
    if (/^[\w\-./]+\/[\w\-./]+$/.test(s)) { tangan.pengenal++; return; }

    /* PLACEHOLDER SENDIRIAN — "{nama}". Bukan teks, ia lubang untuk diisi. */
    if (/^\{[a-z]+\}$/i.test(s)) { tangan.pengenal++; return; }

    /* POLA REGEX. Penyaring moderasi menyimpan polanya sebagai untai:
       "\\b(gue|gw|saya)\\s+(bunuh|habisi)…". Isinya kata Indonesia semua,
       jadi ia lolos setiap penyaring bahasa — dan membungkusnya adalah cacat
       yang serius: begitu seseorang "menerjemahkannya", penyaring ancaman
       dan pelecehan berhenti mengenali apa pun, diam-diam. */
    if (/\\[bsdwSDWn]|\\s\+|\[\^|\(\?:/.test(s)) { tangan.pengenal++; return; }
    if (/^\(.*\|.*\)$/.test(s)) { tangan.pengenal++; return; }

    /* SELEKTOR CSS — "[name=selesai]", ".btn--sm", "#modal-root". */
    if (/^\[[\w-]+[=~^$*|]?.*\]$/.test(s)) { tangan.pengenal++; return; }

    /* DAFTAR KELAS CSS — "ghost ma-hapus", "chip chip--muted".
       Ia lolos karena "hapus" adalah kata Indonesia, padahal yang di layar
       bukan tulisannya melainkan bentuk tombolnya. Menerjemahkannya membuat
       gaya tombolnya hilang. Cirinya: seluruhnya huruf kecil, dan setidaknya
       satu kata memuat tanda hubung ganda atau berpola BEM. */
    if (/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*(?:\s+[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*)*$/.test(s) &&
        /--|__|(?:^|\s)[a-z]+[-_][a-z]+(?:\s|$)/.test(s)) { tangan.pengenal++; return; }

    /* Sampai di sini ia teks kategori A. Sekarang: aman diotomatiskan? */
    if (tampak !== s) { tangan.bermarkah++; return; }
    if (l.isi !== s && !berani) { tangan.bermarkah++; return; }

    /* POTONGAN YANG JELAS BELUM SELESAI.
       "Nominal melebihi saldo Anda (" dan "…tidak memiliki izin \"" adalah
       separuh kalimat yang disambung dengan sebuah VARIABEL, bukan dengan
       literal lain — jadi pemeriksa sambungan di bawah tidak melihatnya.
       Kunci kamus yang berakhir dengan kurung buka atau tanda kutip akan
       membuat penerjemah menebak-nebak apa yang menyusul, dan tanda bacanya
       akan berpindah tempat. */
    if (/["'(\[]$/.test(s)) { tangan.bersambung++; return; }
    if (/^[)\]"']/.test(s)) { tangan.bersambung++; return; }

    if (!berani && bersambung(src, l, perPosisi)) { tangan.bersambung++; return; }

    /* ESCAPE SELAIN KUTIP.
       bacaLiteral memulangkan untai yang SUDAH diurai, dan ia mengubah \n
       menjadi spasi. Kunci kamus yang lahir dari situ berisi spasi, sedangkan
       yang dicari saat aplikasi berjalan berisi baris baru sungguhan —
       keduanya tidak akan pernah cocok, dan hasilnya adalah teks yang
       dibungkus tetapi tetap Bahasa Indonesia: persis kategori B yang harus
       tetap nol. */
    var mentah = petik(src, l);
    if (/\\[^'"]/.test(mentah)) { tangan.bermarkah++; return; }
    /* Untai templat tidak boleh dibungkus begitu saja — isinya bisa memuat
       ${...} yang berbeda tiap kali digambar. */
    if (petik(src, l)[0] === '`') { tangan.bermarkah++; return; }
    /* HANYA DI DALAM FUNGSI. Lihat catatan pada kedalamanFungsi(). */
    if (dalam[l.mulai] < 2) { tangan.tingkatAtas++; return; }

    /* Bila daftar putih dipasang, hanya yang terdaftar yang lolos. */
    if (putih && !putih.has(l.isi)) return;
    bisa.push(l);
  });

  return { rel: rel, file: f, src: src, bisa: bisa, tangan: tangan };
}

/**
 * Pembungkus mana yang dipakai di berkas ini: T(…) atau I18N.t(…).
 *
 * Hanya dua puluh tujuh dari seratus lima berkas punya pintasan lokal
 *
 *     var T = function (s) { return I18N.t(s); };
 *
 * Sisanya tidak. Menulis T( di sana menghasilkan ReferenceError SAAT MODUL
 * DIEVALUASI — bukan saat fungsinya dipanggil — sehingga seluruh modul gagal
 * terdefinisi dan aplikasinya berhenti hidup. node --check tidak melihatnya
 * sama sekali: sintaksnya sah, pengenalnya saja yang tidak ada.
 *
 * Ini pernah terjadi: sekali jalan membungkus 1.052 teks, dan APP, BIZ, serta
 * AKSES lenyap. Karena itu pembungkusnya dipilih per berkas, bukan diseragamkan.
 */
function pembungkus(src) {
  return /(^|\n)\s*var T\s*=|(^|\n)\s*function T\s*\(/.test(src) ? 'T(' : 'I18N.t(';
}

function tulis(f) {
  const h = periksa(f);
  const asli = fs.readFileSync(f, 'utf8');
  const crlf = asli.indexOf('\r\n') >= 0;
  let src = h.src;
  const buka = pembungkus(src);
  /* Dari belakang ke depan supaya posisi yang belum diproses tidak bergeser. */
  const gagal = [];
  h.bisa.slice().sort(function (a, b) { return b.mulai - a.mulai; }).forEach(function (l) {
    const utuh = src.slice(l.mulai, l.akhir);
    const kutip = utuh[0];
    const dalam = utuh.slice(1, -1);
    const kiri = dalam.match(/^\s*/)[0];
    const kanan = dalam.match(/\s*$/)[0];
    let ungkap;
    if (!kiri && !kanan) {
      ungkap = buka + utuh + ')';
    } else {
      /* Spasi tepi TETAP DI LUAR pembungkus — lihat catatan pada `berani`. */
      const inti = dalam.slice(kiri.length, dalam.length - kanan.length);
      ungkap = (kiri ? kutip + kiri + kutip + ' + ' : '') +
        buka + kutip + inti + kutip + ')' +
        (kanan ? ' + ' + kutip + kanan + kutip : '');
    }
    /* BUKTI: hasilnya harus sama persis dengan untai aslinya. */
    let asli, jadi;
    try { asli = Function('return ' + utuh)(); } catch (e) { asli = null; }
    try {
      jadi = buka === 'T('
        ? Function('T', 'return ' + ungkap)(function (x) { return x; })
        : Function('I18N', 'return ' + ungkap)({ t: function (x) { return x; } });
    } catch (e) { jadi = null; }
    if (asli === null || asli !== jadi) {
      gagal.push({ baris: l.baris, isi: utuh.slice(0, 60) });
      return;
    }
    src = src.slice(0, l.mulai) + ungkap + src.slice(l.akhir);
  });
  h.gagal = gagal;
  fs.writeFileSync(f, crlf ? src.replace(/\n/g, '\r\n') : src);
  h.buka = buka;
  return h;
}

const arg = process.argv.slice(2);
const iBerani = arg.indexOf('--berani');
if (iBerani >= 0) { berani = true; arg.splice(iBerani, 1); }
const iKamus = arg.indexOf('--kamus');
if (iKamus >= 0) { modeKamus = true; arg.splice(iKamus, 1); }
const perintah = arg[0];
const daftar = berkasJs(JS);

/* --dari <berkas.json>: daftar putih teks yang boleh dibungkus. */
const iDari = arg.indexOf('--dari');
if (iDari >= 0 && arg[iDari + 1]) {
  putih = new Set(Object.keys(JSON.parse(fs.readFileSync(arg[iDari + 1], 'utf8'))));
  arg.splice(iDari, 2);
}

if (perintah === '--tulis') {
  /* Tanpa nama berkas: seluruhnya. Dipakai setelah kamusnya lengkap —
     membungkus tanpa terjemahan hanya memindahkan persoalan dari kategori A
     ke kategori B, dan kategori B harus tetap nol. */
  const t = arg.length > 1 ? arg.slice(1) : daftar;
  let n = 0;
  t.forEach(function (rel) {
    const f = path.isAbsolute(rel) ? rel : path.join(AKAR, rel);
    const h = tulis(f);
    n += h.bisa.length;
    if (h.bisa.length) console.log(String(h.bisa.length).padStart(5) + '  ' + h.rel);
  });
  console.log('\n' + n + ' teks dibungkus. Jalankan node --check pada tiap berkas.');
} else if (perintah === '--kamus') {
  const out = {};
  const target = arg.length > 1
    ? arg.slice(1).map(function (r) { return path.isAbsolute(r) ? r : path.join(AKAR, r); })
    : daftar;
  target.forEach(function (f) {
    periksa(f).bisa.forEach(function (l) { out[l.isi] = ''; });
  });
  console.log(JSON.stringify(out, null, 1));
} else {
  let total = 0, markah = 0, sambung = 0, pengenal = 0, atas = 0;
  const baris = [];
  daftar.forEach(function (f) {
    const h = periksa(f);
    if (h.bisa.length) baris.push([h.rel, h.bisa.length]);
    total += h.bisa.length;
    markah += h.tangan.bermarkah;
    sambung += h.tangan.bersambung;
    pengenal += h.tangan.pengenal;
    atas += h.tangan.tingkatAtas;
  });
  baris.sort(function (a, b) { return b[1] - a[1]; });
  console.log('AMAN DIBUNGKUS OTOMATIS: ' + total + ' teks di ' + baris.length + ' berkas\n');
  baris.slice(0, 30).forEach(function (x) {
    console.log(String(x[1]).padStart(5) + '  ' + x[0]);
  });
  if (baris.length > 30) console.log('   …  ' + (baris.length - 30) + ' berkas lain');
  console.log('\nPERLU TANGAN MANUSIA:');
  console.log(String(markah).padStart(5) + '  potongan bermarkah / berspasi tepi');
  console.log(String(sambung).padStart(5) + '  bagian dari untai yang disambung +');
  console.log(String(pengenal).padStart(5) + '  pengenal bertitik (kunci izin, bukan teks layar)');
  console.log(String(atas).padStart(5) + '  di tingkat atas modul (membeku pada bahasa saat dibuka)');
}
