/* ==========================================================================
   views/profil.js — halaman Profil, dipakai keempat peran
   --------------------------------------------------------------------------
   Susunannya mengikuti pola aplikasi marketplace: kartu identitas di atas,
   lalu tab pengaturan (data diri, alamat, rekening, keamanan, preferensi),
   dan blok promo/program di bagian bawah.

   Isinya menyesuaikan peran: klien melihat statistik belanja & promo, tim
   lapangan melihat statistik pekerjaan & program internal.
   ========================================================================== */
var ViewProfil = (function () {

  var T = function (s) { return I18N.t(s); };
  var tab = 'diri';

  function aku() { return APP.user; }
  function segar() { return DB.find('users', aku().id) || aku(); }
  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
  }
  /** Sesi menyimpan salinan objek user; setelah data diubah, sinkronkan. */
  function terapkan() { APP.perbaruiSesi(segar()); }

  var LABEL_PERAN = { admin: 'Admin EXOCLEAN', supervisor: 'Supervisor',
    client: 'Klien', worker: 'Tenaga Kerja Lapangan' };

  /* ================================================================ KARTU IDENTITAS */
  function kartuIdentitas() {
    var u = segar();
    var foto = u.foto ? DB.getPhoto(u.foto) : null;
    var pref = AKUN.preferensi(u);

    return '<div class="prof-hero">' +
      '<div class="prof-hero__bg"></div>' +
      '<div class="prof-hero__isi">' +
        '<div class="prof-ava">' +
          (foto ? '<img src="' + foto + '" alt="' + U.esc(u.nama) + '">'
                : '<span>' + U.esc(U.initials(u.nama)) + '</span>') +
          '<button class="prof-ava__btn" data-act="pilih-foto" title="' + T('Ganti foto') + '">📷</button>' +
          '<input type="file" accept="image/*" hidden id="inp-foto" data-change="unggah-foto">' +
        '</div>' +
        '<div class="prof-hero__teks">' +
          '<h2>' + U.esc(u.nama) + '</h2>' +
          '<div class="prof-hero__sub">' + U.esc(u.perusahaan || u.jabatan || u.email) + '</div>' +
        '</div>' +

        /* Barisan chip dikeluarkan dari kolom nama supaya bisa memakai lebar
           penuh kartu. Di dalam kolom itu — yang tersisa hanya ~228px di
           ponsel — "Bergabung sejak 23 Agu 2025" saja sudah menghabiskan
           hampir seluruhnya, jadi tiap chip turun ke barisnya sendiri. */
        '<div class="prof-hero__chips">' +
          '<span class="chip chip--brand">' + U.esc(T(LABEL_PERAN[u.role])) + '</span>' +
          (u.role === 'client' ? '<span class="chip chip--muted">' +
            UI.statusText('segmen', CRM.segmen(u.id)) + '</span>' : '') +
          '<span class="chip chip--muted">' + T('Bergabung sejak') + ' ' + U.tgl(u.createdAt) + '</span>' +
          '<span class="chip chip--muted">' + I18N.info(pref.bahasa).bendera + ' ' +
            U.esc(I18N.info(pref.bahasa).asli) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="prof-hero__stat">' + statPeran(u) + '</div>' +
    '</div>';
  }

  /** Ringkasan angka yang relevan untuk peran yang sedang masuk. */
  function statPeran(u) {
    /* Seluruh cabangnya bersandar pada order, QC, dan pendapatan — milik
       aplikasi pasar, dan MCS EXOCLEAN tidak melayani satu pun peran itu.
       Tanpa modulnya tidak ada yang bisa dihitung, dan kartunya memang
       tidak perlu ada. */
    if (!window.BIZ) return '';
    function sel(label, nilai, ket) {
      return '<div class="prof-stat"><b>' + nilai + '</b><small>' + U.esc(T(label)) +
        (ket ? '<span>' + U.esc(ket) + '</span>' : '') + '</small></div>';
    }
    if (u.role === 'client') {
      var p = CRM.profil(u.id);
      return sel('Pekerjaan', p.order.length, p.orderSelesai + ' ' + T('selesai')) +
        sel(T('Belanja toko'), p.belanja.length, U.rpShort(U.sum(p.belanja, function (x) { return x.total; }))) +
        sel('Nilai transaksi', U.rpShort(p.nilai),
          p.piutang ? T('piutang') + ' ' + U.rpShort(p.piutang) : T('tidak ada piutang')) +
        sel('Penilaian diberikan', DB.where('ratings', { clientId: u.id }).length,
          p.rataRating ? T('rata') + ' ' + p.rataRating + '★' : '—');
    }
    if (u.role === 'worker') {
      var tugas = BIZ.ordersUntuk(u);
      var qs = DB.all('qc').filter(function (q) {
        var o = BIZ.order(q.orderId); return o && (o.workerIds || []).indexOf(u.id) >= 0; });
      var jam = 0;
      DB.where('attendance', { workerId: u.id }).forEach(function (a) {
        if (a.tipe !== 'in') return;
        var out = DB.where('attendance', function (x) {
          return x.orderId === a.orderId && x.workerId === u.id && x.tipe === 'out'; })[0];
        if (out) jam += (new Date(out.at) - new Date(a.at)) / 3600000;
      });
      return sel('Tugas', tugas.length,
          tugas.filter(function (o) { return o.status === 'diverifikasi'; }).length + ' ' + T('selesai')) +
        sel('Jam kerja', Math.round(jam) + 'j', T('tercatat')) +
        sel('Rata QC', qs.length ? (Math.round(U.sum(qs, BIZ.rataQC) / qs.length * 10) / 10) + '★' : '—',
          qs.length + ' ' + T('verifikasi')) +
        sel('Sertifikat', (u.sertifikat || []).length, (u.sertifikat || []).join(', ') || T('belum ada'));
    }
    if (u.role === 'supervisor') {
      var tim = DB.where('teams', { supervisorId: u.id });
      var ord = BIZ.ordersUntuk(u);
      return sel('Tim dipegang', tim.length, tim.map(function (t) { return t.nama; }).join(', ') || '—') +
        sel('Anggota', U.sum(tim, function (t) { return t.memberIds.length; }), T('petugas')) +
        sel('Pekerjaan', ord.length,
          ord.filter(function (o) { return o.status === 'diverifikasi'; }).length + ' ' + T('terverifikasi')) +
        sel('Verifikasi QC', DB.where('qc', { supervisorId: u.id }).length, T('dilakukan'));
    }
    var st = BIZ.statistik();
    return sel('Klien', st.totalKlien, T('terdaftar')) +
      sel('Petugas', st.totalPetugas, T('aktif')) +
      sel('Order berjalan', st.orderBerjalan.length + st.orderHariIni.length, T('hari ini')) +
      sel(T('Pendapatan bulan ini'), U.rpShort(st.pendapatanBulanIni), U.bulanTahun(new Date()));
  }

  /* ================================================================ TAB: DATA DIRI */
  function tabDiri() {
    var u = segar();
    var isKlien = u.role === 'client';
    return kartuDataDiri(u, isKlien) +
      (PEGAWAI.pegawaiLapangan(u) ? kartuSertifikatProfil(u) : '') +
      (u.role === 'worker' ? kartuPanduanLapangan() : '');
  }

  /** Sertifikat hasil pembelajaran — tampil di profil mitra & supervisor. */
  function kartuSertifikatProfil(u) {
    var sert = LMS.sertifikatSaya(u.id);
    var mitra = LMS.punyaSertifikat(u.id, 'MITRA');
    return UI.card({ cls: 'mt-3', title: T('Sertifikat & Kompetensi'),
      sub: sert.length ? sert.length + ' ' + T('sertifikat dari pembelajaran EXOCLEAN')
                       : T('Belum ada sertifikat'),
      tools: '<button class="btn btn--ghost btn--sm" data-act="ke-belajar-profil">📚 ' +
        T('Buka Pembelajaran') + '</button>',
      body: sert.length
        ? (mitra ? UI.alert('ok', '<b>' + T('Mitra Tersertifikasi EXOCLEAN') + '</b> — ' +
            T('nilai') + ' ' + mitra.nilai + ', ' + T('berlaku sampai') + ' ' +
            U.tgl(mitra.berlakuHingga) + '.', '🏅') + '<div class="mb-3"></div>' : '') +
          /* Sertifikat hanya ada pada mitra lapangan. Build yang tidak
             membawa layar pembelajaran (mis. MCS) melewatinya. */
          (window.ViewBelajar
            ? '<div class="grid g-2">' + sert.map(ViewBelajar.kartuSertifikat).join('') + '</div>'
            : '')
        : UI.empty('🎓', T('Belum ada sertifikat'),
            T('Selesaikan kursus di menu Belajar untuk mendapatkan sertifikat. Sertifikat yang terbit ' +
              'otomatis tampil di sini.')) });
  }

  /** Alur kerja harian tim lapangan — sebelumnya ada di halaman profil petugas. */
  function kartuPanduanLapangan() {
    return UI.card({ cls: 'mt-3', title: T('Panduan Singkat Lapangan'),
      body: '<div style="font-size:12.8px;color:var(--ink-2);line-height:1.65">' +
        '<b>1.</b> ' + T('Tiba di lokasi → tekan') + ' <b>Check-in</b> (aktifkan GPS).<br>' +
        '<b>2.</b> Ambil <b>foto sebelum</b> sebelum mulai bekerja.<br>' +
        '<b>3.</b> Centang checklist sambil mengerjakan.<br>' +
        '<b>4.</b> Ambil <b>foto sesudah</b> ' + T('dan tulis catatan bila ada temuan.') + '<br>' +
        '<b>5.</b> Tekan <b>Check-out</b> lalu <b>' + T('Laporkan Selesai') + '</b>.<br>' +
        '<b>6.</b> ' + T('Selalu gunakan APD sesuai jenis pekerjaan.') + '</div>' });
  }

  function kartuDataDiri(u, isKlien) {
    return UI.card({
      title: T('Data Diri'), sub: T('Informasi dasar akun Anda'),
      body: '<div class="inline-2">' +
          UI.field({ name: 'nama', label: T('Nama lengkap'), value: u.nama, required: true }) +
          (isKlien
            ? UI.field({ name: 'perusahaan', label: T('Nama perusahaan (kosongkan bila perorangan)'),
                value: u.perusahaan || '' })
            : UI.field({ name: 'jabatan', label: T('Jabatan'), value: u.jabatan || '' })) +
        '</div>' +
        '<div class="inline-2">' +
          UI.field({ name: 'telp', label: T('No. WhatsApp'), value: u.telp, required: true,
            hint: T('Dipakai untuk semua notifikasi jadwal & tagihan.') }) +
          UI.field({ name: 'email', label: T('Email'), type: 'email', value: u.email, required: true,
            hint: T('Sekaligus dipakai untuk masuk ke aplikasi.') }) +
        '</div>' +
        (isKlien ? UI.field({ name: 'tipe', label: T('Jenis bangunan utama'), type: 'select', value: u.tipe || 'korporat',
          options: [{ value: 'korporat', label: 'Gedung / kantor' }, { value: 'ruko', label: 'Ruko' },
                    { value: 'rumah', label: T('Rumah') }, { value: 'pabrik', label: 'Pabrik / gudang' }] }) : ''),
      foot: '<div class="spacer"></div><button class="btn" data-act="simpan-diri">' +
        T('Simpan Perubahan') + '</button>'
    });
  }

  /* ================================================================ TAB: ALAMAT */
  function tabAlamat() {
    var u = segar();
    var list = PEGAWAI.alamatList(u);
    return UI.card({
      title: T('Alamat Tersimpan'), sub: list.length + ' ' + T('alamat'),
      tools: '<button class="btn btn--sm" data-act="alamat-baru">＋ ' + T('Tambah Alamat') + '</button>',
      flush: true,
      body: list.length
        ? '<div style="padding:14px 18px">' + list.map(function (a) {
            return '<div class="adr' + (a.utama ? ' utama' : '') + '">' +
              '<div class="row" style="gap:8px;align-items:flex-start">' +
                '<div style="min-width:0;flex:1">' +
                  '<div class="row" style="gap:7px"><b>' + U.esc(a.label) + '</b>' +
                    (a.utama ? '<span class="chip chip--brand" style="font-size:10px">' + T('Utama') + '</span>' : '') +
                  '</div>' +
                  '<div class="adr__nama">' + U.esc(a.penerima) + ' • ' + U.phoneDisplay(a.telp) + '</div>' +
                  '<div class="adr__teks">' + U.esc(a.alamat) +
                    (a.kota ? ', ' + U.esc(a.kota) : '') + (a.kodePos ? ' ' + U.esc(a.kodePos) : '') + '</div>' +
                  (a.patokan ? '<div class="adr__patokan">📍 ' + U.esc(a.patokan) + '</div>' : '') +
                  '<div class="adr__peta">' + (MAPS.valid(a.koordinat)
                    ? '<span class="map-koor">📍 ' + MAPS.teksKoordinat(a.koordinat) + '</span>' +
                      ' <a href="' + MAPS.link(a.koordinat) + '" target="_blank" rel="noopener">' + T('Lihat peta ↗') + '</a>' +
                      ' <a href="' + MAPS.rute(null, a.koordinat) + '" target="_blank" rel="noopener">Rute 🧭</a>'
                    : '<span class="chip chip--warn" style="font-size:10px">' + T('Titik peta belum ditandai') + '</span>') +
                  '</div>' +
                '</div>' +
                '<div class="col" style="gap:5px">' +
                  (a.utama ? '' : '<button class="btn btn--ghost btn--sm" data-act="alamat-utama" data-id="' +
                    a.id + '">' + T('Jadikan utama') + '</button>') +
                  '<button class="btn btn--ghost btn--sm" data-act="alamat-peta" data-id="' + a.id + '">' +
                    (MAPS.valid(a.koordinat) ? T('📍 Ubah titik') : T('📍 Tandai di peta')) + '</button>' +
                  '<div class="row" style="gap:5px">' +
                    '<button class="btn btn--ghost btn--sm" data-act="alamat-ubah" data-id="' + a.id + '">' +
                      T('Ubah') + '</button>' +
                    (list.length > 1 ? '<button class="btn btn--ghost btn--sm" data-act="alamat-hapus" data-id="' +
                      a.id + '">🗑</button>' : '') +
                  '</div>' +
                '</div>' +
              '</div></div>';
          }).join('') + '</div>'
        : UI.empty('📍', T('Belum ada alamat tersimpan'),
            T('Tambahkan alamat agar tidak perlu mengetik ulang saat memesan layanan atau berbelanja.'))
    });
  }

  function dialogAlamat(id) {
    var u = segar();
    var list = PEGAWAI.alamatList(u).slice();
    var a = id ? list.filter(function (x) { return x.id === id; })[0] : null;

    /* Alamat lama diangkat dulu menjadi bentuk terstruktur, supaya menyunting
       alamat lama tidak menghapus apa yang sudah pernah diisi pengguna.

       Kolom yang sudah tersimpan terpisah — kota, kode pos, patokan — dipakai
       APA ADANYA. Hanya sisanya yang ditebak dari teks. Menebak ulang nilai
       yang sudah benar berarti mengganti data dengan hasil terkaan. */
    var w;
    if (a && a.wilayah) {
      w = a.wilayah;
    } else if (a) {
      w = WILAYAH.dariTeksLama(a.alamat);
      if (a.kota) w.l2 = a.kota;
      if (a.kodePos) w.kodePos = a.kodePos;
      if (a.patokan) w.patokan = a.patokan;
    } else {
      w = WILAYAH.kosong();
    }

    UI.formModal({
      title: a ? T('Ubah') + ' alamat' : T('Tambah Alamat'), size: 'wide', okText: T('Simpan'),
      fields: [
        { name: 'label', label: T('Label alamat'), type: 'select', value: a ? a.label : T('Rumah'),
          options: ['Rumah', 'Kantor', 'Gudang', 'Ruko', 'Klinik', 'Cabang', 'Lainnya'] },
        { name: 'penerima', label: T('Nama penerima'), value: a ? a.penerima : u.nama, required: true },
        { name: 'telp', label: T('No. telepon penerima'), value: a ? a.telp : u.telp, required: true }
      ].concat(WILAYAH.fields(w)).concat([
        { name: 'utama', label: T('Jadikan alamat utama'), type: 'checkbox',
          value: a ? a.utama : list.length === 0 }
      ]),
      validate: function (d) { return WILAYAH.periksa(WILAYAH.dariForm(d)); },
      onMount: function (root) { WILAYAH.pasang(root); }
    }).then(function (d) {
      if (!d) return;
      if (d.utama) list.forEach(function (x) { x.utama = false; });
      var wil = WILAYAH.dariForm(d);
      /* Dua bentuk disimpan berdampingan: `wilayah` untuk yang baru, dan
         `alamat`/`kota`/`kodePos` sebagai satu baris supaya seluruh layar
         lama — invoice, label kurir, detail pesanan — tetap terbaca. */
      var rec = {
        label: d.label, penerima: d.penerima, telp: d.telp, utama: d.utama,
        wilayah: wil,
        alamat: WILAYAH.teks(wil, { denganNegara: false }),
        kota: wil.l2, kodePos: wil.kodePos, patokan: wil.patokan
      };
      if (a) Object.assign(a, rec);
      else list.push(Object.assign({ id: U.uid('adr') }, rec));
      PEGAWAI.simpanAlamat(u.id, list);
      terapkan();
      UI.toast(a ? T('Alamat diperbarui') : T('Alamat ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ TAB: REKENING */
  function tabRekening() {
    var u = segar();
    var list = PEGAWAI.rekeningList(u);
    var ket = T(u.role === 'client'
      ? 'Dipakai bila ada pengembalian dana atau kelebihan bayar.'
      : T('Dipakai untuk pembayaran gaji dan penggantian biaya lapangan.'));

    return UI.card({
      title: T('Rekening Bank'), sub: ket,
      tools: '<button class="btn btn--sm" data-act="rek-baru">＋ ' + T('Tambah Rekening') + '</button>',
      flush: true,
      body: '<div style="padding:14px 18px">' +
        UI.alert('info', T('Nomor rekening hanya terlihat oleh Anda dan bagian keuangan EXOCLEAN. ' +
          'Kami tidak pernah meminta PIN, kata sandi m-banking, atau kode OTP lewat WhatsApp maupun telepon.'), '🔒') +
        '<div class="mt-3">' + (list.length
          ? list.map(function (r) {
              return '<div class="rek' + (r.utama ? ' utama' : '') + '">' +
                '<div class="rek__bank">' + U.esc(r.bank) + '</div>' +
                '<div style="min-width:0;flex:1">' +
                  '<div class="rek__no">' + U.esc(r.nomor) + '</div>' +
                  '<div class="rek__an">a.n. ' + U.esc(r.atasNama) + '</div>' +
                '</div>' +
                (r.utama ? '<span class="chip chip--brand" style="font-size:10px">' + T('Utama') + '</span>' : '') +
                '<div class="row" style="gap:5px">' +
                  (r.utama ? '' : '<button class="btn btn--ghost btn--sm" data-act="rek-utama" data-id="' +
                    r.id + '">' + T('Jadikan utama') + '</button>') +
                  '<button class="btn btn--ghost btn--sm" data-act="rek-ubah" data-id="' + r.id + '">' +
                    T('Ubah') + '</button>' +
                  '<button class="btn btn--ghost btn--sm" data-act="rek-hapus" data-id="' + r.id + '">🗑</button>' +
                '</div></div>';
            }).join('')
          : '<div class="tbl-sub">' + T('Belum ada rekening tersimpan') + '.</div>') + '</div>' +
        '</div>'
    });
  }

  function dialogRekening(id) {
    var u = segar();
    var list = PEGAWAI.rekeningList(u).slice();
    var r = id ? list.filter(function (x) { return x.id === id; })[0] : null;

    UI.formModal({
      title: r ? T('Ubah') + ' rekening' : T('Tambah Rekening'), okText: T('Simpan'),
      fields: [
        { name: 'bank', label: T('Nama bank'), type: 'select', value: r ? r.bank : 'BCA',
          options: ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Permata', 'Danamon',
                    'BSI', 'BTN', 'Jago', 'SeaBank', 'Lainnya'] },
        { name: 'nomor', label: T('Nomor rekening'), value: r ? r.nomor : '', required: true },
        { name: 'atasNama', label: T('Atas nama'), value: r ? r.atasNama : (u.perusahaan || u.nama),
          required: true, hint: T('Harus sama persis dengan yang tercetak di buku tabungan.') },
        { name: 'utama', label: T('Jadikan rekening utama'), type: 'checkbox',
          value: r ? r.utama : list.length === 0 }
      ],
      validate: function (d) {
        if (!/^[0-9]{6,20}$/.test(String(d.nomor).replace(/[\s-]/g, '')))
          return T('Nomor rekening hanya boleh angka, 6–20 digit');
        return null;
      }
    }).then(function (d) {
      if (!d) return;
      d.nomor = String(d.nomor).replace(/[\s-]/g, '');
      if (d.utama) list.forEach(function (x) { x.utama = false; });
      if (r) Object.assign(r, d);
      else list.push(Object.assign({ id: U.uid('rek') }, d));
      PEGAWAI.simpanRekening(u.id, list);
      terapkan();
      UI.toast(r ? 'Rekening diperbarui' : 'Rekening ditambahkan', 'ok');
      APP.refresh();
    });
  }

  /* ================================================================ TAB: BERKAS KEPEGAWAIAN */
  var bukaNomor = false;   /* nomor identitas disamarkan sampai ditekan "Lihat" */

  function tabBerkas() {
    var u = segar();
    var idn = PEGAWAI.identitas(u), kd = PEGAWAI.kontakDarurat(u), at = PEGAWAI.alamatTinggal(u);
    var lengkap = PEGAWAI.kelengkapanBerkas(u);
    var jn = PEGAWAI.jenisId(idn.jenis);
    var st = PEGAWAI.statusBerlakuId(idn);

    return kartuKelengkapan(lengkap) +
      kartuIdentitasResmi(u, idn, jn, st) +
      kartuKontakDarurat(kd) +
      kartuAlamatTinggal(at);
  }

  function kartuKelengkapan(l) {
    if (l.pct === 100) {
      return UI.alert('ok', '<b>' + T('Berkas Anda sudah lengkap.') + '</b> ' +
        T('Terima kasih — data ini dipakai untuk asuransi kerja dan penanganan keadaan darurat.'), '✅') +
        '<div class="mb-3"></div>';
    }
    return UI.card({ cls: 'mb-3', title: T('Kelengkapan Berkas'),
      sub: l.lengkap + ' ' + T('dari') + ' ' + l.total + ' ' + T('bagian terisi'),
      body: UI.progress(l.pct, l.pct >= 80 ? 'ok' : l.pct >= 40 ? 'warn' : '') +
        '<div class="tbl-sub mt-2">' + T('Belum terisi') + ': <b>' +
        l.kurang.map(function (p) { return U.esc(T(p.label)); }).join(', ') + '</b></div>' +
        UI.alert('warn', T('Berkas yang lengkap diperlukan untuk klaim asuransi kerja dan agar tim dapat ' +
          'menghubungi keluarga Anda bila terjadi keadaan darurat di lapangan.'), '🦺') });
  }

  function kartuIdentitasResmi(u, idn, jn, st) {
    var chipBerlaku =
      st === 'seumur_hidup' ? '<span class="chip chip--ok">' + T('Berlaku seumur hidup') + '</span>'
      : st === 'aman' ? '<span class="chip chip--ok">' + T('Berlaku sampai') + ' ' + U.tgl(idn.berlakuHingga) + '</span>'
      : st === 'segera' ? '<span class="chip chip--warn chip--dot">' + T('Segera kedaluwarsa') + ' — ' +
          U.relatif(idn.berlakuHingga).toLowerCase() + '</span>'
      : st === 'kedaluwarsa' ? '<span class="chip chip--danger chip--dot">' + T('Sudah kedaluwarsa') + ' ' +
          U.tgl(idn.berlakuHingga) + '</span>'
      : '<span class="chip chip--muted">' + T('Belum diisi') + '</span>';

    var fotoDepan = idn.fotoDepan ? DB.getPhoto(idn.fotoDepan) : null;
    var fotoSelfie = idn.fotoSelfie ? DB.getPhoto(idn.fotoSelfie) : null;

    return UI.card({ cls: 'mb-3', title: T('Identitas Resmi'),
      sub: T('Kartu identitas yang masih berlaku'),
      tools: idn.diverifikasi
        ? '<span class="chip chip--ok">✓ ' + T('Terverifikasi admin') + '</span>'
        : '<span class="chip chip--warn">' + T('Menunggu verifikasi') + '</span>',
      body:
        '<div class="row wrap mb-3" style="gap:8px">' +
          '<span class="chip chip--brand">' + U.esc(jn.nama) + '</span>' + chipBerlaku +
        '</div>' +

        '<div class="idcard">' +
          '<div class="idcard__no">' +
            '<div class="tbl-sub">' + T('Nomor') + ' ' + U.esc(jn.nama) + '</div>' +
            '<b>' + U.esc(idn.nomor ? (bukaNomor ? idn.nomor : PEGAWAI.samarkanNomorId(idn.nomor)) : '—') + '</b>' +
          '</div>' +
          (idn.nomor ? '<button class="btn btn--ghost btn--sm" data-act="toggle-nomor">' +
            (bukaNomor ? '🙈 ' + T('Sembunyikan') : '👁 ' + T('Lihat')) + '</button>' : '') +
        '</div>' +

        '<dl class="kv mt-3">' +
          '<dt>' + T('Nama sesuai kartu') + '</dt><dd>' +
            (idn.namaSesuaiKartu ? U.esc(idn.namaSesuaiKartu) : '<span class="tbl-sub">—</span>') + '</dd>' +
          '<dt>' + T('Tanggal lahir') + '</dt><dd>' +
            (idn.tanggalLahir ? U.tglPanjang(idn.tanggalLahir) + ' <span class="tbl-sub">(' +
              umur(idn.tanggalLahir) + ' ' + T('tahun') + ')</span>' : '<span class="tbl-sub">—</span>') + '</dd>' +
          '<dt>' + T('Alamat sesuai kartu') + '</dt><dd>' +
            (idn.alamatKtp ? U.esc(idn.alamatKtp) : '<span class="tbl-sub">—</span>') + '</dd>' +
        '</dl>' +

        Panel.seksi(T('Foto Kartu Identitas'),
          UI.alert('warn', '<b>' + T('Catatan prototipe.') + '</b> ' +
            T('Foto identitas di sini masih tersimpan di browser Anda sendiri. Untuk dipakai sungguhan, ' +
              'berkas seperti ini wajib disimpan di penyimpanan terenkripsi dengan kontrol akses dan ' +
              'jejak audit — bukan di perangkat.'), '🔐') +
          '<div class="grid g-2 mt-3">' +
            kotakFotoId(T('Foto kartu (tampak depan)'), fotoDepan, 'depan',
              T('Pastikan seluruh kartu terlihat, tidak silau, dan tulisannya terbaca.')) +
            kotakFotoId(T('Swafoto memegang kartu'), fotoSelfie, 'selfie',
              T('Wajah dan kartu terlihat jelas dalam satu bingkai.')) +
          '</div>'),
      foot: '<div class="spacer"></div>' +
        '<button class="btn" data-act="ubah-identitas">' + T('Ubah Data Identitas') + '</button>' });
  }

  function kotakFotoId(judul, src, jenis, ket) {
    return '<div>' +
      '<div class="tbl-sub mb-1">' + U.esc(judul) + '</div>' +
      (src
        ? '<div class="idfoto"><img src="' + src + '" data-act="zoom-id" data-j="' + jenis + '" alt="">' +
          '<div class="idfoto__aksi">' +
            '<button class="btn btn--ghost btn--sm" data-act="ganti-foto-id" data-j="' + jenis + '">' +
              T('Ganti') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="hapus-foto-id" data-j="' + jenis + '">🗑</button>' +
          '</div></div>'
        : '<label class="idfoto idfoto--kosong"><span class="ic">🆔</span>' +
          '<b>' + T('Unggah foto') + '</b><small>' + U.esc(ket) + '</small>' +
          '<input type="file" accept="image/*" capture="environment" hidden ' +
          'data-change="unggah-foto-id" data-j="' + jenis + '"></label>') +
      '<input type="file" accept="image/*" hidden id="inp-id-' + jenis + '" ' +
        'data-change="unggah-foto-id" data-j="' + jenis + '">' +
      '</div>';
  }

  function umur(tgl) {
    var l = U.d(tgl), k = new Date();
    var n = k.getFullYear() - l.getFullYear();
    var m = k.getMonth() - l.getMonth();
    if (m < 0 || (m === 0 && k.getDate() < l.getDate())) n--;
    return n;
  }

  function kartuKontakDarurat(kd) {
    return UI.card({ cls: 'mb-3', title: T('Kontak Darurat'),
      sub: T('Orang terdekat yang bisa kami hubungi bila terjadi sesuatu di lapangan'),
      tools: '<button class="btn btn--sm" data-act="kd-baru">＋ ' + T('Tambah Kontak') + '</button>',
      flush: true,
      body: kd.length
        ? '<div style="padding:14px 18px">' + kd.map(function (k) {
            return '<div class="adr' + (k.utama ? ' utama' : '') + '">' +
              '<div class="row" style="gap:10px;align-items:flex-start">' +
                UI.avatar(k.nama, 'sm') +
                '<div style="min-width:0;flex:1">' +
                  '<div class="row" style="gap:7px"><b>' + U.esc(k.nama) + '</b>' +
                    '<span class="chip chip--muted" style="font-size:10px">' + U.esc(T(k.hubungan)) + '</span>' +
                    (k.utama ? '<span class="chip chip--brand" style="font-size:10px">' +
                      T('Kontak utama') + '</span>' : '') +
                  '</div>' +
                  '<div class="adr__nama">' + U.phoneDisplay(k.telp) + '</div>' +
                  (k.alamat ? '<div class="adr__teks">' + U.esc(k.alamat) + '</div>' : '') +
                '</div>' +
                '<div class="col" style="gap:5px">' +
                  '<div class="row" style="gap:5px">' +
                    '<button class="btn btn--wa btn--sm" data-act="kd-wa" data-id="' + k.id + '">💬</button>' +
                    '<button class="btn btn--ghost btn--sm" data-act="kd-ubah" data-id="' + k.id + '">' +
                      T('Ubah') + '</button>' +
                    '<button class="btn btn--ghost btn--sm" data-act="kd-hapus" data-id="' + k.id + '">🗑</button>' +
                  '</div>' +
                  (k.utama ? '' : '<button class="btn btn--ghost btn--sm" data-act="kd-utama" data-id="' +
                    k.id + '">' + T('Jadikan utama') + '</button>') +
                '</div>' +
              '</div></div>';
          }).join('') + '</div>'
        : UI.empty('🆘', T('Belum ada kontak darurat'),
            T('Isi minimal satu orang terdekat. Ini yang pertama kami hubungi bila terjadi kecelakaan kerja.'))
    });
  }

  function kartuAlamatTinggal(at) {
    var terisi = !!at.alamat;
    return UI.card({ cls: 'mb-3', title: T('Alamat Tinggal Sekarang'),
      sub: T('Tempat tinggal saat ini — boleh berbeda dengan alamat di kartu identitas'),
      body: terisi
        ? '<div class="row wrap mb-2" style="gap:7px">' +
            '<span class="chip chip--brand">' + U.esc(T(at.status)) + '</span>' +
            (at.samaDenganKtp ? '<span class="chip chip--muted">' + T('Sama dengan alamat kartu') + '</span>' : '') +
            (at.sejak ? '<span class="chip chip--muted">' + T('Sejak') + ' ' + U.tgl(at.sejak) + '</span>' : '') +
          '</div>' +
          '<div class="adr__teks" style="font-size:13.4px">' + U.esc(PEGAWAI.alamatTinggalTeks(at)) + '</div>' +
          (at.patokan ? '<div class="adr__patokan">📍 ' + U.esc(at.patokan) + '</div>' : '')
        : UI.empty('🏠', T('Alamat tinggal belum diisi'),
            T('Dipakai untuk penugasan terdekat dan penjemputan tim saat pekerjaan dini hari.')),
      foot: '<div class="spacer"></div><button class="btn" data-act="ubah-domisili">' +
        (terisi ? T('Ubah Alamat Tinggal') : T('Isi Alamat Tinggal')) + '</button>' });
  }

  /* ---------------------------------------------------------------- dialog berkas */
  function dialogIdentitas() {
    var u = segar(), idn = PEGAWAI.identitas(u);
    UI.formModal({
      title: T('Data Identitas Resmi'), size: 'wide', okText: T('Simpan'),
      intro: UI.alert('info', T('Isi sesuai yang tertulis di kartu. Data ini dipakai untuk kontrak kerja, ' +
        'asuransi, dan syarat masuk area klien tertentu.'), 'ℹ️') + '<div class="mb-3"></div>',
      fields: [
        { name: 'jenis', label: T('Jenis kartu identitas'), type: 'select', value: idn.jenis,
          options: PEGAWAI.JENIS_ID.map(function (j) { return { value: j.id, label: j.nama + ' — ' + j.ket }; }) },
        { name: 'nomor', label: T('Nomor identitas'), value: idn.nomor, required: true,
          hint: T('KTP 16 digit • SIM 12–16 digit • Paspor 1 huruf + 6–8 angka') },
        { name: 'namaSesuaiKartu', label: T('Nama sesuai kartu'), value: idn.namaSesuaiKartu || u.nama,
          required: true, hint: T('Tulis persis seperti tercetak, termasuk gelar bila ada.') },
        { name: 'tanggalLahir', label: T('Tanggal lahir'), type: 'date', value: idn.tanggalLahir },
        { name: 'berlakuHingga', label: T('Berlaku sampai'), type: 'date', value: idn.berlakuHingga,
          hint: T('Kosongkan bila KTP seumur hidup.') },
        { name: 'alamatKtp', label: T('Alamat sesuai kartu'), type: 'textarea', rows: 2, value: idn.alamatKtp }
      ],
      validate: function (d) { return PEGAWAI.periksaNomorId(d.jenis, d.nomor); }
    }).then(function (d) {
      if (!d) return;
      d.nomor = String(d.nomor).replace(/[\s-]/g, '').toUpperCase();
      /* data identitas berubah → verifikasi admin diulang */
      d.diverifikasi = false; d.diverifikasiOleh = null; d.diverifikasiAt = null;
      PEGAWAI.simpanIdentitas(u.id, d);
      terapkan();
      UI.toast(T('Data identitas tersimpan — menunggu verifikasi admin'), 'ok');
      APP.refresh();
    });
  }

  function dialogKontakDarurat(id) {
    var u = segar(), list = PEGAWAI.kontakDarurat(u).slice();
    var k = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    UI.formModal({
      title: k ? T('Ubah kontak darurat') : T('Tambah Kontak'), okText: T('Simpan'),
      fields: [
        { name: 'nama', label: T('Nama lengkap'), value: k ? k.nama : '', required: true },
        { name: 'hubungan', label: T('Hubungan dengan Anda'), type: 'select',
          value: k ? k.hubungan : 'Istri', options: PEGAWAI.HUBUNGAN },
        { name: 'telp', label: T('Nomor telepon / WhatsApp'), value: k ? k.telp : '', required: true,
          placeholder: '08xxxxxxxxxx' },
        { name: 'alamat', label: T('Alamat (opsional)'), type: 'textarea', rows: 2, value: k ? k.alamat : '' },
        { name: 'utama', label: T('Jadikan kontak utama'), type: 'checkbox',
          value: k ? k.utama : list.length === 0 }
      ],
      validate: function (d) {
        return /^[0-9+\-\s]{8,18}$/.test(String(d.telp)) ? null : T('Nomor telepon tidak valid');
      }
    }).then(function (d) {
      if (!d) return;
      if (d.utama) list.forEach(function (x) { x.utama = false; });
      if (k) Object.assign(k, d); else list.push(Object.assign({ id: U.uid('kd') }, d));
      PEGAWAI.simpanKontakDarurat(u.id, list);
      terapkan();
      UI.toast(k ? T('Kontak darurat diperbarui') : T('Kontak darurat ditambahkan'), 'ok');
      APP.refresh();
    });
  }

  function dialogDomisili() {
    var u = segar(), at = PEGAWAI.alamatTinggal(u), idn = PEGAWAI.identitas(u);
    /* Kolom lama dipetakan LANGSUNG ke lapisan wilayah, tidak digabung dulu
       menjadi satu baris lalu diurai ulang: provinsi, kota, kecamatan, dan
       kelurahan sudah tersimpan terpisah, dan menebaknya kembali dari teks
       hanya membuang data yang sudah benar. */
    var w = WILAYAH.terstruktur(at.wilayah) ? at.wilayah
      : Object.assign(WILAYAH.kosong('ID'), {
          l1: at.provinsi || '', l2: at.kota || '',
          l3: at.kecamatan || '', l4: at.kelurahan || '',
          kodePos: at.kodePos || '', jalan: at.alamat || '',
          patokan: at.patokan || ''
        });
    UI.formModal({
      title: T('Alamat Tinggal Sekarang'), size: 'wide', okText: T('Simpan'),
      fields: [
        { name: 'samaDenganKtp', label: T('Sama dengan alamat di kartu identitas'), type: 'checkbox',
          value: at.samaDenganKtp,
          hint: idn.alamatKtp ? T('Alamat kartu') + ': ' + idn.alamatKtp : T('Alamat kartu belum diisi.') }
      ].concat(WILAYAH.fields(w)).concat([
        /* RT/RW tidak ikut lapisan WILAYAH karena tidak punya padanan di luar
           Indonesia - memaksakannya ke l3/l4 akan merusak alamat negara lain. */
        { name: 'rt', label: 'RT', value: at.rt, placeholder: '004' },
        { name: 'rw', label: 'RW', value: at.rw, placeholder: '007' },
        { name: 'status', label: T('Status tempat tinggal'), type: 'select', value: at.status,
          options: PEGAWAI.STATUS_TINGGAL },
        { name: 'sejak', label: T('Tinggal sejak'), type: 'date', value: at.sejak }
      ]),
      validate: function (d) { return WILAYAH.periksa(WILAYAH.dariForm(d)); },
      onMount: function (root) { WILAYAH.pasang(root); }
    }).then(function (d) {
      if (!d) return;
      var wil = WILAYAH.dariForm(d);
      /* Kolom lama tetap ditulis supaya laporan, ekspor, dan tampilan yang
         belum diperbarui tidak mendadak kosong. */
      PEGAWAI.simpanAlamatTinggal(u.id, {
        samaDenganKtp: d.samaDenganKtp, rt: d.rt, rw: d.rw,
        status: d.status, sejak: d.sejak, wilayah: wil,
        alamat: wil.jalan, kelurahan: wil.l4, kecamatan: wil.l3,
        kota: wil.l2, provinsi: wil.l1, kodePos: wil.kodePos, patokan: wil.patokan
      });
      terapkan();
      UI.toast(T('Alamat tinggal tersimpan'), 'ok');
      APP.refresh();
    });
  }

  /* ========================================================= TAB: DATA KEPEGAWAIAN
     Seluruh tab ini READ-ONLY bagi pemiliknya. Tombol ubah hanya muncul
     untuk admin — dan penolakannya juga ada di PEGAWAI.simpanKepegawaian(),
     bukan hanya di sini, supaya tidak bisa dilewati lewat konsol. */

  var bukaNomorPeg = false;   /* nomor jaminan sosial disamarkan sampai ditekan */

  function tabKepegawaian() {
    var u = segar();
    var k = PEGAWAI.kepegawaian(u);
    var adminEdit = APP.user && APP.user.role === 'admin';
    var st = PEGAWAI.STATUS_KERJA[k.statusKerja] || { t: k.statusKerja, c: 'muted', ket: '' };
    var mk = PEGAWAI.masaKerja(u);
    var kon = PEGAWAI.kontrak(u);
    var atasan = PEGAWAI.atasan(u);
    var tim = PEGAWAI.timPegawai(u);
    var lengkap = PEGAWAI.kelengkapanKepegawaian(u);

    return kartuKontrak(kon) +
      kartuStatusKerja(u, k, st, mk, adminEdit) +
      kartuPenempatan(k, tim, atasan) +
      kartuJaminan(u, k, adminEdit) +
      kartuKelengkapanPeg(lengkap, adminEdit);
  }

  /** Peringatan kontrak — paling atas karena paling mendesak. */
  function kartuKontrak(kon) {
    if (!kon || kon.keadaan === 'aman') return '';
    var lewat = kon.keadaan === 'lewat';
    return UI.alert(lewat ? 'danger' : 'warn',
      '<b>' + (lewat ? T('Kontrak kerja sudah berakhir') : T('Kontrak kerja segera berakhir')) + '</b> — ' +
      (lewat
        ? T('berakhir') + ' ' + U.tgl(kon.selesai) + ' (' + Math.abs(kon.sisaHari) + ' ' + T('hari lalu') + '). ' +
          T('Hubungi admin untuk perpanjangan atau pengakhiran resmi.')
        : T('berakhir') + ' ' + U.tgl(kon.selesai) + ' — ' + T('tinggal') + ' ' + kon.sisaHari + ' ' + T('hari lagi') + '.'),
      lewat ? '⛔' : '⏰') + '<div class="mb-3"></div>';
  }

  function kartuStatusKerja(u, k, st, mk, adminEdit) {
    return UI.card({ cls: 'mb-3', title: T('Status Kerja'),
      sub: T('Ditetapkan perusahaan — tidak dapat diubah sendiri'),
      body:
        '<div class="row wrap mb-3" style="gap:8px">' +
          '<span class="chip chip--' + st.c + '">' + U.esc(T(st.t)) + '</span>' +
          (mk ? '<span class="chip chip--muted">' + T('Masa kerja') + ' ' + U.esc(teksMasaKerja(mk)) + '</span>' : '') +
        '</div>' +
        (st.ket ? '<div class="tbl-sub mb-3">' + U.esc(T(st.ket)) + '</div>' : '') +
        '<dl class="kv">' +
          '<dt>' + T('Nomor pegawai') + '</dt><dd>' +
            (k.nomorPegawai ? '<span class="code">' + U.esc(k.nomorPegawai) + '</span>' : kosong()) + '</dd>' +
          '<dt>' + T('Jabatan') + '</dt><dd>' + U.esc(u.jabatan || '—') + '</dd>' +
          '<dt>' + T('Tanggal masuk') + '</dt><dd>' +
            (k.tglMasuk ? U.tglPanjang(k.tglMasuk) : kosong()) + '</dd>' +
          (k.statusKerja === 'kontrak'
            ? '<dt>' + T('Masa kontrak') + '</dt><dd>' +
              (k.kontrakMulai ? U.tgl(k.kontrakMulai) : '—') + ' – ' +
              (k.kontrakSelesai ? U.tgl(k.kontrakSelesai) : '—') + '</dd>'
            : '') +
          (k.tglBerhenti
            ? '<dt>' + T('Tanggal berhenti') + '</dt><dd>' + U.tglPanjang(k.tglBerhenti) +
              (k.alasanBerhenti ? '<div class="tbl-sub">' + U.esc(k.alasanBerhenti) + '</div>' : '') + '</dd>'
            : '') +
        '</dl>' +
        (k.catatan ? '<div class="tbl-sub mt-2">' + U.esc(k.catatan) + '</div>' : ''),
      foot: adminEdit
        ? '<div class="spacer"></div><button class="btn" data-act="ubah-kepegawaian">' +
          T('Ubah Data Kepegawaian') + '</button>'
        : '<div class="tbl-sub">' + T('Ada yang keliru? Hubungi admin — data ini hanya bisa diubah oleh mereka.') + '</div>' });
  }

  function kartuPenempatan(k, tim, atasan) {
    return UI.card({ cls: 'mb-3', title: T('Penempatan'),
      body: '<dl class="kv">' +
        '<dt>' + T('Lokasi / wilayah') + '</dt><dd>' + (k.penempatan ? U.esc(k.penempatan) : kosong()) + '</dd>' +
        '<dt>' + T('Tim') + '</dt><dd>' + (tim ? U.esc(tim.nama) : kosong()) + '</dd>' +
        '<dt>' + T('Atasan langsung') + '</dt><dd>' +
          (atasan ? U.esc(atasan.nama) + '<div class="tbl-sub">' + U.esc(atasan.jabatan || '') + '</div>' : kosong()) +
        '</dd></dl>' });
  }

  /**
   * Nomor jaminan sosial & NPWP disamarkan seperti nomor KTP.
   * Angka-angka ini cukup untuk membuka layanan atas nama orang lain, dan
   * layar profil sering terbuka di tempat yang bisa dilihat orang lain.
   */
  function kartuJaminan(u, k, adminEdit) {
    var boleh = PEGAWAI.bolehLihatBerkas(APP.user, u);
    function baris(label, nilai, ket) {
      if (!nilai) return '<dt>' + label + '</dt><dd>' + kosong() + '</dd>';
      var tampil = (boleh && bukaNomorPeg) ? nilai : PEGAWAI.samarkanNomorId(nilai);
      return '<dt>' + label + '</dt><dd><span class="code">' + U.esc(tampil) + '</span>' +
        (ket ? '<div class="tbl-sub">' + U.esc(ket) + '</div>' : '') + '</dd>';
    }
    var adaIsi = k.bpjsTk || k.bpjsKes || k.npwp;
    return UI.card({ cls: 'mb-3', title: T('Jaminan Sosial & Pajak'),
      sub: T('Nomor disamarkan demi keamanan'),
      tools: (adaIsi && boleh
        ? '<button class="btn btn--ghost btn--sm" data-act="toggle-nomor-peg">' +
          (bukaNomorPeg ? '🙈 ' + T('Sembunyikan') : '👁 ' + T('Lihat')) + '</button>'
        : ''),
      body: '<dl class="kv">' +
        baris(T('BPJS Ketenagakerjaan'), k.bpjsTk, '') +
        baris(T('BPJS Kesehatan'), k.bpjsKes, '') +
        baris(T('NPWP'), k.npwp, '') +
        '</dl>' +
        (!adaIsi
          ? UI.alert('info', T('Belum ada nomor yang tercatat. Untuk mitra lepas, pendaftaran ' +
              'jaminan sosial memang bukan kewajiban perusahaan.'), 'ℹ️')
          : '') });
  }

  function kartuKelengkapanPeg(l, adminEdit) {
    if (l.pct === 100) {
      return UI.alert('ok', '<b>' + T('Data kepegawaian sudah lengkap.') + '</b>', '✅');
    }
    return UI.card({ title: T('Kelengkapan Data'),
      sub: l.lengkap + ' / ' + l.total + ' ' + T('terisi'),
      body: UI.progress(l.pct, l.pct >= 80 ? 'ok' : l.pct >= 50 ? 'warn' : 'danger') +
        '<div class="mini-list mt-2" style="margin-left:-18px;margin-right:-18px">' +
        l.poin.map(function (p) {
          return '<div class="mini-item"><div style="min-width:0;flex:1">' +
            (p.ok ? '✅ ' : '⬜ ') + U.esc(T(p.label)) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="tbl-sub mt-2">' +
        (adminEdit
          ? T('Lengkapi lewat tombol Ubah Data Kepegawaian di atas.')
          : T('Kelengkapan ini tugas admin, bukan Anda — dipajang di sini supaya Anda tahu apa yang tercatat tentang diri Anda.')) +
        '</div>' });
  }

  /**
   * Masa kerja dirakit DI SINI, bukan di biz.js.
   *
   * Kata "tahun" dan "bulan" adalah teks antarmuka, dan lapisan bisnis tidak
   * boleh ikut menentukan bahasanya — kalau dirakit di sana, chip-nya akan
   * selamanya berbunyi "11 bulan" sekalipun seluruh layar sudah berbahasa
   * Inggris. biz.js cukup mengembalikan angkanya.
   */
  function teksMasaKerja(mk) {
    if (!mk) return '';
    /* Bentuk tunggal dan jamak dipilih kamus, bukan dirakit di sini.
       'mk.sisaBulan + T("bulan")' menghasilkan '1 months' untuk satu bulan —
       benar dalam Bahasa Indonesia yang tidak mengenal jamak, salah begitu
       diterjemahkan. */
    function jml(n, satu, banyak) {
      return n === 1 ? T(satu) : T(banyak).replace('{n}', U.num(n));
    }
    var bagian = [];
    if (mk.tahun) bagian.push(jml(mk.tahun, '1 tahun', '{n} tahun'));
    if (mk.sisaBulan) bagian.push(jml(mk.sisaBulan, '1 bulan', '{n} bulan'));
    return bagian.length ? bagian.join(' ') : T('kurang dari sebulan');
  }

  function kosong() { return '<span class="tbl-sub">' + T('belum diisi') + '</span>'; }

  /* Dialognya milik Panel (views/shared.js) supaya admin yang membukanya dari
     panel berkas dan pegawai yang membukanya dari sini memakai aturan
     validasi yang sama persis. */
  function dialogKepegawaian() {
    Panel.dialogKepegawaian(segar().id, terapkan);
  }

  /* ================================================================ TAB: KEAMANAN
     Kartu PIN, authenticator, perangkat, dan riwayat keamanan dirakit di
     views/keamanan.js supaya dialognya bisa dipakai ulang dari halaman lain
     (mis. gerbang PIN pada penarikan saldo). */
  function tabKeamanan() {
    var u = segar();
    return ViewKeamanan.panel() +
      '<div class="grid g-2 mt-3">' +
      UI.card({ title: T('Ubah Kata Sandi'), sub: T('Minimal 6 karakter'),
        body: UI.field({ name: 'lama', label: T('Kata sandi saat ini'), type: 'password', value: '' }) +
          UI.field({ name: 'baru', label: T('Kata sandi baru'), type: 'password', value: '' }) +
          UI.field({ name: 'ulang', label: T('Ulangi kata sandi baru'), type: 'password', value: '' }),
        foot: '<div class="spacer"></div><button class="btn" data-act="ganti-sandi">' +
          T('Ubah Kata Sandi') + '</button>' }) +

      UI.card({ title: T('Informasi Akun'),
        body: '<dl class="kv">' +
            '<dt>' + T('Email masuk') + '</dt><dd>' + U.esc(u.email) + '</dd>' +
            '<dt>' + T('Peran') + '</dt><dd>' + U.esc(T(LABEL_PERAN[u.role])) + '</dd>' +
            '<dt>' + T('Status akun') + '</dt><dd>' + (u.aktif
              ? '<span class="chip chip--ok">' + T('Aktif') + '</span>'
              : '<span class="chip chip--danger">' + T('Nonaktif') + '</span>') + '</dd>' +
            '<dt>' + T('Bergabung') + '</dt><dd>' + U.tglPanjang(u.createdAt) + '</dd>' +
            '<dt>' + T('Sandi diubah') + '</dt><dd>' + (u.sandiDiubahAt ? U.tglJam(u.sandiDiubahAt)
              : '<span class="tbl-sub">' + T('belum pernah') + '</span>') + '</dd>' +
            '<dt>' + T('Penyimpanan sandi') + '</dt><dd>' + (u.sandi
              ? '<span class="chip chip--ok chip--dot">PBKDF2 ' + T('ber-salt') + '</span>'
              : '<span class="chip chip--danger chip--dot">' + T('teks polos (akun contoh)') +
                '</span>') + '</dd>' +
          '</dl>' +
          (u.sandi
            ? UI.alert('info', T('Kata sandi akun ini tersimpan sebagai turunan PBKDF2 ber-salt, ' +
                'bukan teks asli.'), '🛡️')
            : UI.alert('warn', '<b>' + T('Catatan prototipe.') + '</b> ' +
                T('Akun contoh ini masih menyimpan sandi apa adanya. Begitu Anda menggantinya lewat ' +
                  'kotak di samping, akun ini otomatis naik ke bentuk ber-hash. Pada produksi, ' +
                  'seluruh pemeriksaan ini tetap harus pindah ke server — lihat README.'), '⚠️')) }) +
    '</div>';
  }

  /* ================================================================ TAB: PERAN AKUN
     Pilihan menjadi Mitra, Mitra Toko, Affiliate, atau Dropshipper sengaja
     ditaruh di sini — bukan di formulir pendaftaran. Orang mendaftar dulu,
     mencoba aplikasinya, baru memutuskan ingin menjadi apa. */
  function tabPeran() {
    var u = segar();
    var v = AKUN.statusVerifikasi(u);
    var af = AFILIASI.data(u), ds = DROPSHIP.data(u);

    function kartu(o) {
      return '<div class="card peran-akun' + (o.aktif ? ' peran-akun--on' : '') + '">' +
        '<div class="card__body">' +
          '<div class="row" style="gap:11px;align-items:flex-start">' +
            '<div class="fk-ic">' + o.ikon + '</div>' +
            '<div style="min-width:0;flex:1">' +
              '<div class="fk-nama">' + U.esc(o.judul) +
                (o.chip ? ' ' + o.chip : '') + '</div>' +
              '<div class="fk-ket">' + o.ket + '</div>' +
            '</div>' +
          '</div>' +
          (o.catatan ? '<div class="mt-2">' + o.catatan + '</div>' : '') +
          '<div class="row fk-kaki">' + (o.aksi || '') + '</div>' +
        '</div></div>';
    }

    var kartuList = [];

    /* --- Affiliate --- */
    kartuList.push(kartu({
      ikon: '🤝', judul: T('Affiliate'),
      chip: af ? AFILIASI.chip(af.status) : '',
      ket: T('Bagikan tautan produk & layanan, dapat komisi dari setiap orang yang Anda ajak.'),
      aktif: af && af.status === 'aktif',
      catatan: af && af.status === 'aktif'
        ? UI.alert('ok', T('Kode rujukan Anda') + ' <b>' + U.esc(af.kode) + '</b>', '🔗') : '',
      aksi: '<div class="spacer"></div>' + (af
        ? '<button class="btn btn--sm" data-act="ke-afiliasi">' + T('Buka Dasbor') + '</button>'
        : '<button class="btn btn--sm" data-act="ke-afiliasi">' + T('Pelajari & Daftar') +
          '</button>')
    }));

    /* --- Dropshipper --- */
    kartuList.push(kartu({
      ikon: '📦', judul: T('Dropshipper'),
      chip: ds ? DROPSHIP.chip(ds.status) : '',
      ket: T('Jual produk EXOCLEAN tanpa stok. Tentukan harga jual Anda sendiri.'),
      aktif: ds && ds.status === 'aktif',
      catatan: ds && ds.status === 'aktif'
        ? UI.alert('ok', T('Toko') + ' <b>' + U.esc(ds.namaToko) + '</b> ' + T('aktif'), '🏪') : '',
      aksi: '<div class="spacer"></div>' +
        '<button class="btn btn--sm" data-act="ke-afiliasi">' +
        (ds ? T('Buka Dasbor') : T('Pelajari & Daftar')) + '</button>'
    }));

    /* --- Mitra Lapangan --- */
    kartuList.push(kartu({
      ikon: '🧹', judul: T('Mitra Lapangan'),
      ket: T('Kerjakan pesanan cleaning service, cuci AC, taman, dan lainnya. Wajib mengikuti ' +
        'pelatihan dan sertifikasi kompetensi di aplikasi.'),
      aktif: false,
      catatan: UI.alert('info', T('Beralih menjadi Mitra mengubah tampilan aplikasi Anda menjadi ' +
        'aplikasi lapangan. Riwayat pesanan Anda sebagai klien tetap tersimpan.'), 'ℹ️'),
      aksi: '<div class="spacer"></div><button class="btn btn--sm" data-act="jadi-mitra">' +
        T('Ajukan Jadi Mitra') + '</button>'
    }));

    /* --- Mitra Toko --- */
    kartuList.push(kartu({
      ikon: '🏬', judul: T('Mitra Toko'),
      ket: T('Jual peralatan dan chemical kebersihan Anda sendiri di marketplace EXOCLEAN, ' +
        'dengan sistem bagi hasil.'),
      aktif: false,
      catatan: UI.alert('info', T('Beralih menjadi Mitra Toko mengubah tampilan aplikasi Anda ' +
        'menjadi ruang kerja penjual.'), 'ℹ️'),
      aksi: '<div class="spacer"></div><button class="btn btn--sm" data-act="jadi-seller">' +
        T('Ajukan Buka Toko') + '</button>'
    }));

    return (!v.email || !v.telp
      ? UI.alert('warn', '<b>' + T('Lengkapi verifikasi dulu.') + '</b> ' +
          T('Sebagian program memerlukan email dan nomor HP yang sudah terverifikasi.'), '⚠️') +
        '<div class="mb-3"></div>'
      : '') +
      '<div class="tbl-sub mb-3">' + T('Satu akun bisa menjalankan lebih dari satu peran. ' +
        'Affiliate dan Dropshipper berjalan berdampingan dengan akun klien Anda.') + '</div>' +
      '<div class="grid g-2">' + kartuList.join('') + '</div>';
  }

  /* ================================================================ TAB: PREFERENSI */
  /* ================================================== TAMPILAN & KENYAMANAN

     Staf menatap layar ini sepanjang giliran kerja — sebagian di lobi yang
     terang benderang, sebagian di ruang panel yang remang, sebagian sambil
     berjalan memegang ponsel. Satu setelan yang sama untuk semua keadaan itu
     bukan kenetralan, melainkan ketidakpedulian.

     Setiap pilihan LANGSUNG berlaku, tanpa tombol Simpan. Tema yang baru
     terlihat setelah menekan Simpan memaksa orang menebak; yang berubah
     seketika bisa dinilai dengan mata, dan itulah satu-satunya ukuran yang
     berarti di sini.
   */

  function ruas(kunci, nilai, pilihan) {
    return '<div class="tp-ruas">' + pilihan.map(function (p) {
      return '<button type="button" data-act="tp-set" data-k="' + kunci + '" ' +
        'data-v="' + U.esc(String(p.v)) + '"' +
        (String(p.v) === String(nilai) ? ' class="on"' : '') + '>' +
        (p.ikon ? p.ikon + ' ' : '') + U.esc(T(p.l)) + '</button>';
    }).join('') + '</div>';
  }

  function barisTp(judul, ket, kendali) {
    return '<div class="tp-baris">' +
      '<div class="tp-baris__t"><b>' + U.esc(T(judul)) + '</b>' +
        '<span>' + U.esc(T(ket)) + '</span></div>' + kendali +
    '</div>';
  }

  function kartuTampilan() {
    var t = TAMPILAN.baca();

    return UI.card({ title: T('Tampilan'),
      sub: T('Berlaku seketika, dan ikut ke perangkat lain saat Anda masuk'),
      body:
        barisTp('Tema', T('Ikut sistem mengikuti setelan terang/gelap perangkat Anda,') + ' ' +
            'termasuk pergantian otomatis saat senja.',
          ruas('tema', t.tema, [
            { v: 'terang', l: 'Terang', ikon: '☀️' },
            { v: 'gelap', l: 'Gelap', ikon: '🌙' },
            { v: 'sistem', l: 'Ikut sistem', ikon: '🖥️' }
          ])) +

        barisTp('Warna aksen', T('Mengubah warna tombol dan penanda. Tidak mengubah') + ' ' +
            T('warna status — merah tetap berarti terlambat.'),
          '<div class="tp-aksen">' + TAMPILAN.AKSEN.map(function (a) {
            return '<button type="button" class="tp-a' + (a.warna ? '' : ' tp-a--app') +
              (a.kode === t.aksen ? ' on' : '') + '" ' +
              'data-act="tp-set" data-k="aksen" data-v="' + a.kode + '">' +
              '<i' + (a.warna ? ' style="background:' + a.warna + '"' : '') + '></i>' +
              '<span>' + U.esc(T(a.nama)) + '</span></button>';
          }).join('') + '</div>') +

        barisTp('Ukuran tampilan', T('Membesarkan SELURUH tampilan — huruf, ikon, dan') + ' ' +
            T('jaraknya sekaligus — bukan hanya hurufnya.'),
          ruas('teks', t.teks, [
            { v: 90, l: 'Kecil' }, { v: 100, l: 'Normal' },
            { v: 110, l: 'Besar' }, { v: 125, l: 'Sangat besar' }
          ])) +

        barisTp('Kepadatan', T('Rapat memuat lebih banyak baris di satu layar; lega') + ' ' +
            T('memberi sasaran sentuh yang lebih besar untuk jari.'),
          ruas('padat', t.padat, [
            { v: 'rapat', l: 'Rapat' }, { v: 'normal', l: 'Normal' }, { v: 'lega', l: 'Lega' }
          ])) +

        barisTp('Gerak', T('Mengurangi gerak menolkan seluruh peralihan dan animasi.') + ' ' +
            T('Bila perangkat Anda sudah memintanya, aplikasi menurutinya walau') + ' ' +
            T('di sini tertulis penuh.'),
          ruas('gerak', t.gerak, [
            { v: 'penuh', l: 'Halus' }, { v: 'kurang', l: 'Kurangi gerak' }
          ])) +

        barisTp('Pertegas kontras', T('Menebalkan garis dan menggelapkan teks kecil.') + ' ' +
            'Menolong keluhan “tulisannya samar” tanpa mengubah warna komponen.',
          '<button type="button" class="sw' + (t.kontras ? ' sw--on' : '') + '" ' +
            'role="switch" aria-checked="' + !!t.kontras + '" data-act="tp-set" ' +
            'data-k="kontras" data-v="' + (t.kontras ? '' : '1') + '"><i></i></button>') +

        /* Pratinjau memakai token yang sama dengan aplikasi sungguhan, jadi
           yang terlihat di sini memang yang akan terlihat di seluruh layar. */
        '<div class="tp-pratinjau">' +
          '<div class="tp-pratinjau__k">' +
            '<b>' + T('Contoh tampilan') + '</b>' +
            '<div class="tbl-sub">' + T('Beginilah kartu, tombol, dan penanda status ' +
              'akan terlihat.') + '</div>' +
            '<div class="tp-pratinjau__b">' +
              '<span class="btn btn--primary btn--sm">' + T('Tombol utama') + '</span>' +
              '<span class="btn btn--ghost btn--sm">' + T('Tombol biasa') + '</span>' +
              '<span class="chip chip--ok">' + T('Selesai') + '</span>' +
              '<span class="chip chip--danger">' + T('Terlambat') + '</span>' +
              '<span class="chip chip--muted">' + T('Dijeda') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' });
  }

  /**
   * Pemberitahuan peramban.
   *
   * Izinnya dipegang PERAMBAN, bukan aplikasi ini — dan sekali ditolak, ia
   * tidak bisa diminta ulang lewat kode. Karena itu keadaannya disebut apa
   * adanya beserta jalan keluarnya, bukan disembunyikan di balik tombol yang
   * diam-diam tidak melakukan apa pun.
   */
  function kartuNotifBrowser() {
    var t = TAMPILAN.baca();
    var izin = window.NOTIF ? NOTIF.izin() : 'tidak-didukung';

    var keadaan = {
      'granted':        { ikon: '🔔', judul: T('Peramban mengizinkan pemberitahuan'),
        ket: T('Kabar mendesak — aduan penghuni baru, tugas yang lewat waktunya —') + ' ' +
             T('muncul walau tab ini sedang tidak dilihat.') },
      'denied':         { ikon: '🚫', judul: T('Peramban memblokir pemberitahuan'),
        ket: T('Izinnya dipegang peramban dan tidak bisa diminta ulang dari sini.') + ' ' +
             T('Buka ikon gembok di bilah alamat, lalu izinkan Notifikasi untuk situs ini.') },
      'default':        { ikon: '🔕', judul: T('Pemberitahuan belum dinyalakan'),
        ket: T('Peramban akan bertanya sekali. Bila Anda menolak, izinnya hanya') + ' ' +
             T('bisa dikembalikan lewat setelan peramban — bukan dari sini.') },
      'tidak-didukung': { ikon: '🖥️', judul: T('Peramban ini tidak mendukung pemberitahuan'),
        ket: T('Kabar tetap muncul di dalam aplikasi selama tab ini terbuka.') }
    }[izin] || { ikon: '🔕', judul: T('Pemberitahuan belum dinyalakan'), ket: '' };

    return UI.card({ title: T('Pemberitahuan peramban'),
      sub: T('Kabar yang muncul di luar aplikasi'),
      body:
        '<div class="tp-izin">' +
          '<div class="tp-izin__i">' + keadaan.ikon + '</div>' +
          '<div class="tp-izin__t"><b>' + U.esc(T(keadaan.judul)) + '</b>' +
            U.esc(T(keadaan.ket)) + '</div>' +
          (izin === 'default'
            ? '<button class="btn btn--sm" data-act="tp-izin">' + T('Nyalakan') + '</button>'
            : '') +
        '</div>' +

        (izin === 'granted'
          ? '<label class="check" style="padding:11px 0 2px">' +
              '<input type="checkbox" data-change="tp-notif"' +
              (t.notifBrowser ? ' checked' : '') + '>' +
              '<span><b>' + T('Kirim pemberitahuan ke perangkat ini') + '</b>' +
              '<div class="tbl-sub">' + T('Bisa dimatikan kapan saja tanpa mencabut ' +
                'izin peramban.') + '</div></span></label>'
          : '') +

        '<div class="tbl-sub mt-2">' +
          T('Pemberitahuan hanya terkirim selama aplikasi ini pernah dibuka di ' +
            'perangkat tersebut. Untuk kabar yang harus sampai walau aplikasi ' +
            'tidak pernah dibuka, WhatsApp tetap jalurnya.') +
        '</div>' });
  }

  function tabPreferensi() {
    var u = segar();
    var pref = AKUN.preferensi(u);

    return kartuTampilan() + '<div class="mb-3"></div>' +
      '<div class="grid g-2">' +
      kartuNotifBrowser() +
      UI.card({ title: T('Bahasa'), sub: I18N.BAHASA.length + ' ' + T('bahasa tersedia'), flush: true,
        body: '<div class="lang-cari"><input class="input" id="cari-bahasa" type="search" ' +
            'placeholder="' + T('Search language…') + '" autocomplete="off"></div>' +
          '<div id="lang-list" style="padding:4px 0 8px">' + daftarBahasa(pref.bahasa) + '</div>' +
          '<div style="padding:0 18px 16px">' +
          UI.alert('info', T('Angka persen menunjukkan berapa banyak antarmuka yang sudah ' +
            'punya padanan dalam bahasa itu. Bagian yang belum diterjemahkan tampil dalam ' +
            'Bahasa Inggris, bukan kosong. Nama layanan, nama produk, dan isi dokumen tetap ' +
            'apa adanya karena itu data, bukan antarmuka.'), '🌐') +
          '</div>' }) +

      UI.card({ title: T('Notifikasi'), sub: T('Pilih kabar apa saja yang ingin Anda terima'),
        body: '<label class="check" style="padding:9px 0"><input type="checkbox" data-change="pref" ' +
            'data-k="notifWA"' + (pref.notifWA ? ' checked' : '') + '>' +
            '<span><b>' + T('Terima notifikasi WhatsApp') + '</b>' +
            '<div class="tbl-sub">' + T('Jadwal, pengingat, tagihan, dan hasil pekerjaan.') + '</div></span></label>' +
          '<label class="check" style="padding:9px 0;border-top:1px solid var(--line-2)">' +
            '<input type="checkbox" data-change="pref" data-k="notifEmail"' +
            (pref.notifEmail ? ' checked' : '') + '>' +
            '<span><b>' + T('Terima notifikasi email') + '</b>' +
            '<div class="tbl-sub">' + T('Salinan invoice dan dokumen penawaran.') + '</div></span></label>' +
          '<label class="check" style="padding:9px 0;border-top:1px solid var(--line-2)">' +
            '<input type="checkbox" data-change="pref" data-k="ringkasanMingguan"' +
            (pref.ringkasanMingguan ? ' checked' : '') + '>' +
            '<span><b>' + T('Ringkasan mingguan') + '</b>' +
            '<div class="tbl-sub">' + T(u.role === 'client'
              ? 'Rekap pekerjaan dan tagihan setiap Senin pagi.'
              : T('Rekap tugas, absensi, dan nilai QC setiap Senin pagi.')) + '</div></span></label>' +
          '<div class="tbl-sub mt-2">' + T('Perubahan tersimpan otomatis.') + '</div>' }) +
    '</div>';
  }

  /* ================================================================ PROMO */
  function blokPromo() {
    /* Promo milik aplikasi pasar. Tanpa modulnya tidak ada promo — itu
       bukan galat, itu memang tidak ada. */
    if (!window.BIZ) return '';
    var u = segar();
    var list = BIZ.promoUntuk(u);
    var judul = u.role === 'client' ? T('Promo untuk Anda') : T('Program & Informasi');
    var sub = T(u.role === 'client'
      ? 'Berlaku untuk layanan kebersihan maupun belanja di toko'
      : T('Program internal dan informasi untuk tim EXOCLEAN'));

    if (!list.length) {
      return UI.card({ cls: 'mt-3', title: judul,
        body: UI.empty('🎁', T('Belum ada promo'), T('Promo baru akan muncul di sini.')) });
    }

    return '<div class="nav-group" style="color:var(--muted);padding:24px 0 10px">' +
      U.esc(judul) + ' <span class="chip chip--muted">' + list.length + '</span></div>' +
      '<div class="tbl-sub mb-2">' + U.esc(sub) + '</div>' +
      '<div class="grid g-2">' + list.map(function (p) {
        var sisa = BIZ.promoSisaKuota(p);
        var hari = U.diffDays(p.berlakuHingga, new Date());
        var pakai = p.kuota ? Math.round((p.terpakai || 0) / p.kuota * 100) : 0;
        return '<div class="promo" style="--promo:' + p.warna + '">' +
          '<div class="promo__ic">' + p.ikon + '</div>' +
          '<div class="promo__isi">' +
            '<b>' + U.esc(p.judul) + '</b>' +
            '<p>' + U.esc(p.deskripsi) + '</p>' +
            '<div class="row wrap mt-2" style="gap:6px">' +
              (p.minBelanja ? '<span class="chip chip--muted" style="font-size:10.5px">min. ' +
                U.rpShort(p.minBelanja) + '</span>' : '') +
              '<span class="chip ' + (hari <= 7 ? 'chip--danger' : 'chip--muted') + '" style="font-size:10.5px">' +
                T('Berlaku sampai') + ' ' + U.tgl(p.berlakuHingga) +
                (hari >= 0 ? ' • ' + U.relatif(p.berlakuHingga).toLowerCase() : '') + '</span>' +
            '</div>' +
            (sisa !== null ? '<div class="mt-2">' + UI.progress(pakai, pakai > 80 ? 'warn' : '') +
              '<div class="tbl-sub mt-1">' + T('Sisa kuota') + ' ' + sisa + ' ' + T('dari') + ' ' +
              p.kuota + '</div></div>' : '') +
            '<div class="promo__kode">' +
              '<code>' + U.esc(p.kode) + '</code>' +
              '<button class="btn btn--soft btn--sm" data-act="salin-promo" data-k="' + U.esc(p.kode) + '">' +
                T('Salin kode') + '</button>' +
            '</div>' +
          '</div></div>';
      }).join('') + '</div>' +
      (u.role === 'client'
        ? '<div class="tbl-sub mt-2">' + T('Sebutkan kode promo saat mengirim permintaan layanan atau ' +
          'tulis di catatan pesanan toko — admin akan menerapkannya pada penawaran/invoice Anda.') + '</div>'
        : '');
  }

  /* ================================================================ HALAMAN */
  /** Tab berkas hanya untuk pegawai lapangan (petugas & supervisor). */
  function daftarTab(u) {
    var t = [{ k: 'diri', l: 'Data Diri', ic: '👤' }];
    if (PEGAWAI.pegawaiLapangan(u)) {
      /* Dua tab terpisah, bukan satu. BERKAS diisi pegawai sendiri (KTP,
         kontak darurat, alamat). DATA ditetapkan perusahaan (nomor pegawai,
         status kerja, kontrak) dan hanya bisa diubah admin. Menyatukannya
         membuat tombol yang bisa disunting dan yang tidak berdiri sebaris,
         dan pegawai jadi mengira semuanya bisa mereka perbaiki sendiri. */
      t.push({ k: 'berkas', l: 'Berkas Kepegawaian', ic: '🆔' });
      t.push({ k: 'kepegawaian', l: 'Data Kepegawaian', ic: '💼' });
    }
    t = t.concat([
      { k: 'alamat', l: T('Alamat Tersimpan'), ic: '📍' },
      { k: 'rekening', l: 'Rekening Bank', ic: '🏦' }
    ]);
    /* Peran akun hanya relevan bagi klien — mitra & penjual sudah memilih. */
    if (u.role === 'client') t.push({ k: 'peran', l: 'Peran Akun', ic: '🚀' });
    return t.concat([
      { k: 'keamanan', l: 'Keamanan', ic: '🔒' },
      { k: 'preferensi', l: 'Preferensi', ic: '⚙️' }
    ]);
  }

  function render(params) {
    var u = segar();
    var TAB = daftarTab(u);
    /* halaman lain bisa melompat langsung ke satu tab, mis. dari Dompet
       ketika mitra diminta membuat PIN atau menambah rekening */
    if (params && params.tab) tab = params.tab;
    if (!TAB.some(function (t) { return t.k === tab; })) tab = 'diri';

    var isi = tab === 'kepegawaian' ? tabKepegawaian()
      : tab === 'berkas' ? tabBerkas()
      : tab === 'alamat' ? tabAlamat()
      : tab === 'rekening' ? tabRekening()
      : tab === 'peran' ? tabPeran()
      : tab === 'keamanan' ? tabKeamanan()
      : tab === 'preferensi' ? tabPreferensi()
      : tabDiri();

    /* pengingat berkas kurang lengkap, muncul di tab mana pun */
    var ingat = '';
    if (PEGAWAI.pegawaiLapangan(u) && tab !== 'berkas') {
      var l = PEGAWAI.kelengkapanBerkas(u);
      if (l.kurang.length) {
        ingat = UI.alert('warn', '<b>' + T('Berkas kepegawaian belum lengkap') + '</b> (' +
          l.lengkap + '/' + l.total + '). ' + T('Belum terisi') + ': ' +
          l.kurang.map(function (p) { return U.esc(T(p.label)); }).join(', ') +
          '. <a href="#" data-act="ke-berkas">' + T('Lengkapi sekarang') + ' →</a>', '🆔') +
          '<div class="mb-3"></div>';
      }
    }

    return kartuIdentitas() +
      '<div class="mt-3">' + UI.tabs(TAB.map(function (t) {
        return { key: t.k, label: t.ic + ' ' + T(t.l) }; }), tab, 'tab-prof') + '</div>' +
      ingat + isi +
      blokPromo();
  }

  /* ================================================================ AKSI */
  /**
   * Daftar bahasa beserta cakupan terjemahannya.
   *
   * Persentasenya ditampilkan APA ADANYA. Bahasa yang baru 30% selesai lebih
   * baik dikatakan 30% daripada membiarkan pengguna memilihnya, melihat
   * layar setengah Inggris, dan menyimpulkan aplikasinya rusak.
   */
  function daftarBahasa(terpilih, saring) {
    var q = String(saring || '').toLowerCase().trim();
    var list = I18N.BAHASA.filter(function (b) {
      if (!q) return true;
      return (b.asli + ' ' + b.nama + ' ' + b.id).toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) {
      return '<div class="tbl-sub" style="padding:14px 18px">' +
        T('No language matches that search.') + '</div>';
    }
    return list.map(function (b) {
      var on = terpilih === b.id;
      var pct = I18N.cakupan(b.id);
      return '<button class="lang' + (on ? ' on' : '') + '" data-act="pilih-bahasa" ' +
        'data-b="' + b.id + '">' +
        '<span class="lang__f">' + b.bendera + '</span>' +
        '<span class="lang__t"><b>' + U.esc(b.asli) + '</b>' +
        '<small>' + U.esc(b.nama) +
          (b.id === I18N.BAWAAN ? ' · ' + T('Bawaan aplikasi') : '') +
          (b.rtl ? ' · ' + T('kanan ke kiri') : '') + '</small></span>' +
        '<span class="lang__pct' + (pct >= 100 ? ' penuh' : pct >= 50 ? ' cukup' : ' sedikit') +
          '">' + pct + '%</span>' +
        '<span class="lang__c">' + (on ? '✓' : '') + '</span></button>';
    }).join('');
  }

  function aksi(root) {
    ViewKeamanan.aksiPanel(root);   /* PIN, authenticator, perangkat */
    U.delegate(root, {
      /* --- peran akun --- */
      'ke-afiliasi': function () { APP.go('afiliasi'); },
      'jadi-mitra': function () {
        UI.konfirm({ title: T('Ajukan menjadi Mitra Lapangan?'),
          htmlText: T('Setelah diajukan, aplikasi Anda berganti menjadi tampilan mitra dan Anda ' +
            'mulai dari langkah bergabung: menyetujui Syarat & Ketentuan, melengkapi berkas, lalu ' +
            'mengikuti pembelajaran wajib.') + '<br><br>' +
            T('Anda tetap bisa kembali menjadi klien lewat admin.'),
          okText: T('Ya, ajukan') }).then(function (ya) {
          if (!ya) return;
          var u = segar();
          DB.update('users', u.id, {
            role: 'worker', jabatan: T('Calon Mitra'), statusMitra: 'onboarding',
            daftarAt: U.nowISO(), fungsiKerja: [],
            identitas: u.identitas || null, kontakDarurat: u.kontakDarurat || [],
            alamatTinggal: u.alamatTinggal || {}
          });
          DB.log(u.id, T('Mengajukan diri menjadi Mitra Lapangan'), 'user', u.id);
          var adm = AKUN.usersByRole('admin')[0];
          if (adm) DB.insert('waOutbox', { to: adm.id, template: 'manual', status: 'antre',
            sentAt: null, refType: 'user', refId: u.id,
            pesan: (function () {
              var w = I18N.pesanUntuk(adm.id);
              return '*' + w('KLIEN BERALIH JADI MITRA') + '* 🧹\n\n' +
                u.nama + '\n' + U.phoneDisplay(u.telp) + '\n\n' +
                w('Pantau progres onboarding-nya di menu Mitra & Rekrutmen.');
            })() });
          APP.perbaruiSesi(DB.find('users', u.id));
          UI.toast(T('Selamat bergabung! Mulai dari menu Bergabung.'), 'ok');
          APP.go('gabung');
        });
      },
      'jadi-seller': function () {
        UI.formModal({
          title: T('Ajukan Buka Toko'), size: 'narrow', okText: T('Kirim Pengajuan'),
          intro: UI.alert('info', T('Aplikasi Anda akan berganti menjadi ruang kerja penjual. ' +
            'Toko baru tayang setelah profil lengkap dan disetujui admin.'), 'ℹ️') +
            '<div class="mb-3"></div>',
          fields: [
            { name: 'namaToko', label: T('Nama toko'), required: true },
            { name: 'kota', label: T('Kota gudang'), required: true },
            { name: 'kategoriUtama', label: T('Kategori utama'), type: 'select',
              options: ['Chemical Pembersih', 'Alat Kebersihan', 'Mesin & Peralatan',
                        'APD & Keselamatan Kerja', 'Consumable', 'Aksesoris'] }
          ]
        }).then(function (d) {
          if (!d) return;
          var u = segar();
          DB.update('users', u.id, {
            role: 'seller',
            toko: { nama: d.namaToko, deskripsi: '', logo: null, banner: null,
              kota: d.kota, alamatGudang: '', telpToko: u.telp,
              kategoriUtama: d.kategoriUtama, status: 'onboarding',
              bergabungAt: null, saldoIklan: 0 }
          });
          DB.log(u.id, 'Mengajukan diri menjadi Mitra Toko: ' + d.namaToko, 'seller', u.id);
          APP.perbaruiSesi(DB.find('users', u.id));
          UI.toast(T('Toko dibuat. Lengkapi profilnya untuk diajukan ke admin.'), 'ok');
          APP.refresh();
        });
      },

      'tab-prof': function (el) { tab = el.getAttribute('data-key'); APP.refresh(); },

      /* --- foto --- */
      'pilih-foto': function () { U.$('#inp-foto').click(); },
      'unggah-foto': function (el) {
        UI.handleFotoInput(el, function (ids) {
          var u = segar();
          if (u.foto) DB.delPhoto(u.foto);
          ids.slice(1).forEach(DB.delPhoto);
          DB.update('users', u.id, { foto: ids[0] });
          terapkan();
          UI.toast('Foto profil diperbarui', 'ok');
          APP.refresh();
        });
      },

      /* --- data diri --- */
      'simpan-diri': function (el) {
        var f = U.readForm(el.closest('.card'));
        if (!f.nama || !f.telp || !f.email) { UI.toast(T('Nama, WhatsApp, dan email wajib diisi'), 'err'); return; }
        var bentrok = DB.all('users').filter(function (x) {
          return x.email.toLowerCase() === String(f.email).toLowerCase() && x.id !== aku().id; });
        if (bentrok.length) { UI.toast(T('Email sudah dipakai akun lain'), 'err'); return; }
        DB.update('users', aku().id, f);
        terapkan();
        UI.toast(T('Profil diperbarui'), 'ok');
        APP.refresh();
      },

      /* --- berkas kepegawaian --- */
      'ke-berkas': function () { tab = 'berkas'; APP.refresh(); },
      'ke-belajar-profil': function () { APP.go('belajar'); },
      'lihat-sert': function (el) {
        if (window.ViewBelajar) ViewBelajar.lihatSertifikat(el.getAttribute('data-id'));
      },
      'toggle-nomor': function () { bukaNomor = !bukaNomor; APP.refresh(); },
      'toggle-nomor-peg': function () { bukaNomorPeg = !bukaNomorPeg; APP.refresh(); },
      'ubah-kepegawaian': dialogKepegawaian,
      'ubah-identitas': dialogIdentitas,
      'ganti-foto-id': function (el) { U.$('#inp-id-' + el.getAttribute('data-j')).click(); },
      'unggah-foto-id': function (el) {
        var jenis = el.getAttribute('data-j');
        var field = jenis === 'depan' ? 'fotoDepan' : 'fotoSelfie';
        UI.handleFotoInput(el, function (ids) {
          var idn = PEGAWAI.identitas(segar());
          if (idn[field]) DB.delPhoto(idn[field]);
          ids.slice(1).forEach(DB.delPhoto);
          var patch = { diverifikasi: false, diverifikasiOleh: null, diverifikasiAt: null };
          patch[field] = ids[0];
          PEGAWAI.simpanIdentitas(aku().id, patch);
          terapkan();
          UI.toast(T('Foto identitas diunggah — menunggu verifikasi admin'), 'ok');
          APP.refresh();
        });
      },
      'hapus-foto-id': function (el) {
        var jenis = el.getAttribute('data-j');
        var field = jenis === 'depan' ? 'fotoDepan' : 'fotoSelfie';
        UI.konfirm({ title: T('Hapus foto identitas ini?'), danger: true, okText: T('Ya, hapus') })
          .then(function (ya) {
            if (!ya) return;
            var idn = PEGAWAI.identitas(segar());
            if (idn[field]) DB.delPhoto(idn[field]);
            var patch = {}; patch[field] = null;
            PEGAWAI.simpanIdentitas(aku().id, patch);
            terapkan(); UI.toast(T('Foto dihapus'), 'ok'); APP.refresh();
          });
      },
      'zoom-id': function (el) { UI.lightbox(el.getAttribute('src')); },

      'kd-baru': function () { dialogKontakDarurat(null); },
      'kd-ubah': function (el) { dialogKontakDarurat(el.getAttribute('data-id')); },
      'kd-utama': function (el) {
        var id = el.getAttribute('data-id');
        PEGAWAI.simpanKontakDarurat(aku().id, PEGAWAI.kontakDarurat(segar()).map(function (k) {
          return Object.assign({}, k, { utama: k.id === id }); }));
        terapkan(); UI.toast(T('Kontak utama diperbarui'), 'ok'); APP.refresh();
      },
      'kd-hapus': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus kontak darurat ini?'), danger: true, okText: T('Ya, hapus') })
          .then(function (ya) {
            if (!ya) return;
            PEGAWAI.simpanKontakDarurat(aku().id,
              PEGAWAI.kontakDarurat(segar()).filter(function (k) { return k.id !== id; }));
            terapkan(); UI.toast(T('Kontak dihapus'), 'ok'); APP.refresh();
          });
      },
      'kd-wa': function (el) {
        var k = PEGAWAI.kontakDarurat(segar()).filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (k) WA.chat(k.telp, 'Halo ' + k.nama + ', ');
      },
      'ubah-domisili': dialogDomisili,

      /* --- alamat --- */
      'alamat-baru': function () { dialogAlamat(null); },
      'alamat-ubah': function (el) { dialogAlamat(el.getAttribute('data-id')); },
      'alamat-peta': function (el) {
        var id = el.getAttribute('data-id');
        var list = PEGAWAI.alamatList(segar()).slice();
        var a = list.filter(function (x) { return x.id === id; })[0];
        if (!a) return;
        MAPS.pilihTitik({
          judul: 'Titik lokasi — ' + a.label,
          sub: T('Dipakai kurir dan tim lapangan agar tidak salah alamat'),
          alamat: PEGAWAI.alamatTeks(a), awal: a.koordinat
        }).then(function (hasil) {
          if (!hasil) return;
          a.koordinat = hasil.hapus ? null : hasil;
          PEGAWAI.simpanAlamat(aku().id, list);
          terapkan();
          UI.toast(hasil.hapus ? 'Titik lokasi dihapus' : 'Titik lokasi tersimpan', 'ok');
          APP.refresh();
        });
      },
      'alamat-utama': function (el) {
        var id = el.getAttribute('data-id');
        var list = PEGAWAI.alamatList(segar()).map(function (a) {
          return Object.assign({}, a, { utama: a.id === id }); });
        PEGAWAI.simpanAlamat(aku().id, list);
        terapkan();
        UI.toast(T('Alamat utama diperbarui'), 'ok');
        APP.refresh();
      },
      'alamat-hapus': function (el) {
        var id = el.getAttribute('data-id');
        var a = PEGAWAI.alamatList(segar()).filter(function (x) { return x.id === id; })[0];
        UI.konfirm({ title: T('Hapus alamat “{v}”?')
            .replace('{v}', a ? a.label : ''), danger: true,
          text: T('Alamat pada order dan pesanan yang sudah dibuat tidak ikut berubah.'),
          okText: T('Ya, hapus') }).then(function (ya) {
          if (!ya) return;
          PEGAWAI.simpanAlamat(aku().id, PEGAWAI.alamatList(segar()).filter(function (x) { return x.id !== id; }));
          terapkan();
          UI.toast(T('Alamat dihapus'), 'ok');
          APP.refresh();
        });
      },

      /* --- rekening --- */
      'rek-baru': function () { dialogRekening(null); },
      'rek-ubah': function (el) { dialogRekening(el.getAttribute('data-id')); },
      'rek-utama': function (el) {
        var id = el.getAttribute('data-id');
        PEGAWAI.simpanRekening(aku().id, PEGAWAI.rekeningList(segar()).map(function (r) {
          return Object.assign({}, r, { utama: r.id === id }); }));
        terapkan();
        UI.toast('Rekening utama diperbarui', 'ok');
        APP.refresh();
      },
      'rek-hapus': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus rekening ini?'), danger: true, okText: T('Ya, hapus') }).then(function (ya) {
          if (!ya) return;
          PEGAWAI.simpanRekening(aku().id, PEGAWAI.rekeningList(segar()).filter(function (r) { return r.id !== id; }));
          terapkan();
          UI.toast('Rekening dihapus', 'ok');
          APP.refresh();
        });
      },

      /* --- keamanan --- */
      'ganti-sandi': function (el) {
        var f = U.readForm(el.closest('.card'));
        var err = AKUN.gantiSandi(aku().id, f.lama, f.baru, f.ulang);
        if (err) { UI.toast(err, 'err'); return; }
        terapkan();
        UI.toast(T('Kata sandi berhasil diubah'), 'ok');
        APP.refresh();
      },

      /* --- preferensi --- */
      'pilih-bahasa': function (el) {
        var b = el.getAttribute('data-b');
        AKUN.simpanPreferensi(aku().id, { bahasa: b });
        I18N.set(b);
        terapkan();
        var inf = I18N.info(b);
        var pct = I18N.cakupan(b);
        /* Cakupan disebut saat berpindah, bukan disembunyikan: pengguna berhak
           tahu sejak awal bahwa sebagian layar akan tampil dalam Inggris. */
        UI.toast(inf.bendera + '  ' + inf.asli +
          (pct < 100 ? '  —  ' + pct + '% ' + I18N.t('diterjemahkan') : ''), 'ok');
        APP.refresh();
      },
      /* --- tampilan --- */
      'tp-set': function (el) {
        var k = el.getAttribute('data-k');
        var v = el.getAttribute('data-v');
        var patch = {};
        /* Angka disimpan sebagai angka dan sakelar sebagai boolean —
           atribut HTML selalu berupa teks, dan '' yang tersimpan apa adanya
           akan membuat kontras terlihat menyala padahal mati. */
        patch[k] = k === 'teks' ? Number(v) : (k === 'kontras' ? !!v : v);
        TAMPILAN.simpan(patch, aku());
        terapkan();
        APP.refresh();
      },
      'tp-izin': function () {
        NOTIF.mintaIzin().then(function (hasil) {
          if (hasil === 'granted') {
            TAMPILAN.simpan({ notifBrowser: true }, aku());
            UI.toast(T('Pemberitahuan dinyalakan.'), 'ok');
          } else if (hasil === 'denied') {
            UI.toast(T('Peramban menolak. Izinnya hanya bisa dikembalikan lewat ' +
              'setelan peramban.'), 'err');
          }
          APP.refresh();
        });
      },
      'tp-notif': function (el) {
        TAMPILAN.simpan({ notifBrowser: el.checked }, aku());
        UI.toast(el.checked ? T('Pemberitahuan dinyalakan.') : T('Pemberitahuan dimatikan.'), 'ok');
      },
      pref: function (el) {
        var patch = {};
        patch[el.getAttribute('data-k')] = el.checked;
        AKUN.simpanPreferensi(aku().id, patch);
        terapkan();
        UI.toast('Preferensi disimpan', 'ok');
      },

      /* --- promo --- */
      'salin-promo': function (el) {
        var k = el.getAttribute('data-k');
        navigator.clipboard.writeText(k).then(function () {
          UI.toast(T('Kode disalin') + ': ' + k, 'ok');
        }, function () { UI.toast('Browser menolak akses clipboard', 'err'); });
      }
    });

    /* Dengan puluhan bahasa, menggulung daftar lebih lambat daripada mengetik.
       Hanya daftarnya yang digambar ulang supaya fokus tidak lepas. */
    var cariB = root.querySelector('#cari-bahasa');
    if (cariB) {
      cariB.addEventListener('input', function () {
        var box = root.querySelector('#lang-list');
        if (box) box.innerHTML = daftarBahasa(AKUN.preferensi(aku()).bahasa, cariB.value);
      });
    }
  }

  /** Definisi halaman — dipakai keempat modul peran. */
  function page(grup) {
    return { label: T('Profil Saya'), icon: '👤', grup: grup || 'Akun',
      sub: T('Data diri, alamat, rekening & preferensi'), render: render, mount: aksi };
  }

  return { page: page, render: render, aksi: aksi };
})();
