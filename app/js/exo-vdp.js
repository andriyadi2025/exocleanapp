/* ==========================================================================
   exo-vdp.js — Program Pengungkapan Kerentanan (VDP) & bug bounty EXOCLEAN
   --------------------------------------------------------------------------
   Kebijakan bawaan (cakupan, hadiah, aturan, SLA) + pembacaan terbitan admin.
   Dipakai halaman publik keamanan.html dan konsol admin (IT → Bug bounty /
   VDP). Admin menyunting di konsol; yang tayang ke publik adalah yang sudah
   diterbitkan ke `exoclean_admin_pub.vdp` (PIN + audit).
   ========================================================================== */
var EXO_VDP = (function () {
  'use strict';
  var BAWAAN = {
    aktif: true,
    email: 'security@exoclean.id',
    kanal: 'https://app.exoclean.id/keamanan.html',
    cakupan: [
      { aset:'app.exoclean.id', jenis:'PWA pelanggan, mitra cleaning, Seller Center (exo.html)', prioritas:'tinggi' },
      { aset:'api.exoclean.id (/api/auth, /api/pay, /api/data, /api/kirim, /api/dwi, /api/posisi, /api/cs)', jenis:'Server pendamping', prioritas:'tinggi' },
      { aset:'Aplikasi Android EXOCLEAN (id.exoclean.app)', jenis:'Pembungkus Capacitor', prioritas:'sedang' },
      { aset:'exoclean.id / web depan', jenis:'Situs publik', prioritas:'rendah' }
    ],
    luar: [
      'Serangan penolakan layanan (DoS/DDoS), pemindaian otomatis > 5 permintaan/detik, atau spam formulir',
      'Rekayasa sosial, phishing, atau serangan fisik terhadap karyawan, mitra, dan pelanggan',
      'Layanan pihak ketiga: Midtrans, Xendit, Biteship, Darmawisata, Google, Facebook, Cloudflare — laporkan ke pemiliknya',
      'Self-XSS, clickjacking pada halaman tanpa aksi sensitif, header keamanan yang hilang tanpa dampak nyata',
      'Pengungkapan versi perangkat lunak, banner, atau data contoh (dummy) yang memang publik',
      'Kerentanan yang butuh perangkat yang sudah diakar/jailbreak atau akses fisik ke perangkat korban',
      'Temuan dari alat otomatis tanpa bukti eksploitasi (PoC)'
    ],
    hadiah: { kritis:[10000000, 25000000], tinggi:[3000000, 10000000], sedang:[1000000, 3000000], rendah:[250000, 1000000] },
    sla: { respon:3, triase:7, perbaikan:90 },
    aturan: [
      'Uji hanya dengan akun milik Anda sendiri; jangan mengakses, mengubah, atau menyimpan data orang lain',
      'Berhenti dan segera laporkan begitu Anda menemukan data pribadi — jangan mengunduh lebih dari yang dibutuhkan untuk PoC',
      'Jangan mengeksploitasi temuan untuk keuntungan, pemerasan, atau merusak layanan',
      'Beri kami waktu memperbaiki sebelum mengungkap ke publik (pengungkapan terkoordinasi, maks. 90 hari)',
      'Satu laporan untuk satu kerentanan; laporan pertama yang dapat direproduksi yang dihitung'
    ],
    pengakuan: []
  };
  var TINGKAT = { kritis:'Kritis', tinggi:'Tinggi', sedang:'Sedang', rendah:'Rendah', info:'Informasional' };
  var STATUS = { baru:'Baru', triase:'Triase', valid:'Valid', duplikat:'Duplikat', 'tidak-berlaku':'Tidak berlaku', diperbaiki:'Diperbaiki', dibayar:'Dibayar', ditutup:'Ditutup' };
  function pub() { try { return JSON.parse(localStorage.getItem('exoclean_admin_pub') || '{}') || {}; } catch (e) { return {}; } }
  function kebijakan(rancangan) { var src = rancangan || pub().vdp || null; var k = Object.assign({}, BAWAAN, src || {}); k.hadiah = Object.assign({}, BAWAAN.hadiah, (src && src.hadiah) || {}); k.sla = Object.assign({}, BAWAAN.sla, (src && src.sla) || {}); return k; }
  function rp(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function rentangHadiah(k, tingkat) { var h = (k || kebijakan()).hadiah[tingkat]; return h ? rp(h[0]) + ' – ' + rp(h[1]) : 'Pengakuan (hall of fame)'; }
  /* CVSS v3.1 dasar → tingkat (rentang baku FIRST) */
  function tingkatDariCvss(skor) { if (skor === '' || skor == null) return null; skor = Number(skor); if (!(skor >= 0) || skor > 10) return null; if (skor >= 9) return 'kritis'; if (skor >= 7) return 'tinggi'; if (skor >= 4) return 'sedang'; if (skor > 0) return 'rendah'; return 'info'; }
  /* Hadiah yang disarankan: interpolasi linear posisi CVSS dalam rentang tingkatnya */
  function hadiahSaran(k, tingkat, cvss) { var h = (k || kebijakan()).hadiah[tingkat]; if (!h) return 0; var b = { kritis:[9, 10], tinggi:[7, 8.9], sedang:[4, 6.9], rendah:[0.1, 3.9] }[tingkat]; var p = Math.max(0, Math.min(1, (Number(cvss) - b[0]) / (b[1] - b[0]))); return Math.round((h[0] + (h[1] - h[0]) * p) / 50000) * 50000; }
  function nomorLaporan() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '', b = new Uint8Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.floor(Math.random() * 256); }); for (var i = 0; i < 6; i++) s += a[b[i] % a.length]; return 'VDP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + s; }
  return { BAWAAN:BAWAAN, TINGKAT:TINGKAT, STATUS:STATUS, kebijakan:kebijakan, rentangHadiah:rentangHadiah, tingkatDariCvss:tingkatDariCvss, hadiahSaran:hadiahSaran, nomorLaporan:nomorLaporan, rp:rp };
})();
