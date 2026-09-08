/* ==========================================================================
   exo-admin-tas.js — konsol admin: Isi tas mitra
   --------------------------------------------------------------------------
   Tab per layanan: profil isi tas (item chemical / habis pakai / APD dan
   kapasitasnya) — tambah dari stok, kurangi, ubah kapasitas; diajukan lewat
   PIN + Persetujuan 'tas-standar'. Penugasan layanan per mitra (menentukan
   profil mana yang berlaku) disimpan dengan PIN + audit. Tabel isi tas tiap
   mitra saat ini (sinkron otomatis ke profil).
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, pill = A.pill, kpi = A.kpi, tabel = A.tabel, meter = A.meter;
  var P = function () { return window.EXO_PERLENGKAPAN; }, rp = function (n) { return P().rp(n); };
  var JASA = [['hourly', 'Cleaning per jam'], ['deep', 'Deep cleaning'], ['ac', 'Cuci & servis AC'], ['sofa', 'Sofa, kasur & karpet'], ['laundry', 'Laundry']];
  S.tasJasa = S.tasJasa || 'hourly';
  function namaJasa(j) { return (JASA.filter(function (x) { return x[0] === j; })[0] || [j, j])[1]; }
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function namaMitra() { var d = window.EXO_DATA, out = {}; ((d && d.CLEANERS) || []).forEach(function (c) { out[c.name] = 1; }); (window.EXO_DB ? EXO_DB.all('users') : []).forEach(function (u) { if (u.role === 'partner' || u.role === 'mitra') out[u.nama || u.name] = 1; }); P().semuaMitraTas().forEach(function (m) { out[m] = 1; }); return Object.keys(out).filter(Boolean).sort(); }
  function form() { var j = S.tasJasa; if (!S.tasForm || S.tasForm.jasa !== j) S.tasForm = { jasa:j, daftar:P().tasStandar(j).map(function (x) { return x.slice(); }) }; return S.tasForm; }
  function nilaiTas(daftar) { return daftar.reduce(function (n, x) { var it = P().item(x[0]); return n + (it ? x[1] / (it.isiUnit || 1) * it.harga : 0); }, 0); }

  VIEW.tas = function () {
    if (!P()) return '<div class="card elev-sm">Modul perlengkapan belum dimuat.</div>';
    P().semai(); var f = form(), stok = P().stok(), lama = P().tasStandar(f.jasa), beda = JSON.stringify(lama) !== JSON.stringify(f.daftar), mitra = namaMitra();
    var h = kpi([{label:'Profil layanan', value:String(JASA.length), note:JASA.map(function (j) { return P().tasStandar(j[0]).length + ' item ' + j[1].split(' ')[0]; }).join(' · ')},{label:'Nilai isi tas ' + namaJasa(f.jasa), value:rp(nilaiTas(f.daftar)), note:f.daftar.length + ' item · harga beli per kemasan'},{label:'Mitra dengan tas', value:String(P().semuaMitraTas().length), note:mitra.length + ' mitra terdaftar'},{label:'Isi ulang menunggu', value:String(P().daftarIsiUlang('diminta').length), note:'antrean di Inventaris'}], true, 4);
    h += '<div class="spacer-14"></div><div class="grid g2" style="gap:16px"><div class="card elev-sm gap-10"><div class="flex items-center gap-8 wrap"><div class="grow"><div class="card-title">Profil isi tas per layanan</div><div class="t-115 o-6">Tentukan item dan kapasitas (ml untuk chemical, pcs untuk habis pakai & APD). Tas mitra otomatis mengikuti profil: item baru dibuat penuh, item yang dihapus ikut hilang, kapasitas menyesuaikan.</div></div>' + JASA.map(function (j) { return pill(f.jasa === j[0], j[1], 'tasJasa', j[0], true); }).join('') + '</div>';
    h += tabel(['Item', 'Kategori', 'Kapasitas', 'Satuan', 'Kemasan', 'Nilai', ''], f.daftar.length ? f.daftar.map(function (x, i) { var it = P().item(x[0]); return ['<b>' + esc(x[0]) + '</b>' + (it ? '' : ' <span class="t-11" style="color:#b12a5b">tidak ada di stok</span>'), esc(it ? it.kategori : '—'), '<input class="input" style="width:90px;height:30px" inputmode="numeric" value="' + x[1] + '" data-ubah="tasUbah" data-arg="' + i + '">', esc(it ? it.satuanIsi : ''), it ? 'isi ' + it.isiUnit + ' · ' + rp(it.harga) : '', it ? rp(x[1] / (it.isiUnit || 1) * it.harga) : '', '<button class="pill pill-sm"' + aksi('tasHapus', i) + '>✕</button>']; }) : [['<span class="o-6">Profil kosong — tambahkan item dari stok.</span>', '', '', '', '', '', '']]);
    h += '<div class="flex items-center gap-8 wrap"><select class="input" style="height:34px;max-width:320px" data-ubah="tasTambah"><option value="">+ Tambah item dari stok gudang…</option>' + stok.filter(function (s) { return s.kategori !== 'alat' && !f.daftar.some(function (x) { return x[0] === s.nama; }); }).map(function (s) { return '<option value="' + esc(s.nama) + '">' + esc(s.nama) + ' (' + esc(s.kategori) + ', isi ' + s.isiUnit + ' ' + esc(s.satuanIsi) + ')</option>'; }).join('') + '</select><button class="pill pill-sm"' + aksi('tasBawaan') + '>Isi dari norma jasa</button><span class="grow"></span><button class="btn btn-secondary" style="height:34px"' + aksi('tasBatal') + '>Batalkan</button><button class="btn btn-primary" style="height:34px"' + (beda ? '' : ' disabled') + aksi('tasAjukan') + '>Ajukan · PIN + Persetujuan</button></div>' + (beda ? '<div class="t-11" style="color:#b45309">Ada perubahan yang belum diajukan.</div>' : '') + '</div>';
    /* penugasan layanan per mitra */
    h += '<div class="card elev-sm gap-8"><div class="card-title">Layanan tiap mitra (fungsi kerja)</div><div class="t-115 o-6">Profil tas yang berlaku untuk mitra = gabungan layanan yang dicentang (kapasitas terbesar bila item sama). Bawaan: semua layanan.</div><div class="stack gap-6">' + mitra.map(function (m) { var js = P().mitraJasa(m), ubah = S.tasMitraForm && S.tasMitraForm.mitra === m; var daftar = ubah ? S.tasMitraForm.jasa : js; return '<div class="flex items-center gap-8 wrap" style="padding:6px 0;border-bottom:1px solid var(--color-divider)"><b class="t-125" style="width:170px">' + esc(m) + '</b><div class="flex gap-4 wrap grow">' + JASA.map(function (j) { return pill(daftar.indexOf(j[0]) >= 0, j[1].split(' ')[0], 'tasMitraJasa', m + '|' + j[0], true); }).join('') + '</div>' + (ubah ? '<button class="btn btn-primary" style="height:28px;padding:0 10px;font-size:11.5px"' + aksi('tasMitraSimpan') + '>Simpan · PIN</button>' : '<span class="t-11 o-6">' + P().tasStandarMitra(m).length + ' item</span>') + '</div>'; }).join('') + '</div></div></div>';
    /* isi tas saat ini */
    var semua = P().semuaMitraTas();
    h += '<div class="spacer-14"></div><div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Isi tas mitra saat ini</div><div class="t-115 o-6">Berkurang otomatis tiap laporan job; kembali penuh saat paket isi ulang diserahkan (Inventaris).</div></div></div>' + tabel(['Mitra', 'Item', 'Sisa / kapasitas', 'Isi', 'Terakhir isi'], semua.length ? [].concat.apply([], semua.map(function (m) { return P().tas(m).map(function (t) { return ['<b>' + esc(m) + '</b>', esc(t.nama), Math.round(t.sisa) + ' / ' + t.kapasitas + ' ' + esc(t.satuan), meter(t.pct, t.pct < 50 ? 'acc' : 'soft'), esc(t.terakhirIsi)]; }); })) : [['<span class="o-6">Belum ada mitra dengan tas — tas terbentuk saat mitra membuka layar Tas atau mengirim laporan job.</span>', '', '', '', '']]) + '</div>';
    return h;
  };
  AKSI.tasJasa = function (v) { S.tasJasa = v; S.tasForm = null; };
  AKSI.tasUbah = function (i, v) { form().daftar[+i][1] = Math.max(0, Number(String(v).replace(/[^\d.]/g, '')) || 0); };
  AKSI.tasHapus = function (i) { form().daftar.splice(+i, 1); };
  AKSI.tasTambah = function (a, v) { var it = v ? P().item(v) : null; if (it) form().daftar.push([it.nama, it.isiUnit || 1]); };
  AKSI.tasBawaan = function () { form().daftar = P().tasStandarBawaan(S.tasJasa); };
  AKSI.tasBatal = function () { S.tasForm = null; };
  AKSI.tasAjukan = function () {
    var f = form(), lama = P().tasStandar(f.jasa), daftar = f.daftar.filter(function (x) { return x[1] > 0; }); if (JSON.stringify(lama) === JSON.stringify(daftar)) { A.sekilas('Tidak ada perubahan.'); return; }
    denganPin('Ubah profil isi tas ' + namaJasa(f.jasa), function (oleh) { var h = EXO_PERSETUJUAN.ajukan('tas-standar', 'Ubah profil isi tas · ' + namaJasa(f.jasa), daftar.map(function (x) { return x[0] + ' ' + x[1]; }).join('; '), lama, daftar, { jasa:f.jasa, daftar:daftar }, oleh); EXO_PERSETUJUAN.audit(oleh, 'Ajukan profil isi tas ' + namaJasa(f.jasa), h.usulan.id, daftar.length + ' item'); S.tasForm = null; A.sekilas(h.langsung ? 'Profil isi tas diterapkan — tas mitra disinkronkan.' : 'Usulan masuk antrean Persetujuan · butuh ' + h.usulan.butuh + ' penyetuju.'); });
  };
  AKSI.tasMitraJasa = function (arg) { var p = arg.split('|'), m = p[0], j = p[1]; if (!S.tasMitraForm || S.tasMitraForm.mitra !== m) S.tasMitraForm = { mitra:m, jasa:P().mitraJasa(m).slice() }; var f = S.tasMitraForm, i = f.jasa.indexOf(j); if (i >= 0) f.jasa.splice(i, 1); else f.jasa.push(j); };
  AKSI.tasMitraSimpan = function () { var f = S.tasMitraForm; if (!f) return; if (!f.jasa.length) { A.sekilas('Pilih minimal satu layanan.', 'err'); return; } denganPin('Ubah layanan mitra ' + f.mitra, function (oleh) { P().simpanMitraJasa(f.mitra, f.jasa); P().tas(f.mitra); EXO_PERSETUJUAN.audit(oleh, 'Ubah layanan mitra ' + f.mitra, '', f.jasa.join(', ')); S.tasMitraForm = null; A.sekilas('Layanan ' + f.mitra + ' disimpan — tas disinkronkan.'); }); };
})(ADMIN);
