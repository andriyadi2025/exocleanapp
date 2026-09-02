/* ==========================================================================
   views/keahlian.js — layar pemesanan jasa keahlian
   --------------------------------------------------------------------------
   Empat layar, empat sudut pandang yang berbeda atas satu pekerjaan:

     KLIEN    memilih kapan, di mana, masakan apa, dan SIAPA — lalu
              memasukkannya ke keranjang dan checkout.
     MITRA    menerima permintaan dengan TENGGAT yang berdetak di layar.
     ADMIN    mengatur tenggat, ongkos jalan, dan asuransi; serta melihat
              permintaan mana yang sedang menggantung.
     KATALOG  memperlihatkan tarif "mulai dari" yang sama dengan yang nanti
              benar-benar ditagih.

   PENGHITUNG WAKTU YANG JUJUR

   Tenggat tidak boleh hidup hanya selama seseorang menonton layarnya. Detak
   di layar hanyalah tampilan; yang menentukan gugur atau tidak adalah
   `batasAt` yang tersimpan di pesanan, diperiksa ulang setiap kali ada yang
   membuka aplikasi. Mitra yang menutup ponselnya tetap kehilangan tenggatnya,
   dan klien yang menunggu di perangkat lain tetap melihatnya gugur.
   ========================================================================== */
var ViewKeahlian = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };
  var LANGKAH = ['waktu', 'lokasi', 'masakan', 'mitra', 'ringkas'];
  var JUDUL = ['Waktu', 'Lokasi', 'Masakan', 'Pilih Mitra', 'Ringkasan'];
  var DURASI = [2, 3, 4, 5, 6, 8, 10, 12];

  /* utils tidak punya keduanya; ditulis di sini daripada menambah API global
     untuk dua pemakaian. */
  function dua(n) { n = Math.max(0, Math.round(n || 0)); return (n < 10 ? '0' : '') + n; }
  function satu(n) { return (Math.round((n || 0) * 10) / 10).toString().replace('.', ','); }
  function mmss(d) { return dua(Math.floor(d / 60)) + ':' + dua(d % 60); }

  /* Bahasa Indonesia tidak membedakan tunggal dan jamak; Inggris membedakan.
     Merangkai angka dengan kata benda lepas menghasilkan "1 partners" —
     cacat yang hanya muncul kalau angkanya kebetulan satu, jadi mudah lolos
     dari pengujian. Dua kunci utuh, bukan potongan yang disambung. */
  function jml(n, satu, banyak) {
    return n === 1 ? T(satu) : T(banyak).replace('{n}', U.num(n));
  }

  var P = null;          /* draf pemesanan yang sedang disusun */
  var detak = null;      /* satu-satunya penghitung yang berjalan */

  /* ================================================================ DRAF */

  function kosong(serviceId) {
    var u = APP.user;
    var a = u ? BIZ.alamatUtama(u) : null;
    return {
      serviceId: serviceId, langkah: 0,
      tgl: '', mulai: '09:00', durasi: 4,
      alamat: a ? BIZ.alamatTeks(a) : '',
      alamatId: a ? a.id : null,
      koordinat: a && window.MAPS && MAPS.valid(a.koordinat) ? a.koordinat : null,
      kontak: { nama: u ? u.nama : '', telp: u ? (u.telp || '') : '' },
      porsi: {},              /* menuId → jumlah porsi */
      negara: null,           /* negara yang sedang dibuka di langkah masakan */
      catatan: '',
      workerId: null
    };
  }

  function svc() { return P ? BIZ.svc(P.serviceId) : null; }

  function jamSelesai() {
    if (!P || !P.mulai) return '';
    var p = P.mulai.split(':');
    var m = (+p[0]) * 60 + (+p[1]) + P.durasi * 60;
    var h = Math.floor(m / 60), mm = m % 60;
    /* Melewati tengah malam dipatok ke 23:59: satu pekerjaan yang menyeberang
       hari membuat jadwal, bentrok, dan absensi menunjuk tanggal yang berbeda. */
    if (h >= 24) { h = 23; mm = 59; }
    return dua(h) + ':' + dua(mm);
  }

  function itemsDraf() {
    return Object.keys(P.porsi).map(function (id) {
      return { menuId: id, porsi: P.porsi[id] };
    }).filter(function (x) { return x.porsi > 0; });
  }

  function hitungDraf() {
    return KEAHLIAN.hitung({
      serviceId: P.serviceId, items: itemsDraf(),
      workerId: P.workerId, koordinat: P.koordinat
    });
  }

  /**
   * Penanda satu masakan: halal, pedas, alergen.
   *
   * Ditampilkan di tempat klien MEMILIH, bukan hanya di rincian setelah
   * memesan. Alergi kacang bisa berakibat fatal; memberitahukannya setelah
   * orang menekan checkout bukan pemberitahuan, melainkan catatan.
   */
  function penandaMasakan(m, ringkas) {
    var out = [];
    if (m.halal === false) {
      out.push('<span class="kh-tag2 kh-tag2--awas">' + T('non-halal') + '</span>');
    }
    var p = KEAHLIAN.pedas(m.pedas);
    if (p.kode !== 'tidak') {
      out.push('<span class="kh-tag2">' + p.ikon + (ringkas ? '' : ' ' + U.esc(T(p.nama))) + '</span>');
    }
    (m.alergen || []).forEach(function (a) {
      out.push('<span class="kh-tag2 kh-tag2--alg">' + U.esc(T(KEAHLIAN.alergenNama(a))) + '</span>');
    });
    return out.length ? '<div class="kh-tag2s">' + out.join('') + '</div>' : '';
  }

  /* ============================================================ ALUR KLIEN */

  function renderPesan(params) {
    var id = (params && params.id) || (P && P.serviceId);
    var s = id ? BIZ.svc(id) : null;

    if (!KEAHLIAN.adalah(s)) {
      return UI.empty('👨‍🍳', T('Layanan keahlian tidak ditemukan'),
        T('Kembali ke katalog untuk memilih layanan.')) +
        '<div class="row mt-3"><div class="spacer"></div>' +
        '<button class="btn" data-act="kh-katalog">' + T('Buka katalog layanan') + '</button>' +
        '<div class="spacer"></div></div>';
    }
    if (s.aktif === false || !KEAHLIAN.menu(s).length) {
      return UI.empty('🚫', T('Sedang tidak ditawarkan'),
        T('Layanan ini sementara ditutup. Silakan pilih layanan lain.'));
    }

    if (!P || P.serviceId !== id) P = kosong(id);
    var h = hitungDraf();
    var n = KJASA.jumlah(APP.user.id);

    return '<div class="kh">' +
      '<div class="kh__kepala">' +
        '<button class="btn btn--ghost btn--sm" data-act="kh-keluar">‹ ' + T('Batal') + '</button>' +
        '<b>' + U.ikon(s.icon) + ' ' + U.esc(s.nama) + '</b>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--ghost btn--sm" data-act="kh-keranjang">🛒 ' +
          (n ? '<span class="kh__n">' + n + '</span>' : '') + '</button>' +
      '</div>' +

      '<div class="kh__lang">' + LANGKAH.map(function (k, i) {
        return '<div class="kh-l' + (i === P.langkah ? ' aktif' : '') +
          (i < P.langkah ? ' lewat' : '') + '">' +
          '<span>' + (i < P.langkah ? '✓' : (i + 1)) + '</span>' +
          '<i>' + T(JUDUL[i]) + '</i></div>';
      }).join('') + '</div>' +

      '<div class="kh__isi">' + isiLangkah(s, h) + '</div>' +

      '<div class="kh__bilah">' +
        '<div><div class="kh__bl">' + T('Perkiraan') + '</div>' +
          '<div class="kh__brp">' + U.rp(h.sah ? h.total : 0) + '</div>' +
          '<div class="kh__bk">' +
            (!h.sah
              ? T('Pilih masakan dan porsinya untuk melihat harga')
              : (h.transportBelumPasti
                  ? T('Belum termasuk ongkos jalan — muncul setelah mitra dipilih')
                  : T('Sudah termasuk ongkos jalan, asuransi, dan biaya layanan'))) +
          '</div>' +
        '</div><div class="spacer"></div>' +
        tombolLangkah(s, h) +
      '</div>' +
    '</div>';
  }

  function tombolLangkah(s, h) {
    if (P.langkah < LANGKAH.length - 1) {
      return (P.langkah > 0
        ? '<button class="btn btn--ghost" data-act="kh-mundur">' + T('Kembali') + '</button>'
        : '') +
        '<button class="btn btn--primary" data-act="kh-maju">' + T('Lanjut') + ' ›</button>';
    }
    return '<button class="btn btn--ghost" data-act="kh-mundur">' + T('Kembali') + '</button>' +
      '<button class="btn btn--primary"' + (h.sah ? '' : ' disabled') +
        ' data-act="kh-ke-keranjang">🛒 ' + T('Masukkan ke Keranjang') + '</button>';
  }

  function isiLangkah(s, h) {
    switch (LANGKAH[P.langkah]) {
      case 'waktu':   return langkahWaktu(s);
      case 'lokasi':  return langkahLokasi(s);
      case 'masakan': return langkahMasakan(s, h);
      case 'mitra':   return langkahMitra(s);
      default:        return langkahRingkas(s, h);
    }
  }

  /* ---- 1. tanggal & jam pelaksanaan ---- */
  function langkahWaktu(s) {
    var hariIni = U.today();
    var jam = [];
    for (var i = 5; i <= 20; i++) jam.push(dua(i) + ':00');

    return peringatanBawaan(s) +
      UI.card({ title: T('Tanggal pelaksanaan'), body:
        '<input class="input" type="date" min="' + hariIni + '" value="' + U.esc(P.tgl) + '" ' +
          'data-change="kh-tgl">' +
        '<div class="tbl-sub mt-1">' + T('Pilih tanggal acara memasak.') + '</div>' }) +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Jam pelaksanaan'), body:
        '<div class="kh-2">' +
          '<label class="kh-f"><span>' + T('Jam mulai') + '</span>' +
            '<select class="select" data-change="kh-mulai">' + jam.map(function (j) {
              return '<option value="' + j + '"' + (P.mulai === j ? ' selected' : '') + '>' + j + '</option>';
            }).join('') + '</select></label>' +
          '<label class="kh-f"><span>' + T('Lama bekerja') + '</span>' +
            '<select class="select" data-change="kh-durasi">' + DURASI.map(function (d) {
              return '<option value="' + d + '"' + (P.durasi === d ? ' selected' : '') + '>' +
                d + ' ' + T('jam') + '</option>';
            }).join('') + '</select></label>' +
        '</div>' +
        '<div class="tbl-sub mt-2">' + T('Selesai sekitar') + ' <b>' + jamSelesai() + '</b>. ' +
          T('Waktu ini dipakai untuk memeriksa mitra mana yang kosong.') + '</div>' });
  }

  /* Peringatan yang harus dilewati, bukan keterangan yang mudah terlewat. */
  function peringatanBawaan(s) {
    var k = s.keahlian || {};
    if (k.bawaAlat !== false) return '';
    return UI.alert('warn', '<b>' + T('Mitra tidak membawa peralatan apa pun.') + '</b> ' +
      U.esc(k.catatanBawaan || ''), '🍳') + '<div class="mb-3"></div>';
  }

  /* ---- 2. alamat pelaksanaan ---- */
  function langkahLokasi(s) {
    var daftar = BIZ.alamatList(APP.user);
    var bertitik = window.MAPS && MAPS.valid(P.koordinat);

    return UI.card({ title: T('Kontak di lokasi'), body:
      '<div class="kh-2">' +
        '<label class="kh-f"><span>' + T('Nama') + '</span>' +
          '<input class="input" data-change="kh-nama" value="' + U.esc(P.kontak.nama) + '"></label>' +
        '<label class="kh-f"><span>' + T('Nomor HP') + '</span>' +
          '<input class="input" data-change="kh-telp" value="' + U.esc(P.kontak.telp) + '"></label>' +
      '</div>' }) +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Alamat pelaksanaan'),
        sub: T('Tempat mitra akan memasak'),
        body:
        (daftar.length
          ? '<div class="kh-adr">' + daftar.map(function (a) {
              return '<button type="button" class="kh-adr__b' + (P.alamatId === a.id ? ' on' : '') +
                '" data-act="kh-alamat" data-id="' + U.esc(a.id) + '">' +
                '<b>' + U.esc(a.label || T('Alamat')) + '</b>' +
                '<span>' + U.esc(BIZ.alamatTeks(a)) + '</span>' +
                (window.MAPS && MAPS.valid(a.koordinat) ? '<i>📍 ' + T('bertitik') + '</i>'
                                                        : '<i class="kh-adr__no">' + T('belum bertitik') + '</i>') +
              '</button>';
            }).join('') + '</div><div class="mb-2"></div>'
          : '') +
        '<label class="kh-f"><span>' + T('Alamat lengkap') + '</span>' +
          '<textarea class="input" rows="2" data-change="kh-alamat-teks">' + U.esc(P.alamat) + '</textarea></label>' +

        /* Titik peta WAJIB di sini — bukan pemanis. Ongkos jalan mitra
           dihitung dari koordinat ini, dan tanpa koordinat satu-satunya
           alternatif adalah menebak jaraknya. */
        '<div class="kh-titik mt-2">' +
          (bertitik
            ? '<span class="chip chip--ok">📍 ' + U.esc(MAPS.teksKoordinat(P.koordinat)) + '</span>'
            : '<span class="chip chip--danger">' + T('Titik lokasi belum ditandai') + '</span>') +
          '<button class="btn btn--ghost btn--sm" data-act="kh-titik">' +
            (bertitik ? T('Ubah titik') : T('Tandai di peta')) + '</button>' +
        '</div>' +
        (bertitik ? '' :
          '<div class="tbl-sub mt-1">' +
            T('Ongkos jalan mitra dihitung dari titik ini ke rumahnya. Tanpa titik, biayanya tidak bisa dipastikan.') +
          '</div>') });
  }

  /* ---- 3. negara asal → nama masakan (centang) → jumlah porsi ----
     Dua tingkat, bukan satu daftar panjang. Empat puluh enam nama masakan
     yang berderet tanpa pengelompokan adalah daftar yang digulir sekali lalu
     ditinggalkan; orang memilih makanan dengan bertanya "mau makan apa
     malam ini" — dan jawabannya hampir selalu dimulai dari masakan mana. */
  function langkahMasakan(s, h) {
    var grup = KEAHLIAN.perNegara(s);
    if (!grup.length) {
      return UI.empty('🍽️', T('Belum ada daftar masakan'),
        T('Admin belum mengisi menu untuk layanan ini.'));
    }

    /* Negara yang dibuka: pilihan klien, atau negara pertama yang sudah
       punya masakan tercentang, atau yang pertama di daftar. */
    var aktif = null;
    grup.forEach(function (g) {
      if (!aktif && P.negara === g.negara) aktif = g;
    });
    if (!aktif) {
      grup.forEach(function (g) {
        if (!aktif && g.masakan.some(function (m) { return P.porsi[m.id]; })) aktif = g;
      });
    }
    if (!aktif) aktif = grup[0];

    function jumlahTercentang(g) {
      return g.masakan.filter(function (m) { return P.porsi[m.id]; }).length;
    }

    /* Seluruh masakan yang sudah dicentang, dari negara mana pun. Tanpa ini,
       berpindah negara membuat pilihan sebelumnya seolah hilang — dan klien
       mencentangnya lagi, atau mengira pesanannya batal. */
    var dipilih = [];
    grup.forEach(function (g) {
      g.perHidangan.forEach(function (kel) {
        kel.masakan.forEach(function (m) {
          if (P.porsi[m.id]) dipilih.push({ g: g, kel: kel, m: m, porsi: P.porsi[m.id] });
        });
      });
    });

    return UI.card({ title: T('Asal masakan'),
      sub: T('Pilih negaranya dulu, lalu centang masakannya'),
      body: '<div class="kh-neg">' + grup.map(function (g) {
        var n = jumlahTercentang(g);
        return '<button type="button" class="kh-neg__b' + (g === aktif ? ' on' : '') + '" ' +
          'data-act="kh-negara" data-n="' + U.esc(g.negara) + '">' +
          '<span class="kh-neg__i">' + U.ikon(g.ikon) + '</span>' +
          '<span>' + U.esc(g.negara) + '</span>' +
          (n ? '<i class="kh-neg__n">' + n + '</i>' : '') +
        '</button>';
      }).join('') + '</div>' }) +

      '<div class="mb-3"></div>' +

      UI.card({ title: U.ikon(aktif.ikon) + ' ' + T('Masakan dari') + ' ' + U.esc(aktif.negara),
        sub: jml(aktif.masakan.length, T('1 nama masakan'), T('{n} nama masakan')),
        /* Dipecah per urutan hidangan — pembuka, utama, penutup. Judulnya
           bukan hiasan: ia memberi tahu klien bahwa ia boleh mengambil dari
           ketiganya, bukan memilih satu dari satu daftar panjang. */
        body: aktif.perHidangan.map(function (kel) {
          return '<div class="kh-hid">' + U.ikon(kel.hidangan.ikon) + ' ' +
            U.esc(T(kel.hidangan.nama)) +
            '<span>' + jml(kel.masakan.length, '1 pilihan', '{n} pilihan') + '</span></div>' +
          '<div class="kh-menu">' + kel.masakan.map(function (m) {
          var n = P.porsi[m.id] || 0;
          var min = m.minPorsi || 1;
          return '<div class="kh-m' + (n ? ' on' : '') + '">' +
            /* Centang, bukan angka yang harus dinaikkan dari nol: yang
               ditanyakan lebih dulu adalah "masakan ini dipesan atau tidak",
               dan jumlah porsinya baru sesudah itu. */
            '<label class="kh-cek">' +
              '<input type="checkbox"' + (n ? ' checked' : '') +
                ' data-change="kh-centang" data-id="' + U.esc(m.id) + '">' +
              '<span class="kh-cek__k"></span>' +
            '</label>' +
            (m.foto && DB.getPhoto(m.foto)
              ? '<img class="kh-m__f" src="' + U.esc(DB.getPhoto(m.foto)) + '" alt="">'
              : '') +
            '<div class="kh-m__t">' +
              '<b>' + U.esc(m.nama) + '</b>' +
              '<span>' + U.rp(m.tarif) + ' / ' + T('porsi') + ' · ' + T('min') + ' ' + min +
                ' · ' + U.ikon(KEAHLIAN.bahan(m.bahan).ikon) + ' ' + U.esc(T(KEAHLIAN.bahan(m.bahan).nama)) +
              '</span>' +
              (m.deskripsi ? '<span class="kh-m__d">' + U.esc(m.deskripsi) + '</span>' : '') +
              penandaMasakan(m) +
            '</div>' +
            (n
              ? '<div class="kh-m__n">' +
                  '<button class="kh-nb" data-act="kh-porsi" data-id="' + U.esc(m.id) + '" data-d="-1">−</button>' +
                  '<input class="input kh-ni" type="number" min="0" value="' + n + '" ' +
                    'data-change="kh-porsi-isi" data-id="' + U.esc(m.id) + '">' +
                  '<button class="kh-nb" data-act="kh-porsi" data-id="' + U.esc(m.id) + '" data-d="1">+</button>' +
                '</div>' +
                '<div class="kh-m__s">' + U.rp(m.tarif * n) + '</div>'
              : '<div class="kh-m__n kh-m__n--kosong">' + T('porsi') + '</div>') +
          '</div>';
        }).join('') + '</div>';
        }).join('') }) +

      '<div class="mb-3"></div>' +

      UI.card({ title: T('Sudah dipilih'),
        sub: dipilih.length
          ? jml(dipilih.length, '1 masakan', '{n} masakan') + ' · ' +
            jml(U.sum(dipilih, function (x) { return x.porsi; }), '1 porsi', '{n} porsi')
          : T('belum ada'),
        body: (dipilih.length
          ? '<div class="kh-pilih">' + dipilih.map(function (x) {
              return '<div class="kh-p">' +
                '<span class="kh-p__n">' + U.ikon(x.g.ikon) + ' ' + U.esc(x.m.nama) +
                  '<small>' + U.esc(x.g.negara) + ' · ' + U.esc(T(x.kel.hidangan.nama)) +
                    ((x.m.alergen || []).length
                      ? ' · ⚠️ ' + x.m.alergen.map(function (a) {
                          return U.esc(T(KEAHLIAN.alergenNama(a))); }).join(', ')
                      : '') +
                  '</small></span>' +
                '<span class="kh-p__q">' + x.porsi + ' × ' + U.rp(x.m.tarif) + '</span>' +
                '<b class="kh-p__s">' + U.rp(x.m.tarif * x.porsi) + '</b>' +
                '<button class="kh-nb" data-act="kh-buang" data-id="' + U.esc(x.m.id) + '">✕</button>' +
              '</div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub">' + T('Centang masakan di atas untuk menambahkannya.') + '</div>') +
        (h.sah === false && h.sebab
          ? '<div class="kh-sebab">⚠️ ' + U.esc(h.sebab) + '</div>' : '') +
        '<label class="kh-f mt-2"><span>' + T('Catatan untuk mitra') + '</span>' +
          '<textarea class="input" rows="3" data-change="kh-catatan" placeholder="' +
          U.esc(T('mis. tanpa MSG, alergi udang, tingkat pedas sedang, sajikan pukul 12.00')) + '">' +
          U.esc(P.catatan) + '</textarea></label>' });
  }

  /* ---- 4. pilih mitra (dengan foto) ---- */
  function langkahMitra(s) {
    var list = KEAHLIAN.mitraUntuk(s, P.tgl, P.mulai, jamSelesai(), P.koordinat);
    var bisa = list.filter(function (x) { return x.bisa; });
    var tidak = list.filter(function (x) { return !x.bisa; });

    if (!list.length) {
      return UI.empty('👤', T('Belum ada mitra bersertifikat'),
        T('Belum ada mitra yang tersertifikasi untuk layanan ini.'));
    }

    return UI.card({ title: T('Pilih mitra'),
      sub: jml(bisa.length, T('1 mitra kosong pada jam tersebut'), T('{n} mitra kosong pada jam tersebut')),
      body: (bisa.length
        ? '<div class="kh-mitra">' + bisa.map(kartuMitra).join('') + '</div>'
        : UI.empty('🗓️', T('Tidak ada mitra yang kosong'),
            T('Coba ubah tanggal atau jam pelaksanaannya.'))) }) +
      (tidak.length
        ? '<div class="mb-3"></div>' + UI.card({ title: T('Sedang tidak bisa'),
            sub: T('Ditampilkan supaya jelas alasannya'),
            body: '<div class="kh-mitra kh-mitra--mati">' + tidak.map(kartuMitra).join('') + '</div>' })
        : '');
  }

  function kartuMitra(m) {
    var nilai = m.nilai && m.nilai.n
      ? '⭐ ' + satu(m.nilai.rata) + ' <small>(' + m.nilai.n + ')</small>'
      : '<small class="kh-baru">' + T('Belum dinilai') + '</small>';
    return '<button type="button" class="kh-mt' + (P.workerId === m.id ? ' on' : '') +
      (m.bisa ? '' : ' mati') + '"' + (m.bisa ? '' : ' disabled') +
      ' data-act="kh-mitra" data-id="' + U.esc(m.id) + '">' +
      '<div class="kh-mt__f">' +
        (m.foto ? '<img src="' + U.esc(m.foto) + '" alt="">' : UI.avatar(m.nama)) +
        (P.workerId === m.id ? '<i class="kh-mt__c">✓</i>' : '') +
      '</div>' +
      '<div class="kh-mt__n">' + U.esc(m.nama) + '</div>' +
      '<div class="kh-mt__v">' + nilai + '</div>' +
      (m.bisa
        ? '<div class="kh-mt__j">' +
            (m.km === null ? T('jarak belum terhitung')
                           : '🛵 ' + satu(m.km) + ' km · ' + U.rpShort(m.transport)) +
          '</div>'
        : '<div class="kh-mt__s">' + U.esc(m.sebab) + '</div>') +
    '</button>';
  }

  /* ---- 5. ringkasan ---- */
  function langkahRingkas(s, h) {
    var m = P.workerId ? DB.find('users', P.workerId) : null;
    if (!h.sah) {
      return UI.alert('danger', U.esc(h.sebab || T('Pemesanan belum lengkap.')), '⚠️');
    }
    return peringatanBawaan(s) +
      UI.card({ title: T('Ringkasan pemesanan'), body:
        baris(T('Layanan'), U.ikon(s.icon) + ' ' + U.esc(s.nama)) +
        baris(T('Tanggal'), U.tglPanjang(P.tgl)) +
        baris(T('Jam'), P.mulai + ' – ' + jamSelesai() + ' (' + P.durasi + ' ' + T('jam') + ')') +
        baris(T('Lokasi'), U.esc(P.alamat)) +
        baris(T('Kontak'), U.esc(P.kontak.nama) + ' · ' + U.esc(P.kontak.telp)) +
        baris(T('Mitra'), m ? U.esc(m.nama) : '—') +
        (P.catatan ? baris(T('Catatan'), '<i>' + U.esc(P.catatan) + '</i>') : '') }) +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Rincian biaya'), body:
        h.baris.map(function (b) {
          return baris(U.ikon(b.ikon) + ' ' + U.esc(b.nama) + ' × ' + b.porsi, U.rp(b.subtotal));
        }).join('') +
        '<div class="kh-garis"></div>' +
        baris(T('Jasa memasak'), U.rp(h.jasa)) +
        baris('🛵 ' + T('Ongkos jalan') +
          (h.km !== null ? ' <small>(' + satu(h.km) + ' km' +
            (KEAHLIAN.config().transport.pulangPergi ? ', ' + T('pulang-pergi') : '') + ')</small>' : ''),
          U.rp(h.transport)) +
        baris('🛡️ ' + T('Asuransi kerja'), U.rp(h.asuransi)) +
        baris(T('Biaya layanan'), U.rp(h.biayaLayanan)) +
        '<div class="kh-garis"></div>' +
        baris('<b>' + T('Total') + '</b>', '<b class="kh-total">' + U.rp(h.total) + '</b>') }) +
      '<div class="mb-3"></div>' +
      UI.alert('info', T('Setelah checkout, mitra yang Anda pilih punya') + ' <b>' +
        detikTeks(KEAHLIAN.batasRespon(s)) + '</b> ' +
        T('untuk menerima atau menolak. Bila tidak dijawab, Anda bisa memilih mitra lain tanpa kehilangan pesanan ini.'),
        '⏱️');
  }

  function baris(label, nilai, cls) {
    return '<div class="kh-br' + (cls ? ' ' + cls : '') + '">' +
      '<div class="kh-br__l">' + label + '</div>' +
      '<div class="kh-br__n">' + nilai + '</div></div>';
  }

  function detikTeks(d) {
    if (d < 60) return jml(d, '1 detik', '{n} detik');
    return jml(Math.round(d / 60), '1 menit', '{n} menit');
  }

  /* ---- perpindahan langkah ---- */
  function periksaLangkah() {
    var s = svc();
    switch (LANGKAH[P.langkah]) {
      case 'waktu':
        if (!P.tgl) return T('Pilih tanggal pelaksanaan dulu.');
        if (P.tgl < U.today()) return T('Tanggal pelaksanaan sudah lewat.');
        return null;
      case 'lokasi':
        if (!String(P.alamat).trim()) return T('Alamat pelaksanaan belum diisi.');
        if (!P.kontak.nama || !P.kontak.telp) return T('Nama dan nomor HP kontak belum lengkap.');
        if (!window.MAPS || !MAPS.valid(P.koordinat)) {
          return T('Tandai titik lokasi di peta — ongkos jalan mitra dihitung dari sana.');
        }
        return null;
      case 'masakan':
        var h = hitungDraf();
        return h.sah ? null : h.sebab;
      case 'mitra':
        if (!P.workerId) return T('Pilih mitra yang akan mengerjakan.');
        return null;
      default: return null;
    }
  }

  function mountPesan(root) {
    U.delegate(root, {
      'kh-keluar':  function () { P = null; APP.go('transaksi'); },
      'kh-katalog': function () { APP.go('transaksi'); },
      'kh-keranjang': function () { APP.go('keranjangJasa'); },

      'kh-maju': function () {
        var sebab = periksaLangkah();
        if (sebab) { UI.toast(sebab, 'err'); return; }
        P.langkah = Math.min(LANGKAH.length - 1, P.langkah + 1);
        APP.refresh();
      },
      'kh-mundur': function () { P.langkah = Math.max(0, P.langkah - 1); APP.refresh(); },

      'kh-alamat': function (el) {
        var a = BIZ.alamatList(APP.user).filter(function (x) {
          return x.id === el.getAttribute('data-id'); })[0];
        if (!a) return;
        P.alamatId = a.id; P.alamat = BIZ.alamatTeks(a);
        P.koordinat = window.MAPS && MAPS.valid(a.koordinat) ? a.koordinat : null;
        APP.refresh();
      },
      'kh-titik': function () {
        if (!window.MAPS) { UI.toast(T('Peta tidak tersedia.'), 'err'); return; }
        MAPS.pilihTitik({ alamat: P.alamat, awal: P.koordinat }).then(function (hasil) {
          if (!hasil) return;
          P.koordinat = hasil.hapus ? null : hasil;
          /* Titik yang ditandai di sini disimpan juga ke alamat tersimpan,
             supaya pemesanan berikutnya tidak perlu menandai ulang. */
          if (!hasil.hapus && P.alamatId) {
            var list = BIZ.alamatList(APP.user).map(function (a) {
              return a.id === P.alamatId ? Object.assign({}, a, { koordinat: P.koordinat }) : a; });
            BIZ.simpanAlamat(APP.user.id, list);
          }
          APP.refresh();
        });
      },

      'kh-porsi': function (el) {
        var id = el.getAttribute('data-id');
        var d = +el.getAttribute('data-d');
        var m = KEAHLIAN.menuItem(svc(), id);
        var min = (m && m.minPorsi) || 1;
        var n = P.porsi[id] || 0;
        /* Dari nol, tombol + langsung melompat ke porsi minimum: menaikkan
           satu-satu sampai lima hanya untuk mendapat pesan "minimal 5" adalah
           pekerjaan yang tidak perlu dilakukan siapa pun. */
        if (d > 0) n = n === 0 ? min : n + 1;
        else n = n <= min ? 0 : n - 1;
        if (n) P.porsi[id] = n; else delete P.porsi[id];
        APP.refresh();
      },

      'kh-negara': function (el) {
        P.negara = el.getAttribute('data-n');
        APP.refresh();
      },

      'kh-buang': function (el) {
        delete P.porsi[el.getAttribute('data-id')];
        APP.refresh();
      },

      'kh-mitra': function (el) {
        P.workerId = el.getAttribute('data-id');
        APP.refresh();
      },

      'kh-ke-keranjang': function () {
        var r = KJASA.tambah(APP.user.id, {
          serviceId: P.serviceId, tgl: P.tgl, mulai: P.mulai, selesai: jamSelesai(),
          alamatId: P.alamatId, alamat: P.alamat, koordinat: P.koordinat,
          items: itemsDraf(), catatan: P.catatan, workerId: P.workerId,
          kontak: P.kontak
        });
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(T('Masuk ke keranjang'), 'ok');
        P = null;
        APP.go('keranjangJasa');
      },

      /* click, change, dan submit dibaca dari peta yang sama oleh U.delegate. */
      'kh-tgl':        function (el) { P.tgl = el.value; APP.refresh(); },
      'kh-mulai':      function (el) { P.mulai = el.value; APP.refresh(); },
      'kh-durasi':     function (el) { P.durasi = +el.value; APP.refresh(); },
      'kh-nama':       function (el) { P.kontak.nama = el.value; },
      'kh-telp':       function (el) { P.kontak.telp = el.value; },
      'kh-alamat-teks':function (el) { P.alamat = el.value; P.alamatId = null; },
      'kh-catatan':    function (el) { P.catatan = el.value; },
      /* Dicentang = langsung sejumlah porsi MINIMUM, bukan satu. Layanan ini
         memang tidak menerima di bawah minimumnya, jadi mengisi 1 lalu
         menolaknya hanya membuat orang menebak-nebak angka yang benar. */
      'kh-centang': function (el) {
        var id = el.getAttribute('data-id');
        if (el.checked) {
          var m = KEAHLIAN.menuItem(svc(), id);
          P.porsi[id] = (m && m.minPorsi) || 1;
        } else {
          delete P.porsi[id];
        }
        APP.refresh();
      },
      'kh-porsi-isi':  function (el) {
        var id = el.getAttribute('data-id');
        var n = Math.max(0, Math.round(+el.value || 0));
        if (n) P.porsi[id] = n; else delete P.porsi[id];
        APP.refresh();
      }
    });
  }

  /* ============================================================== KERANJANG */

  function renderKeranjang() {
    var r = KJASA.ringkas(APP.user.id);
    if (!r.baris.length) {
      return UI.empty('🛒', T('Keranjang jasa masih kosong'),
        T('Pilih layanan keahlian dari katalog untuk mulai memesan.')) +
        '<div class="row mt-3"><div class="spacer"></div>' +
        '<button class="btn" data-act="kj-katalog">' + T('Buka katalog layanan') + '</button>' +
        '<div class="spacer"></div></div>';
    }

    return (r.bermasalah
      ? UI.alert('warn', '<b>' + jml(r.bermasalah, T('1 baris belum bisa diproses.'),
            T('{n} baris belum bisa diproses.')) + '</b> ' +
          T('Perbaiki atau hapus dulu — baris lainnya tetap bisa di-checkout.'), '⚠️') +
        '<div class="mb-3"></div>'
      : '') +

      r.baris.map(kartuKeranjang).join('') +

      UI.card({ title: T('Ringkasan'), body:
        baris(T('Jasa'), U.rp(r.jasa)) +
        baris('🛵 ' + T('Ongkos jalan'), U.rp(r.transport)) +
        baris('🛡️ ' + T('Asuransi kerja'), U.rp(r.asuransi)) +
        baris(T('Biaya layanan'), U.rp(r.biayaLayanan)) +
        '<div class="kh-garis"></div>' +
        baris('<b>' + T('Total') + '</b> <small>(' +
          jml(r.siap, T('1 mitra'), T('{n} mitra')) + ', ' +
          jml(r.porsi, '1 porsi', '{n} porsi') + ')</small>',
          '<b class="kh-total">' + U.rp(r.total) + '</b>') +
        '<div class="row mt-3">' +
          '<button class="btn btn--ghost" data-act="kj-kosongkan">' + T('Kosongkan') + '</button>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn--primary btn--lg"' + (r.siap ? '' : ' disabled') +
            ' data-act="kj-checkout">' + T('Checkout') + ' · ' + U.rp(r.total) + '</button>' +
        '</div>' });
  }

  function kartuKeranjang(b) {
    var h = b.hitung;
    return UI.card({ cls: 'mb-3' + (b.siap ? '' : ' kj--masalah'),
      title: (b.layanan ? U.ikon(b.layanan.icon) + ' ' + U.esc(b.layanan.nama) : T('Layanan tidak ada')),
      sub: U.tglPanjang(b.tgl) + ' · ' + b.mulai + '–' + b.selesai,
      tools: '<button class="btn btn--ghost btn--sm" data-act="kj-hapus" data-id="' + b.id + '">🗑</button>',
      body:
        '<div class="kj-mitra">' +
          (b.mitra
            ? '<div class="kj-mitra__f">' + (b.mitra.foto
                ? '<img src="' + U.esc(b.mitra.foto) + '" alt="">'
                : UI.avatar(b.mitra.nama)) + '</div>' +
              '<div><b>' + U.esc(b.mitra.nama) + '</b>' +
              '<div class="tbl-sub">' + (h.km !== null
                ? '🛵 ' + satu(h.km) + ' km · ' + U.rp(h.transport) : T('jarak belum terhitung')) + '</div></div>'
            : '<div class="tbl-sub">' + T('Mitra belum dipilih') + '</div>') +
          '<div class="spacer"></div>' +
          '<button class="btn btn--ghost btn--sm" data-act="kj-ganti" data-id="' + b.id + '">' +
            T('Ganti mitra') + '</button>' +
        '</div>' +

        '<div class="kj-item">' + (h.baris || []).map(function (x) {
          return '<div class="kj-i">' +
            '<span>' + U.ikon(x.ikon) + ' ' + U.esc(x.nama) + '</span>' +
            '<div class="kh-m__n">' +
              '<button class="kh-nb" data-act="kj-porsi" data-id="' + b.id + '" ' +
                'data-m="' + U.esc(x.menuId) + '" data-d="-1">−</button>' +
              '<b class="kj-n">' + x.porsi + '</b>' +
              '<button class="kh-nb" data-act="kj-porsi" data-id="' + b.id + '" ' +
                'data-m="' + U.esc(x.menuId) + '" data-d="1">+</button>' +
            '</div>' +
            '<span class="kj-rp">' + U.rp(x.subtotal) + '</span>' +
          '</div>';
        }).join('') + '</div>' +

        '<div class="tbl-sub mt-1">📍 ' + U.esc(b.alamat) + '</div>' +
        (b.catatan ? '<div class="tbl-sub">📝 <i>' + U.esc(b.catatan) + '</i></div>' : '') +
        (b.siap
          ? '<div class="kj-total">' + T('Subtotal') + ' <b>' + U.rp(h.total) + '</b></div>'
          : '<div class="kh-sebab">⚠️ ' + U.esc(b.sebab) + '</div>') });
  }

  function mountKeranjang(root) {
    U.delegate(root, {
      'kj-katalog': function () { APP.go('transaksi'); },
      'kj-hapus': function (el) {
        KJASA.hapus(APP.user.id, el.getAttribute('data-id'));
        UI.toast(T('Dihapus dari keranjang'), 'ok'); APP.refresh();
      },
      'kj-kosongkan': function () {
        UI.konfirm({ title: T('Kosongkan keranjang?'),
          text: T('Seluruh pemesanan yang belum di-checkout akan hilang.'),
          okText: T('Ya, kosongkan'), danger: true }).then(function (ya) {
          if (!ya) return;
          KJASA.kosongkan(APP.user.id); APP.refresh();
        });
      },
      'kj-porsi': function (el) {
        var id = el.getAttribute('data-id'), m = el.getAttribute('data-m'), d = +el.getAttribute('data-d');
        var b = KJASA.isi(APP.user.id).filter(function (x) { return x.id === id; })[0];
        if (!b) return;
        var kini = (b.hitung.baris || []).filter(function (x) { return x.menuId === m; })[0];
        if (!kini) return;
        var min = kini.minPorsi || 1;
        var n = d > 0 ? kini.porsi + 1 : (kini.porsi <= min ? 0 : kini.porsi - 1);
        if (n === 0) { UI.toast(T('Minimal') + ' ' + min + ' ' + T('porsi'), 'err'); return; }
        var r = KJASA.ubahPorsi(APP.user.id, id, m, n);
        if (r.error) UI.toast(r.error, 'err');
        APP.refresh();
      },
      'kj-ganti': function (el) { dialogGantiMitra(el.getAttribute('data-id')); },
      'kj-checkout': function () { checkout(); }
    });
  }

  function dialogGantiMitra(barisId) {
    var b = KJASA.isi(APP.user.id).filter(function (x) { return x.id === barisId; })[0];
    if (!b) return;
    var list = KEAHLIAN.mitraUntuk(b.layanan, b.tgl, b.mulai, b.selesai, b.koordinat);
    var bisa = list.filter(function (x) { return x.bisa; });

    UI.modal({
      title: T('Ganti mitra'),
      sub: U.tglPanjang(b.tgl) + ' · ' + b.mulai + '–' + b.selesai,
      body: bisa.length
        ? '<div class="kh-mitra">' + bisa.map(function (m) {
            return '<button type="button" class="kh-mt' + (b.workerId === m.id ? ' on' : '') +
              '" data-act="pilih" data-id="' + U.esc(m.id) + '">' +
              '<div class="kh-mt__f">' + (m.foto
                ? '<img src="' + U.esc(m.foto) + '" alt="">'
                : UI.avatar(m.nama)) + '</div>' +
              '<div class="kh-mt__n">' + U.esc(m.nama) + '</div>' +
              '<div class="kh-mt__j">🛵 ' + (m.km === null ? '—' : satu(m.km) + ' km · ' + U.rpShort(m.transport)) +
              '</div></button>';
          }).join('') + '</div>'
        : UI.empty('🗓️', T('Tidak ada mitra yang kosong'),
            T('Semua mitra bersertifikat sudah terisi pada jam ini.')),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: {
        pilih: function (el) {
          var r = KJASA.gantiMitra(APP.user.id, barisId, el.getAttribute('data-id'));
          if (r.error) { UI.toast(r.error, 'err'); return; }
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(T('Mitra diganti'), 'ok'); APP.refresh();
        }
      }
    });
  }

  function checkout() {
    var r = KJASA.checkout(APP.user.id, {});
    if (r.error) { UI.toast(r.error, 'err'); return; }

    /* Kegagalan sebagian TIDAK boleh lewat sebagai keberhasilan. Yang gagal
       disebut satu per satu, dan barisnya tetap ada di keranjang. */
    var isi = '<div class="kj-ok">' +
      '<div class="kj-ok__i">🎉</div>' +
      '<b>' + jml(r.pesanan.length, T('1 pesanan berhasil dibuat'),
        T('{n} pesanan berhasil dibuat')) + '</b>' +
      '<div class="tbl-sub mt-1">' +
        T('Mitra yang Anda pilih sedang diberi tahu. Anda akan melihat jawabannya di halaman Pekerjaan Saya.') +
      '</div>' +
      '<div class="kj-ok__l">' + r.pesanan.map(function (o) {
        return '<div><b>' + U.esc(o.no) + '</b> — ' + U.esc(o.judul) + '</div>'; }).join('') + '</div>' +
      (r.gagal.length
        ? '<div class="kh-sebab mt-2"><b>' + jml(r.gagal.length,
            T('1 baris gagal dan masih di keranjang:'),
            T('{n} baris gagal dan masih di keranjang:')) +
          '</b><ul>' + r.gagal.map(function (g) { return '<li>' + U.esc(g.sebab) + '</li>'; }).join('') +
          '</ul></div>'
        : '') +
    '</div>';

    UI.modal({
      title: r.pesanan.length ? T('Checkout berhasil') : T('Checkout gagal'),
      body: isi,
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn btn--primary" data-act="lihat">' + T('Lihat Pekerjaan Saya') + '</button>',
      actions: {
        lihat: function (el) {
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          APP.go('order');
        }
      }
    });
    APP.refresh();
  }

  /* ============================================================ LAYAR MITRA */

  /**
   * Peringatan yang menjelaskan kenapa mitra tidak pernah muncul di hadapan
   * klien. Tanpa ini ia hanya melihat layar kosong dan menyimpulkan tidak ada
   * yang memesan — padahal namanya memang tidak pernah ditawarkan.
   */
  function palangKesiapan() {
    var u = APP.user;
    if (!u) return '';
    var pesan = [];

    if (!KEAHLIAN.titik(u)) {
      pesan.push('<b>' + T('Titik alamat Anda belum ditandai di peta.') + '</b> ' +
        T('Ongkos jalan dihitung dari titik itu, jadi selama belum ada, nama Anda tidak ' +
          'ditawarkan untuk pekerjaan jasa keahlian.') +
        ' <button class="btn btn--sm" data-act="kh-ke-profil">' + T('Tandai sekarang') + '</button>');
    }

    /* Sertifikasi diperiksa per fungsi kerja yang benar-benar dibutuhkan
       layanan keahlian yang sedang ditawarkan — bukan daftar hafalan. */
    var perlu = {};
    KEAHLIAN.katalog().forEach(function (s) {
      var f = s.fungsi || (s.keahlian && s.keahlian.fungsi);
      if (f) perlu[f] = s.nama;
    });
    var belum = Object.keys(perlu).filter(function (f) {
      return !window.KOMPETENSI || KOMPETENSI.status(u, f).kode !== 'aktif';
    });
    if (belum.length) {
      pesan.push('<b>' + T('Anda belum tersertifikasi untuk') + ' ' +
        belum.map(function (f) { return U.esc(perlu[f]); }).join(', ') + '.</b> ' +
        T('Selesaikan pelatihan dan ujiannya dulu supaya bisa menerima permintaan.') +
        ' <button class="btn btn--sm" data-act="kh-ke-fungsi">' + T('Buka Fungsi Kerja') + '</button>');
    }

    if (!pesan.length) return '';
    return pesan.map(function (p) {
      return UI.alert('warn', p, '⚠️') + '<div class="mb-3"></div>'; }).join('');
  }

  /**
   * Kesiapan PERANGKAT — dipasang, dan boleh memberi notifikasi.
   *
   * Dipisahkan dari palang kesiapan mitra karena persoalannya berbeda: yang
   * itu tentang sertifikat dan alamat, yang ini tentang apakah ponselnya akan
   * berbunyi. Permintaan gugur dalam 60 detik; mitra yang tidak menyalakan
   * notifikasi akan kehilangan pekerjaan tanpa pernah tahu ada yang menawarkan.
   *
   * Keterbatasannya disebutkan apa adanya. Mitra yang mengira dirinya akan
   * dibangunkan saat aplikasi tertutup — padahal tidak — akan kehilangan
   * pekerjaan lalu menyalahkan aplikasinya, dengan alasan yang benar.
   */
  function palangPerangkat() {
    if (!window.NOTIF) return '';
    var k = NOTIF.keadaan();
    if (!k.didukung) {
      return UI.alert('warn', '<b>' + T('Peramban ini tidak mendukung notifikasi.') + '</b> ' +
        T('Buka lewat Chrome di ponsel Anda supaya permintaan baru bisa berbunyi.'), '🔕') +
        '<div class="mb-3"></div>';
    }

    var baris = [];
    if (k.izin !== 'granted') {
      baris.push({
        warna: k.izin === 'denied' ? 'danger' : 'warn',
        ikon: '🔔',
        teks: k.izin === 'denied'
          ? '<b>' + T('Notifikasi diblokir untuk situs ini.') + '</b> ' +
            T('Nyalakan lagi lewat pengaturan situs di peramban — tanpa itu permintaan baru tidak akan berbunyi.')
          : '<b>' + T('Notifikasi belum dinyalakan.') + '</b> ' +
            T('Permintaan kerja gugur dalam hitungan detik. Nyalakan supaya ponsel Anda berbunyi saat ada yang masuk.'),
        tombol: k.izin === 'denied' ? '' :
          '<button class="btn btn--sm" data-act="nf-izin">' + T('Nyalakan notifikasi') + '</button>'
      });
    }
    if (!k.terpasang && k.bisaPasang) {
      baris.push({ warna: 'brand', ikon: '📲',
        teks: '<b>' + T('Pasang aplikasi ke layar utama.') + '</b> ' +
          T('Lebih cepat dibuka, tetap jalan saat sinyal buruk, dan notifikasinya lebih andal.'),
        tombol: '<button class="btn btn--sm" data-act="nf-pasang">' + T('Pasang aplikasi') + '</button>' });
    }
    if (k.izin === 'granted' && !k.pushLatar) {
      baris.push({ warna: 'info', ikon: '⏱️',
        teks: '<b>' + T('Notifikasi aktif selama aplikasi masih terbuka') + '</b> — ' +
          T('termasuk saat berada di latar belakang. Saat aplikasi benar-benar ditutup, ' +
            'notifikasi belum bisa masuk; biarkan terbuka bila Anda sedang menunggu pekerjaan.'),
        tombol: '<button class="btn btn--ghost btn--sm" data-act="nf-uji">' + T('Uji bunyi') + '</button>' });
    }

    if (!baris.length) return '';
    return baris.map(function (b) {
      return UI.alert(b.warna, b.teks + (b.tombol ? ' ' + b.tombol : ''), b.ikon) +
        '<div class="mb-3"></div>';
    }).join('');
  }

  function renderPermintaan() {
    var list = KEAHLIAN.permintaanMitra(APP.user.id);
    if (!list.length) {
      return palangPerangkat() + palangKesiapan() +
        UI.alert('brand', '<b>' + T('Tidak ada permintaan yang menunggu.') + '</b> ' +
        T('Permintaan baru muncul di sini dengan hitung mundur — jawablah sebelum waktunya habis.'), '⏱️') +
        '<div class="mb-3"></div>' +
        UI.empty('📭', T('Belum ada permintaan'),
          T('Anda akan diberi tahu saat ada klien yang memilih Anda.'));
    }

    return palangPerangkat() + palangKesiapan() + list.map(function (o) {
      var s = BIZ.svc((o.keahlian && o.keahlian.serviceId) || (o.serviceIds || [])[0]);
      var k = o.keahlian || {};
      var c = BIZ.klien(o.clientId);
      var sisa = KEAHLIAN.sisaDetik(o);
      var total = (o.konfirmasi && o.konfirmasi.detik) || 60;

      return UI.card({ cls: 'mb-3 kh-req',
        title: '⏱️ ' + T('Permintaan baru'),
        sub: o.no,
        body:
          '<div class="kh-req__t" data-tick="' + o.id + '" data-total="' + total + '">' +
            '<div class="kh-req__d">' + mmss(sisa) + '</div>' +
            '<div class="kh-req__bar"><i style="width:' +
              Math.max(0, Math.min(100, sisa / total * 100)) + '%"></i></div>' +
            '<div class="tbl-sub">' + T('sisa waktu menjawab') + '</div>' +
          '</div>' +

          baris(T('Pekerjaan'), (s ? U.ikon(s.icon) + ' ' + U.esc(s.nama) : U.esc(o.judul))) +
          baris(T('Tanggal'), U.tglPanjang(o.tgl)) +
          baris(T('Jam'), o.mulai + ' – ' + o.selesai) +
          baris(T('Lokasi'), U.esc(o.alamat)) +
          baris(T('Klien'), U.esc(c)) +
          (k.baris || []).map(function (b) {
            return baris(U.ikon(b.ikon) + ' ' + U.esc(b.nama) +
              ((b.alergen || []).length
                ? '<div class="kh-alg-w">⚠️ ' + T('mengandung') + ' ' +
                  b.alergen.map(function (a) { return U.esc(T(KEAHLIAN.alergenNama(a))); }).join(', ') +
                  '</div>'
                : ''),
              b.porsi + ' ' + T('porsi')); }).join('') +
          (k.catatan ? baris(T('Catatan'), '<i>' + U.esc(k.catatan) + '</i>') : '') +
          '<div class="kh-garis"></div>' +
          baris('🛵 ' + T('Ongkos jalan Anda'),
            '<b>' + U.rp((o.rincian && o.rincian.transport) || 0) + '</b>') +

          (k.bawaAlat === false
            ? '<div class="kh-catat mt-2">🍳 ' +
                T('Bahan dan alat masak disediakan klien. Anda tidak perlu membawa apa pun.') +
              '</div>'
            : '') +

          '<div class="row mt-3">' +
            '<button class="btn btn--ghost" data-act="req-tolak" data-id="' + o.id + '">' +
              T('Tolak') + '</button>' +
            '<div class="spacer"></div>' +
            '<button class="btn btn--primary btn--lg" data-act="req-terima" data-id="' + o.id + '">' +
              T('Terima') + '</button>' +
          '</div>' });
    }).join('');
  }

  function mountPermintaan(root) {
    U.delegate(root, {
      'nf-izin': function () {
        NOTIF.mintaIzin().then(function (h) {
          if (h === 'granted') {
            NOTIF.kirim({ judul: T('Notifikasi aktif'),
              isi: T('Permintaan kerja baru akan muncul di sini.'), tag: 'uji' });
            NOTIF.bunyi();
            UI.toast(T('Notifikasi dinyalakan'), 'ok');
          } else if (h === 'denied') {
            UI.toast(T('Notifikasi ditolak — nyalakan lewat pengaturan situs di peramban'), 'err');
          }
          APP.refresh();
        });
      },
      'nf-pasang': function () {
        NOTIF.pasang().then(function (h) {
          if (h === 'tidak-tersedia') {
            UI.toast(T('Peramban belum menawarkan pemasangan. Coba menu ⋮ → Pasang aplikasi.'), 'warn');
          }
          APP.refresh();
        });
      },
      'nf-uji': function () {
        var ok = NOTIF.kirim({ judul: T('Uji notifikasi EXOCLEAN Mitra'),
          isi: T('Seperti inilah permintaan baru akan muncul.'), tag: 'uji', penting: false });
        NOTIF.bunyi(); NOTIF.getar([200, 100, 200]);
        UI.toast(ok ? T('Notifikasi dikirim') : T('Notifikasi tidak bisa dikirim'), ok ? 'ok' : 'err');
      },
      'kh-ke-profil': function () { APP.go('profil'); },
      'kh-ke-fungsi': function () { APP.go('fungsi'); },
      'req-terima': function (el) {
        var r = KEAHLIAN.terima(el.getAttribute('data-id'), APP.user.id);
        if (r.error) { UI.toast(r.error, 'err'); APP.refresh(); return; }
        UI.toast(T('Permintaan diterima — pekerjaan masuk jadwal Anda'), 'ok');
        APP.go('tugas');
      },
      'req-tolak': function (el) {
        var id = el.getAttribute('data-id');
        UI.formModal({
          title: T('Tolak permintaan'),
          sub: T('Klien akan langsung diberi tahu supaya bisa memilih mitra lain.'),
          okText: T('Tolak permintaan'),
          fields: [{ name: 'alasan', label: T('Alasan (opsional)'), type: 'textarea', rows: 2,
                     placeholder: T('mis. sedang di luar kota') }]
        }).then(function (d) {
          if (!d) return;
          var r = KEAHLIAN.tolak(id, APP.user.id, d.alasan);
          if (r.error) { UI.toast(r.error, 'err'); }
          else UI.toast(T('Permintaan ditolak'), 'ok');
          APP.refresh();
        });
      }
    });
    pasangDetak(root);
  }

  /**
   * Satu penghitung untuk seluruh halaman, berhenti sendiri saat halamannya
   * ditinggalkan. Interval yang tidak pernah dihentikan akan terus menyala
   * di latar dan menggambar ulang halaman yang sudah tidak dilihat siapa pun.
   */
  function pasangDetak(root) {
    if (detak) { clearInterval(detak); detak = null; }
    if (!root.querySelector('[data-tick]')) return;

    detak = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(detak); detak = null; return; }
      var adaHabis = false;
      [].slice.call(root.querySelectorAll('[data-tick]')).forEach(function (el) {
        var o = BIZ.order(el.getAttribute('data-tick'));
        if (!o) { adaHabis = true; return; }
        var sisa = KEAHLIAN.sisaDetik(o);
        var total = +el.getAttribute('data-total') || 60;
        var d = el.querySelector('.kh-req__d'), bar = el.querySelector('.kh-req__bar i');
        if (d) d.textContent = mmss(sisa);
        if (bar) bar.style.width = Math.max(0, Math.min(100, sisa / total * 100)) + '%';
        el.classList.toggle('kh-req__t--kritis', sisa <= 10);
        if (sisa <= 0) adaHabis = true;
      });
      if (adaHabis) { KEAHLIAN.sapuKedaluwarsa(); APP.refresh(); }
    }, 1000);
  }

  /* ============================================================ LAYAR ADMIN */

  function renderAdmin() {
    var c = KEAHLIAN.config();
    var st = KEAHLIAN.statistik();
    var layanan = DB.all('services').filter(KEAHLIAN.adalah);
    var menunggu = KEAHLIAN.menungguMitra(null);

    return UI.alert('brand', '<b>' + T('Jasa keahlian menjual ORANG, bukan hasil pekerjaan.') + '</b> ' +
      T('Klien memilih mitra tertentu, dan mitra berhak menolak dalam batas waktu di bawah ini. ' +
        'Ongkos jalan dan asuransi dihitung otomatis dari titik alamat mitra ke lokasi acara.'), '👨‍🍳') +
      '<div class="mb-3"></div>' +

      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Layanan keahlian'), value: st.layanan, icon: '👨‍🍳' }) +
        UI.stat({ label: T('Menunggu jawaban'), value: st.menunggu, icon: '⏱️',
          meta: T('mitra belum menjawab') }) +
        UI.stat({ label: T('Diterima mitra'), value: st.diterima, icon: '✅' }) +
        UI.stat({ label: T('Ditolak / gugur'), value: st.ditolak + st.kedaluwarsa, icon: '🔄' }) +
      '</div>' +

      UI.card({ title: T('Batas waktu menjawab'), cls: 'mb-3',
        sub: T('Berlaku untuk semua layanan keahlian, kecuali yang ditimpa sendiri'),
        tools: '<button class="btn btn--ghost btn--sm" data-act="kh-set-respon">' + T('Ubah') + '</button>',
        body: baris(T('Batas bawaan'), '<b>' + detikTeks(c.responDetik) + '</b>') +
          '<div class="tbl-sub mt-1">' +
            T('Lewat batas ini permintaan gugur sendiri dan klien dipersilakan memilih mitra lain.') +
          '</div>' +
          (layanan.length
            ? '<div class="kh-garis"></div>' + layanan.map(function (s) {
                var per = s.keahlian && s.keahlian.responDetik;
                return baris(U.ikon(s.icon) + ' ' + U.esc(s.nama),
                  (per ? '<b>' + detikTeks(per) + '</b> <small>' + T('khusus') + '</small>'
                       : '<small>' + T('ikut bawaan') + '</small>') +
                  ' <button class="btn btn--ghost btn--sm" data-act="kh-set-respon-svc" ' +
                    'data-id="' + s.id + '">' + T('Ubah') + '</button>');
              }).join('')
            : '') }) +

      UI.card({ title: T('Ongkos jalan dan asuransi'), cls: 'mb-3',
        tools: '<button class="btn btn--ghost btn--sm" data-act="kh-set-biaya">' + T('Ubah') + '</button>',
        body:
          baris(T('Tarif per km'), U.rp(c.transport.perKm)) +
          baris(T('Ongkos jalan minimum'), U.rp(c.transport.minimum)) +
          baris(T('Dihitung pulang-pergi'), c.transport.pulangPergi ? T('Ya') : T('Tidak')) +
          baris(T('Gratis di bawah'), c.transport.gratisRadiusKm + ' km') +
          '<div class="kh-garis"></div>' +
          baris(T('Asuransi dari nilai jasa'), satu(c.asuransi.persen) + '%') +
          baris(T('Asuransi minimum'), U.rp(c.asuransi.minimum)) +
          '<div class="kh-garis"></div>' +
          baris(T('Biaya layanan per pesanan'), U.rp(c.biayaLayanan)) }) +

      UI.card({ title: T('Menu dan tarif'), cls: 'mb-3',
        sub: T('Jenis pekerjaan yang bisa dipesan beserta tarif per porsinya'),
        body: layanan.length
          ? layanan.map(function (s) {
              var m = KEAHLIAN.menu(s);
              return '<div class="kh-svc">' +
                '<div class="row">' +
                  '<b>' + U.ikon(s.icon) + ' ' + U.esc(s.nama) + '</b>' +
                  '<span class="tbl-sub">' +
                    jml(KEAHLIAN.perNegara(s).length, '1 negara', '{n} negara') + ' · ' +
                    jml(m.length, '1 masakan', '{n} masakan') + '</span>' +
                  '<div class="spacer"></div>' +
                  '<button class="btn btn--ghost btn--sm" data-act="kh-menu" data-id="' + s.id + '">' +
                    T('Kelola menu') + '</button>' +
                '</div>' +
                /* Dikelompokkan per negara, bukan 46 keping berderet: yang
                   ingin diketahui admin adalah cakupannya, bukan daftarnya. */
                '<div class="kh-tag">' + KEAHLIAN.perNegara(s).map(function (g) {
                  return '<span class="chip">' + U.ikon(g.ikon) + ' ' + U.esc(g.negara) +
                    ' · ' + g.masakan.length + '</span>'; }).join('') + '</div>' +
              '</div>';
            }).join('')
          : UI.empty('👨‍🍳', T('Belum ada layanan keahlian'),
              T('Tambahkan layanan di Katalog Layanan, lalu tandai jenisnya sebagai keahlian.')) }) +

      /* Kenapa daftar juru masak kosong di layar klien adalah pertanyaan
         pertama yang akan diajukan admin. Dijawab di sini, per mitra, bukan
         dibiarkan jadi tebak-tebakan. */
      UI.card({ title: T('Kesiapan mitra'), cls: 'mb-3',
        sub: T('Mitra hanya ditawarkan ke klien bila tersertifikasi DAN titik alamatnya sudah ditandai'),
        body: (function () {
          var svcK = KEAHLIAN.katalog();
          if (!svcK.length) {
            return UI.empty('👨‍🍳', T('Belum ada layanan keahlian'),
              T('Tambahkan layanan keahlian dulu.'));
          }
          var baris2 = [];
          svcK.forEach(function (s) {
            var f = s.fungsi || (s.keahlian && s.keahlian.fungsi);
            var bersertifikat = f && window.KOMPETENSI ? KOMPETENSI.mitraFungsi(f) : [];
            var siap = bersertifikat.filter(function (u) { return !!KEAHLIAN.titik(u); });
            baris2.push({ s: s, f: f, sertifikat: bersertifikat, siap: siap });
          });
          return baris2.map(function (b) {
            var kurang = b.sertifikat.filter(function (u) { return !KEAHLIAN.titik(u); });
            return '<div class="kh-svc">' +
              '<div class="row"><b>' + U.ikon(b.s.icon) + ' ' + U.esc(b.s.nama) + '</b>' +
                '<div class="spacer"></div>' +
                (b.siap.length
                  ? '<span class="chip chip--ok">' +
                    jml(b.siap.length, T('1 mitra siap'), T('{n} mitra siap')) + '</span>'
                  : '<span class="chip chip--danger">' + T('tidak ada mitra siap') + '</span>') +
              '</div>' +
              '<div class="tbl-sub mt-1">' +
                T('Fungsi kerja') + ': <span class="code">' + U.esc(b.f || '—') + '</span> · ' +
                b.sertifikat.length + ' ' + T('tersertifikasi') +
              '</div>' +
              (kurang.length
                ? '<div class="kh-sebab">⚠️ ' + kurang.length + ' ' +
                  T('mitra tersertifikasi tetapi belum menandai titik alamatnya, jadi tidak ditawarkan:') +
                  ' ' + kurang.map(function (u) { return U.esc(u.nama); }).join(', ') + '</div>'
                : '') +
              (!b.sertifikat.length
                ? '<div class="kh-sebab">⚠️ ' +
                  T('Belum ada mitra yang lulus sertifikasi untuk fungsi kerja ini. ' +
                    'Klien tidak akan melihat satu pun pilihan mitra.') + '</div>'
                : '') +
            '</div>';
          }).join('');
        })() }) +

      UI.card({ title: T('Permintaan yang sedang menggantung'),
        sub: jml(menunggu.length, T('1 pesanan'), T('{n} pesanan')),
        body: menunggu.length
          ? UI.table([
              { h: T('Pesanan'), r: function (o) {
                return '<div class="tbl-title">' + U.esc(o.no) + '</div>' +
                  '<div class="tbl-sub">' + U.esc(o.judul) + '</div>'; } },
              { h: T('Mitra'), r: function (o) {
                var w = o.konfirmasi ? DB.find('users', o.konfirmasi.workerId) : null;
                return w ? U.esc(w.nama) : '—'; } },
              { h: T('Keadaan'), r: function (o) {
                var k = o.konfirmasi || {};
                if (k.status === 'menunggu') {
                  var sisa = KEAHLIAN.sisaDetik(o);
                  return '<span class="chip chip--warn">' + T('menunggu') + ' · ' +
                    mmss(sisa) + '</span>';
                }
                if (k.status === 'ditolak') return '<span class="chip chip--danger">' + T('ditolak mitra') + '</span>';
                if (k.status === 'kedaluwarsa') return '<span class="chip chip--muted">' + T('gugur') + '</span>';
                return '—'; } },
              { h: T('Percobaan'), cls: 'num', r: function (o) {
                return ((o.konfirmasiRiwayat || []).length + 1); } },
              { h: T('Nilai rupiah'), cls: 'num', r: function (o) { return U.rp(o.nilai || 0); } }
            ], menunggu)
          : UI.empty('✅', T('Tidak ada yang menggantung'),
              T('Semua permintaan sudah dijawab mitra.')) });
  }

  function mountAdmin(root) {
    U.delegate(root, {
      'kh-set-respon': function () {
        var c = KEAHLIAN.config();
        UI.formModal({
          title: T('Batas waktu menjawab'),
          sub: T('Berlaku untuk semua layanan keahlian yang tidak punya batas sendiri'),
          fields: [{ name: 'detik', label: T('Detik'), type: 'number', min: 10, value: c.responDetik,
            hint: T('Minimal 10 detik. Terlalu pendek membuat mitra kehilangan permintaan ' +
                    'yang sebenarnya sanggup ia kerjakan.') }]
        }).then(function (d) {
          if (!d) return;
          var n = Math.max(10, Math.round(+d.detik || 0));
          KEAHLIAN.simpanConfig({ responDetik: n });
          UI.toast(T('Batas waktu disimpan'), 'ok'); APP.refresh();
        });
      },

      'kh-set-respon-svc': function (el) {
        var s = BIZ.svc(el.getAttribute('data-id'));
        if (!s) return;
        var per = s.keahlian && s.keahlian.responDetik;
        UI.formModal({
          title: T('Batas waktu khusus'),
          sub: U.esc(s.nama),
          fields: [{ name: 'detik', label: T('Detik'), type: 'number', min: 0, value: per || '',
            hint: T('Kosongkan untuk mengikuti batas bawaan') + ' (' +
                  detikTeks(KEAHLIAN.config().responDetik) + ').' }]
        }).then(function (d) {
          if (!d) return;
          var v = String(d.detik).trim();
          var n = v === '' ? null : Math.max(10, Math.round(+v || 0));
          var k = Object.assign({}, s.keahlian || {}, { responDetik: n });
          DB.update('services', s.id, { keahlian: k });
          UI.toast(T('Tersimpan'), 'ok'); APP.refresh();
        });
      },

      'kh-set-biaya': function () {
        var c = KEAHLIAN.config();
        UI.formModal({
          title: T('Ongkos jalan dan asuransi'),
          fields: [
            { name: 'perKm', label: T('Tarif ongkos jalan per km (Rp)'), type: 'number', value: c.transport.perKm },
            { name: 'minimum', label: T('Ongkos jalan minimum (Rp)'), type: 'number', value: c.transport.minimum },
            { name: 'pp', label: T('Hitung pulang-pergi'), type: 'checkbox', value: c.transport.pulangPergi,
              hint: T('Mitra pulang juga — perjalanannya tetap terjadi entah dibayar atau tidak.') },
            { name: 'gratis', label: T('Gratis untuk jarak di bawah (km)'), type: 'number', value: c.transport.gratisRadiusKm },
            { name: 'persen', label: T('Asuransi — persen dari nilai jasa'), type: 'number', step: '0.1', value: c.asuransi.persen },
            { name: 'minAsuransi', label: T('Asuransi minimum (Rp)'), type: 'number', value: c.asuransi.minimum },
            { name: 'biayaLayanan', label: T('Biaya layanan per pesanan (Rp)'), type: 'number', value: c.biayaLayanan }
          ]
        }).then(function (d) {
          if (!d) return;
          KEAHLIAN.simpanConfig({
            transport: { aktif: true, perKm: +d.perKm || 0, minimum: +d.minimum || 0,
                         pulangPergi: !!d.pp, gratisRadiusKm: +d.gratis || 0 },
            asuransi: { aktif: true, persen: +d.persen || 0, minimum: +d.minAsuransi || 0 },
            biayaLayanan: +d.biayaLayanan || 0
          });
          UI.toast(T('Pengaturan biaya disimpan'), 'ok'); APP.refresh();
        });
      },

      'kh-menu': function (el) {
        MA.negara = null;
        APP.go('keahlianMenu', { id: el.getAttribute('data-id') });
      }
    });
  }

  /* ========================================================= KELOLA MENU
     Halaman penuh, bukan modal: delapan puluh masakan dengan saklar, ubah,
     dan hapus di tiap barisnya tidak muat di dalam kotak mengambang — dan
     modal yang digambar ulang setiap kali satu saklar ditekan kehilangan
     posisi gulirnya. */

  var MA = { svcId: null, negara: null };

  function renderMenuAdmin(params) {
    var id = (params && params.id) || MA.svcId;
    var s = id ? BIZ.svc(id) : null;
    if (!KEAHLIAN.adalah(s)) {
      return UI.empty('🍽️', T('Layanan keahlian tidak ditemukan'),
        T('Kembali ke halaman Jasa Keahlian.')) +
        '<div class="row mt-3"><div class="spacer"></div>' +
        '<button class="btn" data-act="ma-kembali">' + T('Kembali') + '</button>' +
        '<div class="spacer"></div></div>';
    }
    MA.svcId = id;

    /* `true` = ikut yang sedang dijeda. Admin harus melihat yang dimatikan;
       daftar yang menyembunyikannya membuat orang mengira masakan itu hilang
       lalu menulisnya ulang sebagai baris kembar. */
    var grup = KEAHLIAN.perNegara(s, true);
    var semua = KEAHLIAN.menuSemua(s);
    var aktifJml = semua.filter(function (m) { return m.aktif !== false; }).length;

    var aktif = null;
    grup.forEach(function (g) { if (!aktif && g.negara === MA.negara) aktif = g; });
    if (!aktif) aktif = grup[0] || null;

    return '<div class="kh__kepala mb-3">' +
        '<button class="btn btn--ghost btn--sm" data-act="ma-kembali">‹ ' + T('Kembali') + '</button>' +
        '<b>' + U.ikon(s.icon) + ' ' + U.esc(s.nama) + '</b>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--ghost btn--sm" data-act="ma-impor">' + T('Impor massal') + '</button>' +
        '<button class="btn btn--primary btn--sm" data-act="ma-tambah">＋ ' + T('Tambah Masakan') + '</button>' +
      '</div>' +

      UI.alert('brand', '<b>' + T('Jeda berbeda dari hapus.') + '</b> ' +
        T('Masakan yang dijeda berhenti ditawarkan ke klien tetapi tarif dan riwayatnya utuh — ' +
          'bisa dinyalakan lagi persis seperti semula. Menghapus lalu menulis ulang tidak sama.'),
        '⏸️') + '<div class="mb-3"></div>' +

      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Total masakan'), value: semua.length, icon: '🍽️' }) +
        UI.stat({ label: T('Ditawarkan'), value: aktifJml, icon: '✅' }) +
        UI.stat({ label: T('Dijeda'), value: semua.length - aktifJml, icon: '⏸️' }) +
        UI.stat({ label: T('Asal negara'), value: grup.length, icon: '🌏' }) +
      '</div>' +

      (grup.length
        ? UI.card({ title: T('Asal masakan'), cls: 'mb-3',
            body: '<div class="kh-neg">' + grup.map(function (g) {
              var mati = g.masakan.filter(function (m) { return m.aktif === false; }).length;
              return '<button type="button" class="kh-neg__b' + (g === aktif ? ' on' : '') + '" ' +
                'data-act="ma-negara" data-n="' + U.esc(g.negara) + '">' +
                '<span class="kh-neg__i">' + U.ikon(g.ikon) + '</span>' +
                '<span>' + U.esc(g.negara) + '</span>' +
                '<i class="kh-neg__n' + (mati ? ' kh-neg__n--mati' : '') + '">' +
                  (g.masakan.length - mati) + (mati ? '/' + g.masakan.length : '') + '</i>' +
              '</button>';
            }).join('') + '</div>' })
        : '') +

      (aktif ? kartuNegara(s, aktif)
             : UI.empty('🍽️', T('Belum ada masakan'),
                 T('Tekan “Tambah Masakan” untuk mulai menyusun menunya.')));
  }

  function kartuNegara(s, g) {
    var mati = g.masakan.filter(function (m) { return m.aktif === false; }).length;
    var adaHidup = g.masakan.length - mati > 0;

    return UI.card({
      title: U.ikon(g.ikon) + ' ' + U.esc(g.negara),
      sub: jml(g.masakan.length, '1 masakan', '{n} masakan') +
           (mati ? ' · ' + mati + ' ' + T('dijeda') : ''),
      /* Menjeda satu lini masakan sekaligus: kalau bahan seafood habis, tidak
         masuk akal menekan sembilan saklar satu per satu. */
      tools: '<button class="btn btn--ghost btn--sm" data-act="ma-jeda-negara" ' +
        'data-n="' + U.esc(g.negara) + '" data-on="' + (adaHidup ? '0' : '1') + '">' +
        (adaHidup ? T('Jeda semua') : T('Nyalakan semua')) + '</button>',
      body: g.perHidangan.map(function (kel) {
        return '<div class="kh-hid">' + U.ikon(kel.hidangan.ikon) + ' ' +
          U.esc(T(kel.hidangan.nama)) +
          '<span>' + jml(kel.masakan.length, '1 masakan', '{n} masakan') + '</span></div>' +
        '<div class="ma-list">' + kel.masakan.map(function (m) {
          var on = m.aktif !== false;
          return '<div class="ma-r' + (on ? '' : ' ma-r--jeda') + '">' +
            '<button class="sw' + (on ? ' sw--on' : '') + '" data-act="ma-jeda" ' +
              'data-id="' + U.esc(m.id) + '" role="switch" aria-checked="' + on + '" ' +
              'title="' + U.esc(on ? T('Jeda masakan ini') : T('Nyalakan lagi')) + '"><i></i></button>' +
            (m.foto && DB.getPhoto(m.foto)
              ? '<img class="ma-r__f" src="' + U.esc(DB.getPhoto(m.foto)) + '" alt="">'
              : '') +
            '<div class="ma-r__t">' +
              '<b>' + U.esc(m.nama) + '</b>' +
              '<span><span class="code">' + U.esc(m.id) + '</span> · ' +
                U.rp(m.tarif) + ' / ' + T('porsi') + ' · ' + T('min') + ' ' + (m.minPorsi || 1) +
                ' · ' + U.ikon(KEAHLIAN.bahan(m.bahan).ikon) + ' ' + U.esc(T(KEAHLIAN.bahan(m.bahan).nama)) +
                (m.menitMasak ? ' · ⏱️ ' + m.menitMasak + ' ' + T('menit') : '') +
              '</span>' +
              penandaMasakan(m) +
            '</div>' +
            (on ? '' : '<span class="chip chip--muted">' + T('dijeda') + '</span>') +
            '<button class="btn btn--ghost btn--sm" data-act="ma-ubah" data-id="' + U.esc(m.id) + '">' +
              T('Ubah') + '</button>' +
            '<button class="btn btn--ghost btn--sm ma-hapus" data-act="ma-hapus" ' +
              'data-id="' + U.esc(m.id) + '" title="' + U.esc(T('Hapus')) + '">🗑</button>' +
          '</div>';
        }).join('') + '</div>';
      }).join('') });
  }

  /**
   * Formulir satu masakan — dipakai untuk menambah maupun mengubah.
   *
   * NO ID MAKANAN ditampilkan tetapi tidak bisa disunting. Ia identitas baris
   * ini di keranjang, pesanan, dan invoice; membiarkannya diedit berarti
   * membiarkan seseorang memutus tautan ke dokumen yang sudah terbit tanpa
   * galat apa pun. Saat menambah, nomornya belum ada — dibuat sistem tepat
   * ketika disimpan, supaya nomor tidak terbakar oleh formulir yang dibatalkan.
   */
  function dialogMasakan(svcId, menuId) {
    var s = BIZ.svc(svcId);
    if (!KEAHLIAN.adalah(s)) return;
    var m = menuId
      ? KEAHLIAN.menuSemua(s).filter(function (x) { return x.id === menuId; })[0]
      : null;
    if (menuId && !m) { UI.toast(T('Masakan tidak ditemukan.'), 'err'); return; }

    var negaraAda = [];
    KEAHLIAN.perNegara(s, true).forEach(function (g) { negaraAda.push(g.negara); });
    var BARU_NEG = '__baru__';
    var negaraKini = m ? m.negara : (MA.negara || negaraAda[0] || '');
    var ikonNegara = '';
    KEAHLIAN.perNegara(s, true).forEach(function (g) {
      if (g.negara === negaraKini) ikonNegara = g.ikon;
    });

    var fields = [
      { name: 'kode', label: T('No ID Makanan'), value: m ? m.id : '',
        readonly: true,
        placeholder: T('Dibuat otomatis saat disimpan'),
        hint: T('Dibuat sistem dan tidak bisa diubah atau dihapus. Nama boleh diperbaiki dan ' +
                'negaranya boleh dipindah — nomor ini tetap, karena inilah yang ditunjuk ' +
                'keranjang, pesanan, dan invoice.') }
    ];

    fields.push({ name: 'nama', label: T('Nama Makanan'), value: m ? m.nama : '',
      required: true, placeholder: 'Rendang Daging' });

    if (negaraAda.length) {
      fields.push({ name: 'negaraPilih', label: T('Asal Negara'), type: 'select',
        value: negaraKini,
        options: negaraAda.map(function (n) { return { value: n, label: n }; })
          .concat([{ value: BARU_NEG, label: '➕ ' + T('Negara baru…') }]) });
      fields.push({ name: 'negaraBaru', label: T('Nama negara baru'), value: '',
        placeholder: 'Vietnam',
        hint: T('Diisi hanya bila memilih “Negara baru…” di atas.') });
    } else {
      fields.push({ name: 'negaraBaru', label: T('Asal Negara'), value: negaraKini,
        required: true, placeholder: 'Indonesia' });
    }

    fields.push({ name: 'bahan', label: T('Bahan Baku Utama'), type: 'select',
      value: m ? KEAHLIAN.bahan(m.bahan).kode : 'ayam',
      options: KEAHLIAN.BAHAN.map(function (b) {
        return { value: b.kode, label: b.ikon + ' ' + T(b.nama) + (b.nonHalal ? ' — ' + T('non-halal') : '') }; }),
      hint: T('Menentukan penanda halal dan belanja apa yang harus disiapkan klien.') });

    fields.push({ name: 'hidangan', label: T('Golongan Makanan'), type: 'select',
      value: m ? KEAHLIAN.hidangan(m.hidangan).kode : 'utama',
      options: KEAHLIAN.HIDANGAN.map(function (h) {
        return { value: h.kode, label: h.ikon + ' ' + T(h.nama) }; }) });

    fields.push({ name: 'tarif', label: T('Tarif per porsi (Rp)'), type: 'number',
      required: true, value: m ? m.tarif : '' });
    fields.push({ name: 'minPorsi', label: T('Minimal porsi'), type: 'number', min: 1,
      value: m ? (m.minPorsi || 1) : 5,
      hint: T('Klien tidak bisa memesan di bawah angka ini.') });

    fields.push({ name: 'halal', label: T('Halal'), type: 'checkbox',
      value: m ? m.halal !== false : true,
      hint: T('Otomatis dimatikan bila bahan baku utamanya babi.') });

    fields.push({ name: 'pedas', label: T('Tingkat pedas'), type: 'select',
      value: m ? KEAHLIAN.pedas(m.pedas).kode : 'tidak',
      options: KEAHLIAN.PEDAS.map(function (p) {
        return { value: p.kode, label: (p.ikon ? p.ikon + ' ' : '') + T(p.nama) }; }) });

    /* Alergen sebagai centang ganda, bukan teks bebas: yang diketik bebas
       tidak bisa dipakai menyaring, dan penyaringan itulah gunanya. */
    var alergenKini = (m && m.alergen) || [];
    fields.push({ type: 'html', html:
      '<div class="field"><label>' + T('Mengandung alergen') + '</label>' +
        '<div class="kh-alg">' + KEAHLIAN.ALERGEN.map(function (a) {
          return '<label class="kh-alg__i">' +
            '<input type="checkbox" name="alergen" data-multi="1" value="' + U.esc(a.kode) + '"' +
            (alergenKini.indexOf(a.kode) >= 0 ? ' checked' : '') + '>' +
            '<span>' + U.esc(T(a.nama)) + '</span></label>';
        }).join('') + '</div>' +
        '<div class="hint">' + U.esc(T('Ditampilkan ke klien sebelum ia memesan. Alergi kacang dan ' +
          'seafood bisa berakibat fatal — jangan mengandalkan klien menuliskannya di kolom catatan.')) +
        '</div></div>' });

    fields.push({ name: 'menitMasak', label: T('Estimasi waktu masak (menit)'), type: 'number', min: 0,
      value: m ? (m.menitMasak || 0) : 60,
      hint: T('Dipakai memeriksa apakah durasi pemesanan klien cukup untuk memasaknya.') });

    fields.push({ name: 'deskripsi', label: T('Deskripsi singkat'), type: 'textarea', rows: 2,
      value: m ? (m.deskripsi || '') : '',
      placeholder: T('mis. daging sapi dimasak santan dan rempah sampai kering') });

    /* Foto disimpan di gudang foto DB, bukan sebagai dataURL di dalam baris
       menu: delapan puluh gambar yang menempel di katalog akan membuat satu
       baris services membengkak melewati kuota localStorage. */
    var fotoKini = m && m.foto ? DB.getPhoto(m.foto) : null;
    fields.push({ type: 'html', html:
      '<div class="field"><label>' + T('Foto masakan') + '</label>' +
        '<div class="kh-foto" data-foto>' +
          '<div class="kh-foto__p"' + (fotoKini ? '' : ' hidden') + '>' +
            '<img src="' + (fotoKini || '') + '" alt="">' +
            '<button type="button" class="btn btn--ghost btn--sm" data-foto-hapus>✕ ' +
              T('Hapus foto') + '</button>' +
          '</div>' +
          '<label class="btn btn--ghost btn--sm kh-foto__b">' + T('Pilih foto') +
            '<input type="file" accept="image/*" hidden data-foto-file></label>' +
          '<input type="hidden" name="foto" value="' + U.esc(m && m.foto ? m.foto : '') + '">' +
          '<div class="hint">' + U.esc(T('Klien memilih makanan dengan mata. Gambar dikecilkan ' +
            'otomatis supaya muat di penyimpanan.')) + '</div>' +
        '</div></div>' });

    fields.push({ name: 'ikon', label: T('Ikon negara'), value: m ? (m.ikon || '') : ikonNegara,
      hint: T('Dipakai pada chip pemilih negara. Kosongkan untuk mengikuti masakan lain dari negara yang sama.') });
    fields.push({ name: 'aktif', label: T('Tawarkan ke klien sekarang'), type: 'checkbox',
      value: m ? m.aktif !== false : true });

    UI.formModal({
      title: m ? T('Ubah masakan') : T('Masakan baru'),
      sub: m ? m.id + ' · ' + m.negara : U.esc(s.nama),
      okText: m ? T('Simpan') : T('Tambahkan'),
      fields: fields,
      onMount: function (root) {
        /* Nomor ID tidak boleh disunting sama sekali — bukan hanya diabaikan
           saat menyimpan. Input yang terlihat bisa diketik lalu ternyata tidak
           tersimpan adalah kebohongan kecil yang membuat orang mencoba lagi. */
        var kode = root.querySelector('[name=kode]');
        if (kode) { kode.readOnly = true; kode.classList.add('input--kunci'); }

        /* Memilih babi langsung mematikan penanda halal, di depan mata,
           bukan diam-diam saat menyimpan. */
        var selBahan = root.querySelector('[name=bahan]');
        var cbHalal = root.querySelector('[name=halal]');
        /* Keadaan sebelum dikunci diingat, lalu dikembalikan. Tanpa ini,
           salah pilih babi sekejap membuat masakan halal tertinggal bertanda
           non-halal — dan tidak ada apa pun di layar yang memberitahukannya. */
        var halalSebelumKunci = cbHalal ? cbHalal.checked : true;
        function selaraskanHalal() {
          if (!selBahan || !cbHalal) return;
          var b = KEAHLIAN.bahan(selBahan.value);
          if (b.nonHalal) {
            if (!cbHalal.disabled) halalSebelumKunci = cbHalal.checked;
            cbHalal.checked = false; cbHalal.disabled = true;
          } else {
            if (cbHalal.disabled) cbHalal.checked = halalSebelumKunci;
            cbHalal.disabled = false;
          }
        }
        if (selBahan) selBahan.addEventListener('change', selaraskanHalal);
        selaraskanHalal();

        /* Ikon mengikuti negara yang dipilih. Negara BARU dimulai bersih —
           mewarisi ikon negara sebelumnya membuat chip Vietnam bergambar
           nasi Padang, dan tidak ada yang menyadarinya sampai klien melihat. */
        var selNeg = root.querySelector('[name=negaraPilih]');
        var inpIkon = root.querySelector('[name=ikon]');
        if (selNeg && inpIkon) {
          selNeg.addEventListener('change', function () {
            if (selNeg.value === BARU_NEG) { inpIkon.value = ''; return; }
            var ik = '';
            KEAHLIAN.perNegara(BIZ.svc(svcId), true).forEach(function (g) {
              if (g.negara === selNeg.value) ik = g.ikon;
            });
            inpIkon.value = ik;
          });
        }

        var kotak = root.querySelector('[data-foto]');
        if (!kotak) return;
        var file = kotak.querySelector('[data-foto-file]');
        var simpan = kotak.querySelector('[name=foto]');
        var pratinjau = kotak.querySelector('.kh-foto__p');
        var img = pratinjau.querySelector('img');

        file.addEventListener('change', function () {
          var f = file.files && file.files[0];
          if (!f) return;
          U.compressImage(f, 720, 0.6).then(function (dataURL) {
            /* Foto lama dibuang begitu diganti — kalau tidak, gudang foto
               terisi gambar yang tidak dirujuk siapa pun sampai kuota penuh. */
            if (simpan.value) { try { DB.delPhoto(simpan.value); } catch (e) {} }
            var id = DB.putPhoto(dataURL);
            simpan.value = id;
            img.src = dataURL;
            pratinjau.hidden = false;
          }).catch(function (e) { UI.toast(e.message || T('Gagal membaca gambar'), 'err'); });
        });

        kotak.querySelector('[data-foto-hapus]').addEventListener('click', function () {
          if (simpan.value) { try { DB.delPhoto(simpan.value); } catch (e) {} }
          simpan.value = ''; img.src = ''; pratinjau.hidden = true;
          file.value = '';
        });
      }
    }).then(function (d) {
      if (!d) return;
      var negara = String(
        (d.negaraPilih && d.negaraPilih !== BARU_NEG) ? d.negaraPilih : d.negaraBaru
      ).trim();
      var isian = {
        negara: negara, nama: d.nama, bahan: d.bahan, hidangan: d.hidangan,
        tarif: +d.tarif || 0, minPorsi: +d.minPorsi || 1,
        halal: d.halal, pedas: d.pedas, alergen: d.alergen || [],
        menitMasak: +d.menitMasak || 0, deskripsi: d.deskripsi,
        foto: d.foto || null, ikon: String(d.ikon || '').trim(), aktif: d.aktif
      };
      var r = m ? KEAHLIAN.ubahMasakan(svcId, menuId, isian)
                : KEAHLIAN.tambahMasakan(svcId, isian);
      if (r.error) { UI.toast(r.error, 'err'); dialogMasakan(svcId, menuId); return; }
      MA.negara = negara;
      UI.toast(m ? T('Masakan diperbarui')
                 : T('Masakan {id} ditambahkan').replace('{id}', r.masakan.id), 'ok');
      APP.refresh();
    });
  }

  function mountMenuAdmin(root) {
    U.delegate(root, {
      'ma-kembali': function () { APP.go('keahlian'); },
      'ma-negara': function (el) { MA.negara = el.getAttribute('data-n'); APP.refresh(); },
      'ma-tambah': function () { dialogMasakan(MA.svcId, null); },
      'ma-ubah': function (el) { dialogMasakan(MA.svcId, el.getAttribute('data-id')); },

      'ma-jeda': function (el) {
        var id = el.getAttribute('data-id');
        var m = KEAHLIAN.menuSemua(BIZ.svc(MA.svcId))
          .filter(function (x) { return x.id === id; })[0];
        if (!m) return;
        var r = KEAHLIAN.jedaMasakan(MA.svcId, id, m.aktif === false);
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(m.aktif === false ? T('Ditawarkan lagi') : T('Dijeda'), 'ok');
        APP.refresh();
      },

      'ma-jeda-negara': function (el) {
        var n = el.getAttribute('data-n');
        var on = el.getAttribute('data-on') === '1';
        var r = KEAHLIAN.jedaNegara(MA.svcId, n, on);
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(jml(r.jumlah, on ? '1 masakan dinyalakan' : '1 masakan dijeda',
          on ? '{n} masakan dinyalakan' : '{n} masakan dijeda'), 'ok');
        APP.refresh();
      },

      'ma-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var m = KEAHLIAN.menuSemua(BIZ.svc(MA.svcId))
          .filter(function (x) { return x.id === id; })[0];
        if (!m) return;
        var dipakai = KEAHLIAN.dipakaiMasakan(id);
        /* Yang terdampak disebut sebelum menghapus, bukan sesudah. Pesanan
           yang sudah terbit tidak ikut karena rinciannya sudah dibekukan
           di pesanan itu sendiri. */
        UI.konfirm({
          title: T('Hapus masakan ini?'),
          htmlText: '<b>' + U.esc(m.nama) + '</b> — ' + U.esc(m.negara) + '.<br>' +
            T('Menghapus tidak bisa dibatalkan. Bila hanya ingin menghentikannya sementara, pakai jeda — ' +
              'tarif dan riwayatnya tetap utuh.') +
            (dipakai
              ? '<br><br><b style="color:var(--danger,#DC2626)">' +
                jml(dipakai, T('1 keranjang klien masih memuat masakan ini.'),
                  T('{n} keranjang klien masih memuat masakan ini.')) + '</b> ' +
                T('Baris itu akan ditandai tidak tersedia dan tidak bisa di-checkout.')
              : ''),
          okText: T('Hapus permanen'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var r = KEAHLIAN.hapusMasakan(MA.svcId, id);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Masakan dihapus'), 'ok');
          APP.refresh();
        });
      },

      'ma-impor': function () { dialogMenu(MA.svcId); }
    });
  }

  /**
   * Impor massal sebagai TEKS BARIS, di samping pengelola per baris.
   *
   * Dua belas jenis masakan berarti dua belas baris formulir dengan empat
   * kolom masing-masing — mengubah satu tarif jadi pekerjaan menggulir. Satu
   * baris satu jenis, dipisah tanda `|`, bisa disalin dari spreadsheet dan
   * ditempel utuh.
   */
  function dialogMenu(svcId) {
    var s = BIZ.svc(svcId);
    if (!KEAHLIAN.adalah(s)) return;
    /* Yang dijeda ikut ditampilkan: teks yang menyembunyikannya akan
       MENGHAPUS masakan itu begitu disimpan, karena baris ini menggantikan
       seluruh daftar. */
    var menu = KEAHLIAN.menuSemua(s);
    var teks = menu.map(function (m) {
      return [m.negara || '', KEAHLIAN.hidangan(m.hidangan).kode, m.nama,
              KEAHLIAN.bahan(m.bahan).kode, m.tarif, m.minPorsi || 1, m.ikon || ''].join(' | ');
    }).join('\n');

    UI.formModal({
      title: T('Kelola menu'), sub: U.esc(s.nama), okText: T('Simpan'),
      fields: [
        { name: 'menu', label: T('Satu masakan per baris'), type: 'textarea', rows: 16, value: teks,
          hint: T('Bentuk: Negara | hidangan | Nama | bahan | tarif | minimal porsi | ikon') +
                ' — ' + T('contoh') + ': Indonesia | utama | Rendang Daging | sapi | 55000 | 5 | 🍛' },
        { name: 'bawaAlat', label: T('Mitra membawa peralatannya sendiri'),
          type: 'checkbox', value: !!(s.keahlian && s.keahlian.bawaAlat),
          hint: T('Bila dimatikan, klien diberi peringatan bahwa ia harus menyediakan alat dan bahan.') },
        { name: 'catatanBawaan', label: T('Peringatan untuk klien'),
          value: (s.keahlian && s.keahlian.catatanBawaan) || '' }
      ]
    }).then(function (d) {
      if (!d) return;
      var petaLama = {};
      menu.forEach(function (m) { petaLama[(m.negara || '') + '|' + m.nama] = m; });

      var salah = [];
      var baru = String(d.menu || '').split('\n').map(function (b, i) {
        var t = b.trim();
        if (!t) return null;
        var p = t.split('|').map(function (x) { return x.trim(); });
        var negara = p[0], hid = p[1], nama = p[2], bhn = p[3], tarif = Math.round(+p[4] || 0);
        if (!negara || !nama || !(tarif > 0)) {
          salah.push(T('baris') + ' ' + (i + 1) + ': ' + t); return null;
        }
        var sebelum = petaLama[negara + '|' + nama];
        var b = KEAHLIAN.bahan(bhn);
        /* Kolom yang TIDAK dicakup teks ini — halal, pedas, alergen, waktu
           masak, deskripsi, foto — diwarisi dari baris lamanya. Impor untuk
           memperbarui tarif tidak boleh diam-diam menghapus daftar alergen
           yang disusun orang lain. */
        return {
          /* Id lama dipertahankan bila nama DAN negaranya sama — mengganti id
             akan memutus baris keranjang dan pesanan yang menunjuk ke sana. */
          id: (sebelum && sebelum.id) || KEAHLIAN.kodeBaru(),
          negara: negara, nama: nama,
          hidangan: KEAHLIAN.hidangan(hid).kode,
          bahan: b.kode,
          tarif: tarif,
          minPorsi: Math.max(1, Math.round(+p[5] || 1)),
          ikon: p[6] || (sebelum && sebelum.ikon) || '🍽️',
          halal: b.nonHalal ? false : (sebelum ? sebelum.halal !== false : true),
          pedas: (sebelum && sebelum.pedas) || 'tidak',
          alergen: (sebelum && sebelum.alergen ? sebelum.alergen.slice() : []),
          menitMasak: (sebelum && sebelum.menitMasak) || 0,
          deskripsi: (sebelum && sebelum.deskripsi) || '',
          foto: (sebelum && sebelum.foto) || null,
          aktif: sebelum ? sebelum.aktif !== false : true
        };
      }).filter(Boolean);

      if (salah.length) {
        UI.toast(T('Ada baris yang tidak terbaca') + ' — ' + salah[0], 'err');
        return;
      }
      if (!baru.length) { UI.toast(T('Menu tidak boleh kosong'), 'err'); return; }

      DB.update('services', svcId, {
        keahlian: Object.assign({}, s.keahlian || {}, {
          menu: baru, bawaAlat: !!d.bawaAlat, catatanBawaan: d.catatanBawaan || ''
        })
      });
      KEAHLIAN.selaraskanHarga(svcId);
      /* Peringatkan bila impor MENGHILANGKAN masakan — itu penghapusan, dan
         orang yang hanya bermaksud mengubah tarif berhak tahu. */
      var hilang = menu.length - baru.filter(function (m) {
        return petaLama[m.negara + '|' + m.nama]; }).length;
      if (hilang > 0) {
        UI.toast(jml(hilang, T('1 masakan lama terhapus karena tidak ada di teks'),
          T('{n} masakan lama terhapus karena tidak ada di teks')), 'warn');
      }
      UI.toast(jml(baru.length, '1 masakan tersimpan', '{n} masakan tersimpan'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ PAGES */

  var pagesClient = {
    pesanKeahlian: { label: 'Pesan Jasa Keahlian', icon: '👨‍🍳', grup: 'Utama', tersembunyi: true,
      render: renderPesan, mount: mountPesan },
    keranjangJasa: { label: 'Keranjang Jasa', icon: '🛒', grup: 'Utama',
      sub: 'Pemesanan jasa keahlian yang belum di-checkout',
      render: renderKeranjang, mount: mountKeranjang,
      badge: function () { return APP.user ? KJASA.jumlah(APP.user.id) : 0; } }
  };

  var pageMitra = {
    label: 'Permintaan', icon: '⏱️', grup: 'Utama',
    render: renderPermintaan, mount: mountPermintaan,
    badge: function () { return APP.user ? KEAHLIAN.permintaanMitra(APP.user.id).length : 0; }
  };

  var pagesAdmin = {
    keahlian: { label: 'Jasa Keahlian', icon: '👨‍🍳', grup: 'Master Data',
      render: renderAdmin, mount: mountAdmin,
      badge: function () { return KEAHLIAN.statistik().menunggu; } },
    /* Tersembunyi dari menu: selalu dibuka dari satu layanan tertentu. */
    keahlianMenu: { label: 'Kelola Menu', icon: '🍽️', grup: 'Master Data', tersembunyi: true,
      render: renderMenuAdmin, mount: mountMenuAdmin }
  };

  return {
    pagesClient: pagesClient, pageMitra: pageMitra, pagesAdmin: pagesAdmin,
    dialogMenu: dialogMenu
  };
})();
