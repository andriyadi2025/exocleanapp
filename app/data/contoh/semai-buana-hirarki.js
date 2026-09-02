/* ==========================================================================
   semai-buana-hirarki.js — struktur komando PT Buana Indah Motorindo
   --------------------------------------------------------------------------
   APA YANG DIISI DI SINI, DAN KENAPA IA TIDAK BISA DITEBAK APLIKASI

   Sesudah penyaringan per cabang terpasang, akun Buana masih menyimpan satu
   lubang yang tidak terlihat dari layar mana pun:

       0 dari 42 staf korporat punya atasan
       0 dari 258 petugas punya atasan
       0 regu terdaftar — padahal 86 orang berjabatan Leader Regu

   Akibatnya terukur, bukan teoretis. Dimensi KPI **Capaian regu** berbobot
   30 — yang terbesar — dan ia dihitung dari `MCS.bawahan(pekerjaId)`, yaitu
   dari kolom `atasanId` pada petugas. Tanpa kolom itu, dimensinya bernilai
   `null` untuk SELURUH 86 leader, dan skor mereka disusun dari sisa bobot
   saja. Rata-rata KPI korporat terbaca 30,6 dengan seluruh orang di grade D
   — angka yang terlihat seperti kinerja buruk padahal ia gejala data yang
   belum diisi.

   Aplikasinya sendiri tidak berbohong tentang itu: `timSelesai` bernilai
   null dan bukan nol, dan layar Kinerja menuliskan "Cakupan data X%".
   Tetapi laporan yang jujur tentang datanya yang kosong tetap laporan yang
   tidak bisa dipakai menilai siapa pun.

   YANG TIDAK DIKARANG DI SINI

     · Rantai staf korporat tetap SATU tingkat: Kepala Cabang melapor kepada
       Area Manager, titik. Supervisor dan Leader tidak diberi atasan formal
       — keputusan itu sudah ditulis beserta alasannya di mcsakses.js, dan
       laporan berjenjang tidak membutuhkannya: jangkauan cabang sudah cukup
       untuk menempatkan keduanya.
     · Area Manager dinamai Area I–IV, bukan dinamai wilayah geografis.
       Pembagian cabang kepada kedua belas Kepala Cabang tidak mengikuti
       geografi, dan menamainya "Area Sumatera" akan menjanjikan
       pengelompokan yang tidak ada di datanya.
     · Cabang yang tidak punya Leader Regu TIDAK ditambal diam-diam; ia
       dilaporkan. Mengangkat orang menjadi atasan tanpa ada yang memutuskan
       adalah mengarang struktur, dan struktur karangan akan dipakai menilai
       orang sungguhan.

   Jalankan sebagai Admin Korporat. Penjaga batas cabang menilai APP.user,
   dan penyemai yang berjalan sebagai kepala cabang hanya akan menyentuh
   seperempat datanya tanpa satu pun galat.
   ========================================================================== */
var SEMAI_BUANA_HIRARKI = (function () {
  'use strict';

  /* Empat kelompok, tiga Kepala Cabang masing-masing. Namanya dipilih
     seperti nama staf lain pada akun ini supaya tidak menonjol sebagai data
     buatan yang berbeda asal. */
  var AREA = [
    { kode: 'I',   nama: 'Bambang Sudrajat', email: 'am1.buana@buanamotorindo.co.id',  telp: '0812-3300-0101' },
    { kode: 'II',  nama: 'Ratih Kusumawati', email: 'am2.buana@buanamotorindo.co.id',  telp: '0812-3300-0102' },
    { kode: 'III', nama: 'Yusuf Ramadhan',   email: 'am3.buana@buanamotorindo.co.id',  telp: '0812-3300-0103' },
    { kode: 'IV',  nama: 'Sinta Larasati',   email: 'am4.buana@buanamotorindo.co.id',  telp: '0812-3300-0104' }
  ];

  function korporatBuana() {
    return DB.first('korporat', function (k) {
      return /Buana Indah Motorindo/i.test(k.nama || '');
    });
  }

  /* ------------------------------------------------------ struktur lapangan

     Satu regu per cabang: ketuanya Leader Regu di cabang itu, anggotanya
     seluruh pelaksana di cabang yang sama. `atasanId` diisi PADA PELAKSANA —
     itu kolom yang dibaca KPI, dan regu tanpa kolom itu tidak menghasilkan
     satu pun angka.

     Regunya tetap dibuat walaupun KPI tidak membacanya: layar Regu memakai
     `timId`, dan struktur yang hanya ada di satu dari dua tempat akan
     berbeda di salah satunya begitu ada yang menyuntingnya.
   */
  function lapangan(kid, lap) {
    var lok = LOKASI.semua(kid);
    var pekerja = MCS.semuaPekerja(kid, true);

    var perLok = {};
    pekerja.forEach(function (p) {
      (p.lokasiIds || []).forEach(function (id) {
        (perLok[id] = perLok[id] || []).push(p);
      });
    });

    lok.forEach(function (l) {
      var orang = perLok[l.id] || [];
      if (!orang.length) { lap.cabangTanpaPetugas.push(l.nama); return; }

      var ketua = orang.filter(function (p) { return p.jabatan === 'leader'; })[0] ||
                  orang.filter(function (p) { return p.jabatan === 'koordinator'; })[0];
      if (!ketua) {
        /* Dilaporkan, tidak ditambal. Lihat catatan di kepala berkas. */
        lap.cabangTanpaLeader.push(l.nama + ' (' + orang.length + ' pelaksana)');
        return;
      }

      var r = MCS.tambahTim(kid, {
        nama: 'Regu ' + l.nama,
        ketuaId: ketua.id,
        catatan: 'Dibentuk dari struktur cabang'
      });
      if (r.error) { lap.salah.push('regu ' + l.nama + ': ' + r.error); return; }
      lap.regu++;

      orang.forEach(function (p) {
        /* Objek LENGKAP, bukan tambalan: ubahPekerja menulis ulang seluruh
           kolomnya, dan mengoper sebagian berarti mengosongkan shift, hari
           kerja, dan wilayah orang itu tanpa satu pun tanda. */
        var isi = Object.assign({}, p, { timId: r.tim.id });
        if (p.id !== ketua.id) isi.atasanId = ketua.id;
        var h = MCS.ubahPekerja(p.id, isi);
        if (h.error) { lap.salah.push(p.nama + ': ' + h.error); return; }
        if (p.id !== ketua.id) lap.berAtasan++;
      });
      lap.berKetua++;
    });
  }

  /* --------------------------------------------------------- staf korporat */
  function korporat(kid, lap, oleh) {
    var kc = DB.all('users').filter(function (u) {
      return u.role === 'korporat' && u.korporatId === kid &&
             u.mcsPeran === 'cabang' && u.aktif !== false;
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });

    if (!kc.length) { lap.salah.push('tidak ada Kepala Cabang'); return; }

    var perKelompok = Math.ceil(kc.length / AREA.length);
    AREA.forEach(function (a, i) {
      var anak = kc.slice(i * perKelompok, (i + 1) * perKelompok);
      if (!anak.length) return;

      /* Jangkauan Area Manager = gabungan cabang bawahannya. Ditulis SEKALI
         di sini, bukan dihitung setiap kali dibaca: jangkauan yang dihitung
         dari orang lain berubah diam-diam ketika seseorang pindah, dan yang
         kehilangan separuh wilayahnya tidak akan menemukan sebabnya. Sama
         persis dengan alasan yang sudah tertulis pada peran 'area'. */
      var cabang = {};
      anak.forEach(function (u) { (u.mcsLokasi || []).forEach(function (id) { cabang[id] = 1; }); });

      var ada = DB.first('users', function (u) {
        return String(u.email).toLowerCase() === a.email;
      });
      var am;
      if (ada) {
        DB.update('users', ada.id, { mcsPeran: 'area', mcsLokasi: Object.keys(cabang) });
        am = ada;
        lap.areaDipakaiUlang++;
      } else {
        var r = MCS.tambahStaf(kid, {
          nama: a.nama, email: a.email, telp: a.telp,
          jabatan: 'Area Manager ' + a.kode,
          peran: 'area', lokasiIds: Object.keys(cabang)
        }, oleh);
        if (r.error) { lap.salah.push('Area ' + a.kode + ': ' + r.error); return; }
        am = r.user;
        lap.areaBaru++;
        lap.sandiAwal.push(a.nama + ' / ' + a.email + ' / ' + r.sandiAwal);
      }

      anak.forEach(function (u) {
        var h = MCSAKSES.pasangAtasan(u.id, am.id);
        if (h && h.error) { lap.salah.push(u.nama + ': ' + h.error); return; }
        lap.cabangBerAtasan++;
      });
      lap.area.push('Area ' + a.kode + ' — ' + a.nama + ': ' + anak.length +
        ' Kepala Cabang, ' + Object.keys(cabang).length + ' cabang');
    });
  }

  /* ------------------------------------------------------------------ muat */
  function jalankan() {
    var k = korporatBuana();
    if (!k) return { error: 'Korporat PT Buana Indah Motorindo tidak ditemukan.' };
    if (!APP.user || APP.user.role !== 'korporat' ||
        (MCSAKSES.peranUser(APP.user) || {}).kode !== 'admin') {
      return { error: 'Jalankan sebagai Admin Korporat Buana — penjaga batas ' +
                      'cabang menilai pengguna yang sedang masuk.' };
    }

    var lap = {
      regu: 0, berKetua: 0, berAtasan: 0,
      areaBaru: 0, areaDipakaiUlang: 0, cabangBerAtasan: 0,
      area: [], sandiAwal: [],
      cabangTanpaLeader: [], cabangTanpaPetugas: [], salah: []
    };

    lapangan(k.id, lap);
    korporat(k.id, lap, APP.user);
    DB.save(true);
    return lap;
  }

  return { jalankan: jalankan, AREA: AREA };
})();
