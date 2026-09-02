/* ==========================================================================
   keamanan.js — PIN transaksi, authenticator (TOTP), dan pengenalan perangkat
   --------------------------------------------------------------------------
   Tiga lapis yang saling menutupi:

     1. KATA SANDI  — membuka aplikasi.
     2. PIN 6 ANGKA — dibuat saat mendaftar, dipakai khusus untuk menyetujui
                      perpindahan uang (penarikan saldo). Sengaja terpisah dari
                      kata sandi supaya sandi yang bocor tidak otomatis
                      berarti saldo bisa ditarik.
     3. AUTHENTICATOR — kode 6 digit berganti tiap 30 detik dari aplikasi
                      seperti Google Authenticator. Dipakai ketika aplikasi
                      dibuka di perangkat yang belum dikenal, dan sebagai satu-
                      satunya jalan memulihkan akun ketika email, kata sandi,
                      atau PIN terlupakan.

   PRINSIP YANG DIPEGANG
     • PIN dan kode pemulihan tidak pernah disimpan apa adanya — hanya turunan
       PBKDF2 ber-salt. Tidak ada layar mana pun yang bisa menampilkannya lagi.
     • Salah PIN dibatasi; setelah 5 kali gagal, PIN terkunci 15 menit.
     • Setiap peristiwa keamanan dicatat dan bisa dilihat pemilik akun.
     • Pemulihan tidak pernah bergantung pada email saja — selalu butuh
       authenticator atau kode pemulihan, karena email justru bagian yang
       mungkin sedang tidak bisa diakses.

   BATAS PROTOTIPE: semua pemeriksaan berjalan di browser. Pada produksi,
   verifikasi PIN, TOTP, dan kepercayaan perangkat wajib pindah ke server —
   yang di sini disiapkan adalah bentuk data dan alurnya.
   ========================================================================== */
var KEAMANAN = (function () {

  var KUNCI_PERANGKAT = RUANG.kunci('perangkat');
  var MAKS_GAGAL = 5;
  var KUNCI_MENIT = 15;
  var JUMLAH_PEMULIHAN = 8;
  var PUTARAN_PEMULIHAN = 2000;   /* kode pemulihan sudah berentropi tinggi */

  /* ================================================================ PERANGKAT */
  /** Identitas perangkat/browser ini. Dibuat sekali lalu disimpan. */
  function idPerangkat() {
    var id = null;
    try { id = localStorage.getItem(KUNCI_PERANGKAT); } catch (e) { /* storage diblokir */ }
    if (!id) {
      id = 'dev_' + KRIPTO.byte2hex(KRIPTO.acakByte(8));
      try { localStorage.setItem(KUNCI_PERANGKAT, id); } catch (e) {}
    }
    return id;
  }

  /** Ganti identitas perangkat — dipakai tombol simulasi "buka di HP lain". */
  function gantiPerangkat() {
    try { localStorage.removeItem(KUNCI_PERANGKAT); } catch (e) {}
    return idPerangkat();
  }

  /** Tebak nama perangkat dari user agent, sekadar untuk dikenali pemiliknya. */
  /**
   * Saat kejadian, LENGKAP dengan zonanya.
   *
   * Pemberitahuan keamanan gunanya satu: supaya pemiliknya bisa berkata
   * “bukan saya, saya sedang tidur jam itu”. Jam yang tertulis dalam zona
   * yang salah — atau berlabel WIB padahal dihitung di zona lain — merusak
   * satu-satunya hal yang membuat pesan ini berguna. Zonanya disebut,
   * bukan diasumsikan.
   */
  function saatKejadian() {
    var iso = U.nowISO();
    if (!window.ZONA) return U.tglJam(iso);
    var tz = ZONA.bawaan();
    /* Jam DAN tanggalnya dihitung di zona itu, bukan hanya labelnya.

       Baris ini sempat berbunyi `U.tglJam(iso) + ' ' + ZONA.singkat(tz)` —
       angkanya dari zona perangkat, labelnya dari zona bisnis. Pada korporat
       berzona Makassar yang perangkatnya di Jakarta, hasilnya “07.27 WITA”
       untuk kejadian yang sesungguhnya pukul 08.27 WITA: label yang benar
       menempel pada angka yang salah, dan itu justru lebih menyesatkan
       daripada tidak ada label sama sekali. */
    return U.tgl(ZONA.tgl(iso, tz)) + ' • ' + ZONA.jam(iso, tz) +
      ZONA.labelJam(tz);
  }

  function namaPerangkat() {
    var ua = navigator.userAgent || '';
    var sistem = /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone / iPad'
      : /Windows/i.test(ua) ? 'Windows'
      : /Mac OS X/i.test(ua) ? 'Mac'
      : /Linux/i.test(ua) ? 'Linux' : 'Perangkat lain';
    var peramban = /Edg\//i.test(ua) ? 'Edge'
      : /OPR\//i.test(ua) ? 'Opera'
      : /Chrome\//i.test(ua) ? 'Chrome'
      : /Firefox\//i.test(ua) ? 'Firefox'
      : /Safari\//i.test(ua) ? 'Safari' : 'Peramban';
    return peramban + ' di ' + sistem;
  }

  function daftarPerangkat(userId) {
    return U.sortBy(DB.where('perangkat', function (p) {
      return p.userId === userId && p.aktif !== false; }),
      function (p) { return p.terakhirAt || p.dipercayaAt; }, true);
  }

  function perangkatIni(userId) {
    var kode = idPerangkat();
    return DB.where('perangkat', function (p) {
      return p.userId === userId && p.kode === kode && p.aktif !== false; })[0] || null;
  }

  function dipercaya(userId) { return !!perangkatIni(userId); }

  /** Tandai perangkat ini sebagai dipercaya untuk satu pengguna. */
  function percayaiPerangkat(userId, catatan) {
    var ada = perangkatIni(userId);
    if (ada) { DB.update('perangkat', ada.id, { terakhirAt: U.nowISO() }); return ada; }
    var p = DB.insert('perangkat', {
      userId: userId, kode: idPerangkat(), nama: namaPerangkat(),
      ua: (navigator.userAgent || '').slice(0, 180),
      dipercayaAt: U.nowISO(), terakhirAt: U.nowISO(), aktif: true,
      catatan: catatan || ''
    });
    catat(userId, 'Perangkat dipercaya', 'ok', namaPerangkat());
    return p;
  }

  function sentuhPerangkat(userId) {
    var p = perangkatIni(userId);
    if (p) DB.update('perangkat', p.id, { terakhirAt: U.nowISO() });
  }

  function cabutPerangkat(id, olehId) {
    var p = DB.find('perangkat', id);
    if (!p) return { error: I18N.t('Perangkat tidak ditemukan') };
    if (p.kode === idPerangkat()) {
      return { error: I18N.t('Ini perangkat yang sedang Anda pakai. Cabut dari perangkat lain,') + ' ' +
        I18N.t('atau keluar dari aplikasi bila memang ingin mengakhiri sesi di sini.') };
    }
    DB.update('perangkat', id, { aktif: false, dicabutAt: U.nowISO() });
    catat(olehId || p.userId, 'Mencabut akses perangkat', 'ok', p.nama);
    return { ok: true };
  }

  function cabutSemuaPerangkatLain(userId) {
    var kode = idPerangkat(), n = 0;
    daftarPerangkat(userId).forEach(function (p) {
      if (p.kode !== kode) { DB.update('perangkat', p.id, { aktif: false, dicabutAt: U.nowISO() }); n++; }
    });
    if (n) catat(userId, 'Mencabut ' + n + ' perangkat lain', 'ok', '');
    return n;
  }

  /* ================================================================ CATATAN KEAMANAN */
  function catat(userId, aksi, hasil, ket) {
    DB.insert('keamananLog', {
      userId: userId, aksi: aksi, hasil: hasil || 'info',
      kode: idPerangkat(), perangkat: namaPerangkat(),
      ket: ket || '', at: U.nowISO()
    });
    var semua = DB.where('keamananLog', { userId: userId });
    if (semua.length > 60) {
      U.sortBy(semua, function (x) { return x.at; }).slice(0, semua.length - 60)
        .forEach(function (x) { DB.remove('keamananLog', x.id); });
    }
  }

  function riwayat(userId, batas) {
    return U.sortBy(DB.where('keamananLog', { userId: userId }),
      function (x) { return x.at; }, true).slice(0, batas || 20);
  }

  /** Pesan keamanan ke pemilik akun. Isinya bebas, jadi tidak lewat template. */
  function kabari(userId, pesan) {
    DB.insert('waOutbox', {
      to: userId, template: 'manual', pesan: pesan, status: 'antre',
      refType: 'user', refId: userId, sentAt: null
    });
  }

  /* ================================================================ KATA SANDI
     Akun lama dari data contoh masih menyimpan `pass` apa adanya. Begitu
     sandinya diubah lewat aplikasi, akun itu naik ke bentuk ber-hash dan
     `pass` dibuang — jadi datanya bermigrasi sendiri tanpa reset. */
  function periksaSandi(u, teks) {
    if (!u) return false;
    if (u.sandi) return KRIPTO.cocok(String(teks), u.sandi);
    return u.pass !== undefined && u.pass === String(teks);
  }

  function pasangSandi(userId, teks) {
    DB.update('users', userId, {
      sandi: KRIPTO.turunkan(String(teks)), pass: undefined,
      sandiDiubahAt: U.nowISO()
    });
    return DB.find('users', userId);
  }

  /* ================================================================ PIN */
  function punyaPin(u) { return !!(u && u.pin && u.pin.hash); }

  function sisaKunci(u) {
    if (!u || !u.pinKunciSampai) return 0;
    var sisa = new Date(u.pinKunciSampai).getTime() - Date.now();
    return sisa > 0 ? Math.ceil(sisa / 60000) : 0;
  }

  function validPin(pin) {
    var s = String(pin || '');
    if (!/^\d{6}$/.test(s)) return 'PIN harus 6 angka';
    if (/^(\d)\1{5}$/.test(s)) return I18N.t('PIN tidak boleh angka yang sama semua');
    if ('0123456789'.indexOf(s) >= 0 || '9876543210'.indexOf(s) >= 0) {
      return I18N.t('PIN tidak boleh angka berurutan');
    }
    return null;
  }

  /** Pasang PIN baru (saat mendaftar atau setelah pemulihan). */
  function pasangPin(userId, pin) {
    var salah = validPin(pin);
    if (salah) return { error: salah };
    var u = DB.find('users', userId);
    /* DB.find memulangkan RUJUKAN HIDUP: sesudah DB.update di bawah, `u` ikut
       berubah dan punyaPin(u) selalu benar. Akibatnya pembuatan PIN yang
       PERTAMA tercatat sebagai 'Mengubah PIN transaksi' — dan catatan
       keamanan yang mengatakan sesuatu berubah pada hari sesuatu itu baru
       dibuat adalah catatan yang menyesatkan orang yang memeriksanya. */
    var sudahAda = punyaPin(u);
    DB.update('users', userId, {
      pin: Object.assign(KRIPTO.turunkan(String(pin)), {
        dibuatAt: (u && u.pin && u.pin.dibuatAt) || U.nowISO(), diubahAt: U.nowISO() }),
      pinGagal: 0, pinKunciSampai: null
    });
    catat(userId, sudahAda ? 'Mengubah PIN transaksi' : 'Membuat PIN transaksi', 'ok', '');
    return { ok: true };
  }

  function gantiPin(userId, lama, baru) {
    var u = DB.find('users', userId);
    if (!punyaPin(u)) return { error: I18N.t('Akun ini belum punya PIN') };
    var p = periksaPin(userId, lama);
    if (!p.ok) return p;
    if (String(lama) === String(baru)) return { error: I18N.t('PIN baru harus berbeda dari yang lama') };
    return pasangPin(userId, baru);
  }

  /**
   * Periksa PIN sekaligus mengelola pembatasan percobaan.
   * Mengembalikan { ok } atau { error, sisaPercobaan?, terkunci? }.
   */
  function periksaPin(userId, pin) {
    var u = DB.find('users', userId);
    if (!u) return { error: I18N.t('Pengguna tidak ditemukan') };
    if (!punyaPin(u)) return { error: I18N.t('Akun ini belum punya PIN transaksi') };

    var kunci = sisaKunci(u);
    if (kunci) {
      return { error: I18N.t('PIN terkunci. Coba lagi dalam {n} menit.')
        .replace('{n}', kunci), terkunci: kunci };
    }

    if (KRIPTO.cocok(String(pin), u.pin)) {
      if (u.pinGagal) DB.update('users', userId, { pinGagal: 0, pinKunciSampai: null });
      catat(userId, 'PIN transaksi benar', 'ok', '');
      return { ok: true };
    }

    var gagal = (u.pinGagal || 0) + 1;
    if (gagal >= MAKS_GAGAL) {
      var sampai = new Date(Date.now() + KUNCI_MENIT * 60000).toISOString();
      DB.update('users', userId, { pinGagal: gagal, pinKunciSampai: sampai });
      catat(userId, 'PIN terkunci setelah ' + gagal + ' kali salah', 'gagal', namaPerangkat());
      kabari(userId,
        '*PERINGATAN KEAMANAN EXOCLEAN* 🔒\n\nPIN transaksi akun Anda terkunci ' +
          KUNCI_MENIT + ' menit setelah ' + gagal + ' kali salah dari ' + namaPerangkat() +
          '.\n\nBila ini bukan Anda, segera ganti kata sandi dan cabut perangkat asing di ' +
          'menu Profil → Keamanan.');
      return { error: I18N.t('PIN salah {n} kali. PIN dikunci {m} menit demi keamanan.')
        .replace('{n}', gagal).replace('{m}', KUNCI_MENIT),
        terkunci: KUNCI_MENIT };
    }

    DB.update('users', userId, { pinGagal: gagal });
    catat(userId, 'PIN transaksi salah', 'gagal', I18N.t('percobaan ke-') + gagal);
    return { error: I18N.t('PIN salah. Sisa {n} percobaan sebelum terkunci.')
      .replace('{n}', MAKS_GAGAL - gagal),
      sisaPercobaan: MAKS_GAGAL - gagal };
  }

  /* ================================================================ AUTHENTICATOR */
  function authAktif(u) { return !!(u && u.auth && u.auth.aktif && u.auth.rahasia); }

  /** Siapkan pemasangan: rahasia baru + URI yang di-QR-kan. Belum disimpan. */
  function siapkanAuth(u) {
    var rahasia = KRIPTO.rahasiaBaru();
    return { rahasia: rahasia, uri: KRIPTO.uriOtp(rahasia, u.email, 'EXOCLEAN') };
  }

  /**
   * Aktifkan setelah pengguna membuktikan aplikasinya sudah menyalin rahasia.
   * Kode pemulihan dikembalikan sekali ini saja — setelahnya hanya turunannya
   * yang tersimpan.
   */
  function aktifkanAuth(userId, rahasia, kode) {
    if (!KRIPTO.periksaTotp(rahasia, kode)) {
      catat(userId, I18N.t('Gagal memasang authenticator'), 'gagal', I18N.t('kode tidak cocok'));
      return { error: I18N.t('Kode tidak cocok. Pastikan jam ponsel Anda otomatis, lalu coba kode terbaru.') };
    }
    var polos = [], simpan = [];
    for (var i = 0; i < JUMLAH_PEMULIHAN; i++) {
      var k = KRIPTO.kodePemulihan();
      polos.push(k);
      simpan.push({ h: KRIPTO.turunkan(KRIPTO.normalKode(k), null, PUTARAN_PEMULIHAN), dipakaiAt: null });
    }
    DB.update('users', userId, {
      auth: { aktif: true, rahasia: rahasia, dipasangAt: U.nowISO(), terakhirAt: null,
        pemulihan: simpan }
    });
    percayaiPerangkat(userId, 'perangkat saat memasang authenticator');
    catat(userId, 'Mengaktifkan authenticator', 'ok', '');
    return { ok: true, kodePemulihan: polos };
  }

  function matikanAuth(userId, kode) {
    var u = DB.find('users', userId);
    if (!authAktif(u)) return { error: I18N.t('Authenticator belum aktif') };
    var p = periksaKode(userId, kode);
    if (!p.ok) return p;
    DB.update('users', userId, { auth: { aktif: false, rahasia: null, pemulihan: [] } });
    catat(userId, 'Menonaktifkan authenticator', 'ok', '');
    return { ok: true };
  }

  /**
   * Terima kode 6 digit dari authenticator ATAU satu kode pemulihan.
   * Kode pemulihan hangus setelah dipakai.
   */
  function periksaKode(userId, kode) {
    var u = DB.find('users', userId);
    if (!authAktif(u)) return { error: I18N.t('Authenticator belum aktif untuk akun ini') };
    var bersih = String(kode || '').trim();

    if (/^\d{6}$/.test(bersih.replace(/\s/g, ''))) {
      if (KRIPTO.periksaTotp(u.auth.rahasia, bersih.replace(/\s/g, ''))) {
        DB.update('users', userId, {
          auth: Object.assign({}, u.auth, { terakhirAt: U.nowISO() }) });
        return { ok: true, lewat: 'authenticator' };
      }
    }

    var norm = KRIPTO.normalKode(bersih);
    if (norm.length === 8) {
      var daftar = (u.auth.pemulihan || []).slice();
      for (var i = 0; i < daftar.length; i++) {
        if (!daftar[i].dipakaiAt && KRIPTO.cocok(norm, daftar[i].h)) {
          daftar[i] = Object.assign({}, daftar[i], { dipakaiAt: U.nowISO() });
          DB.update('users', userId, {
            auth: Object.assign({}, u.auth, { pemulihan: daftar, terakhirAt: U.nowISO() }) });
          catat(userId, 'Memakai kode pemulihan', 'ok',
            'sisa ' + sisaPemulihan(DB.find('users', userId)) + ' kode');
          return { ok: true, lewat: 'pemulihan', sisa: sisaPemulihan(DB.find('users', userId)) };
        }
      }
    }

    catat(userId, 'Kode verifikasi salah', 'gagal', namaPerangkat());
    return { error: I18N.t('Kode tidak cocok atau sudah pernah dipakai.') };
  }

  function sisaPemulihan(u) {
    if (!authAktif(u)) return 0;
    return (u.auth.pemulihan || []).filter(function (k) { return !k.dipakaiAt; }).length;
  }

  /** Terbitkan ulang seluruh kode pemulihan; yang lama langsung hangus. */
  function buatUlangPemulihan(userId, kode) {
    var p = periksaKode(userId, kode);
    if (!p.ok) return p;
    var u = DB.find('users', userId), polos = [], simpan = [];
    for (var i = 0; i < JUMLAH_PEMULIHAN; i++) {
      var k = KRIPTO.kodePemulihan();
      polos.push(k);
      simpan.push({ h: KRIPTO.turunkan(KRIPTO.normalKode(k), null, PUTARAN_PEMULIHAN), dipakaiAt: null });
    }
    DB.update('users', userId, { auth: Object.assign({}, u.auth, { pemulihan: simpan }) });
    catat(userId, 'Menerbitkan ulang kode pemulihan', 'ok', '');
    return { ok: true, kodePemulihan: polos };
  }

  /* ================================================================ MASUK & PERANGKAT BARU */
  /**
   * Apa yang harus diminta sebelum sesi dibuka di perangkat ini.
   *   'tidak-ada'    — perangkat sudah dikenal
   *   'authenticator'— perangkat baru & authenticator aktif
   *   'pin'          — perangkat baru, belum ada authenticator tapi ada PIN
   *   'pasang'       — perangkat baru & akun belum punya pengaman apa pun
   */
  function tantangan(u) {
    if (!u) return 'tidak-ada';
    if (dipercaya(u.id)) return 'tidak-ada';
    if (authAktif(u)) return 'authenticator';
    if (punyaPin(u)) return 'pin';
    return 'pasang';
  }

  /** Kabari pemilik akun bahwa akunnya dibuka di perangkat asing. */
  function kabariPerangkatBaru(u) {
    catat(u.id, 'Masuk dari perangkat baru', 'info', namaPerangkat());
    kabari(u.id,
      '*PEMBERITAHUAN KEAMANAN EXOCLEAN* 🔐\n\nAkun Anda baru saja dibuka dari perangkat ' +
        'baru:\n\n• Perangkat: ' + namaPerangkat() + '\n• Waktu: ' + saatKejadian() +
        '\n\nBila ini Anda, abaikan pesan ini. Bila bukan, segera ganti kata sandi dan cabut ' +
        'perangkat tersebut di menu Profil → Keamanan.');
  }

  /* ================================================================ PEMULIHAN AKUN */
  /** Cari akun dari nomor WhatsApp atau email — langkah pertama "lupa akun". */
  function cariAkun(kunci) {
    var k = String(kunci || '').trim().toLowerCase();
    var angka = k.replace(/\D/g, '');
    return DB.all('users').filter(function (u) {
      if (!u.aktif) return false;
      if (u.email && u.email.toLowerCase() === k) return true;
      return angka.length >= 8 && String(u.telp || '').replace(/\D/g, '').slice(-9) === angka.slice(-9);
    })[0] || null;
  }

  /** Email disamarkan supaya pengingatnya tidak sekaligus membocorkan alamat. */
  function samarkanEmail(email) {
    var s = String(email || ''), at = s.indexOf('@');
    if (at < 1) return s;
    var nama = s.slice(0, at), dom = s.slice(at + 1);
    var depan = nama.slice(0, Math.min(2, nama.length));
    return depan + new Array(Math.max(nama.length - 2, 1) + 1).join('•') + '@' + dom;
  }

  function resetSandi(userId, kode, sandiBaru) {
    if (!sandiBaru || String(sandiBaru).length < 6) {
      return { error: 'Kata sandi baru minimal 6 karakter' };
    }
    var p = periksaKode(userId, kode);
    if (!p.ok) return p;
    pasangSandi(userId, sandiBaru);
    cabutSemuaPerangkatLain(userId);
    percayaiPerangkat(userId, 'perangkat saat memulihkan kata sandi');
    catat(userId, 'Memulihkan kata sandi lewat authenticator', 'ok', '');
    return { ok: true };
  }

  /**
   * PIN dipulihkan dengan DUA bukti sekaligus: kode authenticator dan kata
   * sandi. Alasannya, PIN adalah gerbang terakhir sebelum uang berpindah.
   */
  function resetPin(userId, kode, sandi, pinBaru) {
    var u = DB.find('users', userId);
    if (!periksaSandi(u, sandi)) {
      catat(userId, I18N.t('Gagal memulihkan PIN'), 'gagal', 'kata sandi salah');
      return { error: 'Kata sandi salah' };
    }
    var p = periksaKode(userId, kode);
    if (!p.ok) return p;
    var r = pasangPin(userId, pinBaru);
    if (r.error) return r;
    DB.update('users', userId, { pinGagal: 0, pinKunciSampai: null });
    catat(userId, 'Memulihkan PIN lewat authenticator', 'ok', '');
    kabari(userId,
      '*PIN TRANSAKSI DIUBAH* 🔒\n\nPIN transaksi akun EXOCLEAN Anda baru saja diganti ' +
      'melalui pemulihan authenticator pada ' + saatKejadian() + '.\n\n' +
      'Bila bukan Anda yang melakukannya, segera hubungi admin EXOCLEAN.');
    return { ok: true };
  }

  /* ================================================================ RINGKASAN */
  /** Skor kesiapan keamanan sebuah akun, dipakai di halaman Profil. */
  function ringkasan(u) {
    var poin = [
      { k: 'sandi', l: 'Kata sandi tersimpan ber-hash', ok: !!u.sandi },
      { k: 'pin', l: 'PIN transaksi 6 angka', ok: punyaPin(u) },
      { k: 'auth', l: 'Authenticator aktif', ok: authAktif(u) },
      { k: 'pemulihan', l: 'Kode pemulihan tersisa', ok: sisaPemulihan(u) > 0 }
    ];
    var n = poin.filter(function (p) { return p.ok; }).length;
    return {
      poin: poin, terpenuhi: n, total: poin.length,
      persen: Math.round(n / poin.length * 100),
      tingkat: n >= 4 ? 'kuat' : n >= 2 ? 'cukup' : 'lemah'
    };
  }

  return {
    MAKS_GAGAL: MAKS_GAGAL, KUNCI_MENIT: KUNCI_MENIT, JUMLAH_PEMULIHAN: JUMLAH_PEMULIHAN,

    idPerangkat: idPerangkat, gantiPerangkat: gantiPerangkat, namaPerangkat: namaPerangkat,
    daftarPerangkat: daftarPerangkat, perangkatIni: perangkatIni, dipercaya: dipercaya,
    percayaiPerangkat: percayaiPerangkat, sentuhPerangkat: sentuhPerangkat,
    cabutPerangkat: cabutPerangkat, cabutSemuaPerangkatLain: cabutSemuaPerangkatLain,

    catat: catat, riwayat: riwayat,

    periksaSandi: periksaSandi, pasangSandi: pasangSandi,

    punyaPin: punyaPin, validPin: validPin, pasangPin: pasangPin, gantiPin: gantiPin,
    periksaPin: periksaPin, sisaKunci: sisaKunci,

    authAktif: authAktif, siapkanAuth: siapkanAuth, aktifkanAuth: aktifkanAuth,
    matikanAuth: matikanAuth, periksaKode: periksaKode, sisaPemulihan: sisaPemulihan,
    buatUlangPemulihan: buatUlangPemulihan,

    tantangan: tantangan, kabariPerangkatBaru: kabariPerangkatBaru,

    cariAkun: cariAkun, samarkanEmail: samarkanEmail,
    resetSandi: resetSandi, resetPin: resetPin,

    ringkasan: ringkasan
  };
})();
