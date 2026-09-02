/* ==========================================================================
   impor.js — memasukkan struktur tempat dari berkas CSV
   --------------------------------------------------------------------------
   Mendaftarkan satu gedung dua puluh lantai lewat formulir berarti mengetik
   ratusan ruangan satu per satu. Yang punya datanya hampir selalu sudah
   memilikinya dalam bentuk lain — daftar ruangan dari pengelola gedung,
   lembar kerja inventaris, tabel dari sistem lama. Semuanya bisa disimpan
   sebagai CSV.

   SATU BARIS ADALAH SATU JALUR, BUKAN SATU CATATAN

   Bentuknya tabel datar: tiap baris menuliskan jalur lengkapnya dari lokasi
   sampai objek, dan induk yang sama diulang di baris berikutnya.

     Lokasi      ; Area        ; Bangunan ; Lantai ; Ruangan  ; Objek
     Menara Biru ; Gedung Utama; Tower A  ; Lt 1   ; Lobi      ; Lantai
     Menara Biru ; Gedung Utama; Tower A  ; Lt 1   ; Lobi      ; Kaca
     Menara Biru ; Gedung Utama; Tower A  ; Lt 1   ; Toilet Pria; Wastafel

   Pengulangan itu disengaja. Ia membuat berkasnya bisa disusun di aplikasi
   lembar kerja mana pun tanpa aturan khusus, bisa diurutkan dan disaring
   seperti tabel biasa, dan yang paling penting: bisa DIBACA manusia yang
   memeriksanya sebelum ditekan.

   KOSONG BERARTI BERHENTI, BUKAN BERARTI KOSONG

   Baris yang kolom Objek-nya kosong mendaftarkan ruangannya saja. Yang
   Ruangan dan Objek-nya kosong mendaftarkan lantainya saja. Begitu
   seterusnya ke atas. Ini yang membuat satu berkas bisa memuat halaman
   parkir tanpa bangunan bersama gedung dua puluh lantai.

   TIDAK ADA YANG DITULIS SEBELUM DIPERLIHATKAN

   urai() hanya MEMBACA dan menyusun rencana. Ia tidak menyentuh basis data
   sama sekali. terapkan() baru menulis, dan hanya atas rencana yang sudah
   dilihat manusia.

   Alasannya sederhana: impor adalah operasi yang paling sulit dibatalkan.
   Delapan ratus ruangan yang masuk dengan nama salah harus dihapus satu per
   satu, dan sebagian sudah terlanjur dipakai jadwal. Memperlihatkan lebih
   dulu memindahkan biaya kesalahan dari "sesudah" ke "sebelum".

   YANG SENGAJA TIDAK DITEBAK

   Jenis area dan jenis objek dicocokkan dengan daftar yang ada — lewat kode
   maupun nama Indonesianya. Yang tidak dikenali TIDAK diam-diam dijadikan
   "lainnya": ia dilaporkan sebagai peringatan dengan nomor barisnya, dan
   yang memeriksa boleh memutuskan sendiri. "Lainnya" yang muncul diam-diam
   pada tiga ratus baris berarti tiga ratus area yang jam kerjanya dihitung
   dengan laju yang salah, dan tidak ada satu pun tanda di layar.
   ========================================================================== */
var IMPOR = (function () {

  /* Nama kolom yang dikenali. Dicocokkan huruf kecil tanpa spasi, jadi
     "Luas Tanah", "luas_tanah", dan "LUASTANAH" sama-sama diterima —
     berkas yang datang dari sistem lain jarang rapi. */
  var KOLOM = {
    lokasi:       ['lokasi', 'site', 'location'],
    alamat:       ['alamat', 'address'],
    luastanah:    ['luastanah', 'luaslokasi', 'landarea'],
    area:         ['area', 'petak', 'zona'],
    jenisarea:    ['jenisarea', 'tipearea', 'areatype'],
    luasarea:     ['luasarea'],
    bangunan:     ['bangunan', 'gedung', 'building'],
    lantai:       ['lantai', 'floor', 'level'],
    ruangan:      ['ruangan', 'ruang', 'room'],
    jenisruangan: ['jenisruangan', 'tiperuangan', 'roomtype'],
    luasruangan:  ['luasruangan', 'luasruang', 'luas'],
    objek:        ['objek', 'object', 'item'],
    jenisobjek:   ['jenisobjek', 'tipeobjek', 'objecttype'],
    /* Dimensi objek. Tanpa kolom-kolom ini, satu gedung enam lantai
       menuntut lebih dari dua ratus objek diketik satu per satu lewat
       dialog — dan yang menuntut dua ratus dialog tidak akan pernah
       diisi, sehingga seluruh perhitungan yang berdiri di atas luas
       permukaan tidak pernah punya masukan. */
    panjang:      ['panjang', 'p', 'length'],
    lebar:        ['lebar', 'l', 'width'],
    tinggi:       ['tinggi', 't', 'height'],
    satuanDim:    ['satuanukuran', 'satuandim', 'unitukuran', 'dimunit'],
    jumlahObjek:  ['jumlah', 'jml', 'qty', 'banyak'],
    takaranMl:    ['takaran', 'takaranml', 'dosis', 'dose'],
    menitObjek:   ['menit', 'menitperkali', 'minutes'],
    kaliObjek:    ['kaliperminggu', 'kaliminggu', 'frekuensiobjek', 'perminggu']
  };

  function rapikan(s) {
    return String(s === null || s === undefined ? '' : s)
      .toLowerCase().replace(/[\s_\-.]/g, '');
  }

  /* ------------------------------------------------------------ pembacaan */

  /**
   * Pemisah kolom ditebak dari BARIS JUDULNYA, bukan diminta.
   *
   * Excel berbahasa Indonesia menyimpan CSV dengan titik koma; Google Sheets
   * dan kebanyakan alat lain memakai koma. Menanyakannya kepada yang memakai
   * berarti menanyakan sesuatu yang ia tidak tahu jawabannya — ia hanya
   * menekan "Simpan sebagai CSV".
   *
   * Yang dihitung adalah pemisah DI LUAR tanda kutip, karena alamat sering
   * mengandung koma di dalam kutipan dan itu bukan batas kolom.
   */
  function tebakPemisah(barisJudul) {
    var calon = [';', ',', '\t', '|'];
    var terbaik = ';', banyak = -1;
    calon.forEach(function (p) {
      var n = 0, kutip = false;
      for (var i = 0; i < barisJudul.length; i++) {
        var c = barisJudul[i];
        if (c === '"') kutip = !kutip;
        else if (c === p && !kutip) n++;
      }
      if (n > banyak) { banyak = n; terbaik = p; }
    });
    return banyak > 0 ? terbaik : ';';
  }

  /**
   * CSV menjadi larik dari larik.
   *
   * Ditulis sendiri, bukan dipecah dengan split. Nama ruangan yang benar
   * seperti "Ruang Rapat, Lantai 3" akan pecah menjadi dua kolom bila
   * dipecah lugas, dan yang memakainya baru sadar setelah delapan ratus
   * baris masuk dengan bentuk yang salah.
   */
  function uraiCsv(teks, pemisah) {
    var baris = [], sel = [], kini = '', kutip = false;
    /* BOM dari Excel dibuang — kalau tidak, judul kolom pertama menjadi
       "﻿Lokasi" dan tidak pernah cocok dengan apa pun. */
    teks = String(teks || '').replace(/^﻿/, '');
    for (var i = 0; i < teks.length; i++) {
      var c = teks[i];
      if (kutip) {
        if (c === '"') {
          if (teks[i + 1] === '"') { kini += '"'; i++; }
          else kutip = false;
        } else kini += c;
        continue;
      }
      if (c === '"') { kutip = true; continue; }
      if (c === pemisah) { sel.push(kini); kini = ''; continue; }
      if (c === '\r') continue;
      if (c === '\n') { sel.push(kini); baris.push(sel); sel = []; kini = ''; continue; }
      kini += c;
    }
    if (kini !== '' || sel.length) { sel.push(kini); baris.push(sel); }
    return baris;
  }

  /* ---------------------------------------------------------- pencocokan */

  /* Jenis dicocokkan lewat kode maupun nama tampilannya, supaya berkas yang
     ditulis manusia ("Toilet", "Taman") diterima sama seperti berkas yang
     lahir dari ekspor ("toilet", "taman"). */
  function cocokJenis(daftar, nilai) {
    var v = rapikan(nilai);
    if (!v) return null;
    for (var i = 0; i < daftar.length; i++) {
      if (rapikan(daftar[i].kode) === v) return daftar[i].kode;
    }
    for (var j = 0; j < daftar.length; j++) {
      if (rapikan(daftar[j].nama) === v) return daftar[j].kode;
      /* "Lantai / karpet" juga dikenali sebagai "lantai" — nama tampilan
         sering memuat penjelasan yang tidak ikut diketik orang. */
      var potong = String(daftar[j].nama).split('/')[0];
      if (rapikan(potong) === v) return daftar[j].kode;
    }
    return null;
  }

  /**
   * Angka dari sel yang ditulis manusia.
   *
   * Tiga hal yang harus ditangani, dan ketiganya pernah salah:
   *
   * 1. SATUAN YANG IKUT DIKETIK. "180 m2" sering ditulis di kolom luas.
   *    Membuang semua yang bukan angka menempelkan "2" dari "m2" ke
   *    belakangnya dan menghasilkan 1802 — sepuluh kali lipat, tanpa satu pun
   *    tanda di layar. Karena itu yang diambil adalah angka PERTAMA, dan
   *    sisanya diabaikan, bukan disaring.
   *
   * 2. RIBUAN VS DESIMAL. "1.234,5" (Indonesia) dan "1,234.5" (Inggris)
   *    dua-duanya 1234,5. Yang menentukan tanda mana pemisah desimalnya
   *    adalah yang muncul TERAKHIR.
   *
   * 3. SATU TANDA SAJA — dan di sinilah letak ketidakpastiannya. "1.200"
   *    berarti seribu dua ratus bagi yang menulisnya di Indonesia, dan satu
   *    koma dua bagi yang menulisnya dalam kebiasaan Inggris. Tidak ada cara
   *    mengetahuinya dari selnya sendiri.
   *
   *    Yang dipakai: tepat tiga angka di belakang tanda berarti RIBUAN,
   *    selain itu desimal. Jadi 1.200 dan 1,200 sama-sama 1200; 24.5, 24,5,
   *    dan 180.75 tetap pecahan. Aturannya sama untuk titik maupun koma,
   *    supaya berkas dari kedua kebiasaan terbaca sama.
   *
   *    Ini TEBAKAN, dan ia bisa salah untuk luas 1,200 m² yang sungguh-
   *    sungguh berarti 1,2 m². Luas sekecil itu praktis tidak ada dalam
   *    pekerjaan kebersihan, dan pratinjau memperlihatkan angkanya sebelum
   *    apa pun ditulis — yang salah masih bisa dibatalkan di sana.
   */
  function angka(v) {
    var s = String(v === null || v === undefined ? '' : v).trim();
    if (!s) return null;
    /* Angka pertama beserta pemisahnya. Apa pun sesudahnya bukan urusan. */
    var m = s.match(/-?\d[\d.,]*/);
    if (!m) return null;
    s = m[0].replace(/[.,]+$/, '');

    var titik = s.lastIndexOf('.'), koma = s.lastIndexOf(',');
    if (titik >= 0 && koma >= 0) {
      s = koma > titik ? s.replace(/\./g, '').replace(',', '.')
                       : s.replace(/,/g, '');
    } else if (titik >= 0 || koma >= 0) {
      var tanda = titik >= 0 ? '.' : ',';
      var pos = titik >= 0 ? titik : koma;
      var belakang = s.length - pos - 1;
      /* Lebih dari satu tanda yang sama selalu ribuan: "1.234.567". */
      var jumlahTanda = s.split(tanda).length - 1;
      if (jumlahTanda > 1 || belakang === 3) {
        s = s.split(tanda).join('');
      } else {
        s = s.replace(tanda, '.');
      }
    }
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  /* ================================================================ URAI */

  /**
   * Membaca teks CSV menjadi RENCANA. Tidak menulis apa pun.
   *
   * Yang dikembalikan:
   *   kolom     — kolom yang dikenali, dan yang diabaikan
   *   lokasi[]  — pohon yang akan dibuat, lengkap dengan penanda "sudah ada"
   *   ringkas   — berapa yang baru, berapa yang sudah ada, per tingkat
   *   masalah[] — baris yang tidak bisa dipakai, dengan NOMOR BARISNYA
   *   peringatan[] — yang bisa dipakai tetapi patut dilihat
   */
  function urai(korporatId, teks) {
    var baris = uraiCsv(teks, tebakPemisah(String(teks || '').split(/\r?\n/)[0] || ''));
    /* Baris kosong di ujung berkas — hampir setiap berkas punya. */
    baris = baris.filter(function (r) {
      return r.some(function (s) { return String(s).trim() !== ''; });
    });
    if (!baris.length) {
      return { error: I18N.t('Berkasnya kosong.') };
    }

    /* ---- kepala kolom ---- */
    var kepala = baris[0].map(rapikan);
    var peta = {}, diabaikan = [];
    kepala.forEach(function (h, i) {
      var ketemu = null;
      Object.keys(KOLOM).forEach(function (kunci) {
        if (KOLOM[kunci].indexOf(h) >= 0) ketemu = kunci;
      });
      if (ketemu && peta[ketemu] === undefined) peta[ketemu] = i;
      else if (String(baris[0][i]).trim()) diabaikan.push(String(baris[0][i]).trim());
    });

    if (peta.lokasi === undefined) {
      return { error: I18N.t('Kolom "Lokasi" tidak ditemukan. Baris pertama berkas ' +
        'harus berisi nama kolom — lihat contoh berkasnya.') };
    }

    function ambil(r, kunci) {
      var i = peta[kunci];
      return i === undefined ? '' : String(r[i] === undefined ? '' : r[i]).trim();
    }

    /* ---- yang sudah ada, supaya tidak dibuat dua kali ---- */
    var lokasiAda = {}, areaAda = {}, bangunanAda = {}, lantaiAda = {}, objekAda = {};
    (window.LOKASI ? LOKASI.semua(korporatId) : []).forEach(function (x) {
      lokasiAda[rapikan(x.nama)] = x.id;
    });
    MCS.area(korporatId, true).forEach(function (a) {
      /* Kunci memuat induknya: dua gedung boleh sama-sama punya "Toilet
         Lantai 1", dan menganggapnya satu ruangan akan menggabungkan dua
         tempat yang berbeda menjadi satu catatan. */
      var induk = a.lantaiId ? 'L' + a.lantaiId : 'K' + (a.lokasiId || '');
      areaAda[induk + '|' + rapikan(a.nama)] = a.id;
    });
    if (window.BANGUNAN) {
      MCS.area(korporatId, true).forEach(function (a) {
        BANGUNAN.semua(a.id, true).forEach(function (b) {
          bangunanAda[a.id + '|' + rapikan(b.nama)] = b.id;
          BANGUNAN.lantai(b.id).forEach(function (l) {
            lantaiAda[b.id + '|' + rapikan(l.nama)] = l.id;
          });
        });
      });
    }
    MCS.area(korporatId, true).forEach(function (a) {
      (MCS.objek(a.id, true) || []).forEach(function (o) {
        objekAda[a.id + '|' + rapikan(o.nama)] = o.id;
      });
    });

    /* ---- susun pohonnya ---- */
    var pohon = [], indeks = {}, masalah = [], peringatan = [];
    var hitung = { lokasi: 0, area: 0, bangunan: 0, lantai: 0, ruangan: 0, objek: 0 };
    var lama   = { lokasi: 0, area: 0, bangunan: 0, lantai: 0, ruangan: 0, objek: 0 };

    function simpul(daftar, kunci, buat) {
      if (indeks[kunci]) return indeks[kunci];
      var s = buat();
      indeks[kunci] = s;
      daftar.push(s);
      return s;
    }

    for (var n = 1; n < baris.length; n++) {
      var r = baris[n];
      var noBaris = n + 1;     /* nomor seperti yang dilihat di lembar kerja */

      var nLokasi = ambil(r, 'lokasi');
      if (!nLokasi) {
        masalah.push({ baris: noBaris, pesan: I18N.t('Kolom Lokasi kosong.') });
        continue;
      }

      /* --- lokasi --- */
      var kL = 'L:' + rapikan(nLokasi);
      var sL = simpul(pohon, kL, function () {
        var adaId = lokasiAda[rapikan(nLokasi)] || null;
        if (adaId) lama.lokasi++; else hitung.lokasi++;
        return { tingkat: 'lokasi', nama: nLokasi, adaId: adaId,
          alamat: ambil(r, 'alamat'), luasTanah: angka(ambil(r, 'luastanah')),
          anak: [] };
      });

      /* --- area --- */
      var nArea = ambil(r, 'area');
      if (!nArea) continue;
      var kA = kL + '|A:' + rapikan(nArea);
      var jA = ambil(r, 'jenisarea');
      var sA = simpul(sL.anak, kA, function () {
        var kode = cocokJenis(MCS.JENIS_AREA, jA);
        if (jA && !kode) {
          peringatan.push({ baris: noBaris, pesan:
            I18N.t('Jenis area "{v}" tidak dikenali — dipakai "Lainnya".')
              .replace('{v}', jA) });
        }
        var kunciAda = 'K' + (sL.adaId || '') + '|' + rapikan(nArea);
        var adaId = sL.adaId ? (areaAda[kunciAda] || null) : null;
        if (adaId) lama.area++; else hitung.area++;
        return { tingkat: 'area', nama: nArea, adaId: adaId,
          jenis: kode || 'lainnya', jenisAsli: jA,
          luas: angka(ambil(r, 'luasarea')), anak: [] };
      });

      /* --- bangunan --- */
      var nBgn = ambil(r, 'bangunan');
      if (!nBgn) {
        /* Ruangan tanpa bangunan tidak punya tempat berdiri. Dikatakan,
           bukan dilekatkan ke bangunan karangan. */
        if (ambil(r, 'ruangan')) {
          masalah.push({ baris: noBaris, pesan:
            I18N.t('Ada Ruangan tetapi kolom Bangunan kosong — ruangan harus ' +
              'berada di dalam sebuah bangunan.') });
        }
        continue;
      }
      var kB = kA + '|B:' + rapikan(nBgn);
      var sB = simpul(sA.anak, kB, function () {
        var adaId = sA.adaId ? (bangunanAda[sA.adaId + '|' + rapikan(nBgn)] || null) : null;
        if (adaId) lama.bangunan++; else hitung.bangunan++;
        return { tingkat: 'bangunan', nama: nBgn, adaId: adaId, anak: [] };
      });

      /* --- lantai --- */
      var nLt = ambil(r, 'lantai');
      if (!nLt) {
        if (ambil(r, 'ruangan')) {
          masalah.push({ baris: noBaris, pesan:
            I18N.t('Ada Ruangan tetapi kolom Lantai kosong.') });
        }
        continue;
      }
      var kLt = kB + '|T:' + rapikan(nLt);
      var sLt = simpul(sB.anak, kLt, function () {
        var adaId = sB.adaId ? (lantaiAda[sB.adaId + '|' + rapikan(nLt)] || null) : null;
        if (adaId) lama.lantai++; else hitung.lantai++;
        return { tingkat: 'lantai', nama: nLt, adaId: adaId, anak: [] };
      });

      /* --- ruangan --- */
      var nRg = ambil(r, 'ruangan');
      if (!nRg) continue;
      var kRg = kLt + '|R:' + rapikan(nRg);
      var jR = ambil(r, 'jenisruangan');
      var sRg = simpul(sLt.anak, kRg, function () {
        var kode = cocokJenis(MCS.JENIS_AREA, jR);
        if (jR && !kode) {
          peringatan.push({ baris: noBaris, pesan:
            I18N.t('Jenis ruangan "{v}" tidak dikenali — dipakai "Lainnya".')
              .replace('{v}', jR) });
        }
        var adaId = sLt.adaId ? (areaAda['L' + sLt.adaId + '|' + rapikan(nRg)] || null) : null;
        if (adaId) lama.ruangan++; else hitung.ruangan++;
        return { tingkat: 'ruangan', nama: nRg, adaId: adaId,
          jenis: kode || 'lainnya', jenisAsli: jR,
          luas: angka(ambil(r, 'luasruangan')), anak: [] };
      });

      /* --- objek --- */
      var nOb = ambil(r, 'objek');
      if (!nOb) continue;
      var kOb = kRg + '|O:' + rapikan(nOb);
      var jO = ambil(r, 'jenisobjek');
      simpul(sRg.anak, kOb, function () {
        var kode = cocokJenis(MCS.JENIS_OBJEK, jO);
        if (jO && !kode) {
          peringatan.push({ baris: noBaris, pesan:
            I18N.t('Jenis objek "{v}" tidak dikenali — dipakai "Lainnya".')
              .replace('{v}', jO) });
        }
        var adaId = sRg.adaId ? (objekAda[sRg.adaId + '|' + rapikan(nOb)] || null) : null;
        if (adaId) lama.objek++; else hitung.objek++;
        /* Satuan ukuran: cm bila tidak disebut. Meja ditulis 120, dinding
           ditulis 8 — dan yang menulis 8 tanpa menyebut satuannya hampir
           pasti bermaksud meter. Karena itu satuan yang tidak dikenali
           DIPERINGATKAN, bukan ditebak diam-diam. */
        var sd = rapikan(ambil(r, 'satuanDim'));
        if (sd && sd !== 'cm' && sd !== 'm') {
          peringatan.push({ baris: noBaris, pesan:
            I18N.t('Satuan ukuran "{v}" tidak dikenali — dipakai cm.')
              .replace('{v}', ambil(r, 'satuanDim')) });
          sd = '';
        }
        return { tingkat: 'objek', nama: nOb, adaId: adaId,
          jenis: kode || 'lainnya', jenisAsli: jO,
          panjang: angka(ambil(r, 'panjang')),
          lebar: angka(ambil(r, 'lebar')),
          tinggi: angka(ambil(r, 'tinggi')),
          satuanDim: sd === 'm' ? 'm' : 'cm',
          jumlah: angka(ambil(r, 'jumlahObjek')),
          takaranMl: angka(ambil(r, 'takaranMl')),
          menitPerKali: angka(ambil(r, 'menitObjek')),
          kaliPerMinggu: angka(ambil(r, 'kaliObjek')),
          anak: [] };
      });
    }

    return {
      ok: true,
      pohon: pohon,
      kolomDikenali: Object.keys(peta),
      kolomDiabaikan: diabaikan,
      barisData: baris.length - 1,
      baru: hitung, sudahAda: lama,
      totalBaru: hitung.lokasi + hitung.area + hitung.bangunan +
                 hitung.lantai + hitung.ruangan + hitung.objek,
      masalah: masalah, peringatan: peringatan
    };
  }

  /* ============================================================ TERAPKAN */

  /**
   * Menulis rencana ke basis data.
   *
   * Yang sudah ada TIDAK ditimpa — hanya dilewati. Impor kedua atas berkas
   * yang sama karena itu aman, dan menambahkan satu lantai ke berkas lama
   * lalu mengimpornya ulang hanya membuat lantai yang baru itu.
   *
   * Alasan tidak menimpa: berkas CSV tidak tahu apa yang sudah terjadi pada
   * ruangan itu sesudah didaftarkan — luasnya mungkin sudah diperbaiki di
   * lapangan, jenisnya sudah dibetulkan. Menimpa berarti mengembalikan data
   * lama di atas koreksi yang lebih benar.
   */
  function terapkan(korporatId, rencana) {
    if (!rencana || !rencana.ok) return { error: I18N.t('Rencana impor tidak sah.') };
    var dibuat = { lokasi: 0, area: 0, bangunan: 0, lantai: 0, ruangan: 0, objek: 0 };
    var diperbarui = { objek: 0 };
    var gagal = [];

    rencana.pohon.forEach(function (L) {
      var lokasiId = L.adaId;
      if (!lokasiId) {
        var rL = LOKASI.tambah(korporatId, {
          nama: L.nama, alamat: L.alamat || '',
          luasTanah: L.luasTanah === null ? undefined : L.luasTanah
        });
        if (rL.error) { gagal.push(L.nama + ': ' + rL.error); return; }
        lokasiId = rL.lokasi.id; dibuat.lokasi++;
      }

      L.anak.forEach(function (A) {
        var areaId = A.adaId;
        if (!areaId) {
          var rA = MCS.tambahArea(korporatId, {
            nama: A.nama, jenis: A.jenis, lokasiId: lokasiId,
            luas: A.luas === null ? undefined : A.luas
          });
          if (rA.error) { gagal.push(A.nama + ': ' + rA.error); return; }
          areaId = rA.area.id; dibuat.area++;
        }

        A.anak.forEach(function (B) {
          var bgnId = B.adaId;
          if (!bgnId) {
            var rB = BANGUNAN.tambah(korporatId, areaId, { nama: B.nama });
            if (rB.error) { gagal.push(B.nama + ': ' + rB.error); return; }
            bgnId = rB.bangunan.id; dibuat.bangunan++;
          }

          /* Lantai disimpan SEKALIGUS per bangunan.

             simpanLantai menerima daftar lengkap dan mempertahankan ruangan
             pada lantai yang namanya tidak berubah. Memanggilnya sekali per
             lantai berarti panggilan kedua mengirim daftar berisi satu nama
             dan menghapus lantai pertama beserta seluruh ruangannya. */
          var adaLt = BANGUNAN.lantai(bgnId).map(function (l) { return { nama: l.nama }; });
          var tambah = [];
          B.anak.forEach(function (T) {
            var sudah = adaLt.some(function (l) {
              return rapikan(l.nama) === rapikan(T.nama);
            });
            if (!sudah) { tambah.push({ nama: T.nama }); dibuat.lantai++; }
          });
          if (tambah.length) BANGUNAN.simpanLantai(bgnId, adaLt.concat(tambah));

          var petaLt = {};
          BANGUNAN.lantai(bgnId).forEach(function (l) { petaLt[rapikan(l.nama)] = l.id; });

          B.anak.forEach(function (T) {
            var lantaiId = petaLt[rapikan(T.nama)];
            if (!lantaiId) { gagal.push(T.nama + ': ' + I18N.t('lantai gagal dibuat')); return; }

            T.anak.forEach(function (R) {
              var ruangId = R.adaId;
              if (!ruangId) {
                var rR = MCS.tambahArea(korporatId, {
                  nama: R.nama, jenis: R.jenis, lantaiId: lantaiId,
                  luas: R.luas === null ? undefined : R.luas
                });
                if (rR.error) { gagal.push(R.nama + ': ' + rR.error); return; }
                ruangId = rR.area.id; dibuat.ruangan++;
              }

              R.anak.forEach(function (O) {
                /* UKURAN yang dibawa berkasnya. Yang kosong TIDAK dikirim
                   sebagai nol — nol berarti "diukur dan hasilnya nol",
                   sedangkan kosong berarti "belum diukur", dan keduanya
                   diperlakukan berbeda oleh perhitungan kebutuhan. */
                var isiO = {};
                ['panjang', 'lebar', 'tinggi', 'jumlah', 'takaranMl',
                 'menitPerKali', 'kaliPerMinggu']
                  .forEach(function (kk) {
                    if (O[kk] !== null && O[kk] !== undefined) isiO[kk] = O[kk];
                  });

                /* OBJEK YANG SUDAH ADA IKUT DIPERBARUI.

                   Sebelumnya baris ini berbunyi `if (O.adaId) return;` — objek
                   lama dilewati begitu saja. Akibatnya seorang pengelola yang
                   membetulkan ukuran di lembar kerjanya lalu mengimpor ulang
                   melihat laporan "0 gagal" dan menyimpulkan perbaikannya
                   masuk. Tidak ada satu pun yang berubah. Impor bahan sudah
                   memperbarui sejak awal; impor struktur tidak, dan selisih
                   perilaku itu tidak pernah dikatakan di mana pun.

                   Yang diperbarui HANYA ukuran. Nama dan jenis adalah kunci
                   pencocokannya — mengubahnya berarti objek lain. Kode pindai,
                   foto, dan status aktif tidak disentuh: itu milik lapangan,
                   bukan milik lembar kerja. Sel KOSONG tidak menghapus isian
                   yang sudah ada, karena berkas yang hanya memuat sebagian
                   kolom akan mengosongkan pengukuran yang susah payah
                   dikumpulkan — kerugian senyap yang tidak bisa dibatalkan. */
                if (O.adaId) {
                  if (!Object.keys(isiO).length) return;
                  /* MCS.ubahObjek adalah penyimpan FORMULIR UTUH: nama,
                     jenis, catatan, wajib-pindai dan status aktif selalu
                     ditulis ulang dari apa yang dikirim. Mengirim ukurannya
                     saja bukan berarti hanya ukurannya yang berubah — itu
                     berarti catatannya terhapus, wajib-pindainya mati, dan
                     panggilannya ditolak karena namanya kosong. Karena itu
                     nilai yang ADA dikirim kembali apa adanya. */
                  var lama = MCS.objekSatu(O.adaId);
                  if (!lama) return;
                  isiO.nama = lama.nama;
                  isiO.jenis = lama.jenis;
                  isiO.catatan = lama.catatan || '';
                  isiO.wajibPindai = !!lama.wajibPindai;
                  isiO.aktif = lama.aktif !== false;
                  isiO.urut = lama.urut;
                  /* Satuan ukuran hanya ikut bila barisnya memang membawa
                     ukuran — baris tanpa dimensi tidak boleh mengubah satuan
                     yang sudah tersimpan. */
                  if (isiO.panjang !== undefined || isiO.lebar !== undefined ||
                      isiO.tinggi !== undefined) {
                    isiO.satuanDim = O.satuanDim;
                  }
                  var rU = MCS.ubahObjek(O.adaId, isiO);
                  if (rU && rU.error) { gagal.push(O.nama + ': ' + rU.error); return; }
                  diperbarui.objek++;
                  return;
                }

                isiO.nama = O.nama; isiO.jenis = O.jenis;
                isiO.satuanDim = O.satuanDim;
                /* Untuk objek BARU, kosong membiarkan usulan bawaan jenisnya. */
                if (isiO.menitPerKali === undefined) {
                  isiO.menitPerKali = MCS.menitBaku(O.jenis);
                }
                if (isiO.takaranMl === undefined) {
                  isiO.takaranMl = MCS.takaranBaku(O.jenis);
                }
                var rO = MCS.tambahObjek(ruangId, isiO);
                if (rO.error) { gagal.push(O.nama + ': ' + rO.error); return; }
                dibuat.objek++;
              });
            });
          });
        });
      });
    });

    DB.save(true);
    return { ok: true, dibuat: dibuat, diperbarui: diperbarui, gagal: gagal,
      total: dibuat.lokasi + dibuat.area + dibuat.bangunan +
             dibuat.lantai + dibuat.ruangan + dibuat.objek };
  }

  /* ============================================================== CONTOH */

  /**
   * Berkas contoh yang bisa langsung diunduh, diisi, dan dikirim balik.
   *
   * Isinya BUKAN hanya baris kepala kosong. Contoh yang berisi memperlihatkan
   * bentuk yang diharapkan — termasuk bahwa induk memang diulang, dan bahwa
   * kolom di belakang boleh dikosongkan — dan itu menjawab lebih banyak
   * pertanyaan daripada halaman petunjuk mana pun.
   */
  function contohCsv() {
    var b = [
      ['Lokasi', 'Alamat', 'Luas tanah', 'Area', 'Jenis area', 'Luas area',
       'Bangunan', 'Lantai', 'Ruangan', 'Jenis ruangan', 'Luas ruangan',
       'Objek', 'Jenis objek', 'Panjang', 'Lebar', 'Tinggi', 'Satuan ukuran',
       'Jumlah', 'Takaran', 'Menit', 'Kali per minggu'],
      ['Menara Biru', 'Jl. Sudirman No. 1', '4000', 'Gedung Utama', 'Bangunan', '1200',
       'Tower A', 'Lantai 1', 'Lobi Utama', 'Lobi', '180', 'Lantai', 'Lantai',
       '18', '10', '', 'm', '', '', '', ''],
      /* Kaca dicuci SEMINGGU SEKALI walau lobinya disapu tiap hari — itulah
         gunanya kolom terakhir. Dikosongkan berarti ikut jadwal ruangannya. */
      ['Menara Biru', '', '', 'Gedung Utama', '', '',
       'Tower A', 'Lantai 1', 'Lobi Utama', 'Lobi', '180', 'Kaca Depan', 'Kaca',
       '3', '', '2,5', 'm', '6', '', '', '1'],
      ['Menara Biru', '', '', 'Gedung Utama', '', '',
       'Tower A', 'Lantai 1', 'Toilet Pria', 'Toilet', '24', 'Wastafel', 'Wastafel',
       '', '', '', '', '3', '20', '', '7'],
      ['Menara Biru', '', '', 'Gedung Utama', '', '',
       'Tower A', 'Lantai 2', 'Ruang Rapat', 'Rapat', '60', '', '',
       '', '', '', '', '', '', '', ''],
      ['Menara Biru', '', '', 'Halaman Depan', 'Taman', '400', '', '', '', '', '', '', '',
       '', '', '', '', '', '', '', ''],
      ['Menara Biru', '', '', 'Parkir Basement', 'Parkir', '800', '', '', '', '', '', '', '',
       '', '', '', '', '', '', '', '']
    ];
    return '﻿' + b.map(function (r) {
      return r.map(function (v) {
        var s = String(v);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  }

  /* ==================================================================
     BAHAN HABIS PAKAI
     ------------------------------------------------------------------
     Bentuk yang jauh lebih sederhana daripada struktur tempat: satu baris
     satu barang, tanpa induk, tanpa pengulangan. Yang membuatnya tidak
     sepele adalah tiga kolom yang menentukan kualitas seluruh perkiraan
     kebutuhan sesudahnya:

       · Cakupan m2   — berapa meter persegi dicakup satu satuan beli
       · Dipakai di   — jenis area tempat barang ini dipakai
       · Harga        — tanpa ini barang tidak ikut hitungan biaya sama sekali

     Ketiganya boleh kosong, dan barangnya tetap masuk. Tetapi pratinjau
     MENGHITUNG berapa yang kosong dan mengatakan akibatnya, karena tiga
     ratus barang yang masuk tanpa harga menghasilkan halaman biaya yang
     terlihat murah tanpa ada yang tahu sebabnya.
     ================================================================== */

  var KOLOM_STOK = {
    nama:      ['nama', 'namabarang', 'barang', 'item', 'name', 'produk'],
    satuan:    ['satuan', 'unit', 'uom'],
    harga:     ['harga', 'hargasatuan', 'hargabeli', 'price'],
    minimum:   ['minimum', 'stokminimum', 'batasminimum', 'minstock', 'min'],
    awal:      ['stokawal', 'stok', 'jumlah', 'qty', 'quantity', 'saldo'],
    isiNilai:  ['isi', 'isikemasan', 'volume', 'netto'],
    isiSatuan: ['satuanisi', 'isiunit'],
    cakupanM2: ['cakupan', 'cakupanm2', 'cakupanluas', 'coverage'],
    jenisArea: ['dipakaidiarea', 'dipakaidi', 'areapemakaian', 'lingkup', 'lingkuparea'],
    /* JENIS OBJEK yang dibersihkan barang ini — lebih tepat daripada jenis
       area, dan mengalahkannya bila diisi.

       Ketahuan perlunya saat satu gedung sungguhan dimasukkan: pembersih
       kaca berlingkup area 'lobi;kerja;rapat' diperkirakan butuh 958 botol
       sebulan seharga Rp27,8 juta — delapan puluh tiga persen dari seluruh
       daftar belanja — karena penyebutnya luas LANTAI ruangan-ruangan itu,
       bukan luas kacanya. Lingkup objek sudah ada di aplikasi sejak
       kemarin, tetapi tidak bisa diimpor, sehingga tidak pernah terpakai
       pada data yang masuk lewat CSV — yaitu semua data yang nyata. */
    jenisObjek: ['membersihkanobjek', 'jenisobjek', 'lingkupobjek', 'objek'],
    bahaya:    ['bahaya', 'kelasbahaya', 'hazard'],
    catatan:   ['catatan', 'keterangan', 'note', 'notes']
  };

  function uraiStok(korporatId, teks) {
    var baris = uraiCsv(teks, tebakPemisah(String(teks || '').split(/\r?\n/)[0] || ''));
    baris = baris.filter(function (r) {
      return r.some(function (v) { return String(v).trim() !== ''; });
    });
    if (!baris.length) return { error: I18N.t('Berkasnya kosong.') };

    var kepala = baris[0].map(rapikan);
    var peta = {}, diabaikan = [];
    kepala.forEach(function (h, i) {
      var ketemu = null;
      Object.keys(KOLOM_STOK).forEach(function (kunci) {
        if (KOLOM_STOK[kunci].indexOf(h) >= 0) ketemu = kunci;
      });
      if (ketemu && peta[ketemu] === undefined) peta[ketemu] = i;
      else if (String(baris[0][i]).trim()) diabaikan.push(String(baris[0][i]).trim());
    });

    if (peta.nama === undefined) {
      return { error: I18N.t('Kolom "Nama" tidak ditemukan. Baris pertama berkas ' +
        'harus berisi nama kolom — lihat contoh berkasnya.') };
    }

    function ambil(r, kunci) {
      var i = peta[kunci];
      return i === undefined ? '' : String(r[i] === undefined ? '' : r[i]).trim();
    }

    /* Nama yang sudah ada, supaya impor ulang tidak menggandakan. */
    var ada = {};
    MCS.stok(korporatId).forEach(function (x) { ada[rapikan(x.nama)] = x.id; });

    var daftar = [], masalah = [], peringatan = [];
    var tanpaHarga = 0, tanpaCakupan = 0, tanpaLingkup = 0, lama = 0;
    var terlihat = {};

    for (var n = 1; n < baris.length; n++) {
      var r = baris[n], noBaris = n + 1;
      var nama = ambil(r, 'nama');
      if (!nama) {
        masalah.push({ baris: noBaris, pesan: I18N.t('Kolom Nama kosong.') });
        continue;
      }
      var kunci = rapikan(nama);
      /* Nama ganda DI DALAM BERKAS ITU SENDIRI — lebih sering terjadi
         daripada dugaan, karena berkasnya sering hasil sambungan beberapa
         lembar kerja. Dikatakan, bukan diam-diam ditimpa. */
      if (terlihat[kunci]) {
        masalah.push({ baris: noBaris, pesan:
          I18N.t('"{v}" sudah ada di baris {b} berkas ini.')
            .replace('{v}', nama).replace('{b}', terlihat[kunci]) });
        continue;
      }
      terlihat[kunci] = noBaris;

      var adaId = ada[kunci] || null;
      if (adaId) lama++;

      /* --- satuan --- */
      var sat = ambil(r, 'satuan');
      var satKode = '';
      MCS.SATUAN.forEach(function (u) { if (rapikan(u) === rapikan(sat)) satKode = u; });
      if (sat && !satKode) {
        peringatan.push({ baris: noBaris, pesan:
          I18N.t('Satuan "{v}" tidak dikenali — dipakai "pcs".').replace('{v}', sat) });
      }

      /* --- jenis area --- */
      var lgTeks = ambil(r, 'jenisArea');
      var lg = [];
      if (lgTeks && !/^(semua|seluruh|all|\*)$/i.test(lgTeks.trim())) {
        lgTeks.split(/[,;|/]+/).forEach(function (bagian) {
          var kode = cocokJenis(MCS.JENIS_AREA, bagian);
          if (kode) { if (lg.indexOf(kode) < 0) lg.push(kode); }
          else if (bagian.trim()) {
            peringatan.push({ baris: noBaris, pesan:
              I18N.t('Jenis area "{v}" tidak dikenali — diabaikan.')
                .replace('{v}', bagian.trim()) });
          }
        });
      }
      if (!lg.length) tanpaLingkup++;

      /* --- jenis objek --- */
      var loTeks = ambil(r, 'jenisObjek');
      var lo = [];
      if (loTeks && !/^(semua|seluruh|all|\*)$/i.test(loTeks.trim())) {
        loTeks.split(/[,;|/]+/).forEach(function (bagian) {
          var kode = cocokJenis(MCS.JENIS_OBJEK, bagian);
          if (kode) { if (lo.indexOf(kode) < 0) lo.push(kode); }
          else if (bagian.trim()) {
            peringatan.push({ baris: noBaris, pesan:
              I18N.t('Jenis objek "{v}" tidak dikenali — diabaikan.')
                .replace('{v}', bagian.trim()) });
          }
        });
      }

      /* --- kelas bahaya --- */
      var bhTeks = ambil(r, 'bahaya');
      var bh = 'aman';
      if (bhTeks && window.K3 && K3.BAHAYA) {
        var k = cocokJenis(K3.BAHAYA, bhTeks);
        if (k) bh = k;
        else {
          peringatan.push({ baris: noBaris, pesan:
            I18N.t('Kelas bahaya "{v}" tidak dikenali — dianggap tidak berbahaya.')
              .replace('{v}', bhTeks) });
        }
      }

      var harga = angka(ambil(r, 'harga'));
      var cak = angka(ambil(r, 'cakupanM2'));
      if (!harga) tanpaHarga++;
      if (!cak) tanpaCakupan++;

      daftar.push({
        baris: noBaris, adaId: adaId, nama: nama,
        satuan: satKode || 'pcs',
        harga: harga, minimum: angka(ambil(r, 'minimum')),
        awal: angka(ambil(r, 'awal')),
        isiNilai: angka(ambil(r, 'isiNilai')),
        isiSatuan: ambil(r, 'isiSatuan') || 'ml',
        cakupanM2: cak, jenisArea: lg, jenisObjek: lo, bahaya: bh,
        catatan: ambil(r, 'catatan')
      });
    }

    return {
      ok: true, jenis: 'stok',
      daftar: daftar,
      barisData: baris.length - 1,
      kolomDiabaikan: diabaikan,
      baru: daftar.length - lama, sudahAda: lama,
      totalBaru: daftar.length - lama,
      /* Tiga angka yang menentukan mutu perkiraan sesudahnya. Disebut di
         pratinjau, bukan ditemukan sendiri sebulan kemudian. */
      tanpaHarga: tanpaHarga, tanpaCakupan: tanpaCakupan, tanpaLingkup: tanpaLingkup,
      masalah: masalah, peringatan: peringatan
    };
  }

  /**
   * Menulis barang ke basis data.
   *
   * Yang sudah ada DIPERBARUI di sini, berbeda dari impor struktur tempat.
   * Alasannya: berkas harga dari pemasok memang dikirim ulang tiap kuartal,
   * dan menolak memperbaruinya berarti seluruh harga harus diketik tangan.
   *
   * Yang TIDAK ikut diperbarui adalah stok awal — saldo dihitung dari
   * riwayat mutasi, dan menimpanya dari berkas berarti menghapus jejak
   * barang masuk dan keluar yang sudah tercatat.
   */
  function terapkanStok(korporatId, rencana, oleh) {
    if (!rencana || !rencana.ok) return { error: I18N.t('Rencana impor tidak sah.') };
    var dibuat = 0, diperbarui = 0, gagal = [];

    rencana.daftar.forEach(function (b) {
      var isi = {
        nama: b.nama, satuan: b.satuan,
        harga: b.harga === null ? 0 : b.harga,
        minimum: b.minimum === null ? 0 : b.minimum,
        isiNilai: b.isiNilai === null ? 0 : b.isiNilai,
        isiSatuan: b.isiSatuan,
        cakupanM2: b.cakupanM2 === null ? 0 : b.cakupanM2,
        jenisArea: b.jenisArea, jenisObjek: b.jenisObjek,
        bahaya: b.bahaya, catatan: b.catatan
      };
      if (b.adaId) {
        var r = MCS.ubahStok(b.adaId, isi);
        if (r && r.error) { gagal.push(b.nama + ': ' + r.error); return; }
        diperbarui++;
        return;
      }
      isi.awal = b.awal === null ? 0 : b.awal;
      var t = MCS.tambahStok(korporatId, isi);
      if (t.error) { gagal.push(b.nama + ': ' + t.error); return; }
      dibuat++;
    });

    DB.save(true);
    return { ok: true, dibuat: dibuat, diperbarui: diperbarui, gagal: gagal,
             total: dibuat + diperbarui };
  }

  function contohCsvStok() {
    var b = [
      ['Nama', 'Satuan', 'Harga', I18N.t('Stok awal'), 'Minimum', 'Isi', 'Satuan isi',
       'Cakupan m2', I18N.t('Dipakai di area'), 'Membersihkan objek', 'Bahaya', 'Catatan'],
      ['Pembersih Lantai Serbaguna', 'botol', '25.000', '40', '10', '1000', 'ml',
       '80', 'semua', 'Lantai', 'Iritasi kulit / mata', 'wangi lemon'],
      ['Pembersih Toilet', 'botol', '32.000', '24', '6', '500', 'ml',
       '', 'Toilet', 'Bilik;Wastafel;Urinoir', 'Korosif (asam / basa kuat)',
       'diukur per satuan, bukan per m²'],
      ['Pembersih Kaca', 'botol', '28.000', '18', '4', '500', 'ml',
       '60', '', 'Kaca;Cermin', 'Mengandung amonia',
       'dihitung terhadap luas kaca, bukan luas lantai'],
      ['Tisu Gulung', 'roll', '6.500', '200', '50', '', '', '', 'Toilet', '', '', ''],
      ['Kantong Sampah 60x90', 'pak', '18.000', '30', '8', '', '', '', 'semua', 'Tempat sampah', '', '']
    ];
    return '\ufeff' + b.map(function (r) {
      return r.map(function (v) {
        var t = String(v);
        return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      }).join(';');
    }).join('\r\n');
  }

  return { urai: urai, terapkan: terapkan, contohCsv: contohCsv,
           uraiStok: uraiStok, terapkanStok: terapkanStok,
           contohCsvStok: contohCsvStok,
           uraiCsv: uraiCsv, tebakPemisah: tebakPemisah, angka: angka };
})();
