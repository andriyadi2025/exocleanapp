/* ==========================================================================
   views/dwi.js — layar layanan Darmawisata
   --------------------------------------------------------------------------
   DUA LAYAR, DUA PEMBACA

     Klien  — "Bayar & Isi Ulang": tagihan (PLN, BPJS, PDAM, …) dan pulsa.
     Admin  — "Darmawisata": mode sambungan, saldo deposit, dan rumpun mana
              yang ditayangkan.

   YANG PALING MENENTUKAN BENTUK LAYAR INI: SETIAP HASIL PUNYA SUMBER

   Data di sini bisa datang dari tiga tempat yang sangat berbeda — Darmawisata
   sungguhan, contoh bawaan aplikasi, atau daftar cadangan ketika backend
   tidak bisa dihubungi. Ketiganya terlihat sama persis kalau tidak sengaja
   dibedakan, dan orang akan membayar tagihan berdasarkan angka yang dikarang
   aplikasi. Karena itu tiap daftar membawa lencana sumbernya, dan tombol yang
   memindahkan uang tidak pernah aktif di luar mode live.

   YANG SENGAJA BELUM ADA: TOMBOL BAYAR YANG BEKERJA
   /PPOB/Payment dan /TopUp/Order memotong deposit perusahaan. Keduanya masih
   ditolak server kita sampai ada catatan transaksi dan kunci idempotensi.
   Tombolnya tetap digambar — tetapi mati, dengan sebab yang tertulis. Layar
   yang menyembunyikan tombolnya membuat orang mengira fiturnya tidak ada;
   yang menampilkannya sebagai hidup membuat orang mengira aplikasinya rusak.
   ========================================================================== */
var ViewDWI = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  /* ---- keadaan layar klien ---- */
  var tab = 'ppob';            /* ppob | topup */
  var grupPilih = '';          /* grup PPOB yang sedang dibuka */
  var produkPilih = null;      /* produk PPOB yang sedang dipilih */
  var jenisPilih = '';         /* jenis TopUp */
  var penyediaPilih = '';      /* penyedia TopUp */
  var tagihan = null;          /* hasil inquiry terakhir */
  var memuat = false;
  /* Isian disimpan di sini, bukan dibaca dari DOM saat menggambar.
     Halaman ini digambar ulang setiap kali hasil API tiba, dan kolom yang
     nilainya hanya hidup di DOM akan kosong lagi tepat setelah pengguna
     menekan Cek Tagihan — mereka harus mengetik nomor pelanggan dua kali
     tanpa pernah tahu kenapa. */
  var isian = { cust: '', hp: '' };
  var hasilBayar = null;       /* hasil transaksi terakhir, apa pun keadaannya */
  var sedangBayar = false;

  /* Isi daftar yang sedang tergambar. Disimpan di modul, bukan diambil ulang
     tiap render: render dipanggil berkali-kali (ganti tab, ganti bahasa,
     refresh), dan memanggil API pada tiap gambar berarti membebani sambungan
     mereka untuk data yang tidak berubah. */
  var isi = { grup: null, produk: null, jenis: null, penyedia: null, produkTop: null,
              izin: null, operator: null, rute: null };
  var rumpunPilih = '';        /* rumpun perjalanan yang sedang dibuka */
  var operatorPilih = null;    /* maskapai / kereta / PO bus yang dipilih */

  function lencanaSumber(sumber) {
    if (sumber === 'live') return '';
    var peta = {
      simulasi: { k: 'chip--warn', t: T('Contoh aplikasi') },
      cadangan: { k: 'chip--danger', t: T('Backend tidak terhubung') }
    };
    var m = peta[sumber];
    return m ? '<span class="chip ' + m.k + ' chip--xs">' + m.t + '</span>' : '';
  }

  /* Satu tempat untuk seluruh pesan "kenapa tombolnya mati". Kalau tersebar,
     salah satunya pasti tertinggal ketika jalurnya nanti dibuka. */
  function sebabTerkunci() {
    if (DWI.modeSimulasi()) return T('Aktifkan mode live di Pengaturan → Darmawisata.');
    if (!DWI.siap()) return T('Backend Darmawisata belum terhubung.');
    return '';
  }
  function bolehBayar() { return !sebabTerkunci(); }

  /**
   * Penjelasan hasil transaksi.
   *
   * "ragu" dan "berjalan" TIDAK diberi tombol coba lagi. Itu disengaja:
   * mengulang sesuatu yang mungkin sudah berhasil sama saja dengan membayar
   * dua kali, dan tombol yang tersedia akan ditekan. Yang ditawarkan hanya
   * memeriksa catatannya.
   */
  function kotakHasil() {
    if (!hasilBayar) return '';
    var h = hasilBayar;
    if (h.ok) {
      var d = h.data || {};
      return UI.alert('ok', '<b>' + T('Transaksi berhasil') + '</b>' +
        (d.transactionID ? '<br>' + T('Nomor transaksi') + ': <code>' + U.esc(d.transactionID) + '</code>' : '') +
        (h.diulang ? '<br><span class="tbl-sub">' +
          T('Ini jawaban transaksi yang sama yang sudah pernah dijalankan — tidak ada pembayaran kedua.') +
          '</span>' : ''), '✅');
    }
    if (h.keadaan === 'tertunda') {
      /* Bukan berhasil, bukan pula ditolak. Nadanya sengaja tidak merah:
         yang terjadi adalah transaksi yang SEDANG diproses, dan menyebutnya
         gagal akan mendorong orang membayar untuk kedua kalinya. */
      return UI.alert('warn', '<b>' + T('Transaksi sedang diproses penyedia.') + '</b><br>' +
        U.esc(h.pesan) +
        (h.penanda ? '<br>' + T('Nomor rujukan') + ': <code>' + U.esc(h.penanda) + '</code>' : '') +
        '<br><span class="tbl-sub">' +
        T('Jangan diulang — pembayaran kedua tidak akan tertahan oleh apa pun selain ini. ' +
          'Tekan Periksa status untuk menanyakannya.') + '</span>' +
        (h.kunci ? '<div class="mt-2"><button class="btn btn--sm" data-act="dwi-cocok" ' +
          'data-kunci="' + U.esc(h.kunci) + '">' + T('Periksa status') + '</button></div>' : ''),
        '⏳');
    }
    if (h.keadaan === 'ragu') {
      return UI.alert('danger', '<b>' + T('Status transaksi belum pasti.') + '</b><br>' +
        U.esc(h.pesan) + '<br><span class="tbl-sub">' +
        T('Jangan diulang. Cocokkan dulu di riwayat transaksi Darmawisata — mengulang bisa berarti membayar dua kali.') +
        '</span>', '⚠️');
    }
    if (h.keadaan === 'berjalan') {
      return UI.alert('warn', U.esc(h.pesan), '⏳');
    }
    return UI.alert('warn', '<b>' + T('Transaksi ditolak') + '</b><br>' + U.esc(h.pesan), '❌');
  }

  /* ==================================================== KLIEN: BAYAR & ISI ULANG */
  function render() {
    return '<div class="dwi">' +
      UI.alert('brand',
        '<b>' + T('Bayar tagihan dan isi pulsa langsung dari EXOCLEAN.') + '</b> ' +
        T('Layanan disediakan Darmawisata Indonesia. Tagihan dicek ke penyedia ' +
          'aslinya sebelum dibayar, jadi angkanya bukan perkiraan.'), '🧾') +

      '<div class="tabs mt-2">' +
        '<button class="tab' + (tab === 'ppob' ? ' active' : '') + '" data-act="tab" data-t="ppob">🧾 ' +
          T('Bayar Tagihan') + '</button>' +
        '<button class="tab' + (tab === 'topup' ? ' active' : '') + '" data-act="tab" data-t="topup">📱 ' +
          T('Isi Ulang') + '</button>' +
        (DWI.aktif('travel')
          ? '<button class="tab' + (tab === 'travel' ? ' active' : '') + '" data-act="tab" data-t="travel">✈️ ' +
            T('Perjalanan') + '</button>' : '') +
      '</div>' +

      (tab === 'travel' ? panelTravel() : tab === 'topup' ? panelTopUp() : panelPPOB()) +
    '</div>';
  }

  function panelPPOB() {
    var g = isi.grup;
    return UI.card({
      title: T('Bayar Tagihan'),
      sub: T('Pilih jenis tagihan, lalu masukkan nomor pelanggan'),
      body:
        (!g ? '<div class="tbl-sub">' + T('Memuat daftar…') + '</div>'
          : !g.data.length ? UI.empty('🧾', T('Belum ada jenis tagihan'), g.catatan || '')
          : '<div class="dwi-chip">' + g.data.map(function (x) {
              return '<button type="button" class="dwi-pil' + (grupPilih === x ? ' on' : '') + '" ' +
                'data-act="grup" data-g="' + U.esc(x) + '">' + U.esc(x) + '</button>';
            }).join('') + '</div>' +
            (g.catatan ? '<div class="dwi-catat">' + lencanaSumber(g.sumber) + ' ' +
              U.esc(g.catatan) + '</div>' : '')) +

        (grupPilih ? daftarProdukPPOB() : '') +
        (produkPilih ? formTagihan() : '') +
        (tagihan ? kartuTagihan() : '')
    });
  }

  function daftarProdukPPOB() {
    var p = isi.produk;
    if (!p) return '<div class="tbl-sub mt-3">' + T('Memuat produk…') + '</div>';
    if (!p.data.length) {
      return '<div class="tbl-sub mt-3">' + T('Tidak ada produk pada grup ini.') + '</div>';
    }
    return '<div class="dwi-list mt-3">' + p.data.map(function (x) {
      var on = produkPilih && produkPilih.code === x.code;
      return '<button type="button" class="dwi-item' + (on ? ' on' : '') + '" ' +
          'data-act="produk" data-c="' + U.esc(x.code) + '">' +
        '<span class="dwi-item__isi"><b>' + U.esc(x.name) + '</b>' +
          '<small>' + U.esc(x.code) + (x.isOpenPayment ? ' · ' + T('nominal bebas') : '') + '</small></span>' +
        (x.isActive === false ? '<span class="chip chip--muted chip--xs">' + T('nonaktif') + '</span>' : '') +
      '</button>';
    }).join('') + '</div>';
  }

  function formTagihan() {
    return '<div class="dwi-form mt-3">' +
      '<div class="field"><label>' + T('Nomor pelanggan') + ' <span class="req">*</span></label>' +
        '<input class="input" id="dwi-cust" data-change="isi-cust" ' +
        'placeholder="' + T('mis. 512345678901') + '" value="' + U.esc(isian.cust) + '"></div>' +
      /* customerMSISDN ternyata WAJIB pada inquiry, meski swagger tidak
         menandainya begitu. Ketahuan hanya dengan memanggilnya: tanpa nomor
         ini balasannya "customerMSISDN invalid", bukan "tagihan tidak
         ditemukan" — dua hal yang akan membingungkan kalau kolomnya tidak ada. */
      '<div class="field"><label>' + T('Nomor HP pelanggan') + ' <span class="req">*</span></label>' +
        '<input class="input" id="dwi-msisdn" data-change="isi-hp" ' +
        'placeholder="081234567890" value="' + U.esc(isian.hp) + '"></div>' +
      '<button class="btn btn--block" data-act="cek"' + (memuat ? ' disabled' : '') + '>' +
        (memuat ? T('Mengecek…') : '🔍 ' + T('Cek Tagihan')) + '</button>' +
      (DWI.modeSimulasi()
        ? '<div class="dwi-catat mt-1">⚠️ ' +
          T('Mode simulasi — cek tagihan tidak dijalankan. Angka tagihan tidak boleh dikarang.') +
          '</div>' : '') +
    '</div>';
  }

  function kartuTagihan() {
    if (!tagihan.ok) {
      return '<div class="mt-3">' + UI.alert('warn', U.esc(tagihan.catatan || T('Tagihan tidak ditemukan')), '⚠️') + '</div>';
    }
    var t = tagihan.tagihan;
    function baris(l, v) {
      return '<div class="dwi-baris"><span>' + l + '</span><div class="spacer"></div><span>' + v + '</span></div>';
    }
    return '<div class="dwi-tagihan mt-3">' +
      '<div class="dwi-tagihan__nama">' + U.esc(t.customerName || '—') + '</div>' +
      '<div class="dwi-tagihan__id">' + U.esc(t.customerID || '') +
        (t.period ? ' · ' + U.esc(t.period) : '') + '</div>' +
      /* Bukan T('Tagihan'): kunci itu sudah dipakai sebagai nama menu dan
         diterjemahkan "Bills". Di sini yang dimaksud NOMINAL tagihannya. */
      baris(T('Nominal tagihan'), U.rp(t.billing || 0)) +
      (t.penalty ? baris(T('Denda'), U.rp(t.penalty)) : '') +
      baris(T('Biaya admin bank'), U.rp(t.adminBank || 0)) +
      '<div class="dwi-baris dwi-baris--total"><b>' + T('Total bayar') + '</b><div class="spacer"></div>' +
        '<b>' + U.rp(t.payment || 0) + '</b></div>' +
      (t.additionalMessage ? '<div class="dwi-catat">' + U.esc(t.additionalMessage) + '</div>' : '') +

      '<button class="btn btn--block btn--lg mt-2" data-act="bayar"' +
        (bolehBayar() && !sedangBayar ? '' : ' disabled') + '>' +
        (sedangBayar ? '⏳ ' + T('Memproses…') : '💳 ' + T('Bayar Sekarang')) + '</button>' +
      (bolehBayar()
        ? '<div class="dwi-kunci">' + T('Dana dipotong dari deposit EXOCLEAN di Darmawisata. ' +
            'Satu tagihan hanya bisa dibayar sekali — penekanan kedua tidak akan terkirim.') + '</div>'
        : '<div class="dwi-kunci">🔒 ' + sebabTerkunci() + '</div>') +
      (hasilBayar ? '<div class="mt-2">' + kotakHasil() + '</div>' : '') +
    '</div>';
  }

  /* ==================================================== KLIEN: ISI ULANG */
  function panelTopUp() {
    var j = isi.jenis;
    return UI.card({
      title: T('Isi Ulang'),
      sub: T('Pulsa, paket data, token listrik, dan voucher game'),
      body:
        (!j ? '<div class="tbl-sub">' + T('Memuat daftar…') + '</div>'
          : !j.data.length ? UI.empty('📱', T('Belum ada jenis produk'), j.catatan || '')
          : '<div class="dwi-chip">' + j.data.map(function (x) {
              return '<button type="button" class="dwi-pil' + (jenisPilih === x ? ' on' : '') + '" ' +
                'data-act="jenis" data-j="' + U.esc(x) + '">' + U.esc(x) + '</button>';
            }).join('') + '</div>' +
            (j.catatan ? '<div class="dwi-catat">' + lencanaSumber(j.sumber) + ' ' +
              U.esc(j.catatan) + '</div>' : '')) +

        (jenisPilih ? daftarPenyedia() : '') +
        (penyediaPilih ? daftarProdukTopUp() : '')
    });
  }

  function daftarPenyedia() {
    var p = isi.penyedia;
    if (!p) return '<div class="tbl-sub mt-3">' + T('Memuat penyedia…') + '</div>';
    if (!p.data.length) {
      return '<div class="tbl-sub mt-3">' + T('Tidak ada penyedia pada jenis ini.') + '</div>';
    }
    return '<div class="dwi-chip mt-3">' + p.data.map(function (x) {
      return '<button type="button" class="dwi-pil' + (penyediaPilih === x ? ' on' : '') + '" ' +
        'data-act="penyedia" data-p="' + U.esc(x) + '">' + U.esc(x) + '</button>';
    }).join('') + '</div>';
  }

  function daftarProdukTopUp() {
    var p = isi.produkTop;
    if (!p) return '<div class="tbl-sub mt-3">' + T('Memuat produk…') + '</div>';
    if (!p.data.length) {
      return '<div class="tbl-sub mt-3">' + T('Tidak ada produk pada penyedia ini.') + '</div>';
    }
    return '<div class="dwi-list mt-3">' + p.data.map(function (x) {
      return '<div class="dwi-item">' +
        '<span class="dwi-item__isi"><b>' + U.esc(x.name) + '</b>' +
          '<small>' + U.esc(x.code) + ' · ' + U.esc(x.type || '') + '</small></span>' +
        '<span class="dwi-item__rp">' + U.rp(x.price || 0) + '</span>' +
        '<button class="btn btn--soft btn--sm" data-act="beli" data-c="' + U.esc(x.code) + '"' +
          (bolehBayar() && !sedangBayar ? '' : ' disabled') + '>' + T('Beli') + '</button>' +
      '</div>';
    }).join('') + '</div>' +
      (bolehBayar()
        ? '<div class="dwi-form mt-3">' +
            '<div class="field"><label>' + T('Nomor tujuan') + ' <span class="req">*</span></label>' +
              '<input class="input" id="dwi-tujuan" data-change="isi-tujuan" ' +
              'placeholder="081234567890" value="' + U.esc(isian.hp) + '"></div>' +
            '<div class="dwi-kunci">' + T('Isi nomor tujuan lebih dulu, lalu tekan Beli pada produknya.') +
            '</div>' +
          '</div>'
        : '<div class="dwi-kunci">🔒 ' + sebabTerkunci() + '</div>') +
      (hasilBayar ? '<div class="mt-3">' + kotakHasil() + '</div>' : '');
  }

  /* ==================================================== KLIEN: PERJALANAN
     Enam dari sebelas rumpun berlisensi pada akun uji ini; sisanya dibalas
     "agent doesn't has access". Yang tidak berlisensi tetap DITAMPILKAN,
     tetapi mati dan dengan sebabnya — supaya jelas bahwa layanannya ada dan
     tinggal diminta ke Darmawisata, bukan bahwa aplikasinya tidak
     mendukungnya. */
  function panelTravel() {
    var z = isi.izin;
    return UI.card({
      title: T('Perjalanan'),
      sub: T('Pesawat, hotel, kereta, bus, dan kapal'),
      body:
        (!z ? '<div class="tbl-sub">' + T('Memeriksa layanan yang tersedia…') + '</div>'
          : '<div class="dwi-rumpun-grid">' + Object.keys(DWI.TRAVEL).map(function (k) {
              var m = DWI.TRAVEL[k], s = z[k] || {};
              return '<button type="button" class="dwi-kotak' +
                  (s.ok ? '' : ' dwi-kotak--mati') + (rumpunPilih === k ? ' on' : '') + '" ' +
                  'data-act="rumpun" data-r="' + k + '"' + (s.ok ? '' : ' disabled') + '>' +
                '<span class="dwi-kotak__ic">' + m.ic + '</span>' +
                '<span class="dwi-kotak__nama">' + U.esc(m.nama) + '</span>' +
                (s.ok ? '' : '<span class="dwi-kotak__ket">' + T('belum berlisensi') + '</span>') +
              '</button>';
            }).join('') + '</div>' +
            catatanLisensi(z)) +

        (rumpunPilih ? daftarOperator() : '') +
        (operatorPilih ? daftarRute() : '')
    });
  }

  function catatanLisensi(z) {
    var mati = Object.keys(DWI.TRAVEL).filter(function (k) { return !(z[k] || {}).ok; });
    if (!mati.length) return '';
    return '<div class="dwi-catat">' + T('Rumpun yang mati belum dibuka untuk akun agen ini. ' +
      'Itu keputusan kontrak di sisi Darmawisata, bukan batasan aplikasi — ' +
      'hubungi mereka untuk mengaktifkannya.') + '</div>';
  }

  function daftarOperator() {
    var o = isi.operator;
    var m = DWI.TRAVEL[rumpunPilih] || {};
    if (!o) return '<div class="tbl-sub mt-3">' + T('Memuat…') + '</div>';
    if (!o.data.length) {
      return '<div class="tbl-sub mt-3">' + T('Tidak ada data untuk layanan ini.') + '</div>';
    }
    /* Bentuk isinya berbeda-beda: maskapai punya {name,id}, kereta {name,ID},
       rute kapal hanya berupa daftar nama kota. Dirapikan di satu tempat,
       bukan di tiap cabang. */
    return '<div class="dwi-list mt-3">' + o.data.map(function (x) {
      var id = x.id || x.ID || x.code || '';
      var nama = x.name || x.nama || (typeof x === 'string' ? x : id);
      var bisaRute = !!id && ['airline', 'train', 'bus'].indexOf(rumpunPilih) >= 0;
      var on = operatorPilih && operatorPilih.id === id;
      return '<' + (bisaRute ? 'button type="button"' : 'div') +
          ' class="dwi-item' + (on ? ' on' : '') + '"' +
          (bisaRute ? ' data-act="operator" data-id="' + U.esc(id) + '" data-n="' + U.esc(nama) + '"' : '') + '>' +
        '<span class="dwi-item__isi"><b>' + U.esc(nama) + '</b>' +
          (id && id !== nama ? '<small>' + U.esc(id) + '</small>' : '') + '</span>' +
        (bisaRute ? '<span class="ck-chev">›</span>' : '') +
      '</' + (bisaRute ? 'button' : 'div') + '>';
    }).join('') + '</div>' +
      '<div class="dwi-catat">' + m.ic + ' ' + o.data.length + ' ' + T('data dari Darmawisata') + '</div>';
  }

  function daftarRute() {
    var r = isi.rute;
    if (!r) {
      return '<div class="tbl-sub mt-3">' + T('Memuat rute…') +
        (DWI.ruteBerat(rumpunPilih)
          ? ' ' + T('Daftar rute maskapai sangat besar — bisa sampai satu menit.')
          : '') + '</div>';
    }
    if (!r.data.length) {
      return '<div class="tbl-sub mt-3">' + T('Tidak ada rute untuk operator ini.') + '</div>';
    }
    return '<div class="dwi-rute mt-3">' +
      '<div class="dwi-rute__jd">' + U.esc(operatorPilih.nama) + ' — ' +
        r.data.length + ' ' + T('rute') + '</div>' +
      '<div class="dwi-rute__isi">' + r.data.slice(0, 60).map(function (x) {
        var a = x.originFull || x.originName || x.origin || '';
        var b = x.destinationFull || x.destinationName || x.destination || '';
        return '<div class="dwi-rute__baris">' + U.esc(a) + ' <span>→</span> ' + U.esc(b) + '</div>';
      }).join('') + '</div>' +
      (r.data.length > 60
        ? '<div class="dwi-catat">' + T('Ditampilkan 60 dari') + ' ' + r.data.length + ' ' +
          T('rute.') + '</div>' : '') +
      '<div class="dwi-kunci">🔒 ' + T('Pencarian jadwal dan pemesanan belum dibuka — ' +
        'jalur Booking dan Issued mengikat kursi pada pemasok yang sungguhan.') + '</div>' +
    '</div>';
  }

  /* ==================================================== PEMUATAN
     Tiap pemuatan menaruh hasilnya di `isi` lalu menggambar ulang. Dipisah
     dari render supaya render tetap murni — halaman yang memanggil API dari
     dalam fungsi gambarnya akan memanggilnya lagi pada tiap gambar ulang,
     dan itu berarti membebani sambungan mereka tanpa alasan. */
  function muatAwal() {
    if (tab === 'ppob' && !isi.grup) {
      DWI.grupPPOB().then(function (r) { isi.grup = r; APP.refresh(); });
    }
    if (tab === 'topup' && !isi.jenis) {
      DWI.jenisTopUp().then(function (r) { isi.jenis = r; APP.refresh(); });
    }
    if (tab === 'travel' && !isi.izin) {
      DWI.periksaTravel().then(function (r) { isi.izin = r; APP.refresh(); });
    }
  }

  function aksi(root) {
    muatAwal();
    U.delegate(root, {
      tab: function (el) {
        tab = el.getAttribute('data-t');
        APP.refresh();
      },
      grup: function (el) {
        grupPilih = el.getAttribute('data-g');
        produkPilih = null; tagihan = null; isi.produk = null;
        APP.refresh();
        DWI.produkPPOB(grupPilih).then(function (r) { isi.produk = r; APP.refresh(); });
      },
      produk: function (el) {
        var kode = el.getAttribute('data-c');
        produkPilih = (isi.produk.data || []).filter(function (x) { return x.code === kode; })[0] || null;
        tagihan = null;
        APP.refresh();
      },
      /* Menanyakan nasib transaksi yang belum final. TIDAK mengulang
         pembayarannya — hanya bertanya, lalu melaporkan apa adanya. */
      'dwi-cocok': function (el) {
        var kunci = el.getAttribute('data-kunci');
        UI.toast(T('Menanyakan status ke Darmawisata…'), 'info');
        DWI.cocokkan(kunci).then(function (r) {
          if (r.keadaan === 'selesai') {
            hasilBayar = { ok: true, keadaan: 'selesai', data: r.detail || {} };
            UI.toast(T('Transaksi terkonfirmasi berhasil.'), 'ok');
          } else if (r.keadaan === 'batal') {
            hasilBayar = { ok: false, keadaan: 'ditolak',
              pesan: T('Penyedia menyatakan transaksi ini gagal. Saldo kembali, pembelian boleh diulang.') };
            UI.toast(T('Transaksi gagal di sisi penyedia.'), 'warn');
          } else {
            UI.toast(r.pesan || T('Status akhir belum keluar.'), 'warn');
          }
          APP.refresh();
        });
      },
      bayar: function () {
        /* Penghalang di sisi klien, MENDAHULUI APP.refresh().
           Dua ketukan cepat terjadi dalam satu putaran peristiwa yang sama —
           tombolnya belum sempat digambar ulang sebagai nonaktif, jadi
           keduanya lolos. Server memang menolak yang kedua, tetapi menyerahkan
           seluruh pertahanan ke sana berarti setiap ketukan tak sengaja tetap
           menempuh perjalanan bolak-balik, dan layar menampilkan hasil yang
           mana pun kebetulan tiba belakangan. */
        if (sedangBayar) return;
        var ref = tagihan && tagihan.ok && tagihan.tagihan && tagihan.tagihan.billingReferenceID;
        if (!ref) {
          UI.toast(T('Cek tagihan dulu — nomor referensinya datang dari sana.'), 'err');
          return;
        }
        sedangBayar = true; hasilBayar = null; APP.refresh();
        DWI.bayarPPOB(ref).then(function (r) {
          sedangBayar = false; hasilBayar = r;
          /* Tagihan dibersihkan HANYA bila benar-benar berhasil. Pada keadaan
             ragu ia sengaja ditinggal di layar: nomor referensinya justru
             bahan yang dibutuhkan untuk mencocokkan nanti. */
          if (r.ok) tagihan = null;
          APP.refresh();
        });
      },
      beli: function (el) {
        if (sedangBayar) return;
        var tujuan = ((U.$('#dwi-tujuan') || {}).value || isian.hp || '').trim();
        if (!tujuan) { UI.toast(T('Isi nomor tujuan dulu'), 'err'); return; }
        isian.hp = tujuan;
        sedangBayar = true; hasilBayar = null; APP.refresh();
        DWI.pesanTopUp(tujuan, el.getAttribute('data-c'), 1).then(function (r) {
          sedangBayar = false; hasilBayar = r; APP.refresh();
        });
      },
      'isi-tujuan': function (el) { isian.hp = el.value; },
      'isi-cust': function (el) { isian.cust = el.value; },
      'isi-hp': function (el) { isian.hp = el.value; },
      cek: function () {
        /* Dibaca dari DOM dulu lalu disimpan: peristiwa change belum tentu
           sempat terkirim bila pengguna menekan tombol sambil kursor masih
           di dalam kolom. */
        var elCust = U.$('#dwi-cust'), elHp = U.$('#dwi-msisdn');
        if (elCust) isian.cust = elCust.value;
        if (elHp) isian.hp = elHp.value;
        if (!isian.cust.trim() || !isian.hp.trim()) {
          UI.toast(T('Nomor pelanggan dan nomor HP wajib diisi'), 'err');
          return;
        }
        memuat = true; tagihan = null; APP.refresh();
        DWI.cekTagihan(produkPilih.code, isian.cust.trim(), isian.hp.trim()).then(function (r) {
          memuat = false; tagihan = r; APP.refresh();
        });
      },
      rumpun: function (el) {
        rumpunPilih = el.getAttribute('data-r');
        operatorPilih = null; isi.operator = null; isi.rute = null;
        APP.refresh();
        DWI.operatorTravel(rumpunPilih).then(function (r) { isi.operator = r; APP.refresh(); });
      },
      operator: function (el) {
        operatorPilih = { id: el.getAttribute('data-id'), nama: el.getAttribute('data-n') };
        isi.rute = null;
        APP.refresh();
        DWI.ruteTravel(rumpunPilih, operatorPilih.id).then(function (r) { isi.rute = r; APP.refresh(); });
      },
      jenis: function (el) {
        jenisPilih = el.getAttribute('data-j');
        penyediaPilih = ''; isi.penyedia = null; isi.produkTop = null;
        APP.refresh();
        DWI.penyediaTopUp(jenisPilih).then(function (r) { isi.penyedia = r; APP.refresh(); });
      },
      penyedia: function (el) {
        penyediaPilih = el.getAttribute('data-p');
        isi.produkTop = null;
        APP.refresh();
        DWI.produkTopUp(jenisPilih, penyediaPilih).then(function (r) { isi.produkTop = r; APP.refresh(); });
      }
    });
  }

  /* ==================================================== ADMIN: PENGATURAN */
  var uji = null;
  var saldo = null;
  var catatan = null;

  function renderAdmin() {
    var c = DWI.config();
    var live = !DWI.modeSimulasi();

    return '<div>' +
      (live
        ? (DWI.siap()
            ? UI.alert('ok', '<b>' + T('Mode nyata aktif.') + '</b> ' +
                T('Permintaan diteruskan ke Darmawisata lewat backend Anda.'), '🔗')
            : UI.alert('warn', '<b>' + T('Mode live tanpa URL backend.') + '</b> ' +
                T('Isi alamat backend di bawah, atau kembalikan ke simulasi.'), '⚠️'))
        : UI.alert('info', '<b>' + T('Mode simulasi aktif.') + '</b> ' +
            T('Daftar produk dibuat aplikasi. Cek tagihan dan pembayaran tidak dijalankan — ' +
              'angka tagihan tidak boleh dikarang.'), 'ℹ️')) +

      UI.card({
        title: T('Sambungan'), sub: T('Darmawisata Indonesia — H2H API v2.1'),
        body:
          '<div class="field"><label>' + T('Mode') + '</label>' +
            '<select class="select" data-change="mode">' +
              '<option value="simulasi"' + (!live ? ' selected' : '') + '>' +
                T('Simulasi (tanpa backend)') + '</option>' +
              '<option value="live"' + (live ? ' selected' : '') + '>' +
                T('Nyata (butuh backend berjalan)') + '</option>' +
            '</select></div>' +

          '<div class="field"><label>' + T('URL backend') + '</label>' +
            '<input class="input" id="dwi-url" placeholder="http://localhost:4300" value="' +
            U.esc(c.backendUrl || '') + '">' +
            '<div class="hint">' +
              T('Server yang memegang password agen dan meneruskan permintaan ke Darmawisata') +
              ' — <code>npm run start:dwi</code></div></div>' +

          /* Kolom password sengaja TIDAK ADA di sini. Ia kunci ke saldo
             deposit perusahaan; satu-satunya tempatnya .env pada server. */
          UI.alert('warn', '<b>' + T('Password agen tidak pernah disimpan di sini.') + '</b> ' +
            T('Ia kunci ke saldo deposit perusahaan — tempatnya hanya berkas .env pada server. ' +
              'Yang dikirim ke Darmawisata pun bukan passwordnya, melainkan turunannya yang ' +
              'dihitung ulang setiap login.'), '🔒') +

          '<div class="row mt-2" style="gap:8px">' +
            '<button class="btn btn--ghost" data-act="simpan">' + T('Simpan') + '</button>' +
            '<button class="btn" data-act="uji">' + T('Uji koneksi') + '</button>' +
            '<button class="btn btn--ghost" data-act="saldo">' + T('Cek saldo deposit') + '</button>' +
          '</div>' +

          (uji ? '<div class="mt-2">' + UI.alert(uji.ok ? 'ok' : 'danger',
            U.esc(uji.pesan) + (uji.info
              ? '<div class="tbl-sub mt-1">' + U.esc(uji.info.base) + ' · ' +
                U.esc(uji.info.lingkungan) + ' · ' + T('jalur terbuka') + ': ' +
                uji.info.jalurTerbuka + '</div>' : ''),
            uji.ok ? '✅' : '❌') + '</div>' : '') +

          (saldo ? '<div class="mt-2">' + UI.alert(saldo.ok ? 'info' : 'warn',
            saldo.ok
              ? '<b>' + T('Saldo deposit agen') + ': ' + U.rp(saldo.saldo || 0) + '</b>' +
                (saldo.saldo ? '' : ' — ' + T('belum ada saldo, transaksi akan ditolak Darmawisata'))
              : U.esc(saldo.pesan), '💰') + '</div>' : '')
      }) +

      UI.card({
        title: T('Rumpun layanan'), sub: T('Mana yang ditayangkan kepada pengguna'),
        body: Object.keys(DWI.RUMPUN).map(function (k) {
          var r = DWI.RUMPUN[k];
          return '<label class="dwi-rumpun">' +
            '<input type="checkbox" data-change="rumpun" data-k="' + k + '"' +
              (c.layanan[k] ? ' checked' : '') + '>' +
            '<span class="dwi-rumpun__isi">' +
              '<b>' + r.ic + ' ' + U.esc(r.nama) + '</b>' +
              '<small>' + U.esc(r.contoh) + ' · ' + r.endpoint + ' endpoint</small>' +
            '</span></label>';
        }).join('') +
        UI.alert('info',
          T('Perjalanan sengaja dimatikan. Rumpun itu 121 endpoint dengan alur ' +
            'cari → booking → issued → batal, data penumpang, kursi, dan bagasi — ' +
            'sebuah produk tersendiri, bukan fitur tambahan.'), 'ℹ️')
      }) +

      UI.card({
        title: T('Catatan transaksi'),
        sub: T('Setiap panggilan yang memotong deposit, beserta nasibnya'),
        body:
          '<div class="row mb-2" style="gap:8px">' +
            '<button class="btn btn--ghost btn--sm" data-act="catatan">' + T('Muat catatan') + '</button>' +
          '</div>' +
          (!catatan ? '<div class="tbl-sub">' + T('Belum dimuat.') + '</div>'
            : !catatan.ok ? UI.alert('warn', U.esc(catatan.pesan), '⚠️')
            : (catatan.ragu
                ? UI.alert('danger', '<b>' + catatan.ragu + ' ' +
                    T('transaksi berakhir tanpa kepastian.') + '</b> ' +
                    T('Cocokkan satu per satu ke riwayat transaksi Darmawisata sebelum ' +
                      'dicoba lagi. Selama belum dicocokkan, aplikasi menolak mengulangnya — ' +
                      'dan itu memang yang seharusnya.'), '⚠️')
                : '') +
              (!catatan.daftar.length
                ? '<div class="tbl-sub">' + T('Belum ada transaksi yang memotong deposit.') + '</div>'
                : UI.table([
                    { h: T('Keadaan'), r: function (x) {
                        var w = { selesai: 'ok', berjalan: 'warn', tertunda: 'warn',
                    ragu: 'danger' }[x.keadaan] || 'muted';
                        return '<span class="chip chip--' + w + ' chip--xs">' + U.esc(x.keadaan) + '</span>'; } },
                    { h: T('Jalur'), r: function (x) { return '<code>' + U.esc(x.jalur || '') + '</code>'; } },
                    { h: T('Kunci'), r: function (x) { return '<code>' + U.esc(x.kunci) + '</code>'; } },
                    /* Bukan T('Mulai'): kunci itu sudah dipakai sebagai ajakan
                       ("Get started") di layar lain. Di sini artinya waktu. */
                    { h: T('Waktu mulai'), r: function (x) { return U.esc(String(x.mulai || '').slice(0, 19).replace('T', ' ')); } },
                    { h: T('Sebab'), r: function (x) { return U.esc(x.sebab || '—'); } }
                  ], catatan.daftar)))
      }) +

      UI.card({
        title: T('Bagaimana pembayaran ganda dicegah'), flush: true,
        body: '<div class="tbl-sub" style="padding:12px 14px;line-height:1.6">' +
          T('Setiap permintaan uang membawa kunci yang diturunkan dari MAKSUDNYA — ' +
            'nomor referensi tagihan untuk PPOB, gabungan nomor dan produk untuk TopUp — ' +
            'bukan angka acak per klik. Dua ketukan pada tagihan yang sama menghasilkan ' +
            'kunci yang sama, dan yang kedua tidak pernah sampai ke Darmawisata.') +
          '<br><br>' +
          T('Yang paling penting justru keadaan ketiga: panggilan yang putus sebelum ada ' +
            'jawaban. Uang mungkin sudah keluar, mungkin belum, dan tidak ada cara ' +
            'mengetahuinya dari sisi kita. Transaksi seperti itu ditandai ragu dan tidak ' +
            'pernah diulang otomatis — mengulang sesuatu yang mungkin sudah berhasil ' +
            'persis sama dengan membayar dua kali.') +
        '</div>'
      }) +
    '</div>';
  }

  function aksiAdmin(root) {
    U.delegate(root, {
      mode: function (el) { DWI.simpanConfig({ mode: el.value }); uji = null; saldo = null; APP.refresh(); },
      rumpun: function (el) {
        var patch = {}; patch[el.getAttribute('data-k')] = el.checked;
        DWI.simpanConfig({ layanan: patch });
        APP.refresh();
      },
      simpan: function () {
        DWI.simpanConfig({ backendUrl: ((U.$('#dwi-url') || {}).value || '').trim() });
        UI.toast(T('Setelan disimpan'), 'ok');
        APP.refresh();
      },
      uji: function () {
        DWI.simpanConfig({ backendUrl: ((U.$('#dwi-url') || {}).value || '').trim() });
        uji = { ok: false, pesan: T('Menghubungi backend…') }; APP.refresh();
        DWI.ujiKoneksi().then(function (r) { uji = r; APP.refresh(); });
      },
      catatan: function () {
        catatan = { ok: false, pesan: T('Membaca catatan…'), daftar: [], ragu: 0 }; APP.refresh();
        DWI.transaksi().then(function (r) { catatan = r; APP.refresh(); });
      },
      saldo: function () {
        saldo = { ok: false, pesan: T('Membaca saldo…') }; APP.refresh();
        DWI.saldoAgen().then(function (r) { saldo = r; APP.refresh(); });
      }
    });
  }

  var pagesClient = {
    tagihan: {
      label: 'Bayar & Isi Ulang', icon: '🧾', grup: 'Utama',
      sub: 'Tagihan, pulsa, dan token listrik',
      render: render, mount: aksi
    }
  };

  var pagesAdmin = {
    setelanDWI: {
      label: 'Darmawisata', icon: '🧾', grup: 'Sistem',
      sub: 'PPOB, TopUp, dan perjalanan — sambungan H2H',
      render: renderAdmin, mount: aksiAdmin
    }
  };

  return { pagesClient: pagesClient, pagesAdmin: pagesAdmin, render: render, aksi: aksi };
})();
