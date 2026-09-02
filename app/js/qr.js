/* ==========================================================================
   qr.js — pembuat QR Code (mode byte, tingkat koreksi M, versi 1–12)
   --------------------------------------------------------------------------
   Dipakai untuk menampilkan URI otpauth:// supaya aplikasi authenticator bisa
   memindainya langsung. Ditulis sendiri karena aplikasi ini tidak memuat
   pustaka dari CDN — dan kunci rahasia TOTP tidak boleh dikirim ke layanan
   pembuat QR pihak ketiga hanya demi gambar.

   Cakupan sengaja dibatasi pada apa yang benar-benar dibutuhkan:
   mode byte, tingkat koreksi M, versi 1 sampai 12 (maksimal 290 byte data).
   ========================================================================== */
var QR = (function () {

  /* ================================================================ GF(256) */
  var EXP = [], LOG = [];
  (function () {
    var x = 1, i;
    for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function kali(a, b) { return (!a || !b) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /** Polinomial generator derajat n: (x−α⁰)(x−α¹)…(x−αⁿ⁻¹) */
  function generator(n) {
    var p = [1], i, j, np;
    for (i = 0; i < n; i++) {
      np = [];
      for (j = 0; j <= p.length; j++) np[j] = 0;
      for (j = 0; j < p.length; j++) {
        np[j] ^= p[j];                    /* suku x */
        np[j + 1] ^= kali(p[j], EXP[i]);  /* suku αⁱ */
      }
      p = np;
    }
    return p;
  }

  /** Sisa bagi pesan terhadap generator = kode koreksi galat. */
  function koreksi(data, n) {
    var g = generator(n), buf = data.slice(), i, j, f;
    for (i = 0; i < n; i++) buf.push(0);
    for (i = 0; i < data.length; i++) {
      f = buf[i];
      if (f) for (j = 0; j < g.length; j++) buf[i + j] ^= kali(g[j], f);
    }
    return buf.slice(data.length);
  }

  /* ================================================================ TABEL VERSI (tingkat M)
     [ total codeword, ec per blok, blok grup 1, data grup 1, blok grup 2, data grup 2 ] */
  var VERSI = {
    1:  [26,  10, 1, 16, 0, 0],
    2:  [44,  16, 1, 28, 0, 0],
    3:  [70,  26, 1, 44, 0, 0],
    4:  [100, 18, 2, 32, 0, 0],
    5:  [134, 24, 2, 43, 0, 0],
    6:  [172, 16, 4, 27, 0, 0],
    7:  [196, 18, 4, 31, 0, 0],
    8:  [242, 22, 2, 38, 2, 39],
    9:  [292, 22, 3, 36, 2, 37],
    10: [346, 26, 4, 43, 1, 44],
    11: [404, 30, 1, 50, 4, 51],
    12: [466, 22, 6, 36, 2, 37]
  };

  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
    7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
    11: [6, 30, 54], 12: [6, 32, 58]
  };

  function dataCodeword(v) {
    var t = VERSI[v];
    return t[2] * t[3] + t[4] * t[5];
  }

  /** Berapa byte muatan yang muat pada satu versi (mode byte). */
  function kapasitas(v) {
    var bitHeader = 4 + (v <= 9 ? 8 : 16);
    return Math.floor((dataCodeword(v) * 8 - bitHeader) / 8);
  }

  function pilihVersi(panjang) {
    for (var v = 1; v <= 12; v++) if (kapasitas(v) >= panjang) return v;
    return 0;
  }

  /* ================================================================ ALIRAN BIT */
  function susunData(byteArr, v) {
    var bit = [], i, j;
    function tulis(nilai, n) {
      for (var b = n - 1; b >= 0; b--) bit.push((nilai >>> b) & 1);
    }

    tulis(0b0100, 4);                       /* mode byte */
    tulis(byteArr.length, v <= 9 ? 8 : 16); /* jumlah karakter */
    for (i = 0; i < byteArr.length; i++) tulis(byteArr[i], 8);

    var totalBit = dataCodeword(v) * 8;
    for (i = 0; i < 4 && bit.length < totalBit; i++) bit.push(0);  /* terminator */
    while (bit.length % 8 !== 0) bit.push(0);

    var cw = [];
    for (i = 0; i < bit.length; i += 8) {
      var b = 0;
      for (j = 0; j < 8; j++) b = (b << 1) | bit[i + j];
      cw.push(b);
    }
    var isi = [0xEC, 0x11], n = 0;
    while (cw.length < dataCodeword(v)) cw.push(isi[n++ % 2]);
    return cw;
  }

  /** Pecah jadi blok, hitung ECC, lalu selang-seling sesuai aturan QR. */
  function selangSeling(cw, v) {
    var t = VERSI[v], ecN = t[1];
    var blokData = [], blokEc = [], p = 0, i, j;

    function ambil(n, jumlah) {
      for (var b = 0; b < jumlah; b++) {
        var d = cw.slice(p, p + n); p += n;
        blokData.push(d);
        blokEc.push(koreksi(d, ecN));
      }
    }
    ambil(t[3], t[2]);
    if (t[4]) ambil(t[5], t[4]);

    var out = [], maks = 0;
    blokData.forEach(function (b) { maks = Math.max(maks, b.length); });
    for (i = 0; i < maks; i++) {
      for (j = 0; j < blokData.length; j++) if (i < blokData[j].length) out.push(blokData[j][i]);
    }
    for (i = 0; i < ecN; i++) {
      for (j = 0; j < blokEc.length; j++) out.push(blokEc[j][i]);
    }
    return out;
  }

  /* ================================================================ MATRIKS */
  function buatMatriks(v) {
    var n = v * 4 + 17, m = [], fungsi = [], i, j;
    for (i = 0; i < n; i++) {
      m.push([]); fungsi.push([]);
      for (j = 0; j < n; j++) { m[i].push(0); fungsi[i].push(0); }
    }
    return { n: n, m: m, f: fungsi };
  }

  function setF(M, baris, kolom, nilai) {
    if (baris < 0 || kolom < 0 || baris >= M.n || kolom >= M.n) return;
    M.m[baris][kolom] = nilai ? 1 : 0;
    M.f[baris][kolom] = 1;
  }

  function polaPencari(M, baris, kolom) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var jarak = Math.max(Math.abs(dx), Math.abs(dy));
        setF(M, baris + dy, kolom + dx, jarak !== 2 && jarak !== 4);
      }
    }
  }

  function polaPenyelaras(M, baris, kolom) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        setF(M, baris + dy, kolom + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function gambarFungsi(M, v) {
    var n = M.n, i, j;

    for (i = 0; i < n; i++) {                       /* pola waktu */
      setF(M, 6, i, i % 2 === 0);
      setF(M, i, 6, i % 2 === 0);
    }
    polaPencari(M, 3, 3);
    polaPencari(M, 3, n - 4);
    polaPencari(M, n - 4, 3);

    var pos = ALIGN[v];
    for (i = 0; i < pos.length; i++) {
      for (j = 0; j < pos.length; j++) {
        var sudut = (i === 0 && j === 0) || (i === 0 && j === pos.length - 1) ||
                    (i === pos.length - 1 && j === 0);
        if (!sudut) polaPenyelaras(M, pos[i], pos[j]);
      }
    }

    /* area info format dicadangkan dulu; isinya ditulis setelah mask dipilih */
    for (i = 0; i <= 8; i++) { setF(M, 8, i, 0); setF(M, i, 8, 0); }
    for (i = 0; i < 8; i++) { setF(M, n - 1 - i, 8, 0); setF(M, 8, n - 8 + i, 0); }
    setF(M, n - 8, 8, 1);                            /* modul gelap */

    if (v >= 7) {
      var rem = v;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = (v << 12) | rem;
      for (i = 0; i < 18; i++) {
        var b = (bits >>> i) & 1, a = n - 11 + (i % 3), c = Math.floor(i / 3);
        setF(M, c, a, b); setF(M, a, c, b);
      }
    }
  }

  function tulisData(M, data) {
    var n = M.n, i = 0, kanan, tegak, j, x, y, naik;
    for (kanan = n - 1; kanan >= 1; kanan -= 2) {
      if (kanan === 6) kanan = 5;
      for (tegak = 0; tegak < n; tegak++) {
        for (j = 0; j < 2; j++) {
          x = kanan - j;
          naik = ((kanan + 1) & 2) === 0;
          y = naik ? n - 1 - tegak : tegak;
          if (!M.f[y][x] && i < data.length * 8) {
            M.m[y][x] = (data[i >>> 3] >>> (7 - (i & 7))) & 1;
            i++;
          }
        }
      }
    }
  }

  function rumusMask(k, i, j) {
    switch (k) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      default: return ((((i + j) % 2) + ((i * j) % 3)) % 2) === 0;
    }
  }

  function terapkanMask(M, k) {
    for (var i = 0; i < M.n; i++) {
      for (var j = 0; j < M.n; j++) {
        if (!M.f[i][j] && rumusMask(k, i, j)) M.m[i][j] ^= 1;
      }
    }
  }

  function tulisFormat(M, mask) {
    var d = (0 << 3) | mask;         /* tingkat M = 00 */
    var rem = d, i;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((d << 10) | rem) ^ 0x5412;
    function b(i) { return (bits >>> i) & 1; }
    var n = M.n;

    for (i = 0; i <= 5; i++) setF(M, i, 8, b(i));
    setF(M, 7, 8, b(6));
    setF(M, 8, 8, b(7));
    setF(M, 8, 7, b(8));
    for (i = 9; i < 15; i++) setF(M, 8, 14 - i, b(i));

    for (i = 0; i < 8; i++) setF(M, 8, n - 1 - i, b(i));
    for (i = 8; i < 15; i++) setF(M, n - 15 + i, 8, b(i));
    setF(M, n - 8, 8, 1);
  }

  /* ================================================================ PENALTI MASK */
  function penalti(M) {
    var n = M.n, skor = 0, i, j, k;

    /* aturan 1 — deret ≥5 modul sewarna */
    function deret(ambil) {
      var total = 0;
      for (i = 0; i < n; i++) {
        var run = 1;
        for (j = 1; j < n; j++) {
          if (ambil(i, j) === ambil(i, j - 1)) run++;
          else { if (run >= 5) total += run - 2; run = 1; }
        }
        if (run >= 5) total += run - 2;
      }
      return total;
    }
    skor += deret(function (a, b) { return M.m[a][b]; });
    skor += deret(function (a, b) { return M.m[b][a]; });

    /* aturan 2 — blok 2×2 sewarna */
    for (i = 0; i < n - 1; i++) {
      for (j = 0; j < n - 1; j++) {
        var c = M.m[i][j];
        if (c === M.m[i][j + 1] && c === M.m[i + 1][j] && c === M.m[i + 1][j + 1]) skor += 3;
      }
    }

    /* aturan 3 — pola mirip penanda pencari */
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function cocokPola(a, b, pola, arah) {
      for (var t = 0; t < 11; t++) {
        var v = arah ? M.m[a][b + t] : M.m[b + t][a];
        if (v !== pola[t]) return false;
      }
      return true;
    }
    for (i = 0; i < n; i++) {
      for (j = 0; j + 11 <= n; j++) {
        if (cocokPola(i, j, P1, true) || cocokPola(i, j, P2, true)) skor += 40;
        if (cocokPola(i, j, P1, false) || cocokPola(i, j, P2, false)) skor += 40;
      }
    }

    /* aturan 4 — keseimbangan gelap/terang */
    var gelap = 0;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) gelap += M.m[i][j];
    var persen = gelap * 100 / (n * n);
    skor += Math.floor(Math.abs(persen - 50) / 5) * 10;

    return skor;
  }

  /* ================================================================ API */
  /** Bangun matriks QR dari teks. Mengembalikan { n, m, versi } atau null. */
  function matriks(teks) {
    var byteArr = KRIPTO.teks2byte(teks);
    var v = pilihVersi(byteArr.length);
    if (!v) return null;

    var data = selangSeling(susunData(byteArr, v), v);
    var terbaik = null, terbaikSkor = Infinity, k;

    for (k = 0; k < 8; k++) {
      var M = buatMatriks(v);
      gambarFungsi(M, v);
      tulisData(M, data);
      terapkanMask(M, k);
      tulisFormat(M, k);
      var s = penalti(M);
      if (s < terbaikSkor) { terbaikSkor = s; terbaik = M; }
    }
    terbaik.versi = v;
    return terbaik;
  }

  /**
   * QR sebagai SVG siap tempel. Digambar sebagai satu <path> berisi kotak
   * gelap saja supaya ringan dan tetap tajam di layar berapa pun.
   */
  function svg(teks, opsi) {
    opsi = opsi || {};
    var M = matriks(teks);
    if (!M) return '<div class="tbl-sub">' + I18N.t('Teks terlalu panjang untuk QR.') + '</div>';

    var tepi = opsi.tepi === undefined ? 4 : opsi.tepi;
    var sisi = M.n + tepi * 2;
    var d = '', i, j;
    for (i = 0; i < M.n; i++) {
      for (j = 0; j < M.n; j++) {
        if (M.m[i][j]) d += 'M' + (j + tepi) + ',' + (i + tepi) + 'h1v1h-1z';
      }
    }
    return '<svg class="qr" viewBox="0 0 ' + sisi + ' ' + sisi + '" ' +
      'width="' + (opsi.ukuran || 200) + '" height="' + (opsi.ukuran || 200) + '" ' +
      'role="img" aria-label="' + U.esc(opsi.alt || 'Kode QR') + '" ' +
      'shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="' + sisi + '" height="' + sisi + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#0F172A"/></svg>';
  }

  return { matriks: matriks, svg: svg, kapasitas: kapasitas, pilihVersi: pilihVersi,
           koreksi: koreksi, generator: generator, EXP: EXP, LOG: LOG };
})();
