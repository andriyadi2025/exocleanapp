/* ==========================================================================
   exo-admin-iklan.js — konsol admin: Iklan toko (Ads, pola Tokopedia TopAds)
   --------------------------------------------------------------------------
   Tab: ringkasan (pendapatan iklan, kredit belum terpakai, tayang/klik) ·
   moderasi (setujui/tolak dengan PIN + audit) · semua iklan (jeda paksa) ·
   isi saldo (riwayat top-up per toko) · setelan (bid, anggaran, slot,
   moderasi wajib — PIN + Persetujuan 'iklan-setelan').
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, pill = A.pill, kpi = A.kpi, tabel = A.tabel;
  var I = function () { return window.EXO_IKLAN; }, T = function () { return window.EXO_TOKO; }, rp = function (n) { return I().rp(n); };
  S.iklanTab = S.iklanTab || 'ringkasan';
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function namaToko(id) { var t = T().toko(id); return t ? t.nama : id; }
  function chipStatus(s) { var w = { aktif:'var(--color-accent-2-100)', moderasi:'#fff4d6', ditolak:'#fde2e7', habis:'#fde2e7' }; return '<span class="tag" style="font-size:10.5px;background:' + (w[s] || 'var(--color-bg)') + '">' + esc(I().STATUS[s] || s) + '</span>'; }
  function barisIklan(ik, aksiHtml) { var p = ik.produkId ? T().produk(ik.produkId) : null, ctr = ik.tayang ? Math.round(ik.klik / ik.tayang * 1000) / 10 : 0; return ['<b>' + esc(ik.judul) + '</b><div class="t-11 o-6">' + (ik.jenis === 'toko' ? 'Iklan toko' : esc(p ? p.nama : '—')) + (ik.kataKunci && ik.kataKunci.length ? ' · ' + esc(ik.kataKunci.join(', ')) : '') + '</div>', esc(namaToko(ik.tokoId)), chipStatus(ik.status), rp(ik.bid) + '<div class="t-11 o-6">' + rp(ik.anggaranHarian) + '/hari</div>', (ik.tayang || 0).toLocaleString('id-ID') + ' · ' + (ik.klik || 0) + '<div class="t-11 o-6">CTR ' + ctr + '%</div>', rp(ik.biaya) + '<div class="t-11 o-6">' + (ik.konversi || 0) + ' konversi</div>', esc(ik.mulai) + ' → ' + esc(ik.sampai), aksiHtml || '']; }
  var KOLOM = ['Iklan', 'Toko', 'Status', 'Bid · anggaran', 'Tayang · klik', 'Biaya', 'Periode', ''];

  VIEW.iklan = function () {
    if (!I()) return '<div class="card elev-sm">Modul iklan (js/exo-iklan.js) belum dimuat.</div>';
    I().semai(); var r = I().ringkasanAdmin();
    var h = '<div class="flex gap-8 wrap">' + [['ringkasan', 'Ringkasan'], ['moderasi', 'Moderasi' + (r.moderasi.length ? ' (' + r.moderasi.length + ')' : '')], ['semua', 'Semua iklan'], ['topup', 'Isi saldo'], ['setelan', 'Setelan & tarif']].map(function (t) { return pill(S.iklanTab === t[0], t[1], 'iklanTab', t[0], true); }).join('') + '</div><div class="spacer-14"></div>';
    return h + ({ ringkasan:tabRingkasan, moderasi:tabModerasi, semua:tabSemua, topup:tabTopup, setelan:tabSetelan }[S.iklanTab] || tabRingkasan)(r);
  };
  AKSI.iklanTab = function (v) { S.iklanTab = v; };

  function tabRingkasan(r) {
    var c = I().pengaturan();
    var h = kpi([{label:'Pendapatan iklan (total)', value:rp(r.pendapatan), note:'bulan ini ' + rp(r.pendapatanBulan) + ' · akun 4150'},{label:'Kredit iklan belum terpakai', value:rp(r.kredit), note:'liabilitas 2520 · ' + r.tokoBeriklan + ' toko beriklan'},{label:'Iklan aktif', value:String(r.aktif), note:r.iklan.length + ' total · ' + r.moderasi.length + ' menunggu moderasi', good:!r.moderasi.length},{label:'Tayang · klik', value:r.tayang.toLocaleString('id-ID') + ' · ' + r.klik, note:'CTR ' + (r.tayang ? Math.round(r.klik / r.tayang * 1000) / 10 : 0) + '%'},{label:'Fasilitas iklan', value:c.aktif ? 'Aktif' : 'Nonaktif', note:'slot cari ' + c.slotCari + ' · beranda ' + c.slotBeranda + ' · produk ' + c.slotProduk, good:c.aktif}], true, 5);
    h += '<div class="spacer-14"></div><div class="grid g2" style="gap:16px"><div class="card elev-sm gap-8"><div class="card-title">Model iklan (pola Tokopedia TopAds)</div>' + ['Mitra toko mengisi saldo iklan (potong saldo toko atau bayar via gateway) → kredit dicatat sebagai liabilitas 2520.', 'Iklan produk / iklan toko dengan kata kunci, bid per klik (' + rp(c.bidMin) + '–' + rp(c.bidMaks) + '), anggaran harian (min ' + rp(c.anggaranHarianMin) + '), durasi ≤ ' + c.durasiMaks + ' hari.', 'Slot berlabel "' + esc(c.label) + '": atas hasil cari/kategori Toko, beranda pelanggan (Rekomendasi), dan halaman produk. Satu toko maksimal satu slot per halaman.', 'Peringkat = bid × kualitas (CTR). Setiap klik memotong saldo sebesar bid → pendapatan 4150. Anggaran harian / saldo habis → iklan berhenti otomatis.', 'Konversi diatribusikan bila pesanan berisi produk/toko yang diklik dari iklan dalam 7 hari (ROAS = nilai pesanan ÷ biaya iklan).', (c.moderasi ? 'Moderasi wajib: iklan baru & perubahan judul/kata kunci menunggu persetujuan admin (PIN + audit).' : 'Moderasi dimatikan: iklan langsung tayang.')].map(function (x) { return '<div class="t-125 lh-15">• ' + x + '</div>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Iklan berkinerja tertinggi</div>' + tabel(['Iklan', 'Toko', 'Klik', 'CTR', 'Biaya', 'Konversi'], r.iklan.slice().sort(function (a, b) { return (b.klik || 0) - (a.klik || 0); }).slice(0, 6).map(function (ik) { return [esc(ik.judul), esc(namaToko(ik.tokoId)), String(ik.klik || 0), (ik.tayang ? Math.round(ik.klik / ik.tayang * 1000) / 10 : 0) + '%', rp(ik.biaya), String(ik.konversi || 0)]; })) + '</div></div>';
    return h;
  }
  function tabModerasi(r) {
    var h = '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Antrean moderasi iklan</div><div class="t-115 o-6">Periksa judul & kata kunci: tidak menyesatkan, bukan merek pihak lain, sesuai produk. Setujui/tolak dengan PIN — tercatat di audit.</div></div></div>';
    h += tabel(KOLOM, r.moderasi.length ? r.moderasi.map(function (ik) { return barisIklan(ik, '<div class="flex gap-4"><button class="btn btn-primary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('iklanSetujui', ik.id) + '>Setujui</button><button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('iklanTolak', ik.id) + '>Tolak</button></div>'); }) : [['<span class="o-6">Tidak ada iklan menunggu.</span>', '', '', '', '', '', '', '']]);
    return h + '</div>';
  }
  function tabSemua(r) { return '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Semua iklan (' + r.iklan.length + ')</div><div class="t-115 o-6">Admin bisa menjeda paksa iklan yang melanggar; mitra toko melihat statusnya di Seller Center → Iklan.</div></div></div>' + tabel(KOLOM, r.iklan.length ? r.iklan.map(function (ik) { return barisIklan(ik, ik.status === 'aktif' ? '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('iklanJedaPaksa', ik.id) + '>Jeda paksa</button>' : ik.status === 'ditolak' ? '<span class="t-11 o-6">' + esc(ik.alasanTolak || '') + '</span>' : ''); }) : [['<span class="o-6">Belum ada iklan.</span>', '', '', '', '', '', '', '']]) + '</div>'; }
  function tabTopup(r) { return '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Isi saldo iklan (' + r.topup.length + ')</div><div class="t-115 o-6">Potong saldo toko → jurnal 2510 → 2520; gateway → 1100 → 2520. Terpakai per klik → 2520 → 4150.</div></div></div>' + tabel(['Waktu', 'Toko', 'Jumlah', 'Sumber', 'Status', 'Oleh'], r.topup.length ? r.topup.map(function (t) { return [esc(String(t.at).slice(0, 16).replace('T', ' ')), esc(namaToko(t.tokoId)), rp(t.jumlah), esc(t.sumber === 'saldo' ? 'saldo toko' : 'gateway (simulasi)'), esc(t.status), esc(t.oleh || '—')]; }) : [['<span class="o-6">Belum ada.</span>', '', '', '', '', '']]) + '</div>'; }
  function tabSetelan() {
    var c = I().pengaturan(), f = S.iklanForm || (S.iklanForm = Object.assign({}, c));
    function angka(k, label, ket) { return '<div class="field"><label>' + esc(label) + '</label><input class="input" inputmode="numeric" style="max-width:200px" value="' + esc(f[k]) + '" data-ubah="iklanUbah" data-arg="' + k + '">' + (ket ? '<div class="t-11 o-6">' + esc(ket) + '</div>' : '') + '</div>'; }
    function saklar(k, label, ket) { return '<div class="flex items-center gap-10" style="padding:6px 0"><span class="grow t-125">' + esc(label) + (ket ? '<div class="t-11 o-6">' + esc(ket) + '</div>' : '') + '</span>' + pill(!!f[k], f[k] ? 'Aktif' : 'Nonaktif', 'iklanSaklar', k, true) + '</div>'; }
    var h = '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="card-title">Tarif & batas</div>' + saklar('aktif', 'Fasilitas iklan', 'Nonaktif = semua slot iklan kosong, mitra tidak bisa memasang iklan baru.') + angka('bidMin', 'Bid minimum per klik (Rp)', 'Tokopedia TopAds mulai sekitar Rp200–Rp500 tergantung kategori.') + angka('bidMaks', 'Bid maksimum per klik (Rp)') + angka('anggaranHarianMin', 'Anggaran harian minimum (Rp)') + angka('topupMin', 'Isi saldo minimum (Rp)') + angka('durasiMaks', 'Durasi iklan maksimum (hari)') + '</div>';
    h += '<div class="card elev-sm gap-10"><div class="card-title">Slot & moderasi</div>' + angka('slotCari', 'Slot di hasil cari / kategori Toko', 'jumlah kartu berlabel iklan di atas hasil') + angka('slotBeranda', 'Slot di beranda pelanggan (Rekomendasi)') + angka('slotProduk', 'Slot di halaman produk (Sponsor)') + '<div class="field"><label>Label iklan</label><input class="input" style="max-width:200px" maxlength="12" value="' + esc(f.label) + '" data-ubah="iklanUbahTeks" data-arg="label"></div>' + saklar('moderasi', 'Moderasi wajib sebelum tayang', 'Iklan baru & perubahan judul/kata kunci masuk antrean Moderasi.') + '</div></div><div class="spacer-14"></div>';
    h += '<div class="card elev-sm"><div class="flex items-center gap-10"><span class="grow t-125 o-7">Perubahan diajukan lewat PIN dan Persetujuan (tingkat sedang), tercatat di audit.</span><button class="btn btn-secondary" style="height:36px"' + aksi('iklanSetelanBatal') + '>Batalkan</button><button class="btn btn-primary" style="height:36px"' + aksi('iklanSetelanAjukan') + '>Ajukan · PIN + Persetujuan</button></div></div>';
    return h;
  }

  /* ---------- aksi ---------- */
  AKSI.iklanSetujui = function (id) { var ik = I().iklan(id); denganPin('Setujui iklan "' + ik.judul + '" (' + namaToko(ik.tokoId) + ')', function (oleh) { I().putus(id, 'aktif', '', oleh.nama); EXO_PERSETUJUAN.audit(oleh, 'Setujui iklan ' + ik.judul, id, 'toko ' + namaToko(ik.tokoId) + ' · bid ' + ik.bid); A.sekilas('Iklan disetujui dan tayang.'); }); };
  AKSI.iklanTolak = function (id) { var ik = I().iklan(id), alasan = window.prompt('Alasan penolakan (dikirim ke mitra toko):', 'Judul/kata kunci tidak sesuai produk'); if (alasan === null) return; denganPin('Tolak iklan "' + ik.judul + '"', function (oleh) { I().putus(id, 'ditolak', alasan, oleh.nama); EXO_PERSETUJUAN.audit(oleh, 'Tolak iklan ' + ik.judul, id, alasan); A.sekilas('Iklan ditolak.'); }); };
  AKSI.iklanJedaPaksa = function (id) { var ik = I().iklan(id); denganPin('Jeda paksa iklan "' + ik.judul + '"', function (oleh) { I().jeda(id); EXO_PERSETUJUAN.audit(oleh, 'Jeda paksa iklan ' + ik.judul, id, 'toko ' + namaToko(ik.tokoId)); A.sekilas('Iklan dijeda.'); }); };
  AKSI.iklanUbah = function (k, v) { S.iklanForm[k] = Number(String(v).replace(/\D/g, '')) || 0; };
  AKSI.iklanUbahTeks = function (k, v) { S.iklanForm[k] = String(v || '').trim().slice(0, 12) || 'Iklan'; };
  AKSI.iklanSaklar = function (k) { S.iklanForm[k] = !S.iklanForm[k]; };
  AKSI.iklanSetelanBatal = function () { S.iklanForm = null; };
  AKSI.iklanSetelanAjukan = function () {
    var f = S.iklanForm, lama = I().pengaturan(); if (!f) return; var beda = Object.keys(f).filter(function (k) { return String(f[k]) !== String(lama[k]); }); if (!beda.length) { A.sekilas('Tidak ada perubahan.'); return; }
    if (f.bidMin < 50 || f.bidMin > f.bidMaks || f.anggaranHarianMin < f.bidMin) { A.sekilas('Periksa nilai: bid minimum ≥ 50, ≤ bid maksimum; anggaran harian ≥ bid minimum.', 'err'); return; }
    var ringkas = beda.map(function (k) { return k + ': ' + lama[k] + ' → ' + f[k]; }).join('; ');
    denganPin('Ubah setelan iklan (' + beda.length + ' perubahan)', function (oleh) { var h = EXO_PERSETUJUAN.ajukan('iklan-setelan', 'Ubah setelan iklan toko', ringkas, lama, f, Object.assign({}, f), oleh); EXO_PERSETUJUAN.audit(oleh, 'Ajukan setelan iklan', h.usulan.id, ringkas); S.iklanForm = null; A.sekilas(h.langsung ? 'Setelan iklan diterapkan.' : 'Usulan masuk antrean Persetujuan · butuh ' + h.usulan.butuh + ' penyetuju.'); });
  };
})(ADMIN);
