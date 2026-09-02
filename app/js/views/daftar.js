/* ==========================================================================
   views/daftar.js — pendaftaran mandiri & masuk (email, HP, Google, Facebook)
   --------------------------------------------------------------------------
   Pendaftaran berjalan sebagai LANGKAH BERURUTAN, dan akunnya baru benar-benar
   dibuat pada langkah terakhir:

     1. Data diri  — nama, email, nomor HP
     2. Verifikasi email  (OTP 6 angka)
     3. Verifikasi nomor HP (OTP 6 angka)
     4. Kata sandi → akun dibuat

   Berhenti di tengah jalan tidak meninggalkan akun setengah jadi: tidak ada
   yang tersimpan sampai langkah 4 selesai.

   Mendaftar lewat Google/Facebook melompati langkah 1–2 (email sudah
   diverifikasi penyedia) tetapi TETAP melewati langkah 3 — penyedia tidak
   menjamin nomor HP.
   ========================================================================== */
var ViewDaftar = (function () {

  var T = function (s) { return I18N.t(s); };

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }
  function tutupSemua() {
    document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
    document.body.style.overflow = '';
  }

  /* ================================================================ TOMBOL SOSIAL */
  function tombolSosial() {
    return '<div class="sos-row">' +
        '<button class="btn btn--sos btn--block" data-act="sos-google">' +
          '<span class="sos-ic sos-ic--g">G</span> ' + T('Lanjutkan dengan Google') + '</button>' +
        '<button class="btn btn--sos btn--block" data-act="sos-facebook">' +
          '<span class="sos-ic sos-ic--f">f</span> ' + T('Lanjutkan dengan Facebook') + '</button>' +
      '</div>' +
      (AKUN.modeNyata() ? '' :
        '<div class="tbl-sub" style="text-align:center;margin-top:8px">🧪 ' +
        T('Mode simulasi — pemilih akun ditiru, tidak menghubungi Google/Facebook.') + '</div>') +
      '<div class="pemisah"><span>' + T('atau') + '</span></div>';
  }

  /**
   * Pemilih akun sosial.
   * Mode nyata: memuat SDK penyedia lalu mengirim tokennya ke backend untuk
   * diverifikasi — token TIDAK PERNAH dipercaya di sisi browser.
   * Mode simulasi: menampilkan daftar akun contoh dengan label jelas.
   */
  function pilihAkunSosial(provider) {
    return new Promise(function (resolve) {
      if (AKUN.modeNyata()) {
        UI.toast(T('Menghubungi') + ' ' + AKUN.PENYEDIA[provider].nama + '…', 'info');
        mulaiSdk(provider).then(function (token) {
          return AKUN.tukarToken(provider, token);
        }).then(function (profil) {
          resolve(Object.assign({ provider: provider }, profil));
        }).catch(function (e) {
          UI.toast(e.message || T('Gagal menghubungi penyedia'), 'err');
          resolve(null);
        });
        return;
      }

      var daftar = AKUN.akunSimulasi(provider);
      var selesai = false;
      var tutupModal = UI.modal({
        title: T('Pilih akun') + ' ' + AKUN.PENYEDIA[provider].nama,
        sub: T('Mode simulasi — meniru layar pemilih akun'), size: 'narrow',
        body: UI.alert('warn', '<b>' + T('Ini simulasi.') + '</b> ' +
            T('Aplikasi tidak menghubungi Google maupun Facebook. Untuk mengaktifkan yang ' +
              'sungguhan, isi Client ID / App ID dan alamat backend di Pengaturan → Akun & Login.'),
            '🧪') +
          '<div class="pilih-list mt-3">' + daftar.map(function (a) {
            return '<button class="pilih-item" data-act="pakai" data-uid="' + U.esc(a.uid) + '">' +
              UI.avatar(a.nama, 'sm') +
              '<div><b>' + U.esc(a.nama) + '</b><small>' + U.esc(a.email) +
                (a.catatan ? ' • ' + U.esc(a.catatan) : '') + '</small></div>' +
              '<span class="go">›</span></button>';
          }).join('') + '</div>',
        foot: '<button class="btn btn--ghost" data-act="batal">' + T('Batal') + '</button>',
        onMount: function (root) {
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !selesai) {
              selesai = true; resolve(null);
            }
          });
        },
        actions: {
          pakai: function (el) {
            var uid = el.getAttribute('data-uid');
            var a = daftar.filter(function (x) { return x.uid === uid; })[0];
            selesai = true; tutupModal(); resolve(a);
          },
          batal: function () { selesai = true; tutupModal(); resolve(null); }
        }
      });
    });
  }

  /**
   * Muat SDK penyedia dan ambil tokennya. Hanya dipakai pada mode nyata.
   * TIDAK PERNAH DIUJI di lingkungan ini karena belum ada Client ID terdaftar
   * dan origin-nya harus didaftarkan lebih dulu di konsol penyedia.
   */
  function mulaiSdk(provider) {
    var c = AKUN.config();
    return new Promise(function (resolve, reject) {
      if (provider === 'google') {
        muatSkrip('https://accounts.google.com/gsi/client').then(function () {
          if (!window.google || !google.accounts) return reject(new Error(T('SDK Google gagal dimuat')));
          google.accounts.id.initialize({
            client_id: c.googleClientId,
            callback: function (res) {
              if (res && res.credential) resolve(res.credential);
              else reject(new Error(T('Google tidak mengembalikan kredensial')));
            }
          });
          google.accounts.id.prompt();
        }).catch(reject);
        return;
      }
      /* Facebook menolak seluruh metode Login-nya dari halaman http sejak
         2018, termasuk di localhost. Diperiksa DI SINI supaya pengguna
         mendapat sebab yang benar — tanpa ini, SDK-nya gagal diam-diam dan
         yang muncul hanya "Login Facebook dibatalkan", yang membuat orang
         mengira mereka salah menekan tombol. */
      if (location.protocol !== 'https:') {
        return reject(new Error(
          T('Login Facebook memerlukan HTTPS. Halaman ini dibuka lewat') + ' ' +
          location.protocol + '// — Facebook memblokirnya sejak 2018, termasuk ' +
          T('di localhost. Jalankan aplikasi lewat HTTPS atau terowongan seperti') + ' ' +
          T('ngrok, lalu daftarkan alamatnya di Facebook Developers.')));
      }
      muatSkrip('https://connect.facebook.net/en_US/sdk.js').then(function () {
        if (!window.FB) return reject(new Error(T('SDK Facebook gagal dimuat')));
        FB.init({ appId: c.facebookAppId, cookie: true, xfbml: false, version: 'v19.0' });
        FB.login(function (res) {
          if (res.authResponse && res.authResponse.accessToken) resolve(res.authResponse.accessToken);
          else reject(new Error('Login Facebook dibatalkan'));
        }, { scope: 'public_profile,email' });
      }).catch(reject);
    });
  }

  function muatSkrip(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = document.createElement('script');
      s.src = src; s.async = true; s.defer = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(T('Tidak bisa memuat') + ' ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ================================================================ LANGKAH OTP */
  /**
   * Kotak verifikasi OTP. Promise berisi true bila kodenya benar.
   * `jenis` = 'email' | 'telp'
   */
  function langkahOtp(jenis, tujuan, opsi) {
    opsi = opsi || {};
    /* Mode nyata menyerahkan pengiriman ke backend; mode simulasi mengerjakan
       semuanya di sini. Bentuk balikannya sengaja sama supaya layar di bawah
       tidak perlu tahu bedanya. */
    var mulai = AKUN.modeNyata()
      ? AKUN.kirimOtpServer(jenis, tujuan).catch(function (e) { return { error: e.message }; })
      : Promise.resolve(AKUN.kirimOtp(jenis, tujuan, opsi.keperluan || 'daftar'));

    return mulai.then(function (kirim) { return tampilkanOtp(jenis, tujuan, opsi, kirim); });
  }

  function tampilkanOtp(jenis, tujuan, opsi, kirim) {
    return new Promise(function (resolve) {
      if (kirim.error) { UI.toast(kirim.error, 'err'); resolve(false); return; }

      var selesai = false, jamMundur = null;
      var label = jenis === 'email' ? T('email') : T('nomor HP');

      var tutupModal = UI.modal({
        title: T('Verifikasi') + ' ' + label,
        sub: T('Kode 6 angka dikirim ke') + ' ' + AKUN.samarkan(jenis, tujuan),
        size: 'narrow',
        body: '<div data-kotak-sim>' + kotakSimulasi(kirim.kode) + '</div>' +
          ViewKeamanan.kotakPin('otp', null,
            T('Kode berlaku') + ' ' + Math.round(kirim.berlakuDetik / 60) + ' ' + T('menit') + '.') +
          '<div class="row" style="justify-content:center;gap:6px">' +
            '<span class="tbl-sub">' + T('Tidak menerima kode?') + '</span>' +
            '<a href="#" class="tautan-kecil" data-act="kirim-ulang">' +
            T('Kirim ulang') + ' <span data-hitung></span></a>' +
          '</div>',
        foot: '<button class="btn btn--ghost" data-act="batal">' + T('Batal') + '</button>' +
              '<button class="btn" data-act="ok">' + T('Verifikasi') + '</button>',
        onMount: function (root) {
          ViewKeamanan.hidupkanPin(root, function () { root.querySelector('[data-act="ok"]').focus(); });
          jamMundur = mulaiHitung(root, AKUN.config().otpJedaKirim);
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !selesai) {
              selesai = true; clearInterval(jamMundur); resolve(false);
            }
          });
        },
        actions: {
          ok: function (el) {
            var root = el.closest('.modal');
            var kode = ViewKeamanan.bacaPin(root, 'otp');
            if (kode.length !== 6) { UI.toast(T('Lengkapi 6 angka'), 'err'); return; }
            var tombol = root.querySelector('[data-act="ok"]');
            tombol.disabled = true;

            var uji = AKUN.modeNyata()
              ? AKUN.periksaOtpServer(jenis, tujuan, kode)
              : Promise.resolve(AKUN.periksaOtp(jenis, tujuan, kode));

            uji.then(function (hasil) {
              tombol.disabled = false;
              if (!hasil.ok) {
                UI.toast(hasil.error, 'err');
                ViewKeamanan.kosongkanPin(root, 'otp');
                return;
              }
              selesai = true; clearInterval(jamMundur); tutupModal(); resolve(true);
            });
          },
          'kirim-ulang': function (el) {
            var root = el.closest('.modal');
            var lagi = AKUN.modeNyata()
              ? AKUN.kirimOtpServer(jenis, tujuan).catch(function (e) { return { error: e.message }; })
              : Promise.resolve(AKUN.kirimOtp(jenis, tujuan, opsi.keperluan || 'daftar'));

            lagi.then(function (r) {
              if (r.error) { UI.toast(r.error, 'err'); return; }
              root.querySelector('[data-kotak-sim]').innerHTML = kotakSimulasi(r.kode);
              ViewKeamanan.kosongkanPin(root, 'otp');
              clearInterval(jamMundur);
              jamMundur = mulaiHitung(root, AKUN.config().otpJedaKirim);
              UI.toast(T('Kode baru dikirim'), 'ok');
            });
          },
          batal: function () { selesai = true; clearInterval(jamMundur); tutupModal(); resolve(false); }
        }
      });
    });
  }

  /** Kode hanya tampil pada mode simulasi, dan selalu berlabel jelas. */
  function kotakSimulasi(kode) {
    if (!kode) return '';
    return '<div class="demo-otp"><span class="demo-otp__cap">🧪 ' + T('Simulasi') + '</span>' +
      '<b>' + U.esc(kode) + '</b><small>' + T('kode ini dikirim SMS pada mode nyata') +
      '</small></div>';
  }

  function mulaiHitung(root, detik) {
    var sisa = detik;
    var tautan = root.querySelector('[data-act="kirim-ulang"]');
    var span = root.querySelector('[data-hitung]');
    function gambar() {
      if (!document.body.contains(root)) return;
      if (sisa > 0) {
        tautan.style.pointerEvents = 'none'; tautan.style.opacity = '.5';
        span.textContent = '(' + sisa + 's)';
      } else {
        tautan.style.pointerEvents = ''; tautan.style.opacity = '';
        span.textContent = '';
      }
      sisa--;
    }
    gambar();
    return setInterval(gambar, 1000);
  }

  /* ================================================================ PENDAFTARAN */
  function dialogDaftar(prefil) {
    prefil = prefil || {};
    var sosial = prefil.sosial || null;

    UI.formModal({
      title: sosial ? T('Lengkapi pendaftaran') : T('Buat Akun EXOCLEAN'),
      size: 'narrow',
      okText: T('Lanjut — Verifikasi'),
      intro: (sosial
          ? UI.alert('ok', T('Terhubung sebagai') + ' <b>' + U.esc(sosial.email) + '</b> ' +
              T('melalui') + ' ' + AKUN.PENYEDIA[sosial.provider].nama + '. ' +
              T('Email Anda sudah terverifikasi — tinggal nomor HP.'), '✅')
          : UI.alert('info', T('Email dan nomor HP akan diverifikasi dengan kode. Akun baru dibuat ' +
              'setelah keduanya terbukti milik Anda.'), 'ℹ️')) +
        (rujukan()
          ? UI.alert('brand', T('Anda mendaftar lewat undangan') + ' <b>' +
              U.esc(rujukan()) + '</b>.', '🤝')
          : '') +
        '<div class="mb-3"></div>',
      fields: [
        { name: 'nama', label: T('Nama lengkap'), required: true,
          value: sosial ? sosial.nama : (prefil.nama || '') },
        { name: 'email', label: T('Email'), type: 'email', required: true,
          value: sosial ? sosial.email : (prefil.email || ''),
          hint: sosial ? T('Dari akun ') + AKUN.PENYEDIA[sosial.provider].nama : '' },
        { name: 'telp', label: T('Nomor HP aktif'), required: true, placeholder: '08xxxxxxxxxx',
          value: prefil.telp || '', hint: T('Dipakai untuk verifikasi dan pemberitahuan pesanan.') }
      ],
      validate: function (d) {
        if (String(d.nama).trim().length < 3) return T('Nama lengkap wajib diisi');
        if (!AKUN.validEmail(d.email)) return T('Format email tidak valid');
        if (!AKUN.validTelp(d.telp)) return T('Nomor HP tidak valid. Contoh: 081234567890');
        if (AKUN.cariEmail(d.email)) return T('Email sudah terdaftar — silakan masuk');
        if (AKUN.cariTelp(d.telp)) return T('Nomor HP sudah terdaftar — silakan masuk');
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      lanjutVerifikasi(d, sosial);
    });
  }

  /** Langkah 2 & 3: verifikasi email lalu nomor HP. */
  function lanjutVerifikasi(d, sosial) {
    var emailSudah = !!sosial;      /* penyedia sudah memverifikasi emailnya */

    var langkahEmail = emailSudah
      ? Promise.resolve(true)
      : langkahOtp('email', d.email, { keperluan: 'daftar' });

    langkahEmail.then(function (okEmail) {
      if (!okEmail) {
        UI.toast(T('Pendaftaran dihentikan — email belum terverifikasi.'), 'warn');
        return;
      }
      return langkahOtp('telp', d.telp, { keperluan: 'daftar' }).then(function (okTelp) {
        if (!okTelp) {
          UI.toast(T('Pendaftaran dihentikan — nomor HP belum terverifikasi.'), 'warn');
          return;
        }
        if (sosial) return simpanAkun(d, sosial, null);
        return langkahSandi(d);
      });
    });
  }

  /** Langkah 4: kata sandi, lalu akun dibuat. */
  function langkahSandi(d) {
    return UI.formModal({
      title: T('Buat kata sandi'), size: 'narrow', okText: T('Selesaikan Pendaftaran'),
      intro: UI.alert('ok', '<b>' + T('Email dan nomor HP Anda terverifikasi.') + '</b> ' +
        T('Tinggal satu langkah lagi.'), '✅') + '<div class="mb-3"></div>',
      fields: [
        { name: 'sandi', label: T('Kata sandi'), type: 'password', required: true,
          hint: T('Minimal 6 karakter.') },
        { name: 'ulang', label: T('Ulangi kata sandi'), type: 'password', required: true }
      ],
      validate: function (s) {
        if (String(s.sandi).length < 6) return T('Kata sandi minimal 6 karakter');
        if (s.sandi !== s.ulang) return T('Ulangan kata sandi tidak cocok');
        return null;
      }
    }).then(function (s) {
      if (!s) { UI.toast(T('Pendaftaran belum selesai — kata sandi belum dibuat.'), 'warn'); return; }
      simpanAkun(d, null, s.sandi);
    });
  }

  function simpanAkun(d, sosial, sandi) {
    var hasil = AKUN.buatAkun({
      nama: d.nama, email: d.email, telp: d.telp,
      emailTerverifikasi: true, telpTerverifikasi: true,
      sosial: sosial, sandi: sandi,
      referrerKode: rujukan()
    });
    if (hasil.error) { UI.toast(hasil.error, 'err'); return; }

    UI.modal({
      title: T('Akun Anda siap 🎉'), size: 'narrow',
      body: '<div class="sukses-ikon">✅</div>' +
        '<p style="text-align:center">' + T('Selamat datang,') + ' <b>' +
          U.esc(hasil.user.nama) + '</b>!</p>' +
        UI.alert('info', T('Anda masuk sebagai <b>Klien</b> — bisa langsung memesan layanan dan ' +
          'berbelanja perlengkapan.'), 'ℹ️') +
        UI.alert('brand', T('Ingin lebih? Di menu <b>Profil</b> Anda bisa mendaftar menjadi ' +
          '<b>Mitra Lapangan</b>, <b>Mitra Toko</b>, <b>Affiliate</b>, atau <b>Dropshipper</b> — ' +
          'kapan saja, tanpa membuat akun baru.'), '🚀'),
      foot: '<button class="btn btn--lg" data-act="masuk-baru">' + T('Mulai') + '</button>',
      actions: { 'masuk-baru': function (el) {
        tutup(el);
        APP.login(DB.find('users', hasil.user.id));
      } }
    });
  }

  /* ================================================================ MASUK */
  function dialogMasukSosial(provider) {
    pilihAkunSosial(provider).then(function (profil) {
      if (!profil) return;
      var u = AKUN.cariSosial(provider, profil.uid) || AKUN.cariEmail(profil.email);
      if (u) {
        if (!u.aktif) { UI.toast(T('Akun dinonaktifkan. Hubungi admin EXOCLEAN.'), 'err'); return; }
        /* akun ada tapi belum tertaut — tautkan sekarang */
        if (!AKUN.cariSosial(provider, profil.uid)) AKUN.tautkanSosial(u.id, profil);
        KEAMANAN.catat(u.id, 'Masuk lewat ' + AKUN.PENYEDIA[provider].nama, 'ok', profil.email);
        masukDenganPemeriksaan(DB.find('users', u.id));
        return;
      }
      /* belum punya akun — lanjut ke pendaftaran dengan data dari penyedia */
      dialogDaftar({ sosial: profil });
    });
  }

  function masukDenganPemeriksaan(u) {
    tutupSemua();
    ViewKeamanan.tantanganPerangkat(u).then(function (boleh) {
      if (!boleh) { UI.toast(T('Verifikasi dibatalkan — Anda belum masuk.'), 'warn'); return; }
      APP.login(DB.find('users', u.id));
    });
  }

  /* Rujukan afiliasi milik aplikasi pasar. MCS EXOCLEAN tidak memuat
     modulnya, jadi layar pendaftaran yang sama harus tetap hidup tanpa
     afiliasi: tanpa modulnya, tidak ada rujukan — bukan galat. */
  function rujukan() {
    return (window.AFILIASI && AFILIASI.ambilRujukan()) || '';
  }

  /* ================================================================ RUJUKAN DARI URL */
  /** Baca ?ref= dan penanda objek dari alamat, lalu bersihkan alamatnya. */
  function bacaParameter() {
    var q = new URLSearchParams(location.search);
    var ref = q.get('ref');
    if (ref && window.AFILIASI) {
      AFILIASI.simpanRujukan(ref);
      AFILIASI.catatKlik(ref);
    }
    var out = { ref: ref, produk: q.get('produk'), layanan: q.get('layanan') };
    if (ref || out.produk || out.layanan) {
      /* alamat dirapikan supaya kode rujukan tidak ikut tersalin saat pengguna
         membagikan ulang alamat dari bilah alamat */
      history.replaceState({}, '', location.origin + location.pathname + location.hash);
    }
    return out;
  }

  /* ================================================================ SETELAN (ADMIN)
     Halaman ini hanya menyimpan identitas PUBLIK aplikasi — Client ID dan
     App ID. Client Secret / App Secret tidak pernah boleh masuk ke sini:
     apa pun yang tersimpan di browser sama saja dengan diumumkan. Kolomnya
     menolak nilai yang terlihat seperti secret, sama seperti setelan gateway
     pembayaran. */
  function renderSetelan() {
    var c = AKUN.config();
    var nyata = AKUN.modeNyata();

    return UI.alert(nyata ? 'ok' : 'warn',
        nyata
          ? '<b>' + T('Mode nyata aktif.') + '</b> ' + T('Aplikasi memanggil backend untuk ' +
            'memverifikasi token Google/Facebook dan mengirim OTP.')
          : '<b>' + T('Mode simulasi.') + '</b> ' + T('OTP tampil di layar dan pemilih akun ' +
            'Google/Facebook ditiru. Seluruh alur dan batasnya sama dengan aslinya — hanya ' +
            'pengirimannya yang belum nyata.'),
        nyata ? '🔐' : '🧪') +

      '<div class="grid g-2 mt-3">' +
        UI.card({ title: '🔑 ' + T('Identitas aplikasi'),
          sub: T('Hanya nilai publik — Client Secret tidak pernah disimpan di sini'),
          body: UI.field({ name: 'mode', label: T('Mode'), type: 'select', value: c.mode,
              options: [{ value: 'simulasi', label: T('Simulasi (tanpa backend)') },
                        { value: 'nyata', label: T('Nyata (butuh backend berjalan)') }] }) +
            UI.field({ name: 'googleClientId', label: 'Google Client ID', value: c.googleClientId,
              placeholder: 'xxxx-xxxx.apps.googleusercontent.com',
              hint: T('Google Cloud Console → Credentials → OAuth client ID (Web application). ' +
                'Daftarkan juga origin aplikasi ini pada Authorized JavaScript origins.') }) +
            UI.field({ name: 'facebookAppId', label: 'Facebook App ID', value: c.facebookAppId,
              placeholder: '1234567890123456',
              hint: T('developers.facebook.com → My Apps → Facebook Login.') }) +
            UI.field({ name: 'backendUrl', label: T('Alamat backend autentikasi'),
              value: c.backendUrl, placeholder: 'https://api.exoclean.id',
              hint: T('Jalankan folder server/ dengan perintah npm run start:auth.') }) +
            UI.alert('danger', '<b>' + T('Jangan pernah menempelkan') + ' Client Secret ' +
              T('atau') + ' App Secret ' + T('di sini.') + '</b> ' +
              T('Keduanya hanya boleh ada di berkas .env pada server. Kolom di atas menolak ' +
                'nilai yang terlihat seperti secret.'), '🚫'),
          foot: '<button class="btn btn--ghost" data-act="uji-backend">🔌 ' +
            T('Uji koneksi') + '</button><div class="spacer"></div>' +
            '<button class="btn" data-act="simpan-akun">' + T('Simpan') + '</button>' }) +

        UI.card({ title: '⏱️ ' + T('Ketentuan OTP'),
          sub: T('Pada mode nyata, angka ini juga harus diatur di .env server'),
          body: '<div class="grid g-2">' +
              UI.field({ name: 'otpDetik', label: T('Masa berlaku kode (detik)'), type: 'number',
                value: c.otpDetik }) +
              UI.field({ name: 'otpJedaKirim', label: T('Jeda kirim ulang (detik)'), type: 'number',
                value: c.otpJedaKirim }) +
              UI.field({ name: 'otpMaksSalah', label: T('Maksimal salah'), type: 'number',
                value: c.otpMaksSalah }) +
            '</div>' +
            UI.alert('info', T('Batas yang hanya ada di browser bisa dilewati siapa pun yang ' +
              'membuka konsol. Karena itu pada mode nyata seluruh batas ini ditegakkan ulang ' +
              'oleh server — angka di sini hanya menyamakan tampilannya.'), 'ℹ️') +
            '<div class="mt-3">' + Panel.seksi(T('Cara masuk yang tersedia'),
              '<div class="cek-list cek-list--tegak">' +
                '<span class="cek on">✓ ' + T('Email + kata sandi') + '</span>' +
                '<span class="cek on">✓ ' + T('Nomor HP + kata sandi') + '</span>' +
                '<span class="cek' + (c.googleClientId ? ' on' : '') + '">' +
                  (c.googleClientId ? '✓' : '○') + ' Google' +
                  (c.googleClientId ? '' : ' — ' + T('Client ID belum diisi')) + '</span>' +
                '<span class="cek' + (c.facebookAppId ? ' on' : '') + '">' +
                  (c.facebookAppId ? '✓' : '○') + ' Facebook' +
                  (c.facebookAppId ? '' : ' — ' + T('App ID belum diisi')) + '</span>' +
              '</div>') + '</div>',
          foot: '<div class="spacer"></div><button class="btn" data-act="simpan-otp">' +
            T('Simpan') + '</button>' }) +
      '</div>';
  }

  function aksiSetelan(root) {
    U.delegate(root, AKSES.lindungi({
      'simpan-akun': function (el) {
        var f = U.readForm(el.closest('.card'));
        /* Penjaga yang sama seperti setelan gateway pembayaran. */
        var mencurigakan = ['googleClientId', 'facebookAppId', 'backendUrl'].filter(function (k) {
          return /secret|client[_-]?secret|app[_-]?secret/i.test(String(f[k] || '')); });
        if (mencurigakan.length) {
          UI.toast(T('Nilai itu terlihat seperti secret. Secret hanya boleh ada di .env server.'),
            'err');
          return;
        }
        if (f.mode === 'nyata' && !f.backendUrl) {
          UI.toast(T('Mode nyata butuh alamat backend'), 'err'); return;
        }
        if (f.mode === 'nyata' && !f.googleClientId && !f.facebookAppId) {
          UI.toast(T('Isi minimal satu Client ID / App ID untuk mode nyata'), 'err'); return;
        }
        AKUN.simpanConfig({
          mode: f.mode, googleClientId: String(f.googleClientId || '').trim(),
          facebookAppId: String(f.facebookAppId || '').trim(),
          backendUrl: String(f.backendUrl || '').trim()
        });
        DB.log(APP.user.id, 'Mengubah setelan Akun & Login', 'setting', 'akun');
        UI.toast(T('Setelan akun disimpan'), 'ok');
        APP.refresh();
      },
      'simpan-otp': function (el) {
        var f = U.readForm(el.closest('.card'));
        AKUN.simpanConfig({
          otpDetik: Math.max(60, Number(f.otpDetik) || 300),
          otpJedaKirim: Math.max(15, Number(f.otpJedaKirim) || 60),
          otpMaksSalah: Math.max(3, Number(f.otpMaksSalah) || 5)
        });
        UI.toast(T('Ketentuan OTP disimpan'), 'ok');
        APP.refresh();
      },
      'uji-backend': function (el) {
        var f = U.readForm(el.closest('.card'));
        if (!f.backendUrl) { UI.toast(T('Isi alamat backend dulu'), 'err'); return; }
        UI.toast(T('Menghubungi backend…'), 'info');
        AKUN.ujiBackend(f.backendUrl).then(function (h) {
          UI.modal({
            title: T('Backend terhubung'), size: 'narrow',
            body: UI.alert('ok', T('Server autentikasi menjawab.'), '✅') +
              '<dl class="kv mt-3">' +
                '<dt>Google</dt><dd>' + (h.google ? '✅ ' + T('Client ID terpasang')
                  : '⚠️ ' + T('belum diisi di .env')) + '</dd>' +
                '<dt>Facebook</dt><dd>' + (h.facebook ? '✅ ' + T('App ID & Secret terpasang')
                  : '⚠️ ' + T('belum diisi di .env')) + '</dd>' +
                '<dt>' + T('Pengirim SMS') + '</dt><dd>' + U.esc(h.sms) + '</dd>' +
                '<dt>' + T('Pengirim email') + '</dt><dd>' + U.esc(h.email) + '</dd>' +
              '</dl>' +
              (h.siapProduksi
                ? UI.alert('ok', T('Kedua pengirim sudah memakai gateway sungguhan.'), '🚀')
                : UI.alert('warn', T('Salah satu pengirim masih "log" — kode hanya tercetak di ' +
                    'konsol server, belum benar-benar terkirim ke pengguna.'), '⚠️')),
            foot: '<button class="btn" data-close>' + T('Tutup') + '</button>'
          });
        }).catch(function (e) {
          UI.toast(T('Tidak bisa menghubungi backend') + ': ' + e.message, 'err');
        });
      }
    }, {
      'simpan-akun': 'sistem.akun', 'simpan-otp': 'sistem.akun'
    }));
  }

  var pagesAdmin = {
    setelanAkun: {
      label: 'Akun & Login', icon: '🔑', grup: 'Sistem',
      sub: 'Google, Facebook, dan verifikasi OTP',
      render: renderSetelan, mount: aksiSetelan
    }
  };

  return {
    tombolSosial: tombolSosial, pilihAkunSosial: pilihAkunSosial,
    langkahOtp: langkahOtp, dialogDaftar: dialogDaftar,
    dialogMasukSosial: dialogMasukSosial, masukDenganPemeriksaan: masukDenganPemeriksaan,
    bacaParameter: bacaParameter, pagesAdmin: pagesAdmin
  };
})();
