/* ==========================================================================
   exo-sop.js — SOP layanan yang bisa disunting admin, dipakai aplikasi mitra
   --------------------------------------------------------------------------
   Sumber kebenaran SOP per layanan:
     1. Bawaan rancangan: EXO_DATA.SOP_META (rev.00, tidak pernah diubah).
     2. Suntingan admin: tabel `sop` di EXO_DB, satu baris per layanan, dengan
        nomor revisi yang naik tiap penerbitan dan RIWAYAT lengkap (isi tiap
        revisi disimpan, jadi bisa dikembalikan).
     3. Yang DITERBITKAN ke aplikasi: localStorage 'exoclean_admin_pub'.sop
        — exo-core membaca ini lewat sopMeta(); tanpa terbitan, aplikasi
        memakai bawaan.

   Menerbitkan selalu lewat konsol admin dan wajib PIN transaksi admin yang
   sedang login (exo-admin-auth.js) — aturan itu dipegang di lapisan tampilan;
   modul ini hanya menyimpan dan menerbitkan setelah izin diberikan.
   ========================================================================== */
var EXO_SOP = (function () {
  'use strict';
  var KUNCI_PUB = 'exoclean_admin_pub', TABEL = 'sop', MAKS_RIWAYAT = 30;
  function D() { return window.EXO_DATA || { SOP_META:{} }; }
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function bacaPub() { try { return JSON.parse(localStorage.getItem(KUNCI_PUB) || '{}') || {}; } catch (e) { return {}; } }
  function tulisPub(p) { try { localStorage.setItem(KUNCI_PUB, JSON.stringify(p)); return true; } catch (e) { return false; } }

  /* Bentuk baku satu SOP: { jasa, code, title, ppe[], alat[[n,c]], chem[[n,c]], steps[[label,note,foto]] } */
  function bawaan(jasa) { var m = D().SOP_META[jasa]; return m ? Object.assign({ jasa:jasa, rev:0 }, salin(m)) : null; }
  function daftarJasa() { return Object.keys(D().SOP_META).filter(function (k) { return k !== 'default'; }); }
  function baris(jasa) { var d = db(); return d ? d.first(TABEL, { jasa:jasa }) : null; }

  /* SOP yang berlaku untuk sebuah layanan: revisi tersimpan bila ada, kalau tidak bawaan. */
  function berlaku(jasa) {
    var r = baris(jasa);
    if (r && r.isi) return Object.assign({ jasa:jasa, rev:r.rev, status:r.status, diubahAt:r.updatedAt || r.createdAt, olehNama:r.olehNama }, salin(r.isi));
    var b = bawaan(jasa); if (b) b.status = 'bawaan';
    return b;
  }
  function semua() { return daftarJasa().map(berlaku).filter(Boolean); }
  function riwayat(jasa) { var r = baris(jasa); return r && r.riwayat ? r.riwayat.slice().reverse() : []; }

  /* Validasi isi sebelum disimpan: tiap langkah punya label; kode & judul terisi. */
  function periksa(isi) {
    var galat = [];
    if (!isi.code || !/^[A-Z]-\d{3}$/.test(isi.code)) galat.push('Kode harus berpola huruf-3 angka, mis. D-001.');
    if (!isi.title || isi.title.trim().length < 3) galat.push('Judul SOP minimal 3 karakter.');
    if (!isi.steps || !isi.steps.length) galat.push('Minimal satu langkah kerja.');
    (isi.steps || []).forEach(function (s, i) { if (!s[0] || !String(s[0]).trim()) galat.push('Langkah ' + (i + 1) + ' belum punya judul.'); });
    return galat;
  }

  /* Simpan sebagai revisi baru DAN terbitkan ke aplikasi. `oleh` = { id, nama }
     admin yang PIN-nya sudah diverifikasi; `ringkasan` = catatan revisi. */
  function terbitkan(jasa, isi, oleh, ringkasan) {
    var d = db(); if (!d) throw new Error('Basis data tidak tersedia');
    var galat = periksa(isi); if (galat.length) throw new Error(galat.join(' '));
    var bersih = { code:String(isi.code).trim(), title:String(isi.title).trim(), ppe:(isi.ppe || []).slice(),
      alat:(isi.alat || []).map(function (a) { return [String(a[0] || '').trim(), String(a[1] || '').trim()]; }).filter(function (a) { return a[0]; }),
      chem:(isi.chem || []).map(function (a) { return [String(a[0] || '').trim(), String(a[1] || '').trim()]; }).filter(function (a) { return a[0]; }),
      steps:(isi.steps || []).map(function (s) { return [String(s[0] || '').trim(), String(s[1] || '').trim(), !!s[2]]; }) };
    var r = baris(jasa), rev = r ? (r.rev || 0) + 1 : 1, kini = new Date().toISOString();
    var catatan = { rev:rev, at:kini, olehId:oleh.id, olehNama:oleh.nama, ringkasan:String(ringkasan || '').trim() || 'Revisi ' + rev, isi:salin(bersih) };
    if (r) {
      var rw = (r.riwayat || []).concat([catatan]).slice(-MAKS_RIWAYAT);
      r = d.update(TABEL, r.id, { isi:bersih, rev:rev, status:'berlaku', olehId:oleh.id, olehNama:oleh.nama, riwayat:rw });
    } else {
      var b = bawaan(jasa), awal = b ? { rev:0, at:kini, olehId:null, olehNama:'Rancangan', ringkasan:'Bawaan rancangan', isi:{ code:b.code, title:b.title, ppe:b.ppe, alat:b.alat, chem:b.chem, steps:b.steps } } : null;
      r = d.insert(TABEL, { jasa:jasa, isi:bersih, rev:rev, status:'berlaku', olehId:oleh.id, olehNama:oleh.nama, riwayat:(awal ? [awal] : []).concat([catatan]) });
    }
    var pub = bacaPub(); pub.sop = pub.sop || {};
    pub.sop[jasa] = Object.assign({ rev:rev, at:kini }, salin(bersih));
    tulisPub(pub);
    if (d.log) d.log(oleh.id, 'Menerbitkan SOP ' + bersih.code + ' rev.' + String(rev).padStart(2, '0') + ' (' + jasa + ') — PIN diverifikasi', 'sop', r.id, catatan.ringkasan);
    try { if (window.EXO_LMS && EXO_LMS.sinkronSop) EXO_LMS.sinkronSop(true); } catch (e) { /* kursus disinkronkan saat LMS dibuka */ }
    return r;
  }
  /* Kembalikan ke isi revisi lama = terbitkan revisi baru dengan isi lama (jejak tetap utuh). */
  function pulihkan(jasa, revLama, oleh) {
    var r = baris(jasa); if (!r) throw new Error('Belum ada riwayat untuk layanan ini');
    var c = (r.riwayat || []).filter(function (x) { return x.rev === revLama; })[0]; if (!c) throw new Error('Revisi ' + revLama + ' tidak ditemukan');
    return terbitkan(jasa, c.isi, oleh, 'Dikembalikan ke rev.' + String(revLama).padStart(2, '0'));
  }
  /* Tarik semua suntingan: aplikasi kembali ke bawaan; riwayat tetap disimpan. */
  function tarik(jasa, oleh) {
    var d = db(); if (!d) return;
    var pub = bacaPub(); if (pub.sop) { delete pub.sop[jasa]; tulisPub(pub); }
    var r = baris(jasa); if (r) d.update(TABEL, r.id, { status:'ditarik', olehId:oleh.id, olehNama:oleh.nama });
    if (d.log) d.log(oleh.id, 'Menarik SOP ' + jasa + ' — aplikasi kembali ke bawaan (PIN diverifikasi)', 'sop', r && r.id);
  }
  /* Yang sedang dipakai aplikasi (dari terbitan), bila ada. */
  function terbit(jasa) { var p = bacaPub().sop; return p && p[jasa] ? p[jasa] : null; }
  function padRev(n) { return 'Rev.' + String(n || 0).padStart(2, '0'); }

  return { TABEL:TABEL, bawaan:bawaan, daftarJasa:daftarJasa, berlaku:berlaku, semua:semua, riwayat:riwayat, periksa:periksa, terbitkan:terbitkan, pulihkan:pulihkan, tarik:tarik, terbit:terbit, padRev:padRev };
})();
