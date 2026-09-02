/* ==========================================================================
   latih.js — pelatihan, sertifikasi, dan kompetensi petugas
   --------------------------------------------------------------------------
   KENAPA INI ADA

   CIMS (Cleaning Industry Management Standard) menempatkan sumber daya
   manusia dan pelatihan sebagai salah satu unsur wajibnya, dan alasannya
   bukan administratif:

     · Petugas yang tidak pernah diajari MENCAMPUR BAHAN akan mencampurnya.
       Modul K3 sudah memperingatkan bahan yang tidak boleh bertemu; yang
       membaca peringatan itu adalah staf korporat, bukan orang yang memegang
       botolnya.
     · Sertifikat punya MASA BERLAKU. Sertifikat kerja di ketinggian yang
       habis tiga bulan lalu bukan sertifikat — dan tidak ada yang tahu
       kalau tanggalnya tidak pernah dicatat.
     · Saat ada kecelakaan, pertanyaan pertama yang diajukan adalah "apakah
       orangnya sudah dilatih". Gedung yang tidak bisa menjawabnya kalah
       sebelum diperiksa.

   MEMPERINGATKAN, BUKAN MENGUNCI

   Sertifikat yang kedaluwarsa TIDAK menghentikan siapa pun mengerjakan
   tugasnya di aplikasi ini. Itu keputusan yang disengaja: mengunci pelaporan
   karena sertifikat habis berarti gedungnya tidak dibersihkan dan tidak ada
   catatannya sekaligus — dua kerugian, bukan satu. Yang benar adalah
   membuatnya terlihat oleh orang yang bisa menjadwalkan pelatihan ulang.
   ========================================================================== */
window.LATIH = (function () {
  'use strict';

  var JENIS = [
    { kode: 'induksi', nama: 'Induksi & orientasi', ikon: '🎓',
      ket: 'Pengenalan gedung, aturan, jalur evakuasi. Sekali, saat masuk kerja.' },
    { kode: 'teknik', nama: 'Keterampilan teknis', ikon: '🧽',
      ket: 'Cara memakai mesin poles, teknik pel dua ember, penanganan lantai marmer.' },
    { kode: 'kimia', nama: 'Penanganan bahan kimia', ikon: '☣️',
      ket: 'Pengenceran, penyimpanan, larangan campur, penanganan tumpahan.' },
    { kode: 'k3', nama: 'Keselamatan kerja', ikon: '🦺',
      ket: 'APD, kerja di ketinggian, P3K, tanggap darurat.' },
    { kode: 'layanan', nama: 'Layanan & sikap', ikon: '🤝',
      ket: 'Berhadapan dengan penghuni, menjawab keluhan, etika di area kerja.' },
    { kode: 'sertifikat', nama: 'Sertifikat resmi', ikon: '📜',
      ket: 'Diterbitkan lembaga di luar gedung dan punya masa berlaku.' }
  ];
  function jenis(kode) {
    return JENIS.filter(function (j) { return j.kode === kode; })[0] || JENIS[JENIS.length - 1];
  }

  /**
   * Keadaan satu catatan pelatihan terhadap hari ini.
   *
   * 'segera' sengaja ada terpisah dari 'berlaku': sertifikat yang habis bulan
   * depan masih sah hari ini, tetapi menjadwalkan pelatihan ulang butuh waktu
   * lebih dari sehari. Memberitahu pada hari terakhir sama saja dengan tidak
   * memberitahu.
   */
  var KEADAAN = [
    { kode: 'berlaku', nama: 'Berlaku', ikon: '🟢', warna: 'ok' },
    { kode: 'segera', nama: 'Segera habis', ikon: '🟡', warna: 'warn' },
    { kode: 'habis', nama: 'Kedaluwarsa', ikon: '🔴', warna: 'danger' },
    { kode: 'belum', nama: 'Belum ada', ikon: '⚪', warna: 'muted' }
  ];
  function keadaan(kode) {
    return KEADAAN.filter(function (k) { return k.kode === kode; })[0] || KEADAAN[3];
  }

  /* Berapa hari sebelum habis mulai diperingatkan. Enam puluh hari dipilih
     karena menjadwalkan pelatihan ulang bersama lembaga luar biasanya makan
     waktu berminggu-minggu, bukan berhari-hari. */
  var HARI_PERINGATAN = 60;

  /* ------------------------------------------------------------- katalog */

  function daftar(korporatId, opsi) {
    opsi = opsi || {};
    return DB.where('mcsPelatihan', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && x.aktif === false) return false;
      return true;
    }).sort(function (a, b) {
      if (a.jenis !== b.jenis) return String(a.jenis).localeCompare(String(b.jenis));
      return String(a.nama).localeCompare(String(b.nama));
    });
  }
  function satu(id) { return DB.find('mcsPelatihan', id); }

  function tambah(korporatId, d) {
    d = d || {};
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama pelatihan belum diisi.') };
    var x = DB.insert('mcsPelatihan', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      jenis: jenis(d.jenis).kode,
      penyelenggara: String(d.penyelenggara || '').trim(),
      /* 0 = tidak punya masa berlaku. Induksi gedung tidak kedaluwarsa;
         sertifikat kerja di ketinggian jelas kedaluwarsa. */
      berlakuBulan: Math.max(0, Math.round(Number(d.berlakuBulan) || 0)),
      /* Jabatan yang WAJIB memilikinya. Kosong berarti pelatihan tambahan
         yang baik dipunyai tetapi tidak dituntut — dan yang tidak dituntut
         tidak boleh muncul sebagai kekurangan. */
      wajibJabatan: (d.wajibJabatan || []).slice(),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true, pelatihan: x };
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Pelatihan tidak ditemukan.') };
    if (d.nama !== undefined && !String(d.nama).trim()) {
      return { error: I18N.t('Nama pelatihan belum diisi.') };
    }
    var isi = {};
    ['nama', 'penyelenggara', 'catatan'].forEach(function (k) {
      if (d[k] !== undefined) isi[k] = String(d[k] || '').trim();
    });
    if (d.jenis !== undefined) isi.jenis = jenis(d.jenis).kode;
    if (d.berlakuBulan !== undefined) {
      isi.berlakuBulan = Math.max(0, Math.round(Number(d.berlakuBulan) || 0));
    }
    if (d.wajibJabatan !== undefined) isi.wajibJabatan = (d.wajibJabatan || []).slice();
    if (d.aktif !== undefined) isi.aktif = d.aktif !== false;
    DB.update('mcsPelatihan', id, isi);
    return { ok: true };
  }

  function hapus(id) {
    /* Catatan pelatihan orang IKUT terhapus. Membiarkannya menggantung tanpa
       induk membuat matriks kompetensi menampilkan kolom hantu yang tidak
       bisa dijelaskan siapa pun. */
    catatanPelatihan(id).forEach(function (r) {
      (r.foto || []).forEach(function (f) { DB.delPhoto(f); });
      DB.remove('mcsPelatihanCatat', r.id);
    });
    DB.remove('mcsPelatihan', id);
    return { ok: true };
  }

  /* ------------------------------------------------------------- catatan */

  function catatanPelatihan(pelatihanId) {
    return DB.where('mcsPelatihanCatat', function (r) { return r.pelatihanId === pelatihanId; });
  }
  function catatanPekerja(pekerjaId) {
    return DB.where('mcsPelatihanCatat', function (r) { return r.pekerjaId === pekerjaId; })
      .sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });
  }
  function catatSatu(id) { return DB.find('mcsPelatihanCatat', id); }

  /** Tanggal habis berlaku, atau null bila pelatihannya memang tidak kedaluwarsa. */
  function habisPada(p, tgl) {
    if (!p || !p.berlakuBulan || !tgl) return null;
    var d = new Date(tgl + 'T00:00:00');
    d.setMonth(d.getMonth() + p.berlakuBulan);
    return U.iso(d);
  }

  function catat(pekerjaId, pelatihanId, d, oleh) {
    var p = satu(pelatihanId);
    if (!p) return { error: I18N.t('Pelatihan tidak ditemukan.') };
    if (!MCS.pekerjaSatu(pekerjaId)) return { error: I18N.t('Petugas tidak ditemukan.') };
    d = d || {};
    if (!d.tgl) return { error: I18N.t('Tanggal pelatihan belum diisi.') };
    if (d.tgl > U.today()) {
      /* Pelatihan yang belum terjadi tidak boleh tercatat sudah terjadi —
         itu jenis catatan yang paling sering ditemukan saat audit. */
      return { error: I18N.t('Tanggalnya di masa depan. Catat setelah pelatihannya berlangsung.') };
    }
    var x = DB.insert('mcsPelatihanCatat', {
      pekerjaId: pekerjaId,
      pelatihanId: pelatihanId,
      korporatId: p.korporatId,
      tgl: d.tgl,
      habis: habisPada(p, d.tgl),
      lulus: d.lulus !== false,
      nilai: d.nilai !== undefined && d.nilai !== '' ? Number(d.nilai) : null,
      nomorSertifikat: String(d.nomorSertifikat || '').trim(),
      penyelenggara: String(d.penyelenggara || p.penyelenggara || '').trim(),
      catatan: String(d.catatan || '').trim(),
      foto: (d.foto || []).slice(),
      dicatatPada: U.nowISO(),
      dicatatOleh: oleh ? oleh.nama : ''
    });
    return { ok: true, catatan: catatSatu(x.id) };
  }

  function hapusCatat(id) {
    var x = catatSatu(id);
    if (x) (x.foto || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsPelatihanCatat', id);
    return { ok: true };
  }

  /* --------------------------------------------------------- kompetensi */

  /**
   * Keadaan seorang petugas terhadap SATU pelatihan.
   *
   * Yang dipakai adalah catatan TERBARU yang lulus. Petugas yang gagal lalu
   * mengulang dan lulus tidak boleh dinilai dari kegagalannya — dan yang lulus
   * lalu mengulang tetap dinilai dari yang terbaru, karena masa berlakunya
   * yang berlaku.
   */
  function keadaanSatu(pekerjaId, p) {
    var l = DB.where('mcsPelatihanCatat', function (r) {
      return r.pekerjaId === pekerjaId && r.pelatihanId === p.id && r.lulus !== false;
    }).sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });

    if (!l.length) return { kode: 'belum', catatan: null, habis: null, sisaHari: null };
    var c = l[0];
    if (!c.habis) return { kode: 'berlaku', catatan: c, habis: null, sisaHari: null };

    var sisa = Math.round((new Date(c.habis) - new Date(U.today())) / 864e5);
    var kode = sisa < 0 ? 'habis' : (sisa <= HARI_PERINGATAN ? 'segera' : 'berlaku');
    return { kode: kode, catatan: c, habis: c.habis, sisaHari: sisa };
  }

  /**
   * Matriks kompetensi: baris orang, kolom pelatihan.
   *
   * Inilah bentuk yang ditanyakan auditor dan yang dipasang di dinding ruang
   * penyelia. Daftar per orang tidak bisa menggantikannya — yang perlu terbaca
   * sekilas adalah KOLOM yang penuh lubang, bukan orang per orang.
   */
  function matriks(korporatId) {
    var pel = daftar(korporatId);
    var orang = MCS.pekerja(korporatId);

    var baris = orang.map(function (o) {
      var jb = MCS.jabatan(o.jabatan);
      var sel = pel.map(function (p) {
        var k = keadaanSatu(o.id, p);
        /* Wajib atau tidak ditentukan JABATANNYA, bukan pelatihannya saja:
           sertifikat ketinggian wajib bagi yang mengerjakan kaca luar, tidak
           bagi yang memegang pantry. */
        /* Kosong berarti TIDAK dituntut siapa pun — bukan dituntut semua orang.
           Sempat terbalik di sini, dan akibatnya pelatihan tambahan yang baik
           dipunyai muncul sebagai kekurangan bagi seluruh regu: daftar merah
           panjang yang tidak seorang pun bisa jelaskan sebabnya. */
        var wajib = (p.wajibJabatan || []).indexOf(jb.kode) >= 0;
        return { pelatihan: p, wajib: wajib, keadaan: k };
      });
      var kurang = sel.filter(function (s) {
        return s.wajib && (s.keadaan.kode === 'belum' || s.keadaan.kode === 'habis'); });
      var segera = sel.filter(function (s) { return s.wajib && s.keadaan.kode === 'segera'; });
      return {
        pekerja: o, jabatan: jb, sel: sel,
        kurang: kurang, segera: segera,
        /* Berapa bagian dari yang WAJIB sudah dipenuhi dan masih berlaku. */
        persen: (function () {
          var w = sel.filter(function (s) { return s.wajib; });
          if (!w.length) return null;
          var ok = w.filter(function (s) {
            return s.keadaan.kode === 'berlaku' || s.keadaan.kode === 'segera'; }).length;
          return Math.round(ok / w.length * 100);
        })()
      };
    });

    return {
      pelatihan: pel,
      baris: baris.sort(function (a, b) {
        if (a.kurang.length !== b.kurang.length) return b.kurang.length - a.kurang.length;
        return String(a.pekerja.nama).localeCompare(String(b.pekerja.nama));
      })
    };
  }

  function statistik(korporatId) {
    var m = matriks(korporatId);
    var kurang = [], segera = [];
    m.baris.forEach(function (b) {
      b.kurang.forEach(function (s) { kurang.push({ baris: b, sel: s }); });
      b.segera.forEach(function (s) { segera.push({ baris: b, sel: s }); });
    });
    var terukur = m.baris.filter(function (b) { return b.persen !== null; });
    return {
      pelatihan: m.pelatihan.length,
      orang: m.baris.length,
      kurang: kurang, segera: segera,
      orangKurang: m.baris.filter(function (b) { return b.kurang.length; }).length,
      rata: terukur.length
        ? Math.round(terukur.reduce(function (s, b) { return s + b.persen; }, 0) / terukur.length)
        : null,
      catatanTotal: DB.where('mcsPelatihanCatat', function (r) {
        return r.korporatId === korporatId; }).length
    };
  }

  return {
    JENIS: JENIS, KEADAAN: KEADAAN, HARI_PERINGATAN: HARI_PERINGATAN,
    jenis: jenis, keadaan: keadaan,
    daftar: daftar, satu: satu, tambah: tambah, ubah: ubah, hapus: hapus,
    catat: catat, hapusCatat: hapusCatat, catatSatu: catatSatu,
    catatanPekerja: catatanPekerja, catatanPelatihan: catatanPelatihan,
    habisPada: habisPada, keadaanSatu: keadaanSatu,
    matriks: matriks, statistik: statistik
  };
})();
