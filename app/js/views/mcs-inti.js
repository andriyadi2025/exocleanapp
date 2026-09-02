/* ==========================================================================
   views/mcs-inti.js — pembantu bersama seluruh layar MCS
   --------------------------------------------------------------------------
   KENAPA BERKAS INI ADA

   Seluruh layar MCS dulu tinggal dalam SATU berkas sepanjang 15.166 baris.
   Berkas sebesar itu bukan sekadar tidak nyaman dibaca: ia membuat setiap
   perubahan kecil menuntut pencarian di lima belas ribu baris, dan membuat
   dua orang yang menyunting dua layar berbeda selalu bertabrakan di berkas
   yang sama.

   Yang dipecah BUKAN kodenya, melainkan tempatnya. Tidak satu baris pun isi
   fungsi diubah ketika pemecahan ini dikerjakan — dibuktikan dengan sidik
   jari keluaran 192 halaman (tiga peran x dua bahasa) yang identik sebelum
   dan sesudahnya.

   APA YANG TINGGAL DI SINI

   Yang dipakai LEBIH DARI SATU berkas layar. Bukan "yang terasa umum" —
   dihitung dari graf pemakaian, supaya tidak ada yang naik ke sini hanya
   karena namanya terdengar seperti pembantu.

   ATURAN YANG TIDAK BOLEH DILANGGAR

   Var yang BISA DITULIS tidak boleh berada di sini bila penulisnya ada di
   berkas lain. Berkas layar mengambil pembantu dengan `var x = VMCS.x`, dan
   penugasan pada salinan lokal itu tidak akan pernah terlihat oleh siapa
   pun — gagal diam-diam, tanpa satu pun galat. Pembagian berkas dipilih
   justru supaya tiap var yang bisa ditulis sekamar dengan penulisnya; bila
   sebuah layar baru melanggarnya, pindahkan seluruh kelompok penulisnya ke
   sini, jangan salin varnya.
   ========================================================================== */
var VMCS = (function () {
  'use strict';
  var T = function (s) { return I18N.t(s); };

  function kop() { return APP.user && APP.user.korporatId; }

  function korp() { return MCS.korporatUser(APP.user); }

  /**
   * U.delegate yang menghormati peran — dipakai di SELURUH halaman MCS.
   *
   * Ada satu tempat ini supaya tidak perlu menaruh pemeriksaan di tiga ratus
   * tombol. Yang perannya tidak boleh mengubah — hari ini hanya Auditor —
   * tetap bisa membuka, menyaring, dan mencetak; yang ditahan hanya aksi
   * yang kata kerjanya mengubah sesuatu.
   *
   * Ditahan DI SINI, bukan dengan menyembunyikan tombolnya: tombol yang
   * hilang membuat orang mengira aplikasinya rusak, sedangkan tombol yang
   * menjawab “Anda hanya boleh melihat” mengajari perannya sendiri.
   */

  function delegasi(root, peta) {
    if (!window.MCSAKSES || MCSAKSES.bolehTulis(APP.user)) {
      return U.delegate(root, peta);
    }
    var jaga = {};
    Object.keys(peta).forEach(function (kunci) {
      jaga[kunci] = MCSAKSES.aksiMengubah(kunci)
        ? function () {
            /* Sebabnya diambil SAAT ditekan, bukan saat halaman digambar:
               lingkup bisa dilengkapi admin di sela-sela, dan pesan yang
               dibekukan saat menggambar akan menyalahkan pengaturan yang
               sudah benar. */
            var sb = MCSAKSES.sebabTakBolehTulis(APP.user);
            UI.toast(sb ? sb.pesan : T('Tidak boleh mengubah.'), 'err');
          }
        : peta[kunci];
    });
    return U.delegate(root, jaga);
  }

  /* ============================================================== BERANDA */

  /* ========================================================== BERANDA

     Dua kolom, bukan satu tumpukan panjang.

     Kolom kiri menjawab "apa yang harus dikerjakan hari ini"; rel kanan
     menjawab "apa yang salah sekarang". Keduanya berbeda pertanyaan, dan
     menumpuknya dalam satu kolom membuat yang kedua selalu berada di bawah
     lipatan layar — terlihat hanya oleh orang yang sudah menggulir, padahal
     justru itulah yang tidak boleh menunggu ditemukan.

     Empat angka kepala dipadatkan menjadi satu strip setinggi 72 piksel,
     bukan empat kartu setinggi 200. Angkanya tetap besar karena dibaca
     sekilas dari jauh; yang dibuang kotaknya, bukan angkanya.
   */

  /**
   * Satu angka yang menjawab pertanyaan yang TIDAK dijawab oleh '100% selesai':
   * apakah hasilnya bersih.
   *
   * Batangnya dibaca terbalik dari kebiasaan — makin TINGGI makin buruk,
   * karena skala APPA 1 berarti terbaik. Itu disebut di layar, bukan
   * dibiarkan ditebak.
   */
  function kartuMutu(k) {
    var sampai = U.today();
    var dari = U.iso(U.addDays(new Date(sampai + 'T00:00:00'), -30));
    var s = MCS.statistikMutu(k.id, dari, sampai);

    if (!s.jumlah) {
      return '<div class="card bd-mu">' +
          '<div class="bd-mu__h"><h3>' + T('Mutu 30 hari') + '</h3></div>' +
          '<div class="bd-mu__kosong">' +
            T('Belum ada inspeksi 30 hari terakhir. Tanpa penilaian dari orang ' +
              'yang tidak mengerjakan, yang tercatat hanyalah pengakuan sendiri.') +
            '<button class="btn btn--sm mt-2" data-act="mcs-ke" data-h="mcsInspeksi">' +
              T('Inspeksi Baru') + '</button>' +
          '</div>' +
        '</div>';
    }

    var m = MCS.mutu(s.rata);
    /* Dua belas inspeksi terakhir, urut waktu — bukan dua belas hari.
       Hari tanpa inspeksi bukan hari bermutu nol; ia hari tanpa data. */
    var bar = MCS.inspeksi(k.id, { dari: dari, sampai: sampai })
      .slice(0, 12).reverse();

    return '<div class="card bd-mu">' +
        '<div class="bd-mu__h">' +
          '<h3>' + T('Mutu 30 hari') + '</h3>' +
          '<span class="tbl-sub">' + T('skala APPA') + '</span>' +
        '</div>' +
        '<div class="bd-mu__r">' +
          '<div class="bd-mu__v bd-mu__v--' + m.warna + '">' + U.esc(String(s.rata)) + '</div>' +
          '<div class="bd-mu__g">' + bar.map(function (x) {
            return '<i class="' + (x.skor >= 4 ? 'buruk' : '') + '" ' +
              'style="height:' + Math.round(x.skor / 5 * 100) + '%" ' +
              'title="' + U.esc(x.tgl + ' · ' + T(MCS.mutu(x.skor).nama)) + '"></i>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="bd-mu__k">' + U.esc(T(m.nama)) + ' · ' +
          T('1 terbaik, 5 terburuk') +
          (s.areaBelumDinilai
            ? ' · ' + jml(s.areaBelumDinilai, T('1 area belum pernah dinilai'),
                T('{n} area belum pernah dinilai'))
            : '') +
        '</div>' +
      '</div>';
  }

  function jml(n, satu, banyak) {
    return n === 1 ? T(satu) : T(banyak).replace('{n}', U.num(n));
  }

  /* ==================================================================
     DAFTAR PANJANG — perabot bersama
     ------------------------------------------------------------------
     MCS ditulis untuk satu gedung dan kemudian dipakai untuk delapan
     puluh tujuh. Yang pecah bukan hitungannya melainkan HALAMANNYA:
     tujuh layar menggambar seluruh isi tabelnya sekaligus, dan pada data
     sungguhan itu berarti 121.924 karakter dan 16.106 elemen dalam satu
     halaman. Yang sepanjang itu tidak dibaca — ia digulir sampai lelah,
     lalu ditinggalkan.

     Perabot ini ditulis SEKALI supaya ketujuhnya berperilaku sama. Dua
     halaman yang tombol "tampilkan lagi"-nya bekerja berbeda menuntut
     pemakainya belajar dua kali untuk hal yang sama.

     Tiga bagian, dan hanya yang perlu saja dipakai tiap halaman:
       · dpSaring   — menyaring menurut lokasi yang dipilih
       · dpBilah    — bilah pilihan lokasi + hitungan + tombol bersih
       · dpPotong   — memotong daftar dan menawarkan sisanya
       · dpAksi     — penangan yang disatukan ke peta delegasi halaman
     ================================================================== */

  /* Empat puluh baris. Bukan angka bulat yang enak dilihat: di bawahnya
     orang menekan "lagi" terlalu sering, di atasnya halaman mulai terasa
     berat lagi pada perangkat yang lemah — dan perangkat penyelia
     kebersihan hampir selalu perangkat yang lemah. */

  var DP_HAL = 40;

  var dpKeadaan = {};

  function dpS(kunci) {
    return dpKeadaan[kunci] ||
      (dpKeadaan[kunci] = { batas: DP_HAL, lokasi: 'semua' });
  }

  /** Kembalikan daftar ke halaman pertama — dipanggil tiap penyaring berubah. */

  function dpUlang(kunci) { dpS(kunci).batas = DP_HAL; }

  /**
   * Saring menurut lokasi.
   *
   * `amb(x)` mengembalikan lokasiId sebuah baris; barang yang lokasinya
   * tidak diketahui memakai '' dan TIDAK ikut tersaring keluar oleh pilihan
   * 'semua' — data yang belum lengkap tetap harus terlihat, justru supaya
   * ada yang melengkapinya.
   */
  /* `amb` boleh mengembalikan satu id ATAU sebuah daftar id — seorang
     petugas sungguh bisa ditugaskan di beberapa cabang sekaligus, dan
     memaksanya menjadi satu berarti ia menghilang dari cabang keduanya. */

  function dpIds(v) {
    if (!v) return [];
    return Array.isArray(v) ? v.filter(Boolean) : [v];
  }

  function dpSaring(kunci, l, amb) {
    var s = dpS(kunci);
    if (s.lokasi === 'semua') return l;
    return l.filter(function (x) { return dpIds(amb(x)).indexOf(s.lokasi) >= 0; });
  }

  /**
   * Bilah pilihan lokasi.
   *
   * Muncul HANYA bila lokasinya lebih dari satu. Korporat satu gedung tidak
   * boleh dibebani perabot untuk memilih di antara satu pilihan; itu
   * pertanyaan yang jawabannya sudah pasti.
   *
   * TIDAK ada kotak cari teks di sini, dan itu keputusan yang sama dengan
   * di halaman Peralatan: tiap pilihan memanggil APP.refresh() yang
   * menggambar ulang seluruh halaman, jadi kotak teks kehilangan fokus pada
   * tiap huruf. Menambahkannya kelak menuntut penyimpan fokus lebih dulu.
   */

  function dpBilah(kunci, pokok, hasil, amb, tambahan) {
    if (!pokok.length) return '';
    var per = {};
    pokok.forEach(function (x) {
      /* Yang berada di tiga cabang dihitung pada ketiganya. Jumlah seluruh
         angka dalam kurung karena itu bisa MELEBIHI jumlah barisnya, dan
         itu benar: pertanyaan yang dijawab tiap angka adalah "berapa yang
         akan saya lihat bila memilih ini", bukan "berapa bagian dari
         seluruhnya". */
      dpIds(amb(x)).forEach(function (id) { per[id] = (per[id] || 0) + 1; });
    });
    var lok = Object.keys(per).map(function (id) {
      return { id: id, nama: window.LOKASI ? LOKASI.nama(id) : id, n: per[id] };
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
    if (lok.length < 2 && !tambahan) return '';

    var s = dpS(kunci);
    return '<div class="as-filter mb-3">' +
      (lok.length > 1
        ? '<label>' + T('Lokasi') +
            '<select data-change="dp-lokasi" data-key="' + kunci + '">' +
              '<option value="semua">' + U.esc(T('Semua lokasi')) +
                ' (' + lok.length + ')</option>' +
              lok.map(function (x) {
                return '<option value="' + U.esc(x.id) + '"' +
                  (s.lokasi === x.id ? ' selected' : '') + '>' +
                  U.esc(x.nama) + ' (' + x.n + ')</option>';
              }).join('') +
            '</select></label>'
        : '') +
      (tambahan || '') +
      '<span class="as-filter__n">' +
        /* BUKAN kunci 'baris' — ia sudah berarti "line" di kamus, yaitu
           baris teks, bukan baris data. Terbaca "1.223 lines" pada daftar
           jadwal. Kata tunggal yang umum selalu sudah dipakai di tempat
           lain untuk hal lain. */
        (hasil.length === pokok.length
          ? jml(hasil.length, '1 ditampilkan', '{n} ditampilkan')
          : T('{n} dari {t}').replace('{n}', U.num(hasil.length))
              .replace('{t}', U.num(pokok.length))) + '</span>' +
      (s.lokasi !== 'semua'
        ? '<button class="btn btn--ghost btn--sm" data-act="dp-bersih" ' +
          'data-key="' + kunci + '">✕ ' + T('Hapus penyaring') + '</button>'
        : '') +
    '</div>';
  }

  /**
   * Potong daftar, dan TAWARKAN sisanya — jangan diam-diam membuangnya.
   *
   * Daftar yang terpotong tanpa berkata apa-apa adalah kebohongan kecil
   * yang mahal: orang menyimpulkan barangnya belum terdaftar, lalu
   * mendaftarkannya lagi — dan sekarang ada dua.
   */

  function dpPotong(kunci, l, gambar, bungkus) {
    var s = dpS(kunci);
    var tampil = l.slice(0, s.batas);
    var isi = bungkus ? bungkus(tampil) : tampil.map(gambar).join('');
    if (l.length <= tampil.length) return isi;
    return isi +
      '<div class="as-lagi">' +
        '<button class="btn btn--ghost" data-act="dp-lagi" data-key="' + kunci + '">' +
          T('Tampilkan {n} lagi').replace('{n}',
            U.num(Math.min(DP_HAL, l.length - tampil.length))) + '</button>' +
        '<span>' + T('{n} belum ditampilkan')
          .replace('{n}', U.num(l.length - tampil.length)) + '</span>' +
      '</div>';
  }

  /**
   * Penangan bersama. Disatukan ke peta delegasi tiap halaman dengan
   * Object.assign, BUKAN dipanggil sebagai delegasi kedua: U.delegate
   * memasang pendengar baru tiap kali dipanggil, dan dua pendengar pada
   * root yang sama menjalankan penanganya dua kali.
   */

  function dpAksi() {
    return {
      'dp-lokasi': function (el) {
        var k = el.getAttribute('data-key');
        dpS(k).lokasi = el.value; dpUlang(k); APP.refresh();
      },
      'dp-bersih': function (el) {
        var k = el.getAttribute('data-key');
        dpS(k).lokasi = 'semua'; dpUlang(k); APP.refresh();
      },
      'dp-lagi': function (el) {
        dpS(el.getAttribute('data-key')).batas += DP_HAL; APP.refresh();
      }
    };
  }

  /* ==================================================================
     DUA SKALA 1–5 YANG BERLAWANAN ARAH — dan bagaimana keduanya hidup
     berdampingan tanpa saling menipu.
     ------------------------------------------------------------------
     Aplikasi ini memakai TIGA ukuran mutu, dan dua di antaranya sama-sama
     1–5 dengan arah yang berlawanan:

       · INSPEKSI — skala APPA: **1 paling bersih, 5 terburuk**.
       · KEPUASAN PENGHUNI — **5 paling puas, 1 terburuk**.
       · KPI — 0–100, 100 terbaik. Sudah aman: kpi.js membalik APPA lebih
         dulu lewat skorMutu(), dengan alasannya tertulis di sana.

     KEDUANYA SENGAJA TIDAK DISAMAKAN, dan itu keputusan, bukan kelalaian:

       · Membalik APPA menghancurkan satu-satunya alasan ia dipakai — angka
         yang sama dipahami sama oleh auditor mana pun. Skala 'APPA tapi
         terbalik' bukan APPA, dan tidak bisa dibandingkan dengan apa pun
         di luar aplikasi ini.
       · Membalik kepuasan melawan yang diharapkan setiap orang yang pernah
         mengisi survei. Penghuni bukan auditor; memberinya skala terbalik
         tidak menghasilkan data terbalik, ia menghasilkan data SALAH —
         orang akan mengisi menurut kebiasaannya, bukan menurut keterangan
         di layar.

     YANG MENYELESAIKANNYA: kedua skala memakai KATA yang persis sama —
     'Bersih sekali', 'Bersih', 'Cukup', 'Kurang', 'Buruk'. Kata tidak punya
     arah yang bisa terbalik. Karena itu aturannya satu kalimat:

         ANGKA MUTU TIDAK PERNAH TAMPIL SENDIRIAN.

     Pembacanya tidak perlu tahu sedang membaca skala yang mana, dan tidak
     perlu mengingat arahnya. Pakai selMutu() di mana pun skor APPA tampil.
     ================================================================== */

  /**
   * Satu sel skor APPA: angka + kata + warna.
   *
   * @param rata  1–5, boleh pecahan. null/undefined → tanda pisah.
   * @param opsi.ringkas  true untuk tempat sempit — kata tetap ada, hanya
   *   angkanya yang dibulatkan. TIDAK ada mode 'angka saja': itulah persis
   *   yang sedang diperbaiki di sini.
   */

  function selMutu(rata, opsi) {
    opsi = opsi || {};
    if (rata === null || rata === undefined || isNaN(rata)) {
      return '<span class="muted">—</span>';
    }
    var mm = MCS.mutu(Math.round(rata));
    var angka = opsi.ringkas ? Math.round(rata * 10) / 10 : rata;
    return '<span class="chip chip--' + mm.warna + '" title="' +
      U.esc(T('Skala APPA: 1 paling bersih, 5 terburuk') + ' · ' + T(mm.ket)) + '">' +
      U.esc(String(angka)) + ' · ' + U.esc(T(mm.nama)) + '</span>';
  }

  /**
   * Judul kolom untuk skor APPA — menyebut arahnya di judulnya sendiri.
   * Kolom yang menerangkan dirinya tidak menuntut pembacanya mengingat.
   */

  function judulMutu() { return T('Mutu APPA (1 terbaik)'); }

  var STATUS = {
    selesai:    { t: 'Selesai',        c: 'ok' },
    lewat:      { t: 'Dilewati',       c: 'muted' },
    terlambat:  { t: 'Terlambat',      c: 'danger' },
    terlewat:   { t: 'Tidak dikerjakan', c: 'danger' },
    jatuhTempo: { t: 'Waktunya sekarang', c: 'warn' },
    /* Foto sebelum sudah diambil, pekerjaannya belum ditandai selesai. */
    proses:     { t: 'Sedang dikerjakan', c: 'brand' },
    akan:       { t: 'Menunggu jam',   c: 'info' }
  };

  /**
   * Satu tugas dalam satu baris setinggi 48 piksel.
   *
   * Yang dipadatkan adalah TATA LETAKNYA, bukan isinya: lokasi, petugas dan
   * kemajuan langkah digabung ke satu baris meta. Peringatan — foto yang
   * belum ada, langkah wajib yang belum dicentang, petugas yang tidak masuk —
   * tetap ditulis penuh di bawahnya dan membuat barisnya tumbuh. Baris yang
   * memendek dengan cara menyembunyikan peringatan bukan baris yang ringkas,
   * melainkan baris yang berbohong.
   */

  function barisTugas(t) {
    var s = STATUS[t.status] || STATUS.akan;
    var ja = MCS.jenisArea(t.area.jenis);
    var lokasi = [t.area.gedung, t.area.lantai ? 'Lt. ' + t.area.lantai : ''].filter(Boolean).join(' · ');
    var bisaDitandai = t.status !== 'selesai' && t.status !== 'lewat';
    var nFoto = (t.sebelum || []).length + (t.sesudah || []).length;
    var lampau = t.status === 'selesai' || t.status === 'lewat';

    /* Baris meta: lokasi · petugas · langkah — satu baris, dipotong bila
       terlalu panjang. Yang dipotong hanyalah keterangan tempat; nama
       petugasnya tidak pernah hilang karena itulah yang dicari mata. */
    var meta = [
      lokasi ? U.esc(lokasi) : '',
      U.ikon(MCS.jenisPekerja(t.pekerja.jenis).ikon) + ' ' + U.esc(t.pekerja.nama),
      (t.progres && t.progres.total
        ? t.progres.selesai + '/' + t.progres.total + ' ' + T('langkah')
        : '')
    ].filter(Boolean).join(' · ');

    /* Peringatan dikumpulkan dulu, baru digambar — supaya baris tanpa
       peringatan benar-benar tinggal dua baris teks. */
    var awas = [];
    if (t.progres && t.progres.total) {
      if (t.wajibLangkah && t.progres.wajibBelum.length) awas.push('☑️ ' + T('wajib dicentang'));
      if (t.progres.perluFoto) {
        awas.push('📷 ' + t.progres.berfoto + '/' + t.progres.total +
          (t.progres.fotoBelum.length ? ' ' + T('belum lengkap') : ''));
      }
    }
    if (t.wajibFoto && !(t.sesudah || []).length) awas.push('📷 ' + T('menuntut foto bukti'));
    /* Petugas yang tidak bekerja hari itu disebut DI BARIS TUGASNYA, bukan
       hanya di halaman absensi. Tugas yang terlewat tanpa sebab terlihat
       seperti kelalaian; dengan sebabnya, ia terlihat seperti kekurangan
       orang — dan itu masalah yang berbeda. */
    if (t.status !== 'selesai' && t.pekerja && t.pekerja.id) {
      var ab = MCS.ketidakhadiran(t.pekerja.id, t.tgl);
      if (ab) {
        var sh = MCS.statusHadir(ab.status);
        awas.push(sh.ikon + ' ' + U.esc(T(sh.nama)) +
          (ab.pengganti
            ? ' · ' + T('digantikan') + ' ' + U.esc(ab.pengganti.nama)
            : ' · ' + T('tanpa pengganti')));
      }
    }

    return '<div class="mcs-t mcs-t--' + t.status + (lampau ? ' mcs-t--lampau' : '') + '">' +
      '<div class="mcs-t__j">' + U.esc(t.jam) + '</div>' +
      '<div class="mcs-t__i">' + U.ikon(ja.ikon) + '</div>' +
      '<div class="mcs-t__t">' +
        '<b>' + U.esc(t.area.nama) + '</b>' +
        '<span class="mcs-t__m">' + meta + '</span>' +
        (awas.length ? '<span class="mcs-warn">' + awas.join(' · ') + '</span>' : '') +
        (t.status === 'selesai' && t.olehNama
          ? '<span class="mcs-t__o">' +
            (t.pelaksana && t.pelaksana.id !== t.pekerja.id
              ? T('dikerjakan') + ' ' + U.esc(t.pelaksana.nama) + ' · ' : '') +
            T('dicatat oleh') + ' ' + U.esc(t.olehNama) + '</span>'
          : '') +
        /* Lencana bukti kehadiran berdiri sendiri, bukan disatukan dengan
           'dicatat oleh'. Keduanya menjawab pertanyaan berbeda: siapa yang
           MENGETIK laporan, dan apakah ada yang benar-benar DI SANA. */
        (t.status === 'selesai'
          ? barisBukti(MCS.catatanSlot(t.jadwalId, t.tgl, t.jam), t.area) : '') +
        (t.catatan ? '<span class="mcs-t__c">📝 ' + U.esc(t.catatan) + '</span>' : '') +
      '</div>' +
      '<span class="chip chip--' + s.c + '">' + T(s.t) + '</span>' +
      '<div class="mcs-t__b">' +
        /* Tombol laporan foto selalu ada — juga setelah selesai, supaya bukti
           yang terlewat masih bisa ditambahkan, dan yang sudah ada bisa dilihat. */
        '<button class="btn btn--ghost btn--sm" data-act="mcs-lapor" ' +
          'data-j="' + U.esc(t.jadwalId) + '" data-t="' + t.tgl + '" data-h="' + t.jam + '" ' +
          'title="' + U.esc(T('Laporan foto')) + '">📷' +
          (nFoto ? '<b class="mcs-t__n">' + nFoto + '</b>' : '') + '</button>' +
        (bisaDitandai
          ? '<button class="btn btn--primary btn--sm" data-act="mcs-selesai" ' +
              'data-j="' + U.esc(t.jadwalId) + '" data-t="' + t.tgl + '" data-h="' + t.jam + '" ' +
              'title="' + U.esc(T('Tandai selesai')) + '">✓</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="mcs-lewat" ' +
              'data-j="' + U.esc(t.jadwalId) + '" data-t="' + t.tgl + '" data-h="' + t.jam + '">' +
              T('Lewati') + '</button>'
          : '<button class="btn btn--ghost btn--sm" data-act="mcs-batal" ' +
              'data-j="' + U.esc(t.jadwalId) + '" data-t="' + t.tgl + '" data-h="' + t.jam + '">' +
              T('Batalkan') + '</button>') +
      '</div>' +
    '</div>';
  }

  /* Penuntun langkah saat penyiapan belum selesai. */

  /**
   * Laporan foto sebelum–sesudah untuk satu tugas.
   *
   * Foto acuan area ditampilkan di atas sebagai pembanding: "beginilah
   * seharusnya". Tanpa itu, foto sesudah hanya membuktikan ada yang memotret,
   * bukan bahwa areanya bersih.
   *
   * KETERBATASAN YANG DISEBUTKAN, BUKAN DISEMBUNYIKAN: petugas kebersihan
   * korporat tidak punya akun di aplikasi ini, dan basis datanya hidup di
   * peramban satu perangkat. Laporan ini karena itu diisi dari perangkat yang
   * memegang datanya — ponsel penyelia di lokasi. Kolom "dikerjakan oleh"
   * ada supaya buktinya tetap menunjuk orang yang benar.
   */
  /**
   * Slot foto ringkas untuk satu langkah.
   *
   * Sengaja BUKAN UI.photoGrid: kisi penuh setinggi seratus piksel dikalikan
   * dua sisi dikalikan enam langkah membuat laporan sepanjang tiga layar, dan
   * petugas yang harus menggulir tiga layar akan berhenti mengisinya.
   */
  function slotLangkah(stepId, jenis, ids) {
    var label = jenis === 'sebelum' ? T('Sebelum') : T('Sesudah');
    return '<div class="mcs-sl mcs-sl--' + jenis + '">' +
      '<span class="mcs-sl__j">' + label + '</span>' +
      (ids || []).map(function (id) {
        var src = DB.getPhoto(id);
        if (!src) return '';
        return '<div class="mcs-sl__c">' +
          '<img src="' + src + '" data-act="zoom">' +
          '<button class="del" data-act="lg-del" data-s="' + U.esc(stepId) + '" ' +
            'data-jenis="' + jenis + '" data-id="' + id + '">✕</button>' +
        '</div>';
      }).join('') +
      '<label class="mcs-sl__add" title="' + U.esc(label) + '">📷' +
        '<input type="file" accept="image/*" capture="environment" hidden ' +
          'data-change="lg-add" data-s="' + U.esc(stepId) + '" data-jenis="' + jenis + '">' +
      '</label>' +
    '</div>';
  }

  /* ======================================================= BUKTI KEHADIRAN

     Sebelum ini, laporan kebersihan adalah pengakuan sendiri: dropdown
     'dikerjakan oleh' bisa diisi siapa pun dari mana pun. Tag yang tertempel
     di area mengubahnya menjadi tuntutan sederhana — seseorang HARUS pernah
     berdiri di sana.

     Yang jujur perlu dikatakan: QR yang difoto bisa dipindai dari tempat
     lain. Karena itu caranya dicatat (kamera atau ketik) dan jaraknya
     diperiksa bila areanya bertitik. Ini menaikkan ongkos berbohong, bukan
     menghapusnya — dan layar tidak boleh berpura-pura sebaliknya. */

  /* ==================================================== ADUAN PENGHUNI

     Layar ini adalah SATU-SATUNYA bagian MCS yang terbuka tanpa akun.
     Itu disengaja: penghuni gedung bukan pengguna aplikasi, dan menuntut
     mereka mendaftar hanya untuk melaporkan toilet kotor berarti tidak akan
     pernah ada laporan yang masuk. Yang dibuka pun hanya SATU arah —
     mengirim aduan untuk satu area yang tagnya dipegang. Tidak ada daftar
     aduan, tidak ada data gedung, tidak ada apa pun yang bisa dibaca. */

  /** Kode tag dari alamat, bila memang sedang membuka tautan tag. */

  /** '2 jam 30 menit' dari 150. Menit saja tidak terbaca sebagai janji. */
  function jamMenit(menit) {
    var m = Math.max(0, Math.round(menit || 0));
    var j = Math.floor(m / 60), sisa = m % 60;
    if (!j) return jml(sisa, '1 menit', '{n} menit');
    if (!sisa) return jml(j, '1 jam', '{n} jam');
    return jml(j, '1 jam', '{n} jam') + ' ' + jml(sisa, '1 menit', '{n} menit');
  }

  function adaPemindai() {
    return typeof window.BarcodeDetector === 'function';
  }

  /**
   * @param opsi.areaId    bila diisi, hanya tag area itu yang diterima
   * @param opsi.onSukses  fungsi(area, pindai)
   */

  function dialogPindai(opsi) {
    opsi = opsi || {};
    var wajib = opsi.areaId ? MCS.areaSatu(opsi.areaId) : null;
    var arus = null, berhenti = false, sedang = false;

    function matikan() {
      berhenti = true;
      if (arus) { arus.getTracks().forEach(function (t) { t.stop(); }); arus = null; }
    }

    var tutup = UI.modal({
      title: T('Pindai tag area'),
      sub: wajib ? wajib.nama : T('Arahkan kamera ke tag yang tertempel di dinding'),
      body:
        '<div class="pd">' +
          (adaPemindai()
            ? '<div class="pd__v"><video id="pd-vid" playsinline muted></video>' +
              '<div class="pd__bingkai"></div></div>'
            : UI.alert('info', T('Peramban ini tidak bisa memindai QR. Ketik kodenya saja — ' +
                'enam huruf yang tercetak di bawah gambar tag.'), 'ℹ️')) +
          '<div class="pd__st" id="pd-st">' +
            (adaPemindai() ? T('Menyalakan kamera…') : '') + '</div>' +
          '<div class="pd__m">' +
            '<label class="mcs-f"><span>' + T('Atau ketik kode tag') + '</span>' +
              '<input class="input pd__i" id="pd-kode" maxlength="8" ' +
                'autocapitalize="characters" placeholder="A7K2QX"></label>' +
            '<button class="btn" data-act="pd-manual">' + T('Konfirmasi') + '</button>' +
          '</div>' +
          '<p class="tbl-sub">' +
            T('Kode yang diketik dicatat berbeda dari kode yang dipindai kamera — ' +
              'keduanya muncul apa adanya di laporan.') + '</p>' +
        '</div>',
      onTutup: matikan,
      actions: {
        'pd-manual': function (el) {
          var i = el.closest('.modal').querySelector('#pd-kode');
          terima(i ? i.value : '', 'manual');
        }
      },
      onMount: function (back) { mulaiKamera(back); }
    });

    function pesan(teks, warna) {
      var el = document.getElementById('pd-st');
      if (el) { el.textContent = teks; el.className = 'pd__st' + (warna ? ' pd__st--' + warna : ''); }
    }

    function mulaiKamera(back) {
      if (!adaPemindai() || !navigator.mediaDevices) return;
      var vid = back.querySelector('#pd-vid');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function (s) {
          if (berhenti) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          arus = s; vid.srcObject = s; vid.play();
          pesan(T('Arahkan ke tag…'));
          var det = new window.BarcodeDetector({ formats: ['qr_code'] });
          (function putar() {
            if (berhenti) return;
            det.detect(vid).then(function (kode) {
              if (kode && kode.length) terima(kode[0].rawValue, 'kamera');
            }).catch(function () { /* bingkai gagal dibaca — bukan galat */ })
              .then(function () { if (!berhenti) setTimeout(putar, 250); });
          })();
        })
        .catch(function (e) {
          /* Izin kamera ditolak bukan jalan buntu — kolom ketik tetap ada. */
          pesan(T('Kamera tidak bisa dipakai') + ': ' + e.message + '. ' +
            T('Ketik kodenya saja.'), 'warn');
        });
    }

    function terima(teks, cara) {
      if (sedang) return;
      var hasil = MCS.bacaTag(teks);
      if (!hasil || !hasil.area) { pesan(T('Tag tidak dikenali.'), 'warn'); return; }
      var area = hasil.area, objek = hasil.objek;
      if (wajib && area.id !== wajib.id) {
        pesan(T('Itu tag {lain} — yang dibutuhkan tag {ini}.')
          .replace('{lain}', area.nama).replace('{ini}', wajib.nama), 'warn');
        return;
      }
      sedang = true; matikan();
      /* Kode yang sudah diganti tetap diterima — tetapi orang yang memakainya
         diberi tahu, bukan dibiarkan mengira semuanya normal. */
      pesan(hasil.kodeUsang
        ? T('Tag ini sudah diganti — pemindaian dicatat dengan tanda.')
        : T('Mencatat kehadiran…'), hasil.kodeUsang ? 'warn' : '');
      /* GPS diminta, tetapi TIDAK menahan pencatatan bila gagal: di basement
         dan ruang panel ia memang tidak pernah dapat sinyal, dan menolak
         laporan di sana berarti menghukum orang atas letak ruangannya. */
      U.getGPS(6000).then(function (g) {
        var r = MCS.catatPindai(area.id, {
          cara: cara, oleh: APP.user,
          objekId: objek ? objek.id : null,
          kodeUsang: hasil.kodeUsang || null,
          lat: g.ok ? g.lat : null, lng: g.ok ? g.lng : null,
          akurasi: g.ok ? g.akurasi : null
        });
        if (r.error) { sedang = false; pesan(r.error, 'warn'); return; }
        UI.toast(T('Kehadiran tercatat di') + ' ' +
          (objek ? objek.nama + ' — ' + area.nama : area.nama), 'ok');
        tutup();
        if (opsi.onSukses) opsi.onSukses(area, r.pindai);
        else APP.refresh();
      });
    }
  }

  /**
   * Objek di dalam satu area.
   *
   * Urutannya mengikuti langkah kaki petugas dari pintu ke dalam, bukan
   * abjad — daftar yang berurut abjad memaksa orang melompat-lompat di
   * ruangan sempit.
   */

  /**
   * Poster tag yang siap dicetak dan ditempel — untuk AREA maupun OBJEK.
   *
   * Kodenya dicetak besar-besar di bawah gambar QR, bukan disembunyikan:
   * kamera gagal di ruangan gelap, dan tag yang tidak bisa dibaca manusia
   * berarti pekerjaan yang tidak bisa dilaporkan.
   */
  function dialogTag(id, jenis) {
    var objekMode = jenis === 'objek';
    var x = objekMode ? MCS.objekSatu(id) : MCS.areaSatu(id);
    if (!x) { UI.toast(T('Tag tidak ditemukan.'), 'err'); return; }
    var area = objekMode ? MCS.areaSatu(x.areaId) : x;
    var k = korp();

    function gambar() {
      var segar = objekMode ? MCS.objekSatu(id) : MCS.areaSatu(id);
      var box = document.getElementById('tag-isi');
      if (box) box.innerHTML = isi(segar);
    }

    function isi(x) {
      var kode = objekMode ? x.kodePindai : MCS.pastikanKode(x);
      var tautan = MCS.tautanTag(x);
      var riwayat = MCS.riwayatKode(x.korporatId, 50).filter(function (r) {
        return r.targetId === x.id; });

      return '<div class="tag-cetak" id="tag-cetak">' +
          '<div class="tag-cetak__h">' + U.esc((k && k.nama) || 'EXOCLEAN') + '</div>' +
          '<div class="tag-cetak__n">' + U.esc(x.nama) + '</div>' +
          '<div class="tag-cetak__sub">' +
            U.esc(objekMode
              ? (area ? area.nama : '') +
                [area && area.gedung, area && area.lantai ? 'Lt. ' + area.lantai : '']
                  .filter(Boolean).map(function (s) { return ' · ' + s; }).join('')
              : [x.gedung, x.lantai ? 'Lt. ' + x.lantai : ''].filter(Boolean).join(' · ')) +
          '</div>' +
          '<div class="tag-cetak__q">' +
            QR.svg(tautan, { ukuran: 260, alt: T('Tag') + ' ' + x.nama }) +
          '</div>' +
          '<div class="tag-cetak__k">' + U.esc(kode) + '</div>' +
          '<div class="tag-cetak__p">' +
            (objekMode
              ? T('PETUGAS: pindai saat membersihkan benda ini.')
              : T('PETUGAS: pindai sebelum mulai membersihkan.') + '<br>' +
                T('PENGHUNI: pindai untuk melaporkan area ini kotor atau rusak.')) +
          '</div>' +
        '</div>' +

        '<p class="tbl-sub mt-2">' +
          T('Tempel setinggi mata, tidak di balik daun pintu.') + '</p>' +

        /* Penggantian kode dan riwayatnya duduk BERSAMA posternya: yang
           mengganti kode harus melihat, di layar yang sama, bahwa tag lama
           perlu dicetak ulang dan ditempel ulang. */
        '<div class="tag-putar mt-3">' +
          '<div class="row between">' +
            '<div><b>' + T('Ganti kode tag') + '</b>' +
              '<div class="tbl-sub">' +
                T('Kode lama masih diterima {n} jam, tetapi setiap pemakaiannya ditandai.')
                  .replace('{n}', MCS.config().tenggangKodeJam) + '</div></div>' +
            '<button class="btn btn--ghost btn--sm" data-act="tag-putar">' +
              T('Ganti kode') + '</button>' +
          '</div>' +
          (riwayat.length
            ? '<div class="tag-riwayat mt-2">' + riwayat.slice(0, 4).map(function (r) {
                return '<div><code>' + U.esc(r.kode) + '</code> → <code>' +
                  U.esc(r.kodeBaru) + '</code> · ' + U.esc(String(r.digantiPada).slice(0, 10)) +
                  (r.olehNama ? ' · ' + U.esc(r.olehNama) : '') +
                  (r.sebab ? ' · ' + U.esc(r.sebab) : '') + '</div>';
              }).join('') + '</div>'
            : '') +
        '</div>';
    }

    UI.modal({
      title: objekMode ? T('Tag objek') : T('Tag area'), sub: x.nama, size: 'wide',
      body: '<div id="tag-isi">' + isi(x) + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="tag-cetak-btn">🖨️ ' + T('Cetak') + '</button>',
      actions: {
        'tag-cetak-btn': function () { cetak('cetak-tag'); },
        'tag-putar': function () {
          UI.formModal({
            title: T('Ganti kode tag'), sub: x.nama, okText: T('Ganti'),
            fields: [
              { type: 'html', html: UI.alert('warn',
                  '<b>' + T('Tag lama harus dicetak dan ditempel ulang.') + '</b> ' +
                  T('Selama {n} jam ke depan kode lama masih diterima supaya pelaporan ' +
                    'tidak terkunci — tetapi pemindaian yang memakainya ditandai, dan ' +
                    'muncul di riwayat sebagai tag yang sudah diganti.')
                    .replace('{n}', MCS.config().tenggangKodeJam), '⚠️') },
              { name: 'sebab', label: T('Alasan penggantian'), required: true,
                placeholder: T('mis. tag lama diduga difoto, tag rusak, putaran berkala') }
            ]
          }).then(function (d) {
            if (!d) return;
            var r = MCS.putarKode(objekMode ? 'objek' : 'area', id, APP.user, d.sebab);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            UI.toast(T('Kode diganti. Cetak dan tempel ulang tagnya sekarang.'), 'ok');
            gambar();
            APP.refresh();
          });
        }
      }
    });
  }

  /** Menyalakan mode cetak sesaat, lalu memulihkannya. */

  function cetak(kelas) {
    document.body.classList.add(kelas);
    window.print();
    setTimeout(function () { document.body.classList.remove(kelas); }, 500);
  }

  /**
   * Lembar berisi SEMUA tag sebuah area — tag areanya sendiri dan tiap objek.
   *
   * Mencetak satu per satu untuk empat puluh objek adalah empat puluh kali
   * membuka dialog, dan itulah yang membuat orang berhenti memakai tag objek
   * sama sekali.
   */

  /**
   * Jam sebuah cap waktu, dibaca pada zona AREA-nya.
   *
   * Singkatan zona (WIB/WITA/WIT) DITEMPELKAN hanya ketika zona itu berbeda
   * dari zona perangkat yang sedang membuka. Menempelkannya selalu membuat
   * layar korporat satu kota penuh “WIB” yang tidak memberi tahu apa pun;
   * tidak menempelkannya sama sekali membuat admin di Jakarta membaca
   * “08.00” pada pemindaian di Jayapura dan menyangka petugasnya datang dua
   * jam terlalu awal. Yang disebut hanya yang bisa disalahpahami.
   */
  function jamArea(iso, area) {
    if (!iso) return '';
    if (!window.ZONA) return U.jam(iso);
    var tz = ZONA.area(area);
    var j = ZONA.jam(iso, tz);
    return ZONA.samaDenganPerangkat(tz) ? j : j + ' ' + ZONA.singkat(tz);
  }

  /** Bukti kehadiran sebagai satu baris siap tempel di layar. */
  function barisBukti(rec, area) {
    var b = MCS.buktiKehadiran(rec);
    if (!b) return '';
    /* U.jam(), BUKAN memotong string ISO-nya.

       `pada` disimpan sebagai ISO UTC — “2026-08-25T04:01:35Z” — dan
       memotong karakter ke-11 sampai ke-16 mengambil jam UTC apa adanya.
       Di Indonesia itu meleset TUJUH JAM: pemindaian pukul 11.01 WIB
       tertulis “dipindai 04.01”.

       Yang membuatnya mahal bukan salahnya, melainkan DI MANA salahnya.
       Baris ini adalah bukti kehadiran — satu-satunya kolom yang dipakai
       membuktikan seseorang sungguh berdiri di ruangan itu pada jam
       tertentu. Jam yang meleset tujuh jam membuat pemindaian pagi terbaca
       sebagai dini hari, dan penyelia yang membacanya akan menuduh orang
       yang justru bekerja tepat waktu. */
    /* Zona AREA-nya, bukan zona yang membuka. Pemindaian di Makassar dibaca
       dengan jam Makassar, dan diberi tanda WITA supaya pembaca di Jakarta
       tidak mengira itu jamnya sendiri. */
    var jam = area ? jamArea(b.pada, area) : U.jam(b.pada);
    return '<span class="mcs-bukti' + (b.kuat ? ' mcs-bukti--kuat' : '') + '">' +
      (b.kuat ? '📷 ' : '⌨️ ') +
      U.esc(b.kuat ? T('dipindai') : T('kode diketik')) + ' ' + U.esc(jam) +
      (b.jarakM != null ? ' · ' + b.jarakM + ' m' : '') + '</span>';
  }

  function dialogLapor(jadwalId, tgl, jam) {
    var kid = kop();
    var t = MCS.tugasHari(kid, tgl).filter(function (x) {
      return x.jadwalId === jadwalId && x.jam === jam; })[0];
    if (!t) { UI.toast(T('Tugas tidak ditemukan.'), 'err'); return; }
    var rec = MCS.catatanSlot(jadwalId, tgl, jam);
    var petugas = MCS.pekerja(kid);
    var pelaksanaId = (rec && rec.pekerjaId) || t.pekerja.id;
    var selesai = t.status === 'selesai';
    var tutupLapor = null;

    function buka() {
      var acuan = (t.area.foto || []);
      var lk = MCS.langkahArea(t.area);
      var pr = MCS.progresLangkah(t.area, rec);
      var centang = (rec && rec.langkah) || {};
      var perluFotoLangkah = !!t.area.wajibFotoLangkah;
      var ruang = MCS.ruangPenyimpanan();
      /* Penutup resminya dipegang: menghapus simpul modal langsung dari DOM
         melewati pembersihan milik UI.modal — tumpukan modal jadi menyimpan
         simpul mati, dan gulir halaman terkunci selamanya sesudahnya. */
      tutupLapor = UI.modal({
        id: 'mcs-lapor', size: 'wide',
        title: T('Laporan foto'),
        sub: t.jam + ' · ' + t.area.nama,
        body:
          /* Kewajiban pindai disebut DI ATAS, sebelum orang mengisi apa pun.
             Memberitahunya baru saat tombol simpan ditekan berarti membiarkan
             seseorang memotret sepuluh langkah lalu ditolak — dan lain kali
             ia tidak akan repot-repot melapor lagi. */
          (function () {
            if (!MCS.config().wajibPindai) return '';
            var p = MCS.pindaiBerlaku(t.area.id);
            if (p) {
              return '<div class="mcs-acuan"><div class="mcs-acuan__j">' +
                T('Bukti kehadiran') + '</div>' +
                barisBukti({ pindaiId: p.id }, t.area) + '</div>';
            }
            return UI.alert('warn', '<b>' + T('Belum dipindai.') + '</b> ' +
              T('Gedung ini menuntut tag area dipindai sebelum tugas ditandai selesai.') +
              '<div class="mt-2"><button class="btn btn--sm" data-act="lp-pindai">🏷️ ' +
              T('Pindai sekarang') + '</button></div>', '🏷️') + '<div class="mb-3"></div>';
          })() +
          (acuan.length
            ? '<div class="mcs-acuan"><div class="mcs-acuan__j">📌 ' +
                T('Acuan area — beginilah seharusnya') + '</div>' +
                UI.photoGrid(acuan, {}) + '</div>'
            : '') +

          /* Checklist yang bisa DICENTANG, bukan daftar yang dibaca. Tiap
             centang tersimpan seketika beserta waktunya — laporan yang harus
             ditekan simpan dulu akan hilang ketika petugas berpindah ruangan. */
          (lk.length
            ? '<div class="mcs-cek">' +
                '<div class="mcs-acuan__j">☑️ ' + T('Langkah pembersihan') +
                  '<span class="mcs-cek__p">' + pr.selesai + ' / ' + pr.total + '</span></div>' +
                '<div class="mcs-cek__bar"><i style="width:' + pr.persen + '%"></i></div>' +
                '<div class="mcs-cek__l">' + lk.map(function (l) {
                  var on = !!centang[l.id];
                  var f = MCS.fotoLangkah(rec, l.id);
                  var lengkap = f.sebelum.length && f.sesudah.length;
                  return '<div class="mcs-lg' + (on ? ' on' : '') + '">' +
                    '<label class="mcs-cek__i' + (on ? ' on' : '') + '">' +
                      '<input type="checkbox"' + (on ? ' checked' : '') +
                        ' data-change="lp-langkah" data-id="' + U.esc(l.id) + '">' +
                      '<span class="kh-cek__k"></span>' +
                      '<b>' + U.esc(l.teks) + '</b>' +
                      (l.wajib ? '' : '<i>' + T('opsional') + '</i>') +
                      /* Penanda kurang-foto HANYA untuk langkah wajib — yang
                         opsional tidak menahan apa pun, dan menuduhnya belum
                         lengkap membuat orang memotret sesuatu yang tidak
                         diminta siapa pun. */
                      (perluFotoLangkah && l.wajib
                        ? '<i class="' + (lengkap ? 'mcs-lg__ok' : 'mcs-lg__no') + '">' +
                          (lengkap ? '📷 ' + T('lengkap') : '📷 ' + T('belum lengkap')) + '</i>'
                        : '') +
                    '</label>' +
                    /* Slot foto MILIK LANGKAH INI — bukan milik tugasnya.
                       Ditaruh tepat di bawah langkahnya supaya tidak ada
                       keraguan foto mana untuk langkah mana. */
                    '<div class="mcs-lg__f">' +
                      slotLangkah(l.id, 'sebelum', f.sebelum) +
                      slotLangkah(l.id, 'sesudah', f.sesudah) +
                    '</div>' +
                  '</div>';
                }).join('') + '</div>' +
              '</div>'
            : '') +

          '<label class="kh-f"><span>' + T('Dikerjakan oleh') + '</span>' +
            '<select class="select" data-change="lp-pelaksana">' + petugas.map(function (p) {
              return '<option value="' + U.esc(p.id) + '"' +
                (p.id === pelaksanaId ? ' selected' : '') + '>' +
                MCS.jenisPekerja(p.jenis).ikon + ' ' + U.esc(p.nama) + '</option>';
            }).join('') + '</select></label>' +

          '<div class="mcs-ba">' +
            '<div><div class="mcs-acuan__j">' + T('Foto sebelum') + '</div>' +
              UI.photoGrid(rec ? (rec.sebelum || []) : [],
                { addAct: 'lp-add-sebelum', delAct: 'lp-del-sebelum', addLabel: T('Foto sebelum') }) +
            '</div>' +
            '<div><div class="mcs-acuan__j">' + T('Foto sesudah') + '</div>' +
              UI.photoGrid(rec ? (rec.sesudah || []) : [],
                { addAct: 'lp-add-sesudah', delAct: 'lp-del-sesudah', addLabel: T('Foto sesudah') }) +
            '</div>' +
          '</div>' +

          '<label class="kh-f"><span>' + T('Catatan') + '</span>' +
            '<textarea class="input" rows="2" data-change="lp-catatan" placeholder="' +
            U.esc(T('mis. keran bocor, sudah dilaporkan ke teknisi')) + '">' +
            U.esc(rec ? (rec.catatan || '') : '') + '</textarea></label>' +

          (t.wajibFoto
            ? '<div class="kh-catat">📷 ' +
              T('Area ini menuntut foto sesudah sebagai bukti sebelum bisa ditandai selesai.') +
              '</div>'
            : '') +
          /* Kuota disebutkan SEBELUM penuh. Saat benar-benar penuh, foto
             terlama dibuang otomatis untuk memberi ruang — bukti kemarin
             hilang diam-diam supaya bukti hari ini muat. */
          (ruang.waspada
            ? '<div class="' + (ruang.genting ? 'kh-sebab' : 'kh-catat') + ' mt-2">' +
              (ruang.genting ? '⚠️ ' : '💾 ') +
              T('Penyimpanan peramban terpakai {p}% ({kb} KB dari {kuota} KB).')
                .replace('{p}', ruang.persen).replace('{kb}', U.num(ruang.kb))
                .replace('{kuota}', U.num(ruang.kuotaKb)) + ' ' +
              T('Bila penuh, foto paling lama dibuang otomatis. Unduh cadangan lewat ' +
                'Data & pengaturan sebelum itu terjadi.') +
              '</div>'
            : ''),
        /* Tugas yang sudah selesai tetap perlu tombol simpan: catatan dan
           siapa yang mengerjakannya masih bisa diperbaiki, dan tanpa tombol
           itu yang diketik orang hilang tanpa pemberitahuan apa pun. */
        foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
          '<button class="btn btn--primary" data-act="lp-selesai">' +
            T(selesai ? 'Simpan' : T('Simpan & tandai selesai')) + '</button>',
        actions: {
          'lp-pelaksana': function (el) { pelaksanaId = el.value; },
          'lp-catatan': function (el) { catatanBaru = el.value; },
          /* Memindai dari dalam dialog laporan menutup dialognya lalu
             MEMBUKANYA KEMBALI — bukan meninggalkan orang di layar kosong
             sambil bertanya-tanya apakah isian tadi hilang. */
          'lp-pindai': function () {
            if (tutupLapor) tutupLapor();
            dialogPindai({ areaId: t.area.id, onSukses: function () {
              dialogLapor(jadwalId, tgl, jam);
            } });
          },
          'lp-langkah': function (el) {
            MCS.setLangkahTugas(kid, jadwalId, tgl, jam, el.getAttribute('data-id'), el.checked);
            segarkan();
          },
          'lg-add': function (el) {
            var s = el.getAttribute('data-s'), jenis = el.getAttribute('data-jenis');
            /* Lebih kecil daripada bawaan: foto per langkah berlipat cepat,
               dan gambar 640px sudah cukup membuktikan lantai sudah dipel. */
            UI.handleFotoInput(el, function (ids) {
              MCS.simpanFotoLangkah(kid, jadwalId, tgl, jam, s, jenis, ids);
              segarkan();
            }, { maxSide: 640, quality: 0.5, maks: 2 });
          },
          'lg-del': function (el) {
            MCS.hapusFotoLangkah(jadwalId, tgl, jam, el.getAttribute('data-s'),
              el.getAttribute('data-jenis'), el.getAttribute('data-id'));
            segarkan();
          },
          'lp-add-sebelum': function (el) { tambahFoto(el, 'sebelum'); },
          'lp-add-sesudah': function (el) { tambahFoto(el, 'sesudah'); },
          'lp-del-sebelum': function (el) { buangFoto(el, 'sebelum'); },
          'lp-del-sesudah': function (el) { buangFoto(el, 'sesudah'); },
          'zoom': function (el) { UI.lightbox(el.getAttribute('src')); },
          'lp-selesai': function (el) {
            /* Statusnya dipertahankan bila memang sudah selesai — menyimpan
               catatan tidak seharusnya menandai ulang pekerjaan orang. */
            var r = MCS.tandai(kid, jadwalId, tgl, jam, selesai ? 'selesai' : 'selesai',
              APP.user, { pekerjaId: pelaksanaId, catatan: catatanBaru });
            if (r.error) { UI.toast(r.error, 'err'); return; }
            el.closest('.modal-back').remove(); document.body.style.overflow = '';
            UI.toast(T(selesai ? 'Laporan disimpan' : T('Ditandai selesai')), 'ok');
            APP.refresh();
          }
        }
      });
    }

    var catatanBaru = rec ? (rec.catatan || '') : '';

    /* Setelah unggah, dialog dibuka ulang supaya kisi fotonya ikut terbarui.
       Menggambar ulang sebagian isi modal lebih rumit daripada manfaatnya. */
    function segarkan() {
      var m = document.getElementById('mcs-lapor');
      if (m) { m.closest('.modal-back').remove(); document.body.style.overflow = ''; }
      rec = MCS.catatanSlot(jadwalId, tgl, jam);
      t = MCS.tugasHari(kid, tgl).filter(function (x) {
        return x.jadwalId === jadwalId && x.jam === jam; })[0] || t;
      selesai = t.status === 'selesai';
      buka();
    }

    function tambahFoto(el, jenis) {
      UI.handleFotoInput(el, function (ids) {
        MCS.simpanFotoTugas(kid, jadwalId, tgl, jam, jenis, ids);
        UI.toast(ids.length + ' ' + T('foto ditambahkan'), 'ok');
        segarkan();
      });
    }
    function buangFoto(el, jenis) {
      MCS.hapusFotoTugas(jadwalId, tgl, jam, jenis, el.getAttribute('data-id'));
      segarkan();
    }

    buka();
  }

  function tandai(el, status, ket) {
    var r = MCS.tandai(kop(), el.getAttribute('data-j'), el.getAttribute('data-t'),
      el.getAttribute('data-h'), status, APP.user, { catatan: ket });
    if (r.error) { UI.toast(r.error, 'err'); return; }
    UI.toast(status === 'selesai' ? T('Ditandai selesai') : T('Ditandai dilewati'), 'ok');
    APP.refresh();
  }

  /* =============================================================== PROFIL */

  /**
   * Pengaturan bukti kehadiran.
   *
   * Dimatikan secara bawaan dan HARUS dinyalakan sendiri. Menyalakannya
   * otomatis di gedung yang tagnya belum tertempel akan mengunci seluruh
   * pelaporan pada hari yang sama — dan yang disalahkan orang bukan tag yang
   * belum dicetak, melainkan aplikasinya.
   */

  function baris(l, n) {
    return '<div class="kh-br"><div class="kh-br__l">' + l + '</div>' +
      '<div class="kh-br__n">' + n + '</div></div>';
  }

  /**
   * Alamat ditampilkan per kolom bila memang terstruktur.
   *
   * Satu baris panjang menyembunyikan yang kosong: korporat yang lupa mengisi
   * kecamatan tidak akan pernah tahu, sampai ada yang mencoba mengirim sesuatu
   * ke sana.
   */

  /**
   * Calon atasan: yang berjabatan LEBIH TINGGI di gedung yang sama.
   *
   * Untuk petugas baru, jabatannya belum dipilih saat daftar ini disusun —
   * jadi seluruh yang lebih tinggi dari 'pelaksana' ditawarkan, dan
   * periksaAtasan() yang menjadi penjaga terakhirnya saat disimpan.
   */
  function calonAtasan(k, x) {
    var levelDiri = x ? MCS.jabatan(x.jabatan).level : 3;
    return MCS.pekerja(k.id).filter(function (p) {
      if (x && p.id === x.id) return false;
      return MCS.jabatan(p.jabatan).level < levelDiri;
    });
  }

  /* ================================================ penempatan & jam kerja
     Ditahan di variabel karena berada di luar `fields` — UI.formModal
     membongkar modalnya sebelum janjinya selesai. */

  function akar() {
    var m = document.querySelectorAll('.modal-back');
    return m.length ? m[m.length - 1] : document;
  }

  var fotoTahan = {};

  function kotakFoto(kunci, awal, o) {
    o = o || {};
    fotoTahan[kunci] = (awal || []).slice();
    return '<div class="field"><label>' + (o.label || T('Foto')) + '</label>' +
      '<div class="as-f" id="fk-' + kunci + '">' + isiKotakFoto(kunci, o) + '</div></div>';
  }

  /* Pengaturan tiap kotak disimpan supaya penggambaran ulang setelah menambah
     atau membuang foto tidak kehilangan batas dan keterangannya. */

  var fotoOpsi = {};

  function isiKotakFoto(kunci, o) {
    if (o) fotoOpsi[kunci] = o;
    o = fotoOpsi[kunci] || {};
    var maks = o.maks || 4;
    var ids = fotoTahan[kunci] || [];
    return '<div class="as-f__g">' +
        ids.map(function (id, i) {
          var src = DB.getPhoto(id);
          return '<div class="as-f__i">' +
            (src ? '<img src="' + U.esc(src) + '" alt="">' : '<div class="as-f__x">?</div>') +
            '<button type="button" class="as-f__b" data-act="fk-buang" ' +
              'data-k="' + kunci + '" data-i="' + i + '" ' +
              'title="' + T('Buang foto') + '">✕</button>' +
          '</div>';
        }).join('') +
        (ids.length < maks
          ? '<label class="as-f__t">+' +
            '<input type="file" accept="image/*" multiple hidden ' +
              'data-change="fk-pilih" data-k="' + kunci + '"></label>'
          : '') +
      '</div>' +
      '<div class="tbl-sub">' +
        (ids.length >= maks
          ? T('Sudah mencapai batasnya.')
          : (o.hint || '')) +
      '</div>';
  }

  function gambarKotakFoto(kunci) {
    var el = document.getElementById('fk-' + kunci);
    if (el) el.innerHTML = isiKotakFoto(kunci);
  }

  function ambilFoto(kunci) { return (fotoTahan[kunci] || []).slice(); }

  /* Dipasang lewat onMount — akar halaman tidak mencakup isi modal. */

  function pasangAksiFoto(root) {
    delegasi(root, {
      'fk-pilih': function (el) {
        var kunci = el.getAttribute('data-k');
        var o = fotoOpsi[kunci] || {};
        var maks = o.maks || 4;
        var sisa = maks - (fotoTahan[kunci] || []).length;
        if (sisa <= 0) return;
        UI.handleFotoInput(el, function (ids) {
          if (!ids.length) return;
          fotoTahan[kunci] = (fotoTahan[kunci] || []).concat(ids).slice(0, maks);
          gambarKotakFoto(kunci);
        }, { maks: sisa, maxSide: o.maxSide || 900, quality: o.quality || 0.6 });
      },
      'fk-buang': function (el) {
        var kunci = el.getAttribute('data-k');
        /* Fotonya TIDAK dihapus di sini — hanya dilepas dari daftar. Menghapus
           saat ini juga akan menghancurkan foto yang masih dipakai catatan lain
           bila dialognya kemudian dibatalkan. Yang yatim disapu pemulung
           sampah belakangan. */
        (fotoTahan[kunci] || []).splice(Number(el.getAttribute('data-i')), 1);
        gambarKotakFoto(kunci);
      }
    });
  }

  /* Nilai ekonomis: angka + satuan. Disimpan selalu dalam BULAN. */

  function kvKerja(k, v, extra) {
    return '<div class="wk-kv"><span>' + U.esc(k) + '</span><b>' + U.esc(v) +
      (extra ? ' ' + extra : '') + '</b></div>';
  }

  function barisId(label, isi) {
    return '<tr><th>' + U.esc(label) + '</th><td>' + U.esc(isi) + '</td></tr>';
  }

  /** Pembobotan itu keputusan kebijakan; disembunyikan di kode ia terasa turun dari langit. */

  /**
   * @param o.judul   judul lembar
   * @param o.sub     keterangan di bawah judul (periode, tanggal, saringan)
   * @param o.kolom   [{h, num?, r(baris, i)}] — r() mengembalikan TEKS, bukan HTML
   * @param o.baris   array data
   * @param o.kaki    catatan di bawah tabel (opsional)
   */
  function cetakDaftar(o) {
    var k = korp();
    var lama = document.getElementById('ct-lembar');
    if (lama) lama.parentNode.removeChild(lama);

    if (!o.baris.length) {
      UI.toast(T('Tidak ada yang bisa dicetak — daftarnya masih kosong.'), 'err');
      return;
    }

    var el = document.createElement('div');
    el.id = 'ct-lembar';
    el.className = 'ct';
    el.innerHTML =
      '<div class="ct__kop">' +
        '<div class="ct__pt">' + U.esc((k && k.nama) || 'EXOCLEAN') + '</div>' +
        '<div class="ct__jd">' + U.esc(o.judul) + '</div>' +
        (o.sub ? '<div class="ct__sub">' + U.esc(o.sub) + '</div>' : '') +
      '</div>' +
      '<table class="ct__t"><thead><tr>' +
        o.kolom.map(function (c) {
          return '<th' + (c.num ? ' class="num"' : '') + '>' + U.esc(c.h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
        o.baris.map(function (b, i) {
          return '<tr>' + o.kolom.map(function (c) {
            var v = c.r(b, i);
            return '<td' + (c.num ? ' class="num"' : '') + '>' +
              U.esc(v === null || v === undefined ? '' : String(v)) + '</td>';
          }).join('') + '</tr>';
        }).join('') +
      '</tbody></table>' +
      (o.kaki ? '<div class="ct__ket">' + U.esc(o.kaki) + '</div>' : '') +
      /* Kaki halaman menyebutkan KAPAN dicetak. Daftar petugas yang beredar
         di gedung tanpa tanggal akan dipakai berbulan-bulan setelah isinya
         berubah, dan tidak ada yang tahu bahwa ia sudah usang. */
      '<div class="ct__kaki">' +
        '<span>' + T('Dicetak') + ' ' + U.esc(U.tglJam(U.nowISO())) +
          (APP.user ? ' · ' + U.esc(APP.user.nama) : '') + '</span>' +
        '<span>MCS EXOCLEAN</span>' +
      '</div>';

    document.body.appendChild(el);
    document.body.classList.add('cetak-tabel');
    window.print();
    setTimeout(function () {
      document.body.classList.remove('cetak-tabel');
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 600);
  }

  /** Nama area/petugas sebagai teks polos — dipakai berulang oleh lembar cetak. */

  function namaArea(id) {
    var a = MCS.areaSatu(id);
    return a ? a.nama : T('Area terhapus');
  }

  function namaPekerja(id) {
    var p = id ? MCS.pekerjaSatu(id) : null;
    return p ? p.nama : '';
  }

  function angka(judul, besar, kecil) {
    return '<div class="lap__a"><span>' + U.esc(judul) + '</span>' +
      '<b>' + besar + '</b>' +
      (kecil ? '<i>' + U.esc(kecil) + '</i>' : '') + '</div>';
  }

  var imTeks = '';
  /* modal() memberikan fungsi penutupnya sebagai argumen kedua onMount.
     Ditahan di sini karena yang menutup adalah jalankanImpor, yang berjalan
     jauh dari tempat modalnya dibuat. */

  var imTutup = null;

  /* 'struktur' | 'stok'. Ditahan di modul karena periksaImpor dan
     jalankanImpor berjalan jauh dari tempat dialognya dibuka. */

  var imMode = 'struktur';

  function dialogImpor(mode) {
    imMode = mode === 'stok' ? 'stok' : 'struktur';
    imTeks = '';
    UI.modal({
      title: imMode === 'stok'
        ? T('Impor bahan habis pakai dari CSV')
        : T('Impor struktur dari CSV'),
      body:
        '<div class="tbl-sub mb-2">' +
          (imMode === 'stok'
            ? T('Satu baris satu barang. Tiga kolom menentukan mutu seluruh ' +
                'perkiraan kebutuhan sesudahnya: Harga, Cakupan m2, dan Dipakai ' +
                'di area. Ketiganya boleh dikosongkan dan barangnya tetap masuk, ' +
                'tetapi pratinjau akan menghitung berapa yang kosong dan ' +
                'mengatakan akibatnya.')
            : T('Satu baris menuliskan jalur lengkapnya: lokasi, area, bangunan, ' +
                'lantai, ruangan, objek. Induk yang sama diulang di baris ' +
                'berikutnya. Kolom yang dikosongkan berarti barisnya berhenti di ' +
                'situ — jadi halaman parkir tanpa bangunan boleh berada di berkas ' +
                'yang sama dengan gedung dua puluh lantai.')) +
        '</div>' +
        '<div class="row mb-2">' +
          '<button class="btn btn--ghost btn--sm" data-act="im-contoh">⬇ ' +
            T('Unduh berkas contoh') + '</button>' +
        '</div>' +
        '<div class="field"><label>' + T('Berkas CSV') + '</label>' +
          '<input class="input" type="file" accept=".csv,text/csv,text/plain" ' +
            'data-change="im-berkas"></div>' +
        '<div class="field"><label>' + T('Atau tempelkan isinya di sini') + '</label>' +
          '<textarea class="textarea" id="im-teks" rows="6" ' +
            'placeholder="' + (imMode === 'stok'
              /* CONTOH ISI BERKAS, bukan teks layar — kepala kolom yang
                 diterjemahkan tidak akan dikenali pengurainya, dan orang yang
                 menyalinnya justru mendapat berkas yang ditolak. */
              ? /* Kepala CSV — DATA, bukan antarmuka. Ia harus sama persis dengan yang
   dibaca pengimpor; menerjemahkannya membuat berkas yang diunduh hari ini
   tidak bisa diimpor kembali besok. */
      /* i18n:data */ 'Nama;Satuan;Harga;Cakupan m2;Dipakai di area' /* i18n:/data */
              : 'Lokasi;Area;Bangunan;Lantai;Ruangan;Objek') + '"></textarea>' +
          '<div class="hint">' +
            T('Menempel langsung dari lembar kerja juga bekerja — kolomnya ' +
              'terpisah tab, dan itu dikenali.') + '</div></div>' +
        '<div id="im-hasil"></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="im-periksa">' + T('Periksa') + '</button>',
      onMount: pasangImpor
    });
  }

  function pasangImpor(root, tutup) {
    imTutup = tutup;
    delegasi(root, {
      'im-contoh': function () {
        if (imMode === 'stok') {
          unduhTeks(IMPOR.contohCsvStok(), 'contoh-bahan-habis-pakai.csv');
        } else {
          unduhTeks(IMPOR.contohCsv(), 'contoh-struktur.csv');
        }
      },
      'im-berkas': function (el) {
        var f = el.files && el.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          imTeks = String(fr.result || '');
          var t = document.getElementById('im-teks');
          /* Isinya ditaruh di kotak teks juga: yang memakai harus BISA MELIHAT
             apa yang terbaca dari berkasnya. Berkas yang ternyata kosong atau
             salah pilih terlihat seketika, bukan setelah menekan Periksa. */
          if (t) t.value = imTeks.slice(0, 20000);
          periksaImpor();
        };
        fr.readAsText(f);
      },
      'im-periksa': periksaImpor,
      'im-jalan': jalankanImpor
    });
  }

  var imRencana = null;

  function periksaImpor() {
    var t = document.getElementById('im-teks');
    var teks = (t && t.value) || imTeks;
    var el = document.getElementById('im-hasil');
    if (!el) return;
    if (!String(teks).trim()) {
      el.innerHTML = UI.alert('warn', T('Belum ada isi untuk diperiksa.'), '📄');
      return;
    }
    var h = imMode === 'stok'
      ? IMPOR.uraiStok(korp().id, teks)
      : IMPOR.urai(korp().id, teks);
    imRencana = h.ok ? h : null;
    el.innerHTML = h.ok
      ? (imMode === 'stok' ? pratinjauStok(h) : pratinjauImpor(h))
      : UI.alert('danger', U.esc(h.error), '⚠');
  }

  function barisImpor(label, baru, ada) {
    if (!baru && !ada) return '';
    return '<div class="row row--sb"><span>' + label + '</span><span>' +
      (baru ? '<b>+' + U.num(baru) + '</b>' : '<span class="tbl-sub">—</span>') +
      (ada ? ' <span class="tbl-sub">· ' + U.num(ada) + ' ' + T('sudah ada') +
        '</span>' : '') +
      '</span></div>';
  }

  function pratinjauImpor(h) {
    var b = h.baru, a = h.sudahAda;
    return '<div class="mt-3 card p-3">' +
      '<b>' + T('Yang akan dibuat') + '</b>' +
      '<div class="wk-d__k mt-2">' +
        barisImpor(T('Lokasi'), b.lokasi, a.lokasi) +
        barisImpor(T('Area'), b.area, a.area) +
        barisImpor(T('Bangunan'), b.bangunan, a.bangunan) +
        barisImpor(T('Lantai'), b.lantai, a.lantai) +
        barisImpor(T('Ruangan'), b.ruangan, a.ruangan) +
        barisImpor(T('Objek'), b.objek, a.objek) +
      '</div>' +
      '<div class="tbl-sub mt-2">' +
        jml(h.barisData, '1 baris data dibaca', '{n} baris data dibaca') +
        (h.kolomDiabaikan.length
          ? ' · ' + T('kolom tidak dikenali') + ': ' +
            U.esc(h.kolomDiabaikan.join(', '))
          : '') +
      '</div>' +
      /* Yang SUDAH ADA disebutkan, bukan disembunyikan. Tanpa angka ini,
         impor kedua atas berkas yang sama terlihat seolah tidak melakukan
         apa-apa, dan orang mengimpornya berkali-kali mencari sebabnya. */
      (h.sudahAda.lokasi + h.sudahAda.area + h.sudahAda.bangunan +
       h.sudahAda.lantai + h.sudahAda.ruangan + h.sudahAda.objek
        ? '<div class="tbl-sub mt-1">' +
            T('Yang sudah ada dilewati, tidak ditimpa — luas atau jenis yang ' +
              'sudah Anda betulkan di aplikasi tetap seperti apa adanya.') +
          '</div>'
        : '') +
    '</div>' +

    (h.masalah.length ? daftarPesanImpor('danger', '⛔',
        T('Baris yang tidak bisa dipakai'), h.masalah,
        T('Baris ini dilewati. Sisanya tetap bisa diimpor.')) : '') +
    (h.peringatan.length ? daftarPesanImpor('warn', '🔍',
        T('Perlu dilihat'), h.peringatan,
        T('Bisa diimpor apa adanya, tetapi periksa dulu — jenis yang salah ' +
          'membuat jam kerja dan biaya dihitung dengan laju yang keliru.')) : '') +

    '<div class="row mt-3">' +
      (h.totalBaru
        ? '<button class="btn" data-act="im-jalan">' +
            T('Buat') + ' ' + U.num(h.totalBaru) + ' ' + T('entri') + '</button>'
        : '<div class="tbl-sub">' +
            T('Tidak ada yang baru — semuanya sudah terdaftar.') + '</div>') +
    '</div>';
  }

  /**
   * Pratinjau bahan habis pakai.
   *
   * Berbeda dari pratinjau struktur pada satu hal yang penting: ia
   * menghitung KOLOM YANG KOSONG dan mengatakan akibatnya masing-masing.
   * Tiga ratus barang yang masuk tanpa harga menghasilkan halaman biaya
   * yang terlihat murah, dan tidak ada satu pun tanda di layar yang
   * menjelaskan mengapa — sampai seseorang membandingkannya dengan nota
   * pembelian setahun kemudian.
   */

  function pratinjauStok(h) {
    function kekurangan(n, judul, akibat) {
      if (!n) return '';
      return '<div class="row row--sb"><span>' + judul + '</span>' +
        '<b>' + U.num(n) + '</b></div>' +
        '<div class="tbl-sub mb-1">' + akibat + '</div>';
    }
    return '<div class="mt-3 card p-3">' +
      '<b>' + T('Yang akan dibuat') + '</b>' +
      '<div class="wk-d__k mt-2">' +
        barisImpor(T('Barang baru'), h.baru, 0) +
        (h.sudahAda
          ? '<div class="row row--sb"><span>' + T('Diperbarui') + '</span><b>' +
            U.num(h.sudahAda) + '</b></div>'
          : '') +
      '</div>' +
      '<div class="tbl-sub mt-2">' +
        jml(h.barisData, '1 baris data dibaca', '{n} baris data dibaca') +
        (h.kolomDiabaikan.length
          ? ' · ' + T('kolom tidak dikenali') + ': ' + U.esc(h.kolomDiabaikan.join(', '))
          : '') +
      '</div>' +
      (h.sudahAda
        /* Berbeda dari impor struktur: di sini yang sudah ada memang
           DIPERBARUI, karena daftar harga pemasok dikirim ulang tiap
           kuartal dan menolaknya berarti mengetik ratusan harga tangan.
           Yang tidak ikut ditimpa adalah stoknya. */
        ? '<div class="tbl-sub mt-1">' +
            T('Barang yang namanya sudah ada akan DIPERBARUI harga dan ' +
              'keterangannya. Stoknya tidak ikut ditimpa — saldo dihitung dari ' +
              'riwayat barang masuk dan keluar, bukan dari berkas.') +
          '</div>'
        : '') +
    '</div>' +

    ((h.tanpaHarga || h.tanpaCakupan || h.tanpaLingkup)
      ? UI.alert('warn', '<b>' + T('Kolom yang dikosongkan') + '</b>' +
          '<div class="mt-1">' +
            kekurangan(h.tanpaHarga, T('tanpa harga'),
              T('Pemakaiannya tidak ikut terhitung sama sekali, sehingga biaya ' +
                'bahan tampil lebih kecil daripada yang sebenarnya.')) +
            kekurangan(h.tanpaCakupan, T('tanpa cakupan m²'),
              T('Perkiraan kebutuhan bulan depan tidak bisa dihitung untuk barang ' +
                'ini — wajar untuk tisu dan kantong sampah yang tidak diukur per ' +
                'meter persegi.')) +
            kekurangan(h.tanpaLingkup, T('dipakai di seluruh area'),
              T('Benar untuk pembersih serbaguna. Untuk barang khusus, ini membuat ' +
                'perkiraannya berlipat dan penanda boros/irit terbaca terbalik.')) +
          '</div>', '📋') + '<div class="mb-2"></div>'
      : '') +

    (h.masalah.length ? daftarPesanImpor('danger', '⛔',
        T('Baris yang tidak bisa dipakai'), h.masalah,
        T('Baris ini dilewati. Sisanya tetap bisa diimpor.')) : '') +
    (h.peringatan.length ? daftarPesanImpor('warn', '🔍',
        T('Perlu dilihat'), h.peringatan,
        T('Bisa diimpor apa adanya, tetapi periksa dulu.')) : '') +

    '<div class="row mt-3">' +
      (h.daftar.length
        ? '<button class="btn" data-act="im-jalan">' +
            T('Simpan') + ' ' + U.num(h.daftar.length) + ' ' + T('barang') + '</button>'
        : '<div class="tbl-sub">' + T('Tidak ada baris yang bisa dipakai.') + '</div>') +
    '</div>';
  }

  /* Nomor baris disebut selalu. "Ada yang salah di berkas Anda" tanpa nomor
     baris memaksa orang memeriksa delapan ratus baris satu per satu. */

  function daftarPesanImpor(warna, ikon, judul, daftar, kaki) {
    var awal = daftar.slice(0, 12);
    return UI.alert(warna,
      '<b>' + judul + ' (' + U.num(daftar.length) + ')</b>' +
      '<div class="mt-1">' +
        awal.map(function (m) {
          return '<div class="tbl-sub">' + T('baris') + ' ' + m.baris + ' — ' +
            U.esc(m.pesan) + '</div>';
        }).join('') +
        (daftar.length > awal.length
          ? '<div class="tbl-sub">' +
            jml(daftar.length - awal.length, T('dan 1 lagi'), T('dan {n} lagi')) +
            '</div>'
          : '') +
      '</div>' +
      '<div class="tbl-sub mt-1">' + kaki + '</div>', ikon) + '<div class="mb-2"></div>';
  }

  /**
   * Jalankan sesuatu hanya setelah PIN transaksi benar.
   *
   * Dipakai perbuatan yang mengubah RATUSAN baris sekaligus. Perbuatan
   * sehari-hari sengaja TIDAK dijaga: PIN yang diminta dua puluh kali
   * sehari akan berubah menjadi enam angka yang ditempel di sisi monitor,
   * dan sejak itu ia tidak menjaga apa pun.
   *
   * Diam saja bila PIN-nya batal — mintaPin() sudah mengatakan sebabnya,
   * dan dua pesan untuk satu penolakan membuat yang kedua tidak dibaca.
   */

  function denganPin(opsi, lanjut) {
    if (!window.ViewKeamanan || !ViewKeamanan.mintaPin) { lanjut(); return; }
    ViewKeamanan.mintaPin(opsi).then(function (pin) {
      if (!pin) return;
      lanjut();
    });
  }

  function jalankanImpor() {
    if (!imRencana) return;
    if (imMode === 'stok') return jalankanImporStok();
    denganPin({
      judul: T('PIN untuk mengimpor berkas'),
      sub: T('Impor mengubah ratusan baris sekaligus dan tidak bisa dibatalkan.')
    }, teruskanImpor);
  }

  function teruskanImpor() {
    var h = IMPOR.terapkan(korp().id, imRencana);
    if (h.error) { UI.toast(h.error, 'err'); return; }
    imRencana = null;
    if (imTutup) { imTutup(); imTutup = null; }
    var d = h.dibuat, u = h.diperbarui || {};
    /* "Diperbarui" DISEBUTKAN tersendiri, dan "tidak ada perubahan"
       dikatakan terang-terangan. Impor kedua yang tidak mengubah apa pun
       dulu memunculkan pesan "Diimpor:" dengan daftar kosong di
       belakangnya — terlihat seperti berhasil, padahal tidak terjadi
       apa-apa. */
    var ringkas = [
      d.lokasi && jml(d.lokasi, '1 lokasi', '{n} lokasi'),
      d.area && jml(d.area, '1 area', '{n} area'),
      d.bangunan && jml(d.bangunan, '1 bangunan', '{n} bangunan'),
      d.lantai && jml(d.lantai, '1 lantai', '{n} lantai'),
      d.ruangan && jml(d.ruangan, '1 ruangan', '{n} ruangan'),
      d.objek && jml(d.objek, '1 objek', '{n} objek')
    ].filter(Boolean).join(', ');
    var pesan = [
      ringkas && T('Ditambahkan') + ': ' + ringkas,
      u.objek && T('Ukuran diperbarui') + ': ' +
        jml(u.objek, '1 objek', '{n} objek')
    ].filter(Boolean).join(' · ');
    UI.toast(pesan || T('Tidak ada perubahan — semuanya sudah sama'), 'ok');
    if (h.gagal.length) {
      UI.toast(jml(h.gagal.length, T('1 entri gagal dibuat'),
        T('{n} entri gagal dibuat')) + ': ' + h.gagal.slice(0, 3).join('; '), 'err');
    }
    APP.refresh();
  }

  function jalankanImporStok() {
    denganPin({
      judul: T('PIN untuk mengimpor berkas'),
      sub: T('Impor mengubah ratusan baris sekaligus dan tidak bisa dibatalkan.')
    }, teruskanImporStok);
  }

  function teruskanImporStok() {
    var h = IMPOR.terapkanStok(korp().id, imRencana, APP.user);
    if (h.error) { UI.toast(h.error, 'err'); return; }
    imRencana = null;
    if (imTutup) { imTutup(); imTutup = null; }
    UI.toast([
      h.dibuat && jml(h.dibuat, T('1 barang ditambahkan'), T('{n} barang ditambahkan')),
      h.diperbarui && jml(h.diperbarui, '1 diperbarui', '{n} diperbarui')
    ].filter(Boolean).join(', ') || T('Tidak ada perubahan'), 'ok');
    if (h.gagal.length) {
      UI.toast(jml(h.gagal.length, T('1 barang gagal disimpan'),
        T('{n} barang gagal disimpan')) + ': ' + h.gagal.slice(0, 3).join('; '), 'err');
    }
    APP.refresh();
  }

  /* Unduhan teks biasa. Dipakai berkas contoh — dan sengaja memakai BOM,
     karena tanpanya Excel membaca berkasnya sebagai ANSI dan nama berhuruf
     non-ASCII rusak sejak baris pertama. */

  function unduhTeks(isi, namaBerkas) {
    var blob = new Blob([isi], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = namaBerkas;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function tombol(aksi, id, label, judul) {
    return '<button class="btn btn--ghost btn--sm" data-act="' + aksi + '" data-id="' + id +
      '" title="' + U.esc(judul || label) + '">' + label + '</button>';
  }
  /* ------------------------------------------------------------ PENDAFTARAN

     Tiap berkas layar mendaftarkan halamannya sendiri, sehingga definisi
     halaman berada di sebelah kodenya dan bukan di satu daftar raksasa yang
     jauh dari semuanya.

     URUTANNYA TIDAK ditentukan di sini. MENU.susun memakai urutan kunci
     objek untuk halaman yang belum punya urutan tersimpan, sehingga urutan
     pemuatan berkas akan diam-diam menjadi urutan menu. Yang menyusunnya
     views/mcs.js, dari satu daftar yang bisa dibaca sekaligus. */
  var _hal = { korporat: {}, petugas: {}, admin: {} };
  function daftar(peta, kunci, def) {
    if (!_hal[peta]) throw new Error('peta halaman tidak dikenal: ' + peta);
    _hal[peta][kunci] = def;
  }

  return {
    T: T,
    kop: kop,
    korp: korp,
    delegasi: delegasi,
    kartuMutu: kartuMutu,
    jml: jml,
    DP_HAL: DP_HAL,
    dpKeadaan: dpKeadaan,
    dpS: dpS,
    dpUlang: dpUlang,
    dpIds: dpIds,
    dpSaring: dpSaring,
    dpBilah: dpBilah,
    dpPotong: dpPotong,
    dpAksi: dpAksi,
    selMutu: selMutu,
    judulMutu: judulMutu,
    STATUS: STATUS,
    barisTugas: barisTugas,
    slotLangkah: slotLangkah,
    jamMenit: jamMenit,
    adaPemindai: adaPemindai,
    dialogPindai: dialogPindai,
    dialogTag: dialogTag,
    cetak: cetak,
    barisBukti: barisBukti,
    dialogLapor: dialogLapor,
    tandai: tandai,
    baris: baris,
    calonAtasan: calonAtasan,
    akar: akar,
    fotoTahan: fotoTahan,
    kotakFoto: kotakFoto,
    fotoOpsi: fotoOpsi,
    isiKotakFoto: isiKotakFoto,
    gambarKotakFoto: gambarKotakFoto,
    ambilFoto: ambilFoto,
    pasangAksiFoto: pasangAksiFoto,
    kvKerja: kvKerja,
    barisId: barisId,
    cetakDaftar: cetakDaftar,
    namaArea: namaArea,
    namaPekerja: namaPekerja,
    angka: angka,
    imTeks: imTeks,
    imTutup: imTutup,
    imMode: imMode,
    dialogImpor: dialogImpor,
    pasangImpor: pasangImpor,
    imRencana: imRencana,
    periksaImpor: periksaImpor,
    barisImpor: barisImpor,
    pratinjauImpor: pratinjauImpor,
    pratinjauStok: pratinjauStok,
    daftarPesanImpor: daftarPesanImpor,
    denganPin: denganPin,
    jalankanImpor: jalankanImpor,
    teruskanImpor: teruskanImpor,
    jalankanImporStok: jalankanImporStok,
    teruskanImporStok: teruskanImporStok,
    unduhTeks: unduhTeks,
    tombol: tombol,
    _hal: _hal, daftar: daftar,
    /* DIISI views/mcs-lapor.js, bukan di sini.

       Layar publik — portal pemilik gedung dan tag yang dipindai penghuni —
       tinggal di berkas laporan bersama seluruh kodenya, tetapi app.js
       memanggilnya lewat ViewMCS sebelum ada sesi. Slotnya diumumkan di
       sini supaya ia terbaca sebagai bagian kontrak modul; nama yang
       ditempelkan belakangan tanpa disebut di daftar ini tidak akan terlihat
       oleh siapa pun yang membaca kontraknya — dan tidak terlihat pula oleh
       audit-ekspor, yang justru bertugas menangkap pemanggilan ke nama yang
       tidak ada. */
    layarPublik: null
  };
})();
