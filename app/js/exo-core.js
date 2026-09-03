/* ==========================================================================
   exo-core.js — inti EXOCLEAN App: keadaan, hitungan, pembantu, penggambar
   --------------------------------------------------------------------------
   Rancangannya memakai satu komponen dengan satu kantong keadaan dan
   sederet `sc-if`; kode ini menirunya: satu KEADAAN, satu gambar(), satu
   peta AKSI. Layarnya dipecah ke berkas terpisah hanya supaya tiap berkas
   tetap terbaca dari atas ke bawah:

     exo-core.js             ← berkas ini: keadaan, hitungan, pembantu
     exo-screens-customer.js ← 20 layar pelanggan
     exo-screens-partner.js  ← 7 layar mitra
     exo-sheets.js           ← lembar bawah, aksi, pemasangan

   Urutan muat harus seperti itu. Tiap berkas layar MENDAFTARKAN dirinya ke
   ExoApp.LAYAR / ExoApp.LEMBAR / ExoApp.AKSI; core tidak tahu isinya.

   ATURAN YANG TIDAK BOLEH DILANGGAR: Basis data milik EXOCLEAN App sendiri (exo-db.js, kunci exoclean_app_db).
   Aplikasi pelanggan hanya MEMBACA; yang membuat dan mengisinya adalah
   konsol admin (exo-admin.html) atau pendaftaran mitra. Lihat adaBasisData().
   ========================================================================== */
var ExoApp = (function () {
  'use strict';

  var D = EXO_DATA, I = EXO_I18N;

  /* ============================================================== KEADAAN */
  var KEADAAN = {
    sisi:'customer', layar:'onboard',
    jasa:'hourly', jam:3, regu:1, hari:1, mulai:'09:00', tambahan:{},
    juru:'sw', bayar:'wallet', voucher:true, tahap:1,
    bintang:5, pujian:{ 'Spotless finish':true }, tip:20000, catatanNilai:'',
    /* alur transaksi per layanan: keputusan yang menunggu pelanggan */
    penawaran:null, timbangan:null, struk:null, ekstra:[], ekstraForm:{ nama:'', harga:'' }, penawaranForm:{ a:'', ha:'', b:'', hb:'' }, timbangForm:'', strukForm:{ total:'', catatan:'' },
    keluhan:null, tabPesanan:'up', saring:'best',
    ceklis:{ kitchen:true, bath:true }, daring:true,
    shareTab:'invite', shareTarget:'wa', shared:false, termTab:'general',
    lang:'en',
    authStep:'form', social:null, captcha:false, consent:false, otp:'', pin:'', payPin:'', payPinOpen:false,
    addr:{ negara:'Indonesia', provinsi:'Banten', kabkota:'Kota Tangerang Selatan', kecamatan:'Pondok Aren', desa:'Pondok Karya', pos:'15225' },
    bank:{ bank:'BCA', acc:'BCA ···4471' }, bankPick:'', bankAcc:'', wdAmount:1000000, wdMethod:'weekly', wdPinOpen:false, wdPin:'',
    prepaid:'p20', pinDropped:true, radius:10,
    /* Foto contoh dari proyek EXOCLEAN sendiri (FOTO PROJECT), bukan stok. */
    shots:{ kitchen:{ before:{ url:'assets/foto/skincare-before.jpg', jam:'09:01' }, after:{ url:'assets/foto/skincare-after.jpg', jam:'11:21' } },
            bath:{ before:{ url:'assets/foto/dharma-before.jpg', jam:'09:00' } } },
    fotoContoh:{ hero:'assets/foto/kadek-after.jpg', bed:['assets/foto/kadek-before.jpg','assets/foto/kadek-after.jpg'] },
    /* pembayaran lewat gateway (bila server pendamping hidup) */
    gateway:null,        /* { orderId, channel, va, qrImageUrl, redirectUrl, status } */
    gatewaySibuk:false,
    /* OTP lewat server autentikasi */
    otpTujuan:'+62 812 8890 4417', otpServer:null,   /* null=belum kirim, 'terkirim', 'simulasi' */
    otpSibuk:false,
    /* posisi mitra dari perangkat; posisiServer = dari posisi-server (lintas perangkat) */
    posisi:null, posisiGalat:null, posisiSibuk:false, posisiServer:null, posisiServerAda:null,
    /* pesanan aktif yang dipakai kedua sisi */
    orderNo:'EXO-4471', orderDbId:null, pelangganId:null,
    /* login sosial & captcha */
    sosialSibuk:false, sosialProfil:null, captchaToken:null,
    gps:true, arrived:false, regStep:0, regDocs:{ ktp:true, skck:true },
    kin:[{ name:'Slamet Riyadi', phone:'+62 812 7741 9008', rel:'Orang tua', verified:true },
         { name:'Yuni Kartika',  phone:'+62 856 3390 1174', rel:'', verified:false }],
    ppe:{ gloves:true, mask:true, shoes:true },
    kit:{ 'Sikat toilet & sikat nat':true, 'Wet mop + ember biru':true, 'Lap microfiber biru':true,
          'Pembersih porselen (asam ringan)':true, 'Desinfektan permukaan':true },
    sopDone:{ 1:true, 2:true }, sopFoto:{}, finding:null,

    /* yang berubah karena ditekan orang, bukan karena berpindah layar */
    alamat:'home', cari:'', saldo:412000, poin:1240, mutasi:D.TXNS.slice(),
    saldoMitra:1864000, tertahan:468000, lewati:false, notifAktif:true,
    obrolan:D.CHAT_START.slice(), pesanBaru:'', mengetik:false, fotoKlaim:[],

    /* lapisan di atas layar */
    lembar:null, nominal:null, pindahHari:null, pindahJam:null, sekilas:null
  };

  /* Bahasa tersimpan per perangkat. */
  try { var bhs = localStorage.getItem('exoclean_lang'); if (bhs) KEADAAN.lang = I.set(bhs); } catch (e) { /* abaikan */ }
  I.set(KEADAAN.lang);

  /* Yang diterbitkan konsol admin (exo-admin.html): layanan dijeda, voucher. */
  function terbitan() {
    try { return JSON.parse(localStorage.getItem('exoclean_admin_pub') || '{}') || {}; }
    catch (e) { return {}; }
  }

  /* ======================================================== ROSTER JURU */
  var sumberDB = null;
  function adaBasisData() {
    try { return !!(window.EXO_DB && EXO_DB.ada()); }
    catch (e) { return false; }
  }
  function pakaiDB() {
    if (sumberDB !== null) return sumberDB;
    sumberDB = !!(window.EXO_DB && window.EXO_ROSTER && adaBasisData());
    if (sumberDB) { try { EXO_DB.init(); } catch (e) { sumberDB = false; } }
    /* Basis data yang ada tetapi belum punya satu pun mitra (instalasi baru,
       sebelum konsol admin menyemai atau mitra mendaftar) diperlakukan seperti
       tidak ada: roster contoh dari rancangan lebih baik daripada marketplace
       kosong. Begitu ada mitra sungguhan, mereka yang tayang. */
    if (sumberDB) { try { if (!EXO_DB.all('users').some(function (u) { return u.role === 'worker'; })) sumberDB = false; } catch (e) { sumberDB = false; } }
    return sumberDB;
  }
  /* Faktor = tarif per jam yang ditetapkan Super Admin ÷ tarif dasar per
     jam. Dengan begitu aturan #2 (harga = rate layanan × faktor orangnya)
     berlaku untuk semua satuan, dan pada layanan per jam angkanya persis
     tarif yang ditetapkan admin. */
  function dariDB(c) {
    var tahun = null;
    if (c.sejak) {
      var th = Math.floor((Date.now() - new Date(c.sejak).getTime()) / (365.25 * 864e5));
      tahun = th < 1 ? 'new' : th + (th === 1 ? ' yr' : ' yrs');
    }
    return {
      id:c.id, name:c.nama, initials:c.inisial,
      rating: c.bintang === null ? null : String(c.bintang).replace('.', ','),
      jobs: c.kerja.toLocaleString('id-ID'),
      factor: c.tarif / D.SERVICES.hourly.rate,
      distance:null, years:tahun,
      tags: c.sertifikat.length ? c.sertifikat.slice(0, 3) : (c.jabatan ? [c.jabatan] : []),
      note: c.bintang === null ? 'No ratings yet — rate set by EXOCLEAN, not by bidding.'
        : 'Rated ' + String(c.bintang).replace('.', ',') + ' across ' + c.kerja + ' verified visits.'
    };
  }
  function daftarJuru() {
    if (!pakaiDB()) return D.CLEANERS;
    return EXO_ROSTER.juruBersih().map(dariDB);
  }
  var JURU_KOSONG = { id:null, name:'No cleaner listed yet', initials:'—', rating:null, jobs:'0', factor:1,
    distance:null, years:null, tags:[], note:'A super admin sets each cleaner’s rate in the EXOCLEAN admin app.' };
  function juruKini() {
    var d = daftarJuru();
    for (var i = 0; i < d.length; i++) if (d[i].id === KEADAAN.juru) return d[i];
    return d[0] || JURU_KOSONG;
  }
  function namaDepan(j) { return (j.name || '').split(' ')[0]; }

  /* ============================================================ HITUNGAN */
  function jasaKini() { return D.SERVICES[KEADAAN.jasa]; }
  /* Kode alur transaksi layanan yang sedang dipesan dan metadatanya. */
  function alurKini() { return D.ALUR[KEADAAN.jasa] || 'langsung'; }
  function alurMeta() { return D.ALUR_META[alurKini()]; }
  function tahapAlur() { return alurMeta().tahap; }
  /* Total yang ditagih SAAT INI menurut alurnya: langsung = seluruhnya,
     titip = ongkos kurir saja (barang menyusul dari struk), lainnya = nol. */
  function tagihanSekarang() {
    var a = alurKini();
    if (a === 'langsung' || a === 'titip') return totalN();
    return 0;
  }
  /* Total tambahan yang sudah disetujui pelanggan di lokasi. */
  function ekstraDisetujui() { var n = 0; (KEADAAN.ekstra || []).forEach(function (e) { if (e.status === 'diterima') n += e.harga; }); return n; }
  function keputusanMenunggu() {
    var K = KEADAAN, a = alurKini(), d = [];
    if (a === 'survei' && K.penawaran && K.penawaran.status === 'menunggu') d.push('penawaran');
    if (a === 'timbang' && K.timbangan && K.timbangan.status === 'menunggu') d.push('timbang');
    if (a === 'titip' && K.struk && K.struk.status === 'menunggu') d.push('struk');
    if ((K.ekstra || []).some(function (e) { return e.status === 'menunggu'; })) d.push('ekstra');
    return d;
  }
  /* Status pesanan di basis data menurut alur dan tahap. */
  function statusAlur() {
    var a = alurKini(), t = KEADAAN.tahap;
    if (a === 'survei') return t >= 3 ? 'dijadwalkan' : t === 2 ? 'penawaran' : 'survei';
    if (a === 'timbang') return t >= 4 ? 'selesai' : t >= 1 ? 'jemput' : 'dijadwalkan';
    if (a === 'kontrak') return t >= 2 ? 'dijadwalkan' : 'proposal';
    if (a === 'titip') return t >= 4 ? 'selesai' : 'belanja';
    return t >= 4 ? 'selesai' : t >= 3 ? 'berjalan' : 'dijadwalkan';
  }
  function simpanAlurDB() {
    if (!pakaiDB() || !KEADAAN.orderDbId) return;
    var K = KEADAAN;
    EXO_DB.update('orders', K.orderDbId, { status: statusAlur(), exo: Object.assign({}, (EXO_DB.find('orders', K.orderDbId) || {}).exo || {},
      { alur: alurKini(), tahap: K.tahap, penawaran: K.penawaran, timbangan: K.timbangan, struk: K.struk, ekstra: K.ekstra, ekstraDisetujui: ekstraDisetujui() }) });
  }
  function addonsKini() { return D.ADDON_SETS[KEADAAN.jasa] || []; }
  function bulat(r) { return r >= 20000 ? Math.round(r / 1000) * 1000 : Math.round(r / 500) * 500; }
  function rateFor(j) { return bulat(jasaKini().rate * (j.factor || 1)); }
  function minRate() {
    var d = daftarJuru(); if (!d.length) return bulat(jasaKini().rate * D.MIN_FACTOR);
    var m = Infinity; for (var i = 0; i < d.length; i++) m = Math.min(m, rateFor(d[i])); return m;
  }
  function lineFor(rate) { return rate * KEADAAN.jam; }
  function addonTotal() {
    var n = 0, a = addonsKini();
    for (var i = 0; i < a.length; i++) if (KEADAAN.tambahan[a[i].id]) n += a[i].price;
    return n;
  }
  function addonCount() { var n = 0, a = addonsKini(); for (var i = 0; i < a.length; i++) if (KEADAAN.tambahan[a[i].id]) n++; return n; }
  function crewFee() { return KEADAAN.regu === 2 ? D.CREW_FEE : 0; }
  function subtotalN() { return lineFor(rateFor(juruKini())) + addonTotal() + crewFee(); }
  function voucherKini() {
    var p = terbitan().promos || {}, v = p[D.VOUCHER.code];
    return { code:D.VOUCHER.code, amount: v && v.amount != null ? v.amount : D.VOUCHER.amount, live: v ? v.live !== false : true, min:D.VOUCHER.min };
  }
  function voucherEligible() { return voucherKini().live && subtotalN() >= D.VOUCHER.min; }
  function voucherApplied() { return KEADAAN.voucher && voucherEligible(); }
  function totalN() { return subtotalN() + D.PLATFORM_FEE - (voucherApplied() ? voucherKini().amount : 0); }
  function qtyStep() { return D.STEP_QTY[jasaKini().unit] || 1; }
  /* Batas bawah mengikuti MIN_QTY per layanan (perawatan 4 jam, memasak 2 jam,
     paket gedung 6 bulan) sebelum jatuh ke aturan per unit. */
  function qtyMin()  { return D.MIN_QTY[KEADAAN.jasa] || (jasaKini().unit === '/hour' ? 2 : qtyStep()); }
  function qtyMax()  { var u = jasaKini().unit; return u === '/m²' ? 200 : u === '/kg' ? 30 : u === '/month' ? 24 : 8; }
  function qtyText(n) {
    var w = I.countWord(jasaKini().unit);
    if (KEADAAN.lang === 'en' && n === 1 && w.slice(-1) === 's' && w !== 'kg') w = w.slice(0, -1);
    return n + ' ' + w;
  }
  function layananDijeda(id) { var off = terbitan().svcOff || {}; return !!off[id]; }

  /* ======================================================= ZONA WAKTU
     Jam pesanan mengikuti KOTA ALAMAT, bukan jam ponsel yang membuka
     aplikasi. Pelanggan di Makassar memesan "09:00" berarti 09.00 WITA;
     mitra yang ponselnya masih WIB melihat "09:00 WITA · di ponsel Anda
     08:00", dan admin di Jakarta membaca jadwalnya berlabel WITA.

     Zona ditentukan dari provinsi alamat lewat js/zona.js (peta provinsi →
     WIB/WITA/WIT, termasuk Asia/Pontianak), lalu tebakan nama kota bila
     provinsinya tidak dikenali; negara ASEAN lain memakai zona negaranya.
     Yang DISIMPAN ke basis data: tanggal + jam dinding (kompatibel dengan
     aplikasi manajemen), objek wilayah (dipakai wa.js untuk melabeli jam),
     nama zona IANA, dan padanan UTC-nya. */
  var ZONA_NEGARA = { MY:'Asia/Kuala_Lumpur', SG:'Asia/Singapore', BN:'Asia/Brunei', TH:'Asia/Bangkok', VN:'Asia/Ho_Chi_Minh',
                      PH:'Asia/Manila', KH:'Asia/Phnom_Penh', LA:'Asia/Vientiane', MM:'Asia/Yangon', TL:'Asia/Dili' };
  function wilayahPesanan() {
    var a = KEADAAN.addr;
    return { negara: isoNegara() || 'ID', l1:a.provinsi || '', l2:a.kabkota || '', l3:a.kecamatan || '', l4:a.desa || '', kodePos:a.pos || '' };
  }
  function zonaPesanan() {
    var iso = isoNegara() || 'ID', a = KEADAAN.addr;
    if (!window.EXO_ZONA) return iso === 'ID' ? 'Asia/Jakarta' : (ZONA_NEGARA[iso] || 'Asia/Jakarta');
    if (iso !== 'ID') return ZONA_NEGARA[iso] || EXO_ZONA.perangkat();
    return EXO_ZONA.dariWilayah({ negara:'ID', l1:a.provinsi }) || EXO_ZONA.tebakDariKota(a.kabkota);
  }
  /* "WIB" / "WITA" / "WIT" (GMT+8 dsb. untuk luar Indonesia). */
  function labelZona(tz) { return window.EXO_ZONA ? EXO_ZONA.singkat(tz || zonaPesanan()) : 'WIB'; }
  function labelPerangkat() { return window.EXO_ZONA ? EXO_ZONA.singkat(EXO_ZONA.perangkat()) : ''; }
  /* Benar bila jam kota pesanan berbeda dari jam ponsel ini — saat itulah
     padanan "di ponsel Anda" perlu ditampilkan. */
  function zonaBeda() { return !!(window.EXO_ZONA && !EXO_ZONA.samaDenganPerangkat(zonaPesanan())); }
  function isoTgl(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  /* Jam dinding di sebuah zona → ISO UTC. Dua putaran cukup: putaran pertama
     menebak dengan offset 0, putaran kedua mengoreksi selisih dinding. */
  function keUTC(tgl, jam, tz) {
    var p = tgl.split('-'), q = String(jam || '00:00').split(':');
    var target = Date.UTC(+p[0], +p[1] - 1, +p[2], +q[0], +q[1] || 0), tebak = target;
    if (!window.EXO_ZONA) return new Date(target - 7 * 3600e3).toISOString();
    for (var k = 0; k < 2; k++) {
      var iso = new Date(tebak).toISOString();
      var w = (EXO_ZONA.tgl(iso, tz) + 'T' + EXO_ZONA.jam(iso, tz)).split(/[-T:]/);
      var dinding = Date.UTC(+w[0], +w[1] - 1, +w[2], +w[3] % 24, +w[4]);
      tebak += target - dinding;
    }
    return new Date(tebak).toISOString();
  }
  /* "HH:MM" sebuah cap waktu UTC dibaca di zona pesanan (atau zona lain). */
  function jamZona(iso, tz) {
    if (window.EXO_ZONA) return EXO_ZONA.jam(iso, tz || zonaPesanan()).replace(/^24:/, '00:');
    var d = new Date(iso); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  /* Jam dinding zona pesanan pada hari terpilih → jam yang sama di ponsel ini. */
  function jamPonsel(jam) {
    var d = new Date(keUTC(isoTgl(hariKe(KEADAAN.hari)), jam, zonaPesanan()));
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function mulaiUTC() { return keUTC(isoTgl(hariKe(KEADAAN.hari)), KEADAAN.mulai, zonaPesanan()); }
  function jamSelesai() {
    var jamMulai = parseInt(KEADAAN.mulai, 10), lama = jasaKini().unit === '/hour' ? Math.ceil(KEADAAN.jam / KEADAAN.regu) : 3;
    return ('0' + Math.min(23, jamMulai + lama)).slice(-2) + ':00';
  }
  /* Menit dari sekarang ke jam mulai, dihitung lewat UTC — sehingga aturan
     "4 jam sebelum mulai" benar di kota mana pun ponselnya berada. */
  function menitKeMulai() { return Math.round((new Date(mulaiUTC()).getTime() - Date.now()) / 60000); }
  function dalamKunci4Jam() { return menitKeMulai() < 240; }

  /* Tujuh hari ke depan mulai HARI INI MENURUT KOTA PESANAN — di Jayapura
     tanggal sudah berganti dua jam lebih awal daripada di Jakarta. */
  function hariKe(i) {
    var d;
    if (window.EXO_ZONA) { var p = EXO_ZONA.hariIni(zonaPesanan()).split('-'); d = new Date(+p[0], +p[1] - 1, +p[2] + i); }
    else { d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); }
    return d;
  }
  function ringkasSlot() {
    var d = hariKe(KEADAAN.hari);
    return I.dowShort(d) + ' ' + I.dayMonth(d) + ' · ' + KEADAAN.mulai + ' ' + labelZona() + ' · ' + qtyText(KEADAAN.jam) +
      (KEADAAN.regu === 2 ? ' · ' + I.t('crew2') : '');
  }
  function alamatKini() {
    for (var i = 0; i < D.ADDRESSES.length; i++) if (D.ADDRESSES[i].id === KEADAAN.alamat) return D.ADDRESSES[i];
    return D.ADDRESSES[0];
  }
  function sopMeta() { return D.SOP_META[KEADAAN.jasa] || D.SOP_META['default']; }
  function ppeComplete() { var p = sopMeta().ppe; for (var i = 0; i < p.length; i++) if (!KEADAAN.ppe[p[i]]) return false; return true; }
  function sopSelesai() { var n = 0; for (var k in KEADAAN.sopDone) if (KEADAAN.sopDone[k]) n++; return n; }
  function coverage() { var c = D.COVERAGE[KEADAAN.addr.kecamatan]; return c ? (c[KEADAAN.radius] || []) : []; }
  function addrFilled() {
    var a = KEADAAN.addr;
    for (var i = 0; i < D.ADDR_ORDER.length; i++) { var v = a[D.ADDR_ORDER[i]]; if (!v || v === '— pilih —') return false; }
    return true;
  }

  /* ================================================== WILAYAH SUNGGUHAN
     js/wilayah.js + data/wilayah/<iso>/ (Kepmendagri 300.2.2-2138/2025 untuk
     Indonesia: 38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa
     berikut kode posnya). Daftar contoh di exo-data.js hanya dipakai bila
     berkasnya tidak bisa dimuat. Kode wilayah (Kemendagri) ikut disimpan di
     KEADAAN.addrKode — yang disimpan kodenya, bukan namanya. */
  var ISO = { 'Indonesia':'ID','Malaysia':'MY','Singapura':'SG','Brunei Darussalam':'BN','Thailand':'TH','Vietnam':'VN','Filipina':'PH','Kamboja':'KH','Laos':'LA','Myanmar':'MM','Timor-Leste':'TL' };
  function isoNegara() { return ISO[KEADAAN.addr.negara] || null; }
  function wilayahSiap() { return !!(window.EXO_WILAYAH && EXO_WILAYAH.daftarL1); }
  function wilayahDaftar(level) {
    var a = KEADAAN.addr, iso = isoNegara(), W = D.WILAYAH, cadangan;
    if (level === 'negara') return W.negara;
    if (level === 'provinsi') cadangan = W.provinsi[a.negara] || [];
    else if (level === 'kabkota') cadangan = W.kabkota[a.provinsi] || [];
    else if (level === 'kecamatan') cadangan = W.kecamatan[a.kabkota] || [];
    else if (level === 'desa') cadangan = W.desa[a.kecamatan] || [];
    else cadangan = W.pos[a.desa] || [];
    if (!wilayahSiap() || !iso || !EXO_WILAYAH.punyaData(iso)) return cadangan;
    var nyata = level === 'provinsi' ? EXO_WILAYAH.daftarL1(iso)
      : level === 'kabkota' ? EXO_WILAYAH.daftarL2(iso, a.provinsi)
      : level === 'kecamatan' ? EXO_WILAYAH.daftarL3(iso, a.provinsi, a.kabkota)
      : level === 'desa' ? EXO_WILAYAH.daftarL4(iso, a.provinsi, a.kabkota, a.kecamatan)
      : (function () { var k = EXO_WILAYAH.kodePosDesa(iso, a.provinsi, a.kabkota, a.kecamatan, a.desa); return k ? [k] : []; })();
    return nyata && nyata.length ? nyata : cadangan;
  }
  var wilayahMuat = {};
  function wilayahSiapkan() {
    var iso = isoNegara(), a = KEADAAN.addr;
    if (!wilayahSiap() || !iso || !EXO_WILAYAH.punyaData(iso)) return;
    var kunci = iso + '|' + a.provinsi + '|' + a.kabkota;
    if (wilayahMuat[kunci]) return;
    wilayahMuat[kunci] = true;
    EXO_WILAYAH.siapkan({ negara:iso, l1:a.provinsi, l2:a.kabkota }).then(function () {
      var k = EXO_WILAYAH.kodePosDesa(iso, a.provinsi, a.kabkota, a.kecamatan, a.desa);
      if (k && !KEADAAN.addr.pos) KEADAAN.addr.pos = k;
      KEADAAN.addrKode = kodeWilayah();
      gambar();
    });
  }
  function kodeWilayah() {
    var iso = isoNegara(), a = KEADAAN.addr, hasil = { negara:iso };
    if (!wilayahSiap() || !iso) return hasil;
    try {
      var idx = EXO_WILAYAH.sumberData(iso);
      hasil.dasar = idx && idx.dasar;
    } catch (e) { /* abaikan */ }
    return hasil;
  }
  function sumberWilayah() {
    var iso = isoNegara();
    if (!wilayahSiap() || !iso || !EXO_WILAYAH.punyaData(iso)) return null;
    try { var s = EXO_WILAYAH.sumberData(iso); return s && s.dasar ? s : null; } catch (e) { return null; }
  }

  /* ================================================== POSISI MITRA
     Dari perangkat mitra lewat Geolocation. Disimpan di localStorage asal
     yang sama supaya layar pelacakan pelanggan DI PERANGKAT INI bisa
     menampilkannya — dan layar itu mengatakan persis begitu. Pelacakan
     lintas perangkat butuh server posisi; belum ada. */
  var KUNCI_POSISI = 'exoclean_posisi_mitra';
  function simpanPosisi(p) { try { localStorage.setItem(KUNCI_POSISI, JSON.stringify(p)); } catch (e) { /* abaikan */ } }
  function bacaPosisi() {
    try { var p = JSON.parse(localStorage.getItem(KUNCI_POSISI) || 'null'); return p && Date.now() - p.at < 10 * 60000 ? p : null; }
    catch (e) { return null; }
  }
  function hapusPosisi() { try { localStorage.removeItem(KUNCI_POSISI); } catch (e) { /* abaikan */ } }
  function jarakKe(titik) {
    var p = KEADAAN.posisi; if (!p || !window.EXO_UTIL || !EXO_UTIL.jarakMeter) return null;
    return EXO_UTIL.jarakMeter(p, titik);
  }
  function teksJarak(m) { return m == null ? '—' : m < 1000 ? m + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km'; }
  function menitTempuh(m) { return m == null ? null : Math.max(1, Math.round(m / 1000 / 25 * 60)); }   /* 25 km/jam lalu lintas kota */
  /* Posisi mitra yang berlaku untuk layar pelanggan: dari server dulu
     (lintas perangkat), baru dari perangkat yang sama. */
  function posisiMitra() {
    var s = KEADAAN.posisiServer;
    if (s && Date.now() - s.at < 10 * 60000) return Object.assign({ sumber:'server' }, s);
    var l = bacaPosisi();
    return l ? Object.assign({ sumber:'perangkat' }, l) : null;
  }

  /* ================================================== FOTO PETUGAS
     Diunggah mitra sendiri dari profilnya, dikecilkan ke 256 px, disimpan
     per id di localStorage (bukan di baris users — baris itu ikut disinkron
     ke server data dan tidak boleh membengkak karena foto). */
  var KUNCI_FOTO = 'exoclean_foto_mitra';
  function petaFoto() { try { return JSON.parse(localStorage.getItem(KUNCI_FOTO) || '{}') || {}; } catch (e) { return {}; } }
  function fotoMitra(id) { return id ? (petaFoto()[id] || null) : null; }
  function simpanFotoMitra(id, dataUrl) {
    var p = petaFoto(); if (dataUrl) p[id] = dataUrl; else delete p[id];
    try { localStorage.setItem(KUNCI_FOTO, JSON.stringify(p)); return true; } catch (e) { return false; }
  }
  function avJuru(j, ukuran, nada) {
    var f = j && fotoMitra(j.id);
    if (!f) return av(j ? j.initials : '—', ukuran, nada);
    return '<div class="av av-foto" style="--s:' + ukuran + 'px;background-image:url(' + f + ')" role="img" aria-label="' + esc(j.name) + '"></div>';
  }

  /* ================================================== TULIS KE BASIS DATA
     Hanya bila basis data EXOCLEAN ada di asal ini (pakaiDB()). Bentuk
     barisnya mengikuti BIZ.buatOrder / beriRating / ajukanKomplain di
     js/biz.js supaya index.html membacanya seperti order buatan sendiri.
     biz.js tidak dimuat di sini (membawa seluruh model manajemen), jadi
     barisnya disusun langsung — kalau bentuk di biz.js berubah, ubah di
     sini juga. */
  function pelangganDB() {
    if (!pakaiDB()) return null;
    if (KEADAAN.pelangganId && EXO_DB.find('users', KEADAAN.pelangganId)) return KEADAAN.pelangganId;
    var ada = EXO_DB.where('users', function (u) { return u.role === 'client' && (u.telp === '081288904417' || u.email === 'dewi.anggraini@gmail.com'); })[0];
    if (!ada) {
      ada = EXO_DB.insert('users', { role:'client', nama:'Dewi Anggraini', email:'dewi.anggraini@gmail.com', telp:'081288904417',
        alamat:alamatKini().full, tipe:'perorangan', sumber:'exo-app', aktif:true });
    }
    KEADAAN.pelangganId = ada.id;
    return ada.id;
  }
  function tulisOrderDB() {
    if (!pakaiDB()) return null;
    var j = juruKini(); if (!j.id || !EXO_DB.find('users', j.id)) return null;   /* roster contoh: tidak ada baris untuk ditulis */
    var tgl = isoTgl(hariKe(KEADAAN.hari)), selesai = jamSelesai(), tz = zonaPesanan();
    var o = EXO_DB.insert('orders', {
      no: (window.EXO_UTIL && EXO_UTIL.docNo) ? EXO_UTIL.docNo('ORD', EXO_DB.nextNo('order')) : 'EXO-' + Date.now(),
      clientId: pelangganDB(), quotationId:null,
      judul: I.svcName(KEADAAN.jasa) + ' · ' + qtyText(KEADAAN.jam) + ' · EXOCLEAN App',
      alamat: alamatKini().full, koordinat: alamatKini().point, wilayah: wilayahPesanan(),
      serviceIds:[], tgl:tgl, mulai:KEADAAN.mulai, selesai:selesai,
      /* jam dinding di atas berlaku di zona ini; padanan UTC-nya untuk pembanding lintas kota */
      zona: tz, mulaiUtc: keUTC(tgl, KEADAAN.mulai, tz), selesaiUtc: keUTC(tgl, selesai, tz),
      teamId:null, workerIds:[j.id], supervisorId:null,
      status: alurKini() === 'langsung' ? 'dijadwalkan' : alurKini() === 'survei' ? 'survei' : alurKini() === 'timbang' ? 'jemput' : alurKini() === 'kontrak' ? 'proposal' : 'belanja', nilai:totalN(), checklist:[],
      sumber:'exo-app', exo:{ alur:alurKini(), jasa:KEADAAN.jasa, jam:KEADAAN.jam, regu:KEADAAN.regu, tambahan:Object.keys(KEADAAN.tambahan).filter(function (k) { return KEADAAN.tambahan[k]; }), bayar:KEADAAN.bayar, voucher:voucherApplied() ? voucherKini().code : null, terkunci:true }
    });
    if (EXO_DB.log) EXO_DB.log(o.clientId, 'Memesan lewat EXOCLEAN App · ' + o.no, 'order', o.id);
    KEADAAN.orderDbId = o.id; KEADAAN.orderNo = o.no;
    return o;
  }
  function tulisRatingDB(bintang, komentar) {
    if (!pakaiDB() || !KEADAAN.orderDbId) return null;
    var ada = EXO_DB.where('ratings', function (r) { return r.orderId === KEADAAN.orderDbId; })[0];
    if (ada) return EXO_DB.update('ratings', ada.id, { bintang:bintang, komentar:komentar || '', at:EXO_UTIL.nowISO() });
    return EXO_DB.insert('ratings', { orderId:KEADAAN.orderDbId, clientId:pelangganDB(), bintang:bintang, komentar:komentar || '', at:EXO_UTIL.nowISO() });
  }
  function tulisKomplainDB(isi, fotoIds) {
    if (!pakaiDB() || !KEADAAN.orderDbId) return null;
    return EXO_DB.insert('complaints', { orderId:KEADAAN.orderDbId, clientId:pelangganDB(), status:'baru', isi:isi, photos:fotoIds || [], at:EXO_UTIL.nowISO(), reworkOrderId:null, sumber:'exo-app' });
  }

  /* ============================================================ PEMBANTU */
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ikon(isi, ukuran) {
    var u = ukuran || 18;
    return '<svg width="' + u + '" height="' + u + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">' + isi + '</svg>';
  }
  function garis(d, ukuran) { return ikon('<path d="' + d + '"/>', ukuran); }
  var IK = {
    kembali:'m15 18-6-6 6-6', kanan:'m9 18 6-6-6-6', bawah:'m6 9 6 6 6-6',
    kurang:'M5 12h14', tambah:'M12 5v14M5 12h14',
    perisai:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
    telepon:'M15.5 14.5 14 16a13 13 0 0 1-6-6l1.5-1.5-2-4.5H4a2 2 0 0 0-2 2 16 16 0 0 0 16 16 2 2 0 0 0 2-2v-3.5Z',
    obrol:'M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z',
    centang:'m5 13 4 4L19 7'
  };
  var IKON = {
    dompet:'<rect x="2" y="6" width="20" height="13" rx="4"/><path d="M17 12.5h.01"/>',
    lonceng:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
    cari:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    perisaiCentang:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    kalender:'<path d="M17 2v4M7 2v4M3 10h18"/><rect x="3" y="5" width="18" height="16" rx="4"/>',
    hp:'<rect x="5" y="2" width="14" height="20" rx="4"/><path d="M11 18h2"/>',
    gembok:'<rect x="4" y="10" width="16" height="11" rx="4"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    kirim:'<path d="M4 12h15M13 6l6 6-6 6"/>'
  };

  function aksi(nama, arg) {
    return ' data-aksi="' + nama + '"' + (arg === undefined ? '' : ' data-arg="' + esc(arg) + '"');
  }
  function kelas(dasar, nyala) { return dasar + (nyala ? ' on' : ''); }
  function av(inisial, ukuran, nada) {
    return '<div class="av' + (nada ? ' av-' + nada : '') + '" style="--s:' + ukuran + 'px">' + esc(inisial) + '</div>';
  }
  function tombolKembali(tujuan, aksiNama) {
    return '<button class="btn btn-icon btn-secondary btn-soft"' + aksi(aksiNama || 'ke', tujuan) +
           ' aria-label="Back">' + garis(IK.kembali) + '</button>';
  }
  function kepala(judul, sub, tujuanKembali, ekstra) {
    return '<div class="hdr">' + (tujuanKembali ? tombolKembali(tujuanKembali) : '') +
      '<div class="hdr-txt"><div class="hdr-title">' + judul + '</div>' +
      (sub ? '<div class="hdr-sub">' + sub + '</div>' : '') + '</div>' + (ekstra || '') + '</div>';
  }
  function langkah(n) {
    var h = '<div class="steps">';
    for (var i = 1; i <= 3; i++) h += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    return h + '</div>';
  }
  function labelBagian(t) { return '<div class="sec-label">' + t + '</div>'; }
  function merek(tinggiMark, tinggiWord) {
    var b = EXO_BRAND.baca();
    return '<div class="brand"><img src="' + esc(b.markSrc) + '" data-brand="mark" alt="" style="height:' + tinggiMark + 'px">' +
      '<div class="stack gap-4"><img src="' + esc(b.wordSrc) + '" data-brand="word" alt="' + esc(b.appName) + '" style="height:' + tinggiWord + 'px">' +
      '<div class="brand-tag">We clean all purpose</div></div></div>';
  }
  function logoMark(tinggi, gaya) {
    return '<img src="' + esc(EXO_BRAND.baca().markSrc) + '" data-brand="mark" alt="" style="height:' + tinggi + 'px;width:auto;display:block;' + (gaya || '') + '">';
  }
  function pinDots(isi, kecil) {
    var h = '<div class="pindots' + (kecil ? ' sm' : '') + '">';
    for (var i = 0; i < 6; i++) h += '<i class="' + (i < isi.length ? 'on' : '') + '"></i>';
    return h + '</div>';
  }
  function keypad(aksiNama, kecil) {
    var k = ['1','2','3','4','5','6','7','8','9','','0','⌫'], h = '<div class="keypad' + (kecil ? ' sm' : '') + '">';
    for (var i = 0; i < k.length; i++) {
      h += k[i] ? '<button' + aksi(aksiNama, k[i]) + ' aria-label="' + k[i] + '">' + k[i] + '</button>' : '<button disabled></button>';
    }
    return h + '</div>';
  }
  function petaHTML(titik, judul) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return '<div class="tanpa-sinyal">Map needs a connection.<br>Everything below keeps working offline.</div>';
    }
    return '<iframe class="bingkai" referrerpolicy="no-referrer-when-downgrade" title="' + esc(judul || 'Map') + '" ' +
           'src="https://maps.google.com/maps?q=' + titik.lat + ',' + titik.lng + '&z=16&output=embed"></iframe>';
  }
  /* Jam "sekarang" MENURUT KOTA PESANAN — dipakai cap obrolan, kedatangan
     mitra, dan foto SOP, supaya semuanya satu zona dengan jadwalnya. */
  function jamSekarang() { return jamZona(new Date().toISOString()); }

  /* ======================================================= PESAN SEKILAS */
  var jamSekilas = null;
  function sekilas(teks, nada) {
    KEADAAN.sekilas = { teks:teks, nada:nada || 'ok' };
    if (jamSekilas) clearTimeout(jamSekilas);
    jamSekilas = setTimeout(function () { KEADAAN.sekilas = null; gambar(); }, 3200);
  }

  /* =============================================================== FOTO
     Lampiran foto (klaim, SOP, laporan) dikecilkan lalu disimpan di
     IndexedDB lewat FOTO — bukan di localStorage yang sudah dipakai basis
     data aplikasi lain di asal yang sama. */
  function ambilFoto(berkas, tujuan) {
    if (!berkas) return;
    var kompres = window.EXO_UTIL && EXO_UTIL.compressImage
      ? EXO_UTIL.compressImage(berkas, 1280, 0.72)
      : new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = gagal; r.readAsDataURL(berkas); });
    kompres.then(function (dataUrl) {
      var id = 'exofoto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var rekam = { id:id, url:dataUrl, jam:jamSekarang() };
      if (window.EXO_FOTO) EXO_FOTO.simpan(id, dataUrl);
      ExoApp.AKSI.fotoMasuk(tujuan, rekam);
      gambar();
    }).catch(function () { sekilas('That file is not an image we can read.', 'err'); gambar(); });
  }

  /* ============================================================== GAMBAR */
  var akar = null, lapis = null, layarTerakhir = null, lembarTergambar = null;
  var LAYAR = {}, LEMBAR = {}, AKSI = {};

  function catatFokus() {
    var el = document.activeElement;
    if (!el || !el.id || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT')) return null;
    var p = null; try { p = el.selectionStart; } catch (e) { /* tanpa kursor */ }
    return { id:el.id, posisi:p };
  }
  function kembalikanFokus(f) {
    if (!f) return;
    var el = document.getElementById(f.id); if (!el) return;
    el.focus();
    if (f.posisi === null || f.posisi === undefined) return;
    try { el.setSelectionRange(f.posisi, f.posisi); } catch (e) { /* abaikan */ }
  }
  /* Layar netral dipakai kedua sisi dan tidak boleh mengubah sisi — tanpa
     ini, mitra yang membuka Ketentuan lalu kembali mendarat di profil
     PELANGGAN. */
  var LAYAR_NETRAL = ['profile', 'terms', 'lang'];
  function selaraskanSisi() {
    var l = KEADAAN.layar;
    if (LAYAR_NETRAL.indexOf(l) >= 0) return;
    KEADAAN.sisi = D.PARTNER_SCREENS.indexOf(l) >= 0 ? 'partner' : 'customer';
  }
  function bilahTab() {
    if (D.TAB_SCREENS.indexOf(KEADAAN.layar) < 0) return '';
    var mitra = KEADAAN.sisi === 'partner', daftar = mitra ? D.TABS_PARTNER : D.TABS_CUSTOMER;
    var h = '<nav class="tabbar">';
    for (var i = 0; i < daftar.length; i++) {
      var t = daftar[i], on = KEADAAN.layar === t.id;
      h += '<button class="' + (on ? 'on' : '') + '"' + aksi('ke', t.id) + (on ? ' aria-current="page"' : '') + '>' +
           '<span class="tab-ic">' + garis(t.d, 20) + '</span>' +
           '<span class="tab-lbl">' + esc(mitra ? t.label : I.t(t.key)) + '</span></button>';
    }
    return h + '</nav>';
  }
  function bilahLompat() {
    var el = document.getElementById('exo-lompat'); if (!el) return;
    var h = '';
    function deret(daftar) {
      for (var i = 0; i < daftar.length; i++) {
        h += '<button class="' + (KEADAAN.layar === daftar[i][0] ? 'on' : '') + '"' + aksi('lompat', daftar[i][0]) + '>' + esc(daftar[i][1]) + '</button>';
      }
    }
    deret(D.JUMP_CUSTOMER); h += '<span class="sep"></span>'; deret(D.JUMP_PARTNER);
    el.innerHTML = h;
  }
  /* ============================================== PENERJEMAH PASCA-RENDER
     Setelah HTML layar terpasang, setiap simpul teks, placeholder, dan
     aria-label dicocokkan dengan kamus STR (berkunci teks Inggris). Dengan
     begitu teks yang lahir dari data — ketentuan layanan, notifikasi,
     riwayat dompet, catatan tahap — ikut berbahasa tanpa membungkus tiap
     baris dengan tx(). Hanya jalan bila bahasanya bukan Inggris, dan hanya
     di sisi pelanggan; sisi mitra sengaja Bahasa Indonesia (rancangan). */
  var POLA_ANGKA = /^(\d[\d.,]*)\s+(.+)$/;
  function terjemahTeks(t) {
    var e = I.STR[t];
    if (e && e[KEADAAN.lang]) return e[KEADAAN.lang];
    var m = POLA_ANGKA.exec(t);                       /* "3 visits" → "3 kunjungan" */
    if (m) { var f = I.STR[m[2]]; if (f && f[KEADAAN.lang]) return m[1] + ' ' + f[KEADAAN.lang]; }
    return null;
  }
  function terjemahkanDOM(root) {
    if (!root || KEADAAN.lang === 'en' || KEADAAN.sisi === 'partner') return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var simpul = [], n;
    while ((n = walker.nextNode())) simpul.push(n);
    for (var i = 0; i < simpul.length; i++) {
      var s = simpul[i].nodeValue, inti = s.trim();
      if (inti.length < 2 || simpul[i].parentNode.tagName === 'SCRIPT') continue;
      var hasil = terjemahTeks(inti);
      if (hasil !== null) simpul[i].nodeValue = s.replace(inti, hasil);
    }
    var atr = ['placeholder', 'aria-label', 'title'];
    var els = root.querySelectorAll('[placeholder],[aria-label],[title]');
    for (var j = 0; j < els.length; j++) {
      for (var a = 0; a < atr.length; a++) {
        var v = els[j].getAttribute(atr[a]); if (!v) continue;
        var h2 = terjemahTeks(v.trim()); if (h2 !== null) els[j].setAttribute(atr[a], h2);
      }
    }
  }

  function gambar() {
    if (!akar) return;
    selaraskanSisi();
    I.set(KEADAAN.lang);
    var fokus = catatFokus(), gulir = akar.scrollTop, pindah = layarTerakhir !== KEADAAN.layar;
    var buat = LAYAR[KEADAAN.layar] || LAYAR.home;
    akar.setAttribute('dir', I.isRtl() ? 'rtl' : 'ltr');
    akar.setAttribute('lang', KEADAAN.lang);
    akar.innerHTML = buat() + bilahTab();
    akar.setAttribute('data-layar', KEADAAN.layar);

    var atas = '';
    if (KEADAAN.lembar && LEMBAR[KEADAAN.lembar]) atas += LEMBAR[KEADAAN.lembar]();
    if (KEADAAN.sekilas) atas += '<div class="toast ' + KEADAAN.sekilas.nada + '" role="status">' + esc(KEADAAN.sekilas.teks) + '</div>';
    lapis.innerHTML = atas;
    lembarTergambar = KEADAAN.lembar;
    terjemahkanDOM(akar); terjemahkanDOM(lapis);

    akar.scrollTop = pindah ? 0 : gulir;
    layarTerakhir = KEADAAN.layar;
    kembalikanFokus(fokus);
    if (KEADAAN.lembar === 'obrol') { var b = lapis.querySelector('.sheet-body'); if (b) b.scrollTop = b.scrollHeight; }
    bilahLompat();
    EXO_BRAND.terapkan();
    document.title = EXO_BRAND.baca().appName + ' — ' + (KEADAAN.sisi === 'partner' ? 'Partner' : 'App');
    /* Kait sesudah gambar: widget pihak ketiga (captcha), pemantauan posisi. */
    var hooks = ExoApp && ExoApp.hooks ? ExoApp.hooks : [];
    for (var hk = 0; hk < hooks.length; hk++) { try { hooks[hk](); } catch (e) { /* satu kait gagal tidak boleh menjatuhkan layar */ } }
  }

  function tekan(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-aksi]') : null;
    if (!t || t.disabled) return;
    if (t.getAttribute('data-aksi') === 'tutupLembar' && ev.target.closest('[data-diam]') && !ev.target.closest('button')) return;
    var fn = AKSI[t.getAttribute('data-aksi')];
    if (!fn) return;
    if (t.tagName !== 'LABEL') ev.preventDefault();
    fn(t.getAttribute('data-arg'));
    gambar();
  }

  function pasang(el, elLapis) {
    akar = el; lapis = elLapis;
    EXO_BRAND.terapkan();
    akar.addEventListener('click', tekan);
    lapis.addEventListener('click', tekan);

    function ketik(ev) {
      var el = ev.target; if (!el.getAttribute) return;
      var kunci = el.getAttribute('data-simpan'); if (!kunci) return;
      var p = kunci.split('.');
      if (p.length === 2) KEADAAN[p[0]][p[1]] = el.value; else KEADAAN[kunci] = el.value;
      if (el.getAttribute('data-gambar')) gambar();
    }
    akar.addEventListener('input', ketik);
    lapis.addEventListener('input', ketik);
    akar.addEventListener('change', function (ev) {
      var el = ev.target; if (!el.getAttribute) return;
      if (el.getAttribute('data-foto')) { ambilFoto(el.files && el.files[0], el.getAttribute('data-foto')); return; }
      var ubah = el.getAttribute('data-ubah');
      if (ubah && AKSI[ubah]) { AKSI[ubah](el.getAttribute('data-arg'), el.value); gambar(); }
    });
    lapis.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' || ev.target.id !== 'exo-pesan') return;
      ev.preventDefault(); AKSI.kirimPesan(); gambar();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || !KEADAAN.lembar) return;
      KEADAAN.lembar = null; gambar();
    });
    KEADAAN.posisi = bacaPosisi();
    wilayahSiapkan();
    gambar();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* file:// atau ditolak — tetap jalan, hanya tidak luring */ });
    }
  }

  return {
    D:D, I:I, KEADAAN:KEADAAN, LAYAR:LAYAR, LEMBAR:LEMBAR, AKSI:AKSI,
    pakaiDB:pakaiDB, daftarJuru:daftarJuru, juruKini:juruKini, namaDepan:namaDepan, JURU_KOSONG:JURU_KOSONG,
    jasaKini:jasaKini, addonsKini:addonsKini, rateFor:rateFor, minRate:minRate, lineFor:lineFor, bulat:bulat,
    addonTotal:addonTotal, addonCount:addonCount, crewFee:crewFee, subtotalN:subtotalN, totalN:totalN,
    voucherKini:voucherKini, voucherEligible:voucherEligible, voucherApplied:voucherApplied,
    qtyStep:qtyStep, qtyMin:qtyMin, qtyMax:qtyMax, qtyText:qtyText, layananDijeda:layananDijeda, terbitan:terbitan,
    hariKe:hariKe, ringkasSlot:ringkasSlot, alamatKini:alamatKini,
    alurKini:alurKini, alurMeta:alurMeta, tahapAlur:tahapAlur, tagihanSekarang:tagihanSekarang, ekstraDisetujui:ekstraDisetujui, keputusanMenunggu:keputusanMenunggu, statusAlur:statusAlur, simpanAlurDB:simpanAlurDB,
    zonaPesanan:zonaPesanan, labelZona:labelZona, labelPerangkat:labelPerangkat, zonaBeda:zonaBeda, jamZona:jamZona, jamPonsel:jamPonsel,
    keUTC:keUTC, mulaiUTC:mulaiUTC, jamSelesai:jamSelesai, menitKeMulai:menitKeMulai, dalamKunci4Jam:dalamKunci4Jam, wilayahPesanan:wilayahPesanan, sopMeta:sopMeta, ppeComplete:ppeComplete, sopSelesai:sopSelesai,
    coverage:coverage, addrFilled:addrFilled,
    isoNegara:isoNegara, wilayahSiap:wilayahSiap, wilayahDaftar:wilayahDaftar, wilayahSiapkan:wilayahSiapkan, sumberWilayah:sumberWilayah, kodeWilayah:kodeWilayah,
    simpanPosisi:simpanPosisi, bacaPosisi:bacaPosisi, hapusPosisi:hapusPosisi, jarakKe:jarakKe, teksJarak:teksJarak, menitTempuh:menitTempuh, posisiMitra:posisiMitra,
    fotoMitra:fotoMitra, simpanFotoMitra:simpanFotoMitra, avJuru:avJuru,
    pelangganDB:pelangganDB, tulisOrderDB:tulisOrderDB, tulisRatingDB:tulisRatingDB, tulisKomplainDB:tulisKomplainDB,
    hooks:[],
    rp:rp, esc:esc, ikon:ikon, garis:garis, IK:IK, IKON:IKON, aksi:aksi, kelas:kelas, av:av,
    tombolKembali:tombolKembali, kepala:kepala, langkah:langkah, labelBagian:labelBagian, merek:merek, logoMark:logoMark,
    pinDots:pinDots, keypad:keypad, petaHTML:petaHTML, jamSekarang:jamSekarang, sekilas:sekilas,
    lembarBaru:function () { return lembarTergambar !== KEADAAN.lembar; },
    gambar:gambar, pasang:pasang
  };
})();
