/* ==========================================================================
   exo-persetujuan.js — kendali perubahan pengaju–penyetuju untuk konsol admin
   --------------------------------------------------------------------------
   Prinsip yang dipegang (disepakati 7 Sep 2026):
     · Dua orang, dua sesi. Staf MENGAJUKAN perubahan (PIN sendiri); supervisor
       MENYETUJUI dari akun dan perangkatnya sendiri (PIN/passkey). Pengaju
       tidak pernah bisa menyetujui usulannya sendiri.
     · Bertingkat menurut risiko: rendah → langsung berlaku (tercatat, bisa
       dibatalkan); sedang → 1 penyetuju; tinggi → 2 penyetuju berbeda dan
       berlaku TERTUNDA (bawaan 30 menit) supaya masih bisa dibatalkan.
     · Jejak audit berantai hash: tiap entri menyimpan hash entri sebelumnya
       (SHA-256), sehingga baris yang dihapus/diubah terdeteksi lewat
       verifikasi rantai.
     · Batas laju: lebih dari N penerbitan per jam oleh satu akun ditandai
       sebagai anomali dan dilaporkan.
     · Mode satu admin: bila tidak ada penyetuju lain di basis data ini, super
       admin boleh menerapkan sendiri — tetapi entri auditnya ditandai
       "tanpa pemeriksa kedua". Menyembunyikan keadaan itu lebih buruk
       daripada mengizinkannya dengan jujur.

   JUJUR TENTANG BATAS: pemeriksaan ini berjalan di peramban dengan data di
   localStorage. Ia menahan kekeliruan dan kecerobohan; penegakan terhadap
   niat jahat membutuhkan server yang mencatat dan memverifikasi usulan.
   Struktur tabel di sini (usulan, audit) dibuat siap dipindahkan ke server.
   ========================================================================== */
var EXO_PERSETUJUAN = (function () {
  'use strict';
  var T_USULAN = 'usulan', T_AUDIT = 'audit';
  var TINGKAT = { sop:'sedang', tarif:'sedang', promo:'sedang', hadiah:'sedang', peran:'tinggi', akun:'tinggi', merek:'tinggi', pembayaran:'tinggi', catatan:'rendah' };
  var ATURAN = { rendah:{ butuh:0, tundaMenit:0 }, sedang:{ butuh:1, tundaMenit:0 }, tinggi:{ butuh:2, tundaMenit:30 } };
  var PERAN_PENYETUJU = { supervisor:true, superadmin:true };
  var MAKS_TERBIT_PER_JAM = 10, SESI_ULANG_MENIT = 15;
  var penerap = {};   /* jenis → function(usulan, oleh) yang menerapkan perubahan */
  var penolak = {};   /* jenis → function(usulan, oleh, alasan) saat ditolak/dibatalkan (opsional) */
  var pendengar = [];

  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function emit() { pendengar.forEach(function (f) { try { f(); } catch (e) { /* abaikan */ } }); }

  /* ------------------------------------------------------------ peran */
  /* { id, nama } dari lapisan tampilan dilengkapi dari baris users supaya peran terbaca. */
  function lengkap(u) { if (!u || u.role || u.peran || !u.id) return u; var d = db(); var r = d ? d.find('users', u.id) : null; return r || u; }
  function peranDari(u) { u = lengkap(u); return (u && u.peran) || (u && u.role === 'admin' ? 'superadmin' : 'staf'); }
  function bolehMenyetujui(u) { return !!u && !!PERAN_PENYETUJU[peranDari(u)]; }
  function penyetujuLain(kecualiId) { var d = db(); return d ? d.where('users', function (u) { return u.role === 'admin' && u.aktif !== false && u.id !== kecualiId && bolehMenyetujui(u); }) : []; }
  function modeSatuAdmin(u) { return peranDari(u) === 'superadmin' && penyetujuLain(u.id).length === 0; }

  /* ------------------------------------------------------------ audit berantai */
  function sha256(teks) {
    if (!(window.crypto && window.crypto.subtle)) return Promise.resolve('tanpa-subtle');
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  var antreanAudit = Promise.resolve();
  /* Entri baru selalu diproses berurutan supaya rantainya tidak bercabang. */
  function audit(aktor, aksi, ref, detail, tanda) {
    var d = db(); if (!d) return Promise.resolve(null);
    antreanAudit = antreanAudit.then(function () {
      var semua = d.all(T_AUDIT), akhir = semua[semua.length - 1] || null;
      var e = { seq:(akhir ? akhir.seq : 0) + 1, at:kini(), aktorId:aktor ? aktor.id : null, aktorNama:aktor ? aktor.nama : 'sistem', aksi:aksi, ref:ref || null, detail:detail || '', tanda:tanda || null, hashSebelum:akhir ? akhir.hash : 'awal' };
      return sha256(JSON.stringify([e.seq, e.at, e.aktorId, e.aksi, e.ref, e.detail, e.tanda, e.hashSebelum])).then(function (h) { e.hash = h; var r = d.insert(T_AUDIT, e); emit(); return r; });
    });
    return antreanAudit;
  }
  function verifikasiRantai() {
    var d = db(); if (!d) return Promise.resolve({ ok:false, pesan:'basis data tidak ada' });
    var semua = d.all(T_AUDIT).sort(function (a, b) { return a.seq - b.seq; });
    var sebelum = 'awal', i = 0;
    function langkah() {
      if (i >= semua.length) return Promise.resolve({ ok:true, jumlah:semua.length });
      var e = semua[i];
      if (e.hashSebelum !== sebelum || e.seq !== i + 1) return Promise.resolve({ ok:false, seq:e.seq, pesan:'Rantai putus pada entri ' + e.seq + (e.seq !== i + 1 ? ' (nomor urut melompat — ada entri yang dihapus)' : ' (hash sebelumnya tidak cocok — entri sebelumnya diubah)') });
      return sha256(JSON.stringify([e.seq, e.at, e.aktorId, e.aksi, e.ref, e.detail, e.tanda, e.hashSebelum])).then(function (h) {
        if (h !== e.hash) return { ok:false, seq:e.seq, pesan:'Isi entri ' + e.seq + ' tidak cocok dengan hash-nya (entri diubah)' };
        sebelum = e.hash; i++; return langkah();
      });
    }
    return langkah();
  }
  function daftarAudit(n) { var d = db(); return d ? d.all(T_AUDIT).sort(function (a, b) { return b.seq - a.seq; }).slice(0, n || 50) : []; }

  /* ------------------------------------------------------------ anomali laju */
  function terbitSatuJam(aktorId) { var d = db(); var batas = Date.now() - 3600000; return d ? d.all(T_AUDIT).filter(function (e) { return e.aktorId === aktorId && /^(Menerapkan|Menyetujui)/.test(e.aksi) && new Date(e.at).getTime() > batas; }).length : 0; }
  function periksaAnomali(aktor) {
    var n = terbitSatuJam(aktor.id), jam = new Date().getHours(), luarJam = jam < 6 || jam >= 22, tanda = [];
    if (n >= MAKS_TERBIT_PER_JAM) tanda.push('laju: ' + n + ' penerapan dalam 1 jam');
    if (luarJam) tanda.push('di luar jam kerja (' + jam + ':00)');
    return tanda;
  }

  /* ------------------------------------------------------------ usulan */
  function tingkat(jenis) { return TINGKAT[jenis] || 'sedang'; }
  function aturan(jenis) { return ATURAN[tingkat(jenis)]; }
  function daftarkanPenerap(jenis, fn, fnTolak) { penerap[jenis] = fn; if (fnTolak) penolak[jenis] = fnTolak; }
  function semua(filter) { var d = db(); var r = d ? d.all(T_USULAN) : []; if (filter) r = r.filter(function (u) { return u.status === filter; }); return r.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); }); }
  function menunggu() { return semua('menunggu'); }
  function dijadwalkan() { return semua('disetujui'); }

  /* Ajukan perubahan. `oleh` sudah lolos PIN di lapisan tampilan. Kembalikan
     { usulan, langsung:true } bila diterapkan seketika (tingkat rendah, atau
     mode satu admin), atau { usulan } bila masuk antrean. */
  function ajukan(jenis, judul, ringkasan, sebelum, sesudah, muatan, oleh) {
    var d = db(); if (!d) throw new Error('Basis data tidak tersedia');
    var a = aturan(jenis), t = tingkat(jenis);
    var u = d.insert(T_USULAN, { jenis:jenis, tingkat:t, judul:judul, ringkasan:ringkasan || '', sebelum:salin(sebelum == null ? null : sebelum), sesudah:salin(sesudah == null ? null : sesudah), muatan:salin(muatan || {}),
      pengajuId:oleh.id, pengajuNama:oleh.nama, status:'menunggu', butuh:a.butuh, persetujuan:[], tundaMenit:a.tundaMenit, berlakuAt:null, diterapkanAt:null, alasanTolak:null });
    var anom = periksaAnomali(oleh);
    if (a.butuh === 0) { audit(oleh, 'Mengajukan ' + judul, u.id, 'tingkat rendah — berlaku langsung', anom.length ? anom : null); return terapkan(u.id, oleh, 'rendah'); }
    if (modeSatuAdmin(oleh)) { audit(oleh, 'Mengajukan ' + judul, u.id, 'mode satu admin — tidak ada penyetuju lain di basis data ini', ['tanpa pemeriksa kedua'].concat(anom)); return terapkan(u.id, oleh, 'tanpa-pemeriksa-kedua'); }
    audit(oleh, 'Mengajukan ' + judul, u.id, 'tingkat ' + t + ' · butuh ' + a.butuh + ' persetujuan' + (a.tundaMenit ? ' · berlaku ' + a.tundaMenit + ' menit setelah disetujui' : ''), anom.length ? anom : null);
    emit(); return { usulan:u, langsung:false };
  }
  function bolehSetujui(u, penyetuju) {
    if (!u || u.status !== 'menunggu') return 'Usulan ini tidak lagi menunggu.';
    if (!bolehMenyetujui(penyetuju)) return 'Hanya supervisor atau super admin yang boleh menyetujui.';
    if (u.pengajuId === penyetuju.id) return 'Pengaju tidak boleh menyetujui usulannya sendiri.';
    if ((u.persetujuan || []).some(function (p) { return p.olehId === penyetuju.id; })) return 'Anda sudah menyetujui usulan ini; persetujuan kedua harus dari orang lain.';
    return null;
  }
  function setujui(id, penyetuju, catatan) {
    var d = db(), u = d.find(T_USULAN, id); var galat = bolehSetujui(u, penyetuju); if (galat) throw new Error(galat);
    var p = (u.persetujuan || []).concat([{ olehId:penyetuju.id, olehNama:penyetuju.nama, at:kini(), catatan:catatan || '' }]);
    var anom = periksaAnomali(penyetuju);
    if (p.length < u.butuh) { d.update(T_USULAN, id, { persetujuan:p }); audit(penyetuju, 'Menyetujui ' + u.judul, id, 'persetujuan ' + p.length + ' dari ' + u.butuh, anom.length ? anom : null); emit(); return { usulan:d.find(T_USULAN, id), lengkap:false }; }
    if (u.tundaMenit > 0) {
      var berlaku = new Date(Date.now() + u.tundaMenit * 60000).toISOString();
      d.update(T_USULAN, id, { persetujuan:p, status:'disetujui', berlakuAt:berlaku });
      audit(penyetuju, 'Menyetujui ' + u.judul, id, 'persetujuan lengkap · berlaku ' + berlaku.slice(11, 16) + ' UTC (' + u.tundaMenit + ' menit) — masih bisa dibatalkan', anom.length ? anom : null);
      emit(); return { usulan:d.find(T_USULAN, id), lengkap:true, tertunda:true };
    }
    d.update(T_USULAN, id, { persetujuan:p });
    audit(penyetuju, 'Menyetujui ' + u.judul, id, 'persetujuan lengkap', anom.length ? anom : null);
    return terapkan(id, penyetuju, 'disetujui');
  }
  function tolak(id, penyetuju, alasan) {
    var d = db(), u = d.find(T_USULAN, id); if (!u || (u.status !== 'menunggu' && u.status !== 'disetujui')) throw new Error('Usulan ini tidak bisa ditolak lagi.');
    if (!bolehMenyetujui(penyetuju)) throw new Error('Hanya supervisor atau super admin yang boleh menolak.');
    d.update(T_USULAN, id, { status:'ditolak', alasanTolak:String(alasan || '').trim() || 'Ditolak', ditolakOleh:penyetuju.nama, ditolakAt:kini() });
    if (penolak[u.jenis]) { try { penolak[u.jenis](u, penyetuju, alasan); } catch (e) { /* dicatat di audit di bawah */ } }
    audit(penyetuju, 'Menolak ' + u.judul, id, alasan || ''); emit(); return d.find(T_USULAN, id);
  }
  function batalkan(id, oleh) {
    var d = db(), u = d.find(T_USULAN, id); if (!u || (u.status !== 'menunggu' && u.status !== 'disetujui')) throw new Error('Usulan ini tidak bisa dibatalkan.');
    if (u.pengajuId !== oleh.id && !bolehMenyetujui(oleh)) throw new Error('Hanya pengaju atau penyetuju yang boleh membatalkan.');
    d.update(T_USULAN, id, { status:'dibatalkan', dibatalkanOleh:oleh.nama, dibatalkanAt:kini() });
    if (penolak[u.jenis]) { try { penolak[u.jenis](u, oleh, 'dibatalkan'); } catch (e) { /* abaikan */ } }
    audit(oleh, 'Membatalkan ' + u.judul, id, u.status === 'disetujui' ? 'dibatalkan sebelum berlaku' : ''); emit(); return d.find(T_USULAN, id);
  }
  function terapkan(id, oleh, cara) {
    var d = db(), u = d.find(T_USULAN, id); if (!u) throw new Error('Usulan tidak ditemukan');
    var fn = penerap[u.jenis]; if (!fn) throw new Error('Tidak ada penerap untuk jenis ' + u.jenis);
    var hasil = fn(u, oleh);
    d.update(T_USULAN, id, { status:'berlaku', diterapkanAt:kini(), diterapkanOleh:oleh.nama, cara:cara });
    audit(oleh, 'Menerapkan ' + u.judul, id, 'cara: ' + cara + (u.pengajuNama ? ' · diusulkan ' + u.pengajuNama : ''), cara === 'tanpa-pemeriksa-kedua' ? ['tanpa pemeriksa kedua'] : null);
    emit(); return { usulan:d.find(T_USULAN, id), langsung:true, hasil:hasil };
  }
  /* Usulan tingkat tinggi yang sudah lewat masa tundanya diterapkan otomatis;
     dipanggil tiap kali konsol menggambar ulang. */
  function terapkanJatuhTempo() {
    var d = db(); if (!d) return 0; var n = 0, now = Date.now();
    dijadwalkan().forEach(function (u) { if (u.berlakuAt && new Date(u.berlakuAt).getTime() <= now) { try { terapkan(u.id, { id:null, nama:'sistem (jatuh tempo)' }, 'jatuh-tempo'); n++; } catch (e) { audit(null, 'Gagal menerapkan ' + u.judul, u.id, e.message); } } });
    return n;
  }
  /* Sesi lebih tua dari SESI_ULANG_MENIT → aksi tinggi minta autentikasi ulang. */
  function butuhSesiUlang(sesi, u) { return !!(u && u.tingkat === 'tinggi' && sesi && sesi.mulai && Date.now() - sesi.mulai > SESI_ULANG_MENIT * 60000); }

  /* ------------------------------------------------------------ selisih untuk tampilan
     Objek datar/bersarang → baris [tanda, kunci, nilai]; larik dibandingkan per indeks. */
  function datar(o, awalan, out) {
    out = out || {}; awalan = awalan || '';
    if (o == null || typeof o !== 'object') { out[awalan || '(nilai)'] = o == null ? '' : String(o); return out; }
    if (Array.isArray(o) && o.every(function (x) { return x == null || typeof x !== 'object' || Array.isArray(x); })) { o.forEach(function (x, i) { out[awalan + '[' + (i + 1) + ']'] = Array.isArray(x) ? x.map(function (y) { return typeof y === 'boolean' ? (y ? '📷' : '') : String(y); }).filter(Boolean).join(' · ') : String(x == null ? '' : x); }); return out; }
    Object.keys(o).forEach(function (k) { datar(o[k], awalan ? awalan + '.' + k : k, out); });
    return out;
  }
  function selisih(sebelum, sesudah) {
    var a = datar(sebelum), b = datar(sesudah), kunci = {}, baris = [];
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { kunci[k] = true; });
    Object.keys(kunci).forEach(function (k) {
      if (!(k in a)) baris.push(['+', k, b[k]]);
      else if (!(k in b)) baris.push(['−', k, a[k]]);
      else if (a[k] !== b[k]) { baris.push(['−', k, a[k]]); baris.push(['+', k, b[k]]); }
    });
    return baris;
  }

  return { TINGKAT:TINGKAT, ATURAN:ATURAN, MAKS_TERBIT_PER_JAM:MAKS_TERBIT_PER_JAM, SESI_ULANG_MENIT:SESI_ULANG_MENIT,
    peranDari:peranDari, bolehMenyetujui:bolehMenyetujui, penyetujuLain:penyetujuLain, modeSatuAdmin:modeSatuAdmin,
    audit:audit, verifikasiRantai:verifikasiRantai, daftarAudit:daftarAudit, periksaAnomali:periksaAnomali,
    tingkat:tingkat, aturan:aturan, daftarkanPenerap:daftarkanPenerap, semua:semua, menunggu:menunggu, dijadwalkan:dijadwalkan,
    ajukan:ajukan, bolehSetujui:bolehSetujui, setujui:setujui, tolak:tolak, batalkan:batalkan, terapkanJatuhTempo:terapkanJatuhTempo, butuhSesiUlang:butuhSesiUlang, selisih:selisih, onChange:function (f) { pendengar.push(f); } };
})();
