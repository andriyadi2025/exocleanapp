/* ==========================================================================
   sync.js — memindahkan data dari localStorage ke basis data sungguhan
   --------------------------------------------------------------------------
   ATURAN UTAMA YANG DIPEGANG DI SINI

   Seluruh aplikasi memanggil DB.all/find/insert/update/remove secara SINKRON —
   ratusan tempat, tanpa satu pun await. Mengubahnya menjadi asinkron berarti
   menulis ulang hampir setiap layar, dan setiap penulisan ulang adalah
   kesempatan baru untuk memasukkan bug ke kode yang sudah bekerja.

   Maka yang dipindahkan BUKAN cara aplikasi membaca data, melainkan TEMPAT
   datanya tinggal:

     - salinan kerja tetap di memori, seperti sebelumnya;
     - localStorage turun pangkat menjadi singgahan luring, bukan sumber;
     - sumber kebenarannya berkas SQLite di data-server.

   Setiap perubahan dicatat sebagai OPERASI kecil (satu baris, satu tabel) dan
   dikirim ke server; perubahan dari perangkat lain ditarik dan diterapkan.
   Bukan salinan utuh yang saling menimpa — dua orang yang menyunting dua area
   berbeda tidak boleh saling menghapus pekerjaan.

   YANG TIDAK DIJANJIKAN, DAN HARUS DIKATAKAN

   Penyelesaian bentrokan adalah "yang terakhir menang, per baris". Dua orang
   yang menyunting AREA YANG SAMA pada detik yang sama akan menghasilkan satu
   pemenang, bukan gabungan. Untuk pemakaian satu gedung dengan beberapa staf
   itu memadai; untuk penyuntingan bersamaan yang sungguh-sungguh, ia belum
   cukup dan tidak boleh dibilang cukup.
   ========================================================================== */
var SYNC = (function () {

  var KUNCI_KONFIG = RUANG.kunci('sync');
  var KUNCI_KLIEN = RUANG.kunci('klien');
  /* Antrean kiriman yang belum sampai server. DI LUAR exoclean_db supaya
     kegagalan menulis salinan kerja tidak ikut membuang pekerjaan yang
     belum terkirim — dua hal yang tidak boleh gagal bersamaan. */
  var KUNCI_ANTRE = RUANG.kunci('antre');

  var BAWAAN = {
    aktif: false,
    url: 'http://localhost:4500',
    token: '',
    /* Setiap berapa detik perubahan orang lain ditarik. Tiga detik terasa
       seketika bagi manusia dan tetap ringan bagi server satu gedung. */
    detik: 3
  };

  /* Operasi yang belum terkirim.

     Dulu ini hanya hidup di memori. Akibatnya petugas yang memindai tag di
     basement tanpa sinyal, lalu menutup aplikasinya — atau sekadar
     ponselnya membunuh tab di latar belakang, yang terjadi setiap hari —
     kehilangan seluruh pekerjaannya tanpa satu pun peringatan. Layarnya
     bahkan sempat berkata 'tersimpan'.

     Sekarang ia ditulis ke localStorage pada tiap perubahan dan dibaca
     kembali saat aplikasi dibuka. */
  var antre = [];
  /* Yang sedang di udara ikut DISIMPAN. Kalau tidak, aplikasi yang tertutup
     tepat setelah pengiriman dimulai tetapi sebelum jawabannya datang akan
     kehilangan justru operasi yang paling baru. */
  var sedangDiudara = [];
  var seq = 0;             /* nomor urut terakhir yang sudah diterapkan */
  var timer = null;
  var sedangKirim = false;
  var keadaanTerakhir = { fase: 'mati', pesan: '', pada: null };
  /* Nama penyewa dari server, bukan dari pengaturan di sini: yang menentukan
     data siapa yang terlihat adalah tokennya, dan layar harus menyebut apa
     yang SUNGGUH terjadi di server, bukan apa yang diketik orang. */
  var penyewa = '';
  /* Operasi yang ditolak server karena idnya milik penyewa lain. Disimpan
     supaya layar pengaturan bisa menunjukkannya — penolakan yang hanya
     tercatat di log server tidak pernah dilihat orang yang terkena. */
  var ditolak = [];
  var blokNomor = {};      /* { jenis: { berikut, sampai } } */

  /* -------------------------------------------------------------- konfig */
  function config() {
    var c;
    try { c = JSON.parse(localStorage.getItem(KUNCI_KONFIG) || '{}'); } catch (e) { c = {}; }
    Object.keys(BAWAAN).forEach(function (k) { if (c[k] === undefined) c[k] = BAWAAN[k]; });
    return c;
  }
  function simpanConfig(patch) {
    var c = Object.assign(config(), patch || {});
    try { localStorage.setItem(KUNCI_KONFIG, JSON.stringify(c)); } catch (e) {}
    return c;
  }
  function aktif() { var c = config(); return !!(c.aktif && c.url && c.token); }

  /* ---------------------------------------------------------- antrean */

  /**
   * Bentuk operasi yang DISIMPAN, bukan yang dikirim.
   *
   * Foto dibuang isinya dan disisakan idnya saja. Satu operasi biasa 218
   * byte; satu operasi foto 69.741 byte. Menyimpan fotonya utuh berarti
   * hanya 71 foto yang muat di localStorage — persis tembok yang baru saja
   * dihilangkan dengan memindahkan foto ke IndexedDB. Isinya diambil lagi
   * dari sana saat hendak dikirim.
   */
  function ringkasOp(o) {
    if (o.tabel !== '__foto' || o.aksi === 'hapus') return o;
    return { tabel: o.tabel, id: o.id, aksi: o.aksi, at: o.at, dariFoto: true };
  }

  function simpanAntre() {
    try {
      /* Yang di udara ditaruh DI DEPAN: bila aplikasi dibuka lagi sebelum
         jawabannya datang, urutan aslinya tetap terjaga. */
      var semua = sedangDiudara.concat(antre).map(ringkasOp);
      if (!semua.length) { localStorage.removeItem(KUNCI_ANTRE); return; }
      localStorage.setItem(KUNCI_ANTRE, JSON.stringify({ seq: seq, ops: semua }));
    } catch (e) {
      /* Penyimpanan penuh. Antrean di memori TIDAK dibuang — pekerjaannya
         masih akan terkirim selama aplikasinya tidak ditutup. Yang hilang
         hanyalah jaminan bahwa ia selamat dari penutupan. */
      if (window.UI && !peringatanAntre) {
        peringatanAntre = true;
        UI.toast(I18N.t('Penyimpanan penuh — pekerjaan yang belum terkirim ' +
          'tidak terjamin selamat bila aplikasi ditutup sekarang.'), 'err');
      }
    }
  }
  var peringatanAntre = false;

  function muatAntre() {
    var j = null;
    try { j = JSON.parse(localStorage.getItem(KUNCI_ANTRE) || 'null'); } catch (e) {}
    if (!j || !Array.isArray(j.ops)) return;
    antre = j.ops;
    seq = j.seq || 0;
  }

  /**
   * Kembalikan isi foto yang tadi dibuang, tepat sebelum dikirim.
   *
   * Foto yang sudah tidak ada di IndexedDB DIBUANG dari kiriman, bukan
   * dikirim kosong: baris __foto tanpa isi akan menimpa foto yang mungkin
   * sudah ada di server dengan null, dan itu mengubah kegagalan menjadi
   * kerusakan.
   */
  function lengkapiFoto(ops) {
    var perlu = ops.some(function (o) { return o.dariFoto; });
    /* Tidak ada foto yang perlu dilengkapi — kirim apa adanya. */
    if (!perlu) return Promise.resolve(ops);
    /* FOTO tidak tersedia: operasi fotonya dibuang, sisanya tetap dikirim.
       Menahan seluruh kiriman karena satu foto tidak terbaca berarti
       kehadiran, tugas selesai, dan aduan ikut tertahan tanpa sebab. */
    if (!window.FOTO) {
      return Promise.resolve(ops.filter(function (o) { return !o.dariFoto; }));
    }
    /* Hanya foto yang MEMANG diantre yang dibaca.

       Dulu di sini berdiri FOTO.semua(). Untuk melengkapi tiga foto yang
       tertahan semalam, ia membaca seluruh isi IndexedDB — seribu foto
       lapangan berarti 249 MB masuk ke memori setiap kali antrean disiram,
       dan penyiraman itu terjadi tepat ketika sinyal baru pulih dan ponselnya
       sedang sibuk mengejar segalanya sekaligus. */
    var ids = ops.filter(function (o) { return o.dariFoto; })
                 .map(function (o) { return o.id; });
    return FOTO.beberapa(ids).then(function (peta) {
      peta = peta || {};
      var out = [];
      ops.forEach(function (o) {
        if (!o.dariFoto) { out.push(o); return; }
        var isi = peta[o.id] || (DB.raw.photos ? DB.raw.photos[o.id] : null);
        if (!isi) return;
        out.push({ tabel: o.tabel, id: o.id, aksi: o.aksi, data: isi, at: o.at });
      });
      return out;
    });
  }

  /** Identitas perangkat ini. Dipakai server untuk tidak memantulkan balik
      perubahan yang baru saja kita kirim sendiri. */
  function klienId() {
    var id = null;
    try { id = localStorage.getItem(KUNCI_KLIEN); } catch (e) {}
    if (!id) {
      id = 'kl_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      try { localStorage.setItem(KUNCI_KLIEN, id); } catch (e) {}
    }
    return id;
  }

  /* --------------------------------------------------------- panggilan */

  /* Alamat yang trafiknya tidak pernah meninggalkan mesin ini. Peramban
     memperlakukannya sebagai asal yang aman justru karena itu. */
  function diMesinIni(host) {
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
           host === '::1' || /\.localhost$/.test(host);
  }

  /**
   * Apakah alamat server ini boleh menerima token perangkat.
   *
   * Server sudah menolak melayani jaringan tanpa TLS. Tetapi penolakan itu
   * ada di sisi SANA — dan yang memegang token adalah sisi SINI. Bila
   * seseorang memasang reverse proxy yang salah, atau mengetik alamat http
   * ke mesin lain, tokennya melintas terbuka sebelum server sempat menolak
   * apa pun. Yang memegang rahasia yang memutuskan kapan ia dilepaskan.
   *
   * Mengembalikan '' bila boleh, atau alasan penolakan.
   */
  function alasanTolak(alamat) {
    var a;
    try { a = new URL(alamat); } catch (e) {
      return I18N.t('Alamat server tidak sah.');
    }
    if (a.protocol === 'https:') return '';
    if (a.protocol === 'http:' && diMesinIni(a.hostname)) return '';
    if (a.protocol === 'http:') {
      return I18N.t('Menolak mengirim token perangkat lewat http:// ke mesin lain — ' +
        'ia akan terbaca siapa pun di jaringan yang sama. Pakai https://, atau ' +
        'jalankan servernya di komputer ini.');
    }
    return I18N.t('Alamat server harus diawali http:// atau https://.');
  }

  function minta(jalur, opsi) {
    var c = config();
    opsi = opsi || {};
    var url = String(c.url).replace(/\/+$/, '') + jalur;
    var tolak = alasanTolak(url);
    if (tolak) {
      var e0 = new Error(tolak);
      /* 403, bukan galat jaringan: ini keputusan, bukan gangguan, dan
         mencoba lagi tiap tiga detik tidak akan mengubahnya. */
      e0.kode = 403;
      return Promise.reject(e0);
    }
    return fetch(url, {
      method: opsi.method || 'GET',
      headers: Object.assign({ 'X-Exo-Token': c.token },
        opsi.body ? { 'Content-Type': 'application/json' } : {}),
      body: opsi.body ? JSON.stringify(opsi.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          /* Kode HTTP-nya dibawa serta. Tanpa ini, token yang DICABUT dan
             WiFi yang MATI terlihat sama persis dari sini — dan keduanya
             menuntut tindakan yang sama sekali berbeda dari penggunanya. */
          var err = new Error(j.error || ('HTTP ' + r.status));
          err.kode = r.status;
          err.petunjuk = j.petunjuk || '';
          throw err;
        }
        return j;
      });
    });
  }

  function kesehatan(url) {
    var u = String(url || config().url).replace(/\/+$/, '');
    /* Diperiksa DI SINI juga. Kesehatan tidak membawa token, jadi ia akan
       berhasil di alamat yang nanti menolak token — dan tombol "Uji
       sambungan" yang menyala hijau lalu diikuti kegagalan adalah cara
       tercepat membuat orang berhenti percaya pada tombol itu. */
    var tolak = alasanTolak(u + '/api/data/health');
    if (tolak) return Promise.resolve({ ok: false, pesan: tolak });
    return fetch(u + '/api/data/health')
      .then(function (r) { return r.json(); })
      .then(function (j) { return { ok: !!j.siap, info: j }; })
      .catch(function (e) { return { ok: false, pesan: e.message }; });
  }

  /* ------------------------------------------------------------ operasi
     Dipanggil DB pada setiap perubahan. Ketika sinkronisasi mati, ia tidak
     melakukan apa-apa — aplikasi berjalan persis seperti sebelumnya. */
  function catat(tabel, id, aksi, data) {
    if (!aktif()) return;
    antre.push({ tabel: tabel, id: id, aksi: aksi,
                 data: aksi === 'hapus' ? null : data, at: new Date().toISOString() });
    simpanAntre();
    /* Angkanya berubah walau fasenya tidak — petugas yang memindai lima kali
       tanpa sinyal harus melihat 1, 2, 3, 4, 5, bukan angka yang membeku. */
    if (window.APP && APP.segarkanTopbar) { try { APP.segarkanTopbar(); } catch (e) {} }
    /* Tidak dikirim seketika: satu penyimpanan sering menghasilkan beberapa
       operasi berturut-turut, dan mengirimnya satu per satu berarti beberapa
       perjalanan bolak-balik untuk satu tindakan pengguna. */
    jadwalkanKirim();
  }

  var kirimTimer = null;
  function jadwalkanKirim() {
    if (kirimTimer) return;
    kirimTimer = setTimeout(function () { kirimTimer = null; dorong(); }, 250);
  }

  function dorong() {
    if (!aktif() || sedangKirim || !antre.length) return Promise.resolve();
    sedangKirim = true;
    /* Antrean dipindahkan ke sedangDiudara, BUKAN dibuang. Keduanya sama-sama
       ikut disimpan ke localStorage, sehingga aplikasi yang tertutup tepat di
       antara "terkirim" dan "dijawab" membukanya kembali dengan operasi itu
       masih ada. Kiriman ulang tidak merusak: tiap operasi membawa id
       barisnya sendiri, jadi menerapkannya dua kali menghasilkan hal yang
       sama dengan menerapkannya sekali. */
    sedangDiudara = antre.slice();
    antre = [];
    simpanAntre();

    /* Isi foto dikembalikan tepat sebelum berangkat — di antrean ia hanya
       tersimpan sebagai id. */
    return lengkapiFoto(sedangDiudara)
      .then(function (ops) {
        if (!ops.length) {
          sedangKirim = false;
          sedangDiudara = [];
          simpanAntre();
          return;
        }
        return minta('/api/data/push', { method: 'POST', body: { klien: klienId(), ops: ops } })
          .then(function (j) {
            sedangKirim = false;
            /* Baru DI SINI antrean benar-benar dilepas: server sudah menjawab. */
            sedangDiudara = [];
            if (j.seq) seq = Math.max(seq, j.seq);
            if (j.ditolak && j.ditolak.length) {
              /* Server MENERIMA permintaannya tetapi MENOLAK sebagian barisnya.
                 Ini tidak boleh lewat sebagai 'siap': orangnya menyangka
                 tersimpan, dan baru tahu berbulan kemudian bahwa tidak. */
              ditolak = ditolak.concat(j.ditolak).slice(-50);
              tandai('sebagian', j.ditolak.length + ' perubahan ditolak server');
            } else {
              tandai('siap', '');
            }
            simpanAntre();
            if (antre.length) jadwalkanKirim();
          });
      })
      .catch(function (e) {
        sedangKirim = false;
        antre = sedangDiudara.concat(antre);
        sedangDiudara = [];
        simpanAntre();
        gagalMinta(e);
      });
  }

  /* -------------------------------------------------------------- tarik */
  function tarik() {
    if (!aktif()) return Promise.resolve();
    return minta('/api/data/pull?sejak=' + seq + '&klien=' + encodeURIComponent(klienId()))
      .then(function (j) {
        if (j.seq) seq = Math.max(seq, j.seq);
        if (!j.ops || !j.ops.length) { tandai('siap', ''); return; }
        terapkanOps(j.ops);
        tandai('siap', '');
        /* Layar digambar ulang HANYA bila memang ada yang berubah — menggambar
           ulang tiap tiga detik membuat kolom isian kehilangan fokus dan
           daftar melompat sendiri di bawah jari pengguna. */
        if (window.APP && APP.refresh && APP.user) APP.refresh();
        if (j.adaLagi) return tarik();
      })
      .catch(gagalMinta);
  }

  /**
   * Apa yang dilakukan ketika satu panggilan gagal.
   *
   * 401 dan 403 BUKAN gangguan sementara — mencoba lagi tiap tiga detik
   * tidak akan pernah berhasil, hanya menumpuk penundaan di server dan
   * menahan layar pada kata luring yang menyesatkan. Timernya dihentikan
   * dan pesannya dibuat jelas, supaya orangnya mengurus tokennya.
   *
   * Antrean TIDAK dibuang. Bila tokennya dipulihkan, pekerjaan yang belum
   * terkirim masih ada.
   */
  function gagalMinta(e) {
    if (e && (e.kode === 401 || e.kode === 403)) {
      berhenti();
      tandai(e.kode === 401 ? 'ditolak' : 'terbatas', e.message);
      return;
    }
    /* Dibungkus karena kalimat ini SUNGGUH tampil di layar pengaturan —
       bukan hanya masuk log. */
    tandai('luring', (e && e.message) ||
      (window.I18N ? I18N.t('tidak tersambung') : I18N.t('tidak tersambung')));
  }

  /**
   * Terapkan perubahan orang lain ke salinan di memori.
   *
   * Ditulis langsung ke state DB tanpa lewat DB.insert/update — kalau lewat,
   * setiap perubahan yang masuk akan tercatat lagi sebagai operasi baru dan
   * dikirim balik ke server, dan dua perangkat akan saling melempar operasi
   * yang sama tanpa henti.
   */
  function terapkanOps(ops) {
    var s = DB.raw;
    ops.forEach(function (o) {
      if (o.tabel === '__settings') { s.settings = o.data || {}; return; }
      if (o.tabel === '__counters') { s.counters = o.data || {}; return; }
      if (o.tabel === '__foto') {
        /* Foto dari perangkat LAIN ikut turun ke IndexedDB, sama seperti
           foto yang diambil di perangkat ini sendiri. Kalau hanya masuk ke
           memori, ia hilang saat aplikasi ditutup dan petugas yang membuka
           besok pagi melihat bukti kerja rekannya sebagai kotak kosong. */
        if (o.aksi === 'hapus') DB.buangFoto(o.id);
        else DB.terimaFoto(o.id, o.data);
        return;
      }
      s[o.tabel] = s[o.tabel] || [];
      var arr = s[o.tabel];
      var i = -1;
      for (var n = 0; n < arr.length; n++) if (arr[n].id === o.id) { i = n; break; }
      if (o.aksi === 'hapus') { if (i >= 0) arr.splice(i, 1); return; }
      if (i >= 0) arr[i] = o.data; else arr.push(o.data);
    });
    DB.simpanSinggahan();
  }

  /* ------------------------------------------------------ nomor dokumen
     Nomor TIDAK boleh dihitung dari salinan sendiri: dua perangkat yang
     sama-sama melihat 26 akan sama-sama menerbitkan 27. Petak nomor dipesan
     dari server, dan aplikasi menariknya dari petak itu. */
  function pastikanBlok(jenis) {
    if (!aktif()) return Promise.resolve(null);
    var b = blokNomor[jenis];
    if (b && b.berikut <= b.sampai) return Promise.resolve(b);
    return minta('/api/data/nomor', { method: 'POST', body: { jenis: jenis, jumlah: 25 } })
      .then(function (j) {
        blokNomor[jenis] = { berikut: j.dari, sampai: j.sampai };
        return blokNomor[jenis];
      })
      .catch(function () { return null; });
  }

  /**
   * Nomor berikutnya, atau null bila petaknya habis dan server tak terjangkau.
   * DB yang memutuskan apa yang dilakukan dengan null — di sinilah lapisan ini
   * berhenti dan lapisan di atasnya mengambil keputusan.
   */
  function nomorBerikut(jenis) {
    if (!aktif()) return null;
    var b = blokNomor[jenis];
    if (!b || b.berikut > b.sampai) { pastikanBlok(jenis); return null; }
    var n = b.berikut++;
    /* Dipesan lebih awal, sebelum benar-benar habis: menunggu sampai nol
       berarti pengguna berikutnya menunggu perjalanan ke server. */
    if (b.sampai - b.berikut < 5) pastikanBlok(jenis);
    return n;
  }

  /* ------------------------------------------------------------ mulai */
  function tandai(fase, pesan) {
    var sblm = keadaanTerakhir.fase;
    keadaanTerakhir = { fase: fase, pesan: pesan || '', pada: new Date().toISOString() };
    /* Bilah atas disegarkan SENDIRI, bukan seluruh halaman. Menggambar ulang
       halaman tiap kali fase berubah akan mencuri fokus dari kolom yang
       sedang diketik dan melompatkan daftar di bawah jari penggunanya —
       tepat pada saat sinyalnya sedang timbul-tenggelam dan fasenya berubah
       tiap beberapa detik. */
    if (sblm !== fase && window.APP && APP.segarkanTopbar) {
      try { APP.segarkanTopbar(); } catch (e) {}
    }
  }
  function keadaan() {
    return Object.assign({}, keadaanTerakhir, {
      aktif: aktif(), seq: seq, antre: antre.length + sedangDiudara.length,
      klien: klienId(),
      penyewa: penyewa, ditolak: ditolak.slice()
    });
  }
  function lupakanTolakan() {
    ditolak = [];
    if (keadaanTerakhir.fase === 'sebagian') tandai('siap', '');
  }

  /**
   * Ambil seluruh isi server dan jadikan salinan kerja.
   *
   * Dipanggil saat aplikasi dibuka. Bila server tak terjangkau, aplikasi tetap
   * berjalan dengan singgahan localStorage — luring bukan kegagalan, dan
   * menolak membuka aplikasi karena WiFi mati adalah cara tercepat membuat
   * orang berhenti memakainya.
   */
  /**
   * Terapkan kembali antrean ke salinan kerja setelah snapshot dipasang.
   *
   * Snapshot MENGGANTI seluruh salinan kerja dengan isi server. Pekerjaan
   * yang belum sempat naik karena itu lenyap dari layar — padahal ia masih
   * ada di antrean dan akan terkirim sebentar lagi. Petugas yang memindai
   * di basement lalu membuka aplikasinya di lobi akan melihat pindaiannya
   * hilang, memindai ulang, dan menghasilkan dua catatan untuk satu
   * kedatangan.
   *
   * Karena itu antrean dipasang kembali DI ATAS snapshot, sebelum layar
   * pertama digambar.
   */
  function pasangUlangAntre() {
    var tunggu = sedangDiudara.concat(antre);
    if (!tunggu.length) return;
    /* Operasi foto dilewati: isinya tidak ada di antrean, dan fotonya
       sendiri sudah dimuat dari IndexedDB oleh DB.muatFoto(). */
    terapkanOps(tunggu.filter(function (o) { return !o.dariFoto; }));
  }

  function muat() {
    if (!aktif()) return Promise.resolve({ dari: 'lokal' });
    tandai('memuat', '');
    return minta('/api/data/snapshot')
      .then(function (j) {
        seq = j.seq || 0;
        penyewa = j.penyewa || '';
        DB.pakaiSnapshot(j.isi || {});
        pasangUlangAntre();
        tandai('siap', '');
        mulaiTimer();
        /* Yang tertunda langsung didorong — bukan menunggu detik berikutnya.
           Petugas yang baru mendapat sinyal berdiri di depan layarnya, dan
           tiga detik menunggu tanpa sebab adalah tiga detik ia mengira
           aplikasinya tidak bekerja. */
        if (antre.length) jadwalkanKirim();
        return { dari: 'server', baris: j.baris || 0, penyewa: penyewa,
                 tertunda: antre.length };
      })
      .catch(function (e) {
        gagalMinta(e);
        /* Timer TIDAK dinyalakan bila tokennya ditolak — gagalMinta sudah
           mematikannya, dan menyalakannya lagi di sini akan membatalkan
           keputusan itu setiap kali aplikasi dibuka. */
        if (keadaanTerakhir.fase === 'luring') mulaiTimer();
        return { dari: 'singgahan', pesan: e.message, kode: e.kode || 0 };
      });
  }

  function mulaiTimer() {
    berhenti();
    var c = config();
    timer = setInterval(function () { dorong().then(tarik); },
      Math.max(1, c.detik) * 1000);
  }
  function berhenti() { if (timer) { clearInterval(timer); timer = null; } }

  /**
   * Pindahkan seluruh isi localStorage ke server, sekali.
   *
   * Menolak berjalan bila server sudah berisi — kecuali dipaksa. Perpindahan
   * yang tidak sengaja menimpa data bersama dengan salinan lama satu orang
   * adalah kerusakan yang tidak bisa dibatalkan.
   */
  function migrasi(paksa) {
    var s = DB.raw;
    var ops = [];
    Object.keys(s).forEach(function (t) {
      if (t === '_v' || t === 'counters' || t === 'settings' || t === 'photos') return;
      if (!Array.isArray(s[t])) return;
      s[t].forEach(function (r) {
        if (r && r.id) ops.push({ tabel: t, id: r.id, aksi: 'set', data: r, at: r.updatedAt || r.createdAt || new Date().toISOString() });
      });
    });
    ops.push({ tabel: '__settings', id: 'settings', aksi: 'set', data: s.settings || {}, at: new Date().toISOString() });
    ops.push({ tabel: '__counters', id: 'counters', aksi: 'set', data: s.counters || {}, at: new Date().toISOString() });
    /* Foto TIDAK ikut di gelombang pertama.

       Dua sebab. Pertama, sejak salinan di memori dibatasi, DB.raw.photos
       hanya berisi seratusan foto yang kebetulan baru dilihat — mengirim
       dari sana berarti sembilan ratus foto lainnya tidak pernah sampai ke
       server, tanpa satu pun galat. Kedua, server menolak kiriman di atas
       40 MB, dan seribu foto lapangan berukuran 249 MB: sebelum perubahan
       ini pun migrasinya sudah gagal, hanya saja gagalnya terlihat.

       Jadi: data dulu, foto menyusul bergelombang. */
    var jml = 0;
    return minta('/api/data/migrasi', { method: 'POST', body: {
      klien: klienId(), ops: ops, counters: s.counters || {}, paksa: !!paksa
    } }).then(function (j) {
      seq = j.seq || 0;
      jml = ops.length;
      return DB.fotoUntukMigrasi();
    }).then(function (foto) {
      var ids = Object.keys(foto || {});
      if (!ids.length) return { baris: null, foto: 0 };
      /* 8 MB per gelombang: seperlima batas server, jadi satu foto yang
         jauh lebih besar daripada dugaan tidak menggagalkan gelombangnya. */
      var BATAS = 8 * 1024 * 1024;
      var gelombang = [], kini = [], byte = 0;
      ids.forEach(function (id) {
        var d = foto[id] || '';
        if (kini.length && byte + d.length > BATAS) { gelombang.push(kini); kini = []; byte = 0; }
        kini.push({ tabel: '__foto', id: id, aksi: 'set', data: d,
                    at: new Date().toISOString() });
        byte += d.length;
      });
      if (kini.length) gelombang.push(kini);

      /* Berurutan, bukan serentak. Empat puluh permintaan berisi 8 MB yang
         berangkat bersamaan akan menghabiskan memori server, dan itu
         persis hal yang batas 40 MB itu jaga. */
      var i = 0, terkirim = 0;
      function lanjut() {
        if (i >= gelombang.length) return { baris: null, foto: terkirim };
        var g = gelombang[i++];
        return minta('/api/data/migrasi', { method: 'POST', body: {
          klien: klienId(), ops: g, paksa: true
        } }).then(function (j2) {
          seq = j2.seq || seq;
          terkirim += g.length;
          if (window.APP && APP.kabarMigrasi) {
            APP.kabarMigrasi(terkirim, ids.length);
          }
          return lanjut();
        });
      }
      return lanjut();
    }).then(function (h) {
      return { ok: true, baris: h.baris, ops: jml, foto: h.foto };
    });
  }

  /* Dibaca sekali, saat berkas ini dimuat — SEBELUM apa pun memanggil
     catat() atau dorong(). Membacanya belakangan berarti ada jendela di
     mana antrean tersimpan sudah ada tetapi belum dikenali, dan simpanAntre
     berikutnya akan menimpanya dengan daftar kosong. */
  muatAntre();

  return {
    BAWAAN: BAWAAN,
    config: config, simpanConfig: simpanConfig, aktif: aktif, klienId: klienId,
    kesehatan: kesehatan, keadaan: keadaan, lupakanTolakan: lupakanTolakan,
    catat: catat, dorong: dorong, tarik: tarik, tertunda: function () {
      return sedangDiudara.concat(antre).slice();
    },
    muat: muat, migrasi: migrasi, berhenti: berhenti,
    nomorBerikut: nomorBerikut, pastikanBlok: pastikanBlok,
    minta: minta
  };
})();
