/* ==========================================================================
   maps.js — peta & lokasi untuk alamat dan pengiriman
   --------------------------------------------------------------------------
   CATATAN PENTING SOAL GOOGLE MAPS
   Google Maps JavaScript API dan Places Autocomplete menuntut API key dengan
   penagihan aktif di Google Cloud, dan key itu ikut terunduh ke browser.
   Karena itu modul ini bekerja dalam dua tingkat:

     • TANPA KEY (bawaan, jalan hari ini juga)
       – tautan ke Google Maps & petunjuk arah
       – pratinjau peta lewat iframe embed tanpa key
       – ambil titik dari GPS perangkat
       – tempel tautan Google Maps lalu koordinatnya dibaca otomatis
       – hitung jarak & ongkir dari koordinat (haversine)

     • DENGAN KEY (diisi admin di Pengaturan Peta)
       – Embed API resmi yang stabil dan didukung Google
       – tautan Places/Directions memakai place_id bila tersedia

   Autocomplete alamat dan Distance Matrix sengaja TIDAK dipanggil dari browser
   karena akan membocorkan key dan menagih kuota tanpa kendali. Bila nanti
   dibutuhkan, panggil lewat backend seperti pola pada folder `server/`.
   ========================================================================== */
var MAPS = (function () {

  /* ================================================================ PENGATURAN */
  var BAWAAN = {
    apiKey: '',                       /* Embed API key — boleh publik, batasi per domain */
    pusat: { lat: -6.2088, lng: 106.8456 },   /* Jakarta, titik awal pemilih peta */
    zoom: 16,
    gudangResmi: { lat: -6.2088, lng: 106.8456 },  /* gudang Toko Resmi EXOCLEAN */
    /* Tarif ongkir berjenjang menurut jarak — mengikuti pola tarif kurir di
       Indonesia yang naik per pita, bukan linier per kilometer. */
    zona: [
      { sampaiKm: 5, tarif: 15000, nama: 'Dalam kota (≤5 km)' },
      { sampaiKm: 10, tarif: 25000, nama: 'Dekat (≤10 km)' },
      { sampaiKm: 20, tarif: 40000, nama: 'Sedang (≤20 km)' },
      { sampaiKm: 50, tarif: 65000, nama: 'Jauh (≤50 km)' },
      { sampaiKm: 200, tarif: 90000, nama: 'Luar kota (≤200 km)' },
      { sampaiKm: 700, tarif: 150000, nama: 'Antar provinsi (≤700 km)' }
    ],
    tarifTerjauh: 220000,             /* di atas pita terakhir */
    ongkirTanpaKoordinat: 50000,      /* jatuh balik bila titik belum diisi */
    gratisOngkirMin: 2000000
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.maps) { s.maps = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    return s.maps;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }
  function adaKey() { return !!(config().apiKey || '').trim(); }

  /* ================================================================ TAUTAN */
  function valid(k) {
    return !!k && typeof k.lat === 'number' && typeof k.lng === 'number' &&
      !isNaN(k.lat) && !isNaN(k.lng);
  }
  function teksKoordinat(k) { return valid(k) ? k.lat.toFixed(6) + ', ' + k.lng.toFixed(6) : '—'; }

  /** Buka satu titik di Google Maps. */
  function link(k, label) {
    if (!valid(k)) return null;
    return 'https://www.google.com/maps/search/?api=1&query=' + k.lat + ',' + k.lng +
      (label ? '&query_place_id=' : '');
  }
  /** Cari alamat berupa teks di Google Maps. */
  function linkAlamat(teks) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(teks || '');
  }
  /** Petunjuk arah. `dari` boleh null → Google memakai posisi pengguna. */
  function rute(dari, ke, moda) {
    if (!valid(ke)) return null;
    var u = 'https://www.google.com/maps/dir/?api=1&destination=' + ke.lat + ',' + ke.lng +
      '&travelmode=' + (moda || 'driving');
    if (valid(dari)) u += '&origin=' + dari.lat + ',' + dari.lng;
    return u;
  }

  /* ================================================================ EMBED */
  /**
   * Pratinjau peta. Dengan key memakai Embed API resmi; tanpa key memakai
   * bentuk `output=embed` yang tidak resmi tapi tidak memerlukan key.
   */
  function urlEmbed(k, zoom) {
    if (!valid(k)) return null;
    var z = zoom || config().zoom;
    if (adaKey()) {
      return 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(config().apiKey) +
        '&q=' + k.lat + ',' + k.lng + '&zoom=' + z;
    }
    return 'https://maps.google.com/maps?q=' + k.lat + ',' + k.lng + '&z=' + z + '&output=embed';
  }

  /** Blok peta siap tempel. Menyediakan pesan jatuh balik bila peta gagal dimuat. */
  function petaHTML(k, opt) {
    opt = opt || {};
    if (!valid(k)) {
      return '<div class="map-kosong">' +
        '<div class="ic">🗺️</div>' +
        '<b>' + I18N.t('Titik lokasi belum diisi') + '</b>' +
        '<p>' + I18N.t('Tambahkan koordinat agar tim dan kurir tidak salah alamat.') + '</p>' +
        (opt.aksiPilih ? '<button class="btn btn--soft btn--sm mt-2" data-act="' + opt.aksiPilih + '"' +
          (opt.dataId ? ' data-id="' + U.esc(opt.dataId) + '"' : '') + '>' + I18N.t('📍 Tandai di Peta') + '</button>' : '') +
        '</div>';
    }
    var tinggi = opt.tinggi || 220;
    return '<div class="map-box" style="height:' + tinggi + 'px">' +
      '<iframe src="' + urlEmbed(k, opt.zoom) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
        'title="Peta lokasi" allowfullscreen></iframe>' +
      '<div class="map-fallback"><span>' + I18N.t('Peta tidak dapat dimuat — butuh koneksi internet.') + '</span></div>' +
      '</div>' +
      '<div class="map-act">' +
        '<span class="map-koor">📍 ' + teksKoordinat(k) + '</span>' +
        '<div class="spacer"></div>' +
        '<a class="btn btn--ghost btn--sm" href="' + link(k) + '" target="_blank" rel="noopener">' + I18N.t('Buka di Maps ↗') + '</a>' +
        '<a class="btn btn--soft btn--sm" href="' + rute(null, k) + '" target="_blank" rel="noopener">🧭 Rute</a>' +
        (opt.aksiPilih ? '<button class="btn btn--ghost btn--sm" data-act="' + opt.aksiPilih + '"' +
          (opt.dataId ? ' data-id="' + U.esc(opt.dataId) + '"' : '') + '>' + I18N.t('Ubah titik') + '</button>' : '') +
      '</div>';
  }

  /* ================================================================ BACA KOORDINAT */
  /**
   * Baca koordinat dari teks bebas: pasangan angka, atau tautan Google Maps.
   * Tautan pendek (maps.app.goo.gl) tidak bisa dibaca tanpa jaringan — pengguna
   * diminta membukanya dulu lalu menyalin tautan panjangnya.
   */
  function bacaKoordinat(teks) {
    var s = String(teks || '').trim();
    if (!s) return { error: 'Kosong' };

    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s)) {
      return { error: I18N.t('Tautan pendek belum bisa dibaca. Buka dulu tautannya di Google Maps,') + ' ' +
        I18N.t('lalu salin tautan panjang dari bilah alamat.') };
    }

    /* .../@-6.2088,106.8456,17z  atau  ?q=-6.2,106.8  atau  !3d-6.2!4d106.8 */
    var pola = [
      /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /^(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)$/
    ];
    for (var i = 0; i < pola.length; i++) {
      var m = pola[i].exec(s);
      if (m) {
        var lat = parseFloat(m[1]), lng = parseFloat(m[2]);
        if (lat < -90 || lat > 90) return { error: I18N.t('Lintang harus antara -90 dan 90') };
        if (lng < -180 || lng > 180) return { error: I18N.t('Bujur harus antara -180 dan 180') };
        return { koordinat: { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } };
      }
    }
    return { error: I18N.t('Tidak menemukan koordinat. Tempel tautan Google Maps, atau ketik') + ' ' +
      I18N.t('lintang dan bujur dipisah koma — contoh: -6.208800, 106.845600') };
  }

  /* ================================================================ PEMILIH TITIK */
  /**
   * Modal pemilih titik lokasi. Mengembalikan Promise<{lat,lng}|null>.
   * Tiga cara: GPS perangkat, tempel tautan Maps, atau ketik koordinat.
   */
  function pilihTitik(opt) {
    opt = opt || {};
    return new Promise(function (resolve) {
      var titik = valid(opt.awal) ? { lat: opt.awal.lat, lng: opt.awal.lng } : null;
      var selesai = false;

      function gambarPratinjau() {
        var box = U.$('#map-preview');
        if (!box) return;
        box.innerHTML = titik
          ? '<div class="map-box" style="height:200px">' +
            '<iframe src="' + urlEmbed(titik) + '" loading="lazy" title="Pratinjau lokasi"></iframe>' +
            '<div class="map-fallback"><span>' + I18N.t('Peta tidak dapat dimuat — koordinat tetap tersimpan.') + '</span></div>' +
            '</div>' +
            '<div class="map-act"><span class="map-koor">📍 ' + teksKoordinat(titik) + '</span>' +
            '<div class="spacer"></div>' +
            '<a class="btn btn--ghost btn--sm" href="' + link(titik) + '" target="_blank" rel="noopener">' +
            I18N.t('Periksa di Maps ↗') + '</a></div>'
          : '<div class="map-kosong"><div class="ic">📍</div><b>' + I18N.t('Belum ada titik dipilih') + '</b>' +
            '<p>' + I18N.t('Pakai salah satu cara di bawah.') + '</p></div>';
        var ok = U.$('#btn-simpan-titik');
        if (ok) ok.disabled = !titik;
      }

      var close = UI.modal({
        title: opt.judul || 'Tandai Titik Lokasi', sub: opt.sub || '', size: 'wide',
        body:
          (opt.alamat ? UI.alert('brand', '<b>' + I18N.t('Alamat:') + '</b> ' + U.esc(opt.alamat) +
            '<br><a href="' + linkAlamat(opt.alamat) + '" target="_blank" rel="noopener">' +
            I18N.t('Cari alamat ini di Google Maps ↗') + '</a> ' + I18N.t('lalu salin tautannya ke kolom di bawah.'), '🏠') +
            '<div class="mb-3"></div>' : '') +

          '<div id="map-preview"></div>' +

          '<div class="grid g-3 mt-3">' +
            '<div class="map-cara">' +
              '<b>1 · Pakai GPS</b>' +
              '<p>' + I18N.t('Tekan bila Anda sedang berada di lokasi tersebut.') + '</p>' +
              '<button class="btn btn--soft btn--sm btn--block" data-act="gps">' + I18N.t('📡 Ambil Posisi Saya') + '</button>' +
            '</div>' +
            '<div class="map-cara">' +
              '<b>2 · Tempel tautan Maps</b>' +
              '<p>' + I18N.t('Salin tautan dari Google Maps, tempel di sini.') + '</p>' +
              '<input class="input" id="map-tautan" placeholder="https://www.google.com/maps/@…">' +
              '<button class="btn btn--soft btn--sm btn--block mt-1" data-act="baca">Baca Koordinat</button>' +
            '</div>' +
            '<div class="map-cara">' +
              '<b>3 · Ketik koordinat</b>' +
              '<p>' + I18N.t('Bila Anda sudah tahu lintang dan bujurnya.') + '</p>' +
              '<div class="inline-2">' +
                '<input class="input" id="map-lat" placeholder="Lintang" value="' +
                  (titik ? titik.lat : '') + '">' +
                '<input class="input" id="map-lng" placeholder="Bujur" value="' +
                  (titik ? titik.lng : '') + '">' +
              '</div>' +
              '<button class="btn btn--soft btn--sm btn--block mt-1" data-act="manual">' + I18N.t('Pakai Koordinat Ini') + '</button>' +
            '</div>' +
          '</div>' +

          (adaKey() ? '' : '<div class="tbl-sub mt-3">Pratinjau peta memakai mode tanpa API key. ' +
            I18N.t('Admin dapat mengisi Google Maps Embed API key di') + ' <b>Pengaturan Peta</b> agar tampilannya ' +
            I18N.t('resmi dan stabil.') + '</div>'),

        foot: '<button class="btn btn--ghost" data-act="batal">' + I18N.t('Batal') + '</button>' +
          (valid(opt.awal) ? '<button class="btn btn--ghost" data-act="hapus">' + I18N.t('Hapus Titik') + '</button>' : '') +
          '<button class="btn" data-act="simpan" id="btn-simpan-titik" disabled>' + I18N.t('Simpan Titik') + '</button>',

        onMount: function () { gambarPratinjau(); },

        actions: {
          gps: function (el) {
            el.textContent = 'Mengambil…'; el.disabled = true;
            U.getGPS().then(function (g) {
              el.textContent = I18N.t('📡 Ambil Posisi Saya'); el.disabled = false;
              if (!g.ok) { UI.toast(g.alasan, 'err'); return; }
              titik = { lat: g.lat, lng: g.lng };
              U.$('#map-lat').value = g.lat; U.$('#map-lng').value = g.lng;
              gambarPratinjau();
              UI.toast(I18N.t('Titik diambil dari GPS (akurasi ±') + g.akurasi + ' m)', 'ok');
            });
          },
          baca: function () {
            var r = bacaKoordinat(U.$('#map-tautan').value);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            titik = r.koordinat;
            U.$('#map-lat').value = titik.lat; U.$('#map-lng').value = titik.lng;
            gambarPratinjau();
            UI.toast(I18N.t('Koordinat terbaca dari tautan'), 'ok');
          },
          manual: function () {
            var r = bacaKoordinat(U.$('#map-lat').value + ',' + U.$('#map-lng').value);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            titik = r.koordinat;
            gambarPratinjau();
          },
          simpan: function () {
            if (!titik) return;
            selesai = true; close(); resolve(titik);
          },
          hapus: function () { selesai = true; close(); resolve({ hapus: true }); },
          batal: function () { selesai = true; close(); resolve(null); }
        }
      });

      /* tutup lewat ✕ atau Esc dianggap batal */
      setTimeout(function () {
        var back = document.querySelectorAll('.modal-back');
        var el = back[back.length - 1];
        if (el) el.addEventListener('click', function (ev) {
          if ((ev.target === el || ev.target.closest('.modal__x')) && !selesai) { selesai = true; resolve(null); }
        });
      }, 0);
    });
  }

  /* ================================================================ JARAK & ONGKIR */
  /** Jarak garis lurus dalam kilometer, satu angka di belakang koma. */
  function jarakKm(a, b) {
    var m = U.jarakMeter(a, b);
    return m === null ? null : Math.round(m / 100) / 10;
  }

  /**
   * Ongkir berdasarkan jarak. Bila salah satu titik belum ada, jatuh balik ke
   * tarif flat supaya pesanan tetap bisa jalan.
   */
  function ongkir(dari, ke, subtotal) {
    var c = config();
    if (subtotal >= c.gratisOngkirMin) {
      return { tarif: 0, km: jarakKm(dari, ke), zona: 'Gratis ongkir', gratis: true, perkiraan: false };
    }
    var km = jarakKm(dari, ke);
    if (km === null) {
      return { tarif: c.ongkirTanpaKoordinat, km: null, zona: 'Tarif dasar', gratis: false,
        perkiraan: true, catatan: I18N.t('Titik lokasi belum ditandai, dipakai tarif dasar.') };
    }
    for (var i = 0; i < c.zona.length; i++) {
      if (km <= c.zona[i].sampaiKm) {
        return { tarif: c.zona[i].tarif, km: km, zona: c.zona[i].nama, gratis: false, perkiraan: false };
      }
    }
    return { tarif: c.tarifTerjauh, km: km, zona: 'Luar Jawa / jarak jauh', gratis: false,
      perkiraan: false, catatan: I18N.t('Di atas') + ' ' + c.zona[c.zona.length - 1].sampaiKm + ' km' };
  }

  /** Ringkasan ongkir untuk ditampilkan di keranjang / detail pesanan. */
  function ringkasOngkir(o) {
    if (o.gratis) return 'Gratis ongkir';
    if (o.km === null) return o.zona;
    return o.zona + ' · ' + o.km + ' km';
  }

  /* ================================================================ SUMBER TITIK */
  /** Titik gudang sebuah toko; Toko Resmi memakai titik pusat pengaturan. */
  function titikToko(sellerId) {
    if (!sellerId) return config().gudangResmi || config().pusat;
    var u = DB.find('users', sellerId);
    var t = u ? SELLER.toko(u) : null;
    return t && valid(t.koordinat) ? t.koordinat : null;
  }
  /** Titik alamat utama seorang pengguna. */
  function titikAlamatUtama(u) {
    var a = BIZ.alamatUtama(u);
    return a && valid(a.koordinat) ? a.koordinat : null;
  }

  return {
    BAWAAN: BAWAAN, config: config, simpanConfig: simpanConfig, adaKey: adaKey,
    valid: valid, teksKoordinat: teksKoordinat,
    link: link, linkAlamat: linkAlamat, rute: rute, urlEmbed: urlEmbed, petaHTML: petaHTML,
    bacaKoordinat: bacaKoordinat, pilihTitik: pilihTitik,
    jarakKm: jarakKm, ongkir: ongkir, ringkasOngkir: ringkasOngkir,
    titikToko: titikToko, titikAlamatUtama: titikAlamatUtama
  };
})();
