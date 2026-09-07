/* ==========================================================================
   exo-lms-sop.js — SOP layanan → kursus WAJIB di Akademi, per fungsi kerja
   --------------------------------------------------------------------------
   Setiap SOP yang berlaku (EXO_SOP.berlaku: terbitan admin, atau bawaan
   rancangan) dijadikan satu kursus wajib `SOP-<kode>` dengan tiga modul yang
   DIBANGKITKAN dari isi SOP: (1) persiapan APD/alat/chemical, (2) langkah
   kerja berurutan + foto bukti, (3) aturan mutu & bukti. Kuis tiap modul
   juga dibangkitkan dari isi SOP (takaran chemical, urutan langkah, langkah
   wajib foto) — jadi saat admin menerbitkan revisi SOP baru, kursusnya
   ikut diperbarui otomatis (EXO_LMS.sinkronSop) dan mitra yang sudah lulus
   revisi lama diminta mengulang kuis revisi baru.

   Target fungsi kerja per SOP (PETA_FUNGSI): cleaner · teknisi · pengasuh ·
   jurumasak · terapis · supervisor. SOP yang sudah punya kursus rancangan
   (D-001 → LMS-101, D-014 → LMS-201) tidak digandakan: kursus itu diberi
   modul SOP yang sama dan ditandai wajib.
   ========================================================================== */
var EXO_LMS_SOP = (function () {
  'use strict';
  var KURSUS_LAMA = { 'D-001':'LMS-101', 'D-014':'LMS-201' };
  var PETA_FUNGSI = {
    'D-001':['cleaner'], 'D-002':['cleaner'], 'D-005':['cleaner','supervisor'], 'D-016':['cleaner'], 'D-020':['cleaner'], 'D-022':['cleaner'], 'D-026':['cleaner'], 'D-031':['cleaner'], 'D-032':['cleaner','teknisi'], 'D-035':['cleaner'],
    'D-014':['teknisi'], 'B-004':['teknisi','cleaner'], 'D-033':['teknisi'], 'D-034':['teknisi','cleaner'], 'B-009':['teknisi'], 'B-010':['teknisi','supervisor'], 'B-011':['supervisor','cleaner'],
    'C-001':['pengasuh'], 'C-002':['semua'], 'C-003':['terapis'], 'C-004':['jurumasak']
  };
  var LEVEL = { 'B-004':'menengah', 'B-009':'lanjutan', 'B-010':'lanjutan', 'B-011':'menengah', 'D-002':'menengah', 'D-031':'menengah', 'D-032':'menengah', 'D-033':'menengah', 'D-034':'menengah', 'D-035':'menengah', 'C-001':'menengah', 'C-003':'menengah' };
  var PRASYARAT_TAMBAHAN = { 'B-009':['LMS-004'], 'B-010':['LMS-004','LMS-005'], 'D-032':['LMS-004'], 'D-034':['LMS-004'], 'C-001':['LMS-005','LMS-601'], 'C-004':['LMS-501'], 'D-002':['LMS-102'], 'B-004':['LMS-102'] };
  var JALUR_FUNGSI = { cleaner:'JALUR-CLEANER', teknisi:'JALUR-TEKNISI', supervisor:'JALUR-SUPERVISOR', pengasuh:'JALUR-PENGASUH', jurumasak:'JALUR-JURUMASAK', terapis:'JALUR-TERAPIS', staf:'JALUR-STAF' };
  var PPE = { gloves:'Sarung tangan', mask:'Masker', shoes:'Sepatu safety tertutup', goggles:'Kacamata pelindung', coverall:'Coverall', respirator:'Respirator', earmuff:'Pelindung telinga', apron:'Celemek', boots:'Sepatu bot', harness:'Harness (bekerja di ketinggian)', helmet:'Helm', gasdetect:'Detektor gas' };
  function ppeNama(k) { return PPE[k] || k; }
  function acak(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  /* pilih n item lain sebagai pengecoh, deterministik per seed */
  function pengecoh(daftar, kecuali, n, seed) { var pool = daftar.filter(function (x) { return x !== kecuali; }), out = []; for (var i = 0; i < pool.length && out.length < n; i++) { var j = Math.floor(acak(seed + i) * pool.length); var x = pool.splice(j, 1)[0]; if (x) out.push(x); } return out; }
  function sisip(benar, salah, seed) { var arr = salah.slice(); var pos = Math.floor(acak(seed) * (arr.length + 1)); arr.splice(pos, 0, benar); return { pilihan:arr, jawaban:pos }; }
  function fungsiUntuk(code) { return PETA_FUNGSI[code] || ['cleaner']; }

  /* ---- bangun modul SOP dari isi berlaku; b = EXO_LMS.bahan ---- */
  function modulSop(sop, b) {
    var code = sop.code, steps = sop.steps || [], chem = sop.chem || [], alat = sop.alat || [], ppe = sop.ppe || [], seed = code.split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0);
    /* Modul 1: persiapan */
    var isi1 = 'APD wajib (semua dicentang di aplikasi sebelum langkah kerja terbuka — aturan #8):\n' + ppe.map(function (p) { return '• ' + ppeNama(p); }).join('\n') +
      (alat.length ? '\n\nAlat:\n' + alat.map(function (a) { return '• ' + a[0] + (a[1] ? ' — ' + a[1] : ''); }).join('\n') : '') +
      (chem.length ? '\n\nChemical & takaran:\n' + chem.map(function (c) { return '• ' + c[0] + (c[1] ? ' — ' + c[1] : ''); }).join('\n') : '') +
      '\n\nChemical hanya dipakai sesuai takaran pada label EXOCLEAN; tidak pernah dicampur (LMS-102). Alat yang rusak dilaporkan sebelum berangkat, bukan di lokasi.';
    var soal1 = [];
    if (ppe.length) { var semuaPpe = Object.keys(PPE).map(ppeNama), benar = ppe.map(ppeNama).join(', '), s1 = sisip(benar, pengecoh(semuaPpe, null, 3, seed + 1).map(function (x, i) { return i === 0 ? x : x + ', ' + ppeNama(ppe[0] || 'gloves'); }), seed + 2); soal1.push(b.soal('APD wajib untuk SOP ' + code + ' (' + sop.title + ') adalah…', s1.pilihan, s1.jawaban, 'Semua APD wajib dicentang di aplikasi sebelum langkah kerja terbuka.')); }
    var chemTakar = chem.filter(function (c) { return /\d+\s*:\s*\d+/.test(c[1] || ''); })[0];
    if (chemTakar) { var t = chemTakar[1].match(/\d+\s*:\s*\d+/)[0].replace(/\s/g, ''), takaran = ['1:5', '1:10', '1:20', '1:40', '1:100'], s2 = sisip(t, pengecoh(takaran, t, 3, seed + 3), seed + 4); soal1.push(b.soal('Takaran ' + chemTakar[0] + ' sesuai SOP ' + code + '…', s2.pilihan, s2.jawaban, 'Takaran lebih pekat tidak lebih bersih — merusak permukaan dan paru-paru.')); }
    else if (alat.length) { var a0 = alat[0][0], s3 = sisip(a0, pengecoh(['Kursi plastik', 'Sapu lidi', 'Ember tanpa pemeras', 'Kain bekas', 'Selang taman'], null, 3, seed + 5), seed + 6); soal1.push(b.soal('Alat yang wajib dibawa untuk SOP ' + code + '…', s3.pilihan, s3.jawaban)); }
    /* Modul 2: langkah */
    var isi2 = 'Langkah dikerjakan BERURUTAN di aplikasi (aturan #9); langkah berikutnya terbuka setelah yang sebelumnya ditutup. Tanda 📷 = wajib foto bukti.\n\n' + steps.map(function (s, i) { return (i + 1) + '. ' + s[0] + (s[2] ? ' 📷' : '') + (s[1] ? '\n   ' + s[1] : ''); }).join('\n') + '\n\nFoto: hanya area kerja, tidak pernah orang atau dokumen (LMS-002). Bila satu langkah tidak bisa dikerjakan (akses/listrik/air), catat alasannya di langkah itu — jangan dilewati diam-diam.';
    var judulLangkah = steps.map(function (s) { return s[0]; }), soal2 = [];
    if (steps.length >= 3) {
      var p1 = sisip(judulLangkah[0], pengecoh(judulLangkah, judulLangkah[0], 3, seed + 7), seed + 8); soal2.push(b.soal('Langkah PERTAMA SOP ' + code + ' saat tiba di lokasi…', p1.pilihan, p1.jawaban, 'Urutan langkah wajib diikuti; aplikasi mengunci langkah berikutnya.'));
      var idx = Math.min(steps.length - 2, 1 + Math.floor(acak(seed + 9) * (steps.length - 2))), p2 = sisip(judulLangkah[idx + 1], pengecoh(judulLangkah, judulLangkah[idx + 1], 3, seed + 10), seed + 11); soal2.push(b.soal('Setelah "' + judulLangkah[idx] + '", langkah berikutnya adalah…', p2.pilihan, p2.jawaban));
      var foto = steps.filter(function (s) { return s[2]; }), tanpa = steps.filter(function (s) { return !s[2]; });
      if (foto.length && tanpa.length) { var p3 = sisip(foto[foto.length - 1][0], pengecoh(tanpa.map(function (s) { return s[0]; }), null, 3, seed + 12), seed + 13); soal2.push(b.soal('Langkah yang WAJIB disertai foto bukti pada SOP ' + code + '…', p3.pilihan, p3.jawaban, 'Foto bukti dipakai untuk laporan pelanggan, klaim, dan inspeksi supervisor.')); }
    }
    /* Modul 3: mutu & bukti */
    var isi3 = 'Standar hasil ' + sop.title + ' dinilai dari: checklist lengkap tanpa langkah dilewati, foto sebelum/sesudah pada langkah 📷, cek akhir bersama pelanggan, dan tidak ada keluhan 24 jam. Supervisor melakukan inspeksi acak (A-011); temuan menjadi poin pembinaan (Kinerja & sanksi).\n\nHal yang membatalkan job: APD tidak lengkap, chemical dicampur, langkah dilewati tanpa alasan, foto orang/dokumen, menerima job langsung dari pelanggan di luar aplikasi.\n\nRevisi SOP: kursus ini mengikuti revisi SOP yang diterbitkan konsol admin (Rev.' + String(sop.rev || 0).padStart(2, '0') + '). Bila SOP direvisi, Anda diminta mengulang kuis revisi terbaru sebelum menerima job layanan ini.';
    var soal3 = [b.soal('Anda tidak bisa mengerjakan satu langkah karena listrik padam. Yang benar…', ['Lewati diam-diam agar checklist selesai', 'Catat alasannya di langkah tersebut dan beri tahu pelanggan', 'Foto langkah lain sebagai pengganti', 'Batalkan job tanpa kabar'], 1), b.soal('Foto bukti boleh memuat…', ['Wajah pelanggan sebagai bukti kehadiran', 'Dokumen di meja', 'Area kerja sebelum dan sesudah saja', 'Apa saja yang ada'], 2)];
    return [
      b.modul('Persiapan: APD, alat & chemical — ' + code, [b.bacaan('APD, alat, dan chemical untuk ' + sop.title, isi1, 5)], soal1.length ? { soal:soal1 } : null),
      b.modul('Langkah kerja berurutan — ' + code, [b.bacaan(steps.length + ' langkah SOP ' + code, isi2, Math.max(4, steps.length))], soal2.length ? { soal:soal2 } : null),
      b.modul('Mutu, bukti & sanksi — ' + code, [b.bacaan('Standar hasil dan yang membatalkan job', isi3, 4)], { soal:soal3 })
    ].map(function (m) { m.sopModul = true; m.sopCode = code; return m; });
  }

  /* ---- sinkron: dipanggil EXO_LMS.sinkronSop() ---- */
  function sinkron(L, d) {
    if (!window.EXO_SOP) return 0;
    var b = L.bahan, semuaSop = EXO_SOP.semua(), kursusAda = {}, n = 0;
    d.all('kursus').forEach(function (k) { kursusAda[k.kode] = k; });
    semuaSop.forEach(function (sop) {
      var code = sop.code, kodeKursus = KURSUS_LAMA[code] || ('SOP-' + code), k = kursusAda[kodeKursus], rev = Number(sop.rev || 0);
      if (k && Number(k.sopRev != null ? k.sopRev : -1) === rev && k.sop === code && k.wajibLayanan) return;   /* sudah sinkron */
      var modulBaru = modulSop(sop, b), target = fungsiUntuk(code);
      if (k) {
        var lain = (k.modul || []).filter(function (m) { return !m.sopModul; });
        /* revisi SOP naik → mitra yang sudah lulus diminta mengulang kuis revisi baru (sertifikat lama tetap tercatat) */
        if (k.sop === code && Number(k.sopRev || 0) < rev) d.all('pendaftaran').forEach(function (p) { if (p.kursusId === k.id && p.status === 'selesai') d.update('pendaftaran', p.id, { status:'berjalan', perluUlang:'SOP ' + code + ' Rev.' + String(rev).padStart(2, '0'), selesaiAt:null }); });
        d.update('kursus', k.id, { modul:lain.concat(modulBaru), sop:code, sopRev:rev, wajib:true, wajibLayanan:sop.jasa || k.wajibLayanan || null, target:k.kode === kodeKursus && KURSUS_LAMA[code] ? k.target : target, rev:(k.rev || 1) + 1, sopSinkronAt:new Date().toISOString(), deskripsi:k.deskripsi || ('SOP ' + code + ' ' + sop.title) });
      } else {
        var r = d.insert('kursus', { kode:kodeKursus, judul:'SOP ' + code + ' — ' + sop.title, level:LEVEL[code] || 'dasar', target:target, jam:Math.round((0.5 + (sop.steps || []).length * 0.25) * 2) / 2, wajib:true, wajibLayanan:sop.jasa || null, kompetensi:['SOP ' + code, 'APD', 'Foto bukti'], prasyarat:['LMS-001', 'LMS-002'].concat(PRASYARAT_TAMBAHAN[code] || []), deskripsi:'Kursus wajib yang dibangkitkan dari SOP ' + code + ' (' + sop.title + ') revisi berlaku: APD & chemical, ' + (sop.steps || []).length + ' langkah berurutan dengan foto bukti, standar mutu. Wajib lulus hanya untuk menerima job layanan ini — tidak menahan job layanan lain.', modul:modulBaru, status:'terbit', rev:1, terbitAt:new Date().toISOString(), oleh:'SOP ' + code, masaBerlakuBulan:12, sop:code, sopRev:rev, sopSinkronAt:new Date().toISOString() });
        kursusAda[kodeKursus] = r;
      }
      n++;
    });
    /* jalur per fungsi: tambahkan kursus SOP wajib untuk fungsi itu */
    var jalur = {}; d.all('jalur').forEach(function (j) { jalur[j.kode] = j; });
    Object.keys(JALUR_FUNGSI).forEach(function (f) {
      var kode = JALUR_FUNGSI[f], daftar = Object.keys(kursusAda).map(function (kd) { return kursusAda[kd]; }).filter(function (k) { return k.sop && (k.target || []).indexOf(f) >= 0; }).map(function (k) { return k.kode; });
      if (!daftar.length) return;
      var j = jalur[kode];
      if (!j) { if (f !== 'terapis') return; var dasar = ['LMS-001', 'LMS-002', 'LMS-003', 'LMS-004']; j = d.insert('jalur', { kode:kode, judul:'Jalur Terapis Pijat', target:'terapis', kursus:dasar, kursusIds:dasar.map(function (kd) { return kursusAda[kd] && kursusAda[kd].id; }).filter(Boolean), deskripsi:'K3, etika, kebersihan tangan, ergonomi, lalu SOP pijat & perawatan tubuh.' }); jalur[kode] = j; }
      var kursusKode = (j.kursus || []).slice(), berubah = false; daftar.forEach(function (kd) { if (kursusKode.indexOf(kd) < 0) { kursusKode.push(kd); berubah = true; } });
      if (berubah) d.update('jalur', j.id, { kursus:kursusKode, kursusIds:kursusKode.map(function (kd) { return kursusAda[kd] && kursusAda[kd].id; }).filter(Boolean) });
    });
    return n;
  }
  return { PETA_FUNGSI:PETA_FUNGSI, KURSUS_LAMA:KURSUS_LAMA, fungsiUntuk:fungsiUntuk, modulSop:modulSop, sinkron:sinkron, ppeNama:ppeNama };
})();
