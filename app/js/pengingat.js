/* ==========================================================================
   pengingat.js — pengingat pembayaran yang berjalan sendiri
   --------------------------------------------------------------------------
   KENAPA DI SISI APLIKASI, BUKAN DI SERVER

   Basis data aplikasi ini hidup di browser. Server tidak bisa melihat invoice
   siapa pun, jadi tidak ada yang bisa dijadwalkannya. Yang bisa dilakukan
   adalah MENYUSUL: setiap kali aplikasi dibuka, hitung pengingat mana yang
   seharusnya sudah terkirim, lalu kirimkan yang belum.

   Konsekuensinya jujur dan harus dikatakan: pengingat baru berangkat saat ada
   yang membuka aplikasi. Bila tidak ada yang membukanya selama seminggu,
   pengingat seminggu itu berangkat sekaligus pada hari orang membukanya lagi
   — bukan hilang, tetapi juga bukan tepat waktu. Selama admin membuka
   aplikasi tiap hari kerja, hasilnya sama dengan penjadwal sungguhan.

   IDEMPOTEN, ATAU TIDAK USAH SAMA SEKALI

   Tiap pengingat dikunci pada `invoice + tahap`. Membuka aplikasi lima kali
   sehari tidak menghasilkan lima pengingat. Ini bukan penghalusan — pengingat
   pembayaran yang datang berulang-ulang dalam sehari dibaca sebagai tuduhan,
   dan pelanggan yang tersinggung membayar lebih lambat, bukan lebih cepat.

   BERHENTI PADA WAKTUNYA

   Setelah tahap terakhir, sistem berhenti dan menyerahkannya ke manusia.
   Pesan yang terus datang tanpa pernah ada yang menelepon mengajarkan
   pelanggan untuk mengabaikannya — dan sesudah itu tidak ada pesan yang
   masih berguna.
   ========================================================================== */
var PENGINGAT = (function () {
  'use strict';

  /* Tahap dihitung dalam hari relatif terhadap jatuh tempo.
     Negatif = sebelum, 0 = hari-H, positif = sesudah. */
  var TAHAP = [
    { id: 'h-3', hari: -3, nada: 'ramah',
      judul: 'Tiga hari sebelum jatuh tempo' },
    { id: 'h0',  hari: 0,  nada: 'ramah',
      judul: 'Hari jatuh tempo' },
    { id: 'h3',  hari: 3,  nada: 'tegas',
      judul: 'Tiga hari lewat' },
    { id: 'h7',  hari: 7,  nada: 'tegas', terakhir: true,
      judul: 'Tujuh hari lewat — terakhir dari sistem' }
  ];

  var BAWAAN = {
    aktif: false,          /* sengaja mati sampai dinyalakan sendiri */
    lewatEmail: true,
    lewatWA: true,
    /* Pengingat untuk invoice yang jatuh temponya sudah lewat jauh sebelum
       fitur ini dinyalakan tidak perlu diberangkatkan — pelanggan akan
       menerima empat pesan sekaligus tentang tagihan lama. */
    abaikanLebihTuaDariHari: 30
  };

  function config() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.pengingat) { s.pengingat = JSON.parse(JSON.stringify(BAWAAN)); DB.save(); }
    var c = s.pengingat;
    Object.keys(BAWAAN).forEach(function (k) { if (c[k] === undefined) c[k] = BAWAAN[k]; });
    return c;
  }
  function simpanConfig(patch) {
    var c = config();
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    DB.save(true);
    return c;
  }

  /* ============================================================== HITUNGAN */

  function belumLunas(inv) {
    return inv.status !== 'lunas' && inv.status !== 'batal';
  }

  function selisihHari(jatuhTempo) {
    if (!jatuhTempo) return null;
    var t = Date.parse(jatuhTempo + 'T00:00:00');
    if (isNaN(t)) return null;
    var kini = new Date();
    var hariIni = Date.parse(U.iso(kini) + 'T00:00:00');
    return Math.round((hariIni - t) / 86400000);
  }

  /**
   * Tahap yang SEHARUSNYA sudah terkirim untuk satu invoice.
   *
   * Semua tahap yang waktunya sudah lewat ikut, bukan hanya yang persis hari
   * ini — kalau tidak, invoice yang jatuh temponya terlewat saat aplikasi
   * tidak dibuka tidak akan pernah diingatkan sama sekali.
   */
  function tahapJatuh(inv) {
    var d = selisihHari(inv.jatuhTempo);
    if (d === null) return [];
    var c = config();
    if (d > c.abaikanLebihTuaDariHari) return [];
    return TAHAP.filter(function (t) { return d >= t.hari; });
  }

  function sudahDikirim(invId, tahapId, kanal) {
    if (kanal === 'email') {
      return DB.where('emailOutbox', { kunci: 'inv:' + invId + ':pengingat:' + tahapId }).length > 0;
    }
    return DB.where('waOutbox', function (m) {
      return m.refId === invId && m.tahapPengingat === tahapId;
    }).length > 0;
  }

  /** Apa yang akan dikerjakan bila jalan sekarang — tanpa mengirim apa pun. */
  function rencana() {
    var c = config();
    var out = [];
    DB.all('invoices').filter(belumLunas).forEach(function (inv) {
      tahapJatuh(inv).forEach(function (t) {
        var perluEmail = c.lewatEmail && !sudahDikirim(inv.id, t.id, 'email') &&
          !!EMAIL.alamatKlien(inv.clientId);
        var perluWA = c.lewatWA && !sudahDikirim(inv.id, t.id, 'wa');
        if (perluEmail || perluWA) {
          out.push({ invoiceId: inv.id, no: inv.no, clientId: inv.clientId,
                     tahap: t, email: perluEmail, wa: perluWA,
                     tanpaEmail: c.lewatEmail && !EMAIL.alamatKlien(inv.clientId) });
        }
      });
    });
    return out;
  }

  /**
   * Jalankan pengingat yang sudah waktunya.
   *
   * Email masuk kotak keluar dan langsung dikirim (atau ditandai simulasi).
   * WhatsApp hanya DIANTREKAN — pengirimannya tetap lewat kotak keluar yang
   * ditekan manusia, karena itulah cara WhatsApp bekerja di aplikasi ini.
   * Mengantre tanpa mengirim tetap berguna: pesannya sudah tersusun dan
   * tinggal ditekan, bukan harus diingat dan diketik ulang.
   */
  function jalankan(paksa) {
    var c = config();
    if (!c.aktif && !paksa) return Promise.resolve({ dilewati: true, alasan: 'mati' });

    var daftar = rencana();
    var hasil = { email: 0, wa: 0, gagal: 0, tanpaEmail: 0, total: daftar.length };
    var janji = [];

    daftar.forEach(function (r) {
      if (r.tanpaEmail) hasil.tanpaEmail++;

      if (r.wa) {
        var m = WA.enqueue('invoice_jatuh_tempo', r.clientId,
          { invoiceId: r.invoiceId }, { tipe: 'invoice', id: r.invoiceId });
        /* Ditandai tahapnya supaya panggilan berikutnya tahu ini sudah ada.
           Tanpa penanda, tiap pembukaan aplikasi menambah satu antrean baru
           untuk invoice yang sama. */
        DB.update('waOutbox', m.id, { tahapPengingat: r.tahap.id });
        hasil.wa++;
      }

      if (r.email) {
        janji.push(
          EMAIL.kirimInvoice(r.invoiceId, 'pengingat', r.tahap.id)
            .then(function () { hasil.email++; })
            .catch(function () { hasil.gagal++; })
        );
      }
    });

    return Promise.all(janji).then(function () {
      if (hasil.total) {
        DB.log('u_admin', 'Pengingat pembayaran dijalankan — ' + hasil.email + ' email, ' +
          hasil.wa + ' WhatsApp diantrekan', 'invoice', null);
      }
      simpanConfig({ terakhirJalan: U.nowISO() });
      return hasil;
    });
  }

  /**
   * Dipanggil sekali saat aplikasi dibuka.
   *
   * Sengaja tidak menunggu hasilnya dan tidak menampilkan apa pun bila tidak
   * ada yang perlu dikirim — pemberitahuan "0 pengingat dikirim" setiap kali
   * membuka aplikasi hanya melatih orang mengabaikan pemberitahuan.
   */
  function saatBuka() {
    var c = config();
    if (!c.aktif) return;
    /* Ditunda sebentar supaya penggambaran halaman pertama tidak bersaing
       dengan panggilan jaringan. */
    setTimeout(function () {
      jalankan().then(function (h) {
        if (h && !h.dilewati && h.total) {
          UI.toast(I18N.t('Pengingat pembayaran: {e} email terkirim, {w} WhatsApp menunggu di Outbox')
            .replace('{e}', h.email).replace('{w}', h.wa), 'info');
        }
      }).catch(function () { /* kegagalan sudah tercatat pada suratnya */ });
    }, 1500);
  }

  return {
    TAHAP: TAHAP, BAWAAN: BAWAAN,
    config: config, simpanConfig: simpanConfig,
    selisihHari: selisihHari, tahapJatuh: tahapJatuh,
    rencana: rencana, jalankan: jalankan, saatBuka: saatBuka
  };
})();
