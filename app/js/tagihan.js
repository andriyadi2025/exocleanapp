/* ==========================================================================
   tagihan.js — dari kontrak dan pekerjaan tambahan menjadi tagihan
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Nilai kontrak bulanan sudah tercatat, dan biaya tiap pekerjaan tambahan
   sudah diisi saat pekerjaannya selesai. Tetapi keduanya berhenti di sana.
   Yang menagih tetap menyusun ulang angkanya sendiri tiap bulan, dan yang
   paling sering terjadi bukan salah hitung melainkan LUPA: pekerjaan
   tambahan yang sudah dikerjakan, sudah dibayar upahnya, dan tidak pernah
   ditagihkan kepada siapa pun.

   Halaman ini mengumpulkan keduanya menjadi satu daftar, dan menandai
   pekerjaan tambahan yang belum pernah masuk tagihan mana pun.

   TAGIHAN DISIMPAN, BUKAN DIHITUNG ULANG

   Sama alasannya dengan slip gaji: tagihan yang sudah dikirim adalah
   dokumen yang sudah dipegang orang lain. Menghitungnya ulang setelah nilai
   kontraknya berubah akan diam-diam mengubah isi kertas yang sudah dikirim.
   Karena itu barisnya DIBEKUKAN saat diterbitkan.

   Sekali diterbitkan, pekerjaan tambahan di dalamnya ditandai sudah
   ditagihkan — supaya ia tidak masuk lagi ke tagihan bulan berikutnya.

   NOMOR DARI SERVER, BUKAN DARI SALINAN SENDIRI

   Nomor tagihan dipesan lewat SYNC.nomorBerikut. Dua orang yang sama-sama
   menghitung "nomor berikutnya" dari salinannya masing-masing akan
   menerbitkan dua tagihan bernomor sama, dan itu merusak pembukuan di sisi
   pelanggan — bukan hanya di sisi kita. Ketika penyimpanan bersama mati,
   nomornya jatuh ke hitungan lokal dan itu DIKATAKAN pada tagihannya.

   YANG TIDAK DIJANJIKAN

   Ini bukan faktur pajak. Tidak ada NPWP, tidak ada e-Faktur, tidak ada
   nomor seri pajak. Ppn dihitung sebagai persentase yang diisi sendiri, dan
   angkanya tetap harus diperiksa orang yang mengurus pajak. Ia juga tidak
   mencatat pembayaran masuk — yang ada hanya penandaan lunas oleh manusia.
   ========================================================================== */
var TAGIHAN = (function () {

  var BAWAAN = {
    /* Kosong berarti tidak ada PPN pada tagihannya. Sengaja nol: menaruh 11%
       secara bawaan berarti menagihkan pajak atas nama orang yang belum tentu
       memungutnya. */
    ppnPersen: 0,
    /* Berapa hari setelah terbit tagihan jatuh tempo. */
    tempoHari: 14,
    catatanKaki: ''
  };

  function config(korporatId) {
    var k = DB.find('korporat', korporatId);
    var s = (k && k.tagihanConfig) || {};
    return {
      ppnPersen: s.ppnPersen !== undefined ? Number(s.ppnPersen) : BAWAAN.ppnPersen,
      tempoHari: s.tempoHari !== undefined ? Number(s.tempoHari) : BAWAAN.tempoHari,
      catatanKaki: s.catatanKaki !== undefined ? String(s.catatanKaki) : BAWAAN.catatanKaki
    };
  }

  function simpanConfig(korporatId, patch) {
    var k = DB.find('korporat', korporatId);
    if (!k) return { error: I18N.t('Korporat tidak ditemukan.') };
    var c = Object.assign({}, (k && k.tagihanConfig) || {});
    if (patch.ppnPersen !== undefined) {
      var p = Number(patch.ppnPersen);
      if (!(p >= 0 && p <= 100)) return { error: I18N.t('Ppn harus antara 0 dan 100 persen.') };
      c.ppnPersen = p;
    }
    if (patch.tempoHari !== undefined) {
      var t = Number(patch.tempoHari);
      if (!(t >= 0 && t <= 365)) return { error: I18N.t('Tempo harus antara 0 dan 365 hari.') };
      c.tempoHari = Math.round(t);
    }
    if (patch.catatanKaki !== undefined) c.catatanKaki = String(patch.catatanKaki).trim();
    DB.update('korporat', korporatId, { tagihanConfig: c });
    return { ok: true, config: config(korporatId) };
  }

  /* ---------------------------------------------------------- penyusunan */

  function periode(tahun, bulan) {
    var d = new Date(tahun, bulan - 1, 1);
    var akhir = new Date(tahun, bulan, 0);
    return { dari: U.iso(d), sampai: U.iso(akhir) };
  }

  /** Pekerjaan tambahan yang sudah pernah masuk tagihan mana pun. */
  function sudahDitagih(korporatId) {
    var out = {};
    DB.where('mcsTagihan', function (x) { return x.korporatId === korporatId; })
      .forEach(function (t) {
        (t.baris || []).forEach(function (b) { if (b.kerjaId) out[b.kerjaId] = t.no; });
      });
    return out;
  }

  /**
   * Susun baris tagihan untuk satu bulan — TANPA menyimpannya.
   *
   * Dua sumber:
   *   · kontrak yang BERLAKU pada bulan itu → satu baris per kontrak;
   *   · pekerjaan tambahan yang SELESAI pada bulan itu dan belum pernah
   *     ditagihkan → satu baris per pekerjaan.
   *
   * Pekerjaan yang biayanya masih nol ikut dikembalikan, tetapi ditandai —
   * ia bukan pekerjaan gratis, ia pekerjaan yang biayanya belum diisi, dan
   * menagihkannya nol berarti kehilangan uang tanpa ada yang menyadarinya.
   */
  function susun(korporatId, tahun, bulan) {
    var per = periode(tahun, bulan);
    var terpakai = sudahDitagih(korporatId);
    var baris = [], perluDiperiksa = [];

    /* --- kontrak --- */
    DB.where('mcsKontrak', function (x) {
      /* 'berjalan', bukan 'aktif' — itu nama status yang sebenarnya dipakai
         modul kontrak. Salah nama di sini tidak melempar galat apa pun: ia
         hanya menghasilkan nol kontrak, dan layarnya berkata 'tidak ada yang
         bisa ditagihkan' seolah itu keadaan yang wajar. */
      return x.korporatId === korporatId && x.status === 'berjalan';
    }).forEach(function (k) {
      /* Berlaku bila periodenya bersinggungan dengan bulan ini. Kontrak yang
         mulai tanggal 20 tetap ditagihkan penuh — pembagian prorata butuh
         kesepakatan yang tidak ada di data ini, dan menebaknya menghasilkan
         angka yang tidak bisa dipertanggungjawabkan. */
      if (k.mulai && k.mulai > per.sampai) return;
      if (k.sampai && k.sampai < per.dari) return;
      if (!k.nilaiBulanan) return;
      baris.push({
        jenis: 'kontrak', kontrakId: k.id,
        uraian: k.nama + (k.no ? ' (' + k.no + ')' : ''),
        qty: 1, harga: k.nilaiBulanan, jumlah: k.nilaiBulanan
      });
    });

    /* --- pekerjaan tambahan --- */
    DB.where('mcsKerja', function (x) {
      if (x.korporatId !== korporatId || x.status !== 'selesai') return false;
      var t = String(x.selesaiAt || x.dibuat || '').slice(0, 10);
      return t >= per.dari && t <= per.sampai;
    }).forEach(function (w) {
      if (terpakai[w.id]) return;
      var harga = Math.max(0, Math.round(Number(w.biaya) || 0));
      if (!harga) {
        perluDiperiksa.push({ id: w.id, no: w.no, judul: w.judul });
        return;
      }
      baris.push({
        jenis: 'kerja', kerjaId: w.id,
        uraian: w.judul + (w.no ? ' (' + w.no + ')' : ''),
        qty: 1, harga: harga, jumlah: harga
      });
    });

    return { periode: per, baris: baris, perluDiperiksa: perluDiperiksa };
  }

  function jumlahkan(baris, ppnPersen) {
    var dasar = 0;
    (baris || []).forEach(function (b) { dasar += Number(b.jumlah) || 0; });
    var ppn = Math.round(dasar * (Number(ppnPersen) || 0) / 100);
    return { dasar: dasar, ppn: ppn, total: dasar + ppn };
  }

  /** Pratinjau lengkap: baris, jumlah, dan apa yang perlu diperiksa dulu. */
  function pratinjau(korporatId, tahun, bulan) {
    var c = config(korporatId);
    var s = susun(korporatId, tahun, bulan);
    /* ppnPersen diangkat ke tingkat atas supaya pratinjau dan tagihan yang
       sudah tersimpan punya BENTUK YANG SAMA. Satu fungsi tampilan yang
       melayani dua bentuk berbeda akan benar pada salah satunya dan diam-diam
       salah pada yang lain — di layar ia muncul sebagai "Ppn undefined%". */
    return Object.assign({}, s, { config: c, ppnPersen: c.ppnPersen },
      jumlahkan(s.baris, c.ppnPersen));
  }

  /* ------------------------------------------------------------- terbit */

  function daftar(korporatId) {
    return DB.where('mcsTagihan', function (x) { return x.korporatId === korporatId; })
      .sort(function (a, b) { return String(b.diterbitkan).localeCompare(String(a.diterbitkan)); });
  }

  function satu(id) { return DB.find('mcsTagihan', id); }

  function bulanTerbit(korporatId, tahun, bulan) {
    return DB.first('mcsTagihan', function (x) {
      return x.korporatId === korporatId && x.tahun === tahun && x.bulan === bulan;
    });
  }

  /**
   * Nomor tagihan.
   *
   * Dipesan dari server bila penyimpanan bersama menyala. Bila tidak — atau
   * petaknya habis dan server tak terjangkau — ia jatuh ke hitungan lokal,
   * dan `lokal:true` dikembalikan supaya layar bisa MENGATAKANNYA. Nomor
   * lokal bisa bertabrakan dengan nomor perangkat lain, dan orang yang
   * menerbitkannya berhak tahu itu sebelum mengirimkannya.
   */
  function nomorBaru(korporatId, tahun) {
    var n = null;
    if (window.SYNC && SYNC.aktif() && SYNC.nomorBerikut) {
      n = SYNC.nomorBerikut('tagihan');
    }
    var lokal = false;
    if (!n) {
      lokal = true;
      n = DB.where('mcsTagihan', function (x) {
        return x.korporatId === korporatId && x.tahun === tahun;
      }).length + 1;
    }
    return { no: 'INV/' + tahun + '/' + ('0000' + n).slice(-4), lokal: lokal };
  }

  function terbitkan(korporatId, tahun, bulan, oleh) {
    if (bulanTerbit(korporatId, tahun, bulan)) {
      return { error: I18N.t('Tagihan bulan itu sudah pernah diterbitkan.') };
    }
    var p = pratinjau(korporatId, tahun, bulan);
    if (!p.baris.length) {
      return { error: I18N.t('Tidak ada yang bisa ditagihkan pada bulan itu.') };
    }
    var nb = nomorBaru(korporatId, tahun);
    var terbitTgl = U.today();
    var x = DB.insert('mcsTagihan', {
      korporatId: korporatId,
      no: nb.no,
      /* Ditulis pada tagihannya sendiri, bukan hanya ditampilkan sekali:
         yang membuka tagihan ini enam bulan lagi juga perlu tahu nomornya
         tidak dijamin unik menyeluruh. */
      nomorLokal: nb.lokal,
      tahun: tahun, bulan: bulan,
      periode: p.periode,
      /* Baris DIBEKUKAN — bukan dirujuk. Kontrak yang nilainya naik bulan
         depan tidak boleh mengubah tagihan yang sudah dikirim. */
      baris: p.baris.slice(),
      ppnPersen: p.config.ppnPersen,
      dasar: p.dasar, ppn: p.ppn, total: p.total,
      tanggal: terbitTgl,
      jatuhTempo: U.iso(U.addDays(new Date(terbitTgl + 'T00:00:00'), p.config.tempoHari)),
      catatanKaki: p.config.catatanKaki,
      status: 'terbit',
      lunasAt: null, lunasCatatan: '',
      diterbitkan: U.nowISO(),
      olehId: oleh ? oleh.id : null,
      olehNama: oleh ? oleh.nama : ''
    });
    return { ok: true, tagihan: x, nomorLokal: nb.lokal };
  }

  function tandaiLunas(id, catatan, oleh) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Tagihan tidak ditemukan.') };
    if (x.status === 'lunas') return { error: I18N.t('Tagihan ini sudah ditandai lunas.') };
    DB.update('mcsTagihan', id, {
      status: 'lunas', lunasAt: U.nowISO(),
      lunasCatatan: String(catatan || '').trim(),
      lunasOlehNama: oleh ? oleh.nama : ''
    });
    return { ok: true };
  }

  function bukaKembali(id) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Tagihan tidak ditemukan.') };
    DB.update('mcsTagihan', id, { status: 'terbit', lunasAt: null, lunasCatatan: '' });
    return { ok: true };
  }

  /**
   * Hapus tagihan.
   *
   * Pekerjaan tambahan di dalamnya kembali menjadi belum-ditagih — kalau
   * tidak, membatalkan satu tagihan yang salah akan membuat pekerjaannya
   * tidak pernah bisa ditagihkan lagi, dan itu kehilangan uang yang sunyi.
   */
  function hapus(id) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Tagihan tidak ditemukan.') };
    var n = (x.baris || []).filter(function (b) { return b.kerjaId; }).length;
    DB.remove('mcsTagihan', id);
    return { ok: true, kerjaDibebaskan: n };
  }

  function statistik(korporatId) {
    var l = daftar(korporatId);
    var kini = U.today();
    var belum = l.filter(function (x) { return x.status !== 'lunas'; });
    return {
      total: l.length,
      belumLunas: belum.length,
      nilaiBelumLunas: belum.reduce(function (a, x) { return a + (x.total || 0); }, 0),
      lewatTempo: belum.filter(function (x) { return x.jatuhTempo && x.jatuhTempo < kini; }).length
    };
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    periode: periode, susun: susun, jumlahkan: jumlahkan, pratinjau: pratinjau,
    daftar: daftar, satu: satu, bulanTerbit: bulanTerbit,
    terbitkan: terbitkan, tandaiLunas: tandaiLunas, bukaKembali: bukaKembali,
    hapus: hapus, statistik: statistik, sudahDitagih: sudahDitagih
  };
})();
