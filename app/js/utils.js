/* ==========================================================================
   utils.js — helper umum (format, tanggal, DOM, gambar)
   ========================================================================== */
var U = (function () {

  /* ---------- DOM ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** Escape untuk disisipkan ke innerHTML. Selalu dipakai untuk data dari user. */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Event delegation. map = { namaAksi: function(el, ev) {} }
   * Elemen dipicu lewat atribut data-act="namaAksi".
   */
  function delegate(root, map) {
    root.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      var fn = map[el.getAttribute('data-act')];
      if (fn) { ev.preventDefault(); fn(el, ev); }
    });
    root.addEventListener('change', function (ev) {
      var el = ev.target.closest('[data-change]');
      if (!el || !root.contains(el)) return;
      var fn = map[el.getAttribute('data-change')];
      if (fn) fn(el, ev);
    });
    root.addEventListener('submit', function (ev) {
      var el = ev.target.closest('[data-submit]');
      if (!el || !root.contains(el)) return;
      var fn = map[el.getAttribute('data-submit')];
      if (fn) { ev.preventDefault(); fn(el, ev); }
    });
  }

  /** Ambil semua nilai input di dalam sebuah container sebagai object (pakai atribut name). */
  function readForm(root) {
    var out = {};
    $$('[name]', root).forEach(function (i) {
      if (i.type === 'checkbox') {
        if (i.dataset.multi) { (out[i.name] = out[i.name] || []); if (i.checked) out[i.name].push(i.value); }
        else out[i.name] = i.checked;
      } else if (i.type === 'radio') {
        if (i.checked) out[i.name] = i.value;
      } else if (i.type === 'number') {
        out[i.name] = i.value === '' ? null : Number(i.value);
      } else {
        out[i.name] = i.value.trim();
      }
    });
    return out;
  }

  /* ---------- ID & angka ---------- */
  var _seq = 0;
  function uid(prefix) {
    _seq++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + _seq.toString(36);
  }

  /** Nomor dokumen berurutan: EXO/QUO/2026/0007 */
  function docNo(kind, n, date) {
    var d = date ? new Date(date) : new Date();
    return 'EXO/' + kind + '/' + d.getFullYear() + '/' + String(n).padStart(4, '0');
  }

  /**
   * Nomor dokumen 18 digit, angka saja.
   *
   *   YYYYMMDD  tanggal terbit      8
   *   HHMMSS    jam terbit          6
   *   NNNN      urutan dalam detik  4
   *                               ---
   *                                18
   *
   * KENAPA BUKAN PENOMORAN BERURUT YANG DIISI NOL
   * Nomor berurut yang dipanjangkan jadi 000000000000000031 memakai delapan
   * belas digit untuk menyimpan dua digit informasi. Susunan di atas memakai
   * seluruh ruangnya: nomornya bisa diurutkan menurut waktu, dan petugas yang
   * menerima keluhan bisa membaca tanggal dan jamnya langsung dari nomor —
   * tanpa membuka apa pun.
   *
   * KENAPA ADA URUTAN DI BELAKANG JAM
   * Stempel waktu sampai detik saja akan bertabrakan ketika dua dokumen
   * terbit pada detik yang sama — dan penomoran yang bertabrakan berarti dua
   * tagihan berbeda dengan nomor sama, kesalahan yang baru ketahuan saat
   * pembukuan tidak bisa dicocokkan. Empat digit menampung 10.000 dokumen
   * per detik; urutannya diambil dari pencacah yang sama yang sudah dipakai
   * penomoran lama, jadi tidak ada pencacah kedua yang harus dijaga.
   */
  function docNo18(n, date) {
    var d = date ? new Date(date) : new Date();
    function p(x, l) { return String(x).padStart(l, '0'); }
    return p(d.getFullYear(), 4) + p(d.getMonth() + 1, 2) + p(d.getDate(), 2) +
           p(d.getHours(), 2) + p(d.getMinutes(), 2) + p(d.getSeconds(), 2) +
           p(Math.abs(Math.round(n || 0)) % 10000, 4);
  }

  function rp(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return 'Rp' + Math.round(n).toLocaleString('id-ID');
  }
  function rpShort(n) {
    if (!n) return 'Rp0';
    if (n >= 1e9) return 'Rp' + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1).replace('.', ',') + ' jt';
    if (n >= 1e3) return 'Rp' + Math.round(n / 1e3) + 'rb';
    return 'Rp' + n;
  }
  function num(n) { return (n || 0).toLocaleString('id-ID'); }

  /* ---------- Tanggal ---------- */
  var BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var BULAN_S = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var HARI_S = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  /** Date -> "2026-08-11" (waktu lokal, bukan UTC) */
  function iso(d) {
    d = d ? new Date(d) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function today() { return iso(new Date()); }
  function nowISO() { return new Date().toISOString(); }

  /**
   * "2026-08-11" -> Date lokal jam 00:00 (hindari pergeseran timezone).
   * Selalu mengembalikan objek baru supaya addDays/diffDays tidak pernah
   * memutasi Date yang dikirim pemanggil.
   */
  function d(v) {
    if (v instanceof Date) return new Date(v.getTime());
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var p = v.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    return new Date(v);
  }
  function addDays(v, n) { var x = d(v); x.setDate(x.getDate() + n); return x; }
  function diffDays(a, b) {
    return Math.round((d(a).setHours(0,0,0,0) - d(b).setHours(0,0,0,0)) / 86400000);
  }

  /* ARGUMEN `kode` YANG OPSIONAL, DAN KENAPA IA ADA.

     Nama bulan dan hari disimpan sebagai larik Indonesia, bukan sebagai
     kalimat, sehingga tidak bisa dilayani penerjemah terikat `w` yang
     dipakai penyusun pesan. Bahasanya harus bisa DIMINTA.

     Tanpa argumen: bahasa LAYAR — benar untuk tabel, kartu, dan dokumen di
     dalam aplikasi. Dengan argumen: bahasa yang diminta — dipakai wa.js dan
     email.js yang mengoper w.kode dari I18N.pesanUntuk(), supaya pesan yang
     kalimatnya sudah berbahasa penerima tidak memuat tanggal berbahasa
     pengirimnya. Campuran itu paling mencolok justru di baris jatuh tempo.

     BOLEH mengikuti bahasa layar karena seluruh 254 pemanggil memakainya
     untuk MENAMPILKAN saja — sudah diperiksa satu per satu; tidak ada yang
     mengurai, membandingkan, atau mengurutkan hasilnya (yang diurutkan
     selalu nilai mentahnya). Dan bagi pembaca Bahasa Indonesia tidak ada
     yang berubah sama sekali: I18N.untuk('id', x) mengembalikan x. */
  function bhs(kode) { return kode || (window.I18N ? I18N.get() : 'id'); }
  function namaBulan(i, kode)  { return I18N.untuk(bhs(kode), BULAN[i]); }
  function namaBulanS(i, kode) { return I18N.untuk(bhs(kode), BULAN_S[i]); }
  function namaHari(i, kode)   { return I18N.untuk(bhs(kode), HARI[i]); }

  function tgl(v, kode) {
    var x = d(v);
    return x.getDate() + ' ' + namaBulanS(x.getMonth(), kode) + ' ' + x.getFullYear();
  }
  function tglPanjang(v, kode) {
    var x = d(v);
    return namaHari(x.getDay(), kode) + ', ' + x.getDate() + ' ' +
      namaBulan(x.getMonth(), kode) + ' ' + x.getFullYear();
  }
  function tglPendek(v, kode) {
    var x = d(v);
    return x.getDate() + ' ' + namaBulanS(x.getMonth(), kode);
  }
  function jam(v) {
    var x = new Date(v);
    return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
  }
  function tglJam(v, kode) { return tgl(v, kode) + ' • ' + jam(v); }

  /** "Hari ini", "Besok", "3 hari lagi", "2 hari lalu" */
  /* SATU-SATUNYA yang dibungkus di sini dulu adalah 'Hari ini'. Sisanya
     lolos audit karena penanda bahasanya bekerja dengan mencari kata umum
     Indonesia — dan 'Besok', 'Kemarin', 'baru saja' tidak memuat satu pun
     kata itu, sehingga terbaca bukan kalimat Indonesia. Akibatnya daftar
     WhatsApp Outbox berbahasa Inggris menuliskan “baru saja” dan
     “35 mnt lalu” di kolom waktunya.

     Angkanya ditaruh di {n} dan disisipkan sesudah diterjemahkan: bahasa
     yang menaruh angkanya di tempat lain tetap bisa dilayani, dan kunci
     kamusnya tidak berlipat menjadi satu per angka. */
  /* `kode` opsional dengan aturan yang sama seperti tgl(): tanpa argumen
     ikut bahasa LAYAR (semua pemanggil lama), dengan argumen ikut bahasa
     yang diminta (penyusun pesan keluar). */
  function isiN(kunci, n, kode) {
    return (kode ? I18N.untuk(kode, kunci) : I18N.t(kunci)).replace('{n}', n);
  }
  function kata(teks, kode) { return kode ? I18N.untuk(kode, teks) : I18N.t(teks); }

  function relatif(v, kode) {
    var n = diffDays(v, new Date());
    if (n === 0) return kata('Hari ini', kode);
    if (n === 1) return kata('Besok', kode);
    if (n === -1) return kata('Kemarin', kode);
    if (n > 0) return isiN('{n} hari lagi', n, kode);
    return isiN('{n} hari lalu', Math.abs(n), kode);
  }
  function sejak(ts, kode) {
    var s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return kata('baru saja', kode);
    if (s < 3600) return isiN('{n} mnt lalu', Math.floor(s / 60), kode);
    if (s < 86400) return isiN('{n} jam lalu', Math.floor(s / 3600), kode);
    if (s < 604800) return isiN('{n} hari lalu', Math.floor(s / 86400), kode);
    return tgl(ts, kode);
  }
  function bulanTahun(v, kode) { var x = d(v); return namaBulan(x.getMonth(), kode) + ' ' + x.getFullYear(); }

  /** Durasi antara dua timestamp -> "6j 15m" ("6h 15m" dalam Inggris) */
  function durasi(a, b) {
    var ms = new Date(b).getTime() - new Date(a).getTime();
    if (isNaN(ms) || ms < 0) return '—';
    var m = Math.floor(ms / 60000);
    /* Satu kunci untuk seluruh bentuknya, bukan dua kunci satu huruf:
       'j' dan 'm' sendirian tidak bisa diterjemahkan siapa pun tanpa tahu
       konteksnya, dan bahasa yang menulis jam sesudah menit tetap terlayani. */
    return I18N.t('{j}j {m}m')
      .replace('{j}', Math.floor(m / 60))
      .replace('{m}', String(m % 60).padStart(2, '0'));
  }

  /* ---------- Teks ---------- */
  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  /** Warna avatar stabil berdasarkan nama */
  function avaColor(name) {
    var s = 0, str = String(name || '');
    for (var i = 0; i < str.length; i++) s += str.charCodeAt(i);
    return 'c-' + (s % 6 + 1);
  }
  function potong(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /** 08123456789 / +6281... -> 6281234567890 (format wa.me) */
  function waPhone(p) {
    var x = String(p || '').replace(/[^0-9]/g, '');
    if (x.indexOf('0') === 0) x = '62' + x.slice(1);
    if (x.indexOf('62') !== 0) x = '62' + x;
    return x;
  }
  function phoneDisplay(p) {
    var x = String(p || '').replace(/[^0-9]/g, '');
    if (x.indexOf('62') === 0) x = '0' + x.slice(2);
    return x.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }

  /* ---------- Koleksi ---------- */
  function by(arr, key) {
    var m = {};
    (arr || []).forEach(function (o) { m[o[key]] = o; });
    return m;
  }
  function groupBy(arr, fn) {
    var m = {};
    (arr || []).forEach(function (o) { var k = fn(o); (m[k] = m[k] || []).push(o); });
    return m;
  }
  function sum(arr, fn) {
    return (arr || []).reduce(function (a, o) { return a + (fn ? (fn(o) || 0) : (o || 0)); }, 0);
  }
  function sortBy(arr, fn, desc) {
    return (arr || []).slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (desc ? -1 : 1);
    });
  }

  /* ---------- Gambar ---------- */
  /**
   * Kompres File gambar jadi dataURL kecil supaya muat di localStorage.
   * Default: sisi terpanjang 720px, JPEG q=0.55 (~40-70 KB).
   */
  function compressImage(file, maxSide, quality) {
    maxSide = maxSide || 720; quality = quality || 0.55;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error(I18N.t('Gagal membaca file'))); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error(I18N.t('File bukan gambar yang valid'))); };
        img.onload = function () {
          var w = img.width, h = img.height, s = Math.min(1, maxSide / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * s); c.height = Math.round(h * s);
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /** Ambil posisi GPS. Selalu resolve — kalau gagal, kembalikan {ok:false, alasan}. */
  function getGPS(timeout) {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) return resolve({ ok: false, alasan: I18N.t('Perangkat tidak mendukung GPS') });
      navigator.geolocation.getCurrentPosition(
        function (p) {
          resolve({ ok: true, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6),
                    akurasi: Math.round(p.coords.accuracy) });
        },
        function (e) {
          var msg = e.code === 1 ? 'Izin lokasi ditolak'
                  : e.code === 2 ? I18N.t('Lokasi tidak terdeteksi') : 'Waktu tunggu GPS habis';
          resolve({ ok: false, alasan: msg });
        },
        { enableHighAccuracy: true, timeout: timeout || 8000, maximumAge: 30000 }
      );
    });
  }

  /** Jarak dua titik koordinat dalam meter (haversine). */
  function jarakMeter(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    var R = 6371000, toRad = function (x) { return x * Math.PI / 180; };
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
  }

  function mapsLink(lat, lng) { return 'https://www.google.com/maps?q=' + lat + ',' + lng; }

  /* ================================================== IKON YANG AMAN
     Sebagian emoji di katalog berasal dari Emoji 13–14 dan belum ada di
     font bawaan Windows 10 — 🪟 kaca, 🪣 ember, 🪜 tangga, 🫧 busa. Yang
     tampil di sana bukan gambar lain, melainkan kotak kosong: tepat di
     tengah kartu produk, pada ukuran paling besar di seluruh kartu.

     Diganti saat DIGAMBAR, bukan di datanya. Ikon-ikon itu sudah
     tersimpan di DB pengguna dan pada produk yang dibuat penjual sendiri;
     memperbaiki seed.js hanya menolong pemasangan baru, dan menaikkan
     versi DB demi emoji berarti menghapus produk yang sudah mereka isi.
     Padanannya dipilih dari Emoji 1.0 supaya tidak menukar satu kotak
     kosong dengan kotak kosong yang lain.

     Daftar ini pendek dengan sengaja: ia menambal glyph yang benar-benar
     terbukti hilang, bukan menebak-nebak font pembacanya. */
  var IKON_GANTI = {
    '\u{1FA9F}': '\u{1F5BC}\uFE0F',   /* jendela  → bingkai berkaca */
    '\u{1FAA3}': '\u{1F6E2}\uFE0F',   /* ember    → wadah/drum      */
    '\u{1FA9C}': '\u{1F4D0}',          /* tangga   → siku ukur       */
    '\u{1FAE7}': '\u{1F4A6}'           /* busa     → cipratan air    */
  };

  function ikon(e) { return IKON_GANTI[e] || e; }

  return {
    /* Baris ini pernah berbunyi "$: $, $: $" — nama yang sama dua kali, dan
       $$ tidak pernah ikut terekspor sama sekali. Lima tempat memanggil U.$$
       dan kelimanya melempar TypeError begitu dijalankan; salah satunya di
       halaman pembayaran. Ditemukan oleh app/tools/audit-ekspor.js, bukan
       oleh mata — dua nama yang hanya berbeda satu huruf, berdampingan. */
    $: $, $$: $$, esc: esc, delegate: delegate, readForm: readForm,
    ikon: ikon,
    uid: uid, docNo: docNo, docNo18: docNo18, rp: rp, rpShort: rpShort, num: num,
    iso: iso, today: today, nowISO: nowISO, d: d, addDays: addDays, diffDays: diffDays,
    tgl: tgl, tglPanjang: tglPanjang, tglPendek: tglPendek, jam: jam, tglJam: tglJam,
    relatif: relatif, sejak: sejak, bulanTahun: bulanTahun, durasi: durasi,
    BULAN: BULAN, BULAN_S: BULAN_S, HARI: HARI, HARI_S: HARI_S,
    initials: initials, avaColor: avaColor, potong: potong,
    waPhone: waPhone, phoneDisplay: phoneDisplay,
    by: by, groupBy: groupBy, sum: sum, sortBy: sortBy,
    compressImage: compressImage, getGPS: getGPS, jarakMeter: jarakMeter, mapsLink: mapsLink
  };
})();
