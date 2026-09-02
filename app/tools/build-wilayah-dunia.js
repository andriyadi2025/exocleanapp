/* ==========================================================================
   build-wilayah-dunia.js — data wilayah + kode pos untuk negara non-Indonesia
   --------------------------------------------------------------------------
   Menjalankan:  node app/tools/build-wilayah-dunia.js [KODE ...]
   Tanpa argumen, seluruh negara pada daftar NEGARA di bawah disusun ulang.

   SUMBER
     https://download.geonames.org/export/zip/<XX>.zip   kode pos + hierarki
     https://download.geonames.org/export/dump/admin1CodesASCII.txt

   GeoNames berlisensi CC BY 4.0 — WAJIB dicantumkan atributnya di aplikasi.
   Atribusi itu ditulis ke setiap index.json dan ditampilkan di bawah kolom
   kode pos, jadi jangan dihapus dari keluarannya.

   Indonesia TIDAK diambil dari sini. Data Kemendagri jauh lebih lengkap dan
   lebih resmi untuk Indonesia; berkasnya disusun build-wilayah.js.

   BEDA TINGKAT ANTAR NEGARA
   -------------------------
   Berkas GeoNames punya empat kolom nama: admin1, admin2, admin3, dan nama
   tempat. Yang terisi berbeda-beda:

     Jepang     admin1 Prefektur   admin2 Kota/Ku    tempat Machi
     Turki      admin1 Il          admin2 Ilce       tempat Koy
     Malaysia   admin1 Negeri      admin2 (kosong)   tempat Bandar
     Singapura  admin1 (kosong)    admin2 (kosong)   tempat Jalan

   Maka tingkatannya TIDAK ditetapkan di muka, melainkan dibaca dari data:
   kolom yang benar-benar terisi diambil berurutan menjadi L1..L4. Memaksakan
   satu bentuk ke semua negara akan menghasilkan kolom kosong yang harus
   dilewati pengguna, atau kolom terisi yang tidak pernah terlihat.

   AMBANG KETERISIAN
   -----------------
   Sebuah kolom dianggap "ada" bila terisi pada minimal 60% baris (lihat
   AMBANG). Di bawah itu, kolomnya hanya terisi untuk sebagian wilayah dan
   justru menyesatkan: pengguna di daerah yang tidak tercakup memilih induknya
   lalu menemui daftar kosong, dan mengira wilayahnya tidak didukung.

   NEGARA TANPA KODE POS DI GEONAMES
   ---------------------------------
   Vietnam, Arab Saudi, Yunani, Israel, dan sebagian besar Timur Tengah tidak
   punya berkas kode pos di GeoNames. Untuk negara-negara itu dipakai daftar
   pembagian administratif (admin1 + admin2) tanpa kode pos — wilayahnya tetap
   berupa pilihan, kode posnya diketik sendiri.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const AKAR = path.resolve(__dirname, '..');
const TUJUAN = path.join(AKAR, 'data', 'wilayah');
const SINGGAH = path.join(__dirname, '.cache-dunia');

const ATRIBUSI = 'GeoNames (CC BY 4.0) — geonames.org';

/* Sebuah kolom perantara baru dianggap sebagai tingkat tersendiri bila
   terisi pada MINIMAL 60% baris. Ambang 30% pernah dicoba dan salah:
   admin3 Jepang dan Korea terisi 32%, cukup untuk lolos tetapi tidak cukup
   untuk dipakai — dua dari tiga pengguna akan memilih kota lalu menemui
   daftar kosong dan tidak bisa melanjutkan. */
const AMBANG = 0.60;

/* Negara yang berkas kode posnya ADA tetapi tidak layak dijadikan hierarki.
   Alasannya ditulis, bukan sekadar dikecualikan, supaya keputusan ini bisa
   ditinjau ulang ketika datanya membaik. */
const PAKAI_ADMIN = {
  AE: 'kode pos GeoNames untuk UEA hanya memuat kawasan Dubai dan Sharjah — ' +
      'UEA sendiri tidak punya sistem kode pos nasional',
  SG: 'berkas GeoNames Singapura berisi nama jalan, bukan pembagian wilayah'
};

/* Daftar tempat datar tanpa induk masih masuk akal untuk negara kecil
   (Islandia ~200 tempat). Di atas batas ini ia bukan lagi daftar wilayah,
   melainkan daftar jalan — dan memilih dari 4.000 baris bukan pilihan. */
const BATAS_DATAR = 2000;

/* Nama tingkat-1 yang dipaksakan menurut kode wilayah.
   ---------------------------------------------------------------------------
   Berkas Jerman memakai DUA skema kode sekaligus — angka milik GeoNames dan
   huruf ISO 3166-2 — dan kolom namanya berganti bahasa mengikuti skemanya:
   baris berkode "02" tertulis "Bavaria", baris berkode "BY" tertulis
   "Bayern". Keduanya negara bagian yang sama, tetapi kotanya terbelah ke dua
   pilihan; pengguna yang memilih salah satunya tidak menemukan kotanya.

   Penggabungan lewat kemiripan nama jelas gagal (Bavaria/Bayern), dan lewat
   awalan kode pos hanya benar 11 dari 16 — salah gabung lebih merugikan
   daripada duplikat, jadi pemetaannya ditulis tangan di sini.

   Dipakai nama Jerman, bukan Inggris: yang mengisi formulir ini orang yang
   tinggal di sana, dan itu nama yang tertera di dokumen mereka.

   Negara lain TIDAK butuh tabel ini — Latvia dan Filipina memakai kode huruf
   untuk wilayah yang memang berbeda, dan Swedia menulis namanya sama persis
   pada kedua skema sehingga bergabung sendiri. */
const NAMA_L1 = {
  DE: {
    '01': 'Baden-Württemberg', BW: 'Baden-Württemberg',
    '02': 'Bayern', BY: 'Bayern',
    '03': 'Bremen', HB: 'Bremen',
    '04': 'Hamburg', HH: 'Hamburg',
    '05': 'Hessen', HE: 'Hessen',
    '06': 'Niedersachsen', NI: 'Niedersachsen',
    '07': 'Nordrhein-Westfalen', NW: 'Nordrhein-Westfalen',
    '08': 'Rheinland-Pfalz', RP: 'Rheinland-Pfalz',
    '09': 'Saarland', SL: 'Saarland',
    '10': 'Schleswig-Holstein', SH: 'Schleswig-Holstein',
    '11': 'Brandenburg', BB: 'Brandenburg',
    '12': 'Mecklenburg-Vorpommern', MV: 'Mecklenburg-Vorpommern',
    '13': 'Sachsen', SN: 'Sachsen',
    '14': 'Sachsen-Anhalt', ST: 'Sachsen-Anhalt',
    '15': 'Thüringen', TH: 'Thüringen',
    '16': 'Berlin', BE: 'Berlin'
  }
};

/* Asia Tenggara, Asia Timur, Timur Tengah, dan Eropa. Negara yang tidak
   punya berkas GeoNames dilewati dengan pesan, bukan menggagalkan seluruh
   proses — daftarnya memang tidak seragam dan itu bukan kesalahan pemakai. */
const NEGARA = [
  /* Asia Tenggara */ 'MY', 'SG', 'TH', 'PH', 'VN', 'BN', 'KH', 'LA', 'MM', 'TL',
  /* Asia Timur   */ 'JP', 'KR',
  /* Timur Tengah */ 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IL', 'TR', 'IR', 'IQ',
  /* Eropa        */ 'GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'LU', 'CH', 'AT', 'IT', 'ES', 'PT',
                     'GR', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'RS', 'SI',
                     'SE', 'NO', 'DK', 'FI', 'IS', 'EE', 'LV', 'LT', 'RU', 'UA', 'BY'
];

/* ------------------------------------------------------------------ unduh */

function unduh(url) {
  return new Promise(function (selesai, gagal) {
    function ambil(u, sisa) {
      if (sisa < 0) return gagal(new Error('terlalu banyak pengalihan'));
      https.get(u, { headers: { 'User-Agent': 'exoclean-build-wilayah' } }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return ambil(new URL(res.headers.location, u).toString(), sisa - 1);
        }
        if (res.statusCode !== 200) { res.resume(); return gagal(new Error('HTTP ' + res.statusCode)); }
        const bagian = [];
        res.on('data', function (b) { bagian.push(b); });
        res.on('end', function () { selesai(Buffer.concat(bagian)); });
      }).on('error', gagal);
    }
    ambil(url, 5);
  });
}

async function berkasSinggah(nama, url) {
  const p = path.join(SINGGAH, nama);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  const isi = await unduh(url);
  fs.writeFileSync(p, isi);
  return isi;
}

/* --------------------------------------------------------------- buka zip
   Zip GeoNames berisi satu berkas teks dan satu readme, keduanya deflate
   biasa tanpa enkripsi. Membaca direktori pusatnya jauh lebih ringkas
   daripada menambah ketergantungan pustaka hanya untuk ini. */

function isiZip(buf, akhiran) {
  akhiran = String(akhiran).toLowerCase();
  let akhir = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { akhir = i; break; }
  }
  if (akhir < 0) throw new Error('bukan berkas zip yang dikenali');
  const jumlah = buf.readUInt16LE(akhir + 10);
  let p = buf.readUInt32LE(akhir + 16);

  for (let i = 0; i < jumlah; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('direktori zip rusak');
    const metode = buf.readUInt16LE(p + 10);
    const ukurTerkompres = buf.readUInt32LE(p + 20);
    const panjangNama = buf.readUInt16LE(p + 28);
    const panjangEkstra = buf.readUInt16LE(p + 30);
    const panjangKomentar = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const nama = buf.toString('utf8', p + 46, p + 46 + panjangNama);
    p += 46 + panjangNama + panjangEkstra + panjangKomentar;

    if (!nama.toLowerCase().endsWith(akhiran)) continue;

    /* Panjang nama & ekstra pada header lokal boleh berbeda dari yang di
       direktori pusat, jadi keduanya dibaca ulang di tempatnya sendiri. */
    const namaLokal = buf.readUInt16LE(offset + 26);
    const ekstraLokal = buf.readUInt16LE(offset + 28);
    const mulai = offset + 30 + namaLokal + ekstraLokal;
    const data = buf.slice(mulai, mulai + ukurTerkompres);
    return metode === 0 ? data : zlib.inflateRawSync(data);
  }
  throw new Error('berkas "' + akhiran + '" tidak ada di dalam zip');
}

/* ------------------------------------------------------------------ susun */

function bacaKode(teks) {
  const peta = new Map();
  teks.split('\n').forEach(function (b) {
    const k = b.split('\t');
    if (k.length >= 2 && k[0]) peta.set(k[0].trim(), k[1].trim());
  });
  return peta;
}

/**
 * Susun dari daftar pembagian administratif saja, TANPA kode pos.
 *
 * Dipakai untuk negara yang tidak punya berkas kode pos di GeoNames —
 * Vietnam, Arab Saudi, Yunani, Israel, dan sebagian Timur Tengah. Dua
 * tingkat wilayah yang benar jauh lebih berguna daripada kolom ketik
 * kosong, dan kolom kode posnya tetap bisa diisi tangan.
 */
function susunDariAdmin(kode, tabel1, tabel2, alasan) {
  const prov = [];
  let jumlahL2 = 0;

  const a1 = [];
  tabel1.forEach(function (nama, k) {
    if (k.indexOf(kode + '.') === 0) a1.push({ k: k.split('.')[1], n: nama });
  });
  if (!a1.length) return null;
  a1.sort(function (x, y) { return x.n.localeCompare(y.n); });

  a1.forEach(function (p, i) {
    const awalan = kode + '.' + p.k + '.';
    const kab = [];
    tabel2.forEach(function (nama, k) {
      if (k.indexOf(awalan) === 0) kab.push({ n: nama });
    });
    kab.sort(function (x, y) { return x.n.localeCompare(y.n); });
    jumlahL2 += kab.length;
    prov.push({ k: String(i), n: p.n, kab: kab });
  });

  const dir = path.join(TUJUAN, kode.toLowerCase());
  fs.mkdirSync(dir, { recursive: true });
  fs.readdirSync(dir).forEach(function (f) { if (f.endsWith('.json')) fs.unlinkSync(path.join(dir, f)); });

  const index = {
    negara: kode, dasar: ATRIBUSI,
    tingkat: jumlahL2 ? ['admin1', 'admin2'] : ['admin1'],
    tanpaKodePos: true,
    catatan: alasan || 'GeoNames tidak menyediakan kode pos untuk negara ini',
    dibuat: new Date().toISOString().slice(0, 10),
    jumlah: { l1: prov.length, l2: jumlahL2, l3: 0, l4: 0 },
    prov: prov
  };
  const teksIndex = JSON.stringify(index);
  fs.writeFileSync(path.join(dir, 'index.json'), teksIndex);

  return { kode: kode, tingkat: index.tingkat.length, rantai: index.tingkat,
    l1: prov.length, l2: jumlahL2, l3: 0, l4: 0, berkas: 0,
    kb: Math.round(Buffer.byteLength(teksIndex) / 1024), tanpaPos: true };
}

/* Ambang untuk membuang baris yang bukan tempat sungguhan.
   ---------------------------------------------------------------------------
   Jerman memberi kode pos tersendiri kepada penerima surat bervolume besar
   (Großempfänger), sehingga "Sky Deutschland GmbH" dan "Amtsgericht München"
   ikut masuk daftar tempat — sepertiga dari seluruh baris. Dibiarkan, daftar
   wilayah Munich hampir seluruhnya berisi perusahaan dan kantor, sementara
   nama kotanya sendiri tenggelam.

   Menyaring lewat kata kunci (GmbH, AG, Amtsgericht, …) sudah dicoba dan
   selalu bocor — daftarnya tidak ada habisnya. Yang memisahkan dengan bersih
   adalah kolom AKURASI: baris Großempfänger selalu mengosongkannya, sedangkan
   tempat sungguhan mengisinya.

   Tetapi banyak negara mengosongkan kolom itu di SELURUH barisnya (Jepang
   salah satunya). Menyaringnya di sana akan menghapus seluruh data negara itu.
   Maka penyaring hanya dijalankan bila kolom akurasi memang dipakai secara
   luas di negara tersebut. */
const AMBANG_AKURASI = 0.50;

/* Kode pos khusus surat bisnis, bukan alamat tempat tinggal.
   ---------------------------------------------------------------------------
   Prancis, Belgia, Luksemburg, dan Monako memakai CEDEX untuk kiriman
   perkantoran bervolume besar. Satu arrondissement Paris punya satu kode pos
   sungguhan (75001) ditambah puluhan varian CEDEX — dan karena kode posnya
   jadi "banyak", kolomnya tidak pernah terisi otomatis untuk siapa pun yang
   tinggal di Paris.

   Dibuang, bukan dipilih-pilih: kiriman ke rumah tidak pernah memakai CEDEX,
   dan menyisakannya hanya membuat kode pos yang benar tampak ambigu. */
const POS_BISNIS = /\bCEDEX\b/i;

/** Buang nilai yang jelas bukan nama wilayah. */
function bersih(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t || t === '-' || /^[0-9]+$/.test(t)) return '';
  return t;
}

function susunNegara(kode, tabelAdmin1) {
  const zip = fs.readFileSync(path.join(SINGGAH, kode + '.zip'));
  const teks = isiZip(zip, kode + '.txt').toString('utf8');

  const baris = [];
  teks.split('\n').forEach(function (b) {
    if (!b.trim()) return;
    const k = b.split('\t');
    if (k.length < 12) return;
    /* Kode wilayah TIDAK boleh lewat bersih(): fungsi itu membuang nilai yang
       seluruhnya angka karena untuk sebuah NAMA itu pasti sampah — tetapi
       kode "02" memang angka, dan membuangnya membuat seluruh pemetaan nama
       kanonik diam-diam tidak pernah berjalan. */
    const a1kode = String(k[4] || '').trim();
    baris.push({
      /* Kode pos juga TIDAK boleh lewat bersih(). Fungsi itu membuang nilai
         yang seluruhnya angka — benar untuk sebuah nama wilayah, fatal untuk
         kode pos: "70173" lenyap sementara "150-0034" dan "SW1A 1AA" selamat,
         sehingga Jerman, Prancis, Turki, dan Malaysia kehilangan SELURUH kode
         posnya sedangkan Jepang dan Inggris tampak baik-baik saja.

         Spasi di dalam kode dipertahankan: "110 00" (Ceko) dan "SW1A 1AA"
         (Inggris) memang satu kode, bukan dua. */
      pos: String(k[1] || '').replace(/\s+/g, ' ').trim(),
      tempat: bersih(k[2]),
      /* Nama KANONIK dari kode wilayah didahulukan, bukan kolom namanya.
         Kolom nama pada berkas GeoNames tidak konsisten bahasanya: Jerman
         menulis "Bayern" pada sebagian baris dan "Bavaria" pada sebagian
         lain, sehingga satu negara bagian pecah menjadi dua pilihan dengan
         daftar kota yang berbeda-beda — pengguna yang memilih salah satunya
         tidak akan menemukan kotanya. */
      a1: (a1kode && NAMA_L1[kode] && NAMA_L1[kode][a1kode]) ||
          (a1kode ? (tabelAdmin1.get(kode + '.' + a1kode) || '') : '') || bersih(k[3]),
      a2: bersih(k[5]),
      a3: bersih(k[7]),
      akurat: !!String(k[11] || '').trim()
    });
  });
  if (!baris.length) return null;

  /* Baris Großempfänger dibuang seluruhnya, bukan sekadar namanya
     dikosongkan: kode posnya milik perusahaan itu, dan mewariskannya ke
     wilayah induk berarti mengisikan kode pos yang salah ke alamat orang. */
  /* Baris CEDEX dibuang lebih dulu supaya tidak ikut membuat kode pos
     tempat tinggal tampak bercabang. */
  for (let i = baris.length - 1; i >= 0; i--) {
    if (POS_BISNIS.test(baris[i].pos)) baris.splice(i, 1);
  }
  if (!baris.length) return null;

  const rasioAkurat = baris.filter(function (r) { return r.akurat; }).length / baris.length;
  let dibuangGE = 0;
  if (rasioAkurat >= AMBANG_AKURASI) {
    for (let i = baris.length - 1; i >= 0; i--) {
      if (!baris[i].akurat) { baris.splice(i, 1); dibuangGE++; }
    }
  }

  /* Kolom mana yang benar-benar terisi. */
  const n = baris.length;
  const isi = function (f) { return baris.filter(function (r) { return r[f]; }).length / n; };
  const rantai = ['a1', 'a2', 'a3', 'tempat'].filter(function (f) { return isi(f) >= AMBANG; });
  if (!rantai.length) return null;

  /* Tanpa admin1, yang tersisa hanyalah daftar datar. Untuk negara kecil itu
     memang bentuk wilayahnya; untuk negara-kota itu tanda bahwa datanya
     berisi nama jalan, dan lebih baik ditolak daripada disodorkan. */
  if (rantai[0] !== 'a1') {
    const datar = new Set(baris.map(function (r) { return r[rantai[0]]; })).size;
    if (datar > BATAS_DATAR) return { terlaluDatar: datar };
  }

  const LABEL = { a1: 'admin1', a2: 'admin2', a3: 'admin3', tempat: 'nama tempat' };

  /* ---- pohon: L1 -> L2 -> L3 -> L4 ---- */
  const pohon = new Map();
  baris.forEach(function (r) {
    const jalur = rantai.map(function (f) { return r[f]; });
    if (!jalur[0]) return;
    let simpul = pohon;
    jalur.forEach(function (nama, i) {
      if (!nama) return;
      if (!simpul.has(nama)) simpul.set(nama, { anak: new Map(), pos: new Set() });
      const s = simpul.get(nama);
      if (i === jalur.length - 1 && r.pos) s.pos.add(r.pos);
      simpul = s.anak;
    });
    /* Kode pos juga dicatat di tingkat terdalam yang benar-benar terisi,
       supaya negara yang hierarkinya dangkal tetap punya kode posnya. */
    let terdalam = pohon, terakhir = null;
    jalur.forEach(function (nama) {
      if (!nama || !terdalam.has(nama)) return;
      terakhir = terdalam.get(nama); terdalam = terakhir.anak;
    });
    if (terakhir && r.pos) terakhir.pos.add(r.pos);
  });

  /* Satu kode pos = pasti; lebih dari satu = tidak bisa diisikan otomatis. */
  const posTunggal = function (s) { return s.pos.size === 1 ? Array.from(s.pos)[0] : ''; };
  const urut = function (m) { return Array.from(m.keys()).sort(function (a, b) { return a.localeCompare(b); }); };

  const dir = path.join(TUJUAN, kode.toLowerCase());
  fs.mkdirSync(dir, { recursive: true });
  fs.readdirSync(dir).forEach(function (f) { if (f.endsWith('.json')) fs.unlinkSync(path.join(dir, f)); });

  let jumlahL1 = 0, jumlahL2 = 0, jumlahL3 = 0, jumlahL4 = 0, bytes = 0, berkas = 0;
  const prov = [];

  urut(pohon).forEach(function (namaL1, iL1) {
    const sL1 = pohon.get(namaL1);
    jumlahL1++;
    const kab = [];

    urut(sL1.anak).forEach(function (namaL2, iL2) {
      const sL2 = sL1.anak.get(namaL2);
      jumlahL2++;
      const kunci = iL1 + '-' + iL2;
      const anakL3 = urut(sL2.anak);
      const entri = { n: namaL2 };
      const p2 = posTunggal(sL2);
      if (p2) entri.pos = p2;

      if (anakL3.length) {
        entri.f = kunci;                 /* ada berkas rincian */
        const kec = anakL3.map(function (namaL3) {
          const sL3 = sL2.anak.get(namaL3);
          jumlahL3++;
          const anakL4 = urut(sL3.anak);
          const o = { n: namaL3 };
          const p3 = posTunggal(sL3);
          if (p3) o.pos = p3;
          if (anakL4.length) {
            o.d = anakL4.map(function (namaL4) {
              jumlahL4++;
              return [namaL4, posTunggal(sL3.anak.get(namaL4))];
            });
          }
          return o;
        });
        const isiBerkas = JSON.stringify({ n: namaL2, p: namaL1, kec: kec });
        fs.writeFileSync(path.join(dir, kunci + '.json'), isiBerkas);
        bytes += Buffer.byteLength(isiBerkas); berkas++;
      }
      kab.push(entri);
    });

    /* Kode pos ditulis juga di tingkat-1. Untuk negara berjenjang satu
       (Islandia, Serbia, Slovenia) tingkat inilah daunnya, dan tanpa baris ini
       kode posnya hilang tanpa jejak — datanya ada di sumber, tetapi tidak
       pernah sampai ke formulir. */
    const entriProv = { k: String(iL1), n: namaL1, kab: kab };
    const p1 = posTunggal(sL1);
    if (p1) entriProv.pos = p1;
    prov.push(entriProv);
  });

  const index = {
    negara: kode,
    dasar: ATRIBUSI,
    tingkat: rantai.map(function (f) { return LABEL[f]; }),
    dibuat: new Date().toISOString().slice(0, 10),
    jumlah: { l1: jumlahL1, l2: jumlahL2, l3: jumlahL3, l4: jumlahL4 },
    prov: prov
  };

  const tambahan = pecahBilaBesar(index, dir);
  const teksIndex = JSON.stringify(index);
  fs.writeFileSync(path.join(dir, 'index.json'), teksIndex);

  return {
    kode: kode, tingkat: rantai.length, rantai: index.tingkat,
    l1: jumlahL1, l2: jumlahL2, l3: jumlahL3, l4: jumlahL4, pecah: index.pisah === true,
    berkas: berkas + tambahan.berkas,
    kb: Math.round((bytes + tambahan.bytes + Buffer.byteLength(teksIndex)) / 1024)
  };
}

/**
 * Pindahkan daftar tingkat-2 keluar dari index bila indexnya kelewat besar.
 *
 * Rusia punya 12.417 wilayah tingkat dua dan Rumania 13.896. Menaruh semuanya
 * di satu index berarti pengguna di sana mengunduh 400 KB hanya untuk membuka
 * formulir alamat — beberapa detik penuh di jaringan ponsel yang lambat,
 * sebelum sempat mengetik apa pun.
 *
 * Negara lain tidak dipecah: satu permintaan tambahan untuk 54 negara yang
 * indexnya sudah kecil hanya menambah tunggu tanpa menghemat apa-apa.
 */
function pecahBilaBesar(index, dir) {
  const BATAS_INDEX = 120 * 1024;
  if (Buffer.byteLength(JSON.stringify(index)) <= BATAS_INDEX) return { berkas: 0, bytes: 0 };

  let berkas = 0, bytes = 0;
  index.prov.forEach(function (p) {
    if (!p.kab || !p.kab.length) return;
    const isi = JSON.stringify({ n: p.n, kab: p.kab });
    fs.writeFileSync(path.join(dir, 'l1-' + p.k + '.json'), isi);
    berkas++; bytes += Buffer.byteLength(isi);
    delete p.kab;               /* tinggal { k, n } di dalam index */
  });
  index.pisah = true;           /* dibaca aplikasi: daftar L2 diambil terpisah */
  return { berkas: berkas, bytes: bytes };
}

/* -------------------------------------------------------------------- main */

async function main() {
  fs.mkdirSync(SINGGAH, { recursive: true });
  fs.mkdirSync(TUJUAN, { recursive: true });

  const diminta = process.argv.slice(2).map(function (s) { return s.toUpperCase(); });
  const daftar = diminta.length ? diminta : NEGARA;

  console.log('Mengambil tabel pembagian administratif…');
  const admin1 = bacaKode((await berkasSinggah('admin1CodesASCII.txt',
    'https://download.geonames.org/export/dump/admin1CodesASCII.txt')).toString('utf8'));
  const admin2 = bacaKode((await berkasSinggah('admin2Codes.txt',
    'https://download.geonames.org/export/dump/admin2Codes.txt')).toString('utf8'));

  const hasil = [], gagal = [];
  for (const kode of daftar) {
    let punyaPos = true;
    try {
      await berkasSinggah(kode + '.zip', 'https://download.geonames.org/export/zip/' + kode + '.zip');
    } catch (e) { punyaPos = false; }

    try {
      let r = null, alasan = null;

      if (punyaPos && !PAKAI_ADMIN[kode]) {
        r = susunNegara(kode, admin1);
        if (r && r.terlaluDatar) {
          alasan = 'berkas kode posnya berisi ' + r.terlaluDatar +
            ' nama tanpa induk wilayah — kemungkinan besar nama jalan';
          r = null;
        }
      } else if (PAKAI_ADMIN[kode]) {
        alasan = PAKAI_ADMIN[kode];
      }

      /* Jatuh ke daftar administratif: tanpa kode pos, tetapi wilayahnya benar. */
      if (!r) r = susunDariAdmin(kode, admin1, admin2, alasan);

      if (!r) { gagal.push(kode + ' (tidak ada data wilayah yang layak)'); continue; }
      hasil.push(r);
      console.log('  ' + kode + '  ' + r.tingkat + ' tingkat  ' +
        [r.l1, r.l2, r.l3, r.l4].filter(Boolean).join('/').padEnd(22) +
        String(r.kb).padStart(5) + ' KB' + (r.tanpaPos ? '   tanpa kode pos' : ''));
    } catch (e) {
      gagal.push(kode + ' (' + e.message + ')');
    }
  }

  console.log('');
  const tanpaPos = hasil.filter(function (r) { return r.tanpaPos; });
  console.log('Berhasil : ' + hasil.length + ' negara, ' +
    hasil.reduce(function (a, r) { return a + r.kb; }, 0) + ' KB total');
  if (tanpaPos.length) {
    console.log('Tanpa pos: ' + tanpaPos.map(function (r) { return r.kode; }).join(' ') +
      '  (wilayah lengkap, kode pos diketik sendiri)');
  }
  if (gagal.length) console.log('Dilewati : ' + gagal.join(', '));
  console.log('Atribusi : ' + ATRIBUSI + '  (wajib tetap ditampilkan)');
}

main().catch(function (e) {
  console.error('GAGAL: ' + e.message);
  process.exit(1);
});
