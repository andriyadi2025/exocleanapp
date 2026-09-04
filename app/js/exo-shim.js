/* exo-shim.js — cadangan I18N global; dipisah dari HTML supaya CSP bisa
   melarang skrip inline sepenuhnya (script-src 'self'). */
window.I18N = window.I18N || { t: function (s) { return s; }, untuk: function (k, s) { return s; }, get: function () { return 'en'; } };
