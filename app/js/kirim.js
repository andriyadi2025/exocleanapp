/* ==========================================================================
   kirim.js — pengiriman barang lewat Biteship
   --------------------------------------------------------------------------
   Biteship adalah agregator kurir: satu API untuk JNE, J&T, SiCepat, Anteraja,
   Ninja, GoSend, GrabExpress, Paxel, dan lainnya. Modul ini memakainya untuk
   tiga hal — menanyakan tarif, membuat pesanan kirim, dan melacak paket.

   API KEY TIDAK PERNAH ADA DI SINI.
   Kunci Biteship berhak MEMBUAT PESANAN, artinya berhak mengeluarkan uang.
   Menaruhnya di kode browser sama saja menyerahkan dompet perusahaan kepada
   siapa pun yang membuka Inspect Element. Kunci hanya hidup di berkas .env
   pada server, dan browser bicara ke server itu — persis pola yang dipakai
   Midtrans di pay.js.

   TIGA KEADAAN, BUKAN DUA
     • simulasi  — tarif dikarang dari jarak; aplikasi tetap utuh tanpa kunci
     • live      — tarif sungguhan dari Biteship lewat backend
     • jatuh balik — mode live tetapi permintaannya gagal; tarif zona lama
                     dipakai supaya pembeli tidak terjebak di halaman kosong

   Keadaan ketiga itu yang paling sering terlupakan, padahal justru yang
   menentukan apakah toko masih bisa berjualan saat jaringan sedang buruk.
   ========================================================================== */
var KIRIM = (function () {

  var BAWAAN = {
    mode: 'simulasi',            /* simulasi | live */
    backendUrl: '',              /* mis. http://localhost:4200 */
    kurir: ['jne', 'jnt', 'sicepat', 'anteraja', 'ninja', 'pos'],
    /* Alamat asal Toko Resmi EXOCLEAN. Mitra toko memakai alamat tokonya
       sendiri; yang di sini hanya cadangan bila belum diisi. */
    asal: { kodePos: '12190', alamat: 'Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan',
            lat: -6.2088, lng: 106.8456 },
    /* Ukuran & berat bawaan per barang bila datanya belum ada di produk.
       Kurir menagih menurut berat volumetrik, jadi dimensi tetap perlu. */
    beratBawaanGram: 1000,
    dimensiBawaan: { p: 20, l: 15, t: 10 },
    asuransiOtomatis: false,
    tarikTunai: false,           /* COD */
    /* Jangkauan kurir instan dan sehari-sampai, dipakai filter katalog untuk
       menjawab "toko ini bisa dikirim instan ke saya atau tidak". Angka
       SIMULASI: dalam mode live yang menentukan adalah jawaban Biteship
       untuk alamat tujuan sebenarnya, bukan angka di sini. */
    radiusInstanKm: 25,
    radiusSameDayKm: 60
  };

  /* Kurir yang lazim dipakai di Indonesia, untuk daftar pilihan admin dan
     untuk menamai hasil simulasi. Kode mengikuti penamaan Biteship. */
  var KURIR = {
    jne:       { nama: 'JNE', ic: '🟥' },
    jnt:       { nama: 'J&T Express', ic: '🟧' },
    sicepat:   { nama: 'SiCepat', ic: '🟥' },
    anteraja:  { nama: 'AnterAja', ic: '🟦' },
    ninja:     { nama: 'Ninja Xpress', ic: '⬛' },
    pos:       { nama: 'POS Indonesia', ic: '🟧' },
    tiki:      { nama: 'TIKI', ic: '🟦' },
    lion:      { nama: 'Lion Parcel', ic: '🟥' },
    idexpress: { nama: 'ID Express', ic: '🟩' },
    rpx:       { nama: 'RPX', ic: '🟦' },
    sap:       { nama: 'SAP Express', ic: '🟦' },
    wahana:    { nama: 'Wahana', ic: '🟨' },
    gojek:     { nama: 'GoSend', ic: '🟩' },
    grab:      { nama: 'GrabExpress', ic: '🟩' },
    paxel:     { nama: 'Paxel', ic: '🟪' },
    borzo:     { nama: 'Borzo', ic: '🟧' },
    lalamove:  { nama: 'Lalamove', ic: '🟧' }
  };

  /* Kurir instan menghitung tarif dari jarak, bukan dari zona pengiriman —
     dibedakan supaya simulasi maupun penjelasan di layar tidak menyesatkan. */
  var INSTAN = ['gojek', 'grab', 'lalamove', 'borzo', 'paxel'];

  /* ================================================================ SETELAN */
  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.kirim) { s.kirim = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    Object.keys(BAWAAN).forEach(function (k) {
      if (s.kirim[k] === undefined) s.kirim[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    return s.kirim;
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
  function namaKurir(kode) { return (KURIR[kode] || {}).nama || String(kode || '').toUpperCase(); }
  function ikonKurir(kode) { return (KURIR[kode] || {}).ic || '📦'; }

  /* ================================================================ BACKEND */
  function panggil(path, opsi) {
    var base = (config().backendUrl || '').replace(/\/+$/, '');
    if (!base) return Promise.reject(new Error(I18N.t('URL backend pengiriman belum diisi.')));
    opsi = opsi || {};
    return fetch(base + path, {
      method: opsi.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: opsi.body ? JSON.stringify(opsi.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || ('Server pengiriman menolak (HTTP ' + r.status + ')'));
        return j;
      });
    });
  }

  function ujiKoneksi() {
    return panggil('/api/kirim/health').then(function (j) {
      return { ok: !!j.ok, mode: j.mode, pesan: j.pesan || 'Terhubung', kurir: j.kurir || [] };
    });
  }

  /* ================================================================ PAKET */
  /**
   * Susun daftar barang untuk Biteship. Berat dan dimensi diambil dari produk
   * bila ada; kalau tidak, dipakai nilai bawaan — lebih baik memakai perkiraan
   * yang diumumkan daripada mengirim nol dan mendapat tarif yang salah.
   */
  function barangPaket(items) {
    return (items || []).map(function (i) {
      var p = BIZ.produk(i.productId) || {};
      var d = dimensiProduk(p);
      return {
        id: p.id || i.productId,
        name: p.nama || 'Barang',
        description: p.kategori || 'Perlengkapan kebersihan',
        value: i.harga || p.harga || 0,
        quantity: i.qty || 1,
        /* Berat sebenarnya yang dikirim ke Biteship, BUKAN berat tertagih —
           kurirlah yang menghitung volumetriknya sendiri dari dimensi. Mengirim
           berat tertagih akan membuat perhitungannya berlipat dua kali. */
        weight: beratProduk(p),
        length: d.p, width: d.l, height: d.t
      };
    });
  }

  /* Pembagi berat volumetrik. 6000 adalah angka yang dipakai hampir semua
     ekspedisi darat di Indonesia: panjang × lebar × tinggi (cm) ÷ 6000 = kg. */
  var PEMBAGI_VOLUME = 6000;

  /** Dimensi sebuah produk, atau nilai bawaan bila belum diisi. */
  function dimensiProduk(p) {
    var d = (p && p.dimensi) || {};
    var b = config().dimensiBawaan;
    return { p: Number(d.p) || b.p, l: Number(d.l) || b.l, t: Number(d.t) || b.t };
  }

  function beratProduk(p) {
    return Number(p && p.beratGram) || config().beratBawaanGram;
  }

  /** Berat volumetrik satu barang, dalam gram. */
  function beratVolume(p) {
    var d = dimensiProduk(p);
    return Math.round(d.p * d.l * d.t / PEMBAGI_VOLUME * 1000);
  }

  /**
   * Berat yang BENAR-BENAR ditagih kurir: yang lebih besar antara berat
   * sebenarnya dan berat volumetrik. Satu karton tisu ringan tetapi besar
   * dibayar menurut ukurannya, bukan menurut timbangannya — itulah sebabnya
   * dimensi tetap wajib meski barangnya enteng.
   */
  function beratTertagih(p) {
    return Math.max(beratProduk(p), beratVolume(p));
  }

  /** Apakah dimensi/berat produk ini masih memakai nilai bawaan. */
  function perkiraan(p) {
    return !(p && Number(p.beratGram) > 0 && p.dimensi &&
      Number(p.dimensi.p) > 0 && Number(p.dimensi.l) > 0 && Number(p.dimensi.t) > 0);
  }

  function totalBerat(items) {
    return (items || []).reduce(function (a, i) {
      var p = BIZ.produk(i.productId) || {};
      return a + beratTertagih(p) * (i.qty || 1);
    }, 0);
  }

  /** "1,2 kg" — untuk ditampilkan di kartu produk dan keranjang. */
  function teksBerat(gram) {
    if (!gram) return '—';
    if (gram < 1000) return gram + ' g';
    return (gram / 1000).toFixed(gram % 1000 === 0 ? 0 : 1).replace('.', ',') + ' kg';
  }

  /** Titik asal sebuah toko: alamat toko mitra, atau alamat asal pengaturan. */
  function asalToko(sellerId) {
    var c = config();
    if (!sellerId) return { kodePos: c.asal.kodePos, alamat: c.asal.alamat,
                            lat: c.asal.lat, lng: c.asal.lng };
    var u = DB.find('users', sellerId);
    var t = u ? SELLER.toko(u) : null;
    var k = t && t.koordinat;
    return {
      kodePos: (t && t.kodePos) || c.asal.kodePos,
      alamat: (t && t.alamat) || c.asal.alamat,
      lat: k ? k.lat : c.asal.lat, lng: k ? k.lng : c.asal.lng
    };
  }

  /* ================================================================ SIMULASI
     Angkanya diturunkan dari jarak memakai zona ongkir yang sudah ada, lalu
     dibedakan per kurir dan per layanan. Tujuannya bukan menebak tarif asli,
     melainkan membuat seluruh alur — pilih kurir, bayar, lacak — bisa dicoba
     dan diuji tanpa kunci API. */
  var LAYANAN_SIM = [
    { kode: 'reg', nama: 'Reguler', kali: 1.0, etd: '2 - 3 hari' },
    { kode: 'yes', nama: 'Express', kali: 1.65, etd: '1 hari' },
    { kode: 'eco', nama: 'Hemat', kali: 0.78, etd: '4 - 6 hari' }
  ];

  function tarifSimulasi(p) {
    var dasar = MAPS.ongkir(p.dari, p.ke, 0);
    var km = dasar.km;
    var beratKg = Math.max(1, Math.ceil((p.beratGram || 1000) / 1000));
    var out = [];

    config().kurir.forEach(function (kode, idx) {
      if (INSTAN.indexOf(kode) >= 0) {
        /* Kurir instan: satu layanan, tarif per kilometer, tidak per kilogram. */
        var jarak = km === null ? 12 : km;
        out.push({
          kurir: kode, kurirNama: namaKurir(kode), layanan: 'instant',
          layananNama: 'Instant', tipe: 'instan',
          harga: Math.round((10000 + jarak * 2500) / 500) * 500,
          etd: '1 - 3 jam', simulasi: true
        });
        return;
      }
      LAYANAN_SIM.forEach(function (l) {
        /* selisih kecil antar kurir supaya daftarnya terasa nyata, tetapi
           tetap urut dan bisa ditebak saat diuji */
        var bumbu = 1 + ((idx % 4) - 1.5) * 0.04;
        out.push({
          kurir: kode, kurirNama: namaKurir(kode),
          layanan: l.kode, layananNama: l.nama, tipe: 'kargo',
          harga: Math.round(dasar.tarif * l.kali * bumbu * beratKg / 500) * 500,
          etd: l.etd, simulasi: true
        });
      });
    });

    return U.sortBy(out, function (x) { return x.harga; });
  }

  /* ================================================================ TARIF */
  /**
   * Tanyakan tarif kurir.
   * p = { sellerId, tujuan:{kodePos, lat, lng, alamat}, items, beratGram }
   * → Promise<{ sumber:'biteship'|'simulasi'|'cadangan', opsi:[…], catatan }>
   *
   * Selalu resolve, tidak pernah reject: kegagalan jaringan dikembalikan
   * sebagai tarif cadangan beserta keterangannya, sehingga halaman checkout
   * tidak pernah buntu hanya karena Biteship sedang tidak bisa dihubungi.
   */
  function tarif(p) {
    var asal = asalToko(p.sellerId);
    var beratGram = p.beratGram || totalBerat(p.items);
    var permintaan = {
      dari: asal, ke: p.tujuan, beratGram: beratGram,
      items: barangPaket(p.items), kurir: config().kurir
    };

    if (!siap()) {
      return Promise.resolve({
        sumber: 'simulasi',
        opsi: tarifSimulasi({ dari: { lat: asal.lat, lng: asal.lng }, ke: p.tujuan, beratGram: beratGram }),
        catatan: I18N.t('Mode simulasi — tarif di bawah dibuat aplikasi, bukan oleh kurir.')
      });
    }

    return panggil('/api/kirim/rates', { method: 'POST', body: permintaan })
      .then(function (j) {
        var opsi = (j.opsi || []).map(function (o) {
          return Object.assign({ kurirNama: namaKurir(o.kurir), simulasi: false }, o);
        });
        if (!opsi.length) throw new Error(I18N.t('Tidak ada layanan kurir untuk tujuan ini.'));
        return { sumber: 'biteship', opsi: U.sortBy(opsi, function (x) { return x.harga; }) };
      })
      .catch(function (e) {
        var cadangan = MAPS.ongkir({ lat: asal.lat, lng: asal.lng }, p.tujuan, 0);
        return {
          sumber: 'cadangan',
          opsi: [{ kurir: 'internal', kurirNama: 'Kurir EXOCLEAN', layanan: 'reg',
                   layananNama: 'Reguler', tipe: 'kargo', harga: cadangan.tarif,
                   etd: '1 - 3 hari', simulasi: false, cadangan: true }],
          catatan: I18N.t('Tarif kurir tidak dapat diambil ({sebab}). Sementara dipakai ' +
            'tarif dasar EXOCLEAN — pesanan tetap bisa dilanjutkan.')
            .replace('{sebab}', e.message)
        };
      });
  }

  /* ================================================================ AREA */
  /** Cari kode pos / kelurahan lewat Biteship, untuk mengisi alamat pengiriman. */
  function cariArea(q) {
    if (!q || q.length < 3) return Promise.resolve([]);
    if (!siap()) return Promise.resolve([]);
    return panggil('/api/kirim/areas?q=' + encodeURIComponent(q))
      .then(function (j) { return j.areas || []; })
      .catch(function () { return []; });
  }

  /** Daftar kurir yang benar-benar aktif di akun Biteship milik pengguna. */
  function daftarKurir() {
    if (!siap()) {
      return Promise.resolve(Object.keys(KURIR).map(function (k) {
        return { kurir: k, nama: KURIR[k].nama, simulasi: true }; }));
    }
    return panggil('/api/kirim/couriers')
      .then(function (j) { return j.kurir || []; })
      .catch(function () { return []; });
  }

  /* ================================================================ PESANAN KIRIM */
  /**
   * Daftarkan pesanan toko ke Biteship dan simpan nomor resinya.
   * Dipanggil ketika penjual menekan "Kirim" — bukan lebih awal, karena
   * pesanan kirim yang dibuat sebelum barang siap akan menghanguskan slot
   * penjemputan dan menagih biaya pembatalan.
   */
  function buatPengiriman(shopOrderId) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) return Promise.reject(new Error(I18N.t('Pesanan tidak ditemukan')));
    if (so.biteshipOrderId) return Promise.resolve({ sudahAda: true, orderId: so.biteshipOrderId });

    var pembeli = BIZ.user(so.clientId) || {};
    var asal = asalToko(so.sellerId);
    var pilihan = so.kurirPilihan || {};

    if (!siap()) {
      /* Mode simulasi: nomor resi dibuat sendiri supaya alur pelacakan tetap
         bisa dicoba dari ujung ke ujung. */
      var resi = 'SIM' + Date.now().toString().slice(-10);
      DB.update('shopOrders', shopOrderId, {
        biteshipOrderId: 'sim_' + shopOrderId, resi: resi,
        kurir: pilihan.kurirNama || 'Kurir EXOCLEAN'
      });
      return Promise.resolve({ simulasi: true, resi: resi });
    }

    return panggil('/api/kirim/orders', { method: 'POST', body: {
      refId: so.no,
      dari: asal,
      ke: {
        nama: pembeli.nama, telp: pembeli.telp, email: pembeli.email,
        alamat: so.alamatKirim, kodePos: (so.alamatKirimData || {}).kodePos,
        lat: (so.alamatKirimData || {}).lat, lng: (so.alamatKirimData || {}).lng,
        catatan: so.catatan || ''
      },
      kurir: pilihan.kurir, layanan: pilihan.layanan, tipe: pilihan.tipe,
      items: barangPaket(so.items),
      nilaiBarang: so.subtotal || 0,
      asuransi: !!config().asuransiOtomatis
    } }).then(function (j) {
      DB.update('shopOrders', shopOrderId, {
        biteshipOrderId: j.orderId || null,
        resi: j.resi || so.resi || null,
        kurir: pilihan.kurirNama || namaKurir(pilihan.kurir),
        kirimStatus: j.status || 'confirmed'
      });
      return j;
    });
  }

  /** Riwayat perjalanan paket. Selalu resolve; kegagalan jadi daftar kosong. */
  function lacak(shopOrderId) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) return Promise.resolve({ riwayat: [], status: null });

    if (!siap() || !so.biteshipOrderId || String(so.biteshipOrderId).indexOf('sim_') === 0) {
      return Promise.resolve({ simulasi: true, status: so.status, riwayat: riwayatSimulasi(so) });
    }
    return panggil('/api/kirim/tracking/' + encodeURIComponent(so.biteshipOrderId))
      .then(function (j) { return { status: j.status, riwayat: j.riwayat || [] }; })
      .catch(function (e) { return { status: null, riwayat: [], galat: e.message }; });
  }

  /** Perjalanan paket versi simulasi, disusun dari cap waktu yang sudah ada. */
  function riwayatSimulasi(so) {
    var out = [];
    function tambah(at, judul, ket) {
      if (at) out.push({ at: at, judul: judul, ket: ket });
    }
    tambah(so.createdAt, I18N.t('Pesanan dibuat'), 'Menunggu konfirmasi penjual');
    tambah(so.dikonfirmasiAt, I18N.t('Pesanan dikonfirmasi'), I18N.t('Penjual menyiapkan barang'));
    tambah(so.dikirimAt, I18N.t('Paket diserahkan ke kurir'),
      (so.kurir || 'Kurir') + (so.resi ? ' • resi ' + so.resi : ''));
    tambah(so.selesaiAt, 'Paket diterima', I18N.t('Pesanan selesai'));
    return out;
  }

  /* ================================================================ BANTU UI */
  /** Satu baris ringkas pilihan kurir, dipakai di keranjang dan detail pesanan. */
  function ringkas(pil) {
    if (!pil || !pil.kurir) return '—';
    return ikonKurir(pil.kurir) + ' ' + (pil.kurirNama || namaKurir(pil.kurir)) +
      ' · ' + (pil.layananNama || pil.layanan) +
      (pil.etd ? ' · ' + pil.etd : '');
  }

  return {
    BAWAAN: BAWAAN, KURIR: KURIR, INSTAN: INSTAN,
    config: config, simpanConfig: simpanConfig, modeSimulasi: modeSimulasi, siap: siap,
    namaKurir: namaKurir, ikonKurir: ikonKurir,
    ujiKoneksi: ujiKoneksi, daftarKurir: daftarKurir, cariArea: cariArea,
    tarif: tarif, totalBerat: totalBerat, barangPaket: barangPaket, asalToko: asalToko,
    PEMBAGI_VOLUME: PEMBAGI_VOLUME, dimensiProduk: dimensiProduk, beratProduk: beratProduk,
    beratVolume: beratVolume, beratTertagih: beratTertagih, perkiraan: perkiraan, teksBerat: teksBerat,
    buatPengiriman: buatPengiriman, lacak: lacak, ringkas: ringkas
  };
})();
