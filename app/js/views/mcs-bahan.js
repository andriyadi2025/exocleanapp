/* ==========================================================================
   views/mcs-bahan.js — Bahan habis pakai dan penerimaan barang
   --------------------------------------------------------------------------
   Persediaan. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  var T = VMCS.T,
      akar = VMCS.akar,
      ambilFoto = VMCS.ambilFoto,
      angka = VMCS.angka,
      baris = VMCS.baris,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      denganPin = VMCS.denganPin,
      dialogImpor = VMCS.dialogImpor,
      jml = VMCS.jml,
      korp = VMCS.korp,
      kotakFoto = VMCS.kotakFoto,
      pasangAksiFoto = VMCS.pasangAksiFoto,
      tombol = VMCS.tombol;

  function cetakDaftarStok() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Daftar Persediaan'),
      sub: T('Saldo pada saat pencetakan'),
      baris: MCS.stok(k.id),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Barang'), r: function (x) { return x.nama; } },
        { h: T('Satuan'), r: function (x) { return x.satuan; } },
        { h: T('Saldo aplikasi'), num: true, r: function (x) { return U.num(x.saldo); } },
        { h: T('Minimum'), num: true, r: function (x) { return U.num(x.minimum); } },
        { h: T('Keadaan'), r: function (x) {
          return T({ habis: 'habis', menipis: 'menipis', aman: 'aman' }[x.keadaan]); } },
        { h: T('Perlu dibeli'), num: true, r: function (x) {
          var kurang = x.minimum - x.saldo;
          return kurang > 0 ? U.num(kurang) : ''; } },
        { h: T('Hitungan fisik'), r: function () { return ''; } }
      ],
      kaki: T('Kolom hitungan fisik diisi saat opname gudang, lalu dibandingkan ' +
        'dengan saldo aplikasi. Selisihnya dicatat sebagai penyesuaian, bukan ' +
        'ditimpa diam-diam.')
    });
  }

  /* Rentang yang sedang dilihat. Di luar render supaya bertahan saat
     halamannya digambar ulang. */
  var rbBulan = 1;
  var rbLokasi = '';   /* '' = seluruh korporat */

  /**
   * Rencana belanja — daftar yang bisa dibawa ke rapat anggaran.
   *
   * Kebutuhan tiap barang sudah lama dihitung, tetapi hanya per baris pada
   * daftar stok. Yang memutuskan belanja harus membuka dua ratus baris satu
   * per satu lalu menjumlahkan sendiri di kertas — dan yang dijumlahkan di
   * kertas tidak pernah diperiksa ulang.
   *
   * DASAR TIAP BARIS DISEBUT. Barang yang angkanya datang dari pemakaian
   * sungguhan dan barang yang angkanya datang dari label kemasan tidak sama
   * kuat, dan yang menyetujui anggaran berhak tahu yang mana.
   */
  function kartuBelanja(k) {
    var r = MCS.rencanaBelanja(k.id, { bulan: rbBulan, lokasiId: rbLokasi });
    if (!r.baris.length && !r.takTerukur.length) return '';

    var tab = UI.tabs([{ key: '1', label: T('1 bulan') },
                       { key: '2', label: T('2 bulan') },
                       { key: '3', label: T('3 bulan') }],
                      String(rbBulan), 'rb-bulan');

    /* PEMILIH GUDANG. Yang menandatangani surat pesanan adalah kepala
       gudangnya, bukan korporat: daftar se-korporat berguna untuk anggaran
       tahunan dan tidak berguna sama sekali untuk orang yang harus memesan
       minggu ini. Delapan puluh tujuh cabang berarti delapan puluh tujuh
       surat pesanan yang berbeda. */
    var lok = LOKASI.semua(k.id).filter(function (l) { return l.aktif !== false; });
    var pilihGudang = lok.length > 1
      ? '<select class="select" data-change="rb-lokasi" style="max-width:260px">' +
          '<option value=""' + (rbLokasi ? '' : ' selected') + '>' +
            U.esc(T('Seluruh korporat') + ' (' + lok.length + ' ' + T('gudang') + ')') +
          '</option>' +
          lok.map(function (l) {
            return '<option value="' + U.esc(l.id) + '"' +
              (rbLokasi === l.id ? ' selected' : '') + '>' + U.esc(l.nama) + '</option>';
          }).join('') +
        '</select>'
      : '';

    var isi = r.baris.length
      ? UI.table([
          { h: T('Barang'), r: function (x) {
            return '<div class="tbl-title">' + U.esc(x.nama) + '</div>' +
              '<div class="tbl-sub">' + T('sisa') + ' ' + U.num(x.saldo) + ' ' +
              U.esc(x.satuan) +
              (x.hariLagi !== null ? ' · ' + T('cukup') + ' ' +
                U.num(Math.round(x.hariLagi)) + ' ' + T('hari') : '') + '</div>'; },
            v: function (x) { return x.nama; } },
          { h: T('Dasar'), r: function (x) {
            /* Dua kekuatan yang berbeda, ditandai berbeda. */
            return x.dasar === 'pakai'
              ? '<span class="chip chip--ok chip--xs">' + T('pemakaian nyata') + '</span>'
              : '<span class="chip chip--muted chip--xs">' + T('takaran label') + '</span>'; },
            v: function (x) { return x.dasar; } },
          { h: T('Perlu/bulan'), cls: 'num', r: function (x) {
            return U.num(x.laju) + ' ' + U.esc(x.satuan); },
            v: function (x) { return x.laju; } },
          { h: T('Usul beli'), cls: 'num', r: function (x) {
            return '<b>' + U.num(x.usul) + '</b> ' + U.esc(x.satuan); },
            v: function (x) { return x.usul; } },
          { h: T('Perkiraan biaya'), cls: 'num', r: function (x) {
            return x.harga ? U.rp(x.biaya)
              : '<span class="mcs-warn">' + T('harga belum diisi') + '</span>'; },
            v: function (x) { return x.biaya; } }
        ], r.baris, null, { sumber: {
          teks: T('Dihitung dari luas yang dibersihkan sebulan dibagi cakupan tiap ' +
            'barang, atau dari pemakaian sungguhan bila sudah ada riwayatnya.') +
            ' ' + (rbLokasi
              ? T('Hanya gudang') + ': ' + ((LOKASI.satu(rbLokasi) || {}).nama || '')
              : T('Mencakup SELURUH cabang dalam lingkup Anda.')),
          /* TANPA tautan: daftar bahannya ada tepat di bawah kartu ini,
             di halaman yang sama. Tautan yang menunjuk ke halaman yang
             sedang dibuka hanya membuat orang mengira kliknya rusak. */
        } })
      : '<div class="tbl-sub">' + T('Semua barang yang bisa diperkirakan masih cukup.') + '</div>';

    return UI.card({ cls: 'mb-3', title: T('Rencana belanja'),
      sub: T('Berapa yang perlu dibeli agar cukup sampai akhir rentang, ' +
        'termasuk menjaga batas minimum di rak'),
      tools: pilihGudang + tab,
      body: isi +
        (r.baris.length
          ? '<div class="row between wrap mt-3" style="gap:8px">' +
              '<div class="tbl-sub">' +
                jml(r.cukup, T('1 barang lain masih cukup'), T('{n} barang lain masih cukup')) +
              '</div>' +
              '<div><b>' + T('Total') + ': ' + U.rp(r.totalBiaya) + '</b>' +
                (r.tanpaHarga
                  ? ' <span class="mcs-warn">· ' +
                    jml(r.tanpaHarga, T('1 barang belum berharga — total ini terlalu kecil'),
                      T('{n} barang belum berharga — total ini terlalu kecil')) + '</span>'
                  : '') +
              '</div>' +
            '</div>'
          : '') +
        /* YANG TIDAK BISA DIPERKIRAKAN DISEBUT NAMANYA. Daftar belanja yang
           diam-diam melewatkan tujuh belas barang akan dipercaya sebagai
           daftar yang lengkap — dan kekurangannya baru ketahuan di gudang,
           pada hari barangnya habis. */
        (r.takTerukur.length
          ? '<div class="mt-3">' + UI.alert('info',
              '<b>' + jml(r.takTerukur.length,
                T('1 barang belum bisa diperkirakan.'),
                T('{n} barang belum bisa diperkirakan.')) + '</b> ' +
              U.esc(r.takTerukur.slice(0, 8).map(function (x) { return x.nama; }).join(', ')) +
              (r.takTerukur.length > 8 ? '…' : '') + ' — ' +
              T('belum ada takaran/cakupan dan belum pernah ada riwayat keluar. ' +
                'Pilih jenis bahannya saat menyunting barang untuk mengisi takaran ' +
                'rekomendasi.'), '📐') + '</div>'
          : '') });
  }

  function renderStok() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var l = MCS.stok(k.id);
    var st = MCS.statistikStok(k.id);

    /* LINGKUP SALDO DISEBUT, tidak dibiarkan ditebak.

       Bagi pengguna yang cabangnya dibatasi, angka di bawah bisa berarti
       dua hal yang sangat berbeda: jumlah gudang cabangnya sendiri, atau
       jumlah seluruh korporat. Yang menentukan bukan perannya melainkan
       apakah korporatnya sudah memisahkan stok per gudang — dan pengguna
       tidak punya cara menebaknya. Saldo yang tidak menyebut lingkupnya
       akan selalu dibaca sebagai milik sendiri, dan kepala cabang yang
       mengira punya 840 liter tidak akan memesan apa pun. */
    var dibatasi = window.MCSAKSES && MCSAKSES.lokasiUser();
    /* Dihitung per BARIS, bukan dari baris pertama. Sejak lingkup saldo
       ditentukan per barang, satu tabel bisa memuat keduanya sekaligus:
       barang yang sudah ditempatkan menunjukkan angka cabang, yang belum
       masih menunjukkan angka korporat. Membaca baris pertama saja akan
       memberi keterangan yang benar untuk satu baris dan salah untuk
       tujuh belas lainnya. */
    var nKorporat = l.filter(function (x) { return x.lingkupSaldo === 'korporat'; }).length;
    var belumTempat = l.reduce(function (a, x) { return a + (x.belumDitempatkan || 0); }, 0);

    return UI.alert('info',
      '<b>' + T('Jadwal sebagus apa pun tidak menolong petugas yang datang tanpa bahan.') + '</b> ' +
      T('Saldo dihitung dari riwayat keluar-masuk, bukan diketik langsung — jadi angkanya ' +
        'selalu bisa ditelusuri.'), '🧴') + '<div class="mb-3"></div>' +

      (dibatasi && nKorporat
        ? UI.alert('warn',
            '<b>' + jml(nKorporat,
              T('1 barang di bawah ini masih menunjukkan angka SELURUH korporat, bukan cabang Anda.'),
              T('{n} barang di bawah ini masih menunjukkan angka SELURUH korporat, bukan cabang Anda.')) +
            '</b> ' +
            T('Barang itu belum pernah dicatat berada di gudang mana pun — selama itu, tidak ' +
              'ada satu pun angka per cabang yang bisa dihitung untuknya. Catat penempatannya ' +
              'lewat Penerimaan Barang atau Pindah Gudang supaya saldo cabang mulai berarti.'),
            '🏢') + '<div class="mb-3"></div>'
        : '') +

      (dibatasi && belumTempat
        ? UI.alert('info',
            '<b>' + T('Selebihnya milik cabang Anda.') + '</b> ' +
            jml(belumTempat, T('Ada 1 satuan bahan yang belum tercatat di gudang mana pun.'),
              T('Ada {n} satuan bahan yang belum tercatat di gudang mana pun.')) + ' ' +
            T('Jumlah itu belum menjadi milik cabang mana pun sampai ada yang menempatkannya.'),
            '🏢') + '<div class="mb-3"></div>'
        : '') +

      /* Kedaluwarsa disebut SEBELUM kehabisan. Yang kehabisan bisa dibeli
         hari itu juga; yang kedaluwarsa sudah tidak bisa diapa-apakan. */
      (function () {
        var kd = kartuKedaluwarsa(k.id, true);
        return kd ? kd + '<div class="mb-3"></div>' : '';
      })() +

      kartuBelanja(k) +

      (st.perluDibeli.length
        ? UI.alert(st.habis ? 'danger' : 'warn',
            '<b>' + (st.habis
              ? jml(st.habis, T('1 barang HABIS'), T('{n} barang HABIS'))
              : jml(st.menipis, T('1 barang menipis'), T('{n} barang menipis'))) + '.</b> ' +
            U.esc(st.perluDibeli.slice(0, 6).map(function (x) { return x.nama; }).join(', ')) +
            (st.perluDibeli.length > 6 ? '…' : ''), '🛒') + '<div class="mb-3"></div>'
        : '') +

      /* Enam tombol pada satu baris meluber di layar sempit — terlihat saat
         diuji pada lebar 800 px, tombol terakhir terpotong separuh. Dibungkus
         supaya melipat, dan yang jarang dipakai boleh turun ke baris kedua. */
      '<div class="row between wrap mb-3" style="gap:8px">' +
        '<div class="hint">' + jml(st.jenis, T('1 jenis barang'), T('{n} jenis barang')) + '</div>' +
        '<div class="row wrap" style="gap:8px">' +
          '<button class="btn btn--ghost" data-act="sk-terima">📥 ' +
            T('Terima barang') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-ambil">🧹 ' +
            T('Ambil untuk troli') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-massal">📦 ' +
            T('Catat sekaligus') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-opname">📋 ' +
            T('Opname') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-perkiraan">📊 ' +
            T('Perkiraan & pemakaian') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-impor">📥 ' + T('Impor CSV') + '</button>' +
          '<button class="btn btn--ghost" data-act="sk-cetak">🖨️ ' + T('Cetak opname') + '</button>' +
          '<button class="btn btn--primary" data-act="sk-baru">＋ ' + T('Tambah Barang') + '</button>' +
        '</div>' +
      '</div>' +

      (l.length
        ? '<div class="sk-list">' + l.map(barisStok).join('') + '</div>'
        : UI.empty('🧴', T('Belum ada barang'),
            T('Daftarkan tisu, sabun, chemical, dan kantong sampah yang dipakai petugas.')));
  }

  /* ================================================ perkiraan & pemakaian
     Dua pertanyaan yang selalu ditanyakan bersamaan, jadi dijawab pada satu
     layar: berapa yang harus dibeli bulan depan, dan apakah pemakaian
     sekarang wajar.

     Keduanya berdiri di atas angka yang sama, dan angka itu PERKIRAAN.
     Karena itu layar ini menyebut sumber tiap barisnya — 'riwayat' bila
     dihitung dari pemakaian sungguhan, 'label' bila belum ada riwayatnya —
     alih-alih memampangkan satu kolom rupiah yang terlihat sama pastinya
     untuk keduanya. */

  /* ================================================= pindah antar gudang
     Sejak multi-lokasi ada, stok tidak lagi berada di satu tempat. Tanpa
     perpindahan, satu-satunya cara memindahkan barang dari gudang pusat ke
     gudang gedung adalah mencatatnya keluar di satu sisi dan masuk di sisi
     lain — dan itu menghasilkan pemakaian palsu di gudang asal, yang
     langsung mencemari penanda boros dan perkiraan belanja. */

  function dialogPindah(id) {
    var x = MCS.stokSatu(id);
    if (!x) return;
    var k = korp();
    var lok = window.LOKASI ? LOKASI.semua(k.id) : [];
    if (!lok.length) {
      UI.toast(T('Belum ada lokasi terdaftar. Daftarkan lokasi dulu di halaman Lokasi.'), 'err');
      return;
    }
    var per = MCS.saldoPerLokasi(x.id);
    /* Asal hanya menawarkan gudang yang MEMANG BERISI. Menawarkan gudang
       kosong sebagai asal berarti mengundang galat yang sudah bisa dicegah
       sebelum diketik. */
    var asal = Object.keys(per).filter(function (lid) { return per[lid] > 0; })
      .map(function (lid) {
      return { value: lid, label: (lid ? LOKASI.nama(lid) : T('belum ditempatkan')) +
        '  ·  ' + U.num(per[lid]) + ' ' + x.satuan };
    });
    if (!asal.length) { UI.toast(T('Stoknya kosong.'), 'err'); return; }

    UI.formModal({
      title: T('Pindah antar gudang'),
      sub: x.nama + ' · ' + T('total') + ' ' + U.num(MCS.saldoStok(x.id)) + ' ' + x.satuan,
      okText: T('Pindahkan'),
      fields: [
        { name: 'dari', label: T('Dari gudang'), type: 'select',
          value: asal[0].value, options: asal },
        { name: 'ke', label: T('Ke gudang'), type: 'select', value: lok[0].id,
          options: lok.map(function (l) { return { value: l.id, label: l.nama }; }) },
        { name: 'jumlah', label: T('Jumlah') + ' (' + x.satuan + ')', type: 'number',
          min: 1, value: 1, required: true },
        { name: 'catatan', label: T('Catatan'), value: '',
          placeholder: T('mis. dikirim dengan mobil operasional') },
        { type: 'html', html: '<div class="hint">' +
            T('Saldo total tidak berubah — memindahkan barang bukan memakainya. ' +
              'Dicatat sebagai dua mutasi yang saling menunjuk, supaya riwayat ' +
              'kedua gudang sama-sama utuh.') + '</div>' }
      ],
      validate: function (d) {
        if ((d.dari || '') === (d.ke || '')) return T('Gudang asal dan tujuan sama.');
        var n = Math.round(Number(d.jumlah) || 0);
        if (n <= 0) return T('Isi jumlah lebih dari nol.');
        var ada = MCS.saldoDiLokasi(x.id, d.dari || null);
        if (n > ada) {
          return T('Di gudang itu hanya ada {n} {satuan}.')
            .replace('{n}', ada).replace('{satuan}', x.satuan);
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var r = MCS.pindahStok(x.id, d.dari || null, d.ke, d.jumlah, d.catatan, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      DB.save(true);
      UI.toast(T('Dipindahkan.'), 'ok');
      APP.refresh();
    });
  }

  /* ============================================== ambil barang ke troli
     Lapis pertama dari tiga, dan yang paling menentukan: inilah satu-satunya
     peristiwa pemakaian yang punya ANGKA SUNGGUHAN, dihitung manusia, sekali
     sehari. Selama ini belum tercatat, sehingga perkiraan kebutuhan selalu
     jatuh ke “dari label” dan penanda boros/irit membandingkan perkiraan
     dengan perkiraan.

     Dibuat SECEPAT MUNGKIN diisi: satu petugas, satu lembar, satu ketukan.
     Yang lambat tidak akan diisi, dan yang tidak diisi tidak mengukur apa
     pun. */

  var abTahan = {};

  var abTutup = null;

  function dialogAmbil(pekerjaIdAwal) {
    var k = korp();
    if (!k) return;
    var l = MCS.stok(k.id).filter(function (x) { return x.saldo > 0; });
    if (!l.length) { UI.toast(T('Tidak ada barang bersaldo di gudang.'), 'err'); return; }
    var pk = MCS.pekerja(k.id);
    abTahan = {};
    var lok = window.LOKASI ? LOKASI.semua(k.id) : [];

    UI.modal({
      title: T('Ambil barang untuk troli'), size: 'wide',
      sub: T('Yang keluar dari gudang hari ini'),
      body:
        '<div class="grid g-2 mb-3">' +
          '<div class="field"><label>' + T('Diambil oleh') + '</label>' +
            '<select class="input" id="ab-pekerja">' +
              '<option value="">— ' + T('tidak disebut') + ' —</option>' +
              pk.map(function (p) {
                return '<option value="' + p.id + '"' +
                  (p.id === pekerjaIdAwal ? ' selected' : '') + '>' +
                  U.esc(p.nama) + '</option>';
              }).join('') +
            '</select>' +
            '<div class="hint">' +
              T('Tanpa nama, pemakaiannya tetap terhitung — tetapi tidak bisa ' +
                'dibandingkan antar petugas, dan perbandingan itulah yang paling ' +
                'sering menemukan sebabnya.') + '</div></div>' +
          (lok.length > 1
            ? '<div class="field"><label>' + T('Dari gudang') + '</label>' +
                '<select class="input" id="ab-lokasi">' +
                  lok.map(function (x) {
                    return '<option value="' + x.id + '">' + U.esc(x.nama) + '</option>';
                  }).join('') + '</select></div>'
            : '') +
        '</div>' +
        '<div class="op-t">' +
          '<div class="op-h">' +
            '<span>' + T('Barang') + '</span>' +
            '<span class="num">' + T('Saldo') + '</span>' +
            '<span class="num">' + T('Diambil') + '</span>' +
            '<span class="num">' + T('Sisa di gudang') + '</span>' +
          '</div>' +
          l.map(function (x) {
            return '<div class="op-r">' +
              '<span><b>' + U.esc(x.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(x.satuan) + '</div></span>' +
              '<span class="num">' + U.num(x.saldo) + '</span>' +
              '<span class="num"><input class="input op-i" type="number" min="0" ' +
                'data-ab="' + x.id + '" placeholder="—"></span>' +
              '<span class="num op-d" id="ab-d-' + x.id + '"></span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="field mt-3"><label>' + T('Untuk area (opsional)') + '</label>' +
          '<select class="input" id="ab-area">' +
            '<option value="">— ' + T('rute hari ini, tidak satu area') + ' —</option>' +
            MCS.area(k.id).map(function (a) {
              return '<option value="' + a.id + '">' + U.esc(a.nama) + '</option>';
            }).join('') + '</select>' +
          '<div class="hint">' +
            T('Biarkan kosong bila barangnya dibawa berkeliling. Biaya bahannya ' +
              'lalu muncul sebagai “belum teralokasi” pada halaman Biaya — itu ' +
              'jujur, dan lebih baik daripada menempelkannya ke satu area yang ' +
              'kebetulan disebut.') + '</div></div>' +
        '<div id="ab-ring" class="tbl-sub"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="ab-simpan">' + T('Catat pengambilan') + '</button>',
      onMount: function (root, tutup) {
        abTutup = tutup;
        var lokEl = document.getElementById('ab-lokasi');
        if (lokEl) lokEl.addEventListener('change', function () { hitungAmbil(root); });
        Array.prototype.forEach.call(root.querySelectorAll('[data-ab]'), function (el) {
          el.addEventListener('input', function () { hitungAmbil(root); });
        });
        hitungAmbil(root);
      },
      actions: { 'ab-simpan': function () { simpanAmbil(); } }
    });
  }

  function hitungAmbil(root) {
    var lokEl = document.getElementById('ab-lokasi');
    var n = 0, tolak = 0, nilai = 0;
    abTahan = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-ab]'), function (el) {
      var id = el.getAttribute('data-ab');
      var kotak = document.getElementById('ab-d-' + id);
      if (el.value === '' || !Number(el.value)) { if (kotak) kotak.innerHTML = ''; return; }
      var j = Math.max(0, Math.round(Number(el.value) || 0));
      var saldo = lokEl ? MCS.saldoDiLokasi(id, lokEl.value || null) : MCS.saldoStok(id);
      var sisa = saldo - j;
      n++; abTahan[id] = j;
      var x = MCS.stokSatu(id);
      nilai += j * ((x && Number(x.harga)) || 0);
      if (sisa < 0) tolak++;
      if (kotak) {
        kotak.innerHTML = sisa < 0
          ? '<b class="op-k">' + U.num(sisa) + '</b>'
          : U.num(sisa);
      }
    });
    var r = document.getElementById('ab-ring');
    if (!r) return;
    r.innerHTML = !n
      ? T('Belum ada yang diisi.')
      : jml(n, T('1 barang diambil'), T('{n} barang diambil')) +
        (nilai ? ' · ' + U.rp(nilai) : '') +
        (tolak ? ' · <b class="mcs-warn">' +
          jml(tolak, T('1 baris melebihi saldo gudang'), T('{n} baris melebihi saldo gudang')) +
          '</b>' : '');
  }

  function simpanAmbil() {
    var k = korp();
    var pkEl = document.getElementById('ab-pekerja');
    var lokEl = document.getElementById('ab-lokasi');
    var arEl = document.getElementById('ab-area');
    var baris = Object.keys(abTahan).map(function (id) {
      return { stokId: id, jumlah: abTahan[id] };
    });
    var r = MCS.ambilBarang(k.id, (pkEl && pkEl.value) || null, baris, {
      lokasiId: (lokEl && lokEl.value) || null,
      areaId: (arEl && arEl.value) || null
    }, APP.user);
    if (r.error) { UI.toast(r.error, 'err'); return; }
    DB.save(true);
    if (r.gagal.length) {
      UI.toast(jml(r.berhasil, '1 tercatat', '{n} tercatat') + ' · ' +
        jml(r.gagal.length, T('1 gagal'), T('{n} gagal')) + ': ' + r.gagal[0], 'err');
      APP.refresh();
      return;
    }
    if (abTutup) { abTutup(); abTutup = null; }
    UI.toast(jml(r.berhasil, T('1 barang dicatat keluar'), T('{n} barang dicatat keluar')), 'ok');
    APP.refresh();
  }

  /* ================================================== catat sekaligus
     Satu kiriman pemasok berisi dua belas jenis barang. Mencatatnya satu
     per satu berarti dua belas dialog: buka, isi, simpan, tutup, ulangi —
     dan pada dialog kedelapan orang mulai menaksir angkanya supaya cepat
     selesai.

     Satu jenis untuk seluruh lembar, bukan per baris. Satu kiriman adalah
     satu peristiwa; mencampur barang masuk dan barang rusak dalam satu
     lembar berarti satu catatan yang menerangkan dua hal berbeda. */

  var msTahan = {};

  var msTutup = null;

  function dialogMassal() {
    var k = korp();
    if (!k) return;
    var l = MCS.stok(k.id);
    if (!l.length) { UI.toast(T('Belum ada barang.'), 'err'); return; }
    msTahan = {};
    UI.modal({
      title: T('Catat sekaligus'), size: 'wide',
      sub: T('Isi hanya barang yang berubah'),
      body:
        '<div class="grid g-2 mb-3">' +
          '<div class="field"><label>' + T('Jenis') + '</label>' +
            '<select class="input" id="ms-jenis">' +
              MCS.JENIS_MUTASI.filter(function (j) { return j.arah !== 0; })
                .map(function (j) {
                  return '<option value="' + j.kode + '">' + j.ikon + '  ' +
                    U.esc(T(j.nama)) + '</option>';
                }).join('') +
            '</select></div>' +
          (function () {
            /* Tanpa ini, satu lembar berisi dua belas barang keluar akan
               mengambil semuanya dari keranjang “belum ditempatkan” — dan
               keranjang itu biasanya kosong. */
            var lok = window.LOKASI ? LOKASI.semua(k.id) : [];
            if (lok.length < 2) return '';
            return '<div class="field"><label>' + T('Gudang') + '</label>' +
              '<select class="input" id="ms-lokasi">' +
                lok.map(function (l) {
                  return '<option value="' + l.id + '">' + U.esc(l.nama) + '</option>';
                }).join('') +
              '</select></div>';
          })() +
          '<div class="field"><label>' + T('Untuk area (opsional)') + '</label>' +
            '<select class="input" id="ms-area">' +
              '<option value="">— ' + T('tidak spesifik') + ' —</option>' +
              MCS.area(k.id).map(function (a) {
                return '<option value="' + a.id + '">' + U.esc(a.nama) + '</option>';
              }).join('') +
            '</select></div>' +
        '</div>' +
        '<div class="op-t">' +
          '<div class="op-h">' +
            '<span>' + T('Barang') + '</span>' +
            '<span class="num">' + T('Saldo') + '</span>' +
            '<span class="num">' + T('Jumlah') + '</span>' +
            '<span class="num">' + T('Menjadi') + '</span>' +
          '</div>' +
          l.map(function (x) {
            return '<div class="op-r">' +
              '<span><b>' + U.esc(x.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(x.satuan) + '</div></span>' +
              '<span class="num">' + U.num(x.saldo) + '</span>' +
              '<span class="num"><input class="input op-i" type="number" min="0" ' +
                'data-ms="' + x.id + '" data-saldo="' + x.saldo + '" ' +
                'placeholder="—"></span>' +
              '<span class="num op-d" id="ms-d-' + x.id + '"></span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="field mt-3"><label>' + T('Catatan') + '</label>' +
          '<input class="input" id="ms-catatan" ' +
            'placeholder="' + T('mis. kiriman pemasok 12 Agustus') + '"></div>' +
        '<div id="ms-ring" class="tbl-sub"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="ms-simpan">' + T('Catat semuanya') + '</button>',
      onMount: function (root, tutup) {
        msTutup = tutup;
        var sel = document.getElementById('ms-jenis');
        if (sel) sel.addEventListener('change', function () { hitungMassal(root); });
        var lokSel = document.getElementById('ms-lokasi');
        if (lokSel) lokSel.addEventListener('change', function () { hitungMassal(root); });
        Array.prototype.forEach.call(root.querySelectorAll('[data-ms]'), function (el) {
          el.addEventListener('input', function () { hitungMassal(root); });
        });
        hitungMassal(root);
      },
      actions: { 'ms-simpan': function () { simpanMassal(); } }
    });
  }

  /* Saldo SESUDAH diperlihatkan saat mengetik, dan yang akan jadi minus
     ditandai merah sebelum disimpan — bukan ditolak satu per satu setelah
     tombol ditekan, ketika sepuluh baris lain sudah terlanjur masuk. */

  function hitungMassal(root) {
    var sel = document.getElementById('ms-jenis');
    var jn = MCS.jenisMutasi(sel ? sel.value : 'masuk');
    var arah = jn.arah > 0 ? 1 : -1;
    var n = 0, tolak = 0;
    msTahan = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-ms]'), function (el) {
      var id = el.getAttribute('data-ms');
      var lokEl = document.getElementById('ms-lokasi');
      /* Saldo yang dibandingkan adalah saldo GUDANG YANG DIPILIH, bukan
         totalnya — kalau tidak, baris yang akan ditolak tidak tampak merah. */
      var saldo = lokEl
        ? MCS.saldoDiLokasi(id, lokEl.value || null)
        : (Number(el.getAttribute('data-saldo')) || 0);
      var kotak = document.getElementById('ms-d-' + id);
      if (el.value === '' || !Number(el.value)) { if (kotak) kotak.innerHTML = ''; return; }
      var j = Math.max(0, Math.round(Number(el.value) || 0));
      var jadi = saldo + arah * j;
      n++;
      msTahan[id] = j;
      if (jadi < 0) tolak++;
      if (kotak) {
        kotak.innerHTML = jadi < 0
          ? '<b class="op-k">' + U.num(jadi) + '</b>'
          : U.num(jadi);
      }
    });
    var r = document.getElementById('ms-ring');
    if (!r) return;
    r.innerHTML = !n
      ? T('Belum ada yang diisi.')
      : jml(n, T('1 barang akan dicatat'), T('{n} barang akan dicatat')) +
        (tolak
          ? ' · <b class="mcs-warn">' +
            jml(tolak, T('1 baris membuat saldo minus dan akan ditolak'),
                T('{n} baris membuat saldo minus dan akan ditolak')) + '</b>'
          : '');
  }

  function simpanMassal() {
    var k = korp();
    var sel = document.getElementById('ms-jenis');
    var kode = sel ? sel.value : 'masuk';
    var jn = MCS.jenisMutasi(kode);
    var arah = jn.arah > 0 ? 1 : -1;
    var areaEl = document.getElementById('ms-area');
    var lokEl = document.getElementById('ms-lokasi');
    var catEl = document.getElementById('ms-catatan');
    var area = jn.hilang ? null : ((areaEl && areaEl.value) || null);
    var cat = catEl ? catEl.value : '';
    var ids = Object.keys(msTahan);
    if (!ids.length) { UI.toast(T('Belum ada yang diisi.'), 'err'); return; }

    var berhasil = 0, gagal = [];
    ids.forEach(function (id) {
      var r = MCS.catatMutasi(id, arah * msTahan[id], kode, cat, APP.user, area,
        { lokasiId: (lokEl && lokEl.value) || null });
      if (r.error) {
        var x = MCS.stokSatu(id);
        gagal.push((x ? x.nama : id) + ': ' + r.error);
        return;
      }
      berhasil++;
    });
    DB.save(true);

    /* Yang gagal DISEBUT namanya, dan dialognya TIDAK ditutup bila ada yang
       gagal — supaya yang mengisi bisa membetulkan barisnya, bukan mengulang
       seluruh lembar dari awal. */
    if (gagal.length) {
      UI.toast(jml(berhasil, '1 tercatat', '{n} tercatat') + ' · ' +
        jml(gagal.length, T('1 gagal'), T('{n} gagal')) + ': ' + gagal[0], 'err');
      APP.refresh();
      return;
    }
    if (msTutup) { msTutup(); msTutup = null; }
    UI.toast(jml(berhasil, T('1 barang tercatat'), T('{n} barang tercatat')), 'ok');
    APP.refresh();
  }

  /* ======================================================= opname gudang
     Alurnya sebelumnya buntu: tombol “Cetak opname” mencetak lembar hitung
     lengkap dengan kolom kosong, dan catatan kakinya menjanjikan bahwa
     selisihnya akan dicatat sebagai penyesuaian — padahal tidak ada tempat
     untuk mencatatnya. Cetak, hitung, lalu tidak ada lanjutannya.

     Layar ini menutup alur itu. */

  var opTahan = {};

  function dialogOpname() {
    var k = korp();
    if (!k) return;
    var lembar = MCS.lembarOpname(k.id);
    if (!lembar.length) {
      UI.toast(T('Belum ada barang untuk dihitung.'), 'err');
      return;
    }
    opTahan = {};
    UI.modal({
      title: T('Opname gudang'), size: 'wide',
      sub: T('Isi hitungan fisik — yang dikosongkan berarti belum dihitung'),
      body:
        UI.alert('info',
          T('Saldo aplikasi TIDAK ditimpa. Selisihnya dicatat sebagai mutasi ' +
            'penyesuaian, sehingga setahun kemudian masih bisa dijawab mengapa ' +
            'stoknya berubah pada hari ini. Barang yang kolomnya dibiarkan kosong ' +
            'dilewati — opname separuh gudang adalah hal biasa, dan menganggap ' +
            'sisanya nol akan menghapus stok yang sebenarnya utuh.'), '📋') +
        '<div class="mb-3"></div>' +
        '<div class="op-t">' +
          '<div class="op-h">' +
            '<span>' + T('Barang') + '</span>' +
            '<span class="num">' + T('Saldo aplikasi') + '</span>' +
            '<span class="num">' + T('Hitungan fisik') + '</span>' +
            '<span class="num">' + T('Selisih') + '</span>' +
          '</div>' +
          lembar.map(function (b) {
            return '<div class="op-r" data-s="' + b.stokId + '">' +
              '<span><b>' + U.esc(b.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(b.satuan) +
                  (b.harga ? ' · ' + U.rp(b.harga) : '') + '</div></span>' +
              '<span class="num">' + U.num(b.sistem) + '</span>' +
              '<span class="num"><input class="input op-i" type="number" min="0" ' +
                'data-op="' + b.stokId + '" data-sistem="' + b.sistem + '" ' +
                'placeholder="—"></span>' +
              '<span class="num op-d" id="op-d-' + b.stokId + '"></span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="field mt-3"><label>' + T('Keterangan') + '</label>' +
          '<textarea class="textarea" id="op-catatan" rows="2" ' +
            'placeholder="' + T('mis. opname bulanan, dihitung bersama Pak Budi') +
            '"></textarea>' +
          '<div class="hint">' + T('Wajib bila ada selisih. Selisih tanpa keterangan ' +
            'akan ditanyakan lagi bulan depan, dan tidak ada yang ingat jawabannya.') +
          '</div></div>' +
        '<div id="op-ring" class="mt-2"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn btn--ghost" data-act="op-cetak">🖨️ ' +
          T('Cetak lembar hitung') + '</button>' +
        '<button class="btn" data-act="op-simpan">' + T('Simpan opname') + '</button>',
      onMount: function (root, tutup) {
        opTutup = tutup;
        Array.prototype.forEach.call(root.querySelectorAll('[data-op]'), function (el) {
          el.addEventListener('input', function () { hitungOpname(root); });
        });
        hitungOpname(root);
      },
      actions: {
        'op-cetak': function () { cetakDaftarStok(); },
        'op-simpan': function () { simpanOpname(); }
      }
    });
  }

  var opTutup = null;

  /* Selisih diperlihatkan SAAT MENGETIK, per baris dan sebagai jumlah.
     Salah ketik satu angka nol pada opname berarti dua ratus botol lenyap
     dari catatan, dan itu hanya ketahuan bila angkanya terlihat saat itu
     juga — bukan setelah disimpan. */

  function hitungOpname(root) {
    var terisi = 0, selisih = 0, nilai = 0;
    opTahan = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-op]'), function (el) {
      var id = el.getAttribute('data-op');
      var sistem = Number(el.getAttribute('data-sistem')) || 0;
      var kotak = document.getElementById('op-d-' + id);
      if (el.value === '') {
        if (kotak) kotak.innerHTML = '';
        return;
      }
      terisi++;
      opTahan[id] = el.value;
      var d = Math.max(0, Math.round(Number(el.value) || 0)) - sistem;
      if (d) selisih++;
      if (kotak) {
        kotak.innerHTML = d === 0
          ? '<span class="tbl-sub">✓</span>'
          : '<b class="' + (d < 0 ? 'op-k' : 'op-l') + '">' +
            (d > 0 ? '+' : '−') + U.num(Math.abs(d)) + '</b>';
      }
    });
    var r = document.getElementById('op-ring');
    if (!r) return;
    r.innerHTML = terisi
      ? '<div class="tbl-sub">' +
          jml(terisi, T('1 barang dihitung'), T('{n} barang dihitung')) +
          (selisih ? ' · <b class="mcs-warn">' +
            jml(selisih, '1 selisih', '{n} selisih') + '</b>'
                   : ' · ' + T('semuanya cocok')) +
        '</div>'
      : '<div class="tbl-sub">' + T('Belum ada yang diisi.') + '</div>';
  }

  function simpanOpname() {
    denganPin({
      judul: T('PIN untuk menyimpan opname'),
      sub: T('Opname menyesuaikan saldo gudang menurut hitungan fisik Anda.')
    }, teruskanOpname);
  }

  function teruskanOpname() {
    var k = korp();
    var cat = document.getElementById('op-catatan');
    var baris = Object.keys(opTahan).map(function (id) {
      return { stokId: id, fisik: opTahan[id] };
    });
    var r = MCS.simpanOpname(k.id, {
      baris: baris, catatan: cat ? cat.value : ''
    }, APP.user);
    if (r.error) { UI.toast(r.error, 'err'); return; }
    if (opTutup) { opTutup(); opTutup = null; }
    var o = r.opname;
    UI.toast(jml(o.jmlBarang, T('1 barang dihitung'), T('{n} barang dihitung')) +
      (o.jmlSelisih
        ? ' · ' + jml(o.jmlSelisih, '1 selisih dicatat', '{n} selisih dicatat')
        : ' · ' + T('semuanya cocok')), 'ok');
    APP.refresh();
  }

  function dialogPerkiraan() {
    var k = korp();
    if (!k) return;
    var h = MCS.perkiraan(k.id);
    UI.modal({
      title: T('Perkiraan kebutuhan bulan depan'), size: 'wide',
      sub: T('Termasuk cadangan') + ' ' + Math.round(h.cadangan * 100) + '%',
      body: isiPerkiraan(h),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="pk-cetak">🖨️ ' + T('Cetak daftar belanja') + '</button>',
      actions: { 'pk-cetak': function () { cetakPerkiraan(); } }
    });
  }

  function isiPerkiraan(h) {
    if (!h.baris.length) {
      return UI.empty('📊', T('Belum ada barang'),
        T('Daftarkan bahan habis pakai lebih dulu, lalu perkiraannya muncul di sini.'));
    }
    return '<div class="grid g-3 mb-3">' +
        UI.stat({ label: T('Perlu dibeli'), value: U.num(h.perluDibeli), icon: '🛒',
          meta: jml(h.baris.length, T('dari 1 barang'), T('dari {n} barang')) }) +
        UI.stat({ label: T('Perkiraan belanja'), value: U.rpShort(h.totalBelanja),
          icon: '💰', meta: T('bulan depan') }) +
        UI.stat({ label: T('Pemakaian menyimpang'), value: U.num(h.boros.length + h.irit.length),
          icon: '⚖️',
          meta: h.boros.length ? jml(h.boros.length, '1 boros', '{n} boros') : T('tidak ada') }) +
      '</div>' +

      /* Batas ketelitiannya disebut DI ATAS tabel, bukan di catatan kaki.
         Yang membaca daftar belanja akan langsung menyalin angkanya ke
         pesanan; peringatan di bawah tabel dibaca sesudah pesanan dikirim. */
      UI.alert('info',
        '<b>' + T('Angka ini perkiraan, bukan jatah.') + '</b> ' +
        T('Barang yang sudah punya riwayat pemakaian dihitung dari pemakaian ' +
          'sungguhan; yang belum, dihitung dari luas yang dibersihkan dibagi ' +
          'cakupan kemasan. Kolom “dasar” menyebut yang mana untuk tiap ' +
          'barisnya. Memakainya sebagai jatah per petugas akan membuat orang ' +
          'mengencerkan pembersih supaya angkanya cocok.'), '📏') +
      '<div class="mb-2"></div>' +

      ((h.tanpaHarga || h.tanpaCakupan)
        ? UI.alert('warn',
            (h.tanpaHarga
              ? '<b>' + jml(h.tanpaHarga, T('1 barang belum punya harga'),
                  T('{n} barang belum punya harga')) + '.</b> ' +
                T('Nilai belanjanya tidak ikut terhitung. ')
              : '') +
            (h.tanpaCakupan
              ? '<b>' + jml(h.tanpaCakupan, T('1 barang belum punya cakupan m²'),
                  T('{n} barang belum punya cakupan m²')) + '.</b> ' +
                T('Selama belum ada riwayat pemakaiannya, kebutuhannya tidak bisa ' +
                  'diperkirakan sama sekali.')
              : ''), '🏷️') + '<div class="mb-2"></div>'
        : '') +

      kartuPemakaianPetugas() +
      UI.table([
        { h: T('Barang'), r: function (x) {
          return '<b>' + U.esc(x.stok.nama) + '</b>' +
            '<div class="tbl-sub">' +
              (x.seluruhArea
                ? T('seluruh area')
                : ((x.jenisObjek && x.jenisObjek.length)
                    /* Barang berlingkup objek disebut lewat OBJEKNYA, bukan
                       lewat daftar area — itulah yang menentukan hitungannya. */
                    ? U.esc(x.jenisObjek.map(function (kk) {
                        return T(MCS.jenisObjek(kk).nama); }).join(', '))
                    : (x.areaDipakai.length
                        ? U.esc(x.areaDipakai.slice(0, 3).join(', ')) +
                          (x.areaDipakai.length > 3 ? '…' : '')
                        /* Belum terukur sehingga daftar areanya kosong — yang
                           disebut lalu JENISNYA, bukan dibiarkan hampa.
                           Baris tanpa keterangan lingkup terbaca seolah
                           barangnya berlaku di mana-mana. */
                        : U.esc((x.jenisArea || []).map(function (kk) {
                            return T(MCS.jenisArea(kk).nama); }).join(', '))))) +
            '</div>'; } },
        { h: T('Stok'), cls: 'num', r: function (x) {
          return U.num(x.saldo) + ' ' + U.esc(x.stok.satuan) +
            (x.hariLagi !== null
              ? '<div class="tbl-sub">' + (x.hariLagi < 60
                  ? jml(Math.round(x.hariLagi), '1 hari lagi', '{n} hari lagi')
                  : jml(Math.round(x.hariLagi / 30.4), '1 bulan lagi', '{n} bulan lagi')) +
                '</div>'
              : ''); } },
        { h: T('Perlu/bulan'), cls: 'num', r: function (x) {
          if (x.dasar === null) return '<span class="tbl-sub">—</span>';
          return U.num(x.dasar) +
            '<div class="tbl-sub">' +
              (x.sumber === 'riwayat' ? T('dari riwayat') : T('dari label')) + '</div>'; } },
        { h: T('Beli'), cls: 'num', r: function (x) {
          if (x.kurang === null) return '<span class="tbl-sub">—</span>';
          return x.kurang
            ? '<b>' + U.num(x.kurang) + '</b> ' + U.esc(x.stok.satuan)
            /* 'cukup' sudah terpetakan menjadi 'lasts' di kamus untuk konteks
               lain, dan 'lasts' pada kolom Beli tidak berarti apa-apa. */
            : '<span class="tbl-sub">' + T('stok cukup') + '</span>'; } },
        { h: T('Nilai belanja'), cls: 'num', r: function (x) {
          return x.biaya ? U.rpShort(x.biaya)
            : (x.kurang && !x.stok.harga
                ? '<span class="mcs-warn">' + T('tanpa harga') + '</span>'
                : '<span class="tbl-sub">—</span>'); } },
        { h: T('Pemakaian'), cls: 'num', r: function (x) {
          if (x.rasio === null) return '<span class="tbl-sub">—</span>';
          var kelas = x.rasio >= 1.5 ? 'danger' : (x.rasio <= 0.5 ? 'warn' : 'ok');
          var kata = x.rasio >= 1.5 ? T('boros')
                   : (x.rasio <= 0.5 ? T('jauh di bawah') : T('wajar'));
          return '<span class="chip chip--' + kelas + ' chip--xs">' +
            U.num(x.rasio) + '× ' + kata + '</span>'; } }
      ], h.baris) +

      /* “Jauh di bawah”, bukan “irit”. Pemakaian setengah dari perkiraan
         label bisa berarti hemat — dan bisa berarti pekerjaannya tidak
         dikerjakan, atau barang keluar tanpa dicatat. Menamainya “irit”
         memilih satu di antara tiga kemungkinan tanpa dasar. */
      '<div class="tbl-sub mt-2">' +
        T('“Jauh di bawah” belum tentu hemat. Ia juga muncul ketika pekerjaan ' +
          'tidak dikerjakan, atau ketika barang keluar tanpa dicatat mutasinya. ' +
          'Ketiganya perlu dilihat manusia, dan tidak bisa dibedakan dari angka.') +
      '</div>';
  }

  /**
   * Pemakaian bahan per petugas — lensa yang baru ada setelah pengambilan
   * gudang tercatat atas nama orang.
   *
   * Yang dicari BUKAN siapa yang paling banyak memakai: petugas yang memegang
   * dua lantai memang memakai dua kali lipat. Yang dicari adalah SELISIH antar
   * petugas yang pekerjaannya sebanding — dan karena itu angka rupiahnya
   * disajikan bersama jumlah tugas selesai, tidak pernah sendirian.
   */

  function kartuPemakaianPetugas() {
    var k = korp();
    var l = MCS.pemakaianPetugas(k.id, 30);
    if (!l.length) {
      return UI.alert('info',
        T('Belum ada pengambilan barang yang tercatat atas nama petugas. Pakai ' +
          '“Ambil untuk troli” saat barang keluar dari gudang — dari situlah ' +
          'perbandingan antar petugas bisa dibuat, dan tanpa itu penanda ' +
          'boros/irit hanya membandingkan perkiraan dengan perkiraan.'),
        '🧹') + '<div class="mb-2"></div>';
    }
    /* Tugas selesai per petugas, supaya rupiahnya punya pembanding. */
    var d = new Date();
    var per = KPI.periodeBulan(d.getFullYear(), d.getMonth() + 1);
    var tugas = {};
    MCS.pekerja(k.id).forEach(function (p) { tugas[p.id] = 0; });
    var dd = new Date(per.dari + 'T00:00:00'), akhir = new Date(per.sampai + 'T00:00:00');
    while (dd <= akhir) {
      MCS.tugasHari(k.id, U.iso(dd)).forEach(function (t) {
        if (t.status !== 'selesai') return;
        var rec = MCS.catatanSlot(t.jadwalId, t.tgl, t.jam);
        var pid = (rec && rec.pekerjaId) || (t.pekerja && t.pekerja.id);
        if (pid) tugas[pid] = (tugas[pid] || 0) + 1;
      });
      dd.setDate(dd.getDate() + 1);
    }
    return UI.card({ cls: 'mb-3', title: T('Pemakaian per petugas'),
      sub: T('Tiga puluh hari terakhir, dari pengambilan gudang'),
      body: UI.table([
        { h: T('Petugas'), r: function (x) { return U.esc(x.nama); } },
        { h: T('Tugas selesai'), cls: 'num', r: function (x) {
          return U.num(tugas[x.pekerjaId] || 0); } },
        { h: T('Nilai bahan'), cls: 'num', r: function (x) {
          return '<b>' + U.rpShort(x.nilai) + '</b>'; } },
        { h: T('Per tugas'), cls: 'num', r: function (x) {
          var n = tugas[x.pekerjaId] || 0;
          return n ? U.rp(Math.round(x.nilai / n))
                   : '<span class="tbl-sub">—</span>'; } }
      ], l) +
      '<div class="tbl-sub mt-2">' +
        T('Kolom terakhir yang paling berguna. Yang memegang dua lantai memang ' +
          'memakai dua kali lipat — yang layak ditanya adalah dua petugas dengan ' +
          'jenis area sebanding yang biaya per tugasnya jauh berbeda.') +
      '</div>' });
  }

  function cetakPerkiraan() {
    var k = korp();
    if (!k) return;
    var h = MCS.perkiraan(k.id);
    /* Hanya yang PERLU DIBELI yang dicetak. Daftar belanja yang memuat
       barang bercukup memaksa yang belanja menyisirnya sendiri, dan yang
       disisir tangan selalu ada yang terlewat. */
    var beli = h.baris.filter(function (x) { return x.kurang; });
    if (!beli.length) { UI.toast(T('Tidak ada yang perlu dibeli bulan depan.'), 'ok'); return; }
    cetakDaftar({
      judul: T('Daftar Belanja Bahan Habis Pakai'),
      sub: T('Perkiraan bulan depan, termasuk cadangan') + ' ' +
        Math.round(h.cadangan * 100) + '%',
      baris: beli,
      kolom: [
        { h: T('Barang'), r: function (x) { return U.esc(x.stok.nama); } },
        { h: T('Satuan'), r: function (x) { return U.esc(x.stok.satuan); } },
        { h: T('Stok kini'), r: function (x) { return U.num(x.saldo); } },
        { h: T('Beli'), r: function (x) { return U.num(x.kurang); } },
        { h: T('Harga'), r: function (x) {
          return x.stok.harga ? U.rp(x.stok.harga) : '—'; } },
        { h: T('Nilai belanja'), r: function (x) { return x.biaya ? U.rp(x.biaya) : '—'; } }
      ],
      kaki: T('Perkiraan belanja') + ': ' + U.rp(h.totalBelanja) +
        (h.tanpaHarga
          ? '  —  ' + jml(h.tanpaHarga, T('1 barang belum punya harga dan tidak ikut dijumlah'),
              T('{n} barang belum punya harga dan tidak ikut dijumlah'))
          : '')
    });
  }

  function barisStok(x) {
    var warna = { habis: 'danger', menipis: 'warn', aman: 'ok' }[x.keadaan];
    var label = { habis: 'habis', menipis: 'menipis', aman: 'aman' }[x.keadaan];
    var foto = (x.foto || [])[0];
    var src = foto ? DB.getPhoto(foto) : null;
    return '<div class="sk-r sk-r--' + x.keadaan + '">' +
      /* Petak foto kecil di kiri nama. Tujuannya mengenali barangnya sekilas
         di rak, bukan membaca labelnya — untuk membaca, fotonya dibuka dari
         formulir Ubah. */
      (src ? '<img class="sk-r__f" src="' + U.esc(src) + '" alt="">' : '') +
      '<div class="sk-r__t">' +
        '<b>' + U.esc(x.nama) + '</b>' +
        '<span>' + T('minimum') + ' ' + U.num(x.minimum) + ' ' + U.esc(x.satuan) +
          (x.cakupanM2
            ? ' · ' + U.num(x.cakupanM2) + ' m²/' + U.esc(x.satuan)
            : '') +
          (x.catatan ? ' · ' + U.esc(x.catatan) : '') + '</span>' +
        /* Sebaran per gudang — hanya bila memang tersebar. Satu gudang tidak
           perlu disebut gudangnya; menyebutnya membuat setiap baris memuat
           keterangan yang sama dan berhenti dibaca. */
        (function () {
          var per = MCS.saldoPerLokasi(x.id);
          var kk = Object.keys(per);
          if (kk.length < 2) return '';
          return '<span class="sk-r__g">' + kk.map(function (id) {
            return '<span class="chip chip--muted chip--xs">' +
              U.esc(id ? (window.LOKASI ? LOKASI.nama(id) : id)
                       : T('belum ditempatkan')) +
              ' ' + U.num(per[id]) + '</span>';
          }).join(' ') + '</span>';
        })() +
        /* Cakupan stok yang ADA SEKARANG — pertanyaan yang benar-benar
           ditanyakan orang gudang bukan "berapa botol" melainkan "cukup
           untuk berapa lama". */
        (function () {
          var c = MCS.cakupan(x.korporatId, x.id);
          if (!c) return '';
          /* Barang yang diukur PER BENDA tidak punya luas, dan mencetak
             ≈ 0 m² untuknya bukan sekadar kosong — ia menyatakan sesuatu
             yang salah. Terlihat di lapangan: Pembersih Toilet dengan 958
             botol di gudang tertulis '≈ 0 m² · 10 bulan lagi', dua angka
             yang saling menyangkal di dalam satu baris. Yang benar untuk
             barang takaran adalah kebutuhannya sendiri: berapa liter
             sebulan. Sisa harinya tetap ditampilkan — itu memang
             pertanyaan yang sama untuk kedua jenis barang. */
          var ukuran = c.cakupanStok > 0
            ? '≈ <b>' + U.num(c.cakupanStok) + ' m²</b>'
            /* SATU kunci utuh, bukan 'liter' + '/' + 'bulan'. Kamus
               menerjemahkan 'bulan' menjadi bentuk jamak 'months', dan
               menyusun frasa dari potongan pernah menghasilkan
               '21.117 m²/months'. Frasa yang dirakit selalu bisa dirakit
               salah di bahasa lain; frasa utuh tidak bisa. */
            : (c.takaranBulanMl > 0
                ? T('{n} liter/bulan').replace('{n}',
                    '<b>' + U.num(Math.round(c.takaranBulanMl / 1000)) + '</b>')
                : '');
          /* Tanpa ukuran DAN tanpa sisa hari tidak ada yang tersisa untuk
             dikatakan. Petak kosong berbingkai lebih buruk daripada tidak
             ada petak sama sekali. */
          if (!ukuran && c.hariLagi === null) return '';
          return '<span class="sk-r__c">' +
            ukuran +
            /* Di bawah enam puluh hari disebut HARI. "Cukup 0,3 bulan" menuntut
               pembacanya berhitung sendiri, dan orang gudang yang sedang
               memutuskan belanja tidak sedang ingin berhitung. */
            (c.hariLagi !== null
              ? (ukuran ? ' · ' : '') + (c.hariLagi < 60
                  ? jml(Math.round(c.hariLagi), '1 hari lagi', '{n} hari lagi')
                  : jml(Math.round(c.hariLagi / 30.4), '1 bulan lagi', '{n} bulan lagi'))
              : '') +
            (c.rasio && (c.rasio >= 1.5 || c.rasio <= 0.5)
              /* Ditandai hanya bila melenceng jauh. Selisih dua puluh persen
                 antara perkiraan label dan kenyataan lapangan adalah hal
                 biasa, dan menandainya membuat tandanya berhenti dibaca. */
              ? ' · <span class="mcs-warn">' + T('pemakaian') + ' ' +
                U.num(c.rasio) + '× ' + T('perkiraan') + '</span>'
              : '') +
          '</span>';
        })() +
      '</div>' +
      '<div class="sk-r__n">' +
        '<b>' + U.num(x.saldo) + '</b><i>' + U.esc(x.satuan) + '</i>' +
      '</div>' +
      '<span class="chip chip--' + warna + '">' + T(label) + '</span>' +
      '<div class="sk-r__b">' +
        '<button class="btn btn--ghost btn--sm" data-act="sk-masuk" data-id="' + x.id + '" ' +
          'title="' + U.esc(T('Barang masuk')) + '">＋</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="sk-keluar" data-id="' + x.id + '" ' +
          'title="' + U.esc(T('Barang dipakai')) + '">−</button>' +
        /* Tombol pindah hanya muncul bila memang ada lebih dari satu lokasi.
           Memindahkan barang antar gudang pada korporat bergudang tunggal
           bukan operasi yang punya arti. */
        (window.LOKASI && LOKASI.semua(x.korporatId).length > 1
          ? '<button class="btn btn--ghost btn--sm" data-act="sk-pindah" data-id="' + x.id + '" ' +
            'title="' + U.esc(T('Pindah antar gudang')) + '">🔀</button>'
          : '') +
        '<button class="btn btn--ghost btn--sm" data-act="sk-riwayat" data-id="' + x.id + '" ' +
          'title="' + U.esc(T('Riwayat')) + '">🧾</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="sk-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="sk-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div>' +
    '</div>';
  }

  /* --------------------------------------------------- isi & cakupan
     "Satu botol berisi 500 ml dan mencakup 50 m² lantai."

     Dua angka, dua guna berbeda. ISI hanya keterangan — supaya yang membeli
     ulang tahu ukuran kemasannya. CAKUPAN yang dipakai berhitung: dari sana
     lahir perkiraan berapa yang habis sebulan, dan perbandingan terhadap
     pemakaian yang sungguh terjadi. */

  var ckTahan = { isiNilai: '', isiSatuan: 'ml', cakupanM2: '' };

  /* ------------------------------------------------ dipakai di area mana
     Perkiraan kebutuhan lahir dari LUAS YANG DIBERSIHKAN dikali frekuensi.
     Kalau penyebutnya seluruh gedung sementara barangnya hanya dipakai di
     toilet, angkanya meleset berlipat — dan yang paling berbahaya bukan
     angka belanjanya, melainkan penanda boros/irit yang ikut terbalik.

     Ditahan di variabel, bukan dibaca dari DOM: UI.formModal membongkar
     modalnya sebelum janjinya selesai. */

  var lgTahan = [];

  var lgObjek = [];

  function ruasLingkup(x) {
    lgTahan = (x && x.jenisArea ? x.jenisArea : []).slice();
    var usul = x ? MCS.lingkupDariRiwayat(x.id) : [];
    /* Usulan hanya ditawarkan bila lingkupnya belum diisi. Menyodorkannya
       di atas pilihan yang sudah dibuat manusia berarti mengajak
       membatalkan keputusan yang mungkin justru lebih tahu. */
    var tawar = (!lgTahan.length && usul.length)
      ? usul.map(function (u) { return u.jenis; })
      : null;

    return '<div class="field"><label>' + T('Dipakai di area') + '</label>' +
      '<div class="lg-b">' +
        '<label class="check"><input type="checkbox" id="lg-semua"' +
          (lgTahan.length ? '' : ' checked') + '> <b>' +
          T('Seluruh area') + '</b></label>' +
        '<div class="lg-g" id="lg-g"' + (lgTahan.length ? '' : ' hidden') + '>' +
          MCS.JENIS_AREA.map(function (j) {
            return '<label class="lg-c"><input type="checkbox" data-lg="' + j.kode + '"' +
              (lgTahan.indexOf(j.kode) >= 0 ? ' checked' : '') + '> ' +
              U.ikon(j.ikon) + ' ' + U.esc(T(j.nama)) + '</label>';
          }).join('') +
        '</div>' +
        (tawar
          ? '<div class="tbl-sub mt-1">' +
              T('Riwayat pemakaian menunjukkan barang ini keluar untuk') + ': <b>' +
              U.esc(usul.map(function (u) { return T(MCS.jenisArea(u.jenis).nama); })
                .join(', ')) + '</b>. ' +
              '<button type="button" class="btn btn--ghost btn--sm" id="lg-usul" ' +
                'data-j="' + U.esc(tawar.join(',')) + '">' + T('Pakai ini') + '</button>' +
            '</div>'
          : '') +
        '<div class="hint">' +
          T('Menentukan luas mana yang dipakai memperkirakan kebutuhan. Biarkan ' +
            '“Seluruh area” untuk pembersih lantai serbaguna. Persempit untuk ' +
            'barang khusus — pembersih toilet yang dihitung terhadap seluruh ' +
            'gedung akan terlihat butuh tiga kali lipat dari yang sebenarnya, dan ' +
            'pemakaian yang boros justru akan ditandai irit.') +
        '</div>' +
        '<div class="tbl-sub mt-1" id="lg-h"></div>' +
      '</div>' +
    '</div>';
  }

  /* Lingkup OBJEK. Lebih tepat daripada lingkup area, dan menggantikannya
     bila diisi — pembersih kaca yang ditautkan ke objek 'kaca' dihitung
     terhadap luas kaca, bukan luas lantai ruangannya. */

  function ruasLingkupObjek(x) {
    lgObjek = (x && x.jenisObjek ? x.jenisObjek : []).slice();
    return '<div class="field"><label>' + T('Membersihkan objek jenis') + '</label>' +
      '<div class="lg-b">' +
        '<div class="lg-g">' +
          MCS.JENIS_OBJEK.map(function (j) {
            return '<label class="lg-c"><input type="checkbox" data-lo="' + j.kode + '"' +
              (lgObjek.indexOf(j.kode) >= 0 ? ' checked' : '') + '> ' +
              U.ikon(j.ikon) + ' ' + U.esc(T(j.nama)) + '</label>';
          }).join('') +
        '</div>' +
        '<div class="hint">' +
          T('Bila diisi, kebutuhan dihitung dari LUAS PERMUKAAN objek yang ' +
            'sebenarnya — jauh lebih tepat daripada luas lantai ruangan. Pembersih ' +
            'kaca yang dihitung terhadap lantai lobi meleset dua kali lipat. ' +
            'Kosongkan untuk pembersih serbaguna yang memang mengikuti luas lantai.') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function tahanLingkupObjek() {
    var out = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-lo]'), function (el) {
        if (el.checked) out.push(el.getAttribute('data-lo'));
      });
    lgObjek = out;
  }

  function tahanLingkup() {
    var semua = document.getElementById('lg-semua');
    if (semua && semua.checked) { lgTahan = []; return; }
    var out = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-lg]'), function (el) {
        if (el.checked) out.push(el.getAttribute('data-lg'));
      });
    lgTahan = out;
  }

  /* Luas yang akan dipakai berhitung, diperlihatkan SAAT MEMILIH.
     Selisih antara 21.117 m² dan 6.257 m² baru terasa nyata ketika kedua
     angkanya terlihat di layar yang sama. */

  function hitungTampilLingkup() {
    var el = document.getElementById('lg-h');
    if (!el) return;
    tahanLingkup();
    var k = korp();
    if (!k || !window.BEBAN) { el.innerHTML = ''; return; }
    var cfg = BEBAN.config(k.id);
    var ikut = 0, semua = 0, nArea = 0;
    MCS.area(k.id).forEach(function (a) {
      var h = BEBAN.hitungArea(a, cfg);
      if (h.jamPerMinggu === null || !h.frekuensi) return;
      var m = (Number(a.luas) || 0) * h.frekuensi * 4.345;
      semua += m;
      if (!lgTahan.length || lgTahan.indexOf(a.jenis) >= 0) { ikut += m; nArea++; }
    });
    if (!semua) { el.innerHTML = ''; return; }
    /* 'per bulan' sebagai satu frasa. T('bulan') sendirian diterjemahkan
       menjadi bentuk jamak di kamus, sehingga terbaca '21.117 m²/months'. */
    el.innerHTML = T('Dihitung terhadap') + ' <b>' + U.num(Math.round(ikut)) +
      ' m² ' + T('per bulan') + '</b> ' + T('dari') + ' ' + U.num(Math.round(semua)) +
      ' m² ' + T('yang dibersihkan') +
      ' · ' + jml(nArea, '1 area', '{n} area');
  }

  function ruasCakupan(x) {
    ckTahan = {
      isiNilai: x && x.isiNilai ? x.isiNilai : '',
      isiSatuan: (x && x.isiSatuan) || 'ml',
      cakupanM2: x && x.cakupanM2 ? x.cakupanM2 : ''
    };
    return '<div class="field"><label>' + T('Isi & cakupan') + '</label>' +
      '<div class="ck-b">' +
        '<div class="ck-g">' +
          '<input class="input" id="ck-isi" type="number" min="0" step="any" ' +
            'value="' + ckTahan.isiNilai + '" placeholder="500">' +
          '<select class="input" id="ck-isi-s">' +
            MCS.SATUAN_ISI.map(function (u) {
              return '<option value="' + u + '"' +
                (u === ckTahan.isiSatuan ? ' selected' : '') + '>' + u + '</option>';
            }).join('') +
          '</select>' +
          '<span class="ck-x">' + T('mencakup') + '</span>' +
          '<input class="input" id="ck-m2" type="number" min="0" step="any" ' +
            'value="' + ckTahan.cakupanM2 + '" placeholder="50">' +
          '<span class="ck-x">m²</span>' +
        '</div>' +
        '<div class="hint">' +
          T('Contoh: satu botol berisi 500 ml dan mencakup 50 m² lantai. Angka ' +
            'cakupan diambil dari label kemasan atau dari pengamatan sendiri — ia ' +
            'PERKIRAAN, karena lantai berminyak menghabiskan pembersih dua kali ' +
            'lebih cepat daripada lantai berdebu.') +
        '</div>' +
        '<div class="tbl-sub mt-1" id="ck-takaran"></div>' +
        '<div class="tbl-sub mt-1" id="ck-h"></div>' +
      '</div>' +
    '</div>';
  }

  /**
   * Isi baris cakupan dari rekomendasi jenisnya.
   *
   * TIDAK MENIMPA angka yang sudah ada. Yang menyunting barang lama sering
   * memilih jenisnya hanya untuk melengkapi data, dan menimpa cakupan yang
   * sudah disesuaikan dari pengamatan sendiri akan membuang pengetahuan
   * yang justru lebih baik daripada rekomendasi mana pun. Kosong diisi;
   * yang sudah berisi dibiarkan.
   */
  function isiRekomendasi(paksa) {
    var sel = document.getElementById('f_jenisBahan');
    var eIsi = document.getElementById('ck-isi');
    var eSat = document.getElementById('ck-isi-s');
    var eM2 = document.getElementById('ck-m2');
    if (!sel || !eIsi || !eM2) return;
    var r = MCS.rekomendasiBahan(sel.value);
    if (r && (paksa || (!eIsi.value && !eM2.value))) {
      if (r.isiNilai) eIsi.value = r.isiNilai;
      if (r.isiSatuan && eSat) eSat.value = r.isiSatuan;
      eM2.value = r.cakupanM2;
      eIsi.setAttribute('data-otomatis', '1');
      eM2.setAttribute('data-otomatis', '1');
    }
    tahanCakupan();
    tampilTakaran();
    hitungTampilCakupan();
  }

  /**
   * Takaran per meter persegi, dihitung dari isi dan cakupan yang SEDANG
   * diketik — bukan dari katalog.
   *
   * Inilah angka yang diminta orang (“berapa untuk satu meter?”), dan
   * memperlihatkannya saat mengisi adalah cara termurah menangkap salah
   * ketik: “satu botol 500 ml untuk 5 m²” terbaca 100 ml/m², dan seratus
   * mililiter untuk satu meter persegi lantai jelas keliru bagi siapa pun
   * yang pernah mengepel.
   */
  function tampilTakaran() {
    var el = document.getElementById('ck-takaran');
    if (!el) return;
    var isi = Number(ckTahan.isiNilai) || 0;
    var m2 = Number(ckTahan.cakupanM2) || 0;
    var sat = ckTahan.isiSatuan;
    var ml = (sat === 'ml' || sat === 'gram') ? isi
           : (sat === 'liter' || sat === 'kg') ? isi * 1000 : 0;
    if (!ml || !m2) { el.innerHTML = ''; return; }
    var per = ml / m2;
    var sel = document.getElementById('f_jenisBahan');
    var r = sel ? MCS.rekomendasiBahan(sel.value) : null;
    var teks = '⚖️ ' + T('Takaran') + ': <b>' +
      (per >= 10 ? Math.round(per) : Math.round(per * 10) / 10) + ' ' +
      (sat === 'gram' || sat === 'kg' ? 'g' : 'ml') + '/m²</b>';
    if (r) {
      /* Selisih terhadap rekomendasi DISEBUT, bukan dilarang. Yang tahu
         lantainya sendiri berhak menyimpang; yang salah ketik perlu melihat
         bahwa ia menyimpang jauh. */
      var x = per / r.takaran;
      if (x >= 2 || x <= 0.5) {
        teks += ' · <span class="mcs-warn">' +
          T('rekomendasi') + ' ' + r.takaran + ' ml/m² — ' +
          (x >= 2 ? T('ini jauh lebih boros') : T('ini jauh lebih irit')) + '</span>';
      } else {
        teks += ' · ' + T('rekomendasi') + ' ' + r.takaran + ' ml/m²';
      }
    }
    el.innerHTML = teks;
  }

  function tahanCakupan() {
    var a = document.getElementById('ck-isi');
    var b = document.getElementById('ck-isi-s');
    var c = document.getElementById('ck-m2');
    ckTahan = {
      isiNilai: a && a.value !== '' ? Number(a.value) : '',
      isiSatuan: b ? b.value : 'ml',
      cakupanM2: c && c.value !== '' ? Number(c.value) : ''
    };
  }

  /* Angka yang muncul saat mengetik. Diperlihatkan SAAT MENGISI, bukan setelah
     disimpan: "satu botol untuk 5 m²" pada pembersih lantai adalah salah ketik
     yang hanya ketahuan bila angkanya terlihat pada saat itu juga. */

  function hitungTampilCakupan() {
    var el = document.getElementById('ck-h');
    if (!el) return;
    tahanCakupan();
    var m2 = Number(ckTahan.cakupanM2) || 0;
    if (!m2) { el.innerHTML = ''; return; }
    var isi = Number(ckTahan.isiNilai) || 0;
    var sat = (document.querySelector('[name="satuan"]') || {}).value || T('satuan');
    var harga = Number((document.querySelector('[name="hargaBeli"]') ||
                        document.querySelector('[name="harga"]') || {}).value) || 0;
    var bag = ['1 ' + U.esc(sat) + ' → <b>' + U.num(m2) + ' m²</b>'];
    if (isi) bag.push(U.num(Math.round(isi / m2 * 100) / 100) + ' ' +
      U.esc(ckTahan.isiSatuan) + '/m²');
    if (harga) bag.push('<b>' + U.rp(Math.round(harga / m2)) + '</b>/m²');
    el.innerHTML = bag.join(' · ');
  }

  function dialogStok(id) {
    var k = korp();
    var x = id ? MCS.stokSatu(id) : null;
    UI.formModal({
      title: x ? T('Ubah barang') : T('Barang baru'), okText: T('Simpan'),
      onMount: function (root) {
        pasangAksiFoto(root);
        /* Ketiganya saling bergantung — harga per m² berubah ketika harga
           maupun cakupannya diketik. */
        /* Saklar “Seluruh area” membuka dan menutup daftar jenisnya. */
        var sem = document.getElementById('lg-semua');
        var grid = document.getElementById('lg-g');
        if (sem && grid) {
          sem.addEventListener('change', function () {
            grid.hidden = sem.checked;
            hitungTampilLingkup();
          });
        }
        Array.prototype.forEach.call(
          root.querySelectorAll('[data-lg]'), function (el) {
            el.addEventListener('change', function () {
              /* Mencentang satu jenis berarti bukan seluruh area lagi. */
              if (sem && el.checked) { sem.checked = false; grid.hidden = false; }
              hitungTampilLingkup();
            });
          });
        var bU = document.getElementById('lg-usul');
        if (bU) {
          bU.addEventListener('click', function () {
            var j = (bU.getAttribute('data-j') || '').split(',');
            if (sem) { sem.checked = false; }
            if (grid) grid.hidden = false;
            Array.prototype.forEach.call(
              root.querySelectorAll('[data-lg]'), function (el) {
                el.checked = j.indexOf(el.getAttribute('data-lg')) >= 0;
              });
            hitungTampilLingkup();
          });
        }
        Array.prototype.forEach.call(
          root.querySelectorAll('[data-lo]'), function (el) {
            el.addEventListener('change', function () {
              tahanLingkupObjek(); hitungTampilLingkup();
            });
          });
        hitungTampilLingkup();
        ['ck-isi', 'ck-isi-s', 'ck-m2'].forEach(function (id) {
          var e = document.getElementById(id);
          if (e) {
            e.addEventListener('input', hitungTampilCakupan);
            e.addEventListener('change', hitungTampilCakupan);
            /* Takaran per m² ikut hidup saat mengetik — itulah angka yang
               menangkap salah ketik pada saat terjadi, bukan sesudah. */
            e.addEventListener('input', function () { tahanCakupan(); tampilTakaran(); });
            e.addEventListener('change', function () { tahanCakupan(); tampilTakaran(); });
            /* Diketik sendiri = bukan angka otomatis lagi. */
            e.addEventListener('input', function () { e.removeAttribute('data-otomatis'); });
          }
        });
        /* Memilih jenis MEMAKSA isi ulang: itu memang maksud memilihnya.
           Saat dialog baru dibuka, yang kosong saja yang diisi. */
        var jb = root.querySelector('[name="jenisBahan"]');
        if (jb) jb.addEventListener('change', function () { isiRekomendasi(true); });
        isiRekomendasi(false);
        ['harga', 'satuan'].forEach(function (n) {
          var e = root.querySelector('[name="' + n + '"]');
          if (e) { e.addEventListener('input', hitungTampilCakupan);
                   e.addEventListener('change', hitungTampilCakupan); }
        });
        hitungTampilCakupan();
      },
      fields: [
        { type: 'html', html: kotakFoto('stok', x ? x.foto : [], {
            label: T('Foto barang'), maks: 2,
            /* Dua cukup: label depan dan label belakang. Lebih dari itu hanya
               memakan tempat pada barang yang bentuknya memang seragam. */
            maxSide: 700, quality: 0.62,
            hint: T('Foto label kemasannya. Yang membeli ulang sering bukan orang ' +
              'yang memakainya, dan “sabun cair” ada dua puluh macam di rak yang ' +
              'sama — foto label menghentikan salah beli yang berulang.') }) },
        { name: 'nama', label: T('Nama barang'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Tisu gulung, Sabun cair, Kantong sampah 60L') },
        { name: 'satuan', label: T('Satuan'), type: 'select', value: x ? x.satuan : 'pcs',
          options: MCS.SATUAN },
        { name: 'minimum', label: T('Batas minimum'), type: 'number',
          value: x ? x.minimum : 0,
          hint: T('Di bawah angka ini barangnya ditandai menipis.') },
        { type: 'html', html: ruasLingkup(x) },
        { type: 'html', html: ruasLingkupObjek(x) },
        /* JENIS BAHAN mendahului baris cakupan, karena dialah yang mengisinya.
           Ditaruh persis di atasnya supaya hubungan sebab-akibatnya terlihat:
           memilih di sini mengubah angka di bawahnya, di depan mata. */
        { name: 'jenisBahan', label: T('Jenis bahan'), type: 'select',
          value: x ? (x.jenisBahan || '') : '',
          options: [{ value: '', label: T('— pilih untuk mengisi takaran —') }]
            .concat(MCS.JENIS_BAHAN.map(function (j) {
              return { value: j.kode, label: j.ikon + '  ' + T(j.nama) +
                (j.takaran ? '  ·  ' + j.takaran + ' ml/m²' : '') };
            })),
          hint: T('Memilih jenis akan mengisi takaran dan cakupan di bawah ' +
            'dengan angka rekomendasi — yang tetap bisa Anda ubah.') },
        { type: 'html', html: ruasCakupan(x) },
        { name: 'harga', label: T('Harga satuan'), type: 'number', min: 0,
          value: x ? (x.harga || '') : '',
          hint: T('Dipakai menghitung biaya per area. Harga TERKINI, bukan harga ' +
            'saat dibeli — barang tanpa harga tidak ikut terhitung sama sekali.') },
        { name: 'bahaya', label: T('Kelas bahaya'), type: 'select',
          value: x ? (x.bahaya || 'aman') : 'aman',
          options: K3.BAHAYA.map(function (b) {
            return { value: b.kode, label: b.ikon + '  ' + T(b.nama) }; }),
          hint: T('Menandai bahan berbahaya menyalakan peringatan “tidak boleh ' +
            'dicampur” di halaman Keselamatan Kerja.') }
      ].concat(x ? [] : [
        { name: 'awal', label: T('Jumlah saat ini'), type: 'number', value: 0,
          hint: T('Dicatat sebagai stok awal — bisa dikoreksi kapan saja.') }
      ]).concat([
        { name: 'catatan', label: T('Catatan'), value: x ? x.catatan || '' : '' }
      ])
    }).then(function (d) {
      if (!d) return;
      /* Bukan kolom formulir biasa — dikumpulkan di kotaknya sendiri, dan
         harus diambil dari variabel karena modalnya sudah dibongkar. */
      d.foto = ambilFoto('stok');
      /* Sama seperti foto: di luar `fields`, jadi harus ditahan sendiri —
         modalnya sudah dibongkar saat baris ini berjalan. */
      /* Baris cakupan dikumpulkan sendiri; jenisnya kolom formulir biasa dan
         sudah ikut di `d`. */
      d.isiNilai = ckTahan.isiNilai;
      d.isiSatuan = ckTahan.isiSatuan;
      d.cakupanM2 = ckTahan.cakupanM2;
      d.jenisArea = lgTahan.slice();
      tahanLingkupObjek();
      d.jenisObjek = lgObjek.slice();
      var r = x ? MCS.ubahStok(x.id, d) : MCS.tambahStok(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Barang diperbarui') : T('Barang ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /**
   * Pilihan gudang, muncul HANYA bila korporatnya memang bergudang banyak.
   *
   * Pada korporat bergudang tunggal, menanyakan gudang adalah pertanyaan
   * yang jawabannya sudah pasti — dan pertanyaan seperti itu mengajari
   * orang menekan Simpan tanpa membaca.
   *
   * `masuk` menentukan daftar mana yang ditawarkan: barang MASUK boleh ke
   * gudang mana pun, barang KELUAR hanya dari gudang yang memang berisi.
   */

  function ruasGudang(korporatId, stokId, masuk) {
    var lok = window.LOKASI ? LOKASI.semua(korporatId) : [];
    if (lok.length < 2) return null;
    if (masuk) {
      return { name: 'lokasiId', label: T('Gudang'), type: 'select', value: lok[0].id,
        options: lok.map(function (l) { return { value: l.id, label: l.nama }; }) };
    }
    var per = MCS.saldoPerLokasi(stokId);
    var isi = Object.keys(per).filter(function (kk) { return per[kk] > 0; });
    if (!isi.length) return null;
    return { name: 'lokasiId', label: T('Dari gudang'), type: 'select', value: isi[0],
      options: isi.map(function (kk) {
        return { value: kk,
          label: (kk ? LOKASI.nama(kk) : T('belum ditempatkan')) +
            '  ·  ' + U.num(per[kk]) };
      }) };
  }

  function dialogMutasi(id, arah) {
    var x = MCS.stokSatu(id);
    if (!x) return;
    var k = korp();
    var masuk = arah === 'masuk';
    /* Jenis yang boleh dipilih di sini. Opname dan perpindahan TIDAK ada di
       daftar ini: keduanya punya layarnya sendiri, dan mencatatnya satu per
       satu di sini akan menghasilkan selisih opname tanpa lawan hitungnya. */
    var pilihan = MCS.JENIS_MUTASI.filter(function (j) {
      return masuk ? j.arah > 0 : j.arah < 0;
    });
    UI.formModal({
      title: masuk ? T('Barang masuk') : T('Barang keluar'),
      sub: x.nama + ' · ' + T('saldo') + ' ' + U.num(MCS.saldoStok(x.id)) + ' ' + x.satuan,
      okText: T('Catat'),
      fields: [
        { name: 'jumlah', label: T('Jumlah') + ' (' + x.satuan + ')', type: 'number',
          value: 1, required: true },
        /* Pilihan jenis hanya muncul bila memang ada lebih dari satu.
           Barang masuk cuma punya satu jenis, dan menu berisi satu pilihan
           adalah pertanyaan yang jawabannya sudah pasti. */
        (pilihan.length > 1
          ? { name: 'jenis', label: T('Jenis'), type: 'select', value: 'keluar',
              options: pilihan.map(function (j) {
                return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }),
              hint: T('Hanya “Dipakai membersihkan” yang dihitung sebagai pemakaian. ' +
                'Barang yang tumpah atau kedaluwarsa tetap mengurangi saldo, tetapi ' +
                'tidak membuat petugas terlihat boros dan tidak menaikkan perkiraan ' +
                'belanja bulan depan.') }
          : { type: 'html', html: '' }),
        (ruasGudang(k.id, x.id, masuk) || { type: 'html', html: '' }),
        { name: 'areaId', label: T('Untuk area (opsional)'), type: 'select', value: '',
          options: [{ value: '', label: '— ' + T('tidak spesifik') + ' —' }]
            .concat(MCS.area(k.id).map(function (a) {
              return { value: a.id, label: a.nama }; })) },
        { name: 'catatan', label: T('Catatan'), value: '',
          placeholder: masuk ? T('mis. pembelian bulanan') : T('mis. isi ulang dispenser') }
      ],
      validate: function (d) {
        var n = Math.round(Number(d.jumlah) || 0);
        if (n <= 0) return T('Isi jumlah lebih dari nol.');
        /* Pemakaian melebihi saldo ditolak: stok minus bukan keadaan yang
           mungkin terjadi di gudang, ia selalu berarti ada yang salah catat.
           Menolaknya di sini memaksa orang memperbaiki catatannya sekarang,
           bukan mewariskan angka mustahil kepada laporan bulan depan. */
        if (!masuk && n > MCS.saldoStok(x.id)) {
          return T('Saldo hanya {n} {satuan}. Catat barang masuk dulu bila memang ada.')
            .replace('{n}', MCS.saldoStok(x.id)).replace('{satuan}', x.satuan);
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var n = Math.round(Number(d.jumlah) || 0);
      var kode = masuk ? 'masuk' : (d.jenis || 'keluar');
      /* Barang yang rusak atau kedaluwarsa tidak dipakai di area mana pun —
         ia hilang di gudang. Menyimpan areanya akan membuat kehilangan itu
         terlihat seperti pekerjaan di sana pada riwayat area. */
      var jn = MCS.jenisMutasi(kode);
      var area = jn.hilang ? null : (d.areaId || null);
      var r = MCS.catatMutasi(x.id, masuk ? n : -n, kode, d.catatan, APP.user, area,
        { lokasiId: d.lokasiId || null });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Tercatat. Saldo sekarang') + ' ' + U.num(r.saldo) + ' ' + x.satuan, 'ok');
      APP.refresh();
    });
  }

  function dialogRiwayatStok(id) {
    var x = MCS.stokSatu(id);
    if (!x) return;
    var l = MCS.mutasiStok(id, 50);
    UI.modal({
      title: T('Riwayat stok'), sub: x.nama, size: 'wide',
      body: l.length
        ? UI.table([
            { h: T('Waktu'), r: function (m) { return U.esc(String(m.pada).slice(0, 16).replace('T', ' ')); } },
            { h: T('Perubahan'), cls: 'num', r: function (m) {
              return '<b class="' + (m.jumlah > 0 ? 'sk-plus' : 'sk-minus') + '">' +
                (m.jumlah > 0 ? '+' : '') + U.num(m.jumlah) + '</b>'; } },
            { h: T('Untuk area'), r: function (m) {
              var a = m.areaId ? MCS.areaSatu(m.areaId) : null;
              return a ? U.esc(a.nama) : '—'; } },
            { h: T('Catatan'), r: function (m) { return U.esc(m.catatan || '—'); } },
            { h: T('Oleh'), r: function (m) { return U.esc(m.olehNama || '—'); } }
          ], l)
        : '<div class="tbl-sub">' + T('Belum ada pergerakan.') + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
    });
  }

  /* ==================================== PENERIMAAN BARANG & PEMASOK

     Halaman tersendiri, bukan tombol kesekian di Bahan Habis Pakai. Halaman
     itu sudah memikul tujuh tombol dan sudah pernah meluber pada layar 800
     px; menambah yang kedelapan berarti tombol yang paling jarang dipakai
     akan menutupi yang paling sering.

     Yang tetap ditaruh di Bahan Habis Pakai hanyalah PERINGATAN kedaluwarsa
     — karena peringatan yang harus dicari orang bukanlah peringatan. */

  var tmTahan = {};

  var tmTutup = null;

  var rtTahan = {};

  var rtTutup = null;

  function kartuKedaluwarsa(korporatId, ringkas) {
    var d = MCS.akanKedaluwarsa(korporatId, 60);
    if (!d.length) return '';
    var lewat = d.filter(function (x) { return x.hari < 0; });
    var nilai = d.reduce(function (n, x) {
      return n + x.sisa * ((x.stok && Number(x.stok.harga)) || 0);
    }, 0);

    var isi =
      '<b>' + (lewat.length
        ? jml(lewat.length, T('1 kiriman SUDAH kedaluwarsa'),
            T('{n} kiriman SUDAH kedaluwarsa'))
        : jml(d.length, '1 kiriman mendekati kedaluwarsa',
            '{n} kiriman mendekati kedaluwarsa')) + '.</b> ' +
      (nilai ? U.rp(nilai) + ' ' + T('masih ada di gudang') + '. ' : '') +
      d.slice(0, 4).map(function (x) {
        return U.esc(x.stok ? x.stok.nama : '?') + ' (' +
          (x.hari < 0
            ? T('lewat {n} hari').replace('{n}', Math.abs(x.hari))
            : jml(x.hari, '1 hari lagi', '{n} hari lagi')) + ')';
      }).join(', ') + (d.length > 4 ? '…' : '');

    if (ringkas) return UI.alert(lewat.length ? 'danger' : 'warn', isi, '⏳');

    return UI.card({ title: T('Mendekati kedaluwarsa'),
      sub: T('Enam puluh hari ke depan'),
      body: UI.alert(lewat.length ? 'danger' : 'warn', isi, '⏳') +
        '<div class="tbl-wrap mt-3"><table class="tbl"><thead><tr>' +
          '<th>' + T('Barang') + '</th>' +
          '<th>' + T('Tanggal kedaluwarsa') + '</th>' +
          '<th class="num">' + T('Diterima') + '</th>' +
          '<th class="num">' + T('Perkiraan sisa') + '</th>' +
          '<th class="num">' + T('Nilai persediaan') + '</th>' +
        '</tr></thead><tbody>' +
        d.map(function (x) {
          return '<tr' + (x.hari < 0 ? ' class="row-danger"' : '') + '>' +
            '<td><b>' + U.esc(x.stok ? x.stok.nama : '?') + '</b></td>' +
            '<td>' + U.tgl(x.kedaluwarsa) +
              '<div class="tbl-sub">' + (x.hari < 0
                ? T('lewat {n} hari').replace('{n}', Math.abs(x.hari))
                : jml(x.hari, '1 hari lagi', '{n} hari lagi')) + '</div></td>' +
            '<td class="num">' + U.num(x.diterima) + '</td>' +
            '<td class="num"><b>' + U.num(x.sisa) + '</b></td>' +
            '<td class="num">' + U.rp(x.sisa * ((x.stok && Number(x.stok.harga)) || 0)) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        /* Batasnya dikatakan, bukan disembunyikan. Angka "perkiraan sisa"
           tampil sama meyakinkannya dengan saldo yang sungguh dihitung, dan
           yang tampil sama akan dipercaya sama. */
        '<div class="hint mt-2">' +
          T('“Perkiraan sisa” dihitung dengan anggapan yang paling dekat ' +
            'kedaluwarsa dipakai lebih dulu. Aplikasi tidak tahu botol yang ' +
            'mana yang diambil petugas — jadi ini batas BAWAH: gudang yang ' +
            'tidak merotasi barangnya punya lebih banyak yang berisiko, bukan ' +
            'lebih sedikit.') + '</div>' });
  }

  function renderTerima() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var nota = MCS.terima(k.id);
    var pmk = MCS.pemasok(k.id);

    return UI.alert('info',
      '<b>' + T('Nota penerimaan mengubah “barang masuk +100” menjadi dokumen.') + '</b> ' +
      T('Dari siapa, nomor notanya, harga yang sungguh dibayar, dan kapan ' +
        'kedaluwarsanya. Dengan harga itu biaya berhenti memakai harga ' +
        'terakhir untuk bulan-bulan yang lampau.'), '📥') +
    '<div class="mb-3"></div>' +

    kartuKedaluwarsa(k.id, false) +
    (MCS.akanKedaluwarsa(k.id, 60).length ? '<div class="mb-3"></div>' : '') +

    '<div class="row between wrap mb-3" style="gap:8px">' +
      '<div class="hint">' +
        jml(nota.length, '1 nota', '{n} nota') + ' · ' +
        jml(pmk.length, '1 pemasok', '{n} pemasok') + '</div>' +
      '<div class="row wrap" style="gap:8px">' +
        '<button class="btn btn--ghost" data-act="tm-pemasok">🏭 ' +
          T('Pemasok') + '</button>' +
        '<button class="btn btn--primary" data-act="tm-baru">＋ ' +
          T('Terima barang') + '</button>' +
      '</div>' +
    '</div>' +

    (nota.length
      ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>' + T('Nota') + '</th>' +
          '<th>' + T('Pemasok') + '</th>' +
          '<th>' + T('Gudang') + '</th>' +
          '<th class="num">' + T('Baris') + '</th>' +
          '<th class="num">' + T('Nilai nota') + '</th>' +
          '<th></th>' +
        '</tr></thead><tbody>' +
        nota.map(barisNota).join('') +
        '</tbody></table></div>'
      : UI.empty('📥', T('Belum ada nota penerimaan'),
          T('Catat kiriman pertama beserta harga dan tanggal kedaluwarsanya.')));
  }

  function barisNota(t) {
    var baris = MCS.barisTerima(t.id);
    var masuk = baris.filter(function (m) { return Number(m.jumlah) > 0; });
    var retur = baris.filter(function (m) { return Number(m.jumlah) < 0; });
    var p = t.pemasokId ? MCS.pemasokSatu(t.pemasokId) : null;
    var lok = t.lokasiId && window.LOKASI ? LOKASI.nama(t.lokasiId) : '';
    return '<tr>' +
      '<td><b>' + U.esc(t.noNota || T('tanpa nomor')) + '</b>' +
        '<div class="tbl-sub">' + U.tgl(t.tglTerima) +
          (t.tglNota && t.tglNota !== t.tglTerima
            ? ' · ' + T('nota') + ' ' + U.tgl(t.tglNota) : '') + '</div></td>' +
      '<td>' + U.esc(p ? p.nama : '—') + '</td>' +
      '<td>' + U.esc(lok || T('belum ditempatkan')) + '</td>' +
      '<td class="num">' + U.num(masuk.length) +
        (retur.length
          ? '<div class="tbl-sub">' +
              jml(retur.length, '1 retur', '{n} retur') + '</div>'
          : '') + '</td>' +
      '<td class="num">' + U.rp(MCS.nilaiTerima(t.id)) + '</td>' +
      '<td class="num">' +
        '<button class="btn btn--sm btn--ghost" data-act="tm-lihat" data-id="' + t.id + '">' +
          T('Rincian') + '</button> ' +
        '<button class="btn btn--sm btn--ghost" data-act="tm-retur" data-id="' + t.id + '">' +
          T('Retur') + '</button>' +
      '</td></tr>';
  }

  /* --------------------------------------------------------- PEMASOK */

  function dialogDaftarPemasok() {
    var k = korp();
    if (!k) return;
    var l = MCS.pemasok(k.id);
    UI.modal({
      title: T('Pemasok'), size: 'wide',
      sub: T('Yang berhenti dipakai dinonaktifkan, tidak dihapus'),
      body: (l.length
        ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
            '<th>' + T('Nama') + '</th><th>' + T('Kontak') + '</th>' +
            '<th class="num">' + T('Jumlah nota') + '</th><th></th>' +
          '</tr></thead><tbody>' +
          l.map(function (p) {
            var n = MCS.terima(k.id).filter(function (t) {
              return t.pemasokId === p.id;
            }).length;
            return '<tr' + (p.aktif === false ? ' class="row-muted"' : '') + '>' +
              '<td><b>' + U.esc(p.nama) + '</b>' +
                (p.aktif === false
                  ? ' <span class="chip chip--muted">' + T('nonaktif') + '</span>' : '') +
                (p.alamat ? '<div class="tbl-sub">' + U.esc(p.alamat) + '</div>' : '') +
              '</td>' +
              '<td>' + U.esc(p.kontak || '—') +
                (p.telepon ? '<div class="tbl-sub">' + U.esc(p.telepon) + '</div>' : '') +
              '</td>' +
              '<td class="num">' + U.num(n) + '</td>' +
              '<td class="num">' +
                '<button class="btn btn--sm btn--ghost" data-act="pm-ubah" data-id="' +
                  p.id + '">' + T('Ubah') + '</button></td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="hint">' + T('Belum ada pemasok terdaftar.') + '</div>'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="pm-baru">＋ ' + T('Pemasok baru') + '</button>',
      actions: {
        'pm-baru': function () { dialogPemasok(null); },
        'pm-ubah': function (el) { dialogPemasok(el.getAttribute('data-id')); }
      }
    });
  }

  function dialogPemasok(id) {
    var k = korp();
    var p = id ? MCS.pemasokSatu(id) : null;
    UI.formModal({
      title: p ? T('Ubah pemasok') : T('Pemasok baru'), okText: T('Simpan'),
      fields: [
        { name: 'nama', label: T('Nama pemasok'), value: p ? p.nama : '', required: true,
          placeholder: T('mis. CV Sinar Kebersihan') },
        { name: 'kontak', label: T('Orang yang dihubungi'), value: p ? p.kontak || '' : '' },
        { name: 'telepon', label: T('Telepon'), value: p ? p.telepon || '' : '' },
        { name: 'alamat', label: T('Alamat'), value: p ? p.alamat || '' : '' },
        { name: 'catatan', label: T('Catatan'), value: p ? p.catatan || '' : '',
          hint: T('Syarat pembayaran, lama kirim, apa pun yang perlu diingat.') },
        { name: 'aktif', label: T('Masih dipakai'), type: 'checkbox',
          value: p ? p.aktif !== false : true,
          hint: T('Yang dimatikan hilang dari pilihan, tetapi seluruh notanya ' +
            'tetap bisa dibaca.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = p ? MCS.ubahPemasok(p.id, d) : MCS.tambahPemasok(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      DB.save(true);
      UI.toast(p ? T('Pemasok diperbarui') : T('Pemasok ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /* ------------------------------------------------- TERIMA BARANG */

  function dialogTerima() {
    var k = korp();
    if (!k) return;
    var l = MCS.stok(k.id);
    if (!l.length) { UI.toast(T('Daftarkan barangnya dulu.'), 'err'); return; }
    var pmk = MCS.pemasok(k.id).filter(function (p) { return p.aktif !== false; });
    var lok = window.LOKASI ? LOKASI.semua(k.id) : [];
    tmTahan = {};
    var hariIni = U.iso(new Date());

    UI.modal({
      title: T('Terima barang'), size: 'wide',
      sub: T('Satu nota, beberapa baris'),
      body:
        '<div class="grid g-2 mb-3">' +
          '<div class="field"><label>' + T('Pemasok') + '</label>' +
            '<select class="input" id="tm-pemasok">' +
              '<option value="">— ' + T('tidak disebut') + ' —</option>' +
              pmk.map(function (p) {
                return '<option value="' + p.id + '">' + U.esc(p.nama) + '</option>';
              }).join('') +
            '</select>' +
            (pmk.length ? '' :
              '<div class="hint">' + T('Belum ada pemasok. Notanya tetap bisa ' +
                'disimpan — nama pemasok bisa dilengkapi kemudian.') + '</div>') +
          '</div>' +
          '<div class="field"><label>' + T('Nomor nota / surat jalan') + '</label>' +
            '<input class="input" id="tm-nonota" placeholder="' +
              T('mis. INV/2026/08/0451') + '"></div>' +
          '<div class="field"><label>' + T('Tanggal terima') + '</label>' +
            '<input class="input" type="date" id="tm-tglterima" value="' + hariIni + '"></div>' +
          '<div class="field"><label>' + T('Tanggal nota') + '</label>' +
            '<input class="input" type="date" id="tm-tglnota"></div>' +
          (lok.length
            ? '<div class="field"><label>' + T('Masuk ke gudang') + '</label>' +
                '<select class="input" id="tm-lokasi">' +
                  '<option value="">— ' + T('belum ditempatkan') + ' —</option>' +
                  lok.map(function (x) {
                    return '<option value="' + x.id + '">' + U.esc(x.nama) + '</option>';
                  }).join('') + '</select></div>'
            : '') +
        '</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>' + T('Barang') + '</th>' +
          '<th class="num">' + T('Banyaknya') + '</th>' +
          '<th class="num">' + T('Harga satuan') + '</th>' +
          '<th>' + T('Tanggal kedaluwarsa') + '</th>' +
          '<th class="num">' + T('Nilai baris') + '</th>' +
        '</tr></thead><tbody>' +
        l.map(function (x) {
          return '<tr>' +
            '<td><b>' + U.esc(x.nama) + '</b>' +
              '<div class="tbl-sub">' + U.esc(x.satuan) + ' · ' +
                T('stok') + ' ' + U.num(x.saldo) + '</div></td>' +
            '<td class="num"><input class="input op-i" type="number" min="0" ' +
              'data-tm="' + x.id + '" placeholder="—"></td>' +
            '<td class="num"><input class="input op-i" type="number" min="0" ' +
              'data-tmh="' + x.id + '" placeholder="' + (Number(x.harga) || '') + '"></td>' +
            '<td><input class="input" type="date" data-tmk="' + x.id + '"></td>' +
            '<td class="num" id="tm-n-' + x.id + '"></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div class="hint mt-2">' +
          T('Harga dikosongkan berarti tidak disebut, BUKAN gratis — barisnya ' +
            'tetap masuk, tetapi tidak ikut membentuk harga rata-rata. Tanggal ' +
            'kedaluwarsa hanya perlu untuk yang memang punya umur: chemical, ' +
            'disinfektan, pemutih.') + '</div>' +
        '<div class="field mt-3"><label>' + T('Catatan') + '</label>' +
          '<input class="input" id="tm-catatan"></div>' +
        '<div id="tm-ring" class="tbl-sub mt-2"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="tm-simpan">' + T('Simpan nota') + '</button>',
      onMount: function (root, tutup) {
        tmTutup = tutup;
        ['[data-tm]', '[data-tmh]', '[data-tmk]'].forEach(function (sel) {
          Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) {
            el.addEventListener('input', function () { hitungTerima(root); });
            el.addEventListener('change', function () { hitungTerima(root); });
          });
        });
        hitungTerima(root);
      },
      actions: { 'tm-simpan': function () { simpanNota(); } }
    });
  }

  function hitungTerima(root) {
    var n = 0, nilai = 0, tanpaHarga = 0, lewat = 0;
    var hariIni = U.iso(new Date());
    tmTahan = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-tm]'), function (el) {
      var id = el.getAttribute('data-tm');
      var kotak = root.querySelector('#tm-n-' + id);
      var j = Math.max(0, Math.round(Number(el.value) || 0));
      if (!j) { if (kotak) kotak.innerHTML = ''; return; }
      var hEl = root.querySelector('[data-tmh="' + id + '"]');
      var kEl = root.querySelector('[data-tmk="' + id + '"]');
      var harga = hEl && hEl.value !== '' ? Math.max(0, Math.round(Number(hEl.value) || 0)) : 0;
      var ked = (kEl && kEl.value) || null;
      n++;
      if (!harga) tanpaHarga++;
      if (ked && ked < hariIni) lewat++;
      nilai += j * harga;
      tmTahan[id] = { stokId: id, jumlah: j, harga: harga, kedaluwarsa: ked };
      if (kotak) kotak.innerHTML = harga ? U.rp(j * harga) : '<span class="muted">—</span>';
    });
    var r = root.querySelector('#tm-ring');
    if (!r) return;
    r.innerHTML = !n
      ? T('Belum ada yang diisi.')
      : jml(n, '1 baris', '{n} baris') +
        (nilai ? ' · ' + U.rp(nilai) : '') +
        (tanpaHarga ? ' · ' + jml(tanpaHarga, T('1 baris tanpa harga'),
          T('{n} baris tanpa harga')) : '') +
        (lewat ? ' · <b class="mcs-warn">' + jml(lewat,
          T('1 tanggal kedaluwarsa sudah lewat'),
          T('{n} tanggal kedaluwarsa sudah lewat')) + '</b>' : '');
  }

  function simpanNota() {
    var k = korp();
    var akr = akar();
    function nilai(id) {
      var e = akr.querySelector('#' + id);
      return e ? e.value : '';
    }
    var baris = Object.keys(tmTahan).map(function (id) { return tmTahan[id]; });
    var r = MCS.simpanTerima(k.id, {
      pemasokId: nilai('tm-pemasok') || null,
      lokasiId: nilai('tm-lokasi') || null,
      noNota: nilai('tm-nonota'),
      tglNota: nilai('tm-tglnota') || null,
      tglTerima: nilai('tm-tglterima') || U.iso(new Date()),
      catatan: nilai('tm-catatan'),
      baris: baris
    }, APP.user);
    if (r.error) { UI.toast(r.error, 'err'); return; }
    if (r.gagal.length) {
      UI.toast(jml(r.berhasil, '1 baris tercatat', '{n} baris tercatat') + ' · ' +
        jml(r.gagal.length, T('1 gagal'), T('{n} gagal')) + ': ' + r.gagal[0], 'err');
      APP.refresh();
      return;
    }
    if (tmTutup) { tmTutup(); tmTutup = null; }
    UI.toast(jml(r.berhasil, '1 baris diterima', '{n} baris diterima'), 'ok');
    APP.refresh();
  }

  /* ------------------------------------------------------- RINCIAN & RETUR */

  function dialogRincianNota(id) {
    var t = MCS.terimaSatu(id);
    if (!t) return;
    var p = t.pemasokId ? MCS.pemasokSatu(t.pemasokId) : null;
    var baris = MCS.barisTerima(id);
    UI.modal({
      title: T('Nota') + ' ' + (t.noNota || T('tanpa nomor')), size: 'wide',
      sub: U.tgl(t.tglTerima) + (p ? ' · ' + p.nama : ''),
      body:
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>' + T('Barang') + '</th>' +
          '<th>' + T('Jenis') + '</th>' +
          '<th class="num">' + T('Banyaknya') + '</th>' +
          '<th class="num">' + T('Harga satuan') + '</th>' +
          '<th>' + T('Tanggal kedaluwarsa') + '</th>' +
        '</tr></thead><tbody>' +
        baris.map(function (m) {
          var x = MCS.stokSatu(m.stokId);
          var j = MCS.jenisMutasi(m.jenis);
          return '<tr' + (Number(m.jumlah) < 0 ? ' class="row-muted"' : '') + '>' +
            '<td><b>' + U.esc(x ? x.nama : '?') + '</b></td>' +
            '<td>' + j.ikon + ' ' + T(j.nama) + '</td>' +
            '<td class="num">' + U.num(m.jumlah) + '</td>' +
            '<td class="num">' + (Number(m.harga) ? U.rp(m.harga) : '—') + '</td>' +
            '<td>' + (m.kedaluwarsa ? U.tgl(m.kedaluwarsa) : '—') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        (t.catatan ? '<div class="hint mt-2">' + U.esc(t.catatan) + '</div>' : '') +
        '<div class="row between mt-3"><b>' + T('Nilai nota') + '</b>' +
          '<b>' + U.rp(MCS.nilaiTerima(id)) + '</b></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
    });
  }

  function dialogRetur(id) {
    var t = MCS.terimaSatu(id);
    if (!t) return;
    /* Yang bisa dikembalikan = diterima dikurangi yang sudah dikembalikan.
       Dihitung di sini juga, supaya baris yang sudah habis tidak ditawarkan
       sama sekali — menawarkan lalu menolak adalah cara paling melelahkan
       untuk menyampaikan batas. */
    var sisa = {};
    MCS.barisTerima(id).forEach(function (m) {
      var n = Number(m.jumlah) || 0;
      sisa[m.stokId] = (sisa[m.stokId] || 0) + n;
    });
    var daftar = Object.keys(sisa).filter(function (sid) { return sisa[sid] > 0; });
    if (!daftar.length) {
      UI.toast(T('Seluruh isi nota ini sudah dikembalikan.'), 'err');
      return;
    }
    rtTahan = {};

    UI.modal({
      title: T('Retur ke pemasok'), size: 'wide',
      sub: T('Nota') + ' ' + (t.noNota || T('tanpa nomor')),
      body:
        UI.alert('info',
          T('Retur BUKAN kerugian gudang dan bukan pemakaian. Ia tidak ' +
            'menaikkan angka boros petugas mana pun, dan tidak masuk hitungan ' +
            'bahan yang menguap — karena uangnya kembali.'), '↩️') +
        '<div class="mb-3"></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>' + T('Barang') + '</th>' +
          '<th class="num">' + T('Bisa dikembalikan') + '</th>' +
          '<th class="num">' + T('Dikembalikan') + '</th>' +
        '</tr></thead><tbody>' +
        daftar.map(function (sid) {
          var x = MCS.stokSatu(sid);
          return '<tr>' +
            '<td><b>' + U.esc(x ? x.nama : '?') + '</b>' +
              '<div class="tbl-sub">' + U.esc(x ? x.satuan : '') + '</div></td>' +
            '<td class="num">' + U.num(sisa[sid]) + '</td>' +
            '<td class="num"><input class="input op-i" type="number" min="0" max="' +
              sisa[sid] + '" data-rt="' + sid + '" placeholder="—"></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div id="rt-ring" class="tbl-sub mt-2"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="rt-simpan">' + T('Catat retur') + '</button>',
      onMount: function (root, tutup) {
        rtTutup = tutup;
        rtTahan = { terimaId: id, baris: {} };
        Array.prototype.forEach.call(root.querySelectorAll('[data-rt]'), function (el) {
          el.addEventListener('input', function () { hitungRetur(root, sisa); });
        });
        hitungRetur(root, sisa);
      },
      actions: { 'rt-simpan': function () { simpanRetur(); } }
    });
  }

  function hitungRetur(root, sisa) {
    var n = 0, lebih = 0;
    rtTahan.baris = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-rt]'), function (el) {
      var id = el.getAttribute('data-rt');
      var j = Math.max(0, Math.round(Number(el.value) || 0));
      if (!j) return;
      n++;
      if (j > (sisa[id] || 0)) lebih++;
      rtTahan.baris[id] = j;
    });
    var r = root.querySelector('#rt-ring');
    if (!r) return;
    r.innerHTML = !n
      ? T('Belum ada yang diisi.')
      : jml(n, T('1 barang dikembalikan'), T('{n} barang dikembalikan')) +
        (lebih ? ' · <b class="mcs-warn">' + jml(lebih,
          '1 baris melebihi isi nota', '{n} baris melebihi isi nota') + '</b>' : '');
  }

  function simpanRetur() {
    var baris = Object.keys(rtTahan.baris || {}).map(function (id) {
      return { stokId: id, jumlah: rtTahan.baris[id] };
    });
    var r = MCS.returTerima(rtTahan.terimaId, baris, APP.user);
    if (r.error) { UI.toast(r.error, 'err'); return; }
    if (r.gagal.length) {
      UI.toast(jml(r.berhasil, '1 tercatat', '{n} tercatat') + ' · ' +
        jml(r.gagal.length, T('1 gagal'), T('{n} gagal')) + ': ' + r.gagal[0], 'err');
      APP.refresh();
      return;
    }
    if (rtTutup) { rtTutup(); rtTutup = null; }
    UI.toast(jml(r.berhasil, T('1 barang dikembalikan'), T('{n} barang dikembalikan')), 'ok');
    APP.refresh();
  }

  function mountTerima(root) {
    delegasi(root, {
      'tm-baru': dialogTerima,
      'tm-pemasok': dialogDaftarPemasok,
      'tm-lihat': function (el) { dialogRincianNota(el.getAttribute('data-id')); },
      'tm-retur': function (el) { dialogRetur(el.getAttribute('data-id')); }
    });
  }

  function mountStok(root) {
    delegasi(root, {
      'sk-baru': function () { dialogStok(null); },
      /* Rentang rencana belanja. Disimpan di luar render supaya pilihan
         orangnya bertahan saat halamannya digambar ulang. */
      'rb-lokasi': function (el) {
        rbLokasi = el.value || '';
        APP.refresh();
      },
      'rb-bulan': function (el) {
        rbBulan = Number(el.getAttribute('data-key')) || 1;
        APP.refresh();
      },
      'sk-cetak': function () { cetakDaftarStok(); },
      'sk-impor': function () { dialogImpor('stok'); },
      'sk-perkiraan': dialogPerkiraan,
      'sk-opname': dialogOpname,
      'sk-massal': dialogMassal,
      'sk-ambil': function () { dialogAmbil(null); },
      'sk-terima': dialogTerima,
      'pk-cetak': function () { cetakPerkiraan(); },
      'sk-ubah': function (el) { dialogStok(el.getAttribute('data-id')); },
      'sk-masuk': function (el) { dialogMutasi(el.getAttribute('data-id'), 'masuk'); },
      'sk-keluar': function (el) { dialogMutasi(el.getAttribute('data-id'), 'keluar'); },
      'sk-riwayat': function (el) { dialogRiwayatStok(el.getAttribute('data-id')); },
      'sk-pindah': function (el) { dialogPindah(el.getAttribute('data-id')); },
      'sk-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = MCS.stokSatu(id);
        UI.konfirm({ title: T('Hapus') + ' ' + (x ? x.nama : '') + '?', danger: true,
          text: T('Seluruh riwayat keluar-masuknya ikut terhapus.') }).then(function (ya) {
          if (!ya) return;
          MCS.hapusStok(id);
          UI.toast(T('Barang dihapus'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ==================================================== INSPEKSI MUTU

     Tugas menjawab 'sudah dikerjakan?'. Inspeksi menjawab 'hasilnya
     bersih?'. Keduanya harus dijawab orang yang berbeda — kalau tidak,
     laporan 100% selesai bisa berdampingan dengan toilet yang bau, dan
     tidak ada satu pun angka yang menunjukkannya. */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsStok", { label: 'Bahan Habis Pakai', icon: '🧴', grup: 'Pengaturan',
      render: renderStok, mount: mountStok,
      badge: function () {
        if (!APP.user || !APP.user.korporatId) return 0;
        var s = MCS.statistikStok(APP.user.korporatId);
        return s.habis + s.menipis;
      } });

  VMCS.daftar("korporat", "mcsTerima", { label: 'Penerimaan Barang', icon: '📥', grup: 'Pengaturan',
      sub: 'Nota dari pemasok, harga yang sungguh dibayar, dan umur barangnya',
      render: renderTerima, mount: mountTerima,
      /* Lencana memuat yang MENDEKATI kedaluwarsa, bukan jumlah nota.
         Angka yang hanya bertambah tidak pernah menuntut tindakan, dan
         lencana yang tidak pernah menuntut tindakan berhenti dilihat. */
      badge: function () {
        if (!APP.user || !APP.user.korporatId) return 0;
        return MCS.akanKedaluwarsa(APP.user.korporatId, 30).length;
      } });
})();
