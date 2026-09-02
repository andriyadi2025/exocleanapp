/* ==========================================================================
   media.js — foto, video, dan sematan video pihak ketiga untuk produk
   --------------------------------------------------------------------------
   Toko boleh melengkapi produknya dengan:
     • foto yang diunggah sendiri
     • video yang diunggah sendiri
     • tautan video dari YouTube, TikTok, atau Instagram

   ATURAN KEAMANAN YANG TIDAK BOLEH DILANGGAR
   ------------------------------------------
   1. Penjual HANYA boleh memasukkan TAUTAN. Tidak pernah potongan HTML,
      tidak pernah kode <iframe>, tidak pernah <script>. Menerima HTML dari
      penjual sama dengan memberi siapa pun yang bisa membuka toko sebuah
      jalan menjalankan kode di peramban seluruh pembeli — mencuri sesi,
      mengubah harga di layar, atau mengalihkan pembayaran.

   2. Alamat sematan DIBANGUN OLEH KITA dari templat tetap, bukan disalin
      dari masukan penjual. Yang diambil dari tautan mereka hanyalah ID
      video, dan ID itu wajib lolos pola karakter yang ketat.

   3. Nama host dicocokkan PERSIS dengan daftar putih. Pencocokan dengan
      endsWith() ditolak: "youtube.com.penyerang.id" berakhiran
      "youtube.com" dan akan lolos.

   4. Hanya https. Tautan http bisa disisipi di tengah jalan.

   MENGAPA SEMATAN TIDAK DIMUAT SEBELUM DIKLIK
   -------------------------------------------
   Iframe YouTube/TikTok/Instagram mengirim alamat IP, jenis peramban, dan
   halaman asal pembeli ke perusahaan itu — bahkan bila videonya tidak
   pernah ditonton. Maka yang tampil lebih dulu hanyalah kartu pemicu buatan
   sendiri; iframe-nya baru dibuat setelah pembeli benar-benar menekan putar.

   CATATAN PRODUKSI
   ----------------
   Foto dan video unggahan disimpan di IndexedDB perangkat (lewat BERKAS),
   jadi hanya terlihat di peramban yang mengunggahnya. Di produksi berkas
   itu harus naik ke penyimpanan objek dan disajikan lewat URL publik yang
   ikut bersama data produk — kalau tidak, pembeli lain tidak akan pernah
   melihatnya.

   Bila nanti dipasang Content-Security-Policy, frame-src wajib memuat
   ketiga host sematan di bawah, atau videonya akan gagal tampil.
   ========================================================================== */
var MEDIA = (function () {

  /* ================================================================ BATAS */
  var BATAS = {
    perProduk: 8,        /* foto + video + sematan digabung */
    embedPerProduk: 3
  };

  /* ============================================================= PLATFORM
     host  : dicocokkan PERSIS (bukan akhiran) setelah "www." dibuang.
     id    : pola karakter ID yang diterima — sengaja sesempit mungkin.
     ambil : daftar cara membaca ID dari sebuah URL. Yang pertama cocok
             dipakai; bila tidak ada yang cocok, tautannya ditolak.
     semat : templat alamat sematan. ID disisipkan setelah lolos pola. */
  var PLATFORM = {
    youtube: {
      nama: 'YouTube', ikon: '▶️', warna: '#FF0000',
      host: ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
      id: /^[A-Za-z0-9_-]{11}$/,
      ambil: [
        function (u) { return u.searchParams.get('v'); },                    /* /watch?v=ID   */
        function (u) { return cocok(u.pathname, /^\/embed\/([^/?#]+)/); },   /* /embed/ID     */
        function (u) { return cocok(u.pathname, /^\/shorts\/([^/?#]+)/); },  /* /shorts/ID    */
        function (u) { return cocok(u.pathname, /^\/live\/([^/?#]+)/); },    /* /live/ID      */
        function (u) { return u.hostname.replace(/^www\./, '') === 'youtu.be'
          ? cocok(u.pathname, /^\/([^/?#]+)/) : null; }                      /* youtu.be/ID   */
      ],
      /* -nocookie: YouTube tidak menaruh penanda pelacak sampai videonya
         benar-benar diputar. Tidak menghilangkan pelacakan, tetapi menunda
         sampai pembeli memang memilih menonton. */
      semat: function (id) { return 'https://www.youtube-nocookie.com/embed/' + id; },
      tautan: function (id) { return 'https://www.youtube.com/watch?v=' + id; }
    },

    tiktok: {
      nama: 'TikTok', ikon: '🎵', warna: '#000000',
      host: ['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
      id: /^[0-9]{6,25}$/,
      ambil: [
        function (u) { return cocok(u.pathname, /\/video\/([0-9]+)/); },
        function (u) { return cocok(u.pathname, /\/photo\/([0-9]+)/); },
        function (u) { return cocok(u.pathname, /^\/embed\/v2\/([0-9]+)/); }
      ],
      semat: function (id) { return 'https://www.tiktok.com/embed/v2/' + id; },
      tautan: function (id) { return 'https://www.tiktok.com/embed/v2/' + id; }
    },

    instagram: {
      nama: 'Instagram', ikon: '📸', warna: '#C13584',
      host: ['instagram.com'],
      id: /^[A-Za-z0-9_-]{5,20}$/,
      ambil: [
        function (u) { return cocok(u.pathname, /^\/reels?\/([^/?#]+)/); },
        function (u) { return cocok(u.pathname, /^\/p\/([^/?#]+)/); },
        function (u) { return cocok(u.pathname, /^\/tv\/([^/?#]+)/); }
      ],
      semat: function (id) { return 'https://www.instagram.com/reel/' + id + '/embed/'; },
      tautan: function (id) { return 'https://www.instagram.com/reel/' + id + '/'; }
    }
  };

  function cocok(teks, pola) {
    var m = String(teks || '').match(pola);
    return m ? m[1] : null;
  }

  function platform(kode) { return PLATFORM[kode] || null; }

  function daftarPlatform() {
    return Object.keys(PLATFORM).map(function (k) {
      return { kode: k, nama: PLATFORM[k].nama, ikon: PLATFORM[k].ikon };
    });
  }

  /* ================================================================ URAI */
  /**
   * Ubah tautan yang ditempel penjual menjadi catatan sematan yang aman.
   *
   * Mengembalikan { ok:true, media } atau { ok:false, pesan }. Pesannya
   * menyebutkan APA yang salah, bukan sekadar "tautan tidak valid" — penjual
   * yang menempel tautan profil alih-alih tautan video perlu tahu bedanya
   * supaya bisa memperbaikinya sendiri.
   */
  function uraiTautan(teks) {
    var mentah = String(teks || '').trim();
    if (!mentah) return { ok: false, pesan: I18N.t('Tautan video belum diisi.') };

    /* Potongan HTML ditolak lebih dulu dan dengan alasan yang jelas: banyak
       platform menyodorkan tombol "Salin kode sematan", dan penjual yang
       menempelkannya perlu diberi tahu bahwa yang diminta adalah tautannya. */
    if (/[<>]/.test(mentah)) {
      return { ok: false, pesan: 'Tempelkan TAUTAN videonya saja, bukan kode sematan (<iframe>). ' +
        I18N.t('Buka videonya, lalu salin alamat dari bilah alamat atau tombol Bagikan.') };
    }

    var u;
    try { u = new URL(mentah); }
    catch (e) { return { ok: false, pesan: I18N.t('Bukan alamat yang sah. Contoh: https://www.youtube.com/watch?v=…') }; }

    if (u.protocol !== 'https:') {
      return { ok: false, pesan: I18N.t('Hanya tautan https yang diterima. Ganti "http://" menjadi "https://".') };
    }

    var host = u.hostname.toLowerCase().replace(/^www\./, '');
    var kode = null;
    Object.keys(PLATFORM).forEach(function (k) {
      if (PLATFORM[k].host.indexOf(host) >= 0) kode = k;
    });
    if (!kode) {
      return { ok: false, pesan: I18N.t('Hanya video dari YouTube, TikTok, dan Instagram yang bisa disematkan.') + ' ' +
        I18N.t('Video dari sumber lain silakan diunggah langsung sebagai berkas.') };
    }

    var pf = PLATFORM[kode], id = null;
    for (var i = 0; i < pf.ambil.length && !id; i++) {
      try { id = pf.ambil[i](u); } catch (e) { id = null; }
    }
    if (!id) {
      return { ok: false, pesan: 'Tautan ' + pf.nama + ' ' + I18N.t('ini bukan tautan video.') + ' ' +
        I18N.t('Buka videonya dulu, baru salin alamatnya.') };
    }
    if (!pf.id.test(id)) {
      return { ok: false, pesan: I18N.t('ID video pada tautan') + ' ' + pf.nama + ' ' + I18N.t('tidak dikenali.') };
    }

    return { ok: true, media: {
      jenis: 'embed', platform: kode, videoId: id,
      /* Alamat sematan TIDAK disimpan — dibangun ulang tiap kali dipakai dari
         templat kita sendiri. Menyimpannya berarti menyimpan string yang
         pernah tersentuh masukan luar, dan string itu cepat atau lambat akan
         dipercaya oleh kode yang menulisnya ke halaman. */
      at: U.nowISO()
    } };
  }

  /** Alamat sematan — selalu dihitung, tidak pernah dibaca dari data. */
  function alamatSemat(m) {
    var pf = m && PLATFORM[m.platform];
    if (!pf || !pf.id.test(String(m.videoId || ''))) return null;
    return pf.semat(m.videoId);
  }

  /** Alamat untuk dibuka di tab baru (bukan sematan). */
  function alamatTautan(m) {
    var pf = m && PLATFORM[m.platform];
    if (!pf || !pf.id.test(String(m.videoId || ''))) return null;
    return pf.tautan(m.videoId);
  }

  /**
   * Iframe sematan. Dipanggil HANYA setelah pembeli menekan putar.
   *
   * sandbox dipasang sesempit mungkin. allow-same-origin di sini aman:
   * frame-nya lintas-asal, jadi "same origin" yang dipulihkan adalah asal
   * YouTube/TikTok, bukan asal aplikasi kita.
   */
  function iframeHTML(m) {
    var src = alamatSemat(m);
    if (!src) return '';
    return '<iframe class="pmed__frame" src="' + U.esc(src) + '" ' +
      'title="' + U.esc((PLATFORM[m.platform] || {}).nama || 'Video') + '" ' +
      'loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ' +
      'sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" ' +
      /* fullscreen cukup diberikan lewat allow=. Menambahkan allowfullscreen
         di sebelahnya membuat peramban memperingatkan atribut yang saling
         menimpa — dan yang menang tetap allow=, jadi yang satu memang lebih. */
      'allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"' +
      '></iframe>';
  }

  /* ================================================================ DAFTAR */

  /** Media sebuah produk, selalu berupa array (kosong bila belum ada). */
  function produk(p) {
    return (p && Array.isArray(p.media)) ? p.media.slice() : [];
  }

  function ringkas(p) {
    var m = produk(p), n = { foto: 0, video: 0, embed: 0 };
    m.forEach(function (x) { if (n[x.jenis] !== undefined) n[x.jenis]++; });
    return n;
  }

  function bolehTambah(p, jenis) {
    var m = produk(p);
    if (m.length >= BATAS.perProduk) {
      return { ok: false, pesan: 'Maksimal ' + BATAS.perProduk + ' ' + I18N.t('media per produk.') };
    }
    if (jenis === 'embed' && ringkas(p).embed >= BATAS.embedPerProduk) {
      return { ok: false, pesan: 'Maksimal ' + BATAS.embedPerProduk + ' ' + I18N.t('video sematan per produk.') };
    }
    return { ok: true };
  }

  /** Simpan daftar media ke produk. */
  function simpan(produkId, daftar) {
    return DB.update('products', produkId, { media: daftar });
  }

  /* Label untuk ditampilkan pada thumbnail. */
  function label(m) {
    if (m.jenis === 'foto') return 'Foto';
    if (m.jenis === 'video') return 'Video';
    var pf = PLATFORM[m.platform];
    return pf ? pf.nama : 'Video';
  }

  function ikon(m) {
    if (m.jenis === 'foto') return '🖼️';
    if (m.jenis === 'video') return '🎬';
    var pf = PLATFORM[m.platform];
    return pf ? pf.ikon : '🎬';
  }

  return {
    BATAS: BATAS, PLATFORM: PLATFORM,
    platform: platform, daftarPlatform: daftarPlatform,
    uraiTautan: uraiTautan, alamatSemat: alamatSemat, alamatTautan: alamatTautan,
    iframeHTML: iframeHTML,
    produk: produk, ringkas: ringkas, bolehTambah: bolehTambah, simpan: simpan,
    label: label, ikon: ikon
  };
})();
