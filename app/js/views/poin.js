/* ==========================================================================
   views/poin.js — Poin Reward
   Halaman pengguna (klien & mitra) • Halaman ketentuan (super admin)
   ========================================================================== */
var ViewPoin = (function () {

  var T = function (s) { return I18N.t(s); };
  var tab = 'aturan';

  function me() { return APP.user; }
  function tutupModal(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ HALAMAN PENGGUNA */
  function renderUser() {
    var u = me();
    var r = POIN.ringkasUser(u.id);
    var j = r.jenjang;
    var c = POIN.config();

    if (!POIN.aktif()) {
      return '<div class="page">' + UI.empty('⏸️', T('Program poin sedang dinonaktifkan'),
        T('Poin Anda tetap tersimpan dan akan bisa dipakai lagi begitu program diaktifkan.')) + '</div>';
    }

    return '<div class="page">' +

      '<div class="poin-hero" style="--j:' + U.esc(j.warna) + '">' +
        '<div class="poin-hero__kiri">' +
          '<small>' + T('Poin Anda') + '</small>' +
          '<div class="poin-hero__n">' + U.num(r.saldo) + '</div>' +
          '<div class="poin-hero__rp">≈ ' + U.rp(r.nilaiRupiah) + ' ' + T('bila ditukar') + '</div>' +
        '</div>' +
        '<div class="poin-hero__kanan">' +
          '<div class="poin-jenjang">' + j.ic + ' ' + U.esc(j.nama) + '</div>' +
          (j.kali > 1 ? '<div class="poin-kali">×' + j.kali + ' ' + T('perolehan poin') + '</div>' : '') +
          (j.berikut
            ? '<div class="poin-bar"><span style="width:' + j.persen + '%"></span></div>' +
              '<small>' + U.num(j.kurang) + ' ' + T('poin lagi menuju') + ' ' +
              j.berikut.ic + ' ' + U.esc(j.berikut.nama) + '</small>'
            : '<small>' + T('Jenjang tertinggi — terima kasih atas kepercayaannya.') + '</small>') +
        '</div>' +
      '</div>' +

      (r.akanHangus.poin
        ? UI.alert('warn', '<b>' + U.num(r.akanHangus.poin) + ' ' + T('poin akan hangus') + '</b> ' +
            T('pada') + ' ' + U.tglPanjang(r.akanHangus.tanggal) + '. ' +
            T('Tukarkan sebelum tanggal itu supaya tidak terbuang.'), '⏳')
        : '') +

      '<div class="grid g-2-1 mt-3">' +
        '<div>' +
          UI.card({ title: T('Tukarkan poin'),
            sub: T('Poin berlaku') + ' ' + c.kedaluwarsaBulan + ' ' + T('bulan sejak diperoleh'),
            body: POIN.katalogAktif().length
              ? '<div class="grid g-2">' + POIN.katalogAktif().map(function (k) {
                  var cukup = r.saldo >= k.poin;
                  return '<div class="tukar' + (cukup ? '' : ' kurang') + '">' +
                    '<div class="tukar__ic">' + (k.ic || '🎁') + '</div>' +
                    '<div style="min-width:0;flex:1">' +
                      '<b>' + U.esc(k.nama) + '</b>' +
                      '<div class="tbl-sub">' + U.num(k.poin) + ' ' + T('poin') +
                        (k.nilai ? ' · ' + T('senilai') + ' ' + U.rp(k.nilai) : '') + '</div>' +
                      (k.ket ? '<div class="tbl-sub">' + U.esc(k.ket) + '</div>' : '') +
                    '</div>' +
                    '<button class="btn btn--sm' + (cukup ? '' : ' btn--ghost') + '" ' +
                      'data-act="tukar" data-id="' + U.esc(k.id) + '"' + (cukup ? '' : ' disabled') + '>' +
                      (cukup ? T('Tukar')
                        : T('Kurang {n}').replace('{n}', U.num(k.poin - r.saldo))) +
                      '</button>' +
                  '</div>';
                }).join('') + '</div>'
              : '<div class="tbl-sub">' + T('Belum ada item penukaran.') + '</div>' }) +

          UI.card({ title: T('Riwayat poin'), flush: true,
            body: (function () {
              var m = POIN.mutasi(u.id);
              if (!m.length) {
                return UI.empty('✨', T('Belum ada poin'),
                  T('Poin masuk otomatis setiap transaksi Anda tuntas.'));
              }
              return m.slice(0, 40).map(function (x) {
                return '<div class="row" style="padding:10px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
                  '<div style="min-width:0;flex:1">' +
                    '<b style="font-size:12.8px">' + U.esc(x.ket) + '</b>' +
                    '<div class="tbl-sub">' + U.tglJam(x.at) + ' · ' + U.esc(labelJenis(x.jenis)) + '</div>' +
                  '</div>' +
                  '<b style="color:' + (x.poin > 0 ? 'var(--ok)' : 'var(--danger)') + '">' +
                    (x.poin > 0 ? '+' : '') + U.num(x.poin) + '</b>' +
                '</div>';
              }).join('');
            })() }) +
        '</div>' +

        '<div>' +
          UI.card({ title: T('Cara mendapat poin'), flush: true,
            body: Object.keys(c.aturan).filter(function (k) {
                var a = c.aturan[k];
                if (!a.aktif) return false;
                /* Aturan mitra hanya diperlihatkan kepada mitra, dan sebaliknya —
                   daftar yang memuat cara yang tidak mungkin dicapai hanya
                   membuat orang merasa tertinggal tanpa sebab. */
                var utkMitra = k.indexOf('mitra') === 0;
                return utkMitra === (u.role === 'worker');
              }).map(function (k) {
                var a = c.aturan[k];
                return '<div style="padding:9px 2px;border-bottom:1px solid var(--line-2)">' +
                  '<div class="row"><b style="font-size:12.6px">' + U.esc(a.nama) + '</b>' +
                    '<div class="spacer"></div>' +
                    '<span class="chip chip--brand chip--xs">' +
                      (a.per ? '+' + a.poin + ' / ' + U.rpShort(a.per) : '+' + a.poin) + '</span>' +
                  '</div>' +
                  '<div class="tbl-sub">' + U.esc(a.ket) + '</div>' +
                '</div>';
              }).join('') }) +

          (POIN.voucherAktif(u.id).length
            ? UI.card({ title: T('Voucher Anda'), flush: true,
                body: POIN.voucherAktif(u.id).map(function (v) {
                  return '<div class="row" style="padding:9px 2px;border-bottom:1px solid var(--line-2)">' +
                    '<div><b style="font-size:12.6px">' + U.esc(v.nama) + '</b>' +
                      '<div class="tbl-sub">' + U.esc(v.no) + ' · ' + T('berlaku sampai') + ' ' +
                      U.tgl(v.kedaluwarsaAt) + '</div></div>' +
                    '<div class="spacer"></div>' +
                    '<span class="chip chip--ok chip--xs">' + T('aktif') + '</span></div>';
                }).join('') })
            : '') +

          UI.card({ title: T('Jenjang member'), flush: true,
            body: U.sortBy(c.jenjang, function (x) { return x.minPoin; }).map(function (x) {
              var kini = x.kode === j.kode;
              return '<div class="row" style="padding:9px 2px;border-bottom:1px solid var(--line-2);gap:8px' +
                (kini ? ';background:var(--brand-50);border-radius:8px' : '') + '">' +
                '<span style="font-size:17px">' + x.ic + '</span>' +
                '<div><b style="font-size:12.6px">' + U.esc(x.nama) + '</b>' +
                  '<div class="tbl-sub">' + T('mulai') + ' ' + U.num(x.minPoin) + ' ' + T('poin') +
                  (x.kali > 1 ? ' · ×' + x.kali + ' ' + T('perolehan') : '') + '</div></div>' +
                '<div class="spacer"></div>' +
                (kini ? '<span class="chip chip--brand chip--xs">' + T('jenjang Anda') + '</span>' : '') +
              '</div>';
            }).join('') }) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function labelJenis(j) {
    return { perolehan: 'Perolehan', penukaran: 'Penukaran',
             kedaluwarsa: 'Hangus', penyesuaian: 'Penyesuaian admin' }[j] || j;
  }

  function aksiUser(root) {
    U.delegate(root, {
      tukar: function (el) {
        var item = POIN.itemKatalog(el.getAttribute('data-id'));
        if (!item) return;
        UI.konfirm({
          title: T('Tukar poin'),
          htmlText: T('Tukarkan') + ' <b>' + U.num(item.poin) + ' ' + POIN.nama() + '</b> ' +
            T('untuk') + ' <b>' + U.esc(item.nama) + '</b>?' +
            '<br><br>' + T('Poin yang sudah ditukar tidak dapat dikembalikan.'),
          okText: T('Ya, tukar')
        }).then(function (ya) {
          if (!ya) return;
          try {
            var rec = POIN.tukar(me().id, item.id);
            UI.toast(rec.jenis === 'saldo'
              ? T('Berhasil — saldo masuk ke Dompet Anda.')
              : T('Berhasil — voucher') + ' ' + rec.no + ' ' + T('siap dipakai.'), 'ok');
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      }
    });
  }

  /* ================================================================ KETENTUAN (ADMIN) */
  function renderAdmin() {
    var c = POIN.config();
    var s = POIN.statistik();

    return '<div class="page">' +

      (c.aktif
        ? UI.alert('brand', '<b>' + T('Program poin aktif.') + '</b> ' +
            T('Setiap perubahan di halaman ini berlaku untuk poin yang terbit SESUDAHNYA. ' +
              'Poin yang sudah di tangan pengguna memakai ketentuan yang berlaku saat ia ' +
              'diberikan — mengubah aturan tidak pernah menyusutkan poin orang.'), '🎁')
        : UI.alert('warn', '<b>' + T('Program poin dinonaktifkan.') + '</b> ' +
            T('Poin berhenti terbit dan penukaran ditutup, tetapi saldo pengguna tetap utuh.'), '⏸️')) +

      '<div class="row wrap mt-2" style="gap:8px">' +
        UI.stat({ label: T('Poin beredar'), value: U.num(s.beredar), icon: '🎁', small: true,
          meta: T('kewajiban') + ' ' + U.rp(s.kewajibanRp) }) +
        UI.stat({ label: T('Total terbit'), value: U.num(s.terbit), icon: '📈', small: true }) +
        UI.stat({ label: T('Sudah ditukar'), value: U.num(s.tertukar), icon: '🎟️', small: true,
          meta: s.penukaran + ' ' + T('penukaran') }) +
        UI.stat({ label: T('Hangus'), value: U.num(s.hangus), icon: '⏳', small: true }) +
      '</div>' +

      UI.tabs([
        { key: 'aturan', label: T('Aturan Perolehan') },
        { key: 'jenjang', label: T('Jenjang Member') },
        { key: 'katalog', label: T('Katalog Penukaran') },
        { key: 'umum', label: T('Ketentuan Umum') },
        { key: 'riwayat', label: T('Riwayat & Pengguna') }
      ], tab, 'tab') +

      '<div class="mt-3">' +
        (tab === 'aturan' ? tabAturan(c)
        : tab === 'jenjang' ? tabJenjang(c)
        : tab === 'katalog' ? tabKatalog(c)
        : tab === 'umum' ? tabUmum(c)
        : tabRiwayat()) +
      '</div>' +
    '</div>';
  }

  /**
   * Terjemahkan satu aturan menjadi akibatnya yang sebenarnya.
   *
   * Angka "1 poin per Rp10.000" tidak memberi tahu apa pun tentang biaya
   * program. Yang memberi tahu adalah PERSENNYA: 1 poin per Rp10.000 dengan
   * nilai tukar Rp100 berarti perusahaan memberi 1% dari setiap belanja.
   * Itulah angka yang harus dilihat sebelum menaikkan atau menurunkan aturan.
   */
  function pratinjau(k) {
    var c = POIN.config();
    var a = c.aturan[k];
    if (!a || !a.per) return '';
    var contoh = 500000;
    var poin = Math.floor(contoh / a.per) * a.poin;
    var rp = poin * (c.nilaiTukar || 0);
    var persen = contoh ? (rp / contoh * 100) : 0;
    return T('Belanja') + ' <b>' + U.rp(contoh) + '</b> → <b>' + U.num(poin) + ' ' + U.esc(c.nama) +
      '</b> · setara ' + U.rp(rp) +
      ' <span class="aturan__persen">' + persen.toFixed(persen < 1 ? 2 : 1) +
      T('% dari nilai belanja') + '</span>';
  }

  function tabAturan(c) {
    function baris(k) {
      var a = c.aturan[k];
      return '<div class="aturan' + (a.aktif ? '' : ' mati') + '">' +
        '<label class="check" style="flex:none">' +
          '<input type="checkbox" data-change="aktif-aturan" data-k="' + U.esc(k) + '"' +
          (a.aktif ? ' checked' : '') + '></label>' +
        '<div style="min-width:0;flex:1">' +
          '<b>' + U.esc(a.nama) + '</b>' +
          '<div class="tbl-sub">' + U.esc(a.ket) + '</div>' +
          (a.per ? '<div class="aturan__prat" data-prat="' + U.esc(k) + '">' +
            pratinjau(k) + '</div>' : '') +
        '</div>' +
        (a.per
          ? '<div class="aturan__set">' +
              '<label><span>' + T('setiap Rp') + '</span>' +
                '<input class="input" type="number" min="1000" step="1000" value="' + a.per +
                '" data-change="set-per" data-k="' + U.esc(k) + '"></label>' +
              '<label><span>' + T('dapat') + '</span>' +
                '<input class="input" type="number" min="0" value="' + a.poin +
                '" data-change="set-poin" data-k="' + U.esc(k) + '"></label>' +
            '</div>'
          : '<div class="aturan__set">' +
              '<label><span>' + T('poin') + '</span>' +
                '<input class="input" type="number" min="0" value="' + a.poin +
                '" data-change="set-poin" data-k="' + U.esc(k) + '"></label>' +
            '</div>') +
      '</div>';
    }

    var klien = Object.keys(c.aturan).filter(function (k) { return k.indexOf('mitra') !== 0; });
    var mitra = Object.keys(c.aturan).filter(function (k) { return k.indexOf('mitra') === 0; });

    /* Aturan pokok dinaikkan ke atas dan ditulis sebagai kalimat, bukan
       sebagai deretan angka. Inilah janji yang dibaca pelanggan di iklan dan
       yang paling sering ditanyakan — jadi ia pantas menjadi hal pertama yang
       terlihat, bukan tersembunyi di antara sembilan aturan lain. */
    var jasa = c.aturan.belanjaJasa, toko = c.aturan.belanjaToko;
    var samaKeduanya = jasa.per === toko.per && jasa.poin === toko.poin;

    return UI.alert(samaKeduanya && jasa.aktif && toko.aktif ? 'brand' : 'warn',
      '<b>' + T('Aturan pokok') + ': ' +
      (samaKeduanya
        ? T('setiap belanja') + ' <b>' + U.rp(jasa.per) + '</b> = <b>' +
          U.num(jasa.poin) + ' ' + U.esc(c.nama) + '</b>'
        : T('jasa') + ' ' + U.rp(jasa.per) + '/' + jasa.poin + ' ' + T('poin') + ', ' +
          T('toko') + ' ' + U.rp(toko.per) + '/' + toko.poin + ' ' + T('poin') +
          ' — <b>' + T('berbeda antara jasa dan toko') + '</b>') + '</b>' +
      (!jasa.aktif || !toko.aktif
        ? ' — ⚠️ ' + T('salah satu sedang dimatikan, jadi tidak berlaku untuk semua belanja') : '') +
      '<div class="tbl-sub mt-1">' +
        T('Ubah angkanya langsung di baris di bawah. Perubahan berlaku untuk poin yang ' +
          'terbit sesudahnya; poin yang sudah di tangan pelanggan tidak ikut berubah.') +
      '</div>', '📌') +

      UI.card({ title: T('Perolehan untuk klien'),
      sub: T('Berapa poin diberikan, dan atas kejadian apa'),
      body: klien.map(baris).join('') }) +

      UI.card({ title: T('Perolehan untuk mitra'),
        sub: T('Sengaja menghargai MUTU, bukan jumlah pekerjaan'),
        body: mitra.map(baris).join('') +
          '<p class="tbl-sub mt-2">' +
          T('Poin mitra yang dikaitkan pada jumlah pekerjaan akan mendorong orang ' +
            'mengejar volume dan mengorbankan hasil. Karena itu bobot terbesar ada ' +
            'pada lulus QC dan nilai lima dari klien.') + '</p>' });
  }

  function tabJenjang(c) {
    return UI.alert('brand',
      T('Jenjang dinilai dari poin yang DIPEROLEH dalam') + ' ' + c.jenjangBulan + ' ' +
      T('bulan terakhir — bukan dari saldo. Kalau memakai saldo, menukarkan poin akan ' +
        'menurunkan jenjang, dan pelanggan jadi menimbun poin alih-alih memakainya.'), 'ℹ️') +

      UI.card({ title: T('Jenjang member'),
        tools: '<button class="btn btn--sm" data-act="tambah-jenjang">+ ' + T('Tambah jenjang') + '</button>',
        body: U.sortBy(c.jenjang, function (j) { return j.minPoin; }).map(function (j, i) {
          return '<div class="aturan">' +
            '<span style="font-size:20px;flex:none">' + j.ic + '</span>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(j.nama) + '</b>' +
              '<div class="tbl-sub">' + T('kode') + ' ' + U.esc(j.kode) + '</div></div>' +
            '<div class="aturan__set">' +
              '<label><span>' + T('mulai poin') + '</span>' +
                '<input class="input" type="number" min="0" step="100" value="' + j.minPoin +
                '" data-change="set-jenjang-min" data-k="' + U.esc(j.kode) + '"></label>' +
              '<label><span>' + T('pengali') + '</span>' +
                '<input class="input" type="number" min="1" step="0.05" value="' + j.kali +
                '" data-change="set-jenjang-kali" data-k="' + U.esc(j.kode) + '"></label>' +
            '</div>' +
            (i === 0
              ? '<span class="chip chip--muted chip--xs">' + T('dasar') + '</span>'
              : '<button class="btn btn--ghost btn--sm btn--icon" data-act="hapus-jenjang" ' +
                'data-k="' + U.esc(j.kode) + '" title="' + T('Hapus') + '">✕</button>') +
          '</div>';
        }).join('') +
        '<div class="row mt-3" style="gap:10px;align-items:flex-end">' +
          UI.field({ name: 'jenjangBulan', label: T('Jendela penilaian (bulan)'),
            type: 'number', value: c.jenjangBulan }) +
          '<button class="btn btn--ghost btn--sm" data-act="simpan-jendela">' + T('Simpan') + '</button>' +
        '</div>' });
  }

  function tabKatalog(c) {
    return UI.card({ title: T('Katalog penukaran'),
      sub: (c.katalog || []).length + ' ' + T('item'),
      tools: '<button class="btn btn--sm" data-act="tambah-item">+ ' + T('Tambah item') + '</button>',
      body: (c.katalog || []).length
        ? (c.katalog || []).map(function (k) {
          return '<div class="aturan' + (k.aktif === false ? ' mati' : '') + '">' +
            '<label class="check" style="flex:none">' +
              '<input type="checkbox" data-change="aktif-item" data-k="' + U.esc(k.id) + '"' +
              (k.aktif !== false ? ' checked' : '') + '></label>' +
            '<span style="font-size:18px;flex:none">' + (k.ic || '🎁') + '</span>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(k.nama) + '</b>' +
              '<div class="tbl-sub">' + U.esc(jenisTeks(k.jenis)) +
                (k.nilai ? ' · ' + T('senilai') + ' ' + U.rp(k.nilai) : '') + '</div></div>' +
            '<div class="aturan__set">' +
              '<label><span>' + T('poin') + '</span>' +
                '<input class="input" type="number" min="1" step="50" value="' + k.poin +
                '" data-change="set-item-poin" data-k="' + U.esc(k.id) + '"></label>' +
            '</div>' +
            (k.poin < (c.minimalTukar || 0)
              ? '<span class="chip chip--danger chip--xs" title="' +
                T('Di bawah minimal penukaran — tidak akan bisa ditukar') + '">⚠️ ' +
                T('di bawah minimal') + '</span>'
              : '') +
            '<button class="btn btn--ghost btn--sm btn--icon" data-act="hapus-item" ' +
              'data-k="' + U.esc(k.id) + '" title="' + T('Hapus') + '">✕</button>' +
          '</div>';
        }).join('')
        : '<div class="tbl-sub">' + T('Belum ada item. Tanpa item, poin tidak bisa ditukar.') + '</div>' }) +

      UI.alert('warn',
        '<b>' + T('Perhatikan margin program.') + '</b> ' +
        T('Nilai tukar sekarang') + ' <b>1 ' + POIN.nama() + ' = ' + U.rp(c.nilaiTukar) + '</b>. ' +
        T('Item yang memberi nilai rupiah lebih besar daripada poin × nilai tukar berarti ' +
          'menjual di bawah harga — periksa tiap item sebelum menayangkannya.'), '⚠️');
  }

  function jenisTeks(j) {
    return { voucher: T('Voucher potongan'), ongkir: 'Gratis ongkir',
             saldo: T('Saldo dompet'), barang: 'Barang' }[j] || j;
  }

  function tabUmum(c) {
    return UI.card({ title: T('Ketentuan umum'),
      body: '<label class="check"><input type="checkbox" data-change="aktif-program"' +
          (c.aktif ? ' checked' : '') + '> <b>' + T('Program poin aktif') + '</b></label>' +
        '<p class="tbl-sub mt-1">' +
        T('Mematikan program menghentikan perolehan dan penukaran, tetapi saldo pengguna ' +
          'tidak dihapus — poin adalah utang perusahaan, bukan angka hiasan.') + '</p>' +

        '<div class="grid g-2 mt-3">' +
          UI.field({ name: 'namaPoin', label: T('Nama program'), value: c.nama,
            hint: T('Muncul di seluruh aplikasi, mis. EXOPOIN.') }) +
          UI.field({ name: 'nilaiTukar', label: T('Nilai 1 poin (Rp)'), type: 'number',
            value: c.nilaiTukar, hint: T('Dipakai menghitung kewajiban dan menilai item katalog.') }) +
          UI.field({ name: 'minimalTukar', label: T('Minimal penukaran (poin)'), type: 'number',
            value: c.minimalTukar }) +
          UI.field({ name: 'kedaluwarsaBulan', label: T('Poin hangus setelah (bulan)'), type: 'number',
            value: c.kedaluwarsaBulan, hint: T('Isi 0 bila poin tidak pernah hangus.') }) +
        '</div>' +
        '<div class="field mt-2"><label>' + T('Pembulatan') + '</label>' +
          '<select class="select" data-change="set-bulat">' +
            ['bawah', 'terdekat'].map(function (v) {
              return '<option value="' + v + '"' + (c.bulatkan === v ? ' selected' : '') + '>' +
                (v === 'bawah' ? T('Dibulatkan ke bawah (lebih hemat)')
                               : T('Dibulatkan terdekat (lebih murah hati)')) + '</option>';
            }).join('') + '</select></div>' +
        '<button class="btn mt-2" data-act="simpan-umum">' + T('Simpan ketentuan') + '</button>' +

        '<div class="nav-group" style="color:var(--muted);padding:18px 0 6px">' +
          T('Alat') + '</div>' +
        '<button class="btn btn--ghost btn--sm" data-act="jalankan-hangus">⏳ ' +
          T('Jalankan penghangusan sekarang') + '</button> ' +
        '<button class="btn btn--ghost btn--sm" data-act="beri-manual">✍️ ' +
          T('Beri / kurangi poin manual') + '</button>' +
        '<p class="tbl-sub mt-2">' +
        T('Penghangusan juga berjalan otomatis setiap aplikasi dibuka. Tombol di atas ' +
          'hanya untuk memeriksa hasilnya sekarang juga.') + '</p>' });
  }

  function tabRiwayat() {
    var users = DB.all('users').map(function (u) {
      return { u: u, saldo: POIN.saldo(u.id), j: POIN.jenjang(u.id) };
    }).filter(function (x) { return x.saldo !== 0 || x.j.poinPeriode > 0; });

    var mut = U.sortBy(DB.all('poinMutasi'), function (m) { return m.at; }, true);

    return UI.card({ title: T('Pemilik poin'), sub: users.length + ' ' + T('pengguna'), flush: true,
      body: users.length
        ? U.sortBy(users, function (x) { return x.saldo; }, true).slice(0, 30).map(function (x) {
          return '<div class="row" style="padding:9px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
            '<div style="min-width:0;flex:1"><b style="font-size:12.8px">' + U.esc(x.u.nama) + '</b>' +
              '<div class="tbl-sub">' + x.j.ic + ' ' + U.esc(x.j.nama) + ' · ' +
              U.esc(peranTeks(x.u)) + '</div></div>' +
            '<b>' + U.num(x.saldo) + '</b>' +
            '<button class="btn btn--ghost btn--sm" data-act="beri-ke" data-id="' + U.esc(x.u.id) + '">' +
              T('Sesuaikan') + '</button>' +
          '</div>';
        }).join('')
        : UI.empty('✨', T('Belum ada poin terbit'), T('Poin muncul begitu ada transaksi yang tuntas.')) }) +

      UI.card({ title: T('Mutasi terbaru'), flush: true,
        body: mut.length
          ? mut.slice(0, 40).map(function (m) {
            return '<div class="row" style="padding:8px 2px;border-bottom:1px solid var(--line-2);gap:10px">' +
              '<div style="min-width:0;flex:1"><b style="font-size:12.4px">' +
                U.esc(BIZ.nama(m.userId)) + '</b>' +
                '<div class="tbl-sub">' + U.esc(m.ket) + ' · ' + U.tglJam(m.at) + '</div></div>' +
              '<b style="color:' + (m.poin > 0 ? 'var(--ok)' : 'var(--danger)') + '">' +
                (m.poin > 0 ? '+' : '') + U.num(m.poin) + '</b></div>';
          }).join('')
          : '<div class="tbl-sub">' + T('Belum ada mutasi.') + '</div>' });
  }

  function peranTeks(u) {
    return { client: 'Klien', worker: 'Mitra', seller: T('Mitra Toko'),
             supervisor: 'Supervisor', admin: 'Admin' }[u.role] || u.role;
  }

  /* ================================================================ AKSI ADMIN */
  function nilai(nama) {
    var el = document.getElementById('f_' + nama);
    return el ? el.value : '';
  }

  function aksiAdmin(root) {
    function ubahAturan(k, patch) {
      var c = POIN.config();
      Object.assign(c.aturan[k], patch);
      POIN.simpanConfig({ aturan: c.aturan });
    }
    function ubahJenjang(kode, patch) {
      var c = POIN.config();
      c.jenjang.forEach(function (j) { if (j.kode === kode) Object.assign(j, patch); });
      POIN.simpanConfig({ jenjang: c.jenjang });
    }
    function ubahItem(id, patch) {
      var c = POIN.config();
      c.katalog.forEach(function (k) { if (k.id === id) Object.assign(k, patch); });
      POIN.simpanConfig({ katalog: c.katalog });
    }

    /**
     * Beri tahu bahwa perubahan tersimpan, dan perbarui pratinjaunya.
     *
     * Tanpa ini angka tersimpan diam-diam: admin mengetik, berpindah kolom,
     * dan tidak pernah tahu apakah tersimpan atau tidak. Halaman sengaja TIDAK
     * dirender ulang — itu akan merenggut fokus dari kolom yang sedang diisi.
     */
    function konfirmasiAturan(k) {
      var a = POIN.config().aturan[k];
      var box = document.querySelector('[data-prat="' + k + '"]');
      if (box) box.innerHTML = pratinjau(k);
      UI.toast(a.nama + ': ' +
        (a.per ? U.rp(a.per) + ' → ' + U.num(a.poin) + ' ' + POIN.nama()
               : U.num(a.poin) + ' ' + POIN.nama()) + ' — tersimpan', 'ok');
      /* Ringkasan aturan pokok di kepala tab ikut menyesuaikan. */
      var kepala = document.querySelector('.page .alert--brand, .page .alert--warn');
      if (kepala && (k === 'belanjaJasa' || k === 'belanjaToko')) APP.refresh();
    }

    var map = AKSES.lindungi({
      tab: function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },

      /* --- aturan --- */
      'aktif-aturan': function (el) {
        ubahAturan(el.getAttribute('data-k'), { aktif: el.checked }); APP.refresh(); },
      'set-per': function (el) {
        var k = el.getAttribute('data-k');
        ubahAturan(k, { per: Math.max(1, Number(el.value) || 1) });
        konfirmasiAturan(k);
      },
      'set-poin': function (el) {
        var k = el.getAttribute('data-k');
        ubahAturan(k, { poin: Math.max(0, Number(el.value) || 0) });
        konfirmasiAturan(k);
      },

      /* --- jenjang --- */
      'set-jenjang-min': function (el) {
        ubahJenjang(el.getAttribute('data-k'), { minPoin: Math.max(0, Number(el.value) || 0) }); },
      'set-jenjang-kali': function (el) {
        ubahJenjang(el.getAttribute('data-k'), { kali: Math.max(1, Number(el.value) || 1) }); },
      'simpan-jendela': function () {
        POIN.simpanConfig({ jenjangBulan: Math.max(1, Number(nilai('jenjangBulan')) || 12) });
        UI.toast(T('Jendela penilaian disimpan.'), 'ok'); APP.refresh();
      },
      'tambah-jenjang': function () {
        UI.formModal({ title: T('Tambah jenjang'), fields: [
          { name: 'nama', label: T('Nama'), required: true, placeholder: 'mis. Diamond' },
          { name: 'ic', label: T('Ikon (emoji)'), value: '⭐' },
          { name: 'minPoin', label: T('Mulai dari poin'), type: 'number', value: 30000, required: true },
          { name: 'kali', label: T('Pengali perolehan'), type: 'number', step: 0.05, value: 2.5 }
        ] }).then(function (d) {
          if (!d) return;
          var c = POIN.config();
          var kode = String(d.nama).toLowerCase().replace(/[^a-z0-9]+/g, '-');
          if (c.jenjang.some(function (j) { return j.kode === kode; })) {
            UI.toast(T('Jenjang dengan nama itu sudah ada.'), 'err'); return;
          }
          c.jenjang.push({ kode: kode, nama: d.nama, ic: d.ic || '⭐',
            minPoin: Math.max(0, Number(d.minPoin) || 0),
            kali: Math.max(1, Number(d.kali) || 1), warna: '#0E7490' });
          POIN.simpanConfig({ jenjang: c.jenjang });
          UI.toast(T('Jenjang ditambahkan.'), 'ok'); APP.refresh();
        });
      },
      'hapus-jenjang': function (el) {
        var c = POIN.config();
        var kode = el.getAttribute('data-k');
        if (c.jenjang.length <= 1) { UI.toast(T('Harus tersisa minimal satu jenjang.'), 'warn'); return; }
        POIN.simpanConfig({ jenjang: c.jenjang.filter(function (j) { return j.kode !== kode; }) });
        APP.refresh();
      },

      /* --- katalog --- */
      'aktif-item': function (el) {
        ubahItem(el.getAttribute('data-k'), { aktif: el.checked }); APP.refresh(); },
      'set-item-poin': function (el) {
        ubahItem(el.getAttribute('data-k'), { poin: Math.max(1, Number(el.value) || 1) }); },
      'tambah-item': function () {
        UI.formModal({ title: T('Tambah item penukaran'), size: 'wide', fields: [
          { name: 'nama', label: T('Nama item'), required: true, placeholder: 'mis. Potongan Rp250.000' },
          { name: 'jenis', label: T('Jenis'), type: 'select', value: 'voucher',
            options: [{ value: 'voucher', label: T('Voucher potongan') },
                      { value: 'ongkir', label: 'Gratis ongkir' },
                      { value: 'saldo', label: T('Saldo dompet') },
                      { value: 'barang', label: T('Barang') }] },
          { name: 'poin', label: T('Poin yang dibutuhkan'), type: 'number', value: 500, required: true },
          { name: 'nilai', label: T('Nilai rupiah'), type: 'number', value: 50000 },
          { name: 'ic', label: T('Ikon (emoji)'), value: '🎁' },
          { name: 'ket', label: T('Keterangan'), placeholder: T('opsional') }
        ], validate: function (d) {
          var min = POIN.config().minimalTukar || 0;
          /* Item di bawah ambang akan tayang tetapi selalu gagal ditukar.
             Ditahan di sini supaya cacatnya tidak sampai ke layar pengguna. */
          if (Number(d.poin) < min) {
            return T('Minimal penukaran saat ini') + ' ' + U.num(min) + ' ' + T('poin. Naikkan harga item') + ' ' +
              T('ini, atau turunkan batas minimalnya di tab Ketentuan Umum.');
          }
          return null;
        } }).then(function (d) {
          if (!d) return;
          var c = POIN.config();
          var nilaiPoin = Number(d.poin) * (c.nilaiTukar || 0);
          var lanjut = Number(d.nilai) <= nilaiPoin ? Promise.resolve(true)
            : UI.konfirm({ title: T('Nilai melebihi harga poin'), danger: true,
                htmlText: T('Item ini bernilai') + ' <b>' + U.rp(Number(d.nilai)) + '</b> ' +
                  T('sementara') + ' ' + U.num(d.poin) + ' ' + T('poin hanya setara') + ' <b>' +
                  U.rp(nilaiPoin) + '</b>.<br><br>' +
                  T('Selisihnya menjadi biaya perusahaan setiap kali item ini ditukar. Tetap tayangkan?'),
                okText: T('Tetap tambahkan') });
          lanjut.then(function (ya) {
            if (!ya) return;
            c.katalog.push({ id: 'it_' + U.uid('x').slice(-6), jenis: d.jenis, nama: d.nama,
              poin: Math.max(1, Number(d.poin) || 1), nilai: Math.max(0, Number(d.nilai) || 0),
              ic: d.ic || '🎁', ket: d.ket || '', aktif: true });
            POIN.simpanConfig({ katalog: c.katalog });
            UI.toast(T('Item ditambahkan.'), 'ok'); APP.refresh();
          });
        });
      },
      'hapus-item': function (el) {
        var c = POIN.config();
        POIN.simpanConfig({ katalog: c.katalog.filter(function (k) {
          return k.id !== el.getAttribute('data-k'); }) });
        APP.refresh();
      },

      /* --- umum --- */
      'aktif-program': function (el) {
        POIN.simpanConfig({ aktif: el.checked });
        UI.toast(el.checked ? T('Program poin diaktifkan.') : T('Program poin dinonaktifkan.'),
          el.checked ? 'ok' : 'warn');
        APP.refresh();
      },
      'set-bulat': function (el) { POIN.simpanConfig({ bulatkan: el.value }); },
      'simpan-umum': function () {
        POIN.simpanConfig({
          nama: String(nilai('namaPoin') || 'Poin').trim().slice(0, 24),
          nilaiTukar: Math.max(1, Number(nilai('nilaiTukar')) || 100),
          minimalTukar: Math.max(0, Number(nilai('minimalTukar')) || 0),
          kedaluwarsaBulan: Math.max(0, Number(nilai('kedaluwarsaBulan')) || 0)
        });
        UI.toast(T('Ketentuan disimpan.'), 'ok');
        APP.refresh();
      },
      'jalankan-hangus': function () {
        var n = POIN.segarkan();
        UI.toast(n ? n + ' ' + T('pengguna kehilangan poin yang sudah lewat masanya.')
          : T('Tidak ada poin yang perlu dihanguskan.'), n ? 'warn' : 'ok');
        APP.refresh();
      },
      'beri-manual': function () { dialogManual(null); },
      'beri-ke': function (el) { dialogManual(el.getAttribute('data-id')); }
    }, {
      'aktif-aturan': 'sistem.poin', 'set-per': 'sistem.poin', 'set-poin': 'sistem.poin',
      'set-jenjang-min': 'sistem.poin', 'set-jenjang-kali': 'sistem.poin',
      'simpan-jendela': 'sistem.poin', 'tambah-jenjang': 'sistem.poin', 'hapus-jenjang': 'sistem.poin',
      'aktif-item': 'sistem.poin', 'set-item-poin': 'sistem.poin',
      'tambah-item': 'sistem.poin', 'hapus-item': 'sistem.poin',
      'aktif-program': 'sistem.poin', 'set-bulat': 'sistem.poin', 'simpan-umum': 'sistem.poin',
      'jalankan-hangus': 'sistem.poin', 'beri-manual': 'sistem.poin', 'beri-ke': 'sistem.poin'
    });

    U.delegate(root, map);

    /* Pratinjau bergerak saat MENGETIK, bukan menunggu pindah kolom — supaya
       akibat angka terlihat sebelum orang memutuskan untuk menyimpannya. */
    Array.prototype.forEach.call(root.querySelectorAll('[data-change="set-per"], [data-change="set-poin"]'),
      function (el) {
        el.addEventListener('input', function () {
          var k = el.getAttribute('data-k');
          var box = root.querySelector('[data-prat="' + k + '"]');
          if (!box) return;
          var c = POIN.config();
          var per = Number(root.querySelector('[data-change="set-per"][data-k="' + k + '"]') &&
            root.querySelector('[data-change="set-per"][data-k="' + k + '"]').value) || c.aturan[k].per;
          var poin = Number(root.querySelector('[data-change="set-poin"][data-k="' + k + '"]').value) || 0;
          var contoh = 500000;
          var dapat = Math.floor(contoh / Math.max(1, per)) * poin;
          var rp = dapat * (c.nilaiTukar || 0);
          var persen = rp / contoh * 100;
          box.innerHTML = T('Belanja') + ' <b>' + U.rp(contoh) + '</b> → <b>' + U.num(dapat) + ' ' +
            U.esc(c.nama) + '</b> · setara ' + U.rp(rp) +
            ' <span class="aturan__persen">' + persen.toFixed(persen < 1 ? 2 : 1) +
            T('% dari nilai belanja') + '</span>';
        });
      });
  }

  /**
   * Penyesuaian manual. Selalu wajib beralasan — poin yang muncul tanpa
   * keterangan tidak bisa dipertanggungjawabkan ketika ditanya auditor,
   * dan tidak bisa dijelaskan ketika ditanya pemiliknya.
   */
  function dialogManual(userId) {
    var kandidat = DB.all('users').filter(function (u) { return u.aktif; });
    UI.formModal({
      title: T('Penyesuaian poin manual'), size: 'wide',
      intro: UI.alert('warn', T('Penyesuaian tercatat atas nama Anda dan muncul di riwayat ' +
        'pengguna. Pakai untuk memperbaiki kesalahan atau memberi apresiasi khusus — ' +
        'bukan sebagai jalan pintas mengganti aturan.'), '✍️') + '<div class="mb-3"></div>',
      fields: [
        { name: 'userId', label: T('Pengguna'), type: 'select', value: userId || kandidat[0].id,
          options: kandidat.map(function (u) {
            return { value: u.id, label: u.nama + ' — ' + peranTeks(u) + ' (' +
              U.num(POIN.saldo(u.id)) + ' poin)' }; }) },
        { name: 'poin', label: T('Jumlah poin'), type: 'number', value: 100, required: true,
          hint: T('Isi angka negatif untuk mengurangi.') },
        { name: 'alasan', label: T('Alasan'), required: true,
          placeholder: T('mis. koreksi poin yang tidak terhitung pada invoice EXO/INV/2026/0012') }
      ],
      validate: function (d) {
        if (!Number(d.poin)) return T('Jumlah poin tidak boleh nol.');
        if (String(d.alasan).trim().length < 8) return T('Tulis alasan yang jelas, minimal 8 huruf.');
        var saldoBaru = POIN.saldo(d.userId) + Number(d.poin);
        if (saldoBaru < 0) {
          return T('Pengurangan itu membuat saldo menjadi negatif ({v}). ' +
            'Poin tidak boleh minus.').replace('{v}', U.num(saldoBaru));
        }
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      POIN.tulis(d.userId, Number(d.poin), 'penyesuaian',
        String(d.alasan).trim(), { tipe: 'admin', id: me().id }, 'manual',
        { oleh: me().id, olehNama: me().nama });
      DB.log(me().id, 'poin.manual', 'user', d.userId,
        Number(d.poin) + ' poin — ' + d.alasan);
      UI.toast(T('Penyesuaian dicatat.'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ HALAMAN */
  var halamanUser = {
    label: 'Poin Reward', icon: '🎁', grup: 'Akun',
    sub: 'Kumpulkan poin dari tiap transaksi, tukar jadi potongan',
    render: renderUser, mount: aksiUser,
    badge: function () {
      var h = POIN.akanHangus(APP.user.id, 30);
      return h.poin ? 1 : 0;
    }
  };

  var pagesAdmin = {
    poin: {
      label: 'Poin Reward', icon: '🎁', grup: 'Sistem',
      sub: 'Ketentuan perolehan, jenjang, dan penukaran poin',
      render: renderAdmin, mount: aksiAdmin
    }
  };

  return { halamanUser: halamanUser, pagesAdmin: pagesAdmin,
           renderUser: renderUser, renderAdmin: renderAdmin };
})();
