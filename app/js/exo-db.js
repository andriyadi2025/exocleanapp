/* ==========================================================================
   exo-db.js — basis data lokal EXOCLEAN App (localStorage, CRUD generik)
   --------------------------------------------------------------------------
   Milik EXOCLEAN App sendiri; tidak berbagi kunci, skema, maupun kode dengan
   aplikasi lain. Tabel: users (mitra, pelanggan, admin), orders, ratings,
   complaints, sertifikat, activity. Kunci: exoclean_app_db.
   Foto tidak disimpan di sini (lihat exo-foto.js).
   ========================================================================== */
var EXO_DB = (function () {
  'use strict';
  var KEY = EXO_UTIL.kunci('db'), VERSION = 1;
  var TABLES = ['users', 'orders', 'ratings', 'complaints', 'sertifikat', 'activity'];
  var state = null, saveTimer = null, listeners = [];
  function blank() {
    var s = { _v: VERSION };
    TABLES.forEach(function (t) { s[t] = []; });
    s.counters = { order: 0, sertifikat: 0 };
    s.settings = {};
    return s;
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* storage diblokir */ }
    if (!raw) return null;
    try {
      var p = JSON.parse(raw);
      if (!p || p._v !== VERSION) return null;
      TABLES.forEach(function (t) { if (!p[t]) p[t] = []; });
      p.counters = p.counters || {}; p.settings = p.settings || {};
      return p;
    } catch (e) { return null; }
  }
  function save(immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!immediate) { saveTimer = setTimeout(function () { save(true); }, 120); return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { if (window.console) console.warn('EXO_DB: penyimpanan penuh atau diblokir — perubahan terakhir tidak tersimpan.'); }
  }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { /* abaikan */ } }); }
  function onChange(fn) { listeners.push(fn); }
  function init() { if (!state) { state = load(); if (!state) { state = blank(); save(true); } } return state; }
  function all(table) { return ((state || {})[table] || []).slice(); }
  function find(table, id) { var rows = (state || {})[table] || []; for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i]; return null; }
  function where(table, pred) {
    var rows = (state || {})[table] || [];
    if (typeof pred === 'function') return rows.filter(pred);
    return rows.filter(function (r) { for (var k in pred) if (r[k] !== pred[k]) return false; return true; });
  }
  function first(table, pred) { var r = where(table, pred); return r.length ? r[0] : null; }
  function insert(table, row) {
    init(); row = Object.assign({}, row);
    if (!row.id) row.id = EXO_UTIL.uid(table.slice(0, 3));
    if (!row.createdAt) row.createdAt = EXO_UTIL.nowISO();
    state[table] = state[table] || []; state[table].push(row);
    save(); emit(); return row;
  }
  function update(table, id, patch) {
    var row = find(table, id); if (!row) return null;
    Object.assign(row, typeof patch === 'function' ? patch(row) : patch);
    row.updatedAt = EXO_UTIL.nowISO(); save(); emit(); return row;
  }
  function remove(table, id) { init(); state[table] = (state[table] || []).filter(function (r) { return r.id !== id; }); save(); emit(); }
  function nextNo(kind) { init(); state.counters[kind] = (state.counters[kind] || 0) + 1; save(); return state.counters[kind]; }
  function log(actorId, aksi, refType, refId, detail) {
    init(); state.activity.push({ id: EXO_UTIL.uid('act'), actorId: actorId, aksi: aksi, refType: refType, refId: refId, detail: detail || '', at: EXO_UTIL.nowISO() });
    if (state.activity.length > 400) state.activity = state.activity.slice(-400);
    save();
  }
  function setting(k, v) { init(); if (arguments.length === 1) return state.settings[k]; state.settings[k] = v; save(); return v; }
  function exportJSON() { init(); return JSON.stringify(state, null, 2); }
  function importJSON(text) { var p = JSON.parse(text); if (!p || p._v !== VERSION) throw new Error('Versi data tidak cocok'); state = p; TABLES.forEach(function (t) { if (!state[t]) state[t] = []; }); save(true); emit(); }
  function reset() { state = blank(); save(true); emit(); }
  function ada() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function ukuran() { try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; } }
  return {
    KEY: KEY, TABLES: TABLES,
    init: init, ada: ada, all: all, find: find, where: where, first: first, insert: insert, update: update, remove: remove,
    nextNo: nextNo, log: log, setting: setting, save: save, onChange: onChange, exportJSON: exportJSON, importJSON: importJSON, reset: reset, ukuran: ukuran,
    get raw() { return state; }
  };
})();
