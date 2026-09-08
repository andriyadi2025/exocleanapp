/* ==========================================================================
   exo-screens-pin.js — UI PIN transaksi untuk semua sisi
   --------------------------------------------------------------------------
   · Lembar `pinTransaksi`: buat PIN (dua kali), verifikasi sebelum aksi uang,
     kunci 5× salah, tautan "Lupa PIN" → reset lewat OTP.
   · X.denganPin(alasan, kerja): gerbang generik — aksi uang dibungkus
     otomatis: konfirmasi bayar/tahan (pelanggan), isi & tarik saldo,
     pembayaran keranjang toko, pencairan toko, isi saldo iklan, ganti
     rekening, permintaan hapus akun.
   · Layar `pinKelola`: status, ganti PIN, reset lewat OTP.
   Dimuat setelah exo-sheets.js supaya membungkus aksi yang sudah ada.
   ========================================================================== */
(function (X) {
  'use strict';
  var K = X.KEADAAN, esc = X.esc, aksi = X.aksi, A = X.AKSI;
  var P = function () { return window.EXO_PIN; };
  if (!window.EXO_PIN) return;
  function sisi() { return K.sisi === 'toko' ? 'toko' : K.sisi === 'partner' ? 'partner' : 'customer'; }
  function labelSisi() { return { customer:'pelanggan', partner:'mitra cleaning', toko:'mitra toko' }[sisi()]; }
  K.pinGerbang = null;

  /* ---------- gerbang ---------- */
  X.denganPin = function (alasan, kerja, opsi) {
    opsi = opsi || {};
    var st = P().status(sisi());
    K.pinGerbang = { alasan:alasan, kerja:kerja, tahap:st.ada ? 'verifikasi' : 'buat', isi:'', isi2:'', pesan:'', sibuk:false, lupa:false };
    K.lembar = 'pinTransaksi'; X.gambar();
  };
  X.LEMBAR.pinTransaksi = function () {
    var g = K.pinGerbang; if (!g) return '';
    var judul = g.tahap === 'buat' ? 'Buat PIN transaksi' : g.tahap === 'ulang' ? 'Ulangi PIN baru' : g.tahap === 'reset' ? 'PIN baru (setelah OTP)' : g.tahap === 'resetUlang' ? 'Ulangi PIN baru' : 'PIN transaksi';
    var ket = g.tahap === 'buat' ? 'Enam angka, terpisah dari OTP/sandi, diminta untuk setiap pembayaran, tahan dana, isi/tarik saldo, dan pencairan. Hindari 123456 atau tanggal lahir.' : g.tahap === 'verifikasi' ? esc(g.alasan) : 'Masukkan lagi untuk memastikan.';
    var isi = '<div class="stack gap-10"><div class="t-125 lh-15">' + ket + '</div>' + X.pinDots(g.tahap === 'ulang' || g.tahap === 'resetUlang' ? g.isi2 : g.isi) + (g.sibuk ? '<div class="center t-115 o-6">Memeriksa…</div>' : '') + (g.pesan ? '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(g.pesan) + '</div>' : '') + X.keypad('pinGerbangTekan') +
      (g.tahap === 'verifikasi' ? '<button class="btn btn-ghost t-12"' + aksi('pinLupa') + '>Lupa PIN? Reset lewat OTP</button>' : '') + '<div class="t-11 o-6 center">' + (P().pakaiServer() ? 'Diverifikasi di server · 5× salah terkunci 30 menit' : 'Mode perangkat ini · 5× salah terkunci 30 menit') + '</div></div>';
    return '<div class="sheet-back"' + aksi('pinGerbangBatal') + '><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(judul) + '" data-diam="1"><div class="sheet-grip"></div><div class="sheet-head"><div class="sheet-title">' + esc(judul) + '</div><button class="btn btn-icon btn-soft"' + aksi('pinGerbangBatal') + ' aria-label="Tutup">✕</button></div><div class="sheet-body">' + isi + '</div></div></div>';
  };
  A.pinGerbangBatal = function () { K.pinGerbang = null; K.lembar = null; };
  A.pinGerbangTekan = function (k) {
    var g = K.pinGerbang; if (!g || g.sibuk) return;
    var kunci = g.tahap === 'ulang' || g.tahap === 'resetUlang' ? 'isi2' : 'isi';
    g[kunci] = k === '⌫' ? g[kunci].slice(0, -1) : (g[kunci] + k).slice(0, 6); g.pesan = '';
    if (g[kunci].length === 6) setTimeout(selesaiTahap, 60);
  };
  function selesaiTahap() {
    var g = K.pinGerbang; if (!g) return;
    if (g.tahap === 'buat' || g.tahap === 'reset') { var l = P().lemah(g.isi); if (l) { g.pesan = l; g.isi = ''; X.gambar(); return; } g.tahap = g.tahap === 'buat' ? 'ulang' : 'resetUlang'; X.gambar(); return; }
    if (g.tahap === 'ulang' || g.tahap === 'resetUlang') { if (g.isi2 !== g.isi) { g.pesan = 'PIN tidak sama. Ulangi dari awal.'; g.isi = ''; g.isi2 = ''; g.tahap = g.tahap === 'ulang' ? 'buat' : 'reset'; X.gambar(); return; } g.sibuk = true; X.gambar(); (g.tahap === 'ulang' ? P().atur(sisi(), g.isi) : P().reset(sisi(), g.isi)).then(function (r) { g.sibuk = false; if (!r.ok) { g.pesan = r.error || 'Gagal menyimpan PIN.'; g.isi = ''; g.isi2 = ''; g.tahap = 'buat'; X.gambar(); return; } X.sekilas('PIN transaksi ' + (g.tahap === 'resetUlang' ? 'direset' : 'dibuat') + ' (' + r.mode + ').'); var kerja = g.kerja; K.pinGerbang = null; K.lembar = null; if (kerja) { try { kerja(); } catch (e) { X.sekilas('Gagal: ' + e.message, 'err'); } } X.gambar(); }); return; }
    /* verifikasi */
    g.sibuk = true; X.gambar();
    P().verifikasi(sisi(), g.isi).then(function (r) {
      g.sibuk = false;
      if (r.ok) { var kerja = g.kerja; K.pinGerbang = null; K.lembar = null; if (kerja) { try { kerja(); } catch (e) { X.sekilas('Gagal: ' + e.message, 'err'); } } X.gambar(); return; }
      if (r.belumAda) { g.tahap = 'buat'; g.isi = ''; g.pesan = 'PIN belum dibuat di server — buat sekarang.'; X.gambar(); return; }
      g.isi = ''; g.pesan = r.error || 'PIN salah.'; X.gambar();
    });
  };
  A.pinLupa = function () { var g = K.pinGerbang; if (!g) return; g.lupa = true; K.pinGerbang = null; K.lembar = null; K.pinResetTugas = g.kerja; K.layar = 'pinKelola'; K.pinKelolaTab = 'reset'; X.sekilas('Minta OTP baru, lalu buat PIN baru.'); };

  /* ---------- pembungkus aksi uang ---------- */
  function jaga(nama, alasan) {
    var asli = A[nama]; if (typeof asli !== 'function' || asli._pinJaga) return;
    var b = function () { var args = arguments; if (K.pinLolos === nama) { K.pinLolos = null; return asli.apply(this, args); } X.denganPin(typeof alasan === 'function' ? alasan() : alasan, function () { K.pinLolos = nama; A[nama].apply(null, args); }); };
    b._pinJaga = true; A[nama] = b;
  }
  function pasang() {
    /* pembayaran pelanggan: keypad PIN yang sudah ada di layar konfirmasi kini benar-benar diverifikasi */
    var konfirmasiAsli = A.konfirmasi;
    if (konfirmasiAsli && !konfirmasiAsli._pinJaga) {
      A.konfirmasi = function () {
        if (!X.tagihanSekarang || !X.tagihanSekarang()) return konfirmasiAsli();
        if (!P().ada(sisi())) { X.denganPin('Buat PIN untuk membayar', function () { K.payPinOpen = false; K.payPin = ''; K.pinTerverifikasi = 'baru'; A.konfirmasi(); }); return; }
        if (K.pinTerverifikasi === 'baru') { K.pinTerverifikasi = null; K.payPinOpen = true; K.payPin = ''; return; }
        if (!K.payPinOpen) return konfirmasiAsli();
        if (K.payPin.length < 6) return;
        if (K.pinTerverifikasi === K.payPin) { K.pinTerverifikasi = null; return konfirmasiAsli(); }
        K.gatewaySibuk = true; X.gambar();
        P().verifikasi(sisi(), K.payPin).then(function (r) { K.gatewaySibuk = false; if (r.ok) { K.pinTerverifikasi = K.payPin; A.konfirmasi(); } else { K.payPin = ''; X.sekilas(r.error || 'PIN salah.', 'err'); } X.gambar(); });
      }; A.konfirmasi._pinJaga = true;
    }
    jaga('isiSaldo', function () { return 'Isi saldo EXO Wallet ' + (window.EXO_UTIL && EXO_UTIL.rp ? EXO_UTIL.rp(K.nominal) : K.nominal); });
    jaga('tarikSaldo', function () { return 'Tarik saldo ' + (window.EXO_UTIL && EXO_UTIL.rp ? EXO_UTIL.rp(K.nominal) : K.nominal); });
    jaga('tokoBayar', 'Bayar pesanan toko');
    jaga('ttarikAjukan', 'Ajukan pencairan saldo toko');
    jaga('tiklanTopupKirim', 'Isi saldo iklan');
    jaga('simpanBank', 'Ubah rekening pencairan');
    var pdpAsli = A.pdpMinta; if (pdpAsli && !pdpAsli._pinJaga) { A.pdpMinta = function (jenis) { if (jenis !== 'hapus') return pdpAsli(jenis); if (K.pinLolos === 'pdpMinta') { K.pinLolos = null; return pdpAsli(jenis); } X.denganPin('Ajukan penghapusan data & akun', function () { K.pinLolos = 'pdpMinta'; A.pdpMinta(jenis); }); }; A.pdpMinta._pinJaga = true; }
    /* pendaftaran pelanggan: PIN yang diketik di langkah terakhir disimpan sungguhan */
    var selesaiAsli = A.selesaiAuth; if (selesaiAsli && !selesaiAsli._pinJaga) { A.selesaiAuth = function () { if (/^\d{6}$/.test(K.pin || '')) { var l = P().lemah(K.pin); if (l) { X.sekilas(l, 'err'); K.pin = ''; return; } P().atur('customer', K.pin).then(function (r) { if (!r.ok) X.sekilas(r.error || 'PIN gagal disimpan', 'err'); }); K.pin = ''; } return selesaiAsli(); }; A.selesaiAuth._pinJaga = true; }
  }
  if (document.readyState === 'complete') setTimeout(pasang, 0); else window.addEventListener('load', function () { setTimeout(pasang, 0); });
  pasang();

  /* ---------- layar kelola PIN ---------- */
  K.pinKelola = K.pinKelola || { lama:'', baru:'', ulang:'', telp:'', kode:'', tahap:'telp', pesan:'' };
  X.LAYAR.pinKelola = function () {
    var st = P().status(sisi()), f = K.pinKelola, tab = K.pinKelolaTab || 'status';
    var kembali = sisi() === 'toko' ? 'tprofil' : 'profile';
    var h = '<div class="screen">' + X.kepala('PIN transaksi', 'Terpisah dari OTP & sandi · ' + labelSisi(), kembali) + '<div class="stack gap-12 pad-x18" style="padding-bottom:40px">';
    h += '<div class="card elev-sm gap-8"><div class="flex items-center gap-8"><div class="grow"><div class="bold t-14">' + (st.ada ? 'PIN aktif' : 'PIN belum dibuat') + '</div><div class="t-12 o-6">' + (st.ada ? 'Diperbarui ' + esc(String(st.digantiAt || st.dibuatAt || '').slice(0, 10)) + ' · mode ' + esc(st.mode) + (st.terkunciSampai ? ' · <b style="color:#9b1c1c">terkunci sampai ' + esc(new Date(st.terkunciSampai).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })) + '</b>' : '') : 'Diminta untuk bayar, tahan dana, isi/tarik saldo, pencairan, dan hapus akun.') + '</div></div>' + (st.ada ? '<span class="tag tag-accent" style="font-size:10.5px">aktif</span>' : '<button class="btn btn-primary" style="height:32px;font-size:12px"' + aksi('pinBuatSekarang') + '>Buat PIN</button>') + '</div>' +
      '<div class="flex gap-6 wrap">' + [['status', 'Ringkasan'], ['ganti', 'Ganti PIN'], ['reset', 'Lupa PIN (OTP)']].map(function (t) { return '<button class="pill pill-sm' + (tab === t[0] ? ' on' : '') + '"' + aksi('pinKelolaTab', t[0]) + '>' + t[1] + '</button>'; }).join('') + '</div></div>';
    if (tab === 'ganti') h += '<div class="card elev-sm gap-8"><div class="bold t-14">Ganti PIN</div>' + ['lama', 'baru', 'ulang'].map(function (k) { return '<div class="field"><label>' + { lama:'PIN lama', baru:'PIN baru (6 angka)', ulang:'Ulangi PIN baru' }[k] + '</label><input class="input" type="password" inputmode="numeric" maxlength="6" value="' + esc(f[k]) + '" data-ubah="pinKelolaIsi" data-arg="' + k + '"></div>'; }).join('') + (f.pesan ? '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(f.pesan) + '</div>' : '') + '<button class="btn btn-primary" style="height:38px"' + aksi('pinGantiKirim') + '>Simpan PIN baru</button></div>';
    if (tab === 'reset') h += '<div class="card elev-sm gap-8"><div class="bold t-14">Lupa PIN — reset lewat OTP</div><div class="t-12 o-6 lh-15">Kami kirim OTP ke nomor terdaftar. Setelah OTP benar, Anda membuat PIN baru. Di mode server, reset hanya diterima dalam 10 menit setelah OTP.</div>' + (f.tahap === 'telp' ? '<div class="field"><label>Nomor HP terdaftar</label><input class="input" inputmode="tel" value="' + esc(f.telp || K.otpTujuan || '') + '" data-ubah="pinKelolaIsi" data-arg="telp"></div><button class="btn btn-primary" style="height:38px"' + aksi('pinResetOtpKirim') + '>Kirim OTP</button>' : '<div class="field"><label>Kode OTP</label><input class="input" inputmode="numeric" maxlength="6" value="' + esc(f.kode) + '" data-ubah="pinKelolaIsi" data-arg="kode"></div><div class="flex gap-8"><button class="btn btn-primary" style="height:38px"' + aksi('pinResetOtpPeriksa') + '>Verifikasi & buat PIN baru</button><button class="btn btn-ghost" style="height:38px"' + aksi('pinKelolaIsi', 'tahap') + ' data-arg="tahap">Ganti nomor</button></div>') + (f.pesan ? '<div class="t-12" style="background:#fdecec;color:#9b1c1c;border-radius:12px;padding:10px 12px">' + esc(f.pesan) + '</div>' : '') + '</div>';
    h += '<div class="card elev-sm gap-6"><div class="bold t-14">Aturan</div><ul class="t-12 lh-15" style="margin:0;padding-left:18px"><li>PIN tidak pernah diminta lewat chat, telepon, atau oleh CS — hanya di dalam aplikasi saat transaksi.</li><li>Salah 5 kali → terkunci 30 menit. Reset hanya lewat OTP ke nomor terdaftar.</li><li>PIN disimpan sebagai hash (PBKDF2-SHA256), tidak bisa dibaca siapa pun.</li></ul></div>';
    return h + '</div></div>';
  };
  A.pinKelolaTab = function (v) { K.pinKelolaTab = v; K.pinKelola.pesan = ''; };
  A.pinKelolaIsi = function (k, v) { if (k === 'tahap') { K.pinKelola.tahap = 'telp'; K.pinKelola.kode = ''; return; } K.pinKelola[k] = String(v || '').replace(k === 'telp' ? /[^\d+]/g : /\D/g, ''); K.pinKelola.pesan = ''; };
  A.pinBuatSekarang = function () { X.denganPin('Buat PIN transaksi', function () { K.pinKelolaTab = 'status'; }); };
  A.pinGantiKirim = function () { var f = K.pinKelola; if (f.baru !== f.ulang) { f.pesan = 'PIN baru tidak sama.'; return; } P().ganti(sisi(), f.lama, f.baru).then(function (r) { if (r.ok) { K.pinKelola = { lama:'', baru:'', ulang:'', telp:'', kode:'', tahap:'telp', pesan:'' }; K.pinKelolaTab = 'status'; X.sekilas('PIN diganti (' + r.mode + ').'); } else f.pesan = r.error || 'Gagal mengganti PIN.'; X.gambar(); }); };
  A.pinResetOtpKirim = function () { var f = K.pinKelola, t = (f.telp || K.otpTujuan || '').replace(/\D/g, ''); if (t.length < 9) { f.pesan = 'Nomor tidak sah.'; return; } if (!window.EXO_SERVER) { f.pesan = 'Server OTP tidak tersedia — di mode perangkat ini PIN bisa dibuat ulang lewat Buat PIN.'; return; } EXO_SERVER.otpKirim(t).then(function (r) { if (r.ok) { f.telp = t; f.tahap = 'kode'; X.sekilas('OTP dikirim.'); } else f.pesan = r.offline ? 'auth-server tidak terjangkau.' : (r.error || 'Gagal mengirim OTP.'); X.gambar(); }); };
  A.pinResetLanjut = function () { var f = K.pinKelola; f.tahap = 'telp'; f.kode = ''; K.pinGerbang = { alasan:'', kerja:K.pinResetTugas || null, tahap:'reset', isi:'', isi2:'', pesan:'', sibuk:false }; K.pinResetTugas = null; K.lembar = 'pinTransaksi'; X.gambar(); };
  A.pinResetOtpPeriksa = function () { var f = K.pinKelola; EXO_SERVER.otpPeriksa(f.telp, f.kode, sisi() === 'partner' ? 'mitra' : sisi() === 'toko' ? 'toko' : 'klien').then(function (r) { if (!r.ok) { f.pesan = r.error || 'Kode salah.'; X.gambar(); return; } if (r.data && r.data.perlu2fa && X.mulaiDuaFaktorMasuk) { X.mulaiDuaFaktorMasuk(r.data, function () { A.pinResetLanjut(); }); X.gambar(); return; } if (r.data && r.data.sesi && window.EXO_BRANKAS) EXO_BRANKAS.terimaSesi(r.data.sesi); f.tahap = 'telp'; f.kode = ''; K.pinGerbang = { alasan:'', kerja:K.pinResetTugas || null, tahap:'reset', isi:'', isi2:'', pesan:'', sibuk:false }; K.pinResetTugas = null; K.lembar = 'pinTransaksi'; X.gambar(); }); };
})(ExoApp);
