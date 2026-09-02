/* ==========================================================================
   akun.js — pendaftaran mandiri, verifikasi OTP, dan masuk lewat akun sosial
   --------------------------------------------------------------------------
   EMPAT CARA MASUK
     • Email + kata sandi
     • Nomor HP + kata sandi
     • Akun Google
     • Akun Facebook

   ATURAN YANG DIPEGANG
     • Email DAN nomor HP wajib terverifikasi sebelum akun dibuat. Akunnya
       memang belum ada sampai kedua OTP benar — bukan dibuat lalu ditandai
       "belum verifikasi", supaya tidak ada akun setengah jadi yang menumpuk.
     • Mendaftar lewat Google/Facebook membuat emailnya langsung terverifikasi
       (penyedia sudah memverifikasinya), tetapi nomor HP tetap harus
       diverifikasi sendiri — penyedia tidak menjamin nomor.
     • Semua akun baru masuk sebagai KLIEN. Pilihan menjadi Mitra Lapangan,
       Mitra Toko, Affiliate, atau Dropshipper ada di halaman Profil, bukan di
       formulir pendaftaran.

   ====================== BATAS YANG HARUS DIKETAHUI ========================
   Pengiriman OTP dan pertukaran token OAuth TIDAK BISA dikerjakan dari
   browser saja:

     • SMS/WhatsApp OTP butuh gateway berbayar.
     • Verifikasi id_token Google dan access_token Facebook WAJIB dilakukan di
       server memakai client secret — menaruh secret di browser sama dengan
       membagikannya ke publik.

   Karena itu berkas ini punya dua mode, sama seperti modul pembayaran:

     'simulasi'  — bawaan. OTP ditampilkan di layar dengan label jelas, dan
                   pemilih akun Google/Facebook ditiru. Seluruh alur, batas
                   percobaan, dan bentuk datanya persis seperti aslinya.
     'nyata'     — dipakai bila Client ID/App ID diisi di Pengaturan. Aplikasi
                   memuat SDK resmi penyedia, lalu MENGIRIM tokennya ke
                   backend untuk diverifikasi. Endpoint backend-nya ada di
                   folder server/ dan harus dijalankan terpisah.
   ========================================================================== */
var AKUN = (function () {

  /* Client ID Google dan App ID Facebook adalah nilai PUBLIK — memang dirancang
     tampil di kode browser setiap situs yang memakainya, dan tidak memberi akses
     apa pun tanpa Secret pasangannya. Karena itu keduanya aman disimpan di sini.
     Client Secret / App Secret TIDAK PERNAH boleh menyusul ke berkas ini. */
  var BAWAAN = {
    mode: 'simulasi',
    googleClientId: '1000150545643-7pmcm24js7122ulo6a4ivv0ldj13bl54.apps.googleusercontent.com',
    facebookAppId: '1481779315926370',
    backendUrl: '',
    otpDetik: 300,        /* masa berlaku kode */
    otpJedaKirim: 60,     /* jeda sebelum boleh kirim ulang */
    otpMaksSalah: 5
  };

  function config() {
    return Object.assign({}, BAWAAN, (DB.raw.settings || {}).akun || {});
  }
  function simpanConfig(patch) {
    DB.raw.settings = DB.raw.settings || {};
    DB.raw.settings.akun = Object.assign({}, config(), patch);
    DB.save(true); DB.emit();
    return config();
  }
  /** Mode nyata hanya menyala bila identitas aplikasi benar-benar terisi. */
  function modeNyata() {
    var c = config();
    return c.mode === 'nyata' && !!c.backendUrl && (!!c.googleClientId || !!c.facebookAppId);
  }

  /* ================================================================ PENYEDIA */
  var PENYEDIA = {
    email:    { nama: 'Email', ikon: '✉️', warna: '#334155' },
    telp:     { nama: 'Nomor HP', ikon: '📱', warna: '#0EA5E9' },
    google:   { nama: 'Google', ikon: 'G', warna: '#DB4437' },
    facebook: { nama: 'Facebook', ikon: 'f', warna: '#1877F2' }
  };

  /* ================================================================ NORMALISASI */
  /** Nomor HP Indonesia → bentuk baku 628xxxxxxxxx supaya tidak ada duplikat. */
  function bakuTelp(t) {
    var s = String(t || '').replace(/[^\d+]/g, '');
    s = s.replace(/^\+/, '');
    if (s.indexOf('0') === 0) s = '62' + s.slice(1);
    else if (s.indexOf('62') !== 0 && s.length >= 9) s = '62' + s;
    return s;
  }
  function bakuEmail(e) { return String(e || '').trim().toLowerCase(); }

  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(bakuEmail(e)); }
  function validTelp(t) {
    var s = bakuTelp(t);
    return /^62[1-9]\d{7,12}$/.test(s);
  }

  /* ================================================================ PENCARIAN AKUN */
  function cariEmail(e) {
    var k = bakuEmail(e);
    return DB.all('users').filter(function (u) { return bakuEmail(u.email) === k; })[0] || null;
  }
  function cariTelp(t) {
    var k = bakuTelp(t);
    return DB.all('users').filter(function (u) { return bakuTelp(u.telp) === k; })[0] || null;
  }
  function cariSosial(provider, uid) {
    return DB.all('users').filter(function (u) {
      return (u.sosial || []).some(function (s) {
        return s.provider === provider && s.uid === uid; }); })[0] || null;
  }
  /** Satu kolom masuk untuk email maupun nomor HP. */
  /** Cari pengguna dari kode masuk (mis. MCK-4821). */
  function cariKode(teks) {
    var k = String(teks || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!k) return null;
    return DB.first('users', function (u) {
      return u.kodeMasuk &&
        String(u.kodeMasuk).replace(/[^A-Za-z0-9]/g, '').toUpperCase() === k;
    });
  }

  /**
   * Tiga bentuk identitas, bukan dua.
   *
   * Email dan nomor HP cukup untuk klien dan mitra. Tidak cukup untuk
   * petugas kebersihan gedung: sebagian tidak punya email sama sekali, dan
   * sebagian memakai nomor HP bergantian dengan keluarganya. Kode masuk
   * diberikan atasannya di atas kertas, bersama sandi sementara.
   */
  function cariIdentitas(teks) {
    var t = String(teks || '').trim();
    if (!t) return null;
    if (t.indexOf('@') >= 0) return cariEmail(t);
    return cariTelp(t) || cariKode(t) || cariEmail(t);
  }

  /* ================================================================ OTP */
  /* --------------------------------------------------------------- backend */
  function urlBackend(jalur) {
    return config().backendUrl.replace(/\/$/, '') + jalur;
  }

  /**
   * Versi mode nyata: seluruh urusan OTP dikerjakan server. Kodenya tidak
   * pernah sampai ke browser, dan jeda serta batas percobaannya juga
   * ditegakkan di sana — batas yang hanya ada di browser bisa dilewati siapa
   * pun yang membuka konsol.
   */
  function kirimOtpServer(jenis, tujuan) {
    var kunci = jenis === 'email' ? bakuEmail(tujuan) : bakuTelp(tujuan);
    return fetch(urlBackend('/api/auth/otp/kirim'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenis: jenis, tujuan: kunci })
    }).then(function (r) {
      return r.json().then(function (b) {
        if (!r.ok) throw new Error(b.error || I18N.t('Gagal mengirim kode'));
        return { ok: true, kode: null, tujuan: kunci,
                 berlakuDetik: b.berlakuDetik || config().otpDetik };
      });
    });
  }

  function periksaOtpServer(jenis, tujuan, kode) {
    var kunci = jenis === 'email' ? bakuEmail(tujuan) : bakuTelp(tujuan);
    return fetch(urlBackend('/api/auth/otp/periksa'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenis: jenis, tujuan: kunci, kode: kode })
    }).then(function (r) {
      return r.json().then(function (b) {
        if (!r.ok) return { error: b.error || 'Kode salah', sisa: b.sisa };
        return { ok: true };
      });
    }).catch(function () {
      return { error: I18N.t('Tidak bisa menghubungi server verifikasi') };
    });
  }

  /** Cek koneksi backend — dipakai tombol "Uji koneksi" di Pengaturan. */
  function ujiBackend(url) {
    var dasar = (url || config().backendUrl || '').replace(/\/$/, '');
    if (!dasar) return Promise.reject(new Error(I18N.t('Alamat backend belum diisi')));
    return fetch(dasar + '/api/auth/health').then(function (r) {
      if (!r.ok) throw new Error('Server menjawab ' + r.status);
      return r.json();
    });
  }

  /**
   * Kirim kode ke satu tujuan. Kode disimpan sebagai turunan ber-salt, bukan
   * angka polos — layar mana pun tidak bisa membacanya kembali kecuali mode
   * simulasi yang memang mengembalikannya sekali untuk ditampilkan.
   */
  function kirimOtp(jenis, tujuan, keperluan) {
    var c = config();
    var kunci = jenis === 'email' ? bakuEmail(tujuan) : bakuTelp(tujuan);
    if (jenis === 'email' && !validEmail(kunci)) return { error: I18N.t('Format email tidak valid') };
    if (jenis === 'telp' && !validTelp(kunci)) return { error: I18N.t('Nomor HP tidak valid. Contoh: 081234567890') };

    var lama = aktifOtp(jenis, kunci);
    if (lama) {
      var jeda = Math.ceil((c.otpJedaKirim * 1000 -
        (Date.now() - new Date(lama.kirimAt).getTime())) / 1000);
      if (jeda > 0) return { error: 'Tunggu ' + jeda + ' detik sebelum meminta kode baru', jeda: jeda };
      DB.remove('otp', lama.id);
    }

    var kode = '';
    KRIPTO.acakByte(6).forEach(function (b) { kode += String(b % 10); });

    var t = KRIPTO.turunkan(kode, null, 1500);
    var rec = DB.insert('otp', {
      jenis: jenis, tujuan: kunci, keperluan: keperluan || 'daftar',
      garam: t.garam, hash: t.hash, putaran: t.putaran,
      kirimAt: U.nowISO(),
      kedaluwarsa: new Date(Date.now() + c.otpDetik * 1000).toISOString(),
      percobaan: 0, terpakai: false
    });

    /* Nomor HP: pesan dititipkan ke antrean WhatsApp yang sudah ada, jadi
       admin bisa mengirimkannya manual selama gateway belum terpasang. */
    if (jenis === 'telp') {
      DB.insert('waOutbox', {
        to: null, telpLangsung: kunci, template: 'manual', status: 'antre', sentAt: null,
        refType: 'otp', refId: rec.id,
        /* Penerimanya BELUM punya akun — ini kode pendaftaran. Tidak ada
           preferensi bahasa yang bisa dibaca, jadi dipakai bahasa bawaan
           aplikasi. Itu satu-satunya tebakan yang jujur di sini. */
        pesan: (function () {
          var w = function (t) { return I18N.untuk(I18N.BAWAAN, t); };
          return '*' + w('KODE VERIFIKASI EXOCLEAN') + '*\n\n' + kode + '\n\n' +
            w('Berlaku {n} menit. Jangan berikan kode ini kepada siapa pun — termasuk yang mengaku petugas EXOCLEAN.')
              .replace('{n}', Math.round(c.otpDetik / 60));
        })()
      });
    }

    DB.log(null, 'Mengirim OTP ' + jenis + ' ke ' + samarkan(jenis, kunci), 'otp', rec.id);

    /* Kode hanya dikembalikan pada mode simulasi. Pada mode nyata ia dikirim
       oleh backend dan tidak pernah sampai ke browser. */
    return { ok: true, id: rec.id, kode: modeNyata() ? null : kode, tujuan: kunci,
             berlakuDetik: c.otpDetik };
  }

  function aktifOtp(jenis, tujuan) {
    var kunci = jenis === 'email' ? bakuEmail(tujuan) : bakuTelp(tujuan);
    return U.sortBy(DB.where('otp', function (o) {
      return o.jenis === jenis && o.tujuan === kunci && !o.terpakai &&
        new Date(o.kedaluwarsa).getTime() > Date.now();
    }), function (o) { return o.kirimAt; }, true)[0] || null;
  }

  function periksaOtp(jenis, tujuan, kode) {
    var c = config();
    var rec = aktifOtp(jenis, tujuan);
    if (!rec) return { error: I18N.t('Kode sudah kedaluwarsa. Minta kode baru.') };
    if (rec.percobaan >= c.otpMaksSalah) {
      return { error: 'Terlalu banyak percobaan. Minta kode baru.' };
    }
    var bersih = String(kode || '').replace(/\D/g, '');
    if (bersih.length !== 6) return { error: 'Kode harus 6 angka' };

    if (KRIPTO.cocok(bersih, { garam: rec.garam, hash: rec.hash, putaran: rec.putaran })) {
      DB.update('otp', rec.id, { terpakai: true, verifikasiAt: U.nowISO() });
      return { ok: true };
    }
    /* Angka dibaca DULU: DB.update memutasi objek yang sama dengan `rec`,
       jadi membacanya setelah update memberi hitungan yang meleset satu. */
    var terpakai = rec.percobaan + 1;
    DB.update('otp', rec.id, { percobaan: terpakai });
    var sisa = Math.max(0, c.otpMaksSalah - terpakai);
    return { error: 'Kode salah.' + (sisa > 0 ? ' Sisa ' + sisa + ' percobaan.' : ' Minta kode baru.'),
             sisa: sisa };
  }

  /** Samarkan tujuan saat ditampilkan, supaya tidak bocor di layar bersama. */
  function samarkan(jenis, tujuan) {
    if (jenis === 'email') return KEAMANAN.samarkanEmail(tujuan);
    var s = bakuTelp(tujuan);
    return s.slice(0, 4) + new Array(Math.max(s.length - 7, 1) + 1).join('•') + s.slice(-3);
  }

  /* ================================================================ MASUK LEWAT SOSIAL
     Pada mode nyata, aliran yang benar:

       1. SDK penyedia memberi id_token (Google) / access_token (Facebook)
       2. Token DIKIRIM KE BACKEND, bukan diurai di browser
       3. Backend memverifikasi tanda tangannya ke penyedia, lalu mengembalikan
          profil yang sudah dipercaya
       4. Barulah aplikasi membuat/mencocokkan akun

     Menguraikan JWT di browser tanpa verifikasi tanda tangan TIDAK AMAN —
     siapa pun bisa mengarang token. Karena itu langkah 2–3 tidak boleh
     dilewati, dan mode simulasi tidak berpura-pura melakukannya. */
  /* Tiga akun contoh sengaja mewakili tiga keadaan yang berbeda, supaya semua
     cabang alurnya bisa dicoba:
       • sudah tertaut       → langsung masuk
       • emailnya cocok      → ditautkan otomatis lalu masuk
       • sama sekali baru    → lanjut ke pendaftaran (tetap verifikasi HP) */
  var AKUN_SIMULASI = [
    { provider: 'google', uid: 'g-500110', nama: 'Lestari Wijaya',
      email: 'lestari@sinarmandiri.co.id', foto: null, catatan: 'sudah tertaut' },
    { provider: 'google', uid: 'g-108422', nama: 'Andi Kurniawan',
      email: 'andi.k@gmail.com', foto: null, catatan: 'email cocok, belum tertaut' },
    { provider: 'google', uid: 'g-771903', nama: 'Maya Puspita',
      email: 'maya.baru@gmail.com', foto: null, catatan: 'akun baru' },
    { provider: 'facebook', uid: 'f-550281', nama: 'Rizky Ananda',
      email: 'rizky.ananda@gmail.com', foto: null, catatan: 'email cocok, belum tertaut' },
    { provider: 'facebook', uid: 'f-990734', nama: 'Bagas Wicaksono',
      email: 'bagas.baru@gmail.com', foto: null, catatan: 'akun baru' }
  ];

  function akunSimulasi(provider) {
    return AKUN_SIMULASI.filter(function (a) { return a.provider === provider; });
  }

  /**
   * Tukar token penyedia menjadi profil terpercaya.
   * Mode simulasi: profil diambil dari daftar contoh.
   * Mode nyata: dikirim ke backend untuk diverifikasi.
   */
  function tukarToken(provider, token) {
    var c = config();
    if (!modeNyata()) {
      return Promise.reject(new Error(I18N.t('Mode simulasi tidak menukar token sungguhan')));
    }
    void c;
    return fetch(urlBackend('/api/auth/' + provider), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    }).then(function (r) {
      return r.json().then(function (b) {
        if (!r.ok) throw new Error(b.error || 'Verifikasi ' + provider + ' ditolak server');
        return b;
      });
    });
  }

  /* ================================================================ PEMBUATAN AKUN */
  /**
   * Buat akun baru. Dipanggil hanya setelah email dan nomor HP terverifikasi —
   * pemanggil wajib menyertakan buktinya, dan fungsi ini memeriksanya lagi.
   */
  function buatAkun(d) {
    var email = bakuEmail(d.email), telp = bakuTelp(d.telp);

    if (!d.nama || d.nama.trim().length < 3) return { error: I18N.t('Nama lengkap wajib diisi') };
    if (!validEmail(email)) return { error: I18N.t('Format email tidak valid') };
    if (!validTelp(telp)) return { error: I18N.t('Nomor HP tidak valid') };
    if (!d.emailTerverifikasi) return { error: I18N.t('Email belum terverifikasi') };
    if (!d.telpTerverifikasi) return { error: I18N.t('Nomor HP belum terverifikasi') };
    if (cariEmail(email)) return { error: I18N.t('Email sudah terdaftar') };
    if (cariTelp(telp)) return { error: I18N.t('Nomor HP sudah terdaftar') };
    if (!d.sosial && (!d.sandi || String(d.sandi).length < 6)) {
      return { error: 'Kata sandi minimal 6 karakter' };
    }

    var u = DB.insert('users', {
      role: 'client',                       /* semua akun baru mulai sebagai klien */
      nama: d.nama.trim(), email: email, telp: telp,
      emailVerifiedAt: U.nowISO(), telpVerifiedAt: U.nowISO(),
      sosial: d.sosial ? [{ provider: d.sosial.provider, uid: d.sosial.uid,
        email: bakuEmail(d.sosial.email), tautAt: U.nowISO() }] : [],
      metodeDaftar: d.sosial ? d.sosial.provider : 'email',
      aktif: true, foto: null, perusahaan: d.perusahaan || '',
      alamat: '', alamatList: [], rekening: [],
      preferensi: { bahasa: I18N.get(), notifWA: true, notifEmail: true, ringkasanMingguan: true },
      referrerKode: d.referrerKode || null
    });

    if (!d.sosial) KEAMANAN.pasangSandi(u.id, d.sandi);
    KEAMANAN.percayaiPerangkat(u.id, 'perangkat saat mendaftar');
    KEAMANAN.catat(u.id, 'Akun dibuat lewat ' + (d.sosial ? d.sosial.provider : 'email'), 'ok', '');
    DB.log(u.id, 'Mendaftar sebagai pengguna baru', 'user', u.id);

    /* rujukan afiliasi dicatat setelah akun ada, bukan sebelumnya */
    if (d.referrerKode && window.AFILIASI) AFILIASI.catatPendaftaran(d.referrerKode, u.id);

    DB.insert('waOutbox', {
      to: u.id, template: 'manual', status: 'antre', sentAt: null,
      refType: 'user', refId: u.id,
      pesan: (function () {
        var w = I18N.pesanUntuk(u.id);
        return '*' + w('SELAMAT DATANG DI EXOCLEAN') + '* 👋\n\n' +
          w('Halo {nama}, akun Anda sudah aktif.').replace('{nama}', u.nama) + '\n\n' +
          w('Anda bisa langsung memesan layanan kebersihan dan berbelanja perlengkapan.') + '\n\n' +
          w('Ingin lebih? Di menu *Profil* Anda bisa mendaftar menjadi Mitra Lapangan, Mitra Toko, Affiliate, atau Dropshipper.');
      })()
    });
    return { ok: true, user: DB.find('users', u.id) };
  }

  /** Tautkan akun sosial ke akun yang sudah ada (dari halaman Profil). */
  function tautkanSosial(userId, profil) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    var dipakai = cariSosial(profil.provider, profil.uid);
    if (dipakai && dipakai.id !== userId) {
      return { error: 'Akun ' + PENYEDIA[profil.provider].nama + ' ' + I18N.t('itu sudah tertaut ke pengguna lain') };
    }
    var list = (u.sosial || []).filter(function (s) { return s.provider !== profil.provider; });
    list.push({ provider: profil.provider, uid: profil.uid,
      email: bakuEmail(profil.email), tautAt: U.nowISO() });
    DB.update('users', userId, { sosial: list });
    KEAMANAN.catat(userId, 'Menautkan akun ' + PENYEDIA[profil.provider].nama, 'ok', profil.email);
    return { ok: true };
  }

  function lepasSosial(userId, provider) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    /* jangan sampai pengguna kehilangan seluruh cara masuk */
    if (!u.sandi && !u.pass && (u.sosial || []).length <= 1) {
      return { error: I18N.t('Ini satu-satunya cara Anda masuk. Buat kata sandi dulu sebelum melepasnya.') };
    }
    DB.update('users', userId, {
      sosial: (u.sosial || []).filter(function (s) { return s.provider !== provider; }) });
    KEAMANAN.catat(userId, 'Melepas tautan akun ' + PENYEDIA[provider].nama, 'ok', '');
    return { ok: true };
  }

  /* ================================================================ MASUK */
  /**
   * Masuk dengan email/nomor HP + kata sandi.
   * Pesan galat sengaja tidak membedakan "akun tidak ada" dan "sandi salah",
   * supaya halaman masuk tidak bisa dipakai menebak siapa saja yang terdaftar.
   */
  function masuk(identitas, sandi) {
    var u = cariIdentitas(identitas);
    if (!u || !KEAMANAN.periksaSandi(u, sandi)) {
      if (u) KEAMANAN.catat(u.id, 'Kata sandi salah saat masuk', 'gagal', KEAMANAN.namaPerangkat());
      return { error: I18N.t('Email, nomor HP, atau kode masuk salah — atau kata sandinya keliru') };
    }
    if (!u.aktif) return { error: 'Akun dinonaktifkan. Hubungi admin EXOCLEAN.' };
    return { ok: true, user: u };
  }

  function statusVerifikasi(u) {
    return {
      email: !!(u && (u.emailVerifiedAt || u.emailVerified)),
      telp: !!(u && (u.telpVerifiedAt || u.telpVerified)),
      sosial: (u && u.sosial || []).map(function (s) { return s.provider; })
    };
  }

  /** Cara masuk yang dimiliki satu akun — ditampilkan di Profil → Keamanan. */
  function caraMasuk(u) {
    var out = [];
    if (u.sandi || u.pass !== undefined) {
      out.push({ provider: 'email', label: u.email });
      if (u.telp) out.push({ provider: 'telp', label: U.phoneDisplay(u.telp) });
    }
    (u.sosial || []).forEach(function (s) {
      out.push({ provider: s.provider, label: s.email || '—', sejak: s.tautAt }); });
    return out;
  }

  /* ================================================================ PREFERENSI & SANDI
     Dulu keempatnya tinggal di js/biz.js. Itu berarti sebuah aplikasi harus
     membawa seluruh modul pasar — katalog, order, invoice, toko — hanya
     untuk bisa membaca bahasa pilihan penggunanya atau mengganti sandinya.

     Dipindahkan APA ADANYA, dan BIZ meneruskan ke sini, supaya seluruh
     pemanggil BIZ yang sudah ada tetap berjalan tanpa satu pun diubah. */

  function preferensi(u) {
    var bawaan = (window.I18N && I18N.BAWAAN) || 'en';
    return Object.assign({ bahasa: bawaan, notifWA: true, notifEmail: false, ringkasanMingguan: false },
      (u && u.preferensi) || {});
  }

  function simpanPreferensi(userId, patch) {
    var u = DB.find('users', userId);
    DB.update('users', userId, { preferensi: Object.assign(preferensi(u), patch) });
    return DB.find('users', userId);
  }

  /** Ubah kata sandi. Mengembalikan pesan kesalahan, atau null bila berhasil. */
  function gantiSandi(userId, lama, baru, ulang) {
    var u = DB.find('users', userId);
    if (!u) return I18N.t('Pengguna tidak ditemukan');
    if (!KEAMANAN.periksaSandi(u, lama)) return I18N.t('Kata sandi saat ini salah');
    if (!baru || baru.length < 6) return 'Kata sandi baru minimal 6 karakter';
    if (baru !== ulang) return I18N.t('Ulangan kata sandi tidak cocok');
    if (baru === lama) return I18N.t('Kata sandi baru harus berbeda dari yang lama');
    /* disimpan sebagai turunan PBKDF2 — akun contoh ikut naik bentuk di sini */
    KEAMANAN.pasangSandi(userId, baru);
    KEAMANAN.catat(userId, 'Mengubah kata sandi', 'ok', '');
    DB.log(userId, 'Mengubah kata sandi', 'user', userId);
    return null;
  }

  function usersByRole(role) { return DB.where('users', { role: role, aktif: true }); }

  return {
    preferensi: preferensi, simpanPreferensi: simpanPreferensi,
    gantiSandi: gantiSandi, usersByRole: usersByRole,
    BAWAAN: BAWAAN, PENYEDIA: PENYEDIA,
    config: config, simpanConfig: simpanConfig, modeNyata: modeNyata,
    bakuTelp: bakuTelp, bakuEmail: bakuEmail, validEmail: validEmail, validTelp: validTelp,
    cariEmail: cariEmail, cariTelp: cariTelp, cariSosial: cariSosial, cariIdentitas: cariIdentitas,
    kirimOtp: kirimOtp, periksaOtp: periksaOtp, aktifOtp: aktifOtp, samarkan: samarkan,
    kirimOtpServer: kirimOtpServer, periksaOtpServer: periksaOtpServer, ujiBackend: ujiBackend,
    akunSimulasi: akunSimulasi, tukarToken: tukarToken,
    buatAkun: buatAkun, tautkanSosial: tautkanSosial, lepasSosial: lepasSosial,
    masuk: masuk, statusVerifikasi: statusVerifikasi, caraMasuk: caraMasuk
  };
})();
