/* ==========================================================================
   lms.js — pembelajaran & sertifikasi mitra
   --------------------------------------------------------------------------
   Tenaga kerja lapangan EXOCLEAN adalah MITRA yang mendaftar sendiri lewat
   aplikasi. Sebelum boleh ditugaskan ke pekerjaan, mereka harus melewati lima
   gerbang berikut — semuanya dihitung ulang dari data, bukan status yang
   ditulis manual, sehingga tidak bisa "lompat" tanpa memenuhi syaratnya.

       1. Menyetujui Syarat & Ketentuan Mitra   (checklist per butir)
       2. Melengkapi berkas kepegawaian          (BIZ.kelengkapanBerkas)
       3. Menyelesaikan seluruh kursus wajib     (materi + kuis)
       4. Lulus Ujian Sertifikasi Mitra          (nilai >= KKM)
       5. Disetujui admin                        (verifikasi berkas + approve)

   Sertifikat yang terbit otomatis muncul di halaman Profil mitra.
   ========================================================================== */
var LMS = (function () {

  var KKM_DEFAULT = 80;          /* nilai minimum kelulusan kuis & ujian */
  var VERSI_SK = '2026.1';       /* versi dokumen Syarat & Ketentuan Mitra */

  /* ================================================================ KURSUS */
  function kursus(id) { return DB.find('kursus', id); }
  function semuaKursus() { return U.sortBy(DB.where('kursus', { aktif: true }), function (k) { return k.urutan; }); }
  function kursusWajib() { return semuaKursus().filter(function (k) { return k.wajib; }); }
  function kursusPilihan() { return semuaKursus().filter(function (k) { return !k.wajib; }); }

  /* ================================================================ PROGRES */
  function progres(userId, kursusId) {
    return DB.where('lmsProgres', function (p) {
      return p.userId === userId && p.kursusId === kursusId; })[0] || null;
  }
  function progresAtauBuat(userId, kursusId) {
    var p = progres(userId, kursusId);
    if (p) return p;
    return DB.insert('lmsProgres', { userId: userId, kursusId: kursusId, status: 'berjalan',
      materiSelesai: [], percobaan: [], nilaiTerbaik: null, mulaiAt: U.nowISO(), selesaiAt: null });
  }
  function progresSaya(userId) { return DB.where('lmsProgres', { userId: userId }); }

  /** Tandai satu halaman materi sudah dibaca. */
  function tandaiMateri(userId, kursusId, idx) {
    var p = progresAtauBuat(userId, kursusId);
    var m = (p.materiSelesai || []).slice();
    if (m.indexOf(idx) < 0) m.push(idx);
    DB.update('lmsProgres', p.id, { materiSelesai: m });
    return DB.find('lmsProgres', p.id);
  }

  function materiTuntas(userId, kursusId) {
    var k = kursus(kursusId), p = progres(userId, kursusId);
    if (!k) return false;
    return !!p && (p.materiSelesai || []).length >= (k.materi || []).length;
  }

  function lulusKursus(userId, kursusId) {
    var k = kursus(kursusId), p = progres(userId, kursusId);
    if (!k || !p || p.nilaiTerbaik === null) return false;
    return p.nilaiTerbaik >= (k.nilaiMin || KKM_DEFAULT);
  }

  /** Persentase penyelesaian satu kursus: materi dibaca + status kuis. */
  function persenKursus(userId, kursusId) {
    var k = kursus(kursusId);
    if (!k) return 0;
    var p = progres(userId, kursusId);
    var totalMateri = (k.materi || []).length;
    var bacaan = p ? Math.min(totalMateri, (p.materiSelesai || []).length) : 0;
    /* materi 70%, kuis 30% */
    var pct = totalMateri ? (bacaan / totalMateri) * 70 : 70;
    if (lulusKursus(userId, kursusId)) pct = 100;
    return Math.round(pct);
  }

  /* ================================================================ KUIS */
  /**
   * Nilai satu percobaan kuis.
   * @param jawaban array indeks pilihan, sejajar dengan k.kuis
   */
  function nilaiKuis(kursusId, jawaban) {
    var k = kursus(kursusId);
    var soal = (k && k.kuis) || [];
    var rinci = soal.map(function (s, i) {
      var pilih = jawaban[i];
      return { soal: s.soal, pilih: pilih, benar: s.jawaban, tepat: pilih === s.jawaban,
        opsi: s.opsi, pembahasan: s.pembahasan };
    });
    var benar = rinci.filter(function (r) { return r.tepat; }).length;
    return { benar: benar, total: soal.length,
      nilai: soal.length ? Math.round(benar / soal.length * 100) : 0, rinci: rinci };
  }

  /** Simpan hasil percobaan; terbitkan sertifikat kursus bila lulus. */
  function kirimKuis(userId, kursusId, jawaban) {
    var k = kursus(kursusId);
    var hasil = nilaiKuis(kursusId, jawaban);
    var lulus = hasil.nilai >= (k.nilaiMin || KKM_DEFAULT);
    var p = progresAtauBuat(userId, kursusId);
    var percobaan = (p.percobaan || []).concat([{ at: U.nowISO(), nilai: hasil.nilai,
      benar: hasil.benar, total: hasil.total, lulus: lulus }]);
    var terbaik = Math.max(p.nilaiTerbaik === null ? -1 : p.nilaiTerbaik, hasil.nilai);

    DB.update('lmsProgres', p.id, { percobaan: percobaan, nilaiTerbaik: terbaik,
      status: lulus ? 'selesai' : 'berjalan', selesaiAt: lulus ? (p.selesaiAt || U.nowISO()) : null });

    if (lulus && k.sertifikat !== false) terbitkanSertifikat(userId, kursusId);
    DB.log(userId, 'Mengerjakan kuis ' + k.judul + ' — nilai ' + hasil.nilai +
      (lulus ? ' (lulus)' : ' ' + I18N.t('(belum lulus)')), 'kursus', kursusId);

    /* semua kursus wajib beres → sertifikat mitra otomatis terbit */
    if (lulus) cekSertifikatMitra(userId);
    return Object.assign(hasil, { lulus: lulus, nilaiMin: k.nilaiMin || KKM_DEFAULT,
      percobaanKe: percobaan.length });
  }

  function percobaanTerakhir(userId, kursusId) {
    var p = progres(userId, kursusId);
    if (!p || !(p.percobaan || []).length) return null;
    return p.percobaan[p.percobaan.length - 1];
  }

  /* ================================================================ SERTIFIKAT */
  function kodeVerifikasi(seed) {
    var h = 5381;
    for (var i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    var abjad = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var j = 0; j < 8; j++) { s += abjad[h % abjad.length]; h = Math.floor(h / abjad.length) + j * 7919; }
    return s.slice(0, 4) + '-' + s.slice(4);
  }

  function sertifikatSaya(userId) {
    return U.sortBy(DB.where('sertifikat', { userId: userId }), function (s) { return s.terbitAt; }, true);
  }
  function punyaSertifikat(userId, kursusId) {
    return DB.where('sertifikat', function (s) {
      return s.userId === userId && s.kursusId === kursusId; })[0] || null;
  }

  function terbitkanSertifikat(userId, kursusId) {
    var ada = punyaSertifikat(userId, kursusId);
    var k = kursusId === 'MITRA' ? null : kursus(kursusId);
    var p = kursusId === 'MITRA' ? null : progres(userId, kursusId);
    var nilai = kursusId === 'MITRA' ? nilaiRataWajib(userId) : (p ? p.nilaiTerbaik : 0);

    if (ada) {   /* sudah punya — perbarui nilainya bila mengulang dengan hasil lebih baik */
      if (nilai > ada.nilai) DB.update('sertifikat', ada.id, { nilai: nilai });
      return DB.find('sertifikat', ada.id);
    }

    var no = U.docNo('CERT', DB.nextNo('sertifikat'));
    var s = DB.insert('sertifikat', {
      no: no, userId: userId, kursusId: kursusId,
      judul: k ? k.judul : I18N.t('Mitra Tersertifikasi EXOCLEAN'),
      jenis: kursusId === 'MITRA' ? 'mitra' : (k && k.wajib ? 'wajib' : 'spesialisasi'),
      nilai: nilai, terbitAt: U.nowISO(),
      berlakuHingga: U.iso(U.addDays(new Date(), (k && k.masaBerlakuHari) || 1095)),
      kode: kodeVerifikasi(userId + '|' + kursusId + '|' + no)
    });
    DB.log(userId, 'Sertifikat terbit: ' + s.judul, 'sertifikat', s.id);
    return s;
  }

  function sertifikatBerlaku(s) {
    return !s.berlakuHingga || U.diffDays(s.berlakuHingga, new Date()) >= 0;
  }

  /** Rata-rata nilai seluruh kursus wajib. */
  function nilaiRataWajib(userId) {
    var w = kursusWajib();
    if (!w.length) return 0;
    var total = U.sum(w, function (k) {
      var p = progres(userId, k.id);
      return p && p.nilaiTerbaik !== null ? p.nilaiTerbaik : 0;
    });
    return Math.round(total / w.length);
  }

  function semuaWajibLulus(userId) {
    var w = kursusWajib();
    return w.length > 0 && w.every(function (k) { return lulusKursus(userId, k.id); });
  }

  /** Terbitkan sertifikat mitra bila seluruh kursus wajib sudah lulus. */
  function cekSertifikatMitra(userId) {
    if (!semuaWajibLulus(userId)) return null;
    return terbitkanSertifikat(userId, 'MITRA');
  }

  /* ================================================================ SYARAT & KETENTUAN */
  function butirSK() { return (DB.raw.settings && DB.raw.settings.syaratMitra) || []; }
  function versiSK() { return VERSI_SK; }

  function persetujuanSK(u) { return (u && u.persetujuanSK) || null; }
  function sudahSetujuSK(u) {
    var p = persetujuanSK(u);
    return !!p && p.versi === VERSI_SK && (p.butir || []).length >= butirSK().filter(function (b) {
      return b.wajib !== false; }).length;
  }
  function setujuiSK(userId, butirIds) {
    DB.update('users', userId, { persetujuanSK: { versi: VERSI_SK, at: U.nowISO(), butir: butirIds } });
    DB.log(userId, 'Menyetujui Syarat & Ketentuan Mitra versi ' + VERSI_SK, 'user', userId);
    return DB.find('users', userId);
  }

  /* ================================================================ ONBOARDING MITRA */
  /**
   * Lima langkah bergabung. Semuanya dihitung dari data, jadi status mitra
   * tidak bisa maju tanpa syaratnya benar-benar terpenuhi.
   */
  function langkahOnboarding(u) {
    var berkas = BIZ.kelengkapanBerkas(u);
    var wajib = kursusWajib();
    var lulusWajib = wajib.filter(function (k) { return lulusKursus(u.id, k.id); }).length;
    var sertMitra = punyaSertifikat(u.id, 'MITRA');

    return [
      { k: 'sk', ic: '📜', judul: I18N.t('Menyetujui Syarat & Ketentuan Mitra'),
        ket: I18N.t('Baca dan centang seluruh butir ketentuan kemitraan.'),
        selesai: sudahSetujuSK(u), aksi: 'buka-sk', tombol: 'Baca & Setujui' },
      { k: 'berkas', ic: '🆔', judul: 'Melengkapi berkas kemitraan',
        ket: berkas.kurang.length
          ? I18N.t('Belum terisi:') + ' ' + berkas.kurang.map(function (p) { return p.label; }).join(', ')
          : I18N.t('Identitas, kontak darurat, dan alamat tinggal sudah lengkap.'),
        selesai: berkas.kurang.length === 0, aksi: 'ke-berkas', tombol: 'Lengkapi Berkas',
        detail: berkas.lengkap + '/' + berkas.total },
      { k: 'belajar', ic: '📚', judul: I18N.t('Menyelesaikan pembelajaran wajib'),
        ket: lulusWajib + ' dari ' + wajib.length + ' ' + I18N.t('kursus wajib sudah lulus.'),
        selesai: lulusWajib >= wajib.length && wajib.length > 0, aksi: 'ke-belajar',
        tombol: 'Mulai Belajar', detail: lulusWajib + '/' + wajib.length },
      { k: 'sertifikat', ic: '🎓', judul: I18N.t('Lulus sertifikasi mitra'),
        ket: sertMitra
          ? 'Sertifikat terbit ' + U.tgl(sertMitra.terbitAt) + ' ' + I18N.t('dengan nilai') + ' ' + sertMitra.nilai + '.'
          : I18N.t('Sertifikat terbit otomatis setelah seluruh kursus wajib lulus.'),
        selesai: !!sertMitra, aksi: 'ke-belajar', tombol: I18N.t('Lihat Sertifikat') },
      { k: 'approve', ic: '✅', judul: 'Persetujuan admin EXOCLEAN',
        ket: u.statusMitra === 'aktif' ? I18N.t('Anda sudah resmi menjadi mitra aktif.')
          : u.statusMitra === 'ditolak' ? 'Pendaftaran ditolak: ' + (u.alasanTolak || '—')
          : I18N.t('Admin akan memeriksa berkas dan hasil belajar Anda.'),
        selesai: u.statusMitra === 'aktif', aksi: null }
    ];
  }

  function ringkasOnboarding(u) {
    var l = langkahOnboarding(u);
    var selesai = l.filter(function (x) { return x.selesai; }).length;
    return { langkah: l, selesai: selesai, total: l.length,
      pct: Math.round(selesai / l.length * 100),
      berikutnya: l.filter(function (x) { return !x.selesai; })[0] || null };
  }

  /** Siap diajukan ke admin: empat langkah pertama beres. */
  function siapDiverifikasi(u) {
    return langkahOnboarding(u).slice(0, 4).every(function (x) { return x.selesai; });
  }

  /* ================================================================ REKAP ADMIN */
  function rekapMitra() {
    return BIZ.usersByRole('worker').map(function (u) {
      var r = ringkasOnboarding(u);
      return { user: u, ringkas: r, siap: siapDiverifikasi(u),
        nilaiRata: nilaiRataWajib(u.id), sertifikat: sertifikatSaya(u.id) };
    });
  }

  function statistikLMS() {
    var mitra = BIZ.usersByRole('worker');
    var pr = DB.all('lmsProgres');
    return {
      totalMitra: mitra.length,
      aktif: mitra.filter(function (u) { return u.statusMitra === 'aktif'; }).length,
      onboarding: mitra.filter(function (u) { return (u.statusMitra || 'onboarding') === 'onboarding'; }).length,
      siapVerifikasi: mitra.filter(siapDiverifikasi).filter(function (u) {
        return u.statusMitra !== 'aktif'; }).length,
      kursus: semuaKursus().length,
      sertifikatTerbit: DB.all('sertifikat').length,
      percobaan: U.sum(pr, function (p) { return (p.percobaan || []).length; }),
      rataNilai: (function () {
        var n = pr.filter(function (p) { return p.nilaiTerbaik !== null; });
        return n.length ? Math.round(U.sum(n, function (p) { return p.nilaiTerbaik; }) / n.length) : 0;
      })()
    };
  }

  /** Rekap nilai satu kursus untuk seluruh mitra. */
  function rekapKursus(kursusId) {
    var k = kursus(kursusId);
    var rows = BIZ.usersByRole('worker').map(function (u) {
      var p = progres(u.id, kursusId);
      return { user: u, progres: p, nilai: p ? p.nilaiTerbaik : null,
        lulus: lulusKursus(u.id, kursusId), percobaan: p ? (p.percobaan || []).length : 0 };
    });
    var ikut = rows.filter(function (r) { return r.nilai !== null; });
    return { kursus: k, rows: rows, ikut: ikut.length,
      lulus: rows.filter(function (r) { return r.lulus; }).length,
      rata: ikut.length ? Math.round(U.sum(ikut, function (r) { return r.nilai; }) / ikut.length) : 0 };
  }

  return {
    KKM_DEFAULT: KKM_DEFAULT, VERSI_SK: VERSI_SK,
    kursus: kursus, semuaKursus: semuaKursus, kursusWajib: kursusWajib, kursusPilihan: kursusPilihan,
    progres: progres, progresAtauBuat: progresAtauBuat, progresSaya: progresSaya,
    tandaiMateri: tandaiMateri, materiTuntas: materiTuntas, lulusKursus: lulusKursus,
    persenKursus: persenKursus, nilaiKuis: nilaiKuis, kirimKuis: kirimKuis,
    percobaanTerakhir: percobaanTerakhir,
    sertifikatSaya: sertifikatSaya, punyaSertifikat: punyaSertifikat,
    terbitkanSertifikat: terbitkanSertifikat, sertifikatBerlaku: sertifikatBerlaku,
    nilaiRataWajib: nilaiRataWajib, semuaWajibLulus: semuaWajibLulus, cekSertifikatMitra: cekSertifikatMitra,
    butirSK: butirSK, versiSK: versiSK, sudahSetujuSK: sudahSetujuSK, setujuiSK: setujuiSK,
    persetujuanSK: persetujuanSK,
    langkahOnboarding: langkahOnboarding, ringkasOnboarding: ringkasOnboarding,
    siapDiverifikasi: siapDiverifikasi,
    rekapMitra: rekapMitra, statistikLMS: statistikLMS, rekapKursus: rekapKursus
  };
})();
