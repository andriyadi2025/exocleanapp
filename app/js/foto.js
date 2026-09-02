/* ==========================================================================
   foto.js — foto keluar dari localStorage
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Foto bukti kerja disimpan di localStorage bersama seluruh data lain, dan
   localStorage berkuota sekitar 5 MB. Satu foto yang sudah dikecilkan ke
   720px dengan kualitas 0,55 berukuran ±68 KB. Diukur di aplikasi ini:
   71 foto muat, dan satu gedung dengan 30 foto sehari mengisinya dalam
   DUA HARI SETENGAH.

   Yang terjadi setelah itu lebih buruk daripada sekadar gagal menyimpan.
   gcPhotos(true) membuang foto yatim lebih dulu; bila tidak ada yang yatim
   — artinya SEMUA foto masih dirujuk — ia membuang 20% foto tertua. Foto
   tertua adalah foto yang paling mungkin dibutuhkan sebagai bukti, karena
   sengketa datang belakangan, bukan pada hari yang sama. Bukti kerja
   dihapus otomatis, dan yang muncul hanya satu toast.

   KENAPA IndexedDB, BUKAN LOCALSTORAGE YANG DIRAPIKAN

   Tidak ada cara merapikan 5 MB menjadi cukup. IndexedDB tidak punya batas
   tetap: peramban memberinya bagian dari ruang disk yang tersisa — ratusan
   megabyte pada perangkat biasa. Batasnya berpindah dari "dua hari" menjadi
   "tidak akan tercapai dalam pemakaian normal".

   YANG SENGAJA TIDAK DIUBAH

   getPhoto(id) tetap SINKRON. Ia dipanggil di 29 tempat, hampir semuanya
   di dalam perakitan HTML: '<img src="' + DB.getPhoto(id) + '">'. Menjadikan
   ia asinkron berarti menulis ulang dua puluh sembilan tempat sekaligus,
   dan setiap penulisan ulang adalah kesempatan baru memasukkan bug ke kode
   yang sudah bekerja. Alasannya sama persis dengan alasan sync.js tidak
   mengasinkronkan DB.

   Karena itu bentuknya: IndexedDB adalah TEMPAT TINGGAL foto, salinan di
   memori adalah yang dibaca layar, dan localStorage tidak lagi memuat foto
   sama sekali.

   YANG DIUBAH KEMUDIAN: SALINAN DI MEMORI DIBATASI

   Mula-mula seluruh foto dimuat ke memori saat aplikasi dibuka. Diukur
   dengan seribu foto lapangan sungguhan: 249 MB memori dan 1,1 detik layar
   tertahan pada komputer meja — tiga sampai lima kali lipat di ponsel, yaitu
   perangkat yang justru dipakai petugas. Ponsel dengan memori kecil akan
   menutup paksa tabnya.

   Sekarang yang dibaca saat mulai hanyalah DAFTAR ID-nya, dan salinan di
   memori adalah singgahan terbatas yang membuang yang paling lama tidak
   dilihat. getPhoto tetap SINKRON — lihat catatan di db.js tentang bagaimana
   caranya tanpa menulis ulang tiga puluh tiga tempat.

   CATATAN LAMA, DIPERTAHANKAN SEBAGAI RIWAYAT

   Seluruh foto dimuat ke memori saat aplikasi dibuka. Untuk ratusan
   foto itu wajar; untuk puluhan ribu, tidak. Batas berikutnya adalah memori,
   bukan penyimpanan — dan ia diselesaikan dengan memuat foto hanya ketika
   dipakai, bukan dengan berkas ini.
   ========================================================================== */
var FOTO = (function () {

  var NAMA_DB = RUANG.kunci('foto');
  var TOKO = 'foto';
  var VERSI = 1;

  var db = null;
  /* null = belum dicoba, true/false = hasilnya. Dibedakan dari `db` supaya
     kegagalan membuka tidak dicoba ulang pada tiap penyimpanan foto. */
  var bisa = null;
  var alasanGagal = '';

  function ada() {
    try { return typeof indexedDB !== 'undefined' && !!indexedDB; }
    catch (e) { return false; }
  }

  /**
   * Buka basis datanya.
   *
   * SELALU berhasil sebagai Promise — kegagalannya dilaporkan lewat `bisa`,
   * bukan lewat penolakan. Aplikasi yang menolak dibuka karena IndexedDB
   * diblokir (mode penyamaran, kebijakan perusahaan) lebih buruk daripada
   * aplikasi yang berjalan dengan cara lama.
   */
  function buka() {
    if (db) return Promise.resolve(db);
    if (bisa === false) return Promise.resolve(null);
    if (!ada()) { bisa = false; alasanGagal = I18N.t('IndexedDB tidak tersedia'); return Promise.resolve(null); }

    return new Promise(function (selesai) {
      var p;
      try { p = indexedDB.open(NAMA_DB, VERSI); }
      catch (e) { bisa = false; alasanGagal = e.message; return selesai(null); }

      p.onupgradeneeded = function () {
        var d = p.result;
        if (!d.objectStoreNames.contains(TOKO)) d.createObjectStore(TOKO);
      };
      p.onsuccess = function () { db = p.result; bisa = true; selesai(db); };
      p.onerror = function () {
        bisa = false;
        alasanGagal = (p.error && p.error.message) || I18N.t('gagal membuka IndexedDB');
        selesai(null);
      };
      /* Diblokir berarti ada tab lain yang menahan versi lama. Menunggu tanpa
         batas membuat aplikasi tidak pernah selesai dibuka. */
      p.onblocked = function () {
        bisa = false;
        alasanGagal = I18N.t('ada tab lain yang masih membuka versi lama');
        selesai(null);
      };
    });
  }

  function transaksi(mode) {
    if (!db) return null;
    try { return db.transaction(TOKO, mode).objectStore(TOKO); }
    catch (e) { return null; }
  }

  /** Baca SELURUH foto sebagai { id: dataURL }. Dipakai saat aplikasi dibuka. */
  /**
   * Daftar id foto yang tersimpan — TANPA isinya.
   *
   * Inilah yang dibaca saat aplikasi dibuka. Seribu id berukuran sekitar 20 KB;
   * seribu fotonya berukuran 249 MB. Yang perlu diketahui saat mulai hanyalah
   * foto mana yang ADA, supaya layar tahu ia harus menunggu gambar dan bukan
   * menampilkan kotak kosong. Isinya diambil ketika benar-benar akan digambar.
   */
  function kunci() {
    return buka().then(function (d) {
      if (!d) return null;
      return new Promise(function (selesai) {
        var t = transaksi('readonly');
        if (!t) return selesai(null);
        var r = t.getAllKeys();
        r.onsuccess = function () { selesai(r.result || []); };
        r.onerror = function () { selesai(null); };
      });
    });
  }

  /** Satu foto. Mengembalikan null bila tidak ada — tidak pernah menolak. */
  function satu(id) {
    return buka().then(function (d) {
      if (!d) return null;
      return new Promise(function (selesai) {
        var t = transaksi('readonly');
        if (!t) return selesai(null);
        var r = t.get(id);
        r.onsuccess = function () { selesai(r.result || null); };
        r.onerror = function () { selesai(null); };
      });
    });
  }

  /**
   * Beberapa foto sekaligus.
   *
   * Satu transaksi untuk seluruh daftar, bukan satu transaksi per foto.
   * Dua puluh gambar pada satu layar yang masing-masing membuka transaksinya
   * sendiri membuat IndexedDB mengantre dan gambarnya muncul satu per satu
   * seperti halaman rusak.
   */
  function beberapa(ids) {
    return buka().then(function (d) {
      if (!d || !ids || !ids.length) return {};
      return new Promise(function (selesai) {
        var t = transaksi('readonly');
        if (!t) return selesai({});
        var out = {}, sisa = ids.length;
        ids.forEach(function (id) {
          var r = t.get(id);
          r.onsuccess = function () {
            if (r.result) out[id] = r.result;
            if (!--sisa) selesai(out);
          };
          r.onerror = function () { if (!--sisa) selesai(out); };
        });
      });
    });
  }

  function semua() {
    return buka().then(function (d) {
      if (!d) return null;
      return new Promise(function (selesai) {
        var out = {};
        var t = transaksi('readonly');
        if (!t) return selesai(null);
        var kur = t.openCursor();
        kur.onsuccess = function () {
          var c = kur.result;
          if (!c) return selesai(out);
          out[c.key] = c.value;
          c.continue();
        };
        kur.onerror = function () { selesai(null); };
      });
    });
  }

  function simpan(id, dataUrl) {
    return buka().then(function (d) {
      if (!d) return false;
      return new Promise(function (selesai) {
        var t = transaksi('readwrite');
        if (!t) return selesai(false);
        var r = t.put(dataUrl, id);
        r.onsuccess = function () { selesai(true); };
        r.onerror = function () { selesai(false); };
      });
    });
  }

  /** Simpan banyak sekaligus dalam SATU transaksi — dipakai saat pemindahan. */
  function simpanBanyak(peta) {
    var kunci = Object.keys(peta || {});
    if (!kunci.length) return Promise.resolve(0);
    return buka().then(function (d) {
      if (!d) return 0;
      return new Promise(function (selesai) {
        var t;
        try { t = d.transaction(TOKO, 'readwrite'); }
        catch (e) { return selesai(0); }
        var toko = t.objectStore(TOKO);
        kunci.forEach(function (k) { try { toko.put(peta[k], k); } catch (e) {} });
        /* Dihitung pada oncomplete, bukan pada tiap onsuccess: yang menentukan
           foto benar-benar tersimpan adalah transaksinya selesai, bukan
           permintaannya diterima. */
        t.oncomplete = function () { selesai(kunci.length); };
        t.onerror = function () { selesai(0); };
        t.onabort = function () { selesai(0); };
      });
    });
  }

  function hapus(id) {
    return buka().then(function (d) {
      if (!d) return false;
      return new Promise(function (selesai) {
        var t = transaksi('readwrite');
        if (!t) return selesai(false);
        var r = t.delete(id);
        r.onsuccess = function () { selesai(true); };
        r.onerror = function () { selesai(false); };
      });
    });
  }

  function hapusBanyak(ids) {
    if (!ids || !ids.length) return Promise.resolve(0);
    return buka().then(function (d) {
      if (!d) return 0;
      return new Promise(function (selesai) {
        var t;
        try { t = d.transaction(TOKO, 'readwrite'); }
        catch (e) { return selesai(0); }
        var toko = t.objectStore(TOKO);
        ids.forEach(function (k) { try { toko.delete(k); } catch (e) {} });
        t.oncomplete = function () { selesai(ids.length); };
        t.onerror = function () { selesai(0); };
        t.onabort = function () { selesai(0); };
      });
    });
  }

  /** Berapa foto dan berapa besar. Dipakai layar pengaturan. */
  function ukuran() {
    return semua().then(function (p) {
      if (!p) return { siap: false, n: 0, byte: 0, alasan: alasanGagal };
      var n = 0, b = 0;
      Object.keys(p).forEach(function (k) { n++; b += String(p[k]).length; });
      return { siap: true, n: n, byte: b, alasan: '' };
    });
  }

  /**
   * Berapa ruang yang masih diberikan peramban.
   *
   * Angka ini PERKIRAAN dan bukan janji: peramban boleh mengubahnya ketika
   * disknya menipis. Ia dipakai untuk memperingatkan lebih awal, bukan untuk
   * menghitung berapa foto lagi yang boleh diambil.
   */
  function ruang() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return Promise.resolve(null);
    }
    return navigator.storage.estimate().then(function (e) {
      return { dipakai: e.usage || 0, kuota: e.quota || 0 };
    }).catch(function () { return null; });
  }

  /**
   * Minta peramban TIDAK membuang penyimpanan ini saat disk menipis.
   *
   * Tanpa ini, IndexedDB berstatus "best-effort": peramban boleh
   * membersihkannya sendiri tanpa memberi tahu siapa pun — persis kegagalan
   * yang sedang kita hilangkan, hanya pada tingkat yang berbeda. Peramban
   * boleh menolak permintaan ini, dan penolakannya bukan galat.
   */
  function awetkan() {
    if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
    return navigator.storage.persisted().then(function (sudah) {
      if (sudah) return true;
      return navigator.storage.persist();
    }).catch(function () { return false; });
  }

  return {
    buka: buka, semua: semua, kunci: kunci, satu: satu, beberapa: beberapa,
    simpan: simpan, simpanBanyak: simpanBanyak,
    hapus: hapus, hapusBanyak: hapusBanyak, ukuran: ukuran,
    ruang: ruang, awetkan: awetkan,
    siap: function () { return bisa === true; },
    alasan: function () { return alasanGagal; }
  };
})();
