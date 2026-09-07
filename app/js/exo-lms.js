/* ==========================================================================
   exo-lms.js — Learning Management System EXOCLEAN (mesin bersama)
   --------------------------------------------------------------------------
   Dipakai konsol admin (kelola kursus, pantau peserta, "Belajar saya" untuk
   staf) dan aplikasi mitra (Akademi). Pola mengikuti Coursera:

     · KURSUS  → MODUL → MATERI (video / bacaan / tautan) + KUIS per modul.
     · Level: dasar → menengah → lanjutan; PRASYARAT mengunci kursus lanjutan
       sampai kursus dasarnya selesai.
     · Kuis: pilihan ganda, ambang lulus (bawaan 80%), batas percobaan
       (bawaan 3), penjelasan per soal setelah dikirim.
     · JALUR pembelajaran (ala Specialization) per fungsi kerja: cleaner,
       teknisi AC, pengasuh, juru masak, supervisor, staf kantor.
     · Progres per peserta, nilai akhir = rata-rata kuis, SERTIFIKAT otomatis
       (tabel sertifikat yang sama dengan roster) dengan masa berlaku.
     · Kursus WAJIB per fungsi: belum tuntas → tampil di Kinerja/Pelatihan dan
       (di produksi) menahan mitra dari penawaran ke pelanggan.

   Data: tabel kursus, jalur, pendaftaran (EXO_DB). Yang diterbitkan ke
   aplikasi mitra: exoclean_admin_pub.lms = { kursus:[terbit], jalur:[...] },
   seperti SOP. Menerbitkan/menarik kursus lewat Persetujuan (lapisan admin).
   ========================================================================== */
var EXO_LMS = (function () {
  'use strict';
  var KUNCI_PUB = 'exoclean_admin_pub';
  var LEVEL = [['dasar','Dasar'],['menengah','Menengah'],['lanjutan','Lanjutan']];
  var FUNGSI = [['semua','Semua'],['cleaner','Cleaner'],['teknisi','Teknisi AC'],['pengasuh','Pengasuh'],['jurumasak','Juru masak'],['terapis','Terapis pijat'],['supervisor','Supervisor'],['staf','Staf kantor']];
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function uid(p) { return (window.EXO_UTIL && EXO_UTIL.uid) ? EXO_UTIL.uid(p) : p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function bacaPub() { try { return JSON.parse(localStorage.getItem(KUNCI_PUB) || '{}') || {}; } catch (e) { return {}; } }
  function tulisPub(p) { try { localStorage.setItem(KUNCI_PUB, JSON.stringify(p)); } catch (e) { /* abaikan */ } }
  function namaLevel(k) { for (var i = 0; i < LEVEL.length; i++) if (LEVEL[i][0] === k) return LEVEL[i][1]; return k; }
  function namaFungsi(k) { for (var i = 0; i < FUNGSI.length; i++) if (FUNGSI[i][0] === k) return FUNGSI[i][1]; return k; }
  /* fungsi kerja peserta dari jabatan/peran */
  function fungsiDari(u) {
    if (!u) return 'cleaner'; if (u.role === 'admin') return 'staf';
    var j = String(u.jabatan || '').toLowerCase();
    if (/ac|teknisi/.test(j)) return 'teknisi'; if (/supervisor|senior/.test(j)) return 'supervisor'; if (/pengasuh|perawat/.test(j)) return 'pengasuh'; if (/masak|koki/.test(j)) return 'jurumasak'; if (/pijat|terapis|massage/.test(j)) return 'terapis';
    return 'cleaner';
  }

  /* ------------------------------------------------------------ benih kursus */
  function soal(t, p, j, x) { return { id:uid('so'), tanya:t, pilihan:p, jawaban:j, penjelasan:x || '' }; }
  function bacaan(judul, isi, menit) { return { id:uid('mt'), jenis:'bacaan', judul:judul, isi:isi, menit:menit || 5 }; }
  function video(judul, url, menit) { return { id:uid('mt'), jenis:'video', judul:judul, url:url || '', menit:menit || 8 }; }
  function tautan(judul, url, isi, menit) { return { id:uid('mt'), jenis:'tautan', judul:judul, url:url || '', isi:isi || '', menit:menit || 5 }; }
  function modul(judul, materi, kuis) { return { id:uid('md'), judul:judul, materi:materi, kuis:kuis ? Object.assign({ id:uid('kz'), judul:'Kuis: ' + judul, lulus:80, maksPercobaan:3 }, kuis) : null }; }
  function BENIH() {
    var k3 = { kode:'LMS-001', judul:'K3 & APD dasar untuk petugas lapangan', level:'dasar', target:['semua'], jam:2, wajib:true, kompetensi:['APD','Ergonomi','Bahan kimia'], prasyarat:[], deskripsi:'Kursus wajib pertama: mengenali bahaya di lokasi pelanggan, memakai APD dengan benar, dan bertindak saat kecelakaan kecil. Selesaikan sebelum job pertama.',
      modul:[
        modul('Bahaya di lokasi kerja', [bacaan('Lima bahaya yang paling sering terjadi', 'Terpeleset di lantai basah, cipratan chemical ke mata, tersengat listrik saat mencuci AC, terjatuh dari tangga, dan terhirup uap pembersih di ruang tertutup.\n\nSetiap SOP EXOCLEAN memulai dengan langkah "cek area bersama pelanggan" — itulah saat Anda memetakan bahaya: stopkontak dekat air, lantai licin, ventilasi, dan hewan peliharaan.\n\nAturan emas: bila ragu, hentikan, foto, dan hubungi supervisor. Tidak ada job yang lebih penting daripada pulang dengan selamat.', 6), video('Video: memasang dan melepas APD', '', 7)],
          { soal:[soal('Apa langkah pertama di setiap SOP EXOCLEAN saat tiba di lokasi?', ['Langsung mulai membersihkan area terkotor','Cek area bersama pelanggan dan petakan bahaya','Memfoto hasil akhir','Meminta pembayaran'], 1, 'Pemetaan bahaya dilakukan bersama pelanggan sebelum alat dinyalakan.'), soal('Chemical terkena mata. Tindakan pertama?', ['Gosok mata dengan tisu','Bilas dengan air mengalir 15 menit lalu lapor supervisor','Lanjut bekerja bila tidak perih','Teteskan obat mata milik pelanggan'], 1), soal('APD minimal untuk general cleaning adalah…', ['Sarung tangan dan sepatu safety','Respirator dan harness','Helm dan goggles','Tidak ada, cukup seragam'], 0)] }),
        modul('Menangani chemical dengan aman', [bacaan('Baca label, ikuti takaran', 'Degreaser dapur dipakai 1:10 dengan waktu kontak 5 menit; pembersih lantai 1:40. Takaran lebih pekat tidak membuat lebih bersih — ia merusak permukaan dan paru-paru Anda.\n\nJangan pernah mencampur pemutih (klorin) dengan pembersih berbahan asam atau amonia: gasnya beracun.\n\nSimpan chemical dalam wadah aslinya, berlabel, jauh dari makanan dan anak-anak di rumah pelanggan.', 5)],
          { soal:[soal('Pemutih klorin TIDAK boleh dicampur dengan…', ['Air','Pembersih berbahan asam atau amonia','Sabun cuci piring','Microfiber'], 1), soal('Takaran degreaser dapur sesuai SOP adalah…', ['1:1','1:10 dengan kontak 5 menit','1:100','Tanpa diencerkan'], 1)] })
      ] };
    var etik = { kode:'LMS-002', judul:'Kode etik & privasi pelanggan', level:'dasar', target:['semua'], jam:1.5, wajib:true, kompetensi:['Etika','Privasi','Komunikasi'], prasyarat:[], deskripsi:'Bagaimana bersikap di rumah orang lain: privasi, barang berharga, foto, komunikasi, dan apa yang tidak boleh dilakukan meski diminta pelanggan.',
      modul:[modul('Di rumah pelanggan', [bacaan('Sepuluh aturan yang tidak bisa ditawar', '1. Foto hanya area kerja, tidak pernah orang atau dokumen.\n2. Tidak membuka laci, lemari, atau tas kecuali diminta dan disaksikan.\n3. Barang berharga yang ditemukan difoto dan dilaporkan, tidak dipindahkan.\n4. Tidak menerima pekerjaan di luar aplikasi — jaminan dan asuransi hilang.\n5. Tidak membagikan alamat atau kebiasaan pelanggan kepada siapa pun.\n6. Nomor pelanggan hanya dipakai lewat aplikasi selama job.\n7. Tidak merokok, tidak memakai perangkat pelanggan.\n8. Menolak dengan sopan permintaan yang melanggar SOP dan melapor.\n9. Anak dan hewan peliharaan bukan tanggung jawab Anda kecuali layanan pengasuhan.\n10. Bila terjadi kerusakan, laporkan dalam 5 menit lewat aplikasi — kejujuran tidak pernah dihukum, menyembunyikan selalu.', 8)],
        { soal:[soal('Anda menemukan perhiasan di bawah sofa. Yang benar?', ['Simpan di meja dan lanjut kerja','Foto di tempat, laporkan lewat aplikasi, jangan dipindahkan','Bawa ke supervisor','Berikan ke tetangga'], 1), soal('Pelanggan menawarkan job langsung tanpa aplikasi dengan harga lebih tinggi. Sikap Anda?', ['Terima bila pelanggan lama','Tolak dengan sopan; jaminan dan asuransi hanya berlaku lewat aplikasi','Terima tapi tetap lapor','Minta pendapat pelanggan lain'], 1), soal('Foto yang boleh diambil di lokasi adalah…', ['Seluruh ruangan termasuk penghuni','Hanya area kerja sebelum–sesudah','Dokumen di meja untuk bukti','Apa saja asal tidak diunggah'], 1)] })] };
    var gc = { kode:'LMS-101', judul:'SOP General Cleaning D-001', level:'dasar', target:['cleaner'], jam:3, wajib:true, kompetensi:['Urutan kerja','Kode warna','Foto bukti'], prasyarat:['LMS-001'], deskripsi:'Menjalankan SOP D-001 langkah demi langkah: kode warna lap dan ember, urutan atas ke bawah, dapur dan kamar mandi, foto sebelum–sesudah yang diterima sistem.',
      modul:[modul('Kode warna & urutan', [bacaan('Kode warna EXOCLEAN', 'Biru: area umum dan kaca. Merah: toilet dan urinal. Hijau: dapur dan area makan. Kuning: kamar mandi selain kloset.\n\nLap merah tidak pernah menyentuh dapur — pelanggaran ini adalah alasan keluhan kontaminasi paling sering.\n\nUrutan: kering sebelum basah, atas sebelum bawah, dalam sebelum luar, lantai paling akhir.', 6), video('Video: dusting atas ke bawah', '', 6)],
        { soal:[soal('Lap warna apa untuk toilet?', ['Biru','Merah','Hijau','Kuning'], 1), soal('Urutan yang benar…', ['Lantai dulu supaya tidak diinjak','Kering sebelum basah, atas sebelum bawah, lantai terakhir','Basah dulu supaya cepat kering','Bebas sesuai kebiasaan'], 1)] }),
        modul('Foto bukti yang diterima sistem', [bacaan('Sebelum–sesudah yang sah', 'Foto sebelum diambil dari titik yang sama dengan foto sesudah, dengan pencahayaan cukup, tanpa orang. Sistem menolak checklist yang ditutup tanpa dua foto pada langkah berlabel kamera.\n\nJam dan lokasi terekam otomatis; jangan memotret dari luar ruangan.', 4)],
        { soal:[soal('Checklist langkah berkamera bisa ditutup bila…', ['Ada satu foto sesudah','Ada foto sebelum dan sesudah dari titik yang sama','Supervisor menelepon','Pelanggan bilang cukup'], 1)] })] };
    var chem = { kode:'LMS-102', judul:'Penanganan chemical & tumpahan (B-006)', level:'menengah', target:['cleaner','supervisor'], jam:2, wajib:false, kompetensi:['MSDS','Tumpahan','Limbah B3'], prasyarat:['LMS-001'], deskripsi:'Membaca lembar data keselamatan, mengelola tumpahan kecil, dan memilah limbah B3 sesuai B-003.',
      modul:[modul('Tumpahan kecil', [bacaan('Tiga langkah tumpahan', 'Isolasi (pasang rambu, jauhkan orang), serap (pasir/kain khusus, bukan tisu), buang sebagai B3 dalam kantong berlabel. Tumpahan lebih dari 1 liter atau bau menyengat: keluar dari ruangan dan hubungi supervisor.', 5)],
        { soal:[soal('Tumpahan 2 liter degreaser di ruang tertutup. Anda…', ['Serap sendiri secepatnya','Keluar, pastikan ventilasi, hubungi supervisor','Siram dengan air','Tunggu kering'], 1), soal('Kain bekas menyerap chemical dibuang ke…', ['Sampah dapur pelanggan','Kantong B3 berlabel sesuai B-003','Wastafel','Dibawa pulang'], 1)] })] };
    var ac = { kode:'LMS-201', judul:'Servis & cuci AC (D-014)', level:'menengah', target:['teknisi'], jam:4, wajib:true, kompetensi:['Listrik','Evaporator','Uji suhu'], prasyarat:['LMS-001'], deskripsi:'Prosedur aman cuci indoor–outdoor, uji suhu dan arus, serta kapan menolak pekerjaan (freon, kompresor) yang bukan lingkup cuci.',
      modul:[modul('Sebelum menyentuh unit', [bacaan('Matikan, ukur, tutup', 'MCB dimatikan dan diverifikasi dengan tespen sebelum cover dibuka. Cover bag dipasang penuh; cipratan ke PCB adalah kerusakan paling mahal yang bisa Anda sebabkan.\n\nFoto filter dan coil sebelum dicuci — itu bukti kondisi awal untuk klaim.', 5)],
        { soal:[soal('Sebelum membuka cover indoor…', ['Cukup matikan remote','Matikan MCB dan verifikasi dengan tespen','Semprot dulu','Minta pelanggan menjaga'], 1), soal('Pelanggan minta isi freon. Anda…', ['Isi bila ada tabung','Tolak; bukan lingkup cuci, buat catatan temuan untuk survei teknisi','Coba sedikit','Kenakan biaya tambahan'], 1)] })] };
    var sup = { kode:'LMS-301', judul:'Supervisi lapangan & inspeksi kualitas (A-011)', level:'lanjutan', target:['supervisor'], jam:5, wajib:true, kompetensi:['Inspeksi','Umpan balik','Laporan'], prasyarat:['LMS-101','LMS-102'], deskripsi:'Menilai hasil kerja dengan skor terstandar, memberi umpan balik yang mengubah perilaku, dan menutup temuan dengan tindakan koreksi H-008.',
      modul:[modul('Inspeksi berskor', [bacaan('Skor 1–5 yang konsisten', 'Nilai per area, bukan per orang. 5 = tidak ada temuan; 4 = temuan kosmetik; 3 = satu langkah SOP terlewat; 2 = kontaminasi kode warna atau foto tidak sah; 1 = risiko keselamatan.\n\nSkor di bawah 3 wajib disertai foto dan tindakan koreksi dengan tenggat.', 6)],
        { soal:[soal('Lap merah dipakai di dapur. Skor area?', ['5','4','2','1'], 2), soal('Skor di bawah 3 wajib…', ['Dibicarakan lisan saja','Disertai foto dan tindakan koreksi bertenggat (H-008)','Dikurangi upah','Diabaikan bila pelanggan puas'], 1)] })] };
    var cs = { kode:'LMS-401', judul:'Layanan pelanggan & penanganan keluhan (A-008)', level:'dasar', target:['staf','supervisor'], jam:2, wajib:true, kompetensi:['Empati','SLA 60 detik','Eskalasi'], prasyarat:[], deskripsi:'Balasan pertama di bawah 60 detik, pemilik dan tenggat untuk setiap kasus, kapan mengeskalasi ke S1/S2, dan kalimat yang tidak boleh dipakai.',
      modul:[modul('Enam puluh detik pertama', [bacaan('Janji yang kita jual', 'Setiap keluhan mendapat manusia bernama dan tenggat bertanggal dalam 60 detik. Kalimat pertama: nama Anda, pengakuan masalah, apa yang Anda lakukan sekarang. Bukan "mohon maaf atas ketidaknyamanannya".\n\nS1 (keselamatan, pencurian): eskalasi segera ke super admin. S2 (kerusakan, uang): claims lead dalam 5 menit.', 5)],
        { soal:[soal('Pelanggan melaporkan meja kaca retak. Kategori?', ['S3','S2 — kerusakan/uang, eskalasi 5 menit ke claims lead','S1','Bukan keluhan'], 1), soal('Batas balasan pertama adalah…', ['24 jam','1 jam','60 detik','Hari kerja berikutnya'], 2)] })] };
    var jalur = [
      { kode:'JALUR-CLEANER', judul:'Jalur Cleaner Bersertifikat', target:'cleaner', kursus:['LMS-001','LMS-002','LMS-101','LMS-102'], deskripsi:'Empat kursus dari K3 sampai chemical. Selesai = badge Cleaner Bersertifikat di profil pelanggan.' },
      { kode:'JALUR-TEKNISI', judul:'Jalur Teknisi AC', target:'teknisi', kursus:['LMS-001','LMS-002','LMS-201'], deskripsi:'K3, etika, dan D-014 sebelum menerima job AC.' },
      { kode:'JALUR-SUPERVISOR', judul:'Jalur Supervisor Lapangan', target:'supervisor', kursus:['LMS-001','LMS-002','LMS-101','LMS-102','LMS-301'], deskripsi:'Semua kursus cleaner ditambah inspeksi kualitas.' },
      { kode:'JALUR-STAF', judul:'Jalur Staf Kantor', target:'staf', kursus:['LMS-002','LMS-401'], deskripsi:'Etika data pelanggan dan penanganan keluhan.' }
    ];
    return { kursus:[k3, etik, gc, chem, ac, sup, cs], jalur:jalur };
  }
  function semai() {
    var d = db(); if (!d || d.all('kursus').length) return false;
    var b = BENIH(), peta = {};
    b.kursus.forEach(function (k) { var r = d.insert('kursus', Object.assign({ status:'terbit', rev:1, terbitAt:kini(), oleh:'Rancangan', masaBerlakuBulan:24 }, k)); peta[k.kode] = r.id; });
    b.jalur.forEach(function (j) { d.insert('jalur', Object.assign({}, j, { kursusIds:j.kursus.map(function (kd) { return peta[kd]; }) })); });
    terbitkanSemua(); return true;
  }

  /* ------------------------------------------------------------ katalog materi terbuka (exo-lms-katalog.js) */
  function perbaruiKatalog() {
    var d = db(), K = window.EXO_LMS_KATALOG; if (!d || !K) return false;
    var rev = Number(d.setting('lmsKatalogRev') || 0); if (rev >= K.rev) return false;
    var b = K.bangun({ video:video, bacaan:bacaan, tautan:tautan, modul:modul, soal:soal }), ada = {}, n = 0;
    d.all('kursus').forEach(function (k) { ada[k.kode] = k; });
    b.kursus.forEach(function (k) { if (ada[k.kode]) return; var r = d.insert('kursus', Object.assign({ status:'terbit', rev:1, terbitAt:kini(), oleh:'Katalog terbuka', masaBerlakuBulan:24, katalogRev:K.rev }, k)); ada[k.kode] = r; n++; });
    Object.keys(b.tambahModul).forEach(function (kode) { var k = ada[kode]; if (!k || (k.katalogRev || 0) >= K.rev) return; d.update('kursus', k.id, { modul:(k.modul || []).concat(b.tambahModul[kode]), katalogRev:K.rev, rev:(k.rev || 1) + 1 }); n++; });
    var semuaJalur = d.all('jalur'), petaJalur = {}; semuaJalur.forEach(function (j) { petaJalur[j.kode] = j; });
    Object.keys(b.jalur).forEach(function (kode) { var j = petaJalur[kode]; if (!j) return; var kursusKode = (j.kursus || []).slice(); b.jalur[kode].forEach(function (kd) { if (kursusKode.indexOf(kd) < 0 && ada[kd]) kursusKode.push(kd); }); d.update('jalur', j.id, { kursus:kursusKode, kursusIds:kursusKode.map(function (kd) { return ada[kd] && ada[kd].id; }).filter(Boolean) }); });
    b.jalurBaru.forEach(function (j) { if (petaJalur[j.kode]) return; d.insert('jalur', Object.assign({}, j, { kursusIds:j.kursus.map(function (kd) { return ada[kd] && ada[kd].id; }).filter(Boolean) })); });
    d.setting('lmsKatalogRev', K.rev); terbitkanSemua();
    if (d.log) d.log(null, 'Katalog materi LMS rev ' + K.rev + ' diterapkan (' + n + ' kursus baru/diperkaya)', 'lms', '');
    return true;
  }

  /* ------------------------------------------------------------ SOP → kursus wajib (exo-lms-sop.js) */
  var sopSinkronKunci = '';
  function sinkronSop(paksa) {
    var d = db(); if (!d || !window.EXO_LMS_SOP || !window.EXO_SOP) return 0;
    var kunci = EXO_SOP.semua().map(function (s) { return s.code + ':' + (s.rev || 0); }).join(',');
    if (!paksa && kunci === sopSinkronKunci) return 0;
    var n = EXO_LMS_SOP.sinkron({ bahan:{ video:video, bacaan:bacaan, tautan:tautan, modul:modul, soal:soal } }, d);
    sopSinkronKunci = kunci; if (n) terbitkanSemua(); return n;
  }

  /* ------------------------------------------------------------ katalog */
  function semuaKursus() { var d = db(); if (d) { semai(); perbaruiKatalog(); sinkronSop(); } return d ? d.all('kursus') : []; }
  function kursus(id) { var d = db(); return d ? d.find('kursus', id) : null; }
  function kursusKode(kode) { return semuaKursus().filter(function (k) { return k.kode === kode; })[0] || null; }
  function jalur() { var d = db(); if (d) { semai(); perbaruiKatalog(); sinkronSop(); } return d ? d.all('jalur') : []; }
  /* yang tayang ke peserta: terbitan (pub) bila ada, kalau tidak kursus berstatus terbit */
  function katalog() { var p = bacaPub().lms; if (p && p.kursus) return p.kursus; return semuaKursus().filter(function (k) { return k.status === 'terbit'; }); }
  function terbitkanSemua() { var p = bacaPub(); p.lms = { kursus:semuaKursus().filter(function (k) { return k.status === 'terbit'; }).map(salin), jalur:jalur().map(salin), at:kini() }; tulisPub(p); }
  function terbitkan(id, oleh) { var d = db(), k = d.find('kursus', id); if (!k) throw new Error('Kursus tidak ditemukan'); if (!k.modul || !k.modul.length) throw new Error('Kursus belum punya modul'); d.update('kursus', id, { status:'terbit', rev:(k.rev || 0) + 1, terbitAt:kini(), oleh:oleh ? oleh.nama : '' }); terbitkanSemua(); return d.find('kursus', id); }
  function tarik(id, oleh) { var d = db(); d.update('kursus', id, { status:'draf', ditarikAt:kini(), oleh:oleh ? oleh.nama : '' }); terbitkanSemua(); }
  function simpan(isi) { var d = db(); if (isi.id && d.find('kursus', isi.id)) return d.update('kursus', isi.id, Object.assign({}, isi, { status:d.find('kursus', isi.id).status === 'terbit' ? 'terbit-draf' : 'draf' })); return d.insert('kursus', Object.assign({ status:'draf', rev:0 }, isi)); }
  function periksa(k) {
    var g = [];
    if (!k.kode || !/^(SOP-)?[A-Z]{1,5}-\d{3}$/.test(k.kode)) g.push('Kode berpola LMS-001 atau SOP-D-001.');
    if (!k.judul || k.judul.trim().length < 5) g.push('Judul minimal 5 karakter.');
    if (!k.modul || !k.modul.length) g.push('Minimal satu modul.');
    (k.modul || []).forEach(function (m, i) {
      if (!m.judul) g.push('Modul ' + (i + 1) + ' belum berjudul.');
      if (!m.materi || !m.materi.length) g.push('Modul ' + (i + 1) + ' belum punya materi.');
      (m.materi || []).forEach(function (t, j) { if (!t.judul) g.push('Materi ' + (i + 1) + '.' + (j + 1) + ' belum berjudul.'); if (t.jenis === 'bacaan' && !t.isi) g.push('Materi ' + (i + 1) + '.' + (j + 1) + ' bacaan kosong.'); });
      if (m.kuis) { if (!m.kuis.soal || !m.kuis.soal.length) g.push('Kuis modul ' + (i + 1) + ' belum punya soal.'); (m.kuis.soal || []).forEach(function (s, q) { if (!s.tanya) g.push('Soal ' + (i + 1) + '.' + (q + 1) + ' kosong.'); if (!s.pilihan || s.pilihan.filter(Boolean).length < 2) g.push('Soal ' + (i + 1) + '.' + (q + 1) + ' butuh ≥ 2 pilihan.'); if (s.jawaban == null || !s.pilihan || !s.pilihan[s.jawaban]) g.push('Soal ' + (i + 1) + '.' + (q + 1) + ' belum punya jawaban benar.'); }); }
    });
    return g;
  }

  /* ------------------------------------------------------------ peserta & progres */
  function pendaftaran(userId, kursusId) { var d = db(); return d ? d.first('pendaftaran', { userId:userId, kursusId:kursusId }) : null; }
  function daftar(userId, kursusId) { var d = db(), ada = pendaftaran(userId, kursusId); if (ada) return ada; return d.insert('pendaftaran', { userId:userId, kursusId:kursusId, materiSelesai:[], kuis:{}, status:'berjalan', mulaiAt:kini(), selesaiAt:null, nilaiAkhir:null }); }
  function hitung(k, p) {
    var materi = 0, materiOk = 0, kuisN = 0, kuisOk = 0, skor = [];
    (k.modul || []).forEach(function (m) { (m.materi || []).forEach(function (t) { materi++; if (p && p.materiSelesai.indexOf(t.id) >= 0) materiOk++; }); if (m.kuis) { kuisN++; var r = p && p.kuis[m.id]; if (r && r.lulus) { kuisOk++; skor.push(r.skor); } } });
    var total = materi + kuisN, done = materiOk + kuisOk;
    return { materi:materi, materiOk:materiOk, kuis:kuisN, kuisOk:kuisOk, persen:total ? Math.round(done / total * 100) : 0, selesai:total > 0 && done === total, nilai:skor.length ? Math.round(skor.reduce(function (a, b) { return a + b; }, 0) / skor.length) : null };
  }
  function progres(userId, kursusId) { var k = kursus(kursusId) || katalog().filter(function (x) { return x.id === kursusId; })[0]; if (!k) return null; return Object.assign({ status:(pendaftaran(userId, kursusId) || {}).status || 'belum' }, hitung(k, pendaftaran(userId, kursusId))); }
  function terkunci(userId, k) {
    var pra = (k.prasyarat || []).map(function (kd) { return kursusKode(kd); }).filter(Boolean);
    var belum = pra.filter(function (x) { var p = pendaftaran(userId, x.id); return !(p && p.status === 'selesai'); });
    return belum.length ? belum : null;
  }
  function tandaiMateri(userId, kursusId, materiId) { var d = db(), p = daftar(userId, kursusId); if (p.materiSelesai.indexOf(materiId) < 0) { p.materiSelesai.push(materiId); d.update('pendaftaran', p.id, { materiSelesai:p.materiSelesai }); } return cekSelesai(userId, kursusId); }
  /* Nilai kuis: jawaban = { soalId: indeksPilihan } */
  function nilaiKuis(userId, kursusId, modulId, jawaban) {
    var d = db(), k = kursus(kursusId), m = (k.modul || []).filter(function (x) { return x.id === modulId; })[0]; if (!m || !m.kuis) throw new Error('Kuis tidak ditemukan');
    var p = daftar(userId, kursusId), r = p.kuis[modulId] || { percobaan:0, lulus:false, skor:0, riwayat:[] };
    if (r.lulus) return Object.assign({ sudahLulus:true }, r);
    if (r.percobaan >= (m.kuis.maksPercobaan || 3)) return Object.assign({ habis:true }, r);
    var benar = 0, rinci = m.kuis.soal.map(function (s) { var ok = jawaban[s.id] === s.jawaban; if (ok) benar++; return { soalId:s.id, benar:ok, jawaban:jawaban[s.id], kunci:s.jawaban, penjelasan:s.penjelasan || '' }; });
    var skor = Math.round(benar / m.kuis.soal.length * 100), lulus = skor >= (m.kuis.lulus || 80);
    r = { percobaan:r.percobaan + 1, lulus:lulus, skor:Math.max(skor, r.skor || 0), skorTerakhir:skor, at:kini(), riwayat:(r.riwayat || []).concat([skor]).slice(-5) };
    p.kuis[modulId] = r; d.update('pendaftaran', p.id, { kuis:p.kuis });
    var selesai = cekSelesai(userId, kursusId);
    return Object.assign({ rinci:rinci, benar:benar, total:m.kuis.soal.length, sisa:Math.max(0, (m.kuis.maksPercobaan || 3) - r.percobaan), kursusSelesai:selesai }, r);
  }
  function cekSelesai(userId, kursusId) {
    var d = db(), k = kursus(kursusId), p = pendaftaran(userId, kursusId); if (!k || !p || p.status === 'selesai') return false;
    var h = hitung(k, p); if (!h.selesai) return false;
    var hingga = new Date(); hingga.setMonth(hingga.getMonth() + (k.masaBerlakuBulan || 24));
    var no = (window.EXO_UTIL && EXO_UTIL.docNo) ? EXO_UTIL.docNo('CERT', d.nextNo('sertifikat')) : 'CERT-' + Date.now();
    var s = d.insert('sertifikat', { no:no, userId:userId, kursusId:kursusId, judul:k.judul, jenis:'kursus', nilai:h.nilai, terbitAt:kini(), berlakuHingga:hingga.toISOString().slice(0, 10), kode:no.replace(/\W/g, '').slice(-8), sumber:'lms' });
    d.update('pendaftaran', p.id, { status:'selesai', selesaiAt:kini(), nilaiAkhir:h.nilai, sertifikatId:s.id });
    if (d.log) d.log(userId, 'Menyelesaikan kursus ' + k.kode + ' · nilai ' + h.nilai, 'lms', kursusId);
    return true;
  }
  /* kursus yang relevan untuk peserta: target memuat fungsinya atau 'semua' */
  function untukPeserta(u) { var f = fungsiDari(u); return katalog().filter(function (k) { return (k.target || []).indexOf('semua') >= 0 || (k.target || []).indexOf(f) >= 0; }); }
  function jalurUntuk(u) { var f = fungsiDari(u), p = bacaPub().lms; var semuaJalur = p && p.jalur ? p.jalur : jalur(); return semuaJalur.filter(function (j) { return j.target === f; })[0] || null; }
  function wajibBelum(u) { return untukPeserta(u).filter(function (k) { return k.wajib && !((pendaftaran(u.id, k.id) || {}).status === 'selesai'); }); }
  function sertifikatPeserta(userId) { var d = db(); return d ? d.where('sertifikat', function (s) { return s.userId === userId; }) : []; }
  /* statistik admin */
  function statistik() {
    var d = db(), semua = semuaKursus(), pd = d ? d.all('pendaftaran') : [], selesai = pd.filter(function (p) { return p.status === 'selesai'; });
    var nilai = selesai.map(function (p) { return p.nilaiAkhir || 0; });
    var perKursus = semua.map(function (k) { var x = pd.filter(function (p) { return p.kursusId === k.id; }), s = x.filter(function (p) { return p.status === 'selesai'; }); return { id:k.id, kode:k.kode, judul:k.judul, level:k.level, status:k.status, wajib:!!k.wajib, peserta:x.length, selesai:s.length, rerata:s.length ? Math.round(s.reduce(function (n, p) { return n + (p.nilaiAkhir || 0); }, 0) / s.length) : null, modul:(k.modul || []).length, soal:(k.modul || []).reduce(function (n, m) { return n + (m.kuis ? m.kuis.soal.length : 0); }, 0) }; });
    return { kursus:semua.length, terbit:semua.filter(function (k) { return k.status === 'terbit'; }).length, peserta:pd.length, berjalan:pd.length - selesai.length, selesai:selesai.length, tingkatSelesai:pd.length ? Math.round(selesai.length / pd.length * 100) : 0, rerata:nilai.length ? Math.round(nilai.reduce(function (a, b) { return a + b; }, 0) / nilai.length) : null, perKursus:perKursus };
  }
  function pesertaSemua() { var d = db(); if (!d) return []; var byUser = {}; d.all('pendaftaran').forEach(function (p) { var u = d.find('users', p.userId); var k = d.find('kursus', p.kursusId); var s = byUser[p.userId] = byUser[p.userId] || { userId:p.userId, nama:u ? u.nama : p.userId, fungsi:namaFungsi(fungsiDari(u)), kursus:[] }; s.kursus.push({ kode:k ? k.kode : '?', judul:k ? k.judul : '?', status:p.status, persen:k ? hitung(k, p).persen : 0, nilai:p.nilaiAkhir }); }); return Object.keys(byUser).map(function (k) { return byUser[k]; }); }

  return { LEVEL:LEVEL, FUNGSI:FUNGSI, namaLevel:namaLevel, namaFungsi:namaFungsi, fungsiDari:fungsiDari, semai:semai, perbaruiKatalog:perbaruiKatalog, sinkronSop:sinkronSop, bahan:{ video:video, bacaan:bacaan, tautan:tautan, modul:modul, soal:soal }, semuaKursus:semuaKursus, kursus:kursus, kursusKode:kursusKode, jalur:jalur, katalog:katalog, terbitkanSemua:terbitkanSemua, terbitkan:terbitkan, tarik:tarik, simpan:simpan, periksa:periksa,
    pendaftaran:pendaftaran, daftar:daftar, progres:progres, terkunci:terkunci, tandaiMateri:tandaiMateri, nilaiKuis:nilaiKuis, untukPeserta:untukPeserta, jalurUntuk:jalurUntuk, wajibBelum:wajibBelum, sertifikatPeserta:sertifikatPeserta, statistik:statistik, pesertaSemua:pesertaSemua, uid:uid };
})();
