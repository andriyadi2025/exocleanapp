/* ==========================================================================
   kripto.js — primitif keamanan tanpa pustaka luar
   --------------------------------------------------------------------------
   Berisi SHA-1, HMAC-SHA1, PBKDF2, Base32, dan TOTP (RFC 6238) yang ditulis
   sendiri karena aplikasi ini sengaja berjalan tanpa build step maupun CDN.

   Yang dipakai untuk apa:
     • PBKDF2-HMAC-SHA1  → menyimpan PIN dan kata sandi sebagai turunan
                            ber-salt, bukan teks asli.
     • HMAC-SHA1 + TOTP  → kode 6 digit yang sama dengan Google Authenticator,
                            Authy, Microsoft Authenticator, dan sejenisnya.
     • Base32            → format kunci rahasia yang dibaca aplikasi tersebut.

   CATATAN JUJUR: menjalankan turunan sandi di browser tidak menggantikan
   autentikasi sisi server. Ini membuat prototipe berperilaku benar (PIN tidak
   lagi tersimpan sebagai angka polos) dan menyiapkan bentuk datanya, tetapi
   pada produksi seluruh pemeriksaan ini harus pindah ke server.
   ========================================================================== */
var KRIPTO = (function () {

  /* ================================================================ BANTUAN BYTE */
  function teks2byte(s) {
    var out = [], i, c;
    s = String(s);
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function byte2hex(b) {
    var s = '', i;
    for (i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }

  /** Byte acak; pakai crypto.getRandomValues bila tersedia. */
  function acakByte(n) {
    var out = new Array(n), i;
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint8Array(n);
      window.crypto.getRandomValues(buf);
      for (i = 0; i < n; i++) out[i] = buf[i];
      return out;
    }
    for (i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
    return out;
  }

  /* ================================================================ SHA-1 */
  function rol(n, s) { return ((n << s) | (n >>> (32 - s))) >>> 0; }

  function sha1(pesan) {
    var m = pesan.slice(), bit = pesan.length * 8, i, j;
    m.push(0x80);
    while (m.length % 64 !== 56) m.push(0);
    /* panjang 64-bit big-endian — pesan di aplikasi ini jauh di bawah 2^32 bit */
    m.push(0, 0, 0, 0,
      (bit >>> 24) & 255, (bit >>> 16) & 255, (bit >>> 8) & 255, bit & 255);

    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var w = new Array(80);

    for (i = 0; i < m.length; i += 64) {
      for (j = 0; j < 16; j++) {
        w[j] = ((m[i + j * 4] << 24) | (m[i + j * 4 + 1] << 16) |
                (m[i + j * 4 + 2] << 8) | m[i + j * 4 + 3]) >>> 0;
      }
      for (j = 16; j < 80; j++) w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);

      var a = h0, b = h1, c = h2, d = h3, e = h4, f, k, t;
      for (j = 0; j < 80; j++) {
        if (j < 20)      { f = (b & c) | ((~b) & d);            k = 0x5A827999; }
        else if (j < 40) { f = b ^ c ^ d;                       k = 0x6ED9EBA1; }
        else if (j < 60) { f = (b & c) | (b & d) | (c & d);     k = 0x8F1BBCDC; }
        else             { f = b ^ c ^ d;                       k = 0xCA62C1D6; }
        t = (rol(a, 5) + (f >>> 0) + e + k + w[j]) | 0;
        e = d; d = c; c = rol(b, 30); b = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }

    var out = [];
    [h0, h1, h2, h3, h4].forEach(function (x) {
      out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255);
    });
    return out;
  }

  /* ================================================================ HMAC-SHA1 */
  function hmacSha1(kunci, pesan) {
    var k = kunci.slice(), i;
    if (k.length > 64) k = sha1(k);
    while (k.length < 64) k.push(0);
    var ipad = [], opad = [];
    for (i = 0; i < 64; i++) { ipad.push(k[i] ^ 0x36); opad.push(k[i] ^ 0x5C); }
    return sha1(opad.concat(sha1(ipad.concat(pesan))));
  }

  /* ================================================================ PBKDF2 (1 blok, 20 byte) */
  function pbkdf2(sandi, garam, putaran) {
    var u = hmacSha1(sandi, garam.concat([0, 0, 0, 1]));
    var out = u.slice(), i, j;
    for (i = 1; i < putaran; i++) {
      u = hmacSha1(sandi, u);
      for (j = 0; j < 20; j++) out[j] ^= u[j];
    }
    return out;
  }

  /* Jumlah putaran dipilih dari pengukuran nyata: PBKDF2 murni-JS di sini
     berjalan ~13,5 ms per 1.000 putaran, jadi 6.000 putaran ≈ 80 ms — masih
     tidak terasa saat memasukkan PIN, tetapi membuat penebakan massal mahal.
     Angka ini tetap jauh di bawah standar server; pada produksi, penurunan
     kunci harus pindah ke sisi server dengan Argon2/bcrypt. */
  var PUTARAN = 6000;

  /**
   * Turunkan rahasia (PIN / kata sandi) menjadi { garam, hash, putaran }.
   * `putaran` bisa diturunkan untuk rahasia berentropi tinggi seperti kode
   * pemulihan — di sana biaya tebak-menebak sudah datang dari panjang kodenya.
   */
  function turunkan(rahasia, garamHex, putaran) {
    var garam = garamHex ? hex2byte(garamHex) : acakByte(12);
    var n = putaran || PUTARAN;
    var h = pbkdf2(teks2byte(rahasia), garam, n);
    return { garam: byte2hex(garam), hash: byte2hex(h), putaran: n };
  }

  function hex2byte(s) {
    var out = [], i;
    for (i = 0; i < s.length; i += 2) out.push(parseInt(s.substr(i, 2), 16));
    return out;
  }

  /** Bandingkan rahasia dengan simpanan. Waktu tetap supaya tidak bocor per karakter. */
  function cocok(rahasia, simpanan) {
    if (!simpanan || !simpanan.hash || !simpanan.garam) return false;
    var h = byte2hex(pbkdf2(teks2byte(rahasia), hex2byte(simpanan.garam),
      simpanan.putaran || PUTARAN));
    if (h.length !== simpanan.hash.length) return false;
    var beda = 0, i;
    for (i = 0; i < h.length; i++) beda |= h.charCodeAt(i) ^ simpanan.hash.charCodeAt(i);
    return beda === 0;
  }

  /* ================================================================ BASE32 (RFC 4648) */
  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function b32encode(byteArr) {
    var out = '', bit = 0, nilai = 0, i;
    for (i = 0; i < byteArr.length; i++) {
      nilai = (nilai << 8) | byteArr[i]; bit += 8;
      while (bit >= 5) { out += B32[(nilai >>> (bit - 5)) & 31]; bit -= 5; }
    }
    if (bit > 0) out += B32[(nilai << (5 - bit)) & 31];
    return out;
  }

  function b32decode(teks) {
    var s = String(teks).toUpperCase().replace(/[^A-Z2-7]/g, '');
    var out = [], bit = 0, nilai = 0, i, idx;
    for (i = 0; i < s.length; i++) {
      idx = B32.indexOf(s[i]);
      if (idx < 0) continue;
      nilai = (nilai << 5) | idx; bit += 5;
      if (bit >= 8) { out.push((nilai >>> (bit - 8)) & 255); bit -= 8; }
    }
    return out;
  }

  /* ================================================================ TOTP (RFC 6238) */
  var LANGKAH = 30, DIGIT = 6;

  /** Kunci rahasia baru: 20 byte acak → 32 karakter Base32. */
  function rahasiaBaru() { return b32encode(acakByte(20)); }

  /** Kode untuk satu jendela waktu. detik = epoch detik (bawaan: sekarang). */
  function totp(rahasia, detik, geser) {
    var ctr = Math.floor((detik === undefined ? Date.now() / 1000 : detik) / LANGKAH) + (geser || 0);
    var msg = [0, 0, 0, 0, 0, 0, 0, 0], i;
    for (i = 7; i >= 0; i--) { msg[i] = ctr & 255; ctr = Math.floor(ctr / 256); }
    var h = hmacSha1(b32decode(rahasia), msg);
    var off = h[19] & 0x0F;
    var bin = (((h[off] & 0x7F) << 24) | (h[off + 1] << 16) |
               (h[off + 2] << 8) | h[off + 3]) >>> 0;
    var kode = String(bin % Math.pow(10, DIGIT));
    while (kode.length < DIGIT) kode = '0' + kode;
    return kode;
  }

  /**
   * Periksa kode dengan toleransi ±1 jendela (±30 detik), supaya jam ponsel
   * yang meleset sedikit tidak membuat pengguna gagal masuk.
   */
  function periksaTotp(rahasia, kode, toleransi) {
    var t = toleransi === undefined ? 1 : toleransi, i;
    var bersih = String(kode || '').replace(/\D/g, '');
    if (bersih.length !== DIGIT) return false;
    for (i = -t; i <= t; i++) if (totp(rahasia, undefined, i) === bersih) return true;
    return false;
  }

  /** Sisa detik sebelum kode berganti. */
  function sisaDetik() { return LANGKAH - Math.floor((Date.now() / 1000) % LANGKAH); }

  /** URI otpauth:// yang dibaca aplikasi authenticator lewat QR. */
  function uriOtp(rahasia, akun, penerbit) {
    return 'otpauth://totp/' + encodeURIComponent(penerbit + ':' + akun) +
      '?secret=' + rahasia +
      '&issuer=' + encodeURIComponent(penerbit) +
      '&algorithm=SHA1&digits=' + DIGIT + '&period=' + LANGKAH;
  }

  /** Rahasia dipecah per 4 karakter supaya mudah diketik manual. */
  function rapikanRahasia(r) { return String(r).replace(/(.{4})/g, '$1 ').trim(); }

  /* ================================================================ KODE PEMULIHAN */
  var ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   /* tanpa I, O, 0, 1 */

  /** Kode sekali pakai berbentuk XXXX-XXXX. */
  function kodePemulihan() {
    var b = acakByte(8), s = '', i;
    for (i = 0; i < 8; i++) s += ABJAD[b[i] % ABJAD.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }

  function normalKode(k) { return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  return {
    teks2byte: teks2byte, byte2hex: byte2hex, hex2byte: hex2byte, acakByte: acakByte,
    sha1: sha1, hmacSha1: hmacSha1, pbkdf2: pbkdf2,
    turunkan: turunkan, cocok: cocok,
    b32encode: b32encode, b32decode: b32decode,
    rahasiaBaru: rahasiaBaru, totp: totp, periksaTotp: periksaTotp,
    sisaDetik: sisaDetik, uriOtp: uriOtp, rapikanRahasia: rapikanRahasia,
    LANGKAH: LANGKAH, DIGIT: DIGIT,
    kodePemulihan: kodePemulihan, normalKode: normalKode
  };
})();
