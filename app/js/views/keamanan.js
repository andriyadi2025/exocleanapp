/* ==========================================================================
   views/keamanan.js — layar PIN, authenticator, perangkat, dan pemulihan
   --------------------------------------------------------------------------
   Semua dialog di sini mengembalikan Promise, supaya bisa dipakai sebagai
   gerbang di depan aksi lain:

       ViewKeamanan.mintaPin({ judul: '…' }).then(function (pin) {
         if (!pin) return;            // pengguna membatalkan
         …lanjutkan aksinya…
       });

   Kotak PIN dibuat sebagai enam kotak terpisah karena itu yang dikenali orang
   dari aplikasi dompet digital — dan angkanya tetap disembunyikan.
   ========================================================================== */
var ViewKeamanan = (function () {

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

  /* ================================================================ KOTAK PIN */
  function kotakPin(nama, label, petunjuk) {
    var i, kotak = '';
    for (i = 0; i < 6; i++) {
      kotak += '<input class="pinbox" type="password" inputmode="numeric" maxlength="1" ' +
        'autocomplete="off" data-pin="' + nama + '" data-i="' + i + '" aria-label="' +
        T('Angka ke-') + (i + 1) + '">';
    }
    return '<div class="field">' +
      (label ? '<label>' + U.esc(label) + '</label>' : '') +
      '<div class="pinrow" data-pinrow="' + nama + '">' + kotak + '</div>' +
      (petunjuk ? '<div class="hint">' + petunjuk + '</div>' : '') +
      '</div>';
  }

  /** Perilaku enam kotak: maju sendiri, mundur saat hapus, terima tempel. */
  function hidupkanPin(root, onLengkap) {
    var rows = root.querySelectorAll('[data-pinrow]');
    Array.prototype.forEach.call(rows, function (row) {
      var box = row.querySelectorAll('.pinbox');

      function isi(teks) {
        var angka = String(teks).replace(/\D/g, '').slice(0, 6), i;
        for (i = 0; i < 6; i++) box[i].value = angka[i] || '';
        (box[Math.min(angka.length, 5)] || box[5]).focus();
        if (angka.length === 6 && onLengkap) onLengkap(row.getAttribute('data-pinrow'));
      }

      Array.prototype.forEach.call(box, function (b, i) {
        b.addEventListener('input', function () {
          b.value = b.value.replace(/\D/g, '').slice(0, 1);
          if (b.value && box[i + 1]) box[i + 1].focus();
          if (nilaiPin(row).length === 6 && onLengkap) onLengkap(row.getAttribute('data-pinrow'));
        });
        b.addEventListener('keydown', function (ev) {
          if (ev.key === 'Backspace' && !b.value && box[i - 1]) { box[i - 1].focus(); ev.preventDefault(); }
          if (ev.key === 'ArrowLeft' && box[i - 1]) box[i - 1].focus();
          if (ev.key === 'ArrowRight' && box[i + 1]) box[i + 1].focus();
        });
        b.addEventListener('paste', function (ev) {
          ev.preventDefault();
          isi((ev.clipboardData || window.clipboardData).getData('text'));
        });
      });
    });
    var pertama = root.querySelector('.pinbox');
    if (pertama) setTimeout(function () { pertama.focus(); }, 60);
  }

  function nilaiPin(row) {
    return Array.prototype.map.call(row.querySelectorAll('.pinbox'),
      function (b) { return b.value; }).join('');
  }
  function bacaPin(root, nama) {
    var row = root.querySelector('[data-pinrow="' + nama + '"]');
    return row ? nilaiPin(row) : '';
  }
  function kosongkanPin(root, nama) {
    var row = root.querySelector('[data-pinrow="' + nama + '"]');
    if (!row) return;
    Array.prototype.forEach.call(row.querySelectorAll('.pinbox'), function (b) { b.value = ''; });
    row.querySelector('.pinbox').focus();
  }

  /* ================================================================ MINTA PIN (gerbang aksi) */
  /**
   * Tampilkan tantangan PIN. Promise berisi string PIN bila benar, atau null
   * bila dibatalkan. PIN-nya sendiri tetap diverifikasi ulang oleh pemanggil
   * (DOMPET.ajukan) — dialog ini hanya lapisan tampilan.
   */
  function mintaPin(opsi) {
    opsi = opsi || {};
    var u = APP.user;
    return new Promise(function (resolve) {
      var selesai = false;

      if (!KEAMANAN.punyaPin(u)) {
        UI.toast(T('Buat PIN transaksi dulu di Profil → Keamanan'), 'err');
        resolve(null); return;
      }
      var kunci = KEAMANAN.sisaKunci(u);
      if (kunci) {
        UI.toast(T('PIN terkunci. Coba lagi dalam {n} menit.')
          .replace('{n}', kunci), 'err');
        resolve(null); return;
      }

      var tutupModal = UI.modal({
        title: opsi.judul || T('Masukkan PIN transaksi'),
        sub: opsi.sub || T('PIN 6 angka yang Anda buat saat mendaftar'),
        size: 'narrow',
        body: (opsi.rincian || '') +
          kotakPin('pin', null,
            T('Jangan pernah memberitahukan PIN ini kepada siapa pun, termasuk yang mengaku admin EXOCLEAN.')) +
          '<div class="row" style="justify-content:center">' +
            '<a href="#" class="tautan-kecil" data-act="lupa-pin">' + T('Lupa PIN?') + '</a></div>',
        foot: '<button class="btn btn--ghost" data-act="batal">' + T('Batal') + '</button>' +
              '<button class="btn" data-act="ok">' + T('Lanjutkan') + '</button>',
        onMount: function (root) {
          hidupkanPin(root, function () { root.querySelector('[data-act="ok"]').focus(); });
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !selesai) {
              selesai = true; resolve(null);
            }
          });
        },
        actions: {
          ok: function (el) {
            var root = el.closest('.modal');
            var pin = bacaPin(root, 'pin');
            if (pin.length !== 6) { UI.toast(T('Lengkapi 6 angka PIN'), 'err'); return; }
            var cek = KEAMANAN.periksaPin(u.id, pin);
            if (!cek.ok) {
              UI.toast(cek.error, 'err');
              kosongkanPin(root, 'pin');
              if (cek.terkunci) { selesai = true; tutupModal(); resolve(null); }
              APP.perbaruiSesi(DB.find('users', u.id));
              return;
            }
            selesai = true; tutupModal(); resolve(pin);
          },
          batal: function () { selesai = true; tutupModal(); resolve(null); },
          'lupa-pin': function (el) {
            selesai = true; tutup(el); resolve(null);
            dialogLupaPin(u);
          }
        }
      });
    });
  }

  /* ================================================================ BUAT / UBAH PIN */
  function dialogPin(mode) {
    var u = APP.user;
    var ubah = mode === 'ubah' && KEAMANAN.punyaPin(u);

    UI.modal({
      title: ubah ? T('Ubah PIN transaksi') : T('Buat PIN transaksi'),
      sub: T('6 angka, dipakai setiap kali menarik saldo'), size: 'narrow',
      body: UI.alert('brand', T('PIN berbeda dari kata sandi. Kata sandi membuka aplikasi, ' +
          'PIN menyetujui perpindahan uang — jadi sandi yang bocor tidak otomatis berarti ' +
          'saldo Anda bisa ditarik orang lain.'), '🔐') +
        '<div class="mt-3">' +
        (ubah ? kotakPin('lama', T('PIN saat ini')) : '') +
        kotakPin('baru', T('PIN baru')) +
        kotakPin('ulang', T('Ulangi PIN baru'),
          T('Hindari tanggal lahir, angka berurutan, atau angka yang sama semua.')) +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="simpan">' + T('Simpan PIN') + '</button>',
      onMount: function (root) { hidupkanPin(root); },
      actions: {
        simpan: function (el) {
          var root = el.closest('.modal');
          var baru = bacaPin(root, 'baru'), ulang = bacaPin(root, 'ulang');
          if (baru !== ulang) { UI.toast(T('Ulangan PIN tidak cocok'), 'err'); return; }
          var hasil = ubah
            ? KEAMANAN.gantiPin(u.id, bacaPin(root, 'lama'), baru)
            : KEAMANAN.pasangPin(u.id, baru);
          if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
          APP.perbaruiSesi(DB.find('users', u.id));
          UI.toast(ubah ? T('PIN berhasil diubah') : T('PIN transaksi aktif'), 'ok');
          tutup(el); APP.refresh();
        }
      }
    });
  }

  /* ================================================================ AUTHENTICATOR */
  function dialogSetupAuth() {
    var u = APP.user;
    var siap = KEAMANAN.siapkanAuth(u);

    UI.modal({
      title: T('Pasang Authenticator'), sub: u.email, size: 'wide',
      body: '<div class="auth2-grid">' +
          '<div class="auth2-qr">' + QR.svg(siap.uri, { ukuran: 208, alt: 'QR authenticator' }) + '</div>' +
          '<div>' +
            '<ol class="pay-steps">' +
              '<li>' + T('Buka aplikasi authenticator di ponsel Anda — Google Authenticator, ' +
                'Microsoft Authenticator, Authy, atau bawaan pengelola kata sandi.') + '</li>' +
              '<li>' + T('Pilih "Tambah akun" lalu pindai kode QR di samping.') + '</li>' +
              '<li>' + T('Masukkan 6 angka yang muncul di aplikasi tersebut ke kotak di bawah.') + '</li>' +
            '</ol>' +
            '<div class="mt-3"><div class="tbl-sub">' + T('Tidak bisa memindai? Ketik kunci ini:') +
              '</div><div class="kunci-otp">' + U.esc(KRIPTO.rapikanRahasia(siap.rahasia)) + '</div></div>' +
            '<div class="mt-3">' + kotakPin('kode', T('Kode dari authenticator')) + '</div>' +
          '</div>' +
        '</div>' +
        UI.alert('warn', T('Pastikan jam ponsel Anda diatur otomatis. Kode ini dihitung dari waktu, ' +
          'jadi jam yang meleset lebih dari satu menit akan membuat kodenya selalu ditolak.'), '⏰'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Nanti saja') + '</button>' +
            '<button class="btn" data-act="aktif">' + T('Aktifkan') + '</button>',
      onMount: function (root) { hidupkanPin(root); },
      actions: {
        aktif: function (el) {
          var root = el.closest('.modal');
          var hasil = KEAMANAN.aktifkanAuth(u.id, siap.rahasia, bacaPin(root, 'kode'));
          if (hasil.error) { UI.toast(hasil.error, 'err'); kosongkanPin(root, 'kode'); return; }
          APP.perbaruiSesi(DB.find('users', u.id));
          tutup(el);
          dialogKodePemulihan(hasil.kodePemulihan, true);
        }
      }
    });
  }

  /** Layar kode pemulihan — hanya muncul sekali, karena setelah ini hanya hash-nya yang ada. */
  function dialogKodePemulihan(kode, baru) {
    var teks = kode.join('\n');
    UI.modal({
      title: T('Simpan kode pemulihan Anda'), size: 'narrow',
      body: (baru ? UI.alert('ok', T('Authenticator aktif. Akun Anda sekarang terlindungi kode ' +
          'yang berganti tiap 30 detik.'), '✅') : '') +
        UI.alert('warn', T('Ini satu-satunya kesempatan melihat kode ini. Simpan di tempat aman — ' +
          'kode inilah jalan masuk Anda bila ponsel authenticator hilang atau rusak. ' +
          'Setiap kode hanya bisa dipakai satu kali.'), '⚠️') +
        '<div class="kode-pulih">' + kode.map(function (k) {
          return '<span>' + U.esc(k) + '</span>'; }).join('') + '</div>',
      foot: '<button class="btn btn--ghost" data-act="salin">📋 ' + T('Salin') + '</button>' +
            '<button class="btn btn--ghost" data-act="unduh">⬇️ ' + T('Unduh') + '</button>' +
            '<button class="btn" data-act="sudah">' + T('Sudah saya simpan') + '</button>',
      actions: {
        salin: function () {
          if (navigator.clipboard) navigator.clipboard.writeText(teks);
          UI.toast(T('Kode disalin'), 'ok');
        },
        unduh: function () {
          var blob = new Blob([I18N.t('KODE PEMULIHAN EXOCLEAN') + '\n' +
            U.tglPanjang(U.today()) + '\n\n' + teks + '\n\n' +
            I18N.t('Setiap kode hanya bisa dipakai satu kali.')],
            { type: 'text/plain' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'kode-pemulihan-exoclean.txt';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        },
        sudah: function (el) { tutup(el); APP.refresh(); }
      }
    });
  }

  /**
   * Tantangan kode authenticator. Promise berisi true bila lolos.
   * Dipakai saat masuk dari perangkat baru dan pada setiap alur pemulihan.
   */
  /**
   * Petunjuk khusus akun contoh: menampilkan kode yang sedang berlaku supaya
   * alur authenticator bisa dicoba tanpa memasang aplikasinya dulu. Hanya
   * muncul untuk akun bawaan data contoh — akun yang dipasang sendiri lewat
   * aplikasi tidak pernah punya penanda `demo`.
   */
  function petunjukDemo(userId) {
    var u = DB.find('users', userId);
    if (!u || !u.auth || !u.auth.demo) return '';
    return '<div class="demo-otp" data-demo-otp>' +
      '<span class="demo-otp__cap">🧪 ' + T('Akun contoh') + '</span>' +
      '<b data-otp-kode>' + KRIPTO.totp(u.auth.rahasia) + '</b>' +
      '<small>' + T('berganti dalam') + ' <span data-otp-sisa>' + KRIPTO.sisaDetik() +
      '</span>' + T(' detik') + '</small></div>';
  }

  function hidupkanDemo(root, userId) {
    var kotak = root.querySelector('[data-demo-otp]');
    if (!kotak) return;
    var u = DB.find('users', userId);
    var timer = setInterval(function () {
      if (!document.body.contains(kotak)) { clearInterval(timer); return; }
      kotak.querySelector('[data-otp-kode]').textContent = KRIPTO.totp(u.auth.rahasia);
      kotak.querySelector('[data-otp-sisa]').textContent = KRIPTO.sisaDetik();
    }, 1000);
  }

  function mintaKode(userId, opsi) {
    opsi = opsi || {};
    return new Promise(function (resolve) {
      var selesai = false;
      var tutupModal = UI.modal({
        title: opsi.judul || T('Verifikasi authenticator'),
        sub: opsi.sub || T('Buka aplikasi authenticator Anda dan masukkan 6 angka yang tampil'),
        size: 'narrow',
        body: (opsi.rincian || '') + petunjukDemo(userId) +
          kotakPin('kode', null) +
          '<div class="row" style="justify-content:center">' +
            '<a href="#" class="tautan-kecil" data-act="pakai-pulih">' +
            T('Tidak bisa membuka authenticator? Pakai kode pemulihan') + '</a></div>' +
          '<div class="field mt-2" data-pulih hidden>' +
            '<label>' + T('Kode pemulihan') + '</label>' +
            '<input class="input" name="pulih" placeholder="XXXX-XXXX" autocomplete="off">' +
            '<div class="hint">' + T('Satu kode hanya bisa dipakai sekali.') + '</div>' +
          '</div>',
        foot: (opsi.batalText === null ? ''
                : '<button class="btn btn--ghost" data-act="batal">' +
                  (opsi.batalText || T('Batal')) + '</button>') +
              '<button class="btn" data-act="ok">' + T('Verifikasi') + '</button>',
        onMount: function (root) {
          hidupkanPin(root);
          hidupkanDemo(root, userId);
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !selesai) {
              selesai = true; resolve(false);
            }
          });
        },
        actions: {
          'pakai-pulih': function (el) {
            var box = el.closest('.modal').querySelector('[data-pulih]');
            box.hidden = false;
            box.querySelector('input').focus();
            el.style.display = 'none';
          },
          ok: function (el) {
            var root = el.closest('.modal');
            var pulih = root.querySelector('[name="pulih"]');
            var kode = (pulih && !root.querySelector('[data-pulih]').hidden && pulih.value.trim())
              ? pulih.value.trim() : bacaPin(root, 'kode');
            if (!kode) { UI.toast(T('Masukkan kode dulu'), 'err'); return; }
            var hasil = KEAMANAN.periksaKode(userId, kode);
            if (!hasil.ok) { UI.toast(hasil.error, 'err'); kosongkanPin(root, 'kode'); return; }
            if (hasil.lewat === 'pemulihan') {
              UI.toast(T('Kode pemulihan dipakai. Sisa ') + hasil.sisa + ' ' + T('kode.'), 'warn');
            }
            selesai = true; tutupModal(); resolve(true);
          },
          batal: function () { selesai = true; tutupModal(); resolve(false); }
        }
      });
    });
  }

  /* ================================================================ PERANGKAT BARU */
  /**
   * Gerbang saat aplikasi dibuka di perangkat yang belum dikenal.
   * Promise berisi true bila sesi boleh dilanjutkan.
   */
  function tantanganPerangkat(u) {
    var jenis = KEAMANAN.tantangan(u);
    if (jenis === 'tidak-ada') { KEAMANAN.sentuhPerangkat(u.id); return Promise.resolve(true); }

    KEAMANAN.kabariPerangkatBaru(u);
    var rincian = UI.alert('warn',
      '<b>' + T('Perangkat ini belum dikenal.') + '</b><br>' +
      T('Perangkat') + ': ' + U.esc(KEAMANAN.namaPerangkat()) + '<br>' +
      T('Demi keamanan, buktikan dulu bahwa ini memang Anda.'), '🔐');

    if (jenis === 'authenticator') {
      return mintaKode(u.id, {
        judul: T('Masuk dari perangkat baru'),
        sub: T('Masukkan kode dari aplikasi authenticator Anda'),
        rincian: rincian, batalText: T('Batal masuk')
      }).then(function (ok) {
        if (ok) { KEAMANAN.percayaiPerangkat(u.id, 'diverifikasi authenticator'); return true; }
        KEAMANAN.catat(u.id, T('Gagal verifikasi perangkat baru'), 'gagal', KEAMANAN.namaPerangkat());
        return false;
      });
    }

    if (jenis === 'pin') {
      return new Promise(function (resolve) {
        var selesai = false;
        var tutupModal = UI.modal({
          title: T('Masuk dari perangkat baru'),
          sub: T('Akun ini belum memasang authenticator — verifikasi dengan PIN transaksi'),
          size: 'narrow',
          body: rincian + kotakPin('pin', T('PIN transaksi')),
          foot: '<button class="btn btn--ghost" data-act="batal">' + T('Batal masuk') + '</button>' +
                '<button class="btn" data-act="ok">' + T('Verifikasi') + '</button>',
          onMount: function (root) { hidupkanPin(root); },
          actions: {
            ok: function (el) {
              var root = el.closest('.modal');
              var cek = KEAMANAN.periksaPin(u.id, bacaPin(root, 'pin'));
              if (!cek.ok) { UI.toast(cek.error, 'err'); kosongkanPin(root, 'pin'); return; }
              KEAMANAN.percayaiPerangkat(u.id, 'diverifikasi PIN');
              selesai = true; tutupModal(); resolve(true);
            },
            batal: function () { selesai = true; tutupModal(); resolve(false); }
          }
        });
        void selesai;
      });
    }

    /* Akun belum punya pengaman apa pun — perangkat dipercaya, tapi pemiliknya
       diingatkan supaya tidak dibiarkan terbuka selamanya. */
    KEAMANAN.percayaiPerangkat(u.id, 'perangkat pertama');
    return Promise.resolve(true);
  }

  /* ================================================================ PEMULIHAN */
  /** Titik masuk dari halaman login: "Lupa email / kata sandi?" */
  function dialogLupa() {
    UI.modal({
      title: T('Butuh bantuan masuk?'), size: 'narrow',
      body: '<div class="pilih-list">' +
          '<button class="pilih-item" data-act="p-email"><span class="ic">📧</span>' +
            '<div><b>' + T('Lupa email akun') + '</b>' +
            '<small>' + T('Cari akun dari nomor WhatsApp yang terdaftar') + '</small></div>' +
            '<span class="go">›</span></button>' +
          '<button class="pilih-item" data-act="p-sandi"><span class="ic">🔑</span>' +
            '<div><b>' + T('Lupa kata sandi') + '</b>' +
            '<small>' + T('Setel ulang lewat authenticator atau kode pemulihan') + '</small></div>' +
            '<span class="go">›</span></button>' +
          '<button class="pilih-item" data-act="p-pin"><span class="ic">🔢</span>' +
            '<div><b>' + T('Lupa PIN transaksi') + '</b>' +
            '<small>' + T('Butuh kata sandi dan authenticator sekaligus') + '</small></div>' +
            '<span class="go">›</span></button>' +
        '</div>' +
        UI.alert('info', T('Semua jalur pemulihan membutuhkan authenticator atau kode pemulihan. ' +
          'Email saja tidak pernah cukup — justru email yang mungkin sedang tidak bisa Anda buka.'), 'ℹ️'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: {
        'p-email': function (el) { tutup(el); dialogLupaEmail(); },
        'p-sandi': function (el) { tutup(el); dialogLupaSandi(); },
        'p-pin': function (el) { tutup(el); dialogLupaPin(null); }
      }
    });
  }

  /** Langkah bersama: temukan akun lalu buktikan lewat authenticator. */
  function cariLaluVerifikasi(judul, ket) {
    return UI.formModal({
      title: judul, size: 'narrow', okText: T('Cari akun'),
      intro: UI.alert('info', ket, '🔎') + '<div class="mb-3"></div>',
      fields: [{ name: 'kunci', label: T('Nomor WhatsApp atau email terdaftar'), required: true,
        placeholder: '08xxxxxxxxxx' }]
    }).then(function (d) {
      if (!d) return null;
      var u = KEAMANAN.cariAkun(d.kunci);
      if (!u) {
        UI.toast(T('Akun tidak ditemukan. Periksa kembali nomor atau email Anda.'), 'err');
        return null;
      }
      if (!KEAMANAN.authAktif(u)) {
        UI.modal({
          title: T('Belum bisa dipulihkan sendiri'), size: 'narrow',
          body: UI.alert('warn', T('Akun ') + '<b>' + U.esc(KEAMANAN.samarkanEmail(u.email)) + '</b>' +
            T(' belum memasang authenticator, sehingga tidak ada cara aman memastikan ini benar Anda.') +
            '<br><br>' + T('Hubungi admin EXOCLEAN untuk verifikasi manual dengan membawa identitas ' +
            'yang sama dengan yang terdaftar.'), '⚠️'),
          foot: '<button class="btn btn--wa" data-act="wa">💬 ' + T('Hubungi Admin') + '</button>' +
                '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
          actions: { wa: function () {
            var adm = BIZ.usersByRole('admin')[0];
            if (adm) WA.chat(adm.telp, 'Halo admin EXOCLEAN, saya butuh bantuan pemulihan akun. ');
          } }
        });
        return null;
      }
      return u;
    });
  }

  function dialogLupaEmail() {
    cariLaluVerifikasi(T('Lupa email akun'),
      T('Masukkan nomor WhatsApp yang Anda daftarkan. Kami akan mencocokkannya dengan akun ' +
        'yang ada, lalu meminta kode authenticator sebelum menampilkan emailnya.'))
      .then(function (u) {
        if (!u) return;
        return mintaKode(u.id, { judul: T('Buktikan ini akun Anda') }).then(function (ok) {
          if (!ok) return;
          UI.modal({
            title: T('Email akun Anda'), size: 'narrow',
            body: UI.alert('ok', T('Terverifikasi.'), '✅') +
              '<div class="email-temu">' + U.esc(u.email) + '</div>' +
              '<div class="tbl-sub" style="text-align:center">' + U.esc(u.nama) + '</div>',
            foot: '<button class="btn" data-close>' + T('Masuk sekarang') + '</button>'
          });
          KEAMANAN.catat(u.id, 'Memulihkan email akun', 'ok', '');
        });
      });
  }

  function dialogLupaSandi() {
    cariLaluVerifikasi(T('Lupa kata sandi'),
      T('Masukkan email atau nomor WhatsApp terdaftar. Kata sandi baru hanya bisa dipasang ' +
        'setelah Anda membuktikan kepemilikan lewat authenticator.'))
      .then(function (u) {
        if (!u) return;
        return mintaKode(u.id, { judul: T('Buktikan ini akun Anda') }).then(function (ok) {
          if (!ok) return;
          UI.formModal({
            title: T('Kata sandi baru'), size: 'narrow', okText: T('Simpan & masuk'),
            intro: UI.alert('info', T('Setelah diganti, semua perangkat lain akan dikeluarkan ' +
              'otomatis. Anda perlu memverifikasi ulang di sana.'), 'ℹ️') + '<div class="mb-3"></div>',
            fields: [
              { name: 'baru', label: T('Kata sandi baru'), type: 'password', required: true,
                hint: T('Minimal 6 karakter.') },
              { name: 'ulang', label: T('Ulangi kata sandi baru'), type: 'password', required: true }
            ],
            validate: function (d) {
              if (String(d.baru).length < 6) return T('Kata sandi minimal 6 karakter');
              if (d.baru !== d.ulang) return T('Ulangan kata sandi tidak cocok');
              return null;
            }
          }).then(function (d) {
            if (!d) return;
            /* kode sudah diverifikasi di langkah sebelumnya — pakai jalur langsung */
            KEAMANAN.pasangSandi(u.id, d.baru);
            KEAMANAN.cabutSemuaPerangkatLain(u.id);
            KEAMANAN.percayaiPerangkat(u.id, 'perangkat saat memulihkan kata sandi');
            KEAMANAN.catat(u.id, 'Memulihkan kata sandi lewat authenticator', 'ok', '');
            UI.toast(T('Kata sandi diperbarui'), 'ok');
            APP.login(DB.find('users', u.id));
          });
        });
      });
  }

  /** Lupa PIN: butuh kata sandi DAN authenticator, karena ini gerbang uang. */
  function dialogLupaPin(user) {
    var lanjut = user ? Promise.resolve(user)
      : cariLaluVerifikasi(T('Lupa PIN transaksi'),
          T('Masukkan email atau nomor WhatsApp terdaftar.'));

    lanjut.then(function (u) {
      if (!u) return;
      if (!KEAMANAN.authAktif(u)) {
        UI.modal({
          title: T('Butuh authenticator'), size: 'narrow',
          body: UI.alert('warn', T('PIN hanya bisa disetel ulang lewat authenticator, karena PIN ' +
            'adalah gerbang terakhir sebelum saldo Anda berpindah. Pasang authenticator dulu ' +
            'di Profil → Keamanan, atau hubungi admin untuk verifikasi manual.'), '🔐'),
          foot: '<button class="btn" data-close>' + T('Mengerti') + '</button>'
        });
        return;
      }
      UI.formModal({
        title: T('Setel ulang PIN'), size: 'narrow', okText: T('Lanjut'),
        intro: UI.alert('info', T('Langkah 1 dari 3 — masukkan kata sandi akun Anda.'), '1️⃣') +
          '<div class="mb-3"></div>',
        fields: [{ name: 'sandi', label: T('Kata sandi'), type: 'password', required: true }]
      }).then(function (d) {
        if (!d) return;
        if (!KEAMANAN.periksaSandi(DB.find('users', u.id), d.sandi)) {
          UI.toast(T('Kata sandi salah'), 'err'); return;
        }
        mintaKode(u.id, { judul: T('Langkah 2 dari 3'),
          sub: T('Masukkan kode dari authenticator Anda') }).then(function (ok) {
          if (!ok) return;
          UI.modal({
            title: T('Langkah 3 dari 3'), sub: T('Tentukan PIN baru'), size: 'narrow',
            body: kotakPin('baru', T('PIN baru')) + kotakPin('ulang', T('Ulangi PIN baru')),
            foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
                  '<button class="btn" data-act="simpan">' + T('Simpan PIN') + '</button>',
            onMount: function (root) { hidupkanPin(root); },
            actions: {
              simpan: function (el) {
                var root = el.closest('.modal');
                var baru = bacaPin(root, 'baru');
                if (baru !== bacaPin(root, 'ulang')) {
                  UI.toast(T('Ulangan PIN tidak cocok'), 'err'); return;
                }
                var salah = KEAMANAN.validPin(baru);
                if (salah) { UI.toast(salah, 'err'); return; }
                KEAMANAN.pasangPin(u.id, baru);
                KEAMANAN.catat(u.id, 'Memulihkan PIN lewat authenticator', 'ok', '');
                if (APP.user && APP.user.id === u.id) APP.perbaruiSesi(DB.find('users', u.id));
                UI.toast(T('PIN berhasil disetel ulang'), 'ok');
                tutup(el); APP.refresh();
              }
            }
          });
        });
      });
    });
  }

  /* ================================================================ PANEL DI PROFIL */
  function panel() {
    var u = DB.find('users', APP.user.id) || APP.user;
    var r = KEAMANAN.ringkasan(u);
    var perangkat = KEAMANAN.daftarPerangkat(u.id);
    var kini = KEAMANAN.idPerangkat();
    var kunci = KEAMANAN.sisaKunci(u);

    var warna = { kuat: 'ok', cukup: 'warn', lemah: 'danger' }[r.tingkat];

    return '<div class="card mb-3"><div class="card__body">' +
        '<div class="row wrap" style="gap:14px">' +
          '<div class="skor-lingkar skor--' + warna + '">' +
            '<b>' + r.terpenuhi + '/' + r.total + '</b><small>' + T('lapis') + '</small></div>' +
          '<div style="flex:1;min-width:200px">' +
            '<div class="tbl-title">' + T('Keamanan akun') + ': ' +
              '<span class="chip chip--' + warna + '">' + T(r.tingkat) + '</span></div>' +
            '<div class="tbl-sub mb-2">' + T('Semakin banyak lapis yang aktif, semakin sulit akun ' +
              'Anda diambil alih orang lain.') + '</div>' +
            UI.progress(r.persen, warna === 'ok' ? 'ok' : warna === 'warn' ? 'warn' : 'danger') +
            '<div class="cek-list mt-2">' + r.poin.map(function (p) {
              return '<span class="cek' + (p.ok ? ' on' : '') + '">' +
                (p.ok ? '✓' : '○') + ' ' + T(p.l) + '</span>'; }).join('') + '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +

      '<div class="grid g-2">' +
        /* ---- PIN ---- */
        UI.card({
          title: '🔢 ' + T('PIN Transaksi'),
          sub: T('Menyetujui penarikan saldo'),
          body: KEAMANAN.punyaPin(u)
            ? '<dl class="kv">' +
                '<dt>' + T('Status') + '</dt><dd>' + (kunci
                  ? '<span class="chip chip--danger chip--dot">' + T('Terkunci ') + kunci +
                    ' ' + T('menit') + '</span>'
                  : '<span class="chip chip--ok chip--dot">' + T('Aktif') + '</span>') + '</dd>' +
                '<dt>' + T('Dibuat') + '</dt><dd>' + U.tglPanjang(u.pin.dibuatAt) + '</dd>' +
                '<dt>' + T('Terakhir diubah') + '</dt><dd>' + (u.pin.diubahAt
                  ? U.relatif(u.pin.diubahAt) : '<span class="tbl-sub">—</span>') + '</dd>' +
              '</dl>' +
              UI.alert('info', T('PIN tersimpan sebagai turunan PBKDF2 ber-salt — tidak ada layar ' +
                'mana pun, termasuk milik admin, yang bisa menampilkannya kembali.'), '🛡️')
            : UI.alert('warn', T('Akun ini belum punya PIN transaksi. Saldo tidak bisa ditarik ' +
                'sampai PIN dibuat.'), '⚠️'),
          foot: '<div class="spacer"></div>' + (KEAMANAN.punyaPin(u)
            ? '<button class="btn btn--ghost btn--sm" data-act="lupa-pin-profil">' + T('Lupa PIN?') +
              '</button><button class="btn btn--sm" data-act="ubah-pin">' + T('Ubah PIN') + '</button>'
            : '<button class="btn btn--sm" data-act="buat-pin">' + T('Buat PIN') + '</button>')
        }) +

        /* ---- Authenticator ---- */
        UI.card({
          title: '📱 ' + T('Authenticator'),
          sub: T('Kode 6 angka yang berganti tiap 30 detik'),
          body: KEAMANAN.authAktif(u)
            ? '<dl class="kv">' +
                '<dt>' + T('Status') + '</dt><dd><span class="chip chip--ok chip--dot">' +
                  T('Aktif') + '</span></dd>' +
                '<dt>' + T('Dipasang') + '</dt><dd>' + U.tglPanjang(u.auth.dipasangAt) + '</dd>' +
                '<dt>' + T('Terakhir dipakai') + '</dt><dd>' + (u.auth.terakhirAt
                  ? U.relatif(u.auth.terakhirAt) : '<span class="tbl-sub">' + T('belum pernah') +
                  '</span>') + '</dd>' +
                '<dt>' + T('Kode pemulihan') + '</dt><dd>' +
                  (function () {
                    var s = KEAMANAN.sisaPemulihan(u);
                    return '<span class="chip chip--' + (s > 2 ? 'ok' : s ? 'warn' : 'danger') +
                      '">' + s + ' ' + T('tersisa') + '</span>'; })() + '</dd>' +
              '</dl>'
            : UI.alert('warn', T('Belum aktif. Tanpa authenticator, akun ini tidak bisa dipulihkan ' +
                'sendiri bila kata sandi atau PIN terlupakan — harus lewat admin.'), '⚠️'),
          foot: '<div class="spacer"></div>' + (KEAMANAN.authAktif(u)
            ? '<button class="btn btn--ghost btn--sm" data-act="kode-baru">' +
                T('Kode pemulihan baru') + '</button>' +
              '<button class="btn btn--ghost btn--danger btn--sm" data-act="matikan-auth">' +
                T('Matikan') + '</button>'
            : '<button class="btn btn--sm" data-act="pasang-auth">' + T('Pasang Sekarang') + '</button>')
        }) +
      '</div>' +

      /* ---- Perangkat ---- */
      '<div class="mt-3">' + UI.card({
        title: '💻 ' + T('Perangkat yang dipercaya'),
        sub: T('Perangkat lain akan diminta verifikasi saat membuka akun ini'),
        flush: true,
        tools: perangkat.length > 1
          ? '<button class="btn btn--ghost btn--sm" data-act="cabut-semua">' +
            T('Keluarkan perangkat lain') + '</button>' : '',
        body: UI.table([
          { h: T('Perangkat'), r: function (p) {
            return '<div class="tbl-title">' + U.esc(p.nama) +
              (p.kode === kini ? '<span class="chip chip--brand chip--xs">' + T('perangkat ini') +
                '</span>' : '') + '</div>' +
              '<div class="tbl-sub">' + U.esc(p.catatan || '') + '</div>'; } },
          { h: T('Dipercaya sejak'), r: function (p) { return U.tglPanjang(p.dipercayaAt); } },
          { h: T('Aktivitas terakhir'), r: function (p) { return U.relatif(p.terakhirAt); } },
          { h: '', cls: 'act', r: function (p) {
            return p.kode === kini ? '<span class="tbl-sub">—</span>'
              : '<button class="btn btn--ghost btn--sm" data-act="cabut-perangkat" data-id="' +
                p.id + '">' + T('Cabut') + '</button>'; } }
        ], perangkat, { icon: '💻', judul: T('Belum ada perangkat tercatat') }),
        foot: '<span class="tbl-sub">🧪 ' + T('Untuk mencoba alurnya: tombol di kanan mengubah ' +
          'identitas perangkat browser ini, seolah aplikasi dibuka di HP lain.') + '</span>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn--ghost btn--sm" data-act="simulasi-perangkat">' +
          T('Simulasikan perangkat baru') + '</button>'
      }) + '</div>' +

      /* ---- Riwayat ---- */
      '<div class="mt-3">' + UI.card({
        title: '🕘 ' + T('Aktivitas keamanan'),
        sub: T('Tercatat otomatis, hanya bisa dilihat pemilik akun'),
        body: (function () {
          var log = KEAMANAN.riwayat(u.id, 12);
          if (!log.length) return UI.empty('🕘', T('Belum ada aktivitas tercatat'));
          return '<div class="timeline">' + log.map(function (l) {
            var c = l.hasil === 'gagal' ? 'now' : 'done';
            return '<div class="tl-item ' + c + '">' +
              '<b>' + (l.hasil === 'gagal' ? '⚠️ ' : '') + U.esc(T(l.aksi)) + '</b>' +
              '<small>' + U.tglJam(l.at) + ' • ' + U.esc(l.perangkat || '—') +
              (l.ket ? ' • ' + U.esc(l.ket) : '') + '</small></div>';
          }).join('') + '</div>';
        })()
      }) + '</div>';
  }

  /** Handler untuk panel di atas; dipanggil dari views/profil.js. */
  function aksiPanel(root) {
    U.delegate(root, {
      'buat-pin': function () { dialogPin('buat'); },
      'ubah-pin': function () { dialogPin('ubah'); },
      'lupa-pin-profil': function () { dialogLupaPin(APP.user); },
      'pasang-auth': function () { dialogSetupAuth(); },
      'matikan-auth': function () {
        mintaKode(APP.user.id, { judul: T('Matikan authenticator'),
          sub: T('Masukkan kode terakhir untuk memastikan ini Anda'),
          rincian: UI.alert('warn', T('Setelah dimatikan, akun ini tidak bisa dipulihkan sendiri ' +
            'bila kata sandi atau PIN terlupakan.'), '⚠️') }).then(function (ok) {
          if (!ok) return;
          DB.update('users', APP.user.id, { auth: { aktif: false, rahasia: null, pemulihan: [] } });
          KEAMANAN.catat(APP.user.id, 'Menonaktifkan authenticator', 'ok', '');
          APP.perbaruiSesi(DB.find('users', APP.user.id));
          UI.toast(T('Authenticator dimatikan'), 'warn');
          APP.refresh();
        });
      },
      'kode-baru': function () {
        mintaKode(APP.user.id, { judul: T('Terbitkan ulang kode pemulihan'),
          rincian: UI.alert('warn', T('Seluruh kode pemulihan lama akan langsung hangus.'), '⚠️') })
          .then(function (ok) {
            if (!ok) return;
            var u = DB.find('users', APP.user.id), polos = [], simpan = [];
            for (var i = 0; i < KEAMANAN.JUMLAH_PEMULIHAN; i++) {
              var k = KRIPTO.kodePemulihan();
              polos.push(k);
              simpan.push({ h: KRIPTO.turunkan(KRIPTO.normalKode(k), null, 2000), dipakaiAt: null });
            }
            DB.update('users', u.id, { auth: Object.assign({}, u.auth, { pemulihan: simpan }) });
            KEAMANAN.catat(u.id, 'Menerbitkan ulang kode pemulihan', 'ok', '');
            APP.perbaruiSesi(DB.find('users', u.id));
            dialogKodePemulihan(polos, false);
          });
      },
      'cabut-perangkat': function (el) {
        var hasil = KEAMANAN.cabutPerangkat(el.getAttribute('data-id'), APP.user.id);
        if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
        UI.toast(T('Perangkat dicabut'), 'ok'); APP.refresh();
      },
      'cabut-semua': function () {
        UI.konfirm({ title: T('Keluarkan semua perangkat lain?'),
          text: T('Perangkat lain harus verifikasi ulang saat membuka akun ini.'),
          okText: T('Ya, keluarkan') }).then(function (ya) {
          if (!ya) return;
          var n = KEAMANAN.cabutSemuaPerangkatLain(APP.user.id);
          UI.toast(n + ' ' + T('perangkat dikeluarkan'), 'ok'); APP.refresh();
        });
      },
      'simulasi-perangkat': function () {
        UI.konfirm({ title: T('Simulasikan perangkat baru?'),
          htmlText: T('Identitas perangkat browser ini akan diganti, lalu aplikasi dimuat ulang. ' +
            'Anda akan diminta verifikasi seperti sedang membuka aplikasi di HP lain.'),
          okText: T('Ya, coba') }).then(function (ya) {
          if (!ya) return;
          KEAMANAN.gantiPerangkat();
          location.reload();
        });
      }
    });
  }

  return {
    kotakPin: kotakPin, hidupkanPin: hidupkanPin, bacaPin: bacaPin, kosongkanPin: kosongkanPin,
    mintaPin: mintaPin, mintaKode: mintaKode,
    dialogPin: dialogPin, dialogSetupAuth: dialogSetupAuth,
    dialogKodePemulihan: dialogKodePemulihan,
    dialogLupa: dialogLupa, dialogLupaPin: dialogLupaPin,
    tantanganPerangkat: tantanganPerangkat,
    panel: panel, aksiPanel: aksiPanel, tutupSemua: tutupSemua
  };
})();
