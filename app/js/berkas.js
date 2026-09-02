/* ==========================================================================
   berkas.js — penyimpanan lampiran (foto, video, dokumen)
   --------------------------------------------------------------------------
   KENAPA TIDAK IKUT DB.js?

   Seluruh data aplikasi ini tinggal di localStorage, yang kuotanya hanya
   sekitar 5 MB dan hanya bisa menyimpan teks — sebuah video 30 detik saja
   sudah melampauinya berkali-kali lipat, dan menyimpannya sebagai dataURL
   justru menggelembungkannya ~33% lagi. Memaksakannya ke sana akan membuat
   seluruh basis data gagal disimpan, bukan cuma lampirannya.

   Maka byte-nya ditaruh di IndexedDB sebagai Blob: kuotanya ratusan MB
   hingga bergiga-giga, dan Blob disimpan apa adanya tanpa pembengkakan.
   Yang tetap tinggal di localStorage hanyalah KETERANGAN lampiran (nama,
   ukuran, jenis) plus satu thumbnail kecil, supaya daftar pesan tetap bisa
   digambar seketika tanpa menunggu pembacaan asinkron.

   CATATAN UNTUK VERSI PRODUKSI
   Di sini lampiran tersimpan di perangkat masing-masing, jadi kendali
   aksesnya ada di lapisan tampilan. Begitu berpindah ke server sungguhan,
   berkas harus dilayani lewat URL bertanda tangan yang memeriksa keanggotaan
   ruang di sisi server — tanpa itu, siapa pun yang menebak ID bisa mengunduh
   lampiran milik orang lain.
   ========================================================================== */
var BERKAS = (function () {

  var NAMA_DB = RUANG.kunci('berkas');
  var TOKO = 'lampiran';
  var VERSI = 1;

  var db = null;
  var didukung = null;          /* null = belum diperiksa */
  var cacheUrl = {};            /* id -> objectURL yang sedang dipakai */

  /* Batas ukuran. Video dibiarkan besar karena memang begitu sifatnya, tetapi
     tetap dibatasi supaya satu pesan tidak menghabiskan kuota perangkat. */
  var BATAS = {
    foto: 25 * 1024 * 1024,     /* sumber sebelum dikompres */
    video: 50 * 1024 * 1024,
    berkas: 20 * 1024 * 1024,
    perPesan: 6
  };

  /* Kompresi foto: jauh lebih besar daripada foto laporan pekerjaan (720px)
     karena lampiran obrolan sering dipakai untuk menunjukkan detail — noda,
     goresan, label bahan kimia — yang hilang bila terlalu kecil. */
  var FOTO_SISI = 1600;
  var FOTO_MUTU = 0.82;
  var THUMB_SISI = 320;
  var THUMB_MUTU = 0.6;

  /* Ekstensi yang ditolak: berkas yang bisa dijalankan tidak punya alasan
     untuk berpindah tangan lewat obrolan layanan kebersihan, dan menolaknya
     di muka jauh lebih murah daripada menjelaskannya setelah terjadi. */
  var TERLARANG = ['exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'vbs', 'js',
    'jse', 'wsf', 'jar', 'apk', 'sh', 'dll', 'cpl', 'hta', 'lnk', 'reg', 'iso'];

  /* ================================================================ INDEXEDDB */
  function buka() {
    if (db) return Promise.resolve(db);
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { didukung = false; reject(new Error(I18N.t('IndexedDB tidak tersedia'))); return; }
      var req;
      try { req = indexedDB.open(NAMA_DB, VERSI); }
      catch (e) { didukung = false; reject(e); return; }

      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(TOKO)) d.createObjectStore(TOKO, { keyPath: 'id' });
      };
      req.onsuccess = function () { db = req.result; didukung = true; resolve(db); };
      req.onerror = function () { didukung = false; reject(req.error || new Error(I18N.t('Gagal membuka penyimpanan berkas'))); };
      /* Mode penyamaran di sebagian browser menggantung permintaan tanpa
         pernah memanggil onerror; batas waktu mencegah UI ikut menggantung. */
      setTimeout(function () { if (!db && didukung === null) { didukung = false; reject(new Error(I18N.t('Penyimpanan berkas tidak merespons'))); } }, 4000);
    });
  }

  function transaksi(mode) {
    return buka().then(function (d) { return d.transaction(TOKO, mode).objectStore(TOKO); });
  }

  function janji(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /** Sekali panggil saat aplikasi mulai; menentukan apakah tombol lampiran tampil. */
  function siap() {
    return buka().then(function () { return true; }).catch(function () { return false; });
  }
  function tersedia() { return didukung === true; }

  /* ================================================================ CRUD BLOB */
  function simpan(blob, meta) {
    var id = U.uid('lam');
    return transaksi('readwrite').then(function (s) {
      return janji(s.put({ id: id, blob: blob, mime: blob.type, ukuran: blob.size,
        nama: (meta && meta.nama) || '', at: U.nowISO() }));
    }).then(function () { return id; });
  }

  function ambil(id) {
    return transaksi('readonly').then(function (s) { return janji(s.get(id)); })
      .then(function (r) { return r ? r.blob : null; })
      .catch(function () { return null; });
  }

  /**
   * URL sementara untuk menampilkan/mengunduh. Di-cache per id supaya membuka
   * berkas yang sama dua kali tidak membuat dua objectURL yang bocor.
   */
  function url(id) {
    if (cacheUrl[id]) return Promise.resolve(cacheUrl[id]);
    return ambil(id).then(function (b) {
      if (!b) return null;
      cacheUrl[id] = URL.createObjectURL(b);
      return cacheUrl[id];
    });
  }

  function bebaskanSemua() {
    Object.keys(cacheUrl).forEach(function (id) {
      try { URL.revokeObjectURL(cacheUrl[id]); } catch (e) { /* sudah dilepas */ }
      delete cacheUrl[id];
    });
  }

  function hapus(id) {
    if (cacheUrl[id]) { try { URL.revokeObjectURL(cacheUrl[id]); } catch (e) {} delete cacheUrl[id]; }
    return transaksi('readwrite').then(function (s) { return janji(s.delete(id)); })
      .catch(function () { return null; });
  }

  function semuaId() {
    return transaksi('readonly').then(function (s) { return janji(s.getAllKeys()); })
      .catch(function () { return []; });
  }

  /** Ringkasan pemakaian, untuk ditampilkan di halaman pengaturan. */
  function pakai() {
    return transaksi('readonly').then(function (s) { return janji(s.getAll()); })
      .then(function (rows) {
        return { jumlah: rows.length,
          bytes: rows.reduce(function (a, r) { return a + (r.ukuran || 0); }, 0) };
      }).catch(function () { return { jumlah: 0, bytes: 0 }; });
  }

  /**
   * Buang blob yang tidak lagi dirujuk pesan mana pun. Dijalankan sekali saat
   * aplikasi dibuka — tanpa ini, lampiran pada pesan yang terhapus akan terus
   * memakan kuota perangkat tanpa pernah bisa dibuka lagi.
   */
  function rapikan() {
    if (!tersedia()) return Promise.resolve(0);
    var dipakai = {};
    DB.all('chatPesan').forEach(function (m) {
      (m.lampiran || []).forEach(function (l) { dipakai[l.id] = 1; });
    });
    return semuaId().then(function (ids) {
      var yatim = ids.filter(function (id) { return !dipakai[id]; });
      return Promise.all(yatim.map(hapus)).then(function () { return yatim.length; });
    });
  }

  /* ================================================================ PENYIAPAN */
  function ext(nama) {
    var m = String(nama || '').match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : '';
  }

  function jenis(file) {
    var t = file.type || '';
    if (t.indexOf('image/') === 0) return 'foto';
    if (t.indexOf('video/') === 0) return 'video';
    return 'berkas';
  }

  function ukuranTeks(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function ikon(l) {
    if (l.jenis === 'foto') return '🖼️';
    if (l.jenis === 'video') return '🎬';
    var e = ext(l.nama);
    if (e === 'pdf') return '📕';
    if (['doc', 'docx', 'odt', 'rtf'].indexOf(e) >= 0) return '📘';
    if (['xls', 'xlsx', 'csv', 'ods'].indexOf(e) >= 0) return '📗';
    if (['ppt', 'pptx'].indexOf(e) >= 0) return '📙';
    if (['zip', 'rar', '7z'].indexOf(e) >= 0) return '🗜️';
    return '📎';
  }

  /** dataURL thumbnail dari sebuah <img>/<video> yang sudah termuat. */
  function petikThumb(sumber, w, h) {
    var s = Math.min(1, THUMB_SISI / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(sumber, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', THUMB_MUTU);
  }

  /** Kompres foto menjadi Blob JPEG + thumbnail. */
  function olahFoto(file) {
    return new Promise(function (resolve, reject) {
      var src = URL.createObjectURL(file);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error(I18N.t('Berkas ini bukan gambar yang bisa dibaca'))); };
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var s = Math.min(1, FOTO_SISI / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var thumb = petikThumb(img, w, h);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(src);
          if (!blob) { reject(new Error(I18N.t('Gagal memproses gambar'))); return; }
          resolve({ blob: blob, thumb: thumb, w: c.width, h: c.height });
        }, 'image/jpeg', FOTO_MUTU);
      };
      img.src = src;
    });
  }

  /**
   * Video tidak dikompres — melakukannya di browser butuh transcoding yang
   * berat dan lambat. Yang diambil hanya satu bingkai untuk thumbnail dan
   * durasinya, sehingga daftar pesan tetap ringan meski videonya besar.
   */
  function olahVideo(file) {
    return new Promise(function (resolve) {
      var src = URL.createObjectURL(file);
      var v = document.createElement('video');
      var selesai = false;
      function tuntas(hasil) {
        if (selesai) return;
        selesai = true;
        URL.revokeObjectURL(src);
        resolve(hasil);
      }
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = function () {
        try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); }
        catch (e) { tuntas({ blob: file, thumb: null, durasi: v.duration || 0 }); }
      };
      v.onseeked = function () {
        var thumb = null;
        try { thumb = petikThumb(v, v.videoWidth || 320, v.videoHeight || 180); }
        catch (e) { /* video dengan proteksi tidak bisa dipetik — biarkan kosong */ }
        tuntas({ blob: file, thumb: thumb, durasi: v.duration || 0,
                 w: v.videoWidth, h: v.videoHeight });
      };
      v.onerror = function () { tuntas({ blob: file, thumb: null, durasi: 0 }); };
      /* Sebagian codec tidak bisa dipetik bingkainya di browser ini; jangan
         sampai kegagalan thumbnail ikut membatalkan pengirimannya. */
      setTimeout(function () { tuntas({ blob: file, thumb: null, durasi: 0 }); }, 6000);
      v.src = src;
    });
  }

  /**
   * Validasi + olah + simpan satu berkas. Mengembalikan keterangan lampiran
   * yang siap ditempelkan ke sebuah pesan.
   */
  function siapkan(file) {
    if (!tersedia()) {
      return Promise.reject(new Error(I18N.t('Penyimpanan lampiran tidak tersedia di browser ini.') + ' ' +
        'Mode penyamaran biasanya memblokirnya.'));
    }
    var j = jenis(file);
    var e = ext(file.name);

    if (TERLARANG.indexOf(e) >= 0) {
      return Promise.reject(new Error(
        I18N.t('Berkas “.{ext}” tidak boleh dikirim lewat obrolan.').replace('{ext}', e)));
    }
    if (file.size > BATAS[j]) {
      return Promise.reject(new Error('Ukuran ' + ukuranTeks(file.size) + ' melebihi batas ' +
        ukuranTeks(BATAS[j]) + ' untuk ' + (j === 'foto' ? 'foto' : j === 'video' ? 'video' : 'dokumen') + '.'));
    }
    if (file.size === 0) return Promise.reject(new Error(I18N.t('Berkas kosong.')));

    var olah = j === 'foto' ? olahFoto(file)
      : j === 'video' ? olahVideo(file)
      : Promise.resolve({ blob: file, thumb: null });

    return olah.then(function (h) {
      return simpan(h.blob, { nama: file.name }).then(function (id) {
        return {
          id: id, nama: file.name || ('lampiran.' + (e || 'bin')),
          mime: h.blob.type || file.type || 'application/octet-stream',
          ukuran: h.blob.size, jenis: j,
          thumb: h.thumb || null,
          w: h.w || null, h: h.h || null,
          durasi: h.durasi ? Math.round(h.durasi) : null
        };
      });
    });
  }

  /** Olah beberapa berkas sekaligus; yang gagal dilaporkan, tidak dibuang diam-diam. */
  function siapkanBanyak(files) {
    var daftar = Array.prototype.slice.call(files || []).slice(0, BATAS.perPesan);
    var gagal = [];
    return Promise.all(daftar.map(function (f) {
      return siapkan(f).catch(function (err) { gagal.push(f.name + ' — ' + err.message); return null; });
    })).then(function (hasil) {
      return { lampiran: hasil.filter(Boolean), gagal: gagal };
    });
  }

  /* ================================================================ UNDUH */
  /**
   * Simpan ke perangkat. objectURL dipakai apa adanya — berkas tidak pernah
   * berpindah lewat jaringan, jadi tidak ada yang bocor ke pihak ketiga.
   */
  function unduh(l) {
    return url(l.id).then(function (u) {
      if (!u) { UI.toast(I18N.t('Berkas tidak ditemukan di perangkat ini.'), 'err'); return false; }
      var a = document.createElement('a');
      a.href = u; a.download = l.nama || 'lampiran';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    });
  }

  function durasiTeks(d) {
    if (!d) return '';
    var m = Math.floor(d / 60), s = d % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  return {
    BATAS: BATAS, TERLARANG: TERLARANG,
    siap: siap, tersedia: tersedia,
    simpan: simpan, ambil: ambil, url: url, hapus: hapus,
    bebaskanSemua: bebaskanSemua, pakai: pakai, rapikan: rapikan,
    jenis: jenis, siapkan: siapkan, siapkanBanyak: siapkanBanyak,
    unduh: unduh, ikon: ikon, ukuranTeks: ukuranTeks, durasiTeks: durasiTeks, ext: ext
  };
})();
