/* ==========================================================================
   chart.js — grafik SVG tanpa library
   --------------------------------------------------------------------------
   Palet dua seri (jasa = teal brand, toko = oranye) sudah divalidasi terhadap
   permukaan putih: ΔE CVD 13,9 · ΔE penglihatan normal 27,1 · kontras ≥ 3:1.
   Jangan ganti hex-nya tanpa menjalankan ulang validator palet.

   Aplikasi ini hanya punya mode terang, jadi tidak ada varian gelap.

   Aturan yang dipegang di sini:
     • batang maksimal 24px, ujung data membulat 4px, pangkal siku
     • celah 2px berwarna permukaan antar segmen tumpukan (bukan garis tepi)
     • grid & sumbu garis rambut solid, warnanya mundur ke belakang
     • label angka hanya di titik terpenting, sisanya lewat sumbu & tooltip
     • teks selalu memakai warna teks, tidak pernah warna seri
     • setiap grafik punya kembaran tabel supaya nilainya tidak hanya lewat warna
   ========================================================================== */
var Chart = (function () {

  var WARNA = {
    s1: '#14958A',   /* Jasa kebersihan */
    s2: '#C2410C',   /* Toko perlengkapan */
    /* Seri KETIGA sengaja netral, bukan warna ketiga yang mencolok.
       Ia dipakai untuk keadaan yang bukan kabar baik maupun buruk — alat
       yang sedang di gudang, misalnya. Memberinya warna yang menuntut
       perhatian membuat dua seri lain yang memang menuntutnya kehilangan
       artinya. Slate 500: cukup gelap di latar terang, cukup terang di
       latar gelap. */
    s3: '#64748B',
    grid: '#EDF1F5',
    sumbu: '#CBD5E1',
    permukaan: '#FFFFFF'
  };

  /* Garis kisi dan sumbu dibaca dari token tema, bukan dipatok.
     Digambar sebagai atribut SVG (stroke="…"), jadi ia tidak ikut berubah
     sendiri seperti properti CSS — nilainya harus diambil saat menggambar.
     Tanpa ini, mode gelap mendapat kisi abu terang yang menyilaukan. */
  function tokenWarna(nama, cadangan) {
    try {
      var v = getComputedStyle(document.body).getPropertyValue(nama).trim();
      return v || cadangan;
    } catch (e) { return cadangan; }
  }

  var daftarSpec = {};
  var nomor = 0;
  var tip = null;

  /* ---------------------------------------------------------------- util */
  function esc(s) { return U.esc(s); }

  /** Angka ringkas untuk label sumbu: 0 · 2,5jt · 40rb · 1,2M */
  function ringkas(n) {
    if (!n) return '0';
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(abs % 1e9 === 0 ? 0 : 1).replace('.', ',') + 'M';
    if (abs >= 1e6) return (n / 1e6).toFixed(abs % 1e6 === 0 ? 0 : 1).replace('.', ',') + 'jt';
    if (abs >= 1e3) return Math.round(n / 1e3) + 'rb';
    return String(Math.round(n));
  }

  /** Batas atas sumbu yang bulat, plus langkah ticknya. */
  function skala(maks, nTick) {
    nTick = nTick || 4;
    if (maks <= 0) return { atas: 1, langkah: 1, tick: [0, 1] };
    var kasar = maks / nTick;
    var pangkat = Math.pow(10, Math.floor(Math.log10(kasar)));
    var norm = kasar / pangkat;
    var bagus = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    var langkah = bagus * pangkat;
    var atas = Math.ceil(maks / langkah) * langkah;
    var tick = [];
    for (var v = 0; v <= atas + 1e-6; v += langkah) tick.push(v);
    return { atas: atas, langkah: langkah, tick: tick };
  }

  /** Jalur persegi dengan dua sudut atas membulat — ujung data, pangkal siku. */
  function jalurAtasBulat(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.max(0, Math.min(r, w / 2, h));
    return 'M' + x + ',' + (y + h) +
      'L' + x + ',' + (y + r) +
      'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'L' + (x + w - r) + ',' + y +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'L' + (x + w) + ',' + (y + h) + 'Z';
  }

  /* ---------------------------------------------------------------- tooltip */
  function pastikanTip() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.setAttribute('role', 'status');
    document.body.appendChild(tip);
    return tip;
  }
  function tampilTip(html, x, y) {
    var t = pastikanTip();
    t.innerHTML = html;
    t.style.display = 'block';
    var r = t.getBoundingClientRect();
    var kiri = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
    var atas = y - r.height - 12;
    if (atas < 8) atas = y + 18;
    t.style.left = kiri + 'px';
    t.style.top = atas + 'px';
  }
  function sembunyiTip() { if (tip) tip.style.display = 'none'; }

  /* ================================================================ KOLOM BERTUMPUK */
  /**
   * spec = {
   *   tipe: 'kolom', data: [{label, values:[a,b], meta:[..]}],
   *   seri: [{nama, warna}], satuan: fungsi format nilai penuh
   * }
   */
  function gambarKolom(box, spec) {
    var lebar = box.clientWidth;
    if (lebar < 40) return;
    var data = spec.data, seri = spec.seri;
    var total = data.map(function (d) { return U.sum(d.values); });
    var maks = Math.max.apply(null, total.concat([0]));
    var sk = skala(maks, 4);

    var padT = 26, padB = 30, padR = 6;
    var padL = 6 + Math.max.apply(null, sk.tick.map(function (v) {
      return ringkas(v).length * 6.4; }));
    var tinggiPlot = 168;
    var tinggi = padT + tinggiPlot + padB;
    var lebarPlot = Math.max(20, lebar - padL - padR);
    var band = lebarPlot / data.length;
    var wBar = Math.min(24, band * 0.52);
    var y0 = padT + tinggiPlot;
    var skalaY = function (v) { return sk.atas ? (v / sk.atas) * tinggiPlot : 0; };

    var s = '<svg width="' + lebar + '" height="' + tinggi + '" viewBox="0 0 ' + lebar + ' ' + tinggi +
      '" role="img" aria-label="' + esc(spec.judulA11y || 'Grafik kolom') + '">';

    /* grid + tick sumbu Y */
    sk.tick.forEach(function (v) {
      var y = y0 - skalaY(v);
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (lebar - padR) + '" y2="' + y +
        '" stroke="' + (v === 0 ? tokenWarna('--line', WARNA.sumbu)
                                    : tokenWarna('--line-2', WARNA.grid)) +
        '" stroke-width="1" shape-rendering="crispEdges"/>';
      s += '<text x="' + (padL - 7) + '" y="' + (y + 3.5) + '" text-anchor="end" class="viz-tick">' +
        ringkas(v) + '</text>';
    });

    /* kolom */
    var idxTertinggi = total.indexOf(maks);
    data.forEach(function (d, i) {
      var xTengah = padL + band * i + band / 2;
      var x = xTengah - wBar / 2;
      var kumulatif = 0;
      /* segmen digambar dari bawah; hanya segmen teratas yang ujungnya membulat */
      var segmen = [];
      d.values.forEach(function (v, j) {
        if (v > 0) segmen.push({ j: j, v: v });
      });
      segmen.forEach(function (sg, urut) {
        var hRaw = skalaY(sg.v);
        var yTop = y0 - skalaY(kumulatif) - hRaw;
        var teratas = urut === segmen.length - 1;
        /* celah 2px di atas segmen yang masih punya tetangga di atasnya */
        var h = teratas ? hRaw : Math.max(1, hRaw - 2);
        var yy = teratas ? yTop : yTop + 2;
        var warna = seri[sg.j].warna;
        s += teratas
          ? '<path d="' + jalurAtasBulat(x, yy, wBar, h, 4) + '" fill="' + warna + '"/>'
          : '<rect x="' + x + '" y="' + yy + '" width="' + wBar + '" height="' + h + '" fill="' + warna + '"/>';
        kumulatif += sg.v;
      });

      /* label langsung hanya pada kolom tertinggi */
      if (i === idxTertinggi && maks > 0) {
        s += '<text x="' + xTengah + '" y="' + (y0 - skalaY(maks) - 9) + '" text-anchor="middle" class="viz-nilai">' +
          ringkas(maks) + '</text>';
      }

      /* label sumbu X */
      s += '<text x="' + xTengah + '" y="' + (y0 + 16) + '" text-anchor="middle" class="viz-tick">' +
        esc(d.label) + '</text>';

      /* area hover selebar band, tinggi penuh — target besar, bukan setitik */
      s += '<rect x="' + (padL + band * i) + '" y="' + padT + '" width="' + band + '" height="' + tinggiPlot +
        '" fill="transparent" class="viz-hit" data-i="' + i + '"/>';
    });

    s += '</svg>';
    box.innerHTML = s;

    /* interaksi */
    var hits = box.querySelectorAll('.viz-hit');
    Array.prototype.forEach.call(hits, function (h) {
      h.addEventListener('mouseenter', function (ev) {
        var d = data[+h.getAttribute('data-i')];
        var isi = '<b>' + esc(d.label) + (d.sub ? ' ' + esc(d.sub) : '') + '</b>';
        seri.forEach(function (sr, j) {
          isi += '<div class="viz-tip-row"><i style="background:' + sr.warna + '"></i>' +
            '<span>' + esc(sr.nama) + '</span><b>' + spec.satuan(d.values[j]) + '</b></div>';
        });
        isi += '<div class="viz-tip-tot">' + I18N.t('Total') + ' <b>' + spec.satuan(U.sum(d.values)) + '</b></div>';
        var r = h.getBoundingClientRect();
        tampilTip(isi, r.left + r.width / 2, r.top);
      });
      h.addEventListener('mouseleave', sembunyiTip);
    });
  }

  /* ================================================================ BATANG HORIZONTAL */
  /** Satu seri, satu warna — panjang batang yang membawa nilainya, bukan warna. */
  function htmlBatang(spec) {
    var maks = Math.max.apply(null, spec.data.map(function (d) { return d.nilai; }).concat([0]));
    if (!maks) return UI.empty(spec.ikonKosong || '📊', spec.judulKosong || I18N.t('Belum ada data'), spec.tksKosong || '');
    return '<div class="viz-bars">' + spec.data.map(function (d) {
      var pct = Math.max(2, d.nilai / maks * 100);
      return '<div class="viz-bar-row">' +
        '<div class="viz-bar-head"><span class="viz-bar-lbl">' + (d.icon ? d.icon + ' ' : '') +
          esc(d.nama) + '</span>' +
          '<span class="viz-bar-val">' + esc(spec.satuan(d.nilai)) + '</span></div>' +
        '<div class="viz-bar-track"><i style="width:' + pct + '%;background:' + spec.warna + '"></i></div>' +
        (d.ket ? '<div class="viz-bar-ket">' + esc(d.ket) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ================================================================ TABEL KEMBARAN */
  function tabelKolom(spec) {
    return '<div class="tbl-wrap"><table class="tbl viz-tbl"><thead><tr><th>' + I18N.t('Bulan') + '</th>' +
      spec.seri.map(function (s) { return '<th class="num">' + esc(s.nama) + '</th>'; }).join('') +
      '<th class="num">' + I18N.t('Total') + '</th></tr></thead><tbody>' +
      spec.data.map(function (d) {
        return '<tr><td>' + esc(d.label) + (d.sub ? ' ' + esc(d.sub) : '') + '</td>' +
          d.values.map(function (v) { return '<td class="num">' + spec.satuan(v) + '</td>'; }).join('') +
          '<td class="num"><b>' + spec.satuan(U.sum(d.values)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function tabelBatang(spec) {
    return '<div class="tbl-wrap"><table class="tbl viz-tbl"><thead><tr><th>' + esc(spec.kolomNama || 'Nama') +
      '</th><th class="num">' + esc(spec.kolomKet || 'Jumlah') + '</th>' +
      '<th class="num">' + I18N.t('Nilai') + '</th></tr></thead><tbody>' +
      spec.data.map(function (d) {
        return '<tr><td>' + (d.icon ? d.icon + ' ' : '') + esc(d.nama) + '</td>' +
          '<td class="num">' + esc(d.ket || '—') + '</td>' +
          '<td class="num"><b>' + esc(spec.satuan(d.nilai)) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ================================================================ LEGENDA */
  /** Wajib ada untuk dua seri atau lebih; satu seri cukup judulnya. */
  function legenda(seri) {
    if (!seri || seri.length < 2) return '';
    return '<div class="viz-legend">' + seri.map(function (s) {
      return '<span class="viz-legend-i"><i style="background:' + s.warna + '"></i>' + esc(s.nama) + '</span>';
    }).join('') + '</div>';
  }

  /* ================================================== SUMBER DATA GRAFIK
     Setiap grafik menyebut dari mana angkanya, lewat lencana “i” di pojok
     kanan atas, dan menyediakan jalan ke datanya yang lengkap.

     Grafik adalah ringkasan, dan ringkasan selalu membuang sesuatu. Yang
     membacanya berhak tahu apa yang dihitung, rentang mana yang diambil,
     dan apa yang TIDAK termasuk — kalau tidak, batang yang mengejutkan
     hanya menyisakan dua pilihan: percaya, atau tidak percaya. Keduanya
     bukan cara mengambil keputusan.

     Dimunculkan pada hover DAN pada fokus. Layar sentuh tidak punya hover:
     tanpa :focus-within, lencana ini akan menjadi hiasan yang tidak bisa
     dibuka siapa pun di ponsel — dan sebagian besar petugas membuka
     aplikasi ini dari ponsel. */
  /* Wadah ditandai ketika berlencana, supaya isinya bisa memberi ruang.
     Tanpa ini lencananya duduk tepat di atas nilai baris pertama grafik
     batang — dan yang tertutup justru angka terbesarnya. */
  function kelasBox(sm) { return 'viz-box' + (sm ? ' viz-box--i' : ''); }

  function badgeSumber(sm) {
    if (!sm) return '';
    var id = 'vzi' + (++nomor);
    var t = I18N.t('Sumber data');
    return '<div class="viz-i">' +
      '<button type="button" class="viz-i__b" aria-describedby="' + id + '"' +
        ' aria-label="' + esc(t) + '">i</button>' +
      '<span class="viz-i__p" id="' + id + '" role="tooltip">' +
        '<b>' + esc(t) + '</b>' +
        (sm.teks ? '<span>' + esc(sm.teks) + '</span>' : '') +
        (sm.hal
          ? '<button type="button" class="viz-i__a" data-sumber-hal="' + esc(sm.hal) + '"' +
            ' data-sumber-params="' + esc(JSON.stringify(sm.params || {})) + '">' +
            esc(sm.label || I18N.t('Lihat data sumber')) + ' →</button>'
          : '') +
      '</span>' +
    '</div>';
  }

  /* ================================================================ API */
  /** Daftarkan spesifikasi grafik, kembalikan HTML wadahnya. */
  function kolom(spec) {
    var id = 'vz' + (++nomor);
    spec.tipe = 'kolom';
    daftarSpec[id] = spec;
    /* Wadah berposisi relatif supaya lencananya bisa duduk di pojok kanan
       atas grafiknya sendiri, bukar di pojok kartu yang memuatnya — satu
       kartu kadang memuat lebih dari satu grafik. */
    return '<div class="' + kelasBox(spec.sumber) + '">' + badgeSumber(spec.sumber) +
      legenda(spec.seri) +
      '<div class="viz" data-viz="' + id + '"></div>' +
    '</div>';
  }

  function batang(spec) {
    spec.warna = spec.warna || WARNA.s1;
    return '<div class="' + kelasBox(spec.sumber) + '">' + badgeSumber(spec.sumber) +
      htmlBatang(spec) +
    '</div>';
  }

  function tabel(spec) {
    return spec.tipe === 'kolom' ? tabelKolom(spec) : tabelBatang(spec);
  }

  /** Gambar semua grafik di dalam root; ikut menyesuaikan saat lebarnya berubah. */
  function pasang(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-viz]'), function (box) {
      var spec = daftarSpec[box.getAttribute('data-viz')];
      if (!spec) return;
      var lebarTerakhir = 0;
      function render() {
        var w = box.clientWidth;
        if (w === lebarTerakhir) return;   /* cegah putaran tak berujung dari observer */
        lebarTerakhir = w;
        gambarKolom(box, spec);
      }
      render();
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { render(); });
        ro.observe(box);
      }
    });
    window.addEventListener('scroll', sembunyiTip, { passive: true });
  }

  return {
    WARNA: WARNA, kolom: kolom, batang: batang, tabel: tabel, legenda: legenda,
    pasang: pasang, ringkas: ringkas, sembunyiTip: sembunyiTip
  };
})();
