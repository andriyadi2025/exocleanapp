/* ==========================================================================
   dwi.js — sambungan ke Darmawisata Indonesia (H2H API v2.1)
   --------------------------------------------------------------------------
   APA YANG DISAMBUNG
   Darmawisata adalah penyedia H2H (host-to-host) untuk dua rumpun layanan
   yang sangat berbeda:

     • PPOB & TopUp — bayar tagihan (PLN, BPJS, air, cicilan) dan isi pulsa.
       Menyambung langsung ke Dompet yang sudah ada di aplikasi ini.
     • Perjalanan   — hotel, pesawat, kereta, bus, kapal, sewa mobil, tur,
       umroh, dan kargo. Rumpun yang jauh lebih besar dan berdiri sendiri.

   MODELNYA AGEN PRABAYAR — DAN ITU MENGUBAH SEGALANYA
   Setiap transaksi memotong saldo DEPOSIT perusahaan di Darmawisata, bukan
   menagih pelanggan lebih dulu. Artinya tiga hal:

     1. Kredensialnya (userID + password agen) sekelas Server Key Midtrans.
        Tidak pernah ada di berkas ini, tidak pernah sampai ke browser. Yang
        dikirim ke Darmawisata pun bukan passwordnya, melainkan
        securityCode = MD5(token + MD5(password)) yang dihitung server kita
        setiap kali login.
     2. Panggilan yang gagal di tengah jalan bisa meninggalkan uang yang
        sudah keluar tanpa layanan yang diterima pelanggan.
     3. Panggilan yang terulang membayar dua kali. Uangnya nyata.

   Karena itu berkas ini TIDAK pernah bicara langsung ke Darmawisata. Ia
   bicara ke app/server/dwi-server.js, dan server itulah yang memegang kunci,
   mengurus sesi, dan menolak jalur yang belum aman dibuka.

   TIGA KEADAAN, sama seperti KIRIM dan PAY:
     • simulasi — data dikarang aplikasi; seluruh alur bisa dicoba tanpa akun
     • live     — lewat backend; butuh dwi-server berjalan dan .env terisi
     • cadangan — live gagal dihubungi, alur tetap jalan dengan penanda jujur
   ========================================================================== */
var DWI = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  var BAWAAN = {
    mode: 'simulasi',        /* simulasi | live */
    backendUrl: '',          /* mis. http://localhost:4300 */
    layanan: {               /* rumpun mana yang ditayangkan ke pengguna */
      ppob: true,
      topup: true,
      /* Dinyalakan atas permintaan. Yang tampil hanya rumpun yang benar-benar
         berlisensi pada akun agen — sisanya digambar mati dengan sebabnya. */
      travel: true
    }
  };

  /* Rumpun layanan pada API. Dipakai layar pengaturan untuk menjelaskan apa
     yang sedang dinyalakan, dan berapa besar permukaannya. */
  var RUMPUN = {
    ppob:   { nama: 'PPOB — bayar tagihan', ic: '🧾', endpoint: 7,
              contoh: 'PLN, BPJS, PDAM, cicilan, internet' },
    topup:  { nama: 'TopUp — pulsa & data', ic: '📱', endpoint: 6,
              contoh: 'pulsa, paket data, e-wallet, token listrik' },
    travel: { nama: 'Perjalanan', ic: '✈️', endpoint: 121,
              contoh: 'hotel, pesawat, kereta, bus, kapal, sewa mobil, tur, umroh, kargo' }
  };

  /* ================================================================ SETELAN */
  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.dwi) { s.dwi = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    Object.keys(BAWAAN).forEach(function (k) {
      if (s.dwi[k] === undefined) s.dwi[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    return s.dwi;
  }

  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
        Object.assign(c[k], patch[k]);
      } else c[k] = patch[k];
    });
    DB.save(true);
    return c;
  }

  function modeSimulasi() { return config().mode !== 'live'; }
  function siap() { return !modeSimulasi() && !!(config().backendUrl || '').trim(); }
  function aktif(rumpun) { return !!config().layanan[rumpun]; }

  function url(jalur) {
    return (config().backendUrl || '').replace(/\/+$/, '') + jalur;
  }

  /**
   * Panggilan dasar ke backend sendiri — bukan ke Darmawisata.
   *
   * Selalu resolve, tidak pernah reject: seluruh layar yang memakainya sudah
   * punya jalur "cadangan", dan janji yang menolak memaksa tiap pemanggil
   * menulis penangkap galat yang isinya sama persis.
   */
  function minta(jalur, opsi) {
    opsi = opsi || {};
    if (!siap()) {
      return Promise.resolve({ ok: false, sumber: 'simulasi',
        pesan: T('Mode simulasi — backend Darmawisata tidak dihubungi.') });
    }
    return fetch(url(jalur), {
      method: opsi.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: opsi.body ? JSON.stringify(opsi.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) return { ok: false, sumber: 'cadangan', pesan: j.error || ('HTTP ' + r.status), detail: j };
        return { ok: true, sumber: 'live', data: j };
      });
    }).catch(function (e) {
      return { ok: false, sumber: 'cadangan', pesan: e.message };
    });
  }

  /* ================================================================ KESEHATAN */
  function ujiKoneksi() {
    if (!(config().backendUrl || '').trim()) {
      return Promise.resolve({ ok: false, pesan: T('Isi alamat backend dulu') });
    }
    return minta('/api/dwi/health').then(function (h) {
      if (!h.ok) return { ok: false, pesan: h.pesan };
      var d = h.data || {};
      return { ok: !!d.siap, pesan: d.pesan || '', info: d };
    });
  }

  /* ================================================================ SALDO AGEN
     Saldo DEPOSIT perusahaan di Darmawisata — bukan saldo dompet pengguna.
     Keduanya sengaja tidak pernah dicampur di satu layar: yang satu uang
     perusahaan, yang satu uang pelanggan, dan menyandingkannya membuat orang
     mengira saldo agen bisa ditarik. */
  function saldoAgen() {
    return minta('/api/dwi/balance').then(function (h) {
      if (!h.ok) return { ok: false, pesan: h.pesan, saldo: null };
      return { ok: true, saldo: (h.data || {}).saldo, waktu: (h.data || {}).waktu };
    });
  }

  /**
   * Panggil satu jalur H2H lewat backend.
   *
   * Backend memegang daftar putihnya sendiri dan akan menolak jalur yang
   * memotong deposit. Penolakan itu BUKAN kegagalan yang perlu disembunyikan
   * — ia dikembalikan apa adanya supaya layar yang memanggil bisa menjelaskan
   * kepada pemakainya bahwa fiturnya memang belum dibuka, bukan sedang rusak.
   */
  function panggil(jalur, isi) {
    return minta('/api/dwi/call', { method: 'POST', body: { jalur: jalur, isi: isi || {} } });
  }

  /* ================================================================ REFERENSI
     Bentuk balasan di bawah BUKAN tebakan dari swagger — ia dibaca dari
     jawaban UAT yang sungguhan. Perlu ditegaskan karena swaggernya sendiri
     tidak menyebutkan nama-nama ini: PPOB/Product membalas "productList",
     TopUp/Product membalas "products", dan keduanya memakai bentuk objek yang
     berbeda pula. Menebak dari nama definisi akan menghasilkan daftar kosong
     yang terlihat seperti "belum ada produk", bukan seperti kesalahan.

     Pada mode simulasi semuanya dijawab dari contoh bawaan supaya layar tetap
     bisa dibangun tanpa akun; setiap hasil simulasi DITANDAI sumbernya. */

  /* --- PPOB: grup dulu, baru produk di dalamnya --- */
  var CONTOH_GRUP_PPOB = ['PLN', 'BPJS', 'PDAM', 'TELKOM', 'MULTI FINANCE'];
  var CONTOH_PPOB = [
    { code: 'PLN', name: 'PLN', group: 'PLN', isActive: true, isOpenPayment: false },
    { code: 'BPJSKS', name: 'BPJS Kesehatan', group: 'BPJS', isActive: true, isOpenPayment: false },
    { code: 'PDAMJKT', name: 'PDAM Jakarta', group: 'PDAM', isActive: true, isOpenPayment: false }
  ];

  /* --- TopUp: jenis → penyedia → produk --- */
  var CONTOH_JENIS = ['Pulsa', 'Game', 'TokenPLN', 'TVBERBAYAR'];
  var CONTOH_PENYEDIA = { Pulsa: ['AS 5000', 'AXIS DATA', 'TSELDATA'] };
  var CONTOH_TOPUP = [
    { code: '2|HSDI5', provider: 'AS 5000', price: 6650, name: 'AS 5000', type: 'PULSA', isActive: true }
  ];

  var CATATAN_SIMULASI =
    'Mode simulasi — daftar di bawah contoh bawaan aplikasi, bukan dari Darmawisata.';

  /**
   * Bungkus seragam untuk seluruh pembacaan referensi.
   *
   * Ketiga keadaan dikembalikan dengan bentuk yang sama — { sumber, data,
   * catatan } — supaya layar yang memakainya tidak perlu tahu sedang di mode
   * apa. Yang membedakan hanya 'sumber', dan itu memang harus terlihat:
   * daftar produk simulasi yang menyamar sebagai daftar sungguhan akan
   * membuat orang menjual barang yang tidak ada.
   */
  function baca(jalur, isi, ambil, contoh) {
    if (modeSimulasi()) {
      return Promise.resolve({ sumber: 'simulasi', data: contoh, catatan: T(CATATAN_SIMULASI) });
    }
    return panggil(jalur, isi).then(function (h) {
      if (!h.ok) return { sumber: 'cadangan', data: contoh, catatan: h.pesan };
      var d = h.data || {};
      /* Darmawisata membalas HTTP 200 sambil menaruh kegagalan di dalam badan
         pesan. Diperiksa di sini supaya tiap pemanggil tidak perlu ingat. */
      if (String(d.status).toUpperCase() !== 'SUCCESS') {
        return { sumber: 'cadangan', data: contoh, catatan: d.respMessage || T('Permintaan ditolak') };
      }
      return { sumber: 'live', data: ambil(d) || [], catatan: '' };
    });
  }

  function grupPPOB() {
    return baca('/PPOB/ProductGroup', {},
      function (d) { return d.productGroups; }, CONTOH_GRUP_PPOB);
  }
  function produkPPOB(grup) {
    return baca('/PPOB/Product', { productGroup: grup || '' },
      function (d) { return d.productList; },
      grup ? CONTOH_PPOB.filter(function (p) { return p.group === grup; }) : CONTOH_PPOB);
  }
  function jenisTopUp() {
    return baca('/TopUp/ProductType', {},
      function (d) { return d.productTypes; }, CONTOH_JENIS);
  }
  function penyediaTopUp(jenis) {
    return baca('/TopUp/Provider', { productType: jenis || '' },
      function (d) { return d.providers; }, CONTOH_PENYEDIA[jenis] || []);
  }
  function produkTopUp(jenis, penyedia) {
    return baca('/TopUp/Product', { productType: jenis || '', provider: penyedia || '' },
      function (d) { return d.products; },
      CONTOH_TOPUP.filter(function (p) { return !penyedia || p.provider === penyedia; }));
  }

  /**
   * Cek tagihan pelanggan. Membaca, belum membayar — tetapi hasilnya
   * mengandung 'billingReferenceID' yang HANYA BERLAKU SEKALI dan menjadi
   * bahan pembayaran. Karena itu ia tidak disimulasikan dengan angka karangan:
   * tagihan palsu di layar yang dipakai orang memutuskan membayar adalah
   * bentuk kebohongan yang paling mahal.
   */
  function cekTagihan(productCode, customerID, msisdn) {
    if (modeSimulasi()) {
      return Promise.resolve({ sumber: 'simulasi', ok: false,
        catatan: T('Cek tagihan tidak disimulasikan — angkanya harus datang dari penyedia yang sebenarnya.') });
    }
    /* customerMSISDN WAJIB, meski swagger tidak menandainya begitu. Tanpa
       nomor ini balasannya "customerMSISDN invalid" — pesan yang terbaca
       seperti nomornya salah, padahal kolomnya memang tidak dikirim. */
    return panggil('/PPOB/Inquiry', { productCode: productCode, customerID: customerID,
                                      customerMSISDN: msisdn || '' })
      .then(function (h) {
        if (!h.ok) return { sumber: 'cadangan', ok: false, catatan: h.pesan };
        var d = h.data || {};
        if (String(d.status).toUpperCase() !== 'SUCCESS') {
          return { sumber: 'live', ok: false, catatan: d.respMessage || T('Tagihan tidak ditemukan') };
        }
        return { sumber: 'live', ok: true, tagihan: d };
      });
  }


  /* ================================================================ PERJALANAN
     Sebelas rumpun, tetapi TIDAK SEMUANYA dilisensikan pada tiap akun agen.
     Yang tidak berlisensi dibalas "agent doesn't has access to request this
     feature" — bukan galat teknis, melainkan keputusan kontrak di sisi
     Darmawisata. Karena itu ketersediaannya DIPERIKSA, bukan diasumsikan:
     menampilkan menu Umroh kepada pengguna yang tidak akan pernah bisa
     memesannya adalah menjanjikan sesuatu yang tak bisa kita penuhi.

     Tiap rumpun punya satu jalur "ketuk" — endpoint paling murah yang tidak
     butuh parameter — hanya untuk menanyakan: akun ini boleh masuk atau
     tidak. */
  var TRAVEL = {
    airline:  { nama: 'Pesawat',        ic: '✈️', ketuk: '/Airline/List',     isi: 'airlines' },
    hotel:    { nama: 'Hotel',          ic: '🏨', ketuk: '/Hotel/Country',    isi: 'countries' },
    train:    { nama: 'Kereta Api',     ic: '🚆', ketuk: '/Train/List',       isi: 'trains' },
    bus:      { nama: 'Bus',            ic: '🚌', ketuk: '/Bus/List',         isi: 'busses' },
    ship:     { nama: 'Kapal (Pelni)',  ic: '🚢', ketuk: '/Ship/Route',       isi: 'origins' },
    shipdlu:  { nama: 'Dharma Lautan',  ic: '⛴️', ketuk: '/ShipDlu/Route',    isi: 'origins' },
    shuttle:  { nama: 'Shuttle',        ic: '🚐', ketuk: '/Shuttle/List',     isi: 'shuttles' },
    carrental:{ nama: 'Sewa Mobil',     ic: '🚗', ketuk: '/CarRental/Location', isi: 'locations' },
    tour:     { nama: 'Paket Wisata',   ic: '🗺️', ketuk: '/Tour/Categories',  isi: 'categories' },
    umroh:    { nama: 'Umroh',          ic: '🕌', ketuk: '/Umroh/Search',     isi: 'packages' },
    cargo:    { nama: 'Kargo',          ic: '📦', ketuk: '/Cargo/Supplier',   isi: 'suppliers' }
  };

  /* Hasil pemeriksaan disimpan supaya tidak diketuk ulang tiap gambar. */
  var izinTravel = null;

  /**
   * Periksa rumpun mana yang bisa diakses akun ini.
   * Sekali per sesi kecuali dipaksa — sebelas panggilan bukan hal yang pantas
   * diulang setiap kali layar digambar.
   */
  function periksaTravel(paksa) {
    if (izinTravel && !paksa) return Promise.resolve(izinTravel);
    if (modeSimulasi()) {
      var semu = {};
      Object.keys(TRAVEL).forEach(function (k) { semu[k] = { ok: false, pesan: T(CATATAN_SIMULASI) }; });
      izinTravel = semu;
      return Promise.resolve(semu);
    }
    return Promise.all(Object.keys(TRAVEL).map(function (k) {
      return panggil(TRAVEL[k].ketuk, {}).then(function (h) {
        var d = (h.ok && h.data) || {};
        var sukses = String(d.status).toUpperCase() === 'SUCCESS';
        return { k: k, ok: sukses, pesan: sukses ? '' : (d.respMessage || h.pesan || ''),
                 n: (d[TRAVEL[k].isi] || []).length };
      });
    })).then(function (arr) {
      var out = {};
      arr.forEach(function (x) { out[x.k] = { ok: x.ok, pesan: x.pesan, n: x.n }; });
      izinTravel = out;
      return out;
    });
  }

  /** Daftar maskapai / kereta / operator bus untuk satu rumpun. */
  function operatorTravel(rumpun) {
    var m = TRAVEL[rumpun];
    if (!m) return Promise.resolve({ sumber: 'live', data: [], catatan: '' });
    return baca(m.ketuk, {}, function (d) { return d[m.isi]; }, []);
  }

  /**
   * Rute satu operator. Nama parameternya berbeda per rumpun — airlineID,
   * trainID, dan seterusnya — dan mengirim nama yang salah dibalas
   * "airlineID invalid", pesan yang terbaca seperti nilainya yang keliru.
   */
  var PARAM_RUTE = { airline: 'airlineID', train: 'trainID', bus: 'busID' };

  /* Rute yang sudah diambil DISIMPAN. Bukan penghematan kecil: daftar rute
     Lion Air 1,7 MB dan butuh sekitar 47 detik. Mengambilnya ulang setiap
     kali pengguna kembali ke maskapai yang sama berarti menyuruh mereka
     menunggu semenit untuk data yang sudah ada di memori. */
  var simpananRute = {};

  /* Rute mana yang diketahui berat. Dipakai layar untuk mengatakan sejujurnya
     bahwa ini akan lama — bukan menampilkan "Memuat…" yang sama seperti
     panggilan setengah detik, lalu membiarkan orang mengira aplikasinya
     menggantung dan menekan tombolnya berulang kali. */
  function ruteBerat(rumpun) { return rumpun === 'airline'; }

  function ruteTravel(rumpun, operatorId) {
    var nama = PARAM_RUTE[rumpun];
    if (!nama) return Promise.resolve({ sumber: 'live', data: [], catatan: '' });
    var kunci = rumpun + ':' + operatorId;
    if (simpananRute[kunci]) return Promise.resolve(simpananRute[kunci]);
    var isiReq = {}; isiReq[nama] = operatorId;
    var jalur = { airline: '/Airline/Route', train: '/Train/Route', bus: '/Bus/Route' }[rumpun];
    return baca(jalur, isiReq, function (d) { return d.routes; }, []).then(function (r) {
      if (r.sumber === 'live') simpananRute[kunci] = r;   /* cadangan tidak disimpan */
      return r;
    });
  }

  /* ================================================================ JALUR UANG
     Memotong deposit perusahaan. Dikirim ke pintu /api/dwi/bayar — BUKAN
     /api/dwi/call — karena hanya pintu itu yang punya catatan transaksi dan
     kunci idempotensi. Server menolak jalur uang yang mencoba lewat pintu
     biasa, jadi salah pintu berakhir sebagai galat yang terbaca, bukan
     sebagai pembayaran kedua yang diam-diam terjadi.

     Balasannya membawa `keadaan` pada kasus yang tidak lugas:
       berjalan — permintaan yang sama sedang di udara
       tertunda — SUDAH masuk ke penyedia, deposit bisa jadi sudah terpotong,
                  tetapi status akhirnya belum keluar
       ragu     — panggilan sebelumnya putus; nasib uangnya belum pasti

     Keduanya BUKAN kegagalan biasa dan tidak boleh dicoba ulang sendiri oleh
     layar. Yang "ragu" khususnya harus dicocokkan manusia dulu. */
  function bayar(jalur, isi) {
    if (modeSimulasi()) {
      return Promise.resolve({ ok: false, keadaan: "simulasi",
        pesan: T("Mode simulasi — pembayaran tidak dijalankan.") });
    }
    if (!siap()) {
      return Promise.resolve({ ok: false, keadaan: "cadangan",
        pesan: T("Backend Darmawisata tidak terhubung.") });
    }
    return fetch(url("/api/dwi/bayar"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jalur: jalur, isi: isi || {} })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok && String(j.status).toUpperCase() === "SUCCESS") {
          return { ok: true, keadaan: "selesai", data: j, diulang: !!j.idempotenDiulang };
        }
        /* Darmawisata membalas status "FAILED" untuk transaksi yang justru
           BERHASIL masuk dan berstatus PENDING — depositnya sudah terpotong.
           Menampilkannya sebagai penolakan biasa akan membuat orang menekan
           tombol bayar sekali lagi. */
        if (j.keadaan === "tertunda") {
          return { ok: false, keadaan: "tertunda", kunci: j.kunci || null,
                   penanda: j.penanda || null,
                   pesan: T("Transaksi sudah masuk ke penyedia dan saldo bisa jadi sudah terpotong, " +
                            "tetapi status akhirnya belum keluar."), data: j };
        }
        return { ok: false, keadaan: j.keadaan || "ditolak",
                 pesan: j.error || j.respMessage || T("Transaksi ditolak"), data: j };
      });
    }).catch(function (e) {
      /* Jaringan putus DI SISI KITA. Server mungkin sudah menerima dan
         meneruskannya — jadi ini bukan kegagalan yang boleh diulang begitu
         saja. Ditandai ragu supaya layarnya bicara sejujurnya. */
      return { ok: false, keadaan: "ragu",
        pesan: T("Sambungan terputus sebelum ada jawaban. Jangan diulang — periksa catatan transaksi dulu.") +
          " (" + e.message + ")" };
    });
  }

  /**
   * Tanyakan nasib transaksi yang belum final.
   *
   * Statusnya ditanyakan ke Darmawisata, bukan ditebak dari lamanya waktu —
   * dan bukan pula diulang. Selama jawabannya belum final, kuncinya tetap
   * menahan pembayaran kedua.
   */
  function cocokkan(kunci) {
    if (!siap()) {
      return Promise.resolve({ ok: false, keadaan: "cadangan",
        pesan: T("Backend Darmawisata tidak terhubung.") });
    }
    return fetch(url("/api/dwi/cocokkan"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kunci: kunci })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { ok: j.keadaan === "selesai", keadaan: j.keadaan || "tidak-dikenal",
                 pesan: j.catatan || j.error || "", detail: j.detail || null };
      });
    }).catch(function (e) {
      return { ok: false, keadaan: "cadangan", pesan: e.message };
    });
  }

  /** Bayar tagihan. billingReferenceID datang dari cekTagihan() dan sekali pakai. */
  function bayarPPOB(billingReferenceID) {
    return bayar("/PPOB/Payment", { billingReferenceID: billingReferenceID });
  }

  /**
   * Pesan TopUp. `urutan` membedakan pengulangan yang DISENGAJA pada nomor
   * dan produk yang sama — dua kali beli pulsa 10.000 untuk nomor yang sama
   * adalah hal wajar, dan tanpa pembeda itu yang kedua akan dikira duplikat.
   */
  function pesanTopUp(msisdn, productCode, urutan) {
    return bayar("/TopUp/Order", { MSISDN: msisdn, productCode: productCode,
                                   sequence: urutan || 1 });
  }

  /** Catatan transaksi uang — dipakai layar pencocokan admin. */
  function transaksi() {
    return minta("/api/dwi/transaksi").then(function (h) {
      if (!h.ok) return { ok: false, pesan: h.pesan, daftar: [], ragu: 0 };
      var d = h.data || {};
      return { ok: true, daftar: d.daftar || [], ragu: d.ragu || 0, total: d.total || 0 };
    });
  }


  return {
    BAWAAN: BAWAAN, RUMPUN: RUMPUN,
    config: config, simpanConfig: simpanConfig,
    modeSimulasi: modeSimulasi, siap: siap, aktif: aktif,
    ujiKoneksi: ujiKoneksi, saldoAgen: saldoAgen, panggil: panggil,
    TRAVEL: TRAVEL, periksaTravel: periksaTravel,
    operatorTravel: operatorTravel, ruteTravel: ruteTravel, ruteBerat: ruteBerat,
    grupPPOB: grupPPOB, produkPPOB: produkPPOB, cekTagihan: cekTagihan,
    jenisTopUp: jenisTopUp, penyediaTopUp: penyediaTopUp, produkTopUp: produkTopUp,
    bayarPPOB: bayarPPOB, pesanTopUp: pesanTopUp, transaksi: transaksi,
    cocokkan: cocokkan
  };
})();
