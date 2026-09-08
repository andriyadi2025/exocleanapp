/* ==========================================================================
   exo-screens-partner-kit.js — mitra cleaning: perlengkapan yang dibawa,
   pemakaian otomatis saat job selesai, alat kerja saya
   --------------------------------------------------------------------------
   · pkit: checklist bawaan untuk job berikutnya (dari NORMA jasa × durasi
     + alat/chemical SOP): takaran, nilai, stok gudang; tombol "Stok habis →
     minta gudang"; konfirmasi "Semua sudah di tas" membuka Mulai rute.
   · Saat laporan job dikirim (A.kirimLaporan), EXO_PERLENGKAPAN.konsumsi
     memotong stok chemical & habis pakai dan mencatat penyusutan alat.
   · palat: alat kerja di tangan mitra — sisa umur pakai, nilai buku,
     lapor rusak (otomatis minta pengganti ke gudang).
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, A = X.AKSI;
  var P = function () { return window.EXO_PERLENGKAPAN; }, rp = function (n) { return P().rp(n); };
  if (!window.EXO_PERLENGKAPAN) return;
  K.kitBawa = K.kitBawa || {}; K.kitSiap = K.kitSiap || false; K.kitJob = K.kitJob || '';
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  function jobKini() { return { no:K.orderNo || 'EXO-4471', jasa:K.jasa || 'hourly', jam:K.jam || 3, mitra:aku().name, lokasi:'Kemang Residence 12B' }; }
  var IKON_KAT = { chemical:'🧴', 'habis pakai':'🧻', apd:'🧤', alat:'🧰' };

  X.LAYAR.pkit = function () {
    pasangHook();
    var j = jobKini(), m = X.sopMeta(), daftar = P().rencana(j.jasa, j.jam, m), r = P().ringkasRencana(daftar), nBawa = daftar.filter(function (x) { return K.kitBawa[x.id] !== false; }).length;
    if (K.kitJob !== j.no) { K.kitJob = j.no; K.kitBawa = {}; K.kitSiap = false; }
    var h = '<div class="screen">' + X.kepala('Perlengkapan dibawa', esc(j.no + ' · ' + m.title + ' · ' + j.jam + ' jam'), 'pjobs', '<span class="tag ' + (K.kitSiap ? 'tag-accent-2' : 'tag-accent') + '">' + nBawa + '/' + daftar.length + '</span>') + '<div class="stack gap-12 pad-x18">';
    h += '<div class="card card-leaf gap-4"><div class="t-115 lh-15">Takaran dihitung dari norma jasa <b>' + esc(m.code) + '</b> × durasi. Saat laporan job terkirim, stok gudang otomatis berkurang dan penyusutan alat tercatat — tidak perlu input ulang.</div><div class="flex gap-8 t-11 o-7 wrap"><span>Chemical ' + rp(r.chemical) + '</span><span>Habis pakai & APD ' + rp(r.habis) + '</span><span>Penyusutan alat ' + rp(r.susut) + '</span><b>Total ' + rp(r.total) + '/job</b></div></div>';
    ['chemical', 'habis pakai', 'apd', 'alat'].forEach(function (kat) {
      var grup = daftar.filter(function (x) { return x.kategori === kat; }); if (!grup.length) return;
      h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><span style="font-size:18px">' + IKON_KAT[kat] + '</span><div class="grow f-head t-14">' + esc(P().KATEGORI[kat]) + '</div><span class="t-11 o-6">' + grup.length + ' item</span></div>';
      grup.forEach(function (x) { var on = K.kitBawa[x.id] !== false; h += '<div class="row row-xs' + (on ? ' on-leaf' : '') + '" style="cursor:default"><button class="' + kelas('box', on) + '" style="cursor:pointer"' + aksi('kitBawa', x.id) + '>✓</button><span class="row-main"><b style="font-size:12.5px">' + esc(x.nama) + '</b><span style="font-size:11px">' + (x.kategori === 'alat' ? (x.susutPerJob ? 'penyusutan ' + rp(x.susutPerJob) + '/job' : 'alat') : x.qty + ' ' + x.satuan + ' · ' + rp(x.nilai)) + (x.catatan ? ' · ' + esc(x.catatan) : '') + (x.habis ? ' · <b style="color:#b12a5b">gudang kosong</b>' : x.rendah ? ' · stok gudang menipis' : '') + '</span></span>' + (x.kategori !== 'alat' ? '<button class="pill pill-sm" style="flex:none"' + aksi('kitMinta', x.id) + '>' + (x.habis ? 'Minta' : 'Habis?') + '</button>' : '') + '</div>'; });
      h += '</div>';
    });
    h += '<div class="flex gap-8"><button class="btn btn-secondary" style="flex:1"' + aksi('kitSemua') + '>Centang semua</button><button class="btn btn-primary" style="flex:1"' + aksi('kitSiap') + '>' + (K.kitSiap ? '✓ Siap · lanjut rute' : 'Semua sudah di tas') + '</button></div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'palat') + '>🧰 Alat kerja saya · sisa umur & lapor rusak</button>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.kitBawa = function (id) { K.kitBawa[id] = K.kitBawa[id] === false; K.kitSiap = false; };
  A.kitSemua = function () { K.kitBawa = {}; };
  A.kitSiap = function () { pasangHook(); K.kitSiap = true; K.kitJob = jobKini().no; X.sekilas('Perlengkapan dikonfirmasi — selamat bekerja.'); K.layar = 'proute'; };
  A.kitMinta = function (id) { var it = window.EXO_DB.find('stok', id); if (!it) return; P().minta(it.nama, aku().name, jobKini().lokasi, it.stok <= 0 ? 'tinggi' : 'sedang'); X.sekilas('Permintaan ' + it.nama + ' dikirim ke gudang (admin → Inventaris).'); };
  /* Mulai rute dari layar Job: perlengkapan dulu bila belum dikonfirmasi untuk job ini. */
  A.mulaiRute = function () { if (K.kitSiap && K.kitJob === jobKini().no) { K.layar = 'proute'; return; } K.layar = 'pkit'; X.sekilas('Cek perlengkapan yang dibawa dulu.'); };

  /* ---- pemakaian otomatis saat laporan dikirim (A.kirimLaporan didefinisikan exo-sheets.js, dimuat setelah berkas ini) ---- */
  function pasangHook() { var asli = A.kirimLaporan; if (!asli || asli._kit) return; A.kirimLaporan = function () { var j = jobKini(), r = null; try { r = P().konsumsi(j, K.kitBawa); } catch (e) { r = null; } asli.apply(this, arguments); if (r && !r.sudah && (r.pemakaian.length || r.penyusutan.length)) X.sekilas('Laporan terkirim · stok gudang dipotong ' + rp(r.nilaiPemakaian) + ' · penyusutan alat ' + rp(r.nilaiPenyusutan) + '.'); K.kitSiap = false; }; A.kirimLaporan._kit = true; }
  /* A.kirimLaporan bisa didefinisikan ulang saat aplikasi mulai — pasang kait berulang: setelah muat, saat layar perlengkapan/laporan digambar, dan saat konfirmasi kit. */
  setTimeout(pasangHook, 0); try { window.addEventListener('load', function () { setTimeout(pasangHook, 300); }); } catch (e) { /* abaikan */ }
  var preportAsli = X.LAYAR.preport; if (preportAsli) X.LAYAR.preport = function () { pasangHook(); return preportAsli.apply(this, arguments); };

  /* ---- alat kerja saya ---- */
  X.LAYAR.palat = function () {
    var a = aku(), daftar = P().alatMitra(a.name);
    var h = '<div class="screen">' + X.kepala('Alat kerja saya', daftar.length + ' alat di tangan · nilai buku ' + rp(daftar.reduce(function (n, x) { return n + x.nilaiBuku; }, 0)), 'pkit') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="card card-leaf t-115 lh-15">Umur pakai dihitung per job (mis. mop set 150 job). Penyusutan per job dibebankan ke akun 6210 dan sisa umur menentukan kapan alat diganti. Lapor rusak → permintaan pengganti otomatis ke gudang.</div>';
    if (!daftar.length) h += '<div class="card elev-sm t-125 o-7">Belum ada catatan alat. Alat tercatat otomatis saat laporan job pertama dikirim.</div>';
    daftar.forEach(function (x) { var warna = x.pct >= 90 ? '#b12a5b' : x.pct >= 70 ? '#b45309' : '#0a8f5c'; h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><span style="font-size:20px">🧰</span><div class="grow" style="min-width:0"><b class="t-125">' + esc(x.nama) + '</b><div class="t-11 o-6">diterima ' + esc(x.diterima) + ' · ' + (x.jobDipakai || 0) + ' job' + (x.umurPakai ? ' dari ' + x.umurPakai : '') + ' · nilai buku ' + rp(x.nilaiBuku) + '</div></div><span class="tag ' + (x.kondisi === 'rusak' ? 'tag-neutral' : 'tag-accent-2') + '" style="font-size:10px">' + esc(x.kondisi) + '</span></div>' + (x.umurPakai ? '<div class="progress"><i style="width:' + x.pct + '%;background:' + warna + '"></i></div><div class="t-10 o-6">' + (x.sisaJob === 0 ? 'Umur pakai habis — minta pengganti.' : 'sisa ' + x.sisaJob + ' job') + '</div>' : '') + '<div class="flex gap-6">' + (x.kondisi === 'rusak' ? '<button class="pill pill-sm"' + aksi('alatKondisi', x.id + ':baik') + '>Tandai baik</button>' : '<button class="pill pill-sm"' + aksi('alatKondisi', x.id + ':rusak') + '>Lapor rusak · minta ganti</button>') + '</div></div>'; });
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.alatKondisi = function (v) { var p = v.split(':'); P().lapor(aku().name, p[0], p[1], jobKini().lokasi); X.sekilas(p[1] === 'rusak' ? 'Dilaporkan rusak — permintaan pengganti dikirim ke gudang.' : 'Alat ditandai baik.'); };
})(ExoApp);
