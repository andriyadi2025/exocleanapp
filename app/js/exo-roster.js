/* ==========================================================================
   exo-roster.js — tarif dan roster juru bersih EXOCLEAN App
   --------------------------------------------------------------------------
   SATU KEPUTUSAN: pelanggan memilih ORANGNYA, dan tiap juru bersih tampil
   dengan tarifnya sendiri. Yang menetapkan tarif adalah admin EXOCLEAN,
   bukan juru bersihnya. Bentuk datanya di users[i].pasar:
     { tarif: 78000, aktif: true, olehId, olehNama, at }
   Mitra tanpa tarif TIDAK TAYANG — tidak ada tarif yang terisi sendiri.
   ========================================================================== */
var EXO_ROSTER = (function () {
  'use strict';
  var MIN = 30000, MAX = 500000;
  var USULAN = { 'Leader Tim': 95000, 'Teknisi Kaca': 110000, 'Teknisi Karpet & Sofa': 105000, 'Operator Poles': 100000, 'Cleaner': 78000 };
  var USULAN_LAIN = 80000;
  function kosong() { return { tarif: null, aktif: false, olehId: null, olehNama: null, at: null }; }
  function data(u) { return (u && u.pasar) ? u.pasar : kosong(); }
  function tarif(u) { return data(u).tarif; }
  function usulan(u) { return USULAN[(u || {}).jabatan] || USULAN_LAIN; }
  function tayang(u) { var p = data(u); return !!(u && u.aktif && u.role === 'worker' && p.aktif && p.tarif); }
  function periksa(nilai) {
    var n = Number(nilai);
    if (!nilai && nilai !== 0) return 'Tarif belum diisi.';
    if (!isFinite(n)) return 'Tarif harus berupa angka.';
    if (n !== Math.round(n)) return 'Tarif tidak memakai pecahan rupiah.';
    if (n < MIN) return 'Tarif di bawah Rp' + MIN.toLocaleString('id-ID') + ' — periksa lagi.';
    if (n > MAX) return 'Tarif di atas Rp' + MAX.toLocaleString('id-ID') + ' — kemungkinan kelebihan satu nol.';
    return null;
  }
  /* oleh = { id, nama } admin yang menetapkan. */
  function setTarif(userId, nilai, aktif, oleh) {
    var u = EXO_DB.find('users', userId);
    if (!u || u.role !== 'worker') return { ok: false, alasan: 'Mitra tidak ditemukan.' };
    var salah = periksa(nilai); if (salah) return { ok: false, alasan: salah };
    oleh = oleh || {};
    EXO_DB.update('users', userId, { pasar: { tarif: Number(nilai), aktif: !!aktif, olehId: oleh.id || null, olehNama: oleh.nama || null, at: EXO_UTIL.nowISO() } });
    EXO_DB.log(oleh.id || null, 'tarif', 'user', userId, 'Tarif ' + u.nama + ' ditetapkan Rp' + Number(nilai).toLocaleString('id-ID') + (aktif ? ' dan ditayangkan.' : ' tanpa ditayangkan.'));
    return { ok: true };
  }
  function setTayang(userId, aktif) {
    var u = EXO_DB.find('users', userId); if (!u) return { ok: false, alasan: 'Mitra tidak ditemukan.' };
    var p = data(u); if (aktif && !p.tarif) return { ok: false, alasan: 'Tetapkan tarifnya dulu sebelum ditayangkan.' };
    EXO_DB.update('users', userId, { pasar: Object.assign({}, p, { aktif: !!aktif }) });
    return { ok: true };
  }
  function siap() { return !!(window.EXO_DB && EXO_DB.raw); }
  function statistik(userId) {
    if (!siap()) return { bintang: null, kerja: 0 };
    var selesai = 0, jumlah = 0, n = 0, punyaNilai = {};
    EXO_DB.all('ratings').forEach(function (r) { punyaNilai[r.orderId] = r.bintang; });
    EXO_DB.all('orders').forEach(function (o) {
      if (!o.workerIds || o.workerIds.indexOf(userId) < 0) return;
      if (['selesai', 'diverifikasi', 'ditagih', 'lunas'].indexOf(o.status) < 0) return;
      selesai++; if (punyaNilai[o.id] !== undefined) { jumlah += punyaNilai[o.id]; n++; }
    });
    return { bintang: n ? Math.round(jumlah / n * 10) / 10 : null, kerja: selesai };
  }
  function juruBersih() {
    if (!siap()) return [];
    return EXO_DB.all('users').filter(tayang).map(function (u) {
      var s = statistik(u.id);
      return { id: u.id, nama: u.nama, inisial: EXO_UTIL.initials(u.nama), jabatan: u.jabatan || '', tarif: u.pasar.tarif, bintang: s.bintang, kerja: s.kerja,
        sertifikat: (u.sertifikat || []).slice(), sejak: u.daftarAt || u.createdAt || null, telp: u.telp || '' };
    }).sort(function (a, b) { return a.tarif - b.tarif; });
  }
  return { MIN: MIN, MAX: MAX, data: data, tarif: tarif, usulan: usulan, tayang: tayang, periksa: periksa, setTarif: setTarif, setTayang: setTayang, statistik: statistik, juruBersih: juruBersih };
})();
