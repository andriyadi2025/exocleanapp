/* ==========================================================================
   views/pesanjasa.js — layar pesan layanan langsung
   --------------------------------------------------------------------------
   LIMA LANGKAH, DAN HARGA YANG SELALU TERLIHAT

   Bilah harga menempel di bawah sejak langkah pertama dan ikut berubah tiap
   pilihan. Alasannya bukan hiasan: pada jasa, harga bergerak karena durasi,
   layanan tambahan, dan pilihan petugas — dan pelanggan yang baru melihat
   angkanya di layar terakhir akan mundur di layar terakhir itu juga.

   SURVEI SELALU DITAWARKAN, TIDAK PERNAH DIPAKSAKAN

   Layanan berharga tetap tetap punya jalan keluar "minta survei dulu" bagi
   yang ingin dilihat dulu. Layanan tanpa harga tidak punya tombol pesan sama
   sekali — hanya minta survei, dengan sebabnya disebutkan. Menawarkan tombol
   pesan pada sesuatu yang harganya belum ada berarti menjanjikan hal yang
   tidak bisa ditepati.
   ========================================================================== */
var ViewPesanJasa = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  var LANGKAH = ['layanan', 'waktu', 'lokasi', 'petugas', 'konfirmasi'];

  /* Pilihan yang sedang disusun. Hidup di memori: ini keranjang sesaat, bukan
     pesanan — dan pesanan yang belum jadi tidak boleh menumpuk di basis data. */
  var P = null;

  function kosong(serviceId) {
    return {
      serviceId: serviceId,
      qty: 1, extraJam: 0,
      tambahan: [],
      tgl: U.today(), mulai: '09:00',
      alamat: '', koordinat: null,
      kontak: { nama: '', telp: '' },
      catatan: '', jawaban: {},
      workerId: null,
      poinDipakai: 0, poinRupiah: 0,
      metodeBayar: '',
      setuju: false,
      langkah: 0
    };
  }

  function svc() { return P ? BIZ.svc(P.serviceId) : null; }

  function jamSelesai() {
    var s = svc();
    if (!s) return P.mulai;
    var jam = PESAN.berbasisJam(s) ? (P.qty + P.extraJam) : 4;
    var m = String(P.mulai || '09:00').split(':');
    var h = (+m[0] || 9) + jam;
    return String(Math.min(23, h)).padStart(2, '0') + ':' + (m[1] || '00');
  }

  function hitung() {
    return PESAN.hitung({
      serviceId: P.serviceId, qty: P.qty, extraJam: P.extraJam,
      tambahan: P.tambahan, workerId: P.workerId,
      poinRupiah: P.poinRupiah
    });
  }

  /* ================================================================ RANGKA */

  function render(params) {
    var id = (params && params.id) || (P && P.serviceId);
    var s = id ? BIZ.svc(id) : null;

    if (!s) {
      return UI.empty('🧴', T('Layanan tidak ditemukan'),
        T('Kembali ke katalog untuk memilih layanan.')) +
        '<div class="row mt-3"><div class="spacer"></div>' +
        '<button class="btn" data-act="pj-katalog">' + T('Buka katalog layanan') + '</button>' +
        '<div class="spacer"></div></div>';
    }

    if (!P || P.serviceId !== id) P = kosong(id);

    /* Layanan tanpa harga: tidak ada tombol pesan sama sekali. */
    if (!PESAN.bisaLangsung(s)) return layarSurveiSaja(s);

    var h = hitung();

    return '<div class="pj">' +
      '<div class="pj__kepala">' +
        '<button class="btn btn--ghost btn--sm" data-act="pj-keluar">‹ ' + T('Batal') + '</button>' +
        '<b>' + U.esc(s.nama) + '</b>' +
      '</div>' +

      '<div class="pj__lang">' + LANGKAH.map(function (k, i) {
        return '<div class="pj-l' + (i === P.langkah ? ' aktif' : '') +
          (i < P.langkah ? ' lewat' : '') + '"><span>' + (i + 1) + '</span></div>';
      }).join('') + '</div>' +

      '<div class="pj__isi">' + isiLangkah(s, h) + '</div>' +

      /* Bilah harga menempel dan ikut berubah tiap pilihan. */
      '<div class="pj__bilah">' +
        '<div><div class="pj__bl">' + T('Estimasi Harga') + '</div>' +
          '<div class="pj__brp">' + U.rp(h.total) + '</div>' +
          '<div class="pj__bk">' + T('Estimasi — angka akhir mengikuti pekerjaan yang benar-benar dilakukan') + '</div>' +
        '</div><div class="spacer"></div>' +
        tombolLangkah(s, h) +
      '</div>' +
    '</div>';
  }

  function layarSurveiSaja(s) {
    return '<div class="pj">' +
      '<div class="pj__kepala">' +
        '<button class="btn btn--ghost btn--sm" data-act="pj-keluar">‹ ' + T('Batal') + '</button>' +
        '<b>' + U.esc(s.nama) + '</b>' +
      '</div>' +
      '<div class="pj__isi">' +
        UI.card({ title: T('Layanan ini perlu dilihat dulu'), body:
          '<p style="margin:0 0 12px;color:var(--ink-2)">' +
            U.esc(PESAN.sebabTakLangsung(s)) + '</p>' +
          '<p style="margin:0;color:var(--ink-2)">' +
            T('Tim kami datang mengukur — gratis dan tidak mengikat. Penawaran dikirim ' +
              'setelahnya, dan Anda yang memutuskan.') + '</p>' }) +
        '<div class="mb-3"></div>' +
        UI.card({ title: T('Minta survei'), body: formSurvei() }) +
      '</div>' +
    '</div>';
  }

  function formSurvei() {
    var a = BIZ.alamatUtama(APP.user);
    return '<label class="pj-f"><span>' + T('Alamat lokasi') + '</span>' +
        '<textarea class="input" rows="2" data-change="pj-alamat">' +
        U.esc(P.alamat || (a ? a.alamat : '')) + '</textarea></label>' +
      '<label class="pj-f"><span>' + T('Tanggal yang diharapkan') + '</span>' +
        '<input class="input" type="date" data-change="pj-tgl" value="' + U.esc(P.tgl) + '"></label>' +
      '<label class="pj-f"><span>' + T('Catatan') + '</span>' +
        '<textarea class="input" rows="2" data-change="pj-catatan" placeholder="' +
        T('mis. luas kira-kira, lantai berapa, kondisi saat ini') + '">' +
        U.esc(P.catatan) + '</textarea></label>' +
      '<button class="btn btn--block mt-2" data-act="pj-survei">' +
        T('Kirim permintaan survei') + '</button>';
  }

  function tombolLangkah(s, h) {
    if (P.langkah < LANGKAH.length - 1) {
      return '<button class="btn btn--lg" data-act="pj-maju">' + T('Selanjutnya') + '</button>';
    }
    return '<button class="btn btn--lg" data-act="pj-pesan"' + (P.setuju ? '' : ' disabled') + '>' +
      T('Pesan') + '</button>';
  }

  /* ============================================================== LANGKAH */

  function isiLangkah(s, h) {
    if (P.langkah === 1) return langkahWaktu(s);
    if (P.langkah === 2) return langkahLokasi(s);
    if (P.langkah === 3) return langkahPetugas(s, h);
    if (P.langkah === 4) return langkahKonfirmasi(s, h);
    return langkahLayanan(s, h);
  }

  /* ---- 1. layanan & tambahan ---- */
  function langkahLayanan(s, h) {
    var tam = PESAN.tambahanUntuk(s);
    return UI.card({ title: U.esc(s.nama),
      sub: T('Mulai dari') + ' ' + U.rp(s.hargaMin) + ' / ' + U.esc(s.satuan),
      body:
        (s.checklist || []).length
          ? '<div class="tbl-sub mb-1">' + T('Yang dikerjakan') + '</div><ul class="pj-ck">' +
            (s.checklist || []).map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') +
            '</ul>'
          : '' }) +

      '<div class="mb-3"></div>' +

      UI.card({ title: T('Layanan tambahan'), sub: T('Opsional — bisa dilewati'),
        body: tam.length
          ? tam.map(function (t) {
              var dipakai = P.tambahan.filter(function (x) { return x.serviceId === t.id; })[0];
              return '<div class="pj-add' + (dipakai ? ' on' : '') + '">' +
                '<div style="min-width:0;flex:1">' +
                  '<b>' + U.esc(t.nama) + '</b>' +
                  '<div class="tbl-sub">' + T('Mulai dari') + ' ' + U.rp(t.hargaMin) +
                    ' / ' + U.esc(t.satuan) + '</div>' +
                '</div>' +
                (dipakai
                  ? '<div class="qty"><button class="qty__b" data-act="pj-add-kurang" data-id="' +
                      U.esc(t.id) + '">−</button><span class="qty__i">' + dipakai.qty + '</span>' +
                    '<button class="qty__b" data-act="pj-add-tambah" data-id="' + U.esc(t.id) +
                      '">+</button></div>'
                  : '<button class="btn btn--soft btn--sm" data-act="pj-add-tambah" data-id="' +
                    U.esc(t.id) + '">＋</button>') +
              '</div>';
            }).join('')
          : '<div class="tbl-sub">' + T('Belum ada layanan tambahan berharga tetap.') + '</div>' }) +

      '<div class="mb-3"></div>' +
      UI.alert('info', '<b>' + T('Ingin dilihat dulu?') + '</b> ' +
        T('Anda tetap bisa minta survei gratis sebelum memesan.') +
        ' <button class="tautan-kecil" data-act="pj-ke-survei">' + T('Minta survei') + '</button>', 'ℹ️');
  }

  /* ---- 2. waktu ---- */
  function langkahWaktu(s) {
    var jam = PESAN.berbasisJam(s);
    var c = PESAN.config();
    return UI.card({
      title: jam ? T('Pilih durasi') : T('Jumlah'),
      sub: jam ? T('Dihitung per jam') : T('Dihitung per') + ' ' + U.esc(s.satuan),
      body: jam
        ? '<div class="pj-durasi">' + c.durasiJam.map(function (n) {
            return '<button class="pj-d' + (P.qty === n ? ' on' : '') + '" ' +
              'data-act="pj-durasi" data-n="' + n + '">' + n + ' ' + T('Jam') +
              '<small>' + U.rp((s.hargaMin || 0) * n) + '</small></button>';
          }).join('') + '</div>'
        : '<label class="pj-f"><span>' + T('Jumlah') + ' (' + U.esc(s.satuan) + ')</span>' +
          '<input class="input" type="number" min="1" data-change="pj-qty" value="' + P.qty + '"></label>'
    }) +
    '<div class="mb-3"></div>' +
    UI.card({ title: T('Kapan dikerjakan'), body:
      '<div class="pj-2">' +
        '<label class="pj-f"><span>' + T('Tanggal') + '</span>' +
          '<input class="input" type="date" data-change="pj-tgl" value="' + U.esc(P.tgl) + '"></label>' +
        '<label class="pj-f"><span>' + T('Jam mulai') + '</span>' +
          '<input class="input" type="time" data-change="pj-mulai" value="' + U.esc(P.mulai) + '"></label>' +
      '</div>' +
      '<div class="tbl-sub">' + T('Perkiraan selesai') + ': <b>' + jamSelesai() + '</b></div>' })
  }

  /* ---- 3. kontak & lokasi ---- */
  function langkahLokasi(s) {
    var a = BIZ.alamatUtama(APP.user);
    var c = PESAN.config();
    if (!P.alamat && a) { P.alamat = a.alamat; P.koordinat = a.koordinat || null; }
    if (!P.kontak.nama) { P.kontak.nama = APP.user.nama; P.kontak.telp = APP.user.telp || ''; }

    return UI.card({ title: T('Detail kontak'), body:
      '<div class="pj-2">' +
        '<label class="pj-f"><span>' + T('Nama penerima') + '</span>' +
          '<input class="input" data-change="pj-nama" value="' + U.esc(P.kontak.nama) + '"></label>' +
        '<label class="pj-f"><span>' + T('Nomor HP') + '</span>' +
          '<input class="input" data-change="pj-telp" value="' + U.esc(P.kontak.telp) + '"></label>' +
      '</div>' }) +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Lokasi layanan'), body:
        '<label class="pj-f"><span>' + T('Alamat') + '</span>' +
          '<textarea class="input" rows="2" data-change="pj-alamat">' + U.esc(P.alamat) + '</textarea></label>' +
        (P.koordinat && window.MAPS && MAPS.valid(P.koordinat)
          ? '<div class="tbl-sub">📍 ' + MAPS.teksKoordinat(P.koordinat) + '</div>'
          : '<div class="tbl-sub">' + T('Titik peta belum ditandai — tim memakai alamat tertulis.') + '</div>') }) +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Kesiapan lokasi'),
        sub: T('Menentukan apa yang perlu dibawa tim'),
        body: c.pertanyaan.map(function (q) {
          var j = P.jawaban[q.id];
          return '<div class="pj-q"><div style="flex:1;min-width:0">' + U.esc(T(q.teks)) + '</div>' +
            '<div class="pj-q__b">' +
              ['ya', 'tidak'].map(function (v) {
                return '<button class="pj-qb' + (j === v ? ' on' : '') + '" data-act="pj-jawab" ' +
                  'data-q="' + U.esc(q.id) + '" data-v="' + v + '">' +
                  (v === 'ya' ? T('Ya') : T('Tidak')) + '</button>';
              }).join('') +
            '</div></div>';
        }).join('') +
        '<label class="pj-f mt-2"><span>' + T('Catatan untuk tim') + '</span>' +
          '<textarea class="input" rows="2" data-change="pj-catatan" placeholder="' +
          T('mis. pintu masuk lewat samping, ada hewan peliharaan') + '">' +
          U.esc(P.catatan) + '</textarea></label>' });
  }

  /* ---- 4. pilih petugas ---- */
  function langkahPetugas(s, h) {
    var list = PESAN.petugasTersedia(P.serviceId, P.tgl, P.mulai, jamSelesai());

    return UI.card({ title: T('Pilih petugas'),
      sub: T('Hanya yang tersertifikasi untuk layanan ini dan jadwalnya kosong'),
      body: list.length
        ? '<div class="pj-cl">' + list.slice(0, 9).map(function (w) {
            var on = P.workerId === w.id;
            return '<button class="pj-c' + (on ? ' on' : '') + '" data-act="pj-petugas" ' +
              'data-id="' + U.esc(w.id) + '">' +
              '<div class="pj-c__ava">' + (w.foto
                ? '<img src="' + DB.getPhoto(w.foto) + '" alt="">'
                : UI.avatar(w.nama)) + '</div>' +
              '<b>' + U.esc(U.potong(w.nama, 16)) + '</b>' +
              /* Petugas tanpa ulasan TIDAK diberi angka. Menampilkan 0.0 pada
                 orang yang belum pernah dinilai membuatnya terlihat buruk atas
                 sesuatu yang belum pernah terjadi. */
              (w.nilai
                ? '<span class="pj-c__n">★ ' + w.nilai.rata + ' <small>(' + w.nilai.jumlah + ')</small></span>'
                : '<span class="pj-c__n pj-c__n--baru">' + T('Belum dinilai') + '</span>') +
              '<span class="pj-c__s">' +
                (w.selisih > 0 ? '+' + U.rpShort(w.selisih)
                  : w.selisih < 0 ? '−' + U.rpShort(-w.selisih) : T('Tarif normal')) +
              '</span>' +
            '</button>';
          }).join('') + '</div>' +
          '<div class="tbl-sub mt-2">' +
            T('Selisih tarif mengikuti rekam jejak. Tidak memilih pun boleh — tim kami yang menugaskan.') +
          '</div>' +
          (P.workerId
            ? '<button class="btn btn--ghost btn--sm mt-2" data-act="pj-petugas" data-id="">' +
              T('Biar tim yang menentukan') + '</button>' : '')
        : UI.empty('👷', T('Belum ada petugas yang tersedia'),
            T('Tidak ada mitra tersertifikasi yang jadwalnya kosong pada waktu itu. ' +
              'Ubah tanggal atau jam, atau lanjutkan tanpa memilih — tim kami yang menugaskan.'))
    });
  }

  /* ---- 5. konfirmasi ---- */
  function langkahKonfirmasi(s, h) {
    var kanal = window.PAY ? PAY.kanalTersedia() : [];
    var ins = window.INSENTIF ? INSENTIF.batasPoin(APP.user.id, h.subtotal - h.diskon) : null;
    var w = P.workerId ? DB.find('users', P.workerId) : null;

    return UI.card({ title: T('Konfirmasi pesanan'), body:
      '<div class="pj-rk"><span>📅</span><div><b>' + U.tglPanjang(P.tgl) + ' · ' + P.mulai + '</b>' +
        '<div class="tbl-sub">' + T('Perkiraan selesai') + ' ' + jamSelesai() + '</div></div></div>' +
      '<div class="pj-rk"><span>👤</span><div><b>' + U.esc(P.kontak.nama) + '</b>' +
        '<div class="tbl-sub">' + U.esc(P.kontak.telp) + '</div></div></div>' +
      '<div class="pj-rk"><span>📍</span><div>' + U.esc(P.alamat) + '</div></div>' +
      (w ? '<div class="pj-rk"><span>👷</span><div><b>' + U.esc(w.nama) + '</b>' +
        '<div class="tbl-sub">' + T('petugas pilihan Anda') + '</div></div></div>' : '') +
    '' }) +

    '<div class="mb-3"></div>' +

    UI.card({ title: T('Rincian biaya'), body:
      baris(h.layanan.nama + ' × ' + h.layanan.qty, U.rp(h.dasar)) +
      h.tambahan.map(function (t) {
        return baris(t.nama + ' × ' + t.qty, U.rp(t.subtotal)); }).join('') +
      (h.subExtra ? baris(T('Extra time') + ' ' + h.extraJam + ' ' + T('jam'), U.rp(h.subExtra)) : '') +
      (h.selisihPetugas ? baris(T('Pilihan petugas'),
        (h.selisihPetugas > 0 ? '' : '−') + U.rp(Math.abs(h.selisihPetugas))) : '') +
      (h.diskon ? baris(T('Diskon'), '−' + U.rp(h.diskon), 'min') : '') +
      baris(T('Biaya layanan'), U.rp(h.biayaLayanan)) +
      (h.poinRupiah ? baris(P.poinDipakai + ' ' + POIN.nama() + ' ' + T('dipakai'),
        '−' + U.rp(h.poinRupiah), 'min') : '') +
      baris(T('Total'), U.rp(h.total), 'tot') +
      (h.garansiHari
        ? '<div class="pj-garansi">🛡️ ' +
          T('{n} hari garansi — bila hasilnya tidak sesuai, kami kerjakan ulang tanpa biaya.')
            .replace('{n}', h.garansiHari) + '</div>'
        : '') }) +

    '<div class="mb-3"></div>' +

    (ins && ins.alasan === 'ok'
      ? UI.card({ title: '💰 ' + T('Pakai') + ' ' + POIN.nama(), body:
          '<div class="row">' +
            '<input class="input" type="number" min="0" max="' + ins.poin + '" ' +
              'value="' + (P.poinDipakai || '') + '" placeholder="0" ' +
              'data-change="pj-poin" style="max-width:130px">' +
            '<button class="btn btn--ghost btn--sm" data-act="pj-poin-maks">' +
              T('Maksimal') + ' (' + U.num(ins.poin) + ')</button>' +
          '</div>' +
          '<div class="tbl-sub mt-1">' + T('Saldo') + ' ' + U.num(ins.saldo) + ' · ' +
            T('paling banyak') + ' ' + U.rp(ins.maksRp) + '</div>' }) +
        '<div class="mb-3"></div>'
      : '') +

    UI.card({ title: T('Metode pembayaran'), body:
      kanal.length
        ? kanal.slice(0, 6).map(function (k) {
            return '<button class="pj-bayar' + (P.metodeBayar === k.id ? ' on' : '') + '" ' +
              'data-act="pj-bayar" data-id="' + U.esc(k.id) + '">' +
              '<span class="pj-bayar__ic">' + (k.ic || '💳') + '</span>' +
              '<div style="flex:1;min-width:0"><b>' + U.esc(k.nama) + '</b>' +
              (k.ket ? '<div class="tbl-sub">' + U.esc(k.ket) + '</div>' : '') + '</div>' +
              (P.metodeBayar === k.id ? '<span>✓</span>' : '') +
            '</button>';
          }).join('')
        : '<div class="tbl-sub">' + T('Belum ada metode pembayaran aktif.') + '</div>' }) +

    '<div class="mb-3"></div>' +

    '<label class="pj-setuju">' +
      '<input type="checkbox" data-change="pj-setuju"' + (P.setuju ? ' checked' : '') + '>' +
      '<span>' + T('Dengan menekan Pesan, saya setuju pada syarat dan ketentuan EXOCLEAN.') + '</span>' +
    '</label>';
  }

  function baris(label, nilai, kelas) {
    return '<div class="pj-b' + (kelas ? ' pj-b--' + kelas : '') + '">' +
      '<span>' + U.esc(label) + '</span><div class="spacer"></div><span>' + nilai + '</span></div>';
  }

  /* ================================================================ AKSI */

  function mount(root) {
    U.delegate(root, {
      'pj-keluar': function () { P = null; APP.go('transaksi'); },
      'pj-katalog': function () { APP.go('transaksi'); },

      'pj-maju': function () {
        var s = svc();
        var salah = periksaLangkah(s);
        if (salah) { UI.toast(salah, 'warn'); return; }
        P.langkah = Math.min(LANGKAH.length - 1, P.langkah + 1);
        APP.refresh();
      },

      'pj-add-tambah': function (el) {
        var id = el.getAttribute('data-id');
        var a = P.tambahan.filter(function (x) { return x.serviceId === id; })[0];
        if (a) a.qty++; else P.tambahan.push({ serviceId: id, qty: 1 });
        APP.refresh();
      },
      'pj-add-kurang': function (el) {
        var id = el.getAttribute('data-id');
        var a = P.tambahan.filter(function (x) { return x.serviceId === id; })[0];
        if (!a) return;
        a.qty--;
        if (a.qty <= 0) P.tambahan = P.tambahan.filter(function (x) { return x.serviceId !== id; });
        APP.refresh();
      },

      'pj-durasi': function (el) { P.qty = +el.getAttribute('data-n') || 1; APP.refresh(); },
      'pj-jawab': function (el) {
        P.jawaban[el.getAttribute('data-q')] = el.getAttribute('data-v');
        APP.refresh();
      },
      'pj-petugas': function (el) {
        var id = el.getAttribute('data-id');
        P.workerId = id || null;
        APP.refresh();
      },
      'pj-bayar': function (el) { P.metodeBayar = el.getAttribute('data-id'); APP.refresh(); },

      'pj-poin-maks': function () {
        var h = hitung();
        var b = INSENTIF.batasPoin(APP.user.id, h.subtotal - h.diskon);
        P.poinDipakai = b.poin; P.poinRupiah = b.rp;
        APP.refresh();
      },

      'pj-ke-survei': function () {
        UI.konfirm({
          title: T('Minta survei dulu?'),
          text: T('Tim kami datang mengukur — gratis dan tidak mengikat. Penawaran dikirim ' +
            'setelahnya, dan Anda yang memutuskan. Pilihan pesanan langsung tetap terbuka.'),
          okText: T('Ya, minta survei')
        }).then(function (ya) {
          if (!ya) return;
          kirimSurvei();
        });
      },
      'pj-survei': function () { kirimSurvei(); },

      'pj-pesan': function () {
        var s = svc();
        if (!P.setuju) { UI.toast(T('Centang persetujuan syarat & ketentuan dulu.'), 'warn'); return; }
        if (!P.metodeBayar) { UI.toast(T('Pilih metode pembayaran dulu.'), 'warn'); return; }
        try {
          var o = PESAN.buat(APP.user.id, {
            serviceId: P.serviceId, qty: P.qty, extraJam: P.extraJam,
            tambahan: P.tambahan, workerId: P.workerId,
            tgl: P.tgl, mulai: P.mulai, selesai: jamSelesai(),
            alamat: P.alamat, koordinat: P.koordinat,
            kontak: P.kontak, catatan: P.catatan, jawaban: P.jawaban,
            metodeBayar: (PAY.channel(P.metodeBayar) || {}).nama || P.metodeBayar,
            poinDipakai: P.poinDipakai, poinRupiah: P.poinRupiah
          });
          P = null;
          UI.toast(T('Pesanan dibuat') + ' — ' + o.no, 'ok');
          APP.go('order');
        } catch (e) { UI.toast(e.message, 'err'); }
      }
    });

    root.addEventListener('change', function (ev) {
      var el = ev.target;
      var k = el.getAttribute && el.getAttribute('data-change');
      if (!k || k.indexOf('pj-') !== 0) return;
      if (k === 'pj-qty') P.qty = Math.max(1, Math.round(+el.value || 1));
      else if (k === 'pj-tgl') P.tgl = el.value;
      else if (k === 'pj-mulai') P.mulai = el.value;
      else if (k === 'pj-alamat') P.alamat = el.value;
      else if (k === 'pj-nama') P.kontak.nama = el.value;
      else if (k === 'pj-telp') P.kontak.telp = el.value;
      else if (k === 'pj-catatan') P.catatan = el.value;
      else if (k === 'pj-setuju') P.setuju = el.checked;
      else if (k === 'pj-poin') {
        var h = hitung();
        var b = INSENTIF.batasPoin(APP.user.id, h.subtotal - h.diskon);
        P.poinDipakai = Math.max(0, Math.min(Math.round(+el.value || 0), b.poin));
        P.poinRupiah = INSENTIF.rupiahPoin(P.poinDipakai);
      }
      APP.refresh();
    });
  }

  /** Yang wajib diisi sebelum boleh maju. Disebut spesifik, bukan "lengkapi data". */
  function periksaLangkah(s) {
    if (P.langkah === 1) {
      if (!P.tgl) return T('Tanggal belum dipilih.');
      if (!P.mulai) return T('Jam mulai belum dipilih.');
      /* Tanggal yang sudah lewat hampir selalu salah ketik, dan pesanan untuk
         kemarin tidak bisa dikerjakan siapa pun. */
      if (P.tgl < U.today()) return T('Tanggalnya sudah lewat.');
      return null;
    }
    if (P.langkah === 2) {
      if (!String(P.alamat || '').trim()) return T('Alamat lokasi belum diisi.');
      if (!String(P.kontak.nama || '').trim()) return T('Nama penerima belum diisi.');
      if (!String(P.kontak.telp || '').trim()) return T('Nomor HP belum diisi.');
      var kurang = PESAN.config().pertanyaan.filter(function (q) {
        return q.wajib && !P.jawaban[q.id]; });
      if (kurang.length) return T('Jawab dulu: ') + T(kurang[0].teks);
      return null;
    }
    return null;
  }

  function kirimSurvei() {
    if (!String(P.alamat || '').trim()) {
      var a = BIZ.alamatUtama(APP.user);
      P.alamat = a ? a.alamat : '';
    }
    if (!String(P.alamat || '').trim()) { UI.toast(T('Alamat lokasi belum diisi.'), 'warn'); return; }
    var b = PESAN.mintaSurvei(APP.user.id, {
      serviceId: P.serviceId, qty: P.qty, alamat: P.alamat,
      tgl: P.tgl, catatan: P.catatan });
    P = null;
    UI.toast(T('Permintaan survei terkirim') + ' — ' + b.no, 'ok');
    APP.go('transaksi');
  }

  function page() {
    return { label: T('Pesan Layanan'), icon: '🧴', grup: 'Utama', tersembunyi: true,
             render: render, mount: mount };
  }

  return { page: page, render: render, mount: mount };
})();
