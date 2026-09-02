/* ==========================================================================
   ui.js — komponen tampilan yang dipakai bersama semua peran
   ========================================================================== */
var UI = (function () {

  /* ---------------------------------------------------------------- toast */
  function toast(pesan, tipe, ms) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + (tipe || '');
    var ic = tipe === 'ok' ? '✅' : tipe === 'err' ? '⛔' : tipe === 'warn' ? '⚠️' : 'ℹ️';
    el.innerHTML = '<span>' + ic + '</span><span>' + U.esc(pesan) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0'; el.style.transform = 'translateX(12px)';
      setTimeout(function () { el.remove(); }, 260);
    }, ms || 3400);
  }

  /* ---------------------------------------------------------------- modal */
  var modalStack = [];

  /**
   * opt = { title, sub, body(HTML), foot(HTML), size:'wide'|'narrow',
   *         actions:{namaAksi:fn}, onMount(root, close) }
   */
  function modal(opt) {
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal ' + (opt.size || '') + '" role="dialog" aria-modal="true"' +
        (opt.id ? ' id="' + opt.id + '"' : '') + '>' +
        '<div class="modal__head">' +
          '<div><h3>' + (opt.titleHTML || U.esc(opt.title || '')) + '</h3>' +
          (opt.sub ? '<div class="sub">' + U.esc(opt.sub) + '</div>' : '') + '</div>' +
          '<button class="modal__x" data-close aria-label="Tutup">✕</button>' +
        '</div>' +
        '<div class="modal__body">' + (opt.body || '') + '</div>' +
        (opt.foot ? '<div class="modal__foot">' + opt.foot + '</div>' : '') +
      '</div>';

    function close() {
      back.remove();
      if (opt.onTutup) opt.onTutup();
      modalStack = modalStack.filter(function (x) { return x !== back; });
      if (!modalStack.length) document.body.style.overflow = '';
    }

    back.addEventListener('click', function (ev) {
      if (ev.target === back || ev.target.closest('[data-close]')) close();
    });
    document.getElementById('modal-root').appendChild(back);
    document.body.style.overflow = 'hidden';
    modalStack.push(back);

    if (opt.actions) U.delegate(back, opt.actions);
    if (opt.onMount) opt.onMount(back, close);
    var f = back.querySelector('[autofocus], .modal__body input, .modal__body select, .modal__body textarea');
    if (f) setTimeout(function () { f.focus(); }, 60);
    return close;
  }

  /**
   * Lembar yang naik dari sisi bawah layar.
   *
   * MEMAKAI modal(), bukan menyalinnya. Yang berbeda dari modal hanya letak
   * dan cara munculnya — itu urusan CSS. Menyalin logikanya berarti punya dua
   * tempat yang menangani Escape, latar, dan tumpukan; yang kedua akan mulai
   * berbeda diam-diam pada perbaikan berikutnya yang cuma dikerjakan di satu
   * sisi.
   *
   * opt = { id, judul, isi, kaki, aksi:{...}, onMount, onTutup }
   */
  function sheet(opt) {
    return modal({
      id: opt.id, title: opt.judul, size: 'sheet',
      body: opt.isi || '', foot: opt.kaki || '',
      actions: opt.aksi, onMount: opt.onMount, onTutup: opt.onTutup
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalStack.length) {
      var top = modalStack[modalStack.length - 1];
      var x = top.querySelector('[data-close]');
      if (x) x.click();
    }
  });

  /** Konfirmasi ya/tidak. Mengembalikan Promise<boolean>. */
  function konfirm(opt) {
    return new Promise(function (resolve) {
      var done = false;
      var close = modal({
        title: opt.title || I18N.t('Konfirmasi'), size: 'narrow',
        body: '<p style="margin:0;color:var(--ink-2)">' + (opt.htmlText || U.esc(opt.text || '')) + '</p>',
        foot: '<button class="btn btn--ghost" data-act="no">' + U.esc(opt.cancelText || I18N.t('Batal')) + '</button>' +
              '<button class="btn ' + (opt.danger ? 'btn--danger' : '') + '" data-act="yes">' +
              U.esc(opt.okText || I18N.t('Ya, lanjutkan')) + '</button>',
        actions: {
          yes: function () { done = true; close(); resolve(true); },
          no: function () { done = true; close(); resolve(false); }
        },
        onMount: function (root) {
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !done) { done = true; resolve(false); }
          });
        }
      });
    });
  }

  /** Modal berisi satu form sederhana. fields = [{name,label,type,value,options,hint,required,...}] */
  function formModal(opt) {
    return new Promise(function (resolve) {
      var body = (opt.intro || '') + opt.fields.map(field).join('');
      var settled = false;
      var close = modal({
        title: opt.title, sub: opt.sub, size: opt.size,
        body: '<form data-form>' + body + '</form>',
        foot: '<button class="btn btn--ghost" data-act="cancel">' +
                U.esc(opt.cancelText || I18N.t('Batal')) + '</button>' +
              '<button class="btn" data-act="ok">' + U.esc(opt.okText || I18N.t('Simpan')) + '</button>',
        actions: {
          ok: function (el) {
            var root = el.closest('.modal');
            var data = U.readForm(root.querySelector('[data-form]'));
            var err = opt.validate ? opt.validate(data) : null;
            var missing = opt.fields.filter(function (f) {
              return f.required && (data[f.name] === '' || data[f.name] === null || data[f.name] === undefined);
            });
            if (!err && missing.length) err = 'Lengkapi dulu: ' + missing.map(function (f) { return f.label; }).join(', ');
            if (err) { toast(err, 'err'); return; }
            settled = true; close(); resolve(data);
          },
          cancel: function () { settled = true; close(); resolve(null); }
        },
        onMount: function (root) {
          if (opt.onMount) opt.onMount(root);
          root.addEventListener('click', function (ev) {
            if ((ev.target === root || ev.target.closest('.modal__x')) && !settled) { settled = true; resolve(null); }
          });
        }
      });
    });
  }

  /** Render satu field form dari deskripsi objek. */
  function field(f) {
    var id = 'f_' + f.name;
    var lbl = '<label for="' + id + '">' + U.esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>';
    var ctl;
    if (f.type === 'select') {
      /* Sebuah entri boleh berupa KELOMPOK: { grup: 'Asia', options: [...] }.

         Ditambahkan ketika pilihan zona waktu dibuka dari dua belas menjadi
         seluruh 418 zona IANA. Empat ratus baris tanpa pengelompokan bukan
         daftar, melainkan tumpukan — dan pengelompokan adalah satu-satunya
         hal yang membuat pencarian ketik-huruf bawaan peramban berguna di
         dalamnya. Bentuk lama (larik datar) tetap bekerja apa adanya. */
      var opsiHtml = function (list) {
        return (list || []).map(function (o) {
          if (o && o.grup) {
            return '<optgroup label="' + U.esc(o.grup) + '">' +
              opsiHtml(o.options) + '</optgroup>';
          }
          var v = o.value !== undefined ? o.value : o, t = o.label !== undefined ? o.label : o;
          return '<option value="' + U.esc(v) + '"' + (String(f.value) === String(v) ? ' selected' : '') + '>' + U.esc(t) + '</option>';
        }).join('');
      };
      ctl = '<select class="select" id="' + id + '" name="' + f.name + '">' +
        opsiHtml(f.options) + '</select>';
    } else if (f.type === 'textarea') {
      ctl = '<textarea class="textarea" id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) +
        '" placeholder="' + U.esc(f.placeholder || '') + '">' + U.esc(f.value || '') + '</textarea>';
    } else if (f.type === 'checkbox') {
      return '<div class="field"><label class="check"><input type="checkbox" name="' + f.name + '"' +
        (f.value ? ' checked' : '') + '><span>' + U.esc(f.label) + '</span></label>' +
        (f.hint ? '<div class="hint">' + U.esc(f.hint) + '</div>' : '') + '</div>';
    } else if (f.type === 'html') {
      return f.html;
    } else {
      ctl = '<input class="input" id="' + id + '" type="' + (f.type || 'text') + '" name="' + f.name +
        '" value="' + U.esc(f.value === null || f.value === undefined ? '' : f.value) + '"' +
        (f.placeholder ? ' placeholder="' + U.esc(f.placeholder) + '"' : '') +
        (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.step !== undefined ? ' step="' + f.step + '"' : '') +
        /* Field yang memang tidak boleh disunting ditandai di HTML-nya,
           bukan hanya diabaikan saat menyimpan: input yang bisa diketik
           lalu ternyata tidak tersimpan membuat orang mencoba lagi. */
        (f.readonly ? ' readonly class="input input--kunci"' : '') + '>';
    }
    return '<div class="field"' + (f.width ? ' style="grid-column:span ' + f.width + '"' : '') + '>' + lbl + ctl +
      (f.hint ? '<div class="hint">' + U.esc(f.hint) + '</div>' : '') + '</div>';
  }

  /* ---------------------------------------------------------------- lightbox */

  /**
   * Foto layar penuh.
   *
   * Menerima DUA bentuk, dan itu disengaja: sebagian pemanggil punya alamat
   * gambarnya, sebagian hanya punya id fotonya. Dulu keduanya dijejalkan ke
   * src apa adanya, sehingga id foto berubah menjadi alamat relatif —
   * "ph_abc123" dibaca peramban sebagai berkas di server, tidak ditemukan,
   * dan yang muncul adalah ikon gambar rusak. Tujuh tempat di MCS memakai
   * bentuk id, jadi memperbesar foto pekerjaan, inspeksi, dan aduan tidak
   * pernah berhasil.
   *
   * Sekarang: apa pun yang bukan alamat diperlakukan sebagai id, dan diambil
   * UTUH dari penyimpanan — bukan lewat getPhoto, karena getPhoto boleh
   * memulangkan penanda abu-abu, dan penanda abu-abu selebar layar bukan
   * "sedang dimuat" melainkan foto yang salah.
   */
  function lightbox(src) {
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = '<img alt="' + U.esc(I18N.t('Foto')) + '">';
    el.addEventListener('click', function () { el.remove(); });
    document.body.appendChild(el);
    var img = el.querySelector('img');

    var s = String(src || '');
    if (/^(data:|blob:|https?:|\/|\.)/.test(s)) { img.src = s; return; }
    if (!s) { el.remove(); return; }

    /* Sebuah id. Diambil dari IndexedDB — bisa jadi tidak ada di memori. */
    if (window.DB && DB.fotoUtuh) {
      DB.fotoUtuh(s).then(function (data) {
        if (!el.parentNode) return;          /* sudah ditutup sebelum tiba */
        if (data) { img.src = data; return; }
        el.innerHTML = '<div class="lightbox__x">' +
          U.esc(I18N.t('Foto ini tidak ada lagi.')) + '</div>';
      });
      return;
    }
    img.src = s;
  }

  /* ---------------------------------------------------------------- status */
  var STATUS = {
    booking: {
      baru:      { t: 'Permintaan Baru', c: 'info' },
      survei:    { t: 'Survei Dijadwalkan', c: 'warn' },
      dikutip:   { t: 'Sudah Ditawar', c: 'brand' },
      ditolak:   { t: 'Ditolak', c: 'danger' },
      selesai:   { t: 'Diproses', c: 'ok' }
    },
    quotation: {
      draft:      { t: 'Draft', c: 'muted' },
      terkirim:   { t: 'Menunggu Persetujuan', c: 'warn' },
      disetujui:  { t: 'Disetujui', c: 'ok' },
      ditolak:    { t: 'Ditolak', c: 'danger' },
      kadaluarsa: { t: 'Kedaluwarsa', c: 'muted' }
    },
    order: {
      /* Sudah dibayar/di-checkout, tetapi belum ada mitra yang menyanggupi.
         Dibedakan dari "Dijadwalkan" karena menjanjikan jadwal yang belum
         disetujui siapa pun adalah cara tercepat mengecewakan klien. */
      menunggu_mitra: { t: 'Menunggu Konfirmasi Mitra', c: 'warn' },
      dijadwalkan: { t: 'Dijadwalkan', c: 'info' },
      berjalan:    { t: 'Sedang Dikerjakan', c: 'warn' },
      selesai:     { t: 'Menunggu Verifikasi', c: 'brand' },
      diverifikasi:{ t: 'Selesai & Terverifikasi', c: 'ok' },
      perbaikan:   { t: 'Perlu Perbaikan', c: 'danger' },
      dibatalkan:  { t: 'Dibatalkan', c: 'muted' }
    },
    invoice: {
      belum:       { t: 'Belum Dibayar', c: 'warn' },
      sebagian:    { t: 'Dibayar Sebagian', c: 'info' },
      lunas:       { t: 'Lunas', c: 'ok' },
      jatuh_tempo: { t: 'Jatuh Tempo', c: 'danger' }
    },
    complaint: {
      baru:    { t: 'Baru', c: 'danger' },
      diproses:{ t: 'Diproses', c: 'warn' },
      selesai: { t: 'Selesai', c: 'ok' }
    },
    wa: {
      antre:    { t: 'Menunggu Dikirim', c: 'warn' },
      terkirim: { t: 'Terkirim', c: 'ok' }
    },
    qc: {
      lulus:     { t: 'Lulus QC', c: 'ok' },
      perbaikan: { t: 'Perlu Perbaikan', c: 'danger' }
    },
    shop: {
      baru:         { t: 'Menunggu Konfirmasi', c: 'info' },
      dikonfirmasi: { t: 'Dikonfirmasi', c: 'brand' },
      dikemas:      { t: 'Sedang Dikemas', c: 'warn' },
      dikirim:      { t: 'Dalam Pengiriman', c: 'warn' },
      selesai:      { t: 'Diterima', c: 'ok' },
      dibatalkan:   { t: 'Dibatalkan', c: 'muted' }
    },
    stok: {
      aman:   { t: 'Stok Aman', c: 'ok' },
      menipis:{ t: 'Stok Menipis', c: 'warn' },
      habis:  { t: 'Stok Habis', c: 'danger' }
    },
    paytx: {
      pending: { t: 'Menunggu Pembayaran', c: 'warn' },
      paid:    { t: 'Berhasil', c: 'ok' },
      expired: { t: 'Kedaluwarsa', c: 'muted' },
      failed:  { t: 'Gagal', c: 'danger' },
      /* Dibatalkan dipisahkan dari Gagal karena penyebabnya berbeda: "gagal"
         berarti pembayarannya ditolak bank atau gateway, "dibatalkan" berarti
         seseorang menghentikannya dengan sengaja. Menyatukan keduanya membuat
         laporan tampak seolah gateway bermasalah padahal transaksinya memang
         dibatalkan pelanggan. */
      dibatalkan: { t: 'Dibatalkan', c: 'muted' },
      refund:  { t: 'Dikembalikan', c: 'info' }
    },
    lead: {
      baru:      { t: 'Prospek Baru', c: 'info' },
      kontak:    { t: 'Sudah Dikontak', c: 'info' },
      survei:    { t: 'Survei Lokasi', c: 'warn' },
      penawaran: { t: 'Penawaran Terkirim', c: 'brand' },
      negosiasi: { t: 'Negosiasi', c: 'warn' },
      menang:    { t: 'Menang', c: 'ok' },
      kalah:     { t: 'Kalah', c: 'danger' }
    },
    hasil: {
      terhubung:   { t: 'Terhubung', c: 'ok' },
      tidak_angkat:{ t: 'Tidak diangkat', c: 'muted' },
      dijadwalkan: { t: 'Dijadwalkan', c: 'info' },
      ditolak:     { t: 'Ditolak', c: 'danger' }
    },
    segmen: {
      baru:     { t: 'Pelanggan Baru', c: 'info' },
      aktif:    { t: 'Aktif', c: 'ok' },
      setia:    { t: 'Pelanggan Setia', c: 'brand' },
      dorman:   { t: 'Dorman', c: 'muted' },
      berisiko: { t: 'Perlu Perhatian', c: 'danger' }
    }
  };

  /* Label status ikut bahasa antarmuka yang sedang dipilih. */
  function statusChip(domain, status) {
    var m = (STATUS[domain] || {})[status] || { t: status || '—', c: 'muted' };
    return '<span class="chip chip--' + m.c + ' chip--dot">' + U.esc(I18N.t(m.t)) + '</span>';
  }
  function statusText(domain, status) {
    var m = (STATUS[domain] || {})[status]; return I18N.t(m ? m.t : (status || '—'));
  }

  /* ---------------------------------------------------------------- potongan HTML */
  function avatar(nama, size) {
    return '<div class="avatar ' + (size ? size + ' ' : '') + U.avaColor(nama) + '" title="' + U.esc(nama) + '">' +
      U.esc(U.initials(nama)) + '</div>';
  }

  function stat(o) {
    return '<div class="card stat">' +
      '<div class="row"><div class="stat__label">' + U.esc(o.label) + '</div>' +
      (o.icon ? '<div class="stat__icon">' + o.icon + '</div>' : '') + '</div>' +
      '<div class="stat__value' + (o.small ? ' sm' : '') + '">' + (o.valueHTML || U.esc(o.value)) + '</div>' +
      (o.meta ? '<div class="stat__meta">' + o.meta + '</div>' : '') +
      '</div>';
  }

  function empty(icon, judul, teks) {
    return '<div class="empty"><div class="ic">' + (icon || '📭') + '</div>' +
      '<b>' + U.esc(judul) + '</b><p>' + U.esc(teks || '') + '</p></div>';
  }

  function card(o) {
    return '<div class="card' + (o.cls ? ' ' + o.cls : '') + '">' +
      /* Kepala digambar bila ada JUDUL **atau** ada alat. Menyaratkan judul
         membuat kartu yang cuma punya tombol kehilangan tombolnya tanpa
         galat apa pun — yang memanggil mengira sudah memasangnya, dan yang
         melihat mengira fiturnya memang tidak ada. */
      (o.title || o.tools
        ? '<div class="card__head">' +
            (o.title ? '<div><h3>' + U.esc(o.title) + '</h3>' +
              (o.sub ? '<div class="sub">' + U.esc(o.sub) + '</div>' : '') + '</div>' : '') +
            '<div class="spacer"></div>' + (o.tools || '') + '</div>'
        : '') +
      '<div class="card__body' + (o.flush ? ' tight' : '') + '">' + o.body + '</div>' +
      (o.foot ? '<div class="card__foot">' + o.foot + '</div>' : '') +
      '</div>';
  }

  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">★</span>';
    return '<span class="stars">' + s + '</span>';
  }

  function progress(pct, cls) {
    return '<div class="progress ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>';
  }

  /** Tabel generik. cols = [{h, w, cls, r(row)}] */
  /* =================================================== MENGURUTKAN TABEL
     Kolom bisa diklik untuk diurutkan — naik, lalu turun, lalu naik lagi.

     TIDAK SEMUA KOLOM DITAWARKAN. Kolom hanya bisa diurutkan bila caranya
     dapat dipastikan; yang tidak, tidak diberi tanda sama sekali. Ini
     disengaja dan penting: kolom tanggal yang diurutkan sebagai teks
     menaruh “25 Agu” sebelum “3 Sep”, hasilnya terlihat seperti urutan yang
     sah, dan tidak ada yang memberi tahu bahwa ia salah. Menolak mengurutkan
     jauh lebih baik daripada mengurutkan dengan cara yang keliru.

     Tiga cara mengenali isinya, berurutan:

       1. `v` pada definisi kolom — nilai urut yang disebut sendiri oleh yang
          membuat tabelnya. Selalu paling benar; dipakai untuk kolom yang
          isinya tidak mewakili urutannya (nama + surel dalam satu sel,
          lencana status, tanggal relatif “3 hari lalu”).
       2. Angka — bila SELURUH selnya terbaca sebagai angka. Format Indonesia:
          titik ribuan, koma desimal. “2.850 m²”, “Rp 1.250.000”, “-12%”.
       3. Tanggal — bila SELURUH selnya terbaca sebagai tanggal, dalam bentuk
          yang dipakai U.tgl (“25 Agu 2026”) atau ISO (“2026-08-25”).

     Kalau tidak satu pun cocok dan isinya bukan teks biasa, kolomnya tidak
     bisa diurutkan.

     Pengurutannya menyusun ulang baris <tr> DI TEMPAT, bukan menggambar
     ulang halaman. Itu sebabnya ia bekerja pada keenam puluh tabel tanpa
     satu pun pemanggilnya diubah: tabel ini dibangun sebagai teks, dan
     datanya sudah tidak ada lagi ketika orang mengkliknya. */

  var BULAN_URUT = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };

  /* Tag dibuang dengan regex, bukan dengan menaruhnya ke elemen DOM: ini
     dijalankan untuk setiap sel dari setiap tabel pada setiap penggambaran,
     dan membuat ribuan elemen sementara hanya untuk membaca teksnya adalah
     cara yang paling mudah membuat halaman terasa berat tanpa satu pun galat. */
  function teksPolos(html) {
    return String(html === null || html === undefined ? '' : html)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/\s+/g, ' ').trim();
  }

  function angkaDari(t) {
    if (!/\d/.test(t)) return null;
    /* “Petugas 2” BUKAN angka dua.

       Tanpa penjagaan ini, satu nama berangka di antara seratus nama biasa
       membuat seluruh kolom terbaca campur — sebagian angka, sebagian teks
       — dan kolomnya kehilangan pengurutannya tanpa sebab yang kelihatan.
       Yang diperiksa: setelah angka, pemisah, dan hiasan yang lazim dibuang
       (Rp, %, m²), yang tersisa harus tinggal sedikit. Kalau masih ada kata
       utuh di sana, isinya kalimat, bukan bilangan. */
    var sisa = t.replace(/^\s*(rp|idr|usd)\b/i, '')
                .replace(/[\d.,\-+\s%²³$€£]/g, '');
    if (sisa.length > 3) return null;
    /* Yang bukan angka dibuang — satuan, mata uang, tanda persen. Yang
       tersisa dibaca dengan aturan Indonesia: titik memisahkan ribuan,
       koma memisahkan desimal. Aplikasi ini menulis angkanya dengan U.num,
       jadi itulah bentuk yang akan ditemui. */
    var s = t.replace(/[^\d,.\-]/g, '');
    if (!/\d/.test(s)) return null;
    /* Tanda minus hanya sah di depan. */
    var minus = /^-/.test(s);
    s = s.replace(/-/g, '').replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    if (isNaN(n)) return null;
    return minus ? -n : n;
  }

  function tanggalDari(t) {
    var m = t.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})/);
    if (m) {
      var b = BULAN_URUT[m[2].toLowerCase()];
      if (b === undefined) return null;
      return new Date(Number(m[3]), b, Number(m[1])).getTime();
    }
    var i = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (i) return new Date(Number(i[1]), Number(i[2]) - 1, Number(i[3])).getTime();
    return null;
  }

  /* Sel KOSONG diabaikan saat menebak jenis kolom, bukan dianggap gagal:
     satu tanda hubung di kolom yang belum terisi tidak boleh membuat
     seluruh kolom tanggal kehilangan pengurutannya. */
  function kosonganSel(t) { return !t || t === '—' || t === '-'; }

  /**
   * Tautan ke data sumber sebuah tabel.
   *
   * Angka yang dipakai mengambil keputusan harus bisa ditelusuri sampai ke
   * barisnya. Tanpa itu yang membaca hanya bisa mempercayai atau tidak
   * mempercayai — dan yang tidak bisa diperiksa akhirnya tidak dipercaya
   * siapa pun.
   */
  function bilahSumber(sm) {
    if (!sm) return '';
    return '<div class="tbl-bar">' +
      (sm.teks ? '<span class="tbl-bar__t">ℹ︎ ' + U.esc(sm.teks) + '</span>' : '<span></span>') +
      (sm.hal
        ? '<button type="button" class="tbl-bar__a" data-sumber-hal="' + U.esc(sm.hal) + '"' +
          ' data-sumber-params="' + U.esc(JSON.stringify(sm.params || {})) + '">' +
          U.esc(sm.label || I18N.t('Lihat data sumber')) + ' →</button>'
        : '') +
    '</div>';
  }

  /**
   * @param opt.sumber { teks, hal, params, label } — asal angkanya, dan
   *        halaman yang memuat datanya secara lengkap.
   * Definisi kolom boleh memuat `v(row)` (nilai urut) dan `urut: false`.
   */
  function table(cols, rows, kosong, opt) {
    if (!rows.length) return empty(kosong && kosong.icon, (kosong && kosong.judul) || I18N.t('Belum ada data'),
      kosong && kosong.teks);
    opt = opt || {};
    /* Setiap sel digambar SEKALI lalu dipakai dua kali — untuk isinya dan
       untuk menebak jenis kolomnya. Memanggil c.r() dua kali berarti
       menggambar seluruh tabel dua kali, dan sebagian c.r() tidak murni. */
    var sel = rows.map(function (r) {
      return cols.map(function (c) { return c.r(r); });
    });
    /* Yang bisa diurutkan DITANDAI BELAKANGAN, oleh pasangTabel(), dari DOM.
       Di sini hanya disebutkan hal yang tidak bisa diketahui dari DOM:
       nilai urut sebuah sel (`v`) dan kolom yang memang tidak boleh
       diurutkan (`urut: false`). */
    return bilahSumber(opt.sumber) +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      cols.map(function (c) {
        return '<th' + (c.cls ? ' class="' + c.cls + '"' : '') +
          (c.w ? ' style="width:' + c.w + '"' : '') +
          (c.urut === false ? ' data-nourut="1"' : '') + '>' +
          U.esc(c.h) +
        '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr>' + cols.map(function (c, j) {
          var v = (typeof c.v === 'function') ? c.v(r) : null;
          return '<td' + (c.cls ? ' class="' + c.cls + '"' : '') +
            (v === null || v === undefined ? '' : ' data-v="' + U.esc(String(v)) + '"') +
            '>' + sel[i][j] + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /**
   * Tandai kolom yang bisa diurutkan pada SETIAP tabel di dalam root.
   *
   * Dikerjakan di DOM sesudah halaman digambar, bukan saat menyusun teksnya.
   * Alasannya sederhana: tiga belas dari tujuh puluh tiga tabel aplikasi ini
   * ditulis tangan sebagai HTML, tidak lewat UI.table sama sekali. Kalau
   * penandaannya dikerjakan di dalam UI.table, ketiga belas tabel itu diam-
   * diam tidak akan pernah bisa diurutkan — dan yang membukanya tidak akan
   * tahu mengapa tabel yang satu bisa diklik sedangkan yang lain tidak.
   *
   * Dari DOM pula jenis kolomnya ditebak, karena di situlah isinya yang
   * sebenarnya berada, apa pun yang menggambarnya.
   */
  function pasangTabel(root) {
    var akar = root || document;
    if (!akar.querySelectorAll) return;
    Array.prototype.forEach.call(akar.querySelectorAll('table.tbl'), function (t) {
      if (t.getAttribute('data-urut-siap')) return;
      t.setAttribute('data-urut-siap', '1');
      var kepala = t.tHead && t.tHead.rows[0];
      var tbody = t.tBodies && t.tBodies[0];
      if (!kepala || !tbody || !tbody.rows.length) return;
      /* Tabel bertingkat (baris ber-colspan, sub-baris) tidak diurutkan:
         menyusun ulang barisnya akan memisahkan anak dari induknya, dan
         hasilnya tabel yang isinya benar tetapi susunannya berbohong. */
      for (var b = 0; b < tbody.rows.length; b++) {
        if (tbody.rows[b].cells.length !== kepala.cells.length) return;
      }
      Array.prototype.forEach.call(kepala.cells, function (th, j) {
        if (th.getAttribute('data-nourut')) return;
        /* Kolom tanpa judul hampir selalu kolom tombol. */
        if (!th.textContent.trim()) return;
        var jns = jenisDariDom(tbody, j);
        if (!jns) return;
        th.setAttribute('data-urut', j);
        th.setAttribute('data-jenis', jns);
        th.setAttribute('tabindex', '0');
        th.setAttribute('role', 'button');
        th.setAttribute('aria-sort', 'none');
        th.setAttribute('title', I18N.t('Klik untuk mengurutkan'));
        var ar = document.createElement('span');
        ar.className = 'tbl-ar';
        ar.setAttribute('aria-hidden', 'true');
        th.appendChild(ar);
      });
    });
  }

  function jenisDariDom(tbody, j) {
    var isi = 0, angka = 0, tanggal = 0, takBerangka = 0, adaV = false;
    for (var i = 0; i < tbody.rows.length; i++) {
      var td = tbody.rows[i].cells[j];
      if (!td) continue;
      var v = td.getAttribute('data-v');
      if (v !== null) {
        adaV = true;
        if (v === '') continue;
        isi++;
        if (angkaDari(v) !== null) angka++;
        continue;
      }
      var t = teksPolos(td.innerHTML);
      if (kosonganSel(t)) continue;
      isi++;
      if (tanggalDari(t) !== null) tanggal++;
      else if (angkaDari(t) !== null) angka++;
      else if (!/\d/.test(t)) takBerangka++;
    }
    if (!isi) return '';
    /* Nilai urut yang disebut sendiri oleh pembuat tabelnya selalu dipercaya. */
    if (adaV) return angka === isi ? 'angka' : 'teks';

    /* Sel TANPA ANGKA SAMA SEKALI di dalam kolom angka — “belum diisi”,
       “tidak berlaku” — dihitung sebagai KOSONG, bukan sebagai pembatal.

       Aturan yang menuntut seluruh sel berupa angka sempat dipakai, dan
       akibatnya terlihat pada tabel biaya: tiga puluh sembilan sel berisi
       luas dalam m², satu sel berbunyi “belum diisi”, dan gara-gara satu sel
       itu seluruh kolomnya tidak bisa diurutkan. Justru kolom seperti itulah
       yang paling ingin diurutkan orang. Pembandingnya sudah menaruh yang
       kosong di bawah, naik maupun turun, jadi tidak ada yang tersesat.

       Yang TIDAK dilonggarkan: sel yang MENGANDUNG angka tetapi bukan angka
       (“1.048 m² belum terdaftar”). Itu tanda kolomnya memang bercampur, dan
       campur berarti tidak ada urutan yang jujur. */
    if (tanggal && tanggal + takBerangka === isi) return 'tanggal';
    if (angka && angka + takBerangka === isi) return 'angka';
    if (tanggal || angka) return '';
    return 'teks';
  }

  /* ------------------------------------------------- pengurut di halaman */

  function kunciSel(td, jenis) {
    if (!td) return jenis === 'teks' ? '' : null;
    var v = td.getAttribute('data-v');
    var t = v !== null ? v : teksPolos(td.innerHTML);
    if (jenis === 'angka') return angkaDari(t);
    if (jenis === 'tanggal') return (v !== null ? angkaDari(t) : null) === null
      ? tanggalDari(t) : angkaDari(t);
    /* Lambang di depan nama DILEWATI sebelum membandingkan.

       Banyak baris di aplikasi ini diawali emoji jenisnya — “🌳 Halaman &
       Taman”, “🅿️ Parkir Pelanggan”. Membandingkannya apa adanya berarti
       mengurutkan menurut lambangnya, bukan menurut namanya: yang mengklik
       ‘Area’ mendapat daftar yang berkelompok rapi tetapi tidak berurut
       abjad, dan tidak ada yang bisa menebak aturannya. */
    return t.replace(/^[^0-9A-Za-zÀ-ɏ]+/, '').toLowerCase();
  }

  function urutkanTabel(th) {
    var tabel = th.closest('table');
    var tbody = tabel && tabel.querySelector('tbody');
    if (!tbody) return;
    var j = Number(th.getAttribute('data-urut'));
    var jns = th.getAttribute('data-jenis');
    var arah = th.getAttribute('data-arah') === 'naik' ? 'turun' : 'naik';

    Array.prototype.forEach.call(tabel.querySelectorAll('th[data-urut]'), function (x) {
      x.removeAttribute('data-arah');
      x.setAttribute('aria-sort', 'none');
    });
    th.setAttribute('data-arah', arah);
    th.setAttribute('aria-sort', arah === 'naik' ? 'ascending' : 'descending');

    var baris = Array.prototype.slice.call(tbody.rows);
    var isi = baris.map(function (tr, i) {
      return { tr: tr, k: kunciSel(tr.cells[j], jns), i: i };
    });
    var tanda = arah === 'naik' ? 1 : -1;
    isi.sort(function (a, b) {
      /* Sel kosong SELALU di bawah, naik maupun turun. Yang dicari orang
         ketika mengurutkan adalah yang terbesar atau terkecil — bukan
         setumpuk baris yang belum diisi di puncak daftarnya. */
      var ka = (a.k === null || a.k === undefined || a.k === '');
      var kb = (b.k === null || b.k === undefined || b.k === '');
      if (ka && kb) return a.i - b.i;
      if (ka) return 1;
      if (kb) return -1;
      if (typeof a.k === 'number' && typeof b.k === 'number') {
        return a.k === b.k ? a.i - b.i : (a.k - b.k) * tanda;
      }
      var c = String(a.k).localeCompare(String(b.k), I18N.get() === 'en' ? 'en' : 'id',
        { numeric: true, sensitivity: 'base' });
      return c === 0 ? a.i - b.i : c * tanda;
    });
    var frag = document.createDocumentFragment();
    isi.forEach(function (x) { frag.appendChild(x.tr); });
    tbody.appendChild(frag);
  }

  /* SATU pendengar untuk seluruh aplikasi, dipasang sekali di document.
     Bukan per tabel: tabel digambar ulang terus-menerus, dan pendengar yang
     ditempel pada elemennya akan menumpuk atau hilang bersamanya. Ini juga
     yang membuatnya berlaku pada tabel mana pun tanpa pemanggilnya tahu. */
  var pengurutTerpasang = false;
  function pasangPengurut() {
    if (pengurutTerpasang || typeof document === 'undefined') return;
    pengurutTerpasang = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var th = e.target.closest('th[data-urut]');
      if (th) { urutkanTabel(th); return; }
      var sm = e.target.closest('[data-sumber-hal]');
      if (sm && window.APP && APP.go) {
        e.preventDefault();
        var p = {};
        try { p = JSON.parse(sm.getAttribute('data-sumber-params') || '{}'); } catch (x) {}
        APP.go(sm.getAttribute('data-sumber-hal'), p);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target || !e.target.closest) return;
      var th = e.target.closest('th[data-urut]');
      if (!th) return;
      e.preventDefault();
      urutkanTabel(th);
    });
  }
  pasangPengurut();

  /** Baris tab. items = [{key,label,n}] */
  function tabs(items, aktif, act) {
    return '<div class="tabs">' + items.map(function (t) {
      return '<button class="tab' + (t.key === aktif ? ' active' : '') + '" data-act="' + act + '" data-key="' +
        U.esc(t.key) + '">' + U.esc(t.label) +
        (t.n ? '<span class="n">' + t.n + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  /** Grid foto + tombol tambah (dipakai laporan lapangan & bukti bayar). */
  function photoGrid(ids, opt) {
    opt = opt || {};
    var cells = (ids || []).map(function (id) {
      var src = DB.getPhoto(id);
      if (!src) return '';
      return '<div class="photo-cell"><img src="' + src + '" data-act="' + (opt.zoomAct || 'zoom') + '" data-id="' + id + '">' +
        (opt.delAct ? '<button class="del" data-act="' + opt.delAct + '" data-id="' + id + '" title="Hapus">✕</button>' : '') +
        '</div>';
    }).join('');
    var add = opt.addAct
      ? '<label class="photo-add"><span class="ic">📷</span>' + U.esc(opt.addLabel || I18N.t('Tambah foto')) +
        '<input type="file" accept="image/*" capture="environment" multiple hidden data-change="' + opt.addAct + '"></label>'
      : '';
    if (!cells && !add) return '<div class="tbl-sub">' + I18N.t('Belum ada foto.') + '</div>';
    return '<div class="photo-grid">' + cells + add + '</div>';
  }

  /** Handler standar untuk input file foto -> array photoId. */
  /**
   * inputEl -> array photoId.
   *
   *  boleh memuat { maxSide, quality, maks } untuk pemakaian yang
   * menghasilkan BANYAK foto sekaligus — bukti per langkah pembersihan bisa
   * dua belas foto per tugas, dan ukuran bawaan akan menghabiskan kuota
   * penyimpanan peramban dalam sehari.
   */
  /**
   * inputEl berisi berkas gambar -> array photoId.
   *
   * `opt` boleh memuat maxSide, quality, dan maks untuk pemakaian yang
   * menghasilkan BANYAK foto sekaligus. Bukti sebelum-sesudah per langkah
   * pembersihan bisa dua belas foto untuk satu tugas, dan ukuran bawaan akan
   * menghabiskan kuota penyimpanan peramban dalam sehari.
   */
  function handleFotoInput(inputEl, onDone, opt) {
    opt = opt || {};
    var files = Array.prototype.slice.call(inputEl.files || []);
    if (!files.length) return;
    var maxs = files.slice(0, opt.maks || 6);
    Promise.all(maxs.map(function (f) {
      return U.compressImage(f, opt.maxSide, opt.quality).catch(function () { return null; }); }))
      .then(function (urls) {
        var ids = urls.filter(Boolean).map(function (u) { return DB.putPhoto(u); });
        inputEl.value = '';
        if (!ids.length) { toast(I18N.t('Tidak ada foto yang bisa diproses'), 'err'); return; }
        onDone(ids);
      });
  }

  /* ---------------------------------------------------------------- bilah cari
     Satu bentuk untuk katalog produk maupun katalog layanan. Disatukan di sini
     supaya keduanya tidak pelan-pelan tumbuh berbeda: pembeli yang sudah hafal
     letak "Urutkan" di satu katalog akan mencarinya di tempat yang sama pada
     katalog satunya.

     opsi = {
       cari:     { id, nilai, placeholder, act },
       kontrol:  [{ label, nilai, act, opsi:[{v,l}] }],
       aktif:    bool  → tombol Reset muncul
       resetAct: nama aksi reset
       hasil:    jumlah baris yang tampil,  satuanHasil: 'produk' | 'layanan'
     } */
  function bilahCari(o) {
    function kendali(f) {
      return '<label class="fbar__sel"><span>' + U.esc(I18N.t(f.label)) + '</span>' +
        '<select class="select" data-change="' + f.act + '">' +
          /* Opsi boleh ditandai mati. Dipakai untuk pilihan yang memang ada
             dalam rancangan tetapi datanya belum ada — menghapusnya dari
             daftar membuat orang mengira fiturnya tidak pernah direncanakan,
             sedangkan membiarkannya bisa dipilih membuat mereka mengira
             hasilnya sudah benar. */
          f.opsi.map(function (x) {
            return '<option value="' + U.esc(x.v) + '"' +
              (String(x.v) === String(f.nilai) ? ' selected' : '') +
              (x.mati ? ' disabled' : '') + '>' +
              U.esc(I18N.t(x.l)) + (x.mati && x.sebab ? ' — ' + U.esc(I18N.t(x.sebab)) : '') +
              '</option>';
          }).join('') +
        '</select></label>';
    }

    return '<div class="fbar">' +
      (o.cari
        ? '<div class="fbar__cari">' +
            '<span class="fbar__ic">🔍</span>' +
            '<input class="input" type="search" autocomplete="off" ' +
              'id="' + U.esc(o.cari.id || 'fbar-q') + '" ' +
              'placeholder="' + U.esc(I18N.t(o.cari.placeholder)) + '" ' +
              'value="' + U.esc(o.cari.nilai || '') + '" data-change="' + o.cari.act + '">' +
          '</div>'
        : '') +
      '<div class="fbar__row">' +
        (o.kontrol || []).map(kendali).join('') +
        /* Tombol filter membawa jumlah saringan yang sedang menyala. Tanpa
           angkanya, filter yang aktif tidak terlihat dari luar lembar — dan
           orang menyimpulkan barangnya habis, bukan bahwa saringannya masih
           terpasang dari penelusuran sebelumnya. */
        (o.filter
          ? '<button class="btn btn--ghost btn--sm fbar__filter' + (o.filter.n ? ' on' : '') +
            '" data-act="' + o.filter.act + '">' +
            '<span class="fbar__filter-ic">⚙</span>' + U.esc(I18N.t('Filter')) +
            (o.filter.n ? '<span class="badge-n">' + o.filter.n + '</span>' : '') +
            '</button>'
          : '') +
        (o.aktif ? '<button class="btn btn--ghost btn--sm" data-act="' + o.resetAct + '">✕ ' +
          U.esc(I18N.t('Reset')) + '</button>' : '') +
        '<div class="spacer"></div>' +
        (o.hasil !== undefined
          ? '<span class="tbl-sub">' + o.hasil + ' ' + U.esc(I18N.t(o.satuanHasil || 'hasil')) + '</span>'
          : '') +
      '</div>' +
    '</div>';
  }

  /**
   * Kembalikan fokus ke kolom pencarian setelah halaman digambar ulang.
   * Tanpa ini, mengetik lalu menekan Enter membuat kursor melompat keluar dan
   * pengguna harus mengklik kolomnya lagi untuk melanjutkan.
   */
  function fokusCari(root, id) {
    var el = root && root.querySelector('#' + id);
    if (!el || !el.value) return;
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* type search */ }
  }

  function alert(tipe, teks, icon) {
    return '<div class="alert alert--' + tipe + '"><span class="ic">' + (icon || 'ℹ️') + '</span><div>' + teks + '</div></div>';
  }

  return {
    toast: toast, modal: modal, sheet: sheet, konfirm: konfirm, formModal: formModal, field: field, lightbox: lightbox,
    STATUS: STATUS, statusChip: statusChip, statusText: statusText,
    avatar: avatar, stat: stat, empty: empty, card: card, stars: stars, progress: progress,
    table: table, tabs: tabs, photoGrid: photoGrid, handleFotoInput: handleFotoInput, alert: alert,
    bilahCari: bilahCari, fokusCari: fokusCari,
    bilahSumber: bilahSumber, pasangTabel: pasangTabel
  };
})();
