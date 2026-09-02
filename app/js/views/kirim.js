/* ==========================================================================
   views/kirim.js — Pengaturan Pengiriman (admin) + pemilih kurir (klien)
   ========================================================================== */
var ViewKirim = (function () {

  var T = function (s) { return I18N.t(s); };
  var hasilUji = null;

  function me() { return APP.user; }

  /* ================================================================ SETELAN ADMIN */
  function render() {
    var c = KIRIM.config();
    var live = c.mode === 'live';
    var wAsal = wilayahAsal(c);

    return '<div class="page">' +

      (live
        ? (c.backendUrl
            ? UI.alert('ok', '<b>' + T('Mode kurir sungguhan.') + '</b> ' +
                T('Tarif dan nomor resi diambil dari Biteship lewat backend Anda.'), '🚚')
            : UI.alert('danger', '<b>' + T('Mode live tanpa URL backend.') + '</b> ' +
                T('Tarif tidak akan bisa diambil. Isi URL backend di bawah, atau kembalikan ke simulasi.'), '⛔'))
        : UI.alert('warn', '<b>' + T('Mode simulasi aktif.') + '</b> ' +
            T('Tarif kurir di bawah dibuat aplikasi dari jarak — bukan tarif sungguhan, ' +
              'dan nomor resinya tidak bisa dilacak di situs kurir. Cukup untuk mencoba ' +
              'seluruh alur tanpa API key.'), '🧪')) +

      UI.alert('brand',
        '<b>' + T('API key Biteship tidak pernah disimpan di sini.') + '</b> ' +
        T('Kunci itu berhak membuat pesanan kirim — artinya berhak mengeluarkan uang. ' +
          'Tempatnya hanya di berkas .env pada server, dan halaman ini menolak nilai ' +
          'yang terlihat seperti kunci. Yang disimpan di aplikasi hanyalah alamat backend ' +
          'dan pilihan kurir.'), '🔐') +

      UI.card({ title: T('Mode pengiriman'), body:
        ['simulasi', 'live'].map(function (m) {
          var judul = m === 'simulasi' ? T('Simulasi') : T('Biteship (kurir sungguhan)');
          var ket = m === 'simulasi'
            ? T('Tarif dihitung dari jarak. Tidak memanggil kurir mana pun.')
            : T('Tarif, pesanan kirim, dan pelacakan diambil dari Biteship lewat backend.');
          return '<label class="pm' + (c.mode === m ? ' on' : '') + '">' +
            '<input type="radio" name="mode-kirim" value="' + m + '" data-change="mode"' +
              (c.mode === m ? ' checked' : '') + '>' +
            '<span class="pm__ic">' + (m === 'simulasi' ? '🧪' : '🚚') + '</span>' +
            '<span class="pm__body"><b>' + U.esc(judul) + '</b><small>' + U.esc(ket) + '</small></span>' +
          '</label>';
        }).join('') }) +

      UI.card({ title: T('Backend pengiriman'),
        sub: T('Server yang menyimpan API key dan meneruskan permintaan ke Biteship'),
        tools: '<button class="btn btn--sm" data-act="uji">🔌 ' + T('Uji koneksi') + '</button>',
        body: UI.field({ name: 'backendUrl', label: T('URL backend'), value: c.backendUrl,
            placeholder: 'http://localhost:4200',
            hint: T('Kosongkan untuk memakai simulasi. Contoh berkas server ada di folder server/.') }) +
          '<button class="btn btn--ghost btn--sm mt-1" data-act="simpan-url">' + T('Simpan URL') + '</button>' +
          (hasilUji
            ? '<div class="mt-3">' + UI.alert(hasilUji.ok ? 'ok' : 'danger',
                U.esc(hasilUji.pesan) +
                (hasilUji.kurir && hasilUji.kurir.length
                  ? '<div class="tbl-sub mt-1">' + T('Kurir aktif di akun Anda') + ': ' +
                    U.esc(hasilUji.kurir.join(', ')) + '</div>' : ''),
                hasilUji.ok ? '✅' : '⛔') + '</div>'
            : '') }) +

      UI.card({ title: T('Kurir yang ditawarkan ke pembeli'),
        sub: c.kurir.length + ' ' + T('kurir dipilih'),
        body: '<div class="chip-pilih">' + Object.keys(KIRIM.KURIR).map(function (k) {
            var on = c.kurir.indexOf(k) >= 0;
            return '<button type="button" class="chip ' + (on ? 'chip--brand' : 'chip--muted') + '" ' +
              'data-act="toggle-kurir" data-k="' + U.esc(k) + '">' +
              KIRIM.KURIR[k].ic + ' ' + U.esc(KIRIM.KURIR[k].nama) + (on ? ' ✓' : '') + '</button>';
          }).join('') + '</div>' +
          '<p class="tbl-sub mt-2">' +
          T('Yang benar-benar muncul adalah irisan antara pilihan di sini dan kurir yang ' +
            'aktif di akun Biteship Anda. Kurir instan (GoSend, GrabExpress, Lalamove) ' +
            'hanya melayani jarak dekat dan menghitung tarif per kilometer.') + '</p>' }) +

      UI.card({ title: T('Alamat asal Toko Resmi'),
        sub: T('Titik penjemputan untuk pesanan Toko Resmi EXOCLEAN'),
        /* Kolom bertingkat yang sama dengan seluruh aplikasi. Kurir membaca
           kode pos dan kecamatan, bukan satu baris bebas — alamat asal yang
           diketik lepas adalah sebab paling sering penjemputan gagal. */
        body: '<div class="grid g-2">' +
            WILAYAH.fields(wAsal, { prefix: 'as_' })
              .map(function (fl) { return UI.field(fl); }).join('') +
          '</div>' +
          '<button class="btn btn--ghost btn--sm mt-1" data-act="simpan-asal">' + T('Simpan alamat asal') + '</button>' +
          '<p class="tbl-sub mt-2">' +
          T('Mitra toko memakai alamat tokonya masing-masing; alamat ini hanya dipakai ' +
            'Toko Resmi dan sebagai cadangan bila alamat toko belum diisi.') + '</p>' }) +

      UI.card({ title: T('Ukuran & berat bawaan'),
        sub: T('Dipakai bila produk belum punya data berat dan dimensi'),
        body: '<div class="grid g-4">' +
            UI.field({ name: 'berat', label: T('Berat (gram)'), type: 'number', value: c.beratBawaanGram }) +
            UI.field({ name: 'dimP', label: T('Panjang (cm)'), type: 'number', value: c.dimensiBawaan.p }) +
            UI.field({ name: 'dimL', label: T('Lebar (cm)'), type: 'number', value: c.dimensiBawaan.l }) +
            UI.field({ name: 'dimT', label: T('Tinggi (cm)'), type: 'number', value: c.dimensiBawaan.t }) +
          '</div>' +
          '<label class="check mt-2"><input type="checkbox" data-change="asuransi"' +
            (c.asuransiOtomatis ? ' checked' : '') + '> ' +
            T('Asuransikan otomatis senilai barang') + '</label>' +
          '<button class="btn btn--ghost btn--sm mt-2" data-act="simpan-paket">' + T('Simpan') + '</button>' +
          '<p class="tbl-sub mt-2">' +
          T('Kurir menagih menurut berat volumetrik — panjang × lebar × tinggi ÷ 6000 — ' +
            'bila angkanya lebih besar daripada berat sebenarnya. Karena itu dimensi tetap ' +
            'perlu diisi meski barangnya ringan.') + '</p>' }) +

    '</div>';
  }

  /* ================================================================ AKSI ADMIN */
  /* Bentuk terstruktur alamat asal. Yang tersimpan lama hanya satu baris
     plus kode pos; keduanya diurai supaya bisa dilengkapi, bukan ditolak. */
  function wilayahAsal(c) {
    if (!window.WILAYAH) return null;
    if (WILAYAH.terstruktur(c.asal.wilayah)) return c.asal.wilayah;
    var w = WILAYAH.dariTeksLama(c.asal.alamat || '');
    if (c.asal.kodePos) w.kodePos = c.asal.kodePos;
    return w;
  }

  function aksi(root) {
    /* Kartunya bukan modal, jadi pemasangan berjenjangnya di sini. */
    if (root.querySelector('#f_as_negara')) WILAYAH.pasang(root, 'as_');
    var map = AKSES.lindungi({
      mode: function (el) {
        if (el.value === 'live' && !(KIRIM.config().backendUrl || '').trim()) {
          UI.toast(T('Isi URL backend dulu — mode live butuh server yang menyimpan API key.'), 'warn');
        }
        KIRIM.simpanConfig({ mode: el.value });
        hasilUji = null;
        APP.refresh();
      },

      'simpan-url': function (el) {
        var v = String(nilai(el, 'backendUrl') || '').trim();
        /* Penjaga yang sama seperti pengaturan pembayaran: apa pun yang
           terlihat seperti kunci ditolak sebelum sempat tersimpan di browser. */
        if (/biteship_(test|live)\./i.test(v) || /secret|api[_-]?key/i.test(v)) {
          UI.toast(T('Itu terlihat seperti API key, bukan URL. Kunci hanya boleh di .env pada server.'), 'err');
          return;
        }
        if (v && !/^https?:\/\//i.test(v)) { UI.toast(T('URL harus diawali http:// atau https://'), 'err'); return; }
        KIRIM.simpanConfig({ backendUrl: v });
        hasilUji = null;
        UI.toast(T('URL backend disimpan.'), 'ok');
        APP.refresh();
      },

      uji: function () {
        if (!(KIRIM.config().backendUrl || '').trim()) {
          UI.toast(T('Isi URL backend dulu.'), 'warn'); return;
        }
        UI.toast(T('Menghubungi backend…'), 'info');
        KIRIM.ujiKoneksi().then(function (h) {
          hasilUji = h; APP.refresh();
        }).catch(function (e) {
          hasilUji = { ok: false, pesan: e.message }; APP.refresh();
        });
      },

      'toggle-kurir': function (el) {
        var k = el.getAttribute('data-k');
        var list = KIRIM.config().kurir.slice();
        var i = list.indexOf(k);
        if (i >= 0) list.splice(i, 1); else list.push(k);
        if (!list.length) { UI.toast(T('Minimal satu kurir harus dipilih.'), 'warn'); return; }
        KIRIM.simpanConfig({ kurir: list });
        APP.refresh();
      },

      'simpan-asal': function (el) {
        var kartu = el.closest('.card') || el.parentNode;
        var w = WILAYAH.dariForm(U.readForm(kartu), 'as_');
        var salah = WILAYAH.periksa(w);
        if (salah) { UI.toast(salah, 'err'); return; }
        var c = KIRIM.config();
        KIRIM.simpanConfig({ asal: {
          wilayah: w,
          /* Satu baris dan kode pos DITURUNKAN — Biteship membaca keduanya,
             dan keduanya harus selalu sama dengan kolom di atasnya. */
          alamat: WILAYAH.teks(w, { denganNegara: false }),
          kodePos: w.kodePos,
          /* Titik peta tidak ikut berubah: ia ditandai terpisah dan tidak
             bisa disimpulkan dari nama wilayah. */
          lat: c.asal.lat, lng: c.asal.lng
        } });
        UI.toast(T('Alamat asal disimpan.'), 'ok');
        APP.refresh();
      },

      'simpan-paket': function (el) {
        KIRIM.simpanConfig({
          beratBawaanGram: Math.max(1, Number(nilai(el, 'berat')) || 1000),
          dimensiBawaan: {
            p: Math.max(1, Number(nilai(el, 'dimP')) || 20),
            l: Math.max(1, Number(nilai(el, 'dimL')) || 15),
            t: Math.max(1, Number(nilai(el, 'dimT')) || 10)
          }
        });
        UI.toast(T('Ukuran bawaan disimpan.'), 'ok');
        APP.refresh();
      },

      asuransi: function (el) { KIRIM.simpanConfig({ asuransiOtomatis: el.checked }); }
    }, {
      mode: 'sistem.peta', 'simpan-url': 'sistem.peta', 'toggle-kurir': 'sistem.peta',
      'simpan-asal': 'sistem.peta', 'simpan-paket': 'sistem.peta', asuransi: 'sistem.peta'
    });

    U.delegate(root, map);
  }

  /** Baca satu field dari halaman (bukan dari modal). */
  function nilai(el, nama) {
    var f = document.getElementById('f_' + nama);
    return f ? f.value : '';
  }

  /* ================================================================ DIMENSI PRODUK
     Dipakai bersama oleh formulir produk admin dan formulir produk mitra toko,
     supaya keduanya menghitung dan memvalidasi dengan cara yang sama persis. */

  /** Blok pembuka bagian pengiriman pada formulir produk. */
  function introDimensi(p) {
    var b = KIRIM.config();
    var kosong = KIRIM.perkiraan(p);
    return '<div class="field" style="grid-column:1/-1">' +
      '<div class="nav-group" style="color:var(--muted);padding:14px 0 4px">🚚 ' +
        T('Data pengiriman') + '</div>' +
      (kosong
        ? UI.alert('warn', T('Belum diisi — sementara dipakai perkiraan') + ' <b>' +
            KIRIM.teksBerat(b.beratBawaanGram) + ', ' + b.dimensiBawaan.p + '×' +
            b.dimensiBawaan.l + '×' + b.dimensiBawaan.t + ' cm</b>. ' +
            T('Ongkir yang ditagihkan ke pembeli bisa meleset dari tagihan kurir ' +
              'selama angka ini belum benar.'), '⚠️')
        : '') +
      '<p class="tbl-sub" style="margin:6px 0 0">' +
        T('Kurir menagih menurut yang LEBIH BESAR antara berat timbangan dan berat ' +
          'volumetrik — panjang × lebar × tinggi ÷ ') + KIRIM.PEMBAGI_VOLUME +
        T('. Satu karton tisu ringan tetapi besar dibayar menurut ukurannya, bukan ' +
          'timbangannya. Karena itu dimensi tetap perlu meski barangnya enteng.') + '</p>' +
      '<div id="hitung-dim" class="dim-hitung mt-2"></div>' +
    '</div>';
  }

  /** Baca empat kolom dimensi dari formulir apa pun. */
  function bacaDim(root) {
    function n(nama) {
      var el = (root || document).querySelector('#f_' + nama);
      return el ? Number(el.value) || 0 : 0;
    }
    return { berat: n('beratGram'), p: n('dimP'), l: n('dimL'), t: n('dimT') };
  }

  /** Papan hitung langsung: memperlihatkan berat tertagih sambil diketik. */
  function pasangHitungDimensi(root) {
    function gambar() {
      var box = root.querySelector('#hitung-dim');
      if (!box) return;
      var d = bacaDim(root);
      if (!d.berat && !(d.p && d.l && d.t)) {
        box.innerHTML = '<span class="tbl-sub">' +
          T('Isi berat dan dimensi untuk melihat berat yang ditagih kurir.') + '</span>';
        return;
      }
      var vol = d.p && d.l && d.t
        ? Math.round(d.p * d.l * d.t / KIRIM.PEMBAGI_VOLUME * 1000) : 0;
      var tagih = Math.max(d.berat, vol);
      var yangMenang = vol > d.berat ? 'volumetrik' : 'timbangan';
      box.innerHTML =
        '<div class="row wrap" style="gap:14px">' +
          '<span><small>' + T('Timbangan') + '</small><b>' + KIRIM.teksBerat(d.berat) + '</b></span>' +
          '<span><small>' + T('Volumetrik') + '</small><b>' + KIRIM.teksBerat(vol) + '</b></span>' +
          '<span class="dim-hitung__hasil"><small>' + T('Ditagih kurir') + '</small><b>' +
            KIRIM.teksBerat(tagih) + '</b></span>' +
        '</div>' +
        (vol && d.berat
          ? '<div class="tbl-sub mt-1">' + T('Yang dipakai adalah berat') + ' <b>' +
            T(yangMenang) + '</b>' +
            (vol > d.berat
              ? ' — ' + T('barangnya besar untuk beratnya; kemasan yang lebih ringkas menurunkan ongkir.')
              : '.') + '</div>'
          : '');
    }
    ['beratGram', 'dimP', 'dimL', 'dimT'].forEach(function (nama) {
      var el = root.querySelector('#f_' + nama);
      if (el) el.addEventListener('input', gambar);
    });
    gambar();
  }

  /**
   * Dimensi boleh dikosongkan seluruhnya — nilai bawaan yang dipakai. Yang
   * tidak boleh adalah setengah terisi: dua sisi tanpa sisi ketiga membuat
   * berat volumetrik menjadi nol dan ongkirnya diam-diam terlalu murah.
   */
  function validasiDimensi(d) {
    var ada = [d.dimP, d.dimL, d.dimT].filter(function (x) { return Number(x) > 0; }).length;
    if (ada > 0 && ada < 3) {
      return T('Panjang, lebar, dan tinggi harus diisi ketiganya — atau kosongkan semuanya.');
    }
    if (Number(d.beratGram) < 0) return T('Berat tidak boleh negatif.');
    if (Number(d.beratGram) > 150000) {
      return T('Berat di atas 150 kg tidak dilayani kurir paket. Gunakan pengiriman kargo.');
    }
    return null;
  }

  /** Ubah kolom datar formulir menjadi bentuk yang disimpan di produk. */
  function rapikanDimensi(d) {
    var out = Object.assign({}, d);
    var berat = Number(d.beratGram) || 0;
    var p = Number(d.dimP) || 0, l = Number(d.dimL) || 0, t = Number(d.dimT) || 0;
    out.beratGram = berat > 0 ? Math.round(berat) : null;
    out.dimensi = (p && l && t) ? { p: p, l: l, t: t } : null;
    delete out.dimP; delete out.dimL; delete out.dimT;
    return out;
  }

  /* ================================================================ PELACAKAN */
  /** Dialog riwayat perjalanan paket — dipakai klien maupun penjual. */
  function dialogLacak(shopOrderId) {
    var so = DB.find('shopOrders', shopOrderId);
    if (!so) return;

    UI.modal({
      title: T('Lacak paket'), sub: so.no, size: 'narrow',
      body: '<div id="lacak-isi"><div class="tbl-sub">⏳ ' + T('Mengambil riwayat…') + '</div></div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      onMount: function (back) {
        KIRIM.lacak(shopOrderId).then(function (h) {
          var box = back.querySelector('#lacak-isi');
          if (!box) return;
          box.innerHTML =
            '<div class="kv" style="grid-template-columns:110px 1fr">' +
              '<dt>' + T('Kurir') + '</dt><dd>' + U.esc(so.kurir || '—') + '</dd>' +
              '<dt>' + T('No. resi') + '</dt><dd><span class="code">' + U.esc(so.resi || '—') + '</span></dd>' +
              '<dt>' + T('Status') + '</dt><dd>' + UI.statusChip('shop', so.status) + '</dd>' +
            '</div>' +
            (h.simulasi ? UI.alert('warn', T('Riwayat di bawah disusun aplikasi dari cap waktu ' +
              'pesanan — bukan data kurir sungguhan.'), '🧪') : '') +
            (h.galat ? UI.alert('danger', U.esc(h.galat), '⛔') : '') +
            (h.riwayat.length
              ? '<div class="timeline mt-3">' + h.riwayat.slice().reverse().map(function (r) {
                  return '<div class="tl-item"><b>' + U.esc(r.judul) + '</b>' +
                    '<small>' + (r.at ? U.tglJam(r.at) : '') +
                    (r.ket ? ' — ' + U.esc(r.ket) : '') + '</small></div>';
                }).join('') + '</div>'
              : '<div class="tbl-sub mt-3">' + T('Belum ada riwayat perjalanan.') + '</div>');
        });
      }
    });
  }

  var pagesAdmin = {
    setelanKirim: {
      label: 'Pengaturan Pengiriman', icon: '🚚', grup: 'Sistem',
      sub: 'Biteship — tarif kurir, pesanan kirim, dan pelacakan',
      render: render, mount: aksi
    }
  };

  return { pagesAdmin: pagesAdmin, dialogLacak: dialogLacak, render: render,
    introDimensi: introDimensi, pasangHitungDimensi: pasangHitungDimensi,
    validasiDimensi: validasiDimensi, rapikanDimensi: rapikanDimensi };
})();
