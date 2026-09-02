/* ==========================================================================
   views/kompetensi.js — Fungsi Kerja
   Mitra : memilih fungsi kerja, menempuh kursusnya, melihat sertifikatnya
   Admin : peta kompetensi tim dan layanan yang belum ada mitranya
   --------------------------------------------------------------------------
   Aturan tampilan yang dipegang: kartu fungsi kerja selalu menunjukkan
   LANGKAH BERIKUTNYA, bukan sekadar status. Mitra yang membuka halaman ini
   harus langsung tahu apa yang harus ia kerjakan hari ini untuk membuka
   pekerjaan yang ia inginkan.
   ========================================================================== */
var ViewKompetensi = (function () {

  var T = function (s) { return I18N.t(s); };

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ SISI MITRA */
  var tabMitra = 'saya';

  function renderMitra() {
    var u = DB.find('users', APP.user.id) || APP.user;
    var rekap = KOMPETENSI.rekap(u);
    var aktif = rekap.filter(function (r) { return r.kode === 'aktif'; });
    var proses = rekap.filter(function (r) { return ['belajar', 'ujian', 'terkunci'].indexOf(r.kode) >= 0; });
    var kedaluwarsa = rekap.filter(function (r) { return r.kode === 'kedaluwarsa'; });
    var belum = rekap.filter(function (r) { return r.kode === 'belum'; });

    return '' +
      '<div class="grid g-3 mb-3">' +
        UI.stat({ label: T('Fungsi kerja aktif'), value: aktif.length, icon: '✅',
          meta: aktif.length ? T('boleh menerima penugasan') : T('belum ada yang bisa ditugaskan') }) +
        UI.stat({ label: T('Sedang ditempuh'), value: proses.length, icon: '📖',
          meta: T('menunggu Anda selesaikan') }) +
        UI.stat({ label: T('Layanan terbuka'), value: jumlahLayanan(aktif), icon: '🧾',
          meta: T('jenis pekerjaan yang bisa Anda ambil') }) +
      '</div>' +

      (kedaluwarsa.length
        ? UI.alert('danger', '<b>' + kedaluwarsa.length + ' ' + T('sertifikat kedaluwarsa.') + '</b> ' +
            T('Anda tidak bisa ditugaskan pada pekerjaan itu sampai kursusnya diulang.'), '⏰') +
          '<div class="mb-3"></div>'
        : '') +

      (!aktif.length
        ? UI.alert('info', '<b>' + T('Pilih fungsi kerja yang Anda inginkan.') + '</b> ' +
            T('Setiap fungsi punya satu kursus sertifikasi. Setelah lulus, pekerjaan pada layanan ' +
              'tersebut mulai masuk ke jadwal Anda.'), '🎯') + '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'saya', label: '🎯 ' + T('Fungsi Kerja Saya'), n: aktif.length + proses.length + kedaluwarsa.length },
        { key: 'tersedia', label: '➕ ' + T('Daftar Fungsi Baru'), n: belum.length }
      ], tabMitra, 'tab-komp') +

      (tabMitra === 'tersedia' ? tabTersedia(belum) : tabSaya(u, aktif, proses, kedaluwarsa));
  }

  function jumlahLayanan(list) {
    var n = 0;
    list.forEach(function (r) { n += KOMPETENSI.layananFungsi(r.f.kode).length; });
    return n;
  }

  function tabSaya(u, aktif, proses, kedaluwarsa) {
    var punya = kedaluwarsa.concat(proses, aktif);
    if (!punya.length) {
      return UI.card({ body: UI.empty('🎯', T('Belum ada fungsi kerja terdaftar'),
        T('Buka tab "Daftar Fungsi Baru" dan pilih pekerjaan yang ingin Anda jalani.')) });
    }
    return '<div class="grid g-2">' + punya.map(function (r) { return kartuMitra(u, r); }).join('') + '</div>';
  }

  function tabTersedia(belum) {
    if (!belum.length) {
      return UI.card({ body: UI.empty('🏆', T('Anda sudah mendaftar seluruh fungsi kerja'),
        T('Tidak ada lagi yang bisa ditambahkan.')) });
    }
    return UI.alert('info', T('Pilih sesuai minat dan kemampuan Anda. Tidak ada batas jumlah — ' +
        'tetapi setiap fungsi menuntut satu kursus sertifikasi yang harus benar-benar Anda lulusi.'), 'ℹ️') +
      '<div class="mb-3"></div>' +
      '<div class="grid g-3">' + belum.map(kartuTersedia).join('') + '</div>';
  }

  function kartuTersedia(r) {
    var f = r.f;
    var layanan = KOMPETENSI.layananFungsi(f.kode);
    var k = KOMPETENSI.kursusFungsi(f.kode);
    return '<div class="card fk-card"><div class="card__body">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
          '<div class="fk-ic">' + f.ikon + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div class="fk-nama">' + U.esc(T(f.nama)) + '</div>' +
            '<div class="fk-ket">' + U.esc(T(f.ket)) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="row wrap mt-2" style="gap:5px">' +
          KOMPETENSI.chipRisiko(f.risiko) +
          '<span class="chip chip--soft chip--xs">' + layanan.length + ' ' + T('layanan') + '</span>' +
          (k ? '<span class="chip chip--soft chip--xs">' + T('nilai min') + ' ' + k.nilaiMin + '</span>' : '') +
        '</div>' +
        (k ? '<div class="tbl-sub mt-2">📘 ' + U.esc(k.judul) + ' • ' + k.durasiMenit + ' ' +
          T('menit') + '</div>' : '') +
        '<div class="row fk-kaki">' +
          '<button class="btn btn--ghost btn--sm" data-act="lihat-fungsi" data-id="' + f.kode + '">' +
            T('Rincian') + '</button>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn--sm" data-act="daftar-fungsi" data-id="' + f.kode + '">' +
            T('Daftar') + '</button>' +
        '</div>' +
      '</div></div>';
  }

  function kartuMitra(u, r) {
    var f = r.f, k = r.kursus;
    var layanan = KOMPETENSI.layananFungsi(f.kode);

    /* Langkah berikutnya — inti dari kartu ini */
    var aksi = '', pesan = '';
    if (r.kode === 'aktif') {
      pesan = UI.alert('ok', T('Anda boleh menerima penugasan untuk') + ' <b>' + layanan.length + ' ' +
        T('layanan') + '</b> ' + T('pada fungsi kerja ini.') +
        (r.sertifikat ? '<br>' + T('Sertifikat berlaku sampai') + ' <b>' +
          U.tglPanjang(r.sertifikat.berlakuHingga) + '</b>.' : ''), '✅');
      aksi = '<button class="btn btn--ghost btn--sm" data-act="lihat-sert" data-id="' +
        (r.sertifikat ? r.sertifikat.id : '') + '">' + T('Lihat Sertifikat') + '</button>';
    } else if (r.kode === 'kedaluwarsa') {
      pesan = UI.alert('danger', T('Sertifikat Anda sudah lewat masa berlakunya. Ulangi kursus dan ' +
        'ujiannya untuk membuka kembali pekerjaan ini.'), '⏰');
      aksi = '<button class="btn btn--sm" data-act="buka-kursus" data-id="' + (k ? k.id : '') + '">' +
        T('Ulangi Kursus') + '</button>';
    } else if (r.kode === 'terkunci') {
      pesan = UI.alert('warn', T('Selesaikan dulu lima kursus wajib mitra. Kursus fungsi kerja terbuka ' +
        'setelah Anda menjadi mitra tersertifikasi.'), '🔒');
      aksi = '<button class="btn btn--ghost btn--sm" data-act="ke-belajar">' +
        T('Buka Pembelajaran') + '</button>';
    } else if (r.kode === 'ujian') {
      pesan = UI.alert('warn', T('Materi sudah tuntas. Tinggal ujian sertifikasinya — nilai minimum') +
        ' <b>' + (k ? k.nilaiMin : 85) + '</b>.', '📝');
      aksi = '<button class="btn btn--sm" data-act="buka-kursus" data-id="' + (k ? k.id : '') + '">' +
        T('Ikuti Ujian') + '</button>';
    } else {
      pesan = UI.progress(r.persen || 0) +
        '<div class="tbl-sub mt-1">' + (r.persen || 0) + '% ' + T('materi selesai') + '</div>';
      aksi = '<button class="btn btn--sm" data-act="buka-kursus" data-id="' + (k ? k.id : '') + '">' +
        ((r.persen || 0) > 0 ? T('Lanjut Belajar') : T('Mulai Belajar')) + '</button>';
    }

    return '<div class="card fk-card fk-card--' + r.kode + '"><div class="card__body">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' +
          '<div class="fk-ic">' + f.ikon + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div class="fk-nama">' + U.esc(T(f.nama)) + '</div>' +
            '<div class="row wrap mt-1" style="gap:5px">' +
              KOMPETENSI.chipStatus(r.kode) + KOMPETENSI.chipRisiko(f.risiko) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mt-2">' + pesan + '</div>' +
        '<div class="row fk-kaki">' +
          '<button class="btn btn--ghost btn--sm" data-act="lihat-fungsi" data-id="' + f.kode + '">' +
            T('Layanan') + '</button>' +
          (r.kode !== 'aktif'
            ? '<button class="btn btn--ghost btn--danger btn--sm" data-act="batal-fungsi" data-id="' +
              f.kode + '">' + T('Batalkan') + '</button>' : '') +
          '<div class="spacer"></div>' + aksi +
        '</div>' +
      '</div></div>';
  }

  /* ---------------------------------------------------------------- rincian fungsi */
  function dialogFungsi(kode) {
    var f = KOMPETENSI.fungsi(kode);
    if (!f) return;
    var k = KOMPETENSI.kursusFungsi(kode);
    var layanan = KOMPETENSI.layananFungsi(kode);
    var grup = U.groupBy(layanan, function (s) { return s.kategori || '—'; });
    var st = APP.user ? KOMPETENSI.status(DB.find('users', APP.user.id) || APP.user, kode) : null;

    UI.modal({
      title: f.ikon + ' ' + T(f.nama), sub: T(f.ket), size: 'wide',
      body: '<div class="row wrap mb-3" style="gap:6px">' +
          (st ? KOMPETENSI.chipStatus(st.kode) : '') + KOMPETENSI.chipRisiko(f.risiko) +
          '<span class="chip chip--soft">' + layanan.length + ' ' + T('layanan') + '</span>' +
        '</div>' +

        (k ? UI.alert('brand', '<b>' + T('Sertifikasi pembuka') + ':</b> ' + U.esc(k.judul) +
          '<br>' + k.durasiMenit + ' ' + T('menit') + ' • ' + T('nilai minimum') + ' ' + k.nilaiMin +
          ' • ' + T('berlaku') + ' ' + Math.round(k.masaBerlakuHari / 365 * 10) / 10 + ' ' +
          T('tahun'), '🎓') : '') +

        Panel.seksi(T('Layanan yang terbuka'), Object.keys(grup).map(function (kat) {
          return '<div class="mt-2"><div class="nav-group" style="padding:6px 0">' + U.esc(kat) + '</div>' +
            '<div class="row wrap" style="gap:5px">' + grup[kat].map(function (s) {
              return '<span class="chip chip--soft chip--xs">' + U.esc(s.nama) +
                (s.varian && s.varian.length ? ' (' + s.varian.length + ')' : '') + '</span>';
            }).join('') + '</div></div>';
        }).join('') || '<div class="tbl-sub">' + T('Belum ada layanan terhubung.') + '</div>'),

      foot: (st && st.kode === 'belum'
        ? '<button class="btn" data-act="daftar-dari-dialog" data-id="' + kode + '">' +
          T('Daftar Fungsi Ini') + '</button>' : '') +
        '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: {
        'daftar-dari-dialog': function (el) { tutup(el); daftarFungsi(kode); }
      }
    });
  }

  function daftarFungsi(kode) {
    var f = KOMPETENSI.fungsi(kode);
    var k = KOMPETENSI.kursusFungsi(kode);
    UI.konfirm({
      title: T('Daftar fungsi kerja') + ' ' + T(f.nama) + '?',
      htmlText: T('Anda akan mengikuti kursus') + ' <b>' + U.esc(k ? k.judul : '—') + '</b> ' +
        T('dan wajib lulus dengan nilai minimum') + ' <b>' + (k ? k.nilaiMin : 85) + '</b> ' +
        T('sebelum bisa menerima penugasan pada layanan ini.') +
        (f.risiko === 'tinggi'
          ? '<br><br>⚠️ ' + T('Fungsi kerja ini tergolong berisiko tinggi — materi keselamatannya ' +
            'lebih ketat dan sertifikatnya berlaku lebih singkat.') : ''),
      okText: T('Ya, daftarkan saya')
    }).then(function (ya) {
      if (!ya) return;
      var h = KOMPETENSI.daftarkan(APP.user.id, kode);
      if (h.error) { UI.toast(h.error, 'err'); return; }
      APP.perbaruiSesi(DB.find('users', APP.user.id));
      tabMitra = 'saya';
      UI.toast(T('Terdaftar. Selesaikan kursusnya untuk membuka pekerjaan ini.'), 'ok');
      APP.refresh();
    });
  }

  function aksiMitra(root) {
    U.delegate(root, {
      'tab-komp': function (el) { tabMitra = el.getAttribute('data-key'); APP.refresh(); },
      'lihat-fungsi': function (el) { dialogFungsi(el.getAttribute('data-id')); },
      'daftar-fungsi': function (el) { daftarFungsi(el.getAttribute('data-id')); },
      'batal-fungsi': function (el) {
        var kode = el.getAttribute('data-id');
        UI.konfirm({ title: T('Batalkan pendaftaran?'),
          text: T('Progres belajar Anda tetap tersimpan bila nanti mendaftar lagi.'),
          okText: T('Ya, batalkan') }).then(function (ya) {
          if (!ya) return;
          var h = KOMPETENSI.batalkan(APP.user.id, kode);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          APP.perbaruiSesi(DB.find('users', APP.user.id));
          UI.toast(T('Pendaftaran dibatalkan'), 'ok');
          APP.refresh();
        });
      },
      'buka-kursus': function (el) {
        var id = el.getAttribute('data-id');
        if (!id) { UI.toast(T('Kursus belum tersedia'), 'err'); return; }
        APP.go('belajar', { kursusId: id });
      },
      'ke-belajar': function () { APP.go('belajar'); },
      'lihat-sert': function (el) {
        var id = el.getAttribute('data-id');
        if (id) ViewBelajar.lihatSertifikat(id);
      }
    });
  }

  /* ================================================================ SISI ADMIN */
  var tabAdmin = 'peta';

  function renderAdmin() {
    var st = KOMPETENSI.statistik();

    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Fungsi kerja'), value: st.fungsi, icon: '🎯',
          meta: KATALOG.jumlah().sub + ' ' + T('layanan dalam katalog') }) +
        UI.stat({ label: T('Mitra aktif'), value: st.mitra, icon: '👷',
          meta: T('rata-rata') + ' ' + st.rataFungsiPerMitra + ' ' + T('fungsi per mitra') }) +
        UI.stat({ label: T('Belum berkompetensi'), value: st.tanpaFungsi, icon: '⏳',
          meta: T('mitra belum punya fungsi aktif') }) +
        UI.stat({ label: T('Fungsi tanpa mitra'), value: st.kosong.length, icon: '⚠️',
          meta: st.kosong.length ? T('layanan ini belum bisa dijual') : T('semua terisi') }) +
      '</div>' +

      (st.kosong.length
        ? UI.alert('warn', '<b>' + st.kosong.length + ' ' + T('fungsi kerja belum punya mitra ' +
            'tersertifikasi.') + '</b> ' + T('Pesanan pada layanan berikut belum bisa ditugaskan') +
            ': ' + st.kosong.map(function (x) { return U.esc(T(x.fungsi.nama)); }).join(', ') + '.', '⚠️') +
          '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'peta', label: '🗺️ ' + T('Peta Kompetensi') },
        { key: 'mitra', label: '👷 ' + T('Per Mitra'), n: st.mitra },
        { key: 'katalog', label: '📚 ' + T('Katalog Layanan'), n: KATALOG.jumlah().sub }
      ], tabAdmin, 'tab-kompa') +

      (tabAdmin === 'mitra' ? tabPerMitra()
        : tabAdmin === 'katalog' ? tabKatalog()
        : tabPeta(st));
  }

  function tabPeta(st) {
    return UI.card({ flush: true, body: UI.table([
      { h: T('Fungsi kerja'), r: function (x) {
        return '<div class="row"><span class="fk-ic fk-ic--sm">' + x.fungsi.ikon + '</span>' +
          '<div style="min-width:0"><div class="tbl-title">' + U.esc(T(x.fungsi.nama)) + '</div>' +
          '<div class="tbl-sub">' + U.esc(T(x.fungsi.ket)) + '</div></div></div>'; } },
      { h: T('Risiko'), r: function (x) { return KOMPETENSI.chipRisiko(x.fungsi.risiko); } },
      { h: T('Layanan'), cls: 'num', r: function (x) { return x.layanan; } },
      { h: T('Tersertifikasi'), cls: 'num', r: function (x) {
        return x.aktif ? '<b class="txt-ok">' + x.aktif + '</b>'
          : '<b class="txt-danger">0</b>'; } },
      { h: T('Sedang belajar'), cls: 'num', r: function (x) { return x.proses || '—'; } },
      { h: T('Kedaluwarsa'), cls: 'num', r: function (x) {
        return x.kedaluwarsa ? '<span class="txt-danger">' + x.kedaluwarsa + '</span>' : '—'; } },
      { h: '', cls: 'act', r: function (x) {
        return '<button class="btn btn--ghost btn--sm" data-act="fungsi-detail" data-id="' +
          x.fungsi.kode + '">' + T('Rincian') + '</button>'; } }
    ], st.perFungsi, { icon: '🎯', judul: T('Belum ada fungsi kerja') }) });
  }

  function tabPerMitra() {
    var mitra = DB.all('users').filter(function (u) { return u.role === 'worker' && u.aktif; });
    var fungsi = KOMPETENSI.semuaFungsi();

    var head = '<tr><th style="width:210px">' + T('Mitra') + '</th>' +
      fungsi.map(function (f) {
        return '<th class="mtx-th" title="' + U.esc(T(f.nama)) + '"><span>' + f.ikon + '<br>' +
          U.esc(U.potong(T(f.nama), 16)) + '</span></th>'; }).join('') + '</tr>';

    var body = mitra.map(function (u) {
      return '<tr><td><div class="row">' + UI.avatar(u.nama, 'sm') +
        '<div style="min-width:0"><div class="tbl-title">' + U.esc(u.nama) + '</div>' +
        '<div class="tbl-sub">' + UI.statusText('mitra', u.statusMitra) + '</div></div></div></td>' +
        fungsi.map(function (f) {
          var s = KOMPETENSI.status(u, f.kode);
          var tanda = { aktif: '<span class="mtx-ya">✓</span>',
            ujian: '<span class="fk-mini fk-mini--warn">ujian</span>',
            belajar: '<span class="fk-mini fk-mini--info">belajar</span>',
            terkunci: '<span class="fk-mini">🔒</span>',
            kedaluwarsa: '<span class="fk-mini fk-mini--danger">⏰</span>',
            belum: '<span class="mtx-no">·</span>' }[s.kode];
          return '<td class="mtx-cel" title="' + U.esc(T(s.t)) + '">' + tanda + '</td>';
        }).join('') + '</tr>';
    }).join('');

    return UI.card({ flush: true, body: mitra.length
      ? '<div class="tbl-wrap mtx-wrap"><table class="tbl mtx"><thead>' + head + '</thead><tbody>' +
        body + '</tbody></table></div>'
      : UI.empty('👷', T('Belum ada mitra aktif')) });
  }

  function tabKatalog() {
    return '<div class="grid g-2">' + KATALOG.GRUP.map(function (g) {
      var f = KOMPETENSI.fungsi(g.fungsi);
      var siap = f ? KOMPETENSI.mitraFungsi(f.kode).length : 0;
      return '<div class="card"><div class="card__body">' +
          '<div class="row" style="gap:10px;align-items:flex-start">' +
            '<div class="fk-ic">' + g.ikon + '</div>' +
            '<div style="min-width:0;flex:1">' +
              '<div class="fk-nama">' + U.esc(g.nama) + '</div>' +
              '<div class="fk-ket">' + U.esc(g.ket) + '</div>' +
            '</div>' +
            '<div class="peran-card__n"><b>' + g.sub.length + '</b><small>' + T('layanan') +
              '</small></div>' +
          '</div>' +
          '<div class="row wrap mt-2" style="gap:5px">' +
            (f ? '<span class="chip chip--soft chip--xs">' + f.ikon + ' ' + U.esc(T(f.nama)) +
              '</span>' : '') +
            '<span class="chip chip--' + (siap ? 'ok' : 'danger') + ' chip--xs">' + siap + ' ' +
              T('mitra siap') + '</span>' +
            ((g.opsi || []).length ? '<span class="chip chip--muted chip--xs">' + g.opsi.length + ' ' +
              T('opsi pesanan') + '</span>' : '') +
          '</div>' +
          '<div class="mt-2 row wrap" style="gap:4px">' + g.sub.slice(0, 6).map(function (s) {
            return '<span class="chip chip--xs">' + U.esc(s.nama) + '</span>'; }).join('') +
            (g.sub.length > 6 ? '<span class="chip chip--xs chip--muted">+' + (g.sub.length - 6) +
              '</span>' : '') +
          '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  function dialogFungsiAdmin(kode) {
    var f = KOMPETENSI.fungsi(kode);
    var siap = KOMPETENSI.mitraFungsi(kode);
    var semua = DB.all('users').filter(function (u) { return u.role === 'worker' && u.aktif; });
    var rows = semua.map(function (u) { return { u: u, s: KOMPETENSI.status(u, kode) }; })
      .filter(function (r) { return r.s.kode !== 'belum'; });

    UI.modal({
      title: f.ikon + ' ' + T(f.nama), sub: T(f.ket), size: 'wide',
      body: '<div class="row wrap mb-3" style="gap:6px">' + KOMPETENSI.chipRisiko(f.risiko) +
          '<span class="chip chip--' + (siap.length ? 'ok' : 'danger') + '">' + siap.length + ' ' +
          T('mitra tersertifikasi') + '</span>' +
          '<span class="chip chip--soft">' + KOMPETENSI.layananFungsi(kode).length + ' ' +
          T('layanan') + '</span></div>' +
        (siap.length ? '' : UI.alert('danger', T('Belum ada mitra yang tersertifikasi untuk fungsi ini. ' +
          'Pesanan pada layanannya belum bisa dijadwalkan — dorong mitra mengambil kursusnya, atau ' +
          'rekrut mitra baru dengan keahlian ini.'), '⚠️')) +
        UI.table([
          { h: T('Mitra'), r: function (r) { return '<div class="row">' + UI.avatar(r.u.nama, 'sm') +
            '<div class="tbl-title">' + U.esc(r.u.nama) + '</div></div>'; } },
          { h: T('Status'), r: function (r) { return KOMPETENSI.chipStatus(r.s.kode); } },
          { h: T('Sertifikat'), r: function (r) { return r.s.sertifikat
            ? '<div class="code">' + U.esc(r.s.sertifikat.no) + '</div>' +
              '<div class="tbl-sub">' + T('berlaku sampai') + ' ' +
              U.tglPanjang(r.s.sertifikat.berlakuHingga) + '</div>'
            : '<span class="tbl-sub">—</span>'; } },
          { h: T('Nilai'), cls: 'num', r: function (r) { return r.s.sertifikat
            ? r.s.sertifikat.nilai : (r.s.persen !== undefined ? r.s.persen + '%' : '—'); } }
        ], rows, { icon: '👷', judul: T('Belum ada mitra yang mendaftar fungsi ini') }),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
    });
  }

  function aksiAdmin(root) {
    U.delegate(root, {
      'tab-kompa': function (el) { tabAdmin = el.getAttribute('data-key'); APP.refresh(); },
      'fungsi-detail': function (el) { dialogFungsiAdmin(el.getAttribute('data-id')); }
    });
  }

  /* ================================================================ PAGES */
  var pageMitra = {
    label: 'Fungsi Kerja', icon: '🎯', grup: 'Utama',
    sub: 'Pilih pekerjaan yang ingin Anda jalani',
    render: renderMitra, mount: aksiMitra,
    badge: function () {
      var u = DB.find('users', APP.user.id) || APP.user;
      return KOMPETENSI.rekap(u).filter(function (r) {
        return ['ujian', 'kedaluwarsa'].indexOf(r.kode) >= 0; }).length;
    }
  };

  var pagesAdmin = {
    kompetensi: {
      label: 'Fungsi Kerja & Kompetensi', icon: '🎯', grup: 'Kemitraan',
      sub: 'Peta kompetensi mitra & katalog layanan',
      render: renderAdmin, mount: aksiAdmin,
      badge: function () { return KOMPETENSI.statistik().kosong.length; }
    }
  };

  return { pageMitra: pageMitra, pagesAdmin: pagesAdmin,
           dialogFungsi: dialogFungsi, dialogFungsiAdmin: dialogFungsiAdmin };
})();
