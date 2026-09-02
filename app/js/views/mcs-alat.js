/* ==========================================================================
   views/mcs-alat.js — Peralatan
   --------------------------------------------------------------------------
   Aset yang dipegang orang. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  var T = VMCS.T,
      ambilFoto = VMCS.ambilFoto,
      angka = VMCS.angka,
      baris = VMCS.baris,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      jml = VMCS.jml,
      korp = VMCS.korp,
      kotakFoto = VMCS.kotakFoto,
      kvKerja = VMCS.kvKerja,
      pasangAksiFoto = VMCS.pasangAksiFoto,
      tombol = VMCS.tombol;

  var asSaring = 'aktif', asBuka = null;

  var asJenis = 'semua', asLokasi = 'semua', asTabel = 'jenis';
  /* Berapa baris digambar sekaligus. Bukan pemanis: menggambar 1.326 baris
     beserta rincian yang terbuka membuat tiap penekanan tombol terasa
     tersendat, dan yang tersendat berhenti dipakai. */

  var AS_HAL = 40;

  var asBatas = AS_HAL;

  function renderAset() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = ASET.statistik(k.id);
    var nl = ASET.nilaiTotal(k.id);
    /* DUA LAPIS, dan urutannya menentukan angka yang tertulis di layar.

       · TAB menentukan LINGKUP: ia menyaring grafik, tabel ringkasan, dan
         daftar sekaligus. Menekan 'Lewat servis' berarti "tunjukkan dunia
         yang terdiri dari alat-alat itu saja".
       · DAFTAR PILIHAN menyaring daftar di bawahnya saja.

       Ketahuan saat diuji bahwa urutan ini bukan selera. Ketika hitungan
       pada daftar pilihan dihitung dari seluruh data, tab 'Lewat servis'
       menampilkan 'Tangga (88)' padahal tidak ada satu tangga pun yang
       terlewat — memilihnya memberi daftar kosong di bawah angka 88.
       Hitungan yang tidak sepakat dengan hasilnya lebih buruk daripada
       tidak ada hitungan. */
    var pokok = lingkupAset(ASET.semua(k.id, { semua: asSaring === 'semua' }));
    var l = saringAset(pokok);

    return peringatanServis(st) +
      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Peralatan aktif'), value: st.total, icon: '🧰',
          meta: st.lepas ? jml(st.lepas, T('1 sudah dilepas'), T('{n} sudah dilepas')) : '' }) +
        UI.stat({ label: T('Sedang dipegang'), value: st.dipakai, icon: '🤝',
          meta: st.gudang ? jml(st.gudang, T('1 di gudang'), T('{n} di gudang')) : '' }) +
        UI.stat({ label: T('Rusak / diservis'), value: st.rusak + st.servis, icon: '🔧' }) +
        /* Yang ditampilkan sekarang NILAI BUKU, bukan harga beli.

           Harga beli tidak berubah selama sepuluh tahun dan karena itu tidak
           pernah memberi tahu apa pun; nilai buku turun tiap bulan dan
           menjawab pertanyaan yang sebenarnya ditanyakan — berapa nilai
           peralatan yang masih dipegang gedung ini hari ini. Harga
           perolehannya tetap disebut di bawahnya, karena tanpa pembanding
           angka nilai buku tidak berarti apa-apa. */
        UI.stat({ label: T('Nilai buku sekarang'), value: U.rpShort(nl.nilaiBuku), icon: '💰',
          meta: T('dari') + ' ' + U.rpShort(nl.harga) + ' ' + T('harga beli') +
            (nl.belumLengkap
              ? ' · ' + jml(nl.belumLengkap, T('1 alat belum lengkap datanya'),
                  T('{n} alat belum lengkap datanya'))
              : '') }) +
      '</div>' +

      kartuSebaranAset(pokok) +
      kartuRingkasAset(pokok) +

      '<div class="row between mb-3">' +
        /* Empat tab, bukan dua. 'Lewat servis' dan 'Rusak' ada di sini
           karena itulah dua alasan orang membuka halaman ini di luar
           urusan pendataan — dan mencarinya sendiri di antara ribuan baris
           adalah pekerjaan yang seharusnya dikerjakan mesin. */
        UI.tabs([{ key: 'aktif', label: T('Aktif'), n: st.total },
                 { key: 'telat', label: T('Lewat servis'), n: st.terlewat.length },
                 { key: 'rusak', label: T('Rusak / diservis'), n: st.rusak + st.servis },
                 { key: 'semua', label: T('Semua'), n: st.semua }],
                asSaring, 'as-saring') +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="as-param">⚙️ ' +
            T('Parameter mesin') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="as-cetak">🖨️ ' +
            T('Cetak daftar') + '</button>' +
          '<button class="btn btn--primary btn--sm" data-act="as-baru">＋ ' +
            T('Daftarkan Peralatan') + '</button>' +
        '</div>' +
      '</div>' +

      penyaringAset(pokok, l) +
      daftarAset(l);
  }

  /* ------------------------------------------------ penyaring & daftar */

  /** Lokasi sebuah alat — lewat areanya, karena alat menempel pada area. */

  function lokasiAset(x) {
    var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
    return a ? a.lokasiId : '';
  }

  /** Lapis pertama: lingkup yang dipilih lewat tab. */

  function lingkupAset(l) {
    if (asSaring === 'telat') {
      return l.filter(function (x) { return ASET.servisTerlewat(x); });
    }
    if (asSaring === 'rusak') {
      return l.filter(function (x) {
        return x.keadaan === 'rusak' || x.keadaan === 'servis'; });
    }
    return l;
  }

  /** Lapis kedua: daftar pilihan, yang hanya mengenai daftar di bawah. */

  function saringAset(l) {
    return l.filter(function (x) {
      if (asJenis !== 'semua' && x.jenis !== asJenis) return false;
      if (asLokasi !== 'semua' && lokasiAset(x) !== asLokasi) return false;
      return true;
    });
  }

  /**
   * Dua daftar pilihan dan satu tombol bersih.
   *
   * TIDAK ada kotak cari teks, dan itu keputusan, bukan kelalaian: memilih
   * apa pun di halaman ini memanggil APP.refresh() yang menggambar ulang
   * seluruh halaman, sehingga kotak teks akan kehilangan fokus pada tiap
   * huruf. Dua daftar yang bekerja lebih baik daripada satu kotak yang
   * melompat-lompat. Menambahkannya kelak menuntut penyimpanan fokus lebih
   * dulu — bukan sekadar menambah <input>.
   */

  function penyaringAset(pokok, hasil) {
    /* Tidak ada perabot untuk menyaring ketiadaan. Korporat yang baru mulai
       melihat dua daftar pilihan berisi nol dan satu keterangan "0 alat
       ditampilkan" — tiga hal yang semuanya benar dan tidak satu pun
       berguna, di layar yang seharusnya hanya berkata "mulai dari sini". */
    if (!pokok.length) return '';
    var adaJenis = {}, adaLokasi = {};
    pokok.forEach(function (x) {
      adaJenis[x.jenis] = (adaJenis[x.jenis] || 0) + 1;
      var lid = lokasiAset(x);
      if (lid) adaLokasi[lid] = (adaLokasi[lid] || 0) + 1;
    });
    var lok = Object.keys(adaLokasi).map(function (id) {
      return { id: id, nama: window.LOKASI ? LOKASI.nama(id) : id, n: adaLokasi[id] };
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });

    var disaring = asJenis !== 'semua' || asLokasi !== 'semua';
    return '<div class="as-filter mb-3">' +
      '<label>' + T('Jenis') +
        '<select data-change="as-f-jenis">' +
          '<option value="semua">' + U.esc(T('Semua jenis')) +
            ' (' + pokok.length + ')</option>' +
          ASET.JENIS.filter(function (j) { return adaJenis[j.kode]; })
            .map(function (j) {
              return '<option value="' + j.kode + '"' +
                (asJenis === j.kode ? ' selected' : '') + '>' +
                j.ikon + ' ' + U.esc(T(j.nama)) + ' (' + adaJenis[j.kode] + ')</option>';
            }).join('') +
        '</select></label>' +
      (lok.length > 1
        ? '<label>' + T('Lokasi') +
            '<select data-change="as-f-lokasi">' +
              '<option value="semua">' + U.esc(T('Semua lokasi')) +
                ' (' + lok.length + ')</option>' +
              lok.map(function (x) {
                return '<option value="' + U.esc(x.id) + '"' +
                  (asLokasi === x.id ? ' selected' : '') + '>' +
                  U.esc(x.nama) + ' (' + x.n + ')</option>';
              }).join('') +
            '</select></label>'
        : '') +
      '<span class="as-filter__n">' +
        jml(hasil.length, '1 alat ditampilkan', '{n} alat ditampilkan') + '</span>' +
      (disaring
        ? '<button class="btn btn--ghost btn--sm" data-act="as-f-bersih">✕ ' +
          T('Hapus penyaring') + '</button>'
        : '') +
    '</div>';
  }

  function daftarAset(l) {
    if (!l.length) {
      return (asJenis !== 'semua' || asLokasi !== 'semua' || asSaring === 'telat' ||
              asSaring === 'rusak')
        ? UI.empty('🔍', T('Tidak ada peralatan yang cocok'),
            T('Longgarkan penyaringnya, atau hapus semuanya untuk melihat seluruh daftar.'))
        : UI.empty('🧰', T('Belum ada peralatan terdaftar'),
            T('Vacuum, mesin poles, scrubber, troli, tangga — barang yang dipakai ' +
              'berulang kali dan harganya besar.'));
    }
    var tampil = l.slice(0, asBatas);
    return '<div class="wk-list">' + tampil.map(barisAset).join('') + '</div>' +
      (l.length > tampil.length
        /* Sisanya DISEBUT jumlahnya. Daftar yang diam-diam terpotong membuat
           orang menyimpulkan alatnya tidak ada, lalu mendaftarkannya lagi. */
        ? '<div class="as-lagi">' +
            '<button class="btn btn--ghost" data-act="as-lagi">' +
              T('Tampilkan {n} lagi').replace('{n}',
                Math.min(AS_HAL, l.length - tampil.length)) + '</button>' +
            '<span>' + jml(l.length - tampil.length, '1 alat belum ditampilkan',
              '{n} alat belum ditampilkan') + '</span>' +
          '</div>'
        : '');
  }

  /**
   * Peringatan servis — JUMLAH dulu, contoh secukupnya, lalu jalan keluar.
   *
   * Sebelumnya seluruh nama dicetak di dalam satu kalimat. Pada gedung kecil
   * itu terbaca wajar; pada 87 cabang ia menjadi satu paragraf berisi 446
   * nama, sebagian besar berulang ("Vacuum Cleaner Wet & Dry 30L" puluhan
   * kali) tanpa satu pun keterangan di mana alatnya berada. Peringatan yang
   * mustahil dibaca bukan peringatan yang lemah — ia peringatan yang tidak
   * ada, karena matanya melompatinya setiap kali.
   *
   * Yang menggantikannya: berapa banyak, di berapa lokasi, tiga yang PALING
   * LAMA terlewat beserta lokasinya, dan tombol yang menyaring daftarnya
   * menjadi persis alat-alat itu.
   */

  function peringatanServis(st) {
    if (!st.terlewat.length && !st.segera.length) return '';

    function sebut(x) {
      var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
      var nl = a && window.LOKASI ? LOKASI.nama(a.lokasiId) : '';
      return U.esc(x.nama) + (nl ? ' <i>· ' + U.esc(nl) + '</i>' : '');
    }
    function lokasiBerbeda(l) {
      var p = {};
      l.forEach(function (x) {
        var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
        if (a) p[a.lokasiId] = 1;
      });
      return Object.keys(p).length;
    }

    var isi = '';
    if (st.terlewat.length) {
      /* Yang paling lama terlewat lebih dulu — bukan tiga yang kebetulan
         terdepan di daftar. Tiga nama acak dari 446 tidak memberi tahu
         apa-apa; tiga yang terparah memberi tahu dari mana harus mulai. */
      var urut = st.terlewat.slice().sort(function (a, b) {
        return String(ASET.servisBerikut(a) || '')
          .localeCompare(String(ASET.servisBerikut(b) || ''));
      });
      var nl = lokasiBerbeda(st.terlewat);
      isi += '<b>' + jml(st.terlewat.length, T('1 peralatan lewat jadwal servis'),
        T('{n} peralatan lewat jadwal servis')) + '</b>' +
        /* Frasa UTUH. 'di' sebagai kunci sendiri adalah kata yang di
           bahasa lain berubah menurut apa yang mengikutinya, dan kamus tidak
           punya cara mengetahuinya. */
        (nl > 1 ? ' ' + jml(nl, 'di 1 lokasi', 'di {n} lokasi') : '') + '. ' +
        T('Paling lama tertunda') + ': ' +
        urut.slice(0, 3).map(sebut).join(', ') +
        (urut.length > 3
          ? ', ' + T('dan {n} lainnya').replace('{n}', urut.length - 3)
          : '') + '. ';
    }
    if (st.segera.length) {
      isi += jml(st.segera.length, '1 peralatan jatuh tempo servis dalam 30 hari',
        '{n} peralatan jatuh tempo servis dalam 30 hari') + '. ';
    }
    /* Kalimat penutupnya bukan hiasan: inilah alasan modul ini ada, dan yang
       membedakan perawatan dari perbaikan. */
    isi += T('Servis yang terlewat berakhir sebagai perbaikan, dan biaya ' +
      'perbaikan selalu lebih besar.');

    if (st.terlewat.length) {
      isi += ' <button class="btn btn--sm" data-act="as-lihat-telat">🔧 ' +
        T('Lihat alat yang terlewat') + '</button>';
    }
    return UI.alert(st.terlewat.length ? 'danger' : 'warn', isi, '🔧') +
      '<div class="mb-3"></div>';
  }

  /* ==================================================== GAMBARAN CEPAT

     Pertanyaan yang dibawa orang ke halaman ini hampir selalu salah satu
     dari tiga: "kita punya apa saja", "apa yang sedang bermasalah", dan
     "di mana". Daftar sepanjang seribu baris tidak menjawab satu pun dari
     ketiganya — ia baru berguna SESUDAH ketiganya terjawab. */

  /**
   * Dua batang MENDATAR, bukan kolom bertumpuk.
   *
   * Kolom bertumpuk sempat dicoba dan gagal pada data sungguhan, karena dua
   * sebab yang keduanya tidak terlihat sampai digambar:
   *
   *   · Sumbu mendatar hanya muat ikon. Delapan gambar kecil berjajar tanpa
   *     nama bukan sumbu — ia teka-teki.
   *   · Satu jenis berjumlah 704 sementara sisanya 50–138, sehingga tujuh
   *     kolom lain rata di dasar dan tidak bisa dibandingkan satu sama lain.
   *
   * Batang mendatar tidak punya kedua penyakit itu: namanya punya tempat,
   * dan tiap baris berdiri sendiri.
   *
   * Yang digambar juga diganti. Jumlah per jenis SUDAH ada di tabel di
   * bawah; menggambarnya lagi hanya menambah tinta. Yang tidak bisa dibaca
   * sekilas dari tabel adalah PROPORSI UANG — dan itu pertanyaan yang
   * sungguh dibawa orang ke halaman aset: di mana nilai peralatan kami
   * sebenarnya berada.
   */

  function kartuSebaranAset(l) {
    if (l.length < 2) return '';
    return kartuNilaiJenis(l) + kartuTelatLokasi(l);
  }

  function kartuNilaiJenis(l) {
    var per = {}, belum = 0;
    l.forEach(function (x) {
      var v = per[x.jenis] || (per[x.jenis] = { n: 0, nilai: 0 });
      v.n++;
      var ek = ASET.ekonomi(x);
      if (ek && ek.siap) v.nilai += ek.nilaiBuku; else belum++;
    });
    var data = Object.keys(per).map(function (kd) {
      var j = ASET.jenis(kd);
      return { icon: j.ikon, nama: T(j.nama), nilai: per[kd].nilai,
               ket: jml(per[kd].n, '1 alat', '{n} alat') };
    }).sort(function (a, b) { return b.nilai - a.nilai; });
    if (data.length < 2) return '';

    return UI.card({ cls: 'mb-3', title: T('Nilai buku menurut jenis'),
      sub: T('Nilai peralatan yang masih dipegang hari ini, bukan harga belinya') +
        (belum
          /* Alat yang datanya belum lengkap DISEBUT, bukan diam-diam
             dihitung nol. Grafik yang kekurangan penyusun tanpa berkata
             apa-apa akan dipakai sebagai gambaran yang utuh. */
          ? ' · ' + jml(belum, T('1 alat belum lengkap datanya'),
              T('{n} alat belum lengkap datanya'))
          : ''),
      body: Chart.batang({
        warna: Chart.WARNA.s1,
        sumber: { teks: T('Harga beli setiap alat yang tercatat, dijumlahkan ' +
          'per kategori. Alat yang harganya belum diisi tidak ikut ' +
          'dijumlahkan — jumlahnya disebut di bawah judul.'), hal: 'mcsAset' },
        satuan: function (n) { return U.rpShort(n); },
        data: data
      }) });
  }

  /** Lokasi yang paling banyak menunggak servis — dari mana harus mulai. */

  function kartuTelatLokasi(l) {
    var per = {};
    l.forEach(function (x) {
      var lid = lokasiAset(x);
      if (!lid) return;
      var v = per[lid] || (per[lid] = { n: 0, telat: 0 });
      v.n++;
      if (ASET.servisTerlewat(x)) v.telat++;
    });
    var data = Object.keys(per).filter(function (id) { return per[id].telat; })
      .map(function (id) {
        return { nama: window.LOKASI ? LOKASI.nama(id) : id,
                 nilai: per[id].telat,
                 ket: T('dari {n}').replace('{n}', per[id].n) };
      }).sort(function (a, b) { return b.nilai - a.nilai; });
    if (data.length < 2) return '';

    /* Sepuluh teratas, dan sisanya DISEBUT jumlahnya. Delapan puluh tujuh
       batang bukan grafik — ia daftar yang digambar. */
    var sisa = data.length - 10;
    return UI.card({ cls: 'mb-3', title: T('Lokasi dengan servis paling banyak tertunggak'),
      sub: sisa > 0
        ? T('Sepuluh teratas') + ' · ' +
          jml(sisa, T('1 lokasi lain juga punya tunggakan'),
              T('{n} lokasi lain juga punya tunggakan'))
        : T('Angka di kanan adalah alat yang lewat jadwal servis'),
      body: Chart.batang({
        warna: Chart.WARNA.s2,
        sumber: { teks: T('Alat yang tanggal servis berikutnya sudah lewat ' +
          'hari ini, dihitung per lokasi. Hanya sepuluh lokasi teratas yang ' +
          'digambar.'), hal: 'mcsAset' },
        satuan: function (n) { return jml(n, '1 alat', '{n} alat'); },
        data: data.slice(0, 10)
      }) });
  }

  /** Dua tabel yang bisa dipindai mata, bergantian lewat tab. */

  function kartuRingkasAset(l) {
    if (!l.length) return '';
    return UI.card({ cls: 'mb-3',
      title: T('Ringkasan'),
      sub: T('Angka yang bisa dibandingkan — daftar lengkapnya ada di bawah'),
      tools: UI.tabs([{ key: 'jenis', label: T('Per jenis') },
                      { key: 'lokasi', label: T('Per lokasi') }],
                     asTabel, 'as-tabel'),
      body: asTabel === 'lokasi' ? tabelAsetLokasi(l) : tabelAsetJenis(l) });
  }

  /** Sel jumlah yang menulis — alih-alih 0 — tanda pisah. Nol yang
      berjajar-jajar membuat angka yang bukan nol tenggelam di antaranya. */

  function selN(n, kelas) {
    if (!n) return '<span class="muted">—</span>';
    return kelas ? '<span class="' + kelas + '">' + U.num(n) + '</span>' : U.num(n);
  }

  function tabelAsetJenis(l) {
    var per = {};
    l.forEach(function (x) {
      var v = per[x.jenis] || (per[x.jenis] = { kode: x.jenis, n: 0, dipakai: 0,
        gudang: 0, buruk: 0, telat: 0, nilai: 0, belum: 0 });
      v.n++;
      if (x.keadaan === 'dipakai') v.dipakai++;
      if (x.keadaan === 'gudang') v.gudang++;
      if (x.keadaan === 'rusak' || x.keadaan === 'servis') v.buruk++;
      if (ASET.servisTerlewat(x)) v.telat++;
      var ek = ASET.ekonomi(x);
      if (ek && ek.siap) v.nilai += ek.nilaiBuku; else v.belum++;
    });
    var rows = Object.keys(per).map(function (kd) { return per[kd]; })
      .sort(function (a, b) { return b.n - a.n; });

    return UI.table([
      { h: T('Jenis'), r: function (x) {
        var j = ASET.jenis(x.kode);
        return j.ikon + ' ' + U.esc(T(j.nama)); } },
      { h: T('Jumlah'), cls: 'num', r: function (x) { return U.num(x.n); } },
      { h: T('Dipegang'), cls: 'num', r: function (x) { return selN(x.dipakai); } },
      { h: T('Di gudang'), cls: 'num', r: function (x) { return selN(x.gudang); } },
      { h: T('Rusak / diservis'), cls: 'num', r: function (x) {
        return selN(x.buruk, 'mcs-warn'); } },
      { h: T('Lewat servis'), cls: 'num', r: function (x) {
        return selN(x.telat, 'mcs-warn'); } },
      /* Nilai buku, bukan harga beli — alasan yang sama dengan kartu di
         atas. Alat yang datanya belum lengkap DISEBUTKAN, tidak dihitung
         nol: jumlah yang diam-diam kekurangan penyusun akan dibaca sebagai
         jumlah yang utuh. */
      { h: T('Nilai buku'), cls: 'num', r: function (x) {
        return U.rpShort(x.nilai) +
          (x.belum ? ' <i class="muted">+' + x.belum + '?</i>' : ''); } }
    ], rows, null, { sumber: {
      teks: T('Menghitung alat yang masih aktif, dikelompokkan per jenis. ' +
        'Alat yang sudah dilepas dari daftar tidak ikut. Nilai buku memakai ' +
        'penyusutan, bukan harga beli.') } });
  }

  function tabelAsetLokasi(l) {
    var per = {}, tanpa = { id: '', nama: T('Belum ditempatkan'), n: 0, telat: 0,
                            buruk: 0, nilai: 0, belum: 0 };
    l.forEach(function (x) {
      var lid = lokasiAset(x);
      var v = lid
        ? (per[lid] || (per[lid] = { id: lid,
            nama: window.LOKASI ? LOKASI.nama(lid) : lid,
            n: 0, telat: 0, buruk: 0, nilai: 0, belum: 0 }))
        : tanpa;
      v.n++;
      if (ASET.servisTerlewat(x)) v.telat++;
      if (x.keadaan === 'rusak' || x.keadaan === 'servis') v.buruk++;
      var ek = ASET.ekonomi(x);
      if (ek && ek.siap) v.nilai += ek.nilaiBuku; else v.belum++;
    });
    var rows = Object.keys(per).map(function (id) { return per[id]; });
    if (tanpa.n) rows.push(tanpa);
    /* Yang paling banyak terlewat servis di atas — itulah baris yang
       menuntut perbuatan, bukan yang alatnya paling banyak. */
    rows.sort(function (a, b) {
      if (b.telat !== a.telat) return b.telat - a.telat;
      return b.n - a.n;
    });

    return UI.table([
      { h: T('Lokasi'), r: function (x) {
        return x.id
          ? '<button class="tautan-kecil" data-act="as-f-lok" data-id="' + U.esc(x.id) +
            '">' + U.esc(x.nama) + '</button>'
          : '<span class="muted">' + U.esc(x.nama) + '</span>'; } },
      /* BUKAN kunci 'Alat' — itu sudah berarti "Tools" di kamus, dan di
         sini yang dimaksud adalah BERAPA BANYAK. Judul kolom tidak boleh
         memakai kata tunggal yang umum; artinya selalu sudah dipakai
         di tempat lain untuk hal yang berbeda. */
      { h: T('Jumlah alat'), cls: 'num', r: function (x) { return U.num(x.n); } },
      { h: T('Lewat servis'), cls: 'num', r: function (x) {
        return selN(x.telat, 'mcs-warn'); } },
      { h: T('Rusak / diservis'), cls: 'num', r: function (x) {
        return selN(x.buruk, 'mcs-warn'); } },
      { h: T('Nilai buku'), cls: 'num', r: function (x) {
        return U.rpShort(x.nilai) +
          (x.belum ? ' <i class="muted">+' + x.belum + '?</i>' : ''); } }
    ], rows);
  }

  function barisAset(x) {
    var jn = ASET.jenis(x.jenis);
    var kd = ASET.keadaan(x.keadaan);
    var p = x.pemegangId ? MCS.pekerjaSatu(x.pemegangId) : null;
    var terbuka = asBuka === x.id;
    var telat = ASET.servisTerlewat(x);
    var berikut = ASET.servisBerikut(x);
    var ek = ASET.ekonomi(x);

    return '<div class="wk-r' + (x.keadaan === 'rusak' || telat ? ' wk-r--lewat' : '') + '">' +
      '<button class="wk-r__h" data-act="as-buka" data-id="' + x.id + '" ' +
        'aria-expanded="' + terbuka + '">' +
        '<span class="wk-r__i">' + jn.ikon + '</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(x.nama) + '</b>' +
          '<span>' + U.esc(x.no) + ' · ' + U.esc(T(jn.nama)) +
            (x.merek ? ' · ' + U.esc(x.merek) : '') +
            (p ? ' · 🤝 ' + U.esc(p.nama) : '') +
          '</span>' +
          (telat
            ? '<span class="mcs-warn">🔧 ' + T('servis terlewat sejak') + ' ' +
              U.esc(U.tglPendek(berikut)) + '</span>'
            : (berikut
              ? '<span class="as-r__s">🔧 ' + T('servis berikutnya') + ' ' +
                U.esc(U.tglPendek(berikut)) + '</span>' : '')) +
          /* Habis masa manfaat BUKAN berarti rusak — banyak mesin masih
             bekerja baik sesudahnya. Ia berarti penggantinya layak masuk
             anggaran, dan itu keputusan yang diambil jauh sebelum mesinnya
             benar-benar mati. */
          (ek && ek.siap
            ? '<span class="as-r__n' + (ek.habis ? ' mcs-warn' : '') + '">💰 ' +
              U.rp(ek.nilaiBuku) +
              (ek.habis
                ? ' · ' + T('masa manfaat habis')
                : ' · ' + jml(ek.sisaBulan, '1 bulan lagi', '{n} bulan lagi')) +
              '</span>'
            : '') +
        '</span>' +
        '<span class="chip chip--' + kd.warna + '">' + kd.ikon + ' ' + T(kd.nama) + '</span>' +
        '<span class="wk-r__x">' + (terbuka ? '▾' : '▸') + '</span>' +
      '</button>' +
      (terbuka ? rincianAset(x) : '') +
    '</div>';
  }

  function rincianAset(x) {
    var p = x.pemegangId ? MCS.pekerjaSatu(x.pemegangId) : null;
    var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
    var berikut = ASET.servisBerikut(x);
    var rw = ASET.riwayat(x.id, 8);

    return '<div class="wk-d">' +
      '<div class="wk-d__k">' +
        kvKerja(T('Merek & model'), [x.merek, x.model].filter(Boolean).join(' ') || '—') +
        kvKerja(T('Nomor seri'), x.nomorSeri || '—') +
        kvKerja(T('Tanggal beli'), x.tglBeli ? U.tglPanjang(x.tglBeli) : '—') +
        kvKerja(T('Harga beli'), x.hargaBeli ? U.rp(x.hargaBeli) : '—') +
        kvKerja(T('Dipegang'), p ? p.nama : T('tidak ada pemegang')) +
        kvKerja(T('Ditempatkan'), a ? a.nama : T('gudang / tidak tetap')) +
        kvKerja(T('Servis tiap'), x.servisBulan
          ? jml(x.servisBulan, '1 bulan', '{n} bulan') : T('tidak dijadwalkan')) +
        /* KEAUSAN menurut jam operasi. Tidak ditampilkan sama sekali bila
           jenisnya memang tidak diukur begitu — baris “0%” pada troli hanya
           menjanjikan ukuran yang tidak pernah bergerak. */
        (function () {
          var au = ASET.ausJam(x);
          if (!au) return '';
          /* Angkanya lewat `v` (di-escape), yang bergaya lewat `extra`. */
          var pokok = U.num(Math.round(au.jam)) + ' / ' + U.num(au.umur) + ' ' +
            T('jam') + ' · ' + au.persen + '%';
          var tambahan = au.habis
            ? '<span class="mcs-warn">— ' + T('sudah melewati umur pakainya') + '</span>'
            : '<span class="tbl-sub">· ' + T('sisa') + ' ' +
              U.num(Math.round(au.sisa)) + ' ' + T('jam') + '</span>';
          /* DASARNYA DISEBUT. Angka perkiraan dan angka terukur yang tampil
             serupa akan sama-sama dipercaya — dan yang perkiraan tidak
             pantas dipercaya sekuat itu. */
          if (au.meragukan) {
            /* Persentase mustahil tidak ditampilkan sama sekali — lihat
               penjaga di ASET.ausJam(). */
            return kvKerja(T('Jam pakai'), T('belum bisa diperkirakan'),
              '<span class="tbl-sub">' +
                T('perkiraan dari jadwal melebihi umur alatnya — pola pemakaian ' +
                  'jenis ini tidak mengikuti frekuensi pembersihan rutin') +
              '</span>');
          }
          if (au.dasar === 'jadwal') {
            tambahan += ' <span class="chip chip--muted chip--xs">' +
              T('perkiraan dari jadwal') + '</span>';
            if (au.rincian) {
              /* Perhitungannya ditulis apa adanya, dan BENTUKNYA berbeda per
                 cara — blower tidak punya m² sama sekali, dan menampilkan
                 rumus luas untuknya akan menyesatkan. */
              var r = au.rincian, rum;
              if (r.cara === 'kering') {
                rum = U.esc(r.areaNama) + ' · ' + U.num(r.kunjunganBulan) + ' ' +
                  T('kunjungan/bulan') + ' × ' + U.num(r.jamPengeringan) + ' ' + T('jam');
              } else if (r.cara === 'berkala') {
                rum = U.esc(r.areaNama) + ' · ' + U.num(r.luas) + ' m² × ' +
                  U.num(r.berkalaPerBulan) + ' ' + T('kali berkala/bulan') + ' ÷ ' +
                  U.num(r.laju) + ' m²/' + T('jam');
              } else {
                rum = U.esc(r.areaNama) + ' · ' + U.num(r.luasBulan) + ' m²/' +
                  T('bulan') + ' ÷ ' + U.num(r.laju) + ' m²/' + T('jam');
              }
              if (r.berbagi > 1) {
                rum += ' ÷ ' + r.berbagi + ' ' + T('alat sejenis di area yang sama');
              }
              tambahan += '<div class="tbl-sub">' + rum + '</div>';
            }
          } else if (au.dasar === 'tidakTahu') {
            tambahan += ' <span class="tbl-sub">(' +
              T('belum dicatat dan belum bisa diperkirakan') + ')</span>';
          }
          return kvKerja(T('Jam pakai'), pokok, tambahan);
        })() +
        /* SERVIS MENURUT JAM, berdampingan dengan servis menurut bulan.
           Yang lebih dulu tercapai itulah yang berlaku — dan keduanya
           ditampilkan supaya yang membaca tahu mana yang sedang menghitung. */
        (function () {
          var pj = ASET.servisPerluJam(x);
          if (!pj) return '';
          /* Label DIBEDAKAN dari servis bulanan di atasnya: dua baris
             berjudul sama persis dengan angka berbeda terbaca sebagai data
             yang saling menyangkal. */
          var inti = U.num(Math.round(pj.jam)) + ' / ' + U.num(pj.selang) + ' ' + T('jam');
          var kelas = pj.terlewat || pj.segera ? 'mcs-warn' : 'tbl-sub';
          var pesan = pj.terlewat ? T('sudah waktunya diservis')
                    : pj.segera ? T('mendekati jadwal servis')
                    : T('sejak servis terakhir');
          /* Nol jam bukan berarti belum dipakai — bisa jadi tidak ada yang
             mencatatnya. Menyamakan keduanya menjanjikan pengawasan yang
             sebenarnya tidak berjalan. */
          var catat = pj.dasar === 'jadwal'
            ? ' <span class="chip chip--muted chip--xs">' + T('perkiraan dari jadwal') + '</span>'
            : (pj.belumAdaCatatan
                ? ' <span class="tbl-sub">(' + T('jam pakai belum pernah dicatat') + ')</span>'
                : '');
          return kvKerja(T('Servis tiap (jam)'), inti,
            '<span class="' + kelas + '">· ' + pesan + '</span>' + catat);
        })() +
        kvKerja(T('Servis terakhir'), x.servisTerakhir ? U.tglPanjang(x.servisTerakhir) : '—') +
        kvKerja(T('Servis berikutnya'), berikut ? U.tglPanjang(berikut) : '—') +
        kvKerja(T('Kode stiker'), x.kodePindai) +
      '</div>' +
      (x.catatan ? '<div class="wk-d__c">' + U.esc(x.catatan) + '</div>' : '') +

      ((x.foto || []).length
        ? '<div class="wk-d__f">' + (x.foto || []).map(function (f) {
            var src = DB.getPhoto(f);
            return src ? '<img src="' + U.esc(src) + '" data-act="zoom" data-id="' + f + '">' : '';
          }).join('') + '</div>' : '') +

      /* Buku besar, bukan kolom yang ditimpa: 'siapa yang pegang WAKTU ITU'
         adalah pertanyaan yang paling sering ditanyakan saat ada kerusakan. */
      (rw.length
        ? '<div class="wk-d__rw">' + rw.map(function (r) {
            var pe = ASET.peristiwa(r.peristiwa);
            return '<div>' + pe.ikon + ' <b>' + T(pe.nama) + '</b> · ' +
              U.esc(U.tglPendek(r.tgl)) +
              (r.pekerjaNama ? ' · ' + U.esc(r.pekerjaNama) : '') +
              (r.biaya ? ' · ' + U.esc(U.rp(r.biaya)) : '') +
              (r.catatan ? ' — ' + U.esc(r.catatan) : '') + '</div>';
          }).join('') + '</div>'
        : '') +

      '<div class="wk-d__b">' +
        (x.keadaan === 'gudang'
          ? '<button class="btn btn--primary btn--sm" data-act="as-serah" data-id="' + x.id + '">🤝 ' +
            T('Serahkan') + '</button>' : '') +
        (x.keadaan === 'dipakai'
          ? '<button class="btn btn--sm" data-act="as-kembali" data-id="' + x.id + '">📦 ' +
            T('Terima kembali') + '</button>' : '') +
        /* Jam pakai hanya bisa dicatat pada alat yang MEMANG diukur begitu.
           Tombol yang membuka kotak berisi “tidak diukur dengan jam operasi”
           adalah tombol yang membuang waktu orang yang mengkliknya. */
        (ASET.ausJam(x)
          ? '<button class="btn btn--ghost btn--sm" data-act="as-jam" data-id="' + x.id + '">⏱️ ' +
            T('Catat jam pakai') + '</button>' : '') +
        (x.keadaan === 'dipakai' || x.keadaan === 'gudang'
          ? '<button class="btn btn--ghost btn--sm" data-act="as-rusak" data-id="' + x.id + '">⛔ ' +
            T('Lapor rusak') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="as-servis" data-id="' + x.id + '">🔧 ' +
            T('Kirim servis') + '</button>' : '') +
        (x.keadaan === 'servis' || x.keadaan === 'rusak'
          ? '<button class="btn btn--primary btn--sm" data-act="as-selesai" data-id="' + x.id + '">✅ ' +
            T('Selesai diperbaiki') + '</button>' : '') +
        (x.keadaan !== 'lepas'
          ? '<button class="btn btn--ghost btn--sm" data-act="as-lepas" data-id="' + x.id + '">🗑️ ' +
            /* BUKAN kunci 'Lepas' — itu sudah dipakai sebagai "Remove"
               di tempat lain, dan di sini artinya melepas dari daftar aset. */
            T('Lepas dari daftar') + '</button>' : '') +
        '<button class="btn btn--ghost btn--sm" data-act="as-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="as-stiker" data-id="' + x.id + '">🏷️ ' +
          T('Stiker') + '</button>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------ kotak foto umum
     Satu komponen untuk setiap formulir yang menerima foto — peralatan, bahan
     habis pakai, dan apa pun sesudahnya.

     Dibuat bersama, bukan disalin, karena dua salinan kode yang hampir sama
     akan menyimpang pada perbaikan pertama: yang satu diperbaiki, yang lain
     tidak, dan tidak ada yang tahu sampai ada yang mengeluh fotonya hilang.

     NILAINYA DITAHAN DI VARIABEL, BUKAN DIBACA DARI DOM.

     UI.formModal menutup dan MEMBONGKAR modalnya sebelum janjinya selesai,
     jadi membaca isi kotak di dalam .then() selalu mendapat null. Kolom biasa
     tidak kena karena U.readForm membacanya sebelum modal ditutup — apa pun
     yang berada di luar "fields" harus menahannya sendiri. */

  function ruasMasaManfaat(x) {
    var bulan = x && x.manfaatBulan !== undefined && x.manfaatBulan !== null
      ? Number(x.manfaatBulan) : null;
    /* Ditampilkan dalam TAHUN bila memang bulat tahun — "5 tahun" lebih mudah
       diperiksa mata daripada "60", dan orang yang membacanya sedang
       memeriksa, bukan menghitung. */
    var pakaiTahun = bulan !== null && bulan >= 12 && bulan % 12 === 0;
    var nilai = bulan === null ? '' : (pakaiTahun ? bulan / 12 : bulan);
    /* Ditahan sejak dialog digambar: peralatan yang diubah tanpa menyentuh
       kolom ini harus tetap menyimpan masa manfaatnya yang lama. */
    manfaatSementara = bulan === null ? '' : bulan;
    return '<div class="field"><label for="as-mm">' + T('Masa manfaat ekonomis') + '</label>' +
      '<div class="as-mm">' +
        '<input class="input" id="as-mm" type="number" min="0" step="1" ' +
          'value="' + nilai + '" placeholder="' + T('mis. 5') + '">' +
        '<select class="input" id="as-mm-s">' +
          '<option value="tahun"' + (pakaiTahun || bulan === null ? ' selected' : '') +
            '>' + T('Tahun') + '</option>' +
          '<option value="bulan"' + (!pakaiTahun && bulan !== null ? ' selected' : '') +
            '>' + T('Bulan') + '</option>' +
        '</select>' +
      '</div>' +
      '<div class="hint">' +
        T('Berapa lama alat ini diperkirakan masih layak dipakai. Dipakai untuk ' +
          'menghitung nilai buku dan kapan penggantinya perlu dianggarkan — ' +
          'bukan perhitungan pajak. Kosongkan untuk memakai bawaan jenisnya.') +
      '</div>' +
      '<div class="tbl-sub mt-1" id="as-mm-h"></div>' +
    '</div>';
  }

  /* Angka yang muncul begitu harga dan masa manfaatnya terisi. Diperlihatkan
     SAAT MENGISI, bukan setelah disimpan: penyusutan Rp2 juta sebulan untuk
     mesin yang seharusnya Rp200 ribu adalah salah ketik yang hanya ketahuan
     bila angkanya terlihat pada saat itu juga. */

  function hitungTampilManfaat() {
    var el = document.getElementById('as-mm-h');
    if (!el) return;
    var n = Number((document.getElementById('as-mm') || {}).value) || 0;
    var sat = (document.getElementById('as-mm-s') || {}).value;
    var harga = Number((document.querySelector('[name="hargaBeli"]') || {}).value) || 0;
    var bulan = sat === 'bulan' ? n : n * 12;
    if (!bulan || !harga) { el.innerHTML = ''; return; }
    el.innerHTML = T('Penyusutan') + ' <b>' + U.rp(Math.round(harga / bulan)) + '</b> ' +
      T('per bulan') + ' · ' + jml(bulan, '1 bulan', '{n} bulan');
  }

  /* Nilainya DITAHAN di variabel, bukan dibaca dari DOM saat menyimpan.

     UI.formModal menutup dan MEMBONGKAR modalnya sebelum janjinya selesai,
     jadi getElementById di dalam .then() selalu mengembalikan null. Akibatnya
     bukan galat melainkan sesuatu yang lebih buruk: nilainya diam-diam jatuh
     ke bawaan jenisnya, dan alat yang diisi 5 tahun tersimpan 8 tahun tanpa
     ada yang tahu. Kolom formulir biasa tidak kena karena U.readForm membaca
     isinya SEBELUM modal ditutup — yang di luar `fields` harus menahannya
     sendiri, persis seperti foto. */

  var manfaatSementara = '';

  function tahanMasaManfaat() {
    var e = document.getElementById('as-mm');
    if (!e || e.value === '') { manfaatSementara = ''; return; }
    var n = Math.max(0, Math.round(Number(e.value) || 0));
    var sat = (document.getElementById('as-mm-s') || {}).value;
    manfaatSementara = sat === 'bulan' ? n : n * 12;
  }

  function bacaMasaManfaat() { return manfaatSementara; }

  function dialogAset(id) {
    var k = korp();
    var x = id ? ASET.satu(id) : null;
    var a = MCS.area(k.id);

    UI.formModal({
      title: x ? T('Ubah peralatan') : T('Daftarkan peralatan'),
      sub: x ? x.no : U.esc(k.nama), size: 'wide',
      okText: x ? T('Simpan') : T('Daftarkan'),
      onMount: function (root) {
        pasangAksiFoto(root);
        /* Angka penyusutan ikut berubah saat harga atau masa manfaatnya
           diketik — ketiganya saling bergantung, dan memperlihatkan
           hasilnya hanya setelah disimpan berarti salah ketik baru
           ketahuan setelah masuk ke data. */
        var perbarui = function () { tahanMasaManfaat(); hitungTampilManfaat(); };
        ['as-mm', 'as-mm-s'].forEach(function (id) {
          var e = document.getElementById(id);
          if (e) { e.addEventListener('input', perbarui);
                   e.addEventListener('change', perbarui); }
        });
        var h = root.querySelector('[name="hargaBeli"]');
        if (h) h.addEventListener('input', hitungTampilManfaat);
        hitungTampilManfaat();
      },
      fields: [
        { type: 'html', html: kotakFoto('aset', x ? x.foto : [], {
            label: T('Foto peralatan'), maks: 4,
            hint: T('Badan mesin, pelat nomor seri, dan kerusakan yang sudah ada saat ' +
              'diterima. Tanpa foto serah terima, setiap lecet menjadi perdebatan ' +
              'tanpa bukti.') }) },
        { name: 'nama', label: T('Nama peralatan'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Mesin poles lantai 17 inci') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: x ? x.jenis : 'vacuum',
          options: ASET.JENIS.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }),
          hint: T('Jenis menentukan jadwal servis bawaannya.') },
        { name: 'merek', label: T('Merek'), value: x ? x.merek : '' },
        { name: 'model', label: T('Model'), value: x ? x.model : '' },
        { name: 'nomorSeri', label: T('Nomor seri'), value: x ? x.nomorSeri : '',
          hint: T('Yang tertera di badan mesin. Dibutuhkan saat klaim garansi.') },

        { type: 'html', html: '<div class="mcs-fs">' + T('Perolehan & perawatan') + '</div>' },
        { name: 'tglBeli', label: T('Tanggal beli'), type: 'date',
          value: x ? (x.tglBeli || '') : U.today() },
        { name: 'hargaBeli', label: T('Harga beli'), type: 'number', min: 0,
          value: x ? x.hargaBeli : '' },
        { type: 'html', html: ruasMasaManfaat(x) },
        /* Umur JAM di sebelah umur BULAN, karena keduanya menjawab pertanyaan
           yang berbeda: bulan untuk pembukuan, jam untuk keausan mesinnya.
           Bawaan jenisnya muncul sebagai placeholder — terlihat, tetapi tidak
           ikut tersimpan bila kolomnya dibiarkan kosong, sehingga alat yang
           mengikuti bawaan akan ikut berubah bila bawaannya kelak diperbaiki. */
        { name: 'umurJam', label: T('Umur pakai (jam operasi)'), type: 'number', min: 0,
          value: x ? (x.umurJam || '') : '',
          placeholder: (function () {
            var jk = x ? x.jenis : (ASET.JENIS[0] && ASET.JENIS[0].kode);
            var jn = ASET.jenis(jk);
            return jn && jn.umurJam ? String(jn.umurJam) : T('tidak berlaku untuk jenis ini');
          })(),
          hint: T('Kosongkan untuk memakai bawaan jenisnya. Isi 0 bila alat ini ' +
            'memang tidak diukur dengan jam operasi — troli, tangga, dan radio ' +
            'tidak punya motor yang berputar.') },
        { name: 'servisBulan', label: T('Servis tiap berapa bulan'), type: 'number', min: 0,
          value: x ? x.servisBulan : '',
          hint: T('Kosongkan untuk memakai bawaan jenisnya. Isi 0 bila tidak perlu ' +
            'servis berkala. Buku manual pabrikan lebih tahu daripada bawaan mana pun.') },
        { name: 'servisTerakhir', label: T('Servis terakhir'), type: 'date',
          value: x ? (x.servisTerakhir || '') : '',
          hint: T('Hitungan jatuh tempo dimulai dari sini, bukan dari tanggal beli.') },
        { name: 'areaId', label: T('Ditempatkan di'), type: 'select',
          value: x ? (x.areaId || '') : '',
          options: [{ value: '', label: '— ' + T('gudang / tidak tetap') + ' —' }]
            .concat(a.map(function (y) {
              return { value: y.id, label: MCS.jenisArea(y.jenis).ikon + ' ' + y.nama }; })) },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2,
          value: x ? x.catatan : '' }
      ]
    }).then(function (d) {
      if (!d) return;
      /* Keduanya bukan kolom formulir biasa: foto dikumpulkan di kotaknya
         sendiri, dan masa manfaat perlu disatukan dari angka + satuannya. */
      d.foto = ambilFoto('aset');
      d.manfaatBulan = bacaMasaManfaat();
      var r = x ? ASET.ubah(id, d) : ASET.daftar(k.id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Peralatan diperbarui') : T('Peralatan didaftarkan') +
        (r.aset ? ' · ' + r.aset.no : ''), 'ok');
      APP.refresh();
    });
  }

  function dialogSerah(id) {
    var k = korp();
    var x = ASET.satu(id);
    var p = MCS.pekerja(k.id);
    if (!x) return;
    UI.formModal({
      title: T('Serah terima peralatan'), sub: x.nama, okText: T('Serahkan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Sejak diserahkan, peralatan ini tercatat atas nama penerimanya sampai ' +
              'dikembalikan. Itulah satu-satunya cara kehilangan bisa ditelusuri.'), '🤝') },
        { name: 'pekerjaId', label: T('Diserahkan kepada'), type: 'select',
          value: p[0] && p[0].id,
          options: p.map(function (y) {
            return { value: y.id, label: MCS.jenisPekerja(y.jenis).ikon + ' ' + y.nama }; }) },
        { name: 'catatan', label: T('Catatan keadaan barang'), type: 'textarea', rows: 2,
          placeholder: T('mis. Kabel agak terkelupas di dekat colokan.') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = ASET.serah(id, d.pekerjaId, APP.user, d);
      /* Peringatan disampaikan SESUDAH perbuatannya, bukan sebagai
         penghalang — lihat alasannya di ASET.serah(). Yang penting ia
         terlihat, dan toast peringatan bertahan lebih lama daripada toast
         biasa karena memang perlu dibaca. */
      if (r && r.peringatan && r.peringatan.length) {
        UI.toast('⚠️ ' + r.peringatan.map(function (t2) { return T(t2); }).join(' '), 'warn');
      }
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Peralatan diserahkan.'), 'ok');
      APP.refresh();
    });
  }

  function dialogAsetCatatan(id, kode) {
    var x = ASET.satu(id);
    if (!x) return;
    var judul = { kembali: T('Terima kembali'), rusak: T('Lapor kerusakan'),
                  servis: T('Kirim ke servis'), lepas: T('Lepas peralatan') }[kode];
    var wajib = kode === 'rusak' || kode === 'lepas';

    UI.formModal({
      title: judul, sub: x.nama, okText: judul,
      fields: [
        (kode === 'lepas'
          ? { type: 'html', html: UI.alert('warn',
              T('Peralatan yang dilepas tidak dihapus — riwayatnya tetap tersimpan. ' +
                'Yang berubah hanya keadaannya, supaya ia keluar dari daftar aktif.'), '🗑️') }
          : { type: 'html', html: '' }),
        { name: 'catatan', label: kode === 'rusak' ? T('Apa yang rusak')
            : (kode === 'lepas' ? T('Alasan pelepasan') : T('Catatan')),
          type: 'textarea', rows: 3, required: wajib,
          placeholder: kode === 'rusak' ? T('mis. Motor tidak menyala, bau hangus.')
            : (kode === 'lepas' ? T('mis. Dijual ke pengepul, sudah tidak ekonomis.') : '') }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = kode === 'kembali' ? ASET.kembali(id, APP.user, d)
            : kode === 'rusak' ? ASET.lapoRusak(id, APP.user, d)
            : kode === 'servis' ? ASET.mulaiServis(id, APP.user, d)
            : ASET.lepas(id, APP.user, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Tercatat.'), 'ok');
      APP.refresh();
    });
  }

  function dialogSelesaiServis(id) {
    var x = ASET.satu(id);
    if (!x) return;
    UI.formModal({
      title: T('Selesai diperbaiki'), sub: x.nama, okText: T('Simpan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Tanggal ini yang mengulang hitungan servis berkala — bukan tanggal ' +
              'beli, dan bukan tanggal laporan rusak.'), '🔧') },
        { name: 'tgl', label: T('Tanggal selesai'), type: 'date', value: U.today() },
        { name: 'biaya', label: T('Biaya servis'), type: 'number', min: 0, value: '' },
        { name: 'catatan', label: T('Apa yang dikerjakan'), type: 'textarea', rows: 2 }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = ASET.selesaiServis(id, APP.user, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Servis dicatat.'), 'ok');
      APP.refresh();
    });
  }

  /**
   * Catat jam operasi yang BARU dipakai.
   *
   * Kalimat pada kotaknya menyebut hal itu terang-terangan, karena inilah
   * salah paham yang paling mudah terjadi: mesin punya penunjuk jam di
   * badannya, dan menyalin angka penunjuk ke kolom penambah akan
   * melipatgandakan totalnya setiap kali dicatat — tanpa satu pun galat,
   * dan alat yang masih separuh umur terbaca sudah habis.
   */
  function dialogCatatJam(id) {
    var x = ASET.satu(id);
    if (!x) return;
    var au = ASET.ausJam(x);
    UI.formModal({
      title: T('Catat jam pakai'), sub: x.nama, okText: T('Simpan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Jam yang BARU dipakai, bukan angka penunjuk pada mesinnya.'), '⏱️') },
        { name: 'jam', label: T('Jam pakai'), type: 'number', min: 0, step: 'any',
          value: '', required: true,
          hint: au
            ? T('Sekarang') + ': ' + U.num(Math.round(au.jam)) + ' / ' +
              U.num(au.umur) + ' ' + T('jam') + ' (' + au.persen + '%)'
            : T('Jenis ini tidak diukur dengan jam operasi — catatannya tetap ' +
                'tersimpan, tetapi tidak dibandingkan dengan umur apa pun.') },
        { name: 'tgl', label: T('Tanggal'), type: 'date', value: U.today() },
        { name: 'catatan', label: T('Catatan'), value: '' }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = ASET.catatJam(id, d.jam, APP.user, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      var b = ASET.ausJam(ASET.satu(id));
      UI.toast(T('Tercatat.') + (b ? ' ' + U.num(Math.round(b.jam)) + ' / ' +
        U.num(b.umur) + ' ' + T('jam') + ' · ' + b.persen + '%' : ''), 'ok');
      APP.refresh();
    });
  }

  /**
   * Parameter yang dipakai memperkirakan jam operasi mesin.
   *
   * Angka bawaannya kisaran industri, dan kisaran industri tidak pernah
   * persis menggambarkan satu gedung: yang memakai jet cleaner dengan surface
   * cleaner air panas dua kali lebih cepat daripada yang memakai tongkat.
   * Buku manual pabrikan yang dipakai gedungnya selalu lebih tahu.
   *
   * Yang dikosongkan — mesin steam, lama pengeringan blower — memang belum
   * ada rujukannya, dan kosongnya berarti fiturnya tidak berjalan untuk jenis
   * itu. Itu jauh lebih baik daripada angka karangan yang terlihat resmi.
   */
  function dialogParamMesin() {
    var k = korp();
    if (!k) return;
    var c = ASET.konfig(k.id);
    /* Hanya jenis yang MEMANG diukur per meter persegi. Menawarkan kolom
       laju untuk troli hanya mengundang orang mengisinya. */
    var perM2 = ASET.JENIS.filter(function (j) {
      var cara = ASET.CARA_JAM[j.kode];
      return cara === 'rutin' || cara === 'berkala';
    });
    UI.formModal({
      title: T('Parameter mesin'), size: 'wide', okText: T('Simpan'),
      sub: T('Dipakai memperkirakan jam operasi dari jadwal pembersihan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Angka bawaan diambil dari kisaran industri yang dipublikasikan. ' +
              'Isi dengan angka dari buku manual mesin Anda bila ada — itu ' +
              'selalu lebih tepat. Kosongkan untuk kembali ke bawaan.'), '⚙️') },
        { type: 'html', html: '<div class="mcs-fs">' + T('Laju mesin (m² per jam operasi)') +
          '<span>' + T('Berapa meter persegi yang diselesaikan mesin ini dalam ' +
            'satu jam menyala. Kosong = jam mesin jenis ini tidak diperkirakan.') +
          '</span></div>' }
      ].concat(perM2.map(function (j) {
        return { name: 'laju_' + j.kode,
          label: j.ikon + '  ' + T(j.nama) +
            (ASET.CARA_JAM[j.kode] === 'berkala' ? '  ·  ' + T('berkala') : ''),
          type: 'number', min: 0, value: c.laju[j.kode] || '' };
      })).concat([
        { type: 'html', html: '<div class="mcs-fs">' + T('Blower pengering') +
          '<span>' + T('Blower tidak bekerja per meter persegi — ia menyala ' +
            'selama lantai perlu kering. Karena itu satuannya jam per kali, ' +
            'dan luas areanya tidak ikut dihitung.') + '</span></div>' },
        { name: 'jamPengeringan', label: T('Jam menyala tiap kali pengeringan'),
          type: 'number', min: 0, step: 'any', value: c.jamPengeringan || '',
          hint: T('Kosong atau 0 berarti jam blower tidak diperkirakan sama sekali.') },
        { name: 'porsiPengeringan', label: T('Bagian kunjungan yang perlu dikeringkan'),
          type: 'number', min: 0, max: 1, step: 'any', value: c.porsiPengeringan,
          hint: T('1 = setiap kali dibersihkan; 0,3 = tiga dari sepuluh kali. ' +
            'Lantai yang hanya disapu tidak perlu dikeringkan.') }
      ])
    }).then(function (d) {
      if (!d) return;
      var laju = {};
      perM2.forEach(function (j) { laju[j.kode] = d['laju_' + j.kode]; });
      var r = ASET.simpanKonfig(k.id, { laju: laju,
        jamPengeringan: d.jamPengeringan, porsiPengeringan: d.porsiPengeringan });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Parameter mesin disimpan.'), 'ok');
      APP.refresh();
    });
  }

  /** Stiker kode untuk ditempel di badan mesin. */

  function stikerAset(id) {
    var x = ASET.satu(id);
    var k = korp();
    if (!x) return;
    UI.modal({
      title: T('Stiker peralatan'), sub: x.nama,
      body: '<div class="tag-cetak" id="as-stiker">' +
          '<div class="tag-cetak__h">' + U.esc((k && k.nama) || 'EXOCLEAN') + '</div>' +
          '<div class="tag-cetak__n">' + U.esc(x.nama) + '</div>' +
          '<div class="tag-cetak__sub">' + U.esc(x.no) +
            (x.nomorSeri ? ' · ' + U.esc(x.nomorSeri) : '') + '</div>' +
          '<div class="tag-cetak__q">' +
            QR.svg(x.kodePindai, { ukuran: 200, alt: x.nama }) +
          '</div>' +
          '<div class="tag-cetak__k">' + U.esc(x.kodePindai) + '</div>' +
          '<div class="tag-cetak__p">' +
            T('Milik gedung. Jangan dibawa keluar tanpa izin.') +
          '</div>' +
        '</div>' +
        '<p class="tbl-sub mt-2">' +
          T('Tempel di badan mesin, bukan di kabel atau selang — keduanya paling ' +
            'sering diganti.') + '</p>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="as-stiker-cetak">🖨️ ' + T('Cetak') + '</button>',
      actions: { 'as-stiker-cetak': function () { cetak('cetak-tag'); } }
    });
  }

  function cetakDaftarAset() {
    var k = korp();
    if (!k) return;
    /* MENGIKUTI penyaring yang sedang terpasang di layar.

       Sebelumnya tombol ini selalu mencetak seluruh daftar. Pada satu
       gedung itu tidak terasa; pada 87 cabang, orang yang menyaring ke satu
       cabang berisi enam alat menekan Cetak dan menerima 1.326 baris.
       Kertas yang keluar tidak sesuai dengan layar yang dilihatnya, dan
       ia baru tahu sesudah tercetak. */
    var daftar = saringAset(
      lingkupAset(ASET.semua(k.id, { semua: asSaring === 'semua' })));

    /* Keterangan di bawah judul MENYEBUTKAN penyaringnya. Kertas yang
       berpindah tangan tidak membawa serta layar tempat ia dibuat; tanpa
       baris ini, daftar sebagian tidak bisa dibedakan dari daftar utuh. */
    var sub = [];
    sub.push(asSaring === 'semua' ? T('Termasuk yang sudah dilepas')
      : (asSaring === 'telat' ? T('Hanya yang lewat jadwal servis')
      : (asSaring === 'rusak' ? T('Hanya yang rusak atau sedang diservis')
      : T('Yang masih aktif'))));
    if (asJenis !== 'semua') sub.push(T(ASET.jenis(asJenis).nama));
    if (asLokasi !== 'semua' && window.LOKASI) sub.push(LOKASI.nama(asLokasi));
    sub.push(jml(daftar.length, '1 alat', '{n} alat'));

    cetakDaftar({
      judul: T('Daftar Peralatan'),
      sub: sub.join(' · '),
      baris: daftar,
      kolom: [
        { h: T('No'), r: function (x) { return x.no; } },
        { h: T('Nama'), r: function (x) { return x.nama; } },
        { h: T('Jenis'), r: function (x) { return T(ASET.jenis(x.jenis).nama); } },
        { h: T('Merek & model'), r: function (x) {
          return [x.merek, x.model].filter(Boolean).join(' ') || '—'; } },
        { h: T('Nomor seri'), r: function (x) { return x.nomorSeri || '—'; } },
        { h: T('Kode stiker'), r: function (x) { return x.kodePindai; } },
        { h: T('Keadaan'), r: function (x) { return T(ASET.keadaan(x.keadaan).nama); } },
        { h: T('Dipegang'), r: function (x) {
          var p = x.pemegangId ? MCS.pekerjaSatu(x.pemegangId) : null;
          return p ? p.nama : '—'; } },
        { h: T('Tanggal beli'), r: function (x) { return x.tglBeli || '—'; } },
        { h: T('Harga beli'), num: true, r: function (x) {
          return x.hargaBeli ? U.num(x.hargaBeli) : ''; } },
        { h: T('Servis berikutnya'), r: function (x) {
          return ASET.servisBerikut(x) || '—'; } },
        { h: T('Diperiksa fisik'), r: function () { return ''; } }
      ],
      kaki: T('Kolom terakhir dikosongkan untuk opname fisik — dicentang saat ' +
        'barangnya benar-benar dilihat, bukan saat namanya dibaca.')
    });
  }

  function mountAset(root) {
    /* Tiap penyaring yang BERUBAH mengembalikan daftar ke halaman pertama.
       Tanpa ini, orang yang sudah menekan 'Tampilkan 40 lagi' lima kali
       lalu memilih satu lokasi akan melihat 200 baris kosong di bawah
       hasilnya — atau lebih buruk, mengira penyaringnya tidak bekerja. */
    function ulangDaftar() { asBatas = AS_HAL; asBuka = null; APP.refresh(); }

    delegasi(root, {
      'as-saring': function (el) {
        asSaring = el.getAttribute('data-key');
        /* Berpindah lingkup MELEPAS pilihan yang tidak ada lagi di dalamnya.
           Menyimpannya membuat orang melihat daftar kosong dan menyimpulkan
           tabnya rusak — padahal yang kosong adalah irisan dua penyaring
           yang salah satunya tidak pernah ia sadari masih menyala. */
        var k = korp();
        if (k) {
          var ada = lingkupAset(ASET.semua(k.id, { semua: asSaring === 'semua' }));
          if (asJenis !== 'semua' &&
              !ada.some(function (x) { return x.jenis === asJenis; })) asJenis = 'semua';
          if (asLokasi !== 'semua' &&
              !ada.some(function (x) { return lokasiAset(x) === asLokasi; })) {
            asLokasi = 'semua';
          }
        }
        ulangDaftar();
      },
      'as-tabel': function (el) { asTabel = el.getAttribute('data-key'); APP.refresh(); },
      'as-f-jenis': function (el) { asJenis = el.value; ulangDaftar(); },
      'as-f-lokasi': function (el) { asLokasi = el.value; ulangDaftar(); },
      /* Menekan nama lokasi di tabel ringkasan MENYARING daftarnya. Tabel
         yang menunjukkan masalah tetapi tidak bisa membawa ke sana memaksa
         orang mencari ulang di daftar sepanjang seribu baris. */
      'as-f-lok': function (el) { asLokasi = el.getAttribute('data-id'); ulangDaftar(); },
      'as-f-bersih': function () { asJenis = 'semua'; asLokasi = 'semua'; ulangDaftar(); },
      'as-lihat-telat': function () {
        asSaring = 'telat'; asJenis = 'semua'; asLokasi = 'semua'; ulangDaftar();
      },
      'as-lagi': function () { asBatas += AS_HAL; APP.refresh(); },
      'as-buka': function (el) {
        var id = el.getAttribute('data-id');
        asBuka = asBuka === id ? null : id;
        APP.refresh();
      },
      'as-baru': function () { dialogAset(null); },
      'as-ubah': function (el) { dialogAset(el.getAttribute('data-id')); },
      'as-serah': function (el) { dialogSerah(el.getAttribute('data-id')); },
      'as-kembali': function (el) { dialogAsetCatatan(el.getAttribute('data-id'), 'kembali'); },
      'as-rusak': function (el) { dialogAsetCatatan(el.getAttribute('data-id'), 'rusak'); },
      'as-servis': function (el) { dialogAsetCatatan(el.getAttribute('data-id'), 'servis'); },
      'as-jam': function (el) { dialogCatatJam(el.getAttribute('data-id')); },
      'as-lepas': function (el) { dialogAsetCatatan(el.getAttribute('data-id'), 'lepas'); },
      'as-selesai': function (el) { dialogSelesaiServis(el.getAttribute('data-id')); },
      'as-stiker': function (el) { stikerAset(el.getAttribute('data-id')); },
      'as-param': dialogParamMesin,
      'as-cetak': cetakDaftarAset,
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    });
    Chart.pasang(root);
  }

  /* ================================================ KESELAMATAN KERJA (K3)

     Kebersihan adalah pekerjaan berisiko tinggi yang jarang diperlakukan
     demikian: terpeleset di lantai yang baru dipel sendiri, bahan kimia yang
     tercampur, kerja di ketinggian. Sebelumnya MCS tidak menyimpan satu pun
     catatan keselamatan.
   */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsAset", { label: 'Peralatan', icon: '🧰', grup: 'Pengaturan',
      sub: 'Mesin, troli, tangga — pemegang dan jadwal servisnya',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        var s = ASET.statistik(k.id);
        return (s.rusak + s.terlewat.length) || null;
      },
      render: renderAset, mount: mountAset });
})();
