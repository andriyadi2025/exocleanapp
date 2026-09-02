/* ==========================================================================
   db.js — lapisan penyimpanan data (prototipe: localStorage)
   --------------------------------------------------------------------------
   Semua akses data lewat DB.*, tidak ada view yang menyentuh localStorage
   langsung. Ketika nanti pindah ke Supabase/Postgres, cukup ganti isi file
   ini menjadi pemanggilan API — bentuk datanya sudah dirancang relasional.
   ========================================================================== */
var DB = (function () {

  var KEY = RUANG.kunci('db');
  var VERSION = 22;

  /** Daftar tabel + nama field relasi, dipakai seed & reset. */
  var TABLES = [
    'users', 'services', 'teams',
    'bookings', 'quotations', 'orders',
    'attendance', 'reports', 'qc',
    'invoices', 'ratings', 'complaints',
    'products', 'shopOrders', 'paytx', 'productReviews',
    'leads', 'activities', 'promos',
    'kursus', 'lmsProgres', 'sertifikat', 'payouts',
    'iklan', 'kampanye', 'sellerPayouts', 'roles',
    'mutasi', 'penarikan', 'perangkat', 'keamananLog',
    'otp', 'referral', 'komisi', 'dropProduk', 'dropMargin', 'berbagi',
    'chatPesan', 'moderasiLog', 'poinMutasi', 'poinTukar',
    'emailOutbox',
    'voucherProduk', 'voucher', 'undian', 'tips', 'keranjangJasa',
    /* MCS EXOCLEAN — korporat memantau kebersihan areanya sendiri.
       `mcsPekerja` SENGAJA terpisah dari `users`: petugas korporat bukan
       mitra EXOCLEAN, dan menyatukannya akan memasukkannya ke kolam
       penugasan serta perhitungan bagi hasil yang bukan urusannya. */
    'korporat', 'mcsLokasi', 'mcsPekerja', 'mcsArea', 'mcsJadwal', 'mcsTugas',
    /* Satu baris per pemindaian tag area. SENGAJA tabel sendiri, bukan
       kolom di mcsTugas: pemindaian terjadi saat petugas TIBA, sebelum ada
       tugas yang ditandai — dan tetap bernilai sebagai bukti kehadiran
       walaupun pekerjaannya batal. Buku besar, bukan atribut. */
    'mcsPindai',
    /* Aduan penghuni gedung. Sengaja TIDAK disimpan sebagai mcsTugas:
       tugas lahir dari jadwal dan berulang; aduan lahir dari kejadian dan
       hanya sekali. Menggabungkannya membuat laporan kepatuhan jadwal
       tercemar oleh tumpahan kopi yang kebetulan dilaporkan. */
    'mcsAduan',
    /* Penilaian mutu oleh orang yang TIDAK mengerjakan. Terpisah dari
       mcsTugas dengan sengaja: tugas menjawab 'sudah dikerjakan?',
       inspeksi menjawab 'hasilnya bersih?' — dan yang kedua tidak boleh
       dijawab oleh orang yang sama. */
    'mcsInspeksi',
    /* Bahan habis pakai. `mcsStok` menyimpan JENIS barang dan ambang
       minimalnya; jumlahnya TIDAK disimpan di sana melainkan dihitung dari
       `mcsStokMutasi` — satu angka yang diperbarui langsung akan menyimpang
       dari riwayatnya, dan yang menyimpang adalah angka yang dipakai
       memesan barang. */
    'mcsStok', 'mcsStokMutasi', 'mcsOpname', 'mcsTim',
    /* Pemasok, dan NOTA PENERIMAAN barang.

       `mcsTerima` adalah kepala dokumennya saja — pemasok, nomor nota,
       tanggal, gudang tujuan. BARIS-BARISNYA tidak disimpan di sini:
       tiap baris ADALAH satu baris `mcsStokMutasi` bertanda `terimaId`.

       Disengaja, dan ini pokoknya: saldo gudang wajib tetap sama dengan
       jumlah seluruh mutasi. Menyimpan baris nota tersendiri berarti
       jumlah barang tertulis di dua tempat, dan dua tempat yang harus
       sama pada akhirnya tidak sama — lalu tidak ada yang tahu mana yang
       benar. Notanya dokumen; mutasinya kebenaran. */
    'mcsPemasok', 'mcsTerima',
    /* Kepuasan penghuni atas ruangannya — TERPISAH dari mcsInspeksi dengan
       sengaja. Inspeksi adalah penilaian ahli terhadap standar; ini adalah
       pendapat orang yang memakai ruangannya. Menggabungkan keduanya membuat
       nilai yang tidak bisa dijawab: rendah karena kerjanya kurang, atau
       rendah karena jadwalnya memang tidak cukup? */
    'mcsPuas',
    /* Kehadiran petugas per hari. Tanpa ini, 'tugas terlewat' tidak bisa
       dibedakan antara petugas yang lalai dan petugas yang sakit tanpa
       pengganti — dua hal yang menuntut tindakan berlawanan. */
    'mcsAbsensi',
    /* Objek di dalam area: wastafel, cermin, bilik, mesin cuci tangan.
       Terpisah dari checklist langkah dengan sengaja — langkah adalah APA
       yang dikerjakan, objek adalah BENDA yang bisa ditempeli tag sendiri,
       dipindai sendiri, dan punya riwayatnya sendiri. */
    'mcsObjek',
    /* Riwayat penggantian kode tag. Buku besar, bukan kolom: yang perlu
       dijawab bukan 'kode sekarang apa' melainkan 'kode ini milik siapa,
       kapan berlaku, dan siapa yang menggantinya'. */
    'mcsKode',
    /* Permintaan pekerjaan tambahan: cuci karpet, poles lantai, tumpahan
       darurat. SENGAJA terpisah dari aduan: aduan tidak boleh menunggu
       persetujuan siapa pun, sedangkan pekerjaan tambahan justru sering
       harus menunggu karena ada biayanya. Menyatukan keduanya membuat salah
       satunya salah — aduan yang tertahan, atau biaya yang keluar tanpa
       persetujuan. */
    'mcsKerja',
    /* Laporan keselamatan kerja: kecelakaan, nyaris celaka, paparan bahan
       kimia. Buku besar yang TIDAK boleh dihapus begitu saja — pola yang
       terbaca darinya baru muncul setelah puluhan laporan terkumpul. */
    'mcsInsiden',
    /* Peralatan tahan lama: mesin poles, scrubber, troli, tangga. Terpisah
       dari mcsStok yang melacak bahan HABIS PAKAI — yang satu punya saldo
       yang menyusut, yang lain punya pemegang, riwayat servis, dan umur. */
    'mcsAset',
    /* Buku besar peralatan: serah terima, servis, kerusakan. Bukan kolom
       yang ditimpa — pertanyaan yang perlu dijawab bukan "siapa yang pegang
       sekarang" melainkan "siapa yang pegang WAKTU ITU". */
    'mcsAsetRiwayat',
    /* Tautan bertoken untuk pemilik gedung dan penyewa. Yang dicabut TIDAK
       dihapus — jejak siapa yang pernah punya akses dan berapa kali dibuka
       justru dicari setelah ada yang salah. */
    'mcsPortal',
    /* Katalog pelatihan, dan catatan siapa sudah ikut yang mana. Dipisah
       karena satu pelatihan diikuti banyak orang berkali-kali, dan masa
       berlakunya melekat pada KEIKUTSERTAAN, bukan pada pelatihannya. */
    'mcsPelatihan', 'mcsPelatihanCatat',
    /* Kontrak layanan: janji yang bisa diukur, bukan dokumen hukumnya.
       Berkas aslinya tetap harus ada di tempat lain. */
    'mcsKontrak',
    /* Rute ronda dan perjalanannya. Ronda berbeda dari jadwal: yang disimpan
       bukan "area ini disentuh" melainkan JARAK ANTARWAKTU antartitik —
       enam titik yang terpindai dalam empat puluh detik bukan ronda. */
    'mcsRonda', 'mcsRondaJalan',
    /* Slip gaji dan tagihan DISIMPAN, bukan dihitung ulang — keduanya
       dokumen yang sudah dipegang orang lain. Lihat gaji.js dan tagihan.js. */
    'mcsSlip', 'mcsTagihan',
    /* Bangunan berdiri di atas satu AREA; lantai milik bangunannya. Ruangan
       TIDAK punya tabel sendiri — ia baris mcsArea yang menempel pada lantai.
       Lihat alasannya di bangunan.js. */
    'mcsBangunan', 'mcsLantai',
    'waOutbox', 'counters', 'activity'
  ];

  var state = null;
  var listeners = [];

  function blank() {
    var s = { _v: VERSION };
    TABLES.forEach(function (t) { s[t] = []; });
    s.counters = { quotation: 0, order: 0, invoice: 0, booking: 0, shop: 0, pay: 0,
      lead: 0, sertifikat: 0, payout: 0, iklan: 0, sellerPayout: 0, kampanye: 0, tarik: 0, poinTukar: 0, undian: 0, tip: 0 };
    s.photos = {};      // { photoId: dataURL }
    s.settings = {};
    return s;
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* storage diblokir */ }
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || parsed._v !== VERSION) return null;

      /* Tabel yang BARU ditambahkan sesudah data ini tersimpan dibuatkan
         kosong, bukan dianggap sebagai data yang rusak.

         Tanpa ini, menambah satu tabel memaksa VERSION naik, dan VERSION yang
         naik menghapus seluruh isi localStorage pengguna — pesanan, keranjang,
         alamat, semuanya — hanya karena ada tabel baru yang isinya justru
         masih kosong. Kenaikan VERSION disimpan untuk perubahan yang benar
         benar tidak sejalan dengan data lama. */
      TABLES.forEach(function (t) { if (!parsed[t]) parsed[t] = []; });
      return parsed;
    } catch (e) { return null; }
  }

  var saveTimer = null;

  /**
   * Apa yang benar-benar dituliskan ke localStorage.
   *
   * Foto DIKELUARKAN begitu IndexedDB siap. Di situlah seluruh persoalan
   * kuota berada: satu foto ±68 KB, dan localStorage hanya ±5 MB. Tanpa
   * foto, seluruh sisa data aplikasi ini muat berkali-kali lipat.
   *
   * Bila IndexedDB TIDAK bisa dipakai — mode penyamaran, kebijakan
   * perusahaan — foto tetap ikut ke localStorage seperti dulu. Itu bukan
   * keadaan yang baik, tetapi ia lebih baik daripada aplikasi yang tidak
   * bisa menyimpan foto sama sekali.
   */
  function untukDisimpan() {
    if (!(window.FOTO && FOTO.siap())) return state;
    var salin = {};
    Object.keys(state).forEach(function (k) { if (k !== 'photos') salin[k] = state[k]; });
    salin.photos = {};
    return salin;
  }

  function save(immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!immediate) { saveTimer = setTimeout(function () { save(true); }, 120); return; }
    try {
      localStorage.setItem(KEY, JSON.stringify(untukDisimpan()));
    } catch (e) {
      /* Kuota penuh.

         Membuang foto TIDAK menolong lagi begitu foto pindah ke IndexedDB:
         yang penuh adalah localStorage, dan di sana sudah tidak ada satu
         foto pun. Menjalankannya tetap akan membuang singgahan foto
         perangkat ini tanpa membebaskan sebyte pun — lalu gagal lagi, lalu
         orangnya menerima pesan yang sama sesudah kehilangan fotonya
         percuma.

         Karena itu ia hanya dijalankan pada mode cadangan, yaitu ketika
         IndexedDB memang tidak bisa dipakai dan foto masih tinggal di
         localStorage. Di luar itu, penuh adalah keadaan yang dikatakan
         kepada manusia, bukan diselesaikan dengan menghapus. */
      var freed = (window.FOTO && FOTO.siap()) ? 0 : gcPhotos();
      try {
        localStorage.setItem(KEY, JSON.stringify(untukDisimpan()));
        if (freed && window.UI) {
          UI.toast('Penyimpanan hampir penuh — ' + freed + ' foto tak terpakai dihapus.', 'warn');
        }
      } catch (e2) {
        peringatanPenuh();
      }
    }
  }

  /* Diberi tahu SEKALI per pembukaan aplikasi. Toast yang sama muncul tiap
     kali menyimpan hanya membuat orang berhenti membacanya. */
  var sudahDiperingatkan = false;
  function peringatanPenuh() {
    if (sudahDiperingatkan || !window.UI) return;
    sudahDiperingatkan = true;
    if (window.FOTO && FOTO.siap()) {
      UI.toast(I18N.t('Penyimpanan browser penuh. Ekspor data lalu reset di menu Pengaturan.'), 'err');
    } else {
      /* Ini keadaan yang berbeda dan harus dikatakan berbeda: fotonya masih
         di localStorage karena IndexedDB tidak bisa dipakai, dan yang
         menyelamatkan datanya adalah penyimpanan bersama, bukan menghapus. */
      UI.toast(I18N.t('Penyimpanan browser penuh dan foto tidak bisa dipindahkan.') + ' ' +
        I18N.t('Nyalakan penyimpanan bersama di Pengaturan agar foto tersimpan di server.'), 'err');
    }
  }

  /* ---------- pub/sub sederhana supaya view bisa re-render ---------- */
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }

  /* ---------- CRUD generik ---------- */
  function all(table) { return (state[table] || []).slice(); }

  function find(table, id) {
    var rows = state[table] || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }

  function where(table, pred) {
    if (typeof pred === 'function') return (state[table] || []).filter(pred);
    return (state[table] || []).filter(function (r) {
      for (var k in pred) if (r[k] !== pred[k]) return false;
      return true;
    });
  }

  function first(table, pred) { var r = where(table, pred); return r.length ? r[0] : null; }

  function insert(table, row) {
    row = Object.assign({}, row);
    if (!row.id) row.id = U.uid(table.slice(0, 3));
    if (!row.createdAt) row.createdAt = U.nowISO();
    state[table] = state[table] || [];
    state[table].push(row);
    lapor(table, row.id, 'set', row);
    save(); emit();
    return row;
  }

  function update(table, id, patch) {
    var row = find(table, id);
    if (!row) return null;
    Object.assign(row, typeof patch === 'function' ? patch(row) : patch);
    row.updatedAt = U.nowISO();
    lapor(table, id, 'set', row);
    save(); emit();
    return row;
  }

  function remove(table, id) {
    state[table] = (state[table] || []).filter(function (r) { return r.id !== id; });
    lapor(table, id, 'hapus');
    save(); emit();
  }

  /** Nomor dokumen berurutan per jenis. */
  /**
   * Nomor dokumen berurutan per jenis.
   *
   * Ketika beberapa perangkat memakai basis data yang sama, menghitung
   * 'satu lebih besar dari yang saya lihat' menghasilkan dua invoice
   * bernomor sama — keduanya benar menurut salinannya masing-masing.
   * Maka nomornya DIPESAN dari server sepetak sekaligus.
   *
   * Bila petaknya belum siap (server sedang tak terjangkau), kita kembali
   * menghitung sendiri dan menerima risikonya — menolak menerbitkan dokumen
   * karena WiFi mati adalah kerugian yang lebih pasti daripada nomor kembar
   * yang mungkin.
   */
  function nextNo(kind) {
    if (window.SYNC && SYNC.aktif()) {
      var n = SYNC.nomorBerikut(kind);
      if (n) {
        state.counters[kind] = Math.max(state.counters[kind] || 0, n);
        lapor('__counters', 'counters', 'set', state.counters);
        save();
        return n;
      }
    }
    state.counters[kind] = (state.counters[kind] || 0) + 1;
    lapor('__counters', 'counters', 'set', state.counters);
    save();
    return state.counters[kind];
  }

  /* ---------- foto ---------- */
  /**
   * Satu-satunya jembatan ke lapisan sinkronisasi.
   *
   * Dibungkus supaya db.js tetap bisa berdiri sendiri: build yang tidak
   * membawa sync.js — atau pemakai yang belum menyalakannya — berjalan
   * persis seperti sebelum ada berkas ini.
   */
  function lapor(tabel, id, aksi, data) {
    if (window.SYNC && SYNC.aktif()) SYNC.catat(tabel, id, aksi, data);
  }

  /* ==================================================== SINGGAHAN FOTO

     TEMPAT TINGGAL foto adalah IndexedDB. Yang ada di state.photos hanyalah
     SINGGAHAN — sebagian kecil yang sedang atau baru saja dilihat.

     Diukur dengan seribu foto lapangan sungguhan (900 px, jpeg 0,6, rata-rata
     255 KB): memuat semuanya saat aplikasi dibuka memakan 249 MB memori dan
     menahan layar pertama 1,1 detik pada komputer meja. Di ponsel kelas
     menengah tiga sampai lima kali lipat — dan ponsel itulah yang dipakai
     petugas berdiri di lorong gedung. Sebagian ponsel tidak melambat, ia
     menutup paksa tabnya, dan petugas menyimpulkan aplikasinya rusak.

     GETPHOTO TETAP SINKRON, DAN INI CARANYA

     Ia dipanggil di tiga puluh tiga tempat, hampir semuanya di tengah
     perakitan untai HTML. Menjadikannya asinkron berarti membongkar ketiga
     puluh tiga tempat itu sekaligus.

     Yang dilakukan: bila fotonya belum ada di singgahan tetapi DIKETAHUI ada
     di disk, getPhoto memulangkan sebuah PENANDA — gambar abu-abu kecil yang
     alamatnya mengandung id fotonya sendiri, jadi ia unik per foto. Fotonya
     diambil dari disk di latar; begitu tiba, setiap <img> yang alamatnya sama
     dengan penanda itu diisi. Layar terlihat seperti gambar yang sedang
     dimuat, karena memang itulah yang terjadi.

     Bila fotonya memang TIDAK ADA, yang dipulangkan tetap null seperti dulu.
     Ini penting: ada tempat yang menulis "var src = DB.getPhoto(f); return src
     ? gambar : pesanKosong", dan memulangkan penanda untuk foto yang sudah
     terhapus akan menampilkan kotak abu-abu selamanya, bukan pesan yang
     sebenarnya. */

  /* Anggaran singgahan. 24 MB kira-kira seratus foto lapangan — jauh lebih
     banyak daripada yang muat di satu layar, dan seperdelapan belas dari
     beban lama pada seribu foto. */
  var SINGGAH_BYTE = 24 * 1024 * 1024;
  var singgahByte = 0;
  /* Urutan pemakaian, terlama di depan. Array, bukan Map: daftarnya ratusan,
     dan splice atas ratusan tidak terasa. */
  var singgahUrut = [];
  /* Id yang DIKETAHUI ada di IndexedDB — hanya kuncinya, bukan isinya. */
  var fotoAda = {};
  /* Yang sedang diambil, supaya dua puluh <img> untuk foto yang sama tidak
     memicu dua puluh pembacaan disk. */
  var fotoJemput = {};

  function sentuh(id) {
    var i = singgahUrut.indexOf(id);
    if (i >= 0) singgahUrut.splice(i, 1);
    singgahUrut.push(id);
  }

  function taruhSinggahan(id, data) {
    if (state.photos[id] === undefined) singgahByte += (data || '').length;
    state.photos[id] = data;
    sentuh(id);
    /* Yang paling lama tidak dilihat dibuang lebih dulu. Ia TIDAK hilang —
       ia masih di IndexedDB, dan akan diambil lagi bila dilihat lagi. */
    while (singgahByte > SINGGAH_BYTE && singgahUrut.length > 1) {
      var tua = singgahUrut.shift();
      if (state.photos[tua] !== undefined) {
        singgahByte -= (state.photos[tua] || '').length;
        delete state.photos[tua];
      }
    }
  }

  function lupakanSinggahan(id) {
    if (state.photos[id] !== undefined) {
      singgahByte -= (state.photos[id] || '').length;
      delete state.photos[id];
    }
    var i = singgahUrut.indexOf(id);
    if (i >= 0) singgahUrut.splice(i, 1);
  }

  /* Penanda: kotak abu-abu 4:3 yang alamatnya mengandung id fotonya, sehingga
     dua foto berbeda tidak pernah punya penanda yang sama. */
  function penanda(id) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">' +
      '<rect width="4" height="3" fill="#e9ecef"/><!--' + id + '--></svg>');
  }

  function isiYangMenunggu(id, data) {
    if (typeof document === 'undefined') return;
    var p = penanda(id);
    var img = document.getElementsByTagName('img');
    for (var i = 0; i < img.length; i++) {
      if (img[i].getAttribute('src') === p) img[i].src = data;
    }
  }

  function jemputFoto(id) {
    if (fotoJemput[id] || !(window.FOTO && FOTO.siap())) return;
    fotoJemput[id] = 1;
    FOTO.satu(id).then(function (data) {
      delete fotoJemput[id];
      if (!data) {
        /* Terdaftar ada tetapi tidak terbaca. Dicoret dari daftar supaya
           panggilan berikutnya memulangkan null dan layar menampilkan
           keadaan sebenarnya, bukan kotak abu-abu yang menunggu selamanya. */
        delete fotoAda[id];
        return;
      }
      taruhSinggahan(id, data);
      isiYangMenunggu(id, data);
    }).catch(function () { delete fotoJemput[id]; });
  }

  /**
   * Foto lengkap, dijanjikan.
   *
   * Untuk tempat yang TIDAK boleh menerima penanda — penampil layar penuh,
   * pencetakan, pengiriman. Di sana kotak abu-abu bukan "sedang dimuat", ia
   * adalah dokumen yang salah.
   */
  function fotoUtuh(id) {
    if (!id) return Promise.resolve(null);
    var v = state.photos[id];
    if (v !== undefined) { sentuh(id); return Promise.resolve(v); }
    if (!(window.FOTO && FOTO.siap())) return Promise.resolve(null);
    return FOTO.satu(id).then(function (data) {
      if (data) taruhSinggahan(id, data);
      return data || null;
    });
  }

  /**
   * Foto yang datang dari perangkat lain.
   *
   * Dipakai sync.js. Dulu sync menulis langsung ke DB.raw.photos, yang
   * benar selama seluruh foto memang tinggal di sana. Sejak salinan di
   * memori dibatasi, menulis langsung berarti melewati anggaran singgahan:
   * perangkat yang menarik seribu foto dari server akan menaruh seribu-
   * nya di memori, dan seluruh perbaikan ini batal tanpa satu pun galat.
   */
  function terimaFoto(id, data) {
    if (!id || !data) return;
    fotoAda[id] = 1;
    /* Ditulis ke disk, TIDAK ditaruh di singgahan. Foto yang baru turun
       dari server belum tentu akan dilihat sesi ini — sebagian besar
       tidak. Ia diambil nanti bila memang digambar. */
    if (window.FOTO && FOTO.siap()) { FOTO.simpan(id, data); return; }
    /* Tanpa IndexedDB, memori adalah satu-satunya tempat. */
    taruhSinggahan(id, data);
  }

  function buangFoto(id) {
    lupakanSinggahan(id);
    delete fotoAda[id];
    if (window.FOTO) FOTO.hapus(id);
  }

  /**
   * SELURUH foto beserta isinya — hanya untuk migrasi pertama ke server.
   *
   * Ini satu-satunya tempat yang masih boleh memuat semuanya sekaligus,
   * dan ia dijalankan sekali seumur pemasangan atas permintaan manusia,
   * bukan pada tiap pembukaan aplikasi. Pemanggilnya WAJIB mengirimnya
   * bergelombang — lihat migrasi() di sync.js.
   */
  function fotoUntukMigrasi() {
    if (!(window.FOTO && FOTO.siap())) {
      var salin = {};
      Object.keys(state.photos).forEach(function (id) { salin[id] = state.photos[id]; });
      return Promise.resolve(salin);
    }
    return FOTO.semua().then(function (x) { return x || {}; });
  }

  /** Daftar id foto yang diketahui ada. Dipakai migrasi dan layar ukuran. */
  function fotoDaftar() { return Object.keys(fotoAda); }

  function putPhoto(dataUrl) {
    var id = U.uid('ph');
    taruhSinggahan(id, dataUrl);
    fotoAda[id] = 1;
    /* Ditulis ke IndexedDB tanpa ditunggu. Menunggunya berarti tombol
       "simpan" menggantung sampai disk selesai, dan salinan di memori sudah
       cukup untuk menggambar layar berikutnya. */
    if (window.FOTO) FOTO.simpan(id, dataUrl);
    lapor('__foto', id, 'set', dataUrl);
    save();
    return id;
  }
  /* Dipakai penampil layar penuh dan pencetakan — lihat catatan di atas. */
  function getPhoto(id) {
    if (!id) return null;
    var v = state.photos[id];
    if (v !== undefined) { sentuh(id); return v; }
    /* Tidak ada di disk juga — null, persis seperti dulu. */
    if (!fotoAda[id]) return null;
    jemputFoto(id);
    return penanda(id);
  }
  function delPhoto(id) {
    lupakanSinggahan(id);
    delete fotoAda[id];
    if (window.FOTO) FOTO.hapus(id);
    lapor('__foto', id, 'hapus');
    save();
  }

  /** Kumpulkan semua photoId yang masih dirujuk record manapun. */
  function referencedPhotos() {
    var used = {};
    var mark = function (v) { if (v) used[v] = 1; };
    state.attendance.forEach(function (a) { mark(a.selfiePhotoId); });
    state.reports.forEach(function (r) {
      (r.before || []).forEach(mark); (r.after || []).forEach(mark);
    });
    state.invoices.forEach(function (i) { (i.payments || []).forEach(function (p) { mark(p.buktiPhotoId); }); });
    state.complaints.forEach(function (c) { (c.photos || []).forEach(mark); });
    /* Foto masakan pada katalog jasa keahlian. Tanpa baris ini, seluruh foto
       menu dianggap yatim dan dibuang diam-diam saat kuota penuh — dan yang
       ketahuan belakangan adalah katalog yang tiba-tiba kehilangan gambarnya. */
    state.services.forEach(function (s) {
      var menu = (s.keahlian && s.keahlian.menu) || [];
      menu.forEach(function (m) { mark(m.foto); });
    });
    /* MCS: foto acuan area dan bukti sebelum/sesudah tiap tugas. Tanpa baris
       ini seluruhnya dianggap yatim dan dibuang saat kuota penuh — bukti
       kebersihan yang hilang diam-diam adalah bukti yang tidak berguna. */
    (state.mcsArea || []).forEach(function (a) { (a.foto || []).forEach(mark); });
    (state.mcsAduan || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    (state.mcsInspeksi || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    (state.mcsObjek || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    /* Foto petugas untuk kartu identitas. Tanpa baris ini, kartu yang sudah
       dicetak kehilangan wajahnya begitu kuota penyimpanan penuh. */
    (state.mcsPekerja || []).forEach(function (x) { if (x.foto) mark(x.foto); });
    /* Foto permintaan pekerjaan tambahan: yang dilampirkan saat meminta dan
       yang dilampirkan sebagai bukti hasil. Tanpa baris ini keduanya dianggap
       yatim dan dibuang saat kuota penuh — termasuk bukti pekerjaan yang
       sudah terlanjur ditagihkan. */
    (state.mcsInsiden || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    (state.mcsAset || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    /* Foto bangunan. Tanpa baris ini ia dianggap yatim dan dibuang saat
       penyimpanan penuh — dan yang hilang adalah tampak muka gedung yang
       dipakai petugas baru mengenali tempatnya. */
    (state.mcsBangunan || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    /* Foto bahan habis pakai. Tanpa baris ini ia dianggap yatim dan dibuang
       saat penyimpanan penuh — dan yang hilang adalah foto label yang justru
       dipakai orang gudang membeli ulang barang yang benar. */
    (state.mcsStok || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    /* Pindaian sertifikat. Tanpa baris ini ia dibuang saat kuota penuh —
       dan yang hilang adalah satu-satunya bukti pelatihannya pernah terjadi. */
    (state.mcsPelatihanCatat || []).forEach(function (x) { (x.foto || []).forEach(mark); });
    (state.mcsKontrak || []).forEach(function (x) { (x.lampiran || []).forEach(mark); });
    (state.mcsKerja || []).forEach(function (x) {
      (x.foto || []).forEach(mark); (x.fotoHasil || []).forEach(mark); });
    (state.mcsTugas || []).forEach(function (t) {
      (t.sebelum || []).forEach(mark); (t.sesudah || []).forEach(mark);
      /* Bukti sebelum-sesudah milik TIAP langkah. */
      var pl = t.langkahFoto || {};
      Object.keys(pl).forEach(function (k) {
        (pl[k].sebelum || []).forEach(mark);
        (pl[k].sesudah || []).forEach(mark);
      });
    });
    return used;
  }

  /**
   * Hapus foto YATIM — foto yang tidak dirujuk catatan mana pun.
   *
   * Dulu ada cabang kedua: bila tidak ada yang yatim, buang 20% foto
   * tertua. Cabang itu dihapus, dan penghapusannya disengaja.
   *
   * "Tidak ada yang yatim" berarti SETIAP foto yang tersisa masih dirujuk
   * catatan yang hidup. Membuang yang tertua di antaranya berarti membuang
   * bukti kerja — dan justru yang tertua, padahal sengketa datang belakangan
   * dan yang lama itulah yang dicari. Ia berjalan otomatis, tanpa ditanyakan
   * kepada siapa pun, dan meninggalkan catatan yang menunjuk ke tempat
   * kosong. Penuh adalah masalah yang harus dikatakan kepada manusia, bukan
   * diselesaikan dengan menghapus apa yang sedang dijaga.
   */
  function gcPhotos() {
    var used = referencedPhotos(), buang = [];
    /* Disisir dari DAFTAR ID, bukan dari singgahan.

       Sejak singgahan dibatasi, state.photos hanya memuat seratusan foto
       yang baru dilihat. Menyisir dari sana berarti pemulung sampah tidak
       pernah melihat sembilan ratus foto sisanya — yang yatim akan menetap
       selamanya, dan angka ukuran di layar pengaturan tidak pernah turun
       meskipun catatannya sudah lama dihapus. */
    Object.keys(fotoAda).forEach(function (id) { if (!used[id]) buang.push(id); });
    /* Yang belum sempat terdaftar — mode darurat tanpa IndexedDB. */
    Object.keys(state.photos).forEach(function (id) {
      if (!used[id] && !fotoAda[id]) buang.push(id);
    });
    buang.forEach(function (id) { lupakanSinggahan(id); delete fotoAda[id]; });
    /* Dihapus juga dari IndexedDB — kalau tidak, ia hanya hilang dari layar
       dan tetap memakan tempat, dan hitungan ukuran di layar pengaturan
       akan berbeda dari kenyataan. */
    if (buang.length && window.FOTO) FOTO.hapusBanyak(buang);
    return buang.length;
  }

  /* ---------- log aktivitas ---------- */
  function log(actorId, aksi, refType, refId, detail) {
    state.activity.push({
      id: U.uid('act'), actorId: actorId, aksi: aksi,
      refType: refType, refId: refId, detail: detail || '', at: U.nowISO()
    });
    if (state.activity.length > 400) state.activity = state.activity.slice(-400);
    save();
  }

  /* ---------- ekspor / impor / reset ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error(I18N.t('Format file tidak dikenali'));
    TABLES.forEach(function (t) { if (!parsed[t]) parsed[t] = []; });
    parsed.photos = parsed.photos || {};
    parsed._v = VERSION;
    state = parsed;
    save(true); emit();
  }

  /* Benih pembuka. Setiap aplikasi membawa benihnya sendiri: exoclean
     membawa js/seed.js (layanan, produk, order, invoice), MCS EXOCLEAN
     membawa js/semai-mcs.js (peran + satu akun pembuka). Yang mana pun
     yang ikut dimuat, itulah yang dipakai — dan bila tidak ada satu pun,
     aplikasi tetap terbuka dengan basis data kosong, bukan mati dengan
     ReferenceError sebelum satu piksel pun tergambar. */
  function semai(s) {
    if (window.SEED) SEED.apply(s);
    else if (window.SEMAI_MCS) SEMAI_MCS.apply(s);
  }

  function reset() {
    state = blank();
    semai(state);
    save(true); emit();
  }

  function ukuran() {
    try { return Math.round((localStorage.getItem(KEY) || '').length / 1024); } catch (e) { return 0; }
  }

  /**
   * Ganti seluruh salinan kerja dengan isi dari server.
   *
   * Tabel yang TIDAK ada di server dibiarkan sebagaimana adanya di kerangka
   * kosong — server yang baru dipasang belum punya tabel apa pun, dan
   * mengosongkan semuanya akan membuat aplikasi mengira dirinya rusak.
   */
  function pakaiSnapshot(isi) {
    var baru = blank();
    var fotoDatang = {};
    Object.keys(isi || {}).forEach(function (t) {
      var brs = isi[t] || [];
      if (t === '__settings') { baru.settings = (brs[0] && brs[0].data) || {}; return; }
      if (t === '__counters') { baru.counters = (brs[0] && brs[0].data) || baru.counters; return; }
      if (t === '__foto') {
        /* Identitas foto ada pada BARISNYA, bukan di dalam datanya — data
           sebuah foto hanyalah untai dataURL.

           Dikumpulkan terpisah, TIDAK dimasukkan ke salinan kerja: snapshot
           server bisa berisi ribuan foto, dan menaruh semuanya di memori
           mengembalikan persis persoalan yang baru saja dihilangkan dari
           jalur pembukaan aplikasi. */
        brs.forEach(function (b) { if (b && b.id) fotoDatang[b.id] = b.data; });
        return;
      }
      baru[t] = brs.map(function (b) { return b.data; });
    });
    /* Foto yang ada DI SINI tetapi belum ada di server DIPERTAHANKAN.

       Snapshot mengganti seluruh salinan kerja, dan itu benar untuk tabel
       biasa. Untuk foto ia berbahaya: foto yang baru diambil saat luring
       belum sempat naik ke server, dan menggantinya dengan daftar server
       berarti membuangnya tepat ketika ia satu-satunya salinan yang ada.

       Foto yang memang sudah dihapus di server akan tersapu belakangan oleh
       gcPhotos, karena catatan yang merujuknya juga ikut hilang dari
       snapshot — ia menjadi yatim, dan yatim memang boleh dibuang. */
    /* Dijaga lewat DAFTAR, bukan lewat singgahan. Foto luring yang sudah
       lama tidak dilihat sudah terbuang dari singgahan — ia tetap ada di
       IndexedDB, dan justru itulah yang tidak boleh hilang. */
    var adaSetelah = {};
    Object.keys(fotoDatang).forEach(function (id) { adaSetelah[id] = 1; });
    Object.keys(fotoAda).forEach(function (id) { adaSetelah[id] = 1; });

    /* Singgahan yang masih hangat dibawa menyeberang — layar yang sedang
       terbuka tidak perlu berkedip abu-abu hanya karena data disegarkan. */
    var hangat = state && state.photos ? state.photos : {};
    state = baru;
    fotoAda = adaSetelah;
    singgahByte = 0; singgahUrut = [];
    Object.keys(hangat).forEach(function (id) {
      if (adaSetelah[id]) taruhSinggahan(id, hangat[id]);
    });
    simpanSinggahan();
    /* Foto yang datang dari server DITULIS ke IndexedDB.

       Tanpa baris ini ia hanya ada di memori: hilang setiap kali aplikasi
       ditutup, diunduh ulang seluruhnya setiap kali dibuka, dan tidak ada
       sama sekali ketika luring — persis pada saat petugas di lapangan
       membutuhkannya untuk membandingkan dengan foto acuan area.

       Tidak ditunggu: layar tidak boleh menunggu disk untuk digambar. */
    if (window.FOTO && Object.keys(fotoDatang).length) {
      FOTO.simpanBanyak(fotoDatang);
      /* Foto yang baru tiba TIDAK ditaruh di singgahan. Ia akan diambil dari
         disk pada saat pertama benar-benar digambar — dan sebagian besar
         tidak akan pernah digambar pada sesi ini. */
    }
    emit();
    return state;
  }

  /** Tulis singgahan luring tanpa memicu operasi baru. */
  function simpanSinggahan() { save(true); }

  function init() {
    state = load();
    if (!state) { state = blank(); semai(state); save(true); }
    return state;
  }

  /**
   * Ambil foto dari IndexedDB, dan pindahkan yang masih tertinggal di
   * localStorage.
   *
   * Dipanggil sekali saat aplikasi dibuka, SEBELUM layar pertama digambar.
   * Urutannya penting dan sengaja begini:
   *
   *   1. baca IndexedDB;
   *   2. cari foto yang ada di localStorage tetapi belum ada di IndexedDB;
   *   3. TULIS dulu yang tertinggal itu ke IndexedDB, tunggu sampai selesai;
   *   4. baru simpan ulang localStorage — yang sejak itu tanpa foto.
   *
   * Menukar langkah 3 dan 4 berarti foto dihapus dari tempatnya yang lama
   * sebelum sampai di tempatnya yang baru. Bila listriknya padam di antara
   * keduanya, seluruh bukti kerja hilang — dan pemindahan yang menghapus
   * lebih dulu adalah cara paling umum kehilangan data saat memutakhirkan.
   *
   * SELALU selesai. Bila IndexedDB tidak bisa dipakai, ia diam-diam kembali
   * ke perilaku lama: foto tetap di localStorage, aplikasi tetap berjalan.
   */
  function muatFoto() {
    if (!window.FOTO) return Promise.resolve({ siap: false, dimuat: 0, dipindah: 0 });
    /* Yang dibaca saat mulai hanyalah DAFTAR ID-nya.

       Dulu di sini berdiri FOTO.semua(), yang membaca seluruh isinya. Dengan
       seribu foto itu 249 MB dan 1,1 detik sebelum layar pertama muncul.
       Seribu id-nya sendiri sekitar 20 KB. */
    return FOTO.kunci().then(function (daftar) {
      if (!daftar) {
        /* IndexedDB tidak bisa dipakai. Foto tetap tinggal di localStorage
           seperti dulu, dan seluruh isinya memang ada di memori — jadi
           daftarnya adalah singgahan itu sendiri. */
        Object.keys(state.photos).forEach(function (id) { fotoAda[id] = 1; });
        return { siap: false, dimuat: 0, dipindah: 0, alasan: FOTO.alasan() };
      }
      var ada = {};
      daftar.forEach(function (id) { fotoAda[id] = 1; ada[id] = 1; });

      /* Foto yang masih tertinggal di localStorage dipindahkan. Isinya sudah
         ada di memori — ia baru saja dibaca dari sana — jadi memindahkannya
         tidak menambah beban apa pun. */
      var tertinggal = {};
      var n = 0, dimuat = 0;
      Object.keys(state.photos).forEach(function (id) {
        if (!ada[id] && state.photos[id]) { tertinggal[id] = state.photos[id]; n++; }
      });
      if (!n) {
        save(true);
        return { siap: true, dimuat: dimuat, dipindah: 0 };
      }
      Object.keys(tertinggal).forEach(function (id) { fotoAda[id] = 1; });
      return FOTO.simpanBanyak(tertinggal).then(function (tersimpan) {
        /* localStorage baru ditulis ulang bila pemindahannya BENAR selesai.
           Bila tidak, fotonya dibiarkan di tempat lamanya — penuh tetapi
           utuh. */
        if (tersimpan === n) save(true);
        return { siap: true, dimuat: dimuat, dipindah: tersimpan,
                 gagalPindah: n - tersimpan };
      });
    }).then(function (hasil) {
      /* Diminta setelah ada isinya, bukan sebelum: sebagian peramban menilai
         permintaan ini dari seberapa dipakai situsnya. */
      if (hasil.siap) FOTO.awetkan();
      /* Apa pun yang tersisa di memori dari localStorage dihitung ulang ke
         dalam anggaran singgahan, supaya batasnya berlaku sejak awal dan
         bukan hanya untuk foto yang diambil sesudahnya. */
      singgahByte = 0; singgahUrut = [];
      var isi = state.photos; state.photos = {};
      Object.keys(isi).forEach(function (id) { taruhSinggahan(id, isi[id]); });
      return hasil;
    });
  }

  return {
    pakaiSnapshot: pakaiSnapshot, simpanSinggahan: simpanSinggahan,
    init: init, muatFoto: muatFoto, onChange: onChange, emit: emit, save: save,
    all: all, find: find, where: where, first: first,
    insert: insert, update: update, remove: remove,
    nextNo: nextNo,
    putPhoto: putPhoto, getPhoto: getPhoto, delPhoto: delPhoto, gcPhotos: gcPhotos,
    fotoUtuh: fotoUtuh, terimaFoto: terimaFoto, buangFoto: buangFoto,
    fotoUntukMigrasi: fotoUntukMigrasi, fotoDaftar: fotoDaftar,
    log: log,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset, ukuran: ukuran,
    get raw() { return state; }
  };
})();
