/* ==========================================================================
   kerja.js — permintaan pekerjaan tambahan (work order)
   --------------------------------------------------------------------------
   LUBANG YANG DITUTUP BERKAS INI

   Sebelumnya MCS hanya punya DUA sumber pekerjaan:

     · jadwal berulang  — pel lobi, buang sampah, sesuai jadwal
     · aduan penghuni   — sesuatu yang sudah terlanjur kotor atau rusak

   Sementara di gedung sungguhan ada jenis ketiga yang jumlahnya besar dan
   justru paling sering DIBAYAR TERPISAH: cuci karpet sebelum acara, poles
   lantai lobi, bersih kaca gedung, tumpahan darurat di basement, persiapan
   ruang rapat direksi, permintaan penyewa lantai tujuh.

   Ketiganya berbeda dan tidak boleh dipaksa masuk ke jalur yang sama:

     jadwal  — SUDAH disepakati, berulang, tidak perlu persetujuan
     aduan   — datang dari penghuni, jam batasnya berjalan sejak masuk
     kerja   — DIMINTA, mungkin perlu disetujui, mungkin ditagih, punya
               perkiraan biaya dan jam kerja

   BEDA PENTING DENGAN ADUAN

   Aduan tidak boleh menunggu persetujuan siapa pun — lantai licin harus
   ditangani sekarang. Pekerjaan tambahan justru sering HARUS menunggu, karena
   ada biayanya. Menyatukan keduanya akan membuat salah satunya salah: aduan
   yang tertahan persetujuan, atau biaya yang keluar tanpa persetujuan.
   ========================================================================== */
window.KERJA = (function () {
  'use strict';

  /* Alur yang disengaja pendek. Setiap tahap tambahan adalah satu tempat lagi
     bagi pekerjaan untuk mengendap tanpa ada yang merasa bertanggung jawab. */
  var STATUS = [
    { kode: 'diminta',   nama: 'Diminta',      ikon: '📥', warna: 'info',
      ket: 'Sudah dicatat, belum diputuskan.' },
    { kode: 'disetujui', nama: 'Disetujui',    ikon: '✅', warna: 'brand',
      ket: 'Boleh dikerjakan. Biayanya sudah diterima.' },
    { kode: 'dikerjakan',nama: 'Dikerjakan',   ikon: '🧹', warna: 'warn',
      ket: 'Petugas sudah ditugaskan dan pekerjaannya berjalan.' },
    { kode: 'selesai',   nama: 'Selesai',      ikon: '🏁', warna: 'ok',
      ket: 'Sudah dikerjakan dan diverifikasi.' },
    { kode: 'ditolak',   nama: 'Ditolak',      ikon: '⛔', warna: 'danger',
      ket: 'Tidak jadi dikerjakan. Alasannya wajib ditulis.' }
  ];
  function status(kode) {
    return STATUS.filter(function (s) { return s.kode === kode; })[0] || STATUS[0];
  }
  var TERBUKA = ['diminta', 'disetujui', 'dikerjakan'];

  /* Jenis pekerjaan yang benar-benar sering diminta di gedung perkantoran.
     Bukan daftar tertutup — ada 'lain' — tetapi daftar yang cukup lengkap
     supaya orang tidak mengetik lima nama berbeda untuk pekerjaan yang sama,
     dan laporannya jadi tidak bisa dijumlahkan. */
  var JENIS = [
    { kode: 'karpet',   nama: 'Cuci karpet',            ikon: '🧶' },
    { kode: 'lantai',   nama: 'Poles / kristalisasi lantai', ikon: '✨' },
    { kode: 'kaca',     nama: 'Cuci kaca',              ikon: '🪟' },
    { kode: 'sofa',     nama: 'Cuci sofa & jok',        ikon: '🛋️' },
    { kode: 'tandon',   nama: 'Kuras tandon air',       ikon: '🚰' },
    { kode: 'saluran',  nama: 'Bersih saluran udara',   ikon: '🌬️' },
    { kode: 'taman',    nama: 'Perawatan taman',        ikon: '🌿' },
    { kode: 'hama',     nama: 'Pengendalian hama',      ikon: '🐜' },
    { kode: 'darurat',  nama: 'Penanganan darurat',     ikon: '🚨' },
    { kode: 'acara',    nama: 'Persiapan / bersih acara', ikon: '🎪' },
    { kode: 'pindahan', nama: 'Bersih setelah pindahan', ikon: '📦' },
    { kode: 'lain',     nama: 'Lainnya',                ikon: '🧰' }
  ];
  function jenis(kode) {
    return JENIS.filter(function (j) { return j.kode === kode; })[0] || JENIS[JENIS.length - 1];
  }

  var ASAL = [
    { kode: 'internal', nama: 'Pengelola gedung' },
    { kode: 'penyewa',  nama: 'Penyewa / penghuni' },
    { kode: 'aduan',    nama: 'Naik dari aduan' }
  ];

  /* --------------------------------------------------------------- baca */

  function semua(korporatId, opsi) {
    opsi = opsi || {};
    var l = DB.where('mcsKerja', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (opsi.status && x.status !== opsi.status) return false;
      if (!opsi.semua && TERBUKA.indexOf(x.status) < 0) return false;
      if (opsi.dari && String(x.diminta).slice(0, 10) < opsi.dari) return false;
      if (opsi.sampai && String(x.diminta).slice(0, 10) > opsi.sampai) return false;
      return true;
    });
    /* Yang jatuh temponya paling dekat naik ke atas — termasuk yang sudah
       lewat. Mengurutkan menurut tanggal masuk membuat pekerjaan yang
       dijanjikan minggu ini tertimbun di bawah permintaan yang baru datang. */
    return l.sort(function (a, b) {
      var ta = TERBUKA.indexOf(a.status) >= 0, tb = TERBUKA.indexOf(b.status) >= 0;
      if (ta !== tb) return ta ? -1 : 1;
      var da = a.target || '9999-12-31', db = b.target || '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return String(b.diminta).localeCompare(String(a.diminta));
    });
  }

  function satu(id) { return DB.find('mcsKerja', id); }

  /* -------------------------------------------------------------- tulis */

  function buat(korporatId, d, oleh) {
    d = d || {};
    if (!String(d.judul || '').trim()) return { error: I18N.t('Judul pekerjaan belum diisi.') };
    if (d.areaId && !MCS.areaSatu(d.areaId)) return { error: I18N.t('Area tidak ditemukan.') };

    var x = DB.insert('mcsKerja', {
      korporatId: korporatId,
      no: nomorKerja(korporatId),
      judul: String(d.judul).trim(),
      jenis: jenis(d.jenis).kode,
      asal: (ASAL.filter(function (a) { return a.kode === d.asal; })[0] || ASAL[0]).kode,
      /* Boleh tanpa area: 'cuci kaca seluruh gedung' bukan milik satu area,
         dan memaksa memilih satu akan membuat orang asal pilih. */
      areaId: d.areaId || null,
      uraian: String(d.uraian || '').trim(),
      /* Tanggal yang DIJANJIKAN, bukan tanggal pengerjaan. Keduanya berbeda
         dan yang dinilai terlambat adalah janjinya. */
      target: d.target || null,
      /* Perkiraan, diisi saat meminta. Biaya sebenarnya diisi saat selesai —
         selisihnya itulah yang berguna, dan ia hilang bila hanya ada satu
         kolom yang ditimpa. */
      perkiraanBiaya: Math.max(0, Math.round(Number(d.perkiraanBiaya) || 0)),
      perkiraanJam: Math.max(0, Number(d.perkiraanJam) || 0),
      biaya: 0, jamKerja: 0,
      pekerjaIds: (d.pekerjaIds || []).slice(),
      status: 'diminta',
      diminta: U.nowISO(),
      dimintaOlehId: oleh ? oleh.id : null,
      dimintaOlehNama: oleh ? oleh.nama : (d.pemintaNama || ''),
      pemintaNama: String(d.pemintaNama || '').trim(),
      pemintaKontak: String(d.pemintaKontak || '').trim(),
      aduanId: d.aduanId || null,
      foto: (d.foto || []).slice(),
      fotoHasil: [],
      /* Riwayat keputusan disimpan, bukan hanya keadaan terakhir. Pekerjaan
         yang ditolak lalu disetujui lagi harus bisa ditelusuri — itu jenis
         perubahan yang paling sering dipertanyakan belakangan. */
      riwayat: [{ status: 'diminta', pada: U.nowISO(),
                  olehNama: oleh ? oleh.nama : '', catatan: '' }],
      catatanTutup: ''
    });
    return { ok: true, kerja: satu(x.id) };
  }

  /** Nomor urut per korporat per tahun — dipakai di surat dan tagihan. */
  function nomorKerja(korporatId) {
    var thn = String(new Date().getFullYear());
    var n = DB.where('mcsKerja', function (x) {
      return x.korporatId === korporatId && String(x.no || '').indexOf('WO-' + thn) === 0;
    }).length + 1;
    return 'WO-' + thn + '-' + String(n).padStart(4, '0');
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Pekerjaan tidak ditemukan.') };
    if (d.judul !== undefined && !String(d.judul).trim()) {
      return { error: I18N.t('Judul pekerjaan belum diisi.') };
    }
    var isi = {};
    ['judul', 'uraian', 'target', 'pemintaNama', 'pemintaKontak'].forEach(function (k) {
      if (d[k] !== undefined) isi[k] = String(d[k] || '').trim();
    });
    if (d.jenis !== undefined) isi.jenis = jenis(d.jenis).kode;
    if (d.areaId !== undefined) isi.areaId = d.areaId || null;
    if (d.perkiraanBiaya !== undefined) isi.perkiraanBiaya = Math.max(0, Math.round(Number(d.perkiraanBiaya) || 0));
    if (d.perkiraanJam !== undefined) isi.perkiraanJam = Math.max(0, Number(d.perkiraanJam) || 0);
    if (d.pekerjaIds !== undefined) isi.pekerjaIds = (d.pekerjaIds || []).slice();
    DB.update('mcsKerja', id, isi);
    return { ok: true };
  }

  /**
   * Pindah tahap.
   *
   * Alurnya dijaga maju: 'selesai' tidak bisa langsung dari 'diminta' tanpa
   * melewati persetujuan. Bukan birokrasi — melompatinya berarti ada biaya
   * yang sudah keluar tanpa seorang pun menyetujuinya, dan itu baru ketahuan
   * saat tagihannya datang.
   */
  var LANJUT = {
    diminta:    ['disetujui', 'ditolak'],
    disetujui:  ['dikerjakan', 'ditolak'],
    dikerjakan: ['selesai', 'ditolak'],
    selesai:    [],
    ditolak:    ['diminta']
  };

  function ubahStatus(id, baru, oleh, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Pekerjaan tidak ditemukan.') };
    d = d || {};
    if (x.status === baru) return { ok: true };
    if ((LANJUT[x.status] || []).indexOf(baru) < 0) {
      return { error: I18N.t('Tahap {dari} tidak bisa langsung menjadi {ke}.')
        .replace('{dari}', I18N.t(status(x.status).nama))
        .replace('{ke}', I18N.t(status(baru).nama)) };
    }
    /* Penolakan WAJIB beralasan. Pekerjaan yang ditolak tanpa keterangan akan
       diminta ulang bulan depan oleh orang yang sama, dan ditolak lagi. */
    if (baru === 'ditolak' && !String(d.catatan || '').trim()) {
      return { error: I18N.t('Tulis alasan penolakannya.') };
    }

    var isi = {
      status: baru,
      riwayat: (x.riwayat || []).concat([{
        status: baru, pada: U.nowISO(),
        olehNama: oleh ? oleh.nama : '', catatan: String(d.catatan || '').trim()
      }])
    };
    if (baru === 'dikerjakan' && !x.mulaiAt) isi.mulaiAt = U.nowISO();
    if (baru === 'selesai') {
      isi.selesaiAt = U.nowISO();
      isi.biaya = Math.max(0, Math.round(Number(d.biaya) || x.biaya || 0));
      isi.jamKerja = Math.max(0, Number(d.jamKerja) || x.jamKerja || 0);
      isi.fotoHasil = (d.fotoHasil || x.fotoHasil || []).slice();
      isi.catatanTutup = String(d.catatan || '').trim();
    }
    if (baru === 'ditolak') isi.catatanTutup = String(d.catatan || '').trim();
    DB.update('mcsKerja', id, isi);
    return { ok: true };
  }

  function hapus(id) {
    var x = satu(id);
    if (x) [].concat(x.foto || [], x.fotoHasil || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsKerja', id);
    return { ok: true };
  }

  /**
   * Menaikkan sebuah aduan menjadi pekerjaan tambahan.
   *
   * Sebagian aduan memang bukan urusan pembersihan rutin — karpet yang bernoda
   * permanen tidak selesai dengan dipel. Sebelumnya aduan seperti itu hanya
   * bisa ditutup atau dibiarkan terbuka selamanya; sekarang ia bisa BERPINDAH
   * jalur dengan jejak yang saling menunjuk.
   */
  function dariAduan(aduanId, oleh, d) {
    var a = MCS.aduanSatu(aduanId);
    if (!a) return { error: I18N.t('Aduan tidak ditemukan.') };
    var area = MCS.areaSatu(a.areaId);
    var r = buat(a.korporatId, {
      judul: (d && d.judul) || ((area ? area.nama + ' — ' : '') + (a.teks || I18N.t('Aduan penghuni'))),
      jenis: (d && d.jenis) || 'lain',
      asal: 'aduan',
      areaId: a.areaId,
      uraian: a.teks || '',
      target: d && d.target,
      perkiraanBiaya: d && d.perkiraanBiaya,
      perkiraanJam: d && d.perkiraanJam,
      aduanId: a.id,
      /* Fotonya TIDAK disalin, hanya ditunjuk lewat aduanId: menyalin id foto
         yang sama ke dua baris membuat pengumpul sampah penyimpanan menghapus
         gambar yang masih dipakai salah satunya. */
      foto: []
    }, oleh);
    if (r.error) return r;
    MCS.ubahAduan(aduanId, { status: 'ditugaskan',
      catatanPetugas: I18N.t('Dinaikkan menjadi pekerjaan tambahan {no}.')
        .replace('{no}', r.kerja.no) }, oleh);
    return r;
  }

  /* ---------------------------------------------------------- ringkasan */

  function statistik(korporatId, dari, sampai) {
    var l = DB.where('mcsKerja', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (dari && String(x.diminta).slice(0, 10) < dari) return false;
      if (sampai && String(x.diminta).slice(0, 10) > sampai) return false;
      return true;
    });
    function n(s) { return l.filter(function (x) { return x.status === s; }).length; }
    var selesai = l.filter(function (x) { return x.status === 'selesai'; });
    var hariIni = U.today();
    return {
      total: l.length,
      diminta: n('diminta'), disetujui: n('disetujui'),
      dikerjakan: n('dikerjakan'), selesai: selesai.length, ditolak: n('ditolak'),
      terbuka: l.filter(function (x) { return TERBUKA.indexOf(x.status) >= 0; }).length,
      /* Lewat janji, bukan lewat jadwal: yang dinilai adalah tanggal yang
         dijanjikan kepada peminta. */
      lewatTarget: l.filter(function (x) {
        return TERBUKA.indexOf(x.status) >= 0 && x.target && x.target < hariIni; }).length,
      biaya: selesai.reduce(function (s, x) { return s + (x.biaya || 0); }, 0),
      perkiraan: selesai.reduce(function (s, x) { return s + (x.perkiraanBiaya || 0); }, 0),
      jam: selesai.reduce(function (s, x) { return s + (x.jamKerja || 0); }, 0)
    };
  }

  /** Pekerjaan yang menyentuh sebuah area — dipakai halaman area & KPI. */
  function untukArea(areaId, opsi) {
    var a = MCS.areaSatu(areaId);
    if (!a) return [];
    return semua(a.korporatId, opsi).filter(function (x) { return x.areaId === areaId; });
  }

  return {
    STATUS: STATUS, JENIS: JENIS, ASAL: ASAL, TERBUKA: TERBUKA,
    status: status, jenis: jenis,
    semua: semua, satu: satu, untukArea: untukArea,
    buat: buat, ubah: ubah, ubahStatus: ubahStatus, hapus: hapus,
    dariAduan: dariAduan, statistik: statistik
  };
})();
