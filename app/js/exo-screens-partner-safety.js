/* ==========================================================================
   exo-screens-partner-safety.js — mitra cleaning: tombol SOS, kontak
   darurat (pembaruan berkala), peringatan tidak merespons
   --------------------------------------------------------------------------
   · Tombol SOS melayang di layar Job berjalan, Rute, dan Checklist SOP:
     tekan → konfirmasi → insiden aktif (ops + 2 kontak darurat diberi tahu,
     lokasi & nomor job dikirim) dengan tombol Telepon 112, Chat ops, dan
     "Saya aman" / batalkan salah tekan ≤ 30 detik.
   · Layar pkontak: lihat/ubah dua kontak darurat + OTP; pengingat 180 hari.
   · Kartu di beranda: kontak perlu diperbarui · job lewat 30 menit belum
     dimulai. Mulai rute & kirim laporan mencatat jejak ke jobLapangan.
   ========================================================================== */
(function (X) {
  'use strict';
  var D = X.D, K = X.KEADAAN, esc = X.esc, aksi = X.aksi, kelas = X.kelas, A = X.AKSI;
  var S = function () { return window.EXO_KESELAMATAN; };
  if (!window.EXO_KESELAMATAN) return;
  function aku() { return X.daftarJuru()[0] || X.JURU_KOSONG; }
  function jobKini() { var t = new Date(); var jam = (K.mulai || '09:00').split(':'); t.setHours(+jam[0], +jam[1], 0, 0); return { no:K.orderNo || 'EXO-4471', jasa:K.jasa || 'hourly', pelanggan:'Dewi Anggraini', alamat:'Kemang Residence 12B, Jakarta Selatan', jadwal:t.toISOString() }; }
  function lokasiKini() { var p = K.posisi; return p && typeof p.lat === 'number' ? { lat:p.lat, lng:p.lng } : { lat:-6.2607, lng:106.8125, perkiraan:true }; }
  /* sinkron kontak dari pendaftaran (K.kin) → tabel keselamatan, sekali */
  function pastikanKontak() { var a = aku(); S().semai(); if (!S().kontak(a.name).length && K.kin && K.kin.length) S().simpanKontak(a.name, K.kin); }

  /* ---- tombol & panel SOS ---- */
  function panelSos() {
    var a = aku(), ins = S().sosAktif(a.name);
    if (ins) { var detik = Math.floor((Date.now() - new Date(ins.at).getTime()) / 1000), bisaBatal = detik <= S().DETIK_BATAL_SOS; return '<div class="sos-panel"><div class="flex items-center gap-8"><span class="sos-dot"></span><b class="grow">SOS ' + (ins.status === 'ditangani' ? 'sedang ditangani ops' : 'aktif · ops dihubungi') + '</b><span class="t-11">' + esc(String(ins.at).slice(11, 16)) + '</span></div><div class="t-115 lh-14">' + ins.diberitahu.map(function (x) { return '✓ ' + esc(x.ke) + ' · ' + esc(x.via); }).join('<br>') + '<br>📍 lokasi & job ' + esc(ins.jobNo) + ' terkirim</div><div class="flex gap-6 wrap"><a class="btn btn-primary" style="height:34px;text-decoration:none;background:#b12a5b" href="tel:112">📞 Telepon 112</a><button class="btn btn-secondary" style="height:34px"' + aksi('lembar', 'obrol') + '>Chat ops</button>' + (bisaBatal ? '<button class="btn btn-secondary" style="height:34px"' + aksi('sosBatal', ins.id) + '>Salah tekan (' + (S().DETIK_BATAL_SOS - detik) + ' dtk)</button>' : '<button class="btn btn-secondary" style="height:34px"' + aksi('sosAman', ins.id) + '>✓ Saya aman</button>') + '</div></div>'; }
    if (K.sosKonfirmasi) return '<div class="sos-panel"><b>Kirim SOS sekarang?</b><div class="t-115 lh-14">Ops EXOCLEAN ditelepon, dua kontak darurat Anda diberi tahu, lokasi dan nomor job dikirim. Salah tekan bisa dibatalkan dalam ' + S().DETIK_BATAL_SOS + ' detik.</div><div class="flex gap-6"><button class="btn btn-primary" style="flex:1;background:#b12a5b"' + aksi('sosKirim') + '>🆘 Kirim SOS</button><button class="btn btn-secondary" style="flex:1"' + aksi('sosTutup') + '>Batal</button></div></div>';
    return '<button class="sos-btn"' + aksi('sosBuka') + ' aria-label="SOS darurat">SOS</button>';
  }
  var GAYA = '<style>.sos-btn{position:fixed;right:18px;bottom:92px;z-index:40;width:58px;height:58px;border-radius:999px;border:0;background:#b12a5b;color:#fff;font-weight:900;letter-spacing:.06em;box-shadow:0 8px 24px rgba(177,42,91,.45);cursor:pointer;animation:sos-nafas 2.4s ease-in-out infinite}@keyframes sos-nafas{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}.sos-panel{position:fixed;left:16px;right:16px;bottom:88px;z-index:41;background:#fff;border:2px solid #b12a5b;border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 12px 40px rgba(0,0,0,.25)}.sos-dot{width:12px;height:12px;border-radius:999px;background:#b12a5b;animation:sos-nafas 1s infinite}</style>';
  ['pjob', 'proute', 'psop', 'preport'].forEach(function (nama) { var asli = X.LAYAR[nama]; if (!asli) return; X.LAYAR[nama] = function () { var h = asli.apply(this, arguments); return h.replace(/<\/div>\s*$/, GAYA + panelSos() + '</div>'); }; });
  A.sosBuka = function () { K.sosKonfirmasi = true; };
  A.sosTutup = function () { K.sosKonfirmasi = false; };
  A.sosKirim = function () { pastikanKontak(); var j = jobKini(); S().sos(aku().name, j, lokasiKini(), ''); K.sosKonfirmasi = false; X.sekilas('SOS terkirim — ops menghubungi Anda sekarang.'); };
  A.sosBatal = function (id) { try { S().sosBatal(id, aku().name); X.sekilas('SOS dibatalkan (salah tekan).'); } catch (e) { X.sekilas(e.message, 'err'); } };
  A.sosAman = function (id) { S().sosAman(id, aku().name); X.sekilas('Terima kasih — laporan aman diteruskan ke ops.'); };

  /* ---- kontak darurat ---- */
  X.LAYAR.pkontak = function () {
    pastikanKontak(); var a = aku(), st = S().statusKontak(a.name), k = st.k;
    var h = '<div class="screen">' + X.kepala('Kontak darurat', 'Dua orang terdekat · dikonfirmasi ulang tiap ' + S().HARI_PERBARUI + ' hari', 'profile') + '<div class="stack gap-12 pad-x18">';
    h += '<div class="card ' + (st.ok ? 'card-leaf' : 'card-clay') + ' gap-4"><div class="f-head t-14">' + (st.ok ? '✓ Kontak darurat lengkap' : '⚠️ Perlu diperbarui') + '</div><div class="t-115 lh-15">' + esc(st.alasan) + ' Nomor tidak pernah ditampilkan ke pelanggan; hanya tim keselamatan EXOCLEAN yang membukanya dengan PIN dan tercatat di audit.</div></div>';
    [0, 1].forEach(function (i) { var c = k[i] || { nama:'', hubungan:'', nomor:'', terverifikasi:false }; h += '<div class="kin-card' + (c.terverifikasi ? ' ok' : '') + '"><div class="flex items-center gap-9"><span class="num-badge">' + (i + 1) + '</span><div class="grow f-head t-15">' + (i ? 'Kontak darurat kedua' : 'Kontak darurat pertama') + '</div><span class="chip ' + (c.terverifikasi ? 'chip-ok' : 'chip-flat') + '">' + (c.terverifikasi ? 'Terverifikasi' : 'Belum OTP') + '</span></div><div class="field"><label>Nama lengkap</label><input class="input" data-ubah="kontakUbah" data-arg="' + i + ':nama" value="' + esc(c.nama) + '"></div><div class="field"><label>Hubungan</label><div class="flex wrap gap-7" style="margin-top:6px">' + D.KIN_RELS.map(function (r) { return '<button class="' + kelas('pill pill-xs', c.hubungan === r) + '"' + aksi('kontakHubungan', i + ':' + r) + '>' + r + '</button>'; }).join('') + '</div></div><div class="field"><label>Nomor HP</label><input class="input" data-ubah="kontakUbah" data-arg="' + i + ':nomor" value="' + esc(c.nomor) + '"></div><button class="otp-btn' + (c.terverifikasi ? ' ok' : '') + '"' + aksi('kontakOtp', i) + '>' + (c.terverifikasi ? 'Nomor terverifikasi ✓' : 'Kirim OTP ke nomor ini') + '</button></div>'; });
    h += '<button class="btn btn-primary btn-block" style="margin:0"' + aksi('kontakKonfirmasi') + '>Konfirmasi data masih benar</button>';
    return h + '<div class="spacer-26"></div></div></div>';
  };
  function ubahKontak(i, patch) { var a = aku(), k = S().kontak(a.name); while (k.length < 2) { S().simpanKontak(a.name, k.concat([{ nama:'', hubungan:'', nomor:'', terverifikasi:false }])); k = S().kontak(a.name); } window.EXO_DB.update('kontakDarurat', k[i].id, patch); }
  A.kontakUbah = function (arg, v) { var p = arg.split(':'); var patch = {}; patch[p[1]] = String(v || '').trim(); if (p[1] === 'nomor') patch.terverifikasi = false; ubahKontak(+p[0], patch); };
  A.kontakHubungan = function (arg) { var p = arg.split(':'); ubahKontak(+p[0], { hubungan:p.slice(1).join(':') }); };
  A.kontakOtp = function (i) { var k = S().kontak(aku().name)[+i]; if (!k || !k.nomor) { X.sekilas('Isi nomor HP dulu.', 'err'); return; } ubahKontak(+i, { terverifikasi:true, diperbaruiAt:new Date().toISOString().slice(0, 10) }); X.sekilas('OTP terkirim ke ' + k.nomor + ' · nomor terverifikasi.'); };
  A.kontakKonfirmasi = function () { var st = S().statusKontak(aku().name); if (st.k.length < 2 || st.k.some(function (x) { return !x.terverifikasi || !x.nama || !x.nomor; })) { X.sekilas('Lengkapi dan verifikasi dua kontak dulu.', 'err'); return; } S().tandaiDiperbarui(aku().name); X.sekilas('Kontak darurat dikonfirmasi — pengingat berikutnya ' + S().HARI_PERBARUI + ' hari lagi.'); K.layar = 'profile'; };

  /* ---- kartu beranda: kontak & job tidak merespons ---- */
  X.kartuKeselamatan = function () {
    pastikanKontak(); var a = aku(), st = S().statusKontak(a.name), h = '';
    if (!st.ok) h += '<button class="card card-clay gap-3" style="text-align:start;cursor:pointer;width:100%"' + aksi('ke', 'pkontak') + '><div class="flex items-center gap-8"><span style="font-size:20px">🆘</span><div class="grow"><b class="t-125">Perbarui kontak darurat</b><div class="t-11 o-7">' + esc(st.alasan) + '</div></div><span class="o-5">›</span></div></button>';
    var j = jobKini(); S().jadwalkan(a.name, j.no, j.jadwal, j.pelanggan, j.alamat); var telat = S().terlambat(a.name)[0];
    if (telat) h += '<div class="card gap-3" style="background:#fde2e7"><div class="flex items-center gap-8"><span style="font-size:20px">⏰</span><div class="grow"><b class="t-125">Job ' + esc(telat.no) + ' lewat ' + telat.menit + ' menit belum dimulai</b><div class="t-11 o-7">Ops sudah diberi tahu. Tekan Mulai rute atau kabari ops bila terhalang.</div></div><button class="btn btn-primary" style="height:32px;font-size:12px"' + aksi('mulaiRute') + '>Mulai rute</button></div></div>';
    return h;
  };
  /* jejak job: mulai rute & laporan */
  var mulaiAsli = A.mulaiRute; if (mulaiAsli) A.mulaiRute = function () { var r = mulaiAsli.apply(this, arguments); if (K.layar === 'proute') { var j = jobKini(); S().catatJob(aku().name, j.no, j.jadwal, 'mulai', lokasiKini()); } return r; };
  setTimeout(function () { var asli = A.kirimLaporan; if (!asli || asli._sos) return; A.kirimLaporan = function () { var j = jobKini(); S().catatJob(aku().name, j.no, j.jadwal, 'selesai'); return asli.apply(this, arguments); }; A.kirimLaporan._sos = true; }, 50);
})(ExoApp);
