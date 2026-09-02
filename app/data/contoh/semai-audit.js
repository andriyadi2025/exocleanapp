/* ==========================================================================
   semai-audit.js — mengisi kekosongan data yang MENGHALANGI audit
   --------------------------------------------------------------------------
   Bukan menghapus dan menyemai ulang. Data yang sudah ada tidak disentuh;
   berkas ini hanya menambahkan yang belum pernah ada sama sekali.

   KENAPA INI PERLU

   Penyemai utama membuat gedung, area, jadwal, petugas, dan absensi — dan
   berhenti di sana. Akibatnya empat modul tidak bisa disentuh audit karena
   datanya nol, bukan karena fiturnya rusak:

     · Mutasi stok tanpa GUDANG    → saldo per cabang selalu nol, dan rencana
                                     belanja per gudang tidak bisa dibuktikan.
     · Mutasi tanpa PENGAMBIL      → pemakaian per petugas tidak bisa dibaca,
                                     padahal itu satu-satunya cara menjawab
                                     "kenapa troli yang satu dua kali lebih
                                     boros daripada yang lain".
     · Tanpa KONTRAK               → seluruh alur kontrak → tagihan gelap.
     · Tanpa TAGIHAN               → penagihan dan pelunasan tidak tersentuh.

   ADITIF DAN BISA DIULANG

   Setiap bagian memeriksa dulu apakah pekerjaannya sudah dilakukan. Menjalankan
   berkas ini dua kali tidak menggandakan apa pun — dan itu penting, karena
   yang menjalankannya biasanya sedang mengaudit dan tidak ingin datanya
   berubah di tengah jalan.

   Jalankan dari konsol peramban, sebagai admin korporat:
       SEMAI_AUDIT.jalankan()
   ========================================================================== */
var SEMAI_AUDIT = (function () {
  'use strict';

  /* Acak yang DAPAT DIULANG — alasan yang sama dengan penyemai lain: dua kali
     jalan harus menghasilkan angka yang sama, kalau tidak perbedaan yang tidak
     disengaja akan dikira temuan audit. */
  var benih = 20260826;
  function acak() {
    benih = (benih * 1103515245 + 12345) & 0x7fffffff;
    return benih / 0x7fffffff;
  }
  function antara(a, b) { return a + acak() * (b - a); }
  function bulat(a, b) { return Math.round(antara(a, b)); }
  function pilih(arr) { return arr[Math.floor(acak() * arr.length)]; }

  /* PENGUKUR RUANG — jujur dan murah sekaligus, dua hal yang di sini saling
     bertentangan.

     Cara yang jujur (mengisi localStorage sampai menolak) memakan ratusan
     milidetik sekali jalan. Memanggilnya untuk tiap baris membuat penyemaian
     ini menggantung: dua belas gudang dikali delapan belas barang adalah 216
     panggilan, dan penyemai ini SUDAH pernah macet karenanya sebelum baris
     ini ditulis.

     Jalan tengahnya: batas sesungguhnya diukur SEKALI di awal, lalu yang
     dipakai berulang hanya penjumlahan panjang teks — murah — dan itu pun
     hanya tiap 40 baris. Di antaranya dipakai angka terakhir dikurangi
     perkiraan yang sengaja berlebih. Salah tebaknya selalu ke arah aman:
     berhenti terlalu cepat, bukan terlambat.

     Batasnya DIUKUR, bukan ditulis 5 MB seperti penyemai lain — peramban ini
     ternyata memberi ±15,7 MB, dan berhenti pada 5 MB berarti menolak
     menulis dua pertiga ruang yang sebenarnya ada. */
  var BATAS = -1;
  function ukurBatas() {
    try {
      var kunci = '__ujiRuang__', blok = 'x'.repeat(256 * 1024), isi = '', n = 0;
      for (n = 0; n < 120; n++) { isi += blok; localStorage.setItem(kunci, isi); }
      localStorage.removeItem(kunci);
      return terpakai() + n * 256 * 1024;
    } catch (e) {
      try { localStorage.removeItem('__ujiRuang__'); } catch (x) {}
      return terpakai() + 0;
    }
  }
  function terpakai() {
    var t = 0;
    Object.keys(localStorage).forEach(function (x) {
      t += (localStorage.getItem(x) || '').length;
    });
    return t;
  }
  var ukurTerakhir = -1, sejakUkur = 0;
  function sisaRuang() {
    if (BATAS < 0) BATAS = ukurBatas();
    if (ukurTerakhir < 0 || sejakUkur >= 40) {
      DB.save(true);
      ukurTerakhir = BATAS - terpakai();
      sejakUkur = 0;
    } else {
      sejakUkur++;
    }
    /* 500 byte per baris — di atas baris terbesar yang pernah diukur. */
    return ukurTerakhir - sejakUkur * 500;
  }

  function korporatAktif() {
    if (window.APP && APP.user && APP.user.korporatId) {
      return DB.find('korporat', APP.user.korporatId);
    }
    return DB.all('korporat')[0] || null;
  }

  /* ------------------------------------------------------- 1. MUTASI STOK */
  /**
   * Menempatkan stok ke gudang, lalu mengeluarkannya atas nama petugas.
   *
   * DUA LANGKAH, BUKAN SATU. Barang harus ada di gudangnya dulu sebelum bisa
   * diambil dari sana — dan MCS.catatMutasi memang menolak saldo minus per
   * gudang. Menyemai pengambilan tanpa penempatan hanya menghasilkan deretan
   * galat yang terlihat seperti fitur yang rusak.
   */
  function mutasiStok(k, lap) {
    /* DUA PENJAGA, bukan satu.

       Penempatan dan pengambilan adalah dua pekerjaan yang bisa selesai
       sendiri-sendiri. Satu penjaga yang hanya menanyakan ‘apakah ada mutasi
       bergudang’ sudah menipu sekali: 216 penempatan berhasil, pengambilannya
       gagal seluruhnya karena salah nama kolom, lalu penyemaian berikutnya
       melewati SELURUH bagian ini dan pengambilannya tidak pernah dicoba
       lagi. Penjaga yang terlalu kasar menyembunyikan pekerjaan yang belum
       selesai. */
    var adaTempat = DB.where('mcsStokMutasi', function (m) {
      return m.korporatId === k.id && m.lokasiId;
    }).length;
    var adaAmbil = DB.where('mcsStokMutasi', function (m) {
      return m.korporatId === k.id && m.pekerjaId;
    }).length;
    if (adaTempat && adaAmbil) {
      lap.mutasiDilewati = adaTempat + ' tempat, ' + adaAmbil + ' ambil';
      return;
    }
    lap.lewatiPenempatan = !!adaTempat;

    var stok = MCS.stok(k.id);
    var lokasi = LOKASI.semua(k.id).filter(function (l) { return l.aktif !== false; });
    var pekerja = MCS.semuaPekerja ? MCS.semuaPekerja(k.id) : MCS.pekerja(k.id);
    if (!stok.length || !lokasi.length) { lap.mutasiGagal = 'tidak ada stok/gudang'; return; }

    /* Gudang yang ikut dibebani dibatasi — delapan puluh tujuh gudang dikali
       delapan belas barang dikali dua langkah adalah tiga ribu mutasi, dan
       audit tidak menjadi lebih baik karena angkanya lebih besar. */
    var gudang = lokasi.slice(0, Math.min(12, lokasi.length));
    lap.masuk = 0; lap.keluar = 0; lap.gudangDipakai = gudang.length;

    gudang.forEach(function (l) {
      /* `lokasiIds` JAMAK — seorang petugas bisa memegang lebih dari satu
         gedung. Menyaring dengan `lokasiId` tunggal tidak melempar galat
         apa pun: ia hanya mengembalikan nol orang, dan seluruh pengambilan
         stok tidak pernah tercatat. Terukur: 216 penempatan berhasil dan
         NOL pengambilan, tanpa satu pun pesan salah. */
      var orang = pekerja.filter(function (p) {
        return (p.lokasiIds || []).indexOf(l.id) >= 0;
      });
      stok.forEach(function (s) {
        if (sisaRuang() < 900000) { lap.ruangHabis = true; return; }
        /* --- penempatan awal --- */
        var masuk = bulat(20, 90);
        if (!lap.lewatiPenempatan) {
          var rm = MCS.catatMutasi(s.id, masuk, 'masuk',
            I18N.t('Penempatan awal gudang'), null, null, { lokasiId: l.id });
          if (rm.error) { return; }
          lap.masuk++;
        } else {
          /* Sudah pernah ditempatkan — yang boleh diambil adalah saldo gudang
             yang SUNGGUH ada di sana, bukan angka penempatan yang dikarang
             ulang. Mengambil lebih banyak daripada yang ada akan ditolak
             MCS.catatMutasi, dan seluruh pengambilan gagal diam-diam lagi. */
          masuk = MCS.saldoDiLokasi(s.id, l.id);
          if (masuk <= 0) return;
        }

        /* --- pengambilan oleh petugas --- */
        if (!orang.length) return;
        var n = bulat(1, 3);
        for (var i = 0; i < n; i++) {
          var ambil = bulat(1, Math.max(1, Math.floor(masuk / 4)));
          var p = pilih(orang);
          var rk = MCS.catatMutasi(s.id, -ambil, 'keluar',
            I18N.t('Diambil untuk troli'), null, null,
            { lokasiId: l.id, pekerjaId: p.id });
          if (!rk.error) lap.keluar++;
        }
      });
    });
  }

  /* ---------------------------------------------------------- 2. KONTRAK */
  /**
   * Satu kontrak per gedung, dengan nilai yang masuk akal terhadap luasnya.
   *
   * Nilainya DITURUNKAN dari luas, bukan diacak bebas: kontrak Rp 5 juta untuk
   * gedung 8.000 m² dan Rp 80 juta untuk gedung 800 m² akan membuat setiap
   * angka biaya per meter di layar terbaca sebagai galat perhitungan.
   */
  function kontrak(k, lap) {
    if (!window.KONTRAK) { lap.kontrakGagal = 'modul KONTRAK tidak ada'; return; }
    var sudah = KONTRAK.semua(k.id).length;
    if (sudah) { lap.kontrakDilewati = sudah; return; }

    var lokasi = LOKASI.semua(k.id).filter(function (l) { return l.aktif !== false; })
      .slice(0, 12);
    lap.kontrak = 0;
    var mulai = U.iso(U.addDays(new Date(), -bulat(120, 400)));
    lokasi.forEach(function (l) {
      if (sisaRuang() < 700000) { lap.ruangHabis = true; return; }
      var lu = LOKASI.luas(k.id, l.id);
      var m2 = Math.max(200, Number(lu && lu.luasTanah) || 1000);
      /* Rp 9.000–14.000 per m² per bulan — kisaran kontrak kebersihan gedung
         komersial di Indonesia, dibulatkan ke ratusan ribu. */
      var nilai = Math.round(m2 * antara(9000, 14000) / 100000) * 100000;
      var r = KONTRAK.buat(k.id, {
        nama: I18N.t('Jasa kebersihan') + ' — ' + l.nama,
        pihak: k.nama,
        mulai: mulai,
        sampai: U.iso(U.addDays(new Date(mulai + 'T00:00:00'), 730)),
        nilaiBulanan: nilai,
        /* KONTRAK melingkup lewat `areaIds`, bukan `lokasiId` — dan kosong
           berarti SELURUH gedung. Areanya disebut lengkap supaya lingkupnya
           benar-benar teruji, bukan dibiarkan kosong yang tidak menguji apa
           pun tentang penyaringan lingkup. */
        areaIds: LOKASI.areaLokasi(k.id, l.id).map(function (a) { return a.id; }),
        lingkupTeks: I18N.t('Pembersihan harian seluruh area gedung ini.'),
        /* 'berjalan', BUKAN bawaan 'draf'. TAGIHAN.susun hanya melihat kontrak
           berstatus berjalan, dan kontrak draf menghasilkan nol baris tagihan
           dengan pesan 'tidak ada yang bisa ditagihkan' — seolah itu keadaan
           yang wajar. Jebakan yang sama sudah dicatat di tagihan.js, dan
           penyemai ini tetap jatuh ke saudaranya. */
        status: 'berjalan'
      }, (window.APP && APP.user) || null);
      if (!r.error) lap.kontrak++;
      else lap.kontrakSalah = r.error;
    });
  }

  /* ---------------------------------------------------------- 3. TAGIHAN */
  /**
   * Menerbitkan tagihan untuk beberapa bulan yang SUDAH LEWAT, lalu melunasi
   * sebagiannya.
   *
   * Bulan berjalan sengaja TIDAK ditagihkan: menagih bulan yang belum selesai
   * adalah kesalahan yang justru ingin ditemukan audit, bukan keadaan yang
   * dibuat sendiri oleh penyemainya.
   *
   * Sebagian dibiarkan belum lunas — tagihan yang seluruhnya lunas membuat
   * layar tunggakan kosong, dan layar yang kosong tidak menguji apa pun.
   */
  function tagihan(k, lap) {
    if (!window.TAGIHAN) { lap.tagihanGagal = 'modul TAGIHAN tidak ada'; return; }
    var sudah = TAGIHAN.daftar(k.id).length;
    if (sudah) { lap.tagihanDilewati = sudah; return; }

    lap.tagihan = 0; lap.lunas = 0;
    var kini = new Date();
    for (var mundur = 3; mundur >= 1; mundur--) {
      if (sisaRuang() < 700000) { lap.ruangHabis = true; break; }
      var d = new Date(kini.getFullYear(), kini.getMonth() - mundur, 1);
      var r = TAGIHAN.terbitkan(k.id, d.getFullYear(), d.getMonth() + 1,
        (window.APP && APP.user) || null);
      if (r.error) { lap.tagihanSalah = r.error; continue; }
      lap.tagihan++;
      /* Yang paling lama dibiarkan menunggak — itulah keadaan yang harus
         terlihat di layar tunggakan. */
      if (mundur < 3) {
        /* Argumen keduanya TEKS catatan, bukan objek — objek yang dilewatkan
           ke sini akan tersimpan sebagai '[object Object]' pada catatan
           pelunasan, dan itu jenis kerusakan yang baru ketahuan berbulan-bulan
           kemudian saat ada yang mencari bukti bayarnya. */
        var rl = TAGIHAN.tandaiLunas(r.tagihan.id,
          I18N.t('Dibayar lewat') + ' ' + pilih([I18N.t('transfer'), I18N.t('tunai')]) +
          ' · ' + U.iso(U.addDays(d, bulat(35, 55))),
          (window.APP && APP.user) || null);
        if (!rl.error) lap.lunas++;
      }
    }
  }

  /* ------------------------------------------------------------ JALANKAN */
  function jalankan() {
    var k = korporatAktif();
    if (!k) return { error: 'Tidak ada korporat. Masuk sebagai staf korporat dulu.' };
    if (!window.MCS || !window.LOKASI) return { error: 'Modul MCS/LOKASI belum siap.' };

    var lap = { korporat: k.nama, ruangAwalKB: Math.round(sisaRuang() / 1024) };
    mutasiStok(k, lap);
    kontrak(k, lap);
    tagihan(k, lap);
    DB.save(true);
    lap.ruangAkhirKB = Math.round(sisaRuang() / 1024);
    return lap;
  }

  return { jalankan: jalankan, sisaRuang: sisaRuang };
})();
