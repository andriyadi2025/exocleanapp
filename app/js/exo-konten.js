/* ==========================================================================
   exo-konten.js — konten halaman depan yang bisa disunting admin
   --------------------------------------------------------------------------
   Empat halaman: klien (beranda aplikasi pelanggan: banner, menu ikon,
   bagian & urutannya, teks jaminan, placeholder cari), toko (beranda Seller
   Center), mitra (beranda mitra cleaning), web (landing page web.html).
   · Rancangan disimpan di EXO_DB setting 'konten' (tidak tayang).
   · Terbit: localStorage exoclean_admin_pub.konten — dibaca aplikasi lewat
     baca(); tanpa terbitan, bawaan. Menerbitkan lewat Persetujuan (jenis
     'konten', tingkat sedang) + PIN di konsol admin.
   · Riwayat versi (10 terakhir) untuk dikembalikan. Mode pratinjau:
     exo.html?pratinjau=1 membaca RANCANGAN, bukan terbitan.
   ========================================================================== */
var EXO_KONTEN = (function () {
  'use strict';
  var KUNCI_PUB = 'exoclean_admin_pub';
  var BAWAAN = {
    klien:{
      cariPlaceholder:'Cari jasa, produk, tagihan…',
      /* Teks berjalan di bawah alamat. teks kosong = memakai running text dari Appearance (merek). */
      teksBerjalan:{ aktif:true, label:'Promo', teks:'', kecepatan:22 },
      /* Ikon pengganti per layanan/menu: { jenis:'emoji'|'gambar', nilai }. Dipakai menu ikon beranda, hasil cari, dan katalog. */
      ikonLayanan:{},
      banner:[
        { id:'b1', judul:'Gratis ongkir', sub:'belanja perlengkapan ≥ Rp150.000 per toko', cta:'Belanja', ke:'toko', warna:'hijau', ikon:'🚚', aktif:true },
        { id:'b2', judul:'Langganan mingguan −10%', sub:'harga terkunci 3 bulan, jadwal tetap', cta:'Pilih paket', ke:'catalog', warna:'teal', ikon:'📅', aktif:true },
        { id:'b3', judul:'Bayar tagihan & pulsa', sub:'PLN, BPJS, PDAM, token dari EXO Wallet', cta:'Bayar', ke:'tagihan', warna:'ungu', ikon:'🧾', aktif:true },
        { id:'b4', judul:'Tiket & hotel', sub:'pesawat, kereta, hotel, umroh · Darmawisata', cta:'Cari', ke:'perjalanan', warna:'biru', ikon:'✈️', aktif:true }
      ],
      menu:[
        { id:'hourly', jasa:true, ikon:'🧹', label:'', aktif:true }, { id:'deep', jasa:true, ikon:'✨', label:'', aktif:true }, { id:'ac', jasa:true, ikon:'❄️', label:'', aktif:true }, { id:'sofa', jasa:true, ikon:'🛋️', label:'', aktif:true },
        { id:'toko', ke:'toko', ikon:'🛒', label:'Toko', aktif:true }, { id:'tagihan', ke:'tagihan', ikon:'🧾', label:'Tagihan', aktif:true }, { id:'perjalanan', ke:'perjalanan', ikon:'✈️', label:'Perjalanan', aktif:true }, { id:'catalog', ke:'catalog', ikon:'▦', label:'Semua', aktif:true }
      ],
      bagian:{ kunjungan:true, flashJasa:true, flash:true, toko:true, mitra:true, jaminan:true, rekomendasi:true },
      urutan:['kunjungan', 'flashJasa', 'flash', 'toko', 'mitra', 'jaminan', 'rekomendasi'],
      judulFlash:'⚡ Flash Sale', judulToko:'Toko pilihan', judulRekomendasi:'Rekomendasi untuk kamu',
      jaminan:'Setelah dikonfirmasi, hanya Anda yang bisa memindahkan jadwal. Bila kami yang menggeser, Rp100.000 masuk ke dompet Anda menit itu juga — tanpa tiket, tanpa mengejar.'
    },
    toko:{ teksBerjalan:{ aktif:false, label:'Info', teks:'Flash sale mingguan dibuka tiap Senin · proses pesanan < 24 jam agar skor toko naik', kecepatan:22 }, sapaan:'Seller Center', flashJudul:'Flash sale EXOCLEAN', flashTeks:'Slot flash sale mingguan dibuka admin (Marketplace → Promo). Produk berdiskon ≥ 15% dan stok ≥ 20 bisa diajukan lewat chat admin.', tips:['Proses pesanan baru dalam 1×24 jam dan input resi di hari yang sama.', 'Balas chat dalam 1 jam pada jam buka.', 'Lengkapi foto produk (≥ 3) dan deskripsi agar tampil lebih atas.'] },
    mitra:{ teksBerjalan:{ aktif:false, label:'Info', teks:'Selesaikan SOP wajib di Akademi sebelum ambil job baru · bonus tepat waktu minggu ini', kecepatan:22 }, sapaan:'Selamat pagi', area:'area Kemang', kartuJudul:'Jadwal Anda, keputusan Anda', kartuTeks:'Ops tidak pernah bisa memindahkan job yang sudah Anda terima. Bila pelanggan reschedule kurang dari 4 jam, Anda tetap dibayar 30% atas waktu yang sudah dikunci.', tombolDaftar:'Formulir pendaftaran mitra baru' },
    web:{
      hero:{ judul:'Kami bersihkan segalanya.', sub:'Profil nyata, tarif nyata, jadwal yang hanya bisa Anda ubah — dan janji Rp100.000 bila kami melanggarnya.', cta:'Pesan sekarang', cta2:'Jadi mitra' },
      layanan:[{ ikon:'🧹', judul:'Cleaning per jam', teks:'Mulai Rp78.000/jam, juru bersih pilihan Anda.' }, { ikon:'✨', judul:'Deep cleaning', teks:'Degreaser dapur, kerak kamar mandi, plafon & ventilasi.' }, { ikon:'❄️', judul:'Cuci & servis AC', teks:'Indoor, outdoor, cek suhu & tekanan, garansi 30 hari.' }, { ikon:'🛒', judul:'Toko perlengkapan', teks:'Chemical, alat & APD standar SOP dari toko mitra.' }],
      keunggulan:['Jadwal terkunci — hanya Anda yang bisa memindahkannya', 'Refund dengan tenggat bertanggal', 'Manusia di chat dalam 60 detik', 'Mitra bersertifikat Akademi EXOCLEAN'],
      testimoni:[{ nama:'Dewi A., Kemang', teks:'Sari datang tepat 09:00, foto sebelum-sesudah lengkap. Langganan mingguan sejak Juni.', bintang:5 }, { nama:'PT Karya Mitra', teks:'Kontrak kantor 3 lantai, inspeksi supervisor tiap Jumat. Laporan bulanan rapi.', bintang:5 }],
      kontak:{ wa:'0812-8890-4417', email:'halo@exoclean.id', alamat:'Jl. Kemang Raya 8, Jakarta Selatan', jam:'Senin–Minggu 07:00–21:00' },
      tautan:{ app:'exo.html', mitra:'exo.html?layar=preg', playstore:'', apk:'' },
      warna:'#009183'
    }
  };
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function gabung(dasar, timpa) { if (!timpa || typeof timpa !== 'object' || Array.isArray(timpa)) return timpa === undefined ? salin(dasar) : salin(timpa); var out = salin(dasar); Object.keys(timpa).forEach(function (k) { out[k] = (dasar && dasar[k] !== undefined && typeof dasar[k] === 'object' && !Array.isArray(dasar[k])) ? gabung(dasar[k], timpa[k]) : salin(timpa[k]); }); return out; }
  function bacaPub() { try { return JSON.parse(localStorage.getItem(KUNCI_PUB) || '{}') || {}; } catch (e) { return {}; } }
  function tulisPub(p) { try { localStorage.setItem(KUNCI_PUB, JSON.stringify(p)); return true; } catch (e) { return false; } }
  function rancangan() { var d = db(); var s = d && d.setting ? d.setting('konten') : null; return gabung(BAWAAN, s || {}); }
  function simpanRancangan(halaman, isi) { var d = db(); if (!d || !d.setting) return false; var s = d.setting('konten') || {}; s[halaman] = isi; s.diubahAt = new Date().toISOString(); d.setting('konten', s); return true; }
  function pratinjau() { try { return /[?&]pratinjau=1/.test(location.search); } catch (e) { return false; } }
  function terbitan() { var p = bacaPub().konten; return p ? gabung(BAWAAN, p) : salin(BAWAAN); }
  /* yang dibaca aplikasi */
  function baca(halaman) { var k = pratinjau() ? rancangan() : terbitan(); return halaman ? k[halaman] : k; }
  function adaTerbitan() { return !!bacaPub().konten; }
  function terbitkan(oleh, ringkasan) {
    var d = db(), r = rancangan(), p = bacaPub(), lama = p.konten || null, rev = (p.kontenRev || 0) + 1;
    p.konten = { klien:r.klien, toko:r.toko, mitra:r.mitra, web:r.web, rev:rev, at:new Date().toISOString(), oleh:oleh ? oleh.nama : '' }; p.kontenRev = rev; tulisPub(p);
    if (d && d.setting) { var rw = (d.setting('kontenRiwayat') || []).concat([{ rev:rev, at:p.konten.at, oleh:p.konten.oleh, ringkasan:ringkasan || '', isi:{ klien:r.klien, toko:r.toko, mitra:r.mitra, web:r.web } }]).slice(-10); d.setting('kontenRiwayat', rw); }
    if (d && d.log) d.log(oleh ? oleh.id : null, 'Menerbitkan konten halaman depan rev.' + rev, 'konten', ''); return p.konten;
  }
  function riwayat() { var d = db(); return d && d.setting ? (d.setting('kontenRiwayat') || []).slice().reverse() : []; }
  function pulihkan(rev) { var r = riwayat().filter(function (x) { return x.rev === rev; })[0]; if (!r) return false; var d = db(); var s = d.setting('konten') || {}; ['klien', 'toko', 'mitra', 'web'].forEach(function (k) { s[k] = salin(r.isi[k]); }); s.diubahAt = new Date().toISOString(); d.setting('konten', s); return true; }
  var WARNA = { hijau:'linear-gradient(135deg,#0a8f5c,#12b981)', teal:'linear-gradient(135deg,#0b5f52,#1a9a86)', ungu:'linear-gradient(135deg,#7a3e9d,#b15ad9)', biru:'linear-gradient(135deg,#1d4ed8,#3b82f6)', merah:'linear-gradient(135deg,#9f1239,#e11d48)', oranye:'linear-gradient(135deg,#b45309,#f59e0b)', abu:'linear-gradient(135deg,#374151,#6b7280)' };
  /* Palet emoji untuk pemilih ikon di konsol admin. */
  var EMOJI = [['Kebersihan', '🧹 🧽 🧼 🪣 🧴 🫧 🚿 🛁 🧺 🪥 🧻 🗑️ ♻️ 🪟 🧯'], ['Rumah & ruang', '🏠 🏢 🏬 🛋️ 🛏️ 🪑 🚪 🪴 🌿 🧊 ❄️ 🔥 💡 🔌 🪞'], ['Belanja & bayar', '🛒 🛍️ 🧾 💳 💰 🪙 ⭐ 🎁 🏷️ 🎉 📦 🚚 🏪 💵 📊'], ['Perjalanan', '✈️ 🚆 🚌 🚗 🏨 🕌 🗺️ 🧳 🎫 ⛱️ 🚕 🛵 🚢 📍 🧭'], ['Umum', '✨ ▦ 📅 ⏰ 🔔 📞 💬 👤 👥 🛠️ 🔧 🧰 ✅ ❓ ➕']].map(function (g) { return { nama:g[0], daftar:g[1].split(' ') }; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  /* Ikon pengganti untuk layanan/menu `id` di halaman `halaman` (null = pakai bawaan aplikasi). */
  function ikonLayanan(halaman, id) { var k = baca(halaman || 'klien'); var o = k && k.ikonLayanan ? k.ikonLayanan[id] : null; return o && o.nilai ? o : null; }
  /* HTML ikon dari objek pengganti: emoji → teks; gambar → <img> dari EXO_FOTO. */
  function ikonHtml(o, px) { px = px || 24; if (!o || !o.nilai) return ''; if (o.jenis === 'gambar') { var src = window.EXO_FOTO ? EXO_FOTO.ambil(o.nilai) : null; return src ? '<img src="' + src + '" alt="" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;border-radius:' + Math.round(px / 4) + 'px;display:block">' : ''; } return '<span style="font-size:' + px + 'px;line-height:1">' + esc(o.nilai) + '</span>'; }
  /* Teks berjalan (running text) untuk halaman: dari konten; di beranda klien teks kosong memakai running text Appearance. */
  /* sumber (opsional): objek konten halaman — konsol admin mengirim rancangan agar pratinjau memakai teks yang sedang disunting. */
  function tiket(halaman, sumber) {
    var k = sumber || baca(halaman || 'klien') || {}, tb = k.teksBerjalan; if (!tb) return null;
    if (halaman === 'klien' && !String(tb.teks || '').trim() && window.EXO_BRAND) { var b = EXO_BRAND.baca(); if (!b.tickerOn || !b.tickerText) return null; return { label:tb.label || b.tickerBadge, teks:b.tickerText, kecepatan:tb.kecepatan || b.tickerSpeed || 22, aktif:tb.aktif !== false }; }
    if (tb.aktif === false || !String(tb.teks || '').trim()) return null; return { label:tb.label || '', teks:tb.teks, kecepatan:tb.kecepatan || 22, aktif:true };
  }
  function tiketHtml(halaman, gaya) { var t = tiket(halaman); if (!t) return ''; return '<div class="ticker"' + (gaya ? ' style="' + gaya + '"' : '') + '>' + (t.label ? '<div class="ticker-badge"><i></i>' + esc(t.label) + '</div>' : '') + '<div class="ticker-win"><div class="ticker-track" style="--ticker-speed:' + Number(t.kecepatan) + 's"><span>' + esc(t.teks) + '</span><span>' + esc(t.teks) + '</span></div></div></div>'; }
  var TUJUAN = [['toko','Toko perlengkapan'],['catalog','Semua layanan'],['tagihan','Bayar & isi ulang'],['perjalanan','Perjalanan'],['wallet','Dompet'],['prepaid','Paket prabayar'],['pbelajar','Akademi mitra']];
  if (window.EXO_PERSETUJUAN) { try { EXO_PERSETUJUAN.TINGKAT.konten = 'sedang'; EXO_PERSETUJUAN.daftarkanPenerap('konten', function (u, oleh) { return terbitkan(oleh, u.ringkasan); }); } catch (e) { /* konsol admin saja */ } }
  return { BAWAAN:BAWAAN, WARNA:WARNA, TUJUAN:TUJUAN, EMOJI:EMOJI, ikonLayanan:ikonLayanan, ikonHtml:ikonHtml, tiket:tiket, tiketHtml:tiketHtml, rancangan:rancangan, simpanRancangan:simpanRancangan, baca:baca, terbitan:terbitan, adaTerbitan:adaTerbitan, terbitkan:terbitkan, riwayat:riwayat, pulihkan:pulihkan, pratinjau:pratinjau, gabung:gabung };
})();
