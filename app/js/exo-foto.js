/* ==========================================================================
   exo-foto.js — simpanan foto EXOCLEAN App (data URL di localStorage)
   --------------------------------------------------------------------------
   Foto klaim, foto SOP, dan avatar mitra disimpan sebagai data URL, terpisah
   dari basis data supaya satu foto besar tidak membuat seluruh tabel gagal
   tersimpan. Kunci: exoclean_app_foto. Bila kuota penuh, simpan() memulangkan
   false dan pemanggil memberi tahu pengguna — tidak ada yang dihapus diam-diam.
   ========================================================================== */
var EXO_FOTO = (function () {
  'use strict';
  var KEY = EXO_UTIL.kunci('foto');
  function peta() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function tulis(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { return false; } }
  function simpan(id, dataUrl) { var p = peta(); p[id] = dataUrl; return tulis(p); }
  function ambil(id) { return peta()[id] || null; }
  function hapus(id) { var p = peta(); delete p[id]; return tulis(p); }
  function daftar() { return Object.keys(peta()); }
  function siap() { return true; }
  return { KEY: KEY, simpan: simpan, ambil: ambil, hapus: hapus, daftar: daftar, siap: siap };
})();
