/* ==========================================================================
   chat.js — obrolan dalam aplikasi antara CLIENT dan MITRA
   --------------------------------------------------------------------------
   Sebelum berkas ini ada, satu-satunya "chat" di EXOCLEAN adalah WA.chat()
   yang membuka wa.me — pesannya keluar dari aplikasi dan tidak tersimpan di
   mana pun, dan klien pun hanya punya tombol ke ADMIN, bukan ke mitra yang
   mengerjakan. Modul ini menggantinya dengan obrolan yang:

     • tersimpan permanen di DB, jadi bisa dibuka lagi kapan saja,
     • selalu terikat pada satu pekerjaan atau satu pesanan toko, sehingga
       jelas siapa boleh bicara dengan siapa dan tentang apa,
     • tidak pernah menampilkan nomor telepon lawan bicara.

   RUANG TIDAK DISIMPAN. Peserta obrolan diturunkan dari dokumen induknya
   (orders / shopOrders) setiap kali dibaca. Alasannya sama dengan status
   kompetensi dan saldo dompet di aplikasi ini: begitu penugasan berubah,
   daftar peserta ikut berubah tanpa perlu disinkronkan — dan mitra yang
   dicabut dari sebuah pekerjaan langsung kehilangan akses ke riwayatnya.
   Yang disimpan hanyalah pesannya sendiri.
   ========================================================================== */
var CHAT = (function () {

  var T = function (s) { return I18N.t(s); };

  /* Berapa lama obrolan masih boleh diisi setelah pekerjaannya tuntas.
     Klien sering baru menyadari ada yang terlewat sehari-dua hari kemudian,
     jadi ruang tidak langsung dikunci begitu status berubah "selesai". */
  var HARI_ARSIP = 14;

  /* ================================================================ KONTEKS */
  /**
   * Dua jenis obrolan, keduanya memakai tabel pesan yang sama:
   *   'order' → pekerjaan jasa : klien ↔ mitra lapangan (+ supervisor)
   *   'toko'  → pesanan toko   : klien ↔ mitra toko (penjual)
   */
  var KONTEKS = {
    order: {
      label: 'Pekerjaan', ic: '🧹', tabel: 'orders',
      peserta: function (o) {
        return [o.clientId]
          .concat(o.workerIds || [])
          .concat(o.supervisorId ? [o.supervisorId] : []);
      },
      judul: function (o) { return o.judul || 'Pekerjaan'; },
      no: function (o) { return o.no; },
      sub: function (o) {
        return U.tglPendek(o.tgl) + ' • ' + (o.mulai || '') +
          (o.selesai ? '–' + o.selesai : '');
      },
      /* Selesai bila pekerjaannya sudah diverifikasi atau dibatalkan. */
      tuntasAt: function (o) {
        if (o.status === 'diverifikasi' || o.status === 'dibatalkan') {
          return o.selesaiAktual || o.updatedAt || o.createdAt;
        }
        return null;
      }
    },
    toko: {
      label: 'Pesanan toko', ic: '🛒', tabel: 'shopOrders',
      peserta: function (so) {
        /* sellerId kosong berarti Toko Resmi EXOCLEAN — yang melayani admin. */
        var lawan = so.sellerId ? [so.sellerId]
          : BIZ.usersByRole('admin').map(function (a) { return a.id; });
        return [so.clientId].concat(lawan);
      },
      judul: function (so) {
        return so.sellerId ? SELLER.namaToko(so.sellerId) : T('Toko Resmi EXOCLEAN');
      },
      no: function (so) { return so.no; },
      sub: function (so) { return (so.items || []).length + ' ' + T('barang') + ' • ' + U.rp(so.total); },
      tuntasAt: function (so) {
        if (so.status === 'selesai' || so.status === 'dibatalkan') {
          return so.updatedAt || so.createdAt;
        }
        return null;
      }
    }
  };

  function dok(konteks, refId) {
    var k = KONTEKS[konteks];
    return k ? DB.find(k.tabel, refId) : null;
  }

  /* ================================================================ RUANG */
  /**
   * Gambaran satu ruang obrolan, dihitung dari dokumen induknya.
   * Mengembalikan null bila dokumennya tidak ada lagi.
   */
  function ruang(konteks, refId) {
    var k = KONTEKS[konteks];
    var d = dok(konteks, refId);
    if (!k || !d) return null;

    var tuntas = k.tuntasAt(d);
    var arsip = false;
    /* diffDays(a, b) = a − b. Hari ini dikurangi hari selesai, bukan
       sebaliknya — terbalik akan menghasilkan angka negatif dan ruang tidak
       pernah diarsipkan. */
    if (tuntas) arsip = U.diffDays(U.today(), U.iso(tuntas)) >= HARI_ARSIP;

    var ps = pesan(konteks, refId);
    var akhir = ps.length ? ps[ps.length - 1] : null;

    return {
      konteks: konteks, refId: refId, ic: k.ic, jenis: k.label,
      no: k.no(d), judul: k.judul(d), sub: k.sub(d),
      pesertaIds: k.peserta(d).filter(Boolean),
      status: arsip ? 'arsip' : 'aktif',
      tuntasAt: tuntas,
      jumlah: ps.length,
      terakhir: akhir,
      terakhirAt: akhir ? akhir.createdAt : d.createdAt
    };
  }

  /** Apakah pengguna ini termasuk peserta ruang tersebut. */
  function peserta(user, r) {
    return !!user && !!r && r.pesertaIds.indexOf(user.id) >= 0;
  }

  /**
   * Boleh membaca? Peserta selalu boleh. Di luar itu hanya pemegang izin
   * pengawasan — obrolan klien-mitra adalah bukti bila terjadi sengketa,
   * jadi admin perlu bisa membacanya, tetapi tidak diam-diam: setiap
   * pembacaan oleh non-peserta dicatat di log aktivitas.
   */
  function bolehBaca(user, r) {
    if (peserta(user, r)) return true;
    /* AKSES.boleh(izinId, user) — izinnya lebih dulu, bukan penggunanya. */
    return !!user && AKSES.boleh('komunikasi.chat.awasi', user);
  }

  /** Boleh menulis? Hanya peserta, dan hanya selama ruang belum diarsipkan. */
  /* ============================================ JENDELA MENULIS MITRA
     Mitra lapangan hanya boleh menulis selama pekerjaannya BERJALAN.

     Jendelanya dibuka saat ia ditugaskan ke sebuah order, dan ditutup
     begitu pekerjaan itu selesai. Di luar rentang tersebut tidak ada alasan
     kerja untuk menghubungi klien — dan hubungan yang berlanjut sesudahnya
     berada di luar pengawasan perusahaan: tidak ada order yang mencatatnya,
     tidak ada supervisor yang melihatnya, dan bila terjadi sesuatu tidak ada
     jejak yang bisa ditelusuri.

     'perbaikan' IKUT dibuka. Pekerjaan yang gagal QC harus dikerjakan ulang,
     dan mitra yang tidak bisa menghubungi klien untuk mengatur waktu masuk
     kembali hanya akan memindahkan pekerjaan itu ke meja admin.

     Yang ditutup hanya MENULIS. Riwayatnya tetap terbaca oleh semua peserta:
     bila kemudian ada komplain, percakapan itulah bukti apa yang dijanjikan
     kepada klien. Menghapusnya berarti menghilangkan barang bukti dari pihak
     yang paling mungkin membutuhkannya. */
  var STATUS_MITRA_TULIS = ['dijadwalkan', 'berjalan', 'perbaikan'];

  /**
   * Alasan sebuah ruang terkunci untuk pengguna ini, atau null bila boleh
   * menulis. Mengembalikan alasan — bukan sekadar true/false — supaya layar
   * bisa menjelaskan MENGAPA kotak ketiknya hilang. Kotak yang lenyap tanpa
   * keterangan selalu dibaca sebagai aplikasi rusak.
   */
  function kunciTulis(user, r) {
    if (!peserta(user, r)) return { sebab: 'bukan-peserta' };
    if (r.status !== 'aktif') return { sebab: 'arsip' };

    /* Hanya berlaku untuk mitra lapangan pada obrolan pekerjaan. Klien dan
       supervisor tetap bisa menulis sampai ruangnya diarsipkan — klien perlu
       jalan mengadu setelah pekerjaan tuntas, dan yang menerima aduan itu
       supervisornya, bukan lagi mitra yang sudah pulang. */
    if (r.konteks !== 'order' || peranDi(user.id, r) !== 'mitra') return null;

    var o = dok('order', r.refId);
    if (!o) return { sebab: 'order-hilang' };
    if (STATUS_MITRA_TULIS.indexOf(o.status) >= 0) return null;
    return { sebab: 'pekerjaan-tuntas', status: o.status };
  }

  function bolehTulis(user, r) { return !kunciTulis(user, r); }

  /**
   * Peran seseorang DI DALAM ruang — bukan persona aplikasinya.
   * Dipakai untuk memilih kumpulan template dan menata gelembung pesan.
   */
  function peranDi(userId, r) {
    var d = dok(r.konteks, r.refId);
    if (!d) return 'lain';
    if (d.clientId === userId) return 'client';
    if (r.konteks === 'order' && d.supervisorId === userId) return 'supervisor';
    return 'mitra';
  }

  /** Nama yang ditampilkan untuk lawan bicara (tanpa nomor telepon). */
  function lawanBicara(user, r) {
    return r.pesertaIds.filter(function (id) { return id !== user.id; })
      .map(function (id) { return BIZ.user(id); })
      .filter(Boolean);
  }

  /* ================================================================ DAFTAR */
  /**
   * Semua ruang yang boleh dibuka pengguna, terbaru di atas.
   * Untuk pengawas (admin) daftarnya dibatasi ke ruang yang sudah ada
   * pesannya — ruang kosong tidak menarik dan jumlahnya bisa ribuan.
   */
  function ruangUntuk(user) {
    if (!user) return [];
    var hasil = [];

    Object.keys(KONTEKS).forEach(function (konteks) {
      DB.all(KONTEKS[konteks].tabel).forEach(function (d) {
        var r = ruang(konteks, d.id);
        if (!r) return;
        /* Ruang yang sudah diarsipkan DAN tidak pernah berisi pesan tidak
           ditampilkan: tidak ada yang bisa dibaca dan tidak bisa diisi lagi,
           jadi ia hanya memanjangkan daftar. Yang masih aktif tetap muncul
           meski kosong — di situlah percakapan dimulai. */
        if (r.status === 'arsip' && r.jumlah === 0) return;
        if (peserta(user, r)) hasil.push(r);
        else if (AKSES.boleh('komunikasi.chat.awasi', user) && r.jumlah > 0) hasil.push(r);
      });
    });

    return hasil.sort(function (a, b) {
      /* yang punya pesan belum dibaca naik lebih dulu, sisanya menurut waktu */
      var ua = belumDibacaRuang(user, a), ub = belumDibacaRuang(user, b);
      if (!!ua !== !!ub) return ua ? -1 : 1;
      return a.terakhirAt < b.terakhirAt ? 1 : -1;
    });
  }

  /* ================================================================ PENCARIAN */
  /**
   * Normalisasi untuk pencocokan: huruf kecil, tanda baca dan pemisah dokumen
   * dibuang. Tanpa ini, mengetik "EXO/ORD/2026/0021" tidak akan cocok dengan
   * "exo ord 2026 0021", dan mencari "0021" saja pun gagal — padahal itulah
   * cara orang benar-benar mengetik nomor dokumen ketika terburu-buru.
   */
  function normal(s) {
    return String(s || '').toLowerCase().replace(/[\/\-_.,()]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Cari ruang berdasarkan kata kunci, mencakup empat sumber sekaligus:
   * nama peserta, nomor dokumen, judul pekerjaan/toko, dan ISI PESAN
   * (termasuk nama berkas lampiran). Semua kata harus cocok, tetapi boleh
   * tersebar di sumber yang berbeda — mengetik "budi karpet" menemukan
   * percakapan Budi tentang pekerjaan karpet tanpa perlu tahu nomornya.
   *
   * `filter` opsional: { jenis: 'order'|'toko', status: 'aktif'|'arsip',
   *                      lampiran: true, belum: true }
   */
  function cari(user, kueri, filter) {
    filter = filter || {};
    var kata = normal(kueri).split(' ').filter(Boolean);

    return ruangUntuk(user).map(function (r) {
      if (filter.jenis && r.konteks !== filter.jenis) return null;
      if (filter.status && r.status !== filter.status) return null;

      var ps = pesan(r.konteks, r.refId);
      var namaPeserta = r.pesertaIds.map(function (id) { return BIZ.nama(id); }).join(' ');
      var berkas = ps.reduce(function (a, m) {
        return a.concat((m.lampiran || []).map(function (l) { return l.nama; })); }, []);

      if (filter.lampiran && !berkas.length) return null;
      if (filter.belum && !belumDibacaRuang(user, r)) return null;

      var ladang = normal([namaPeserta, r.no, r.judul, r.jenis].join(' '));
      var teksPesan = ps.map(function (m) { return m.isi; }).join(' \n ');
      var ladangPesan = normal(teksPesan + ' ' + berkas.join(' '));

      /* Setiap kata harus muncul di salah satu ladang. */
      var semuaCocok = kata.every(function (k) {
        return ladang.indexOf(k) >= 0 || ladangPesan.indexOf(k) >= 0;
      });
      if (!semuaCocok) return null;

      /* Pesan yang benar-benar memuat salah satu kata, untuk ditampilkan
         sebagai cuplikan — tanpa ini pengguna melihat hasil tanpa tahu
         mengapa ia muncul. */
      var cuplikan = [];
      if (kata.length) {
        ps.forEach(function (m) {
          var isi = normal((m.isi || '') + ' ' +
            (m.lampiran || []).map(function (l) { return l.nama; }).join(' '));
          if (kata.some(function (k) { return isi.indexOf(k) >= 0; })) cuplikan.push(m);
        });
      }

      return { ruang: r, kata: kata, cuplikan: cuplikan.slice(-3),
               jumlahCocok: cuplikan.length, berkas: berkas.length };
    }).filter(Boolean);
  }

  /** Angka ringkas untuk kepala halaman pencarian admin. */
  function statistik(user) {
    var rs = ruangUntuk(user);
    var pesanTotal = 0, lampiranTotal = 0;
    rs.forEach(function (r) {
      pesan(r.konteks, r.refId).forEach(function (m) {
        pesanTotal++; lampiranTotal += (m.lampiran || []).length;
      });
    });
    return {
      ruang: rs.length,
      aktif: rs.filter(function (r) { return r.status === 'aktif'; }).length,
      arsip: rs.filter(function (r) { return r.status === 'arsip'; }).length,
      pesan: pesanTotal, lampiran: lampiranTotal
    };
  }

  /* ================================================================ PESAN */
  function pesan(konteks, refId) {
    return U.sortBy(
      DB.where('chatPesan', function (m) {
        return m.konteks === konteks && m.refId === refId;
      }),
      function (m) { return m.createdAt; }
    );
  }

  /**
   * Kirim satu pesan. Pengirim otomatis dianggap sudah membacanya sendiri.
   * tplKey diisi bila pesannya lahir dari template — berguna untuk tahu
   * template mana yang benar-benar terpakai saat menyusun ulang daftarnya.
   */
  function kirim(user, konteks, refId, isi, tplKey, lampiran) {
    var r = ruang(konteks, refId);
    if (!r) throw new Error(T('Ruang obrolan tidak ditemukan'));
    /* Sebabnya diambil dari kunciTulis(), bukan ditebak ulang di sini. Kalau
       ditebak, mitra yang jendela menulisnya sudah tertutup akan menerima
       "Anda bukan peserta obrolan ini" — keterangan yang keliru, dan yang
       membuat orang mengira haknya dicabut, bukan pekerjaannya yang selesai. */
    var kunci = kunciTulis(user, r);
    if (kunci) {
      throw new Error(
        kunci.sebab === 'arsip'
          ? T('Obrolan ini sudah diarsipkan dan tidak bisa diisi lagi.')
        : kunci.sebab === 'pekerjaan-tuntas'
          ? T('Pekerjaan ini sudah selesai, jadi obrolannya ditutup.') + ' ' +
            T('Bila masih ada yang perlu disampaikan, hubungi supervisor Anda.')
        : kunci.sebab === 'order-hilang'
          ? T('Data pekerjaannya tidak ditemukan lagi.')
          : T('Anda bukan peserta obrolan ini.'));
    }
    var teks = String(isi || '').trim();
    var lam = (lampiran || []).slice(0, BERKAS.BATAS.perPesan);
    /* Pesan boleh berisi teks saja, lampiran saja, atau keduanya — mengirim
       foto tanpa keterangan adalah hal yang paling sering dilakukan. */
    if (!teks && !lam.length) throw new Error(T('Pesan masih kosong'));
    if (teks.length > 2000) teks = teks.slice(0, 2000);

    /* Penyaringan isi dipasang DI SINI, bukan di tampilan. Ini satu-satunya
       jalan masuk pesan ke basis data, sehingga tombol atau jalur lain yang
       ditambahkan kelak tetap ikut terjaga tanpa harus diingat. */
    var moderasi = MODERASI.saring(MODERASI.periksa(teks), user);
    if (!moderasi.aman) {
      var diblokir = MODERASI.harusDiblokir(moderasi, user);
      MODERASI.catat(user, konteks, refId, teks, moderasi,
        diblokir ? 'diblokir' : 'diperingatkan');
      if (diblokir) {
        var e = new Error(MODERASI.alasan(moderasi));
        e.moderasi = moderasi;
        throw e;
      }
    }

    var m = DB.insert('chatPesan', {
      konteks: konteks, refId: refId, dari: user.id,
      peran: peranDi(user.id, r),
      isi: teks, tplKey: tplKey || null,
      lampiran: lam,
      /* Ditandai agar tampilan tahu harus menyensor, tanpa perlu memeriksa
         ulang setiap kali pesan digambar. */
      ditandai: moderasi.aman ? null : { tingkat: moderasi.tingkat, kategori: moderasi.kategori },
      dibacaOleh: [user.id]
    });
    DB.log(user.id, 'chat.kirim', konteks, refId,
      U.potong(teks || '(' + lam.length + ' lampiran)', 60));
    return m;
  }

  /** Satu baris ringkas sebuah pesan, untuk pratinjau di daftar ruang. */
  function ringkas(m) {
    if (!m) return '';
    var lam = m.lampiran || [];
    if (m.isi) return m.isi;
    if (!lam.length) return '';
    if (lam.length > 1) return '📎 ' + lam.length + ' lampiran';
    return BERKAS.ikon(lam[0]) + ' ' +
      (lam[0].jenis === 'foto' ? 'Foto' : lam[0].jenis === 'video' ? 'Video' : lam[0].nama);
  }

  /** Tandai seluruh pesan di satu ruang sudah dibaca oleh pengguna ini. */
  function tandaiDibaca(user, konteks, refId) {
    if (!user) return 0;
    var n = 0;
    pesan(konteks, refId).forEach(function (m) {
      if ((m.dibacaOleh || []).indexOf(user.id) < 0) {
        DB.update('chatPesan', m.id, { dibacaOleh: (m.dibacaOleh || []).concat([user.id]) });
        n++;
      }
    });
    return n;
  }

  /** Pesan orang lain yang belum dibaca pengguna ini, dalam satu ruang. */
  function belumDibacaRuang(user, r) {
    if (!user || !peserta(user, r)) return 0;
    return pesan(r.konteks, r.refId).filter(function (m) {
      return m.dari !== user.id && (m.dibacaOleh || []).indexOf(user.id) < 0;
    }).length;
  }

  /** Total pesan belum dibaca di seluruh ruang — dipakai untuk lencana menu. */
  function belumDibaca(user) {
    if (!user) return 0;
    var total = 0;
    DB.all('chatPesan').forEach(function (m) {
      if (m.dari === user.id) return;
      if ((m.dibacaOleh || []).indexOf(user.id) >= 0) return;
      var r = ruang(m.konteks, m.refId);
      if (r && peserta(user, r)) total++;
    });
    return total;
  }

  /* ================================================================ KEAMANAN ISI */
  /**
   * Menandai isi pesan yang sebaiknya tidak dikirim: nomor telepon, tautan,
   * dan ajakan bertransaksi di luar aplikasi. Fungsi ini hanya MEMPERINGATKAN,
   * tidak memblokir — memblokir kalimat yang sah lebih merugikan daripada
   * sesekali kebobolan, dan penilaian akhirnya tetap pada manusia. Yang
   * dilindungi di sini adalah kedua pihak sekaligus: klien dari penipuan
   * pembayaran di luar sistem, mitra dari kehilangan jaminan dan bagi hasil.
   */
  function periksaIsi(teks) {
    var t = String(teks || '');
    var peringatan = [];
    /* Nomor telepon TIDAK diperiksa di sini lagi. Sejak MODERASI menolaknya
       langsung, memperingatkannya di sini hanya memunculkan dua pesan yang
       mengatakan hal berbeda tentang kejadian yang sama. */
    if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|id|net|co|xyz|link|me)\b)/i.test(t)) {
      peringatan.push(T('Pesan ini memuat tautan.'));
    }
    if (/\b(transfer|tf|dp|bayar|rekening|no\.?\s?rek|dana|ovo|gopay|shopeepay|cash|tunai)\b/i.test(t) &&
        /\b(langsung|luar|pribadi|japri|di ?luar aplikasi)\b/i.test(t)) {
      peringatan.push(T('Pesan ini terbaca seperti ajakan bertransaksi di luar aplikasi.'));
    }
    return peringatan;
  }

  /* ================================================================ TEMPLATE
     Kalimat yang paling sering dibutuhkan di lapangan, siap pakai dan bisa
     disunting sebelum dikirim. Disusun menurut URUTAN WAKTU sebuah pekerjaan
     (sebelum datang → di lokasi → setelah selesai), karena begitulah orang
     mencarinya: bukan "template nomor 7", melainkan "yang saya butuhkan
     sekarang". Setiap teks menerima konteks berisi nama, jam, tanggal, dan
     alamat sehingga tidak perlu diketik ulang.

     Nada bahasanya sengaja sopan tetapi ringkas — dibaca di layar ponsel,
     sering sambil bekerja, dan sering oleh orang yang tidak saling kenal. */

  function ctxRuang(user, r) {
    var d = dok(r.konteks, r.refId) || {};
    var lawan = lawanBicara(user, r);
    var sapaan = lawan.length === 1 ? panggil(lawan[0]) : 'Bapak/Ibu';
    return {
      saya: user.nama,
      sapaan: sapaan,
      no: r.no,
      judul: r.judul,
      tgl: d.tgl ? U.tglPanjang(d.tgl) : '-',
      jam: d.mulai || '-',
      alamat: d.alamat || d.alamatKirim || '-'
    };
  }

  function panggil(u) {
    if (!u) return 'Bapak/Ibu';
    var depan = String(u.nama || '').split(' ')[0];
    return depan ? 'Kak ' + depan : 'Bapak/Ibu';
  }

  /* ==================================================== TEMPLATE PESAN
     Di dalam blok TPL_* ada dua macam teks yang nasibnya berbeda:

       grup / label — ANTARMUKA. Muncul di menu pemilih template, dan
         diterjemahkan saat digambar oleh views/obrolan.js lewat T(g.grup)
         dan T(it.label). Padanan Inggrisnya ada di js/lang/en-extra.js.

       teks — ISI. Inilah yang benar-benar terkirim sebagai pesan, dan
         yang membacanya mitra lapangan di Indonesia. Menerjemahkannya
         mengikuti bahasa pilihan PENGIRIM akan mengirimkan kalimat Inggris
         kepada orang yang tidak berbahasa Inggris — persis kebalikan dari
         maksud template ini, yang justru ada supaya pesannya jelas.

     Penanda di bawah membuat pemindai (tools/audit-i18n.js) melewati
     seluruh blok ini, supaya isinya tidak menumpuk sebagai temuan palsu
     dan menenggelamkan temuan yang sungguhan. */
  /* i18n:data */

  /* ---- yang dikirim KLIEN kepada mitra ---- */
  var TPL_CLIENT = [
    {
      grup: 'Sebelum tim datang', ic: '🕗', items: [
        { k: 'c.konfirmasi', label: 'Konfirmasi jadwal',
          teks: function (c) { return 'Halo ' + c.sapaan + ', saya ' + c.saya + ' untuk ' + c.judul +
            ' (' + c.no + '). Konfirmasi ya, jadwalnya ' + c.tgl + ' pukul ' + c.jam + '. Ditunggu kedatangannya.'; } },
        { k: 'c.akses', label: 'Petunjuk akses lokasi',
          teks: function (c) { return 'Untuk masuk ke lokasi: silakan lapor ke pos satpam dan sebut nama saya (' +
            c.saya + '). Petunjuk tambahan: …'; } },
        { k: 'c.parkir', label: 'Info parkir & lift barang',
          teks: function () { return 'Kendaraan bisa parkir di area basement. Untuk membawa peralatan, ' +
            'mohon gunakan lift barang, bukan lift penumpang. Terima kasih.'; } },
        { k: 'c.penghuni', label: 'Ada anak / lansia / hewan di rumah',
          teks: function () { return 'Mohon diperhatikan, di rumah ada …'; } },
        { k: 'c.diwakilkan', label: 'Saya diwakilkan orang lain',
          teks: function (c) { return 'Saat tim datang saya sedang tidak di tempat. Yang akan menerima adalah ' +
            '(nama & hubungan): … Silakan koordinasi dengan beliau ya.'; } },
        { k: 'c.reschedule', label: 'Minta ganti jadwal',
          teks: function (c) { return 'Mohon maaf, apakah jadwal ' + c.tgl + ' pukul ' + c.jam +
            ' masih bisa digeser? Waktu yang lebih memungkinkan untuk saya: … Terima kasih sebelumnya.'; } }
      ]
    },
    {
      grup: 'Saat pengerjaan', ic: '🧽', items: [
        { k: 'c.prioritas', label: 'Area yang didahulukan',
          teks: function () { return 'Kalau boleh, tolong dahulukan bagian ini dulu ya: … ' +
            'Sisanya menyusul tidak apa-apa.'; } },
        { k: 'c.hatihati', label: 'Barang yang perlu kehati-hatian',
          teks: function () { return 'Mohon ekstra hati-hati pada bagian ini: … ' +
            'Kalau ragu, boleh ditanyakan dulu ke saya sebelum dikerjakan.'; } },
        { k: 'c.jangan', label: 'Bagian yang tidak perlu disentuh',
          teks: function () { return 'Untuk bagian ini tidak perlu dibersihkan ya: … Biar tetap seperti semula.'; } },
        { k: 'c.foto', label: 'Minta foto progres',
          teks: function () { return 'Kalau tidak merepotkan, boleh minta dikirimkan foto hasilnya nanti? ' +
            'Saya sedang tidak di lokasi. Terima kasih banyak.'; } },
        { k: 'c.posisi', label: 'Menanyakan posisi tim',
          teks: function (c) { return 'Permisi, untuk ' + c.no + ' tim sudah sampai mana ya? ' +
            'Saya siapkan akses masuknya.'; } },
        { k: 'c.tambahan', label: 'Menanyakan pekerjaan tambahan',
          teks: function () { return 'Saya ingin menambah pekerjaan di luar lingkup yang sekarang, yaitu: … ' +
            'Boleh dibantu buatkan penawaran harganya lewat aplikasi?'; } }
      ]
    },
    {
      grup: 'Setelah selesai', ic: '✅', items: [
        { k: 'c.puas', label: 'Hasil sudah sesuai',
          teks: function () { return 'Sudah saya cek, hasilnya rapi dan sesuai. Terima kasih banyak ' +
            'atas kerjanya, ditunggu kerja samanya lagi.'; } },
        { k: 'c.terlewat', label: 'Ada bagian yang terlewat',
          teks: function () { return 'Terima kasih untuk kerjanya. Sepertinya ada bagian yang masih terlewat: … ' +
            'Apakah masih bisa dirapikan?'; } },
        { k: 'c.tertinggal', label: 'Ada barang tertinggal',
          teks: function () { return 'Sepertinya ada peralatan tim yang tertinggal di lokasi: … ' +
            'Silakan diambil, saya simpankan dulu.'; } },
        { k: 'c.rutin', label: 'Minta jadwal rutin berikutnya',
          teks: function () { return 'Saya ingin menjadwalkan pembersihan rutin berikutnya. ' +
            'Perkiraan waktu yang saya inginkan: … Mohon dibantu prosesnya lewat aplikasi ya.'; } }
      ]
    }
  ];

  /* ---- yang dikirim MITRA kepada klien ---- */
  var TPL_MITRA = [
    {
      grup: 'Sebelum berangkat', ic: '🚐', items: [
        { k: 'm.kenalan', label: 'Perkenalan & konfirmasi jadwal',
          teks: function (c) { return 'Selamat pagi ' + c.sapaan + ', saya ' + c.saya +
            ' dari EXOCLEAN yang akan menangani ' + c.judul + ' (' + c.no + ') pada ' + c.tgl +
            ' pukul ' + c.jam + '. Mohon konfirmasinya ya. Terima kasih.'; } },
        { k: 'm.berangkat', label: 'Berangkat sekarang + estimasi tiba',
          teks: function (c) { return 'Permisi ' + c.sapaan + ', tim sudah berangkat menuju lokasi. ' +
            'Perkiraan tiba sekitar pukul … Mohon ditunggu ya.'; } },
        { k: 'm.telat', label: 'Terlambat karena kondisi jalan',
          teks: function (c) { return 'Mohon maaf ' + c.sapaan + ', perjalanan kami terhambat kondisi lalu lintas. ' +
            'Perkiraan tiba mundur sekitar … menit. Mohon pengertiannya, kami usahakan secepatnya.'; } },
        { k: 'm.alamat', label: 'Konfirmasi alamat & titik masuk',
          teks: function (c) { return 'Mohon dikonfirmasi alamatnya: ' + c.alamat + '. ' +
            'Kami masuk lewat pintu mana ya, dan apakah perlu lapor ke pos keamanan dulu?'; } },
        { k: 'm.tim', label: 'Memberitahu jumlah & nama anggota tim',
          teks: function () { return 'Tim yang akan datang berjumlah … orang, atas nama: … ' +
            'Semuanya mengenakan seragam EXOCLEAN dan membawa kartu identitas.'; } }
      ]
    },
    {
      grup: 'Di lokasi', ic: '📍', items: [
        { k: 'm.tiba', label: 'Sudah tiba di lokasi',
          teks: function (c) { return 'Permisi ' + c.sapaan + ', tim sudah tiba di lokasi. ' +
            'Mohon dibukakan aksesnya. Terima kasih.'; } },
        { k: 'm.utilitas', label: 'Izin memakai air / listrik',
          teks: function () { return 'Mohon izin menggunakan sumber air dan colokan listrik di area kerja ' +
            'untuk peralatan kami. Boleh ditunjukkan titik yang paling aman?'; } },
        { k: 'm.mulai', label: 'Mulai bekerja',
          teks: function (c) { return 'Kami mulai pengerjaan sekarang ya ' + c.sapaan + '. ' +
            'Perkiraan selesai sekitar pukul … Kalau ada yang ingin didahulukan, silakan sampaikan.'; } },
        { k: 'm.temuan', label: 'Menemukan kerusakan sebelum dikerjakan',
          teks: function () { return 'Sebelum kami mulai, kami menemukan kondisi berikut di lokasi: … ' +
            'Sudah kami foto sebagai dokumentasi supaya jelas bahwa ini bukan akibat pengerjaan kami. ' +
            'Mohon konfirmasinya.'; } },
        { k: 'm.diluar', label: 'Ada pekerjaan di luar lingkup',
          teks: function () { return 'Ada bagian yang berada di luar lingkup pekerjaan yang disepakati, yaitu: … ' +
            'Kami bisa kerjakan, tetapi perlu penawaran tambahan lebih dulu lewat aplikasi. ' +
            'Bagaimana menurut Bapak/Ibu?'; } },
        { k: 'm.waktu', label: 'Perlu waktu tambahan',
          teks: function () { return 'Kondisi di lapangan ternyata lebih berat dari perkiraan. ' +
            'Kami perlu tambahan waktu sekitar … agar hasilnya maksimal. Mohon pengertiannya.'; } },
        { k: 'm.progres', label: 'Mengirim laporan progres',
          teks: function () { return 'Laporan sementara: bagian … sudah selesai, sekarang lanjut ke bagian … ' +
            'Foto sebelum–sesudah kami unggah di menu laporan pekerjaan.'; } }
      ]
    },
    {
      grup: 'Setelah selesai', ic: '🏁', items: [
        { k: 'm.selesai', label: 'Pekerjaan selesai, mohon dicek',
          teks: function (c) { return 'Pekerjaan ' + c.no + ' sudah kami selesaikan ' + c.sapaan + '. ' +
            'Mohon dicek bersama sebelum kami tutup, supaya kalau ada yang kurang bisa langsung kami rapikan.'; } },
        { k: 'm.rawat', label: 'Saran perawatan lanjutan',
          teks: function () { return 'Saran kami agar hasilnya bertahan lebih lama: … ' +
            'Untuk perawatan berkala, idealnya diulang setiap ….'; } },
        { k: 'm.rating', label: 'Meminta penilaian',
          teks: function () { return 'Kalau berkenan, mohon bantuannya memberi penilaian di menu ' +
            '"Penilaian & Komplain". Masukan Bapak/Ibu sangat membantu kami memperbaiki layanan.'; } },
        { k: 'm.pamit', label: 'Pamit & terima kasih',
          teks: function (c) { return 'Kami pamit undur diri ya ' + c.sapaan + '. ' +
            'Terima kasih atas kepercayaannya kepada EXOCLEAN. Sampai jumpa di pekerjaan berikutnya.'; } }
      ]
    }
  ];

  /* ---- mitra toko: percakapan seputar barang, bukan pekerjaan lapangan ---- */
  var TPL_TOKO_PENJUAL = [
    {
      grup: 'Pesanan masuk', ic: '📦', items: [
        { k: 't.terima', label: 'Konfirmasi pesanan diterima',
          teks: function (c) { return 'Terima kasih ' + c.sapaan + ' atas pesanan ' + c.no + '. ' +
            'Pesanan sudah kami terima dan sedang kami siapkan.'; } },
        { k: 't.stok', label: 'Stok sebagian kosong',
          teks: function () { return 'Mohon maaf, salah satu barang pada pesanan Anda sedang kosong, yaitu: … ' +
            'Apakah berkenan kami ganti dengan yang setara, atau bagian itu kami batalkan dan dananya dikembalikan?'; } },
        { k: 't.alamat', label: 'Konfirmasi alamat kirim',
          teks: function (c) { return 'Mohon dikonfirmasi alamat pengirimannya: ' + c.alamat +
            '. Sudah benar atau ada yang perlu diperbarui?'; } },
        { k: 't.kirim', label: 'Barang dikirim',
          teks: function (c) { return 'Pesanan ' + c.no + ' sudah kami kirim hari ini. ' +
            'Nomor resi: …. Perkiraan tiba … hari kerja.'; } },
        { k: 't.tiba', label: 'Konfirmasi barang diterima',
          teks: function () { return 'Apakah barangnya sudah diterima dengan baik? ' +
            'Kalau ada yang kurang sesuai, mohon kabari kami sebelum diselesaikan ya.'; } }
      ]
    }
  ];

  /* i18n:/data */

  /**
   * Kumpulan template yang pantas untuk pengguna ini di ruang ini.
   * Klien selalu mendapat set klien; mitra mendapat set sesuai jenis ruangnya.
   */
  function templateUntuk(user, r) {
    var peran = peranDi(user.id, r);
    if (peran === 'client') return TPL_CLIENT;
    if (r.konteks === 'toko') return TPL_TOKO_PENJUAL;
    return TPL_MITRA;
  }

  /** Susun teks sebuah template untuk ruang tertentu. */
  function susun(tplKey, user, r) {
    var ctx = ctxRuang(user, r);
    var hasil = null;
    [TPL_CLIENT, TPL_MITRA, TPL_TOKO_PENJUAL].forEach(function (set) {
      set.forEach(function (g) {
        g.items.forEach(function (it) { if (it.k === tplKey) hasil = it.teks(ctx); });
      });
    });
    return hasil;
  }

  return {
    KONTEKS: KONTEKS, HARI_ARSIP: HARI_ARSIP,
    ruang: ruang, ruangUntuk: ruangUntuk, peserta: peserta,
    bolehBaca: bolehBaca, bolehTulis: bolehTulis, kunciTulis: kunciTulis,
    STATUS_MITRA_TULIS: STATUS_MITRA_TULIS,
    peranDi: peranDi, lawanBicara: lawanBicara,
    cari: cari, statistik: statistik, normal: normal,
    pesan: pesan, kirim: kirim, ringkas: ringkas, tandaiDibaca: tandaiDibaca,
    belumDibaca: belumDibaca, belumDibacaRuang: belumDibacaRuang,
    periksaIsi: periksaIsi,
    templateUntuk: templateUntuk, susun: susun, ctxRuang: ctxRuang
  };
})();
