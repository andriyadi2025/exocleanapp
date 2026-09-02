/* ==========================================================================
   hirarki.js — capaian yang dijumlahkan menaiki struktur organisasi
   --------------------------------------------------------------------------
   PERTANYAAN YANG DIJAWAB BERKAS INI

   MCS sudah bisa menjawab "bagaimana capaian cabang ini" dan "bagaimana
   kinerja orang ini". Yang belum bisa dijawab siapa pun adalah yang berada
   di antara keduanya:

       Bagaimana capaian dua puluh satu cabang di bawah Area Manager I?
       Kepala Cabang mana yang wilayahnya paling tertinggal?
       Regu siapa yang menarik rata-rata cabangnya ke bawah?

   Ketiganya pertanyaan yang sama bentuknya — sebuah angka yang dijumlahkan
   dari bawah ke atas menurut siapa membawahi siapa — dan tidak satu pun
   layar yang bisa menjawabnya sebelum berkas ini ada.

   DUA SUMBU, DAN KEDUANYA DISEBUT

   Struktur di MCS tidak tunggal, dan berpura-pura ia tunggal akan
   menghasilkan pohon yang rapi tetapi bohong:

     · ORGANISASI — Area Manager membawahi Kepala Cabang. Rantai FORMAL,
       ditulis di `mcsAtasanId`, dan sengaja hanya satu tingkat: alasannya
       tertulis di mcsakses.js dan tidak diubah di sini.
     · TEMPAT — Cabang berisi Regu, Regu berisi Petugas. Ini yang menampung
       Supervisor dan Leader korporat, yang TIDAK punya atasan formal:
       keduanya ditempatkan pada cabang yang dijangkau akunnya, bukan
       dikarang menjadi bawahan siapa pun.

   Jadi pohonnya: Area Manager → Kepala Cabang → Cabang → Regu → Petugas,
   dengan penyelia cabang menggantung di simpul cabangnya.

   SATU SAPUAN, BUKAN SATU PER SIMPUL

   Menghitung tiap simpul sendiri-sendiri berarti menelusuri 1.223 jadwal
   sekali untuk tiap cabang, sekali lagi untuk tiap Kepala Cabang, dan sekali
   lagi untuk Area Manager — 87 + 12 + 4 kali penelusuran yang seluruhnya
   membaca data yang sama. Cara itu pernah dipakai LOKASI.portofolio dan
   menggantung halamannya sampai berhenti merespons.

   Di sini datanya disapu SEKALI ke dalam ember per lokasi dan per petugas,
   lalu ember-ember itu dijumlahkan menaiki pohon. Yang di atas selalu sama
   dengan jumlah yang di bawahnya, dan itu bukan kebetulan — ia memang angka
   yang sama, dijumlahkan sekali.

   TIDAK ADA YANG DISIMPAN

   Seluruhnya dihitung saat diminta. Menyimpan hasil rollup berarti punya dua
   kebenaran yang bisa berbeda begitu seseorang pindah cabang — dan yang
   tersimpan selalu yang basi.
   ========================================================================== */
var HIRARKI = (function () {
  'use strict';

  /* ------------------------------------------------------------ ringkasan */

  /**
   * Ember kosong.
   *
   * Mutu disimpan sebagai JUMLAH dan CACAH, bukan rata-rata. Menjumlahkan
   * rata-rata beberapa cabang menghasilkan angka yang salah kecuali tiap
   * cabang punya jumlah inspeksi yang sama persis — cacat yang sudah pernah
   * terjadi di portofolio dan menghasilkan NaN pada 74 gedung.
   */
  function ember() {
    return { tugas: 0, selesai: 0, terlewat: 0,
             mutuJumlah: 0, mutuN: 0,
             hadirBekerja: 0, hadirN: 0,
             aduan: 0, aduanSelesai: 0, aduanTepat: 0 };
  }

  function tambahEmber(a, b) {
    Object.keys(a).forEach(function (k) { a[k] += b[k] || 0; });
    return a;
  }

  /** Ember mentah menjadi angka yang bisa dibaca. */
  function bacaan(e) {
    return {
      tugas: e.tugas, selesai: e.selesai, terlewat: e.terlewat,
      persen: e.tugas ? Math.round(e.selesai / e.tugas * 100) : null,
      /* null, BUKAN nol. Cabang yang belum pernah diinspeksi bukan cabang
         bernilai 0 pada skala APPA — pada skala itu 1 justru yang terbaik,
         sehingga 0 akan terbaca lebih bersih daripada sempurna. */
      mutu: e.mutuN ? Math.round(e.mutuJumlah / e.mutuN * 10) / 10 : null,
      mutuN: e.mutuN,
      hadir: e.hadirN ? Math.round(e.hadirBekerja / e.hadirN * 100) : null,
      hadirN: e.hadirN,
      aduan: e.aduan, aduanSelesai: e.aduanSelesai,
      persenSLA: e.aduanSelesai ? Math.round(e.aduanTepat / e.aduanSelesai * 100) : null
    };
  }

  /* ------------------------------------------------------------- sapuan */

  function lokasiArea(a) {
    if (!a) return null;
    return a.lokasiId ||
      (a.lantaiId && MCS.lokasiDariLantai ? MCS.lokasiDariLantai(a.lantaiId) : null);
  }

  /**
   * Satu sapuan atas seluruh rentang.
   *
   * Yang dikembalikan ember PER LOKASI dan PER PETUGAS. Seluruh tingkat di
   * atasnya dijumlahkan dari kedua peta ini, tidak ada yang menyapu ulang.
   */
  function sapu(korporatId, dari, sampai) {
    var perLokasi = {}, perPetugas = {};
    function eL(id) { return perLokasi[id] || (perLokasi[id] = ember()); }
    function eP(id) { return perPetugas[id] || (perPetugas[id] = ember()); }

    /* ---- tugas, hari demi hari ---- */
    var iniHariIni = U.today();
    var d = U.d(dari), akhir = U.d(sampai);
    var lewatHari = 0;
    while (d <= akhir && lewatHari++ < 400) {
      var tgl = U.iso(d);
      if (tgl > iniHariIni) break;
      MCS.tugasHari(korporatId, tgl).forEach(function (t) {
        /* Slot yang jamnya belum tiba tidak dihitung sebagai tidak
           dikerjakan — alasan yang sama persis dengan MCS.rekapBulan. */
        if (t.status === 'akan') return;
        var lid = lokasiArea(t.area);
        var kelar = t.status === 'selesai';
        if (lid) {
          var L = eL(lid);
          L.tugas++; if (kelar) L.selesai++; if (t.status === 'terlewat') L.terlewat++;
        }
        /* Menurut yang MENGERJAKAN bila disebutkan, bukan yang dijadwalkan:
           tanpa itu petugas pengganti tidak pernah muncul di laporan mana
           pun sementara yang digantikan terlihat rajin. */
        var pid = (t.pelaksana && t.pelaksana.id) || (t.pekerja && t.pekerja.id);
        if (pid) {
          var P = eP(pid);
          P.tugas++; if (kelar) P.selesai++; if (t.status === 'terlewat') P.terlewat++;
        }
      });
      d = U.addDays(d, 1);
    }

    /* ---- mutu ---- */
    MCS.inspeksi(korporatId, { dari: dari, sampai: sampai }).forEach(function (x) {
      var a = MCS.areaSatu(x.areaId);
      var lid = lokasiArea(a);
      if (lid) { var L = eL(lid); L.mutuJumlah += x.skor; L.mutuN++; }
      if (x.pekerjaId) { var P = eP(x.pekerjaId); P.mutuJumlah += x.skor; P.mutuN++; }
    });

    /* ---- kehadiran ---- */
    DB.where('mcsAbsensi', function (x) {
      return x.korporatId === korporatId && x.tgl >= dari && x.tgl <= sampai && x.status;
    }).forEach(function (x) {
      var p = MCS.pekerjaSatu(x.pekerjaId);
      if (!p) return;
      var bekerja = MCS.statusHadir(x.status).bekerja ? 1 : 0;
      var P = eP(p.id); P.hadirN++; P.hadirBekerja += bekerja;
      (p.lokasiIds || []).forEach(function (lid) {
        var L = eL(lid); L.hadirN++; L.hadirBekerja += bekerja;
      });
    });

    /* ---- aduan penghuni ---- */
    DB.where('mcsAduan', function (x) {
      var t = String(x.pada).slice(0, 10);
      return x.korporatId === korporatId && t >= dari && t <= sampai;
    }).forEach(function (x) {
      var lid = lokasiArea(MCS.areaSatu(x.areaId));
      if (!lid) return;
      var L = eL(lid);
      L.aduan++;
      if (x.status === 'selesai') {
        L.aduanSelesai++;
        if (MCS.sisaSLA && MCS.sisaSLA(x) >= 0) L.aduanTepat++;
      }
    });

    return { perLokasi: perLokasi, perPetugas: perPetugas };
  }

  /* --------------------------------------------------------------- pohon */

  function stafKorporat(korporatId, kodePeran) {
    return DB.all('users').filter(function (u) {
      return u.role === 'korporat' && u.korporatId === korporatId &&
             u.aktif !== false && u.mcsPeran === kodePeran;
    }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  }

  function simpulPetugas(p, s) {
    return { tingkat: 'petugas', id: p.id, nama: p.nama,
             jabatan: MCS.jabatan(p.jabatan),
             ringkas: bacaan(s.perPetugas[p.id] || ember()) };
  }

  /**
   * Pohon capaian.
   *
   * `dari`/`sampai` opsional; bawaannya 30 hari terakhir. Rentang yang lebih
   * panjang bukan sekadar lebih lambat — ia menelusuri seluruh jadwal sekali
   * per hari, dan itulah satu-satunya bagian yang tumbuh linear.
   */
  function pohon(korporatId, dari, sampai) {
    sampai = sampai || U.today();
    dari = dari || U.iso(U.addDays(U.d(sampai), -29));
    var s = sapu(korporatId, dari, sampai);

    /* Lokasi SUDAH tersaring menurut jangkauan pembaca — LOKASI.semua yang
       melakukannya. Seluruh pohon berdiri di atas daftar ini, sehingga
       seorang Kepala Cabang membuka layar yang sama dan melihat pohonnya
       sendiri tanpa satu pun penyaringan tambahan di sini. */
    var lok = LOKASI.semua(korporatId);
    var petaLok = {};
    lok.forEach(function (l) { petaLok[l.id] = l; });

    var pekerja = MCS.pekerja(korporatId);
    var regu = MCS.tim(korporatId);

    /* ---- regu per lokasi, lewat ketuanya ---- */
    var reguLok = {};
    regu.forEach(function (t) {
      var ketua = t.ketuaId ? MCS.pekerjaSatu(t.ketuaId) : null;
      var lid = ketua ? (ketua.lokasiIds || [])[0] : null;
      if (!lid || !petaLok[lid]) return;
      (reguLok[lid] = reguLok[lid] || []).push({ tim: t, ketua: ketua });
    });

    /* ---- petugas per lokasi & per regu ---- */
    var pekerjaLok = {}, anggotaRegu = {};
    pekerja.forEach(function (p) {
      (p.lokasiIds || []).forEach(function (lid) {
        if (petaLok[lid]) (pekerjaLok[lid] = pekerjaLok[lid] || []).push(p);
      });
      if (p.timId) (anggotaRegu[p.timId] = anggotaRegu[p.timId] || []).push(p);
    });

    /* ---- penyelia yang menjangkau sebuah cabang ---- */
    var penyelia = stafKorporat(korporatId, 'supervisor')
      .concat(stafKorporat(korporatId, 'leader'));

    function simpulCabang(l) {
      var e = s.perLokasi[l.id] || ember();
      var daftarRegu = (reguLok[l.id] || []).map(function (r) {
        var ang = (anggotaRegu[r.tim.id] || []);
        var eR = ember();
        ang.forEach(function (p) { tambahEmber(eR, s.perPetugas[p.id] || ember()); });
        return { tingkat: 'regu', id: r.tim.id, nama: r.tim.nama,
                 ketua: r.ketua ? { id: r.ketua.id, nama: r.ketua.nama } : null,
                 ringkas: bacaan(eR),
                 anak: ang.map(function (p) { return simpulPetugas(p, s); }) };
      });
      /* Petugas cabang yang belum masuk regu mana pun disebut sendiri, tidak
         disembunyikan: orang yang tidak muncul di pohon mana pun adalah orang
         yang tidak pernah dinilai siapa pun. */
      var lepas = (pekerjaLok[l.id] || []).filter(function (p) { return !p.timId; });
      return {
        tingkat: 'cabang', id: l.id, nama: l.nama, kota: l.kota || '',
        ringkas: bacaan(e),
        penyelia: penyelia.filter(function (u) {
          return (u.mcsLokasi || []).indexOf(l.id) >= 0;
        }).map(function (u) {
          return { id: u.id, nama: u.nama, peran: MCSAKSES.peranUser(u) };
        }),
        anak: daftarRegu,
        tanpaRegu: lepas.map(function (p) { return simpulPetugas(p, s); })
      };
    }

    function simpulKepala(u) {
      var cab = (u.mcsLokasi || []).filter(function (id) { return petaLok[id]; })
        .map(function (id) { return simpulCabang(petaLok[id]); });
      var e = ember();
      cab.forEach(function (c) { tambahEmber(e, s.perLokasi[c.id] || ember()); });
      return { tingkat: 'cabangKepala', id: u.id, nama: u.nama,
               peran: MCSAKSES.peranUser(u),
               jumlahCabang: cab.length,
               /* Berapa cabang yang SUNGGUH tercatat pada akunnya, sebelum
                  disaring menurut jangkauan pembaca. Dipakai membedakan dua
                  sebab yang menghasilkan angka nol yang sama — lihat
                  bermakna() di bawah. */
               cabangTercatat: (u.mcsLokasi || []).length,
               ringkas: bacaan(e), anak: cab };
    }

    /**
     * Apakah sebuah simpul layak ditampilkan kepada pembaca ini.
     *
     * DUA SEBAB BERBEDA menghasilkan “0 cabang” yang terlihat sama persis:
     *
     *   · Cabangnya ADA, tetapi seluruhnya di luar jangkauan pembaca.
     *     Bukan urusannya — disembunyikan.
     *   · Cabangnya memang BELUM PERNAH DIISI pada akunnya. Itu temuan yang
     *     harus diperbaiki seseorang, dan menyembunyikannya berarti tidak
     *     ada yang akan menemukannya. Tetap ditampilkan.
     *
     * Tanpa pemisahan ini, seorang Kepala Cabang membuka layar Struktur dan
     * menemukan tiga Area Manager dan sebelas rekannya berbaris dengan
     * “0 cabang · belum ada tugas” — empat belas baris kosong yang menutupi
     * satu-satunya baris yang berarti baginya. Terlihat saat diuji sebagai
     * Kepala Cabang, bukan sebagai admin yang jangkauannya tak terbatas.
     */
    function bermakna(k) {
      return k.jumlahCabang > 0 || k.cabangTercatat === 0;
    }

    var kepala = stafKorporat(korporatId, 'cabang');
    var dipakai = {};
    var area = stafKorporat(korporatId, 'area').map(function (u) {
      var anak = kepala.filter(function (k) { return k.mcsAtasanId === u.id; });
      anak.forEach(function (k) { dipakai[k.id] = 1; });
      var simpul = anak.map(simpulKepala).filter(bermakna);
      var e = ember();
      simpul.forEach(function (k) {
        k.anak.forEach(function (c) { tambahEmber(e, s.perLokasi[c.id] || ember()); });
      });
      return { tingkat: 'area', id: u.id, nama: u.nama,
               peran: MCSAKSES.peranUser(u),
               jumlahKepala: simpul.length,
               jumlahCabang: simpul.reduce(function (a, k) { return a + k.jumlahCabang; }, 0),
               ringkas: bacaan(e), anak: simpul };
    }).filter(function (a) { return a.anak.length; });

    /* Area Manager yang seluruh cabang bawahannya di luar jangkauan pembaca
       sudah kehilangan anaknya di baris atas; yang tersisa hanya yang
       BENAR-BENAR kosong pada datanya, dan itu tetap ditampilkan. */

    /* Yang tidak punya atasan dan yang tidak dipegang siapa pun BERDIRI
       SENDIRI di pohon, tidak digantungkan pada simpul terdekat. Cabang yang
       tidak ada penanggung jawabnya adalah temuan, bukan sisa yang perlu
       dirapikan ke dalam kotak orang lain. */
    var tanpaArea = kepala.filter(function (k) { return !dipakai[k.id]; })
      .map(simpulKepala).filter(bermakna);

    var terpegang = {};
    kepala.forEach(function (k) {
      (k.mcsLokasi || []).forEach(function (id) { terpegang[id] = 1; });
    });
    var tanpaKepala = lok.filter(function (l) { return !terpegang[l.id]; })
      .map(simpulCabang);

    var eTotal = ember();
    lok.forEach(function (l) { tambahEmber(eTotal, s.perLokasi[l.id] || ember()); });

    return {
      dari: dari, sampai: sampai,
      total: bacaan(eTotal),
      cabangTerhitung: lok.length,
      area: area, tanpaArea: tanpaArea, tanpaKepala: tanpaKepala
    };
  }

  /* Daftar rata satu tingkat — untuk tabel dan pengurutan, ketika yang
     dicari "cabang mana yang paling tertinggal" dan bukan strukturnya. */
  function rata(p, tingkat) {
    var out = [];
    (function telusur(simpul) {
      (simpul || []).forEach(function (n) {
        if (n.tingkat === tingkat) out.push(n);
        if (n.anak) telusur(n.anak);
        /* `tanpaRegu` ikut ditelusuri, bukan hanya `anak`.

           Melewatkannya berarti petugas yang belum masuk regu tidak muncul
           di daftar rata mana pun — tepat kebalikan dari alasan simpul itu
           dibuat. Cacat yang sama persis dengan yang hendak dicegahnya, dan
           hanya ketahuan karena jumlahnya dihitung: 255 dari 258. */
        if (n.tanpaRegu) telusur(n.tanpaRegu);
      });
    })((p.area || []).concat(p.tanpaArea || [], p.tanpaKepala || []));
    return out;
  }

  return { pohon: pohon, rata: rata, sapu: sapu };
})();
