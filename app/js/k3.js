/* ==========================================================================
   k3.js — keselamatan & kesehatan kerja petugas kebersihan
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Kebersihan adalah pekerjaan berisiko tinggi yang jarang diperlakukan
   demikian. Tiga bahaya terbesarnya:

     · TERPELESET — di lantai yang baru saja ia sendiri pel.
     · BAHAN KIMIA — pembersih porselen, penghilang kerak, pemutih. Sebagian
       melepaskan gas beracun bila tercampur; klorin + asam adalah kecelakaan
       yang berulang di gedung-gedung setiap tahun.
     · KETINGGIAN — kaca luar, plafon, lampu.

   Sebelum berkas ini ada, MCS tidak menyimpan satu pun catatan keselamatan.
   Bila seorang petugas cedera, tidak ada apa pun di sistem yang bisa
   menunjukkan gedung sudah melakukan kewajibannya — dan tidak ada pola yang
   bisa dibaca untuk mencegah kejadian berikutnya.

   ASUMSI YANG DISEBUTKAN, BUKAN DISEMBUNYIKAN

   Bentuk formulir ini TIDAK mengikuti format laporan resmi mana pun. Kewajiban
   pelaporan kecelakaan kerja berbeda antarnegara dan antardaerah — di
   Indonesia ada kewajiban lapor ke BPJS Ketenagakerjaan dan Dinas
   Ketenagakerjaan dengan tenggat dan formulirnya sendiri. Yang ada di sini
   adalah CATATAN INTERNAL yang isinya cukup untuk mengisi formulir resmi mana
   pun, bukan pengganti formulir itu.

   Siapa pun yang memakai modul ini sebagai bukti kepatuhan hukum tanpa
   memeriksa aturan setempat sedang salah memakainya.
   ========================================================================== */
window.K3 = (function () {
  'use strict';

  /* ------------------------------------------------------------- katalog */

  /**
   * NYARIS CELAKA sengaja sederajat dengan kecelakaan di daftar ini.
   *
   * Yang mencegah kecelakaan berikutnya justru laporan nyaris celaka, dan itu
   * satu-satunya jenis laporan yang tidak akan pernah masuk kalau membuatnya
   * terasa lebih remeh atau lebih merepotkan daripada diam.
   */
  var JENIS = [
    { kode: 'nyaris', nama: 'Nyaris celaka', ikon: '⚠️', warna: 'warn',
      ket: 'Hampir terjadi, tidak ada yang cedera. Justru ini yang paling berguna dicatat.' },
    { kode: 'cedera', nama: 'Cedera ringan', ikon: '🩹', warna: 'warn',
      ket: 'Tertangani dengan kotak P3K, petugas tetap bekerja.' },
    { kode: 'berat', nama: 'Cedera berat', ikon: '🚑', warna: 'danger',
      ket: 'Perlu perawatan medis atau berhenti bekerja.' },
    { kode: 'kimia', nama: 'Paparan bahan kimia', ikon: '☣️', warna: 'danger',
      ket: 'Terhirup, terkena kulit atau mata, atau bahan tercampur.' },
    { kode: 'properti', nama: 'Kerusakan properti', ikon: '🧱', warna: 'warn',
      ket: 'Tidak ada yang cedera, tetapi ada yang rusak.' }
  ];
  function jenis(kode) {
    return JENIS.filter(function (j) { return j.kode === kode; })[0] || JENIS[0];
  }

  var SEBAB = [
    { kode: 'licin', nama: 'Lantai licin / basah' },
    { kode: 'jatuh', nama: 'Jatuh dari ketinggian' },
    { kode: 'kimia', nama: 'Bahan kimia' },
    { kode: 'listrik', nama: 'Listrik' },
    { kode: 'benda', nama: 'Benda tajam / pecahan' },
    { kode: 'angkat', nama: 'Mengangkat beban' },
    { kode: 'mesin', nama: 'Mesin / peralatan' },
    { kode: 'lain', nama: 'Lainnya' }
  ];

  var STATUS = [
    { kode: 'dilaporkan', nama: 'Dilaporkan', ikon: '📥', warna: 'info' },
    { kode: 'ditangani', nama: 'Ditangani', ikon: '🛠️', warna: 'warn' },
    { kode: 'ditutup', nama: 'Ditutup', ikon: '✅', warna: 'ok' }
  ];
  function status(kode) {
    return STATUS.filter(function (s) { return s.kode === kode; })[0] || STATUS[0];
  }

  /**
   * Alat pelindung diri.
   *
   * Daftarnya pendek dan konkret. Daftar APD sepanjang dua layar akan
   * dicentang semuanya sekaligus tanpa dibaca, dan ceklis yang selalu penuh
   * tidak memberi tahu apa pun.
   */
  var APD = [
    { kode: 'sarung', nama: 'Sarung tangan karet', ikon: '🧤' },
    { kode: 'masker', nama: 'Masker', ikon: '😷' },
    { kode: 'kacamata', nama: 'Kacamata pelindung', ikon: '🥽' },
    { kode: 'sepatu', nama: 'Sepatu anti-selip', ikon: '🥾' },
    { kode: 'apron', nama: 'Celemek tahan bahan kimia', ikon: '🦺' },
    { kode: 'harness', nama: 'Sabuk pengaman ketinggian', ikon: '🪢' },
    { kode: 'helm', nama: 'Helm', ikon: '⛑️' }
  ];
  function apd(kode) {
    return APD.filter(function (a) { return a.kode === kode; })[0] || { kode: kode, nama: kode, ikon: '🦺' };
  }

  /**
   * Kelas bahaya bahan pembersih, disederhanakan dari GHS.
   *
   * `jangan` menyebut apa yang TIDAK BOLEH dicampur. Ini bukan hiasan:
   * pemutih berbasis klorin yang tercampur pembersih porselen berbasis asam
   * melepaskan gas klorin, dan itu kecelakaan yang terjadi berulang kali
   * justru karena keduanya sama-sama ada di troli yang sama.
   */
  var BAHAYA = [
    { kode: 'aman', nama: 'Tidak berbahaya', ikon: '🟢', warna: 'ok', jangan: '' },
    { kode: 'iritan', nama: 'Iritasi kulit / mata', ikon: '🟡', warna: 'warn', jangan: '' },
    { kode: 'korosif', nama: 'Korosif (asam / basa kuat)', ikon: '🟠', warna: 'warn',
      jangan: 'Jangan dicampur dengan pemutih klorin — melepaskan gas beracun.' },
    { kode: 'klorin', nama: 'Pemutih berbasis klorin', ikon: '🔴', warna: 'danger',
      jangan: 'Jangan dicampur dengan pembersih asam, amonia, atau cuka — melepaskan gas klorin.' },
    { kode: 'amonia', nama: 'Mengandung amonia', ikon: '🔴', warna: 'danger',
      jangan: 'Jangan dicampur dengan pemutih klorin — melepaskan gas kloramin.' },
    { kode: 'mudahterbakar', nama: 'Mudah terbakar', ikon: '🔥', warna: 'danger',
      jangan: 'Jauhkan dari sumber panas dan api.' }
  ];
  function bahaya(kode) {
    return BAHAYA.filter(function (b) { return b.kode === kode; })[0] || BAHAYA[0];
  }

  /* ------------------------------------------------------------- insiden */

  function insiden(korporatId, opsi) {
    opsi = opsi || {};
    var l = DB.where('mcsInsiden', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && x.status === 'ditutup') return false;
      if (opsi.dari && x.tgl < opsi.dari) return false;
      if (opsi.sampai && x.tgl > opsi.sampai) return false;
      if (opsi.pekerjaId && x.pekerjaId !== opsi.pekerjaId) return false;
      return true;
    });
    return l.sort(function (a, b) { return String(b.pada).localeCompare(String(a.pada)); });
  }
  function insidenSatu(id) { return DB.find('mcsInsiden', id); }

  function lapor(korporatId, d, oleh) {
    d = d || {};
    if (!String(d.uraian || '').trim()) {
      return { error: I18N.t('Ceritakan kejadiannya — tanpa itu tidak ada yang bisa dipelajari.') };
    }
    var x = DB.insert('mcsInsiden', {
      korporatId: korporatId,
      no: nomorInsiden(korporatId),
      jenis: jenis(d.jenis).kode,
      sebab: (SEBAB.filter(function (s) { return s.kode === d.sebab; })[0] || SEBAB[SEBAB.length - 1]).kode,
      tgl: d.tgl || U.today(),
      jam: d.jam || '',
      areaId: d.areaId || null,
      /* Boleh tanpa nama petugas: laporan nyaris celaka yang menuntut nama
         akan berhenti masuk begitu orang mengira dirinya sedang dicatat
         sebagai yang lalai. */
      pekerjaId: d.pekerjaId || null,
      uraian: String(d.uraian).trim(),
      tindakanSegera: String(d.tindakanSegera || '').trim(),
      akarMasalah: '',
      pencegahan: '',
      apdDipakai: (d.apdDipakai || []).slice(),
      pada: U.nowISO(),
      olehNama: oleh ? oleh.nama : (d.olehNama || ''),
      status: 'dilaporkan',
      foto: (d.foto || []).slice(),
      hariHilang: Math.max(0, Math.round(Number(d.hariHilang) || 0)),
      ditutupPada: null, ditutupOleh: ''
    });
    return { ok: true, insiden: insidenSatu(x.id) };
  }

  function nomorInsiden(korporatId) {
    var thn = String(new Date().getFullYear());
    var n = DB.where('mcsInsiden', function (x) {
      return x.korporatId === korporatId && String(x.no || '').indexOf('K3-' + thn) === 0;
    }).length + 1;
    return 'K3-' + thn + '-' + String(n).padStart(3, '0');
  }

  function ubahInsiden(id, d) {
    var x = insidenSatu(id);
    if (!x) return { error: I18N.t('Laporan tidak ditemukan.') };
    var isi = {};
    ['uraian', 'tindakanSegera', 'akarMasalah', 'pencegahan', 'jam'].forEach(function (k) {
      if (d[k] !== undefined) isi[k] = String(d[k] || '').trim();
    });
    if (d.jenis !== undefined) isi.jenis = jenis(d.jenis).kode;
    if (d.sebab !== undefined) isi.sebab = d.sebab;
    if (d.areaId !== undefined) isi.areaId = d.areaId || null;
    if (d.pekerjaId !== undefined) isi.pekerjaId = d.pekerjaId || null;
    if (d.tgl !== undefined) isi.tgl = d.tgl;
    if (d.hariHilang !== undefined) isi.hariHilang = Math.max(0, Math.round(Number(d.hariHilang) || 0));
    if (d.apdDipakai !== undefined) isi.apdDipakai = (d.apdDipakai || []).slice();
    DB.update('mcsInsiden', id, isi);
    return { ok: true };
  }

  /**
   * Menutup laporan MENUNTUT akar masalah dan pencegahan.
   *
   * Laporan yang ditutup dengan "sudah dibersihkan" tidak mencegah apa pun.
   * Yang mencegah kejadian berikutnya adalah jawaban atas dua pertanyaan:
   * kenapa ini terjadi, dan apa yang diubah supaya tidak terulang.
   */
  function tutupInsiden(id, d, oleh) {
    var x = insidenSatu(id);
    if (!x) return { error: I18N.t('Laporan tidak ditemukan.') };
    d = d || {};
    if (!String(d.akarMasalah || '').trim()) {
      return { error: I18N.t('Tulis akar masalahnya. "Sudah dibersihkan" bukan akar masalah.') };
    }
    if (!String(d.pencegahan || '').trim()) {
      return { error: I18N.t('Tulis apa yang diubah supaya tidak terulang.') };
    }
    DB.update('mcsInsiden', id, {
      status: 'ditutup',
      akarMasalah: String(d.akarMasalah).trim(),
      pencegahan: String(d.pencegahan).trim(),
      hariHilang: d.hariHilang !== undefined
        ? Math.max(0, Math.round(Number(d.hariHilang) || 0)) : x.hariHilang,
      ditutupPada: U.nowISO(),
      ditutupOleh: oleh ? oleh.nama : ''
    });
    return { ok: true };
  }

  function tanganiInsiden(id) {
    if (!insidenSatu(id)) return { error: I18N.t('Laporan tidak ditemukan.') };
    DB.update('mcsInsiden', id, { status: 'ditangani' });
    return { ok: true };
  }

  function hapusInsiden(id) {
    var x = insidenSatu(id);
    if (x) (x.foto || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsInsiden', id);
    return { ok: true };
  }

  /* ----------------------------------------------------------- statistik */

  function statistik(korporatId, dari, sampai) {
    var l = DB.where('mcsInsiden', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (dari && x.tgl < dari) return false;
      if (sampai && x.tgl > sampai) return false;
      return true;
    });
    function n(k) { return l.filter(function (x) { return x.jenis === k; }).length; }
    var cedera = l.filter(function (x) {
      return x.jenis === 'cedera' || x.jenis === 'berat' || x.jenis === 'kimia'; });

    /* Hari sejak kejadian yang MENCEDERAI terakhir. Angka yang dipasang di
       papan pengumuman gudang di seluruh dunia, dan satu-satunya angka
       keselamatan yang benar-benar dibaca orang setiap hari. */
    var terakhir = cedera.map(function (x) { return x.tgl; }).sort().pop() || null;
    var hariAman = terakhir
      ? Math.max(0, Math.round((new Date(U.today()) - new Date(terakhir)) / 864e5))
      : null;

    return {
      total: l.length,
      nyaris: n('nyaris'), cedera: n('cedera'), berat: n('berat'),
      kimia: n('kimia'), properti: n('properti'),
      terbuka: l.filter(function (x) { return x.status !== 'ditutup'; }).length,
      /* Laporan yang ditutup TANPA pencegahan dihitung terpisah: itu laporan
         yang sudah selesai secara administratif tetapi belum mengubah apa pun. */
      tanpaPencegahan: l.filter(function (x) {
        return x.status === 'ditutup' && !String(x.pencegahan || '').trim(); }).length,
      hariHilang: l.reduce(function (s, x) { return s + (x.hariHilang || 0); }, 0),
      hariAman: hariAman, cederaTerakhir: terakhir,
      perSebab: SEBAB.map(function (s) {
        return { sebab: s, n: l.filter(function (x) { return x.sebab === s.kode; }).length };
      }).filter(function (v) { return v.n; }).sort(function (a, b) { return b.n - a.n; })
    };
  }

  /* ------------------------------------------------- bahan kimia & APD */

  /** Barang persediaan yang ditandai berbahaya, beserta larangan campurnya. */
  function bahanBerbahaya(korporatId) {
    return MCS.stok(korporatId).filter(function (x) {
      var b = bahaya(x.bahaya);
      return b.kode !== 'aman';
    }).map(function (x) {
      return Object.assign({}, x, { info: bahaya(x.bahaya) });
    });
  }

  /**
   * Pasangan bahan yang TIDAK BOLEH bertemu, dihitung dari yang benar-benar
   * ada di gudang korporat ini — bukan daftar teori.
   */
  var TABRAKAN = [
    { a: 'klorin', b: 'korosif' },
    { a: 'klorin', b: 'amonia' }
  ];
  function bahanBertabrakan(korporatId) {
    var l = bahanBerbahaya(korporatId);
    var out = [];
    TABRAKAN.forEach(function (t) {
      var kiri = l.filter(function (x) { return x.bahaya === t.a; });
      var kanan = l.filter(function (x) { return x.bahaya === t.b; });
      if (kiri.length && kanan.length) {
        out.push({ kiri: kiri, kanan: kanan,
                   a: bahaya(t.a), b: bahaya(t.b) });
      }
    });
    return out;
  }

  /** APD yang diwajibkan sebuah area. */
  function apdArea(areaId) {
    var a = MCS.areaSatu(areaId);
    return ((a && a.apdWajib) || []).map(apd);
  }

  return {
    JENIS: JENIS, SEBAB: SEBAB, STATUS: STATUS, APD: APD, BAHAYA: BAHAYA,
    jenis: jenis, status: status, apd: apd, bahaya: bahaya,
    insiden: insiden, insidenSatu: insidenSatu,
    lapor: lapor, ubahInsiden: ubahInsiden, tutupInsiden: tutupInsiden,
    tanganiInsiden: tanganiInsiden, hapusInsiden: hapusInsiden,
    statistik: statistik,
    bahanBerbahaya: bahanBerbahaya, bahanBertabrakan: bahanBertabrakan, apdArea: apdArea
  };
})();
