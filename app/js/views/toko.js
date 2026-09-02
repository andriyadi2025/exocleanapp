/* ==========================================================================
   views/toko.js — TOKO PERLENGKAPAN KEBERSIHAN
   --------------------------------------------------------------------------
   Klien : katalog produk, keranjang, checkout, riwayat pesanan
   Admin : master produk & stok, pengelolaan pesanan sampai pengiriman
   ========================================================================== */
var Toko = (function () {

  var T = function (s) { return I18N.t(s); };

  var ONGKIR = 50000;   // ongkos kirim flat area Jabodetabek
  var GRATIS_ONGKIR = 2000000;
  var Ppn = 11;

  /* ================================================================ KERANJANG */
  /* pilih menentukan apakah barang ini ikut dibeli. Keranjang bukan lagi
     daftar yang harus dibeli seluruhnya: orang menumpuk barang di sana selama
     berhari-hari, lalu membayar sebagiannya saja. Memaksa semuanya ikut
     membuat mereka menghapus barang yang sebenarnya masih diinginkan. */
  /* Satu produk bisa muncul beberapa kali di keranjang — merah dan biru
     adalah dua baris, bukan satu. Karena itu identitas sebuah baris BUKAN
     productId saja, melainkan produk + varian. Semua tempat yang mencari,
     mengubah, atau menghapus baris memakai kunci ini; yang memakai productId
     saja akan mengenai semua varian sekaligus. */
  var keranjang = [];                       // [{productId, varianId, qty, pilih}]

  function kunciItem(productId, varianId) { return productId + '|' + (varianId || ''); }
  function kunciDari(k) { return kunciItem(k.productId, k.varianId); }
  function cariItem(productId, varianId) {
    var kk = kunciItem(productId, varianId);
    return keranjang.filter(function (x) { return kunciDari(x) === kk; })[0] || null;
  }
  /* Dibaca dari tombol: data-id wajib, data-var boleh kosong untuk produk
     tanpa varian. */
  function targetDari(el) {
    return { id: el.getAttribute('data-id'), varianId: el.getAttribute('data-var') || null };
  }
  var filterKat = 'semua';
  /* Nilai urut yang tidak dikenal lagi (mis. 'nama' dan 'stok' yang sudah
     dilepas) dikembalikan ke bawaan. Tanpa ini, pemilihnya tampil tanpa satu
     pun opsi terpilih dan daftarnya terurut dengan cara yang tidak bisa
     dijelaskan oleh apa pun di layar. */
  function urutSah(v) {
    var ada = URUT_PRODUK.filter(function (x) { return x.v === v && !x.mati; })[0];
    return ada ? v : 'sesuai';
  }
  var cari = '';
  var draftKirim = { alamat: null, metode: 'va_bca', catatan: '' };

  /** Nama kanal untuk ditampilkan; menerima id kanal maupun teks bebas (data lama). */
  function labelMetode(v) {
    var c = PAY.channel(v);
    return c ? c.nama : (v || '—');
  }

  /** Harga yang dipakai keranjang selalu harga tayang — sudah termasuk diskon kampanye. */
  function isiKeranjang() {
    return keranjang.map(function (k) {
      var p = BIZ.produk(k.productId);
      if (!p) return null;
      /* Harga dihitung menurut JUMLAH: tingkat grosir baru berlaku setelah
         jumlahnya cukup. hargaUntuk() juga yang memutuskan antara grosir dan
         diskon kampanye — keduanya tidak ditumpuk. */
      var ht = PRODUKED.hargaUntuk(p, k.qty);
      /* Harga varian menggantikan harga dasar SEBELUM grosir dan kampanye
         dihitung — kalau tidak, potongan dihitung dari harga varian lain. */
      if (k.varianId && VARIAN.punya(p)) {
        var hv = VARIAN.harga(p, k.varianId);
        var semu = Object.assign({}, p, { harga: hv });
        ht = PRODUKED.hargaUntuk(semu, k.qty);
      }
      return { productId: k.productId, varianId: k.varianId || null,
        varianLabel: k.varianId ? VARIAN.label(p, k.varianId) : '',
        qty: k.qty, pilih: k.pilih !== false,
        /* Stok bisa habis SETELAH barang masuk keranjang — orang menaruhnya
           berhari-hari sebelum membayar. Ditandai di sini, satu tempat, supaya
           tidak ada layar yang lupa memeriksanya dan menagih barang yang tidak
           bisa dikirim. */
        /* Habis dinilai pada varian yang dipilih, bukan pada jumlah seluruh
           varian: biru masih ada tidak membuat merah bisa dikirim. */
        habis: k.varianId && VARIAN.punya(p)
          ? VARIAN.stok(p, k.varianId) <= 0
          : statusStok(p) === 'habis',
        harga: ht.harga, hargaAsli: ht.asli,
        kampanye: ht.kampanye, bebanSeller: (ht.bebanSeller || 0) * k.qty,
        bebanExoclean: (ht.bebanExoclean || 0) * k.qty, produk: p };
    }).filter(Boolean);
  }
  /**
   * Kelompokkan isi keranjang per toko — satu keranjang bisa jadi beberapa
   * pesanan. Ongkir dihitung dari jarak gudang toko ke titik alamat pembeli;
   * bila salah satu titik belum ditandai, dipakai tarif dasar.
   */
  function perToko(items, tujuan) {
    var g = {}, urut = [];
    items.forEach(function (i) {
      var sid = i.produk.sellerId || '';
      if (!g[sid]) { g[sid] = []; urut.push(sid); }
      g[sid].push(i);
    });
    return urut.map(function (sid) {
      var isi = g[sid];
      var sub = U.sum(isi, function (i) { return i.qty * i.harga; });
      var hitung = MAPS.ongkir(MAPS.titikToko(sid || null), tujuan || titikTujuan(), sub);
      var ongkir = hitung.tarif;

      /* Berapa ongkirnya SEANDAINYA tidak gratis. Dihitung ulang dengan
         subtotal nol supaya ambang gratis ongkir tidak ikut berlaku — bukan
         angka karangan, melainkan tarif zona yang sama yang akan ditagih bila
         belanjaannya kurang. Itulah yang boleh dicoret di layar; mencoret
         angka yang tidak pernah dihitung berarti mengarang penghematan. */
      if (hitung.gratis) {
        hitung.tarifAsli = MAPS.ongkir(MAPS.titikToko(sid || null), tujuan || titikTujuan(), 0).tarif;
      }

      /* Bila pembeli sudah memilih kurir untuk toko ini, tarif kurirnyalah yang
         berlaku — bukan lagi tarif zona. Tarif zona tetap dipertahankan sebagai
         dasar sampai pilihan dibuat, dan sebagai jaring pengaman bila Biteship
         tidak bisa dihubungi. Gratis ongkir tetap mengalahkan keduanya: itu
         janji ke pembeli, bukan hasil hitungan kurir. */
      var pil = kurirDipilih[sid || 'resmi'];
      if (pil && !hitung.gratis) {
        ongkir = pil.harga;
        hitung = { tarif: pil.harga, km: hitung.km, gratis: false, perkiraan: !!pil.simulasi,
          zona: KIRIM.ringkas(pil), kurir: pil };
      }

      return { sellerId: sid || null, nama: SELLER.namaToko(sid || null), items: isi,
        subtotal: sub, ongkir: ongkir, ongkirInfo: hitung, kurirPilihan: pil || null,
        bebanSeller: U.sum(isi, function (i) { return i.bebanSeller; }),
        bebanExoclean: U.sum(isi, function (i) { return i.bebanExoclean; }),
        total: BIZ.hitungToko(isi, ongkir, Ppn, 0).total };
    });
  }

  /* ================================================================ KURIR
     Tarif kurir datang dari jaringan, sedangkan keranjang digambar secara
     serentak. Jadi hasilnya disimpan di sini begitu tiba, lalu keranjang
     digambar ulang — bukan menahan tampilan sampai balasan datang. Kuncinya
     memuat tujuan dan berat, supaya mengubah alamat atau jumlah barang
     otomatis membatalkan tarif lama alih-alih diam-diam memakainya. */
  var kurirDipilih = {};   /* sellerId|'resmi' → opsi tarif terpilih */
  var kurirOpsi = {};      /* sellerId|'resmi' → { memuat, kunci, sumber, opsi[], catatan } */

  function kunciTarif(sid, tujuan, berat) {
    var a = alamatTujuan();
    return [sid || 'resmi', (a && a.id) || '-', berat,
            tujuan ? tujuan.lat + ',' + tujuan.lng : '-'].join('|');
  }

  /** Ambil tarif untuk satu kelompok toko bila belum ada / sudah tidak berlaku. */
  function muatTarif(grup) {
    var sid = grup.sellerId || 'resmi';
    var berat = KIRIM.totalBerat(grup.items.map(function (i) {
      return { productId: i.produk.id, varianId: i.varianId || null, qty: i.qty }; }));
    var kunci = kunciTarif(grup.sellerId, titikTujuan(), berat);
    var ada = kurirOpsi[sid];
    if (ada && ada.kunci === kunci) return;

    kurirOpsi[sid] = { memuat: true, kunci: kunci, opsi: [] };
    /* Pilihan lama dilepas: tarifnya dihitung untuk tujuan atau berat yang
       sudah berubah, jadi mempertahankannya berarti menagih angka yang salah. */
    delete kurirDipilih[sid];

    var a = alamatTujuan();
    KIRIM.tarif({
      sellerId: grup.sellerId,
      tujuan: { kodePos: a && a.kodePos, alamat: a && a.teks,
                lat: titikTujuan() && titikTujuan().lat, lng: titikTujuan() && titikTujuan().lng },
      items: grup.items.map(function (i) {
        return { productId: i.produk.id, varianId: i.varianId || null,
                 varianLabel: i.varianLabel || '', qty: i.qty, harga: i.harga }; }),
      beratGram: berat
    }).then(function (h) {
      if (!kurirOpsi[sid] || kurirOpsi[sid].kunci !== kunci) return;  /* sudah basi */
      kurirOpsi[sid] = { memuat: false, kunci: kunci, sumber: h.sumber,
                         opsi: h.opsi, catatan: h.catatan };

      /* Kurir termurah dipilihkan begitu tarifnya tiba. Tanpa ini, pembeli
         yang tidak menyentuh daftar kurir akan ditagih TARIF ZONA — angka
         cadangan buatan aplikasi yang tidak pernah menjadi harga kurir mana
         pun, dan yang tidak bisa dipertanggungjawabkan ketika paketnya benar
         benar dipesan. Pilihannya tetap bisa diganti; yang dihindari adalah
         menagih angka yang bukan milik siapa-siapa. */
      if (!kurirDipilih[sid] && h.opsi && h.opsi.length) {
        kurirDipilih[sid] = h.opsi.reduce(function (a, b) {
          return b.harga < a.harga ? b : a; });
      }
      gambarKeranjang();
    });
  }

  /**
   * Gambar ulang setelah tarif kurir tiba.
   *
   * Tarifnya datang belakangan lewat jaringan, dan yang menunggunya bisa dua
   * layar berbeda. Dulu fungsi ini hanya tahu satu: kalau kotak keranjang
   * tidak ada, ia diam saja. Akibatnya di halaman checkout tarif yang sudah
   * sampai tidak pernah tergambar — baris pengirimannya tetap menampilkan
   * tarif zona sebagai cadangan, dan pembeli membayar angka yang bukan tarif
   * kurir mana pun.
   */
  function gambarKeranjang() {
    var box = U.$('#keranjang');
    if (box) { box.innerHTML = panelKeranjang(); return; }
    /* Halaman checkout tidak punya kotak yang bisa ditambal sepotong: harga,
       ringkasan, dan bilah bayar semuanya ikut berubah — jadi digambar ulang
       seluruhnya.

       Ditunda satu tick karena muatTarif() dipanggil SAAT halamannya masih
       berupa untaian teks. Pada mode simulasi tarifnya selesai seketika, dan
       pemeriksaan elemen yang dijalankan langsung selalu gagal — halamannya
       belum masuk DOM. Akibatnya kurir yang sudah terpilih tidak pernah
       tergambar, dan yang tertulis di layar tetap tarif zona. */
    setTimeout(function () { if (U.$('.ck')) APP.refresh(); }, 0);
  }

  /* Berapa layanan kurir yang ditampilkan sebelum daftarnya dilipat.
     Biteship mengembalikan dua belas layanan atau lebih untuk satu tujuan,
     dan menampilkan semuanya membuat barang belanjaan sendiri terdorong jauh
     ke bawah layar. Empat teratas sudah yang termurah — sisanya jarang
     dipilih, tetapi tetap bisa dibuka. */
  var KURIR_TAMPIL = 4;
  var kurirLengkap = {};      /* sellerId -> true bila daftarnya sedang dibuka */

  /** Daftar pilihan kurir untuk satu kelompok toko. */
  function pilihanKurirHTML(grup) {
    var sid = grup.sellerId || 'resmi';
    var st = kurirOpsi[sid];

    if (grup.ongkirInfo.gratis) {
      return '<div class="tbl-sub mt-1">🎁 ' +
        'Gratis ongkir — kurir dipilihkan EXOCLEAN.' + '</div>';
    }
    if (!st || st.memuat) {
      return '<div class="tbl-sub mt-1">⏳ Mengambil tarif kurir…</div>';
    }
    if (!st.opsi.length) {
      return '<div class="tbl-sub mt-1">' + T('Tidak ada layanan kurir untuk tujuan ini.') + '</div>';
    }

    var pil = kurirDipilih[sid];

    /* Yang sedang DIPILIH selalu ikut tampil meski berada di luar empat
       teratas. Tanpa itu, pembeli yang memilih kurir termahal lalu menggulir
       kembali akan melihat pilihannya lenyap dan mengira batal tersimpan. */
    var semua = st.opsi;
    var buka = kurirLengkap[sid];
    var tampil = semua;
    if (!buka && semua.length > KURIR_TAMPIL) {
      tampil = semua.slice(0, KURIR_TAMPIL);
      if (pil && tampil.indexOf(pil) < 0) {
        var terpilih = semua.filter(function (o) {
          return o.kurir === pil.kurir && o.layanan === pil.layanan; })[0];
        if (terpilih && tampil.indexOf(terpilih) < 0) tampil = tampil.concat([terpilih]);
      }
    }

    return (st.catatan ? '<div class="tbl-sub mt-1">' + U.esc(st.catatan) + '</div>' : '') +
      '<div class="kurir-list mt-1">' + tampil.map(function (o) {
        var on = pil && pil.kurir === o.kurir && pil.layanan === o.layanan;
        return '<button type="button" class="kurir' + (on ? ' on' : '') + '" ' +
            'data-act="pilih-kurir" data-sid="' + U.esc(sid) + '" ' +
            'data-kurir="' + U.esc(o.kurir) + '" data-layanan="' + U.esc(o.layanan) + '">' +
          '<span class="kurir__ic">' + KIRIM.ikonKurir(o.kurir) + '</span>' +
          '<span class="kurir__body"><b>' + U.esc(o.kurirNama || o.kurir) + ' · ' +
            U.esc(o.layananNama || o.layanan) + '</b>' +
            (o.etd ? '<small>' + U.esc(o.etd) + '</small>' : '') + '</span>' +
          '<span class="kurir__harga">' + U.rp(o.harga) + '</span>' +
        '</button>';
      }).join('') + '</div>' +
      (semua.length > KURIR_TAMPIL
        ? '<button type="button" class="kurir-lagi" data-act="kurir-lagi" ' +
            'data-sid="' + U.esc(sid) + '">' +
            (buka ? T('Tampilkan lebih sedikit')
                  : T('Lihat semua') + ' ' + semua.length + ' ' + T('layanan') + ' ›') +
          '</button>'
        : '');
  }
  /* jumlahItem menghitung SELURUH isi keranjang — itu yang muncul di lencana
     menu, dan lencana yang menyusut ketika orang membuka centang akan terbaca
     seperti barangnya hilang. Yang dipakai untuk menghitung uang selalu
     terpilih(). */
  /* ================================================================ WISHLIST
     Disimpan pada dokumen pengguna, sama seperti alamat dan rekening — bukan
     di keranjang. Keranjang adalah niat membeli sekarang; wishlist adalah
     niat membeli nanti, dan keduanya bertahan dengan cara yang berbeda:
     keranjang boleh hilang saat pesanan terbentuk, wishlist tidak.

     Isinya hanya daftar id produk. Harga, stok, dan promo TIDAK ikut disimpan
     — barang bisa mengendap berbulan-bulan di sana, dan angka yang dibekukan
     saat disimpan akan menjadi janji yang salah ketika dibuka lagi. */
  function wishlist() { return (APP.user && APP.user.wishlist) || []; }
  function diWishlist(id) { return wishlist().indexOf(id) >= 0; }
  function simpanWishlist(list) {
    DB.update('users', APP.user.id, { wishlist: list });
    APP.perbaruiSesi(DB.find('users', APP.user.id));
  }
  function tambahWishlist(id) {
    if (diWishlist(id)) return false;
    simpanWishlist(wishlist().concat([id]));
    return true;
  }
  function buangWishlist(id) {
    simpanWishlist(wishlist().filter(function (x) { return x !== id; }));
  }

  function jumlahItem() { return U.sum(keranjang, function (k) { return k.qty; }); }
  /* Barang yang stoknya habis TIDAK PERNAH ikut terpilih, apa pun keadaan
     centangnya. Disaring di satu fungsi ini saja — semua yang menghitung uang
     (ringkasan, tombol Beli, checkout, pembuatan pesanan) lewat sini, jadi
     tidak ada jalur yang bisa lolos membeli barang yang tidak ada. */
  function terpilih(items) {
    return items.filter(function (i) { return i.pilih && !i.habis; });
  }
  function bisaDipilih(items) { return items.filter(function (i) { return !i.habis; }); }
  function jumlahPilih() { return terpilih(isiKeranjang()).length; }
  function semuaDipilih() {
    var bisa = bisaDipilih(isiKeranjang());
    return bisa.length > 0 && terpilih(isiKeranjang()).length === bisa.length;
  }
  function setPilih(id, on) {
    keranjang.forEach(function (k) { if (kunciDari(k) === id) k.pilih = on; });
  }

  /** Titik tujuan pengiriman: alamat yang dipilih pembeli, atau alamat utamanya. */
  var alamatPilih = null;
  function alamatTujuan() {
    var list = BIZ.alamatList(APP.user);
    if (alamatPilih) {
      var a = list.filter(function (x) { return x.id === alamatPilih; })[0];
      if (a) return a;
    }
    return BIZ.alamatUtama(APP.user);
  }
  function titikTujuan() {
    var a = alamatTujuan();
    return a && MAPS.valid(a.koordinat) ? a.koordinat : null;
  }
  function ongkirSekarang(subtotal) { return subtotal >= GRATIS_ONGKIR ? 0 : (subtotal > 0 ? ONGKIR : 0); }

  /** Hanya produk yang boleh tayang: Toko Resmi, atau mitra toko aktif yang lolos moderasi. */
  function katalog() { return SELLER.produkTayang(); }

  function kategoriList() {
    var out = [];
    katalog().forEach(function (p) { if (out.indexOf(p.kategori) < 0) out.push(p.kategori); });
    return out;
  }

  /* ---- urutkan & filter katalog produk ---- */
  /* Urutannya mengikuti seberapa sering dipakai, bukan abjad: "Paling sesuai"
     lebih dulu karena itu bawaannya, lalu yang paling sering dipilih orang.

     "Ulasan" mengurutkan menurut RATA-RATA, tetapi produk tanpa ulasan tidak
     dianggap berbintang nol — ia hanya turun ke bawah yang sudah punya. Nol
     berarti "dinilai buruk", dan menyamakannya dengan "belum dinilai"
     menghukum barang baru atas sesuatu yang belum pernah terjadi. */
  var URUT_PRODUK = [
    { v: 'sesuai',  l: 'Paling sesuai' },
    { v: 'laris',   l: 'Terlaris' },
    { v: 'ulasan',  l: 'Ulasan' },
    { v: 'baru',    l: 'Terbaru' },
    { v: 'mahal',   l: 'Harga tertinggi' },
    { v: 'murah',   l: 'Harga terendah' }
  ];
  /* Tiga daftar pilihan lama (toko / harga / ketersediaan) sudah pindah ke
     lembar Filter, yang menyaring hal yang sama dan lebih banyak. Dibuang,
     bukan ditinggal: dua tempat menyaring hal yang sama akan saling menimpa,
     dan yang satu tidak akan pernah tahu yang lain sedang menyala. */
  var urut = 'sesuai';

  /* ============================================================ LEMBAR FILTER
     Disunting pada SALINAN, bukan langsung pada filter yang berlaku. Menyaring
     ulang di belakang lembar setiap kali satu kotak ditekan membuat daftar di
     baliknya berubah-ubah sementara orang masih memilih — dan menutup lembar
     tanpa menekan apa pun akan meninggalkan hasil yang sudah terlanjur berubah.
     Yang berlaku hanya setelah Terapkan. */
  var draf = null;

  function chip(aktif, teks, act, data, mati, sebabMati) {
    var d = Object.keys(data || {}).map(function (k) {
      return ' data-' + k + '="' + U.esc(String(data[k])) + '"'; }).join('');
    return '<button class="fchip' + (aktif ? ' fchip--on' : '') + (mati ? ' fchip--mati' : '') +
      '" data-act="' + act + '"' + d + (mati ? ' disabled title="' + U.esc(sebabMati || '') + '"' : '') +
      '>' + teks + '</button>';
  }

  function bagian(judul, isi, kanan) {
    return '<div class="fsec">' +
      '<div class="fsec__kepala"><h4>' + U.esc(judul) + '</h4>' +
        (kanan ? '<div class="spacer"></div>' + kanan : '') + '</div>' +
      '<div class="fsec__isi">' + isi + '</div></div>';
  }

  var lokasiPenuh = false;   /* "Lihat semua" pada daftar kota */

  function isiLembar() {
    var d = draf;
    var semua = katalog();
    var bisaJarak = PFILTER.bisaJarak();
    /* Alasan matinya disebutkan, bukan cuma diredupkan. Kontrol mati tanpa
       sebab membuat orang mengira aplikasinya rusak. */
    var sebabJarak = T('Tambahkan titik peta pada alamat utama Anda dulu — tanpa koordinat, ' +
      'jarak ke toko tidak bisa dihitung.');

    var kota = PFILTER.kotaList(semua);
    var kotaTampil = lokasiPenuh ? kota : kota.slice(0, 5);
    var rentang = PFILTER.rentangHarga(semua);

    return bagian(T('Gratis Ongkir'),
        chip(d.gratisOngkir, '🚚 ' + T('Gratis Ongkir'), 'f-gratis', {})) +

      bagian(T('Jarak toko ke alamatmu'),
        [5, 20].map(function (km) {
          return chip(d.radiusKm === km, T('Radius') + ' ' + km + ' km',
            'f-radius', { km: km }, !bisaJarak, sebabJarak);
        }).join('') +
        (bisaJarak ? '' : '<div class="fsec__sebab">' + sebabJarak + '</div>')) +

      bagian(T('Lokasi'),
        (kotaTampil.length
          ? kotaTampil.map(function (k) {
              return chip(d.lokasi.indexOf(k.kota) >= 0,
                U.esc(k.kota) + ' <span class="fchip__n">' + k.n + '</span>',
                'f-lokasi', { v: k.kota });
            }).join('')
          : '<div class="fsec__sebab">' + T('Belum ada toko yang bisa dipilih.') + '</div>'),
        kota.length > 5
          ? '<button class="flink" data-act="f-lokasi-semua">' +
            (lokasiPenuh ? T('Lebih sedikit') : T('Lihat semua')) + '</button>'
          : '') +

      /* "Jenis toko" memakai pembagian yang BENAR-BENAR ada di aplikasi ini —
         toko sendiri dan mitra — bukan istilah yang tidak punya arti di sini
         dan tidak menyaring apa pun. */
      bagian(T('Jenis toko'),
        chip(d.jenisToko.indexOf('resmi') >= 0, '🏢 ' + T('Toko Resmi EXOCLEAN'), 'f-jenis', { v: 'resmi' }) +
        chip(d.jenisToko.indexOf('mitra') >= 0, '🤝 ' + T('Mitra Toko'), 'f-jenis', { v: 'mitra' })) +

      bagian(T('Harga'),
        '<div class="fharga">' +
          '<label class="fharga__k"><span>Rp</span>' +
            '<input type="number" min="0" id="f-harga-min" data-change="f-harga-min" ' +
              'placeholder="' + T('Harga terendah') + '" value="' +
              (d.hargaMin === null ? '' : d.hargaMin) + '"></label>' +
          '<span class="fharga__pisah">—</span>' +
          '<label class="fharga__k"><span>Rp</span>' +
            '<input type="number" min="0" id="f-harga-maks" data-change="f-harga-maks" ' +
              'placeholder="' + T('Harga tertinggi') + '" value="' +
              (d.hargaMax === null ? '' : d.hargaMax) + '"></label>' +
        '</div>' +
        /* Rentang siap-pakai dihitung dari harga yang ada di katalog, jadi
           tidak ada pilihan yang isinya pasti nol. */
        (rentang.length
          ? '<div class="fbaris">' + rentang.map(function (r) {
              return chip(d.hargaMin === r.min && d.hargaMax === r.max,
                U.rp(r.min) + ' – ' + U.rp(r.max), 'f-rentang',
                { min: r.min, maks: r.max });
            }).join('') + '</div>'
          : '')) +

      bagian(T('Rating 4 ke atas'),
        chip(d.rating4, '⭐ ' + T('Rating 4 ke atas'), 'f-rating', {})) +

      /* Bukan T('Penawaran'): kunci itu sudah dipakai halaman Penawaran
         (sales quotation) dan diterjemahkan jadi "Quotations". Judul yang
         sama persis di dua tempat dengan arti berbeda hanya bisa dipisahkan
         dengan kunci yang berbeda. */
      bagian(T('Penawaran khusus'),
        chip(d.penawaran.indexOf('cod') >= 0, T('COD'), 'f-tawar', { v: 'cod' }) +
        chip(d.penawaran.indexOf('diskon') >= 0, T('Harga diskon'), 'f-tawar', { v: 'diskon' })) +

      bagian(T('Kondisi'),
        chip(d.kondisi.indexOf('bekas') >= 0, T('Bekas'), 'f-kondisi', { v: 'bekas' }) +
        chip(d.kondisi.indexOf('baru') >= 0, T('Baru'), 'f-kondisi', { v: 'baru' })) +

      bagian(T('Terakhir ditambahkan'),
        /* Ditulis utuh, bukan angka + satuan. Bahasa lain mengubah satuannya
           menurut angkanya — "1 " + "months" menghasilkan "1 months". */
        [{ h: 7, l: T('7 hari') }, { h: 14, l: T('14 hari') },
         { h: 30, l: T('1 bulan') }, { h: 90, l: T('3 bulan') }].map(function (x) {
          return chip(d.baruHari === x.h, x.l, 'f-baru', { h: x.h });
        }).join('')) +

      bagian(T('Lainnya'),
        chip(d.lainnya.indexOf('stok') >= 0, T('Stok tersedia'), 'f-lain', { v: 'stok' }) +
        chip(d.lainnya.indexOf('preorder') >= 0, T('Preorder'), 'f-lain', { v: 'preorder' })) +

      bagian(T('Durasi pengiriman'),
        chip(d.kirim.indexOf('instan') >= 0, T('Instan'), 'f-kirim', { v: 'instan' }, !bisaJarak, sebabJarak) +
        chip(d.kirim.indexOf('sameday') >= 0, T('Same day'), 'f-kirim', { v: 'sameday' }, !bisaJarak, sebabJarak) +
        '<div class="fsec__sebab">' +
          (bisaJarak
            ? T('Menyaring toko yang cukup dekat untuk dijangkau kurir instan ' +
                '(≤ {a} km) dan sehari-sampai (≤ {b} km). Pilihan kurir yang ' +
                'sebenarnya tetap ditentukan saat checkout.')
                .replace('{a}', PFILTER.radiusKirim('instan'))
                .replace('{b}', PFILTER.radiusKirim('sameday'))
            : sebabJarak) +
        '</div>');
  }

  /* Aksi lembar diserahkan ke modal, bukan ke root halaman: lembarnya hidup
     di #modal-root, di luar jangkauan U.delegate(root) milik halaman ini. */
  function aksiLembar() {
    function ubah(fn) { return function (el) { fn(el); gambarLembar(); }; }
    return {
      'f-gratis': ubah(function () { draf.gratisOngkir = !draf.gratisOngkir; }),
      /* Radius adalah SATU pilihan, bukan daftar centang: dua radius sekaligus
         berarti yang lebih besar saja, dan menawarkannya cuma membuat orang
         mengira ada bedanya. Menekan yang sedang menyala melepaskannya. */
      'f-radius': ubah(function (el) {
        var km = +el.getAttribute('data-km');
        draf.radiusKm = draf.radiusKm === km ? 0 : km;
      }),
      'f-lokasi': ubah(function (el) { PFILTER.nyalaMati(draf.lokasi, el.getAttribute('data-v')); }),
      'f-lokasi-semua': ubah(function () { lokasiPenuh = !lokasiPenuh; }),
      'f-jenis': ubah(function (el) { PFILTER.nyalaMati(draf.jenisToko, el.getAttribute('data-v')); }),
      'f-rentang': ubah(function (el) {
        var min = +el.getAttribute('data-min'), maks = +el.getAttribute('data-maks');
        var sama = draf.hargaMin === min && draf.hargaMax === maks;
        draf.hargaMin = sama ? null : min;
        draf.hargaMax = sama ? null : maks;
      }),
      'f-rating': ubah(function () { draf.rating4 = !draf.rating4; }),
      'f-tawar': ubah(function (el) { PFILTER.nyalaMati(draf.penawaran, el.getAttribute('data-v')); }),
      'f-kondisi': ubah(function (el) { PFILTER.nyalaMati(draf.kondisi, el.getAttribute('data-v')); }),
      'f-baru': ubah(function (el) {
        var h = +el.getAttribute('data-h');
        draf.baruHari = draf.baruHari === h ? 0 : h;
      }),
      'f-lain': ubah(function (el) { PFILTER.nyalaMati(draf.lainnya, el.getAttribute('data-v')); }),
      'f-kirim': ubah(function (el) { PFILTER.nyalaMati(draf.kirim, el.getAttribute('data-v')); }),

      'f-reset': ubah(function () { draf = PFILTER.kosong(); lokasiPenuh = false; }),

      'f-terap': function (el) {
        PFILTER.pakai(draf);
        var tutup = el.closest('.modal-back');
        var x = tutup && tutup.querySelector('[data-close]');
        if (x) x.click();
        APP.refresh();
      }
    };
  }

  /* Kotak harga dibaca saat berubah, bukan saat lembarnya digambar ulang:
     menggambar ulang seluruh isi setiap ketikan akan merebut fokus dari
     kotak yang sedang diisi. Karena itu keduanya TIDAK memanggil
     gambarLembar(), hanya menyegarkan angka di tombol. */
  function bacaKotakHarga(el, kunci) {
    var v = String(el.value || '').trim();
    draf[kunci] = v === '' ? null : Math.max(0, Math.round(+v) || 0);
    /* Batas terbalik adalah salah ketik, bukan permintaan. Dibiarkan apa
       adanya, hasilnya nol produk tanpa sebab yang terlihat. */
    if (draf.hargaMin !== null && draf.hargaMax !== null && draf.hargaMin > draf.hargaMax) {
      var t = draf.hargaMin; draf.hargaMin = draf.hargaMax; draf.hargaMax = t;
    }
    segarkanKakiLembar();
  }

  function bukaLembarFilter() {
    draf = PFILTER.salin();
    lokasiPenuh = false;
    gambarLembar();
  }

  /* Hanya isi lembar yang digambar ulang saat memilih — bukan seluruh
     halaman. APP.refresh() akan menutup lembarnya sendiri dan membuang
     posisi gulir, dan memilih di tengah daftar panjang jadi mustahil. */
  function gambarLembar() {
    var ada = document.getElementById('lembar-filter');
    if (ada) { ada.querySelector('.fsheet__isi').innerHTML = isiLembar(); segarkanKakiLembar(); return; }
    UI.sheet({
      id: 'lembar-filter', judul: T('Filter'),
      isi: '<div class="fsheet__isi">' + isiLembar() + '</div>',
      aksi: aksiLembar(),
      onMount: function (root) {
        root.addEventListener('change', function (ev) {
          var k = ev.target.getAttribute && ev.target.getAttribute('data-change');
          if (k === 'f-harga-min') bacaKotakHarga(ev.target, 'hargaMin');
          if (k === 'f-harga-maks') bacaKotakHarga(ev.target, 'hargaMax');
        });
      },
      kaki: '<div class="fsheet__kaki">' +
        '<button class="btn btn--ghost" data-act="f-reset">' + T('Atur ulang') + '</button>' +
        '<button class="btn btn--blok" data-act="f-terap"><span id="f-terap-teks">' +
          T('Terapkan') + '</span></button></div>',
      onTutup: function () { draf = null; }
    });
    segarkanKakiLembar();
  }

  /* Jumlah hasil dihitung dengan draf, jadi angka di tombol Terapkan adalah
     yang akan benar-benar didapat. Tombol yang menjanjikan angka lalu
     memberi angka lain lebih buruk daripada tidak menyebut angka. */
  function segarkanKakiLembar() {
    var t = document.getElementById('f-terap-teks');
    if (!t || !draf) return;
    var n = produkTampil(draf).length;
    t.textContent = n
      ? T('Tampilkan') + ' ' + n + ' ' + T('produk')
      : T('Tidak ada produk yang cocok');
    t.parentNode.disabled = !n;
  }

  function filterProdukAktif() {
    return !!(cari || filterKat !== 'semua' || urut !== 'sesuai' || PFILTER.adaYangAktif());
  }

  /**
   * Daftar produk yang lolos pencarian, kategori, dan filter.
   *
   * `saring` boleh diisi keadaan filter mana pun. Lembar filter memakainya
   * untuk menghitung "Tampilkan N produk" memakai DRAF — angka pada tombol
   * harus yang benar-benar akan didapat, bukan hasil filter yang masih
   * berlaku sekarang.
   */
  function produkTampil(saring) {
    var f = saring || PFILTER.state();
    var q = cari.toLowerCase().trim();
    var hasil = katalog().filter(function (p) {
      if (filterKat !== 'semua' && p.kategori !== filterKat) return false;
      if (q && (p.nama + ' ' + p.kode + ' ' + p.merek + ' ' + (p.deskripsi || '')).toLowerCase().indexOf(q) < 0) return false;
      return PFILTER.cocok(p, f);
    });

    /* Harga yang dipakai mengurutkan adalah HARGA TAYANG, bukan harga dasar —
       kalau tidak, produk berdiskon melompat ke posisi yang tidak sesuai
       dengan angka yang benar-benar dilihat pembeli. */
    if (urut === 'murah')  return U.sortBy(hasil, function (p) { return SELLER.hargaTayang(p).harga; });
    if (urut === 'mahal')  return U.sortBy(hasil, function (p) { return SELLER.hargaTayang(p).harga; }, true);
    if (urut === 'baru')   return U.sortBy(hasil, function (p) { return p.createdAt || ''; }, true);

    /* Terlaris dihitung dari pesanan yang sungguh terjadi — bukan angka yang
       disimpan pada produk. Angka tersimpan akan melenceng begitu ada pesanan
       dibatalkan, dan tidak ada yang memperbaikinya.

       terjualProduk() menelusuri seluruh shopOrders untuk SATU produk, jadi
       memanggilnya di dalam pembanding berarti menelusurinya berulang kali
       untuk produk yang sama. Dihitung sekali di depan. */
    if (urut === 'laris') {
      var laku = {};
      hasil.forEach(function (p) { laku[p.id] = terjualProduk(p.id); });
      return U.sortBy(hasil, function (p) { return laku[p.id]; }, true);
    }

    /* Rata-rata dulu, lalu JUMLAH ulasan sebagai pemecah seri: bintang 5 dari
       satu orang tidak sepantasnya mengalahkan bintang 4,8 dari lima puluh
       orang. Produk tanpa ulasan mendapat -1 supaya berada di bawah semua
       yang sudah dinilai, tanpa dianggap bernilai nol. */
    if (urut === 'ulasan') {
      var nilaiSemua = ULASAN.ringkasSemua();
      return U.sortBy(hasil, function (p) {
        var r = nilaiSemua[p.id];
        return r ? r.rata * 1000 + Math.min(r.n, 999) : -1;
      }, true);
    }

    return U.sortBy(hasil, function (p) { return p.urutan; });
  }

  /**
   * Produk bersponsor untuk baris teratas katalog. Tayangnya dicatat di sini;
   * biaya baru dipotong ketika pembeli benar-benar menekan produknya.
   */
  function produkIklan() {
    var tipe = filterKat === 'semua' ? 'produk_sorot' : 'sponsor_kategori';
    var list = SELLER.iklanTayang(tipe, filterKat === 'semua' ? null : filterKat);
    var q = cari.toLowerCase().trim();
    return list.map(function (i) {
      var p = DB.find('products', i.produkId);
      if (!p) return null;
      if (filterKat !== 'semua' && p.kategori !== filterKat) return null;
      if (q && (p.nama + ' ' + p.merek).toLowerCase().indexOf(q) < 0) return null;
      return { iklan: i, produk: p };
    }).filter(Boolean).slice(0, 2);
  }

  function statusStok(p) {
    if (p.stok <= 0) return 'habis';
    if (p.stok <= (p.minStok || 0)) return 'menipis';
    return 'aman';
  }

  /* ================================================================ KLIEN: KATALOG */
  function clientKatalog() {
    var list = produkTampil();
    var kat = kategoriList();

    return '<div>' +
        UI.alert('brand', '<b>' + T('Belanja perlengkapan kebersihan langsung dari EXOCLEAN.') + '</b> ' +
          T('Chemical, alat, mesin, dan APD dengan kualitas yang kami pakai sendiri di lapangan.') + ' ' +
          T('Gratis ongkir untuk pembelian di atas') + ' ' + U.rp(GRATIS_ONGKIR) + ' (area Jabodetabek).', '🛒') +

        UI.bilahCari({
          cari: { id: 'cari-produk', nilai: cari, act: 'cari',
                  placeholder: T('Cari produk, merek, atau kode…') },
          kontrol: [
            { label: T('Urutkan'), nilai: urut, act: 'urut', opsi: URUT_PRODUK }
          ],
          filter: { act: 'buka-filter', n: PFILTER.jumlahAktif() },
          aktif: filterProdukAktif(), resetAct: 'reset-filter',
          hasil: list.length, satuanHasil: 'produk'
        }) +

        (wishlist().length
          ? '<div class="row mb-2"><div class="spacer"></div>' +
            '<button class="btn btn--ghost btn--sm" data-act="ke-wishlist-hal">♡ ' +
            T('Wishlist') + ' (' + wishlist().length + ')</button></div>'
          : '') +

        '<div class="tabs">' +
          '<button class="tab' + (filterKat === 'semua' ? ' active' : '') + '" data-act="kat" data-k="semua">' + T('Semua') +
            '<span class="n">' + katalog().length + '</span></button>' +
          kat.map(function (k) {
            var n = katalog().filter(function (p) { return p.kategori === k; }).length;
            return '<button class="tab' + (filterKat === k ? ' active' : '') + '" data-act="kat" data-k="' +
              U.esc(k) + '">' + U.esc(k) + '<span class="n">' + n + '</span></button>';
          }).join('') +
        '</div>' +

        (function () {
          var ads = produkIklan();
          if (!ads.length) return '';
          ads.forEach(function (a) { SELLER.catatTayang(a.iklan.id); });
          return judulBagian(T('Bersponsor')) +
            '<div class="pk-grid">' + ads.map(function (a) {
              return kartuProduk(a.produk, a.iklan); }).join('') + '</div>' +
            '<div class="tbl-sub mt-1" style="margin-bottom:4px">' +
            T('Produk di atas ditampilkan karena penjualnya memasang iklan. ' +
              'Harga dan stoknya tetap apa adanya.') + '</div>';
        })() +

        (list.length
          ? judulBagian(filterKat === 'semua' ? T('Semua produk') : U.esc(filterKat), list.length) +
            '<div class="pk-grid">' + list.map(function (p) { return kartuProduk(p, null); }).join('') + '</div>'
          : UI.empty('🔍', T('Produk tidak ditemukan'),
              T('Coba kata kunci lain atau pilih kategori berbeda.'))) +
    '</div>' +
    bilahKeranjang();
  }

  /**
   * Bilah keranjang yang menempel di dasar layar katalog.
   *
   * Sejak keranjang punya halaman sendiri, isinya tidak lagi terlihat sambil
   * memilih produk. Tanpa penanda apa pun, barang yang sudah dimasukkan
   * seolah lenyap — dan orang memasukkannya lagi, atau berhenti belanja
   * karena mengira kliknya tidak masuk. Bilah ini yang menggantikan panel
   * lama: menyatakan isinya ada, dan menjadi satu-satunya jalan ke sana.
   *
   * Yang ditampilkan SUBTOTAL, bukan total. Ongkir baru bisa dihitung
   * setelah alamat dan kurirnya dipilih di halaman keranjang; menampilkan
   * angka yang nanti berubah di halaman berikutnya membuat pembeli merasa
   * harganya diam-diam dinaikkan.
   */
  function bilahKeranjang() {
    if (!keranjang.length) return '';
    var semua = isiKeranjang();
    var dipilih = terpilih(semua);
    var subtotal = U.sum(dipilih, function (i) { return i.qty * i.harga; });

    /* Angkanya dihitung dari yang TERCENTANG, sama seperti di halaman
       keranjang — bilah yang menyebut angka lebih besar daripada yang nanti
       ditagih membuat pembeli mengira harganya berubah di tengah jalan.
       Barisnya menyebut keduanya begitu ada yang dilepas centang, supaya
       jelas mengapa jumlahnya tidak sama dengan isi keranjang. */
    var ket = dipilih.length === semua.length
      ? jumlahItem() + ' ' + T('barang')
      : dipilih.length + ' ' + T('dari') + ' ' + semua.length + ' ' + T('produk dipilih');

    return '<div class="krj-bar">' +
      '<div class="krj-bar__ki">' +
        '<div class="krj-bar__n">🛒 ' + ket + '</div>' +
        '<div class="krj-bar__rp">' + U.rp(subtotal) + '</div>' +
        '<div class="krj-bar__ket">' + T('belum termasuk ongkir & Ppn') + '</div>' +
      '</div>' +
      '<button class="btn" data-act="ke-keranjang">' + T('Lihat Keranjang') + '</button>' +
    '</div>';
  }

  /* ============================================================ HALAMAN KERANJANG
     Dulu panel yang menempel di sisi kanan katalog. Dipisah karena isinya
     bukan sekadar daftar: di dalamnya ada alamat pengiriman, pilihan kurir
     per toko, metode pembayaran, dan catatan — sebuah formulir checkout
     utuh yang dijejalkan ke kolom selebar sepertiga layar, dan yang pada
     layar telepon terdorong jauh ke bawah seluruh katalog.

     Lebarnya tetap dibatasi meski halamannya penuh. Kolom isian yang
     merentang selebar layar besar justru lebih sulit dibaca — mata
     kehilangan awal baris berikutnya. */
  function halamanKeranjang() {
    if (!keranjang.length) {
      return '<div class="krj-hal">' +
        UI.empty('🛒', T('Keranjang Anda masih kosong'),
          T('Barang yang Anda masukkan akan berkumpul di sini beserta ongkir ' +
            'dan totalnya, sebelum pesanan dikirim.')) +
        '<div class="row mt-3" style="justify-content:center">' +
          '<button class="btn" data-act="ke-toko">' + T('Mulai Belanja') + '</button>' +
        '</div></div>';
    }
    return '<div class="krj-hal">' +
      '<div class="row mb-2">' +
        '<button class="btn btn--ghost btn--sm" data-act="ke-toko">← ' +
          T('Lanjut belanja') + '</button>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--ghost btn--sm" data-act="ke-wishlist-hal">♡ ' +
          T('Wishlist') + (wishlist().length ? ' (' + wishlist().length + ')' : '') + '</button>' +
      '</div>' +
      '<div id="keranjang">' + panelKeranjang() + '</div>' +
    '</div>';
  }

  /** Apakah COD termasuk kanal pembayaran yang sedang aktif. */
  function bisaCOD() {
    if (!window.PAY) return false;
    return (PAY.kanalTersedia() || []).some(function (c) { return c.id === 'cod'; });
  }

  /**
   * Judul satu bagian katalog, dengan garis pendek di bawahnya.
   *
   * Garis itu bukan hiasan: katalog ini menumpuk beberapa bagian dalam satu
   * kolom yang bisa digulir panjang, dan tanpa penanda yang jelas kartu
   * bersponsor di atas terbaca seolah bagian dari daftar biasa di bawahnya.
   */
  function judulBagian(teks, n) {
    return '<div class="pk-judul">' +
      '<h3>' + teks + (n ? ' <span class="pk-judul__n">' + n + '</span>' : '') + '</h3>' +
    '</div>';
  }

  /* ======================================================== KARTU PRODUK
     Susunannya mengikuti kartu marketplace yang sudah dikenal pembeli:
     gambar persegi di atas, lalu nama, harga, penanda promo, dan asal
     barang. Urutan itu bukan selera — mata membaca kartu dari gambar ke
     harga, dan apa pun yang disisipkan di antara keduanya memperlambat
     seluruh baris.

     YANG SENGAJA TIDAK ADA: bintang rating. Aplikasi ini belum punya satu
     pun ulasan produk (lihat catatan pada detailProduk), dan bintang
     karangan pada layar tempat orang memutuskan belanja adalah berbohong
     kepada pembeli. Yang ditampilkan hanya angka yang benar-benar ada —
     jumlah terjual dihitung dari pesanan yang sungguh terjadi.

     Berat dan dimensi pindah ke halaman detail. Keduanya penting saat
     membandingkan ongkir, tetapi bukan saat memilih dari dua belas kartu
     sekaligus, dan di kartu keduanya menenggelamkan harga. */
  function kartuProduk(p, iklan) {
    /* Kartu katalog menandai "sudah di keranjang" bila ADA varian mana pun
       dari produk ini di sana — di kartu, yang berarti bagi mata adalah
       produknya, bukan varian tertentu. */
    var di = keranjang.filter(function (k) { return k.productId === p.id; })[0];
    var st = statusStok(p);
    var ht = SELLER.hargaTayang(p);
    var resmi = SELLER.tokoResmi(p.sellerId);
    var terjual = terjualProduk(p.id);
    var nilai = ULASAN.ringkas(p.id);
    var kota = resmi ? '' : (SELLER.toko(DB.find('users', p.sellerId)) || {}).kota || '';
    var media = (window.MEDIA ? MEDIA.produk(p) : []).filter(function (m) {
      return m.jenis === 'foto';
    });

    return '<article class="pk' + (di ? ' pk--on' : '') + (st === 'habis' ? ' pk--habis' : '') + '"' +
      (iklan ? ' data-iklan="' + iklan.id + '"' : '') + '>' +

      /* ---- gambar ---- */
      '<div class="pk__foto" data-act="buka-produk" data-id="' + p.id + '">' +
        '<span class="pk__ik"' + (media.length ? ' id="pkim-' + p.id + '"' : '') + '>' +
          U.ikon(p.icon) + '</span>' +
        (ht.kampanye ? '<span class="pk__diskon">−' + ht.kampanye.diskonPersen + '%</span>' : '') +
        /* Gratis ongkir berlaku atas SUBTOTAL keranjang, bukan per barang.
           Lencananya hanya dipasang bila harga satu unitnya saja sudah
           melewati ambang — di luar itu ia menjanjikan sesuatu yang belum
           tentu didapat pembeli, dan janji ongkir yang meleset di halaman
           bayar adalah alasan orang membatalkan keranjang. */
        (ht.harga >= GRATIS_ONGKIR
          ? '<span class="pk__ongkir">' + T('GRATIS ONGKIR') + '</span>' : '') +
        (iklan ? '<span class="pk__ads" title="' + T('Konten bersponsor') + '">' +
          T('Ad') + '</span>' : '') +
        (st === 'habis' ? '<span class="pk__habis">' + T('Stok habis') + '</span>' : '') +
      '</div>' +

      /* ---- keterangan ---- */
      '<div class="pk__isi">' +
        '<h4 class="pk__nama" data-act="buka-produk" data-id="' + p.id + '" title="' +
          U.esc(p.nama) + '">' + U.esc(p.nama) + '</h4>' +

        /* Produk bervarian yang harganya berbeda-beda disebut "mulai dari".
           Menyebut satu angka saja membuat pembeli membuka halamannya lalu
           menemukan harga lain — dan itu terbaca sebagai harga yang naik
           diam-diam, bukan sebagai varian yang lebih mahal. */
        '<div class="pk__harga">' +
          (VARIAN.punya(p) && VARIAN.rentang(p).beda
            ? '<span class="pk__mulai">' + T('mulai') + ' </span>' : '') +
          U.rp(ht.harga) + '</div>' +
        (ht.kampanye
          ? '<div class="pk__coret">' + U.rp(ht.asli) + '</div>' : '') +

        /* COD adalah kanal pembayaran seluruh aplikasi, bukan sifat sebuah
           produk — jadi chip-nya dibaca dari kanal yang benar-benar aktif.
           Bila admin mematikan COD, chip ini ikut hilang dengan sendirinya;
           menuliskannya tetap akan menjanjikan cara bayar yang tidak ada di
           halaman checkout. */
        (function () {
          var chip = [];
          if (ht.kampanye) {
            chip.push('<span class="pk__promo">' + ht.kampanye.ikon + ' ' +
              U.esc(ht.kampanye.nama) + '</span>');
          }
          if (bisaCOD()) chip.push('<span class="pk__cod">' + T('Bisa COD') + '</span>');
          return chip.length ? '<div class="pk__chip">' + chip.join('') + '</div>' : '';
        })() +

        /* Bintang hanya muncul kalau ADA yang menilainya. Menampilkan "0.0"
           atau lima bintang kosong pada barang baru membuatnya terlihat
           buruk, padahal yang benar adalah belum ada yang menilai. */
        '<div class="pk__meta">' +
          (nilai.n
            ? '<span class="pk__bintang">★ ' + nilai.rata + '</span>' +
              '<span class="pk__dot">·</span><span>' + nilai.n + ' ' + T('ulasan') + '</span>'
            : '<span class="pk__satuan">/ ' + U.esc(p.satuan) + '</span>') +
          (terjual ? '<span class="pk__dot">·</span><span>' + terjual + ' ' +
            T('terjual') + '</span>' : '') +
        '</div>' +

        '<div class="pk__toko">' + (resmi ? '🏛️' : '🏪') + ' ' +
          U.esc(resmi ? SELLER.namaToko(p.sellerId) : (kota || SELLER.namaToko(p.sellerId))) + '</div>' +

        (st === 'menipis'
          ? '<div class="pk__sisa">' + T('Sisa {n}').replace('{n}', p.stok) + '</div>' : '') +

        '<div class="pk__aksi">' + (st === 'habis'
          ? '<button class="btn btn--ghost btn--sm btn--block" disabled>' + T('Stok habis') + '</button>'
          : di
            ? '<div class="qty"><button class="qty__b" data-act="kurang" data-id="' + p.id + '">−</button>' +
              '<input class="qty__i" type="number" min="1" max="' + p.stok + '" value="' + di.qty +
              '" data-change="setqty" data-id="' + p.id + '">' +
              '<button class="qty__b" data-act="tambah" data-id="' + p.id + '">+</button>' +
              '<button class="btn btn--ghost btn--sm" data-act="buang" data-id="' + p.id + '" ' +
              'title="' + T('Hapus') + '">🗑</button></div>'
            : '<button class="btn btn--soft btn--sm btn--block" data-act="tambah" data-id="' + p.id +
              '">＋ ' + T('Keranjang') + '</button>') +
          '<button class="pk__bagi" data-act="bagikan-produk" data-id="' + p.id + '" ' +
            'title="' + T('Bagikan') + '">🔗</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /**
   * Pasang foto produk pada kartu-kartu yang sudah tergambar.
   *
   * Fotonya ada di IndexedDB dan hanya bisa diambil secara asinkron, jadi
   * kartu digambar lebih dulu dengan ikonnya. Ikon itu bukan penampung
   * sementara yang menunggu diganti: sebagian besar katalog memang belum
   * berfoto, dan kotak abu-abu kosong pada dua belas kartu sekaligus
   * terlihat seperti halaman yang gagal memuat.
   */
  function muatFotoKartu(root) {
    if (!window.BERKAS || !window.MEDIA) return;
    katalog().forEach(function (p) {
      var kotak = root.querySelector('#pkim-' + p.id);
      if (!kotak) return;
      var foto = MEDIA.produk(p).filter(function (m) { return m.jenis === 'foto'; })[0];
      if (!foto) return;
      function pasang(src) {
        if (!src || !document.body.contains(kotak)) return;
        kotak.outerHTML = '<img class="pk__img" src="' + U.esc(src) + '" alt="" loading="lazy">';
      }
      if (foto.thumb) { pasang(foto.thumb); return; }
      if (foto.berkasId) BERKAS.url(foto.berkasId).then(pasang);
    });
  }

  /* ========================================================= DETAIL PRODUK
     Susunannya mengikuti pola marketplace yang sudah dikenal pembeli:

       gambar → diskon & hitung mundur → harga → judul & penjualan →
       pengiriman → stok & satuan → toko → produk lain di toko →
       deskripsi → laporkan → bilah aksi menempel di bawah

     Urutan itu bukan selera: keputusan membeli dibuat dari atas ke bawah,
     dan yang paling menentukan (harga, ongkir, stok) diletakkan sebelum
     yang hanya memperkuat (deskripsi, produk lain).

     BAGIAN YANG SENGAJA TIDAK ADA
     Rating bintang, jumlah ulasan, foto ulasan, cicilan, dan asuransi
     produk TIDAK ditampilkan — datanya memang belum ada di aplikasi ini.
     Menampilkan angka karangan pada layar yang dipakai orang memutuskan
     belanja adalah membohongi pembeli, dan angka itu tidak akan pernah
     cocok dengan kenyataan begitu ulasan sungguhan mulai masuk. Tempatnya
     disediakan sebagai keadaan kosong yang jujur. */

  function terjualProduk(produkId) {
    var n = 0;
    DB.all('shopOrders').forEach(function (so) {
      if (so.status === 'dibatalkan') return;
      (so.items || []).forEach(function (i) { if (i.productId === produkId) n += i.qty || 0; });
    });
    return n;
  }

  /** Sisa waktu kampanye dalam bentuk jj:mm:dd, null bila sudah lewat. */
  function sisaWaktu(sampai) {
    var ms = new Date(sampai).getTime() - Date.now();
    if (!(ms > 0)) return null;
    var d = Math.floor(ms / 86400000);
    var j = Math.floor(ms / 3600000) % 24;
    var m = Math.floor(ms / 60000) % 60;
    var dt = Math.floor(ms / 1000) % 60;
    function dua(x) { return String(x).padStart(2, '0'); }
    return { hari: d, teks: dua(j) + ':' + dua(m) + ':' + dua(dt) };
  }

  var descPanjang = false;   /* "Baca selengkapnya" pada deskripsi */
  var mediaAktif = 0;        /* media yang sedang ditampilkan di galeri */
  var mediaProduk = null;    /* produk yang sedang dilihat galerinya */

  /* ============================================================== GALERI
     Media pertama menjadi tampilan utama; sisanya jadi baris thumbnail.
     Produk tanpa media tetap tampil dengan ikonnya — bukan kotak kosong,
     karena sebagian besar katalog memang belum berfoto dan halaman yang
     kosong terlihat seperti gagal memuat.

     Video sematan TIDAK dimuat sampai diklik. Yang tampil lebih dulu hanya
     kartu pemicu buatan sendiri; iframe pihak ketiga baru dibuat setelah
     pembeli menekan putar, supaya alamat IP mereka tidak dikirim ke
     YouTube/TikTok/Instagram hanya karena membuka halaman produk. */
  function galeriHTML(p, persen) {
    var media = MEDIA.produk(p);
    var i = Math.min(mediaAktif, Math.max(0, media.length - 1));
    var m = media[i] || null;

    var utama;
    if (!m) {
      utama = '<div class="pdp__ic">' + U.ikon(p.icon) + '</div>';
    } else if (m.jenis === 'embed') {
      utama = '<div class="pmed" id="pmed-slot">' +
        '<button class="pmed__picu" data-act="putar-embed">' +
          '<span class="pmed__ikon">' + MEDIA.ikon(m) + '</span>' +
          '<span class="pmed__play">▶</span>' +
          '<span class="pmed__ket">Putar video ' + U.esc(MEDIA.label(m)) + '</span>' +
          '<span class="pmed__priv">' + T('Dimuat dari server') + ' ' + U.esc(MEDIA.label(m)) +
            ' setelah ditekan</span>' +
        '</button></div>';
    } else if (m.jenis === 'video') {
      utama = '<video class="pdp__vid" id="pdp-video" controls playsinline preload="metadata"' +
        (m.thumb ? ' poster="' + U.esc(m.thumb) + '"' : '') + '></video>';
    } else {
      utama = '<img class="pdp__img" id="pdp-img" alt="' + U.esc(p.nama) + '">';
    }

    return '<div class="pdp__hero">' +
        '<button class="pdp__back" data-act="ke-katalog" title="Kembali">←</button>' +
        utama +
        (persen ? '<span class="pdp__badge">−' + persen + '%</span>' : '') +
        (media.length > 1
          ? '<span class="pdp__hitung">' + (i + 1) + ' / ' + media.length + '</span>' : '') +
      '</div>' +
      (media.length > 1
        ? '<div class="pdp__thumbs">' + media.map(function (x, k) {
            return '<button class="pdp__th' + (k === i ? ' on' : '') + '" ' +
              'data-act="pilih-media" data-i="' + k + '" id="pth-' + k + '" ' +
              'title="' + U.esc(MEDIA.label(x)) + '">' +
              '<span class="pdp__thik">' + MEDIA.ikon(x) + '</span>' +
              (x.jenis !== 'foto' ? '<span class="pdp__thplay">▶</span>' : '') +
              '</button>';
          }).join('') + '</div>'
        : '');
  }

  /** Isi gambar/video utama dan thumbnail dari berkas perangkat. */
  function muatMediaPDP(root, p) {
    var media = MEDIA.produk(p);
    if (!media.length || !window.BERKAS) return;
    var i = Math.min(mediaAktif, media.length - 1);
    var m = media[i];

    if (m && m.berkasId) {
      BERKAS.url(m.berkasId).then(function (u) {
        if (!u) return;
        var el = root.querySelector(m.jenis === 'video' ? '#pdp-video' : '#pdp-img');
        if (el && document.body.contains(el)) el.src = u;
      });
    }

    media.forEach(function (x, k) {
      var kotak = root.querySelector('#pth-' + k);
      if (!kotak) return;
      function pasang(src) {
        if (!src || !document.body.contains(kotak)) return;
        var ik = kotak.querySelector('.pdp__thik');
        if (ik) ik.outerHTML = '<img src="' + U.esc(src) + '" alt="">';
      }
      if (x.thumb) { pasang(x.thumb); return; }
      if (x.jenis === 'foto' && x.berkasId) BERKAS.url(x.berkasId).then(pasang);
    });
  }

  /* ==================================================== ULASAN DI HALAMAN PRODUK
     Ringkasannya di atas, daftarnya di bawah. Urutan itu bukan selera:
     pembaca ingin tahu "berapa bintangnya" sebelum membaca siapa yang
     menulis apa, dan sebaran per bintang menjawab pertanyaan yang tidak bisa
     dijawab rata-rata — 4,0 dari nilai yang seragam sangat berbeda artinya
     dari 4,0 yang separuhnya bintang 5 dan separuhnya bintang 2. */
  /* Bintang pecahan digambar dengan LAPISAN, bukan karakter setengah
     bintang. Alasannya sepele tetapi mengikat: U+2BE8 dan kerabatnya tidak
     ada di font bawaan Windows — yang muncul kotak kosong, persis kasus emoji
     katalog. Yang dipakai di sini hanya ★, yang ada di mana-mana; separuhnya
     dibuat dengan memotong lebar lapisan atasnya.

     Membulatkan bukan pilihan: Math.round membuat 4,5 tergambar lima bintang
     penuh, sementara angka di sebelahnya berkata 4,5 — dan yang dipercaya
     orang gambarnya. */
  function bintangHTML(n, kelas) {
    var persen = Math.max(0, Math.min(100, (Number(n) || 0) / 5 * 100));
    return '<span class="' + (kelas || 'ul-bintang') + '" title="' + (Number(n) || 0) + '">' +
      '<span class="ul-bintang__dasar">★★★★★</span>' +
      '<span class="ul-bintang__isi" style="width:' + persen + '%">★★★★★</span>' +
    '</span>';
  }

  /**
   * Tingkat harga grosir. Yang sedang berlaku ditandai, bukan sekadar
   * didaftar: pembeli perlu tahu ia sudah dapat harga mana, dan berapa lagi
   * kurangnya untuk tingkat berikutnya.
   */
  function blokGrosir(p) {
    var g = PRODUKED.grosirRapi(p.grosir);
    var min = PRODUKED.minOrder(p);
    if (!g.length && min <= 1) return '';
    var di = keranjang.filter(function (k) { return k.productId === p.id; })[0];
    var qty = di ? di.qty : min;
    var berlaku = PRODUKED.hargaGrosir(p, qty);
    return '<div class="pdp__sek">' + UI.card({ title: T('Harga & pembelian'), body:
      (min > 1 ? '<div class="tbl-sub mb-2">' + T('Minimum pembelian') + ': <b>' + min + ' ' +
        U.esc(p.satuan || '') + '</b></div>' : '') +
      (g.length
        ? '<table class="tbl"><thead><tr><th>' + T('Jumlah') + '</th><th>' +
            T('Harga satuan') + '</th></tr></thead><tbody>' +
          [{ minQty: min, harga: p.harga }].concat(g).map(function (x) {
            var aktif = PRODUKED.hargaGrosir(p, x.minQty) === x.harga && x.harga === berlaku;
            return '<tr' + (aktif ? ' class="tbl-row--on"' : '') + '>' +
              '<td>' + x.minQty + '+ ' + U.esc(p.satuan || '') + '</td>' +
              '<td><b>' + U.rp(x.harga) + '</b>' +
                /* Bukan T('berlaku'): kunci itu sudah dipakai untuk masa berlaku
                   voucher dan diterjemahkan jadi "valid". */
                (aktif ? ' <span class="chip chip--ok chip--xs">' + T('tingkat yang Anda dapat') + '</span>' : '') +
              '</td></tr>';
          }).join('') + '</tbody></table>'
        : '') }) + '</div>';
  }

  function blokSpesifikasi(p) {
    var s = p.spesifikasi || [];
    if (!s.length) return '';
    return '<div class="pdp__sek">' + UI.card({ title: T('Spesifikasi'), body:
      '<dl class="kv">' + s.map(function (x) {
        return '<dt>' + U.esc(x.k) + '</dt><dd>' + U.esc(x.v) + '</dd>';
      }).join('') + '</dl>' }) + '</div>';
  }

  function blokUlasan(p) {
    var r = ULASAN.ringkas(p.id);
    var daftar = ULASAN.produk(p.id);

    if (!r.n) {
      return UI.card({ title: T('Ulasan Pembeli'), body:
        UI.empty('⭐', T('Belum ada ulasan'),
          T('Ulasan hanya bisa ditulis oleh pembeli yang barangnya sudah diterima — ' +
            'jadi yang tampil di sini selalu dari orang yang benar-benar memakainya.')) });
    }

    return UI.card({
      title: T('Ulasan Pembeli'), sub: r.n + ' ' + T('ulasan'),
      body:
        '<div class="ul-ringkas">' +
          '<div class="ul-ringkas__ki">' +
            '<div class="ul-ringkas__rata">' + r.rata + '</div>' +
            bintangHTML(r.rata) +
            '<div class="tbl-sub">' + r.n + ' ' + T('ulasan') + '</div>' +
          '</div>' +
          '<div class="ul-ringkas__ka">' + [5, 4, 3, 2, 1].map(function (b) {
            var n = r.sebaran[b - 1];
            var persen = r.n ? Math.round(n / r.n * 100) : 0;
            return '<div class="ul-bar">' +
              '<span class="ul-bar__b">' + b + '★</span>' +
              '<span class="ul-bar__t"><i style="width:' + persen + '%"></i></span>' +
              '<span class="ul-bar__n">' + n + '</span>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>' +

        '<div class="ul-daftar">' + daftar.slice(0, 20).map(function (x) {
          var u = DB.find('users', x.clientId);
          /* Nama pengulas disamarkan sebagiannya. Ulasan bisa dibaca siapa
             pun, termasuk yang tidak punya akun, dan nama lengkap pembeli
             bukan miliknya penjual untuk disiarkan. */
          var nama = u ? U.esc(samarNama(u.nama)) : T('Pembeli');
          return '<div class="ul-item">' +
            '<div class="ul-item__atas">' +
              bintangHTML(x.bintang, 'ul-bintang ul-bintang--sm') +
              '<b>' + nama + '</b>' +
              '<div class="spacer"></div>' +
              '<span class="tbl-sub">' + U.tgl(x.at || x.createdAt) + '</span>' +
            '</div>' +
            (x.komentar ? '<div class="ul-item__teks">' + U.esc(x.komentar) + '</div>' : '') +
            (APP.user && x.clientId === APP.user.id
              ? '<button class="ul-hapus" data-act="hapus-ulasan" data-id="' + U.esc(x.id) + '">' +
                T('Hapus ulasan saya') + '</button>' : '') +
          '</div>';
        }).join('') + '</div>' +
        (daftar.length > 20
          ? '<div class="tbl-sub mt-2">' + T('Ditampilkan 20 ulasan terbaru dari') + ' ' +
            daftar.length + '.</div>' : '')
    });
  }

  /** "Lestari Wijaya" → "Lestari W." */
  function samarNama(nama) {
    var bagian = String(nama || '').trim().split(/\s+/);
    if (bagian.length < 2) return bagian[0] || '';
    return bagian[0] + ' ' + bagian[bagian.length - 1].charAt(0).toUpperCase() + '.';
  }

  /* Varian yang sedang dipilih di halaman produk. Milik SATU produk saja —
     dilepas begitu produknya berganti, kalau tidak varian produk sebelumnya
     terbawa dan yang masuk keranjang bukan yang terlihat dipilih. */
  var varianPilih = {};

  /**
   * Kombinasi yang cocok dengan pilihan sebagian.
   *
   * Selama belum semua sumbu dipilih, hasilnya lebih dari satu — itu yang
   * dipakai untuk menentukan nilai mana yang masih mungkin, sehingga pembeli
   * tidak bisa menyusun kombinasi yang memang tidak dijual.
   */
  function cocokVarian(p, pilih) {
    return VARIAN.aktif(p).filter(function (k) {
      return VARIAN.opsi(p).every(function (o, i) {
        return !pilih[o.nama] || k.pilihan[i] === pilih[o.nama];
      });
    });
  }

  /** Kombinasi terpilih penuh, atau null bila masih ada sumbu yang kosong. */
  function varianTerpilih(p) {
    if (!VARIAN.punya(p)) return null;
    var pilih = varianPilih[p.id] || {};
    var lengkap = VARIAN.opsi(p).every(function (o) { return !!pilih[o.nama]; });
    if (!lengkap) return null;
    return cocokVarian(p, pilih)[0] || null;
  }

  function blokVarian(p) {
    if (!VARIAN.punya(p)) return '';
    var pilih = varianPilih[p.id] || {};
    var opsi = VARIAN.opsi(p);
    return '<div class="pdp__varian">' + opsi.map(function (o, i) {
      /* Nilai yang tidak bisa lagi menghasilkan kombinasi apa pun dimatikan,
         bukan disembunyikan: pembeli perlu melihat bahwa warnanya ada tetapi
         tidak tersedia dalam ukuran yang ia pilih. */
      var lain = {};
      Object.keys(pilih).forEach(function (k) { if (k !== o.nama) lain[k] = pilih[k]; });
      var mungkin = cocokVarian(p, lain);
      return '<div class="pdp__varian-baris">' +
        '<div class="pdp__varian-nama">' + U.esc(o.nama) +
          (pilih[o.nama] ? ': <b>' + U.esc(pilih[o.nama]) + '</b>' : '') + '</div>' +
        '<div class="pdp__varian-nilai">' + (o.nilai || []).map(function (n) {
          var bisa = mungkin.some(function (k) { return k.pilihan[i] === n && (k.stok || 0) > 0; });
          var ada = mungkin.some(function (k) { return k.pilihan[i] === n; });
          return '<button class="vchip' + (pilih[o.nama] === n ? ' vchip--on' : '') +
            (bisa ? '' : ' vchip--mati') + '" data-act="pilih-varian" ' +
            'data-p="' + U.esc(p.id) + '" data-o="' + U.esc(o.nama) + '" data-n="' + U.esc(n) + '"' +
            (bisa ? '' : ' disabled title="' + (ada ? T('Stok habis') : T('Kombinasi ini tidak dijual')) + '"') +
            '>' + U.esc(n) + '</button>';
        }).join('') + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function detailProduk(params) {
    params = params || {};
    var p = BIZ.produk(params.id);

    /* Galeri kembali ke media pertama begitu produknya berganti. Diperiksa di
       sini, bukan diserahkan ke tiap pemanggil APP.go(): satu pemanggil yang
       lupa mengembalikannya sudah cukup membuat pembeli membuka produk baru
       dan langsung melihat media ketiganya. */
    if (mediaProduk !== params.id) {
      mediaProduk = params.id; mediaAktif = 0;
      /* Pilihan varian ikut dilepas. Membawanya ke produk lain berarti
         halaman baru terbuka dengan varian yang tidak pernah dipilih di sana. */
      varianPilih = {};
    }
    if (!p) {
      return UI.empty('📦', T('Produk tidak ditemukan'),
        T('Produk mungkin sudah ditarik penjualnya. Kembali ke katalog untuk mencari yang lain.')) +
        '<div class="row mt-3"><div class="spacer"></div>' +
        '<button class="btn" data-act="ke-katalog">' + T('Kembali ke Toko') + '</button>' +
        '<div class="spacer"></div></div>';
    }

    /* Selama varian belum dipilih, yang ditampilkan adalah harga TERMURAH —
       itu pula yang sudah tersimpan di p.harga, jadi kartu katalog dan
       halaman ini menyebut angka yang sama. Begitu dipilih, angkanya berubah
       ke harga varian itu. */
    var vk = null;
    var ht = SELLER.hargaTayang(p);
    var st = statusStok(p);
    var resmi = SELLER.tokoResmi(p.sellerId);
    var toko = SELLER.toko(DB.find('users', p.sellerId));
    if (VARIAN.punya(p)) {
      vk = varianTerpilih(p);
      if (vk) {
        ht = SELLER.hargaTayang(Object.assign({}, p, { harga: VARIAN.harga(p, vk.id) }));
        st = (vk.stok || 0) <= 0 ? 'habis' : ((vk.stok || 0) <= (p.minStok || 0) ? 'menipis' : 'aman');
      }
    }
    /* Baris keranjang yang cocok adalah baris VARIAN ini, bukan baris mana
       pun dari produk yang sama — merah di keranjang tidak boleh membuat
       halaman biru menampilkan pengatur jumlah. */
    var di = cariItem(p.id, vk ? vk.id : null);
    var terjual = terjualProduk(p.id);
    var persen = ht.kampanye ? ht.kampanye.diskonPersen : 0;
    var sisa = ht.kampanye ? sisaWaktu(ht.kampanye.selesai) : null;
    var lain = DB.where('products', function (x) {
      return x.sellerId === p.sellerId && x.id !== p.id && x.aktif !== false;
    }).slice(0, 8);

    return '<div class="pdp">' +

      /* ---- galeri: foto, video unggahan, dan video sematan ---- */
      galeriHTML(p, persen) +

      /* ---- kampanye + hitung mundur ---- */
      (ht.kampanye && sisa
        ? '<div class="pdp__flash" style="--kmp:' + U.esc(ht.kampanye.warna || '#C2410C') + '">' +
            '<span>' + ht.kampanye.ikon + ' ' + U.esc(ht.kampanye.nama) + '</span>' +
            '<div class="spacer"></div>' +
            '<span class="pdp__sisa">Berakhir dalam ' +
              (sisa.hari ? sisa.hari + ' hari ' : '') +
              '<b id="pdp-timer">' + sisa.teks + '</b></span>' +
          '</div>'
        : '') +

      '<div class="pdp__isi">' +

        /* ---- harga ---- */
        '<div class="pdp__harga">' + U.rp(ht.harga) +
          (persen ? ' <span class="pdp__coret">' + U.rp(ht.asli) + '</span>' +
            '<span class="pdp__persen">' + persen + '%</span>' : '') +
        '</div>' +
        '<div class="tbl-sub">' +
          (VARIAN.punya(p) && !vk && VARIAN.rentang(p).beda
            ? T('mulai dari — harga mengikuti varian yang dipilih')
            : T('harga per') + ' ' + U.esc(p.satuan)) + '</div>' +

        /* ---- varian ---- */
        blokVarian(p) +
        (VARIAN.punya(p) && vk
          ? '<div class="tbl-sub">' + T('Sisa stok') + ': <b>' + (vk.stok || 0) + '</b> ' +
            U.esc(p.satuan) + (vk.sku ? ' · <span class="code">' + U.esc(vk.sku) + '</span>' : '') + '</div>'
          : '') +

        /* ---- judul & penjualan ---- */
        '<div class="pdp__judul mt-2">' +
          (resmi ? '<span class="chip chip--brand chip--xs">' + T('🏛️ Toko Resmi') + '</span> ' : '') +
          U.esc(p.nama) + '</div>' +
        '<div class="pdp__meta">' +
          '<span class="code">' + U.esc(p.kode) + '</span>' +
          '<span>' + U.esc(p.merek) + '</span>' +
          (terjual ? '<span>' + terjual + ' ' + U.esc(p.satuan) + ' ' + T('terjual') + '</span>' : '') +
        '</div>' +

        /* ---- pengiriman ---- */
        '<div class="pdp__baris">' +
          '<span class="pdp__ikon">🚚</span>' +
          '<div style="min-width:0;flex:1"><b>' + KIRIM.teksBerat(KIRIM.beratTertagih(p)) + '</b>' +
            '<div class="tbl-sub">' + (function () { var d = KIRIM.dimensiProduk(p);
              return d.p + '×' + d.l + '×' + d.t + ' cm'; })() +
              (KIRIM.perkiraan(p) ? ' · ukuran perkiraan' : '') + '</div></div>' +
        '</div>' +

        /* ---- stok ---- */
        '<div class="pdp__baris">' +
          '<span class="pdp__ikon">📦</span>' +
          '<div style="min-width:0;flex:1"><b>' +
            (st === 'habis' ? 'Stok habis' : 'Tersedia ' + p.stok + ' ' + U.esc(p.satuan)) + '</b>' +
            '<div class="tbl-sub">' + U.esc(p.kategori) + '</div></div>' +
          (st === 'menipis' ? '<span class="chip chip--warn">Menipis</span>' : '') +
        '</div>' +

      '</div>' +

      /* ---- toko ---- */
      '<div class="pdp__sek">' +
        UI.card({ flush: true, body:
          '<div class="pdp__toko">' +
            '<div class="pdp__tokoic">' + (resmi ? '🏛️' : '🏪') + '</div>' +
            '<div style="min-width:0;flex:1"><b>' + U.esc(SELLER.namaToko(p.sellerId)) + '</b>' +
              '<div class="tbl-sub">' + U.esc(toko.kota || '—') + ' · ' +
                DB.where('products', function (x) {
                  return x.sellerId === p.sellerId && x.aktif !== false; }).length +
                ' ' + T('produk') + '</div></div>' +
            '<button class="btn btn--ghost btn--sm" data-act="ke-toko" data-id="' +
              U.esc(String(p.sellerId || '')) + '">' + T('Lihat Toko') + '</button>' +
          '</div>' }) +
      '</div>' +

      /* ---- produk lain di toko ini ---- */
      (lain.length
        ? '<div class="pdp__sek">' +
            '<div class="pdp__jud">' + T('Lainnya di toko ini') + '</div>' +
            '<div class="pdp__gulir">' + lain.map(function (x) {
              var h = SELLER.hargaTayang(x);
              return '<div class="pdp__mini" data-act="buka-produk" data-id="' + x.id + '">' +
                (h.kampanye ? '<span class="pdp__minibadge">−' + h.kampanye.diskonPersen + '%</span>' : '') +
                '<div class="pdp__miniic">' + x.icon + '</div>' +
                '<div class="pdp__mininama">' + U.esc(U.potong(x.nama, 34)) + '</div>' +
                '<div class="pdp__miniharga">' + U.rp(h.harga) + '</div>' +
                (h.kampanye ? '<div class="pdp__minicoret">' + U.rp(h.asli) + '</div>' : '') +
                '</div>';
            }).join('') + '</div>' +
          '</div>'
        : '') +

      /* ---- deskripsi ---- */
      '<div class="pdp__sek">' +
        UI.card({ title: T('Detail Produk'), body:
          '<dl class="kv">' +
            '<dt>' + T('Kategori') + '</dt><dd>' + U.esc(p.kategori) + '</dd>' +
            '<dt>' + T('Merek') + '</dt><dd>' + U.esc(p.merek) + '</dd>' +
            '<dt>' + T('Satuan') + '</dt><dd>' + U.esc(p.satuan) + '</dd>' +
            '<dt>Kode</dt><dd class="code">' + U.esc(p.kode) + '</dd>' +
          '</dl>' +
          '<div class="pdp__desk' + (descPanjang ? ' buka' : '') + '">' +
            U.esc(p.deskripsi || T('Belum ada deskripsi produk.')) + '</div>' +
          ((p.deskripsi || '').length > 140
            ? '<button class="btn btn--ghost btn--sm mt-1" data-act="desk-lagi">' +
              (descPanjang ? 'Ringkas' : 'Baca selengkapnya') + '</button>'
            : '') }) +
      '</div>' +

      /* ---- harga grosir & spesifikasi ----
         Keduanya diisi penjual di editor produk. Tidak menampilkannya di sini
         berarti penjual mengisi sesuatu yang tidak pernah dibaca siapa pun —
         dan pembeli membayar harga satuan padahal jumlahnya sudah cukup untuk
         harga grosir. */
      blokGrosir(p) +
      blokSpesifikasi(p) +

      /* ---- ulasan pembeli ---- */
      '<div class="pdp__sek">' + blokUlasan(p) + '</div>' +

      /* ---- laporkan ---- */
      '<div class="pdp__sek">' +
        '<button class="btn btn--ghost btn--block" data-act="lapor-produk" data-id="' + p.id +
          '">' + T('⚠️ Produk bermasalah? Laporkan') + '</button>' +
      '</div>' +

      /* ---- bilah aksi ---- */
      '<div class="pdp__aksi">' +
        '<button class="btn btn--ghost btn--icon" data-act="bagikan-produk" data-id="' + p.id +
          '" title="Bagikan">🔗</button>' +
        (function () {
          var av = vk ? ' data-var="' + U.esc(vk.id) + '"' : '';
          var sisaV = vk ? (vk.stok || 0) : p.stok;
          /* Produk bervarian tidak bisa dimasukkan keranjang sebelum variannya
             dipilih. Tombolnya dimatikan sambil menyebutkan sebabnya —
             menebak varian pertama akan mengirimkan barang yang tidak diminta. */
          if (VARIAN.punya(p) && !vk) {
            return '<button class="btn btn--block" disabled>' +
              T('Pilih varian dulu') + '</button>';
          }
          if (st === 'habis') return '<button class="btn btn--block" disabled>' + T('Stok habis') + '</button>';
          if (di) {
            return '<div class="qty"><button class="qty__b" data-act="kurang"' + av +
                ' data-id="' + p.id + '">−</button>' +
              '<input class="qty__i" type="number" min="1" max="' + sisaV + '" value="' + di.qty +
              '" data-change="setqty"' + av + ' data-id="' + p.id + '">' +
              '<button class="qty__b" data-act="tambah"' + av + ' data-id="' + p.id + '">+</button></div>' +
              '<button class="btn btn--block" data-act="ke-keranjang">' + T('Lihat Keranjang') + '</button>';
          }
          return '<button class="btn btn--soft btn--block" data-act="tambah"' + av +
            ' data-id="' + p.id + '">＋ Keranjang</button>' +
            '<button class="btn btn--block" data-act="beli-sekarang"' + av +
            ' data-id="' + p.id + '">' + T('Beli Sekarang') + '</button>';
        })() +
      '</div>' +

    '</div>';
  }

  function detailAksi(root, params) {
    clientAksi(root, params);
    U.delegate(root, {
      'ke-katalog': function () { mediaAktif = 0; APP.go('toko'); },
      'pilih-varian': function (el) {
        var pid = el.getAttribute('data-p');
        var o = el.getAttribute('data-o'), n = el.getAttribute('data-n');
        var pilih = varianPilih[pid] || (varianPilih[pid] = {});
        /* Menekan nilai yang sedang menyala melepaskannya — tanpa itu, sumbu
           yang salah pilih tidak bisa dikosongkan lagi. */
        if (pilih[o] === n) delete pilih[o]; else pilih[o] = n;

        /* Pilihan pada sumbu LAIN yang jadi mustahil ikut dilepas. Kalau
           dibiarkan, layar menampilkan dua nilai menyala yang kombinasinya
           tidak dijual, dan tombol belinya mati tanpa sebab yang terlihat. */
        var p = BIZ.produk(pid);
        if (p) {
          VARIAN.opsi(p).forEach(function (sumbu, i) {
            if (sumbu.nama === o || !pilih[sumbu.nama]) return;
            var lain = {};
            Object.keys(pilih).forEach(function (k) { if (k !== sumbu.nama) lain[k] = pilih[k]; });
            var masih = cocokVarian(p, lain).some(function (k) {
              return k.pilihan[i] === pilih[sumbu.nama]; });
            if (!masih) delete pilih[sumbu.nama];
          });
        }
        APP.refresh();
      },
      'pilih-media': function (el) {
        mediaAktif = Number(el.getAttribute('data-i')) || 0;
        APP.refresh();
      },
      'putar-embed': function (el) {
        var p = BIZ.produk(params && params.id);
        var m = MEDIA.produk(p)[mediaAktif];
        if (!m || m.jenis !== 'embed') return;
        var slot = el.closest('.pmed');
        /* Iframe baru dibuat DI SINI — permintaan pertama ke server pihak
           ketiga terjadi karena pembeli menekannya, bukan karena halaman
           produknya terbuka. */
        if (slot) slot.innerHTML = MEDIA.iframeHTML(m);
      },
      'buka-produk': function (el) {
        descPanjang = false; mediaAktif = 0;
        APP.go('produk', { id: el.getAttribute('data-id') });
      },
      'ke-toko': function () { APP.go('toko'); },
      'ke-keranjang': function () { APP.go('keranjang'); },
      'hapus-ulasan': aksiHapusUlasan,
      'desk-lagi': function () { descPanjang = !descPanjang; APP.refresh(); },
      'beli-sekarang': function (el) {
        var id = el.getAttribute('data-id');
        var p = BIZ.produk(id);
        if (!p) return;
        /* "Beli Sekarang" tetap lewat keranjang, tidak memotong jalur checkout:
           ongkir, voucher, dan pilihan kurir dihitung di sana. Memintasnya
           berarti menulis ulang perhitungan yang sama di dua tempat, dan yang
           satu pasti tertinggal saat aturannya berubah. */
        if (!keranjang.filter(function (k) { return k.productId === id; })[0]) {
          keranjang.push({ productId: id, qty: 1, pilih: true });
        } else setPilih(id, true);
        if (window.APP && APP.segarkanTopbar) APP.segarkanTopbar();
        APP.go('keranjang');
      }
    });

    var pAktif = BIZ.produk(params && params.id);
    if (pAktif) muatMediaPDP(root, pAktif);

    /* Hitung mundur berjalan tiap detik. Interval dilepas saat elemennya
       hilang dari layar — halaman berganti tanpa memberi tahu kita, dan
       interval yang tertinggal akan terus berdetak sampai tab ditutup. */
    var el = root.querySelector('#pdp-timer');
    if (!el) return;
    var kmp = (function () {
      var p = BIZ.produk(params && params.id);
      return p ? SELLER.hargaTayang(p).kampanye : null;
    })();
    if (!kmp) return;
    var jam = setInterval(function () {
      if (!document.body.contains(el)) { clearInterval(jam); return; }
      var s = sisaWaktu(kmp.selesai);
      if (!s) { clearInterval(jam); APP.refresh(); return; }
      el.textContent = s.teks;
    }, 1000);
  }

  function panelKeranjang() {
    var semua = isiKeranjang();
    var dipilih = terpilih(semua);

    /* DUA pengelompokan, dan bedanya penting:
         grupTampil — seluruh isi keranjang, untuk digambar. Barang yang
           centangnya dilepas tetap harus terlihat; itulah gunanya melepas
           centang alih-alih menghapus.
         grup       — hanya yang tercentang, untuk semua hitungan uang dan
           untuk memilih kurir. Menghitung ongkir atas barang yang tidak jadi
           dibeli akan menagih pembeli untuk paket yang tidak pernah dikirim. */
    /* Yang habis dikeluarkan dari pengelompokan toko dan dikumpulkan di blok
       sendiri PALING BAWAH. Kalau hanya diurutkan ke belakang di dalam
       kelompoknya, barang habis milik toko pertama tetap mendarat di tengah
       halaman — menyela daftar belanjaan dengan baris yang tidak bisa
       diapa-apakan. Di bawah, ia menjadi catatan kaki yang tetap terlihat
       tanpa menghalangi. */
    var itemHabis = semua.filter(function (i) { return i.habis; });
    var grupTampil = perToko(bisaDipilih(semua));
    var grup = perToko(dipilih);
    function grupUang(sid) {
      return grup.filter(function (g) { return (g.sellerId || '') === (sid || ''); })[0] || null;
    }

    var subtotal = U.sum(dipilih, function (i) { return i.qty * i.harga; });
    /* ongkir dihitung per toko karena tiap toko mengirim dari gudangnya sendiri */
    var ongkir = U.sum(grup, function (g) { return g.ongkir; });
    var hemat = U.sum(dipilih, function (i) { return (i.hargaAsli - i.harga) * i.qty; });
    var h = { subtotal: subtotal, ppnRp: Math.round(subtotal * Ppn / 100),
      total: U.sum(grup, function (g) { return g.total; }) };
    var u = APP.user;
    var adaPilih = dipilih.length > 0;

    /* Kotak centang digambar sendiri, bukan memakai <input> apa adanya:
       ukuran bawaan peramban berbeda-beda antar sistem dan terlalu kecil
       untuk jempol. Input aslinya tetap ada di dalamnya supaya keyboard dan
       pembaca layar tetap menemukannya. */
    function cek(act, data, on) {
      return '<label class="krj-cek">' +
        '<input type="checkbox" data-change="' + act + '" ' + data +
          (on ? ' checked' : '') + '>' +
        '<span aria-hidden="true"></span></label>';
    }

    function barisKeranjang(i) {
      var persen = i.hargaAsli > i.harga
        ? Math.round((i.hargaAsli - i.harga) / i.hargaAsli * 100) : 0;
      return '<div class="krj-item' + (i.habis ? ' krj-item--habis'
          : i.pilih ? '' : ' krj-item--off') + '">' +
        (i.habis
          ? '<span class="krj-cek krj-cek--mati" aria-hidden="true"><span></span></span>'
          : cek('pilih-item', 'data-id="' + U.esc(kunciItem(i.productId, i.varianId)) + '"', i.pilih)) +
        '<div class="krj-item__ic" data-act="buka-produk" data-id="' + U.esc(i.productId) + '">' +
          U.ikon(i.produk.icon) + '</div>' +
        '<div class="krj-item__isi">' +
          '<div class="krj-item__nama" data-act="buka-produk" data-id="' +
            U.esc(i.productId) + '">' + U.esc(i.produk.nama) + '</div>' +
          /* Varian ditulis di barisnya sendiri. Dua baris bernama sama tanpa
             pembeda adalah keranjang yang tidak bisa dibaca — dan yang salah
             hapus tidak akan tahu mana yang barusan hilang. */
          (i.varianLabel
            ? '<div class="krj-item__var">' + U.esc(i.varianLabel) + '</div>' : '') +
          '<div class="krj-item__hrg">' +
            '<b>' + U.rp(i.qty * i.harga) + '</b>' +
            (persen
              ? '<s>' + U.rp(i.qty * i.hargaAsli) + '</s>' +
                '<span class="krj-item__disk">' + persen + '%</span>'
              : '') +
          '</div>' +
          '<div class="krj-item__sat">' + i.qty + ' ' + U.esc(i.produk.satuan) +
            ' × ' + U.rp(i.harga) + '</div>' +
          (i.habis ? '<div class="krj-habis">' + T('Stok habis') + ' — ' +
            T('tidak ikut dibeli') + '</div>' : '') +
        '</div>' +
        '<div class="krj-item__qty">' +
          '<button class="krj-hapus" data-act="buang" data-var="' + U.esc(i.varianId || '') +
            '" data-id="' + U.esc(i.productId) +
            '" title="' + T('Hapus') + '">🗑</button>' +
          '<button class="krj-suka" data-act="ke-wishlist" data-var="' + U.esc(i.varianId || '') +
            '" data-id="' + U.esc(i.productId) +
            '" title="' + T('Pindahkan ke Wishlist') + '">♡</button>' +
          /* Pengatur jumlah dimatikan saat stoknya habis: menaikkan jumlah
             barang yang tidak ada tidak berarti apa-apa, dan tombol yang bisa
             ditekan tanpa akibat terbaca sebagai aplikasi yang rusak. */
          (i.habis
            ? '<div class="qty qty--mati"><span class="qty__n">' + i.qty + '</span></div>'
            : '<div class="qty">' +
              '<button class="qty__b" data-act="kurang" data-var="' + U.esc(i.varianId || '') +
                '" data-id="' + U.esc(i.productId) + '">−</button>' +
              '<input class="qty__i" type="number" min="1" max="' + i.produk.stok + '" value="' +
                i.qty + '" data-change="setqty" data-var="' + U.esc(i.varianId || '') +
                '" data-id="' + U.esc(i.productId) + '">' +
              '<button class="qty__b" data-act="tambah" data-var="' + U.esc(i.varianId || '') +
                '" data-id="' + U.esc(i.productId) + '">+</button>' +
            '</div>') +
        '</div>' +
      '</div>';
    }

    return UI.card({
      title: T('Keranjang Belanja'),
      sub: jumlahItem() ? jumlahItem() + ' ' + T('barang') : T('masih kosong'),
      body: (semua.length ?

        /* ---- bilah pilih semua ---- */
        '<div class="krj-atas">' +
          cek('pilih-semua', '', semuaDipilih()) +
          '<span class="krj-atas__n">' + jumlahPilih() + ' ' + T('produk terpilih') + '</span>' +
          '<div class="spacer"></div>' +
          (adaPilih
            ? '<button type="button" class="krj-atas__hapus" data-act="hapus-pilih">' +
              T('Hapus') + '</button>'
            : '') +
        '</div>' +

        grupTampil.map(function (gt) {
          var gu = grupUang(gt.sellerId);
          if (gu && !gu.ongkirInfo.gratis) muatTarif(gu);
          var semuaTokoDipilih = gt.items.every(function (i) { return i.pilih; });
          var hematToko = U.sum(gt.items.filter(function (i) { return i.pilih; }),
            function (i) { return (i.hargaAsli - i.harga) * i.qty; });

          return '<div class="krj-toko">' +
            '<div class="krj-toko__head">' +
              cek('pilih-toko', 'data-sid="' + U.esc(gt.sellerId || '') + '"', semuaTokoDipilih) +
              '<span class="krj-toko__ik">' + (gt.sellerId ? '🏪' : '🏛️') + '</span>' +
              '<b class="krj-toko__nama">' + U.esc(gt.nama) + '</b>' +
              '<div class="spacer"></div>' +
              /* Hanya lencana gratis ongkir yang tersisa — itu keputusan dari
                 ambang belanja, yang sudah bisa dipastikan di sini. Harga
                 ongkirnya sendiri tidak: ia bergantung kurir yang baru dipilih
                 di halaman pembayaran. */
              (gu && gu.ongkirInfo.gratis
                ? '<span class="krj-gratis">' + T('GRATIS ONGKIR') + '</span>' : '') +
            '</div>' +

            gt.items.map(barisKeranjang).join('') +

            (hematToko
              ? '<div class="krj-hemat">🏷️ ' + T('Hemat') + ' ' + U.rp(hematToko) + ' ' +
                T('dari promo') + '</div>' : '') +

            /* Berat tetap ditampilkan — itu sifat barangnya, bukan hasil
               pilihan kurir, dan pembeli memakainya untuk menduga ongkirnya.
               Pemilihan kurirnya sendiri sudah pindah ke halaman pembayaran. */
            (gu
              ? '<div class="ongkir-info">' +
                  (gu.ongkirInfo.km !== null ? '<span class="km">' + gu.ongkirInfo.km + ' km</span>' : '') +
                  '<span>⚖️ ' + KIRIM.teksBerat(KIRIM.totalBerat(gu.items.map(function (i) {
                    return { productId: i.produk.id, qty: i.qty }; }))) + '</span>' +
                '</div>'
              : '') +
          '</div>';
        }).join('') +

        (itemHabis.length
          ? '<div class="krj-toko krj-toko--habis">' +
              '<div class="krj-toko__head">' +
                '<span class="krj-toko__ik">🚫</span>' +
                '<b class="krj-toko__nama">' + T('Stok habis') + '</b>' +
                '<div class="spacer"></div>' +
                '<span class="tbl-sub">' + itemHabis.length + ' ' + T('barang') + '</span>' +
              '</div>' +
              '<div class="tbl-sub" style="padding-bottom:4px">' +
                T('Barang berikut tidak ikut dibeli. Simpan ke Wishlist supaya tidak hilang, ' +
                  'atau hapus dari keranjang.') + '</div>' +
              itemHabis.map(barisKeranjang).join('') +
            '</div>'
          : '')

        : '<div class="tbl-sub" style="padding:8px 0">' +
          T('Belum ada barang di keranjang.') + '</div>') +

        (grup.length > 1
          ? '<div class="tbl-sub mt-2">' + T('Barang berasal dari') + ' ' + grup.length + ' ' +
            T('toko, jadi akan menjadi') + ' ' + grup.length + ' ' +
            T('pesanan terpisah dengan ongkir masing-masing.') + '</div>' : '') +

        (adaPilih ?
          '<div class="mt-3">' +
            barisT(T('Subtotal'), U.rp(h.subtotal)) +
            barisT('Ppn ' + Ppn + '%', U.rp(h.ppnRp)) +
            (hemat ? barisT('<span style="color:var(--danger)">' + T('Hemat dari promo') + '</span>',
              '<span style="color:var(--danger)">−' + U.rp(hemat) + '</span>') : '') +
            '<div class="row mt-1" style="border-top:1px solid var(--line);padding-top:8px">' +
              '<b>' + T('Total harga') + '</b><div class="spacer"></div>' +
              '<b style="font-size:18px;color:var(--brand-dark)">' + U.rp(h.total) + '</b></div>' +
            /* Ongkir sengaja TIDAK muncul di sini. Ia baru bisa dihitung
               setelah kurirnya dipilih, dan itu terjadi di halaman pembayaran.
               Menampilkan angka perkiraan yang berubah di layar berikutnya
               membuat pembeli merasa harganya diam-diam dinaikkan. */
            '<div class="tbl-sub mt-1">' + T('Ongkos kirim dihitung di halaman pembayaran.') +
              (subtotal < GRATIS_ONGKIR
                ? ' ' + T('Belanja') + ' ' + U.rp(GRATIS_ONGKIR - subtotal) + ' ' +
                  T('lagi untuk gratis ongkir.') : '') + '</div>' +
          '</div>'
        : ''),
      /* Bilah beli menempel di dasar layar selama halaman keranjang digulir.
         Halamannya panjang — barang, ongkir, alamat, metode bayar — dan tombol
         yang hanya ada di ujung bawah memaksa pembeli menggulir kembali hanya
         untuk menemukannya. Totalnya ikut menempel supaya angka yang dibayar
         selalu terlihat saat jumlah atau centangnya diubah. */
      foot: adaPilih
        ? '<div class="krj-beli">' +
            '<div class="krj-beli__ki">' +
              '<div class="krj-beli__lb">' + T('Total') + '</div>' +
              '<div class="krj-beli__rp">' + U.rp(h.total) + '</div>' +
              (hemat ? '<div class="krj-beli__hemat">' + T('Total diskon') + ' ' +
                U.rp(hemat) + '</div>' : '') +
            '</div>' +
            '<button class="btn btn--lg" data-act="checkout">' + T('Beli') +
              ' (' + jumlahPilih() + ')</button>' +
          '</div>'
        : '<span class="tbl-sub">' + (semua.length
            ? T('Centang barang yang ingin dibeli.')
            : T('Total belanja akan muncul di sini.')) + '</span>'
    }) +
    (adaPilih ? '<div class="tbl-sub mt-2" style="text-align:center">' +
      T('Stok dikonfirmasi admin sebelum pembayaran. Anda akan menerima konfirmasi via WhatsApp.') +
      '</div>' : '');
  }

  function barisT(l, v) {
    return '<div class="row" style="padding:3px 0"><span class="tbl-sub">' + l + '</span>' +
      '<div class="spacer"></div><span>' + v + '</span></div>';
  }

  function simpanDraftKirim() {
    if (!U.$('#tk-alamat')) return;
    draftKirim.alamat = U.$('#tk-alamat').value;
    draftKirim.metode = U.$('#tk-metode').value;
    draftKirim.catatan = U.$('#tk-catatan').value;
  }

  function gambarKeranjang() {
    simpanDraftKirim();
    var box = U.$('#keranjang');
    if (box) box.innerHTML = panelKeranjang();
  }

  /* ================================================================ KLIEN: PESANAN */
  function clientPesanan() {
    var list = U.sortBy(DB.where('shopOrders', { clientId: APP.user.id }),
      function (p) { return p.createdAt; }, true);
    var jalan = list.filter(function (p) { return ['baru', 'dikonfirmasi', 'dikemas', 'dikirim'].indexOf(p.status) >= 0; });

    return '<div class="grid g-3 mb-3">' +
      UI.stat({ label: T('Pesanan berjalan'), value: jalan.length, icon: '📦',
        meta: jalan.length ? UI.statusText('shop', jalan[0].status) : T('tidak ada') }) +
      UI.stat({ label: T('Total belanja'), small: true,
        valueHTML: U.rp(U.sum(list.filter(function (p) { return p.status !== 'dibatalkan'; }),
          function (p) { return p.total; })), icon: '🛍️', meta: list.length + ' pesanan' }) +
      UI.stat({ label: T('Barang paling sering dibeli'), small: true,
        valueHTML: U.esc(U.potong(seringDibeli(list) || '—', 22)), icon: '⭐', meta: 'berdasarkan riwayat' }) +
    '</div>' +

    UI.card({ title: T('Riwayat Pesanan Toko'), flush: true,
      tools: '<button class="btn btn--sm" data-nav="toko">＋ Belanja Lagi</button>',
      body: UI.table([
        { h: T('No. / Toko'), r: function (p) { return '<div class="code">' + U.esc(p.no) + '</div>' +
          '<div class="tbl-sub">' + (p.sellerId ? '🏪 ' : '🏛️ ') + U.esc(SELLER.namaToko(p.sellerId)) + '</div>' +
          '<div class="tbl-sub">' + U.tglJam(p.createdAt) + '</div>'; } },
        { h: T('Barang'), r: function (p) {
          return (p.items || []).slice(0, 2).map(function (i) {
            var pr = BIZ.produk(i.productId);
            return '<div style="font-size:12.4px">' + (pr ? pr.icon + ' ' : '') +
              U.esc(U.potong(pr ? pr.nama : '—', 32)) + ' <span class="tbl-sub">×' + i.qty + '</span></div>';
          }).join('') + (p.items.length > 2 ? '<div class="tbl-sub">+' + (p.items.length - 2) + ' ' + T('barang lain') + '</div>' : ''); } },
        { h: T('Total'), cls: 'num', r: function (p) { return '<b>' + U.rp(p.total) + '</b>'; } },
        { h: T('Status'), r: function (p) { return UI.statusChip('shop', p.status) +
          (p.resi ? '<div class="tbl-sub mt-1">Resi ' + U.esc(p.resi) + '</div>' : ''); } },
        { h: T('Tagihan'), r: function (p) {
          var inv = BIZ.invoiceToko(p.id);
          if (!inv) return '<span class="tbl-sub">' + T('belum terbit') + '</span>';
          return UI.statusChip('invoice', inv.status) + '<div class="tbl-sub mt-1">' + U.esc(inv.no) + '</div>'; } },
        { h: '', cls: 'act', r: function (p) {
          var b = '<button class="btn btn--ghost btn--sm" data-act="detail-tk" data-id="' + p.id + '">' + T('Detail') + '</button>';
          var inv = BIZ.invoiceToko(p.id);
          if (inv && inv.status !== 'lunas') {
            var tx = PAY.txAktif(inv.id);
            b += tx
              ? ' <button class="btn btn--sm" data-act="lanjut-bayar-tk" data-id="' + tx.id + '">Lanjutkan Bayar</button>'
              : ' <button class="btn btn--sm" data-act="bayar-tk" data-id="' + inv.id + '">💳 Bayar</button>';
          }
          if (p.status === 'dikirim') b += ' <button class="btn btn--ghost btn--sm" data-act="terima" data-id="' + p.id +
            '">' + T('Barang Diterima') + '</button>';
          /* Tombolnya baru ada setelah barang DITERIMA, dan hilang lagi
             setelah semuanya diulas — bukan ditampilkan lalu ditolak saat
             ditekan. Tombol yang selalu ada tetapi kadang menolak membuat
             orang menebak-nebak syaratnya. */
          var belum = ULASAN.bisaDiulas(p.id);
          if (belum.length) b += ' <button class="btn btn--soft btn--sm" data-act="ulas" data-id="' +
            p.id + '">⭐ ' + T('Beri Ulasan') + (belum.length > 1 ? ' (' + belum.length + ')' : '') + '</button>';
          if (p.status === 'baru') b += ' <button class="btn btn--ghost btn--sm" data-act="batal-tk" data-id="' +
            p.id + '">' + T('Batalkan') + '</button>';
          b += ' <button class="btn btn--soft btn--sm" data-act="beli-lagi" data-id="' + p.id +
            '">🔁 Beli Lagi</button>';
          return b; } }
      ], list, { icon: '🛒', judul: T('Belum pernah berbelanja'),
        teks: T('Buka menu Toko untuk melihat katalog alat & chemical kebersihan.') }) });
  }

  /**
   * Pesan ulang: masukkan kembali barang dari sebuah pesanan lama.
   *
   * Yang disalin HANYA productId dan jumlahnya — harga TIDAK ikut. Pesanan
   * lama membekukan harga saat itu, dan menyalinnya berarti menjanjikan
   * harga yang sudah tidak berlaku; keranjang selalu menghitung ulang dari
   * katalog yang sekarang.
   *
   * Barang yang sudah tidak ada, dinonaktifkan, atau stoknya habis tidak
   * dimasukkan diam-diam — jumlahnya disebut, supaya pembeli tahu pesanannya
   * tidak sama persis dengan yang dulu sebelum sampai di layar pembayaran.
   */
  function beliLagi(pesananId) {
    var so = BIZ.pesananToko(pesananId);
    if (!so) { UI.toast(T('Pesanan tidak ditemukan'), 'err'); return; }

    var masuk = [], hilang = [], habis = [];
    (so.items || []).forEach(function (i) {
      var p = BIZ.produk(i.productId);
      if (!p || p.aktif === false) { hilang.push(p ? p.nama : i.nama || 'Barang'); return; }
      if (typeof p.stok === 'number' && p.stok <= 0) { habis.push(p.nama); return; }
      /* Stok terbatas: jumlahnya diturunkan, bukan pesanannya ditolak. */
      var qty = i.qty;
      if (typeof p.stok === 'number' && qty > p.stok) qty = p.stok;
      masuk.push({ produk: p, qty: qty, kurang: qty < i.qty ? i.qty : 0 });
    });

    if (!masuk.length) {
      UI.modal({
        title: T('Tidak ada barang yang bisa dipesan ulang'), size: 'narrow',
        /* Stok habis dan barang ditarik dari katalog dibedakan. Keduanya
           sama-sama menghalangi hari ini, tetapi yang satu tinggal ditunggu
           dan yang lain harus dicarikan pengganti — menyamakannya membuat
           pembeli percuma mencari barang yang sebenarnya akan kembali. */
        body: UI.alert('warn',
          (habis.length && !hilang.length
            ? T('Seluruh barang pada pesanan') + ' <b>' + U.esc(so.no) + '</b> sedang <b>' + T('habis stok') + '</b>. ' +
              T('Barangnya masih ada di katalog — silakan coba lagi beberapa hari ke depan.')
            : !habis.length
              ? T('Seluruh barang pada pesanan <b>{no}</b> sudah <b>ditarik dari ' +
                  'katalog</b>. Silakan cari penggantinya lewat pencarian produk.')
                  .replace('{no}', U.esc(so.no))
              : T('Barang pada pesanan <b>{no}</b> sedang habis stok ({habis}) atau ' +
                  'sudah ditarik dari katalog ({hilang}).')
                  .replace('{no}', U.esc(so.no))
                  .replace('{habis}', habis.length)
                  .replace('{hilang}', hilang.length)),
          '📦'),
        foot: '<div class="spacer"></div><button class="btn" data-close>' + T('Tutup') + '</button>'
      });
      return;
    }

    var adaIsi = keranjang.length > 0;
    UI.modal({
      title: T('Pesan ulang') + ' ' + so.no, size: 'narrow',
      sub: masuk.length + ' ' + T('barang siap dimasukkan ke keranjang'),
      body:
        '<div class="mini-list" style="margin:0 -18px">' + masuk.map(function (m) {
          return '<div class="mini-item"><div style="min-width:0;flex:1">' +
            '<b style="font-size:12.6px">' + (m.produk.icon || '') + ' ' + U.esc(m.produk.nama) + '</b>' +
            (m.kurang ? '<div class="tbl-sub">' + T('stok tinggal') + ' ' + m.qty +
               ' ' + T('— sebelumnya Anda pesan') + ' ' + m.kurang + '</div>' : '') +
            '</div><div class="right"><b>×' + m.qty + '</b>' +
            '<div class="tbl-sub">' + U.rp(m.produk.harga) + '</div></div></div>';
        }).join('') + '</div>' +
        (hilang.length || habis.length
          ? '<div class="mt-2">' + UI.alert('warn',
              (hilang.length ? '<b>' + hilang.length + ' ' + T('barang') + '</b> ' + T('tidak ada lagi di katalog:') + ' ' +
                U.esc(hilang.join(', ')) + '. ' : '') +
              (habis.length ? '<b>' + habis.length + ' ' + T('barang') + '</b> sedang habis: ' +
                U.esc(habis.join(', ')) + '.' : ''), '⚠️') + '</div>'
          : '') +
        '<div class="mt-2">' + UI.alert('info', T('Harga mengikuti katalog') + ' <b>' + T('hari ini') + '</b>, ' +
          T('bukan harga saat pesanan lama dibuat.'), '💡') + '</div>' +
        (adaIsi
          ? '<div class="mt-2">' + UI.alert('brand', T('Keranjang Anda sudah berisi') + ' ' + keranjang.length +
              ' ' + T('barang. Barang di atas akan') + ' <b>ditambahkan</b>, bukan menggantikannya.', '🛒') + '</div>'
          : ''),
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="ok-ulang">' + T('Masukkan ke Keranjang') + '</button>',
      actions: {
        'ok-ulang': function (el) {
          masuk.forEach(function (m) {
            var ada = keranjang.filter(function (k) { return k.productId === m.produk.id; })[0];
            if (ada) {
              ada.qty += m.qty;
              if (typeof m.produk.stok === 'number' && ada.qty > m.produk.stok) ada.qty = m.produk.stok;
            } else keranjang.push({ productId: m.produk.id, qty: m.qty, pilih: true });
          });
          el.closest('.modal-back').remove(); document.body.style.overflow = '';
          UI.toast(masuk.length + ' ' + T('barang masuk keranjang'), 'ok');
          if (window.APP && APP.segarkanTopbar) APP.segarkanTopbar();
          APP.refresh();
        }
      }
    });
  }

  function seringDibeli(list) {
    var hitung = {};
    list.forEach(function (p) { (p.items || []).forEach(function (i) {
      hitung[i.productId] = (hitung[i.productId] || 0) + i.qty; }); });
    var top = U.sortBy(Object.keys(hitung).map(function (k) { return { id: k, n: hitung[k] }; }),
      function (x) { return x.n; }, true)[0];
    return top ? BIZ.produkNama(top.id) : null;
  }

  /* ================================================================ KLIEN: AKSI */
  /* ==================================================== MENULIS ULASAN
     Satu dialog untuk seluruh barang yang belum diulas pada satu pesanan.
     Dibuat begitu karena orang membeli beberapa barang sekaligus, dan
     membuka dialog terpisah untuk tiap barang membuat mereka berhenti di
     barang kedua. */
  function dialogUlas(shopOrderId) {
    var belum = ULASAN.bisaDiulas(shopOrderId);
    if (!belum.length) { UI.toast(T('Semua barang pada pesanan ini sudah diulas'), 'info'); return; }

    function barisHTML(x, i) {
      return '<div class="ul-tulis" data-i="' + i + '">' +
        '<div class="ul-tulis__kepala">' +
          '<span class="ul-tulis__ic">' + U.ikon(x.produk.icon) + '</span>' +
          '<b>' + U.esc(x.produk.nama) + '</b>' +
        '</div>' +
        '<div class="ul-pilih" data-p="' + U.esc(x.productId) + '">' +
          [1, 2, 3, 4, 5].map(function (b) {
            return '<button type="button" class="ul-pilih__b" data-act="bintang" ' +
              'data-p="' + U.esc(x.productId) + '" data-b="' + b + '">☆</button>';
          }).join('') +
          '<span class="ul-pilih__ket"></span>' +
        '</div>' +
        '<textarea class="textarea" rows="2" data-komentar="' + U.esc(x.productId) + '" ' +
          'maxlength="' + ULASAN.KOMENTAR_MAKS + '" placeholder="' +
          T('Ceritakan singkat — kualitas, kemasan, kesesuaian dengan keterangannya. Boleh dikosongkan.') +
          '"></textarea>' +
      '</div>';
    }

    /* Bintang yang sudah dipilih disimpan di sini, bukan dibaca dari DOM saat
       disimpan: tombolnya bukan input, jadi tidak ada nilai yang bisa dibaca. */
    var pilihan = {};

    var tutup = UI.modal({
      title: T('Beri Ulasan'), size: 'narrow',
      sub: belum.length + ' ' + T('barang menunggu diulas'),
      body: '<div class="tbl-sub mb-2">' +
          T('Ulasan Anda tampil di halaman produk dan memengaruhi urutan katalog. ' +
            'Yang jujur lebih berguna daripada yang murah hati.') + '</div>' +
        belum.map(barisHTML).join(''),
      foot: '<button class="btn btn--ghost" data-close>' + T('Nanti saja') + '</button>' +
        '<button class="btn" data-act="simpan-ulasan">' + T('Kirim Ulasan') + '</button>',
      actions: {
        bintang: function (el) {
          var pid = el.getAttribute('data-p');
          var b = Number(el.getAttribute('data-b'));
          pilihan[pid] = b;
          var kotak = el.closest('.ul-pilih');
          [].forEach.call(kotak.querySelectorAll('.ul-pilih__b'), function (x, i) {
            x.textContent = i < b ? '★' : '☆';
            x.classList.toggle('on', i < b);
          });
          var ket = kotak.querySelector('.ul-pilih__ket');
          /* Kata-katanya sengaja BUKAN skala mutu MCS. Keduanya pernah memakai
             kunci yang sama, sehingga bintang satu produk dan ruangan kotor
             berbagi satu terjemahan — dan yang menang bukan yang dipakai
             di sini. */
          if (ket) {
            ket.textContent = [T('Sangat buruk'), T('Kurang baik'), T('Lumayan'),
              T('Bagus'), T('Sangat bagus')][b - 1];
          }
        },
        'simpan-ulasan': function (el) {
          var akar = el.closest('.modal');
          var ditulis = 0, gagal = null;
          belum.forEach(function (x) {
            var b = pilihan[x.productId];
            if (!b) return;           /* tanpa bintang berarti dilewati */
            var ta = akar.querySelector('[data-komentar="' + x.productId + '"]');
            try {
              ULASAN.tulis(APP.user.id, shopOrderId, x.productId, b, ta ? ta.value : '');
              ditulis++;
            } catch (e) { gagal = e.message; }
          });
          if (!ditulis) {
            UI.toast(gagal || T('Beri bintang dulu pada barang yang ingin diulas'), 'err');
            return;
          }
          tutup();
          UI.toast(ditulis + ' ' + T('ulasan terkirim — terima kasih'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  /* Dipakai dua peta aksi: halaman detail produk dan daftar pesanan. */
  function aksiHapusUlasan(el) {
    var id = el.getAttribute('data-id');
    UI.konfirm({ title: T('Hapus ulasan Anda?'),
      text: T('Ulasan akan hilang dari halaman produk dan tidak lagi dihitung pada rata-ratanya.'),
      okText: T('Hapus'), danger: true }).then(function (ya) {
      if (!ya) return;
      try { ULASAN.hapus(APP.user, id); UI.toast(T('Ulasan dihapus'), 'ok'); APP.refresh(); }
      catch (e) { UI.toast(e.message, 'err'); }
    });
  }

  function clientAksi(root) {
    ViewAfiliasi.aksiBagikan(root);   /* tombol bagikan pada kartu produk */
    muatFotoKartu(root);              /* foto produk menyusul dari IndexedDB */
    U.delegate(root, {
      /* Perpindahan antara katalog dan keranjang. Dulu keduanya satu halaman,
         jadi aksi ini hanya perlu ada di layar detail produk; sejak keranjang
         berdiri sendiri, bilah di dasar katalog dan tombol "Lanjut belanja" di
         halaman keranjang memakainya juga. */
      ulas: function (el) { dialogUlas(el.getAttribute('data-id')); },
      'hapus-ulasan': aksiHapusUlasan,
      'ke-toko': function () { simpanDraftKirim(); APP.go('toko'); },
      'ke-keranjang': function () { APP.go('keranjang'); },

      kat: function (el) { simpanDraftKirim(); filterKat = el.getAttribute('data-k'); APP.refresh(); },
      cari: function (el) {
        simpanDraftKirim(); cari = el.value; APP.refresh();
        UI.fokusCari(document, 'cari-produk');
      },

      /* --- urutkan & filter --- */
      urut: function (el) { simpanDraftKirim(); urut = urutSah(el.value); APP.refresh(); },
      'buka-filter': function () { simpanDraftKirim(); bukaLembarFilter(); },
      'reset-filter': function () {
        simpanDraftKirim();
        cari = ''; filterKat = 'semua'; urut = 'sesuai';
        PFILTER.reset();
        APP.refresh();
      },

      /* --- centang barang ---
         Semuanya memanggil APP.refresh(), bukan gambarKeranjang(). Mengubah
         centang mengubah ongkir, total, dan daftar kurir sekaligus — dan
         menggambar ulang sebagian meninggalkan angka lama di layar bersama
         angka baru, keadaan yang lebih buruk daripada kedipan sesaat. */
      'pilih-item': function (el) {
        setPilih(el.getAttribute('data-id'), el.checked);
        simpanDraftKirim(); APP.refresh();
      },
      /* Barang yang stoknya habis dilewati: mencentangnya tidak akan pernah
         membuatnya ikut dibeli, dan kotak yang tercentang tetapi tidak
         berpengaruh lebih membingungkan daripada kotak yang tidak bergerak. */
      'pilih-toko': function (el) {
        var sid = el.getAttribute('data-sid') || '';
        var on = el.checked;
        keranjang.forEach(function (k) {
          var p = BIZ.produk(k.productId);
          if (p && (p.sellerId || '') === sid && statusStok(p) !== 'habis') k.pilih = on;
        });
        simpanDraftKirim(); APP.refresh();
      },
      'pilih-semua': function (el) {
        var on = el.checked;
        keranjang.forEach(function (k) {
          var p = BIZ.produk(k.productId);
          if (p && statusStok(p) !== 'habis') k.pilih = on;
        });
        simpanDraftKirim(); APP.refresh();
      },
      /* Memindahkan, bukan menyalin: barangnya keluar dari keranjang. Kalau
         disalin, orang menekan hati untuk "menyimpannya dulu" lalu tetap
         membayarnya di layar berikutnya. */
      'ke-wishlist': function (el) {
        var id = el.getAttribute('data-id');
        var p = BIZ.produk(id);
        var baru = tambahWishlist(id);
        /* Wishlist menyimpan produk, bukan varian — tetapi yang dikeluarkan
           dari keranjang tetap hanya baris yang ditekan. */
        var kkw = kunciItem(id, el.getAttribute('data-var') || null);
        keranjang = keranjang.filter(function (k) { return kunciDari(k) !== kkw; });
        simpanDraftKirim();
        UI.toast((p ? U.potong(p.nama, 24) + ' ' : '') +
          (baru ? T('dipindahkan ke Wishlist') : T('sudah ada di Wishlist — dikeluarkan dari keranjang')), 'ok');
        APP.refresh();
      },
      'wishlist-buang': function (el) {
        buangWishlist(el.getAttribute('data-id'));
        APP.refresh();
      },
      'wishlist-keranjang': function (el) {
        var id = el.getAttribute('data-id');
        var p = BIZ.produk(id);
        if (!p) return;
        if (statusStok(p) === 'habis') { UI.toast(T('Stok habis'), 'warn'); return; }
        if (!keranjang.filter(function (k) { return k.productId === id; })[0]) {
          keranjang.push({ productId: id, qty: 1, pilih: true });
        }
        buangWishlist(id);
        UI.toast(U.potong(p.nama, 24) + ' ' + T('masuk keranjang'), 'ok');
        APP.refresh();
      },
      'ke-wishlist-hal': function () { APP.go('wishlist'); },

      'hapus-pilih': function () {
        var n = jumlahPilih();
        if (!n) return;
        UI.konfirm({
          title: T('Hapus barang terpilih?'),
          text: n + ' ' + T('produk akan dikeluarkan dari keranjang.'),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var buang = {};
          terpilih(isiKeranjang()).forEach(function (i) {
            buang[kunciItem(i.productId, i.varianId)] = true; });
          keranjang = keranjang.filter(function (k) { return !buang[kunciDari(k)]; });
          simpanDraftKirim(); APP.refresh();
        });
      },

      /* --- pilih kurir per toko --- */
      'kurir-lagi': function (el) {
        var sid = el.getAttribute('data-sid');
        kurirLengkap[sid] = !kurirLengkap[sid];
        gambarKeranjang();
      },
      'pilih-kurir': function (el) {
        var sid = el.getAttribute('data-sid');
        var st = kurirOpsi[sid];
        if (!st) return;
        var k = el.getAttribute('data-kurir'), l = el.getAttribute('data-layanan');
        kurirDipilih[sid] = st.opsi.filter(function (o) {
          return o.kurir === k && o.layanan === l; })[0] || null;
        gambarKeranjang();
      },
      tambah: function (el) {
        var tg = targetDari(el), id = tg.id, p = BIZ.produk(id);
        /* bila produk ini dibuka dari kartu bersponsor, kliknya ditagihkan ke penjual */
        var kartu = el.closest('[data-iklan]');
        if (kartu) SELLER.catatKlik(kartu.getAttribute('data-iklan'));
        /* Produk bervarian tidak bisa ditambahkan tanpa memilih varian dulu —
           tombol di kartu katalog membuka halamannya, bukan menebak varian. */
        if (!tg.varianId && VARIAN.punya(p)) { APP.go('produk', { id: id }); return; }
        var sisa = tg.varianId ? VARIAN.stok(p, tg.varianId) : p.stok;
        var k = cariItem(id, tg.varianId);
        if (k) {
          if (k.qty >= sisa) { UI.toast(T('Stok tersisa hanya') + ' ' + sisa + ' ' + p.satuan, 'warn'); return; }
          k.qty++;
        } else {
          /* Barang pertama masuk sebanyak minimum pembelian penjual, bukan satu.
             Memasukkan satu lalu menolaknya di checkout membuat orang menemukan
             aturannya di tempat paling mahal untuk berubah pikiran. */
          var min = PRODUKED.minOrder(p);
          if (min > sisa) { UI.toast(T('Stok kurang dari minimum pembelian'), 'warn'); return; }
          keranjang.push({ productId: id, varianId: tg.varianId, qty: min, pilih: true });
          if (min > 1) UI.toast(T('Minimum pembelian') + ' ' + min + ' ' + (p.satuan || ''), 'info');
        }
        simpanDraftKirim(); APP.refresh();
      },
      kurang: function (el) {
        var tg = targetDari(el), id = tg.id;
        var k = cariItem(id, tg.varianId);
        if (!k) return;
        var pr = BIZ.produk(id);
        var minK = pr ? PRODUKED.minOrder(pr) : 1;
        /* Di bawah minimum tidak ada angka yang sah, jadi turun dari minimum
           berarti mengeluarkannya dari keranjang — bukan berhenti pada angka
           yang tidak bisa dibeli. */
        if (k.qty <= minK) {
          var kk = kunciDari(k);
          keranjang = keranjang.filter(function (x) { return kunciDari(x) !== kk; });
          simpanDraftKirim(); APP.refresh(); return;
        }
        k.qty--;
        simpanDraftKirim(); APP.refresh();
      },
      setqty: function (el) {
        var tg = targetDari(el), id = tg.id, p = BIZ.produk(id);
        var sisaQ = tg.varianId ? VARIAN.stok(p, tg.varianId) : p.stok;
        var n = Math.max(PRODUKED.minOrder(p), Math.min(sisaQ, Number(el.value) || 1));
        var kq = kunciItem(id, tg.varianId);
        keranjang.forEach(function (x) { if (kunciDari(x) === kq) x.qty = n; });
        el.value = n;
        gambarKeranjang();
      },
      buang: function (el) {
        /* Membuang menurut productId saja akan menghapus SEMUA varian produk
           itu sekaligus, padahal yang ditekan cuma satu baris. */
        var tg = targetDari(el), kk = kunciItem(tg.id, tg.varianId);
        keranjang = keranjang.filter(function (x) { return kunciDari(x) !== kk; });
        simpanDraftKirim(); APP.refresh();
      },
      'pilih-alamat': function (el) {
        simpanDraftKirim();
        alamatPilih = el.value;
        var a = alamatTujuan();
        if (a) draftKirim.alamat = BIZ.alamatTeks(a);
        APP.refresh();
      },
      'titik-kirim': function () { pilihTitikKirim(); },
      /* Tombol Beli hanya BERPINDAH halaman. Pemeriksaan alamat dan stok
         dilakukan di layar bayar, tempat pembeli bisa langsung memperbaikinya
         — menolaknya di sini berarti melempar pesan galat pada layar yang
         tidak punya kolom alamat sama sekali. */
      checkout: function () {
        if (!siapCheckout()) { UI.toast(T('Pilih dulu barang yang ingin dibeli'), 'err'); return; }
        simpanDraftKirim(); APP.go('kasir');
      },
      'ck-bayar': function () { kirimPesanan(); },
      'ck-voucher': function (el) {
        var id = el.getAttribute('data-id');
        voucherPilih = id ? DB.find('voucher', id) : null;
        APP.refresh();
      },
      'ck-vongkir': function (el) {
        var id = el.getAttribute('data-id');
        vOngkirPilih = id ? INSENTIF.voucherOngkir(APP.user.id).filter(function (x) {
          return x.id === id; })[0] || null : null;
        APP.refresh();
      },
      'ck-poin-maks': function () {
        var s = siapCheckout();
        var b = INSENTIF.batasPoin(APP.user.id,
          Math.max(0, U.sum(s.grup, function (x) { return x.subtotal; }) -
            (hitungVoucherCk(s.grup).rp || 0)));
        poinPakai = b.poin;
        APP.refresh();
      },
      'ck-poin-lepas': function () { poinPakai = 0; APP.refresh(); },
      'ck-metode': function (el) { draftKirim.metode = el.getAttribute('data-id'); APP.refresh(); },
      'ck-bayar-semua': function () { bayarSemua = !bayarSemua; APP.refresh(); },
      'ck-promo-buka': function () { promoBuka = !promoBuka; APP.refresh(); },
      'ck-add': function (el) {
        var k = el.getAttribute('data-id') + ':' + el.getAttribute('data-k');
        if (el.checked) pilihTambahan[k] = true; else delete pilihTambahan[k];
        APP.refresh();
      },
      'ck-poin': function (el) {
        var s = siapCheckout();
        if (!s) return;
        var b = INSENTIF.batasPoin(APP.user.id,
          Math.max(0, U.sum(s.grup, function (x) { return x.subtotal; }) -
            (hitungVoucherCk(s.grup).rp || 0)));
        /* Dijepit ke batas yang berlaku, bukan ditolak. Orang mengetik angka
           besar untuk berarti "pakai sebanyak mungkin", dan menolaknya
           dengan galat memaksa mereka menebak angka yang boleh. */
        poinPakai = Math.max(0, Math.min(Math.round(+el.value || 0), b.poin));
        APP.refresh();
      },
      'ck-asuransi': function (el) {
        var sid = el.getAttribute('data-sid') || 'resmi';
        if (el.checked) pilihAsuransi[sid] = true; else delete pilihAsuransi[sid];
        APP.refresh();
      },
      'ck-tambahan-semua': function (el) {
        var id = el.getAttribute('data-id');
        tambahanPenuh[id] = !tambahanPenuh[id];
        APP.refresh();
      },
      'ck-sk': function () { dialogSKAsuransi(); },
      'ck-catatan': function () { dialogCatatan(); },
      'ck-alamat': function () { dialogAlamat(); },
      'ck-kurir': function (el) { dialogKurir(el.getAttribute('data-sid') || ''); },
      /* Tombolnya ikut masuk ke dialog detail, bukan hanya ada di baris
         tabel. Pembeli yang membuka detail untuk memastikan isi pesanannya
         justru sedang berada di titik ia paling yakin ingin memesan lagi —
         menutup dialog dulu hanya untuk mencari tombol adalah langkah
         mundur yang tidak perlu. */
      'buka-produk': function (el) {
        descPanjang = false; mediaAktif = 0;
        APP.go('produk', { id: el.getAttribute('data-id') });
      },
      'detail-tk': function (el) {
        var id = el.getAttribute('data-id');
        Panel.detailPesananToko(id, {
          foot: '<button class="btn btn--soft" data-act="ulang-dari-detail">🔁 Beli Lagi</button>',
          actions: {
            'ulang-dari-detail': function (b) {
              b.closest('.modal-back').remove(); document.body.style.overflow = '';
              beliLagi(id);
            }
          }
        });
      },
      'beli-lagi': function (el) { beliLagi(el.getAttribute('data-id')); },
      'bayar-tk': function (el) { Bayar.pilihMetode(el.getAttribute('data-id'), APP.refresh); },
      'lanjut-bayar-tk': function (el) { Bayar.halamanBayar(el.getAttribute('data-id'), APP.refresh); },
      terima: function (el) {
        var so = BIZ.pesananToko(el.getAttribute('data-id'));
        UI.konfirm({ title: T('Konfirmasi barang diterima?'),
          htmlText: T('Pastikan barang pada pesanan') + ' <b>' + U.esc(so.no) + '</b> ' + T('sudah lengkap dan dalam kondisi baik.'),
          okText: T('Ya, sudah diterima') }).then(function (ya) {
          if (!ya) return;
          BIZ.ubahStatusToko(so.id, 'selesai');
          UI.toast(T('Terima kasih! Pesanan ditandai selesai.'), 'ok');
          APP.refresh();
        });
      },
      'batal-tk': function (el) {
        var so = BIZ.pesananToko(el.getAttribute('data-id'));
        UI.konfirm({ title: T('Batalkan pesanan') + ' ' + so.no + '?', danger: true,
          text: T('Pesanan yang belum dikonfirmasi admin masih bisa dibatalkan tanpa biaya.'),
          okText: T('Ya, batalkan') }).then(function (ya) {
          if (!ya) return;
          BIZ.ubahStatusToko(so.id, 'dibatalkan');
          UI.toast(T('Pesanan dibatalkan'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ======================================================== HALAMAN WISHLIST
     Daftar barang yang disimpan untuk nanti. Sengaja menampilkan harga dan
     stok SEKARANG, bukan yang berlaku saat disimpan: itulah gunanya membuka
     wishlist — melihat apa yang berubah sejak terakhir dilihat. */
  function halamanWishlist() {
    var ids = wishlist();
    var list = ids.map(function (id) { return BIZ.produk(id); }).filter(Boolean);

    if (!list.length) {
      return '<div class="krj-hal">' +
        UI.empty('♡', T('Wishlist Anda masih kosong'),
          T('Tekan ikon hati pada barang di keranjang untuk menyimpannya di sini ' +
            'tanpa harus membelinya sekarang.')) +
        '<div class="row mt-3" style="justify-content:center">' +
          '<button class="btn" data-act="ke-toko">' + T('Mulai Belanja') + '</button>' +
        '</div></div>';
    }

    /* Yang habis turun ke bawah, sama seperti di keranjang. */
    var urut = list.filter(function (p) { return statusStok(p) !== 'habis'; })
      .concat(list.filter(function (p) { return statusStok(p) === 'habis'; }));

    return '<div class="krj-hal">' +
      '<div class="row mb-2">' +
        '<button class="btn btn--ghost btn--sm" data-act="ke-toko">← ' + T('Lanjut belanja') + '</button>' +
      '</div>' +
      UI.card({
        title: T('Wishlist'), sub: list.length + ' ' + T('barang disimpan'),
        body: urut.map(function (p) {
          var ht = SELLER.hargaTayang(p);
          var habis = statusStok(p) === 'habis';
          var persen = ht.asli > ht.harga ? Math.round((ht.asli - ht.harga) / ht.asli * 100) : 0;
          return '<div class="krj-item' + (habis ? ' krj-item--habis' : '') + '">' +
            '<div class="krj-item__ic" data-act="buka-produk" data-id="' + U.esc(p.id) + '">' +
              U.ikon(p.icon) + '</div>' +
            '<div class="krj-item__isi">' +
              '<div class="krj-item__nama" data-act="buka-produk" data-id="' + U.esc(p.id) + '">' +
                U.esc(p.nama) + '</div>' +
              '<div class="krj-item__hrg">' +
                '<b>' + U.rp(ht.harga) + '</b>' +
                (persen ? '<s>' + U.rp(ht.asli) + '</s>' +
                  '<span class="krj-item__disk">' + persen + '%</span>' : '') +
              '</div>' +
              '<div class="krj-item__sat">' + U.esc(SELLER.namaToko(p.sellerId)) + '</div>' +
              (habis ? '<div class="krj-habis">' + T('Stok habis') + '</div>' : '') +
            '</div>' +
            '<div class="krj-item__qty">' +
              '<button class="krj-hapus" data-act="wishlist-buang" data-id="' + U.esc(p.id) +
                '" title="' + T('Hapus dari Wishlist') + '">🗑</button>' +
              '<button class="btn btn--soft btn--sm" data-act="wishlist-keranjang" data-id="' +
                U.esc(p.id) + '"' + (habis ? ' disabled' : '') + '>＋ ' + T('Keranjang') + '</button>' +
            '</div>' +
          '</div>';
        }).join('')
      }) +
    '</div>';
  }

  /* ========================================================= HALAMAN CHECKOUT
     Dulu sebuah modal konfirmasi. Dijadikan halaman karena isinya bukan
     konfirmasi: alamat, kurir per toko, voucher, dan metode pembayaran semua
     DIPUTUSKAN di sini. Modal memaksa keputusan-keputusan itu masuk ke kotak
     yang bisa tertutup tanpa sengaja, dan pada layar telepon ia menyisakan
     ruang baca yang lebih sempit daripada halaman biasa.

     Susunannya dari atas ke bawah mengikuti urutan orang memeriksa pesanan:
     ke mana dikirim → apa yang dikirim → berapa ongkirnya → potongan apa yang
     dipakai → dibayar dengan apa → berapa totalnya. */

  var voucherPilih = null;    /* voucher yang sedang dipilih di checkout */
  var vOngkirPilih = null;    /* voucher ongkir dari penukaran poin */
  var poinPakai = 0;          /* berapa poin dipakai membayar */

  /* Insentif untuk satu keranjang: batas poin, voucher ongkir yang dimiliki,
     dan cashback yang akan didapat. Dihitung dari SATU tempat supaya angka
     di bilah ringkasan dan angka yang disimpan ke pesanan tidak pernah
     berasal dari dua perhitungan yang berbeda. */
  function insentifCk(grup, v) {
    if (!window.INSENTIF || !APP.user) {
      return { poin: { poin: 0, rp: 0 }, ongkir: 0, cashback: { rp: 0 }, sasaran: null };
    }
    var sasaran = U.sortBy(grup, function (x) { return x.subtotal; }, true)[0] || null;
    var subtotal = U.sum(grup, function (x) { return x.subtotal; });
    var ongkirTotal = U.sum(grup, function (x) { return x.ongkir || 0; });
    var diskon = (v && v.rp) || 0;

    /* Voucher ongkir menempel pada pesanan yang ongkirnya PALING BESAR —
       di sanalah manfaatnya paling terasa, dan membaginya ke beberapa toko
       membuat pengembalian saat salah satunya batal tidak bisa dihitung. */
    var sasaranOngkir = U.sortBy(grup, function (x) { return x.ongkir || 0; }, true)[0] || null;
    var potOngkir = vOngkirPilih && sasaranOngkir
      ? INSENTIF.potonganOngkir(vOngkirPilih, sasaranOngkir.ongkir || 0).rp : 0;

    var batas = INSENTIF.batasPoin(APP.user.id, Math.max(0, subtotal - diskon));
    var poinDipakai = Math.min(poinPakai, batas.poin);

    return {
      batas: batas,
      poinDipakai: poinDipakai,
      poinRupiah: INSENTIF.rupiahPoin(poinDipakai),
      ongkir: potOngkir, sasaranOngkir: sasaranOngkir,
      punyaVOngkir: INSENTIF.voucherOngkir(APP.user.id),
      cashback: INSENTIF.hitungCashback('toko', Math.max(0, subtotal - diskon)),
      sasaran: sasaran, ongkirTotal: ongkirTotal
    };
  }
  var bayarSemua = false;     /* daftar metode bayar sedang dibentang */
  var promoBuka = true;       /* rincian promo pada ringkasan sedang terbuka */
  var BAYAR_TAMPIL = 4;

  /** Kumpulkan semua yang dibutuhkan halaman checkout, atau null bila belum siap. */
  function siapCheckout() {
    var items = terpilih(isiKeranjang());
    if (!items.length) return null;
    return { items: items, grup: perToko(items) };
  }

  function hitungVoucherCk(grup) {
    if (!voucherPilih) return { rp: 0, sisaHangus: 0, jenis: null, sasaran: null };
    /* Voucher hanya berlaku pada SATU pesanan — yang terbesar. Membaginya ke
       beberapa toko membuat pengembalian dana saat salah satu pesanan batal
       tidak bisa dihitung dengan jujur. */
    var sasaran = U.sortBy(grup, function (g) { return g.subtotal; }, true)[0];
    var h = VOUCHER.potongan(voucherPilih, sasaran.subtotal);
    return Object.assign(h, { sasaran: sasaran, jenis: voucherPilih.jenis });
  }

  function totalPesanan(grup, v, ins) {
    ins = ins || { ongkir: 0, poinRupiah: 0 };
    var kasar = U.sum(grup, function (g) {
      var diskon = (v.rp && v.sasaran === g) ? v.rp : 0;
      var pot = (ins.ongkir && ins.sasaranOngkir === g) ? ins.ongkir : 0;
      return BIZ.hitungToko(g.items, g.ongkir, Ppn, diskon, 0,
        { potonganOngkir: pot }).total;
    });
    /* Poin dikurangkan dari GABUNGAN seluruh pesanan, bukan per pesanan:
       pembeli memakai poinnya sekali untuk satu kali bayar, tidak peduli
       keranjangnya pecah jadi berapa toko. */
    return Math.max(0, kasar - (ins.poinRupiah || 0));
  }

  function barisCk(label, nilai, kelas) {
    return '<div class="ck-baris' + (kelas ? ' ' + kelas : '') + '">' +
      '<span>' + label + '</span><div class="spacer"></div><span>' + nilai + '</span></div>';
  }

  /* ---- keadaan pilihan tambahan, per barang & per toko ---- */
  var pilihTambahan = {};   /* 'productId:kode' -> true */
  var pilihAsuransi = {};   /* sellerId -> true */
  var tambahanPenuh = {};   /* productId -> true, daftar tambahan dibentangkan */

  function kunciTambahan(productId, kode) { return productId + ':' + kode; }

  /**
   * Total biaya tambahan yang sedang dipilih, dipisah per jenis.
   *
   * Dihitung dari SATU tempat dan dipakai baik oleh baris ringkasan maupun
   * oleh pembuatan pesanan. Menghitungnya dua kali adalah cara paling mudah
   * membuat yang tertulis di layar berbeda dari yang ditagih.
   */
  function hitungTambahan(grup) {
    var proteksi = 0, asuransi = 0;
    grup.forEach(function (g) {
      g.items.forEach(function (i) {
        TAMBAHAN.untukBarang(i).forEach(function (t) {
          if (pilihTambahan[kunciTambahan(i.productId, t.kode)]) proteksi += t.biaya;
        });
      });
      if (pilihAsuransi[g.sellerId || 'resmi']) {
        asuransi += TAMBAHAN.biayaAsuransi(g.subtotal);
      }
    });
    return { proteksi: proteksi, asuransi: asuransi, total: proteksi + asuransi };
  }

  /** Tanggal perkiraan tiba dari ETD kurir ("2 - 3 hari" → "21 - 23 Agu"). */
  function tanggalTiba(etd) {
    var m = String(etd || '').match(/(\d+)\s*-\s*(\d+)/);
    var satu = String(etd || '').match(/(\d+)/);
    if (!m && !satu) return '';
    var a = m ? Number(m[1]) : Number(satu[1]);
    var b = m ? Number(m[2]) : a;
    function tgl(n) {
      var d = new Date();
      d.setDate(d.getDate() + n);
      return d.getDate() + ' ' + U.BULAN_S[d.getMonth()];
    }
    return a === b ? tgl(a) : tgl(a) + ' - ' + tgl(b);
  }

  function halamanCheckout() {
    var s = siapCheckout();
    if (!s) {
      return '<div class="krj-hal">' +
        UI.empty('🧾', T('Belum ada yang perlu dibayar'),
          T('Centang dulu barang yang ingin dibeli di keranjang.')) +
        '<div class="row mt-3" style="justify-content:center">' +
          '<button class="btn" data-act="ke-keranjang">' + T('Buka Keranjang') + '</button>' +
        '</div></div>';
    }

    var items = s.items, grup = s.grup;
    var v = hitungVoucherCk(grup);
    var ins = insentifCk(grup, v);
    /* Layanan tambahan ditambahkan belakangan pada `tagihan`, bukan di sini —
       menambahkannya dua kali adalah kesalahan yang tidak terlihat sampai
       ada yang menjumlahkan struknya sendiri. */
    var total = totalPesanan(grup, v, ins);
    var tb = hitungTambahan(grup);

    var subtotal = U.sum(items, function (i) { return i.qty * i.harga; });
    var ongkir = U.sum(grup, function (g) { return g.ongkir; });
    var ppnRp = U.sum(grup, function (g) { return Math.round(g.subtotal * Ppn / 100); });
    var hematPromo = U.sum(items, function (i) { return (i.hargaAsli - i.harga) * i.qty; });
    /* Diskon ongkir = tarif yang SEHARUSNYA ditagih, dihitung ulang dengan
       subtotal nol supaya ambang gratis ongkir tidak ikut berlaku. Bukan
       angka karangan: itulah yang akan ditagih bila belanjaannya kurang. */
    var diskonOngkir = U.sum(grup, function (g) {
      return g.ongkirInfo.gratis ? (g.ongkirInfo.tarifAsli || 0) : 0; });
    var hemat = hematPromo + v.rp + diskonOngkir + (ins.ongkir || 0) + (ins.poinRupiah || 0);

    var rinci = PAY.rincian(draftKirim.metode, total);
    var keKlien = rinci.dibebankan === 'klien';
    var tagihan = total + tb.total + (keKlien ? rinci.biaya : 0);

    var u = APP.user;
    var alamatObj = alamatTujuan();
    var alamatTeks = (draftKirim.alamat !== null ? draftKirim.alamat
      : (alamatObj ? BIZ.alamatTeks(alamatObj) : (u.alamat || ''))).trim();

    var kanal = PAY.kanalTersedia();
    var kanalTampil = bayarSemua ? kanal : kanal.slice(0, BAYAR_TAMPIL);
    if (!bayarSemua && !kanalTampil.filter(function (c) { return c.id === draftKirim.metode; }).length) {
      var aktif = kanal.filter(function (c) { return c.id === draftKirim.metode; })[0];
      if (aktif) kanalTampil = kanalTampil.concat([aktif]);
    }

    var semuaGratis = grup.every(function (g) { return g.ongkirInfo.gratis; });
    var vList = POIN.aktif()
      ? VOUCHER.untukKasir(u.id, 'toko', (U.sortBy(grup, function (g) { return g.subtotal; }, true)[0] || {}).subtotal || 0)
      : [];

    return '<div class="ck">' +

      /* ---- kepala ---- */
      '<div class="ck-atas">' +
        '<button class="ck-kembali" data-act="ke-keranjang" title="' + T('Kembali') + '">←</button>' +
        '<div class="ck-atas__isi">' +
          '<h2>' + T('Checkout') + '</h2>' +
          (semuaGratis
            ? '<div class="ck-atas__gratis">🚚 ' + T('Gratis Ongkir untuk pesanan ini') + '</div>' : '') +
        '</div>' +
      '</div>' +

      /* ---- 1. alamat ---- */
      '<div class="ck-blok">' +
        '<div class="ck-jd ck-jd--kecil">' + T('Alamat pengiriman kamu') + '</div>' +
        '<button type="button" class="ck-alamat" data-act="ck-alamat">' +
          '<span class="ck-alamat__pin">📍</span>' +
          '<span class="ck-alamat__isi">' +
            '<b>' + U.esc(alamatObj ? alamatObj.label : T('Alamat utama')) +
              (u.nama ? ' · ' + U.esc(u.nama.split(' ')[0]) : '') + '</b>' +
            '<small>' + (alamatTeks ? U.esc(U.potong(alamatTeks, 46)) :
              '<span class="ck-wajib">' + T('Alamat belum diisi') + '</span>') + '</small>' +
          '</span>' +
          '<span class="ck-chev">›</span>' +
        '</button>' +
      '</div>' +

      /* ---- 2. barang per toko ---- */
      grup.map(function (g) {
        if (!g.ongkirInfo.gratis) muatTarif(g);
        var sid = g.sellerId || 'resmi';
        var kur = g.kurirPilihan;
        var biayaAs = TAMBAHAN.biayaAsuransi(g.subtotal);
        var asOn = !!pilihAsuransi[sid];

        return '<div class="ck-blok">' +
          '<div class="ck-toko">' + (g.sellerId ? '🏪' : '🏛️') + ' <b>' + U.esc(g.nama) + '</b></div>' +

          g.items.map(function (i) {
            var persen = i.hargaAsli > i.harga
              ? Math.round((i.hargaAsli - i.harga) / i.hargaAsli * 100) : 0;
            var tambahan = TAMBAHAN.untukBarang(i);
            var buka = !!tambahanPenuh[i.productId];
            var tampil = buka ? tambahan : tambahan.slice(0, 1);

            return '<div class="ck-item">' +
                '<div class="ck-item__ic">' + U.ikon(i.produk.icon) + '</div>' +
                '<div class="ck-item__isi">' +
                  '<div class="ck-item__nama">' + U.esc(i.produk.nama) + '</div>' +
                  /* Baris varian: yang membedakan satu barang dari saudaranya.
                     Katalog ini belum punya varian tersendiri, jadi yang
                     ditampilkan spesifikasi yang memang ada — merek, kode,
                     satuan. Menyebutnya "varian" padahal isinya karangan akan
                     membuat pembeli mengira ia memilih sesuatu. */
                  '<div class="ck-item__var">' + U.esc(i.produk.merek) + ', ' +
                    U.esc(i.produk.kode) + ', ' + U.esc(i.produk.satuan) + '</div>' +
                  (TAMBAHAN.bolehDikembalikan(i.produk)
                    ? '<span class="ck-retur">' + T('Gratis pengembalian') + '</span>' : '') +
                  '<div class="ck-item__hrg">' +
                    (persen ? '<s>' + U.rp(i.hargaAsli) + '</s>' +
                      '<span class="ck-item__disk">' + persen + '%</span>' : '') +
                    '<b>' + U.rp(i.harga) + '</b>' +
                    '<span class="ck-item__x">× ' + i.qty + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              /* ---- tambahan per barang ---- */
              (tambahan.length
                ? '<div class="ck-tambahan">' +
                    '<div class="ck-tambahan__jd">' + T('Tambahan') +
                      (tambahan.length > 1
                        ? '<button type="button" class="ck-tautan" data-act="ck-tambahan-semua" ' +
                          'data-id="' + U.esc(i.productId) + '">' +
                          (buka ? T('Ringkas') : T('Lihat semua')) + '</button>' : '') +
                    '</div>' +
                    tampil.map(function (t) {
                      var on = !!pilihTambahan[kunciTambahan(i.productId, t.kode)];
                      return '<label class="ck-add">' +
                        '<span class="ck-add__plus">⊕</span>' +
                        '<span class="ck-add__isi"><b>' + U.esc(t.nama) + '</b>' +
                          '<small>' + U.esc(t.ket) + '</small></span>' +
                        '<span class="ck-add__rp">' + U.rp(t.biaya) + '</span>' +
                        '<input type="checkbox" class="ck-add__cek" data-change="ck-add" ' +
                          'data-id="' + U.esc(i.productId) + '" data-k="' + U.esc(t.kode) + '"' +
                          (on ? ' checked' : '') + '>' +
                      '</label>';
                    }).join('') +
                  '</div>'
                : '');
          }).join('') +

          /* ---- pengiriman ---- */
          '<div class="ck-kirim' + (g.ongkirInfo.gratis ? ' ck-kirim--gratis' : '') + '">' +
            '<button type="button" class="ck-kirim__baris" data-act="ck-kurir" ' +
                'data-sid="' + U.esc(g.sellerId || '') + '">' +
              '<span class="ck-kirim__isi">' +
                /* Saat gratis ongkir, kurirnya TIDAK dipilih pembeli — tarif
                   kurir memang tidak diambil untuk pesanan yang ongkirnya
                   ditanggung. Menuliskan zona di sini menghasilkan "GRATIS
                   ONGKIR Gratis ongkir": dua kali hal yang sama, dan pembeli
                   tetap tidak tahu paketnya dibawa siapa. */
                '<b>' + (g.ongkirInfo.gratis
                  ? '<span class="ck-kirim__cap">' + T('GRATIS ONGKIR') + '</span> ' +
                    T('Kurir dipilihkan EXOCLEAN')
                  : U.esc(kur ? (kur.kurirNama || kur.kurir) + ' · ' + (kur.layananNama || kur.layanan)
                              : g.ongkirInfo.zona)) + '</b>' +
                '<small>' + (g.ongkirInfo.gratis
                  ? T('Estimasi tiba') + ' ' + (tanggalTiba('2 - 4') || '')
                  : kur && kur.etd
                    ? T('Estimasi tiba') + ' ' + U.esc(tanggalTiba(kur.etd) || kur.etd)
                    : T('Pilih layanan pengiriman')) + '</small>' +
              '</span>' +
              '<span class="ck-kirim__rp">' +
                (g.ongkirInfo.gratis && g.ongkirInfo.tarifAsli
                  ? '<s>' + U.rp(g.ongkirInfo.tarifAsli) + '</s> ' : '') +
                (g.ongkir ? U.rp(g.ongkir) : '<b class="ck-rp0">' + U.rp(0) + '</b>') +
              '</span>' +
              '<span class="ck-chev">›</span>' +
            '</button>' +

            (biayaAs
              ? '<label class="ck-add ck-add--dalam">' +
                  '<span class="ck-add__plus">⊕</span>' +
                  '<span class="ck-add__isi"><b>' + T('Asuransi Pengiriman') + '</b>' +
                    '<small>' + T('Ganti rugi bila paket hilang atau rusak dalam perjalanan') + '</small></span>' +
                  '<span class="ck-add__rp">' + U.rp(biayaAs) + '</span>' +
                  '<input type="checkbox" class="ck-add__cek" data-change="ck-asuransi" ' +
                    'data-sid="' + U.esc(g.sellerId || '') + '"' + (asOn ? ' checked' : '') + '>' +
                '</label>'
              : '') +
          '</div>' +

          /* ---- catatan ---- */
          '<button type="button" class="ck-baris ck-baris--klik" data-act="ck-catatan">' +
            '<span>🧾 ' + T('Kasih catatan') + '</span><div class="spacer"></div>' +
            '<span class="ck-baris__nilai">' +
              (draftKirim.catatan ? U.esc(U.potong(draftKirim.catatan, 24)) : '') +
            '</span><span class="ck-chev">›</span>' +
          '</button>' +
        '</div>';
      }).join('') +

      /* ---- 3. promo ---- */
      '<div class="ck-blok">' +
        '<div class="ck-jd">' + T('Promo buat belanjaanmu') +
          '<span class="ck-chev">›</span></div>' +
        '<div class="ck-kupon-baris">' +
          (semuaGratis
            ? '<span class="ck-kupon-chip ck-kupon-chip--on">🎫 ' + T('Gratis Ongkir') + '</span>' : '') +
          (v.rp ? '<span class="ck-kupon-chip ck-kupon-chip--on">🏷️ −' + U.rpShort(v.rp) + '</span>' : '') +
          vList.filter(function (x) { return !voucherPilih || x.id !== voucherPilih.id; })
            .slice(0, 3).map(function (x) {
              var h = VOUCHER.potongan(x, (U.sortBy(grup, function (g) { return g.subtotal; }, true)[0] || {}).subtotal || 0);
              return '<button type="button" class="ck-kupon-chip" data-act="ck-voucher" ' +
                'data-id="' + U.esc(x.id) + '">🎟️ −' + U.rpShort(h.rp) + '</button>';
            }).join('') +
          (voucherPilih
            ? '<button type="button" class="ck-kupon-chip ck-kupon-chip--lepas" ' +
              'data-act="ck-voucher" data-id="">✕ ' + T('Lepas') + '</button>' : '') +
          (!POIN.aktif()
            ? '<span class="ck-kupon-chip ck-kupon-chip--mati">💰 ' + T('Pakai Poin') +
              '<small>' + T('Program poin sedang dimatikan') + '</small></span>' : '') +
        '</div>' +
        (v.rp && v.sisaHangus
          ? '<div class="ck-catat">⚠️ ' + T('Voucher ini bernilai') + ' ' + U.rp(voucherPilih.nilai) +
            ' ' + T('tetapi hanya') + ' ' + U.rp(v.rp) + ' ' + T('yang terpakai. Sisanya hangus.') + '</div>'
          : '') +

        /* ---- voucher ongkir milik pembeli ---- */
        (ins.punyaVOngkir && ins.punyaVOngkir.length
          ? '<div class="ck-ins">' +
              '<div class="ck-ins__jd">🚚 ' + T('Voucher ongkir') + '</div>' +
              ins.punyaVOngkir.slice(0, 3).map(function (x) {
                var pot = INSENTIF.potonganOngkir(x, ins.sasaranOngkir ? (ins.sasaranOngkir.ongkir || 0) : 0);
                var on = vOngkirPilih && vOngkirPilih.id === x.id;
                /* Voucher yang tidak bisa memotong apa pun — ongkirnya nol
                   karena sudah gratis — ditawarkan dalam keadaan mati.
                   Memakainya akan menghanguskannya tanpa manfaat apa pun. */
                return '<button type="button" class="ck-kupon-chip' + (on ? ' ck-kupon-chip--on' : '') +
                  (pot.rp ? '' : ' ck-kupon-chip--mati') + '" data-act="ck-vongkir" ' +
                  'data-id="' + U.esc(on ? '' : x.id) + '"' + (pot.rp ? '' : ' disabled') + '>' +
                  (on ? '✓ ' : '') + U.esc(x.nama) +
                  (pot.rp ? ' <b>− ' + U.rpShort(pot.rp) + '</b>'
                          : '<small>' + T('ongkir sudah gratis') + '</small>') +
                '</button>';
              }).join('') +
            '</div>'
          : '') +

        /* ---- pakai poin ---- */
        (ins.batas && ins.batas.alasan === 'ok'
          ? '<div class="ck-ins">' +
              '<div class="ck-ins__jd">💰 ' + T('Pakai') + ' ' + POIN.nama() +
                '<span class="ck-ins__sisa">' + T('saldo') + ' ' + U.num(ins.batas.saldo) + '</span></div>' +
              '<div class="ck-ins__baris">' +
                '<input class="input" type="number" min="0" max="' + ins.batas.poin + '" ' +
                  'value="' + (ins.poinDipakai || '') + '" placeholder="0" ' +
                  'data-change="ck-poin" style="max-width:130px">' +
                '<button type="button" class="btn btn--ghost btn--sm" data-act="ck-poin-maks">' +
                  T('Pakai maksimal') + ' (' + U.num(ins.batas.poin) + ')</button>' +
                (ins.poinDipakai
                  ? '<button type="button" class="btn btn--ghost btn--sm" data-act="ck-poin-lepas">✕</button>'
                  : '') +
              '</div>' +
              '<div class="ck-catat">' +
                T('Paling banyak {p}% dari nilai barang — setara {rp}. Ongkir dan Ppn tidak bisa dibayar dengan poin.')
                  .replace('{p}', ins.batas.maksPersen).replace('{rp}', U.rp(ins.batas.maksRp)) +
              '</div>' +
            '</div>'
          : (ins.batas && ins.batas.alasan === 'minSaldo'
              ? '<div class="ck-catat">💰 ' +
                T('Kumpulkan minimal {n} {p} untuk bisa dipakai membayar.')
                  .replace('{n}', U.num(ins.batas.minSaldo)).replace('{p}', POIN.nama()) + '</div>'
              : '')) +

        /* ---- cashback yang akan didapat ---- */
        (ins.cashback && ins.cashback.rp
          ? '<div class="ck-cashback">🎁 ' +
              T('Dapat cashback') + ' <b>' + U.rp(ins.cashback.rp) + '</b> ' +
              T('sebagai') + ' ' + POIN.nama() + ' ' + T('setelah pesanan diterima') +
            '</div>'
          : (ins.cashback && ins.cashback.sebab === 'minimal'
              ? '<div class="ck-catat">🎁 ' +
                T('Belanja {rp} lagi untuk dapat cashback.').replace('{rp}', U.rp(ins.cashback.kurang)) +
                '</div>'
              : '')) +
      '</div>' +

      /* ---- 4. metode pembayaran ---- */
      '<div class="ck-blok">' +
        '<div class="ck-jd">' + T('Metode pembayaran') +
          (kanal.length > BAYAR_TAMPIL
            ? '<button type="button" class="ck-tautan" data-act="ck-bayar-semua">' +
              (bayarSemua ? T('Ringkas') : T('Lihat semua')) + '</button>' : '') +
        '</div>' +
        kanalTampil.map(function (c) {
          var on = draftKirim.metode === c.id;
          var b = PAY.biayaGateway(c, total);
          return '<button type="button" class="ck-bayar' + (on ? ' on' : '') + '" ' +
              'data-act="ck-metode" data-id="' + U.esc(c.id) + '">' +
            '<span class="ck-bayar__ic">' + c.ic + '</span>' +
            '<span class="ck-bayar__isi"><b>' + U.esc(c.nama) + '</b>' +
              '<small>' + (c.catatan ? U.esc(U.potong(c.catatan, 62))
                : (b ? T('Biaya layanan') + ' ' + U.rp(b) : T('Tanpa biaya layanan'))) + '</small></span>' +
            '<span class="ck-radio"></span>' +
          '</button>';
        }).join('') +
      '</div>' +

      /* ---- 5. ringkasan ---- */
      '<div class="ck-blok">' +
        '<div class="ck-jd">' + T('Cek ringkasan transaksimu, yuk') + '</div>' +
        barisCk(T('Total harga') + ' (' + U.sum(items, function (i) { return i.qty; }) + ' ' +
          T('barang') + ')', U.rp(subtotal)) +
        barisCk(T('Total ongkos kirim'), ongkir ? U.rp(ongkir) : U.rp(0)) +
        (tb.asuransi ? barisCk(T('Total asuransi pengiriman'), U.rp(tb.asuransi)) : '') +
        (tb.proteksi ? barisCk(T('Total perlindungan produk'), U.rp(tb.proteksi)) : '') +
        barisCk('Ppn ' + Ppn + '%', U.rp(ppnRp)) +
        barisCk(T('Biaya jasa aplikasi'),
          rinci.biaya
            ? (keKlien ? U.rp(rinci.biaya)
                       : '<s>' + U.rp(rinci.biaya) + '</s> <b class="ck-rp0">' + U.rp(0) + '</b>')
            : U.rp(0)) +

        /* Voucher ongkir dan poin muncul sebagai barisnya sendiri, bukan
           dilebur ke "Promo belanja". Keduanya berasal dari milik pembeli —
           voucher yang ia tukar dan poin yang ia kumpulkan — dan orang perlu
           melihat miliknya terpakai, bukan menemukan totalnya sekadar lebih
           kecil dari yang ia hitung. */
        (ins.ongkir
          ? barisCk(T('Voucher ongkir'), '<span class="ck-minus">− ' + U.rp(ins.ongkir) + '</span>')
          : '') +
        (ins.poinRupiah
          ? barisCk(U.num(ins.poinDipakai) + ' ' + POIN.nama() + ' ' + T('dipakai'),
              '<span class="ck-minus">− ' + U.rp(ins.poinRupiah) + '</span>')
          : '') +

        ((hematPromo + v.rp + diskonOngkir)
          ? '<button type="button" class="ck-baris ck-baris--klik ck-promo-tot" data-act="ck-promo-buka">' +
              '<span>🏷️ ' + T('Promo belanja') + '</span><div class="spacer"></div>' +
              '<span class="ck-minus">− ' + U.rp(hematPromo + v.rp + diskonOngkir) + '</span>' +
              '<span class="ck-chev">' + (promoBuka ? '⌃' : '⌄') + '</span>' +
            '</button>' +
            (promoBuka
              ? '<div class="ck-promo-rinci">' +
                  (diskonOngkir ? barisCk(T('Diskon ongkir'),
                    '<span class="ck-minus">− ' + U.rp(diskonOngkir) + '</span>', 'ck-baris--sub') : '') +
                  (hematPromo ? barisCk(T('Diskon produk'),
                    '<span class="ck-minus">− ' + U.rp(hematPromo) + '</span>', 'ck-baris--sub') : '') +
                  (v.rp ? barisCk(U.esc(voucherPilih.nama),
                    '<span class="ck-minus">− ' + U.rp(v.rp) + '</span>', 'ck-baris--sub') : '') +
                '</div>'
              : '')
          : '') +

        '<div class="ck-total">' +
          '<b>' + T('Total pembayaran') + '</b><div class="spacer"></div>' +
          '<b class="ck-total__rp">' + U.rp(tagihan) + '</b>' +
        '</div>' +
      '</div>' +

      '<div class="ck-sk">' +
        T('Dengan melanjutkan pembayaran, Anda menyetujui') + ' ' +
        '<button type="button" class="ck-tautan" data-act="ck-sk">' +
          T('S&K Asuransi Pengiriman') + '</button>.' +
      '</div>' +

      /* ---- 6. bilah bayar ---- */
      '<div class="ck-bayar-bar">' +
        (hemat ? '<div class="ck-hemat">🌸 ' + T('Anda hemat') + ' <b>' + U.rp(hemat) + '</b> ' +
          T('di transaksi ini') + '</div>' : '') +
        '<div class="ck-bayar-bar__baris">' +
          '<div class="ck-bayar-bar__ki">' +
            '<div class="ck-bayar-bar__lb">' + T('Total tagihan') + '</div>' +
            '<div class="ck-bayar-bar__rp">' + U.rp(tagihan) + '</div>' +
          '</div>' +
          '<button class="btn btn--lg" data-act="ck-bayar">✓ ' + T('Bayar sekarang') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------ DIALOG DARI CHECKOUT
     Ketiganya memakai modal, bukan kolom yang selalu terbuka di halaman.
     Alamat, kurir, dan catatan jarang diubah — sekali per pesanan, kalau
     ada. Membiarkan ketiganya terbentang membuat layar bayar dua kali lebih
     panjang demi kolom yang sebagian besar orang lewati begitu saja. */

  /* Menandai titik peta untuk alamat yang sedang dipilih. Dipanggil dari dua
     tempat — bilah alamat di checkout dan dialognya — jadi badannya tidak
     boleh tinggal di dalam salah satu peta aksi. */
  function pilihTitikKirim() {
    var a = alamatTujuan();
    if (!a) {
      UI.toast(T('Simpan alamat dulu di menu Profil → Alamat Tersimpan'), 'warn');
      return;
    }
    simpanDraftKirim();
    MAPS.pilihTitik({ judul: T('Titik pengiriman') + ' — ' + a.label,
      sub: T('Menentukan ongkos kirim dan membantu kurir menemukan lokasi'),
      alamat: BIZ.alamatTeks(a), awal: a.koordinat }).then(function (hasil) {
      if (!hasil) return;
      var list = BIZ.alamatList(APP.user).map(function (x) {
        return x.id === a.id ? Object.assign({}, x, { koordinat: hasil.hapus ? null : hasil }) : x; });
      BIZ.simpanAlamat(APP.user.id, list);
      APP.perbaruiSesi(DB.find('users', APP.user.id));
      UI.toast(hasil.hapus ? T('Titik dihapus — ongkir kembali ke tarif dasar')
        : T('Titik tersimpan — ongkir dihitung ulang dari jarak'), 'ok');
      APP.refresh();
    });
  }

  /* Isi S&K-nya dibaca dari setelan yang sama yang dipakai menghitung
     biayanya. Menuliskannya sebagai teks tetap membuat angka di ketentuan
     berbeda dari angka yang ditagih begitu admin mengubah setelannya — dan
     yang mengikat secara hukum justru yang tertulis di ketentuan. */
  function dialogSKAsuransi() {
    var c = TAMBAHAN.config();
    UI.modal({
      title: T('S&K Asuransi Pengiriman'), size: 'narrow',
      body:
        '<ul class="ck-sk-daftar">' +
          '<li>' + T('Premi dihitung') + ' <b>' + c.asuransi.persen + '%</b> ' +
            T('dari nilai barang, dengan biaya terkecil') + ' <b>' + U.rp(c.asuransi.minimum) + '</b>.</li>' +
          '<li>' + T('Ganti rugi berlaku untuk paket yang hilang atau rusak dalam perjalanan, ' +
            'dibuktikan dengan berita acara kurir.') + '</li>' +
          '<li>' + T('Tidak menanggung kerusakan akibat pengemasan yang tidak sesuai ketentuan kurir, ' +
            'barang terlarang, dan barang yang salah alamat karena alamat yang keliru diisi pembeli.') + '</li>' +
          '<li>' + T('Klaim diajukan paling lambat') + ' <b>' + c.pengembalian.hari + ' ' + T('hari') + '</b> ' +
            T('sejak paket dinyatakan tiba atau dinyatakan hilang oleh kurir.') + '</li>' +
          '<li>' + T('Nilai ganti rugi setinggi-tingginya sebesar nilai barang yang tercantum pada pesanan.') + '</li>' +
        '</ul>',
      foot: '<button class="btn" data-close>' + T('Mengerti') + '</button>'
    });
  }

  function dialogAlamat() {
    var u = APP.user;
    var daftar = BIZ.alamatList(u);
    var pilih = alamatTujuan();
    var isi = draftKirim.alamat !== null ? draftKirim.alamat
      : (pilih ? BIZ.alamatTeks(pilih) : (u.alamat || ''));

    /* UI.modal MENGEMBALIKAN penutupnya; ia tidak menyodorkannya ke tiap aksi.
       Ditangkap di sini supaya aksi di bawah bisa menutup sendiri. */
    var tutup = UI.modal({
      title: T('Alamat pengiriman'), size: 'narrow',
      body:
        (daftar.length
          ? '<div class="ck-promo mb-2">' + daftar.map(function (a) {
              var on = pilih && a.id === pilih.id;
              return '<button type="button" class="ck-kupon' + (on ? ' on' : '') + '" ' +
                  'data-act="pakai" data-id="' + U.esc(a.id) + '">' +
                '<span class="ck-kupon__ic">📍</span>' +
                '<span class="ck-kupon__isi"><b>' + U.esc(a.label) + '</b>' +
                  '<small>' + U.esc(U.potong(BIZ.alamatTeks(a), 70)) + '</small></span>' +
              '</button>';
            }).join('') + '</div>'
          : '') +
        '<div class="field"><label>' + T('Alamat lengkap') + ' <span class="req">*</span></label>' +
          '<textarea class="textarea" id="ck-alamat-tx" rows="3">' + U.esc(isi) + '</textarea>' +
          '<div class="hint">' + T('Boleh disunting — yang tersimpan pada pesanan adalah teks ini.') +
          '</div></div>' +
        '<div class="ongkir-info">' +
          (titikTujuan()
            ? '<span class="map-koor">📍 ' + MAPS.teksKoordinat(titikTujuan()) + '</span>' +
              '<span>' + T('Ongkir dihitung dari jarak sebenarnya.') + '</span>'
            : '<span class="chip chip--warn" style="font-size:10px">' +
              T('Titik peta belum ditandai') + '</span>') +
          '<div class="spacer"></div>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-act="titik">📍 ' +
            (titikTujuan() ? T('Ubah titik') : T('Tandai titik')) + '</button>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="simpan">' + T('Simpan') + '</button>',
      actions: {
        pakai: function (el) {
          alamatPilih = el.getAttribute('data-id');
          var a = alamatTujuan();
          /* Teksnya ikut berganti — kalau tidak, pembeli memilih alamat kantor
             tetapi yang tercetak di pesanan tetap alamat rumah yang lama. */
          draftKirim.alamat = a ? BIZ.alamatTeks(a) : draftKirim.alamat;
          tutup();
          APP.refresh();
        },
        titik: function () { tutup(); pilihTitikKirim(); },
        simpan: function () {
          var tx = document.getElementById('ck-alamat-tx');
          if (tx) draftKirim.alamat = tx.value;
          tutup();
          APP.refresh();
        }
      }
    });
  }

  function dialogCatatan() {
    UI.formModal({
      title: T('Catatan pengiriman'), okText: T('Simpan'),
      fields: [
        { name: 'catatan', label: T('Catatan untuk kurir & penjual'), type: 'textarea',
          value: draftKirim.catatan || '',
          hint: T('mis. kirim jam kerja, lapor ke security') }
      ]
    }).then(function (v) {
      if (!v) return;                       /* null bila dibatalkan */
      draftKirim.catatan = (v.catatan || '').trim();
      APP.refresh();
    });
  }

  function dialogKurir(sid) {
    var s = siapCheckout();
    if (!s) return;
    var g = s.grup.filter(function (x) { return (x.sellerId || '') === sid; })[0];
    if (!g) return;

    /* Daftar lengkap di dalam modal — di sinilah pembeli memang sedang
       membandingkan, jadi melipatnya di empat teratas justru menghalangi. */
    kurirLengkap[sid || 'resmi'] = true;
    var tutup = UI.modal({
      title: T('Pilih pengiriman'), sub: g.nama, size: 'narrow',
      body: '<div id="ck-kurir">' + pilihanKurirHTML(g) + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
      actions: {
        'pilih-kurir': function (el) {
          var st = kurirOpsi[sid || 'resmi'];
          if (!st) return;
          var k = el.getAttribute('data-kurir'), l = el.getAttribute('data-layanan');
          kurirDipilih[sid || 'resmi'] = st.opsi.filter(function (o) {
            return o.kurir === k && o.layanan === l; })[0] || null;
          tutup();
          APP.refresh();
        }
      }
    });
  }

  /* ================================================== MEMBUAT PESANANNYA
     Dipisah dari halamannya supaya jalur yang benar-benar memindahkan uang
     bisa dibaca utuh dalam satu layar, tanpa markup di antaranya. */
  function kirimPesanan() {
    var s = siapCheckout();
    if (!s) { UI.toast(T('Pilih dulu barang yang ingin dibeli'), 'err'); return; }
    var items = s.items, grup = s.grup;

    var alamatObj = alamatTujuan();
    var alamat = (draftKirim.alamat !== null ? draftKirim.alamat
      : (alamatObj ? BIZ.alamatTeks(alamatObj) : (APP.user.alamat || ''))).trim();
    if (!alamat) { UI.toast(T('Alamat pengiriman wajib diisi'), 'err'); return; }

    var kurang = BIZ.cekStok(items);
    if (kurang.length) {
      UI.toast(T('Stok tidak cukup') + ': ' + kurang[0].produk.nama +
        ' (' + T('tersisa') + ' ' + kurang[0].tersedia + ')', 'err');
      return;
    }

    var v = hitungVoucherCk(grup);
    /* satu keranjang bisa melahirkan beberapa pesanan; groupId menyatukannya */
    var groupId = U.uid('grp');

    /* Layanan tambahan DIBEKUKAN bersama pesanan, sama seperti tarif kurir dan
       ketentuan voucher. Harganya bergantung setelan yang boleh diubah admin
       kapan saja; yang mengikat adalah yang disepakati saat pesanan dibuat. */
    function tambahanToko(gg) {
      var out = [];
      gg.items.forEach(function (i) {
        TAMBAHAN.untukBarang(i).forEach(function (t) {
          if (!pilihTambahan[kunciTambahan(i.productId, t.kode)]) return;
          out.push({ jenis: t.kode, productId: i.productId, nama: t.nama, biaya: t.biaya });
        });
      });
      if (pilihAsuransi[gg.sellerId || 'resmi']) {
        out.push({ jenis: 'asuransi', productId: null,
          nama: T('Asuransi Pengiriman'), biaya: TAMBAHAN.biayaAsuransi(gg.subtotal) });
      }
      return out;
    }
    /* Insentif dihitung SEKALI di sini, dari sumber yang sama dengan yang
       ditampilkan — bukan dihitung ulang per pesanan dengan cara lain. */
    var ins = insentifCk(grup, v);
    var dibuat = grup.map(function (g) {
      var pakai = v.rp && v.sasaran === g;
      var pakaiOngkir = ins.ongkir && ins.sasaranOngkir === g;
      /* Poin menempel pada SATU pesanan — yang terbesar — supaya jumlah yang
         dipotong dan yang dikembalikan saat batal selalu sepasang. */
      var pakaiPoin = ins.poinDipakai && ins.sasaran === g;
      return BIZ.buatPesananToko(APP.user.id, {
        sellerId: g.sellerId, groupId: groupId,
        items: g.items.map(function (i) { return { productId: i.productId, qty: i.qty, harga: i.harga }; }),
        ongkir: g.ongkir, ppn: Ppn, diskon: pakai ? v.rp : 0,
        /* Voucher dicatat pada pesanan yang memakainya — supaya terlihat di
           detail, dan supaya bisa dikembalikan bila pesanan batal. */
        voucher: pakai ? { id: voucherPilih.id, no: voucherPilih.kode,
          nama: voucherPilih.nama, jenis: v.jenis, potongan: v.rp } : null,
        voucherOngkir: pakaiOngkir
          ? { id: vOngkirPilih.id, nama: vOngkirPilih.nama, potongan: ins.ongkir } : null,
        potonganOngkir: pakaiOngkir ? ins.ongkir : 0,
        poinDipakai: pakaiPoin ? ins.poinDipakai : 0,
        poinRupiah: pakaiPoin ? ins.poinRupiah : 0,
        /* Ikut tersimpan supaya tagihan, kuitansi, dan klaim nanti membaca
           angka yang sama dengan yang dilihat pembeli saat menekan bayar. */
        tambahan: tambahanToko(g),
        bebanSeller: g.bebanSeller, bebanExoclean: g.bebanExoclean,
        biayaKurir: g.ongkir ? SELLER.config().biayaKurirFlat : 0,
        alamatKirim: alamat, channelId: draftKirim.metode,
        metodeBayar: labelMetode(draftKirim.metode), catatan: draftKirim.catatan,
        /* Pilihan kurir DIBEKUKAN bersama pesanan, sama seperti skema bagi
           hasil dan harga: tarif kurir berubah dari waktu ke waktu, dan yang
           berlaku adalah yang disepakati saat pesanan dibuat. */
        kurirPilihan: g.kurirPilihan || null,
        /* Wilayah ikut DIBEKUKAN, bukan sekadar dirujuk lewat id: pembeli
           boleh mengubah alamat tersimpannya kapan saja, dan pesanan yang
           sudah berjalan harus tetap memakai tujuan yang disepakati. */
        alamatKirimData: (function () {
          var a = alamatObj;
          if (!a) return null;
          return { id: a.id, kodePos: a.kodePos || (a.wilayah && a.wilayah.kodePos) || null,
            negara: (a.wilayah && a.wilayah.negara) || 'ID',
            wilayah: a.wilayah || null,
            lat: a.koordinat && a.koordinat.lat, lng: a.koordinat && a.koordinat.lng };
        })()
      });
    });

    /* Voucher baru ditandai terpakai SETELAH pesanannya benar-benar terbentuk
       — bukan saat dipilih. Kalau dibalik, pembeli yang batal di layar
       terakhir kehilangan vouchernya tanpa mendapat apa pun. */
    if (v.rp && voucherPilih) {
      var soVoucher = dibuat.filter(function (so) { return so.voucher; })[0];
      VOUCHER.pakai(voucherPilih.id, { tipe: 'shop', id: soVoucher && soVoucher.id });
    }
    /* Voucher ongkir berasal dari penukaran poin, jadi yang menandainya
       terpakai adalah POIN — bukan modul VOUCHER. Keduanya menyimpan di
       tabel yang berbeda, dan menandai di tabel yang salah membuat voucher
       terlihat masih aktif padahal sudah dipakai. */
    if (ins.ongkir && vOngkirPilih) {
      var soOngkir = dibuat.filter(function (so) { return so.voucherOngkir; })[0];
      POIN.pakaiVoucher(vOngkirPilih.id, { tipe: 'shop', id: soOngkir && soOngkir.id });
    }
    /* Pilihan dilepas setelah dipakai supaya checkout berikutnya tidak
       membuka dengan voucher dan poin yang sudah habis. */
    vOngkirPilih = null; poinPakai = 0;

    /* Yang tidak ikut dibeli tetap tinggal di keranjang. */
    var dibeli = {};
    items.forEach(function (i) { dibeli[i.productId] = true; });
    keranjang = keranjang.filter(function (k) { return !dibeli[k.productId]; });
    draftKirim = { alamat: null, metode: 'va_bca', catatan: '' };
    voucherPilih = null;

    UI.modal({
      title: T('Pesanan terkirim') + ' 🛒', size: 'narrow',
      body: '<p style="font-size:13px;color:var(--ink-2)">' +
          (dibuat.length > 1
            ? T('Keranjang Anda menjadi') + ' <b>' + dibuat.length + ' ' + T('pesanan') + '</b> ' +
              T('karena berasal dari toko berbeda:')
            : T('Nomor pesanan Anda:')) + '</p>' +
        '<div class="mt-2">' + dibuat.map(function (so) {
          return '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line-2)">' +
            '<div><b class="code">' + U.esc(so.no) + '</b>' +
            '<div class="tbl-sub">' + U.esc(SELLER.namaToko(so.sellerId)) + '</div></div>' +
            '<div class="spacer"></div><b>' + U.rp(so.total) + '</b></div>';
        }).join('') + '</div>' +
        '<div class="row mt-2"><b>' + T('Total') + '</b><div class="spacer"></div>' +
        '<b style="color:var(--brand-dark)">' + U.rp(U.sum(dibuat, function (s2) { return s2.total; })) +
        '</b></div>' +
        UI.alert('ok', T('Notifikasi konfirmasi otomatis sudah disiapkan ke WhatsApp Anda.'), '💬'),
      foot: '<button class="btn" data-close>' + T('Mengerti') + '</button>'
    });
    /* Halaman riwayat pesanan kini menjadi tab di menu Transaksi. */
    APP.go('transaksi', { tab: 'toko' });
  }

  /* ================================================================ ADMIN: PRODUK & STOK */
  var fProduk = 'semua';

  function adminProduk() {
    var all = DB.all('products');
    var menipis = BIZ.stokMenipis();
    var kat = kategoriList();
    var list = U.sortBy(fProduk === 'semua' ? all
      : fProduk === 'menipis' ? menipis
      : all.filter(function (p) { return p.kategori === fProduk; }), function (p) { return p.urutan; });

    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Jenis produk'), value: all.length, icon: '📦',
        meta: kat.length + ' kategori' }) +
      UI.stat({ label: T('Nilai stok'), small: true,
        valueHTML: U.rpShort(U.sum(all, function (p) { return p.harga * p.stok; })), icon: '💰',
        meta: T('harga jual × stok') }) +
      UI.stat({ label: T('Stok menipis'), value: menipis.length, icon: '⚠️',
        meta: menipis.length ? '<span class="down">perlu restock</span>' : T('semua aman') }) +
      UI.stat({ label: T('Penjualan bulan ini'), small: true,
        valueHTML: U.rpShort(BIZ.statistik().penjualanToko), icon: '🛒', meta: U.bulanTahun(new Date()) }) +
    '</div>' +

    (menipis.length ? UI.alert('warn', '<b>' + menipis.length + ' ' + T('produk perlu restock:') + '</b> ' +
      menipis.slice(0, 5).map(function (p) { return U.esc(p.nama) + ' (' + p.stok + ')'; }).join(', ') +
      (menipis.length > 5 ? T(', dan') + ' ' + (menipis.length - 5) + ' lainnya' : ''), '📉') + '<div class="mb-3"></div>' : '') +

    UI.tabs([{ key: 'semua', label: T('Semua'), n: all.length },
      { key: 'menipis', label: 'Perlu restock', n: menipis.length }]
      .concat(kat.map(function (k) {
        return { key: k, label: k, n: all.filter(function (p) { return p.kategori === k; }).length }; })),
      fProduk, 'tab-produk') +

    UI.card({ flush: true,
      tools: '<button class="btn btn--sm" data-act="produk-baru">' + T('＋ Produk Baru') + '</button>',
      body: UI.table([
        { h: T('Kode'), w: '92px', r: function (p) { return '<span class="code">' + U.esc(p.kode) + '</span>'; } },
        { h: T('Produk'), r: function (p) { return '<div class="tbl-title">' + p.icon + ' ' + U.esc(p.nama) + '</div>' +
          '<div class="tbl-sub">' + U.esc(p.merek) + ' • ' + U.esc(p.kategori) + '</div>'; } },
        { h: T('Harga'), cls: 'num', r: function (p) { return '<b>' + U.rp(p.harga) + '</b>' +
          '<div class="tbl-sub">/ ' + U.esc(p.satuan) + '</div>'; } },
        { h: T('Stok'), cls: 'num', r: function (p) {
          var st = statusStok(p);
          return '<b style="color:' + (st === 'habis' ? 'var(--danger)' : st === 'menipis' ? 'var(--warn)' : 'inherit') +
            '">' + U.num(p.stok) + '</b><div class="tbl-sub">' + T('min') + ' ' + (p.minStok || 0) + '</div>'; } },
        { h: T('Status'), r: function (p) { return UI.statusChip('stok', statusStok(p)) +
          (p.aktif ? '' : '<div class="tbl-sub mt-1">' + T('tidak tampil di katalog') + '</div>'); } },
        { h: '', cls: 'act', r: function (p) {
          return '<button class="btn btn--ghost btn--sm" data-act="stok-masuk" data-id="' + p.id + '">' + T('＋ Stok') + '</button>' +
            ' <button class="btn btn--ghost btn--sm" data-act="edit-produk" data-id="' + p.id + '">' + T('Ubah') + '</button>'; } }
      ], list, { icon: '📦', judul: T('Tidak ada produk pada filter ini') }) });
  }

  /* ================================================================ ADMIN: PESANAN */
  var fPesanan = 'aktif';

  function adminPesanan() {
    var all = U.sortBy(DB.all('shopOrders'), function (p) { return p.createdAt; }, true);
    var grup = {
      baru: all.filter(function (p) { return p.status === 'baru'; }),
      aktif: all.filter(function (p) { return ['baru', 'dikonfirmasi', 'dikemas', 'dikirim'].indexOf(p.status) >= 0; }),
      selesai: all.filter(function (p) { return p.status === 'selesai'; }),
      semua: all
    };
    var list = grup[fPesanan] || all;

    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Pesanan baru'), value: grup.baru.length, icon: '🔔',
        meta: grup.baru.length ? '<span class="down">perlu konfirmasi</span>' : T('tidak ada') }) +
      UI.stat({ label: T('Sedang diproses'), value: grup.aktif.length - grup.baru.length, icon: '📦',
        meta: 'dikonfirmasi s/d dikirim' }) +
      UI.stat({ label: T('Penjualan bulan ini'), small: true, valueHTML: U.rpShort(BIZ.statistik().penjualanToko),
        icon: '💰', meta: U.bulanTahun(new Date()) }) +
      UI.stat({ label: T('Nilai rata-rata pesanan'), small: true,
        valueHTML: U.rpShort(all.length ? U.sum(all, function (p) { return p.total; }) / all.length : 0),
        icon: '📊', meta: all.length + ' pesanan' }) +
    '</div>' +

    UI.tabs([
      { key: 'aktif', label: T('Perlu diproses'), n: grup.aktif.length },
      { key: 'baru', label: T('Belum dikonfirmasi'), n: grup.baru.length },
      { key: 'selesai', label: T('Selesai'), n: grup.selesai.length },
      { key: 'semua', label: T('Semua'), n: all.length }
    ], fPesanan, 'tab-pesanan') +

    UI.card({ flush: true, body: UI.table([
      { h: 'No. / Waktu', r: function (p) { return '<div class="code">' + U.esc(p.no) + '</div>' +
        '<div class="tbl-sub">' + U.sejak(p.createdAt) + '</div>'; } },
      { h: T('Klien'), r: function (p) { var c = BIZ.user(p.clientId);
        return '<div class="tbl-title">' + U.esc(BIZ.klien(p.clientId)) + '</div>' +
          '<div class="tbl-sub">' + U.esc(c ? c.nama : '') + '</div>'; } },
      { h: T('Barang'), r: function (p) { return '<span class="tbl-sub">' + (p.items || []).length + ' jenis • ' +
        U.sum(p.items, function (i) { return i.qty; }) + ' ' + T('unit') + '</span>'; } },
      { h: T('Total'), cls: 'num', r: function (p) { return '<b>' + U.rp(p.total) + '</b>'; } },
      { h: T('Bayar'), r: function (p) { var inv = BIZ.invoiceToko(p.id);
        return inv ? UI.statusChip('invoice', inv.status) : '<span class="tbl-sub">' + T('belum ditagih') + '</span>'; } },
      { h: T('Status'), r: function (p) { return UI.statusChip('shop', p.status); } },
      { h: '', cls: 'act', r: function (p) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="detail-tk" data-id="' + p.id + '">' + T('Detail') + '</button>';
        var next = BIZ.statusBerikut(p.status);
        if (next && p.status !== 'selesai') {
          var label = { dikonfirmasi: 'Konfirmasi', dikemas: 'Kemas', dikirim: 'Kirim', selesai: 'Selesai' }[next];
          b += ' <button class="btn btn--sm" data-act="maju" data-id="' + p.id + '" data-next="' + next + '">' +
            label + '</button>';
        }
        return b; } }
    ], list, { icon: '🛒', judul: T('Tidak ada pesanan pada kategori ini') }) });
  }

  /* ================================================================ ADMIN: AKSI */
  function adminAksi(root) {
    U.delegate(root, {
      'tab-produk': function (el) { fProduk = el.getAttribute('data-key'); APP.refresh(); },
      'tab-pesanan': function (el) { fPesanan = el.getAttribute('data-key'); APP.refresh(); },
      'produk-baru': function () { dialogProduk(null); },
      'edit-produk': function (el) { dialogProduk(el.getAttribute('data-id')); },
      'stok-masuk': function (el) { dialogStok(el.getAttribute('data-id')); },
      'detail-tk': function (el) { detailAdmin(el.getAttribute('data-id')); },
      maju: function (el) { majuStatus(el.getAttribute('data-id'), el.getAttribute('data-next')); }
    });
  }

  function detailAdmin(id) {
    var so = BIZ.pesananToko(id);
    var next = BIZ.statusBerikut(so.status);
    var label = { dikonfirmasi: T('Konfirmasi Pesanan'), dikemas: 'Tandai Dikemas',
      dikirim: T('Kirim Barang'), selesai: 'Tandai Diterima' }[next];
    Panel.detailPesananToko(id, {
      foot: '<button class="btn btn--wa" data-act="wa-klien">' + T('💬 Chat klien') + '</button>' +
        (so.status !== 'dibatalkan' && so.status !== 'selesai'
          ? '<button class="btn btn--ghost" data-act="batal">' + T('Batalkan') + '</button>' : '') +
        (next ? '<button class="btn" data-act="maju">' + label + '</button>' : ''),
      actions: {
        'wa-klien': function () {
          var c = BIZ.user(so.clientId);
          WA.chat(c.telp, 'Halo ' + c.nama + ', mengenai pesanan ' + so.no + ' di Toko EXOCLEAN — ');
        },
        maju: function (el) { tutup(el); majuStatus(id, next); },
        batal: function (el) {
          tutup(el);
          UI.konfirm({ title: T('Batalkan pesanan') + ' ' + so.no + '?', danger: true,
            text: T('Stok yang sudah dipotong akan dikembalikan otomatis.'), okText: T('Ya, batalkan') })
            .then(function (ya) {
              if (!ya) return;
              BIZ.ubahStatusToko(id, 'dibatalkan');
              UI.toast(T('Pesanan dibatalkan & stok dikembalikan'), 'ok');
              APP.refresh();
            });
        }
      }
    });
  }

  function majuStatus(id, next) {
    var so = BIZ.pesananToko(id);

    if (next === 'dikonfirmasi') {
      var kurang = BIZ.cekStok(so.items);
      if (kurang.length) {
        UI.modal({
          title: T('Stok tidak mencukupi'), size: 'narrow',
          body: UI.alert('danger', T('Pesanan tidak bisa dikonfirmasi karena stok berikut kurang:'), '⚠️') +
            '<div class="mt-2">' + kurang.map(function (k) {
              return '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line-2)">' +
                '<span style="font-size:12.8px">' + U.esc(k.produk.nama) + '</span><div class="spacer"></div>' +
                '<span class="tbl-sub">diminta ' + k.diminta + ' • tersedia ' + k.tersedia + '</span></div>';
            }).join('') + '</div>',
          foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
            '<button class="btn btn--wa" data-act="kabari">' + T('💬 Kabari klien') + '</button>',
          actions: {
            kabari: function (el) {
              var m = WA.enqueue('toko_stok_habis', so.clientId,
                { shopOrderId: id, kosong: kurang.map(function (k) { return k.produk.nama; }) },
                { tipe: 'shop', id: id });
              tutup(el);
              Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
            }
          }
        });
        return;
      }
      UI.konfirm({ title: T('Konfirmasi pesanan') + ' ' + so.no + '?',
        htmlText: T('Stok akan dipotong otomatis dan') + ' <b>invoice ' + U.rp(so.total) + '</b> ' + T('diterbitkan.') + ' ' +
          T('Notifikasi konfirmasi + instruksi pembayaran disiapkan ke WhatsApp klien.'),
        okText: 'Ya, konfirmasi' }).then(function (ya) {
        if (!ya) return;
        BIZ.ubahStatusToko(id, 'dikonfirmasi');
        UI.toast(T('Pesanan dikonfirmasi, stok dipotong, invoice terbit'), 'ok');
        siapkanTautanBayar(id);
        APP.refresh();
        bukaWaTerakhir(id);
      });
      return;
    }

    if (next === 'dikirim') {
      UI.formModal({
        title: T('Kirim barang'), sub: so.no + ' → ' + BIZ.klien(so.clientId), okText: 'Tandai Dikirim',
        fields: [
          { name: 'kurir', label: 'Kurir / ekspedisi', value: so.kurir || 'Kurir Internal EXOCLEAN', required: true,
            hint: 'mis. Kurir Internal EXOCLEAN, JNE, SiCepat, Gojek Instant' },
          { name: 'resi', label: 'No. resi / surat jalan', value: so.resi || '', required: true }
        ]
      }).then(function (d) {
        if (!d) return;
        BIZ.ubahStatusToko(id, 'dikirim', { kurir: d.kurir, resi: d.resi });
        UI.toast(T('Pesanan ditandai dikirim & notifikasi disiapkan'), 'ok');
        APP.refresh();
        bukaWaTerakhir(id);
      });
      return;
    }

    var teks = { dikemas: T('Tandai pesanan sedang dikemas?'), selesai: T('Tandai pesanan sudah diterima klien?') }[next];
    UI.konfirm({ title: teks || 'Lanjutkan?', okText: T('Ya') }).then(function (ya) {
      if (!ya) return;
      BIZ.ubahStatusToko(id, next, next === 'dikemas' ? { dikemasAt: U.nowISO() } : {});
      UI.toast(T('Status diperbarui'), 'ok');
      APP.refresh();
      if (next === 'selesai') bukaWaTerakhir(id);
    });
  }

  /**
   * Setelah pesanan dikonfirmasi, langsung siapkan tautan pembayaran memakai
   * kanal yang dipilih klien saat checkout. Kalau gagal (mis. backend gateway
   * belum tersambung), admin tetap bisa membuatnya manual dari daftar invoice.
   */
  function siapkanTautanBayar(shopOrderId) {
    var so = BIZ.pesananToko(shopOrderId);
    var inv = BIZ.invoiceToko(shopOrderId);
    if (!so || !inv || !so.channelId) return;
    var ch = PAY.channel(so.channelId);
    if (!ch || ch.manual) return;
    var tersedia = PAY.kanalTersedia().filter(function (c) { return c.id === so.channelId; }).length;
    if (!tersedia) return;

    PAY.buatTransaksi(inv.id, so.channelId).then(function (tx) {
      WA.enqueue('link_pembayaran', tx.clientId, { txId: tx.id }, { tipe: 'paytx', id: tx.id });
      APP.refresh();
    }).catch(function (e) {
      UI.toast(T('Invoice terbit, tapi tautan bayar gagal dibuat:') + ' ' + e.message, 'warn');
    });
  }

  function bukaWaTerakhir(refId) {
    var m = U.sortBy(DB.where('waOutbox', { refId: refId }), function (x) { return x.createdAt; }, true)[0];
    if (m && m.status === 'antre') Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
  }

  function dialogProduk(id) {
    var p = id ? BIZ.produk(id) : null;
    UI.formModal({
      title: p ? T('Ubah produk') : T('Produk Baru'), sub: p ? p.kode : '', okText: T('Simpan'), size: 'wide',
      fields: [
        { name: 'nama', label: T('Nama produk'), value: p ? p.nama : '', required: true },
        { name: 'kode', label: T('Kode produk'), value: p ? p.kode : '', required: true, hint: 'mis. CHM-11, ALT-11' },
        { name: 'kategori', label: T('Kategori'), type: 'select', value: p ? p.kategori : '',
          options: ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
                    'APD & Keselamatan Kerja', 'Consumable'] },
        { name: 'merek', label: T('Merek'), value: p ? p.merek : 'ExoPro' },
        { name: 'harga', label: T('Harga jual (Rp)'), type: 'number', value: p ? p.harga : 0, required: true },
        { name: 'satuan', label: T('Satuan'), value: p ? p.satuan : 'unit',
          hint: 'mis. jerigen, botol, pak, set, unit, karton' },
        { name: 'stok', label: T('Stok saat ini'), type: 'number', value: p ? p.stok : 0 },
        { name: 'minStok', label: T('Batas minimum stok'), type: 'number', value: p ? p.minStok : 5,
          hint: T('Sistem memberi peringatan bila stok mencapai angka ini.') },
        { name: 'icon', label: T('Ikon (emoji)'), value: p ? p.icon : '📦' },
        /* Dipakai filter katalog. Tanpa kolom ini, saringan Kondisi dan
           Preorder di lembar filter tidak akan pernah menemukan apa pun. */
        { name: 'kondisi', label: T('Kondisi'), type: 'select',
          value: p ? (p.kondisi || 'baru') : 'baru',
          options: [{ value: 'baru', label: T('Baru') }, { value: 'bekas', label: T('Bekas') }] },
        { name: 'preorder', label: T('Preorder'), type: 'select',
          value: p && p.preorder ? '1' : '',
          options: [{ value: '', label: T('Barang ready, dikirim dari stok') },
                    { value: '1', label: 'Preorder — dibuat/dipesan setelah ada pembeli' }],
          hint: T('Preorder hanya menandai dan menyaring. Batas stok tetap berlaku seperti biasa.') },
        { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', rows: 2, value: p ? p.deskripsi : '' },

        { type: 'html', html: ViewKirim.introDimensi(p) },
        { name: 'beratGram', label: T('Berat kirim (gram)'), type: 'number', min: 0,
          value: p && p.beratGram ? p.beratGram : '',
          hint: T('Berat barang beserta kemasannya, seperti yang akan ditimbang kurir.') },
        { name: 'dimP', label: T('Panjang (cm)'), type: 'number', min: 0,
          value: p && p.dimensi ? (p.dimensi.p || '') : '' },
        { name: 'dimL', label: T('Lebar (cm)'), type: 'number', min: 0,
          value: p && p.dimensi ? (p.dimensi.l || '') : '' },
        { name: 'dimT', label: T('Tinggi (cm)'), type: 'number', min: 0,
          value: p && p.dimensi ? (p.dimensi.t || '') : '' },

        { name: 'aktif', label: T('Tampilkan di katalog klien'), type: 'checkbox', value: p ? p.aktif : true }
      ],
      validate: function (d) {
        var bentrok = DB.all('products').filter(function (x) {
          return x.kode.toUpperCase() === String(d.kode).toUpperCase() && (!p || x.id !== p.id); });
        if (bentrok.length) return T('Kode produk sudah dipakai');
        return ViewKirim.validasiDimensi(d);
      },
      onMount: ViewKirim.pasangHitungDimensi
    }).then(function (d) {
      if (!d) return;
      var patch = ViewKirim.rapikanDimensi(d);
      if (p) { DB.update('products', p.id, patch); UI.toast(T('Produk diperbarui'), 'ok'); }
      else {
        DB.insert('products', Object.assign({ urutan: DB.all('products').length }, patch));
        UI.toast(T('Produk ditambahkan ke katalog'), 'ok');
      }
      APP.refresh();
    });
  }

  function dialogStok(id) {
    var p = BIZ.produk(id);
    UI.formModal({
      title: T('Penyesuaian stok'), sub: p.kode + ' • ' + p.nama, okText: T('Simpan'),
      intro: UI.alert('info', T('Stok saat ini:') + ' <b>' + p.stok + ' ' + U.esc(p.satuan) + '</b>' +
        (p.stok <= (p.minStok || 0) ? ' ' + T('— sudah di bawah batas minimum') + ' ' + (p.minStok || 0) : ''), '📦') +
        '<div class="mb-3"></div>',
      fields: [
        { name: 'tipe', label: 'Jenis penyesuaian', type: 'select', value: 'masuk',
          options: [{ value: 'masuk', label: T('Barang masuk (restock)') },
                    { value: 'keluar', label: T('Barang keluar (rusak / terpakai internal)') },
                    { value: 'set', label: T('Set ulang jumlah (stock opname)') }] },
        { name: 'jumlah', label: T('Jumlah'), type: 'number', value: 0, required: true, min: 0 },
        { name: 'catatan', label: T('Keterangan'), placeholder: T('mis. pembelian dari supplier, opname bulanan') }
      ]
    }).then(function (d) {
      if (!d) return;
      var n = Number(d.jumlah) || 0;
      if (d.tipe === 'set') DB.update('products', id, { stok: Math.max(0, n) });
      else BIZ.ubahStok(id, d.tipe === 'masuk' ? n : -n, d.catatan || T('Penyesuaian stok'));
      DB.log('u_admin', 'Penyesuaian stok ' + p.nama + ' (' + d.tipe + ' ' + n + ')', 'product', id);
      UI.toast('Stok ' + p.nama + ' kini ' + BIZ.produk(id).stok + ' ' + p.satuan, 'ok');
      APP.refresh();
    });
  }

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }

  /* ================================================================ EKSPOR PAGES */
  var pagesClient = {
    /* Tersembunyi dari menu: layar ini selalu dibuka dari kartu produk dan
       tidak punya arti tanpa tahu produk mana yang dimaksud. */
    produk: { label: 'Detail Produk', icon: '📦', grup: 'Toko', tersembunyi: true,
      render: detailProduk, mount: detailAksi },
    toko: { label: 'Toko Perlengkapan', icon: '🏪', grup: 'Utama',
      sub: 'Alat & chemical kebersihan', render: clientKatalog, mount: clientAksi },
    /* Lencananya pindah ke sini bersama isinya. Angka di menu Toko dulu
       menghitung barang di keranjang, bukan produk di katalog — arti yang
       tidak pernah cocok dengan namanya. */
    /* Tersembunyi dari menu: checkout tidak punya arti tanpa keranjang yang
       sudah dicentang, dan pintu masuknya memang tombol Beli — bukan menu
       yang bisa ditekan kapan saja. */
    kasir: { label: 'Checkout', icon: '🧾', grup: 'Utama', tersembunyi: true,
      sub: 'Alamat, pengiriman, dan pembayaran',
      render: halamanCheckout, mount: clientAksi },
    /* Tersembunyi dari menu samping: pintu masuknya tombol hati di keranjang
       dan tautan di katalog. Menaruhnya sebagai menu tersendiri membuat bilah
       Utama makin panjang demi layar yang jarang dibuka. */
    wishlist: { label: 'Wishlist', icon: '♡', grup: 'Utama', tersembunyi: true,
      sub: 'Barang yang disimpan untuk nanti',
      render: halamanWishlist, mount: clientAksi },
    keranjang: { label: 'Keranjang', icon: '🛒', grup: 'Utama',
      sub: 'Barang pilihan Anda & pengiriman', render: halamanKeranjang, mount: clientAksi,
      badge: function () { return jumlahItem(); } },
    belanja: { label: 'Pesanan Toko', icon: '📦', grup: 'Utama', render: clientPesanan, mount: clientAksi,
      badge: function () { return DB.where('shopOrders', function (p) {
        return p.clientId === APP.user.id && p.status === 'dikirim'; }).length; } }
  };

  var pagesAdmin = {
    pesananToko: { label: 'Pesanan Toko', icon: '🛒', grup: 'Penjualan', render: adminPesanan, mount: adminAksi,
      badge: function () { return DB.where('shopOrders', { status: 'baru' }).length; } },
    produk: { label: 'Produk & Stok', icon: '📦', grup: 'Master Data', render: adminProduk, mount: adminAksi,
      badge: function () { return BIZ.stokMenipis().length; } }
  };

  return {
    pagesClient: pagesClient, pagesAdmin: pagesAdmin,
    clientAksi: clientAksi, adminAksi: adminAksi, statusStok: statusStok,
    /* Dibuka supaya halaman lain (mis. ringkasan di Beranda) memakai alur
       pesan ulang yang SAMA — termasuk pemeriksaan stok dan peringatannya —
       bukan menulis versi sendiri yang lambat laun berbeda perilakunya. */
    beliLagi: beliLagi,
    ONGKIR: ONGKIR, GRATIS_ONGKIR: GRATIS_ONGKIR, Ppn: Ppn
  };
})();
