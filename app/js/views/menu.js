/* ==========================================================================
   views/menu.js — layar "Susunan Menu" untuk Super Admin
   --------------------------------------------------------------------------
   DUA CARA MENGUBAH URUTAN, DAN ITU DISENGAJA

   Seret-lepas adalah cara yang paling langsung, tetapi ia gagal diam-diam
   pada layar sentuh, pada penggunaan lewat papan ketik, dan pada tangan yang
   tidak stabil. Tombol naik/turun bertahan di semua keadaan itu tetapi
   melelahkan untuk memindahkan menu jauh. Keduanya disediakan; yang satu
   menutupi kelemahan yang lain.

   YANG DITAMPILKAN ADALAH HASIL, BUKAN NIAT
   Daftar di layar ini digambar dari MENU.susun() — fungsi yang sama persis
   yang dipakai sidebar. Membuat layar pengaturan menggambar daftarnya sendiri
   berarti dua tempat yang bisa berbeda, dan yang terlihat di pengaturan belum
   tentu yang muncul di menu.
   ========================================================================== */
var ViewMenu = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  /* Ikon siap pakai. Sengaja dipilih yang ada di font bawaan Windows —
     emoji Unicode 13 ke atas (🪟 🪣 🫧 dan kerabatnya) tampil sebagai kotak
     kosong di sana, dan ikon menu yang berupa kotak kosong lebih buruk
     daripada tidak diganti sama sekali. */
  var IKON_SIAP = ['📊', '📥', '📄', '🏬', '🛒', '📅', '📋', '🛡️', '🧾', '📈',
                   '💰', '💳', '🔐', '🏦', '💬', '👷', '🧴', '📦', '👤', '🎯',
                   '📌', '🧑‍💼', '📣', '🎓', '🔑', '🚚', '🎁', '🎟️', '🎰', '🤝',
                   '⚙️', '🏠', '⭐', '🔔', '📁', '🧭', '🗂️', '☰'];

  /* Kunci susunan yang sedang dibuka. BUKAN selalu nama peran: untuk
     korporat ia disempitkan per korporat — lihat MENU.peranTersedia(). */
  var peranAktif = null;

  /** Entri yang sedang dibuka, dari daftar yang boleh diatur pengguna ini. */
  function entriAktif() {
    var daftar = MENU.peranTersedia(APP.user);
    var ada = daftar.filter(function (p) { return p.id === peranAktif; })[0];
    /* Kunci yang tersimpan dari sesi lain — atau dari pengguna lain — tidak
       boleh membuat layar ini kosong. Jatuh ke entri pertama. */
    return ada || daftar[0];
  }
  var seret = null;        /* kunci menu yang sedang diseret */

  /**
   * Halaman milik satu peran, apa adanya sebelum disaring izin — ditambah
   * menu utama buatan admin.
   *
   * Digabung di satu tempat ini saja. Kalau tidak, setiap pemanggil harus
   * ingat menggabungkannya sendiri, dan yang lupa akan menggambar daftar yang
   * kehilangan wadah-wadahnya tanpa terlihat salah.
   */
  /**
   * @param {string} kunciSusunan kunci PENYIMPANAN susunan
   * @param {string} [modul]      peran yang halamannya diambil; bila kosong,
   *                              dianggap sama dengan kunciSusunan
   */
  function halamanPeran(kunciSusunan, modul) {
    var role = modul || kunciSusunan;
    var m = APP.modules ? APP.modules[role] : null;
    /* Sebagian modul menyusun menunya menurut keadaan pengguna yang SEDANG
       masuk — Mitra Toko menyembunyikan perangkat jualan sampai tokonya
       aktif. Layar ini dibuka Super Admin, jadi menanyakan `pages` begitu
       saja akan menjawab menurut status Super Admin, bukan status mitra:
       yang tampil untuk diatur bukan menu yang dilihat siapa pun.

       Modul yang punya keadaan menyediakan semuaPages() — gabungan seluruh
       menu yang mungkin muncul. Itu yang harus bisa diatur. */
    var pages = (m && (m.semuaPages ? m.semuaPages() : m.pages)) || {};
    /* Digabung dengan KUNCI susunannya, bukan nama perannya: menu buatan
       sendiri milik satu korporat tidak boleh muncul di korporat lain. */
    return MENU.gabung(kunciSusunan, pages);
  }

  function render() {
    var e = entriAktif();
    peranAktif = e.id;
    var pages = halamanPeran(e.id, e.modul);
    var kelompok = MENU.susun(peranAktif, pages);
    var tersembunyi = Object.keys(pages).filter(function (k) {
      return !pages[k].tersembunyi && MENU.tersembunyi(peranAktif, k);
    });
    var grupAda = MENU.daftarGrup(peranAktif, pages);

    return '<div>' +
      UI.alert('info',
        '<b>' + T('Yang diatur di sini hanya susunan, bukan hak akses.') + '</b> ' +
        T('Menu yang disembunyikan tetap bisa dibuka lewat alamatnya — yang menahannya ' +
          'adalah izin peran di halaman Peran & Hak Akses. Menyembunyikan menu bukan cara ' +
          'mengamankan halaman.'), 'ℹ️') +

      '<div class="tabs mt-2">' +
        MENU.peranTersedia(APP.user).map(function (p) {
          return '<button class="tab' + (peranAktif === p.id ? ' active' : '') + '" ' +
            'data-act="peran" data-r="' + p.id + '">' + U.esc(T(p.nama)) +
            '<span class="n">' + Object.keys(halamanPeran(p.id, p.modul)).length + '</span></button>';
        }).join('') +
      '</div>' +

      UI.card({
        title: T('Susunan menu'),
        sub: T('Seret barisnya, atau pakai tombol naik-turun'),
        body:
          '<div class="row mb-2">' +
            (MENU.adaSusunan(peranAktif)
              ? '<span class="chip chip--brand chip--xs">' + T('Sudah diatur') + '</span>'
              : '<span class="tbl-sub">' + T('Masih memakai susunan bawaan.') + '</span>') +
            '<div class="spacer"></div>' +
            '<button class="btn btn--ghost btn--sm" data-act="tambah-grup">＋ ' +
              T('Kelompok baru') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="tambah-maya">＋ ' +
              T('Menu utama baru') + '</button>' +
            (MENU.adaSusunan(peranAktif)
              ? '<button class="btn btn--ghost btn--sm" data-act="reset">' +
                T('Kembalikan ke susunan bawaan') + '</button>'
              : '') +
          '</div>' +

          kelompok.map(function (kel) {
            var grupSepi = !kel.keys.length;
            return '<div class="mn-grup' + (grupSepi ? ' mn-grup--sepi' : '') + '" ' +
                'data-g="' + U.esc(kel.grup) + '">' +
              '<div class="mn-grup__kepala">' +
                '<button class="mn-grup__nama mn-grup__nama--klik" data-act="namai-grup" ' +
                  'data-g="' + U.esc(kel.grup) + '" title="' + T('Ganti nama kelompok') + '">' +
                  U.esc(T(kel.grup)) + '</button>' +
                '<span class="tbl-sub">' + kel.keys.length + ' ' + T('menu') + '</span>' +
                '<div class="spacer"></div>' +
                '<button class="btn btn--ghost btn--sm" data-act="namai-grup" ' +
                  'data-g="' + U.esc(kel.grup) + '">' + T('Ganti nama') + '</button>' +
                /* Hanya kelompok kosong yang bisa dibuang. Kelompok berisi ada
                   KARENA menunya ada — ia hilang sendiri begitu isinya pindah,
                   dan tombol buang di situ cuma menimbulkan pertanyaan ke mana
                   isinya akan dibawa. */
                (grupSepi
                  ? '<button class="btn btn--ghost btn--sm" data-act="buang-grup" ' +
                    'data-g="' + U.esc(kel.grup) + '">' + T('Hapus') + '</button>'
                  : '') +
              '</div>' +
              (grupSepi
                ? '<div class="tbl-sub" style="padding:2px 0 8px">' +
                  T('Masih kosong — belum tampil di menu samping. Seret menu ke sini, ' +
                    'atau pilih kelompok ini pada daftar di baris menu.') + '</div>'
                : '') +
              kel.item.map(function (it) {
                return barisMenu(it.key, pages, grupAda, false) +
                  it.anak.map(function (a) {
                    return barisMenu(a, pages, grupAda, true); }).join('');
              }).join('') +
            '</div>';
          }).join('') +

          (tersembunyi.length
            ? '<div class="mn-grup mn-grup--sembunyi">' +
                '<div class="mn-grup__kepala">' +
                  '<span class="mn-grup__nama">🚫 ' + T('Disembunyikan') + '</span>' +
                  '<span class="tbl-sub">' + tersembunyi.length + ' ' + T('menu') + '</span>' +
                '</div>' +
                '<div class="tbl-sub" style="padding:0 0 8px">' +
                  T('Tidak tampil di menu samping, tetapi halamannya masih hidup dan ' +
                    'masih dijaga izin perannya.') + '</div>' +
                tersembunyi.map(function (k) { return barisMenu(k, pages, grupAda, false); }).join('') +
              '</div>'
            : '')
      }) +
    '</div>';
  }

  function barisMenu(k, pages, grupAda, adalahAnak) {
    var p = pages[k];
    if (!p) return '';
    var sembunyi = MENU.tersembunyi(peranAktif, k);
    var wajib = MENU.WAJIB_TAMPIL.indexOf(k) >= 0;
    var grupSekarang = MENU.grupDari(peranAktif, k, pages);
    var punyaAnak = MENU.anakDari(peranAktif, k, pages).length;
    var wadah = MENU.adalahMaya(k);

    return '<div class="mn-baris' + (sembunyi ? ' mn-baris--off' : '') +
        (adalahAnak ? ' mn-baris--anak' : '') + (wadah ? ' mn-baris--wadah' : '') + '" ' +
        'draggable="true" data-k="' + U.esc(k) + '">' +
      '<span class="mn-pegang" title="' + T('Seret untuk memindahkan') + '">⣿</span>' +
      '<button class="mn-ic mn-ic--klik" data-act="ikon" data-k="' + U.esc(k) + '" ' +
        'title="' + T('Ganti ikon') + '">' + U.esc(MENU.ikon(peranAktif, k, pages)) + '</button>' +
      '<span class="mn-isi">' +
        '<b>' + U.esc(MENU.label(peranAktif, k, pages)) +
          (MENU.labelKustom(peranAktif, k)
            ? ' <span class="mn-tanda" title="' + T('Nama diubah dari') + ' ' +
              U.esc(T(p.label)) + '">✎</span>' : '') +
          /* Jumlah anak hanya ditempelkan pada menu berhalaman. Pada wadah,
             baris keterangan di bawahnya sudah menyebutkan jumlah yang sama —
             dua angka yang sama di satu baris membuat orang mencari bedanya. */
          /* Bukan angka + kata: bahasa lain mengubah kata itu menurut
             angkanya, dan '1 ' + 'children' menghasilkan "1 children". */
          (punyaAnak && !wadah
            ? ' <span class="mn-tanda">' +
              U.esc(T(punyaAnak === 1 ? '1 anak' : '{n} anak').replace('{n}', punyaAnak)) +
              '</span>'
            : '') +
        '</b>' +
        (wadah
          ? '<small>' + T('Menu utama — wadah, bukan halaman') +
              (punyaAnak
                ? ' · ' + U.esc(T(punyaAnak === 1 ? '1 sub-menu' : '{n} sub-menu').replace('{n}', punyaAnak))
                : ' · <b>' + T('masih kosong, belum tampil di menu samping') + '</b>') +
            '</small>'
          : '<small><code>' + U.esc(k) + '</code>' +
            (p.sub ? ' · ' + U.esc(T(p.sub)) : '') + '</small>') +
      '</span>' +

      /* Anak tidak punya pemilih kelompok — kelompoknya mengikuti induk.
         Menyediakannya berarti menawarkan pilihan yang diabaikan diam-diam. */
      (adalahAnak
        ? '<span class="mn-anak-tanda">↳ ' + T('anak dari') + ' ' +
          U.esc(MENU.label(peranAktif, MENU.induk(peranAktif, k), pages)) + '</span>'
        : '<select class="select select--kecil" data-change="grup" data-k="' + U.esc(k) + '">' +
          grupAda.map(function (g) {
            return '<option value="' + U.esc(g) + '"' + (g === grupSekarang ? ' selected' : '') + '>' +
              U.esc(T(g)) + '</option>';
          }).join('') +
          '<option value="__baru">＋ ' + T('Kelompok baru…') + '</option>' +
        '</select>') +

      '<span class="mn-aksi">' +
        '<button class="mn-b" data-act="nama" data-k="' + U.esc(k) + '" title="' +
          T('Ganti nama menu') + '">✎</button>' +
        (wadah
          ? '<button class="mn-b mn-b--buang" data-act="buang-maya" data-k="' + U.esc(k) +
            '" title="' + T('Hapus menu utama ini') + '">🗑</button>'
          : '<button class="mn-b' + (adalahAnak ? ' on' : '') + '" data-act="induk" data-k="' +
            U.esc(k) + '" title="' + T('Jadikan sub-menu') + '">↳</button>') +
        '<button class="mn-b" data-act="naik" data-k="' + U.esc(k) + '" title="' + T('Naik') + '">▲</button>' +
        '<button class="mn-b" data-act="turun" data-k="' + U.esc(k) + '" title="' + T('Turun') + '">▼</button>' +
        (wajib
          ? '<span class="mn-kunci" title="' +
            T('Halaman ini tidak bisa disembunyikan — ia satu-satunya jalan untuk menampilkan kembali menu yang lain.') +
            '">🔒</span>'
          : '<button class="mn-b' + (sembunyi ? ' on' : '') + '" data-act="sembunyi" ' +
            'data-k="' + U.esc(k) + '" title="' + (sembunyi ? T('Tampilkan') : T('Sembunyikan')) + '">' +
            (sembunyi ? '🙈' : '👁') + '</button>') +
      '</span>' +
    '</div>';
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    var pages = function () {
      var e = entriAktif();
      return halamanPeran(e.id, e.modul);
    };

    U.delegate(root, {
      peran: function (el) { peranAktif = el.getAttribute('data-r'); APP.refresh(); },

      nama: function (el) {
        var k = el.getAttribute('data-k');
        var p = pages()[k];
        UI.formModal({
          title: T('Ganti nama menu'), sub: MENU.label(peranAktif, k, pages()),
          okText: T('Simpan'),
          fields: [{ name: 'nama', label: T('Nama yang ditampilkan'),
            value: MENU.labelKustom(peranAktif, k) ? MENU.label(peranAktif, k, pages()) : '',
            hint: T('Kosongkan untuk kembali ke nama bawaan') + ': ' + T(p.label) }]
        }).then(function (v) {
          if (!v) return;
          MENU.setNama(peranAktif, k, v.nama);
          APP.refresh();
        });
      },

      ikon: function (el) {
        var k = el.getAttribute('data-k');
        var p = pages()[k];
        UI.formModal({
          title: T('Ganti ikon'), sub: MENU.label(peranAktif, k, pages()), okText: T('Simpan'),
          intro: '<div class="mn-ikon-pilih">' + IKON_SIAP.map(function (ic) {
            return '<button type="button" class="mn-ikon-b" data-ikon="' + ic + '">' + ic + '</button>';
          }).join('') + '</div>',
          fields: [{ name: 'ikon', label: T('Ikon'),
            value: MENU.ikon(peranAktif, k, pages()),
            hint: T('Tekan salah satu di atas, atau tempel emoji apa pun. Kosongkan untuk kembali ke bawaan.') }],
          onMount: function (root) {
            /* Tombol pilihan mengisi kolomnya, bukan langsung menyimpan:
               pengguna masih boleh berubah pikiran sebelum menekan Simpan. */
            root.addEventListener('click', function (ev) {
              var b = ev.target.closest('[data-ikon]');
              if (!b) return;
              ev.preventDefault();
              var f = root.querySelector('#f_ikon');
              if (f) f.value = b.getAttribute('data-ikon');
            });
          }
        }).then(function (v) {
          if (!v) return;
          try { MENU.setIkon(peranAktif, k, v.ikon); APP.refresh(); }
          catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      induk: function (el) {
        var k = el.getAttribute('data-k');
        var pg = pages();
        if (MENU.induk(peranAktif, k)) {          /* sudah anak → lepaskan */
          MENU.setInduk(peranAktif, k, null, pg);
          APP.refresh();
          return;
        }
        /* Calon induk hanya menu yang boleh menerima anak. Menyaringnya di
           sini membuat pilihan yang mustahil tidak pernah ditawarkan —
           lebih baik daripada menawarkannya lalu menolak setelah dipilih. */
        var calon = Object.keys(pg).filter(function (c) {
          return !pg[c].tersembunyi && c !== k && MENU.bolehJadiAnak(peranAktif, k, c, pg).ok;
        });
        if (!calon.length) {
          UI.toast(T('Tidak ada menu yang bisa menjadi induk untuk menu ini.'), 'warn');
          return;
        }
        UI.formModal({
          title: T('Jadikan sub-menu'), sub: MENU.label(peranAktif, k, pg), okText: T('Pindahkan'),
          fields: [{ name: 'induk', label: T('Menjadi anak dari'), type: 'select',
            options: calon.map(function (c) {
              return { value: c, label: MENU.ikon(peranAktif, c, pg) + ' ' + MENU.label(peranAktif, c, pg) };
            }),
            hint: T('Susunan hanya satu tingkat — anak tidak bisa punya anak lagi.') }]
        }).then(function (v) {
          if (!v) return;
          try { MENU.setInduk(peranAktif, k, v.induk, pg); APP.refresh(); }
          catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      naik: function (el) {
        MENU.geser(peranAktif, pages(), el.getAttribute('data-k'), -1);
        APP.refresh();
      },
      turun: function (el) {
        MENU.geser(peranAktif, pages(), el.getAttribute('data-k'), 1);
        APP.refresh();
      },
      sembunyi: function (el) {
        var k = el.getAttribute('data-k');
        try {
          MENU.setSembunyi(peranAktif, k, !MENU.tersembunyi(peranAktif, k));
          APP.refresh();
        } catch (e) { UI.toast(e.message, 'err'); }
      },
      grup: function (el) {
        var k = el.getAttribute('data-k');
        if (el.value === '__baru') {
          UI.formModal({
            title: T('Kelompok baru'), okText: T('Pindahkan'),
            fields: [{ name: 'nama', label: T('Nama kelompok'), required: true,
              hint: T('mis. Operasional, Keuangan, Sistem') }]
          }).then(function (v) {
            if (!v) { APP.refresh(); return; }   /* batal: kembalikan pilihannya */
            /* Nama yang TAMPIL sama dengan kelompok yang sudah ada dipakai
               ulang, bukan dibuat kembar. Dua kelompok bertuliskan sama di
               menu adalah hal yang tidak bisa ditebak sebabnya oleh siapa pun
               yang melihatnya. */
            var serupa = MENU.grupSerupa(peranAktif, pages(), v.nama);
            if (serupa && serupa !== v.nama) {
              UI.toast(T('Kelompok') + ' "' + T(serupa) + '" ' +
                T('sudah ada — menu dipindahkan ke sana.'), 'info');
            }
            MENU.setGrup(peranAktif, k, serupa || v.nama);
            APP.refresh();
          });
          return;
        }
        MENU.setGrup(peranAktif, k, el.value);
        APP.refresh();
      },
      'tambah-grup': function () {
        UI.formModal({
          title: T('Kelompok baru'),
          sub: T('Judul yang memisahkan menu di sidebar'),
          okText: T('Buat'),
          fields: [{ name: 'nama', label: T('Nama kelompok'), required: true,
            hint: T('mis. Operasional, Keuangan, Sistem') }]
        }).then(function (v) {
          if (!v) return;
          try {
            MENU.tambahGrup(peranAktif, pages(), v.nama);
            /* Kelompok kosong belum tampil di menu samping — judul tanpa apa
               pun di bawahnya bukan menu. Dikatakan sekarang, bukan setelah
               admin mencarinya di sidebar dan mengira pembuatannya gagal. */
            UI.toast(T('Kelompok dibuat. Ia baru muncul di menu samping setelah ada ' +
              'menu yang dipindahkan ke dalamnya.'), 'ok');
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      'buang-grup': function (el) {
        var nama = el.getAttribute('data-g');
        try { MENU.hapusGrup(peranAktif, pages(), nama); APP.refresh(); }
        catch (e) { UI.toast(e.message, 'err'); }
      },

      'namai-grup': function (el) {
        var lama = el.getAttribute('data-g');
        UI.formModal({
          title: T('Ganti nama kelompok'), okText: T('Simpan'),
          fields: [{ name: 'nama', label: T('Nama kelompok'), value: lama, required: true }]
        }).then(function (v) {
          if (!v) return;
          try { MENU.namaiGrup(peranAktif, pages(), lama, v.nama); APP.refresh(); }
          catch (e) { UI.toast(e.message, 'err'); }
        });
      },
      reset: function () {
        UI.konfirm({
          title: T('Kembalikan ke susunan bawaan?'),
          text: T('Seluruh urutan, kelompok, menu utama buatan sendiri, dan menu yang ' +
            'disembunyikan untuk peran ini akan dilepas.'),
          okText: T('Kembalikan'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          MENU.reset(peranAktif);
          UI.toast(T('Susunan dikembalikan ke bawaan'), 'ok');
          APP.refresh();
        });
      },

      'tambah-maya': function () {
        var grupAda = MENU.daftarGrup(peranAktif, pages());
        UI.formModal({
          title: T('Menu utama baru'),
          sub: T('Wadah untuk mengelompokkan menu yang sudah ada'),
          okText: T('Buat'),
          intro: '<div class="mn-ikon-pilih">' + IKON_SIAP.map(function (ic) {
            return '<button type="button" class="mn-ikon-b" data-ikon="' + ic + '">' + ic + '</button>';
          }).join('') + '</div>',
          fields: [
            { name: 'nama', label: T('Nama menu'), required: true,
              hint: T('Yang tampil di menu samping. Tidak diterjemahkan — ditulis apa adanya.') },
            { name: 'ikon', label: T('Ikon'), value: '📂',
              hint: T('Tekan salah satu di atas, atau tempel emoji apa pun.') },
            { name: 'grup', label: T('Kelompok'), type: 'select',
              options: grupAda.map(function (gr) { return { value: gr, label: T(gr) }; }) }
          ],
          onMount: function (root) {
            root.addEventListener('click', function (ev) {
              var b = ev.target.closest('[data-ikon]');
              if (!b) return;
              ev.preventDefault();
              var f = root.querySelector('#f_ikon');
              if (f) f.value = b.getAttribute('data-ikon');
            });
          }
        }).then(function (v) {
          if (!v) return;
          try {
            MENU.tambahMaya(peranAktif, v.nama, v.ikon, v.grup);
            /* Wadah kosong belum tampil di menu samping. Mengatakannya
               sekarang jauh lebih baik daripada membiarkan admin mencarinya
               di sidebar dan menyimpulkan pembuatannya gagal. */
            UI.toast(T('Menu utama dibuat. Ia baru muncul di menu samping setelah diisi ' +
              'sub-menu lewat tombol ↳ pada menu lain.'), 'ok');
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      'buang-maya': function (el) {
        var k = el.getAttribute('data-k');
        var isi = MENU.anakDari(peranAktif, k, pages());
        UI.konfirm({
          title: T('Hapus menu utama ini?'),
          text: isi.length
            ? T('Isinya tidak ikut terhapus') + ' — ' + isi.length + ' ' +
              T('sub-menu di dalamnya akan kembali berdiri sendiri di kelompok yang sama.')
            : T('Wadah ini masih kosong.'),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          MENU.hapusMaya(peranAktif, k);
          UI.toast(T('Menu utama dihapus'), 'ok');
          APP.refresh();
        });
      }
    });

    /* ---- seret-lepas ----
       Dipasang langsung, bukan lewat U.delegate: peristiwa seret tidak
       menggelembung dengan cara yang sama seperti klik, dan dragover harus
       dicegah bawaannya pada TIAP target supaya lepasnya diterima.

       TIGA ZONA PER BARIS, BUKAN SATU

       Menjatuhkan sesuatu pada sebuah baris bisa berarti dua hal yang sangat
       berbeda: "taruh di sebelah menu ini" atau "taruh DI DALAM menu ini".
       Satu zona hanya bisa mengungkapkan salah satunya, dan yang satunya lagi
       jadi mustahil dilakukan dengan tangan — harus lewat dialog.

       Karena itu baris dibagi: tepi atas dan tepi bawah menyisipkan sebelum
       atau sesudah, bagian tengah menyarangkan ke dalam. Zona tengah hanya
       ditawarkan bila penyarangannya memang boleh; kalau tidak, seluruh baris
       jadi zona sisip, sehingga tidak pernah ada penanda yang menjanjikan
       sesuatu lalu ditolak setelah dilepas. */

    /** Zona mana yang sedang diincar pada satu baris: atas | dalam | bawah. */
    function zonaBaris(el, e) {
      var k = seret, tujuan = el.getAttribute('data-k');
      var r = el.getBoundingClientRect();
      var p = r.height ? (e.clientY - r.top) / r.height : 0.5;
      var bolehDalam = k && tujuan !== k &&
        MENU.bolehJadiAnak(peranAktif, k, tujuan, pages()).ok &&
        MENU.induk(peranAktif, k) !== tujuan;
      if (!bolehDalam) return p < 0.5 ? 'atas' : 'bawah';
      /* Wadah diberi zona tengah yang lebih lebar: ia tidak punya guna lain
         selain menampung, jadi maksud yang paling mungkin saat menjatuhkan
         sesuatu di atasnya adalah memasukkannya. */
      var tepi = MENU.adalahMaya(tujuan) ? 0.2 : 0.32;
      if (p < tepi) return 'atas';
      if (p > 1 - tepi) return 'bawah';
      return 'dalam';
    }

    function bersihkanPenanda(daftar) {
      [].forEach.call(daftar, function (x) {
        x.classList.remove('mn-baris--seret', 'mn-baris--atas',
          'mn-baris--bawah', 'mn-baris--dalam');
      });
      [].forEach.call(root.querySelectorAll('.mn-grup'), function (x) {
        x.classList.remove('mn-grup--incar');
      });
    }

    /* Kelompok menerima lepasan pada KEPALANYA, dan kelompok kosong pada
       seluruh kotaknya — kelompok kosong tidak punya satu baris pun untuk
       dijatuhi, dan ajakan "seret menu ke sini" harus bisa dipenuhi. */
    function pasangKelompok(kotak, sasaran) {
      sasaran.addEventListener('dragover', function (e) {
        if (!seret) return;
        e.preventDefault();
        kotak.classList.add('mn-grup--incar');
      });
      sasaran.addEventListener('dragleave', function () { kotak.classList.remove('mn-grup--incar'); });
      sasaran.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        kotak.classList.remove('mn-grup--incar');
        var k = seret;
        if (!k) return;
        /* Menu yang masuk kelompok lain berhenti jadi anak: kelompok hanya
           berlaku bagi menu yang berdiri sendiri. */
        try { MENU.setInduk(peranAktif, k, null, pages()); } catch (x) {}
        MENU.setGrup(peranAktif, k, kotak.getAttribute('data-g'));
        APP.refresh();
      });
    }

    [].forEach.call(root.querySelectorAll('.mn-grup'), function (kotak) {
      /* Blok "Disembunyikan" juga berupa .mn-grup tetapi BUKAN kelompok — ia
         tidak punya nama untuk dipindahi. Menerima lepasan di sana akan
         menghapus kelompok menu itu tanpa ada yang memintanya. */
      if (!kotak.getAttribute('data-g')) return;
      var kepala = kotak.querySelector('.mn-grup__kepala');
      if (kepala) pasangKelompok(kotak, kepala);
      if (kotak.classList.contains('mn-grup--sepi')) pasangKelompok(kotak, kotak);
    });

    var barisan = root.querySelectorAll('.mn-baris');
    [].forEach.call(barisan, function (el) {
      el.addEventListener('dragstart', function (e) {
        seret = el.getAttribute('data-k');
        el.classList.add('mn-baris--seret');
        try { e.dataTransfer.setData('text/plain', seret); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
      });
      el.addEventListener('dragend', function () {
        seret = null;
        bersihkanPenanda(barisan);
      });
      el.addEventListener('dragover', function (e) {
        if (!seret || seret === el.getAttribute('data-k')) return;
        e.preventDefault();
        var z = zonaBaris(el, e);
        el.classList.remove('mn-baris--atas', 'mn-baris--bawah', 'mn-baris--dalam');
        el.classList.add('mn-baris--' + z);
      });
      el.addEventListener('dragleave', function () {
        el.classList.remove('mn-baris--atas', 'mn-baris--bawah', 'mn-baris--dalam');
      });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var k = seret;
        var tujuan = el.getAttribute('data-k');
        var z = zonaBaris(el, e);
        el.classList.remove('mn-baris--atas', 'mn-baris--bawah', 'mn-baris--dalam');
        if (!k || k === tujuan) return;

        /* ---- dijatuhkan KE DALAM ---- */
        if (z === 'dalam') {
          try { MENU.sarangkan(peranAktif, pages(), k, tujuan); }
          catch (x) { UI.toast(x.message, 'err'); }
          APP.refresh();
          return;
        }

        /* ---- dijatuhkan DI SEBELAH ----
           Zona atas menyisipkan sebelum baris tujuan; zona bawah sesudahnya.
           Membedakan keduanya penting pada baris terakhir sebuah kelompok —
           tanpa zona bawah, tidak ada cara menaruh sesuatu di paling akhir. */
        var urut = MENU.urutanBerlaku(peranAktif, pages());
        var sebelum = tujuan;
        if (z === 'bawah') {
          var j = urut.indexOf(tujuan);
          sebelum = j >= 0 && j + 1 < urut.length ? urut[j + 1] : null;
          if (sebelum === k) sebelum = null;
        }
        MENU.pindahKe(peranAktif, pages(), k, sebelum);

        /* Mendarat di antara anak-anak sebuah induk berarti ikut masuk ke
           sana; di antara menu biasa berarti keluar dari sarang. Yang dilihat
           pengguna adalah barisnya mendarat di rombongan itu — dan susunannya
           harus mengikuti apa yang terlihat. */
        var indukTujuan = MENU.induk(peranAktif, tujuan);
        var indukSeret = MENU.induk(peranAktif, k);
        if (indukSeret !== indukTujuan) {
          try { MENU.setInduk(peranAktif, k, indukTujuan, pages()); } catch (x) {}
        }

        /* Kelompok hanya berlaku untuk menu yang berdiri sendiri — anak selalu
           ikut induknya, dan menyetelnya di situ cuma menyimpan nilai yang
           tidak pernah dibaca. */
        if (!MENU.induk(peranAktif, k)) {
          MENU.setGrup(peranAktif, k, MENU.grupDari(peranAktif, tujuan, pages()));
        }
        APP.refresh();
      });
    });
  }

  var pagesAdmin = {
    setelanMenu: {
      label: 'Susunan Menu', icon: '☰', grup: 'Sistem',
      sub: 'Urutan, kelompok, dan menu yang ditampilkan',
      render: render, mount: aksi
    }
  };

  return { pagesAdmin: pagesAdmin, render: render, aksi: aksi };
})();
