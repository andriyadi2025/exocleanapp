/* ==========================================================================
   exo-cs.js — Customer Care AI EXOCLEAN untuk pelanggan, mitra cleaning,
   dan mitra toko
   --------------------------------------------------------------------------
   · Basis pengetahuan (KB) per sisi: pertanyaan umum + jawaban + tombol aksi
     ke layar terkait. Admin bisa menambah/mengubah/menghapus entri lewat
     setting `csKB` (konsol admin → Customer Care AI).
   · Jawaban berbasis data langsung (pesanan aktif, saldo, kupon, flash deal,
     skor toko, tas mitra, insentif, kontak darurat) lewat konteks(sisi).
   · Mesin lokal: pencocokan kata kunci + sinonim, berjalan tanpa server.
     Bila cs-server (Claude) tersedia, jawaban lokal diperkaya jawaban AI
     dengan KB & konteks yang sama sebagai landasan (EXO_SERVER.csTanya).
   · Eskalasi ke manusia: tiket `tiketCs` (sisi, pengguna, ringkasan
     percakapan) — ditangani admin; pertanyaan yang tidak terjawab dicatat
     di `csTanyaLog` untuk memperbaiki KB.
   ========================================================================== */
var EXO_CS = (function () {
  'use strict';
  function db() { try { return window.EXO_DB && EXO_DB.init() ? EXO_DB : null; } catch (e) { return null; } }
  function kini() { return new Date().toISOString(); }
  function rp(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  var SINONIM = { bayar:['pembayaran', 'membayar', 'tagihan', 'transfer', 'va', 'qris', 'dompet', 'wallet', 'saldo'], batal:['pembatalan', 'membatalkan', 'cancel', 'refund', 'uang kembali', 'dikembalikan'], jadwal:['reschedule', 'pindah', 'ubah jam', 'ganti hari', 'waktu', 'jam'], pesan:['booking', 'order', 'pesanan', 'memesan', 'book'], harga:['tarif', 'biaya', 'ongkos', 'berapa', 'mahal', 'murah'], mitra:['petugas', 'cleaner', 'juru bersih', 'tukang', 'helper'], kupon:['voucher', 'promo', 'diskon', 'kode'], kirim:['pengiriman', 'ongkir', 'kurir', 'resi', 'paket', 'lacak'], komplain:['keluhan', 'rusak', 'hilang', 'retur', 'tidak sesuai', 'kecewa'], akun:['profil', 'email', 'sandi', 'password', 'login', 'masuk', 'daftar'], jaminan:['garansi', 'ulang', 'redo', 'kompensasi'], iklan:['ads', 'topads', 'kampanye', 'promosi toko'], stok:['persediaan', 'kehabisan', 'habis', 'gudang'], sos:['darurat', 'kecelakaan', 'bahaya', 'emergency'], absen:['kehadiran', 'check in', 'checkin', 'masuk shift'], insentif:['bonus', 'target', 'reward'], sop:['prosedur', 'checklist', 'kursus', 'akademi', 'sertifikat', 'pelatihan'] };
  var KB = {
    klien:[
      { id:'k-pesan', kata:['pesan', 'cara', 'booking', 'mulai'], tanya:'Bagaimana cara memesan layanan?', jawab:'Pilih layanan di beranda atau Semua layanan, tentukan durasi dan jadwal, pilih juru bersih (profil, rating, tarif nyata), lalu bayar dengan EXO Wallet, QRIS, virtual account, atau kartu. Jadwal terkunci setelah dikonfirmasi.', aksi:[['Pilih layanan', 'catalog']] },
      { id:'k-harga', kata:['harga', 'tarif'], tanya:'Berapa tarif layanannya?', jawab:'Tarif dasar tampil di tiap layanan (mis. cleaning per jam mulai Rp78.000/jam) dan bisa berbeda per juru bersih. Total = tarif × durasi + add-on + biaya aplikasi Rp3.000, dikurangi voucher, langganan, atau Flash Deal.', aksi:[['Lihat semua layanan', 'catalog']] },
      { id:'k-jadwal', kata:['jadwal', 'pindah', 'reschedule'], tanya:'Bisakah memindahkan jadwal?', jawab:'Bisa. Buka Transaksi → pesanan → Pindah jadwal. Hanya Anda yang bisa memindahkan jadwal yang sudah terkunci. Bila EXOCLEAN yang menggeser, Rp100.000 masuk ke dompet Anda otomatis.', aksi:[['Buka Transaksi', 'orders']] },
      { id:'k-batal', kata:['batal', 'refund'], tanya:'Bagaimana pembatalan dan refund?', jawab:'Pembatalan sebelum juru bersih berangkat dikembalikan penuh ke EXO Wallet seketika. Refund ke bank/kartu punya tenggat bertanggal yang tampil di Transaksi; bila terlambat, kredit Rp50.000 ditambahkan otomatis.', aksi:[['Lihat Transaksi', 'orders']] },
      { id:'k-bayar', kata:['bayar', 'metode'], tanya:'Metode pembayaran apa saja?', jawab:'EXO Wallet (bebas biaya jasa aplikasi), QRIS, GoPay/OVO/DANA, virtual account (biaya layanan Rp1.000), dan kartu kredit. 4 transaksi pertama bebas biaya jasa aplikasi.', aksi:[['Isi EXO Wallet', 'wallet']] },
      { id:'k-jaminan', kata:['jaminan', 'garansi', 'tidak puas', 'kotor'], tanya:'Ada garansi bila hasil tidak memuaskan?', jawab:'Ada. Setiap layanan punya garansi pengerjaan ulang gratis (mis. 48 jam untuk cleaning per jam, 30 hari untuk servis AC). Ajukan lewat Transaksi → Klaim dengan foto sebelum–sesudah dari laporan mitra.', aksi:[['Ajukan klaim', 'issue']] },
      { id:'k-kupon', kata:['kupon', 'voucher', 'promo', 'flash deal', 'flash sale'], tanya:'Bagaimana memakai kupon dan promo?', jawab:'Kupon jasa (mis. CLEAN25) dipakai di langkah pembayaran; kupon toko otomatis diperiksa saat checkout. Flash Deal jasa dan Flash Sale produk tampil di beranda dengan hitung mundur dan otomatis memotong harga selama kuota ada.', aksi:[['Kupon saya', 'kuponSaya']] },
      { id:'k-toko', kata:['toko', 'produk', 'perlengkapan', 'belanja', 'chemical'], tanya:'Bagaimana belanja perlengkapan?', jawab:'Buka Toko, pilih produk dari toko mitra, masukkan keranjang, lalu checkout. Bisa digabung dengan pesanan jasa dalam satu checkout, ke alamat sama atau berbeda. Gratis ongkir untuk belanja ≥ Rp150.000 per toko.', aksi:[['Buka Toko', 'toko']] },
      { id:'k-kirim', kata:['kirim', 'ongkir', 'resi', 'lacak', 'kurir'], tanya:'Bagaimana melacak pengiriman?', jawab:'Buka Transaksi → pesanan toko → Lacak. Nomor resi dan status kurir (Biteship) diperbarui otomatis; pesanan selesai otomatis 3 hari setelah tiba bila tidak ada komplain.', aksi:[['Lacak pesanan', 'pesananToko']] },
      { id:'k-komplain', kata:['komplain', 'rusak', 'retur', 'salah kirim'], tanya:'Barang rusak atau tidak sesuai?', jawab:'Ajukan komplain dari pesanan toko dalam 2 hari setelah diterima, sertakan foto. Dana pembeli masih ditahan EXOCLEAN sampai komplain selesai, jadi refund cepat bila disetujui. Asuransi pengiriman mengganti barang hilang/rusak dalam perjalanan.', aksi:[['Pesanan toko', 'pesananToko']] },
      { id:'k-akun', kata:['akun', 'alamat', 'nomor', 'ganti', 'ubah'], tanya:'Cara mengubah data akun dan alamat?', jawab:'Buka Akun → alamat tersimpan untuk menambah/mengubah alamat, dan Pengaturan akun untuk metode pembayaran, notifikasi, dan bahasa.', aksi:[['Buka Akun', 'profile']] },
      { id:'k-langganan', kata:['langganan', 'paket', 'prabayar', 'mingguan'], tanya:'Apa itu paket dan langganan?', jawab:'Paket prabayar (10/20/40 jam) lebih hemat per jam. Langganan mingguan mengunci harga 3 bulan dan juru bersih yang sama; bisa lewati satu kunjungan tanpa kehilangan mitra.', aksi:[['Lihat paket', 'prepaid']] },
      { id:'k-invoice', kata:['invoice', 'struk', 'bukti', 'nota', 'faktur'], tanya:'Di mana invoice pesanan?', jawab:'Setiap pesanan punya invoice ORDER RECEIPT bernomor 24 karakter. Buka Transaksi → tombol Invoice, atau layar sukses pemesanan. Bisa dicetak / disimpan PDF.', aksi:[['Buka Transaksi', 'orders']] }
    ],
    mitra:[
      { id:'m-order', kata:['order', 'terima', 'tolak', 'job', 'masuk'], tanya:'Cara menerima order masuk?', jawab:'Nyalakan ONLINE di beranda. Order masuk punya hitung mundur 10 menit: Terima untuk memasukkannya ke Jadwal, atau Tolak dengan alasan (jadwal bentrok, terlalu jauh, tidak sesuai keahlian) — penolakan beralasan tidak memengaruhi skor.', aksi:[['Beranda Job', 'pjobs']] },
      { id:'m-sop', kata:['sop', 'terkunci', 'kursus', 'akademi', 'kuis'], tanya:'Kenapa job terkunci "Lulus SOP dulu"?', jawab:'Setiap layanan punya SOP wajib. Job layanan itu terbuka setelah kursus SOP-nya lulus kuis di Akademi; job layanan lain tidak terpengaruh. Kursus bisa diselesaikan kapan saja dari tab Akademi.', aksi:[['Buka Akademi', 'pbelajar']] },
      { id:'m-bayar', kata:['bayar', 'upah', 'pendapatan', 'cair', 'payout', 'gaji'], tanya:'Kapan upah dibayarkan?', jawab:'Upah job masuk ke saldo mitra setelah laporan sebelum–sesudah terkirim. Pencairan (payout) diproses tiap Senin bersama bonus insentif; tarik saldo dari tab Pendapatan → Cairkan.', aksi:[['Pendapatan', 'pearn']] },
      { id:'m-insentif', kata:['insentif', 'bonus', 'target'], tanya:'Bagaimana insentif mingguan?', jawab:'Target 12 job selesai/minggu → Rp150.000, rating ≥ 4,8 → Rp50.000, tepat waktu 100% → Rp35.000. Dihitung Senin pagi dari 7 hari sebelumnya; pembatalan oleh mitra menggugurkan bonus minggu itu.', aksi:[['Lihat insentif', 'pinsentif']] },
      { id:'m-tas', kata:['tas', 'chemical', 'perlengkapan', 'stok', 'isi ulang', 'gudang', 'alat'], tanya:'Perlengkapan habis, bagaimana isi ulang?', jawab:'Cek Perlengkapan dibawa sebelum Mulai rute. Isi tas berkurang otomatis tiap laporan job; buka Tas & isi ulang → Minta isi ulang ke gudang, lalu ambil paket saat statusnya "diserahkan". Alat rusak: lapor dari Alat kerja saya.', aksi:[['Tas & isi ulang', 'ptas']] },
      { id:'m-sos', kata:['sos', 'darurat', 'kecelakaan', 'kontak darurat'], tanya:'Apa yang terjadi saat menekan SOS?', jawab:'Ops EXOCLEAN dan dua kontak darurat Anda langsung diberi tahu beserta lokasi dan nomor job. Salah tekan bisa dibatalkan dalam 30 detik. Perbarui kontak darurat tiap 180 hari di Akun → Kontak darurat.', aksi:[['Kontak darurat', 'pkontak']] },
      { id:'m-absen', kata:['absen', 'shift', 'terlambat'], tanya:'Cara absen dan aturan keterlambatan?', jawab:'Absen masuk/keluar dari beranda atau layar Absen; jam & lokasi terekam otomatis. Job yang lewat 30 menit dari jadwal tanpa Mulai rute memberi tahu ops — kabari ops lebih dulu bila terhalang.', aksi:[['Absen', 'pabsen']] },
      { id:'m-skor', kata:['skor', 'rating', 'performa', 'gold', 'silver'], tanya:'Bagaimana skor performa dihitung?', jawab:'Rating pelanggan, ketepatan waktu tiba, dan pembatalan membentuk skor 0–100 dan tingkat Bronze/Silver/Gold. Rating di bawah 4,6 memicu pelatihan ulang, bukan penonaktifan.', aksi:[['Pendapatan & performa', 'pearn']] },
      { id:'m-jadwal', kata:['jadwal', 'reschedule', 'pelanggan pindah'], tanya:'Pelanggan memindahkan jadwal, bagaimana?', jawab:'Ops tidak pernah memindahkan job yang sudah Anda terima. Bila pelanggan reschedule kurang dari 4 jam sebelum mulai, Anda tetap dibayar 30% atas waktu yang sudah dikunci.', aksi:[['Jadwal', 'pjadwal']] },
      { id:'m-laporan', kata:['laporan', 'foto', 'sebelum', 'sesudah', 'checklist'], tanya:'Cara mengirim laporan job?', jawab:'Di Job berjalan: selesaikan checklist SOP (APD → alat & chemical → langkah kerja dengan foto wajib), lalu Foto sebelum–sesudah → Kirim laporan. Pelanggan melihatnya langsung dan upah masuk ke saldo.', aksi:[['Job berjalan', 'pjob']] },
      { id:'m-daftar', kata:['daftar', 'pendaftaran', 'dokumen', 'ktp', 'verifikasi'], tanya:'Syarat pendaftaran mitra?', jawab:'KTP, nomor HP aktif, dua kontak darurat terverifikasi OTP, dokumen pendukung, dan lulus kursus dasar K3 & APD di Akademi. Verifikasi admin 1–2 hari kerja.', aksi:[['Formulir pendaftaran', 'preg']] },
      { id:'m-usul', kata:['usul', 'tarif', 'area', 'layanan baru'], tanya:'Bisa mengusulkan tarif atau area baru?', jawab:'Bisa, dari tab Pendapatan → Usulan (layanan, tarif, atau area). Admin meninjau dalam 1–2 hari kerja dan hasilnya tampil di sana.', aksi:[['Pendapatan', 'pearn']] }
    ],
    toko:[
      { id:'t-buka', kata:['buka', 'daftar', 'verifikasi', 'toko baru'], tanya:'Cara membuka toko?', jawab:'Isi formulir Buka toko (nama, alamat, rekening, kurir yang dilayani). Toko tayang setelah admin memverifikasi identitas dan rekening (1–2 hari kerja).', aksi:[['Buka toko', 'tdaftar']] },
      { id:'t-produk', kata:['produk', 'unggah', 'upload', 'moderasi', 'foto', 'varian'], tanya:'Cara menambah produk?', jawab:'Produk → Tambah: minimal 1 foto (disarankan ≥ 3), nama, kategori, harga, stok/varian, berat & dimensi. Produk baru dan perubahan penting masuk moderasi admin sebelum tayang.', aksi:[['Produk', 'tproduk']] },
      { id:'t-komisi', kata:['komisi', 'biaya layanan', 'potongan', 'persen'], tanya:'Berapa biaya layanan (komisi)?', jawab:'Biaya layanan per tingkat: Reguler 5%, Power Merchant 4,5%, Official Store 3% (bisa berbeda per kategori), plus tambahan bagi peserta program Gratis Ongkir. Dipotong saat pesanan selesai; ongkir diteruskan utuh.', aksi:[['Keuangan toko', 'tkeuangan']] },
      { id:'t-cair', kata:['cair', 'pencairan', 'saldo', 'tarik', 'dana ditahan'], tanya:'Kapan dana pesanan cair?', jawab:'Dana pembeli ditahan EXOCLEAN dan masuk saldo toko setelah pesanan selesai (otomatis 3 hari setelah dikirim bila tidak ada komplain). Tarik saldo dari Keuangan; permintaan ≥ ambang tertentu perlu persetujuan admin.', aksi:[['Keuangan toko', 'tkeuangan']] },
      { id:'t-kirim', kata:['kirim', 'resi', 'kurir', 'biteship', 'ongkir'], tanya:'Cara mengirim pesanan & input resi?', jawab:'Pesanan → Proses dalam 1×24 jam, pilih kurir (Biteship) atau diantar mitra, buat pengiriman → resi otomatis, atau input resi manual. Status kurir diperbarui otomatis.', aksi:[['Pesanan toko', 'tpesanan']] },
      { id:'t-iklan', kata:['iklan', 'ads', 'topads', 'bid', 'klik'], tanya:'Bagaimana memasang iklan toko?', jawab:'Iklan → isi saldo iklan → buat iklan produk/toko dengan kata kunci, bid per klik, anggaran harian, dan durasi. Tayang di atas hasil cari, beranda, dan halaman produk; bayar hanya per klik. Iklan baru melewati moderasi.', aksi:[['Iklan toko', 'tiklan']] },
      { id:'t-promo', kata:['kupon', 'promo', 'flash sale', 'diskon'], tanya:'Cara membuat kupon dan ikut flash sale?', jawab:'Promosi → Kupon (potongan Rp / % / gratis ongkir dengan minimum belanja & kuota). Slot flash sale mingguan dibuka admin; produk diskon ≥ 15% dan stok ≥ 20 bisa diajukan lewat chat admin.', aksi:[['Promosi', 'tpromosi']] },
      { id:'t-skor', kata:['skor', 'power merchant', 'official', 'rating', 'penalti'], tanya:'Cara naik ke Power Merchant?', jawab:'Skor toko 0–100 dari rating, proses < 1 hari, tingkat batal, dan balas chat. Skor ≥ 85 dan 20 pesanan selesai → Power Merchant (biaya layanan lebih rendah, produk tampil lebih atas).', aksi:[['Skor toko', 'tskor']] },
      { id:'t-komplain', kata:['komplain', 'retur', 'refund', 'pembeli'], tanya:'Menangani komplain & retur?', jawab:'Tanggapi komplain dari Pesanan dalam 2 hari. Retur disetujui → refund ke dompet pembeli dari dana ditahan; komplain yang dibiarkan menurunkan skor toko.', aksi:[['Pesanan toko', 'tpesanan']] },
      { id:'t-ongkir', kata:['gratis ongkir', 'program', 'subsidi'], tanya:'Apa itu program Gratis Ongkir?', jawab:'Pembeli mendapat subsidi ongkir sampai Rp20.000 untuk belanja ≥ Rp150.000 di toko peserta; peserta dikenai tambahan biaya layanan 2%. Ikut/keluar dari Pengaturan toko.', aksi:[['Pengaturan toko', 'tpengaturan']] },
      { id:'t-invoice', kata:['invoice', 'struk', 'nota'], tanya:'Invoice untuk pembeli?', jawab:'Setiap pesanan punya invoice ORDER RECEIPT bernomor 24 karakter yang bisa dicetak; tautannya ada di Pesanan toko dan di aplikasi pembeli.', aksi:[['Pesanan toko', 'tpesanan']] }
    ]
  };
  var SAPAAN = { klien:'Halo! Saya asisten EXOCLEAN. Tanyakan soal pemesanan, jadwal, pembayaran, kupon, atau belanja perlengkapan.', mitra:'Halo, Mitra! Tanyakan soal order, SOP & Akademi, upah, insentif, perlengkapan, atau keselamatan.', toko:'Halo, Mitra Toko! Tanyakan soal produk, pesanan, pencairan, komisi, iklan, atau promosi.' };

  /* ---------- KB + timpaan admin ---------- */
  function kb(sisi) { var d = db(), o = d ? (d.setting('csKB') || {}) : {}, tambah = (o[sisi] || []), hapus = o.hapus || []; return KB[sisi].filter(function (e) { return hapus.indexOf(e.id) < 0; }).map(function (e) { var t = tambah.filter(function (x) { return x.id === e.id; })[0]; return t ? Object.assign({}, e, t) : e; }).concat(tambah.filter(function (x) { return !KB[sisi].some(function (e) { return e.id === x.id; }); })); }
  function simpanKB(sisi, entri) { var d = db(); if (!d) throw new Error('Basis data tidak tersedia'); var o = d.setting('csKB') || {}; o[sisi] = (o[sisi] || []).filter(function (x) { return x.id !== entri.id; }).concat([{ id:entri.id || ('u-' + Date.now().toString(36)), kata:(Array.isArray(entri.kata) ? entri.kata : String(entri.kata || '').split(',')).map(function (k) { return k.trim().toLowerCase(); }).filter(Boolean), tanya:String(entri.tanya || '').trim(), jawab:String(entri.jawab || '').trim(), aksi:entri.aksi || [] }]); d.setting('csKB', o); return o[sisi]; }
  function hapusKB(sisi, id) { var d = db(); if (!d) return; var o = d.setting('csKB') || {}; o[sisi] = (o[sisi] || []).filter(function (x) { return x.id !== id; }); if (KB[sisi].some(function (e) { return e.id === id; })) { o.hapus = (o.hapus || []).concat([id]); } d.setting('csKB', o); }
  function pulihkanKB(id) { var d = db(); if (!d) return; var o = d.setting('csKB') || {}; o.hapus = (o.hapus || []).filter(function (x) { return x !== id; }); d.setting('csKB', o); }

  /* ---------- konteks data langsung ---------- */
  function konteks(sisi, K) {
    var d = db(), baris = []; K = K || {};
    try {
      if (sisi === 'klien') {
        if (K.jasa && !K.dibatalkan) baris.push('Pesanan jasa aktif: ' + (K.orderNo || 'EXO-4471') + ' · ' + K.jasa + ' · ' + (K.jam || 3) + ' jam · mulai ' + (K.mulai || '09:00'));
        baris.push('Saldo EXO Wallet ' + rp(K.saldo || 0) + ' · poin ' + (K.poin || 0));
        if (window.EXO_TOKO && d) { var ps = d.all('pesananToko').filter(function (o) { return ['menunggu-bayar', 'baru', 'diproses', 'dikirim', 'komplain'].indexOf(o.status) >= 0; }); if (ps.length) baris.push('Pesanan toko berjalan: ' + ps.map(function (o) { return o.no + ' (' + EXO_TOKO.labelStatus(o.status) + (o.resi ? ', resi ' + o.resi : '') + ')'; }).join(', ')); }
        if (window.EXO_FLASHDEAL) { var fd = EXO_FLASHDEAL.tampil().filter(function (f) { return f.keadaan === 'berjalan'; }); if (fd.length) baris.push('Flash Deal berjalan: ' + fd.map(function (f) { return f.jasa + ' −' + f.diskonPct + '% (sisa ' + f.sisa + ')'; }).join(', ')); }
        if (d) { var kup = d.all('kuponToko').filter(function (k) { return k.aktif && k.terpakai < k.kuota; }).length; baris.push('Kupon toko aktif: ' + kup + ' · voucher jasa CLEAN25 (min Rp150.000)'); }
      } else if (sisi === 'mitra') {
        var nama = K.mitraNama || 'Sari Wulandari';
        baris.push('Job berikutnya: ' + (K.orderNo || 'EXO-4471') + ' · ' + (K.jasa || 'hourly') + ' · mulai ' + (K.mulai || '09:00') + ' · saldo mitra ' + rp(K.saldoMitra || 0));
        if (window.EXO_PERLENGKAPAN) { var jt = EXO_PERLENGKAPAN.tasJatuhTempo(nama); if (jt) baris.push('Tas: ' + (jt.menunggu ? 'isi ulang sedang disiapkan gudang' : jt.jatuhTempo ? 'perlu isi ulang (' + jt.hariSejak + ' hari, ' + jt.rendah + ' item < 50%)' : 'cukup')); var alat = EXO_PERLENGKAPAN.alatMitra(nama); if (alat.length) baris.push('Alat di tangan: ' + alat.length + (alat.some(function (a) { return a.kondisi === 'rusak'; }) ? ' (ada yang rusak)' : '')); }
        if (window.EXO_KESELAMATAN) { var st = EXO_KESELAMATAN.statusKontak(nama); baris.push('Kontak darurat: ' + st.alasan); }
        if (window.EXO_LMS && EXO_LMS.sopBelum) { try { var u = d && d.find ? null : null; } catch (e) { /* abaikan */ } }
        baris.push('Insentif: target 12 job/minggu (Rp150.000), rating ≥ 4,8 (Rp50.000), tepat waktu 100% (Rp35.000)');
      } else if (sisi === 'toko') {
        if (window.EXO_TOKO && d) { var tk = EXO_TOKO.semuaToko()[0]; if (tk) { var ke = EXO_TOKO.keuanganToko(tk.id), sk = EXO_TOKO.skorToko(tk.id), semua = d.all('pesananToko').filter(function (o) { return o.tokoId === tk.id; }); baris.push('Toko: ' + tk.nama + ' · ' + (sk.badge === 'official' ? 'Official Store' : sk.badge === 'power' ? 'Power Merchant' : 'Reguler') + ' · skor ' + sk.skor + ' · biaya layanan ' + EXO_TOKO.komisiPct(tk) + '%'); baris.push('Saldo toko ' + rp(ke.saldo) + ' · tertahan ' + rp(ke.tertahan) + ' · pesanan baru ' + semua.filter(function (o) { return o.status === 'baru'; }).length + ' · siap kirim ' + semua.filter(function (o) { return o.status === 'diproses'; }).length); if (window.EXO_IKLAN) baris.push('Saldo iklan ' + rp(EXO_IKLAN.saldoIklan(tk.id)) + ' · iklan aktif ' + EXO_IKLAN.daftarIklan(tk.id).filter(function (i) { return i.status === 'aktif'; }).length); } }
      }
    } catch (e) { /* konteks opsional */ }
    return baris;
  }

  /* ---------- mesin jawab lokal ---------- */
  function token(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9àâäèéêëîïôöùûüç\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1; }); }
  function perluas(kata) { var out = kata.slice(); kata.forEach(function (w) { Object.keys(SINONIM).forEach(function (k) { if (w === k || SINONIM[k].indexOf(w) >= 0) { out.push(k); out = out.concat(SINONIM[k]); } }); }); return out; }
  var GENERIK = ['cara', 'bisa', 'apa', 'bagaimana', 'mulai', 'pesan', 'ubah', 'ganti', 'baru', 'saldo', 'produk', 'pembeli', 'foto', 'jadwal'];
  function skor(entri, kata, teks, mentah) { var s = 0; entri.kata.forEach(function (k) { var kk = k.toLowerCase(), b = GENERIK.indexOf(kk) >= 0 ? 0.75 : 2; if (teks.indexOf(kk) >= 0) s += kk.indexOf(' ') > 0 ? 3 : b; else if (kata.indexOf(kk) >= 0) s += Math.min(b, 1); }); token(entri.tanya).forEach(function (w) { if (w.length > 3 && (mentah || kata).indexOf(w) >= 0) s += 0.5; }); return s; }
  function jawab(sisi, teks, K) {
    var t = String(teks || '').trim(), mentah = token(t), kata = perluas(mentah), tl = t.toLowerCase(), daftar = kb(sisi);
    if (!t) return { teks:SAPAAN[sisi] || SAPAAN.klien, saran:daftar.slice(0, 4).map(function (e) { return e.tanya; }), aksi:[], sumber:'kb' };
    if (/^(halo|hai|hi|selamat (pagi|siang|sore|malam)|assalamualaikum|permisi)/.test(tl)) return { teks:SAPAAN[sisi], saran:daftar.slice(0, 4).map(function (e) { return e.tanya; }), aksi:[], sumber:'kb' };
    if (/(manusia|orang|cs asli|admin|petugas cs|hubungkan|bicara dengan)/.test(tl)) return { teks:'Baik, saya hubungkan ke tim EXOCLEAN. Tekan "Hubungkan ke tim" di bawah — tiket dibuat dengan ringkasan percakapan ini, dibalas dalam 60 detik pada jam layanan.', saran:[], aksi:[], eskalasi:true, sumber:'kb' };
    var nilai = daftar.map(function (e) { return { e:e, s:skor(e, kata, tl, mentah) }; }).sort(function (a, b) { return b.s - a.s; }), terbaik = nilai[0];
    /* data langsung untuk pertanyaan status/saldo */
    var ktx = konteks(sisi, K), dataBaris = [];
    if (/(status|di mana|dimana|sudah sampai|posisi|resi|lacak)/.test(tl)) dataBaris = ktx.filter(function (b) { return /Pesanan|Job berikutnya/.test(b); });
    else if (/(saldo|poin|dompet|wallet|tertahan|berapa uang)/.test(tl)) dataBaris = ktx.filter(function (b) { return /Saldo|saldo/.test(b); });
    else if (/(flash|promo hari ini|deal)/.test(tl)) dataBaris = ktx.filter(function (b) { return /Flash/.test(b); });
    else if (/(tas|stok|alat|isi ulang)/.test(tl) && sisi === 'mitra') dataBaris = ktx.filter(function (b) { return /Tas|Alat/.test(b); });
    else if (/(kontak darurat)/.test(tl) && sisi === 'mitra') dataBaris = ktx.filter(function (b) { return /Kontak/.test(b); });
    else if (/(iklan)/.test(tl) && sisi === 'toko') dataBaris = ktx.filter(function (b) { return /iklan/.test(b); });
    var d = db();
    if (dataBaris.length && (!terbaik || terbaik.s < 3)) return { teks:'📊 ' + dataBaris.join('\n📊 '), saran:daftar.slice(0, 3).map(function (e) { return e.tanya; }), aksi:[], sumber:'data' };
    if (terbaik && terbaik.s >= 2) { var lain = nilai.slice(1, 4).filter(function (x) { return x.s >= 1; }).map(function (x) { return x.e.tanya; }); return { teks:(dataBaris.length ? '📊 ' + dataBaris.join('\n📊 ') + '\n\n' : '') + terbaik.e.jawab, saran:lain.length ? lain : daftar.filter(function (e) { return e.id !== terbaik.e.id; }).slice(0, 3).map(function (e) { return e.tanya; }), aksi:terbaik.e.aksi || [], id:terbaik.e.id, sumber:dataBaris.length ? 'data' : 'kb' }; }
    if (dataBaris.length) return { teks:'📊 ' + dataBaris.join('\n📊 '), saran:daftar.slice(0, 3).map(function (e) { return e.tanya; }), aksi:[], sumber:'data' };
    if (d) d.insert('csTanyaLog', { sisi:sisi, tanya:t, at:kini(), status:'belum' });
    return { teks:'Maaf, saya belum menemukan jawaban pasti untuk itu. Coba pilih topik di bawah, atau hubungkan ke tim EXOCLEAN — pertanyaan Anda sudah saya catat agar dijawab lengkap.', saran:daftar.slice(0, 4).map(function (e) { return e.tanya; }), aksi:[], tidakTerjawab:true, sumber:'kb' };
  }

  /* ---------- eskalasi & log ---------- */
  function eskalasi(sisi, pengguna, riwayat, alasan) { var d = db(); if (!d) return null; return d.insert('tiketCs', { no:'CS-' + Date.now().toString(36).toUpperCase(), sisi:sisi, pengguna:pengguna || '', alasan:alasan || '', riwayat:(riwayat || []).slice(-10), status:'baru', at:kini() }); }
  function tiket(status) { var d = db(); return d ? d.all('tiketCs').filter(function (t) { return !status || t.status === status; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function ubahTiket(id, patch) { var d = db(); return d ? d.update('tiketCs', id, patch) : null; }
  function tanyaLog() { var d = db(); return d ? d.all('csTanyaLog').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }) : []; }
  function nilaiJawaban(sisi, tanya, id, baik) { var d = db(); if (d) d.insert('csNilai', { sisi:sisi, tanya:tanya, entri:id || '', baik:!!baik, at:kini() }); }
  function statistik() { var d = db(); if (!d) return { nilai:0, baik:0, tiket:0, terbuka:0, belum:0 }; var n = d.all('csNilai'), t = d.all('tiketCs'), l = d.all('csTanyaLog'); return { nilai:n.length, baik:n.filter(function (x) { return x.baik; }).length, tiket:t.length, terbuka:t.filter(function (x) { return x.status !== 'selesai'; }).length, belum:l.filter(function (x) { return x.status === 'belum'; }).length }; }
  /* landasan untuk AI cloud: KB + konteks dalam teks ringkas */
  function landasan(sisi, K) { return { sapaan:SAPAAN[sisi], kb:kb(sisi).map(function (e) { return { q:e.tanya, a:e.jawab, layar:(e.aksi || []).map(function (a) { return a[1]; }) }; }), konteks:konteks(sisi, K) }; }
  return { KB:KB, SAPAAN:SAPAAN, kb:kb, simpanKB:simpanKB, hapusKB:hapusKB, pulihkanKB:pulihkanKB, konteks:konteks, jawab:jawab, eskalasi:eskalasi, tiket:tiket, ubahTiket:ubahTiket, tanyaLog:tanyaLog, nilaiJawaban:nilaiJawaban, statistik:statistik, landasan:landasan };
})();
