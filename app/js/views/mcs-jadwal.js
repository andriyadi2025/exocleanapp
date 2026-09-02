/* ==========================================================================
   views/mcs-jadwal.js — Jadwal pembersihan dan beban petugas
   --------------------------------------------------------------------------
   Penyusunan pekerjaan. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  var T = VMCS.T,
      angka = VMCS.angka,
      baris = VMCS.baris,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpSaring = VMCS.dpSaring,
      dpUlang = VMCS.dpUlang,
      jml = VMCS.jml,
      korp = VMCS.korp,
      namaArea = VMCS.namaArea,
      namaPekerja = VMCS.namaPekerja;

  function renderBeban() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var h = BEBAN.hitung(k.id);

    return catatanBeban() +
      (h.tanpaLuas.length ? peringatanLuas(h) : '') +
      ringkasBeban(h) +
      kartuOrangBeban(k, h) +
      kartuAreaBeban(h);
  }

  /* Tiga batas perhitungan ini disebut di layar, bukan di dokumentasi. Angka
     kebutuhan tenaga akan dipakai untuk memutus jumlah karyawan; yang
     memakainya berhak tahu apa yang TIDAK dijanjikannya. */

  function catatanBeban() {
    return UI.alert('info',
      '<b>' + T('Dihitung dari laju produksi baku ISSA.') + '</b> ' +
      T('Rumusnya luas dibagi laju: berapa meter persegi yang bisa dibersihkan ' +
        'satu orang dalam satu jam, menurut jenis ruangannya. Tiga hal yang ' +
        'perlu Anda tahu: angkanya patokan gedung Amerika dengan peralatan ' +
        'tertentu — sesuaikan dengan pengali; ia mengandaikan lingkup pekerjaan ' +
        'tertentu; dan ia menghitung TENAGA, bukan MUTU. Gedung yang orangnya ' +
        'cukup masih bisa kotor — tetapi gedung yang kekurangan orang hampir ' +
        'pasti kotor.'), '📐') + '<div class="mb-3"></div>';
  }

  function peringatanLuas(h) {
    return UI.alert('warn',
      '<b>' + jml(h.tanpaLuas.length, T('1 area belum diisi luasnya'),
        T('{n} area belum diisi luasnya')) + ':</b> ' +
      U.esc(h.tanpaLuas.slice(0, 6).map(function (x) { return x.area.nama; }).join(', ')) +
      (h.tanpaLuas.length > 6 ? '…' : '') + '. ' +
      /* Ini bukan basa-basi: angka kebutuhan yang lahir dari separuh area akan
         dikira mewakili seluruh gedung, dan gedungnya akan kekurangan orang. */
      T('Area tanpa luas TIDAK dihitung sebagai nol — ia dikeluarkan dari ' +
        'perhitungan. Selama luasnya belum lengkap, kebutuhan tenaga di bawah ' +
        'ini lebih kecil daripada yang sebenarnya.'), '📏') + '<div class="mb-3"></div>';
  }

  function ringkasBeban(h) {
    var kurang = h.selisih < -0.2, lebih = h.selisih > 0.8;
    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Luas dipantau'), value: U.num(h.luasTotal) + ' m²', icon: '📐',
          meta: T('cakupan data') + ' ' + h.cakupan + '%' }) +
        UI.stat({ label: T('Jam kerja per minggu'), value: U.num(h.jamPerMinggu), icon: '⏱️',
          meta: T('dari jadwal yang berjalan') }) +
        UI.stat({ label: T('Petugas dibutuhkan'), value: h.butuhOrang, icon: '🧮',
          meta: h.jamPerOrang + ' ' + T('jam/orang/minggu') }) +
        UI.stat({ label: T('Petugas pelaksana ada'), value: h.adaOrang, icon: '🧹',
          meta: kurang
            ? '⚠️ ' + T('kurang') + ' ' + Math.abs(h.selisih)
            : (lebih ? T('lebih') + ' ' + h.selisih : T('seimbang')) }) +
      '</div>' +

      (kurang
        ? UI.alert('danger', '<b>' + T('Tenaga tidak cukup untuk jadwal yang tersusun.') +
            '</b> ' + T('Jadwal yang tidak mungkin dikerjakan akan tetap tercatat ' +
              'sebagai kelalaian petugas, padahal yang salah adalah jadwalnya. ' +
              'Kurangi frekuensi, tambah orang, atau turunkan lingkup pekerjaan.'),
            '🧮') + '<div class="mb-3"></div>'
        : '') +

      (h.tanpaJadwal.length
        ? UI.alert('warn', '<b>' + jml(h.tanpaJadwal.length,
            T('1 area punya luas tetapi belum dijadwalkan'),
            T('{n} area punya luas tetapi belum dijadwalkan')) + ':</b> ' +
            U.esc(h.tanpaJadwal.slice(0, 6)
              .map(function (x) { return x.area.nama; }).join(', ')) +
            (h.tanpaJadwal.length > 6
              ? ', ' + T('dan {n} lainnya')
                  .replace('{n}', U.num(h.tanpaJadwal.length - 6))
              : '') + '. ' +
            T('Ia tidak menambah beban — dan juga tidak dibersihkan.'), '📍') +
          '<div class="mb-3"></div>'
        : '') +

      '<div class="row between mb-3">' +
        '<div class="hint">' + T('Pengali penyesuaian') + ' ×' + h.cfg.pengali + ' · ' +
          h.cfg.jamPerHari + ' ' + T('jam') + ' × ' + h.cfg.hariPerMinggu + ' ' + T('hari') +
        '</div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="bb-atur">⚙️ ' +
            T('Sesuaikan') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="bb-cetak">🖨️ ' +
            T('Cetak perhitungan') + '</button>' +
        '</div>' +
      '</div>';
  }

  function kartuOrangBeban(k, h) {
    var l = BEBAN.perPetugas(k.id).filter(function (x) { return x.jabatan.level >= 3; });
    if (!l.length) return '';
    /* Yang PALING PENUH lebih dulu. Daftar menurut abjad memaksa orang
       menggulir dua ratus lima puluh delapan baris untuk menemukan siapa
       yang kelebihan beban — padahal itu satu-satunya alasan kartu ini
       dibuka. */
    l = l.slice().sort(function (a, b) { return (b.persen || 0) - (a.persen || 0); });
    var lp = dpSaring('bebanOrang', l, function (x) {
      return (x.pekerja.lokasiIds || []); });
    return UI.card({ cls: 'mb-3', title: T('Beban per petugas'),
      sub: T('Jam per minggu menurut jadwal atas namanya — bukan jumlah slot') +
        ' · ' + T('paling penuh lebih dulu'),
      body: dpBilah('bebanOrang', l, lp, function (x) {
          return (x.pekerja.lokasiIds || []); }) +
        '<div class="bb-list">' + dpPotong('bebanOrang', lp, function (x) {
        var penuh = x.persen > 100;
        return '<div class="bb-r">' +
          '<div class="bb-r__t"><b>' + U.esc(x.pekerja.nama) + '</b>' +
            '<span>' + U.num(x.jamPerMinggu) + ' ' + T('jam') + ' / ' + x.kapasitas + ' ' +
              T('jam') +
              (x.kurangLuas ? ' · ' + jml(x.kurangLuas, '1 area tanpa luas',
                '{n} area tanpa luas') : '') + '</span></div>' +
          '<div class="bb-r__b' + (penuh ? ' bb-r__b--penuh' : '') + '">' +
            '<i style="width:' + Math.min(100, x.persen) + '%"></i></div>' +
          '<div class="bb-r__p' + (penuh ? ' mcs-warn' : '') + '">' + x.persen + '%</div>' +
        '</div>';
      }) + '</div>' });
  }

  function kartuAreaBeban(h) {
    if (!h.area.length) {
      return UI.card({ body: UI.empty('📍', T('Belum ada area'), '') });
    }
    function lokBeban(x) {
      return x.area && x.area.lokasiId ? x.area.lokasiId : '';
    }
    var ha = dpSaring('bebanArea', h.area, lokBeban);
    var kolomBeban = [
        { h: T('Area'), r: function (x) {
          return x.jenis.ikon + ' ' + U.esc(x.area.nama); } },
        { h: T('Luas'), cls: 'num', r: function (x) {
          return x.adaLuas ? U.num(x.luas) + ' m²'
            : '<span class="mcs-warn">' + T('belum diisi') + '</span>'; } },
        { h: T('Laju'), cls: 'num', r: function (x) {
          /* Laju BAKU dan laju SETELAH pengali berdiri berdampingan: yang
             ingin membandingkan dengan patokan industri butuh yang pertama,
             yang ingin memahami hitungannya butuh yang kedua. */
          return '<span title="' + U.esc(T('baku ISSA') + ' ' + x.lajuBaku) + '">' +
            x.lajuEfektif + ' m²/' + T('jam') + '</span>'; } },
        { h: T('Per kali'), cls: 'num', r: function (x) {
          return x.jamPerKali === null ? '—' : U.num(x.jamPerKali) + ' ' + T('jam'); } },
        { h: T('Per minggu'), cls: 'num', r: function (x) { return x.frekuensi || '—'; } },
        { h: T('Jam/minggu'), cls: 'num', r: function (x) {
          return x.jamPerMinggu === null
            ? '—'
            : '<b>' + U.num(x.jamPerMinggu) + '</b>'; } }
    ];
    return UI.card({ title: T('Beban per area'),
      sub: T('Diurutkan dari yang paling banyak memakan jam'),
      body: dpBilah('bebanArea', h.area, ha, lokBeban) +
        dpPotong('bebanArea', ha, null, function (tampil) {
          return UI.table(kolomBeban, tampil, null, { sumber: {
            teks: T('Luas tiap area dikali laju pembersihan, dikali berapa kali ' +
              'ia dijadwalkan seminggu. Area tanpa jadwal tidak menimbulkan ' +
              'beban dan tidak muncul di sini.'),
            hal: 'mcsArea', label: T('Buka daftar area') } });
        }) });
  }

  function dialogAturBeban() {
    var k = korp();
    var c = BEBAN.config(k.id);
    UI.formModal({
      title: T('Sesuaikan perhitungan'), size: 'wide', okText: T('Simpan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Ubah angka ini setelah membandingkan hasil hitungan dengan kenyataan ' +
              'di lapangan, bukan ditebak di awal. Cara paling jujur: ukur berapa ' +
              'lama satu area benar-benar dikerjakan, lalu setel pengalinya sampai ' +
              'hitungan cocok.'), '⚙️') },
        { name: 'pengali', label: T('Pengali penyesuaian'), type: 'number',
          min: 0.1, step: 0.05, value: c.pengali,
          hint: T('1,0 = persis patokan ISSA. Di bawah 1 berarti tim ini lebih ' +
            'lambat daripada patokan — yang normal untuk gedung dengan peralatan ' +
            'sederhana.') },
        { name: 'jamPerHari', label: T('Jam kerja bersih per hari'), type: 'number',
          min: 1, step: 0.5, value: c.jamPerHari,
          hint: T('SETELAH dikurangi istirahat, apel pagi, perjalanan antarlantai, ' +
            'dan menyiapkan alat. Menghitung delapan jam penuh menghasilkan jumlah ' +
            'petugas yang selalu kurang.') },
        { name: 'hariPerMinggu', label: T('Hari kerja per minggu'), type: 'number',
          min: 1, max: 7, value: c.hariPerMinggu }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = BEBAN.simpanConfig(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Perhitungan disesuaikan.'), 'ok');
      APP.refresh();
    });
  }

  function cetakBeban() {
    var k = korp();
    if (!k) return;
    var h = BEBAN.hitung(k.id);
    cetakDaftar({
      judul: T('Perhitungan Beban Kerja'),
      sub: T('Pengali') + ' ×' + h.cfg.pengali + ' · ' + h.cfg.jamPerHari + ' ' +
        T('jam') + ' × ' + h.cfg.hariPerMinggu + ' ' + T('hari') + ' = ' +
        h.jamPerOrang + ' ' + T('jam/orang/minggu'),
      baris: h.area,
      kolom: [
        { h: T('Area'), r: function (x) { return x.area.nama; } },
        { h: T('Jenis'), r: function (x) { return T(x.jenis.nama); } },
        { h: T('Luas (m²)'), num: true, r: function (x) {
          return x.adaLuas ? U.num(x.luas) : ''; } },
        { h: T('Laju baku'), num: true, r: function (x) { return x.lajuBaku; } },
        { h: T('Laju dipakai'), num: true, r: function (x) { return x.lajuEfektif; } },
        { h: T('Jam per kali'), num: true, r: function (x) {
          return x.jamPerKali === null ? '' : U.num(x.jamPerKali); } },
        { h: T('Kali per minggu'), num: true, r: function (x) { return x.frekuensi || ''; } },
        { h: T('Jam per minggu'), num: true, r: function (x) {
          return x.jamPerMinggu === null ? '' : U.num(x.jamPerMinggu); } }
      ],
      kaki: T('Total {jam} jam/minggu ÷ {kap} jam per orang = {butuh} petugas dibutuhkan; ' +
        'yang ada {ada}. Area tanpa luas DIKELUARKAN dari perhitungan, bukan ' +
        'dihitung nol — cakupan data {cak}%.')
        .replace('{jam}', h.jamPerMinggu).replace('{kap}', h.jamPerOrang)
        .replace('{butuh}', h.butuhOrang).replace('{ada}', h.adaOrang)
        .replace('{cak}', h.cakupan)
    });
  }

  function mountBeban(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'bb-atur': dialogAturBeban,
      'bb-cetak': cetakBeban
    }));
  }

  /* ====================================================== ASET & PERALATAN

     MCS melacak bahan HABIS PAKAI; berkas ini melacak barang TAHAN LAMA.
     Mesin poles puluhan juta yang tidak punya pemegang tercatat adalah mesin
     yang hilangnya baru ketahuan saat dibutuhkan.
   */

  /* Penyaring halaman peralatan.

     Ada karena satu akun sungguhan memperlihatkan apa yang terjadi tanpa
     mereka: 1.326 alat tergambar sebagai 1.326 baris datar, dan peringatan
     servisnya mencetak 446 nama di dalam SATU kalimat. Yang panjangnya
     ribuan karakter tidak dibaca orang — ia dilewati, dan peringatan yang
     dilewati sama saja dengan tidak ada. */

  function cetakDaftarJadwal() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Jadwal Pembersihan'),
      sub: T('Termasuk yang dijeda'),
      baris: MCS.jadwal(k.id, true),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Area'), r: function (x) { return namaArea(x.areaId); } },
        { h: T('Petugas'), r: function (x) {
          return namaPekerja(x.pekerjaId) || T('Petugas terhapus'); } },
        { h: T('Hari'), r: function (x) {
          return (x.hari || []).map(function (h) { return T(MCS.HARI[h]).slice(0, 3); }).join(', '); } },
        { h: T('Waktu'), r: function (x) {
          return x.mode === 'interval'
            ? T('tiap') + ' ' + x.intervalJam + ' ' + T('jam') + ' ' + x.mulai + '–' + x.selesai
            : (x.jam || []).join(', '); } },
        { h: T('Catatan'), r: function (x) { return x.catatan || ''; } },
        { h: T('Status'), r: function (x) { return x.aktif === false ? T('dijeda') : T('aktif'); } }
      ]
    });
  }

  /* Lembar hadir memang berguna justru saat BELUM terisi — supervisor yang
     berkeliling pagi hari mencentangnya dengan pena, lalu memasukkannya ke
     aplikasi setelah keliling selesai. */

  function kartuSaran(k) {
    var s = MCS.saranJadwal(k.id, 30);
    var perlu = s.filter(function (x) { return x.saran !== 'tetap'; });
    if (!perlu.length) return '';

    /* Saran juga daftar tak berbatas: satu saran per area yang perlu
       disesuaikan, dan pada 1.223 area itu bisa ratusan baris di kartu
       paling atas halaman — mendorong jadwalnya sendiri jauh ke bawah
       layar.

       Yang naik sudah berada di atas — MCS.saranJadwal mengurutkannya di
       sumbernya (naik, tetap, turun; lalu menurut jumlah aduan). Mengurutkan
       ulang di sini akan menghapus urutan kedua itu tanpa kelihatan. */
    var ps = dpSaring('saran', perlu, function (x) {
      var ar = MCS.areaSatu(x.areaId);
      return ar ? (ar.lokasiId || '') : '';
    });

    return UI.card({ title: T('Saran frekuensi'), cls: 'mb-3',
      sub: T('Dari aduan penghuni dan hasil inspeksi 30 hari terakhir'),
      body:
        '<p class="tbl-sub">' +
          T('Ini saran, bukan perubahan otomatis. Menaikkan frekuensi menambah beban ' +
            'kerja tanpa menambah orang — dan hanya Anda yang tahu berapa petugas yang ada.') +
        '</p>' +
        dpBilah('saran', perlu, ps, function (x) {
          var ar = MCS.areaSatu(x.areaId);
          return ar ? (ar.lokasiId || '') : '';
        }) +
        '<div class="sr-list mt-2">' +
        dpPotong('saran', ps, function (x) {
          var naik = x.saran === 'naik';
          return '<div class="sr-r sr-r--' + x.saran + '">' +
            '<div class="sr-r__i">' + (naik ? '↑' : '↓') + '</div>' +
            '<div class="sr-r__t">' +
              '<b>' + U.esc(x.nama) + '</b>' +
              '<span>' + (naik ? T('pertimbangkan menambah frekuensi')
                                : T('mungkin bisa dikurangi')) +
                ' · ' + T('sekarang') + ' ' +
                jml(x.perMinggu, '1 kali/minggu', '{n} kali/minggu') + '</span>' +
              /* Tanda kurung di sini BUKAN gaya penulisan. Tanpa keduanya,
                 '+' mengikat lebih kuat daripada '||' dan seluruh penutup
                 </span></div></div> ikut terlempar ke sisi kanan yang tidak
                 pernah dievaluasi — kartu berikutnya lalu bersarang di dalam
                 baris ini, dan halamannya pecah tanpa satu pun galat. */
              '<span class="sr-r__a">' +
                (x.alasan.length
                  ? x.alasan.map(function (al) {
                      return al.kode === 'aduan'
                        ? '📣 ' + jml(al.n, '1 aduan', '{n} aduan')
                        : '🔍 ' + T('mutu rata-rata') + ' ' + al.n;
                    }).join(' · ')
                  : '✅ ' + T('tanpa aduan, mutu terbukti baik')) +
              '</span>' +
            '</div>' +
          '</div>';
        }) + '</div>' });
  }

  function renderJadwal() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var j = MCS.jadwal(k.id, true);
    var a = MCS.area(k.id), p = MCS.pekerja(k.id);

    if (!a.length || !p.length) {
      return UI.alert('warn', '<b>' + T('Jadwal butuh area dan petugas.') + '</b> ' +
        T('Daftarkan keduanya dulu — jadwal tanpa salah satunya tidak bisa mengingatkan siapa pun.'),
        '⚠️') + '<div class="mb-3"></div>' +
        '<div class="row" style="gap:10px">' +
          (!a.length ? '<button class="btn" data-act="mcs-ke-area">' + T('Daftarkan area') + '</button>' : '') +
          (!p.length ? '<button class="btn" data-act="mcs-ke-pekerja">' + T('Daftarkan petugas') + '</button>' : '') +
        '</div>';
    }

    var yatim = MCS.areaTanpaPenanggung(k.id);

    return kartuSaran(k) +

      /* Area yang tidak dijadwalkan kepada siapa pun tidak akan pernah muncul
         sebagai tugas, dan karena itu tidak akan pernah muncul sebagai
         kegagalan. Ia hilang dari laporan seolah-olah selalu bersih. */
      /* Nama disebut SECUKUPNYA, bukan seluruhnya. Pada satu gedung enam
         nama terbaca wajar; pada delapan puluh tujuh cabang daftar ini bisa
         memuat ratusan nama dalam satu kalimat, dan peringatan sepanjang
         itu dilompati matanya — persis pada saat ia paling perlu dibaca.
         Sama persis dengan peringatan servis di halaman Peralatan. */
      (yatim.length
        ? UI.alert('warn', '<b>' + jml(yatim.length,
            T('1 area belum dijadwalkan kepada siapa pun'),
            T('{n} area belum dijadwalkan kepada siapa pun')) + ':</b> ' +
            U.esc(yatim.slice(0, 5).map(function (a) { return a.nama; }).join(', ')) +
            (yatim.length > 5
              ? ', ' + T('dan {n} lainnya').replace('{n}', U.num(yatim.length - 5))
              : '') + '. ' +
            T('Area tanpa jadwal tidak pernah muncul sebagai tugas — juga tidak pernah ' +
              'muncul sebagai kelalaian.'), '📍') + '<div class="mb-3"></div>'
        : '') +

      '<div class="row between mb-3">' +
        '<div class="hint">' + jml(j.length, T('1 jadwal'), T('{n} jadwal')) + '</div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost" data-act="mcs-jd-cetak">🖨️ ' + T('Cetak jadwal') + '</button>' +
          '<button class="btn btn--primary" data-act="mcs-jd-baru">＋ ' + T('Tambah Jadwal') + '</button>' +
        '</div>' +
      '</div>' +

      UI.tabs([{ key: 'area', label: T('Per area'), n: MCS.area(k.id).length },
               { key: 'petugas', label: T('Per petugas'), n: MCS.pekerja(k.id).length }],
              sudutJadwal, 'jd-sudut') +

      (!j.length
        ? UI.empty('🗓️', T('Belum ada jadwal'),
            T('Susun kapan tiap area dibersihkan dan siapa yang mengerjakannya.'))
        /* Dua sudut, dua kunci keadaan yang TERPISAH. Memakai satu kunci
           membuat 'tampilkan 40 lagi' pada sudut petugas ikut membuka empat
           puluh baris pada sudut area — dua daftar yang panjangnya berbeda
           jauh tidak bisa berbagi satu batas. */
        : sudutJadwal === 'petugas'
          ? (function () {
              var b = MCS.bebanPetugas(k.id);
              var bs = dpSaring('jdPetugas', b, function (x) {
                return (x.pekerja.lokasiIds || [])[0] || ''; });
              return dpBilah('jdPetugas', b, bs, function (x) {
                  return (x.pekerja.lokasiIds || [])[0] || ''; }) +
                '<div class="mt-3">' +
                  dpPotong('jdPetugas', bs, kartuBeban) + '</div>';
            })()
          : (function () {
              var lok = function (x) {
                var ar = MCS.areaSatu(x.areaId);
                return ar ? (ar.lokasiId || '') : '';
              };
              var js = dpSaring('jdArea', j, lok);
              return dpBilah('jdArea', j, js, lok) +
                UI.card({ cls: 'mt-3', body: '<div class="ma-list">' +
                  dpPotong('jdArea', js, barisJadwal) + '</div>' });
            })());
  }

  var sudutJadwal = 'area';

  /**
   * Satu petugas, seluruh bebannya.
   *
   * Angka slot per minggu ditaruh paling menonjol karena itulah yang
   * menentukan apakah jadwalnya masuk akal. Sisanya — selisih antara wilayah
   * kerja dan jadwal — disebut apa adanya, tanpa dianggap kesalahan: keduanya
   * bisa benar, dan hanya orang yang menyusunnya yang tahu mana yang disengaja.
   */

  function kartuBeban(b) {
    var p = b.pekerja;
    var jb = MCS.jabatan(p.jabatan);
    var berat = b.perMinggu >= 60;

    return UI.card({ cls: 'mb-3',
      title: p.nama,
      sub: jb.ikon + ' ' + T(jb.nama) + (p.shift ? ' · ' + p.shift : ''),
      tools: '<span class="jd-beban' + (berat ? ' jd-beban--berat' : '') + '">' +
        '<b>' + U.num(b.perMinggu) + '</b><i>' + T('slot/minggu') + '</i></span>',
      body:
        /* Enam jadwal per kartu, sisanya disebut jumlahnya.

           Kartu ini dipakai untuk MENIMBANG beban seseorang, dan itu sudah
           terjawab oleh angka slot/minggu di kepalanya. Menggambar seluruh
           jadwal tiap orang membuat empat puluh kartu memuat ribuan baris —
           yang membaca beban tidak sedang membaca jadwalnya satu per satu,
           dan yang perlu membacanya membukanya lewat sudut Per area. */
        (b.jadwal.length
          ? '<div class="ma-list">' +
              b.jadwal.slice(0, 6).map(barisJadwal).join('') + '</div>' +
            (b.jadwal.length > 6
              ? '<div class="tbl-sub mt-2">' +
                jml(b.jadwal.length - 6, T('1 jadwal lagi tidak ditampilkan'),
                  T('{n} jadwal lagi tidak ditampilkan')) + '</div>'
              : '')
          : '<div class="tbl-sub">' + T('Belum ada jadwal atas namanya.') + '</div>') +

        ((b.luarWilayah.length || b.tanpaJadwal.length)
          ? '<div class="jd-selisih mt-2">' +
              (b.tanpaJadwal.length
                ? '<div>📍 <b>' + T('Wilayahnya, tetapi belum berjadwal') + ':</b> ' +
                  U.esc(b.tanpaJadwal.slice(0, 6)
                    .map(function (a) { return a.nama; }).join(', ')) +
                  (b.tanpaJadwal.length > 6
                    ? ', ' + T('dan {n} lainnya')
                        .replace('{n}', U.num(b.tanpaJadwal.length - 6))
                    : '') + '</div>'
                : '') +
              (b.luarWilayah.length
                ? '<div>🗓️ <b>' + T('Dijadwalkan di luar wilayahnya') + ':</b> ' +
                  U.esc(b.luarWilayah.slice(0, 6)
                    .map(function (a) { return a.nama; }).join(', ')) +
                  (b.luarWilayah.length > 6
                    ? ', ' + T('dan {n} lainnya')
                        .replace('{n}', U.num(b.luarWilayah.length - 6))
                    : '') +
                  ' <button class="btn btn--ghost btn--sm" data-act="jd-samakan" ' +
                  'data-id="' + p.id + '">' + T('Masukkan ke wilayahnya') + '</button></div>'
                : '') +
            '</div>'
          : '') });
  }

  /* Dipanggil dari renderJadwal — didefinisikan sebelum barisJadwal supaya
     urutan bacanya mengikuti urutan tampilnya. */
  /** Kapan jadwal ini berulang, sebagai kalimat. */

  function ulangTeks(j) {
    var s = MCS.siklus(j.siklus);
    if (!s.bulan) {
      return (j.hari || []).map(function (h) { return T(MCS.HARI[h]).slice(0, 3); }).join(', ');
    }
    var tgl = j.tglBulan === 'akhir' ? T('hari terakhir') : T('tgl') + ' ' + j.tglBulan;
    return T(s.nama) + ' · ' + tgl;
  }

  /** Tanggal jatuh berikutnya untuk jadwal berkala. */

  function berikutnyaTeks(j) {
    var d = new Date(U.today() + 'T00:00:00');
    /* Dicari maju hari demi hari, dibatasi dua tahun. Menghitungnya dengan
       rumus akan salah pada penjepitan tanggal 31; menelusurinya memakai
       fungsi yang sama dengan yang dipakai jadwal itu sendiri tidak bisa
       menyimpang darinya. */
    for (var i = 0; i < 760; i++) {
      if (MCS.jatuhBerkala(j, U.iso(d))) {
        return i === 0 ? T('hari ini') : U.tglPendek(U.iso(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return T('belum terjadwal');
  }

  function barisJadwal(j) {
    var a = MCS.areaSatu(j.areaId), p = MCS.pekerjaSatu(j.pekerjaId);
    var on = j.aktif !== false;
    var sk = MCS.siklus(j.siklus);
    var slot = j.mode === 'interval'
      ? T('tiap') + ' ' + j.intervalJam + ' ' + T('jam') + ', ' + j.mulai + '–' + j.selesai
      : (j.jam || []).join(', ');
    var hari = ulangTeks(j);
    var n = MCS.slotJadwal(j, U.today()).length;

    return '<div class="ma-r' + (on ? '' : ' ma-r--jeda') + '">' +
      '<button class="sw' + (on ? ' sw--on' : '') + '" data-act="mcs-jd-jeda" ' +
        'data-id="' + j.id + '" role="switch" aria-checked="' + on + '"><i></i></button>' +
      '<div class="ma-r__t">' +
        '<b>' + (a ? U.ikon(MCS.jenisArea(a.jenis).ikon) + ' ' + U.esc(a.nama) : T('Area terhapus')) +
          /* Siklus panjang diberi lencana sendiri: dalam daftar yang isinya
             hampir semua jadwal harian, yang tiga bulanan harus terlihat
             berbeda sekilas — bukan ketahuan setelah membaca barisnya. */
          (sk.bulan ? ' <span class="jd-siklus">' + sk.ikon + ' ' + T(sk.nama) + '</span>' : '') +
        '</b>' +
        '<span>' + U.esc(slot) + ' · ' + U.esc(hari) +
          ' · ' + (p ? U.esc(p.nama) : T('Petugas terhapus')) +
          (n ? ' · ' + jml(n, T('1 kali hari ini'), T('{n} kali hari ini')) : '') + '</span>' +
        /* Untuk jadwal berkala, 'kapan lagi' jauh lebih berguna daripada
           'berapa kali hari ini' — yang jawabannya hampir selalu nol. */
        (sk.bulan ? '<span class="mcs-t__c">⏭️ ' + T('berikutnya') + ' ' +
          U.esc(berikutnyaTeks(j)) + '</span>' : '') +
        (j.catatan ? '<span class="mcs-t__c">📝 ' + U.esc(j.catatan) + '</span>' : '') +
      '</div>' +
      (on ? '' : '<span class="chip chip--muted">' + T('dijeda') + '</span>') +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-jd-ubah" data-id="' + j.id + '">' +
        T('Ubah') + '</button>' +
      '<button class="btn btn--ghost btn--sm ma-hapus" data-act="mcs-jd-hapus" data-id="' + j.id + '">🗑</button>' +
    '</div>';
  }

  function dialogJadwal(id) {
    var k = korp();
    var j = id ? MCS.jadwalSatu(id) : null;
    var a = MCS.area(k.id), p = MCS.pekerja(k.id);
    var hariKini = j ? (j.hari || []) : [1, 2, 3, 4, 5];
    var saran = j ? null : MCS.jenisArea(a[0] && a[0].jenis).saranJam;

    UI.formModal({
      title: j ? T('Ubah jadwal') : T('Jadwal baru'),
      sub: U.esc(k.nama), okText: j ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'areaId', label: T('Area'), type: 'select', value: j ? j.areaId : (a[0] && a[0].id),
          options: a.map(function (x) {
            return { value: x.id, label: MCS.jenisArea(x.jenis).ikon + ' ' + x.nama +
              (x.lantai ? ' (Lt. ' + x.lantai + ')' : '') }; }) },
        { name: 'pekerjaId', label: T('Petugas'), type: 'select', value: j ? j.pekerjaId : (p[0] && p[0].id),
          options: p.map(function (x) {
            return { value: x.id, label: MCS.jenisPekerja(x.jenis).ikon + ' ' + x.nama }; }) },
        { name: 'siklus', label: T('Seberapa sering'), type: 'select',
          value: j ? (j.siklus || 'mingguan') : 'mingguan',
          options: MCS.SIKLUS.map(function (s) {
            return { value: s.kode, label: s.ikon + '  ' + T(s.nama) }; }),
          hint: T('Mingguan memakai pilihan hari di bawah. Selebihnya memakai ' +
            'tanggal dan mulai berlaku.') },
        { name: 'tglBulan', label: T('Tanggal pelaksanaan'), type: 'select',
          value: j ? String(j.tglBulan || 1) : '1',
          options: (function () {
            var o = [];
            for (var i = 1; i <= 31; i++) o.push({ value: String(i), label: T('Tanggal') + ' ' + i });
            o.push({ value: 'akhir', label: T('Hari terakhir bulan') });
            return o;
          })(),
          hint: T('Bulan yang tidak punya tanggal itu memakai hari terakhirnya — ' +
            'tanggal 31 tidak pernah dilewatkan begitu saja.') },
        { name: 'mulaiDari', label: T('Mulai berlaku'), type: 'date',
          value: j ? (j.mulaiDari || U.today()) : U.today(),
          hint: T('Titik hitung siklusnya. Jadwal tiga bulanan yang mulai Mei ' +
            'jatuh pada Mei, Agustus, November.') },
        { name: 'mode', label: T('Pola pengulangan'), type: 'select', value: j ? j.mode : 'jam',
          options: [{ value: 'jam', label: T('Jam tertentu') },
                    { value: 'interval', label: T('Berulang tiap beberapa jam') }] },
        { name: 'jam', label: T('Jam pembersihan'), value: j ? (j.jam || []).join(', ') : '08:00, 12:00, 16:00',
          hint: T('Dipakai bila polanya “Jam tertentu”. Pisahkan dengan koma.') },
        { name: 'intervalJam', label: T('Diulang tiap berapa jam'), type: 'number', min: 1,
          value: j ? j.intervalJam : (saran || 2),
          hint: T('Dipakai bila polanya “Berulang tiap beberapa jam”.') },
        { name: 'mulai', label: T('Mulai jam'), value: j ? j.mulai : '07:00' },
        { name: 'selesai', label: T('Sampai jam'), value: j ? j.selesai : '17:00' },
        { type: 'html', html:
          '<div class="field"><label>' + T('Hari') + '</label><div class="kh-alg">' +
            MCS.HARI.map(function (nm, i) {
              return '<label class="kh-alg__i">' +
                '<input type="checkbox" name="hari" data-multi="1" value="' + i + '"' +
                (hariKini.indexOf(i) >= 0 ? ' checked' : '') + '>' +
                '<span>' + U.esc(T(nm).slice(0, 3)) + '</span></label>';
            }).join('') + '</div></div>' },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2, value: j ? j.catatan : '' },
        { name: 'aktif', label: T('Jadwal berjalan'), type: 'checkbox', value: j ? j.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      d.jam = String(d.jam || '').split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return /^\d{1,2}:\d{2}$/.test(s); })
        .map(function (s) { return s.length === 4 ? '0' + s : s; });
      d.hari = (d.hari || []).map(Number);
      var r = j ? MCS.ubahJadwal(id, d) : MCS.tambahJadwal(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(j ? T('Jadwal diperbarui') : T('Jadwal ditambahkan'), 'ok');
      /* Ketidakcocokan dengan jam kerja petugas DIPERINGATKAN, bukan ditolak.

         Petugas yang menggantikan rekannya sehari adalah keadaan sehari-hari
         di gedung; aplikasi yang menolaknya akan dilawan dengan mengosongkan
         kolom jam kerja supaya berhenti mengganggu — dan sejak itu tidak ada
         lagi yang bisa diperiksa sama sekali.

         Muncul SESUDAH jadwalnya tersimpan, supaya peringatan tidak pernah
         menyandera pekerjaan yang memang disengaja. */
      if (d.pekerjaId) {
        var bentrok = MCS.bentrokJadwal(d.pekerjaId, d);
        if (bentrok.length) {
          var p = MCS.pekerjaSatu(d.pekerjaId);
          UI.modal({
            title: T('Jadwal tersimpan — tetapi periksa lagi'),
            sub: p ? p.nama : '',
            body: UI.alert('warn',
                '<b>' + T('Jadwal ini di luar pola kerja yang tercatat.') + '</b>' +
                '<ul class="mt-1">' +
                  bentrok.map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') +
                '</ul>', '⚠️') +
              '<div class="tbl-sub mt-2">' +
                T('Jadwalnya TETAP tersimpan — menggantikan rekan sehari adalah hal ' +
                  'biasa. Bila ini bukan penggantian, betulkan salah satunya: jamnya ' +
                  'di jadwal ini, atau pola kerjanya di data petugas.') +
              '</div>',
            foot: '<button class="btn" data-close>' + T('Mengerti') + '</button>'
          });
        }
      }
      APP.refresh();
    });
  }

  function mountJadwal(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'jd-sudut': function (el) {
        sudutJadwal = el.getAttribute('data-key');
        /* Kedua sudut kembali ke halaman pertama. Sudut yang ditinggalkan
           terbuka sampai baris kedua ratus akan digambar penuh lagi begitu
           orang kembali ke sana — dan ia tidak akan mengerti kenapa
           halamannya tiba-tiba berat. */
        dpUlang('jdArea'); dpUlang('jdPetugas');
        APP.refresh();
      },
      'mcs-jd-cetak': function () { cetakDaftarJadwal(); },
      /* Menyamakan wilayah kerja dengan jadwal HANYA menambah, tidak pernah
         mengurangi: area yang sengaja dipegang seseorang tanpa jadwal tetap
         menjadi wilayahnya. */
      'jd-samakan': function (el) {
        var id = el.getAttribute('data-id');
        var p = MCS.pekerjaSatu(id);
        if (!p) return;
        var ids = (p.areaIds || []).slice();
        MCS.jadwal(p.korporatId).forEach(function (j) {
          if (j.pekerjaId === p.id && ids.indexOf(j.areaId) < 0) ids.push(j.areaId);
        });
        var r = MCS.ubahPekerja(p.id, { nama: p.nama, jenis: p.jenis, jabatan: p.jabatan,
          telp: p.telp, shift: p.shift, catatan: p.catatan, aktif: p.aktif, areaIds: ids });
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(T('Wilayah kerja disamakan dengan jadwalnya.'), 'ok');
        APP.refresh();
      },
      'mcs-ke-area': function () { APP.go('mcsArea'); },
      'mcs-ke-pekerja': function () { APP.go('mcsPekerja'); },
      'mcs-jd-baru': function () { dialogJadwal(null); },
      'mcs-jd-ubah': function (el) { dialogJadwal(el.getAttribute('data-id')); },
      'mcs-jd-jeda': function (el) {
        var j = MCS.jadwalSatu(el.getAttribute('data-id'));
        MCS.jedaJadwal(j.id, j.aktif === false);
        UI.toast(j.aktif === false ? T('Jadwal dijalankan') : T('Jadwal dijeda'), 'ok');
        APP.refresh();
      },
      'mcs-jd-hapus': function (el) {
        UI.konfirm({ title: T('Hapus jadwal ini?'),
          text: T('Riwayat pembersihan yang sudah tercatat tidak ikut hilang.'),
          okText: T('Hapus'), danger: true }).then(function (ya) {
          if (!ya) return;
          MCS.hapusJadwal(el.getAttribute('data-id'));
          UI.toast(T('Jadwal dihapus'), 'ok'); APP.refresh();
        });
      }
    }));
  }

  /* ============================================================== LAPORAN */

  /* ==================================================== LAPORAN BULANAN

     Inilah yang sebenarnya dibeli korporat: lembar yang bisa diserahkan
     kepada pemilik gedung, penyewa, atau auditor. Karena itu ia dirancang
     untuk DICETAK — bukan sekadar dibaca di layar — dan menyebut batas
     kepercayaan angkanya sendiri, karena laporan yang melebih-lebihkan akan
     dibantah orang pertama yang mengeceknya. */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsJadwal", { label: 'Jadwal Pembersihan', icon: '🗓️', grup: 'Pengaturan',
      render: renderJadwal, mount: mountJadwal });

  VMCS.daftar("korporat", "mcsBeban", { label: 'Beban Kerja', icon: '🧮', grup: 'Pengaturan',
      sub: 'Berapa petugas yang sebenarnya dibutuhkan gedung ini',
      render: renderBeban, mount: mountBeban });
})();
