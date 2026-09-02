/* ==========================================================================
   email.js — pengiriman dokumen ke email klien
   --------------------------------------------------------------------------
   TIGA KEADAAN, SAMA SEPERTI INTEGRASI LAIN DI APLIKASI INI

     simulasi — surat disusun dan masuk kotak keluar, tetapi tidak dikirim
                ke mana pun. Isinya bisa dibaca dan diperiksa.
     live     — surat dikirim lewat mail-server, yang memegang kunci penyedia.
     cadangan — mail-server tidak menjawab; surat tetap tersimpan berstatus
                gagal supaya bisa dicoba lagi, bukan hilang tanpa jejak.

   KOTAK KELUAR, BUKAN "KIRIM DAN LUPAKAN"

   Setiap surat dicatat sebelum dikirim, persis seperti WhatsApp. Alasannya
   sama: klien akan berkata "saya tidak menerima apa-apa", dan jawaban yang
   berguna bukan "seharusnya terkirim" melainkan "terkirim pukul sekian ke
   alamat ini, ini isinya". Surat yang gagal tetap ada di kotak keluar dengan
   sebab kegagalannya — bukan lenyap.

   SATU SURAT PER PERISTIWA, BUKAN PER KLIK

   `kunci` membuat pengiriman berulang untuk peristiwa yang sama tidak
   menghasilkan surat kedua. Tanpa itu, admin yang menekan tombol dua kali —
   atau penjadwal yang berjalan dua kali — mengirimkan invoice yang sama
   berkali-kali, dan klien membaca itu sebagai penagihan yang mendesak.
   ========================================================================== */
var EMAIL = (function () {
  'use strict';

  var BAWAAN = {
    mode: 'simulasi',              /* simulasi | live */
    backendUrl: '',                /* mis. http://localhost:4400 */
    token: '',                     /* disamakan dengan MAIL_TOKEN di .env */
    dariNama: 'EXOCLEAN',
    balasKe: '',
    /* Salinan ke tim sendiri. Berguna saat menagih: yang menagih perlu tahu
       persis apa yang dibaca klien. */
    salinanKe: ''
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.email) { s.email = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.email;
    Object.keys(BAWAAN).forEach(function (k) { if (c[k] === undefined) c[k] = BAWAAN[k]; });
    return c;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }
  function modeSimulasi() { return config().mode !== 'live' || !config().backendUrl; }

  /** Siap dipakai sungguhan: mode live, alamat server ada, token ada. */
  function siap() {
    var c = config();
    return c.mode === 'live' && !!c.backendUrl && !!c.token;
  }

  /* ============================================================ KOTAK KELUAR */

  function antre(opsi) {
    /* opsi = { ke, nama, subjek, html, teks, jenis, refType, refId, kunci } */
    if (opsi.kunci) {
      var kembar = DB.where('emailOutbox', { kunci: opsi.kunci })[0];
      if (kembar) return kembar;
    }
    return DB.insert('emailOutbox', {
      ke: opsi.ke, nama: opsi.nama || '', subjek: opsi.subjek,
      html: opsi.html || '', teks: opsi.teks || '',
      jenis: opsi.jenis || 'umum',
      refType: opsi.refType || null, refId: opsi.refId || null,
      kunci: opsi.kunci || null,
      status: 'antre', sentAt: null, galat: null, via: null
    });
  }

  function daftar(saring) {
    var list = saring ? DB.where('emailOutbox', saring) : DB.all('emailOutbox');
    return U.sortBy(list, function (m) { return m.createdAt || ''; }, true);
  }
  function jumlahAntre() { return DB.where('emailOutbox', { status: 'antre' }).length; }

  /**
   * Kirim satu surat dari kotak keluar.
   *
   * Mengembalikan Promise. Dalam mode simulasi ia langsung menandai terkirim
   * dan MENGATAKAN bahwa itu simulasi — surat yang ditandai terkirim padahal
   * tidak pernah dikirim adalah kebohongan yang baru ketahuan saat klien
   * menagih haknya.
   */
  function kirim(id) {
    var m = DB.find('emailOutbox', id);
    if (!m) return Promise.reject(new Error(I18N.t('Surat tidak ditemukan.')));
    if (m.status === 'terkirim') return Promise.resolve(m);

    var c = config();

    if (modeSimulasi()) {
      DB.update('emailOutbox', id, { status: 'simulasi', sentAt: U.nowISO(), via: 'simulasi' });
      return Promise.resolve(DB.find('emailOutbox', id));
    }

    return fetch(String(c.backendUrl).replace(/\/+$/, '') + '/api/mail/kirim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mail-Token': c.token },
      body: JSON.stringify({
        ke: m.ke, nama: m.nama, subjek: m.subjek, html: m.html, teks: m.teks,
        jenis: m.jenis, ref: m.refId
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok) throw new Error(j.pesan || ('Server email menolak (' + r.status + ')'));
        DB.update('emailOutbox', id, {
          status: 'terkirim', sentAt: U.nowISO(), via: j.via || 'live', galat: null });
        return DB.find('emailOutbox', id);
      });
    }).catch(function (e) {
      /* Gagal TIDAK menghapus suratnya. Yang gagal hari ini dicoba lagi
         besok, dan yang menagih perlu tahu bahwa surat itu belum sampai. */
      DB.update('emailOutbox', id, { status: 'gagal', galat: e.message });
      throw e;
    });
  }

  /** Antre lalu langsung kirim. Kembaran dicegah lewat `kunci`. */
  function kirimLangsung(opsi) {
    var m = antre(opsi);
    if (m.status === 'terkirim' || m.status === 'simulasi') return Promise.resolve(m);
    return kirim(m.id);
  }

  function ujiKoneksi() {
    var c = config();
    if (!c.backendUrl) return Promise.reject(new Error(I18N.t('Alamat server email belum diisi.')));
    return fetch(String(c.backendUrl).replace(/\/+$/, '') + '/api/mail/health')
      .then(function (r) { return r.json(); });
  }

  /* ================================================================ SURAT
     Surat ditulis sebagai HTML sederhana dengan gaya sebaris. Klien email
     membuang <style> di kepala, tidak mengenal variabel CSS, dan sebagian
     memotong kelas — jadi yang bertahan hanyalah atribut style langsung.
     Ini bukan kemalasan; ini satu-satunya cara yang tampil sama di Gmail,
     Outlook, dan aplikasi bawaan ponsel. */

  var WARNA = { ink: '#0F172A', muted: '#64748B', brand: '#0F766E', garis: '#E2E8F0' };

  function rupiah(n) { return U.rp(n || 0); }

  function bingkai(judul, isi, kaki) {
    return '<div style="background:#F1F5F9;padding:24px 0;font-family:Arial,Helvetica,sans-serif">' +
      '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;' +
        'border:1px solid ' + WARNA.garis + '">' +
        '<div style="background:' + WARNA.brand + ';color:#fff;padding:18px 24px">' +
          '<div style="font-size:18px;font-weight:bold;letter-spacing:.5px">EXOCLEAN</div>' +
          '<div style="font-size:12px;opacity:.85">' + U.esc(judul) + '</div>' +
        '</div>' +
        '<div style="padding:24px;color:' + WARNA.ink + ';font-size:14px;line-height:1.6">' + isi + '</div>' +
        '<div style="padding:16px 24px;border-top:1px solid ' + WARNA.garis + ';' +
          'color:' + WARNA.muted + ';font-size:11.5px;line-height:1.5">' + (kaki || '') + '</div>' +
      '</div></div>';
  }

  function tabelBaris(kiri, kanan, tebal) {
    return '<tr>' +
      '<td style="padding:6px 0;color:' + (tebal ? WARNA.ink : WARNA.muted) + '">' + kiri + '</td>' +
      '<td style="padding:6px 0;text-align:right;' +
        (tebal ? 'font-weight:bold;font-size:16px;color:' + WARNA.ink : 'color:' + WARNA.ink) + '">' +
        kanan + '</td></tr>';
  }

  /**
   * Surat invoice — tata letaknya sama dengan dokumen di aplikasi.
   *
   * Klien yang membuka email lalu membuka aplikasi harus melihat dokumen yang
   * SAMA. Dua bentuk berbeda untuk satu tagihan membuat orang bertanya mana
   * yang benar, dan pertanyaan itu selalu berakhir di tim Anda.
   *
   * `alasan`: 'terbit' membuka dengan ucapan terima kasih, 'pengingat'
   * membuka dengan tanggal jatuh temponya.
   */
  function suratInvoice(inv, alasan) {
    var klien = DB.find('users', inv.clientId) || {};
    /* Bahasa surat = bahasa PEMBACANYA, bukan bahasa layar orang yang menekan
       Kirim. Berkas ini sebelumnya setengah dibungkus I18N.t() — sebagian
       label diterjemahkan mengikuti layar pengirim sementara sebagian lagi
       tidak diterjemahkan sama sekali, sehingga satu tabel yang sama bisa
       memuat “SUBTOTAL PRODUCT PRICE” tepat di atas “Diskon”. Setengah benar
       pada surat yang keluar dari aplikasi lebih buruk daripada tidak
       diterjemahkan sama sekali: yang pertama terlihat seperti kerusakan,
       yang kedua sekadar berbahasa asing. */
    var w = I18N.pesanUntuk(klien.id || null);
    var src = BIZ.sumberInvoice(inv);
    var so = src.tipe === 'toko' ? src.ref : null;
    var afterDisc = inv.subtotal - (inv.diskon || 0);
    var ppnRp = Math.round(afterDisc * ((inv.ppn || 0) / 100));
    var bayar = BIZ.terbayar ? BIZ.terbayar(inv) : 0;
    var sisa = BIZ.sisaTagihan ? BIZ.sisaTagihan(inv) : inv.total;
    var jatuh = U.tgl(inv.jatuhTempo, w.kode);

    var penjual = 'PT EXOCLEAN Indonesia';
    if (so && so.sellerId) {
      var us = DB.find('users', so.sellerId);
      var tk = us && window.SELLER ? SELLER.toko(us) : null;
      if (tk && tk.nama) penjual = tk.nama;
    }

    var ak = so && so.alamatKirimData ? so.alamatKirimData : null;
    var alamatTeks = ak ? [ak.alamat, ak.kota, ak.kodePos].filter(Boolean).join(', ')
                        : (so ? so.alamatKirim : (klien.alamat || ''));

    /* --- baris barang --- */
    function td(isi, gaya) {
      return '<td style="padding:9px 8px;border-bottom:1px solid ' + WARNA.garis + ';' +
        'font-size:13px;vertical-align:top;' + (gaya || '') + '">' + isi + '</td>';
    }
    var baris = so
      ? (so.items || []).map(function (i) {
          var p = BIZ.produk(i.productId);
          var ket = [];
          if (i.varianLabel) ket.push(U.esc(i.varianLabel));
          if (p && window.KIRIM) {
            var g = KIRIM.beratProduk(p) * (i.qty || 1);
            if (g) ket.push(w('Berat') + ': ' + KIRIM.teksBerat(g));
          }
          return '<tr>' +
            td('<b>' + U.esc(p ? p.nama : '—') + '</b>' +
               (ket.length ? '<div style="color:' + WARNA.muted + ';font-size:11.5px">' +
                 ket.join(' &middot; ') + '</div>' : '')) +
            td(U.num(i.qty), 'text-align:center;white-space:nowrap') +
            td(rupiah(i.harga), 'text-align:right;white-space:nowrap') +
            td('<b>' + rupiah(i.qty * i.harga) + '</b>', 'text-align:right;white-space:nowrap') +
          '</tr>';
        }).join('')
      : '<tr>' +
          td('<b>' + U.esc(src.judul) + '</b>' +
             '<div style="color:' + WARNA.muted + ';font-size:11.5px">' + U.esc(src.no) + '</div>') +
          td('1', 'text-align:center') +
          td(rupiah(inv.subtotal), 'text-align:right;white-space:nowrap') +
          td('<b>' + rupiah(inv.subtotal) + '</b>', 'text-align:right;white-space:nowrap') +
        '</tr>';

    function rinci(label, nilai, opsi) {
      opsi = opsi || {};
      return '<tr>' +
        '<td colspan="3" style="padding:5px 8px;text-align:right;font-size:13px;' +
          (opsi.tebal ? 'font-weight:bold;color:' + WARNA.ink + ';padding-top:9px;border-top:1px solid ' + WARNA.garis
                      : 'color:' + WARNA.muted) + '">' + label + '</td>' +
        '<td style="padding:5px 8px;text-align:right;white-space:nowrap;' +
          (opsi.tebal ? 'font-weight:bold;font-size:16px;padding-top:9px;border-top:1px solid ' + WARNA.garis + ';'
                      : '') +
          (opsi.kurang ? 'color:#DC2626' : 'color:' + WARNA.ink) + '">' +
          (opsi.kurang ? '&minus;' : '') + rupiah(Math.abs(nilai)) + '</td></tr>';
    }

    var rincian =
      rinci(so ? w('SUBTOTAL HARGA PRODUK') : w('SUBTOTAL PEKERJAAN'), inv.subtotal) +
      (inv.diskon ? rinci(w('Diskon'), inv.diskon, { kurang: true }) : '') +
      (inv.ongkir ? rinci(w('Total ongkos kirim'), inv.ongkir) : '') +
      (so && so.potonganOngkir
        ? rinci(U.esc((so.voucherOngkir && so.voucherOngkir.nama) || w('Voucher ongkir')),
            so.potonganOngkir, { kurang: true }) : '') +
      (inv.biayaTambahan ? rinci(w('Layanan tambahan'), inv.biayaTambahan) : '') +
      (inv.ppn ? rinci(w('Ppn') + ' ' + inv.ppn + '%', ppnRp) : '') +
      (so && so.poinRupiah
        ? rinci(U.num(so.poinDipakai) + ' ' + (window.POIN ? POIN.nama() : w('poin')) + ' ' + w('dipakai'),
            so.poinRupiah, { kurang: true }) : '') +
      rinci(w('TOTAL TAGIHAN'), inv.total, { tebal: true }) +
      (bayar ? rinci(w('Sudah dibayar'), bayar, { kurang: true }) +
               rinci(w('SISA TAGIHAN'), sisa, { tebal: true }) : '');

    var kepala = alasan === 'pengingat'
      ? '<p style="margin:0 0 16px">' + w('Halo') + ' <b>' + U.esc(klien.nama || '') + '</b>, ' +
        w('ini pengingat untuk invoice yang jatuh temponya') + ' <b>' + jatuh + '</b>.</p>'
      : '<p style="margin:0 0 16px">' + w('Halo') + ' <b>' + U.esc(klien.nama || '') + '</b>, ' +
        w('terima kasih sudah mempercayakan pekerjaan ini kepada kami. Berikut invoicenya.') + '</p>';

    function pihak(kiri, kananLabel, kanan) {
      return '<tr>' +
        '<td style="padding:6px 0;width:50%;vertical-align:top">' +
          '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' +
            WARNA.muted + '">' + kiri.l + '</div><b>' + kiri.v + '</b></td>' +
        '<td style="padding:6px 0;width:50%;vertical-align:top">' +
          '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' +
            WARNA.muted + '">' + kananLabel + '</div><b>' + kanan + '</b></td></tr>';
    }

    var isi = kepala +

      '<table style="width:100%;border-collapse:collapse;font-size:13px;' +
        'border-bottom:1px solid ' + WARNA.garis + ';margin-bottom:4px">' +
        pihak({ l: w('Tanggal'), v: U.tgl(inv.terbitAt, w.kode) }, w('Jatuh tempo'), jatuh) +
        pihak({ l: w('Penjual'), v: U.esc(penjual) }, w('Pembeli'),
          U.esc(klien.perusahaan || klien.nama || '')) +
      '</table>' +

      (alamatTeks
        ? '<div style="padding:8px 0;border-bottom:1px solid ' + WARNA.garis + ';font-size:13px">' +
            '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' +
              WARNA.muted + '">' + (so ? w('Alamat pengiriman') : w('Alamat pembeli')) + '</div>' +
            U.esc(alamatTeks) +
          '</div>'
        : '') +

      '<div style="text-align:center;padding:16px 0 10px">' +
        '<div style="font-size:14px;font-weight:bold;letter-spacing:.18em">ORDER RECEIPT</div>' +
        '<div style="font-size:13px;color:' + WARNA.muted + ';margin-top:3px;' +
          'font-family:Consolas,Menlo,monospace">' + U.esc(inv.no) + '</div>' +
      '</div>' +

      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th style="padding:8px;text-align:left;font-size:10.5px;letter-spacing:.06em;' +
            'text-transform:uppercase;color:' + WARNA.muted + ';background:#F1F5F9;' +
            'border-bottom:1px solid ' + WARNA.garis + '">' +
            (so ? w('Info produk') : w('Uraian pekerjaan')) + '</th>' +
          '<th style="padding:8px;text-align:center;font-size:10.5px;letter-spacing:.06em;' +
            'text-transform:uppercase;color:' + WARNA.muted + ';background:#F1F5F9;' +
            'border-bottom:1px solid ' + WARNA.garis + '">' + w('Jumlah') + '</th>' +
          '<th style="padding:8px;text-align:right;font-size:10.5px;letter-spacing:.06em;' +
            'text-transform:uppercase;color:' + WARNA.muted + ';background:#F1F5F9;' +
            'border-bottom:1px solid ' + WARNA.garis + '">' + w('Harga satuan') + '</th>' +
          '<th style="padding:8px;text-align:right;font-size:10.5px;letter-spacing:.06em;' +
            'text-transform:uppercase;color:' + WARNA.muted + ';background:#F1F5F9;' +
            'border-bottom:1px solid ' + WARNA.garis + '">' + w('Total harga') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + baris + '</tbody>' +
        '<tfoot>' + rincian + '</tfoot>' +
      '</table>' +

      '<div style="margin-top:16px;padding:12px 14px;background:#F1F5F9;border-radius:8px;font-size:13px">' +
        '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' +
          WARNA.muted + '">' + w('Metode pembayaran') + '</div>' +
        '<b>' + U.esc((so && so.metodeBayar) || inv.metodeBayar || w('Transfer Bank')) + '</b>' +
        '<div style="color:' + WARNA.muted + ';margin-top:4px">' +
          w('Pembayaran bisa dilakukan lewat aplikasi EXOCLEAN pada menu Tagihan.') + '</div>' +
      '</div>';

    /* KUNCINYA 'Pengingat pembayaran invoice', BUKAN 'Pengingat pembayaran'.

       Yang kedua sudah dipakai sebagai judul kartu fitur di layar Surat
       Keluar — sebuah fitur yang mengirimkan banyak pengingat — dan
       diterjemahkan jamak: “Payment reminders”. Dipakai ulang di sini ia
       menghasilkan subjek surat “Payment reminders EXO/INV/2025/0019” untuk
       satu tagihan. Satu kata Indonesia dengan dua arti hanya bisa
       dipisahkan dengan kunci yang berbeda — persis catatan yang sudah ada
       di views/toko.js tentang 'Penawaran'. */
    return {
      subjek: (alasan === 'pengingat' ? w('Pengingat pembayaran invoice') : w('Order Receipt')) + ' ' +
              inv.no + ' — EXOCLEAN',
      html: bingkai(alasan === 'pengingat' ? w('Pengingat pembayaran invoice') : w('Order Receipt'), isi,
        w('*Biaya-biaya yang merupakan bagian dari tagihan ini, jika ada, sudah termasuk Pajak ' +
          'Pertambahan Nilai (Ppn) sesuai tarif yang berlaku. Dokumen ini berfungsi sebagai ' +
          'Bukti Pemesanan dan/atau Pembelian.')),
      teks: w('Order Receipt') + ' ' + inv.no + '\n' +
            w('Total tagihan') + ': ' + rupiah(inv.total) + '\n' +
            (bayar ? w('Sisa') + ': ' + rupiah(sisa) + '\n' : '') +
            w('Jatuh tempo') + ': ' + jatuh + '\n\n' +
            w('Buka aplikasi EXOCLEAN pada menu Tagihan untuk membayar.')
    };
  }

  /** Surat penawaran — sering diteruskan klien ke atasannya. */
  function suratPenawaran(q) {
    var klien = DB.find('users', q.clientId) || {};
    var w = I18N.pesanUntuk(klien.id || null);
    var isi =
      '<p style="margin:0 0 14px">' + w('Halo') + ' <b>' + U.esc(klien.nama || '') + '</b>, ' +
        w('berikut penawaran yang Anda minta. Silakan tinjau rinciannya di aplikasi EXOCLEAN — ' +
          'persetujuan dilakukan di sana supaya tercatat rapi untuk kedua pihak.') + '</p>' +
      '<div style="border:1px solid ' + WARNA.garis + ';border-radius:10px;padding:16px;margin:16px 0">' +
        '<div style="font-size:12px;color:' + WARNA.muted + '">' + w('Nomor penawaran') + '</div>' +
        '<div style="font-size:17px;font-weight:bold;margin-bottom:10px">' + U.esc(q.no) + '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
          tabelBaris(w('Nilai penawaran'), rupiah(q.total || q.nilai), true) +
          (q.berlakuHingga ? tabelBaris(w('Berlaku sampai'), U.tgl(q.berlakuHingga, w.kode)) : '') +
        '</table>' +
      '</div>' +
      '<p style="margin:0;color:' + WARNA.muted + '">' +
        w('Harga di atas berlaku sampai tanggal yang tertera. Setelah itu kami perlu menghitung ' +
          'ulang — bukan untuk menaikkan harga, melainkan karena biaya bahan dan tenaga memang ' +
          'berubah.') + '</p>';

    return {
      subjek: w('Penawaran harga') + ' ' + q.no + ' — EXOCLEAN',
      html: bingkai(w('Penawaran harga'), isi,
        w('Butuh penyesuaian? Balas surat ini. Kami lebih suka merevisi penawaran daripada ' +
          'mengerjakan sesuatu yang tidak sesuai harapan Anda.')),
      teks: w('Penawaran harga') + ' ' + q.no + '\n' + w('Nilai') + ': ' + rupiah(q.total || q.nilai) +
            '\n\n' + w('Buka aplikasi EXOCLEAN pada menu Penawaran untuk menyetujui.')
    };
  }

  /* ============================================================== PINTASAN */

  function alamatKlien(clientId) {
    var u = DB.find('users', clientId);
    return u && u.email ? { ke: u.email, nama: u.nama } : null;
  }

  /**
   * Kirim invoice ke email klien.
   * `alasan`: 'terbit' | 'pengingat'. `tahap` menandai pengingat ke berapa,
   * supaya pengingat H-3 dan H tidak dianggap surat yang sama.
   */
  function kirimInvoice(invoiceId, alasan, tahap) {
    var inv = DB.find('invoices', invoiceId);
    if (!inv) return Promise.reject(new Error(I18N.t('Invoice tidak ditemukan.')));
    var a = alamatKlien(inv.clientId);
    if (!a) return Promise.reject(new Error(I18N.t('Klien ini belum punya alamat email.')));
    var s = suratInvoice(inv, alasan);
    return kirimLangsung({
      ke: a.ke, nama: a.nama, subjek: s.subjek, html: s.html, teks: s.teks,
      jenis: alasan === 'pengingat' ? 'invoice_pengingat' : 'invoice_terbit',
      refType: 'invoice', refId: inv.id,
      kunci: 'inv:' + inv.id + ':' + (alasan || 'terbit') + (tahap ? ':' + tahap : '')
    });
  }

  function kirimPenawaran(quotationId) {
    var q = DB.find('quotations', quotationId);
    if (!q) return Promise.reject(new Error(I18N.t('Penawaran tidak ditemukan.')));
    var a = alamatKlien(q.clientId);
    if (!a) return Promise.reject(new Error(I18N.t('Klien ini belum punya alamat email.')));
    var s = suratPenawaran(q);
    return kirimLangsung({
      ke: a.ke, nama: a.nama, subjek: s.subjek, html: s.html, teks: s.teks,
      jenis: 'penawaran', refType: 'quotation', refId: q.id,
      /* Penawaran boleh dikirim ulang setelah direvisi, jadi kuncinya ikut
         nomor revisinya. */
      kunci: 'quo:' + q.id + ':' + (q.revisi || 0)
    });
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    modeSimulasi: modeSimulasi, siap: siap, ujiKoneksi: ujiKoneksi,
    antre: antre, kirim: kirim, kirimLangsung: kirimLangsung,
    daftar: daftar, jumlahAntre: jumlahAntre,
    suratInvoice: suratInvoice, suratPenawaran: suratPenawaran,
    kirimInvoice: kirimInvoice, kirimPenawaran: kirimPenawaran,
    alamatKlien: alamatKlien
  };
})();
