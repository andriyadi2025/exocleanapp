/* ==========================================================================
   pasar.js — tarif pasar juru bersih untuk EXOCLEAN App
   --------------------------------------------------------------------------
   SATU KEPUTUSAN YANG DIWUJUDKAN BERKAS INI

   Di EXOCLEAN App pelanggan memilih ORANGNYA, dan tiap juru bersih tampil
   dengan tarifnya sendiri. Yang menetapkan tarif itu adalah **Super Admin**,
   bukan juru bersihnya. Itu keputusan bisnis, dan berkas ini adalah satu-
   satunya tempat keputusan itu hidup: bentuk datanya, batas nilainya, siapa
   yang boleh mengubahnya, dan siapa yang akhirnya tayang.

   BENTUK DATANYA

     users[i].pasar = {
       tarif:     45000,        // rupiah per satuan layanan; null = belum ditetapkan
       aktif:     true,         // tayang di EXOCLEAN App atau tidak
       olehId:    'u_admin',    // siapa yang terakhir menetapkan
       olehNama:  'Rina Kartika',
       at:        '2026-08-26T...'
     }

   Disimpan di dalam `users`, BUKAN tabel sendiri. Tarif adalah atribut orang
   itu — satu nilai yang berlaku sekarang — bukan buku besar kejadian. Yang
   perlu ditelusuri riwayatnya adalah pembayaran, dan itu sudah punya tabelnya
   sendiri. Menaruhnya di tabel terpisah hanya menambah satu join pada setiap
   layar yang menampilkan juru bersih.

   TIDAK ADA KENAIKAN DB VERSION

   Menambah FIELD tidak menuntutnya; menaikkan VERSION akan MENGHAPUS seluruh
   localStorage pengguna (lihat load() di db.js). Baris lama yang belum punya
   `pasar` dianggap "belum ditetapkan" — dan itu memang keadaannya.

   YANG SENGAJA TIDAK DILAKUKAN

   Tidak ada tarif yang terisi sendiri — tidak saat mitra disetujui, tidak
   saat data lama dibaca, tidak lewat migrasi apa pun. Mitra tanpa tarif
   TIDAK TAYANG, dan itulah keadaan yang benar sampai Super Admin menjawab.
   Mengisinya otomatis berarti mengambil alih keputusan yang menurut
   definisinya bukan milik program ini, dan tarif tebakan yang terlanjur
   tayang adalah uang orang lain.
   ========================================================================== */
var PASAR = (function () {

  /* Batas kewarasan, bukan kebijakan harga. Di bawah ini upahnya di bawah
     UMR per jam untuk kerja fisik; di atas ini hampir pasti salah ketik
     (satu nol kelebihan) — dan salah ketik yang tayang akan dilihat
     pelanggan sebelum siapa pun sempat menyadarinya. */
  var MIN = 30000;
  var MAX = 500000;

  /* Usulan, bukan penetapan. Ditampilkan sebagai petunjuk di layar Super
     Admin supaya ia punya titik berangkat, dan tidak pernah tersimpan
     sendiri tanpa ditekan. */
  var USULAN = {
    'Leader Tim':              95000,
    'Teknisi Kaca':            110000,
    'Teknisi Karpet & Sofa':   105000,
    'Operator Poles':          100000,
    'Cleaner':                 78000
  };
  var USULAN_LAIN = 80000;

  function kosong() {
    return { tarif: null, aktif: false, olehId: null, olehNama: null, at: null };
  }

  /** Selalu mengembalikan objek, tidak pernah null — pemanggil tidak perlu menjaga. */
  function data(u) {
    return (u && u.pasar) ? u.pasar : kosong();
  }

  function tarif(u)  { return data(u).tarif; }
  function usulan(u) { return USULAN[(u || {}).jabatan] || USULAN_LAIN; }

  /** Benar bila juru bersih ini boleh tayang di EXOCLEAN App. */
  function tayang(u) {
    var p = data(u);
    return !!(u && u.aktif && u.role === 'worker' && p.aktif && p.tarif);
  }

  /* TIDAK ADA lengkapi()/migrasi yang menuliskan `pasar` kosong ke baris
     lama, dan itu disengaja. data() di atas sudah memperlakukan field yang
     hilang sebagai "belum ditetapkan" — persis artinya. Menuliskan objek
     kosong ke tujuh ribu baris hanya menambah ukuran localStorage untuk
     menyatakan hal yang sudah benar tanpa ditulis. */

  /** Alasan kenapa sebuah nilai ditolak, atau null bila sah. */
  function periksa(nilai) {
    var n = Number(nilai);
    if (!nilai && nilai !== 0)   return 'Tarif belum diisi.';
    if (!isFinite(n))            return 'Tarif harus berupa angka.';
    if (n !== Math.round(n))     return 'Tarif tidak memakai pecahan rupiah.';
    if (n < MIN)                 return 'Tarif di bawah Rp' + MIN.toLocaleString('id-ID') + ' — periksa lagi.';
    if (n > MAX)                 return 'Tarif di atas Rp' + MAX.toLocaleString('id-ID') + ' — kemungkinan kelebihan satu nol.';
    return null;
  }

  /**
   * Tetapkan tarif seorang juru bersih.
   *
   * Penjaganya ada DI SINI, bukan hanya di tombolnya: tombol yang tersaring
   * dari tampilan tetap bisa dipanggil dari tempat lain, dan yang menjaga
   * uang orang tidak boleh cuma CSS.
   */
  function setTarif(userId, nilai, aktif) {
    if (window.AKSES && !AKSES.jaga('mitra.tarif')) return { ok: false, alasan: 'Tidak berizin.' };

    var u = DB.find('users', userId);
    if (!u || u.role !== 'worker') return { ok: false, alasan: 'Mitra tidak ditemukan.' };

    var salah = periksa(nilai);
    if (salah) return { ok: false, alasan: salah };

    var aku = (window.APP && APP.user) || {};
    DB.update('users', userId, {
      pasar: {
        tarif: Number(nilai),
        aktif: !!aktif,
        olehId: aku.id || null,
        olehNama: aku.nama || null,
        at: U.nowISO()
      }
    });
    DB.log(aku.id || null, 'tarif-pasar', 'user', userId,
      'Tarif pasar ' + u.nama + ' ditetapkan Rp' + Number(nilai).toLocaleString('id-ID') +
      (aktif ? ' dan ditayangkan di EXOCLEAN App.' : ' tanpa ditayangkan.'));
    return { ok: true };
  }

  /** Turunkan tayang/tidak tanpa mengubah tarifnya. */
  function setTayang(userId, aktif) {
    if (window.AKSES && !AKSES.jaga('mitra.tarif')) return { ok: false, alasan: 'Tidak berizin.' };
    var u = DB.find('users', userId);
    if (!u) return { ok: false, alasan: 'Mitra tidak ditemukan.' };
    var p = data(u);
    if (aktif && !p.tarif) return { ok: false, alasan: 'Tetapkan tarifnya dulu sebelum ditayangkan.' };
    DB.update('users', userId, { pasar: Object.assign({}, p, { aktif: !!aktif }) });
    return { ok: true };
  }

  /* Benar hanya bila DB sudah DIMUAT. `window.DB` saja tidak cukup: modulnya
     ada sejak berkasnya dimuat, tetapi isinya baru ada setelah DB.init().
     Tanpa penjaga ini, memanggil juruBersih() terlalu awal melempar
     TypeError di dalam DB.all() alih-alih memulangkan daftar kosong. */
  function siap() {
    return !!(window.DB && DB.raw);
  }

  /**
   * Bintang dan jumlah pekerjaan seorang mitra.
   *
   * Dihitung, tidak disimpan. `ratings` menempel pada ORDER, bukan pada
   * orang, jadi nilainya diambil lewat order tempat ia bekerja. Satu order
   * dikerjakan beberapa orang dan nilainya dibagi rata ke mereka — itu tidak
   * sempurna, dan memang tidak bisa: pelanggan menilai kunjungannya, bukan
   * tiap orang di dalamnya. Yang bisa dilakukan adalah TIDAK berpura-pura
   * angkanya lebih tajam daripada asalnya.
   */
  function statistik(userId) {
    var selesai = 0, jumlah = 0, n = 0;
    if (!siap()) return { bintang: null, kerja: 0 };

    var punyaNilai = {};
    DB.all('ratings').forEach(function (r) { punyaNilai[r.orderId] = r.bintang; });

    DB.all('orders').forEach(function (o) {
      if (!o.workerIds || o.workerIds.indexOf(userId) < 0) return;
      if (['selesai', 'diverifikasi', 'ditagih', 'lunas'].indexOf(o.status) < 0) return;
      selesai++;
      if (punyaNilai[o.id] !== undefined) { jumlah += punyaNilai[o.id]; n++; }
    });

    return { bintang: n ? Math.round(jumlah / n * 10) / 10 : null, kerja: selesai };
  }

  /**
   * Daftar juru bersih untuk EXOCLEAN App.
   *
   * Bentuknya sengaja sudah siap tayang — aplikasi ponselnya tidak perlu
   * tahu tabel apa pun. Yang belum ditetapkan tarifnya TIDAK muncul; itu
   * bukan penyaringan tampilan melainkan arti dari "belum ditetapkan".
   */
  function juruBersih() {
    if (!siap()) return [];
    return DB.all('users').filter(tayang).map(function (u) {
      var s = statistik(u.id);
      return {
        id: u.id,
        nama: u.nama,
        inisial: window.U && U.initials ? U.initials(u.nama) : u.nama.slice(0, 2).toUpperCase(),
        jabatan: u.jabatan || '',
        tarif: u.pasar.tarif,
        bintang: s.bintang,
        kerja: s.kerja,
        sertifikat: (u.sertifikat || []).slice(),
        sejak: u.daftarAt || u.createdAt || null,
        telp: u.telp || ''
      };
    }).sort(function (a, b) { return a.tarif - b.tarif; });
  }

  return {
    MIN: MIN, MAX: MAX,
    data: data, tarif: tarif, usulan: usulan, tayang: tayang,
    periksa: periksa,
    setTarif: setTarif, setTayang: setTayang,
    statistik: statistik, juruBersih: juruBersih
  };
})();
