/* ==========================================================================
   exo-admin-lms.js — Pembelajaran (LMS) di konsol admin + "Belajar saya"
   --------------------------------------------------------------------------
   Tab kelola: ringkasan · kursus (editor modul/materi/kuis) · jalur · peserta.
   Menerbitkan / menarik kursus lewat Persetujuan (tingkat sedang); draf bisa
   disimpan langsung (tercatat di audit). "Belajar saya" adalah antarmuka
   peserta untuk staf kantor dengan mesin EXO_LMS yang sama dengan aplikasi
   mitra.
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, pill = A.pill, kpi = A.kpi, tabel = A.tabel, meter = A.meter;
  var L = function () { return window.EXO_LMS; };
  S.lmsTab = S.lmsTab || 'ringkasan'; S.lmsEdit = S.lmsEdit || null; S.belajar = S.belajar || { kursus:null, modul:null, materi:null, jawaban:{}, hasil:null };
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function lapor(h, judul) { A.sekilas(h.langsung ? judul + ' diterapkan.' : judul + ' masuk antrean Persetujuan · butuh ' + h.usulan.butuh + ' penyetuju.'); }
  if (window.EXO_PERSETUJUAN) {
    EXO_PERSETUJUAN.TINGKAT.lms = 'sedang';
    EXO_PERSETUJUAN.daftarkanPenerap('lms', function (u, oleh) { var m = u.muatan; if (m.aksi === 'tarik') return L().tarik(m.id, oleh); return L().terbitkan(m.id, oleh); });
  }
  function levelChip(l) { return chip(l === 'lanjutan' ? 'accent' : l === 'menengah' ? 'green' : 'flat', L().namaLevel(l)); }

  /* ================================================================ KELOLA */
  VIEW.lms = function () {
    if (!window.EXO_LMS) return '<div class="card elev-sm">Modul LMS (js/exo-lms.js) belum dimuat.</div>';
    L().semai();
    var h = '<div class="flex gap-8 wrap">';
    [['ringkasan','Ringkasan'],['kursus','Kursus & materi'],['jalur','Jalur pembelajaran'],['peserta','Peserta & progres'],['sertifikasi','Sertifikasi & kepatuhan']].forEach(function (t) { h += pill(S.lmsTab === t[0], t[1], 'lmsTab', t[0], true); });
    h += '</div>';
    return h + ({ ringkasan:tabRingkasan, kursus:tabKursus, jalur:tabJalur, peserta:tabPeserta, sertifikasi:function () { return A.tabSertifikasi ? A.tabSertifikasi() : '<div class="card elev-sm">Modul sertifikasi belum dimuat.</div>'; } }[S.lmsTab] || tabRingkasan)();
  };
  AKSI.lmsTab = function (v) { S.lmsTab = v; };

  function tabRingkasan() {
    var st = L().statistik();
    var h = kpi([{label:'Kursus terbit', value:st.terbit + '/' + st.kursus, note:'draf ' + (st.kursus - st.terbit)},{label:'Pendaftaran', value:String(st.peserta), note:st.berjalan + ' berjalan · ' + st.selesai + ' selesai'},{label:'Tingkat penyelesaian', value:st.tingkatSelesai + '%', note:'ala Coursera: target > 60%', good:st.tingkatSelesai >= 60},{label:'Nilai rata-rata', value:st.rerata == null ? '—' : st.rerata + '%', note:'rata-rata kuis peserta yang selesai'}], true, 4);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Katalog & keterlibatan</div><div class="t-115 o-6">Struktur ala Coursera: kursus → modul → materi (video/bacaan) + kuis per modul · level dasar/menengah/lanjutan dengan prasyarat · jalur per fungsi · sertifikat otomatis</div></div></div>' +
      tabel(['Kode','Kursus','Level','Modul · soal','Wajib','Peserta','Selesai','Nilai','Status'], st.perKursus.map(function (k) { return ['<span class="id">' + esc(k.kode) + '</span>', '<b>' + esc(k.judul) + '</b>', levelChip(k.level), k.modul + ' · ' + k.soal, k.wajib ? chip('accent', 'wajib') : '<span class="o-5">—</span>', String(k.peserta), String(k.selesai), k.rerata == null ? '—' : k.rerata + '%', chip(k.status === 'terbit' ? 'green' : 'flat', k.status)]; })) + '</div>';
    h += '<div class="grid g2" style="gap:16px"><div class="card elev-sm gap-8"><div class="card-title">Yang diambil dari Coursera</div>' + ['Kursus dipecah menjadi modul mingguan dengan materi singkat (video 5–10 menit + bacaan) lalu kuis bernilai; peserta tidak bisa lompat modul.', 'Kuis berambang lulus (80%) dengan batas percobaan dan penjelasan per soal — belajar dari kesalahan, bukan sekadar skor.', 'Level dan prasyarat membentuk jenjang; jalur pembelajaran (Specialization) per fungsi kerja diakhiri sertifikat.', 'Progres dan nilai akhir tampil di profil peserta; kursus wajib menahan job sampai tuntas.', 'Admin melihat tingkat penyelesaian dan nilai per kursus untuk memperbaiki materi yang sulit.'].map(function (t) { return '<div class="flex gap-9 t-125 lh-15"><i class="check-sm">✓</i><span class="o-85">' + t + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-8"><div class="card-title">Menuju produksi</div>' + ['Video dihosting di YouTube (unlisted) atau Vimeo perusahaan; tautan diisi di materi — CSP sudah mengizinkan kedua domain.', 'Bank soal per kompetensi dengan pengacakan urutan soal & pilihan per percobaan.', 'Kelas tatap muka/praktik (uji keterampilan) sebagai materi jenis “sesi” yang ditandai supervisor.', 'Pengingat otomatis: kursus wajib H-7, sertifikat kedaluwarsa 60 hari, ke aplikasi mitra & WhatsApp.', 'Pindahkan tabel kursus/pendaftaran/sertifikat ke server agar progres mitra sinkron lintas perangkat.'].map(function (t) { return '<div class="flex gap-9 t-125 lh-15"><i class="check-sm">→</i><span class="o-85">' + t + '</span></div>'; }).join('') + '</div></div>';
    return h;
  }

  /* ---- kursus & editor ---- */
  function tabKursus() {
    var semua = L().semuaKursus().sort(function (a, b) { return a.kode.localeCompare(b.kode); });
    var h = '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Kursus</div><div class="t-115 o-6">Sunting draf kapan pun; “Terbitkan” dan “Tarik” lewat Persetujuan supaya materi yang tayang ke mitra selalu diperiksa orang kedua.</div></div><button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('lmsBaru') + '>+ Kursus baru</button></div>' +
      tabel(['Kode','Judul','Level','Target','Jam','Modul','Rev','Status',''], semua.map(function (k) { return ['<span class="id">' + esc(k.kode) + '</span>', '<b>' + esc(k.judul) + '</b>' + (k.wajib ? ' ' + (k.wajibLayanan ? chip('flat', 'wajib · ' + k.wajibLayanan) : chip('accent', 'wajib')) : ''), levelChip(k.level), '<span class="t-12">' + esc((k.target || []).map(L().namaFungsi).join(', ')) + '</span>', String(k.jam || '—'), String((k.modul || []).length), 'Rev.' + String(k.rev || 0).padStart(2, '0'), chip(k.status === 'terbit' ? 'green' : k.status === 'terbit-draf' ? 'accent' : 'flat', k.status === 'terbit-draf' ? 'terbit · ada draf' : k.status), '<button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('lmsSunting', k.id) + '>Sunting</button>']; })) + '</div>';
    if (S.lmsEdit) h += editor();
    return h;
  }
  function inp(nilai, arg, ph, tipe) { return '<input class="input" type="' + (tipe || 'text') + '" value="' + esc(nilai == null ? '' : nilai) + '" placeholder="' + esc(ph || '') + '" data-ubah="lmsUbah" data-arg="' + esc(arg) + '">'; }
  function editor() {
    var e = S.lmsEdit, galat = L().periksa(e), asli = e.id ? L().kursus(e.id) : null;
    var h = '<div class="card elev-sm gap-14" id="lms-editor"><div class="flex items-center gap-10"><div class="grow"><div class="card-title">' + (e.id ? 'Sunting kursus · ' + esc(e.kode) : 'Kursus baru') + '</div><div class="t-115 o-6">' + (asli ? 'Status ' + asli.status + ' · Rev.' + String(asli.rev || 0).padStart(2, '0') : 'Belum disimpan') + ' · simpan draf lalu ajukan terbit</div></div>' + chip(e.kotor ? 'accent' : 'flat', e.kotor ? 'Belum disimpan' : 'Tersimpan') + '</div>';
    h += '<div class="grid g2" style="gap:10px"><div class="field"><label>Kode</label>' + inp(e.kode, 'kode', 'LMS-001') + '</div><div class="field"><label>Judul</label>' + inp(e.judul, 'judul', 'Judul kursus') + '</div>' +
      '<div class="field"><label>Level</label><select class="input" style="height:40px" data-ubah="lmsUbah" data-arg="level">' + L().LEVEL.map(function (l) { return '<option value="' + l[0] + '"' + (e.level === l[0] ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select></div><div class="field"><label>Perkiraan jam belajar</label>' + inp(e.jam, 'jam', '2', 'number') + '</div>' +
      '<div class="field"><label>Masa berlaku sertifikat (bulan)</label>' + inp(e.masaBerlakuBulan, 'masaBerlakuBulan', '24', 'number') + '</div><div class="field"><label>Kompetensi (pisahkan koma)</label>' + inp((e.kompetensi || []).join(', '), 'kompetensi', 'APD, Ergonomi') + '</div></div>';
    h += '<div class="field"><label>Deskripsi</label><textarea class="input" style="min-height:70px" data-ubah="lmsUbah" data-arg="deskripsi">' + esc(e.deskripsi || '') + '</textarea></div>';
    h += '<div class="grid g2" style="gap:10px"><div><div class="t-115 up o-6" style="margin-bottom:6px">Target fungsi</div><div class="flex wrap gap-6">' + L().FUNGSI.map(function (f) { return pill((e.target || []).indexOf(f[0]) >= 0, f[1], 'lmsTarget', f[0], true); }).join('') + '</div></div>' +
      '<div><div class="t-115 up o-6" style="margin-bottom:6px">Prasyarat (kode kursus)</div><div class="flex wrap gap-6">' + L().semuaKursus().filter(function (k) { return k.kode !== e.kode; }).map(function (k) { return pill((e.prasyarat || []).indexOf(k.kode) >= 0, k.kode, 'lmsPrasyarat', k.kode, true); }).join('') + '</div><div style="margin-top:8px">' + pill(!!e.wajib, e.wajib ? 'Wajib untuk target ✓' : 'Opsional', 'lmsWajib', '', true) + '</div></div></div>';
    (e.modul || []).forEach(function (m, mi) {
      h += '<div class="card" style="background:var(--color-surface);gap:10px"><div class="flex items-center gap-8"><span class="f-head t-15" style="width:26px">' + (mi + 1) + '</span><div class="grow">' + inp(m.judul, 'modul.' + mi + '.judul', 'Judul modul') + '</div>' +
        '<button class="btn btn-secondary" style="height:30px;padding:0 9px"' + (mi ? aksi('lmsModulGeser', mi + ':-1') : ' disabled') + '>↑</button><button class="btn btn-secondary" style="height:30px;padding:0 9px"' + (mi < e.modul.length - 1 ? aksi('lmsModulGeser', mi + ':1') : ' disabled') + '>↓</button><button class="btn btn-secondary" style="height:30px;padding:0 9px;color:#9b1c1c"' + aksi('lmsModulHapus', mi) + '>✕</button></div>';
      h += '<div class="t-11 up o-6">Materi</div>';
      (m.materi || []).forEach(function (t, ti) {
        var p = 'modul.' + mi + '.materi.' + ti;
        h += '<div class="flex gap-6 items-start" style="background:#fff;border-radius:14px;padding:8px 10px"><select class="input" style="width:110px;height:38px" data-ubah="lmsUbah" data-arg="' + p + '.jenis">' + ['bacaan','video','tautan'].map(function (j) { return '<option' + (t.jenis === j ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select><div class="grow stack gap-6">' + inp(t.judul, p + '.judul', 'Judul materi') + (t.jenis === 'bacaan' ? '<textarea class="input" style="min-height:80px;font-size:12.5px" placeholder="Isi bacaan — pisahkan paragraf dengan baris kosong" data-ubah="lmsUbah" data-arg="' + p + '.isi">' + esc(t.isi || '') + '</textarea>' : inp(t.url, p + '.url', t.jenis === 'video' ? 'https://www.youtube.com/embed/… atau https://player.vimeo.com/video/…' : 'https://…')) + '</div><input class="input" style="width:70px;height:38px" type="number" value="' + esc(t.menit || 5) + '" title="menit" data-ubah="lmsUbah" data-arg="' + p + '.menit"><button class="btn btn-secondary" style="height:34px;padding:0 9px;color:#9b1c1c"' + aksi('lmsMateriHapus', mi + ':' + ti) + '>✕</button></div>';
      });
      h += '<div class="flex gap-8"><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('lmsMateriTambah', mi) + '>+ Materi</button>' + (m.kuis ? '' : '<button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('lmsKuisTambah', mi) + '>+ Kuis modul</button>') + '</div>';
      if (m.kuis) {
        var kq = 'modul.' + mi + '.kuis';
        h += '<div style="background:#fff;border-radius:14px;padding:10px 12px" class="stack gap-8"><div class="flex items-center gap-8"><div class="grow">' + inp(m.kuis.judul, kq + '.judul', 'Judul kuis') + '</div><label class="t-11 o-6">Lulus ≥</label><input class="input" style="width:64px;height:36px" type="number" value="' + esc(m.kuis.lulus || 80) + '" data-ubah="lmsUbah" data-arg="' + kq + '.lulus"><label class="t-11 o-6">% · maks</label><input class="input" style="width:56px;height:36px" type="number" value="' + esc(m.kuis.maksPercobaan || 3) + '" data-ubah="lmsUbah" data-arg="' + kq + '.maksPercobaan"><label class="t-11 o-6">percobaan</label><button class="btn btn-secondary" style="height:30px;padding:0 9px;color:#9b1c1c"' + aksi('lmsKuisHapus', mi) + '>Hapus kuis</button></div>';
        (m.kuis.soal || []).forEach(function (s, si) {
          var sp = kq + '.soal.' + si;
          h += '<div class="stack gap-6" style="border-top:1px solid var(--color-divider);padding-top:8px"><div class="flex gap-6 items-center"><span class="t-12 bold" style="width:22px">' + (si + 1) + '.</span><div class="grow">' + inp(s.tanya, sp + '.tanya', 'Pertanyaan') + '</div><button class="btn btn-secondary" style="height:30px;padding:0 9px;color:#9b1c1c"' + aksi('lmsSoalHapus', mi + ':' + si) + '>✕</button></div>';
          (s.pilihan || []).forEach(function (pl, pi) { h += '<div class="flex gap-6 items-center" style="padding-inline-start:28px"><button class="pill pill-sm' + (s.jawaban === pi ? ' on' : '') + '" style="min-width:34px" title="Tandai sebagai jawaban benar"' + aksi('lmsJawaban', mi + ':' + si + ':' + pi) + '>' + (s.jawaban === pi ? '✓' : String.fromCharCode(65 + pi)) + '</button><div class="grow">' + inp(pl, sp + '.pilihan.' + pi, 'Pilihan ' + String.fromCharCode(65 + pi)) + '</div>' + ((s.pilihan || []).length > 2 ? '<button class="btn btn-secondary" style="height:30px;padding:0 9px"' + aksi('lmsPilihanHapus', mi + ':' + si + ':' + pi) + '>✕</button>' : '') + '</div>'; });
          h += '<div class="flex gap-6 items-center" style="padding-inline-start:28px">' + ((s.pilihan || []).length < 5 ? '<button class="btn btn-secondary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('lmsPilihanTambah', mi + ':' + si) + '>+ Pilihan</button>' : '') + '<div class="grow">' + inp(s.penjelasan, sp + '.penjelasan', 'Penjelasan setelah dijawab (opsional)') + '</div></div></div>';
        });
        h += '<button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px;align-self:flex-start"' + aksi('lmsSoalTambah', mi) + '>+ Soal pilihan ganda</button></div>';
      }
      h += '</div>';
    });
    h += '<div class="flex gap-8"><button class="btn btn-secondary" style="height:34px"' + aksi('lmsModulTambah') + '>+ Modul</button></div>';
    if (galat.length) h += '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(galat.slice(0, 6).join(' ')) + (galat.length > 6 ? ' … +' + (galat.length - 6) : '') + '</div>';
    h += '<div class="flex gap-8 items-center wrap"><button class="btn btn-primary" style="height:40px"' + (e.kotor ? aksi('lmsSimpanDraf') : ' disabled') + '>Simpan draf</button>' +
      (e.id && !galat.length && !e.kotor ? '<button class="btn btn-primary" style="height:40px"' + aksi('lmsTerbitkan') + '>' + (asli && asli.status === 'terbit' ? 'Terbitkan revisi' : 'Terbitkan') + ' · PIN → Persetujuan</button>' : '') +
      (asli && asli.status !== 'draf' ? '<button class="btn btn-secondary" style="height:40px"' + aksi('lmsTarik') + '>Tarik dari aplikasi · PIN</button>' : '') +
      '<button class="btn btn-secondary" style="height:40px;margin-inline-start:auto"' + aksi('lmsTutup') + '>Tutup</button></div></div>';
    return h;
  }
  function baru() { return { kode:'', judul:'', level:'dasar', target:['semua'], jam:2, wajib:false, kompetensi:[], prasyarat:[], deskripsi:'', masaBerlakuBulan:24, modul:[{ id:L().uid('md'), judul:'', materi:[{ id:L().uid('mt'), jenis:'bacaan', judul:'', isi:'', menit:5 }], kuis:null }], kotor:true }; }
  function set(obj, jalur, v) { var p = jalur.split('.'), o = obj; for (var i = 0; i < p.length - 1; i++) { o = o[isNaN(p[i]) ? p[i] : +p[i]]; if (o == null) return; } o[isNaN(p[p.length - 1]) ? p[p.length - 1] : +p[p.length - 1]] = v; }
  AKSI.lmsBaru = function () { S.lmsEdit = baru(); gulir(); };
  AKSI.lmsSunting = function (id) { var k = L().kursus(id); if (!k) return; S.lmsEdit = Object.assign(JSON.parse(JSON.stringify(k)), { kotor:false }); gulir(); };
  AKSI.lmsTutup = function () { S.lmsEdit = null; };
  function gulir() { setTimeout(function () { var el = document.getElementById('lms-editor'); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 60); }
  AKSI.lmsUbah = function (arg, v) { var e = S.lmsEdit; if (!e) return; e.kotor = true; if (arg === 'kompetensi') { e.kompetensi = String(v).split(',').map(function (x) { return x.trim(); }).filter(Boolean); return; } if (arg === 'kode') v = String(v).toUpperCase().trim(); if (/\.(jam|menit|lulus|maksPercobaan|masaBerlakuBulan)$|^(jam|masaBerlakuBulan)$/.test(arg)) v = Number(v) || 0; set(e, arg, v); };
  AKSI.lmsTarget = function (f) { var e = S.lmsEdit; if (!e) return; e.target = e.target || []; var i = e.target.indexOf(f); if (i >= 0) e.target.splice(i, 1); else e.target.push(f); e.kotor = true; };
  AKSI.lmsPrasyarat = function (kd) { var e = S.lmsEdit; if (!e) return; e.prasyarat = e.prasyarat || []; var i = e.prasyarat.indexOf(kd); if (i >= 0) e.prasyarat.splice(i, 1); else e.prasyarat.push(kd); e.kotor = true; };
  AKSI.lmsWajib = function () { var e = S.lmsEdit; if (!e) return; e.wajib = !e.wajib; e.kotor = true; };
  AKSI.lmsModulTambah = function () { var e = S.lmsEdit; e.modul.push({ id:L().uid('md'), judul:'', materi:[{ id:L().uid('mt'), jenis:'bacaan', judul:'', isi:'', menit:5 }], kuis:null }); e.kotor = true; };
  AKSI.lmsModulHapus = function (i) { var e = S.lmsEdit; e.modul.splice(+i, 1); e.kotor = true; };
  AKSI.lmsModulGeser = function (v) { var p = v.split(':'), e = S.lmsEdit, i = +p[0], j = i + (+p[1]); if (j < 0 || j >= e.modul.length) return; var t = e.modul[i]; e.modul[i] = e.modul[j]; e.modul[j] = t; e.kotor = true; };
  AKSI.lmsMateriTambah = function (mi) { var e = S.lmsEdit; e.modul[+mi].materi.push({ id:L().uid('mt'), jenis:'bacaan', judul:'', isi:'', menit:5 }); e.kotor = true; };
  AKSI.lmsMateriHapus = function (v) { var p = v.split(':'), e = S.lmsEdit; e.modul[+p[0]].materi.splice(+p[1], 1); e.kotor = true; };
  AKSI.lmsKuisTambah = function (mi) { var e = S.lmsEdit, m = e.modul[+mi]; m.kuis = { id:L().uid('kz'), judul:'Kuis: ' + (m.judul || 'modul ' + (+mi + 1)), lulus:80, maksPercobaan:3, soal:[{ id:L().uid('so'), tanya:'', pilihan:['', '', ''], jawaban:0, penjelasan:'' }] }; e.kotor = true; };
  AKSI.lmsKuisHapus = function (mi) { var e = S.lmsEdit; e.modul[+mi].kuis = null; e.kotor = true; };
  AKSI.lmsSoalTambah = function (mi) { var e = S.lmsEdit; e.modul[+mi].kuis.soal.push({ id:L().uid('so'), tanya:'', pilihan:['', '', ''], jawaban:0, penjelasan:'' }); e.kotor = true; };
  AKSI.lmsSoalHapus = function (v) { var p = v.split(':'), e = S.lmsEdit; e.modul[+p[0]].kuis.soal.splice(+p[1], 1); e.kotor = true; };
  AKSI.lmsPilihanTambah = function (v) { var p = v.split(':'), e = S.lmsEdit; e.modul[+p[0]].kuis.soal[+p[1]].pilihan.push(''); e.kotor = true; };
  AKSI.lmsPilihanHapus = function (v) { var p = v.split(':'), e = S.lmsEdit, s = e.modul[+p[0]].kuis.soal[+p[1]]; s.pilihan.splice(+p[2], 1); if (s.jawaban >= s.pilihan.length) s.jawaban = 0; e.kotor = true; };
  AKSI.lmsJawaban = function (v) { var p = v.split(':'), e = S.lmsEdit; e.modul[+p[0]].kuis.soal[+p[1]].jawaban = +p[2]; e.kotor = true; };
  AKSI.lmsSimpanDraf = function () {
    var e = S.lmsEdit; if (!e) return;
    var isi = JSON.parse(JSON.stringify(e)); delete isi.kotor;
    var r = L().simpan(isi); S.lmsEdit = Object.assign(JSON.parse(JSON.stringify(r)), { kotor:false });
    if (window.EXO_PERSETUJUAN) EXO_PERSETUJUAN.audit(siapa(), 'Menyimpan draf kursus ' + r.kode, r.id, r.judul);
    A.sekilas('Draf ' + r.kode + ' tersimpan (belum tayang ke mitra).');
  };
  AKSI.lmsTerbitkan = function () {
    var e = S.lmsEdit; if (!e || !e.id) return; var galat = L().periksa(e); if (galat.length) { A.sekilas(galat[0], 'err'); return; }
    var k = L().kursus(e.id), judul = 'Terbitkan kursus ' + k.kode + ' Rev.' + String((k.rev || 0) + 1).padStart(2, '0') + ' · ' + k.judul;
    denganPin('Ajukan ' + judul + '. Tayang ke aplikasi mitra setelah disetujui.', function (oleh) { var h = EXO_PERSETUJUAN.ajukan('lms', judul, e.deskripsi, { status:k.status, rev:k.rev }, { status:'terbit', rev:(k.rev || 0) + 1, modul:(k.modul || []).length }, { id:k.id, aksi:'terbit' }, oleh); lapor(h, judul); });
  };
  AKSI.lmsTarik = function () { var e = S.lmsEdit; if (!e || !e.id) return; var k = L().kursus(e.id), judul = 'Tarik kursus ' + k.kode + ' dari aplikasi'; denganPin('Ajukan ' + judul, function (oleh) { var h = EXO_PERSETUJUAN.ajukan('lms', judul, '', { status:k.status }, { status:'draf' }, { id:k.id, aksi:'tarik' }, oleh); lapor(h, judul); }); };

  /* ---- jalur ---- */
  function tabJalur() {
    var jl = L().jalur(), semua = L().semuaKursus();
    var h = '<div class="grid g2" style="gap:16px">';
    jl.forEach(function (j) { var kk = (j.kursusIds || []).map(function (id) { return semua.filter(function (k) { return k.id === id; })[0]; }).filter(Boolean); h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span class="chip chip-flat" style="font-size:11px">' + esc(L().namaFungsi(j.target)) + '</span><div class="grow f-head t-16">' + esc(j.judul) + '</div><span class="t-115 o-6">' + kk.length + ' kursus · ' + kk.reduce(function (n, k) { return n + (k.jam || 0); }, 0) + ' jam</span></div><div class="t-125 o-75 lh-15">' + esc(j.deskripsi || '') + '</div><div class="stack gap-4">' + kk.map(function (k, i) { return '<div class="flex items-center gap-8 t-125"><span class="f-head" style="width:22px">' + (i + 1) + '</span><span class="id" style="font-size:11.5px">' + esc(k.kode) + '</span><span class="grow">' + esc(k.judul) + '</span>' + levelChip(k.level) + '</div>'; }).join('') + '</div></div>'; });
    h += '</div><div class="t-115 o-6 lh-15">Jalur adalah urutan kursus per fungsi kerja (ala Coursera Specialization). Peserta melihat jalurnya di beranda Akademi; badge “Bersertifikat” tampil di profil pelanggan setelah semua kursus jalur selesai. Penyuntingan jalur mengikuti kursus (kode) — tambah kursus baru ke jalur lewat editor kursus dengan target fungsi yang sama.</div>';
    return h;
  }

  /* ---- peserta ---- */
  function tabPeserta() {
    var ps = L().pesertaSemua(), d = window.EXO_DB, mitra = d ? d.where('users', function (u) { return u.role === 'worker'; }) : [];
    var belum = mitra.map(function (u) { return { nama:u.nama, wajib:L().wajibBelum(u).map(function (k) { return k.kode; }) }; }).filter(function (x) { return x.wajib.length; });
    var h = kpi([{label:'Peserta aktif', value:String(ps.length), note:'punya ≥ 1 pendaftaran'},{label:'Mitra dengan kursus wajib belum tuntas', value:String(belum.length) + '/' + mitra.length, note:'di produksi: tidak ditawarkan ke pelanggan', good:!belum.length},{label:'Sertifikat LMS', value:String(d ? d.where('sertifikat', { sumber:'lms' }).length : 0), note:'terbit otomatis saat kursus tuntas'},{label:'Percobaan kuis habis', value:String(d ? d.all('pendaftaran').filter(function (p) { return Object.keys(p.kuis || {}).some(function (k) { return !p.kuis[k].lulus && p.kuis[k].percobaan >= 3; }); }).length : 0), note:'perlu pembinaan supervisor'}], true, 4);
    h += '<div class="grid g121"><div class="card elev-sm table-card"><div class="card-head card-title">Progres peserta</div>' + tabel(['Peserta','Fungsi','Kursus','Progres','Nilai'], ps.length ? ps.flatMap(function (p) { return p.kursus.map(function (k, i) { return [i === 0 ? '<b>' + esc(p.nama) + '</b>' : '', i === 0 ? esc(p.fungsi) : '', '<span class="t-12"><span class="id" style="font-size:11px">' + esc(k.kode) + '</span> ' + esc(k.judul) + '</span>', '<div class="flex items-center gap-6" style="min-width:120px"><span class="t-12" style="width:36px">' + k.persen + '%</span>' + meter(k.persen, k.status === 'selesai' ? 'acc' : 'soft') + '</div>', k.nilai == null ? chip('flat', k.status) : chip('green', k.nilai + '%')]; }); }) : [['<span class="o-6">Belum ada pendaftaran. Peserta mendaftar otomatis saat membuka materi pertama di Akademi.</span>', '', '', '', '']]) + '</div>';
    h += '<div class="card elev-sm table-card"><div class="card-head card-title">Kursus wajib belum tuntas</div>' + tabel(['Mitra','Kursus wajib'], belum.length ? belum.map(function (x) { return ['<b>' + esc(x.nama) + '</b>', '<span class="t-12">' + esc(x.wajib.join(', ')) + '</span>']; }) : [['<span class="o-6">Semua mitra tuntas.</span>', '']]) + '</div></div>';
    return h;
  }

  /* ============================================================ BELAJAR SAYA */
  VIEW.belajar = function () {
    if (!window.EXO_LMS) return '<div class="card elev-sm">Modul LMS belum dimuat.</div>';
    L().semai();
    var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); if (!u) return '<div class="card elev-sm">Masuk dulu.</div>';
    var b = S.belajar, k = b.kursus ? L().katalog().filter(function (x) { return x.id === b.kursus; })[0] : null;
    if (k && b.modul && b.hasil) return hasilKuis(u, k);
    if (k && b.modul && b.kuisAktif) return kuis(u, k);
    if (k && b.materi) return materi(u, k);
    if (k) return detail(u, k);
    var semua = L().untukPeserta(u), wajib = L().wajibBelum(u), sert = L().sertifikatPeserta(u.id), jalur = L().jalurUntuk(u);
    var h = kpi([{label:'Kursus untuk Anda', value:String(semua.length), note:L().namaFungsi(L().fungsiDari(u))},{label:'Wajib belum tuntas', value:String(wajib.length), note:wajib.map(function (x) { return x.kode; }).join(', ') || 'semua tuntas', good:!wajib.length},{label:'Sertifikat', value:String(sert.length), note:'terbit otomatis'},{label:'Jalur', value:jalur ? jalur.judul : '—', note:jalur ? (jalur.kursusIds || []).length + ' kursus' : ''}], true, 4);
    h += '<div class="grid g3" style="gap:14px">';
    semua.forEach(function (x) { var p = L().progres(u.id, x.id) || { persen:0, status:'belum' }, kunci = L().terkunci(u.id, x); h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8">' + levelChip(x.level) + (x.wajib ? chip('accent', 'wajib') : '') + '<span class="t-11 o-6" style="margin-inline-start:auto">' + esc(x.kode) + ' · ' + x.jam + ' jam</span></div><div class="f-head t-16">' + esc(x.judul) + '</div><div class="t-12 o-75 lh-15">' + esc((x.deskripsi || '').slice(0, 120)) + '</div>' + meter(p.status === 'selesai' ? 100 : p.persen, p.status === 'selesai' ? 'acc' : 'soft') + '<div class="flex items-center gap-8"><span class="t-115 o-7 grow">' + (kunci ? '🔒 Selesaikan ' + esc(kunci.map(function (z) { return z.kode; }).join(', ')) : p.status === 'selesai' ? '✓ Selesai · nilai ' + p.nilai : p.status === 'berjalan' ? p.persen + '%' : 'Belum dimulai') + '</span>' + (kunci ? '' : '<button class="btn btn-primary" style="height:32px;padding:0 14px;font-size:12px"' + aksi('belajarBuka', x.id) + '>' + (p.status === 'berjalan' ? 'Lanjutkan' : p.status === 'selesai' ? 'Lihat' : 'Mulai') + '</button>') + '</div></div>'; });
    return h + '</div>';
  };
  function detail(u, k) {
    var b = S.belajar, p = L().pendaftaran(u.id, k.id), pr = L().progres(u.id, k.id);
    var h = '<div class="flex items-center gap-10"><button class="btn btn-secondary" style="height:34px"' + aksi('belajarTutup') + '>← Semua kursus</button><div class="grow"><div class="card-title">' + esc(k.judul) + '</div><div class="t-115 o-6">' + esc(k.kode) + ' · ' + esc(L().namaLevel(k.level)) + ' · ' + k.jam + ' jam · ' + (pr ? pr.persen + '% selesai' : 'belum dimulai') + '</div></div></div>';
    h += '<div class="card elev-sm t-125 lh-15">' + esc(k.deskripsi || '') + '</div><div class="grid g2" style="gap:14px">';
    (k.modul || []).forEach(function (m, i) { h += '<div class="card elev-sm gap-8"><div class="f-head t-15">' + (i + 1) + '. ' + esc(m.judul) + '</div>'; (m.materi || []).forEach(function (t) { var ok = p && p.materiSelesai.indexOf(t.id) >= 0; h += '<button class="row" style="text-align:start"' + aksi('belajarMateri', m.id + ':' + t.id) + '><span class="row-main"><b>' + (ok ? '✓ ' : '') + esc(t.judul) + '</b><span>' + (t.jenis === 'video' ? '▶ Video' : '📖 Bacaan') + ' · ' + (t.menit || 5) + ' menit</span></span></button>'; }); if (m.kuis) { var r = p && p.kuis[m.id]; h += '<button class="row" style="text-align:start"' + aksi('belajarKuis', m.id) + '><span class="row-main"><b>' + (r && r.lulus ? '✓ ' : '') + esc(m.kuis.judul || 'Kuis') + '</b><span>' + m.kuis.soal.length + ' soal · lulus ≥ ' + (m.kuis.lulus || 80) + '%' + (r ? ' · skor ' + r.skor + ' (' + r.percobaan + '/' + (m.kuis.maksPercobaan || 3) + ')' : '') + '</span></span></button>'; } h += '</div>'; });
    return h + '</div>';
  }
  function materi(u, k) {
    var b = S.belajar, m = (k.modul || []).filter(function (x) { return x.id === b.modul; })[0], t = m && (m.materi || []).filter(function (x) { return x.id === b.materi; })[0]; if (!t) { b.materi = null; return detail(u, k); }
    var h = '<div class="flex items-center gap-10"><button class="btn btn-secondary" style="height:34px"' + aksi('belajarKembali') + '>← ' + esc(k.kode) + '</button><div class="grow"><div class="card-title">' + esc(t.judul) + '</div><div class="t-115 o-6">' + esc(m.judul) + ' · ' + (t.menit || 5) + ' menit</div></div><button class="btn btn-primary" style="height:36px"' + aksi('belajarSelesaiMateri') + '>Tandai selesai & lanjut</button></div>';
    if (t.jenis === 'video') h += t.url && /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//.test(t.url) ? '<div style="aspect-ratio:16/9;max-width:820px;border-radius:20px;overflow:hidden"><iframe src="' + esc(t.url) + '" style="width:100%;height:100%;border:0" allow="fullscreen" referrerpolicy="no-referrer" title="' + esc(t.judul) + '"></iframe></div>' : '<div class="card card-clay t-125">▶ Video belum ditautkan — isi URL YouTube/Vimeo di editor kursus.</div>';
    if (t.jenis === 'video' && t.kredit) h += '<div class="t-115 o-6">Sumber video: ' + esc(t.kredit) + ' · disematkan dari YouTube</div>';
    if (t.jenis === 'tautan' && t.url) h += '<a class="btn btn-secondary" style="height:36px;align-self:flex-start" href="' + esc(t.url) + '" target="_blank" rel="noopener">Buka materi ↗</a>';
    if (t.isi) h += '<div class="card elev-sm" style="max-width:820px"><div class="t-135 lh-16">' + String(t.isi).split(/\n\n+/).map(function (par) { return '<p style="margin:0 0 12px">' + par.split('\n').map(esc).join('<br>') + '</p>'; }).join('') + '</div></div>';
    return h;
  }
  function kuis(u, k) {
    var b = S.belajar, m = (k.modul || []).filter(function (x) { return x.id === b.modul; })[0]; if (!m || !m.kuis) { b.kuisAktif = false; return detail(u, k); }
    var soal = m.kuis.soal, terjawab = soal.filter(function (s) { return b.jawaban[s.id] != null; }).length;
    var h = '<div class="flex items-center gap-10"><button class="btn btn-secondary" style="height:34px"' + aksi('belajarKembali') + '>← ' + esc(k.kode) + '</button><div class="grow"><div class="card-title">' + esc(m.kuis.judul || 'Kuis') + '</div><div class="t-115 o-6">' + soal.length + ' soal · lulus ≥ ' + (m.kuis.lulus || 80) + '% · maks ' + (m.kuis.maksPercobaan || 3) + ' percobaan</div></div><button class="btn btn-primary" style="height:36px"' + (terjawab === soal.length ? aksi('belajarKirim') : ' disabled') + '>Kirim jawaban · ' + terjawab + '/' + soal.length + '</button></div><div class="grid g2" style="gap:14px">';
    soal.forEach(function (s, i) { h += '<div class="card elev-sm gap-8"><div class="t-135 bold">' + (i + 1) + '. ' + esc(s.tanya) + '</div><div class="flex wrap gap-6">' + s.pilihan.map(function (pl, j) { return pl ? pill(b.jawaban[s.id] === j, pl, 'belajarJawab', s.id + ':' + j) : ''; }).join('') + '</div></div>'; });
    return h + '</div>';
  }
  function hasilKuis(u, k) {
    var b = S.belajar, r = b.hasil, m = (k.modul || []).filter(function (x) { return x.id === b.modul; })[0];
    var h = '<div class="flex items-center gap-10"><button class="btn btn-secondary" style="height:34px"' + aksi('belajarKembali') + '>← ' + esc(k.kode) + '</button><div class="grow card-title">Hasil kuis · ' + esc(m ? m.judul : '') + '</div>' + (r.lulus || r.habis ? '' : '<button class="btn btn-primary" style="height:36px"' + aksi('belajarKuis', b.modul) + '>Coba lagi (' + r.sisa + ' tersisa)</button>') + '</div>';
    h += '<div class="card ' + (r.lulus ? 'card-leaf' : 'card-clay') + ' gap-4" style="max-width:560px"><div class="f-head t-22">' + r.skorTerakhir + '%</div><div class="t-135 bold">' + (r.lulus ? 'Lulus' : r.habis ? 'Percobaan habis — minta pembinaan supervisor' : 'Belum lulus') + ' · ' + r.benar + '/' + r.total + ' benar</div>' + (r.kursusSelesai ? '<div class="t-125">Kursus tuntas — sertifikat diterbitkan.</div>' : '') + '</div><div class="grid g2" style="gap:14px">';
    (m ? m.kuis.soal : []).forEach(function (s, i) { var d = r.rinci.filter(function (x) { return x.soalId === s.id; })[0] || {}; h += '<div class="card elev-sm gap-4"><div class="t-135 bold">' + (i + 1) + '. ' + esc(s.tanya) + '</div><div class="t-125" style="color:' + (d.benar ? 'var(--color-accent-2-800,#0b5e55)' : '#9b1c1c') + '">' + (d.benar ? '✓ Benar' : '✕ Jawaban Anda: ' + esc(s.pilihan[d.jawaban] == null ? '—' : s.pilihan[d.jawaban])) + '</div>' + (s.penjelasan ? '<div class="t-115 o-7 lh-145">' + esc(s.penjelasan) + '</div>' : '') + '</div>'; });
    return h + '</div>';
  }
  AKSI.belajarBuka = function (id) { S.belajar = { kursus:id, modul:null, materi:null, jawaban:{}, hasil:null, kuisAktif:false }; };
  AKSI.belajarTutup = function () { S.belajar = { kursus:null, modul:null, materi:null, jawaban:{}, hasil:null }; };
  AKSI.belajarKembali = function () { var b = S.belajar; b.materi = null; b.modul = null; b.hasil = null; b.kuisAktif = false; };
  AKSI.belajarMateri = function (v) { var p = v.split(':'), b = S.belajar; b.modul = p[0]; b.materi = p[1]; b.hasil = null; b.kuisAktif = false; };
  AKSI.belajarKuis = function (mid) { var b = S.belajar; b.modul = mid; b.materi = null; b.jawaban = {}; b.hasil = null; b.kuisAktif = true; };
  AKSI.belajarJawab = function (v) { var p = v.split(':'); S.belajar.jawaban[p[0]] = Number(p[1]); };
  AKSI.belajarKirim = function () { var u = EXO_ADMIN_AUTH.pengguna(), b = S.belajar; try { b.hasil = L().nilaiKuis(u.id, b.kursus, b.modul, b.jawaban); b.kuisAktif = false; if (b.hasil.kursusSelesai) A.sekilas('Kursus tuntas — sertifikat diterbitkan.'); } catch (e) { A.sekilas(e.message, 'err'); } };
  AKSI.belajarSelesaiMateri = function () { var u = EXO_ADMIN_AUTH.pengguna(), b = S.belajar, k = L().kursus(b.kursus); if (!k) return; var selesai = L().tandaiMateri(u.id, k.id, b.materi); if (selesai) A.sekilas('Kursus tuntas — sertifikat diterbitkan.'); /* lanjut ke materi/kuis berikut */ var p = L().pendaftaran(u.id, k.id); for (var i = 0; i < k.modul.length; i++) { var m = k.modul[i]; for (var j = 0; j < m.materi.length; j++) if (p.materiSelesai.indexOf(m.materi[j].id) < 0) { b.modul = m.id; b.materi = m.materi[j].id; return; } if (m.kuis && !(p.kuis[m.id] && p.kuis[m.id].lulus)) { AKSI.belajarKuis(m.id); return; } } b.materi = null; b.modul = null; };
})(ADMIN);
