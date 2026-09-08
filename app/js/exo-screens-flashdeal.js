/* ==========================================================================
   exo-screens-flashdeal.js — Flash Deal jasa di aplikasi pelanggan
   --------------------------------------------------------------------------
   Bagian "⚡ Flash Deal Jasa" di beranda (di atas Flash Sale produk):
   hitung mundur jendela, kartu per layanan dengan harga coret, tag diskon,
   sisa kuota, tombol Pesan. Potongan otomatis dihitung X.diskonFlash()
   (dipakai total harga & ringkasan pemesanan); pemesanan sukses memakai
   satu kuota. Spanduk di layar layanan saat deal berjalan.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, K = X.KEADAAN, esc = X.esc, aksi = X.aksi, rp = X.rp, I = X.I, ikon = X.ikon;
  var F = function () { return window.EXO_FLASHDEAL; };
  if (!window.EXO_FLASHDEAL) return;
  X.diskonFlash = function () { try { return F().diskon(K.jasa, X.lineFor(X.rateFor(X.juruKini()))); } catch (e) { return 0; } };
  X.flashKini = function () { return F().berlaku(K.jasa); };
  function tileLayanan(id) { return (D.HOME_TILES || []).filter(function (s) { return s.id === id; })[0]; }
  function ikonLayanan(id, KT) { var ov = KT && window.EXO_KONTEN ? EXO_KONTEN.ikonLayanan('klien', id) : null; if (ov) return EXO_KONTEN.ikonHtml(ov, 26); var t = tileLayanan(id); return t ? ikon(t.d, 22) : '🧹'; }
  X.bagianFlashJasa = function (KT) {
    F().semai(); var daftar = F().tampil(); if (!daftar.length) return '';
    var berjalan = daftar.filter(function (f) { return f.keadaan === 'berjalan'; })[0], acuan = berjalan || daftar[0];
    var h = '<div style="padding:18px 0 0 16px"><div class="flex items-center gap-8" style="padding-right:16px"><div class="f-head t-17" style="color:#b45309">⚡ Flash Deal Jasa</div><span class="tag" style="background:#1f1f1f;color:#fff;font-size:10px;font-variant-numeric:tabular-nums">' + (berjalan ? 'berakhir ' : 'mulai ') + F().hitungMundur(acuan) + '</span><button class="btn btn-ghost t-115" style="margin-inline-start:auto;color:#b45309"' + aksi('ke', 'catalog') + '>Semua jasa →</button></div><div class="hscroll" style="gap:8px;margin-top:8px;padding-right:16px">';
    daftar.forEach(function (f) { var s = D.SERVICES[f.jasa]; if (!s) return; var rate = s.rate, hemat = Math.round(rate * f.diskonPct / 100 / 1000) * 1000, pct = f.kuota ? Math.min(100, Math.round((f.terpakai || 0) / f.kuota * 100)) : 0, mati = f.keadaan !== 'berjalan';
      h += '<button class="card elev-sm gap-4" style="width:168px;text-align:start;cursor:pointer;padding:12px' + (mati ? ';opacity:.75' : '') + '"' + aksi('flashPesan', f.jasa) + '><div class="flex items-center gap-8"><span class="av av-soft" style="--s:38px">' + ikonLayanan(f.jasa, KT) + '</span><span class="tag" style="background:#b45309;color:#fff;font-size:11px;font-weight:800;margin-inline-start:auto">−' + f.diskonPct + '%</span></div><div class="t-125 bold lh-14" style="min-height:32px">' + esc(I.svcName(f.jasa)) + '</div><div class="flex items-baseline gap-6"><b class="t-135">' + rp(rate - hemat) + '</b><span class="t-11 o-5" style="text-decoration:line-through">' + rp(rate) + '</span></div><div class="t-10 o-6">' + esc(s.unit === '/hour' ? 'per jam' : 'per unit') + ' · hemat ' + rp(hemat) + '</div><div class="progress" style="margin-top:2px"><i style="width:' + pct + '%;background:#b45309"></i></div><div class="t-10" style="color:#b45309;font-weight:700">' + (f.keadaan === 'habis' ? 'Kuota habis' : f.keadaan === 'akan datang' ? 'Mulai ' + esc(f.mulai) : 'Tersisa ' + f.sisa + ' dari ' + f.kuota) + '</div></button>'; });
    return h + '</div></div>';
  };
  X.AKSI.flashPesan = function (jasa) { var f = F().berlaku(jasa); X.AKSI.pilihJasa(jasa); X.sekilas(f ? 'Flash Deal −' + f.diskonPct + '% otomatis dipotong saat pembayaran.' : 'Deal belum dimulai — harga normal berlaku.'); };
  /* spanduk di layar layanan */
  var svcAsli = X.LAYAR.svc; if (svcAsli) X.LAYAR.svc = function () { var h = svcAsli.apply(this, arguments), f = F().berlaku(K.jasa); if (!f) return h; var b = '<div style="padding:0 20px"><div class="card gap-3" style="background:#fff4d6;flex-direction:row;align-items:center;gap:10px"><span style="font-size:22px">⚡</span><div class="grow"><b class="t-125">Flash Deal −' + f.diskonPct + '% sedang berjalan</b><div class="t-11 o-7">Berakhir ' + F().hitungMundur(f) + ' · tersisa ' + F().sisa(f) + ' pemesanan · potongan otomatis di ringkasan harga</div></div></div></div>'; return h.replace('<div class="screen">', '<div class="screen">').replace(/(<\/div>\s*)$/, b + '$1'); };
})(ExoApp);
