/* ==========================================================================
   views/dompet.js — Dompet mitra & antrean penarikan sisi admin
   --------------------------------------------------------------------------
   Mitra : saldo, tarik dana (bergerbang PIN), riwayat mutasi & penarikan
   Admin : antrean penarikan, transfer, tolak, pengaturan biaya & batas

   Prinsip tampilannya sama dengan halaman bagi hasil: setiap rupiah harus
   bisa ditelusuri. Karena itu mutasi menampilkan saldo setelah setiap baris,
   dan setiap penarikan bisa dibuka rincian biayanya.
   ========================================================================== */
var ViewDompet = (function () {

  var T = function (s) { return I18N.t(s); };

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ SISI MITRA */
  var tabMitra = 'mutasi';

  function renderMitra() {
    var u = DB.find('users', APP.user.id) || APP.user;
    var c = DOMPET.config();
    var saldo = DOMPET.saldo(u.id);
    var tahan = DOMPET.tertahan(u.id);
    var bulan = DOMPET.ringkasBulan(u.id);
    var halangan = DOMPET.periksaSyarat(u);
    var rek = (u.rekening || [])[0];

    return '' +
      /* ---- kartu saldo ---- */
      '<div class="dompet-kartu">' +
        '<div class="dompet-kartu__atas">' +
          '<div>' +
            '<div class="dompet-kartu__label">' + T('Saldo tersedia') + '</div>' +
            '<div class="dompet-kartu__nilai">' + U.rp(saldo) + '</div>' +
          '</div>' +
          '<div class="dompet-kartu__ic">💰</div>' +
        '</div>' +
        (tahan ? '<div class="dompet-kartu__tahan">' + T('Sedang diproses') + ': <b>' +
          U.rp(tahan) + '</b> — ' + T('sudah dipotong dari saldo di atas') + '</div>' : '') +
        '<div class="dompet-kartu__bawah">' +
          '<div><small>' + T('Masuk bulan ini') + '</small><b>+' + U.rpShort(bulan.masuk) + '</b></div>' +
          '<div><small>' + T('Ditarik bulan ini') + '</small><b>−' + U.rpShort(bulan.keluar) + '</b></div>' +
          '<div><small>' + T('Rekening tujuan') + '</small><b>' +
            (rek ? U.esc(rek.bank) + ' ••' + String(rek.nomor).slice(-4)
                 : '<span style="opacity:.7">' + T('belum diatur') + '</span>') + '</b></div>' +
        '</div>' +
        '<button class="btn btn--lg btn--block dompet-kartu__tarik" data-act="tarik"' +
          (halangan ? ' disabled' : '') + '>🏦 ' + T('Tarik Saldo') + '</button>' +
      '</div>' +

      (halangan
        ? UI.alert('warn', '<b>' + T('Penarikan belum bisa dilakukan.') + '</b> ' + U.esc(halangan) +
            (/PIN/.test(halangan)
              ? ' <a href="#" data-act="ke-keamanan">' + T('Buat PIN sekarang') + ' →</a>'
              : /[Rr]ekening/.test(halangan)
                ? ' <a href="#" data-act="ke-rekening">' + T('Tambah rekening') + ' →</a>' : ''), '⚠️') +
          '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'mutasi', label: '📒 ' + T('Riwayat Saldo') },
        { key: 'tarik', label: '🏦 ' + T('Penarikan'), n: DOMPET.penarikan(u.id).length },
        { key: 'info', label: 'ℹ️ ' + T('Ketentuan') }
      ], tabMitra, 'tab-dompet') +

      (tabMitra === 'tarik' ? tabPenarikanMitra(u)
        : tabMitra === 'info' ? tabInfo(c)
        : tabMutasi(u));
  }

  function tabMutasi(u) {
    var list = DOMPET.mutasi(u.id);
    return UI.card({ flush: true, body: list.length
      ? '<div class="mutasi-list">' + list.map(function (m) {
          var j = DOMPET.JENIS[m.jenis] || { t: m.jenis, ic: '•' };
          var naik = m.jumlah > 0;
          return '<div class="mutasi-row">' +
            '<div class="mutasi-ic ' + (naik ? 'naik' : 'turun') + '">' + j.ic + '</div>' +
            '<div style="min-width:0;flex:1">' +
              '<b>' + U.esc(T(j.t)) + '</b>' +
              '<div class="tbl-sub">' + U.esc(m.ket) + '</div>' +
              '<div class="tbl-sub">' + U.tglJam(m.at) + '</div>' +
            '</div>' +
            '<div class="mutasi-nom">' +
              '<b class="' + (naik ? 'txt-ok' : 'txt-danger') + '">' +
                (naik ? '+' : '−') + U.rp(Math.abs(m.jumlah)) + '</b>' +
              '<small>' + T('saldo') + ' ' + U.rpShort(m.saldoSetelah) + '</small>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>'
      : UI.empty('📒', T('Belum ada mutasi'),
          T('Saldo bertambah otomatis setiap slip bagi hasil Anda disetujui admin.')) });
  }

  function tabPenarikanMitra(u) {
    var list = DOMPET.penarikan(u.id);
    return UI.card({ flush: true, body: UI.table([
      { h: T('No.'), r: function (x) { return '<div class="code">' + U.esc(x.no) + '</div>' +
        '<div class="tbl-sub">' + U.tglJam(x.createdAt) + '</div>'; } },
      { h: T('Tujuan'), r: function (x) { return '<div class="tbl-title">' + U.esc(x.rekening.bank) +
        '</div><div class="tbl-sub">' + U.esc(x.rekening.nomor) + '</div>'; } },
      { h: T('Nominal'), cls: 'num', r: function (x) { return U.rp(x.jumlah); } },
      { h: T('Diterima'), cls: 'num', r: function (x) { return '<b>' + U.rp(x.diterima) + '</b>'; } },
      { h: T('Status'), r: function (x) { return DOMPET.chip(x.status) +
        (x.catatan ? '<div class="tbl-sub">' + U.esc(x.catatan) + '</div>' : ''); } },
      { h: '', cls: 'act', r: function (x) {
        return '<button class="btn btn--ghost btn--sm" data-act="rinci-tarik" data-id="' + x.id +
          '">' + T('Rincian') + '</button>' +
          (x.status === 'diajukan'
            ? '<button class="btn btn--ghost btn--danger btn--sm" data-act="batal-tarik" data-id="' +
              x.id + '">' + T('Batalkan') + '</button>' : ''); } }
    ], list, { icon: '🏦', judul: T('Belum pernah menarik saldo'),
      teks: T('Penarikan yang Anda ajukan akan tampil di sini beserta status transfernya.') }) });
  }

  function tabInfo(c) {
    return '<div class="grid g-2">' +
      UI.card({ title: T('Ketentuan penarikan'), body: '<dl class="kv">' +
          '<dt>' + T('Penarikan minimal') + '</dt><dd>' + U.rp(c.minTarik) + '</dd>' +
          '<dt>' + T('Biaya transfer') + '</dt><dd>' + U.rp(c.biayaAdmin) +
            ' <span class="tbl-sub">' + T('dipotong dari nominal') + '</span></dd>' +
          '<dt>' + T('Batas per hari') + '</dt><dd>' + c.maksPerHari + ' ' + T('pengajuan') + '</dd>' +
          '<dt>' + T('Jam proses') + '</dt><dd>' + U.esc(c.jamLayanan) + '</dd>' +
          '<dt>' + T('Perkiraan sampai') + '</dt><dd>' + c.estimasiJam + ' ' + T('jam kerja') + '</dd>' +
        '</dl>' +
        UI.alert('info', T('Dana dipotong dari saldo begitu penarikan diajukan, dan dikembalikan ' +
          'utuh bila Anda batalkan atau admin menolaknya. Jadi angka “saldo tersedia” selalu ' +
          'menunjukkan dana yang benar-benar bisa Anda pakai.'), 'ℹ️') }) +

      UI.card({ title: T('Keamanan penarikan'), body:
        '<div class="cek-list cek-list--tegak">' +
          '<span class="cek on">✓ ' + T('Setiap penarikan wajib PIN 6 angka') + '</span>' +
          '<span class="cek on">✓ ' + T('PIN terkunci 15 menit setelah 5 kali salah') + '</span>' +
          '<span class="cek on">✓ ' + T('Rekening tujuan dibekukan pada dokumen penarikan') + '</span>' +
          '<span class="cek on">✓ ' + T('Notifikasi WhatsApp di setiap perubahan status') + '</span>' +
        '</div>' +
        UI.alert('warn', '<b>' + T('EXOCLEAN tidak pernah meminta PIN Anda.') + '</b> ' +
          T('Tidak lewat telepon, WhatsApp, maupun admin di lapangan. Siapa pun yang meminta PIN ' +
            'Anda sedang mencoba menipu.'), '🚨') }) +
    '</div>';
  }

  /* ---------------------------------------------------------------- dialog tarik */
  function dialogTarik() {
    var u = DB.find('users', APP.user.id);
    var c = DOMPET.config();
    var saldo = DOMPET.saldo(u.id);
    var rekList = u.rekening || [];

    var halangan = DOMPET.periksaSyarat(u);
    if (halangan) { UI.toast(halangan, 'err'); return; }

    var cepat = [50000, 100000, 250000].filter(function (n) { return n <= saldo; });

    UI.modal({
      title: T('Tarik Saldo'), sub: T('Saldo tersedia') + ' ' + U.rp(saldo), size: 'narrow',
      body: '<form data-form>' +
          UI.field({ name: 'jumlah', label: T('Nominal penarikan'), type: 'number',
            value: Math.min(saldo, c.minTarik), min: c.minTarik,
            hint: T('Minimal') + ' ' + U.rp(c.minTarik) + ' • ' + T('maksimal') + ' ' + U.rp(saldo) }) +
          '<div class="chip-pilih">' + cepat.map(function (n) {
            return '<button type="button" class="chip chip--soft" data-act="nominal" data-n="' + n +
              '">' + U.rpShort(n) + '</button>'; }).join('') +
            '<button type="button" class="chip chip--soft" data-act="nominal" data-n="' + saldo +
              '">' + T('Semua') + '</button>' +
          '</div>' +
          UI.field({ name: 'rek', label: T('Rekening tujuan'), type: 'select',
            options: rekList.map(function (r, i) {
              return { value: String(i), label: r.bank + ' ' + r.nomor + ' — ' + r.atasNama }; }) }) +
        '</form>' +
        '<div class="rincian-tarik mt-3" data-rincian></div>' +
        UI.alert('info', T('Setelah Anda lanjut, aplikasi akan meminta PIN transaksi.'), '🔐'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="lanjut">' + T('Lanjutkan') + '</button>',
      onMount: function (root) {
        var inp = root.querySelector('[name="jumlah"]');
        function hitung() {
          var n = Math.round(Number(inp.value) || 0);
          var sah = n >= c.minTarik && n <= saldo && n > c.biayaAdmin;
          root.querySelector('[data-rincian]').innerHTML =
            '<div class="row"><span>' + T('Nominal ditarik') + '</span><div class="spacer"></div><b>' +
              U.rp(n) + '</b></div>' +
            '<div class="row"><span>' + T('Biaya transfer') + '</span><div class="spacer"></div><b>−' +
              U.rp(c.biayaAdmin) + '</b></div>' +
            '<div class="row rincian-tarik__total"><span>' + T('Diterima di rekening') +
              '</span><div class="spacer"></div><b>' + (sah ? U.rp(DOMPET.diterima(n)) : '—') +
              '</b></div>' +
            '<div class="row"><span class="tbl-sub">' + T('Sisa saldo') + '</span>' +
              '<div class="spacer"></div><span class="tbl-sub">' +
              (sah ? U.rp(saldo - n) : '—') + '</span></div>';
          root.querySelector('[data-act="lanjut"]').disabled = !sah;
        }
        inp.addEventListener('input', hitung);
        root.addEventListener('click', function (ev) {
          var b = ev.target.closest('[data-act="nominal"]');
          if (b) { inp.value = b.getAttribute('data-n'); hitung(); }
        });
        hitung();
      },
      actions: {
        lanjut: function (el) {
          var root = el.closest('.modal');
          var d = U.readForm(root.querySelector('[data-form]'));
          var jumlah = Math.round(Number(d.jumlah) || 0);
          var idx = Number(d.rek) || 0;
          var rek = rekList[idx];

          ViewKeamanan.mintaPin({
            judul: T('Setujui penarikan'),
            sub: U.rp(jumlah) + ' → ' + rek.bank + ' ' + rek.nomor,
            rincian: UI.alert('brand',
              '<b>' + U.rp(DOMPET.diterima(jumlah)) + '</b> ' + T('akan dikirim ke') + '<br>' +
              U.esc(rek.bank) + ' ' + U.esc(rek.nomor) + ' a.n. ' + U.esc(rek.atasNama), '🏦')
          }).then(function (pin) {
            if (!pin) return;
            var hasil = DOMPET.ajukan(u.id, jumlah, idx, pin);
            if (hasil.error) { UI.toast(hasil.error, 'err'); APP.refresh(); return; }
            tutup(el);
            APP.perbaruiSesi(DB.find('users', u.id));
            dialogBerhasil(hasil.penarikan);
          });
        }
      }
    });
  }

  function dialogBerhasil(x) {
    var c = DOMPET.config();
    UI.modal({
      title: T('Penarikan diajukan'), size: 'narrow',
      body: '<div class="sukses-ikon">✅</div>' +
        '<div class="sukses-nilai">' + U.rp(x.diterima) + '</div>' +
        '<div class="tbl-sub" style="text-align:center">' + T('akan dikirim ke') + ' ' +
          U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) + '</div>' +
        '<dl class="kv mt-3">' +
          '<dt>' + T('No. penarikan') + '</dt><dd class="code">' + U.esc(x.no) + '</dd>' +
          '<dt>' + T('Nominal') + '</dt><dd>' + U.rp(x.jumlah) + '</dd>' +
          '<dt>' + T('Biaya transfer') + '</dt><dd>−' + U.rp(x.biaya) + '</dd>' +
          '<dt>' + T('Perkiraan') + '</dt><dd>' + c.estimasiJam + ' ' + T('jam kerja') + '</dd>' +
        '</dl>' +
        UI.alert('info', T('Anda bisa membatalkan selama status masih “Menunggu diproses”. ' +
          'Konfirmasi juga dikirim ke WhatsApp Anda.'), 'ℹ️'),
      foot: '<button class="btn" data-act="tutup-ok">' + T('Selesai') + '</button>',
      actions: { 'tutup-ok': function (el) {
        tutup(el); tabMitra = 'tarik'; APP.refresh(); } }
    });
  }

  function dialogRinci(id) {
    var x = DB.find('penarikan', id);
    var mut = DB.where('mutasi', function (m) {
      return m.refType === 'penarikan' && m.refId === id; });

    UI.modal({
      title: T('Penarikan') + ' ' + x.no, sub: DOMPET.STATUS[x.status].t, size: 'narrow',
      body: '<dl class="kv">' +
          '<dt>' + T('Diajukan') + '</dt><dd>' + U.tglJam(x.createdAt) + '</dd>' +
          '<dt>' + T('Nominal') + '</dt><dd>' + U.rp(x.jumlah) + '</dd>' +
          '<dt>' + T('Biaya transfer') + '</dt><dd>−' + U.rp(x.biaya) + '</dd>' +
          '<dt>' + T('Diterima') + '</dt><dd><b>' + U.rp(x.diterima) + '</b></dd>' +
          '<dt>' + T('Rekening') + '</dt><dd>' + U.esc(x.rekening.bank) + ' ' +
            U.esc(x.rekening.nomor) + '<br><span class="tbl-sub">a.n. ' +
            U.esc(x.rekening.atasNama) + '</span></dd>' +
          '<dt>' + T('Status') + '</dt><dd>' + DOMPET.chip(x.status) + '</dd>' +
          (x.ref ? '<dt>' + T('No. referensi') + '</dt><dd class="code">' + U.esc(x.ref) +
            '</dd>' : '') +
          (x.catatan ? '<dt>' + T('Catatan') + '</dt><dd>' + U.esc(x.catatan) + '</dd>' : '') +
        '</dl>' +
        Panel.seksi(T('Jejak di buku besar'), '<div class="mutasi-list">' + mut.map(function (m) {
          var naik = m.jumlah > 0;
          return '<div class="mutasi-row"><div style="min-width:0;flex:1">' +
            '<b>' + U.esc(m.ket) + '</b><div class="tbl-sub">' + U.tglJam(m.at) + '</div></div>' +
            '<div class="mutasi-nom"><b class="' + (naik ? 'txt-ok' : 'txt-danger') + '">' +
            (naik ? '+' : '−') + U.rp(Math.abs(m.jumlah)) + '</b></div></div>';
        }).join('') + '</div>'),
      foot: '<button class="btn" data-close>' + T('Tutup') + '</button>'
    });
  }

  function aksiMitra(root) {
    U.delegate(root, {
      'tab-dompet': function (el) { tabMitra = el.getAttribute('data-key'); APP.refresh(); },
      tarik: function () { dialogTarik(); },
      'rinci-tarik': function (el) { dialogRinci(el.getAttribute('data-id')); },
      'batal-tarik': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Batalkan penarikan ini?'),
          text: T('Dana akan dikembalikan penuh ke saldo Anda.'), okText: T('Ya, batalkan') })
          .then(function (ya) {
            if (!ya) return;
            var h = DOMPET.batalkan(id, APP.user.id);
            if (h.error) { UI.toast(h.error, 'err'); return; }
            UI.toast(T('Penarikan dibatalkan, dana dikembalikan'), 'ok');
            APP.refresh();
          });
      },
      'ke-keamanan': function () { APP.go('profil', { tab: 'keamanan' }); },
      'ke-rekening': function () { APP.go('profil', { tab: 'rekening' }); }
    });
  }

  /* ================================================================ SISI ADMIN */
  var fTarik = 'antre';

  function renderAdmin() {
    var st = DOMPET.statistik();
    var semua = U.sortBy(DB.all('penarikan'), function (x) { return x.createdAt; }, true);
    var grup = {
      antre: semua.filter(function (x) { return ['diajukan', 'diproses'].indexOf(x.status) >= 0; }),
      selesai: semua.filter(function (x) { return x.status === 'selesai'; }),
      lain: semua.filter(function (x) { return ['ditolak', 'batal'].indexOf(x.status) >= 0; }),
      semua: semua
    };
    var list = grup[fTarik] || semua;

    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Perlu diproses'), value: st.antre, icon: '🏦',
          meta: U.rpShort(st.nilaiAntre) + ' ' + T('menunggu transfer') }) +
        UI.stat({ label: T('Total saldo mitra'), small: true, valueHTML: U.rpShort(st.totalSaldo),
          icon: '💰', meta: st.mitraBersaldo + ' ' + T('mitra punya saldo') }) +
        UI.stat({ label: T('Dikirim bulan ini'), small: true,
          valueHTML: U.rpShort(st.dikirimBulanIni), icon: '✅', meta: T('penarikan selesai') }) +
        UI.stat({ label: T('Sedang ditransfer'), value: st.diproses, icon: '⏳',
          meta: st.diajukan + ' ' + T('baru diajukan') }) +
      '</div>' +

      (st.antre
        ? UI.alert('warn', '<b>' + st.antre + ' ' + T('penarikan menunggu.') + '</b> ' +
            T('Dana mitra sudah dipotong dari saldo mereka sejak diajukan — semakin cepat ' +
              'ditransfer, semakin baik kepercayaannya.'), '⏳') + '<div class="mb-3"></div>'
        : '') +

      UI.tabs([
        { key: 'antre', label: T('Perlu diproses'), n: grup.antre.length },
        { key: 'selesai', label: T('Selesai'), n: grup.selesai.length },
        { key: 'lain', label: T('Ditolak & batal'), n: grup.lain.length },
        { key: 'semua', label: T('Semua'), n: semua.length }
      ], fTarik, 'tab-tarik') +

      UI.card({ flush: true, body: UI.table([
        { h: T('No.'), r: function (x) { return '<div class="code">' + U.esc(x.no) + '</div>' +
          '<div class="tbl-sub">' + U.tglJam(x.createdAt) + '</div>'; } },
        { h: T('Mitra'), r: function (x) { return '<div class="row">' +
          UI.avatar(BIZ.nama(x.userId), 'sm') + '<div style="min-width:0">' +
          '<div class="tbl-title">' + U.esc(BIZ.nama(x.userId)) + '</div>' +
          '<div class="tbl-sub">' + T('sisa saldo') + ' ' + U.rpShort(DOMPET.saldo(x.userId)) +
          '</div></div></div>'; } },
        { h: T('Rekening tujuan'), r: function (x) { return '<div class="tbl-title">' +
          U.esc(x.rekening.bank) + ' ' + U.esc(x.rekening.nomor) + '</div>' +
          '<div class="tbl-sub">a.n. ' + U.esc(x.rekening.atasNama) + '</div>'; } },
        { h: T('Nominal'), cls: 'num', r: function (x) { return U.rp(x.jumlah); } },
        { h: T('Transfer'), cls: 'num', r: function (x) { return '<b>' + U.rp(x.diterima) + '</b>' +
          '<div class="tbl-sub">' + T('biaya') + ' ' + U.rp(x.biaya) + '</div>'; } },
        { h: T('Status'), r: function (x) { return DOMPET.chip(x.status) +
          (x.ref ? '<div class="tbl-sub code">' + U.esc(x.ref) + '</div>' : '') +
          (x.catatan ? '<div class="tbl-sub">' + U.esc(x.catatan) + '</div>' : ''); } },
        { h: '', cls: 'act', r: function (x) {
          if (x.status === 'diajukan') {
            return '<button class="btn btn--ghost btn--sm" data-act="tolak-tarik" data-id="' + x.id +
              '">' + T('Tolak') + '</button>' +
              '<button class="btn btn--sm" data-act="proses-tarik" data-id="' + x.id + '">' +
              T('Proses') + '</button>';
          }
          if (x.status === 'diproses') {
            return '<button class="btn btn--ghost btn--sm" data-act="tolak-tarik" data-id="' + x.id +
              '">' + T('Tolak') + '</button>' +
              '<button class="btn btn--sm" data-act="kirim-tarik" data-id="' + x.id + '">' +
              T('Sudah ditransfer') + '</button>';
          }
          return '<button class="btn btn--ghost btn--sm" data-act="rinci-tarik" data-id="' + x.id +
            '">' + T('Rincian') + '</button>';
        } }
      ], list, { icon: '🏦', judul: T('Tidak ada penarikan di kelompok ini') }) }) +

      '<div class="mt-3">' + kartuSetelan() + '</div>';
  }

  function kartuSetelan() {
    var c = DOMPET.config();
    return UI.card({
      title: '⚙️ ' + T('Ketentuan dompet mitra'),
      sub: T('Berlaku untuk penarikan yang diajukan setelah disimpan'),
      body: '<div class="grid g-3">' +
          UI.field({ name: 'minTarik', label: T('Penarikan minimal (Rp)'), type: 'number',
            value: c.minTarik }) +
          UI.field({ name: 'biayaAdmin', label: T('Biaya transfer (Rp)'), type: 'number',
            value: c.biayaAdmin, hint: T('Dipotong dari nominal, dibukukan saat dana terkirim.') }) +
          UI.field({ name: 'maksPerHari', label: T('Maksimal pengajuan / hari'), type: 'number',
            value: c.maksPerHari }) +
          UI.field({ name: 'estimasiJam', label: T('Perkiraan proses (jam kerja)'), type: 'number',
            value: c.estimasiJam }) +
        '</div>' +
        UI.field({ name: 'jamLayanan', label: T('Jam layanan transfer'), value: c.jamLayanan }) +
        UI.alert('info', T('Penarikan yang sudah diajukan tidak ikut berubah — biaya dan nominalnya ' +
          'dibekukan pada dokumennya masing-masing.'), 'ℹ️'),
      foot: '<div class="spacer"></div><button class="btn" data-act="simpan-dompet">' +
        T('Simpan Ketentuan') + '</button>'
    });
  }

  function aksiAdmin(root) {
    U.delegate(root, AKSES.lindungi({
      'tab-tarik': function (el) { fTarik = el.getAttribute('data-key'); APP.refresh(); },
      'rinci-tarik': function (el) { dialogRinci(el.getAttribute('data-id')); },

      'proses-tarik': function (el) {
        var h = DOMPET.proses(el.getAttribute('data-id'), APP.user.id);
        if (h.error) { UI.toast(h.error, 'err'); return; }
        UI.toast(T('Ditandai sedang ditransfer'), 'ok'); APP.refresh();
      },

      'kirim-tarik': function (el) {
        var id = el.getAttribute('data-id'), x = DB.find('penarikan', id);
        UI.formModal({
          title: T('Konfirmasi transfer'),
          sub: x.no + ' • ' + U.rp(x.diterima) + ' → ' + BIZ.nama(x.userId), okText: T('Simpan'),
          intro: UI.alert('brand', T('Tujuan') + ': <b>' + U.esc(x.rekening.bank) + ' ' +
            U.esc(x.rekening.nomor) + '</b> a.n. ' + U.esc(x.rekening.atasNama), '🏦') +
            '<div class="mb-3"></div>',
          fields: [{ name: 'ref', label: T('No. referensi transfer'), required: true,
            placeholder: 'mis. TRF/TRK/90231' }]
        }).then(function (d) {
          if (!d) return;
          var h = DOMPET.selesaikan(id, d.ref, APP.user.id);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          UI.toast(T('Penarikan selesai & mitra diberi tahu'), 'ok'); APP.refresh();
        });
      },

      'tolak-tarik': function (el) {
        var id = el.getAttribute('data-id');
        UI.formModal({
          title: T('Tolak penarikan'), okText: T('Tolak & kembalikan dana'),
          intro: UI.alert('warn', T('Dana akan dikembalikan penuh ke saldo mitra, dan alasannya ' +
            'dikirim lewat WhatsApp.'), '↩️') + '<div class="mb-3"></div>',
          fields: [{ name: 'alasan', label: T('Alasan penolakan'), type: 'textarea', rows: 3,
            required: true, placeholder: T('mis. Nama rekening tidak sama dengan nama mitra') }]
        }).then(function (d) {
          if (!d) return;
          var h = DOMPET.tolak(id, d.alasan, APP.user.id);
          if (h.error) { UI.toast(h.error, 'err'); return; }
          UI.toast(T('Penarikan ditolak, dana dikembalikan'), 'ok'); APP.refresh();
        });
      },

      'simpan-dompet': function (el) {
        var f = U.readForm(el.closest('.card'));
        DOMPET.simpanConfig({
          minTarik: Number(f.minTarik) || 0, biayaAdmin: Number(f.biayaAdmin) || 0,
          maksPerHari: Number(f.maksPerHari) || 1, estimasiJam: Number(f.estimasiJam) || 24,
          jamLayanan: f.jamLayanan
        });
        UI.toast(T('Ketentuan dompet disimpan'), 'ok'); APP.refresh();
      }
    }, {
      'proses-tarik': 'keuangan.bagihasil.setujui',
      'kirim-tarik': 'keuangan.bagihasil.setujui',
      'tolak-tarik': 'keuangan.bagihasil.setujui',
      'simpan-dompet': 'keuangan.bagihasil.setujui'
    }));
  }

  /* ================================================================ PAGES */
  var pageMitra = {
    label: 'Dompet', icon: '💰', grup: 'Utama',
    sub: 'Saldo, penarikan & riwayat',
    render: renderMitra, mount: aksiMitra,
    badge: function () {
      return DB.where('penarikan', function (x) {
        return x.userId === APP.user.id && x.status === 'diproses'; }).length;
    }
  };

  var pagesAdmin = {
    penarikan: {
      label: 'Penarikan Mitra', icon: '🏦', grup: 'Keuangan',
      sub: 'Antrean pencairan saldo mitra', render: renderAdmin, mount: aksiAdmin,
      badge: function () { return DOMPET.antrean().length; }
    }
  };

  return { pageMitra: pageMitra, pagesAdmin: pagesAdmin, dialogTarik: dialogTarik,
           dialogRinci: dialogRinci };
})();
