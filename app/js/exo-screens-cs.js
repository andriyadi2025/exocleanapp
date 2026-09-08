/* ==========================================================================
   exo-screens-cs.js — layar Customer Care AI (semua sisi: pelanggan, mitra
   cleaning, mitra toko)
   --------------------------------------------------------------------------
   Gelembung percakapan, chip pertanyaan populer per sisi, jawaban lokal
   (EXO_CS) yang diperkaya AI cloud bila cs-server aktif, tombol aksi ke
   layar terkait, nilai 👍/👎, dan "Hubungkan ke tim" (tiket eskalasi).
   Layar `cs` netral sisi: dibuka dari Akun (pelanggan), Akun toko, dan
   profil/menu mitra.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  var C = function () { return window.EXO_CS; };
  if (!window.EXO_CS) return;
  K.csRiwayat = K.csRiwayat || {}; K.csTeks = K.csTeks || ''; K.csSibuk = false;
  function sisi() { return K.sisi === 'toko' ? 'toko' : K.sisi === 'partner' ? 'mitra' : 'klien'; }
  function namaPengguna() { if (sisi() === 'klien') return 'Dewi Anggraini'; var a = X.daftarJuru()[0] || {}; return a.name || 'mitra'; }
  function riwayat() { var s = sisi(); if (!K.csRiwayat[s]) { var j = C().jawab(s, '', K); K.csRiwayat[s] = [{ dari:'ai', teks:j.teks, saran:j.saran, aksi:[], at:Date.now() }]; } return K.csRiwayat[s]; }
  function kembaliKe() { return sisi() === 'toko' ? 'tprofil' : sisi() === 'mitra' ? 'pjobs' : 'profile'; }
  function tautanBalik(layar) { var L = X.LAYAR[layar] ? layar : null; return L; }
  function jamdari(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  X.LAYAR.cs = function () {
    var s = sisi(), r = riwayat(), online = window.EXO_SERVER && EXO_SERVER.csSehat ? EXO_SERVER.csSehat() : false;
    var h = '<div class="screen">' + X.kepala('Customer Care', (s === 'klien' ? 'Pelanggan' : s === 'mitra' ? 'Mitra cleaning' : 'Mitra toko') + ' · ' + (online ? 'AI cloud' : 'asisten lokal') + ' · manusia 60 dtk', kembaliKe(), '<button class="btn btn-secondary" style="height:30px;font-size:11.5px;padding:0 10px;white-space:nowrap"' + aksi('csEskalasi') + '>Hubungi tim</button>') + '<div class="stack gap-10 pad-x18" style="padding-bottom:120px">';
    r.forEach(function (p, i) {
      if (p.dari === 'saya') { h += '<div class="stack" style="align-items:flex-end"><div class="bubble dari-saya">' + esc(p.teks) + '</div><div class="bubble-jam">' + jamdari(p.at) + '</div></div>'; return; }
      h += '<div class="stack gap-6" style="align-items:flex-start"><div class="flex items-start gap-8"><span class="av av-solid" style="--s:28px;font-size:14px;flex:none">🤖</span><div class="bubble dari-mereka" style="white-space:pre-line">' + esc(p.teks) + (p.sumber === 'ai' ? '<div class="t-10 o-6" style="margin-top:4px">✨ jawaban AI · dilandasi data EXOCLEAN</div>' : '') + '</div></div>';
      if (p.aksi && p.aksi.length) h += '<div class="flex gap-6 wrap" style="padding-left:36px">' + p.aksi.filter(function (a) { return tautanBalik(a[1]); }).map(function (a) { return '<button class="btn btn-primary" style="height:30px;padding:0 12px;font-size:12px"' + aksi('csKe', a[1]) + '>' + esc(a[0]) + ' →</button>'; }).join('') + '</div>';
      if (p.eskalasi) h += '<div style="padding-left:36px"><button class="btn btn-secondary" style="height:32px;font-size:12px"' + aksi('csEskalasi') + '>Hubungkan ke tim EXOCLEAN</button></div>';
      if (i === r.length - 1 && p.saran && p.saran.length) h += '<div class="flex gap-6 wrap" style="padding-left:36px">' + p.saran.map(function (q) { return '<button class="pill pill-sm"' + aksi('csTanya', q) + '>' + esc(q) + '</button>'; }).join('') + '</div>';
      if (i > 0 && p.tanya && !p.dinilai) h += '<div class="flex gap-6 t-11 o-6" style="padding-left:36px;align-items:center">Membantu?<button class="pill pill-sm"' + aksi('csNilai', i + ':1') + '>👍</button><button class="pill pill-sm"' + aksi('csNilai', i + ':0') + '>👎</button></div>';
      h += '</div>';
    });
    if (K.csSibuk) h += '<div class="flex items-center gap-8 o-6 t-115"><span class="av av-solid" style="--s:28px;font-size:14px">🤖</span>sedang mengetik…</div>';
    h += '</div><div class="actionbar actionbar--tight"><div class="flex gap-8" style="width:100%"><input class="input" style="flex:1;height:42px" data-simpan="csTeks" value="' + esc(K.csTeks) + '" placeholder="Tulis pertanyaan…" aria-label="Pertanyaan"><button class="btn btn-primary" style="height:42px;padding:0 16px"' + aksi('csKirim') + '>Kirim</button></div></div></div>';
    return h;
  };
  A.csTanya = function (q) { K.csTeks = q; A.csKirim(); };
  A.csKirim = function () {
    var t = String(K.csTeks || '').trim(); if (!t) return; var s = sisi(), r = riwayat(); K.csTeks = '';
    r.push({ dari:'saya', teks:t, at:Date.now() });
    var j = C().jawab(s, t, K); var balas = { dari:'ai', teks:j.teks, saran:j.saran, aksi:j.aksi, eskalasi:!!j.eskalasi, tanya:t, entri:j.id, sumber:j.sumber, at:Date.now() }; r.push(balas);
    if (window.EXO_SERVER && EXO_SERVER.csTanya && EXO_SERVER.csSehat && EXO_SERVER.csSehat()) {
      K.csSibuk = true;
      EXO_SERVER.csTanya({ sisi:s, pesan:t, riwayat:r.slice(-8).map(function (p) { return { peran:p.dari === 'saya' ? 'user' : 'assistant', teks:p.teks }; }), landasan:C().landasan(s, K) }).then(function (res) { K.csSibuk = false; if (res && res.ok && res.data && res.data.jawab) { balas.teks = res.data.jawab; balas.sumber = 'ai'; if (res.data.layar && X.LAYAR[res.data.layar]) balas.aksi = [[res.data.labelAksi || 'Buka', res.data.layar]]; } X.gambar(); });
    }
    setTimeout(function () { try { var el = document.querySelector('.actionbar'); if (el) el.scrollIntoView({ block:'end' }); } catch (e) { /* abaikan */ } }, 50);
  };
  A.csKe = function (layar) { if (layar === 'toko' || layar === 'catalog' || layar === 'orders' || layar === 'profile' || layar === 'wallet' || layar === 'kuponSaya' || layar === 'pesananToko' || layar === 'prepaid' || layar === 'issue') K.sisi = 'customer'; else if (/^t/.test(layar)) K.sisi = 'toko'; else if (/^p/.test(layar)) K.sisi = 'partner'; K.layar = layar; };
  A.csNilai = function (arg) { var p = arg.split(':'), r = riwayat(), b = r[+p[0]]; if (!b) return; b.dinilai = true; C().nilaiJawaban(sisi(), b.tanya, b.entri, p[1] === '1'); X.sekilas(p[1] === '1' ? 'Terima kasih!' : 'Terima kasih — kami perbaiki jawabannya.'); };
  A.csEskalasi = function () { var r = riwayat(), t = C().eskalasi(sisi(), namaPengguna(), r.map(function (p) { return { dari:p.dari, teks:p.teks }; }), 'permintaan pengguna'); if (t) { r.push({ dari:'ai', teks:'Tiket ' + t.no + ' dibuat. Tim EXOCLEAN membalas di sini dalam 60 detik pada jam layanan (07:00–21:00). Ringkasan percakapan sudah dilampirkan.', saran:[], aksi:[], at:Date.now() }); X.sekilas('Tiket ' + t.no + ' dikirim ke tim EXOCLEAN.'); } };
  A.csBuka = function () { K.layar = 'cs'; };
})(ExoApp);
