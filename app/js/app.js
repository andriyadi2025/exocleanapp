/* ==========================================================================
   app.js — sesi, router, dan kerangka tampilan (shell)
   --------------------------------------------------------------------------
   Kontrak tiap modul peran (ViewAdmin / ViewSupervisor / ViewClient / ViewWorker):
     pages = {
       key: { label, icon, grup, badge?():number, render(params):string, mount?(root, params),
              tersembunyi?:boolean }

       tersembunyi: halaman tetap bisa dituju lewat APP.go(), tetapi tidak
       muncul di menu. Untuk layar yang selalu dibuka DARI sesuatu — detail
       produk dibuka dari kartunya — dan tidak masuk akal berdiri sendiri di
       daftar menu tanpa tahu produk mana yang dimaksud.
     }
   ========================================================================== */
var APP = (function () {

  var SESSION_KEY = RUANG.kunci('session');
  var MODULES = {};
  /* Induk mana yang sedang terbentang. Sengaja TIDAK disimpan ke pengaturan:
     ini keadaan tampilan milik sesi yang sedang berjalan, bukan susunan yang
     ditetapkan Super Admin untuk semua orang. */
  var navBuka = {};
  var state = { user: null, page: null, params: {} };

  /* ---------------------------------------------------------------- sesi */
  function simpanSesi(id) {
    try { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function ambilSesi() {
    try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }

  function login(u) {
    state.user = u;
    simpanSesi(u.id);
    I18N.set(AKUN.preferensi(u).bahasa);
    /* Tampilan miliknya menang atas setelan perangkat — dan disalin ke
       perangkat, supaya layar masuk berikutnya sudah gelap sebelum ada yang
       menekan apa pun. */
    if (window.TAMPILAN) TAMPILAN.pakaiUser(u);
    if (window.ViewBelajar) ViewBelajar.reset();   /* jangan bawa state kursus pengguna sebelumnya */
    /* Pengingat pembayaran menyusul di sini: basis data hidup di browser,
       jadi tidak ada penjadwal di luar yang bisa melihat invoice siapa pun. */
    if (window.PENGINGAT) PENGINGAT.saatBuka();
    /* Permintaan jasa keahlian gugur dalam hitungan detik. Pantauannya
       dinyalakan hanya untuk mitra lapangan — peran lain tidak pernah
       menerimanya, dan penghitung yang menyala sia-sia tetap membangunkan
       perangkat setiap beberapa detik. */
    if (window.NOTIF) {
      if (u.role === 'worker') NOTIF.pantau(u.id);
      else NOTIF.berhenti();
      /* Petugas kebersihan korporat: aduan penghuni di wilayah kerjanya.
         Dijalankan SESUDAH berhenti() supaya pemanggilan berturut-turut
         tidak meninggalkan dua penghitung yang berjalan bersamaan. */
      if (u.role === 'petugas' && NOTIF.pantauAduan) NOTIF.pantauAduan(u);
    }
    state.page = null;
    location.hash = '';
    render();
    UI.toast(I18N.get() === 'en' ? 'Welcome, ' + u.nama.split(' ')[0] + '!'
                                 : 'Selamat datang, ' + u.nama.split(' ')[0] + '!', 'ok');
  }

  /** Sesi menyimpan salinan objek user; dipanggil setelah profilnya diubah. */
  function perbaruiSesi(u) { if (u) state.user = u; }

  function logout() {
    UI.konfirm({ title: I18N.t('Keluar dari aplikasi?'), text: I18N.t('Data yang sudah tersimpan tidak akan hilang.'),
      okText: 'Ya, keluar' }).then(function (ya) {
      if (!ya) return;
      state.user = null; simpanSesi(null); location.hash = '';
      if (window.NOTIF) NOTIF.berhenti();
      render();
    });
  }

  /* ---------------------------------------------------------------- router */
  /**
   * Halaman yang boleh dibuka pengguna ini.
   * Penyaringan dikerjakan di satu tempat supaya menu, router hash, dan
   * halaman bawaan selalu sepakat — tidak ada menu tersembunyi yang masih
   * bisa dibuka lewat alamat #.
   */
  function pagesFor(u) {
    var semua = MODULES[u.role] ? MODULES[u.role].pages : {};
    if (!window.AKSES) return semua;
    var boleh = {};
    Object.keys(semua).forEach(function (k) {
      if (AKSES.bolehHalaman(k, u)) boleh[k] = semua[k];
    });
    return boleh;
  }

  /* Ditandai saat kita sendiri yang mengubah hash, supaya listener hashchange
     tidak menggambar ulang halaman yang barusan dirender. */
  var hashDariKita = false;

  function go(page, params) {
    state.page = page; state.params = params || {};
    hashDariKita = true;
    location.hash = '#' + page;
    setTimeout(function () { hashDariKita = false; }, 0);
    render();
    var pg = document.querySelector('.page, .wbody');
    if (pg) pg.scrollIntoView({ block: 'start' });
    window.scrollTo(0, 0);
  }

  /** Render ulang halaman aktif (dipakai setelah data berubah). */
  function refresh() { render(); }

  window.addEventListener('hashchange', function () {
    if (!state.user || hashDariKita) return;
    var h = location.hash.replace(/^#/, '');
    if (h && h !== state.page && pagesFor(state.user)[h]) { state.page = h; state.params = {}; render(); }
  });

  /* ---------------------------------------------------------------- render */
  function render() {
    var root = document.getElementById('app');

    /* Satu-satunya layar yang terbuka tanpa akun: formulir aduan yang
       dibuka penghuni gedung dengan memindai tag area. Diperiksa SEBELUM
       layar masuk — menuntut orang mendaftar hanya untuk melaporkan toilet
       kotor berarti tidak akan pernah ada laporan yang masuk.

       Berlaku juga ketika ADA yang sedang masuk: staf korporat yang memindai
       tag dengan kamera ponsel biasa sampai ke alamat yang sama, dan ia pun
       berhak melaporkan masalah yang dilihatnya. */
    if (window.ViewMCS && ViewMCS.layarPublik) {
      var pub = ViewMCS.layarPublik();
      if (pub) { root.innerHTML = pub.render(); pub.mount(root); return; }
    }
    if (!state.user) { root.innerHTML = ViewAuth.render(); ViewAuth.mount(root); return; }

    /* Sandi awal akun korporat dibuat dan diserahkan admin EXOCLEAN. Sandi
       yang diketahui orang lain bukan sandi, jadi aplikasinya ditahan di sini
       sampai penggunanya menggantinya sendiri — bukan sekadar diingatkan lewat
       pemberitahuan yang bisa ditutup dan dilupakan. */
    if (state.user.wajibGantiSandi) {
      root.innerHTML = layarGantiSandi();
      pasangGantiSandi(root);
      return;
    }

    /* URUTAN GERBANG INI DISENGAJA, dan tidak boleh ditukar.

       ganti sandi → setujui syarat → buat PIN → aplikasi

       Sandi lebih dulu karena selama masih sandi buatan orang lain, yang
       menyetujui syarat belum tentu pemilik akunnya. Syarat mendahului PIN
       karena salah satu pasalnya menerangkan untuk apa PIN itu — meminta
       orang membuat PIN sebelum ia tahu gunanya menghasilkan enam angka
       yang diketik asal dan dilupakan. */
    if (['korporat', 'penghuni'].indexOf(state.user.role) >= 0 && window.SYARAT &&
        !SYARAT.sudahSetuju(state.user)) {
      root.innerHTML = layarSyarat();
      pasangSyarat(root);
      return;
    }

    if (state.user.role === 'korporat' && window.KEAMANAN &&
        !KEAMANAN.punyaPin(state.user)) {
      root.innerHTML = layarBuatPin();
      pasangBuatPin(root);
      return;
    }

    /* Peran yang layarnya tidak ikut dibawa build ini — misalnya klien yang
       masuk lewat aplikasi mitra. Tanpa penjaga ini ia terdampar di layar
       kosong tanpa satu pun petunjuk kenapa, dan akun serta datanya baik-baik
       saja: yang salah hanya pintunya. */
    if (!MODULES[state.user.role]) { root.innerHTML = layarSalahPintu(); pasangSalahPintu(root); return; }

    var pages = pagesFor(state.user);
    var keys = Object.keys(pages);
    /* Halaman awal tidak boleh jatuh ke halaman tersembunyi: layar itu selalu
       butuh parameter (mis. id produk) dan akan kosong bila dibuka langsung. */
    if (!state.page || !pages[state.page]) {
      /* Halaman pertama diambil dari susunan yang BERLAKU, bukan dari urutan
         pendaftaran: kalau Super Admin menaruh menu lain di paling atas,
         itulah yang seharusnya terbuka saat masuk. Menu yang disembunyikan
         ikut dilewati — membuka halaman yang tidak ada di menu membuat
         pengguna terdampar tanpa penanda posisi. */
      /* MENU.kunci(), bukan .role: susunan menu korporat disimpan per
         korporat, karena satu pemasangan melayani banyak korporat. */
      var kel = window.MENU ? MENU.susun(MENU.kunci(state.user), pages) : [];
      var pertama = null;
      kel.forEach(function (g) {
        g.keys.forEach(function (k) {
          /* Wadah buatan admin ikut di susunan tetapi TIDAK punya halaman.
             Menjadikannya halaman awal berarti layar kosong sejak masuk —
             dan sebabnya tidak terlihat di mana pun. */
          if (pertama || !pages[k]) return;
          pertama = k;
        });
      });
      state.page = pertama ||
        keys.filter(function (k) { return !pages[k].tersembunyi; })[0] || keys[0];
    }
    var page = pages[state.page];

    if (state.user.role === 'worker') renderWorkerShell(root, pages, page);
    else renderDeskShell(root, pages, page);
  }

  /**
   * Layar wajib ganti kata sandi.
   *
   * Ditempatkan SEBELUM pemeriksaan peran: apa pun perannya, akun yang masih
   * memakai sandi buatan orang lain tidak boleh membuka apa pun. Akun korporat
   * dibuat admin EXOCLEAN beserta sandi sementaranya — dan sandi yang diketahui
   * dua orang tidak melindungi siapa-siapa.
   */
  function layarGantiSandi() {
    var u = state.user;
    return '<div class="pintu">' +
      '<div class="pintu__k">🔐</div>' +
      '<h2>' + U.esc(I18N.t('Ganti kata sandi Anda dulu')) + '</h2>' +
      /* Siapa yang membuat akunnya berbeda menurut perannya, dan menyebut
         pihak yang salah membuat orang mencari bantuan ke tempat yang salah:
         petugas kebersihan yang disuruh menghubungi 'admin EXOCLEAN' tidak
         akan pernah menemukan siapa yang dimaksud. */
      '<p>' + U.esc(u.nama) + ' — ' +
        U.esc(I18N.t(u.role === 'petugas'
          ? I18N.t('akun ini dibuat oleh staf gedung Anda dengan kata sandi sementara.') + ' ' +
            I18N.t('Ganti sekarang supaya hanya Anda yang bisa membukanya.')
          : I18N.t('akun ini dibuat oleh admin EXOCLEAN dengan kata sandi sementara.') + ' ' +
            I18N.t('Ganti sekarang supaya hanya Anda yang bisa membukanya.'))) + '</p>' +
      '<form data-submit="gs-simpan" class="pintu__f">' +
        '<label class="kh-f"><span>' + I18N.t('Kata sandi sementara') + '</span>' +
          '<input class="input" type="password" name="lama" autocomplete="current-password"></label>' +
        '<label class="kh-f"><span>' + I18N.t('Kata sandi baru') + '</span>' +
          '<input class="input" type="password" name="baru" autocomplete="new-password"></label>' +
        '<label class="kh-f"><span>' + I18N.t('Ulangi kata sandi baru') + '</span>' +
          '<input class="input" type="password" name="ulang" autocomplete="new-password"></label>' +
        '<div class="hint">' + I18N.t('Minimal 6 karakter, dan harus berbeda dari yang sementara.') + '</div>' +
        '<button class="btn btn--primary btn--lg" type="submit" style="width:100%;margin-top:14px">' +
          I18N.t('Simpan dan lanjutkan') + '</button>' +
      '</form>' +
      '<button class="btn btn--ghost btn--sm" data-act="gs-keluar" style="margin-top:12px">' +
        I18N.t('Keluar') + '</button>' +
    '</div>';
  }

  function pasangGantiSandi(root) {
    U.delegate(root, {
      'gs-simpan': function (el) {
        var f = U.readForm(el);
        var err = AKUN.gantiSandi(state.user.id, f.lama, f.baru, f.ulang);
        if (err) { UI.toast(I18N.t(err), 'err'); return; }
        /* Penandanya dilepas hanya SETELAH sandinya benar-benar berganti. */
        DB.update('users', state.user.id, { wajibGantiSandi: false });
        state.user = DB.find('users', state.user.id);
        UI.toast(I18N.t('Kata sandi diganti'), 'ok');
        render();
      },
      'gs-keluar': function () {
        state.user = null; simpanSesi(null); location.hash = '';
        if (window.NOTIF) NOTIF.berhenti();
        render();
      }
    });
  }

  /* ================================================ SYARAT & KETENTUAN */

  /* Tantangan yang sedang tampil. Disimpan di sini, bukan dibaca ulang dari
     layar: soal yang dibangkitkan ulang tiap kali tombolnya ditekan tidak
     akan pernah cocok dengan jawaban yang sudah diketik orang. */
  var syaratTantangan = null;
  /* Centang persetujuan BERTAHAN saat soalnya diganti. Menggambar ulang
     layar mengosongkan formulirnya, dan mengosongkan centang setelah orang
     membaca delapan pasal hanya karena ia salah berhitung adalah hukuman
     untuk kesalahan yang bukan itu — yang batal jawabannya, bukan bacaannya. */
  var syaratDicentang = false;

  function layarSyarat() {
    if (!syaratTantangan) syaratTantangan = SYARAT.tantangan();
    return '<div class="pintu pintu--lebar">' +
      '<div class="pintu__k">📜</div>' +
      '<h2>' + U.esc(I18N.t('Syarat & ketentuan pemakaian')) + '</h2>' +
      '<p>' + U.esc(state.user.nama) + ' — ' +
        U.esc(I18N.t('bacalah sekali sebelum mulai. Persetujuan Anda dicatat ' +
          'beserta versi naskah dan waktunya.')) + '</p>' +

      '<div class="skt">' +
        SYARAT.pasal(state.user.role).map(function (p, i) {
          return '<section class="skt__p">' +
            '<h3>' + (i + 1) + '. ' + U.esc(I18N.t(p.judul)) + '</h3>' +
            p.isi.map(function (t) {
              return '<p>' + U.esc(I18N.t(t)) + '</p>';
            }).join('') +
          '</section>';
        }).join('') +
      '</div>' +

      '<div class="skt__v">' + U.esc(I18N.t('Versi naskah')) + ': ' +
        U.esc(SYARAT.VERSI) + '</div>' +

      '<form data-submit="skt-simpan" class="pintu__f">' +
        '<label class="skt__c">' +
          '<input type="checkbox" name="setuju"' +
            (syaratDicentang ? ' checked' : '') + '> ' +
          '<span>' + U.esc(I18N.t('Saya sudah membaca dan menyetujui seluruh ' +
            'syarat & ketentuan di atas.')) + '</span>' +
        '</label>' +

        '<label class="kh-f"><span>' +
          I18N.t('Berapa hasil') + ' <b>' + U.esc(SYARAT.soalTeks(syaratTantangan)) + '</b>?' +
          '</span>' +
          '<input class="input" name="capcha" autocomplete="off" ' +
            'inputmode="text" placeholder="' +
            I18N.t('jawab dengan angka atau huruf') + '"></label>' +
        '<div class="hint">' +
          I18N.t('Pertanyaan ini menandai bahwa yang menyetujui adalah orang, ' +
            'bukan program. Ia bukan pengaman — halaman ini sudah berada di ' +
            'balik kata sandi Anda.') +
          ' <a href="#" data-act="skt-ulang">' + I18N.t('Ganti pertanyaan') + '</a></div>' +

        '<button class="btn btn--primary btn--lg" type="submit" ' +
          'style="width:100%;margin-top:14px">' +
          I18N.t('Setuju dan lanjutkan') + '</button>' +
      '</form>' +
      '<button class="btn btn--ghost btn--sm" data-act="skt-keluar" ' +
        'style="margin-top:12px">' + I18N.t('Tidak setuju, keluar') + '</button>' +
    '</div>';
  }

  function pasangSyarat(root) {
    U.delegate(root, {
      'skt-simpan': function (el) {
        var f = U.readForm(el);
        syaratDicentang = !!f.setuju;
        /* Dua penolakan DIPISAH. "Ada yang belum benar" membuat orang
           menebak yang mana, dan yang menebak akan mencentang lalu
           mengetik ulang berkali-kali tanpa tahu sebabnya. */
        if (!f.setuju) {
          UI.toast(I18N.t('Centang persetujuannya dulu.'), 'err'); return;
        }
        if (!SYARAT.cocok(syaratTantangan, f.capcha)) {
          UI.toast(I18N.t('Jawaban pertanyaannya belum tepat.'), 'err');
          syaratTantangan = SYARAT.tantangan();
          render();
          return;
        }
        var r = SYARAT.setuju(state.user.id,
          'centang + pertanyaan "' + SYARAT.soalTeks(syaratTantangan) + '"');
        if (r.error) { UI.toast(r.error, 'err'); return; }
        state.user = DB.find('users', state.user.id);
        /* Dilepas supaya orang berikutnya di perangkat yang sama tidak
           mendapati centang dan soal milik orang sebelumnya. */
        syaratDicentang = false; syaratTantangan = null;
        UI.toast(I18N.t('Persetujuan dicatat'), 'ok');
        render();
      },
      'skt-ulang': function (el) {
        var kotak = el.closest('.pintu').querySelector('[name="setuju"]');
        if (kotak) syaratDicentang = kotak.checked;
        syaratTantangan = SYARAT.tantangan();
        render();
      },
      'skt-keluar': function () {
        syaratDicentang = false; syaratTantangan = null;
        state.user = null; simpanSesi(null); location.hash = '';
        if (window.NOTIF) NOTIF.berhenti();
        render();
      }
    });
  }

  /* ====================================================== BUAT PIN */

  /**
   * Layar membuat PIN transaksi.
   *
   * Dipasang sebagai gerbang, bukan sebagai ajakan di halaman profil, karena
   * ajakan yang bisa dilewati akan dilewati — dan PIN yang tidak pernah
   * dibuat membuat seluruh penjagaan impor dan unduhan menjadi hiasan.
   *
   * Yang DISEBUT di sini adalah untuk apa PIN-nya, bukan sekadar bahwa ia
   * wajib. Enam angka yang diminta tanpa alasan akan menjadi 123456.
   */
  function layarBuatPin() {
    return '<div class="pintu">' +
      '<div class="pintu__k">🔢</div>' +
      '<h2>' + U.esc(I18N.t('Buat PIN transaksi Anda')) + '</h2>' +
      '<p>' + U.esc(I18N.t('Enam angka, dipakai menyetujui impor berkas dan ' +
        'penyesuaian stok hasil opname. Berbeda dari kata sandi, dan tidak ' +
        'pernah ditanyakan siapa pun lewat telepon atau WhatsApp.')) + '</p>' +
      '<form data-submit="bp-simpan" class="pintu__f">' +
        '<label class="kh-f"><span>' + I18N.t('PIN baru') + '</span>' +
          '<input class="input" type="password" name="pin" inputmode="numeric" ' +
            'maxlength="6" autocomplete="new-password"></label>' +
        '<label class="kh-f"><span>' + I18N.t('Ulangi PIN') + '</span>' +
          '<input class="input" type="password" name="ulang" inputmode="numeric" ' +
            'maxlength="6" autocomplete="new-password"></label>' +
        '<div class="hint">' + I18N.t('Enam angka. Hindari tanggal lahir, ' +
          'angka berurutan, dan angka yang sama semua.') + '</div>' +
        '<button class="btn btn--primary btn--lg" type="submit" ' +
          'style="width:100%;margin-top:14px">' +
          I18N.t('Simpan PIN dan mulai') + '</button>' +
      '</form>' +
      '<button class="btn btn--ghost btn--sm" data-act="bp-keluar" ' +
        'style="margin-top:12px">' + I18N.t('Keluar') + '</button>' +
    '</div>';
  }

  function pasangBuatPin(root) {
    U.delegate(root, {
      'bp-simpan': function (el) {
        var f = U.readForm(el);
        var pin = String(f.pin == null ? '' : f.pin);
        if (pin !== String(f.ulang == null ? '' : f.ulang)) {
          UI.toast(I18N.t('Dua PIN yang Anda ketik berbeda.'), 'err'); return;
        }
        /* Penilaian kekuatan PIN dipegang KEAMANAN.validPin — satu tempat,
           supaya layar ini dan halaman Profil tidak pernah berbeda pendapat
           tentang PIN mana yang boleh. Ia memulangkan PESAN atau null,
           bukan objek berisi error. */
        var salah = KEAMANAN.validPin(pin);
        if (salah) { UI.toast(I18N.t(salah), 'err'); return; }
        var r = KEAMANAN.pasangPin(state.user.id, pin);
        if (r && r.error) { UI.toast(r.error, 'err'); return; }
        state.user = DB.find('users', state.user.id);
        UI.toast(I18N.t('PIN transaksi dibuat'), 'ok');
        render();
      },
      'bp-keluar': function () {
        state.user = null; simpanSesi(null); location.hash = '';
        if (window.NOTIF) NOTIF.berhenti();
        render();
      }
    });
  }

  /**
   * TIGA APLIKASI, SATU BASIS KODE
   *
   *   EXOCLEAN        index.html   klien dan mitra toko
   *   EXOCLEAN Mitra  mitra.html   mitra lapangan
   *   MCS EXOCLEAN    mcs.html     staf korporat
   *
   * Daftar ini satu-satunya tempat pembagian itu ditulis. Ia menentukan dua
   * hal sekaligus: peran mana yang boleh bekerja di pintu ini, dan ke mana
   * seseorang diarahkan ketika ia membuka pintu yang keliru. Kalau keduanya
   * ditulis terpisah, yang satu akan luput diperbarui saat aplikasi keempat
   * muncul — dan orang akan terkunci di luar tanpa petunjuk.
   */
  /* CATATAN i18n untuk `tagline` dan `lead` di bawah:

     Keduanya DIGAMBAR di halaman masuk lewat views/auth.js — fungsi
     merek(), yang membaca APP.aplikasi(). Dicari dengan grep atas nama
     `a.tagline` ia tidak akan ketemu, dan sempat disimpulkan tidak pernah
     dipakai; yang membuktikan sebaliknya adalah membuka layarnya.

     JANGAN membungkusnya di sini: array ini dievaluasi sekali saat berkas
     dimuat, sehingga I18N.t() di tempat ini akan membekukan bahasanya pada
     bahasa saat boot — dan pergantian bahasa tidak memuat ulang halaman.
     Pembungkusnya ada di tempat menggambar, persis seperti
     views/moderasi.js melakukannya dengan T(K.k). */
  var APLIKASI = [
    { kode: 'mitra', berkas: 'mitra.html', nama: 'EXOCLEAN Mitra',
      sub: 'Mitra Lapangan', ikon: 'assets/icon-mitra-192.png',
      peran: ['worker'],
      tagline: 'Pekerjaan hari ini, di satu layar',
      lead: 'Terima permintaan, absen di lokasi, laporkan hasil dengan foto, dan ' +
            'pantau pendapatan Anda — tanpa berpindah aplikasi.' },
    { kode: 'mcs', berkas: 'mcs.html', nama: 'MCS EXOCLEAN',
      sub: 'Management Cleaning Service', ikon: 'assets/icon-mcs-192.png',
      /* Petugas kebersihan gedung masuk lewat pintu yang SAMA dengan staf
         korporatnya — mereka pegawai gedung itu, bukan mitra EXOCLEAN.
         Yang membedakan hanya halaman yang mereka lihat. */
      /* PEMILIK RUANGAN ikut pintu ini juga: ia pegawai gedung yang sama,
         dan ruangannya adalah ruangan yang dibersihkan MCS. */
      /* Peran admin ikut dilayani HANYA bila modul pasar tidak ikut dimuat.

         Syaratnya bukan "datanya disimpan terpisah", melainkan "tidak ada
         aplikasi EXOCLEAN di sebelahnya". Sebuah pemasangan MCS tersendiri
         menanam satu akun admin lewat js/semai-mcs.js; kalau perannya tidak
         dilayani, pemasangan yang baru selesai akan menolak satu-satunya
         akun yang dimilikinya, dan mengarahkannya ke aplikasi yang tidak ada.

         Dibaca saat aplikasi dirakit, bukan saat berkas ini dimuat — biz.js
         boleh dimuat sesudahnya. */
      get peran() {
        return window.BIZ ? ['korporat', 'petugas', 'penghuni']
                          : ['admin', 'korporat', 'petugas', 'penghuni'];
      },
      tagline: 'Kebersihan gedung Anda, terpantau jam per jam',
      lead: 'Daftarkan area, susun jadwal berulang, ingatkan petugas otomatis, ' +
            'dan terima bukti foto sebelum–sesudah untuk setiap langkah.' },
    { kode: 'klien', berkas: 'index.html', nama: 'EXOCLEAN', sub: '',
      ikon: 'assets/icon-192.png',
      peran: ['client', 'seller', 'admin', 'supervisor'] }
  ];

  /**
   * Aplikasi yang SEDANG dibuka.
   *
   * Dibaca dari <body data-app>, bukan dari nama berkas: nama berkas hilang
   * begitu halamannya dilayani sebagai '/' atau lewat alamat yang dirapikan,
   * dan pemakai akan mendapati dirinya di pintu yang salah tanpa sebab.
   * Bawaannya aplikasi klien.
   */
  function aplikasiIni() {
    var kode = '';
    try { kode = document.body.getAttribute('data-app') || ''; } catch (e) {}
    var r = null;
    APLIKASI.forEach(function (a) { if (a.kode === kode) r = a; });
    return r || APLIKASI[APLIKASI.length - 1];
  }

  /** Aplikasi tempat sebuah peran seharusnya bekerja. */
  function aplikasiPeran(role) {
    var r = null;
    APLIKASI.forEach(function (a) { if (!r && a.peran.indexOf(role) >= 0) r = a; });
    return r || APLIKASI[APLIKASI.length - 1];
  }

  function sebutanPeran(role) {
    if (role === 'worker') return I18N.t('akun mitra lapangan');
    if (role === 'korporat') return 'akun korporat MCS';
    if (role === 'petugas') return I18N.t('akun petugas kebersihan');
    if (role === 'seller') return I18N.t('akun mitra toko');
    if (role === 'client') return I18N.t('akun klien');
    return 'akun staf EXOCLEAN';
  }

  /**
   * Layar 'salah pintu'.
   *
   * Setiap aplikasi hanya melayani peran yang menjadi urusannya. Yang membuka
   * pintu keliru diberi tahu ke mana harus pergi — bukan disuruh menebak, dan
   * bukan pula dipaksa keluar dari akunnya. Datanya baik-baik saja; yang
   * salah hanya pintunya.
   */
  function layarSalahPintu() {
    var u = state.user;
    var tujuan = aplikasiPeran(u.role);
    return '<div class="pintu">' +
      '<img class="pintu__i" src="' + U.esc(tujuan.ikon) + '" alt="">' +
      '<h2>' + U.esc(I18N.t('Akun Anda dibuka di aplikasi yang lain')) + '</h2>' +
      '<p>' + U.esc(u.nama) + ' — ' + U.esc(I18N.t(sebutanPeran(u.role))) + '. ' +
        U.esc(I18N.t('Buka')) + ' <b>' + U.esc(tujuan.nama) + '</b> ' +
        U.esc(I18N.t('untuk melanjutkan. Data dan akun Anda tidak berubah.')) + '</p>' +
      '<div class="row" style="justify-content:center;gap:10px">' +
        '<button class="btn btn--primary" data-act="pintu-pergi" data-ke="' +
          U.esc(tujuan.berkas) + '">' +
          U.esc(I18N.t('Buka')) + ' ' + U.esc(tujuan.nama) + '</button>' +
        '<button class="btn btn--ghost" data-act="pintu-keluar">' +
          U.esc(I18N.t('Keluar')) + '</button>' +
      '</div></div>';
  }

  function pasangSalahPintu(root) {
    U.delegate(root, {
      'pintu-pergi': function (el) { location.href = el.getAttribute('data-ke'); },
      'pintu-keluar': function () {
        state.user = null; simpanSesi(null); location.hash = '';
        if (window.NOTIF) NOTIF.berhenti();
        render();
      }
    });
  }

  /* ---- shell desktop (admin, supervisor, client) ---- */
  function renderDeskShell(root, pages, page) {
    var u = state.user;

    /* Susunannya ditentukan MENU, bukan urutan pendaftaran halaman: Super
       Admin boleh mengurutkan ulang, memindah kelompok, dan menyembunyikan
       menu. Bila belum pernah diatur, MENU mengembalikan urutan bawaan yang
       sama persis seperti sebelumnya. */
    var kelompok = window.MENU
      ? MENU.susun(MENU.kunci(u), pages)
      : (function () {
          var grup = {}, urutanGrup = [];
          Object.keys(pages).forEach(function (k) {
            if (pages[k].tersembunyi) return;
            var g = pages[k].grup || 'Menu';
            if (!grup[g]) { grup[g] = []; urutanGrup.push(g); }
            grup[g].push(k);
          });
          return urutanGrup.map(function (g) { return { grup: g, keys: grup[g] }; });
        })();

    /* Menu utama buatan admin tidak ada di daftar halaman — ia wadah, bukan
       halaman. Disatukan sekali di sini supaya penggambar di bawah tidak
       perlu bertanya mana yang mana. */
    var pgMenu = window.MENU ? MENU.gabung(MENU.kunci(u), pages) : pages;

    /* Nama dan ikon dibaca lewat MENU: keduanya boleh diganti Super Admin,
       dan yang tersimpan pada halaman hanyalah bawaannya. */
    function namaMenu(k) { return window.MENU ? MENU.label(MENU.kunci(u), k, pgMenu) : I18N.t(pgMenu[k].label); }
    function ikonMenu(k) { return window.MENU ? MENU.ikon(MENU.kunci(u), k, pgMenu) : pgMenu[k].icon; }

    function tombolMenu(k, anak) {
      var p = pgMenu[k];
      if (!p) return '';
      var n = p.badge ? p.badge() : 0;
      /* Lencana induk menjumlahkan lencana anaknya. Induk yang tidak
         menjumlahkan membuat angka yang menunggu tersembunyi di balik menu
         yang terlihat kosong — dan tidak ada yang membukanya. */
      (anak || []).forEach(function (a) {
        var pa = pgMenu[a];
        if (pa && pa.badge) n += pa.badge() || 0;
      });
      return '<button class="nav-item' + (k === state.page ? ' active' : '') +
          (anak && anak.length ? ' nav-item--induk' : '') + '" data-nav="' + k + '">' +
        '<span class="ic">' + U.esc(ikonMenu(k)) + '</span><span>' + U.esc(namaMenu(k)) + '</span>' +
        (n ? '<span class="badge-n">' + n + '</span>' : '') +
        (anak && anak.length ? '<span class="nav-chev">›</span>' : '') + '</button>';
    }

    var nav = kelompok.map(function (kel) {
      var isi =
        (kel.item || kel.keys.map(function (k) { return { key: k, anak: [] }; })).map(function (it) {
          var adaAnak = it.anak && it.anak.length;
          /* Wadah yang belum diisi tidak digambar sama sekali. Menekannya
             tidak membuka apa pun — dan menu yang tidak melakukan apa-apa
             dibaca sebagai kerusakan, bukan sebagai wadah yang masih kosong.
             Di layar pengaturan ia tetap tampil supaya bisa diisi. */
          if (it.maya && !adaAnak) return '';
          /* Induk terbuka bila memang dibuka, ATAU bila halaman yang sedang
             dibuka salah satu anaknya — kalau tidak, pengguna berada di
             halaman yang menunya tidak terlihat di mana pun. */
          var buka = adaAnak && (navBuka[it.key] || it.anak.indexOf(state.page) >= 0);
          return '<div class="nav-sarang' + (buka ? ' buka' : '') + '">' +
            tombolMenu(it.key, it.anak) +
            (adaAnak
              ? '<div class="nav-anak">' + it.anak.map(function (a) {
                  return tombolMenu(a, null); }).join('') + '</div>'
              : '') +
          '</div>';
        }).join('');
      if (!isi) return '';
      return '<div class="nav-group">' + U.esc(I18N.t(kel.grup)) + '</div>' + isi;
    }).join('');

    /* Pegawai internal ditampilkan dengan nama peran aksesnya, bukan personanya,
       supaya jelas kapasitas apa yang sedang dipakai. */
    var peranLabel = I18N.t({ admin: 'Admin EXOCLEAN', supervisor: 'Supervisor', client: 'Klien',
      seller: I18N.t('Mitra Toko'), worker: I18N.t('Mitra Lapangan'), korporat: 'Staf Korporat',
      petugas: I18N.t('Petugas Gedung') }[u.role]
      || '');
    if (window.AKSES && ['admin', 'supervisor'].indexOf(u.role) >= 0) {
      var pr = AKSES.peranUser(u);
      if (pr) peranLabel = I18N.t(pr.nama);
    }
    var foto = u.foto ? DB.getPhoto(u.foto) : null;

    root.innerHTML =
      '<div class="shell">' +
        '<aside class="sidebar" id="sidebar">' +
          '<div class="sidebar__top">' +
            '<img src="assets/logo-full.png" alt="EXOCLEAN">' +
            (aplikasiIni().sub
              ? '<div class="sidebar__app">' + U.esc(I18N.t(aplikasiIni().sub)) + '</div>' : '') +
            '<div class="sidebar__role">' + U.esc(peranLabel) + '</div>' +
          '</div>' +
          '<nav class="sidebar__nav">' + nav + '</nav>' +
          '<div class="sidebar__foot">' +
            '<button class="sidebar__user" data-nav="profil" title="' + U.esc(I18N.t('Profil Saya')) + '">' +
              (foto ? '<img class="ava-img" src="' + foto + '" alt="">' : UI.avatar(u.nama)) +
              '<div style="min-width:0;text-align:left"><b>' + U.esc(u.nama) + '</b>' +
              '<small>' + U.esc(u.perusahaan || u.jabatan || u.email) + '</small></div>' +
              '<span class="sidebar__user-go">›</span>' +
            '</button>' +
            '<button class="btn-logout" data-logout>🚪 ' + U.esc(I18N.t('Keluar')) + '</button>' +
          '</div>' +
        '</aside>' +
        '<div class="main">' +
          '<header class="topbar">' +
            '<button class="burger" data-burger aria-label="Menu">☰</button>' +
            '<div><h1>' + U.esc(I18N.t(page.label)) + '</h1>' +
              (page.sub ? '<div class="crumb">' + U.esc(I18N.t(page.sub)) + '</div>' : '') + '</div>' +
            '<div class="topbar__spacer"></div>' +
            '<div class="topbar__tools">' + topbarTools(u) + '</div>' +
          '</header>' +
          '<div class="page" id="page"></div>' +
        '</div>' +
      '</div>';

    var pageEl = document.getElementById('page');
    pageEl.innerHTML = page.render(state.params);
    if (page.mount) page.mount(pageEl, state.params);
    /* SESUDAH mount: sebagian halaman menggambar ulang isinya sendiri di
       dalam mount, dan tabel yang ditandai sebelum itu ikut terhapus. */
    UI.pasangTabel(pageEl);
    bindShell(root);
  }

  /**
   * Tombol ikon di bilah atas, lengkap dengan angka pemberitahuan.
   * Angkanya dibaca ulang tiap render — sama seperti lencana di menu samping —
   * sehingga tidak pernah tertinggal dari keadaan sebenarnya.
   */
  function tombolTopbar(nav, ic, judul, n) {
    return '<button class="btn btn--ghost btn--sm btn--icon topbar__ic" data-nav="' + nav + '" ' +
      'title="' + U.esc(judul) + '" aria-label="' + U.esc(judul) +
      (n ? ', ' + n + ' ' + U.esc(I18N.t('baru')) : '') + '">' + ic +
      (n ? '<span class="n">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</button>';
  }

  /**
   * Gambar ulang HANYA tombol di bilah atas.
   *
   * Dipakai ketika angka pemberitahuan berubah akibat aksi di dalam halaman —
   * misalnya membuka percakapan, yang menandai pesannya terbaca. Bilah atas
   * sudah tergambar sebelum halaman dirender, jadi tanpa ini angkanya baru
   * turun pada render berikutnya dan pengguna melihat lencana yang keliru.
   * Menggambar ulang seluruh halaman untuk itu terlalu mahal: fokus, posisi
   * gulir, dan isian yang sedang diketik akan ikut hilang.
   */
  function segarkanTopbar() {
    if (!state.user) return;
    var box = document.querySelector('.topbar__tools');
    if (box) box.innerHTML = topbarTools(state.user);
  }

  /**
   * Penunjuk pekerjaan yang belum sampai server.
   *
   * MUNCUL HANYA KETIKA ADA YANG PERLU DIKATAKAN. Lencana yang selalu
   * terpasang berhenti dibaca dalam dua hari, dan pada hari ketiga ia sama
   * tidak bergunanya dengan tidak ada lencana sama sekali.
   *
   * Ini penting justru bagi petugas lapangan: ia memindai di basement, dan
   * satu-satunya cara ia tahu pekerjaannya belum naik adalah kalau ada yang
   * memberitahunya. Sebelum ada antrean tersimpan, memberitahunya pun tidak
   * ada gunanya — pekerjaannya memang akan hilang. Sekarang ia tidak hilang,
   * jadi angkanya bermakna: ia akan turun sendiri begitu sinyal kembali.
   */
  function penunjukSync() {
    if (!window.SYNC || !SYNC.aktif()) return '';
    var k = SYNC.keadaan();
    if (!k.antre && k.fase !== 'ditolak' && k.fase !== 'terbatas') return '';

    var buruk = k.fase === 'ditolak' || k.fase === 'terbatas';
    var judul = buruk
      ? I18N.t('Perangkat ini tidak bisa mengirim ke server. Buka Data & Pengaturan.')
      : k.fase === 'luring'
        ? I18N.t('Tersimpan di perangkat ini, menunggu sinyal untuk dikirim.')
        : I18N.t('Sedang dikirim ke server.');

    return '<button class="btn btn--ghost btn--sm sy-tanda' + (buruk ? ' sy-tanda--buruk' : '') +
      '" data-act-tools="pengaturan" title="' + U.esc(judul) + '">' +
      (buruk ? '⛔' : k.fase === 'luring' ? '📴' : '↑') +
      (k.antre ? ' <span class="chip chip--' + (buruk ? 'danger' : 'warn') +
        '" style="padding:1px 7px">' + k.antre + '</span>' : '') +
      '</button>';
  }

  function topbarTools(u) {
    var out = penunjukSync();
    if (u.role === 'admin' || u.role === 'supervisor') {
      var n = DB.where('waOutbox', { status: 'antre' }).length;
      out += '<button class="btn btn--ghost btn--sm" data-nav="wa" title="Antrean pesan WhatsApp">💬 Outbox' +
        (n ? ' <span class="chip chip--warn" style="padding:1px 7px">' + n + '</span>' : '') + '</button>';
    }
    if (u.role === 'client') {
      /* Obrolan dan keranjang dipasang di bilah atas supaya terjangkau dari
         halaman mana pun — keduanya sering dibuka di tengah mengerjakan hal
         lain, dan menyuruh klien kembali ke menu samping dulu memutus alurnya. */
      /* Aplikasi MCS tidak membawa obrolan — staf korporat berhubungan dengan
         petugasnya sendiri, bukan dengan mitra EXOCLEAN. */
      if (window.CHAT) {
        out += tombolTopbar('obrolan', '💬', I18N.t('Obrolan'), CHAT.belumDibaca(u));
      }
      if (window.Toko) {
        out += tombolTopbar('keranjang', '🛒', I18N.t('Keranjang belanja'),
          Toko.pagesClient.keranjang.badge());
      }
      out += '<button class="btn btn--sm topbar__cta" data-nav="transaksi">＋ ' +
        U.esc(I18N.t('Pesan Layanan')) + '</button>';
    }
    out += '<button class="btn btn--ghost btn--sm btn--icon" data-act-tools="pengaturan" title="Data & pengaturan">⚙️</button>';
    return out;
  }

  /* ================================================== BILAH NAVIGASI BAWAH
     Maksimal LIMA slot: empat halaman utama + satu "Lainnya".

     Sebelumnya seluruh halaman — sampai sebelas — dijejalkan ke bilah selebar
     layar ponsel, dan labelnya terpotong menjadi "Task…", "Inco…", "Atte…".
     Menu yang tidak terbaca sama saja dengan menu yang tidak ada: petugas
     menghafal posisi ikon, lalu tersesat begitu daftarnya berubah.

     Empat slot pertama diisi menurut URUTAN KEBUTUHAN HARIAN, bukan urutan
     kode: yang dibuka berkali-kali sehari (tugas, dompet, obrolan) di bilah,
     yang dibuka sesekali (riwayat, absensi, poin) masuk ke Lainnya. */

  /* EMPAT ikon saja di bilah bawah: tiga halaman harian + Akun.

     Tidak ada tombol "Lainnya" terpisah. Menu yang jarang dibuka berkumpul
     di dalam halaman Akun — satu tempat yang sudah dicari orang ketika
     mencari sesuatu yang bukan pekerjaan harian, jadi tidak perlu ikon
     kedua yang bersaing dengannya di bilah yang sama.

     Akun DIPATOK di ujung kanan, posisi yang sudah jadi kebiasaan di hampir
     semua aplikasi; memindahkannya ke tengah membuat orang menekan yang
     salah berkali-kali sebelum terbiasa. */
  /* `permintaan` paling depan: ia satu-satunya halaman yang isinya kedaluwarsa
     sendiri dalam hitungan detik. Yang berbatas waktu harus terjangkau satu
     ketukan, bukan tersembunyi di dalam lembar Akun. */
  var NAV_UTAMA = ['permintaan', 'tugas', 'gabung', 'dompet', 'obrolan', 'fungsi'];
  var NAV_SLOT = 3;
  var NAV_AKUN = 'profil';

  /** Pembagian slot bilah bawah — dipakai bilahnya maupun lembar Lainnya. */
  function bagiNav(pages, keys) {
    var utama = [];
    NAV_UTAMA.forEach(function (k) {
      if (utama.length < NAV_SLOT && keys.indexOf(k) >= 0 && k !== NAV_AKUN) utama.push(k);
    });
    /* Slot yang belum penuh diisi halaman lain sesuai urutan aslinya, supaya
       peran yang menunya sedikit tidak menyisakan slot kosong. Akun tidak
       ikut karena sudah punya slotnya sendiri. */
    keys.forEach(function (k) {
      if (utama.length < NAV_SLOT && utama.indexOf(k) < 0 && k !== NAV_AKUN) utama.push(k);
    });
    var akun = keys.indexOf(NAV_AKUN) >= 0 ? NAV_AKUN : null;
    var sisa = keys.filter(function (k) {
      return utama.indexOf(k) < 0 && k !== akun; });
    return { utama: utama, sisa: sisa, akun: akun };
  }

  function navBawah(pages, keys) {
    var bagi = bagiNav(pages, keys);
    var utama = bagi.utama, sisa = bagi.sisa, akun = bagi.akun;

    function tombol(k) {
      var p = pages[k], n = p.badge ? p.badge() : 0;
      var lbl = I18N.t(k === 'profil' ? 'Profil' : p.label);
      return '<button class="' + (k === state.page ? 'active' : '') + '" data-nav="' + k + '">' +
        '<span class="ic">' + p.icon + (n ? '<i class="wnav__n">' + (n > 9 ? '9+' : n) + '</i>' : '') +
        '</span><span>' + U.esc(lbl) + '</span></button>';
    }

    /* Lencana halaman yang berpindah ke dalam Akun DIJUMLAHKAN ke ikon Akun.
       Tanpa ini, pemberitahuan yang jatuh ke menu di dalam sana tidak pernah
       terlihat dari bilah — dan pemberitahuan yang tidak terlihat lebih buruk
       daripada tidak ada, karena orang mengira memang tidak ada yang perlu
       dikerjakan. */
    function tombolAkun(k) {
      var p = pages[k];
      var n = (p.badge ? p.badge() : 0) || 0;
      sisa.forEach(function (x) { n += (pages[x].badge ? pages[x].badge() : 0) || 0; });
      var aktif = state.page === k || sisa.indexOf(state.page) >= 0;
      return '<button class="' + (aktif ? 'active' : '') + '" data-nav="' + k + '">' +
        '<span class="ic">' + p.icon +
          (n ? '<i class="wnav__n">' + (n > 9 ? '9+' : n) + '</i>' : '') + '</span>' +
        '<span>' + U.esc(I18N.t('Akun')) + '</span></button>';
    }

    return '<nav class="wnav">' + utama.map(tombol).join('') +
      (akun ? tombolAkun(akun) : '') +
      '</nav>';
  }

  /**
   * Kisi menu yang disisipkan di ATAS halaman Akun.
   *
   * Dibangun di shell, bukan di views/profil.js, karena daftar isinya adalah
   * sisa pembagian slot bilah — pengetahuan milik shell. Menaruhnya di
   * profil.js berarti halaman profil harus tahu bagaimana bilah bawah
   * membagi slotnya, dan dua tempat itu akan berselisih begitu salah satu
   * diubah.
   */
  function menuAkunHTML(pages, sisa) {
    if (!sisa.length) return '';
    return '<div class="amenu">' +
      '<div class="amenu__j">' + U.esc(I18N.t('Menu Lainnya')) + '</div>' +
      '<div class="mgrid">' + sisa.map(function (k) {
        var p = pages[k], n = p.badge ? p.badge() : 0;
        return '<button class="mgrid__i" data-nav="' + U.esc(k) + '">' +
          '<span class="mgrid__ic">' + p.icon +
            (n ? '<i class="wnav__n">' + (n > 9 ? '9+' : n) + '</i>' : '') + '</span>' +
          '<span class="mgrid__l">' + U.esc(I18N.t(p.label)) + '</span></button>';
      }).join('') + '</div></div>';
  }

  /** Foto profil mitra; inisial bila belum ada foto. */
  function fotoMitra(u) {
    var src = u.foto ? DB.getPhoto(u.foto) : null;
    return '<button class="wava" data-nav="profil" title="' + U.esc(I18N.t('Profil')) + '">' +
      (src ? '<img src="' + U.esc(src) + '" alt="' + U.esc(u.nama) + '">'
           : '<span>' + U.esc(U.initials(u.nama)) + '</span>') +
      '</button>';
  }

  /**
   * Pusat bantuan mitra.
   *
   * Nomor admin diambil dari data, bukan ditulis tetap di kode: kalau admin
   * berganti nomor, satu-satunya tempat yang perlu diperbarui adalah
   * datanya sendiri — bukan berburu nomor lama yang tertanam di layar.
   */
  function bukaBantuan() {
    var u = state.user;
    var admin = (AKUN.usersByRole('admin') || [])[0];
    var spv = window.BIZ && BIZ.atasan ? BIZ.atasan(u) : null;

    UI.modal({
      title: I18N.t('Pusat Bantuan'), size: 'narrow',
      body:
        UI.alert('brand', I18N.t('Ada kendala di lapangan, pertanyaan soal pembayaran, ' +
          'atau butuh bantuan aplikasi? Hubungi kami lewat salah satu jalur di bawah.'), '🎧') +
        '<div class="mini-list mt-3" style="margin-left:-18px;margin-right:-18px">' +
          (spv
            ? '<button class="mini-item" data-act="bantu-spv" style="cursor:pointer;width:100%">' +
              '<div class="prd__mini">👷</div>' +
              '<div style="min-width:0;flex:1;text-align:left"><b style="font-size:12.6px">' +
                U.esc(spv.nama) + '</b><div class="tbl-sub">' +
                U.esc(I18N.t('Atasan langsung')) + ' — ' + U.esc(I18N.t('kendala pekerjaan')) +
              '</div></div><span class="go">›</span></button>'
            : '') +
          (admin
            ? '<button class="mini-item" data-act="bantu-admin" style="cursor:pointer;width:100%">' +
              '<div class="prd__mini">🏢</div>' +
              '<div style="min-width:0;flex:1;text-align:left"><b style="font-size:12.6px">' +
                U.esc(I18N.t('Admin EXOCLEAN')) + '</b><div class="tbl-sub">' +
                U.esc(I18N.t('Pembayaran, akun, dan aplikasi')) +
              '</div></div><span class="go">›</span></button>'
            : '') +
        '</div>' +
        (admin && admin.telp
          ? '<div class="tbl-sub mt-2">' + U.esc(I18N.t('Jam layanan Senin–Sabtu 08.00–17.00 WIB.')) + '</div>'
          : UI.alert('warn', I18N.t('Kontak admin belum tersedia pada data aplikasi.'), '⚠️')),
      foot: '<button class="btn btn--ghost btn--block" data-close>' + I18N.t('Tutup') + '</button>',
      actions: {
        'bantu-spv': function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          WA.chat(spv.telp, 'Halo ' + spv.nama.split(' ')[0] + ', saya ' + u.nama + '. ');
        },
        'bantu-admin': function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          WA.chat(admin.telp, 'Halo Admin EXOCLEAN, saya ' + u.nama +
            ' (' + (u.jabatan || I18N.t('mitra lapangan')) + '). ');
        }
      }
    });
  }

  /* ---- shell mobile untuk tenaga kerja lapangan ---- */
  function renderWorkerShell(root, pages, page) {
    var u = state.user;
    var keys = Object.keys(pages).filter(function (k) { return !pages[k].tersembunyi; });
    /* Cangkang mitra lapangan, dan hanya itu. Ordernya milik aplikasi
       pasar; MCS EXOCLEAN tidak melayani peran ini sama sekali. */
    var hariIni = window.BIZ
      ? BIZ.ordersUntuk(u).filter(function (o) { return o.tgl === U.today() && o.status !== 'dibatalkan'; })
      : [];

    root.innerHTML =
      '<div class="wshell">' +
        '<div class="wtop">' +
          '<div class="row1">' +
            '<div><img src="assets/logo-full.png" alt="EXOCLEAN">' +
              (aplikasiIni().sub
                ? '<span class="wapp">' + U.esc(I18N.t(aplikasiIni().sub)) + '</span>' : '') +
            '</div>' +
            /* Dua tombol ini berdampingan rapat dalam satu kelompok.
               Keluar TIDAK ikut di sini: ia bersebelahan dengan tombol yang
               dipakai sehari-hari, dan salah tekan berarti terlempar keluar
               di tengah pekerjaan. Tempatnya di dasar halaman Akun. */
            '<div class="wtop__aksi">' +
              '<button class="out" data-act-tools="bantuan" title="' +
                U.esc(I18N.t('Pusat Bantuan')) + '">🎧</button>' +
              '<button class="out" data-act-tools="pengaturan" title="' +
                U.esc(I18N.t('Pengaturan')) + '">⚙️</button>' +
            '</div>' +
          '</div>' +
          /* Foto ditaruh di samping nama, bukan hanya di halaman Profil:
             layar ini juga dipakai supervisor saat memeriksa ponsel petugas
             di lapangan, dan wajah jauh lebih cepat dikenali daripada nama. */
          '<div class="wtop__id">' +
            fotoMitra(u) +
            '<div style="min-width:0;flex:1">' +
              '<h2>Halo, ' + U.esc(u.nama.split(' ')[0]) + ' 👋</h2>' +
              '<p>' + U.esc(u.jabatan || 'Tenaga Kerja Lapangan') + ' • ' +
                (hariIni.length ? hariIni.length + ' ' + I18N.t('tugas hari ini') : I18N.t('tidak ada tugas hari ini')) + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wbody" id="page"></div>' +
        navBawah(pages, keys) +
      '</div>';

    var pageEl = document.getElementById('page');
    pageEl.innerHTML = page.render(state.params);
    if (page.mount) page.mount(pageEl, state.params);
    UI.pasangTabel(pageEl);

    /* Kisi menu disisipkan SETELAH halaman digambar dan di-mount, supaya
       penanganan aksi milik halaman profil tidak ikut terhapus. */
    if (state.page === NAV_AKUN) {
      var bagi = bagiNav(pages, keys);
      var html = menuAkunHTML(pages, bagi.sisa);
      if (html) pageEl.insertAdjacentHTML('afterbegin', html);
      /* Keluar diletakkan paling bawah — harus digulung dulu untuk sampai ke
         sana. Itu disengaja: keluar adalah tindakan yang jarang diniatkan
         dan mahal bila tidak sengaja, jadi tidak pantas berada di jalur
         yang dilewati jari setiap hari. */
      pageEl.insertAdjacentHTML('beforeend',
        '<div class="akeluar">' +
          '<button class="btn btn--ghost btn--block akeluar__b" data-logout>🚪 ' +
            U.esc(I18N.t('Keluar')) + '</button>' +
        '</div>');
    }

    bindShell(root);
  }

  /* ---------------------------------------------------------------- shell events */
  /* #app tidak pernah diganti, hanya isinya — jadi listener cukup dipasang sekali. */
  var shellBound = false;
  function bindShell(root) {
    if (shellBound) return;
    shellBound = true;
    root.addEventListener('click', function (ev) {
      /* Menekan induk yang punya anak MEMBUKA daftarnya, bukan pindah
         halaman. Induk memang punya halamannya sendiri, tetapi begitu ia
         diberi anak, ketukan pertama yang diharapkan orang adalah melihat
         isinya. */
      var induk = ev.target.closest('.nav-item--induk');
      if (!induk) {
        /* Wadah tanpa anak seharusnya tidak pernah tergambar, tetapi bila ia
           tergambar juga, yang boleh terjadi paling buruk adalah tidak
           terjadi apa-apa — bukan berpindah ke halaman yang tidak ada. */
        var mungkinWadah = ev.target.closest('[data-nav]');
        if (mungkinWadah && window.MENU &&
            MENU.adalahMaya(mungkinWadah.getAttribute('data-nav'))) return;
      }
      if (induk) {
        var ik = induk.getAttribute('data-nav');
        navBuka[ik] = !navBuka[ik];
        render();
        return;
      }

      var nav = ev.target.closest('[data-nav]');
      if (nav) { go(nav.getAttribute('data-nav')); return; }
      if (ev.target.closest('[data-logout]')) { logout(); return; }
      if (ev.target.closest('[data-burger]')) {
        var sb = document.getElementById('sidebar');
        sb.classList.add('open');
        var scrim = document.createElement('div');
        scrim.className = 'scrim';
        scrim.onclick = function () { sb.classList.remove('open'); scrim.remove(); };
        document.body.appendChild(scrim);
        return;
      }
      /* Nilai data-act-tools DIBACA, tidak diabaikan. Sebelumnya tombol apa pun
         yang memakai atribut ini membuka Pengaturan — jadi menambah tombol
         kedua di bilah alat diam-diam membajak fungsinya. */
      var tools = ev.target.closest('[data-act-tools]');
      if (tools) {
        var aksi = tools.getAttribute('data-act-tools');
        if (aksi === 'bantuan') bukaBantuan();
        else dialogPengaturan();
        return;
      }
    });
  }

  /* ---------------------------------------------------------------- pengaturan data */
  /**
   * Kartu penyimpanan bersama.
   *
   * Tiga tombol dengan akibat yang sangat berbeda, jadi ketiganya diberi
   * nama yang menyebut akibatnya — bukan 'Simpan', 'Uji', 'Mulai'. Yang
   * memindahkan data adalah tindakan sekali seumur pemasangan.
   */
  /* Bentuk jamak dengan kunci terpisah untuk satu dan banyak — sama seperti
     di layar MCS. Bahasa Inggris membedakannya, bahasa Indonesia tidak, dan
     menempelkan huruf s di ujung terjemahan bukan penerjemahan. */
  function jmlSy(n, satu, banyak) {
    return n === 1 ? I18N.t(satu) : I18N.t(banyak).replace('{n}', U.num(n));
  }
  function kartuPenyimpanan(cfg, sy) {
    var fase = { mati: '—', memuat: I18N.t('memuat…'), siap: I18N.t('tersambung'),
                 luring: I18N.t('luring'),
                 ditolak: I18N.t('token ditolak'),
                 terbatas: I18N.t('tidak berhak'),
                 sebagian: I18N.t('sebagian ditolak') }[sy.fase] || sy.fase;
    /* Tiga keadaan yang dulu semuanya bernama "luring" dan karena itu semuanya
       diabaikan. Yang ditolak dan yang tidak berhak TIDAK akan sembuh sendiri
       — dan orang yang mengira ia hanya kehilangan sinyal akan terus bekerja
       sepanjang hari tanpa satu pun pekerjaannya tersimpan. */
    var peringatan = '';
    if (sy.fase === 'ditolak') {
      peringatan = UI.alert('danger',
        '<b>' + I18N.t('Token perangkat ini ditolak server.') + '</b> ' +
        I18N.t('Pekerjaan Anda TIDAK tersimpan ke server sejak itu — ia masih ada di ' +
          'perangkat ini dan akan terkirim begitu tokennya benar. Minta pengurus ' +
          'server membuatkan token baru, lalu tempel di bawah.') +
        '<br><span class="tbl-sub">' + U.esc(sy.pesan || '') + '</span>', '⛔');
    } else if (sy.fase === 'terbatas') {
      peringatan = UI.alert('warn',
        '<b>' + I18N.t('Perangkat ini tidak berhak menulis.') + '</b> ' +
        I18N.t('Tokennya bertipe baca-saja, atau ia token admin yang memang tidak ' +
          'boleh menyentuh data. Perubahan yang Anda buat tidak akan tersimpan.') +
        '<br><span class="tbl-sub">' + U.esc(sy.pesan || '') + '</span>', '🔒');
    } else if (sy.fase === 'sebagian' && sy.ditolak && sy.ditolak.length) {
      peringatan = UI.alert('warn',
        '<b>' + jmlSy(sy.ditolak.length, '1 perubahan ditolak server',
          '{n} perubahan ditolak server') + '</b> ' +
        I18N.t('Baris itu memakai id yang sudah dimiliki penyewa lain di server ' +
          'yang sama. Ini hampir selalu berarti dua pemasangan tidak sengaja ' +
          'berbagi satu basis data.') +
        '<br><span class="tbl-sub">' +
          U.esc(sy.ditolak.slice(0, 5).map(function (d) {
            return d.tabel + '/' + d.id;
          }).join(', ')) + '</span>', '⚠️');
    }
    return peringatan +
      '<div class="kv mt-3">' +
        '<dt>' + I18N.t('Penyimpanan bersama') + '</dt><dd>' +
          (sy.aktif ? '<b>' + I18N.t('menyala') + '</b> · ' + U.esc(fase)
                    : I18N.t('mati')) + '</dd>' +
        (sy.aktif && sy.penyewa
          ? '<dt>' + I18N.t('Data milik') + '</dt><dd>' + U.esc(sy.penyewa) + '</dd>'
          : '') +
        (sy.aktif
          ? '<dt>' + I18N.t('Menunggu dikirim') + '</dt><dd>' + sy.antre + '</dd>'
          : '') +
      '</div>' +
      '<div class="field mt-2"><label for="sy-url">' + I18N.t('Alamat server data') + '</label>' +
        '<input class="input" id="sy-url" value="' + U.esc(cfg.url || '') + '" ' +
          'placeholder="http://localhost:4500">' +
        '<div class="hint">' + I18N.t('Jalankan servernya dengan') +
          ' <code>npm run start:data</code></div></div>' +
      '<div class="field"><label for="sy-token">' + I18N.t('Token perangkat') + '</label>' +
        '<input class="input" id="sy-token" type="password" value="' + U.esc(cfg.token || '') + '" ' +
          'autocomplete="off">' +
        /* Disebutkan CARA mendapatkannya, bukan nilainya — dan sengaja bukan
           DATA_TOKEN lagi: token itu kini hanya membuat token perangkat, dan
           ditolak server bila dipakai di sini. Perangkat yang hilang dicabut
           sendiri tanpa mengganggu perangkat lain. */
        '<div class="hint">' +
          I18N.t('Setiap perangkat punya tokennya sendiri. Minta pengurus server ' +
            'membuatkannya:') + ' <code>node app/server/data-server.js --token-baru ' +
          '&lt;penyewa&gt; "' + I18N.t('Nama perangkat') + '"</code>. ' +
          I18N.t('Token itu hanya ditampilkan sekali.') + '</div></div>' +
      '<div class="row mt-2" style="gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn--ghost btn--sm" data-act="sy-uji">' +
          I18N.t('Uji sambungan') + '</button>' +
        (sy.aktif
          ? '<button class="btn btn--ghost btn--sm" data-act="sy-mati">' +
            I18N.t('Kembali ke penyimpanan browser') + '</button>'
          : '<button class="btn btn--sm" data-act="sy-pindah">📤 ' +
            I18N.t('Pindahkan data ke server') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="sy-sambung">' +
            I18N.t('Sambungkan saja (ambil dari server)') + '</button>') +
      '</div>' +
      '<div id="sy-hasil" class="tbl-sub mt-2"></div>';
  }

  /**
   * Lengkapi baris Foto dengan ukuran dan TEMPAT TINGGALNYA.
   *
   * Tempatnya disebutkan, bukan hanya ukurannya. Tiga keadaan yang berbeda
   * jauh akibatnya: di IndexedDB (aman, ruangnya besar), di server juga
   * (aman walau perangkatnya hilang), atau masih di localStorage karena
   * IndexedDB diblokir (terbatas ±5 MB, dan itu harus diketahui SEBELUM
   * penuh, bukan sesudah).
   */
  function isiUkuranFoto() {
    var el = document.getElementById('sy-foto');
    if (!el || !window.FOTO) return;
    var n = Object.keys(DB.raw.photos).length;
    FOTO.ukuran().then(function (u) {
      var el2 = document.getElementById('sy-foto');
      if (!el2) return;
      if (!u.siap) {
        el2.innerHTML = n + ' <span class="mcs-warn">(' +
          I18N.t('masih di penyimpanan browser — terbatas ±5 MB') + ')</span>';
        return;
      }
      var kb = Math.round(u.byte / 1024);
      var sy = window.SYNC ? SYNC.keadaan() : { aktif: false };
      var tempat = sy.aktif
        ? I18N.t('di perangkat ini dan di server')
        : I18N.t('di perangkat ini saja');
      el2.innerHTML = n + ' · ' + U.num(kb) + ' KB <span class="tbl-sub">(' +
        U.esc(tempat) + ')</span>';
    });
  }

  function syBaca() {
    return { url: (document.getElementById('sy-url') || {}).value || '',
             token: (document.getElementById('sy-token') || {}).value || '' };
  }
  function syPesan(teks, warna) {
    var el = document.getElementById('sy-hasil');
    if (el) el.innerHTML = '<span class="' + (warna || '') + '">' + teks + '</span>';
  }

  function dialogPengaturan() {
    var ukuran = DB.ukuran();
    var sy = window.SYNC ? SYNC.keadaan() : { aktif: false };
    var cfg = window.SYNC ? SYNC.config() : {};

    var body =
      (sy.aktif
        /* Hanya 'siap' yang boleh hijau. Sebelumnya semua fase selain 'luring'
           dianggap sehat, sehingga token yang ditolak tetap mendapat spanduk
           hijau bertuliskan "data tersimpan di server" — tepat di atas
           peringatan merah yang mengatakan sebaliknya. Yang dibaca orang
           adalah yang hijau. */
        ? UI.alert(sy.fase === 'siap' || sy.fase === 'memuat' ? 'ok' : 'warn',
            '<b>' + I18N.t('Penyimpanan bersama menyala.') + '</b> ' +
            (sy.fase === 'ditolak' || sy.fase === 'terbatas'
              ? I18N.t('Tetapi perangkat ini sedang TIDAK tersambung ke sana — ' +
                  'perubahannya menumpuk di browser ini saja. Lihat keterangan di bawah.')
              : I18N.t('Data disimpan di basis data pada server, bukan di browser ini. ' +
                  'Perangkat lain yang menyambung ke server yang sama melihat data yang sama.')) +
            (sy.fase === 'luring'
              ? '<br><b>' + I18N.t('Sekarang luring') + ':</b> ' + U.esc(sy.pesan || '') + ' — ' +
                I18N.t('perubahan Anda ditahan dan dikirim begitu server terjangkau lagi.')
              : ''), '🗄️')
        : UI.alert('brand',
            '<b>' + I18N.t('Data masih di browser ini saja.') + '</b> ' +
            I18N.t('Ia hilang bila penyimpanan browser dibersihkan, dan tidak bisa dibuka ' +
              'dari perangkat lain. Nyalakan penyimpanan bersama di bawah untuk ' +
              'memindahkannya ke basis data di server.'), '⚠️')) +

      kartuPenyimpanan(cfg, sy) +
      '<div class="kv mt-3">' +
        /* Kuota 5 MB itu batas localStorage. Begitu datanya pindah ke server,
           menyebutnya lagi membuat orang mengira ia masih terancam penuh —
           padahal yang tersisa di browser hanyalah singgahan.

           Sejak foto pindah ke IndexedDB, angka ini juga TIDAK LAGI memuat
           foto. Menampilkannya sebagai satu angka membuat orang mengira
           fotonya tidak memakan tempat sama sekali — karena itu foto
           mendapat barisnya sendiri. */
        '<dt>' + I18N.t('Ukuran data') + '</dt><dd>' + ukuran + ' KB' +
          (sy.aktif ? ' <span class="tbl-sub">(' + I18N.t('singgahan luring') + ')</span>'
                    : ' <span class="tbl-sub">(' + I18N.t('tanpa foto') + ')</span>') + '</dd>' +
        '<dt>' + I18N.t('Foto') + '</dt><dd id="sy-foto">' +
          Object.keys(DB.raw.photos).length + ' <span class="tbl-sub">(' +
          I18N.t('menghitung…') + ')</span></dd>' +
        '<dt>' + I18N.t('Jumlah order') + '</dt><dd>' + DB.all('orders').length + '</dd>' +
        '<dt>Pengguna aktif</dt><dd>' + DB.all('users').length + '</dd>' +
      '</div>' +
      '<div class="field mt-3"><label>Impor data (.json)</label>' +
        '<input type="file" accept="application/json,.json" class="input" data-change="impor"></div>';

    /* Ukuran foto dibaca dari IndexedDB, dan itu asinkron. Modalnya dibuka
       lebih dulu dengan angka jumlah yang sudah diketahui, lalu barisnya
       dilengkapi — menahan seluruh dialog demi satu angka membuat tombol
       Pengaturan terasa rusak. */
    setTimeout(function () { isiUkuranFoto(); }, 0);

    UI.modal({
      title: 'Data & Pengaturan', size: 'narrow', body: body,
      foot: '<button class="btn btn--ghost" data-act="reset">' + I18N.t('↺ Reset ke data contoh') + '</button>' +
            '<button class="btn" data-act="ekspor">⬇ Ekspor JSON</button>',
      actions: {
        'sy-uji': function () {
          var f = syBaca();
          syPesan(I18N.t('Menghubungi server…'));
          SYNC.kesehatan(f.url).then(function (h) {
            if (!h.ok) { syPesan('❌ ' + U.esc(h.pesan || I18N.t('Server tidak menjawab')), 'mcs-warn'); return; }
            /* Sambungan hidup belum berarti tokennya benar — diperiksa
               dengan satu permintaan yang memang butuh token. */
            SYNC.simpanConfig({ url: f.url, token: f.token });
            SYNC.minta('/api/data/keadaan').then(function (k) {
              syPesan('✅ ' + I18N.t('Tersambung') + ' — ' +
                U.num(k.baris) + ' ' + I18N.t('baris di server') + ' · ' +
                Math.round(k.ukuranByte / 1024) + ' KB');
            }).catch(function (e) {
              syPesan('❌ ' + U.esc(e.message), 'mcs-warn');
            });
          });
        },
        'sy-pindah': function () {
          var f = syBaca();
          SYNC.simpanConfig({ url: f.url, token: f.token });
          UI.konfirm({
            title: I18N.t('Pindahkan seluruh data ke server?'),
            htmlText: I18N.t('Seluruh isi penyimpanan browser ini disalin ke basis data di ' +
              'server, dan sejak itu server yang menjadi sumbernya. Lakukan ini dari SATU ' +
              'perangkat saja — perangkat lain cukup disambungkan.'),
            okText: I18N.t('Pindahkan')
          }).then(function (ya) {
            if (!ya) return;
            syPesan(I18N.t('Memindahkan…'));
            SYNC.migrasi(false).then(function (h) {
              SYNC.simpanConfig({ aktif: true });
              syPesan('✅ ' + U.num(h.baris) + ' ' + I18N.t('baris tersimpan di server') + '. ' +
                I18N.t('Aplikasi dimuat ulang…'));
              setTimeout(function () { location.reload(); }, 1200);
            }).catch(function (e) {
              syPesan('❌ ' + U.esc(e.message), 'mcs-warn');
            });
          });
        },
        'sy-sambung': function () {
          var f = syBaca();
          UI.konfirm({
            title: I18N.t('Ambil data dari server?'),
            htmlText: I18N.t('Data yang sekarang ada di browser ini DIGANTI dengan isi server. ' +
              'Pakai ini pada perangkat kedua dan seterusnya.'),
            okText: I18N.t('Ambil dari server'), danger: true
          }).then(function (ya) {
            if (!ya) return;
            SYNC.simpanConfig({ url: f.url, token: f.token, aktif: true });
            syPesan(I18N.t('Mengambil…'));
            SYNC.muat().then(function (h) {
              if (h.dari !== 'server') {
                SYNC.simpanConfig({ aktif: false });
                syPesan('❌ ' + U.esc(h.pesan || ''), 'mcs-warn');
                return;
              }
              syPesan('✅ ' + I18N.t('Terambil. Aplikasi dimuat ulang…'));
              setTimeout(function () { location.reload(); }, 1000);
            });
          });
        },
        'sy-mati': function () {
          UI.konfirm({
            title: I18N.t('Kembali ke penyimpanan browser?'),
            htmlText: I18N.t('Aplikasi berhenti mengirim dan mengambil dari server. Salinan ' +
              'yang ada sekarang tetap dipakai di perangkat ini — dan sejak itu ia kembali ' +
              'bisa hilang bila penyimpanan browser dibersihkan.'),
            okText: I18N.t('Matikan'), danger: true
          }).then(function (ya) {
            if (!ya) return;
            SYNC.simpanConfig({ aktif: false });
            SYNC.berhenti();
            location.reload();
          });
        },
        ekspor: function () {
          var blob = new Blob([DB.exportJSON()], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'exoclean-data-' + U.today() + '.json';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          UI.toast('Data diekspor', 'ok');
        },
        impor: function (el) {
          var f = el.files && el.files[0];
          if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            try {
              DB.importJSON(r.result);
              UI.toast(I18N.t('Data berhasil diimpor'), 'ok');
              var u = DB.find('users', ambilSesi());
              state.user = u || null; render();
              document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
              document.body.style.overflow = '';
            } catch (e) { UI.toast(I18N.t('Gagal impor:') + ' ' + e.message, 'err'); }
          };
          r.readAsText(f);
        },
        reset: function () {
          UI.konfirm({ title: I18N.t('Reset seluruh data?'), danger: true, okText: 'Ya, reset',
            text: I18N.t('Semua order, invoice, dan foto yang Anda buat akan dihapus dan diganti data contoh.') })
            .then(function (ya) {
              if (!ya) return;
              DB.reset();
              document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
              document.body.style.overflow = '';
              state.user = DB.find('users', state.user && state.user.id) || null;
              render();
              UI.toast(I18N.t('Data dikembalikan ke contoh awal'), 'ok');
            });
        }
      }
    });
  }

  /* ---------------------------------------------------------------- init */
  function init() {
    /* Singgahan lokal dibuka lebih dulu supaya aplikasi punya sesuatu untuk
       ditampilkan walau server tak terjangkau. */
    DB.init();

    /* Foto diambil dari IndexedDB SEBELUM apa pun digambar. Menggambar lebih
       dulu berarti setiap layar yang memuat foto muncul kosong sesaat lalu
       terisi — dan pada layar bukti sebelum/sesudah, kosong sesaat tidak
       bisa dibedakan dari bukti yang memang tidak ada.

       Ia tidak pernah menolak: bila IndexedDB diblokir, ia melapor tidak
       siap dan aplikasi berjalan seperti sebelum ada berkas foto.js. */
    DB.muatFoto().then(function (f) {
      if (f && f.dipindah) {
        console.log('[foto] ' + f.dipindah + ' ' + I18N.t('foto dipindahkan dari localStorage ke IndexedDB'));
      }
      if (f && f.gagalPindah && window.UI) {
        /* Dikatakan, bukan didiamkan: fotonya masih ada, tetapi masih di
           tempat yang sempit, dan orangnya perlu tahu sebelum penuh. */
        UI.toast(I18N.t('Sebagian foto belum bisa dipindahkan ke penyimpanan besar.'), 'warn');
      }

      /* Bila penyimpanan bersama menyala, isinya diambil SEBELUM penyegaran
         invoice, poin, dan komisi dijalankan. Menjalankannya di atas singgahan
         basi berarti menghitung ulang hal yang sama dua kali — dan yang kedua
         membatalkan yang pertama. */
      if (window.SYNC && SYNC.aktif()) {
        SYNC.muat().then(function (h) {
          if (h && h.dari === 'singgahan' && window.UI) {
            UI.toast(I18N.t('Server data tidak terjangkau — memakai salinan luring.'), 'warn');
          }
          lanjutInit();
        });
        return;
      }
      lanjutInit();
    });
  }

  function lanjutInit() {
    /* Perawatan modul pasar, dijaga satu per satu dengan pola yang sama seperti
       MODULES di bawah dan karena alasan yang sama: MCS EXOCLEAN sengaja tidak
       membawa biz, pay, afiliasi, dropship, poin, voucher, dan berkas.
       Memanggilnya secara kaku membuat aplikasi mati dengan ReferenceError
       sebelum satu piksel pun tergambar. */
    if (window.BIZ) BIZ.segarkanInvoice();
    if (window.PAY) PAY.segarkan();
    /* komisi & margin yang masa tahannya lewat dimatangkan di sini, sekali per
       pembukaan aplikasi — sama polanya dengan penyegaran invoice */
    if (window.AFILIASI) AFILIASI.segarkan();
    if (window.DROPSHIP) DROPSHIP.segarkan();
    /* poin yang lewat masa berlakunya dihanguskan di sini, sekali per pembukaan */
    if (window.POIN) POIN.segarkan();
    /* voucher yang lewat masa berlakunya ditandai di sini juga */
    if (window.VOUCHER) VOUCHER.segarkan();
    /* Penyimpanan lampiran dibuka lebih dulu supaya tombol Foto/Video sudah
       tahu apakah ia boleh tampil saat halaman pertama digambar; lampiran
       yatim dibersihkan setelahnya agar tidak menahan kuota perangkat. */
    if (window.BERKAS) BERKAS.siap().then(function (bisa) { if (bisa) BERKAS.rapikan(); });
    /* Service worker didaftarkan tanpa menunggu: gagal mendaftar (mis. dibuka
       lewat http:// bukan localhost) tidak boleh menghentikan apa pun. */
    if (window.NOTIF) NOTIF.siap();
    /* Kepulangan dari halaman pembayaran gateway dibaca PALING AWAL: keduanya
       merapikan alamat, dan yang membaca belakangan akan kehilangan
       parameternya bila satu tautan membawa ?ref= sekaligus ?order_id=. */
    if (window.Bayar) Bayar.bacaKepulangan();
    /* ?ref= dari tautan afiliasi dibaca sebelum apa pun dirender */
    ViewDaftar.bacaParameter();

    /* Disusun dari modul peran yang BENAR-BENAR dimuat. Aplikasi mitra
       (mitra.html) sengaja tidak membawa layar klien, admin, dan toko —
       menuliskan kelimanya secara kaku membuatnya mati dengan ReferenceError
       sebelum satu piksel pun tergambar. */
    MODULES = {};
    if (window.ViewAdmin) MODULES.admin = ViewAdmin;
    /* Pemasangan MANDIRI tidak membawa views/admin.js — itu konsol aplikasi
       pasar. Adminnya di sini hanya mengurus satu hal: mendaftarkan korporat.
       Halaman akun ikut, supaya ia bisa mengganti sandi bawaannya. */
    else if (window.ViewMCS && ViewMCS.pagesAdmin) {
      MODULES.admin = { pages: Object.assign({}, ViewMCS.pagesAdmin,
        window.ViewProfil ? { profil: ViewProfil.page('Akun') } : {}) };
    }
    if (window.ViewSupervisor) MODULES.supervisor = ViewSupervisor;
    if (window.ViewClient) MODULES.client = ViewClient;
    if (window.ViewWorker) MODULES.worker = ViewWorker;
    if (window.ViewToko) MODULES.seller = ViewToko;
    /* Staf korporat MCS: hanya melihat area, petugas, dan jadwalnya sendiri. */
    if (window.ViewMCS) MODULES.korporat = { pages: ViewMCS.pagesKorporat };
    /* Petugas kebersihan korporat: hanya area yang ditugaskan kepadanya. */
    if (window.ViewMCS && ViewMCS.pagesPetugas) MODULES.petugas = { pages: ViewMCS.pagesPetugas };
    /* PEMILIK RUANGAN — bukan staf kebersihan, bukan staf korporat. Ia
       memakai ruangannya setiap hari dan hanya melihat ruangannya sendiri. */
    if (window.ViewPenghuni) MODULES.penghuni = { pages: ViewPenghuni.pages };

    /* Sebuah berkas boleh ikut termuat tanpa perannya ikut dilayani.
       index.html tetap memuat js/views/mcs.js karena staf admin memerlukan
       halaman pendaftaran korporat di dalamnya — tetapi staf korporatnya
       sendiri diarahkan ke MCS EXOCLEAN, bukan dilayani di sini. */
    var dilayani = aplikasiIni().peran;
    Object.keys(MODULES).forEach(function (r) {
      if (dilayani.indexOf(r) < 0) delete MODULES[r];
    });

    /* Layar pembuka tampil dulu; aplikasinya dijalankan di baliknya sehingga
       perpindahannya menyatu, bukan berkedip putih. Menyentuh layar
       melewatinya. */
    ViewSplash.tampilkan(mulai);
  }

  function mulai() {
    var sesi = ambilSesi();
    var u = sesi ? DB.find('users', sesi) : null;

    /* Sesi tersimpan tidak otomatis berlaku: bila perangkatnya sudah tidak
       dipercaya lagi — dicabut dari perangkat lain, atau memang browser baru —
       pengguna harus membuktikan diri dulu sebelum aplikasinya terbuka. */
    if (u && u.aktif && KEAMANAN.tantangan(u) !== 'tidak-ada') {
      simpanSesi(null);
      render();
      ViewKeamanan.tantanganPerangkat(u).then(function (boleh) {
        if (boleh) {
          login(DB.find('users', u.id));
          if (window.Bayar) Bayar.tampilkanKepulangan();
        }
        else UI.toast(I18N.t('Verifikasi dibatalkan — silakan masuk kembali.'), 'warn');
      });
      return;
    }

    if (u && u.aktif) {
      state.user = u;
      I18N.set(AKUN.preferensi(u).bahasa);
      if (window.TAMPILAN) TAMPILAN.pakaiUser(u);
      KEAMANAN.sentuhPerangkat(u.id);
    }
    var h = location.hash.replace(/^#/, '');
    if (state.user && h && pagesFor(state.user)[h]) state.page = h;
    render();
    /* setelah layar pembuka usai — kalau klien baru pulang dari halaman bayar */
    if (window.Bayar) Bayar.tampilkanKepulangan();
  }

  return {
    init: init, login: login, logout: logout, go: go, refresh: refresh,
    segarkanTopbar: segarkanTopbar, perbaruiSesi: perbaruiSesi,
    get user() { return state.user; },
    get page() { return state.page; },
    get params() { return state.params; },
    pengaturan: dialogPengaturan,
    /* Dibuka supaya layar Susunan Menu bisa membaca halaman milik peran LAIN,
       bukan hanya peran yang sedang masuk — Super Admin mengatur menu klien
       dan mitra toko tanpa harus login sebagai mereka. */
    get modules() { return MODULES; },
    /* Layar masuk perlu tahu ia sedang menjadi aplikasi yang mana: judul,
       kalimat pembuka, dan nama produknya berbeda per merek. */
    aplikasi: aplikasiIni
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  try { APP.init(); }
  catch (e) {
    console.error(e);
    document.getElementById('app').innerHTML =
      '<div style="padding:40px;font-family:system-ui"><h2>' + I18N.t('Gagal memuat aplikasi') + '</h2><pre>' +
      (e && e.stack || e) + '</pre></div>';
  }
});
