/* ==========================================================================
   wa.js — mesin notifikasi WhatsApp
   --------------------------------------------------------------------------
   Prototipe ini TIDAK memakai WhatsApp Business API (berbayar & butuh
   verifikasi Meta). Sebagai gantinya:
     1. Setiap kejadian penting (penawaran, jadwal, selesai, invoice, dsb.)
        otomatis menyusun pesan dan memasukkannya ke WA Outbox.
     2. Admin/Supervisor menekan satu tombol -> membuka wa.me dengan teks
        sudah terisi, tinggal tekan kirim di WhatsApp.
   Saat nanti berlangganan API resmi, cukup ubah fungsi kirim() di bawah
   menjadi pemanggilan endpoint — seluruh template & pemicu tetap sama.
   ========================================================================== */
var WA = (function () {

  /* state aktif: dari DB, atau override saat proses seeding */
  function S(o) { return o || DB.raw; }
  function user(id, s) { var r = null; S(s).users.forEach(function (u) { if (u.id === id) r = u; }); return r; }
  function row(tbl, id, s) { var r = null; (S(s)[tbl] || []).forEach(function (x) { if (x.id === id) r = x; }); return r; }

  /** Total penawaran setelah diskon & PPN. */
  function totalQuotation(q) {
    var sub = (q.items || []).reduce(function (a, i) { return a + i.qty * i.harga; }, 0);
    var afterDisc = sub - (q.diskon || 0);
    return Math.round(afterDisc + afterDisc * ((q.ppn || 0) / 100));
  }

  /* ------------------------------------------------------------ bahasa

     SETIAP template menerima `w` — penerjemah yang sudah TERIKAT pada
     penerimanya (I18N.pesanUntuk). Ia dioper sebagai argumen, bukan dibaca
     dari variabel modul, karena satu variabel modul yang disetel sebelum
     memanggil render() akan salah begitu dua pesan disusun berselang-seling;
     argumen tidak bisa tertukar.

     Kenapa bahasa PENERIMA dan bukan bahasa layar: pesan ini keluar dari
     aplikasi dan dibaca di WhatsApp orang lain. Admin yang memakai antarmuka
     Inggris tidak boleh membuat pelanggannya menerima pesan Inggris, dan
     sebaliknya. Bahasanya milik yang membaca, bukan yang menekan tombol.

     Bila penerimanya tidak dikenali — nomor telepon tanpa akun, misalnya
     petugas korporat pada MCS — `w` menjadi fungsi yang mengembalikan
     teksnya apa adanya, sehingga hasilnya persis sama dengan sebelum berkas
     ini menerjemahkan apa pun. Alasannya ditulis di render(). */

  /* Tanda tangan pesan. FUNGSI, bukan tetapan: sebuah string yang dibungkus
     terjemahan di tingkat berkas akan dievaluasi sekali saat dimuat dan
     membeku pada bahasa saat itu — cacat yang persis sama dengan yang
     ditemukan pada APLIKASI.tagline. */
  function sign(w) {
    return '\n\n— *EXOCLEAN*\n' +
      w('Solusi kebersihan gedung, kantor & rumah') +
      '\n0812-3456-7001 | exoclean.id';
  }

  /** Daftar barang pada pesanan toko, siap ditempel ke pesan WhatsApp. */
  function rincianToko(so, s, w) {
    var baris = (so.items || []).map(function (i) {
      var p = row('products', i.productId, s);
      return '• ' + (p ? p.nama : '-') + '\n   ' + i.qty + ' ' + (p ? p.satuan : 'pcs') +
        ' × ' + U.rp(i.harga) + ' = *' + U.rp(i.qty * i.harga) + '*';
    }).join('\n');
    return '\n' + baris +
      (so.diskon ? '\n\n_' + w('Diskon') + ':_ -' + U.rp(so.diskon) : '') +
      (so.ongkir ? '\n_' + w('Ongkir') + ':_ ' + U.rp(so.ongkir) : '') +
      (so.ppn ? '\n_' + w('Ppn') + ' ' + so.ppn + '%_ ' + w('sudah termasuk') : '');
  }

  /** Sapaan pembuka — dipakai hampir semua template. */
  function halo(nama, w) { return w('Halo') + ' *' + nama + '*'; }

  /* ---------------------------------------------------------------- template */
  /* ======================================================= ZONA WAKTU
     Jam pada pesan keluar dulu selalu berakhiran “WIB”, apa pun letak
     pekerjaannya. Untuk korporat satu pulau itu benar. Untuk yang punya
     cabang di Makassar dan Jayapura itu salah, dan salahnya berbentuk orang
     yang datang satu atau dua jam meleset — sambil merasa sudah menuruti
     pesan yang diterimanya.

     DUA JENIS WAKTU, DUA ATURAN BERBEDA. Ini yang paling mudah dicampur:

       · JAM JADWAL (“08.00”) adalah waktu SETEMPAT di lokasi kerjanya.
         Angkanya sudah benar; yang perlu ditambahkan hanya labelnya, dan
         labelnya adalah zona TEMPAT ITU — bukan zona pembacanya. Klien di
         Jakarta yang memesan pembersihan di Makassar harus membaca
         “08.00 WITA”: petugasnya datang pukul delapan waktu Makassar.

       · SAAT TERTENTU (batas pembayaran) adalah satu titik waktu yang sama
         bagi semua orang. Di sini yang benar justru zona PEMBACANYA, dan
         angkanya pun harus dihitung ulang — bukan hanya labelnya.

     TIDAK TAHU = TIDAK MELABELI. Jam tanpa label dibaca orang sebagai waktu
     setempatnya sendiri, dan untuk pekerjaan di kotanya sendiri itu benar.
     Label yang salah tidak punya jalan keluar seperti itu. */

  /** Zona lokasi kerja sebuah order/booking, atau '' bila tak dapat dipastikan. */
  function zonaKerja(o) {
    if (!o || !window.ZONA) return '';
    if (o.wilayah && ZONA.dariWilayah) {
      var tz = ZONA.dariWilayah(o.wilayah);
      if (tz) return tz;
    }
    return '';
  }

  /** Diteruskan ke ZONA supaya aturannya hanya ada di satu tempat. */
  function labelJam(tz) {
    return (tz && window.ZONA) ? ZONA.labelJam(tz) : '';
  }

  /**
   * Satu titik waktu (batas bayar, tenggat) yang ditulis LENGKAP dengan
   * zonanya: “26 Agustus 2026 pukul 23.00 WITA”.
   *
   * Zona pembacanya sendiri tidak dipakai karena tidak diketahui — akun
   * pengguna tidak menyimpan alamat berzona. Yang dipakai adalah zona
   * bisnisnya, DISEBUT terang-terangan. Sebuah tenggat yang menyebut zonanya
   * tidak pernah ambigu bagi siapa pun, di zona mana pun ia membacanya;
   * yang ambigu justru tenggat tanpa zona, dan yang menyesatkan adalah
   * tenggat berzona salah.
   *
   * TANGGALNYA ikut dihitung di zona itu, bukan hanya jamnya. Sebuah batas
   * pukul 23.00 WITA jatuh pada pukul 22.00 WIB di hari yang sama, tetapi
   * batas pukul 00.30 WITA jatuh pada 23.30 WIB HARI SEBELUMNYA — dan
   * tanggal yang dihitung dengan jam perangkat akan meleset sehari.
   */
  function saatLengkap(iso, w) {
    if (!iso) return '';
    if (!window.ZONA) return U.tglPanjang(iso, w.kode) + ' ' + w('pukul') + ' ' + U.jam(iso);
    var tz = ZONA.bawaan();
    return U.tglPanjang(ZONA.tgl(iso, tz), w.kode) + ' ' + w('pukul') + ' ' +
      ZONA.jam(iso, tz).replace(':', '.') + labelJam(tz);
  }

  var T = {

    booking_diterima: function (p, s, w) {
      var b = row('bookings', p.bookingId, s), c = user(b.clientId, s);
      return halo(c.nama, w) + ', 👋\n\n' +
        w('Terima kasih sudah mengajukan permintaan layanan ke EXOCLEAN.') + '\n\n' +
        '*' + w('No. Permintaan') + ':* ' + b.no + '\n' +
        '*' + w('Tanggal diharapkan') + ':* ' + U.tglPanjang(b.tglHarapan, w.kode) + '\n' +
        '*' + w('Lokasi') + ':* ' + b.alamat + '\n\n' +
        w('Tim kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi kebutuhan dan (bila perlu) jadwal survei gratis.') + sign(w);
    },

    survei_dijadwalkan: function (p, s, w) {
      var b = row('bookings', p.bookingId, s), c = user(b.clientId, s);
      return halo(c.nama, w) + ',\n\n' +
        w('Survei lokasi untuk permintaan') + ' *' + b.no + '* ' + w('kami jadwalkan pada:') + '\n' +
        /* Booking belum menyimpan alamat terstruktur, jadi zonanya tidak
           dapat dipastikan. Jam tanpa label dibaca sebagai waktu setempat —
           benar untuk survei di kota kliennya sendiri, dan tidak pernah
           menyesatkan seperti label yang salah. */
        '🗓️ *' + U.tglPanjang(p.tgl, w.kode) + '*, ' + w('pukul') + ' *' + p.jam +
          labelJam(zonaKerja(b)) + '*\n' +
        '📍 ' + b.alamat + '\n\n' +
        w('Survei ini gratis dan tidak mengikat. Mohon konfirmasi bila jadwalnya perlu diubah.') + sign(w);
    },

    quotation_terkirim: function (p, s, w) {
      var q = row('quotations', p.quotationId, s), c = user(q.clientId, s);
      var lines = (q.items || []).map(function (i) {
        return '• ' + i.desc + '\n   ' + U.num(i.qty) + ' ' + i.satuan + ' × ' + U.rp(i.harga) + ' = *' + U.rp(i.qty * i.harga) + '*';
      }).join('\n');
      return halo(c.nama, w) + ',\n\n' +
        w('Berikut penawaran harga dari EXOCLEAN.') + '\n\n' +
        '*' + w('No. Penawaran') + ':* ' + q.no + '\n' +
        '*' + w('Berlaku s/d') + ':* ' + U.tgl(q.berlakuHingga, w.kode) + '\n\n' +
        '*' + w('Rincian') + ':*\n' + lines + '\n' +
        (q.diskon ? '\n_' + w('Diskon') + ':_ -' + U.rp(q.diskon) : '') +
        (q.ppn ? '\n_' + w('Ppn') + ' ' + q.ppn + '%_ ' + w('sudah termasuk') : '') +
        '\n\n*' + w('TOTAL') + ': ' + U.rp(totalQuotation(q)) + '*\n\n' +
        (q.catatan ? '_' + q.catatan + '_\n\n' : '') +
        w('Balas *SETUJU* untuk melanjutkan ke penjadwalan, atau hubungi kami bila ada yang ingin disesuaikan.') + sign(w);
    },

    jadwal_dikonfirmasi: function (p, s, w) {
      var o = row('orders', p.orderId, s), c = user(o.clientId, s);
      var tim = (o.workerIds || []).map(function (id) { var u = user(id, s); return u ? u.nama : '—'; }).join(', ');
      var spv = user(o.supervisorId, s);
      return halo(c.nama, w) + ', ✅\n\n' +
        w('Pekerjaan Anda sudah dijadwalkan.') + '\n\n' +
        '*' + w('No. Order') + ':* ' + o.no + '\n' +
        '*' + w('Pekerjaan') + ':* ' + o.judul + '\n' +
        '🗓️ *' + U.tglPanjang(o.tgl, w.kode) + '*\n' +
        '🕐 ' + o.mulai + ' – ' + o.selesai + labelJam(zonaKerja(o)) + '\n' +
        '📍 ' + o.alamat + '\n\n' +
        '*' + w('Petugas') + ':* ' + (tim || w('akan diinformasikan')) + '\n' +
        '*' + w('Supervisor') + ':* ' + (spv ? spv.nama + ' (' + U.phoneDisplay(spv.telp) + ')' : '—') + '\n\n' +
        w('Mohon pastikan area kerja dapat diakses pada jam tersebut. Terima kasih!') + sign(w);
    },

    reminder_h1: function (p, s, w) {
      var o = row('orders', p.orderId, s), c = user(o.clientId, s);
      return halo(c.nama, w) + ', ⏰\n\n' +
        w('Pengingat: pekerjaan') + ' *' + o.judul + '* ' + w('dijadwalkan') + ' *' + U.relatif(o.tgl, w.kode).toLowerCase() + '*, ' +
        U.tglPanjang(o.tgl, w.kode) + ' ' + w('pukul') + ' *' + o.mulai +
          labelJam(zonaKerja(o)) + '*.\n\n' +
        '📍 ' + o.alamat + '\n' +
        w('No. Order') + ': ' + o.no + '\n\n' +
        w('Tim kami akan tiba 10–15 menit sebelum jadwal. Bila ada perubahan, mohon kabari kami hari ini.') + sign(w);
    },

    tim_berangkat: function (p, s, w) {
      var o = row('orders', p.orderId, s), c = user(o.clientId, s);
      var tim = (o.workerIds || []).map(function (id) { var u = user(id, s); return u ? u.nama : '—'; }).join(', ');
      return halo(c.nama, w) + ', 🚐\n\n' +
        w('Tim EXOCLEAN sudah berangkat menuju lokasi Anda untuk pekerjaan') + ' *' + o.judul + '* (' + o.no + ').\n\n' +
        '*' + w('Petugas') + ':* ' + tim + '\n' +
        '*' + w('Perkiraan tiba') + ':* ' + w('sekitar pukul') + ' ' + o.mulai +
          labelJam(zonaKerja(o)) + '\n\n' +
        w('Mohon informasikan bila ada prosedur masuk khusus (kartu akses, lapor security, dll).') + sign(w);
    },

    pekerjaan_selesai: function (p, s, w) {
      var o = row('orders', p.orderId, s), c = user(o.clientId, s);
      return halo(c.nama, w) + ', ✨\n\n' +
        w('Pekerjaan') + ' *' + o.judul + '* (' + o.no + ') ' + w('telah *SELESAI* dikerjakan.') + '\n\n' +
        w('Laporan lengkap beserta foto sebelum & sesudah sudah tersedia di aplikasi EXOCLEAN Anda.') + '\n\n' +
        w('Bila ada bagian yang dirasa belum maksimal, sampaikan dalam *3 hari* — kami akan kerjakan ulang tanpa biaya tambahan sesuai garansi layanan.') + sign(w);
    },

    minta_rating: function (p, s, w) {
      var o = row('orders', p.orderId, s), c = user(o.clientId, s);
      return halo(c.nama, w) + ', 🌟\n\n' +
        w('Bagaimana hasil pekerjaan kami di') + ' *' + o.judul + '*?\n\n' +
        w('Mohon luangkan 30 detik untuk memberi penilaian di aplikasi EXOCLEAN (menu Riwayat → Beri Penilaian).') + ' ' +
        w('Masukan Anda kami pakai untuk mengevaluasi tim di lapangan.') + '\n\n' +
        w('Terima kasih atas kepercayaannya!') + ' 🙏' + sign(w);
    },

    invoice_terbit: function (p, s, w) {
      var inv = row('invoices', p.invoiceId, s), c = user(inv.clientId, s), o = row('orders', inv.orderId, s);
      return halo(c.nama, w) + ', 🧾\n\n' +
        w('Invoice untuk pekerjaan') + ' *' + (o ? o.judul : '-') + '* ' + w('telah kami terbitkan.') + '\n\n' +
        '*' + w('No. Order Receipt') + ':* ' + inv.no + '\n' +
        '*' + w('Jumlah') + ':* *' + U.rp(inv.total) + '*\n' +
        '*' + w('Jatuh tempo') + ':* ' + U.tglPanjang(inv.jatuhTempo, w.kode) + '\n\n' +
        '*' + w('Pembayaran') + ':*\nBCA 1234567890 ' + w('a.n.') + ' PT EXOCLEAN Indonesia\n\n' +
        w('Mohon kirim bukti transfer setelah pembayaran. Terima kasih!') + sign(w);
    },

    invoice_jatuh_tempo: function (p, s, w) {
      var inv = row('invoices', p.invoiceId, s), c = user(inv.clientId, s);
      var telat = U.diffDays(new Date(), inv.jatuhTempo);
      return halo(c.nama, w) + ',\n\n' +
        w('Kami ingin mengingatkan invoice berikut') + ' ' +
        (telat > 0
          ? '*' + w('telah melewati jatuh tempo') + ' ' + telat + ' ' + w('hari') + '*'
          : w('akan segera jatuh tempo')) + ':\n\n' +
        '*' + w('No. Order Receipt') + ':* ' + inv.no + '\n' +
        '*' + w('Jumlah') + ':* *' + U.rp(inv.total) + '*\n' +
        '*' + w('Jatuh tempo') + ':* ' + U.tglPanjang(inv.jatuhTempo, w.kode) + '\n\n' +
        'BCA 1234567890 ' + w('a.n.') + ' PT EXOCLEAN Indonesia\n\n' +
        w('Bila pembayaran sudah dilakukan, mohon abaikan pesan ini dan kirimkan bukti transfernya. Terima kasih') + ' 🙏' + sign(w);
    },

    komplain_diterima: function (p, s, w) {
      var cp = row('complaints', p.complaintId, s), c = user(cp.clientId, s), o = row('orders', cp.orderId, s);
      return halo(c.nama, w) + ',\n\n' +
        w('Kami sudah menerima keluhan Anda untuk pekerjaan') + ' *' + (o ? o.no : '-') + '*:\n\n' +
        '_"' + U.potong(cp.isi, 220) + '"_\n\n' +
        w('Mohon maaf atas ketidaknyamanannya. Supervisor kami akan menghubungi Anda hari ini juga untuk penjadwalan pengerjaan ulang *tanpa biaya tambahan* sesuai garansi layanan EXOCLEAN.') + sign(w);
    },

    /* ---- toko perlengkapan kebersihan ---- */
    toko_pesanan_diterima: function (p, s, w) {
      var so = row('shopOrders', p.shopOrderId, s), c = user(so.clientId, s);
      return halo(c.nama, w) + ', 🛒\n\n' +
        w('Terima kasih! Pesanan Anda di Toko EXOCLEAN sudah kami terima.') + '\n\n' +
        '*' + w('No. Pesanan') + ':* ' + so.no + '\n' +
        rincianToko(so, s, w) +
        '\n*' + w('TOTAL') + ': ' + U.rp(so.total) + '*\n\n' +
        '📦 ' + w('Kirim ke') + ': ' + so.alamatKirim + '\n' +
        '💳 ' + w('Pembayaran') + ': ' + so.metodeBayar + '\n\n' +
        w('Kami sedang mengecek ketersediaan stok. Konfirmasi ketersediaan & instruksi pembayaran akan kami kirim dalam beberapa jam.') + sign(w);
    },

    toko_dikonfirmasi: function (p, s, w) {
      var so = row('shopOrders', p.shopOrderId, s), c = user(so.clientId, s);
      return halo(c.nama, w) + ', ✅\n\n' +
        w('Pesanan') + ' *' + so.no + '* ' + w('sudah *DIKONFIRMASI* — seluruh barang tersedia.') + '\n\n' +
        rincianToko(so, s, w) +
        '\n*' + w('TOTAL') + ': ' + U.rp(so.total) + '*\n\n' +
        (so.metodeBayar && so.metodeBayar.indexOf('COD') === 0
          ? '💵 ' + w('Pembayaran *COD* — siapkan uang pas saat barang tiba.') + '\n\n'
          : '*' + w('Pembayaran') + ':*\nBCA 1234567890 ' + w('a.n.') + ' PT EXOCLEAN Indonesia\n' +
            w('Cantumkan') + ' ' + so.no + ' ' + w('pada berita transfer.') + '\n\n' +
            w('Barang dikirim setelah pembayaran kami terima.') + '\n\n') +
        w('Estimasi pengiriman 1–2 hari kerja untuk area Jabodetabek.') + sign(w);
    },

    toko_dikirim: function (p, s, w) {
      var so = row('shopOrders', p.shopOrderId, s), c = user(so.clientId, s);
      return halo(c.nama, w) + ', 🚚\n\n' +
        w('Pesanan') + ' *' + so.no + '* ' + w('sudah *DIKIRIM*.') + '\n\n' +
        '🚛 ' + w('Kurir') + ': ' + (so.kurir || '-') + '\n' +
        '🔖 ' + w('No. resi') + ': *' + (so.resi || '-') + '*\n' +
        '📦 ' + w('Tujuan') + ': ' + so.alamatKirim + '\n\n' +
        w('Mohon dicek kelengkapan dan kondisi barang saat diterima. Bila ada kerusakan atau kekurangan, laporkan dalam 2×24 jam.') + sign(w);
    },

    toko_selesai: function (p, s, w) {
      var so = row('shopOrders', p.shopOrderId, s), c = user(so.clientId, s);
      return halo(c.nama, w) + ', 🎉\n\n' +
        w('Pesanan') + ' *' + so.no + '* ' + w('telah diterima dengan baik. Terima kasih sudah berbelanja di Toko EXOCLEAN!') + '\n\n' +
        w('Butuh restock rutin? Kami bisa siapkan *jadwal pengiriman berkala* dengan harga khusus untuk pelanggan kontrak. Balas pesan ini bila tertarik.') + sign(w);
    },

    toko_stok_habis: function (p, s, w) {
      var so = row('shopOrders', p.shopOrderId, s), c = user(so.clientId, s);
      return halo(c.nama, w) + ',\n\n' +
        w('Mohon maaf, sebagian barang pada pesanan') + ' *' + so.no + '* ' + w('sedang kosong:') + '\n' +
        (p.kosong || []).map(function (n) { return '• ' + n; }).join('\n') +
        '\n\n' + w('Kami dapat menawarkan: (1) menunggu restock ±3–5 hari kerja, (2) mengganti dengan produk setara, atau (3) mengirim sebagian dulu. Mohon pilih yang paling sesuai untuk Anda.') + sign(w);
    },

    /* ---- pembayaran online ---- */
    link_pembayaran: function (p, s, w) {
      var tx = row('paytx', p.txId, s), c = user(tx.clientId, s);
      var inv = row('invoices', tx.invoiceId, s);
      var detail =
        tx.va ? '🏦 *' + tx.va.bank + ' ' + w('Virtual Account') + '*\n' + w('No. VA') + ': *' + tx.va.nomor + '*'
      : tx.kodeBayar ? '🏪 *' + w('Kode pembayaran') + ':* *' + tx.kodeBayar + '*'
      : tx.qrString ? '📱 *QRIS* — ' + w('pindai kode QR pada tautan di bawah')
      : tx.rekening ? '🏦 *' + tx.rekening.bank + ' ' + tx.rekening.nomor + '*\n' + w('a.n.') + ' ' + tx.rekening.atasNama
      : '💳 ' + w('Selesaikan pembayaran melalui tautan di bawah');

      return halo(c.nama, w) + ', 💳\n\n' +
        w('Berikut tautan pembayaran untuk invoice') + ' *' + (inv ? inv.no : '-') + '*.\n\n' +
        '*' + w('Metode') + ':* ' + tx.channelNama + '\n' + detail + '\n' +
        '*' + w('Jumlah') + ':* *' + U.rp(tx.totalBayar) + '*' +
        (tx.dibebankan === 'klien' && tx.biaya
          ? '\n_(' + w('termasuk biaya layanan') + ' ' + U.rp(tx.biaya) + ')_' : '') + '\n' +
        '*' + w('Bayar sebelum') + ':* ' + saatLengkap(tx.expiredAt, w) + '\n\n' +
        '🔗 ' + PAY.linkBayar(tx) + '\n\n' +
        w('Status pembayaran akan terbarui otomatis setelah dana kami terima.') + sign(w);
    },

    pembayaran_diterima: function (p, s, w) {
      var tx = row('paytx', p.txId, s), c = user(tx.clientId, s);
      var inv = row('invoices', tx.invoiceId, s);
      var sisa = inv ? Math.max(0, inv.total - (inv.payments || [])
        .reduce(function (a, x) { return a + x.jumlah; }, 0)) : 0;
      return halo(c.nama, w) + ', ✅\n\n' +
        w('Pembayaran Anda sebesar') + ' *' + U.rp(tx.jumlah) + '* ' + w('telah kami terima.') + '\n\n' +
        '*Invoice:* ' + (inv ? inv.no : '-') + '\n' +
        '*' + w('Metode') + ':* ' + tx.channelNama + '\n' +
        '*' + w('Ref') + ':* ' + tx.no + '\n' +
        '*' + w('Waktu') + ':* ' + U.tglJam(tx.paidAt || U.nowISO(), w.kode) + '\n\n' +
        (sisa > 0
          ? '_' + w('Sisa tagihan') + ': ' + U.rp(sisa) + '_\n\n'
          : '*' + w('Tagihan ini LUNAS.') + '* 🎉\n\n') +
        w('Terima kasih atas kepercayaan Anda kepada EXOCLEAN.') + sign(w);
    },

    pembayaran_kedaluwarsa: function (p, s, w) {
      var tx = row('paytx', p.txId, s), c = user(tx.clientId, s);
      var inv = row('invoices', tx.invoiceId, s);
      return halo(c.nama, w) + ',\n\n' +
        w('Tautan pembayaran untuk invoice') + ' *' + (inv ? inv.no : '-') + '* (' + tx.channelNama + ') ' +
        w('sudah melewati batas waktu dan tidak berlaku lagi.') + '\n\n' +
        w('Tagihan Anda sebesar') + ' *' + U.rp(tx.jumlah) + '* ' + w('masih terbuka.') + ' ' +
        w('Balas pesan ini dan kami kirimkan tautan pembayaran baru — bisa dengan metode yang sama atau metode lain yang lebih nyaman untuk Anda.') + sign(w);
    },

    /* ---- kemitraan & pembelajaran ---- */
    mitra_disetujui: function (p, s, w) {
      var u = user(p.userId, s);
      return w('Selamat') + ' *' + u.nama + '*! 🎉\n\n' +
        w('Pendaftaran Anda sebagai *Mitra EXOCLEAN* telah *DISETUJUI*.') + '\n\n' +
        w('Mulai sekarang Anda dapat menerima penugasan lewat aplikasi. Beberapa hal penting:') + '\n\n' +
        '• ' + w('Penugasan muncul di menu *Tugas*') + '\n' +
        '• ' + w('Selalu *check-in GPS* saat tiba di lokasi') + '\n' +
        '• ' + w('Unggah *foto sebelum & sesudah* setiap pekerjaan') + '\n' +
        '• ' + w('Pembayaran dikirim ke rekening yang terdaftar di profil Anda') + '\n\n' +
        w('Sertifikat Anda tersimpan di menu Profil dan dapat ditunjukkan kepada klien bila diminta.') + '\n\n' +
        w('Selamat bergabung dan selamat bekerja!') + sign(w);
    },

    mitra_ditolak: function (p, s, w) {
      var u = user(p.userId, s);
      return halo(u.nama, w) + ',\n\n' +
        w('Terima kasih atas ketertarikan Anda bergabung sebagai Mitra EXOCLEAN.') + '\n\n' +
        w('Setelah kami tinjau, pendaftaran Anda belum dapat kami lanjutkan saat ini') +
        (p.alasan ? ' ' + w('dengan alasan') + ': _' + p.alasan + '_' : '') + '.\n\n' +
        w('Anda dipersilakan mendaftar kembali bila kendala tersebut sudah teratasi. Terima kasih atas waktu dan usaha Anda.') + sign(w);
    },

    /* ---- mitra toko (marketplace) ---- */
    toko_disetujui: function (p, s, w) {
      var u = user(p.userId, s), t = (u.toko || {});
      return w('Selamat') + ' *' + u.nama + '*! 🏪\n\n' +
        w('Toko') + ' *' + t.nama + '* ' + w('resmi *AKTIF* di aplikasi EXOCLEAN.') + '\n\n' +
        w('Produk Anda kini tampil di katalog dan bisa dibeli klien. Yang bisa Anda lakukan sekarang:') + '\n' +
        '• ' + w('Tambah produk lewat menu *Produk Saya*') + '\n' +
        '• ' + w('Ikut *Kampanye* agar produk tampil di halaman promo') + '\n' +
        '• ' + w('Pasang *Iklan* supaya produk muncul di urutan teratas') + '\n\n' +
        w('Komisi, ongkir, dan pencairan dapat dilihat kapan saja di menu *Keuangan Toko*.') + sign(w);
    },
    toko_ditolak: function (p, s, w) {
      var u = user(p.userId, s), t = (u.toko || {});
      return halo(u.nama, w) + ',\n\n' +
        w('Mohon maaf, pengajuan toko') + ' *' + t.nama + '* ' + w('belum dapat kami setujui.') + '\n\n' +
        '*' + w('Alasan') + ':* ' + (u.alasanTolakToko || '—') + '\n\n' +
        w('Anda dapat memperbaiki data yang dimaksud lalu mengajukan kembali dari aplikasi. Bila ada yang ingin ditanyakan, balas pesan ini.') + sign(w);
    },
    tip_diterima: function (p, s, w) {
      var tp = row('tips', p.tipId, s);
      var o = tp && tp.orderId ? row('orders', tp.orderId, s) : null;
      var c = tp ? user(tp.clientId, s) : null;
      /* Yang disebut adalah BAGIAN orang ini, bukan nominal tip seluruhnya.
         Menyebut total pada tip yang dibagi berdua membuat petugas mengira
         saldonya kurang, dan pertanyaan itu selalu berakhir di admin. */
      return w('Anda menerima tip!') + ' 💝\n\n' +
        '*' + U.rp(p.jumlah) + '* ' + w('sudah masuk ke dompet Anda') +
        (o ? ' ' + w('atas pekerjaan') + ' *' + o.judul + '* (' + o.no + ')' : '') + '.\n\n' +
        (c ? w('Dari') + ': *' + c.nama + '*\n' : '') +
        (tp && tp.pesan ? w('Pesan') + ': “' + tp.pesan + '”\n' : '') +
        '\n' + w('Tip diberikan langsung oleh klien dan diterima utuh — EXOCLEAN tidak memotong sepeser pun. Saldo bisa ditarik lewat menu Dompet.') + sign(w);
    },
    produk_disetujui: function (p, s, w) {
      var pr = row('products', p.produkId, s);
      return w('Produk Anda lolos moderasi') + ' ✅\n\n' +
        '*' + pr.nama + '* (' + pr.kode + ') ' + w('sekarang tayang di katalog EXOCLEAN dan siap dibeli.') + '\n\n' +
        w('Pastikan stok selalu diperbarui agar pesanan tidak batal.') + sign(w);
    },
    produk_ditolak: function (p, s, w) {
      var pr = row('products', p.produkId, s);
      return w('Produk belum lolos moderasi') + ' ⚠️\n\n' +
        '*' + pr.nama + '* (' + pr.kode + ') ' + w('belum dapat ditayangkan.') + '\n\n' +
        '*' + w('Catatan moderator') + ':* ' + ((pr.moderasi && pr.moderasi.alasan) || '—') + '\n\n' +
        w('Silakan perbaiki lalu ajukan ulang lewat menu Produk Saya.') + sign(w);
    },
    toko_pencairan: function (p, s, w) {
      var x = row('sellerPayouts', p.payoutId, s), u = user(x.sellerId, s);
      return halo(u.nama, w) + ', 💸\n\n' +
        w('Pencairan saldo toko Anda sudah *DITRANSFER*.') + '\n\n' +
        '*' + w('No. Pencairan') + ':* ' + x.no + '\n' +
        '*' + w('Jumlah bersih') + ':* *' + U.rp(x.jumlahBersih) + '*\n' +
        '_(' + w('kotor') + ' ' + U.rp(x.jumlahKotor) + ' − ' + w('biaya transfer') + ' ' + U.rp(x.biaya) + ')_\n' +
        '*' + w('Dari') + ':* ' + (x.orderIds || []).length + ' ' + w('pesanan selesai') + '\n' +
        '*' + w('Ke') + ':* ' + x.rekening.bank + ' ' + x.rekening.nomor + '\n' +
        '*' + w('Ref') + ':* ' + (x.refTransfer || '-') + '\n\n' +
        w('Mohon dicek pada rekening Anda. Rincian per pesanan tersedia di menu Keuangan Toko.') + sign(w);
    },

    /* ---- bagi hasil ---- */
    bagihasil_slip: function (p, s, w) {
      var x = row('payouts', p.payoutId, s), u = user(x.mitraId, s);
      var baris = (x.baris || []).map(function (b) {
        return '• ' + U.tgl(b.tgl, w.kode) + ' — ' + U.potong(b.judul, 38) + '\n   ' + U.rp(b.total);
      }).join('\n');
      return halo(u.nama, w) + ', 💰\n\n' +
        w('Slip bagi hasil periode') + ' *' + x.periodeLabel + '* ' + w('sudah terbit.') + '\n\n' +
        '*' + w('No. Slip') + ':* ' + x.no + '\n' +
        '*' + w('Pekerjaan') + ':* ' + (x.baris || []).length + ' ' + w('order') + '\n\n' +
        baris + '\n\n' +
        '_' + w('Porsi pekerjaan') + ':_ ' + U.rp(x.porsi) + '\n' +
        '_' + w('Tunjangan') + ':_ ' + U.rp(x.tunjangan) + '\n' +
        '_' + w('Bonus mutu') + ':_ ' + U.rp(x.bonus) +
        (x.totalPenyesuaian ? '\n_' + w('Penyesuaian') + ':_ ' + U.rp(x.totalPenyesuaian) : '') + '\n' +
        '*' + w('TOTAL') + ': ' + U.rp(x.total) + '*\n\n' +
        '🏦 ' + (x.rekening
          ? x.rekening.bank + ' ' + x.rekening.nomor + ' ' + w('a.n.') + ' ' + x.rekening.atasNama
          : w('rekening belum diisi di profil')) + '\n' +
        '📅 ' + w('Rencana transfer') + ': ' + U.tglPanjang(x.jatuhBayar, w.kode) + '\n\n' +
        w('Rincian lengkap per pekerjaan bisa dibuka di menu *Pendapatan* pada aplikasi. Bila ada angka yang kurang jelas, hubungi admin sebelum tanggal transfer.') + sign(w);
    },

    bagihasil_dibayar: function (p, s, w) {
      var x = row('payouts', p.payoutId, s), u = user(x.mitraId, s);
      return halo(u.nama, w) + ', ✅\n\n' +
        w('Bagi hasil periode') + ' *' + x.periodeLabel + '* ' + w('sebesar') + ' *' + U.rp(x.total) + '* ' +
        w('sudah kami transfer.') + '\n\n' +
        '*' + w('No. Slip') + ':* ' + x.no + '\n' +
        '*' + w('Ref. transfer') + ':* ' + (x.refTransfer || '-') + '\n' +
        '*' + w('Tujuan') + ':* ' + (x.rekening ? x.rekening.bank + ' ' + x.rekening.nomor : '-') + '\n' +
        '*' + w('Waktu') + ':* ' + U.tglJam(x.dibayarAt || U.nowISO(), w.kode) + '\n\n' +
        w('Mohon dicek pada rekening Anda. Bila dalam 1×24 jam belum masuk, kabari admin dengan menyertakan nomor slip di atas.') +
        '\n\n' + w('Terima kasih atas kerja samanya!') + ' 🙏' + sign(w);
    },

    mitra_pengingat_belajar: function (p, s, w) {
      var u = user(p.userId, s);
      return halo(u.nama, w) + ', 📚\n\n' +
        w('Proses bergabung Anda sebagai Mitra EXOCLEAN belum selesai.') + ' ' +
        (p.kurang ? w('Yang masih perlu dilengkapi') + ': _' + p.kurang + '_.\n\n' : '\n') +
        w('Buka menu *Bergabung* di aplikasi untuk melanjutkan. Penugasan baru bisa Anda terima setelah seluruh tahap selesai dan disetujui admin.') + sign(w);
    },

    /* ---- CRM: prospek & pelanggan ---- */
    lead_sapaan: function (p, s, w) {
      var l = row('leads', p.leadId, s);
      var layanan = (l.kebutuhan || []).map(function (id) {
        var x = row('services', id, s); return x ? x.nama : ''; }).filter(Boolean);
      return halo(l.nama, w) + (l.perusahaan ? ' ' + w('dari') + ' ' + l.perusahaan : '') + ', 👋\n\n' +
        w('Perkenalkan, saya dari *EXOCLEAN* — penyedia jasa kebersihan gedung, kantor, dan rumah.') + '\n\n' +
        (layanan.length
          ? w('Kami menerima informasi bahwa Anda membutuhkan:') + '\n' +
            layanan.map(function (n) { return '• ' + n; }).join('\n') + '\n\n'
          : '') +
        w('Boleh kami bantu dengan *survei lokasi gratis* untuk menghitung kebutuhan dan biaya yang akurat? Survei tidak dikenakan biaya dan tidak mengikat.') + '\n\n' +
        w('Kapan waktu yang nyaman untuk tim kami berkunjung?') + sign(w);
    },

    lead_follow_up: function (p, s, w) {
      var l = row('leads', p.leadId, s);
      var t = { baru: '', kontak: w('Menindaklanjuti perbincangan kita sebelumnya,'),
        survei: w('Menindaklanjuti rencana survei lokasi,'),
        penawaran: w('Menindaklanjuti penawaran yang sudah kami kirimkan,'),
        negosiasi: w('Menindaklanjuti diskusi harga kemarin,') }[l.tahap] || '';
      return halo(l.nama, w) + ',\n\n' + (t ? t + ' ' : '') +
        w('kami ingin menanyakan apakah ada yang bisa kami bantu jelaskan lebih lanjut mengenai layanan EXOCLEAN?') + '\n\n' +
        w('Kami siap menyesuaikan lingkup pekerjaan maupun jadwal dengan kebutuhan') + ' ' +
        (l.perusahaan || w('Anda')) + '. ' + w('Silakan balas pesan ini kapan saja.') + sign(w);
    },

    lead_penawaran_khusus: function (p, s, w) {
      var l = row('leads', p.leadId, s);
      return halo(l.nama, w) + ', ✨\n\n' +
        w('Sebagai bentuk apresiasi, kami menyiapkan *penawaran khusus* untuk') + ' ' +
        (l.perusahaan || w('Anda')) + ':\n\n' +
        '• ' + w('Survei & konsultasi gratis') + '\n' +
        '• ' + w('Diskon untuk kontrak bulanan/tahunan') + '\n' +
        '• ' + w('Garansi pembersihan ulang bila hasil belum memuaskan') + '\n' +
        '• ' + w('Tim bersertifikat K3 dengan asuransi kerja') + '\n\n' +
        w('Penawaran ini berlaku sampai') + ' *' + U.tglPanjang(p.berlaku || U.iso(U.addDays(new Date(), 7))) + '*. ' +
        w('Balas pesan ini bila ingin kami buatkan rinciannya.') + sign(w);
    },

    pelanggan_reaktivasi: function (p, s, w) {
      var c = user(p.clientId, s);
      return halo(c.nama, w) + ', 👋\n\n' +
        w('Sudah cukup lama kami tidak berkesempatan melayani') + ' ' + (c.perusahaan || w('Anda')) + '. ' +
        w('Kami ingin menanyakan apakah ada kebutuhan kebersihan yang bisa kami bantu dalam waktu dekat?') + '\n\n' +
        w('Bila berkenan, kami senang menawarkan *harga khusus pelanggan lama* untuk pekerjaan berikutnya — baik jasa kebersihan maupun pembelian alat & chemical dari toko kami.') + sign(w);
    },

    pelanggan_terima_kasih: function (p, s, w) {
      var c = user(p.clientId, s);
      return halo(c.nama, w) + ', 🙏\n\n' +
        w('Terima kasih atas kepercayaan') + ' ' + (c.perusahaan || w('Anda')) + ' ' +
        w('kepada EXOCLEAN selama ini.') + '\n\n' +
        w('Sebagai pelanggan setia, Anda berhak atas *prioritas penjadwalan* dan *harga kontrak khusus*. Bila ingin kami susunkan jadwal perawatan berkala, tinggal balas pesan ini.') + sign(w);
    },

    /* Isi kampanye DITULIS MANUSIA di layar CRM — tidak diterjemahkan, karena
       yang mengetiknya sudah memilih bahasanya sendiri dan menerjemahkan
       kalimat pemasaran orang lain adalah mengubah maksudnya. */
    kampanye: function (p, s, w) {
      return p.pesan || '(' + w('isi pesan kampanye kosong') + ')';
    },

    /* ---- pesan internal ke tim ---- */
    penugasan_worker: function (p, s, w) {
      var o = row('orders', p.orderId, s), pk = user(p.workerId, s), c = user(o.clientId, s);
      var rekan = (o.workerIds || []).filter(function (id) { return id !== p.workerId; })
        .map(function (id) { var u = user(id, s); return u ? u.nama : ''; }).filter(Boolean).join(', ');
      var svc = (o.serviceIds || []).map(function (id) { var x = row('services', id, s); return x ? x.nama : ''; }).join(', ');
      return '*' + w('PENUGASAN BARU') + '* 📋\n\n' +
        w('Halo') + ' ' + pk.nama + ', ' + w('kamu ditugaskan pada:') + '\n\n' +
        '*' + o.no + '* — ' + o.judul + '\n' +
        '🗓️ ' + U.tglPanjang(o.tgl, w.kode) + '\n' +
        '🕐 ' + o.mulai + ' – ' + o.selesai + labelJam(zonaKerja(o)) + '\n' +
        '📍 ' + o.alamat + '\n' +
        '🏷️ ' + w('Layanan') + ': ' + svc + '\n' +
        '👤 ' + w('Klien') + ': ' + (c.perusahaan || c.nama) + '\n' +
        (rekan ? '👥 ' + w('Rekan tim') + ': ' + rekan + '\n' : '') +
        '\n' + w('Jangan lupa *check-in GPS* saat tiba dan unggah *foto sebelum/sesudah* di aplikasi. Gunakan APD lengkap sesuai SOP K3.');
    },

    jadwal_berubah: function (p, s, w) {
      var o = row('orders', p.orderId, s);
      return '*' + w('PERUBAHAN JADWAL') + '* ⚠️\n\n' +
        '*' + o.no + '* — ' + o.judul + '\n\n' +
        w('Jadwal baru') + ':\n🗓️ ' + U.tglPanjang(o.tgl, w.kode) +
        '\n🕐 ' + o.mulai + ' – ' + o.selesai + labelJam(zonaKerja(o)) +
        '\n📍 ' + o.alamat +
        '\n\n' + w('Mohon sesuaikan agenda kamu. Konfirmasi bila berhalangan.');
    },

    alert_supervisor: function (p, s, w) {
      var o = row('orders', p.orderId, s);
      return '*' + w('PERLU VERIFIKASI') + '* 🔍\n\n' +
        w('Pekerjaan') + ' *' + o.no + '* — ' + o.judul + ' ' +
        w('sudah dilaporkan selesai oleh tim lapangan.') + '\n\n' +
        '🗓️ ' + U.tglPanjang(o.tgl, w.kode) + '\n📍 ' + o.alamat + '\n\n' +
        w('Mohon cek laporan & foto, lalu isi penilaian QC di aplikasi.');
    },

    perbaikan_diperlukan: function (p, s, w) {
      var o = row('orders', p.orderId, s);
      return '*' + w('HASIL QC: PERLU PERBAIKAN') + '* 🔁\n\n' +
        '*' + o.no + '* — ' + o.judul + '\n\n' +
        w('Catatan supervisor') + ':\n_' + (p.catatan || '-') + '_\n\n' +
        w('Mohon koordinasi dengan supervisor untuk jadwal pengerjaan ulang.');
    },

    /* ------------------------------------------------- jasa keahlian ---- */
    /* Pesan ini punya TENGGAT. Menit yang tersisa disebutkan di baris
       pertama, bukan di bawah, karena mitra yang membaca sambil bekerja
       sering hanya sempat melihat baris pertama notifikasinya. */
    keahlian_permintaan: function (p, s, w) {
      var o = row('orders', p.orderId, s), pk = user(p.workerId, s), c = user(o.clientId, s);
      var k = o.keahlian || {};
      var rinci = (k.baris || []).map(function (b) {
        return '• ' + b.nama + ' — ' + b.porsi + ' ' + w('porsi'); }).join('\n');
      var menit = Math.max(1, Math.round((p.detik || 60) / 60));
      return '*' + w('PERMINTAAN BARU — JAWAB DALAM') + ' ' + menit + ' ' + w('MENIT') + '* ⏱️\n\n' +
        w('Halo') + ' ' + pk.nama + ', ' + w('ada klien yang memilih kamu:') + '\n\n' +
        '*' + o.no + '* — ' + o.judul + '\n' +
        '🗓️ ' + U.tglPanjang(o.tgl, w.kode) + '\n' +
        '🕐 ' + o.mulai + ' – ' + o.selesai + labelJam(zonaKerja(o)) + '\n' +
        '📍 ' + o.alamat + '\n' +
        '👤 ' + w('Klien') + ': ' + (c.perusahaan || c.nama) + '\n' +
        (rinci ? '\n' + rinci + '\n' : '') +
        (k.catatan ? '\n📝 ' + w('Catatan klien') + ': _' + k.catatan + '_\n' : '') +
        '\n' + w('Buka aplikasi untuk *Terima* atau *Tolak*.') + ' ' +
        w('Lewat') + ' ' + menit + ' ' + w('menit tanpa jawaban, permintaan ini gugur otomatis dan klien akan memilih mitra lain.');
    },

    keahlian_ditolak: function (p, s, w) {
      var o = row('orders', p.orderId, s);
      return '*' + w('MITRA BERHALANGAN') + '* 🔄\n\n' +
        w('Mohon maaf, mitra yang Anda pilih untuk') + ' *' + o.no + '* — ' + o.judul + ' ' +
        w('sedang berhalangan.') + '\n\n' +
        w('Pesanan Anda tidak hilang. Buka aplikasi untuk memilih mitra lain pada tanggal dan jam yang sama.');
    },

    /* ------------------------------------------------- MCS korporat ---- */
    /* Penerimanya petugas kebersihan korporat — bukan mitra EXOCLEAN, dan
       bukan pengguna aplikasi ini. Pesannya berdiri sendiri: ia tidak bisa
       membuka tautan mana pun untuk melihat rinciannya.

       Karena ia bukan pengguna, ia juga tidak punya preferensi bahasa: `w`
       di sini hampir selalu bahasa bawaan. Pembungkusnya tetap dipasang
       supaya kalimatnya SIAP bila suatu saat nomor itu ditautkan ke akun —
       dan supaya tidak ada satu berkas pun yang punya aturan sendiri. */
    /**
     * Aduan penghuni yang diteruskan ke petugas.
     *
     * Isinya sengaja memuat BATAS WAKTU, bukan sekadar keluhannya. Petugas
     * yang tahu ia punya tiga puluh menit berperilaku berbeda dari petugas
     * yang hanya diberi tahu ada yang kotor.
     */
    mcs_aduan: function (p, s, w) {
      var lokasi = [p.gedung, p.lantai ? 'Lt. ' + p.lantai : ''].filter(Boolean).join(' ');
      return '*' + w('ADUAN PENGHUNI') + '* ' + (p.ikon || '📣') + '\n\n' +
        w('Halo') + ' ' + (p.pekerjaNama || '') + ',\n' +
        w('Ada laporan dari penghuni:') + '\n\n' +
        '📍 *' + p.areaNama + '*' + (lokasi ? '\n   ' + lokasi : '') + '\n' +
        '⚠️ ' + w('Tingkat') + ': *' + (p.gentingNama || '') + '*\n' +
        (p.teks ? '\n"' + p.teks + '"\n' : '') +
        '\n⏱️ ' + w('Ditargetkan selesai dalam') + ' *' + (p.batas || '') + '*.\n' +
        '\n' + w('Setelah ditangani, laporkan agar tercatat.') + '\n\n_MCS EXOCLEAN_';
    },

    mcs_ingat: function (p, s, w) {
      var k = row('korporat', p.korporatId, s) || { nama: '' };
      var lokasi = [p.gedung, p.lantai ? 'Lt. ' + p.lantai : ''].filter(Boolean).join(' ');
      var daftar = (p.checklist || []).map(function (c) { return '• ' + c; }).join('\n');
      return '*' + w('JADWAL PEMBERSIHAN') + '* 🧹\n\n' +
        w('Halo') + ' ' + (p.pekerjaNama || '') + ',\n' +
        w('Waktunya membersihkan:') + '\n\n' +
        '📍 *' + p.areaNama + '*' + (lokasi ? '\n   ' + lokasi : '') + '\n' +
        /* Zona CABANGNYA, dikirim bersama pesannya oleh MCS.kirimPengingat.
           Petugas di Makassar membaca “08.00 WITA” — jam yang sama dengan
           yang tertera pada layar absensinya, bukan jam Jakarta. */
        '🕐 ' + w('Pukul') + ' *' + p.jam + labelJam(p.zona) + '*\n' +
        (daftar ? '\n' + daftar + '\n' : '') +
        '\n' + w('Setelah selesai, laporkan ke penanggung jawab agar tercatat di') + ' ' +
        (k.nama || w('sistem')) + '.\n\n_MCS EXOCLEAN_';
    },

    keahlian_kedaluwarsa: function (p, s, w) {
      var o = row('orders', p.orderId, s);
      return '*' + w('BELUM ADA JAWABAN') + '* ⏳\n\n' +
        w('Mitra yang Anda pilih untuk') + ' *' + o.no + '* — ' + o.judul + ' ' +
        w('belum menjawab sampai batas waktunya.') + '\n\n' +
        w('Buka aplikasi untuk memilih mitra lain — tanggal, jam, dan pesanan Anda tetap tersimpan.');
    }
  };

  /* ---------------------------------------------------------------- API */

  /**
   * Susun teks pesan dari template.
   *
   * @param {string} key      nama template
   * @param {object} params   parameter template
   * @param {object} s        keadaan DB alternatif (dipakai saat seeding)
   * @param {string|object} penerima  id atau baris user yang akan MEMBACA
   *        pesan ini. Bahasanya diambil dari preferensi orang itu, bukan
   *        dari bahasa layar yang sedang dipakai penyusunnya. Bila tidak
   *        disebut, hasilnya bahasa bawaan — sama persis dengan sebelum
   *        berkas ini menerjemahkan apa pun.
   */
  function render(key, params, s, penerima) {
    var fn = T[key];
    /* PENERIMA TAK DIKENAL = BAHASA SUMBER, bukan bahasa bawaan aplikasi.

       Ini sempat salah dan salahnya tidak terlihat sampai layarnya dibuka.
       I18N.BAWAAN bernilai 'en', jadi I18N.pesanUntuk(null) mengembalikan
       penerjemah Inggris — dan penerima yang paling sering TIDAK punya akun
       di aplikasi ini justru petugas kebersihan korporat pada MCS, yang
       hanya dititipkan nomor teleponnya. Mereka akan menerima jadwal
       pembersihan dan aduan penghuni dalam Bahasa Inggris.

       Bawaan yang benar untuk pesan keluar adalah bahasa sumbernya sendiri:
       yang tidak diketahui bahasanya sebaiknya menerima kalimat yang memang
       ditulis manusia, bukan hasil terjemahan yang kebetulan menjadi bawaan
       antarmuka. Menebak salah pada pesan yang keluar dari aplikasi tidak
       bisa diperbaiki dengan menekan tombol bahasa. */
    var w = (penerima && window.I18N && I18N.pesanUntuk)
      ? I18N.pesanUntuk(penerima)
      : function (t) { return t; };
    if (!fn) return '(' + w('template') + ' "' + key + '" ' + w('tidak ditemukan') + ')';
    try { return fn(params || {}, s, w); }
    catch (e) { return '(' + w('gagal menyusun pesan') + ': ' + e.message + ')'; }
  }

  var LABEL = {
    booking_diterima: 'Konfirmasi permintaan masuk',
    survei_dijadwalkan: 'Jadwal survei lokasi',
    quotation_terkirim: 'Pengiriman penawaran harga',
    jadwal_dikonfirmasi: 'Konfirmasi jadwal pengerjaan',
    reminder_h1: 'Pengingat H-1',
    tim_berangkat: 'Tim berangkat ke lokasi',
    pekerjaan_selesai: 'Pekerjaan selesai',
    minta_rating: 'Permintaan penilaian',
    invoice_terbit: 'Invoice diterbitkan',
    /* Bukan 'Pengingat pembayaran': kunci itu jamak dalam Inggris karena
       dipakai sebagai judul FITUR di layar Surat Keluar. Chip ini menamai
       SATU pesan. Sama persis alasannya dengan subjek surel di email.js. */
    invoice_jatuh_tempo: 'Pengingat pembayaran invoice',
    komplain_diterima: 'Tanggapan komplain',
    toko_pesanan_diterima: 'Toko — pesanan diterima',
    toko_dikonfirmasi: 'Toko — pesanan dikonfirmasi',
    toko_dikirim: 'Toko — barang dikirim',
    toko_selesai: 'Toko — pesanan selesai',
    toko_stok_habis: 'Toko — stok tidak tersedia',
    mitra_disetujui: 'Mitra — pendaftaran disetujui',
    mitra_ditolak: 'Mitra — pendaftaran ditolak',
    mitra_pengingat_belajar: 'Mitra — pengingat menyelesaikan onboarding',
    toko_disetujui: 'Mitra Toko — pengajuan disetujui',
    toko_ditolak: 'Mitra Toko — pengajuan ditolak',
    tip_diterima: 'Petugas — tip dari klien masuk dompet',
    produk_disetujui: 'Mitra Toko — produk lolos moderasi',
    produk_ditolak: 'Mitra Toko — produk ditolak moderasi',
    toko_pencairan: 'Mitra Toko — pencairan ditransfer',
    bagihasil_slip: 'Bagi hasil — slip pencairan',
    bagihasil_dibayar: 'Bagi hasil — sudah ditransfer',
    lead_sapaan: 'CRM — sapaan pertama prospek',
    lead_follow_up: 'CRM — tindak lanjut prospek',
    lead_penawaran_khusus: 'CRM — penawaran khusus',
    pelanggan_reaktivasi: 'CRM — reaktivasi pelanggan dorman',
    pelanggan_terima_kasih: 'CRM — apresiasi pelanggan setia',
    kampanye: 'CRM — kampanye broadcast',
    link_pembayaran: 'Tautan pembayaran',
    pembayaran_diterima: 'Pembayaran diterima',
    pembayaran_kedaluwarsa: 'Tautan bayar kedaluwarsa',
    penugasan_worker: 'Penugasan ke petugas',
    jadwal_berubah: 'Perubahan jadwal',
    alert_supervisor: 'Minta verifikasi supervisor',
    perbaikan_diperlukan: 'Instruksi perbaikan',
    keahlian_permintaan: 'Permintaan jasa keahlian ke mitra',
    keahlian_ditolak: 'Mitra keahlian berhalangan',
    keahlian_kedaluwarsa: 'Permintaan keahlian gugur tanpa jawaban',
    mcs_aduan: 'MCS — aduan penghuni diteruskan ke petugas',
    mcs_ingat: 'MCS — pengingat jadwal pembersihan'
  };

  /**
   * Masukkan pesan ke antrean WA Outbox.
   * @param {string} key      nama template
   * @param {string} toUserId penerima (id user)
   * @param {object} params   parameter template
   * @param {object} ref      { tipe, id } dokumen sumber
   */
  /**
   * Antrekan satu pesan.
   *
   * `toUserId` boleh null bila penerimanya BUKAN pengguna aplikasi — petugas
   * kebersihan korporat pada MCS hanya punya nomor telepon. Dalam hal itu
   * nomornya dititipkan lewat `params.pekerjaTelp` / `params.telp` dan
   * disimpan di barisnya sendiri, supaya kirim() tetap tahu ke mana.
   */
  function enqueue(key, toUserId, params, ref) {
    /* Bahasanya ditentukan SEKARANG, saat penerimanya masih diketahui.
       Teks yang tersimpan di outbox adalah teks yang akan dikirim; menunda
       penerjemahan sampai tombol Kirim ditekan berarti pesannya menuruti
       bahasa layar admin yang kebetulan menekannya. */
    var pesan = render(key, params, null, toUserId);
    var p = params || {};
    return DB.insert('waOutbox', {
      to: toUserId, telp: p.pekerjaTelp || p.telp || null,
      nama: p.pekerjaNama || p.nama || null,
      template: key, pesan: pesan, status: 'antre',
      refType: ref && ref.tipe || null, refId: ref && ref.id || null, sentAt: null
    });
  }

  /** URL wa.me dengan teks siap kirim. */
  function link(telp, pesan) {
    return 'https://wa.me/' + U.waPhone(telp) + '?text=' + encodeURIComponent(pesan);
  }

  /** Buka WhatsApp untuk satu item outbox lalu tandai terkirim. */
  function kirim(outboxId) {
    var m = DB.find('waOutbox', outboxId);
    if (!m) return;
    var u = m.to ? DB.find('users', m.to) : null;
    /* Penerima bisa berupa akun, bisa pula sekadar nomor — petugas korporat
       pada MCS tidak punya akun di aplikasi ini. */
    var telp = u ? u.telp : m.telp;
    var nama = u ? u.nama : (m.nama || telp);
    if (!telp) { UI.toast(I18N.t('Nomor penerima tidak ada'), 'err'); return; }
    window.open(link(telp, m.pesan), '_blank', 'noopener');
    DB.update('waOutbox', outboxId, { status: 'terkirim', sentAt: U.nowISO() });
    UI.toast(I18N.t('WhatsApp dibuka untuk') + ' ' + nama + '. ' +
      I18N.t('Tandai terkirim') + ' ✓', 'ok');
  }

  /** Kirim langsung tanpa menyimpan ke outbox (mis. tombol "Chat" cepat). */
  function chat(telp, pesan) {
    window.open(link(telp, pesan || ''), '_blank', 'noopener');
  }

  function antre() { return DB.where('waOutbox', { status: 'antre' }); }

  return {
    render: render, enqueue: enqueue, link: link, kirim: kirim, chat: chat,
    antre: antre, LABEL: LABEL, templates: T, totalQuotation: totalQuotation
  };
})();
