/* ==========================================================================
   bagikan.js — berbagi produk & layanan ke media sosial
   --------------------------------------------------------------------------
   Semua kanal dibuka lewat URL berbagi resmi masing-masing platform, bukan
   lewat SDK. Alasannya: tidak ada skrip pihak ketiga yang perlu dimuat, tidak
   ada pelacak yang ikut masuk, dan tautannya tetap berfungsi walau platformnya
   mengubah SDK-nya.

   Bila pengguna adalah affiliate aktif, KODE RUJUKANNYA otomatis disisipkan ke
   tautan — jadi berbagi dan afiliasi menjadi satu gerakan, bukan dua menu yang
   harus diingat terpisah.
   ========================================================================== */
var BAGIKAN = (function () {

  /* Web Share API hanya tersedia pada konteks aman (https / localhost). */
  function bisaShareBawaan() { return typeof navigator !== 'undefined' && !!navigator.share; }

  var KANAL = [
    { id: 'whatsapp', nama: 'WhatsApp', ikon: '💬', warna: '#25D366',
      url: function (t, u) { return 'https://wa.me/?text=' + enc(t + '\n\n' + u); } },
    { id: 'facebook', nama: 'Facebook', ikon: 'f', warna: '#1877F2',
      url: function (t, u) { return 'https://www.facebook.com/sharer/sharer.php?u=' + enc(u) +
        '&quote=' + enc(t); } },
    { id: 'x', nama: 'X / Twitter', ikon: '𝕏', warna: '#0F172A',
      url: function (t, u) { return 'https://twitter.com/intent/tweet?text=' + enc(t) +
        '&url=' + enc(u); } },
    { id: 'telegram', nama: 'Telegram', ikon: '✈️', warna: '#229ED9',
      url: function (t, u) { return 'https://t.me/share/url?url=' + enc(u) + '&text=' + enc(t); } },
    { id: 'line', nama: 'LINE', ikon: '💚', warna: '#06C755',
      url: function (t, u) { return 'https://social-plugins.line.me/lineit/share?url=' + enc(u) +
        '&text=' + enc(t); } },
    { id: 'email', nama: 'Email', ikon: '✉️', warna: '#64748B',
      url: function (t, u, j) { return 'mailto:?subject=' + enc(j) + '&body=' + enc(t + '\n\n' + u); } }
  ];

  function enc(s) { return encodeURIComponent(String(s || '')); }

  /* ================================================================ ISI BERBAGI */
  /** Tautan dasar aplikasi + penanda objek + kode rujukan bila ada. */
  function tautan(jenis, id) {
    var dasar = location.origin + location.pathname;
    var q = [];
    if (jenis && id) q.push(jenis + '=' + encodeURIComponent(id));
    var u = APP && APP.user;
    if (u && window.AFILIASI && AFILIASI.aktif(u)) q.push('ref=' + AFILIASI.data(u).kode);
    return dasar + (q.length ? '?' + q.join('&') : '');
  }

  /** Susun teks berbagi untuk satu produk. */
  function produk(p) {
    var harga = p.harga ? U.rp(p.harga) : null;
    return {
      judul: p.nama,
      jenis: 'produk',
      teks: '🧴 *' + p.nama + '*' +
        (p.merek ? '\n' + p.merek : '') +
        (harga ? '\n' + harga + (p.satuan ? ' / ' + p.satuan : '') : '') +
        (p.deskripsi ? '\n\n' + U.potong(p.deskripsi, 140) : '') +
        '\n\n' + I18N.t('Beli di aplikasi EXOCLEAN:'),
      url: tautan('produk', p.id),
      gambarId: (p.foto && p.foto[0]) || null
    };
  }

  /** Susun teks berbagi untuk satu layanan jasa. */
  function layanan(s) {
    var harga = s.survei || s.hargaMin === null ? I18N.t('Hubungi kami untuk survei & penawaran')
      : (s.hargaMax && s.hargaMax > s.hargaMin
          ? U.rp(s.hargaMin) + ' – ' + U.rp(s.hargaMax)
          : 'Mulai ' + U.rp(s.hargaMin)) + (s.satuan ? ' / ' + s.satuan : '');
    return {
      judul: s.nama,
      jenis: 'layanan',
      teks: (s.ikon || s.icon || '🧹') + ' *' + s.nama + '*' +
        (s.kategori ? '\n' + s.kategori : '') +
        '\n' + harga +
        (s.deskripsi ? '\n\n' + U.potong(s.deskripsi, 140) : '') +
        ((s.varian || []).length ? '\n\nTersedia ' + s.varian.length + ' pilihan.' : '') +
        '\n\n' + I18N.t('Pesan lewat aplikasi EXOCLEAN:'),
      url: tautan('layanan', s.id)
    };
  }

  /** Tautan rujukan affiliate itu sendiri, tanpa objek tertentu. */
  function undangan(u) {
    return {
      judul: 'Aplikasi EXOCLEAN',
      jenis: 'undangan',
      teks: '✨ *EXOCLEAN — We Clean All Purpose*\n\n' +
        I18N.t('Layanan kebersihan lengkap: cleaning service, cuci AC, cuci sofa & kasur, ' +
          'pest control, taman, sampai laundry. Plus toko perlengkapan kebersihannya.') + '\n\n' +
        I18N.t('Daftar lewat tautan saya:'),
      url: window.AFILIASI && AFILIASI.aktif(u) ? AFILIASI.tautan(u) : tautan()
    };
  }

  /* ================================================================ AKSI */
  function buka(kanalId, isi) {
    var k = KANAL.filter(function (x) { return x.id === kanalId; })[0];
    if (!k) return false;
    window.open(k.url(isi.teks, isi.url, isi.judul), '_blank', 'noopener,width=680,height=620');
    catat(isi, kanalId);
    return true;
  }

  function salin(isi) {
    var teks = isi.teks + '\n' + isi.url;
    if (navigator.clipboard) return navigator.clipboard.writeText(teks).then(function () {
      catat(isi, 'salin'); return true; });
    return Promise.resolve(false);
  }

  function shareBawaan(isi) {
    if (!bisaShareBawaan()) return Promise.resolve(false);
    return navigator.share({ title: isi.judul, text: isi.teks, url: isi.url })
      .then(function () { catat(isi, 'bawaan'); return true; })
      .catch(function () { return false; });   /* pengguna membatalkan — bukan galat */
  }

  /** Catat aktivitas berbagi, dipakai admin untuk melihat kanal mana yang hidup. */
  function catat(isi, kanal) {
    var u = APP && APP.user;
    DB.insert('berbagi', {
      userId: u ? u.id : null, jenis: isi.jenis, judul: isi.judul,
      kanal: kanal, url: isi.url, at: U.nowISO()
    });
    var semua = DB.all('berbagi');
    if (semua.length > 500) {
      U.sortBy(semua, function (x) { return x.at; }).slice(0, semua.length - 500)
        .forEach(function (x) { DB.remove('berbagi', x.id); });
    }
  }

  function statistik() {
    var b = DB.all('berbagi');
    var perKanal = {};
    b.forEach(function (x) { perKanal[x.kanal] = (perKanal[x.kanal] || 0) + 1; });
    return {
      total: b.length,
      produk: b.filter(function (x) { return x.jenis === 'produk'; }).length,
      layanan: b.filter(function (x) { return x.jenis === 'layanan'; }).length,
      undangan: b.filter(function (x) { return x.jenis === 'undangan'; }).length,
      perKanal: perKanal,
      teratas: U.sortBy(Object.keys(perKanal).map(function (k) {
        return { kanal: k, n: perKanal[k] }; }), function (x) { return x.n; }, true)
    };
  }

  return {
    KANAL: KANAL, bisaShareBawaan: bisaShareBawaan,
    tautan: tautan, produk: produk, layanan: layanan, undangan: undangan,
    buka: buka, salin: salin, shareBawaan: shareBawaan, catat: catat, statistik: statistik
  };
})();
