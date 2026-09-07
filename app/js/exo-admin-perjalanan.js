/* ==========================================================================
   exo-admin-perjalanan.js — konsol admin: Perjalanan — Darmawisata
   --------------------------------------------------------------------------
   Tab: permintaan (antrean pemesanan: konfirmasi harga final + kode booking
   dengan PIN, tandai terbit, batalkan/refund) · akses rumpun (ping 10 rumpun
   ke akun agen) · setelan biaya layanan per rumpun (PIN + audit).
   Booking/Issued dilakukan tim di portal Darmawisata; jalur uang API tidak
   dibuka dari browser.
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip, kpi = A.kpi, tabel = A.tabel, pill = A.pill;
  var P = function () { return window.EXO_PERJALANAN; }, rp = function (n) { return P().rp(n); };
  S.trvTab = S.trvTab || 'permintaan'; S.trvAkses = S.trvAkses || null; S.trvForm = S.trvForm || {};
  function siapa() { var u = window.EXO_ADMIN_AUTH && EXO_ADMIN_AUTH.pengguna(); return u ? { id:u.id, nama:u.nama } : null; }
  function denganPin(alasan, kerja) { if (!siapa()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(siapa()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function segarkanAkses() { if (!window.EXO_SERVER) return; S.trvAkses = { memuat:true }; P().akses(true).then(function (r) { S.trvAkses = Object.assign({ memuat:false }, r || {}); A.gambar(); }); }
  VIEW.perjalanan = function () {
    if (!window.EXO_PERJALANAN) return '<div class="card elev-sm">Modul perjalanan (js/exo-perjalanan.js) belum dimuat.</div>';
    var h = '<div class="flex gap-8 wrap items-center">' + [['permintaan', 'Permintaan pemesanan'], ['akses', 'Akses rumpun di akun'], ['setelan', 'Biaya layanan']].map(function (t) { return pill(S.trvTab === t[0], t[1], 'trvTab', t[0], true); }).join('') + '</div>';
    return h + ({ permintaan:tabPermintaan, akses:tabAkses, setelan:tabSetelan }[S.trvTab] || tabPermintaan)();
  };
  AKSI.trvTab = function (v) { S.trvTab = v; };
  function statusChip(st) { return chip(st === 'terbit' ? 'green' : st === 'dibatalkan' ? 'flat' : 'accent', P().STATUS[st] || st); }
  function tabPermintaan() {
    var r = P().ringkasan(), semua = P().semua();
    var h = kpi([{label:'Menunggu konfirmasi', value:String(r.diminta), note:'pesan di portal Darmawisata, isi harga final + kode booking', good:!r.diminta},{label:'Menunggu pembayaran', value:String(r.dikonfirmasi), note:'batas 2 jam setelah konfirmasi'},{label:'Dibayar · belum terbit', value:String(r.dibayar), note:'isi nomor tiket/e-voucher', good:!r.dibayar},{label:'Omzet & fee', value:rp(r.omzet), note:'fee layanan ' + rp(r.pendapatan) + ' → akun 4140'}], true, 4);
    h += '<div class="card elev-sm table-card"><div class="card-head"><div class="grow"><div class="card-title">Permintaan pemesanan (perjalananReq)</div><div class="t-115 o-6">Alur: diminta → dikonfirmasi (harga final, kode booking) → dibayar pelanggan dari EXO Wallet → terbit (nomor tiket). Pembatalan setelah bayar mengembalikan dompet otomatis.</div></div></div>' +
      tabel(['Waktu', 'No', 'Rumpun', 'Pilihan', 'Pemesan', 'Perkiraan', 'Final / total', 'Status', ''], semua.length ? semua.map(function (x) { var f = S.trvForm[x.id] || {}; var aksiKolom = '';
        if (x.status === 'diminta') aksiKolom = '<div class="stack gap-4" style="min-width:220px"><input class="input" style="height:32px" placeholder="Harga final (Rp)" inputmode="numeric" value="' + esc(f.harga || '') + '" data-ubah="trvUbah" data-arg="' + x.id + ':harga"><input class="input" style="height:32px" placeholder="Kode booking (PNR)" value="' + esc(f.kode || '') + '" data-ubah="trvUbah" data-arg="' + x.id + ':kode"><div class="flex gap-6"><button class="btn btn-primary" style="height:30px;padding:0 10px;font-size:11.5px"' + aksi('trvKonfirmasi', x.id) + '>Konfirmasi · PIN</button><button class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:11.5px"' + aksi('trvTolak', x.id) + '>Tolak</button></div></div>';
        else if (x.status === 'dibayar') aksiKolom = '<div class="stack gap-4" style="min-width:200px"><input class="input" style="height:32px" placeholder="Nomor tiket / e-voucher" value="' + esc(f.tiket || '') + '" data-ubah="trvUbah" data-arg="' + x.id + ':tiket"><div class="flex gap-6"><button class="btn btn-primary" style="height:30px;padding:0 10px;font-size:11.5px"' + aksi('trvTerbit', x.id) + '>Terbitkan · PIN</button><button class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:11.5px"' + aksi('trvTolak', x.id) + '>Batalkan & refund</button></div></div>';
        else if (x.status === 'dikonfirmasi') aksiKolom = '<button class="btn btn-secondary" style="height:30px;padding:0 10px;font-size:11.5px"' + aksi('trvTolak', x.id) + '>Batalkan</button>';
        return [esc(String(x.at).slice(0, 16).replace('T', ' ')), '<span class="id">' + esc(x.no) + '</span>', esc(x.rumpunNama), '<b>' + esc(x.judul) + '</b><br><span class="t-11 o-6">' + esc((x.sub || '').slice(0, 80)) + (x.catatan ? '<br>Catatan: ' + esc(x.catatan) : '') + '</span>', esc(x.pemesanNama) + (x.pemesanTelp ? '<br><span class="t-11 o-6">' + esc(x.pemesanTelp) + '</span>' : ''), rp(x.hargaPerkiraan) + '<br><span class="t-11 o-6">' + esc(x.sumberHarga) + '</span>', x.hargaFinal ? rp(x.hargaFinal) + '<br><b>' + rp(x.total) + '</b>' + (x.kodeBooking ? '<br><span class="t-11">' + esc(x.kodeBooking) + '</span>' : '') : '—', statusChip(x.status) + (x.nomorTiket ? '<br><span class="t-11">' + esc(x.nomorTiket) + '</span>' : ''), aksiKolom]; }) : [['<span class="o-6">Belum ada permintaan.</span>', '', '', '', '', '', '', '', '']]) + '</div>';
    return h;
  }
  AKSI.trvUbah = function (arg, v) { var p = arg.split(':'); S.trvForm[p[0]] = S.trvForm[p[0]] || {}; S.trvForm[p[0]][p[1]] = String(v || '').trim(); };
  AKSI.trvKonfirmasi = function (id) { var f = S.trvForm[id] || {}, harga = Number(String(f.harga || '').replace(/\D/g, '')); if (!harga) { A.sekilas('Isi harga final dulu.', 'err'); return; } var x = EXO_DB.find('perjalananReq', id); denganPin('Konfirmasi ' + x.no + ' · ' + rp(harga) + (f.kode ? ' · ' + f.kode : ''), function (oleh) { P().konfirmasi(id, harga, f.kode, '', oleh.nama); EXO_PERSETUJUAN.audit(oleh, 'Konfirmasi perjalanan ' + x.no, id, rp(harga) + ' ' + (f.kode || '')); delete S.trvForm[id]; A.sekilas('Dikonfirmasi · pelanggan diminta membayar dalam 2 jam.'); }); };
  AKSI.trvTerbit = function (id) { var f = S.trvForm[id] || {}; if (!f.tiket) { A.sekilas('Isi nomor tiket / e-voucher.', 'err'); return; } var x = EXO_DB.find('perjalananReq', id); denganPin('Terbitkan tiket ' + x.no + ' · ' + f.tiket, function (oleh) { P().terbit(id, f.tiket, oleh.nama); EXO_PERSETUJUAN.audit(oleh, 'Terbit tiket perjalanan ' + x.no, id, f.tiket); delete S.trvForm[id]; A.sekilas('Tiket terbit · tampil di aplikasi pelanggan.'); }); };
  AKSI.trvTolak = function (id) { var alasan = window.prompt('Alasan pembatalan (tampil ke pelanggan):', 'Kursi/kamar tidak tersedia'); if (alasan === null) return; var x = EXO_DB.find('perjalananReq', id); denganPin('Batalkan ' + x.no + (x.status === 'dibayar' ? ' · refund ' + rp(x.total) : ''), function (oleh) { P().batal(id, alasan, oleh.nama); EXO_PERSETUJUAN.audit(oleh, 'Batalkan perjalanan ' + x.no, id, alasan); A.sekilas('Dibatalkan' + (x.status === 'dibayar' ? ' · dompet pelanggan dikembalikan otomatis' : '') + '.'); }); };
  function tabAkses() {
    var a = S.trvAkses; if (!a) segarkanAkses();
    var h = '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="card-title grow">Rumpun yang berlisensi di akun agen' + (a && a.mode ? ' · mode ' + esc(a.mode) : '') + '</div><button class="btn btn-secondary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('trvSegarkanAkses') + '>Periksa ulang</button></div><div class="t-115 o-6 lh-15">Tiap rumpun diketuk lewat endpoint termurahnya (mis. /Airline/List). "agent doesn\'t has access" = belum berlisensi di kontrak Darmawisata, bukan galat teknis; rumpun itu tampil sebagai contoh di aplikasi pelanggan.</div>' +
      tabel(['Rumpun', 'Jalur ketuk', 'Status', 'Keterangan'], P().RUMPUN.map(function (r) { var x = a && a.rumpun && a.rumpun[r.id]; return [r.ikon + ' <b>' + esc(r.nama) + '</b>', '<span class="id">' + esc(x && x.jalur || '—') + '</span>', a && a.memuat ? chip('flat', 'memeriksa…') : !x ? chip('flat', 'belum diperiksa') : x.ok ? chip('green', 'tersedia') : chip('accent', 'tidak'), esc(x ? (x.ok ? (x.n != null ? x.n + ' entri' : 'OK') : (x.pesan || '')) : '')]; })) + '</div>';
    return h;
  }
  AKSI.trvSegarkanAkses = function () { segarkanAkses(); };
  function tabSetelan() {
    var p = P().pengaturan(), f = S.trvBiaya || (S.trvBiaya = Object.assign({}, p.biaya));
    return '<div class="card elev-sm gap-10" style="max-width:560px"><div class="card-title">Biaya layanan per pesanan</div><div class="grid g2" style="gap:8px">' + P().RUMPUN.map(function (r) { return '<div class="field"><label>' + r.ikon + ' ' + esc(r.nama) + ' (Rp)</label><input class="input" inputmode="numeric" value="' + esc(f[r.id]) + '" data-ubah="trvBiayaUbah" data-arg="' + r.id + '"></div>'; }).join('') + '</div><div class="t-115 o-6 lh-15">Ditambahkan di atas harga final penyedia dan diakui sebagai pendapatan (akun 4140). Perubahan dengan PIN dan tercatat di audit.</div><button class="btn btn-primary" style="height:38px;align-self:flex-start"' + aksi('trvBiayaSimpan') + '>Simpan · PIN</button></div>';
  }
  AKSI.trvBiayaUbah = function (arg, v) { if (S.trvBiaya) S.trvBiaya[arg] = Number(String(v).replace(/\D/g, '')) || 0; };
  AKSI.trvBiayaSimpan = function () { var f = S.trvBiaya; if (!f) return; denganPin('Ubah biaya layanan perjalanan', function (oleh) { P().simpanPengaturan({ biaya:f }); EXO_PERSETUJUAN.audit(oleh, 'Ubah biaya layanan perjalanan', '', JSON.stringify(f)); S.trvBiaya = null; A.sekilas('Biaya layanan tersimpan.'); }); };
})(ADMIN);
