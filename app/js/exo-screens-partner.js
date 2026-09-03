/* ==========================================================================
   exo-screens-partner.js — 7 layar mitra (+ profil sisi mitra)
   preg · pjobs · pjob · proute · psop · preport · pearn · pwallet
   Bahasanya Indonesia, seperti di rancangan: yang membacanya petugas.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, I = X.I, K = X.KEADAAN, esc = X.esc, rp = X.rp, aksi = X.aksi, kelas = X.kelas, av = X.av,
      ikon = X.ikon, garis = X.garis, IK = X.IK, IKON = X.IKON;

  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }

  /* =============================================================== PJOBS */
  X.LAYAR.pjobs = function () {
    var a = aku(), nd = X.namaDepan(a);
    var h = '<div class="screen"><div class="hero hero--leaf"><div class="flex items-center gap-11">' + X.logoMark(36) +
      '<div class="grow"><div class="f-head t-17">Selamat pagi, ' + esc(nd) + '</div><div class="t-115 o-7">' + (a.rating ? '★ ' + esc(a.rating) + ' · ' : '') + esc(a.jobs) + ' job · area Kemang</div></div>' +
      '<button class="' + kelas('pill', K.daring) + '" style="padding:8px 14px"' + aksi('daring') + '>' + (K.daring ? 'Aktif' : 'Nonaktif') + '</button></div>' +
      '<div class="flex gap-9" style="margin-top:16px"><div class="stat"><b>Rp 1,86jt</b><span>Minggu ini</span></div><div class="stat"><b>22 jam</b><span>Terjadwal</span></div></div></div>';
    h += '<div class="stack gap-12" style="padding:18px 20px 0">';
    h += '<div class="card elev-md gap-11"><div class="flex items-center gap-8"><span class="tag tag-accent">Mulai 24 menit lagi</span><span style="margin-inline-start:auto" class="t-115 o-6">EXO-4471</span></div>' +
      '<div><div class="f-head t-16">Cleaning per jam · 3 jam</div><div class="t-12 o-7">Kemang Residence 12B · 2,1 km · Dewi A.</div></div>' +
      '<div class="flex gap-8"><button class="btn btn-primary" style="flex:1"' + aksi('ke', 'proute') + '>Mulai rute</button><button class="btn btn-secondary" style="flex:1"' + aksi('lembar', 'obrol') + '>Chat</button></div></div>';
    h += '<div class="sec-label" style="margin:0">Permintaan terbuka di dekat Anda</div>';
    for (var i = 0; i < D.PARTNER_JOBS.length; i++) {
      var j = D.PARTNER_JOBS[i];
      h += '<div class="card elev-sm gap-10"><div class="flex items-start gap-10"><div class="grow"><div class="t-135 bold">' + esc(j.service) + '</div><div class="t-115 o-65">' + esc(j.meta) + '</div></div>' +
        '<div class="right"><div class="f-head t-15">' + j.pay + '</div><div class="t-105 o-6">Anda terima ' + j.keep + '</div></div></div>' +
        '<div class="flex gap-7"><span class="tag tag-neutral">' + j.distance + '</span><span class="tag tag-neutral">' + j.when + '</span><span class="tag tag-accent-2 tag-xs">' + esc(j.repeat) + '</span></div>' +
        '<button class="btn btn-primary btn-block" style="margin:0"' + aksi('terimaJob', i) + '>Terima · terkunci untuk Anda</button></div>';
    }
    h += '<div class="card card-clay gap-7"><div class="f-head t-15">Jadwal Anda, keputusan Anda</div><div class="t-125 lh-15">Ops tidak pernah bisa memindahkan job yang sudah Anda terima. Bila pelanggan reschedule kurang dari 4 jam, Anda tetap dibayar 30% atas waktu yang sudah dikunci.</div></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'preg') + '>Formulir pendaftaran mitra baru</button><div class="spacer-14"></div></div>';
    return h + '</div>';
  };

  /* ================================================================ PJOB */
  X.LAYAR.pjob = function () {
    var m = X.sopMeta();
    var h = '<div class="screen">' + X.kepala('Job berjalan', esc((K.orderNo || 'EXO-4471') + ' · ' + K.mulai + '–' + X.jamSelesai() + ' ' + X.labelZona()) + (X.zonaBeda() ? ' · ' + esc('di ponsel Anda ' + X.jamPonsel(K.mulai) + ' ' + X.labelPerangkat()) : ''), 'pjobs') + '<div class="stack gap-14" style="padding:6px 18px 0">';
    h += '<div class="card elev-sm gap-10"><div class="flex items-center gap-11">' + av('DA', 42, 'leaf') + '<div class="grow"><div class="f-head t-15">Dewi Anggraini</div><div class="t-115 o-65">Kemang Residence 12B · gate 4471</div></div>' +
      '<a class="btn btn-icon btn-primary" href="tel:+6281288904417" aria-label="Telepon">' + garis(IK.telepon, 17) + '</a></div>' +
      '<div class="t-12 lh-15 o-8">Catatan: “Tolong bunyikan bel, ada anjing di dalam. Fokus dapur dan kamar mandi.”</div></div>';
    h += '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1;margin:0"' + aksi('ke', 'psop') + '>Checklist SOP · ' + esc(m.code) + '</button><button class="btn btn-secondary" style="flex:1;margin:0"' + aksi('ke', 'preport') + '>Foto sebelum–sesudah</button></div>';
    h += '<div class="card elev-sm gap-11"><div class="f-head t-15">Checklist tugas — pelanggan melihat ini langsung</div>' + X.barisCeklis(true) + '</div>';
    h += '<div class="card card-leaf gap-8"><div class="kv"><span>Upah job</span><span>Rp 234.000</span></div><div class="kv"><span>Biaya platform</span><span>− Rp 3.000</span></div>' +
      '<div class="flex between f-head t-16"><span>Anda terima</span><span>Rp 231.000</span></div><div class="t-115 o-7">Dibayarkan ke BCA ···4471 setiap Senin, atau instan dengan biaya Rp2.500.</div></div><div class="spacer-14"></div></div>';
    h += '<div class="actionbar actionbar--tight"><button class="btn btn-secondary" style="flex:1"' + aksi('lembar', 'masalah') + '>Laporkan masalah</button><button class="btn btn-primary" style="flex:1"' + aksi('selesaikanJob') + '>Selesaikan job</button></div>';
    return h + '</div>';
  };

  /* ============================================================== PROUTE */
  X.LAYAR.proute = function () {
    var ttk = D.ADDRESSES[0].point, pos = K.posisi, jarak = X.jarakKe(ttk), menit = X.menitTempuh(jarak);
    var petaTitik = pos ? { lat:pos.lat, lng:pos.lng } : ttk;
    var eta = K.arrived ? 'Tiba · ' + (K.tibaJam || '08:56') : jarak != null ? menit + ' menit · ' + X.teksJarak(jarak) : '12 menit · 2,1 km';
    var meta = K.arrived ? 'Jam tunggu berjalan · 45 menit' : jarak != null ? 'Dihitung dari posisi perangkat Anda · garis lurus, perkiraan 25 km/jam' : 'Perkiraan · aktifkan lokasi langsung untuk jarak sungguhan';
    var h = '<div class="screen"><div class="map map--tall">' + X.petaHTML(petaTitik, pos ? 'Posisi Anda' : 'Peta rute ke lokasi') + '<div class="tirai"></div>' +
      '<div class="back"><button class="btn btn-icon btn-plain"' + aksi('ke', 'pjobs') + ' aria-label="Kembali">' + garis(IK.kembali) + '</button></div>' +
      '<div class="route-card"><div class="grow"><div class="f-head t-18">' + esc(eta) + '</div><div class="t-115 o-65">' + esc(meta) + '</div></div>' +
      '<a class="btn btn-primary" style="height:38px;padding:0 16px;font-size:12.5px" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + ttk.lat + ',' + ttk.lng + (pos ? '&origin=' + pos.lat + ',' + pos.lng : '') + '">Buka di Maps</a></div></div>';
    h += '<div class="stack gap-14" style="padding:16px 18px 0">';
    h += '<div class="card elev-sm gap-11"><div class="flex items-center gap-10"><div class="grow"><div class="f-head t-16">Kemang Residence 12B</div><div class="t-115 o-65">Gate 4471 · lift tower B · Dewi A.</div></div>' +
      '<button class="btn btn-icon btn-secondary btn-soft"' + aksi('lembar', 'obrol') + ' aria-label="Chat">' + garis(IK.obrol, 17) + '</button></div><div class="flex gap-8">';
    var st = [['Diterima','20:41'],['Dari hub','08:34'],['Tiba','08:56'],['Mulai','09:00']];
    for (var i = 0; i < st.length; i++) h += '<div class="' + kelas('route-stage', i <= (K.arrived ? 2 : 1)) + '"><div class="t-105 o-7">' + st[i][0] + '</div><div class="t-115 bold">' + st[i][1] + '</div></div>';
    h += '</div></div>';
    var gpsNote = !K.gps ? 'Pelanggan tidak bisa melihat Anda — menerima job akan mengaktifkan lagi'
      : K.posisiSibuk ? 'Meminta posisi dari perangkat…'
      : pos ? 'Dari GPS perangkat ini · akurasi ±' + (pos.akurasi || '?') + ' m · ' + X.jamSekarang() + ' · terlihat di layar pelacakan pelanggan pada perangkat ini'
      : K.posisiGalat ? K.posisiGalat + ' — posisi belum terbaca'
      : 'Tekan “Perbarui” untuk membaca posisi dari GPS perangkat';
    h += '<div class="card elev-sm gap-10"><div class="flex items-center gap-10"><span class="hist-dot' + (K.gps && pos ? '' : ' bad') + '" style="width:10px;height:10px;background:' + (K.gps && pos ? 'var(--color-accent-2-500)' : 'var(--color-neutral-400)') + '"></span>' +
      '<div class="grow"><div class="t-13 bold">' + (K.gps ? 'Lokasi langsung aktif' : 'Lokasi langsung nonaktif') + '</div><div class="t-115 o-65">' + esc(gpsNote) + '</div></div>' +
      (K.gps ? '<button class="pill pill-xs"' + aksi('posisiAmbil') + '>Perbarui</button>' : '') +
      '<button class="' + kelas('pill pill-xs', K.gps) + '"' + aksi('gps') + '>' + (K.gps ? 'Aktif' : 'Mati') + '</button></div>' +
      '<div class="t-115 o-65 lh-145">Lokasi hanya dibagikan sejak “berangkat” sampai job selesai — tidak di antara job, tidak di luar shift. Pelacakan lintas perangkat butuh server posisi; belum tersambung.</div></div>';
    var dalamZona = jarak != null && jarak <= 100;
    var geoTeks = !K.gps ? 'Aktifkan lokasi langsung untuk check-in — kedatangan tidak bisa dikonfirmasi tanpa itu.'
      : !pos ? 'Posisi belum terbaca. Check-in hanya terbuka dalam radius 100 m dari alamat.'
      : dalamZona ? 'Anda berada dalam radius check-in 100 m. Foto gerbang terlampir otomatis.'
      : 'Anda ' + X.teksJarak(jarak) + ' dari alamat. Check-in terbuka dalam radius 100 m — bukan tombol yang bisa ditekan dari jauh.';
    h += '<div class="card elev-sm gap-11"><div class="f-head t-15">Check-in kedatangan</div><div class="geofence' + (K.gps && dalamZona ? '' : ' off') + '"><span class="check-sm" style="width:26px;height:26px;font-size:11px">' + (dalamZona ? '✓' : '·') + '</span>' +
      '<div class="grow t-125 lh-145">' + esc(geoTeks) + '</div></div>' +
      '<button class="btn btn-primary btn-block" style="margin:0"' + (!K.gps || K.arrived || !dalamZona ? ' disabled' : aksi('tiba')) + '>' + (K.arrived ? 'Kedatangan terkonfirmasi ✓' : 'Konfirmasi kedatangan') + '</button>' +
      '<div class="t-115 o-65 lh-145">Pelanggan melihat status “tiba” dan jam tunggu 45 menit mulai di sini (30 menit untuk AC), sesuai ketentuan resmi.</div></div>';
    if (K.arrived) h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'pjob') + '>Buka job berjalan →</button>';
    h += '<div class="spacer-14"></div></div>';
    return h + '</div>';
  };

  /* ================================================================ PSOP */
  X.LAYAR.psop = function () {
    var m = X.sopMeta(), ppeOk = X.ppeComplete(), selesai = X.sopSelesai(), semua = selesai >= m.steps.length;
    var h = '<div class="screen">' + X.kepala(esc(m.title), esc(m.code) + ' · Rev.00 · ' + m.ppe.length + ' APD wajib', 'pjob', '<span class="tag tag-accent">' + selesai + '/' + m.steps.length + '</span>');
    h += '<div class="stack gap-14 pad-x18">';
    h += '<div class="card card-clay elev-sm gap-10"><div class="flex items-center gap-9"><span class="av av-solid" style="--s:26px;font-family:var(--font-body);font-size:12px">!</span><div class="grow f-head t-15">APD wajib sebelum mulai</div></div><div class="flex wrap gap-7">';
    for (var p = 0; p < m.ppe.length; p++) h += '<button class="' + kelas('pill pill-sm', !!K.ppe[m.ppe[p]]) + '"' + aksi('ppe', m.ppe[p]) + '>' + (K.ppe[m.ppe[p]] ? '✓' : '○') + ' ' + esc(D.PPE_LABELS[m.ppe[p]] || m.ppe[p]) + '</button>';
    h += '</div><div class="t-115 o-75 lh-145">' + (ppeOk ? 'APD lengkap sesuai ' + m.code + ' · langkah kerja terbuka.' : 'Wajib konfirmasi ' + m.ppe.length + ' APD sesuai ' + m.code + '. Langkah kerja terkunci sampai semuanya dicentang.') + '</div></div>';

    var semuaKit = m.alat.concat(m.chem), nKit = 0;
    for (var q = 0; q < semuaKit.length; q++) if (K.kit[semuaKit[q][0]]) nKit++;
    h += '<div class="card elev-sm gap-11"><div class="flex items-center gap-9"><div class="grow f-head t-15">Checklist alat, chemical &amp; APD</div><span class="chip chip-soft">' + nKit + '/' + semuaKit.length + '</span></div>';
    var grup = [['Alat', m.alat], ['Chemical', m.chem]];
    for (var g = 0; g < grup.length; g++) {
      h += '<div class="stack gap-7"><div class="t-11 up o-6">' + grup[g][0] + '</div>';
      for (var i = 0; i < grup[g][1].length; i++) {
        var it = grup[g][1][i], on = !!K.kit[it[0]];
        h += '<button class="row row-xs' + (on ? ' on-leaf' : '') + '"' + aksi('kit', it[0]) + '><span class="' + kelas('box', on) + '">✓</span><span class="row-main"><b style="font-size:12.5px">' + esc(it[0]) + '</b>' + (it[1] ? '<span style="font-size:11px">' + esc(it[1]) + '</span>' : '') + '</span></button>';
      }
      h += '</div>';
    }
    h += '<div class="t-11 o-65 lh-145">Sesuai C-021 dan ' + esc(m.code) + '. APD dicatat di kartu “APD wajib sebelum mulai” di atas — satu catatan saja, tidak diulang di sini.</div></div>';

    h += '<div>' + X.labelBagian('Langkah kerja · urut') + '<div class="stack gap-8">';
    for (var s = 0; s < m.steps.length; s++) {
      var num = s + 1, row = m.steps[s], done = !!K.sopDone[num], prevDone = num === 1 || !!K.sopDone[num - 1], locked = !ppeOk || !prevDone;
      var fs = K.sopFoto[num] || {};
      h += '<div class="' + kelas('sop-step', false) + (locked ? ' locked' : '') + '"><div class="flex items-start gap-10"><span class="' + kelas('sop-num', done) + '">' + num + '</span>' +
        '<div class="grow"><div class="t-135 bold' + (done ? ' strike' : '') + '">' + esc(row[0]) + '</div>' + (row[1] ? '<div class="t-11 o-6" style="margin-top:2px">' + esc(row[1]) + '</div>' : '') + '</div>' +
        '<button class="sop-btn' + (done ? ' done' : '') + '"' + (locked ? ' disabled' : aksi('sopLangkah', num)) + '>' + (done ? 'Selesai ✓' : row[2] ? 'Foto & tutup' : 'Tandai') + '</button></div>';
      if (row[2] && !done) {
        h += '<div class="flex gap-8" style="margin-top:10px">' +
          '<label class="sop-shot' + (fs.before ? ' isi' : '') + '" style="cursor:pointer">' + (fs.before ? '<img src="' + fs.before.url + '" alt="">' : 'sebelum') + '<input type="file" accept="image/*" capture="environment" data-foto="sop:' + num + ':before" style="display:none"' + (locked ? ' disabled' : '') + '></label>' +
          '<label class="sop-shot' + (fs.after ? ' isi' : '') + '" style="cursor:pointer">' + (fs.after ? '<img src="' + fs.after.url + '" alt="">' : 'sesudah') + '<input type="file" accept="image/*" capture="environment" data-foto="sop:' + num + ':after" style="display:none"' + (locked ? ' disabled' : '') + '></label>' +
          '<div class="grow t-11 o-65 lh-14" style="align-self:center">Foto, jam dan lokasi terekam otomatis — checklist tidak bisa ditutup tanpa keduanya.</div></div>';
      }
      h += '</div>';
    }
    h += '</div></div>';

    h += '<div class="card elev-sm gap-9"><div class="f-head t-15">Temuan di lapangan</div><div class="flex gap-8 wrap">';
    for (var f = 0; f < D.FINDINGS.length; f++) h += '<button class="' + kelas('pill pill-sm', K.finding === D.FINDINGS[f][0]) + '"' + aksi('temuan', D.FINDINGS[f][0]) + '>' + esc(D.FINDINGS[f][1]) + '</button>';
    var fn = K.finding === 'damage' ? 'Formulir H-007 terbuka otomatis; supervisor dan tim fasilitas diberi tahu.'
           : K.finding === 'complaint' ? 'Masuk sebagai kasus di Complaint desk (H-006) dengan pemilik dan tenggat.'
           : K.finding === 'stock' ? 'Permintaan barang H-005 dibuat; supervisor menyetujui dari ponsel.'
           : 'Pilih bila ada temuan — formulir yang tepat dibuka otomatis, tidak perlu kertas.';
    h += '</div><div class="t-115 o-7 lh-145">' + esc(fn) + '</div></div>';
    h += '<div class="card card-leaf gap-8"><div class="f-head t-15">Serah terima shift</div><div class="t-125 lh-15 o-85">Petugas berikutnya: Teguh W. · shift 14:00. Catatan dan sisa pekerjaan otomatis diteruskan ke H-002 miliknya.</div></div><div class="spacer-12"></div></div>';
    h += '<div class="actionbar actionbar--tight"><div class="grow"><div class="t-11 o-6">Laporan harian H-002</div><div class="t-125 bold">' + (semua ? 'Lengkap · siap divalidasi supervisor' : 'Terisi otomatis · menunggu langkah tersisa') + '</div></div>' +
      '<button class="btn btn-primary" style="flex:1"' + (semua ? aksi('kirimSop') : ' disabled') + '>Kirim ke supervisor</button></div>';
    return h + '</div>';
  };

  /* ============================================================= PREPORT */
  X.LAYAR.preport = function () {
    var lengkap = 0, blok = false;
    for (var c = 0; c < D.REPORT_AREAS.length; c++) { var sc = K.shots[D.REPORT_AREAS[c].id] || {}; if (sc.before && sc.after) lengkap++; else blok = true; }
    var h = '<div class="screen">' + X.kepala('Laporan sebelum–sesudah', 'EXO-4471 · ' + lengkap + '/' + D.REPORT_AREAS.length + ' area terdokumentasi', 'pjob');
    h += '<div class="stack gap-12 pad-x18"><div class="card card-clay elev-sm gap-9"><div class="flex items-center gap-9"><span class="av av-solid" style="--s:26px;font-family:var(--font-body);font-size:12px">i</span><div class="grow t-125 lh-145">Foto “sebelum” diambil saat tiba, “sesudah” saat area selesai. Jam dan titik lokasi menempel otomatis pada setiap foto dan tidak bisa diedit.</div></div></div>';
    for (var a = 0; a < D.REPORT_AREAS.length; a++) {
      var ar = D.REPORT_AREAS[a], s = K.shots[ar.id] || {}, done = !!(s.before && s.after);
      var bl = s.before ? (s.before.jam || '09:0' + ar.t) + ' ✓' : 'Ambil foto';
      var al = s.after ? (s.after.jam || '1' + ar.t + ':2' + ar.t) + ' ✓' : s.before ? 'Ambil foto' : 'Foto sebelum dulu';
      h += '<div class="area-card' + (done ? ' done' : '') + '"><div class="flex items-center gap-9"><div class="grow f-head t-15">' + esc(ar.name) + '</div>' +
        '<span class="chip ' + (done ? 'chip-ok' : s.before ? 'chip-soft' : 'chip-flat') + '">' + (done ? 'Lengkap' : s.before ? 'Menunggu foto sesudah' : 'Belum ada foto') + '</span></div><div class="flex gap-10">' +
        '<label class="shot-btn' + (s.before ? ' on' : '') + '"><em>sebelum</em><b>' + esc(bl) + '</b><input type="file" accept="image/*" capture="environment" data-foto="laporan:' + ar.id + ':before" style="display:none"></label>' +
        '<label class="shot-btn' + (s.after ? ' on' : '') + '"' + (s.before ? '' : ' style="opacity:.45;cursor:not-allowed"') + '><em>sesudah</em><b>' + esc(al) + '</b><input type="file" accept="image/*" capture="environment" data-foto="laporan:' + ar.id + ':after" style="display:none"' + (s.before ? '' : ' disabled') + '></label></div>' +
        '<div class="t-11 o-65 lh-14">' + esc(done ? 'Lengkap · terkirim ke pelanggan saat job ditutup' : ar.note) + '</div></div>';
    }
    h += '<div class="card card-leaf gap-8"><div class="t-125 lh-15">Setelah dikirim, pelanggan menerima notifikasi dan bisa membandingkan foto berdampingan. Laporan ini juga menjadi bukti bila ada klaim garansi.</div></div><div class="spacer-12"></div></div>';
    h += '<div class="actionbar actionbar--col"><button class="btn btn-primary btn-block" style="height:46px;margin:0"' + (blok ? ' disabled' : aksi('kirimLaporan')) + '>' + (blok ? 'Lengkapi foto setiap area' : 'Kirim laporan ke pelanggan') + '</button></div>';
    return h + '</div>';
  };

  /* =============================================================== PEARN */
  X.LAYAR.pearn = function () {
    var h = '<div class="screen"><div style="padding:18px 20px 0"><h3 style="margin:0">Penghasilan</h3></div><div class="stack gap-14" style="padding:16px 20px 0">';
    h += '<div class="card elev-md gap-11"><div class="t-12 o-65">Tersedia sekarang</div><div class="f-head t-34" style="line-height:1">' + rp(K.saldoMitra) + '</div>' +
      '<div class="flex gap-8"><button class="btn btn-primary" style="flex:1"' + aksi('ke', 'pwallet') + '>Cairkan</button><button class="btn btn-secondary" style="flex:1"' + aksi('lembar', 'rincian') + '>Rekap</button></div></div>';
    h += '<div class="card elev-sm gap-11"><div class="f-head t-15">7 hari terakhir</div><div class="bars">';
    for (var i = 0; i < D.BARS.length; i++) h += '<div><i class="' + (D.BARS[i][1] === 100 ? 'peak' : '') + '" style="height:' + D.BARS[i][1] + '%" title="' + D.BARS[i][0] + ' · ' + rp(X.upahHari(D.BARS[i][1])) + '"></i><span>' + D.BARS[i][0] + '</span></div>';
    h += '</div></div>';
    h += '<div class="card elev-sm gap-10"><div class="f-head t-15">Status kinerja Anda</div>';
    for (var p = 0; p < D.STANDING.length; p++) h += '<div class="flex items-center gap-10 t-13"><span class="grow o-8">' + esc(D.STANDING[p].label) + '</span><span class="bold">' + D.STANDING[p].value + '</span></div>';
    h += '<div class="t-115 o-7 lh-15">Rating di bawah 4,6 memicu pelatihan ulang berbayar, bukan penonaktifan.</div></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('kePelanggan') + '>← Kembali ke aplikasi pelanggan</button><div class="spacer-14"></div></div>';
    return h + '</div>';
  };
  X.upahHari = function (persen) { return Math.round(D.PEAK_DAY * persen / 100 / 1000) * 1000; };

  /* ============================================================= PWALLET */
  X.LAYAR.pwallet = function () {
    var ada = !!K.bank, fee = K.wdMethod === 'instant' ? 2500 : 0, bersih = K.wdAmount - fee;
    var h = '<div class="screen">' + X.kepala('Dompet mitra', 'Saldo hasil kerja · penarikan ke rekening pribadi', 'pearn') + '<div class="stack gap-14 pad-x18">';
    h += '<div class="card elev-md gap-10"><div class="t-12 o-65">Saldo siap ditarik</div><div class="f-head t-32" style="line-height:1">' + rp(K.saldoMitra) + '</div><div class="flex gap-8">' +
      '<div class="stat stat-sm stat-surface"><b>' + rp(K.saldoMitra) + '</b><span>Cair (job selesai)</span></div><div class="stat stat-sm stat-surface"><b>' + rp(K.tertahan) + '</b><span>Tertahan · job berjalan</span></div></div></div>';
    h += '<div class="bank-card' + (ada ? '' : ' need') + '"><div class="flex items-center gap-9"><div class="grow f-head t-15">Rekening penerima</div><span class="chip ' + (ada ? 'chip-ok' : 'chip-solid') + '">' + (ada ? 'Terverifikasi' : 'Wajib diisi') + '</span></div>';
    if (ada) {
      h += '<div class="flex items-center gap-11"><div class="bank-mark">' + esc(K.bank.bank) + '</div><div class="grow"><div class="t-13 bold">' + esc(K.bank.acc) + '</div><div class="t-11 o-65">a.n. Rina Anggita</div></div><button class="btn btn-ghost t-12"' + aksi('ubahBank') + '>Ubah</button></div>' +
        '<div class="t-11 o-65 lh-145">Nama rekening harus sama persis dengan nama di KTP. Perubahan rekening butuh OTP dan menunda penarikan 24 jam.</div>';
    } else {
      var bisa = K.bankPick && K.bankAcc.length >= 8;
      h += '<div class="t-125 lh-15 o-85">Penarikan terkunci sampai rekening bank atas nama sendiri didaftarkan dan diverifikasi.</div><div class="field"><label>Bank</label><div class="flex wrap gap-7" style="margin-top:6px">';
      for (var b = 0; b < D.BANKS.length; b++) h += '<button class="' + kelas('pill pill-sm', K.bankPick === D.BANKS[b]) + '"' + aksi('bankPick', D.BANKS[b]) + '>' + D.BANKS[b] + '</button>';
      h += '</div></div><div class="field"><label for="exo-rek">Nomor rekening</label><input class="input" id="exo-rek" inputmode="numeric" data-simpan="bankAcc" data-gambar="1" value="' + esc(K.bankAcc) + '" placeholder="Tanpa spasi atau tanda baca"></div>' +
        '<div class="field"><label>Nama pemilik rekening</label><input class="input" value="Rina Anggita" readonly><div class="field-hint">Terkunci mengikuti nama KTP terverifikasi</div></div>' +
        '<button class="save-btn"' + (bisa ? aksi('simpanBank') : ' disabled') + '>' + (!K.bankPick ? 'Pilih bank dulu' : K.bankAcc.length < 8 ? 'Nomor rekening minimal 8 digit' : 'Simpan & verifikasi lewat OTP') + '</button>';
    }
    h += '</div>';
    if (ada) {
      h += '<div class="card elev-sm gap-11"><div class="f-head t-15">Jumlah penarikan</div><div class="flex gap-8 wrap">';
      var nom = [500000, 1000000, K.saldoMitra];
      for (var n = 0; n < nom.length; n++) if (nom[n] > 0) h += '<button class="' + kelas('pill pill-sm', K.wdAmount === nom[n]) + '"' + aksi('wdAmount', nom[n]) + '>' + (n === 2 ? 'Semua · ' : '') + rp(nom[n]) + '</button>';
      h += '</div><div class="stack gap-8">';
      for (var m = 0; m < D.WD_METHODS.length; m++) {
        var w = D.WD_METHODS[m], on = K.wdMethod === w.id;
        h += '<button class="' + kelas('row', on) + '"' + aksi('wdMethod', w.id) + '><span class="row-main"><b style="font-size:13px">' + esc(w.name) + '</b><span>' + esc(w.note) + '</span></span><span class="t-12 bold">' + (w.fee ? 'Rp ' + w.fee.toLocaleString('id-ID') : 'Gratis') + '</span><span class="' + kelas('dot', on) + '"></span></button>';
      }
      h += '</div><div class="rule"></div><div class="kv t-125"><span>Jumlah ditarik</span><span>' + rp(K.wdAmount) + '</span></div><div class="kv t-125"><span>Biaya transfer</span><span>' + (fee ? '− ' + rp(fee) : 'Gratis') + '</span></div><div class="kv t-125"><span>Sisa saldo</span><span>' + rp(K.saldoMitra - K.wdAmount) + '</span></div>' +
        '<div class="flex items-baseline between"><span class="f-head t-15">Diterima</span><span class="f-head t-20">' + rp(bersih) + '</span></div></div>';
    }
    h += '<div class="card elev-sm gap-11"><div class="f-head t-15">Riwayat penarikan</div>';
    for (var r = 0; r < D.WD_HISTORY.length; r++) {
      var x = D.WD_HISTORY[r];
      h += '<div class="flex items-center gap-10"><span class="hist-dot' + (x.ok ? '' : ' bad') + '"></span><div class="grow"><div class="t-125 bold">' + rp(x.amount) + '</div><div class="t-11 o-65">' + esc(x.meta) + '</div></div><span class="chip ' + (x.ok ? 'chip-ok' : 'chip-solid') + '">' + x.state + '</span></div>';
    }
    h += '</div><div class="spacer-12"></div></div>';
    var blok = !ada || (K.wdPinOpen && K.wdPin.length < 6) || K.saldoMitra <= 0 || K.wdAmount > K.saldoMitra;
    var cta = !ada ? 'Daftarkan rekening dulu' : K.saldoMitra <= 0 ? 'Saldo belum tersedia' : !K.wdPinOpen ? (K.wdMethod === 'instant' ? 'Tarik sekarang · ' : 'Jadwalkan Senin · ') + rp(bersih) : K.wdPin.length < 6 ? 'Masukkan PIN untuk melanjutkan' : 'Konfirmasi penarikan · ' + rp(bersih);
    var foot = !ada ? 'Rekening wajib atas nama sendiri — tidak bisa nama pasangan, keluarga, atau rekening bersama.'
             : K.wdPinOpen ? 'Penarikan tidak akan diproses tanpa PIN, meski ponsel Anda sedang dipegang orang lain.'
             : 'Butuh PIN transaksi. Dana hanya masuk ke rekening atas nama Anda sendiri dan setiap penarikan tercatat untuk laporan pajak.';
    h += '<div class="actionbar actionbar--col" style="padding:12px 18px 16px">';
    if (K.wdPinOpen) {
      h += '<div class="stack gap-11" style="padding-bottom:12px"><div class="flex items-center gap-10"><span class="av av-leaf" style="--s:26px">' + ikon(IKON.gembok, 14) + '</span><div class="grow t-125 bold">Masukkan PIN transaksi 6 digit</div><button class="btn btn-ghost t-12"' + aksi('wdBatalPin') + '>Batal</button></div>' +
        X.pinDots(K.wdPin, true) + X.keypad('wdPinTekan', true) + '<div class="center t-11 o-6">PIN sama dengan PIN transaksi akun Anda · 5 kali salah mengunci penarikan 30 menit</div></div>';
    }
    h += '<button class="btn btn-primary btn-block btn-tall"' + (blok ? ' disabled' : aksi('tarikMitra')) + '>' + esc(cta) + '</button><div class="center t-11 o-6" style="margin-top:7px">' + esc(foot) + '</div></div>';
    return h + '</div>';
  };

  /* ================================================================ PREG */
  X.LAYAR.preg = function () {
    var st = K.regStep, a = K.addr, W = D.WILAYAH, cov = X.coverage();
    var sub = ['Langkah 1 dari 4 · data diri','Langkah 2 dari 4 · kontak darurat','Langkah 3 dari 4 · dokumen','Selesai'][st];
    var h = '<div class="screen" style="padding:20px 20px 18px"><div class="flex items-center gap-12">' + X.tombolKembali('', 'regBack') + '<div class="grow"><div class="f-head t-17">Daftar jadi mitra</div><div class="t-115 o-6">' + sub + '</div></div></div>';
    h += '<div class="progress4" style="margin-top:14px">'; for (var i = 0; i < 4; i++) h += '<i class="' + (i <= st ? 'on' : '') + '"></i>'; h += '</div>';

    if (st === 0) {
      h += '<div class="stack gap-12" style="margin-top:18px"><div class="field"><label>Nama sesuai KTP</label><input class="input" value="Rina Anggita"></div><div class="field"><label>NIK</label><input class="input" value="3174••••••••0007"></div><div class="field"><label>Nomor HP (WhatsApp aktif)</label><input class="input" value="+62 813 2245 7781"></div>';
      var sumber = X.sumberWilayah();
      h += '<div class="card-tight stack gap-10" style="background:var(--color-surface)"><div class="flex items-center gap-9"><div class="grow f-head t-15">Alamat domisili</div><span class="chip ' + (sumber ? 'chip-ok' : 'chip-soft') + '" style="font-size:10px">' + (sumber ? 'Data Kemendagri resmi' : 'Data contoh') + '</span></div>';
      var defs = [
        { key:'negara', options:X.wilayahDaftar('negara'), parent:'x', hint:'EXOCLEAN beroperasi di Indonesia dan sedang membuka mitra di negara ASEAN lainnya' },
        { key:'provinsi', options:X.wilayahDaftar('provinsi'), parent:a.negara, hint: sumber ? 'Daftar resmi: ' + sumber.dasar : (a.negara === 'Indonesia' ? 'Daftar mengikuti kode wilayah Kemendagri' : 'Pembagian administratif tingkat pertama negara terpilih') },
        { key:'kabkota', options:X.wilayahDaftar('kabkota'), parent:a.provinsi, hint:'Pilih provinsi dulu untuk membuka daftar' },
        { key:'kecamatan', options:X.wilayahDaftar('kecamatan'), parent:a.kabkota, hint:'Menentukan hub EXOCLEAN terdekat' },
        { key:'desa', options:X.wilayahDaftar('desa'), parent:a.kecamatan, hint:'Nama kelurahan resmi, bukan nama perumahan' },
        { key:'pos', options:X.wilayahDaftar('pos'), parent:a.desa, hint:'Terisi otomatis dari kelurahan, bisa diubah bila berbeda' }
      ];
      for (var d = 0; d < defs.length; d++) {
        var f = defs[d], adaList = f.options.length > 0, locked = !f.parent, val = a[f.key] || '';
        var hint = adaList ? f.hint : (locked ? 'Pilih tingkat di atasnya dulu' : 'Belum ada daftar resmi untuk wilayah ini — ketik manual, tim kami mencocokkan saat verifikasi');
        h += '<div class="field"><label for="exo-addr-' + f.key + '">' + esc(D.ADDR_LABELS[f.key]) + '</label>';
        if (adaList) {
          h += '<select class="input" id="exo-addr-' + f.key + '" data-ubah="addrPick" data-arg="' + f.key + '"' + (locked ? ' disabled' : '') + '>' + (val ? '' : '<option value="">— pilih —</option>');
          for (var o = 0; o < f.options.length; o++) h += '<option value="' + esc(f.options[o]) + '"' + (val === f.options[o] ? ' selected' : '') + '>' + esc(f.options[o]) + '</option>';
          h += '</select>';
        } else {
          h += '<input class="input" id="exo-addr-' + f.key + '" data-ubah="addrPick" data-arg="' + f.key + '" value="' + esc(val) + '"' + (locked ? ' disabled' : '') + ' placeholder="Ketik ' + esc(D.ADDR_LABELS[f.key].toLowerCase()) + '">';
        }
        h += '<div class="field-hint">' + esc(hint) + '</div></div>';
      }
      h += '<div class="field"><label>Alamat lengkap (jalan, RT/RW, nomor)</label><input class="input" value="Jl. Bintaro Utama 9 blok C4 no. 21, RT 004 / RW 007"></div></div>';
      h += '<div class="card-tight stack gap-9" style="background:var(--color-surface)"><div class="f-head t-15">Titik lokasi di peta</div><div class="pin-map"><div class="ph">google maps picker</div>' + (K.pinDropped ? '<div class="pin"></div>' : '') + '</div>' +
        '<div class="flex items-center gap-9"><div class="grow t-12 tabular">' + (K.pinDropped ? '−6,275431 · 106,713922 · akurasi ±8 m' : 'Titik belum ditandai') + '</div><button class="' + kelas('pill pill-sm', !K.pinDropped) + '"' + aksi('dropPin') + '>' + (K.pinDropped ? 'Ubah titik' : 'Tandai lokasi saya') + '</button></div>' +
        '<div class="t-11 o-65 lh-145">' + (K.pinDropped ? 'Titik dipakai untuk menghitung jarak job dan ongkos transport dari hub, bukan untuk ditampilkan ke pelanggan.' : 'Wajib — titik peta menentukan radius job yang bisa Anda terima.') + '</div></div>';
      var ukuran = Math.min(24 + K.radius * 4, 120);
      var rn = K.radius <= 5 ? 'Radius kecil berarti perjalanan singkat dan lebih banyak job per hari, tapi antrean job lebih sedikit saat sepi.'
             : K.radius <= 15 ? 'Radius sedang — keseimbangan terbaik antara jumlah job dan waktu di jalan. Ongkos transport di atas 17 km ditanggung pelanggan.'
             : 'Radius luas membuka paling banyak job, tapi perjalanan panjang memotong jumlah job yang bisa Anda selesaikan sehari.';
      h += '<div class="card-tight stack gap-10" style="background:var(--color-surface)"><div class="flex items-center gap-9"><div class="grow f-head t-15">Area kerja</div><span class="t-105 o-65">dari titik rumah Anda</span></div><div class="flex wrap gap-8">';
      for (var r = 0; r < D.RADII.length; r++) h += '<button class="' + kelas('pill pill-sm', K.radius === D.RADII[r]) + '" style="font-size:13px"' + aksi('radius', D.RADII[r]) + '>' + D.RADII[r] + ' km</button>';
      h += '</div><div class="radius-map"><div class="ph">radius area kerja</div><div class="circle" style="width:' + ukuran + 'px;height:' + ukuran + 'px"></div><div class="center-dot"></div></div>' +
        '<div class="flex gap-9"><div class="stat stat-sm"><b>' + (cov.length ? D.RADIUS_JOBS[K.radius] : 'belum ada data') + '</b><span>perkiraan job/minggu</span></div><div class="stat stat-sm"><b>' + D.RADIUS_TRAVEL[K.radius] + '</b><span>rata-rata perjalanan</span></div></div>' +
        '<div class="t-115 lh-145 o-75">' + rn + '</div><div class="rule"></div><div class="t-115 o-7">' + (cov.length ? (a.negara === 'Indonesia' ? 'Kecamatan yang tercakup pada radius ini' : 'Wilayah yang tercakup pada radius ini') : 'Cakupan wilayah') + '</div>';
      if (cov.length) { h += '<div class="flex wrap gap-6">'; for (var c = 0; c < cov.length; c++) h += '<span class="tag tag-neutral tag-xs">' + esc(cov[c]) + '</span>'; h += '</div>'; }
      else h += '<div class="t-115 lh-145 o-7">Daftar wilayah dihitung setelah titik lokasi Anda diverifikasi tim kami — radius ' + K.radius + ' km tetap tersimpan.</div>';
      h += '</div><div class="field"><label>Pengalaman kebersihan</label><input class="input" value="3 tahun · housekeeping hotel"></div></div>';
    } else if (st === 1) {
      h += '<div class="card card-clay elev-sm gap-8" style="margin-top:16px"><div class="f-head t-15">Wajib: dua kontak darurat</div><div class="t-125 lh-15">Dua nomor orang terdekat yang bisa dihubungi bila terjadi kecelakaan kerja atau petugas tidak dapat dihubungi saat job berjalan. Keduanya harus berbeda orang dan dikonfirmasi lewat OTP.</div></div><div class="stack gap-12" style="margin-top:14px">';
      for (var k = 0; k < 2; k++) {
        var kin = K.kin[k];
        h += '<div class="kin-card' + (kin.verified ? ' ok' : '') + '"><div class="flex items-center gap-9"><span class="num-badge">' + (k + 1) + '</span><div class="grow f-head t-15">' + (k ? 'Kontak darurat kedua' : 'Kontak darurat pertama') + '</div><span class="chip ' + (kin.verified ? 'chip-ok' : 'chip-flat') + '">' + (kin.verified ? 'Terverifikasi' : 'Belum OTP') + '</span></div>' +
          '<div class="field"><label>Nama lengkap</label><input class="input" data-ubah="kinNama" data-arg="' + k + '" value="' + esc(kin.name) + '"></div><div class="field"><label>Hubungan</label><div class="flex wrap gap-7" style="margin-top:6px">';
        for (var rl = 0; rl < D.KIN_RELS.length; rl++) h += '<button class="' + kelas('pill pill-xs', kin.rel === D.KIN_RELS[rl]) + '"' + aksi('kinRel', k + ':' + D.KIN_RELS[rl]) + '>' + D.KIN_RELS[rl] + '</button>';
        h += '</div></div><div class="field"><label>Nomor HP</label><input class="input" data-ubah="kinTelp" data-arg="' + k + '" value="' + esc(kin.phone) + '"></div>' +
          '<button class="otp-btn' + (kin.verified ? ' ok' : '') + '"' + aksi('kinVerif', k) + '>' + (kin.verified ? 'Nomor terverifikasi ✓' : 'Kirim OTP ke nomor ini') + '</button></div>';
      }
      h += '</div><div class="t-115 o-65 lh-145" style="margin-top:12px">Nomor kontak darurat tidak pernah ditampilkan kepada pelanggan dan hanya dipakai oleh tim keselamatan EXOCLEAN.</div>';
    } else if (st === 2) {
      h += '<div class="stack gap-9" style="margin-top:16px">';
      for (var dd = 0; dd < D.REG_DOCS.length; dd++) {
        var doc = D.REG_DOCS[dd], on = !!K.regDocs[doc.id];
        h += '<button class="' + kelas('row', on) + '"' + aksi('regDoc', doc.id) + '><span class="' + kelas('box', on) + '">✓</span><span class="row-main"><b>' + esc(doc.label) + '</b><span>' + esc(doc.note) + '</span></span><span class="chip ' + (doc.state === 'Wajib' ? 'chip-soft' : 'chip-flat') + '">' + doc.state + '</span></button>';
      }
      h += '</div><div class="card card-leaf gap-7" style="margin-top:14px"><div class="t-125 lh-15">Uji keterampilan dijadwalkan otomatis di hub terdekat setelah dokumen lengkap. Anda dibayar Rp75.000 untuk waktu uji, lulus atau tidak.</div></div>';
    } else {
      h += '<div class="center" style="margin-top:26px"><div class="done-mark" style="width:88px;height:88px;margin:0 auto"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-2-800)" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="' + IK.centang + '"/></svg></div>' +
        '<div class="f-head t-22" style="margin-top:16px">Pendaftaran terkirim</div><div class="t-125 o-75 lh-15" style="margin-top:8px">Tim Partner Ops memverifikasi dalam 1×24 jam kerja. Anda bisa memantau statusnya di sini — setiap tahap punya tenggat, bukan “mohon ditunggu”.</div></div>' +
        '<div class="card elev-sm gap-11" style="margin-top:18px;text-align:start">';
      for (var tl = 0; tl < D.REG_TIMELINE.length; tl++) {
        var tt = D.REG_TIMELINE[tl];
        h += '<div class="flex items-center gap-10"><span class="stage-dot lg' + (tt.done ? ' on' : '') + '" style="width:20px;height:20px">' + (tt.done ? '✓' : '') + '</span><div class="grow"><div class="t-13 bold">' + esc(tt.title) + '</div><div class="t-11 o-65">' + esc(tt.note) + '</div></div></div>';
      }
      h += '</div>';
    }
    var kinOk = K.kin[0].verified && K.kin[1].verified && K.kin[0].rel && K.kin[1].rel;
    var docOk = D.REG_REQUIRED.every(function (x) { return K.regDocs[x]; });
    var blok = (st === 0 && !(X.addrFilled() && K.pinDropped)) || (st === 1 && !kinOk) || (st === 2 && !docOk);
    var cta = st === 0 ? (!X.addrFilled() ? 'Lengkapi alamat wilayah' : !K.pinDropped ? 'Tandai titik lokasi di peta' : 'Lanjut ke kontak darurat')
            : st === 1 ? (kinOk ? 'Lanjut ke dokumen' : 'Verifikasi kedua nomor dulu')
            : st === 2 ? (docOk ? 'Kirim pendaftaran' : 'Lengkapi dokumen wajib') : 'Kembali ke daftar job';
    h += '<div class="mt-auto" style="padding-top:16px"><button class="btn btn-primary btn-block btn-tall"' + (blok ? ' disabled' : aksi('regNext')) + '>' + esc(cta) + '</button></div>';
    return h + '</div>';
  };

  /* ================================================= PROFIL SISI MITRA */
  X.profilMitra = function () {
    var a = aku();
    var h = '<div class="screen"><div style="padding:18px 20px 0"><h3 style="margin:0">Profil</h3></div><div class="stack gap-14" style="padding:16px 20px 0">';
    h += '<div class="card elev-sm gap-11"><div class="flex items-center gap-12">' + X.avJuru(a, 52) + '<div class="grow"><div class="f-head t-17">' + esc(a.name) + '</div><div class="t-12 o-65">' + (a.rating ? '★ ' + esc(a.rating) + ' · ' : '') + esc(a.jobs) + ' job · mitra sejak 2022</div></div></div>' +
      '<div class="flex gap-8"><label class="btn btn-secondary" style="flex:1;cursor:pointer">' + (X.fotoMitra(a.id) ? 'Ganti foto profil' : 'Unggah foto profil') + '<input type="file" accept="image/*" capture="user" data-foto="mitra" style="display:none"></label>' + (X.fotoMitra(a.id) ? '<button class="btn btn-ghost"' + aksi('fotoMitraHapus') + '>Hapus</button>' : '') + '</div>' +
      '<div class="t-11 o-6 lh-145">Foto tampil di kartu petugas yang dilihat pelanggan. Wajah jelas, tanpa kacamata hitam — Partner Ops mencocokkannya dengan swafoto KTP.</div></div>';
    var baris = [['Dompet mitra & penarikan', rp(K.saldoMitra), 'ke', 'pwallet'], ['Pendaftaran mitra (formulir)', 'contoh', 'ke', 'preg'], ['Ketentuan & privasi', 'v2.3', 'ke', 'terms'], ['Bantuan — manusia dalam 60 dtk', 'Chat', 'lembar', 'obrol']];
    h += '<div class="card elev-sm gap-10">';
    for (var i = 0; i < baris.length; i++) h += '<button class="setting"' + aksi(baris[i][2], baris[i][3]) + '><span class="grow left">' + esc(baris[i][0]) + '</span><span class="t-115 o-6">' + esc(baris[i][1]) + '</span><span class="o-45">' + garis(IK.kanan, 16) + '</span></button>';
    h += '</div><button class="btn btn-secondary btn-block" style="margin:0"' + aksi('kePelanggan') + '>← Kembali ke aplikasi pelanggan</button><div class="spacer-14"></div></div>';
    return h + '</div>';
  };
})(ExoApp);
