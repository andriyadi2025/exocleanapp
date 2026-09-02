/* ==========================================================================
   ronda.js — rute ronda: titik berurutan dengan waktu tempuh yang diharapkan
   --------------------------------------------------------------------------
   BEDANYA DENGAN JADWAL BIASA

   Jadwal MCS berbunyi: "area ini, petugas ini, jam segini". Ronda berbunyi:
   "berangkat 08:00, lewati enam titik ini BERURUTAN, selesai dalam 45 menit".

   Perbedaannya bukan tata bahasa. Jadwal memeriksa apakah tiap area disentuh;
   ronda memeriksa apakah seseorang benar-benar BERJALAN MENYUSURI gedung.

   KENAPA ITU PENTING

   Sistem pemindaian tag yang sudah ada bisa dikalahkan dengan satu cara yang
   sederhana: memindai semua tag sekaligus dari satu tempat — entah karena
   tagnya difoto, atau karena orangnya berjalan cepat menyentuh semua QR tanpa
   mengerjakan apa pun. Pemindaian per area tidak bisa membedakannya.

   Ronda bisa, karena ia menyimpan JARAK ANTARWAKTU. Enam titik yang terpindai
   dalam empat puluh detik bukan ronda — dan itu terlihat dari datanya sendiri
   tanpa perlu menuduh siapa pun.

   YANG TETAP TIDAK BISA DIDETEKSI, DAN DISEBUT APA ADANYA

   Orang yang benar-benar berjalan menyusuri enam titik dengan santai, memindai
   semuanya pada waktu yang wajar, tetapi tidak membersihkan apa pun, akan
   lolos sepenuhnya. Ronda membuktikan KEHADIRAN BERURUTAN, bukan pekerjaan.
   Yang membuktikan pekerjaan tetap foto dan inspeksi.
   ========================================================================== */
window.RONDA = (function () {
  'use strict';

  var STATUS = [
    { kode: 'berjalan', nama: 'Sedang berjalan', ikon: '🚶', warna: 'info' },
    { kode: 'lengkap', nama: 'Lengkap', ikon: '✅', warna: 'ok' },
    { kode: 'sebagian', nama: 'Tidak lengkap', ikon: '⚠️', warna: 'warn' },
    { kode: 'terlewat', nama: 'Tidak dijalankan', ikon: '⛔', warna: 'danger' }
  ];
  function status(kode) {
    return STATUS.filter(function (s) { return s.kode === kode; })[0] || STATUS[0];
  }

  /* Yang ditandai pada satu perjalanan ronda. Bukan penilaian benar-salah —
     penanda supaya penyelia tahu ke mana harus bertanya. */
  var TANDA = [
    { kode: 'cepat', nama: 'Terlalu cepat', ikon: '⚡',
      ket: 'Jarak antartitik lebih pendek daripada waktu berjalan yang masuk akal.' },
    { kode: 'urutan', nama: 'Tidak berurutan', ikon: '🔀',
      ket: 'Titik dipindai tidak menurut urutan rutenya.' },
    { kode: 'lambat', nama: 'Melewati batas waktu', ikon: '🐢',
      ket: 'Selesai lewat dari durasi yang direncanakan ditambah toleransi.' },
    { kode: 'kurang', nama: 'Titik terlewat', ikon: '📍',
      ket: 'Ada titik pada rute yang tidak pernah dipindai.' }
  ];
  function tanda(kode) {
    return TANDA.filter(function (t) { return t.kode === kode; })[0] || TANDA[0];
  }

  /* Waktu berjalan minimal antara dua titik, dalam detik. Dipakai menandai
     'terlalu cepat'. Sengaja LONGGAR: sembilan puluh detik antara dua titik
     bisa saja benar untuk dua bilik yang bersebelahan, dan menandai yang
     benar sebagai curang jauh lebih merusak daripada melewatkan yang curang. */
  var MIN_DETIK_BAWAAN = 45;

  /* ------------------------------------------------------------ katalog */

  function daftar(korporatId, opsi) {
    opsi = opsi || {};
    return DB.where('mcsRonda', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && x.aktif === false) return false;
      return true;
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }
  function satu(id) { return DB.find('mcsRonda', id); }

  /** Titik rute sebagai objek siap tampil — area atau objek di dalam area. */
  function titikRute(x) {
    return (x.titik || []).map(function (t, i) {
      var a = t.jenis === 'objek' ? MCS.objekSatu(t.id) : MCS.areaSatu(t.id);
      return {
        urut: i + 1, jenis: t.jenis, id: t.id, ada: !!a,
        nama: a ? a.nama : I18N.t('Titik terhapus'),
        kode: a ? a.kodePindai : null,
        area: t.jenis === 'objek' && a ? MCS.areaSatu(a.areaId) : a
      };
    });
  }

  function buat(korporatId, d) {
    d = d || {};
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama rute belum diisi.') };
    var titik = bersihkanTitik(d.titik);
    if (titik.length < 2) {
      /* Rute satu titik bukan ronda — itu jadwal biasa, dan MCS sudah punya
         jalur yang lebih baik untuk itu. */
      return { error: I18N.t('Rute ronda butuh setidaknya dua titik. Untuk satu titik, ' +
        'pakai jadwal biasa.') };
    }
    if (!(d.jam || []).length) return { error: I18N.t('Isi setidaknya satu jam berangkat.') };
    var x = DB.insert('mcsRonda', {
      korporatId: korporatId,
      nama: String(d.nama).trim(),
      titik: titik,
      pekerjaId: d.pekerjaId || null,
      hari: (d.hari || []).slice().sort(),
      jam: (d.jam || []).slice().sort(),
      durasiMenit: Math.max(1, Math.round(Number(d.durasiMenit) || 30)),
      toleransiMenit: Math.max(0, Math.round(Number(d.toleransiMenit) || 15)),
      minDetik: Math.max(0, Math.round(Number(d.minDetik) || MIN_DETIK_BAWAAN)),
      catatan: String(d.catatan || '').trim(),
      aktif: d.aktif !== false
    });
    return { ok: true, ronda: x };
  }

  function bersihkanTitik(t) {
    var out = [];
    (t || []).forEach(function (v) {
      if (!v || !v.id) return;
      var jenis = v.jenis === 'objek' ? 'objek' : 'area';
      var ada = jenis === 'objek' ? MCS.objekSatu(v.id) : MCS.areaSatu(v.id);
      if (!ada) return;
      out.push({ jenis: jenis, id: v.id });
    });
    return out;
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Rute tidak ditemukan.') };
    if (d.nama !== undefined && !String(d.nama).trim()) {
      return { error: I18N.t('Nama rute belum diisi.') };
    }
    var isi = {};
    if (d.nama !== undefined) isi.nama = String(d.nama).trim();
    if (d.titik !== undefined) {
      var t = bersihkanTitik(d.titik);
      if (t.length < 2) {
        return { error: I18N.t('Rute ronda butuh setidaknya dua titik. Untuk satu titik, ' +
          'pakai jadwal biasa.') };
      }
      isi.titik = t;
    }
    if (d.jam !== undefined) {
      if (!(d.jam || []).length) return { error: I18N.t('Isi setidaknya satu jam berangkat.') };
      isi.jam = (d.jam || []).slice().sort();
    }
    if (d.hari !== undefined) isi.hari = (d.hari || []).slice().sort();
    if (d.pekerjaId !== undefined) isi.pekerjaId = d.pekerjaId || null;
    if (d.durasiMenit !== undefined) isi.durasiMenit = Math.max(1, Math.round(Number(d.durasiMenit) || 30));
    if (d.toleransiMenit !== undefined) isi.toleransiMenit = Math.max(0, Math.round(Number(d.toleransiMenit) || 0));
    if (d.minDetik !== undefined) isi.minDetik = Math.max(0, Math.round(Number(d.minDetik) || 0));
    if (d.catatan !== undefined) isi.catatan = String(d.catatan || '').trim();
    if (d.aktif !== undefined) isi.aktif = d.aktif !== false;
    DB.update('mcsRonda', id, isi);
    return { ok: true };
  }

  function hapus(id) {
    DB.where('mcsRondaJalan', function (r) { return r.rondaId === id; })
      .forEach(function (r) { DB.remove('mcsRondaJalan', r.id); });
    DB.remove('mcsRonda', id);
    return { ok: true };
  }

  /* ---------------------------------------------------------- perjalanan */

  function menit(jam) {
    var p = String(jam).split(':');
    return (+p[0] || 0) * 60 + (+p[1] || 0);
  }

  /** Slot berangkat pada satu tanggal. */
  function slot(x, tanggal) {
    var hari = new Date(tanggal + 'T00:00:00').getDay();
    if ((x.hari || []).indexOf(hari) < 0) return [];
    return (x.jam || []).slice();
  }

  function jalanSatu(id) { return DB.find('mcsRondaJalan', id); }

  function jalanHari(korporatId, tanggal) {
    var tgl = tanggal || U.today();
    return DB.where('mcsRondaJalan', function (r) {
      return r.korporatId === korporatId && r.tgl === tgl;
    }).sort(function (a, b) { return String(a.jamSlot).localeCompare(String(b.jamSlot)); });
  }

  /**
   * Menyerap sebuah pemindaian ke dalam ronda yang sedang berjalan.
   *
   * Dipanggil MCS.catatPindai setelah barisnya tersimpan. Sengaja tidak
   * menghentikan apa pun bila gagal: pemindaian tetap sah sebagai bukti
   * kehadiran walaupun ia tidak cocok dengan ronda mana pun.
   */
  function serap(pindai) {
    if (!pindai || !pindai.areaId) return null;
    var korporatId = (MCS.areaSatu(pindai.areaId) || {}).korporatId;
    if (!korporatId) return null;
    var tgl = String(pindai.pada).slice(0, 10);
    var kini = menitDari(pindai.pada);

    var rute = daftar(korporatId);
    for (var i = 0; i < rute.length; i++) {
      var x = rute[i];
      /* Titik yang cocok: objek bila pemindaiannya menyebut objek, area bila
         tidak. Rute yang memakai objek TIDAK boleh tercentang oleh pemindaian
         tag areanya — itulah bedanya titik objek dan titik area. */
      var idx = -1;
      (x.titik || []).forEach(function (t, n) {
        if (idx >= 0) return;
        if (pindai.objekId && t.jenis === 'objek' && t.id === pindai.objekId) idx = n;
        else if (!pindai.objekId && t.jenis === 'area' && t.id === pindai.areaId) idx = n;
      });
      if (idx < 0) continue;

      var jamSlot = slotTerdekat(x, tgl, kini);
      if (!jamSlot) continue;

      var jalan = DB.first('mcsRondaJalan', function (r) {
        return r.rondaId === x.id && r.tgl === tgl && r.jamSlot === jamSlot; });
      if (!jalan) {
        jalan = DB.insert('mcsRondaJalan', {
          korporatId: korporatId, rondaId: x.id, tgl: tgl, jamSlot: jamSlot,
          pekerjaId: pindai.pekerjaId || null,
          mulaiAt: pindai.pada, selesaiAt: pindai.pada,
          titik: [], status: 'berjalan', tanda: []
        });
      }
      var isi = (jalan.titik || []).slice();
      /* Pemindaian ulang titik yang sama tidak menggandakan — yang dicatat
         adalah yang PERTAMA, karena itulah saat ia benar-benar tiba. */
      if (!isi.some(function (t) { return t.urut === idx + 1; })) {
        isi.push({ urut: idx + 1, jenis: x.titik[idx].jenis, id: x.titik[idx].id,
                   pindaiId: pindai.id, pada: pindai.pada });
      }
      DB.update('mcsRondaJalan', jalan.id, {
        titik: isi, selesaiAt: pindai.pada,
        pekerjaId: jalan.pekerjaId || pindai.pekerjaId || null
      });
      nilai(jalan.id);
      return jalanSatu(jalan.id);
    }
    return null;
  }

  function menitDari(iso) {
    var d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }

  /**
   * Slot berangkat mana yang sedang berlaku pada menit ini.
   *
   * Jendelanya dari jam berangkat sampai durasi + toleransi. Pemindaian di
   * luar jendela mana pun TIDAK dipaksa masuk ke slot terdekat — memaksanya
   * akan melahirkan ronda hantu yang tidak pernah diberangkatkan siapa pun.
   */
  function slotTerdekat(x, tgl, kiniMenit) {
    var l = slot(x, tgl);
    var jendela = (x.durasiMenit || 30) + (x.toleransiMenit || 0);
    for (var i = 0; i < l.length; i++) {
      var m = menit(l[i]);
      if (kiniMenit >= m && kiniMenit <= m + jendela) return l[i];
    }
    return null;
  }

  /**
   * Menilai satu perjalanan: lengkap atau tidak, dan tanda apa yang melekat.
   *
   * Tanda BUKAN tuduhan. Ia penunjuk ke mana penyelia harus bertanya — dan
   * pertanyaannya sering berjawab wajar: lift rusak, jalur ditutup, ada
   * penghuni yang menahan bicara.
   */
  function nilai(jalanId) {
    var j = jalanSatu(jalanId);
    if (!j) return null;
    var x = satu(j.rondaId);
    if (!x) return null;

    var titik = (j.titik || []).slice().sort(function (a, b) {
      return String(a.pada).localeCompare(String(b.pada)); });
    var tandaBaru = [];

    /* --- urutan --- */
    for (var i = 1; i < titik.length; i++) {
      if (titik[i].urut < titik[i - 1].urut) { tandaBaru.push('urutan'); break; }
    }
    /* --- terlalu cepat --- */
    var minDetik = x.minDetik === undefined ? MIN_DETIK_BAWAAN : x.minDetik;
    if (minDetik) {
      for (var k = 1; k < titik.length; k++) {
        var jarak = (new Date(titik[k].pada) - new Date(titik[k - 1].pada)) / 1000;
        if (jarak < minDetik) { tandaBaru.push('cepat'); break; }
      }
    }
    /* --- melewati batas waktu --- */
    var pakaiMenit = titik.length > 1
      ? Math.round((new Date(titik[titik.length - 1].pada) - new Date(titik[0].pada)) / 60000)
      : 0;
    if (pakaiMenit > (x.durasiMenit || 30) + (x.toleransiMenit || 0)) tandaBaru.push('lambat');

    /* --- titik terlewat --- */
    var lengkap = titik.length >= (x.titik || []).length;
    if (!lengkap) tandaBaru.push('kurang');

    /* Selama jendelanya masih terbuka, yang belum lengkap tetap 'berjalan' —
       menyatakannya gagal saat orangnya masih di lantai tiga adalah menghukum
       pekerjaan yang sedang berlangsung. */
    var kode;
    if (lengkap) kode = 'lengkap';
    else if (j.tgl === U.today() && masihTerbuka(x, j)) kode = 'berjalan';
    else kode = 'sebagian';

    DB.update('mcsRondaJalan', jalanId, {
      status: kode, tanda: tandaBaru, menitPakai: pakaiMenit });
    return jalanSatu(jalanId);
  }

  function masihTerbuka(x, j) {
    var m = menit(j.jamSlot) + (x.durasiMenit || 30) + (x.toleransiMenit || 0);
    var d = new Date();
    return (d.getHours() * 60 + d.getMinutes()) <= m;
  }

  /* ------------------------------------------------------------ ringkas */

  /** Slot hari ini yang seharusnya berjalan, beserta perjalanannya bila ada. */
  function papanHari(korporatId, tanggal) {
    var tgl = tanggal || U.today();
    var jalan = jalanHari(korporatId, tgl);
    var out = [];
    daftar(korporatId).forEach(function (x) {
      slot(x, tgl).forEach(function (jam) {
        var j = jalan.filter(function (r) {
          return r.rondaId === x.id && r.jamSlot === jam; })[0] || null;
        if (j) nilai(j.id);
        var lewat = tgl < U.today() ||
          (tgl === U.today() && !masihTerbuka(x, { jamSlot: jam }));
        out.push({
          ronda: x, jam: jam, jalan: j ? jalanSatu(j.id) : null,
          /* Slot lampau tanpa perjalanan sama sekali = tidak dijalankan.
             Slot yang belum lewat dan belum ada perjalanannya = belum waktunya,
             bukan kegagalan. */
          status: j ? jalanSatu(j.id).status : (lewat ? 'terlewat' : 'akan')
        });
      });
    });
    return out.sort(function (a, b) { return String(a.jam).localeCompare(String(b.jam)); });
  }

  function statistik(korporatId, tanggal) {
    var p = papanHari(korporatId, tanggal);
    function n(k) { return p.filter(function (x) { return x.status === k; }).length; }
    var bertanda = p.filter(function (x) {
      return x.jalan && (x.jalan.tanda || []).length; });
    return {
      slot: p.length, lengkap: n('lengkap'), sebagian: n('sebagian'),
      terlewat: n('terlewat'), berjalan: n('berjalan'), akan: n('akan'),
      bertanda: bertanda,
      rute: daftar(korporatId).length,
      persen: p.length ? Math.round(n('lengkap') / p.length * 100) : null
    };
  }

  return {
    STATUS: STATUS, TANDA: TANDA, MIN_DETIK_BAWAAN: MIN_DETIK_BAWAAN,
    status: status, tanda: tanda,
    daftar: daftar, satu: satu, titikRute: titikRute,
    buat: buat, ubah: ubah, hapus: hapus,
    slot: slot, serap: serap, nilai: nilai,
    jalanHari: jalanHari, jalanSatu: jalanSatu,
    papanHari: papanHari, statistik: statistik
  };
})();
