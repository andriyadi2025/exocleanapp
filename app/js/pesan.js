/* ==========================================================================
   pesan.js — pemesanan layanan langsung, tanpa survei
   --------------------------------------------------------------------------
   KENAPA ADA DUA JALAN MASUK, BUKAN SATU

   Sebagian besar layanan EXOCLEAN memang perlu dilihat dulu: cuci fasad
   gedung, poles marmer lobi, pembersihan pasca-renovasi. Harganya bergantung
   luas, ketinggian, dan tingkat kotor yang tidak bisa ditebak dari layar.
   Untuk itu jalannya tetap: permintaan → survei → penawaran → disetujui.

   Tetapi sebagian lain punya harga yang sudah pasti — dihitung per jam, per
   sesi, atau per unit. Memaksa layanan itu lewat survei berarti membuat
   pelanggan menunggu dua hari untuk sesuatu yang harganya sudah tertulis di
   katalog. Yang terjadi berikutnya bukan pelanggan yang sabar menunggu,
   melainkan pelanggan yang menelepon pesaing.

   Karena itu: layanan yang HARGANYA SUDAH PASTI bisa dipesan langsung, dan
   survei tetap ditawarkan sebagai pilihan bagi yang ingin dilihat dulu.

   SURVEI ADALAH PILIHAN KLIEN, BUKAN KEPUTUSAN SISTEM

   `svc.survei` menyatakan bahwa harganya BELUM bisa dipastikan — itu fakta
   tentang layanannya, bukan larangan. Untuk layanan berharga tetap, klien
   tetap boleh meminta survei lebih dulu bila ia ragu. Sistem tidak pernah
   memaksa ke arah sebaliknya: layanan tanpa harga tidak bisa dipesan langsung,
   karena memesan sesuatu tanpa tahu harganya bukan pilihan yang boleh
   ditawarkan kepada siapa pun.

   HARGA DIKUNCI SAAT PESANAN DIBUAT

   Tarif katalog, tarif tambahan, dan selisih tarif petugas semuanya disalin ke
   pesanan. Admin boleh mengubah katalog kapan saja; yang mengikat adalah angka
   yang dilihat pelanggan ketika ia menekan Pesan.
   ========================================================================== */
var PESAN = (function () {
  'use strict';

  var BAWAAN = {
    aktif: true,
    biayaLayanan: 10000,        /* biaya tetap per pesanan */
    garansiHari: 7,
    /* Durasi yang ditawarkan untuk layanan berbasis jam. */
    durasiJam: [1, 2, 3, 4, 5, 6],
    /* Selisih tarif menurut nilai petugas. Petugas bernilai tinggi lebih
       mahal, yang bernilai rendah lebih murah — pelanggan memilih sendiri
       antara harga dan rekam jejak. */
    tarifPetugas: {
      aktif: true,
      ambangTinggi: 4.7, tambahTinggi: 10000,
      ambangRendah: 3.5, kurangRendah: -10000,
      minUlasan: 3           /* di bawah ini, selisih tidak diberlakukan */
    },
    /* Pertanyaan yang menentukan kesiapan lokasi. Jawabannya ikut ke pesanan
       supaya petugas tahu harus membawa apa. */
    pertanyaan: [
      { id: 'vacuum', teks: 'Apakah Anda punya vacuum cleaner?', wajib: true },
      { id: 'parkir', teks: 'Apakah tersedia tempat parkir?', wajib: true },
      { id: 'air',    teks: 'Apakah tersedia sumber air dan listrik?', wajib: true }
    ]
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.pesan) { s.pesan = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.pesan;
    Object.keys(BAWAAN).forEach(function (k) {
      if (c[k] === undefined) c[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    return c;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ======================================================= BISA LANGSUNG? */

  /**
   * Layanan ini bisa dipesan tanpa survei.
   *
   * Syaratnya satu: harganya sudah pasti. Bukan karena aturan administratif,
   * melainkan karena pesanan tanpa harga tidak bisa dikonfirmasi, tidak bisa
   * dibayar, dan tidak bisa dijanjikan kepada siapa pun.
   */
  function bisaLangsung(svc) {
    if (!svc || svc.aktif === false) return false;
    /* Jasa keahlian punya alurnya sendiri (keahlian.js): harganya lahir dari
       jenis pekerjaan dan jumlah porsi, dan mitranya dipilih klien lalu
       berhak menolak. Melewatkannya ke sini akan menagih tarif porsi
       termurah dikali jumlah satuan — angka yang tidak berarti apa-apa. */
    if (window.KEAHLIAN && KEAHLIAN.adalah(svc)) return false;
    if (svc.survei) return false;
    return (svc.hargaMin || 0) > 0;
  }

  /** Alasan sebuah layanan tidak bisa dipesan langsung — untuk ditampilkan. */
  function sebabTakLangsung(svc) {
    if (!svc) return I18N.t('Layanan tidak ditemukan.');
    if (svc.aktif === false) return I18N.t('Layanan ini sedang tidak ditawarkan.');
    if (svc.survei || !(svc.hargaMin > 0)) {
      return I18N.t('Harga layanan ini ditentukan setelah tim melihat lokasinya —') + ' ' +
             I18N.t('luas, ketinggian, dan tingkat kotor terlalu berbeda antar tempat') + ' ' +
             I18N.t('untuk dipatok dari layar.');
    }
    return null;
  }

  /** Layanan yang bisa dipesan langsung, untuk daftar pilihan cepat. */
  function katalogLangsung() {
    return DB.all('services').filter(function (s) {
      return s.tipe === 'layanan' && bisaLangsung(s);
    });
  }

  /**
   * Satuan layanan menentukan bentuk pemilihannya di layar.
   * Layanan per jam atau per sesi ditawarkan dengan pilihan durasi; sisanya
   * dengan jumlah satuan (m², unit, titik).
   */
  function berbasisJam(svc) {
    var s = String(svc && svc.satuan || '').toLowerCase();
    return s.indexOf('jam') >= 0 || s.indexOf('sesi') >= 0;
  }

  /* ================================================================ HARGA */

  /**
   * Layanan tambahan yang bisa ditempelkan pada satu pesanan.
   *
   * Diambil dari katalog yang SAMA — bukan daftar terpisah. Daftar tambahan
   * yang berdiri sendiri akan menyimpan harga yang berbeda dari katalognya
   * begitu admin mengubah salah satunya, dan yang ketahuan belakangan adalah
   * pelanggan ditagih angka yang tidak ada di mana pun.
   */
  function tambahanUntuk(svc) {
    return katalogLangsung().filter(function (s) {
      return s.id !== (svc && svc.id) && (s.hargaMin || 0) > 0;
    }).slice(0, 8);
  }

  /**
   * Nilai rata-rata petugas dari ulasan yang SUNGGUH ada.
   * Mengembalikan null bila belum pernah dinilai — bukan nol, dan bukan angka
   * karangan. Petugas baru tidak boleh terlihat buruk atas sesuatu yang belum
   * pernah terjadi.
   */
  function nilaiPetugas(workerId) {
    var n = 0, jml = 0;
    DB.all('orders').forEach(function (o) {
      if ((o.workerIds || []).indexOf(workerId) < 0) return;
      var r = DB.where('ratings', { orderId: o.id })[0];
      if (!r) return;
      jml += r.bintang; n++;
    });
    if (!n) return null;
    return { rata: Math.round(jml / n * 10) / 10, jumlah: n };
  }

  /** Selisih tarif karena nilai petugas. Nol bila ulasannya belum cukup. */
  function selisihPetugas(workerId) {
    var c = config().tarifPetugas;
    if (!c.aktif) return 0;
    var v = nilaiPetugas(workerId);
    if (!v || v.jumlah < (c.minUlasan || 0)) return 0;
    if (v.rata >= c.ambangTinggi) return c.tambahTinggi || 0;
    if (v.rata <= c.ambangRendah) return c.kurangRendah || 0;
    return 0;
  }

  /**
   * Petugas yang benar-benar bisa mengambil pekerjaan ini.
   *
   * Disaring tiga lapis: mitra aktif, tersertifikasi untuk fungsi kerja
   * layanannya, dan tidak bentrok jadwal. Menawarkan petugas yang tidak lolos
   * salah satunya berarti menawarkan pilihan yang akan dibatalkan sesudahnya —
   * dan pembatalan sesudah memilih jauh lebih mengecewakan daripada pilihan
   * yang memang tidak ada.
   */
  function petugasTersedia(serviceId, tgl, mulai, selesai) {
    var svc = BIZ.svc(serviceId);
    if (!svc) return [];
    var semu = { serviceIds: [serviceId] };
    var calon = window.KOMPETENSI ? KOMPETENSI.mitraUntukOrder(semu) : BIZ.mitraAktif();

    return calon.filter(function (u) {
      if (!tgl) return true;
      var b = BIZ.bentrok(null, tgl, mulai, selesai, [u.id]);
      return !b.length;
    }).map(function (u) {
      var v = nilaiPetugas(u.id);
      return {
        id: u.id, nama: u.nama, foto: u.foto || null,
        nilai: v, selisih: selisihPetugas(u.id),
        jabatan: u.jabatan || ''
      };
    }).sort(function (a, b) {
      return ((b.nilai && b.nilai.rata) || 0) - ((a.nilai && a.nilai.rata) || 0);
    });
  }

  /**
   * Hitung tagihan satu pesanan langsung.
   *
   * Urutannya sengaja sama dengan pesanan toko: potongan dulu, lalu biaya
   * tetap, lalu poin sebagai alat bayar paling akhir. Dua alur yang menghitung
   * dengan urutan berbeda akan menghasilkan dua struk yang tidak bisa
   * dijelaskan berdampingan.
   */
  function hitung(p) {
    p = p || {};
    var c = config();
    var svc = BIZ.svc(p.serviceId);
    if (!svc) return { total: 0, sah: false, sebab: I18N.t('Layanan tidak ditemukan.') };

    var qty = Math.max(1, Math.round(p.qty || 1));
    var dasar = (svc.hargaMin || 0) * qty;

    var tambahan = (p.tambahan || []).map(function (t) {
      var s = BIZ.svc(t.serviceId);
      var n = Math.max(1, Math.round(t.qty || 1));
      return { serviceId: t.serviceId, nama: s ? s.nama : '—',
               qty: n, harga: s ? (s.hargaMin || 0) : 0,
               subtotal: (s ? (s.hargaMin || 0) : 0) * n };
    });
    var subTambahan = U.sum(tambahan, function (t) { return t.subtotal; });

    var extraJam = Math.max(0, Math.round(p.extraJam || 0));
    var subExtra = extraJam * (svc.hargaMin || 0);

    var selisih = p.workerId ? selisihPetugas(p.workerId) : 0;

    var subtotal = dasar + subTambahan + subExtra + selisih;
    var diskon = Math.min(Math.max(0, p.diskon || 0), subtotal);
    var setelahDiskon = subtotal - diskon;
    var biayaLayanan = c.biayaLayanan || 0;
    var sebelumPoin = setelahDiskon + biayaLayanan;
    var poinRp = Math.min(Math.max(0, p.poinRupiah || 0), sebelumPoin);

    return {
      sah: true,
      layanan: { nama: svc.nama, harga: svc.hargaMin || 0, satuan: svc.satuan, qty: qty },
      dasar: dasar, tambahan: tambahan, subTambahan: subTambahan,
      extraJam: extraJam, subExtra: subExtra,
      selisihPetugas: selisih,
      subtotal: subtotal, diskon: diskon,
      biayaLayanan: biayaLayanan, poinRupiah: poinRp,
      total: Math.max(0, sebelumPoin - poinRp),
      garansiHari: c.garansiHari || 0
    };
  }

  /* ================================================================ BUAT */

  /**
   * Buat pesanan layanan langsung.
   *
   * Pesanan lahir sebagai `dijadwalkan` dengan CHECKLIST yang diturunkan dari
   * layanannya — inilah yang membuat alur lapangan punya isi. Tanpa itu,
   * petugas tiba di lokasi tanpa tahu apa yang harus dikerjakan dan supervisor
   * tidak punya apa pun untuk diverifikasi.
   */
  function buat(clientId, d) {
    var svc = BIZ.svc(d.serviceId);
    if (!svc) throw new Error(I18N.t('Layanan tidak ditemukan.'));
    if (!bisaLangsung(svc)) throw new Error(sebabTakLangsung(svc));
    if (!d.tgl || !d.mulai) throw new Error(I18N.t('Tanggal dan jam mulai belum dipilih.'));

    var h = hitung(d);
    if (!h.sah) throw new Error(h.sebab);

    /* Seluruh layanan yang dikerjakan — utama dan tambahan — ikut ke pesanan,
       supaya checklistnya lengkap dan bukan hanya milik layanan utamanya. */
    var serviceIds = [d.serviceId].concat((d.tambahan || []).map(function (t) { return t.serviceId; }));

    var o = BIZ.buatOrder({
      clientId: clientId,
      judul: svc.nama + (h.tambahan.length ? ' + ' + h.tambahan.length + ' layanan tambahan' : ''),
      alamat: d.alamat, koordinat: d.koordinat || null,
      serviceIds: serviceIds,
      tgl: d.tgl, mulai: d.mulai, selesai: d.selesai,
      workerIds: d.workerId ? [d.workerId] : [],
      supervisorId: d.supervisorId || null,
      nilai: h.total
    });

    /* Rincian dibekukan pada pesanan: harga katalog boleh berubah besok, yang
       mengikat adalah yang dilihat pelanggan hari ini. */
    DB.update('orders', o.id, {
      jalur: 'langsung',
      rincian: h,
      kontak: d.kontak || null,
      catatan: d.catatan || '',
      jawaban: d.jawaban || {},
      metodeBayar: d.metodeBayar || '',
      garansiHari: h.garansiHari,
      poinDipakai: d.poinDipakai || 0,
      poinRupiah: h.poinRupiah
    });

    if (window.INSENTIF && d.poinDipakai) {
      try {
        INSENTIF.potongPoin(clientId, d.poinDipakai, { tipe: 'order', id: o.id },
          I18N.t('Dipakai pada pesanan') + ' ' + o.no);
      } catch (e) {
        DB.update('orders', o.id, { poinDipakai: 0, poinRupiah: 0,
          nilai: h.total + h.poinRupiah });
        DB.log(clientId, 'Poin tidak jadi dipakai pada ' + o.no + ' — ' + e.message,
          'order', o.id);
      }
    }

    DB.log(clientId, 'Memesan langsung ' + o.no + ' — ' + svc.nama, 'order', o.id);
    return DB.find('orders', o.id);
  }

  /**
   * Klien meminta survei untuk layanan apa pun — termasuk yang sebenarnya
   * berharga tetap. Ini jalan lama, dan tetap terbuka.
   */
  function mintaSurvei(clientId, d) {
    return BIZ.buatBooking(clientId, {
      alamat: d.alamat,
      items: [{ serviceId: d.serviceId, qty: d.qty || 1, catatan: d.catatan || '' }],
      tglHarapan: d.tgl || U.today(),
      catatan: d.catatan || ''
    });
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig,
    bisaLangsung: bisaLangsung, sebabTakLangsung: sebabTakLangsung,
    katalogLangsung: katalogLangsung, berbasisJam: berbasisJam,
    tambahanUntuk: tambahanUntuk,
    nilaiPetugas: nilaiPetugas, selisihPetugas: selisihPetugas,
    petugasTersedia: petugasTersedia,
    hitung: hitung, buat: buat, mintaSurvei: mintaSurvei
  };
})();
