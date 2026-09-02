/* ==========================================================================
   views/akses.js — halaman "Peran & Hak Akses" untuk tim IT
   --------------------------------------------------------------------------
   Empat sudut pandang atas data yang sama:

     Peran    — daftar peran + editor matriks izin per modul
     Pegawai  — siapa memakai peran apa, plus penyesuaian izin per orang
     Matriks  — satu tabel perbandingan semua peran, untuk audit cepat
     Riwayat  — jejak perubahan hak akses

   Aturan tampilan yang dipegang di sini: setiap kotak centang selalu
   menyebutkan APA yang bisa dilakukan, bukan sekadar nama teknis izinnya,
   dan izin berisiko diberi tanda supaya tidak tercentang tanpa sadar.
   ========================================================================== */
var ViewAkses = (function () {

  var tab = 'peran';

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  function labelPersona(p) {
    return { admin: 'Admin EXOCLEAN', supervisor: 'Supervisor Lapangan' }[p] || p;
  }

  /* ================================================================ MATRIKS IZIN (dipakai 2 dialog) */
  /**
   * Daftar centang izin, dikelompokkan per modul.
   * dasar  = izin yang berasal dari peran (dipakai sebagai pembanding)
   * aktif  = izin yang tercentang saat ini
   */
  function matriksIzin(aktif, dasar, kunci) {
    aktif = aktif || []; dasar = dasar || null;
    return '<div class="izin-list">' + AKSES.MODUL.map(function (m) {
      var list = AKSES.izinModul(m.id);
      var n = list.filter(function (x) { return aktif.indexOf(x.id) >= 0; }).length;
      return '<div class="izin-mod" data-mod="' + m.id + '">' +
        '<div class="izin-mod__head">' +
          '<label class="check">' +
            '<input type="checkbox" data-all="' + m.id + '"' +
              (n === list.length ? ' checked' : '') +
              (n && n < list.length ? ' data-sebagian="1"' : '') + '>' +
            '<span><span class="izin-mod__ic">' + m.ic + '</span>' + U.esc(I18N.t(m.nama)) + '</span>' +
          '</label>' +
          '<div class="spacer"></div>' +
          '<span class="izin-mod__n">' + n + '/' + list.length + '</span>' +
        '</div>' +
        '<div class="izin-mod__body">' + list.map(function (x) {
          var beda = dasar && ((dasar.indexOf(x.id) >= 0) !== (aktif.indexOf(x.id) >= 0));
          var terkunci = kunci && kunci.indexOf(x.id) >= 0;
          return '<label class="izin-row' + (beda ? ' izin-row--beda' : '') + '">' +
            '<input type="checkbox" name="izin" value="' + x.id + '"' +
              (aktif.indexOf(x.id) >= 0 ? ' checked' : '') +
              (terkunci ? ' disabled' : '') + '>' +
            '<div>' +
              '<div class="izin-row__n">' + U.esc(I18N.t(x.n)) +
                (x.risiko ? '<span class="chip chip--danger chip--xs">' + I18N.t('berisiko') + '</span>' : '') +
                (beda ? '<span class="chip chip--warn chip--xs">' + I18N.t('beda dari peran') + '</span>' : '') +
              '</div>' +
              '<div class="izin-row__k">' + U.esc(I18N.t(x.k)) + '</div>' +
            '</div>' +
          '</label>';
        }).join('') + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  /** Pasang perilaku centang-semua + penghitung pada satu modal berisi matriks. */
  function hidupkanMatriks(root) {
    function segarkan(mod) {
      var box = mod.querySelector('[data-all]');
      var anak = mod.querySelectorAll('input[name="izin"]');
      var n = 0;
      Array.prototype.forEach.call(anak, function (c) { if (c.checked) n++; });
      box.checked = n === anak.length;
      box.indeterminate = n > 0 && n < anak.length;
      mod.querySelector('.izin-mod__n').textContent = n + '/' + anak.length;
    }
    Array.prototype.forEach.call(root.querySelectorAll('.izin-mod'), segarkan);

    root.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.matches('[data-all]')) {
        var mod = t.closest('.izin-mod');
        Array.prototype.forEach.call(mod.querySelectorAll('input[name="izin"]'), function (c) {
          if (!c.disabled) c.checked = t.checked;
        });
        segarkan(mod);
      } else if (t.name === 'izin') {
        segarkan(t.closest('.izin-mod'));
      }
    });
  }

  function bacaIzin(root) {
    return Array.prototype.filter.call(root.querySelectorAll('input[name="izin"]'), function (c) {
      return c.checked;
    }).map(function (c) { return c.value; });
  }

  /* ================================================================ TAB: PERAN */
  function tabPeran() {
    var per = AKSES.semuaPeran();
    var byPersona = U.groupBy(per, function (r) { return r.persona; });

    return '<div class="row wrap mb-3" style="gap:8px">' +
        '<div><div class="tbl-title">' + I18N.t('Peran akses') + '</div>' +
        '<div class="tbl-sub">' + I18N.t('Kumpulan izin siap pakai yang dipasang ke pegawai') + '</div></div>' +
        '<div class="spacer"></div>' +
        '<button class="btn" data-act="peran-baru">＋ ' + I18N.t('Peran baru') + '</button>' +
      '</div>' +

      Object.keys(byPersona).map(function (p) {
        return '<div class="nav-group" style="padding-left:0">' + U.esc(I18N.t(labelPersona(p))) + '</div>' +
          '<div class="grid g-3 mb-3">' + byPersona[p].map(kartuPeran).join('') + '</div>';
      }).join('');
  }

  function kartuPeran(r) {
    var izin = r.izin || [];
    var pakai = AKSES.jumlahPemakai(r.id);
    var berisiko = izin.filter(function (id) {
      var x = AKSES.izin(id); return x && x.risiko; }).length;
    var modulSentuh = AKSES.MODUL.filter(function (m) {
      return AKSES.izinModul(m.id).some(function (x) { return izin.indexOf(x.id) >= 0; }); });

    return '<div class="card peran-card' + (!r.aktif ? ' peran-card--off' : '') + '">' +
      '<div class="card__body">' +
        '<div class="row" style="gap:8px">' +
          '<div style="min-width:0">' +
            '<div class="peran-card__nama">' + U.esc(r.nama) +
              (r.bawaan ? '<span class="chip chip--muted chip--xs">' + I18N.t('bawaan') + '</span>' : '') +
              (!r.aktif ? '<span class="chip chip--danger chip--xs">' + I18N.t('nonaktif') + '</span>' : '') +
            '</div>' +
            '<div class="code" style="margin-top:2px">' + U.esc(r.kode) + '</div>' +
          '</div>' +
          '<div class="spacer"></div>' +
          '<div class="peran-card__n"><b>' + izin.length + '</b><small>' + I18N.t('izin') + '</small></div>' +
        '</div>' +

        '<p class="peran-card__ket">' + U.esc(r.deskripsi || '') + '</p>' +

        '<div class="peran-card__mod">' + (modulSentuh.length
          ? modulSentuh.map(function (m) {
              var n = AKSES.izinModul(m.id).filter(function (x) { return izin.indexOf(x.id) >= 0; }).length;
              return '<span class="chip chip--soft" title="' + U.esc(I18N.t(m.nama)) + '">' + m.ic + ' ' +
                U.esc(I18N.t(m.nama)) + ' ' + n + '</span>';
            }).join('')
          : '<span class="tbl-sub">' + I18N.t('Belum ada izin apa pun') + '</span>') + '</div>' +

        '<div class="row peran-card__kaki">' +
          '<span class="tbl-sub">👤 ' + pakai + ' ' + I18N.t('pengguna') +
            (berisiko ? ' • <span class="txt-danger">' + berisiko + ' ' +
              I18N.t('izin berisiko') + '</span>' : '') + '</span>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn--ghost btn--sm" data-act="peran-salin" data-id="' + r.id + '">' + I18N.t('Salin') + '</button>' +
          '<button class="btn btn--sm" data-act="peran-edit" data-id="' + r.id + '">' + I18N.t('Atur izin') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ================================================================ TAB: PEGAWAI */
  function tabPegawai() {
    var rows = U.sortBy(AKSES.pegawai(), function (u) { return (u.role === 'admin' ? '0' : '1') + u.nama; });

    return UI.alert('info', 'Persona (Admin / Supervisor) menentukan <b>bentuk aplikasi</b> ' + I18N.t('dan diubah dari') + ' ' +
      I18N.t('menu Tim &amp; Pegawai. Yang diatur di sini adalah') + ' <b>' + I18N.t('menu dan aksi') + '</b> ' + I18N.t('yang boleh dibuka') + ' ' +
      I18N.t('di dalam persona tersebut.'), '🧭') + '<div class="mb-3"></div>' +

    UI.card({ flush: true, body: UI.table([
      { h: I18N.t('Pegawai'), r: function (u) {
        return '<div class="row">' + UI.avatar(u.nama, 'sm') + '<div style="min-width:0">' +
          '<div class="tbl-title">' + U.esc(u.nama) +
            (APP.user && APP.user.id === u.id ? '<span class="chip chip--soft chip--xs">' + I18N.t('Anda') + '</span>' : '') +
          '</div>' +
          '<div class="tbl-sub">' + U.esc(u.jabatan || labelPersona(u.role)) + '</div></div></div>'; } },
      { h: I18N.t('Persona'), r: function (u) {
        return '<span class="chip chip--soft">' + U.esc(I18N.t(labelPersona(u.role))) + '</span>'; } },
      { h: I18N.t('Peran akses'), w: '230px', r: function (u) {
        var opsi = AKSES.peranPersona(u.role);
        var kini = AKSES.peranUser(u);
        return '<select class="select select--sm" data-change="pasang-peran" data-id="' + u.id + '">' +
          (kini ? '' : '<option value="">' + I18N.t('— belum dipasang —') + '</option>') +
          opsi.map(function (r) {
            return '<option value="' + r.id + '"' + (kini && kini.id === r.id ? ' selected' : '') + '>' +
              U.esc(r.nama) + '</option>'; }).join('') + '</select>'; } },
      { h: I18N.t('Izin efektif'), cls: 'num', r: function (u) {
        var n = AKSES.izinUser(u).length;
        return '<b>' + n + '</b><span class="tbl-sub"> / ' + AKSES.IZIN.length + '</span>'; } },
      { h: I18N.t('Penyesuaian'), r: function (u) {
        var t = (u.izinTambahan || []).length, c = (u.izinDicabut || []).length;
        if (!t && !c) return '<span class="tbl-sub">' + I18N.t('mengikuti peran') + '</span>';
        return (t ? '<span class="chip chip--ok chip--xs">+' + t + '</span>' : '') +
               (c ? '<span class="chip chip--danger chip--xs">−' + c + '</span>' : ''); } },
      { h: I18N.t('Kunci'), r: function (u) {
        return AKSES.boleh('sistem.role', u)
          ? '<span class="chip chip--brand chip--dot">' + I18N.t('pengelola akses') + '</span>' : ''; } },
      { h: '', cls: 'act', r: function (u) {
        return '<button class="btn btn--ghost btn--sm" data-act="izin-khusus" data-id="' + u.id + '">' +
          I18N.t('Sesuaikan') + '</button>'; } }
    ], rows, { icon: '👥', judul: I18N.t('Belum ada pegawai internal') }) });
  }

  /* ================================================================ TAB: MATRIKS */
  var personaMatriks = 'admin';
  function tabMatriks() {
    var per = AKSES.semuaPeran().filter(function (r) { return r.persona === personaMatriks; });

    var head = '<tr><th style="width:34%">' + I18N.t('Izin') + '</th>' + per.map(function (r) {
      return '<th class="mtx-th"><span>' + U.esc(r.nama) + '</span></th>'; }).join('') + '</tr>';

    var body = AKSES.MODUL.map(function (m) {
      var list = AKSES.izinModul(m.id);
      return '<tr class="mtx-grup"><td colspan="' + (per.length + 1) + '">' + m.ic + ' ' +
          U.esc(I18N.t(m.nama)) + '</td></tr>' +
        list.map(function (x) {
          return '<tr><td><div class="tbl-title">' + U.esc(I18N.t(x.n)) +
              (x.risiko ? '<span class="chip chip--danger chip--xs">' + I18N.t('berisiko') + '</span>' : '') + '</div>' +
              '<div class="tbl-sub">' + U.esc(I18N.t(x.k)) + '</div></td>' +
            per.map(function (r) {
              var ada = (r.izin || []).indexOf(x.id) >= 0;
              return '<td class="mtx-cel">' + (ada ? '<span class="mtx-ya">✓</span>'
                : '<span class="mtx-no">·</span>') + '</td>';
            }).join('') + '</tr>';
        }).join('');
    }).join('');

    return '<div class="row wrap mb-3" style="gap:8px">' +
        '<select class="select" style="width:auto" data-change="persona-matriks">' +
          ['admin', 'supervisor'].map(function (p) {
            return '<option value="' + p + '"' + (p === personaMatriks ? ' selected' : '') + '>' +
              U.esc(I18N.t(labelPersona(p))) + '</option>'; }).join('') + '</select>' +
        '<div class="spacer"></div>' +
        '<span class="tbl-sub">' + per.length + ' peran • ' + AKSES.IZIN.length + ' ' + I18N.t('izin') + '</span>' +
      '</div>' +
      UI.card({ flush: true, body: per.length
        ? '<div class="tbl-wrap mtx-wrap"><table class="tbl mtx"><thead>' + head + '</thead><tbody>' + body +
          '</tbody></table></div>'
        : UI.empty('🗂️', I18N.t('Belum ada peran untuk persona ini')) });
  }

  /* ================================================================ TAB: RIWAYAT */
  function tabRiwayat() {
    var log = AKSES.riwayat(40);
    return UI.card({ title: I18N.t('Perubahan hak akses'), sub: I18N.t('Tercatat otomatis setiap kali peran atau izin diubah'),
      body: log.length
        ? '<div class="timeline">' + log.map(function (a) {
            return '<div class="tl-item done">' +
              '<b>' + U.esc(a.aksi) + '</b>' +
              '<small>' + U.esc(BIZ.nama(a.actorId) || 'Sistem') + ' • ' + U.tglJam(a.at) +
              ' • ' + U.relatif(a.at) + '</small>' +
              '</div>';
          }).join('') + '</div>'
        : UI.empty('🕘', I18N.t('Belum ada perubahan'), I18N.t('Riwayat muncul setelah peran atau izin disunting.')) });
  }

  /* ================================================================ DIALOG PERAN */
  function dialogPeran(id) {
    var r = id ? AKSES.peran(id) : null;
    var izinAwal = r ? (r.izin || []).slice() : [];
    /* pengguna tidak boleh mencabut izin pengelolaan akses dari peran yang ia pakai sendiri */
    var peranSaya = AKSES.peranUser(APP.user);
    var kunci = (r && peranSaya && peranSaya.id === r.id && (izinAwal.indexOf('sistem.role') >= 0))
      ? ['sistem.role'] : [];

    UI.modal({
      title: r ? I18N.t('Atur izin') + ' — ' + r.nama : I18N.t('Peran baru'),
      sub: r ? r.kode + ' • ' + labelPersona(r.persona) + ' • ' +
        I18N.t('dipakai {n} pengguna').replace('{n}', AKSES.jumlahPemakai(r.id))
             : 'Tentukan identitas peran lalu centang izinnya',
      size: 'wide',
      body: '<form data-form>' +
          '<div class="grid g-3">' +
            UI.field({ name: 'nama', label: I18N.t('Nama peran'), required: true, value: r ? r.nama : '',
              placeholder: 'mis. Admin Penjadwalan' }) +
            UI.field({ name: 'kode', label: I18N.t('Kode'), required: true, value: r ? r.kode : '',
              placeholder: 'mis. ADM-JDW', hint: I18N.t('Dipakai pada log dan ekspor data') }) +
          '</div>' +
          UI.field({ name: 'deskripsi', label: I18N.t('Untuk siapa peran ini'), type: 'textarea', rows: 2,
            value: r ? r.deskripsi : '',
            placeholder: 'Jelaskan singkat tanggung jawabnya supaya mudah dipilih nanti' }) +
          (r
            ? UI.field({ name: 'aktif', type: 'checkbox', label: I18N.t('Peran aktif dan bisa dipasang ke pegawai'),
                value: r.aktif })
            : UI.field({ name: 'persona', label: I18N.t('Persona'), type: 'select', value: 'admin',
                options: [{ value: 'admin', label: labelPersona('admin') },
                          { value: 'supervisor', label: labelPersona('supervisor') }],
                hint: I18N.t('Menentukan bentuk aplikasi. Tidak bisa diubah setelah peran dibuat.') })) +
        '</form>' +

        (kunci.length ? UI.alert('warn', I18N.t('Izin') + ' <b>Kelola peran &amp; hak akses</b> ' + I18N.t('dikunci karena peran ini') + ' ' +
          I18N.t('sedang Anda pakai sendiri — mencabutnya akan mengunci Anda dari halaman ini.'), '🔒') : '') +

        '<div class="izin-head mt-3"><b>' + I18N.t('Izin') + '</b>' +
          '<span class="tbl-sub">' + I18N.t('Centang yang boleh dilakukan pemegang peran ini') + '</span></div>' +
        matriksIzin(izinAwal, null, kunci),

      foot: (r && !r.bawaan
          ? '<button class="btn btn--ghost btn--danger" data-act="hapus">' + I18N.t('Hapus peran') + '</button>' : '') +
        '<div class="spacer"></div>' +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">' + I18N.t('Simpan') + '</button>',

      onMount: hidupkanMatriks,

      actions: {
        simpan: function (el) {
          var root = el.closest('.modal');
          var d = U.readForm(root.querySelector('[data-form]'));
          if (!d.nama || !d.kode) { UI.toast(I18N.t('Nama dan kode peran wajib diisi'), 'err'); return; }
          var izin = bacaIzin(root);
          kunci.forEach(function (k) { if (izin.indexOf(k) < 0) izin.push(k); });

          if (r) {
            var hasil = AKSES.simpanPeran(r.id, {
              nama: d.nama, kode: d.kode, deskripsi: d.deskripsi,
              aktif: !!d.aktif, izin: izin }, APP.user.id);
            if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
            UI.toast('Peran diperbarui — ' + izin.length + ' izin aktif', 'ok');
          } else {
            AKSES.buatPeran({ nama: d.nama, kode: d.kode, deskripsi: d.deskripsi,
              persona: d.persona, izin: izin }, APP.user.id);
            UI.toast('Peran "' + d.nama + '" dibuat', 'ok');
          }
          tutup(el); APP.refresh();
        },
        hapus: function (el) {
          UI.konfirm({ title: I18N.t('Hapus peran ini?'),
            text: I18N.t('Peran “{v}” akan dihapus permanen.').replace('{v}', r.nama),
            okText: I18N.t('Hapus'), danger: true })
            .then(function (ya) {
              if (!ya) return;
              var h = AKSES.hapusPeran(r.id, APP.user.id);
              if (h.error) { UI.toast(h.error, 'err'); return; }
              UI.toast('Peran dihapus', 'ok');
              tutup(el); APP.refresh();
            });
        }
      }
    });
  }

  /* ================================================================ DIALOG IZIN KHUSUS */
  function dialogIzinKhusus(userId) {
    var u = DB.find('users', userId);
    var r = AKSES.peranUser(u);
    var dasar = r ? (r.izin || []).slice() : [];
    var efektif = AKSES.izinUser(u);
    var sendiri = APP.user && APP.user.id === userId;

    UI.modal({
      title: 'Izin khusus — ' + u.nama,
      sub: r ? 'Peran: ' + r.nama : I18N.t('Belum punya peran'),
      size: 'wide',
      body: UI.alert('info', I18N.t('Centangan di bawah dimulai dari izin peran') + ' <b>' +
          U.esc(r ? r.nama : '—') + '</b>. Perbedaan yang Anda buat disimpan sebagai ' +
          I18N.t('penyesuaian pribadi, jadi izin peran tetap utuh untuk pengguna lain.'), '🎚️') +
        (sendiri ? UI.alert('warn', I18N.t('Ini akun Anda sendiri. Izin') + ' <b>Kelola peran &amp; hak akses</b> ' +
          I18N.t('dikunci agar Anda tidak kehilangan akses ke halaman ini.'), '🔒') : '') +
        '<div class="izin-head mt-3"><b>' + I18N.t('Izin efektif') + '</b>' +
          '<span class="tbl-sub">' + I18N.t('Yang berbeda dari peran ditandai') + '</span></div>' +
        matriksIzin(efektif, dasar, sendiri ? ['sistem.role'] : []),

      foot: '<button class="btn btn--ghost" data-act="reset">' + I18N.t('Kembalikan ke peran') + '</button>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--ghost" data-close>' + I18N.t('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">' + I18N.t('Simpan') + '</button>',

      onMount: hidupkanMatriks,

      actions: {
        simpan: function (el) {
          var root = el.closest('.modal');
          var pilih = bacaIzin(root);
          if (sendiri && dasar.indexOf('sistem.role') >= 0 && pilih.indexOf('sistem.role') < 0) {
            pilih.push('sistem.role');
          }
          var tambahan = pilih.filter(function (i) { return dasar.indexOf(i) < 0; });
          var dicabut = dasar.filter(function (i) { return pilih.indexOf(i) < 0; });

          if (dicabut.indexOf('sistem.role') >= 0) {
            var pesan = AKSES.periksaPerubahan(function (x) {
              return x.id === userId ? false : AKSES.boleh('sistem.role', x); });
            if (pesan) { UI.toast(pesan, 'err'); return; }
          }

          var hasil = AKSES.aturIzinKhusus(userId, tambahan, dicabut, APP.user.id);
          if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
          UI.toast(tambahan.length || dicabut.length
            ? 'Penyesuaian disimpan (+' + tambahan.length + ' / −' + dicabut.length + ')'
            : 'Izin kembali mengikuti peran', 'ok');
          tutup(el); APP.refresh();
        },
        reset: function (el) {
          var hasil = AKSES.aturIzinKhusus(userId, [], [], APP.user.id);
          if (hasil.error) { UI.toast(hasil.error, 'err'); return; }
          UI.toast('Izin dikembalikan mengikuti peran', 'ok');
          tutup(el); APP.refresh();
        }
      }
    });
  }

  /* ================================================================ RENDER */
  function render() {
    var st = AKSES.statistik();

    return '' +
      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: I18N.t('Peran akses'), value: st.peran, icon: '🗝️',
          meta: I18N.t('{a} izin dalam {b} modul').replace('{a}', st.izin).replace('{b}', st.modul) }) +
        UI.stat({ label: I18N.t('Pegawai internal'), value: st.pegawai, icon: '👥',
          meta: st.tanpaPeran ? st.tanpaPeran + ' ' + I18N.t('belum punya peran') : I18N.t('semua sudah berperan') }) +
        UI.stat({ label: I18N.t('Penyesuaian pribadi'), value: st.denganPenyesuaian, icon: '🎚️',
          meta: I18N.t('izin di luar peran') }) +
        UI.stat({ label: I18N.t('Pengelola akses'), value: st.pemegangKunci, icon: '🔐',
          meta: st.pemegangKunci < 2 ? I18N.t('sebaiknya lebih dari satu orang') : 'aman' }) +
      '</div>' +

      (st.pemegangKunci < 2
        ? UI.alert('warn', I18N.t('Hanya') + ' <b>' + st.pemegangKunci + ' ' + I18N.t('orang') + '</b> ' + I18N.t('yang bisa mengelola hak akses.') + ' ' +
            I18N.t('Bila akun itu tidak bisa dipakai, tidak ada yang dapat memperbaiki izin dari dalam aplikasi.') + ' ' +
            'Beri izin <b>Kelola peran &amp; hak akses</b> kepada satu orang cadangan.', '⚠️') +
          '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'peran', label: I18N.t('Daftar Peran'), n: st.peran },
        { key: 'pegawai', label: I18N.t('Pegawai'), n: st.pegawai },
        { key: 'matriks', label: I18N.t('Matriks Izin') },
        { key: 'riwayat', label: I18N.t('Riwayat') }
      ], tab, 'tab-akses') +

      (tab === 'pegawai' ? tabPegawai()
        : tab === 'matriks' ? tabMatriks()
        : tab === 'riwayat' ? tabRiwayat()
        : tabPeran());
  }

  function mount(root) {
    U.delegate(root, {
      'tab-akses': function (el) { tab = el.dataset.key; APP.refresh(); },
      'persona-matriks': function (el) { personaMatriks = el.value; APP.refresh(); },
      'peran-baru': function () { dialogPeran(null); },
      'peran-edit': function (el) { dialogPeran(el.dataset.id); },
      'peran-salin': function (el) {
        var baru = AKSES.salinPeran(el.dataset.id, APP.user.id);
        if (!baru) return;
        UI.toast(I18N.t('Salinan dibuat — silakan ubah nama dan izinnya'), 'ok');
        APP.refresh();
        dialogPeran(baru.id);
      },
      'izin-khusus': function (el) { dialogIzinKhusus(el.dataset.id); },
      'pasang-peran': function (el) {
        var hasil = AKSES.pasangPeran(el.dataset.id, el.value, APP.user.id);
        if (hasil.error) { UI.toast(hasil.error, 'err'); APP.refresh(); return; }
        UI.toast('Peran dipasang — penyesuaian pribadi ikut dibersihkan', 'ok');
        APP.refresh();
      }
    });
  }

  var pagesAdmin = {
    akses: { label: 'Peran & Hak Akses', icon: '🔐', grup: 'Sistem',
      sub: 'Atur menu dan aksi yang boleh dibuka tiap pegawai',
      render: render, mount: mount,
      badge: function () { return AKSES.statistik().tanpaPeran; } }
  };

  return { pagesAdmin: pagesAdmin, dialogPeran: dialogPeran, dialogIzinKhusus: dialogIzinKhusus };
})();
