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

  /* ---- tas & isi ulang mingguan ---- */
  X.LAYAR.ptas = function () {
    var a = aku(), t = P().tas(a.name), jt = P().tasJatuhTempo(a.name) || {}, kurang = t.filter(function (x) { return x.kurang > 0; });
    var h = '<div class="screen">' + X.kepala('Tas & isi ulang mingguan', 'Isi ulang tiap ' + P().ISI_ULANG_HARI + ' hari di gudang · terakhir ' + esc(jt.terakhir || '—'), 'pkit') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="card ' + (jt.jatuhTempo ? 'card-clay' : 'card-leaf') + ' gap-4"><div class="f-head t-14">' + (jt.menunggu ? '📦 Permintaan isi ulang sedang disiapkan gudang' : jt.jatuhTempo ? '⏰ Saatnya isi ulang tas' : '✓ Tas masih cukup') + '</div><div class="t-115 lh-15">' + (jt.menunggu ? 'Diminta ' + esc(jt.menunggu.tgl) + ' · ' + jt.menunggu.items.length + ' item · ambil di gudang saat status "diserahkan".' : (jt.hariSejak || 0) + ' hari sejak isi ulang terakhir · ' + (jt.rendah || 0) + ' item di bawah 50%. Isi tas berkurang otomatis setiap laporan job terkirim.') + '</div></div>';
    h += '<div class="card elev-sm gap-6"><div class="f-head t-14">Isi tas saat ini</div>' + t.map(function (x) { var warna = x.pct < 25 ? '#b12a5b' : x.pct < 50 ? '#b45309' : '#0a8f5c'; return '<div class="stack gap-3" style="padding:4px 0"><div class="flex items-center gap-8"><span class="grow t-125" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.nama) + '</span><b class="t-11" style="flex:none;color:' + warna + '">' + Math.round(x.sisa) + '/' + x.kapasitas + ' ' + esc(x.satuan) + '</b></div><div class="progress"><i style="width:' + x.pct + '%;background:' + warna + '"></i></div></div>'; }).join('') + '</div>';
    if (kurang.length && !jt.menunggu) h += '<div class="card elev-sm gap-6"><div class="f-head t-14">Daftar isi ulang (' + kurang.length + ' item)</div>' + kurang.map(function (x) { return '<div class="kv t-115"><span>' + esc(x.nama) + '</span><b>+ ' + Math.ceil(x.kurang) + ' ' + esc(x.satuan) + '</b></div>'; }).join('') + '<button class="btn btn-primary btn-block" style="margin:6px 0 0"' + aksi('tasMinta') + '>Minta isi ulang ke gudang</button></div>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.tasMinta = function () { try { var r = P().mintaIsiUlang(aku().name, jobKini().lokasi); X.sekilas('Permintaan isi ulang ' + r.items.length + ' item dikirim ke gudang.'); } catch (e) { X.sekilas(e.message, 'err'); } };
  /* pengingat di beranda Job */
  X.kartuTas = function () { try { var jt = P().tasJatuhTempo(aku().name); if (!jt || (!jt.jatuhTempo && !jt.menunggu)) return ''; return '<button class="card ' + (jt.menunggu ? 'card-leaf' : 'card-clay') + ' gap-3" style="text-align:start;cursor:pointer;width:100%"' + aksi('ke', 'ptas') + '><div class="flex items-center gap-8"><span style="font-size:20px">🎒</span><div class="grow"><b class="t-125">' + (jt.menunggu ? 'Isi ulang tas sedang disiapkan gudang' : 'Saatnya isi ulang tas mingguan') + '</b><div class="t-11 o-7">' + (jt.menunggu ? 'ambil di gudang saat status diserahkan' : jt.hariSejak + ' hari sejak isi ulang · ' + jt.rendah + ' item di bawah 50%') + '</div></div><span class="o-5">›</span></div></button>'; } catch (e) { return ''; } };
  A.alatTerima = function (no) { try { P().terimaAlat(aku().name, no); X.sekilas('Serah terima ' + no + ' dikonfirmasi — alat mulai dihitung umur pakainya.'); } catch (e) { X.sekilas(e.message, 'err'); } };

  /* ---- alat kerja saya ---- */
  X.LAYAR.palat = function () {
    var a = aku(), daftar = P().alatMitra(a.name);
    var h = '<div class="screen">' + X.kepala('Alat kerja saya', daftar.length + ' alat di tangan · nilai buku ' + rp(daftar.reduce(function (n, x) { return n + x.nilaiBuku; }, 0)), 'pkit') + '<div class="stack gap-10 pad-x18">';
    h += '<div class="card card-leaf t-115 lh-15">Umur pakai dihitung per job (mis. mop set 150 job). Penyusutan per job dibebankan ke akun 6210 dan sisa umur menentukan kapan alat diganti. Lapor rusak → permintaan pengganti otomatis ke gudang.</div>';
    P().daftarBast(a.name).filter(function (b) { return b.status === 'menunggu'; }).forEach(function (b) { h += '<div class="card card-clay gap-6"><div class="f-head t-14">📋 Serah terima alat ' + esc(b.no) + '</div><div class="t-11 o-7">' + esc(b.tgl) + ' · dari ' + esc(b.oleh || 'gudang') + (b.catatan ? ' · ' + esc(b.catatan) : '') + '</div>' + b.items.map(function (x) { return '<div class="kv t-115"><span>' + esc(x.nama) + '</span><span>' + rp(x.harga) + '</span></div>'; }).join('') + '<div class="kv t-115"><b>Nilai paket</b><b>' + rp(b.nilai) + '</b></div><div class="t-11 o-7 lh-14">Dengan mengonfirmasi, Anda menyatakan alat diterima dalam kondisi baik dan bertanggung jawab atas perawatannya.</div><button class="btn btn-primary btn-block" style="margin:4px 0 0"' + aksi('alatTerima', b.no) + '>✓ Konfirmasi terima</button></div>'; });
    if (!daftar.length) h += '<div class="card elev-sm t-125 o-7">Belum ada catatan alat. Alat tercatat saat serah terima dari gudang atau otomatis saat laporan job pertama dikirim.</div>';
    h += '<button class="btn btn-secondary btn-block" style="margin:0"' + aksi('ke', 'ptas') + '>🎒 Tas & isi ulang mingguan</button>';
    daftar.forEach(function (x) { var warna = x.pct >= 90 ? '#b12a5b' : x.pct >= 70 ? '#b45309' : '#0a8f5c'; h += '<div class="card elev-sm gap-6"><div class="flex items-center gap-8"><span style="font-size:20px">🧰</span><div class="grow" style="min-width:0"><b class="t-125">' + esc(x.nama) + '</b><div class="t-11 o-6">diterima ' + esc(x.diterima) + ' · ' + (x.jobDipakai || 0) + ' job' + (x.umurPakai ? ' dari ' + x.umurPakai : '') + ' · nilai buku ' + rp(x.nilaiBuku) + '</div></div><span class="tag ' + (x.kondisi === 'baik' ? 'tag-accent-2' : 'tag-neutral') + '" style="font-size:10px">' + esc(x.kondisi === 'diserahkan' ? 'menunggu konfirmasi' : x.kondisi) + '</span></div>' + (x.umurPakai ? '<div class="progress"><i style="width:' + x.pct + '%;background:' + warna + '"></i></div><div class="t-10 o-6">' + (x.sisaJob === 0 ? 'Umur pakai habis — minta pengganti.' : 'sisa ' + x.sisaJob + ' job') + '</div>' : '') + '<div class="flex gap-6">' + (x.kondisi === 'rusak' ? '<button class="pill pill-sm"' + aksi('alatKondisi', x.id + ':baik') + '>Tandai baik</button>' : '<button class="pill pill-sm"' + aksi('alatKondisi', x.id + ':rusak') + '>Lapor rusak · minta ganti</button>') + '</div></div>'; });
    return h + '<div class="spacer-26"></div></div></div>';
  };
  A.alatKondisi = function (v) { var p = v.split(':'); P().lapor(aku().name, p[0], p[1], jobKini().lokasi); X.sekilas(p[1] === 'rusak' ? 'Dilaporkan rusak — permintaan pengganti dikirim ke gudang.' : 'Alat ditandai baik.'); };
})(ExoApp);
