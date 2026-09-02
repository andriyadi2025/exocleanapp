/* ==========================================================================
   portal.js — laporan baca-saja untuk pemilik gedung dan penyewa
   --------------------------------------------------------------------------
   MASALAH YANG DITUTUP

   Seluruh bukti kebersihan yang dikumpulkan MCS — pemindaian tag, foto
   sebelum-sesudah, nilai inspeksi, tanggapan aduan — hanya bisa dilihat staf
   korporat yang punya akun. Pemilik gedung dan penyewa lantai, yaitu orang
   yang MEMBAYAR jasa itu, tidak bisa melihat apa pun.

   Padahal justru itulah yang paling laku dijual di produk sejenis: laporan
   yang bisa dilihat sendiri oleh klien, tanpa harus percaya pada ringkasan
   lisan pengelola.

   BAGAIMANA AKSESNYA DIBERIKAN

   Lewat TAUTAN BERTOKEN, bukan akun. Pemilik gedung tidak akan mendaftar,
   mengingat sandi, atau menelepon minta reset — dan menuntutnya berarti
   laporannya tidak akan pernah dibuka. Ini pilihan sadar, dengan harganya:

     · Siapa pun yang memegang tautannya bisa membuka. Ia bisa diteruskan.
     · Karena itu tautannya BISA DICABUT kapan saja, dan setiap pembukaan
       dihitung — pengelola bisa melihat apakah laporannya benar-benar dibaca,
       dan apakah dibuka lebih sering daripada yang masuk akal.

   YANG SENGAJA TIDAK DITAMPILKAN

   Portal ini memberitakan keadaan GEDUNG, bukan rapor PEGAWAI. Tidak ada:

     · nilai KPI perorangan          · catatan kehadiran dan ketidakhadiran
     · nomor telepon atau nomor induk · laporan insiden yang menyebut nama
     · sandi, kode masuk, atau apa pun yang bisa dipakai masuk aplikasi

   Nama petugas TETAP muncul pada tugas yang dikerjakannya — orang yang sama
   memang terlihat di lorong gedung setiap hari, dan menyembunyikannya justru
   membuat laporan terasa seperti hasil mesin. Yang tidak boleh keluar adalah
   penilaian atas dirinya.
   ========================================================================== */
window.PORTAL = (function () {
  'use strict';

  /* --------------------------------------------------------------- token */

  /**
   * Token acak 20 karakter dari abjad tanpa huruf yang mudah tertukar.
   *
   * Panjang segini disengaja: token pendek bisa ditebak dengan mencoba, dan
   * yang ditebak adalah laporan kebersihan seluruh gedung milik orang lain.
   * Dibaca manusia hanya sekali saat disalin, jadi panjangnya tidak
   * merepotkan siapa pun.
   */
  var ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function tokenBaru() {
    var out = '';
    var buf = new Uint8Array(20);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (var j = 0; j < 20; j++) buf[j] = Math.floor(Math.random() * 256);
    for (var i = 0; i < 20; i++) out += ABJAD[buf[i] % ABJAD.length];
    return out;
  }

  function semua(korporatId, opsi) {
    opsi = opsi || {};
    return DB.where('mcsPortal', function (x) {
      if (x.korporatId !== korporatId) return false;
      if (!opsi.semua && x.aktif === false) return false;
      return true;
    }).sort(function (a, b) { return String(b.dibuat).localeCompare(String(a.dibuat)); });
  }
  function satu(id) { return DB.find('mcsPortal', id); }

  function dariToken(token) {
    if (!token) return null;
    var t = String(token).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return DB.first('mcsPortal', function (x) { return x.token === t; }) || null;
  }

  function buat(korporatId, d, oleh) {
    d = d || {};
    if (!String(d.nama || '').trim()) {
      return { error: I18N.t('Beri nama tautannya — misalnya nama penyewa atau pemilik gedung.') };
    }
    var x = DB.insert('mcsPortal', {
      korporatId: korporatId,
      token: tokenBaru(),
      nama: String(d.nama).trim(),
      /* Kosong berarti SELURUH gedung. Diisi berarti penyewa yang hanya boleh
         melihat lantainya sendiri — penyewa lantai 7 tidak berhak membaca
         nilai kebersihan lantai 3 milik penyewa lain. */
      areaIds: (d.areaIds || []).slice(),
      kadaluarsa: d.kadaluarsa || null,
      aktif: true,
      dibuat: U.nowISO(),
      olehNama: oleh ? oleh.nama : '',
      dibuka: 0, terakhirDibuka: null
    });
    return { ok: true, portal: satu(x.id) };
  }

  function ubah(id, d) {
    var x = satu(id);
    if (!x) return { error: I18N.t('Tautan tidak ditemukan.') };
    if (d.nama !== undefined && !String(d.nama).trim()) {
      return { error: I18N.t('Beri nama tautannya — misalnya nama penyewa atau pemilik gedung.') };
    }
    var isi = {};
    if (d.nama !== undefined) isi.nama = String(d.nama).trim();
    if (d.areaIds !== undefined) isi.areaIds = (d.areaIds || []).slice();
    if (d.kadaluarsa !== undefined) isi.kadaluarsa = d.kadaluarsa || null;
    DB.update('mcsPortal', id, isi);
    return { ok: true };
  }

  /**
   * Mencabut, bukan menghapus.
   *
   * Tautan yang dihapus kehilangan jejak siapa yang pernah punya akses dan
   * berapa kali dibuka — dan pertanyaan itu justru muncul setelah ada yang
   * salah. Yang dicabut berhenti berfungsi seketika tetapi tetap tercatat.
   */
  function cabut(id) {
    if (!satu(id)) return { error: I18N.t('Tautan tidak ditemukan.') };
    DB.update('mcsPortal', id, { aktif: false, dicabutPada: U.nowISO() });
    return { ok: true };
  }
  function aktifkan(id) {
    if (!satu(id)) return { error: I18N.t('Tautan tidak ditemukan.') };
    DB.update('mcsPortal', id, { aktif: true, dicabutPada: null });
    return { ok: true };
  }
  function hapus(id) { DB.remove('mcsPortal', id); return { ok: true }; }

  /** Alamat lengkap yang disalin dan dikirim ke pemilik gedung. */
  function tautan(x) {
    var dasar = location.href.split('#')[0];
    return dasar + '#lapor=' + x.token;
  }

  /* ---------------------------------------------------------- pemakaian */

  /** Dipanggil saat tautannya benar-benar dibuka. */
  function catatBuka(id) {
    var x = satu(id);
    if (!x) return;
    DB.update('mcsPortal', id, {
      dibuka: (x.dibuka || 0) + 1, terakhirDibuka: U.nowISO() });
  }

  function berlaku(x) {
    if (!x || x.aktif === false) return false;
    if (x.kadaluarsa && x.kadaluarsa < U.today()) return false;
    return true;
  }

  /* ------------------------------------------------------------ laporan */

  /**
   * Isi laporan untuk satu periode.
   *
   * Disaring menurut lingkup tautannya: penyewa yang hanya diberi dua area
   * mendapat angka DUA AREA ITU, bukan angka seluruh gedung yang disaring
   * tampilannya. Menyaring di tampilan saja berarti angka totalnya tetap
   * bocor lewat ringkasan.
   */
  function laporan(x, tahun, bulan) {
    var per = KPI.periodeBulan(tahun, bulan);
    var korporatId = x.korporatId;
    var lingkup = (x.areaIds || []);
    var punyaLingkup = lingkup.length > 0;
    function dalamLingkup(areaId) {
      return !punyaLingkup || lingkup.indexOf(areaId) >= 0;
    }

    var area = MCS.area(korporatId).filter(function (a) { return dalamLingkup(a.id); });
    var petaArea = {};
    area.forEach(function (a) { petaArea[a.id] = { area: a, total: 0, selesai: 0,
      berbukti: 0, berfoto: 0 }; });

    var hari = [], total = 0, selesai = 0, berbukti = 0, berfoto = 0;
    var hariIni = U.today();
    var d = new Date(per.dari + 'T00:00:00');
    var batas = new Date(per.sampai + 'T00:00:00');
    while (d <= batas) {
      var tgl = U.iso(d);
      if (tgl > hariIni) break;
      var t = MCS.tugasHari(korporatId, tgl).filter(function (y) {
        return dalamLingkup(y.area.id); });
      var s = 0;
      t.forEach(function (y) {
        total++;
        var A = petaArea[y.area.id];
        if (A) A.total++;
        if (y.status === 'selesai') {
          selesai++; s++;
          if (A) A.selesai++;
          var rec = MCS.catatanSlot(y.jadwalId, y.tgl, y.jam);
          if (rec && rec.pindaiId) { berbukti++; if (A) A.berbukti++; }
          if (rec && (rec.sesudah || []).length) { berfoto++; if (A) A.berfoto++; }
        }
      });
      hari.push({ tgl: tgl, total: t.length, selesai: s });
      d.setDate(d.getDate() + 1);
    }

    var ins = MCS.inspeksi(korporatId, { dari: per.dari, sampai: per.sampai })
      .filter(function (y) { return dalamLingkup(y.areaId); });
    var ad = DB.where('mcsAduan', function (y) {
      var tg = String(y.pada).slice(0, 10);
      return y.korporatId === korporatId && dalamLingkup(y.areaId) &&
             tg >= per.dari && tg <= per.sampai;
    });
    var adSelesai = ad.filter(function (y) { return y.status === 'selesai'; });
    var adTepat = adSelesai.filter(function (y) { return MCS.sisaSLA(y) >= 0; });

    return {
      portal: x, periode: per,
      korporat: MCS.korporat(korporatId),
      lingkup: punyaLingkup ? area : null,
      total: total, selesai: selesai,
      persen: total ? Math.round(selesai / total * 100) : 0,
      /* Dua angka yang sering dikira sama: berapa yang DILAPORKAN selesai, dan
         berapa yang selesainya bisa DIBUKTIKAN. Pemilik gedung berhak melihat
         keduanya — itulah satu-satunya bagian laporan yang tidak bisa
         dikarang. */
      berbukti: berbukti,
      persenBukti: selesai ? Math.round(berbukti / selesai * 100) : 0,
      berfoto: berfoto,
      persenFoto: selesai ? Math.round(berfoto / selesai * 100) : 0,
      hari: hari,
      area: Object.keys(petaArea).map(function (k) {
        var v = petaArea[k];
        v.persen = v.total ? Math.round(v.selesai / v.total * 100) : 0;
        var mi = ins.filter(function (y) { return y.areaId === k; });
        v.inspeksi = mi.length;
        v.mutu = mi.length
          ? Math.round(mi.reduce(function (s2, y) { return s2 + y.skor; }, 0) / mi.length * 10) / 10
          : null;
        return v;
      }).sort(function (a, b) { return a.persen - b.persen; }),
      mutu: {
        jumlah: ins.length,
        rata: ins.length
          ? Math.round(ins.reduce(function (s, y) { return s + y.skor; }, 0) / ins.length * 10) / 10
          : null
      },
      aduan: {
        total: ad.length, selesai: adSelesai.length,
        tepatWaktu: adTepat.length,
        persenSLA: adSelesai.length ? Math.round(adTepat.length / adSelesai.length * 100) : null,
        terbuka: ad.filter(function (y) {
          return y.status === 'baru' || y.status === 'ditugaskan'; }).length
      }
    };
  }

  return {
    semua: semua, satu: satu, dariToken: dariToken, tautan: tautan,
    buat: buat, ubah: ubah, cabut: cabut, aktifkan: aktifkan, hapus: hapus,
    catatBuka: catatBuka, berlaku: berlaku, laporan: laporan
  };
})();
