/* ==========================================================================
   bangunan.js — bangunan dan lantainya
   --------------------------------------------------------------------------
   TEMPATNYA DI SUSUNAN

     Korporat → Lokasi → Area → Bangunan → Lantai → Ruangan → Objek

   Area adalah PETAK TANAH di dalam lokasi. Di atas petak itu boleh berdiri
   nol, satu, atau beberapa bangunan. Petak yang tidak berbangunan — taman,
   jalan, area parkir — tetap dibersihkan dan menampung objeknya sendiri.

   RUANGAN DAN AREA ADALAH BARIS YANG SAMA

   Keduanya menampung objek, dijadwalkan, dan ditag. Yang membedakan hanya
   tempat menempelnya: area menempel pada LOKASI, ruangan menempel pada
   LANTAI. Karena itu keduanya disimpan di tabel `mcsArea`, dan yang
   menentukan sebutannya di layar adalah ada tidaknya `lantaiId`.

   Standar IFC melakukan hal yang sama: satu entitas IfcSpace melayani ruang
   di dalam gedung maupun ruang terbuka di atas tanah. Memisahkannya menjadi
   dua tabel akan memaksa seluruh jadwal, tugas, foto bukti, dan inspeksi yang
   sudah ada ikut berpindah — risiko besar yang tidak dibayar manfaat apa pun.

   ENAM TINGKAT, DAN SYARATNYA

   Panduan pengelolaan aset menyebut lebih dari enam tingkat menambah beban
   menelusuri tanpa menambah kegunaan. Susunan ini tepat di batas itu, dan
   hanya boleh berada di sana dengan satu syarat yang dipegang seluruh
   berkas ini: TINGKAT YANG KOSONG RUNTUH. Taman tanpa bangunan langsung
   menampilkan objeknya. Bangunan satu lantai tidak menampilkan pilihan
   lantai sama sekali.

   LANTAI DIBUATKAN, BUKAN DIKETIK

   Mengisi "12" sekali harus menghasilkan dua belas lantai. Tetapi "12 lantai"
   di Indonesia jarang berarti Lantai 1 sampai 12: ada basement, ada lobby,
   ada mezanin, dan banyak gedung melompati lantai 4 dan 13. Karena itu yang
   dihasilkan adalah USULAN yang ditampilkan untuk disunting dulu — bukan
   dua belas baris yang harus diperbaiki satu per satu sesudahnya.
   ========================================================================== */
var BANGUNAN = (function () {

  /* ------------------------------------------------------------ bangunan */

  function semua(areaId, termasukNonaktif) {
    return DB.where('mcsBangunan', function (b) {
      return b.areaId === areaId && (termasukNonaktif || b.aktif !== false);
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  /** Seluruh bangunan milik satu korporat, lintas area. */
  function korporat(korporatId, termasukNonaktif) {
    return DB.where('mcsBangunan', function (b) {
      return b.korporatId === korporatId && (termasukNonaktif || b.aktif !== false);
    });
  }

  function satu(id) { return id ? DB.find('mcsBangunan', id) : null; }

  function nama(id) {
    var b = satu(id);
    return b ? b.nama : '';
  }

  function tambah(korporatId, areaId, d) {
    var nm = String(d.nama || '').trim();
    if (!nm) return { error: I18N.t('Nama bangunan belum diisi.') };
    var a = MCS.areaSatu(areaId);
    if (!a) return { error: I18N.t('Area tidak ditemukan.') };
    var kembar = semua(areaId, true).filter(function (b) {
      return b.nama.toLowerCase() === nm.toLowerCase();
    });
    if (kembar.length) return { error: I18N.t('Bangunan dengan nama itu sudah ada di area ini.') };

    var b = DB.insert('mcsBangunan', {
      korporatId: korporatId,
      areaId: areaId,
      nama: nm,
      /* Luas lantai dasar — dipakai memeriksa kewajaran terhadap luas petaknya.
         Bangunan 3.000 m² di atas petak 1.000 m² hampir pasti salah ketik. */
      luasDasar: Math.max(0, Math.round(Number(d.luasDasar) || 0)),
      catatan: String(d.catatan || '').trim(),
      foto: (d.foto || []).slice(),
      aktif: d.aktif !== false
    });
    return { ok: true, bangunan: b };
  }

  function ubah(id, d) {
    var b = satu(id);
    if (!b) return { error: I18N.t('Bangunan tidak ditemukan.') };
    var nm = String(d.nama || '').trim();
    if (!nm) return { error: I18N.t('Nama bangunan belum diisi.') };
    var kembar = semua(b.areaId, true).filter(function (x) {
      return x.id !== id && x.nama.toLowerCase() === nm.toLowerCase();
    });
    if (kembar.length) return { error: I18N.t('Bangunan dengan nama itu sudah ada di area ini.') };
    var isi = { nama: nm, catatan: String(d.catatan || '').trim(), aktif: d.aktif !== false };
    if (d.luasDasar !== undefined) {
      isi.luasDasar = Math.max(0, Math.round(Number(d.luasDasar) || 0));
    }
    if (d.foto !== undefined) isi.foto = (d.foto || []).slice();
    DB.update('mcsBangunan', id, isi);
    return { ok: true, bangunan: satu(id) };
  }

  /**
   * Hapus bangunan.
   *
   * Lantainya ikut terhapus — lantai tidak punya arti di luar bangunannya.
   * RUANGANNYA TIDAK: ia dilepaskan menjadi area biasa di bawah lokasi yang
   * sama, beserta seluruh jadwal, tugas, dan foto buktinya.
   *
   * Menghapus berantai sampai ke ruangan akan membuang berbulan-bulan bukti
   * kebersihan hanya karena seseorang merapikan susunan bangunan — dan itu
   * tidak bisa dibatalkan.
   */
  function hapus(id) {
    var b = satu(id);
    if (!b) return { error: I18N.t('Bangunan tidak ditemukan.') };
    var a = MCS.areaSatu(b.areaId);
    var lokasiId = a ? (a.lokasiId || null) : null;
    var lt = lantai(id, true);
    var nRuang = 0;
    lt.forEach(function (l) {
      ruangan(l.id, true).forEach(function (r) {
        DB.update('mcsArea', r.id, { lantaiId: null, lokasiId: lokasiId });
        nRuang++;
      });
      DB.remove('mcsLantai', l.id);
    });
    DB.remove('mcsBangunan', id);
    return { ok: true, lantaiTerhapus: lt.length, ruangDilepas: nRuang };
  }

  /* -------------------------------------------------------------- lantai */

  function lantai(bangunanId, termasukNonaktif) {
    return DB.where('mcsLantai', function (l) {
      return l.bangunanId === bangunanId && (termasukNonaktif || l.aktif !== false);
    }).sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); });
  }

  function lantaiSatu(id) { return id ? DB.find('mcsLantai', id) : null; }

  function namaLantai(id) {
    var l = lantaiSatu(id);
    return l ? l.nama : '';
  }

  /**
   * Usulan daftar lantai dari jumlah yang diketik.
   *
   * MENGEMBALIKAN USULAN, TIDAK MENYIMPAN. Layar menampilkannya untuk
   * disunting — tambah basement, ganti "Lantai 1" menjadi "Lobby", hapus
   * lantai 4 — lalu barulah disimpan. Menyimpan dua belas baris lebih dulu
   * berarti staf memperbaikinya dua belas kali, dan itu justru pekerjaan
   * yang ingin dihilangkan.
   *
   * @param n         jumlah lantai kerja
   * @param o.basement  berapa lapis basement (B1, B2, …)
   * @param o.lobby     lantai dasar disebut "Lobby", bukan "Lantai 1"
   * @param o.mezanin   ada mezanin di atas lantai dasar
   * @param o.atap      ada rooftop
   * @param o.lewati    daftar angka yang dilompati, mis. [4, 13]
   */
  function usulLantai(n, o) {
    o = o || {};
    n = Math.max(0, Math.round(Number(n) || 0));
    var out = [];
    var urut = 0;

    var nb = Math.max(0, Math.round(Number(o.basement) || 0));
    /* Basement diurutkan dari yang TERDALAM: B2 di bawah B1. Membalik ini
       membuat daftar lantai terbaca terbalik dari kenyataan berdirinya. */
    for (var i = nb; i >= 1; i--) out.push({ nama: 'B' + i, urut: urut++ });

    var lewati = {};
    (o.lewati || []).forEach(function (x) { lewati[Number(x)] = 1; });

    for (var k = 1; k <= n; k++) {
      if (lewati[k]) continue;
      var nm;
      if (k === 1 && o.lobby) nm = 'Lobby';
      else nm = 'Lantai ' + k;
      out.push({ nama: nm, urut: urut++ });
      if (k === 1 && o.mezanin) out.push({ nama: 'Mezanin', urut: urut++ });
    }

    if (o.atap) out.push({ nama: 'Rooftop', urut: urut++ });
    return out;
  }

  /** Simpan daftar lantai hasil suntingan. Menimpa yang ada. */
  function simpanLantai(bangunanId, daftar) {
    var b = satu(bangunanId);
    if (!b) return { error: I18N.t('Bangunan tidak ditemukan.') };
    var isi = (daftar || []).filter(function (x) { return String(x.nama || '').trim(); });
    if (!isi.length) return { error: I18N.t('Isi setidaknya satu lantai.') };

    var nm = {};
    for (var i = 0; i < isi.length; i++) {
      var k = String(isi[i].nama).trim().toLowerCase();
      if (nm[k]) return { error: I18N.t('Nama lantai tidak boleh kembar: ') + isi[i].nama };
      nm[k] = 1;
    }

    /* Lantai yang SUDAH ADA dan namanya masih dipakai dipertahankan beserta
       idnya — kalau dibuat ulang, seluruh ruangan di dalamnya kehilangan
       induknya dan jatuh menjadi area lepas. */
    var lama = lantai(bangunanId, true);
    var petaLama = {};
    lama.forEach(function (l) { petaLama[l.nama.trim().toLowerCase()] = l; });

    var dipakai = {};
    var hasil = [];
    isi.forEach(function (x, i) {
      var kunci = String(x.nama).trim().toLowerCase();
      var ada = petaLama[kunci];
      if (ada) {
        DB.update('mcsLantai', ada.id, { nama: String(x.nama).trim(), urut: i, aktif: true });
        dipakai[ada.id] = 1;
        hasil.push(lantaiSatu(ada.id));
      } else {
        hasil.push(DB.insert('mcsLantai', {
          korporatId: b.korporatId, bangunanId: bangunanId,
          nama: String(x.nama).trim(), urut: i, aktif: true
        }));
      }
    });

    /* Lantai yang hilang dari daftar: ruangannya dilepaskan lebih dulu, baru
       lantainya dihapus. Urutan terbalik akan meninggalkan ruangan yang
       menunjuk lantai yang sudah tidak ada — dan ia lenyap dari setiap layar
       tanpa pernah dihapus. */
    var a = MCS.areaSatu(b.areaId);
    var lokasiId = a ? (a.lokasiId || null) : null;
    var dilepas = 0;
    lama.forEach(function (l) {
      if (dipakai[l.id]) return;
      ruangan(l.id, true).forEach(function (r) {
        DB.update('mcsArea', r.id, { lantaiId: null, lokasiId: lokasiId });
        dilepas++;
      });
      DB.remove('mcsLantai', l.id);
    });

    return { ok: true, lantai: hasil, ruangDilepas: dilepas };
  }

  function hapusLantai(id) {
    var l = lantaiSatu(id);
    if (!l) return { error: I18N.t('Lantai tidak ditemukan.') };
    var b = satu(l.bangunanId);
    var a = b ? MCS.areaSatu(b.areaId) : null;
    var r = ruangan(id, true);
    r.forEach(function (x) {
      DB.update('mcsArea', x.id, { lantaiId: null, lokasiId: a ? (a.lokasiId || null) : null });
    });
    DB.remove('mcsLantai', id);
    return { ok: true, ruangDilepas: r.length };
  }

  /* ------------------------------------------------------------- ruangan */

  /** Ruangan = baris mcsArea yang menempel pada satu lantai. */
  function ruangan(lantaiId, termasukNonaktif) {
    return DB.where('mcsArea', function (a) {
      return a.lantaiId === lantaiId && (termasukNonaktif || a.aktif !== false);
    });
  }

  /** Seluruh ruangan di dalam satu bangunan, lintas lantai. */
  function ruanganBangunan(bangunanId) {
    var out = [];
    lantai(bangunanId).forEach(function (l) {
      ruangan(l.id).forEach(function (r) { out.push(r); });
    });
    return out;
  }

  /**
   * Pindahkan ruangan ke lantai lain — atau lepaskan menjadi area biasa.
   *
   * `lokasiId` ikut ditulis dari rantai induknya. Ia memang berlebihan —
   * bisa ditelusuri lewat lantai → bangunan → area → lokasi — tetapi seluruh
   * rekap per lokasi, biaya per lokasi, dan portofolio membacanya langsung.
   * Menelusuri rantai pada tiap baris di setiap layar berarti membayar empat
   * pencarian untuk sesuatu yang berubah sekali setahun.
   */
  function pindahkanRuangan(areaId, lantaiId) {
    var r = MCS.areaSatu(areaId);
    if (!r) return { error: I18N.t('Ruangan tidak ditemukan.') };
    if (!lantaiId) {
      DB.update('mcsArea', areaId, { lantaiId: null });
      return { ok: true };
    }
    var l = lantaiSatu(lantaiId);
    if (!l) return { error: I18N.t('Lantai tidak ditemukan.') };
    var b = satu(l.bangunanId);
    var a = b ? MCS.areaSatu(b.areaId) : null;
    DB.update('mcsArea', areaId, {
      lantaiId: lantaiId,
      lokasiId: a ? (a.lokasiId || null) : null
    });
    return { ok: true };
  }

  /* ------------------------------------------------------------- menyalin
     "Lantai 3 sama dengan lantai 2" adalah pola paling umum di gedung
     bertingkat, dan tidak ada aplikasi yang layak memaksa orang mengetiknya
     dua belas kali. */

  /**
   * Salin seluruh ruangan satu lantai ke lantai lain, beserta objeknya.
   *
   * YANG IKUT: nama, jenis, luas, langkah pembersihan, dan seluruh objek.
   * YANG TIDAK: jadwal, tugas, foto bukti, inspeksi, aduan, dan kode pindai.
   *
   * Riwayat tidak ikut karena ia milik ruangan aslinya — menyalinnya berarti
   * lantai 5 lahir dengan bukti kebersihan yang tidak pernah terjadi di sana.
   * Kode pindai tidak ikut karena tag harus unik: dua ruangan berkode sama
   * membuat setiap pemindaian menunjuk ke tempat yang salah, dan itu
   * merusak justru bukti kehadiran yang paling dipercaya.
   *
   * Ruangan yang NAMANYA SUDAH ADA di lantai tujuan dilewati, bukan
   * digandakan. Menjalankan penyalinan dua kali karena ragu adalah hal yang
   * wajar dilakukan orang, dan hasilnya tidak boleh dua puluh empat toilet.
   */
  function salinRuangan(dariLantaiId, keLantaiIds) {
    var asal = lantaiSatu(dariLantaiId);
    if (!asal) return { error: I18N.t('Lantai tidak ditemukan.') };
    var sumber = ruangan(dariLantaiId);
    if (!sumber.length) return { error: I18N.t('Lantai ini belum punya ruangan untuk disalin.') };

    var hasil = { lantai: 0, ruangan: 0, objek: 0, dilewati: 0 };
    (keLantaiIds || []).forEach(function (tujuanId) {
      if (tujuanId === dariLantaiId) return;
      var tujuan = lantaiSatu(tujuanId);
      if (!tujuan || tujuan.bangunanId !== asal.bangunanId) return;

      var adaNama = {};
      ruangan(tujuanId, true).forEach(function (r) {
        adaNama[String(r.nama).trim().toLowerCase()] = 1;
      });

      var adaYangMasuk = false;
      sumber.forEach(function (r) {
        if (adaNama[String(r.nama).trim().toLowerCase()]) { hasil.dilewati++; return; }
        var baru = MCS.tambahArea(r.korporatId, {
          nama: r.nama, jenis: r.jenis, luas: r.luas,
          lantaiId: tujuanId,
          /* Langkah pembersihan ikut: ia sifat ruangannya, bukan riwayatnya.
             Toilet di lantai 3 dan lantai 5 dibersihkan dengan cara yang sama. */
          checklist: (r.checklist || []).slice(),
          wajibFoto: !!r.wajibFoto,
          wajibLangkah: !!r.wajibLangkah,
          wajibFotoLangkah: !!r.wajibFotoLangkah,
          catatan: r.catatan || ''
        });
        if (baru.error || !baru.area) return;
        hasil.ruangan++;
        adaYangMasuk = true;
        MCS.objek(r.id).forEach(function (o) {
          var ro = MCS.tambahObjek(baru.area.id, {
            nama: o.nama, jenis: o.jenis, urut: o.urut,
            wajibPindai: !!o.wajibPindai, catatan: o.catatan || ''
          });
          if (!ro.error) hasil.objek++;
        });
      });
      if (adaYangMasuk) hasil.lantai++;
    });
    return { ok: true, hasil: hasil };
  }

  /* --------------------------------------------------------------- jalur */

  /**
   * Jejak lengkap satu ruangan atau area, dari lokasi ke bawah.
   *
   * Dipakai di kepala layar dan di lembar cetak: petugas yang menerima tugas
   * "Toilet Pria" perlu tahu toilet pria yang mana, dan nama saja tidak pernah
   * cukup di gedung yang punya dua puluh toilet.
   */
  function jalur(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return null;
    var out = { area: a, ruangan: null, lantai: null, bangunan: null,
                petak: null, lokasi: null };
    if (a.lantaiId) {
      out.ruangan = a;
      out.lantai = lantaiSatu(a.lantaiId);
      out.bangunan = out.lantai ? satu(out.lantai.bangunanId) : null;
      out.petak = out.bangunan ? MCS.areaSatu(out.bangunan.areaId) : null;
      out.lokasi = out.petak && window.LOKASI ? LOKASI.satu(out.petak.lokasiId) : null;
    } else {
      out.petak = a;
      out.lokasi = window.LOKASI ? LOKASI.satu(a.lokasiId) : null;
    }
    return out;
  }

  /** Jejak sebagai teks, dari luar ke dalam. */
  function jalurTeks(areaId, pemisah) {
    var j = jalur(areaId);
    if (!j) return '';
    var bag = [];
    if (j.lokasi) bag.push(j.lokasi.nama);
    if (j.petak && j.petak !== j.area) bag.push(j.petak.nama);
    if (j.bangunan) bag.push(j.bangunan.nama);
    if (j.lantai) bag.push(j.lantai.nama);
    bag.push(j.area.nama);
    return bag.join(pemisah || ' › ');
  }

  /** Apakah baris mcsArea ini sebuah ruangan (di dalam bangunan) atau petak. */
  function adalahRuangan(a) { return !!(a && a.lantaiId); }

  /* ------------------------------------------------------------ ringkasan */

  function statistik(korporatId) {
    var b = korporat(korporatId);
    var nLantai = 0, nRuang = 0, luasDasar = 0, tanpaLantai = 0;
    b.forEach(function (x) {
      var lt = lantai(x.id);
      if (!lt.length) tanpaLantai++;
      nLantai += lt.length;
      nRuang += ruanganBangunan(x.id).length;
      luasDasar += Number(x.luasDasar) || 0;
    });
    return { bangunan: b.length, lantai: nLantai, ruangan: nRuang,
             luasDasar: luasDasar, tanpaLantai: tanpaLantai };
  }

  return {
    semua: semua, korporat: korporat, satu: satu, nama: nama,
    tambah: tambah, ubah: ubah, hapus: hapus,
    lantai: lantai, lantaiSatu: lantaiSatu, namaLantai: namaLantai,
    usulLantai: usulLantai, simpanLantai: simpanLantai, hapusLantai: hapusLantai,
    ruangan: ruangan, ruanganBangunan: ruanganBangunan, salinRuangan: salinRuangan,
    pindahkanRuangan: pindahkanRuangan,
    jalur: jalur, jalurTeks: jalurTeks, adalahRuangan: adalahRuangan,
    statistik: statistik
  };
})();
