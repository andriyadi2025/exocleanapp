/* ==========================================================================
   exo-screens-belajar.js — Akademi EXOCLEAN di aplikasi mitra (LMS peserta)
   --------------------------------------------------------------------------
   Layar: pbelajar (beranda akademi) · pkursus (detail kursus) · pmateri
   (video/bacaan) · pkuis (kuis & hasil). Mesin: EXO_LMS. Konten yang tayang
   adalah terbitan konsol admin (exoclean_admin_pub.lms).
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas;
  var A = X.AKSI;
  K.lmsKursus = K.lmsKursus || null; K.lmsModul = K.lmsModul || null; K.lmsMateri = K.lmsMateri || null; K.lmsJawaban = K.lmsJawaban || {}; K.lmsHasil = K.lmsHasil || null; K.lmsLevel = K.lmsLevel || 'semua';
  function L() { return window.EXO_LMS; }
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  function pesertaId() { var a = aku(); return a.id || 'contoh_peserta'; }
  function pesertaObj() { var a = aku(); var d = window.EXO_DB && EXO_DB.ada() ? EXO_DB.find('users', a.id) : null; return d || { id:pesertaId(), nama:a.name, jabatan:(a.tags || [])[0] || 'Cleaner', role:'worker' }; }
  function kursusKini() { return L().katalog().filter(function (k) { return k.id === K.lmsKursus; })[0] || null; }
  function lencanaLevel(k) { return '<span class="tag ' + (k.level === 'lanjutan' ? 'tag-accent' : k.level === 'menengah' ? 'tag-accent-2' : 'tag-neutral') + '">' + esc(L().namaLevel(k.level)) + '</span>'; }
  function meterKecil(p) { return '<div class="refund-bar" style="margin:6px 0 0"><i class="' + (p > 0 ? 'on' : '') + '"></i><i class="' + (p >= 50 ? 'on' : '') + '"></i><i class="' + (p >= 100 ? 'on' : '') + '"></i></div>'; }
  function kartuKursus(k, u) {
    var p = L().progres(u.id, k.id) || { persen:0, status:'belum' }, kunci = L().terkunci(u.id, k);
    return '<button class="card elev-sm gap-6" style="text-align:start;cursor:pointer;width:100%"' + aksi('lmsBuka', k.id) + '><div class="flex items-center gap-8">' + lencanaLevel(k) + (k.wajib ? '<span class="tag tag-accent">Wajib</span>' : '') + '<span class="t-11 o-6" style="margin-inline-start:auto">' + esc(k.kode) + ' · ' + k.jam + ' jam</span></div>' +
      '<div class="f-head t-15">' + esc(k.judul) + '</div><div class="t-115 o-7 lh-145">' + esc(k.deskripsi || '').slice(0, 110) + (k.deskripsi && k.deskripsi.length > 110 ? '…' : '') + '</div>' +
      (kunci ? '<div class="t-11 c-leaf-800">🔒 Selesaikan dulu: ' + esc(kunci.map(function (x) { return x.kode; }).join(', ')) + '</div>' : '<div class="flex items-center gap-8 t-11 o-7"><span>' + (p.status === 'selesai' ? '✓ Selesai · nilai ' + p.nilai : p.status === 'berjalan' ? p.persen + '% · lanjutkan' : 'Belum dimulai') + '</span></div>' + meterKecil(p.status === 'selesai' ? 100 : p.persen)) + '</button>';
  }

  /* ---------------------------------------------------------- beranda */
  X.LAYAR.pbelajar = function () {
    var u = pesertaObj(), semua = L().untukPeserta(u), wajib = L().wajibBelum(u), sert = L().sertifikatPeserta(u.id), jalur = L().jalurUntuk(u);
    var jam = semua.reduce(function (n, k) { var p = L().progres(u.id, k.id); return n + (p && p.status === 'selesai' ? k.jam : 0); }, 0);
    var h = '<div class="screen"><div class="hero hero--leaf"><div class="flex items-center gap-11">' + X.logoMark(36) + '<div class="grow"><div class="f-head t-17">Akademi EXOCLEAN</div><div class="t-115 o-7">Belajar bertahap, bersertifikat · ' + esc(L().namaFungsi(L().fungsiDari(u))) + '</div></div></div>' +
      '<div class="flex gap-9" style="margin-top:16px"><div class="stat"><b>' + wajib.length + '</b><span>Wajib belum tuntas</span></div><div class="stat"><b>' + sert.length + '</b><span>Sertifikat</span></div><div class="stat"><b>' + jam + ' jam</b><span>Selesai</span></div></div></div>';
    h += '<div class="stack gap-12" style="padding:18px 20px 0">';
    if (wajib.length) h += '<div class="card card-clay gap-4"><div class="f-head t-15">' + wajib.length + ' kursus wajib belum tuntas</div><div class="t-115 lh-15 o-85">Kursus wajib menentukan job yang boleh Anda terima. Mulai dari yang paling dasar: ' + esc(wajib[0].judul) + '.</div></div>';
    if (jalur) {
      var ids = jalur.kursusIds || [], kk = ids.map(function (id) { return L().katalog().filter(function (k) { return k.id === id; })[0]; }).filter(Boolean), sel = kk.filter(function (k) { var p = L().progres(u.id, k.id); return p && p.status === 'selesai'; }).length;
      h += '<div class="card elev-md gap-8"><div class="flex items-center gap-8"><span class="tag tag-accent-2">Jalur pembelajaran</span><span class="t-11 o-6" style="margin-inline-start:auto">' + sel + '/' + kk.length + ' kursus</span></div><div class="f-head t-16">' + esc(jalur.judul) + '</div><div class="t-115 o-7 lh-145">' + esc(jalur.deskripsi || '') + '</div><div class="flex gap-6 wrap" style="margin-top:4px">';
      kk.forEach(function (k, i) { var p = L().progres(u.id, k.id); h += '<span class="tag ' + (p && p.status === 'selesai' ? 'tag-accent' : 'tag-neutral') + '">' + (i + 1) + '. ' + esc(k.kode) + (p && p.status === 'selesai' ? ' ✓' : '') + '</span>'; });
      h += '</div></div>';
    }
    h += '<div>' + X.labelBagian('Kursus untuk Anda') + '<div class="flex gap-8 wrap" style="margin-bottom:10px">';
    [['semua','Semua']].concat(L().LEVEL).forEach(function (l) { h += '<button class="' + kelas('pill pill-sm', K.lmsLevel === l[0]) + '"' + aksi('lmsLevel', l[0]) + '>' + esc(l[1]) + '</button>'; });
    h += '</div><div class="stack gap-10">';
    var urut = { dasar:0, menengah:1, lanjutan:2 };
    semua.filter(function (k) { return K.lmsLevel === 'semua' || k.level === K.lmsLevel; }).sort(function (a, b) { return (b.wajib - a.wajib) || (urut[a.level] - urut[b.level]); }).forEach(function (k) { h += kartuKursus(k, u); });
    if (!semua.length) h += '<div class="card elev-sm t-125 o-7">Belum ada kursus terbit untuk fungsi Anda.</div>';
    h += '</div></div>';
    if (sert.length) { h += '<div>' + X.labelBagian('Sertifikat saya') + '<div class="stack gap-8">'; sert.slice().reverse().forEach(function (s) { h += '<div class="card card-leaf gap-3"><div class="flex items-center gap-8"><span class="tag tag-accent">' + esc(s.no || s.kode) + '</span><span class="t-11 o-6" style="margin-inline-start:auto">berlaku s/d ' + esc(s.berlakuHingga || '—') + '</span></div><div class="t-135 bold">' + esc(s.judul) + '</div><div class="t-11 o-7">Nilai ' + esc(s.nilai == null ? '—' : s.nilai) + ' · terbit ' + esc(String(s.terbitAt || '').slice(0, 10)) + '</div></div>'; }); h += '</div></div>'; }
    return h + '<div class="spacer-14"></div></div></div>';
  };
  A.lmsLevel = function (v) { K.lmsLevel = v; };
  A.lmsBuka = function (id) { K.lmsKursus = id; K.lmsHasil = null; K.layar = 'pkursus'; };

  /* ---------------------------------------------------------- detail kursus */
  X.LAYAR.pkursus = function () {
    var u = pesertaObj(), k = kursusKini(); if (!k) { K.layar = 'pbelajar'; return X.LAYAR.pbelajar(); }
    var p = L().pendaftaran(u.id, k.id), pr = L().progres(u.id, k.id), kunci = L().terkunci(u.id, k);
    var h = '<div class="screen">' + X.kepala(esc(k.judul), esc(k.kode + ' · ' + L().namaLevel(k.level) + ' · ' + k.jam + ' jam · ' + (k.modul || []).length + ' modul'), 'pbelajar', lencanaLevel(k)) + '<div class="stack gap-12 pad-x18">';
    h += '<div class="card elev-sm gap-8"><div class="t-125 lh-15">' + esc(k.deskripsi || '') + '</div><div class="flex gap-6 wrap">' + (k.kompetensi || []).map(function (c) { return '<span class="tag tag-neutral">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="flex items-center gap-8 t-115 o-7"><span>' + (pr && pr.status === 'selesai' ? '✓ Selesai · nilai akhir ' + pr.nilai : pr ? pr.persen + '% selesai · ' + pr.materiOk + '/' + pr.materi + ' materi · ' + pr.kuisOk + '/' + pr.kuis + ' kuis lulus' : '') + '</span></div>' + meterKecil(pr ? (pr.status === 'selesai' ? 100 : pr.persen) : 0) + '</div>';
    if (kunci) h += '<div class="card card-clay gap-4"><div class="f-head t-15">🔒 Terkunci</div><div class="t-125 lh-15">Selesaikan dulu ' + esc(kunci.map(function (x) { return x.kode + ' ' + x.judul; }).join('; ')) + '. Jenjang dijaga supaya materi lanjutan tidak dipelajari tanpa dasarnya.</div></div>';
    (k.modul || []).forEach(function (m, i) {
      h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><span class="survey-num">' + (i + 1) + '</span><div class="grow f-head t-15">' + esc(m.judul) + '</div></div><div class="stack gap-6">';
      (m.materi || []).forEach(function (t) { var ok = p && p.materiSelesai.indexOf(t.id) >= 0; h += '<button class="row row-xs' + (ok ? ' on-leaf' : '') + '"' + (kunci ? ' disabled' : aksi('lmsMateri', m.id + ':' + t.id)) + '><span class="' + kelas('box', ok) + '">✓</span><span class="row-main"><b style="font-size:12.5px">' + esc(t.judul) + '</b><span style="font-size:11px">' + (t.jenis === 'video' ? '▶ Video' : t.jenis === 'tautan' ? '↗ Tautan' : '📖 Bacaan') + ' · ' + (t.menit || 5) + ' menit</span></span></button>'; });
      if (m.kuis) { var r = p && p.kuis[m.id]; h += '<button class="row row-xs' + (r && r.lulus ? ' on-leaf' : '') + '"' + (kunci ? ' disabled' : aksi('lmsKuis', m.id)) + '><span class="' + kelas('box', !!(r && r.lulus)) + '">✓</span><span class="row-main"><b style="font-size:12.5px">' + esc(m.kuis.judul || 'Kuis') + '</b><span style="font-size:11px">' + m.kuis.soal.length + ' soal · lulus ≥ ' + (m.kuis.lulus || 80) + '%' + (r ? ' · skor ' + r.skor + ' · percobaan ' + r.percobaan + '/' + (m.kuis.maksPercobaan || 3) : '') + '</span></span></button>'; }
      h += '</div></div>';
    });
    if (pr && pr.status === 'selesai') { var s = L().sertifikatPeserta(u.id).filter(function (x) { return x.kursusId === k.id; })[0]; if (s) h += '<div class="card card-leaf gap-4"><div class="flex items-center gap-8"><span class="tag tag-accent">Sertifikat</span><span class="t-11 o-6" style="margin-inline-start:auto">' + esc(s.no || s.kode) + '</span></div><div class="f-head t-16">' + esc(s.judul) + '</div><div class="t-115 o-7">Nilai ' + esc(s.nilai) + ' · berlaku sampai ' + esc(s.berlakuHingga) + ' · tampil di profil Anda untuk pelanggan</div></div>'; }
    h += '<div class="spacer-14"></div></div>';
    if (!kunci && !(pr && pr.status === 'selesai')) { var berikut = materiBerikut(k, p); if (berikut) h += '<div class="actionbar"><button class="btn btn-primary btn-block btn-tall"' + aksi(berikut.jenis === 'kuis' ? 'lmsKuis' : 'lmsMateri', berikut.jenis === 'kuis' ? berikut.modulId : berikut.modulId + ':' + berikut.id) + '>' + (p ? 'Lanjutkan' : 'Mulai kursus') + ' · ' + esc(berikut.judul) + '</button></div>'; }
    return h + '</div>';
  };
  function materiBerikut(k, p) {
    for (var i = 0; i < (k.modul || []).length; i++) { var m = k.modul[i]; for (var j = 0; j < (m.materi || []).length; j++) if (!p || p.materiSelesai.indexOf(m.materi[j].id) < 0) return Object.assign({ modulId:m.id }, m.materi[j]); if (m.kuis && !(p && p.kuis[m.id] && p.kuis[m.id].lulus)) return { jenis:'kuis', modulId:m.id, judul:m.kuis.judul || 'Kuis' }; }
    return null;
  }
  A.lmsMateri = function (v) { var p = v.split(':'); K.lmsModul = p[0]; K.lmsMateri = p[1]; K.layar = 'pmateri'; };
  A.lmsKuis = function (mid) { K.lmsModul = mid; K.lmsJawaban = {}; K.lmsHasil = null; K.layar = 'pkuis'; };

  /* ---------------------------------------------------------- materi */
  X.LAYAR.pmateri = function () {
    var u = pesertaObj(), k = kursusKini(); if (!k) { K.layar = 'pbelajar'; return X.LAYAR.pbelajar(); }
    var m = (k.modul || []).filter(function (x) { return x.id === K.lmsModul; })[0], t = m && (m.materi || []).filter(function (x) { return x.id === K.lmsMateri; })[0]; if (!t) { K.layar = 'pkursus'; return X.LAYAR.pkursus(); }
    var p = L().pendaftaran(u.id, k.id), ok = p && p.materiSelesai.indexOf(t.id) >= 0;
    var h = '<div class="screen">' + X.kepala(esc(t.judul), esc(m.judul + ' · ' + (t.menit || 5) + ' menit'), 'pkursus') + '<div class="stack gap-12 pad-x18">';
    if (t.jenis === 'video') h += t.url && /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//.test(t.url) ? '<div class="map" style="height:200px;border-radius:20px;overflow:hidden"><iframe class="bingkai" src="' + esc(t.url) + '" title="' + esc(t.judul) + '" allow="fullscreen" referrerpolicy="no-referrer"></iframe></div>' : '<div class="card card-clay gap-4"><div class="f-head t-15">▶ Video belum ditautkan</div><div class="t-115 lh-15">Admin mengisi tautan YouTube/Vimeo perusahaan di konsol (Pembelajaran → materi). Tandai selesai setelah menonton.</div></div>';
    if (t.jenis === 'tautan') h += '<a class="btn btn-secondary btn-block" href="' + esc(t.url) + '" target="_blank" rel="noopener">Buka materi ↗</a>';
    if (t.isi) String(t.isi).split(/\n\n+/).forEach(function (par) { h += '<div class="card elev-sm"><div class="t-135 lh-16">' + par.split('\n').map(esc).join('<br>') + '</div></div>'; });
    h += '<div class="spacer-14"></div></div><div class="actionbar"><button class="btn btn-primary btn-block btn-tall"' + aksi('lmsSelesaiMateri') + '>' + (ok ? 'Sudah selesai · lanjut' : 'Tandai selesai & lanjut') + '</button></div>';
    return h + '</div>';
  };
  A.lmsSelesaiMateri = function () {
    var u = pesertaObj(), k = kursusKini(); if (!k) return;
    var selesai = L().tandaiMateri(u.id, k.id, K.lmsMateri);
    if (selesai) { X.sekilas('Kursus selesai — sertifikat diterbitkan.'); K.layar = 'pkursus'; return; }
    var p = L().pendaftaran(u.id, k.id), b = materiBerikut(k, p);
    if (!b) { K.layar = 'pkursus'; return; }
    if (b.jenis === 'kuis') { A.lmsKuis(b.modulId); return; }
    K.lmsModul = b.modulId; K.lmsMateri = b.id; K.layar = 'pmateri';
  };

  /* ---------------------------------------------------------- kuis */
  X.LAYAR.pkuis = function () {
    var u = pesertaObj(), k = kursusKini(); if (!k) { K.layar = 'pbelajar'; return X.LAYAR.pbelajar(); }
    var m = (k.modul || []).filter(function (x) { return x.id === K.lmsModul; })[0]; if (!m || !m.kuis) { K.layar = 'pkursus'; return X.LAYAR.pkursus(); }
    var p = L().pendaftaran(u.id, k.id), r = p && p.kuis[m.id], hasil = K.lmsHasil, soal = m.kuis.soal;
    var h = '<div class="screen">' + X.kepala(esc(m.kuis.judul || 'Kuis'), esc(soal.length + ' soal · lulus ≥ ' + (m.kuis.lulus || 80) + '% · maks ' + (m.kuis.maksPercobaan || 3) + ' percobaan'), 'pkursus') + '<div class="stack gap-12 pad-x18">';
    if (hasil) {
      h += '<div class="card ' + (hasil.lulus ? 'card-leaf' : 'card-clay') + ' gap-4"><div class="f-head t-22">' + hasil.skorTerakhir + '%</div><div class="t-135 bold">' + (hasil.lulus ? 'Lulus 🎉' : hasil.habis ? 'Percobaan habis' : 'Belum lulus') + ' · ' + hasil.benar + '/' + hasil.total + ' benar</div><div class="t-115 o-8 lh-15">' + (hasil.lulus ? (hasil.kursusSelesai ? 'Semua modul tuntas — sertifikat diterbitkan ke profil Anda.' : 'Lanjut ke modul berikutnya.') : hasil.sisa ? 'Baca kembali materi, lalu coba lagi. Sisa ' + hasil.sisa + ' percobaan.' : 'Hubungi supervisor untuk membuka percobaan tambahan setelah pembinaan.') + '</div></div>';
      soal.forEach(function (s, i) { var d = hasil.rinci.filter(function (x) { return x.soalId === s.id; })[0] || {}; h += '<div class="card elev-sm gap-6"><div class="t-135 bold">' + (i + 1) + '. ' + esc(s.tanya) + '</div><div class="t-125 ' + (d.benar ? 'c-leaf-800' : '') + '" style="' + (d.benar ? '' : 'color:#9b1c1c') + '">' + (d.benar ? '✓ Benar' : '✕ Jawaban Anda: ' + esc(s.pilihan[d.jawaban] == null ? '—' : s.pilihan[d.jawaban])) + '</div>' + (!d.benar && hasil.lulus ? '<div class="t-115 o-7">Kunci: ' + esc(s.pilihan[s.jawaban]) + '</div>' : '') + (s.penjelasan ? '<div class="t-115 o-7 lh-145">' + esc(s.penjelasan) + '</div>' : '') + '</div>'; });
      h += '<div class="spacer-14"></div></div><div class="actionbar">' + (hasil.lulus || hasil.habis ? '<button class="btn btn-primary btn-block btn-tall"' + aksi('ke', 'pkursus') + '>Kembali ke kursus</button>' : '<button class="btn btn-primary btn-block btn-tall"' + aksi('lmsKuis', m.id) + '>Coba lagi</button>') + '</div>';
      return h + '</div>';
    }
    if (r && r.lulus) h += '<div class="card card-leaf t-125">Anda sudah lulus kuis ini dengan skor ' + r.skor + '%.</div>';
    soal.forEach(function (s, i) {
      h += '<div class="card elev-sm gap-8"><div class="t-135 bold">' + (i + 1) + '. ' + esc(s.tanya) + '</div><div class="stack gap-6">';
      s.pilihan.forEach(function (pl, j) { if (!pl) return; var on = K.lmsJawaban[s.id] === j; h += '<button class="row row-xs' + (on ? ' on-leaf' : '') + '"' + aksi('lmsJawab', s.id + ':' + j) + '><span class="' + kelas('dot', on) + '"></span><span class="row-main"><b style="font-size:12.5px;font-weight:500">' + esc(pl) + '</b></span></button>'; });
      h += '</div></div>';
    });
    var terjawab = soal.filter(function (s) { return K.lmsJawaban[s.id] != null; }).length;
    h += '<div class="spacer-14"></div></div><div class="actionbar"><button class="btn btn-primary btn-block btn-tall"' + (terjawab === soal.length ? aksi('lmsKirim') : ' disabled') + '>Kirim jawaban · ' + terjawab + '/' + soal.length + '</button></div>';
    return h + '</div>';
  };
  A.lmsJawab = function (v) { var p = v.split(':'); K.lmsJawaban[p[0]] = Number(p[1]); };
  A.lmsKirim = function () { var u = pesertaObj(), k = kursusKini(); if (!k) return; try { K.lmsHasil = L().nilaiKuis(u.id, k.id, K.lmsModul, K.lmsJawaban); if (K.lmsHasil.kursusSelesai) X.sekilas('Kursus selesai — sertifikat diterbitkan.'); } catch (e) { X.sekilas(e.message, 'err'); } };
})(ExoApp);
