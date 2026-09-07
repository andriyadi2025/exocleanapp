/* ==========================================================================
   exo-perjalanan.js — rumpun perjalanan Darmawisata H2H (pesawat, hotel,
   kereta, bus, kapal, shuttle, sewa mobil, tur, umroh, kargo)
   --------------------------------------------------------------------------
   Pencarian jadwal/harga lewat dwi-server (/api/dwi/perjalanan/cari) — jalur
   BACA di daftar putih. Booking/Issued Darmawisata sengaja TIDAK dipanggil
   browser: manual H2H menuntut satu rangkaian pemesanan memakai accessToken
   & search spec yang sama dan mengikat kursi/kamar pada pemasok sungguhan.
   Alurnya: pelanggan memilih hasil → "Minta dipesankan" (permintaan) → tim
   EXOCLEAN memesan di portal/API Darmawisata dan mengonfirmasi harga final
   + kode booking (PIN) → pelanggan membayar dari EXO Wallet (PIN) → tiket
   diterbitkan (nomor tiket/e-voucher). Biaya layanan per rumpun dari
   setelan. Tabel: perjalananReq. Setiap hasil membawa sumber live/simulasi/
   cadangan (contoh bawaan saat server tidak terjangkau).
   ========================================================================== */
var EXO_PERJALANAN = (function () {
  'use strict';
  var RUMPUN = [
    { id:'airline', nama:'Pesawat', ikon:'✈️', cari:'Cari penerbangan', form:['dari','ke','tanggal','penumpang'] },
    { id:'hotel', nama:'Hotel', ikon:'🏨', cari:'Cari hotel', form:['kota','checkin','checkout','kamar'] },
    { id:'train', nama:'Kereta api', ikon:'🚆', cari:'Cari kereta', form:['dari','ke','tanggal','penumpang'] },
    { id:'bus', nama:'Bus', ikon:'🚌', cari:'Cari bus', form:['dari','ke','tanggal','penumpang'] },
    { id:'ship', nama:'Kapal (Pelni & DLU)', ikon:'🚢', cari:'Cari kapal', form:['dari','ke','tanggal','penumpang'] },
    { id:'shuttle', nama:'Shuttle', ikon:'🚐', cari:'Cari shuttle', form:['dari','ke','tanggal','penumpang'] },
    { id:'carrental', nama:'Sewa mobil', ikon:'🚗', cari:'Cari mobil', form:['kota','tanggal','hari'] },
    { id:'tour', nama:'Paket wisata', ikon:'🗺️', cari:'Cari paket', form:['kota','bulan'] },
    { id:'umroh', nama:'Umroh', ikon:'🕌', cari:'Cari paket umroh', form:['bulan'] },
    { id:'cargo', nama:'Kargo', ikon:'📦', cari:'Cek tarif kargo', form:['dari','ke','berat'] }
  ];
  var BAWAAN = { biaya:{ airline:25000, hotel:20000, train:10000, bus:7500, ship:10000, shuttle:5000, carrental:25000, tour:50000, umroh:250000, cargo:5000 } };
  var STATUS = { diminta:'Menunggu konfirmasi tim', dikonfirmasi:'Harga final · menunggu pembayaran', dibayar:'Dibayar · sedang diterbitkan', terbit:'Tiket terbit', dibatalkan:'Dibatalkan' };
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function rumpun(id) { for (var i = 0; i < RUMPUN.length; i++) if (RUMPUN[i].id === id) return RUMPUN[i]; return null; }
  function pengaturan() { var d = db(); var s = d && d.setting ? d.setting('perjalanan') : null; return { biaya:Object.assign({}, BAWAAN.biaya, (s && s.biaya) || {}) }; }
  function simpanPengaturan(patch) { var d = db(); if (d && d.setting) d.setting('perjalanan', Object.assign({}, pengaturan(), patch)); }
  function biaya(r) { return pengaturan().biaya[r] || 0; }
  function S() { return window.EXO_SERVER; }

  /* ---- contoh (cadangan bila server tidak terjangkau) ---- */
  function contoh(r, p) {
    var tgl = p.tanggal || p.checkin || '', dari = p.dari || p.kota || 'CGK', ke = p.ke || 'DPS';
    var buat = function (arr) { return arr.map(function (x, i) { return Object.assign({ id:r + '-contoh-' + i, sumber:'cadangan' }, x); }); };
    switch (r) {
      case 'airline': return buat([{ judul:'Garuda Indonesia GA-402', sub:dari + ' 07:05 → ' + ke + ' 10:00 · ' + tgl + ' · langsung · bagasi 20 kg', harga:1850000 }, { judul:'Citilink QG-680', sub:dari + ' 09:30 → ' + ke + ' 12:25 · ' + tgl + ' · langsung', harga:1120000 }, { judul:'Lion Air JT-012', sub:dari + ' 13:10 → ' + ke + ' 16:05 · ' + tgl + ' · langsung', harga:980000 }]);
      case 'hotel': return buat([{ judul:'Hotel Santika ' + dari, sub:'Bintang 3 · Superior · sarapan · ' + (p.checkin || '') + ' → ' + (p.checkout || ''), harga:650000 }, { judul:'Aston ' + dari + ' City Hotel', sub:'Bintang 4 · Deluxe · sarapan', harga:920000 }, { judul:'RedDoorz near ' + dari + ' Center', sub:'Budget · Standard', harga:245000 }]);
      case 'train': return buat([{ judul:'Argo Parahyangan 44', sub:dari + ' 06:30 → ' + ke + ' 09:20 · Eksekutif', harga:150000 }, { judul:'Argo Bromo Anggrek 2', sub:dari + ' 20:30 → ' + ke + ' 04:55 · Eksekutif', harga:520000 }, { judul:'Jayabaya 106', sub:dari + ' 17:25 → ' + ke + ' 04:10 · Ekonomi', harga:280000 }]);
      case 'bus': return buat([{ judul:'Sinar Jaya Executive', sub:dari + ' 19:00 → ' + ke + ' 04:30 · AC · 2-2', harga:210000 }, { judul:'Rosalia Indah Super Top', sub:dari + ' 15:00 → ' + ke + ' 02:00 · sleeper', harga:365000 }]);
      case 'ship': return buat([{ judul:'KM Kelud (Pelni)', sub:dari + ' → ' + ke + ' · ' + tgl + ' · kelas ekonomi', harga:385000 }, { judul:'KM Dharma Kartika IX (DLU)', sub:dari + ' → ' + ke + ' · ' + tgl + ' · kelas 2', harga:520000 }]);
      case 'shuttle': return buat([{ judul:'Cititrans', sub:dari + ' 08:00 → ' + ke + ' 11:00 · 10 kursi', harga:165000 }, { judul:'Jackal Holidays', sub:dari + ' 10:00 → ' + ke + ' 13:00', harga:150000 }]);
      case 'carrental': return buat([{ judul:'Toyota Avanza + sopir', sub:dari + ' · 12 jam/hari · ' + (p.hari || 1) + ' hari · BBM di luar', harga:450000 * (Number(p.hari) || 1) }, { judul:'Toyota Innova Reborn + sopir', sub:dari + ' · 12 jam/hari · ' + (p.hari || 1) + ' hari', harga:650000 * (Number(p.hari) || 1) }]);
      case 'tour': return buat([{ judul:'Bali 4D3N Explore', sub:'Hotel bintang 3 · sarapan · Uluwatu, Ubud, Kintamani · ' + (p.bulan || ''), harga:3250000 }, { judul:'Labuan Bajo 3D2N Sailing', sub:'Kapal phinisi · Komodo, Padar, Pink Beach', harga:4750000 }]);
      case 'umroh': return buat([{ judul:'Umroh 9 hari · Madinah–Makkah', sub:'Hotel bintang 4 · pesawat Saudia langsung · ' + (p.bulan || ''), harga:28500000 }, { judul:'Umroh 12 hari + Thaif', sub:'Hotel bintang 5 dekat Masjidil Haram', harga:36900000 }]);
      case 'cargo': return buat([{ judul:'Kargo darat reguler', sub:dari + ' → ' + ke + ' · ' + (p.berat || 10) + ' kg · 3–5 hari', harga:Math.max(35000, 3500 * (Number(p.berat) || 10)) }, { judul:'Kargo udara', sub:dari + ' → ' + ke + ' · ' + (p.berat || 10) + ' kg · 1–2 hari', harga:Math.max(90000, 9000 * (Number(p.berat) || 10)) }]);
    }
    return [];
  }
  /* ---- pencarian lewat server; hasil selalu { sumber, items, catatan } ---- */
  function cari(r, p) {
    if (!S() || !S().dwiPerjalananCari) return Promise.resolve({ sumber:'cadangan', items:contoh(r, p), catatan:'Jembatan server belum dimuat' });
    return S().dwiPerjalananCari(r, p).then(function (h) {
      if (!h.ok) return { sumber:'cadangan', items:contoh(r, p), catatan:h.error || 'Server Darmawisata tidak terjangkau — contoh ditampilkan' };
      var d = h.data || {}; if (String(d.status).toUpperCase() !== 'SUCCESS') return { sumber:'cadangan', items:contoh(r, p), catatan:d.respMessage || d.error || 'Permintaan ditolak' };
      return { sumber:d.simulasi ? 'simulasi' : 'live', items:(d.items || []).map(function (x, i) { return Object.assign({ id:r + '-' + i, sumber:d.simulasi ? 'simulasi' : 'live' }, x); }), catatan:d.catatan || '', mentah:d.mentahRingkas || null };
    });
  }
  function akses(segar) { if (!S() || !S().dwiPerjalananAkses) return Promise.resolve({ ok:false, rumpun:{} }); return S().dwiPerjalananAkses(segar); }

  /* ---- permintaan pemesanan ---- */
  function semua() { var d = db(); return d ? d.all('perjalananReq').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function milik(nama) { return semua().filter(function (x) { return x.pemesanNama === nama; }); }
  function minta(r, item, param, pemesan, catatan) {
    var d = db(), rm = rumpun(r); if (!d || !rm) throw new Error('Rumpun tidak dikenal');
    var no = 'TRV-' + (1000 + d.nextNo('perjalananReq'));
    return d.insert('perjalananReq', { no:no, rumpun:r, rumpunNama:rm.nama, judul:item.judul, sub:item.sub || '', hargaPerkiraan:Number(item.harga) || 0, sumberHarga:item.sumber || 'cadangan', param:param, detail:item.detail || null, pemesanId:pemesan.id || null, pemesanNama:pemesan.nama, pemesanTelp:pemesan.telp || '', catatan:catatan || '', biaya:biaya(r), status:'diminta', at:kini(), riwayat:[{ at:kini(), oleh:pemesan.nama, aksi:'diminta' }] });
  }
  function konfirmasi(id, hargaFinal, kodeBooking, catatan, oleh) { var d = db(), x = d.find('perjalananReq', id); if (!x || x.status !== 'diminta') throw new Error('Permintaan tidak dalam status diminta'); hargaFinal = Number(hargaFinal) || 0; if (hargaFinal <= 0) throw new Error('Harga final harus > 0'); return d.update('perjalananReq', id, { status:'dikonfirmasi', hargaFinal:hargaFinal, total:hargaFinal + (x.biaya || 0), kodeBooking:String(kodeBooking || '').trim(), catatanAdmin:catatan || '', dikonfirmasiAt:kini(), batasBayar:new Date(Date.now() + 2 * 3600000).toISOString(), riwayat:(x.riwayat || []).concat([{ at:kini(), oleh:oleh, aksi:'dikonfirmasi ' + rp(hargaFinal) + (kodeBooking ? ' · ' + kodeBooking : '') }]) }); }
  function tandaiBayar(id) { var d = db(), x = d.find('perjalananReq', id); if (!x || x.status !== 'dikonfirmasi') throw new Error('Belum dikonfirmasi'); return d.update('perjalananReq', id, { status:'dibayar', dibayarAt:kini(), dompetDipotong:true, riwayat:(x.riwayat || []).concat([{ at:kini(), oleh:x.pemesanNama, aksi:'dibayar ' + rp(x.total) }]) }); }
  function terbit(id, nomorTiket, oleh) { var d = db(), x = d.find('perjalananReq', id); if (!x || x.status !== 'dibayar') throw new Error('Belum dibayar'); return d.update('perjalananReq', id, { status:'terbit', nomorTiket:String(nomorTiket || '').trim(), terbitAt:kini(), riwayat:(x.riwayat || []).concat([{ at:kini(), oleh:oleh, aksi:'terbit ' + (nomorTiket || '') }]) }); }
  function batal(id, alasan, oleh) { var d = db(), x = d.find('perjalananReq', id); if (!x || x.status === 'terbit') throw new Error('Tiket sudah terbit — pembatalan lewat refund penyedia'); var refund = x.status === 'dibayar' ? x.total : 0; return d.update('perjalananReq', id, { status:'dibatalkan', alasanBatal:alasan || '', refund:refund, perluRefund:refund > 0, dibatalkanAt:kini(), riwayat:(x.riwayat || []).concat([{ at:kini(), oleh:oleh, aksi:'dibatalkan' + (refund ? ' · refund ' + rp(refund) : '') }]) }); }
  function ringkasan() { var s = semua(); var n = function (st) { return s.filter(function (x) { return x.status === st; }).length; }; return { total:s.length, diminta:n('diminta'), dikonfirmasi:n('dikonfirmasi'), dibayar:n('dibayar'), terbit:n('terbit'), dibatalkan:n('dibatalkan'), omzet:s.filter(function (x) { return x.status === 'dibayar' || x.status === 'terbit'; }).reduce(function (a, x) { return a + (x.total || 0); }, 0), pendapatan:s.filter(function (x) { return x.status === 'dibayar' || x.status === 'terbit'; }).reduce(function (a, x) { return a + (x.biaya || 0); }, 0) }; }
  return { RUMPUN:RUMPUN, STATUS:STATUS, rp:rp, rumpun:rumpun, pengaturan:pengaturan, simpanPengaturan:simpanPengaturan, biaya:biaya, contoh:contoh, cari:cari, akses:akses, semua:semua, milik:milik, minta:minta, konfirmasi:konfirmasi, tandaiBayar:tandaiBayar, terbit:terbit, batal:batal, ringkasan:ringkasan };
})();
