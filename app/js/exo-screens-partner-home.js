/* ==========================================================================
   exo-screens-partner-home.js — beranda mitra cleaning ala aplikasi mitra
   penyedia jasa kebersihan (Mitra KliknClean, Clean Dash Mitra, GoLife)
   --------------------------------------------------------------------------
   Pola yang diterapkan: kepala profil (foto, nama, tingkat, skor performa)
   dengan saklar ONLINE/OFFLINE besar → ringkasan hari ini (job, pendapatan,
   poin performa) → Order masuk dengan hitung mundur Terima/Tolak (gerbang
   SOP tetap berlaku) → Job berikutnya (Mulai rute · Navigasi · Chat) →
   Jadwal hari ini (linimasa) → Absen/kehadiran shift → menu cepat 4 kolom
   → Insentif & target mingguan → kartu tas, pengumuman, Akademi, tips.
   Layar tambahan: Jadwal (kalender 7 hari), Insentif, Absen, Riwayat job.
   Navigasi bawah: Beranda · Jadwal · Berjalan · Penghasilan · Akun.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, rp = X.rp, A = X.AKSI, ikon = X.ikon, IKON = X.IKON;
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  var JASA_NAMA = { hourly:'Cleaning per jam', deep:'Deep cleaning', ac:'Cuci & servis AC', sofa:'Sofa, kasur & karpet', laundry:'Laundry' };
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  K.orderMasuk = K.orderMasuk || null; K.jobDiterima = K.jobDiterima || []; K.jobDitolak = K.jobDitolak || []; K.absen = K.absen || { masuk:'', keluar:'', riwayat:[] }; K.jadwalHari = K.jadwalHari || 0;
  function tglOffset(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function jamKini() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  /* Order masuk: dari PARTNER_JOBS dengan tenggat terima 10 menit sejak muncul (pola aplikasi mitra: order kedaluwarsa bila tidak direspons). */
  function orderMasuk() {
    if (!K.orderMasuk) { var kini = Date.now(); K.orderMasuk = D.PARTNER_JOBS.map(function (j, i) { return Object.assign({ id:'om' + i, idx:i, tgl:tglOffset(1 + i), jam:(j.when || '').split(' ')[1] || '08:00', sampai:kini + (10 + i * 4) * 60000, pelanggan:['Rina S.', 'Budi H.', 'Maya P.'][i % 3] }, j); }); }
    return K.orderMasuk.filter(function (o) { return !o.status; });
  }
  function sisaMenit(o) { return Math.max(0, Math.ceil((o.sampai - Date.now()) / 60000)); }
  function skorPerforma() { var a = aku(), r = parseFloat(String(a.rating || '4.8').replace(',', '.')), skor = Math.round(r / 5 * 60 + 0.98 * 25 + 15); return { skor:Math.min(100, skor), tingkat:skor >= 90 ? 'Gold' : skor >= 75 ? 'Silver' : 'Bronze', rating:a.rating || '—' }; }
  function insentif() { var selesaiMinggu = 9 + K.jobDiterima.length; return [{ judul:'Target 12 job minggu ini', kini:selesaiMinggu, target:12, hadiah:150000, ket:'bonus cair Senin bersama payout' }, { judul:'Rating ≥ 4,8 (30 job terakhir)', kini:4.9, target:4.8, hadiah:50000, ket:'bonus kualitas mingguan', pct:100 }, { judul:'Tepat waktu 100% (7 hari)', kini:98, target:100, hadiah:35000, ket:'tiba ≤ 5 menit sebelum jadwal' }]; }
  function jobHari(tgl) {
    var out = []; if (tgl === tglOffset(0) && !K.dibatalkan) out.push({ jam:K.mulai || '09:00', judul:(JASA_NAMA[K.jasa] || 'Cleaning per jam') + ' · ' + X.qtyText(K.jam), sub:'Kemang Residence 12B · Dewi A.', status:'berikutnya', no:K.orderNo || 'EXO-4471' });
    K.jobDiterima.forEach(function (o) { if (o.tgl === tgl) out.push({ jam:o.jam, judul:o.service, sub:o.meta.split(' · ')[0] + ' · ' + o.pelanggan, status:'diterima', no:o.no }); });
    if (tgl === tglOffset(0)) out.push({ jam:'14:00', judul:'Cuci AC · 2 unit', sub:'Cipete · Anton W.', status:'terjadwal', no:'EXO-4469' });
    return out.sort(function (a, b) { return a.jam.localeCompare(b.jam); });
  }
  function saklarDaring() { return '<button style="all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:999px;background:' + (K.daring ? '#0a8f5c' : '#6b7280') + ';color:#fff;font-size:12px;font-weight:800;letter-spacing:.04em"' + aksi('daring') + '><span>' + (K.daring ? 'ONLINE' : 'OFFLINE') + '</span><span style="width:34px;height:20px;border-radius:999px;background:rgba(255,255,255,.35);position:relative"><i style="position:absolute;top:2px;' + (K.daring ? 'right:2px' : 'left:2px') + ';width:16px;height:16px;border-radius:999px;background:#fff"></i></span></button>'; }

  X.LAYAR.pjobs = function () {
    var a = aku(), nd = X.namaDepan(a), KM = (window.EXO_KONTEN ? EXO_KONTEN.baca('mitra') : null) || {}, sp = skorPerforma(), om = orderMasuk(), hari = jobHari(tglOffset(0)), ins = insentif();
    var pendapatanHariIni = X.upahHari ? X.upahHari(D.BARS[Math.min(new Date().getDay() || 6, D.BARS.length) - 1][1]) : 0;
    var h = '<div class="screen"><div class="hero hero--leaf" style="padding-bottom:14px"><div class="flex items-center gap-10">' + X.avJuru(a, 46) + '<div class="grow" style="min-width:0"><div class="f-head t-16" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(KM.sapaan || 'Selamat pagi') + ', ' + esc(nd) + '</div><div class="flex items-center gap-6 t-11 o-7"><span class="tag tag-accent" style="font-size:10px">' + esc(sp.tingkat) + '</span><span>★ ' + esc(sp.rating) + ' · ' + esc(a.jobs) + ' job · ' + esc(KM.area || 'area Kemang') + '</span></div></div>' + X.tombolBahasa() + '</div>';
    h += '<div class="flex items-center gap-10" style="margin-top:12px">' + saklarDaring() + '<span class="t-11 o-7 grow">' + (K.daring ? 'Order masuk akan ditawarkan ke Anda.' : 'Anda tidak menerima order baru saat offline.') + '</span></div>';
    h += '<button class="card elev-sm gap-4" style="margin-top:12px;text-align:start;cursor:pointer;padding:10px 14px"' + aksi('ke', 'pearn') + '><div class="flex items-center gap-8"><div class="grow"><div class="t-11 up o-6">Skor performa</div><div class="flex items-baseline gap-6"><b class="f-head t-18" style="color:' + (sp.skor >= 90 ? '#0a8f5c' : '#b45309') + '">' + sp.skor + '</b><span class="t-11 o-6">/100 · ' + esc(sp.tingkat) + (sp.skor < 90 ? ' · ' + (90 - sp.skor) + ' poin ke Gold' : '') + '</span></div></div><div class="t-11 o-7" style="text-align:end">tepat waktu 98%<br>batal 0</div></div><div class="progress"><i style="width:' + sp.skor + '%"></i></div></button>';
    h += (window.EXO_KONTEN ? EXO_KONTEN.tiketHtml('mitra', 'margin-top:12px') : '') + '</div>';
    h += '<div class="stack gap-12" style="padding:14px 20px 0">';
    /* ringkasan hari ini */
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + [['Job hari ini', String(hari.length), 'pjadwal'], ['Pendapatan hari ini', rp(pendapatanHariIni).replace('Rp ', 'Rp'), 'pearn'], ['Order masuk', String(om.length), 'pjobs']].map(function (k) { return '<button class="card elev-sm gap-2" style="text-align:start;cursor:pointer;padding:10px 12px"' + aksi('ke', k[2]) + '><div class="t-10 o-6">' + k[0] + '</div><b class="t-135">' + k[1] + '</b></button>'; }).join('') + '</div>';
    if (X.kartuKeselamatan) h += X.kartuKeselamatan();
    if (X.kartuPengumuman) h += X.kartuPengumuman();
    if (X.kartuTas) h += X.kartuTas();
    /* order masuk */
    if (om.length && K.daring) {
      h += '<div><div class="flex items-center gap-8" style="margin-bottom:8px"><div class="f-head t-15 grow">📥 Order masuk</div><span class="tag tag-accent">' + om.length + ' menunggu respons</span></div>';
      om.slice(0, 3).forEach(function (o) { var menit = sisaMenit(o); h += '<div class="card elev-md gap-8" style="margin-bottom:8px;border:1.5px solid var(--color-accent-2-300)"><div class="flex items-center gap-8"><span class="tag tag-accent-2" style="font-size:10px">' + esc(o.repeat) + '</span><span class="t-11 o-6 grow">' + esc(o.tgl === tglOffset(1) ? 'Besok' : o.tgl) + ' · ' + esc(o.jam) + '</span><span class="tag" style="font-size:10px;background:' + (menit <= 3 ? '#fde2e7' : '#fff4d6') + '">⏱ ' + menit + ' mnt lagi</span></div><div class="flex items-start gap-10"><div class="grow"><div class="f-head t-15">' + esc(o.service) + '</div><div class="t-115 o-7">' + esc(o.meta) + ' · ' + esc(o.pelanggan) + '</div><div class="flex gap-6 wrap" style="margin-top:4px"><span class="tag tag-neutral">' + esc(o.distance) + '</span><span class="tag tag-neutral">' + esc(o.when) + '</span></div></div><div class="right"><div class="f-head t-16">' + esc(o.pay) + '</div><div class="t-10 o-6">Anda terima ' + esc(o.keep) + '</div></div></div>' + (X.gerbangSop ? X.gerbangSop(o, o.idx).replace(/data-aksi="terimaJob" data-arg="[^"]*"/, 'data-aksi="orderTerima" data-arg="' + o.id + '"').replace('Terima · terkunci untuk Anda', '✓ Terima order') : '') + '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('orderTolakBuka', o.id) + '>Tolak</button>' + (K.orderTolakId === o.id ? '<div class="flex gap-6 wrap">' + ['Jadwal bentrok', 'Terlalu jauh', 'Tidak sesuai keahlian', 'Alasan lain'].map(function (r) { return '<button class="pill pill-sm"' + aksi('orderTolak', o.id + '|' + r) + '>' + r + '</button>'; }).join('') + '</div>' : '') + '</div>'; });
      h += '</div>';
    } else if (!K.daring) h += '<div class="card card-clay t-115 lh-15">Anda sedang <b>offline</b>. Nyalakan ONLINE untuk menerima order masuk di area Anda.</div>';
    /* job berikutnya */
    if (!K.dibatalkan) h += '<div class="card elev-md gap-10"><div class="flex items-center gap-8"><span class="tag tag-accent">Mulai 24 menit lagi</span><span style="margin-inline-start:auto" class="t-115 o-6">' + esc(K.orderNo || 'EXO-4471') + '</span></div><div><div class="f-head t-16">' + esc(JASA_NAMA[K.jasa] || 'Cleaning per jam') + ' · ' + esc(X.qtyText(K.jam)) + '</div><div class="t-12 o-7">Kemang Residence 12B · 2,1 km · Dewi A. · ' + esc(K.mulai || '09:00') + '</div></div><div class="flex gap-8"><button class="btn btn-primary" style="flex:1"' + aksi('mulaiRute') + '>Mulai rute</button><a class="btn btn-secondary" style="flex:1;text-decoration:none" href="https://maps.google.com/?q=Kemang+Residence+12B" target="_blank" rel="noopener">Navigasi</a><button class="btn btn-secondary" style="flex:1"' + aksi('lembar', 'obrol') + '>Chat</button></div></div>';
    /* jadwal hari ini */
    h += '<div><div class="flex items-center gap-8" style="margin-bottom:8px"><div class="f-head t-15 grow">Jadwal hari ini</div><button class="btn btn-ghost t-115"' + aksi('ke', 'pjadwal') + '>Kalender →</button></div><div class="card elev-sm gap-0" style="padding:6px 12px">' + (hari.length ? hari.map(function (j, i) { return '<div class="flex items-center gap-10" style="padding:8px 0' + (i ? ';border-top:1px solid var(--color-divider)' : '') + '"><b class="t-125" style="width:44px">' + esc(j.jam) + '</b><div class="grow" style="min-width:0"><div class="t-125 bold">' + esc(j.judul) + '</div><div class="t-11 o-6">' + esc(j.sub) + ' · ' + esc(j.no) + '</div></div><span class="tag ' + (j.status === 'berikutnya' ? 'tag-accent' : 'tag-neutral') + '" style="font-size:10px">' + esc(j.status) + '</span></div>'; }).join('') : '<div class="t-125 o-6" style="padding:8px 0">Tidak ada job hari ini.</div>') + '</div></div>';
    /* absen */
    var ab = K.absen; h += '<div class="card ' + (ab.masuk && !ab.keluar ? 'card-leaf' : 'elev-sm') + ' gap-6"><div class="flex items-center gap-8"><span style="font-size:20px">🕒</span><div class="grow"><b class="t-125">Absen shift</b><div class="t-11 o-6">' + (ab.masuk ? 'Masuk ' + esc(ab.masuk) + (ab.keluar ? ' · keluar ' + esc(ab.keluar) : ' · sedang bertugas') : 'Belum absen hari ini · lokasi & jam terekam otomatis') + '</div></div>' + (!ab.masuk ? '<button class="btn btn-primary" style="height:32px;font-size:12px"' + aksi('absenMasuk') + '>Absen masuk</button>' : !ab.keluar ? '<button class="btn btn-secondary" style="height:32px;font-size:12px"' + aksi('absenKeluar') + '>Absen keluar</button>' : '<span class="tag tag-accent-2">selesai</span>') + '</div></div>';
    /* menu cepat */
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px 6px">' + [['pjadwal', '📅', 'Jadwal'], ['pjob', '🧹', 'Job berjalan'], ['priwayat', '🧾', 'Riwayat'], ['pearn', '💰', 'Pendapatan'], ['pinsentif', '🎯', 'Insentif'], ['pabsen', '🕒', 'Absen'], ['pkit', '🧴', 'Perlengkapan'], ['pbelajar', '🎓', 'Akademi']].map(function (m) { return '<button style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center"' + aksi('ke', m[0]) + '><span style="width:50px;height:50px;border-radius:16px;background:var(--color-surface);display:grid;place-items:center;font-size:23px;box-shadow:0 1px 2px rgba(0,0,0,.05)">' + m[1] + '</span><span class="t-11" style="line-height:1.15">' + m[2] + '</span></button>'; }).join('') + '</div>';
    /* insentif */
    h += '<div><div class="flex items-center gap-8" style="margin-bottom:8px"><div class="f-head t-15 grow">🎯 Insentif minggu ini</div><button class="btn btn-ghost t-115"' + aksi('ke', 'pinsentif') + '>Semua →</button></div><div class="card elev-sm gap-8">' + ins.slice(0, 2).map(function (x) { var pct = x.pct != null ? x.pct : Math.min(100, Math.round(x.kini / x.target * 100)); return '<div class="stack gap-3"><div class="flex items-center gap-8"><span class="grow t-125 bold">' + esc(x.judul) + '</span><b class="t-11" style="color:#0a8f5c">+ ' + rp(x.hadiah) + '</b></div><div class="progress"><i style="width:' + pct + '%"></i></div><div class="t-10 o-6">' + (typeof x.kini === 'number' && x.target > 10 ? x.kini + ' dari ' + x.target : pct + '%') + ' · ' + esc(x.ket) + '</div></div>'; }).join('') + '</div></div>';
    if (X.kartuAkademi) h += X.kartuAkademi();
    h += '<div class="card card-clay gap-7"><div class="f-head t-15">' + esc(KM.kartuJudul || 'Jadwal Anda, keputusan Anda') + '</div><div class="t-125 lh-15">' + esc(KM.kartuTeks || 'Ops tidak pernah bisa memindahkan job yang sudah Anda terima.') + '</div></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'preg') + '>' + esc(KM.tombolDaftar || 'Formulir pendaftaran mitra baru') + '</button><div class="spacer-26"></div></div>';
    return h + '</div>';
  };
  A.orderTerima = function (id) { var o = (K.orderMasuk || []).filter(function (x) { return x.id === id; })[0]; if (!o) return; if (sisaMenit(o) <= 0) { o.status = 'kedaluwarsa'; X.sekilas('Order sudah kedaluwarsa.', 'err'); return; } o.status = 'diterima'; o.no = 'EXO-' + (4480 + K.jobDiterima.length); K.jobDiterima.push(o); K.orderTolakId = null; X.sekilas('Order diterima · ' + o.service + ' masuk jadwal ' + (o.tgl === tglOffset(1) ? 'besok' : o.tgl) + ' ' + o.jam + '.'); };
  A.orderTolakBuka = function (id) { K.orderTolakId = K.orderTolakId === id ? null : id; };
  A.orderTolak = function (arg) { var p = arg.split('|'), o = (K.orderMasuk || []).filter(function (x) { return x.id === p[0]; })[0]; if (!o) return; o.status = 'ditolak'; o.alasan = p[1]; K.jobDitolak.push(o); K.orderTolakId = null; X.sekilas('Order ditolak (' + p[1] + '). Tidak memengaruhi skor bila alasannya jelas.'); };
  A.absenMasuk = function () { K.absen.masuk = jamKini(); K.absen.keluar = ''; X.sekilas('Absen masuk ' + K.absen.masuk + ' · lokasi terekam.'); };
  A.absenKeluar = function () { K.absen.keluar = jamKini(); K.absen.riwayat.unshift({ tgl:tglOffset(0), masuk:K.absen.masuk, keluar:K.absen.keluar }); X.sekilas('Absen keluar ' + K.absen.keluar + '. Terima kasih!'); };

  /* ---- Jadwal (kalender 7 hari) ---- */
  X.LAYAR.pjadwal = function () {
    var pilih = tglOffset(K.jadwalHari), daftar = jobHari(pilih);
    var h = '<div class="screen">' + X.kepala('Jadwal', 'Job yang Anda terima · 7 hari ke depan', 'pjobs') + '<div class="stack gap-12 pad-x18">';
    h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">' + [0, 1, 2, 3, 4, 5, 6].map(function (n) { var t = tglOffset(n), d = new Date(t), on = n === K.jadwalHari, jml = jobHari(t).length; return '<button style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;border-radius:14px;background:' + (on ? 'var(--color-accent)' : 'var(--color-surface)') + ';color:' + (on ? '#fff' : 'inherit') + '"' + aksi('jadwalHari', n) + '><span class="t-10" style="opacity:.7">' + HARI[d.getDay()] + '</span><b class="t-135">' + d.getDate() + '</b><span style="width:6px;height:6px;border-radius:999px;background:' + (jml ? (on ? '#fff' : 'var(--color-accent)') : 'transparent') + '"></span></button>'; }).join('') + '</div>';
    h += '<div class="t-115 o-6">' + (K.jadwalHari === 0 ? 'Hari ini' : K.jadwalHari === 1 ? 'Besok' : pilih) + ' · ' + daftar.length + ' job</div>';
    if (!daftar.length) h += '<div class="card elev-sm" style="align-items:center;text-align:center;gap:6px;padding:26px 16px"><div style="font-size:36px">📅</div><div class="t-135 bold">Belum ada job</div><div class="t-115 o-6">Terima order masuk di Beranda untuk mengisi hari ini.</div></div>';
    daftar.forEach(function (j) { h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><b class="f-head t-16">' + esc(j.jam) + '</b><span class="tag ' + (j.status === 'berikutnya' ? 'tag-accent' : 'tag-neutral') + '" style="font-size:10px">' + esc(j.status) + '</span><span class="t-11 o-6" style="margin-inline-start:auto">' + esc(j.no) + '</span></div><div class="t-135 bold">' + esc(j.judul) + '</div><div class="t-115 o-7">' + esc(j.sub) + '</div>' + (j.status === 'berikutnya' ? '<button class="btn btn-primary" style="height:34px;align-self:flex-start"' + aksi('mulaiRute') + '>Mulai rute</button>' : '') + '</div>'; });
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.jadwalHari = function (n) { K.jadwalHari = Number(n); };

  /* ---- Insentif ---- */
  X.LAYAR.pinsentif = function () {
    var ins = insentif(), total = ins.reduce(function (n, x) { return n + x.hadiah; }, 0);
    var h = '<div class="screen">' + X.kepala('Insentif & target', 'Potensi bonus minggu ini ' + rp(total), 'pjobs') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="card card-leaf t-115 lh-15">Bonus dihitung Senin pagi dari job selesai, rating, dan ketepatan waktu 7 hari sebelumnya, lalu cair bersama payout. Pembatalan oleh mitra menggugurkan bonus minggu itu.</div>';
    ins.forEach(function (x) { var pct = x.pct != null ? x.pct : Math.min(100, Math.round(x.kini / x.target * 100)), tercapai = pct >= 100; h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><span style="font-size:20px">' + (tercapai ? '🏆' : '🎯') + '</span><div class="grow"><b class="t-125">' + esc(x.judul) + '</b><div class="t-11 o-6">' + esc(x.ket) + '</div></div><b class="t-125" style="color:#0a8f5c">+ ' + rp(x.hadiah) + '</b></div><div class="progress"><i style="width:' + pct + '%;background:' + (tercapai ? '#0a8f5c' : 'var(--color-accent)') + '"></i></div><div class="t-10 o-6">' + (tercapai ? 'Tercapai ✓' : (typeof x.kini === 'number' && x.target > 10 ? (x.target - x.kini) + ' lagi' : pct + '%')) + '</div></div>'; });
    h += '<div class="card elev-sm gap-4"><div class="f-head t-14">Riwayat bonus</div>' + [['1–7 Sep', 'Target 12 job', 150000], ['1–7 Sep', 'Rating ≥ 4,8', 50000], ['25–31 Agu', 'Target 12 job', 150000]].map(function (r) { return '<div class="kv t-115"><span>' + r[0] + ' · ' + r[1] + '</span><b>+ ' + rp(r[2]) + '</b></div>'; }).join('') + '</div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };

  /* ---- Absen ---- */
  X.LAYAR.pabsen = function () {
    var ab = K.absen, riw = [{ tgl:tglOffset(-1), masuk:'07:52', keluar:'17:10' }, { tgl:tglOffset(-2), masuk:'08:03', keluar:'16:40' }, { tgl:tglOffset(-3), masuk:'07:58', keluar:'18:05' }].concat(ab.riwayat);
    var h = '<div class="screen">' + X.kepala('Absen & kehadiran', 'Jam dan lokasi terekam otomatis', 'pjobs') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="card elev-md gap-8" style="align-items:center;text-align:center"><div class="f-head t-34" style="line-height:1">' + jamKini() + '</div><div class="t-115 o-6">' + esc(tglOffset(0)) + ' · Kemang, Jakarta Selatan</div>' + (!ab.masuk ? '<button class="btn btn-primary" style="height:40px;min-width:180px"' + aksi('absenMasuk') + '>Absen masuk</button>' : !ab.keluar ? '<div class="t-125">Masuk <b>' + esc(ab.masuk) + '</b> · sedang bertugas</div><button class="btn btn-secondary" style="height:40px;min-width:180px"' + aksi('absenKeluar') + '>Absen keluar</button>' : '<div class="t-125">Masuk <b>' + esc(ab.masuk) + '</b> · keluar <b>' + esc(ab.keluar) + '</b></div><span class="tag tag-accent-2">Shift selesai</span>') + '</div>';
    h += '<div class="card elev-sm gap-4"><div class="f-head t-14">Riwayat 7 hari</div>' + riw.slice(0, 7).map(function (r) { return '<div class="kv t-115"><span>' + esc(r.tgl) + '</span><span>' + esc(r.masuk) + ' → ' + esc(r.keluar || '—') + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card card-leaf t-115 lh-15">Kehadiran dan ketepatan waktu tiba menjadi 25% skor performa. Terlambat > 15 menit tanpa kabar tercatat sebagai pelanggaran ringan.</div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };

  /* ---- Riwayat job ---- */
  X.LAYAR.priwayat = function () {
    var riw = [['EXO-4466', 'Deep cleaning · 5 jam', 'Senopati · Sab 6 Sep', 700000, '★ 5,0'], ['EXO-4463', 'Cleaning per jam · 3 jam', 'Kemang · Jum 5 Sep', 234000, '★ 5,0'], ['EXO-4458', 'Cuci AC · 3 unit', 'Cipete · Kam 4 Sep', 255000, '★ 4,0'], ['EXO-4451', 'Cleaning per jam · 4 jam', 'Kemang · Rab 3 Sep', 312000, '★ 5,0']];
    var h = '<div class="screen">' + X.kepala('Riwayat job', riw.length + ' job selesai · 30 hari', 'pjobs') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="flex gap-6">' + ['Semua', 'Selesai', 'Dibatalkan', 'Ditolak (' + K.jobDitolak.length + ')'].map(function (s, i) { return '<button class="' + kelas('pill pill-sm', i === 0) + '">' + s + '</button>'; }).join('') + '</div>';
    riw.forEach(function (r) { h += '<div class="card elev-sm gap-4"><div class="flex items-center gap-8"><span class="t-11 o-6">' + r[0] + '</span><span class="tag tag-accent-2" style="font-size:10px;margin-inline-start:auto">Selesai</span></div><div class="t-135 bold">' + esc(r[1]) + '</div><div class="flex items-center gap-8"><span class="t-115 o-7 grow">' + esc(r[2]) + '</span><b class="t-125">' + rp(r[3]) + '</b><span class="t-11 o-6">' + r[4] + '</span></div></div>'; });
    K.jobDitolak.forEach(function (o) { h += '<div class="card elev-sm gap-4" style="opacity:.7"><div class="flex items-center gap-8"><span class="t-11 o-6">order masuk</span><span class="tag tag-neutral" style="font-size:10px;margin-inline-start:auto">Ditolak · ' + esc(o.alasan) + '</span></div><div class="t-135 bold">' + esc(o.service) + '</div><div class="t-115 o-7">' + esc(o.meta) + '</div></div>'; });
    return h + '<div class="spacer-26"></div></div></div>';
  };
})(ExoApp);
