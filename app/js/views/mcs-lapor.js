/* ==========================================================================
   views/mcs-lapor.js — Laporan, portal pemilik gedung, kinerja, struktur, portofolio
   --------------------------------------------------------------------------
   Yang dibaca, bukan yang diisi. Dipecah dari views/mcs.js yang dulu 15.166 baris; alasan
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
      barisId = VMCS.barisId,
      cetak = VMCS.cetak,
      cetakDaftar = VMCS.cetakDaftar,
      delegasi = VMCS.delegasi,
      dpAksi = VMCS.dpAksi,
      dpBilah = VMCS.dpBilah,
      dpPotong = VMCS.dpPotong,
      dpSaring = VMCS.dpSaring,
      jamMenit = VMCS.jamMenit,
      jml = VMCS.jml,
      judulMutu = VMCS.judulMutu,
      kartuMutu = VMCS.kartuMutu,
      kop = VMCS.kop,
      korp = VMCS.korp,
      selMutu = VMCS.selMutu,
      tombol = VMCS.tombol;

  function kodeDariAlamat() {
    var h = '';
    try { h = String(location.hash || ''); } catch (e) {}
    var m = h.match(/^#tag=([A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  /**
   * Layar publik, atau null bila alamatnya bukan tautan tag.
   *
   * Dipanggil app.js SEBELUM layar masuk. Mengembalikan null berarti
   * 'bukan urusan saya' — dan aplikasi berjalan seperti biasa.
   */
  /** Token laporan dari alamat, bila sedang membuka tautan portal. */

  function tokenLaporan() {
    var h = '';
    try { h = String(location.hash || ''); } catch (e) {}
    var m = h.match(/^#lapor=([A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  function layarPublik() {
    /* Portal diperiksa LEBIH DULU daripada tag: keduanya layar publik, dan
       alamatnya berbeda, jadi urutannya hanya soal kejelasan — yang satu
       mengirim aduan, yang lain membaca laporan. */
    var tokenLap = tokenLaporan();
    if (tokenLap) return layarLaporanPublik(tokenLap);

    var kode = kodeDariAlamat();
    if (!kode) return null;
    var area = MCS.areaDariKode(kode);
    if (!area) {
      return { render: function () {
        return '<div class="aduan-pub"><div class="aduan-pub__k">' +
          UI.empty('🏷️', T('Tag tidak dikenali'),
            T('Kode {kode} tidak terdaftar di gedung mana pun. Periksa tagnya, ' +
              'atau hubungi pengelola gedung.').replace('{kode}', U.esc(kode))) +
        '</div></div>'; }, mount: function () {} };
    }
    if (!MCS.config().aduanAktif) {
      return { render: function () {
        return '<div class="aduan-pub"><div class="aduan-pub__k">' +
          UI.empty('🔕', T('Pelaporan sedang ditutup'),
            T('Pengelola gedung menonaktifkan pelaporan lewat tag untuk sementara.')) +
        '</div></div>'; }, mount: function () {} };
    }
    return layarAduan(area);
  }

  function layarAduan(area) {
    var k = MCS.korporat(area.korporatId);
    var terkirim = null;
    var foto = [];
    var pilih = 'biasa';

    function render() {
      if (terkirim) {
        var s = MCS.sisaSLA(terkirim);
        return '<div class="aduan-pub"><div class="aduan-pub__k">' +
          '<div class="aduan-pub__ok">✅</div>' +
          '<h2>' + T('Terima kasih — laporan Anda masuk.') + '</h2>' +
          '<p>' + U.esc(area.nama) + (k ? ' · ' + U.esc(k.nama) : '') + '</p>' +
          /* Janji waktunya disebut terang-terangan. Aduan yang hilang tanpa
             kabar adalah sebab utama orang berhenti melapor. */
          '<div class="aduan-pub__sla">' +
            T('Ditargetkan ditangani dalam') + ' <b>' + jamMenit(terkirim.slaMenit) + '</b>' +
          '</div>' +
          '<button class="btn btn--ghost mt-3" data-act="ad-lagi">' +
            T('Laporkan hal lain di area ini') + '</button>' +
        '</div></div>';
      }

      return '<div class="aduan-pub"><div class="aduan-pub__k">' +
        '<div class="aduan-pub__h">' +
          (k ? '<div class="aduan-pub__p">' + U.esc(k.nama) + '</div>' : '') +
          '<h2>' + U.esc(area.nama) + '</h2>' +
          '<div class="tbl-sub">' +
            U.esc([area.gedung, area.lantai ? 'Lt. ' + area.lantai : ''].filter(Boolean).join(' · ')) +
          '</div>' +
        '</div>' +

        '<p class="aduan-pub__ajak">' +
          T('Ada yang kotor, bau, licin, atau rusak di sini? Beri tahu petugas kebersihan ' +
            'sekarang. Tidak perlu masuk akun.') + '</p>' +

        '<div class="aduan-g">' + MCS.GENTING.map(function (g) {
          return '<button type="button" class="aduan-g__b' + (pilih === g.kode ? ' on' : '') +
            '" data-act="ad-genting" data-k="' + g.kode + '">' +
            '<span class="aduan-g__i">' + g.ikon + '</span>' +
            '<b>' + T(g.nama) + '</b><small>' + T(g.ket) + '</small></button>';
        }).join('') + '</div>' +

        '<label class="mcs-f mt-3"><span>' + T('Apa yang terjadi?') + '</span>' +
          '<textarea class="input" id="ad-teks" rows="3" placeholder="' +
            U.esc(T('mis. lantai basah di depan bilik kedua, tisu habis')) + '"></textarea></label>' +

        /* photoGrid sudah membuat tombol tambahnya sendiri — membuat tombol
           kedua di sini akan menampilkan dua ikon kamera berdampingan. */
        '<div class="mt-2">' + UI.photoGrid(foto, {
          delAct: 'ad-hapus-foto', addAct: 'ad-foto', addLabel: T('Tambah foto') }) + '</div>' +

        '<div class="grid g-2 mt-3">' +
          '<label class="mcs-f"><span>' + T('Nama Anda (opsional)') + '</span>' +
            '<input class="input" id="ad-nama"></label>' +
          '<label class="mcs-f"><span>' + T('Nomor HP (opsional)') + '</span>' +
            '<input class="input" id="ad-kontak" placeholder="08xxxxxxxxxx"></label>' +
        '</div>' +
        '<p class="tbl-sub">' +
          T('Boleh dikosongkan. Diisi hanya bila Anda ingin dikabari hasilnya.') + '</p>' +

        '<button class="btn btn--block btn--lg mt-3" data-act="ad-kirim">' +
          T('Kirim laporan') + '</button>' +
      '</div></div>';
    }

    function mount(root) {
      delegasi(root, {
        'ad-genting': function (el) { pilih = el.getAttribute('data-k'); gambar(); },
        'ad-hapus-foto': function (el) {
          var id = el.getAttribute('data-id');
          DB.delPhoto(id);
          foto = foto.filter(function (f) { return f !== id; });
          gambar();
        },
        'ad-foto': function (el) {
          UI.handleFotoInput(el, function (ids) { foto = foto.concat(ids); gambar(); },
            { maks: 3, maxSide: 900, quality: 0.6 });
        },
        'ad-lagi': function () { terkirim = null; foto = []; pilih = 'biasa'; gambar(); },
        'ad-kirim': function () {
          var teks = (document.getElementById('ad-teks') || {}).value || '';
          var nama = (document.getElementById('ad-nama') || {}).value || '';
          var kontak = (document.getElementById('ad-kontak') || {}).value || '';
          var r = MCS.buatAduan(area.id, { genting: pilih, teks: teks, foto: foto,
            pelapor: nama, kontak: kontak });
          if (r.error) { UI.toast(r.error, 'err'); return; }
          /* Foto berpindah kepemilikan ke aduannya — daftar lokal dikosongkan
             supaya tombol 'laporkan hal lain' tidak melampirkannya lagi. */
          foto = [];
          terkirim = r.aduan;
          gambar();
        }
      });
    }

    function gambar() {
      var root = document.getElementById('app');
      root.innerHTML = render();
      mount(root);
    }

    return { render: render, mount: mount };
  }

  /** '2 jam 30 menit' dari 150. Menit saja tidak terbaca sebagai janji. */

  var lapBulan = null, lapTahun = null;

  function layarLaporanPublik(token) {
    var x = PORTAL.dariToken(token);

    if (!x) {
      return { render: function () {
        return bungkusPublik(UI.empty('🔗', T('Tautan tidak dikenali'),
          T('Tautan ini tidak terdaftar. Periksa alamatnya, atau minta tautan ' +
            'baru kepada pengelola gedung.'))); }, mount: function () {} };
    }
    if (!PORTAL.berlaku(x)) {
      /* Dibedakan dari 'tidak dikenali': yang dicabut memang pernah sah, dan
         yang memegangnya perlu tahu harus minta ke siapa. */
      return { render: function () {
        return bungkusPublik(UI.empty('🚫', T('Tautan sudah tidak berlaku'),
          x.kadaluarsa && x.kadaluarsa < U.today()
            ? T('Masa berlakunya habis pada {tgl}. Mintalah tautan baru kepada ' +
                'pengelola gedung.').replace('{tgl}', U.tglPanjang(x.kadaluarsa))
            : T('Tautan ini dicabut pengelola gedung. Hubungi mereka untuk ' +
                'mendapatkan tautan baru.'))); }, mount: function () {} };
    }

    var d = new Date();
    var thn = lapTahun || d.getFullYear();
    var bln = lapBulan || (d.getMonth() + 1);
    var h = PORTAL.laporan(x, thn, bln);
    var iniBulanIni = thn === d.getFullYear() && bln === (d.getMonth() + 1);

    return {
      render: function () { return bungkusPublik(isiLaporanPublik(h, iniBulanIni), true); },
      mount: function (root) {
        PORTAL.catatBuka(x.id);
        Chart.pasang(root);
        delegasi(root, {
          'lap-bulan': function (el) {
            var m = bln + (+el.getAttribute('data-d'));
            var y = thn;
            if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
            var kini = new Date();
            if (y > kini.getFullYear() || (y === kini.getFullYear() && m > kini.getMonth() + 1)) return;
            lapTahun = y; lapBulan = m;
            APP.refresh();
          },
          'lap-cetak': function () { cetak('cetak-lap'); }
        });
      }
    };
  }

  function bungkusPublik(isi, lebar) {
    return '<div class="lap-pub' + (lebar ? ' lap-pub--lebar' : '') + '">' +
      '<div class="lap-pub__k">' + isi + '</div></div>';
  }

  function isiLaporanPublik(h, iniBulanIni) {
    var k = h.korporat || {};
    var namaBulan = U.tglPanjang(h.periode.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');

    return '<div id="lap-lembar">' +
      '<div class="lap-pub__h">' +
        '<div class="aduan-pub__p">' + T('Laporan Kebersihan') + '</div>' +
        '<h2>' + U.esc(k.nama || '') + '</h2>' +
        '<div class="lap-pub__sub">' + U.esc(h.portal.nama) + ' · ' + U.esc(namaBulan) +
          (iniBulanIni ? ' · ' + T('bulan berjalan') : '') + '</div>' +
        (h.lingkup
          /* Penyewa yang hanya diberi sebagian area harus tahu bahwa angka
             ini bukan angka seluruh gedung — kalau tidak, ia akan mengira
             gedungnya lebih bersih atau lebih kotor daripada kenyataannya. */
          ? '<div class="lap-pub__lingkup">' + T('Laporan ini hanya mencakup') + ': ' +
            U.esc(h.lingkup.map(function (a) { return a.nama; }).join(', ')) + '</div>'
          : '') +
      '</div>' +

      '<div class="lap-pub__nav no-print">' +
        '<button class="btn btn--ghost btn--sm" data-act="lap-bulan" data-d="-1">‹ ' +
          T('Bulan sebelumnya') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="lap-bulan" data-d="1"' +
          (iniBulanIni ? ' disabled' : '') + '>' + T('Bulan berikutnya') + ' ›</button>' +
        '<button class="btn btn--sm" data-act="lap-cetak">🖨️ ' + T('Cetak') + '</button>' +
      '</div>' +

      (h.total
        ? angkaLaporan(h) + grafikLaporan(h) + tabelLaporan(h) + jujurLaporan()
        : UI.empty('🗓️', T('Belum ada pekerjaan tercatat pada bulan ini'),
            T('Bila menurut Anda seharusnya ada, hubungi pengelola gedung.'))) +
    '</div>';
  }

  function angkaLaporan(h) {
    return '<div class="lap-pub__ang">' +
      angkaPub(T('Tugas dijadwalkan'), U.num(h.total), '') +
      angkaPub(T('Selesai dilaporkan'), h.persen + '%', h.selesai + ' ' + T('tugas')) +
      angkaPub(T('Disertai bukti kehadiran'), h.persenBukti + '%',
        h.berbukti + ' ' + T('dari yang selesai')) +
      angkaPub(T('Mutu rata-rata'), h.mutu.rata === null ? '—' : String(h.mutu.rata),
        h.mutu.jumlah ? jml(h.mutu.jumlah, '1 inspeksi', '{n} inspeksi')
                      : T('belum ada inspeksi')) +
    '</div>';
  }

  function angkaPub(label, nilai, ket) {
    return '<div class="lap-pub__a"><span>' + U.esc(label) + '</span>' +
      '<b>' + U.esc(nilai) + '</b>' + (ket ? '<i>' + U.esc(ket) + '</i>' : '') + '</div>';
  }

  function grafikLaporan(h) {
    var hari = h.hari.filter(function (x) { return x.total; });
    if (!hari.length) return '';
    return '<div class="lap-pub__blok">' +
      '<h3>' + T('Penyelesaian harian') + '</h3>' +
      Chart.kolom({
        seri: [{ nama: T('Selesai'), warna: Chart.WARNA.s1 },
               { nama: T('Belum selesai'), warna: Chart.WARNA.s2 }],
        judulA11y: T('Tugas selesai dan belum selesai per hari'),
        /* Lembar cetak: tidak ada halaman yang bisa dituju, jadi sumbernya
           hanya disebutkan. Tautan yang tidak bisa diklik di atas kertas
           lebih buruk daripada tidak ada tautan sama sekali. */
        sumber: { teks: T('Setiap tugas berjadwal pada periode ini, dihitung ' +
          'per hari. Tugas yang belum sampai jamnya tidak dihitung sebagai ' +
          'belum selesai.') },
        data: hari.map(function (x) {
          return { label: String(x.tgl).slice(8), sub: String(x.tgl).slice(5, 7),
                   values: [x.selesai, Math.max(0, x.total - x.selesai)] }; })
      }) + '</div>';
  }

  function tabelLaporan(h) {
    return '<div class="lap-pub__blok">' +
        '<h3>' + T('Per area') + '</h3>' +
        UI.table([
          { h: T('Area'), r: function (x) { return U.esc(x.area.nama); } },
          { h: T('Dijadwalkan'), cls: 'num', r: function (x) { return x.total; } },
          { h: T('Selesai'), cls: 'num', r: function (x) { return x.selesai; } },
          { h: T('Capaian'), cls: 'num', r: function (x) { return x.persen + '%'; } },
          { h: T('Berbukti'), cls: 'num', r: function (x) { return x.berbukti; } },
          { h: judulMutu(), cls: 'num', r: function (x) {
            return selMutu(x.mutu, { ringkas: true }); } }
        ], h.area, { judul: T('Belum ada area yang dijadwalkan') }) +
      '</div>' +

      (h.aduan.total
        ? '<div class="lap-pub__blok">' +
          '<h3>' + T('Aduan penghuni') + '</h3>' +
          '<div class="lap-pub__ang">' +
            angkaPub(T('Diterima'), String(h.aduan.total), '') +
            angkaPub(T('Selesai'), String(h.aduan.selesai), '') +
            angkaPub(T('Tepat waktu'),
              h.aduan.persenSLA === null ? '—' : h.aduan.persenSLA + '%',
              h.aduan.tepatWaktu + ' ' + T('dari yang selesai')) +
            angkaPub(T('Masih terbuka'), String(h.aduan.terbuka), '') +
          '</div></div>'
        : '');
  }

  /* Keterangan yang sama dengan yang dipakai di dalam aplikasi. Pemilik gedung
     berhak tahu apa arti angkanya — terutama selisih antara 'dilaporkan' dan
     'bisa dibuktikan', yang justru bagian paling berguna dari laporan ini. */

  function jujurLaporan() {
    return '<div class="lap-pub__jujur">' +
      '<b>' + T('Apa arti angka di atas.') + '</b> ' +
      T('“Selesai dilaporkan” berarti seseorang menandainya selesai di aplikasi. ' +
        '“Disertai bukti kehadiran” berarti tag area benar-benar dipindai di ' +
        'lokasi. Selisih antara keduanya adalah pekerjaan yang tidak bisa ' +
        'ditunjukkan — bukan berarti tidak dikerjakan. Mutu memakai skala APPA ' +
        '1 sampai 5, dengan 1 paling bersih.') +
    '</div>';
  }

  /* -------------------------------------- pengelolaan tautan (staf korporat) */

  var ptSaring = 'aktif';

  function renderPortal() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var l = PORTAL.semua(k.id, { semua: ptSaring === 'semua' });
    var aktif = PORTAL.semua(k.id).length;
    var semua = PORTAL.semua(k.id, { semua: true }).length;

    return UI.alert('info',
        '<b>' + T('Laporan yang bisa dibuka sendiri oleh pemilik gedung dan penyewa.') +
        '</b> ' +
        T('Diberikan lewat tautan, bukan akun — pemilik gedung tidak akan ' +
          'mendaftar, mengingat sandi, atau menelepon minta reset. Harganya: ' +
          'siapa pun yang memegang tautannya bisa membuka, dan ia bisa ' +
          'diteruskan. Karena itu tautannya bisa dicabut kapan saja, dan setiap ' +
          'pembukaan dihitung.'), '🔗') + '<div class="mb-3"></div>' +

      UI.alert('warn',
        '<b>' + T('Yang TIDAK ikut terbaca lewat tautan ini.') + '</b> ' +
        T('Nilai KPI perorangan, catatan kehadiran, nomor telepon, nomor induk, ' +
          'laporan insiden yang menyebut nama, dan apa pun yang bisa dipakai ' +
          'masuk aplikasi. Yang terbaca adalah keadaan GEDUNG, bukan rapor ' +
          'pegawai.'), '🔒') + '<div class="mb-3"></div>' +

      '<div class="row between mb-3">' +
        UI.tabs([{ key: 'aktif', label: T('Aktif'), n: aktif },
                 { key: 'semua', label: T('Termasuk yang dicabut'), n: semua }],
                ptSaring, 'pt-saring') +
        '<button class="btn btn--primary btn--sm" data-act="pt-baru">＋ ' +
          T('Buat Tautan') + '</button>' +
      '</div>' +

      (l.length
        ? '<div class="wk-list">' + l.map(barisPortal).join('') + '</div>'
        : UI.empty('🔗', T('Belum ada tautan laporan'),
            T('Buat satu untuk pemilik gedung, dan satu lagi untuk tiap penyewa ' +
              'yang hanya boleh melihat lantainya sendiri.')));
  }

  function barisPortal(x) {
    var berlaku = PORTAL.berlaku(x);
    var area = (x.areaIds || []).map(function (id) {
      var a = MCS.areaSatu(id); return a ? a.nama : ''; }).filter(Boolean);

    return '<div class="wk-r' + (berlaku ? '' : ' kp-r--kurang') + '">' +
      '<div class="wk-r__h" style="cursor:default">' +
        '<span class="wk-r__i">🔗</span>' +
        '<span class="wk-r__t">' +
          '<b>' + U.esc(x.nama) + '</b>' +
          '<span>' + (area.length
              ? T('hanya') + ' ' + U.esc(area.join(', '))
              : T('seluruh gedung')) +
            ' · ' + (x.dibuka
              ? jml(x.dibuka, '1 kali dibuka', '{n} kali dibuka') +
                (x.terakhirDibuka ? ' · ' + T('terakhir') + ' ' +
                  U.esc(U.tglPendek(String(x.terakhirDibuka).slice(0, 10))) : '')
              /* Nol pembukaan bukan kabar netral: laporan yang tidak pernah
                 dibuka sama saja dengan laporan yang tidak pernah dikirim. */
              : T('belum pernah dibuka')) +
            (x.kadaluarsa ? ' · ' + T('berlaku sampai') + ' ' +
              U.esc(U.tglPendek(x.kadaluarsa)) : '') +
          '</span>' +
          '<span class="pt-r__t"><code>' + U.esc(PORTAL.tautan(x)) + '</code></span>' +
        '</span>' +
        '<span class="chip chip--' + (berlaku ? 'ok' : 'muted') + '">' +
          (berlaku ? '🟢 ' + T('Berlaku') : '🚫 ' + T('Tidak berlaku')) + '</span>' +
      '</div>' +
      '<div class="wk-d"><div class="wk-d__b" style="margin:0;padding:0;border:0">' +
        '<button class="btn btn--sm" data-act="pt-salin" data-id="' + x.id + '">📋 ' +
          T('Salin tautan') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="pt-buka" data-id="' + x.id + '">👁️ ' +
          T('Lihat sebagai penerima') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="pt-ubah" data-id="' + x.id + '">' +
          T('Ubah') + '</button>' +
        (x.aktif === false
          ? '<button class="btn btn--ghost btn--sm" data-act="pt-aktif" data-id="' + x.id + '">' +
            T('Aktifkan lagi') + '</button>'
          : '<button class="btn btn--ghost btn--sm ma-hapus" data-act="pt-cabut" ' +
            'data-id="' + x.id + '">' + T('Cabut') + '</button>') +
        '<button class="btn btn--ghost btn--sm ma-hapus" data-act="pt-hapus" ' +
          'data-id="' + x.id + '">🗑</button>' +
      '</div></div>' +
    '</div>';
  }

  function dialogPortal(id) {
    var k = korp();
    var x = id ? PORTAL.satu(id) : null;
    var a = MCS.area(k.id);

    UI.formModal({
      title: x ? T('Ubah tautan') : T('Buat tautan laporan'),
      sub: U.esc(k.nama), size: 'wide', okText: x ? T('Simpan') : T('Buat'),
      fields: [
        { name: 'nama', label: T('Untuk siapa'), value: x ? x.nama : '', required: true,
          placeholder: T('mis. PT Sinar Abadi — penyewa lantai 7'),
          hint: T('Nama ini hanya terlihat oleh Anda dan tercetak di kepala laporan.') },
        { name: 'kadaluarsa', label: T('Berlaku sampai'), type: 'date',
          value: x ? (x.kadaluarsa || '') : '',
          hint: T('Kosongkan bila berlaku terus. Tautan untuk penyewa sebaiknya ' +
            'diberi batas — kontrak sewa berakhir, tautannya tidak.') },
        { type: 'html', html: '<div class="mcs-fs">' + T('Lingkup') +
          '<span>' + T('Kosongkan seluruhnya untuk memberi laporan gedung penuh') +
          '</span></div>' },
        { type: 'html', html: '<div class="field"><div class="kh-alg">' +
          a.map(function (y) {
            var on = x && (x.areaIds || []).indexOf(y.id) >= 0;
            return '<label class="kh-alg__i">' +
              '<input type="checkbox" name="areaIds" data-multi="1" value="' + y.id + '"' +
              (on ? ' checked' : '') + '><span>' + MCS.jenisArea(y.jenis).ikon + ' ' +
              U.esc(y.nama) + '</span></label>';
          }).join('') + '</div>' +
          '<div class="hint">' + T('Penyewa lantai 7 tidak berhak membaca nilai ' +
            'kebersihan lantai 3 milik penyewa lain. Angkanya pun dihitung ulang ' +
            'menurut lingkup ini, bukan sekadar disaring tampilannya.') +
          '</div></div>' }
      ]
    }).then(function (d) {
      if (!d) return;
      d.areaIds = [].concat(d.areaIds || []);
      var r = x ? PORTAL.ubah(id, d) : PORTAL.buat(k.id, d, APP.user);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      if (r.portal) dialogTautanSiap(r.portal);
      else UI.toast(T('Tautan diperbarui'), 'ok');
      APP.refresh();
    });
  }

  function dialogTautanSiap(x) {
    UI.modal({
      title: T('Tautan siap dibagikan'), sub: x.nama,
      body: UI.alert('ok', T('Kirimkan tautan ini kepada penerimanya. Ia bisa ' +
          'dibuka tanpa akun, di ponsel mana pun.'), '✅') +
        '<div class="pt-tautan mt-3"><code>' + U.esc(PORTAL.tautan(x)) + '</code></div>' +
        '<p class="tbl-sub mt-2">' +
          T('Siapa pun yang memegang tautan ini bisa membukanya, dan ia bisa ' +
            'diteruskan. Cabut kapan saja bila sudah tidak seharusnya dibaca.') +
        '</p>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="pt-salin-siap" data-t="' +
          U.esc(PORTAL.tautan(x)) + '">📋 ' + T('Salin tautan') + '</button>',
      actions: { 'pt-salin-siap': function (el) { salinTautan(el.getAttribute('data-t')); } }
    });
  }

  function salinTautan(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () {
        UI.toast(T('Tautan disalin.'), 'ok');
      }, function () { UI.toast(T('Peramban menolak akses papan klip.'), 'err'); });
    } else {
      UI.toast(T('Peramban ini tidak mendukung salin otomatis.'), 'err');
    }
  }

  function mountPortal(root) {
    delegasi(root, {
      'pt-saring': function (el) { ptSaring = el.getAttribute('data-key'); APP.refresh(); },
      'pt-baru': function () { dialogPortal(null); },
      'pt-ubah': function (el) { dialogPortal(el.getAttribute('data-id')); },
      'pt-salin': function (el) {
        var x = PORTAL.satu(el.getAttribute('data-id'));
        if (x) salinTautan(PORTAL.tautan(x));
      },
      'pt-buka': function (el) {
        var x = PORTAL.satu(el.getAttribute('data-id'));
        if (x) window.open(PORTAL.tautan(x), '_blank');
      },
      'pt-cabut': function (el) {
        var id = el.getAttribute('data-id');
        var x = PORTAL.satu(id);
        UI.konfirm({ title: T('Cabut tautan') + '?', danger: true,
          text: (x ? x.nama + '. ' : '') +
            T('Tautannya berhenti berfungsi seketika. Riwayat pembukaannya tetap ' +
              'tersimpan, dan ia bisa diaktifkan lagi.') }).then(function (ya) {
          if (!ya) return;
          PORTAL.cabut(id);
          UI.toast(T('Tautan dicabut.'), 'ok');
          APP.refresh();
        });
      },
      'pt-aktif': function (el) {
        PORTAL.aktifkan(el.getAttribute('data-id'));
        UI.toast(T('Tautan diaktifkan lagi.'), 'ok');
        APP.refresh();
      },
      'pt-hapus': function (el) {
        var id = el.getAttribute('data-id');
        UI.konfirm({ title: T('Hapus tautan') + '?', danger: true,
          text: T('Menghapus menghilangkan jejak siapa yang pernah punya akses dan ' +
            'berapa kali dibuka — pertanyaan yang justru muncul setelah ada yang ' +
            'salah. Mencabut lebih aman daripada menghapus.') }).then(function (ya) {
          if (!ya) return;
          PORTAL.hapus(id);
          UI.toast(T('Tautan dihapus.'), 'ok');
          APP.refresh();
        });
      }
    });
  }

  /* ============================================ BEBAN KERJA (WORKLOADING)

     Menjawab pertanyaan yang paling mahal bagi korporat: berapa orang yang
     sebenarnya dibutuhkan gedung ini. Sebelumnya MCS hanya bisa menjawab
     'berapa slot jadwal per minggu' — angka yang mengikuti cara jadwalnya
     disusun, bukan besarnya pekerjaan.
   */

  var kpTahun = null, kpBulan = null, kpBuka = null;

  function kpPeriode() {
    var d = new Date();
    return KPI.periodeBulan(kpTahun || d.getFullYear(), kpBulan || (d.getMonth() + 1));
  }

  /* ======================================================= STRUKTUR & CAPAIAN

     Satu pohon yang menjawab pertanyaan yang selama ini berada di antara dua
     layar yang sudah ada: Beranda menjawab "apa yang terjadi hari ini",
     Penilaian Kinerja menjawab "bagaimana orang ini" — dan tidak satu pun
     menjawab "bagaimana dua puluh satu cabang di bawah Area Manager I".

     TERTUTUP SAAT DIBUKA, kecuali tingkat teratas. Delapan puluh tujuh cabang
     beserta regunya adalah sekitar empat ratus baris; menggambarnya
     sekaligus menghasilkan halaman yang harus digulir sebelum bisa dibaca,
     dan sudah pernah terbukti menggantung halaman lain di aplikasi ini.
     Yang dibuka pengguna sendiri jumlahnya selalu sedikit. */

  var hrBuka = {};

  var hrHari = 30;
  /* “Buka semua” disimpan sebagai KEADAAN, bukan sebagai daftar id yang
     ditandai satu per satu.

     Versi pertama mengumpulkan idnya dengan memanggil HIRARKI.pohon() di
     dalam penanganan kliknya — lalu APP.refresh() memanggilnya sekali lagi
     untuk menggambar. Dua sapuan penuh atas tiga puluh hari untuk satu
     tekanan tombol: 1.112 md, dan separuhnya membuang hasil yang baru saja
     dihitung. Sebuah bendera menjawab pertanyaan yang sama tanpa menyentuh
     data sama sekali. */

  var hrSemua = false;
  /* Ketika “buka semua” menyala, yang dilacak justru yang DITUTUP.

     Versi sebelumnya menutup satu baris dengan melepas benderanya lalu
     menandai seluruh baris lain sebagai terbuka — dibaca dari DOM. Itu
     terlihat benar dan salah dengan cara yang tidak muncul di galat mana
     pun: menggambar pohon penuh memakan tujuh ratus milidetik, dan siapa
     pun yang menekan sebuah baris sebelum gambarnya selesai menandai DOM
     LAMA — lima baris, bukan seratus delapan puluh sembilan. Seluruh
     pohonnya runtuh menjadi sembilan baris tanpa satu pun petunjuk kenapa.
     Ketahuan saat dicoba, bukan saat dibaca.

     Dua peta menjawab pertanyaan yang sama tanpa pernah membaca layar. */

  var hrTutup = {};

  function hrTerbuka(id) { return hrSemua ? !hrTutup[id] : !!hrBuka[id]; }

  function hrRingkas(r) {
    var bagian = [];
    bagian.push('<b>' + U.num(r.selesai) + '</b><span class="muted">/' +
      U.num(r.tugas) + '</span>');
    bagian.push(r.persen === null
      ? '<span class="muted">' + T('belum ada tugas') + '</span>'
      : '<span class="chip chip--' +
        (r.persen >= 80 ? 'ok' : r.persen >= 50 ? 'warn' : 'danger') + '">' +
        r.persen + '%</span>');
    bagian.push(selMutu(r.mutu, { ringkas: true }));
    bagian.push(r.hadir === null
      ? '<span class="muted">—</span>'
      : '<span class="chip chip--muted">' + T('hadir') + ' ' + r.hadir + '%</span>');
    return '<div class="row wrap" style="gap:6px;justify-content:flex-end">' +
      bagian.join('') + '</div>';
  }

  /* Satu baris pohon. `sisip` mengatur lekukannya; ikon segitiga hanya
     digambar bila simpulnya memang punya anak — panah yang tidak membuka
     apa-apa mengajari orang bahwa panah tidak berarti apa-apa. */

  function hrBaris(n, dalam, punyaAnak, tambahan) {
    var buka = hrTerbuka(n.id);
    return '<div class="hr-b hr-b--' + n.tingkat + '"' +
        (punyaAnak ? ' data-act="hr-buka" data-id="' + U.esc(n.id) + '"' : '') +
        ' style="padding-left:' + (10 + dalam * 18) + 'px">' +
      '<div class="hr-b__k">' +
        (punyaAnak
          ? '<span class="hr-b__t' + (buka ? ' hr-b__t--buka' : '') + '">▸</span>'
          : '<span class="hr-b__t hr-b__t--kosong"></span>') +
        '<div style="min-width:0">' +
          '<div class="hr-b__n">' + U.esc(n.nama) + '</div>' +
          (tambahan ? '<div class="tbl-sub">' + tambahan + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hr-b__a">' + hrRingkas(n.ringkas) + '</div>' +
    '</div>';
  }

  function hrPetugas(n, dalam) {
    return hrBaris(n, dalam, false, T(n.jabatan.nama));
  }

  function hrRegu(n, dalam) {
    var isi = hrBaris(n, dalam, n.anak.length,
      (n.ketua ? T('Ketua') + ': ' + U.esc(n.ketua.nama) : '<span class="mcs-warn">' +
        T('tanpa ketua') + '</span>') +
      ' · ' + jml(n.anak.length, T('1 anggota'), T('{n} anggota')));
    if (hrTerbuka(n.id)) {
      isi += n.anak.map(function (p) { return hrPetugas(p, dalam + 1); }).join('');
    }
    return isi;
  }

  function hrCabang(n, dalam) {
    var punya = n.anak.length || n.tanpaRegu.length;
    var sub = [];
    if (n.kota) sub.push(U.esc(n.kota));
    if (n.penyelia.length) {
      sub.push(n.penyelia.map(function (u) {
        return U.esc(u.nama) + ' <span class="muted">(' + T(u.peran.nama) + ')</span>';
      }).join(', '));
    } else {
      sub.push('<span class="mcs-warn">' + T('tanpa penyelia') + '</span>');
    }
    var isi = hrBaris(n, dalam, punya, sub.join(' · '));
    if (hrTerbuka(n.id)) {
      isi += n.anak.map(function (r) { return hrRegu(r, dalam + 1); }).join('');
      if (n.tanpaRegu.length) {
        /* Disebut, tidak disembunyikan: orang yang tidak muncul di pohon mana
           pun adalah orang yang tidak pernah dinilai siapa pun. */
        isi += '<div class="hr-b hr-b--catatan" style="padding-left:' +
          (10 + (dalam + 1) * 18) + 'px">' +
          jml(n.tanpaRegu.length,
            T('1 petugas belum masuk regu mana pun'),
            T('{n} petugas belum masuk regu mana pun')) + '</div>' +
          n.tanpaRegu.map(function (p) { return hrPetugas(p, dalam + 2); }).join('');
      }
    }
    return isi;
  }

  function hrKepala(n, dalam) {
    var isi = hrBaris(n, dalam, n.anak.length,
      T(n.peran.nama) + ' · ' +
      jml(n.jumlahCabang, T('1 cabang'), T('{n} cabang')));
    if (hrTerbuka(n.id)) {
      isi += n.anak.map(function (c) { return hrCabang(c, dalam + 1); }).join('');
    }
    return isi;
  }

  function hrArea(n) {
    var isi = hrBaris(n, 0, n.anak.length,
      T(n.peran.nama) + ' · ' +
      jml(n.jumlahKepala, T('1 Kepala Cabang'), T('{n} Kepala Cabang')) + ' · ' +
      jml(n.jumlahCabang, T('1 cabang'), T('{n} cabang')));
    if (hrTerbuka(n.id)) {
      isi += n.anak.map(function (k) { return hrKepala(k, 1); }).join('');
    }
    return isi;
  }

  function renderHirarki() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var sampai = U.today();
    var p = HIRARKI.pohon(k.id, U.iso(U.addDays(U.d(sampai), -(hrHari - 1))), sampai);

    var kepalaTerbuka = p.area.length || p.tanpaArea.length;
    var dibatasiHr = !!(window.MCSAKSES && MCSAKSES.lokasiUser());

    return UI.alert('info',
      '<b>' + T('Angka setiap baris adalah jumlah baris-baris di bawahnya.') + '</b> ' +
      T('Dihitung sekali dari catatan harian, lalu dijumlahkan menaiki struktur — ' +
        'sehingga capaian seorang Area Manager selalu sama persis dengan jumlah ' +
        'capaian cabang-cabangnya, bukan angka kedua yang dihitung terpisah.'), '🧭') +
    '<div class="mb-3"></div>' +

    '<div class="row between wrap mb-3" style="gap:8px">' +
      '<div class="row wrap" style="gap:6px">' +
        [7, 30, 90].map(function (n) {
          return '<button class="btn btn--sm' + (hrHari === n ? ' btn--brand' : ' btn--ghost') +
            '" data-act="hr-hari" data-n="' + n + '">' +
            jml(n, T('1 hari'), T('{n} hari')) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="row wrap" style="gap:6px">' +
        '<button class="btn btn--ghost btn--sm" data-act="hr-semua">' + T('Buka semua') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-act="hr-tutup">' + T('Tutup semua') + '</button>' +
      '</div>' +
    '</div>' +

    /* JUDULNYA IKUT JANGKAUAN PEMBACANYA.

       “Seluruh korporat” benar untuk admin dan bohong untuk semua orang
       lain: seorang Area Manager membuka layar yang sama dan membaca judul
       itu di atas dua puluh satu cabangnya sendiri — lalu menyangka
       perusahaannya hanya punya dua puluh satu cabang, atau menyangka
       capaian nasional 24%. Angkanya benar; judulnya yang menipu. */
    UI.card({
      title: dibatasiHr ? T('Wilayah Anda') : T('Seluruh korporat'),
      sub: U.tgl(p.dari) + ' – ' + U.tgl(p.sampai) + ' · ' +
        jml(p.cabangTerhitung, T('1 cabang'), T('{n} cabang')) +
        (dibatasiHr ? ' · ' + T('bukan seluruh perusahaan') : ''),
      body: '<div class="hr-b hr-b--total">' +
        '<div class="hr-b__k"><div class="hr-b__n">' + U.esc(k.nama) + '</div></div>' +
        '<div class="hr-b__a">' + hrRingkas(p.total) + '</div></div>'
    }) + '<div class="mb-3"></div>' +

    (kepalaTerbuka
      ? UI.card({
          title: T('Struktur'),
          sub: T('Klik sebuah baris untuk membuka tingkat di bawahnya'),
          body: '<div class="hr">' +
            p.area.map(hrArea).join('') +
            (p.tanpaArea.length
              ? '<div class="hr-b hr-b--catatan">' +
                  jml(p.tanpaArea.length,
                    T('1 Kepala Cabang belum punya Area Manager'),
                    T('{n} Kepala Cabang belum punya Area Manager')) + '</div>' +
                p.tanpaArea.map(function (n) { return hrKepala(n, 0); }).join('')
              : '') +
            '</div>'
        })
      : UI.empty('🗺️', T('Belum ada Area Manager maupun Kepala Cabang'),
          T('Struktur dibaca dari peran dan atasan di layar Hak Akses.'))) +

    (p.tanpaKepala.length
      ? '<div class="mb-3"></div>' + UI.card({
          title: T('Cabang tanpa penanggung jawab'),
          sub: T('Tidak masuk hitungan siapa pun di atasnya — tetapi tetap dihitung ' +
                 'pada baris Seluruh korporat.'),
          body: '<div class="hr">' +
            p.tanpaKepala.map(function (c) { return hrCabang(c, 0); }).join('') + '</div>'
        })
      : '');
  }

  function mountHirarki(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'hr-buka': function (el) {
        var id = el.getAttribute('data-id');
        var peta = hrSemua ? hrTutup : hrBuka;
        if (peta[id]) delete peta[id]; else peta[id] = 1;
        APP.refresh();
      },
      'hr-hari': function (el) {
        hrHari = Number(el.getAttribute('data-n')) || 30;
        APP.refresh();
      },
      'hr-semua': function () { hrSemua = true; hrBuka = {}; hrTutup = {}; APP.refresh(); },
      'hr-tutup': function () { hrSemua = false; hrBuka = {}; hrTutup = {}; APP.refresh(); }
    }));
  }

  function renderKinerja() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var per = kpPeriode();
    var h = KPI.nilai(k.id, per.dari, per.sampai);
    var namaBulan = U.tglPanjang(per.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');

    return kepalaKinerja(k, per, namaBulan) +
      catatanJujur() +
      ringkasKinerja(h) +
      grafikKinerja(h) +
      daftarKinerja(h);
  }

  function kepalaKinerja(k, per, namaBulan) {
    var d = new Date();
    var iniBulanIni = (kpTahun || d.getFullYear()) === d.getFullYear() &&
                      (kpBulan || (d.getMonth() + 1)) === (d.getMonth() + 1);
    return '<div class="bd-kop">' +
        '<div class="bd-kop__n">' +
          '<h2 class="mcs-h">' + T('Penilaian kinerja') + '</h2>' +
          '<div class="tbl-sub">' + U.esc(namaBulan) +
            (iniBulanIni ? ' · ' + T('bulan berjalan, dihitung sampai hari ini') : '') +
          '</div>' +
        '</div>' +
        '<div class="bd-kop__t">' +
          '<button class="btn btn--ghost btn--sm" data-act="kp-bulan" data-d="-1">‹</button>' +
          (iniBulanIni ? '' : '<button class="btn btn--ghost btn--sm" data-act="kp-kini">' +
            T('Bulan ini') + '</button>') +
          '<button class="btn btn--ghost btn--sm" data-act="kp-bulan" data-d="1"' +
            (iniBulanIni ? ' disabled' : '') + '>›</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="kp-bobot">⚖️ ' + T('Bobot') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="kp-unduh">⬇️ ' + T('Unduh CSV') + '</button>' +
          '<button class="btn btn--sm" data-act="kp-cetak">🖨️ ' + T('Cetak') + '</button>' +
        '</div>' +
      '</div>';
  }

  /* Disebut di layar, bukan disembunyikan di dokumentasi — dan ikut tercetak
     pada tiap lembar penilaian. */

  function catatanJujur() {
    return UI.alert('info',
      '<b>' + T('Apa yang TIDAK terlihat oleh angka ini.') + '</b> ' +
      T('Skor dihitung dari yang bisa dicatat aplikasi: tugas, pemindaian tag, ' +
        'foto, inspeksi, kehadiran, dan aduan. Ia tidak melihat kesungguhan, ' +
        'kesediaan menolong rekan, keselamatan kerja, maupun mutu pekerjaan yang ' +
        'tidak pernah diinspeksi. Pakailah sebagai bahan percakapan penilaian, ' +
        'bukan penggantinya.'), 'ℹ️') + '<div class="mb-3"></div>';
  }

  function ringkasKinerja(h) {
    var r = h.ringkas;
    return '<div class="grid g-4 mb-3">' +
        UI.stat({ label: T('Dinilai'), value: r.dinilai, icon: '👥',
          meta: r.terukur < r.dinilai
            ? jml(r.dinilai - r.terukur, T('1 belum cukup data'), T('{n} belum cukup data'))
            : T('semuanya terukur') }) +
        UI.stat({ label: T('Rata-rata skor'), value: r.rata === null ? '—' : r.rata, icon: '📊',
          meta: r.rata === null ? T('belum ada yang terukur') : T('dari yang datanya cukup') }) +
        UI.stat({ label: T('Sangat baik'), value: nGrade(r, 'A'), icon: '🏅' }) +
        UI.stat({ label: T('Perlu perbaikan'), value: nGrade(r, 'D'), icon: '⚠️' }) +
      '</div>';
  }

  function nGrade(r, kode) {
    var g = r.sebaran.filter(function (x) { return x.grade.kode === kode; })[0];
    return g ? g.n : 0;
  }

  /**
   * Dua grafik yang menjawab dua pertanyaan berbeda: bagaimana pekerjaan
   * berjalan sepanjang bulan, dan bagaimana orang tersebar menurut nilainya.
   */

  function grafikKinerja(h) {
    var hari = h.perHari.filter(function (x) { return x.total; });
    return '<div class="grid g-2 mb-3">' +
      UI.card({ title: T('Penyelesaian harian'),
        sub: jml(hari.length, '1 hari berjadwal', '{n} hari berjadwal'),
        body: hari.length
          ? Chart.kolom({
              seri: [{ nama: T('Selesai'), warna: Chart.WARNA.s1 },
                     { nama: T('Belum selesai'), warna: Chart.WARNA.s2 }],
              judulA11y: T('Tugas selesai dan belum selesai per hari'),
              sumber: { teks: T('Setiap tugas berjadwal pada periode ini, ' +
                'dihitung per hari. Tugas yang belum sampai jamnya tidak ' +
                'dihitung sebagai belum selesai.'), hal: 'mcsJadwal' },
              data: hari.map(function (x) {
                return { label: String(x.tgl).slice(8), sub: String(x.tgl).slice(5, 7),
                         values: [x.selesai, Math.max(0, x.total - x.selesai)] };
              })
            })
          : UI.empty('🗓️', T('Belum ada tugas pada periode ini'), '') }) +

      UI.card({ title: T('Sebaran nilai'), sub: T('Hanya yang datanya cukup'),
        body: h.ringkas.terukur
          ? Chart.batang({
              warna: Chart.WARNA.s1,
              sumber: { teks: T('Nilai KPI tiap petugas pada periode ini, ' +
                'dikelompokkan per grade. Petugas yang tugasnya terlalu ' +
                'sedikit untuk dinilai tidak ikut dihitung.'), hal: 'mcsKinerja' },
              satuan: function (n) { return jml(n, '1 orang', '{n} orang'); },
              data: h.ringkas.sebaran.map(function (s) {
                return { nama: s.grade.kode + ' · ' + T(s.grade.nama), nilai: s.n }; })
            })
          : UI.empty('📊', T('Belum ada yang bisa dinilai'),
              T('Nilai muncul setelah ada cukup tugas tercatat pada periode ini.')) }) +
    '</div>';
  }

  function daftarKinerja(h) {
    if (!h.orang.length) {
      return UI.card({ body: UI.empty('🧹', T('Belum ada petugas'),
        T('Daftarkan petugas kebersihan dulu di menu Petugas.')) });
    }
    var ho = dpSaring('kinerja', h.orang, function (o) {
      return (o.pekerja.lokasiIds || []); });
    return UI.card({ title: T('Nilai per orang'),
      sub: T('Diurutkan dari nilai tertinggi; yang datanya belum cukup di bawah'),
      body: dpBilah('kinerja', h.orang, ho, function (o) {
          return (o.pekerja.lokasiIds || []); }) +
        '<div class="kp-list">' + dpPotong('kinerja', ho, barisKinerja) + '</div>' });
  }

  function barisKinerja(o) {
    var terbuka = kpBuka === o.pekerja.id;
    return '<div class="kp-r' + (o.cukupData ? '' : ' kp-r--kurang') + '">' +
      '<button class="kp-r__h" data-act="kp-buka" data-id="' + o.pekerja.id + '" ' +
        'aria-expanded="' + terbuka + '">' +
        '<span class="kp-r__s' + (o.grade ? ' kp-r__s--' + o.grade.warna : '') + '">' +
          (o.cukupData ? '<b>' + o.skor + '</b><i>' + o.grade.kode + '</i>'
                       : '<b>—</b>') +
        '</span>' +
        '<span class="kp-r__t">' +
          '<b>' + U.esc(o.pekerja.nama) + '</b>' +
          '<span>' + o.jabatan.ikon + ' ' + U.esc(T(o.jabatan.nama)) +
            ' · ' + jml(o.volume, '1 tugas', '{n} tugas') +
            (o.tim ? ' · ' + jml(o.tim.length, '1 anak buah', '{n} anak buah') : '') +
          '</span>' +
          (o.cukupData
            ? '<span class="kp-r__c">' + T('Cakupan data') + ' ' + o.cakupanBobot + '%</span>'
            : '<span class="kp-r__c mcs-warn">' +
              (o.kurangVolume
                ? T('Belum cukup tugas untuk dinilai — minimal {n}')
                    .replace('{n}', KPI.MIN_TUGAS)
                : T('Sebagian besar dimensi belum ada datanya')) + '</span>') +
        '</span>' +
        '<span class="kp-r__x">' + (terbuka ? '▾' : '▸') + '</span>' +
      '</button>' +
      (terbuka ? rincianKinerja(o) : '') +
    '</div>';
  }

  /** Angka pembentuk sebagai kalimat, sesuai bentuknya. */

  function capaianTeks(d) {
    if (d.bentuk === 'rata') {
      if (!d.bawah) return T('belum pernah dinilai');
      return T('rata-rata') + ' ' + U.num(d.atas) + ' ' + U.esc(d.satuan) +
        ' · ' + jml(d.bawah, '1 inspeksi', '{n} inspeksi');
    }
    if (d.bentuk === 'hitung') {
      if (!d.bawah) return T('tidak ada area tanggung jawab');
      return jml(d.atas, '1 aduan', '{n} aduan') + ' · ' +
        jml(d.bawah, T('pada 1 area'), T('pada {n} area'));
    }
    if (!d.bawah) return T('tidak ada data');
    return U.num(d.atas) + ' ' + T('dari') + ' ' + U.num(d.bawah);
  }

  function rincianKinerja(o) {
    return '<div class="kp-d">' + o.dimensi.map(function (d) {
      var mati = !d.bobot;
      var adaNilai = d.nilai !== null;
      return '<div class="kp-d__r' + (mati ? ' kp-d__r--mati' : '') + '">' +
        '<div class="kp-d__n"><b>' + U.esc(T(d.nama)) + '</b>' +
          '<span>' + U.esc(T(d.ket)) + '</span></div>' +
        '<div class="kp-d__a">' +
          /* Angka pembentuknya berdiri di samping persennya. Yang tidak setuju
             dengan nilainya berhak melihat dari mana ia datang. */
          '<span class="kp-d__f">' + capaianTeks(d) + '</span>' +
          (adaNilai
            ? '<span class="kp-d__v">' + d.nilai + '%</span>'
            : '<span class="kp-d__v kp-d__v--kosong">—</span>') +
          '<span class="kp-d__b">' + (mati ? T('tidak dinilai') : d.bobot + '%') + '</span>' +
        '</div>' +
        '<div class="kp-d__bar"><i style="width:' + (adaNilai ? d.nilai : 0) + '%"></i></div>' +
      '</div>';
    }).join('') +
      '<div class="kp-d__kaki">' +
        '<button class="btn btn--ghost btn--sm" data-act="kp-lembar" ' +
          'data-id="' + o.pekerja.id + '">🖨️ ' + T('Lembar penilaian') + '</button>' +
      '</div>' +
    '</div>';
  }

  /**
   * Lembar penilaian satu orang — yang ditandatangani dan diarsipkan.
   *
   * Ada kolom tanda tangan untuk yang dinilai, dan ruang tanggapan. Penilaian
   * yang hanya ditandatangani penilai bukan penilaian, melainkan pengumuman.
   */

  function lembarKinerja(pekerjaId) {
    var k = korp();
    var per = kpPeriode();
    var o = KPI.satu(k.id, pekerjaId, per.dari, per.sampai);
    if (!o) return;
    var namaBulan = U.tglPanjang(per.dari).replace(/^\S+,\s*/, '').replace(/^\d+\s/, '');

    UI.modal({
      title: T('Lembar penilaian'), sub: o.pekerja.nama, size: 'wide',
      body: '<div class="kp-lembar" id="kp-lembar">' +
          '<div class="kp-lembar__kop">' +
            '<div class="kp-lembar__pt">' + U.esc(k.nama) + '</div>' +
            '<div class="kp-lembar__jd">' + T('Lembar Penilaian Kinerja') + '</div>' +
            '<div class="kp-lembar__sub">' + U.esc(namaBulan) + '</div>' +
          '</div>' +

          '<table class="kp-lembar__id"><tbody>' +
            barisId(T('Nama'), o.pekerja.nama) +
            barisId(T('Nomor induk'), o.pekerja.nip || '—') +
            barisId(T('Jabatan'), T(o.jabatan.nama)) +
            barisId(T('Area tanggung jawab'), o.area.length
              ? o.area.map(function (a) { return a.nama; }).join(', ') : '—') +
            barisId(T('Periode'), per.dari + '  s/d  ' + per.sampai) +
          '</tbody></table>' +

          '<table class="kp-lembar__t"><thead><tr>' +
            '<th>' + T('Aspek yang dinilai') + '</th>' +
            '<th class="num">' + T('Capaian') + '</th>' +
            '<th class="num">' + T('Nilai') + '</th>' +
            '<th class="num">' + T('Bobot') + '</th>' +
          '</tr></thead><tbody>' +
            o.dimensi.map(function (d) {
              return '<tr' + (d.bobot ? '' : ' class="kp-lembar__mati"') + '>' +
                '<td><b>' + U.esc(T(d.nama)) + '</b><br><small>' + U.esc(T(d.ket)) + '</small></td>' +
                '<td class="num">' + capaianTeks(d) + '</td>' +
                '<td class="num">' + (d.nilai === null ? '—' : d.nilai + '%') + '</td>' +
                '<td class="num">' + (d.bobot ? d.bobot + '%' : '—') + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody><tfoot><tr>' +
            '<td colspan="2"><b>' + T('Nilai akhir') + '</b></td>' +
            '<td class="num"><b>' + (o.cukupData ? o.skor : '—') + '</b></td>' +
            '<td class="num">' + (o.grade ? o.grade.kode + ' · ' + T(o.grade.nama) : '—') + '</td>' +
          '</tr></tfoot></table>' +

          (o.cukupData
            ? '<div class="kp-lembar__ket">' +
              T('Nilai akhir dihitung dari dimensi yang ada datanya saja; cakupan ' +
                'datanya {n}% dari bobot penuh. Dimensi tanpa data DIKELUARKAN dari ' +
                'pembagi, bukan dinilai nol.').replace('{n}', o.cakupanBobot) +
              '</div>'
            : '<div class="kp-lembar__ket"><b>' + T('Tidak dinilai pada periode ini.') + '</b> ' +
              (o.kurangVolume
                ? T('Volume tugasnya di bawah batas minimal, sehingga persentase ' +
                    'apa pun tidak berarti.')
                : T('Sebagian besar dimensi belum ada datanya.')) + '</div>') +

          '<div class="kp-lembar__jujur">' +
            '<b>' + T('Apa yang TIDAK terlihat oleh angka ini.') + '</b> ' +
            T('Skor dihitung dari yang bisa dicatat aplikasi: tugas, pemindaian tag, ' +
              'foto, inspeksi, kehadiran, dan aduan. Ia tidak melihat kesungguhan, ' +
              'kesediaan menolong rekan, keselamatan kerja, maupun mutu pekerjaan yang ' +
              'tidak pernah diinspeksi. Pakailah sebagai bahan percakapan penilaian, ' +
              'bukan penggantinya.') +
          '</div>' +

          '<div class="kp-lembar__tanggap">' +
            '<b>' + T('Tanggapan yang dinilai') + '</b>' +
            '<div class="kp-lembar__garis"></div>' +
            '<div class="kp-lembar__garis"></div>' +
            '<div class="kp-lembar__garis"></div>' +
          '</div>' +

          /* Dua tanda tangan, bukan satu. Penilaian yang hanya ditandatangani
             penilai bukan penilaian, melainkan pengumuman. */
          '<div class="kp-lembar__ttd">' +
            '<div><span>' + T('Yang dinilai') + '</span><i></i><b>' +
              U.esc(o.pekerja.nama) + '</b></div>' +
            '<div><span>' + T('Penilai') + '</span><i></i><b>' +
              U.esc((APP.user && APP.user.nama) || '') + '</b></div>' +
          '</div>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn" data-act="kp-lembar-cetak">🖨️ ' + T('Cetak lembar') + '</button>',
      actions: { 'kp-lembar-cetak': function () { cetak('cetak-kp'); } }
    });
  }

  function dialogBobot() {
    var k = korp();
    var bb = KPI.bobot(k.id);
    function blok(peran, judul) {
      var l = KPI.dimensiUntuk(peran);
      var jumlah = l.reduce(function (s, d) { return s + bb[peran + '.' + d.kode]; }, 0);
      return '<div class="mcs-fs">' + U.esc(judul) +
        '<span>' + T('Jumlah bobot saat ini') + ': ' + jumlah + '%</span></div>' +
        l.map(function (d) {
          return '<label class="kp-b">' +
            '<span class="kp-b__t"><b>' + U.esc(T(d.nama)) + '</b>' +
              '<span>' + U.esc(T(d.ket)) + '</span></span>' +
            '<input class="input kp-b__i" type="number" min="0" max="100" step="5" ' +
              'name="' + peran + '.' + d.kode + '" value="' + bb[peran + '.' + d.kode] + '">' +
          '</label>';
        }).join('');
    }

    UI.formModal({
      title: T('Bobot penilaian'), size: 'wide', okText: T('Simpan bobot'),
      fields: [
        { type: 'html', html: UI.alert('info',
            T('Bobot menentukan seberapa besar tiap aspek memengaruhi nilai akhir. ' +
              'Jumlahnya tidak harus 100 — yang dipakai adalah perbandingannya. ' +
              'Beri 0 untuk mematikan sebuah aspek sama sekali.'), '⚖️') },
        { type: 'html', html: blok('pelaksana', T('Petugas pelaksana')) },
        { type: 'html', html: blok('penyelia', T('Leader & koordinator')) }
      ]
    }).then(function (d) {
      if (!d) return;
      var r = KPI.simpanBobot(k.id, d);
      if (r.error) { UI.toast(r.error, 'err'); return; }
      UI.toast(T('Bobot disimpan.'), 'ok');
      APP.refresh();
    });
  }

  /**
   * Unduh CSV.
   *
   * Dipisah titik koma dan diawali BOM: tanpa BOM, Excel membaca berkasnya
   * sebagai ANSI dan nama berhuruf non-ASCII rusak sejak baris pertama.
   */

  function unduhKinerja() {
    var k = korp();
    var per = kpPeriode();
    var h = KPI.nilai(k.id, per.dari, per.sampai);
    var isi = '\ufeff' + KPI.csv(h);
    var blob = new Blob([isi], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kinerja-' + (k.nama || 'mcs').replace(/[^\w]+/g, '-').toLowerCase() +
      '-' + per.dari.slice(0, 7) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Dibebaskan belakangan: mencabut URL-nya seketika membuat sebagian
       peramban membatalkan unduhan yang baru saja dimulai. */
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    UI.toast(T('Berkas CSV diunduh.'), 'ok');
  }

  function mountKinerja(root) {
    delegasi(root, Object.assign(dpAksi(), {
      'kp-bulan': function (el) {
        var d = new Date();
        var y = kpTahun || d.getFullYear(), m = (kpBulan || (d.getMonth() + 1)) + (+el.getAttribute('data-d'));
        if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
        /* Masa depan tidak dibuka: penilaian atas bulan yang belum terjadi
           tidak berarti apa-apa. */
        if (y > d.getFullYear() || (y === d.getFullYear() && m > d.getMonth() + 1)) return;
        kpTahun = y; kpBulan = m; kpBuka = null;
        APP.refresh();
      },
      'kp-kini': function () { kpTahun = null; kpBulan = null; kpBuka = null; APP.refresh(); },
      'kp-buka': function (el) {
        var id = el.getAttribute('data-id');
        kpBuka = kpBuka === id ? null : id;
        APP.refresh();
      },
      'kp-lembar': function (el) { lembarKinerja(el.getAttribute('data-id')); },
      'kp-bobot': dialogBobot,
      'kp-unduh': unduhKinerja,
      'kp-cetak': function () { cetak('cetak-kp-daftar'); }
    }));
    Chart.pasang(root);
  }

  /* ======================================================= CETAK TABEL

     Kertas bukan layar yang dicetak. Tombol, sakelar, lencana warna dan
     tab tidak berarti apa-apa di atas kertas — dan kolom aksi yang ikut
     tercetak justru memakan lebar yang dibutuhkan isinya.

     Karena itu tabel cetak DISUSUN ULANG dari datanya, bukan disalin dari
     tampilan. Yang di layar dipakai untuk bekerja; yang di kertas dipakai
     untuk dibawa keliling gedung, ditandatangani, dan diarsipkan.
   */

  /**
   * @param o.judul   judul lembar
   * @param o.sub     keterangan di bawah judul (periode, tanggal, saringan)
   * @param o.kolom   [{h, num?, r(baris, i)}] — r() mengembalikan TEKS, bukan HTML
   * @param o.baris   array data
   * @param o.kaki    catatan di bawah tabel (opsional)
   */

  var lapTahun = null, lapBulan = null;

  function periodeLaporan() {
    var n = new Date();
    return { tahun: lapTahun == null ? n.getFullYear() : lapTahun,
             bulan: lapBulan == null ? n.getMonth() + 1 : lapBulan };
  }

  var NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function renderLaporan() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var p = periodeLaporan();
    var r = MCS.rekapBulan(k.id, p.tahun, p.bulan);
    var n = new Date();
    var berjalan = (p.tahun === n.getFullYear() && p.bulan === n.getMonth() + 1);

    return '<div class="row between mb-3 lap-alat">' +
        '<div><h2 class="mcs-h">' + T('Laporan bulanan') + '</h2>' +
          '<div class="tbl-sub">' + T(NAMA_BULAN[p.bulan - 1]) + ' ' + p.tahun + '</div></div>' +
        '<div class="row" style="gap:8px">' +
          '<button class="btn btn--ghost btn--sm" data-act="lap-geser" data-d="-1">‹</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="lap-geser" data-d="1"' +
            (berjalan ? ' disabled' : '') + '>›</button>' +
          '<button class="btn" data-act="lap-cetak">🖨️ ' + T('Cetak / Simpan PDF') + '</button>' +
        '</div>' +
      '</div>' +

      (berjalan
        ? UI.alert('info', T('Bulan ini masih berjalan — angkanya dihitung sampai hari ini ' +
            'saja, bukan sampai akhir bulan.'), '📅') + '<div class="mb-3"></div>'
        : '') +

      '<div class="lap" id="lap-cetak-area">' + isiLaporan(k, r, p) + '</div>';
  }

  function isiLaporan(k, r, p) {
    var kop = '<div class="lap__kop">' +
        '<div class="lap__kop-t">' +
          '<div class="lap__pt">' + U.esc(k.nama) + '</div>' +
          '<h1>' + T('Laporan Kebersihan Bulanan') + '</h1>' +
          '<div class="lap__per">' + T(NAMA_BULAN[p.bulan - 1]) + ' ' + p.tahun +
            ' · ' + U.esc(r.dari) + ' — ' + U.esc(r.sampai) + '</div>' +
          (k.alamat ? '<div class="lap__al">' + U.esc(k.alamat) + '</div>' : '') +
        '</div>' +
        '<div class="lap__cap">MCS EXOCLEAN</div>' +
      '</div>';

    /* Angka utama. Dua di antaranya sengaja berdampingan: berapa yang
       DILAPORKAN selesai, dan berapa yang bisa DIBUKTIKAN. Menampilkan yang
       pertama saja adalah cara paling halus untuk menyesatkan. */
    var ringkas = '<div class="lap__ang">' +
        angka(T('Tugas dijadwalkan'), U.num(r.total), '') +
        angka(T('Selesai dilaporkan'), r.persen + '%', r.selesai + ' / ' + r.total) +
        angka(T('Disertai bukti kehadiran'), r.persenBukti + '%',
          r.berbukti + ' ' + T('dari yang selesai')) +
        angka(T('Disertai foto sesudah'), r.persenFoto + '%',
          r.berfoto + ' ' + T('dari yang selesai')) +
      '</div>';

    var jujur = UI.alert('info',
      '<b>' + T('Apa arti angka di atas.') + '</b> ' +
      T('“Selesai dilaporkan” berarti seseorang menandainya selesai di aplikasi. ' +
        '“Disertai bukti kehadiran” berarti tag area benar-benar dipindai di lokasi. ' +
        'Selisih antara keduanya adalah pekerjaan yang tidak bisa dibuktikan — bukan ' +
        'berarti tidak dikerjakan, tetapi tidak bisa ditunjukkan kepada siapa pun.'), 'ℹ️');

    /* LAPORAN INI DICETAK, jadi ia tidak boleh dipotong menurut jumlah:
       tombol "tampilkan lagi" tidak ada di atas kertas. Yang dibatasi adalah
       ARTINYA — area yang belum seratus persen. Seribu seratus delapan puluh
       baris bertuliskan 100% bukan informasi; ia lapisan yang menyembunyikan
       empat puluh tiga baris yang sungguh perlu dibaca, dan tidak ada
       pemilik gedung yang membacanya sampai habis.

       Yang sempurna tetap DIHITUNG dan disebut jumlahnya di kaki tabel,
       bukan dihilangkan diam-diam. */
    var areaPerhatian = r.area.filter(function (x) { return x.persen < 100; });
    var areaBeres = r.area.length - areaPerhatian.length;
    var perArea = UI.card({ title: T('Per area'), cls: 'mb-3',
      sub: areaBeres
        ? T('Hanya area yang belum seratus persen') + ' · ' +
          jml(areaBeres, T('1 area lainnya selesai seluruhnya'),
            T('{n} area lainnya selesai seluruhnya'))
        : T('Diurutkan dari yang paling perlu perhatian'),
      body: r.area.length
        ? (areaPerhatian.length
            ? UI.table([
                { h: T('Area'), r: function (x) { return U.esc(x.nama); } },
                { h: T('Dijadwalkan'), cls: 'num', r: function (x) { return x.total; } },
                { h: T('Selesai'), cls: 'num', r: function (x) { return x.selesai; } },
                { h: T('Terlewat'), cls: 'num', r: function (x) {
                  return x.terlewat ? '<b class="lap__mrh">' + x.terlewat + '</b>' : '—'; } },
                { h: T('Capaian'), cls: 'num', r: function (x) { return chipPersen(x.persen); } }
              ], areaPerhatian, null, { sumber: {
                teks: T('Dihitung dari tugas berjadwal tiap area pada ' +
                  'periode ini. Area yang selesai seluruhnya tidak ' +
                  'ditampilkan — jumlahnya disebut di bawah judul.'),
                hal: 'mcsJadwal', label: T('Buka jadwal') } })
            : '<div class="tbl-sub">' +
              jml(r.area.length, T('Satu-satunya area selesai seluruhnya.'),
                T('Seluruh {n} area selesai seluruhnya.')) + '</div>')
        : '<div class="tbl-sub">' + T('Tidak ada tugas pada periode ini.') + '</div>' });

    var perPetugas = UI.card({ title: T('Per petugas'), cls: 'mb-3',
      /* Disebut apa adanya: ini menghitung tugas yang TERCATAT atas namanya,
         dan pencatatnya adalah supervisor. Menyebutnya 'kinerja petugas'
         tanpa keterangan ini akan dipakai orang untuk menilai gaji. */
      sub: T('Menurut nama yang tercatat sebagai pelaksana pada laporan'),
      body: r.petugas.length
        ? (function () {
            /* Alasan yang sama dengan tabel area. Bedanya satu, dan penting:
               di sini yang tersaring adalah ORANG, dan daftar berisi nama
               orang yang capaiannya kurang bisa dibaca sebagai daftar
               tertuduh. Karena itu jumlah yang genap disebut lebih dulu di
               keterangannya — bukan sebagai catatan kaki. */
            var kurang = r.petugas.filter(function (x) { return x.persen < 100; });
            var genap = r.petugas.length - kurang.length;
            if (!kurang.length) {
              return '<div class="tbl-sub">' +
                jml(r.petugas.length, T('Satu-satunya petugas menyelesaikan seluruh tugasnya.'),
                  T('Seluruh {n} petugas menyelesaikan seluruh tugasnya.')) + '</div>';
            }
            return (genap
                ? '<div class="tbl-sub mb-2">' +
                  jml(genap, T('1 petugas menyelesaikan seluruh tugasnya'),
                    T('{n} petugas menyelesaikan seluruh tugasnya')) + '. ' +
                  T('Yang tercantum di bawah adalah yang belum genap.') + '</div>'
                : '') +
              UI.table([
                { h: T('Petugas'), r: function (x) { return U.esc(x.nama); } },
                { h: T('Tugas'), cls: 'num', r: function (x) { return x.total; } },
                { h: T('Selesai'), cls: 'num', r: function (x) { return x.selesai; } },
                { h: T('Capaian'), cls: 'num', r: function (x) { return chipPersen(x.persen); } }
              ], kurang, null, { sumber: {
                teks: T('Tugas yang TERCATAT atas nama petugas pada laporan, ' +
                  'dan yang mencatatnya adalah supervisor. Yang tugasnya ' +
                  'genap tidak ditampilkan.'),
                hal: 'mcsJadwal', label: T('Buka jadwal') } });
          })()
        : '<div class="tbl-sub">' + T('Tidak ada tugas pada periode ini.') + '</div>' });

    var kartuMutu = UI.card({ title: T('Mutu hasil pembersihan'), cls: 'mb-3',
      sub: T('Skala APPA 1–5 · dinilai oleh yang tidak mengerjakan'),
      body: r.mutu.jumlah
        ? '<div class="lap__ang lap__ang--4">' +
            angka(T('Inspeksi dilakukan'), U.num(r.mutu.jumlah), '') +
            angka(T('Rata-rata mutu'), String(r.mutu.rata), T('1 terbaik · 5 terburuk')) +
            angka(T('Penilaian buruk'), U.num(r.mutu.buruk), T('skor 4 atau 5')) +
            angka(T('Area belum dinilai'), U.num(r.mutu.areaBelumDinilai), '') +
          '</div>' +
          /* HANYA yang sudah dinilai. Sebelumnya seluruh area masuk, dan
             seribu enam puluh enam di antaranya berisi tanda pisah di kolom
             rata-rata — baris yang tidak menyampaikan apa pun kecuali bahwa
             ia belum dinilai, dan itu sudah tertulis sebagai angka tepat di
             atas tabelnya. */
          UI.table([
            { h: T('Area'), r: function (x) { return U.esc(x.nama); } },
            { h: T('Inspeksi'), cls: 'num', r: function (x) { return x.n || '—'; } },
            { h: judulMutu(), cls: 'num', r: function (x) {
              return selMutu(x.rata, { ringkas: true }); } }
          ], r.mutuArea.filter(function (x) { return x.rata != null; }), null,
            { sumber: {
              teks: T('Hasil inspeksi mutu pada periode ini, dirata-rata per ' +
                'area. Area yang belum pernah diinspeksi tidak ditampilkan.'),
              hal: 'mcsInspeksi', label: T('Buka inspeksi mutu') } })
        : '<div class="tbl-sub">' +
            T('Tidak ada inspeksi pada periode ini — mutu hasil pembersihan belum diukur.') +
          '</div>' });

    var aduan = UI.card({ title: T('Aduan penghuni'), cls: 'mb-3',
      sub: T('Laporan yang masuk lewat tag area'),
      body: r.aduan.total
        ? '<div class="lap__ang lap__ang--4">' +
            angka(T('Aduan masuk'), U.num(r.aduan.total), '') +
            angka(T('Selesai ditangani'), U.num(r.aduan.selesai), '') +
            angka(T('Dalam batas waktu'), r.aduan.persenSLA + '%',
              r.aduan.tepatWaktu + ' / ' + r.aduan.selesai) +
            angka(T('Masih terbuka'), U.num(r.aduan.terbuka), '') +
          '</div>'
        : '<div class="tbl-sub">' + T('Tidak ada aduan pada periode ini.') + '</div>' });

    var harian = UI.card({ title: T('Penyelesaian harian'), cls: 'mb-3',
      body: '<div class="mcs-bar">' + r.hari.map(function (x) {
          return '<div class="mcs-b" title="' + U.esc(x.tgl + ' — ' +
              x.selesai + '/' + x.total) + '">' +
            '<div class="mcs-b__k"><i style="height:' + (x.total ? x.persen : 0) + '%"></i></div>' +
            '<span>' + Number(x.tgl.slice(8)) + '</span>' +
          '</div>';
        }).join('') + '</div>' });

    var kaki = '<div class="lap__kaki">' +
        T('Disusun otomatis oleh MCS EXOCLEAN pada') + ' ' + U.tglPanjang(U.today()) +
        ' · ' + T('Data bersumber dari catatan pelaksanaan di aplikasi.') +
      '</div>';

    return kop + ringkas + jujur + '<div class="mb-3"></div>' +
      perArea + perPetugas + kartuMutu + aduan + harian + kaki;
  }

  function chipPersen(p) {
    var c = p >= 90 ? 'ok' : (p >= 60 ? 'warn' : 'danger');
    return '<span class="chip chip--' + c + '">' + p + '%</span>';
  }

  function mountLaporan(root) {
    delegasi(root, {
      'lap-geser': function (el) {
        var p = periodeLaporan();
        var d = new Date(p.tahun, p.bulan - 1 + (+el.getAttribute('data-d')), 1);
        var n = new Date();
        /* Bulan depan tidak bisa dibuka: tugasnya belum terjadi, dan laporan
           berisi nol untuk masa depan hanya akan membingungkan pembacanya. */
        if (d > new Date(n.getFullYear(), n.getMonth(), 1)) return;
        lapTahun = d.getFullYear(); lapBulan = d.getMonth() + 1;
        APP.refresh();
      },
      'lap-cetak': function () {
        document.body.classList.add('cetak-lap');
        window.print();
        setTimeout(function () { document.body.classList.remove('cetak-lap'); }, 500);
      }
    });
  }

  function renderAdmin() {
    var k = MCS.semua();
    return UI.alert('brand', '<b>' + T('MCS EXOCLEAN dijual sebagai perangkat lunak.') + '</b> ' +
      T('Korporat memakai petugas kebersihannya sendiri; EXOCLEAN menyediakan daftar area, ' +
        'jadwal berulang, pengingat, dan buktinya. Akun hanya bisa dibuat dari sini — ' +
        'tidak ada pendaftaran mandiri.'), '🏢') + '<div class="mb-3"></div>' +

      '<div class="row between mb-3">' +
        '<div class="hint">' + jml(k.length, '1 korporat terdaftar', '{n} korporat terdaftar') + '</div>' +
        '<button class="btn btn--primary" data-act="mcs-adm-baru">＋ ' + T('Daftarkan Korporat') + '</button>' +
      '</div>' +

      (k.length
        ? UI.card({ body: UI.table([
            { h: T('Perusahaan'), cls: 'mcs-adm__nm', r: function (x) {
              /* Sejak alamatnya terstruktur, x.kota berisi nama resmi lengkap
                 ('Kota Administrasi Jakarta Selatan'). Di dalam sel tabel ia
                 membungkus jadi enam baris dan mendorong tombol di ujung kanan
                 keluar dari layar. WILAYAH.ringkas memangkas awalan
                 administratifnya — isinya sama, bacaannya muat. */
              var kota = x.kota || '';
              if (window.WILAYAH) {
                var w = MCS.wilayahKorporat(x);
                if (w) kota = WILAYAH.ringkas(w);
              }
              return '<div class="tbl-title">' + U.esc(x.nama) + '</div>' +
                '<div class="tbl-sub">' + U.esc([x.bidang, kota].filter(Boolean).join(' · ') || '—') + '</div>'; } },
            { h: T('Staf'), r: function (x) {
              var s = MCS.stafKorporat(x.id);
              return s.length ? U.esc(s[0].nama) + '<div class="tbl-sub">' + U.esc(s[0].email) + '</div>' : '—'; } },
            { h: T('Penyiapan'), r: function (x) {
              var l = MCS.kelengkapan(x.id);
              return '<span class="chip chip--' + (l.siap ? 'ok' : 'warn') + '">' +
                l.selesai + '/' + l.total + '</span>'; } },
            { h: T('Area'), cls: 'num', r: function (x) { return MCS.area(x.id).length; } },
            { h: T('Petugas'), cls: 'num', r: function (x) { return MCS.pekerja(x.id).length; } },
            { h: T('Hari ini'), cls: 'num', r: function (x) {
              var s = MCS.statistik(x.id);
              return s.total ? s.selesai + '/' + s.total : '—'; } },
            { h: '', cls: 'act', r: function (x) {
              return '<button class="btn btn--ghost btn--sm" data-act="mcs-adm-reset" data-id="' + x.id + '">' +
                T('Atur ulang sandi') + '</button>'; } }
          ], k) })
        : UI.empty('🏢', T('Belum ada korporat'),
            T('Daftarkan klien korporat pertama Anda untuk mulai memakai MCS.')));
  }

  function mountAdmin(root) {
    delegasi(root, {
      'mcs-adm-baru': function () {
        UI.formModal({
          title: T('Daftarkan korporat'),
          sub: T('Akun staf pertama dibuat sekaligus'),
          okText: T('Buat akun'),
          size: 'wide',
          /* Alamat memakai kolom bertingkat yang SAMA dengan Profil
             Perusahaan dan alamat pengguna. Sebelumnya di sini hanya ada satu
             kolom 'Kota' berisi teks bebas — korporat yang baru didaftarkan
             jadi tidak punya alamat yang bisa dicari maupun dipakai
             menghitung apa pun, dan stafnya harus mengetik ulang dari nol.

             Boleh dikosongkan seluruhnya; yang ditolak adalah separuh
             terisi. */
          fields: [
            { name: 'nama', label: T('Nama perusahaan'), required: true, placeholder: 'PT Sinar Mandiri Abadi' },
            { name: 'bidang', label: T('Bidang usaha'), placeholder: T('mis. perbankan') },
            /* Boleh dikosongkan. Yang belum dinyatakan melihat seluruh menu —
               menebak bentuk usahanya justru menyembunyikan yang dipakai. */
            { name: 'jenis', label: T('Bentuk pengelolaan'), type: 'select',
              options: [{ value: '', label: T('— belum dinyatakan —') }].concat(
                Object.keys(MCS.JENIS_USAHA).map(function (k) {
                  return { value: k, label: T(MCS.JENIS_USAHA[k].nama) };
                })),
              hint: T('Yang mengelola sendiri tidak melihat menu Kontrak dan Tagihan — ' +
                'tidak ada klien untuk dikontrak atau ditagih.') },
            { type: 'html', html: '<div class="mcs-fs">' + T('Alamat kantor') +
              '<span>' + T('boleh dilengkapi staf korporat nanti') + '</span></div>' }
          ].concat(WILAYAH.fields(WILAYAH.kosong(), { wajib: false })).concat([
            { name: 'telp', label: T('Telepon kantor') },
            { type: 'html', html: '<div class="mcs-fs">' + T('Staf korporat pertama') +
              '<span>' + T('akun inilah yang dipakai masuk') + '</span></div>' },
            { name: 'namaStaf', label: T('Nama staf korporat'), required: true },
            { name: 'jabatanStaf', label: T('Jabatan'), value: 'Building Manager' },
            { name: 'emailStaf', label: T('Email staf'), type: 'email', required: true,
              hint: T('Dipakai untuk masuk. Belum bisa dipakai akun lain.') },
            { name: 'telpStaf', label: T('HP staf') }
          ]),
          validate: function (d) {
            return WILAYAH.periksa(WILAYAH.dariForm(d), { wajib: false });
          },
          onMount: function (root) { WILAYAH.pasang(root); }
        }).then(function (d) {
          if (!d) return;
          d.wilayah = WILAYAH.dariForm(d);
          var r = MCS.buatKorporat(d, APP.user.id);
          if (r.error) { UI.toast(r.error, 'err'); return; }
          tampilkanSandi(r.korporat, r.user, r.sandiAwal);
          APP.refresh();
        });
      },
      'mcs-adm-reset': function (el) {
        var k = MCS.korporat(el.getAttribute('data-id'));
        var s = MCS.stafKorporat(k.id)[0];
        if (!s) { UI.toast(T('Korporat ini belum punya akun staf.'), 'err'); return; }
        UI.konfirm({
          title: T('Atur ulang kata sandi?'),
          htmlText: U.esc(s.nama) + ' — ' + U.esc(s.email) + '<br><br>' +
            T('Sandi lama langsung tidak berlaku, dan yang bersangkutan wajib menggantinya ' +
              'saat masuk berikutnya.'),
          okText: T('Atur ulang'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          var baru = MCS.buatSandiSementara(s.id);
          tampilkanSandi(k, s, baru);
          APP.refresh();
        });
      }
    });
  }

  /**
   * Sandi sementara ditampilkan SEKALI.
   *
   * Yang tersimpan hanya turunannya, jadi layar ini satu-satunya kesempatan
   * membacanya. Disebutkan terang-terangan supaya admin menyalinnya sekarang,
   * bukan berasumsi bisa kembali nanti.
   */

  function tampilkanSandi(k, u, sandi) {
    UI.modal({
      title: T('Akun korporat siap'),
      sub: U.esc(k.nama),
      body: '<div class="mcs-sandi">' +
          '<div class="tbl-sub">' + T('Serahkan kepada') + ' <b>' + U.esc(u.nama) + '</b></div>' +
          '<div class="mcs-sandi__b">' +
            '<div><span>' + T('Email') + '</span><b>' + U.esc(u.email) + '</b></div>' +
            '<div><span>' + T('Kata sandi sementara') + '</span><b class="code">' + U.esc(sandi) + '</b></div>' +
          '</div>' +
          '<div class="kh-sebab">⚠️ ' +
            T('Sandi ini hanya ditampilkan sekali dan tidak bisa dibaca lagi dari mana pun. ' +
              'Salin sekarang. Yang bersangkutan wajib menggantinya saat pertama masuk.') +
          '</div>' +
        '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>' +
        '<button class="btn btn--primary" data-act="salin">' + T('Salin ke papan klip') + '</button>',
      actions: {
        salin: function () {
          var teks = k.nama + '\n' + T('Email') + ': ' + u.email + '\n' +
            T('Kata sandi sementara') + ': ' + sandi;
          if (navigator.clipboard) navigator.clipboard.writeText(teks);
          UI.toast(T('Disalin'), 'ok');
        }
      }
    });
  }

  /* ================================================================ PAGES */

  /* ==================================================== KEHADIRAN PETUGAS */

  var pfHari = 30;

  function renderPortofolio() {
    var k = korp();
    if (!k) return UI.empty('🏢', T('Data korporat tidak ditemukan'), '');
    var daftar = LOKASI.semua(k.id);
    if (!daftar.length) {
      return UI.empty('🏙️', T('Portofolio berguna ketika gedungnya lebih dari satu'),
        T('Daftarkan gedung lewat Pengaturan → Gedung, lalu tetapkan areanya. ' +
          'Halaman ini akan membandingkan gedung-gedung itu berdampingan.'));
    }
    var baris = LOKASI.portofolio(k.id, pfHari);
    var t = LOKASI.total(baris);

    /* Judul halaman datang dari kerangka aplikasi; menuliskannya lagi di
       sini menghasilkan judul yang sama dua kali bertumpuk. */
    return '<div class="row row--sb mb-3">' +
        '<div class="hint">' + jml(pfHari, '1 hari terakhir', '{n} hari terakhir') +
          '</div>' +
        '<div class="row" style="gap:6px">' +
          [7, 30, 90].map(function (h) {
            return '<button class="btn btn--sm ' + (h === pfHari ? '' : 'btn--ghost') +
              '" data-act="pf-hari" data-h="' + h + '">' + h + '</button>';
          }).join('') +
          '<button class="btn btn--ghost btn--sm" data-act="pf-cetak">🖨 ' +
            T('Cetak') + '</button>' +
        '</div>' +
      '</div>' +
      catatanPortofolio() +
      tabelPortofolio(baris, t);
  }

  function catatanPortofolio() {
    return '<div class="alert alert--info mb-3"><span class="ic">ℹ️</span><div>' +
      '<b>' + T('Angka ini membandingkan, bukan menilai.') + '</b> ' +
      T('Gedung dengan seratus area dan gedung dengan lima tidak bisa dinilai ' +
        'dengan ukuran yang sama. Yang berguna di sini adalah PERUBAHANNYA — ' +
        'gedung yang biasanya 95% lalu turun ke 70% jauh lebih layak ditanyakan ' +
        'daripada gedung yang memang selalu 70% karena bebannya berlebih.') +
      '</div></div>';
  }

  function tabelPortofolio(baris, t) {
    /* Diurutkan menurut yang paling tertinggal lebih dulu — bukan menurut
       abjad. Layar yang gunanya menemukan masalah harus menaruh masalahnya
       di baris pertama. */
    var urut = baris.slice().sort(function (a, b) {
      if (a.persen == null && b.persen == null) return 0;
      if (a.persen == null) return 1;
      if (b.persen == null) return -1;
      return a.persen - b.persen;
    });

    return UI.bilahSumber({
      teks: T('Digulung dari tugas berjadwal, hasil inspeksi, dan aduan tiap ' +
        'gedung pada periode ini. Gedung tanpa jadwal tidak punya angka ' +
        'capaian — kosongnya berarti belum dijadwalkan, bukan gagal.'),
      hal: 'mcsJadwal', label: T('Buka jadwal') }) +
      '<div class="tbl-wrap"><table class="tbl pf-t"><thead><tr>' +
      '<th>' + T('Gedung') + '</th>' +
      '<th class="ta-r">' + T('Area') + '</th>' +
      '<th class="ta-r">' + T('Selesai') + '</th>' +
      '<th class="ta-r">' + T('Tertinggal') + '</th>' +
      '<th class="ta-r">' + judulMutu() + '</th>' +
      '<th class="ta-r">' + T('Aduan') + '</th>' +
      '</tr></thead><tbody>' +
      urut.map(barisPortofolio).join('') +
      '</tbody><tfoot><tr>' +
        '<th>' + T('Seluruhnya') + '</th>' +
        '<th class="ta-r">' + U.num(t.area) + '</th>' +
        '<th class="ta-r">' + (t.persen == null ? '—' : t.persen + '%') + '</th>' +
        '<th class="ta-r">' + (t.tertinggal || '—') + '</th>' +
        '<th class="ta-r">' +
          (t.skor == null ? '—' : selMutu(Math.round(t.skor * 10) / 10)) + '</th>' +
        '<th class="ta-r">' + (t.aduanTerbuka || '—') + '</th>' +
      '</tr></tfoot></table></div>';
  }

  function barisPortofolio(b) {
    var warnaPersen = b.persen == null ? 'muted'
      : b.persen >= 90 ? 'ok' : b.persen >= 70 ? 'warn' : 'danger';
    return '<tr>' +
      '<td><b>' + U.esc(b.nama) + '</b>' +
        (b.luas ? '<div class="tbl-sub">' + U.num(b.luas) + ' m²</div>' : '') + '</td>' +
      '<td class="ta-r">' + U.num(b.area) + '</td>' +
      '<td class="ta-r">' +
        (b.persen == null
          /* Tidak ada tugas sama sekali BUKAN nol persen. Menampilkan
             keduanya sebagai 0% membuat gedung yang belum dijadwalkan
             terlihat seperti gedung yang gagal total. */
          ? '<span class="tbl-sub">' + T('belum dijadwalkan') + '</span>'
          : '<span class="chip chip--' + warnaPersen + '">' + b.persen + '%</span>' +
            '<div class="tbl-sub">' + U.num(b.selesai) + ' / ' + U.num(b.tugas) + '</div>') +
      '</td>' +
      '<td class="ta-r">' + (b.tertinggal
        ? '<span class="mcs-warn">' + U.num(b.tertinggal) + '</span>' : '—') +
        (b.dilewati ? '<div class="tbl-sub">' + jml(b.dilewati, '1 dilewati',
          '{n} dilewati') + '</div>' : '') + '</td>' +
      '<td class="ta-r">' + (b.skor == null
        ? '<span class="tbl-sub">' + T('belum diinspeksi') + '</span>'
        : selMutu(Math.round(b.skor * 10) / 10) + '<div class="tbl-sub">' +
          jml(b.inspeksi, '1 inspeksi', '{n} inspeksi') + '</div>') + '</td>' +
      '<td class="ta-r">' + (b.aduanTerbuka
        ? U.num(b.aduanTerbuka) +
          (b.aduanLewatSLA ? '<div class="tbl-sub mcs-warn">' +
            jml(b.aduanLewatSLA, '1 lewat SLA', '{n} lewat SLA') + '</div>' : '')
        : '—') + '</td>' +
    '</tr>';
  }

  function mountPortofolio(root) {
    delegasi(root, {
      'pf-hari': function (el) {
        pfHari = Number(el.getAttribute('data-h')) || 30;
        APP.refresh();
      },
      'pf-cetak': cetakPortofolio
    });
  }

  function cetakPortofolio() {
    var k = korp();
    if (!k) return;
    var baris = LOKASI.portofolio(k.id, pfHari);
    /* Dipakai cetakDaftar, yang MENYUSUN ULANG tabelnya dari data sebagai
       teks polos — bukan menyalin HTML layar. Chip berwarna dan angka kecil
       di bawah angka besar tidak terbaca di kertas hitam-putih, dan tabel
       cetak yang menyalin layar selalu kehilangan justru kolom yang dicari
       orang yang mencetaknya. */
    cetakDaftar({
      judul: T('Portofolio Gedung'),
      sub: jml(pfHari, '1 hari terakhir', '{n} hari terakhir') + ' · ' +
        U.tglPanjang(U.today()),
      kolom: [
        { h: T('Gedung'), r: function (b) { return b.nama; } },
        { h: T('Area'), num: true, r: function (b) { return b.area; } },
        { h: T('Luas (m²)'), num: true, r: function (b) { return b.luas || ''; } },
        { h: T('Tugas'), num: true, r: function (b) { return b.tugas || ''; } },
        { h: T('Selesai'), num: true, r: function (b) {
            return b.persen == null ? T('belum dijadwalkan') : b.persen + '%'; } },
        { h: T('Tertinggal'), num: true, r: function (b) { return b.tertinggal || ''; } },
        /* Lembar CETAK, dan justru di kertas keterangannya paling perlu:
           kertas berpindah tangan tanpa membawa layar tempat ia dibuat, dan
           tidak ada tooltip yang bisa ditunjuk. Angka ditemani katanya
           seperti di layar — selMutu() menghasilkan HTML berchip yang tidak
           cocok untuk tabel cetak, jadi di sini kata itu ditulis polos. */
        { h: judulMutu(), num: true, r: function (b) {
            if (b.skor == null) return '';
            var r2 = Math.round(b.skor * 10) / 10;
            return r2 + ' · ' + T(MCS.mutu(Math.round(b.skor)).nama); } },
        { h: T('Inspeksi'), num: true, r: function (b) { return b.inspeksi || ''; } },
        { h: T('Aduan terbuka'), num: true, r: function (b) { return b.aduanTerbuka || ''; } }
      ],
      baris: baris,
      kaki: T('Angka ini membandingkan, bukan menilai — gedung dengan beban ' +
        'berbeda tidak bisa diukur dengan ukuran yang sama. Skor mutu memakai ' +
        'skala APPA 1–5; di sana angka KECIL lebih baik.')
    });
  }


  /* ================================================================== GAJI
     Dari absensi menjadi slip. Angkanya berbasis HARI, bukan jam — absensi
     di aplikasi ini memang mencatat kehadiran harian, dan berpura-pura tahu
     jam kerja akan menghasilkan slip yang tidak bisa dipertanggungjawabkan. */

  /* Layar publik dipasang ke VMCS supaya perakit bisa mengekspornya lewat
     ViewMCS.layarPublik — app.js memanggilnya sebelum ada sesi. */
  VMCS.layarPublik = layarPublik;

  /* --------------------------------------------------------------- halaman */
  VMCS.daftar("korporat", "mcsLaporan", { label: 'Laporan', icon: '📈', grup: 'Utama',
      render: renderLaporan, mount: mountLaporan });

  VMCS.daftar("korporat", "mcsPortal", { label: 'Portal Pemilik Gedung', icon: '🔗', grup: 'Pengaturan',
      sub: 'Tautan laporan baca-saja untuk pemilik dan penyewa',
      render: renderPortal, mount: mountPortal });

  VMCS.daftar("korporat", "mcsKinerja", { label: 'Penilaian Kinerja', icon: '🏅', grup: 'Utama',
      sub: 'KPI petugas, leader, dan koordinator',
      render: renderKinerja, mount: mountKinerja });

  VMCS.daftar("korporat", "mcsHirarki", { label: 'Struktur & Capaian', icon: '🧭', grup: 'Utama',
      sub: 'Capaian dijumlahkan dari petugas sampai Area Manager',
      render: renderHirarki, mount: mountHirarki });

  VMCS.daftar("korporat", "mcsPortofolio", { label: 'Portofolio', icon: '🏙️', grup: 'Utama',
      sub: 'Bandingkan gedung berdampingan — mana yang sedang tertinggal',
      /* Getter, bukan nilai tetap: jumlah gedung berubah selama sesi
         berjalan, dan menu harus ikut berubah tanpa memuat ulang halaman.
         Pelanggan satu gedung tidak melihat menu ini sama sekali —
         membebani yang kecil demi melayani yang besar adalah cara paling
         umum membuat aplikasi terasa rumit tanpa sebab. */
      get tersembunyi() {
        var k = MCS.korporatUser(APP.user);
        return !k || !LOKASI.banyak(k.id);
      },
      render: renderPortofolio, mount: mountPortofolio });

  VMCS.daftar("admin", "korporat", { label: 'Klien Korporat (MCS)', icon: '🏢', grup: 'Master Data',
      render: renderAdmin, mount: mountAdmin,
      badge: function () {
        return MCS.semua().filter(function (k) { return !MCS.kelengkapan(k.id).siap; }).length;
      } });
})();
