/* ==========================================================================
   exo-keselamatan.js — keselamatan mitra cleaning: kontak darurat, SOS,
   pemantau respons job
   --------------------------------------------------------------------------
   · kontakDarurat: dua orang terdekat per mitra (nama, hubungan, nomor,
     terverifikasi OTP, diperbaruiAt). Wajib diperbarui tiap 180 hari atau
     bila nomor belum/gagal diverifikasi. Nomor hanya dibuka tim keselamatan
     lewat PIN dan tercatat di audit (admin → Mitra → Keselamatan mitra).
   · sosInsiden: tombol SOS dari layar job — merekam lokasi, nomor job,
     waktu; ops & kontak darurat diberi tahu (simulasi kirim); status
     aktif → ditangani → selesai / dibatalkan (salah tekan ≤ 30 detik).
   · jobLapangan: jejak mulai rute / tiba / selesai per job. Job yang lewat
     30 menit dari jadwal tanpa "mulai" dianggap tidak merespons → peringatan
     ops dan kartu di beranda mitra.
   ========================================================================== */
var EXO_KESELAMATAN = (function () {
  'use strict';
  var HARI_PERBARUI = 180, MENIT_RESPON = 30, DETIK_BATAL_SOS = 30;
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function hariIni() { return kini().slice(0, 10); }
  function samarkan(no) { var d = String(no || '').replace(/\D/g, ''); if (d.indexOf('62') === 0) d = '0' + d.slice(2); if (d.length < 6) return '••••'; return d.slice(0, 4) + '-••••-' + d.slice(-4); }

  /* ---------- kontak darurat ---------- */
  function kontak(mitra) { var d = db(); return d ? d.all('kontakDarurat').filter(function (k) { return k.mitra === mitra; }).sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); }) : []; }
  function simpanKontak(mitra, daftar) {
    var d = db(); if (!d) return []; var ada = kontak(mitra);
    (daftar || []).slice(0, 2).forEach(function (k, i) { var baris = { mitra:mitra, urut:i, nama:String(k.name || k.nama || '').trim(), hubungan:k.rel || k.hubungan || '', nomor:String(k.phone || k.nomor || '').trim(), terverifikasi:!!(k.verified || k.terverifikasi), diperbaruiAt:k.diperbaruiAt || hariIni() }; if (ada[i]) d.update('kontakDarurat', ada[i].id, baris); else d.insert('kontakDarurat', baris); });
    return kontak(mitra);
  }
  function statusKontak(mitra) {
    var k = kontak(mitra); if (k.length < 2) return { ok:false, alasan:'Kontak darurat belum lengkap (wajib 2 orang).', k:k };
    var belum = k.filter(function (x) { return !x.terverifikasi; }); if (belum.length) return { ok:false, alasan:belum.length + ' nomor belum diverifikasi OTP.', k:k };
    var tua = k.reduce(function (m, x) { return x.diperbaruiAt < m ? x.diperbaruiAt : m; }, hariIni()), umur = Math.floor((Date.now() - new Date(tua).getTime()) / 86400000);
    if (umur >= HARI_PERBARUI) return { ok:false, alasan:'Terakhir diperbarui ' + umur + ' hari lalu — konfirmasi ulang tiap ' + HARI_PERBARUI + ' hari.', k:k, umur:umur };
    return { ok:true, alasan:'Diperbarui ' + umur + ' hari lalu.', k:k, umur:umur };
  }
  function tandaiDiperbarui(mitra) { var d = db(); kontak(mitra).forEach(function (k) { d.update('kontakDarurat', k.id, { diperbaruiAt:hariIni() }); }); }
  function semuaMitraKontak() { var d = db(); if (!d) return []; var m = {}; d.all('kontakDarurat').forEach(function (k) { m[k.mitra] = 1; }); return Object.keys(m).sort(); }

  /* ---------- SOS ---------- */
  function sos(mitra, job, lokasi, catatan) {
    var d = db(); if (!d) return null; var aktif = d.all('sosInsiden').filter(function (s) { return s.mitra === mitra && s.status === 'aktif'; })[0]; if (aktif) return aktif;
    var k = kontak(mitra);
    return d.insert('sosInsiden', { mitra:mitra, jobNo:job && job.no || '', jasa:job && job.jasa || '', pelanggan:job && job.pelanggan || '', alamat:job && job.alamat || '', lokasi:lokasi || null, catatan:catatan || '', status:'aktif', at:kini(), diberitahu:[{ ke:'Ops EXOCLEAN', via:'dasbor + telepon', at:kini() }].concat(k.map(function (x) { return { ke:x.nama + ' (' + x.hubungan + ')', via:'SMS/WA ' + samarkan(x.nomor), at:kini() }; })), riwayat:[{ at:kini(), oleh:mitra, aksi:'SOS ditekan' }] });
  }
  function sosAktif(mitra) { var d = db(); return d ? d.all('sosInsiden').filter(function (s) { return s.mitra === mitra && (s.status === 'aktif' || s.status === 'ditangani'); })[0] || null : null; }
  function sosBatal(id, mitra) { var d = db(), s = d.find('sosInsiden', id); if (!s) return null; var detik = (Date.now() - new Date(s.at).getTime()) / 1000; if (detik > DETIK_BATAL_SOS) throw new Error('Lewat ' + DETIK_BATAL_SOS + ' detik — ops sudah dihubungi; kabari ops bahwa Anda aman.'); return d.update('sosInsiden', id, { status:'dibatalkan', riwayat:(s.riwayat || []).concat([{ at:kini(), oleh:mitra, aksi:'dibatalkan (salah tekan)' }]) }); }
  function sosAman(id, mitra) { var d = db(), s = d.find('sosInsiden', id); if (!s) return null; return d.update('sosInsiden', id, { status:'selesai', riwayat:(s.riwayat || []).concat([{ at:kini(), oleh:mitra, aksi:'mitra melapor aman' }]) }); }
  function sosTangani(id, status, oleh, catatan) { var d = db(), s = d.find('sosInsiden', id); if (!s) throw new Error('Insiden tidak ditemukan'); return d.update('sosInsiden', id, { status:status, ditanganiOleh:oleh || '', riwayat:(s.riwayat || []).concat([{ at:kini(), oleh:oleh || 'ops', aksi:status + (catatan ? ' · ' + catatan : '') }]) }); }
  function daftarSos() { var d = db(); return d ? d.all('sosInsiden').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }

  /* ---------- pemantau respons job ---------- */
  function catatJob(mitra, no, jadwalISO, tahap, lokasi) { var d = db(); if (!d || !no) return null; var r = d.all('jobLapangan').filter(function (x) { return x.no === no && x.mitra === mitra; })[0]; var patch = {}; patch[tahap + 'At'] = kini(); if (lokasi) patch.lokasi = lokasi; if (r) return d.update('jobLapangan', r.id, patch); return d.insert('jobLapangan', Object.assign({ mitra:mitra, no:no, jadwal:jadwalISO || '', at:kini() }, patch)); }
  function terlambat(mitra) {
    var d = db(); if (!d) return []; var batas = Date.now() - MENIT_RESPON * 60000;
    return d.all('jobLapangan').filter(function (x) { return (!mitra || x.mitra === mitra) && x.jadwal && !x.mulaiAt && !x.selesaiAt && new Date(x.jadwal).getTime() < batas && new Date(x.jadwal).getTime() > Date.now() - 12 * 3600000; }).map(function (x) { return Object.assign({}, x, { menit:Math.floor((Date.now() - new Date(x.jadwal).getTime()) / 60000) }); });
  }
  function jadwalkan(mitra, no, jadwalISO, pelanggan, alamat) { var d = db(); if (!d || !no) return null; var r = d.all('jobLapangan').filter(function (x) { return x.no === no && x.mitra === mitra; })[0]; if (r) return r; return d.insert('jobLapangan', { mitra:mitra, no:no, jadwal:jadwalISO, pelanggan:pelanggan || '', alamat:alamat || '', at:kini() }); }

  /* ---------- contoh awal ---------- */
  var sudah = false;
  function semai() {
    if (sudah) return; sudah = true; var d = db(); if (!d) return;
    if (!d.all('kontakDarurat').length) { simpanKontak('Sari Wulandari', [{ name:'Slamet Riyadi', phone:'+62 812 7741 9008', rel:'Orang tua', verified:true, diperbaruiAt:'2026-02-10' }, { name:'Yuni Kartika', phone:'+62 856 3390 1174', rel:'Saudara', verified:true, diperbaruiAt:'2026-02-10' }]); simpanKontak('Ayu Indriani', [{ name:'Bambang S.', phone:'+62 813 2200 4471', rel:'Pasangan', verified:true }, { name:'Rina Indriani', phone:'+62 857 1188 0921', rel:'Saudara', verified:false }]); simpanKontak('Nurul Fadhilah', [{ name:'Hj. Maryam', phone:'+62 811 9090 3312', rel:'Orang tua', verified:true }, { name:'Dedi F.', phone:'+62 812 5566 7788', rel:'Saudara', verified:true }]); }
    if (!d.all('jobLapangan').length) { var t = new Date(Date.now() - 55 * 60000).toISOString(); d.insert('jobLapangan', { mitra:'Teguh Wibowo', no:'EXO-4468', jadwal:t, pelanggan:'PT Karya Mitra', alamat:'SCBD Tower 2', at:kini(), contoh:true }); }
  }
  return { HARI_PERBARUI:HARI_PERBARUI, MENIT_RESPON:MENIT_RESPON, DETIK_BATAL_SOS:DETIK_BATAL_SOS, samarkan:samarkan, kontak:kontak, simpanKontak:simpanKontak, statusKontak:statusKontak, tandaiDiperbarui:tandaiDiperbarui, semuaMitraKontak:semuaMitraKontak, sos:sos, sosAktif:sosAktif, sosBatal:sosBatal, sosAman:sosAman, sosTangani:sosTangani, daftarSos:daftarSos, catatJob:catatJob, terlambat:terlambat, jadwalkan:jadwalkan, semai:semai };
})();
