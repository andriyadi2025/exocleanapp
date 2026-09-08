/* keamanan.html — merender kebijakan VDP terbitan admin dan mengirim laporan */
(function () {
  'use strict';
  var K = EXO_VDP.kebijakan(), el = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  try { if (window.EXO_BRAND) EXO_BRAND.terapkan(); } catch (e) { /* abaikan */ }
  var CONTOH = { kritis:'RCE di server, pengambilalihan akun massal, akses brankas data pribadi, manipulasi nominal pembayaran/pencairan', tinggi:'IDOR ke data/pesanan pengguna lain, bypass OTP/sesi, XSS tersimpan yang mencuri sesi, SSRF ke jaringan internal', sedang:'XSS reflektif, CSRF pada aksi berdampak, bypass pembatas laju OTP, kebocoran informasi terbatas', rendah:'Salah konfigurasi kecil berdampak terbatas, open redirect', info:'Praktik baik tanpa dampak' };
  var CVSS = { kritis:'9,0 – 10', tinggi:'7,0 – 8,9', sedang:'4,0 – 6,9', rendah:'0,1 – 3,9', info:'—' };
  el('cakupanIsi').innerHTML = K.cakupan.map(function (c) { return '<tr><td><b>' + esc(c.aset) + '</b></td><td>' + esc(c.jenis) + '</td><td><span class="pil ' + esc(c.prioritas) + '">' + esc(c.prioritas) + '</span></td></tr>'; }).join('');
  el('luarIsi').innerHTML = K.luar.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
  el('hadiahIsi').innerHTML = ['kritis', 'tinggi', 'sedang', 'rendah', 'info'].map(function (t) { return '<tr><td><span class="pil ' + t + '">' + esc(EXO_VDP.TINGKAT[t]) + '</span> <span style="color:var(--muted);font-size:12px">' + CVSS[t] + '</span></td><td>' + esc(CONTOH[t]) + '</td><td><b>' + esc(EXO_VDP.rentangHadiah(K, t)) + '</b></td></tr>'; }).join('');
  el('aturanIsi').innerHTML = K.aturan.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('');
  el('hofIsi').innerHTML = K.pengakuan.length ? K.pengakuan.map(function (p) { return '<div><b>' + esc(p.handle) + '</b><small>' + esc(p.judul || '') + (p.tgl ? ' · ' + esc(p.tgl) : '') + '</small></div>'; }).join('') : '<div style="color:var(--muted)">Belum ada — jadilah yang pertama.</div>';
  el('slaRespon').textContent = K.sla.respon; el('slaTriase').textContent = K.sla.triase; el('hadiahMaks').textContent = EXO_VDP.rp(K.hadiah.kritis[1]);
  Array.prototype.forEach.call(document.querySelectorAll('.slaRespon'), function (e) { e.textContent = K.sla.respon; }); Array.prototype.forEach.call(document.querySelectorAll('.slaTriase'), function (e) { e.textContent = K.sla.triase; }); Array.prototype.forEach.call(document.querySelectorAll('.slaPerbaikan'), function (e) { e.textContent = K.sla.perbaikan; });
  var em = el('emailTim'); em.textContent = K.email; em.href = 'mailto:' + K.email;
  if (K.aktif === false) el('tutup').hidden = false;
  if (K.diperbaruiAt) el('tglKebijakan').textContent = new Date(K.diperbaruiAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  var f = el('formLapor'), pesan = el('pesan'), tombol = el('kirim');
  function tampil(kelas, teks) { pesan.hidden = false; pesan.className = kelas; pesan.textContent = teks; }
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var b = {}; ['judul', 'aset', 'tingkat', 'langkah', 'dampak', 'nama', 'email', 'kontakLain', 'situs'].forEach(function (k) { b[k] = f.elements[k] ? f.elements[k].value : ''; });
    if (b.judul.trim().length < 8) return tampil('galat', 'Judul minimal 8 karakter.');
    if (b.langkah.trim().length < 40) return tampil('galat', 'Langkah reproduksi minimal 40 karakter — kami perlu bisa mengulanginya.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(b.email)) return tampil('galat', 'Email pelapor tidak sah.');
    tombol.disabled = true; tampil('info', 'Mengirim laporan terenkripsi…');
    EXO_SERVER.vdpLapor(b).then(function (r) {
      tombol.disabled = false;
      if (r.ok) { tampil('info', 'Terima kasih! Nomor tanda terima: ' + r.data.nomor + '. Simpan nomor ini; kami membalas ke ' + b.email + ' dalam ' + (r.data.sla ? r.data.sla.responHari : K.sla.respon) + ' hari kerja.'); f.reset(); }
      else tampil('galat', r.offline ? 'Server laporan tidak terjangkau. Kirim laporan Anda ke ' + K.email + '.' : (r.error || 'Gagal mengirim.'));
    });
  });
})();
