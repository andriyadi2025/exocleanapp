/* ==========================================================================
   views/shared.js — panel detail yang dipakai lebih dari satu peran
   (detail order, pratinjau penawaran, pratinjau invoice, pratinjau pesan WA)
   ========================================================================== */
var Panel = (function () {

  /* ---------------------------------------------------------------- order */
  function garisWaktu(o) {
    var qc = BIZ.qcOrder(o.id);
    var lang = [
      { k: 'dibuat', t: 'Order dibuat', s: U.tglJam(o.createdAt), done: true },
      /* Zona LOKASI KERJANYA, bukan zona yang membaca layar. Jam jadwal
         adalah waktu setempat di tempat pekerjaan itu dilakukan; admin di
         Jakarta yang membuka order Makassar harus melihat jam Makassar,
         karena itulah jam yang dilihat petugas di sana. */
      { k: 'jadwal', t: 'Dijadwalkan', s: U.tglPanjang(o.tgl) + ' • ' + o.mulai + '–' + o.selesai +
        (window.ZONA ? ZONA.labelJam(ZONA.dariWilayah(o.wilayah)) : ''), done: true },
      { k: 'mulai', t: 'Tim mulai bekerja', s: o.mulaiAktual ? U.tglJam(o.mulaiAktual) : I18N.t('Menunggu check-in petugas'),
        done: !!o.mulaiAktual, now: o.status === 'berjalan' },
      { k: 'selesai', t: I18N.t('Pekerjaan selesai'), s: o.selesaiAktual ? U.tglJam(o.selesaiAktual) : I18N.t('Belum dilaporkan'),
        done: !!o.selesaiAktual, now: o.status === 'selesai' },
      { k: 'qc', t: 'Verifikasi supervisor', s: qc ? (UI.statusText('qc', qc.hasil) + ' • ' + U.tglJam(qc.at)) : 'Menunggu verifikasi',
        done: !!qc, now: o.status === 'perbaikan' }
    ];
    return '<div class="timeline">' + lang.map(function (x) {
      return '<div class="tl-item ' + (x.done ? 'done' : '') + (x.now ? ' now' : '') + '">' +
        '<b>' + U.esc(x.t) + '</b><small>' + U.esc(x.s) + '</small></div>';
    }).join('') + '</div>';
  }

  function blokAbsensi(o) {
    if (!o.workerIds || !o.workerIds.length) return '<div class="tbl-sub">' + I18N.t('Belum ada petugas ditugaskan.') + '</div>';
    return '<div class="mini-list" style="margin:0 -18px">' + o.workerIds.map(function (wid) {
      var u = BIZ.user(wid) || { nama: '—' };
      var masuk = BIZ.jamAbsen(o.id, wid, 'in'), keluar = BIZ.jamAbsen(o.id, wid, 'out');
      var st = BIZ.statusAbsen(o.id, wid);
      var chip = st === 'out' ? '<span class="chip chip--ok">' + I18N.t('Selesai') + '</span>'
               : st === 'in' ? '<span class="chip chip--warn chip--dot">' + I18N.t('Di lokasi') + '</span>'
               : '<span class="chip chip--muted">' + I18N.t('Belum check-in') + '</span>';
      var jarak = masuk && o.koordinat && masuk.lat
        ? U.jarakMeter({ lat: masuk.lat, lng: masuk.lng }, o.koordinat) : null;
      return '<div class="mini-item">' + UI.avatar(u.nama, 'sm') +
        '<div style="min-width:0"><b>' + U.esc(u.nama) + '</b><small>' +
          (masuk ? 'Masuk ' + U.jam(masuk.at) : '—') +
          (keluar ? ' • Pulang ' + U.jam(keluar.at) + ' • ' + U.durasi(masuk.at, keluar.at) : '') +
          (jarak !== null ? ' • ' + jarak + ' ' + I18N.t('m dari titik lokasi') : '') +
        '</small></div>' +
        '<div class="right">' + chip +
          (masuk && masuk.lat ? '<div style="margin-top:4px"><a href="' + U.mapsLink(masuk.lat, masuk.lng) +
            '" target="_blank" rel="noopener" style="font-size:11px">' + I18N.t('Lihat peta ↗') + '</a></div>' : '') +
        '</div></div>';
    }).join('') + '</div>';
  }

  function blokChecklist(o) {
    var p = BIZ.progresChecklist(o);
    if (!p.total) return '<div class="tbl-sub">' + I18N.t('Tidak ada checklist untuk layanan ini.') + '</div>';
    var grup = U.groupBy(o.checklist, function (c) { return c.grup || 'Umum'; });
    return '<div class="row mb-2"><b style="font-size:13px">' + p.done + ' / ' + p.total + ' ' + I18N.t('langkah') + '</b>' +
      '<div class="spacer"></div><span class="tbl-sub">' + p.pct + '%</span></div>' +
      UI.progress(p.pct, p.pct === 100 ? 'ok' : '') +
      Object.keys(grup).map(function (g) {
        return '<div class="nav-group" style="color:var(--muted);padding:14px 0 6px">' + U.esc(g) + '</div>' +
          grup[g].map(function (c) {
            return '<div class="checklist-item' + (c.done ? ' done' : '') + '" style="cursor:default">' +
              '<input type="checkbox" disabled ' + (c.done ? 'checked' : '') + '>' +
              '<div><span class="lbl">' + U.esc(c.label) + '</span>' +
              (c.done && c.at ? '<small>✓ ' + U.esc(BIZ.nama(c.byId)) + ' • ' + U.jam(c.at) + '</small>' : '') +
              '</div></div>';
          }).join('');
      }).join('');
  }

  function blokLaporan(o) {
    var reps = BIZ.laporan(o.id);
    if (!reps.length) return '<div class="tbl-sub">' + I18N.t('Belum ada laporan dari lapangan.') + '</div>';
    return reps.map(function (r) {
      return '<div class="order-card">' +
        '<div class="row"><b style="font-size:13px">' + U.esc(BIZ.nama(r.workerId)) + '</b>' +
        '<div class="spacer"></div><span class="tbl-sub">' + U.tglJam(r.submittedAt) + '</span></div>' +
        (r.catatan ? '<p class="mt-1" style="font-size:12.8px;color:var(--ink-2)">' + U.esc(r.catatan) + '</p>' : '') +
        '<div class="inline-2 mt-2">' +
          '<div><div class="tbl-sub mb-1">' + I18N.t('Sebelum') + '</div>' + UI.photoGrid(r.before, { zoomAct: 'zoom' }) + '</div>' +
          '<div><div class="tbl-sub mb-1">' + I18N.t('Sesudah') + '</div>' + UI.photoGrid(r.after, { zoomAct: 'zoom' }) + '</div>' +
        '</div></div>';
    }).join('');
  }

  function blokQC(o) {
    var qc = BIZ.qcOrder(o.id);
    if (!qc) return '<div class="tbl-sub">' + I18N.t('Belum diverifikasi supervisor.') + '</div>';
    var s = qc.skor || {};
    var baris = [[I18N.t('Kebersihan hasil'), s.kebersihan], [I18N.t('Kerapihan area'), s.kerapihan],
                 ['Penerapan K3', s.k3], ['Ketepatan waktu', s.ketepatan]];
    return '<div class="row mb-2">' + UI.statusChip('qc', qc.hasil) +
      '<div class="spacer"></div><b>' + BIZ.rataQC(qc) + ' / 5</b></div>' +
      baris.map(function (b) {
        return '<div class="row" style="padding:5px 0"><span style="font-size:12.5px;color:var(--ink-2);width:150px">' +
          b[0] + '</span>' + UI.stars(b[1] || 0) + '</div>';
      }).join('') +
      (qc.catatan ? '<p class="mt-2" style="font-size:12.8px;color:var(--ink-2)">“' + U.esc(qc.catatan) + '”</p>' : '') +
      '<div class="tbl-sub mt-1">' + I18N.t('Oleh') + ' ' + U.esc(BIZ.nama(qc.supervisorId)) + ' • ' + U.tglJam(qc.at) + '</div>';
  }

  /** Modal detail order lengkap. */
  function detailOrder(orderId, opt) {
    opt = opt || {};
    var o = BIZ.order(orderId);
    if (!o) { UI.toast(I18N.t('Order tidak ditemukan'), 'err'); return; }
    var inv = BIZ.invoiceOrder(orderId), rt = BIZ.ratingOrder(orderId);
    var spv = BIZ.user(o.supervisorId);

    var body =
      '<div class="row wrap mb-3">' + UI.statusChip('order', o.status) +
        '<span class="chip chip--muted">' + U.esc(o.no) + '</span>' +
        (o.nilai ? '<span class="chip chip--brand">' + U.rp(o.nilai) + '</span>' : '') +
      '</div>' +
      '<dl class="kv">' +
        '<dt>' + I18N.t('Klien') + '</dt><dd>' + U.esc(BIZ.klien(o.clientId)) + '</dd>' +
        '<dt>' + I18N.t('Layanan') + '</dt><dd>' + (o.serviceIds || []).map(function (s) { return U.esc(BIZ.svcNama(s)); }).join(', ') + '</dd>' +
        '<dt>' + I18N.t('Jadwal') + '</dt><dd>' + U.tglPanjang(o.tgl) + ' • ' + o.mulai + '–' + o.selesai +
          (window.ZONA ? ZONA.labelJam(ZONA.dariWilayah(o.wilayah)) : '') + '</dd>' +
        '<dt>' + I18N.t('Lokasi') + '</dt><dd>' + U.esc(o.alamat) + '</dd>' +
        '<dt>' + I18N.t('Supervisor') + '</dt><dd>' + (spv ? U.esc(spv.nama) : '—') + '</dd>' +
        '<dt>' + I18N.t('Petugas') + '</dt><dd>' + ((o.workerIds || []).map(BIZ.nama).join(', ') || '—') + '</dd>' +
      '</dl>' +

      seksi(I18N.t('Peta Lokasi Pekerjaan'),
        MAPS.petaHTML(o.koordinat, { tinggi: 200, aksiPilih: 'titik-order', dataId: o.id })) +
      seksi(I18N.t('Riwayat Proses'), garisWaktu(o)) +
      seksi(I18N.t('Progres Pekerjaan'), blokChecklist(o)) +
      seksi(I18N.t('Absensi Lapangan'), blokAbsensi(o)) +
      seksi(I18N.t('Laporan &amp; Foto'), blokLaporan(o)) +
      seksi(I18N.t('Verifikasi Mutu (QC)'), blokQC(o)) +
      (inv ? seksi(I18N.t('Tagihan'),
        '<div class="row"><div><b>' + U.esc(inv.no) + '</b><div class="tbl-sub">Jatuh tempo ' +
        U.tgl(inv.jatuhTempo) + '</div></div><div class="spacer"></div>' +
        '<div style="text-align:right"><b>' + U.rp(inv.total) + '</b><div>' +
        UI.statusChip('invoice', inv.status) + '</div></div></div>') : '') +
      (rt ? seksi(I18N.t('Penilaian Klien'), UI.stars(rt.bintang) +
        (rt.komentar ? '<p class="mt-1" style="font-size:12.8px">“' + U.esc(rt.komentar) + '”</p>' : '')) : '');

    UI.modal({
      title: o.judul, sub: o.no + ' • ' + BIZ.klien(o.clientId), size: 'wide', body: body,
      foot: (opt.foot || '') + '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',
      actions: Object.assign({
        zoom: function (el) { UI.lightbox(DB.getPhoto(el.getAttribute('data-id'))); },
        'titik-order': function (el) {
          var id = el.getAttribute('data-id');
          var ord = BIZ.order(id);
          MAPS.pilihTitik({ judul: I18N.t('Titik lokasi pekerjaan'), sub: ord.no + ' — ' + ord.judul,
            alamat: ord.alamat, awal: ord.koordinat }).then(function (hasil) {
            if (!hasil) return;
            DB.update('orders', id, { koordinat: hasil.hapus ? null : hasil });
            UI.toast(hasil.hapus ? 'Titik dihapus' : 'Titik lokasi tersimpan', 'ok');
            document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
            document.body.style.overflow = '';
            detailOrder(id, opt);
          });
        }
      }, opt.actions || {})
    });
  }

  function seksi(judul, isi) {
    return '<div class="nav-group" style="color:var(--muted);padding:20px 0 8px;border-top:1px solid var(--line-2);margin-top:16px">' +
      judul + '</div>' + isi;
  }

  /* ---------------------------------------------------------------- penawaran */
  function dokumenQuotation(q) {
    var c = BIZ.user(q.clientId);
    var sub = BIZ.subtotalQuotation(q), afterDisc = sub - (q.diskon || 0);
    var ppnRp = Math.round(afterDisc * ((q.ppn || 0) / 100));
    return '<div class="inv-doc">' +
      '<div class="inv-doc__head">' +
        '<div><img src="assets/logo-full.png" alt="EXOCLEAN">' +
        '<div class="tbl-sub mt-1">Solusi kebersihan gedung, kantor &amp; rumah<br>' +
        '0812-3456-7001 • exoclean.id</div></div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:19px;font-weight:800;letter-spacing:-.02em">' + I18N.t('PENAWARAN HARGA') + '</div>' +
          '<div class="code mt-1">' + U.esc(q.no) + '</div>' +
          '<div class="tbl-sub">' + I18N.t('Berlaku s/d') + ' ' + U.tgl(q.berlakuHingga) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row" style="align-items:flex-start;gap:30px"><div>' +
        '<div class="tbl-sub">Kepada</div><b>' + U.esc(c.perusahaan || c.nama) + '</b>' +
        '<div style="font-size:12.5px;color:var(--ink-2);max-width:34ch">' + U.esc(c.alamat || '') + '</div>' +
        '<div class="tbl-sub">' + U.esc(c.nama) + ' • ' + U.phoneDisplay(c.telp) + '</div>' +
      '</div><div class="spacer"></div><div style="text-align:right">' +
        '<div class="tbl-sub">' + I18N.t('Status') + '</div>' + UI.statusChip('quotation', q.status) +
      '</div></div>' +
      '<table class="mt-3"><thead><tr><th>' + I18N.t('Uraian Pekerjaan') + '</th><th style="width:70px;text-align:right">Qty</th>' +
      '<th style="width:70px">' + I18N.t('Satuan') + '</th><th style="width:120px;text-align:right">' + I18N.t('Harga') + '</th>' +
      '<th style="width:130px;text-align:right">' + I18N.t('Jumlah') + '</th></tr></thead><tbody>' +
      (q.items || []).map(function (i) {
        return '<tr><td>' + U.esc(i.desc) + '</td><td style="text-align:right">' + U.num(i.qty) + '</td>' +
          '<td>' + U.esc(i.satuan) + '</td><td style="text-align:right">' + U.rp(i.harga) + '</td>' +
          '<td style="text-align:right"><b>' + U.rp(i.qty * i.harga) + '</b></td></tr>';
      }).join('') + '</tbody><tfoot>' +
      '<tr class="tot-row"><td colspan="4" style="text-align:right">' + I18N.t('Subtotal') + '</td>' +
        '<td style="text-align:right">' + U.rp(sub) + '</td></tr>' +
      (q.diskon ? '<tr class="tot-row"><td colspan="4" style="text-align:right">' + I18N.t('Diskon') + '</td>' +
        '<td style="text-align:right;color:var(--danger)">-' + U.rp(q.diskon) + '</td></tr>' : '') +
      (q.ppn ? '<tr class="tot-row"><td colspan="4" style="text-align:right">' + I18N.t('Ppn') + ' ' + q.ppn + '%</td>' +
        '<td style="text-align:right">' + U.rp(ppnRp) + '</td></tr>' : '') +
      '<tr class="tot-row grand"><td colspan="4" style="text-align:right">' + I18N.t('TOTAL') + '</td>' +
        '<td style="text-align:right">' + U.rp(BIZ.totalQuotation(q)) + '</td></tr>' +
      '</tfoot></table>' +
      (q.catatan ? '<div class="alert alert--brand mt-3"><span class="ic">📌</span><div>' + U.esc(q.catatan) + '</div></div>' : '') +
      '<div class="tbl-sub mt-3">' + I18N.t('Harga sudah termasuk peralatan, bahan pembersih, tenaga ahli, dan penerapan standar K3.') + ' ' +
      I18N.t('Harga final dapat berubah bila kondisi lapangan berbeda dari informasi awal.') + '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- invoice */
  /* =========================================================== DOKUMEN INVOICE
     Tata letaknya mengikuti struk pesanan marketplace yang dipakai klien
     sehari-hari: nomor di atas, penjual dan pembeli berdampingan, alamat
     kirim, lalu tabel empat kolom dan tumpukan rincian biaya yang berakhir
     pada satu angka besar.

     Alasannya bukan meniru: bentuk itu SUDAH DIKENAL. Orang yang membuka
     tagihan sudah tahu di mana mencari total, di mana mencari alamat kirim,
     dan baris mana yang potongan. Bentuk yang sudah dikenali dibaca lebih
     cepat dan lebih jarang ditanyakan ulang.

     DUA HAL YANG TIDAK IKUT DISALIN

     1. Merek dan nama pihak lain. Ini dokumen keuangan milik EXOCLEAN;
        menempelkan nama perusahaan lain di kakinya membuatnya menjadi surat
        yang mengaku berasal dari pihak yang tidak menerbitkannya.

     2. Baris yang datanya tidak ada. Cashback, bonus, dan voucher ongkir
        hanya muncul bila memang ada nilainya di pesanan ini. Baris nol yang
        selalu tampil mengajari orang mengabaikan seluruh rinciannya — dan
        baris berisi angka karangan jauh lebih buruk lagi. */
  function dokumenInvoice(inv) {
    var c = BIZ.user(inv.clientId), src = BIZ.sumberInvoice(inv);
    var so = src.tipe === 'toko' ? src.ref : null;
    var afterDisc = inv.subtotal - (inv.diskon || 0);
    var ppnRp = Math.round(afterDisc * ((inv.ppn || 0) / 100));
    var bayar = BIZ.terbayar(inv), sisa = BIZ.sisaTagihan(inv);

    /* ---- penjual: toko mitra, atau EXOCLEAN sendiri ---- */
    var penjual = 'PT EXOCLEAN Indonesia';
    if (so && so.sellerId) {
      var us = DB.find('users', so.sellerId);
      var tk = us && window.SELLER ? SELLER.toko(us) : null;
      if (tk && tk.nama) penjual = tk.nama;
    }

    /* ---- alamat kirim: yang dibekukan bersama pesanan, bukan alamat
           pembeli hari ini. Pesanan lama harus tetap menunjukkan ke mana
           barangnya benar-benar dikirim. ---- */
    var ak = so && so.alamatKirimData ? so.alamatKirimData : null;
    var alamatTeks = ak
      ? [ak.alamat, ak.kota, ak.kodePos].filter(Boolean).join(', ')
      : (so ? so.alamatKirim : (c.alamat || ''));
    var alamatNama = ak ? (ak.penerima || c.nama) : c.nama;
    var alamatTelp = ak ? (ak.telp || c.telp) : c.telp;

    var tglBeli = so ? (so.createdAt || inv.terbitAt) : inv.terbitAt;

    /* ---- baris barang ---- */
    function barisBarang(nama, ket, qty, satuan, harga) {
      return '<tr>' +
        '<td><div class="ivx__nm">' + nama + '</div>' +
          (ket ? '<div class="ivx__ket">' + ket + '</div>' : '') + '</td>' +
        '<td class="ivx__c">' + U.num(qty) + (satuan ? ' <span class="ivx__st">' + U.esc(satuan) + '</span>' : '') + '</td>' +
        '<td class="ivx__r">' + U.rp(harga) + '</td>' +
        '<td class="ivx__r"><b>' + U.rp(qty * harga) + '</b></td>' +
      '</tr>';
    }

    var barisIsi = so
      ? (so.items || []).map(function (i) {
          var p = BIZ.produk(i.productId);
          var ket = [];
          if (i.varianLabel) ket.push(U.esc(i.varianLabel));
          if (p && window.KIRIM) {
            var g = KIRIM.beratProduk(p) * (i.qty || 1);
            if (g) ket.push('Berat: ' + KIRIM.teksBerat(g));
          }
          return barisBarang(U.esc(p ? p.nama : '—'), ket.join(' &middot; '),
            i.qty, p ? p.satuan : '', i.harga);
        }).join('')
      : barisBarang(U.esc(src.judul),
          U.esc(src.no) + (src.ref && src.ref.tgl ? ' &middot; ' + U.tgl(src.ref.tgl) : ''),
          1, '', inv.subtotal);

    /* ---- baris rincian biaya. Hanya yang ada nilainya. ---- */
    function rinci(label, nilai, opsi) {
      opsi = opsi || {};
      return '<tr' + (opsi.tebal ? ' class="ivx__tot"' : '') + '>' +
        '<td class="ivx__lbl" colspan="3">' + label + '</td>' +
        '<td class="ivx__r' + (opsi.kurang ? ' ivx__min' : '') + '">' +
          (opsi.kurang ? '&minus;' : '') + U.rp(Math.abs(nilai)) + '</td></tr>';
    }

    var totalBelanja = afterDisc + ppnRp + (inv.ongkir || 0) + (inv.biayaTambahan || 0);
    var rincian =
      rinci(so ? I18N.t('SUBTOTAL HARGA PRODUK') : I18N.t('SUBTOTAL PEKERJAAN'), inv.subtotal) +
      (inv.diskon ? rinci(inv.voucherNama ? 'Voucher ' + U.esc(inv.voucherNama) : 'Diskon',
        inv.diskon, { kurang: true }) : '') +
      (inv.ongkir ? rinci(I18N.t('Total ongkos kirim'), inv.ongkir) : '') +
      /* Baris insentif dibaca dari pesanan, bukan dari invoice: yang
         dibekukan bersama pesanan itulah yang benar-benar berlaku. */
      (so && so.potonganOngkir
        ? rinci(so.voucherOngkir && so.voucherOngkir.nama
            ? U.esc(so.voucherOngkir.nama) : I18N.t('Voucher ongkir'),
            so.potonganOngkir, { kurang: true }) : '') +
      (inv.biayaTambahan ? rinci('Layanan tambahan', inv.biayaTambahan) : '') +
      (inv.ppn ? rinci('Ppn ' + inv.ppn + '%', ppnRp) : '') +
      (so && so.poinRupiah
        ? rinci(U.num(so.poinDipakai) + ' ' + (window.POIN ? POIN.nama() : 'poin') + ' dipakai',
            so.poinRupiah, { kurang: true }) : '') +
      rinci(I18N.t('TOTAL TAGIHAN'), inv.total, { tebal: true }) +
      (bayar ? rinci(I18N.t('Sudah dibayar'), bayar, { kurang: true }) +
               rinci(I18N.t('SISA TAGIHAN'), sisa, { tebal: true }) : '');

    /* ---- metode bayar ---- */
    var metode = (so && so.metodeBayar) || inv.metodeBayar || '';

    return '<div class="inv-doc ivx">' +

      /* --- kepala: nomor, penjual & pembeli --- */
      '<div class="ivx__head">' +
        '<img src="assets/logo-full.png" alt="EXOCLEAN">' +
        '<div class="ivx__no">' + UI.statusChip('invoice', inv.status) + '</div>' +
      '</div>' +

      '<div class="ivx__pihak">' +
        '<div><span class="ivx__lbl2">Penjual</span><b>' + U.esc(penjual) + '</b></div>' +
        '<div><span class="ivx__lbl2">' + I18N.t('Pembeli') + '</span><b>' + U.esc(c.perusahaan || c.nama) + '</b></div>' +
      '</div>' +

      '<div class="ivx__pihak">' +
        '<div><span class="ivx__lbl2">' + I18N.t('Tanggal') + ' ' + (so ? 'Pembelian' : 'Terbit') + '</span>' +
          '<b>' + U.tglPanjang(tglBeli) + '</b></div>' +
        '<div><span class="ivx__lbl2">' + I18N.t('Jatuh Tempo') + '</span>' +
          '<b>' + U.tglPanjang(inv.jatuhTempo) + '</b></div>' +
      '</div>' +

      (alamatTeks
        ? '<div class="ivx__alamat">' +
            /* Pihaknya disebut "Pembeli" di atas, jadi alamatnya "Alamat
               Pembeli" — bukan "Alamat Klien". Dua sebutan untuk orang yang
               sama dalam satu dokumen membuat pembaca berhenti dan bertanya
               apakah keduanya memang orang yang berbeda. */
            '<span class="ivx__lbl2">' + (so ? I18N.t('Alamat Pengiriman') : I18N.t('Alamat Pembeli')) + '</span>' +
            '<b>' + U.esc(alamatNama || '') + '</b>' +
            (alamatTelp ? ' <span class="ivx__ket">(' + U.esc(U.phoneDisplay(alamatTelp)) + ')</span>' : '') +
            '<div class="ivx__almt">' + U.esc(alamatTeks) + '</div>' +
          '</div>'
        : '') +

      /* --- judul dokumen, dengan nomornya tepat di bawah ---
         Nomor ditulis rapat tanpa spasi: ia disalin orang ke kolom berita
         transfer dan ke pembukuan mereka, dan spasi yang ikut tersalin
         membuat pencocokan gagal pada sistem yang membandingkan apa adanya. */
      '<div class="ivx__judul">ORDER RECEIPT' +
        '<div class="ivx__no18">' + U.esc(inv.no) + '</div>' +
      '</div>' +

      /* --- tabel barang --- */
      '<table class="ivx__tbl"><thead><tr>' +
        '<th>' + (so ? I18N.t('INFO PRODUK') : I18N.t('URAIAN PEKERJAAN')) + '</th>' +
        '<th class="ivx__c">JUMLAH</th>' +
        '<th class="ivx__r">' + I18N.t('HARGA SATUAN') + '</th>' +
        '<th class="ivx__r">' + I18N.t('TOTAL HARGA') + '</th>' +
      '</tr></thead>' +
      '<tbody>' + barisIsi + '</tbody>' +
      '<tfoot>' + rincian + '</tfoot></table>' +

      /* --- metode pembayaran --- */
      '<div class="ivx__bayar">' +
        '<div class="ivx__lbl2">' + I18N.t('Metode Pembayaran') + '</div>' +
        '<b>' + U.esc(metode || 'Transfer Bank') + '</b>' +
        (metode ? '' :
          '<div class="ivx__almt">BCA 1234567890 a.n. PT EXOCLEAN Indonesia — ' +
          I18N.t('mohon cantumkan nomor invoice pada berita transfer.') + '</div>') +
      '</div>' +

      ((inv.payments || []).length
        ? '<div class="ivx__bayar">' +
            '<div class="ivx__lbl2">' + I18N.t('Riwayat pembayaran') + '</div>' +
            inv.payments.map(function (p) {
              return '<div class="ivx__pay"><span>' + U.tglJam(p.at) + ' &middot; ' +
                U.esc(p.metode) + (p.ref ? ' &middot; ' + U.esc(p.ref) : '') + '</span>' +
                '<b>' + U.rp(p.jumlah) + '</b></div>';
            }).join('') +
          '</div>'
        : '') +

      /* --- catatan kaki --- */
      '<div class="ivx__kaki">' +
        '<p>' + I18N.t('*Biaya-biaya yang merupakan bagian dari tagihan ini, jika ada, sudah termasuk') + ' ' +
          I18N.t('Pajak Pertambahan Nilai (Ppn) sesuai tarif yang berlaku.') + '</p>' +
        '<p>' + I18N.t('Dokumen ini berfungsi sebagai Bukti Pemesanan dan/atau Pembelian.') + '</p>' +
        '<div class="ivx__merek">EXOCLEAN</div>' +
      '</div>' +

    '</div>';
  }

  /* ---------------------------------------------------------------- pesanan toko */
  function alurToko(so) {
    var idx = BIZ.ALUR_TOKO.indexOf(so.status);
    var label = { baru: I18N.t('Pesanan diterima'), dikonfirmasi: I18N.t('Dikonfirmasi & stok disiapkan'),
      dikemas: I18N.t('Barang dikemas'), dikirim: 'Dalam pengiriman', selesai: I18N.t('Diterima klien') };
    var waktu = { baru: so.createdAt, dikonfirmasi: so.dikonfirmasiAt, dikemas: so.dikemasAt,
      dikirim: so.dikirimAt, selesai: so.selesaiAt };
    if (so.status === 'dibatalkan') {
      return '<div class="timeline"><div class="tl-item done"><b>' + I18N.t('Pesanan dibuat') + '</b><small>' +
        U.tglJam(so.createdAt) + '</small></div>' +
        '<div class="tl-item done"><b style="color:var(--danger)">' + I18N.t('Dibatalkan') + '</b><small>' +
        (so.dibatalkanAt ? U.tglJam(so.dibatalkanAt) : '—') + '</small></div></div>';
    }
    return '<div class="timeline">' + BIZ.ALUR_TOKO.map(function (st, i) {
      return '<div class="tl-item ' + (i <= idx ? 'done' : '') + (i === idx && st !== 'selesai' ? ' now' : '') + '">' +
        '<b>' + label[st] + '</b><small>' + (waktu[st] ? U.tglJam(waktu[st]) : 'menunggu') + '</small></div>';
    }).join('') + '</div>';
  }

  function daftarBarang(so) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + I18N.t('Barang') + '</th>' +
      '<th style="width:80px;text-align:right">Qty</th><th style="width:110px;text-align:right">' + I18N.t('Harga') + '</th>' +
      '<th style="width:120px;text-align:right">' + I18N.t('Jumlah') + '</th></tr></thead><tbody>' +
      (so.items || []).map(function (i) {
        var p = BIZ.produk(i.productId);
        return '<tr><td><div class="tbl-title">' + (p ? p.icon + ' ' : '') + U.esc(p ? p.nama : '—') + '</div>' +
          '<div class="tbl-sub">' + U.esc(p ? p.kode + ' • ' + p.merek : '') + '</div></td>' +
          '<td style="text-align:right">' + U.num(i.qty) + ' ' + U.esc(p ? p.satuan : '') + '</td>' +
          '<td style="text-align:right">' + U.rp(i.harga) + '</td>' +
          '<td style="text-align:right"><b>' + U.rp(i.qty * i.harga) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="mt-2" style="max-width:300px;margin-left:auto">' +
        barisTotal('Subtotal', U.rp(so.subtotal)) +
        (so.diskon ? barisTotal('Diskon', '-' + U.rp(so.diskon), 'var(--danger)') : '') +
        (so.ppn ? barisTotal('Ppn ' + so.ppn + '%',
          U.rp(Math.round((so.subtotal - (so.diskon || 0)) * so.ppn / 100))) : '') +
        (so.ongkir ? barisTotal(I18N.t('Ongkos kirim'), U.rp(so.ongkir)) : '') +
        '<div class="row mt-1" style="border-top:1px solid var(--line);padding-top:7px">' +
        '<b>' + I18N.t('Total') + '</b><div class="spacer"></div><b style="font-size:16px;color:var(--brand-dark)">' +
        U.rp(so.total) + '</b></div>' +
      '</div>';
  }
  function barisTotal(l, v, warna) {
    return '<div class="row" style="padding:2px 0"><span class="tbl-sub">' + l + '</span><div class="spacer"></div>' +
      '<span' + (warna ? ' style="color:' + warna + '"' : '') + '>' + v + '</span></div>';
  }

  /** Modal detail pesanan toko. opt.foot / opt.actions untuk tombol khusus admin. */
  function detailPesananToko(shopOrderId, opt) {
    opt = opt || {};
    var so = BIZ.pesananToko(shopOrderId);
    if (!so) { UI.toast(I18N.t('Pesanan tidak ditemukan'), 'err'); return; }
    var inv = BIZ.invoiceToko(shopOrderId), c = BIZ.user(so.clientId);

    UI.modal({
      title: I18N.t('Pesanan') + ' ' + so.no, sub: BIZ.klien(so.clientId) + ' • ' + U.tglJam(so.createdAt), size: 'wide',
      body: '<div class="row wrap mb-3">' + UI.statusChip('shop', so.status) +
          '<span class="chip chip--brand">' + U.rp(so.total) + '</span>' +
          '<span class="chip chip--muted">' + (so.items || []).length + ' ' + I18N.t('jenis barang') + '</span></div>' +
        '<dl class="kv">' +
          '<dt>Pemesan</dt><dd>' + U.esc(c.nama) + ' • ' + U.phoneDisplay(c.telp) + '</dd>' +
          '<dt>' + I18N.t('Alamat kirim') + '</dt><dd>' + U.esc(so.alamatKirim) + '</dd>' +
          '<dt>Pembayaran</dt><dd>' + U.esc(so.metodeBayar || '—') + '</dd>' +
          (so.voucher
            ? '<dt>' + I18N.t('Voucher poin') + '</dt><dd>🎁 ' + U.esc(so.voucher.nama) +
              ' <span class="code">' + U.esc(so.voucher.no) + '</span>' +
              ' — potongan <b>' + U.rp(so.voucher.potongan) + '</b>' +
              (so.status === 'dibatalkan'
                ? '<div class="tbl-sub">' + I18N.t('Pesanan batal — voucher sudah dikembalikan ke akun pembeli.') + '</div>'
                : '') + '</dd>'
            : '') +
          (so.kurirPilihan && !so.kurir
            ? '<dt>Kurir dipilih</dt><dd>' + U.esc(KIRIM.ringkas(so.kurirPilihan)) +
              '<div class="tbl-sub">' + I18N.t('Resi terbit setelah penjual menyerahkan barang ke kurir.') + '</div></dd>'
            : '') +
          (so.kurir ? '<dt>' + I18N.t('Kurir') + '</dt><dd>' + U.esc(so.kurir) +
            (so.resi ? ' • resi <b class="code">' + U.esc(so.resi) + '</b>' : '') +
            ' <button class="btn btn--ghost btn--sm" data-act="lacak-paket" data-id="' +
            U.esc(so.id) + '">📍 Lacak</button></dd>' : '') +
          '<dt>' + I18N.t('Catatan') + '</dt><dd>' + (so.catatan ? U.esc(so.catatan) : '<span class="tbl-sub">—</span>') + '</dd>' +
        '</dl>' +
        seksi(I18N.t('Rincian Barang'), daftarBarang(so)) +
        seksi(I18N.t('Status Pengiriman'), alurToko(so)) +
        (inv ? seksi('Tagihan', '<div class="row"><div><b>' + U.esc(inv.no) + '</b>' +
          '<div class="tbl-sub">Jatuh tempo ' + U.tgl(inv.jatuhTempo) + '</div></div><div class="spacer"></div>' +
          '<div style="text-align:right"><b>' + U.rp(inv.total) + '</b><div>' +
          UI.statusChip('invoice', inv.status) + '</div></div></div>') : ''),
      foot: (opt.foot || '') + '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',
      /* Tombol "Lacak" selalu tersedia di detail pesanan mana pun — pembeli,
         penjual, maupun admin membukanya dari modal yang sama. */
      actions: Object.assign({
        'lacak-paket': function (el) {
          /* Aplikasi mitra tidak membawa layar pengiriman — mitra lapangan
             tidak pernah membuka pesanan toko. */
          if (window.ViewKirim) ViewKirim.dialogLacak(el.getAttribute('data-id'));
        }
      }, opt.actions || {})
    });
  }

  /* ---------------------------------------------------------------- berkas kepegawaian */
  var bukaNomorPanel = {};   /* per-user: apakah nomor identitas sedang ditampilkan */

  /**
   * Modal berkas kepegawaian seseorang. Hanya terbuka bila pelihatnya berhak
   * (dirinya sendiri, admin, atau supervisor timnya) — lihat BIZ.bolehLihatBerkas.
   */
  /* ==================================================== DATA KEPEGAWAIAN
     Dialognya tinggal DI SINI, bukan di views/profil.js, karena dua pintu
     memakainya: pegawai membukanya dari tabnya sendiri (read-only) dan admin
     dari panel berkas. Menyalinnya ke dua tempat berarti dua aturan validasi
     yang perlahan berbeda, dan yang satu pasti tertinggal saat aturan
     ketenagakerjaannya berubah. */
  function dialogKepegawaian(userId, onSelesai) {
    var u = BIZ.user(userId);
    if (!u) { UI.toast(I18N.t('Pengguna tidak ditemukan'), 'err'); return; }
    if (!APP.user || APP.user.role !== 'admin') {
      UI.toast(I18N.t('Hanya admin yang boleh mengubah data kepegawaian.'), 'err');
      return;
    }
    var k = BIZ.kepegawaian(u);
    var spv = DB.all('users').filter(function (x) {
      return x.role === 'supervisor' || x.role === 'admin'; });

    UI.formModal({
      title: I18N.t('Data Kepegawaian'), sub: u.nama, size: 'wide', okText: I18N.t('Simpan'),
      fields: [
        { name: 'nomorPegawai', label: I18N.t('Nomor pegawai'), value: k.nomorPegawai,
          placeholder: 'EXO-2026-001' },
        { name: 'tglMasuk', label: I18N.t('Tanggal masuk'), type: 'date', value: k.tglMasuk },
        { name: 'statusKerja', label: I18N.t('Status kerja'), type: 'select', value: k.statusKerja,
          options: Object.keys(BIZ.STATUS_KERJA).map(function (key) {
            return { value: key, label: BIZ.STATUS_KERJA[key].t }; }) },
        { name: 'kontrakMulai', label: 'Kontrak mulai', type: 'date', value: k.kontrakMulai,
          hint: I18N.t('Diisi bila status kerjanya Kontrak (PKWT).') },
        { name: 'kontrakSelesai', label: 'Kontrak berakhir', type: 'date', value: k.kontrakSelesai },
        { name: 'penempatan', label: 'Lokasi / wilayah penempatan', value: k.penempatan },
        { name: 'atasanId', label: I18N.t('Atasan langsung'), type: 'select', value: k.atasanId,
          options: [{ value: '', label: '— ikut supervisor tim —' }].concat(
            spv.map(function (x) {
              return { value: x.id, label: x.nama + ' — ' + (x.jabatan || x.role) }; })) },
        { name: 'bpjsTk', label: I18N.t('BPJS Ketenagakerjaan'), value: k.bpjsTk },
        { name: 'bpjsKes', label: I18N.t('BPJS Kesehatan'), value: k.bpjsKes },
        { name: 'npwp', label: I18N.t('NPWP'), value: k.npwp },
        { name: 'tglBerhenti', label: I18N.t('Tanggal berhenti'), type: 'date', value: k.tglBerhenti,
          hint: I18N.t('Kosongkan bila masih bekerja.') },
        { name: 'alasanBerhenti', label: 'Alasan berhenti', value: k.alasanBerhenti },
        { name: 'catatan', label: I18N.t('Catatan'), type: 'textarea', rows: 2, value: k.catatan }
      ],
      validate: function (d) {
        if (d.statusKerja === 'kontrak' && !d.kontrakSelesai) {
          return I18N.t('Status Kontrak (PKWT) wajib punya tanggal berakhir.');
        }
        if (d.kontrakMulai && d.kontrakSelesai && d.kontrakSelesai < d.kontrakMulai) {
          return I18N.t('Kontrak berakhir tidak boleh mendahului tanggal mulai.');
        }
        if (d.tglMasuk && d.tglBerhenti && d.tglBerhenti < d.tglMasuk) {
          return I18N.t('Tanggal berhenti tidak boleh mendahului tanggal masuk.');
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      try {
        BIZ.simpanKepegawaian(userId, d, APP.user);
        UI.toast('Data kepegawaian tersimpan', 'ok');
        if (onSelesai) onSelesai();
        APP.refresh();
      } catch (e) { UI.toast(e.message, 'err'); }
    });
  }

  /** Ringkasan data kepegawaian untuk panel berkas. */
  function blokKepegawaian(u) {
    var k = BIZ.kepegawaian(u);
    var st = BIZ.STATUS_KERJA[k.statusKerja] || { t: k.statusKerja, c: 'muted' };
    var mk = BIZ.masaKerja(u), kon = BIZ.kontrak(u);
    var tim = BIZ.timPegawai(u), atasan = BIZ.atasan(u);
    return '<div class="row wrap mb-2" style="gap:8px">' +
        '<span class="chip chip--' + st.c + '">' + U.esc(st.t) + '</span>' +
        (mk ? '<span class="chip chip--muted">' + I18N.t('Masa kerja') + ' ' + U.esc(mk.teks) + '</span>' : '') +
        (kon && kon.keadaan !== 'aman'
          ? '<span class="chip chip--' + (kon.keadaan === 'lewat' ? 'danger' : 'warn') + '">' +
            (kon.keadaan === 'lewat' ? 'Kontrak habis ' + Math.abs(kon.sisaHari) + ' hari lalu'
                                     : 'Kontrak tinggal ' + kon.sisaHari + ' hari') + '</span>'
          : '') +
      '</div>' +
      '<dl class="kv">' +
        '<dt>' + I18N.t('Nomor pegawai') + '</dt><dd>' + (k.nomorPegawai
          ? '<span class="code">' + U.esc(k.nomorPegawai) + '</span>' : '—') + '</dd>' +
        '<dt>' + I18N.t('Tanggal masuk') + '</dt><dd>' + (k.tglMasuk ? U.tgl(k.tglMasuk) : '—') + '</dd>' +
        (k.statusKerja === 'kontrak'
          ? '<dt>' + I18N.t('Masa kontrak') + '</dt><dd>' + (k.kontrakMulai ? U.tgl(k.kontrakMulai) : '—') +
            ' – ' + (k.kontrakSelesai ? U.tgl(k.kontrakSelesai) : '—') + '</dd>'
          : '') +
        '<dt>' + I18N.t('Penempatan') + '</dt><dd>' + U.esc(k.penempatan || (tim ? tim.nama : '') || '—') + '</dd>' +
        '<dt>' + I18N.t('Atasan langsung') + '</dt><dd>' + U.esc(atasan ? atasan.nama : '—') + '</dd>' +
        (k.tglBerhenti
          ? '<dt>Berhenti</dt><dd>' + U.tgl(k.tglBerhenti) +
            (k.alasanBerhenti ? ' — ' + U.esc(k.alasanBerhenti) : '') + '</dd>'
          : '') +
      '</dl>';
  }

  function detailBerkas(userId, opt) {
    opt = opt || {};
    var u = BIZ.user(userId);
    var pelihat = APP.user;
    if (!u) { UI.toast(I18N.t('Pengguna tidak ditemukan'), 'err'); return; }
    if (!BIZ.bolehLihatBerkas(pelihat, u)) {
      UI.modal({ title: 'Akses ditolak', size: 'narrow',
        body: UI.alert('danger', I18N.t('Berkas identitas hanya dapat dilihat oleh pemiliknya, admin, dan') + ' ' +
          I18N.t('supervisor tim yang bersangkutan.'), '🔒'),
        foot: '<button class="btn" data-close>' + I18N.t('Tutup') + '</button>' });
      return;
    }

    var idn = BIZ.identitas(u), kd = BIZ.kontakDarurat(u), at = BIZ.alamatTinggal(u);
    var jn = BIZ.jenisId(idn.jenis), st = BIZ.statusBerlakuId(idn), l = BIZ.kelengkapanBerkas(u);
    var buka = !!bukaNomorPanel[userId];
    var isAdmin = pelihat.role === 'admin';

    function chipBerlaku() {
      if (st === 'seumur_hidup') return '<span class="chip chip--ok">' + I18N.t('Berlaku seumur hidup') + '</span>';
      if (st === 'aman') return '<span class="chip chip--ok">' + I18N.t('Berlaku s/d') + ' ' + U.tgl(idn.berlakuHingga) + '</span>';
      if (st === 'segera') return '<span class="chip chip--warn chip--dot">Segera habis — ' +
        U.relatif(idn.berlakuHingga).toLowerCase() + '</span>';
      if (st === 'kedaluwarsa') return '<span class="chip chip--danger chip--dot">' + I18N.t('Kedaluwarsa') + ' ' +
        U.tgl(idn.berlakuHingga) + '</span>';
      return '<span class="chip chip--muted">' + I18N.t('Masa berlaku belum diisi') + '</span>';
    }

    var fotoDepan = idn.fotoDepan ? DB.getPhoto(idn.fotoDepan) : null;
    var fotoSelfie = idn.fotoSelfie ? DB.getPhoto(idn.fotoSelfie) : null;

    UI.modal({
      title: 'Berkas Kepegawaian — ' + u.nama, sub: (u.jabatan || '') + ' • ' + U.phoneDisplay(u.telp),
      size: 'wide',
      body:
        '<div class="row wrap mb-3" style="gap:8px">' +
          '<span class="chip chip--brand">' + U.esc(jn.nama) + '</span>' + chipBerlaku() +
          (idn.diverifikasi
            ? '<span class="chip chip--ok">✓ Terverifikasi ' +
              (idn.diverifikasiAt ? U.tgl(idn.diverifikasiAt) : '') + '</span>'
            : '<span class="chip chip--warn">' + I18N.t('Belum diverifikasi') + '</span>') +
          (l.kurang.length ? '<span class="chip chip--warn">' + l.lengkap + '/' + l.total + ' ' + I18N.t('terisi') + '</span>'
                           : '<span class="chip chip--ok">' + I18N.t('Berkas lengkap') + '</span>') +
        '</div>' +

        (l.kurang.length ? UI.alert('warn', '<b>' + I18N.t('Belum terisi:') + '</b> ' +
          l.kurang.map(function (p) { return U.esc(p.label); }).join(', '), '⚠️') + '<div class="mb-3"></div>' : '') +

        '<div class="idcard">' +
          '<div class="idcard__no"><div class="tbl-sub">' + I18N.t('Nomor') + ' ' + U.esc(jn.nama) + '</div>' +
          '<b>' + U.esc(idn.nomor ? (buka ? idn.nomor : BIZ.samarkanNomorId(idn.nomor)) : '—') + '</b></div>' +
          (idn.nomor ? '<button class="btn btn--ghost btn--sm" data-act="buka-nomor">' +
            (buka ? '🙈 Sembunyikan' : I18N.t('👁 Lihat nomor')) + '</button>' : '') +
        '</div>' +

        '<dl class="kv mt-3">' +
          '<dt>' + I18N.t('Nama sesuai kartu') + '</dt><dd>' + U.esc(idn.namaSesuaiKartu || '—') + '</dd>' +
          '<dt>' + I18N.t('Tanggal lahir') + '</dt><dd>' + (idn.tanggalLahir ? U.tglPanjang(idn.tanggalLahir) : '—') + '</dd>' +
          '<dt>' + I18N.t('Alamat sesuai kartu') + '</dt><dd>' + (idn.alamatKtp ? U.esc(idn.alamatKtp) :
            '<span class="tbl-sub">—</span>') + '</dd>' +
        '</dl>' +

        seksi('Foto Kartu Identitas', (fotoDepan || fotoSelfie
          ? '<div class="grid g-2">' +
            (fotoDepan ? '<div><div class="tbl-sub mb-1">Tampak depan</div>' +
              '<div class="idfoto"><img src="' + fotoDepan + '" data-act="zoom-berkas" alt=""></div></div>' : '') +
            (fotoSelfie ? '<div><div class="tbl-sub mb-1">' + I18N.t('Swafoto dengan kartu') + '</div>' +
              '<div class="idfoto"><img src="' + fotoSelfie + '" data-act="zoom-berkas" alt=""></div></div>' : '') +
            '</div>'
          : '<div class="tbl-sub">' + I18N.t('Belum ada foto kartu yang diunggah.') + '</div>')) +

        /* Data kepegawaian diletakkan SEBELUM kontak darurat: ketika admin
           membuka berkas seseorang, yang paling sering dicari adalah status
           kerja dan masa kontraknya, bukan nomor keluarganya. */
        seksi('Data Kepegawaian', blokKepegawaian(u) +
          (isAdmin
            ? '<div class="row mt-2"><div class="spacer"></div>' +
              '<button class="btn btn--soft btn--sm" data-act="ubah-kepeg">' + I18N.t('Ubah Data Kepegawaian') + '</button></div>'
            : '<div class="tbl-sub mt-2">' + I18N.t('Hanya admin yang dapat mengubah data ini.') + '</div>')) +

        seksi('Kontak Darurat', kd.length
          ? kd.map(function (k) {
              return '<div class="adr' + (k.utama ? ' utama' : '') + '">' +
                '<div class="row" style="gap:10px;align-items:flex-start">' + UI.avatar(k.nama, 'sm') +
                '<div style="min-width:0;flex:1"><div class="row" style="gap:7px"><b>' + U.esc(k.nama) + '</b>' +
                  '<span class="chip chip--muted" style="font-size:10px">' + U.esc(k.hubungan) + '</span>' +
                  (k.utama ? '<span class="chip chip--brand" style="font-size:10px">' + I18N.t('Utama') + '</span>' : '') + '</div>' +
                  '<div class="adr__nama">' + U.phoneDisplay(k.telp) + '</div>' +
                  (k.alamat ? '<div class="adr__teks">' + U.esc(k.alamat) + '</div>' : '') + '</div>' +
                '<div class="row" style="gap:5px">' +
                  '<a class="btn btn--ghost btn--sm" href="tel:' + U.esc(k.telp) + '">📞 Telepon</a>' +
                  '<button class="btn btn--wa btn--sm" data-act="wa-darurat" data-t="' + U.esc(k.telp) +
                    '" data-n="' + U.esc(k.nama) + '">💬</button>' +
                '</div></div></div>';
            }).join('')
          : '<div class="tbl-sub">' + I18N.t('Belum ada kontak darurat — mohon dikejar sebelum penugasan berikutnya.') + '</div>') +

        seksi(I18N.t('Alamat Tinggal Sekarang'), at.alamat
          ? '<div class="row wrap mb-2" style="gap:7px">' +
            '<span class="chip chip--brand">' + U.esc(at.status) + '</span>' +
            (at.samaDenganKtp ? '<span class="chip chip--muted">' + I18N.t('Sama dengan alamat kartu') + '</span>' : '') +
            (at.sejak ? '<span class="chip chip--muted">' + I18N.t('Sejak') + ' ' + U.tgl(at.sejak) + '</span>' : '') + '</div>' +
            '<div class="adr__teks" style="font-size:13.4px">' + U.esc(BIZ.alamatTinggalTeks(at)) + '</div>' +
            (at.patokan ? '<div class="adr__patokan">📍 ' + U.esc(at.patokan) + '</div>' : '')
          : '<div class="tbl-sub">' + I18N.t('Alamat tinggal belum diisi.') + '</div>'),

      foot:
        '<button class="btn btn--wa" data-act="wa-pegawai" data-id="' + userId + '">' + I18N.t('💬 Chat petugas') + '</button>' +
        (isAdmin && idn.nomor && !idn.diverifikasi
          ? '<button class="btn" data-act="verifikasi-berkas" data-id="' + userId + '">✓ Verifikasi Berkas</button>'
          : '') +
        (isAdmin && idn.diverifikasi
          ? '<button class="btn btn--ghost" data-act="batal-verifikasi" data-id="' + userId + '">' + I18N.t('Batalkan verifikasi') + '</button>'
          : '') +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>',

      actions: {
        'buka-nomor': function (el) {
          bukaNomorPanel[userId] = !buka;
          /* jejak sederhana: siapa membuka nomor identitas siapa */
          if (!buka) DB.log(pelihat.id, 'Melihat nomor identitas ' + u.nama, 'user', userId);
          tutupModal(el); detailBerkas(userId, opt);
        },
        'zoom-berkas': function (el) { UI.lightbox(el.getAttribute('src')); },
        'ubah-kepeg': function (el) {
          tutupModal(el);
          dialogKepegawaian(userId, function () { detailBerkas(userId, opt); });
        },
        'wa-darurat': function (el) {
          WA.chat(el.getAttribute('data-t'), 'Halo ' + el.getAttribute('data-n') +
            ', saya dari EXOCLEAN. Kami ingin menyampaikan informasi mengenai ' + u.nama + '. ');
        },
        'wa-pegawai': function () { WA.chat(u.telp, 'Halo ' + u.nama + ', '); },
        'verifikasi-berkas': function (el) {
          BIZ.simpanIdentitas(userId, { diverifikasi: true, diverifikasiOleh: pelihat.id,
            diverifikasiAt: U.nowISO() });
          DB.log(pelihat.id, 'Memverifikasi berkas identitas ' + u.nama, 'user', userId);
          tutupModal(el);
          UI.toast('Berkas ' + u.nama + ' diverifikasi', 'ok');
          APP.refresh();
        },
        'batal-verifikasi': function (el) {
          BIZ.simpanIdentitas(userId, { diverifikasi: false, diverifikasiOleh: null, diverifikasiAt: null });
          tutupModal(el);
          UI.toast('Verifikasi dibatalkan', 'warn');
          APP.refresh();
        }
      }
    });
  }

  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ---------------------------------------------------------------- pesan WA */
  function pratinjauWA(outboxId, opt) {
    opt = opt || {};
    var m = DB.find('waOutbox', outboxId);
    var u = BIZ.user(m.to);
    UI.modal({
      title: I18N.t('Pratinjau pesan WhatsApp'),
      sub: 'Kepada ' + (u ? u.nama + ' • ' + U.phoneDisplay(u.telp) : '—'),
      body: '<div class="row mb-2">' + UI.statusChip('wa', m.status) +
            '<span class="chip chip--muted">' + U.esc(WA.LABEL[m.template] ? I18N.t(WA.LABEL[m.template]) : m.template) + '</span></div>' +
            '<div class="wa-thread"><div class="wa-msg">' + U.esc(m.pesan) + '</div></div>' +
            UI.alert('info', 'Menekan <b>' + I18N.t('Kirim via WhatsApp') + '</b> ' + I18N.t('akan membuka WhatsApp Web / aplikasi WhatsApp') + ' ' +
              I18N.t('dengan teks ini sudah terisi. Tinggal tekan tombol kirim di sana.'), '💬'),
      foot: '<button class="btn btn--ghost" data-act="salin">📋 Salin teks</button>' +
            '<button class="btn btn--wa" data-act="kirim">' + I18N.t('💬 Kirim via WhatsApp') + '</button>',
      actions: {
        salin: function () {
          navigator.clipboard.writeText(m.pesan).then(function () { UI.toast('Teks disalin', 'ok'); },
            function () { UI.toast('Browser menolak akses clipboard', 'err'); });
        },
        kirim: function (el) {
          WA.kirim(outboxId);
          el.closest('.modal-back').remove();
          document.body.style.overflow = '';
          if (opt.onKirim) opt.onKirim();
        }
      }
    });
  }

  return {
    detailOrder: detailOrder, dokumenQuotation: dokumenQuotation, dokumenInvoice: dokumenInvoice,
    pratinjauWA: pratinjauWA, garisWaktu: garisWaktu, blokChecklist: blokChecklist,
    blokAbsensi: blokAbsensi, blokLaporan: blokLaporan, blokQC: blokQC, seksi: seksi,
    detailPesananToko: detailPesananToko, daftarBarang: daftarBarang, alurToko: alurToko,
    detailBerkas: detailBerkas,
    dialogKepegawaian: dialogKepegawaian, blokKepegawaian: blokKepegawaian
  };
})();
