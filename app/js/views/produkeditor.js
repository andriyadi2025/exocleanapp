/* ==========================================================================
   views/produkeditor.js — layar menyusun produk toko, bertahap
   --------------------------------------------------------------------------
   SATU HALAMAN PENUH, BUKAN SATU DIALOG PANJANG

   Dialog memaksa seluruh isi muat dalam satu gulungan, dan menutupnya —
   sengaja atau tidak — membuang semuanya. Menyusun produk marketplace butuh
   foto, harga bertingkat, spesifikasi, dan ukuran kirim; itu bukan sesuatu
   yang diselesaikan dalam satu tarikan napas di atas layar yang mengambang.

   YANG DIKETIK LANGSUNG TERSIMPAN

   Tiap kolom menyimpan ke draf begitu ditinggalkan, bukan menunggu tombol.
   Karena itu tidak ada tombol "Simpan" per langkah — tombol semacam itu
   menciptakan pertanyaan "apa yang hilang kalau saya tidak menekannya", dan
   jawabannya harus selalu "tidak ada".

   YANG BELUM LENGKAP DISEBUT, BUKAN CUMA DIHITUNG

   Panel kanan menampilkan daftar apa yang masih kurang berikut langkah
   tempatnya. Angka persen sendirian hanya memberi tahu ada yang salah tanpa
   memberi tahu di mana — dan orang akan menebak-nebak sambil membuka tiap
   langkah satu per satu.
   ========================================================================== */
var ViewProdukEditor = (function () {
  'use strict';

  var T = function (s) { return I18N.t(s); };

  var langkahAktif = 'info';
  var idAktif = null;

  function produk() { return idAktif ? DB.find('products', idAktif) : null; }

  function simpan(patch) {
    if (!idAktif) return;
    PRODUKED.simpan(idAktif, patch);
  }

  /* ================================================================ RANGKA */

  function render(params) {
    /* Halaman ini selalu bekerja pada satu produk. Dibuka tanpa id — dari
       alamat langsung, atau setelah drafnya dihapus — ia membuatkan draf baru
       daripada menampilkan layar kosong yang tidak bisa diapa-apakan. */
    var id = (params && params.id) || idAktif;
    var p = id ? DB.find('products', id) : null;
    if (!p) {
      p = PRODUKED.baru(APP.user.id);
      langkahAktif = 'info';
    }
    idAktif = p.id;

    var cek = PRODUKED.periksa(p);
    var st = PRODUKED.STATUS[p.statusProduk || 'draf'] || PRODUKED.STATUS.draf;

    return '<div class="pe">' +
      '<div class="pe__kepala">' +
        '<button class="btn btn--ghost btn--sm" data-act="kembali">‹ ' + T('Produk Saya') + '</button>' +
        '<div class="spacer"></div>' +
        '<span class="chip chip--' + st.c + ' chip--xs">' + T(st.t) + '</span>' +
        /* Membuang draf hanya ditawarkan pada draf. Produk yang sudah diajukan
           ditarik lewat moderasi — menghapusnya diam-diam dari sini akan
           melenyapkan barang yang mungkin sudah dilihat admin. */
        (p.statusProduk === 'draf'
          ? ' <button class="btn btn--ghost btn--sm" data-act="buang-draf">' +
            T('Buang draf') + '</button>'
          : '') +
      '</div>' +

      '<div class="pe__grid">' +
        '<nav class="pe__langkah">' +
          PRODUKED.LANGKAH.map(function (l) {
            var n = PRODUKED.kurangDi(p, l.id).length;
            return '<button class="pe-l' + (langkahAktif === l.id ? ' aktif' : '') + '" ' +
              'data-act="langkah" data-l="' + l.id + '">' +
              '<span class="pe-l__ic">' + l.ic + '</span>' +
              '<span class="pe-l__t">' + U.esc(T(l.nama)) + '</span>' +
              (n ? '<span class="pe-l__n">' + n + '</span>' : '') +
            '</button>';
          }).join('') +
        '</nav>' +

        '<div class="pe__isi">' + isiLangkah(p) + '</div>' +

        '<aside class="pe__sisi">' +
          UI.card({ title: T('Kelengkapan'), body: panelSiap(p, cek, st) }) +
        '</aside>' +
      '</div>' +
    '</div>';
  }

  function panelSiap(p, cek, st) {
    return '<div class="pe-bar"><div class="pe-bar__isi" style="width:' + cek.persen + '%"></div></div>' +
      '<div class="row mt-1"><b>' + cek.persen + '%</b><div class="spacer"></div>' +
        '<span class="tbl-sub">' +
          (cek.siap ? T('Siap diajukan')
                    : T(cek.kurang.length === 1 ? '1 hal perlu dilengkapi' : '{n} hal perlu dilengkapi')
                        .replace('{n}', cek.kurang.length)) +
        '</span></div>' +

      (cek.kurang.length
        ? '<ul class="pe-kurang">' + cek.kurang.map(function (x) {
            var l = PRODUKED.LANGKAH.filter(function (y) { return y.id === x.langkah; })[0];
            return '<li><button class="pe-kurang__ke" data-act="langkah" data-l="' + x.langkah + '">' +
              (l ? l.ic + ' ' + U.esc(T(l.nama)) : '') + '</button>' +
              '<span>' + U.esc(T(x.teks)) + '</span></li>';
          }).join('') + '</ul>'
        : '<div class="tbl-sub mt-2">' + T(st.ket) + '</div>') +

      '<div class="mt-2">' +
        (p.statusProduk === 'menunggu'
          ? '<div class="tbl-sub">' + T('Sudah diajukan. Anda masih bisa menyuntingnya; perubahan ' +
              'akan ikut ditinjau.') + '</div>'
          : '') +
        /* Tombol ajukan tidak disembunyikan saat belum lengkap — ia tetap
           terlihat tetapi mati, supaya jelas ke mana semua ini bermuara. */
        '<button class="btn btn--blok" data-act="ajukan"' + (cek.siap ? '' : ' disabled') + '>' +
          T('Ajukan untuk moderasi') + '</button>' +
        (cek.siap ? '' : '<div class="tbl-sub mt-1">' +
          T('Lengkapi dulu daftar di atas.') + '</div>') +
      '</div>' +

      '<div class="pe-pratinjau mt-3">' +
        '<div class="tbl-sub mb-1">' + T('Tampak di katalog') + '</div>' +
        kartuPratinjau(p) +
      '</div>';
  }

  /* Pratinjau memakai angka yang sama dengan katalog, bukan tiruan: kalau
     ditulis ulang di sini, ia akan mulai berbeda pada perubahan berikutnya
     yang cuma dikerjakan di satu sisi. */
  function kartuPratinjau(p) {
    var foto = MEDIA.produk(p).filter(function (m) { return m.jenis === 'foto'; })[0];
    var h = PRODUKED.hargaUntuk(p, PRODUKED.minOrder(p));
    return '<div class="pe-kartu">' +
      '<div class="pe-kartu__gbr">' +
        (foto && foto.data ? '<img src="' + foto.data + '" alt="">' : '<span>' + (p.icon || '📦') + '</span>') +
      '</div>' +
      '<div class="pe-kartu__isi">' +
        '<div class="pe-kartu__nama">' + U.esc(p.nama || T('(belum ada nama)')) + '</div>' +
        '<b>' + (p.harga > 0 ? U.rp(h.harga) : '—') + '</b>' +
        (h.harga !== p.harga && p.harga > 0
          ? ' <s class="tbl-sub">' + U.rp(p.harga) + '</s>' : '') +
        '<div class="tbl-sub">' + U.esc(p.satuan || 'unit') + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================== LANGKAH */

  function baris(label, isi, hint) {
    return '<label class="pe-f"><span class="pe-f__l">' + U.esc(T(label)) + '</span>' + isi +
      (hint ? '<small class="pe-f__h">' + U.esc(T(hint)) + '</small>' : '') + '</label>';
  }
  function teks(nama, nilai, ph) {
    return '<input class="input" data-change="f" data-n="' + nama + '" value="' +
      U.esc(nilai === null || nilai === undefined ? '' : nilai) + '"' +
      (ph ? ' placeholder="' + U.esc(T(ph)) + '"' : '') + '>';
  }
  function angka(nama, nilai, ph) {
    return '<input class="input" type="number" min="0" data-change="f" data-n="' + nama + '" value="' +
      (nilai === null || nilai === undefined || nilai === 0 ? '' : nilai) + '"' +
      (ph ? ' placeholder="' + U.esc(T(ph)) + '"' : '') + '>';
  }
  function pilih(nama, nilai, opsi) {
    return '<select class="select" data-change="f" data-n="' + nama + '">' +
      opsi.map(function (o) {
        var v = o.value === undefined ? o : o.value, l = o.label === undefined ? o : o.label;
        return '<option value="' + U.esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') +
          '>' + U.esc(T(l)) + '</option>';
      }).join('') + '</select>';
  }

  function isiLangkah(p) {
    if (langkahAktif === 'media') return langkahMedia(p);
    if (langkahAktif === 'varian') return langkahVarian(p);
    if (langkahAktif === 'harga') return langkahHarga(p);
    if (langkahAktif === 'stok') return langkahStok(p);
    if (langkahAktif === 'kirim') return langkahKirim(p);
    if (langkahAktif === 'spek') return langkahSpek(p);
    return langkahInfo(p);
  }

  function langkahInfo(p) {
    return UI.card({ title: T('Informasi Produk'), sub: T('Yang pertama dibaca pembeli'), body:
      baris(T('Nama produk'), teks('nama', p.nama, 'mis. Floor Cleaner Pine 20L (Jerigen)'),
        T('Sebutkan jenis, ukuran, dan isi kemasan. Nama yang jelas lebih mudah ditemukan.')) +
      '<div class="pe-2">' +
        baris('Kategori', pilih('kategori', p.kategori, PRODUKED.KATEGORI)) +
        baris('Merek', teks('merek', p.merek, 'mis. BersihPro')) +
      '</div>' +
      '<div class="pe-2">' +
        baris('Kondisi', pilih('kondisi', p.kondisi || 'baru',
          [{ value: 'baru', label: T('Baru') }, { value: 'bekas', label: T('Bekas') }])) +
        baris('Ikon (emoji)', teks('icon', p.icon, '📦'),
          T('Dipakai bila produk belum berfoto.')) +
      '</div>' +
      baris('Deskripsi', '<textarea class="input" rows="6" data-change="f" data-n="deskripsi" ' +
        'placeholder="' + T('Kegunaan, isi kemasan, cara pakai, dan keunggulannya.') + '">' +
        U.esc(p.deskripsi || '') + '</textarea>',
        T('Tulis apa adanya. Klaim yang tidak bisa dibuktikan akan ditolak saat moderasi.'))
    });
  }

  function langkahMedia(p) {
    var n = MEDIA.ringkas(p);
    var m = MEDIA.produk(p);
    return UI.card({ title: T('Foto & Video'),
      sub: T('Foto pertama dipakai sebagai gambar utama'),
      body:
        (m.length
          ? '<div class="pe-media">' + m.map(function (x, i) {
              return '<div class="pe-media__x">' +
                (x.jenis === 'foto' && x.data
                  ? '<img src="' + x.data + '" alt="">'
                  : '<span class="pe-media__ic">' + MEDIA.ikon(x) + '</span>') +
                (i === 0 ? '<span class="pe-media__utama">' + T('Utama') + '</span>' : '') +
              '</div>';
            }).join('') + '</div>'
          : UI.empty('🖼️', T('Belum ada foto'),
              T('Produk tanpa foto jarang dibuka pembeli, dan tidak bisa diajukan.'))) +

        '<div class="row mt-2">' +
          '<span class="tbl-sub">' + n.foto + ' ' + T('foto') + ' · ' + n.embed + ' ' + T('video') +
            ' · ' + T('maksimal') + ' ' + MEDIA.BATAS.perProduk + '</span>' +
          '<div class="spacer"></div>' +
          '<button class="btn" data-act="kelola-media">' + T('Kelola Foto & Video') + '</button>' +
        '</div>'
    });
  }

  /**
   * Varian: sumbu pilihan (Warna, Ukuran) dan tabel kombinasinya.
   *
   * Harga dan stok pindah ke tabel ini begitu varian dipakai. Kolom harga dan
   * stok di langkah lain tetap ada tetapi menjadi HASIL — dihitung dari varian
   * dan tidak bisa diisi tangan, supaya tidak ada dua angka yang saling
   * bertentangan tentang barang yang sama.
   */
  function langkahVarian(p) {
    var opsi = VARIAN.opsi(p);
    var komb = VARIAN.kombinasi(p);
    var salah = VARIAN.periksa(p);

    return UI.card({ title: T('Varian'),
      sub: T('Warna, ukuran, dan sejenisnya — masing-masing punya stok dan harga sendiri'),
      body:
        (opsi.length
          ? opsi.map(function (o, i) {
              return '<div class="pe-vsumbu">' +
                '<div class="row">' +
                  '<b>' + U.esc(o.nama) + '</b>' +
                  '<span class="tbl-sub">' + (o.nilai || []).length + ' ' + T('pilihan') + '</span>' +
                  '<div class="spacer"></div>' +
                  '<button class="btn btn--ghost btn--sm" data-act="vsumbu-hapus" data-i="' + i +
                    '">' + T('Hapus') + '</button>' +
                '</div>' +
                '<div class="pe-vnilai">' + (o.nilai || []).map(function (n, j) {
                  return '<span class="pe-vn">' + U.esc(n) +
                    '<button data-act="vnilai-hapus" data-i="' + i + '" data-j="' + j +
                    '" title="' + T('Hapus') + '">✕</button></span>';
                }).join('') +
                '<input class="input pe-vtambah" data-i="' + i + '" data-enter="vnilai-tambah" ' +
                  'placeholder="' + T('tambah pilihan lalu Enter') + '">' +
                '</div>' +
              '</div>';
            }).join('')
          : '<div class="tbl-sub">' +
            T('Belum ada varian. Produk tanpa varian dijual dengan satu harga dan satu stok — ' +
              'itu tetap pilihan yang sah.') + '</div>') +

        (opsi.length < VARIAN.MAKS_SUMBU
          ? '<div class="row mt-2">' +
              '<input class="input" id="pe-v-nama" placeholder="' + T('mis. Warna') +
                '" style="max-width:200px">' +
              '<button class="btn btn--ghost" data-act="vsumbu-tambah">＋ ' +
                T('Tambah jenis varian') + '</button>' +
            '</div>' +
            '<div class="tbl-sub mt-1">' +
              T('Paling banyak dua jenis. Tiga jenis melipatgandakan kombinasinya sampai ' +
                'tidak bisa diisi satu per satu dengan jujur.') + '</div>'
          : '') +

        (komb.length
          ? '<div class="pe-sub">' +
              '<h4>' + T('Harga & stok per varian') + '</h4>' +
              (salah ? UI.alert('warn', U.esc(salah), '⚠️') : '') +
              '<div class="tbl-wrap"><table class="tbl pe-vtbl"><thead><tr>' +
                '<th>' + T('Varian') + '</th><th>' + T('Harga') + '</th>' +
                '<th>' + T('Stok') + '</th><th>SKU</th><th>' + T('Aktif') + '</th>' +
              '</tr></thead><tbody>' + komb.map(function (k) {
                return '<tr' + (k.aktif === false ? ' class="pe-vtbl--off"' : '') + '>' +
                  '<td><b>' + U.esc((k.pilihan || []).join(' / ')) + '</b></td>' +
                  '<td><input class="input" type="number" min="0" data-change="v" data-k="' +
                    U.esc(k.id) + '" data-f="harga" value="' + (k.harga || '') + '"></td>' +
                  '<td><input class="input" type="number" min="0" data-change="v" data-k="' +
                    U.esc(k.id) + '" data-f="stok" value="' + (k.stok || '') + '"></td>' +
                  '<td><input class="input" data-change="v" data-k="' + U.esc(k.id) +
                    '" data-f="sku" value="' + U.esc(k.sku || '') + '"></td>' +
                  '<td class="tbl-aksi"><button class="mn-b' + (k.aktif === false ? '' : ' on') +
                    '" data-act="vaktif" data-k="' + U.esc(k.id) + '" title="' +
                    (k.aktif === false ? T('Nyalakan') : T('Matikan')) + '">' +
                    (k.aktif === false ? '○' : '●') + '</button></td>' +
                '</tr>';
              }).join('') + '</tbody></table></div>' +
              '<div class="tbl-sub mt-2">' +
                T('Harga produk menjadi harga varian termurah, dan stoknya menjadi jumlah ' +
                  'seluruh varian aktif. Keduanya terisi sendiri — tidak perlu diisi lagi ' +
                  'di langkah Harga dan Stok.') + '</div>' +
              '<button class="btn btn--ghost btn--sm mt-2" data-act="varian-buang">' +
                T('Hapus semua varian') + '</button>' +
            '</div>'
          : '')
    });
  }

  function langkahHarga(p) {
    var g = PRODUKED.grosirRapi(p.grosir);
    var salah = PRODUKED.periksaGrosir(p.grosir, p.harga, PRODUKED.minOrder(p));
    if (VARIAN.punya(p)) {
      /* Dua tempat mengisi harga barang yang sama akan saling menimpa tanpa
         ada yang tahu mana yang menang. Begitu varian dipakai, langkah ini
         menjadi tampilan hasil — dengan jalan pintas ke tempat mengubahnya. */
      var r = VARIAN.rentang(p);
      return UI.card({ title: T('Harga'), sub: T('Ditentukan per varian'), body:
        UI.alert('info', T('Produk ini bervarian, jadi harganya diisi di langkah Varian.') +
          ' <b>' + (r.beda ? U.rp(r.min) + ' – ' + U.rp(r.maks) : U.rp(r.min)) + '</b>', 'ℹ️') +
        '<button class="btn btn--ghost btn--sm" data-act="langkah" data-l="varian">' +
          T('Buka langkah Varian') + '</button>' +
        '<div class="pe-sub">' +
          baris('Minimum pembelian', angka('minOrder', p.minOrder, '1'),
            T('Pembeli tidak bisa memesan kurang dari jumlah ini.')) +
          baris('Satuan', teks('satuan', p.satuan, 'unit')) +
        '</div>' });
    }
    return UI.card({ title: T('Harga'), sub: T('Harga satuan, minimum pembelian, dan grosir'), body:
      '<div class="pe-2">' +
        baris(T('Harga jual (Rp)'), angka('harga', p.harga, '0'),
          T('Harga per satuan sebelum diskon.')) +
        baris('Satuan', teks('satuan', p.satuan, 'unit'),
          'mis. jerigen, botol, pak, set, unit, karton') +
      '</div>' +
      baris('Minimum pembelian', angka('minOrder', p.minOrder, '1'),
        T('Pembeli tidak bisa memesan kurang dari jumlah ini.')) +

      '<div class="pe-sub">' +
        '<h4>' + T('Harga grosir') + '</h4>' +
        '<p class="tbl-sub">' +
          T('Makin banyak dibeli, makin murah per satuannya. Kosongkan bila tidak dipakai.') +
        '</p>' +
        (g.length
          ? '<table class="tbl pe-grosir"><thead><tr>' +
              '<th>' + T('Mulai dari') + '</th><th>' + T('Harga satuan') + '</th><th></th>' +
            '</tr></thead><tbody>' +
            g.map(function (x, i) {
              return '<tr><td>' + x.minQty + ' ' + U.esc(p.satuan || 'pcs') + '</td>' +
                '<td><b>' + U.rp(x.harga) + '</b>' +
                  (p.harga > 0 ? ' <span class="tbl-sub">−' +
                    Math.round((p.harga - x.harga) / p.harga * 100) + '%</span>' : '') + '</td>' +
                '<td class="tbl-aksi"><button class="btn btn--ghost btn--sm" data-act="grosir-hapus" ' +
                  'data-i="' + i + '">' + T('Hapus') + '</button></td></tr>';
            }).join('') + '</tbody></table>'
          : '<div class="tbl-sub">' + T('Belum ada tingkat grosir.') + '</div>') +

        (salah ? UI.alert('warn', U.esc(T(salah)), '⚠️') : '') +

        '<div class="row mt-2">' +
          '<input class="input" type="number" min="2" id="pe-g-qty" placeholder="' +
            T('Mulai dari (pcs)') + '" style="max-width:170px">' +
          '<input class="input" type="number" min="0" id="pe-g-harga" placeholder="' +
            T('Harga satuan') + '" style="max-width:170px">' +
          '<button class="btn btn--ghost" data-act="grosir-tambah">＋ ' + T('Tambah tingkat') + '</button>' +
        '</div>' +

        '<div class="tbl-sub mt-2">' +
          T('Bila produk ini sedang ikut kampanye diskon, yang dipakai adalah harga yang ' +
            'lebih murah bagi pembeli — grosir dan diskon tidak ditumpuk.') +
        '</div>' +
      '</div>'
    });
  }

  function langkahStok(p) {
    if (VARIAN.punya(p)) {
      return UI.card({ title: T('Stok & SKU'), sub: T('Ditentukan per varian'), body:
        UI.alert('info', T('Stok dan SKU diisi per varian.') + ' <b>' +
          VARIAN.stokTotal(p) + ' ' + U.esc(p.satuan || '') + '</b> ' +
          T('dari seluruh varian aktif.'), 'ℹ️') +
        '<button class="btn btn--ghost btn--sm" data-act="langkah" data-l="varian">' +
          T('Buka langkah Varian') + '</button>' +
        '<div class="pe-sub">' +
          baris(T('Kode produk (SKU induk)'), teks('kode', p.kode, 'mis. BJ-CHM-01'),
            T('Harus unik di seluruh aplikasi.')) +
          baris(T('Batas minimum stok'), angka('minStok', p.minStok, '5')) +
        '</div>' });
    }
    return UI.card({ title: T('Stok & SKU'), sub: T('Ketersediaan dan penomoran barang'), body:
      '<div class="pe-2">' +
        baris(T('Kode produk (SKU)'), teks('kode', p.kode, 'mis. BJ-CHM-01'),
          T('Harus unik di seluruh aplikasi.')) +
        baris(T('Stok tersedia'), angka('stok', p.stok, '0')) +
      '</div>' +
      '<div class="pe-2">' +
        baris(T('Batas minimum stok'), angka('minStok', p.minStok, '5'),
          T('Anda diperingatkan bila stok menyentuh angka ini.')) +
        baris('Preorder', pilih('preorder', p.preorder ? '1' : '',
          [{ value: '', label: T('Barang ready, dikirim dari stok') },
           { value: '1', label: T('Preorder — dibuat setelah ada pembeli') }]),
          T('Preorder menandai dan menyaring. Batas stok tetap berlaku.')) +
      '</div>' +
      (PRODUKED.kodeBentrok(p.kode, p.id)
        ? UI.alert('err', T('Kode produk ini sudah dipakai produk lain.'), '⚠️') : '')
    });
  }

  function langkahKirim(p) {
    var d = p.dimensi || {};
    return UI.card({ title: T('Pengiriman'), sub: T('Berat dan ukuran menentukan ongkir'), body:
      '<div class="mb-2">' + ViewKirim.introDimensi(p) + '</div>' +
      baris(T('Berat kirim (gram)'), angka('beratGram', p.beratGram, '0'),
        T('Timbang barang beserta kemasannya. Angka yang meleset membuat ongkir') + ' ' +
        T('yang Anda terima berbeda dari tagihan kurir.')) +
      '<div class="pe-3">' +
        baris('Panjang (cm)', angka('dimP', d.p, '0')) +
        baris('Lebar (cm)', angka('dimL', d.l, '0')) +
        baris('Tinggi (cm)', angka('dimT', d.t, '0')) +
      '</div>'
    });
  }

  function langkahSpek(p) {
    var s = p.spesifikasi || [];
    return UI.card({ title: T('Spesifikasi'), sub: T('Rincian teknis yang sering ditanyakan'), body:
      (s.length
        ? '<table class="tbl"><tbody>' + s.map(function (x, i) {
            return '<tr><td style="width:38%"><b>' + U.esc(x.k) + '</b></td>' +
              '<td>' + U.esc(x.v) + '</td>' +
              '<td class="tbl-aksi"><button class="btn btn--ghost btn--sm" data-act="spek-hapus" ' +
                'data-i="' + i + '">' + T('Hapus') + '</button></td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="tbl-sub">' + T('Belum ada spesifikasi. Bagian ini tidak wajib, tetapi ' +
            'menjawab pertanyaan sebelum ditanyakan.') + '</div>') +

      '<div class="row mt-2">' +
        '<input class="input" id="pe-s-k" placeholder="' + T('mis. Isi kemasan') + '" style="max-width:200px">' +
        '<input class="input" id="pe-s-v" placeholder="' + T('mis. 20 liter') + '">' +
        '<button class="btn btn--ghost" data-act="spek-tambah">＋ ' + T('Tambah') + '</button>' +
      '</div>'
    });
  }

  /* ================================================================== AKSI */

  function mount(root) {
    U.delegate(root, {
      kembali: function () { APP.go('produk'); },

      'buang-draf': function () {
        var p = produk();
        UI.konfirm({
          title: T('Buang draf ini?'),
          text: T('Isinya tidak bisa dikembalikan. Draf tidak pernah tampil di katalog, ' +
            'jadi tidak ada pembeli yang kehilangan apa pun.'),
          okText: T('Buang'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          try { PRODUKED.hapusDraf(p.id); idAktif = null; APP.go('produk'); }
          catch (e) { UI.toast(e.message, 'err'); }
        });
      },
      langkah: function (el) { langkahAktif = el.getAttribute('data-l'); APP.refresh(); },

      'kelola-media': function () {
        ViewTokoMitra.dialogMedia(idAktif);
      },

      'vsumbu-tambah': function (el) {
        var kolom = el.closest('.row').querySelector('#pe-v-nama');
        var nama = String(kolom.value || '').trim();
        if (!nama) { UI.toast(T('Beri nama jenis variannya dulu.'), 'warn'); return; }
        var p = produk();
        var opsi = VARIAN.opsi(p).slice();
        if (opsi.some(function (o) { return o.nama.toLowerCase() === nama.toLowerCase(); })) {
          UI.toast(T('Jenis varian itu sudah ada.'), 'warn'); return;
        }
        opsi.push({ nama: nama.slice(0, 24), nilai: [] });
        VARIAN.simpan(p.id, opsi, VARIAN.susun(opsi, VARIAN.kombinasi(p), VARIAN.opsi(p)));
        APP.refresh();
      },
      'vsumbu-hapus': function (el) {
        var p = produk(), i = +el.getAttribute('data-i');
        var opsi = VARIAN.opsi(p).slice();
        opsi.splice(i, 1);
        /* Sumbu terakhir dibuang berarti produknya tidak bervarian lagi.
           Menyisakan kombinasi tanpa sumbu akan menghasilkan varian tanpa
           nama yang tidak bisa dipilih siapa pun. */
        if (!opsi.length) { VARIAN.bersihkan(p.id); APP.refresh(); return; }
        VARIAN.simpan(p.id, opsi, VARIAN.susun(opsi, VARIAN.kombinasi(p), VARIAN.opsi(p)));
        APP.refresh();
      },
      'vnilai-hapus': function (el) {
        var p = produk(), i = +el.getAttribute('data-i'), j = +el.getAttribute('data-j');
        var opsi = VARIAN.opsi(p).map(function (o, x) {
          if (x !== i) return o;
          var n = (o.nilai || []).slice(); n.splice(j, 1);
          return { nama: o.nama, nilai: n };
        });
        VARIAN.simpan(p.id, opsi, VARIAN.susun(opsi, VARIAN.kombinasi(p), VARIAN.opsi(p)));
        APP.refresh();
      },
      vaktif: function (el) {
        var p = produk(), id = el.getAttribute('data-k');
        var komb = VARIAN.kombinasi(p).map(function (k) {
          return k.id === id ? Object.assign({}, k, { aktif: k.aktif === false }) : k; });
        VARIAN.simpan(p.id, VARIAN.opsi(p), komb);
        APP.refresh();
      },
      'varian-buang': function () {
        var p = produk();
        UI.konfirm({
          title: T('Hapus semua varian?'),
          text: T('Harga dan stok tiap varian ikut hilang. Produk kembali dijual dengan ' +
            'satu harga dan satu stok — angka terakhirnya tetap dipakai.'),
          okText: T('Hapus'), danger: true
        }).then(function (ya) {
          if (!ya) return;
          VARIAN.bersihkan(p.id);
          APP.refresh();
        });
      },

      'grosir-tambah': function (el) {
        var r = el.closest('.row');
        var q = +r.querySelector('#pe-g-qty').value;
        var h = +r.querySelector('#pe-g-harga').value;
        var p = produk();
        if (!q || !h) { UI.toast(T('Isi jumlah dan harganya dulu.'), 'warn'); return; }
        var baru = (p.grosir || []).concat([{ minQty: q, harga: h }]);
        var salah = PRODUKED.periksaGrosir(baru, p.harga, PRODUKED.minOrder(p));
        /* Ditolak SEBELUM disimpan. Menyimpan tingkat yang salah lalu
           menampilkan peringatan membuat daftar yang terlihat sah padahal
           tidak akan pernah lolos pengajuan. */
        if (salah) { UI.toast(salah, 'err'); return; }
        simpan({ grosir: PRODUKED.grosirRapi(baru) });
        APP.refresh();
      },
      'grosir-hapus': function (el) {
        var p = produk(), i = +el.getAttribute('data-i');
        var g = PRODUKED.grosirRapi(p.grosir);
        g.splice(i, 1);
        simpan({ grosir: g });
        APP.refresh();
      },

      'spek-tambah': function (el) {
        var r = el.closest('.row');
        var k = String(r.querySelector('#pe-s-k').value || '').trim();
        var v = String(r.querySelector('#pe-s-v').value || '').trim();
        if (!k || !v) { UI.toast(T('Isi nama dan nilainya dulu.'), 'warn'); return; }
        var p = produk();
        simpan({ spesifikasi: (p.spesifikasi || []).concat([{ k: k.slice(0, 40), v: v.slice(0, 120) }]) });
        APP.refresh();
      },
      'spek-hapus': function (el) {
        var p = produk(), s = (p.spesifikasi || []).slice();
        s.splice(+el.getAttribute('data-i'), 1);
        simpan({ spesifikasi: s });
        APP.refresh();
      },

      ajukan: function () {
        try {
          PRODUKED.ajukan(idAktif);
          UI.toast(T('Produk dikirim untuk moderasi admin'), 'ok');
          APP.go('produk');
        } catch (e) { UI.toast(e.message, 'err'); }
      }
    });

    /* Tiap kolom menyimpan saat ditinggalkan. Tidak digambar ulang di sini:
       menggambar ulang pada tiap ketikan akan merebut fokus dari kolom yang
       sedang diisi. Panel kelengkapan menyusul saat pindah langkah. */
    /* Enter pada kotak "tambah pilihan" menambahkan nilainya. Memakai tombol
       terpisah untuk tiap sumbu berarti satu tombol per baris yang semuanya
       melakukan hal yang sama — Enter adalah yang dicari tangan di sini. */
    root.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      var el = ev.target;
      if (!el.getAttribute || el.getAttribute('data-enter') !== 'vnilai-tambah') return;
      ev.preventDefault();
      var nilai = String(el.value || '').trim();
      if (!nilai) return;
      var p = produk(), i = +el.getAttribute('data-i');
      var opsi = VARIAN.opsi(p).map(function (o, x) {
        if (x !== i) return o;
        var n = (o.nilai || []).slice();
        if (n.some(function (y) { return y.toLowerCase() === nilai.toLowerCase(); })) return o;
        if (n.length >= VARIAN.MAKS_NILAI) return o;
        n.push(nilai.slice(0, 24));
        return { nama: o.nama, nilai: n };
      });
      VARIAN.simpan(p.id, opsi, VARIAN.susun(opsi, VARIAN.kombinasi(p), VARIAN.opsi(p)));
      APP.refresh();
    });

    root.addEventListener('change', function (ev) {
      var el = ev.target;
      /* Kolom tabel varian: harga, stok, dan SKU per kombinasi. */
      if (el.getAttribute && el.getAttribute('data-change') === 'v') {
        var p = produk(), id = el.getAttribute('data-k'), f = el.getAttribute('data-f');
        var komb = VARIAN.kombinasi(p).map(function (k) {
          if (k.id !== id) return k;
          var patch = {};
          patch[f] = f === 'sku' ? String(el.value || '').trim().slice(0, 32)
                                 : Math.max(0, Math.round(+el.value || 0));
          return Object.assign({}, k, patch);
        });
        VARIAN.simpan(p.id, VARIAN.opsi(p), komb);
        segarkanSisi();
        return;
      }
      if (!el.getAttribute || el.getAttribute('data-change') !== 'f') return;
      var n = el.getAttribute('data-n');
      var v = el.value;
      var patch = {};
      if (n === 'dimP' || n === 'dimL' || n === 'dimT') {
        var p = produk(), d = Object.assign({ p: 0, l: 0, t: 0 }, p.dimensi || {});
        d[n === 'dimP' ? 'p' : n === 'dimL' ? 'l' : 't'] = Math.max(0, +v || 0);
        patch.dimensi = d;
      } else if (['harga', 'stok', 'minStok', 'beratGram', 'minOrder'].indexOf(n) >= 0) {
        patch[n] = Math.max(0, Math.round(+v || 0));
      } else if (n === 'preorder') {
        patch.preorder = v === '1';
      } else {
        patch[n] = v;
      }
      simpan(patch);
      segarkanSisi();
    });
  }

  /* Panel kanan menyusul perubahan tanpa menggambar ulang halaman — angka
     kelengkapan yang tertinggal satu langkah lebih menyesatkan daripada tidak
     ada angka sama sekali. */
  function segarkanSisi() {
    var sisi = document.querySelector('.pe__sisi .card__body');
    var p = produk();
    if (!sisi || !p) return;
    var cek = PRODUKED.periksa(p);
    var st = PRODUKED.STATUS[p.statusProduk || 'draf'] || PRODUKED.STATUS.draf;
    sisi.innerHTML = panelSiap(p, cek, st);
  }

  function page() {
    return { label: T('Editor Produk'), icon: '📝', grup: T('Toko Saya'), tersembunyi: true,
             render: render, mount: mount };
  }

  return { page: page, render: render, mount: mount };
})();
