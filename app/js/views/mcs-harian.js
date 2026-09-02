/* ==========================================================================
   views/mcs-harian.js — Beranda, aduan, absensi, ronda, inspeksi, pekerjaan tambahan, K3
   --------------------------------------------------------------------------
   Layar yang dibuka setiap hari. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  /* Shift dibaca dari shiftKode lebih dulu, teks bebas hanya cadangan.
     Formulir aplikasi menulis shiftKode; medan `shift` adalah peninggalan
     yang tidak pernah diisi siapa pun, dan membacanya saja membuat shift
     setiap petugas tampil "—" walau sistem menjadwalkannya menurut shift
     itu. Sama persis dengan yang dilakukan js/mcs.js saat memeriksa jam. */
  function namaShift(p) {
    if (!p) return '—';
    var kode = p.shiftKode || '';
    if (kode && window.MCS && MCS.shiftJenis) {
      var s = MCS.shiftJenis(kode);
      if (s && s.nama) return I18N.t(s.nama);
    }
    return p.shift || '—';
  }

  var T = VMCS.T,
      angka = VMCS.angka,
      baris = VMCS.baris,
      barisId = VMCS.barisId,
      barisTugas = VMCS.barisTugas,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dialogLapor = VMCS.dialogLapor,
      dialogPindai = VMCS.dialogPindai,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpS = VMCS.dpS,
      dpSaring = VMCS.dpSaring,
      dpUlang = VMCS.dpUlang,
      jamMenit = VMCS.jamMenit,
      jml = VMCS.jml,
      judulMutu = VMCS.judulMutu,
      kartuMutu = VMCS.kartuMutu,
      kop = VMCS.kop,
      korp = VMCS.korp,
      kvKerja = VMCS.kvKerja,
      namaArea = VMCS.namaArea,
      namaPekerja = VMCS.namaPekerja,
      selMutu = VMCS.selMutu,
      tandai = VMCS.tandai,
      tombol = VMCS.tombol;

  var tglAktif = null;      /* tanggal yang sedang dilihat di beranda */

  function renderBeranda() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'),
      T('Hubungi admin EXOCLEAN untuk memperbaiki akun Anda.'));

    var lengkap = MCS.kelengkapan(k.id);
    if (!lengkap.siap) return kartuPenyiapan(k, lengkap);

    var tgl = tglAktif || U.today();
    var st = MCS.statistik(k.id, tgl);
    var tugas = MCS.tugasHari(k.id, tgl);

    return kepalaBeranda(k, tgl) +
      '<div class="bd">' +
        '<div class="bd__u">' + stripAngka(st) + kartuJadwal(tugas, st, tgl) +
          kartuTren(k, tgl) + '</div>' +
        '<div class="bd__r">' + kartuTindakan(k, tgl) + kartuMutu(k) + '</div>' +
      '</div>';
  }

  function kepalaBeranda(k, tgl) {
    return '<div class="bd-kop">' +
        '<div class="bd-kop__n">' +
          '<h2 class="mcs-h">' + U.esc(k.nama) + '</h2>' +
          '<div class="tbl-sub">' + U.tglPanjang(tgl) + '</div>' +
        '</div>' +
        '<div class="bd-kop__t">' +
          '<button class="btn btn--ghost btn--sm" data-act="mcs-tgl" data-d="-1" ' +
            'title="' + U.esc(T('Hari sebelumnya')) + '">‹</button>' +
          (tgl !== U.today()
            ? '<button class="btn btn--ghost btn--sm" data-act="mcs-hari-ini">' +
              T('Hari ini') + '</button>'
            : '') +
          '<button class="btn btn--ghost btn--sm" data-act="mcs-tgl" data-d="1"' +
            (tgl >= U.today() ? ' disabled' : '') + ' title="' + U.esc(T('Hari berikutnya')) + '">›</button>' +
          /* Tombol pindai berdiri di kepala halaman, bukan terkubur di dalam
             dialog laporan: petugas memindai saat TIBA — sebelum menyentuh
             apa pun — dan yang ia buka pertama kali adalah layar ini. */
          '<button class="btn btn--sm" data-act="mcs-pindai">🏷️ ' + T('Pindai tag') + '</button>' +
        '</div>' +
      '</div>';
  }

  /** Empat angka dalam satu baris, dengan bilah capaian di bawahnya. */

  function stripAngka(st) {
    function ang(nilai, label, merah) {
      return '<div class="bd-a">' +
        '<span class="bd-a__v' + (merah && nilai ? ' bd-a__v--m' : '') + '">' +
          U.num(nilai) + '</span>' +
        '<span class="bd-a__l">' + U.esc(label) + '</span>' +
      '</div>';
    }
    var telat = (st.terlambat || 0) + (st.terlewat || 0);
    return '<div class="card bd-strip">' +
        '<div class="bd-strip__r">' +
          ang(st.total, T('tugas')) +
          ang(st.selesai, T('selesai')) +
          /* BUKAN kunci 'terlambat' — itu sudah dipakai sebagai "late by"
             yang selalu diikuti lama keterlambatan, dan di sini akan
             terbaca "2 late by". */
          ang(telat, T('lewat waktu'), true) +
          ang(st.area, T('area')) +
          '<div class="bd-strip__s">' + st.persen + '% ' + T('selesai') + '</div>' +
        '</div>' +
        '<div class="bd-bar"><i style="width:' + st.persen + '%"></i></div>' +
      '</div>';
  }

  /**
   * Grafik empat belas hari terakhir di beranda.
   *
   * Angka hari ini menjawab 'apa yang harus dikerjakan sekarang'; grafik ini
   * menjawab pertanyaan yang berbeda dan tidak bisa dijawab angka tunggal:
   * apakah keadaannya membaik atau memburuk. Dua minggu dipilih karena satu
   * minggu terlalu pendek untuk membedakan tren dari hari libur, sedangkan
   * sebulan penuh membuat batangnya terlalu rapat untuk dibaca sekilas.
   *
   * Tabel setaranya bisa dibuka — grafik SVG tidak terbaca pembaca layar,
   * dan tidak bisa disalin ke lembar kerja.
   */

  var bdTabel = false;

  function kartuTren(k, tgl) {
    var akhir = new Date(tgl + 'T00:00:00');
    var mulai = new Date(akhir); mulai.setDate(mulai.getDate() - 13);
    var hasil = KPI.nilai(k.id, U.iso(mulai), U.iso(akhir));
    var hari = hasil.perHari.filter(function (x) { return x.total; });

    var spec = {
      seri: [{ nama: T('Selesai'), warna: Chart.WARNA.s1 },
             { nama: T('Belum selesai'), warna: Chart.WARNA.s2 }],
      judulA11y: T('Tugas selesai dan belum selesai, empat belas hari terakhir'),
      sumber: { teks: T('Setiap tugas berjadwal dalam empat belas hari ' +
        'terakhir, dihitung per hari. Hari tanpa jadwal tidak digambar, dan ' +
        'tugas yang belum sampai jamnya tidak dihitung sebagai belum ' +
        'selesai.'), hal: 'mcsJadwal' },
      data: hari.map(function (x) {
        return { label: String(x.tgl).slice(8), sub: String(x.tgl).slice(5, 7),
                 values: [x.selesai, Math.max(0, x.total - x.selesai)] };
      })
    };

    var total = hari.reduce(function (s, x) { return s + x.total; }, 0);
    var kelar = hari.reduce(function (s, x) { return s + x.selesai; }, 0);

    return UI.card({ title: T('14 hari terakhir'),
      sub: total ? kelar + ' / ' + total + ' ' + T('selesai') +
        ' · ' + Math.round(kelar / total * 100) + '%' : T('belum ada tugas tercatat'),
      tools: '<button class="btn btn--ghost btn--sm" data-act="bd-tabel">' +
        (bdTabel ? '📊 ' + T('Grafik') : '🔢 ' + T('Tabel')) + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="mcs-ke" data-h="mcsKinerja">' +
          T('Penilaian kinerja') + '</button>',
      body: hari.length
        ? (bdTabel ? Chart.tabel(Object.assign({ tipe: 'kolom' }, spec)) : Chart.kolom(spec))
        : UI.empty('📊', T('Belum ada tugas tercatat'),
            T('Grafik muncul setelah ada jadwal yang berjalan.')) });
  }

  function kartuJadwal(tugas, st, tgl) {
    if (!tugas.length) {
      return '<div class="card bd-jd">' +
        UI.empty('🗓️', T('Tidak ada jadwal pada hari ini'),
          T('Jadwal hanya berjalan pada hari yang Anda pilih saat menyusunnya.')) +
      '</div>';
    }
    var nPetugas = tugas.map(function (t) { return t.pekerja && t.pekerja.id; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).length;

    /* Beranda adalah layar yang PALING SERING dibuka — tiap pagi, oleh tiap
       penyelia — dan sebelum perbaikan ini ia yang paling berat dari semua:
       seribu tujuh ratus empat puluh empat slot tugas digambar sekaligus,
       145.801 karakter dan 19.624 elemen. Yang membuka layar ini pada pagi
       hari memegang satu cabang, bukan delapan puluh tujuh. */
    var tg = dpSaring('beranda', tugas, lokTugas);

    return '<div class="card bd-jd">' +
        '<div class="bd-jd__h">' +
          '<h3>' + T('Jadwal hari ini') + '</h3>' +
          '<span class="tbl-sub">' + jml(tugas.length, '1 tugas', '{n} tugas') + ' · ' +
            jml(nPetugas, T('1 petugas'), T('{n} petugas')) + '</span>' +
          '<div class="bd-jd__f">' +
            UI.tabs([{ key: 'semua', label: T('Semua'), n: tugas.length },
                     { key: 'belum', label: T('Belum selesai'),
                       n: tugas.filter(belumSelesai).length }],
                    saringJadwal, 'bd-saring') +
          '</div>' +
        '</div>' +
        dpBilah('beranda', tugas, tg, lokTugas) +
        '<div class="bd-jd__b">' + daftarTugas(tg, tgl) + '</div>' +
      '</div>';
  }

  function lokTugas(t) {
    return t.area && t.area.lokasiId ? t.area.lokasiId : '';
  }

  var saringJadwal = 'semua';

  function belumSelesai(t) { return t.status !== 'selesai' && t.status !== 'lewat'; }

  /**
   * Daftar tugas dengan PENANDA JAM BERJALAN disisipkan pada tempatnya.
   *
   * Tanpa penanda ini, mata harus membandingkan tiga belas baris jam dengan
   * jam dinding untuk tahu mana yang sudah lewat. Penandanya hanya muncul
   * pada hari ini — pada tanggal lampau, 'sekarang' tidak berarti apa-apa.
   */

  function daftarTugas(tugas, tgl) {
    var l = saringJadwal === 'belum' ? tugas.filter(belumSelesai) : tugas;
    if (!l.length) {
      return '<div class="bd-kosong">✅ ' + T('Semua tugas hari ini sudah ditangani.') + '</div>';
    }
    var kini = tgl === U.today() ? U.jam(U.nowISO()) : null;
    var sudah = false;
    /* Penanda jam berjalan dihitung di dalam pemotongan, bukan di luarnya.
       Kalau ia dihitung atas seluruh daftar lalu daftarnya dipotong,
       penandanya bisa jatuh di baris yang tidak digambar dan hilang sama
       sekali — dan garis waktu yang kadang ada kadang tidak lebih
       membingungkan daripada tidak ada garis sama sekali. */
    return dpPotong('berandaTugas', l, null, function (tampil) {
      return tampil.map(function (t) {
        var tanda = '';
        if (kini && !sudah && String(t.jam) > kini) {
          sudah = true;
          tanda = '<div class="bd-kini"><span>' + U.esc(kini) + '</span><i></i></div>';
        }
        return tanda + barisTugas(t);
      }).join('') +
        /* Bila semua tugas yang digambar sudah lewat jamnya, penandanya
           jatuh di bawah — bukan dihilangkan. Beranda tanpa penanda sama
           sekali membuat orang mengira jamnya belum dihitung. */
        (kini && !sudah
          ? '<div class="bd-kini"><span>' + U.esc(kini) + '</span><i></i></div>' : '');
    });
  }

  /* =================================================== PERLU TINDAKAN

     Empat hal yang selama ini tersebar di empat halaman berbeda — aduan
     lewat batas waktu, petugas absen tanpa pengganti, tugas yang belum
     diingatkan, dan bahan yang menipis — dan hanya terlihat oleh orang yang
     ingat membuka keempatnya satu per satu.

     Urutannya bukan abjad melainkan AKIBAT: yang sudah melanggar janji
     kepada penghuni lebih dulu, lalu yang membuat pekerjaan hari ini tidak
     dikerjakan siapa pun, baru yang bisa ditunda.
   */

  function kartuTindakan(k, tgl) {
    var baris = [];

    /* 0. PEMERIKSAAN SILANG — paling atas, karena inilah satu-satunya
          golongan temuan yang TIDAK muncul di halaman mana pun.

          Aduan terlambat terlihat di halaman Aduan; petugas absen terlihat
          di halaman Kehadiran. Tetapi tugas yang selesai atas nama orang
          yang tidak masuk tidak terlihat di kedua halaman itu — masing-
          masing benar menurut dirinya sendiri. Kalau tidak disebut di
          sini, ia tidak akan pernah disebut di mana pun. */
    if (window.SILANG) {
      var sl = SILANG.ringkas(k.id, tgl);

      sl.tugasTanpaKehadiran.slice(0, 2).forEach(function (x) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'danger', ikon: '⚖️',
          judul: T('{area} ditandai selesai atas nama {nama}')
            .replace('{area}', x.area ? x.area.nama : T('Area terhapus'))
            .replace('{nama}', x.pekerja ? x.pekerja.nama : '—'),
          meta: T('padahal hari ini tercatat') + ' ' + T(x.status.nama) +
            ' · ' + T('salah satunya keliru — periksa yang mana'),
          aksi: T('Periksa'), act: 'mcs-ke', data: ' data-h="mcsAbsensi"'
        });
      });

      if (sl.alatYatim.length) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'danger', ikon: '🧰',
          judul: jml(sl.alatYatim.length,
            T('1 peralatan dipakai tanpa pemegang yang bisa ditanyai'),
            T('{n} peralatan dipakai tanpa pemegang yang bisa ditanyai')),
          /* TANPA U.esc — penggambar barisnya sudah melakukannya. Esc
             kedua mengubah '&' menjadi '&amp;' yang tampil apa adanya:
             'Vacuum Cleaner Wet &amp; Dry 30L'. */
          meta: sl.alatYatim.slice(0, 3).map(function (y) {
            return y.aset.nama; }).join(', ') +
            (sl.alatYatim.length > 3
              ? ', ' + T('dan {n} lainnya').replace('{n}', U.num(sl.alatYatim.length - 3))
              : ''),
          aksi: T('Tangani'), act: 'mcs-ke', data: ' data-h="mcsAset"'
        });
      }

      if (sl.alatPemegangNonaktif.length) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'warn', ikon: '🧰',
          judul: jml(sl.alatPemegangNonaktif.length,
            T('1 peralatan dipegang orang yang sudah tidak bekerja'),
            T('{n} peralatan dipegang orang yang sudah tidak bekerja')),
          meta: sl.alatPemegangNonaktif.slice(0, 3).map(function (y) {
            return y.aset.nama + ' — ' + y.pekerja.nama; }).join(', '),
          aksi: T('Tarik kembali'), act: 'mcs-ke', data: ' data-h="mcsAset"'
        });
      }

      /* Bukan kesalahan — orang sakit membawa pulang kunci trolinya, dan
         itu wajar. Yang perlu diketahui penyelia: alat itu TIDAK ADA di
         gedung hari ini, jadi jangan dicari dan jangan dijadwalkan.
         Warnanya sengaja 'info', bukan peringatan. */
      if (sl.alatDibawaYangTidakMasuk.length) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'info', ikon: '🏠',
          judul: jml(sl.alatDibawaYangTidakMasuk.length,
            T('1 peralatan ikut orang yang hari ini tidak masuk'),
            T('{n} peralatan ikut orang yang hari ini tidak masuk')),
          meta: sl.alatDibawaYangTidakMasuk.slice(0, 3).map(function (y) {
            return y.aset.nama + ' — ' + y.pekerja.nama; }).join(', ') + ' · ' +
            T('bukan kehilangan — hanya tidak ada di gedung hari ini'),
          aksi: T('Lihat'), act: 'mcs-ke', data: ' data-h="mcsAset"'
        });
      }

      if (sl.alatTertahanLama.length) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'warn', ikon: '⏳',
          judul: jml(sl.alatTertahanLama.length,
            T('1 peralatan belum pernah kembali ke gudang'),
            T('{n} peralatan belum pernah kembali ke gudang')),
          meta: (function () {
            var x = sl.alatTertahanLama[0];
            return x.aset.nama + ' · ' +
              jml(x.hari, T('sudah 1 hari di tangan yang sama'),
                T('sudah {n} hari di tangan yang sama')) + ' · ' +
              T('servis berkalanya ikut terlewat');
          })(),
          aksi: T('Lihat'), act: 'mcs-ke', data: ' data-h="mcsAset"'
        });
      }

      if (sl.bukuGudangDiam) {
        baris.push({
          jenis: T('pemeriksaan silang'),
          warna: 'warn', ikon: '🧴',
          judul: T('{n} tugas selesai hari ini, tetapi tidak ada bahan keluar dari gudang')
            .replace('{n}', U.num(sl.bukuGudangDiam.tugasSelesai)),
          meta: sl.bukuGudangDiam.hariBeruntun > 1
            ? jml(sl.bukuGudangDiam.hariBeruntun,
                T('sudah 1 hari buku gudang tidak diisi'),
                T('sudah {n} hari berturut-turut buku gudang tidak diisi'))
            : T('mungkin troli kemarin masih terisi — pastikan saja'),
          aksi: T('Buka gudang'), act: 'mcs-ke', data: ' data-h="mcsStok"'
        });
      }
    }

    /* 1. Aduan — disebut satu per satu, bukan sebagai angka. 'Dua aduan
          terlambat' tidak memberi tahu siapa pun harus ke mana. */
    MCS.aduan(k.id, {}).slice(0, 3).forEach(function (a) {
      var sisa = MCS.sisaSLA(a);
      var lewat = sisa !== null && sisa < 0;
      var area = MCS.areaSatu(a.areaId);
      baris.push({
        jenis: T('aduan'),
        warna: lewat ? 'danger' : 'warn', ikon: '📣',
        judul: (area ? area.nama : T('Area terhapus')) +
          (a.teks ? ' — ' + a.teks : ''),
        meta: T(MCS.genting(a.genting).nama) + ' · ' +
          (sisa === null ? T('tanpa batas waktu')
            : lewat ? T('lewat') + ' ' + jamMenit(-sisa)
                    : T('sisa') + ' ' + jamMenit(sisa)),
        aksi: T('Tangani'), act: 'mcs-ke', data: ' data-h="mcsAduan"'
      });
    });

    /* 2. Petugas tidak bekerja TANPA pengganti — areanya tidak akan
          dikerjakan siapa pun hari ini, dan itu baru ketahuan besok pagi
          kalau tidak disebut di sini. */
    var absen = 0;
    MCS.absensiHari(k.id, tgl).forEach(function (x) {
      if (!x.status || x.pengganti) return;
      var s = MCS.statusHadir(x.status);
      if (s.bekerja) return;
      /* Dibatasi tiga, sama seperti aduan. Hari dengan enam orang absen
         akan mendorong peringatan sabun dan tisu keluar dari daftar
         seluruhnya — dan yang tidak muncul sama sekali tidak akan pernah
         ditangani. Sisanya tetap dihitung di baris bawah. */
      if (++absen > 3) { baris.push({ jenis: T('kehadiran'), sembunyi: true }); return; }
      var area = MCS.areaPekerja(x.pekerja.id);
      baris.push({
        jenis: T('kehadiran'),
        warna: 'warn', ikon: s.ikon,
        judul: x.pekerja.nama + ' ' + T('tidak masuk'),
        meta: T(s.nama) + ' · ' + T('tanpa pengganti') +
          (area.length ? ' · ' + jml(area.length, '1 area', '{n} area') : ''),
        aksi: T('Atur'), act: 'mcs-ke', data: ' data-h="mcsAbsensi"'
      });
    });

    /* 3. Pengingat WhatsApp yang belum terkirim — hanya untuk hari ini;
          mengingatkan orang tentang tugas kemarin tidak ada gunanya. */
    var perlu = tgl === U.today() ? MCS.perluDiingatkan(k.id) : [];
    if (perlu.length) {
      var area1 = perlu.map(function (p) {
        return p.area ? p.area.nama : ''; }).filter(Boolean);
      baris.push({
        jenis: T('pengingat'),
        warna: 'warn', ikon: '🔔',
        /* Yang dihitung adalah TUGAS, bukan orang: satu petugas bisa punya
           lima tugas yang sudah waktunya, dan menyebutnya 'lima petugas'
           membuat korporat mengira timnya lima kali lebih besar. */
        judul: jml(perlu.length, T('1 tugas belum diingatkan'), T('{n} tugas belum diingatkan')),
        meta: T('Sudah lewat waktunya') +
          (area1.length ? ' · ' + area1.filter(function (v, i, a) {
            return a.indexOf(v) === i; }).slice(0, 2).join(', ') : ''),
        aksi: T('Ingatkan'), act: 'mcs-ingatkan', data: ''
      });
    }

    /* 4. Bahan habis pakai. Separuh keluhan penghuni bukan tentang lantai
          kotor melainkan tentang sabun dan tisu yang habis. */
    MCS.statistikStok(k.id).perluDibeli.slice(0, 2).forEach(function (x) {
      baris.push({
        jenis: T('persediaan'),
        warna: x.keadaan === 'habis' ? 'danger' : 'warn', ikon: '🧴',
        judul: x.nama + ' ' + T(x.keadaan === 'habis' ? 'habis' : 'menipis'),
        meta: T('Sisa') + ' ' + U.num(x.saldo) + ' ' + x.satuan + ' · ' +
          T('minimum') + ' ' + U.num(x.minimum),
        aksi: T('Catat'), act: 'mcs-ke', data: ' data-h="mcsStok"'
      });
    });

    if (!baris.length) {
      return '<div class="card bd-pr">' +
          '<div class="bd-pr__h"><h3>' + T('Perlu tindakan') + '</h3></div>' +
          '<div class="bd-pr__ok">' +
            '<span>✅</span>' + T('Tidak ada yang menunggu ditangani.') +
          '</div>' +
        '</div>';
    }

    var tampil = baris.filter(function (b) { return !b.sembunyi; }).slice(0, 6);
    var sisa = baris.filter(function (b) { return tampil.indexOf(b) < 0; });
    /* Baris sisa menyebut JENISNYA, bukan hanya jumlahnya: '+3 lagi' tidak
       memberi tahu siapa pun bahwa yang tidak muat adalah stok yang habis. */
    var jenisSisa = sisa.map(function (b) { return b.jenis; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; });

    return '<div class="card bd-pr">' +
        '<div class="bd-pr__h">' +
          '<h3>' + T('Perlu tindakan') + '</h3>' +
          '<span class="bd-pr__n">' + baris.length + '</span>' +
        '</div>' +
        tampil.map(function (b) {
          return '<div class="bd-p">' +
            '<div class="bd-p__i bd-p__i--' + b.warna + '">' + b.ikon + '</div>' +
            '<div class="bd-p__t">' +
              '<b>' + U.esc(b.judul) + '</b>' +
              '<span>' + U.esc(b.meta) + '</span>' +
            '</div>' +
            '<button class="btn btn--ghost btn--sm" data-act="' + b.act + '"' + b.data + '>' +
              U.esc(b.aksi) + '</button>' +
          '</div>';
        }).join('') +
        (sisa.length
          ? '<div class="bd-pr__sisa">+' + jml(sisa.length, '1 lagi', '{n} lagi') +
            (jenisSisa.length ? ' · ' + U.esc(jenisSisa.join(', ')) : '') + '</div>'
          : '') +
      '</div>';
  }

  /**
   * Satu angka yang menjawab pertanyaan yang TIDAK dijawab oleh '100% selesai':
   * apakah hasilnya bersih.
   *
   * Batangnya dibaca terbalik dari kebiasaan — makin TINGGI makin buruk,
   * karena skala APPA 1 berarti terbaik. Itu disebut di layar, bukan
   * dibiarkan ditebak.
   */

  function kartuPenyiapan(k, lengkap) {
    return UI.alert('brand', '<b>' + T('Selamat datang di MCS EXOCLEAN.') + '</b> ' +
      T('Empat langkah sekali saja, lalu sistem mengingatkan petugas Anda sendiri ' +
        'sesuai jadwal yang Anda susun.'), '🏢') + '<div class="mb-3"></div>' +

      UI.card({ title: T('Penyiapan'), sub: lengkap.selesai + ' / ' + lengkap.total + ' ' + T('selesai'),
        body: '<div class="mcs-siap">' + lengkap.langkah.map(function (l, i) {
          return '<div class="mcs-s' + (l.selesai ? ' ok' : '') + '">' +
            '<div class="mcs-s__n">' + (l.selesai ? '✓' : (i + 1)) + '</div>' +
            '<div class="mcs-s__t"><b>' + U.esc(T(l.nama)) + '</b>' +
              (l.jumlah !== undefined && l.jumlah
                ? '<span>' + l.jumlah + ' ' + T('terdaftar') + '</span>' : '') +
            '</div>' +
            '<button class="btn btn--' + (l.selesai ? 'ghost' : 'primary') + ' btn--sm" ' +
              'data-act="mcs-ke" data-h="' + l.halaman + '">' +
              (l.selesai ? T('Ubah') : T('Mulai')) + '</button>' +
          '</div>';
        }).join('') + '</div>' });
  }

  function mountBeranda(root) {
    Chart.pasang(root);
    delegasi(root, Object.assign(dpAksi(), {
      'mcs-ke': function (el) { APP.go(el.getAttribute('data-h')); },
      'bd-saring': function (el) {
        saringJadwal = el.getAttribute('data-key');
        dpUlang('berandaTugas');
        APP.refresh();
      },
      'bd-tabel': function () { bdTabel = !bdTabel; APP.refresh(); },
      'mcs-hari-ini': function () { tglAktif = null; APP.refresh(); },
      'mcs-tgl': function (el) {
        var d = new Date((tglAktif || U.today()) + 'T00:00:00');
        d.setDate(d.getDate() + (+el.getAttribute('data-d')));
        var baru = U.iso(d);
        /* Masa depan tidak bisa dibuka: tugasnya belum terjadi, dan menandainya
           selesai sebelum waktunya membuat catatan kehadiran jadi karangan. */
        if (baru > U.today()) return;
        tglAktif = baru === U.today() ? null : baru;
        APP.refresh();
      },
      'mcs-pindai': function () { dialogPindai({}); },
      'mcs-lapor': function (el) {
        dialogLapor(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
      },
      'mcs-selesai': function (el) {
        /* Area yang menuntut bukti tidak bisa ditandai dari tombol cepat —
           dialog fotonya dibuka, bukan ditolak dengan pesan galat yang tidak
           memberi jalan keluar. */
        var kid = kop();
        var t = MCS.tugasHari(kid, el.getAttribute('data-t')).filter(function (x) {
          return x.jadwalId === el.getAttribute('data-j') && x.jam === el.getAttribute('data-h'); })[0];
        if (t && t.wajibFoto && !(t.sesudah || []).length) {
          UI.toast(T('Area ini menuntut foto bukti — silakan lampirkan.'), 'warn');
          dialogLapor(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
          return;
        }
        if (t && t.wajibLangkah && t.progres.wajibBelum.length) {
          UI.toast(T('Masih ada langkah wajib yang belum dicentang.'), 'warn');
          dialogLapor(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
          return;
        }
        if (t && t.wajibFotoLangkah && t.progres.fotoBelum.length) {
          UI.toast(T('Foto sebelum-sesudah tiap langkah belum lengkap.'), 'warn');
          dialogLapor(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
          return;
        }
        tandai(el, 'selesai');
      },
      'mcs-lewat': function (el) {
        UI.formModal({
          title: T('Lewati tugas ini'),
          sub: T('Tercatat sebagai dilewati, bukan sebagai selesai.'),
          okText: T('Lewati'),
          fields: [{ name: 'alasan', label: T('Alasan'), type: 'textarea', rows: 2,
            placeholder: T('mis. area sedang direnovasi') }]
        }).then(function (d) { if (d) tandai(el, 'lewat', d.alasan); });
      },
      'mcs-batal': function (el) {
        MCS.batalTandai(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
        APP.refresh();
      },
      'mcs-ingatkan': function () {
        var r = MCS.kirimPengingat(kop());
        UI.toast(jml(r.terkirim, '1 pengingat masuk antrean WhatsApp',
          '{n} pengingat masuk antrean WhatsApp'), 'ok');
        APP.refresh();
      }
    }));
  }

  /**
   * Laporan foto sebelum–sesudah untuk satu tugas.
   *
   * Foto acuan area ditampilkan di atas sebagai pembanding: "beginilah
   * seharusnya". Tanpa itu, foto sesudah hanya membuktikan ada yang memotret,
   * bukan bahwa areanya bersih.
   *
   * KETERBATASAN YANG DISEBUTKAN, BUKAN DISEMBUNYIKAN: petugas kebersihan
   * korporat tidak punya akun di aplikasi ini, dan basis datanya hidup di
   * peramban satu perangkat. Laporan ini karena itu diisi dari perangkat yang
   * memegang datanya — ponsel penyelia di lokasi. Kolom "dikerjakan oleh"
   * ada supaya buktinya tetap menunjuk orang yang benar.
   */
  /**
   * Slot foto ringkas untuk satu langkah.
   *
   * Sengaja BUKAN UI.photoGrid: kisi penuh setinggi seratus piksel dikalikan
   * dua sisi dikalikan enam langkah membuat laporan sepanjang tiga layar, dan
   * petugas yang harus menggulir tiga layar akan berhenti mengisinya.
   */

  var rdTgl = null, rdTab = 'papan';

  function renderRonda() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var tgl = rdTgl || U.today();
    var st = RONDA.statistik(k.id, tgl);

    return catatanRonda() +
      kepalaRonda(tgl) +
      (st.bertanda.length ? peringatanRonda(st) : '') +
      ringkasRonda(st) +
      '<div class="row between mb-3">' +
        UI.tabs([{ key: 'papan', label: T('Papan hari ini'), n: st.slot },
                 { key: 'rute', label: T('Rute'), n: st.rute }],
                rdTab, 'rd-tab') +
        (rdTab === 'rute'
          ? '<button class="btn btn--primary btn--sm" data-act="rd-baru">＋ ' +
            T('Tambah Rute') + '</button>'
          : '<button class="btn btn--ghost btn--sm" data-act="rd-cetak">🖨️ ' +
            T('Cetak papan') + '</button>') +
      '</div>' +
      (rdTab === 'rute' ? kartuRute(k) : kartuPapan(k, tgl));
  }

  /* Batas kemampuan ronda disebut di layar. Yang membacanya sebagai bukti
     pekerjaan akan salah memakainya — dan salah menuduh orang. */

  function catatanRonda() {
    return UI.alert('info',
      '<b>' + T('Ronda membuktikan KEHADIRAN BERURUTAN, bukan pekerjaan.') + '</b> ' +
      T('Jarak antarwaktu antartitik membuat pemindaian borongan terlihat: enam ' +
        'titik dalam empat puluh detik bukan ronda. Tetapi orang yang benar-benar ' +
        'berjalan santai memindai semuanya tanpa membersihkan apa pun akan lolos ' +
        'sepenuhnya. Yang membuktikan pekerjaan tetap foto dan inspeksi.'), '🚶') +
      '<div class="mb-3"></div>';
  }

  function kepalaRonda(tgl) {
    return '<div class="row between mb-3">' +
        '<div><h2 class="mcs-h">' + T('Ronda') + '</h2>' +
          '<div class="tbl-sub">' + U.tglPanjang(tgl) + '</div></div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="rd-tgl" data-d="-1">‹</button>' +
          (tgl !== U.today()
            ? '<button class="btn btn--ghost btn--sm" data-act="rd-kini">' + T('Hari ini') + '</button>'
            : '') +
          '<button class="btn btn--ghost btn--sm" data-act="rd-tgl" data-d="1"' +
            (tgl >= U.today() ? ' disabled' : '') + '>›</button>' +
        '</div>' +
      '</div>';
  }

  function peringatanRonda(st) {
    return UI.alert('warn',
      '<b>' + jml(st.bertanda.length, '1 perjalanan bertanda', '{n} perjalanan bertanda') +
      '.</b> ' +
      /* Kalimat ini penting: tanda bukan tuduhan, dan sering berjawab wajar. */
      T('Tanda bukan tuduhan — ia penunjuk ke mana harus bertanya. Jawabannya ' +
        'sering wajar: lift rusak, jalur ditutup, atau ada penghuni yang menahan ' +
        'bicara.'), '🔍') + '<div class="mb-3"></div>';
  }

  function ringkasRonda(st) {
    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Ronda terjadwal'), value: st.slot, icon: '🚶',
          meta: st.akan ? jml(st.akan, T('1 belum waktunya'), T('{n} belum waktunya')) : '' }) +
        UI.stat({ label: T('Lengkap'), value: st.lengkap, icon: '✅',
          meta: st.persen === null ? '' : st.persen + '%' }) +
        UI.stat({ label: T('Tidak lengkap'), value: st.sebagian, icon: '⚠️' }) +
        UI.stat({ label: T('Tidak dijalankan'), value: st.terlewat, icon: '⛔' }) +
      '</div>';
  }

  function kartuPapan(k, tgl) {
    var p = RONDA.papanHari(k.id, tgl);
    if (!p.length) {
      return UI.card({ body: UI.empty('🚶', T('Tidak ada ronda terjadwal hari ini'),
        T('Susun rutenya lewat tab Rute — pilih titiknya, urutkan, dan tentukan ' +
          'jam berangkat.')) });
    }
    return UI.card({ title: T('Papan ronda'),
      sub: T('Diurutkan menurut jam berangkat'),
      body: '<div class="wk-list">' + p.map(barisPapan).join('') + '</div>' });
  }

  function barisPapan(b) {
    var s = b.status === 'akan'
      ? { nama: T('Belum waktunya'), ikon: '🕐', warna: 'muted' }
      : RONDA.status(b.status);
    var titikRute = RONDA.titikRute(b.ronda);
    var jalan = b.jalan;
    var terpindai = {};
    ((jalan && jalan.titik) || []).forEach(function (t) { terpindai[t.urut] = t; });

    return '<div class="wk-r' + (b.status === 'terlewat' || b.status === 'sebagian'
        ? ' wk-r--lewat' : '') + '">' +
      '<div class="wk-r__h" style="cursor:default">' +
        '<span class="rd-jam">' + U.esc(b.jam) + '</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(b.ronda.nama) + '</b>' +
          '<span>' + jml(titikRute.length, '1 titik', '{n} titik') +
            ' · ' + b.ronda.durasiMenit + ' ' + T('menit') +
            (jalan && jalan.pekerjaId
              ? ' · ' + U.esc((MCS.pekerjaSatu(jalan.pekerjaId) || {}).nama || '') : '') +
            (jalan && jalan.menitPakai
              ? ' · ' + T('terpakai') + ' ' + jalan.menitPakai + ' ' + T('menit') : '') +
          '</span>' +
          /* Rantai titik: yang sudah dipindai terisi, yang belum berlubang.
             Bentuk ini membuat 'berhenti di titik tiga' terbaca sekilas —
             angka 3/6 tidak memberi tahu titik mana yang terlewat. */
          '<span class="rd-rantai">' + titikRute.map(function (t) {
            var ada = terpindai[t.urut];
            return '<i class="rd-t' + (ada ? ' rd-t--ok' : '') + '" title="' +
              U.esc(t.nama + (ada ? ' · ' + U.jam(ada.pada) : ' · ' + T('belum dipindai'))) +
              '">' + t.urut + '</i>';
          }).join('<u class="rd-garis"></u>') + '</span>' +
          ((jalan && (jalan.tanda || []).length)
            ? '<span class="rd-tanda">' + jalan.tanda.map(function (kd) {
                var td = RONDA.tanda(kd);
                return '<em title="' + U.esc(T(td.ket)) + '">' + td.ikon + ' ' +
                  U.esc(T(td.nama)) + '</em>';
              }).join('') + '</span>'
            : '') +
        '</span>' +
        '<span class="chip chip--' + s.warna + '">' + s.ikon + ' ' + T(s.nama) + '</span>' +
      '</div>' +
    '</div>';
  }

  function kartuRute(k) {
    var l = RONDA.daftar(k.id, { semua: true });
    if (!l.length) {
      return UI.card({ body: UI.empty('🗺️', T('Belum ada rute ronda'),
        T('Rute ronda berguna untuk pemeriksaan toilet tiap jam, keliling malam, ' +
          'atau sapuan lobi — pekerjaan yang bentuknya berjalan, bukan berhenti ' +
          'di satu tempat.')) });
    }
    return UI.card({ body: '<div class="ma-list">' + l.map(barisRute).join('') + '</div>' });
  }

  function barisRute(x) {
    var on = x.aktif !== false;
    var t = RONDA.titikRute(x);
    var hilang = t.filter(function (y) { return !y.ada; }).length;
    var hari = (x.hari || []).map(function (h) { return T(MCS.HARI[h]).slice(0, 3); }).join(', ');
    var p = x.pekerjaId ? MCS.pekerjaSatu(x.pekerjaId) : null;

    return '<div class="ma-r' + (on ? '' : ' ma-r--jeda') + '">' +
      '<div class="lt-k__i">🗺️</div>' +
      '<div class="ma-r__t">' +
        '<b>' + U.esc(x.nama) + '</b>' +
        '<span>' + jml(t.length, '1 titik', '{n} titik') +
          ' · ' + (x.jam || []).join(', ') +
          (hari ? ' · ' + U.esc(hari) : '') +
          ' · ' + x.durasiMenit + ' ' + T('menit') +
          ' (+' + x.toleransiMenit + ')' +
          (p ? ' · ' + U.esc(p.nama) : '') +
        '</span>' +
        '<span class="mcs-t__c">' + t.map(function (y) {
          return (y.ada ? '' : '⚠️ ') + U.esc(y.nama); }).join(' → ') + '</span>' +
        (hilang
          /* Titik yang areanya sudah dihapus membuat rute mustahil lengkap
             selamanya — dan itu harus disebut, bukan dibiarkan jadi 'tidak
             lengkap' setiap hari tanpa sebab yang jelas. */
          ? '<span class="mcs-warn">⚠️ ' + jml(hilang, T('1 titik sudah terhapus'),
              T('{n} titik sudah terhapus')) + ' — ' +
              T('rute ini tidak akan pernah lengkap sebelum diperbaiki') + '</span>'
          : '') +
      '</div>' +
      (on ? '' : '<span class="chip chip--muted">' + T('dijeda') + '</span>') +
      '<button class="btn btn--ghost btn--sm" data-act="rd-ubah" data-id="' + x.id + '">' +
        T('Ubah') + '</button>' +
      '<button class="btn btn--ghost btn--sm ma-hapus" data-act="rd-hapus" ' +
        'data-id="' + x.id + '">🗑</button>' +
    '</div>';
  }

  function dialogRonda(id) {
    var k = korp();
    var x = id ? RONDA.satu(id) : null;
    var a = MCS.area(k.id), p = MCS.pekerja(k.id);
    /* Titik boleh area atau objek. Objek diberi awalan nama areanya supaya
       'Bilik 1' dari tiga toilet berbeda tidak jadi tiga pilihan kembar. */
    var pilihan = [];
    a.forEach(function (y) {
      pilihan.push({ value: 'area:' + y.id,
        label: MCS.jenisArea(y.jenis).ikon + ' ' + y.nama });
      MCS.objek(y.id).forEach(function (o) {
        pilihan.push({ value: 'objek:' + o.id,
          label: '　↳ ' + MCS.jenisObjek(o.jenis).ikon + ' ' + y.nama + ' — ' + o.nama });
      });
    });
    var terpilih = ((x && x.titik) || []).map(function (t) { return t.jenis + ':' + t.id; });

    UI.formModal({
      title: x ? T('Ubah rute ronda') : T('Rute ronda baru'),
      sub: U.esc(k.nama), size: 'wide', okText: x ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama rute'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Keliling toilet lantai 1–5') },
        { type: 'html', html: '<div class="field"><label>' + T('Titik rute, berurutan') +
          '</label><div class="rd-pilih">' + pilihan.map(function (o) {
            var i = terpilih.indexOf(o.value);
            return '<label class="rd-p' + (i >= 0 ? ' on' : '') + '">' +
              '<input type="checkbox" name="titik" data-multi="1" value="' +
              U.esc(o.value) + '"' + (i >= 0 ? ' checked' : '') + '>' +
              '<span>' + U.esc(o.label) + '</span></label>';
          }).join('') + '</div>' +
          '<div class="hint">' + T('Urutan rute mengikuti urutan daftar ini, dari ' +
            'atas ke bawah. Untuk mengubah urutannya, ubah urutan areanya di ' +
            'halaman Area.') + '</div></div>' },
        { name: 'pekerjaId', label: T('Petugas'), type: 'select',
          value: x ? (x.pekerjaId || '') : '',
          options: [{ value: '', label: '— ' + T('siapa pun yang bertugas') + ' —' }]
            .concat(p.map(function (y) { return { value: y.id, label: y.nama }; })),
          hint: T('Kosongkan bila rondanya bergiliran — yang memindai pertama ' +
            'tercatat sebagai pelaksananya.') },
        { name: 'jam', label: T('Jam berangkat'), value: x ? (x.jam || []).join(', ') : '08:00, 13:00',
          hint: T('Pisahkan dengan koma. Ronda berangkat pada jam-jam ini.') },
        { name: 'durasiMenit', label: T('Durasi rencana (menit)'), type: 'number', min: 1,
          value: x ? x.durasiMenit : 30 },
        { name: 'toleransiMenit', label: T('Toleransi (menit)'), type: 'number', min: 0,
          value: x ? x.toleransiMenit : 15,
          hint: T('Jendela pemindaian ditutup setelah durasi + toleransi. Pemindaian ' +
            'di luar jendela tidak dipaksa masuk — memaksanya melahirkan ronda ' +
            'yang tidak pernah diberangkatkan siapa pun.') },
        { name: 'minDetik', label: T('Jarak minimal antartitik (detik)'), type: 'number', min: 0,
          value: x ? x.minDetik : RONDA.MIN_DETIK_BAWAAN,
          hint: T('Di bawah ini ditandai “terlalu cepat”. Sengaja longgar: menandai ' +
            'yang benar sebagai curang jauh lebih merusak daripada melewatkan ' +
            'yang curang.') },
        { type: 'html', html: '<div class="field"><label>' + T('Hari') + '</label>' +
          '<div class="kh-alg">' + MCS.HARI.map(function (nm, i) {
            var on = x ? (x.hari || []).indexOf(i) >= 0 : [1,2,3,4,5].indexOf(i) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="hari" data-multi="1" value="' + i + '"' +
              (on ? ' checked' : '') + '><span>' + U.esc(T(nm).slice(0, 3)) + '</span></label>';
          }).join('') + '</div></div>' },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2,
          value: x ? x.catatan : '' },
        { name: 'aktif', label: T('Rute berjalan'), type: 'checkbox',
          value: x ? x.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      d.titik = [].concat(d.titik || []).map(function (v) {
        var b = String(v).split(':');
        return { jenis: b[0], id: b[1] };
      });
      d.hari = [].concat(d.hari || []).map(Number);
      d.jam = String(d.jam || '').split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return /^\d{1,2}:\d{2}$/.test(s); })
        .map(function (s) { return s.length === 4 ? '0' + s : s; });
      var r = x ? RONDA.ubah(id, d) : RONDA.buat(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Rute diperbarui') : T('Rute ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  function cetakPapan() {
    var k = korp();
    if (!k) return;
    var tgl = rdTgl || U.today();
    cetakDaftar({
      judul: T('Papan Ronda'),
      sub: U.tglPanjang(tgl),
      baris: RONDA.papanHari(k.id, tgl),
      kolom: [
        { h: T('Jam'), r: function (b) { return b.jam; } },
        { h: T('Rute'), r: function (b) { return b.ronda.nama; } },
        { h: T('Titik'), num: true, r: function (b) { return (b.ronda.titik || []).length; } },
        { h: T('Terpindai'), num: true, r: function (b) {
          return b.jalan ? (b.jalan.titik || []).length : 0; } },
        { h: T('Petugas'), r: function (b) {
          var p = b.jalan && b.jalan.pekerjaId ? MCS.pekerjaSatu(b.jalan.pekerjaId) : null;
          return p ? p.nama : '—'; } },
        { h: T('Mulai'), r: function (b) {
          return b.jalan && b.jalan.mulaiAt ? U.jam(b.jalan.mulaiAt) : '—'; } },
        { h: T('Selesai'), r: function (b) {
          return b.jalan && b.jalan.selesaiAt ? U.jam(b.jalan.selesaiAt) : '—'; } },
        { h: T('Menit'), num: true, r: function (b) {
          return b.jalan && b.jalan.menitPakai ? b.jalan.menitPakai : ''; } },
        { h: T('Status'), r: function (b) {
          return b.status === 'akan' ? T('Belum waktunya') : T(RONDA.status(b.status).nama); } },
        { h: T('Tanda'), r: function (b) {
          return b.jalan ? (b.jalan.tanda || []).map(function (kd) {
            return T(RONDA.tanda(kd).nama); }).join(', ') : ''; } },
        { h: T('Paraf penyelia'), r: function () { return ''; } }
      ],
      kaki: T('Tanda bukan tuduhan — ia penunjuk ke mana penyelia harus bertanya.')
    });
  }

  function mountRonda(root) {
    delegasi(root, {
      'rd-tab': function (el) { rdTab = el.getAttribute('data-key'); APP.refresh(); },
      'rd-kini': function () { rdTgl = null; APP.refresh(); },
      'rd-tgl': function (el) {
        var d = new Date((rdTgl || U.today()) + 'T00:00:00');
        d.setDate(d.getDate() + (+el.getAttribute('data-d')));
        var baru = U.iso(d);
        if (baru > U.today()) return;
        rdTgl = baru === U.today() ? null : baru;
        APP.refresh();
      },
      'rd-baru': function () { dialogRonda(null); },
      'rd-ubah': function (el) { dialogRonda(el.getAttribute('data-id')); },
      'rd-cetak': cetakPapan,
      'rd-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = RONDA.satu(id);
        UI.konfirm({ title: T('Hapus rute') + '?', danger: true,
          text: (x ? x.nama + '. ' : '') +
            T('Seluruh riwayat perjalanannya ikut terhapus. Bila hanya ingin ' +
              'menghentikannya, matikan “Rute berjalan” lewat Ubah.')
        }).then(function (ya) {
          if (!ya) return;
          RONDA.hapus(id);
          UI.toast(T('Rute dihapus.'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ====================================================== BIAYA PER AREA

     Toilet yang menghabiskan tiga kali lipat biaya lobi per meter persegi
     bukan pemborosan — memang begitu sifatnya. Yang tidak wajar adalah dua
     toilet berukuran sama dengan selisih biaya empat kali, dan itu tidak akan
     pernah terlihat tanpa perhitungan per area.
   */

  var k3Saring = 'terbuka', k3Buka = null;

  function renderK3() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = K3.statistik(k.id);
    var l = K3.insiden(k.id, { semua: k3Saring === 'semua' });
    var tabrak = K3.bahanBertabrakan(k.id);

    return catatanK3() +
      peringatanBahan(tabrak) +
      ringkasK3(st) +
      (st.perSebab.length ? kartuSebab(st) : '') +
      '<div class="row between mb-3">' +
        UI.tabs([{ key: 'terbuka', label: T('Belum ditutup'), n: st.terbuka },
                 { key: 'semua', label: T('Semua'), n: st.total }],
                k3Saring, 'k3-saring') +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="k3-cetak">🖨️ ' +
            T('Cetak daftar') + '</button>' +
          '<button class="btn btn--primary btn--sm" data-act="k3-baru">＋ ' +
            T('Laporkan Kejadian') + '</button>' +
        '</div>' +
      '</div>' +
      (l.length
        ? '<div class="wk-list">' + l.map(barisInsiden).join('') + '</div>'
        : UI.empty('🦺', T('Belum ada laporan'),
            T('Termasuk nyaris celaka — justru itu yang paling berguna dicatat, ' +
              'karena mencatatnya tidak menunggu ada yang cedera dulu.')));
  }

  /* Batas kemampuan modul ini disebut di layar. Yang memakainya sebagai bukti
     kepatuhan hukum tanpa memeriksa aturan setempat sedang salah memakainya. */

  function catatanK3() {
    return UI.alert('warn',
      '<b>' + T('Ini catatan internal, bukan laporan resmi.') + '</b> ' +
      T('Kewajiban melaporkan kecelakaan kerja punya formulir dan tenggatnya ' +
        'sendiri menurut aturan setempat — di Indonesia antara lain ke BPJS ' +
        'Ketenagakerjaan. Isian di sini cukup untuk mengisi formulir resmi itu, ' +
        'tetapi bukan penggantinya.'), '⚖️') + '<div class="mb-3"></div>';
  }

  /**
   * Peringatan bahan yang tidak boleh bertemu.
   *
   * Ditaruh PALING ATAS dan berwarna bahaya, bukan disembunyikan di halaman
   * persediaan: pemutih klorin yang bertemu pembersih porselen berbasis asam
   * melepaskan gas klorin, dan itu kecelakaan yang terjadi berulang justru
   * karena keduanya duduk di troli yang sama.
   */

  function peringatanBahan(tabrak) {
    if (!tabrak.length) return '';
    return UI.alert('danger',
      '<b>' + T('Ada bahan di gudang yang tidak boleh dicampur.') + '</b>' +
      tabrak.map(function (t) {
        return '<div class="k3-tabrak">' +
          '<span>' + t.a.ikon + ' ' + U.esc(t.kiri.map(function (x) { return x.nama; }).join(', ')) + '</span>' +
          '<i>✕</i>' +
          '<span>' + t.b.ikon + ' ' + U.esc(t.kanan.map(function (x) { return x.nama; }).join(', ')) + '</span>' +
          '<em>' + U.esc(T(t.a.jangan || t.b.jangan)) + '</em>' +
        '</div>';
      }).join(''), '☣️') + '<div class="mb-3"></div>';
  }

  function ringkasK3(st) {
    return '<div class="grid g-4 mb-3">' +
        /* Angka yang dipasang di papan pengumuman gudang di seluruh dunia,
           dan satu-satunya angka keselamatan yang dibaca orang tiap hari. */
        UI.stat({ label: T('Hari tanpa cedera'),
          value: st.hariAman === null ? '—' : st.hariAman, icon: '🛡️',
          meta: st.cederaTerakhir
            ? T('terakhir') + ' ' + U.tglPendek(st.cederaTerakhir)
            : T('belum pernah ada laporan cedera') }) +
        UI.stat({ label: T('Nyaris celaka'), value: st.nyaris, icon: '⚠️',
          meta: T('dicatat sebelum ada yang cedera') }) +
        UI.stat({ label: T('Cedera'), value: st.cedera + st.berat + st.kimia, icon: '🩹',
          meta: st.hariHilang
            ? jml(st.hariHilang, '1 hari kerja hilang', '{n} hari kerja hilang') : '' }) +
        UI.stat({ label: T('Belum ditutup'), value: st.terbuka, icon: '📥',
          meta: st.tanpaPencegahan
            ? jml(st.tanpaPencegahan, '1 ditutup tanpa pencegahan',
                '{n} ditutup tanpa pencegahan') : '' }) +
      '</div>';
  }

  function kartuSebab(st) {
    return UI.card({ cls: 'mb-3', title: T('Sebab terbanyak'),
      sub: T('Pola baru terbaca setelah puluhan laporan — jangan disimpulkan terlalu cepat'),
      body: Chart.batang({
        warna: Chart.WARNA.s2,
        sumber: { teks: T('Sebab yang dipilih petugas ketika mencatat ' +
          'ketidakhadiran. Satu kejadian dihitung sekali, walaupun ' +
          'menutup banyak area.'), hal: 'mcsAbsensi' },
        satuan: function (n) { return jml(n, '1 kejadian', '{n} kejadian'); },
        data: st.perSebab.map(function (s) {
          return { nama: T(s.sebab.nama), nilai: s.n }; })
      }) });
  }

  function barisInsiden(x) {
    var jn = K3.jenis(x.jenis);
    var s = K3.status(x.status);
    var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
    var p = x.pekerjaId ? MCS.pekerjaSatu(x.pekerjaId) : null;
    var terbuka = k3Buka === x.id;

    return '<div class="wk-r' + (jn.warna === 'danger' ? ' wk-r--lewat' : '') + '">' +
      '<button class="wk-r__h" data-act="k3-buka" data-id="' + x.id + '" ' +
        'aria-expanded="' + terbuka + '">' +
        '<span class="wk-r__i">' + jn.ikon + '</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(T(jn.nama)) + ' · ' + U.esc(x.no) + '</b>' +
          '<span>' + U.esc(U.tglPendek(x.tgl)) + (x.jam ? ' ' + U.esc(x.jam) : '') +
            (a ? ' · ' + U.esc(a.nama) : '') +
            (p ? ' · ' + U.esc(p.nama) : ' · ' + T('tanpa nama petugas')) +
          '</span>' +
          '<span class="k3-r__u">' + U.esc(x.uraian) + '</span>' +
        '</span>' +
        '<span class="chip chip--' + s.warna + '">' + s.ikon + ' ' + T(s.nama) + '</span>' +
        '<span class="wk-r__x">' + (terbuka ? '▾' : '▸') + '</span>' +
      '</button>' +
      (terbuka ? rincianInsiden(x) : '') +
    '</div>';
  }

  function rincianInsiden(x) {
    var apdPakai = (x.apdDipakai || []).map(function (kode) {
      var a = K3.apd(kode); return a.ikon + ' ' + T(a.nama); });

    return '<div class="wk-d">' +
      '<p class="wk-d__u">' + U.esc(x.uraian) + '</p>' +
      '<div class="wk-d__k">' +
        kvKerja(T('Sebab'), T((K3.SEBAB.filter(function (s) {
          return s.kode === x.sebab; })[0] || {}).nama || '—')) +
        kvKerja(T('Dilaporkan oleh'), x.olehNama || '—') +
        kvKerja(T('APD yang dipakai'), apdPakai.length ? apdPakai.join(', ') : T('tidak dicatat')) +
        kvKerja(T('Hari kerja hilang'), x.hariHilang ? String(x.hariHilang) : '—') +
      '</div>' +
      (x.tindakanSegera
        ? '<div class="k3-d__b"><b>' + T('Tindakan saat itu juga') + '</b>' +
          '<p>' + U.esc(x.tindakanSegera) + '</p></div>' : '') +
      (x.akarMasalah
        ? '<div class="k3-d__b"><b>' + T('Akar masalah') + '</b>' +
          '<p>' + U.esc(x.akarMasalah) + '</p></div>' : '') +
      (x.pencegahan
        ? '<div class="k3-d__b k3-d__b--cegah"><b>' + T('Apa yang diubah') + '</b>' +
          '<p>' + U.esc(x.pencegahan) + '</p></div>' : '') +
      ((x.foto || []).length
        ? '<div class="wk-d__f">' + (x.foto || []).map(function (f) {
            var src = DB.getPhoto(f);
            return src ? '<img src="' + U.esc(src) + '" data-act="zoom" data-id="' + f + '">' : '';
          }).join('') + '</div>'
        : '') +
      '<div class="wk-d__b">' +
        (x.status === 'dilaporkan'
          ? '<button class="btn btn--sm" data-act="k3-tangani" data-id="' + x.id + '">🛠️ ' +
            T('Sedang ditangani') + '</button>' : '') +
        (x.status !== 'ditutup'
          ? '<button class="btn btn--primary btn--sm" data-act="k3-tutup" data-id="' + x.id + '">✅ ' +
            T('Tutup laporan') + '</button>' : '') +
        '<button class="btn btn--ghost btn--sm" data-act="k3-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="k3-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div>' +
    '</div>';
  }

  function dialogInsiden(id) {
    var k = korp();
    var x = id ? K3.insidenSatu(id) : null;
    var a = MCS.area(k.id), p = MCS.pekerja(k.id);

    UI.formModal({
      title: x ? T('Ubah laporan') : T('Laporkan kejadian'),
      sub: x ? x.no : U.esc(k.nama), size: 'wide',
      okText: x ? T('Simpan') : T('Laporkan'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Laporkan juga yang NYARIS terjadi. Laporan nyaris celaka tidak ' +
              'menghukum siapa pun — ia satu-satunya cara mencegah kejadian ' +
              'berikutnya sebelum ada yang cedera.'), '⚠️') },
        { name: 'jenis', label: T('Apa yang terjadi'), type: 'select',
          value: x ? x.jenis : 'nyaris',
          options: K3.JENIS.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }) },
        { name: 'sebab', label: T('Sebabnya'), type: 'select', value: x ? x.sebab : 'licin',
          options: K3.SEBAB.map(function (s) {
            return { value: s.kode, label: T(s.nama) }; }) },
        { name: 'tgl', label: T('Tanggal'), type: 'date', value: x ? x.tgl : U.today() },
        { name: 'jam', label: T('Perkiraan jam'), value: x ? x.jam : '',
          placeholder: '14:30' },
        { name: 'areaId', label: T('Di mana'), type: 'select', value: x ? (x.areaId || '') : '',
          options: [{ value: '', label: '— ' + T('tidak di area tertentu') + ' —' }]
            .concat(a.map(function (y) {
              return { value: y.id, label: MCS.jenisArea(y.jenis).ikon + ' ' + y.nama }; })) },
        { name: 'pekerjaId', label: T('Siapa yang terlibat'), type: 'select',
          value: x ? (x.pekerjaId || '') : '',
          options: [{ value: '', label: '— ' + T('tidak disebutkan') + ' —' }]
            .concat(p.map(function (y) { return { value: y.id, label: y.nama }; })),
          hint: T('Boleh dikosongkan. Laporan nyaris celaka yang menuntut nama ' +
            'akan berhenti masuk.') },
        { name: 'uraian', label: T('Ceritakan kejadiannya'), type: 'textarea', rows: 3,
          value: x ? x.uraian : '', required: true,
          placeholder: T('mis. Tanda lantai basah belum dipasang, penghuni hampir jatuh ' +
            'di dekat lift lantai 2.') },
        { name: 'tindakanSegera', label: T('Apa yang langsung dilakukan'), type: 'textarea',
          rows: 2, value: x ? x.tindakanSegera : '' },
        { name: 'hariHilang', label: T('Hari kerja yang hilang'), type: 'number', min: 0,
          value: x ? x.hariHilang : 0,
          hint: T('Isi 0 bila petugas tetap bekerja.') },
        { type: 'html', html: '<div class="field"><label>' + T('APD yang sedang dipakai') +
          '</label><div class="kh-alg">' + K3.APD.map(function (ap) {
            var on = x && (x.apdDipakai || []).indexOf(ap.kode) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="apdDipakai" data-multi="1" value="' + ap.kode + '"' +
              (on ? ' checked' : '') + '><span>' + ap.ikon + ' ' + U.esc(T(ap.nama)) + '</span></label>';
          }).join('') + '</div>' +
          '<div class="hint">' + T('Kosong berarti tidak dicatat, bukan berarti tidak dipakai.') +
          '</div></div>' }
      ]
    }).then(function (d) {
      if (!d) return;
      d.apdDipakai = [].concat(d.apdDipakai || []);
      var r = x ? K3.ubahInsiden(id, d) : K3.lapor(k.id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Laporan diperbarui') : T('Laporan tercatat') +
        (r.insiden ? ' · ' + r.insiden.no : ''), 'ok');
      APP.refresh();
    });
  }

  function dialogTutupK3(id) {
    var x = K3.insidenSatu(id);
    if (!x) return;
    UI.formModal({
      title: T('Tutup laporan'), sub: x.no, okText: T('Tutup laporan'),
      fields: [
        { type: 'html', html: UI.alert('warn',
            T('Laporan yang ditutup dengan “sudah dibersihkan” tidak mencegah apa pun. ' +
              'Dua pertanyaan ini yang mencegah kejadian berikutnya.'), '🛠️') },
        { name: 'akarMasalah', label: T('Kenapa ini terjadi'), type: 'textarea', rows: 3,
          required: true, value: x.akarMasalah,
          placeholder: T('mis. Tanda lantai basah hanya ada dua untuk lima lantai.') },
        { name: 'pencegahan', label: T('Apa yang diubah supaya tidak terulang'),
          type: 'textarea', rows: 3, required: true, value: x.pencegahan,
          placeholder: T('mis. Dibelikan enam tanda tambahan; dimasukkan ke langkah ' +
            'wajib pada checklist area basah.') },
        { name: 'hariHilang', label: T('Hari kerja yang hilang'), type: 'number', min: 0,
          value: x.hariHilang || 0 }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = K3.tutupInsiden(id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Laporan ditutup.'), 'ok');
      APP.refresh();
    });
  }

  function cetakDaftarK3() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Daftar Kejadian Keselamatan Kerja'),
      sub: k3Saring === 'semua' ? T('Semua laporan') : T('Yang belum ditutup'),
      baris: K3.insiden(k.id, { semua: k3Saring === 'semua' }),
      kolom: [
        { h: T('No'), r: function (x) { return x.no; } },
        { h: T('Tanggal'), r: function (x) { return x.tgl + (x.jam ? ' ' + x.jam : ''); } },
        { h: T('Jenis'), r: function (x) { return T(K3.jenis(x.jenis).nama); } },
        { h: T('Sebab'), r: function (x) {
          var s = K3.SEBAB.filter(function (y) { return y.kode === x.sebab; })[0];
          return s ? T(s.nama) : ''; } },
        { h: T('Lokasi'), r: function (x) {
          var a = x.areaId ? MCS.areaSatu(x.areaId) : null; return a ? a.nama : '—'; } },
        { h: T('Petugas'), r: function (x) {
          var p = x.pekerjaId ? MCS.pekerjaSatu(x.pekerjaId) : null; return p ? p.nama : '—'; } },
        { h: T('Kejadian'), r: function (x) { return x.uraian; } },
        { h: T('Akar masalah'), r: function (x) { return x.akarMasalah || ''; } },
        { h: T('Pencegahan'), r: function (x) { return x.pencegahan || ''; } },
        { h: T('Hari hilang'), num: true, r: function (x) { return x.hariHilang || ''; } },
        { h: T('Status'), r: function (x) { return T(K3.status(x.status).nama); } }
      ],
      kaki: T('Catatan internal. Kewajiban pelaporan resmi punya formulir dan ' +
        'tenggatnya sendiri menurut aturan setempat.')
    });
  }

  function mountK3(root) {
    Chart.pasang(root);
    delegasi(root, {
      'k3-saring': function (el) { k3Saring = el.getAttribute('data-key'); APP.refresh(); },
      'k3-buka': function (el) {
        var id = el.getAttribute('data-id');
        k3Buka = k3Buka === id ? null : id;
        APP.refresh();
      },
      'k3-baru': function () { dialogInsiden(null); },
      'k3-ubah': function (el) { dialogInsiden(el.getAttribute('data-id')); },
      'k3-tangani': function (el) {
        K3.tanganiInsiden(el.getAttribute('data-id'));
        APP.refresh();
      },
      'k3-tutup': function (el) { dialogTutupK3(el.getAttribute('data-id')); },
      'k3-cetak': cetakDaftarK3,
      'k3-hapus': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus laporan') + '?', danger: true,
          text: T('Catatan keselamatan sebaiknya TIDAK dihapus — pola bahaya baru ' +
            'terbaca setelah puluhan laporan terkumpul. Hapus hanya bila laporannya ' +
            'memang salah masuk.') }).then(function (ya) {
          if (!ya) return;
          K3.hapusInsiden(id);
          UI.toast(T('Laporan dihapus.'), 'ok');
          APP.refresh();
        });
      },
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    });
  }

  /* ============================================ PEKERJAAN TAMBAHAN (WO)

     Jenis pekerjaan KETIGA, di samping jadwal berulang dan aduan penghuni:
     yang diminta, mungkin perlu disetujui, punya biaya, dan sering ditagih
     terpisah. Sebelumnya tidak tercatat di mana pun.
   */

  var wkSaring = 'terbuka', wkBuka = null;

  function renderKerja() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = KERJA.statistik(k.id);
    var l = KERJA.semua(k.id, { semua: wkSaring === 'semua' });

    return UI.alert('info',
        '<b>' + T('Pekerjaan tambahan berbeda dari jadwal dan dari aduan.') + '</b> ' +
        T('Jadwal sudah disepakati dan berulang. Aduan datang dari penghuni dan ' +
          'tidak boleh menunggu persetujuan. Yang di sini DIMINTA, punya biaya, ' +
          'dan sering ditagih terpisah — karena itu ada tahap persetujuannya.'),
        '🧰') + '<div class="mb-3"></div>' +

      (st.lewatTarget
        ? UI.alert('danger', '<b>' + jml(st.lewatTarget,
            T('1 pekerjaan lewat tanggal yang dijanjikan'),
            T('{n} pekerjaan lewat tanggal yang dijanjikan')) + '.</b> ' +
            T('Yang dinilai terlambat adalah janjinya kepada peminta, bukan ' +
              'jadwal internal.'), '⏰') + '<div class="mb-3"></div>'
        : '') +

      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Menunggu keputusan'), value: st.diminta, icon: '📥' }) +
        UI.stat({ label: T('Sedang berjalan'), value: st.disetujui + st.dikerjakan, icon: '🧹' }) +
        UI.stat({ label: T('Selesai'), value: st.selesai, icon: '🏁' }) +
        UI.stat({ label: T('Biaya selesai'), value: U.rpShort(st.biaya), icon: '💰',
          meta: st.perkiraan
            ? T('perkiraan') + ' ' + U.rpShort(st.perkiraan)
            : T('belum ada perkiraan') }) +
      '</div>' +

      '<div class="row between mb-3">' +
        UI.tabs([{ key: 'terbuka', label: T('Berjalan'), n: st.terbuka },
                 { key: 'semua', label: T('Semua'), n: st.total }],
                wkSaring, 'wk-saring') +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="wk-cetak">🖨️ ' +
            T('Cetak daftar') + '</button>' +
          '<button class="btn btn--primary btn--sm" data-act="wk-baru">＋ ' +
            T('Permintaan Baru') + '</button>' +
        '</div>' +
      '</div>' +

      (l.length
        ? '<div class="wk-list">' + l.map(barisKerja).join('') + '</div>'
        : UI.empty('🧰', T('Belum ada permintaan'),
            T('Cuci karpet, poles lantai, tumpahan darurat, persiapan acara — ' +
              'semua yang di luar jadwal rutin dicatat di sini.')));
  }

  function barisKerja(x) {
    var s = KERJA.status(x.status);
    var jn = KERJA.jenis(x.jenis);
    var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
    var terbuka = wkBuka === x.id;
    var lewat = KERJA.TERBUKA.indexOf(x.status) >= 0 && x.target && x.target < U.today();

    return '<div class="wk-r' + (lewat ? ' wk-r--lewat' : '') + '">' +
      '<button class="wk-r__h" data-act="wk-buka" data-id="' + x.id + '" ' +
        'aria-expanded="' + terbuka + '">' +
        '<span class="wk-r__i">' + jn.ikon + '</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(x.judul) + '</b>' +
          '<span>' + U.esc(x.no) + ' · ' + U.esc(T(jn.nama)) +
            (a ? ' · ' + U.esc(a.nama) : ' · ' + T('seluruh gedung')) +
            (x.target ? ' · ' + T('dijanjikan') + ' ' + U.esc(U.tglPendek(x.target)) : '') +
          '</span>' +
          (lewat ? '<span class="mcs-warn">⏰ ' + T('lewat tanggal yang dijanjikan') + '</span>' : '') +
        '</span>' +
        '<span class="chip chip--' + s.warna + '">' + s.ikon + ' ' + T(s.nama) + '</span>' +
        '<span class="wk-r__x">' + (terbuka ? '▾' : '▸') + '</span>' +
      '</button>' +
      (terbuka ? rincianKerja(x) : '') +
    '</div>';
  }

  function rincianKerja(x) {
    var s = KERJA.status(x.status);
    var lanjut = { diminta: ['disetujui', 'ditolak'], disetujui: ['dikerjakan', 'ditolak'],
                   dikerjakan: ['selesai', 'ditolak'], selesai: [], ditolak: ['diminta'] }[x.status] || [];
    var petugas = (x.pekerjaIds || []).map(function (id) {
      var p = MCS.pekerjaSatu(id); return p ? p.nama : ''; }).filter(Boolean);

    return '<div class="wk-d">' +
      (x.uraian ? '<p class="wk-d__u">' + U.esc(x.uraian) + '</p>' : '') +

      '<div class="wk-d__k">' +
        kvKerja(T('Diminta oleh'), x.pemintaNama || x.dimintaOlehNama || '—') +
        kvKerja(T('Sumber'), T((KERJA.ASAL.filter(function (a) {
          return a.kode === x.asal; })[0] || {}).nama || '—')) +
        kvKerja(T('Waktu masuk'), U.tglJam(x.diminta)) +
        kvKerja(T('Dijanjikan'), x.target ? U.tglPanjang(x.target) : T('tanpa tanggal')) +
        kvKerja(T('Petugas'), petugas.length ? petugas.join(', ') : T('belum ditugaskan')) +
        /* Perkiraan dan realisasi berdiri BERDAMPINGAN. Satu kolom yang
           ditimpa menghapus satu-satunya angka yang berguna: selisihnya. */
        kvKerja(T('Perkiraan biaya'), x.perkiraanBiaya ? U.rp(x.perkiraanBiaya) : '—') +
        (x.status === 'selesai'
          ? kvKerja(T('Biaya sebenarnya'), x.biaya ? U.rp(x.biaya) : '—',
              x.perkiraanBiaya && x.biaya ? selisihTeks(x.biaya - x.perkiraanBiaya) : '')
          : '') +
        kvKerja(T('Perkiraan jam'), x.perkiraanJam ? x.perkiraanJam + ' ' + T('jam') : '—') +
        (x.status === 'selesai'
          ? kvKerja(T('Jam sebenarnya'), x.jamKerja ? x.jamKerja + ' ' + T('jam') : '—')
          : '') +
        (x.aduanId ? kvKerja(T('Naik dari aduan'), T('ya')) : '') +
      '</div>' +

      ((x.foto || []).length || (x.fotoHasil || []).length
        ? '<div class="wk-d__f">' +
          (x.foto || []).map(function (f) {
            var src = DB.getPhoto(f); return src
              ? '<img src="' + U.esc(src) + '" data-act="zoom" data-id="' + f + '" ' +
                'title="' + U.esc(T('Saat diminta')) + '">' : ''; }).join('') +
          (x.fotoHasil || []).map(function (f) {
            var src = DB.getPhoto(f); return src
              ? '<img class="wk-d__hasil" src="' + U.esc(src) + '" data-act="zoom" ' +
                'data-id="' + f + '" title="' + U.esc(T('Hasil')) + '">' : ''; }).join('') +
          '</div>'
        : '') +

      (x.catatanTutup
        ? '<div class="wk-d__c">' + U.esc(x.catatanTutup) + '</div>' : '') +

      /* Riwayat keputusan, bukan hanya keadaan terakhir. Pekerjaan yang
         ditolak lalu disetujui lagi adalah jenis perubahan yang paling
         sering dipertanyakan belakangan. */
      '<div class="wk-d__rw">' + (x.riwayat || []).map(function (r) {
        var rs = KERJA.status(r.status);
        return '<div>' + rs.ikon + ' <b>' + T(rs.nama) + '</b> · ' +
          U.esc(U.tglJam(r.pada)) + (r.olehNama ? ' · ' + U.esc(r.olehNama) : '') +
          (r.catatan ? ' — ' + U.esc(r.catatan) : '') + '</div>';
      }).join('') + '</div>' +

      '<div class="wk-d__b">' +
        lanjut.map(function (kode) {
          var ks = KERJA.status(kode);
          return '<button class="btn btn--' + (kode === 'ditolak' ? /* i18n:data */ 'ghost ma-hapus' /* i18n:/data */ : 'primary') +
            ' btn--sm" data-act="wk-tahap" data-id="' + x.id + '" data-s="' + kode + '">' +
            ks.ikon + ' ' + T(ks.nama) + '</button>';
        }).join('') +
        '<button class="btn btn--ghost btn--sm" data-act="wk-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="wk-surat" data-id="' + x.id + '">🖨️ ' +
          T('Surat perintah') + '</button>' +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="wk-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div>' +
    '</div>';
  }

  function selisihTeks(d) {
    if (!d) return '';
    return '<i class="wk-selisih wk-selisih--' + (d > 0 ? 'lebih' : 'kurang') + '">' +
      (d > 0 ? '+' : '−') + U.rpShort(Math.abs(d)) + '</i>';
  }

  function dialogKerja(id) {
    var k = korp();
    var x = id ? KERJA.satu(id) : null;
    var a = MCS.area(k.id), p = MCS.pekerja(k.id);

    UI.formModal({
      title: x ? T('Ubah permintaan') : T('Permintaan pekerjaan baru'),
      sub: x ? x.no : U.esc(k.nama), size: 'wide',
      okText: x ? T('Simpan') : T('Ajukan'),
      fields: [
        { name: 'judul', label: T('Pekerjaan apa'), value: x ? x.judul : '', required: true,
          placeholder: T('mis. Cuci karpet ruang rapat lantai 8') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: x ? x.jenis : 'lain',
          options: KERJA.JENIS.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }) },
        { name: 'areaId', label: T('Area'), type: 'select', value: x ? (x.areaId || '') : '',
          options: [{ value: '', label: '— ' + T('seluruh gedung') + ' —' }]
            .concat(a.map(function (y) {
              return { value: y.id, label: MCS.jenisArea(y.jenis).ikon + ' ' + y.nama }; })),
          hint: T('Boleh dikosongkan. Cuci kaca seluruh gedung bukan milik satu area.') },
        { name: 'uraian', label: T('Uraian'), type: 'textarea', rows: 3,
          value: x ? x.uraian : '' },

        { type: 'html', html: '<div class="mcs-fs">' + T('Janji & perkiraan') +
          '<span>' + T('Yang dinilai terlambat adalah tanggal yang dijanjikan') + '</span></div>' },
        { name: 'target', label: T('Dijanjikan selesai'), type: 'date',
          value: x ? (x.target || '') : '' },
        { name: 'perkiraanBiaya', label: T('Perkiraan biaya'), type: 'number', min: 0,
          value: x ? x.perkiraanBiaya : '',
          hint: T('Biaya sebenarnya diisi saat pekerjaan ditutup — selisihnya ' +
            'itulah yang berguna.') },
        { name: 'perkiraanJam', label: T('Perkiraan jam kerja'), type: 'number', min: 0,
          value: x ? x.perkiraanJam : '' },

        { type: 'html', html: '<div class="mcs-fs">' + T('Peminta') + '</div>' },
        { name: 'asal', label: T('Sumber permintaan'), type: 'select',
          value: x ? x.asal : 'internal',
          options: KERJA.ASAL.map(function (s) {
            return { value: s.kode, label: T(s.nama) }; }) },
        { name: 'pemintaNama', label: T('Nama peminta'), value: x ? x.pemintaNama : '',
          hint: T('Kosongkan bila Anda sendiri yang meminta.') },
        { name: 'pemintaKontak', label: T('Kontak peminta'), value: x ? x.pemintaKontak : '' },

        { type: 'html', html: '<div class="mcs-fs">' + T('Penugasan') + '</div>' },
        { type: 'html', html: '<div class="field"><label>' + T('Petugas') + '</label>' +
          '<div class="kh-alg">' + p.map(function (y) {
            var on = x && (x.pekerjaIds || []).indexOf(y.id) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="pekerjaIds" data-multi="1" value="' + y.id + '"' +
              (on ? ' checked' : '') + '><span>' + U.esc(y.nama) + '</span></label>';
          }).join('') + '</div></div>' }
      ]
    }).then(function (d) {
      if (!d) return;
      d.pekerjaIds = [].concat(d.pekerjaIds || []);
      var r = x ? KERJA.ubah(id, d) : KERJA.buat(k.id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Permintaan diperbarui') : T('Permintaan diajukan') +
        (r.kerja ? ' · ' + r.kerja.no : ''), 'ok');
      APP.refresh();
    });
  }

  /**
   * Perpindahan tahap. Yang menutup pekerjaan diminta angka SEBENARNYA —
   * bukan diminta menyetujui perkiraan yang sudah ada. Perkiraan yang
   * disalin jadi realisasi membuat seluruh perbandingan biaya jadi tidak
   * berarti sejak hari pertama.
   */

  function dialogTahap(id, kode) {
    var x = KERJA.satu(id);
    if (!x) return;
    var s = KERJA.status(kode);
    var tutup = kode === 'selesai';
    var tolak = kode === 'ditolak';

    UI.formModal({
      title: T(s.nama), sub: x.judul, okText: T(s.nama),
      fields: [
        { type: 'html', html: UI.alert(tolak ? 'warn' : 'info', T(s.ket),
            s.ikon) }
      ].concat(tutup ? [
        { name: 'biaya', label: T('Biaya sebenarnya'), type: 'number', min: 0,
          value: x.biaya || x.perkiraanBiaya || '',
          hint: x.perkiraanBiaya
            ? T('Perkiraan semula') + ' ' + U.rp(x.perkiraanBiaya)
            : T('Tidak ada perkiraan sebelumnya.') },
        { name: 'jamKerja', label: T('Jam kerja sebenarnya'), type: 'number', min: 0,
          value: x.jamKerja || x.perkiraanJam || '' }
      ] : []).concat([
        { name: 'catatan', label: tolak ? T('Alasan penolakan') : T('Catatan'),
          type: 'textarea', rows: 2, required: tolak,
          placeholder: tolak ? T('mis. anggaran tahun ini sudah habis') : '' }
      ])
    }).then(function (d) {
      if (!d) return;
      var r = KERJA.ubahStatus(id, kode, APP.user, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Tahap diperbarui.'), 'ok');
      APP.refresh();
    });
  }

  /** Surat perintah kerja — yang dipegang petugas dan ditandatangani. */

  function suratKerja(id) {
    var x = KERJA.satu(id);
    var k = korp();
    if (!x) return;
    var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
    var petugas = (x.pekerjaIds || []).map(function (pid) {
      var p = MCS.pekerjaSatu(pid); return p ? p.nama : ''; }).filter(Boolean);

    UI.modal({
      title: T('Surat perintah kerja'), sub: x.no, size: 'wide',
      body: '<div class="kp-lembar" id="wk-surat">' +
          '<div class="kp-lembar__kop">' +
            '<div class="kp-lembar__pt">' + U.esc(k.nama) + '</div>' +
            '<div class="kp-lembar__jd">' + T('Surat Perintah Kerja') + '</div>' +
            '<div class="kp-lembar__sub">' + U.esc(x.no) + '</div>' +
          '</div>' +
          '<table class="kp-lembar__id"><tbody>' +
            barisId(T('Pekerjaan'), x.judul) +
            barisId(T('Jenis'), T(KERJA.jenis(x.jenis).nama)) +
            barisId(T('Lokasi'), a ? a.nama +
              [a.gedung, a.lantai ? 'Lt. ' + a.lantai : ''].filter(Boolean)
                .map(function (s) { return ' · ' + s; }).join('') : T('seluruh gedung')) +
            barisId(T('Diminta oleh'), x.pemintaNama || x.dimintaOlehNama || '—') +
            barisId(T('Tanggal permintaan'), U.tglPanjang(String(x.diminta).slice(0, 10))) +
            barisId(T('Dijanjikan selesai'), x.target ? U.tglPanjang(x.target) : T('tanpa tanggal')) +
            barisId(T('Petugas'), petugas.length ? petugas.join(', ') : T('belum ditugaskan')) +
            barisId(T('Perkiraan biaya'), x.perkiraanBiaya ? U.rp(x.perkiraanBiaya) : '—') +
          '</tbody></table>' +
          (x.uraian
            ? '<div class="wk-surat__u"><b>' + T('Uraian pekerjaan') + '</b>' +
              '<p>' + U.esc(x.uraian) + '</p></div>' : '') +
          '<div class="kp-lembar__tanggap">' +
            '<b>' + T('Catatan pelaksanaan') + '</b>' +
            '<div class="kp-lembar__garis"></div>' +
            '<div class="kp-lembar__garis"></div>' +
            '<div class="kp-lembar__garis"></div>' +
          '</div>' +
          /* Tiga tanda tangan: yang meminta, yang mengerjakan, yang memeriksa.
             Pekerjaan bernilai jutaan yang hanya ditandatangani satu pihak
             adalah pekerjaan yang tidak bisa dipertanggungjawabkan. */
          '<div class="kp-lembar__ttd">' +
            '<div><span>' + T('Diminta oleh') + '</span><i></i><b>' +
              U.esc(x.pemintaNama || x.dimintaOlehNama || '') + '</b></div>' +
            '<div><span>' + T('Dikerjakan oleh') + '</span><i></i><b>' +
              U.esc(petugas[0] || '') + '</b></div>' +
            '<div><span>' + T('Diperiksa oleh') + '</span><i></i><b>' +
              U.esc((APP.user && APP.user.nama) || '') + '</b></div>' +
          '</div>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="wk-surat-cetak">🖨️ ' + T('Cetak surat') + '</button>',
      actions: { 'wk-surat-cetak': function () { cetak('cetak-kp'); } }
    });
  }

  function cetakDaftarKerja() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Daftar Pekerjaan Tambahan'),
      sub: wkSaring === 'semua' ? T('Semua permintaan') : T('Yang masih berjalan'),
      baris: KERJA.semua(k.id, { semua: wkSaring === 'semua' }),
      kolom: [
        { h: T('No'), r: function (x) { return x.no; } },
        { h: T('Waktu masuk'), r: function (x) { return U.tglJam(x.diminta); } },
        { h: T('Pekerjaan'), r: function (x) { return x.judul; } },
        { h: T('Jenis'), r: function (x) { return T(KERJA.jenis(x.jenis).nama); } },
        { h: T('Lokasi'), r: function (x) {
          var a = x.areaId ? MCS.areaSatu(x.areaId) : null;
          return a ? a.nama : T('seluruh gedung'); } },
        { h: T('Diminta oleh'), r: function (x) {
          return x.pemintaNama || x.dimintaOlehNama || '—'; } },
        { h: T('Dijanjikan'), r: function (x) { return x.target || '—'; } },
        { h: T('Status'), r: function (x) { return T(KERJA.status(x.status).nama); } },
        { h: T('Perkiraan'), num: true, r: function (x) {
          return x.perkiraanBiaya ? U.num(x.perkiraanBiaya) : ''; } },
        { h: T('Biaya'), num: true, r: function (x) {
          return x.biaya ? U.num(x.biaya) : ''; } }
      ],
      kaki: T('Kolom Biaya hanya terisi pada pekerjaan yang sudah ditutup.')
    });
  }

  function mountKerja(root) {
    delegasi(root, {
      'wk-saring': function (el) { wkSaring = el.getAttribute('data-key'); APP.refresh(); },
      'wk-buka': function (el) {
        var id = el.getAttribute('data-id');
        wkBuka = wkBuka === id ? null : id;
        APP.refresh();
      },
      'wk-baru': function () { dialogKerja(null); },
      'wk-ubah': function (el) { dialogKerja(el.getAttribute('data-id')); },
      'wk-tahap': function (el) {
        dialogTahap(el.getAttribute('data-id'), el.getAttribute('data-s'));
      },
      'wk-surat': function (el) { suratKerja(el.getAttribute('data-id')); },
      'wk-cetak': cetakDaftarKerja,
      'wk-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = KERJA.satu(id);
        UI.konfirm({ title: T('Hapus permintaan') + '?', danger: true,
          text: (x ? x.no + ' — ' + x.judul + '. ' : '') +
            T('Riwayat keputusannya ikut terhapus.') }).then(function (ya) {
          if (!ya) return;
          KERJA.hapus(id);
          UI.toast(T('Permintaan dihapus.'), 'ok');
          APP.refresh();
        });
      },
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    });
  }

  /* ================================================= PENILAIAN KINERJA

     Halaman ini dipakai untuk memutuskan promosi, bonus, dan kadang hubungan
     kerja. Karena itu ia menampilkan ANGKA PEMBENTUKNYA di samping setiap
     skor — '18 dari 20', bukan '90%' saja. Orang yang tidak setuju dengan
     nilainya berhak melihat dari mana nilainya datang tanpa harus percaya.
   */

  function cetakDaftarAbsensi() {
    var k = korp();
    if (!k) return;
    var tgl = tglAbsen || U.today();
    cetakDaftar({
      judul: T('Daftar Hadir Petugas'),
      sub: U.tglPanjang(tgl),
      baris: MCS.absensiHari(k.id, tgl),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Nama'), r: function (x) { return x.pekerja.nama; } },
        { h: T('Jabatan'), r: function (x) { return T(MCS.jabatan(x.pekerja.jabatan).nama); } },
        { h: T('Shift'), r: function (x) { return namaShift(x.pekerja); } },
        { h: T('Kehadiran'), r: function (x) {
          return x.status ? T(MCS.statusHadir(x.status).nama) : T('belum dicatat'); } },
        { h: T('Pengganti'), r: function (x) { return x.pengganti ? x.pengganti.nama : ''; } },
        { h: T('Catatan'), r: function (x) { return x.catatan || ''; } },
        { h: T('Tanda tangan'), r: function () { return ''; } }
      ],
      kaki: T('Kolom tanda tangan sengaja dikosongkan untuk diisi dengan pena.')
    });
  }

  function cetakDaftarAduan() {
    var k = korp();
    if (!k) return;
    var semua = saringAduan === 'semua';
    cetakDaftar({
      judul: T('Daftar Aduan Penghuni'),
      sub: semua ? T('Semua aduan') : T('Aduan yang masih terbuka'),
      baris: MCS.aduan(k.id, { semua: semua }),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Waktu masuk'), r: function (x) { return U.tglJam(x.pada); } },
        { h: T('Area'), r: function (x) { return namaArea(x.areaId); } },
        { h: T('Kegentingan'), r: function (x) { return T(MCS.genting(x.genting).nama); } },
        { h: T('Isi aduan'), r: function (x) { return x.teks || T('(hanya foto)'); } },
        { h: T('Pelapor'), r: function (x) { return x.pelapor || T('anonim'); } },
        { h: T('Ditangani'), r: function (x) { return namaPekerja(x.pekerjaId) || '—'; } },
        { h: T('Status'), r: function (x) { return T(x.status); } },
        { h: T('Batas waktu'), r: function (x) {
          var sisa = MCS.sisaSLA(x);
          if (sisa === null) return '—';
          return sisa >= 0 ? T('sisa') + ' ' + jamMenit(sisa) : T('lewat') + ' ' + jamMenit(-sisa); } }
      ]
    });
  }

  /* ==================================================== KARTU IDENTITAS

     Dicetak di kertas dan dimasukkan ke sarung tanda pengenal — ukurannya
     mengikuti kartu ISO/IEC 7810 ID-1 (85,6 × 54 mm), sama dengan KTP dan
     kartu bank, supaya sarung yang dijual di mana-mana muat.

     Yang TIDAK dicetak: nomor telepon pribadi dan alamat. Kartu ini
     tergantung di dada seharian di gedung yang dilewati ratusan orang asing;
     apa pun yang tercetak di sana bisa dibaca siapa saja. */

  var tglAbsen = null;

  function lokAbsen(x) {
    var p = x.pekerja || x;
    return p.lokasiIds || [];
  }

  function renderAbsensi() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var tgl = tglAbsen || U.today();
    var l = MCS.absensiHari(k.id, tgl);
    var st = MCS.statistikAbsensi(k.id, tgl);
    var ls = dpSaring('absensi', l, lokAbsen);

    return '<div class="row between mb-3">' +
        '<div><h2 class="mcs-h">' + T('Kehadiran petugas') + '</h2>' +
          '<div class="tbl-sub">' + U.tglPanjang(tgl) + '</div></div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="ab-tgl" data-d="-1">‹</button>' +
          (tgl !== U.today()
            ? '<button class="btn btn--ghost btn--sm" data-act="ab-kini">' + T('Hari ini') + '</button>'
            : '') +
          '<button class="btn btn--ghost btn--sm" data-act="ab-tgl" data-d="1"' +
            (tgl >= U.today() ? ' disabled' : '') + '>›</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="ab-cetak">🖨️ ' +
            T('Cetak') + '</button>' +
        '</div>' +
      '</div>' +

      (st.tanpaPengganti
        ? UI.alert('danger', '<b>' + jml(st.tanpaPengganti,
            T('1 petugas tidak bekerja tanpa pengganti'), T('{n} petugas tidak bekerja tanpa pengganti')) +
            '.</b> ' + T('Area yang menjadi tanggung jawabnya hari ini tidak akan dikerjakan siapa pun.'),
            '⚠️') + '<div class="mb-3"></div>'
        : '') +

      (st.belumDicatat
        ? UI.alert('info', jml(st.belumDicatat, T('1 petugas belum dicatat kehadirannya'),
            T('{n} petugas belum dicatat kehadirannya')) + '. ' +
            T('Yang belum dicatat TIDAK dianggap hadir.'), 'ℹ️') + '<div class="mb-3"></div>'
        : '') +

      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Hadir'), value: st.hadir, icon: '✅' }) +
        UI.stat({ label: T('Sakit / izin'), value: st.sakit + st.izin, icon: '🤒' }) +
        UI.stat({ label: T('Tanpa kabar'), value: st.alfa, icon: '❌' }) +
        UI.stat({ label: T('Belum dicatat'), value: st.belumDicatat, icon: '❔' }) +
      '</div>' +

      /* Penyaring lokasi ada di sini karena kehadiran adalah pekerjaan
         HARIAN seorang penyelia cabang, bukan bacaan kantor pusat: yang
         memegang satu cabang mengisi tiga baris, dan menggulir dua ratus
         lima puluh delapan baris untuk menemukannya adalah pekerjaan yang
         diulang tiap pagi. */
      dpBilah('absensi', l, ls, lokAbsen) +

      (l.length
        ? '<div class="ab-list">' +
            dpPotong('absensi', ls, function (x) { return barisAbsen(x, tgl); }) + '</div>'
        : UI.empty('🧹', T('Belum ada petugas'),
            T('Daftarkan petugas kebersihan dulu di menu Petugas.')));
  }

  function barisAbsen(x, tgl) {
    var s = x.status ? MCS.statusHadir(x.status) : null;
    /* CARA pencatatan disebut di baris penyelia, bukan hanya di layar
       petugas. Yang perlu tahu bahwa sebuah kehadiran hanya pernyataan
       sendiri justru orang yang membaca daftar ini — petugasnya sudah
       tahu apa yang ia tekan. */
    /* HANYA bila caranya sungguh tercatat. Absensi dari sebelum kolom
       ini ada tidak punya nilai apa pun, dan menampilkannya sebagai
       'dinyatakan sendiri' berarti menuduh seluruh riwayat lama sebagai
       bukti terlemah — tuduhan yang tidak berdasar apa pun. */
    var bk = (x.status && x.bukti) ? MCS.buktiAbsensi(x.bukti) : null;
    /* Sedang bekerja SEKARANG — hanya berarti pada hari ini; pada tanggal
       lampau pertanyaannya tidak punya jawaban. */
    var kini = (tgl === U.today() && s && s.bekerja)
      ? MCS.sedangBekerja(x.pekerja.id) : null;
    return '<div class="ab-r' + (x.status && !s.bekerja ? ' ab-r--absen' : '') + '">' +
      '<div class="ab-r__t">' +
        '<b>' + U.esc(x.pekerja.nama) + '</b>' +
        (kini
          ? (kini.bekerja
              ? ' <span class="chip chip--ok chip--xs">' + T('sedang bekerja') + '</span>'
              : ' <span class="chip chip--muted chip--xs">' +
                T('di luar jam shift') + '</span>')
          : '') +
        '<span>' + U.esc(T(MCS.jenisPekerja(x.pekerja.jenis).nama)) +
          (kini ? ' · ' + U.esc(T(kini.shift.nama)) + ' ' +
            U.esc(kini.shift.mulai + '–' + kini.shift.selesai) : '') +
          (x.catatan ? ' · ' + U.esc(x.catatan) : '') + '</span>' +
        (bk
          ? '<span class="ab-r__g' + (bk.kuat ? '' : ' ab-r__g--no') + '">' +
            bk.ikon + ' ' + U.esc(T(bk.nama)) + '</span>'
          : '') +
        (x.pengganti
          ? '<span class="ab-r__g">🔁 ' + T('digantikan') + ' <b>' +
            U.esc(x.pengganti.nama) + '</b></span>'
          : (x.status && !s.bekerja
              ? '<span class="ab-r__g ab-r__g--no">' + T('tanpa pengganti') + '</span>'
              : '')) +
      '</div>' +
      '<div class="ab-r__b">' + MCS.HADIR.map(function (h) {
        return '<button class="ab-b' + (x.status === h.kode ? ' on ab-b--' + h.warna : '') +
          '" data-act="ab-set" data-p="' + x.pekerja.id + '" data-s="' + h.kode + '" ' +
          'data-t="' + tgl + '" title="' + U.esc(T(h.nama)) + '">' + h.ikon + '</button>';
      }).join('') + '</div>' +
    '</div>';
  }

  /**
   * Dialog pengganti dibuka OTOMATIS ketika seseorang ditandai tidak bekerja.
   *
   * Menunggu orang mengingat sendiri untuk menunjuk pengganti berarti tidak
   * ada pengganti yang pernah ditunjuk — dan area itu diam-diam terlewat.
   */

  function dialogPengganti(korporatId, pekerjaId, tgl, status) {
    var p = MCS.pekerjaSatu(pekerjaId);
    var lain = MCS.pekerja(korporatId).filter(function (q) { return q.id !== pekerjaId; });
    UI.formModal({
      title: T('Siapa yang menggantikan?'),
      sub: (p ? p.nama : '') + ' — ' + T(MCS.statusHadir(status).nama),
      okText: T('Simpan'),
      fields: [
        { name: 'penggantiId', label: T('Pengganti'), type: 'select', value: '',
          options: [{ value: '', label: '— ' + T('tidak ada pengganti') + ' —' }]
            .concat(lain.map(function (q) { return { value: q.id, label: q.nama }; })),
          hint: T('Boleh dikosongkan — tetapi areanya akan ditandai tidak tergarap.') },
        { name: 'catatan', label: T('Keterangan'), value: '',
          placeholder: T('mis. surat dokter, izin sampai siang') }
      ]
    }).then(function (d) {
      if (!d) { APP.refresh(); return; }
      MCS.tandaiHadir(korporatId, pekerjaId, tgl, status,
        { penggantiId: d.penggantiId || null, catatan: d.catatan }, APP.user);
      APP.refresh();
    });
  }

  function mountAbsensi(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'ab-kini': function () { tglAbsen = null; APP.refresh(); },
      'ab-cetak': function () { cetakDaftarAbsensi(); },
      'ab-tgl': function (el) {
        var d = new Date((tglAbsen || U.today()) + 'T00:00:00');
        d.setDate(d.getDate() + (+el.getAttribute('data-d')));
        var baru = U.iso(d);
        if (baru > U.today()) return;
        tglAbsen = baru === U.today() ? null : baru;
        APP.refresh();
      },
      'ab-set': function (el) {
        var k = korp(); if (!k) return;
        var pid = el.getAttribute('data-p');
        var status = el.getAttribute('data-s');
        var tgl = el.getAttribute('data-t');
        if (!MCS.statusHadir(status).bekerja) {
          MCS.tandaiHadir(k.id, pid, tgl, status, {}, APP.user);
          dialogPengganti(k.id, pid, tgl, status);
          return;
        }
        MCS.tandaiHadir(k.id, pid, tgl, status, {}, APP.user);
        APP.refresh();
      }
    }));
  }

  /* ================================================= BAHAN HABIS PAKAI */

  function renderInspeksi() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var m = MCS.mutuArea(k.id);
    var st = MCS.statistikMutu(k.id);
    var l = MCS.inspeksi(k.id).slice(0, 25);

    return UI.alert('info',
      '<b>' + T('Dinilai oleh yang tidak mengerjakan.') + '</b> ' +
      T('Skala 1–5 mengikuti tingkat kebersihan APPA yang dipakai umum di manajemen ' +
        'gedung: 1 paling bersih, 5 paling buruk. Angka yang sama dipahami sama oleh ' +
        'auditor mana pun.'), '🔍') + '<div class="mb-3"></div>' +

      duaSuaraMutu(k, st) +

      '<div class="row between mb-3">' +
        '<div class="hint">' +
          (st.rata == null
            ? T('Belum ada inspeksi')
            : T('Rata-rata') + ' ' + selMutu(st.rata) + ' · ' +
              jml(st.jumlah, '1 inspeksi', '{n} inspeksi')) +
        '</div>' +
        '<button class="btn btn--primary" data-act="in-baru">＋ ' + T('Inspeksi Baru') + '</button>' +
      '</div>' +

      (st.areaBelumDinilai
        ? UI.alert('warn', '<b>' + jml(st.areaBelumDinilai,
            T('1 area belum pernah dinilai'), T('{n} area belum pernah dinilai')) + '.</b> ' +
            T('Area yang tidak pernah diperiksa justru yang paling mungkin bermasalah.'),
            '⚠️') + '<div class="mb-3"></div>'
        : '') +

      kartuMutuArea(m) +

      UI.card({ title: T('Riwayat inspeksi'),
        sub: jml(l.length, '1 terbaru', '{n} terbaru'),
        body: l.length
          ? '<div class="in-list">' + l.map(barisInspeksi).join('') + '</div>'
          : '<div class="tbl-sub">' + T('Belum ada inspeksi yang dicatat.') + '</div>' });
  }

  /**
   * Dua suara tentang kebersihan yang sama, berdampingan.
   *
   * Sampai sekarang penilaian penghuni terkurung di portalnya sendiri: ia
   * dikumpulkan, lalu tidak pernah sampai ke siapa pun yang bisa berbuat
   * sesuatu. Meminta orang menilai lalu tidak melihat penilaiannya adalah
   * cara tercepat membuat mereka berhenti menilai.
   *
   * Keduanya sengaja BERBEDA BENTUK, bukan sekadar berbeda label:
   *
   *   · Inspeksi → skor APPA 1–5, selalu dengan katanya (selMutu).
   *   · Penghuni → PERSENTASE yang menyatakan bersih.
   *
   * Dua angka 1–5 berarah berlawanan pada satu layar akan salah dibaca
   * betapapun rapi keterangannya — mata membaca angka, bukan catatan kaki.
   * Persentase tidak punya arah yang bisa terbalik.
   *
   * Dan keduanya TIDAK dijumlahkan menjadi satu nilai gabungan. Keduanya
   * mengukur hal yang berbeda: supervisor menilai apa yang bisa diperiksa,
   * penghuni menilai apa yang ia rasakan. Menggabungkannya menghasilkan
   * satu angka yang tidak menjawab pertanyaan siapa pun — dan yang paling
   * berguna justru ketika keduanya BERSELISIH.
   */

  function duaSuaraMutu(k, st) {
    if (!window.PENGHUNI || !PENGHUNI.persenPuasKorporat) return '';
    var p = PENGHUNI.persenPuasKorporat(k.id);
    if (!p.n) return '';

    var selisih = '';
    if (p.cukup && st.rata != null) {
      /* APPA ≤ 2 berarti bersih; ≥ 60% penghuni puas berarti bersih menurut
         mereka. Yang ditandai hanya ketika keduanya berselisih TAJAM —
         selisih kecil adalah hal biasa dan menandainya membuat tandanya
         berhenti dibaca. */
      /* Ambangnya HARUS memakai pembulatan yang sama dengan kata yang
         tertulis di kartu ini. Sempat tidak: rata-rata 2,2 diberi nama
         'Bersih' oleh MCS.mutu(2) sementara ambang '<= 2' menyatakannya
         tidak bersih, sehingga satu kartu memuat dua pernyataan yang saling
         menyangkal. Yang dibandingkan orang adalah KATA yang ia lihat. */
      var bersihMenurutInspeksi = Math.round(st.rata) <= 2;
      var bersihMenurutPenghuni = p.persen >= 60;
      if (bersihMenurutInspeksi && !bersihMenurutPenghuni) {
        selisih = T('Inspeksi menyatakan bersih, penghuni tidak. Yang diperiksa ' +
          'mungkin bukan yang mereka rasakan — bau, jam pembersihan, atau ' +
          'ruangan yang tidak masuk daftar inspeksi.');
      } else if (!bersihMenurutInspeksi && bersihMenurutPenghuni) {
        selisih = T('Penghuni puas, inspeksi tidak. Standar inspeksi mungkin ' +
          'lebih ketat daripada yang dituntut pemakai ruangan — itu belum ' +
          'tentu salah, tetapi layak ditanyakan.');
      }
    }

    return UI.card({ cls: 'mb-3', title: T('Dua suara tentang kebersihan'),
      sub: T('Diukur dengan cara berbeda, dan sengaja tidak dijumlahkan'),
      body:
        '<div class="grid g-2">' +
          UI.stat({ label: T('Menurut inspeksi'),
            value: st.rata == null ? '—' : String(st.rata), icon: '🔍',
            meta: st.rata == null ? T('belum ada inspeksi')
              : T(MCS.mutu(Math.round(st.rata)).nama) + ' · ' +
                T('skala APPA, 1 terbaik') }) +
          UI.stat({ label: T('Menurut penghuni'),
            value: p.cukup ? p.persen + '%' : '—', icon: '🚪',
            meta: p.cukup
              ? T('menyatakan bersih') + ' · ' +
                jml(p.n, '1 penilaian', '{n} penilaian')
              : jml(p.n, T('baru 1 penilaian — belum cukup'),
                  T('baru {n} penilaian — belum cukup')) }) +
        '</div>' +
        (selisih ? '<div class="mt-2">' + UI.alert('warn', selisih, '⚖️') + '</div>' : '') });
  }

  /**
   * Mutu per area — dipisah menjadi yang SUDAH dan BELUM dinilai.
   *
   * Sebelumnya keduanya berada dalam satu tabel yang diurutkan dari yang
   * terburuk, sehingga seribu enam puluh enam area yang belum pernah dinilai
   * berbaris di bawah tanpa ujung. Yang belum dinilai bukan pelengkap
   * daftar: ia justru yang paling mungkin bermasalah, dan ia butuh tempat
   * yang bisa didatangi, bukan sekadar angka di dalam peringatan.
   */

  function kartuMutuArea(m) {
    function lok(x) {
      var a = MCS.areaSatu(x.areaId);
      return a ? (a.lokasiId || '') : '';
    }
    var sudah = m.filter(function (x) { return x.rata != null; });
    var belum = m.filter(function (x) { return x.rata == null; });
    var pokok = inSudut === 'belum' ? belum : sudah;
    var l = dpSaring('mutu', pokok, lok);

    var kolom = [
      { h: T('Area'), r: function (x) {
        var a = MCS.areaSatu(x.areaId);
        var nl = a && a.lokasiId && window.LOKASI ? LOKASI.nama(a.lokasiId) : '';
        /* Nama lokasi ikut di baris — delapan puluh tujuh cabang memakai
           nama ruangan yang sama persis, dan "Toilet Pelanggan" tanpa
           keterangan cabang tidak menunjuk ke mana pun. */
        return U.esc(x.nama) +
          (nl ? '<span class="tbl-sub">' + U.esc(nl) + '</span>' : ''); } },
      { h: T('Inspeksi'), cls: 'num', r: function (x) { return x.n || '—'; } },
      { h: judulMutu(), cls: 'num', r: function (x) {
        if (x.rata == null) return '<span class="chip chip--muted">' +
          T('belum dinilai') + '</span>';
        return selMutu(x.rata, { ringkas: true }); } },
      { h: T('Terakhir'), r: function (x) {
        return x.terakhir ? U.esc(x.terakhir.tgl) : '—'; } },
      { h: '', cls: 'act', r: function (x) {
        return '<button class="btn btn--ghost btn--sm" data-act="in-baru" ' +
          'data-area="' + x.areaId + '">' + T('Nilai') + '</button>'; } }
    ];

    return UI.card({ title: T('Mutu per area'), cls: 'mb-3',
      sub: inSudut === 'belum'
        ? T('Belum pernah diperiksa sama sekali')
        : T('Diurutkan dari yang paling buruk'),
      tools: UI.tabs([{ key: 'sudah', label: T('Sudah dinilai'), n: sudah.length },
                      { key: 'belum', label: T('Belum dinilai'), n: belum.length }],
                     inSudut, 'in-sudut'),
      body: dpBilah('mutu', pokok, l, lok) +
        dpPotong('mutu', l, null, function (tampil) {
          /* Tanpa `hal`: data mentahnya — daftar inspeksi — ada di halaman
             yang sedang dibuka. Tautan yang menunjuk ke halaman sendiri hanya
             membuat orang mengira kliknya rusak. */
          return UI.table(kolom, tampil, null, { sumber: {
            teks: T('Rata-rata skor APPA tiap area pada periode ini. Area yang ' +
              'diinspeksi berkali-kali dihitung rata-ratanya, bukan yang ' +
              'terakhir.') } });
        }) }) +
    '';
  }

  var inSudut = 'sudah';

  function barisInspeksi(x) {
    var a = MCS.areaSatu(x.areaId);
    var mm = MCS.mutu(x.skor);
    return '<div class="in-r">' +
      /* Petak angka besar diberi keterangan arah lewat title — katanya
         sendiri sudah tertulis di baris meta tepat di sebelahnya. */
      '<div class="in-r__s in-r__s--' + mm.warna + '" title="' +
        U.esc(T('Skala APPA: 1 paling bersih, 5 terburuk')) + '">' + x.skor + '</div>' +
      '<div class="in-r__t">' +
        '<b>' + U.esc(a ? a.nama : T('Area terhapus')) + '</b>' +
        '<span>' + U.esc(x.tgl) + ' · ' + U.esc(T(mm.nama)) +
          /* Nama penilai selalu ditampilkan. Inspeksi tanpa penilai yang
             jelas tidak bisa dipertanggungjawabkan kepada siapa pun. */
          (x.olehNama ? ' · ' + T('dinilai') + ' ' + U.esc(x.olehNama) : '') + '</span>' +
        (x.catatan ? '<span class="in-r__c">' + U.esc(x.catatan) + '</span>' : '') +
        ((x.foto || []).length ? '<div class="mt-1">' + UI.photoGrid(x.foto, {}) + '</div>' : '') +
      '</div>' +
      '<button class="btn btn--ghost btn--sm ma-hapus" data-act="in-hapus" ' +
        'data-id="' + x.id + '">🗑</button>' +
    '</div>';
  }

  function dialogInspeksi(areaId) {
    var k = korp();
    if (!k) return;
    var daftar = MCS.area(k.id);
    if (!daftar.length) { UI.toast(T('Daftarkan area dulu.'), 'warn'); return; }
    var pilihArea = areaId || daftar[0].id;
    var skor = 0, foto = [];

    var tutup = UI.modal({
      title: T('Inspeksi mutu'), size: 'wide',
      sub: T('Nilai apa yang Anda lihat sekarang, bukan apa yang dilaporkan'),
      body: '<div id="in-isi">' + isi() + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn" data-act="in-simpan">' + T('Simpan inspeksi') + '</button>',
      actions: {
        'in-area': function (el) { pilihArea = el.value; },
        'in-skor': function (el) { skor = Number(el.getAttribute('data-s')); gambar(); },
        'in-foto': function (el) {
          UI.handleFotoInput(el, function (ids) { foto = foto.concat(ids); gambar(); },
            { maks: 3, maxSide: 900, quality: 0.6 });
        },
        'in-hapus-foto': function (el) {
          var id = el.getAttribute('data-id');
          DB.delPhoto(id);
          foto = foto.filter(function (f) { return f !== id; });
          gambar();
        },
        'in-simpan': function () {
          var c = (document.getElementById('in-catatan') || {}).value || '';
          var r = MCS.buatInspeksi(pilihArea, { skor: skor, catatan: c, foto: foto }, APP.user);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Inspeksi tersimpan'), 'ok');
          tutup(); APP.refresh();
        }
      }
    });

    function isi() {
      return '<label class="mcs-f"><span>' + T('Area') + '</span>' +
          '<select class="select" data-change="in-area">' + daftar.map(function (a) {
            return '<option value="' + a.id + '"' + (a.id === pilihArea ? ' selected' : '') +
              '>' + U.esc(a.nama) + '</option>'; }).join('') + '</select></label>' +

        '<div class="in-skala mt-3">' + MCS.MUTU.map(function (m) {
          return '<button type="button" class="in-sk in-sk--' + m.warna +
            (skor === m.skor ? ' on' : '') + '" data-act="in-skor" data-s="' + m.skor + '">' +
            '<b>' + m.skor + '</b><span>' + T(m.nama) + '</span>' +
            '<small>' + T(m.ket) + '</small></button>';
        }).join('') + '</div>' +

        '<label class="mcs-f mt-3"><span>' + T('Catatan temuan') + '</span>' +
          '<textarea class="input" id="in-catatan" rows="2" placeholder="' +
          U.esc(T('mis. cermin berbekas, tempat sampah penuh')) + '">' +
          U.esc((document.getElementById('in-catatan') || {}).value || '') + '</textarea></label>' +

        '<div class="mt-2">' + UI.photoGrid(foto, {
          delAct: 'in-hapus-foto', addAct: 'in-foto', addLabel: T('Foto temuan') }) + '</div>';
    }

    function gambar() {
      var box = document.getElementById('in-isi');
      if (box) box.innerHTML = isi();
    }
  }

  function mountInspeksi(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'in-sudut': function (el) {
        inSudut = el.getAttribute('data-key');
        dpS('mutu').lokasi = 'semua'; dpUlang('mutu');
        APP.refresh();
      },
      'in-baru': function (el) { dialogInspeksi(el.getAttribute('data-area')); },
      'in-hapus': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus inspeksi ini?'), danger: true,
          text: T('Penilaian dan fotonya ikut hilang.') }).then(function (ya) {
          if (!ya) return;
          MCS.hapusInspeksi(id);
          UI.toast(T('Inspeksi dihapus'), 'ok');
          APP.refresh();
        });
      },
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    }));
  }

  /* ============================================== KOTAK MASUK ADUAN */

  var saringAduan = 'terbuka';

  function renderAduan() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = MCS.statistikAduan(k.id);
    var l = MCS.aduan(k.id, { semua: saringAduan === 'semua' });

    return UI.alert('info',
      '<b>' + T('Aduan datang dari penghuni gedung, bukan dari jadwal.') + '</b> ' +
      T('Mereka memindai tag area dengan kamera ponsel biasa — tanpa akun, tanpa aplikasi. ' +
        'Batas waktunya dihitung sejak aduan masuk.'), '📣') + '<div class="mb-3"></div>' +

      '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Belum ditangani'), value: st.baru, icon: '📥' }) +
        UI.stat({ label: T('Sedang ditangani'), value: st.terbuka - st.baru, icon: '🧹' }) +
        UI.stat({ label: T('Lewat batas waktu'), value: st.lewatSLA, icon: '⏰' }) +
        UI.stat({ label: T('Selesai'), value: st.selesai, icon: '✅' }) +
      '</div>' +

      '<div class="row between">' +
        UI.tabs([{ key: 'terbuka', label: T('Terbuka'), n: st.terbuka },
                 { key: 'semua', label: T('Semua'), n: st.total }],
                saringAduan, 'ad-saring') +
        '<button class="btn btn--ghost btn--sm" data-act="ad-cetak">🖨️ ' +
          T('Cetak daftar') + '</button>' +
      '</div>' +

      (l.length
        ? '<div class="ad-list mt-3">' + l.map(barisAduan).join('') + '</div>'
        : UI.empty('📭', T('Belum ada aduan'),
            T('Cetak tag area dan tempel di dinding supaya penghuni bisa melapor.')));
  }

  /** Sisa waktu sebagai kalimat, bukan angka menit telanjang. */

  function teksSLA(x) {
    var sisa = MCS.sisaSLA(x);
    if (sisa === null) return '';
    var selesai = x.status === 'selesai' || x.status === 'ditutup';
    if (selesai) {
      return sisa >= 0
        ? '<span class="ad-sla ad-sla--ok">✅ ' + T('selesai dalam batas waktu') + '</span>'
        : '<span class="ad-sla ad-sla--lewat">⏰ ' + T('terlambat') + ' ' +
          jamMenit(-sisa) + '</span>';
    }
    return sisa >= 0
      ? '<span class="ad-sla">⏳ ' + T('sisa') + ' ' + jamMenit(sisa) + '</span>'
      : '<span class="ad-sla ad-sla--lewat">⏰ ' + T('lewat') + ' ' + jamMenit(-sisa) + '</span>';
  }

  function barisAduan(x) {
    var a = MCS.areaSatu(x.areaId);
    var g = MCS.genting(x.genting);
    var p = x.pekerjaId ? MCS.pekerjaSatu(x.pekerjaId) : null;
    var selesai = x.status === 'selesai' || x.status === 'ditutup';
    return '<div class="ad-r ad-r--' + U.esc(x.genting) + (selesai ? ' ad-r--tutup' : '') + '">' +
      '<div class="ad-r__i">' + g.ikon + '</div>' +
      '<div class="ad-r__t">' +
        '<b>' + U.esc(a ? a.nama : T('Area terhapus')) + '</b>' +
        /* U.jam(), bukan potongan ISO — alasan yang sama dengan barisBukti()
           di mcs-inti.js: yang dipotong itu jam UTC. */
        '<span class="ad-r__m">' + U.esc(U.jam(x.pada)) + ' · ' +
          U.esc(T(g.nama)) + ' · ' + teksSLA(x) + '</span>' +
        (x.teks ? '<span class="ad-r__x">' + U.esc(x.teks) + '</span>' : '') +
        ((x.foto || []).length ? '<div class="mt-1">' + UI.photoGrid(x.foto, {}) + '</div>' : '') +
        /* Nama pelapor ditampilkan hanya bila ia menuliskannya. Yang memilih
           diam tetap diam — itu bagian dari kesepakatan di layar aduan. */
        (x.pelapor || x.kontak
          ? '<span class="ad-r__p">👤 ' + U.esc(x.pelapor || T('tanpa nama')) +
            (x.kontak ? ' · ' + U.esc(x.kontak) : '') + '</span>'
          : '<span class="ad-r__p">👤 ' + T('pelapor tidak menyebut nama') + '</span>') +
        (p ? '<span class="ad-r__p">🧹 ' + U.esc(p.nama) + '</span>' : '') +
        /* Aduan yang tidak sampai ke petugas mana pun. Disebut di barisnya
           sendiri, bukan hanya di rekap: yang membaca daftar ini sedang
           memutuskan mana yang harus ia tangani sendiri. */
        (x.tidakTersampaikan && !selesai
          ? '<span class="ad-r__p mcs-warn">📵 ' +
            T('tidak terkirim ke petugas mana pun — tidak ada yang bertugas di area ini hari ini') +
            '</span>'
          : '') +
        (x.catatanPetugas ? '<span class="ad-r__x">📝 ' + U.esc(x.catatanPetugas) + '</span>' : '') +
      '</div>' +
      '<div class="ad-r__b">' +
        (selesai
          ? '<span class="chip chip--ok">' + T(x.status === 'selesai' ? 'Selesai' : 'Ditutup') + '</span>' +
            '<button class="btn btn--ghost btn--sm" data-act="ad-buka" data-id="' + x.id + '">' +
              T('Buka lagi') + '</button>'
          : '<button class="btn btn--ghost btn--sm" data-act="ad-kelola" data-id="' + x.id + '">' +
              T('Tangani') + '</button>') +
      '</div>' +
    '</div>';
  }

  function dialogAduan(id) {
    var x = MCS.aduanSatu(id);
    if (!x) { UI.toast(T('Aduan tidak ditemukan.'), 'err'); return; }
    var a = MCS.areaSatu(x.areaId);
    var petugas = MCS.pekerja(x.korporatId);

    UI.formModal({
      title: T('Tangani aduan'), sub: (a ? a.nama : '') + ' · ' + U.jam(x.pada),
      okText: T('Simpan'),
      fields: [
        { type: 'html', html: '<div class="ad-kutip">' +
            (x.teks ? U.esc(x.teks) : '<i>' + T('Tanpa keterangan tertulis.') + '</i>') +
            '<div class="tbl-sub mt-1">' + teksSLA(x) + '</div></div>' },
        { name: 'genting', label: T('Kegentingan'), type: 'select', value: x.genting,
          options: MCS.GENTING.map(function (g) {
            return { value: g.kode, label: g.ikon + '  ' + T(g.nama) }; }),
          /* Mengubah kegentingan TIDAK menggeser batas waktunya. Ia sudah
             dijanjikan kepada pelapor saat aduan masuk, dan janji yang
             dimundurkan setelah terlambat bukan lagi janji. */
          hint: T('Batas waktu tetap mengikuti janji saat aduan masuk.') },
        { name: 'pekerjaId', label: T('Ditugaskan kepada'), type: 'select',
          value: x.pekerjaId || '',
          options: [{ value: '', label: '— ' + T('belum ditugaskan') + ' —' }]
            .concat(petugas.map(function (p) { return { value: p.id, label: p.nama }; })) },
        { name: 'catatanPetugas', label: T('Catatan penanganan'), type: 'textarea', rows: 2,
          value: x.catatanPetugas || '' },
        { name: 'status', label: T('Status'), type: 'select', value: x.status,
          options: [
            { value: 'baru', label: T('Belum ditangani') },
            { value: 'ditugaskan', label: T('Sedang ditangani') },
            { value: 'selesai', label: T('Selesai ditangani') },
            { value: 'ditutup', label: T('Ditutup tanpa tindakan') }
          ] }
      ]
    }).then(function (d) {
      if (!d) return;
      /* Memilih petugas tanpa mengubah status secara manual sudah cukup
         menyatakan maksudnya: aduan yang punya penanggung jawab bukan lagi
         aduan yang belum ditangani. */
      if (d.pekerjaId && d.status === 'baru') d.status = 'ditugaskan';
      var r = MCS.ubahAduan(id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Aduan diperbarui'), 'ok');
      APP.refresh();
    });
  }

  function mountAduan(root) {
    delegasi(root, {
      'ad-saring': function (el) { saringAduan = el.getAttribute('data-key'); APP.refresh(); },
      'ad-cetak': function () { cetakDaftarAduan(); },
      'ad-kelola': function (el) { dialogAduan(el.getAttribute('data-id')); },
      'ad-buka': function (el) {
        MCS.ubahAduan(el.getAttribute('data-id'), { status: 'baru' }, APP.user);
        UI.toast(T('Aduan dibuka kembali.'), 'ok');
        APP.refresh();
      },
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    });
  }

  /* ==================================================== LAYAR PETUGAS

     Yang membukanya sedang berdiri di koridor dengan ponsel di satu tangan
     dan alat pel di tangan lain. Ia tidak butuh statistik, tidak butuh
     grafik, dan tidak butuh menu bercabang — ia butuh tahu APA YANG HARUS
     DIKERJAKAN SEKARANG, dan tombol untuk menyatakan sudah selesai.

     Karena itu halamannya sedikit dan datar. Setiap tambahan di sini adalah
     sesuatu yang harus dilewati orang yang sedang bekerja. */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsBeranda", { label: 'Beranda MCS', icon: '🏢', grup: 'Utama',
      render: renderBeranda, mount: mountBeranda,
      badge: function () {
        if (!APP.user || !APP.user.korporatId) return 0;
        var s = MCS.statistik(APP.user.korporatId);
        return s.jatuhTempo + s.terlambat;
      } });

  VMCS.daftar("korporat", "mcsAduan", { label: 'Aduan Penghuni', icon: '📣', grup: 'Utama',
      render: renderAduan, mount: mountAduan,
      /* Lencananya menghitung yang BELUM ditangani, bukan seluruh yang
         terbuka: aduan yang sudah dipegang petugas tidak lagi menuntut
         perhatian orang yang membuka menu. */
      badge: function () {
        if (!APP.user || !APP.user.korporatId) return 0;
        return MCS.statistikAduan(APP.user.korporatId).baru;
      } });

  VMCS.daftar("korporat", "mcsAbsensi", { label: 'Kehadiran Petugas', icon: '🗒️', grup: 'Utama',
      render: renderAbsensi, mount: mountAbsensi,
      badge: function () {
        if (!APP.user || !APP.user.korporatId) return 0;
        return MCS.statistikAbsensi(APP.user.korporatId).tanpaPengganti;
      } });

  VMCS.daftar("korporat", "mcsRonda", { label: 'Ronda', icon: '🚶', grup: 'Utama',
      sub: 'Rute berurutan dengan waktu tempuh yang diharapkan',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        var s = RONDA.statistik(k.id);
        return (s.terlewat + s.sebagian) || null;
      },
      render: renderRonda, mount: mountRonda });

  VMCS.daftar("korporat", "mcsKerja", { label: 'Pekerjaan Tambahan', icon: '🧰', grup: 'Utama',
      sub: 'Cuci karpet, poles lantai, darurat — di luar jadwal rutin',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        return k ? (KERJA.statistik(k.id).diminta || null) : null;
      },
      render: renderKerja, mount: mountKerja });

  VMCS.daftar("korporat", "mcsInspeksi", { label: 'Inspeksi Mutu', icon: '🔍', grup: 'Utama',
      render: renderInspeksi, mount: mountInspeksi });

  VMCS.daftar("korporat", "mcsK3", { label: 'Keselamatan Kerja', icon: '🦺', grup: 'Utama',
      sub: 'Kecelakaan, nyaris celaka, dan bahan berbahaya',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        return k ? (K3.statistik(k.id).terbuka || null) : null;
      },
      render: renderK3, mount: mountK3 });
})();
