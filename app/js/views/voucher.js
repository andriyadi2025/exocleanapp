/* ==========================================================================
   views/voucher.js — Voucher
   Halaman klien (beli • hadiah • voucher saya • klaim kode)
   Halaman super admin (katalog • voucher terbit)
   Undian punya halaman tersendiri di views/undian.js — lihat catatan di sana.
   ========================================================================== */
var ViewVoucher = (function () {

  var T = function (s) { return I18N.t(s); };
  var tabAdmin = 'katalog';
  var tabUser = 'beli';

  function me() { return APP.user; }
  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ KARTU */
  function kartuProduk(p, mode) {
    var sisa = VOUCHER.sisaKuota(p);
    var J = VOUCHER.JENIS[p.jenis] || {};
    return '<div class="vcr">' +
      '<div class="vcr__pita ' + U.esc(p.jenis) + '">' + (p.ic || J.ic) + '</div>' +
      '<div class="vcr__body">' +
        '<b>' + U.esc(p.nama) + '</b>' +
        '<div class="vcr__nilai">' + U.esc(VOUCHER.nilaiTeks({ jenis: p.jenis, ketentuan: p })) + '</div>' +
        (p.deskripsi ? '<div class="tbl-sub">' + U.esc(p.deskripsi) + '</div>' : '') +
        '<div class="tbl-sub mt-1">' + U.esc(J.nama) +
          ' · ' + T('berlaku') + ' ' + p.masaBerlakuHari + ' ' + T('hari') +
          (p.minBelanja ? ' · ' + T('min. belanja') + ' ' + U.rpShort(p.minBelanja) : '') +
          (p.lingkup !== 'semua' ? ' · ' + U.esc(VOUCHER.LINGKUP[p.lingkup]) : '') +
          (sisa !== null ? ' · ' + T('sisa') + ' ' + sisa : '') +
        '</div>' +
      '</div>' +
      '<div class="vcr__aksi">' +
        (mode === 'beli'
          ? '<div class="vcr__harga">' + U.rp(p.hargaJual) + '</div>' +
            '<button class="btn btn--sm" data-act="beli" data-id="' + U.esc(p.id) + '">' +
              T('Beli') + '</button>' +
            (p.bolehHadiah !== false
              ? '<button class="btn btn--ghost btn--sm" data-act="hadiah" data-id="' + U.esc(p.id) + '">🎁 ' +
                T('Hadiahkan') + '</button>' : '')
          : mode === 'poin'
            ? (function () {
                var punya = POIN.saldo(me().id), cukup = punya >= p.hargaPoin;
                return '<div class="vcr__harga">' + U.num(p.hargaPoin) + ' ' + U.esc(POIN.nama()) + '</div>' +
                  '<button class="btn btn--sm' + (cukup ? '' : ' btn--ghost') + '" data-act="tukar-poin" ' +
                    'data-id="' + U.esc(p.id) + '"' + (cukup ? '' : ' disabled') + '>' +
                    (cukup ? T('Tukar')
                      : T('Kurang {n}').replace('{n}', U.num(p.hargaPoin - punya))) +
                    '</button>';
              })()
            : '') +
      '</div>' +
    '</div>';
  }

  function kartuVoucher(v, opsi) {
    opsi = opsi || {};
    var st = VOUCHER.STATUS[v.status] || {};
    var J = VOUCHER.JENIS[v.jenis] || {};
    var kadaluarsaDekat = v.status === 'aktif' && v.berlakuHingga &&
      U.diffDays(U.iso(v.berlakuHingga), U.today()) <= 14;
    return '<div class="vcr vcr--milik' + (v.status !== 'aktif' ? ' mati' : '') + '">' +
      '<div class="vcr__pita ' + U.esc(v.jenis) + '">' + (v.ic || J.ic) + '</div>' +
      '<div class="vcr__body">' +
        '<div class="row"><b>' + U.esc(v.nama) + '</b>' +
          '<span class="chip chip--' + (st.c || 'muted') + ' chip--xs">' + U.esc(st.t) + '</span></div>' +
        '<div class="vcr__nilai">' + U.esc(VOUCHER.nilaiTeks(v)) + '</div>' +
        '<div class="vcr__kode">' + U.esc(v.kode) + '</div>' +
        '<div class="tbl-sub">' +
          (v.status === 'aktif'
            ? T('berlaku sampai') + ' ' + U.tgl(v.berlakuHingga)
            : v.dipakaiPada ? T('dipakai') + ' ' + U.tgl(v.dipakaiPada) : '') +
          (v.dariId ? ' · ' + T('hadiah dari') + ' ' + U.esc(BIZ.nama(v.dariId)) : '') +
        '</div>' +
        (v.pesan ? '<div class="vcr__pesan">💌 ' + U.esc(v.pesan) + '</div>' : '') +
        (v.hasilUndian
          ? '<div class="vcr__menang">🎉 ' + T('Menang') + ': ' + U.esc(v.hasilUndian.hadiah) +
            (v.hasilUndian.nilai ? ' — ' + U.rp(v.hasilUndian.nilai) + ' ' + T('masuk Dompet') : '') + '</div>'
          : '') +
        (kadaluarsaDekat
          ? '<div class="tbl-sub" style="color:var(--warn)">⏳ ' +
            T('tinggal') + ' ' + U.diffDays(U.iso(v.berlakuHingga), U.today()) + ' ' + T('hari lagi') + '</div>'
          : '') +
      '</div>' +
      '<div class="vcr__aksi">' +
        (v.status === 'aktif' && v.jenis === 'pelatihan'
          ? '<button class="btn btn--sm" data-act="tebus" data-id="' + U.esc(v.id) + '">🎓 ' +
            T('Buka kursus') + '</button>' : '') +
        (v.status === 'aktif' && (v.jenis === 'nilai' || v.jenis === 'diskon')
          ? '<span class="tbl-sub" style="text-align:right">' +
            T('Pilih saat checkout') + '</span>' : '') +
        (v.status === 'aktif' && v.jenis === 'undian'
          ? '<span class="tbl-sub" style="text-align:right">' + T('Menunggu diundi') + '</span>' : '') +
        (opsi.salin
          ? '<button class="btn btn--ghost btn--sm" data-act="salin-kode" data-k="' + U.esc(v.kode) + '">' +
            T('Salin kode') + '</button>' : '') +
      '</div>' +
    '</div>';
  }

  /* ================================================================ HALAMAN KLIEN */
  function renderUser() {
    var u = me();
    /* Tiket undian dipisah dari voucher biasa juga di sisi klien: yang satu
       dipakai saat belanja, yang satu lagi hanya ditunggu hasilnya. Menyatukan
       keduanya membuat orang mencari tombol "pakai" pada tiket yang memang
       tidak punya tombol itu. */
    var semua = VOUCHER.milik(u.id);
    var milik = semua.filter(function (v) { return v.jenis !== 'undian'; });
    var tiket = semua.filter(function (v) { return v.jenis === 'undian'; });
    var aktif = VOUCHER.aktifMilik(u.id).filter(function (v) { return v.jenis !== 'undian'; });
    var dikirim = VOUCHER.hadiahDari(u.id).filter(function (v) { return v.pemilikId !== u.id; });

    return '<div class="page">' +
      UI.tabs([
        { key: 'beli', label: T('Beli Voucher') },
        { key: 'poin', label: T('Tukar dengan') + ' ' + POIN.nama() },
        { key: 'saya', label: T('Voucher Saya'), n: aktif.length },
        { key: 'tiket', label: T('Tiket Undian'), n: tiket.filter(function (v) {
            return v.status === 'aktif'; }).length },
        { key: 'hadiah', label: T('Hadiah Terkirim'), n: dikirim.length }
      ], tabUser, 'tab-v') +

      '<div class="mt-3">' +
        (tabUser === 'beli' ? tabBeli()
        : tabUser === 'poin' ? tabPoin()
        : tabUser === 'tiket' ? tabTiket(tiket)
        : tabUser === 'hadiah' ? tabHadiah(dikirim)
        : tabSaya(milik)) +
      '</div>' +
    '</div>';
  }

  function tabBeli() {
    var list = VOUCHER.bisaDibeli();
    return UI.alert('brand', '<b>' + T('Voucher bisa dibeli untuk diri sendiri atau dihadiahkan.') + '</b> ' +
        T('Voucher hadiah dikirim beserta kodenya — penerima cukup memasukkan kode itu di ' +
          'menu Voucher, dan tidak perlu sudah punya akun saat Anda membelinya.'), '🎁') +
      (list.length
        ? '<div class="mt-3">' + list.map(function (p) { return kartuProduk(p, 'beli'); }).join('') + '</div>'
        : UI.empty('🎟️', T('Belum ada voucher dijual'),
            T('Admin belum menayangkan voucher yang bisa dibeli.')));
  }

  function tabPoin() {
    var list = VOUCHER.bisaDitukarPoin();
    return UI.alert('brand', '<b>' + POIN.nama() + ' ' + T('Anda') + ': ' +
        U.num(POIN.saldo(me().id)) + '</b> — ' +
        T('tukarkan dengan voucher di bawah. Poin yang sudah ditukar tidak dapat dikembalikan.'),
        '🎁') +
      (list.length
        ? '<div class="mt-3">' + list.map(function (p) { return kartuProduk(p, 'poin'); }).join('') + '</div>'
        : UI.empty('🎁', T('Belum ada voucher yang bisa ditukar poin'), ''));
  }

  function tabSaya(milik) {
    return UI.card({ title: T('Punya kode voucher?'),
      sub: T('Masukkan kode hadiah yang Anda terima'),
      body: '<div class="row" style="gap:8px;align-items:flex-end">' +
          UI.field({ name: 'kodeKlaim', label: T('Kode voucher'),
            placeholder: 'EXV-XXXX-XXXX-XXXX' }) +
          '<button class="btn" data-act="klaim">' + T('Klaim') + '</button>' +
        '</div>' }) +

      (milik.length
        ? '<div class="mt-3">' + milik.map(function (v) {
            return kartuVoucher(v, { salin: true }); }).join('') + '</div>'
        : UI.empty('🎟️', T('Belum punya voucher'),
            T('Beli voucher, tukarkan poin, atau klaim kode hadiah dari teman.')));
  }

  function tabTiket(tiket) {
    if (!tiket.length) {
      return UI.empty('🎰', T('Belum punya tiket undian'),
        T('Beli tiket di tab Beli Voucher, atau tukarkan poin Anda. Semakin banyak ' +
          'tiket, semakin besar peluang menang.'));
    }
    var menang = tiket.filter(function (v) { return v.status === 'menang'; });
    var nunggu = tiket.filter(function (v) { return v.status === 'aktif'; });
    return (menang.length
      ? UI.alert('brand', '<b>🎉 ' + T('Anda memenangkan') + ' ' + menang.length + ' ' +
          T('undian!') + '</b> ' + T('Hadiah uang sudah masuk ke Dompet Anda.'), '🏆')
      : nunggu.length
        ? UI.alert('brand', '<b>' + nunggu.length + ' ' + T('tiket Anda menunggu diundi.') + '</b> ' +
            T('Pengundian dijalankan admin — hasilnya muncul di sini dan dikabarkan lewat WhatsApp.'),
            '🎰')
        : '') +
      '<div class="mt-3">' + tiket.map(function (v) {
        return kartuVoucher(v, { salin: false }); }).join('') + '</div>';
  }

  function tabHadiah(dikirim) {
    if (!dikirim.length) {
      return UI.empty('💌', T('Belum ada hadiah terkirim'),
        T('Voucher yang Anda belikan untuk orang lain akan muncul di sini beserta ' +
          'status klaimnya.'));
    }
    return UI.card({ title: T('Hadiah yang Anda kirim'), flush: true,
      body: dikirim.map(function (v) {
        return '<div class="row" style="padding:11px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
          '<span style="font-size:20px">' + (v.ic || '🎁') + '</span>' +
          '<div style="min-width:0;flex:1"><b style="font-size:12.8px">' + U.esc(v.nama) + '</b>' +
            '<div class="tbl-sub">' + T('untuk') + ' ' + U.esc(v.penerimaNama || '—') +
              (v.penerimaKontak ? ' · ' + U.esc(v.penerimaKontak) : '') + '</div>' +
            '<div class="vcr__kode">' + U.esc(v.kode) + '</div></div>' +
          '<div style="text-align:right">' +
            (v.pemilikId
              ? '<span class="chip chip--ok chip--xs">✓ ' + T('sudah diklaim') + '</span>'
              : '<span class="chip chip--warn chip--xs">' + T('belum diklaim') + '</span>') +
            '<div><button class="btn btn--ghost btn--sm mt-1" data-act="salin-kode" ' +
              'data-k="' + U.esc(v.kode) + '">' + T('Salin kode') + '</button></div>' +
          '</div></div>';
      }).join('') });
  }

  /* ================================================================ AKSI KLIEN */
  function aksiUser(root) {
    var map = {
      'tab-v': function (el) { tabUser = el.getAttribute('data-key'); APP.refresh(); },

      'salin-kode': function (el) {
        var k = el.getAttribute('data-k');
        navigator.clipboard.writeText(k).then(
          function () { UI.toast(T('Kode disalin') + ': ' + k, 'ok'); },
          function () { UI.toast(k, 'info'); });
      },

      klaim: function () {
        var f = document.getElementById('f_kodeKlaim');
        try {
          var v = VOUCHER.klaim(f ? f.value : '', me().id);
          UI.toast(T('Berhasil') + ' — ' + v.nama + ' ' + T('masuk ke akun Anda.'), 'ok');
          APP.refresh();
        } catch (e) { UI.toast(e.message, 'err'); }
      },

      beli: function (el) { dialogBeli(el.getAttribute('data-id'), false); },
      hadiah: function (el) { dialogBeli(el.getAttribute('data-id'), true); },

      'tukar-poin': function (el) {
        var p = VOUCHER.produk(el.getAttribute('data-id'));
        if (!p) return;
        UI.konfirm({
          title: T('Tukar poin dengan voucher'),
          htmlText: T('Tukarkan') + ' <b>' + U.num(p.hargaPoin) + ' ' + POIN.nama() + '</b> ' +
            T('dengan') + ' <b>' + U.esc(p.nama) + '</b>?<br><br>' +
            T('Poin yang sudah ditukar tidak dapat dikembalikan.'),
          okText: T('Ya, tukar')
        }).then(function (ya) {
          if (!ya) return;
          try {
            var v = POIN.tukarVoucher(me().id, p.id);
            UI.toast(T('Berhasil') + ' — ' + T('kode') + ' ' + v.kode, 'ok');
            tabUser = 'saya';
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      tebus: function (el) {
        var v = DB.find('voucher', el.getAttribute('data-id'));
        var kur = v && DB.find('kursus', (v.ketentuan || {}).kursusId);
        UI.konfirm({
          title: T('Buka kursus'),
          htmlText: T('Voucher ini akan ditebus untuk membuka') + ' <b>' +
            U.esc(kur ? kur.judul : '-') + '</b>.<br><br>' +
            T('Setelah ditebus voucher tidak bisa dipakai lagi, tetapi akses kursusnya tetap.'),
          okText: T('Ya, buka kursusnya')
        }).then(function (ya) {
          if (!ya) return;
          VOUCHER.tebusPelatihan(v.id);
          UI.toast(T('Kursus terbuka — buka menu Belajar untuk mulai.'), 'ok');
          APP.refresh();
        });
      }
    };
    U.delegate(root, map);
  }

  /**
   * Pembelian voucher.
   *
   * Dibayar dari saldo Dompet. Alasannya bukan kemudahan, melainkan urutan
   * yang benar: voucher bernilai uang adalah kartu hadiah, dan kartu hadiah
   * tidak boleh terbit sebelum uangnya benar-benar ada. Saldo dompet sudah
   * pasti ada; tagihan yang belum dibayar belum tentu.
   */
  function dialogBeli(produkId, hadiah) {
    var p = VOUCHER.produk(produkId);
    if (!p) return;
    var u = me();
    var saldo = DOMPET.saldo(u.id);
    var cukup = saldo >= p.hargaJual;

    var kandidat = DB.all('users').filter(function (x) {
      return x.aktif && x.id !== u.id && ['client', 'worker', 'seller'].indexOf(x.role) >= 0; });

    UI.formModal({
      title: hadiah ? T('Hadiahkan voucher') : T('Beli voucher'),
      sub: p.nama + ' • ' + U.rp(p.hargaJual), size: 'wide',
      okText: hadiah ? T('Beli & Kirim Hadiah') : T('Beli Sekarang'),
      intro:
        '<div class="vcr vcr--pratinjau">' +
          '<div class="vcr__pita ' + U.esc(p.jenis) + '">' + (p.ic || '🎟️') + '</div>' +
          '<div class="vcr__body"><b>' + U.esc(p.nama) + '</b>' +
            '<div class="vcr__nilai">' + U.esc(VOUCHER.nilaiTeks({ jenis: p.jenis, ketentuan: p })) + '</div>' +
            '<div class="tbl-sub">' + U.esc((VOUCHER.JENIS[p.jenis] || {}).ket) + '</div></div>' +
        '</div>' +
        UI.alert(cukup ? 'brand' : 'danger',
          '<b>' + T('Saldo Dompet Anda') + ': ' + U.rp(saldo) + '</b> — ' +
          (cukup
            ? T('cukup. Setelah pembelian sisa') + ' ' + U.rp(saldo - p.hargaJual) + '.'
            : T('kurang') + ' ' + U.rp(p.hargaJual - saldo) + '. ' +
              T('Isi saldo lebih dulu lewat menu Dompet — voucher bernilai uang hanya ' +
                'diterbitkan setelah dananya benar-benar ada.')),
          cukup ? '💰' : '⛔') + '<div class="mb-3"></div>',
      fields: hadiah
        ? [
            { name: 'penerimaTipe', label: T('Penerima'), type: 'select', value: 'pengguna',
              options: [{ value: 'pengguna', label: T('Pengguna EXOCLEAN yang sudah terdaftar') },
                        { value: 'luar', label: T('Orang lain — kirim kodenya sendiri') }] },
            { name: 'penerimaId', label: T('Pilih pengguna'), type: 'select',
              options: kandidat.map(function (x) {
                return { value: x.id, label: x.nama + ' — ' + (x.perusahaan || x.email || '') }; }) },
            { name: 'penerimaNama', label: T('Nama penerima'),
              hint: T('Diisi bila penerimanya belum punya akun.') },
            { name: 'penerimaKontak', label: T('Nomor HP / email penerima') },
            { name: 'pesan', label: T('Pesan untuk penerima'), type: 'textarea', rows: 2,
              placeholder: T('mis. Selamat ulang tahun! Semoga bermanfaat.') }
          ]
        : [],
      validate: function (d) {
        if (!cukup) return T('Saldo Dompet tidak mencukupi. Isi saldo lebih dulu.');
        if (hadiah && d.penerimaTipe === 'luar' && !String(d.penerimaNama || '').trim()) {
          return T('Isi nama penerima supaya Anda sendiri ingat voucher ini untuk siapa.');
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      try {
        var pemilikId = null, nama = '', kontak = '';
        if (hadiah) {
          if (d.penerimaTipe === 'pengguna') {
            pemilikId = d.penerimaId;
            var pu = BIZ.user(pemilikId);
            nama = pu ? pu.nama : '';
            kontak = pu ? (pu.telp || pu.email || '') : '';
          } else {
            nama = String(d.penerimaNama || '').trim();
            kontak = String(d.penerimaKontak || '').trim();
          }
        } else {
          pemilikId = u.id;
        }

        var v = VOUCHER.terbitkan(p.id, {
          asal: 'beli', pemilikId: pemilikId,
          dariId: hadiah ? u.id : null, hadiah: !!hadiah,
          pesan: d.pesan || '', penerimaNama: nama, penerimaKontak: kontak,
          hargaBayar: p.hargaJual
        });

        /* Dana ditarik SETELAH voucher berhasil terbit — kalau penerbitannya
           gagal (kuota habis, misalnya), saldo tidak boleh sudah berkurang. */
        DOMPET.debit(u.id, p.hargaJual, 'biaya',
          T('Pembelian voucher') + ' ' + p.nama + ' — ' + v.kode, { tipe: 'voucher', id: v.id });

        if (hadiah && pemilikId && window.WA) {
          DB.insert('waOutbox', { to: pemilikId, template: 'manual', status: 'antre', sentAt: null,
            refType: 'voucher', refId: v.id,
            pesan: (function () {
              var w = I18N.pesanUntuk(pemilikId);
              return '*' + w('ADA HADIAH UNTUK ANDA') + '* 🎁\n\n' +
                w('{nama} mengirimkan *{hadiah}*')
                  .replace('{nama}', U.esc(u.nama)).replace('{hadiah}', p.nama) +
                (d.pesan ? '\n\n_"' + d.pesan + '"_' : '') + '\n\n' +
                w('Kode:') + ' *' + v.kode + '*\n' +
                w('Berlaku sampai') + ' ' + U.tgl(v.berlakuHingga) + '\n\n' +
                w('Buka menu Voucher di aplikasi EXOCLEAN untuk mengklaimnya.');
            })() });
        }

        tutupSemuaModal();
        dialogSukses(v, hadiah, nama);
        APP.refresh();
      } catch (e) { UI.toast(e.message, 'err'); }
    });
  }

  function tutupSemuaModal() {
    document.querySelectorAll('.modal-back').forEach(function (m) { m.remove(); });
    document.body.style.overflow = '';
  }

  function dialogSukses(v, hadiah, namaPenerima) {
    UI.modal({
      title: hadiah ? T('Hadiah terkirim 🎁') : T('Voucher terbit 🎟️'), size: 'narrow',
      body: kartuVoucher(v, {}) +
        (hadiah
          ? UI.alert('brand', T('Kode di atas sudah dikirimkan ke') + ' <b>' +
              U.esc(namaPenerima || '-') + '</b>. ' +
              T('Bila penerimanya belum punya akun, salin kodenya dan kirimkan sendiri — ' +
                'voucher ini melekat pada kode, bukan pada akun.'), '💌')
          : UI.alert('brand', T('Voucher ini akan otomatis muncul sebagai pilihan saat Anda ' +
              'checkout, selama syaratnya terpenuhi.'), 'ℹ️')),
      foot: '<button class="btn btn--ghost" data-act="salin-kode" data-k="' + U.esc(v.kode) + '">' +
          T('Salin kode') + '</button>' +
        '<button class="btn" data-close>' + T('Selesai') + '</button>',
      actions: {
        'salin-kode': function (el) {
          navigator.clipboard.writeText(el.getAttribute('data-k')).then(function () {
            UI.toast(T('Kode disalin'), 'ok'); });
        }
      }
    });
  }

  /* ================================================================ HALAMAN ADMIN */
  function renderAdmin() {
    var s = VOUCHER.statistik();
    return '<div class="page">' +
      UI.alert('brand', '<b>' + T('Anda menentukan seluruh nilai voucher di sini.') + '</b> ' +
        T('Jenis, nilai rupiah, persentase beserta batas atasnya, harga jual, harga poin, ' +
          'masa berlaku, kuota, dan di mana voucher boleh dipakai. Ketentuan dibekukan saat ' +
          'voucher terbit — mengubah katalog tidak pernah menyusutkan voucher yang sudah ' +
          'di tangan orang.'), '🎟️') +

      '<div class="row wrap mt-2" style="gap:8px">' +
        UI.stat({ label: T('Voucher beredar'), value: U.num(s.aktif), icon: '🎟️', small: true,
          meta: T('kewajiban') + ' ' + U.rp(s.kewajibanRp) }) +
        UI.stat({ label: T('Sudah dipakai'), value: U.num(s.terpakai), icon: '✅', small: true }) +
        UI.stat({ label: T('Dibeli'), value: U.num(s.dibeli), icon: '💰', small: true,
          meta: U.rp(s.pendapatan) }) +
        UI.stat({ label: T('Dari poin'), value: U.num(s.dariPoin), icon: '🎁', small: true }) +
        UI.stat({ label: T('Hadiah belum diklaim'), value: U.num(s.belumDiklaim), icon: '💌', small: true }) +
      '</div>' +

      UI.tabs([
        { key: 'katalog', label: T('Katalog Voucher'), n: katalogVoucher().length },
        { key: 'terbit', label: T('Voucher Terbit'), n: s.total }
      ], tabAdmin, 'tab-a') +

      '<div class="mt-3">' +
        (tabAdmin === 'terbit' ? tabTerbit() : tabKatalog()) +
      '</div>' +
    '</div>';
  }

  /** Undian punya halamannya sendiri, jadi tidak ikut muncul di katalog ini. */
  function katalogVoucher() {
    return VOUCHER.semuaProduk().filter(function (p) { return p.jenis !== 'undian'; });
  }

  function tabKatalog() {
    var list = katalogVoucher();
    return UI.card({ title: T('Katalog voucher'), sub: list.length + ' ' + T('produk'),
      tools: '<button class="btn btn--sm" data-act="produk-baru">+ ' + T('Voucher baru') + '</button>',
      flush: true,
      body: list.length
        ? list.map(function (p) {
          var sisa = VOUCHER.sisaKuota(p);
          var J = VOUCHER.JENIS[p.jenis] || {};
          return '<div class="aturan' + (p.aktif === false ? ' mati' : '') + '">' +
            '<label class="check" style="flex:none"><input type="checkbox" ' +
              'data-change="aktif-produk" data-id="' + U.esc(p.id) + '"' +
              (p.aktif !== false ? ' checked' : '') + '></label>' +
            '<span style="font-size:19px;flex:none">' + (p.ic || J.ic) + '</span>' +
            '<div style="min-width:0;flex:1">' +
              '<b>' + U.esc(p.nama) + '</b>' +
              '<div class="tbl-sub">' + U.esc(J.nama) + ' · ' +
                U.esc(VOUCHER.nilaiTeks({ jenis: p.jenis, ketentuan: p })) +
                ' · ' + T('berlaku') + ' ' + p.masaBerlakuHari + ' ' + T('hari') +
                (sisa !== null ? ' · ' + T('sisa kuota') + ' ' + sisa + '/' + p.kuota : '') + '</div>' +
              '<div class="tbl-sub">' +
                (p.hargaJual ? '💰 ' + U.rp(p.hargaJual) : '') +
                (p.hargaJual && p.hargaPoin ? ' · ' : '') +
                (p.hargaPoin ? '🎁 ' + U.num(p.hargaPoin) + ' ' + U.esc(POIN.nama()) : '') +
                (!p.hargaJual && !p.hargaPoin
                  ? '<span style="color:var(--danger)">⚠️ ' + T('tanpa harga — tidak bisa didapat siapa pun') + '</span>'
                  : '') +
              '</div>' +
            '</div>' +
            '<button class="btn btn--ghost btn--sm" data-act="produk-ubah" data-id="' + U.esc(p.id) + '">' +
              T('Ubah') + '</button>' +
            '<button class="btn btn--ghost btn--sm btn--icon" data-act="produk-hapus" ' +
              'data-id="' + U.esc(p.id) + '" title="' + T('Hapus') + '">✕</button>' +
          '</div>';
        }).join('')
        : UI.empty('🎟️', T('Belum ada produk voucher'),
            T('Buat voucher pertama — Anda yang menentukan jenis dan nilainya.')) });
  }

  function tabTerbit() {
    var list = U.sortBy(DB.all('voucher'), function (v) { return v.createdAt; }, true);
    if (!list.length) {
      return UI.card({ body: UI.empty('🎟️', T('Belum ada voucher terbit'),
        T('Voucher muncul di sini begitu ada yang dibeli, ditukar poin, atau Anda terbitkan sendiri.')) });
    }
    return UI.card({ title: T('Voucher yang sudah terbit'), sub: list.length + ' ' + T('voucher'),
      tools: '<button class="btn btn--sm" data-act="terbit-manual">+ ' + T('Terbitkan manual') + '</button>',
      flush: true,
      body: list.slice(0, 80).map(function (v) {
        var st = VOUCHER.STATUS[v.status] || {};
        return '<div class="row" style="padding:10px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
          '<span style="font-size:18px">' + (v.ic || '🎟️') + '</span>' +
          '<div style="min-width:0;flex:1">' +
            '<b style="font-size:12.6px">' + U.esc(v.nama) + '</b>' +
            '<div class="vcr__kode">' + U.esc(v.kode) + '</div>' +
            '<div class="tbl-sub">' +
              (v.pemilikId ? U.esc(BIZ.nama(v.pemilikId)) : '<i>' + T('belum diklaim') + '</i>') +
              (v.dariId ? ' · ' + T('hadiah dari') + ' ' + U.esc(BIZ.nama(v.dariId)) : '') +
              ' · ' + T('asal') + ' ' + U.esc(v.asal) +
              ' · ' + U.tgl(v.createdAt) + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<span class="chip chip--' + (st.c || 'muted') + ' chip--xs">' + U.esc(st.t) + '</span>' +
            '<div class="tbl-sub mt-1">' + U.esc(VOUCHER.nilaiTeks(v)) + '</div>' +
          '</div>' +
          (v.status === 'aktif'
            ? '<button class="btn btn--ghost btn--sm btn--icon" data-act="batalkan" ' +
              'data-id="' + U.esc(v.id) + '" title="' + T('Batalkan voucher') + '">✕</button>' : '') +
        '</div>';
      }).join('') });
  }

  /* ================================================================ AKSI ADMIN */
  function aksiAdmin(root) {
    var map = AKSES.lindungi({
      'tab-a': function (el) { tabAdmin = el.getAttribute('data-key'); APP.refresh(); },

      'aktif-produk': function (el) {
        VOUCHER.simpanProduk(
          Object.assign({}, VOUCHER.produk(el.getAttribute('data-id')), { aktif: el.checked }),
          el.getAttribute('data-id'));
        APP.refresh();
      },
      'produk-baru': function () { dialogProduk(null); },
      'produk-ubah': function (el) { dialogProduk(el.getAttribute('data-id')); },
      'produk-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var p = VOUCHER.produk(id);
        var terbit = DB.where('voucher', { produkId: id }).length;
        UI.konfirm({
          title: T('Hapus produk voucher?'), danger: true,
          htmlText: U.esc(p.nama) + (terbit
            ? '<br><br>⚠️ <b>' + terbit + ' ' + T('voucher') + '</b> ' + T('sudah terbit dari produk ini.') + ' ' +
              T('Voucher itu TETAP berlaku — ketentuannya sudah dibekukan pada masing-masing ' +
                'voucher. Yang hilang hanya kemampuan menerbitkan yang baru.')
            : ''),
          okText: T('Ya, hapus')
        }).then(function (ya) {
          if (!ya) return;
          DB.remove('voucherProduk', id);
          UI.toast(T('Produk voucher dihapus.'), 'ok');
          APP.refresh();
        });
      },

      batalkan: function (el) {
        var v = DB.find('voucher', el.getAttribute('data-id'));
        UI.konfirm({ title: T('Batalkan voucher?'), danger: true,
          htmlText: U.esc(v.nama) + ' — <span class="code">' + U.esc(v.kode) + '</span>' +
            '<br><br>' + T('Pemiliknya tidak akan bisa memakainya lagi. Pakai ini hanya untuk ' +
            'voucher yang terbit karena kekeliruan.'),
          okText: T('Ya, batalkan')
        }).then(function (ya) {
          if (!ya) return;
          DB.update('voucher', v.id, { status: 'dibatalkan' });
          DB.log(me().id, 'voucher.batal', 'voucher', v.id, v.kode);
          APP.refresh();
        });
      },

      'terbit-manual': function () {
        var list = VOUCHER.produkAktif();
        if (!list.length) { UI.toast(T('Buat produk voucher lebih dulu.'), 'warn'); return; }
        var kandidat = DB.all('users').filter(function (x) { return x.aktif; });
        UI.formModal({
          title: T('Terbitkan voucher manual'), size: 'wide',
          intro: UI.alert('warn', T('Voucher yang diterbitkan di sini tidak dibayar dan tidak ' +
            'menukar poin — ia langsung menjadi beban perusahaan. Tercatat atas nama Anda.'),
            '✍️') + '<div class="mb-3"></div>',
          fields: [
            { name: 'produkId', label: T('Produk voucher'), type: 'select',
              options: list.map(function (p) {
                return { value: p.id, label: p.nama + ' — ' +
                  VOUCHER.nilaiTeks({ jenis: p.jenis, ketentuan: p }) }; }) },
            { name: 'pemilikId', label: T('Untuk pengguna'), type: 'select',
              options: kandidat.map(function (x) {
                return { value: x.id, label: x.nama + ' — ' + (x.perusahaan || x.email || '') }; }) },
            { name: 'pesan', label: T('Alasan / catatan'), required: true,
              placeholder: T('mis. kompensasi komplain EXO/ORD/2026/0012') }
          ],
          validate: function (d) {
            return String(d.pesan || '').trim().length < 8
              ? T('Tulis alasan yang jelas, minimal 8 huruf.') : null;
          }
        }).then(function (d) {
          if (!d) return;
          try {
            var v = VOUCHER.terbitkan(d.produkId, { asal: 'admin', pemilikId: d.pemilikId,
              pesan: d.pesan, dariId: me().id });
            UI.toast(T('Voucher') + ' ' + v.kode + ' ' + T('diterbitkan.'), 'ok');
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      }
    }, {
      'aktif-produk': 'sistem.voucher', 'produk-baru': 'sistem.voucher',
      'produk-ubah': 'sistem.voucher', 'produk-hapus': 'sistem.voucher',
      batalkan: 'sistem.voucher', 'terbit-manual': 'sistem.voucher'
    });

    U.delegate(root, map);
  }

  /**
   * Formulir produk voucher — di sinilah super admin menentukan seluruh
   * nilainya. Kolom yang tampil menyesuaikan jenisnya, karena "persen" tidak
   * berarti apa-apa pada kartu hadiah dan "nilai rupiah" tidak berarti apa-apa
   * pada tiket undian.
   */
  function dialogProduk(id) {
    var p = id ? VOUCHER.produk(id) : null;
    var kursus = DB.where('kursus', { aktif: true });

    UI.formModal({
      title: p ? T('Ubah voucher') : T('Voucher baru'), size: 'wide',
      okText: T('Simpan'),
      intro: UI.alert('brand',
        T('Kolom yang perlu diisi menyesuaikan jenis voucher. Isi jenisnya lebih dulu, ' +
          'lalu lengkapi kolom yang sesuai — kolom lain boleh dibiarkan nol.'), 'ℹ️') +
        '<div class="mb-3"></div>',
      fields: [
        { name: 'nama', label: T('Nama voucher'), value: p ? p.nama : '', required: true,
          placeholder: T('mis. Voucher Belanja Rp250.000') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: p ? p.jenis : 'nilai',
          /* Undian sengaja tidak ada di sini — ia punya halaman, formulir, dan
             izinnya sendiri, dan ketentuannya cukup berbeda sehingga menyatukan
             formulirnya hanya membuat staf ragu kolom mana yang wajib diisi. */
          options: Object.keys(VOUCHER.JENIS).filter(function (k) { return k !== 'undian'; })
            .map(function (k) {
              return { value: k, label: VOUCHER.JENIS[k].ic + ' ' + VOUCHER.JENIS[k].nama }; }) },
        { name: 'ic', label: T('Ikon (emoji)'), value: p ? p.ic : '🎟️' },
        { name: 'deskripsi', label: T('Deskripsi singkat'), value: p ? p.deskripsi : '' },

        { type: 'html', html: '<div class="field" style="grid-column:1/-1">' +
          '<div class="nav-group" style="color:var(--muted);padding:12px 0 2px">💳 ' +
          T('Nilai — isi yang sesuai jenisnya') + '</div></div>' },
        { name: 'nilai', label: T('Nilai rupiah') + ' — ' + T('jenis Bernilai uang'),
          type: 'number', value: p ? p.nilai : 0, min: 0 },
        { name: 'persen', label: T('Persentase diskon (%)') + ' — ' + T('jenis Diskon'),
          type: 'number', value: p ? p.persen : 0, min: 0 },
        { name: 'maks', label: T('Batas maksimum diskon (Rp)'), type: 'number',
          value: p ? p.maks : 0, min: 0,
          hint: T('Wajib untuk diskon persentase. Tanpa batas, satu transaksi besar bisa ' +
            'menghabiskan margin berbulan-bulan.') },
        { name: 'kursusId', label: T('Kursus yang dibuka') + ' — ' + T('jenis Pelatihan'),
          type: 'select', value: p ? p.kursusId : '',
          options: [{ value: '', label: '— ' + T('tidak dipakai') + ' —' }].concat(
            kursus.map(function (k) { return { value: k.id, label: k.judul }; })) },

        { type: 'html', html: '<div class="field" style="grid-column:1/-1">' +
          '<div class="nav-group" style="color:var(--muted);padding:12px 0 2px">🏷️ ' +
          T('Harga & ketersediaan') + '</div></div>' },
        { name: 'hargaJual', label: T('Harga jual (Rp)'), type: 'number',
          value: p ? p.hargaJual : 0, min: 0,
          hint: T('Isi 0 bila voucher ini tidak dijual.') },
        { name: 'hargaPoin', label: T('Harga dalam') + ' ' + POIN.nama(), type: 'number',
          value: p ? p.hargaPoin : 0, min: 0,
          hint: T('Isi 0 bila tidak bisa ditukar poin.') },
        { name: 'minBelanja', label: T('Minimal belanja (Rp)'), type: 'number',
          value: p ? p.minBelanja : 0, min: 0 },
        { name: 'lingkup', label: T('Berlaku untuk'), type: 'select',
          value: p ? p.lingkup : 'semua',
          options: Object.keys(VOUCHER.LINGKUP).map(function (k) {
            return { value: k, label: VOUCHER.LINGKUP[k] }; }) },
        { name: 'masaBerlakuHari', label: T('Masa berlaku (hari)'), type: 'number',
          value: p ? p.masaBerlakuHari : 90, min: 1 },
        { name: 'kuota', label: T('Kuota terbit'), type: 'number', value: p ? p.kuota : 0, min: 0,
          hint: T('Isi 0 untuk tanpa batas.') },
        { name: 'bolehHadiah', label: T('Boleh dihadiahkan ke orang lain'), type: 'checkbox',
          value: p ? p.bolehHadiah !== false : true },
        { name: 'aktif', label: T('Tayangkan di katalog'), type: 'checkbox',
          value: p ? p.aktif !== false : true }
      ],
      validate: function (d) { return VOUCHER.periksaProduk(d); }
    }).then(function (d) {
      if (!d) return;
      VOUCHER.simpanProduk(d, id);
      UI.toast(p ? T('Voucher diperbarui.') : T('Voucher ditambahkan ke katalog.'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ HALAMAN */
  var halamanUser = {
    label: 'Voucher', icon: '🎟️', grup: 'Akun',
    sub: 'Beli, hadiahkan, tukar poin, dan klaim kode',
    render: renderUser, mount: aksiUser,
    badge: function () { return VOUCHER.aktifMilik(APP.user.id).length; }
  };

  var pagesAdmin = {
    voucher: {
      label: 'Voucher', icon: '🎟️', grup: 'Sistem',
      sub: 'Tentukan jenis, nilai, harga, dan kuota voucher',
      render: renderAdmin, mount: aksiAdmin,
      badge: function () { return VOUCHER.statistik().belumDiklaim; }
    }
  };

  return { halamanUser: halamanUser, pagesAdmin: pagesAdmin,
           kartuVoucher: kartuVoucher, dialogProduk: dialogProduk };
})();
