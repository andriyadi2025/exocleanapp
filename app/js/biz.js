/* ==========================================================================
   biz.js — aturan bisnis EXOCLEAN
   --------------------------------------------------------------------------
   Semua perubahan status penting (order mulai/selesai, QC, invoice, dsb.)
   lewat sini supaya efek sampingnya konsisten: log aktivitas + antrean
   notifikasi WhatsApp otomatis.
   ========================================================================== */
var BIZ = (function () {

  /* ---------------------------------------------------------------- lookup */
  function user(id) { return DB.find('users', id); }
  function nama(id) { var u = user(id); return u ? u.nama : '—'; }
  function usersByRole(role) { return AKUN.usersByRole(role); }
  function svc(id) { return DB.find('services', id); }
  function svcNama(id) { var s = svc(id); return s ? s.nama : '—'; }
  /** Nama yang ditampilkan untuk klien: pakai nama perusahaan bila ada. */
  function klien(id) { var u = user(id); return u ? (u.perusahaan || u.nama) : '—'; }

  function order(id) { return DB.find('orders', id); }
  function team(id) { return DB.find('teams', id); }

  /* ---------------------------------------------------------------- turunan order */
  function progresChecklist(o) {
    var c = o.checklist || [];
    if (!c.length) return { done: 0, total: 0, pct: 0 };
    var done = c.filter(function (x) { return x.done; }).length;
    return { done: done, total: c.length, pct: Math.round(done / c.length * 100) };
  }

  function absensi(orderId, workerId) {
    return DB.where('attendance', function (a) {
      return a.orderId === orderId && (!workerId || a.workerId === workerId);
    });
  }
  /** Status absen satu petugas di satu order: 'belum' | 'in' | 'out'. */
  function statusAbsen(orderId, workerId) {
    var a = absensi(orderId, workerId);
    if (a.some(function (x) { return x.tipe === 'out'; })) return 'out';
    if (a.some(function (x) { return x.tipe === 'in'; })) return 'in';
    return 'belum';
  }
  function jamAbsen(orderId, workerId, tipe) {
    var a = absensi(orderId, workerId).filter(function (x) { return x.tipe === tipe; });
    return a.length ? a[a.length - 1] : null;
  }

  function laporan(orderId) { return DB.where('reports', { orderId: orderId }); }
  function qcOrder(orderId) { var r = DB.where('qc', { orderId: orderId }); return r.length ? r[r.length - 1] : null; }
  function invoiceOrder(orderId) { var r = DB.where('invoices', { orderId: orderId }); return r.length ? r[0] : null; }
  function ratingOrder(orderId) { var r = DB.where('ratings', { orderId: orderId }); return r.length ? r[0] : null; }
  function komplainOrder(orderId) { return DB.where('complaints', { orderId: orderId }); }

  /* ---------------------------------------------------------------- uang */
  function subtotalQuotation(q) {
    return U.sum(q.items || [], function (i) { return i.qty * i.harga; });
  }
  function totalQuotation(q) {
    var afterDisc = subtotalQuotation(q) - (q.diskon || 0);
    return Math.round(afterDisc + afterDisc * ((q.ppn || 0) / 100));
  }
  function terbayar(inv) { return U.sum(inv.payments || [], function (p) { return p.jumlah; }); }
  function sisaTagihan(inv) { return Math.max(0, inv.total - terbayar(inv)); }

  /** Perbarui status invoice berdasarkan pembayaran & tanggal jatuh tempo. */
  function hitungStatusInvoice(inv) {
    var bayar = terbayar(inv);
    if (bayar >= inv.total) return 'lunas';
    if (bayar > 0) return 'sebagian';
    return U.diffDays(new Date(), inv.jatuhTempo) > 0 ? 'jatuh_tempo' : 'belum';
  }
  /** Dipanggil saat aplikasi dibuka: tandai invoice yang lewat jatuh tempo. */
  function segarkanInvoice() {
    DB.all('invoices').forEach(function (inv) {
      var s = hitungStatusInvoice(inv);
      if (s !== inv.status) DB.update('invoices', inv.id, { status: s });
    });
  }

  /* ---------------------------------------------------------------- estimasi harga */
  /**
   * Hitung estimasi dari item booking. Layanan bertanda `survei` tidak
   * dihitung nominalnya — ditandai supaya klien tahu perlu survei dulu.
   */
  function estimasi(items) {
    var min = 0, max = 0, perluSurvei = [];
    (items || []).forEach(function (it) {
      var s = svc(it.serviceId);
      if (!s) return;
      if (s.survei || s.hargaMin === null) { perluSurvei.push(s.nama); return; }
      min += s.hargaMin * (it.qty || 1);
      max += (s.hargaMax || s.hargaMin) * (it.qty || 1);
    });
    return { min: min, max: max, perluSurvei: perluSurvei, adaHarga: min > 0 };
  }

  function teksEstimasi(e) {
    if (!e.adaHarga) return 'Perlu survei';
    return e.max > e.min ? U.rp(e.min) + ' – ' + U.rp(e.max) : 'mulai ' + U.rp(e.min);
  }

  /* ---------------------------------------------------------------- alur booking & penawaran */
  function buatBooking(clientId, data) {
    var b = DB.insert('bookings', {
      no: U.docNo('REQ', DB.nextNo('booking')), clientId: clientId, status: 'baru',
      alamat: data.alamat, items: data.items, tglHarapan: data.tglHarapan, catatan: data.catatan || ''
    });
    DB.log(clientId, 'Mengajukan permintaan layanan ' + b.no, 'booking', b.id);
    WA.enqueue('booking_diterima', clientId, { bookingId: b.id }, { tipe: 'booking', id: b.id });
    return b;
  }

  function buatQuotation(bookingId, clientId, data) {
    var q = DB.insert('quotations', {
      no: U.docNo('QUO', DB.nextNo('quotation')), bookingId: bookingId || null, clientId: clientId,
      status: 'draft', items: data.items, diskon: data.diskon || 0, ppn: data.ppn || 0,
      berlakuHingga: data.berlakuHingga, catatan: data.catatan || '', dikirimAt: null
    });
    if (bookingId) DB.update('bookings', bookingId, { status: 'dikutip', quotationId: q.id });
    DB.log('u_admin', 'Membuat penawaran ' + q.no, 'quotation', q.id);
    return q;
  }

  function kirimQuotation(qid) {
    var q = DB.find('quotations', qid);
    if (!q) return;
    DB.update('quotations', qid, { status: 'terkirim', dikirimAt: U.nowISO() });
    WA.enqueue('quotation_terkirim', q.clientId, { quotationId: qid }, { tipe: 'quotation', id: qid });
    /* Penawaran sering diteruskan klien ke atasannya untuk disetujui — dan
       yang diteruskan orang adalah email, bukan pesan WhatsApp. */
    if (window.EMAIL) EMAIL.kirimPenawaran(qid).catch(function () {});
    DB.log('u_admin', 'Mengirim penawaran ' + q.no, 'quotation', qid);
  }

  function responQuotation(qid, setuju, alasan) {
    var q = DB.find('quotations', qid);
    DB.update('quotations', qid, {
      status: setuju ? 'disetujui' : 'ditolak',
      disetujuiAt: setuju ? U.nowISO() : null, alasanTolak: setuju ? null : (alasan || '')
    });
    DB.log(q.clientId, (setuju ? 'Menyetujui' : 'Menolak') + ' penawaran ' + q.no, 'quotation', qid);
  }

  /* ---------------------------------------------------------------- order */
  function checklistDari(serviceIds) {
    var out = [];
    (serviceIds || []).forEach(function (sid) {
      var s = svc(sid);
      (s && s.checklist || []).forEach(function (label) {
        out.push({ id: U.uid('ck'), label: label, grup: s.nama, done: false, byId: null, at: null });
      });
    });
    return out;
  }

  function buatOrder(data) {
    var o = DB.insert('orders', {
      no: U.docNo('ORD', DB.nextNo('order')), clientId: data.clientId, quotationId: data.quotationId || null,
      judul: data.judul, alamat: data.alamat, koordinat: data.koordinat || null,
      /* Bentuk terstrukturnya ikut dibawa, bukan hanya satu barisnya.
         Tanpa ini order yang dibuat dari formulir beralamat lengkap tetap
         lahir tanpa wilayah — dan alamatnya kembali menjadi teks yang tidak
         bisa dicari begitu ada yang membukanya untuk disunting. */
      wilayah: data.wilayah || null,
      serviceIds: data.serviceIds || [], tgl: data.tgl, mulai: data.mulai, selesai: data.selesai,
      teamId: data.teamId || null, workerIds: data.workerIds || [], supervisorId: data.supervisorId || null,
      status: 'dijadwalkan', nilai: data.nilai || 0, checklist: checklistDari(data.serviceIds)
    });
    DB.log('u_admin', 'Menjadwalkan ' + o.no, 'order', o.id);
    /* `tanpaNotif` dipakai alur yang pesanannya belum benar-benar terjadwal —
       jasa keahlian menunggu mitra menerima dulu. Mengabari klien bahwa
       jadwalnya dikonfirmasi sebelum ada yang menyanggupi adalah janji yang
       belum tentu bisa ditepati, dan klien baru tahu setelah membuat rencana. */
    if (!data.tanpaNotif) notifJadwal(o.id);
    return o;
  }

  /** Kirim ulang notifikasi jadwal ke klien + seluruh petugas yang ditugaskan. */
  function notifJadwal(orderId, perubahan) {
    var o = order(orderId);
    if (!o) return;
    WA.enqueue(perubahan ? 'jadwal_dikonfirmasi' : 'jadwal_dikonfirmasi', o.clientId,
      { orderId: orderId }, { tipe: 'order', id: orderId });
    (o.workerIds || []).forEach(function (wid) {
      WA.enqueue(perubahan ? 'jadwal_berubah' : 'penugasan_worker', wid,
        { orderId: orderId, workerId: wid }, { tipe: 'order', id: orderId });
    });
  }

  function tugaskan(orderId, workerIds, teamId, supervisorId) {
    var o = order(orderId);
    var baru = workerIds.filter(function (w) { return (o.workerIds || []).indexOf(w) < 0; });
    DB.update('orders', orderId, { workerIds: workerIds, teamId: teamId || o.teamId, supervisorId: supervisorId || o.supervisorId });
    baru.forEach(function (wid) {
      WA.enqueue('penugasan_worker', wid, { orderId: orderId, workerId: wid }, { tipe: 'order', id: orderId });
    });
    DB.log(supervisorId || 'u_admin', 'Menugaskan ' + baru.length + ' petugas ke ' + o.no, 'order', orderId);
  }

  /** Cek petugas yang sudah punya order lain di tanggal & jam bertabrakan. */
  function bentrok(orderId, tgl, mulai, selesai, workerIds) {
    var hits = [];
    DB.all('orders').forEach(function (o) {
      if (o.id === orderId || o.tgl !== tgl || o.status === 'dibatalkan') return;
      var overlap = !(selesai <= o.mulai || mulai >= o.selesai);
      if (!overlap) return;
      (o.workerIds || []).forEach(function (w) {
        if (workerIds.indexOf(w) >= 0) hits.push({ workerId: w, order: o });
      });
    });
    return hits;
  }

  function checkIn(orderId, workerId, gps, photoId, catatan) {
    var a = DB.insert('attendance', {
      orderId: orderId, workerId: workerId, tipe: 'in', at: U.nowISO(),
      lat: gps && gps.lat, lng: gps && gps.lng, akurasi: gps && gps.akurasi,
      gpsGagal: gps && !gps.ok ? gps.alasan : null, selfiePhotoId: photoId || null, catatan: catatan || ''
    });
    var o = order(orderId);
    if (o && o.status === 'dijadwalkan') {
      DB.update('orders', orderId, { status: 'berjalan', mulaiAktual: a.at });
      WA.enqueue('tim_berangkat', o.clientId, { orderId: orderId }, { tipe: 'order', id: orderId });
    }
    DB.log(workerId, 'Check-in di ' + (o ? o.no : orderId), 'order', orderId);
    return a;
  }

  function checkOut(orderId, workerId, gps, catatan) {
    var a = DB.insert('attendance', {
      orderId: orderId, workerId: workerId, tipe: 'out', at: U.nowISO(),
      lat: gps && gps.lat, lng: gps && gps.lng, akurasi: gps && gps.akurasi,
      gpsGagal: gps && !gps.ok ? gps.alasan : null, catatan: catatan || ''
    });
    DB.log(workerId, 'Check-out dari ' + (order(orderId) || {}).no, 'order', orderId);
    return a;
  }

  /** Petugas menyatakan pekerjaan selesai -> menunggu verifikasi supervisor. */
  function laporSelesai(orderId, workerId) {
    var o = order(orderId);
    DB.update('orders', orderId, { status: 'selesai', selesaiAktual: U.nowISO() });
    if (o.supervisorId) {
      WA.enqueue('alert_supervisor', o.supervisorId, { orderId: orderId }, { tipe: 'order', id: orderId });
    }
    DB.log(workerId, 'Melaporkan ' + o.no + ' selesai', 'order', orderId);
  }

  /** Supervisor menilai hasil kerja. Lulus -> order terverifikasi + invoice otomatis. */
  function verifikasiQC(orderId, supervisorId, skor, hasil, catatan) {
    var o = order(orderId);
    DB.insert('qc', { orderId: orderId, supervisorId: supervisorId, skor: skor, hasil: hasil,
      catatan: catatan || '', at: U.nowISO() });

    if (hasil === 'lulus') {
      DB.update('orders', orderId, { status: 'diverifikasi' });
      WA.enqueue('pekerjaan_selesai', o.clientId, { orderId: orderId }, { tipe: 'order', id: orderId });
      WA.enqueue('minta_rating', o.clientId, { orderId: orderId }, { tipe: 'order', id: orderId });
      if (!invoiceOrder(orderId) && o.nilai > 0) terbitkanInvoice(orderId, { ppn: 11, tempoHari: 14 });

      /* Poin untuk kedua pihak: klien karena pekerjaannya tuntas, dan tiap
         petugas yang benar-benar bertugas — bukan seluruh tim, supaya yang
         dihargai adalah yang mengerjakan. */
      if (window.POIN) {
        POIN.beri(o.clientId, 'pekerjaanTuntas', { tipe: 'order', id: orderId }, 0,
          'Pekerjaan ' + o.no + ' selesai');
        /* Cashback dibayar SETELAH mutunya lolos, bukan saat uangnya masuk.
           Membayarnya lebih awal berarti harus menariknya kembali bila
           pekerjaannya ternyata harus diulang. */
        if (window.INSENTIF) {
          INSENTIF.bayarCashback(o.clientId, 'jasa', o.nilai || 0,
            { tipe: 'order', id: orderId });
        }
        (o.workerIds || []).forEach(function (wid) {
          POIN.beri(wid, 'mitraTuntas', { tipe: 'order', id: orderId }, 0,
            'Pekerjaan ' + o.no + ' tuntas');
          POIN.beri(wid, 'mitraQcLulus', { tipe: 'order', id: orderId }, 0,
            'QC lulus — ' + o.no);
        });
      }
    } else {
      DB.update('orders', orderId, { status: 'perbaikan' });
      (o.workerIds || []).forEach(function (wid) {
        WA.enqueue('perbaikan_diperlukan', wid, { orderId: orderId, catatan: catatan }, { tipe: 'order', id: orderId });
      });
    }
    DB.log(supervisorId, 'Verifikasi QC ' + o.no + ' — ' + hasil, 'order', orderId);
  }

  function rataQC(q) {
    if (!q || !q.skor) return 0;
    var v = [q.skor.kebersihan, q.skor.kerapihan, q.skor.k3, q.skor.ketepatan];
    return Math.round(U.sum(v) / v.length * 10) / 10;
  }

  /* ---------------------------------------------------------------- invoice */
  function terbitkanInvoice(orderId, opt) {
    opt = opt || {};
    var o = order(orderId);
    var subtotal = opt.subtotal !== undefined ? opt.subtotal : (o.nilai || 0);
    var diskon = opt.diskon || 0, ppn = opt.ppn || 0;
    var afterDisc = subtotal - diskon;
    var inv = DB.insert('invoices', {
      no: U.docNo18(DB.nextNo('invoice')), orderId: orderId, clientId: o.clientId,
      subtotal: subtotal, diskon: diskon, ppn: ppn,
      total: Math.round(afterDisc + afterDisc * (ppn / 100)),
      jatuhTempo: U.iso(U.addDays(new Date(), opt.tempoHari || 14)),
      status: 'belum', payments: [], terbitAt: U.nowISO()
    });
    WA.enqueue('invoice_terbit', o.clientId, { invoiceId: inv.id }, { tipe: 'invoice', id: inv.id });
    /* Email menyusul WhatsApp, bukan menggantikannya: WhatsApp memberi tahu,
       email menjadi arsip yang bisa diteruskan ke bagian keuangan klien.
       Kegagalannya tidak membatalkan penerbitan invoice — invoicenya sudah
       sah, dan suratnya tersimpan di kotak keluar untuk dicoba lagi. */
    if (window.EMAIL) {
      EMAIL.kirimInvoice(inv.id, 'terbit').catch(function () {});
    }
    DB.log('u_admin', 'Menerbitkan invoice ' + inv.no, 'invoice', inv.id);
    return inv;
  }

  function catatPembayaran(invoiceId, jumlah, metode, ref, buktiPhotoId) {
    var inv = DB.find('invoices', invoiceId);
    var payments = (inv.payments || []).concat([{
      id: U.uid('pay'), at: U.nowISO(), jumlah: jumlah, metode: metode || 'Transfer',
      ref: ref || '', buktiPhotoId: buktiPhotoId || null
    }]);
    DB.update('invoices', invoiceId, { payments: payments });
    DB.update('invoices', invoiceId, { status: hitungStatusInvoice(DB.find('invoices', invoiceId)) });
    DB.log('u_admin', 'Mencatat pembayaran ' + U.rp(jumlah) + ' untuk ' + inv.no, 'invoice', invoiceId);

    /* Komisi afiliasi baru dihitung setelah invoice LUNAS — bukan saat terbit.
       Menghitungnya lebih awal berarti membayar komisi atas uang yang belum
       tentu masuk. */
    var segar = DB.find('invoices', invoiceId);
    if (segar.status === 'lunas' && window.AFILIASI) {
      AFILIASI.catatKomisi(segar.clientId, 'jasa', segar.subtotal || segar.total,
        { tipe: 'invoice', id: segar.id, judul: I18N.t('Invoice') + ' ' + segar.no });
    }
    /* Poin terbit pada saat yang sama dengan komisi — uangnya sudah benar-benar
       masuk, jadi kewajiban poin baru pantas dicatat. */
    if (segar.status === 'lunas' && window.POIN) {
      POIN.beri(segar.clientId, 'belanjaJasa',
        { tipe: 'invoice', id: segar.id }, segar.subtotal || segar.total,
        'Invoice ' + segar.no + ' lunas');
    }
  }

  /* ---------------------------------------------------------------- rating & komplain */
  function beriRating(orderId, clientId, bintang, komentar) {
    var ada = ratingOrder(orderId);
    if (ada) { DB.update('ratings', ada.id, { bintang: bintang, komentar: komentar, at: U.nowISO() }); return ada; }
    var r = DB.insert('ratings', { orderId: orderId, clientId: clientId, bintang: bintang,
      komentar: komentar || '', at: U.nowISO() });
    DB.log(clientId, 'Memberi penilaian ' + bintang + '★', 'order', orderId);

    if (window.POIN) {
      POIN.beri(clientId, 'beriNilai', { tipe: 'order', id: orderId }, 0,
        I18N.t('Penilaian untuk pekerjaan'));
      /* Bonus bintang lima untuk petugasnya. Sengaja hanya pada nilai penuh:
         hadiah yang cair di semua nilai tidak memberi tahu apa pun tentang mutu. */
      if (bintang === 5) {
        var o = order(orderId);
        (o && o.workerIds || []).forEach(function (wid) {
          POIN.beri(wid, 'mitraBintang5', { tipe: 'order', id: orderId }, 0,
            I18N.t('Mendapat nilai 5 dari klien'));
        });
      }
    }
    return r;
  }

  function ajukanKomplain(orderId, clientId, isi, photos) {
    var c = DB.insert('complaints', { orderId: orderId, clientId: clientId, status: 'baru',
      isi: isi, photos: photos || [], at: U.nowISO(), reworkOrderId: null });
    WA.enqueue('komplain_diterima', clientId, { complaintId: c.id }, { tipe: 'complaint', id: c.id });
    var o = order(orderId);
    if (o && o.supervisorId) {
      /* Bahasa SUPERVISOR yang menerima, bukan bahasa klien yang mengetik
         komplainnya. Isi komplainnya sendiri tentu tidak diterjemahkan — itu
         kalimat orang, bukan antarmuka. */
      var w = I18N.pesanUntuk(o.supervisorId);
      DB.insert('waOutbox', { to: o.supervisorId, template: 'manual', status: 'antre', sentAt: null,
        refType: 'complaint', refId: c.id,
        pesan: '*' + w('KOMPLAIN KLIEN') + '* ⚠️\n\n' +
               w('Order') + ' ' + o.no + ' — ' + o.judul + '\n' +
               w('Klien:') + ' ' + klien(o.clientId) + '\n\n' +
               '_"' + isi + '"_\n\n' +
               w('Mohon segera tindak lanjuti & jadwalkan pengerjaan ulang.') });
    }
    DB.log(clientId, 'Mengajukan komplain', 'complaint', c.id);
    return c;
  }

  /* ================================================================ TOKO */

  function produk(id) { return DB.find('products', id); }
  function produkNama(id) { var p = produk(id); return p ? p.nama : '—'; }
  function pesananToko(id) { return DB.find('shopOrders', id); }

  /** Produk yang stoknya sudah di bawah batas minimum. */
  function stokMenipis() {
    return DB.all('products').filter(function (p) { return p.aktif && p.stok <= (p.minStok || 0); });
  }

  /** Hitung subtotal & total sebuah pesanan toko. */
  /**
   * Total satu pesanan toko.
   *
   * `tambahan` adalah biaya layanan tambahan yang dipilih pembeli — asuransi
   * pengiriman, perlindungan produk. Ia TIDAK kena PPN di sini karena bukan
   * penjualan barang, dan ditambahkan setelahnya seperti ongkir.
   *
   * Argumen ini ditambahkan belakangan dan sengaja diletakkan paling akhir:
   * seluruh pemanggil lama memanggilnya dengan empat argumen dan tetap
   * mendapat hasil yang sama persis.
   */
  /**
   * Hitung tagihan pesanan toko.
   *
   * URUTANNYA MENENTUKAN ANGKANYA, dan urutan di bawah ini disengaja:
   *
   *   subtotal − diskon            → dasar kena pajak
   *   + PPN atas dasar itu
   *   + ongkir − potongan ongkir   → ongkir tidak kena PPN toko
   *   + layanan tambahan
   *   − poin yang dipakai          → alat bayar, DI LUAR dasar pajak
   *
   * Poin dikurangkan PALING AKHIR karena ia alat bayar, bukan potongan
   * harga. Mengurangkannya sebelum PPN akan mengecilkan pajak yang
   * seharusnya dipungut atas nilai barang yang sebenarnya — selisih yang
   * tidak terlihat di layar mana pun sampai diperiksa petugas pajak.
   *
   * `opsi` sengaja diletakkan sebagai argumen terakhir supaya seluruh
   * pemanggil lama tetap benar tanpa disentuh.
   */
  function hitungToko(items, ongkir, ppn, diskon, tambahan, opsi) {
    opsi = opsi || {};
    var subtotal = U.sum(items, function (i) { return i.qty * i.harga; });
    var after = Math.max(0, subtotal - (diskon || 0));
    var ppnRp = Math.round(after * ((ppn || 0) / 100));

    var ongkirKotor = ongkir || 0;
    /* Potongan ongkir tidak pernah melebihi ongkirnya. Kalau melebihi, ia
       berubah jadi uang kembali — dan itu bukan yang dijanjikan voucher. */
    var potOngkir = Math.min(Math.max(0, opsi.potonganOngkir || 0), ongkirKotor);
    var ongkirBersih = ongkirKotor - potOngkir;

    var sebelumPoin = after + ppnRp + ongkirBersih + (tambahan || 0);
    var poinRp = Math.min(Math.max(0, opsi.poinRupiah || 0), sebelumPoin);

    return {
      subtotal: subtotal, ppnRp: ppnRp, tambahan: tambahan || 0,
      ongkir: ongkirKotor, potonganOngkir: potOngkir, ongkirBersih: ongkirBersih,
      poinRupiah: poinRp,
      total: Math.round(sebelumPoin - poinRp)
    };
  }

  /** Cek ketersediaan stok untuk sekumpulan item. */
  function cekStok(items) {
    var kurang = [];
    (items || []).forEach(function (i) {
      var p = produk(i.productId);
      if (!p) return;
      /* Barang bervarian punya stok per varian. Memeriksa stok produk —
         yang merupakan JUMLAH seluruh varian — akan meloloskan pesanan 10
         merah padahal yang ada 2 merah dan 8 biru. */
      var ada = (window.VARIAN && i.varianId) ? VARIAN.stok(p, i.varianId) : p.stok;
      if (ada < i.qty) {
        kurang.push({ produk: p, varianId: i.varianId || null,
          varianLabel: (window.VARIAN && i.varianId) ? VARIAN.label(p, i.varianId) : '',
          diminta: i.qty, tersedia: ada });
      }
    });
    return kurang;
  }

  function ubahStok(productId, delta, alasan, varianId) {
    var p = produk(productId);
    if (!p) return;
    /* Varian menyimpan stoknya sendiri dan menyelaraskan stok produk
       sesudahnya, jadi jalur di bawah tidak boleh ikut jalan — kalau ikut,
       stoknya berkurang dua kali. */
    if (window.VARIAN && varianId && VARIAN.ubahStok(productId, varianId, delta)) {
      if (alasan) DB.log('u_admin', alasan + ' — ' + p.nama + ' (' +
        VARIAN.label(p, varianId) + ', ' + (delta > 0 ? '+' : '') + delta + ')',
        'product', productId);
      return;
    }
    DB.update('products', productId, { stok: Math.max(0, (p.stok || 0) + delta) });
    if (alasan) DB.log('u_admin', alasan + ' — ' + p.nama + ' (' + (delta > 0 ? '+' : '') + delta + ')',
      'product', productId);
  }

  /** Klien membuat pesanan toko. */
  function buatPesananToko(clientId, data) {
    /* Layanan tambahan dibekukan bersama pesanan: harganya berasal dari
       setelan yang boleh diubah admin kapan saja, dan yang mengikat adalah
       yang disepakati saat pesanan dibuat. */
    var tambahan = data.tambahan || [];
    var biayaTambahan = U.sum(tambahan, function (x) { return x.biaya || 0; });
    var h = hitungToko(data.items, data.ongkir, data.ppn, data.diskon, biayaTambahan, {
      potonganOngkir: data.potonganOngkir || 0,
      poinRupiah: data.poinRupiah || 0
    });
    var so = DB.insert('shopOrders', {
      no: U.docNo('TKO', DB.nextNo('shop')), clientId: clientId, status: 'baru',
      items: data.items, ongkir: data.ongkir || 0, ppn: data.ppn || 0, diskon: data.diskon || 0,
      subtotal: h.subtotal, total: h.total,
      tambahan: tambahan, biayaTambahan: biayaTambahan,
      alamatKirim: data.alamatKirim, metodeBayar: data.metodeBayar,
      channelId: data.channelId || null, catatan: data.catatan || '',
      /* marketplace: null = Toko Resmi EXOCLEAN. groupId menyatukan beberapa
         pesanan yang lahir dari satu keranjang belanja. */
      sellerId: data.sellerId || null, groupId: data.groupId || null,
      bebanSeller: data.bebanSeller || 0, bebanExoclean: data.bebanExoclean || 0,
      biayaKurir: data.biayaKurir !== undefined ? data.biayaKurir : null,
      /* Pengiriman: pilihan kurir dan titik tujuan dibekukan bersama pesanan.
         Tarif kurir dan alamat pembeli sama-sama bisa berubah setelahnya;
         yang berlaku adalah yang disepakati saat pesanan dibuat. */
      kurirPilihan: data.kurirPilihan || null,
      alamatKirimData: data.alamatKirimData || null,
      biteshipOrderId: null, kirimStatus: null,
      /* Voucher poin yang dipakai pada pesanan ini, beserta potongannya —
         dibekukan supaya nilainya tetap terbaca meski katalog poin berubah. */
      voucher: data.voucher || null,
      /* Insentif dibekukan bersama pesanan: berapa poin yang dipakai, berapa
       rupiah nilainya saat itu, dan voucher ongkir mana yang menutup
       ongkirnya. Nilai tukar poin boleh diubah admin kapan saja — yang
       mengikat adalah angka yang berlaku ketika pesanan dibuat. */
      poinDipakai: data.poinDipakai || 0,
      poinRupiah: data.poinRupiah || 0,
      voucherOngkir: data.voucherOngkir || null,
      potonganOngkir: data.potonganOngkir || 0
    });
    /* Poin dipotong SETELAH pesanannya ada. Memotong lebih dulu berarti
       poin bisa hilang untuk pesanan yang ternyata gagal terbentuk. */
    if (window.INSENTIF && data.poinDipakai) {
      try {
        INSENTIF.potongPoin(clientId, data.poinDipakai, { tipe: 'shop', id: so.id },
          I18N.t('Dipakai pada pesanan') + ' ' + so.no);
      } catch (e) {
        /* Saldo berubah di antara layar checkout dan penyimpanan — pesanannya
           tetap sah, tetapi tanpa potongan poin. Dicatat supaya selisihnya
           bisa ditelusuri, bukan didiamkan. */
        DB.update('shopOrders', so.id, { poinDipakai: 0, poinRupiah: 0,
          total: hitungToko(data.items, data.ongkir, data.ppn, data.diskon, biayaTambahan,
            { potonganOngkir: data.potonganOngkir || 0, poinRupiah: 0 }).total });
        DB.log(clientId, 'Poin tidak jadi dipakai pada ' + so.no + ' — ' + e.message,
          'shop', so.id);
      }
    }
    DB.log(clientId, 'Membuat pesanan toko ' + so.no, 'shop', so.id);
    WA.enqueue('toko_pesanan_diterima', clientId, { shopOrderId: so.id }, { tipe: 'shop', id: so.id });

    /* Pemberitahuan ke pihak yang harus memproses: penjualnya bila pesanan
       milik mitra toko, admin bila milik Toko Resmi. */
    var penerima = so.sellerId ? DB.find('users', so.sellerId) : usersByRole('admin')[0];
    if (penerima) {
      var w = I18N.pesanUntuk(penerima.id);
      DB.insert('waOutbox', { to: penerima.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'shop', refId: so.id,
        pesan: '*' + w('PESANAN BARU') + '* 🛒\n\n' + so.no + ' — ' + klien(clientId) + '\n' +
               (so.items || []).map(function (i) {
                 return '• ' + produkNama(i.productId) + ' ×' + i.qty; }).join('\n') +
               '\n\n' + w('Total:') + ' ' + U.rp(so.total) + '\n' +
               w('Mohon segera cek stok & konfirmasi.') });
    }
    return so;
  }

  /**
   * Ubah status pesanan toko sekaligus efek sampingnya:
   * dikonfirmasi -> potong stok + terbitkan invoice, dibatalkan -> kembalikan stok.
   */
  function ubahStatusToko(shopOrderId, status, extra) {
    var so = pesananToko(shopOrderId);
    if (!so) return null;
    var sebelum = so.status;
    var patch = Object.assign({ status: status }, extra || {});

    if (status === 'dikonfirmasi' && sebelum === 'baru') {
      (so.items || []).forEach(function (i) {
        ubahStok(i.productId, -i.qty, I18N.t('Stok keluar pesanan') + ' ' + so.no, i.varianId); });
      patch.dikonfirmasiAt = U.nowISO();
      WA.enqueue('toko_dikonfirmasi', so.clientId, { shopOrderId: shopOrderId }, { tipe: 'shop', id: shopOrderId });
    }
    if (status === 'dikirim') {
      patch.dikirimAt = U.nowISO();
      WA.enqueue('toko_dikirim', so.clientId, { shopOrderId: shopOrderId }, { tipe: 'shop', id: shopOrderId });
    }
    if (status === 'selesai') {
      patch.selesaiAt = U.nowISO();
      WA.enqueue('toko_selesai', so.clientId, { shopOrderId: shopOrderId }, { tipe: 'shop', id: shopOrderId });
      /* Barang sudah di tangan pembeli — baru di sini komisi afiliasi terhitung
         dan masa tahan margin dropship mulai berjalan. */
      if (window.AFILIASI) {
        AFILIASI.catatKomisi(so.clientId, 'produk', so.subtotal || 0,
          { tipe: 'shop', id: so.id, judul: I18N.t('Pesanan') + ' ' + so.no });
      }
      if (window.POIN) {
        POIN.beri(so.clientId, 'belanjaToko',
          { tipe: 'shop', id: so.id }, so.subtotal || 0, 'Pesanan ' + so.no + ' selesai');
        /* Cashback dihitung dari SUBTOTAL BARANG, bukan total tagihan:
           ongkir diteruskan ke kurir dan bukan pendapatan yang bisa
           dibagi kembali. */
        if (window.INSENTIF) {
          INSENTIF.bayarCashback(so.clientId, 'toko', so.subtotal || 0,
            { tipe: 'shop', id: so.id });
        }
      }
      if (window.DROPSHIP) DROPSHIP.pesananDiterima(shopOrderId);
    }
    if (status === 'dibatalkan') {
      if (['dikonfirmasi', 'dikemas', 'dikirim'].indexOf(sebelum) >= 0) {
        (so.items || []).forEach(function (i) {
          ubahStok(i.productId, i.qty, I18N.t('Stok dikembalikan (batal') + ' ' + so.no + ')', i.varianId); });
        /* Pesanan batal menarik kembali komisi & margin yang sudah terbit. */
        if (window.AFILIASI) AFILIASI.batalkan('shop', shopOrderId, I18N.t('Pesanan dibatalkan'));
        if (window.DROPSHIP) DROPSHIP.batalkan(shopOrderId, I18N.t('Pesanan dibatalkan'));
      }
      patch.dibatalkanAt = U.nowISO();
      /* Voucher dikembalikan dari status APA PUN, bukan hanya setelah pesanan
         dikonfirmasi: pesanan yang batal saat masih 'baru' pun sudah terlanjur
         memakan vouchernya. Membiarkannya hangus sama saja menyita poin orang
         tanpa memberi apa pun sebagai gantinya. */
      /* Poin yang dipakai membayar ikut dikembalikan, dengan alasan yang
         sama persis seperti voucher: pesanan yang batal tidak boleh
         menyisakan pelanggan kehilangan alat bayarnya. */
      if (window.INSENTIF && so.poinDipakai) {
        INSENTIF.kembalikanPoin(so.clientId, so.poinDipakai, { tipe: 'shop', id: shopOrderId });
      }
      if (window.VOUCHER && so.voucher) {
        var kembali = VOUCHER.kembalikan({ tipe: 'shop', id: shopOrderId });
        if (kembali) DB.log(so.clientId, 'poin.voucherKembali', 'shop', shopOrderId,
          so.voucher.no + ' dikembalikan — pesanan batal');
      }
    }

    DB.update('shopOrders', shopOrderId, patch);
    if (status === 'dikonfirmasi' && !invoiceToko(shopOrderId)) terbitkanInvoiceToko(shopOrderId);
    DB.log('u_admin', 'Pesanan toko ' + so.no + ' → ' + status, 'shop', shopOrderId);
    return DB.find('shopOrders', shopOrderId);
  }

  function invoiceToko(shopOrderId) {
    var r = DB.where('invoices', { shopOrderId: shopOrderId });
    return r.length ? r[0] : null;
  }

  function terbitkanInvoiceToko(shopOrderId, tempoHari) {
    var so = pesananToko(shopOrderId);
    var inv = DB.insert('invoices', {
      no: U.docNo18(DB.nextNo('invoice')), orderId: null, shopOrderId: shopOrderId, clientId: so.clientId,
      subtotal: so.subtotal, diskon: so.diskon || 0, ppn: so.ppn || 0, ongkir: so.ongkir || 0,
      total: so.total, jatuhTempo: U.iso(U.addDays(new Date(), tempoHari || 7)),
      status: 'belum', payments: [], terbitAt: U.nowISO()
    });
    DB.log('u_admin', 'Menerbitkan invoice toko ' + inv.no, 'invoice', inv.id);
    return inv;
  }

  /** Sumber sebuah invoice: pekerjaan jasa atau pesanan toko. */
  function sumberInvoice(inv) {
    if (inv.shopOrderId) {
      var so = pesananToko(inv.shopOrderId);
      return { tipe: 'toko', no: so ? so.no : '—', judul: so
        ? 'Pembelian perlengkapan kebersihan (' + (so.items || []).length + ' ' + I18N.t('jenis barang)') : '—', ref: so };
    }
    var o = order(inv.orderId);
    return { tipe: 'jasa', no: o ? o.no : '—', judul: o ? o.judul : I18N.t('Pekerjaan cleaning service'), ref: o };
  }

  var ALUR_TOKO = ['baru', 'dikonfirmasi', 'dikemas', 'dikirim', 'selesai'];
  function statusBerikut(status) {
    var i = ALUR_TOKO.indexOf(status);
    return i >= 0 && i < ALUR_TOKO.length - 1 ? ALUR_TOKO[i + 1] : null;
  }

  /* ================================================================ RINGKASAN AKTIVITAS KLIEN */

  /**
   * Aktivitas belanja klien per bulan — dasarnya tanggal pemesanan, bukan
   * tanggal invoice, karena yang ingin dilihat klien adalah "kapan saya
   * memesan layanan / membeli produk".
   * @returns [{ key:'2026-03', label:'Mar', tahun, jasa, toko, total, nJasa, nToko }]
   */
  function ringkasanBulanan(clientId, nBulan) {
    nBulan = nBulan || 6;
    var bulan = [], indeks = {};
    var d = new Date(); d.setDate(1);
    for (var i = nBulan - 1; i >= 0; i--) {
      var x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var key = U.iso(x).slice(0, 7);
      var row = { key: key, label: U.BULAN_S[x.getMonth()], tahun: x.getFullYear(),
        jasa: 0, toko: 0, total: 0, nJasa: 0, nToko: 0 };
      indeks[key] = row; bulan.push(row);
    }

    DB.where('orders', { clientId: clientId }).forEach(function (o) {
      if (o.status === 'dibatalkan') return;
      var r = indeks[(o.tgl || '').slice(0, 7)];
      if (!r) return;
      r.jasa += o.nilai || 0; r.nJasa++;
    });
    DB.where('shopOrders', { clientId: clientId }).forEach(function (p) {
      if (p.status === 'dibatalkan') return;
      var r = indeks[U.iso(p.createdAt).slice(0, 7)];
      if (!r) return;
      r.toko += p.total || 0; r.nToko++;
    });
    bulan.forEach(function (r) { r.total = r.jasa + r.toko; });
    return bulan;
  }

  /** Layanan yang paling sering dipesan klien. */
  function layananTerbanyak(clientId, batas) {
    var hitung = {};
    DB.where('orders', { clientId: clientId }).forEach(function (o) {
      if (o.status === 'dibatalkan') return;
      var ids = o.serviceIds || [];
      if (!ids.length) return;
      var bagi = (o.nilai || 0) / ids.length;
      ids.forEach(function (sid) {
        hitung[sid] = hitung[sid] || { serviceId: sid, jumlah: 0, nilai: 0 };
        hitung[sid].jumlah++; hitung[sid].nilai += bagi;
      });
    });
    return U.sortBy(Object.keys(hitung).map(function (k) {
      var s = svc(k);
      return Object.assign({ nama: s ? s.nama : '—', icon: s ? s.icon : '•' }, hitung[k]);
    }), function (x) { return x.nilai; }, true).slice(0, batas || 5);
  }

  /** Produk toko yang paling banyak dibeli klien. */
  function produkTerbanyak(clientId, batas) {
    var hitung = {};
    DB.where('shopOrders', { clientId: clientId }).forEach(function (p) {
      if (p.status === 'dibatalkan') return;
      (p.items || []).forEach(function (i) {
        hitung[i.productId] = hitung[i.productId] || { productId: i.productId, qty: 0, nilai: 0 };
        hitung[i.productId].qty += i.qty;
        hitung[i.productId].nilai += i.qty * i.harga;
      });
    });
    return U.sortBy(Object.keys(hitung).map(function (k) {
      var pr = DB.find('products', k);
      return Object.assign({ nama: pr ? pr.nama : '—', icon: pr ? pr.icon : '📦',
        satuan: pr ? pr.satuan : '' }, hitung[k]);
    }), function (x) { return x.nilai; }, true).slice(0, batas || 5);
  }

  /* ================================================================ PROFIL PENGGUNA */

  /* ================================================================ DATA ORANG
     Alamat, rekening, identitas, kontak darurat, kelengkapan berkas, masa
     kerja, atasan, dan tim tinggal di js/pegawai.js. Tak satu pun dari
     semua itu urusan pasar — dan MCS EXOCLEAN memerlukan seluruhnya tanpa
     memerlukan katalog, order, atau toko.

     Yang tinggal di sini hanya penerusnya, supaya dua belas berkas yang
     sudah memanggil lewat BIZ tetap berjalan tanpa satu pun diubah. */
  var HUBUNGAN = PEGAWAI.HUBUNGAN;
  var JENIS_ID = PEGAWAI.JENIS_ID;
  var STATUS_KERJA = PEGAWAI.STATUS_KERJA;
  var STATUS_TINGGAL = PEGAWAI.STATUS_TINGGAL;
  function alamatList() { return PEGAWAI.alamatList.apply(null, arguments); }
  function alamatUtama() { return PEGAWAI.alamatUtama.apply(null, arguments); }
  function alamatTeks() { return PEGAWAI.alamatTeks.apply(null, arguments); }
  function simpanAlamat() { return PEGAWAI.simpanAlamat.apply(null, arguments); }
  function rekeningList() { return PEGAWAI.rekeningList.apply(null, arguments); }
  function rekeningUtama() { return PEGAWAI.rekeningUtama.apply(null, arguments); }
  function simpanRekening() { return PEGAWAI.simpanRekening.apply(null, arguments); }
  function jenisId() { return PEGAWAI.jenisId.apply(null, arguments); }
  function identitas() { return PEGAWAI.identitas.apply(null, arguments); }
  function simpanIdentitas() { return PEGAWAI.simpanIdentitas.apply(null, arguments); }
  function samarkanNomorId() { return PEGAWAI.samarkanNomorId.apply(null, arguments); }
  function periksaNomorId() { return PEGAWAI.periksaNomorId.apply(null, arguments); }
  function statusBerlakuId() { return PEGAWAI.statusBerlakuId.apply(null, arguments); }
  function kontakDarurat() { return PEGAWAI.kontakDarurat.apply(null, arguments); }
  function kontakDaruratUtama() { return PEGAWAI.kontakDaruratUtama.apply(null, arguments); }
  function simpanKontakDarurat() { return PEGAWAI.simpanKontakDarurat.apply(null, arguments); }
  function alamatTinggal() { return PEGAWAI.alamatTinggal.apply(null, arguments); }
  function simpanAlamatTinggal() { return PEGAWAI.simpanAlamatTinggal.apply(null, arguments); }
  function alamatTinggalTeks() { return PEGAWAI.alamatTinggalTeks.apply(null, arguments); }
  function kelengkapanBerkas() { return PEGAWAI.kelengkapanBerkas.apply(null, arguments); }
  function berkasBermasalah() { return PEGAWAI.berkasBermasalah.apply(null, arguments); }
  function bolehLihatBerkas() { return PEGAWAI.bolehLihatBerkas.apply(null, arguments); }
  function kepegawaian() { return PEGAWAI.kepegawaian.apply(null, arguments); }
  function simpanKepegawaian() { return PEGAWAI.simpanKepegawaian.apply(null, arguments); }
  function masaKerja() { return PEGAWAI.masaKerja.apply(null, arguments); }
  function kontrak() { return PEGAWAI.kontrak.apply(null, arguments); }
  function atasan() { return PEGAWAI.atasan.apply(null, arguments); }
  function timPegawai() { return PEGAWAI.timPegawai.apply(null, arguments); }
  function kelengkapanKepegawaian() { return PEGAWAI.kelengkapanKepegawaian.apply(null, arguments); }
  function kontrakSegeraHabis() { return PEGAWAI.kontrakSegeraHabis.apply(null, arguments); }
  function pegawaiLapangan() { return PEGAWAI.pegawaiLapangan.apply(null, arguments); }


  /**
   * Alamat utama sebagai satu baris teks — bentuk yang dipakai order, invoice,
   * dan label kurir.
   *
   * Alamat baru berbentuk TERSTRUKTUR (negara, provinsi, kota, kecamatan,
   * desa, kode pos). Alamat lama hanya punya satu kolom teks, dan keduanya
   * masih hidup berdampingan — data lama tidak boleh berubah bentuk hanya
   * karena bentuk barunya lebih rapi.
   */


  /**
   * Simpan daftar alamat sekaligus menyamakan field `alamat` (teks tunggal)
   * dengan alamat utama, karena seluruh aplikasi lama membaca field itu.
   */






  /**
   * Preferensi pengguna. Bahasa bawaannya mengikuti I18N — bukan ditulis
   * ulang di sini — supaya mengganti bahasa bawaan aplikasi cukup dilakukan
   * di satu tempat dan tidak menyisakan nilai lama yang bertentangan.
   */
  /* Preferensi, kata sandi, dan pencarian pengguna per peran tinggal di
     js/akun.js: ketiganya urusan AKUN, bukan urusan pasar, dan MCS EXOCLEAN
     memerlukannya tanpa memerlukan katalog, order, atau toko. Yang tinggal
     di sini hanya penerusnya, supaya seluruh pemanggil BIZ yang sudah ada
     tidak perlu ikut berubah. */
  function preferensi(u) { return AKUN.preferensi(u); }
  function simpanPreferensi(userId, patch) { return AKUN.simpanPreferensi(userId, patch); }

  /** Ubah kata sandi. Mengembalikan pesan kesalahan, atau null bila berhasil. */
  function gantiSandi(userId, lama, baru, ulang) {
    return AKUN.gantiSandi(userId, lama, baru, ulang);
  }

  /* ================================================================ DATA KEPEGAWAIAN
     Berkas identitas, kontak darurat, dan alamat domisili tenaga lapangan.
     Data ini hanya boleh dilihat oleh pemiliknya sendiri, admin, dan supervisor
     tim yang bersangkutan — lihat bolehLihatBerkas() di bawah. */








  /** Peran yang punya berkas kepegawaian. */


  /* Mitra hanya boleh ditugaskan setelah statusnya 'aktif' — yaitu setelah
     menyetujui S&K, melengkapi berkas, lulus seluruh kursus wajib, dan
     disetujui admin. Lihat LMS.langkahOnboarding(). */
  function statusMitra(u) { return (u && u.statusMitra) || 'onboarding'; }
  function mitraAktif() {
    return usersByRole('worker').filter(function (u) { return statusMitra(u) === 'aktif'; });
  }
  function mitraOnboarding() {
    return usersByRole('worker').filter(function (u) { return statusMitra(u) === 'onboarding'; });
  }
  function bolehDitugaskan(u) { return u && u.role === 'worker' && statusMitra(u) === 'aktif'; }

  /** Setujui pendaftaran mitra — dipanggil admin dari halaman Mitra. */
  function setujuiMitra(userId, adminId) {
    DB.update('users', userId, { statusMitra: 'aktif', disetujuiAt: U.nowISO(),
      disetujuiOleh: adminId, alasanTolak: null });
    DB.log(adminId, 'Menyetujui pendaftaran mitra ' + nama(userId), 'user', userId);
    return DB.find('users', userId);
  }
  function tolakMitra(userId, adminId, alasan) {
    DB.update('users', userId, { statusMitra: 'ditolak', alasanTolak: alasan || '', disetujuiAt: null });
    DB.log(adminId, 'Menolak pendaftaran mitra ' + nama(userId) + ' — ' + (alasan || ''), 'user', userId);
    return DB.find('users', userId);
  }
  function nonaktifkanMitra(userId, adminId, alasan) {
    DB.update('users', userId, { statusMitra: 'nonaktif', alasanTolak: alasan || '' });
    DB.log(adminId, 'Menonaktifkan mitra ' + nama(userId), 'user', userId);
    return DB.find('users', userId);
  }




  /** Tampilkan hanya 4 digit terakhir: 3271********0001 */


  /** Validasi ringan sesuai jenis kartu. Mengembalikan pesan kesalahan atau null. */


  /** Status masa berlaku: 'seumur_hidup' | 'aman' | 'segera' (≤60 hari) | 'kedaluwarsa'. */








  /** Alamat domisili sebagai satu baris teks. */


  /**
   * Kelengkapan berkas kepegawaian — dipakai admin untuk mengejar data yang
   * belum lengkap, dan ditampilkan ke petugas sebagai pengingat.
   */


  /** Daftar pegawai lapangan yang berkasnya belum lengkap atau identitasnya bermasalah. */


  /**
   * Siapa yang boleh melihat berkas identitas seseorang:
   * dirinya sendiri, admin, dan supervisor tim tempat orang itu berada.
   */


  /* ============================================== DATA KEPEGAWAIAN
     Bedanya dengan BERKAS kepegawaian: berkas berisi dokumen milik pegawai
     (KTP, kontak darurat, alamat tinggal) — pegawai yang mengisinya sendiri.
     DATA kepegawaian adalah keputusan perusahaan atas orang itu: nomor
     pegawai, tanggal masuk, status kerja, masa kontrak, nomor jaminan sosial.

     Karena itu yang boleh MENGUBAHNYA hanya admin. Pegawai melihatnya
     read-only. Membiarkan pegawai menyunting tanggal masuk atau status
     kerjanya sendiri berarti membiarkan masa kerja, pesangon, dan hak cuti
     ditentukan oleh pihak yang paling diuntungkan olehnya. */



  /** Ambang peringatan kontrak mendekati habis. */
  var HARI_INGAT_KONTRAK = 45;



  /**
   * Simpan data kepegawaian. HANYA admin.
   *
   * Pemeriksaan peran ada di sini, bukan cuma di tampilan: tombol yang
   * disembunyikan tidak menghentikan siapa pun yang memanggil fungsinya
   * langsung dari konsol peramban.
   */


  /** Masa kerja terhitung sejak tanggal masuk. */


  /**
   * Keadaan kontrak: null bila tidak berstatus kontrak.
   * sisaHari negatif berarti sudah lewat.
   */


  /** Supervisor / atasan langsung, dari data kepegawaian atau dari timnya. */




  /**
   * Kelengkapan DATA kepegawaian — terpisah dari kelengkapan BERKAS.
   * Nomor jaminan sosial tidak dihitung wajib untuk mitra lepas: mereka
   * memang tidak didaftarkan perusahaan, dan menandainya "kurang" hanya
   * membuat daftar tugas admin penuh oleh hal yang tidak perlu dikerjakan.
   */


  /** Pegawai yang kontraknya segera habis — dipakai pengingat admin. */


  /* ================================================================ STATUS KEMITRAAN
     Tenaga kerja lapangan adalah mitra yang mendaftar sendiri. Selama proses
     bergabung belum tuntas, mereka belum boleh ditugaskan ke pekerjaan. */

  var STATUS_MITRA = {
    onboarding: { t: 'Proses Bergabung', c: 'warn' },
    verifikasi: { t: 'Menunggu Persetujuan', c: 'info' },
    aktif:      { t: 'Mitra Aktif', c: 'ok' },
    ditolak:    { t: 'Ditolak', c: 'danger' },
    nonaktif:   { t: 'Nonaktif', c: 'muted' }
  };

  function statusMitra(u) { return (u && u.statusMitra) || 'onboarding'; }

  /** Mitra yang boleh ditugaskan ke order. */
  function bolehDitugaskan(u) { return !!u && u.role === 'worker' && statusMitra(u) === 'aktif' && u.aktif; }

  /** Seluruh mitra aktif — dipakai penjadwalan & bagi hasil. */
  function mitraAktif() { return DB.where('users', { role: 'worker' }).filter(bolehDitugaskan); }

  /** Mitra yang masih dalam proses bergabung. */
  function mitraOnboarding() {
    return DB.where('users', { role: 'worker' }).filter(function (u) {
      return ['onboarding', 'verifikasi'].indexOf(statusMitra(u)) >= 0; });
  }

  function setujuiMitra(userId, adminId) {
    DB.update('users', userId, { statusMitra: 'aktif', disetujuiAt: U.nowISO(),
      disetujuiOleh: adminId, alasanTolak: null });
    DB.log(adminId, 'Menyetujui mitra ' + nama(userId), 'user', userId);
    WA.enqueue('mitra_disetujui', userId, { userId: userId }, { tipe: 'user', id: userId });
    return DB.find('users', userId);
  }
  function tolakMitra(userId, adminId, alasan) {
    DB.update('users', userId, { statusMitra: 'ditolak', alasanTolak: alasan || '' });
    DB.log(adminId, 'Menolak pendaftaran mitra ' + nama(userId) + ' — ' + alasan, 'user', userId);
    WA.enqueue('mitra_ditolak', userId, { userId: userId }, { tipe: 'user', id: userId });
    return DB.find('users', userId);
  }
  function ajukanVerifikasi(userId) {
    DB.update('users', userId, { statusMitra: 'verifikasi', diajukanAt: U.nowISO() });
    var admin = usersByRole('admin')[0];
    if (admin) {
      var w = I18N.pesanUntuk(admin.id);
      DB.insert('waOutbox', { to: admin.id, template: 'manual', status: 'antre', sentAt: null,
        refType: 'user', refId: userId,
        pesan: '*' + w('PENDAFTARAN MITRA SIAP DIVERIFIKASI') + '* 🆔\n\n' +
          w('{nama} sudah menyelesaikan syarat & ketentuan, berkas, dan seluruh kursus wajib.')
            .replace('{nama}', nama(userId)) + '\n\n' +
          w('Mohon periksa berkas dan setujui di menu Mitra & Rekrutmen.') });
    }
    return DB.find('users', userId);
  }

  /* ================================================================ PROMO */

  function promoBerlaku(p) {
    if (!p.aktif) return false;
    if (p.berlakuDari && p.berlakuDari > U.today()) return false;
    if (p.berlakuHingga && p.berlakuHingga < U.today()) return false;
    if (p.kuota && p.terpakai >= p.kuota) return false;
    return true;
  }

  /** Promo/program yang relevan untuk satu pengguna, terbaru kedaluwarsa dulu. */
  function promoUntuk(u) {
    if (!u) return [];
    return U.sortBy(DB.all('promos').filter(function (p) {
      return promoBerlaku(p) && (p.untukRole || []).indexOf(u.role) >= 0;
    }), function (p) { return p.berlakuHingga; });
  }

  function promoSisaKuota(p) {
    if (!p.kuota) return null;
    return Math.max(0, p.kuota - (p.terpakai || 0));
  }

  /* ---------------------------------------------------------------- statistik */
  function statistik() {
    var orders = DB.all('orders'), invoices = DB.all('invoices'), hariIni = U.today();
    var bulanIni = hariIni.slice(0, 7);

    var pendapatanBulanIni = U.sum(invoices.filter(function (i) {
      return U.iso(i.terbitAt).slice(0, 7) === bulanIni;
    }), function (i) { return i.total; });

    var outstanding = U.sum(invoices.filter(function (i) {
      return i.status !== 'lunas';
    }), function (i) { return sisaTagihan(i); });

    var ratings = DB.all('ratings');
    return {
      orderHariIni: orders.filter(function (o) { return o.tgl === hariIni && o.status !== 'dibatalkan'; }),
      orderBerjalan: orders.filter(function (o) { return o.status === 'berjalan'; }),
      perluVerifikasi: orders.filter(function (o) { return o.status === 'selesai'; }),
      permintaanBaru: DB.where('bookings', { status: 'baru' }),
      penawaranMenunggu: DB.where('quotations', { status: 'terkirim' }),
      komplainAktif: DB.all('complaints').filter(function (c) { return c.status !== 'selesai'; }),
      pendapatanBulanIni: pendapatanBulanIni,
      outstanding: outstanding,
      jatuhTempo: invoices.filter(function (i) { return i.status === 'jatuh_tempo'; }),
      waAntre: DB.where('waOutbox', { status: 'antre' }),
      rataRating: ratings.length ? Math.round(U.sum(ratings, function (r) { return r.bintang; }) / ratings.length * 10) / 10 : 0,
      jumlahRating: ratings.length,
      totalKlien: usersByRole('client').length,
      totalPetugas: usersByRole('worker').length,
      pesananTokoBaru: DB.where('shopOrders', { status: 'baru' }),
      pesananTokoJalan: DB.all('shopOrders').filter(function (p) {
        return ['dikonfirmasi', 'dikemas', 'dikirim'].indexOf(p.status) >= 0; }),
      penjualanToko: U.sum(DB.all('shopOrders').filter(function (p) {
        return p.status !== 'dibatalkan' && U.iso(p.createdAt).slice(0, 7) === bulanIni;
      }), function (p) { return p.total; }),
      stokMenipis: stokMenipis()
    };
  }

  /** Order yang relevan untuk satu peran. */
  function ordersUntuk(u) {
    var all = DB.all('orders');
    if (u.role === 'client') return all.filter(function (o) { return o.clientId === u.id; });
    if (u.role === 'worker') return all.filter(function (o) { return (o.workerIds || []).indexOf(u.id) >= 0; });
    if (u.role === 'supervisor') {
      var tim = DB.where('teams', { supervisorId: u.id }).map(function (t) { return t.id; });
      return all.filter(function (o) { return o.supervisorId === u.id || tim.indexOf(o.teamId) >= 0; });
    }
    return all;
  }

  return {
    user: user, nama: nama, usersByRole: usersByRole, svc: svc, svcNama: svcNama, klien: klien,
    order: order, team: team, ordersUntuk: ordersUntuk,
    progresChecklist: progresChecklist, absensi: absensi, statusAbsen: statusAbsen, jamAbsen: jamAbsen,
    laporan: laporan, qcOrder: qcOrder, invoiceOrder: invoiceOrder, ratingOrder: ratingOrder,
    komplainOrder: komplainOrder,
    subtotalQuotation: subtotalQuotation, totalQuotation: totalQuotation,
    terbayar: terbayar, sisaTagihan: sisaTagihan, hitungStatusInvoice: hitungStatusInvoice,
    segarkanInvoice: segarkanInvoice,
    estimasi: estimasi, teksEstimasi: teksEstimasi,
    ringkasanBulanan: ringkasanBulanan, layananTerbanyak: layananTerbanyak,
    produkTerbanyak: produkTerbanyak,
    buatBooking: buatBooking, buatQuotation: buatQuotation, kirimQuotation: kirimQuotation,
    responQuotation: responQuotation,
    checklistDari: checklistDari, buatOrder: buatOrder, notifJadwal: notifJadwal, tugaskan: tugaskan,
    bentrok: bentrok, checkIn: checkIn, checkOut: checkOut, laporSelesai: laporSelesai,
    verifikasiQC: verifikasiQC, rataQC: rataQC,
    terbitkanInvoice: terbitkanInvoice, catatPembayaran: catatPembayaran,
    beriRating: beriRating, ajukanKomplain: ajukanKomplain,
    statistik: statistik,
    /* toko */
    produk: produk, produkNama: produkNama, pesananToko: pesananToko, stokMenipis: stokMenipis,
    hitungToko: hitungToko, cekStok: cekStok, ubahStok: ubahStok,
    buatPesananToko: buatPesananToko, ubahStatusToko: ubahStatusToko,
    invoiceToko: invoiceToko, terbitkanInvoiceToko: terbitkanInvoiceToko,
    sumberInvoice: sumberInvoice, ALUR_TOKO: ALUR_TOKO, statusBerikut: statusBerikut,
    /* profil & promo */
    alamatList: alamatList, alamatUtama: alamatUtama, alamatTeks: alamatTeks, simpanAlamat: simpanAlamat,
    rekeningList: rekeningList, rekeningUtama: rekeningUtama, simpanRekening: simpanRekening,
    preferensi: preferensi, simpanPreferensi: simpanPreferensi, gantiSandi: gantiSandi,
    /* berkas kepegawaian */
    JENIS_ID: JENIS_ID, jenisId: jenisId, HUBUNGAN: HUBUNGAN, STATUS_TINGGAL: STATUS_TINGGAL,
    pegawaiLapangan: pegawaiLapangan, identitas: identitas, simpanIdentitas: simpanIdentitas,
    statusMitra: statusMitra, mitraAktif: mitraAktif, mitraOnboarding: mitraOnboarding,
    bolehDitugaskan: bolehDitugaskan, setujuiMitra: setujuiMitra, tolakMitra: tolakMitra,
    nonaktifkanMitra: nonaktifkanMitra,
    samarkanNomorId: samarkanNomorId, periksaNomorId: periksaNomorId, statusBerlakuId: statusBerlakuId,
    kontakDarurat: kontakDarurat, kontakDaruratUtama: kontakDaruratUtama,
    simpanKontakDarurat: simpanKontakDarurat,
    alamatTinggal: alamatTinggal, simpanAlamatTinggal: simpanAlamatTinggal,
    alamatTinggalTeks: alamatTinggalTeks, kelengkapanBerkas: kelengkapanBerkas,
    berkasBermasalah: berkasBermasalah, bolehLihatBerkas: bolehLihatBerkas,
    STATUS_KERJA: STATUS_KERJA, HARI_INGAT_KONTRAK: HARI_INGAT_KONTRAK,
    kepegawaian: kepegawaian, simpanKepegawaian: simpanKepegawaian,
    masaKerja: masaKerja, kontrak: kontrak, atasan: atasan, timPegawai: timPegawai,
    kelengkapanKepegawaian: kelengkapanKepegawaian, kontrakSegeraHabis: kontrakSegeraHabis,
    /* kemitraan */
    STATUS_MITRA: STATUS_MITRA, statusMitra: statusMitra, bolehDitugaskan: bolehDitugaskan,
    mitraAktif: mitraAktif, mitraOnboarding: mitraOnboarding,
    setujuiMitra: setujuiMitra, tolakMitra: tolakMitra, ajukanVerifikasi: ajukanVerifikasi,
    promoBerlaku: promoBerlaku, promoUntuk: promoUntuk, promoSisaKuota: promoSisaKuota
  };
})();
