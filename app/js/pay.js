/* ==========================================================================
   pay.js — lapisan pembayaran (Midtrans & Xendit)
   --------------------------------------------------------------------------
   PENTING SOAL KEAMANAN
   Server Key Midtrans dan Secret Key Xendit TIDAK BOLEH ada di kode browser.
   Siapa pun bisa membacanya lewat View Source dan memakai akun pembayaran Anda.
   Karena itu modul ini bekerja dalam tiga mode:

     • simulasi  — default. Transaksi dibuat lokal, nomor VA/QRIS dibuat-buat,
                   dan status pembayaran bisa dipicu manual. Untuk demo & uji alur.
     • midtrans  — memanggil backend Anda sendiri, yang meneruskan ke Midtrans
                   Snap/Core API memakai Server Key yang tersimpan aman di server.
     • xendit    — sama, memakai Xendit Invoice/Payment Request API.

   Kode server referensi tersedia di folder `server/`. Yang perlu diisi di sini
   hanya URL backend + Client Key (yang memang boleh publik).
   ========================================================================== */
var PAY = (function () {

  /* ================================================================ KANAL BAYAR */
  /**
   * biaya   : { flat: Rp, persen: % }  — biaya layanan gateway
   * gateway : gateway yang mendukung kanal ini pada konfigurasi bawaan.
   *           Ketersediaan sesungguhnya tergantung kanal yang diaktifkan pada
   *           akun merchant Anda — silakan sesuaikan.
   */
  var CHANNELS = [
    /* --- Virtual Account --- */
    { id: 'va_bca',     grup: 'Virtual Account', nama: 'BCA Virtual Account',     ic: '🏦', bank: 'BCA',     kodeBank: '014',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },
    { id: 'va_mandiri', grup: 'Virtual Account', nama: 'Mandiri Virtual Account', ic: '🏦', bank: 'Mandiri', kodeBank: '008',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },
    { id: 'va_bni',     grup: 'Virtual Account', nama: 'BNI Virtual Account',     ic: '🏦', bank: 'BNI',     kodeBank: '009',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },
    { id: 'va_bri',     grup: 'Virtual Account', nama: 'BRI Virtual Account',     ic: '🏦', bank: 'BRI',     kodeBank: '002',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },
    { id: 'va_permata', grup: 'Virtual Account', nama: 'Permata Virtual Account', ic: '🏦', bank: 'Permata', kodeBank: '013',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },
    { id: 'va_cimb',    grup: 'Virtual Account', nama: 'CIMB Niaga Virtual Account', ic: '🏦', bank: 'CIMB', kodeBank: '022',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 4000 }, expJam: 24 },

    /* --- QRIS --- */
    { id: 'qris', grup: 'QRIS', nama: 'QRIS — semua aplikasi', ic: '📱',
      gateway: ['midtrans', 'xendit'], biaya: { persen: 0.7 }, expJam: 2,
      catatan: 'Bisa dibayar dari GoPay, OVO, DANA, ShopeePay, LinkAja, dan mobile banking.' },

    /* --- E-Wallet --- */
    { id: 'gopay',     grup: 'E-Wallet', nama: 'GoPay',     ic: '🟢', gateway: ['midtrans'], biaya: { persen: 2 }, expJam: 1 },
    { id: 'shopeepay', grup: 'E-Wallet', nama: 'ShopeePay', ic: '🟠', gateway: ['midtrans', 'xendit'], biaya: { persen: 2 }, expJam: 1 },
    { id: 'ovo',       grup: 'E-Wallet', nama: 'OVO',       ic: '🟣', gateway: ['xendit'], biaya: { persen: 2 }, expJam: 1 },
    { id: 'dana',      grup: 'E-Wallet', nama: 'DANA',      ic: '🔵', gateway: ['xendit'], biaya: { persen: 2 }, expJam: 1 },
    { id: 'linkaja',   grup: 'E-Wallet', nama: 'LinkAja',   ic: '🔴', gateway: ['xendit'], biaya: { persen: 2 }, expJam: 1 },

    /* --- Kartu --- */
    { id: 'cc', grup: 'Kartu Kredit / Debit', nama: 'Visa, Mastercard, JCB', ic: '💳',
      gateway: ['midtrans', 'xendit'], biaya: { persen: 2.9, flat: 2000 }, expJam: 1,
      catatan: 'Mendukung cicilan 0% untuk bank tertentu (perlu diaktifkan di dashboard gateway).' },

    /* --- Gerai retail --- */
    { id: 'alfamart',  grup: 'Gerai Retail', nama: 'Alfamart / Alfamidi', ic: '🏪',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 5000 }, expJam: 24 },
    { id: 'indomaret', grup: 'Gerai Retail', nama: 'Indomaret', ic: '🏪',
      gateway: ['midtrans', 'xendit'], biaya: { flat: 5000 }, expJam: 24 },

    /* --- tanpa gateway --- */
    { id: 'transfer_manual', grup: 'Tanpa Gateway', nama: 'Transfer Bank Manual', ic: '🧾',
      gateway: ['simulasi', 'midtrans', 'xendit'], biaya: {}, expJam: 72, manual: true,
      catatan: 'Klien transfer langsung ke rekening EXOCLEAN lalu mengunggah bukti. Tanpa biaya gateway.' },
    { id: 'cod', grup: 'Tanpa Gateway', nama: 'COD / Tunai di tempat', ic: '💵',
      gateway: ['simulasi', 'midtrans', 'xendit'], biaya: {}, expJam: 168, manual: true }
  ];

  function channel(id) {
    var r = null;
    CHANNELS.forEach(function (c) { if (c.id === id) r = c; });
    return r;
  }

  /* ================================================================ KONFIGURASI */
  var BAWAAN = {
    aktif: 'simulasi',                 // 'simulasi' | 'midtrans' | 'xendit'
    biayaDitanggung: 'merchant',       // 'merchant' | 'klien'
    kanalAktif: ['va_bca', 'va_mandiri', 'va_bni', 'qris', 'gopay', 'shopeepay', 'cc',
                 'alfamart', 'indomaret', 'transfer_manual', 'cod'],
    /* Merchant ID dan Client Key adalah nilai PUBLIK — Client Key memang
       dirancang tampil di kode browser saat memuat Snap. Server Key TIDAK
       PERNAH boleh menyusul ke sini; tempatnya hanya di .env pada server.
       Kunci di bawah berawalan `SB-Mid-` (SANDBOX), sepasang dengan
       MIDTRANS_MODE=sandbox di server. Untuk produksi, ganti keduanya
       bersamaan: Client Key jadi `Mid-client-…` dan mode jadi 'production'. */
    midtrans: { mode: 'sandbox', merchantId: 'G820929498',
                clientKey: 'SB-Mid-client-enGG0WSWq3bLs21L', backendUrl: '' },
    xendit:   { mode: 'test',    businessId: '', publicKey: '', backendUrl: '' },
    rekening: { bank: 'BCA', nomor: '1234567890', atasNama: 'PT EXOCLEAN Indonesia' }
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.payment) { s.payment = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    return s.payment;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) Object.assign(c[k], patch[k]);
      else c[k] = patch[k];
    });
    DB.save(true);
    return c;
  }
  function gatewayAktif() { return config().aktif; }
  function modeSimulasi() { return gatewayAktif() === 'simulasi'; }

  /** Nama gateway untuk ditampilkan. */
  function labelGateway(g) {
    return { simulasi: 'Mode Simulasi', midtrans: 'Midtrans', xendit: 'Xendit' }[g || gatewayAktif()];
  }

  /** Kanal yang boleh dipakai: diaktifkan admin DAN didukung gateway terpilih. */
  function kanalTersedia() {
    var cfg = config(), g = cfg.aktif;
    return CHANNELS.filter(function (c) {
      if (cfg.kanalAktif.indexOf(c.id) < 0) return false;
      if (g === 'simulasi') return true;             // simulasi mendukung semuanya
      return c.gateway.indexOf(g) >= 0;
    });
  }

  /** Kanal yang aktif tapi tidak didukung gateway terpilih — untuk peringatan admin. */
  function kanalTidakDidukung() {
    var cfg = config(), g = cfg.aktif;
    if (g === 'simulasi') return [];
    return CHANNELS.filter(function (c) {
      return cfg.kanalAktif.indexOf(c.id) >= 0 && c.gateway.indexOf(g) < 0;
    });
  }

  /* ================================================================ BIAYA */
  /** Biaya layanan gateway (sudah termasuk PPN 11% atas jasa gateway). */
  function biayaGateway(ch, jumlah) {
    if (!ch || ch.manual) return 0;
    var b = ch.biaya || {};
    var dasar = (b.flat || 0) + (jumlah * (b.persen || 0) / 100);
    return Math.round(dasar * 1.11);
  }

  /** Rincian nominal yang harus dibayar klien. */
  function rincian(channelId, jumlah) {
    var ch = channel(channelId);
    var fee = biayaGateway(ch, jumlah);
    var keKlien = config().biayaDitanggung === 'klien';
    return {
      channel: ch, tagihan: jumlah, biaya: fee, dibebankan: keKlien ? 'klien' : 'merchant',
      totalBayar: keKlien ? jumlah + fee : jumlah,
      diterimaBersih: keKlien ? jumlah : jumlah - fee
    };
  }

  /* ================================================================ SIMULATOR */
  function angkaAcakStabil(seed, panjang) {
    /* Deret angka deterministik dari string — supaya nomor VA konsisten per transaksi. */
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    var s = '';
    while (s.length < panjang) { h = (h * 1103515245 + 12345) >>> 0; s += String(h % 1000000000); }
    return s.slice(0, panjang);
  }

  /* ================================================== NOMOR TRANSAKSI
     24 karakter, huruf besar dan angka saja.

     Nomor ini dikirim ke gateway sebagai order_id, dan Midtrans menolak
     order_id yang pernah dipakai — SELAMANYA, bukan hanya selama transaksinya
     hidup. Nomor urut belaka ("PAY-2026-0001") gagal justru pada saat yang
     paling merugikan: setelah basis data dipulihkan dari cadangan atau
     dipasang ulang, penghitungnya mundur, nomor yang sama terbit lagi, dan
     pembayaran pelanggan ditolak gateway tanpa alasan yang terlihat.

     Susunannya:
       PAY      3   penanda, supaya terbaca saat menelusuri log gateway
       waktu    9   milidetik epoch base36 — nomor urut secara waktu
       urut     4   penghitung internal base36, menyambung ke nomor lama
       acak     8   pengaman tabrakan, termasuk setelah basis data direset

     Bagian acak sengaja diletakkan di akhir: 16 karakter pertama tetap naik
     monoton, jadi transaksi masih bisa diurutkan tanpa membaca createdAt.

     Hanya A–Z dan 0–9. Tanda hubung sebenarnya diterima Midtrans, tetapi
     nomor ini juga ikut dalam berkas ekspor dan pencarian, dan format satu
     blok tidak pernah terpenggal di tengah. */
  var PANJANG_NO = 24;

  function acakBase36(n) {
    var HURUF = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var s = '';
    /* crypto dipakai bila ada — Math.random() pada beberapa peramban lama
       menghasilkan deret yang berulang setelah reload, dan nomor transaksi
       yang berulang persis adalah hal yang hendak dihindari di sini. */
    var acak = (window.crypto && window.crypto.getRandomValues)
      ? window.crypto.getRandomValues(new Uint32Array(n))
      : null;
    for (var i = 0; i < n; i++) {
      var v = acak ? acak[i] : Math.floor(Math.random() * 0xffffffff);
      s += HURUF[v % 36];
    }
    return s;
  }

  function nomorTransaksi() {
    var waktu = Date.now().toString(36).toUpperCase();
    var urut = DB.nextNo('pay').toString(36).toUpperCase();
    var no = 'PAY' +
      waktu.slice(-9).padStart(9, '0') +
      urut.slice(-4).padStart(4, '0');
    return (no + acakBase36(PANJANG_NO - no.length)).slice(0, PANJANG_NO);
  }

  function nomorVA(ch, txNo) {
    var prefix = { BCA: '39001', Mandiri: '89508', BNI: '98801', BRI: '26215',
                   Permata: '85101', CIMB: '71190' }[ch.bank] || '88888';
    return prefix + angkaAcakStabil(txNo + ch.id, 11);
  }

  function kodePembayaran(txNo) { return angkaAcakStabil(txNo + 'retail', 12); }

  /** String payload QRIS gaya EMVCo (isi disimulasikan). */
  function qrPayload(txNo, jumlah) {
    return '00020101021226670016COM.EXOCLEAN.WWW01189360091100000000000215' +
      angkaAcakStabil(txNo, 15) + '0303UMI51440014ID.CO.QRIS.WWW0215ID' +
      angkaAcakStabil(txNo + 'q', 13) + '5204739953033605802ID5908EXOCLEAN6007JAKARTA6105121906304' +
      angkaAcakStabil(txNo + String(jumlah), 4);
  }

  /**
   * Gambar QR simulasi (SVG deterministik). Ini BUKAN QR yang bisa dipindai —
   * hanya representasi visual untuk demo. Pada mode live, gateway mengirim
   * gambar/QR string asli yang dirender di tempat yang sama.
   */
  function qrSvg(payload, ukuran) {
    ukuran = ukuran || 25;
    var h = 2166136261;
    for (var i = 0; i < payload.length; i++) { h ^= payload.charCodeAt(i); h = (h * 16777619) >>> 0; }
    var sel = [], r = h;
    for (var y = 0; y < ukuran; y++) for (var x = 0; x < ukuran; x++) {
      r = (r * 1103515245 + 12345) >>> 0;
      sel.push({ x: x, y: y, on: ((r >>> 16) & 1) === 1 });
    }
    /* tiga kotak penanda sudut supaya terlihat seperti QR sungguhan */
    function penanda(ox, oy) {
      return '<rect x="' + ox + '" y="' + oy + '" width="7" height="7" fill="#0F172A"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 1) + '" width="5" height="5" fill="#fff"/>' +
        '<rect x="' + (ox + 2) + '" y="' + (oy + 2) + '" width="3" height="3" fill="#0F172A"/>';
    }
    function diSudut(x, y) {
      return (x < 8 && y < 8) || (x > ukuran - 9 && y < 8) || (x < 8 && y > ukuran - 9);
    }
    var titik = sel.filter(function (c) { return c.on && !diSudut(c.x, c.y); })
      .map(function (c) { return '<rect x="' + c.x + '" y="' + c.y + '" width="1" height="1"/>'; }).join('');
    return '<svg viewBox="-2 -2 ' + (ukuran + 4) + ' ' + (ukuran + 4) + '" xmlns="http://www.w3.org/2000/svg" ' +
      'style="width:100%;max-width:230px;background:#fff;border-radius:10px;padding:6px">' +
      '<g fill="#0F172A">' + titik + '</g>' +
      penanda(0, 0) + penanda(ukuran - 7, 0) + penanda(0, ukuran - 7) + '</svg>';
  }

  function deeplink(ch, txNo) {
    var m = { gopay: 'gojek://gopay/merchanttransfer?tref=', shopeepay: 'shopeeid://pay?ref=',
              ovo: 'ovo://payment?ref=', dana: 'dana://pay?ref=', linkaja: 'linkaja://pay?ref=' };
    return m[ch.id] ? m[ch.id] + txNo : null;
  }

  /* ================================================================ BACKEND (mode live) */
  function panggilBackend(path, body) {
    var cfg = config(), g = cfg.aktif;
    var base = (cfg[g] || {}).backendUrl;
    if (!base) {
      return Promise.reject(new Error('URL backend ' + labelGateway(g) +
        ' ' + I18N.t('belum diisi. Buka Pengaturan Pembayaran untuk mengaturnya.')));
    }
    return fetch(base.replace(/\/+$/, '') + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ gateway: g, mode: (cfg[g] || {}).mode }, body))
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || (I18N.t('Server pembayaran menolak permintaan (HTTP') + ' ' + r.status + ')'));
        return j;
      });
    }).catch(function (e) {
      if (e instanceof TypeError) throw new Error(I18N.t('Tidak bisa menghubungi server pembayaran di') + ' ' + base +
        '. Pastikan server berjalan dan mengizinkan CORS dari halaman ini.');
      throw e;
    });
  }

  /* ================================================================ TRANSAKSI */
  function txInvoice(invoiceId) {
    return U.sortBy(DB.where('paytx', { invoiceId: invoiceId }), function (t) { return t.createdAt; }, true);
  }
  function txAktif(invoiceId) {
    return txInvoice(invoiceId).filter(function (t) { return t.status === 'pending'; })[0] || null;
  }
  function kedaluwarsa(tx) {
    return tx.status === 'pending' && tx.expiredAt && new Date(tx.expiredAt).getTime() < Date.now();
  }
  /** Cari transaksi dari nomor order yang dikirim gateway saat mengembalikan klien. */
  function txOrder(orderId) {
    if (!orderId) return null;
    return DB.all('paytx').filter(function (t) {
      return t.no === orderId || t.orderId === orderId || t.id === orderId; })[0] || null;
  }
  /** Tandai transaksi pending yang sudah lewat batas waktu. Dipanggil saat aplikasi dibuka. */
  function segarkan() {
    DB.where('paytx', { status: 'pending' }).forEach(function (t) {
      if (kedaluwarsa(t)) DB.update('paytx', t.id, { status: 'expired' });
    });
  }

  /**
   * Buat transaksi pembayaran untuk sebuah invoice.
   * @returns Promise<tx>
   */
  function buatTransaksi(invoiceId, channelId) {
    var inv = DB.find('invoices', invoiceId);
    if (!inv) return Promise.reject(new Error(I18N.t('Invoice tidak ditemukan')));
    var ch = channel(channelId);
    if (!ch) return Promise.reject(new Error(I18N.t('Kanal pembayaran tidak dikenal')));

    var sisa = BIZ.sisaTagihan(inv);
    if (sisa <= 0) return Promise.reject(new Error(I18N.t('Invoice ini sudah lunas')));

    /* Transaksi pending sebelumnya dihentikan supaya tidak ada dua VA aktif.
       Ditandai DIBATALKAN, bukan gagal: tidak ada yang gagal di sini — kami
       sendiri yang menghentikannya. */
    txInvoice(invoiceId).forEach(function (t) {
      if (t.status === 'pending') {
        DB.update('paytx', t.id, { status: 'dibatalkan', catatan: 'Diganti transaksi baru' });
      }
    });

    var r = rincian(channelId, sisa);
    var no = nomorTransaksi();
    var dasar = {
      no: no, invoiceId: invoiceId, shopOrderId: inv.shopOrderId || null, clientId: inv.clientId,
      gateway: gatewayAktif(), channelId: channelId, channelNama: ch.nama,
      jumlah: sisa, biaya: r.biaya, dibebankan: r.dibebankan, totalBayar: r.totalBayar,
      diterimaBersih: r.diterimaBersih, status: 'pending',
      expiredAt: new Date(Date.now() + (ch.expJam || 24) * 3600000).toISOString(),
      paidAt: null, gatewayRef: null
    };

    if (modeSimulasi() || ch.manual) return Promise.resolve(DB.insert('paytx', lengkapiLokal(dasar, ch)));

    /* --- mode live: minta backend membuat transaksi di Midtrans / Xendit --- */
    var c = BIZ.user(inv.clientId) || {};
    return panggilBackend('/api/pay/charge', {
      orderId: no, channel: channelId, amount: r.totalBayar,
      customer: { nama: c.nama, email: c.email, telp: U.waPhone(c.telp) },
      keterangan: 'Pembayaran ' + inv.no + ' — EXOCLEAN',
      invoiceNo: inv.no
    }).then(function (res) {
      /* Bentuk balasan dinormalkan oleh backend referensi di folder server/. */
      return DB.insert('paytx', Object.assign(dasar, {
        gatewayRef: res.gatewayRef || res.transaction_id || res.id || null,
        va: res.va || null, kodeBayar: res.kodeBayar || null,
        qrString: res.qrString || null, qrImageUrl: res.qrImageUrl || null,
        deeplink: res.deeplink || null, redirectUrl: res.redirectUrl || res.invoice_url || null,
        expiredAt: res.expiredAt || dasar.expiredAt
      }));
    });
  }

  /** Lengkapi detail pembayaran versi simulasi / kanal manual. */
  function lengkapiLokal(tx, ch) {
    if (ch.manual) {
      tx.rekening = Object.assign({}, config().rekening);
      return tx;
    }
    if (ch.grup === 'Virtual Account') tx.va = { bank: ch.bank, nomor: nomorVA(ch, tx.no) };
    else if (ch.id === 'qris') tx.qrString = qrPayload(tx.no, tx.totalBayar);
    else if (ch.grup === 'E-Wallet') tx.deeplink = deeplink(ch, tx.no);
    else if (ch.grup === 'Gerai Retail') tx.kodeBayar = kodePembayaran(tx.no);
    else if (ch.id === 'cc') tx.redirectUrl = '#simulasi-halaman-kartu';
    tx.gatewayRef = 'SIM-' + angkaAcakStabil(tx.no, 10);
    return tx;
  }

  /**
   * Tandai transaksi lunas. Di mode live ini dipanggil setelah backend
   * mengonfirmasi webhook; di mode simulasi dipicu manual dari tombol.
   */
  function tandaiLunas(txId, ref) {
    var tx = DB.find('paytx', txId);
    if (!tx || tx.status === 'paid') return tx;
    DB.update('paytx', txId, { status: 'paid', paidAt: U.nowISO(), gatewayRef: ref || tx.gatewayRef });
    tx = DB.find('paytx', txId);

    /* Yang masuk ke invoice adalah nilai tagihan, bukan termasuk biaya gateway
       yang dibebankan ke klien — supaya buku tetap cocok. */
    BIZ.catatPembayaran(tx.invoiceId, tx.jumlah,
      labelGateway(tx.gateway) + ' — ' + tx.channelNama, tx.no);

    WA.enqueue('pembayaran_diterima', tx.clientId, { txId: txId }, { tipe: 'paytx', id: txId });
    DB.log(tx.clientId, 'Pembayaran ' + tx.no + ' diterima (' + tx.channelNama + ')', 'paytx', txId);
    return tx;
  }

  /**
   * Batalkan transaksi yang belum dibayar.
   *
   * Transaksi yang SUDAH lunas tidak dibatalkan lewat sini — uangnya sudah
   * berpindah, dan yang dibutuhkan adalah pengembalian dana (refund), bukan
   * pembatalan. Menandainya batal hanya akan menyembunyikan uang yang benar-
   * benar diterima dari laporan.
   */
  function batalkan(txId, alasan) {
    var tx = DB.find('paytx', txId);
    if (!tx) throw new Error(I18N.t('Transaksi tidak ditemukan'));
    if (tx.status === 'paid') {
      throw new Error(I18N.t('Transaksi sudah lunas — gunakan pengembalian dana, bukan pembatalan.'));
    }
    DB.update('paytx', txId, {
      status: 'dibatalkan',
      catatan: alasan || 'Dibatalkan',
      dibatalkanAt: U.nowISO()
    });
    DB.log(tx.clientId, 'Transaksi ' + tx.no + ' dibatalkan' +
      (alasan ? ' — ' + alasan : ''), 'paytx', txId);
    return DB.find('paytx', txId);
  }

  /** Cek status ke backend (mode live) atau evaluasi lokal (simulasi). */
  function cekStatus(txId) {
    var tx = DB.find('paytx', txId);
    if (!tx) return Promise.reject(new Error(I18N.t('Transaksi tidak ditemukan')));
    if (tx.gateway === 'simulasi') {
      if (kedaluwarsa(tx)) { DB.update('paytx', txId, { status: 'expired' }); }
      return Promise.resolve(DB.find('paytx', txId));
    }
    return panggilBackend('/api/pay/status', { orderId: tx.no }).then(function (res) {
      var s = (res.status || '').toLowerCase();
      if (s === 'paid' || s === 'settlement' || s === 'capture') return tandaiLunas(txId, res.gatewayRef);
      if (s === 'expire' || s === 'expired') { DB.update('paytx', txId, { status: 'expired' }); }
      /* Midtrans membedakan cancel dari deny/failure, dan pembedaan itu
         dipertahankan di sini: cancel berarti transaksinya dihentikan,
         deny berarti bank atau sistem antifraud menolaknya. */
      if (s === 'cancel' || s === 'cancelled') { DB.update('paytx', txId, { status: 'dibatalkan' }); }
      if (s === 'deny' || s === 'failure' || s === 'failed') { DB.update('paytx', txId, { status: 'failed' }); }
      return DB.find('paytx', txId);
    });
  }

  /** Tautan halaman pembayaran yang dikirim ke klien lewat WhatsApp. */
  function linkBayar(tx) {
    if (tx.redirectUrl && tx.redirectUrl.indexOf('http') === 0) return tx.redirectUrl;
    return location.origin + location.pathname + '#bayar/' + tx.no;
  }

  /* ================================================================ INSTRUKSI */
  function instruksi(tx) {
    var ch = channel(tx.channelId) || {};
    if (ch.grup === 'Virtual Account') return [
      I18N.t('Buka aplikasi mobile banking atau ATM') + ' ' + ch.bank + '.',
      I18N.t('Pilih menu Transfer → Virtual Account.'),
      I18N.t('Masukkan nomor VA:') + ' ' + (tx.va ? tx.va.nomor : '—') + '.',
      I18N.t('Pastikan nama penerima tertulis EXOCLEAN dan nominal') + ' ' + U.rp(tx.totalBayar) + '.',
      I18N.t('Selesaikan pembayaran. Status akan terbarui otomatis dalam beberapa menit.')
    ];
    if (ch.id === 'qris') return [
      I18N.t('Buka aplikasi pembayaran apa pun yang mendukung QRIS (GoPay, OVO, DANA, ShopeePay, m-banking).'),
      I18N.t('Pilih menu Scan / Bayar, lalu pindai kode QR di atas.'),
      I18N.t('Periksa nama merchant EXOCLEAN dan nominal') + ' ' + U.rp(tx.totalBayar) + '.',
      I18N.t('Konfirmasi pembayaran dengan PIN Anda.')
    ];
    if (ch.grup === 'E-Wallet') return [
      I18N.t('Tekan tombol “Bayar dengan {nama}” di bawah.').replace('{nama}', ch.nama),
      I18N.t('Anda akan diarahkan ke aplikasi {nama}.').replace('{nama}', ch.nama),
      I18N.t('Periksa nominal {v} lalu konfirmasi dengan PIN.')
        .replace('{v}', U.rp(tx.totalBayar)),
      I18N.t('Kembali ke halaman ini — status pembayaran akan diperbarui otomatis.')
    ];
    if (ch.grup === 'Gerai Retail') return [
      'Datangi kasir ' + ch.nama + ' terdekat.',
      I18N.t('Sebutkan ingin membayar tagihan') + ' ' + (tx.gateway === 'midtrans' ? 'Midtrans' : 'Xendit') + '.',
      I18N.t('Berikan kode pembayaran:') + ' ' + (tx.kodeBayar || '—') + '.',
      'Bayar sejumlah ' + U.rp(tx.totalBayar) + ' ' + I18N.t('dan simpan struknya.')
    ];
    if (ch.id === 'cc') return [
      I18N.t('Tekan tombol "Bayar dengan Kartu" untuk membuka halaman pembayaran aman.'),
      I18N.t('Masukkan data kartu pada halaman gateway — data kartu tidak pernah melewati aplikasi ini.'),
      I18N.t('Selesaikan verifikasi 3D Secure dari bank penerbit Anda.')
    ];
    if (ch.manual && tx.rekening) return [
      I18N.t('Transfer ke rekening') + ' ' + tx.rekening.bank + ' ' + tx.rekening.nomor + ' a.n. ' + tx.rekening.atasNama + '.',
      'Nominal tepat: ' + U.rp(tx.totalBayar) + '.',
      'Cantumkan ' + tx.no + ' ' + I18N.t('pada berita transfer.'),
      I18N.t('Unggah bukti transfer melalui tombol Konfirmasi Pembayaran.')
    ];
    return [I18N.t('Ikuti instruksi yang muncul dari penyedia pembayaran.')];
  }

  /* ================================================================ STATISTIK */
  function statistik(dari) {
    var all = DB.all('paytx').filter(function (t) { return !dari || t.createdAt >= dari; });
    var lunas = all.filter(function (t) { return t.status === 'paid'; });
    return {
      total: all.length, lunas: lunas.length,
      pending: all.filter(function (t) { return t.status === 'pending'; }).length,
      gagal: all.filter(function (t) { return ['expired', 'failed'].indexOf(t.status) >= 0; }).length,
      dibatalkan: all.filter(function (t) { return t.status === 'dibatalkan'; }).length,
      nilai: U.sum(lunas, function (t) { return t.jumlah; }),
      biaya: U.sum(lunas, function (t) { return t.dibebankan === 'merchant' ? t.biaya : 0; }),
      perKanal: U.groupBy(lunas, function (t) { return t.channelId; })
    };
  }

  return {
    CHANNELS: CHANNELS, channel: channel, BAWAAN: BAWAAN,
    config: config, simpanConfig: simpanConfig, gatewayAktif: gatewayAktif, modeSimulasi: modeSimulasi,
    labelGateway: labelGateway, kanalTersedia: kanalTersedia, kanalTidakDidukung: kanalTidakDidukung,
    biayaGateway: biayaGateway, rincian: rincian,
    buatTransaksi: buatTransaksi, tandaiLunas: tandaiLunas, batalkan: batalkan, cekStatus: cekStatus,
    txInvoice: txInvoice, txAktif: txAktif, txOrder: txOrder,
    kedaluwarsa: kedaluwarsa, segarkan: segarkan,
    linkBayar: linkBayar, instruksi: instruksi, qrSvg: qrSvg, statistik: statistik
  };
})();
