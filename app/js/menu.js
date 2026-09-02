/* ==========================================================================
   menu.js — susunan menu samping yang bisa diatur Super Admin
   --------------------------------------------------------------------------
   APA YANG DIATUR, DAN APA YANG TIDAK

   Yang diatur hanya SUSUNAN: urutan menu, kelompok tempatnya berada, dan
   apakah ia ditampilkan. Yang TIDAK diatur adalah hak akses — menyembunyikan
   menu bukan cara mengamankan halaman. Halaman yang disembunyikan dari menu
   tetap bisa dibuka lewat alamatnya, dan yang menahannya adalah izin di
   akses.js. Mencampur keduanya membuat orang mengira sudah mengunci sesuatu
   padahal baru menyingkirkannya dari pandangan.

   TIGA HAL YANG MEMBUAT INI TIDAK SEKADAR MENYIMPAN DAFTAR

   1. Susunan tersimpan adalah PREFERENSI, bukan daftar putih.
      Halaman baru yang ditambahkan pengembang setelah susunan disimpan tidak
      ada di daftar itu. Kalau daftar dianggap final, menu baru akan lenyap
      diam-diam dan tidak ada yang tahu kenapa. Yang tidak dikenal selalu
      ikut tampil, di urutan paling belakang kelompoknya.

   2. Menu yang halamannya sudah tidak ada harus dibuang, bukan digambar.
      Sebaliknya juga: kunci lama yang tertinggal di susunan tidak boleh
      membuat menu kosong yang tidak bisa ditekan.

   3. Super Admin tidak boleh bisa mengunci dirinya sendiri.
      Menyembunyikan halaman pengaturan menu berarti tidak ada lagi jalan
      menampilkannya kembali. Halaman itu ditolak untuk disembunyikan — dan
      penolakannya di sini, bukan di layar, supaya tetap berlaku dari jalur
      mana pun.
   ========================================================================== */
var MENU = (function () {
  'use strict';

  /* Peran yang susunannya bisa diatur. Worker memakai bilah bawah dengan
     aturan slotnya sendiri, jadi tidak ikut di sini. */
  /* `id` adalah KUNCI PENYIMPANAN; `modul` adalah peran yang halamannya
     diatur. Untuk aplikasi pasar keduanya sama. Untuk korporat tidak —
     lihat peranTersedia() di bawah. */
  var PERAN = [
    { id: 'admin', modul: 'admin', nama: 'Admin & Supervisor' },
    { id: 'client', modul: 'client', nama: 'Klien' },
    { id: 'seller', modul: 'seller', nama: 'Mitra Toko' }
  ];

  /* ============================================= SUSUNAN PER KORPORAT
     MCS EXOCLEAN melayani BANYAK korporat dari satu pemasangan. Susunan
     yang disimpan di bawah kunci 'korporat' begitu saja akan berlaku untuk
     mereka semua sekaligus: satu korporat menyembunyikan menu Gaji, lima
     puluh korporat lain ikut kehilangannya, dan tidak ada yang bisa
     menebak sebabnya.

     Karena itu kuncinya disempitkan: kor:<korporatId>:<peran>. Halaman
     yang diatur tetap milik peran 'korporat' atau 'petugas' — yang
     berbeda hanya tempat menyimpannya. */
  function kunciKorporat(korporatId, role) {
    return 'kor:' + korporatId + ':' + role;
  }

  /**
   * Kunci susunan menu untuk seorang pengguna.
   *
   * Peran korporat dan petugas disempitkan per korporat; sisanya memakai
   * nama perannya apa adanya. Pengguna korporat TANPA korporatId jatuh ke
   * nama perannya — susunan bersama itu keliru, tetapi kehilangan menu
   * seluruhnya lebih buruk lagi.
   */
  function kunci(u) {
    if (!u) return '';
    if ((u.role === 'korporat' || u.role === 'petugas') && u.korporatId) {
      return kunciKorporat(u.korporatId, u.role);
    }
    return u.role;
  }

  /**
   * Susunan mana saja yang boleh diatur oleh pengguna ini.
   *
   * Staf korporat mengatur DUA susunan — miliknya sendiri dan milik petugas
   * kebersihannya — dan keduanya hanya untuk korporatnya sendiri. Ia tidak
   * pernah melihat, apalagi mengubah, susunan korporat lain.
   */
  function peranTersedia(u) {
    if (u && u.role === 'korporat' && u.korporatId) {
      return [
        { id: kunciKorporat(u.korporatId, 'korporat'), modul: 'korporat',
          nama: 'Staf Korporat' },
        { id: kunciKorporat(u.korporatId, 'petugas'), modul: 'petugas',
          nama: 'Petugas Kebersihan' }
      ];
    }
    return PERAN;
  }

  /* Halaman yang tidak boleh disembunyikan, apa pun alasannya. */
  var WAJIB_TAMPIL = ['setelanMenu'];

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.menu) { s.menu = {}; DB.save(); }
    return s.menu;
  }

  /** Susunan tersimpan untuk satu peran: { urutan:[], grup:{}, sembunyi:{} } */
  function untukPeran(role) {
    var c = config();
    if (!c[role]) c[role] = {};
    var r = c[role];
    /* Tiap bagian dibuatkan bila belum ada, bukan disyaratkan lengkap sejak
       awal: susunan yang tersimpan sebelum fitur bertingkat, nama, dan ikon
       ada tidak boleh dianggap rusak. */
    if (!r.urutan) r.urutan = [];
    if (!r.grup) r.grup = {};
    if (!r.sembunyi) r.sembunyi = {};
    if (!r.induk) r.induk = {};        /* key -> kunci menu induknya */
    if (!r.nama) r.nama = {};          /* key -> nama pilihan admin */
    if (!r.ikon) r.ikon = {};          /* key -> ikon pilihan admin */
    if (!r.maya) r.maya = [];          /* menu utama buatan admin */
    if (!r.grupBaru) r.grupBaru = [];  /* kelompok yang dibuat sendiri */
    return r;
  }

  function simpan(role, patch) {
    var r = untukPeran(role);
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    DB.save(true);
    return r;
  }

  function reset(role) {
    var c = config();
    delete c[role];
    DB.save(true);
  }

  /* Sudah diatur bila ADA SALAH SATU dari tiga hal yang berubah. Memeriksa
     urutan saja membuat layar berkata "masih bawaan" padahal admin baru saja
     memindahkan kelompok atau menyembunyikan menu — dan tombol "kembalikan ke
     bawaan" pun ikut tersembunyi, sehingga perubahannya tidak bisa dibatalkan. */
  function adaSusunan(role) {
    var c = config()[role];
    if (!c) return false;
    return (c.urutan || []).length > 0 || (c.maya || []).length > 0 ||
      (c.grupBaru || []).length > 0 ||
      ['grup', 'sembunyi', 'induk', 'nama', 'ikon'].some(function (k) {
        return Object.keys(c[k] || {}).length > 0;
      });
  }

  /* ============================================= KELOMPOK BUATAN ADMIN
     Kelompok BUKAN benda yang disimpan — ia disimpulkan dari menu-menu yang
     berada di dalamnya. "Keuangan" ada karena ada menu yang berkelompok
     Keuangan; pindahkan menu terakhirnya keluar dan kelompok itu lenyap
     dengan sendirinya, tanpa ada yang perlu membereskannya.

     Yang disimpan di sini cuma satu hal: kelompok yang sengaja dibuat admin
     tetapi BELUM ada isinya. Tanpa itu, kelompok baru akan hilang pada
     penggambaran berikutnya — admin menekan Buat, tidak terjadi apa-apa yang
     terlihat, dan tidak ada cara menebak kenapa. Begitu kelompoknya terisi,
     daftar ini tidak lagi menentukan apa pun.

     Nama dibandingkan lewat grupSerupa(), bukan disamakan mentah: kelompok
     digambar lewat penerjemah, jadi "Operasional" dan "Operations" tampil
     sebagai dua kelompok yang tulisannya persis sama. */
  function tambahGrup(role, pages, nama) {
    var n = String(nama || '').trim();
    if (!n) throw new Error(I18N.t('Nama kelompok tidak boleh kosong'));
    if (/[<>]/.test(n)) throw new Error(I18N.t('Nama kelompok tidak boleh memuat tanda kurung sudut.'));
    var serupa = grupSerupa(role, pages, n);
    if (serupa) {
      throw new Error(I18N.t('Kelompok “{v}” sudah ada.').replace('{v}', serupa));
    }
    var r = untukPeran(role);
    r.grupBaru.push(n.slice(0, 40));
    DB.save(true);
    return n.slice(0, 40);
  }

  /** Kelompok yang tercatat tetapi belum ada satu pun menu di dalamnya. */
  function grupKosong(role, pages) {
    var r = untukPeran(role);
    var terpakai = {};
    pages = gabung(role, pages);
    Object.keys(pages).forEach(function (k) {
      if (pages[k].tersembunyi) return;
      if (induk(role, k)) return;
      terpakai[grupDari(role, k, pages)] = true;
    });
    return r.grupBaru.filter(function (g) { return !terpakai[g]; });
  }

  /**
   * Buang satu kelompok. Hanya yang kosong — kelompok berisi tidak punya
   * arti untuk "dibuang": ia ada karena menunya ada, dan membuangnya berarti
   * memutuskan sendiri ke mana menu-menu itu harus pergi.
   */
  function hapusGrup(role, pages, nama) {
    if (grupKosong(role, pages).indexOf(nama) < 0) {
      throw new Error(I18N.t('Kelompok ini masih berisi menu. Pindahkan dulu isinya —') + ' ' +
        I18N.t('kelompok yang kosong hilang dengan sendirinya.'));
    }
    var r = untukPeran(role);
    var i = r.grupBaru.indexOf(nama);
    if (i >= 0) r.grupBaru.splice(i, 1);
    DB.save(true);
    return true;
  }

  /* ============================================ MENU UTAMA BUATAN ADMIN
     Sebuah menu utama buatan admin adalah WADAH, bukan halaman: ia tidak
     punya isi sendiri dan tidak pernah dibuka. Gunanya memecah daftar yang
     sudah terlalu panjang menjadi kelompok yang bisa dibuka-tutup, tanpa
     pengembang harus membuatkan halaman kosong untuk setiap wadah.

     Idnya diberi awalan sendiri supaya tidak mungkin bertabrakan dengan
     kunci halaman — kalau bertabrakan, wadah akan menimpa halaman sungguhan
     dan halaman itu lenyap dari menu tanpa jejak. */
  var MAYA_AWALAN = 'menu:';
  function adalahMaya(key) { return String(key || '').indexOf(MAYA_AWALAN) === 0; }

  function rekamMaya(role, key) {
    if (!adalahMaya(key)) return null;
    var a = untukPeran(role).maya, i;
    for (i = 0; i < a.length; i++) if (a[i].id === key) return a[i];
    return null;
  }

  /**
   * Daftar halaman ditambah wadah buatan admin, dalam satu bentuk yang sama.
   *
   * Semua yang menggambar menu memakai ini, supaya tidak ada satu pun tempat
   * yang harus bertanya "ini halaman sungguhan atau wadah?" — yang bertanya
   * cuma yang memang perlu tahu: penggambar sidebar (wadah tidak bisa dibuka)
   * dan layar pengaturan (wadah bisa dihapus).
   */
  function gabung(role, pages) {
    var r = untukPeran(role);
    if (!r.maya.length) return pages;     /* jalur biasa tidak perlu menyalin */
    var out = {};
    Object.keys(pages).forEach(function (k) { out[k] = pages[k]; });
    r.maya.forEach(function (m) {
      out[m.id] = { label: m.nama, icon: m.ikon || '📂', grup: m.grup || 'Menu', maya: true };
    });
    return out;
  }

  function tambahMaya(role, nama, ic, namaGrup) {
    var r = untukPeran(role);
    var n = String(nama || '').trim();
    if (!n) throw new Error(I18N.t('Nama menu utama tidak boleh kosong.'));
    if (/[<>]/.test(n)) throw new Error(I18N.t('Nama menu tidak boleh memuat tanda kurung sudut.'));
    /* Nomor urut disimpan dan tidak pernah mundur. Menghitung dari panjang
       daftar akan memberi id bekas milik wadah yang sudah dihapus, dan sisa
       rujukan lama akan menempel pada wadah baru yang tidak ada hubungannya. */
    r.mayaSeq = (r.mayaSeq || 0) + 1;
    var m = { id: MAYA_AWALAN + r.mayaSeq, nama: n.slice(0, 40),
              ikon: '', grup: String(namaGrup || '').trim() };
    var s = String(ic || '').trim();
    if (s && !/[<>]/.test(s)) m.ikon = potongTitikKode(s, 8);
    r.maya.push(m);
    DB.save(true);
    return m.id;
  }

  /**
   * Buang satu wadah. Anaknya DINAIKKAN jadi menu biasa, tidak ikut terbuang.
   *
   * Yang dihapus admin adalah wadahnya; hampir tidak pernah ada yang bermaksud
   * menghapus menu-menu di dalamnya sekaligus — dan kalau pun ada, memunculkan
   * kembali menu yang salah hilang jauh lebih sulit daripada menyembunyikannya
   * lagi satu per satu.
   */
  function hapusMaya(role, key) {
    var r = untukPeran(role);
    var i = -1;
    r.maya.forEach(function (m, x) { if (m.id === key) i = x; });
    if (i < 0) return false;
    var grupWadah = r.grup[key] || r.maya[i].grup || '';
    Object.keys(r.induk).forEach(function (k) {
      if (r.induk[k] !== key) return;
      delete r.induk[k];
      /* Anak yang naik tetap di kelompok tempat wadahnya berdiri, bukan
         terlempar balik ke kelompok bawaan halamannya — yang dilihat admin
         adalah menu itu tetap di tempatnya, hanya tidak lagi bersarang. */
      if (grupWadah) r.grup[k] = grupWadah;
    });
    r.maya.splice(i, 1);
    delete r.grup[key]; delete r.sembunyi[key];
    delete r.nama[key]; delete r.ikon[key];
    var j = r.urutan.indexOf(key);
    if (j >= 0) r.urutan.splice(j, 1);
    DB.save(true);
    return true;
  }

  /**
   * Kelompok tempat sebuah menu berada — hasil aturan admin bila ada,
   * atau bawaan halamannya.
   */
  function grupDari(role, key, pages) {
    var r = untukPeran(role);
    return r.grup[key] || (pages[key] && pages[key].grup) || 'Menu';
  }

  /* ================================================== NAMA & IKON PILIHAN
     Nama pilihan admin TIDAK diterjemahkan. Ia ditulis manusia dalam bahasa
     yang ia pilih sendiri; melewatkannya ke kamus akan mencari kunci yang
     tidak pernah ada, dan pada bahasa lain hasilnya tetap teks itu juga —
     hanya dengan satu pencarian sia-sia di tiap penggambaran.

     Label bawaan sebaliknya HARUS lewat kamus: itu teks aplikasi. */
  function label(role, key, pages) {
    /* Nama wadah selalu tulisan admin sendiri — tidak ada nama bawaan di
       baliknya, dan tidak ada yang perlu diterjemahkan. */
    var m = rekamMaya(role, key);
    if (m) return m.nama;
    var kustom = untukPeran(role).nama[key];
    if (kustom) return kustom;
    var p = pages && pages[key];
    return p ? I18N.t(p.label) : key;
  }
  function labelKustom(role, key) { return !!untukPeran(role).nama[key]; }

  function ikon(role, key, pages) {
    var m = rekamMaya(role, key);
    if (m) return m.ikon || '📂';
    var kustom = untukPeran(role).ikon[key];
    if (kustom) return kustom;
    var p = pages && pages[key];
    return p ? p.icon : '•';
  }

  function setNama(role, key, nama) {
    var r = untukPeran(role);
    var n = String(nama || '').trim();
    var m = rekamMaya(role, key);
    if (m) {
      /* Wadah tidak punya nama bawaan untuk dikembalikan. Nama kosong akan
         menyisakan menu tanpa tulisan yang tidak bisa ditunjuk lagi. */
      if (!n) throw new Error(I18N.t('Nama menu utama tidak boleh kosong.'));
      if (/[<>]/.test(n)) throw new Error(I18N.t('Nama menu tidak boleh memuat tanda kurung sudut.'));
      m.nama = n.slice(0, 40);
      DB.save(true);
      return;
    }
    if (!n) delete r.nama[key]; else r.nama[key] = n.slice(0, 40);
    DB.save(true);
  }
  /* Emoji BUKAN satu huruf. Kebanyakan tersusun dari dua satuan UTF-16, dan
     sebagian — bendera, keluarga, profesi — dari lima atau lebih yang
     disambung. Mengambil `s[0]` menyisakan separuh pasangan surrogate, dan
     yang tergambar adalah kotak rusak, bukan ikon yang dipilih.

     Karena itu yang disimpan adalah masukannya utuh, dipotong per titik-kode
     dan bukan per satuan. */
  function potongTitikKode(s, maks) {
    var out = '', n = 0, i = 0;
    while (i < s.length && n < maks) {
      var c = s.charCodeAt(i);
      var lebar = (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) ? 2 : 1;
      out += s.substr(i, lebar);
      i += lebar; n++;
    }
    return out;
  }

  function setIkon(role, key, ic) {
    var r = untukPeran(role);
    var s = String(ic || '').trim();
    if (!s) {
      var mk = rekamMaya(role, key);
      if (mk) mk.ikon = ''; else delete r.ikon[key];
      DB.save(true); return;
    }
    /* Ikon digambar ke dalam HTML sidebar setiap orang yang memegang peran
       ini. Penggambarnya sudah meng-escape, tetapi menolak tanda kurung
       sudut di sini menutup pintunya sejak awal dan memberi tahu admin
       sebabnya, alih-alih diam-diam menyimpan sesuatu yang bukan ikon. */
    if (/[<>]/.test(s)) throw new Error(I18N.t('Ikon hanya boleh berupa emoji atau huruf.'));
    var m = rekamMaya(role, key);
    if (m) { m.ikon = potongTitikKode(s, 8); DB.save(true); return; }
    r.ikon[key] = potongTitikKode(s, 8);
    DB.save(true);
  }

  /* ==================================================== MENU BERTINGKAT
     SATU tingkat saja, dan itu batas yang disengaja. Anak dari anak membuat
     menu yang harus dibuka dua kali sebelum terlihat, dan begitu induk
     tengahnya disembunyikan, cucunya lenyap tanpa ada tempat untuk
     menemukannya kembali. */
  function induk(role, key) { return untukPeran(role).induk[key] || null; }

  function anakDari(role, key, pages) {
    var r = untukPeran(role);
    return Object.keys(pages).filter(function (k) { return r.induk[k] === key; });
  }

  /** Boleh tidak `key` dijadikan anak dari `calonInduk`. */
  function bolehJadiAnak(role, key, calonInduk, pages) {
    if (!calonInduk) return { ok: true };
    if (calonInduk === key) return { ok: false, sebab: I18N.t('Menu tidak bisa menjadi anak dirinya sendiri.') };
    if (induk(role, calonInduk)) {
      return { ok: false, sebab: I18N.t('Menu itu sudah menjadi anak menu lain. Susunan menu hanya satu tingkat —') + ' ' +
        I18N.t('anak dari anak akan tersembunyi di balik dua ketukan dan hilang bila induk tengahnya disembunyikan.') };
    }
    if (anakDari(role, key, pages).length) {
      return { ok: false, sebab: I18N.t('Menu ini sudah punya anak. Pindahkan dulu anaknya sebelum ia sendiri') + ' ' +
        'dijadikan anak menu lain.' };
    }
    if (WAJIB_TAMPIL.indexOf(key) >= 0) {
      return { ok: false, sebab: I18N.t('Halaman ini harus tetap berdiri sendiri — ia satu-satunya jalan') + ' ' +
        I18N.t('untuk mengembalikan susunan menu.') };
    }
    if (adalahMaya(key)) {
      return { ok: false, sebab: I18N.t('Menu utama adalah wadah, dan wadah tidak bisa dimasukkan ke dalam') + ' ' +
        I18N.t('wadah lain. Pindahkan isinya bila ingin menggabungkan keduanya.') };
    }
    return { ok: true };
  }

  function setInduk(role, key, calonInduk, pages) {
    var cek = bolehJadiAnak(role, key, calonInduk, pages);
    if (!cek.ok) throw new Error(cek.sebab);
    var r = untukPeran(role);
    if (!calonInduk) delete r.induk[key];
    else {
      r.induk[key] = calonInduk;
      /* Anak ikut kelompok induknya. Membiarkannya di kelompok lain membuat
         ia digambar di bawah induk yang berada di kelompok berbeda — atau
         tidak digambar sama sekali. */
      delete r.grup[key];
    }
    DB.save(true);
  }

  function tersembunyi(role, key) {
    if (WAJIB_TAMPIL.indexOf(key) >= 0) return false;
    return !!untukPeran(role).sembunyi[key];
  }

  /**
   * Susun ulang halaman menurut aturan admin.
   *
   * Mengembalikan daftar kelompok siap gambar:
   *   [{ grup: 'Utama', keys: ['beranda', …] }, …]
   *
   * Halaman yang tersembunyi bawaan (tersembunyi:true pada definisinya)
   * TIDAK pernah ikut — itu halaman yang butuh parameter, bukan pilihan
   * tampilan, dan menampilkannya di menu menghasilkan layar kosong.
   */
  function susun(role, pages) {
    var r = untukPeran(role);
    pages = gabung(role, pages);
    var terlihat = Object.keys(pages).filter(function (k) {
      return !pages[k].tersembunyi && !tersembunyi(role, k);
    });

    /* Urutan tersimpan lebih dulu, lalu sisanya menurut urutan bawaan —
       supaya halaman yang baru ditambahkan pengembang tetap muncul. */
    var posisi = {};
    r.urutan.forEach(function (k, i) { posisi[k] = i; });
    var maks = r.urutan.length;
    var urut = terlihat.slice().sort(function (a, b) {
      var pa = posisi[a] === undefined ? maks + terlihat.indexOf(a) : posisi[a];
      var pb = posisi[b] === undefined ? maks + terlihat.indexOf(b) : posisi[b];
      return pa - pb;
    });

    /* Anak dikeluarkan dari daftar kelompok dan digantung pada induknya.
       Anak yang induknya sudah tidak ada — halamannya dihapus, atau induknya
       disembunyikan — DINAIKKAN menjadi menu biasa, bukan dibuang. Menu yang
       lenyap karena induknya lenyap adalah kehilangan yang tidak terlihat
       sebabnya oleh siapa pun. */
    var punyaAnak = {};
    urut.forEach(function (k) {
      var ind = induk(role, k);
      if (!ind) return;
      if (urut.indexOf(ind) < 0) return;      /* induknya tidak tampil → anak naik */
      (punyaAnak[ind] = punyaAnak[ind] || []).push(k);
    });

    var jadiAnak = {};
    Object.keys(punyaAnak).forEach(function (ind) {
      punyaAnak[ind].forEach(function (k) { jadiAnak[k] = true; });
    });

    var grup = {}, urutanGrup = [];
    urut.forEach(function (k) {
      if (jadiAnak[k]) return;
      var g = grupDari(role, k, pages);
      if (!grup[g]) { grup[g] = []; urutanGrup.push(g); }
      grup[g].push({ key: k, anak: punyaAnak[k] || [], maya: adalahMaya(k) });
    });

    /* Kelompok kosong buatan admin ikut dikembalikan — dengan isi nol.
       Penggambar sidebar melewatinya (judul tanpa apa-apa di bawahnya bukan
       menu), tetapi layar pengaturan membutuhkannya sebagai tempat menjatuhkan
       menu yang diseret ke sana. */
    r.grupBaru.forEach(function (g) {
      if (urutanGrup.indexOf(g) < 0) { urutanGrup.push(g); grup[g] = []; }
    });

    return urutanGrup.map(function (g) {
      return {
        grup: g,
        item: grup[g],
        /* keys tetap disediakan supaya pemanggil yang hanya butuh daftar rata
           — halaman pembuka, urutanBerlaku — tidak perlu tahu soal pohon. */
        keys: grup[g].reduce(function (a, x) { return a.concat([x.key], x.anak); }, [])
      };
    });
  }

  /** Nama kelompok yang sedang dipakai peran ini, untuk pemilih di layar. */
  function daftarGrup(role, pages) {
    var out = [];
    pages = gabung(role, pages);
    Object.keys(pages).forEach(function (k) {
      if (pages[k].tersembunyi) return;
      if (induk(role, k)) return;      /* anak ikut kelompok induknya */
      var g = grupDari(role, k, pages);
      if (out.indexOf(g) < 0) out.push(g);
    });
    untukPeran(role).grupBaru.forEach(function (g) {
      if (out.indexOf(g) < 0) out.push(g);
    });
    return out;
  }

  /* ================================================================ PERUBAHAN
     Semua perubahan bekerja pada SATU daftar utuh, lalu disimpan sekaligus.
     Menyimpan sebagian — hanya kunci yang bergeser, misalnya — meninggalkan
     susunan yang setengah lama setengah baru, dan itu tidak bisa diperbaiki
     tanpa mengetahui urutan sebelumnya. */

  /** Daftar kunci lengkap dalam urutan yang sedang berlaku. */
  function urutanBerlaku(role, pages) {
    var out = [];
    susun(role, pages).forEach(function (g) { out = out.concat(g.keys); });
    pages = gabung(role, pages);
    /* Yang sedang disembunyikan tetap ikut disimpan urutannya — kalau tidak,
       menampilkannya kembali akan melemparkannya ke ujung daftar. */
    Object.keys(pages).forEach(function (k) {
      if (!pages[k].tersembunyi && out.indexOf(k) < 0) out.push(k);
    });
    return out;
  }

  function geser(role, pages, key, arah) {
    var urut = urutanBerlaku(role, pages);
    var i = urut.indexOf(key);
    if (i < 0) return false;
    var j = i + arah;
    if (j < 0 || j >= urut.length) return false;
    urut.splice(j, 0, urut.splice(i, 1)[0]);
    simpan(role, { urutan: urut });
    return true;
  }

  /** Pindahkan `key` ke posisi tepat sebelum `sebelum` (null = paling akhir). */
  function pindahKe(role, pages, key, sebelum) {
    var urut = urutanBerlaku(role, pages);
    var i = urut.indexOf(key);
    if (i < 0) return false;
    urut.splice(i, 1);
    var j = sebelum ? urut.indexOf(sebelum) : -1;
    if (j < 0) urut.push(key); else urut.splice(j, 0, key);
    simpan(role, { urutan: urut });
    return true;
  }

  /**
   * Jadikan `key` anak dari `calonInduk`, lalu taruh ia sebagai anak TERAKHIR.
   *
   * Tanpa penempatan ulang, anak baru mendarat di posisi lamanya dalam urutan
   * rata — bisa di atas kakak-kakaknya, bisa di bawah, tergantung dari mana ia
   * diseret. Yang diharapkan orang setelah menjatuhkan sesuatu KE DALAM sebuah
   * menu adalah melihatnya muncul di ujung isinya, bukan menyelip entah di
   * mana.
   */
  function sarangkan(role, pages, key, calonInduk) {
    setInduk(role, key, calonInduk, gabung(role, pages));
    if (!calonInduk) return true;
    var urut = urutanBerlaku(role, pages);
    var saudara = urut.filter(function (k) {
      return k !== key && induk(role, k) === calonInduk; });
    var patokan = saudara.length ? saudara[saudara.length - 1] : calonInduk;
    var j = urut.indexOf(patokan);
    /* Disisipkan SEBELUM yang mengikuti patokan — itulah cara pindahKe()
       menaruh sesuatu, dan memanggilnya dengan patokan itu sendiri akan
       menaruhnya satu posisi terlalu ke atas. */
    var sesudah = j >= 0 && j + 1 < urut.length ? urut[j + 1] : null;
    if (sesudah === key) return true;
    return pindahKe(role, pages, key, sesudah);
  }

  /**
   * Nama kelompok yang SUDAH terpakai dan tampil sama persis di layar.
   *
   * Nama kelompok disimpan apa adanya, tetapi digambar lewat penerjemah:
   * "Operasional" tampil sebagai "Operations" dalam bahasa Inggris. Admin
   * yang mengetik "Operations" sebagai kelompok baru akan mendapat DUA
   * kelompok yang terlihat identik di menu — dan tidak akan pernah menebak
   * kenapa, karena keduanya benar-benar bertuliskan sama.
   */
  function grupSerupa(role, pages, calon) {
    var c = String(calon || '').trim().toLowerCase();
    if (!c) return null;
    var ketemu = null;
    daftarGrup(role, pages).forEach(function (g) {
      if (ketemu) return;
      if (g.toLowerCase() === c) { ketemu = g; return; }
      if (String(I18N.t(g)).toLowerCase() === c) ketemu = g;
    });
    return ketemu;
  }

  function setGrup(role, key, namaGrup) {
    var r = untukPeran(role);
    var g = String(namaGrup || '').trim();
    if (!g) delete r.grup[key]; else r.grup[key] = g;
    DB.save(true);
  }

  function setSembunyi(role, key, sembunyi) {
    if (sembunyi && WAJIB_TAMPIL.indexOf(key) >= 0) {
      throw new Error(I18N.t('Halaman ini tidak bisa disembunyikan — ia satu-satunya jalan') + ' ' +
        I18N.t('untuk menampilkan kembali menu yang lain.'));
    }
    var r = untukPeran(role);
    if (sembunyi) r.sembunyi[key] = true; else delete r.sembunyi[key];
    DB.save(true);
  }

  /** Ganti nama satu kelompok pada peran ini. */
  function namaiGrup(role, pages, lama, baru) {
    var b = String(baru || '').trim();
    if (!b) throw new Error(I18N.t('Nama kelompok tidak boleh kosong'));
    var r = untukPeran(role);
    pages = gabung(role, pages);
    Object.keys(pages).forEach(function (k) {
      if (pages[k].tersembunyi) return;
      if (grupDari(role, k, pages) === lama) r.grup[k] = b;
    });
    /* Kelompok yang masih kosong hanya hidup di catatan ini. Melewatkannya
       berarti namanya tetap yang lama setelah diganti — dan yang berubah di
       layar cuma kelompok yang kebetulan ada isinya. */
    var i = r.grupBaru.indexOf(lama);
    if (i >= 0) r.grupBaru[i] = b;
    DB.save(true);
  }

  return {
    PERAN: PERAN, WAJIB_TAMPIL: WAJIB_TAMPIL,
    kunci: kunci, kunciKorporat: kunciKorporat, peranTersedia: peranTersedia,
    config: config, untukPeran: untukPeran, simpan: simpan, reset: reset, adaSusunan: adaSusunan,
    susun: susun, daftarGrup: daftarGrup, grupSerupa: grupSerupa, grupDari: grupDari, tersembunyi: tersembunyi,
    label: label, labelKustom: labelKustom, ikon: ikon, setNama: setNama, setIkon: setIkon,
    induk: induk, anakDari: anakDari, bolehJadiAnak: bolehJadiAnak, setInduk: setInduk,
    gabung: gabung, adalahMaya: adalahMaya, tambahMaya: tambahMaya, hapusMaya: hapusMaya,
    sarangkan: sarangkan,
    tambahGrup: tambahGrup, hapusGrup: hapusGrup, grupKosong: grupKosong,
    urutanBerlaku: urutanBerlaku,
    geser: geser, pindahKe: pindahKe, setGrup: setGrup, setSembunyi: setSembunyi, namaiGrup: namaiGrup
  };
})();
