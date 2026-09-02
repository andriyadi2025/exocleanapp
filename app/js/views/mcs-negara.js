/* ==========================================================================
   mcs-negara.js — layar "Negara yang Dilayani"
   --------------------------------------------------------------------------
   APA YANG DIATUR

   Negara mana saja yang muncul di kolom Negara pada SETIAP formulir alamat —
   pendaftaran korporat, profil perusahaan, gedung, dan alamat staf. Daftar
   rujukannya memuat 107 negara; menyodorkan semuanya kepada perusahaan yang
   bekerja di Jabodetabek berarti membuat orang menggulir melewati Albania
   untuk sampai ke Indonesia.

   SETELAN PEMASANGAN, BUKAN SETELAN KORPORAT

   Ini milik seluruh pemasangan, bukan milik satu korporat: alamat diisi di
   banyak layar oleh banyak peran, dan daftar yang berbeda-beda per korporat
   akan membuat alamat yang sama tampil berbeda tergantung siapa yang membuka.
   Karena itu layarnya ada di sisi admin.

   YANG TIDAK BOLEH TERJADI

   Negara yang SUDAH TERPAKAI pada sebuah alamat harus tetap bisa dipilih
   ketika alamat itu dibuka, walau tidak lagi dilayani. Aturan itu dijaga di
   WILAYAH.daftarNegara(), bukan di sini — supaya tetap berlaku dari mana pun
   formulir alamat dipanggil, bukan hanya dari layar ini.
   ========================================================================== */
var ViewMCSNegara = (function () {
  'use strict';

  /* Pembantu diambil dari VMCS, mengikuti berkas layar MCS lainnya:
     delegasi() tinggal DI DALAM mcs-inti.js dan bukan global — memanggilnya
     begitu saja akan mati dengan ReferenceError saat layar dibuka, dan
     pemeriksa sintaks tidak akan menyuarakan apa pun. */
  var T = VMCS.T,
      delegasi = VMCS.delegasi;

  /* Pilihan yang sedang disunting, belum disimpan. null = belum disentuh,
     jadi tampilkan apa yang tersimpan. */
  var draf = null;
  var cari = '';

  function terpilih() {
    return draf ? draf.slice() : WILAYAH.dilayani();
  }

  function berubah() {
    if (!draf) return false;
    var a = draf.slice().sort().join(',');
    var b = WILAYAH.dilayani().slice().sort().join(',');
    return a !== b;
  }

  function render() {
    var pilih = terpilih();
    var semua = WILAYAH.semuaNegara();
    var q = cari.trim().toLowerCase();
    var tampil = q
      ? semua.filter(function (n) {
          return n.nama.toLowerCase().indexOf(q) >= 0 || n.kode.toLowerCase() === q;
        })
      : semua;

    /* Yang terpilih naik ke atas: setelah daftarnya disaring, orang perlu
       melihat apa yang sudah ia centang tanpa menggulir mencarinya. */
    var atas = tampil.filter(function (n) { return pilih.indexOf(n.kode) >= 0; });
    var bawah = tampil.filter(function (n) { return pilih.indexOf(n.kode) < 0; });

    function kartu(n) {
      var aktif = pilih.indexOf(n.kode) >= 0;
      return '<button class="chip' + (aktif ? ' chip--brand' : ' chip--muted') + '" ' +
        'data-act="ng-alih" data-kode="' + U.esc(n.kode) + '" ' +
        'style="margin:0 6px 6px 0">' +
        n.bendera + ' ' + U.esc(n.nama) +
        (WILAYAH.punyaData(n.kode)
          ? ' <span title="' + U.esc(T('Punya data provinsi/kota')) + '">•</span>'
          : '') +
        '</button>';
    }

    return UI.alert('info',
        '<b>' + T('Yang tampil di kolom Negara pada setiap formulir alamat.') + '</b> ' +
        T('Setelan ini berlaku untuk seluruh pemasangan, bukan per korporat — ' +
          'alamat diisi di banyak layar oleh banyak peran, dan daftar yang ' +
          'berbeda-beda akan membuat alamat yang sama tampil berbeda tergantung ' +
          'siapa yang membukanya.'), '🌏') +
      '<div class="mb-3"></div>' +

      UI.alert('warn',
        '<b>' + T('Alamat yang sudah ada tidak ikut berubah.') + '</b> ' +
        T('Negara yang sudah tersimpan pada sebuah alamat tetap bisa dipilih ' +
          'ketika alamat itu dibuka, walau tidak lagi ada di daftar ini. ' +
          'Membatasi daftar tidak pernah mengganti data yang sudah tertulis.'), '🔒') +
      '<div class="mb-3"></div>' +

      UI.card({
        title: T('Negara yang dilayani'),
        sub: pilih.length + ' ' + T('dipilih') + ' — ' +
          T('titik • berarti negara itu punya data provinsi/kota; sisanya diketik manual'),
        body:
          '<div class="row between mb-3" style="gap:8px;flex-wrap:wrap">' +
            '<input class="inp" id="ng-cari" placeholder="' +
              U.esc(T('Cari negara…')) + '" value="' + U.esc(cari) + '" ' +
              'style="max-width:260px">' +
            '<div class="row" style="gap:6px">' +
              '<button class="btn btn--ghost" data-act="ng-asean">' +
                T('Pilih ASEAN') + '</button>' +
              '<button class="btn btn--ghost" data-act="ng-berdata">' +
                T('Semua yang berdata') + '</button>' +
              '<button class="btn btn--ghost" data-act="ng-kosong">' +
                T('Kosongkan') + '</button>' +
            '</div>' +
          '</div>' +

          (pilih.length === 0
            ? UI.alert('warn', T('Belum ada satu pun yang dipilih. Bila disimpan ' +
                'seperti ini, daftar kembali ke bawaan (ASEAN) — kolom negara ' +
                'tidak boleh kosong, karena alamat menjadi tidak bisa diisi ' +
                'sama sekali.'), '⚠️') + '<div class="mb-3"></div>'
            : '') +

          '<div>' + atas.map(kartu).join('') + '</div>' +
          (atas.length && bawah.length
            ? '<div class="tbl-sub" style="margin:14px 0 8px">' +
              T('Belum dipilih') + '</div>' : '') +
          '<div>' + bawah.map(kartu).join('') + '</div>' +
          (tampil.length === 0
            ? UI.empty('🔍', T('Tidak ada negara yang cocok'), '') : '') +

          '<div class="row between mt-3" style="gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn--ghost" data-act="ng-bawaan">' +
              T('Kembalikan ke bawaan (ASEAN)') + '</button>' +
            '<div class="row" style="gap:6px">' +
              (berubah()
                ? '<button class="btn btn--ghost" data-act="ng-batal">' +
                  T('Batal') + '</button>' : '') +
              '<button class="btn" data-act="ng-simpan"' +
                (berubah() ? '' : ' disabled') + '>' +
                T('Simpan') + '</button>' +
            '</div>' +
          '</div>'
      });
  }

  function mount(root) {
    /* Kolom cari memakai addEventListener langsung, bukan delegasi: ia harus
       bereaksi tiap ketikan, dan delegasi di sini sudah dipakai untuk klik. */
    var inp = root.querySelector('#ng-cari');
    if (inp) {
      inp.addEventListener('input', function () {
        cari = inp.value;
        APP.refresh();
        /* Fokus dan posisi kursor dikembalikan: tanpa ini, mengetik huruf
           kedua mustahil karena kolomnya digambar ulang dan kehilangan fokus. */
        var baru = document.getElementById('ng-cari');
        if (baru) { baru.focus(); baru.setSelectionRange(baru.value.length, baru.value.length); }
      });
    }

    delegasi(root, {
      'ng-alih': function (el) {
        var k = el.getAttribute('data-kode');
        var d = terpilih();
        var i = d.indexOf(k);
        if (i >= 0) d.splice(i, 1); else d.push(k);
        draf = d;
        APP.refresh();
      },
      'ng-asean': function () { draf = WILAYAH.BAWAAN_DILAYANI.slice(); APP.refresh(); },
      'ng-berdata': function () {
        draf = WILAYAH.semuaNegara().filter(function (n) { return WILAYAH.punyaData(n.kode); })
          .map(function (n) { return n.kode; });
        APP.refresh();
      },
      'ng-kosong': function () { draf = []; APP.refresh(); },
      'ng-batal': function () { draf = null; cari = ''; APP.refresh(); },
      'ng-bawaan': function () {
        WILAYAH.simpanDilayani([]);
        draf = null; cari = '';
        UI.toast(T('Dikembalikan ke bawaan (ASEAN)'), 'ok');
        APP.refresh();
      },
      'ng-simpan': function () {
        var hasil = WILAYAH.simpanDilayani(terpilih());
        draf = null;
        UI.toast(T('Tersimpan') + ' — ' + hasil.length + ' ' + T('negara'), 'ok');
        APP.refresh();
      }
    });
  }

  /* Sisi admin: setelan pemasangan, bukan setelan korporat. */
  VMCS.daftar('admin', 'mcsNegara', {
    label: 'Negara yang Dilayani', icon: '🌏', grup: 'Master Data',
    sub: 'Pilihan negara di setiap formulir alamat',
    render: render, mount: mount
  });

  return { render: render, mount: mount };
})();
