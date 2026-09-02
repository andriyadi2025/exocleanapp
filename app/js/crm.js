/* ==========================================================================
   crm.js — aturan bisnis CRM
   --------------------------------------------------------------------------
   Dua obyek utama:
     • Prospek (lead)   — calon klien yang belum tentu jadi. Punya tahap pipeline.
     • Pelanggan (user) — klien terdaftar. CRM menghitung nilai, segmen, dan
                          kapan terakhir dihubungi dari data order/invoice/toko
                          yang sudah ada, jadi tidak ada data ganda.
   Aktivitas (telepon, WA, kunjungan, catatan) bisa menempel ke keduanya.
   ========================================================================== */
var CRM = (function () {

  /* ================================================================ TAHAP PIPELINE */
  var TAHAP = [
    { id: 'baru',      nama: 'Prospek Baru',       prob: 10,  warna: 'info',   ic: '🌱' },
    { id: 'kontak',    nama: 'Sudah Dikontak',     prob: 25,  warna: 'info',   ic: '📞' },
    { id: 'survei',    nama: 'Survei Lokasi',      prob: 45,  warna: 'warn',   ic: '📐' },
    { id: 'penawaran', nama: 'Penawaran Terkirim', prob: 65,  warna: 'brand',  ic: '📄' },
    { id: 'negosiasi', nama: 'Negosiasi',          prob: 80,  warna: 'warn',   ic: '🤝' },
    { id: 'menang',    nama: 'Menang',             prob: 100, warna: 'ok',     ic: '🎉' },
    { id: 'kalah',     nama: 'Kalah',              prob: 0,   warna: 'danger', ic: '❌' }
  ];
  /** Tahap yang masih berjalan (dipakai papan kanban). */
  var TAHAP_AKTIF = ['baru', 'kontak', 'survei', 'penawaran', 'negosiasi'];

  function tahap(id) { var r = null; TAHAP.forEach(function (t) { if (t.id === id) r = t; }); return r; }
  function tahapBerikut(id) { var i = TAHAP_AKTIF.indexOf(id); return i >= 0 && i < TAHAP_AKTIF.length - 1 ? TAHAP_AKTIF[i + 1] : (id === 'negosiasi' ? 'menang' : null); }
  function tahapSebelum(id) { var i = TAHAP_AKTIF.indexOf(id); return i > 0 ? TAHAP_AKTIF[i - 1] : null; }

  var SUMBER = [
    { id: 'website',    nama: 'Website / SEO',      ic: '🌐' },
    { id: 'whatsapp',   nama: 'WhatsApp langsung',  ic: '💬' },
    { id: 'instagram',  nama: 'Instagram',          ic: '📷' },
    { id: 'google_ads', nama: 'Google Ads',         ic: '🔍' },
    { id: 'referensi',  nama: 'Referensi pelanggan',ic: '🤝' },
    { id: 'telepon',    nama: 'Telepon masuk',      ic: '☎️' },
    { id: 'walk_in',    nama: 'Datang langsung',    ic: '🚪' },
    { id: 'pameran',    nama: 'Pameran / event',    ic: '🎪' },
    { id: 'tender',     nama: 'Tender / undangan',  ic: '📋' }
  ];
  function sumber(id) { var r = null; SUMBER.forEach(function (s) { if (s.id === id) r = s; }); return r; }
  function sumberNama(id) { var s = sumber(id); return s ? s.nama : (id || '—'); }

  var TIPE_AKTIVITAS = [
    { id: 'telepon',   nama: 'Telepon',        ic: '☎️' },
    { id: 'whatsapp',  nama: 'WhatsApp',       ic: '💬' },
    { id: 'email',     nama: 'Email',          ic: '✉️' },
    { id: 'kunjungan', nama: 'Kunjungan / survei', ic: '🚗' },
    { id: 'meeting',   nama: 'Meeting',        ic: '👥' },
    { id: 'catatan',   nama: 'Catatan',        ic: '📝' }
  ];
  function tipeAktivitas(id) { var r = null; TIPE_AKTIVITAS.forEach(function (t) { if (t.id === id) r = t; }); return r; }

  /* ================================================================ PROSPEK */
  function lead(id) { return DB.find('leads', id); }
  function leadAktif() { return DB.all('leads').filter(function (l) { return TAHAP_AKTIF.indexOf(l.tahap) >= 0; }); }
  function leadPerTahap(t) { return DB.all('leads').filter(function (l) { return l.tahap === t; }); }

  /** Nilai pipeline tertimbang: estimasi × probabilitas tahap. */
  function nilaiTertimbang(l) {
    var t = tahap(l.tahap);
    return Math.round((l.estimasiNilai || 0) * (t ? t.prob : 0) / 100);
  }

  function buatLead(data, byId) {
    var l = DB.insert('leads', {
      no: U.docNo('LEAD', DB.nextNo('lead')),
      nama: data.nama, perusahaan: data.perusahaan || '', telp: data.telp, email: data.email || '',
      alamat: data.alamat || '', sumber: data.sumber || 'whatsapp', tipe: data.tipe || 'korporat',
      kebutuhan: data.kebutuhan || [], estimasiNilai: data.estimasiNilai || 0,
      catatan: data.catatan || '', tahap: 'baru', ownerId: data.ownerId || byId || 'u_admin',
      clientId: null, quotationId: null, alasanKalah: null,
      followUpAt: data.followUpAt || U.iso(U.addDays(new Date(), 1)),
      tahapAt: U.nowISO(), closedAt: null
    });
    catatAktivitas({ leadId: l.id, tipe: 'catatan', arah: 'masuk',
      judul: I18N.t('Prospek masuk dari') + ' ' + sumberNama(l.sumber),
      isi: data.catatan || '', hasil: 'terhubung', selesai: true }, byId);
    DB.log(byId || 'u_admin', 'Menambah prospek ' + l.no + ' — ' + l.nama, 'lead', l.id);
    return l;
  }

  /** Pindahkan prospek ke tahap lain, sekaligus mencatat jejaknya. */
  function pindahTahap(leadId, tahapBaru, byId, extra) {
    var l = lead(leadId);
    if (!l || l.tahap === tahapBaru) return l;
    var lama = tahap(l.tahap), baru = tahap(tahapBaru);
    var patch = Object.assign({ tahap: tahapBaru, tahapAt: U.nowISO() }, extra || {});
    if (tahapBaru === 'menang' || tahapBaru === 'kalah') patch.closedAt = U.nowISO();
    else patch.closedAt = null;
    DB.update('leads', leadId, patch);

    catatAktivitas({ leadId: leadId, tipe: 'catatan', arah: 'keluar',
      judul: 'Tahap: ' + (lama ? lama.nama : '—') + ' → ' + (baru ? baru.nama : '—'),
      isi: (extra && extra.alasanKalah) ? 'Alasan: ' + extra.alasanKalah : '',
      hasil: 'terhubung', selesai: true }, byId);
    DB.log(byId || 'u_admin', l.no + ' pindah ke tahap ' + (baru ? baru.nama : tahapBaru), 'lead', leadId);
    return DB.find('leads', leadId);
  }

  /**
   * Ubah prospek menang menjadi akun klien. Bila email sudah dipakai,
   * prospek disambungkan ke akun yang ada, bukan membuat akun ganda.
   */
  function konversiKeKlien(leadId, byId) {
    var l = lead(leadId);
    if (!l) return null;
    if (l.clientId) return BIZ.user(l.clientId);

    var email = (l.email || '').toLowerCase();
    var ada = email ? DB.all('users').filter(function (u) {
      return u.role === 'client' && u.email.toLowerCase() === email; })[0] : null;

    var klien = ada || DB.insert('users', {
      role: 'client', nama: l.nama, perusahaan: l.perusahaan || null,
      email: email || ('lead' + Date.now() + '@exoclean.id'), pass: '123456',
      telp: l.telp, alamat: l.alamat, tipe: l.tipe, aktif: true,
      dariLeadId: l.id, sumber: l.sumber
    });

    DB.update('leads', leadId, { clientId: klien.id, tahap: 'menang', closedAt: U.nowISO(), tahapAt: U.nowISO() });
    catatAktivitas({ leadId: leadId, clientId: klien.id, tipe: 'catatan', arah: 'keluar',
      judul: ada ? I18N.t('Disambungkan ke akun klien yang sudah ada') : I18N.t('Prospek dikonversi menjadi klien'),
      isi: klien.perusahaan || klien.nama, hasil: 'terhubung', selesai: true }, byId);
    DB.log(byId || 'u_admin', 'Konversi ' + l.no + ' → klien ' + klien.nama, 'lead', leadId);
    return klien;
  }

  /* ================================================================ AKTIVITAS */
  function catatAktivitas(data, byId) {
    return DB.insert('activities', {
      leadId: data.leadId || null, clientId: data.clientId || null,
      tipe: data.tipe || 'catatan', arah: data.arah || 'keluar',
      judul: data.judul || '', isi: data.isi || '', hasil: data.hasil || 'terhubung',
      byId: byId || (APP && APP.user ? APP.user.id : 'u_admin'),
      at: data.at || U.nowISO(),
      followUpAt: data.followUpAt || null,
      selesai: data.selesai !== undefined ? data.selesai : true
    });
  }

  function aktivitasUntuk(o) {
    return U.sortBy(DB.all('activities').filter(function (a) {
      return (o.leadId && a.leadId === o.leadId) || (o.clientId && a.clientId === o.clientId);
    }), function (a) { return a.at; }, true);
  }

  /** Tugas follow-up yang belum diselesaikan, dikelompokkan menurut waktu. */
  function agenda() {
    var buka = DB.all('activities').filter(function (a) { return a.followUpAt && !a.selesai; });
    var hariIni = U.today();
    return {
      terlambat: U.sortBy(buka.filter(function (a) { return a.followUpAt < hariIni; }), function (a) { return a.followUpAt; }),
      hariIni: buka.filter(function (a) { return a.followUpAt === hariIni; }),
      mendatang: U.sortBy(buka.filter(function (a) {
        var d = U.diffDays(a.followUpAt, new Date()); return d > 0 && d <= 14; }), function (a) { return a.followUpAt; }),
      nanti: buka.filter(function (a) { return U.diffDays(a.followUpAt, new Date()) > 14; })
    };
  }

  /** Prospek aktif yang sudah lama tidak disentuh sama sekali. */
  function tanpaTindakLanjut(hari) {
    hari = hari || 5;
    return leadAktif().filter(function (l) {
      var punya = DB.all('activities').some(function (a) { return a.leadId === l.id && a.followUpAt && !a.selesai; });
      if (punya) return false;
      var terakhir = aktivitasUntuk({ leadId: l.id })[0];
      var acuan = terakhir ? terakhir.at : l.createdAt;
      return U.diffDays(new Date(), acuan) >= hari;
    });
  }

  /* ================================================================ PELANGGAN 360° */
  function orderKlien(clientId) { return DB.where('orders', { clientId: clientId }); }
  function belanjaKlien(clientId) {
    return DB.where('shopOrders', function (p) { return p.clientId === clientId && p.status !== 'dibatalkan'; });
  }

  /** Total nilai yang pernah ditagihkan ke satu klien (jasa + toko). */
  function nilaiSeumurHidup(clientId) {
    return U.sum(DB.where('invoices', { clientId: clientId }), function (i) { return i.total; });
  }
  function sudahDibayar(clientId) {
    return U.sum(DB.where('invoices', { clientId: clientId }), function (i) { return BIZ.terbayar(i); });
  }
  function piutang(clientId) {
    return U.sum(DB.where('invoices', function (i) {
      return i.clientId === clientId && i.status !== 'lunas'; }), function (i) { return BIZ.sisaTagihan(i); });
  }

  /**
   * Tanggal aktivitas terakhir: order, belanja, atau kontak CRM.
   * Jadwal yang masih di masa depan tidak dihitung — yang dicari adalah
   * kapan terakhir pelanggan ini benar-benar bersentuhan dengan kita.
   */
  function terakhirAktif(clientId) {
    var kini = U.today(), tgl = [];
    function catat(v) { if (v && v <= kini) tgl.push(v); }
    orderKlien(clientId).forEach(function (o) { catat(o.tgl); });
    belanjaKlien(clientId).forEach(function (p) { catat(U.iso(p.createdAt)); });
    aktivitasUntuk({ clientId: clientId }).forEach(function (a) { catat(U.iso(a.at)); });
    if (!tgl.length) return null;
    return tgl.sort()[tgl.length - 1];
  }

  var SEGMEN = {
    baru:     { nama: 'Pelanggan Baru', warna: 'info',   ket: 'Belum ada pekerjaan selesai' },
    aktif:    { nama: 'Aktif',          warna: 'ok',     ket: 'Ada transaksi dalam 60 hari terakhir' },
    setia:    { nama: 'Pelanggan Setia',warna: 'brand',  ket: '3 pekerjaan selesai atau lebih & masih aktif' },
    dorman:   { nama: 'Dorman',         warna: 'muted',  ket: 'Tidak ada transaksi lebih dari 120 hari' },
    berisiko: { nama: 'Perlu Perhatian',warna: 'danger', ket: 'Ada komplain terbuka, rating rendah, atau tunggakan' }
  };

  /**
   * Segmen dihitung, bukan diinput manual — jadi selalu mengikuti keadaan data.
   * Urutan pemeriksaan: risiko dulu, baru keaktifan.
   */
  function segmen(clientId) {
    var komplain = DB.all('complaints').filter(function (c) {
      return c.clientId === clientId && c.status !== 'selesai'; });
    var telat = DB.where('invoices', function (i) {
      return i.clientId === clientId && i.status === 'jatuh_tempo'; });
    var rating = U.sortBy(DB.where('ratings', { clientId: clientId }), function (r) { return r.at; }, true)[0];
    if (komplain.length || telat.length || (rating && rating.bintang <= 3)) return 'berisiko';

    var selesai = orderKlien(clientId).filter(function (o) { return o.status === 'diverifikasi'; }).length;
    var terakhir = terakhirAktif(clientId);
    if (!terakhir) return 'baru';
    var jarak = Math.abs(U.diffDays(new Date(), terakhir));
    if (jarak > 120) return 'dorman';
    if (selesai >= 3) return 'setia';
    if (selesai === 0) return 'baru';
    return 'aktif';
  }

  /** Ringkasan satu pelanggan untuk kartu 360°. */
  function profil(clientId) {
    var o = orderKlien(clientId), b = belanjaKlien(clientId);
    var rating = DB.where('ratings', { clientId: clientId });
    return {
      user: BIZ.user(clientId),
      segmen: segmen(clientId),
      order: o, orderSelesai: o.filter(function (x) { return x.status === 'diverifikasi'; }).length,
      belanja: b,
      nilai: nilaiSeumurHidup(clientId), dibayar: sudahDibayar(clientId), piutang: piutang(clientId),
      terakhirAktif: terakhirAktif(clientId),
      rataRating: rating.length ? Math.round(U.sum(rating, function (r) { return r.bintang; }) / rating.length * 10) / 10 : null,
      komplain: DB.where('complaints', { clientId: clientId }),
      aktivitas: aktivitasUntuk({ clientId: clientId }),
      leadAsal: DB.all('leads').filter(function (l) { return l.clientId === clientId; })[0] || null
    };
  }

  /** Daftar pelanggan pada satu segmen — dipakai kampanye. */
  function pelangganSegmen(seg) {
    return BIZ.usersByRole('client').filter(function (c) { return seg === 'semua' || segmen(c.id) === seg; });
  }

  /* ================================================================ STATISTIK */
  function corong() {
    var semua = DB.all('leads');
    return TAHAP.map(function (t) {
      var l = semua.filter(function (x) { return x.tahap === t.id; });
      return { tahap: t, jumlah: l.length, nilai: U.sum(l, function (x) { return x.estimasiNilai || 0; }) };
    });
  }

  function statistik() {
    var semua = DB.all('leads');
    var aktif = leadAktif();
    var menang = semua.filter(function (l) { return l.tahap === 'menang'; });
    var kalah = semua.filter(function (l) { return l.tahap === 'kalah'; });
    var tutup = menang.length + kalah.length;
    var ag = agenda();

    var perSumber = {};
    semua.forEach(function (l) {
      perSumber[l.sumber] = perSumber[l.sumber] || { total: 0, menang: 0, nilai: 0 };
      perSumber[l.sumber].total++;
      if (l.tahap === 'menang') { perSumber[l.sumber].menang++; perSumber[l.sumber].nilai += l.estimasiNilai || 0; }
    });

    return {
      total: semua.length, aktif: aktif.length, menang: menang.length, kalah: kalah.length,
      nilaiPipeline: U.sum(aktif, function (l) { return l.estimasiNilai || 0; }),
      nilaiTertimbang: U.sum(aktif, nilaiTertimbang),
      nilaiMenang: U.sum(menang, function (l) { return l.estimasiNilai || 0; }),
      konversi: tutup ? Math.round(menang.length / tutup * 100) : 0,
      followUpTerlambat: ag.terlambat.length, followUpHariIni: ag.hariIni.length,
      tanpaTindakLanjut: tanpaTindakLanjut().length,
      perSumber: perSumber,
      segmenKlien: BIZ.usersByRole('client').reduce(function (a, c) {
        var s = segmen(c.id); a[s] = (a[s] || 0) + 1; return a; }, {})
    };
  }

  /** Rata-rata hari dari prospek masuk sampai ditutup (menang atau kalah). */
  function rataSiklus() {
    var tutup = DB.all('leads').filter(function (l) { return l.closedAt; });
    if (!tutup.length) return null;
    return Math.round(U.sum(tutup, function (l) {
      return Math.abs(U.diffDays(l.closedAt, l.createdAt)); }) / tutup.length);
  }

  return {
    TAHAP: TAHAP, TAHAP_AKTIF: TAHAP_AKTIF, tahap: tahap, tahapBerikut: tahapBerikut, tahapSebelum: tahapSebelum,
    SUMBER: SUMBER, sumber: sumber, sumberNama: sumberNama,
    TIPE_AKTIVITAS: TIPE_AKTIVITAS, tipeAktivitas: tipeAktivitas,
    lead: lead, leadAktif: leadAktif, leadPerTahap: leadPerTahap, nilaiTertimbang: nilaiTertimbang,
    buatLead: buatLead, pindahTahap: pindahTahap, konversiKeKlien: konversiKeKlien,
    catatAktivitas: catatAktivitas, aktivitasUntuk: aktivitasUntuk, agenda: agenda,
    tanpaTindakLanjut: tanpaTindakLanjut,
    SEGMEN: SEGMEN, segmen: segmen, profil: profil, pelangganSegmen: pelangganSegmen,
    nilaiSeumurHidup: nilaiSeumurHidup, piutang: piutang, terakhirAktif: terakhirAktif,
    corong: corong, statistik: statistik, rataSiklus: rataSiklus
  };
})();
