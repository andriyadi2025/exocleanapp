/* ==========================================================================
   exo-admin-harga.js — konsol admin: kartu "Harga di server" pada Services &
   pricing. Menerbitkan katalog harga (tarif + terbitan, add-on, faktor tiap
   juru, voucher, flash deal, biaya) ke payment-server (sesi brankas admin +
   PIN + audit) supaya nominal pembayaran dihitung server dari angka yang sama.
   ========================================================================== */
(function (A) {
  'use strict';
  var S = A.S, VIEW = A.VIEW, AKSI = A.AKSI, esc = A.esc, aksi = A.aksi, chip = A.chip;
  S.hargaServer = S.hargaServer || { info:null, sibuk:false };
  function sesiAdmin() { var s = window.EXO_BRANKAS && EXO_BRANKAS.sesi(); return s && s.sisi === 'admin' ? s : null; }
  function denganPin(alasan, kerja) { if (!window.EXO_ADMIN_AUTH || !EXO_ADMIN_AUTH.pengguna()) { A.sekilas('Masuk sebagai admin dulu.', 'err'); return; } EXO_ADMIN_AUTH.mintaPin(alasan).then(function (ok) { if (!ok) { A.sekilas('Dibatalkan — PIN tidak disetujui.', 'err'); A.gambar(); return; } try { kerja(EXO_ADMIN_AUTH.pengguna()); } catch (e) { A.sekilas('Gagal: ' + (e.message || e), 'err'); } A.gambar(); }); }
  function muat() { if (!window.EXO_SERVER || !EXO_SERVER.hargaVersi) return; S.hargaServer.sibuk = true; EXO_SERVER.hargaVersi().then(function (r) { S.hargaServer.sibuk = false; S.hargaServer.info = r.ok ? r.data : { offline:true, error:r.error }; A.gambar(); }); }
  function kartu() {
    var i = S.hargaServer.info, lokal = window.EXO_HARGA ? EXO_HARGA.kumpulkan() : null;
    if (!i && !S.hargaServer.sibuk) setTimeout(muat, 0);
    var h = '<div class="card elev-sm gap-8"><div class="flex items-center gap-10"><div class="grow"><div class="card-title">Harga di server (nominal pembayaran ditentukan server)</div><div class="t-115 o-6">payment-server menghitung setiap tagihan dari katalog yang dipegang server — aplikasi hanya mengirim komposisi pesanan. Terbitkan katalog ini setiap kali tarif, faktor juru, voucher, atau flash deal berubah.</div></div>' + (i ? (i.offline ? chip('flat', 'server tidak terjangkau') : chip('green', 'versi ' + esc(i.versi || '?'))) : chip('flat', 'memuat…')) + '</div>';
    if (i && !i.offline) h += '<div class="t-12 o-7">Katalog server: ' + esc(i.versi || '—') + ' · ' + (i.jumlahJasa || 0) + ' jasa · ' + (i.jumlahJuru || 0) + ' juru · flash ' + (i.jumlahFlash || 0) + ' · sumber ' + esc(i.sumber || '') + (i.at ? ' · ' + esc(String(i.at).slice(0, 16).replace('T', ' ')) : '') + '</div>';
    if (lokal) h += '<div class="t-12 o-7">Katalog di konsol ini: ' + Object.keys(lokal.jasa).length + ' jasa · ' + Object.keys(lokal.juru).length + ' juru · ' + lokal.flash.length + ' flash deal · biaya aplikasi Rp' + Number(lokal.biayaAplikasi).toLocaleString('id-ID') + '</div>';
    h += '<div class="flex gap-8 wrap">' + (sesiAdmin() ? '<button class="btn btn-primary" style="height:34px;font-size:12.5px"' + aksi('hargaTerbitkan') + '>Terbitkan katalog ke server · PIN</button>' : '<span class="tag" style="font-size:11px;background:#fff4d6">Perlu sesi brankas admin (IT → Keamanan)</span>') + '<button class="btn btn-secondary" style="height:34px;font-size:12.5px"' + aksi('hargaMuat') + '>Segarkan</button></div></div><div class="spacer-14"></div>';
    return h;
  }
  var asli = VIEW.services; VIEW.services = function () { return kartu() + (asli ? asli() : ''); };
  AKSI.hargaMuat = function () { S.hargaServer.info = null; muat(); };
  AKSI.hargaTerbitkan = function () { var k = EXO_HARGA.kumpulkan(); denganPin('Terbitkan katalog harga ke payment-server (' + Object.keys(k.jasa).length + ' jasa)', function (oleh) { EXO_SERVER.hargaTerbitkan(k).then(function (r) { if (r.ok) { if (window.EXO_PERSETUJUAN) EXO_PERSETUJUAN.audit(oleh, 'Terbitkan katalog harga ke server', '', 'versi ' + (r.data.versi || '')); A.sekilas('Katalog harga tayang di server (versi ' + (r.data.versi || '') + ').'); muat(); } else A.sekilas('Gagal: ' + (r.error || 'server'), 'err'); A.gambar(); }); }); };
})(ADMIN);
