/* ==========================================================================
   keranjangjasa.js — keranjang untuk pemesanan jasa keahlian
   --------------------------------------------------------------------------
   KENAPA JASA PERLU KERANJANG

   Belanja barang butuh keranjang karena orang membeli banyak hal sekaligus.
   Jasa keahlian butuh keranjang karena alasan yang berbeda: satu acara sering
   memerlukan LEBIH DARI SATU ORANG. Hajatan 200 porsi tidak dikerjakan satu
   juru masak, dan memaksa klien menyelesaikan pemesanan satu per satu berarti
   ia mengisi tanggal, jam, dan alamat yang sama berulang kali — lalu membayar
   berkali-kali untuk satu acara yang sama.

   SATU BARIS KERANJANG = SATU ORANG YANG DIPESAN

   Tiap baris memuat pemesanan yang utuh: kapan, di mana, masakan apa, berapa
   porsi, dan SIAPA. Bukan sekadar "juru masak × 2" — karena yang dipilih klien
   adalah orang tertentu dengan wajah dan nilainya sendiri, dan ongkos jalan
   tiap orang berbeda menurut jarak rumahnya masing-masing.

   HARGA DIHITUNG ULANG, TIDAK DISIMPAN

   Baris keranjang hanya menyimpan pilihan; angkanya dihitung ulang setiap kali
   ditampilkan. Keranjang bisa mengendap berhari-hari, dan harga yang dibekukan
   di dalamnya akan diam-diam berbeda dari katalog saat checkout. Yang dibekukan
   adalah harga pada PESANAN, bukan pada keranjang.

   CHECKOUT TIDAK PERNAH SETENGAH DIAM-DIAM

   Bila satu baris gagal — mitranya keburu terisi — baris lain tetap diproses
   dan yang gagal TETAP DI KERANJANG beserta alasannya. Menghapusnya diam-diam
   berarti klien mengira sudah memesan tiga orang padahal hanya dua yang jadi,
   dan ia baru tahu di hari acara.
   ========================================================================== */
var KJASA = (function () {
  'use strict';

  var TABEL = 'keranjangJasa';

  /* ================================================================ BACA */

  function baris(userId) {
    return DB.where(TABEL, function (r) { return r.userId === userId; })
      .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
  }

  /** Satu baris keranjang lengkap dengan hitungan harganya saat ini. */
  function lengkapi(r) {
    var svc = BIZ.svc(r.serviceId);
    var mitra = r.workerId ? DB.find('users', r.workerId) : null;
    var h = KEAHLIAN.hitung({
      serviceId: r.serviceId,
      items: r.items || [],
      workerId: r.workerId,
      koordinat: r.koordinat
    });

    /* Sebab baris ini belum bisa di-checkout. Diperiksa di sini supaya
       tombolnya dan alasannya selalu berasal dari satu sumber. */
    var sebab = null;
    if (!svc || svc.aktif === false) sebab = I18N.t('Layanan ini sudah tidak ditawarkan.');
    else if (!h.sah) sebab = h.sebab;
    else if (!mitra || mitra.aktif === false) sebab = I18N.t('Mitra yang dipilih sudah tidak aktif.');
    else if (h.km === null) sebab = I18N.t('Titik lokasi acara belum ditandai di peta.');
    else if (BIZ.bentrok(null, r.tgl, r.mulai, r.selesai, [r.workerId]).length) {
      sebab = I18N.t('Mitra ini sudah terisi di jam tersebut. Ganti mitra atau ubah jamnya.');
    } else if (KEAHLIAN.tertahan(r.workerId, r.tgl, r.mulai, r.selesai).length) {
      sebab = I18N.t('Mitra ini sedang menunggu jawaban untuk permintaan lain di jam yang sama.');
    }

    return Object.assign({}, r, {
      layanan: svc || null,
      mitra: mitra ? { id: mitra.id, nama: mitra.nama, foto: mitra.foto || null,
                       jabatan: mitra.jabatan || '' } : null,
      hitung: h, siap: !sebab, sebab: sebab
    });
  }

  function isi(userId) { return baris(userId).map(lengkapi); }

  function jumlah(userId) { return baris(userId).length; }

  /** Ringkasan seluruh keranjang. Hanya baris yang siap ikut dijumlahkan. */
  function ringkas(userId) {
    var list = isi(userId);
    var siap = list.filter(function (x) { return x.siap; });
    return {
      baris: list, siap: siap.length, bermasalah: list.length - siap.length,
      jasa: U.sum(siap, function (x) { return x.hitung.jasa || 0; }),
      transport: U.sum(siap, function (x) { return x.hitung.transport || 0; }),
      asuransi: U.sum(siap, function (x) { return x.hitung.asuransi || 0; }),
      biayaLayanan: U.sum(siap, function (x) { return x.hitung.biayaLayanan || 0; }),
      total: U.sum(siap, function (x) { return x.hitung.total || 0; }),
      porsi: U.sum(siap, function (x) { return x.hitung.porsiTotal || 0; })
    };
  }

  /* ================================================================ UBAH */

  function periksaDraf(d) {
    var svc = BIZ.svc(d.serviceId);
    if (!KEAHLIAN.adalah(svc)) return I18N.t('Layanan keahlian tidak ditemukan.');
    if (svc.aktif === false) return I18N.t('Layanan ini sedang tidak ditawarkan.');
    if (!d.tgl) return I18N.t('Tanggal pelaksanaan belum dipilih.');
    if (!d.mulai || !d.selesai) return I18N.t('Jam pelaksanaan belum lengkap.');
    if (d.selesai <= d.mulai) return I18N.t('Jam selesai harus setelah jam mulai.');
    if (!d.alamat) return I18N.t('Alamat pelaksanaan belum diisi.');
    if (!window.MAPS || !MAPS.valid(d.koordinat)) {
      return I18N.t('Tandai titik lokasi acara di peta — ongkos jalan mitra dihitung dari sana.');
    }
    if (!d.workerId) return I18N.t('Pilih dulu mitra yang akan mengerjakan.');
    var h = KEAHLIAN.hitung(d);
    if (!h.sah) return h.sebab;
    return null;
  }

  /**
   * Masukkan satu pemesanan ke keranjang.
   *
   * Orang yang sama tidak boleh masuk dua kali untuk jam yang bertabrakan —
   * bukan aturan administratif, melainkan karena ia memang tidak bisa berada
   * di dua tempat sekaligus, dan checkout pasti menolak yang kedua.
   */
  function tambah(userId, d) {
    var sebab = periksaDraf(d);
    if (sebab) return { error: sebab };

    var kembar = baris(userId).filter(function (r) {
      return r.workerId === d.workerId && r.tgl === d.tgl &&
             !(d.selesai <= r.mulai || d.mulai >= r.selesai);
    });
    if (kembar.length) return { error: I18N.t('Mitra ini sudah ada di keranjang untuk jam yang sama.') };

    if (BIZ.bentrok(null, d.tgl, d.mulai, d.selesai, [d.workerId]).length) {
      return { error: I18N.t('Mitra ini sudah punya pekerjaan lain di jam tersebut.') };
    }

    var r = DB.insert(TABEL, {
      userId: userId, serviceId: d.serviceId,
      tgl: d.tgl, mulai: d.mulai, selesai: d.selesai,
      alamatId: d.alamatId || null, alamat: d.alamat, koordinat: d.koordinat,
      items: (d.items || []).map(function (x) {
        return { menuId: x.menuId, porsi: Math.max(1, Math.round(x.porsi || 0)) }; }),
      catatan: d.catatan || '',
      workerId: d.workerId,
      kontak: d.kontak || null
    });
    return { ok: true, baris: lengkapi(r) };
  }

  function hapus(userId, id) {
    var r = DB.find(TABEL, id);
    if (!r || r.userId !== userId) return { error: I18N.t('Baris keranjang tidak ditemukan.') };
    DB.remove(TABEL, id);
    return { ok: true };
  }

  function kosongkan(userId) {
    baris(userId).forEach(function (r) { DB.remove(TABEL, r.id); });
    return { ok: true };
  }

  function ubahPorsi(userId, id, menuId, porsi) {
    var r = DB.find(TABEL, id);
    if (!r || r.userId !== userId) return { error: I18N.t('Baris keranjang tidak ditemukan.') };
    var n = Math.max(0, Math.round(porsi || 0));
    var items = (r.items || []).map(function (x) {
      return x.menuId === menuId ? { menuId: menuId, porsi: n } : x;
    }).filter(function (x) { return x.porsi > 0; });
    if (!items.length) return { error: 'Setidaknya satu jenis masakan harus tersisa.' };
    DB.update(TABEL, id, { items: items });
    return { ok: true, baris: lengkapi(DB.find(TABEL, id)) };
  }

  function gantiMitra(userId, id, workerId) {
    var r = DB.find(TABEL, id);
    if (!r || r.userId !== userId) return { error: I18N.t('Baris keranjang tidak ditemukan.') };
    if (BIZ.bentrok(null, r.tgl, r.mulai, r.selesai, [workerId]).length) {
      return { error: I18N.t('Mitra ini sudah punya pekerjaan lain di jam tersebut.') };
    }
    var kembar = baris(userId).filter(function (x) {
      return x.id !== id && x.workerId === workerId && x.tgl === r.tgl &&
             !(r.selesai <= x.mulai || r.mulai >= x.selesai);
    });
    if (kembar.length) return { error: I18N.t('Mitra ini sudah ada di keranjang untuk jam yang sama.') };
    DB.update(TABEL, id, { workerId: workerId });
    return { ok: true, baris: lengkapi(DB.find(TABEL, id)) };
  }

  /* ================================================================ CHECKOUT */

  /**
   * Ubah isi keranjang menjadi pesanan.
   *
   * Tiap baris berdiri sendiri: yang berhasil menjadi pesanan dan keluar dari
   * keranjang, yang gagal TETAP di keranjang bersama alasannya. Laporan
   * dikembalikan utuh — pemanggil wajib menampilkan kegagalannya, bukan
   * sekadar menghitung yang berhasil.
   */
  function checkout(userId, opsi) {
    opsi = opsi || {};
    var list = isi(userId);
    if (!list.length) return { error: I18N.t('Keranjang masih kosong.') };

    var jadi = [], gagal = [];
    list.forEach(function (r) {
      if (!r.siap) { gagal.push({ id: r.id, sebab: r.sebab }); return; }
      try {
        var o = KEAHLIAN.buat(userId, {
          serviceId: r.serviceId,
          tgl: r.tgl, mulai: r.mulai, selesai: r.selesai,
          alamat: r.alamat, koordinat: r.koordinat,
          items: r.items, catatan: r.catatan,
          workerId: r.workerId, kontak: r.kontak,
          metodeBayar: opsi.metodeBayar || ''
        });
        jadi.push(o);
        DB.remove(TABEL, r.id);
      } catch (e) {
        gagal.push({ id: r.id, sebab: e.message });
      }
    });

    return { ok: jadi.length > 0, pesanan: jadi, gagal: gagal,
             sisaDiKeranjang: jumlah(userId) };
  }

  return {
    TABEL: TABEL,
    isi: isi, jumlah: jumlah, ringkas: ringkas, lengkapi: lengkapi,
    periksaDraf: periksaDraf, tambah: tambah, hapus: hapus, kosongkan: kosongkan,
    ubahPorsi: ubahPorsi, gantiMitra: gantiMitra, checkout: checkout
  };
})();
