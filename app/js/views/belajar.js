/* ==========================================================================
   views/belajar.js — onboarding mitra & pembelajaran (LMS)
   --------------------------------------------------------------------------
   Dipakai peran `worker` (Mitra EXOCLEAN):
     • Bergabung  — lima langkah onboarding + dialog Syarat & Ketentuan
     • Belajar    — daftar kursus, halaman materi, kuis, dan sertifikat
   ========================================================================== */
var ViewBelajar = (function () {

  var T = function (s) { return I18N.t(s); };
  function aku() { return APP.user; }
  function segar() { return DB.find('users', aku().id) || aku(); }
  function terapkan() { APP.perbaruiSesi(segar()); }
  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* state tampilan kursus: null = daftar, selain itu id kursus */
  var kursusAktif = null;
  var halamanMateri = 0;
  var modeKuis = false;
  var jawabanKuis = [];
  var hasilKuis = null;
  var pemilikState = null;   /* state di atas milik siapa */

  /** Kosongkan state tampilan — dipanggil saat pengguna berganti. */
  function reset() {
    kursusAktif = null; halamanMateri = 0; modeKuis = false;
    jawabanKuis = []; hasilKuis = null;
  }
  /** Jaga agar state satu mitra tidak terbawa ke mitra lain. */
  function jagaPemilik() {
    var id = APP.user ? APP.user.id : null;
    if (pemilikState !== id) { reset(); pemilikState = id; }
  }

  /* ================================================================ ONBOARDING */
  function renderGabung() {
    var u = segar();
    var r = LMS.ringkasOnboarding(u);
    var ditolak = u.statusMitra === 'ditolak';
    var aktif = u.statusMitra === 'aktif';

    return '' +
    '<div class="ob-hero">' +
      '<div class="ob-hero__ring" style="--pct:' + r.pct + '">' +
        '<b>' + r.pct + '%</b><small>' + r.selesai + '/' + r.total + '</small></div>' +
      '<div style="min-width:0;flex:1">' +
        '<h2>' + (aktif ? T('Anda mitra aktif EXOCLEAN 🎉')
          : ditolak ? T('Pendaftaran belum dapat dilanjutkan')
          : T('Selamat datang, calon Mitra EXOCLEAN')) + '</h2>' +
        '<p>' + (aktif
          ? T('Semua tahap selesai. Penugasan akan muncul di menu Tugas.')
          : ditolak ? U.esc(u.alasanTolak || '—')
          : T('Selesaikan lima langkah berikut untuk mulai menerima penugasan. Boleh dikerjakan bertahap — kemajuan Anda tersimpan otomatis.')) + '</p>' +
      '</div>' +
    '</div>' +

    (aktif ? '' : ditolak
      ? UI.alert('danger', '<b>' + T('Pendaftaran ditolak') + '.</b> ' +
          T('Hubungi admin EXOCLEAN bila Anda merasa ini keliru atau ingin mendaftar ulang.'), '⛔') + '<div class="mb-3"></div>'
      : LMS.siapDiverifikasi(u)
        ? UI.alert('ok', '<b>' + T('Semua tahap Anda sudah lengkap.') + '</b> ' +
            T('Pendaftaran Anda sedang menunggu persetujuan admin. Kami mengabari lewat WhatsApp begitu disetujui.'), '⏳') + '<div class="mb-3"></div>'
        : '') +

    '<div class="ob-list">' + r.langkah.map(function (l, i) {
      var kini = !l.selesai && r.berikutnya && r.berikutnya.k === l.k;
      return '<div class="ob-step' + (l.selesai ? ' done' : '') + (kini ? ' now' : '') + '">' +
        '<div class="ob-step__n">' + (l.selesai ? '✓' : (i + 1)) + '</div>' +
        '<div class="ob-step__isi">' +
          '<div class="row" style="gap:8px"><b>' + l.ic + ' ' + U.esc(T(l.judul)) + '</b>' +
            (l.detail ? '<span class="chip chip--muted" style="font-size:10.5px">' + l.detail + '</span>' : '') +
          '</div>' +
          '<p>' + U.esc(l.ket) + '</p>' +
        '</div>' +
        (l.aksi && !l.selesai
          ? '<button class="btn btn--sm" data-act="' + l.aksi + '">' + U.esc(T(l.tombol)) + '</button>'
          : l.aksi && l.selesai
            ? '<button class="btn btn--ghost btn--sm" data-act="' + l.aksi + '">' + T('Lihat') + '</button>'
            : '') +
      '</div>';
    }).join('') + '</div>' +

    UI.card({ cls: 'mt-3', title: T('Kenapa ada tahap pembelajaran?'),
      body: '<p style="font-size:12.9px;color:var(--ink-2);line-height:1.65;margin:0">' +
        T('Mitra EXOCLEAN bekerja di rumah dan gedung orang lain, sering dengan chemical dan di ketinggian. ' +
          'Pembelajaran ini memastikan Anda pulang selamat, hasil kerja Anda lulus penilaian mutu, dan ' +
          'klien mempercayakan pekerjaannya kembali kepada Anda. Sertifikat yang terbit tercantum di ' +
          'profil dan menjadi dasar penugasan pekerjaan khusus seperti rope access dan cuci AC.') + '</p>' });
  }

  /* ---------------------------------------------------------------- dialog S&K */
  function dialogSK() {
    var u = segar();
    var butir = LMS.butirSK();
    var sudah = LMS.persetujuanSK(u);
    var dicentang = sudah ? (sudah.butir || []).slice() : [];
    var terkunci = LMS.sudahSetujuSK(u);

    function daftar() {
      return butir.map(function (b, i) {
        var on = dicentang.indexOf(b.id) >= 0;
        return '<label class="sk-butir' + (on ? ' on' : '') + '">' +
          '<input type="checkbox" data-change="sk-centang" data-id="' + b.id + '"' +
            (on ? ' checked' : '') + (terkunci ? ' disabled' : '') + '>' +
          '<div><b>' + (i + 1) + '. ' + U.esc(b.judul) + '</b><p>' + b.isi + '</p></div></label>';
      }).join('');
    }

    UI.modal({
      title: T('Syarat & Ketentuan Mitra EXOCLEAN'),
      sub: T('Versi') + ' ' + LMS.versiSK() + ' • ' + butir.length + ' ' + T('butir ketentuan'),
      size: 'wide',
      body: (terkunci
          ? UI.alert('ok', '<b>' + T('Sudah Anda setujui') + '</b> ' +
              U.tglJam(sudah.at) + '. ' + T('Dokumen ini disimpan sebagai bagian dari berkas kemitraan Anda.'), '✅')
          : UI.alert('info', T('Baca setiap butir, lalu centang sebagai tanda Anda memahami dan menyetujuinya. ' +
              'Seluruh butir wajib dicentang.'), 'ℹ️')) +
        '<div class="mt-3" id="sk-list">' + daftar() + '</div>',
      foot: terkunci
        ? '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
        : '<button class="btn btn--ghost" data-close>' + T('Nanti saja') + '</button>' +
          '<button class="btn btn--lg" data-act="sk-setuju" id="btn-sk"' +
          (dicentang.length >= butir.length ? '' : ' disabled') + '>' +
          T('Saya Setuju') + ' (<span id="sk-n">' + dicentang.length + '</span>/' + butir.length + ')</button>',
      actions: {
        'sk-centang': function (el) {
          var id = el.getAttribute('data-id');
          if (el.checked) { if (dicentang.indexOf(id) < 0) dicentang.push(id); }
          else dicentang = dicentang.filter(function (x) { return x !== id; });
          el.closest('.sk-butir').classList.toggle('on', el.checked);
          var n = U.$('#sk-n'); if (n) n.textContent = dicentang.length;
          var b = U.$('#btn-sk'); if (b) b.disabled = dicentang.length < butir.length;
        },
        'sk-setuju': function (el) {
          if (dicentang.length < butir.length) return;
          LMS.setujuiSK(aku().id, dicentang);
          terapkan(); tutup(el);
          UI.toast(T('Syarat & Ketentuan disetujui. Lanjut lengkapi berkas Anda.'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* ================================================================ DAFTAR KURSUS */
  function renderBelajar(params) {
    jagaPemilik();
    /* halaman Fungsi Kerja bisa melompat langsung ke satu kursus */
    if (params && params.kursusId && LMS.kursus(params.kursusId)) {
      kursusAktif = params.kursusId;
      LMS.progresAtauBuat(aku().id, kursusAktif);
    }
    if (kursusAktif && !LMS.kursus(kursusAktif)) reset();
    if (kursusAktif) return renderKursus(kursusAktif);

    var u = segar();
    var wajib = LMS.kursusWajib();

    /* Kursus fungsi kerja tidak ditampilkan sebagai pilihan bebas — ia muncul
       setelah mitra mendaftarkan fungsi kerjanya, supaya daftar di sini tidak
       berisi 15 kursus yang tidak pernah ia minta. */
    var kodeFungsiDidaftar = KOMPETENSI.pilihan(u).map(function (kf) {
      var f = KOMPETENSI.fungsi(kf); return f ? f.kursus : null; }).filter(Boolean);
    var semuaKodeFungsi = KOMPETENSI.semuaFungsi().map(function (f) { return f.kursus; });

    var kursusFungsi = LMS.kursusPilihan().filter(function (k) {
      return kodeFungsiDidaftar.indexOf(k.kode) >= 0; });
    var pilihan = LMS.kursusPilihan().filter(function (k) {
      return semuaKodeFungsi.indexOf(k.kode) < 0; });
    var lulusWajib = wajib.filter(function (k) { return LMS.lulusKursus(u.id, k.id); }).length;
    var sert = LMS.sertifikatSaya(u.id);
    var pctWajib = wajib.length ? Math.round(lulusWajib / wajib.length * 100) : 0;

    return '' +
    '<div class="grid g-3 mb-3">' +
      UI.stat({ label: T('Kursus wajib lulus'), value: lulusWajib + '/' + wajib.length, icon: '📚',
        meta: pctWajib === 100 ? T('semua tuntas') : T('lanjutkan belajar') }) +
      UI.stat({ label: T('Nilai rata-rata'), value: LMS.nilaiRataWajib(u.id) || '—', icon: '📊',
        meta: T('dari kursus wajib') }) +
      UI.stat({ label: T('Sertifikat dimiliki'), value: sert.length, icon: '🎓',
        meta: LMS.punyaSertifikat(u.id, 'MITRA') ? T('termasuk sertifikat mitra') : T('belum tersertifikasi') }) +
    '</div>' +

    (pctWajib < 100
      ? UI.card({ cls: 'mb-3', title: T('Kemajuan kursus wajib'),
          body: UI.progress(pctWajib, pctWajib >= 80 ? 'ok' : 'warn') +
            '<div class="tbl-sub mt-2">' + T('Sertifikat Mitra terbit otomatis setelah seluruh kursus wajib lulus dengan nilai minimal') +
            ' ' + LMS.KKM_DEFAULT + '.</div>' })
      : '') +

    '<div class="nav-group" style="color:var(--muted);padding:4px 0 10px">' + T('Kursus Wajib') + '</div>' +
    wajib.map(kartuKursus).join('') +

    '<div class="nav-group" style="color:var(--muted);padding:20px 0 10px">' +
      T('Sertifikasi Fungsi Kerja') +
      (kursusFungsi.length ? ' <span class="chip chip--muted">' + kursusFungsi.length + '</span>' : '') +
      '</div>' +
    '<div class="tbl-sub mb-2">' + T('Kursus ini membuka jenis pekerjaan yang boleh Anda ambil. ' +
      'Daftarkan fungsi kerjanya dulu di menu Fungsi Kerja.') +
      ' <a href="#" data-act="ke-fungsi">' + T('Pilih fungsi kerja') + ' →</a></div>' +
    (kursusFungsi.length
      ? kursusFungsi.map(kartuKursus).join('')
      : '<div class="card mb-3"><div class="card__body">' +
        UI.empty('🎯', T('Belum ada fungsi kerja terdaftar'),
          T('Pilih pekerjaan yang ingin Anda jalani, lalu kursus sertifikasinya muncul di sini.')) +
        '</div></div>') +

    (pilihan.length
      ? '<div class="nav-group" style="color:var(--muted);padding:20px 0 10px">' +
        T('Kursus Spesialisasi') + ' <span class="chip chip--muted">' + T('opsional') + '</span></div>' +
        pilihan.map(kartuKursus).join('')
      : '') +

    (sert.length ? '<div class="nav-group" style="color:var(--muted);padding:22px 0 10px">' +
      T('Sertifikat Saya') + ' <span class="chip chip--muted">' + sert.length + '</span></div>' +
      '<div class="grid g-2">' + sert.map(kartuSertifikat).join('') + '</div>' : '');
  }

  function kartuKursus(k) {
    var u = segar();
    var pct = LMS.persenKursus(u.id, k.id);
    var lulus = LMS.lulusKursus(u.id, k.id);
    var p = LMS.progres(u.id, k.id);
    var coba = LMS.percobaanTerakhir(u.id, k.id);

    return '<div class="krs' + (lulus ? ' lulus' : '') + '" data-act="buka-kursus" data-id="' + k.id + '">' +
      '<div class="krs__ic">' + k.ikon + '</div>' +
      '<div class="krs__isi">' +
        '<div class="row" style="gap:7px;flex-wrap:wrap">' +
          '<b>' + U.esc(k.judul) + '</b>' +
          (k.wajib ? '<span class="chip chip--brand" style="font-size:10px">' + T('Wajib') + '</span>'
                   : '<span class="chip chip--muted" style="font-size:10px">' + T('Spesialisasi') + '</span>') +
          (lulus ? '<span class="chip chip--ok" style="font-size:10px">✓ ' + T('Lulus') + ' ' +
            p.nilaiTerbaik + '</span>'
            : coba ? '<span class="chip chip--warn" style="font-size:10px">' + T('Nilai terakhir') + ' ' +
              coba.nilai + '</span>' : '') +
        '</div>' +
        '<p>' + U.esc(k.deskripsi) + '</p>' +
        '<div class="row mt-1" style="gap:12px;font-size:11.5px;color:var(--muted)">' +
          '<span>📄 ' + (k.materi || []).length + ' ' + T('materi') + '</span>' +
          '<span>❓ ' + (k.kuis || []).length + ' ' + T('soal') + '</span>' +
          '<span>⏱️ ±' + k.durasiMenit + ' ' + T('menit') + '</span>' +
          '<span>🎯 ' + T('KKM') + ' ' + k.nilaiMin + '</span>' +
        '</div>' +
        '<div class="mt-2">' + UI.progress(pct, lulus ? 'ok' : '') + '</div>' +
      '</div>' +
      '<div class="krs__go">' + (lulus ? '↻' : '›') + '</div>' +
      '</div>';
  }

  function kartuSertifikat(s) {
    var berlaku = LMS.sertifikatBerlaku(s);
    var utama = s.jenis === 'mitra';
    return '<div class="sert' + (utama ? ' utama' : '') + (berlaku ? '' : ' mati') + '">' +
      '<div class="sert__pita">' + (utama ? '🏅' : s.jenis === 'spesialisasi' ? '⭐' : '🎓') + '</div>' +
      '<div class="sert__isi">' +
        '<div class="tbl-sub">' + U.esc(s.no) + '</div>' +
        '<b>' + U.esc(s.judul) + '</b>' +
        '<div class="row mt-1" style="gap:6px;flex-wrap:wrap">' +
          '<span class="chip chip--brand" style="font-size:10.5px">' + T('Nilai') + ' ' + s.nilai + '</span>' +
          '<span class="chip ' + (berlaku ? 'chip--muted' : 'chip--danger') + '" style="font-size:10.5px">' +
            (berlaku ? T('Berlaku s/d') + ' ' + U.tgl(s.berlakuHingga)
                     : T('Kedaluwarsa') + ' ' + U.tgl(s.berlakuHingga)) + '</span>' +
        '</div>' +
        '<div class="sert__kode">' + T('Kode verifikasi') + ': <code>' + U.esc(s.kode) + '</code></div>' +
      '</div>' +
      '<button class="btn btn--ghost btn--sm" data-act="lihat-sert" data-id="' + s.id + '">' +
        T('Lihat') + '</button>' +
      '</div>';
  }

  /* ================================================================ HALAMAN KURSUS */
  function renderKursus(kursusId) {
    var k = LMS.kursus(kursusId);
    if (!k) { kursusAktif = null; return renderBelajar(); }
    if (modeKuis) return renderKuis(k);

    var u = segar();
    var p = LMS.progresAtauBuat(u.id, kursusId);
    var total = (k.materi || []).length;
    var idx = Math.min(halamanMateri, Math.max(0, total - 1));
    var mt = (k.materi || [])[idx];
    var dibaca = (p.materiSelesai || []).indexOf(idx) >= 0;
    var tuntas = LMS.materiTuntas(u.id, kursusId);
    var lulus = LMS.lulusKursus(u.id, kursusId);

    return '' +
    '<button class="btn btn--ghost btn--sm mb-2" data-act="tutup-kursus">‹ ' + T('Kembali ke daftar kursus') + '</button>' +

    '<div class="card mb-3"><div class="card__body">' +
      '<div class="row" style="gap:12px;align-items:flex-start">' +
        '<div class="krs__ic">' + k.ikon + '</div>' +
        '<div style="min-width:0;flex:1"><h3 style="font-size:16px">' + U.esc(k.judul) + '</h3>' +
        '<div class="tbl-sub">' + U.esc(k.deskripsi) + '</div></div>' +
        (lulus ? '<span class="chip chip--ok">✓ ' + T('Lulus') + ' ' + p.nilaiTerbaik + '</span>' : '') +
      '</div>' +
      '<div class="mt-3">' + UI.progress(LMS.persenKursus(u.id, kursusId), lulus ? 'ok' : '') + '</div>' +
      '<div class="row mt-2" style="gap:6px;flex-wrap:wrap">' +
        (k.materi || []).map(function (_, i) {
          var ok = (p.materiSelesai || []).indexOf(i) >= 0;
          return '<button class="dot' + (i === idx ? ' kini' : '') + (ok ? ' ok' : '') +
            '" data-act="ke-materi" data-i="' + i + '">' + (i + 1) + '</button>';
        }).join('') +
      '</div>' +
    '</div></div>' +

    (mt ? UI.card({ cls: 'mb-3',
      title: (idx + 1) + '. ' + mt.judul,
      sub: T('Materi') + ' ' + (idx + 1) + ' ' + T('dari') + ' ' + total,
      body: (mt.tipe === 'peringatan'
          ? UI.alert('warn', teksMateri(mt.isi), '⚠️')
          : '<div class="materi">' + teksMateri(mt.isi) + '</div>') +
        (dibaca ? '<div class="chip chip--ok mt-3">✓ ' + T('Sudah dibaca') + '</div>' : ''),
      foot: (idx > 0 ? '<button class="btn btn--ghost" data-act="materi-prev">‹ ' + T('Sebelumnya') + '</button>' : '') +
        '<div class="spacer"></div>' +
        (idx < total - 1
          ? '<button class="btn" data-act="materi-next">' + T('Saya paham, lanjut') + ' ›</button>'
          : '<button class="btn" data-act="materi-selesai">' + T('Selesai membaca materi') + '</button>')
    }) : '') +

    UI.card({ title: T('Kuis Kursus'),
      sub: (k.kuis || []).length + ' ' + T('soal') + ' • ' + T('nilai minimum') + ' ' + k.nilaiMin,
      body: (tuntas
        ? (lulus
            ? UI.alert('ok', '<b>' + T('Anda sudah lulus kursus ini') + '</b> ' + T('dengan nilai') + ' ' +
                p.nilaiTerbaik + '. ' + T('Anda boleh mengulang untuk memperbaiki nilai.'), '🎓')
            : UI.alert('brand', T('Seluruh materi sudah dibaca. Anda siap mengerjakan kuis.'), '📝'))
        : UI.alert('warn', T('Selesaikan membaca seluruh materi dulu sebelum mengerjakan kuis.'), '🔒')) +
        riwayatPercobaan(p),
      foot: '<div class="spacer"></div><button class="btn btn--lg" data-act="mulai-kuis"' +
        (tuntas ? '' : ' disabled') + '>' +
        (lulus ? T('Ulangi Kuis') : T('Mulai Kuis')) + '</button>' });
  }

  /** Materi memakai baris kosong sebagai pemisah paragraf; isinya HTML terbatas dari kurikulum. */
  function teksMateri(isi) {
    return String(isi).split('\n\n').map(function (par) {
      return '<p>' + par.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function riwayatPercobaan(p) {
    var c = (p && p.percobaan) || [];
    if (!c.length) return '';
    return '<div class="mt-3"><div class="tbl-sub mb-1">' + T('Riwayat pengerjaan') + '</div>' +
      c.slice().reverse().slice(0, 5).map(function (x, i) {
        return '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line-2);font-size:12.5px">' +
          '<span class="tbl-sub">' + T('Percobaan') + ' ' + (c.length - i) + ' • ' + U.tglJam(x.at) + '</span>' +
          '<div class="spacer"></div>' +
          '<b>' + x.nilai + '</b><span class="tbl-sub" style="margin-left:6px">(' + x.benar + '/' + x.total + ')</span>' +
          '<span style="margin-left:8px">' + (x.lulus
            ? '<span class="chip chip--ok" style="font-size:10px">' + T('Lulus') + '</span>'
            : '<span class="chip chip--danger" style="font-size:10px">' + T('Belum lulus') + '</span>') + '</span>' +
          '</div>';
      }).join('') + '</div>';
  }

  /* ================================================================ KUIS */
  function renderKuis(k) {
    if (hasilKuis) return renderHasil(k);
    var soal = k.kuis || [];
    var terjawab = jawabanKuis.filter(function (x) { return x !== undefined && x !== null; }).length;

    return '' +
    '<div class="card mb-3"><div class="card__body">' +
      '<div class="row"><div><h3 style="font-size:16px">' + T('Kuis') + ' — ' + U.esc(k.judul) + '</h3>' +
      '<div class="tbl-sub">' + T('Jawab seluruh soal, lalu kirim. Nilai minimum') + ' ' + k.nilaiMin + '.</div></div>' +
      '<div class="spacer"></div>' +
      '<span class="chip chip--brand">' + terjawab + '/' + soal.length + ' ' + T('terjawab') + '</span></div>' +
      '<div class="mt-2">' + UI.progress(soal.length ? terjawab / soal.length * 100 : 0) + '</div>' +
    '</div></div>' +

    soal.map(function (s, i) {
      return UI.card({ cls: 'mb-3', title: (i + 1) + '. ' + s.soal,
        body: s.opsi.map(function (o, j) {
          var on = jawabanKuis[i] === j;
          return '<label class="opsi' + (on ? ' on' : '') + '">' +
            '<input type="radio" name="q' + i + '" data-change="pilih-jawaban" data-i="' + i +
            '" data-j="' + j + '"' + (on ? ' checked' : '') + '>' +
            '<span>' + U.esc(o) + '</span></label>';
        }).join('') });
    }).join('') +

    '<div class="row mt-3">' +
      '<button class="btn btn--ghost" data-act="batal-kuis">' + T('Batal') + '</button>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn--lg" data-act="kirim-kuis"' +
        (terjawab >= soal.length ? '' : ' disabled') + '>' + T('Kirim Jawaban') + '</button>' +
    '</div>';
  }

  function renderHasil(k) {
    var h = hasilKuis;
    var sertMitra = h.lulus ? LMS.punyaSertifikat(aku().id, 'MITRA') : null;
    var sertKursus = h.lulus ? LMS.punyaSertifikat(aku().id, k.id) : null;

    return '' +
    '<div class="hasil' + (h.lulus ? ' lulus' : '') + '">' +
      '<div class="hasil__ic">' + (h.lulus ? '🎉' : '💪') + '</div>' +
      '<div class="hasil__nilai">' + h.nilai + '</div>' +
      '<div class="hasil__ket">' + h.benar + ' ' + T('benar dari') + ' ' + h.total + ' ' + T('soal') +
        ' • ' + T('nilai minimum') + ' ' + h.nilaiMin + '</div>' +
      '<div class="hasil__status">' + (h.lulus ? T('SELAMAT, ANDA LULUS') : T('BELUM LULUS — SILAKAN ULANGI')) + '</div>' +
    '</div>' +

    (h.lulus && sertKursus
      ? UI.alert('ok', '<b>' + T('Sertifikat terbit') + ':</b> ' + U.esc(sertKursus.judul) +
          ' (' + U.esc(sertKursus.no) + '). ' + T('Sudah tercantum di profil Anda.'), '🎓') + '<div class="mb-3"></div>'
      : '') +
    (h.lulus && sertMitra && sertMitra.terbitAt && U.diffDays(new Date(), sertMitra.terbitAt) === 0
      ? UI.alert('brand', '<b>' + T('Anda kini Mitra Tersertifikasi EXOCLEAN!') + '</b> ' +
          T('Seluruh kursus wajib lulus. Pendaftaran Anda otomatis diajukan ke admin untuk persetujuan akhir.'), '🏅') +
        '<div class="mb-3"></div>'
      : '') +
    (!h.lulus
      ? UI.alert('warn', T('Pelajari kembali materi pada bagian yang salah di bawah, lalu ulangi kuis. ' +
          'Tidak ada batas percobaan — yang dihitung adalah nilai terbaik Anda.'), '📖') + '<div class="mb-3"></div>'
      : '') +

    '<div class="nav-group" style="color:var(--muted);padding:4px 0 10px">' + T('Pembahasan') + '</div>' +
    h.rinci.map(function (r, i) {
      return UI.card({ cls: 'mb-2',
        title: (i + 1) + '. ' + r.soal,
        tools: r.tepat ? '<span class="chip chip--ok">✓ ' + T('Benar') + '</span>'
                       : '<span class="chip chip--danger">✕ ' + T('Salah') + '</span>',
        body: r.opsi.map(function (o, j) {
          var kelas = j === r.benar ? ' benar' : (j === r.pilih && !r.tepat ? ' salah' : '');
          return '<div class="opsi mati' + kelas + '"><span>' +
            (j === r.benar ? '✓ ' : (j === r.pilih && !r.tepat ? '✕ ' : '')) + U.esc(o) + '</span></div>';
        }).join('') +
          (r.pembahasan ? '<div class="pembahasan">💡 ' + U.esc(r.pembahasan) + '</div>' : '') });
    }).join('') +

    '<div class="row mt-3">' +
      '<button class="btn btn--ghost" data-act="tutup-hasil">' + T('Kembali ke kursus') + '</button>' +
      '<div class="spacer"></div>' +
      (h.lulus
        ? '<button class="btn" data-act="tutup-kursus">' + T('Lanjut kursus berikutnya') + '</button>'
        : '<button class="btn" data-act="mulai-kuis">' + T('Ulangi Kuis Sekarang') + '</button>') +
    '</div>';
  }

  /* ================================================================ SERTIFIKAT */
  function lihatSertifikat(id) {
    var s = DB.find('sertifikat', id);
    if (!s) return;
    var u = BIZ.user(s.userId);
    var berlaku = LMS.sertifikatBerlaku(s);

    UI.modal({
      title: T('Sertifikat'), sub: s.no, size: 'wide',
      body: '<div class="sert-doc' + (s.jenis === 'mitra' ? ' utama' : '') + '">' +
          '<img src="assets/logo-full.png" alt="EXOCLEAN" class="sert-doc__logo">' +
          '<div class="sert-doc__label">' + T('SERTIFIKAT') +
            (s.jenis === 'mitra' ? ' ' + T('KEMITRAAN') : ' ' + T('PELATIHAN')) + '</div>' +
          '<div class="sert-doc__sub">' + T('Diberikan kepada') + '</div>' +
          '<div class="sert-doc__nama">' + U.esc(u ? u.nama : '—') + '</div>' +
          '<div class="sert-doc__sub">' + T('atas kelulusan') + '</div>' +
          '<div class="sert-doc__judul">' + U.esc(s.judul) + '</div>' +
          '<div class="sert-doc__nilai"><b>' + s.nilai + '</b><small>' + T('Nilai akhir') + '</small></div>' +
          '<div class="sert-doc__kaki">' +
            '<div><small>' + T('Nomor') + '</small><b>' + U.esc(s.no) + '</b></div>' +
            '<div><small>' + T('Terbit') + '</small><b>' + U.tgl(s.terbitAt) + '</b></div>' +
            '<div><small>' + T('Berlaku sampai') + '</small><b>' + U.tgl(s.berlakuHingga) + '</b></div>' +
            '<div><small>' + T('Kode verifikasi') + '</small><b>' + U.esc(s.kode) + '</b></div>' +
          '</div>' +
          (berlaku ? '' : '<div class="sert-doc__mati">' + T('KEDALUWARSA') + '</div>') +
        '</div>' +
        UI.alert('info', T('Kode verifikasi dapat dicocokkan oleh admin EXOCLEAN maupun klien untuk ' +
          'memastikan sertifikat ini asli.'), '🔎'),
      foot: '<button class="btn btn--ghost no-print" onclick="window.print()">🖨️ ' + T('Cetak') + '</button>' +
        '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>'
    });
  }

  /* ================================================================ AKSI */
  function aksi(root) {
    U.delegate(root, {
      /* onboarding */
      'buka-sk': dialogSK,
      'ke-berkas': function () { APP.go('profil'); },
      'ke-belajar': function () { kursusAktif = null; modeKuis = false; hasilKuis = null; APP.go('belajar'); },
      'ke-fungsi': function () { kursusAktif = null; APP.go('fungsi'); },

      /* daftar kursus */
      'buka-kursus': function (el) {
        kursusAktif = el.getAttribute('data-id');
        halamanMateri = 0; modeKuis = false; hasilKuis = null;
        LMS.progresAtauBuat(aku().id, kursusAktif);
        APP.refresh(); window.scrollTo(0, 0);
      },
      'tutup-kursus': function () {
        kursusAktif = null; modeKuis = false; hasilKuis = null;
        APP.refresh(); window.scrollTo(0, 0);
      },

      /* materi */
      'ke-materi': function (el) { halamanMateri = +el.getAttribute('data-i'); APP.refresh(); window.scrollTo(0, 0); },
      'materi-next': function () {
        LMS.tandaiMateri(aku().id, kursusAktif, halamanMateri);
        halamanMateri++;
        APP.refresh(); window.scrollTo(0, 0);
      },
      'materi-prev': function () { halamanMateri = Math.max(0, halamanMateri - 1); APP.refresh(); window.scrollTo(0, 0); },
      'materi-selesai': function () {
        LMS.tandaiMateri(aku().id, kursusAktif, halamanMateri);
        UI.toast(T('Materi selesai. Silakan kerjakan kuisnya.'), 'ok');
        APP.refresh();
      },

      /* kuis */
      'mulai-kuis': function () {
        var k = LMS.kursus(kursusAktif);
        jawabanKuis = new Array((k.kuis || []).length);
        hasilKuis = null; modeKuis = true;
        APP.refresh(); window.scrollTo(0, 0);
      },
      'pilih-jawaban': function (el) {
        jawabanKuis[+el.getAttribute('data-i')] = +el.getAttribute('data-j');
        APP.refresh();
      },
      'batal-kuis': function () { modeKuis = false; hasilKuis = null; APP.refresh(); window.scrollTo(0, 0); },
      'kirim-kuis': function () {
        var k = LMS.kursus(kursusAktif);
        if (jawabanKuis.filter(function (x) { return x !== undefined; }).length < (k.kuis || []).length) {
          UI.toast(T('Masih ada soal yang belum dijawab'), 'err'); return;
        }
        hasilKuis = LMS.kirimKuis(aku().id, kursusAktif, jawabanKuis);
        terapkan();
        UI.toast(hasilKuis.lulus ? T('Selamat, Anda lulus!') : T('Nilai belum mencukupi — silakan ulangi'),
          hasilKuis.lulus ? 'ok' : 'warn');
        APP.refresh(); window.scrollTo(0, 0);
      },
      'tutup-hasil': function () { modeKuis = false; hasilKuis = null; APP.refresh(); window.scrollTo(0, 0); },

      /* sertifikat */
      'lihat-sert': function (el) { lihatSertifikat(el.getAttribute('data-id')); }
    });
  }

  /* ================================================================ PAGES */
  var pages = {
    gabung: { label: 'Bergabung', icon: '🚀', render: renderGabung, mount: aksi,
      badge: function () {
        var r = LMS.ringkasOnboarding(APP.user);
        return r.pct === 100 ? 0 : r.total - r.selesai;
      } },
    belajar: { label: 'Belajar', icon: '📚', render: renderBelajar, mount: aksi,
      badge: function () {
        var w = LMS.kursusWajib();
        return w.filter(function (k) { return !LMS.lulusKursus(APP.user.id, k.id); }).length;
      } }
  };

  return { pages: pages, aksi: aksi, dialogSK: dialogSK, lihatSertifikat: lihatSertifikat,
    kartuSertifikat: kartuSertifikat, reset: reset };
})();
