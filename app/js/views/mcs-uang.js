/* ==========================================================================
   views/mcs-uang.js — Penggajian, tagihan, biaya, kontrak
   --------------------------------------------------------------------------
   Angka yang menyangkut uang. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  var STATUS = VMCS.STATUS,
      T = VMCS.T,
      angka = VMCS.angka,
      baris = VMCS.baris,
      barisId = VMCS.barisId,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpSaring = VMCS.dpSaring,
      jml = VMCS.jml,
      kop = VMCS.kop,
      korp = VMCS.korp,
      kvKerja = VMCS.kvKerja;

  var byTahun = null, byBulan = null;

  function byPeriode() {
    var d = new Date();
    return { tahun: byTahun || d.getFullYear(), bulan: byBulan || (d.getMonth() + 1) };
  }

  function renderBiaya() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var p = byPeriode();
    var h = BIAYA.hitung(k.id, p.tahun, p.bulan);
    var d = new Date();
    var iniBulanIni = p.tahun === d.getFullYear() && p.bulan === (d.getMonth() + 1);
    var namaBulan = U.tglPanjang(h.periode.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');

    return kepalaBiaya(namaBulan, iniBulanIni) +
      catatanBiaya(h) +
      kartuDasarTenaga(h) +
      /* Peringatan tarif hanya relevan pada dasar beban — pada dasar gaji,
         tarif per jam tidak dipakai sama sekali, dan memperingatkan tentang
         angka yang tidak dipakai hanya melatih orang mengabaikan peringatan. */
      (h.dasarTenaga !== 'gaji' && !h.cfg.tarifJam ? peringatanTarif() : '') +
      (h.stokTanpaHarga.length ? peringatanHarga(h) : '') +
      asalHargaBahan(h) +
      ringkasBiaya(h) +
      (h.takTeralokasi ? kartuTakTeralokasi(h) : '') +
      kartuAreaBiaya(h) +
      kartuLokasiBiaya(h) +
      kartuPetugasBiaya(h) +
      kartuObjekBiaya(h);
  }

  function kepalaBiaya(namaBulan, iniBulanIni) {
    return '<div class="bd-kop">' +
        '<div class="bd-kop__n">' +
          '<h2 class="mcs-h">' + T('Biaya kebersihan') + '</h2>' +
          '<div class="tbl-sub">' + U.esc(namaBulan) +
            (iniBulanIni ? ' · ' + T('bulan berjalan') : '') + '</div>' +
        '</div>' +
        '<div class="bd-kop__t">' +
          '<button class="btn btn--ghost btn--sm" data-act="by-bulan" data-d="-1">‹</button>' +
          (iniBulanIni ? '' : '<button class="btn btn--ghost btn--sm" data-act="by-kini">' +
            T('Bulan ini') + '</button>') +
          '<button class="btn btn--ghost btn--sm" data-act="by-bulan" data-d="1"' +
            (iniBulanIni ? ' disabled' : '') + '>›</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="by-atur">⚙️ ' + T('Tarif') + '</button>' +
          '<button class="btn btn--sm" data-act="by-cetak">🖨️ ' + T('Cetak') + '</button>' +
        '</div>' +
      '</div>';
  }

  function catatanBiaya(h) {
    var susut = h && h.masukPenyusutan;
    return UI.alert('info',
      '<b>' + T('Biaya OPERASIONAL, bukan biaya penuh.') + '</b> ' +
      (susut
        ? T('Yang dihitung: tenaga, bahan habis pakai, pekerjaan tambahan, dan ' +
            'penyusutan peralatan. Tidak termasuk listrik, air, atau sewa gudang.')
        : T('Yang dihitung: tenaga, bahan habis pakai, dan pekerjaan tambahan. ' +
            'Tidak termasuk penyusutan peralatan, listrik, air, atau sewa gudang.')) +
      ' ' +
      T('Tarif tenaga adalah angka yang Anda masukkan sendiri — MCS tidak ' +
        'memegang data gaji, dan tidak seharusnya.'),
      '💰') + '<div class="mb-3"></div>';
  }

  /**
   * Harga bahan itu datang dari mana.
   *
   * Harga dari nota penerimaan dan harga yang diketik tangan tampil serupa
   * pada baris rupiah yang sama, dan yang tampil serupa akan dipercaya
   * serupa — padahal yang satu terbukti dibayar dan yang lain adalah
   * ingatan seseorang. Karena itu asalnya dikatakan, bukan disimpulkan.
   *
   * Tidak ditampilkan sama sekali bila tidak ada bahan yang terpakai pada
   * periode itu: keterangan tentang angka yang tidak ada hanyalah bunyi.
   */

  function asalHargaBahan(h) {
    var nota = h.bahanDariNota || 0;
    var lama = h.bahanDariTerakhir || 0;
    if (!nota && !lama) return '';
    var isi = nota && !lama
      ? '<b>' + T('Harga bahan dari nota penerimaan.') + '</b> ' +
        T('Rata-rata bertimbang dari harga yang sungguh dibayar sampai akhir ' +
          'periode ini — bukan harga hari ini.')
      : (!nota
        ? '<b>' + T('Harga bahan memakai harga terakhir yang diketik.') + '</b> ' +
          T('Belum ada nota penerimaan, jadi biaya bulan-bulan lampau dihitung ' +
            'dengan harga hari ini. Catat penerimaan bernota agar angkanya ' +
            'memakai harga yang sungguh dibayar saat itu.')
        : '<b>' + T('Harga bahan bercampur dua sumber.') + '</b> ' +
          jml(nota, T('1 baris dihargai dari nota penerimaan'),
            T('{n} baris dihargai dari nota penerimaan')) + ', ' +
          jml(lama, T('1 baris dari harga terakhir yang diketik'),
            T('{n} baris dari harga terakhir yang diketik')) + '. ' +
          T('Yang kedua memakai harga hari ini untuk pemakaian yang sudah ' +
            'lampau.'));
    return UI.alert(nota ? 'info' : 'warn', isi, '🏷️') + '<div class="mb-3"></div>';
  }

  function peringatanTarif() {
    return UI.alert('warn',
      '<b>' + T('Tarif tenaga per jam belum diisi.') + '</b> ' +
      T('Selama nol, biaya tenaga tidak dihitung sama sekali — dan tenaga ' +
        'biasanya bagian terbesar dari biaya kebersihan. Angkanya sengaja tidak ' +
        'ditebak: yang ditebak akan dibaca sebagai kenyataan.') +
      ' <button class="btn btn--sm" data-act="by-atur">' + T('Isi tarif') + '</button>',
      '⚙️') + '<div class="mb-3"></div>';
  }

  function peringatanHarga(h) {
    return UI.alert('warn',
      '<b>' + jml(h.stokTanpaHarga.length, T('1 barang belum punya harga satuan'),
        T('{n} barang belum punya harga satuan')) + ':</b> ' +
      U.esc(h.stokTanpaHarga.slice(0, 6).map(function (x) { return x.nama; }).join(', ')) +
      (h.stokTanpaHarga.length > 6 ? '…' : '') + '. ' +
      T('Pemakaiannya tidak ikut terhitung, sehingga biaya bahan di bawah ini ' +
        'lebih kecil daripada yang sebenarnya.'), '🏷️') + '<div class="mb-3"></div>';
  }

  function ringkasBiaya(h) {
    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Total bulan ini'), value: U.rpShort(h.total), icon: '💰',
          meta: h.perM2 !== null
            ? U.rp(h.perM2) + '/m² · ' + U.num(h.luasBersih) + ' m² ' + T('dibersihkan')
            : T('luas belum lengkap') }) +
        UI.stat({ label: T('Tenaga'), value: U.rpShort(h.tenaga), icon: '🧹',
          meta: h.total ? Math.round(h.tenaga / h.total * 100) + '%' : '' }) +
        UI.stat({ label: T('Bahan habis pakai'), value: U.rpShort(h.bahan), icon: '🧴',
          meta: h.total ? Math.round(h.bahan / h.total * 100) + '%' : '' }) +
        UI.stat({ label: T('Pekerjaan & servis'), value: U.rpShort(h.kerja + h.servis), icon: '🧰',
          meta: h.total ? Math.round((h.kerja + h.servis) / h.total * 100) + '%' : '' }) +
      '</div>' +
      (h.penyusutan ? kartuPenyusutan(h) : '') +
      /* Selisih antara luas TERDAFTAR dan luas DIBERSIHKAN disebutkan, bukan
         dihilangkan. Petak seluas gedung yang berdiri di atasnya tidak ikut
         menjadi penyebut — dan orang yang menjumlahkan sendiri luas areanya
         berhak tahu mengapa angkanya berbeda. */
      (h.luasTotal > h.luasBersih
        ? UI.alert('info',
            '<b>' + U.num(h.luasBersih) + ' m² ' + T('dari') + ' ' +
            U.num(h.luasTotal) + ' m² ' + T('yang terdaftar dipakai sebagai penyebut ' +
              'biaya per meter.') + '</b> ' +
            T('Sisanya adalah area yang belum punya jadwal dan belum memakan biaya ' +
              'bulan ini — umumnya petak tempat gedung berdiri, yang luasnya sudah ' +
              'terwakili oleh ruangan di dalamnya. Menjumlahkan keduanya berarti ' +
              'menghitung tanah yang sama dua kali, dan membuat biaya per meter ' +
              'terlihat lebih murah daripada yang sebenarnya.'),
            '📐') + '<div class="mb-3"></div>'
        : '') +
      (h.nilaiKontrak ? kartuKontrakBiaya(h) : '');
  }

  /**
   * Penyusutan peralatan.
   *
   * Selalu diperlihatkan bila ada, entah ikut dijumlahkan atau tidak. Biaya
   * yang tidak pernah muncul di rekening adalah biaya yang paling mudah
   * dilupakan — sampai mesinnya mati dan tidak ada anggaran penggantinya.
   */

  function kartuPenyusutan(h) {
    return UI.alert(h.masukPenyusutan ? 'info' : 'warn',
      '<b>' + T('Penyusutan peralatan') + ' ' + U.rp(h.penyusutan) + ' ' +
      T('per bulan') + '</b> — ' + jml(h.asetSusut, '1 alat', '{n} alat') + '. ' +
      (h.masukPenyusutan
        ? T('Sudah ikut dijumlahkan ke dalam total di atas.')
        : T('BELUM ikut dijumlahkan ke dalam total di atas — total yang tampil ' +
            'adalah biaya operasional, yaitu uang yang benar-benar keluar bulan ' +
            'ini. Nyalakan lewat Pengaturan biaya bila yang Anda susun adalah ' +
            'anggaran penggantian alat.')) +
      (h.asetTanpaNilai
        ? ' ' + jml(h.asetTanpaNilai,
            T('1 alat belum diisi harga beli, tanggal beli, atau masa manfaatnya,') + ' ' +
              T('jadi penyusutannya belum terhitung.'),
            T('{n} alat belum diisi harga beli, tanggal beli, atau masa manfaatnya,') + ' ' +
              T('jadi penyusutannya belum terhitung.'))
        : ''),
      '📉') + '<div class="mb-3"></div>';
  }

  function kartuKontrakBiaya(h) {
    var lebih = h.selisihKontrak !== null && h.selisihKontrak < 0;
    return UI.alert(lebih ? 'warn' : 'info',
      '<b>' + T('Nilai kontrak bulan ini') + ' ' + U.rp(h.nilaiKontrak) + '.</b> ' +
      T('Biaya operasional tercatat') + ' ' + U.rp(h.total) + ' — ' +
      (lebih
        ? T('lebih besar {n} dari nilai kontraknya.').replace('{n}', U.rp(Math.abs(h.selisihKontrak)))
        : T('selisih {n}.').replace('{n}', U.rp(h.selisihKontrak))) + ' ' +
      /* Peringatan yang menentukan: selisih ini BUKAN laba. */
      (h.masukPenyusutan
        ? T('Selisih ini BUKAN laba — penyusutan peralatan sudah ikut, tetapi ' +
            'biaya penuh masih mengandung hal-hal yang tidak dilacak MCS, seperti ' +
            'biaya kantor, pajak, dan asuransi.')
        : T('Selisih ini BUKAN laba — biaya penuh mengandung hal-hal yang tidak ' +
            'dilacak MCS, seperti penyusutan peralatan dan biaya kantor.')),
      '📄') + '<div class="mb-3"></div>';
  }

  /**
   * Biaya yang tidak bisa ditempelkan ke area mana pun.
   *
   * Ditampilkan TERPISAH dan disebut alasannya, bukan dibagi rata. Angka yang
   * mengaku tahu sesuatu yang tidak diketahuinya lebih berbahaya daripada
   * angka yang mengaku tidak tahu.
   */

  function kartuTakTeralokasi(h) {
    return UI.card({ cls: 'mb-3', title: T('Belum teralokasi ke area'),
      sub: T('Sengaja TIDAK dibagi rata — lihat keterangannya'),
      body: '<div class="wk-d__k">' +
          kvKerja(T('Bahan tanpa area'), U.rp(h.bahanTanpaArea)) +
          kvKerja(T('Pekerjaan tanpa area'), U.rp(h.kerjaTanpaArea)) +
          kvKerja(T('Servis peralatan'), U.rp(h.servis)) +
          /* Kehilangan gudang punya barisnya sendiri. Uangnya nyata dan sudah
             keluar, tetapi yang memperbaiki keadaannya bukan petugas
             kebersihan melainkan cara menyimpannya — dan itu hanya terlihat
             bila angkanya berdiri terpisah. */
          (h.bahanHilang
            ? kvKerja(T('Kehilangan gudang'), U.rp(h.bahanHilang)) : '') +
          /* Barisnya sendiri. Tanpa ini kartunya tidak menjumlah — tiga nol
             di atas satu angka besar, dan pembacanya menyimpulkan angkanya
             salah, bukan bahwa ada satu jenis biaya yang tidak dinamai. */
          (h.tenagaTanpaArea
            ? kvKerja(T('Gaji tanpa tugas'), U.rp(h.tenagaTanpaArea)) : '') +
          /* Hanya bila ikut dijumlahkan. Memperlihatkan baris yang tidak masuk
             jumlah membuat kartunya berhenti menjumlah — persoalan yang sama
             seperti gaji tanpa tugas dahulu. */
          (h.masukPenyusutan && h.penyusutan
            ? kvKerja(T('Penyusutan peralatan'), U.rp(h.penyusutan)) : '') +
          kvKerja(T('Jumlah'), U.rp(h.takTeralokasi)) +
        '</div>' +
        (h.gajiTakTerpakai && h.gajiTakTerpakai.length
          ? '<div class="tbl-sub mt-2"><b>' + T('Digaji tanpa tugas selesai') + ':</b> ' +
            U.esc(h.gajiTakTerpakai.map(function (x) { return x.nama; }).join(', ')) +
            ' — ' + T('bisa jadi penyelia yang memang tidak memegang jadwal, bisa ' +
              'jadi tugasnya tidak pernah ditandai selesai. Keduanya perlu dilihat, ' +
              'dan tidak bisa dibedakan dari angka saja.') + '</div>'
          : '') +
        '<div class="tbl-sub mt-2">' +
          T('Mesin poles yang diservis tidak dipakai merata di semua area, dan ' +
            'sabun yang keluar tanpa mencatat areanya tidak dipakai di mana-mana ' +
            'secara adil. Membaginya rata menghasilkan angka yang lebih rapi dan ' +
            'lebih salah. Untuk mengecilkannya: sebutkan areanya saat mencatat ' +
            'barang keluar dan saat membuat pekerjaan tambahan.') +
        '</div>' });
  }

  function kartuAreaBiaya(h) {
    if (!h.baris.length) {
      return UI.card({ body: UI.empty('📍', T('Belum ada area'), '') });
    }
    function lokBiaya(x) {
      return x.area && x.area.lokasiId ? x.area.lokasiId : '';
    }
    var hb = dpSaring('biayaArea', h.baris, lokBiaya);
    var kolomBiaya = [
        { h: T('Area'), r: function (x) {
          return x.jenis.ikon + ' ' + U.esc(x.area.nama); } },
        { h: T('Luas'), cls: 'num', r: function (x) {
          return x.adaLuas ? U.num(x.luas) + ' m²'
            : '<span class="mcs-warn">' + T('belum diisi') + '</span>'; } },
        { h: T('Jam/bulan'), cls: 'num', r: function (x) {
          return x.jam === null ? '—' : U.num(x.jam); } },
        { h: T('Tenaga'), cls: 'num', r: function (x) { return U.rpShort(x.tenaga); } },
        { h: T('Bahan'), cls: 'num', r: function (x) { return U.rpShort(x.bahan); } },
        { h: T('Pekerjaan'), cls: 'num', r: function (x) { return U.rpShort(x.kerja); } },
        { h: T('Total'), cls: 'num', r: function (x) {
          return '<b>' + U.rpShort(x.total) + '</b>'; } },
        /* Kolom yang paling berguna dan paling jarang ada: biaya per meter
           persegi. Inilah satu-satunya angka yang bisa dibandingkan antararea
           dan antargedung. */
        { h: T('Per m²'), cls: 'num', r: function (x) {
          return x.perM2 === null ? '—' : '<b>' + U.rp(x.perM2) + '</b>'; } }
    ];
    return UI.card({ title: T('Biaya per area'),
      sub: T('Diurutkan dari yang paling mahal'),
      body: dpBilah('biayaArea', h.baris, hb, lokBiaya) +
        dpPotong('biayaArea', hb, null, function (tampil) {
          /* Tabel ini RINGKASAN: tiap barisnya hasil menghitung jadwal,
             pemakaian bahan, dan pekerjaan tambahan di satu area. Angka
             yang dipakai mengambil keputusan harus bisa ditelusuri sampai
             ke barisnya — yang tidak bisa diperiksa akhirnya tidak
             dipercaya siapa pun. */
          return UI.table(kolomBiaya, tampil, null, { sumber: {
            teks: T('Dihitung dari jadwal, pemakaian bahan, dan pekerjaan ' +
              'tambahan tiap area pada bulan ini.'),
            hal: 'mcsArea', label: T('Buka daftar area') } });
        }) });
  }

  /**
   * Dari mana angka tenaga datang.
   *
   * Ditulis di atas seluruh tabel, bukan disembunyikan di pengaturan: dua
   * dasar menghasilkan dua angka yang sangat berbeda untuk kata yang sama
   * ("biaya"), dan orang yang membaca layar ini akan mengambil keputusan
   * dengannya.
   */

  function kartuDasarTenaga(h) {
    var gaji = h.dasarTenaga === 'gaji';
    return UI.alert(gaji ? 'ok' : 'info',
      '<b>' + (gaji
        ? T('Biaya tenaga memakai penggajian sungguhan.')
        : T('Biaya tenaga memakai model beban kerja.')) + '</b> ' +
      (gaji
        ? T('Uang yang benar-benar keluar bulan ini, dibagi ke area menurut tugas ' +
            'yang benar-benar dikerjakan tiap petugas.')
        : T('Jam teoretis dari luas area dikali tarif yang Anda ketik — berapa yang ' +
            'SEHARUSNYA dikeluarkan, bukan berapa yang keluar. Isi gaji petugas lalu ' +
            'ganti dasarnya di Pengaturan untuk memakai angka sungguhan.')) +
      ' <button class="btn btn--ghost btn--sm" data-act="by-atur">' + T('Ubah dasar') +
      '</button>', gaji ? '\u{1F4B5}' : '\u{1F9EE}');
  }

  function kartuPetugasBiaya(h) {
    if (h.dasarTenaga !== 'gaji') {
      /* Pada dasar 'beban', jam teoretis melekat pada AREA dan tidak pada
         orang. Membagi rata ke petugas akan menghasilkan angka yang tidak
         berasal dari mana pun. */
      return UI.card({ title: T('Biaya per petugas'),
        body: UI.empty('\u{1F465}', T('Butuh dasar penggajian'),
          T('Biaya per petugas hanya bisa dihitung dari gaji yang sungguh dibayarkan. ' +
            'Model beban kerja melekat pada area, bukan pada orang.')) });
    }
    if (!h.perPetugas.length) {
      return UI.card({ title: T('Biaya per petugas'),
        body: UI.empty('\u{1F465}', T('Belum ada gaji yang terisi'),
          T('Isi gaji pokok petugas di halaman Penggajian.')) });
    }
    /* Kartu ini TERSEMBUNYI selama dasarnya masih model beban, dan baru
       muncul begitu gaji sungguhan dipakai — karena itu ia sempat luput dari
       pembatasan. Begitu dasarnya diganti, halaman Biaya melonjak dari 1.573
       ke 6.837 elemen. Yang tidak pernah tampil saat diuji adalah yang paling
       mudah terlewat. */
    function lokBP(x) { return (x.pekerja.lokasiIds || []); }
    var hp = dpSaring('biayaPetugas', h.perPetugas, lokBP);
    return UI.card({ title: T('Biaya per petugas'),
      sub: T('Gaji sebulan, dibagi ke area menurut tugas yang diselesaikan'),
      body: dpBilah('biayaPetugas', h.perPetugas, hp, lokBP) +
        dpPotong('biayaPetugas', hp, function (x) {
        return '<div class="by-p">' +
          '<div class="row row--sb">' +
            '<b>' + U.esc(x.pekerja.nama) + '</b>' +
            '<b>' + U.rp(x.biaya) + '</b>' +
          '</div>' +
          '<div class="tbl-sub">' + jml(x.tugas, T('1 tugas selesai'), T('{n} tugas selesai')) + '</div>' +
          /* Lima area per orang, sisanya disebut jumlahnya. Satu petugas
             kantor pusat memegang empat belas ruangan; empat puluh baris
             seperti itu menjadi lima ratus enam puluh baris rincian di
             bawah kartu yang seharusnya menjawab 'berapa biaya orang ini'. */
          (x.area.length
            ? '<div class="by-p__a">' + x.area.slice(0, 5).map(function (a) {
                return '<div class="row row--sb"><span>' + U.esc(a.nama) + '</span>' +
                  '<span>' + U.rp(a.biaya) + ' <span class="tbl-sub">· ' + a.tugas + '</span></span></div>';
              }).join('') +
              (x.area.length > 5
                ? '<div class="tbl-sub">' + T('dan {n} lainnya')
                    .replace('{n}', U.num(x.area.length - 5)) + '</div>'
                : '') + '</div>'
            : '<div class="mcs-warn">' +
              T('Tidak ada tugas selesai atas namanya bulan ini — biayanya tidak ' +
                'dibagi ke area mana pun.') + '</div>') +
        '</div>';
      }) });
  }

  function kartuLokasiBiaya(h) {
    if (!h.perLokasi.length) return '';
    var kolomGedung = [
        { h: T('Gedung'), r: function (x) { return U.esc(x.nama); } },
        { h: T('Area'), cls: 'num', r: function (x) { return U.num(x.area); } },
        { h: T('Luas dibersihkan'), cls: 'num', r: function (x) {
          if (!x.luas) return '—';
          return U.num(x.luasBersih) + ' m²' +
            (x.luasBersih < x.luas
              /* Yang terdaftar disebut di bawahnya, bukan dibuang: orang yang
                 menjumlahkan sendiri luas areanya harus menemukan angkanya di
                 sini, bukan menyimpulkan tabelnya rusak. */
              ? '<div class="tbl-sub">' + T('dari') + ' ' + U.num(x.luas) + ' m² ' +
                T('terdaftar') + '</div>'
              : ''); } },
        { h: T('Tenaga'), cls: 'num', r: function (x) { return U.rpShort(x.tenaga); } },
        { h: T('Bahan'), cls: 'num', r: function (x) { return U.rpShort(x.bahan); } },
        { h: T('Total'), cls: 'num', r: function (x) {
          return '<b>' + U.rpShort(x.total) + '</b>'; } },
        { h: T('Per m²'), cls: 'num', r: function (x) {
          return x.perM2 === null ? '—' : '<b>' + U.rp(x.perM2) + '</b>'; } }
    ];
    return UI.card({ title: T('Biaya per gedung'),
      sub: T('Digulung dari areanya — gedung tidak punya biaya sendiri'),
      body: dpPotong('biayaLokasi', h.perLokasi, null, function (tampil) {
        return UI.table(kolomGedung, tampil, null, { sumber: {
          teks: T('Digulung dari biaya tiap area di dalam gedungnya — ' +
            'gedung tidak punya biaya sendiri.'),
          hal: 'mcsLokasi', label: T('Buka daftar gedung') } });
      }) });
  }

  function kartuObjekBiaya(h) {
    if (!h.perObjek.length) return '';
    var ada = h.objekBerbiaya > 0;
    return UI.card({ title: T('Objek'),
      sub: ada
        ? T('Tenaga area dibagi menurut menit × seberapa sering tiap objek dikerjakan')
        : T('Jumlah pemindaian — belum ada objek yang diisi menitnya'),
      body: '<div class="hint mb-2">' +
          (ada
            /* Yang paling mudah disalahpahami disebut lebih dulu: ini
               PEMBAGIAN, bukan pengukuran. Angka rupiah di sebelah nama
               wastafel akan dibaca sebagai biaya wastafel itu kalau tidak
               dikatakan sejak awal bahwa ia porsi dari biaya ruangannya. */
            ? T('Angka ini PEMBAGIAN, bukan pengukuran. Biaya tenaga tiap area ' +
                'dibagi ke objek-objeknya menurut perkiraan menit dikali berapa ' +
                'kali seminggu objek itu dikerjakan — keduanya Anda isi sendiri, ' +
                'dan jadwal tetap disusun per area, bukan per objek. Kaca yang ' +
                'dicuci sepekan sekali karena itu tidak memikul beban yang sama ' +
                'dengan lantai yang dipel tiap hari. Bahan dan pekerjaan tambahan ' +
                'tidak ikut dibagi: sabun yang keluar untuk sebuah toilet tidak ' +
                'melekat pada wastafelnya.')
            : T('Belum ada objek yang diisi perkiraan menitnya, jadi biayanya belum ' +
                'bisa dibagi. Isi menit pada formulir objek di halaman Lokasi — ' +
                'angkanya sudah diusulkan menurut jenis, tinggal disesuaikan.')) +
        '</div>' +
        (h.objekBelumTerbagi
          ? UI.alert('warn',
              '<b>' + U.rp(h.objekBelumTerbagi) + ' ' + T('belum terbagi ke objek mana pun') +
              '.</b> ' +
              (h.objekTanpaMenit
                ? jml(h.objekTanpaMenit, T('1 objek belum diisi menitnya'),
                    T('{n} objek belum diisi menitnya')) + '. '
                : '') +
              T('Yang belum diisi TIDAK dianggap gratis — ia dikeluarkan dari ' +
                'pembagian, supaya biayanya tidak menumpuk ke objek yang kebetulan ' +
                'sudah diisi.'), '⚖️') + '<div class="mb-2"></div>'
          : '') +
        (function () {
        var kolomObjek = [
          { h: T('Objek'), r: function (x) { return U.esc(x.objek.nama); } },
          { h: T('Area'), r: function (x) { return U.esc(x.area); } },
          { h: T('Menit'), cls: 'num', r: function (x) {
            return x.menit ? U.num(x.menit) : '<span class="tbl-sub">—</span>'; } },
          { h: T('Pemindaian'), cls: 'num', r: function (x) { return U.num(x.pindai); } },
          { h: T('Porsi tenaga'), cls: 'num', r: function (x) {
            return x.biaya === null ? '<span class="tbl-sub">—</span>'
                                    : '<b>' + U.rpShort(x.biaya) + '</b>'; } }
        ];
    /* Sebelumnya baris ini berbunyi `h.perObjek.slice(0, 30)` — memotong
       tanpa mengatakannya. Pada gedung berisi 1.653 objek itu berarti
       1.623 di antaranya lenyap tanpa jejak, dan yang membaca tabel
       menyimpulkan objeknya belum didaftarkan. Sekarang sisanya disebut
       dan bisa dibuka. */
    return dpPotong('biayaObjek', h.perObjek, null, function (tampil) {
      return UI.table(kolomObjek, tampil, null, { sumber: {
        teks: T('Biaya tiap objek yang punya jadwal sendiri. Objek tanpa ' +
          'jadwal tidak muncul di sini.'),
        hal: 'mcsArea', label: T('Buka daftar area') } });
    }); })() });
  }

  function dialogTarif() {
    var k = korp();
    var c = BIAYA.config(k.id);
    var b = BEBAN.config(k.id);
    var adaGaji = MCS.pekerja(k.id).some(function (p) {
      return p.upah && p.upah.pokok;
    });
    UI.formModal({
      title: T('Biaya tenaga'), okText: T('Simpan'),
      fields: [
        { name: 'dasarTenaga', label: T('Dasar biaya tenaga'), type: 'select',
          value: c.dasarTenaga,
          options: [
            { value: 'beban', label: T('Model beban kerja (jam teoretis × tarif)') },
            { value: 'gaji', label: T('Penggajian sungguhan') }
          ],
          hint: adaGaji
            ? T('Penggajian sungguhan membagi gaji bulanan ke area menurut tugas ' +
                'yang benar-benar diselesaikan tiap petugas.')
            /* Dikatakan SEBELUM dipilih, bukan setelah layarnya kosong: pilihan
               yang menghasilkan halaman nol tanpa penjelasan akan dibaca
               sebagai fiturnya rusak. */
            : T('Belum ada gaji petugas yang terisi — memilih penggajian sungguhan ' +
                'sekarang akan menghasilkan biaya tenaga nol. Isi dulu di halaman ' +
                'Penggajian.') },
        { type: 'html', html: UI.alert('info',
            T('Biaya tenaga dihitung dari jam kerja per area × tarif ini. Cara ' +
              'menghitungnya: total upah bulanan seluruh petugas pelaksana dibagi ' +
              'total jam kerja mereka sebulan ({j} jam per orang).')
              .replace('{j}', Math.round(b.jamPerHari * b.hariPerMinggu * 4.345)), '💰') },
        { name: 'tarifJam', label: T('Tarif per jam'), type: 'number', min: 0,
          value: c.tarifJam,
          hint: T('Termasuk tunjangan dan iuran bila ingin angkanya mendekati biaya ' +
            'sebenarnya. MCS tidak memegang data gaji — angka ini Anda yang tahu.') },
        { name: 'masukPenyusutan', label: T('Ikutkan penyusutan peralatan'),
          type: 'checkbox', value: !!c.masukPenyusutan,
          hint: T('Nilai peralatan yang habis tiap bulan, dibagi rata sepanjang masa ' +
            'manfaatnya. Ini biaya yang nyata, tetapi uangnya tidak keluar bulan ' +
            'ini. Biarkan mati bila angkanya dibandingkan dengan nilai kontrak — ' +
            'kontrak membayar pekerjaan bulan itu, bukan mesin yang dibeli tiga ' +
            'tahun lalu. Nyalakan bila yang disusun adalah anggaran penggantian ' +
            'alat.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = BIAYA.simpanConfig(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Tarif disimpan.'), 'ok');
      APP.refresh();
    });
  }

  function cetakBiaya() {
    var k = korp();
    if (!k) return;
    var p = byPeriode();
    var h = BIAYA.hitung(k.id, p.tahun, p.bulan);
    var namaBulan = U.tglPanjang(h.periode.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');
    cetakDaftar({
      judul: T('Biaya Kebersihan per Area'),
      sub: namaBulan + ' · ' + T('tarif tenaga') + ' ' + U.rp(h.cfg.tarifJam) + '/' + T('jam'),
      baris: h.baris,
      kolom: [
        { h: T('Area'), r: function (x) { return x.area.nama; } },
        { h: T('Jenis'), r: function (x) { return T(x.jenis.nama); } },
        { h: T('Luas (m²)'), num: true, r: function (x) {
          return x.adaLuas ? U.num(x.luas) : ''; } },
        { h: T('Jam per bulan'), num: true, r: function (x) {
          return x.jam === null ? '' : U.num(x.jam); } },
        { h: T('Tenaga'), num: true, r: function (x) { return U.num(x.tenaga); } },
        { h: T('Bahan'), num: true, r: function (x) { return U.num(x.bahan); } },
        { h: T('Pekerjaan'), num: true, r: function (x) { return U.num(x.kerja); } },
        { h: T('Total'), num: true, r: function (x) { return U.num(x.total); } },
        { h: T('Per m²'), num: true, r: function (x) {
          return x.perM2 === null ? '' : U.num(x.perM2); } }
      ],
      kaki: T('Belum teralokasi ke area: {n} (bahan tanpa area, pekerjaan tanpa area, ' +
        'servis peralatan) — sengaja TIDAK dibagi rata. Total seluruhnya {t}. ' +
        'Biaya operasional saja: tidak termasuk penyusutan, listrik, air, sewa gudang.')
        .replace('{n}', U.rp(h.takTeralokasi)).replace('{t}', U.rp(h.total))
    });
  }

  function mountBiaya(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'by-bulan': function (el) {
        var p = byPeriode();
        var m = p.bulan + (+el.getAttribute('data-d')), y = p.tahun;
        if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
        var d = new Date();
        if (y > d.getFullYear() || (y === d.getFullYear() && m > d.getMonth() + 1)) return;
        byTahun = y; byBulan = m;
        APP.refresh();
      },
      'by-kini': function () { byTahun = null; byBulan = null; APP.refresh(); },
      'by-atur': dialogTarif,
      'by-cetak': cetakBiaya
    }));
  }

  /* ================================================= KONTRAK & JANJI LAYANAN

     MCS punya SLA, tetapi hanya satu jenis: batas waktu menanggapi aduan.
     Yang disepakati dalam kontrak jauh lebih luas, dan sebelumnya tidak
     tercatat di mana pun — sehingga jawaban atas 'apakah janji kontrak
     terpenuhi bulan ini' harus dirakit tangan, oleh orang yang bisa memilih
     angka mana yang enak dibaca.
   */

  var ktBuka = null;

  function renderKontrak() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = KONTRAK.statistik(k.id);
    var l = KONTRAK.semua(k.id, { semua: true });

    return catatanKontrak() +
      (st.sudahLewat.length || st.segeraHabis.length ? peringatanKontrak(st) : '') +
      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Kontrak berjalan'), value: st.berjalan, icon: '📄',
          meta: st.draf ? jml(st.draf, '1 draf', '{n} draf') : '' }) +
        UI.stat({ label: T('Nilai bulanan'), value: U.rpShort(st.nilaiBulanan), icon: '💰',
          meta: T('jumlah kontrak yang berjalan') }) +
        UI.stat({ label: T('Janji tidak tercapai'), value: st.janjiGagal, icon: '⚠️',
          meta: T('bulan berjalan') }) +
        UI.stat({ label: T('Segera berakhir'), value: st.segeraHabis.length, icon: '📅',
          meta: T('dalam') + ' ' + KONTRAK.HARI_PERINGATAN + ' ' + T('hari') }) +
      '</div>' +

      '<div class="row between mb-3">' +
        '<div class="hint">' + jml(l.length, '1 kontrak', '{n} kontrak') + '</div>' +
        '<button class="btn btn--primary btn--sm" data-act="kt-baru">＋ ' +
          T('Kontrak Baru') + '</button>' +
      '</div>' +

      (l.length
        ? '<div class="wk-list">' + l.map(barisKontrak).join('') + '</div>'
        : UI.empty('📄', T('Belum ada kontrak tercatat'),
            T('Catat janji yang bisa diukur — capaian, bukti, mutu, inspeksi, ' +
              'tanggap aduan — lalu MCS memeriksanya sendiri tiap bulan.')));
  }

  /* Batas kemampuan modul ini disebut di layar, bukan ditemukan belakangan
     oleh orang yang mengira berkas kontraknya sudah aman tersimpan di sini. */

  function catatanKontrak() {
    return UI.alert('info',
      '<b>' + T('Ini ringkasan terukur dari kontrak, bukan kontraknya.') + '</b> ' +
      T('Tidak ada penyuntingan pasal, riwayat versi, coretan, atau tanda tangan ' +
        'elektronik yang sah secara hukum. Berkas aslinya tetap harus disimpan ' +
        'di tempat lain. Yang ada di sini adalah janji dalam bentuk angka — ' +
        'supaya bisa diperiksa sendiri tiap bulan, bukan dirakit tangan.'),
      '📄') + '<div class="mb-3"></div>';
  }

  function peringatanKontrak(st) {
    var isi = '';
    if (st.sudahLewat.length) {
      isi += '<b>' + jml(st.sudahLewat.length, T('1 kontrak sudah lewat masa berlakunya'),
        T('{n} kontrak sudah lewat masa berlakunya')) + ':</b> ' +
        U.esc(st.sudahLewat.map(function (x) { return x.nama; }).join(', ')) + '. ' +
        /* Kontrak yang lewat tetapi masih berstatus berjalan berarti jasanya
           terus diberikan tanpa dasar tertulis — dan itu masalah kedua belah
           pihak, bukan hanya administrasi. */
        T('Jasanya berjalan tanpa dasar tertulis. Perpanjang, atau ubah statusnya ' +
          'menjadi berakhir.') + ' ';
    }
    if (st.segeraHabis.length) {
      isi += jml(st.segeraHabis.length, '1 kontrak berakhir dalam {h} hari',
        '{n} kontrak berakhir dalam {h} hari').replace('{h}', KONTRAK.HARI_PERINGATAN) +
        ': ' + U.esc(st.segeraHabis.map(function (x) {
          return x.nama + ' (' + U.tglPendek(x.sampai) + ')'; }).join(', ')) + '.';
    }
    return UI.alert(st.sudahLewat.length ? 'danger' : 'warn', isi, '📅') +
      '<div class="mb-3"></div>';
  }

  /** Tanggal pendek YANG MENYEBUT TAHUNNYA — khusus dokumen bertahun. */

  function tglKontrak(v) {
    return U.tglPendek(v) + ' ' + U.d(v).getFullYear();
  }

  function barisKontrak(x) {
    var s = KONTRAK.status(x.status);
    var sisa = KONTRAK.sisaHari(x);
    var terbuka = ktBuka === x.id;
    var lewat = x.status === 'berjalan' && sisa !== null && sisa < 0;
    var d = new Date();
    var cek = x.status === 'berjalan'
      ? KONTRAK.periksa(x, d.getFullYear(), d.getMonth() + 1) : null;
    var area = (x.areaIds || []).length;

    return '<div class="wk-r' + (lewat || (cek && cek.gagal) ? ' wk-r--lewat' : '') + '">' +
      '<button class="wk-r__h" data-act="kt-buka" data-id="' + x.id + '" ' +
        'aria-expanded="' + terbuka + '">' +
        '<span class="wk-r__i">' + s.ikon + '</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(x.nama) + '</b>' +
          '<span>' + U.esc(x.no) +
            (x.pihak ? ' · ' + U.esc(x.pihak) : '') +
            /* TAHUN ikut disebut. U.tglPendek menulis '1 Jan' tanpa tahun,
               dan kontrak adalah dokumen bertahun: kontrak 2026 dan rencana
               2027 tampil sebagai '1 Jan — 31 Des' yang persis sama. Satu
               baris yang lebih panjang jauh lebih murah daripada dua kontrak
               yang tidak bisa dibedakan. */
            ' · ' + U.esc(tglKontrak(x.mulai)) + ' — ' +
            (x.sampai ? U.esc(tglKontrak(x.sampai)) : T('tanpa batas')) +
            ' · ' + (area ? jml(area, '1 area', '{n} area') : T('seluruh gedung')) +
            /* Frasa UTUH — T('bulan') sendirian menjadi 'months' di kamus,
               dan terbaca 'Rp486 jt/months'. */
            (x.nilaiBulanan
              ? ' · ' + T('{v}/bulan').replace('{v}', U.esc(U.rpShort(x.nilaiBulanan)))
              : '') +
          '</span>' +
          (lewat
            ? '<span class="mcs-warn">📅 ' + T('sudah lewat') + ' ' + Math.abs(sisa) + ' ' +
              T('hari') + '</span>'
            : (x.status === 'berjalan' && sisa !== null && sisa <= KONTRAK.HARI_PERINGATAN
              ? '<span class="kt-r__s">📅 ' + T('berakhir dalam') + ' ' + sisa + ' ' +
                T('hari') + '</span>' : '')) +
        '</span>' +
        (cek
          ? '<span class="chip chip--' + (cek.gagal ? 'danger' : (cek.persen === null ? 'muted' : 'ok')) + '">' +
            (cek.persen === null ? T('belum ada data')
              : cek.penuhi + '/' + cek.dinilai + ' ' + T('janji')) + '</span>'
          : '<span class="chip chip--' + s.warna + '">' + T(s.nama) + '</span>') +
        '<span class="wk-r__x">' + (terbuka ? '▾' : '▸') + '</span>' +
      '</button>' +
      (terbuka ? rincianKontrak(x, cek) : '') +
    '</div>';
  }

  function rincianKontrak(x, cek) {
    var area = (x.areaIds || []).map(function (id) {
      var a = MCS.areaSatu(id); return a ? a.nama : ''; }).filter(Boolean);

    return '<div class="wk-d">' +
      '<div class="wk-d__k">' +
        kvKerja(T('Pihak'), x.pihak || '—') +
        kvKerja(T('Masa berlaku'), U.tglPanjang(x.mulai) + ' — ' +
          (x.sampai ? U.tglPanjang(x.sampai) : T('tanpa batas'))) +
        kvKerja(T('Nilai bulanan'), x.nilaiBulanan ? U.rp(x.nilaiBulanan) : '—') +
        kvKerja(T('Lingkup'), area.length ? area.join(', ') : T('seluruh gedung')) +
        kvKerja(T('Status'), T(KONTRAK.status(x.status).nama)) +
      '</div>' +

      (x.lingkupTeks
        ? '<div class="k3-d__b"><b>' + T('Lingkup pekerjaan') + '</b>' +
          '<p>' + U.esc(x.lingkupTeks) + '</p></div>' : '') +
      (x.penalti
        ? '<div class="k3-d__b"><b>' + T('Sanksi bila tidak tercapai') + '</b>' +
          '<p>' + U.esc(x.penalti) + '</p></div>' : '') +
      (x.catatan
        ? '<div class="wk-d__c">' + U.esc(x.catatan) + '</div>' : '') +

      (cek ? blokJanji(cek) : '') +

      '<div class="wk-d__b">' +
        '<button class="btn btn--ghost btn--sm" data-act="kt-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="kt-cetak" data-id="' + x.id + '">🖨️ ' +
          T('Cetak kepatuhan') + '</button>' +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="kt-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div>' +
    '</div>';
  }

  /**
   * Janji vs kenyataan bulan berjalan.
   *
   * Target dan angka nyata berdiri BERDAMPINGAN pada tiap baris. Menampilkan
   * hanya centang atau silang membuat orang harus percaya pada penilaian
   * aplikasi — padahal yang dipertaruhkan adalah sanksi kontrak.
   */

  function blokJanji(cek) {
    if (!cek.janji.length) {
      return '<div class="kt-janji"><div class="tbl-sub">' +
        T('Belum ada janji terukur pada kontrak ini. Tambahkan lewat Ubah supaya ' +
          'MCS bisa memeriksanya sendiri tiap bulan.') + '</div></div>';
    }
    return '<div class="kt-janji">' +
      '<div class="kt-janji__h"><b>' + T('Janji bulan ini') + '</b>' +
        '<span class="tbl-sub">' + U.esc(cek.periode.dari) + ' — ' +
          U.esc(cek.periode.sampai) + '</span></div>' +
      cek.janji.map(function (h) {
        var lambang = { penuhi: '✅', gagal: '❌', nihil: '○' }[h.hasil];
        var arah = h.janji.arah === 'maks' ? '≤' : '≥';
        return '<div class="kt-j kt-j--' + h.hasil + '">' +
          '<span class="kt-j__i">' + lambang + '</span>' +
          '<span class="kt-j__t"><b>' + h.janji.ikon + ' ' + U.esc(T(h.janji.nama)) + '</b>' +
            '<span>' + U.esc(T(h.janji.ket)) + '</span></span>' +
          '<span class="kt-j__a">' +
            '<i>' + T('janji') + '</i>' + arah + ' ' + h.target + U.esc(h.janji.satuan) +
          '</span>' +
          '<span class="kt-j__n">' +
            '<i>' + T('nyata') + '</i>' +
            (h.nyata === null || h.nyata === undefined
              ? '<b class="kt-j__kosong">—</b>'
              : '<b>' + h.nyata + U.esc(h.janji.satuan) + '</b>') +
          '</span>' +
        '</div>';
      }).join('') +
      (cek.janji.some(function (h) { return h.hasil === 'nihil'; })
        /* Disebut apa adanya: janji tanpa data BUKAN janji yang gagal, dan
           bukan pula janji yang tercapai. */
        ? '<div class="tbl-sub mt-2">○ ' +
          T('Belum ada datanya bulan ini — tidak dihitung gagal, dan tidak ' +
            'dihitung tercapai.') + '</div>'
        : '') +
    '</div>';
  }

  function dialogKontrak(id) {
    var k = korp();
    var x = id ? KONTRAK.satu(id) : null;
    var a = MCS.area(k.id);
    var petaJanji = {};
    ((x && x.janji) || []).forEach(function (j) { petaJanji[j.kode] = j.target; });

    UI.formModal({
      title: x ? T('Ubah kontrak') : T('Kontrak baru'),
      sub: x ? x.no : U.esc(k.nama), size: 'wide',
      okText: x ? T('Simpan') : T('Catat'),
      fields: [
        { name: 'nama', label: T('Nama kontrak'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Jasa kebersihan Menara A 2026') },
        { name: 'no', label: T('Nomor kontrak'), value: x ? x.no : '',
          hint: T('Kosongkan untuk dinomori otomatis.') },
        { name: 'pihak', label: T('Pihak dalam kontrak'), value: x ? x.pihak : '',
          placeholder: T('mis. PT Menara Cakrawala — PT Bersih Sentosa') },
        { name: 'mulai', label: T('Mulai berlaku'), type: 'date',
          value: x ? x.mulai : U.today(), required: true },
        { name: 'sampai', label: T('Berakhir'), type: 'date', value: x ? (x.sampai || '') : '',
          hint: T('Kosongkan bila tanpa batas waktu.') },
        { name: 'nilaiBulanan', label: T('Nilai per bulan'), type: 'number', min: 0,
          value: x ? x.nilaiBulanan : '' },
        { name: 'status', label: T('Status'), type: 'select', value: x ? x.status : 'draf',
          options: KONTRAK.STATUS.map(function (s) {
            return { value: s.kode, label: s.ikon + '  ' + T(s.nama) }; }),
          hint: T('Hanya yang berjalan yang diperiksa tiap bulan.') },

        { type: 'html', html: '<div class="mcs-fs">' + T('Lingkup') +
          '<span>' + T('Kosongkan seluruhnya berarti seluruh gedung') + '</span></div>' },
        { type: 'html', html: '<div class="field"><div class="kh-alg">' +
          a.map(function (y) {
            var on = x && (x.areaIds || []).indexOf(y.id) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="areaIds" data-multi="1" value="' + y.id + '"' +
              (on ? ' checked' : '') + '><span>' + MCS.jenisArea(y.jenis).ikon + ' ' +
              U.esc(y.nama) + '</span></label>';
          }).join('') + '</div></div>' },
        { name: 'lingkupTeks', label: T('Uraian lingkup pekerjaan'), type: 'textarea', rows: 3,
          value: x ? x.lingkupTeks : '',
          hint: T('Yang tidak bisa diukur angka ditulis di sini — bukan dijadikan ' +
            'janji terukur. Satu centang hijau tanpa dasar membuat seluruh daftar ' +
            'tidak bisa dipercaya.') },

        { type: 'html', html: '<div class="mcs-fs">' + T('Janji yang bisa diukur') +
          '<span>' + T('Kosongkan targetnya bila janji itu tidak ada di kontrak') +
          '</span></div>' },
        { type: 'html', html: KONTRAK.JANJI.map(function (j) {
          var v = petaJanji[j.kode];
          return '<label class="kp-b">' +
            '<span class="kp-b__t"><b>' + j.ikon + ' ' + U.esc(T(j.nama)) + '</b>' +
              '<span>' + U.esc(T(j.ket)) + ' · ' +
              (j.arah === 'maks' ? T('target maksimum') : T('target minimum')) + '</span></span>' +
            '<input class="input kp-b__i" type="number" step="0.1" min="0" ' +
              'name="janji_' + j.kode + '" value="' + (v === undefined ? '' : v) + '" ' +
              'placeholder="' + j.bawaan + '">' +
          '</label>';
        }).join('') },

        { name: 'penalti', label: T('Sanksi bila tidak tercapai'), type: 'textarea', rows: 2,
          value: x ? x.penalti : '',
          placeholder: T('mis. potongan 5% dari nilai bulan berjalan') },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2,
          value: x ? x.catatan : '' }
      ]
    }).then(function (d) {
      if (!d) return;
      d.areaIds = [].concat(d.areaIds || []);
      /* Target dikumpulkan dari field bernama janji_<kode>; yang kosong
         dibuang, bukan disimpan sebagai nol — nol adalah target yang sah dan
         artinya jauh berbeda dari 'tidak dijanjikan'. */
      d.janji = KONTRAK.JANJI.map(function (j) {
        var v = d['janji_' + j.kode];
        return (v === '' || v === undefined || v === null)
          ? null : { kode: j.kode, target: Number(v) };
      }).filter(Boolean);
      var r = x ? KONTRAK.ubah(id, d) : KONTRAK.buat(k.id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Kontrak diperbarui') : T('Kontrak dicatat'), 'ok');
      APP.refresh();
    });
  }

  function cetakKepatuhan(id) {
    var x = KONTRAK.satu(id);
    var k = korp();
    if (!x) return;
    var d = new Date();
    var cek = KONTRAK.periksa(x, d.getFullYear(), d.getMonth() + 1);
    var namaBulan = U.tglPanjang(cek.periode.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');

    UI.modal({
      title: T('Laporan kepatuhan kontrak'), sub: x.nama, size: 'wide',
      body: '<div class="kp-lembar" id="kt-lembar">' +
          '<div class="kp-lembar__kop">' +
            '<div class="kp-lembar__pt">' + U.esc(k.nama) + '</div>' +
            '<div class="kp-lembar__jd">' + T('Laporan Kepatuhan Kontrak') + '</div>' +
            '<div class="kp-lembar__sub">' + U.esc(namaBulan) + '</div>' +
          '</div>' +
          '<table class="kp-lembar__id"><tbody>' +
            barisId(T('Kontrak'), x.nama) +
            barisId(T('Nomor'), x.no) +
            barisId(T('Pihak'), x.pihak || '—') +
            barisId(T('Masa berlaku'), U.tglPanjang(x.mulai) + ' — ' +
              (x.sampai ? U.tglPanjang(x.sampai) : T('tanpa batas'))) +
            barisId(T('Nilai per bulan'), x.nilaiBulanan ? U.rp(x.nilaiBulanan) : '—') +
          '</tbody></table>' +
          '<table class="kp-lembar__t"><thead><tr>' +
            '<th>' + T('Janji') + '</th>' +
            '<th class="num">' + T('Target') + '</th>' +
            '<th class="num">' + T('Kenyataan') + '</th>' +
            '<th class="num">' + T('Hasil') + '</th>' +
          '</tr></thead><tbody>' +
            cek.janji.map(function (h) {
              return '<tr><td><b>' + U.esc(T(h.janji.nama)) + '</b><br><small>' +
                  U.esc(T(h.janji.ket)) + '</small></td>' +
                '<td class="num">' + (h.janji.arah === 'maks' ? '≤' : '≥') + ' ' +
                  h.target + U.esc(h.janji.satuan) + '</td>' +
                '<td class="num">' + (h.nyata === null || h.nyata === undefined
                  ? '—' : h.nyata + U.esc(h.janji.satuan)) + '</td>' +
                '<td class="num">' + { penuhi: T('Terpenuhi'), gagal: T('Tidak tercapai'),
                  nihil: T('Belum ada data') }[h.hasil] + '</td></tr>';
            }).join('') +
          '</tbody><tfoot><tr>' +
            '<td colspan="3"><b>' + T('Janji terpenuhi') + '</b></td>' +
            '<td class="num"><b>' + (cek.persen === null ? '—'
              : cek.penuhi + ' / ' + cek.dinilai + ' · ' + cek.persen + '%') + '</b></td>' +
          '</tr></tfoot></table>' +
          (x.penalti
            ? '<div class="kp-lembar__ket"><b>' + T('Sanksi bila tidak tercapai') + ':</b> ' +
              U.esc(x.penalti) + '</div>' : '') +
          '<div class="kp-lembar__jujur">' +
            T('Angka kenyataan diambil dari data yang sama dengan yang dilihat ' +
              'pemilik gedung di portalnya — bukan dihitung ulang di sini. Janji ' +
              'yang belum ada datanya tidak dihitung gagal maupun tercapai.') +
          '</div>' +
          '<div class="kp-lembar__ttd">' +
            '<div><span>' + T('Pengelola gedung') + '</span><i></i><b></b></div>' +
            '<div><span>' + T('Penyedia jasa') + '</span><i></i><b></b></div>' +
          '</div>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="kt-lembar-cetak">🖨️ ' + T('Cetak') + '</button>',
      actions: { 'kt-lembar-cetak': function () { cetak('cetak-kp'); } }
    });
  }

  function mountKontrak(root) {
    delegasi(root, {
      'kt-buka': function (el) {
        var id = el.getAttribute('data-id');
        ktBuka = ktBuka === id ? null : id;
        APP.refresh();
      },
      'kt-baru': function () { dialogKontrak(null); },
      'kt-ubah': function (el) { dialogKontrak(el.getAttribute('data-id')); },
      'kt-cetak': function (el) { cetakKepatuhan(el.getAttribute('data-id')); },
      'kt-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = KONTRAK.satu(id);
        UI.konfirm({ title: T('Hapus kontrak') + '?', danger: true,
          text: (x ? x.nama + '. ' : '') +
            T('Bila kontraknya memang sudah selesai, ubah statusnya menjadi ' +
              'berakhir — catatannya tetap tersimpan dan bisa dirujuk kembali.')
        }).then(function (ya) {
          if (!ya) return;
          KONTRAK.hapus(id);
          UI.toast(T('Kontrak dihapus.'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ================================================ PELATIHAN & KOMPETENSI

     Saat ada kecelakaan, pertanyaan pertama yang diajukan adalah 'apakah
     orangnya sudah dilatih'. Gedung yang tidak bisa menjawabnya kalah sebelum
     diperiksa.
   */

  var gjTahun = null, gjBulan = null;

  function gjPeriode() {
    var d = new Date();
    return { tahun: gjTahun || d.getFullYear(), bulan: gjBulan || (d.getMonth() + 1) };
  }

  function renderGaji() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var p = gjPeriode();
    var baris = GAJI.hitungSemua(k.id, p.tahun, p.bulan);
    var st = GAJI.statistik(k.id, p.tahun, p.bulan);
    var c = GAJI.config(k.id);

    return kepalaBulan('gj', p, st.petugas ? jml(st.petugas, T('1 petugas'), T('{n} petugas')) : '') +
      catatanGaji() +
      (st.tanpaUpah ? peringatanUpahKosong(st.tanpaUpah) : '') +
      (st.adaAbsenKosong ? peringatanAbsenKosong(st.adaAbsenKosong, c) : '') +
      /* Daftar gaji dua ratus lima puluh delapan orang dibuka oleh orang
         yang mengurus SATU cabang. Penyaringnya sama dengan halaman lain
         supaya tidak ada yang perlu dipelajari dua kali. */
      (function () {
        if (!baris.length) return UI.empty('🧹', T('Belum ada petugas'), '');
        /* Baris gaji menyimpan pekerjaId, BUKAN objek petugasnya — lokasinya
           harus diambil ulang. Memakai b.pekerja.lokasiIds di sini tidak
           menimbulkan galat apa pun; penyaringnya hanya akan selalu kosong,
           dan itu jenis kesalahan yang paling lama bertahan. */
        function lokGaji(b) {
          var pk = MCS.pekerjaSatu(b.pekerjaId);
          return pk ? (pk.lokasiIds || []) : [];
        }
        var bs = dpSaring('gaji', baris, lokGaji);
        return dpBilah('gaji', baris, bs, lokGaji) +
          dpPotong('gaji', bs, null, function (tampil) {
            return tabelGaji(tampil, k, p);
          });
      })();
  }

  function catatanGaji() {
    return UI.alert('info',
      '<b>' + T('Ini dasar penggajian, bukan penggajian yang sah secara hukum.') + '</b> ' +
      T('Tidak ada PPh 21, BPJS, THR, maupun perhitungan lembur menurut aturan ' +
        'ketenagakerjaan. Yang dihitung di sini adalah berapa hari orang bekerja ' +
        'dan berapa yang harus dibayarkan atas dasar itu — angkanya tetap harus ' +
        'diperiksa orang yang mengurus penggajian.'), 'ℹ️');
  }

  function peringatanUpahKosong(n) {
    return UI.alert('warn',
      '<b>' + jml(n, T('1 petugas belum diisi gaji pokoknya'),
        T('{n} petugas belum diisi gaji pokoknya')) + '</b> ' +
      T('Slipnya tidak bisa diterbitkan sebelum diisi — slip bernilai nol lebih ' +
        'buruk daripada tidak ada slip.'), '⚠️');
  }

  function peringatanAbsenKosong(n, c) {
    return UI.alert('warn',
      '<b>' + jml(n, T('1 petugas absensinya belum lengkap'),
        T('{n} petugas absensinya belum lengkap')) + '</b> ' +
      T('Hari yang tidak pernah dicatat TIDAK dianggap hadir maupun alfa. ' +
        'Menganggapnya hadir membayar hari yang tak ada buktinya; menganggapnya ' +
        'alfa memotong orang karena penyelianya lupa mengisi. Periksa dulu di ' +
        'halaman Kehadiran.') +
      ' <span class="tbl-sub">' + T('Hari kerja sebulan menurut pengaturan') +
      ': ' + c.hariPerBulan + '</span>', '📋');
  }

  function tabelGaji(baris, k, p) {
    /* Ditulis tangan, jadi bilah sumbernya dipasang sendiri. Angka gaji
       adalah angka yang paling sering ditanyakan asalnya — dan yang paling
       merugikan bila orang tidak bisa menelusurinya sampai ke hari-harinya. */
    return UI.bilahSumber({
      teks: T('Dihitung dari kehadiran harian bulan ini dikali dasar upah tiap ' +
        'petugas. Hari yang penyelianya belum mengisi terhitung sebagai tidak ' +
        'hadir — periksa dulu di halaman Kehadiran sebelum membayar.'),
      hal: 'mcsAbsensi', label: T('Buka kehadiran') }) +
      '<div class="tbl-wrap"><table class="tbl gj-t"><thead><tr>' +
      '<th>' + T('Petugas') + '</th>' +
      '<th class="ta-r">' + T('Hari') + '</th>' +
      '<th class="ta-r">' + T('Kotor') + '</th>' +
      '<th class="ta-r">' + T('Potongan') + '</th>' +
      '<th class="ta-r">' + T('Diterima') + '</th>' +
      '<th></th></tr></thead><tbody>' +
      baris.map(function (b) {
        var sl = GAJI.slipSatu(b.pekerjaId, p.tahun, p.bulan);
        return '<tr>' +
          '<td><b>' + U.esc(b.nama) + '</b>' +
            (b.nip ? '<div class="tbl-sub">' + U.esc(b.nip) + '</div>' : '') + '</td>' +
          '<td class="ta-r">' + b.hariDibayar +
            (b.hariTidakDibayar
              ? ' <span class="mcs-warn">−' + b.hariTidakDibayar + '</span>' : '') +
            '<div class="tbl-sub">' + T('tercatat') + ' ' + b.tercatat + '</div></td>' +
          '<td class="ta-r">' + (b.pokok ? U.rp(b.kotor) :
            '<span class="tbl-sub">' + T('gaji belum diisi') + '</span>') + '</td>' +
          '<td class="ta-r">' + (b.potongan ? U.rp(b.potongan) : '—') + '</td>' +
          '<td class="ta-r"><b>' + (b.pokok ? U.rp(b.bersih) : '—') + '</b></td>' +
          '<td class="ta-r"><div class="row" style="gap:6px;justify-content:flex-end">' +
            '<button class="btn btn--ghost btn--sm" data-act="gj-upah" data-id="' +
              b.pekerjaId + '">' + T('Upah') + '</button>' +
            (sl
              ? '<button class="btn btn--ghost btn--sm" data-act="gj-slip" data-id="' +
                sl.id + '">' + T('Slip') + ' ' + U.esc(sl.no) + '</button>'
              : '<button class="btn btn--sm" data-act="gj-terbit" data-id="' +
                b.pekerjaId + '">' + T('Terbitkan') + '</button>') +
          '</div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* Kepala periode yang dipakai halaman Gaji dan Tagihan. Dua halaman yang
     memilih bulan dengan cara berbeda memaksa orang belajar dua kali. */

  function kepalaBulan(pfx, p, kanan) {
    var d = new Date(p.tahun, p.bulan - 1, 1);
    var nama = U.tglPanjang(U.iso(d)).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');
    return '<div class="row row--sb mb-3">' +
      '<div class="row" style="gap:8px;align-items:center">' +
        '<button class="btn btn--ghost btn--sm" data-act="' + pfx + '-bulan" data-d="-1">‹</button>' +
        '<b>' + U.esc(nama) + '</b>' +
        '<button class="btn btn--ghost btn--sm" data-act="' + pfx + '-bulan" data-d="1">›</button>' +
        (kanan ? '<span class="tbl-sub">' + kanan + '</span>' : '') +
      '</div>' +
      '<div class="row" style="gap:6px">' +
        '<button class="btn btn--ghost btn--sm" data-act="' + pfx + '-atur">⚙ ' + T('Pengaturan') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="' + pfx + '-cetak">🖨 ' + T('Cetak') + '</button>' +
      '</div></div>';
  }

  function geserBulan(p, arah) {
    var m = p.bulan + arah, y = p.tahun;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    var d = new Date();
    if (y > d.getFullYear() || (y === d.getFullYear() && m > d.getMonth() + 1)) return null;
    return { tahun: y, bulan: m };
  }

  function dialogUpah(pekerjaId) {
    var pk = MCS.pekerjaSatu(pekerjaId);
    if (!pk) return;
    var u = GAJI.upah(pekerjaId);
    UI.formModal({
      title: T('Upah') + ' — ' + pk.nama,
      okText: T('Simpan'),
      fields: [
        { name: 'pokok', label: T('Gaji pokok sebulan'), type: 'number', value: u.pokok || '',
          hint: T('Dibagi jumlah hari kerja sebulan untuk mendapat nilai satu hari.') },
        { name: 'tunjangan', label: T('Tunjangan sebulan'), type: 'number',
          value: u.tunjangan || '', hint: T('Transport, makan, jabatan — digabung jadi satu angka.') },
        { name: 'potongan', label: T('Potongan tetap sebulan'), type: 'number',
          value: u.potongan || '', hint: T('Koperasi, cicilan seragam, kasbon berjalan.') },
        { name: 'catatan', label: T('Catatan'), value: u.catatan }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = GAJI.simpanUpah(pekerjaId, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Upah disimpan'), 'ok');
      APP.refresh();
    });
  }

  function dialogAturGaji() {
    var k = korp();
    if (!k) return;
    var c = GAJI.config(k.id);
    UI.formModal({
      title: T('Pengaturan penggajian'),
      intro: '<div class="hint mb-2">' +
        T('Bawaannya mengikuti praktik gaji bulanan: hanya tanpa kabar yang dipotong. ' +
          'Yang berlaku adalah perjanjian kerja Anda, bukan bawaan kami.') + '</div>',
      okText: T('Simpan'),
      fields: [
        { name: 'hariPerBulan', label: T('Hari kerja sebulan'), type: 'number',
          value: c.hariPerBulan,
          hint: T('Pembagi untuk menghitung nilai satu hari. Diisi, bukan diambil ' +
            'dari kalender — gaji bulanan tidak berubah karena Februari lebih pendek.') },
        { name: 'upahLembur', label: T('Upah per pekerjaan tambahan'), type: 'number',
          value: c.upahLembur || '',
          hint: T('Dibayarkan untuk tiap pekerjaan tambahan yang selesai dan melibatkan ' +
            'petugas itu. Kosongkan bila tidak dipakai.') },
        { name: 'bayarSakit', label: T('Sakit tetap dibayar'), type: 'checkbox', value: c.dibayar.sakit },
        { name: 'bayarIzin', label: T('Izin tetap dibayar'), type: 'checkbox', value: c.dibayar.izin },
        { name: 'bayarLibur', label: T('Libur tetap dibayar'), type: 'checkbox', value: c.dibayar.libur },
        { name: 'bayarAlfa', label: T('Tanpa kabar tetap dibayar'), type: 'checkbox',
          value: c.dibayar.alfa,
          hint: T('Hampir selalu tidak. Ada di sini karena sebagian perjanjian ' +
            'memakai sistem lain.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = GAJI.simpanConfig(k.id, {
        hariPerBulan: d.hariPerBulan, upahLembur: d.upahLembur,
        dibayar: { sakit: !!d.bayarSakit, izin: !!d.bayarIzin,
                   libur: !!d.bayarLibur, alfa: !!d.bayarAlfa }
      });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Pengaturan disimpan'), 'ok');
      APP.refresh();
    });
  }

  function dialogSlip(id) {
    var sl = DB.find('mcsSlip', id);
    if (!sl) return;
    UI.modal({
      title: T('Slip gaji') + ' ' + sl.no,
      sub: sl.nama,
      size: 'narrow',
      body: isiSlip(sl),
      foot: '<button class="btn btn--ghost" data-act="sl-batal" data-id="' + sl.id + '">' +
              T('Batalkan slip') + '</button>' +
            '<button class="btn" data-act="sl-cetak" data-id="' + sl.id + '">🖨 ' +
              T('Cetak') + '</button>',
      actions: {
        'sl-batal': function (el) {
          UI.konfirm({
            title: T('Batalkan slip ini?'),
            htmlText: T('Slipnya dihapus dan bulan itu bisa dihitung ulang dengan angka ' +
              'yang berlaku sekarang. Bila slipnya sudah diserahkan kepada petugas, ' +
              'yang ia pegang tidak akan sama lagi dengan yang ada di sini.'),
            okText: T('Batalkan'), danger: true
          }).then(function (ya) {
            if (!ya) return;
            GAJI.batalkan(el.getAttribute('data-id'));
            UI.toast(T('Slip dibatalkan.'), 'ok');
            APP.refresh();
          });
        },
        'sl-cetak': function (el) { cetakSlip(el.getAttribute('data-id')); }
      }
    });
  }

  function isiSlip(sl) {
    function br(label, nilai, tebal) {
      return '<div class="row row--sb sl-b"><span>' + label + '</span><span' +
        (tebal ? ' class="sl-b__t"' : '') + '>' + nilai + '</span></div>';
    }
    var d = new Date(sl.tahun, sl.bulan - 1, 1);
    var nama = U.tglPanjang(U.iso(d)).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');
    return '<div class="kv mb-3">' +
        '<dt>' + T('Periode') + '</dt><dd>' + U.esc(nama) + '</dd>' +
        '<dt>' + T('Diterbitkan') + '</dt><dd>' + U.esc(U.tglJam(sl.diterbitkan)) +
          (sl.olehNama ? ' · ' + U.esc(sl.olehNama) : '') + '</dd>' +
      '</div>' +
      '<div class="sl">' +
        br(T('Gaji pokok'), U.rp(sl.pokok)) +
        (sl.tunjangan ? br(T('Tunjangan'), U.rp(sl.tunjangan)) : '') +
        (sl.upahTambahan ? br(T('Pekerjaan tambahan') + ' (' + sl.kerjaTambahan + ')',
          U.rp(sl.upahTambahan)) : '') +
        br(T('Penerimaan kotor'), U.rp(sl.kotor), true) +
        (sl.potonganAbsen
          ? br(T('Potongan') + ' ' + jml(sl.hariTidakDibayar, T('1 hari tidak dibayar'),
              T('{n} hari tidak dibayar')), '− ' + U.rp(sl.potonganAbsen))
          : '') +
        (sl.potonganTetap ? br(T('Potongan tetap'), '− ' + U.rp(sl.potonganTetap)) : '') +
        br(T('Diterima'), U.rp(sl.bersih), true) +
      '</div>' +
      '<div class="tbl-sub mt-3">' +
        T('Kehadiran') + ': ' +
        Object.keys(sl.hitungan).filter(function (kk) { return sl.hitungan[kk]; })
          .map(function (kk) {
            return T(MCS.statusHadir(kk).nama) + ' ' + sl.hitungan[kk];
          }).join(' · ') +
      '</div>';
  }

  function cetakSlip(id) {
    var sl = DB.find('mcsSlip', id);
    if (!sl) return;
    var d = new Date(sl.tahun, sl.bulan - 1, 1);
    var nama = U.tglPanjang(U.iso(d)).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');
    var baris = [
      { a: T('Gaji pokok'), b: sl.pokok },
      { a: T('Tunjangan'), b: sl.tunjangan },
      { a: T('Pekerjaan tambahan'), b: sl.upahTambahan },
      { a: T('Potongan hari tidak dibayar'), b: -sl.potonganAbsen },
      { a: T('Potongan tetap'), b: -sl.potonganTetap },
      { a: T('DITERIMA'), b: sl.bersih }
    ].filter(function (x) { return x.b !== 0 || x.a === T('DITERIMA'); });
    cetakDaftar({
      judul: T('Slip Gaji') + ' ' + sl.no,
      sub: sl.nama + (sl.nip ? ' · ' + sl.nip : '') + ' · ' + nama +
        ' · ' + T('hari dibayar') + ' ' + sl.hariDibayar + '/' + sl.tercatat,
      kolom: [
        { h: T('Uraian'), r: function (x) { return x.a; } },
        /* Minus ditaruh DI DEPAN 'Rp', bukan di antara 'Rp' dan angkanya.
           'Rp-600.000' di atas kertas terbaca seperti salah cetak, dan slip
           gaji adalah dokumen yang dibaca orang yang berhak curiga. */
        { h: T('Jumlah'), num: true, r: function (x) {
            return (x.b < 0 ? '− ' : '') + U.rp(Math.abs(x.b)); } }
      ],
      baris: baris,
      kaki: T('Slip ini dihitung dari kehadiran harian. Ia bukan bukti potong pajak ' +
        'dan tidak memuat PPh 21, BPJS, maupun THR.')
    });
  }

  function cetakGaji() {
    var k = korp();
    if (!k) return;
    var p = gjPeriode();
    var baris = GAJI.hitungSemua(k.id, p.tahun, p.bulan).filter(function (b) { return b.pokok; });
    if (!baris.length) { UI.toast(T('Belum ada petugas yang gajinya terisi.'), 'err'); return; }
    var d = new Date(p.tahun, p.bulan - 1, 1);
    var nama = U.tglPanjang(U.iso(d)).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');
    cetakDaftar({
      judul: T('Daftar Gaji'),
      sub: nama,
      kolom: [
        { h: T('NIP'), r: function (b) { return b.nip; } },
        { h: T('Nama'), r: function (b) { return b.nama; } },
        { h: T('Hari dibayar'), num: true, r: function (b) { return b.hariDibayar; } },
        { h: T('Tidak dibayar'), num: true, r: function (b) { return b.hariTidakDibayar || ''; } },
        { h: T('Kotor'), num: true, r: function (b) { return U.rp(b.kotor); } },
        { h: T('Potongan'), num: true, r: function (b) { return b.potongan ? U.rp(b.potongan) : ''; } },
        { h: T('Diterima'), num: true, r: function (b) { return U.rp(b.bersih); } },
        { h: T('Tanda tangan'), r: function () { return ''; } }
      ],
      baris: baris,
      kaki: T('Kolom tanda tangan disediakan untuk penerimaan tunai. Angka di daftar ' +
        'ini dihitung dari kehadiran harian dan bukan bukti potong pajak.')
    });
  }

  function mountGaji(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'gj-bulan': function (el) {
        var b = geserBulan(gjPeriode(), Number(el.getAttribute('data-d')));
        if (!b) return;
        gjTahun = b.tahun; gjBulan = b.bulan; APP.refresh();
      },
      'gj-atur': dialogAturGaji,
      'gj-cetak': cetakGaji,
      'gj-upah': function (el) { dialogUpah(el.getAttribute('data-id')); },
      'gj-slip': function (el) { dialogSlip(el.getAttribute('data-id')); },
      'gj-terbit': function (el) {
        var k = korp();
        var p = gjPeriode();
        var r = GAJI.terbitkan(k.id, el.getAttribute('data-id'), p.tahun, p.bulan, APP.user);
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(T('Slip diterbitkan') + ' ' + r.slip.no, 'ok');
        APP.refresh();
      }
    }));
  }


  /* ============================================================== TAGIHAN
     Kontrak bulanan + pekerjaan tambahan yang sudah selesai. Yang paling
     sering hilang bukan hitungannya, melainkan pekerjaan tambahan yang sudah
     dikerjakan lalu tidak pernah ditagihkan kepada siapa pun. */

  var tgTahun = null, tgBulan = null;

  function tgPeriode() {
    var d = new Date();
    return { tahun: tgTahun || d.getFullYear(), bulan: tgBulan || (d.getMonth() + 1) };
  }

  function renderTagihan() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var p = tgPeriode();
    var pr = TAGIHAN.pratinjau(k.id, p.tahun, p.bulan);
    var sudah = TAGIHAN.bulanTerbit(k.id, p.tahun, p.bulan);
    var st = TAGIHAN.statistik(k.id);

    return kepalaBulan('tg', p, '') +
      (st.lewatTempo ? peringatanTempo(st) : '') +
      (pr.perluDiperiksa.length ? peringatanBiayaKosong(pr.perluDiperiksa) : '') +
      (sudah ? kartuSudahTerbit(sudah) : pratinjauTagihan(pr)) +
      daftarTagihan(TAGIHAN.daftar(k.id));
  }

  function peringatanTempo(st) {
    return UI.alert('danger',
      '<b>' + jml(st.lewatTempo, T('1 tagihan lewat jatuh tempo'),
        T('{n} tagihan lewat jatuh tempo')) + '</b> ' +
      T('Nilainya') + ' ' + U.rp(st.nilaiBelumLunas) + ' ' +
      T('dari seluruh tagihan yang belum lunas.'), '⏰');
  }

  function peringatanBiayaKosong(l) {
    return UI.alert('warn',
      '<b>' + jml(l.length, T('1 pekerjaan tambahan belum diisi biayanya'),
        T('{n} pekerjaan tambahan belum diisi biayanya')) + '</b> ' +
      T('Ia TIDAK ikut ditagihkan. Ini bukan pekerjaan gratis — ia pekerjaan yang ' +
        'biayanya belum diisi, dan menagihkannya nol berarti kehilangan uang tanpa ' +
        'ada yang menyadarinya.') +
      '<br><span class="tbl-sub">' +
        U.esc(l.slice(0, 5).map(function (x) { return x.judul; }).join(' · ')) +
      '</span>', '💸');
  }

  function pratinjauTagihan(pr) {
    if (!pr.baris.length) {
      return UI.empty('🧾', T('Tidak ada yang bisa ditagihkan bulan ini'),
        T('Tagihan disusun dari kontrak yang berjalan dan pekerjaan tambahan yang ' +
          'sudah selesai. Bila keduanya kosong, tidak ada yang bisa ditagihkan.'));
    }
    return '<div class="card p-3 mb-3">' +
      '<div class="row row--sb mb-2">' +
        '<b>' + T('Pratinjau tagihan') + '</b>' +
        '<button class="btn btn--sm" data-act="tg-terbit">' + T('Terbitkan') + '</button>' +
      '</div>' +
      barisTagihan(pr.baris) +
      totalTagihan(pr) +
    '</div>';
  }

  function barisTagihan(baris) {
    return '<div class="tbl-wrap"><table class="tbl tg-t"><tbody>' +
      baris.map(function (b) {
        return '<tr>' +
          '<td>' + U.esc(b.uraian) +
            '<div class="tbl-sub">' +
              (b.jenis === 'kontrak' ? T('Kontrak bulanan') : T('Pekerjaan tambahan')) +
            '</div></td>' +
          '<td class="ta-r">' + U.rp(b.jumlah) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function totalTagihan(x) {
    return '<div class="tg-jml mt-2">' +
      '<div class="row row--sb"><span>' + T('Dasar') + '</span><span>' + U.rp(x.dasar) + '</span></div>' +
      (x.ppn
        ? '<div class="row row--sb"><span>' + T('Ppn') + ' ' + x.ppnPersen + '%</span>' +
          '<span>' + U.rp(x.ppn) + '</span></div>'
        : '') +
      '<div class="row row--sb tg-jml__t"><span>' + T('Total') + '</span><b>' +
        U.rp(x.total) + '</b></div>' +
    '</div>';
  }

  function kartuSudahTerbit(t) {
    return UI.alert('ok',
      '<b>' + T('Tagihan bulan ini sudah diterbitkan') + ' — ' + U.esc(t.no) + '.</b> ' +
      T('Isinya dibekukan pada saat terbit, jadi ia tidak ikut berubah bila nilai ' +
        'kontrak atau biaya pekerjaan diubah sesudahnya.'), '🧾');
  }

  function daftarTagihan(l) {
    if (!l.length) return '';
    return '<h3 class="h3 mt-4 mb-2">' + T('Tagihan terbit') + '</h3>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>' + T('Nomor') + '</th>' +
        '<th>' + T('Periode') + '</th>' +
        '<th class="ta-r">' + T('Total') + '</th>' +
        '<th>' + T('Status') + '</th>' +
        '<th></th></tr></thead><tbody>' +
      l.map(function (t) {
        var lewat = t.status !== 'lunas' && t.jatuhTempo && t.jatuhTempo < U.today();
        return '<tr>' +
          '<td><b>' + U.esc(t.no) + '</b>' +
            (t.nomorLokal
              /* Dikatakan di daftarnya, bukan hanya saat diterbitkan: yang
                 membuka tagihan ini enam bulan lagi juga perlu tahu nomornya
                 tidak dijamin unik antar perangkat. */
              ? '<div class="tbl-sub mcs-warn">' + T('nomor lokal') + '</div>' : '') +
          '</td>' +
          '<td>' + ('0' + t.bulan).slice(-2) + '/' + t.tahun +
            '<div class="tbl-sub">' + T('tempo') + ' ' + U.esc(t.jatuhTempo || '—') + '</div></td>' +
          '<td class="ta-r">' + U.rp(t.total) + '</td>' +
          '<td>' + (t.status === 'lunas'
            ? '<span class="chip chip--ok">' + T('Lunas') + '</span>'
            : '<span class="chip chip--' + (lewat ? 'danger' : 'warn') + '">' +
              (lewat ? T('Lewat tempo') : T('Belum lunas')) + '</span>') + '</td>' +
          '<td class="ta-r"><div class="row" style="gap:6px;justify-content:flex-end">' +
            (t.status === 'lunas'
              ? '<button class="btn btn--ghost btn--sm" data-act="tg-buka" data-id="' + t.id + '">' +
                T('Buka kembali') + '</button>'
              : '<button class="btn btn--ghost btn--sm" data-act="tg-lunas" data-id="' + t.id + '">' +
                T('Tandai lunas') + '</button>') +
            '<button class="btn btn--ghost btn--sm" data-act="tg-cetak-satu" data-id="' + t.id + '">🖨</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="tg-hapus" data-id="' + t.id + '">✕</button>' +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function dialogAturTagihan() {
    var k = korp();
    if (!k) return;
    var c = TAGIHAN.config(k.id);
    UI.formModal({
      title: T('Pengaturan tagihan'),
      okText: T('Simpan'),
      fields: [
        { name: 'ppnPersen', label: T('Ppn (%)'), type: 'number', value: c.ppnPersen || '',
          hint: T('Kosong berarti tidak ada Ppn. Sengaja tidak diisi 11% secara bawaan — ' +
            'menagihkan pajak atas nama orang yang belum tentu memungutnya adalah ' +
            'kesalahan yang mahal.') },
        { name: 'tempoHari', label: T('Jatuh tempo (hari)'), type: 'number', value: c.tempoHari },
        { name: 'catatanKaki', label: T('Catatan kaki tagihan'), type: 'textarea', rows: 3,
          value: c.catatanKaki,
          hint: T('Misalnya nomor rekening tujuan pembayaran.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = TAGIHAN.simpanConfig(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Pengaturan disimpan'), 'ok');
      APP.refresh();
    });
  }

  function cetakTagihanSatu(id) {
    var t = TAGIHAN.satu(id);
    if (!t) return;
    var k = korp();
    cetakDaftar({
      judul: T('Tagihan') + ' ' + t.no,
      sub: (k ? k.nama + ' · ' : '') + ('0' + t.bulan).slice(-2) + '/' + t.tahun +
        ' · ' + T('jatuh tempo') + ' ' + (t.jatuhTempo || '—') +
        (t.nomorLokal ? ' · ' + T('nomor lokal, belum tentu unik antar perangkat') : ''),
      kolom: [
        { h: T('Uraian'), r: function (b) { return b.uraian; } },
        { h: T('Jenis'), r: function (b) {
            return b.jenis === 'kontrak' ? T('Kontrak bulanan') : T('Pekerjaan tambahan'); } },
        { h: T('Jumlah'), num: true, r: function (b) { return U.rp(b.jumlah); } }
      ],
      baris: (t.baris || []).concat([
        { uraian: T('Dasar'), jenis: '', jumlah: t.dasar }
      ]).concat(t.ppn ? [{ uraian: T('Ppn') + ' ' + t.ppnPersen + '%', jenis: '', jumlah: t.ppn }] : [])
        .concat([{ uraian: T('TOTAL'), jenis: '', jumlah: t.total }]),
      kaki: (t.catatanKaki ? t.catatanKaki + ' — ' : '') +
        T('Tagihan ini bukan faktur pajak. Ia tidak memuat NPWP maupun nomor seri ' +
          'faktur, dan tidak menggantikan e-Faktur.')
    });
  }

  function mountTagihan(root) {
    delegasi(root, {
      'tg-bulan': function (el) {
        var b = geserBulan(tgPeriode(), Number(el.getAttribute('data-d')));
        if (!b) return;
        tgTahun = b.tahun; tgBulan = b.bulan; APP.refresh();
      },
      'tg-atur': dialogAturTagihan,
      'tg-cetak': function () {
        var k = korp();
        var p = tgPeriode();
        var t = TAGIHAN.bulanTerbit(k.id, p.tahun, p.bulan);
        if (!t) { UI.toast(T('Belum ada tagihan terbit untuk bulan ini.'), 'err'); return; }
        cetakTagihanSatu(t.id);
      },
      'tg-cetak-satu': function (el) { cetakTagihanSatu(el.getAttribute('data-id')); },
      'tg-terbit': function () {
        var k = korp();
        var p = tgPeriode();
        var pr = TAGIHAN.pratinjau(k.id, p.tahun, p.bulan);
        UI.konfirm({
          title: T('Terbitkan tagihan') + ' ' + U.rp(pr.total) + '?',
          htmlText: T('Isinya dibekukan sekarang: perubahan nilai kontrak atau biaya ' +
            'pekerjaan sesudah ini tidak akan mengubah tagihannya.') +
            (pr.perluDiperiksa.length
              ? '<br><br><b>' + jml(pr.perluDiperiksa.length,
                  T('1 pekerjaan tambahan tidak ikut karena biayanya kosong'),
                  T('{n} pekerjaan tambahan tidak ikut karena biayanya kosong')) + '</b>'
              : ''),
          okText: T('Terbitkan')
        }).then(function (ya) {
          if (!ya) return;
          var r = TAGIHAN.terbitkan(k.id, p.tahun, p.bulan, APP.user);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Tagihan diterbitkan') + ' ' + r.tagihan.no, 'ok');
          if (r.nomorLokal) {
            UI.toast(T('Nomornya dihitung lokal karena penyimpanan bersama mati — ' +
              'ia bisa bertabrakan dengan nomor dari perangkat lain.'), 'warn');
          }
          APP.refresh();
        });
      },
      'tg-lunas': function (el) {
        var id = el.getAttribute('data-id');
        UI.formModal({
          title: T('Tandai lunas'),
          okText: T('Tandai lunas'),
          fields: [{ name: 'catatan', label: T('Keterangan pembayaran'),
            placeholder: T('mis. Transfer BCA 12 Agu'),
            hint: T('Ini penandaan oleh manusia, bukan pencatatan pembayaran yang ' +
              'terhubung ke rekening.') }]
        }).then(function (d) {
          if (!d) return;
          var r = TAGIHAN.tandaiLunas(id, d.catatan, APP.user);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Ditandai lunas.'), 'ok');
          APP.refresh();
        });
      },
      'tg-buka': function (el) {
        TAGIHAN.bukaKembali(el.getAttribute('data-id'));
        APP.refresh();
      },
      'tg-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var t = TAGIHAN.satu(id);
        if (!t) return;
        var n = (t.baris || []).filter(function (b) { return b.kerjaId; }).length;
        UI.konfirm({
          title: T('Hapus tagihan') + ' ' + t.no + '?',
          htmlText: T('Bila tagihannya sudah dikirim, yang dipegang pelanggan tidak ' +
            'akan sama lagi dengan yang ada di sini.') +
            (n ? '<br><br>' + jml(n, T('1 pekerjaan tambahan kembali bisa ditagihkan'),
              T('{n} pekerjaan tambahan kembali bisa ditagihkan')) : ''),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          TAGIHAN.hapus(id);
          UI.toast(T('Tagihan dihapus.'), 'ok');
          APP.refresh();
        });
      }
    });
  }


  /* ------------------------------------------- pendaftaran lokasi ringkas
     Dulu ini halaman penuh dengan tujuh kolom identitas terbuka sekaligus.
     Dari tujuh itu, hanya tiga yang benar-benar dibutuhkan pada saat mendaftar;
     empat sisanya — alamat, kota, penanggung jawab, telepon — hampir selalu
     diisi belakangan, dan menampilkannya sejak awal membuat layar terlihat
     panjang untuk pekerjaan yang sebenarnya pendek.

     Sekarang ia satu dialog: tiga kolom terlihat, sisanya di balik satu
     ketukan, dan daftar areanya di bawahnya. */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsGaji", { label: 'Penggajian', icon: '💵', grup: 'Pengaturan',
      sub: 'Dari kehadiran harian menjadi slip gaji',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        var d = new Date();
        /* Yang dilaporkan HANYA yang menghalangi: petugas tanpa gaji pokok.
           Slip yang belum terbit bukan masalah — bulan berjalan memang
           belum waktunya diterbitkan, dan lencana yang menyala sepanjang
           bulan berhenti dibaca. */
        return GAJI.statistik(k.id, d.getFullYear(), d.getMonth() + 1).tanpaUpah || null;
      },
      render: renderGaji, mount: mountGaji });

  VMCS.daftar("korporat", "mcsTagihan", { label: 'Tagihan', icon: '🧾', grup: 'Pengaturan',
      sub: 'Kontrak bulanan dan pekerjaan tambahan menjadi satu tagihan',
      /* Korporat yang membersihkan gedungnya sendiri tidak punya siapa pun
         untuk ditagih. Getter, bukan nilai tetap: bentuk usahanya bisa
         dibetulkan di Profil Perusahaan tanpa memuat ulang halaman. */
      get tersembunyi() {
        var k = MCS.korporatUser(APP.user);
        return !!k && MCS.tanpaKlien(k.id);
      },
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        /* Hanya yang lewat tempo. Tagihan yang belum lunas tetapi belum
           jatuh tempo bukan masalah — menandainya membuat lencana menyala
           terus-menerus dan berhenti berarti apa-apa. */
        return TAGIHAN.statistik(k.id).lewatTempo || null;
      },
      render: renderTagihan, mount: mountTagihan });

  VMCS.daftar("korporat", "mcsBiaya", { label: 'Biaya', icon: '💰', grup: 'Pengaturan',
      sub: 'Berapa biaya kebersihan tiap area, per meter persegi',
      render: renderBiaya, mount: mountBiaya });

  VMCS.daftar("korporat", "mcsKontrak", { label: 'Kontrak', icon: '📄', grup: 'Pengaturan',
      sub: 'Janji layanan yang bisa diukur, diperiksa tiap bulan',
      /* Tidak ada klien, tidak ada kontrak layanan. Lihat mcsTagihan. */
      get tersembunyi() {
        var k = MCS.korporatUser(APP.user);
        return !!k && MCS.tanpaKlien(k.id);
      },
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        var s = KONTRAK.statistik(k.id);
        return (s.janjiGagal + s.sudahLewat.length) || null;
      },
      render: renderKontrak, mount: mountKontrak });
})();
