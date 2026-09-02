/* ==========================================================================
   views/mcs-sistem.js — Hak akses, profil korporat, layar petugas lapangan
   --------------------------------------------------------------------------
   Pengaturan dan layar petugas. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
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
      barisTugas = VMCS.barisTugas,
      calonAtasan = VMCS.calonAtasan,
      delegasi = VMCS.delegasi,
      dialogLapor = VMCS.dialogLapor,
      dialogPindai = VMCS.dialogPindai,
      dialogTag = VMCS.dialogTag,
      jml = VMCS.jml,
      korp = VMCS.korp,
      tandai = VMCS.tandai,
      tombol = VMCS.tombol;

  function kartuBukti() {
    var c = MCS.config();
    var k = korp();
    var area = k ? MCS.area(k.id) : [];
    var belumPernah = area.filter(function (a) {
      return !MCS.riwayatPindai(a.id, 1).length; });

    var zonaTerpakai = {};
    (k && window.LOKASI ? LOKASI.semua(k.id) : []).forEach(function (l) {
      var z = (window.ZONA ? ZONA.lokasi(l.id) : '');
      if (z) (zonaTerpakai[z] = zonaTerpakai[z] || []).push(l.nama);
    });
    var daftarZona = Object.keys(zonaTerpakai);

    return UI.card({
      title: T('Zona waktu'), cls: 'mb-3',
      sub: T('Jam mana yang dipakai menilai “sudah lewat jamnya”'),
      body:
        UI.alert('info', T('Seluruh waktu disimpan dalam UTC dan tidak pernah berubah. Zona ' +
          'hanya menentukan bagaimana ia DIBACA — dan cabang di Makassar harus dibaca ' +
          'dengan jam Makassar walaupun yang membukanya duduk di Jakarta.'), '🌐') +

        '<div class="grid g-2 mt-3">' +
          '<div class="field"><label>' + T('Bawaan korporat') + '</label>' +
          /* Digambar lewat UI.field supaya pengelompokan optgroup-nya sama
             persis dengan pemilih di dialog gedung — dua daftar zona yang
             berbeda bentuk di dua layar adalah dua daftar yang akan berbeda
             isinya suatu hari. */
          (function () {
            if (!window.ZONA) return '<select class="select" data-change="pf-zona"></select>';
            var opsi = ZONA.pilihan({ value: '',
              label: T('Ikut perangkat yang membuka') + '  ·  ' + ZONA.singkat(ZONA.perangkat()) });
            function html(list) {
              return list.map(function (o) {
                if (o.grup) return '<optgroup label="' + U.esc(o.grup) + '">' +
                  html(o.options) + '</optgroup>';
                return '<option value="' + U.esc(o.value) + '"' +
                  (String(c.zona || '') === String(o.value) ? ' selected' : '') + '>' +
                  U.esc(o.label) + '</option>';
              }).join('');
            }
            return '<select class="select" data-change="pf-zona">' + html(opsi) + '</select>';
          })() +
          '<div class="hint">' + T('Dipakai cabang yang zonanya belum diisi sendiri. ' +
            'Cabang mengaturnya di layar Lokasi.') + '</div></div>' +
        '</div>' +

        /* Daftar zona yang SUNGGUH terpakai — bukan setelannya, melainkan
           akibatnya. Korporat yang mengira seluruh cabangnya sezona akan
           menemukan di sini bahwa tiga belas di antaranya tidak. */
        (daftarZona.length > 1
          ? '<div class="mt-3">' + UI.alert('warn',
              '<b>' + jml(daftarZona.length,
                T('Cabang Anda berada di 1 zona waktu'),
                T('Cabang Anda tersebar di {n} zona waktu')) + '.</b> ' +
              U.esc(daftarZona.map(function (z) {
                return (window.ZONA ? ZONA.singkat(z) : z) + ' (' +
                  zonaTerpakai[z].length + ')';
              }).join(' · ')), '🗺️') + '</div>'
          : '')
    }) +

    UI.card({
      title: T('Bukti kehadiran'), cls: 'mb-3',
      sub: T('Tag QR yang ditempel di area, dipindai sebelum melapor'),
      body:
        UI.alert('info', T('Tanpa ini, laporan kebersihan adalah pengakuan sendiri — siapa pun ' +
          'bisa mencentang apa pun dari mana pun. Dengan tag tertempel, laporan menuntut ' +
          'seseorang pernah berada di sana.'), '🏷️') +

        '<label class="check mt-3"><input type="checkbox" data-change="pf-wajibpindai"' +
          (c.wajibPindai ? ' checked' : '') + '>' +
          '<span><b>' + T('Wajib pindai tag sebelum menandai selesai') + '</b>' +
          '<small>' + T('Berlaku untuk semua area gedung ini.') + '</small></span></label>' +

        (c.wajibPindai && belumPernah.length
          ? '<div class="mt-2">' + UI.alert('warn',
              '<b>' + U.esc(jml(belumPernah.length,
                  T('1 area belum pernah dipindai sama sekali'),
                  T('{n} area belum pernah dipindai sama sekali'))) + '.</b> ' +
              T('Pastikan tagnya sudah dicetak dan tertempel, kalau tidak pelaporan di sana ' +
                'akan terkunci: ') + U.esc(belumPernah.slice(0, 5).map(function (a) {
                  return a.nama; }).join(', ')) +
              (belumPernah.length > 5 ? '…' : ''), '⚠️') + '</div>'
          : '') +

        '<div class="grid g-2 mt-3">' +
          UI.field({ name: 'pindaiBerlakuMenit', label: T('Pindaian berlaku berapa menit'),
            type: 'number', value: c.pindaiBerlakuMenit,
            hint: T('Sekali pindai menutupi pekerjaan sepanjang rentang ini.') }) +
          UI.field({ name: 'radiusMeter', label: T('Jarak maksimal dari titik area (m)'),
            type: 'number', value: c.radiusMeter,
            hint: T('0 = tidak diperiksa. GPS di dalam gedung meleset puluhan meter, ' +
              'jadi angkanya sengaja longgar.') }) +
        '</div>' +
        '<button class="btn btn--ghost btn--sm mt-1" data-act="pf-simpan-bukti">' +
          T('Simpan pengaturan bukti') + '</button>'
    });
  }

  function renderProfil() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    return UI.alert('info', T('Data ini dipakai pada laporan dan pesan pengingat kepada petugas Anda.'), 'ℹ️') +
      '<div class="mb-3"></div>' +
      UI.card({ title: T('Profil perusahaan'),
        tools: '<button class="btn btn--primary btn--sm" data-act="mcs-profil-ubah">' + T('Ubah') + '</button>',
        body:
          baris(T('Nama perusahaan'), '<b>' + U.esc(k.nama) + '</b>') +
          baris(T('Bidang usaha'), U.esc(k.bidang || '—')) +
          barisAlamat(k) +
          baris(T('Telepon'), U.esc(k.telp || '—')) +
          baris(T('NPWP'), U.esc(k.npwp || '—')) +
          '<div class="kh-garis"></div>' +
          baris(T('Penanggung jawab'), U.esc(k.pic || '—')) +
          baris(T('HP penanggung jawab'), U.esc(k.picTelp || '—')) +
          baris(T('Jumlah karyawan'), k.jumlahKaryawan ? U.num(k.jumlahKaryawan) : '—') +
          baris(T('Jam operasional'), U.esc(k.jamOperasional || '—')) +
          (k.catatan ? baris(T('Catatan'), '<i>' + U.esc(k.catatan) + '</i>') : '') }) +
      '<div class="mb-3"></div>' +
      kartuBukti();
  }

  function barisAlamat(k) {
    if (!window.WILAYAH || !WILAYAH.terstruktur(k.wilayah)) {
      return baris(T('Alamat'), U.esc(k.alamat || '—')) +
        (k.alamat
          ? baris('', '<span class="mcs-warn">' + T('Belum memakai kolom wilayah — buka Ubah untuk melengkapinya.') + '</span>')
          : '');
    }
    var w = k.wilayah;
    var ist = WILAYAH.istilah(w.negara);
    var neg = WILAYAH.negara(w.negara) || { nama: w.negara };
    return baris(T('Alamat jalan'), U.esc(w.jalan || '—')) +
      (w.patokan ? baris(T('Patokan'), U.esc(w.patokan)) : '') +
      baris(U.esc(T(ist.l4)), U.esc(w.l4 || '—')) +
      baris(U.esc(T(ist.l3)), U.esc(w.l3 || '—')) +
      baris(U.esc(T(ist.l2)), U.esc(w.l2 || '—')) +
      baris(U.esc(T(ist.l1)), U.esc(w.l1 || '—')) +
      baris(U.esc(T(ist.pos)), U.esc(w.kodePos || '—')) +
      baris(T('Negara'), U.esc(neg.nama || w.negara));
  }

  function mountProfil(root) {
    delegasi(root, {
      /* Sakelar disimpan SEKETIKA, tanpa tombol simpan. Ia satu-satunya
         pengaturan yang bisa mengunci pelaporan seluruh gedung — orang yang
         mencentangnya lalu menutup halaman tanpa menekan simpan akan mengira
         buktinya sudah menyala padahal belum. */
      'pf-zona': function (el) {
        MCS.simpanConfig({ zona: el.value || '' });
        UI.toast(T('Zona waktu bawaan disimpan'), 'ok');
        APP.refresh();
      },
      'pf-wajibpindai': function (el) {
        MCS.simpanConfig({ wajibPindai: !!el.checked });
        UI.toast(el.checked ? T('Bukti kehadiran diwajibkan.')
                            : T('Bukti kehadiran tidak lagi diwajibkan.'),
                 el.checked ? 'ok' : 'warn');
        APP.refresh();
      },
      'pf-simpan-bukti': function (el) {
        var kartu = el.closest('.card') || el.parentNode;
        var f = U.readForm(kartu);
        MCS.simpanConfig({
          /* Nol menit berarti pindaian kedaluwarsa seketika — pelaporan jadi
             mustahil. Dibatasi bawah, bukan diterima lalu ditertawakan. */
          pindaiBerlakuMenit: Math.max(5, Number(f.pindaiBerlakuMenit) || 45),
          radiusMeter: Math.max(0, Number(f.radiusMeter) || 0)
        });
        UI.toast(T('Pengaturan bukti disimpan.'), 'ok');
        APP.refresh();
      },
      'mcs-profil-ubah': function () {
        var k = korp();
        var w = MCS.wilayahKorporat(k);
        UI.formModal({
          title: T('Profil perusahaan'), okText: T('Simpan'), size: 'wide',
          /* Alamat memakai kolom bertingkat yang SAMA dengan alamat pengguna:
             negara menentukan istilahnya (provinsi/state/prefektur), lalu
             daftar di bawahnya menyusut mengikuti pilihan di atasnya. Menyalin
             sistem alamat kedua berarti dua daftar wilayah yang pelan-pelan
             berbeda isinya. */
          fields: [
            { name: 'nama', label: T('Nama perusahaan'), value: k.nama, required: true },
            { name: 'bidang', label: T('Bidang usaha'), value: k.bidang || '',
              placeholder: T('mis. perbankan, manufaktur, rumah sakit') },
            /* Yang paling tahu bentuk usahanya adalah orang di dalamnya,
               bukan admin yang mendaftarkannya dari kontrak. */
            { name: 'jenis', label: T('Bentuk pengelolaan'), type: 'select',
              value: k.jenis || '',
              options: [{ value: '', label: T('— belum dinyatakan —') }].concat(
                Object.keys(MCS.JENIS_USAHA).map(function (j) {
                  return { value: j, label: T(MCS.JENIS_USAHA[j].nama) };
                })),
              hint: T(MCS.JENIS_USAHA[k.jenis] ? MCS.JENIS_USAHA[k.jenis].ket
                : 'Yang mengelola sendiri tidak melihat menu Kontrak dan Tagihan.') }
          ].concat(WILAYAH.fields(w)).concat([
            { name: 'telp', label: T('Telepon kantor'), value: k.telp || '' },
            { name: 'npwp', label: T('NPWP'), value: k.npwp || '' },
            { name: 'pic', label: T('Penanggung jawab kebersihan'), value: k.pic || '' },
            { name: 'picTelp', label: T('HP penanggung jawab'), value: k.picTelp || '' },
            { name: 'jumlahKaryawan', label: T('Jumlah karyawan'), type: 'number',
              value: k.jumlahKaryawan || '' },
            { name: 'jamOperasional', label: T('Jam operasional'), value: k.jamOperasional || '',
              placeholder: '08:00 – 17:00' },
            { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2, value: k.catatan || '' }
          ]),
          validate: function (d) { return WILAYAH.periksa(WILAYAH.dariForm(d)); },
          onMount: function (root) { WILAYAH.pasang(root); }
        }).then(function (d) {
          if (!d) return;
          d.wilayah = WILAYAH.dariForm(d);
          var r = MCS.simpanProfil(k.id, d);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Profil disimpan'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ============================================================== PEKERJA */

  function diriPetugas() {
    return MCS.pekerjaDariUser(APP.user);
  }

  function renderPetugasBeranda() {
    var me = diriPetugas();
    if (!me) {
      return UI.empty('👤', T('Data petugas tidak ditemukan'),
        T('Hubungi staf gedung Anda untuk memperbaiki akun ini.'));
    }
    var k = MCS.korporat(me.korporatId);
    var tgl = U.today();
    var areaSaya = MCS.areaPekerja(me.id);
    var idSaya = {};
    areaSaya.forEach(function (a) { idSaya[a.id] = true; });

    /* Tugas hari ini yang menjadi urusannya: dijadwalkan atas namanya, ATAU
       berada di area kerjanya. Keduanya, bukan salah satu — petugas yang
       menggantikan rekannya tidak akan pernah melihat tugas itu kalau yang
       dipakai hanya nama pada jadwal. */
    var tugas = MCS.tugasHari(me.korporatId, tgl).filter(function (t) {
      return (t.pekerja && t.pekerja.id === me.id) || (t.area && idSaya[t.area.id]);
    });
    var selesai = tugas.filter(function (t) { return t.status === 'selesai'; }).length;
    var aduan = MCS.aduan(me.korporatId).filter(function (x) {
      return x.pekerjaId === me.id || idSaya[x.areaId]; });
    var hadir = MCS.absensiHari(me.korporatId, tgl).filter(function (x) {
      return x.pekerja.id === me.id; })[0];

    return '<div class="pg-kepala">' +
        /* Nama UTUH, bukan potongan sebelum spasi: 'Bu Marni' dipenggal menjadi
           'Bu', dan menyapa orang dengan sapaannya sendiri terdengar keliru
           di telinga siapa pun. */
        '<div><h2 class="mcs-h">' + T('Halo') + ', ' + U.esc(me.nama) + '</h2>' +
        '<div class="tbl-sub">' + U.esc(k ? k.nama : '') + ' · ' + U.tglPanjang(tgl) + '</div></div>' +
        '<button class="btn" data-act="mcs-pindai">🏷️ ' + T('Pindai tag') + '</button>' +
      '</div>' +

      /* Kehadiran ditandai petugas sendiri. Tombolnya berdiri di paling atas
         karena inilah hal pertama yang dilakukan orang setiba di gedung. */
      (hadir && hadir.status
        ? UI.alert(MCS.statusHadir(hadir.status).bekerja ? 'ok' : 'warn',
            MCS.statusHadir(hadir.status).ikon + ' ' +
            T('Kehadiran hari ini tercatat sebagai') + ' <b>' +
            T(MCS.statusHadir(hadir.status).nama) + '</b>' +
            /* Caranya ikut disebut. Petugas berhak tahu bahwa catatannya
               belum berbukti lokasi — dan itu satu-satunya cara ia tahu
               masih perlu memindai. */
            (function () {
              var b = MCS.buktiAbsensi(hadir.bukti);
              return '<div class="tbl-sub mt-1">' + b.ikon + ' ' +
                U.esc(T(b.nama)) + (b.kuat ? '' : ' · ' + U.esc(T(b.ket))) + '</div>';
            })(), '') + '<div class="mb-3"></div>'
        : UI.alert('info', T('Kehadiran Anda hari ini belum tercatat.') +
            ' <button class="btn btn--sm" data-act="pg-hadir">' + T('Saya hadir') + '</button>',
            '🗒️') + '<div class="mb-3"></div>') +

      (areaSaya.length
        ? ''
        : UI.alert('warn', '<b>' + T('Anda belum ditugasi area mana pun.') + '</b> ' +
            T('Minta staf gedung menetapkan area kerja Anda, kalau tidak daftar tugas ' +
              'di bawah akan kosong.'), '📍') + '<div class="mb-3"></div>') +

      '<div class="grid g-2 mb-3">' +
        UI.stat({ label: T('Tugas hari ini'), value: tugas.length, icon: '🧹' }) +
        UI.stat({ label: T('Sudah selesai'), value: selesai, icon: '✅' }) +
      '</div>' +

      (aduan.length
        ? UI.alert('warn', '<b>' + jml(aduan.length, T('1 aduan di area Anda'),
            T('{n} aduan di area Anda')) + '.</b> ' +
            U.esc(aduan.slice(0, 3).map(function (x) {
              var a = MCS.areaSatu(x.areaId);
              return (a ? a.nama + ': ' : '') + (x.teks || T('tanpa keterangan'));
            }).join(' · ')), '📣') + '<div class="mb-3"></div>'
        : '') +

      UI.card({ title: T('Tugas Anda hari ini'),
        sub: selesai + ' / ' + tugas.length + ' ' + T('selesai'),
        body: tugas.length
          ? '<div class="mcs-list">' + tugas.map(barisTugas).join('') + '</div>'
          : UI.empty('🎉', T('Tidak ada tugas hari ini'),
              T('Nikmati harinya — atau tanyakan ke atasan Anda bila ini terasa keliru.')) });
  }

  function renderPetugasArea() {
    var me = diriPetugas();
    if (!me) return UI.empty('👤', T('Data petugas tidak ditemukan'), '');
    var l = MCS.areaPekerja(me.id);
    var atasan = MCS.rantaiKomando(me.id);

    return UI.card({ title: T('Kedudukan Anda'), cls: 'mb-3',
      body:
        baris(T('Jabatan'), '<b>' + T(MCS.jabatan(me.jabatan).nama) + '</b>') +
        baris(T('Jenis pekerjaan'), T(MCS.jenisPekerja(me.jenis).nama)) +
        baris(T('Melapor kepada'), atasan.length
          ? U.esc(atasan.map(function (p) { return p.nama; }).join(' → '))
          : '—') +
        (MCS.bawahan(me.id).length
          ? baris(T('Membawahi'), U.esc(MCS.bawahan(me.id).map(function (p) {
              return p.nama; }).join(', ')))
          : '') +
        baris(T('Shift'), U.esc(namaShift(me))) }) +

      UI.card({ title: T('Area kerja Anda'),
        sub: jml(l.length, '1 area', '{n} area'),
        body: l.length
          ? '<div class="ma-list">' + l.map(function (a) {
              var lk = MCS.langkahArea(a);
              return '<div class="ma-r">' +
                '<div class="mcs-t__i">' + U.ikon(MCS.jenisArea(a.jenis).ikon) + '</div>' +
                '<div class="ma-r__t"><b>' + U.esc(a.nama) + '</b>' +
                  '<span>' + U.esc([a.gedung, a.lantai ? 'Lt. ' + a.lantai : ''].filter(Boolean).join(' · ')) +
                    (lk.length ? ' · ' + jml(lk.length, '1 langkah', '{n} langkah') : '') +
                  '</span></div>' +
                '<button class="btn btn--ghost btn--sm" data-act="pg-tag" data-id="' + a.id + '">' +
                  '🏷️</button>' +
              '</div>';
            }).join('') + '</div>'
          : UI.empty('📍', T('Belum ada area kerja'),
              T('Staf gedung yang menetapkannya.')) });
  }

  function mountPetugas(root) {
    delegasi(root, {
      'mcs-pindai': function () { dialogPindai({}); },
      'pg-tag': function (el) { dialogTag(el.getAttribute('data-id')); },
      'pg-hadir': function () {
        var me = diriPetugas(); if (!me) return;
        /* bukti:'sendiri' adalah PENGAKUAN, bukan klaim — MCS.tandaiHadir
           menaikkannya sendiri menjadi 'pindai' bila memang ada pemindaian
           tag hari ini. Layar tidak boleh menentukan kekuatan buktinya. */
        MCS.tandaiHadir(me.korporatId, me.id, U.today(), 'hadir',
          { bukti: 'sendiri' }, APP.user);
        var a = MCS.absensiHari(me.korporatId, U.today())
          .filter(function (x) { return x.pekerja.id === me.id; })[0];
        var b = MCS.buktiAbsensi(a && a.bukti);
        UI.toast(b.kuat
          ? T('Kehadiran tercatat — sudah didukung pemindaian tag hari ini.')
          : T('Kehadiran tercatat sebagai pernyataan sendiri. Pindai tag di ' +
              'area pertama Anda agar tercatat sebagai bukti lokasi.'),
          b.kuat ? 'ok' : 'warn');
        APP.refresh();
      },
      'mcs-lapor': function (el) {
        dialogLapor(el.getAttribute('data-j'), el.getAttribute('data-t'), el.getAttribute('data-h'));
      },
      'mcs-selesai': function (el) {
        var me = diriPetugas(); if (!me) return;
        var j = el.getAttribute('data-j'), tg = el.getAttribute('data-t'), h = el.getAttribute('data-h');
        var t = MCS.tugasHari(me.korporatId, tg).filter(function (x) {
          return x.jadwalId === j && x.jam === h; })[0];
        /* Area yang menuntut bukti dibuka dialognya, bukan ditolak — sama
           seperti pada layar staf. */
        if (t && (t.wajibFoto || t.area.wajibLangkah || t.area.wajibFotoLangkah)) {
          dialogLapor(j, tg, h); return;
        }
        var r = MCS.tandai(me.korporatId, j, tg, h, 'selesai', APP.user, { pekerjaId: me.id });
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(T('Ditandai selesai'), 'ok');
        /* Ditanyakan SESUDAH tugasnya tercatat selesai, bukan sebelum.
           Kalau sebelum, petugas yang menutup dialognya kehilangan laporan
           tugasnya juga — dan pertanyaan tambahan tidak boleh menyandera
           pekerjaan yang sudah benar-benar selesai. */
        if (t && t.area) tanyaPemakaian(me, t.area);
        else APP.refresh();
      },
      'mcs-batal': function (el) {
        var me = diriPetugas(); if (!me) return;
        MCS.batalTandai(el.getAttribute('data-j'), el.getAttribute('data-t'),
          el.getAttribute('data-h'));
        APP.refresh();
      },
      zoom: function (el) { UI.lightbox(el.getAttribute('data-id')); }
    });
  }

  /* ======================================= tanya pemakaian setelah selesai
     Lapis ketiga. Sengaja OPSIONAL dan sengaja PENDEK.

     Yang ditawarkan hanya barang yang lingkupnya cocok dengan area ini — di
     toilet muncul pembersih toilet dan tisu, bukan dua puluh barang gudang.
     Tanpa penyaringan itu, daftarnya terlalu panjang untuk dibaca sambil
     berdiri, dan yang terlalu panjang akan dilewati tiap kali.

     Kosong secara bawaan. Yang mengisi hanya petugas yang memang membuka
     kemasan baru; yang lain menekan Lewati. Angka yang dipaksakan dari orang
     yang tidak tahu lebih buruk daripada kolom kosong — ia terlihat seperti
     data. */

  function barangUntukArea(korporatId, area) {
    var objekJenis = {};
    (MCS.objek(area.id) || []).forEach(function (o) { objekJenis[o.jenis] = 1; });
    return MCS.stok(korporatId).filter(function (x) {
      if (x.saldo <= 0) return false;
      var la = x.jenisArea || [], lo = x.jenisObjek || [];
      /* Tanpa lingkup sama sekali = serbaguna, muncul di mana saja. */
      if (!la.length && !lo.length) return true;
      if (lo.length) return lo.some(function (kk) { return objekJenis[kk]; });
      return la.indexOf(area.jenis) >= 0;
    });
  }

  var tpTahan = {};

  var tpTutup = null;

  function tanyaPemakaian(me, area) {
    var l = barangUntukArea(me.korporatId, area);
    if (!l.length) { APP.refresh(); return; }
    /* Dispenser di area ini — pengisian ulangnya dicatat pada objeknya,
       sehingga kelak bisa dijawab dispenser mana yang paling cepat habis. */
    var disp = (MCS.objek(area.id) || []).filter(function (o) {
      return MCS.jenisObjek(o.jenis).kode === 'dispenser';
    });
    tpTahan = {};

    UI.modal({
      title: T('Ada bahan yang dipakai?'),
      sub: area.nama,
      body:
        '<div class="tbl-sub mb-2">' +
          T('Isi hanya bila Anda membuka kemasan baru atau mengisi ulang ' +
            'dispenser. Kalau memakai sisa di troli, lewati saja — barangnya ' +
            'sudah tercatat waktu diambil dari gudang.') +
        '</div>' +
        '<div class="op-t">' +
          l.map(function (x) {
            return '<div class="tp-r">' +
              '<span><b>' + U.esc(x.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(x.satuan) + ' · ' +
                  T('sisa') + ' ' + U.num(x.saldo) + '</div></span>' +
              '<span class="tp-b">' +
                '<button type="button" class="btn btn--ghost btn--sm" ' +
                  'data-tp-k="' + x.id + '">−</button>' +
                '<input class="input tp-i" type="number" min="0" ' +
                  'data-tp="' + x.id + '" placeholder="0">' +
                '<button type="button" class="btn btn--ghost btn--sm" ' +
                  'data-tp-t="' + x.id + '">+</button>' +
              '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        (disp.length
          ? '<div class="field mt-3"><label>' + T('Untuk dispenser') + '</label>' +
              '<select class="input" id="tp-objek">' +
                '<option value="">— ' + T('bukan pengisian dispenser') + ' —</option>' +
                disp.map(function (o) {
                  return '<option value="' + o.id + '">' + U.esc(o.nama) + '</option>';
                }).join('') + '</select></div>'
          : '') +
        '<div id="tp-ring" class="tbl-sub mt-2"></div>',
      foot: '<button class="btn btn--ghost" data-act="tp-lewati">' + T('Lewati') + '</button>' +
        '<button class="btn" data-act="tp-simpan">' + T('Catat') + '</button>',
      onMount: function (root, tutup) {
        tpTutup = tutup;
        /* Tombol tambah-kurang, bukan hanya kotak angka: ini diisi sambil
           berdiri memegang ponsel, dan mengetik angka dengan satu tangan
           adalah alasan paling umum sebuah kolom dilewati. */
        function geser(id, arah) {
          var el = root.querySelector('[data-tp="' + id + '"]');
          if (!el) return;
          el.value = Math.max(0, (Number(el.value) || 0) + arah);
          hitungTanya(root);
        }
        Array.prototype.forEach.call(root.querySelectorAll('[data-tp-t]'), function (b) {
          b.addEventListener('click', function () { geser(b.getAttribute('data-tp-t'), 1); });
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-tp-k]'), function (b) {
          b.addEventListener('click', function () { geser(b.getAttribute('data-tp-k'), -1); });
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-tp]'), function (el) {
          el.addEventListener('input', function () { hitungTanya(root); });
        });
        hitungTanya(root);
      },
      onTutup: function () { APP.refresh(); },
      actions: {
        'tp-lewati': function () { if (tpTutup) { tpTutup(); tpTutup = null; } },
        'tp-simpan': function () { simpanTanya(me, area); }
      }
    });
  }

  function hitungTanya(root) {
    var n = 0;
    tpTahan = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-tp]'), function (el) {
      var j = Math.max(0, Math.round(Number(el.value) || 0));
      if (!j) return;
      n++; tpTahan[el.getAttribute('data-tp')] = j;
    });
    var r = document.getElementById('tp-ring');
    if (r) {
      r.innerHTML = n ? jml(n, T('1 barang akan dicatat'), T('{n} barang akan dicatat'))
                      : T('Belum ada yang diisi — boleh dilewati.');
    }
  }

  function simpanTanya(me, area) {
    var ids = Object.keys(tpTahan);
    if (!ids.length) { if (tpTutup) { tpTutup(); tpTutup = null; } return; }
    var obEl = document.getElementById('tp-objek');
    var objekId = (obEl && obEl.value) || null;
    var berhasil = 0, gagal = [];
    ids.forEach(function (id) {
      var r = objekId
        ? MCS.isiUlang(id, objekId, tpTahan[id], APP.user, { pekerjaId: me.id })
        : MCS.catatMutasi(id, -tpTahan[id], 'keluar', T('Dipakai saat bertugas'),
            APP.user, area.id, { pekerjaId: me.id });
      if (r.error) {
        var x = MCS.stokSatu(id);
        gagal.push((x ? x.nama : id) + ': ' + r.error);
        return;
      }
      berhasil++;
    });
    DB.save(true);
    if (gagal.length) { UI.toast(gagal[0], 'err'); return; }
    if (tpTutup) { tpTutup(); tpTutup = null; }
    UI.toast(jml(berhasil, '1 pemakaian dicatat', '{n} pemakaian dicatat'), 'ok');
  }

  function renderAkses() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var staf = MCS.stafKorporat(k.id);
    var aktif = staf.filter(function (u) { return u.aktif !== false; });
    var lok = LOKASI.semua(k.id);

    return UI.alert('info',
      '<b>' + T('Satu orang, satu peran, dan cabang yang menjadi urusannya.') + '</b> ' +
      T('Peran menentukan MENU apa yang terbuka; daftar cabang menentukan ' +
        'DATA siapa yang terlihat. Keduanya perlu — kepala cabang yang boleh ' +
        'membuka Penggajian tanpa batas cabang akan melihat gaji seluruh ' +
        'Indonesia.'), '🔐') + '<div class="mb-3"></div>' +

    /* Batasnya disebut di layarnya sendiri, bukan hanya di dalam kode.
       Orang yang mengatur hak akses berhak tahu seberapa jauh pengaturannya
       sungguh menjaga. */
    UI.alert('warn',
      '<b>' + T('Ini pembatasan tampilan, bukan penjagaan server.') + '</b> ' +
      T('Aplikasi ini seluruhnya berjalan di peramban, jadi orang yang paham ' +
        'teknis masih bisa membaca data lewat alat pengembang. Pengaturan di ' +
        'sini mencegah orang tersandung ke tempat yang bukan urusannya — ia ' +
        'bukan kunci terhadap yang memang berniat menembus.'), '⚠️') +
    '<div class="mb-3"></div>' +

    '<div class="row row--sb mb-3">' +
      '<div class="hint">' +
        jml(aktif.length, '1 staf aktif', '{n} staf aktif') +
        (staf.length > aktif.length
          ? ' · ' + jml(staf.length - aktif.length, '1 nonaktif', '{n} nonaktif')
          : '') +
        ' · ' + jml(lok.length, '1 cabang', '{n} cabang') + '</div>' +
      '<button class="btn btn--sm" data-act="ha-baru">＋ ' + T('Staf baru') + '</button>' +
    '</div>' +

    kartuPeranRingkas(k) +
    '<div class="mb-3"></div>' +
    kartuStaf(staf, lok);
  }

  /**
   * Enam peran beserta ISI kewenangannya.
   *
   * Ditulis apa adanya, bukan disembunyikan di balik nama perannya. "Kepala
   * Cabang" tidak memberi tahu siapa pun bahwa ia TIDAK melihat penggajian —
   * dan yang tidak diberi tahu akan mengira orang itu melihatnya.
   */

  function kartuPeranRingkas(k) {
    var st = MCSAKSES.statistik(k.id);
    return UI.card({ title: T('Peran yang tersedia'),
      sub: T('Apa yang terbuka untuk masing-masing'),
      body: '<div class="ha-p">' + st.map(function (x) {
        var p = x.peran;
        var hal = MCSAKSES.halamanPeran(p);
        var kel = MCSAKSES.KELOMPOK.filter(function (g) {
          return p.kelompok === '*' || (p.kelompok || []).indexOf(g.kode) >= 0;
        });
        return '<div class="ha-p__i">' +
          '<div class="ha-p__h">' +
            '<span class="ha-p__k">' + p.ikon + '</span>' +
            '<div><b>' + T(p.nama) + '</b>' +
              '<div class="tbl-sub">' +
                jml(x.jumlah, '1 orang', '{n} orang') + ' · ' +
                jml(hal.length, '1 menu', '{n} menu') + ' · ' +
                (p.semuaLokasi ? T('semua cabang') : T('cabang tertentu')) +
                (p.tulis ? '' : ' · <b class="txt-danger">' + T('baca saja') + '</b>') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p class="ha-p__t">' + U.esc(T(p.ket)) + '</p>' +
          '<div class="ha-p__g">' +
            kel.map(function (g) {
              return '<span class="chip chip--muted chip--xs">' + g.ikon + ' ' +
                T(g.nama) + '</span>';
            }).join('') +
            (p.halamanTambahan || []).map(function (h) {
              return '<span class="chip chip--muted chip--xs">＋ ' +
                T(namaHalaman(h)) + '</span>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('') + '</div>' });
  }

  /* Nama halaman untuk ditampilkan. Diambil dari daftar halaman itu sendiri
     supaya tidak ada dua tempat yang harus diubah bersamaan.

     Dibaca dari VMCS._hal.korporat — tempat tiap berkas layar mendaftarkan
     halamannya — bukan dari ViewMCS.pagesKorporat. Keduanya berisi hal yang
     sama, tetapi yang kedua baru ada sesudah views/mcs.js merakit, dan
     berkas ini dimuat sebelumnya.

     Sebelum pemecahan berkas, baris ini membaca variabel `pagesKorporat`
     yang sekamar dengannya. Sesudah pemecahan variabel itu tidak ada lagi,
     dan rujukannya menjadi ReferenceError yang TIDAK terlihat oleh
     pemeriksaan sintaks mana pun — halaman Hak Akses berhenti tergambar dan
     hanya itu tandanya. Yang menangkapnya: membandingkan keluaran seluruh
     192 halaman sebelum dan sesudah pemecahan. */
  function namaHalaman(key) {
    var h = VMCS._hal.korporat;
    return (h[key] && h[key].label) || key;
  }

  function kartuStaf(staf, lok) {
    var petaLok = {};
    lok.forEach(function (l) { petaLok[l.id] = l.nama; });

    return UI.card({ title: T('Staf korporat'), flush: true,
      body: staf.length
        ? UI.table([
            { h: T('Nama'), r: function (u) {
              var p = MCSAKSES.peranUser(u);
              return '<div class="tbl-title">' + U.esc(u.nama) +
                (u.id === APP.user.id
                  ? ' <span class="chip chip--brand chip--xs">' + T('Anda') + '</span>'
                  : '') +
                (u.aktif === false
                  ? ' <span class="chip chip--muted chip--xs">' + T('nonaktif') + '</span>'
                  : '') + '</div>' +
                '<div class="tbl-sub">' + U.esc(u.jabatan || '') + ' · ' +
                  U.esc(u.email) + '</div>'; } },
            { h: T('Peran'), r: function (u) {
              var p = MCSAKSES.peranUser(u);
              return '<span class="chip">' + p.ikon + ' ' + T(p.nama) + '</span>' +
                (p.tulis ? '' :
                  '<div class="tbl-sub txt-danger">' + T('baca saja') + '</div>'); } },
            { h: T('Atasan'), r: function (u) {
              var p = MCSAKSES.peranUser(u);
              var bw = MCSAKSES.bawahan(u.id);
              var at = MCSAKSES.atasan(u);
              /* Dua arah ditampilkan sekaligus: kepada siapa ia melapor,
                 dan siapa yang melapor kepadanya. Struktur yang hanya
                 menampilkan satu arah menuntut orang membuka dua layar
                 untuk satu pertanyaan. */
              var baris = [];
              if (at) baris.push('↑ ' + U.esc(at.nama));
              if (bw.length) {
                baris.push('↓ ' + jml(bw.length, '1 bawahan', '{n} bawahan'));
              }
              if (!baris.length) {
                return '<span class="tbl-sub">' +
                  (p && p.atasan ? T('belum ditentukan') : '—') + '</span>';
              }
              return '<div class="tbl-sub">' + baris.join('<br>') + '</div>'; } },
            { h: T('Cabang'), r: function (u) {
              var p = MCSAKSES.peranUser(u);
              if (p.semuaLokasi) {
                return '<span class="tbl-sub">' + T('semua cabang') + '</span>';
              }
              var d = (u.mcsLokasi || []).filter(function (id) { return petaLok[id]; });
              /* Kosong pada peran bercabang berarti TANPA BATAS menurut
                 MCSAKSES — dan itu hampir pasti bukan yang dimaksud siapa
                 pun. Disebut merah, bukan dibiarkan tampak seperti nol.

                 AKIBATNYA disebut lengkap, bukan setengah. Sejak penyaringan
                 cabang ikut menentukan apa yang boleh diubah, daftar yang
                 kosong tidak lagi sekadar “melihat semua”: orangnya juga
                 tertahan dari mengubah apa pun. Admin yang membaca “melihat
                 semua” saja akan menganggapnya kelonggaran yang bisa
                 ditunda, lalu bingung ketika orangnya melapor tidak bisa
                 menyimpan apa-apa. */
              if (!d.length) {
                return '<span class="mcs-warn">' + T('belum diisi') + '</span>' +
                  '<div class="tbl-sub txt-danger">' +
                  T('melihat semua cabang, tetapi tidak bisa mengubah apa pun') +
                  '</div>';
              }
              return '<b>' + U.num(d.length) + '</b>' +
                '<div class="tbl-sub">' +
                  U.esc(d.slice(0, 2).map(function (id) { return petaLok[id]; }).join(', ')) +
                  (d.length > 2 ? ' +' + (d.length - 2) : '') + '</div>'; } },
            { h: '', cls: 'act', r: function (u) {
              return '<button class="btn btn--sm btn--ghost" data-act="ha-peran" ' +
                  'data-id="' + u.id + '">' + T('Peran') + '</button> ' +
                '<button class="btn btn--sm btn--ghost" data-act="ha-ubah" ' +
                  'data-id="' + u.id + '">' + T('Data') + '</button>'; } }
          ], staf, null, { sumber: {
            teks: T('Peran menentukan apa yang boleh dibuka; kolom Atasan dan ' +
              'Cabang datang dari Struktur & Capaian. Yang lingkup cabangnya ' +
              'kosong melihat SELURUH korporat, bukan tidak melihat apa-apa.'),
            hal: 'mcsHirarki', label: T('Buka struktur') } })
        : UI.empty('👥', T('Belum ada staf lain'),
            T('Tambahkan kepala cabang, supervisor, atau auditor.')) });
  }

  /* ---------------------------------------------------------- dialog peran */

  /* Cabang yang sedang dicentang. Ditahan di modul, bukan dibaca dari DOM
     saat menyimpan — pola yang sudah dua kali menelan isian di aplikasi ini. */

  var haLokasi = [];

  function dialogPeran(userId) {
    var k = korp();
    var u = DB.find('users', userId);
    if (!u) return;
    var lok = LOKASI.semua(k.id);
    haLokasi = (u.mcsLokasi || []).slice();
    var kodeAwal = MCSAKSES.peranUser(u).kode;

    /* Penutupnya datang sebagai ARGUMEN KEDUA onMount, bukan dari nilai
       kembalian UI.modal — nilai itu baru terisi SESUDAH onMount berjalan,
       jadi menyimpannya dari sana selalu menyimpan undefined. Akibatnya
       jendela tidak menutup setelah disimpan, dan orangnya menekan simpan
       dua kali. */
    UI.modal({
      title: T('Peran') + ' — ' + U.esc(u.nama),
      sub: U.esc(u.jabatan || ''),
      size: 'wide',
      body:
        '<div class="ha-r">' +
          MCSAKSES.PERAN.map(function (p) {
            return '<label class="ha-r__i">' +
              '<input type="radio" name="ha-peran" value="' + p.kode + '"' +
                (p.kode === kodeAwal ? ' checked' : '') + '>' +
              '<div>' +
                '<b>' + p.ikon + ' ' + T(p.nama) + '</b>' +
                '<div class="tbl-sub">' + U.esc(T(p.ket)) + '</div>' +
              '</div>' +
            '</label>';
          }).join('') +
        '</div>' +
        '<div id="ha-atasan">' + ruasAtasan(u, kodeAwal) + '</div>' +
        '<div id="ha-cabang">' + ruasCabang(kodeAwal, lok, u) + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
            '<button class="btn" data-act="ha-simpan-peran" data-id="' + userId +
              '">' + T('Simpan peran') + '</button>',
      onMount: function (root, tutupModal) {
        haTutup = tutupModal;
        root.addEventListener('change', function (ev) {
          if (ev.target.name === 'ha-peran') {
            var kotak = root.querySelector('#ha-cabang');
            if (kotak) kotak.innerHTML = ruasCabang(ev.target.value, lok, u);
            var kotakA = root.querySelector('#ha-atasan');
            if (kotakA) kotakA.innerHTML = ruasAtasan(u, ev.target.value);
            /* Ruasnya digambar ulang, jadi baris hitungannya ikut lahir baru
               dan kosong. Tanpa panggilan ini, mengganti peran membuat
               peringatan “akan melihat SEMUA cabang” menghilang justru pada
               saat peringatan itu paling perlu dibaca. */
            hitungCabang(root);
          }
          if (ev.target.hasAttribute && ev.target.hasAttribute('data-hl')) {
            var id = ev.target.getAttribute('data-hl');
            var i = haLokasi.indexOf(id);
            if (ev.target.checked) { if (i < 0) haLokasi.push(id); }
            else if (i >= 0) haLokasi.splice(i, 1);
            hitungCabang(root);
          }
        });
        root.addEventListener('click', function (ev) {
          var tb = ev.target.closest('[data-act="ha-bawahan"]');
          if (tb) {
            ev.preventDefault();
            /* MENGISIKAN, bukan mengikat — lihat catatan pada peran 'area'.
               Sesudah ini daftarnya milik orang ini sendiri, dan tidak ikut
               berubah ketika bawahannya berpindah. */
            var dari = MCSAKSES.lokasiBawahan(u.id);
            if (!dari.length) {
              UI.toast(T('Bawahannya belum punya cabang untuk diambil.'), 'err');
              return;
            }
            haLokasi = dari.slice();
            Array.prototype.forEach.call(root.querySelectorAll('[data-hl]'),
              function (c) { c.checked = haLokasi.indexOf(c.getAttribute('data-hl')) >= 0; });
            hitungCabang(root);
            return;
          }
          var t = ev.target.closest('[data-act="ha-semua"], [data-act="ha-kosong"]');
          if (!t) return;
          ev.preventDefault();
          var semua = t.getAttribute('data-act') === 'ha-semua';
          haLokasi = semua ? lok.map(function (l) { return l.id; }) : [];
          Array.prototype.forEach.call(root.querySelectorAll('[data-hl]'), function (c) {
            c.checked = semua;
          });
          hitungCabang(root);
        });
        hitungCabang(root);
      },
      actions: {
        'ha-simpan-peran': function (el) {
          var root = el.closest('.modal');
          var pilih = root.querySelector('[name="ha-peran"]:checked');
          if (!pilih) { UI.toast(T('Pilih perannya dulu.'), 'err'); return; }
          var r = MCSAKSES.pasangPeran(el.getAttribute('data-id'), pilih.value, haLokasi);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          var sel = root.querySelector('#ha-atasan-pilih');
          var ra = MCSAKSES.pasangAtasan(el.getAttribute('data-id'),
            sel ? sel.value : null);
          if (ra.error) { UI.toast(ra.error, 'err'); return; }
          if (haTutup) { haTutup(); haTutup = null; }
          UI.toast(T('Peran disimpan'), 'ok');
          /* Kalau yang diubah DIRI SENDIRI, sesi harus disegarkan — kalau
             tidak, menunya masih menu peran yang lama sampai halaman dimuat
             ulang, dan itu terlihat seperti pengaturannya tidak bekerja. */
          if (el.getAttribute('data-id') === APP.user.id) {
            APP.perbaruiSesi(DB.find('users', APP.user.id));
          }
          APP.refresh();
        }
      }
    });
  }

  var haTutup = null;

  /**
   * Pilihan atasan — hanya muncul untuk peran yang memang melapor.
   *
   * Menampilkannya untuk semua peran membuat orang mengisi atasan bagi
   * Auditor, dan atasan bagi pemeriksa adalah gagasan yang merusak arti
   * pemeriksaan itu sendiri.
   */

  function ruasAtasan(u, kodePeran) {
    var k = korp();
    var p = MCSAKSES.peran(kodePeran);
    if (!p || !p.atasan) return '';
    var calon = MCSAKSES.calonAtasan(k.id, kodePeran).filter(function (x) {
      return x.id !== u.id;
    });
    var pAtasan = MCSAKSES.peran(p.atasan);
    if (!calon.length) {
      return '<div class="hint mt-3">' +
        T('Belum ada {p} yang bisa dijadikan atasannya.')
          .replace('{p}', T(pAtasan ? pAtasan.nama : p.atasan)) + '</div>';
    }
    return '<div class="field mt-3"><label>' +
      T('Melapor kepada') + '</label>' +
      '<select class="input" id="ha-atasan-pilih">' +
        '<option value="">— ' + T('belum ditentukan') + ' —</option>' +
        calon.map(function (x) {
          return '<option value="' + x.id + '"' +
            (u.mcsAtasanId === x.id ? ' selected' : '') + '>' +
            U.esc(x.nama) + ' — ' + U.esc(x.jabatan || '') + '</option>';
        }).join('') +
      '</select></div>';
  }

  function ruasCabang(kodePeran, lok, u) {
    var p = MCSAKSES.peran(kodePeran);
    if (!p) return '';
    if (p.semuaLokasi) {
      return '<div class="hint mt-3">' +
        T('Peran ini melihat SELURUH cabang. Daftar cabang tidak berlaku untuknya.') +
        '</div>';
    }
    return '<div class="field mt-3">' +
      '<div class="row row--sb">' +
        '<label>' + T('Cabang yang menjadi urusannya') + '</label>' +
        '<div class="row" style="gap:6px">' +
          (p.membawahi && u && MCSAKSES.bawahan(u.id).length
            ? '<a href="#" class="tautan-kecil" data-act="ha-bawahan">' +
              T('Ambil dari bawahannya') + '</a>'
            : '') +
          '<a href="#" class="tautan-kecil" data-act="ha-semua">' + T('Pilih semua') + '</a>' +
          '<a href="#" class="tautan-kecil" data-act="ha-kosong">' + T('Kosongkan pilihan') + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="ha-l">' +
        lok.map(function (l) {
          return '<label class="ha-l__i">' +
            '<input type="checkbox" data-hl="' + l.id + '"' +
              (haLokasi.indexOf(l.id) >= 0 ? ' checked' : '') + '> ' +
            '<span>' + U.esc(l.nama) +
              (l.kota ? '<small>' + U.esc(l.kota) + '</small>' : '') + '</span>' +
          '</label>';
        }).join('') +
      '</div>' +
      '<div id="ha-hitung" class="hint"></div>' +
    '</div>';
  }

  function hitungCabang(root) {
    var e = root.querySelector('#ha-hitung');
    if (!e) return;
    e.innerHTML = haLokasi.length
      ? jml(haLokasi.length, '1 cabang dipilih', '{n} cabang dipilih')
      : '<b class="mcs-warn">' +
        T('Belum ada cabang dipilih — orang ini akan melihat SEMUA cabang.') +
        '</b>';
  }

  /* ----------------------------------------------------------- data staf */

  function dialogStaf(userId) {
    var k = korp();
    var u = userId ? DB.find('users', userId) : null;
    UI.formModal({
      title: u ? T('Ubah data staf') : T('Staf baru'),
      sub: U.esc(k.nama),
      okText: u ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama lengkap'), value: u ? u.nama : '', required: true },
        { name: 'jabatan', label: T('Jabatan'), value: u ? u.jabatan || '' : '',
          placeholder: T('mis. Kepala Cabang Surabaya') },
        { name: 'telp', label: T('Telepon'), value: u ? u.telp || '' : '' }
      ].concat(u ? [
        { name: 'aktif', label: T('Masih bekerja di sini'), type: 'checkbox',
          value: u.aktif !== false,
          hint: T('Yang dimatikan tidak bisa masuk lagi, tetapi seluruh ' +
            'catatannya tetap utuh — dan catatan yang menyebut namanya tidak ' +
            'boleh kehilangan orangnya.') }
      ] : [
        { name: 'email', label: T('Email'), value: '', required: true,
          hint: T('Dipakai untuk masuk. Sandi sementara dibuatkan otomatis dan ' +
            'ditampilkan sekali saja.') },
        { name: 'peran', label: T('Peran'), type: 'select', value: 'leader',
          options: MCSAKSES.PERAN.map(function (p) {
            return { value: p.kode, label: p.ikon + '  ' + T(p.nama) }; }),
          hint: T('Bisa diubah kapan saja sesudahnya. Cabangnya diatur lewat ' +
            'tombol Peran setelah akunnya jadi.') }
      ])
    }).then(function (d) {
      if (!d) return;
      if (u) {
        var r = MCS.ubahStaf(u.id, d);
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(T('Data staf diperbarui'), 'ok');
        APP.refresh();
        return;
      }
      var t = MCS.tambahStaf(k.id, d, APP.user);
      if (t.error) { UI.toast(t.error, 'err'); return; }
      APP.refresh();
      /* Sandi sementara ditampilkan SEKALI, dan dikatakan sekali-nya.
         Yang tidak diberi tahu bahwa ini satu-satunya kesempatan akan
         menutup jendelanya lalu mencarinya lagi. */
      UI.modal({
        title: T('Akun dibuat'),
        sub: U.esc(t.user.nama) + ' — ' + U.esc(t.user.email),
        body: UI.alert('warn',
          '<b>' + T('Sandi sementara hanya ditampilkan sekali ini.') + '</b> ' +
          T('Serahkan kepada orangnya, dan ia wajib menggantinya saat pertama ' +
            'masuk. Sesudah jendela ini ditutup, sandinya tidak bisa dibaca ' +
            'lagi dari mana pun.'), '🔑') +
          '<div class="mcs-sandi__b mt-3"><b class="code">' +
            U.esc(t.sandiAwal) + '</b></div>',
        foot: '<button class="btn" data-close>' + T('Sudah saya catat') + '</button>'
      });
    });
  }

  function mountAkses(root) {
    delegasi(root, {
      'ha-baru': function () { dialogStaf(null); },
      'ha-ubah': function (el) { dialogStaf(el.getAttribute('data-id')); },
      'ha-peran': function (el) { dialogPeran(el.getAttribute('data-id')); }
    });
  }

  /* --------------------------------------------------------------- halaman */
  /* SUSUNAN MENU, per korporat.

     Didaftarkan di sini dan bukan di views/menu.js karena layar itu milik
     aplikasi pasar: ia mengatur susunan admin, klien, dan mitra toko.
     Yang dipakai ulang hanya penggambarnya; kunci penyimpanannya
     disempitkan MENU.peranTersedia() ke korporat yang sedang masuk.

     Gerbangnya sama dengan Hak Akses Staf: siapa yang boleh mengatur siapa
     melihat apa, boleh juga mengatur URUTAN yang dilihatnya. Menyembunyikan
     menu BUKAN cara mengamankan halaman — yang menahan tetap izin peran. */
  if (window.MENU && window.ViewMenu) {
    VMCS.daftar("korporat", "mcsSusunanMenu", {
      label: 'Susunan Menu', icon: '☰', grup: 'Pengaturan',
      sub: 'Urutan, kelompok, dan menu yang ditampilkan',
      get tersembunyi() {
        return !window.MCSAKSES || !MCSAKSES.bolehKelolaAkses(APP.user);
      },
      render: ViewMenu.render, mount: ViewMenu.aksi });
  }

  VMCS.daftar("korporat", "mcsAkses", { label: 'Hak Akses Staf', icon: '🔐', grup: 'Pengaturan',
      sub: 'Peran tiap staf dan cabang yang menjadi urusannya',
      render: renderAkses, mount: mountAkses,
      badge: function () {
        if (!APP.user || !APP.user.korporatId || !window.MCSAKSES) return 0;
        /* Yang perannya berbatas cabang tetapi daftarnya kosong sedang
           melihat SELURUH jaringan tanpa siapa pun bermaksud begitu. */
        return MCS.stafKorporat(APP.user.korporatId).filter(function (u) {
          if (u.aktif === false) return false;
          var p = MCSAKSES.peranUser(u);
          return p && !p.semuaLokasi && !(u.mcsLokasi || []).length;
        }).length;
      } });

  VMCS.daftar("korporat", "mcsProfil", { label: 'Profil Perusahaan', icon: '🏛️', grup: 'Pengaturan',
      render: renderProfil, mount: mountProfil });

  VMCS.daftar("petugas", "pgBeranda", { label: 'Tugas Saya', icon: '🧹', grup: 'Utama',
      render: renderPetugasBeranda, mount: mountPetugas });

  VMCS.daftar("petugas", "pgArea", { label: 'Area & Kedudukan', icon: '📍', grup: 'Utama',
      render: renderPetugasArea, mount: mountPetugas });
})();
