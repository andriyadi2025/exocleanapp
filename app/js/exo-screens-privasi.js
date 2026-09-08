/* ==========================================================================
   exo-screens-privasi.js — persetujuan UU PDP saat pertama pakai & layar
   "Privasi & data saya" (semua sisi)
   --------------------------------------------------------------------------
   · Lembar `persetujuanPdp` tampil otomatis bila belum ada persetujuan untuk
     versi kebijakan yang berlaku (per sisi di perangkat ini): ringkasan
     tujuan, tautan kebijakan lengkap, centang wajib, pilihan pemasaran.
   · Layar `privasi`: status persetujuan, saklar pemasaran, unduh salinan data
     (JSON), ajukan hak (koreksi, hapus, portabilitas, keberatan), status
     permintaan dengan tenggat 3×24 jam, kontak DPO.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  var P = function () { return window.EXO_PRIVASI; };
  if (!window.EXO_PRIVASI) return;
  K.pdpSetuju = K.pdpSetuju || { wajib:false, pemasaran:true };
  function sisi() { return K.sisi === 'toko' ? 'toko' : K.sisi === 'partner' ? 'partner' : 'customer'; }
  function labelSisi() { return { customer:'pelanggan', partner:'mitra cleaning', toko:'mitra toko' }[sisi()]; }

  /* ---------- lembar persetujuan ---------- */
  X.LEMBAR.persetujuanPdp = function () {
    var k = P().kebijakan(), s = K.pdpSetuju;
    var isi = '<div class="stack gap-10"><div class="t-125 lh-15">Sebelum melanjutkan sebagai <b>' + esc(labelSisi()) + '</b>, kami perlu persetujuan Anda atas pemrosesan data pribadi sesuai UU No. 27/2022 (versi kebijakan ' + esc(k.versi) + ', berlaku ' + esc(k.berlaku) + ').</div>' +
      '<div class="card card-leaf gap-6"><div class="bold t-13">Yang kami proses & untuk apa</div><div class="t-12 lh-15">' + esc(k.bagian[1].isi.split('\n')[sisi() === 'partner' ? 1 : sisi() === 'toko' ? 2 : 0]) + '</div><div class="t-12 lh-15"><b>Tujuan wajib:</b> akun, pelaksanaan layanan, pembayaran, keselamatan. <b>Disimpan terenkripsi</b> di server EXOCLEAN; Anda bisa mengunduh atau menghapus data kapan saja.</div></div>' +
      '<button class="row row-xs" style="align-items:flex-start;text-align:left"' + aksi('pdpCentang', 'wajib') + '><span class="check-sm" style="flex:none;margin-top:2px;background:' + (s.wajib ? 'var(--color-accent)' : 'transparent') + ';border:1.5px solid var(--color-accent)">' + (s.wajib ? '✓' : '') + '</span><span class="t-125 lh-15">Saya telah membaca dan menyetujui <a href="privasi.html" target="_blank" rel="noopener">Kebijakan Privasi</a> EXOCLEAN dan pemrosesan data untuk tujuan wajib di atas.</span></button>' +
      '<button class="row row-xs" style="align-items:flex-start;text-align:left"' + aksi('pdpCentang', 'pemasaran') + '><span class="check-sm" style="flex:none;margin-top:2px;background:' + (s.pemasaran ? 'var(--color-accent)' : 'transparent') + ';border:1.5px solid var(--color-accent)">' + (s.pemasaran ? '✓' : '') + '</span><span class="t-125 lh-15">Saya bersedia menerima promo dan penawaran (opsional, bisa ditarik kapan saja).</span></button>' +
      '<div class="t-11 o-6">Pejabat Pelindungan Data: ' + esc(k.dpo.email) + '. Tanpa persetujuan tujuan wajib, layanan tidak dapat digunakan.</div></div>';
    var kaki = '<button class="btn btn-primary btn-block btn-tall"' + (s.wajib ? aksi('pdpSetuju') : ' disabled') + '>Setuju & lanjutkan</button>';
    /* lembar tanpa tombol tutup & tanpa klik-latar: persetujuan wajib sebelum lanjut */
    return '<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true" aria-label="Persetujuan data pribadi" data-diam="1"><div class="sheet-grip"></div><div class="sheet-head"><div class="sheet-title">Persetujuan data pribadi</div></div><div class="sheet-body">' + isi + '</div><div class="sheet-foot">' + kaki + '</div></div></div>';
  };
  A.pdpCentang = function (arg) { K.pdpSetuju[arg] = !K.pdpSetuju[arg]; };
  A.pdpSetuju = function () { if (!K.pdpSetuju.wajib) return; P().setuju(sisi(), { pemasaran:K.pdpSetuju.pemasaran }, 'lembar-aplikasi'); K.lembar = null; X.sekilas('Terima kasih — persetujuan versi ' + P().versiKini() + ' tercatat.'); };
  /* gerbang: sebelum tiap render, bila sisi ini belum menyetujui versi kebijakan yang berlaku, lembar persetujuan dipasang (tidak bisa ditutup dengan Esc/klik latar). Onboarding & splash dilewati. */
  var LAYAR_BEBAS = { onboard:1, splash:1, terms:1, lang:1, privasi:1 };
  function gerbang() { try { if (LAYAR_BEBAS[K.layar] || K.lembar === 'persetujuanPdp') return; if (P().perluSetuju(sisi())) { K.pdpSetuju = { wajib:false, pemasaran:true }; K.lembar = 'persetujuanPdp'; } } catch (e) { /* abaikan */ } }
  /* Render inti memanggil LAYAR[layar]() sebelum memeriksa K.lembar, jadi setiap fungsi layar dibungkus agar gerbang berjalan tepat sebelum render — mencakup render internal inti yang tidak lewat X.gambar. */
  function bungkusLayar() { Object.keys(X.LAYAR).forEach(function (nama) { var asli = X.LAYAR[nama]; if (asli._pdp) return; var b = function () { gerbang(); return asli.apply(this, arguments); }; b._pdp = true; X.LAYAR[nama] = b; }); }
  function mulai() { bungkusLayar(); try { X.gambar(); } catch (e) { /* abaikan */ } }
  if (document.readyState === 'complete') setTimeout(mulai, 300); else window.addEventListener('load', function () { setTimeout(mulai, 300); });

  /* ---------- layar Privasi & data saya ---------- */
  X.LAYAR.privasi = function () {
    var k = P().kebijakan(), p = P().persetujuan(sisi()), daftar = P().permintaanSaya(sisi());
    var kembali = sisi() === 'toko' ? 'tprofil' : sisi() === 'partner' ? 'profile' : 'profile';
    var h = '<div class="screen">' + X.kepala('Privasi & data saya', 'UU PDP No. 27/2022 · kebijakan versi ' + esc(k.versi), kembali) + '<div class="stack gap-12 pad-x18" style="padding-bottom:40px">';
    h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="grow"><div class="bold t-14">Persetujuan Anda</div><div class="t-12 o-6">' + (p ? 'Diberikan ' + esc(String(p.at).slice(0, 16).replace('T', ' ')) + ' · versi ' + esc(p.versi) + (p.versi !== k.versi ? ' · <b>perlu persetujuan ulang</b>' : '') : 'Belum ada persetujuan tercatat') + '</div></div>' + (p && p.versi === k.versi ? '<span class="tag tag-accent" style="font-size:10.5px">aktif</span>' : '<button class="btn btn-primary" style="height:32px;font-size:12px"' + aksi('lembar', 'persetujuanPdp') + '>Setujui</button>') + '</div>' +
      '<div class="flex items-center gap-8"><span class="grow t-125">Promo & penawaran (pemasaran)</span><button class="pill pill-sm' + (p && p.pemasaran ? ' on' : '') + '"' + aksi('pdpPemasaran') + '>' + (p && p.pemasaran ? 'Aktif · tarik' : 'Nonaktif · izinkan') + '</button></div>' +
      '<div class="t-11 o-6">Tujuan wajib (akun, layanan, pembayaran, keselamatan) tidak bisa ditarik tanpa menghapus akun.</div></div>';
    h += '<div class="card elev-sm gap-8"><div class="bold t-14">Hak Anda</div><div class="t-12 o-6 lh-15">Kami memenuhi permintaan akses dalam 3×24 jam; permintaan lain paling lambat 3×24 jam untuk balasan pertama.</div>' +
      '<div class="grid g2" style="gap:8px"><button class="btn btn-secondary" style="height:38px;font-size:12.5px"' + aksi('pdpUnduh') + '>⬇ Unduh salinan data</button><button class="btn btn-secondary" style="height:38px;font-size:12.5px"' + aksi('pdpMinta', 'koreksi') + '>✎ Minta perbaikan</button><button class="btn btn-secondary" style="height:38px;font-size:12.5px"' + aksi('pdpMinta', 'portabilitas') + '>⇄ Portabilitas data</button><button class="btn btn-secondary" style="height:38px;font-size:12.5px;color:#9b1c1c"' + aksi('pdpMinta', 'hapus') + '>🗑 Hapus data & akun</button></div>' +
      '<div class="field"><label>Catatan untuk permintaan (opsional)</label><input class="input" data-simpan="pdpCatatan" value="' + esc(K.pdpCatatan || '') + '" placeholder="mis. nomor telepon saya keliru"></div></div>';
    if (daftar.length) h += '<div class="card elev-sm gap-6"><div class="bold t-14">Permintaan saya</div>' + daftar.slice(0, 6).map(function (q) { var lewat = P().tenggatLewat(q); return '<div class="row row-xs"><span class="row-main"><b style="font-size:12.5px">' + esc(P().HAK[q.jenis]) + ' · ' + esc(q.no) + '</b><span>' + esc(String(q.at).slice(0, 16).replace('T', ' ')) + ' · tenggat ' + esc(String(q.tenggat).slice(0, 16).replace('T', ' ')) + (lewat ? ' · <b style="color:#9b1c1c">lewat tenggat</b>' : '') + '</span></span><span class="tag" style="font-size:10.5px">' + esc(P().STATUS_PERMINTAAN[q.status] || q.status) + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card elev-sm gap-6"><div class="bold t-14">Kebijakan & kontak</div><div class="t-12 lh-15">Pengendali data: <b>' + esc(k.pengendali.nama) + '</b> · ' + esc(k.pengendali.email) + '<br>Pejabat Pelindungan Data (DPO): ' + esc(k.dpo.email) + '<br>Data pribadi Anda disimpan terenkripsi di server; di perangkat ini hanya versi tersamar.</div><a class="btn btn-secondary" style="height:36px;font-size:12.5px" href="privasi.html" target="_blank" rel="noopener">Baca kebijakan privasi lengkap ↗</a></div>';
    return h + '</div></div>';
  };
  A.pdpPemasaran = function () { var p = P().persetujuan(sisi()); if (!p) { K.lembar = 'persetujuanPdp'; return; } P().ubahPemasaran(sisi(), !p.pemasaran); X.sekilas(p.pemasaran ? 'Persetujuan pemasaran ditarik.' : 'Persetujuan pemasaran diberikan.'); };
  A.pdpUnduh = function () { var data = P().eksporSaya(sisi()); P().mintaHak(sisi(), 'akses', 'salinan diunduh dari aplikasi', ''); try { var b = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'data-saya-exoclean-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 500); X.sekilas('Salinan data Anda diunduh (JSON).'); } catch (e) { X.sekilas('Gagal mengunduh: ' + e.message, 'err'); } };
  A.pdpMinta = function (jenis) { var q = P().mintaHak(sisi(), jenis, K.pdpCatatan || '', ''); if (!q) return; K.pdpCatatan = ''; X.sekilas('Permintaan ' + q.no + ' dicatat · tenggat 3×24 jam.' + (jenis === 'hapus' ? ' Tim kami mengonfirmasi lewat OTP sebelum menghapus.' : '')); };
})(ExoApp);
