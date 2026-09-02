/* ==========================================================================
   kontrak.js — kontrak layanan kebersihan dan janji yang bisa diukur
   --------------------------------------------------------------------------
   MASALAH YANG DITUTUP

   MCS punya SLA, tetapi hanya satu jenis: batas waktu menanggapi aduan, yang
   dibekukan saat aduan masuk. Padahal yang disepakati dalam kontrak jauh lebih
   luas — dan sebelumnya tidak tercatat di mana pun:

     · berapa persen tugas harus selesai
     · berapa persen harus disertai bukti kehadiran
     · berapa nilai mutu APPA yang dijanjikan
     · berapa kali inspeksi minimal per bulan
     · sanksi bila tidak tercapai

   Akibatnya, saat pemilik gedung bertanya "apakah janji kontrak terpenuhi
   bulan ini", jawabannya harus dirakit tangan dari beberapa halaman berbeda —
   dan siapa pun yang merakitnya bisa memilih angka yang enak dibaca.

   YANG MODUL INI LAKUKAN, DAN YANG TIDAK

   MELAKUKAN: mencatat janji dalam bentuk yang BISA DIUKUR, lalu memeriksanya
   terhadap data yang sudah ada setiap bulan. Terpenuhi atau tidak, dihitung
   dari angka yang sama yang dilihat pemilik gedung di portalnya.

   TIDAK MELAKUKAN: pengelolaan dokumen hukum. Tidak ada penyuntingan pasal,
   riwayat versi, coretan, atau tanda tangan elektronik yang sah secara hukum.
   Yang tersimpan di sini adalah RINGKASAN TERUKUR dari kontrak, bukan
   kontraknya. Berkas aslinya tetap harus ada di tempat lain.
   ========================================================================== */
window.KONTRAK = (function () {
  'use strict';

  /**
   * Jenis janji yang bisa diperiksa terhadap data.
   *
   * Sengaja HANYA yang terukur. Janji seperti "petugas bersikap ramah" nyata
   * adanya di kontrak sungguhan, tetapi memasukkannya ke daftar ini berarti
   * memberi centang hijau pada sesuatu yang tidak pernah diperiksa siapa pun —
   * dan satu centang palsu membuat seluruh daftar tidak bisa dipercaya.
   * Yang seperti itu ditulis di kolom catatan, bukan dijadikan janji terukur.
   */
  var JANJI = [
    { kode: 'capaian', nama: 'Penyelesaian tugas', satuan: '%', arah: 'min',
      bawaan: 95, ikon: '✅',
      ket: 'Persentase tugas terjadwal yang ditandai selesai.' },
    { kode: 'bukti', nama: 'Bukti kehadiran', satuan: '%', arah: 'min',
      bawaan: 80, ikon: '🏷️',
      ket: 'Dari tugas yang selesai, berapa persen disertai pemindaian tag di lokasi.' },
    { kode: 'mutu', nama: 'Mutu APPA', satuan: '', arah: 'maks',
      bawaan: 2.5, ikon: '⭐',
      ket: 'Rata-rata nilai inspeksi. Makin KECIL makin baik — 1 paling bersih.' },
    { kode: 'inspeksi', nama: 'Jumlah inspeksi', satuan: 'x', arah: 'min',
      bawaan: 4, ikon: '🔍',
      ket: 'Berapa kali minimal area diperiksa dalam sebulan.' },
    { kode: 'sla', nama: 'Aduan tepat waktu', satuan: '%', arah: 'min',
      bawaan: 90, ikon: '📣',
      ket: 'Dari aduan yang tuntas, berapa persen selesai dalam batas waktunya.' }
  ];
  function janji(kode) {
    return JANJI.filter(function (j) { return j.kode === kode; })[0] || JANJI[0];
  }

  var STATUS = [
    { kode: 'draf', nama: 'Draf', ikon: '📝', warna: 'muted',
      ket: 'Belum berlaku. Tidak ikut diperiksa.' },
    { kode: 'berjalan', nama: 'Berjalan', ikon: '🟢', warna: 'ok',
      ket: 'Berlaku dan diperiksa tiap bulan.' },
    { kode: 'berakhir', nama: 'Berakhir', ikon: '🔚', warna: 'muted',
      ket: 'Masa berlakunya habis atau diakhiri.' }
  ];
  function status(kode) {
    return STATUS.filter(function (s) { return s.kode === kode; })[0] || STATUS[0];
  }

  /* Berapa hari sebelum berakhir mulai diingatkan. Perpanjangan kontrak
     kebersihan melewati pengadaan dan persetujuan anggaran; diingatkan sebulan
     sebelumnya sama saja dengan diingatkan terlambat. */
  var HARI_PERINGATAN = 90;

  /* ---------------------------------------------------------------- baca */

  function semua(korporatId, opsi) {
    opsi = opsi || {};
    return DB.where('mcsKontrak', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && x.status === 'berakhir') return false;
      return true;
    }).sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'berjalan' ? -1 : 1;
      return String(b.mulai).localeCompare(String(a.mulai));
    });
  }
  function satu(id) { return DB.find('mcsKontrak', id); }

  /** Kontrak yang berlaku pada satu tanggal. */
  function berlakuPada(korporatId, tgl) {
    var t = tgl || U.today();
    return DB.where('mcsKontrak', function (x) {
      return x.korporatId === korporatId && x.status === 'berjalan' &&
             (!x.mulai || x.mulai <= t) && (!x.sampai || x.sampai >= t);
    });
  }

  function sisaHari(x) {
    if (!x.sampai) return null;
    return Math.round((new Date(x.sampai) - new Date(U.today())) / 864e5);
  }

  /* -------------------------------------------------------------- tulis */

  function buat(korporatId, d, oleh) {
    d = d || {};
    if (!String(d.nama || '').trim()) return { error: I18N.t('Nama kontrak belum diisi.') };
    if (!d.mulai) return { error: I18N.t('Tanggal mulai belum diisi.') };
    if (d.sampai && d.sampai < d.mulai) {
      return { error: I18N.t('Tanggal berakhir mendahului tanggal mulai.') };
    }
    var x = DB.insert('mcsKontrak', {
      korporatId: korporatId,
      no: String(d.no || '').trim() || nomorKontrak(korporatId),
      nama: String(d.nama).trim(),
      pihak: String(d.pihak || '').trim(),
      mulai: d.mulai,
      sampai: d.sampai || null,
      nilaiBulanan: Math.max(0, Math.round(Number(d.nilaiBulanan) || 0)),
      /* Kosong berarti SELURUH gedung — sama seperti lingkup portal. */
      areaIds: (d.areaIds || []).slice(),
      janji: bersihkanJanji(d.janji),
      penalti: String(d.penalti || '').trim(),
      lingkupTeks: String(d.lingkupTeks || '').trim(),
      catatan: String(d.catatan || '').trim(),
      status: (STATUS.filter(function (s) { return s.kode === d.status; })[0] || STATUS[0]).kode,
      dibuat: U.nowISO(),
      olehNama: oleh ? oleh.nama : '',
      lampiran: (d.lampiran || []).slice()
    });
    return { ok: true, kontrak: satu(x.id) };
  }

  function nomorKontrak(korporatId) {
    var thn = String(new Date().getFullYear());
    var n = DB.where('mcsKontrak', function (x) {
      return x.korporatId === korporatId && String(x.no || '').indexOf('KTR-' + thn) === 0;
    }).length + 1;
    return 'KTR-' + thn + '-' + String(n).padStart(3, '0');
  }

  /** Hanya janji yang dikenal dan bertarget angka yang disimpan. */
  function bersihkanJanji(j) {
    var out = [];
    (j || []).forEach(function (v) {
      var def = JANJI.filter(function (x) { return x.kode === v.kode; })[0];
      if (!def) return;
      var t = Number(v.target);
      if (isNaN(t)) return;
      out.push({ kode: def.kode, target: Math.round(t * 100) / 100 });
    });
    return out;
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Kontrak tidak ditemukan.') };
    if (d.nama !== undefined && !String(d.nama).trim()) {
      return { error: I18N.t('Nama kontrak belum diisi.') };
    }
    var mulai = d.mulai !== undefined ? d.mulai : x.mulai;
    var sampai = d.sampai !== undefined ? (d.sampai || null) : x.sampai;
    if (sampai && mulai && sampai < mulai) {
      return { error: I18N.t('Tanggal berakhir mendahului tanggal mulai.') };
    }
    var isi = {};
    ['nama', 'pihak', 'penalti', 'lingkupTeks', 'catatan', 'no'].forEach(function (k) {
      if (d[k] !== undefined) isi[k] = String(d[k] || '').trim();
    });
    if (d.mulai !== undefined) isi.mulai = d.mulai;
    if (d.sampai !== undefined) isi.sampai = d.sampai || null;
    if (d.nilaiBulanan !== undefined) {
      isi.nilaiBulanan = Math.max(0, Math.round(Number(d.nilaiBulanan) || 0));
    }
    if (d.areaIds !== undefined) isi.areaIds = (d.areaIds || []).slice();
    if (d.janji !== undefined) isi.janji = bersihkanJanji(d.janji);
    if (d.status !== undefined) {
      isi.status = (STATUS.filter(function (s) { return s.kode === d.status; })[0] || STATUS[0]).kode;
    }
    DB.update('mcsKontrak', id, isi);
    return { ok: true };
  }

  function hapus(id) {
    var x = satu(id);
    if (x) (x.lampiran || []).forEach(function (f) { DB.delPhoto(f); });
    DB.remove('mcsKontrak', id);
    return { ok: true };
  }

  /* ------------------------------------------------------- pemeriksaan */

  /**
   * Memeriksa janji terhadap kenyataan satu bulan.
   *
   * Angkanya diambil dari PORTAL.laporan — SENGAJA fungsi yang sama yang
   * dipakai portal pemilik gedung. Menghitung ulang di sini akan melahirkan
   * dua angka untuk bulan yang sama, dan yang membaca keduanya berhak
   * menyimpulkan salah satunya dikarang.
   */
  function periksa(x, tahun, bulan) {
    var lap = PORTAL.laporan(
      { korporatId: x.korporatId, areaIds: x.areaIds || [], nama: x.nama },
      tahun, bulan);

    var nyataDari = {
      capaian: lap.total ? lap.persen : null,
      bukti: lap.selesai ? lap.persenBukti : null,
      mutu: lap.mutu.rata,
      inspeksi: lap.mutu.jumlah,
      sla: lap.aduan.persenSLA
    };

    var hasil = (x.janji || []).map(function (j) {
      var def = janji(j.kode);
      var nyata = nyataDari[j.kode];
      /* Tanpa data, janjinya TIDAK dinyatakan gagal — dan juga tidak
         dinyatakan tercapai. Menyatakan gagal menghukum bulan yang belum
         berjalan; menyatakan tercapai memberi centang hijau tanpa dasar. */
      var kode = nyata === null || nyata === undefined ? 'nihil'
        : (def.arah === 'maks' ? (nyata <= j.target) : (nyata >= j.target))
          ? 'penuhi' : 'gagal';
      return { janji: def, target: j.target, nyata: nyata, hasil: kode };
    });

    var dinilai = hasil.filter(function (h) { return h.hasil !== 'nihil'; });
    var gagal = hasil.filter(function (h) { return h.hasil === 'gagal'; });
    return {
      kontrak: x, periode: lap.periode, laporan: lap,
      janji: hasil,
      dinilai: dinilai.length, gagal: gagal.length,
      penuhi: dinilai.length - gagal.length,
      /* Null bila tidak satu pun janji punya datanya — bukan nol persen. */
      persen: dinilai.length
        ? Math.round((dinilai.length - gagal.length) / dinilai.length * 100) : null
    };
  }

  function statistik(korporatId) {
    var l = DB.where('mcsKontrak', function (x) { return x.korporatId === korporatId; });
    var jalan = l.filter(function (x) { return x.status === 'berjalan'; });
    var d = new Date();
    var hasil = jalan.map(function (x) { return periksa(x, d.getFullYear(), d.getMonth() + 1); });
    var segera = jalan.filter(function (x) {
      var s = sisaHari(x);
      return s !== null && s >= 0 && s <= HARI_PERINGATAN; });
    var lewat = jalan.filter(function (x) {
      var s = sisaHari(x);
      return s !== null && s < 0; });

    return {
      total: l.length, berjalan: jalan.length,
      draf: l.filter(function (x) { return x.status === 'draf'; }).length,
      berakhir: l.filter(function (x) { return x.status === 'berakhir'; }).length,
      segeraHabis: segera, sudahLewat: lewat,
      nilaiBulanan: jalan.reduce(function (s, x) { return s + (x.nilaiBulanan || 0); }, 0),
      hasil: hasil,
      janjiGagal: hasil.reduce(function (s, h) { return s + h.gagal; }, 0)
    };
  }

  return {
    JANJI: JANJI, STATUS: STATUS, HARI_PERINGATAN: HARI_PERINGATAN,
    janji: janji, status: status,
    semua: semua, satu: satu, berlakuPada: berlakuPada, sisaHari: sisaHari,
    buat: buat, ubah: ubah, hapus: hapus,
    periksa: periksa, statistik: statistik
  };
})();
