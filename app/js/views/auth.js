/* ==========================================================================
   views/auth.js — halaman masuk + pemilih akun demo
   ========================================================================== */
var ViewAuth = (function () {

  var PERAN = [
    { role: 'client',     ic: '🧑‍💼', judul: 'Klien',
      ket: 'Pesan layanan, pantau progres, setujui penawaran, bayar & beri penilaian.' },
    { role: 'admin',      ic: '🗂️', judul: 'Admin EXOCLEAN',
      ket: 'Kelola permintaan, penawaran, penjadwalan, invoice, dan notifikasi WhatsApp.' },
    { role: 'supervisor', ic: '🦺', judul: 'Supervisor Lapangan',
      ket: 'Atur tim, pantau absensi & foto lapangan, verifikasi mutu pekerjaan.' },
    { role: 'worker',     ic: '🧹', judul: 'Tenaga Kerja Lapangan',
      ket: 'Lihat jadwal, check-in GPS, isi checklist, unggah foto sebelum/sesudah.' },
    { role: 'seller',     ic: '🏪', judul: 'Mitra Toko',
      ket: 'Kelola produk, pesanan toko, saldo & pencairan, iklan, dan kampanye.' },
    { role: 'korporat',   ic: '🏢', judul: 'Staf Korporat',
      ket: 'Daftarkan area & petugas, susun jadwal, dan terima bukti foto tiap langkah.' }
  ];

  /* ------------------------------------------------------------- merek
     Layar masuk ini melayani tiga aplikasi. Yang berbeda bukan tata letaknya,
     melainkan SIAPA yang berdiri di depannya — dan karena itu peran mana yang
     pantas ditawarkan. Menampilkan akun demo klien di layar masuk MCS bukan
     sekadar salah rasa: menekannya langsung melempar orang ke layar 'salah
     pintu' di detik pertama ia mencoba produknya. */
  function merek() {
    var a = (window.APP && APP.aplikasi) ? APP.aplikasi() : null;
    return a || { kode: 'klien', nama: 'EXOCLEAN', sub: '',
      peran: ['client', 'seller', 'admin', 'supervisor', 'worker'] };
  }
  function peranAplikasi() {
    var boleh = merek().peran;
    return PERAN.filter(function (p) { return boleh.indexOf(p.role) >= 0; })
      .map(function (p) {
        /* Admin bekerja berbeda di dua aplikasi. Di EXOCLEAN ia mengurus
           permintaan, penawaran, dan invoice. Di MCS yang berdiri sendiri
           ia hanya mendaftarkan korporat — menjanjikan yang lain di layar
           masuk berarti berbohong sebelum orangnya sempat menekan apa pun. */
        if (p.role !== 'admin' || window.BIZ) return p;
        /* Teks MENTAH, tidak dibungkus: larik PERAN menyimpan sumbernya, dan
           I18N.t() dipasang di tempat menggambar. Membungkusnya dua kali
           membuat kuncinya tidak ketemu dan bahasanya balik ke Indonesia. */
        return { role: p.role, ic: p.ic, judul: 'Administrator',
          ket: 'Daftarkan korporat, kelola akun stafnya, dan atur sistem.' };
      });
  }

  function render() {
    return '' +
    '<div class="auth">' +
      '<div class="auth__hero">' +
        '<div class="auth__brand"><div>' +
          '<img src="assets/logo-full.png" alt="EXOCLEAN">' +
          (merek().sub
            ? '<div class="auth__brand-app">' + U.esc(I18N.t(merek().sub)) + '</div>' : '') +
        '</div></div>' +
        '<div>' +
          /* DIBUNGKUS I18N.t() di sini — di tempat MENGGAMBAR, bukan di
             tempat APLIKASI dideklarasikan. Array itu dievaluasi sekali saat
             berkas dimuat, jadi membungkusnya di sana akan membekukan
             bahasanya pada bahasa saat boot.

             Sebelumnya nilainya dipakai apa adanya sementara HANYA
             cadangannya yang diterjemahkan — sehingga pintu Mitra dan MCS
             menampilkan kalimat Bahasa Indonesia di tengah antarmuka
             Inggris, dan hanya pintu Klien (yang memang tidak punya
             tagline sendiri) yang terbaca benar. */
          '<h1>' + U.esc(merek().tagline
            ? I18N.t(merek().tagline)
            : I18N.t('Satu aplikasi untuk seluruh operasional cleaning service')) + '</h1>' +
          '<p class="lead">' + U.esc(merek().lead
            ? I18N.t(merek().lead)
            : I18N.t('Dari permintaan klien, penawaran harga, penjadwalan tim, absensi GPS di lapangan, ' +
                'verifikasi mutu, sampai invoice dan penilaian — semuanya terhubung dalam satu alur.')) +
          '</p>' +
          /* DIBUNGKUS DI SINI, bukan di larik PERAN.

             Larik itu dievaluasi sekali saat berkas dimuat; membungkusnya di
             sana akan membekukan bahasanya pada bahasa saat boot, dan
             pergantian bahasa tidak memuat ulang halaman. Alasan yang sama
             persis dengan APLIKASI.tagline.

             Padanan Inggris keterangannya sudah lama ada di kamus — yang
             tidak ada hanya pembungkusnya, sehingga kartu peran tetap
             berbahasa Indonesia di tengah halaman masuk berbahasa Inggris.
             Cacat yang tidak akan pernah dilaporkan alat mana pun: kodenya
             benar, kamusnya benar, hanya keduanya tidak pernah bertemu. */
          '<div class="auth__roles">' + peranAplikasi().map(function (p) {
            return '<div class="auth__role"><span class="ic">' + p.ic + '</span>' +
              '<div><b>' + U.esc(I18N.t(p.judul)) + '</b><span>' +
              U.esc(I18N.t(p.ket)) + '</span></div></div>';
          }).join('') + '</div>' +
        '</div>' +
        /* Kaki halaman ikut diterjemahkan. Padanannya sudah ada sejak tanda
           tangan pesan WhatsApp memakai kalimat yang sama persis. */
        '<div class="auth__foot">' + U.esc(merek().nama) + ' — ' +
          U.esc(I18N.t('Solusi kebersihan gedung, kantor & rumah')) + '</div>' +
      '</div>' +

      '<div class="auth__panel"><div class="auth__box">' +
        '<img src="assets/logo-stack.png" alt="EXOCLEAN">' +
        '<h2>' + I18N.t('Masuk ke aplikasi') + '</h2>' +
        '<div class="sub">' + I18N.t('Masuk dengan akun Anda, atau coba akun demo di bawah.') + '</div>' +

        ViewDaftar.tombolSosial() +

        '<form data-submit="masuk">' +
          '<div class="field"><label for="em">' + I18N.t('Email atau nomor HP') + '</label>' +
            '<input class="input" id="em" name="email" placeholder="nama@email.com / 08xxxxxxxxxx" autocomplete="username"></div>' +
          '<div class="field"><label for="pw">' + I18N.t('Kata sandi') + '</label>' +
            '<input class="input" id="pw" name="pass" type="password" placeholder="••••••" autocomplete="current-password"></div>' +
          '<button class="btn btn--block btn--lg" type="submit">' + I18N.t('Masuk') + '</button>' +
          '<div class="row mt-2" style="justify-content:center">' +
            '<a href="#" class="tautan-kecil" data-act="lupa">' + I18N.t('Lupa email, kata sandi, atau PIN?') + '</a>' +
          '</div>' +
        '</form>' +

        (merek().kode === 'mcs'
          ? '<div class="hint mt-2" style="text-align:center">' + I18N.t('Akun korporat dibuat oleh staf') + ' ' +
            I18N.t('EXOCLEAN. Hubungi tim kami untuk mengaktifkan MCS di gedung Anda.') + '</div>'
          : '<div class="daftar-ajak">' + I18N.t('Belum punya akun?') + ' ' +
            '<button class="btn btn--soft btn--sm" data-act="daftar-akun">' + I18N.t('Daftar Sekarang') + '</button></div>') +

        '<div class="row mt-3" style="gap:10px">' +
          '<div style="flex:1;height:1px;background:var(--line)"></div>' +
          '<span style="font-size:11.5px;color:var(--muted)">' + I18N.t('atau coba sebagai') + '</span>' +
          '<div style="flex:1;height:1px;background:var(--line)"></div>' +
        '</div>' +

        '<div class="mt-2">' + peranAplikasi().map(function (p) {
          var list = DB.where('users', { role: p.role, aktif: true });
          if (!list.length) return '';
          return '<div class="nav-group" style="color:var(--muted);padding:12px 0 4px">' + p.ic + ' ' +
            U.esc(I18N.t(p.judul)) + '</div><div class="demo-list">' +
            list.slice(0, p.role === 'worker' ? 3 : 4).map(function (u) {
              /* pegawai internal ditandai nama peran aksesnya, supaya terlihat
                 bahwa tiap akun membuka menu yang berbeda */
              var ket;
              if (window.AKSES && ['admin', 'supervisor'].indexOf(u.role) >= 0) {
                ket = AKSES.namaPeran(u);
              } else if (u.role === 'seller') {
                var tk = window.SELLER ? SELLER.toko(u) : null;
                var st = window.SELLER ? SELLER.statusToko(u) : '';
                ket = (tk && tk.nama ? tk.nama : u.email) +
                  (tk && tk.kota ? ' · ' + tk.kota : '') +
                  (st && st !== 'aktif' ? ' · ' + (st === 'verifikasi' ? 'menunggu verifikasi' : st) : '');
              } else {
                ket = u.perusahaan || u.jabatan || u.email;
              }
              return '<button class="demo-acc" data-act="cepat" data-id="' + u.id + '">' +
                UI.avatar(u.nama, 'sm') +
                '<div style="min-width:0"><b>' + U.esc(u.nama) + '</b>' +
                '<small>' + U.esc(ket) + '</small></div>' +
                '<span class="go">›</span></button>';
            }).join('') + '</div>';
        }).join('') + '</div>' +

        (merek().kode === 'mcs' ? '' :
        '<div class="mt-3" style="border-top:1px solid var(--line);padding-top:16px">' +
          '<div class="row" style="gap:12px;align-items:flex-start">' +
            '<div style="font-size:22px">🧹</div>' +
            '<div style="flex:1;min-width:0">' +
              '<b style="font-size:13.5px">' + I18N.t('Ingin bergabung sebagai Mitra EXOCLEAN?') + '</b>' +
              '<div class="hint" style="margin-top:2px">' + I18N.t('Daftar sendiri, ikuti pembelajaran di aplikasi,') + ' ' +
              I18N.t('dan mulai menerima pekerjaan setelah tersertifikasi.') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn--soft btn--block mt-2" data-act="daftar-mitra">' + I18N.t('＋ Daftar Jadi Mitra') + '</button>' +
        '</div>' +

        '<div class="join-box mt-2">' +
          '<div class="row" style="gap:10px;align-items:flex-start">' +
            '<span style="font-size:20px">🏪</span>' +
            '<div style="flex:1;min-width:0">' +
              '<b style="font-size:13.5px">' + I18N.t('Punya produk kebersihan untuk dijual?') + '</b>' +
              '<div class="hint" style="margin-top:2px">' + I18N.t('Buka toko di EXOCLEAN. Jual alat, perlengkapan,') + ' ' +
              I18N.t('aksesoris, dan chemical ke ribuan klien kami. Komisi mulai 8%.') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn--soft btn--block mt-2" data-act="daftar-toko">' + I18N.t('🏪 Daftar Jadi Mitra Toko') + '</button>' +
        '</div>') +

        /* KALIMAT INI DIHITUNG DARI DATANYA, BUKAN DIJANJIKAN.

           Sebelumnya ia selalu berbunyi “Semua akun demo memakai kata sandi
           123456”. Untuk pintu Klien itu benar. Untuk pintu MCS ia salah
           pada SELURUH akun yang ditampilkannya: staf korporat dibuat lewat
           jalur lain dengan sandi lain, dan tidak satu pun dari keempat akun
           yang terlihat menerima 123456.

           Yang menekan tombol akunnya tidak akan pernah tahu — tombol itu
           masuk langsung tanpa sandi. Yang mengetik sendiri akan ditolak
           berulang kali oleh sandi yang baru saja dijanjikan layar ini
           kepadanya, lalu menyimpulkan aplikasinya rusak.

           Diperiksa apa adanya: bila seluruh akun yang DITAMPILKAN memang
           menerima 123456, angkanya disebut; bila tidak, yang disebut
           kenyataan yang selalu benar — tombolnya masuk tanpa sandi. */
        (function () {
          var akun = [];
          peranAplikasi().forEach(function (p) {
            var l = DB.where('users', { role: p.role, aktif: true });
            akun = akun.concat(l.slice(0, p.role === 'worker' ? 3 : 4));
          });
          var semua123 = akun.length && akun.every(function (u) {
            return window.KEAMANAN && KEAMANAN.periksaSandi(u, '123456');
          });
          return '<div class="hint mt-3" style="text-align:center;color:var(--muted-2)">' +
            (semua123
              ? I18N.t('Semua akun demo memakai kata sandi') + ' <b>123456</b>.'
              : I18N.t('Tekan salah satu akun di atas untuk masuk langsung — tanpa kata sandi.')) +
            '<br>' + I18N.t('Data prototipe tersimpan lokal di browser ini.') + '</div>';
        })() +
      '</div></div>' +
    '</div>';
  }

  /* #app dipakai ulang antar render, jadi listener cukup dipasang sekali. */
  var bound = false;
  function mount(root) {
    if (bound) return;
    bound = true;
    U.delegate(root, {
      cepat: function (el) {
        var u = DB.find('users', el.getAttribute('data-id'));
        if (u) masukDenganPemeriksaan(u);
      },
      'daftar-mitra': dialogDaftar,
      'daftar-toko': dialogDaftarToko,
      masuk: function (el) {
        var f = U.readForm(el);
        if (!f.email || !f.pass) { UI.toast(I18N.t('Isi email/nomor HP dan kata sandi'), 'err'); return; }
        /* satu kolom untuk email maupun nomor HP — AKUN yang membedakannya */
        var hasil = AKUN.masuk(f.email, f.pass);
        if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
        masukDenganPemeriksaan(hasil.user);
      },
      lupa: function () { ViewKeamanan.dialogLupa(); },
      'daftar-akun': function () { ViewDaftar.dialogDaftar(); },
      'sos-google': function () { ViewDaftar.dialogMasukSosial('google'); },
      'sos-facebook': function () { ViewDaftar.dialogMasukSosial('facebook'); }
    });
  }

  /**
   * Sandi benar bukan berarti langsung masuk: bila perangkatnya belum dikenal,
   * pengguna harus membuktikan diri lewat authenticator (atau PIN, bagi akun
   * yang belum memasang authenticator).
   */
  function masukDenganPemeriksaan(u) {
    ViewKeamanan.tantanganPerangkat(u).then(function (boleh) {
      if (!boleh) { UI.toast(I18N.t('Verifikasi dibatalkan — Anda belum masuk.'), 'warn'); return; }
      APP.login(DB.find('users', u.id));
    });
  }

  /* ================================================================ PENDAFTARAN MITRA */
  /**
   * Pendaftaran mandiri calon mitra. Akun langsung dibuat dengan status
   * 'onboarding' — belum bisa menerima penugasan sampai lulus pembelajaran
   * dan disetujui admin.
   */
  function dialogDaftar() {
    UI.formModal({
      title: I18N.t('Daftar Jadi Mitra EXOCLEAN'), size: 'wide', okText: I18N.t('Daftar Sekarang'),
      /* SATU frasa utuh, bukan delapan potongan yang disambung.

         Sebelumnya paragraf ini dirakit dari literal telanjang dan panggilan
         I18N.t() secara berselang-seling, sehingga pada antarmuka Inggris ia
         terbaca setengah Inggris setengah Indonesia di tengah kalimat. Dan
         perakitan seperti itu tidak bisa diperbaiki dengan membungkus tiap
         potongannya: urutan kata sebuah kalimat berbeda di tiap bahasa, jadi
         yang harus utuh adalah KALIMATNYA. */
      intro: UI.alert('brand',
        I18N.t('<b>Yang perlu Anda tahu sebelum mendaftar.</b> Setelah akun dibuat, Anda ' +
          'akan diminta menyetujui Syarat &amp; Ketentuan Mitra, melengkapi berkas ' +
          'identitas, lalu <b>mengikuti pembelajaran wajib di aplikasi</b>. Penugasan ' +
          'baru bisa Anda terima setelah seluruh kursus wajib lulus (nilai minimal ' +
          '{kkm}) dan berkas Anda disetujui admin. Pendaftaran <b>tidak dipungut ' +
          'biaya apa pun</b>.').replace('{kkm}', LMS.KKM_DEFAULT),
        '🧹') + '<div class="mb-3"></div>',
      fields: [
        { name: 'nama', label: I18N.t('Nama lengkap'), required: true, placeholder: 'Sesuai kartu identitas' },
        { name: 'telp', label: 'No. WhatsApp aktif', required: true, placeholder: '08xxxxxxxxxx',
          hint: I18N.t('Dipakai untuk semua pemberitahuan penugasan.') },
        { name: 'email', label: I18N.t('Email'), type: 'email', required: true,
          hint: I18N.t('Sekaligus menjadi akun untuk masuk ke aplikasi.') },
        { name: 'kota', label: 'Kota domisili', required: true, placeholder: I18N.t('mis. Bekasi') },
        { name: 'pengalaman', label: 'Pengalaman kebersihan', type: 'select', value: I18N.t('Belum ada'),
          options: [I18N.t('Belum ada'), I18N.t('Kurang dari 1 tahun'), '1–3 tahun', I18N.t('Lebih dari 3 tahun')] },
        { name: 'minat', label: I18N.t('Pekerjaan yang diminati'), type: 'select', value: 'Cleaning umum',
          options: ['Cleaning umum', 'Cuci kaca & fasad', 'Poles lantai', 'Cuci karpet & sofa',
                    'Cuci AC', 'Rope access / ketinggian'] },
        { name: 'pass', label: I18N.t('Kata sandi'), type: 'password', required: true, hint: I18N.t('Minimal 6 karakter.') },
        { name: 'ulang', label: I18N.t('Ulangi kata sandi'), type: 'password', required: true },
        { name: 'pin', label: 'PIN transaksi (6 angka)', type: 'password', required: true,
          hint: I18N.t('Dipakai setiap kali menarik saldo hasil kerja Anda. Berbeda dari kata sandi,') + ' ' +
            I18N.t('dan tidak akan pernah diminta admin lewat telepon atau WhatsApp.') },
        { name: 'pinUlang', label: 'Ulangi PIN transaksi', type: 'password', required: true },
        { name: 'setuju', label: I18N.t('Saya menyatakan data di atas benar dan bersedia mengikuti proses seleksi'),
          type: 'checkbox', value: false }
      ],
      validate: function (d) {
        if (!/^[0-9+\-\s]{9,18}$/.test(String(d.telp))) return I18N.t('Nomor WhatsApp tidak valid');
        if (String(d.pass).length < 6) return 'Kata sandi minimal 6 karakter';
        if (d.pass !== d.ulang) return I18N.t('Ulangan kata sandi tidak cocok');
        var salahPin = KEAMANAN.validPin(d.pin);
        if (salahPin) return salahPin;
        if (d.pin !== d.pinUlang) return I18N.t('Ulangan PIN tidak cocok');
        if (String(d.pin) === String(d.pass)) return I18N.t('PIN tidak boleh sama dengan kata sandi');
        if (!d.setuju) return I18N.t('Centang pernyataan di bagian bawah untuk melanjutkan');
        var ada = DB.all('users').filter(function (x) {
          return x.email.toLowerCase() === String(d.email).toLowerCase(); });
        if (ada.length) return I18N.t('Email sudah terdaftar — silakan masuk atau pakai email lain');
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var u = DB.insert('users', {
        role: 'worker', nama: d.nama, telp: d.telp, email: String(d.email).toLowerCase(),
        jabatan: I18N.t('Calon Mitra'), aktif: true, foto: null,
        alamat: d.kota, alamatList: [], rekening: [],
        identitas: null, kontakDarurat: [], alamatTinggal: { kota: d.kota },
        statusMitra: 'onboarding', daftarAt: U.nowISO(),
        pengalaman: d.pengalaman, minat: d.minat,
        preferensi: { bahasa: I18N.get(), notifWA: true, notifEmail: false, ringkasanMingguan: false }
      });
      /* sandi & PIN langsung disimpan dalam bentuk turunan, tidak pernah polos */
      KEAMANAN.pasangSandi(u.id, d.pass);
      KEAMANAN.pasangPin(u.id, d.pin);
      KEAMANAN.percayaiPerangkat(u.id, 'perangkat saat mendaftar');
      DB.log(u.id, 'Mendaftar sebagai calon mitra dari ' + d.kota, 'user', u.id);

      /* kabari admin lewat antrean WA internal */
      var admin = BIZ.usersByRole('admin')[0];
      if (admin) {
        DB.insert('waOutbox', { to: admin.id, template: 'manual', status: 'antre', sentAt: null,
          refType: 'user', refId: u.id,
          pesan: (function () {
            var w = I18N.pesanUntuk(admin.id);
            return '*' + w('PENDAFTAR MITRA BARU') + '* 🧹\n\n' +
              d.nama + '\n' + U.phoneDisplay(d.telp) + '\n' +
              w('Domisili:') + ' ' + d.kota + '\n' +
              w('Pengalaman:') + ' ' + d.pengalaman + '\n' +
              w('Minat:') + ' ' + d.minat + '\n\n' +
              w('Mohon dipantau progres onboarding-nya di menu Mitra & Rekrutmen.');
          })() });
      }

      UI.modal({
        title: I18N.t('Pendaftaran berhasil 🎉'), size: 'narrow',
        body: '<p>' + I18N.t('Selamat datang,') + ' <b>' + U.esc(d.nama) + '</b>!</p>' +
          '<p style="font-size:13px;color:var(--ink-2)">' + I18N.t('Akun Anda sudah dibuat. Tiga langkah berikutnya:') + '</p>' +
          '<ol class="pay-steps mt-2">' +
            '<li>' + I18N.t('Setujui Syarat &amp; Ketentuan Mitra') + '</li>' +
            '<li>Lengkapi berkas identitas &amp; kontak darurat</li>' +
            '<li>' + I18N.t('Ikuti dan lulus pembelajaran wajib') + '</li>' +
          '</ol>' +
          UI.alert('ok', '<b>' + I18N.t('PIN transaksi Anda aktif.') + '</b> ' + I18N.t('PIN ini yang nanti menyetujui setiap') + ' ' +
            I18N.t('penarikan saldo hasil kerja Anda. Simpan baik-baik — EXOCLEAN tidak pernah') + ' ' +
            I18N.t('menanyakannya kepada Anda.'), '🔐') +
          UI.alert('info', I18N.t('Semua tahap ada di menu') + ' <b>' + I18N.t('Bergabung') + '</b> ' + I18N.t('setelah Anda masuk.'), 'ℹ️'),
        foot: '<button class="btn btn--lg" data-act="masuk-baru">Masuk Sekarang</button>',
        actions: { 'masuk-baru': function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          APP.login(DB.find('users', u.id));
        } }
      });
    });
  }

  /**
   * Pendaftaran mandiri Mitra Toko. Akun dibuat dengan status toko
   * 'onboarding' — produknya belum tayang sampai profil lengkap dan
   * pengajuannya disetujui admin.
   */
  function dialogDaftarToko() {
    UI.formModal({
      title: I18N.t('Daftar Jadi Mitra Toko EXOCLEAN'), size: 'wide', okText: I18N.t('Buka Toko Saya'),
      intro: UI.alert('brand',
        '<b>Cara kerjanya.</b> ' + I18N.t('Setelah akun dibuat, Anda melengkapi profil toko, identitas penjual,') + ' ' +
        I18N.t('rekening pencairan, dan produk pertama. Admin memeriksa pengajuan, lalu toko Anda tayang di') + ' ' +
        'katalog. <b>' + I18N.t('Tidak ada biaya pendaftaran') + '</b> ' + I18N.t('— EXOCLEAN hanya mengambil komisi') + ' ' +
        I18N.t('8–15% dari setiap penjualan, sesuai kategori produk.'), '🏪') + '<div class="mb-3"></div>',
      fields: [
        { name: 'namaToko', label: I18N.t('Nama toko'), required: true,
          placeholder: 'mis. Bersih Jaya Supply', hint: I18N.t('Nama ini yang dilihat pembeli di katalog.') },
        { name: 'nama', label: I18N.t('Nama pemilik / penanggung jawab'), required: true,
          placeholder: 'Sesuai kartu identitas' },
        { name: 'telp', label: 'No. WhatsApp aktif', required: true, placeholder: '08xxxxxxxxxx',
          hint: I18N.t('Dipakai untuk pemberitahuan pesanan masuk.') },
        { name: 'email', label: I18N.t('Email'), type: 'email', required: true,
          hint: I18N.t('Sekaligus menjadi akun untuk masuk ke aplikasi.') },
        { name: 'kota', label: 'Kota gudang / pengiriman', required: true, placeholder: 'mis. Bandung' },
        { name: 'kategoriUtama', label: I18N.t('Kategori produk utama'), type: 'select', value: 'Chemical Pembersih',
          options: ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
                    'APD & Keselamatan Kerja', 'Consumable', 'Aksesoris'] },
        { name: 'deskripsi', label: I18N.t('Ceritakan singkat tentang toko Anda'), type: 'textarea', rows: 2,
          placeholder: I18N.t('Sejak kapan berjualan, spesialisasi, dan keunggulannya.') },
        { name: 'pass', label: I18N.t('Kata sandi'), type: 'password', required: true, hint: I18N.t('Minimal 6 karakter.') },
        { name: 'ulang', label: I18N.t('Ulangi kata sandi'), type: 'password', required: true },
        { name: 'pin', label: 'PIN transaksi (6 angka)', type: 'password', required: true,
          hint: I18N.t('Dipakai untuk mencairkan hasil penjualan. Berbeda dari kata sandi.') },
        { name: 'pinUlang', label: 'Ulangi PIN transaksi', type: 'password', required: true },
        { name: 'setuju', label: I18N.t('Saya menyatakan data di atas benar dan menyetujui skema komisi yang berlaku'),
          type: 'checkbox', value: false }
      ],
      validate: function (d) {
        if (!/^[0-9+\-\s]{9,18}$/.test(String(d.telp))) return I18N.t('Nomor WhatsApp tidak valid');
        if (String(d.pass).length < 6) return 'Kata sandi minimal 6 karakter';
        if (d.pass !== d.ulang) return I18N.t('Ulangan kata sandi tidak cocok');
        var salahPin = KEAMANAN.validPin(d.pin);
        if (salahPin) return salahPin;
        if (d.pin !== d.pinUlang) return I18N.t('Ulangan PIN tidak cocok');
        if (String(d.pin) === String(d.pass)) return I18N.t('PIN tidak boleh sama dengan kata sandi');
        if (!d.setuju) return I18N.t('Centang pernyataan di bagian bawah untuk melanjutkan');
        var ada = DB.all('users').filter(function (x) {
          return x.email.toLowerCase() === String(d.email).toLowerCase(); });
        if (ada.length) return I18N.t('Email sudah terdaftar — silakan masuk atau pakai email lain');
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      var u = DB.insert('users', {
        role: 'seller', nama: d.nama, telp: d.telp, email: String(d.email).toLowerCase(),
        aktif: true, foto: null, alamat: d.kota, alamatList: [], rekening: [],
        identitas: null, kontakDarurat: [], alamatTinggal: { kota: d.kota },
        toko: { nama: d.namaToko, deskripsi: d.deskripsi || '', logo: null, banner: null,
          kota: d.kota, alamatGudang: '', telpToko: d.telp, kategoriUtama: d.kategoriUtama,
          status: 'onboarding', bergabungAt: null, saldoIklan: 0 },
        preferensi: { bahasa: I18N.get(), notifWA: true, notifEmail: true, ringkasanMingguan: true }
      });
      KEAMANAN.pasangSandi(u.id, d.pass);
      KEAMANAN.pasangPin(u.id, d.pin);
      KEAMANAN.percayaiPerangkat(u.id, 'perangkat saat mendaftar');
      DB.log(u.id, 'Mendaftar sebagai Mitra Toko: ' + d.namaToko, 'seller', u.id);

      var admin = BIZ.usersByRole('admin')[0];
      if (admin) {
        DB.insert('waOutbox', { to: admin.id, template: 'manual', status: 'antre', sentAt: null,
          refType: 'seller', refId: u.id,
          pesan: (function () {
            var w = I18N.pesanUntuk(admin.id);
            return '*' + w('PENDAFTAR MITRA TOKO BARU') + '* 🏪\n\n' +
              d.namaToko + '\n' + d.nama + ' • ' + U.phoneDisplay(d.telp) + '\n' +
              w('Kota:') + ' ' + d.kota + '\n' +
              w('Kategori:') + ' ' + d.kategoriUtama + '\n\n' +
              w('Pantau kelengkapannya di menu Marketplace → Verifikasi Toko.');
          })() });
      }

      UI.modal({
        title: I18N.t('Toko Anda dibuat 🎉'), size: 'narrow',
        body: '<p>' + I18N.t('Selamat datang,') + ' <b>' + U.esc(d.namaToko) + '</b>!</p>' +
          '<p style="font-size:13px;color:var(--ink-2)">' + I18N.t('Empat langkah sebelum toko Anda tayang:') + '</p>' +
          '<ol class="pay-steps mt-2">' +
            '<li>' + I18N.t('Lengkapi profil toko &amp; alamat gudang') + '</li>' +
            '<li>Isi identitas penjual</li>' +
            '<li>' + I18N.t('Tambahkan rekening pencairan') + '</li>' +
            '<li>' + I18N.t('Daftarkan produk pertama Anda') + '</li>' +
          '</ol>' +
          UI.alert('info', I18N.t('Semua langkah ada di menu') + ' <b>' + I18N.t('Buka Toko') + '</b> ' + I18N.t('setelah Anda masuk.'), 'ℹ️'),
        foot: '<button class="btn btn--lg" data-act="masuk-toko">Masuk Sekarang</button>',
        actions: { 'masuk-toko': function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          APP.login(DB.find('users', u.id));
        } }
      });
    });
  }

  return { render: render, mount: mount, dialogDaftar: dialogDaftar, dialogDaftarToko: dialogDaftarToko };
})();
