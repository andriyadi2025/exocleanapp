/* ==========================================================================
   views/admin.js — tampilan untuk ADMIN EXOCLEAN
   Permintaan • Penawaran • Penjadwalan • Order • Invoice • Master data • WA
   ========================================================================== */
var ViewAdmin = (function () {

  /* ================================================================ DASHBOARD */
  function renderDashboard() {
    var st = BIZ.statistik();
    var crm = CRM.statistik();
    var hariIni = U.sortBy(st.orderHariIni, function (o) { return o.mulai; });
    var akt = U.sortBy(DB.all('activity'), function (a) { return a.at; }, true).slice(0, 8);

    return '' +
    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Order hari ini'), value: st.orderHariIni.length, icon: '📅',
        meta: st.orderBerjalan.length + ' sedang dikerjakan' }) +
      UI.stat({ label: I18N.t('Pendapatan jasa bulan ini'), small: true, valueHTML: U.rpShort(st.pendapatanBulanIni), icon: '💰',
        meta: U.bulanTahun(new Date()) }) +
      UI.stat({ label: I18N.t('Penjualan toko bulan ini'), small: true, valueHTML: U.rpShort(st.penjualanToko), icon: '🛒',
        meta: st.pesananTokoJalan.length + ' ' + I18N.t('pesanan diproses') }) +
      UI.stat({ label: I18N.t('Piutang belum tertagih'), small: true, valueHTML: U.rpShort(st.outstanding), icon: '🧾',
        meta: st.jatuhTempo.length ? '<span class="down">' + st.jatuhTempo.length + ' invoice jatuh tempo</span>' : I18N.t('semua dalam tempo') }) +
    '</div>' +

    '<div class="grid g-4 mb-3">' +
      kartuAksi('📥', st.permintaanBaru.length, I18N.t('Permintaan layanan baru'), 'permintaan', 'info') +
      kartuAksi('🌱', crm.aktif, 'Prospek dalam pipeline', 'pipeline', 'info') +
      kartuAksi('📌', crm.followUpTerlambat + crm.followUpHariIni, 'Follow-up perlu dikerjakan', 'agenda', 'warn') +
      kartuAksi('🛒', st.pesananTokoBaru.length, I18N.t('Pesanan toko baru'), 'pesananToko', 'info') +
      kartuAksi('🔍', st.perluVerifikasi.length, 'Menunggu verifikasi QC', 'order', 'warn') +
      kartuAksi('⚠️', st.komplainAktif.length, 'Komplain aktif', 'komplain', 'danger') +
      kartuAksi('📦', st.stokMenipis.length, I18N.t('Produk perlu restock'), 'produk', 'warn') +
      kartuAksi('💬', st.waAntre.length, I18N.t('Pesan WA belum dikirim'), 'wa', 'ok') +
    '</div>' +

    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: 'Nilai pipeline', small: true, valueHTML: U.rpShort(crm.nilaiPipeline), icon: '🎯',
        meta: 'perkiraan tertimbang ' + U.rpShort(crm.nilaiTertimbang) }) +
      UI.stat({ label: 'Konversi prospek', value: crm.konversi + '%', icon: '🏆',
        meta: crm.menang + ' menang / ' + crm.kalah + ' kalah' }) +
      UI.stat({ label: I18N.t('Kepuasan klien'), value: st.rataRating ? st.rataRating + ' ★' : '—', icon: '⭐',
        meta: st.jumlahRating + ' penilaian masuk' }) +
      UI.stat({ label: I18N.t('Nilai stok gudang'), small: true,
        valueHTML: U.rpShort(U.sum(DB.all('products'), function (p) { return p.harga * p.stok; })), icon: '🏬',
        meta: DB.all('products').length + ' ' + I18N.t('jenis produk') }) +
    '</div>' +

    '<div class="grid g-2-1">' +
      UI.card({ title: I18N.t('Jadwal hari ini'), sub: U.tglPanjang(new Date()), flush: true,
        tools: '<button class="btn btn--sm" data-act="order-baru">＋ Order Baru</button>',
        body: hariIni.length ? UI.table([
          { h: I18N.t('Jam'), w: '86px', r: function (o) { return '<b>' + o.mulai + '</b><div class="tbl-sub">' + o.selesai + '</div>'; } },
          { h: I18N.t('Pekerjaan'), r: function (o) { return '<div class="tbl-title">' + U.esc(U.potong(o.judul, 44)) + '</div>' +
            '<div class="tbl-sub">' + U.esc(BIZ.klien(o.clientId)) + '</div>'; } },
          { h: I18N.t('Tim'), r: function (o) { return '<div class="row" style="gap:4px">' +
            (o.workerIds || []).map(function (w) { return UI.avatar(BIZ.nama(w), 'sm'); }).join('') + '</div>'; } },
          { h: I18N.t('Status'), r: function (o) { return UI.statusChip('order', o.status); } },
          { h: '', cls: 'act', r: function (o) { return '<button class="btn btn--ghost btn--sm" data-act="detail" data-id="' +
            o.id + '">' + I18N.t('Detail') + '</button>'; } }
        ], hariIni) : UI.empty('🌤️', I18N.t('Tidak ada jadwal hari ini'), I18N.t('Gunakan tombol Order Baru untuk menjadwalkan pekerjaan.')) }) +

      '<div class="col">' +
        UI.card({ title: I18N.t('Aktivitas terakhir'), flush: true,
          body: '<div class="mini-list">' + akt.map(function (a) {
            return '<div class="mini-item">' + UI.avatar(BIZ.nama(a.actorId), 'sm') +
              '<div style="min-width:0"><b style="font-weight:500;font-size:12.5px">' + U.esc(a.aksi) + '</b>' +
              '<small>' + U.esc(BIZ.nama(a.actorId)) + ' • ' + U.sejak(a.at) + '</small></div></div>';
          }).join('') + '</div>' }) +
        UI.card({ title: 'Performa tim', flush: true,
          body: '<div class="mini-list">' + DB.all('teams').map(function (t) {
            var ord = DB.all('orders').filter(function (o) { return o.teamId === t.id; });
            var sel = ord.filter(function (o) { return o.status === 'diverifikasi'; }).length;
            return '<div class="mini-item"><div style="min-width:0;flex:1"><b>' + U.esc(t.nama) + '</b>' +
              '<small>' + U.esc(BIZ.nama(t.supervisorId)) + ' • ' + t.memberIds.length + ' ' + I18N.t('petugas') + '</small>' +
              '<div class="mt-1">' + UI.progress(ord.length ? sel / ord.length * 100 : 0, 'ok') + '</div></div>' +
              '<div class="right"><b>' + sel + '/' + ord.length + '</b><small>' + I18N.t('selesai') + '</small></div></div>';
          }).join('') + '</div>' }) +
      '</div>' +
    '</div>';
  }

  function kartuAksi(ic, n, label, page, warna) {
    return '<div class="card stat" style="cursor:pointer' + (n ? '' : ';opacity:.55') + '" data-nav="' + page + '">' +
      '<div class="row"><div class="stat__label">' + U.esc(label) + '</div>' +
      '<div class="stat__icon">' + ic + '</div></div>' +
      '<div class="stat__value">' + n + '</div>' +
      '<div class="stat__meta"><span class="chip chip--' + warna + '" style="font-size:10.5px">' +
      (n ? 'perlu tindakan →' : 'aman') + '</span></div></div>';
  }

  /* ================================================================ PERMINTAAN */
  function renderPermintaan() {
    var list = U.sortBy(DB.all('bookings'), function (b) { return b.createdAt; }, true);
    return UI.card({
      title: I18N.t('Permintaan Layanan Masuk'), sub: I18N.t('Dari form pemesanan klien'), flush: true,
      body: UI.table([
        { h: 'No. / Waktu', r: function (b) { return '<div class="code">' + U.esc(b.no) + '</div>' +
          '<div class="tbl-sub">' + U.sejak(b.createdAt) + '</div>'; } },
        { h: I18N.t('Klien'), r: function (b) { var c = BIZ.user(b.clientId);
          return '<div class="tbl-title">' + U.esc(BIZ.klien(b.clientId)) + '</div>' +
            '<div class="tbl-sub">' + U.esc(c.nama) + ' • ' + U.phoneDisplay(c.telp) + '</div>'; } },
        { h: 'Kebutuhan', r: function (b) {
          return (b.items || []).map(function (i) {
            return '<div style="font-size:12.5px">• ' + U.esc(BIZ.svcNama(i.serviceId)) + ' <span class="tbl-sub">(' +
              U.num(i.qty) + ')</span></div>'; }).join(''); } },
        { h: 'Estimasi', cls: 'num', r: function (b) {
          return '<span class="tbl-sub">' + BIZ.teksEstimasi(BIZ.estimasi(b.items)) + '</span>'; } },
        { h: 'Diharapkan', r: function (b) { return U.tgl(b.tglHarapan) +
          '<div class="tbl-sub">' + U.relatif(b.tglHarapan) + '</div>'; } },
        { h: I18N.t('Status'), r: function (b) { return UI.statusChip('booking', b.status); } },
        { h: '', cls: 'act', r: function (b) {
          return '<button class="btn btn--ghost btn--sm" data-act="lihat-req" data-id="' + b.id + '">' + I18N.t('Detail') + '</button>' +
            (b.status === 'baru' ? ' <button class="btn btn--sm" data-act="buat-quo" data-id="' + b.id +
              '">' + I18N.t('Buat Penawaran') + '</button>' : ''); } }
      ], list, { icon: '📥', judul: I18N.t('Belum ada permintaan'), teks: I18N.t('Permintaan dari klien akan muncul di sini.') })
    });
  }

  function lihatPermintaan(id) {
    var b = DB.find('bookings', id), c = BIZ.user(b.clientId);
    var est = BIZ.estimasi(b.items);
    UI.modal({
      title: I18N.t('Permintaan') + ' ' + b.no, sub: BIZ.klien(b.clientId),
      body: '<div class="row wrap mb-3">' + UI.statusChip('booking', b.status) +
          '<span class="chip chip--muted">' + U.sejak(b.createdAt) + '</span></div>' +
        '<dl class="kv">' +
          '<dt>' + I18N.t('Kontak') + '</dt><dd>' + U.esc(c.nama) + ' • ' + U.phoneDisplay(c.telp) + '<br>' + U.esc(c.email) + '</dd>' +
          '<dt>' + I18N.t('Lokasi') + '</dt><dd>' + U.esc(b.alamat) + '</dd>' +
          '<dt>' + I18N.t('Tanggal diharapkan') + '</dt><dd>' + U.tglPanjang(b.tglHarapan) + ' <span class="tbl-sub">(' +
            U.relatif(b.tglHarapan) + ')</span></dd>' +
          '<dt>' + I18N.t('Catatan klien') + '</dt><dd>' + (b.catatan ? U.esc(b.catatan) : '<span class="tbl-sub">—</span>') + '</dd>' +
        '</dl>' +
        Panel.seksi('Layanan diminta', (b.items || []).map(function (i) {
          var s = BIZ.svc(i.serviceId);
          return '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line-2)">' +
            '<div><b style="font-size:13px">' + s.icon + ' ' + U.esc(s.nama) + '</b>' +
            (i.catatan ? '<div class="tbl-sub">' + U.esc(i.catatan) + '</div>' : '') + '</div>' +
            '<div class="spacer"></div><div style="text-align:right"><b>' + U.num(i.qty) + ' ' + U.esc(s.satuan) + '</b>' +
            '<div class="tbl-sub">' + (s.survei ? 'perlu survei' : U.rp(s.hargaMin * i.qty) +
              (s.hargaMax ? ' – ' + U.rp(s.hargaMax * i.qty) : '')) + '</div></div></div>';
        }).join('') +
        '<div class="row mt-2"><b>' + I18N.t('Estimasi total') + '</b><div class="spacer"></div><b style="color:var(--brand-dark)">' +
        BIZ.teksEstimasi(est) + '</b></div>' +
        (est.perluSurvei.length ? UI.alert('warn', '<b>Perlu survei lokasi:</b> ' +
          U.esc(est.perluSurvei.join(', ')), '📐') : '')),
      foot: '<button class="btn btn--wa" data-act="wa">' + I18N.t('💬 Hubungi klien') + '</button>' +
        '<button class="btn btn--ghost" data-act="survei">📐 Jadwalkan survei</button>' +
        '<button class="btn" data-act="quo">' + I18N.t('Buat Penawaran') + '</button>',
      actions: {
        wa: function () { WA.chat(c.telp, 'Halo ' + c.nama + ', terima kasih atas permintaan ' + b.no +
          ' di EXOCLEAN. Boleh kami konfirmasi beberapa detail pekerjaannya?'); },
        survei: function (el) { tutup(el); dialogSurvei(b.id); },
        quo: function (el) { tutup(el); dialogQuotation(null, b.id); }
      }
    });
  }

  function dialogSurvei(bookingId) {
    var b = DB.find('bookings', bookingId);
    UI.formModal({
      title: 'Jadwalkan survei lokasi', sub: b.no + ' • ' + BIZ.klien(b.clientId), okText: 'Jadwalkan & siapkan notifikasi',
      fields: [
        { name: 'tgl', label: I18N.t('Tanggal survei'), type: 'date', value: U.iso(U.addDays(new Date(), 1)), required: true },
        { name: 'jam', label: I18N.t('Jam'), type: 'time', value: '10:00', required: true }
      ]
    }).then(function (d) {
      if (!d) return;
      DB.update('bookings', bookingId, { status: 'survei', surveiTgl: d.tgl, surveiJam: d.jam });
      WA.enqueue('survei_dijadwalkan', b.clientId, { bookingId: bookingId, tgl: d.tgl, jam: d.jam },
        { tipe: 'booking', id: bookingId });
      DB.log('u_admin', 'Menjadwalkan survei ' + b.no, 'booking', bookingId);
      UI.toast('Survei dijadwalkan. Notifikasi WA masuk antrean.', 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ PENAWARAN */
  function renderPenawaran() {
    var list = U.sortBy(DB.all('quotations'), function (q) { return q.createdAt; }, true);
    return UI.card({
      title: I18N.t('Penawaran Harga'), sub: list.length + ' dokumen', flush: true,
      tools: '<button class="btn btn--sm" data-act="quo-baru">' + I18N.t('＋ Penawaran Baru') + '</button>',
      body: UI.table([
        { h: I18N.t('No.'), r: function (q) { return '<div class="code">' + U.esc(q.no) + '</div>' +
          '<div class="tbl-sub">' + U.tgl(q.createdAt) + '</div>'; } },
        { h: I18N.t('Klien'), r: function (q) { return '<div class="tbl-title">' + U.esc(BIZ.klien(q.clientId)) + '</div>' +
          '<div class="tbl-sub">' + (q.items || []).length + ' ' + I18N.t('item') + '</div>'; } },
        { h: I18N.t('Uraian'), r: function (q) { return '<span style="font-size:12.5px">' +
          U.esc(U.potong((q.items[0] || {}).desc || '-', 40)) + '</span>'; } },
        { h: I18N.t('Total'), cls: 'num', r: function (q) { return '<b>' + U.rp(BIZ.totalQuotation(q)) + '</b>'; } },
        { h: I18N.t('Berlaku'), r: function (q) { return U.tgl(q.berlakuHingga); } },
        { h: I18N.t('Status'), r: function (q) { return UI.statusChip('quotation', q.status); } },
        { h: '', cls: 'act', r: function (q) {
          var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-quo" data-id="' + q.id + '">' + I18N.t('Lihat') + '</button>';
          if (q.status === 'draft') b += ' <button class="btn btn--sm" data-act="kirim-quo" data-id="' + q.id + '">' + I18N.t('Kirim') + '</button>';
          if (q.status === 'disetujui' && !DB.where('orders', { quotationId: q.id }).length)
            b += ' <button class="btn btn--sm" data-act="jadwalkan-quo" data-id="' + q.id + '">Jadwalkan</button>';
          return b; } }
      ], list, { icon: '📄', judul: I18N.t('Belum ada penawaran') })
    });
  }

  /** Form penawaran: baris item dinamis. */
  var quoItems = [];
  function dialogQuotation(quotationId, bookingId, clientIdAwal) {
    var q = quotationId ? DB.find('quotations', quotationId) : null;
    var b = bookingId ? DB.find('bookings', bookingId) : null;

    if (q) quoItems = q.items.slice();
    else if (b) quoItems = (b.items || []).map(function (i) {
      var s = BIZ.svc(i.serviceId);
      return { desc: s.nama + (i.catatan ? ' — ' + i.catatan : ''), qty: i.qty, satuan: s.satuan,
        harga: s.hargaMin || 0 };
    });
    else quoItems = [{ desc: '', qty: 1, satuan: 'm²', harga: 0 }];

    var clientId = q ? q.clientId : (b ? b.clientId : (clientIdAwal || BIZ.usersByRole('client')[0].id));

    function barisItem() {
      return quoItems.map(function (it, idx) {
        return '<div class="row wrap mb-1" style="gap:7px;align-items:flex-start">' +
          '<input class="input" style="flex:1;min-width:170px" placeholder="Uraian pekerjaan" value="' +
            U.esc(it.desc) + '" data-change="it-desc" data-i="' + idx + '">' +
          '<input class="input" type="number" step="any" style="width:82px" placeholder="Qty" value="' + it.qty +
            '" data-change="it-qty" data-i="' + idx + '">' +
          '<input class="input" style="width:82px" placeholder="Satuan" value="' + U.esc(it.satuan) +
            '" data-change="it-sat" data-i="' + idx + '">' +
          '<input class="input" type="number" step="any" style="width:126px" placeholder="Harga" value="' + it.harga +
            '" data-change="it-harga" data-i="' + idx + '">' +
          '<button class="btn btn--ghost btn--sm btn--icon" data-act="it-hapus" data-i="' + idx + '">✕</button>' +
          '</div>';
      }).join('');
    }

    function hitung() {
      var sub = U.sum(quoItems, function (i) { return (i.qty || 0) * (i.harga || 0); });
      var disk = Number(U.$('#q-diskon') ? U.$('#q-diskon').value : 0) || 0;
      var ppn = Number(U.$('#q-ppn') ? U.$('#q-ppn').value : 0) || 0;
      var after = sub - disk;
      return { sub: sub, disk: disk, ppn: ppn, total: Math.round(after + after * ppn / 100) };
    }
    function gambarTotal() {
      var h = hitung();
      if (U.$('#q-total')) U.$('#q-total').innerHTML =
        '<div class="row"><span class="tbl-sub">' + I18N.t('Subtotal') + '</span><div class="spacer"></div>' + U.rp(h.sub) + '</div>' +
        (h.disk ? '<div class="row"><span class="tbl-sub">' + I18N.t('Diskon') + '</span><div class="spacer"></div>' +
          '<span style="color:var(--danger)">-' + U.rp(h.disk) + '</span></div>' : '') +
        (h.ppn ? '<div class="row"><span class="tbl-sub">' + I18N.t('Ppn') + ' ' + h.ppn + '%</span><div class="spacer"></div>' +
          U.rp(Math.round((h.sub - h.disk) * h.ppn / 100)) + '</div>' : '') +
        '<div class="row mt-1" style="border-top:1px solid var(--line);padding-top:7px">' +
        '<b>' + I18N.t('Total') + '</b><div class="spacer"></div><b style="font-size:16px;color:var(--brand-dark)">' + U.rp(h.total) + '</b></div>';
    }

    UI.modal({
      title: q ? I18N.t('Ubah penawaran') + ' ' + q.no : I18N.t('Buat Penawaran Harga'),
      sub: b ? I18N.t('Dari permintaan') + ' ' + b.no : '', size: 'wide',
      body:
        '<div class="inline-2">' +
          UI.field({ name: 'clientId', label: I18N.t('Klien'), type: 'select', value: clientId,
            options: BIZ.usersByRole('client').map(function (c) {
              return { value: c.id, label: (c.perusahaan || c.nama) + ' — ' + c.nama }; }) }) +
          UI.field({ name: 'berlakuHingga', label: I18N.t('Berlaku sampai'), type: 'date',
            value: q ? q.berlakuHingga : U.iso(U.addDays(new Date(), 14)) }) +
        '</div>' +
        '<div class="field"><label>' + I18N.t('Rincian pekerjaan') + '</label><div id="q-items">' + barisItem() + '</div>' +
          '<button class="btn btn--soft btn--sm mt-1" data-act="it-tambah">' + I18N.t('＋ Tambah baris') + '</button></div>' +
        '<div class="inline-2">' +
          '<div class="field"><label>Diskon (Rp)</label><input class="input" type="number" id="q-diskon" value="' +
            (q ? q.diskon || 0 : 0) + '" data-change="hitung"></div>' +
          '<div class="field"><label>' + I18N.t('Ppn (%)') + '</label><input class="input" type="number" id="q-ppn" value="' +
            (q ? q.ppn || 0 : 11) + '" data-change="hitung"></div>' +
        '</div>' +
        UI.field({ name: 'catatan', label: 'Catatan / syarat', type: 'textarea', rows: 2,
          value: q ? q.catatan : I18N.t('Harga sudah termasuk peralatan, bahan pembersih, tenaga ahli & penerapan standar K3.') }) +
        '<div class="card" style="background:var(--brand-50);border-color:var(--brand-100)"><div class="card__body" id="q-total"></div></div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn btn--ghost" data-act="simpan">' + I18N.t('Simpan Draft') + '</button>' +
        '<button class="btn" data-act="simpan-kirim">' + I18N.t('Simpan &amp; Siapkan WhatsApp') + '</button>',
      onMount: function () { gambarTotal(); },
      actions: {
        'it-tambah': function () {
          quoItems.push({ desc: '', qty: 1, satuan: 'm²', harga: 0 });
          U.$('#q-items').innerHTML = barisItem(); gambarTotal();
        },
        'it-hapus': function (el) {
          quoItems.splice(Number(el.getAttribute('data-i')), 1);
          if (!quoItems.length) quoItems.push({ desc: '', qty: 1, satuan: 'm²', harga: 0 });
          U.$('#q-items').innerHTML = barisItem(); gambarTotal();
        },
        'it-desc': function (el) { quoItems[+el.getAttribute('data-i')].desc = el.value; },
        'it-sat': function (el) { quoItems[+el.getAttribute('data-i')].satuan = el.value; },
        'it-qty': function (el) { quoItems[+el.getAttribute('data-i')].qty = Number(el.value) || 0; gambarTotal(); },
        'it-harga': function (el) { quoItems[+el.getAttribute('data-i')].harga = Number(el.value) || 0; gambarTotal(); },
        hitung: gambarTotal,
        simpan: function (el) { simpanQuo(el, false); },
        'simpan-kirim': function (el) { simpanQuo(el, true); }
      }
    });

    function simpanQuo(el, kirim) {
      var root = el.closest('.modal');
      var f = U.readForm(root);
      var valid = quoItems.filter(function (i) { return i.desc.trim() && i.qty > 0; });
      if (!valid.length) { UI.toast('Isi minimal satu baris rincian', 'err'); return; }
      var data = {
        items: valid, diskon: Number(U.$('#q-diskon').value) || 0, ppn: Number(U.$('#q-ppn').value) || 0,
        berlakuHingga: f.berlakuHingga, catatan: f.catatan
      };
      var id;
      if (q) { DB.update('quotations', q.id, data); id = q.id; }
      else id = BIZ.buatQuotation(bookingId, f.clientId, data).id;
      tutup(el);
      if (kirim) {
        BIZ.kirimQuotation(id);
        var m = U.sortBy(DB.where('waOutbox', { refId: id }), function (x) { return x.createdAt; }, true)[0];
        UI.toast(I18N.t('Penawaran disimpan & pesan WhatsApp disiapkan'), 'ok');
        if (m) Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
      } else UI.toast(I18N.t('Penawaran tersimpan sebagai draft'), 'ok');
      APP.refresh();
    }
  }

  /* ================================================================ JADWAL (KALENDER) */
  var kalBulan = new Date().getMonth(), kalTahun = new Date().getFullYear();

  function renderJadwal() {
    var awal = new Date(kalTahun, kalBulan, 1);
    var mulaiGrid = U.addDays(awal, -((awal.getDay() + 6) % 7)); // Senin sebagai awal minggu
    var orders = DB.all('orders');
    var perTgl = U.groupBy(orders, function (o) { return o.tgl; });

    var sel = '';
    for (var i = 0; i < 42; i++) {
      var d = U.addDays(mulaiGrid, i), key = U.iso(d);
      var luar = d.getMonth() !== kalBulan;
      var ini = key === U.today();
      var ev = (perTgl[key] || []).sort(function (a, b) { return a.mulai < b.mulai ? -1 : 1; });
      sel += '<div class="cal__day' + (luar ? ' other' : '') + (ini ? ' today' : '') +
        '" data-act="hari" data-tgl="' + key + '">' +
        '<div class="d">' + d.getDate() + '</div>' +
        ev.slice(0, 3).map(function (o) {
          var cls = o.status === 'berjalan' ? 'run' : (o.status === 'diverifikasi' || o.status === 'selesai') ? 'done'
                  : o.status === 'dibatalkan' ? 'cancel' : '';
          return '<div class="cal__ev ' + cls + '" title="' + U.esc(o.judul) + '">' + o.mulai + ' ' +
            U.esc(U.potong(o.judul, 18)) + '</div>';
        }).join('') +
        (ev.length > 3 ? '<div class="cal__more">+' + (ev.length - 3) + ' lagi</div>' : '') +
        '</div>';
    }

    var bulanOrders = orders.filter(function (o) { return o.tgl.slice(0, 7) === U.iso(awal).slice(0, 7); });

    return '<div class="grid g-2-1">' +
      UI.card({
        title: U.BULAN[kalBulan] + ' ' + kalTahun, sub: bulanOrders.length + ' ' + I18N.t('pekerjaan terjadwal bulan ini'),
        tools: '<button class="btn btn--ghost btn--sm" data-act="bulan-prev">‹</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="bulan-now">' + I18N.t('Hari ini') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="bulan-next">›</button>' +
          '<button class="btn btn--sm" data-act="order-baru">＋ Order</button>',
        body: '<div class="cal">' + ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(function (h) {
          return '<div class="cal__dow">' + h + '</div>'; }).join('') + sel + '</div>' +
          '<div class="row wrap mt-3" style="gap:14px;font-size:11.5px;color:var(--muted)">' +
          '<span><i class="cal__ev" style="display:inline-block;padding:2px 8px">' + I18N.t('Dijadwalkan') + '</i></span>' +
          '<span><i class="cal__ev run" style="display:inline-block;padding:2px 8px">' + I18N.t('Berjalan') + '</i></span>' +
          '<span><i class="cal__ev done" style="display:inline-block;padding:2px 8px">' + I18N.t('Selesai') + '</i></span></div>'
      }) +
      UI.card({ title: I18N.t('Ketersediaan petugas'), sub: I18N.t('Beban kerja bulan ini'), flush: true,
        body: '<div class="mini-list">' + BIZ.usersByRole('worker').map(function (w) {
          var n = bulanOrders.filter(function (o) { return (o.workerIds || []).indexOf(w.id) >= 0; }).length;
          return '<div class="mini-item">' + UI.avatar(w.nama, 'sm') +
            '<div style="min-width:0;flex:1"><b>' + U.esc(w.nama) + '</b><small>' + U.esc(w.jabatan) + '</small>' +
            '<div class="mt-1">' + UI.progress(Math.min(100, n / 12 * 100), n > 10 ? 'warn' : '') + '</div></div>' +
            '<div class="right"><b>' + n + '</b><small>order</small></div></div>';
        }).join('') + '</div>' }) +
    '</div>';
  }

  function dialogHari(tgl) {
    var list = U.sortBy(DB.all('orders').filter(function (o) { return o.tgl === tgl; }), function (o) { return o.mulai; });
    UI.modal({
      title: U.tglPanjang(tgl), sub: list.length + ' ' + I18N.t('pekerjaan terjadwal'), size: 'wide',
      body: list.length ? list.map(function (o) {
        return '<div class="order-card"><div class="top"><div style="min-width:0;flex:1">' +
          '<div class="row" style="gap:8px"><b class="code">' + o.mulai + '–' + o.selesai + '</b>' +
          UI.statusChip('order', o.status) + '</div>' +
          '<h4 class="mt-1">' + U.esc(o.judul) + '</h4>' +
          '<div class="meta"><span>👤 ' + U.esc(BIZ.klien(o.clientId)) + '</span>' +
          '<span>👥 ' + ((o.workerIds || []).map(BIZ.nama).join(', ') || I18N.t('belum ditugaskan')) + '</span></div></div>' +
          '<div class="col" style="gap:6px">' +
          '<button class="btn btn--ghost btn--sm" data-act="detail" data-id="' + o.id + '">' + I18N.t('Detail') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="edit-order" data-id="' + o.id + '">' + I18N.t('Ubah') + '</button>' +
          '</div></div></div>';
      }).join('') : UI.empty('📅', I18N.t('Tidak ada pekerjaan'), I18N.t('Tambahkan order baru untuk tanggal ini.')),
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>' +
        '<button class="btn" data-act="tambah">' + I18N.t('＋ Order pada tanggal ini') + '</button>',
      actions: {
        detail: function (el) { Panel.detailOrder(el.getAttribute('data-id')); },
        'edit-order': function (el) { tutup(el); dialogOrder(el.getAttribute('data-id')); },
        tambah: function (el) { tutup(el); dialogOrder(null, { tgl: tgl }); }
      }
    });
  }

  /* ---- form order ---- */
  function dialogOrder(orderId, prefill) {
    var o = orderId ? BIZ.order(orderId) : null;
    prefill = prefill || {};
    var pilihWorker = o ? (o.workerIds || []).slice() : [];
    var pilihService = o ? (o.serviceIds || []).slice() : (prefill.serviceIds || []);

    /**
     * Mitra yang boleh ditugaskan harus lolos DUA saringan: onboarding selesai,
     * dan tersertifikasi untuk seluruh fungsi kerja yang dituntut layanan pada
     * order ini. Yang belum kompeten tetap ditampilkan tetapi tidak bisa
     * dicentang — supaya admin tahu siapa yang ada dan apa yang kurang, bukan
     * sekadar melihat daftar yang menyusut tanpa penjelasan.
     */
    function daftarWorker() {
      var aktif = BIZ.mitraAktif();
      var belum = BIZ.usersByRole('worker').length - aktif.length;
      var orderSemu = { serviceIds: pilihService };
      var perlu = KOMPETENSI.fungsiOrder(orderSemu);

      var baris = aktif.map(function (w) {
        var cek = KOMPETENSI.periksaOrder(w, orderSemu);
        var kurang = cek.kurang.map(function (f) { return f.nama; }).join(', ');
        return '<label class="check' + (cek.boleh ? '' : ' check--mati') + '" style="padding:5px 0">' +
          '<input type="checkbox" data-change="pilih-w" data-id="' + w.id + '"' +
          (pilihWorker.indexOf(w.id) >= 0 ? ' checked' : '') + (cek.boleh ? '' : ' disabled') + '>' +
          '<span>' + U.esc(w.nama) + ' <span class="tbl-sub">— ' + U.esc(w.jabatan) + '</span>' +
          (cek.boleh ? '' : '<div class="tbl-sub">' + I18N.t('🔒 belum tersertifikasi:') + ' ' + U.esc(kurang) + '</div>') +
          '</span></label>';
      }).join('');

      var siap = aktif.filter(function (w) {
        return KOMPETENSI.periksaOrder(w, orderSemu).boleh; }).length;

      return (perlu.length
        ? '<div class="tbl-sub mb-2">' + I18N.t('Kompetensi yang dibutuhkan:') + ' ' +
          perlu.map(function (k) { var f = KOMPETENSI.fungsi(k);
            return '<span class="chip chip--soft chip--xs">' + (f ? f.ikon + ' ' + U.esc(f.nama) : k) +
            '</span>'; }).join('') + '</div>'
        : '') +
        (perlu.length && !siap
          ? UI.alert('danger', '<b>' + I18N.t('Tidak ada mitra yang tersertifikasi') + '</b> ' + I18N.t('untuk gabungan layanan ini.') + ' ' +
            I18N.t('Kurangi layanan pada order, atau dorong mitra mengambil kursusnya di menu') + ' ' +
            '<b>Fungsi Kerja &amp; Kompetensi</b>.', '⚠️')
          : '') +
        baris +
        (belum ? '<div class="tbl-sub mt-2">' + belum + ' ' + I18N.t('mitra lain belum bisa ditugaskan karena') + ' ' +
          I18N.t('proses bergabungnya belum selesai.') + ' <a href="#" data-act="ke-mitra">' + I18N.t('Lihat daftar mitra →') + '</a></div>' : '');
    }
    function daftarService() {
      var svc = DB.all('services').filter(function (s) { return s.tipe === 'layanan' && s.aktif !== false; });
      var grup = U.groupBy(svc, function (s) { return s.kategori || 'Lainnya'; });
      return Object.keys(grup).map(function (kat) {
        return '<div class="nav-group" style="padding:8px 0 2px">' + U.esc(kat) + '</div>' +
          grup[kat].map(function (s) {
            return '<label class="check" style="padding:5px 0"><input type="checkbox" data-change="pilih-s" data-id="' +
              s.id + '"' + (pilihService.indexOf(s.id) >= 0 ? ' checked' : '') + '>' +
              '<span>' + (s.icon || s.ikon || '') + ' ' + U.esc(s.nama) + '</span></label>';
          }).join('');
      }).join('');
    }

    /* Order lama menyimpan alamat sebagai satu baris; ia dipecah kembali
       menjadi kolom supaya bisa disunting, bukan ditolak karena bentuknya
       lama. Prefill dari prospek CRM juga masuk lewat jalur yang sama. */
    var wOrder = alamatAwal(o ? { alamat: o.alamat, wilayah: o.wilayah }
                             : { alamat: prefill.alamat || '',
                                 wilayah: prefill.wilayah || null });

    UI.modal({
      title: o ? I18N.t('Ubah order') + ' ' + o.no : 'Order Baru', size: 'wide',
      body:
        UI.field({ name: 'judul', label: I18N.t('Judul pekerjaan'), required: true, value: o ? o.judul : (prefill.judul || ''),
          placeholder: 'mis. General Cleaning Gedung — Lantai 1–3' }) +
        '<div class="inline-2">' +
          UI.field({ name: 'clientId', label: I18N.t('Klien'), type: 'select', value: o ? o.clientId : prefill.clientId,
            options: BIZ.usersByRole('client').map(function (c) {
              return { value: c.id, label: c.perusahaan || c.nama }; }) }) +
          UI.field({ name: 'nilai', label: I18N.t('Nilai pekerjaan (Rp)'), type: 'number',
            value: o ? o.nilai : (prefill.nilai || 0) }) +
        '</div>' +
        '<div class="mcs-fs">' + I18N.t('Alamat lokasi pekerjaan') +
          '<span>' + I18N.t('Kolom yang sama dengan alamat klien — bukan teks bebas,') + ' ' +
          I18N.t('supaya lokasinya bisa dicari dan dipakai menghitung.') + '</span></div>' +
        WILAYAH.fields(wOrder).map(function (fl) { return UI.field(fl); }).join('') +
        '<div class="inline-3">' +
          UI.field({ name: 'tgl', label: I18N.t('Tanggal'), type: 'date', required: true,
            value: o ? o.tgl : (prefill.tgl || U.iso(U.addDays(new Date(), 1))) }) +
          UI.field({ name: 'mulai', label: I18N.t('Jam mulai'), type: 'time', value: o ? o.mulai : '08:00' }) +
          UI.field({ name: 'selesai', label: I18N.t('Jam selesai'), type: 'time', value: o ? o.selesai : '15:00' }) +
        '</div>' +
        '<div class="inline-2">' +
          UI.field({ name: 'teamId', label: I18N.t('Tim'), type: 'select', value: o ? o.teamId : '',
            options: [{ value: '', label: I18N.t('— pilih tim —') }].concat(DB.all('teams').map(function (t) {
              return { value: t.id, label: t.nama + ' (' + BIZ.nama(t.supervisorId) + ')' }; })) }) +
          UI.field({ name: 'supervisorId', label: I18N.t('Supervisor'), type: 'select', value: o ? o.supervisorId : '',
            options: [{ value: '', label: I18N.t('— pilih supervisor —') }].concat(BIZ.usersByRole('supervisor').map(function (s) {
              return { value: s.id, label: s.nama }; })) }) +
        '</div>' +
        '<div class="inline-2">' +
          '<div class="field"><label>' + I18N.t('Layanan (menentukan checklist petugas)') + '</label>' +
            '<div style="max-height:168px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 11px">' +
            daftarService() + '</div></div>' +
          '<div class="field"><label>' + I18N.t('Petugas ditugaskan') + '</label>' +
            '<div id="daftar-worker" style="max-height:168px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 11px">' +
            daftarWorker() + '</div>' +
            '<div class="hint" id="bentrok-info"></div></div>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        (o ? '<button class="btn btn--danger" data-act="batalkan">' + I18N.t('Batalkan Order') + '</button>' : '') +
        '<button class="btn" data-act="simpan">' + (o ? 'Simpan Perubahan' : I18N.t('Buat & Kirim Penugasan')) + '</button>',
      actions: {
        'pilih-w': function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) pilihWorker.push(id);
          else pilihWorker = pilihWorker.filter(function (x) { return x !== id; });
          cekBentrok();
        },
        'pilih-s': function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) pilihService.push(id);
          else pilihService = pilihService.filter(function (x) { return x !== id; });

          /* Kompetensi yang dibutuhkan berubah begitu layanan berubah, jadi
             daftar petugas digambar ulang. Petugas yang sudah tercentang tetapi
             menjadi tidak kompeten ikut dilepas — bukan dibiarkan tersimpan
             diam-diam pada order yang tidak boleh ia kerjakan. */
          var orderSemu = { serviceIds: pilihService };
          pilihWorker = pilihWorker.filter(function (wid) {
            var w = DB.find('users', wid);
            return w && KOMPETENSI.periksaOrder(w, orderSemu).boleh;
          });
          var kotak = document.getElementById('daftar-worker');
          if (kotak) kotak.innerHTML = daftarWorker();
          cekBentrok();
        },
        batalkan: function (el) {
          UI.konfirm({ title: I18N.t('Batalkan order') + ' ' + o.no + '?', danger: true,
            text: I18N.t('Order akan ditandai dibatalkan. Riwayatnya tetap tersimpan.') }).then(function (ya) {
            if (!ya) return;
            DB.update('orders', o.id, { status: 'dibatalkan' });
            tutup(el); UI.toast('Order dibatalkan', 'ok'); APP.refresh();
          });
        },
        simpan: function (el) {
          var f = U.readForm(el.closest('.modal'));
          var wil = WILAYAH.dariForm(f);
          var alamatLama = o ? o.alamat : (prefill.alamat || '');
          if (alamatBerubah(wOrder, f) || !alamatLama) {
            var salahAlamat = WILAYAH.periksa(wil);
            if (salahAlamat) { UI.toast(salahAlamat, 'err'); return; }
            /* Satu baris DITURUNKAN, tidak diketik terpisah — invoice, pesan
               WhatsApp, dan layar petugas semuanya membaca bentuk ini. */
            f.alamat = WILAYAH.teks(wil, { denganNegara: false });
          } else {
            /* Order lama yang alamatnya tidak disentuh disimpan apa adanya.
               Hasil urai yang belum lengkap tidak boleh menimpa alamat yang
               selama ini dipakai petugas untuk sampai ke lokasi. */
            f.alamat = alamatLama;
            wil = (o && o.wilayah) || null;
          }
          if (!f.judul || !f.tgl) { UI.toast(I18N.t('Judul dan tanggal wajib diisi'), 'err'); return; }
          if (f.mulai >= f.selesai) { UI.toast(I18N.t('Jam selesai harus setelah jam mulai'), 'err'); return; }
          var data = {
            judul: f.judul, clientId: f.clientId, alamat: f.alamat, wilayah: wil, nilai: f.nilai || 0,
            tgl: f.tgl, mulai: f.mulai, selesai: f.selesai,
            teamId: f.teamId || null, supervisorId: f.supervisorId || null,
            serviceIds: pilihService, workerIds: pilihWorker
          };
          if (o) {
            var jadwalBerubah = o.tgl !== data.tgl || o.mulai !== data.mulai || o.selesai !== data.selesai;
            var workerBaru = pilihWorker.filter(function (w) { return (o.workerIds || []).indexOf(w) < 0; });
            // checklist ikut diperbarui bila daftar layanan berubah
            if (JSON.stringify(o.serviceIds) !== JSON.stringify(pilihService)) data.checklist = BIZ.checklistDari(pilihService);
            DB.update('orders', o.id, data);
            workerBaru.forEach(function (wid) {
              WA.enqueue('penugasan_worker', wid, { orderId: o.id, workerId: wid }, { tipe: 'order', id: o.id });
            });
            if (jadwalBerubah) {
              WA.enqueue('jadwal_dikonfirmasi', o.clientId, { orderId: o.id }, { tipe: 'order', id: o.id });
              (o.workerIds || []).forEach(function (wid) {
                WA.enqueue('jadwal_berubah', wid, { orderId: o.id }, { tipe: 'order', id: o.id });
              });
            }
            UI.toast('Order diperbarui' + (jadwalBerubah ? ' & notifikasi perubahan disiapkan' : ''), 'ok');
          } else {
            BIZ.buatOrder(data);
            UI.toast(I18N.t('Order dibuat. Notifikasi jadwal & penugasan masuk antrean WA.'), 'ok');
          }
          tutup(el); APP.refresh();
        }
      },
      onMount: function (back) { WILAYAH.pasang(back); cekBentrok(); }
    });

    function cekBentrok() {
      var box = U.$('#bentrok-info');
      if (!box) return;
      var tgl = U.$('[name=tgl]').value, m = U.$('[name=mulai]').value, s = U.$('[name=selesai]').value;
      var hits = BIZ.bentrok(orderId, tgl, m, s, pilihWorker);
      box.innerHTML = hits.length
        ? '<span style="color:var(--danger)">⚠️ Bentrok: ' + hits.map(function (h) {
            return BIZ.nama(h.workerId) + ' (' + h.order.no + ')'; }).join(', ') + '</span>'
        : (pilihWorker.length ? '<span style="color:var(--ok)">' + I18N.t('✓ Tidak ada jadwal bentrok') + '</span>' : '');
    }
  }

  /* ================================================================ ORDER */
  var fOrder = 'aktif';
  function renderOrder() {
    var all = U.sortBy(DB.all('orders'), function (o) { return o.tgl; }, true);
    var grup = {
      aktif: all.filter(function (o) { return ['dijadwalkan', 'berjalan'].indexOf(o.status) >= 0; }),
      verifikasi: all.filter(function (o) { return ['selesai', 'perbaikan'].indexOf(o.status) >= 0; }),
      selesai: all.filter(function (o) { return o.status === 'diverifikasi'; }),
      semua: all
    };
    var list = grup[fOrder] || all;

    return UI.tabs([
      { key: 'aktif', label: I18N.t('Aktif'), n: grup.aktif.length },
      { key: 'verifikasi', label: 'Perlu verifikasi', n: grup.verifikasi.length },
      { key: 'selesai', label: I18N.t('Selesai'), n: grup.selesai.length },
      { key: 'semua', label: I18N.t('Semua'), n: all.length }
    ], fOrder, 'tab-order') +
    UI.card({ flush: true, body: UI.table([
      { h: I18N.t('No. / Tanggal'), r: function (o) { return '<div class="code">' + U.esc(o.no) + '</div>' +
        '<div class="tbl-sub">' + U.tgl(o.tgl) + ' • ' + o.mulai + '</div>'; } },
      { h: I18N.t('Pekerjaan'), r: function (o) { return '<div class="tbl-title">' + U.esc(U.potong(o.judul, 42)) + '</div>' +
        '<div class="tbl-sub">' + U.esc(BIZ.klien(o.clientId)) + '</div>'; } },
      { h: I18N.t('Tim'), r: function (o) { return '<div class="row" style="gap:3px">' +
        ((o.workerIds || []).map(function (w) { return UI.avatar(BIZ.nama(w), 'sm'); }).join('') ||
        '<span class="tbl-sub">' + I18N.t('belum ada') + '</span>') + '</div>'; } },
      { h: 'Progres', w: '120px', r: function (o) { var p = BIZ.progresChecklist(o);
        return UI.progress(p.pct, p.pct === 100 ? 'ok' : '') + '<div class="tbl-sub mt-1">' + p.done + '/' + p.total + '</div>'; } },
      { h: I18N.t('Nilai rupiah'), cls: 'num', r: function (o) { return U.rp(o.nilai); } },
      { h: I18N.t('Status'), r: function (o) { return UI.statusChip('order', o.status); } },
      { h: '', cls: 'act', r: function (o) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="detail" data-id="' + o.id + '">' + I18N.t('Detail') + '</button>';
        b += ' <button class="btn btn--ghost btn--sm" data-act="edit-order" data-id="' + o.id + '">' + I18N.t('Ubah') + '</button>';
        if (o.status === 'diverifikasi' && !BIZ.invoiceOrder(o.id))
          b += ' <button class="btn btn--sm" data-act="buat-inv" data-id="' + o.id + '">' + I18N.t('Invoice') + '</button>';
        return b; } }
    ], list, { icon: '📋', judul: I18N.t('Tidak ada order di kategori ini') }) });
  }

  /* ================================================================ INVOICE */
  function renderInvoice() {
    var list = U.sortBy(DB.all('invoices'), function (i) { return i.terbitAt; }, true);
    var belum = list.filter(function (i) { return i.status !== 'lunas'; });
    var siapTagih = DB.all('orders').filter(function (o) {
      return o.status === 'diverifikasi' && !BIZ.invoiceOrder(o.id) && o.nilai > 0; });

    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: I18N.t('Total tertagih'), small: true, valueHTML: U.rpShort(U.sum(list, function (i) { return i.total; })),
        icon: '🧾', meta: list.length + ' invoice' }) +
      UI.stat({ label: I18N.t('Sudah dibayar'), small: true, valueHTML: U.rpShort(U.sum(list, function (i) { return BIZ.terbayar(i); })),
        icon: '✅', meta: list.filter(function (i) { return i.status === 'lunas'; }).length + ' lunas' }) +
      UI.stat({ label: 'Piutang berjalan', small: true, valueHTML: U.rpShort(U.sum(belum, function (i) { return BIZ.sisaTagihan(i); })),
        icon: '⏳', meta: belum.length + ' ' + I18N.t('belum lunas') }) +
      UI.stat({ label: I18N.t('Jatuh tempo'), value: list.filter(function (i) { return i.status === 'jatuh_tempo'; }).length,
        icon: '🔴', meta: 'perlu ditagih' }) +
    '</div>' +

    (siapTagih.length ? UI.alert('brand', '<b>' + siapTagih.length + ' ' + I18N.t('pekerjaan sudah diverifikasi tapi belum ditagih.') + '</b> ' +
      siapTagih.map(function (o) { return '<a href="#" data-act="buat-inv" data-id="' + o.id + '">' +
        U.esc(o.no) + '</a>'; }).join(', '), '💡') + '<div class="mb-3"></div>' : '') +

    UI.card({ title: 'Daftar Invoice', flush: true, body: UI.table([
      { h: I18N.t('No.'), r: function (i) { return '<div class="code">' + U.esc(i.no) + '</div>' +
        '<div class="tbl-sub">' + U.tgl(i.terbitAt) + '</div>'; } },
      { h: I18N.t('Klien / Sumber'), r: function (i) { var s = BIZ.sumberInvoice(i);
        return '<div class="tbl-title">' + U.esc(BIZ.klien(i.clientId)) + '</div>' +
        '<div class="tbl-sub">' + (s.tipe === 'toko' ? '🛒 ' : '🧹 ') + U.esc(s.no) + '</div>'; } },
      { h: I18N.t('Jatuh tempo'), r: function (i) { return U.tgl(i.jatuhTempo) + '<div class="tbl-sub">' + U.relatif(i.jatuhTempo) + '</div>'; } },
      { h: I18N.t('Total'), cls: 'num', r: function (i) { return '<b>' + U.rp(i.total) + '</b>'; } },
      { h: I18N.t('Sisa tagihan'), cls: 'num', r: function (i) { var s = BIZ.sisaTagihan(i);
        return s ? '<span style="color:var(--danger)">' + U.rp(s) + '</span>' : '<span style="color:var(--ok)">lunas</span>'; } },
      { h: I18N.t('Status'), r: function (i) { return UI.statusChip('invoice', i.status); } },
      { h: I18N.t('Pembayaran'), r: function (i) {
        var tx = PAY.txAktif(i.id);
        if (tx) return UI.statusChip('paytx', tx.status) + '<div class="tbl-sub mt-1">' + U.esc(tx.channelNama) + '</div>';
        var lunasTx = PAY.txInvoice(i.id).filter(function (t) { return t.status === 'paid'; })[0];
        return lunasTx ? '<span class="tbl-sub">' + U.esc(lunasTx.channelNama) + '</span>'
                       : '<span class="tbl-sub">' + I18N.t('belum ada tautan') + '</span>'; } },
      { h: '', cls: 'act', r: function (i) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-inv" data-id="' + i.id + '">' + I18N.t('Lihat') + '</button>';
        if (i.status !== 'lunas') {
          b += ' <button class="btn btn--ghost btn--sm" data-act="tagih" data-id="' + i.id + '">💬 Tagih</button>';
          b += ' <button class="btn btn--ghost btn--sm" data-act="link-bayar" data-id="' + i.id + '">🔗 Link Bayar</button>';
          b += ' <button class="btn btn--sm" data-act="catat-bayar" data-id="' + i.id + '">Catat Bayar</button>';
        }
        return b; } }
    ], list, { icon: '🧾', judul: I18N.t('Belum ada invoice') }) });
  }

  /* ================================================================ WA OUTBOX */
  var fWa = 'antre';
  function renderWA() {
    var all = U.sortBy(DB.all('waOutbox'), function (m) { return m.createdAt; }, true);
    var grup = { antre: all.filter(function (m) { return m.status === 'antre'; }),
                 terkirim: all.filter(function (m) { return m.status === 'terkirim'; }), semua: all };
    var list = grup[fWa] || all;

    return UI.alert('info',
      '<b>' + I18N.t('Cara kerja notifikasi WhatsApp di prototipe ini.') + '</b> ' + I18N.t('Setiap kejadian penting otomatis menyusun draf pesan') + ' ' +
      I18N.t('di sini. Tekan') + ' <b>' + I18N.t('Kirim') + '</b> ' + I18N.t('untuk membuka WhatsApp dengan teks yang sudah terisi. Bila nanti berlangganan') + ' ' +
      I18N.t('WhatsApp Business API resmi, pesan-pesan ini bisa terkirim otomatis tanpa klik.'), '💬') +
    '<div class="mb-3"></div>' +
    UI.tabs([
      { key: 'antre', label: I18N.t('Menunggu dikirim'), n: grup.antre.length },
      { key: 'terkirim', label: I18N.t('Terkirim'), n: grup.terkirim.length },
      { key: 'semua', label: I18N.t('Semua'), n: all.length }
    ], fWa, 'tab-wa') +
    UI.card({ flush: true,
      tools: grup.antre.length ? '<button class="btn btn--wa btn--sm" data-act="kirim-semua">' + I18N.t('Kirim semua (') +
        grup.antre.length + ')</button>' : '',
      body: list.length ? '<div>' + list.map(function (m) {
        var u = BIZ.user(m.to);
        return '<div class="wa-out' + (m.status === 'terkirim' ? ' sent' : '') + '">' +
          '<div class="ic">💬</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div class="row" style="gap:8px"><b style="font-size:13px">' + U.esc(u ? u.nama : '—') + '</b>' +
            '<span class="tbl-sub">' + U.esc(u ? U.phoneDisplay(u.telp) : '') + '</span>' +
            '<span class="chip chip--muted" style="font-size:10px">' + U.esc(WA.LABEL[m.template] ? I18N.t(WA.LABEL[m.template]) : m.template) + '</span></div>' +
            '<div class="tbl-sub" style="margin-top:3px">' + U.esc(U.potong(m.pesan.replace(/\n/g, ' '), 92)) + '</div>' +
          '</div>' +
          '<div class="right" style="text-align:right"><div class="tbl-sub">' + U.sejak(m.createdAt) + '</div>' +
          '<div class="row mt-1" style="gap:5px;justify-content:flex-end">' +
            '<button class="btn btn--ghost btn--sm" data-act="lihat-wa" data-id="' + m.id + '">' + I18N.t('Lihat') + '</button>' +
            (m.status === 'antre' ? '<button class="btn btn--wa btn--sm" data-act="kirim-wa" data-id="' + m.id +
              '">' + I18N.t('Kirim') + '</button>' : '') +
          '</div></div></div>';
      }).join('') + '</div>' : UI.empty('💬', I18N.t('Tidak ada pesan'), I18N.t('Antrean pesan akan terisi otomatis dari aktivitas sistem.')) });
  }

  /* ================================================================ MASTER DATA */
  function renderKlien() {
    var list = BIZ.usersByRole('client');
    return UI.card({ title: I18N.t('Data Klien'), sub: list.length + ' ' + I18N.t('klien terdaftar'), flush: true,
      tools: '<button class="btn btn--sm" data-act="klien-baru">' + I18N.t('＋ Klien Baru') + '</button>',
      body: UI.table([
        { h: I18N.t('Klien'), r: function (c) { return '<div class="row">' + UI.avatar(c.perusahaan || c.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(c.perusahaan || c.nama) + '</div>' +
          '<div class="tbl-sub">' + U.esc(c.nama) + '</div></div></div>'; } },
        { h: I18N.t('Kontak'), r: function (c) { return U.phoneDisplay(c.telp) + '<div class="tbl-sub">' + U.esc(c.email) + '</div>'; } },
        { h: I18N.t('Alamat'), r: function (c) { return '<span class="tbl-sub">' + U.esc(U.potong(c.alamat || '—', 46)) + '</span>'; } },
        { h: I18N.t('Order'), cls: 'num', r: function (c) { return DB.where('orders', { clientId: c.id }).length; } },
        { h: I18N.t('Nilai rupiah'), cls: 'num', r: function (c) { return U.rpShort(U.sum(DB.where('invoices', { clientId: c.id }),
          function (i) { return i.total; })); } },
        { h: '', cls: 'act', r: function (c) {
          return '<button class="btn btn--ghost btn--sm" data-act="wa-user" data-id="' + c.id + '">💬</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="edit-user" data-id="' + c.id + '">' + I18N.t('Ubah') + '</button>'; } }
      ], list) });
  }

  function renderPegawai() {
    var spv = BIZ.usersByRole('supervisor'), wk = BIZ.usersByRole('worker');
    return '<div class="grid g-2 mb-3">' +
      UI.card({ title: 'Tim Kerja', sub: DB.all('teams').length + ' tim', flush: true,
        tools: '<button class="btn btn--sm" data-act="tim-baru">＋ Tim</button>',
        body: '<div class="mini-list">' + DB.all('teams').map(function (t) {
          return '<div class="mini-item"><div style="min-width:0;flex:1">' +
            '<b>' + U.esc(t.nama) + '</b><small>' + U.esc(t.spesialisasi || '') + '</small>' +
            '<div class="row mt-1" style="gap:3px">' + t.memberIds.map(function (m) {
              return UI.avatar(BIZ.nama(m), 'sm'); }).join('') + '</div></div>' +
            '<div class="right"><div class="chip chip--brand">' + U.esc(BIZ.nama(t.supervisorId)) + '</div>' +
            '<div class="mt-1"><button class="btn btn--ghost btn--sm" data-act="edit-tim" data-id="' + t.id +
            '">' + I18N.t('Ubah') + '</button></div></div></div>';
        }).join('') + '</div>' }) +
      UI.card({ title: I18N.t('Supervisor'), flush: true,
        body: '<div class="mini-list">' + spv.map(function (s) {
          var tim = DB.where('teams', { supervisorId: s.id });
          return '<div class="mini-item">' + UI.avatar(s.nama, 'sm') +
            '<div style="min-width:0"><b>' + U.esc(s.nama) + '</b><small>' + U.phoneDisplay(s.telp) + ' • ' +
            tim.length + ' tim</small></div>' +
            '<div class="right"><button class="btn btn--ghost btn--sm" data-act="edit-user" data-id="' + s.id +
            '">' + I18N.t('Ubah') + '</button></div></div>';
        }).join('') + '</div>' }) +
    '</div>' +
    (function () {
      var kejar = BIZ.berkasBermasalah();
      if (!kejar.length) return '';
      return UI.alert('warn', '<b>' + kejar.length + ' berkas kepegawaian perlu ditindaklanjuti:</b> ' +
        kejar.map(function (u) {
          var st = BIZ.statusBerlakuId(BIZ.identitas(u));
          var ket = st === 'kedaluwarsa' ? 'identitas kedaluwarsa'
            : st === 'segera' ? 'identitas segera habis'
            : BIZ.kelengkapanBerkas(u).kurang.length + ' ' + I18N.t('data kurang');
          return '<a href="#" data-act="berkas" data-id="' + u.id + '">' + U.esc(u.nama) +
            '</a> <span class="tbl-sub">(' + ket + ')</span>';
        }).join(' • '), '🆔') + '<div class="mb-3"></div>';
    })() +

    UI.card({ title: I18N.t('Tenaga Kerja Lapangan'), sub: wk.length + ' petugas', flush: true,
      tools: '<button class="btn btn--sm" data-act="pegawai-baru">' + I18N.t('＋ Petugas') + '</button>',
      body: UI.table([
        { h: I18N.t('Nama'), r: function (w) { return '<div class="row">' + UI.avatar(w.nama, 'sm') +
          '<div><div class="tbl-title">' + U.esc(w.nama) + '</div><div class="tbl-sub">' + U.esc(w.jabatan) + '</div></div></div>'; } },
        { h: I18N.t('Kontak'), r: function (w) { return U.phoneDisplay(w.telp); } },
        { h: I18N.t('Tim'), r: function (w) { var t = DB.all('teams').filter(function (x) { return x.memberIds.indexOf(w.id) >= 0; })[0];
          return t ? '<span class="chip chip--brand">' + U.esc(t.nama) + '</span>' : '<span class="tbl-sub">—</span>'; } },
        { h: I18N.t('Sertifikat'), r: function (w) { return (w.sertifikat || []).length
          ? w.sertifikat.map(function (s) { return '<span class="chip" style="font-size:10.5px">' + U.esc(s) + '</span>'; }).join(' ')
          : '<span class="tbl-sub">—</span>'; } },
        { h: I18N.t('Berkas'), r: function (w) {
          var l = BIZ.kelengkapanBerkas(w), st = BIZ.statusBerlakuId(BIZ.identitas(w));
          if (st === 'kedaluwarsa') return '<span class="chip chip--danger chip--dot">Identitas kedaluwarsa</span>';
          if (st === 'segera') return '<span class="chip chip--warn chip--dot">Identitas segera habis</span>';
          if (l.kurang.length) return '<span class="chip chip--warn">' + l.lengkap + '/' + l.total + ' ' + I18N.t('terisi') + '</span>';
          return BIZ.identitas(w).diverifikasi
            ? '<span class="chip chip--ok">' + I18N.t('Lengkap &amp; terverifikasi') + '</span>'
            : '<span class="chip chip--info">' + I18N.t('Lengkap, belum diverifikasi') + '</span>'; } },
        { h: I18N.t('Order'), cls: 'num', r: function (w) { return DB.all('orders').filter(function (o) {
          return (o.workerIds || []).indexOf(w.id) >= 0; }).length; } },
        { h: '', cls: 'act', r: function (w) {
          return '<button class="btn btn--ghost btn--sm" data-act="wa-user" data-id="' + w.id + '">💬</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="berkas" data-id="' + w.id + '">🆔 Berkas</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="edit-user" data-id="' + w.id + '">' + I18N.t('Ubah') + '</button>'; } }
      ], wk) });
  }

  /* ====================================================== KATALOG LAYANAN
     MENGHIDUPKAN DAN MEMATIKAN, BUKAN MENGHAPUS

     Layanan yang dimatikan tidak hilang: ia berhenti ditawarkan untuk
     pemesanan BARU, sementara pekerjaan, penawaran, dan invoice yang sudah
     terlanjur memakainya tetap utuh. Menghapusnya akan membuat riwayat
     menunjuk ke layanan yang tidak ada lagi — dan laporan tahun lalu ikut
     rusak karena keputusan hari ini.

     Saklarnya ada DI BARIS, bukan di dalam dialog Ubah. Yang ingin dilakukan
     orang di sini hampir selalu satu ketukan — dan mengubur satu ketukan di
     balik formulir tujuh kolom membuatnya terasa seperti fitur yang tidak
     ada. */
  var cariSvc = '';
  var fSvc = 'semua';

  /** Berapa pekerjaan yang MASIH BERJALAN memakai layanan ini. */
  function layananTerpakai(svcId) {
    var jalan = ['baru', 'dijadwalkan', 'berjalan'];
    return DB.all('orders').filter(function (o) {
      return jalan.indexOf(o.status) >= 0 && (o.serviceIds || []).indexOf(svcId) >= 0;
    }).length;
  }

  function saklarSvc(s) {
    var on = s.aktif !== false;
    return '<button class="sw' + (on ? ' sw--on' : '') + '" data-act="svc-aktif" data-id="' +
      U.esc(s.id) + '" role="switch" aria-checked="' + on + '" title="' +
      (on ? I18N.t('Matikan layanan ini') : I18N.t('Hidupkan layanan ini')) + '"><i></i></button>';
  }

  function renderLayanan() {
    var semua = U.sortBy(DB.all('services'), function (s) { return s.urutan; });
    var q = cariSvc.toLowerCase().trim();
    var mati = semua.filter(function (s) { return s.aktif === false; });

    var list = semua.filter(function (s) {
      if (fSvc === 'aktif' && s.aktif === false) return false;
      if (fSvc === 'mati' && s.aktif !== false) return false;
      if (q && (s.nama + ' ' + s.kode + ' ' + (s.kategori || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var grup = U.groupBy(list, function (s) { return s.kategori; });

    return UI.alert('brand', '<b>' + I18N.t('Katalog ini yang dilihat klien saat memesan.') + '</b> ' +
      I18N.t('Layanan yang dimatikan berhenti ditawarkan untuk pemesanan baru —') + ' ' +
      I18N.t('pekerjaan, penawaran, dan invoice yang sudah memakainya tidak terpengaruh.') + ' ' +
      I18N.t('Checklist di aplikasi tenaga lapangan juga berasal dari sini.'), '📚') +
      '<div class="mb-3"></div>' +

      /* Katalog bisa kosong sama sekali — saat pertama dipasang, atau saat
         sengaja dirombak. Tanpa tombol ini tidak ada jalan sama sekali untuk
         mengisinya dari aplikasi, dan katalog kosong berarti klien tidak
         punya apa pun untuk dipesan. */
      '<div class="row between mb-3">' +
        '<div class="hint">' + semua.length + ' ' + I18N.t('layanan di katalog') + '</div>' +
        '<button class="btn btn--primary" data-act="svc-baru">' + I18N.t('＋ Tambah Layanan') + '</button>' +
      '</div>' +

      UI.bilahCari({
        cari: { id: 'cari-svc', nilai: cariSvc, act: 'cari-svc',
                placeholder: I18N.t('Cari layanan, kode, atau kategori…') },
        aktif: !!(cariSvc || fSvc !== 'semua'), resetAct: 'reset-svc',
        hasil: list.length, satuanHasil: 'layanan'
      }) +

      UI.tabs([
        { key: 'semua', label: I18N.t('Semua'), n: semua.length },
        { key: 'aktif', label: I18N.t('Tayang'), n: semua.length - mati.length },
        { key: 'mati', label: I18N.t('Dimatikan'), n: mati.length }
      ], fSvc, 'tab-svc') +

      (mati.length
        ? UI.alert('warn', '<b>' + mati.length + ' layanan sedang dimatikan.</b> ' +
            I18N.t('Klien tidak melihatnya di katalog pemesanan.'), '🚫') + '<div class="mb-3"></div>'
        : '') +

      (list.length
        ? Object.keys(grup).map(function (k) {
            var isi = grup[k];
            var hidup = isi.filter(function (s) { return s.aktif !== false; }).length;
            return UI.card({ title: k, flush: true, cls: 'mb-3',
              sub: I18N.t('{a} dari {b} tayang').replace('{a}', hidup).replace('{b}', isi.length),
              /* Mematikan seluruh kelompok sekaligus: 28 kategori dengan 123
                 layanan berarti menutup satu lini jasa butuh belasan ketukan
                 kalau hanya ada saklar per baris. */
              tools: '<button class="btn btn--ghost btn--sm" data-act="svc-grup" ' +
                'data-k="' + U.esc(k) + '" data-on="' + (hidup ? '0' : '1') + '">' +
                (hidup ? I18N.t('Matikan semua') : I18N.t('Hidupkan semua')) + '</button>',
              body: UI.table([
                { h: '', w: '56px', r: saklarSvc },
                { h: I18N.t('Kode'), w: '90px', r: function (s) { return '<span class="code">' + U.esc(s.kode) + '</span>'; } },
                { h: I18N.t('Layanan'), r: function (s) {
                  var n = s.aktif === false ? layananTerpakai(s.id) : 0;
                  return '<div class="tbl-title">' + U.ikon(s.icon) + ' ' + U.esc(s.nama) + '</div>' +
                  '<div class="tbl-sub">' + (s.checklist || []).length + ' langkah checklist' +
                  (s.k3 ? ' • <span style="color:var(--warn)">SOP K3 khusus</span>' : '') +
                  /* Layanan yang dimatikan tetapi masih dipakai pekerjaan
                     berjalan disebutkan di sini — kalau tidak, admin mengira
                     mematikannya sudah menghentikan semuanya. */
                  (n ? ' • <span style="color:var(--warn)">' + n +
                    ' ' + I18N.t('pekerjaan berjalan masih memakainya') + '</span>' : '') + '</div>'; } },
                { h: I18N.t('Harga mulai'), cls: 'num', r: function (s) { return s.survei || s.hargaMin === null
                  ? '<span class="chip chip--warn">Survei</span>'
                  : '<b>' + U.rp(s.hargaMin) + '</b>' + (s.hargaMax ? '<div class="tbl-sub">s/d ' + U.rp(s.hargaMax) + '</div>' : ''); } },
                { h: I18N.t('Satuan'), r: function (s) { return U.esc(s.satuan); } },
                { h: '', cls: 'act', r: function (s) { return '<button class="btn btn--ghost btn--sm" data-act="edit-svc" data-id="' +
                  s.id + '">' + I18N.t('Ubah') + '</button>'; } }
              ], isi) });
          }).join('')
        /* Katalog kosong dan pencarian nihil adalah dua keadaan yang berbeda.
           Menyuruh orang "coba kata kunci lain" padahal katalognya memang
           belum berisi apa-apa membuat ia mencari-cari yang tidak ada. */
        : (semua.length
            ? UI.empty('🔍', I18N.t('Layanan tidak ditemukan'),
                I18N.t('Coba kata kunci lain, atau pilih tab yang berbeda.'))
            : UI.empty('🧴', I18N.t('Katalog layanan masih kosong'),
                I18N.t('Belum ada satu pun layanan yang bisa dipesan klien.') + ' ' +
                I18N.t('Tekan “Tambah Layanan” untuk mulai menyusun katalog.'))));
  }

  /* ================================================================ LAPORAN */
  function renderLaporan() {
    var orders = DB.all('orders'), invoices = DB.all('invoices'), ratings = DB.all('ratings');
    var bulan = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var key = U.iso(d).slice(0, 7);
      bulan.push({ key: key, label: U.BULAN_S[d.getMonth()],
        nilai: U.sum(invoices.filter(function (x) { return U.iso(x.terbitAt).slice(0, 7) === key; }),
          function (x) { return x.total; }),
        order: orders.filter(function (o) { return o.tgl.slice(0, 7) === key; }).length });
    }
    var maks = Math.max.apply(null, bulan.map(function (b) { return b.nilai; }).concat([1]));

    var perLayanan = {};
    orders.forEach(function (o) {
      (o.serviceIds || []).forEach(function (sid) {
        perLayanan[sid] = perLayanan[sid] || { n: 0, nilai: 0 };
        perLayanan[sid].n++; perLayanan[sid].nilai += (o.nilai || 0) / Math.max(1, (o.serviceIds || []).length);
      });
    });
    var topLayanan = U.sortBy(Object.keys(perLayanan).map(function (k) {
      return { id: k, n: perLayanan[k].n, nilai: perLayanan[k].nilai }; }), function (x) { return x.nilai; }, true).slice(0, 6);

    var perKlien = U.sortBy(BIZ.usersByRole('client').map(function (c) {
      return { c: c, nilai: U.sum(DB.where('invoices', { clientId: c.id }), function (i) { return i.total; }),
        n: DB.where('orders', { clientId: c.id }).length };
    }), function (x) { return x.nilai; }, true);

    var qcAll = DB.all('qc');
    return '<div class="grid g-2 mb-3">' +
      UI.card({ title: 'Pendapatan 6 bulan terakhir', sub: 'Berdasarkan invoice terbit',
        body: '<div class="row" style="align-items:flex-end;gap:14px;height:170px">' + bulan.map(function (b) {
          return '<div style="flex:1;text-align:center">' +
            '<div class="tbl-sub" style="font-size:10.5px;margin-bottom:5px">' + U.rpShort(b.nilai) + '</div>' +
            '<div style="height:' + Math.max(4, b.nilai / maks * 120) + 'px;background:linear-gradient(180deg,var(--brand-light),var(--brand));' +
            'border-radius:7px 7px 0 0"></div>' +
            '<div class="tbl-sub mt-1">' + b.label + '</div></div>';
        }).join('') + '</div>' }) +
      UI.card({ title: I18N.t('Mutu pekerjaan'), sub: qcAll.length + ' verifikasi QC',
        body: '<div class="grid g-2">' +
          UI.stat({ label: 'Rata-rata skor QC', value: qcAll.length
            ? (Math.round(U.sum(qcAll, BIZ.rataQC) / qcAll.length * 10) / 10) + ' / 5' : '—', icon: '🔍' }) +
          UI.stat({ label: I18N.t('Rating klien'), value: ratings.length
            ? (Math.round(U.sum(ratings, function (r) { return r.bintang; }) / ratings.length * 10) / 10) + ' ★' : '—',
            icon: '⭐', meta: ratings.length + ' penilaian' }) +
        '</div>' +
        '<div class="mt-3">' + ['kebersihan', 'kerapihan', 'k3', 'ketepatan'].map(function (k) {
          var lbl = I18N.t({ kebersihan: 'Kebersihan hasil', kerapihan: 'Kerapihan area',
            k3: 'Penerapan K3', ketepatan: 'Ketepatan waktu' }[k]);
          var avg = qcAll.length ? U.sum(qcAll, function (q) { return (q.skor || {})[k] || 0; }) / qcAll.length : 0;
          return '<div class="row" style="padding:6px 0"><span style="width:140px;font-size:12.5px">' + lbl + '</span>' +
            '<div style="flex:1">' + UI.progress(avg / 5 * 100, avg >= 4 ? 'ok' : 'warn') + '</div>' +
            '<b style="width:38px;text-align:right;font-size:12.5px">' + (Math.round(avg * 10) / 10) + '</b></div>';
        }).join('') + '</div>' }) +
    '</div>' +

    '<div class="grid g-2">' +
      UI.card({ title: I18N.t('Layanan paling banyak dikerjakan'), flush: true,
        body: '<div class="mini-list">' + topLayanan.map(function (t) {
          var s = BIZ.svc(t.id);
          return '<div class="mini-item"><div class="stat__icon" style="margin:0">' + (s ? s.icon : '•') + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(s ? s.nama : '—') + '</b><small>' + t.n + ' pekerjaan</small></div>' +
            '<div class="right"><b>' + U.rpShort(t.nilai) + '</b></div></div>';
        }).join('') + '</div>' }) +
      UI.card({ title: I18N.t('Klien berdasarkan nilai'), flush: true,
        body: '<div class="mini-list">' + perKlien.map(function (x) {
          return '<div class="mini-item">' + UI.avatar(x.c.perusahaan || x.c.nama, 'sm') +
            '<div style="min-width:0;flex:1"><b>' + U.esc(x.c.perusahaan || x.c.nama) + '</b>' +
            '<small>' + x.n + ' order</small></div>' +
            '<div class="right"><b>' + U.rpShort(x.nilai) + '</b></div></div>';
        }).join('') + '</div>' }) +
    '</div>' +

    '<div class="grid g-2 mt-3">' + (function () {
      var jual = {};
      DB.all('shopOrders').forEach(function (so) {
        if (so.status === 'dibatalkan') return;
        (so.items || []).forEach(function (i) {
          jual[i.productId] = jual[i.productId] || { qty: 0, nilai: 0 };
          jual[i.productId].qty += i.qty;
          jual[i.productId].nilai += i.qty * i.harga;
        });
      });
      var top = U.sortBy(Object.keys(jual).map(function (k) {
        return { id: k, qty: jual[k].qty, nilai: jual[k].nilai }; }), function (x) { return x.nilai; }, true).slice(0, 6);
      var menipis = BIZ.stokMenipis();

      return UI.card({ title: I18N.t('Produk terlaris'), sub: I18N.t('Toko perlengkapan'), flush: true,
        body: top.length ? '<div class="mini-list">' + top.map(function (t) {
          var p = BIZ.produk(t.id);
          return '<div class="mini-item"><div class="prd__mini">' + (p ? p.icon : '📦') + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(p ? p.nama : '—') + '</b>' +
            '<small>' + t.qty + ' ' + U.esc(p ? p.satuan : '') + ' ' + I18N.t('terjual') + '</small></div>' +
            '<div class="right"><b>' + U.rpShort(t.nilai) + '</b></div></div>';
        }).join('') + '</div>' : UI.empty('🛒', I18N.t('Belum ada penjualan produk'), '') }) +

      UI.card({ title: 'Perlu restock', sub: menipis.length + ' ' + I18N.t('produk di bawah batas minimum'), flush: true,
        body: menipis.length ? '<div class="mini-list">' + menipis.map(function (p) {
          return '<div class="mini-item"><div class="prd__mini">' + p.icon + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(p.nama) + '</b>' +
            '<small>' + U.esc(p.kode) + ' • batas minimum ' + (p.minStok || 0) + '</small></div>' +
            '<div class="right"><b style="color:' + (p.stok ? 'var(--warn)' : 'var(--danger)') + '">' +
            p.stok + '</b><small>' + U.esc(p.satuan) + '</small></div></div>';
        }).join('') + '</div>' : UI.empty('✅', I18N.t('Stok semua produk aman'), '') });
    })() + '</div>';
  }

  /* ================================================================ KOMPLAIN */
  function renderKomplain() {
    var list = U.sortBy(DB.all('complaints'), function (c) { return c.at; }, true);
    return UI.card({ title: 'Komplain & Garansi', sub: list.length + ' pengajuan', flush: true,
      body: list.length ? '<div style="padding:14px 18px">' + list.map(function (c) {
        var o = BIZ.order(c.orderId);
        return '<div class="order-card"><div class="top"><div style="min-width:0;flex:1">' +
          '<div class="row" style="gap:8px">' + UI.statusChip('complaint', c.status) +
          '<span class="tbl-sub">' + U.sejak(c.at) + '</span></div>' +
          '<h4 class="mt-1">' + U.esc(o ? o.judul : '—') + '</h4>' +
          '<div class="meta"><span>' + U.esc(o ? o.no : '') + '</span><span>👤 ' + U.esc(BIZ.klien(c.clientId)) + '</span></div>' +
          '<p style="font-size:12.8px;color:var(--ink-2);margin:8px 0 0">“' + U.esc(c.isi) + '”</p>' +
          (c.photos && c.photos.length ? '<div class="mt-2">' + UI.photoGrid(c.photos, { zoomAct: 'zoom' }) + '</div>' : '') +
          '</div><div class="col" style="gap:6px">' +
          (c.status !== 'selesai' ? '<button class="btn btn--sm" data-act="rework" data-id="' + c.id +
            '">Jadwalkan Ulang</button>' : '') +
          (c.status === 'baru' ? '<button class="btn btn--ghost btn--sm" data-act="proses-komplain" data-id="' + c.id +
            '">Tandai Diproses</button>' : '') +
          (c.status !== 'selesai' ? '<button class="btn btn--ghost btn--sm" data-act="tutup-komplain" data-id="' + c.id +
            '">' + I18N.t('Tandai Selesai') + '</button>' : '') +
          '</div></div></div>';
      }).join('') + '</div>' : UI.empty('🛡️', I18N.t('Tidak ada komplain'), I18N.t('Bagus! Semua klien puas dengan hasil pekerjaan.')) });
  }

  /* ================================================================ AKSI */
  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  function aksi(root) {
    U.delegate(root, AKSES.lindungi({
      /* navigasi & dialog umum */
      detail: function (el) { Panel.detailOrder(el.getAttribute('data-id')); },
      zoom: function (el) { UI.lightbox(DB.getPhoto(el.getAttribute('data-id'))); },
      'order-baru': function () { dialogOrder(null, {}); },
      'edit-order': function (el) { dialogOrder(el.getAttribute('data-id')); },
      'tab-order': function (el) { fOrder = el.getAttribute('data-key'); APP.refresh(); },
      'tab-wa': function (el) { fWa = el.getAttribute('data-key'); APP.refresh(); },

      /* permintaan */
      'lihat-req': function (el) { lihatPermintaan(el.getAttribute('data-id')); },
      'buat-quo': function (el) { dialogQuotation(null, el.getAttribute('data-id')); },

      /* penawaran */
      'quo-baru': function () { dialogQuotation(null, null); },
      'lihat-quo': function (el) {
        var q = DB.find('quotations', el.getAttribute('data-id'));
        UI.modal({ title: I18N.t('Penawaran') + ' ' + q.no, size: 'wide', body: Panel.dokumenQuotation(q),
          foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ Cetak</button>' +
            (q.status === 'draft' ? '<button class="btn btn--ghost" data-act="ubah">' + I18N.t('Ubah') + '</button>' +
              '<button class="btn" data-act="kirim">' + I18N.t('Kirim ke Klien') + '</button>' : '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>'),
          actions: {
            ubah: function (e2) { tutup(e2); dialogQuotation(q.id); },
            kirim: function (e2) { tutup(e2); kirimQuo(q.id); }
          } });
      },
      'kirim-quo': function (el) { kirimQuo(el.getAttribute('data-id')); },
      'jadwalkan-quo': function (el) {
        var q = DB.find('quotations', el.getAttribute('data-id'));
        var c = BIZ.user(q.clientId);
        dialogOrder(null, { clientId: q.clientId, alamat: c.alamat || '',
          wilayah: alamatUtamaWilayah(c),
          judul: (q.items[0] || {}).desc || I18N.t('Pekerjaan cleaning service'), nilai: BIZ.totalQuotation(q) });
      },

      /* jadwal */
      'bulan-prev': function () { kalBulan--; if (kalBulan < 0) { kalBulan = 11; kalTahun--; } APP.refresh(); },
      'bulan-next': function () { kalBulan++; if (kalBulan > 11) { kalBulan = 0; kalTahun++; } APP.refresh(); },
      'bulan-now': function () { kalBulan = new Date().getMonth(); kalTahun = new Date().getFullYear(); APP.refresh(); },
      hari: function (el) { dialogHari(el.getAttribute('data-tgl')); },

      /* invoice */
      'buat-inv': function (el) { dialogInvoice(el.getAttribute('data-id')); },
      'lihat-inv': function (el) {
        var inv = DB.find('invoices', el.getAttribute('data-id'));
        UI.modal({ title: 'Order Receipt ' + inv.no, size: 'wide', body: Panel.dokumenInvoice(inv),
          foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ Cetak</button>' +
            '<button class="btn btn--ghost" data-close>' + I18N.t('Tutup') + '</button>' });
      },
      'catat-bayar': function (el) { dialogBayar(el.getAttribute('data-id')); },
      'link-bayar': function (el) {
        var id = el.getAttribute('data-id');
        var tx = PAY.txAktif(id);
        if (tx) { Bayar.halamanBayar(tx.id, APP.refresh); return; }
        Bayar.pilihMetode(id, APP.refresh);
      },
      tagih: function (el) {
        var inv = DB.find('invoices', el.getAttribute('data-id'));
        var m = WA.enqueue('invoice_jatuh_tempo', inv.clientId, { invoiceId: inv.id }, { tipe: 'invoice', id: inv.id });
        Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
      },

      /* WA */
      'lihat-wa': function (el) { Panel.pratinjauWA(el.getAttribute('data-id'), { onKirim: APP.refresh }); },
      'kirim-wa': function (el) { WA.kirim(el.getAttribute('data-id')); APP.refresh(); },
      'kirim-semua': function () {
        var antre = DB.where('waOutbox', { status: 'antre' });
        UI.konfirm({ title: I18N.t('Kirim') + ' ' + antre.length + ' ' + I18N.t('pesan?'),
          text: I18N.t('Setiap pesan akan membuka satu tab WhatsApp. Pastikan pop-up diizinkan browser.') })
          .then(function (ya) {
            if (!ya) return;
            antre.forEach(function (m, i) { setTimeout(function () { WA.kirim(m.id); }, i * 900); });
            setTimeout(APP.refresh, antre.length * 900 + 400);
          });
      },
      'wa-user': function (el) {
        var u = BIZ.user(el.getAttribute('data-id'));
        WA.chat(u.telp, 'Halo ' + u.nama + ', ');
      },

      /* master data */
      'klien-baru': function () { dialogUser('client'); },
      'pegawai-baru': function () { dialogUser('worker'); },
      'edit-user': function (el) { dialogUser(null, el.getAttribute('data-id')); },
      berkas: function (el) { Panel.detailBerkas(el.getAttribute('data-id')); },
      'tim-baru': function () { dialogTim(); },
      'edit-tim': function (el) { dialogTim(el.getAttribute('data-id')); },
      'edit-svc': function (el) { dialogLayanan(el.getAttribute('data-id')); },
      'svc-baru': function () { dialogLayanan(null); },
      'cari-svc': function (el) { cariSvc = el.value; APP.refresh(); },
      'tab-svc': function (el) { fSvc = el.getAttribute('data-k'); APP.refresh(); },
      'reset-svc': function () { cariSvc = ''; fSvc = 'semua'; APP.refresh(); },

      'svc-aktif': function (el) {
        var s = BIZ.svc(el.getAttribute('data-id'));
        if (!s) return;
        var on = s.aktif === false;
        DB.update('services', s.id, { aktif: on });
        DB.log(APP.user.id, (on ? 'Menghidupkan' : 'Mematikan') + ' layanan ' + s.nama,
          'service', s.id);
        /* Yang paling mudah disalahpahami saat mematikan adalah nasib
           pekerjaan yang sedang berjalan. Dikatakan di saat itu juga. */
        var n = on ? 0 : layananTerpakai(s.id);
        UI.toast(U.potong(s.nama, 28) + ' — ' +
          (on ? I18N.t('kembali tayang di katalog klien')
              : I18N.t('tidak lagi ditawarkan untuk pemesanan baru') +
                (n ? ' (' + n + ' ' + I18N.t('pekerjaan berjalan tidak terpengaruh)') : '')),
          on ? 'ok' : 'info');
        APP.refresh();
      },

      'svc-grup': function (el) {
        var k = el.getAttribute('data-k'), on = el.getAttribute('data-on') === '1';
        var isi = DB.all('services').filter(function (s) { return s.kategori === k; });
        UI.konfirm({
          title: on ? I18N.t('Hidupkan seluruh kelompok ini?')
                    : I18N.t('Matikan seluruh kelompok ini?'),
          /* Kalimat UTUH per cabang, bukan potongan yang disambung: kata
             'akan' berdiri di tempat berbeda dalam bahasa lain, dan
             menyambungnya di sini mengunci urutan Bahasa Indonesia. */
          text: (on
            ? I18N.t('{n} layanan di “{k}” akan kembali tayang di katalog klien.')
            : I18N.t('{n} layanan di “{k}” akan berhenti ditawarkan untuk pemesanan ' +
                'baru. Pekerjaan yang sedang berjalan tidak terpengaruh.'))
            .replace('{n}', isi.length).replace('{k}', k),
          okText: on ? I18N.t('Hidupkan semua') : I18N.t('Matikan semua'), danger: !on
        }).then(function (ya) {
          if (!ya) return;
          isi.forEach(function (s) { DB.update('services', s.id, { aktif: on }); });
          DB.log(APP.user.id, (on ? 'Menghidupkan' : 'Mematikan') + ' kelompok layanan ' + k +
            ' (' + isi.length + ' layanan)', 'service', null);
          UI.toast(isi.length + ' layanan ' + (on ? 'dihidupkan' : 'dimatikan'), on ? 'ok' : 'info');
          APP.refresh();
        });
      },

      /* komplain */
      'proses-komplain': function (el) {
        DB.update('complaints', el.getAttribute('data-id'), { status: 'diproses' });
        UI.toast('Komplain ditandai sedang diproses', 'ok'); APP.refresh();
      },
      'tutup-komplain': function (el) {
        DB.update('complaints', el.getAttribute('data-id'), { status: 'selesai' });
        UI.toast('Komplain ditutup', 'ok'); APP.refresh();
      },
      rework: function (el) {
        var c = DB.find('complaints', el.getAttribute('data-id'));
        var o = BIZ.order(c.orderId);
        DB.update('complaints', c.id, { status: 'diproses' });
        dialogOrder(null, { clientId: c.clientId, alamat: o ? o.alamat : '',
          wilayah: (o && o.wilayah) || null,
          judul: 'Pengerjaan ulang (garansi) — ' + (o ? o.judul : ''), nilai: 0,
          serviceIds: o ? o.serviceIds : [] });
      }
    }, {
      /* Aksi yang mengubah data dijaga izinnya. Menu-nya memang sudah disaring,
         tapi tombol yang sama juga muncul di dialog lintas-halaman — jadi
         pemeriksaan dipasang di titik aksinya, bukan hanya di navigasi. */
      'order-baru': 'operasional.order.kelola',
      'edit-order': 'operasional.order.kelola',
      'jadwalkan-quo': 'operasional.order.kelola',
      'buat-quo': 'penjualan.penawaran.kelola',
      'quo-baru': 'penjualan.penawaran.kelola',
      'kirim-quo': 'penjualan.penawaran.kelola',
      'buat-inv': 'keuangan.invoice.kelola',
      'catat-bayar': 'keuangan.invoice.kelola',
      'link-bayar': 'keuangan.invoice.kelola',
      tagih: 'keuangan.invoice.kelola',
      'kirim-wa': 'komunikasi.wa.kirim',
      'kirim-semua': 'komunikasi.wa.kirim',
      'wa-user': 'komunikasi.wa.kirim',
      'klien-baru': 'master.pegawai',
      'pegawai-baru': 'master.pegawai',
      'edit-user': 'master.pegawai',
      'tim-baru': 'master.pegawai',
      'edit-tim': 'master.pegawai',
      'edit-svc': 'master.layanan',
      'svc-baru': 'master.layanan',
      'svc-aktif': 'master.layanan',
      'svc-grup': 'master.layanan',
      'proses-komplain': 'operasional.komplain',
      'tutup-komplain': 'operasional.komplain',
      rework: 'operasional.komplain'
    }));
  }

  function kirimQuo(qid) {
    BIZ.kirimQuotation(qid);
    var m = U.sortBy(DB.where('waOutbox', { refId: qid }), function (x) { return x.createdAt; }, true)[0];
    APP.refresh();
    if (m) Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
  }

  function dialogInvoice(orderId) {
    var o = BIZ.order(orderId);
    UI.formModal({
      title: 'Terbitkan Invoice', sub: o.no + ' • ' + BIZ.klien(o.clientId), okText: I18N.t('Terbitkan'),
      fields: [
        { name: 'subtotal', label: I18N.t('Nilai pekerjaan (Rp)'), type: 'number', value: o.nilai, required: true },
        { name: 'diskon', label: 'Diskon (Rp)', type: 'number', value: 0 },
        { name: 'ppn', label: I18N.t('Ppn (%)'), type: 'number', value: 11 },
        { name: 'tempoHari', label: I18N.t('Tempo pembayaran (hari)'), type: 'number', value: 14 }
      ]
    }).then(function (d) {
      if (!d) return;
      var inv = BIZ.terbitkanInvoice(orderId, d);
      UI.toast('Order Receipt ' + inv.no + ' diterbitkan', 'ok');
      APP.refresh();
      var m = U.sortBy(DB.where('waOutbox', { refId: inv.id }), function (x) { return x.createdAt; }, true)[0];
      if (m) Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
    });
  }

  function dialogBayar(invId) {
    var inv = DB.find('invoices', invId);
    UI.formModal({
      title: I18N.t('Catat Pembayaran'), sub: inv.no + ' • sisa ' + U.rp(BIZ.sisaTagihan(inv)), okText: I18N.t('Simpan'),
      fields: [
        { name: 'jumlah', label: I18N.t('Jumlah diterima (Rp)'), type: 'number', value: BIZ.sisaTagihan(inv), required: true },
        { name: 'metode', label: I18N.t('Metode'), type: 'select', options: ['Transfer BCA', 'Transfer Mandiri', 'QRIS', 'Tunai', 'Cek/Giro'] },
        { name: 'ref', label: I18N.t('No. referensi'), placeholder: 'mis. TRF/8891201' }
      ]
    }).then(function (d) {
      if (!d) return;
      BIZ.catatPembayaran(invId, d.jumlah, d.metode, d.ref);
      UI.toast(I18N.t('Pembayaran dicatat'), 'ok'); APP.refresh();
    });
  }

  /* ----------------------------------------------------------- alamat
     Tiga dialog di layar admin meminta alamat: pengguna, order, dan
     korporat. Ketiganya memakai kolom bertingkat yang SAMA dengan yang
     dipakai pengguna di profilnya — bukan kotak teks bebas. Penolong di
     bawah ini yang membuat ketiganya tidak menyimpang satu sama lain. */

  /** Wilayah alamat utama seorang pengguna, bila memang sudah terstruktur. */
  function alamatUtamaWilayah(u) {
    var a = u ? BIZ.alamatUtama(u) : null;
    return (a && window.WILAYAH && WILAYAH.terstruktur(a.wilayah)) ? a.wilayah : null;
  }

  /** Bentuk terstruktur dari entri alamat lama maupun baru. */
  function alamatAwal(a) {
    if (!window.WILAYAH) return null;
    if (a && WILAYAH.terstruktur(a.wilayah)) return a.wilayah;
    if (a && a.alamat) {
      var w = WILAYAH.dariTeksLama(a.alamat);
      if (a.kota) w.l2 = a.kota;
      if (a.kodePos) w.kodePos = a.kodePos;
      if (a.patokan) w.patokan = a.patokan;
      return w;
    }
    return WILAYAH.kosong();
  }

  /**
   * Apakah blok alamat benar-benar disunting?
   *
   * Hasil urai alamat lama sengaja tetap ditampilkan sebagai titik awal —
   * itu menolong yang memang ingin melengkapinya. Yang tidak boleh adalah
   * MENUNTUT kelengkapan dari orang yang datang untuk urusan lain.
   */
  function alamatBerubah(awal, d) {
    if (!window.WILAYAH) return false;
    return JSON.stringify(WILAYAH.dariForm(d)) !== JSON.stringify(awal || WILAYAH.kosong());
  }

  /** Ambil wilayah dari data formulir, LALU buang kolomnya dari data itu. */
  function ambilWilayah(d) {
    var w = WILAYAH.dariForm(d);
    ['negara', 'l1', 'l2', 'l3', 'l4', 'kodePos', 'jalan', 'patokan']
      .forEach(function (f) { delete d[f]; });
    return WILAYAH.terisi(w) ? w : null;
  }

  /**
   * Tulis wilayah sebagai alamat UTAMA pengguna.
   *
   * Kosong berarti 'jangan diubah', bukan 'hapus': admin yang membuka
   * formulir untuk mengganti nomor telepon tidak boleh menghapus alamat
   * orang lain hanya karena ia tidak menyentuh bagian itu.
   */
  function simpanAlamatUtama(userId, wil, nama, telp) {
    if (!wil || !window.WILAYAH) return;
    var uu = DB.find('users', userId);
    if (!uu) return;
    var list = BIZ.alamatList(uu).slice();
    var rec = { wilayah: wil, alamat: WILAYAH.teks(wil, { denganNegara: false }),
      kota: wil.l2, kodePos: wil.kodePos, patokan: wil.patokan };
    var utama = list.filter(function (x) { return x.utama; })[0] || list[0];
    if (utama) Object.assign(utama, rec);
    else list.push(Object.assign({ id: U.uid('adr'), label: I18N.t('Kantor'),
      penerima: nama || uu.nama, telp: telp || uu.telp, utama: true }, rec));
    BIZ.simpanAlamat(userId, list);
  }

  function dialogUser(role, userId) {
    var u = userId ? BIZ.user(userId) : null;
    role = u ? u.role : role;
    var isKlien = role === 'client';
    var adrUtama = u ? BIZ.alamatUtama(u) : null;
    var wUser = alamatAwal(adrUtama);
    UI.formModal({
      title: u ? I18N.t('Ubah data') + ' ' + u.nama : (isKlien ? I18N.t('Klien Baru') : I18N.t('Petugas Baru')), okText: I18N.t('Simpan'),
      fields: [
        { name: 'nama', label: I18N.t('Nama lengkap'), value: u ? u.nama : '', required: true },
        isKlien
          ? { name: 'perusahaan', label: I18N.t('Nama perusahaan (kosongkan bila perorangan)'), value: u ? u.perusahaan || '' : '' }
          : { name: 'jabatan', label: I18N.t('Jabatan'), value: u ? u.jabatan || '' : 'Cleaner' },
        { name: 'telp', label: I18N.t('No. WhatsApp'), value: u ? u.telp : '', required: true, placeholder: '08xxxxxxxxxx' },
        { name: 'email', label: I18N.t('Email (untuk login)'), type: 'email', value: u ? u.email : '', required: true },
        { type: 'html', html: '<div class="mcs-fs">' + I18N.t('Alamat utama') +
          '<span>' + I18N.t('Kolomnya sama dengan yang dipakai pengguna sendiri.') + ' ' +
          I18N.t('Dikosongkan berarti alamat tersimpan dibiarkan apa adanya.') + '</span></div>' }
      ].concat(WILAYAH.fields(wUser, { wajib: false })).concat([
        { name: 'role', label: I18N.t('Peran'), type: 'select', value: role,
          options: [{ value: 'client', label: I18N.t('Klien') }, { value: 'worker', label: I18N.t('Tenaga Kerja Lapangan') },
                    { value: 'supervisor', label: I18N.t('Supervisor') }, { value: 'admin', label: 'Admin' }] },
        { name: 'aktif', label: 'Akun aktif', type: 'checkbox', value: u ? u.aktif : true }
      ]),
      size: 'wide',
      validate: function (d) {
        var bentrok = DB.all('users').filter(function (x) {
          return x.email.toLowerCase() === String(d.email).toLowerCase() && (!u || x.id !== u.id); });
        if (bentrok.length) return I18N.t('Email sudah dipakai akun lain');
        if (!alamatBerubah(wUser, d)) return null;
        return WILAYAH.periksa(WILAYAH.dariForm(d), { wajib: false });
      },
      onMount: function (root) { WILAYAH.pasang(root); }
    }).then(function (d) {
      if (!d) return;
      /* Kolom wilayah bukan milik record pengguna. Ia disimpan sebagai entri
         di buku alamatnya, dan `users.alamat` diturunkan dari sana. */
      var disunting = alamatBerubah(wUser, d);
      var wil = ambilWilayah(d);
      var target;
      if (u) { DB.update('users', u.id, d); target = u.id; UI.toast('Data diperbarui', 'ok'); }
      else { target = DB.insert('users', Object.assign({ pass: '123456', sertifikat: [] }, d)).id;
        UI.toast('Akun dibuat. Kata sandi awal: 123456', 'ok'); }
      if (disunting) simpanAlamatUtama(target, wil, d.nama, d.telp);
      APP.refresh();
    });
  }

  function dialogTim(teamId) {
    var t = teamId ? DB.find('teams', teamId) : null;
    var anggota = t ? t.memberIds.slice() : [];
    UI.modal({
      title: t ? 'Ubah ' + t.nama : 'Tim Baru',
      body: UI.field({ name: 'nama', label: I18N.t('Nama tim'), value: t ? t.nama : '' }) +
        UI.field({ name: 'spesialisasi', label: I18N.t('Spesialisasi'), value: t ? t.spesialisasi || '' : '' }) +
        UI.field({ name: 'supervisorId', label: I18N.t('Supervisor'), type: 'select', value: t ? t.supervisorId : '',
          options: BIZ.usersByRole('supervisor').map(function (s) { return { value: s.id, label: s.nama }; }) }) +
        '<div class="field"><label>Anggota tim</label>' +
        BIZ.usersByRole('worker').map(function (w) {
          return '<label class="check" style="padding:5px 0"><input type="checkbox" data-change="ang" data-id="' + w.id +
            '"' + (anggota.indexOf(w.id) >= 0 ? ' checked' : '') + '><span>' + U.esc(w.nama) +
            ' <span class="tbl-sub">— ' + U.esc(w.jabatan) + '</span></span></label>';
        }).join('') + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button><button class="btn" data-act="simpan">' + I18N.t('Simpan') + '</button>',
      actions: {
        ang: function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) anggota.push(id); else anggota = anggota.filter(function (x) { return x !== id; });
        },
        simpan: function (el) {
          var f = U.readForm(el.closest('.modal'));
          if (!f.nama) { UI.toast(I18N.t('Nama tim wajib diisi'), 'err'); return; }
          var data = { nama: f.nama, spesialisasi: f.spesialisasi, supervisorId: f.supervisorId, memberIds: anggota };
          if (t) DB.update('teams', t.id, data); else DB.insert('teams', data);
          tutup(el); UI.toast('Tim disimpan', 'ok'); APP.refresh();
        }
      }
    });
  }

  /* Merangkum isian dialog apa adanya, untuk dibuka kembali saat ditolak. */
  function isianKembali(d, kategori) {
    return {
      kode: d.kode || '', nama: d.nama || '', kategori: kategori,
      hargaMin: d.hargaMin, hargaMax: d.hargaMax, satuan: d.satuan,
      survei: d.survei, k3: d.k3, aktif: d.aktif,
      checklist: String(d.checklist || '').split('\n')
        .map(function (x) { return x.trim(); }).filter(Boolean)
    };
  }

  /* Dipakai untuk MEMBUAT dan MENGUBAH. Tanpa svcId berarti layanan baru.
     Keduanya satu dialog supaya aturan yang berlaku — harga wajib bila tanpa
     survei, checklist jadi langkah kerja di lapangan — tidak perlu ditulis
     dua kali lalu menyimpang satu sama lain. */
  function dialogLayanan(svcId, kembali) {
    var baru = !svcId;
    var s = baru
      ? { kode: '', nama: '', kategori: '', hargaMin: null, hargaMax: null,
          satuan: 'unit', survei: false, k3: false, checklist: [], aktif: true }
      : BIZ.svc(svcId);
    if (!s) { UI.toast(I18N.t('Layanan tidak ditemukan'), 'err'); return; }

    /* `kembali` berisi isian yang barusan ditolak. Dialog dibuka lagi dengan
       isi itu supaya satu kode yang salah ketik tidak menghapus nama,
       kategori, harga, dan belasan baris checklist yang sudah diketik. */
    if (kembali) {
      s = Object.assign({}, s, {
        kode: kembali.kode, nama: kembali.nama, kategori: kembali.kategori,
        hargaMin: kembali.hargaMin, hargaMax: kembali.hargaMax, satuan: kembali.satuan,
        survei: kembali.survei, k3: kembali.k3, aktif: kembali.aktif,
        checklist: kembali.checklist || []
      });
    }

    /* Kategori yang sudah dipakai ditawarkan sebagai pilihan supaya katalog
       tidak pecah jadi kategori kembar yang cuma beda satu spasi. Pilihan
       terakhir membuka isian bebas untuk kategori yang benar-benar baru. */
    var kategoriAda = [];
    DB.all('services').forEach(function (x) {
      if (x.kategori && kategoriAda.indexOf(x.kategori) < 0) kategoriAda.push(x.kategori);
    });
    kategoriAda.sort();
    var BARU = '__baru__';

    var fields = [];
    if (baru) {
      fields.push({ name: 'kode', label: 'Kode layanan', required: true, value: s.kode || '',
        placeholder: 'GC-GD',
        hint: I18N.t('Penanda tetap layanan ini, dipakai di order dan invoice.') + ' ' +
              I18N.t('Huruf, angka, dan tanda hubung. Tidak bisa diubah setelah disimpan.') });
    }
    fields.push({ name: 'nama', label: I18N.t('Nama layanan'), value: s.nama, required: true });

    if (kategoriAda.length) {
      fields.push({ name: 'kategoriPilih', label: I18N.t('Kategori'), type: 'select',
        value: s.kategori || kategoriAda[0],
        options: kategoriAda.map(function (k) { return { value: k, label: k }; })
          .concat([{ value: BARU, label: '➕ Kategori baru…' }]) });
      fields.push({ name: 'kategoriBaru', label: I18N.t('Nama kategori baru'),
        value: (kembali && kategoriAda.indexOf(kembali.kategori) < 0) ? kembali.kategori : '',
        placeholder: 'Gedung & Komersial',
        hint: I18N.t('Diisi hanya bila memilih “Kategori baru…” di atas.') });
    } else {
      fields.push({ name: 'kategoriBaru', label: I18N.t('Kategori'), value: s.kategori || '',
        required: true, placeholder: 'Gedung & Komersial',
        hint: I18N.t('Kategori mengelompokkan layanan di katalog yang dilihat klien.') });
    }

    fields = fields.concat([
      { name: 'hargaMin', label: I18N.t('Harga mulai dari (Rp) — kosongkan bila perlu survei'), type: 'number', value: s.hargaMin },
      { name: 'hargaMax', label: I18N.t('Harga maksimum (opsional)'), type: 'number', value: s.hargaMax },
      { name: 'satuan', label: I18N.t('Satuan'), value: s.satuan },
      { name: 'survei', label: I18N.t('Harga hanya setelah survei lokasi'), type: 'checkbox', value: !!s.survei },
      { name: 'k3', label: I18N.t('Pekerjaan berisiko tinggi (SOP K3 khusus)'), type: 'checkbox', value: !!s.k3 },
      { name: 'checklist', label: I18N.t('Checklist pekerjaan (satu langkah per baris)'), type: 'textarea', rows: 6,
        value: (s.checklist || []).join('\n') },
      { name: 'aktif', label: I18N.t('Tampilkan di katalog klien'), type: 'checkbox', value: s.aktif }
    ]);

    UI.formModal({
      title: baru ? 'Layanan baru' : I18N.t('Ubah layanan'),
      sub: baru ? I18N.t('Layanan yang bisa dipesan klien dari katalog')
                : s.kode + ' • ' + s.nama,
      okText: baru ? 'Tambahkan' : 'Simpan',
      fields: fields
    }).then(function (d) {
      if (!d) return;

      var kategori = String(
        (d.kategoriPilih && d.kategoriPilih !== BARU) ? d.kategoriPilih : d.kategoriBaru
      ).trim();
      if (!kategori) {
        UI.toast(I18N.t('Kategori belum diisi'), 'err');
        dialogLayanan(svcId, isianKembali(d, '')); return;
      }

      var isian = {
        nama: String(d.nama).trim(), kategori: kategori,
        hargaMin: d.hargaMin, hargaMax: d.hargaMax, satuan: d.satuan,
        survei: d.survei, k3: d.k3, aktif: d.aktif,
        checklist: String(d.checklist || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean)
      };

      /* Layanan tanpa survei DAN tanpa harga tidak akan pernah bisa dipesan:
         tombol pesannya tidak muncul sama sekali (PESAN.bisaLangsung). Lebih
         baik ditolak di sini daripada tersimpan diam-diam lalu tak berfungsi. */
      if (!isian.survei && !(isian.hargaMin > 0)) {
        UI.toast(I18N.t('Isi harga mulai, atau tandai layanan ini perlu survei'), 'err');
        dialogLayanan(svcId, isianKembali(d, kategori)); return;
      }

      if (!baru) {
        DB.update('services', svcId, isian);
        UI.toast('Layanan diperbarui', 'ok'); APP.refresh();
        return;
      }

      var kode = String(d.kode || '').trim().toUpperCase().replace(/\s+/g, '-');
      if (!/^[A-Z0-9-]+$/.test(kode)) {
        UI.toast(I18N.t('Kode hanya boleh huruf, angka, dan tanda hubung'), 'err');
        dialogLayanan(svcId, isianKembali(d, kategori)); return;
      }
      if (DB.find('services', 'svc_' + kode)) {
        UI.toast('Kode ' + kode + ' ' + I18N.t('sudah dipakai layanan lain'), 'err');
        dialogLayanan(svcId, isianKembali(d, kategori)); return;
      }

      var urutan = 0;
      DB.all('services').forEach(function (x) { urutan = Math.max(urutan, (x.urutan || 0) + 1); });

      DB.insert('services', Object.assign({
        id: 'svc_' + kode, kode: kode, tipe: 'layanan', icon: '🧴', urutan: urutan
      }, isian));
      UI.toast('Layanan ' + kode + ' ditambahkan', 'ok'); APP.refresh();
    });
  }

  /* ================================================================ PAGES */
  var pages = {
    dashboard: { label: 'Dashboard', icon: '📊', grup: 'Ringkasan', render: renderDashboard, mount: aksi },
    permintaan: { label: 'Permintaan Masuk', icon: '📥', grup: 'Penjualan', render: renderPermintaan, mount: aksi,
      badge: function () { return DB.where('bookings', { status: 'baru' }).length; } },
    penawaran: { label: 'Penawaran', icon: '📄', grup: 'Penjualan', render: renderPenawaran, mount: aksi,
      badge: function () { return DB.where('quotations', { status: 'draft' }).length; } },
    jadwal: { label: 'Kalender Jadwal', icon: '📅', grup: 'Operasional', render: renderJadwal, mount: aksi },
    order: { label: 'Order', icon: '📋', grup: 'Operasional', render: renderOrder, mount: aksi,
      badge: function () { return DB.where('orders', { status: 'selesai' }).length; } },
    komplain: { label: 'Komplain', icon: '🛡️', grup: 'Operasional', render: renderKomplain, mount: aksi,
      badge: function () { return DB.all('complaints').filter(function (c) { return c.status !== 'selesai'; }).length; } },
    invoice: { label: 'Invoice & Pembayaran', icon: '🧾', grup: 'Keuangan', render: renderInvoice, mount: aksi,
      badge: function () { return DB.where('invoices', { status: 'jatuh_tempo' }).length; } },
    laporan: { label: 'Laporan Bisnis', icon: '📈', grup: 'Keuangan', render: renderLaporan, mount: aksi },
    wa: { label: 'WhatsApp Outbox', icon: '💬', grup: 'Komunikasi', render: renderWA, mount: aksi,
      badge: function () { return DB.where('waOutbox', { status: 'antre' }).length; } },
    surat: ViewSuratKeluar.page(),
    pegawai: { label: 'Tim & Pegawai', icon: '👷', grup: 'Master Data', render: renderPegawai, mount: aksi },
    layanan: { label: 'Katalog Layanan', icon: '🧴', grup: 'Master Data', render: renderLayanan, mount: aksi },
    profil: ViewProfil.page('Akun')
  };

  /* Halaman Toko (pesanan & stok) dan Pembayaran disuntikkan dari modulnya
     masing-masing; handler-nya digabung dengan handler admin. */
  [ViewCRM.pagesAdmin, ViewMitra.pagesAdmin, ViewHasil.pagesAdmin, ViewMarket.pagesAdmin,
   Toko.pagesAdmin, Bayar.pagesAdmin, ViewAkses.pagesAdmin, ViewKeahlian.pagesAdmin,
   ViewMCS.pagesAdmin,
   ViewDompet.pagesAdmin, ViewKompetensi.pagesAdmin,
   ViewAfiliasi.pagesAdmin, ViewDaftar.pagesAdmin, ViewObrolan.pagesAdmin, ViewModerasi.pagesAdmin, ViewKirim.pagesAdmin, ViewDWI.pagesAdmin, ViewMenu.pagesAdmin, ViewPoin.pagesAdmin, ViewVoucher.pagesAdmin, ViewUndian.pagesAdmin].forEach(function (set) {
    Object.keys(set).forEach(function (k) {
      var p = Object.assign({}, set[k]);
      var mountModul = p.mount;
      /* params ikut diteruskan: halaman yang punya tampilan detail (mis.
         Obrolan) membutuhkannya untuk tahu ruang mana yang sedang dibuka. */
      p.mount = function (root, params) { aksi(root); mountModul(root, params); };
      pages[k] = p;
    });
  });

  return { pages: pages, dialogOrder: dialogOrder, dialogQuotation: dialogQuotation, dialogUser: dialogUser };
})();
