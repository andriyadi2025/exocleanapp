/* ==========================================================================
   pecah-markah.js — memisahkan teks yang dibaca manusia dari potongan HTML
   --------------------------------------------------------------------------
   Menjalankan:  node app/tools/pecah-markah.js [--tulis] [berkas...]

   Tanpa --tulis ia hanya melaporkan. Dengan --tulis ia mengubah berkasnya.

   MASALAHNYA

   Sebagian besar sisa teks yang belum diterjemahkan bukan kalimat telanjang,
   melainkan kalimat yang menempel pada potongan HTML:

       '<div class="k">Belum ada pesanan</div>'

   Membungkus seluruh untainya salah: kelas CSS ikut masuk kamus, dan
   penerjemah yang mengubahnya diam-diam merusak tata letak. Yang benar
   memisahkan bagian yang dibaca manusia saja:

       '<div class="k">' + T('Belum ada pesanan') + '</div>'

   PENJAGAAN YANG MEMBUAT INI AMAN

   Tiap penggantian DIBUKTIKAN, bukan dipercaya: ungkapan yang dihasilkan
   dijalankan dengan T sebagai fungsi tanpa-ubah, lalu hasilnya dibandingkan
   HURUF DEMI HURUF dengan untai aslinya. Yang tidak sama persis dibatalkan
   dan dilaporkan, bukan ditulis. Sebuah alat yang mengubah 1.052 untai
   sekaligus pernah mematikan aplikasi ini; sejak itu tiap alat harus bisa
   membuktikan bahwa ia tidak mengubah apa pun selain pembungkusnya.

   YANG SENGAJA TIDAK DISENTUH

     · Untai yang sudah berada di dalam T(...) atau I18N.t(...).
     · Isi atribut — 'class="x"', 'data-act="y"' — karena itu bukan teks layar.
     · Potongan yang tidak memuat satu pun kata Indonesia yang dikenali.
     · Untai bertanda kutip balik (template literal) yang memuat penyisipan.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const AKAR = path.resolve(__dirname, '..');
const JS = path.join(AKAR, 'js');

const LEWATI = [
  'seed.js', 'wa.js', 'katalog.js', 'kurikulum.js', 'kurikulum-fungsi.js',
  'i18n.js', 'lang', 'wilayah.js',
  /* Dokumen yang dikirim ke klien — sama alasannya dengan wa.js. */
  'email.js'
];

/* Penanda bahasa yang sama dengan audit-i18n.js. Disalin dengan sengaja:
   dua alat yang memakai daftar berbeda akan berbeda pendapat tentang berkas
   yang sama, dan yang membacanya tidak akan tahu mana yang benar. */
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

function bukanTeksLayar(s) {
  if (s.length < 3) return true;
  if (!/[a-z]/i.test(s)) return true;
  if (/^[a-z0-9_-]+$/i.test(s) && s.indexOf(' ') < 0) return true;
  if (/^(https?:|mailto:|tel:|data:|blob:|#|\.|\/)/i.test(s)) return true;
  if (/^[<>&/{}[\]().,;:+*%$-]+$/.test(s)) return true;
  if (/^[A-Z_]+$/.test(s)) return true;
  if (/^\d/.test(s) && !/[a-z]{3}/i.test(s)) return true;
  return false;
}

/* -------------------------------------------------------------- literal */

function bacaLiteral(src) {
  const out = [];
  let i = 0, baris = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { baris++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') baris++; i++; }
      i += 2; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const kutip = c, mulai = i, barisMulai = baris;
      i++;
      let mentah = '';
      while (i < n) {
        if (src[i] === '\\') { mentah += src[i] + src[i + 1]; i += 2; continue; }
        if (src[i] === kutip) break;
        if (src[i] === '\n') { baris++; if (kutip !== '`') break; }
        mentah += src[i]; i++;
      }
      i++;
      out.push({ kutip: kutip, mentah: mentah, baris: barisMulai, mulai: mulai, akhir: i });
      continue;
    }
    i++;
  }
  return out;
}

/* Posisi literal yang sudah termakan sebuah pembungkus T(...). */
function sudahDibungkus(src, literal) {
  const perPosisi = {};
  literal.forEach(function (l) { perPosisi[l.mulai] = l; });
  const dipakai = new Set();
  const buka = /(^|[^A-Za-z0-9_$.])(?:T|Tt|I18N\.t)\s*\(/g;
  let m;
  while ((m = buka.exec(src))) {
    let i = buka.lastIndex;
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      const l = perPosisi[i];
      if (!l) break;
      dipakai.add(l.mulai);
      i = l.akhir;
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] !== '+') break;
      i = j + 1;
    }
  }
  return dipakai;
}

/* ------------------------------------------------------------- pemecahan */

/**
 * Pecah isi mentah sebuah untai menjadi ruas markah dan ruas teks.
 *
 * Untai di berkas ini sering PECAH DI TENGAH TAG, karena kalimatnya disusun
 * dari beberapa potongan:
 *
 *     '<td style="' + w + '">Jumlah</th>'
 *                          ^ potongan kedua mulai di tengah atribut
 *
 * Karena itu bila ada '>' sebelum '<' pertama, semua yang mendahuluinya
 * dianggap sisa tag, bukan teks. Begitu pula '<' tanpa penutup di ujung.
 */
function ruas(mentah) {
  const out = [];
  let i = 0;

  /* Sisa tag yang terbawa dari potongan sebelumnya. */
  const tutupAwal = mentah.indexOf('>');
  const bukaAwal = mentah.indexOf('<');
  if (tutupAwal >= 0 && (bukaAwal < 0 || tutupAwal < bukaAwal)) {
    out.push({ jenis: 'markah', isi: mentah.slice(0, tutupAwal + 1) });
    i = tutupAwal + 1;
  }

  let teks = '';
  while (i < mentah.length) {
    if (mentah[i] === '<') {
      const tutup = mentah.indexOf('>', i);
      if (teks) { out.push({ jenis: 'teks', isi: teks }); teks = ''; }
      if (tutup < 0) {
        /* Tag yang belum selesai di ujung untai. */
        out.push({ jenis: 'markah', isi: mentah.slice(i) });
        return out;
      }
      out.push({ jenis: 'markah', isi: mentah.slice(i, tutup + 1) });
      i = tutup + 1;
      continue;
    }
    teks += mentah[i];
    i++;
  }
  if (teks) out.push({ jenis: 'teks', isi: teks });
  return out;
}

/**
 * Kunci yang SUDAH ADA di kamus Inggris.
 *
 * Dipakai sebagai bukti bahwa sepatah kata memang teks layar. Penyaring
 * umum menolak kata tunggal tanpa spasi — aturan yang benar, karena nama
 * kelas CSS dan pengenal juga berbentuk begitu. Akibatnya tombol
 * '<button ...>Lihat</button>' tidak pernah tersentuh, padahal "Lihat"
 * jelas dibaca orang dan sudah lama ada terjemahannya.
 *
 * Aman karena dua hal sekaligus: kata itu harus sudah pernah dinyatakan
 * sebagai teks layar oleh manusia (ada di kamus), DAN letaknya menurut
 * pemecahan di atas berada di antara dua tag — bukan di dalam atribut.
 */
const KAMUS = (function () {
  const set = new Set();
  ['lang/en-extra.js', 'i18n.js'].forEach(function (n) {
    let teks;
    try { teks = fs.readFileSync(path.join(JS, n), 'utf8'); } catch (e) { return; }
    const re = /(^|[,{]\s*)(['"])((?:[^'"\\]|\\.)*?)\2\s*:/g;
    let m;
    while ((m = re.exec(teks))) set.add(m[3]);
  });
  return set;
})();

/** Layak dibungkus: kalimat Indonesia, bukan angka, bukan pengenal. */
function layak(t) {
  const inti = t.trim();
  if (!inti) return false;
  if (KAMUS.has(inti)) return true;
  if (bukanTeksLayar(inti)) return false;
  if (!PENANDA.test(inti)) return false;
  /* Penanda pengganti dan sisa kutip tidak dibungkus: kuncinya tidak akan
     pernah cocok dengan apa pun di kamus. */
  if (/[{}]|\\\\/.test(inti)) return false;
  return true;
}

/**
 * Nama pembungkus yang SAH DI BERKAS INI.
 *
 * Hanya 27 dari 105 berkas punya `var T = ...` sendiri; sisanya harus
 * memanggil I18N.t. Menulis `T(` di berkas yang tidak punya T menghasilkan
 * ReferenceError SAAT MODUL DINILAI — bukan saat tombol ditekan — sehingga
 * seluruh modul lenyap dan aplikasinya mati sebelum sempat menggambar apa
 * pun. `node --check` meluluskannya tanpa sepatah kata.
 *
 * Ini bukan kehati-hatian yang dibayangkan: sebuah alat yang menulis `T(`
 * di 1.052 tempat pernah melakukannya persis begitu di proyek ini.
 */
function pembungkus(src) {
  return /(^|\n)\s*var T\s*=|(^|\n)\s*function T\s*\(/.test(src)
    ? 'T(' : 'I18N.t(';
}

function kutipkan(s) {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/**
 * Susun ungkapan pengganti, atau null bila tidak ada yang perlu diubah.
 *
 * Spasi di tepi teks TETAP DI LUAR pembungkus. '<b>Nama </b>' menjadi
 * '<b>' + T('Nama') + ' </b>' — bukan T('Nama ') — supaya kuncinya sama
 * dengan kunci yang sama di tempat lain yang kebetulan tidak berspasi.
 */
function ungkapan(mentah, bungkus) {
  const r = ruas(mentah);
  if (!r.some(function (x) { return x.jenis === 'teks' && layak(x.isi); })) return null;

  const bagian = [];
  let kumpul = '';
  function buang() { if (kumpul) { bagian.push(kutipkan(kumpul)); kumpul = ''; } }

  r.forEach(function (x) {
    if (x.jenis === 'markah' || !layak(x.isi)) { kumpul += x.isi; return; }
    const kiri = x.isi.match(/^\s*/)[0];
    const kanan = x.isi.match(/\s*$/)[0];
    const inti = x.isi.slice(kiri.length, x.isi.length - kanan.length);
    kumpul += kiri;
    buang();
    bagian.push(bungkus + kutipkan(inti) + ')');
    kumpul = kanan;
  });
  buang();
  if (bagian.length < 2) return null;
  return bagian.join(' + ');
}

/* Bukti: ungkapan yang disusun harus menghasilkan untai yang sama persis. */
function terbukti(ungkap, mentahAsli, kutip, bungkus) {
  let asli;
  try {
    asli = Function('return ' + kutip + mentahAsli + kutip)();
  } catch (e) { return false; }
  let jadi;
  try {
    /* Dijalankan dengan nama yang SAMA PERSIS dengan yang akan ditulis —
       kalau tidak, buktinya membuktikan kode yang berbeda dari kode yang
       disimpan, dan bukti seperti itu lebih berbahaya daripada tanpa
       bukti sama sekali. */
    jadi = bungkus === 'T('
      ? Function('T', 'return ' + ungkap)(function (x) { return x; })
      : Function('I18N', 'return ' + ungkap)({ t: function (x) { return x; } });
  } catch (e) { return false; }
  return asli === jadi;
}

/* ------------------------------------------------------------- penjalanan */

function berkas(dir, out) {
  out = out || [];
  fs.readdirSync(dir).forEach(function (nama) {
    const p = path.join(dir, nama);
    if (LEWATI.indexOf(nama) >= 0) return;
    if (fs.statSync(p).isDirectory()) return berkas(p, out);
    if (/\.js$/.test(nama)) out.push(p);
  });
  return out;
}

function olah(p, tulis) {
  const asli = fs.readFileSync(p, 'utf8');
  const crlf = asli.indexOf('\r\n') >= 0;
  const src = asli.replace(/\r\n/g, '\n');
  const lit = bacaLiteral(src);
  const dibungkus = sudahDibungkus(src, lit);
  const bungkus = pembungkus(src);

  const ganti = [];
  const gagal = [];
  const kurung = [];
  lit.forEach(function (l) {
    if (l.kutip === '`') return;
    if (dibungkus.has(l.mulai)) return;
    if (l.mentah.indexOf('<') < 0 && l.mentah.indexOf('>') < 0) return;
    const u = ungkapan(l.mentah, bungkus);
    if (!u) return;
    if (!terbukti(u, l.mentah, l.kutip, bungkus)) {
      gagal.push({ baris: l.baris, isi: l.mentah.slice(0, 70) });
      return;
    }
    /* LETAKNYA di dalam kode ikut diperiksa, karena bukti kesamaan di atas
       hanya membuktikan HASILNYA sama — bukan bahwa sambungan boleh berdiri
       di tempat itu. `'a<b>'.length` menjadi `'a' + T('b').length`, yang
       masih sah menurut penyusun bahasa dan salah menurut siapa pun.
       Karena itu bila di kiri atau kanannya ada tanda yang mengikat lebih
       kuat daripada tambah, sambungannya dikurung. */
    let ungkap = u;
    let a = l.akhir;
    while (a < src.length && /\s/.test(src[a])) a++;
    let b = l.mulai - 1;
    while (b >= 0 && /\s/.test(src[b])) b--;
    const kanan = src[a] || '';
    const kiri = src[b] || '';
    if ('.[`'.indexOf(kanan) >= 0 || '*/%'.indexOf(kanan) >= 0 ||
        '*/%-~!'.indexOf(kiri) >= 0) {
      ungkap = '(' + u + ')';
      kurung.push({ baris: l.baris, kiri: kiri, kanan: kanan });
    }
    ganti.push({ mulai: l.mulai, akhir: l.akhir, ungkap: ungkap, baris: l.baris });
  });

  if (tulis && ganti.length) {
    let s = src;
    ganti.slice().sort(function (a, b) { return b.mulai - a.mulai; })
      .forEach(function (g) {
        s = s.slice(0, g.mulai) + g.ungkap + s.slice(g.akhir);
      });
    fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s);
  }
  return { ganti: ganti, gagal: gagal, kurung: kurung, bungkus: bungkus };
}

const arg = process.argv.slice(2);
const tulis = arg.indexOf('--tulis') >= 0;
const pilih = arg.filter(function (a) { return a.indexOf('--') !== 0; });

let daftar = berkas(JS);
if (pilih.length) {
  daftar = daftar.filter(function (p) {
    return pilih.some(function (q) { return p.replace(/\\/g, '/').indexOf(q) >= 0; });
  });
}

let total = 0, totalGagal = 0;
daftar.forEach(function (p) {
  const r = olah(p, tulis);
  if (!r.ganti.length && !r.gagal.length) return;
  total += r.ganti.length; totalGagal += r.gagal.length;
  console.log(path.relative(AKAR, p).replace(/\\/g, '/') +
    '  ' + r.ganti.length + ' dipecah  [' + r.bungkus + ')]' +
    (r.gagal.length ? '  ' + r.gagal.length + ' DIBATALKAN' : ''));
  r.gagal.forEach(function (g) {
    console.log('      b' + g.baris + '  ' + JSON.stringify(g.isi));
  });
  r.kurung.forEach(function (g) {
    console.log('      b' + g.baris + '  DIKURUNG (kiri "' + g.kiri +
      '", kanan "' + g.kanan + '")');
  });
});
console.log('\n' + total + ' untai dipecah' +
  (totalGagal ? ', ' + totalGagal + ' dibatalkan karena tidak terbukti sama' : '') +
  (tulis ? '' : '  (uji coba — tambahkan --tulis untuk menyimpan)'));
