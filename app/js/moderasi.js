/* ==========================================================================
   moderasi.js — penyaring isi percakapan
   --------------------------------------------------------------------------
   Tujuannya melindungi klien DAN mitra: klien dari pelecehan dan ancaman,
   mitra dari makian pelanggan yang selama ini tidak pernah tercatat.

   TIGA KEPUTUSAN RANCANGAN YANG PENTING

   1. BERTINGKAT, BUKAN SATU DAFTAR RATA.
      "Ancaman pembunuhan" dan "sialan" tidak setara. Yang BERAT ditolak
      sebelum terkirim; yang RINGAN hanya diperingatkan lalu disensor saat
      ditampilkan. Menyamakan keduanya membuat orang belajar mengabaikan
      peringatan — dan peringatan yang diabaikan tidak melindungi siapa pun.

   2. ANCAMAN DICOCOKKAN SEBAGAI FRASA, BUKAN KATA TUNGGAL.
      Di aplikasi kebersihan, "bunuh" hampir selalu berarti "bunuh kuman",
      dan "bom" berarti "bom asap" untuk fogging. Memblokir kata tunggal akan
      menghalangi percakapan kerja yang wajar setiap hari. Maka yang dicari
      adalah pola berikut sasarannya — "bunuh kamu", "bakar rumahmu" — dan
      frasa kerja yang sah didaftarkan sebagai pengecualian.

   3. PENYAMARAN DIKEJAR SECUKUPNYA.
      "4nj1ng" dan "anjiiiing" ditangkap lewat penormalan yang aman. Bentuk
      "a-n-j-i-n-g" baru dirapatkan bila teksnya MEMANG terlihat sengaja
      dipisah — merapatkan semua teks akan menciptakan tuduhan palsu, karena
      "kan jing" pun ikut menyatu.

   Tim IT dapat menambah kata dan pengecualiannya sendiri lewat halaman
   Moderasi Percakapan; daftar bawaan di bawah hanyalah titik awal.
   ========================================================================== */
var MODERASI = (function () {

  var BAWAAN = {
    mode: 'blokir',      /* blokir | peringatan | mati */
    sensor: true,        /* tutupi kata kasar saat ditampilkan */
    blokirKontak: true,  /* tolak nomor HP / WhatsApp dari klien & mitra */
    tambahan: [],        /* kata tambahan dari tim IT: { kata, kategori } */
    pengecualian: []     /* frasa yang selalu dianggap wajar */
  };

  var KATEGORI = {
    kekerasan: { nama: 'Ancaman & kekerasan', ic: '🔪', tingkat: 'berat',
      k: 'Ancaman melukai, membunuh, atau merusak yang ditujukan kepada seseorang.' },
    terorisme: { nama: 'Terorisme', ic: '💣', tingkat: 'berat',
      k: 'Ajakan atau ancaman peledakan dan teror.' },
    seksual:   { nama: 'Konten seksual (18+)', ic: '🔞', tingkat: 'berat',
      k: 'Kata dan ajakan bermuatan seksual — tidak punya tempat dalam percakapan kerja.' },
    pelecehan: { nama: 'Pelecehan', ic: '🚫', tingkat: 'berat',
      k: 'Rayuan, permintaan foto pribadi, dan tekanan seksual kepada mitra atau klien.' },
    sara:      { nama: 'Hujatan SARA', ic: '⚠️', tingkat: 'berat',
      k: 'Penghinaan atas suku, agama, ras, atau golongan.' },
    makian:    { nama: 'Makian & kata kasar', ic: '🤬', tingkat: 'ringan',
      k: 'Umpatan dan penghinaan pribadi. Diperingatkan dan disensor, tidak diblokir.' },
    kontak:    { nama: 'Nomor HP / WhatsApp', ic: '📵', tingkat: 'berat',
      k: 'Bertukar nomor memindahkan percakapan ke luar aplikasi — di sana tidak ada ' +
         'rekaman, tidak ada perlindungan bagi hasil, dan tidak ada bukti bila terjadi ' +
         'sengketa. Pegawai internal dikecualikan.' }
  };

  /* ================================================================ DAFTAR KATA
     Dicocokkan per kata utuh setelah dinormalkan. Bentuk turunan yang lazim
     ikut didaftarkan karena penormalan tidak menebak morfologi. */

  var KATA_MAKIAN = [
    'anjing', 'anjg', 'anjir', 'anjay', 'asu', 'asyu',
    'bangsat', 'bajingan', 'babi', 'kampret', 'keparat', 'brengsek', 'sialan',
    'jancok', 'jancuk', 'dancok', 'kunyuk', 'monyet', 'tolol', 'goblok', 'geblek',
    'bego', 'dungu', 'idiot', 'sinting', 'bangke', 'bangkai',
    'tai', 'taik', 'tahi', 'sampah', 'kampungan', 'gembel',
    'lonte', 'pelacur', 'sundal', 'jablay', 'perek', 'bispak',
    'bencong', 'banci', 'kanjeng'
  ];

  var KATA_SEKSUAL = [
    'ngentot', 'entot', 'ngewe', 'kontol', 'memek', 'pepek', 'itil',
    'coli', 'colmek', 'bokep', 'sange', 'sangean', 'horny', 'bugil',
    'pelacuran', 'onani', 'masturbasi', 'orgasme', 'threesome'
  ];

  /* Penghinaan yang menyerang identitas. Nama suku, agama, dan ras sendiri
     TIDAK pernah masuk daftar — menandai kata "Cina", "Jawa", atau nama agama
     sebagai pelanggaran justru memperlakukan identitas orang sebagai kotor. */
  var KATA_SARA = [
    'kafirun', 'murtad', 'sesat', 'najis', 'haram jadah', 'anak haram'
  ];

  /* ================================================================ POLA FRASA
     Ancaman baru bermakna ketika ada SASARANNYA. Inilah yang membedakan
     "bunuh kuman di kamar mandi" dari "saya bunuh kamu". */

  var SASARAN = '(kamu|kau|km|lo|lu|elo|elu|anda|dia|kalian|situ|keluargamu|keluarga\\s?(kamu|lo|lu|anda)|anak\\s?(kamu|lo|lu)|istri\\s?(kamu|lo|lu)|suami\\s?(kamu|lo|lu))';

  var POLA = {
    kekerasan: [
      new RegExp('\\b(bunuh|habisi|bacok|tikam|tusuk|gorok|sembelih|hajar|keroyok|tampar|pukul|lempar|bakar)\\s+' + SASARAN + '\\b'),
      new RegExp('\\b(gue|gw|saya|aku|kami)\\s+(akan\\s+)?(bunuh|habisi|bacok|hajar|keroyok|bakar|cari|datangi)\\s+' + SASARAN + '\\b'),
      new RegExp('\\b(mati|modar|mampus|sekarat)\\s+(kamu|kau|lo|lu|elo|elu|anda)\\b'),
      new RegExp('\\b(awas|tunggu)\\s+(saja\\s+)?' + SASARAN + '[^.!?]{0,40}\\b(mati|bunuh|habis|hancur|celaka)\\b'),
      /* Sasarannya wajib disebut. Tanpa syarat itu, "saya datangi kantor klien
         besok" — kalimat kerja yang wajar — ikut tertuduh. */
      new RegExp('\\b(datangi|samperin|sambangi|kejar)\\s+(rumah|kantor|keluarga|alamat)\\s*(mu|kamu|km|lo|lu|elo|anda|kalian)\\b'),
      new RegExp('\\b(bakar|hancurkan|ledakkan|rusak)\\s+(rumah|kantor|toko|mobil|gedung)\\s?(mu|kamu|lo|lu|anda)\\b'),
      new RegExp('\\bjangan\\s+harap\\s+' + SASARAN + '\\s+[^.!?]{0,20}\\b(selamat|hidup|pulang)\\b')
    ],
    terorisme: [
      /\bbom\s+(bunuh\s?diri|molotov|rakitan|waktu)\b/,
      /\b(rakit|pasang|kirim|taruh|meledakkan|ledakkan)\s+(sebuah\s+)?bom\b/,
      /\bledakkan\s+(gedung|kantor|rumah|mal|pasar|sekolah|stasiun)\b/,
      /\bgabung\s+(dengan\s+)?(teroris|kelompok\s+teror)\b/,
      /* Yang dicari adalah NIAT orang pertama. Pola "ancaman teror" tanpa
         pelakunya akan memblokir justru kalimat yang paling harus lolos:
         laporan seorang mitra bahwa ada ancaman teror di gedung klien. */
      /\b(saya|aku|kami|gue|gw)\s+(akan\s+)?(lakukan|lancarkan|kirim)\s+(aksi\s+)?teror\b/
    ],
    pelecehan: [
      /\bkirim(kan)?\s+(foto|video|pic|gambar)\s+(bugil|telanjang|tanpa\s?(baju|busana)|seksi|hot)\b/,
      /\bfoto\s+(kamu|km|lo|lu|anda)\s+(bugil|telanjang|tanpa\s?baju)\b/,
      /\b(mau|bisa)\s+(gak|ga|nggak|tidak)\s+(temani|nemenin|nemani)\s+(saya|aku|gue|gw)\s+(malam|tidur|nginap)/,
      /\bberapa\s+tarif\s?(nya|mu|kamu|lo)\b/,
      /\b(booking|pesan)\s+(kamu|km|lo|lu|orangnya)\s+(semalam|semalaman|buat\s+malam)\b/,
      /\b(buka|lepas)\s+(baju|bajumu|pakaian)\s?(mu|kamu|dong|ya)\b/,
      /\b(mau|ayo)\s+(main|kencan|tidur)\s+(sama|dengan)\s+(saya|aku|gue|gw)\b/
    ]
  };

  /* Frasa kerja yang sah dan mengandung kata bermuatan. Dibuang lebih dulu
     dari teks sebelum pencocokan, sehingga tidak pernah menimbulkan tuduhan. */
  var PENGECUALIAN_BAWAAN = [
    'bunuh kuman', 'membunuh kuman', 'pembunuh kuman', 'bunuh bakteri',
    'membunuh bakteri', 'bunuh jamur', 'membunuh jamur', 'bunuh virus',
    'membunuh virus', 'pembasmi', 'basmi kuman', 'basmi hama', 'basmi rayap',
    'bunuh nyamuk', 'bunuh serangga', 'racun tikus', 'racun serangga',
    'bom asap', 'fogging', 'anti hama',
    'sampah organik', 'sampah anorganik', 'tempat sampah', 'buang sampah',
    'angkut sampah', 'kantong sampah', 'sampah sisa', 'bak sampah',
    'bangkai tikus', 'bangkai hewan',
    'najis hewan', 'membersihkan najis'
  ];

  /* ================================================================ SETELAN */
  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.moderasi) { s.moderasi = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    /* berkas lama mungkin belum punya kunci baru */
    Object.keys(BAWAAN).forEach(function (k) {
      if (s.moderasi[k] === undefined) s.moderasi[k] = JSON.parse(JSON.stringify(BAWAAN[k]));
    });
    return s.moderasi;
  }

  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  function aktif() { return config().mode !== 'mati'; }

  /* ================================================================ PENORMALAN */
  var LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o',
               '5': 's', '$': 's', '7': 't', '9': 'g', '8': 'b' };

  /**
   * Penormalan AMAN: huruf kecil, angka pengganti huruf dikembalikan,
   * huruf berulang ≥3 dipendekkan. Batas kata tetap utuh, sehingga tidak
   * ada dua kata yang tidak sengaja menyatu.
   *
   * Dua kehati-hatian yang wajib ada:
   *
   *   • Simbol `!`, `@`, `$` hanya diterjemahkan bila DIAPIT huruf. Tanpa
   *     syarat itu, "tolol!" menjadi "tololi" dan justru lolos dari daftar —
   *     tanda seru di ujung kalimat malah bekerja sebagai penyamaran.
   *
   *   • Angka hanya diterjemahkan pada kata yang MEMUAT huruf. Kalau tidak,
   *     "Rp 1.250.000" berubah menjadi rangkaian huruf tak berarti dan setiap
   *     nominal berpeluang menabrak daftar kata secara kebetulan.
   */
  function normal(teks) {
    /* Dijalankan dua kali karena pencocokan memakan huruf pengapitnya, sehingga
       rantai seperti "b!b!" perlu putaran kedua. Lookbehind sengaja dihindari:
       peramban lawas menggagalkan SELURUH berkas saat memarsingnya. */
    var t = String(teks || '').toLowerCase();
    for (var i = 0; i < 2; i++) {
      t = t.replace(/([a-z0-9])([!@$])([a-z0-9])/g, function (m, a, s, b) {
        return a + LEET[s] + b; });
    }
    return t
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(function (kata) {
        if (!/[a-z]/.test(kata)) return kata;          /* angka murni dibiarkan */
        return kata.replace(/[43105798]/g, function (c) { return LEET[c] || c; });
      })
      .join(' ')
      .replace(/(.)\1{2,}/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Bentuk rapat, HANYA dipakai bila teksnya memang terlihat sengaja dipisah
   * — yaitu ada rentetan minimal empat huruf tunggal yang dipisah spasi,
   * titik, atau strip. Tanpa syarat ini, "kan jing" akan menyatu menjadi
   * tuduhan palsu.
   */
  function terlihatDisamarkan(teks) {
    return /(?:\b[a-z0-9][\s.\-*_]){3,}[a-z0-9]\b/i.test(String(teks || ''));
  }

  function rapatkan(teks) {
    return normal(teks).replace(/\s+/g, '');
  }

  function daftarPengecualian() {
    return PENGECUALIAN_BAWAAN.concat(
      (config().pengecualian || []).map(function (x) { return String(x); }));
  }

  /** Buang frasa yang sah lebih dulu supaya tidak ikut tertangkap. */
  function tanpaPengecualian(teksNormal) {
    var t = teksNormal;
    daftarPengecualian().forEach(function (frasa) {
      var f = normal(frasa);
      if (!f) return;
      t = t.split(f).join(' ');
    });
    return t;
  }

  /** Gabungan daftar bawaan dan tambahan dari tim IT. */
  function kamus() {
    var k = {
      makian: KATA_MAKIAN.slice(),
      seksual: KATA_SEKSUAL.slice(),
      sara: KATA_SARA.slice()
    };
    (config().tambahan || []).forEach(function (t) {
      var kat = t.kategori && k[t.kategori] ? t.kategori : 'makian';
      if (t.kata) k[kat].push(String(t.kata).toLowerCase());
    });
    return k;
  }

  /* ================================================================ NOMOR KONTAK
     Menahan pertukaran nomor HP/WhatsApp. Bagian tersulitnya BUKAN menemukan
     nomor, melainkan tidak menuduh angka yang sah — percakapan kebersihan
     penuh angka panjang: nominal rupiah, nomor resi pengiriman, nomor
     dokumen, luas ruangan, tanggal. Karena itu tidak dipakai aturan "sembilan
     angka berturut-turut", melainkan BENTUK nomor Indonesia yang khas. */

  /**
   * Kembalikan huruf yang lazim dipakai menyamar angka — tetapi HANYA ketika
   * ia bersebelahan dengan angka. Tanpa syarat itu, kata "oli", "lain", dan
   * "iso" ikut berubah menjadi angka dan seluruh kalimat jadi kacau.
   */
  function bukaSamaran(t) {
    /* MENEMPEL LANGSUNG, tanpa spasi atau tanda pemisah di antaranya.
       Membolehkan pemisah terlihat lebih longgar, tetapi justru merusak:
       "hubungi 0812…" akan berubah menjadi "hubung1 0812…", lalu angka satu
       yang nyasar itu menempel ke nomornya dan bentuknya tidak lagi dikenali
       — nomor yang paling lazim justru lolos. Orang yang menyamarkan nomor
       menulis "o8i2", bukan "o 8 i 2"; bentuk berspasi sudah berupa angka. */
    for (var i = 0; i < 3; i++) {
      t = t.replace(/([0-9])([oil])/g, function (m, a, b) { return a + (b === 'o' ? '0' : '1'); })
           .replace(/([oil])([0-9])/g, function (m, a, b) { return (a === 'o' ? '0' : '1') + b; });
    }
    return t;
  }

  /* Angka yang dieja. "kosong delapan satu dua tiga…" adalah cara paling
     lazim menghindari penyaring angka. */
  var EJAAN = ['nol', 'kosong', 'satu', 'dua', 'tiga', 'empat', 'lima',
               'enam', 'tujuh', 'delapan', 'sembilan', 'sanga'];

  /* Tautannya diambil utuh, bukan sepotong — yang tercatat di catatan
     pelanggaran harus bisa dibaca admin apa adanya. */
  var POLA_WA = [
    /\bwa\.me\/[\w+]+/i,
    /\bapi\.whatsapp\.com\/\S*/i,
    /\bchat\.whatsapp\.com\/\S*/i,
    /\bt\.me\/\S+/i,
    /\bwhatsapp:\/\/\S+/i
  ];

  /**
   * → [{ kata, kategori:'kontak', jenis }]
   *
   * Bentuk yang ditolak (setelah pemisah dibuang):
   *   628XXXXXXXXX   nomor seluler dengan kode negara
   *   08XXXXXXXXXX   nomor seluler
   *   8XXXXXXXXXX    nomor seluler tanpa angka nol di depan
   *   0XXXXXXXXXX    nomor telepon lain, termasuk telepon rumah
   *
   * Nominal rupiah tidak pernah diawali angka nol, dan nomor dokumen di
   * aplikasi ini terlalu pendek — dua sifat itulah yang dipakai membedakan.
   */
  function deteksiKontak(teks) {
    var asli = String(teks || '');
    var t = bukaSamaran(asli.toLowerCase());
    var temuan = [];

    /* --- tautan WhatsApp/Telegram --- */
    POLA_WA.forEach(function (re) {
      var m = asli.match(re);
      if (m) temuan.push({ kata: m[0], kategori: 'kontak', jenis: 'tautan' });
    });

    /* --- rangkaian angka --- */
    var re = /\+?\d[\d\s().\-]{5,}\d/g, m;
    while ((m = re.exec(t)) !== null) {
      var potong = m[0];
      var d = potong.replace(/\D/g, '');
      var sebelum = t.slice(Math.max(0, m.index - 16), m.index);

      var seluler = /^628\d{7,10}$/.test(d) || /^08\d{8,11}$/.test(d) ||
        (/^8\d{9,11}$/.test(d) && !/\b(rp|idr)\s*$/.test(sebelum));
      var lokal = !seluler && /^0\d{8,11}$/.test(d) &&
        !/\b(resi|awb|tracking|no\.?\s?resi)\b[^\d]{0,10}$/.test(sebelum);

      if (seluler || lokal) {
        temuan.push({ kata: potong.trim(), kategori: 'kontak',
                      jenis: seluler ? 'seluler' : 'telepon' });
      }
    }

    /* --- angka yang dieja --- */
    var kata = t.replace(/[^a-z\s]/g, ' ').split(/\s+/);
    var beruntun = 0, mulai = 0;
    for (var i = 0; i <= kata.length; i++) {
      if (i < kata.length && EJAAN.indexOf(kata[i]) >= 0) {
        if (beruntun === 0) mulai = i;
        beruntun++;
      } else {
        /* Tujuh angka berturut-turut sudah jauh di luar kebiasaan bicara —
           "dua tiga" atau "lima enam" masih wajar, "kosong delapan satu dua
           tiga empat lima" jelas sedang mengeja nomor. */
        if (beruntun >= 7) {
          temuan.push({ kata: kata.slice(mulai, i).join(' '),
                        kategori: 'kontak', jenis: 'dieja' });
        }
        beruntun = 0;
      }
    }

    return temuan;
  }

  /** Pegawai internal boleh berbagi nomor — merekalah kanal resminya. */
  function bolehBagikanKontak(user) {
    return !!user && ['admin', 'supervisor'].indexOf(user.role) >= 0;
  }

  /* ================================================================ PEMERIKSAAN */
  /**
   * Periksa satu teks.
   * → { aman, tingkat: 'aman'|'ringan'|'berat', temuan: [{kata, kategori}] }
   */
  function periksa(teks) {
    var kosong = { aman: true, tingkat: 'aman', temuan: [], kategori: [] };
    if (!aktif() || !teks) return kosong;

    var bersih = tanpaPengecualian(normal(teks));
    var rapat = terlihatDisamarkan(teks) ? tanpaPengecualian(rapatkan(teks)) : null;
    var temuan = [];

    /* --- nomor HP / WhatsApp ---
       Diperiksa pada teks ASLI, bukan hasil normal(): penormalan memetakan
       angka menjadi huruf pada kata yang berhuruf, sehingga nomor justru
       lenyap sebelum sempat diperiksa. */
    if (config().blokirKontak !== false) {
      deteksiKontak(teks).forEach(function (k) { temuan.push(k); });
    }

    /* --- frasa berat --- */
    Object.keys(POLA).forEach(function (kat) {
      POLA[kat].forEach(function (re) {
        var m = bersih.match(re);
        if (m) temuan.push({ kata: m[0].trim(), kategori: kat });
      });
    });

    /* --- kata per kategori --- */
    var kata = bersih.split(' ');
    var kmus = kamus();
    Object.keys(kmus).forEach(function (kat) {
      kmus[kat].forEach(function (k) {
        var kn = normal(k);
        if (!kn) return;
        var ketemu = kn.indexOf(' ') >= 0
          ? bersih.indexOf(kn) >= 0                                   /* frasa */
          : kata.indexOf(kn) >= 0                                     /* kata utuh */
            || (rapat !== null && rapat.indexOf(kn) >= 0);            /* bentuk disamarkan */
        if (ketemu) temuan.push({ kata: k, kategori: kat });
      });
    });

    if (!temuan.length) return kosong;

    /* buang duplikat kata yang sama */
    var unik = [], lihat = {};
    temuan.forEach(function (t) {
      var kunci = t.kategori + '|' + t.kata;
      if (!lihat[kunci]) { lihat[kunci] = 1; unik.push(t); }
    });

    var berat = unik.some(function (t) { return KATEGORI[t.kategori].tingkat === 'berat'; });
    return {
      aman: false,
      tingkat: berat ? 'berat' : 'ringan',
      temuan: unik,
      kategori: Array.from(new Set(unik.map(function (t) { return t.kategori; })))
    };
  }

  /**
   * Buang temuan yang tidak berlaku bagi pengirim ini.
   *
   * Supervisor yang membagikan nomor hotline resmi bukan pelanggaran, jadi
   * temuannya dibuang SEJAK AWAL — bukan sekadar tidak diblokir. Kalau hanya
   * pemblokirannya yang dilonggarkan, pesannya tetap tertandai, tetap
   * tercatat sebagai pelanggaran, dan nomornya tetap tersensor di layar
   * penerima — sehingga izinnya tidak ada gunanya.
   */
  function saring(hasil, user) {
    if (hasil.aman || !bolehBagikanKontak(user)) return hasil;
    var temuan = hasil.temuan.filter(function (t) { return t.kategori !== 'kontak'; });
    if (!temuan.length) return { aman: true, tingkat: 'aman', temuan: [], kategori: [] };
    var kategori = Array.from(new Set(temuan.map(function (t) { return t.kategori; })));
    return {
      aman: false,
      tingkat: kategori.some(function (k) { return KATEGORI[k].tingkat === 'berat'; })
        ? 'berat' : 'ringan',
      temuan: temuan, kategori: kategori
    };
  }

  /** Apakah pesan ini harus DITOLAK, bukan sekadar diperingatkan. */
  function harusDiblokir(hasil, user) {
    if (config().mode !== 'blokir') return false;
    return saring(hasil, user).tingkat === 'berat';
  }

  /** Kalimat penjelas untuk pengirim — menyebut sebabnya, bukan sekadar "ditolak". */
  function alasan(hasil) {
    var nama = hasil.kategori.map(function (k) { return KATEGORI[k].nama; }).join(', ');
    if (hasil.kategori.length === 1 && hasil.kategori[0] === 'kontak') {
      return I18N.t('Pesan tidak dapat dikirim karena memuat nomor HP atau WhatsApp.') + ' ' +
        I18N.t('Seluruh percakapan sengaja dijaga tetap di dalam aplikasi: di sinilah') + ' ' +
        I18N.t('riwayatnya tersimpan, pembayarannya terlindungi, dan buktinya ada bila') + ' ' +
        I18N.t('terjadi masalah. Untuk urusan yang butuh telepon, hubungi admin EXOCLEAN.');
    }
    return I18N.t('Pesan tidak dapat dikirim karena memuat') + ' ' + nama.toLowerCase() + '. ' +
      I18N.t('Aturan ini melindungi klien maupun mitra. Bila Anda merasa ini keliru,') + ' ' +
      I18N.t('hubungi admin — setiap penolakan tercatat dan dapat ditinjau.');
  }

  /* ================================================================ SENSOR */
  /**
   * Tutupi kata kasar saat DITAMPILKAN. Yang tersimpan tetap teks aslinya:
   * kalau yang disimpan sudah disensor, bukti untuk penyelesaian sengketa
   * ikut hilang. Yang berhak melihat versi utuh hanya pemegang izin moderasi.
   */
  function sensor(teks, paksa, pengirim) {
    var c = config();
    if (!aktif() || (!c.sensor && !paksa)) return teks;
    var hasil = saring(periksa(teks), pengirim);
    if (hasil.aman) return teks;

    var kataSalah = {};
    var out = String(teks);

    hasil.temuan.forEach(function (t) {
      /* Nomor ditutup dengan penggantian langsung: bentuknya penuh pemisah,
         sehingga tidak pernah cocok bila dicari sebagai kata utuh. */
      if (t.kategori === 'kontak') {
        if (t.kata) out = out.split(t.kata).join('●●●●●●●●●●');
        return;
      }
      if (KATEGORI[t.kategori].tingkat === 'berat' || t.kategori === 'makian') {
        normal(t.kata).split(' ').forEach(function (w) { if (w) kataSalah[w] = 1; });
      }
    });

    return out.split(/(\s+)/).map(function (potong) {
      if (/^\s+$/.test(potong)) return potong;
      /* Tanda baca di ujung dipisahkan dulu supaya "anjing." tidak berubah
         menjadi "a●●●●●●" yang menelan titiknya dan merusak kalimat. */
      var m = potong.match(/^([^\wÀ-ÿ]*)(.*?)([^\wÀ-ÿ]*)$/);
      var depan = m[1], inti = m[2], belakang = m[3];
      if (!inti || !kataSalah[normal(inti)]) return potong;
      return depan + inti.charAt(0) + Array(inti.length).join('●') + belakang;
    }).join('');
  }

  /* ================================================================ CATATAN */
  /**
   * Setiap temuan dicatat — termasuk yang hanya diperingatkan lalu tetap
   * dikirim. Pola perilaku baru terlihat dari rekaman, bukan dari satu pesan.
   */
  function catat(user, konteks, refId, teks, hasil, tindakan) {
    return DB.insert('moderasiLog', {
      userId: user ? user.id : null,
      konteks: konteks, refId: refId,
      tingkat: hasil.tingkat,
      kategori: hasil.kategori,
      kata: hasil.temuan.map(function (t) { return t.kata; }),
      cuplikan: U.potong(String(teks || ''), 220),
      tindakan: tindakan,        /* 'diblokir' | 'diperingatkan' */
      ditinjau: false
    });
  }

  /** Riwayat pelanggaran seorang pengguna, terbaru dulu. */
  function riwayat(userId) {
    return U.sortBy(DB.where('moderasiLog', function (l) { return l.userId === userId; }),
      function (l) { return l.createdAt; }, true);
  }

  function ringkasan() {
    var semua = DB.all('moderasiLog');
    var perOrang = {};
    semua.forEach(function (l) { perOrang[l.userId] = (perOrang[l.userId] || 0) + 1; });
    return {
      total: semua.length,
      diblokir: semua.filter(function (l) { return l.tindakan === 'diblokir'; }).length,
      berat: semua.filter(function (l) { return l.tingkat === 'berat'; }).length,
      belumDitinjau: semua.filter(function (l) { return !l.ditinjau; }).length,
      pelanggarTerbanyak: Object.keys(perOrang).sort(function (a, b) {
        return perOrang[b] - perOrang[a]; }).slice(0, 5)
        .map(function (id) { return { userId: id, n: perOrang[id] }; })
    };
  }

  return {
    BAWAAN: BAWAAN, KATEGORI: KATEGORI, PENGECUALIAN_BAWAAN: PENGECUALIAN_BAWAAN,
    config: config, simpanConfig: simpanConfig, aktif: aktif,
    kamus: kamus, daftarPengecualian: daftarPengecualian,
    normal: normal, periksa: periksa, harusDiblokir: harusDiblokir, alasan: alasan,
    deteksiKontak: deteksiKontak, bolehBagikanKontak: bolehBagikanKontak, saring: saring,
    sensor: sensor, catat: catat, riwayat: riwayat, ringkasan: ringkasan
  };
})();
