/* ==========================================================================
   views/mcs-orang.js — Petugas dan pelatihan
   --------------------------------------------------------------------------
   Orang di lapangan. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
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

  var DP_HAL = VMCS.DP_HAL,
      T = VMCS.T,
      akar = VMCS.akar,
      angka = VMCS.angka,
      baris = VMCS.baris,
      calonAtasan = VMCS.calonAtasan,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpS = VMCS.dpS,
      dpSaring = VMCS.dpSaring,
      jml = VMCS.jml,
      korp = VMCS.korp,
      namaPekerja = VMCS.namaPekerja,
      tombol = VMCS.tombol;

  function renderPekerja() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var p = MCS.pekerja(k.id, true);
    var tanpaAkun = p.filter(function (x) { return x.aktif !== false && !MCS.akunPetugas(x.id); });
    var ps = dpSaring('pekerja', p, lokPekerja);

    return UI.alert('info', '<b>' + T('Petugas Anda sendiri, bukan mitra EXOCLEAN.') + '</b> ' +
      T('Mereka tidak menerima pekerjaan dari EXOCLEAN. Beri akun agar mereka memindai tag ' +
        'dan melaporkan pekerjaannya sendiri — tanpa akun, laporannya harus diisikan atasannya.'),
      '🧹') + '<div class="mb-3"></div>' +

      (tanpaAkun.length
        ? UI.alert('warn', jml(tanpaAkun.length, T('1 petugas belum punya akun'),
            T('{n} petugas belum punya akun')) + '. ' +
            T('Laporan mereka akan tercatat atas nama yang mengetikkannya.'), '🔑') +
          '<div class="mb-3"></div>'
        : '') +

      ringkasPetugas(p) +

      dpBilah('pekerja', p, ps, lokPekerja) +

      UI.card({ title: T('Petugas kebersihan'),
        sub: ps.length === p.length
          ? jml(p.length, T('1 petugas'), T('{n} petugas'))
          : T('{n} dari {t}').replace('{n}', U.num(ps.length))
              .replace('{t}', U.num(p.length)),
        tools: '<button class="btn btn--ghost btn--sm" data-act="mcs-pk-cetak">🖨️ ' +
            T('Cetak daftar') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="mcs-pk-kartu-semua">🪪 ' +
            T('Cetak kartu') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="mcs-tim">👥 ' +
            T('Regu') + '</button>' +
          '<button class="btn btn--primary btn--sm" data-act="mcs-pk-baru">＋ ' +
          T('Tambah Petugas') + '</button>',
        body: p.length
          /* Hirarkinya disusun dari yang TERSARING, lalu dipotong.

             Aman dipotong di ekor karena susunannya linear dan induk selalu
             mendahului anaknya — yang hilang hanya cabang terbawah, bukan
             anak yang tercerabut dari induknya. Dan susunHirarki sendiri
             sudah menaruh yang atasannya tidak ada di akar, jadi menyaring
             satu cabang tidak membuat siapa pun lenyap. */
          ? '<div class="pk-list">' +
              dpPotong('pekerja', susunHirarki(k, ps), barisPetugas) + '</div>'
          : UI.empty('🧹', T('Belum ada petugas'),
              T('Daftarkan office boy, cleaning service, atau tukang kebun Anda.')) });
  }

  function lokPekerja(x) { return x.lokasiIds || []; }

  /**
   * Ringkasan petugas — yang menuntut perbuatan, bukan yang sudah beres.
   *
   * Tiga angka yang tidak bisa didapat tanpa membuka dua ratus lima puluh
   * delapan baris: berapa yang belum punya akun (laporannya tercatat atas
   * nama orang lain), berapa yang belum ditempatkan di lokasi mana pun
   * (tidak muncul di penyaring siapa pun), dan berapa yang tidak punya
   * jadwal sama sekali (dibayar tetapi tidak pernah dijadwalkan).
   */

  function ringkasPetugas(p) {
    if (p.length < 12) return '';
    var aktif = p.filter(function (x) { return x.aktif !== false; });
    var tanpaAkun = 0, tanpaLokasi = 0, tanpaJadwal = 0;
    aktif.forEach(function (x) {
      if (!MCS.akunPetugas(x.id)) tanpaAkun++;
      if (!(x.lokasiIds || []).length) tanpaLokasi++;
      if (!DB.first('mcsJadwal', function (j) { return j.pekerjaId === x.id; })) tanpaJadwal++;
    });
    return '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Petugas aktif'), value: U.num(aktif.length), icon: '🧹',
        meta: p.length > aktif.length
          ? jml(p.length - aktif.length, T('1 nonaktif'), T('{n} nonaktif')) : '' }) +
      UI.stat({ label: T('Belum punya akun'), value: U.num(tanpaAkun), icon: '🔑',
        meta: tanpaAkun ? T('laporannya diisikan atasannya') : '' }) +
      UI.stat({ label: T('Belum ditempatkan'), value: U.num(tanpaLokasi), icon: '🏙️',
        meta: tanpaLokasi ? T('tidak muncul saat disaring per lokasi') : '' }) +
      UI.stat({ label: T('Tanpa jadwal'), value: U.num(tanpaJadwal), icon: '🗓️',
        meta: tanpaJadwal ? T('tidak pernah muncul sebagai tugas') : '' }) +
    '</div>';
  }

  /**
   * Susun daftar mengikuti rantai komando, bukan abjad.
   *
   * Struktur yang ditampilkan sebagai daftar rata membuat 'melapor kepada'
   * hanya menjadi tulisan kecil yang tidak pernah dibaca. Yang tidak punya
   * atasan berdiri di akar; sisanya menjorok di bawah atasannya.
   */

  function susunHirarki(k, semua) {
    var out = [];
    var terpakai = {};
    function turun(indukId, dalam) {
      semua.filter(function (x) { return (x.atasanId || null) === indukId; })
        .sort(function (a, b) {
          var la = MCS.jabatan(a.jabatan).level, lb = MCS.jabatan(b.jabatan).level;
          if (la !== lb) return la - lb;
          return String(a.nama).localeCompare(String(b.nama));
        })
        .forEach(function (x) {
          if (terpakai[x.id]) return;
          terpakai[x.id] = true;
          out.push({ p: x, dalam: dalam });
          if (dalam < 4) turun(x.id, dalam + 1);
        });
    }
    turun(null, 0);
    /* Yang atasannya sudah dihapus atau nonaktif tidak boleh menghilang dari
       daftar — ia ditampilkan di akar, bukan diam-diam disembunyikan. */
    semua.forEach(function (x) { if (!terpakai[x.id]) out.push({ p: x, dalam: 0 }); });
    return out;
  }

  function barisPetugas(baris) {
    var x = baris.p;
    var j = MCS.jenisPekerja(x.jenis);
    var jb = MCS.jabatan(x.jabatan);
    var on = x.aktif !== false;
    var akun = MCS.akunPetugas(x.id);
    var areas = MCS.areaPekerja(x.id);

    return '<div class="pk-r' + (on ? '' : ' pk-r--jeda') + '" ' +
        'style="margin-left:' + (baris.dalam * 22) + 'px">' +
      (baris.dalam ? '<span class="pk-r__garis"></span>' : '') +
      '<div class="mcs-t__i">' + U.ikon(j.ikon) + '</div>' +
      '<div class="pk-r__t">' +
        '<b>' + U.esc(x.nama) + '</b>' +
        '<span class="pk-r__j">' + jb.ikon + ' ' + U.esc(T(jb.nama)) +
          ' · ' + U.esc(T(j.nama)) +
          (function () {
            var t = x.timId ? MCS.timSatu(x.timId) : null;
            var sh = x.shiftKode ? MCS.shiftJenis(x.shiftKode) : null;
            var jam = (x.jamMulai && x.jamSelesai)
              ? x.jamMulai + '–' + x.jamSelesai : '';
            return (t ? ' · ' + U.esc(t.nama) : '') +
              (sh ? ' · ' + U.esc(T(sh.nama)) : '') +
              (jam ? ' · ' + jam : '') +
              ((x.hariKerja || []).length && x.hariKerja.length < 7
                ? ' · ' + x.hariKerja.map(function (h) {
                    return T(MCS.HARI[h]).slice(0, 3); }).join(' ')
                : '') +
              /* Teks shift lama tetap ditampilkan selama belum dipindahkan,
                 supaya keterangan yang sudah ditulis orang tidak lenyap dari
                 layar begitu ruas baru diperkenalkan. */
              (x.shift ? ' · ' + U.esc(x.shift) : '');
          })() + '</span>' +
        '<span class="pk-r__a">' +
          (areas.length
            ? '📍 ' + U.esc(areas.map(function (a) { return a.nama; }).join(', '))
            : '<span class="mcs-warn">' + T('belum ditugasi area mana pun') + '</span>') +
        '</span>' +
        '<span class="pk-r__k">' +
          (akun
            ? (akun.aktif
                ? '<span class="chip chip--ok chip--xs">🔑 ' + U.esc(akun.kodeMasuk) + '</span>' +
                  (akun.belumGantiSandi
                    ? ' <span class="chip chip--warn chip--xs">' +
                      T('belum ganti sandi') + '</span>' : '')
                : '<span class="chip chip--danger chip--xs">' + T('akses dicabut') + '</span>')
            : '<span class="chip chip--muted chip--xs">' + T('tanpa akun') + '</span>') +
          (x.telp ? ' <span class="pk-r__h">' + U.esc(x.telp) + '</span>'
                  : ' <span class="mcs-warn">' + T('tanpa nomor') + '</span>') +
        '</span>' +
      '</div>' +
      (on ? '' : '<span class="chip chip--muted">' + T('nonaktif') + '</span>') +
      '<div class="pk-r__b">' +
        '<button class="btn btn--ghost btn--sm" data-act="mcs-pk-kartu" ' +
          'data-id="' + x.id + '" title="' + U.esc(T('Kartu identitas')) + '">🪪</button>' +
        (akun
          ? '<button class="btn btn--ghost btn--sm" data-act="mcs-pk-akun" ' +
            'data-id="' + x.id + '">🔑 ' + T('Akun') + '</button>'
          : '<button class="btn btn--sm" data-act="mcs-pk-buatakun" ' +
            'data-id="' + x.id + '">🔑 ' + T('Buatkan akun') + '</button>') +
        '<button class="btn btn--ghost btn--sm" data-act="mcs-pk-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="mcs-pk-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div>' +
    '</div>';
  }

  /**
   * Slip akun — ditampilkan SEKALI, lalu tidak bisa dibaca lagi dari mana pun.
   *
   * Sengaja dibuat bisa dicetak: petugas kebersihan tidak menerima email, dan
   * sandi yang dikirim lewat WhatsApp akan tetap terbaca di ponsel orang lain
   * berbulan-bulan kemudian.
   */

  function slipAkun(pekerjaId, hasil) {
    var p = MCS.pekerjaSatu(pekerjaId);
    var k = korp();
    UI.modal({
      title: T('Akun petugas siap'), sub: p ? p.nama : '',
      body:
        '<div class="tag-cetak" id="tag-cetak">' +
          '<div class="tag-cetak__h">' + U.esc((k && k.nama) || '') + '</div>' +
          '<div class="tag-cetak__n">' + U.esc(p ? p.nama : '') + '</div>' +
          '<div class="tag-cetak__sub">' +
            U.esc(p ? T(MCS.jabatan(p.jabatan).nama) : '') + '</div>' +
          '<div class="slip__b">' +
            '<div><span>' + T('Kode masuk') + '</span><b>' + U.esc(hasil.kodeMasuk) + '</b></div>' +
            (hasil.user && hasil.user.telp
              ? '<div><span>' + T('atau nomor HP') + '</span><b>' +
                U.esc(hasil.user.telp) + '</b></div>' : '') +
            '<div><span>' + T('Sandi sementara') + '</span><b>' +
              U.esc(hasil.sandiAwal) + '</b></div>' +
          '</div>' +
          '<div class="tag-cetak__p">' +
            T('Buka MCS EXOCLEAN, masuk dengan kode di atas, lalu ganti sandinya sendiri.') +
          '</div>' +
        '</div>' +
        '<div class="mt-2">' + UI.alert('warn',
          '<b>' + T('Sandi ini hanya tampil sekali.') + '</b> ' +
          T('Ia tidak bisa dibaca lagi dari mana pun — catat atau cetak sekarang. ' +
            'Bila hilang, buat ulang lewat Atur ulang sandi.'), '⚠️') + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="slip-cetak">🖨️ ' + T('Cetak') + '</button>',
      actions: {
        'slip-cetak': function () {
          document.body.classList.add('cetak-tag');
          window.print();
          setTimeout(function () { document.body.classList.remove('cetak-tag'); }, 500);
        }
      },
      onTutup: function () { APP.refresh(); }
    });
  }

  function dialogAkunPetugas(pekerjaId) {
    var p = MCS.pekerjaSatu(pekerjaId);
    var akun = MCS.akunPetugas(pekerjaId);
    if (!p || !akun) return;
    UI.modal({
      title: T('Akun') + ' — ' + p.nama,
      sub: akun.aktif ? T('Akses aktif') : T('Akses dicabut'),
      body:
        baris(T('Kode masuk'), '<b class="code">' + U.esc(akun.kodeMasuk) + '</b>') +
        baris(T('Nomor HP'), akun.telp ? U.esc(akun.telp) : '—') +
        baris(T('Sandi'), akun.belumGantiSandi
          ? '<span class="mcs-warn">' + T('masih sandi sementara — belum diganti') + '</span>'
          : T('sudah diganti sendiri oleh petugas')) +
        '<div class="mt-3">' + UI.alert('info',
          T('Sandinya tidak bisa dilihat siapa pun, termasuk Anda. Yang tersimpan hanya ' +
            'turunannya. Bila petugas lupa, buatkan sandi sementara yang baru.'), '🔒') + '</div>',
      foot:
        '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        (akun.aktif
          ? '<button class="btn btn--danger" data-act="akun-cabut" data-id="' + p.id + '">' +
            T('Cabut akses') + '</button>'
          : '<button class="btn" data-act="akun-aktif" data-id="' + p.id + '">' +
            T('Aktifkan lagi') + '</button>') +
        '<button class="btn" data-act="akun-reset" data-id="' + p.id + '">' +
          T('Atur ulang sandi') + '</button>',
      actions: {
        'akun-reset': function (el) {
          var id = el.getAttribute('data-id');
          var r = MCS.resetSandiPetugas(id, APP.user);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          var tutup = el.closest('.modal-back');
          if (tutup) tutup.remove();
          slipAkun(id, r);
        },
        'akun-cabut': function (el) {
          MCS.cabutAkunPetugas(el.getAttribute('data-id'), APP.user);
          UI.toast(T('Akses dicabut. Riwayatnya tetap tersimpan.'), 'ok');
          var b = el.closest('.modal-back'); if (b) b.remove();
          APP.refresh();
        },
        'akun-aktif': function (el) {
          MCS.aktifkanAkunPetugas(el.getAttribute('data-id'));
          UI.toast(T('Akses diaktifkan lagi.'), 'ok');
          var b = el.closest('.modal-back'); if (b) b.remove();
          APP.refresh();
        }
      }
    });
  }

  /**
   * Calon atasan: yang berjabatan LEBIH TINGGI di gedung yang sama.
   *
   * Untuk petugas baru, jabatannya belum dipilih saat daftar ini disusun —
   * jadi seluruh yang lebih tinggi dari 'pelaksana' ditawarkan, dan
   * periksaAtasan() yang menjadi penjaga terakhirnya saat disimpan.
   */

  var pkTahan = { lokasiIds: [], hariKerja: [] };

  /**
   * Lokasi penempatan, DI ATAS pilihan area.
   *
   * Aturannya disebut di layar, bukan hanya di kode: area yang dicentang
   * mengalahkan lokasi. Tanpa kalimat itu, dua kolom yang sama-sama terisi
   * akan dibaca sebagai dua penugasan yang bertumpuk.
   */

  function kotakLokasiKerja(k, x) {
    var lok = window.LOKASI ? LOKASI.semua(k.id) : [];
    pkTahan.lokasiIds = ((x && x.lokasiIds) || []).slice();
    if (!lok.length) return '';
    return '<div class="field"><label>' + T('Ditempatkan di lokasi') + '</label>' +
      '<div class="lg-g">' +
        lok.map(function (l) {
          return '<label class="lg-c"><input type="checkbox" data-pl="' + l.id + '"' +
            (pkTahan.lokasiIds.indexOf(l.id) >= 0 ? ' checked' : '') + '> ' +
            U.esc(l.nama) + '</label>';
        }).join('') +
      '</div>' +
      '<div class="row mt-1" style="gap:8px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="pk-semua-area">' +
          T('Centang semua area di lokasi terpilih') + '</button>' +
      '</div>' +
      '<div class="hint">' +
        T('Bila area di bawah ada yang dicentang, ITULAH wilayah kerjanya dan ' +
          'lokasi di sini hanya keterangan penempatan. Bila tidak satu pun area ' +
          'dicentang, wilayah kerjanya menjadi seluruh area di lokasi ini — ' +
          'berguna pada hari pertama, ketika areanya belum dirinci.') +
      '</div>' +
      '<div class="tbl-sub mt-1" id="pk-wil"></div>' +
    '</div>';
  }

  function kotakJamKerja(x) {
    pkTahan.hariKerja = ((x && x.hariKerja) || []).slice();
    var sk = (x && x.shiftKode) || '';
    var sh = sk ? MCS.shiftJenis(sk) : null;
    return '<div class="field"><label>' + T('Pola kerja') + '</label>' +
      '<select class="input" id="pk-shift">' +
        '<option value="">— ' + T('belum ditentukan') + ' —</option>' +
        MCS.SHIFT.map(function (j) {
          return '<option value="' + j.kode + '"' + (j.kode === sk ? ' selected' : '') +
            '>' + j.ikon + '  ' + U.esc(T(j.nama)) + '</option>';
        }).join('') +
      '</select>' +
      '<div class="grid g-2 mt-2">' +
        '<label class="dm-f"><span>' + T('Jam mulai') + '</span>' +
          '<input class="input" type="time" id="pk-mulai" value="' +
            U.esc((x && x.jamMulai) || (sh && sh.mulai) || '') + '"></label>' +
        '<label class="dm-f"><span>' + T('Jam selesai') + '</span>' +
          '<input class="input" type="time" id="pk-selesai" value="' +
            U.esc((x && x.jamSelesai) || (sh && sh.selesai) || '') + '"></label>' +
      '</div>' +
      '<div class="hint mt-1">' +
        T('Jam bawaan mengikuti pola yang dipilih dan boleh diubah — gedung yang ' +
          'shift paginya mulai pukul enam tidak harus mengikuti angka bawaan.') +
      '</div>' +
      '<div class="mt-2"><span class="tbl-sub">' + T('Hari kerja') + '</span>' +
        '<div class="pk-hari">' +
          MCS.HARI.map(function (nm, i) {
            return '<label class="pk-h"><input type="checkbox" data-hk="' + i + '"' +
              (pkTahan.hariKerja.indexOf(i) >= 0 ? ' checked' : '') + '>' +
              '<span>' + U.esc(T(nm).slice(0, 3)) + '</span></label>';
          }).join('') +
        '</div>' +
        '<div class="hint">' +
          T('Dibiarkan kosong berarti belum ditentukan, bukan berarti tidak ' +
            'pernah bekerja — dan yang belum ditentukan tidak akan diperingatkan ' +
            'saat menyusun jadwal.') + '</div>' +
      '</div>' +
      ((x && x.shift)
        /* Teks shift lama ditawarkan untuk dipindahkan, tidak dipindahkan
           sendiri: sebagian berisi keterangan yang tidak ada padanannya di
           daftar pola, dan menebaknya berarti mengarang. */
        ? '<div class="tbl-sub mt-2">' + T('Sebelumnya tertulis') + ': “' +
          U.esc(x.shift) + '” — ' +
          T('pindahkan sendiri ke pola dan jam di atas bila cocok.') + '</div>'
        : '') +
    '</div>';
  }

  function pasangPenempatan(k, root) {
    function segar() { simpanJam(); hitungWilayah(k, root); }
    Array.prototype.forEach.call(root.querySelectorAll('[data-pl]'), function (el) {
      el.addEventListener('change', segar);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-hk]'), function (el) {
      el.addEventListener('change', tahanPenempatan);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[name^="area_"]'), function (el) {
      el.addEventListener('change', segar);
    });

    var sel = document.getElementById('pk-shift');
    if (sel) {
      sel.addEventListener('change', function () {
        /* Jam bawaan mengikuti pola — tetapi hanya bila jamnya belum
           disentuh tangan. Menimpa jam yang sudah diketik orang membuat
           gedung berjam kerja tidak lazim harus mengetiknya dua kali. */
        var a = document.getElementById('pk-mulai');
        var b = document.getElementById('pk-selesai');
        if (sel.value && a && b && !a.dataset.disentuh && !b.dataset.disentuh) {
          var sh = MCS.shiftJenis(sel.value);
          a.value = sh.mulai; b.value = sh.selesai;
        }
        simpanJam();
      });
    }
    ['pk-mulai', 'pk-selesai'].forEach(function (id) {
      var e = document.getElementById(id);
      if (!e) return;
      e.addEventListener('input', function () { e.dataset.disentuh = '1'; simpanJam(); });
    });

    var b = document.getElementById('pk-semua-area');
    if (b) {
      b.addEventListener('click', function () {
        tahanPenempatan();
        if (!pkTahan.lokasiIds.length) {
          UI.toast(T('Pilih lokasinya dulu.'), 'err'); return;
        }
        MCS.area(k.id).forEach(function (a) {
          var c = root.querySelector('[name="area_' + a.id + '"]');
          if (c && a.lokasiId && pkTahan.lokasiIds.indexOf(a.lokasiId) >= 0) c.checked = true;
        });
        segar();
      });
    }
    simpanJam();
    hitungWilayah(k, root);
  }

  function simpanJam() {
    var r = akar();
    function v(id) { var e = r.querySelector('#' + id); return e ? e.value : ''; }
    pkTahan.shiftKode = v('pk-shift');
    pkTahan.jamMulai = v('pk-mulai');
    pkTahan.jamSelesai = v('pk-selesai');
    tahanPenempatan();
  }

  /* Dibaca dari modal TERATAS, bukan dari seluruh dokumen.

     Id dan atribut di sini global — pola yang sudah dipakai di seluruh berkas
     ini. Selama hanya satu dialog terbuka, itu tidak apa-apa. Begitu dua
     dialog sejenis terbuka bersamaan, pembacaan global mengumpulkan centang
     dari dialog yang SALAH dan menyimpannya diam-diam ke petugas yang sedang
     dibuka — galat yang tidak meninggalkan jejak apa pun. */

  function tahanPenempatan() {
    var r = akar();
    var lok = [], hk = [];
    Array.prototype.forEach.call(r.querySelectorAll('[data-pl]'), function (el) {
      if (el.checked) lok.push(el.getAttribute('data-pl'));
    });
    Array.prototype.forEach.call(r.querySelectorAll('[data-hk]'), function (el) {
      if (el.checked) hk.push(Number(el.getAttribute('data-hk')));
    });
    pkTahan.lokasiIds = lok;
    pkTahan.hariKerja = hk.sort();
  }

  /* Wilayah kerja efektif diperlihatkan SAAT MEMILIH — aturan “area
     mengalahkan lokasi” baru terasa nyata ketika hasilnya terlihat. */

  function hitungWilayah(k, root) {
    var el = document.getElementById('pk-wil');
    if (!el) return;
    tahanPenempatan();
    var dicentang = MCS.area(k.id).filter(function (a) {
      var c = root.querySelector('[name="area_' + a.id + '"]');
      return c && c.checked;
    });
    if (dicentang.length) {
      el.innerHTML = T('Wilayah kerja') + ': <b>' +
        jml(dicentang.length, '1 area dicentang', '{n} area dicentang') + '</b>';
      return;
    }
    if (!pkTahan.lokasiIds.length) {
      el.innerHTML = '<span class="mcs-warn">' +
        T('Belum ada wilayah kerja — petugas ini tidak akan melihat area mana pun.') +
        '</span>';
      return;
    }
    /* `lokasiId` sudah tersimpan pada areanya sejak dibuat — termasuk untuk
       ruangan di dalam gedung, yang menurunkannya dari lantainya. Jadi tidak
       perlu diturunkan ulang di sini. */
    var n = MCS.area(k.id).filter(function (a) {
      return a.lokasiId && pkTahan.lokasiIds.indexOf(a.lokasiId) >= 0;
    }).length;
    el.innerHTML = T('Wilayah kerja') + ': <b>' +
      jml(n, T('seluruh 1 area di lokasi terpilih'), T('seluruh {n} area di lokasi terpilih')) +
      '</b>';
  }

  function kotakAreaKerja(k, x) {
    var semua = MCS.area(k.id);
    var punya = (x && x.areaIds) || [];
    if (!semua.length) {
      return '<div class="tbl-sub">' +
        T('Belum ada area terdaftar — daftarkan dulu di menu Area Dipantau.') + '</div>';
    }
    return '<div class="pk-area">' + semua.map(function (a) {
      return '<label class="check"><input type="checkbox" name="area_' + a.id + '"' +
        (punya.indexOf(a.id) >= 0 ? ' checked' : '') + '>' +
        '<span>' + U.ikon(MCS.jenisArea(a.jenis).ikon) + ' ' + U.esc(a.nama) +
        (a.lantai ? '<small>Lt. ' + U.esc(a.lantai) + '</small>' : '') +
        '</span></label>';
    }).join('') + '</div>';
  }

  /** Kumpulkan centang area dari data formulir. */

  function areaDariForm(k, d) {
    return MCS.area(k.id).filter(function (a) { return !!d['area_' + a.id]; })
      .map(function (a) { return a.id; });
  }

  /* Pilihan foto ditahan di sini selama formulirnya terbuka, dan baru
     DIPASANG ke baris petugas saat Simpan ditekan.

     Gambarnya sendiri sudah masuk penyimpanan begitu dipilih — itu tak
     terhindarkan, karena pratinjaunya harus bisa digambar. Yang penting:
     foto LAMA tidak pernah dihapus di sini. Menghapusnya saat penggantinya
     dipilih akan merusak data begitu orangnya membatalkan — petugas yang
     tersimpan tetap menunjuk ke foto yang sudah tidak ada. Yang menganggur
     dibereskan pengumpul sampah penyimpanan, yang sudah mengenal
     mcsPekerja.foto. */

  var fotoPetugasSementara = null;

  function kotakFotoPetugas(x) {
    fotoPetugasSementara = x ? (x.foto || null) : null;
    return '<div class="pk-foto" id="pk-foto">' + isiFotoPetugas() + '</div>';
  }

  function isiFotoPetugas() {
    var src = fotoPetugasSementara ? DB.getPhoto(fotoPetugasSementara) : null;
    return (src
        ? '<img class="pk-foto__g" src="' + U.esc(src) + '" alt="">'
        : '<div class="pk-foto__k">' +
          '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg></div>') +
      '<div class="pk-foto__b">' +
        '<label class="btn btn--ghost btn--sm">' + T('Pilih pasfoto') +
          '<input type="file" accept="image/*" hidden data-change="pk-foto-pilih"></label>' +
        (fotoPetugasSementara
          ? '<button type="button" class="btn btn--ghost btn--sm ma-hapus" ' +
            'data-act="pk-foto-buang">' + T('Buang') + '</button>' : '') +
        '<div class="tbl-sub">' + T('Dipakai pada kartu identitas. Wajah menghadap depan.') + '</div>' +
      '</div>';
  }

  function gambarFotoPetugas() {
    var b = document.getElementById('pk-foto');
    if (b) b.innerHTML = isiFotoPetugas();
  }

  /** Dipasang lewat onMount formModal — akar halaman tidak mencakup modal. */

  function pasangAksiFotoPetugas(root) {
    delegasi(root, {
      'pk-foto-pilih': function (el) {
        UI.handleFotoInput(el, function (ids) {
          if (!ids.length) return;
          fotoPetugasSementara = ids[0];
          gambarFotoPetugas();
        }, { maks: 1, maxSide: 480, quality: 0.72 });
      },
      'pk-foto-buang': function () {
        fotoPetugasSementara = null;
        gambarFotoPetugas();
      }
    });
  }

  /* ================================================================ REGU
     Daftar sederhana dengan anggotanya terlihat. Yang penting bukan
     formulirnya, melainkan angka anggota di sebelah tiap nama: regu tanpa
     anggota dan regu berisi dua belas orang menuntut tindakan berbeda, dan
     keduanya tidak terlihat dari daftar nama saja. */

  function dialogTim() {
    var k = korp();
    if (!k) return;

    function gambar() {
      var box = document.getElementById('tm-isi');
      if (box) box.innerHTML = isi();
    }

    function isi() {
      var l = MCS.tim(k.id, true);
      if (!l.length) {
        return UI.empty('👥', T('Belum ada regu'),
          T('Regu berguna pada gedung yang menugaskan orang berkelompok — ' +
            '“Regu Lantai 1–5” lebih berarti bagi manajer gedung daripada ' +
            'delapan nama.'));
      }
      return '<div class="ob-list">' + l.map(function (t) {
        var ang = MCS.anggotaTim(t.id);
        var ketua = t.ketuaId ? MCS.pekerjaSatu(t.ketuaId) : null;
        var sh = t.shiftKode ? MCS.shiftJenis(t.shiftKode) : null;
        return '<div class="ob-r' + (t.aktif === false ? ' ob-r--jeda' : '') + '">' +
          '<div class="mcs-t__i">👥</div>' +
          '<div class="ob-r__t">' +
            '<b>' + U.esc(t.nama) + '</b>' +
            '<span>' +
              /* Nol disebut, bukan disembunyikan: regu kosong adalah keadaan
                 yang perlu dilihat, dan baris tanpa angka terbaca seolah
                 anggotanya belum dihitung. */
              jml(ang.length, '1 anggota', '{n} anggota') +
              (ketua ? ' · ' + T('ketua') + ' ' + U.esc(ketua.nama) : '') +
              (sh ? ' · ' + U.esc(T(sh.nama)) : '') +
              (t.catatan ? ' · ' + U.esc(t.catatan) : '') +
            '</span>' +
            (ang.length
              ? '<div class="tbl-sub">' +
                U.esc(ang.slice(0, 6).map(function (p) { return p.nama; }).join(', ')) +
                (ang.length > 6 ? '…' : '') + '</div>'
              : '') +
          '</div>' +
          '<div class="ob-r__b">' +
            '<button class="btn btn--ghost btn--sm" data-act="tm-ubah" data-id="' +
              t.id + '">' + T('Ubah') + '</button>' +
            '<button class="btn btn--ghost btn--sm ma-hapus" data-act="tm-hapus" data-id="' +
              t.id + '">🗑</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }

    UI.modal({
      title: T('Regu kebersihan'), sub: k.nama, size: 'wide',
      body: '<div id="tm-isi">' + isi() + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="tm-baru">＋ ' + T('Regu baru') + '</button>',
      actions: {
        'tm-baru': function () { formTim(null, gambar); },
        'tm-ubah': function (el) { formTim(el.getAttribute('data-id'), gambar); },
        'tm-hapus': function (el) {
          var id = el.getAttribute('data-id');
          var t = MCS.timSatu(id);
          var n = MCS.anggotaTim(id).length;
          UI.konfirm({
            title: T('Hapus regu') + ' ' + (t ? t.nama : '') + '?',
            htmlText: T('Anggotanya TIDAK ikut terhapus — mereka hanya dilepas dari ' +
              'regu ini. Menghapus regu adalah keputusan tentang pengelompokan, ' +
              'bukan tentang orangnya.') +
              (n ? '<br><br><b>' + jml(n, T('1 petugas akan dilepas'),
                T('{n} petugas akan dilepas')) + '</b>' : ''),
            okText: T('Hapus'), danger: true
          }).then(function (ya) {
            if (!ya) return;
            var r = MCS.hapusTim(id);
            if (r.error) { UI.toast(r.error, 'err'); return; }
            DB.save(true);
            UI.toast(T('Regu dihapus.'), 'ok');
            gambar(); APP.refresh();
          });
        }
      }
    });
  }

  function formTim(id, sesudah) {
    var k = korp();
    var t = id ? MCS.timSatu(id) : null;
    UI.formModal({
      title: t ? T('Ubah regu') : T('Regu baru'), okText: T('Simpan'),
      fields: [
        { name: 'nama', label: T('Nama regu'), value: t ? t.nama : '', required: true,
          placeholder: T('mis. Regu Lantai 1–5') },
        { name: 'ketuaId', label: T('Ketua regu'), type: 'select',
          value: t ? (t.ketuaId || '') : '',
          options: [{ value: '', label: '— ' + T('belum ditentukan') + ' —' }]
            .concat(MCS.pekerja(k.id).map(function (p) {
              return { value: p.id, label: p.nama + ' · ' + T(MCS.jabatan(p.jabatan).nama) };
            })) },
        { name: 'shiftKode', label: T('Pola kerja regu'), type: 'select',
          value: t ? (t.shiftKode || '') : '',
          options: [{ value: '', label: '— ' + T('bermacam-macam') + ' —' }]
            .concat(MCS.SHIFT.map(function (j) {
              return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; })),
          /* Keterangan, bukan penentu. Jam kerja yang dipakai memeriksa
             jadwal tetap yang tercatat pada ORANGNYA — satu regu bisa berisi
             orang yang jamnya berbeda, dan menurunkan jam dari regu akan
             memperingatkan jadwal yang sebenarnya benar. */
          hint: T('Keterangan saja. Yang dipakai memeriksa jadwal tetap jam kerja ' +
            'yang tercatat pada masing-masing petugas.') },
        { name: 'catatan', label: T('Catatan'), value: t ? t.catatan || '' : '' },
        { name: 'aktif', label: T('Masih dipakai'), type: 'checkbox',
          value: t ? t.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = t ? MCS.ubahTim(id, d) : MCS.tambahTim(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      DB.save(true);
      UI.toast(t ? T('Regu diperbarui') : T('Regu ditambahkan'), 'ok');
      if (sesudah) sesudah();
      APP.refresh();
    });
  }

  function dialogPekerja(id) {
    var k = korp();
    var x = id ? MCS.pekerjaSatu(id) : null;
    UI.formModal({
      title: x ? T('Ubah petugas') : T('Petugas baru'),
      sub: U.esc(k.nama), okText: x ? T('Simpan') : T('Tambahkan'),
      size: 'wide',
      onMount: function (root) {
        pasangAksiFotoPetugas(root);
        pasangPenempatan(k, root);
      },
      fields: [
        { type: 'html', html: kotakFotoPetugas(x) },
        { name: 'nama', label: T('Nama petugas'), value: x ? x.nama : '', required: true },
        { name: 'nip', label: T('Nomor induk (opsional)'), value: x ? x.nip || '' : '',
          placeholder: 'MC-001',
          hint: T('Dicetak di kartu identitas. Kosongkan bila gedung tidak memberi nomor.') },
        { name: 'jenis', label: T('Jenis pekerjaan'), type: 'select',
          value: x ? MCS.jenisPekerja(x.jenis).kode : 'ob',
          options: MCS.JENIS_PEKERJA.map(function (j) {
            return { value: j.kode, label: j.ikon + ' ' + T(j.nama) }; }),
          hint: T('Apa yang dikerjakan — berbeda dari kedudukannya.') },

        { type: 'html', html: '<div class="mcs-fs">' + T('Struktur komando') +
          '<span>' + T('Siapa melapor kepada siapa') + '</span></div>' },
        { name: 'jabatan', label: T('Jabatan'), type: 'select',
          value: x ? MCS.jabatan(x.jabatan).kode : 'pelaksana',
          options: MCS.JABATAN.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }) },
        { name: 'atasanId', label: T('Melapor kepada'), type: 'select',
          value: x ? (x.atasanId || '') : '',
          /* Hanya yang berjabatan lebih tinggi yang ditawarkan, dan diri
             sendiri dibuang dari daftar. Menawarkan semua orang lalu menolak
             saat disimpan membuat orang menebak-nebak apa yang salah. */
          options: [{ value: '', label: '— ' + T('tidak ada atasan langsung') + ' —' }]
            .concat(calonAtasan(k, x).map(function (p) {
              return { value: p.id, label: p.nama + ' · ' + T(MCS.jabatan(p.jabatan).nama) }; })),
          hint: T('Daftar ini hanya berisi jabatan yang lebih tinggi.') },

        { name: 'timId', label: T('Regu'), type: 'select',
          value: x ? (x.timId || '') : '',
          options: [{ value: '', label: '— ' + T('tanpa regu') + ' —' }]
            .concat(MCS.tim(k.id).map(function (t) {
              return { value: t.id, label: t.nama }; })),
          /* Regu menjawab siapa bekerja bersama siapa; atasan menjawab siapa
             menegur siapa. Di gedung keduanya sering tidak sama, jadi
             keduanya disediakan dan bedanya disebutkan. */
          hint: T('Berbeda dari atasan langsung: regu adalah siapa bekerja bersama ' +
            'siapa, atasan adalah siapa melapor kepada siapa. Kelola daftar regu ' +
            'lewat tombol Regu di halaman Petugas.') },

        { type: 'html', html: '<div class="mcs-fs">' + T('Penempatan') +
          '<span>' + T('Yang menjadi tanggung jawabnya sehari-hari') + '</span></div>' },
        { type: 'html', html: kotakLokasiKerja(k, x) },
        { type: 'html', html: kotakAreaKerja(k, x) },

        { type: 'html', html: '<div class="mcs-fs">' + T('Jam kerja') +
          '<span>' + T('Dipakai memeriksa jadwal yang tidak mungkin dikerjakan') +
          '</span></div>' },
        { type: 'html', html: kotakJamKerja(x) },
        { name: 'telp', label: T('Nomor WhatsApp'), value: x ? x.telp : '',
          placeholder: '08123456789',
          hint: T('Pengingat jadwal dikirim ke nomor ini. Tanpa nomor, petugas tidak bisa diingatkan.') },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2, value: x ? x.catatan : '' },
        { name: 'aktif', label: T('Masih bekerja'), type: 'checkbox',
          value: x ? x.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      d.areaIds = areaDariForm(k, d);
      d.foto = fotoPetugasSementara;
      /* Di luar `fields`, jadi ditahan sendiri. */
      d.lokasiIds = pkTahan.lokasiIds.slice();
      d.hariKerja = pkTahan.hariKerja.slice();
      d.shiftKode = pkTahan.shiftKode || '';
      d.jamMulai = pkTahan.jamMulai || '';
      d.jamSelesai = pkTahan.jamSelesai || '';
      /* Teks shift lama DIPERTAHANKAN apa adanya sampai orangnya sendiri
         memindahkannya — lihat catatan pada kotakJamKerja. */
      d.shift = x ? (x.shift || '') : '';
      var r = x ? MCS.ubahPekerja(id, d) : MCS.tambahPekerja(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      /* Peringatan BUKAN galat: petugasnya tetap tersimpan, hanya atasannya
         yang tidak dipasang. Menelannya diam-diam membuat orang mengira
         strukturnya sudah benar. */
      if (r.peringatan) UI.toast(r.peringatan, 'warn');
      else UI.toast(x ? T('Petugas diperbarui') : T('Petugas ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /* ============================================================== RONDA

     Jadwal berbunyi 'area ini, petugas ini, jam segini'. Ronda berbunyi
     'berangkat 08:00, lewati enam titik ini berurutan, selesai dalam 45
     menit'. Yang pertama memeriksa apakah tiap area disentuh; yang kedua
     memeriksa apakah seseorang benar-benar berjalan menyusuri gedung.
   */

  var ltTab = 'matriks';

  function renderLatih() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var st = LATIH.statistik(k.id);

    return catatanLatih() +
      (st.kurang.length || st.segera.length ? peringatanLatih(st) : '') +
      ringkasLatih(st) +
      '<div class="row between mb-3">' +
        UI.tabs([{ key: 'matriks', label: T('Matriks kompetensi'), n: st.orang },
                 { key: 'katalog', label: T('Daftar pelatihan'), n: st.pelatihan }],
                ltTab, 'lt-tab') +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="lt-cetak">🖨️ ' +
            T('Cetak matriks') + '</button>' +
          (ltTab === 'katalog'
            ? '<button class="btn btn--primary btn--sm" data-act="lt-baru">＋ ' +
              T('Tambah Pelatihan') + '</button>'
            : '<button class="btn btn--primary btn--sm" data-act="lt-catat">＋ ' +
              T('Catat Kepesertaan') + '</button>') +
        '</div>' +
      '</div>' +
      (ltTab === 'katalog' ? kartuKatalog(k) : kartuMatriks(k));
  }

  /* Keputusan penting yang harus dibaca sebelum orang menyalahartikan warna
     merah di matriks sebagai larangan bekerja. */

  function catatanLatih() {
    return UI.alert('info',
      '<b>' + T('Sertifikat yang habis TIDAK mengunci pekerjaan.') + '</b> ' +
      T('Mengunci pelaporan karena sertifikat kedaluwarsa berarti gedungnya ' +
        'tidak dibersihkan DAN tidak ada catatannya — dua kerugian, bukan satu. ' +
        'Yang merah di sini adalah daftar kerja untuk yang menjadwalkan ' +
        'pelatihan ulang, bukan larangan bagi petugasnya.'), '🎓') +
      '<div class="mb-3"></div>';
  }

  /**
   * Peringatan pelatihan — dihitung per ORANG, bukan per baris kewajiban.
   *
   * Dua perbaikan, keduanya terlihat begitu datanya besar:
   *
   *   · Satu orang yang belum ikut tiga pelatihan muncul TIGA KALI berturut
   *     dengan namanya sama. Pada 243 kewajiban, empat nama pertama bisa
   *     jadi milik dua orang saja — dan pembacanya menyimpulkan masalahnya
   *     jauh lebih kecil daripada yang sebenarnya.
   *   · '…' tidak menyebut berapa yang tidak ditampilkan. Titik tiga itu
   *     bisa berarti dua orang atau dua ratus, dan keduanya menuntut
   *     keputusan yang sangat berbeda.
   */

  function peringatanLatih(st) {
    function orangUnik(l) {
      var p = {}, urut = [];
      l.forEach(function (x) {
        var nm = x.baris.pekerja.nama;
        if (p[nm]) { p[nm]++; return; }
        p[nm] = 1; urut.push(nm);
      });
      return { nama: urut, n: urut.length, per: p };
    }
    /** Beberapa nama, lalu SISANYA disebut jumlahnya. */
    function sebut(o, batas) {
      var t = o.nama.slice(0, batas).map(function (nm) {
        return U.esc(nm) + (o.per[nm] > 1 ? ' (' + o.per[nm] + ')' : '');
      }).join(', ');
      if (o.n > batas) {
        t += ', ' + T('dan {n} lainnya').replace('{n}', U.num(o.n - batas));
      }
      return t;
    }

    var isi = '';
    if (st.kurang.length) {
      var ok = orangUnik(st.kurang);
      isi += '<b>' + jml(ok.n, T('1 petugas belum lengkap pelatihannya'),
        T('{n} petugas belum lengkap pelatihannya')) + '</b> — ' +
        jml(st.kurang.length, T('1 kewajiban belum terpenuhi'),
          T('{n} kewajiban belum terpenuhi')) + '. ' +
        sebut(ok, 4) + '. ';
    }
    if (st.segera.length) {
      var os = orangUnik(st.segera);
      isi += jml(st.segera.length, '1 sertifikat habis dalam {h} hari',
        '{n} sertifikat habis dalam {h} hari').replace('{h}', LATIH.HARI_PERINGATAN) + ': ' +
        sebut(os, 4) + '.';
    }
    return UI.alert(st.kurang.length ? 'danger' : 'warn', isi, '🎓') + '<div class="mb-3"></div>';
  }

  function ringkasLatih(st) {
    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Jenis pelatihan'), value: st.pelatihan, icon: '📚' }) +
        UI.stat({ label: T('Kepesertaan tercatat'), value: st.catatanTotal, icon: '📝' }) +
        UI.stat({ label: T('Pemenuhan rata-rata'),
          value: st.rata === null ? '—' : st.rata + '%', icon: '🎯',
          meta: T('dari yang diwajibkan menurut jabatan') }) +
        UI.stat({ label: T('Orang belum lengkap'), value: st.orangKurang, icon: '⚠️',
          meta: T('dari') + ' ' + st.orang }) +
      '</div>';
  }

  /**
   * Matriks: baris orang, kolom pelatihan.
   *
   * Bentuk inilah yang ditanyakan auditor dan yang dipasang di dinding ruang
   * penyelia — yang perlu terbaca sekilas adalah KOLOM yang penuh lubang,
   * bukan orang per orang.
   */

  function kartuMatriks(k) {
    var m = LATIH.matriks(k.id);
    if (!m.pelatihan.length) {
      return UI.card({ body: UI.empty('📚', T('Belum ada jenis pelatihan'),
        T('Daftarkan dulu jenis pelatihannya — induksi, penanganan bahan kimia, ' +
          'kerja di ketinggian — baru catat siapa yang sudah ikut.')) });
    }
    if (!m.baris.length) {
      return UI.card({ body: UI.empty('🧹', T('Belum ada petugas'), '') });
    }

    /* Yang PALING KURANG lebih dulu — matriks dibuka untuk mencari lubang,
       bukan untuk membaca dua ratus lima puluh delapan nama menurut abjad. */
    var baris = m.baris.slice().sort(function (a, b) {
      var pa = a.persen === null ? 101 : a.persen;
      var pb = b.persen === null ? 101 : b.persen;
      return pa - pb;
    });
    var bs = dpSaring('latih', baris, function (b) {
      return (b.pekerja.lokasiIds || []); });

    return UI.card({ flush: true, title: T('Matriks kompetensi'),
      sub: T('Merah berarti wajib tetapi belum ada atau sudah habis') + ' · ' +
        T('paling kurang lebih dulu'),
      body: dpBilah('latih', baris, bs, function (b) {
          return (b.pekerja.lokasiIds || []); }) +
        '<div class="tbl-wrap" id="lt-matriks"><table class="tbl lt-m">' +
        '<thead><tr><th>' + T('Petugas') + '</th>' +
          m.pelatihan.map(function (p) {
            return '<th class="lt-m__h" title="' + U.esc(T(LATIH.jenis(p.jenis).nama) +
              (p.berlakuBulan ? ' · ' + p.berlakuBulan + ' bln' : '')) + '">' +
              LATIH.jenis(p.jenis).ikon + '<span>' + U.esc(p.nama) + '</span></th>';
          }).join('') +
          '<th class="num">' + T('Penuhi') + '</th></tr></thead><tbody>' +
        bs.slice(0, dpS('latih').batas).map(function (b) {
          return '<tr><td class="lt-m__n"><b>' + U.esc(b.pekerja.nama) + '</b>' +
            '<span>' + b.jabatan.ikon + ' ' + U.esc(T(b.jabatan.nama)) + '</span></td>' +
            b.sel.map(function (s) { return selMatriks(b, s); }).join('') +
            '<td class="num">' + (b.persen === null ? '—' :
              '<b class="' + (b.persen < 100 ? 'mcs-warn' : '') + '">' + b.persen + '%</b>') +
            '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        /* Tombolnya DI LUAR tbl-wrap: di dalamnya ia ikut tergulung ke
           samping bersama tabelnya dan hilang dari pandangan. */
        (bs.length > dpS('latih').batas
          ? '<div class="as-lagi">' +
              '<button class="btn btn--ghost" data-act="dp-lagi" data-key="latih">' +
                T('Tampilkan {n} lagi').replace('{n}',
                  U.num(Math.min(DP_HAL, bs.length - dpS('latih').batas))) + '</button>' +
              '<span>' + T('{n} belum ditampilkan')
                .replace('{n}', U.num(bs.length - dpS('latih').batas)) + '</span>' +
            '</div>'
          : '') });
  }

  function selMatriks(b, s) {
    var k = s.keadaan;
    /* Yang TIDAK diwajibkan bagi jabatan ini digambar pudar, bukan kosong:
       kosong terbaca sebagai kekurangan, padahal ia memang tidak dituntut. */
    if (!s.wajib && k.kode === 'belum') {
      return '<td class="lt-m__s lt-m__s--luar" title="' +
        U.esc(T('Tidak diwajibkan untuk jabatan ini')) + '">·</td>';
    }
    var ka = LATIH.keadaan(k.kode);
    var judul = T(ka.nama) +
      (k.catatan ? ' · ' + T('diikuti') + ' ' + U.tglPendek(k.catatan.tgl) : '') +
      (k.habis ? ' · ' + T('habis') + ' ' + U.tglPendek(k.habis) : '') +
      (s.wajib ? '' : ' · ' + T('tidak diwajibkan'));
    return '<td class="lt-m__s lt-m__s--' + ka.warna + '" ' +
      'data-act="lt-sel" data-p="' + b.pekerja.id + '" data-l="' + s.pelatihan.id + '" ' +
      'title="' + U.esc(judul) + '">' + ka.ikon +
      (k.kode === 'segera' && k.sisaHari !== null
        ? '<i>' + k.sisaHari + 'h</i>' : '') + '</td>';
  }

  function kartuKatalog(k) {
    var l = LATIH.daftar(k.id, { semua: true });
    if (!l.length) {
      return UI.card({ body: UI.empty('📚', T('Belum ada jenis pelatihan'),
        T('Induksi gedung, penanganan bahan kimia, kerja di ketinggian, ' +
          'pemakaian mesin poles.')) });
    }
    return UI.card({ body: '<div class="ma-list">' + l.map(barisPelatihan).join('') + '</div>' });
  }

  function barisPelatihan(p) {
    var jn = LATIH.jenis(p.jenis);
    var on = p.aktif !== false;
    var wajib = (p.wajibJabatan || []).map(function (kd) {
      return T(MCS.jabatan(kd).nama); });
    var nCatat = LATIH.catatanPelatihan(p.id).length;

    return '<div class="ma-r' + (on ? '' : ' ma-r--jeda') + '">' +
      '<div class="lt-k__i">' + jn.ikon + '</div>' +
      '<div class="ma-r__t">' +
        '<b>' + U.esc(p.nama) + '</b>' +
        '<span>' + U.esc(T(jn.nama)) +
          ' · ' + (p.berlakuBulan
            ? T('berlaku') + ' ' + jml(p.berlakuBulan, '1 bulan', '{n} bulan')
            : T('tanpa masa berlaku')) +
          (p.penyelenggara ? ' · ' + U.esc(p.penyelenggara) : '') +
          ' · ' + jml(nCatat, '1 peserta tercatat', '{n} peserta tercatat') +
        '</span>' +
        '<span class="mcs-t__c">' + (wajib.length
          ? '🎯 ' + T('wajib bagi') + ' ' + U.esc(wajib.join(', '))
          : '○ ' + T('tidak diwajibkan bagi jabatan mana pun')) + '</span>' +
      '</div>' +
      (on ? '' : '<span class="chip chip--muted">' + T('dijeda') + '</span>') +
      '<button class="btn btn--ghost btn--sm" data-act="lt-ubah" data-id="' + p.id + '">' +
        T('Ubah') + '</button>' +
      '<button class="btn btn--ghost btn--sm ma-hapus" data-act="lt-hapus" ' +
        'data-id="' + p.id + '">🗑</button>' +
    '</div>';
  }

  function dialogPelatihan(id) {
    var k = korp();
    var x = id ? LATIH.satu(id) : null;
    UI.formModal({
      title: x ? T('Ubah pelatihan') : T('Tambah jenis pelatihan'),
      sub: U.esc(k.nama), size: 'wide', okText: x ? T('Simpan') : T('Tambahkan'),
      fields: [
        { name: 'nama', label: T('Nama pelatihan'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. Penanganan bahan kimia pembersih') },
        { name: 'jenis', label: T('Jenis'), type: 'select', value: x ? x.jenis : 'teknik',
          options: LATIH.JENIS.map(function (j) {
            return { value: j.kode, label: j.ikon + '  ' + T(j.nama) }; }) },
        { name: 'penyelenggara', label: T('Penyelenggara'), value: x ? x.penyelenggara : '',
          placeholder: T('mis. internal, atau nama lembaga') },
        { name: 'berlakuBulan', label: T('Masa berlaku (bulan)'), type: 'number', min: 0,
          value: x ? x.berlakuBulan : 0,
          hint: T('Isi 0 bila tidak kedaluwarsa. Induksi gedung tidak kedaluwarsa; ' +
            'sertifikat kerja di ketinggian jelas kedaluwarsa.') },
        { type: 'html', html: '<div class="field"><label>' + T('Wajib bagi jabatan') +
          '</label><div class="kh-alg">' + MCS.JABATAN.map(function (j) {
            var on = x && (x.wajibJabatan || []).indexOf(j.kode) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="wajibJabatan" data-multi="1" value="' + j.kode + '"' +
              (on ? ' checked' : '') + '><span>' + j.ikon + ' ' + U.esc(T(j.nama)) + '</span></label>';
          }).join('') + '</div>' +
          '<div class="hint">' + T('Kosongkan bila pelatihan ini baik dipunyai tetapi ' +
            'tidak dituntut. Yang tidak dituntut tidak akan muncul sebagai kekurangan.') +
          '</div></div>' },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2,
          value: x ? x.catatan : '' },
        { name: 'aktif', label: T('Masih dipakai'), type: 'checkbox',
          value: x ? x.aktif !== false : true }
      ]
    }).then(function (d) {
      if (!d) return;
      d.wajibJabatan = [].concat(d.wajibJabatan || []);
      var r = x ? LATIH.ubah(id, d) : LATIH.tambah(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(x ? T('Pelatihan diperbarui') : T('Pelatihan ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  function dialogCatatLatih(pekerjaId, pelatihanId) {
    var k = korp();
    var pel = LATIH.daftar(k.id);
    var org = MCS.pekerja(k.id);
    if (!pel.length) { UI.toast(T('Daftarkan jenis pelatihannya dulu.'), 'err'); return; }

    UI.formModal({
      title: T('Catat kepesertaan'), size: 'wide', okText: T('Catat'),
      fields: [
        { name: 'pekerjaId', label: T('Petugas'), type: 'select',
          value: pekerjaId || (org[0] && org[0].id),
          options: org.map(function (o) {
            return { value: o.id, label: MCS.jabatan(o.jabatan).ikon + ' ' + o.nama }; }) },
        { name: 'pelatihanId', label: T('Pelatihan'), type: 'select',
          value: pelatihanId || (pel[0] && pel[0].id),
          options: pel.map(function (p) {
            return { value: p.id, label: LATIH.jenis(p.jenis).ikon + ' ' + p.nama }; }) },
        { name: 'tgl', label: T('Tanggal mengikuti'), type: 'date', value: U.today(),
          hint: T('Masa berlakunya dihitung dari tanggal ini.') },
        { name: 'lulus', label: T('Dinyatakan lulus'), type: 'checkbox', value: true,
          hint: T('Yang tidak lulus tetap dicatat — riwayat mengulang itu berguna, ' +
            'dan menghapusnya membuat pelatihan terlihat selalu berhasil.') },
        { name: 'nilai', label: T('Nilai (opsional)'), type: 'number', min: 0, value: '' },
        { name: 'nomorSertifikat', label: T('Nomor sertifikat'), value: '' },
        { name: 'penyelenggara', label: T('Penyelenggara'), value: '' },
        { name: 'catatan', label: T('Catatan'), type: 'textarea', rows: 2 }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = LATIH.catat(d.pekerjaId, d.pelatihanId, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Kepesertaan tercatat.'), 'ok');
      APP.refresh();
    });
  }

  /** Riwayat satu orang pada satu pelatihan — termasuk yang tidak lulus. */

  function dialogSelLatih(pekerjaId, pelatihanId) {
    var o = MCS.pekerjaSatu(pekerjaId);
    var p = LATIH.satu(pelatihanId);
    if (!o || !p) return;
    var l = LATIH.catatanPekerja(pekerjaId).filter(function (r) {
      return r.pelatihanId === pelatihanId; });
    var k = LATIH.keadaanSatu(pekerjaId, p);
    var ka = LATIH.keadaan(k.kode);

    UI.modal({
      title: p.nama, sub: o.nama,
      body: '<div class="lt-d__k">' +
          '<span class="chip chip--' + ka.warna + '">' + ka.ikon + ' ' + T(ka.nama) + '</span>' +
          (k.habis ? '<span class="tbl-sub">' + T('habis') + ' ' +
            U.esc(U.tglPanjang(k.habis)) +
            (k.sisaHari !== null ? ' · ' + (k.sisaHari < 0
              ? T('lewat') + ' ' + Math.abs(k.sisaHari) + ' ' + T('hari')
              : T('sisa') + ' ' + k.sisaHari + ' ' + T('hari')) : '') + '</span>'
            : '<span class="tbl-sub">' + T('tanpa masa berlaku') + '</span>') +
        '</div>' +
        (l.length
          ? '<div class="wk-d__rw mt-3">' + l.map(function (r) {
              return '<div>' + (r.lulus === false ? '❌' : '✅') + ' <b>' +
                U.esc(U.tglPanjang(r.tgl)) + '</b>' +
                (r.nilai !== null && r.nilai !== undefined ? ' · ' + T('nilai') + ' ' + r.nilai : '') +
                (r.nomorSertifikat ? ' · ' + U.esc(r.nomorSertifikat) : '') +
                (r.penyelenggara ? ' · ' + U.esc(r.penyelenggara) : '') +
                (r.habis ? ' · ' + T('habis') + ' ' + U.esc(U.tglPendek(r.habis)) : '') +
                (r.catatan ? ' — ' + U.esc(r.catatan) : '') +
                ' <button class="btn btn--ghost btn--sm ma-hapus" data-act="lt-hapus-catat" ' +
                'data-id="' + r.id + '">🗑</button></div>';
            }).join('') + '</div>'
          : '<div class="tbl-sub mt-3">' + T('Belum pernah tercatat mengikuti pelatihan ini.') +
            '</div>'),
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="lt-catat-sel" data-p="' + pekerjaId + '" ' +
          'data-l="' + pelatihanId + '">＋ ' + T('Catat kepesertaan') + '</button>',
      actions: {
        'lt-catat-sel': function (el) {
          dialogCatatLatih(el.getAttribute('data-p'), el.getAttribute('data-l'));
        },
        'lt-hapus-catat': function (el) {
          LATIH.hapusCatat(el.getAttribute('data-id'));
          UI.toast(T('Catatan dihapus.'), 'ok');
          APP.refresh();
        }
      }
    });
  }

  function cetakMatriks() {
    var k = korp();
    if (!k) return;
    var m = LATIH.matriks(k.id);
    cetakDaftar({
      judul: T('Matriks Kompetensi Petugas'),
      sub: T('Wajib menurut jabatan · B = berlaku, S = segera habis, H = kedaluwarsa, ' +
        '— = belum ada, · = tidak diwajibkan'),
      baris: m.baris,
      kolom: [
        { h: T('Petugas'), r: function (b) { return b.pekerja.nama; } },
        { h: T('Jabatan'), r: function (b) { return T(b.jabatan.nama); } }
      ].concat(m.pelatihan.map(function (p, i) {
        return { h: p.nama, r: function (b) {
          var s = b.sel[i];
          if (!s.wajib && s.keadaan.kode === 'belum') return '·';
          return { berlaku: 'B', segera: 'S', habis: 'H', belum: '—' }[s.keadaan.kode] +
            (s.keadaan.habis ? ' ' + s.keadaan.habis : '');
        } };
      })).concat([
        { h: T('Penuhi'), num: true, r: function (b) {
          return b.persen === null ? '' : b.persen + '%'; } }
      ]),
      kaki: T('Sertifikat yang kedaluwarsa tidak mengunci pekerjaan di aplikasi — ' +
        'daftar ini untuk yang menjadwalkan pelatihan ulang.')
    });
  }

  function mountLatih(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'lt-tab': function (el) { ltTab = el.getAttribute('data-key'); APP.refresh(); },
      'lt-baru': function () { dialogPelatihan(null); },
      'lt-ubah': function (el) { dialogPelatihan(el.getAttribute('data-id')); },
      'lt-catat': function () { dialogCatatLatih(null, null); },
      'lt-sel': function (el) {
        dialogSelLatih(el.getAttribute('data-p'), el.getAttribute('data-l'));
      },
      'lt-cetak': cetakMatriks,
      'lt-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var p = LATIH.satu(id);
        var n = LATIH.catatanPelatihan(id).length;
        UI.konfirm({ title: T('Hapus pelatihan') + '?', danger: true,
          text: (p ? p.nama + '. ' : '') + (n
            ? jml(n, '1 catatan kepesertaan ikut terhapus',
                '{n} catatan kepesertaan ikut terhapus') + '. '
            : '') +
            T('Bila hanya ingin menghentikannya, matikan “Masih dipakai” lewat Ubah — ' +
              'catatannya tetap tersimpan.') }).then(function (ya) {
          if (!ya) return;
          LATIH.hapus(id);
          UI.toast(T('Pelatihan dihapus.'), 'ok');
          APP.refresh();
        });
      }
    }));
  }

  /* ================================================ PORTAL PEMILIK GEDUNG

     Laporan baca-saja yang dibuka lewat tautan bertoken, tanpa akun.
     Yang MEMBAYAR jasa kebersihan berhak melihat buktinya sendiri, bukan
     hanya mendengar ringkasan lisan pengelola.

     Tidak ada satu pun tombol yang mengubah data di layar ini. Ia hanya
     membaca — dan satu-satunya yang ia tulis adalah penghitung pembukaan.
   */

  function cetakDaftarPetugas() {
    var k = korp();
    if (!k) return;
    cetakDaftar({
      judul: T('Daftar Petugas Kebersihan'),
      sub: T('Termasuk yang dinonaktifkan'),
      baris: MCS.pekerja(k.id, true),
      kolom: [
        { h: T('No'), num: true, r: function (x, i) { return i + 1; } },
        { h: T('Nomor induk'), r: function (x) { return x.nip || '—'; } },
        { h: T('Nama'), r: function (x) { return x.nama; } },
        { h: T('Jabatan'), r: function (x) { return T(MCS.jabatan(x.jabatan).nama); } },
        { h: T('Jenis'), r: function (x) { return T(MCS.jenisPekerja(x.jenis).nama); } },
        { h: T('Shift'), r: function (x) { return namaShift(x); } },
        { h: T('Melapor kepada'), r: function (x) { return namaPekerja(x.atasanId) || '—'; } },
        { h: T('Area kerja'), r: function (x) {
          var a = MCS.areaPekerja(x.id);
          return a.length ? a.map(function (y) { return y.nama; }).join(', ') : '—'; } },
        { h: T('Telepon'), r: function (x) { return x.telp || '—'; } },
        { h: T('Kode masuk'), r: function (x) {
          var ak = MCS.akunPetugas(x.id);
          return ak ? (ak.aktif ? ak.kodeMasuk : T('dicabut')) : T('belum ada'); } },
        { h: T('Status'), r: function (x) {
          return x.aktif === false ? T('nonaktif') : T('aktif'); } }
      ],
      kaki: T('Kolom kode masuk berisi nama pengguna aplikasi, BUKAN sandi. ' +
        'Sandi tidak pernah bisa dibaca ulang oleh siapa pun, termasuk oleh staf.')
    });
  }

  function kartuPetugas(p, k) {
    var jb = MCS.jabatan(p.jabatan);
    var jn = MCS.jenisPekerja(p.jenis);
    var akun = MCS.akunPetugas(p.id);
    var foto = p.foto ? DB.getPhoto(p.foto) : null;
    var area = MCS.areaPekerja(p.id);

    return '<div class="idc">' +
      '<div class="idc__kop">' +
        '<div class="idc__pt">' + U.esc((k && k.nama) || '') + '</div>' +
        '<div class="idc__mcs">MCS</div>' +
      '</div>' +
      '<div class="idc__isi">' +
        (foto
          ? '<img class="idc__f" src="' + U.esc(foto) + '" alt="">'
          : '<div class="idc__f idc__f--kosong">' + T('tanpa foto') + '</div>') +
        '<div class="idc__t">' +
          '<div class="idc__n">' + U.esc(p.nama) + '</div>' +
          '<div class="idc__j">' + U.esc(T(jb.nama)) + '</div>' +
          '<div class="idc__m">' + U.esc(T(jn.nama)) +
            (p.shift ? ' · ' + U.esc(p.shift) : '') + '</div>' +
          (p.nip ? '<div class="idc__nip">' + U.esc(p.nip) + '</div>' : '') +
          (area.length
            ? '<div class="idc__a">' + U.esc(area.slice(0, 2).map(function (a) {
                return a.nama; }).join(', ')) +
              (area.length > 2 ? ' +' + (area.length - 2) : '') + '</div>'
            : '') +
        '</div>' +
        /* QR berisi kode masuknya sendiri — bukan tautan ke mana pun.
           Dipakai atasan untuk membuka data petugas dengan cepat, dan tidak
           berguna bagi orang luar yang memotretnya: tanpa sandi, kode masuk
           tidak membuka apa-apa. */
        (akun && akun.kodeMasuk
          ? '<div class="idc__q">' + QR.svg(akun.kodeMasuk, { ukuran: 74, alt: p.nama }) +
            '<div class="idc__qk">' + U.esc(akun.kodeMasuk) + '</div></div>'
          : '') +
      '</div>' +
      '<div class="idc__kaki">' +
        T('Kartu ini milik gedung. Bila ditemukan, kembalikan ke pengelola.') +
      '</div>' +
    '</div>';
  }

  function dialogKartu(pekerjaId) {
    var p = MCS.pekerjaSatu(pekerjaId);
    var k = korp();
    if (!p) return;
    UI.modal({
      title: T('Kartu identitas'), sub: p.nama,
      body: '<div class="idc-bungkus" id="idc-cetak">' + kartuPetugas(p, k) + '</div>' +
        (p.foto ? '' : '<div class="mt-2">' + UI.alert('warn',
          T('Petugas ini belum punya pasfoto. Kartu tanpa wajah tidak berguna sebagai ' +
            'tanda pengenal — unggah fotonya lewat Ubah.'), '📷') + '</div>') +
        '<p class="tbl-sub mt-2">' +
          T('Ukuran cetak 85,6 × 54 mm — sama dengan KTP, muat di sarung tanda pengenal biasa.') +
        '</p>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="idc-cetak-btn">🖨️ ' + T('Cetak kartu') + '</button>',
      actions: { 'idc-cetak-btn': function () { cetak('cetak-idc'); } }
    });
  }

  /** Semua kartu sekaligus — untuk gedung yang baru memasang MCS. */

  function lembarKartu() {
    var k = korp();
    if (!k) return;
    var l = MCS.pekerja(k.id);
    var tanpaFoto = l.filter(function (p) { return !p.foto; }).length;
    UI.modal({
      title: T('Cetak semua kartu'), sub: jml(l.length, T('1 petugas'), T('{n} petugas')),
      size: 'wide',
      body: (tanpaFoto
          ? UI.alert('warn', jml(tanpaFoto, T('1 kartu akan tercetak tanpa wajah'),
              T('{n} kartu akan tercetak tanpa wajah')) + '. ' +
              T('Unggah pasfotonya dulu bila kartunya memang akan dipakai.'), '📷') +
            '<div class="mb-3"></div>'
          : '') +
        '<div class="idc-bungkus idc-bungkus--banyak" id="idc-cetak">' +
          l.map(function (p) { return kartuPetugas(p, k); }).join('') +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="idc-cetak-btn">🖨️ ' + T('Cetak semua') + '</button>',
      actions: { 'idc-cetak-btn': function () { cetak('cetak-idc'); } }
    });
  }

  function mountPekerja(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'mcs-pk-baru': function () { dialogPekerja(null); },
      'mcs-tim': dialogTim,
      'mcs-pk-kartu': function (el) { dialogKartu(el.getAttribute('data-id')); },
      'mcs-pk-kartu-semua': function () { lembarKartu(); },
      'mcs-pk-cetak': function () { cetakDaftarPetugas(); },
      'mcs-pk-akun': function (el) { dialogAkunPetugas(el.getAttribute('data-id')); },
      'mcs-pk-buatakun': function (el) {
        var id = el.getAttribute('data-id');
        var p = MCS.pekerjaSatu(id);
        UI.konfirm({
          title: T('Buatkan akun untuk') + ' ' + (p ? p.nama : '') + '?',
          htmlText: T('Sandi sementaranya hanya akan ditampilkan SEKALI. Pastikan Anda ' +
            'bisa menyerahkannya langsung kepada yang bersangkutan sekarang.'),
          okText: T('Buatkan akun')
        }).then(function (ya) {
          if (!ya) return;
          var r = MCS.buatAkunPetugas(id, APP.user);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          slipAkun(id, r);
        });
      },
      'mcs-pk-ubah': function (el) { dialogPekerja(el.getAttribute('data-id')); },
      'mcs-pk-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var x = MCS.pekerjaSatu(id);
        var j = MCS.jadwalPekerja(id);
        /* Alat yang sedang ia pegang DISEBUT SEBELUM menekan Hapus, bukan
           sesudahnya. Orang yang baru tahu bahwa tiga mesin berpindah
           tangan setelah perbuatannya selesai tidak lagi punya pilihan —
           dan alat mahal adalah hal yang paling ingin ia periksa dulu. */
        var alat = (window.ASET && ASET.dipegang) ? ASET.dipegang(id) : [];
        UI.konfirm({
          title: T('Hapus petugas ini?'),
          htmlText: '<b>' + U.esc(x.nama) + '</b>.<br>' +
            (j.length
              ? '<b style="color:var(--danger,#DC2626)">' +
                jml(j.length, T('1 jadwal ikut terhapus.'), T('{n} jadwal ikut terhapus.')) + '</b> ' +
                T('Jadwal tanpa petugas tidak mengingatkan siapa pun, jadi tidak ada gunanya ditinggalkan.')
              : T('Belum ada jadwal yang memakainya.')) +
            (alat.length
              ? '<br><br><b>' + jml(alat.length,
                  T('1 peralatan yang ia pegang dikembalikan ke gudang:'),
                  T('{n} peralatan yang ia pegang dikembalikan ke gudang:')) + '</b> ' +
                U.esc(alat.slice(0, 4).map(function (a) { return a.nama; }).join(', ')) +
                (alat.length > 4
                  ? ', ' + T('dan {n} lainnya').replace('{n}', U.num(alat.length - 4))
                  : '') + '. ' +
                T('Periksa dulu barangnya sungguh sudah kembali — aplikasi hanya ' +
                  'mengubah catatannya, bukan memindahkan barangnya.')
              : '') +
            '<br><br>' + T('Bila ia hanya berhenti sementara, matikan saja “Masih bekerja” lewat Ubah.'),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var r = MCS.hapusPekerja(id);
          UI.toast(r && r.alatDilepas
            ? jml(r.alatDilepas, T('Petugas dihapus, 1 peralatan kembali ke gudang'),
                T('Petugas dihapus, {n} peralatan kembali ke gudang'))
            : T('Petugas dihapus'), 'ok');
          APP.refresh();
        });
      }
    }));
  }

  /* ================================================================= AREA */

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsPekerja", { label: 'Petugas Kebersihan', icon: '🧹', grup: 'Pengaturan',
      render: renderPekerja, mount: mountPekerja });

  VMCS.daftar("korporat", "mcsLatih", { label: 'Pelatihan', icon: '🎓', grup: 'Pengaturan',
      sub: 'Kompetensi, sertifikat, dan masa berlakunya',
      badge: function () {
        var k = MCS.korporatUser(APP.user);
        if (!k) return null;
        var s = LATIH.statistik(k.id);
        return (s.kurang.length + s.segera.length) || null;
      },
      render: renderLatih, mount: mountLatih });
})();
