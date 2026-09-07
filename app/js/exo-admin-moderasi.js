/* ==========================================================================
   exo-admin-moderasi.js — konsol admin: Moderasi (layanan, produk, ulasan)
   --------------------------------------------------------------------------
   Tab: usulan layanan mitra (setujui/tolak · PIN + audit; tarif disetujui →
   users.tarif), produk & toko (ringkasan antrean + tautan ke Marketplace),
   ulasan produk (sembunyikan/tampilkan · PIN), chat toko (belum dibalas).
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, kpi = A.kpi, tabel = A.tabel, pill = A.pill;
  var U = function () { return window.EXO_USULAN; }, T = function () { return window.EXO_TOKO; };
  var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
  S.modTab = S.modTab || 'usulan';
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  VIEW.moderasi = function () {
    if (!window.EXO_USULAN) return '<div class="card elev-sm">Modul usulan (js/exo-usulan.js) belum dimuat.</div>';
    var r = U().ringkasan(), pr = T() ? T().ringkasanAdmin() : { produkModerasi:[], tokoMenunggu:[], komplain:[] }, ul = U().ulasanSemua(), chat = window.EXO_DB ? EXO_DB.all('chatToko').filter(function (c) { return c.belumDibaca; }).length : 0;
    var h = kpi([{label:'Usulan layanan mitra', value:String(r.menunggu), note:r.disetujui + ' disetujui · ' + r.ditolak + ' ditolak', good:!r.menunggu},{label:'Produk menunggu moderasi', value:String(pr.produkModerasi.length), note:pr.tokoMenunggu.length + ' toko menunggu verifikasi', good:!pr.produkModerasi.length && !pr.tokoMenunggu.length},{label:'Ulasan produk', value:String(ul.length), note:ul.filter(function (x) { return x.disembunyikan; }).length + ' disembunyikan'},{label:'Chat toko belum dibalas', value:String(chat), note:'SLA 1 jam pada jam buka', good:!chat}], true, 4);
    h += '<div class="flex gap-8 wrap">' + [['usulan', 'Usulan layanan mitra'], ['produk', 'Produk & toko'], ['ulasan', 'Ulasan produk']].map(function (t) { return pill(S.modTab === t[0], t[1], 'modTab', t[0], true); }).join('') + '</div>';
    return h + ({ usulan:tabUsulan, produk:tabProduk, ulasan:tabUlasan }[S.modTab] || tabUsulan)();
  };
  AKSI.modTab = function (v) { S.modTab = v; };
  function tabUsulan() {
    var d = U().semua();
    return '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Usulan layanan, tarif & area dari mitra</div><div class="t-115 o-6">Mitra mengajukan lewat aplikasi (Penghasilan → Ajukan layanan/tarif). Layanan baru yang disetujui ditambahkan admin ke Services & pricing; tarif yang disetujui langsung menjadi tarif mitra.</div></div></div>' +
      tabel(['Waktu', 'Mitra', 'Jenis', 'Usulan', 'Harga', 'Status', ''], d.length ? d.map(function (u) { return [esc(String(u.at).slice(0, 16).replace('T', ' ')), '<b>' + esc(u.mitraNama) + '</b>', chip('flat', U().namaJenis(u.jenis)), '<b>' + esc(u.judul) + '</b><br><span class="t-11 o-6">' + esc(u.keterangan) + '</span>', u.harga ? rp(u.harga) + (u.satuan ? '/' + esc(u.satuan) : '') : '—', chip(u.status === 'disetujui' ? 'green' : u.status === 'ditolak' ? 'flat' : 'accent', u.status) + (u.catatan ? '<br><span class="t-11 o-6">' + esc(u.catatan) + '</span>' : ''), u.status === 'menunggu' ? '<button class="btn btn-primary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('modUsulan', u.id + ':disetujui') + '>Setujui · PIN</button> <button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('modUsulan', u.id + ':ditolak') + '>Tolak</button>' : (u.oleh ? '<span class="t-11 o-6">' + esc(u.oleh) + '</span>' : '')]; }) : [['<span class="o-6">Belum ada usulan.</span>', '', '', '', '', '', '']]) + '</div>';
  }
  AKSI.modUsulan = function (v) { var p = v.split(':'), u = EXO_DB.find('usulanLayanan', p[0]); var catatan = window.prompt(p[1] === 'disetujui' ? 'Catatan untuk mitra (opsional):' : 'Alasan penolakan (tampil ke mitra):', p[1] === 'disetujui' ? 'Disetujui, berlaku mulai job berikutnya' : ''); if (catatan === null) return; denganPin((p[1] === 'disetujui' ? 'Setujui' : 'Tolak') + ' usulan ' + u.judul + ' dari ' + u.mitraNama, function (oleh) { U().putus(p[0], p[1], oleh, catatan); EXO_PERSETUJUAN.audit(oleh, (p[1] === 'disetujui' ? 'Menyetujui' : 'Menolak') + ' usulan mitra: ' + u.judul, p[0], catatan); A.sekilas('Usulan ' + p[1] + '.'); }); };
  function tabProduk() {
    var pr = T() ? T().ringkasanAdmin() : null; if (!pr) return '<div class="card elev-sm">Modul marketplace belum dimuat.</div>';
    return '<div class="grid g2" style="gap:16px"><div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Produk menunggu moderasi (' + pr.produkModerasi.length + ')</div><div class="t-115 o-6">Setujui/tolak di Marketplace → Produk & moderasi (PIN).</div></div><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('modKeProduk') + '>Buka</button></div>' + tabel(['Produk', 'Toko', 'Harga', 'Foto'], pr.produkModerasi.length ? pr.produkModerasi.map(function (p) { var t = T().toko(p.tokoId); return [esc(p.nama), esc(t ? t.nama : '—'), rp(p.harga), String((p.foto || []).length)]; }) : [['<span class="o-6">Kosong.</span>', '', '', '']]) + '</div>' +
      '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Toko menunggu verifikasi (' + pr.tokoMenunggu.length + ')</div><div class="t-115 o-6">Verifikasi lewat Marketplace → Mitra toko (usulan Persetujuan).</div></div><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('modKeToko') + '>Buka</button></div>' + tabel(['Toko', 'Pemilik', 'Kota', 'Daftar'], pr.tokoMenunggu.length ? pr.tokoMenunggu.map(function (t) { return [esc(t.nama), esc(t.pemilikNama || '—'), esc(t.kota || '—'), esc(String(t.daftarAt || '').slice(0, 10))]; }) : [['<span class="o-6">Kosong.</span>', '', '', '']]) + '</div></div>';
  }
  AKSI.modKeProduk = function () { S.view = 'pasar'; S.pasarTab = 'produk'; };
  AKSI.modKeToko = function () { S.view = 'pasar'; S.pasarTab = 'toko'; };
  function tabUlasan() {
    var ul = U().ulasanSemua();
    return '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Ulasan produk</div><div class="t-115 o-6">Sembunyikan ulasan yang melanggar (kasar, data pribadi, spam) — rating produk dihitung ulang tanpa ulasan tersembunyi. Toko tetap bisa membalas.</div></div></div>' +
      tabel(['Tanggal', 'Produk', 'Pembeli', 'Bintang', 'Ulasan', 'Balasan toko', 'Status', ''], ul.length ? ul.map(function (u) { var p = EXO_DB.find('produk', u.produkId); return [esc(String(u.at).slice(0, 10)), esc(p ? p.nama.slice(0, 40) : '—'), esc(u.pembeliNama), '★ ' + u.bintang, '<span class="t-12">' + esc(u.teks) + '</span>', '<span class="t-12 o-7">' + esc(u.balasan || '—') + '</span>', u.disembunyikan ? chip('flat', 'disembunyikan') : chip('green', 'tayang'), '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('modUlasan', u.id + ':' + (u.disembunyikan ? '0' : '1')) + '>' + (u.disembunyikan ? 'Tampilkan' : 'Sembunyikan') + '</button>']; }) : [['<span class="o-6">Belum ada ulasan.</span>', '', '', '', '', '', '', '']]) + '</div>';
  }
  AKSI.modUlasan = function (v) { var p = v.split(':'), on = p[1] === '1', u = EXO_DB.find('ulasanProduk', p[0]); var alasan = on ? window.prompt('Alasan menyembunyikan (tercatat):', 'Melanggar pedoman ulasan') : ''; if (alasan === null) return; denganPin((on ? 'Sembunyikan' : 'Tampilkan') + ' ulasan ' + u.pembeliNama, function (oleh) { U().sembunyikanUlasan(p[0], on, oleh, alasan); if (T() && T().hitungUlangRating) T().hitungUlangRating(u.produkId); EXO_PERSETUJUAN.audit(oleh, (on ? 'Menyembunyikan' : 'Menampilkan') + ' ulasan produk', p[0], alasan || ''); A.sekilas('Ulasan ' + (on ? 'disembunyikan' : 'ditampilkan') + '.'); }); };
})(ADMIN);
