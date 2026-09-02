/* ==========================================================================
   views/mcs-tempat.js — Lokasi, area, bangunan, lantai, ruangan, objek
   --------------------------------------------------------------------------
   Struktur tempat. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
   dan aturannya ada di kepala views/mcs-inti.js.

   Pembantu bersama diambil dari VMCS di baris-baris pertama. Yang diambil
   hanya yang dipakai berkas ini — daftar yang memuat semuanya akan berhenti
   memberi tahu apa pun tentang ketergantungan berkas ini.
   ========================================================================== */
(function () {
  'use strict';

  var T = VMCS.T,
      angka = VMCS.angka,
      baris = VMCS.baris,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dialogImpor = VMCS.dialogImpor,
      dialogTag = VMCS.dialogTag,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpSaring = VMCS.dpSaring,
      jml = VMCS.jml,
      korp = VMCS.korp,
      tombol = VMCS.tombol;

  function dialogObjek(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return;

    function gambar() {
      var l = MCS.objek(areaId, true);
      var box = document.getElementById('ob-isi');
      if (box) box.innerHTML = isi(l);
    }

    function isi(l) {
      if (!l.length) {
        return UI.empty('📦', T('Belum ada objek'),
          T('Tambahkan benda yang dibersihkan di area ini — bilik, wastafel, cermin. ' +
            'Masing-masing dapat tagnya sendiri.'));
      }
      return '<div class="ob-list">' + l.map(function (o, i) {
        var j = MCS.jenisObjek(o.jenis);
        var on = o.aktif !== false;
        return '<div class="ob-r' + (on ? '' : ' ob-r--jeda') + '">' +
          '<div class="ob-r__u">' + (i + 1) + '</div>' +
          '<div class="mcs-t__i">' + U.ikon(j.ikon) + '</div>' +
          '<div class="ob-r__t">' +
            '<b>' + U.esc(o.nama) + '</b>' +
            '<span>' + U.esc(T(j.nama)) +
              ' · <code class="ob-kode">' + U.esc(o.kodePindai) + '</code>' +
              (o.menitPerKali ? ' · ' + U.num(o.menitPerKali) + ' ' + T('menit') : '') +
              /* Disebutkan HANYA bila diisi — yang kosong ikut jadwal
                 ruangannya, dan menuliskannya di tiap baris hanya menambah
                 keramaian tanpa menambah keterangan. */
              (o.kaliPerMinggu ? ' · ' + U.num(o.kaliPerMinggu) + '×/' + T('minggu') : '') +
              (o.wajibPindai ? ' · ' + T('wajib dipindai sendiri') : '') +
              (o.catatan ? ' · ' + U.esc(o.catatan) : '') + '</span>' +
          '</div>' +
          (on ? '' : '<span class="chip chip--muted chip--xs">' + T('nonaktif') + '</span>') +
          '<div class="ob-r__b">' +
            '<button class="btn btn--ghost btn--sm" data-act="ob-naik" data-id="' + o.id + '">↑</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="ob-tag" data-id="' + o.id + '">🏷️</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="ob-ubah" data-id="' + o.id + '">' +
              T('Ubah') + '</button>' +
            '<button class="btn btn--ghost btn--sm ma-hapus" data-act="ob-hapus" data-id="' + o.id + '">🗑</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }

    UI.modal({
      title: T('Objek yang dibersihkan'), sub: a.nama, size: 'wide',
      body: UI.alert('info',
          T('Objek berbeda dari langkah pembersihan. Langkah adalah APA yang dikerjakan; ' +
            'objek adalah BENDA yang bisa ditempeli tag sendiri, dipindai sendiri, dan ' +
            'punya riwayatnya sendiri.'), '📦') +
        '<div class="mb-3"></div><div id="ob-isi">' + isi(MCS.objek(areaId, true)) + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn btn--ghost" data-act="ob-cetak">🖨️ ' + T('Cetak semua tag') + '</button>' +
        '<button class="btn" data-act="ob-baru">＋ ' + T('Tambah Objek') + '</button>',
      actions: {
        'ob-baru': function () { formObjek(areaId, null, gambar); },
        'ob-ubah': function (el) { formObjek(areaId, el.getAttribute('data-id'), gambar); },
        'ob-tag': function (el) { dialogTag(el.getAttribute('data-id'), 'objek'); },
        'ob-cetak': function () { lembarTag(areaId); },
        'ob-naik': function (el) {
          /* Menggeser satu objek ke atas menukar urutannya dengan tetangganya —
             bukan menomori ulang semuanya, supaya urutan objek lain tidak
             ikut bergeser tanpa diminta. */
          var id = el.getAttribute('data-id');
          var l = MCS.objek(areaId, true);
          var i = -1;
          l.forEach(function (x, n) { if (x.id === id) i = n; });
          if (i <= 0) return;
          var atas = l[i - 1], diri = l[i];
          MCS.ubahObjek(diri.id, Object.assign({}, diri, { urut: atas.urut || i }));
          MCS.ubahObjek(atas.id, Object.assign({}, atas, { urut: diri.urut || (i + 1) }));
          gambar();
        },
        'ob-hapus': function (el) {
          var id = el.getAttribute('data-id');
          var o = MCS.objekSatu(id);
          UI.konfirm({ title: T('Hapus') + ' ' + (o ? o.nama : '') + '?', danger: true,
            text: T('Tag yang sudah dicetak untuk objek ini tidak akan berlaku lagi.') })
            .then(function (ya) { if (!ya) return; MCS.hapusObjek(id); gambar(); APP.refresh(); });
        }
      }
    });
  }

  /* ------------------------------------------------------ dimensi objek
     Yang membuat ruas ini tidak sepele: bidang mana yang dibersihkan
     berbeda per jenis, dan sebagian objek tidak diukur dengan luas sama
     sekali. Formulir mengikuti jenis yang sedang dipilih — memilih Kaca
     meminta panjang dan tinggi, memilih Kloset meminta takaran mililiter,
     dan tidak satu pun meminta angka yang tidak dipakainya.

     Ditahan di variabel: UI.formModal membongkar modalnya sebelum janjinya
     selesai, jadi apa pun di luar `fields` harus menahan nilainya sendiri. */

  var dmTahan = { panjang: '', lebar: '', tinggi: '', satuanDim: 'cm',
                  jumlah: 1, takaranMl: '' };

  function ruasDimensi(o) {
    dmTahan = {
      panjang: o && o.panjang ? o.panjang : '',
      lebar: o && o.lebar ? o.lebar : '',
      tinggi: o && o.tinggi ? o.tinggi : '',
      satuanDim: (o && o.satuanDim) || 'cm',
      jumlah: (o && o.jumlah) || 1,
      takaranMl: o && o.takaranMl ? o.takaranMl : ''
    };
    function angka(nama, label) {
      return '<label class="dm-f"><span>' + label + '</span>' +
        '<input class="input" type="number" min="0" step="any" id="dm-' + nama + '" ' +
          'value="' + dmTahan[nama] + '" placeholder="—"></label>';
    }
    return '<div class="field"><label>' + T('Ukuran') + '</label>' +
      '<div class="dm-b">' +
        '<div class="dm-g" id="dm-g">' +
          angka('panjang', T('Panjang')) +
          angka('lebar', T('Lebar')) +
          angka('tinggi', T('Tinggi')) +
          '<label class="dm-f"><span>' + T('Satuan') + '</span>' +
            '<select class="input" id="dm-satuan">' +
              '<option value="cm"' + (dmTahan.satuanDim === 'cm' ? ' selected' : '') +
                '>cm</option>' +
              '<option value="m"' + (dmTahan.satuanDim === 'm' ? ' selected' : '') +
                '>m</option>' +
            '</select></label>' +
        '</div>' +
        '<div class="dm-g2">' +
          '<label class="dm-f"><span>' + T('Jumlah serupa') + '</span>' +
            '<input class="input" type="number" min="1" id="dm-jumlah" ' +
              'value="' + dmTahan.jumlah + '"></label>' +
          '<label class="dm-f" id="dm-tk-w"><span>' + T('Takaran (ml sekali bersih)') +
            '</span><input class="input" type="number" min="0" id="dm-takaran" ' +
              'value="' + dmTahan.takaranMl + '"></label>' +
        '</div>' +
        '<div class="tbl-sub mt-1" id="dm-h"></div>' +
      '</div>' +
    '</div>';
  }

  function tahanDimensi() {
    function v(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    dmTahan = {
      panjang: v('dm-panjang') === '' ? '' : Number(v('dm-panjang')),
      lebar: v('dm-lebar') === '' ? '' : Number(v('dm-lebar')),
      tinggi: v('dm-tinggi') === '' ? '' : Number(v('dm-tinggi')),
      satuanDim: v('dm-satuan') || 'cm',
      jumlah: Number(v('dm-jumlah')) || 1,
      takaranMl: v('dm-takaran') === '' ? '' : Number(v('dm-takaran'))
    };
  }

  /**
   * Ruas mana yang diminta, dan berapa luasnya — diperbarui saat mengetik.
   *
   * Luas terhitung diperlihatkan SEKARANG, bukan setelah disimpan. Satuan
   * yang tertukar — dinding 8 m diketik sebagai 8 cm — menghasilkan angka
   * yang salah sepuluh ribu kali, dan hanya ketahuan bila hasilnya terlihat
   * pada saat itu juga.
   */

  function hitungTampilDimensi(root) {
    var sel = root ? root.querySelector('[name="jenis"]') : null;
    var j = MCS.jenisObjek(sel ? sel.value : 'lainnya');
    tahanDimensi();

    /* Ruas yang tidak dipakai jenis ini DISEMBUNYIKAN, bukan dibiarkan
       kosong — kolom kosong mengundang diisi, dan yang terisi akan dipercaya. */
    ['panjang', 'lebar', 'tinggi'].forEach(function (nm) {
      var el = document.getElementById('dm-' + nm);
      if (!el) return;
      var pakai = j.dim && j.dim.indexOf(nm.charAt(0).toUpperCase()) >= 0;
      el.parentNode.style.display = pakai ? '' : 'none';
    });
    var gr = document.getElementById('dm-g');
    if (gr) gr.style.display = j.dim ? '' : 'none';
    var tk = document.getElementById('dm-tk-w');
    if (tk) tk.style.display = j.satuan ? '' : 'none';

    var h = document.getElementById('dm-h');
    if (!h) return;
    if (j.satuan) {
      var t = Number(dmTahan.takaranMl) || 0;
      h.innerHTML = t
        ? T('Diukur per satuan') + ' · <b>' + U.num(t * (dmTahan.jumlah || 1)) +
          ' ml</b> ' + T('sekali bersih')
        : '<span class="mcs-warn">' +
          T('Belum ada takaran — objek ini keluar dari perkiraan kebutuhan.') +
          '</span>';
      return;
    }
    if (!j.muka) { h.innerHTML = T('Jenis ini tidak diukur.'); return; }
    var semu = { jenis: sel ? sel.value : 'lainnya',
      panjang: dmTahan.panjang, lebar: dmTahan.lebar, tinggi: dmTahan.tinggi,
      satuanDim: dmTahan.satuanDim, jumlah: dmTahan.jumlah };
    var pm = MCS.permukaanObjek(semu);
    var rumus = { pl: 'P × L', pt: 'P × T', pt2: '2 × P × T',
                  plpt: 'P×L + P×T' }[j.muka] || '';
    h.innerHTML = pm === null
      ? '<span class="mcs-warn">' +
        T('Ukuran belum lengkap — objek ini keluar dari perkiraan kebutuhan.') +
        '</span>'
      : T('Luas dibersihkan') + ' <b>' + U.num(pm) + ' m²</b> · ' + rumus +
        (j.muka === 'pt2' ? ' (' + T('dilap dua sisi') + ')' : '') +
        ((dmTahan.jumlah || 1) > 1 ? ' · ×' + dmTahan.jumlah : '');
  }

  /**
   * Menit usulan mengikuti jenis yang sedang dipilih.
   *
   * Tanpa ini, memilih "Kursi" tetap mengusulkan delapan menit milik lantai —
   * angka yang salah, dipampang seolah sudah dipertimbangkan. Usulan yang
   * keliru lebih buruk daripada kolom kosong, karena yang mengisi cenderung
   * menerimanya apa adanya.
   *
   * Yang sudah DIUBAH TANGAN tidak ditimpa. Orang yang mengetik 15 lalu
   * berganti jenis sedang menyesuaikan, bukan memulai dari nol.
   */

  function ikutJenis(root, timpaAwal) {
    var sel = root.querySelector('[name="jenis"]');
    var men = root.querySelector('[name="menitPerKali"]');
    if (!sel || !men) return;
    var disentuh = false;
    men.addEventListener('input', function () { disentuh = true; });
    if (timpaAwal) men.value = MCS.menitBaku(sel.value) || '';
    sel.addEventListener('change', function () {
      if (disentuh) return;
      men.value = MCS.menitBaku(sel.value) || '';
    });
  }

  function pasangDimensi(root, baru) {
    var ids = ['dm-panjang', 'dm-lebar', 'dm-tinggi', 'dm-satuan', 'dm-jumlah', 'dm-takaran'];
    ids.forEach(function (id) {
      var e = document.getElementById(id);
      if (!e) return;
      e.addEventListener('input', function () { hitungTampilDimensi(root); });
      e.addEventListener('change', function () { hitungTampilDimensi(root); });
    });
    var sel = root.querySelector('[name="jenis"]');
    if (sel) {
      sel.addEventListener('change', function () {
        /* Takaran usulan mengikuti jenis, sama seperti menit — tetapi hanya
           pada objek BARU, dan hanya bila belum disentuh tangan. */
        var tk = document.getElementById('dm-takaran');
        if (baru && tk && !tk.dataset.disentuh) {
          tk.value = MCS.takaranBaku(sel.value) || '';
        }
        hitungTampilDimensi(root);
      });
    }
    var tk0 = document.getElementById('dm-takaran');
    if (tk0) tk0.addEventListener('input', function () { tk0.dataset.disentuh = '1'; });
    if (baru && tk0 && sel) tk0.value = MCS.takaranBaku(sel.value) || '';
    hitungTampilDimensi(root);
  }

  function formObjek(areaId, id, sesudah) {
    var o = id ? MCS.objekSatu(id) : null;
    UI.formModal({
      title: o ? T('Ubah objek') : T('Objek baru'), okText: T('Simpan'),
      fields: [
        { name: 'nama', label: T('Nama objek'), value: o ? o.nama : '', required: true,
          placeholder: T('mis. Bilik 1, Wastafel kiri, Cermin besar') },
        { name: 'jenis', label: T('Jenis'), type: 'select',
          value: o ? MCS.jenisObjek(o.jenis).kode : 'lainnya',
          options: MCS.JENIS_OBJEK.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }) },
        { type: 'html', html: ruasDimensi(o) },
        { name: 'menitPerKali', label: T('Perkiraan menit sekali dibersihkan'),
          type: 'number', min: 0,
          value: o ? (o.menitPerKali || '') : MCS.menitBaku('lainnya'),
          hint: T('Dipakai membagi biaya tenaga area ini ke objek-objeknya. Angkanya ' +
            'diusulkan menurut jenis dan hampir pasti perlu disesuaikan: lantai lobi ' +
            'dua ratus meter dan lantai toilet dua puluh meter sama-sama berjenis ' +
            'lantai. Kosongkan bila belum tahu — objeknya dikeluarkan dari pembagian, ' +
            'tidak dianggap gratis.') },
        { name: 'kaliPerMinggu', label: T('Dikerjakan berapa kali seminggu'),
          type: 'number', min: 0, value: o ? (o.kaliPerMinggu || '') : '',
          hint: T('Berapa kali SEMINGGU objek ini benar-benar dikerjakan. Kosongkan bila ikut jadwal ruangannya — itu benar untuk lantai. Isi bila tidak: kaca ikut dilewati tiap hari tetapi dicuci sepekan sekali, kloset dilap tiap lewat tetapi disikat penuh sekali sehari. Salah di sini membuat perkiraan bahan meleset dengan kelipatan, bukan dengan selisih.') },
        { name: 'wajibPindai', label: T('Wajib dipindai sendiri'), type: 'checkbox',
          value: o ? !!o.wajibPindai : false,
          hint: T('Tugas di area ini tidak bisa ditandai selesai sebelum tag objek ini dipindai.') },
        { name: 'catatan', label: T('Catatan'), value: o ? o.catatan || '' : '' },
        { name: 'aktif', label: T('Masih dipakai'), type: 'checkbox',
          value: o ? o.aktif !== false : true }
      ],
      onMount: function (root) {
        ikutJenis(root, !o);
        pasangDimensi(root, !o);
      }
    }).then(function (d) {
      if (!d) return;
      /* Di luar `fields`, jadi ditahan sendiri. */
      d.panjang = dmTahan.panjang; d.lebar = dmTahan.lebar; d.tinggi = dmTahan.tinggi;
      d.satuanDim = dmTahan.satuanDim; d.jumlah = dmTahan.jumlah;
      d.takaranMl = dmTahan.takaranMl;
      var r = o ? MCS.ubahObjek(o.id, d) : MCS.tambahObjek(areaId, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(o ? T('Objek diperbarui') : T('Objek ditambahkan'), 'ok');
      if (sesudah) sesudah();
    });
  }

  /**
   * Poster tag yang siap dicetak dan ditempel — untuk AREA maupun OBJEK.
   *
   * Kodenya dicetak besar-besar di bawah gambar QR, bukan disembunyikan:
   * kamera gagal di ruangan gelap, dan tag yang tidak bisa dibaca manusia
   * berarti pekerjaan yang tidak bisa dilaporkan.
   */

  function lembarTag(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return;
    var k = korp();
    var daftar = [{ nama: a.nama, kode: MCS.pastikanKode(a), tautan: MCS.tautanTag(a),
                    ket: T('Tag area'), tempat: [a.gedung, a.lantai ? 'Lt. ' + a.lantai : '']
                      .filter(Boolean).join(' · ') }]
      .concat(MCS.objek(areaId).map(function (o) {
        return { nama: o.nama, kode: o.kodePindai, tautan: MCS.tautanTag(o),
                 ket: T(MCS.jenisObjek(o.jenis).nama), tempat: a.nama };
      }));

    UI.modal({
      title: T('Lembar tag'), sub: a.nama + ' · ' + jml(daftar.length, '1 tag', '{n} tag'),
      size: 'wide',
      body: '<div class="lembar" id="lembar-tag">' +
          '<div class="lembar__kop">' + U.esc((k && k.nama) || '') + ' — ' +
            U.esc(a.nama) + '</div>' +
          '<div class="lembar__g">' + daftar.map(function (t) {
            return '<div class="lembar__t">' +
              '<div class="lembar__n">' + U.esc(t.nama) + '</div>' +
              '<div class="lembar__s">' + U.esc(t.ket) + ' · ' + U.esc(t.tempat) + '</div>' +
              QR.svg(t.tautan, { ukuran: 132, alt: t.nama }) +
              '<div class="lembar__k">' + U.esc(t.kode) + '</div>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>' +
        '<p class="tbl-sub mt-2">' +
          T('Gunting menurut garis, tempel di tempatnya masing-masing.') + '</p>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="lembar-cetak">🖨️ ' + T('Cetak lembar') + '</button>',
      actions: { 'lembar-cetak': function () { cetak('cetak-lembar'); } }
    });
  }

  /** Bukti kehadiran sebagai satu baris siap tempel di layar. */

  function cetakDaftarArea() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Daftar Area'),
      sub: T('Termasuk yang dijeda'),
      baris: MCS.area(k.id, true),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Gedung'), r: function (x) { return x.gedung || '—'; } },
        { h: T('Lantai'), r: function (x) { return x.lantai || '—'; } },
        { h: T('Area'), r: function (x) { return x.nama; } },
        { h: T('Jenis'), r: function (x) { return T(MCS.jenisArea(x.jenis).nama); } },
        { h: T('Luas'), num: true, r: function (x) { return x.luas || '—'; } },
        { h: T('Penanggung jawab'), r: function (x) {
          var p = MCS.penanggungArea(x.id);
          return p.length ? p.map(function (y) { return y.nama; }).join(', ') : '—'; } },
        { h: T('Jadwal'), num: true, r: function (x) { return MCS.jadwalArea(x.id).length; } },
        { h: T('Objek'), num: true, r: function (x) { return MCS.objek(x.id).length; } },
        { h: T('Kode tag'), r: function (x) { return x.kodePindai || '—'; } },
        { h: T('Status'), r: function (x) { return x.aktif === false ? T('dijeda') : T('aktif'); } }
      ]
    });
  }

  function renderArea() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var a = MCS.area(k.id, true);
    /* Dikelompokkan menurut catatan gedung bila ada, dan menurut kolom teks
       lama bila belum. Dua sumber ini sengaja tidak digabung: selama
       pemindahannya belum dijalankan, menggabungkan "Menara A" (teks) dan
       Menara A (catatan) akan menampilkan satu gedung sebagai dua. */
    var perLokasi = {};
    a.forEach(function (x) {
      var g = (x.lokasiId && LOKASI.nama(x.lokasiId)) || x.gedung || T('Tanpa gedung');
      (perLokasi[g] = perLokasi[g] || []).push(x);
    });

    var tersaring = dpSaring('area', a, function (x) { return x.lokasiId || ''; });

    return UI.alert('info', T('Area adalah tempat yang dipantau kebersihannya — toilet, lobi, pantry, ' +
      'taman. Jadwal disusun per area.'), '📍') + '<div class="mb-3"></div>' +

      ringkasArea(a) +

      '<div class="row between mb-3">' +
        '<div class="hint">' + jml(a.length, '1 area terdaftar', '{n} area terdaftar') + '</div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost" data-act="mcs-ar-cetak">🖨️ ' + T('Cetak daftar') + '</button>' +
          '<button class="btn btn--primary" data-act="mcs-ar-baru">＋ ' + T('Tambah Area') + '</button>' +
        '</div>' +
      '</div>' +

      dpBilah('area', a, tersaring, function (x) { return x.lokasiId || ''; }) +

      (a.length
        /* Dipotong pada tingkat AREA, bukan tingkat gedung. Memotong pada
           gedung akan menyembunyikan gedung utuh tanpa menyebutkannya;
           memotong pada area membuat gedung terakhir tampak separuh dan
           tombol di bawahnya berkata berapa yang belum digambar. */
        ? dpPotong('area', tersaring, null, function (tampil) {
            var per = {};
            tampil.forEach(function (x) {
              var nm = (x.lokasiId && LOKASI.nama(x.lokasiId)) || x.gedung || T('Tanpa gedung');
              (per[nm] = per[nm] || []).push(x);
            });
            return Object.keys(per).map(function (nm) {
              /* Angka pada kepala kartu adalah yang DIGAMBAR dari yang ADA —
                 bukan salah satunya saja. Kartu berjudul "14 area" yang isinya
                 enam baris adalah kartu yang membuat orang mengira empat
                 belas dikurangi delapan hilang entah ke mana. */
              var utuh = perLokasi[nm] ? perLokasi[nm].length : per[nm].length;
              return UI.card({ title: '🏢 ' + U.esc(nm), cls: 'mb-3',
                sub: per[nm].length === utuh
                  ? jml(utuh, '1 area', '{n} area')
                  : T('{n} dari {t}').replace('{n}', U.num(per[nm].length))
                      .replace('{t}', U.num(utuh)),
                body: '<div class="ma-list">' + per[nm].map(barisArea).join('') + '</div>' });
            }).join('');
          })
        : UI.empty('📍', T('Belum ada area'),
            T('Daftarkan toilet, lobi, pantry, atau taman yang perlu dipantau.')));
  }

  /**
   * Ringkasan area — yang KURANG, bukan yang ada.
   *
   * Jumlah area sudah tertulis di baris di bawahnya. Yang tidak bisa
   * diketahui tanpa membuka seribu dua ratus baris satu per satu adalah
   * berapa di antaranya belum dijadwalkan dan belum punya langkah kerja —
   * dan keduanya berarti area itu tidak pernah benar-benar dibersihkan
   * menurut aplikasi ini, betapapun rapi pendataannya.
   */

  function ringkasArea(a) {
    if (a.length < 12) return '';
    var tanpaJadwal = 0, tanpaLangkah = 0, luas = 0, nonaktif = 0;
    a.forEach(function (x) {
      if (!MCS.jadwalArea(x.id).length) tanpaJadwal++;
      if (!MCS.langkahArea(x).length) tanpaLangkah++;
      luas += Number(x.luas) || 0;
      if (x.aktif === false) nonaktif++;
    });
    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Area terdaftar'), value: U.num(a.length), icon: '📍',
        meta: nonaktif ? jml(nonaktif, T('1 nonaktif'), T('{n} nonaktif')) : '' }) +
      UI.stat({ label: T('Luas seluruhnya'), value: U.num(Math.round(luas)) + ' m²', icon: '📐' }) +
      UI.stat({ label: T('Belum dijadwalkan'), value: U.num(tanpaJadwal), icon: '🗓️',
        meta: tanpaJadwal ? T('tidak akan muncul di tugas harian') : '' }) +
      UI.stat({ label: T('Belum ada langkah'), value: U.num(tanpaLangkah), icon: '☑️',
        meta: tanpaLangkah ? T('petugas menebak sendiri urutannya') : '' }) +
    '</div>';
  }

  function barisArea(x) {
    var j = MCS.jenisArea(x.jenis);
    var on = x.aktif !== false;
    var nJadwal = MCS.jadwalArea(x.id).length;
    var foto = (x.foto || []);
    var lk = MCS.langkahArea(x);
    return '<div class="ma-r' + (on ? '' : ' ma-r--jeda') + '">' +
      /* Foto acuan menggantikan ikon bila ada — mengenali toilet lantai 3 dari
         gambarnya jauh lebih cepat daripada dari namanya. */
      (foto.length && DB.getPhoto(foto[0])
        ? '<img class="mcs-r__f" src="' + U.esc(DB.getPhoto(foto[0])) + '" alt="" ' +
          'data-act="mcs-ar-foto" data-id="' + x.id + '">'
        : '<div class="mcs-t__i">' + U.ikon(j.ikon) + '</div>') +
      '<div class="ma-r__t"><b>' + U.esc(x.nama) + '</b>' +
        '<span>' + U.esc(T(j.nama)) +
          (x.lantai ? ' · Lt. ' + U.esc(x.lantai) : '') +
          (x.luas ? ' · ' + U.num(x.luas) + ' m²' : '') +
          ' · ' + (nJadwal ? jml(nJadwal, T('1 jadwal'), T('{n} jadwal'))
                           : '<span class="mcs-warn">' + T('belum dijadwalkan') + '</span>') +
          (x.wajibFoto ? ' · 📷 ' + T('wajib bukti foto') : '') +
        '</span>' +
        (lk.length
          ? '<span class="mcs-t__c">' + jml(lk.length, '1 langkah', '{n} langkah') +
            (x.wajibLangkah ? ' · ' + T('wajib dicentang') : '') +
            (x.wajibFotoLangkah ? ' · 📷 ' + T('foto tiap langkah') : '') + ': ' +
            U.esc(lk.slice(0, 3).map(function (l) { return l.teks; }).join(', ')) +
            (lk.length > 3 ? '…' : '') + '</span>'
          /* mcs-t__c ikut dipasang supaya ia menjadi BARIS SENDIRI.
             Tanpa itu ia inline dan menempel pada keterangan di atasnya —
             terbaca 'satu jadwalbelum ada langkah pembersihan' begitu
             barisnya membungkus di layar sempit. */
          : '<span class="mcs-t__c mcs-warn">' +
            T('belum ada langkah pembersihan') + '</span>') +
      '</div>' +
      (on ? '' : '<span class="chip chip--muted">' + T('nonaktif') + '</span>') +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-ar-langkah" data-id="' + x.id + '" ' +
        'title="' + U.esc(T('Kelola langkah pembersihan')) + '">☑️' +
        (lk.length ? '<b class="mcs-t__n">' + lk.length + '</b>' : '') + '</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-ar-objek" data-id="' + x.id + '" ' +
        'title="' + U.esc(T('Objek yang dibersihkan')) + '">📦' +
        (MCS.objek(x.id).length
          ? '<b class="mcs-t__n">' + MCS.objek(x.id).length + '</b>' : '') + '</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-ar-tag" data-id="' + x.id + '" ' +
        'title="' + U.esc(T('Tag QR untuk ditempel')) + '">🏷️</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-ar-foto" data-id="' + x.id + '" ' +
        'title="' + U.esc(T('Foto acuan area')) + '">📷' +
        (foto.length ? '<b class="mcs-t__n">' + foto.length + '</b>' : '') + '</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="mcs-ar-ubah" data-id="' + x.id + '">' +
        T('Ubah') + '</button>' +
      '<button class="btn btn--ghost btn--sm ma-hapus" data-act="mcs-ar-hapus" data-id="' + x.id + '">🗑</button>' +
    '</div>';
  }

  function dialogArea(id) {
    var k = korp();
    var x = id ? MCS.areaSatu(id) : null;
    UI.formModal({
      title: x ? T('Ubah area') : T('Area baru'),
      sub: U.esc(k.nama), okText: x ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama area'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Toilet Pria Lantai 3') },
        { name: 'jenis', label: T('Jenis area'), type: 'select',
          value: x ? MCS.jenisArea(x.jenis).kode : 'toilet',
          options: MCS.JENIS_AREA.map(function (j) {
            return { value: j.kode, label: j.ikon + ' ' + T(j.nama) }; }),
          hint: T('Menentukan saran seberapa sering ia perlu dibersihkan.') },
        /* Ketika ada gedung terdaftar, kolom teks bebas diganti pilihan.
           Selama belum ada, ia tetap kolom teks persis seperti dulu —
           pelanggan satu gedung tidak dipaksa mendaftarkan gedung lebih
           dulu hanya agar bisa menambahkan area. */
        (LOKASI.semua(k.id).length
          ? { name: 'lokasiId', label: T('Gedung'), type: 'select',
              value: x && x.lokasiId ? x.lokasiId : '',
              options: [{ value: '', label: T('— belum ditetapkan —') }].concat(
                LOKASI.semua(k.id).map(function (gd) {
                  return { value: gd.id, label: gd.nama }; })),
              hint: T('Dipakai mengelompokkan area di halaman Portofolio.') }
          : { name: 'gedung', label: T('Gedung'), value: x ? x.gedung : '',
              placeholder: T('mis. Menara A'),
              hint: T('Daftarkan gedung lewat Pengaturan → Gedung bila ' +
                'areanya tersebar di lebih dari satu bangunan.') }),
        { name: 'lantai', label: T('Lantai'), value: x ? x.lantai : '', placeholder: '3' },
        { name: 'luas', label: T('Luas (m²)'), type: 'number', value: x ? (x.luas || '') : '' },
        /* PEKERJAAN BERKALA — bukan pembersihan rutin.

           Inilah yang membuka perkiraan jam mesin poles dan steam. Tanpa
           angka ini, jam kedua jenis mesin itu tidak bisa diperkirakan sama
           sekali — dan menurunkannya dari frekuensi rutin sudah dicoba dan
           menghasilkan angka berlipat-lipat. */
        { name: 'berkalaPerBulan', label: T('Pekerjaan berkala per bulan'),
          type: 'number', min: 0, step: 'any',
          value: x ? (x.berkalaPerBulan || '') : '',
          hint: T('Berapa kali sebulan lantai area ini dipoles, karpetnya dicuci, ' +
            'atau dikristalisasi — BUKAN pembersihan harian. Kosong atau 0 ' +
            'berarti tidak ada pekerjaan berkala, dan jam mesin poles di area ' +
            'ini tidak akan diperkirakan.') },
        /* Langkah dikelola di dialognya sendiri: tiap langkah punya penanda
           wajib dan urutan, yang tidak muat di dalam satu kotak teks. Untuk
           area BARU kotak teks tetap disediakan — mengetik lima langkah
           sekaligus lebih cepat daripada menekan tambah lima kali. */
        (x
          ? { type: 'html', html: '<div class="field"><label>' + T('Langkah pembersihan') + '</label>' +
              '<div class="mcs-lk-ring">' +
                '<b>' + jml(MCS.langkahArea(x).length, '1 langkah', '{n} langkah') + '</b>' +
                '<span>' + T('Dikelola lewat tombol Langkah di daftar area.') + '</span>' +
              '</div></div>' }
          : { name: 'checklist', label: T('Langkah pembersihan'), type: 'textarea', rows: 5,
              value: '',
              hint: T('Satu langkah per baris. Ikut dikirim di pesan pengingat supaya petugas ' +
                      'tidak perlu mengingatnya sendiri.') }),
        { name: 'wajibLangkah', label: T('Semua langkah wajib harus dicentang'), type: 'checkbox',
          value: x ? !!x.wajibLangkah : false,
          hint: T('Tugas tidak bisa ditandai selesai selama masih ada langkah wajib yang ' +
                  'belum dicentang. Tanpa ini checklist tetap ada, hanya tidak memaksa.') },
        { name: 'wajibFotoLangkah', label: T('Tiap langkah wajib berfoto sebelum & sesudah'),
          type: 'checkbox', value: x ? !!x.wajibFotoLangkah : false,
          hint: T('Bukti paling rinci — dan paling boros ruang. Enam langkah berarti dua belas ' +
                  'foto untuk satu tugas. Pakai untuk area yang benar-benar dipersoalkan.') },
        { name: 'wajibFoto', label: T('Menuntut bukti foto sesudah'), type: 'checkbox',
          value: x ? !!x.wajibFoto : false,
          hint: T('Tugas di area ini tidak bisa ditandai selesai tanpa foto sesudah. ' +
                  'Pakai untuk area yang benar-benar perlu dibuktikan — memaksa foto ' +
                  'untuk semuanya membuat petugas memotret asal-asalan.') },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2, value: x ? x.catatan : '' },
        { name: 'aktif', label: T('Dipantau'), type: 'checkbox', value: x ? x.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      /* Area baru: baris teks jadi langkah. Area lama: kolomnya tidak ada di
         formulir, jadi TIDAK dikirim sama sekali — langkah yang sudah disusun
         lewat dialognya tidak boleh terhapus hanya karena nama areanya diubah. */
      if (x) delete d.checklist;
      else d.checklist = String(d.checklist || '').split('\n')
        .map(function (s) { return s.trim(); }).filter(Boolean)
        .map(function (s, i) { return { id: 'lk' + (i + 1), teks: s, wajib: true }; });
      var r = x ? MCS.ubahArea(id, d) : MCS.tambahArea(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Area diperbarui') : T('Area ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /**
   * Foto acuan sebuah area.
   *
   * Dua gunanya: menunjukkan DI MANA area itu kepada petugas yang belum pernah
   * ke sana, dan menunjukkan SEPERTI APA ia ketika bersih. Keduanya hal yang
   * tidak bisa disampaikan oleh nama "Toilet Pria Lantai 3".
   */

  function dialogFotoArea(id) {
    function buka() {
      var a = MCS.areaSatu(id);
      if (!a) return;
      var lokasi = [a.gedung, a.lantai ? 'Lt. ' + a.lantai : ''].filter(Boolean).join(' ');
      UI.modal({
        id: 'mcs-foto-area',
        title: T('Foto acuan area'),
        sub: a.nama + (lokasi ? ' · ' + lokasi : ''),
        body: '<div class="tbl-sub mb-3">' +
            T('Unggah foto area atau objek yang harus dibersihkan. Ditampilkan kepada petugas ' +
              'saat ia mengisi laporan, sebagai pembanding hasil kerjanya.') + '</div>' +
          UI.photoGrid(a.foto || [],
            { addAct: 'fa-add', delAct: 'fa-del', addLabel: T('Unggah foto area') }),
        foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>',
        actions: {
          'fa-add': function (el) {
            UI.handleFotoInput(el, function (ids) {
              MCS.tambahFotoArea(id, ids);
              UI.toast(ids.length + ' ' + T('foto ditambahkan'), 'ok');
              segarkan();
            });
          },
          'fa-del': function (el) {
            MCS.hapusFotoArea(id, el.getAttribute('data-id'));
            segarkan();
          },
          'zoom': function (el) { UI.lightbox(el.getAttribute('src')); }
        }
      });
    }
    /* Modal digambar ulang seutuhnya setelah unggah: menyisipkan sel baru ke
       dalam kisi yang sudah tergambar lebih rumit daripada manfaatnya. */
    function segarkan() {
      var m = document.getElementById('mcs-foto-area');
      if (m) { m.closest('.modal-back').remove(); document.body.style.overflow = ''; }
      buka();
    }
    buka();
  }

  /**
   * Pengelola langkah pembersihan sebuah area.
   *
   * Urutan penting: petugas mengerjakannya dari atas ke bawah, dan menyapu
   * lantai sebelum membersihkan kloset berarti menyapu dua kali. Karena itu
   * ada tombol naik-turun, bukan sekadar daftar.
   */

  function dialogLangkah(areaId) {
    function buka() {
      var a = MCS.areaSatu(areaId);
      if (!a) return;
      var lk = MCS.langkahArea(a);

      UI.modal({
        id: 'mcs-langkah',
        title: T('Langkah pembersihan'),
        sub: a.nama,
        body:
          '<div class="tbl-sub mb-3">' +
            T('Daftar ini dikirim ke petugas lewat pesan pengingat, dan dicentang satu per ' +
              'satu saat ia mengisi laporan.') + '</div>' +

          (lk.length
            ? '<div class="mcs-lk">' + lk.map(function (l, i) {
                return '<div class="mcs-lk__r">' +
                  '<span class="mcs-lk__n">' + (i + 1) + '</span>' +
                  '<input class="input mcs-lk__t" value="' + U.esc(l.teks) + '" ' +
                    'data-change="lk-teks" data-id="' + U.esc(l.id) + '">' +
                  '<label class="kh-alg__i" title="' + U.esc(T('Wajib dikerjakan')) + '">' +
                    '<input type="checkbox"' + (l.wajib ? ' checked' : '') +
                    ' data-change="lk-wajib" data-id="' + U.esc(l.id) + '">' +
                    '<span>' + T('wajib') + '</span></label>' +
                  '<button class="kh-nb" data-act="lk-naik" data-id="' + U.esc(l.id) + '"' +
                    (i === 0 ? ' disabled' : '') + '>↑</button>' +
                  '<button class="kh-nb" data-act="lk-turun" data-id="' + U.esc(l.id) + '"' +
                    (i === lk.length - 1 ? ' disabled' : '') + '>↓</button>' +
                  '<button class="kh-nb mcs-lk__x" data-act="lk-hapus" data-id="' + U.esc(l.id) + '">✕</button>' +
                '</div>';
              }).join('') + '</div>'
            : UI.empty('☑️', T('Belum ada langkah'),
                T('Tambahkan langkah pertama di bawah.'))) +

          '<div class="mcs-lk__add">' +
            '<input class="input" id="lk-baru" placeholder="' +
              U.esc(T('mis. Bersihkan kloset dan urinoir')) + '" data-submit-on-enter>' +
            '<button class="btn btn--primary" data-act="lk-tambah">＋ ' + T('Tambah') + '</button>' +
          '</div>' +

          (a.wajibLangkah
            ? '<div class="kh-catat mt-2">☑️ ' +
              T('Area ini menuntut semua langkah wajib dicentang sebelum tugasnya bisa ditandai selesai.') +
              '</div>'
            : '<div class="tbl-sub mt-2">' +
              T('Area ini tidak memaksa: checklist tetap tampil di laporan, tetapi tugas ' +
                'bisa ditandai selesai meski ada yang belum dicentang.') + '</div>'),
        foot: '<button class="btn btn--ghost" data-close>' + T('Selesai') + '</button>',
        actions: {
          'lk-teks': function (el) {
            MCS.ubahLangkah(areaId, el.getAttribute('data-id'), { teks: el.value });
            APP.refresh();
          },
          'lk-wajib': function (el) {
            MCS.ubahLangkah(areaId, el.getAttribute('data-id'), { wajib: el.checked });
            APP.refresh();
          },
          'lk-naik': function (el) { MCS.geserLangkah(areaId, el.getAttribute('data-id'), -1); segarkan(); },
          'lk-turun': function (el) { MCS.geserLangkah(areaId, el.getAttribute('data-id'), 1); segarkan(); },
          'lk-hapus': function (el) {
            MCS.hapusLangkah(areaId, el.getAttribute('data-id'));
            segarkan();
          },
          'lk-tambah': function (el) {
            var inp = el.closest('.modal').querySelector('#lk-baru');
            var r = MCS.tambahLangkah(areaId, inp.value, true);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            segarkan();
          }
        },
        onMount: function (root) {
          /* Enter menambahkan langkah — mengetik lima langkah berturut-turut
             tanpa memindahkan tangan ke tetikus. */
          var inp = root.querySelector('#lk-baru');
          if (inp) inp.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            var r = MCS.tambahLangkah(areaId, inp.value, true);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            segarkan();
          });
        }
      });
      /* Fokus kembali ke kotak tambah supaya bisa langsung mengetik lagi. */
      var inp = document.querySelector('#lk-baru');
      if (inp) setTimeout(function () { inp.focus(); }, 60);
    }

    function segarkan() {
      var m = document.getElementById('mcs-langkah');
      if (m) { m.closest('.modal-back').remove(); document.body.style.overflow = ''; }
      buka();
      APP.refresh();
    }
    buka();
  }

  function mountArea(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'mcs-ar-baru': function () { dialogArea(null); },
      'mcs-ar-tag': function (el) { dialogTag(el.getAttribute('data-id')); },
      'mcs-ar-objek': function (el) { dialogObjek(el.getAttribute('data-id')); },
      'mcs-ar-cetak': function () { cetakDaftarArea(); },
      'mcs-ar-foto': function (el) { dialogFotoArea(el.getAttribute('data-id')); },
      'mcs-ar-langkah': function (el) { dialogLangkah(el.getAttribute('data-id')); },
      'mcs-ar-ubah': function (el) { dialogArea(el.getAttribute('data-id')); },
      'mcs-ar-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = MCS.areaSatu(id);
        var j = MCS.jadwalArea(id);
        UI.konfirm({
          title: T('Hapus area ini?'),
          htmlText: '<b>' + U.esc(x.nama) + '</b>.<br>' +
            (j.length
              ? '<b style="color:var(--danger,#DC2626)">' +
                jml(j.length, T('1 jadwal ikut terhapus.'), T('{n} jadwal ikut terhapus.')) + '</b>'
              : T('Belum ada jadwal yang memakainya.')) +
            '<br><br>' + T('Bila hanya berhenti dipantau sementara, matikan saja “Dipantau” lewat Ubah.'),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          MCS.hapusArea(id);
          UI.toast(T('Area dihapus'), 'ok'); APP.refresh();
        });
      }
    }));
  }

  /* =============================================================== JADWAL */

  /**
   * Saran frekuensi berdasarkan kenyataan, bukan dugaan.
   *
   * Ditaruh DI HALAMAN JADWAL, bukan di halaman sendiri: saran yang berdiri
   * terpisah dari tempat orang mengubah jadwal tidak akan pernah dijalankan.
   */

  var lkTitik = null;

  /**
   * Alamat terstruktur sebuah gedung untuk mengisi formulirnya.
   *
   * Gedung baru → kosong. Gedung lama yang sudah punya `wilayah` → itu.
   * Gedung lama yang alamatnya masih satu baris teks → diurai dengan
   * dariTeksLama(), sehingga yang sudah pernah diketik tidak hilang begitu
   * formulirnya berganti bentuk. Urai yang meleset masih bisa diperbaiki;
   * kolom yang dikosongkan diam-diam tidak.
   */
  /**
   * Zona waktu MENGIKUTI provinsi yang sedang dipilih.
   *
   * Batas WIB/WITA/WIT adalah batas provinsi, jadi begitu provinsinya
   * dipilih zonanya sudah tertentu — dan meminta orang memilihnya lagi di
   * kolom terpisah hanya menambah satu kesempatan untuk salah. Yang salah
   * di sini tidak berbunyi: cabang Makassar berzona Jakarta akan menilai
   * petugasnya dengan jam yang meleset satu jam, setiap hari, dan yang
   * terlihat hanyalah orang-orang yang seolah selalu terlambat.
   *
   * TIGA hal yang sengaja TIDAK dilakukan:
   *
   *   · Tidak mengisi saat dialog BARU DIBUKA. Zona kosong berarti ‘ikut
   *     bawaan korporat’ — sebuah pilihan, bukan kekosongan — dan mengisinya
   *     hanya karena dialognya dibuka akan mengubah arti data tanpa ada
   *     yang meminta. Yang memicu adalah PERUBAHAN provinsi.
   *   · Tidak menimpa sesudah orangnya memilih zona sendiri. Sekali
   *     disentuh, kolom itu miliknya sampai dialog ditutup.
   *   · Tidak menebak di luar Indonesia. ZONA.dariWilayah() mengembalikan
   *     '' di sana, dan '' berarti jangan sentuh apa pun.
   *
   * Pendengarnya DIDELEGASIKAN ke root, tidak ditempel ke kolom provinsi:
   * WILAYAH.pasang() MENGGANTI elemen tiap tingkat ketika daftarnya tiba,
   * dan pendengar yang menempel pada elemen lama ikut hilang bersamanya —
   * diam-diam, karena tidak ada yang gagal, hanya tidak terjadi apa-apa.
   */
  function ikutkanZona(root) {
    if (!window.ZONA || !window.WILAYAH) return;
    var zona = root.querySelector('#f_zona');
    if (!zona) return;
    var disentuh = false;

    function punyaOpsi(v) {
      for (var i = 0; i < zona.options.length; i++) {
        if (zona.options[i].value === v) return true;
      }
      return false;
    }

    function ikut() {
      if (disentuh) return;
      var neg = root.querySelector('#f_negara');
      var l1 = root.querySelector('#f_l1');
      if (!l1) return;
      var tz = ZONA.dariWilayah({ negara: neg ? neg.value : 'ID', l1: l1.value });
      if (!tz || tz === zona.value || !punyaOpsi(tz)) return;
      zona.value = tz;
      zona.setAttribute('data-otomatis', '1');
      /* Terlihat, bukan diam-diam: kolomnya berubah di depan mata yang
         mengisi, dan ia bisa langsung menggantinya bila memang keliru. */
      UI.toast(T('Zona waktu disetel ke') + ' ' + ZONA.singkat(tz) +
        ' — ' + T('mengikuti provinsi'), 'ok');
    }

    root.addEventListener('change', function (e) {
      var id = e.target ? e.target.id : '';
      if (id === 'f_zona') {
        disentuh = true;
        zona.removeAttribute('data-otomatis');
      } else if (id === 'f_l1' || id === 'f_negara') {
        ikut();
      }
    });
  }

  function wLokasi(x) {
    if (!window.WILAYAH) return null;
    if (!x) return WILAYAH.kosong();
    if (x.wilayah && WILAYAH.terisi(x.wilayah)) return x.wilayah;
    var w = WILAYAH.dariTeksLama([x.alamat, x.kota].filter(Boolean).join(', '));
    return w;
  }

  function dialogLokasi(id) {
    var k = korp();
    if (!k) return;
    var x = id ? LOKASI.satu(id) : null;
    lkTitik = (x && x.koordinat) || null;
    UI.formModal({
      title: x ? T('Ubah gedung') : T('Gedung baru'),
      sub: U.esc(k.nama),
      okText: x ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama gedung'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Menara A') },
        { type: 'html', html: '<div class="mcs-fs">' + T('Alamat') +
          '<span>' + T('Kolom yang sama dengan alamat pengguna dan pelanggan — ' +
            'negara, provinsi, kota/kabupaten, kecamatan, kelurahan/desa, kode pos.') +
          '</span></div>' }
      ].concat(
        /* ALAMAT TERSTRUKTUR, bukan dua kolom teks bebas.

           Gedung ini sempat punya ‘Alamat’ dan ‘Kota’ yang keduanya diketik
           bebas, sementara pengguna, pelanggan, dan prospek sudah memakai
           kolom berjenjang. Akibatnya kota yang sama tertulis berbeda-beda
           — “Bandung”, “Kota Bandung”, “BDG” — dan tidak satu pun
           pengelompokan per wilayah bisa dipercaya.

           `wajib: false` dengan sengaja: admin yang mendaftarkan gedung dari
           kontrak belum tentu memegang alamat lengkapnya, dan memaksa
           mengisi hanya menghasilkan alamat karangan yang lebih buruk
           daripada kolom kosong. Yang WAJIB tetap wajib begitu satu kolom
           pun disentuh — itu diurus WILAYAH.periksa().

           Gedung lama yang alamatnya masih teks bebas dibaca dengan
           dariTeksLama(): isinya ditawarkan sebagai isian awal, bukan
           dibuang. */
        (window.WILAYAH
          ? WILAYAH.fields(wLokasi(x), { wajib: false })
          : [{ name: 'alamat', label: T('Alamat'), value: x ? x.alamat : '' }])
      ).concat([
        /* ZONA WAKTU — ditempatkan tepat di bawah Kota karena kotalah yang
           menentukannya, dan karena orang yang baru mengetik “Makassar”
           adalah orang yang paling siap menjawab pertanyaan ini.

           Pilihan pertama “ikut bawaan korporat” dan itu memang bawaannya:
           korporat satu kota tidak perlu memutuskan apa pun di sini. Yang
           lintas pulau akan menemukannya justru saat mendaftarkan cabang
           keduanya. */
        { name: 'zona', label: T('Zona waktu'), type: 'select',
          value: x ? (x.zona || '') : '',
          /* Seluruh 418 zona IANA, dikelompokkan per wilayah, dengan yang
             lazim di kelompok teratas. Daftar buatan tangan sempat dipakai
             dan sudah menggigit: Asia/Pontianak tidak ada di dalamnya. */
          options: window.ZONA
            ? ZONA.pilihan({ value: '', label: T('Ikut bawaan korporat') + '  ·  ' +
                ZONA.singkat(ZONA.bawaan()) })
            : [{ value: '', label: T('Ikut bawaan korporat') }],
          hint: T('Terisi sendiri mengikuti provinsi yang dipilih di atas, dan ' +
            'bisa diganti. Jam pada layar dan penilaian “sudah lewat jamnya” ' +
            'memakai zona ini, bukan zona perangkat yang sedang membuka. ' +
            'Cabang di Makassar dinilai dengan jam Makassar walaupun yang ' +
            'membukanya duduk di Jakarta.') },
        { type: 'html', html:
          '<div class="field"><label>' + T('Titik di peta') + '</label>' +
            '<div id="lk-peta">' + petaGedung() + '</div>' +
            '<div class="hint">' +
              T('Alamat tertulis tidak cukup untuk perusahaan berjaringan — ' +
                '“Jl. Ahmad Yani No. 45” ada di puluhan kota. Titik ini yang ' +
                'dipakai membuka rute di ponsel petugas.') + '</div></div>' },
        { name: 'lantai', label: T('Jumlah lantai'), type: 'number',
          value: x && x.lantai ? x.lantai : '',
          hint: T('Dipakai memeriksa kewajaran — area lantai 12 di gedung ' +
            'berlantai 8 hampir pasti salah ketik.') },
        { name: 'pj', label: T('Penanggung jawab'), value: x ? x.pj : '',
          hint: T('Building manager di sisi pelanggan, bukan petugas kebersihan.') },
        { name: 'telp', label: T('Telepon'), value: x ? x.telp : '' },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 3,
          value: x ? x.catatan : '' }
      ]),
      size: 'wide',
      validate: function (d) {
        if (!window.WILAYAH) return null;
        return WILAYAH.periksa(WILAYAH.dariForm(d), { wajib: false });
      },
      onMount: function (root) {
        pasangPetaGedung(root);
        /* Perilaku bertingkat negara → provinsi → kabupaten → kecamatan →
           desa, beserta pengisian kode pos otomatis. */
        if (window.WILAYAH) WILAYAH.pasang(root);
        ikutkanZona(root);
      }
    }).then(function (d) {
      if (!d) return;
      /* Di luar `fields`, jadi ditahan sendiri — lihat catatan pada lkTitik. */
      d.koordinat = lkTitik;
      if (window.WILAYAH) d.wilayah = WILAYAH.dariForm(d);
      var r = x ? LOKASI.ubah(x.id, d) : LOKASI.tambah(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Gedung diperbarui') : T('Gedung ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  function petaGedung() {
    if (!window.MAPS) return '';
    return MAPS.petaHTML(lkTitik, { tinggi: 180, aksiPilih: 'lk-titik' });
  }

  /**
   * Pasang pemilih titik pada formulir gedung.
   *
   * Alamat yang sedang diketik IKUT DIKIRIM ke pemilihnya, supaya pencarian
   * di Google Maps sudah terisi dan orangnya tidak perlu mengetik ulang apa
   * yang baru saja ia ketik satu ruas di atas. Dibaca saat tombolnya
   * ditekan, bukan saat formulirnya dibuka — kalau tidak, yang terkirim
   * adalah alamat kosong.
   */

  function pasangPetaGedung(root) {
    if (!window.MAPS) return;
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-act="lk-titik"]');
      if (!t) return;
      ev.preventDefault();
      var al = root.querySelector('[name="alamat"]');
      var kt = root.querySelector('[name="kota"]');
      var nm = root.querySelector('[name="nama"]');
      MAPS.pilihTitik({
        judul: T('Titik di peta'),
        sub: (nm && nm.value) || '',
        alamat: [(al && al.value) || '', (kt && kt.value) || '']
          .filter(Boolean).join(', '),
        awal: lkTitik
      }).then(function (hasil) {
        /* pilihTitik memulangkan TIGA hal yang berbeda, dan
           membedakannya penting: null berarti BATAL — titik yang sudah ada
           harus tetap ada; { hapus: true } berarti sengaja dikosongkan;
           selebihnya titik baru. Menyamakan batal dengan hapus membuat
           seseorang kehilangan titik yang benar hanya karena ia menutup
           jendela untuk melihat alamatnya lagi. */
        if (hasil === null) return;
        lkTitik = (hasil && hasil.hapus) ? null : hasil;
        var kotak = root.querySelector('#lk-peta');
        if (kotak) kotak.innerHTML = petaGedung();
      });
    });
  }

  /* ============================================================ PORTOFOLIO
     Satu baris per gedung, berdampingan. Pertanyaan yang dijawab layar ini
     hanya satu: GEDUNG MANA YANG SEDANG TERTINGGAL. Karena itu tiap kolom
     punya arah yang jelas, dan tidak ada angka yang maknanya harus ditebak. */

  var dfBaris = [];

  /* Susunan yang lazim di satu lokasi jasa kebersihan gedung. Titik awal yang
     tinggal dihapus barisnya — mengisi daftar kosong menuntut orang mengingat
     sendiri apa saja yang ada di lokasinya, dan yang tidak teringat tidak
     pernah didaftarkan. */

  var USULAN_AREA = [
    { jenis: 'bangunan', nama: 'Bangunan Utama' },
    { jenis: 'pos',      nama: 'Pos Security' },
    { jenis: 'taman',    nama: 'Area Taman' },
    { jenis: 'parkir',   nama: 'Area Parkir' },
    { jenis: 'jalan',    nama: 'Jalan' },
    { jenis: 'gardu',    nama: 'Gardu Listrik' },
    { jenis: 'genset',   nama: 'Rumah Genset' },
    { jenis: 'ibadah',   nama: 'Rumah Ibadah' }
  ];

  function dialogLokasiLengkap() {
    var k = korp();
    if (!k) return;
    dfBaris = USULAN_AREA.map(function (x) {
      return { jenis: x.jenis, nama: T(x.nama), luas: '' };
    });

    UI.modal({
      title: T('Lokasi baru'), sub: U.esc(k.nama), size: 'wide',
      body: '<div id="df-isi">' + isiDialogLokasi() + '</div>',
      foot: '<button class="btn btn--ghost" data-act="cancel">' + T('Batal') + '</button>' +
            '<button class="btn" data-act="df-simpan">' + T('Simpan lokasi & areanya') +
            '</button>',
      actions: {
        cancel: function (el) { var m = el.closest('.modal-back'); if (m) m.remove(); },
        /* Kolom tambahan dibuka DI TEMPAT, tanpa menggambar ulang — menggambar
           ulang akan mengosongkan kolom yang sedang diketik. */
        'df-lain': function (el) {
          var box = document.getElementById('df-lain');
          if (!box) return;
          var buka = box.style.display === 'none' || !box.style.display;
          box.style.display = buka ? '' : 'none';
          el.textContent = buka ? T('Sembunyikan detail') : T('Detail lainnya');
        },
        'df-tambah': function () {
          dfBaris.push({ jenis: 'lainnya', nama: '', luas: '' });
          gambarBarisArea();
        },
        'df-hapus': function (el) {
          dfBaris.splice(Number(el.getAttribute('data-i')), 1);
          gambarBarisArea();
        },
        'df-jenis': function (el) {
          var i = Number(el.getAttribute('data-i'));
          dfBaris[i].jenis = el.value;
          if (!dfBaris[i].nama) {
            dfBaris[i].nama = T(MCS.jenisArea(el.value).nama);
            var inp = el.parentNode.querySelector('[data-change="df-nama"]');
            if (inp) inp.value = dfBaris[i].nama;
          }
        },
        'df-nama': function (el) { dfBaris[Number(el.getAttribute('data-i'))].nama = el.value; },
        'df-luas': function (el) {
          dfBaris[Number(el.getAttribute('data-i'))].luas = el.value;
          segarkanRingkasLuas();
        },
        'df-simpan': simpanPendaftaran
      },
      onMount: function (root) {
        var t = root.querySelector('#df-luasTanah');
        if (t) t.addEventListener('input', segarkanRingkasLuas);
        segarkanRingkasLuas();
        /* Bertingkat negara → provinsi → kabupaten → kecamatan → desa,
           berikut kode pos otomatis — sama dengan dialog Ubah gedung. */
        if (window.WILAYAH) WILAYAH.pasang(root);
        ikutkanZona(root);
      }
    });
  }

  function isiDialogLokasi() {
    function isi(nama, label, opsi) {
      opsi = opsi || {};
      return '<div class="field">' +
        '<label for="df-' + nama + '">' + label + '</label>' +
        '<input class="input" id="df-' + nama + '" data-df="' + nama + '"' +
          (opsi.tipe ? ' type="' + opsi.tipe + '"' : '') +
          (opsi.ph ? ' placeholder="' + U.esc(opsi.ph) + '"' : '') + '>' +
        (opsi.hint ? '<div class="hint">' + opsi.hint + '</div>' : '') +
      '</div>';
    }
    return '<div class="grid g-2-1">' +
        isi('nama', T('Nama lokasi'), { ph: T('mis. Sarinah Building') }) +
        isi('luasTanah', T('Luas tanah (m²)'), { tipe: 'number', ph: '5000' }) +
      '</div>' +
      /* ALAMAT TERSTRUKTUR, sama dengan dialog Ubah gedung.

         Formulir ini sempat punya kolom ‘Kota’ teks bebas di sini dan
         ‘Alamat’ teks bebas di balik Detail lainnya — pintu kedua yang
         terus menghasilkan gedung tanpa wilayah meskipun dialog satunya
         sudah diperbaiki. Dua jalan masuk dengan aturan berbeda berarti
         datanya bercabang dua, dan yang lewat jalan yang salah baru
         ketahuan ketika laporan per wilayah tidak menemukannya. */
      (window.WILAYAH
        ? WILAYAH.fields(WILAYAH.kosong(), { wajib: false }).map(UI.field).join('')
        : isi('kota', T('Kota'))) +
      /* ZONA WAKTU. Formulir ini sama sekali tidak punya kolomnya, jadi
         setiap cabang yang didaftarkan dari sini masuk dengan zona kosong —
         yaitu ikut bawaan korporat. Bagi korporat berjaringan satu kota itu
         benar; bagi yang punya cabang di Makassar dan Jayapura itu salah,
         dan salahnya tidak berbunyi. Terisi sendiri dari provinsi. */
      (window.ZONA ? UI.field({
        name: 'zona', label: T('Zona waktu'), type: 'select', value: '',
        options: ZONA.pilihan({ value: '', label: T('Ikut bawaan korporat') +
          '  ·  ' + ZONA.singkat(ZONA.bawaan()) }),
        hint: T('Terisi sendiri mengikuti provinsi yang dipilih di atas, dan ' +
          'bisa diganti.')
      }) : '') +
      '<button type="button" class="btn btn--ghost btn--sm mb-2" data-act="df-lain">' +
        T('Detail lainnya') + '</button>' +
      '<div id="df-lain" style="display:none">' +
        /* ‘Alamat’ teks bebas dulu di sini. Sekarang jalannya menjadi
           ‘Alamat lengkap’ di blok wilayah di atas — satu kolom saja,
           supaya tidak ada dua tempat menulis hal yang sama. */
        '<div class="grid g-2">' +
          isi('kode', T('Kode / nomor kontrak'), { ph: T('opsional') }) +
          isi('telp', T('Telepon')) +
        '</div>' +
        isi('pj', T('Penanggung jawab'),
          { hint: T('Building manager di sisi pelanggan.') }) +
      '</div>' +
      '<div class="df-s2 mb-2">' +
        '<b>' + T('Area di dalam lokasi ini') + '</b>' +
        '<span class="tbl-sub" id="df-ringkas"></span>' +
      '</div>' +
      '<div id="df-baris">' + barisAreaSemua() + '</div>' +
      '<div class="row row--sb mt-2">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-act="df-tambah">+ ' +
          T('Tambah area') + '</button>' +
        '<span class="tbl-sub">' +
          T('Bangunan, lantai, dan ruangannya disusun setelah ini — dari pohonnya.') +
        '</span>' +
      '</div>';
  }

  function barisAreaSemua() {
    if (!dfBaris.length) {
      return '<div class="st-e">' + T('Belum ada area. Tambahkan minimal satu.') + '</div>';
    }
    return '<div class="df-h">' +
        '<span>' + T('Jenis') + '</span>' +
        '<span>' + T('Nama area') + '</span>' +
        '<span>' + T('Luas') + '</span>' +
        '<span></span>' +
      '</div>' +
      dfBaris.map(function (b, i) {
        return '<div class="df-r">' +
          '<select class="input input--sm" data-change="df-jenis" data-i="' + i + '">' +
            MCS.JENIS_AREA.map(function (j) {
              return '<option value="' + j.kode + '"' + (j.kode === b.jenis ? ' selected' : '') +
                '>' + j.ikon + ' ' + T(j.nama) + '</option>';
            }).join('') +
          '</select>' +
          '<input class="input input--sm" data-change="df-nama" data-i="' + i + '" ' +
            'value="' + U.esc(b.nama || '') + '" placeholder="' + T('Nama area') + '">' +
          '<input class="input input--sm" type="number" min="0" data-change="df-luas" ' +
            'data-i="' + i + '" value="' + (b.luas || '') + '" placeholder="m²">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-act="df-hapus" ' +
            'data-i="' + i + '">✕</button>' +
        '</div>';
      }).join('');
  }

  function gambarBarisArea() {
    var el = document.getElementById('df-baris');
    if (el) el.innerHTML = barisAreaSemua();
    segarkanRingkasLuas();
  }

  /* Ringkasan luas hidup saat mengetik. Angka yang dicari BUKAN totalnya
     melainkan SELISIHNYA: berapa meter persegi dari tanah yang dibayar
     pelanggan belum punya area yang bertanggung jawab atasnya. */

  function segarkanRingkasLuas() {
    var el = document.getElementById('df-ringkas');
    if (!el) return;
    var tanah = Number((document.getElementById('df-luasTanah') || {}).value) || 0;
    var terdaftar = 0;
    dfBaris.forEach(function (b) { terdaftar += Number(b.luas) || 0; });
    if (!tanah && !terdaftar) { el.textContent = ''; return; }
    var sisa = tanah ? tanah - terdaftar : null;
    el.innerHTML = U.num(terdaftar) + ' m²' +
      (tanah ? ' ' + T('dari') + ' ' + U.num(tanah) + ' m²' : '') +
      (sisa === null ? ''
        : sisa >= 0
          ? ' · <b>' + U.num(sisa) + ' m² ' + T('belum terdaftar') + '</b>'
          : ' · <b class="mcs-warn">' + U.num(-sisa) + ' m² ' +
            T('melebihi luas tanah') + '</b>');
  }

  function bacaFormLokasi() {
    var d = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-df]'), function (el) {
      d[el.getAttribute('data-df')] = el.value;
    });
    /* Kolom wilayah digambar UI.field, yang memberi id 'f_<nama>' dan bukan
       data-df — konvensi yang sama dipakai WILAYAH.pasang() untuk mencari
       kolomnya. Dibaca dengan konvensi itu juga, bukan disalin ke data-df,
       supaya hanya ada satu aturan penamaan. */
    if (window.WILAYAH) {
      ['negara', 'l1', 'l2', 'l3', 'l4', 'kodePos', 'jalan', 'patokan', 'zona']
        .forEach(function (n) {
          var el = document.querySelector('#f_' + n);
          if (el) d[n] = el.value;
        });
      d.wilayah = WILAYAH.dariForm(d);
      /* `alamat` tetap diisi supaya jalur yang belum membaca `wilayah`
         tidak menerima gedung tanpa alamat sama sekali; LOKASI.tambah()
         akan menimpanya dengan turunan yang lengkap. */
      d.alamat = d.jalan || '';
    }
    return d;
  }

  function simpanPendaftaran(el) {
    var k = korp();
    if (!k) return;
    var d = bacaFormLokasi();
    if (window.WILAYAH) {
      var salahAlamat = WILAYAH.periksa(d.wilayah, { wajib: false });
      if (salahAlamat) { UI.toast(salahAlamat, 'err'); return; }
    }
    var isi = dfBaris.filter(function (b) { return String(b.nama || '').trim(); });
    if (!isi.length) {
      UI.toast(T('Isi setidaknya satu area — lokasi tanpa area tidak bisa dijadwalkan.'), 'err');
      return;
    }
    var r = LOKASI.tambah(k.id, d);
    if (r.error) { UI.toast(r.error, 'err'); return; }

    /* Lokasinya sudah tersimpan. Bila satu area gagal, yang sudah masuk TIDAK
       dibatalkan — ia dilaporkan, dan orangnya melanjutkan dari pohonnya.
       Membatalkan seluruhnya karena satu nama kembar berarti membuang tujuh
       area yang sudah benar. */
    var berhasil = 0, gagal = 0;
    isi.forEach(function (b) {
      var ra = MCS.tambahArea(k.id, {
        nama: b.nama, jenis: b.jenis, luas: Number(b.luas) || 0, lokasiId: r.lokasi.id
      });
      if (ra.error) gagal++; else berhasil++;
    });

    dfBaris = [];
    var m = el && el.closest ? el.closest('.modal-back') : null;
    if (m) m.remove();
    stBuka[r.lokasi.id] = true;
    UI.toast(T('Lokasi tersimpan') + ' — ' + jml(berhasil, '1 area', '{n} area') +
      (gagal ? ' · ' + jml(gagal, T('1 gagal'), T('{n} gagal')) : ''), gagal ? 'warn' : 'ok');
    APP.refresh();
  }

  /* ============================================================== STRUKTUR
     Satu pohon untuk seluruh susunan tempat:

       Lokasi › Area › Bangunan › Lantai › Ruangan › Objek

     Menggantikan daftar datar yang lama. Alasannya bukan keindahan: dengan
     enam tingkat, daftar datar memaksa orang mengingat sendiri sesuatu ada di
     mana, dan yang tidak teringat akan didaftarkan dua kali.

     TINGKAT YANG KOSONG RUNTUH. Petak tanpa bangunan langsung menampilkan
     objeknya. Bangunan berlantai satu tidak memperlihatkan lantainya. Tanpa
     aturan itu, enam tingkat menjadi enam ketukan untuk mencapai satu toilet. */

  /* Simpul mana saja yang sedang terbuka. Di memori: keadaan buka-tutup
     bukan data, dan menyimpannya berarti dua orang saling menutup cabang. */

  var stBuka = {};

  function stAktif(id) { return !!stBuka[id]; }

  function stAlih(id) { stBuka[id] = !stBuka[id]; }

  function renderStruktur() {
    /* Singgahan dibuang di awal tiap gambar — bangunan bisa saja baru
       ditambahkan sejak gambar sebelumnya. */
    stAdaLantai = null;
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var lok = LOKASI.semua(k.id);
    var lepas = LOKASI.areaLepas(k.id);

    /* Nilai teks lama pada kolom `gedung` — ditawarkan, tidak dijalankan
       sendiri. Di data contoh ini satu-satunya nilai yang pernah diketik
       adalah "Halaman", yang jelas bukan nama lokasi. */
    var usul = LOKASI.usulanDariTeks(k.id);

    return catatanStruktur() +
      (usul.length ? kartuUsulTeks(usul) : '') +
      '<div class="row row--sb mb-3">' +
        '<div class="hint">' + ringkasStruktur(k) + '</div>' +
        '<div class="row">' +
          '<button class="btn btn--ghost btn--sm" data-act="st-impor">📥 ' +
            T('Impor CSV') + '</button>' +
          '<button class="btn btn--sm" data-act="st-lokasi-baru">+ ' + T('Lokasi') + '</button>' +
        '</div>' +
      '</div>' +
      (lok.length || lepas.length
        ? '<div class="st">' +
            lok.map(function (l) { return simpulLokasi(k, l); }).join('') +
            (lepas.length ? simpulLepas(k, lepas) : '') +
          '</div>'
        : UI.empty('🏙️', T('Belum ada lokasi'),
            T('Mulai dengan mendaftarkan satu lokasi — gedung, kompleks, atau ' +
              'kantor yang Anda tangani. Areanya menyusul di dalamnya.')));
  }

  /* ================================================== impor struktur CSV
     Tiga langkah yang selalu berurutan: pilih berkas, LIHAT rencananya,
     baru jalankan. Langkah tengah tidak bisa dilewati.

     Impor adalah hal yang paling sulit dibatalkan di aplikasi ini. Delapan
     ratus ruangan yang masuk dengan nama salah harus dihapus satu per satu,
     dan sebagian sudah terlanjur dipegang jadwal. Memperlihatkan lebih dulu
     memindahkan biaya kesalahan dari sesudah ke sebelum. */

  function kartuUsulTeks(usul) {
    return '<div class="card p-3 mb-3">' +
      '<b>' + T('Nama lokasi yang pernah diketik') + '</b>' +
      '<div class="tbl-sub mt-1 mb-2">' +
        T('Nilai ini pernah diketik pada kolom gedung di formulir area lama. ' +
          'Jadikan lokasi sungguhan bila memang nama lokasi — abaikan bila bukan.') +
      '</div>' +
      usul.map(function (u) {
        return '<div class="row row--sb gd-u">' +
          '<div><b>' + U.esc(u.nama) + '</b> <span class="tbl-sub">' +
            jml(u.jml, '1 area', '{n} area') + '</span></div>' +
          '<button class="btn btn--ghost btn--sm" data-act="st-usul" data-n="' +
            U.esc(u.nama) + '">' +
            (u.sudahAda ? T('Pindahkan ke lokasi itu') : T('Jadikan lokasi')) +
          '</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function ringkasStruktur(k) {
    var st = BANGUNAN.statistik(k.id);
    var semuaArea = MCS.area(k.id);
    var petak = semuaArea.filter(function (a) { return !a.lantaiId; }).length;
    return [
      jml(LOKASI.semua(k.id).length, '1 lokasi', '{n} lokasi'),
      jml(petak, '1 area', '{n} area'),
      jml(st.bangunan, '1 bangunan', '{n} bangunan'),
      jml(st.ruangan, '1 ruangan', '{n} ruangan'),
      jml(DB.where('mcsObjek', function (o) { return o.korporatId === k.id; }).length,
        '1 objek', '{n} objek')
    ].join(' · ');
  }

  function catatanStruktur() {
    return UI.alert('info',
      '<b>' + T('Lokasi › Area › Bangunan › Lantai › Ruangan › Objek.') + '</b> ' +
      T('Area adalah petak tanah di dalam lokasi — di atasnya boleh berdiri ' +
        'bangunan, boleh tidak. Taman, jalan, dan parkir adalah area tanpa ' +
        'bangunan, dan objeknya menempel langsung di sana. Tingkat yang tidak ' +
        'Anda pakai tidak akan ditampilkan.'), '🗂️');
  }

  /* --------------------------------------------------------------- simpul */

  function stBaris(o) {
    /* o: { id, ikon, nama, ket, anak, aksi, tingkat, kosong } */
    var buka = stAktif(o.id);
    var punyaAnak = !o.kosong;
    return '<div class="st-n st-n--' + o.tingkat + '">' +
      '<div class="st-h">' +
        (punyaAnak
          ? '<button class="st-x" data-act="st-alih" data-id="' + o.id + '" ' +
            'aria-expanded="' + buka + '">' + (buka ? '▾' : '▸') + '</button>'
          : '<span class="st-x st-x--kosong">·</span>') +
        '<span class="st-i">' + o.ikon + '</span>' +
        '<span class="st-t"><b>' + U.esc(o.nama) + '</b>' +
          (o.ket ? '<span class="st-k">' + o.ket + '</span>' : '') + '</span>' +
        '<span class="st-a">' + (o.aksi || '') + '</span>' +
      '</div>' +
      (buka && o.anak ? '<div class="st-c">' + o.anak + '</div>' : '') +
    '</div>';
  }

  /**
   * Tempat sebuah cabang untuk barisnya di daftar: “Kota Bandung, Jawa Barat”.
   *
   * Delapan puluh tujuh cabang di seluruh Indonesia, dan barisnya dulu tidak
   * menyebut tempat sama sekali — hanya nama, jumlah area, dan luas. Yang
   * membedakan satu cabang dari cabang lain justru kotanya, dan untuk
   * mengetahuinya orang harus membuka dialognya satu per satu. Namanya
   * kebetulan memuat kota pada data contoh ini (“Dealer Buana Bandung 1”),
   * tetapi gedung sungguhan bernama “Menara Cakrawala” dan tidak memuat
   * apa pun tentang letaknya.
   *
   * Diuji dengan terstruktur(), BUKAN terisi(). terisi() sudah bernilai
   * benar ketika hanya kolom jalan yang diisi — dan ringkas() pada keadaan
   * itu mengembalikan “Indonesia” saja, yang menghabiskan tempat di baris
   * tanpa memberi tahu apa pun. terstruktur() menanyakan hal yang memang
   * ingin ditanyakan di sini: apakah tempatnya diketahui.
   *
   * Alamat yang belum diisi DISEBUT, dengan alasan yang sama dengan
   * “titik belum ditandai” di baris yang sama: yang tidak lengkap harus
   * bisa dibedakan tanpa membuka satu per satu, kalau tidak ia tidak akan
   * pernah dilengkapi siapa pun.
   */
  function tempatLokasi(l) {
    if (window.WILAYAH && l.wilayah && WILAYAH.terstruktur(l.wilayah)) {
      return U.esc(WILAYAH.ringkas(l.wilayah));
    }
    var kota = String(l.kota || '').trim();
    if (kota) return U.esc(kota);
    return '<span class="mcs-warn">' + T('alamat belum diisi') + '</span>';
  }

  function simpulLokasi(k, l) {
    var petak = LOKASI.areaLokasi(k.id, l.id).filter(function (a) { return !a.lantaiId; });
    var lu = LOKASI.luas(k.id, l.id);
    return stBaris({
      id: l.id, tingkat: 'lok', ikon: '🏙️', nama: l.nama,
      ket: [
        /* TEMPATNYA lebih dulu: itu yang dicari mata ketika menyusuri daftar
           delapan puluh tujuh cabang, bukan jumlah areanya. */
        tempatLokasi(l),
        jml(petak.length, '1 area', '{n} area'),
        lu.luasTanah ? U.num(lu.luasTanah) + ' m²' : '',
        /* Titiknya DISEBUT pada barisnya, bukan hanya tersimpan diam-diam.
           Delapan puluh tujuh cabang yang sebagian bertitik dan sebagian
           tidak harus bisa dibedakan tanpa membuka satu per satu. */
        (window.MAPS && MAPS.valid(l.koordinat))
          ? '<a href="' + MAPS.link(l.koordinat) + '" target="_blank" ' +
            'rel="noopener" class="tautan-kecil">📍 ' + T('peta') + '</a>'
          : '<span class="mcs-warn">📍 ' + T('titik belum ditandai') + '</span>',
        lu.belum ? '<span class="mcs-warn">' + U.num(lu.belum) + ' m² ' +
          T('belum terdaftar') + '</span>' : '',
        /* ZONA disebut hanya bila BERBEDA dari zona pembacanya — alasan yang
           sama dengan jam pada bukti kehadiran. Korporat satu kota tidak
           perlu melihat “WIB” delapan puluh tujuh kali; yang lintas pulau
           justru harus bisa membedakannya tanpa membuka satu per satu. */
        (window.ZONA && !ZONA.samaDenganPerangkat(ZONA.lokasi(l.id))
          ? '<span class="chip chip--muted chip--xs">🌐 ' +
            U.esc(ZONA.singkat(ZONA.lokasi(l.id))) + '</span>'
          : '')
      ].filter(Boolean).join(' · '),
      aksi: tombol('st-area-baru', l.id, '+ ' + T('Area')) +
            tombol('st-lokasi-ubah', l.id, '✎', T('Ubah lokasi')) +
            tombol('st-lokasi-hapus', l.id, '✕', T('Hapus lokasi')),
      kosong: !petak.length,
      anak: petak.map(function (a) { return simpulPetak(k, a); }).join('')
    });
  }

  /* Dihitung sekali per gambar, bukan per baris: dengan dua puluh petak, ia
     akan menyapu seluruh bangunan dua puluh kali untuk jawaban yang sama. */

  var stAdaLantai = null;

  function adaLantaiDiKorporat() {
    if (stAdaLantai !== null) return stAdaLantai;
    var k = korp();
    stAdaLantai = !!(k && BANGUNAN.korporat(k.id).some(function (b) {
      return BANGUNAN.lantai(b.id).length > 0;
    }));
    return stAdaLantai;
  }

  function simpulPetak(k, a) {
    var bgn = BANGUNAN.semua(a.id);
    var obj = MCS.objek(a.id);
    var jn = MCS.jenisArea(a.jenis);
    return stBaris({
      id: a.id, tingkat: 'area', ikon: jn.ikon, nama: a.nama,
      ket: [
        T(jn.nama),
        a.luas ? U.num(a.luas) + ' m²' : '',
        bgn.length ? jml(bgn.length, '1 bangunan', '{n} bangunan') : '',
        obj.length ? jml(obj.length, '1 objek', '{n} objek') : ''
      ].filter(Boolean).join(' · '),
      /* Tombol pindah hanya muncul bila memang ada lantai yang bisa dituju.
         Tombol yang selalu ada tetapi selalu berkata "belum ada bangunan"
         hanya melatih orang berhenti menekannya. */
      aksi: tombol('st-bgn-baru', a.id, '+ ' + T('Bangunan')) +
            tombol('st-objek-baru', a.id, '+ ' + T('Objek')) +
            (adaLantaiDiKorporat() && !BANGUNAN.semua(a.id).length
              ? tombol('st-pindah', a.id, '⇄', T('Pindahkan ke lantai')) : '') +
            tombol('st-area-ubah', a.id, '✎', T('Ubah area')),
      kosong: !bgn.length && !obj.length,
      anak: bgn.map(function (b) { return simpulBangunan(k, b); }).join('') +
            (obj.length ? daftarObjek(obj) : '')
    });
  }

  function simpulBangunan(k, b) {
    var lt = BANGUNAN.lantai(b.id);
    var nRuang = BANGUNAN.ruanganBangunan(b.id).length;
    /* Bangunan berlantai satu MELEWATI tingkat lantai: ruangannya ditampilkan
       langsung. Memaksa satu ketukan tambahan untuk membuka "Lantai 1" yang
       isinya seluruh gedung adalah ketukan yang tidak pernah memberi tahu
       apa pun. */
    var satuLantai = lt.length === 1;
    return stBaris({
      id: b.id, tingkat: 'bgn', ikon: '🏬', nama: b.nama,
      ket: [
        lt.length ? jml(lt.length, '1 lantai', '{n} lantai') :
          '<span class="mcs-warn">' + T('lantai belum disusun') + '</span>',
        nRuang ? jml(nRuang, '1 ruangan', '{n} ruangan') : '',
        b.luasDasar ? U.num(b.luasDasar) + ' m²' : ''
      ].filter(Boolean).join(' · '),
      aksi: tombol('st-lantai-atur', b.id, '⌗ ' + T('Lantai')) +
            tombol('st-bgn-ubah', b.id, '✎', T('Ubah bangunan')) +
            tombol('st-bgn-hapus', b.id, '✕', T('Hapus bangunan')),
      kosong: !lt.length,
      anak: satuLantai
        ? isiLantai(lt[0])
        : lt.map(function (l) { return simpulLantai(l); }).join('')
    });
  }

  function simpulLantai(l) {
    var r = BANGUNAN.ruangan(l.id);
    return stBaris({
      id: l.id, tingkat: 'lt', ikon: '⌗', nama: l.nama,
      ket: r.length ? jml(r.length, '1 ruangan', '{n} ruangan')
        : '<span class="tbl-sub">' + T('kosong') + '</span>',
      /* Lantai kosong menawarkan ISI SEKALIGUS lebih dulu; lantai yang sudah
         berisi menawarkan SALIN. Menampilkan keduanya selalu membuat tombol
         yang tidak akan dipakai ikut memenuhi baris di layar ponsel. */
      aksi: (r.length
        ? tombol('st-lantai-salin', l.id, '⧉ ' + T('Salin'), T('Salin ke lantai lain'))
        : tombol('st-ruang-isi', l.id, '≡ ' + T('Isi'), T('Isi lantai sekaligus'))) +
        tombol('st-ruang-baru', l.id, '+ ' + T('Ruangan')),
      kosong: !r.length,
      anak: isiLantai(l)
    });
  }

  function isiLantai(l) {
    var r = BANGUNAN.ruangan(l.id);
    if (!r.length) {
      return '<div class="st-e">' + T('Belum ada ruangan di lantai ini.') + ' ' +
        tombol('st-ruang-isi', l.id, '≡ ' + T('Isi sekaligus')) + ' ' +
        tombol('st-ruang-baru', l.id, '+ ' + T('Ruangan')) + '</div>';
    }
    return r.map(function (x) { return simpulRuangan(x); }).join('');
  }

  function simpulRuangan(r) {
    var obj = MCS.objek(r.id);
    var jn = MCS.jenisArea(r.jenis);
    return stBaris({
      id: r.id, tingkat: 'ruang', ikon: jn.ikon, nama: r.nama,
      ket: [
        T(jn.nama),
        r.luas ? U.num(r.luas) + ' m²' : '',
        obj.length ? jml(obj.length, '1 objek', '{n} objek') : ''
      ].filter(Boolean).join(' · '),
      aksi: tombol('st-objek-baru', r.id, '+ ' + T('Objek')) +
            tombol('st-pindah', r.id, '⇄', T('Pindahkan ke lantai')) +
            tombol('st-area-ubah', r.id, '✎', T('Ubah ruangan')),
      kosong: !obj.length,
      anak: daftarObjek(obj)
    });
  }

  /* Objek tidak punya anak, jadi ia daftar datar — bukan simpul pohon.
     Memberinya panah buka-tutup yang tidak pernah membuka apa pun hanya
     mengajari orang bahwa panahnya kadang bohong. */

  function daftarObjek(obj) {
    if (!obj.length) return '';
    return '<div class="st-o">' + obj.map(function (o) {
      var j = MCS.jenisObjek(o.jenis);
      return '<span class="st-o__i" title="' + U.esc(T(j.nama)) + '">' +
        j.ikon + ' ' + U.esc(o.nama) + '</span>';
    }).join('') + '</div>';
  }

  function simpulLepas(k, lepas) {
    return stBaris({
      id: '__lepas', tingkat: 'lok', ikon: '📍', nama: T('Belum masuk lokasi'),
      ket: jml(lepas.length, '1 area', '{n} area'),
      aksi: '',
      kosong: false,
      anak: lepas.map(function (a) { return simpulPetak(k, a); }).join('')
    });
  }


  /* ------------------------------------------------------ dialog bangunan */

  function dialogBangunan(areaId, id) {
    var k = korp();
    var x = id ? BANGUNAN.satu(id) : null;
    var a = MCS.areaSatu(x ? x.areaId : areaId);
    if (!a) return;
    UI.formModal({
      title: x ? T('Ubah bangunan') : T('Bangunan baru'),
      sub: a.nama, okText: x ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama bangunan'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Menara A') },
        { name: 'luasDasar', label: T('Luas lantai dasar (m²)'), type: 'number', min: 0,
          value: x ? (x.luasDasar || '') : '',
          hint: T('Dipakai memeriksa kewajaran terhadap luas petaknya — bangunan ' +
            '3.000 m² di atas petak 1.000 m² hampir pasti salah ketik.') },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2,
          value: x ? x.catatan : '' }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = x ? BANGUNAN.ubah(x.id, d) : BANGUNAN.tambah(k.id, a.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Bangunan diperbarui') : T('Bangunan ditambahkan'), 'ok');
      /* Bangunan baru langsung membuka penyusun lantai: bangunan tanpa lantai
         tidak bisa menampung ruangan, dan menyuruh orang mencari tombolnya
         sendiri setelah menyimpan adalah langkah yang paling sering terlewat. */
      if (!x && r.bangunan) {
        stBuka[a.id] = true;
        dialogLantai(r.bangunan.id);
      } else {
        APP.refresh();
      }
    });
  }

  /* ------------------------------------------------------- penyusun lantai
     Isi jumlahnya sekali, lihat daftarnya, sunting, baru simpan. Menyimpan
     dua belas baris lebih dulu berarti staf memperbaikinya dua belas kali. */

  var ltDaftar = [];

  function dialogLantai(bangunanId) {
    var b = BANGUNAN.satu(bangunanId);
    if (!b) return;
    var ada = BANGUNAN.lantai(bangunanId, true);
    ltDaftar = ada.length
      ? ada.map(function (l) { return { nama: l.nama }; })
      : BANGUNAN.usulLantai(1, {});

    UI.modal({
      title: T('Susun lantai') + ' — ' + b.nama,
      size: 'narrow',
      body: '<div id="lt-isi">' + isiDialogLantai(!ada.length) + '</div>',
      foot: '<button class="btn btn--ghost" data-act="cancel">' + T('Batal') + '</button>' +
            '<button class="btn" data-act="lt-simpan" data-id="' + bangunanId + '">' +
              T('Simpan lantai') + '</button>',
      actions: {
        cancel: function (el) { var m = el.closest('.modal-back'); if (m) m.remove(); },
        'lt-buat': function () {
          var n = Number((document.getElementById('lt-n') || {}).value) || 0;
          var lewati = String((document.getElementById('lt-lewati') || {}).value || '')
            .split(',').map(function (x) { return Number(x.trim()); })
            .filter(function (x) { return x > 0; });
          ltDaftar = BANGUNAN.usulLantai(n, {
            basement: Number((document.getElementById('lt-b') || {}).value) || 0,
            lobby: !!(document.getElementById('lt-lobby') || {}).checked,
            mezanin: !!(document.getElementById('lt-mez') || {}).checked,
            atap: !!(document.getElementById('lt-atap') || {}).checked,
            lewati: lewati
          });
          gambarDialogLantai(false);
        },
        'lt-tambah': function () { ltDaftar.push({ nama: '' }); gambarDialogLantai(false); },
        'lt-hapus': function (el) {
          ltDaftar.splice(Number(el.getAttribute('data-i')), 1);
          gambarDialogLantai(false);
        },
        'lt-nama': function (el) { ltDaftar[Number(el.getAttribute('data-i'))].nama = el.value; },
        'lt-simpan': function (el) {
          var r = BANGUNAN.simpanLantai(el.getAttribute('data-id'), ltDaftar);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          var m = el.closest('.modal-back'); if (m) m.remove();
          UI.toast(jml(r.lantai.length, '1 lantai tersimpan', '{n} lantai tersimpan') +
            (r.ruangDilepas
              ? ' · ' + jml(r.ruangDilepas, '1 ruangan dilepas', '{n} ruangan dilepas')
              : ''), 'ok');
          APP.refresh();
        }
      }
    });
  }

  function isiDialogLantai(pakaiPembuat) {
    return (pakaiPembuat ? kotakPembuatLantai() : '') +
      '<div class="lt-d">' +
        '<div class="row row--sb mb-1">' +
          '<b>' + jml(ltDaftar.length, '1 lantai', '{n} lantai') + '</b>' +
          '<button class="btn btn--ghost btn--sm" data-act="lt-tambah">+ ' +
            T('Tambah lantai') + '</button>' +
        '</div>' +
        ltDaftar.map(function (l, i) {
          return '<div class="lt-r">' +
            '<span class="lt-u">' + (i + 1) + '</span>' +
            '<input class="input input--sm" data-change="lt-nama" data-i="' + i + '" ' +
              'value="' + U.esc(l.nama || '') + '" placeholder="' + T('Nama lantai') + '">' +
            '<button type="button" class="btn btn--ghost btn--sm" data-act="lt-hapus" ' +
              'data-i="' + i + '">✕</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="tbl-sub mt-2">' +
        T('Urutannya dari bawah ke atas: basement lebih dulu, rooftop terakhir. ' +
          'Lantai yang namanya tidak berubah tetap membawa ruangannya; lantai ' +
          'yang dihapus melepaskan ruangannya menjadi area, bukan menghapusnya.') +
      '</div>';
  }

  function kotakPembuatLantai() {
    return '<div class="card p-3 mb-3">' +
      '<b>' + T('Buat sekaligus') + '</b>' +
      '<div class="tbl-sub mb-2">' +
        T('Isi jumlahnya, daftarnya dibuatkan. Sunting sesudahnya sebelum disimpan.') +
      '</div>' +
      '<div class="grid g-2">' +
        '<div class="field"><label for="lt-n">' + T('Jumlah lantai kerja') + '</label>' +
          '<input class="input" id="lt-n" type="number" min="0" value="1"></div>' +
        '<div class="field"><label for="lt-b">' + T('Lapis basement') + '</label>' +
          '<input class="input" id="lt-b" type="number" min="0" value="0"></div>' +
      '</div>' +
      '<div class="field"><label for="lt-lewati">' + T('Lantai yang dilompati') + '</label>' +
        '<input class="input" id="lt-lewati" placeholder="4, 13">' +
        '<div class="hint">' + T('Banyak gedung tidak memakai lantai 4 dan 13. ' +
          'Pisahkan dengan koma.') + '</div></div>' +
      '<div class="row" style="gap:14px;flex-wrap:wrap">' +
        '<label class="lt-c"><input type="checkbox" id="lt-lobby" checked> ' +
          T('Lantai dasar disebut Lobby') + '</label>' +
        '<label class="lt-c"><input type="checkbox" id="lt-mez"> ' + T('Ada mezanin') + '</label>' +
        '<label class="lt-c"><input type="checkbox" id="lt-atap"> ' + T('Ada rooftop') + '</label>' +
      '</div>' +
      '<button class="btn btn--sm mt-2" data-act="lt-buat">' + T('Buatkan daftarnya') + '</button>' +
    '</div>';
  }

  function gambarDialogLantai(pakaiPembuat) {
    var el = document.getElementById('lt-isi');
    if (el) el.innerHTML = isiDialogLantai(pakaiPembuat);
  }

  /* ----------------------------------------------------- ruangan & objek */

  function dialogRuangan(lantaiId) {
    var k = korp();
    var l = BANGUNAN.lantaiSatu(lantaiId);
    if (!l) return;
    var b = BANGUNAN.satu(l.bangunanId);
    UI.formModal({
      title: T('Ruangan baru'),
      sub: (b ? b.nama + ' › ' : '') + l.nama,
      okText: T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama ruangan'), value: '', required: true,
          placeholder: T('mis. Toilet Pria') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: 'toilet',
          options: MCS.JENIS_AREA.map(function (j) {
            return { value: j.kode, label: j.ikon + ' ' + T(j.nama) }; }) },
        { name: 'luas', label: T('Luas (m²)'), type: 'number', min: 0, value: '' }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = MCS.tambahArea(k.id, {
        nama: d.nama, jenis: d.jenis, luas: d.luas, lantaiId: lantaiId
      });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      stBuka[lantaiId] = true;
      UI.toast(T('Ruangan ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  function dialogObjekBaru(areaId) {
    var a = MCS.areaSatu(areaId);
    if (!a) return;
    var ruang = BANGUNAN.adalahRuangan(a);
    UI.formModal({
      title: T('Objek baru'),
      sub: BANGUNAN.jalurTeks(areaId),
      okText: T('Tambahkan'),
      fields: [
        { name: 'jenis', label: T('Jenis objek'), type: 'select', value: 'lantai',
          options: MCS.JENIS_OBJEK
            /* Objek yang hanya masuk akal di dalam ruangan tidak ditawarkan
               di petak terbuka — tidak ada plafon di taman. */
            .filter(function (j) { return ruang || !j.dalam; })
            .map(function (j) { return { value: j.kode, label: j.ikon + ' ' + T(j.nama) }; }) },
        { name: 'nama', label: T('Nama objek'), value: '',
          placeholder: T('kosongkan untuk memakai nama jenisnya'),
          hint: T('Isi bila ada beberapa yang sejenis — "Meja rapat", "Meja resepsionis".') },
        { name: 'menitPerKali', label: T('Perkiraan menit sekali dibersihkan'),
          type: 'number', min: 0, value: MCS.menitBaku('lantai'),
          /* Terisi tetapi TERLIHAT. Angka yang ditulis diam-diam di belakang
             layar akan dibaca sebagai hasil pengukuran; angka yang terpampang
             di formulir akan dibaca sebagai usulan — dan usulan itulah yang
             memang ia. */
          hint: T('Dipakai membagi biaya tenaga area ini ke objek-objeknya. ' +
            'Angkanya diusulkan menurut jenis dan hampir pasti perlu disesuaikan: ' +
            'lantai lobi dua ratus meter dan lantai toilet dua puluh meter sama-sama ' +
            'berjenis lantai. Kosongkan bila belum tahu — objeknya dikeluarkan dari ' +
            'pembagian, tidak dianggap gratis.') },
        { name: 'kaliPerMinggu', label: T('Dikerjakan berapa kali seminggu'),
          type: 'number', min: 0, value: '',
          hint: T('Berapa kali SEMINGGU objek ini benar-benar dikerjakan. Kosongkan bila ikut jadwal ruangannya — itu benar untuk lantai. Isi bila tidak: kaca ikut dilewati tiap hari tetapi dicuci sepekan sekali, kloset dilap tiap lewat tetapi disikat penuh sekali sehari. Salah di sini membuat perkiraan bahan meleset dengan kelipatan, bukan dengan selisih.') },
        { name: 'wajibPindai', label: T('Wajib dipindai sendiri'), type: 'checkbox',
          value: false,
          hint: T('Bawaannya tidak. Objek dicentang dari daftar setelah ruangannya ' +
            'dipindai — menempel tag di tiap objek berarti ratusan stiker per ' +
            'gedung dan dua puluh pemindaian per ruangan.') }
      ],
      onMount: function (root) { ikutJenis(root, true); }
    }).then(function (d) {
      if (!d) return;
      var nm = String(d.nama || '').trim() || T(MCS.jenisObjek(d.jenis).nama);
      var r = MCS.tambahObjek(areaId, { nama: nm, jenis: d.jenis,
        menitPerKali: d.menitPerKali, kaliPerMinggu: d.kaliPerMinggu,
        wajibPindai: d.wajibPindai });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      stBuka[areaId] = true;
      UI.toast(T('Objek ditambahkan'), 'ok');
      APP.refresh();
    });
  }


  /* ------------------------------------------------ isi lantai sekaligus
     Satu lantai kantor berisi tujuh sampai sepuluh ruangan, dan tiap ruangan
     berisi enam sampai sembilan objek. Mengisinya satu per satu berarti
     enam puluh dialog untuk satu lantai — dan dua belas lantai berarti tujuh
     ratus. Layar ini mengisi seluruh lantai sekali jalan, lengkap dengan
     objek bakunya. */

  var ilBaris = [];

  /* Susunan yang lazim di satu lantai perkantoran. Titik awal yang tinggal
     dihapus barisnya, bukan daftar kosong yang harus diingat sendiri isinya. */

  var USULAN_RUANG = [
    { jenis: 'toilet',  nama: 'Toilet Pria' },
    { jenis: 'toilet',  nama: 'Toilet Wanita' },
    { jenis: 'koridor', nama: 'Koridor' },
    { jenis: 'lift',    nama: 'Lift Lobby' },
    { jenis: 'pantry',  nama: 'Pantry' },
    { jenis: 'kerja',   nama: 'Ruang Kerja' },
    { jenis: 'rapat',   nama: 'Ruang Rapat' }
  ];

  function dialogIsiLantai(lantaiId) {
    var k = korp();
    var l = BANGUNAN.lantaiSatu(lantaiId);
    if (!l) return;
    var b = BANGUNAN.satu(l.bangunanId);
    ilBaris = USULAN_RUANG.map(function (x) {
      return { jenis: x.jenis, nama: x.nama, luas: '', objek: true };
    });

    UI.modal({
      title: T('Isi lantai') + ' — ' + l.nama,
      sub: b ? b.nama : '',
      size: 'wide',
      body: '<div id="il-isi">' + isiDialogRuang() + '</div>',
      foot: '<button class="btn btn--ghost" data-act="cancel">' + T('Batal') + '</button>' +
            '<button class="btn" data-act="il-simpan" data-id="' + lantaiId + '">' +
              T('Simpan ruangan') + '</button>',
      actions: {
        cancel: function (el) { var m = el.closest('.modal-back'); if (m) m.remove(); },
        'il-tambah': function () {
          ilBaris.push({ jenis: 'lainnya', nama: '', luas: '', objek: true });
          gambarDialogRuang();
        },
        'il-hapus': function (el) {
          ilBaris.splice(Number(el.getAttribute('data-i')), 1);
          gambarDialogRuang();
        },
        'il-jenis': function (el) {
          var i = Number(el.getAttribute('data-i'));
          ilBaris[i].jenis = el.value;
          if (!ilBaris[i].nama) ilBaris[i].nama = T(MCS.jenisArea(el.value).nama);
          /* Daftar objek bakunya berubah mengikuti jenisnya — jadi barisnya
             digambar ulang, bukan hanya nilainya diganti. */
          gambarDialogRuang();
        },
        'il-nama': function (el) { ilBaris[Number(el.getAttribute('data-i'))].nama = el.value; },
        'il-luas': function (el) { ilBaris[Number(el.getAttribute('data-i'))].luas = el.value; },
        'il-objek': function (el) {
          ilBaris[Number(el.getAttribute('data-i'))].objek = el.checked;
        },
        'il-simpan': function (el) {
          var lid = el.getAttribute('data-id');
          var isi = ilBaris.filter(function (x) { return String(x.nama || '').trim(); });
          if (!isi.length) { UI.toast(T('Isi setidaknya satu ruangan.'), 'err'); return; }

          var nRuang = 0, nObjek = 0, gagal = 0;
          isi.forEach(function (x) {
            var r = MCS.tambahArea(k.id, {
              nama: x.nama, jenis: x.jenis, luas: Number(x.luas) || 0, lantaiId: lid
            });
            if (r.error || !r.area) { gagal++; return; }
            nRuang++;
            if (!x.objek) return;
            MCS.objekBaku(x.jenis).forEach(function (j) {
              var ro = MCS.tambahObjek(r.area.id, { nama: T(MCS.jenisObjek(j).nama), jenis: j });
              if (!ro.error) nObjek++;
            });
          });

          var m = el.closest('.modal-back'); if (m) m.remove();
          stBuka[lid] = true;
          UI.toast(jml(nRuang, '1 ruangan tersimpan', '{n} ruangan tersimpan') +
            ' · ' + jml(nObjek, '1 objek', '{n} objek') +
            (gagal ? ' · ' + jml(gagal, T('1 gagal'), T('{n} gagal')) : ''), 'ok');
          APP.refresh();
        }
      }
    });
  }

  function isiDialogRuang() {
    return '<div class="hint mb-2">' +
        T('Sudah diisi susunan yang lazim di satu lantai perkantoran — hapus yang ' +
          'tidak ada, tambah yang kurang. Objek bakunya ikut dibuatkan bila ' +
          'kotaknya dicentang.') +
      '</div>' +
      '<div class="il-h">' +
        '<span>' + T('Jenis') + '</span>' +
        '<span>' + T('Nama ruangan') + '</span>' +
        '<span>' + T('Luas') + '</span>' +
        '<span>' + T('Objek') + '</span>' +
        '<span></span>' +
      '</div>' +
      ilBaris.map(barisIsiRuang).join('') +
      '<div class="row row--sb mt-2">' +
        '<button class="btn btn--ghost btn--sm" data-act="il-tambah">+ ' +
          T('Tambah ruangan') + '</button>' +
        '<span class="tbl-sub">' + ringkasIsiRuang() + '</span>' +
      '</div>';
  }

  function ringkasIsiRuang() {
    var nO = 0;
    ilBaris.forEach(function (x) {
      if (String(x.nama || '').trim() && x.objek) nO += MCS.objekBaku(x.jenis).length;
    });
    var nR = ilBaris.filter(function (x) { return String(x.nama || '').trim(); }).length;
    return jml(nR, '1 ruangan', '{n} ruangan') + ' · ' + jml(nO, '1 objek', '{n} objek');
  }

  function barisIsiRuang(b, i) {
    var baku = MCS.objekBaku(b.jenis);
    return '<div class="il-r">' +
      '<select class="input input--sm" data-change="il-jenis" data-i="' + i + '">' +
        MCS.JENIS_AREA.map(function (j) {
          return '<option value="' + j.kode + '"' + (j.kode === b.jenis ? ' selected' : '') +
            '>' + j.ikon + ' ' + T(j.nama) + '</option>';
        }).join('') +
      '</select>' +
      '<input class="input input--sm" data-change="il-nama" data-i="' + i + '" ' +
        'value="' + U.esc(b.nama || '') + '" placeholder="' + T('Nama ruangan') + '">' +
      '<input class="input input--sm" type="number" min="0" data-change="il-luas" ' +
        'data-i="' + i + '" value="' + (b.luas || '') + '" placeholder="m²">' +
      '<label class="il-c" title="' + U.esc(baku.map(function (j) {
          return T(MCS.jenisObjek(j).nama); }).join(', ')) + '">' +
        '<input type="checkbox" data-change="il-objek" data-i="' + i + '"' +
          (b.objek ? ' checked' : '') + '> ' + baku.length +
      '</label>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="il-hapus" ' +
        'data-i="' + i + '">✕</button>' +
    '</div>';
  }

  function gambarDialogRuang() {
    var el = document.getElementById('il-isi');
    if (el) el.innerHTML = isiDialogRuang();
  }

  /* ------------------------------------------------------- salin ke lantai */

  function dialogSalinLantai(lantaiId) {
    var l = BANGUNAN.lantaiSatu(lantaiId);
    if (!l) return;
    var b = BANGUNAN.satu(l.bangunanId);
    var sumber = BANGUNAN.ruangan(lantaiId);
    if (!sumber.length) {
      UI.toast(T('Lantai ini belum punya ruangan untuk disalin.'), 'err');
      return;
    }
    var lain = BANGUNAN.lantai(l.bangunanId).filter(function (x) { return x.id !== lantaiId; });
    if (!lain.length) {
      UI.toast(T('Belum ada lantai lain di bangunan ini.'), 'err');
      return;
    }

    var nObjek = 0;
    sumber.forEach(function (r) { nObjek += MCS.objek(r.id).length; });

    UI.modal({
      title: T('Salin ke lantai lain'),
      sub: (b ? b.nama + ' › ' : '') + l.nama,
      size: 'narrow',
      body: '<div class="hint mb-2">' +
          jml(sumber.length, '1 ruangan', '{n} ruangan') + ' · ' +
          jml(nObjek, '1 objek', '{n} objek') + ' ' +
          T('akan disalin ke lantai yang dipilih.') +
        '</div>' +
        '<div class="sl-l">' + lain.map(function (x) {
          var n = BANGUNAN.ruangan(x.id).length;
          return '<label class="sl-r">' +
            '<input type="checkbox" data-change="sl-pilih" value="' + x.id + '"' +
              (n ? '' : ' checked') + '>' +
            '<span><b>' + U.esc(x.nama) + '</b>' +
              (n ? '<span class="tbl-sub"> · ' + jml(n, '1 ruangan', '{n} ruangan') +
                ' ' + T('sudah ada') + '</span>' : '') + '</span>' +
          '</label>';
        }).join('') + '</div>' +
        '<div class="tbl-sub mt-2">' +
          T('Yang IKUT: nama, jenis, luas, langkah pembersihan, dan objeknya. ' +
            'Yang TIDAK: jadwal, tugas, foto bukti, dan kode pindai — riwayat itu ' +
            'milik ruangan aslinya, dan tiap tag harus unik. Ruangan yang namanya ' +
            'sudah ada di lantai tujuan dilewati, bukan digandakan.') +
        '</div>',
      foot: '<button class="btn btn--ghost" data-act="cancel">' + T('Batal') + '</button>' +
            '<button class="btn" data-act="sl-jalan" data-id="' + lantaiId + '">' +
              T('Salin') + '</button>',
      actions: {
        cancel: function (el) { var m = el.closest('.modal-back'); if (m) m.remove(); },
        'sl-jalan': function (el) {
          var root = el.closest('.modal');
          var pilih = Array.prototype.filter.call(
            root.querySelectorAll('[data-change="sl-pilih"]'),
            function (i) { return i.checked; }).map(function (i) { return i.value; });
          if (!pilih.length) { UI.toast(T('Pilih setidaknya satu lantai tujuan.'), 'err'); return; }
          var r = BANGUNAN.salinRuangan(el.getAttribute('data-id'), pilih);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          var m = el.closest('.modal-back'); if (m) m.remove();
          UI.toast(jml(r.hasil.ruangan, '1 ruangan disalin', '{n} ruangan disalin') +
            ' · ' + jml(r.hasil.objek, '1 objek', '{n} objek') +
            (r.hasil.dilewati
              ? ' · ' + jml(r.hasil.dilewati, '1 dilewati', '{n} dilewati') : ''), 'ok');
          APP.refresh();
        }
      }
    });
  }


  /* --------------------------------------------------- pindahkan ruangan
     Jalan keluar untuk data yang sudah ada sebelum susunan ini dibuat.

     "Toilet Pria Lantai 3" terdaftar sebagai AREA karena dulu memang tidak
     ada tingkat bangunan dan lantai. Sesungguhnya ia RUANGAN. Pemindahannya
     TIDAK dikerjakan otomatis: menebak toilet itu ada di bangunan mana berarti
     mengarang nama gedung yang tidak pernah disebut siapa pun, lalu
     menuliskannya ke dalam data orang. Yang disediakan adalah tombolnya. */

  function dialogPindahRuangan(areaId) {
    var k = korp();
    var a = MCS.areaSatu(areaId);
    if (!a) return;

    /* Seluruh lantai milik korporat ini, dikelompokkan per bangunan. */
    var pilihan = [{ value: '', label: '— ' + T('lepas, jadikan area di bawah lokasi') + ' —' }];
    var adaLantai = false;
    BANGUNAN.korporat(k.id).forEach(function (b) {
      var petak = MCS.areaSatu(b.areaId);
      var lok = petak && window.LOKASI ? LOKASI.satu(petak.lokasiId) : null;
      BANGUNAN.lantai(b.id).forEach(function (l) {
        adaLantai = true;
        pilihan.push({ value: l.id,
          label: (lok ? lok.nama + ' › ' : '') + b.nama + ' › ' + l.nama });
      });
    });

    if (!adaLantai) {
      UI.toast(T('Belum ada bangunan berlantai. Daftarkan bangunannya dulu, ' +
        'lalu susun lantainya.'), 'err');
      return;
    }

    UI.formModal({
      title: T('Pindahkan ke lantai'),
      sub: BANGUNAN.jalurTeks(areaId),
      okText: T('Pindahkan'),
      intro: '<div class="hint mb-2">' +
        T('Seluruh jadwal, tugas, foto bukti, inspeksi, dan kode pindainya ikut ' +
          'berpindah — yang berubah hanya tempatnya di dalam susunan, bukan ' +
          'riwayatnya.') + '</div>',
      fields: [
        { name: 'lantaiId', label: T('Lantai tujuan'), type: 'select',
          value: a.lantaiId || '', options: pilihan }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = BANGUNAN.pindahkanRuangan(areaId, d.lantaiId);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      if (d.lantaiId) stBuka[d.lantaiId] = true;
      UI.toast(d.lantaiId ? T('Dipindahkan ke lantai.') : T('Dilepas menjadi area.'), 'ok');
      APP.refresh();
    });
  }

  function mountStruktur(root) {
    delegasi(root, {
      'st-alih': function (el) { stAlih(el.getAttribute('data-id')); APP.refresh(); },
      'st-lokasi-baru': dialogLokasiLengkap,
      'st-impor': function () { dialogImpor('struktur'); },
      'st-lokasi-ubah': function (el) { dialogLokasi(el.getAttribute('data-id')); },
      'st-lokasi-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = LOKASI.satu(id);
        if (!x) return;
        var n = LOKASI.areaLokasi(x.korporatId, id).length;
        UI.konfirm({
          title: T('Hapus lokasi') + ' ' + x.nama + '?',
          htmlText: T('Areanya TIDAK ikut terhapus — ia kembali menjadi “belum ' +
            'ditetapkan”, beserta seluruh jadwal, tugas, dan foto buktinya.') +
            (n ? '<br><br><b>' + jml(n, T('1 area akan dilepaskan'),
              T('{n} area akan dilepaskan')) + '</b>' : ''),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var r = LOKASI.hapus(id);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Lokasi dihapus.'), 'ok');
          APP.refresh();
        });
      },
      'st-usul': function (el) {
        var k = korp();
        if (!k) return;
        var nm = el.getAttribute('data-n');
        var u = LOKASI.usulanDariTeks(k.id).filter(function (x) { return x.nama === nm; })[0];
        if (!u) return;
        var r = LOKASI.terapkanUsulan(k.id, u);
        if (r.error) { UI.toast(r.error, 'err'); return; }
        UI.toast(jml(r.jml, '1 area dipindahkan', '{n} area dipindahkan'), 'ok');
        APP.refresh();
      },
      'st-area-baru': function (el) { dialogAreaDiLokasi(el.getAttribute('data-id')); },
      'st-area-ubah': function (el) { dialogArea(el.getAttribute('data-id')); },
      'st-bgn-baru': function (el) { dialogBangunan(el.getAttribute('data-id'), null); },
      'st-bgn-ubah': function (el) { dialogBangunan(null, el.getAttribute('data-id')); },
      'st-bgn-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var b = BANGUNAN.satu(id);
        if (!b) return;
        var nR = BANGUNAN.ruanganBangunan(id).length;
        UI.konfirm({
          title: T('Hapus bangunan') + ' ' + b.nama + '?',
          htmlText: T('Lantainya ikut terhapus. Ruangannya TIDAK — ia dilepaskan ' +
            'menjadi area di bawah lokasi yang sama, beserta seluruh jadwal, ' +
            'tugas, dan foto buktinya.') +
            (nR ? '<br><br><b>' + jml(nR, T('1 ruangan akan dilepaskan'),
              T('{n} ruangan akan dilepaskan')) + '</b>' : ''),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var r = BANGUNAN.hapus(id);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          UI.toast(T('Bangunan dihapus.'), 'ok');
          APP.refresh();
        });
      },
      'st-lantai-atur': function (el) { dialogLantai(el.getAttribute('data-id')); },
      'st-ruang-baru': function (el) { dialogRuangan(el.getAttribute('data-id')); },
      'st-ruang-isi': function (el) { dialogIsiLantai(el.getAttribute('data-id')); },
      'st-lantai-salin': function (el) { dialogSalinLantai(el.getAttribute('data-id')); },
      'st-objek-baru': function (el) { dialogObjekBaru(el.getAttribute('data-id')); },
      'st-pindah': function (el) { dialogPindahRuangan(el.getAttribute('data-id')); }
    });
  }

  /* Area baru langsung di bawah satu lokasi — jalur cepat dari pohon. */

  function dialogAreaDiLokasi(lokasiId) {
    var k = korp();
    UI.formModal({
      title: T('Area baru'),
      sub: LOKASI.nama(lokasiId),
      okText: T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama area'), value: '', required: true,
          placeholder: T('mis. Petak Utara') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: 'bangunan',
          options: MCS.JENIS_AREA.map(function (j) {
            return { value: j.kode, label: j.ikon + ' ' + T(j.nama) }; }),
          hint: T('Petak yang akan berdiri bangunan di atasnya, atau bidang ' +
            'terbuka seperti taman, jalan, dan parkir.') },
        { name: 'luas', label: T('Luas (m²)'), type: 'number', min: 0, value: '' }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = MCS.tambahArea(k.id, {
        nama: d.nama, jenis: d.jenis, luas: d.luas, lokasiId: lokasiId
      });
      if (r.error) { UI.toast(r.error, 'err'); return; }
      stBuka[lokasiId] = true;
      UI.toast(T('Area ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /* ============================================ HAK AKSES STAF KORPORAT

     Sampai layar ini ada, peran hanya bisa diubah lewat konsol peramban —
     yang berarti tidak bisa diubah sama sekali oleh orang yang seharusnya
     mengubahnya. Sebuah pembatasan yang tidak punya layar pengaturnya bukan
     pembatasan; ia hanya keadaan yang kebetulan berlaku.

     Halaman ini sendiri dijaga `kelolaAkses`, dan hanya Admin Korporat yang
     memegangnya. Yang bisa membuka halaman ini bisa mengangkat dirinya
     sendiri — karena itu ia tidak boleh ikut kelompok halaman mana pun. */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsLokasi", { label: 'Lokasi', icon: '🏙️', grup: 'Pengaturan',
      sub: 'Lokasi, area, bangunan, lantai, ruangan, dan objeknya',
      render: renderStruktur, mount: mountStruktur });

  VMCS.daftar("korporat", "mcsArea", { label: 'Area Dipantau', icon: '📍', grup: 'Pengaturan',
      render: renderArea, mount: mountArea });
})();
