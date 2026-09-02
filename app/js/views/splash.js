/* ==========================================================================
   views/splash.js — layar pembuka EXOCLEAN
   --------------------------------------------------------------------------
   Susunannya mengikuti materi merek: logo di tengah, dikelilingi lingkaran
   ikon layanan bergaris tipis, lalu lengkung teal di bawah dengan maskot
   penyedot debu.

   Ikon dan maskot digambar sebagai SVG sebaris, bukan berkas gambar, karena:
     • tetap tajam di layar berapa pun tanpa menyiapkan @2x/@3x,
     • warnanya ikut variabel tema, jadi sekali ganti warna merek semuanya ikut,
     • tidak menambah permintaan berkas — layar pertama harus muncul seketika.

   Layar ini menutup sendiri setelah animasinya selesai, dan bisa dilewati
   dengan menyentuh layar. Bila pengguna memilih "kurangi gerak" di sistemnya,
   animasinya dilewati dan durasinya dipangkas.
   ========================================================================== */
var ViewSplash = (function () {

  var DURASI = 2600;      /* total tayang sebelum menutup sendiri (ms) */
  var DURASI_SINGKAT = 900;

  /* ================================================================ IKON LAYANAN
     Urutannya searah jarum jam mulai dari puncak lingkaran. Tiap ikon dibuat
     pada kanvas 24×24 dengan garis saja supaya seragam ringannya. */
  var IKON = [
    { n: 'Cuci sofa', d:
      '<path d="M4 11.5V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5"/>' +
      '<path d="M4 11.5a2 2 0 0 0-1 1.7V17h18v-3.8a2 2 0 0 0-1-1.7"/>' +
      '<path d="M6.5 11.5V17M17.5 11.5V17M4 17v1.5M20 17v1.5"/>' },

    { n: 'Toilet & kamar mandi', d:
      '<path d="M8 4h6v4H8z"/><path d="M6 8h11v2.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 6 10.5V8z"/>' +
      '<path d="M9 16l-.8 4M14 16l.8 4"/><path d="M17 9.5h2"/>' },

    { n: 'Setrika & laundry', d:
      '<path d="M3 15.5v-2A5.5 5.5 0 0 1 8.5 8h7A4.5 4.5 0 0 1 20 12.5v3z"/>' +
      '<path d="M3 15.5h17"/><path d="M8 8V6.5A1.5 1.5 0 0 1 9.5 5h5"/>' +
      '<path d="M7 11.5h5"/>' },

    { n: 'Pel & sapu lantai', d:
      '<path d="M14.5 3.5l-8 8"/><path d="M5.5 12.5l3.5 3.5"/>' +
      '<path d="M4 14l6 6"/><path d="M3 16.5l4.5 4.5M6 13.5l4.5 4.5"/>' +
      '<circle cx="16" cy="5" r="1.6"/>' },

    { n: 'Vacuum & cuci karpet', d:
      '<path d="M5 18h9a4 4 0 0 0 4-4v-1a3 3 0 0 0-3-3h-1"/>' +
      '<rect x="2.5" y="14.5" width="6" height="4.5" rx="1.6"/>' +
      '<path d="M14 10V6.5a2 2 0 0 1 2-2h1.5"/><circle cx="19" cy="4.5" r="1.4"/>' +
      '<path d="M5 19v1.2M7.5 19v1.2"/>' },

    { n: 'Cuci kursi', d:
      '<path d="M7 12V8.5A1.5 1.5 0 0 1 8.5 7h7A1.5 1.5 0 0 1 17 8.5V12"/>' +
      '<path d="M7 12a1.8 1.8 0 0 0-1.5 1.8V17h13v-3.2A1.8 1.8 0 0 0 17 12"/>' +
      '<path d="M5.5 17v1.5M18.5 17v1.5"/>' },

    { n: 'Kamar & housekeeping', d:
      '<path d="M3 17v-4.5A1.5 1.5 0 0 1 4.5 11h15a1.5 1.5 0 0 1 1.5 1.5V17"/>' +
      '<path d="M3 17h18M4.5 17v1.5M19.5 17v1.5"/>' +
      '<path d="M6.5 11V8.5A1.5 1.5 0 0 1 8 7h8a1.5 1.5 0 0 1 1.5 1.5V11"/>' +
      '<path d="M9 11V9.5h6V11"/>' },

    { n: 'Cuci AC', d:
      '<rect x="3" y="6.5" width="18" height="6" rx="1.6"/>' +
      '<path d="M3 10.5h18"/><path d="M7 15.5c1.2 0 1.2 1.6 2.4 1.6M13 15.5c1.2 0 1.2 1.6 2.4 1.6"/>' +
      '<path d="M6 8.6h3"/>' },

    { n: 'Cuci kendaraan', d:
      '<path d="M3.5 15v-2.4l1.7-4A1.8 1.8 0 0 1 6.9 7.5h10.2a1.8 1.8 0 0 1 1.7 1.1l1.7 4V15"/>' +
      '<path d="M3.5 15h17"/><circle cx="7.5" cy="15.5" r="1.7"/><circle cx="16.5" cy="15.5" r="1.7"/>' +
      '<path d="M5.2 12.6h13.6"/>' },

    { n: 'Pengendalian hama', d:
      '<ellipse cx="12" cy="13" rx="4" ry="5.5"/><path d="M12 7.5V18.5"/>' +
      '<circle cx="12" cy="6" r="2"/><path d="M10.8 4.4L9.5 2.8M13.2 4.4l1.3-1.6"/>' +
      '<path d="M8 10L4.5 8M8 13H4.2M8.4 16l-3 2M16 10l3.5-2M16 13h3.8M15.6 16l3 2"/>' },

    { n: 'Taman & area luar', d:
      '<path d="M12 20V9"/><path d="M12 13c-3.4 0-5-2.6-5.4-6.4C10 7 12 9.4 12 13z"/>' +
      '<path d="M12 15c3.4 0 5-2.6 5.4-6.4C14 9 12 11.4 12 15z"/><path d="M6 20h12"/>' },

    { n: 'Cuci kaca & jendela', d:
      '<rect x="4" y="4" width="16" height="14" rx="1.6"/>' +
      '<path d="M12 4v14M4 11h16"/><path d="M3 20h18"/>' }
  ];

  /* ================================================================ MASKOT
     Karakter penyedot debu yang sama dengan materi promosi: badan membulat,
     wajah ramah, sarung tangan merah, memegang tongkat vacuum. */
  function maskot() {
    return '<svg class="spl-maskot" viewBox="0 0 150 190" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="spl-badan" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#3FB8AC"/><stop offset="1" stop-color="#12857B"/>' +
        '</linearGradient>' +
      '</defs>' +

      /* --- tongkat & kepala pel --- */
      '<path d="M104 34c7 0 11 5 11 11v96" fill="none" stroke="#2AA79B" stroke-width="7" ' +
        'stroke-linecap="round"/>' +
      '<path d="M104 34c7 0 11 5 11 11v96" fill="none" stroke="#7FD6CD" stroke-width="2.5" ' +
        'stroke-linecap="round" opacity=".7"/>' +
      '<rect x="88" y="139" width="54" height="15" rx="7.5" fill="#2AA79B"/>' +
      '<rect x="88" y="150" width="54" height="8" rx="4" fill="#166F68"/>' +
      '<circle cx="104" cy="34" r="7" fill="#59C6BB"/>' +

      /* --- kaki --- */
      '<path d="M52 150v12" stroke="#166F68" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M74 150v12" stroke="#166F68" stroke-width="9" stroke-linecap="round"/>' +
      '<ellipse cx="49" cy="165" rx="13" ry="7" fill="#D93A2B"/>' +
      '<ellipse cx="77" cy="165" rx="13" ry="7" fill="#D93A2B"/>' +

      /* --- badan --- */
      '<path d="M63 46c22 0 34 16 34 46 0 34-13 58-34 58S29 126 29 92c0-30 12-46 34-46z" ' +
        'fill="url(#spl-badan)"/>' +
      '<path d="M63 74c13 0 20 10 20 28s-8 30-20 30-20-12-20-30 7-28 20-28z" ' +
        'fill="#EAF9F7" opacity=".55"/>' +

      /* --- selang & lengan --- */
      '<path d="M92 92c14 4 18 14 16 26" fill="none" stroke="#2AA79B" stroke-width="8" ' +
        'stroke-linecap="round"/>' +
      '<circle cx="109" cy="122" r="10" fill="#D93A2B"/>' +
      '<path d="M34 96c-11 6-13 16-9 26" fill="none" stroke="#2AA79B" stroke-width="8" ' +
        'stroke-linecap="round"/>' +
      '<circle cx="27" cy="128" r="10" fill="#D93A2B"/>' +

      /* --- wajah --- */
      '<circle cx="53" cy="70" r="9" fill="#fff"/><circle cx="75" cy="70" r="9" fill="#fff"/>' +
      '<circle cx="55" cy="71" r="4.6" fill="#123B38"/><circle cx="73" cy="71" r="4.6" fill="#123B38"/>' +
      '<circle cx="56.6" cy="69" r="1.7" fill="#fff"/><circle cx="74.6" cy="69" r="1.7" fill="#fff"/>' +
      '<path d="M55 86c4 5 12 5 16 0" fill="none" stroke="#123B38" stroke-width="3.4" ' +
        'stroke-linecap="round"/>' +
      '<ellipse cx="40" cy="82" rx="5" ry="3.4" fill="#FF8A7A" opacity=".65"/>' +
      '<ellipse cx="88" cy="82" rx="5" ry="3.4" fill="#FF8A7A" opacity=".65"/>' +

      /* --- topi kecil --- */
      '<path d="M43 50c4-9 12-13 21-13s17 4 21 13z" fill="#166F68"/>' +
      '<rect x="36" y="48" width="56" height="7" rx="3.5" fill="#0F6259"/>' +
      '</svg>';
  }

  /* ================================================================ SUSUNAN */
  /* Jari-jari elips diambil dari proporsi materi merek: ikon paling kiri/kanan
     di 10%/90% lebar panggung, ikon puncak/dasar di 26%/74% tingginya. */
  var RX = 40, RY = 24;

  function cincin() {
    var n = IKON.length;
    return IKON.map(function (ik, i) {
      var sudut = (-90 + i * (360 / n)) * Math.PI / 180;
      var x = 50 + RX * Math.cos(sudut);
      var y = 50 + RY * Math.sin(sudut);
      return '<div class="spl-ic" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;' +
        'animation-delay:' + (260 + i * 55) + 'ms" title="' + U.esc(ik.n) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ik.d + '</svg>' +
        '</div>';
    }).join('');
  }

  function render() {
    return '<div class="splash" id="splash" role="img" ' +
        'aria-label="EXOCLEAN — We Clean All Purpose">' +
        '<div class="spl-panggung">' +
          '<div class="spl-cincin">' + cincin() + '</div>' +
          '<div class="spl-logo">' +
            '<img src="assets/logo-stack.png" alt="EXOCLEAN">' +
            '<div class="spl-tagline">We Clean All Purpose</div>' +
          '</div>' +
        '</div>' +
        '<div class="spl-lengkung"></div>' +
        maskot() +
        '<button class="spl-lewati" data-spl-lewati>' + I18N.t('Lewati') + '</button>' +
      '</div>';
  }

  /* ================================================================ TAYANG */
  var sudahTayang = false;

  /**
   * Tampilkan layar pembuka lalu jalankan `lanjut()` setelah menutup.
   * Hanya sekali per pemuatan halaman — render ulang aplikasi tidak
   * memunculkannya lagi.
   */
  function tampilkan(lanjut) {
    if (sudahTayang) { lanjut(); return; }
    sudahTayang = true;

    var kurangiGerak = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var el = document.createElement('div');
    el.innerHTML = render();
    var splash = el.firstChild;
    if (kurangiGerak) splash.classList.add('splash--diam');
    document.body.appendChild(splash);
    /* kunci gulir selama layar pembuka tampil, supaya tidak ada bilah gulir
       yang menyembul di sisi layar penuh yang seharusnya polos */
    var gulirLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var selesai = false;
    function tutup() {
      if (selesai) return;
      selesai = true;
      clearTimeout(jam);
      document.body.style.overflow = gulirLama;
      splash.classList.add('splash--keluar');
      /* jalankan aplikasinya di balik layar yang sedang memudar, supaya
         perpindahannya terasa menyatu, bukan berkedip putih */
      lanjut();
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 420);
    }

    splash.addEventListener('click', tutup);
    document.addEventListener('keydown', function sekali(ev) {
      if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') {
        document.removeEventListener('keydown', sekali);
        tutup();
      }
    });

    var jam = setTimeout(tutup, kurangiGerak ? DURASI_SINGKAT : DURASI);
  }

  return { tampilkan: tampilkan, render: render, IKON: IKON };
})();
