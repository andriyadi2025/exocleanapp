/* ==========================================================================
   views/penghuni.js — layar pemilik ruangan
   --------------------------------------------------------------------------
   SIAPA YANG SEHARUSNYA MENILAI HASIL KERJA PETUGAS KEBERSIHAN

   Pertanyaan ini ditanyakan sekali, dan jawabannya menentukan bentuk seluruh
   berkas ini. Ditulis di sini supaya siapa pun yang mengubahnya kelak tahu
   apa yang sedang ia ubah.

   TIGA PERTANYAAN YANG SERING DIKIRA SATU

     1. "Apakah dikerjakan?"      — kehadiran dan tugas selesai.
     2. "Apakah hasilnya bersih?" — mutu terhadap standar.
     3. "Apakah penghuni puas?"   — kepuasan pemakai ruangan.

   Ketiganya butuh penjawab yang berbeda, dan menggabungkannya menjadi satu
   angka membuat angka itu tidak bisa dijawab ketika ia jelek.

     1 dijawab MESIN. Pemindaian tag, foto sebelum-sesudah, jam masuk. Tidak
       ada yang "menilai" ini; ia tercatat atau tidak tercatat.

     2 dijawab SUPERVISOR, dengan checklist, di tempat. Ini satu-satunya yang
       boleh menyentuh nilai kinerja seseorang, karena hanya ia yang melihat
       apa yang tidak tampak: bahan yang dipakai, urutan kerjanya, APD-nya,
       dan apakah waktunya memang cukup. Aplikasi ini sudah memegangnya
       (mcsInspeksi), dan komentarnya sendiri sudah menyatakan bahwa inspeksi
       yang diisi orang yang mengerjakan bukan inspeksi.

     3 dijawab PENGHUNI — dan hanya penghuni yang bisa menjawabnya. Tetapi
       jawabannya adalah tentang RUANGAN, bukan tentang ORANG.

   KENAPA PENGHUNI TIDAK MENILAI ORANG

   Penghuni menilai yang tampak: debu, bau, tempat sampah penuh. Ia tidak
   melihat bahwa ruangan itu dijatah lima belas menit, bahwa pembersih
   lantainya habis sejak Selasa, atau bahwa bengkel di sebelah baru menumpahkan
   oli. Menjadikan pendapatnya sebagai nilai seseorang berarti menghukum orang
   atas keputusan yang dibuat orang lain — hampir selalu atas jadwal.

   Ada tiga hal lain yang selalu terjadi bila orang dinilai langsung oleh
   pemakai ruangan, dan ketiganya sudah lama diketahui:

     · Yang menilai hanya yang sedang kesal. Rata-ratanya menjadi indeks
       keluhan, bukan indeks mutu.
     · Yang ramah menang atas yang bersih. Petugas yang menyapa setiap pagi
       akan bernilai lebih tinggi daripada petugas yang membersihkan lebih
       baik tetapi pendiam.
     · Nilai buruk yang tidak bisa dibantah merusak kepercayaan pada seluruh
       sistemnya. Inspeksi bisa ditinjau ulang di tempat; kekesalan tidak.

   YANG DILAKUKAN BERKAS INI

   Penghuni ditanya "seberapa bersih ruangan ini hari ini", dan jawabannya
   disimpan sebagai kepuasan atas AREA pada TANGGAL (mcsPuas). Petugas yang
   bertugas dicatat sebagai keterangan, sama seperti pada inspeksi — supaya
   polanya bisa ditelusuri, bukan supaya seseorang bisa dihukum.

   SARAN BOBOT, bila kelak nilai kinerja disusun dari ketiganya:
   inspeksi supervisor terbesar, tugas selesai berikutnya, kepuasan penghuni
   paling kecil dan hanya bila jawabannya cukup banyak untuk berarti. Angka
   pastinya keputusan perusahaan, bukan keputusan berkas ini.
   ========================================================================== */
var ViewPenghuni = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  function jml(n, satu, banyak) {
    return n === 1 ? T(satu).replace('{n}', n) : T(banyak).replace('{n}', U.num(n));
  }

  /* Bintang kepuasan. Lima tingkat dengan KATA-KATANYA, bukan bintang
     telanjang: "3 bintang" berarti hal yang berbeda bagi setiap orang,
     sedangkan "terlihat dipakai, masih pantas" berarti hal yang sama. */
  var TINGKAT = [
    { skor: 5, ikon: '✨', nama: 'Bersih sekali',
      ket: 'Seperti baru. Tidak ada debu, noda, atau bau sama sekali.' },
    { skor: 4, ikon: '👍', nama: 'Bersih',
      ket: 'Bersih pada pandangan biasa. Debu hanya di sudut yang jarang dilihat.' },
    { skor: 3, ikon: '😐', nama: 'Cukup',
      ket: 'Terlihat dipakai. Ada debu dan bekas, tetapi masih pantas.' },
    { skor: 2, ikon: '⚠️', nama: 'Kurang',
      ket: 'Kotor terlihat jelas. Penghuni mulai mengeluh.' },
    { skor: 1, ikon: '🚫', nama: 'Buruk',
      ket: 'Tidak layak. Perlu pembersihan menyeluruh sekarang.' }
  ];

  /* Status aduan tidak punya daftar bersama di MCS maupun UI.STATUS — yang
     ada hanya nilainya, tersebar di dalam perbandingan. Dipetakan di sini
     supaya penghuni membaca kata, bukan kode; dan yang tidak dikenal tampil
     apa adanya, bukan hilang. */
  var STATUS = {
    baru:       { nama: 'Menunggu ditugaskan', warna: 'warn' },
    ditugaskan: { nama: 'Sedang ditangani',    warna: 'info' },
    proses:     { nama: 'Sedang ditangani',    warna: 'info' },
    selesai:    { nama: 'Selesai',             warna: 'ok' },
    ditutup:    { nama: 'Ditutup',             warna: 'muted' }
  };

  function statusAduan(kode) {
    return STATUS[kode] || { nama: kode || '—', warna: 'muted' };
  }

  /**
   * Rata-rata kepuasan: angka + KATA, tidak pernah angka sendirian.
   *
   * Aplikasi ini memakai dua skala 1–5 yang berlawanan arah — kepuasan
   * (5 terbaik) dan inspeksi APPA (1 terbaik) — dan keduanya sengaja tidak
   * disamakan; alasannya tertulis panjang di views/mcs.js dekat selMutu().
   * Yang membuat keduanya aman berdampingan adalah KATA: 'Bersih sekali'
   * sampai 'Buruk' berbunyi sama di kedua skala, dan kata tidak punya arah
   * yang bisa terbalik. Karena itu di sini pun angkanya tidak pernah
   * berdiri tanpa katanya.
   */
  function selPuas(rata) {
    var t = tingkat(Math.round(rata));
    return '<b>' + U.esc(String(rata)) + ' / 5</b> ' + t.ikon + ' ' +
      '<span class="tbl-sub">' + U.esc(T(t.nama)) + '</span>';
  }

  function tingkat(skor) {
    return TINGKAT.filter(function (t) { return t.skor === skor; })[0] || TINGKAT[2];
  }

  /* ============================================================== BERANDA */

  function renderBeranda() {
    var area = PENGHUNI.areaSaya();
    if (!area.length) return kosongTanpaRuangan();

    var perlu = area.filter(function (a) {
      return PENGHUNI.keadaanArea(a.id).belumDinilai;
    });

    return UI.alert('info',
      '<b>' + T('Ruangan yang menjadi tanggung jawab Anda.') + '</b> ' +
      T('Di sini Anda melihat kapan terakhir dibersihkan, melaporkan yang ' +
        'kurang, dan memberi tahu seberapa bersih hasilnya.'), '🚪') +
    '<div class="mb-3"></div>' +

    (perlu.length
      ? UI.alert('warn',
          '<b>' + jml(perlu.length, '1 ruangan belum Anda nilai',
            '{n} ruangan belum Anda nilai') + '.</b> ' +
          T('Penilaian Anda tidak menghukum siapa pun — ia dipakai melihat ' +
            'ruangan mana yang jadwalnya perlu ditambah.'), '⭐') +
        '<div class="mb-3"></div>'
      : '') +

    '<div class="ph-g">' +
      area.map(kartuRuangan).join('') +
    '</div>';
  }

  function kosongTanpaRuangan() {
    return UI.empty('🚪', T('Belum ada ruangan yang ditetapkan untuk Anda'),
      T('Hubungi staf gedung agar ruangan Anda didaftarkan. Selama belum ' +
        'ditetapkan, halaman ini sengaja kosong — menampilkan ruangan orang ' +
        'lain akan lebih buruk daripada tidak menampilkan apa-apa.'));
  }

  function kartuRuangan(a) {
    var k = PENGHUNI.keadaanArea(a.id);
    var objek = MCS.objek(a.id);
    var r = PENGHUNI.rataArea(a.id);
    var jns = MCS.jenisArea(a.jenis);

    return '<div class="ph-k">' +
      '<div class="ph-k__h">' +
        '<span class="ph-k__i">' + jns.ikon + '</span>' +
        '<div style="min-width:0">' +
          '<b>' + U.esc(a.nama) + '</b>' +
          '<div class="tbl-sub">' + T(jns.nama) +
            (a.luas ? ' · ' + U.num(a.luas) + ' m²' : '') +
            (objek.length ? ' · ' + jml(objek.length, '1 objek', '{n} objek') : '') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="ph-k__b">' +
        barisKeadaan(T('Terakhir dibersihkan'),
          k.terakhir
            ? U.sejak(k.terakhir.selesaiAt || k.terakhir.tgl)
            : '<span class="mcs-warn">' + T('belum pernah tercatat') + '</span>') +
        barisKeadaan(T('Hari ini'),
          k.tugasHariIni
            ? U.num(k.selesaiHariIni) + ' / ' + U.num(k.tugasHariIni) + ' ' + T('selesai')
            : '<span class="tbl-sub">' + T('tidak dijadwalkan') + '</span>') +
        barisKeadaan(T('Aduan terbuka'),
          k.aduanTerbuka
            ? '<b class="mcs-warn">' + U.num(k.aduanTerbuka) + '</b>'
            : '<span class="tbl-sub">' + T('tidak ada') + '</span>') +
        /* Rata-rata disembunyikan sampai jawabannya cukup. Angka dari dua
           jawaban akan dibaca sebagai fakta begitu ia muncul. */
        barisKeadaan(T('Kepuasan rata-rata'),
          r.cukup
            ? selPuas(r.rata) + ' <span class="tbl-sub">(' +
              jml(r.n, '1 penilaian', '{n} penilaian') + ')</span>'
            : '<span class="tbl-sub">' +
              T('belum cukup penilaian untuk dirata-rata') + '</span>') +
      '</div>' +

      '<div class="ph-k__a">' +
        '<button class="btn btn--sm btn--ghost" data-act="ph-aduan" data-id="' + a.id +
          '">📣 ' + T('Laporkan') + '</button>' +
        '<button class="btn btn--sm' + (k.belumDinilai ? ' btn--primary' : ' btn--ghost') +
          '" data-act="ph-nilai" data-id="' + a.id + '">⭐ ' + T('Nilai') + '</button>' +
      '</div>' +
    '</div>';
  }

  function barisKeadaan(label, isi) {
    return '<div class="ph-k__r"><span>' + label + '</span><span>' + isi + '</span></div>';
  }

  function mountBeranda(root) {
    U.delegate(root, {
      'ph-aduan': function (el) { dialogAduan(el.getAttribute('data-id')); },
      'ph-nilai': function (el) { dialogNilai(el.getAttribute('data-id')); }
    });
  }

  /* ============================================================== KOMPLAIN */

  function renderKomplain() {
    var area = PENGHUNI.areaSaya();
    if (!area.length) return kosongTanpaRuangan();
    var l = PENGHUNI.aduanSaya();

    return UI.alert('info',
      '<b>' + T('Laporkan yang kurang, bukan yang jelek saja.') + '</b> ' +
      T('Setiap laporan punya batas waktu tanggapan, diteruskan ke petugas ' +
        'yang bertanggung jawab, dan bisa Anda ikuti sampai ditutup. Foto ' +
        'sangat membantu — satu foto menghemat tiga kali bolak-balik.'),
      '📣') + '<div class="mb-3"></div>' +

    '<div class="row row--sb mb-3">' +
      '<div class="hint">' + jml(l.length, '1 laporan', '{n} laporan') + '</div>' +
      '<button class="btn btn--sm" data-act="ph-aduan">＋ ' +
        T('Laporan baru') + '</button>' +
    '</div>' +

    (l.length
      ? '<div class="ph-l">' + l.map(barisAduan).join('') + '</div>'
      : UI.empty('📣', T('Belum ada laporan'),
          T('Bila ada yang kurang di ruangan Anda, laporkan di sini.')));
  }

  function barisAduan(x) {
    var a = MCS.areaSatu(x.areaId);
    var st = statusAduan(x.status);
    var g = MCS.genting(x.genting);
    var lewat = (x.status === 'baru' || x.status === 'ditugaskan') &&
                x.jatuhTempo < U.nowISO();
    return '<div class="ph-l__i">' +
      '<div class="ph-l__h">' +
        '<span>' + g.ikon + '</span>' +
        '<div style="min-width:0;flex:1">' +
          '<b>' + U.esc(a ? a.nama : '?') + '</b>' +
          '<div class="tbl-sub">' + U.sejak(x.pada) + '</div>' +
        '</div>' +
        '<span class="chip chip--' + st.warna + ' chip--xs">' + T(st.nama) + '</span>' +
      '</div>' +
      (x.teks ? '<p class="ph-l__t">' + U.esc(x.teks) + '</p>' : '') +
      (lewat
        ? '<div class="mcs-warn">⏰ ' + T('sudah lewat batas waktu tanggapan') + '</div>'
        : '') +
      (x.catatanPetugas
        ? '<div class="ph-l__j"><b>' + T('Tanggapan') + ':</b> ' +
          U.esc(x.catatanPetugas) + '</div>'
        : '') +
    '</div>';
  }

  function mountKomplain(root) {
    U.delegate(root, {
      'ph-aduan': function (el) { dialogAduan(el.getAttribute('data-id')); }
    });
  }

  /* =============================================================== NILAI */

  function renderNilai() {
    var area = PENGHUNI.areaSaya();
    if (!area.length) return kosongTanpaRuangan();
    var l = PENGHUNI.penilaianSaya();

    return UI.alert('info',
      '<b>' + T('Yang Anda nilai adalah RUANGAN, bukan orangnya.') + '</b> ' +
      T('Anda melihat hasilnya; Anda tidak melihat berapa menit ruangan ini ' +
        'dijatah, apakah bahannya habis, atau apa yang terjadi sebelum ' +
        'petugas datang. Karena itu penilaian Anda dipakai menemukan ruangan ' +
        'yang perlu perhatian — bukan untuk menghukum seseorang.'), '⭐') +
    '<div class="mb-3"></div>' +

    '<div class="ph-g mb-3">' +
      area.map(function (a) {
        var r = PENGHUNI.rataArea(a.id);
        var k = PENGHUNI.keadaanArea(a.id);
        return '<div class="ph-k">' +
          '<div class="ph-k__h">' +
            '<span class="ph-k__i">' + MCS.jenisArea(a.jenis).ikon + '</span>' +
            '<div><b>' + U.esc(a.nama) + '</b>' +
              '<div class="tbl-sub">' +
                (r.cukup ? selPuas(r.rata) + ' · ' + jml(r.n, '1 penilaian', '{n} penilaian')
                         : T('belum cukup penilaian untuk dirata-rata')) +
              '</div></div>' +
          '</div>' +
          '<div class="ph-k__a">' +
            '<button class="btn btn--sm' +
              (k.belumDinilai ? ' btn--primary' : ' btn--ghost') +
              '" data-act="ph-nilai" data-id="' + a.id + '">⭐ ' +
              T('Nilai hari ini') + '</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +

    UI.card({ title: T('Penilaian Anda'), flush: true,
      body: l.length
        ? UI.table([
            { h: T('Tanggal'), r: function (x) { return U.tgl(x.tgl); } },
            { h: T('Ruangan'), r: function (x) {
              var a = MCS.areaSatu(x.areaId);
              return U.esc(a ? a.nama : '?'); } },
            { h: T('Penilaian'), r: function (x) {
              var t = tingkat(x.skor);
              return t.ikon + ' ' + T(t.nama); } },
            { h: T('Catatan'), r: function (x) {
              return x.catatan
                ? '<span class="tbl-sub">' + U.esc(x.catatan) + '</span>' : '—'; } }
          ], l)
        : UI.empty('⭐', T('Belum ada penilaian'),
            T('Nilai ruangan Anda setelah dibersihkan.')) });
  }

  function mountNilai(root) {
    U.delegate(root, {
      'ph-nilai': function (el) { dialogNilai(el.getAttribute('data-id')); }
    });
  }

  /* ============================================================= DIALOG */

  /* Foto yang sedang dilampirkan. Ditahan di modul karena UI.formModal
     membongkar modalnya sebelum janjinya selesai. */
  var phFoto = [];

  function dialogAduan(areaId) {
    var area = PENGHUNI.areaSaya();
    if (!area.length) return;
    phFoto = [];
    UI.formModal({
      title: T('Laporkan yang kurang'),
      okText: T('Kirim laporan'),
      fields: [
        { name: 'areaId', label: T('Ruangan'), type: 'select',
          value: areaId || area[0].id,
          options: area.map(function (a) {
            return { value: a.id, label: a.nama }; }) },
        { name: 'genting', label: T('Seberapa mendesak'), type: 'select',
          value: 'biasa',
          options: MCS.GENTING.map(function (g) {
            return { value: g.kode, label: g.ikon + '  ' + T(g.nama) }; }),
          hint: T('Ini menentukan batas waktu tanggapan. Menandai semuanya ' +
            'mendesak membuat yang sungguh mendesak tidak lagi menonjol.') },
        { name: 'teks', label: T('Apa yang kurang?'), type: 'textarea', rows: 4,
          placeholder: T('mis. Lantai dekat pintu masuk masih ada bekas oli ' +
            'sejak kemarin.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = PENGHUNI.kirimAduan(d.areaId, {
        genting: d.genting, teks: d.teks, foto: phFoto
      });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Laporan terkirim'), 'ok');
      APP.refresh();
    });
  }

  function dialogNilai(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a || !PENGHUNI.punyaArea(areaId)) return;
    var tgl = U.today();
    var sudah = PENGHUNI.sudahMenilai(areaId, tgl);

    UI.modal({
      title: T('Seberapa bersih ruangan ini?'),
      sub: U.esc(a.nama) + ' · ' + U.tgl(tgl),
      body:
        (sudah
          ? UI.alert('info',
              T('Anda sudah menilai ruangan ini hari ini. Menilai lagi akan ' +
                'mengganti penilaian sebelumnya, bukan menambahkannya.'), 'ℹ️') +
            '<div class="mb-3"></div>'
          : '') +
        '<div class="ph-n">' +
          TINGKAT.map(function (t) {
            return '<label class="ph-n__i">' +
              '<input type="radio" name="ph-skor" value="' + t.skor + '">' +
              '<div>' +
                '<b>' + t.ikon + ' ' + T(t.nama) + '</b>' +
                '<div class="tbl-sub">' + T(t.ket) + '</div>' +
              '</div>' +
            '</label>';
          }).join('') +
        '</div>' +
        '<div class="field mt-3"><label>' + T('Catatan (opsional)') + '</label>' +
          '<textarea class="textarea" id="ph-catatan" rows="2" placeholder="' +
            T('yang paling perlu diperbaiki menurut Anda') + '"></textarea></div>' +
        '<div class="hint">' +
          T('Penilaian ini melekat pada RUANGAN dan tanggalnya, bukan pada ' +
            'nama petugas. Ia dipakai melihat ruangan mana yang jadwalnya ' +
            'perlu ditambah.') + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="ph-simpan-nilai" data-id="' + areaId +
              '">' + T('Kirim penilaian') + '</button>',
      actions: {
        'ph-simpan-nilai': function (el) {
          var root = el.closest('.modal');
          var pilih = root.querySelector('[name="ph-skor"]:checked');
          if (!pilih) { UI.toast(T('Pilih tingkat kepuasannya dulu.'), 'err'); return; }
          var cat = root.querySelector('#ph-catatan');
          var r = PENGHUNI.nilai(el.getAttribute('data-id'), {
            skor: Number(pilih.value), catatan: cat ? cat.value : ''
          });
          if (r.error) { UI.toast(r.error, 'err'); return; }
          var m = el.closest('.modal-back'); if (m) m.remove();
          UI.toast(r.diperbarui ? T('Penilaian diperbarui') : T('Terima kasih'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* =============================================================== HALAMAN */

  var pages = {
    phBeranda: { label: 'Ruangan Saya', icon: '🚪', grup: 'Utama',
      sub: 'Kapan terakhir dibersihkan, dan apa yang sedang dikerjakan',
      render: renderBeranda, mount: mountBeranda,
      badge: function () {
        if (!APP.user) return 0;
        return PENGHUNI.areaSaya().filter(function (a) {
          return PENGHUNI.keadaanArea(a.id).belumDinilai;
        }).length;
      } },
    phKomplain: { label: 'Laporan Saya', icon: '📣', grup: 'Utama',
      sub: 'Yang Anda laporkan dan bagaimana tanggapannya',
      render: renderKomplain, mount: mountKomplain,
      badge: function () {
        if (!APP.user) return 0;
        return PENGHUNI.aduanSaya().filter(function (x) {
          return x.status !== 'selesai' && x.status !== 'ditutup';
        }).length;
      } },
    phNilai: { label: 'Penilaian', icon: '⭐', grup: 'Utama',
      sub: 'Seberapa bersih ruangan Anda',
      render: renderNilai, mount: mountNilai }
  };

  return { pages: pages, TINGKAT: TINGKAT, tingkat: tingkat };
})();
