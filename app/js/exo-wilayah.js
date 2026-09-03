/* ==========================================================================
   exo-wilayah.js — alamat terstruktur berjenjang
   --------------------------------------------------------------------------
   Negara → Provinsi → Kota/Kabupaten → Kecamatan → Desa/Kelurahan → Kode pos
   → Alamat lengkap (jalan, nomor, patokan).

   KENAPA TIDAK SEMUA WILAYAH DUNIA DITANAM DI SINI
   Basis data administratif dunia berisi jutaan baris dan berubah terus —
   kabupaten dimekarkan, kelurahan digabung, kode pos ditambah. Menanamnya di
   berkas JavaScript berarti aplikasi membawa puluhan megabyte yang sudah usang
   sejak hari pertama.

   Maka yang ditanam hanyalah dua lapis teratas: DAFTAR NEGARA lengkap (jarang
   berubah) dan wilayah tingkat pertama untuk negara-negara yang benar-benar
   dilayani. Lapis di bawahnya diisi dengan mengetik, dan bila backend
   pengiriman tersambung, ia dicarikan dari sumber resmi — Biteship sudah
   menyediakannya untuk Indonesia lewat KIRIM.cariArea().

   PENTING: struktur datanya SATU untuk semua negara. Yang berbeda hanya
   ISTILAHNYA — "provinsi" di Indonesia, "state" di Amerika, "prefecture" di
   Jepang. Menyimpan bentuk data yang berbeda per negara membuat setiap
   laporan dan setiap pencarian harus tahu negara mana yang sedang dibaca.
   ========================================================================== */
var EXO_WILAYAH = (function () {
  /* Milik EXOCLEAN App (3 Sep 2026): pembantu teks, pengurut, dan simpanan
     setelan negara yang dilayani ada di sini, bukan dari modul aplikasi lain. */
  var I18N = { t: function (s) { return s; } };
  var U = { esc: EXO_UTIL.esc, sortBy: EXO_UTIL.sortBy };
  var DB = { get raw() { EXO_DB.init(); return EXO_DB.raw; }, save: function () { EXO_DB.save(true); } };

  /* ================================================================ NEGARA
     Kode ISO 3166-1 alfa-2, nama Inggris (bahasa bawaan aplikasi), kode
     telepon, dan bendera. Diurutkan menurut nama saat ditampilkan. */
  var NEGARA = [
    ['ID', 'Indonesia', '62', '🇮🇩'], ['MY', 'Malaysia', '60', '🇲🇾'],
    ['SG', 'Singapore', '65', '🇸🇬'], ['TH', 'Thailand', '66', '🇹🇭'],
    ['VN', 'Vietnam', '84', '🇻🇳'], ['PH', 'Philippines', '63', '🇵🇭'],
    ['BN', 'Brunei', '673', '🇧🇳'], ['KH', 'Cambodia', '855', '🇰🇭'],
    ['LA', 'Laos', '856', '🇱🇦'], ['MM', 'Myanmar', '95', '🇲🇲'],
    ['TL', 'Timor-Leste', '670', '🇹🇱'],
    ['CN', 'China', '86', '🇨🇳'], ['HK', 'Hong Kong', '852', '🇭🇰'],
    ['TW', 'Taiwan', '886', '🇹🇼'], ['JP', 'Japan', '81', '🇯🇵'],
    ['KR', 'South Korea', '82', '🇰🇷'], ['IN', 'India', '91', '🇮🇳'],
    ['PK', 'Pakistan', '92', '🇵🇰'], ['BD', 'Bangladesh', '880', '🇧🇩'],
    ['LK', 'Sri Lanka', '94', '🇱🇰'], ['NP', 'Nepal', '977', '🇳🇵'],
    ['AU', 'Australia', '61', '🇦🇺'], ['NZ', 'New Zealand', '64', '🇳🇿'],
    ['PG', 'Papua New Guinea', '675', '🇵🇬'], ['FJ', 'Fiji', '679', '🇫🇯'],
    ['AE', 'United Arab Emirates', '971', '🇦🇪'], ['SA', 'Saudi Arabia', '966', '🇸🇦'],
    ['QA', 'Qatar', '974', '🇶🇦'], ['KW', 'Kuwait', '965', '🇰🇼'],
    ['BH', 'Bahrain', '973', '🇧🇭'], ['OM', 'Oman', '968', '🇴🇲'],
    ['JO', 'Jordan', '962', '🇯🇴'], ['LB', 'Lebanon', '961', '🇱🇧'],
    ['IL', 'Israel', '972', '🇮🇱'], ['TR', 'Turkey', '90', '🇹🇷'],
    ['IR', 'Iran', '98', '🇮🇷'], ['IQ', 'Iraq', '964', '🇮🇶'],
    ['EG', 'Egypt', '20', '🇪🇬'], ['MA', 'Morocco', '212', '🇲🇦'],
    ['DZ', 'Algeria', '213', '🇩🇿'], ['TN', 'Tunisia', '216', '🇹🇳'],
    ['NG', 'Nigeria', '234', '🇳🇬'], ['GH', 'Ghana', '233', '🇬🇭'],
    ['KE', 'Kenya', '254', '🇰🇪'], ['TZ', 'Tanzania', '255', '🇹🇿'],
    ['UG', 'Uganda', '256', '🇺🇬'], ['ET', 'Ethiopia', '251', '🇪🇹'],
    ['ZA', 'South Africa', '27', '🇿🇦'], ['SN', 'Senegal', '221', '🇸🇳'],
    ['CI', "Côte d'Ivoire", '225', '🇨🇮'], ['CM', 'Cameroon', '237', '🇨🇲'],
    ['GB', 'United Kingdom', '44', '🇬🇧'], ['IE', 'Ireland', '353', '🇮🇪'],
    ['FR', 'France', '33', '🇫🇷'], ['DE', 'Germany', '49', '🇩🇪'],
    ['NL', 'Netherlands', '31', '🇳🇱'], ['BE', 'Belgium', '32', '🇧🇪'],
    ['LU', 'Luxembourg', '352', '🇱🇺'], ['CH', 'Switzerland', '41', '🇨🇭'],
    ['AT', 'Austria', '43', '🇦🇹'], ['IT', 'Italy', '39', '🇮🇹'],
    ['ES', 'Spain', '34', '🇪🇸'], ['PT', 'Portugal', '351', '🇵🇹'],
    ['GR', 'Greece', '30', '🇬🇷'], ['PL', 'Poland', '48', '🇵🇱'],
    ['CZ', 'Czechia', '420', '🇨🇿'], ['SK', 'Slovakia', '421', '🇸🇰'],
    ['HU', 'Hungary', '36', '🇭🇺'], ['RO', 'Romania', '40', '🇷🇴'],
    ['BG', 'Bulgaria', '359', '🇧🇬'], ['HR', 'Croatia', '385', '🇭🇷'],
    ['RS', 'Serbia', '381', '🇷🇸'], ['SI', 'Slovenia', '386', '🇸🇮'],
    ['SE', 'Sweden', '46', '🇸🇪'], ['NO', 'Norway', '47', '🇳🇴'],
    ['DK', 'Denmark', '45', '🇩🇰'], ['FI', 'Finland', '358', '🇫🇮'],
    ['IS', 'Iceland', '354', '🇮🇸'], ['EE', 'Estonia', '372', '🇪🇪'],
    ['LV', 'Latvia', '371', '🇱🇻'], ['LT', 'Lithuania', '370', '🇱🇹'],
    ['RU', 'Russia', '7', '🇷🇺'], ['UA', 'Ukraine', '380', '🇺🇦'],
    ['BY', 'Belarus', '375', '🇧🇾'], ['KZ', 'Kazakhstan', '7', '🇰🇿'],
    ['UZ', 'Uzbekistan', '998', '🇺🇿'], ['AZ', 'Azerbaijan', '994', '🇦🇿'],
    ['GE', 'Georgia', '995', '🇬🇪'], ['AM', 'Armenia', '374', '🇦🇲'],
    ['US', 'United States', '1', '🇺🇸'], ['CA', 'Canada', '1', '🇨🇦'],
    ['MX', 'Mexico', '52', '🇲🇽'], ['GT', 'Guatemala', '502', '🇬🇹'],
    ['CR', 'Costa Rica', '506', '🇨🇷'], ['PA', 'Panama', '507', '🇵🇦'],
    ['CU', 'Cuba', '53', '🇨🇺'], ['DO', 'Dominican Republic', '1', '🇩🇴'],
    ['BR', 'Brazil', '55', '🇧🇷'], ['AR', 'Argentina', '54', '🇦🇷'],
    ['CL', 'Chile', '56', '🇨🇱'], ['CO', 'Colombia', '57', '🇨🇴'],
    ['PE', 'Peru', '51', '🇵🇪'], ['EC', 'Ecuador', '593', '🇪🇨'],
    ['VE', 'Venezuela', '58', '🇻🇪'], ['UY', 'Uruguay', '598', '🇺🇾'],
    ['PY', 'Paraguay', '595', '🇵🇾'], ['BO', 'Bolivia', '591', '🇧🇴']
  ].map(function (n) {
    return { kode: n[0], nama: n[1], telp: n[2], bendera: n[3] };
  });

  /* ================================================================ ISTILAH
     Nama tingkatan berbeda di tiap negara. Yang disimpan tetap satu bentuk;
     yang berubah hanya LABEL di layar — supaya orang Jepang tidak diminta
     mengisi "provinsi" dan orang Amerika tidak diminta mengisi "kelurahan". */
  var ISTILAH_BAWAAN = {
    l1: 'State / Province', l2: 'City / Regency',
    l3: 'District', l4: 'Village / Subdistrict', pos: 'Postal code'
  };

  var ISTILAH = {
    ID: { l1: 'Provinsi', l2: 'Kota / Kabupaten', l3: 'Kecamatan',
          l4: 'Desa / Kelurahan', pos: 'Kode pos' },
    MY: { l1: 'Negeri', l2: 'Daerah', l3: 'Mukim', l4: 'Kampung / Taman', pos: 'Poskod' },
    SG: { l1: 'Region', l2: 'Planning area', l3: 'Subzone', l4: 'Estate', pos: 'Postal code' },
    US: { l1: 'State', l2: 'County', l3: 'City', l4: 'Neighborhood', pos: 'ZIP code' },
    CA: { l1: 'Province / Territory', l2: 'Census division', l3: 'City', l4: 'Neighbourhood', pos: 'Postal code' },
    GB: { l1: 'Country / Region', l2: 'County', l3: 'Town / City', l4: 'Locality', pos: 'Postcode' },
    JP: { l1: 'Prefecture', l2: 'City / Ward', l3: 'Town', l4: 'District', pos: 'Postal code' },
    KR: { l1: 'Province / Metropolitan city', l2: 'City / County', l3: 'Town', l4: 'Neighbourhood', pos: 'Postal code' },
    CN: { l1: 'Province', l2: 'Prefecture / City', l3: 'District / County', l4: 'Township', pos: 'Postal code' },
    IN: { l1: 'State / UT', l2: 'District', l3: 'Taluk / Tehsil', l4: 'Village / Locality', pos: 'PIN code' },
    PH: { l1: 'Region', l2: 'Province / City', l3: 'Municipality', l4: 'Barangay', pos: 'ZIP code' },
    TH: { l1: 'Province', l2: 'District', l3: 'Subdistrict', l4: 'Village', pos: 'Postal code' },
    VN: { l1: 'Province', l2: 'District', l3: 'Ward', l4: 'Hamlet', pos: 'Postal code' },
    AU: { l1: 'State / Territory', l2: 'Local government area', l3: 'Suburb', l4: 'Locality', pos: 'Postcode' },
    DE: { l1: 'Bundesland', l2: 'Kreis', l3: 'Stadt / Gemeinde', l4: 'Ortsteil', pos: 'PLZ' },
    FR: { l1: 'Région', l2: 'Département', l3: 'Commune', l4: 'Quartier', pos: 'Code postal' },
    NL: { l1: 'Provincie', l2: 'Gemeente', l3: 'Plaats', l4: 'Wijk', pos: 'Postcode' },
    ES: { l1: 'Comunidad autónoma', l2: 'Provincia', l3: 'Municipio', l4: 'Barrio', pos: 'Código postal' },
    IT: { l1: 'Regione', l2: 'Provincia', l3: 'Comune', l4: 'Frazione', pos: 'CAP' },
    BR: { l1: 'Estado', l2: 'Município', l3: 'Distrito', l4: 'Bairro', pos: 'CEP' },
    MX: { l1: 'Estado', l2: 'Municipio', l3: 'Localidad', l4: 'Colonia', pos: 'Código postal' },
    SA: { l1: 'Region', l2: 'Governorate', l3: 'City', l4: 'District', pos: 'Postal code' },
    AE: { l1: 'Emirate', l2: 'City', l3: 'Area', l4: 'Community', pos: 'PO Box' },
    ZA: { l1: 'Province', l2: 'District', l3: 'Municipality', l4: 'Suburb', pos: 'Postal code' },
    RU: { l1: 'Federal subject', l2: 'District', l3: 'City', l4: 'Locality', pos: 'Postal code' }
  };

  function istilah(kodeNegara) {
    return Object.assign({}, ISTILAH_BAWAAN, ISTILAH[kodeNegara] || {});
  }

  /* ================================================================ TINGKAT 1
     Hanya untuk negara yang datanya benar-benar dipakai. Sisanya diketik —
     dan itu jauh lebih jujur daripada menyodorkan daftar setengah jadi yang
     membuat orang mengira wilayahnya tidak didukung. */
  var L1 = {
    ID: ['Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
      'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung', 'DKI Jakarta',
      'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Bali',
      'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
      'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara',
      'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan',
      'Sulawesi Tenggara', 'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat',
      'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan'],
    MY: ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak',
      'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
      'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'],
    SG: ['Central', 'East', 'North', 'North-East', 'West'],
    US: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
      'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
      'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana',
      'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
      'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
    AU: ['Australian Capital Territory', 'New South Wales', 'Northern Territory',
      'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
    CA: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
      'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut',
      'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
    GB: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    AE: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'],
    PH: ['NCR', 'CAR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'MIMAROPA',
      'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X',
      'Region XI', 'Region XII', 'Caraga', 'BARMM']
  };

  /* Kota/kabupaten utama — hanya untuk wilayah yang paling sering dilayani.
     Daftar ini SENGAJA tidak lengkap, dan kolomnya tetap bisa diketik bebas. */
  var L2 = {
    'ID|DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan',
      'Jakarta Timur', 'Kepulauan Seribu'],
    'ID|Jawa Barat': ['Bandung', 'Kota Bandung', 'Bekasi', 'Kota Bekasi', 'Bogor', 'Kota Bogor',
      'Depok', 'Cimahi', 'Cirebon', 'Kota Cirebon', 'Sukabumi', 'Karawang', 'Purwakarta',
      'Garut', 'Tasikmalaya', 'Subang', 'Indramayu', 'Cianjur', 'Sumedang', 'Majalengka',
      'Kuningan', 'Ciamis', 'Banjar', 'Pangandaran'],
    'ID|Banten': ['Tangerang', 'Kota Tangerang', 'Tangerang Selatan', 'Serang', 'Kota Serang',
      'Cilegon', 'Lebak', 'Pandeglang'],
    'ID|Jawa Tengah': ['Semarang', 'Kota Semarang', 'Solo (Surakarta)', 'Magelang',
      'Kota Magelang', 'Pekalongan', 'Tegal', 'Salatiga', 'Kudus', 'Jepara', 'Banyumas',
      'Purwokerto', 'Cilacap', 'Klaten', 'Boyolali', 'Sukoharjo', 'Karanganyar'],
    'ID|DI Yogyakarta': ['Kota Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo', 'Gunungkidul'],
    'ID|Jawa Timur': ['Surabaya', 'Malang', 'Kota Malang', 'Sidoarjo', 'Gresik', 'Mojokerto',
      'Pasuruan', 'Probolinggo', 'Kediri', 'Blitar', 'Madiun', 'Jember', 'Banyuwangi',
      'Batu', 'Lamongan', 'Tuban', 'Bojonegoro', 'Jombang'],
    'ID|Bali': ['Denpasar', 'Badung', 'Gianyar', 'Tabanan', 'Buleleng', 'Klungkung',
      'Bangli', 'Karangasem', 'Jembrana'],
    'ID|Sumatera Utara': ['Medan', 'Deli Serdang', 'Binjai', 'Pematangsiantar', 'Tebing Tinggi',
      'Sibolga', 'Tanjungbalai', 'Padangsidimpuan', 'Gunungsitoli'],
    'ID|Sumatera Selatan': ['Palembang', 'Prabumulih', 'Lubuklinggau', 'Pagar Alam',
      'Banyuasin', 'Ogan Ilir'],
    'ID|Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang', 'Kutai Kartanegara',
      'Penajam Paser Utara'],
    'ID|Sulawesi Selatan': ['Makassar', 'Parepare', 'Palopo', 'Gowa', 'Maros', 'Bone'],
    'MY|Selangor': ['Petaling', 'Klang', 'Gombak', 'Hulu Langat', 'Sepang', 'Kuala Selangor'],
    'MY|W.P. Kuala Lumpur': ['Kuala Lumpur'],
    'SG|Central': ['Downtown Core', 'Orchard', 'Novena', 'Bukit Timah', 'Toa Payoh']
  };

  function negara(kode) {
    return NEGARA.filter(function (n) { return n.kode === kode; })[0] || null;
  }

  /* ==================================================== NEGARA YANG DILAYANI
     Daftar NEGARA di atas adalah RUJUKAN — nama, kode telepon, bendera —
     bukan daftar yang pantas disodorkan di formulir alamat. Dari 130 itu,
     hanya 57 yang punya data wilayah; 73 sisanya berujung pada ketik manual.

     Yang tersimpan adalah pilihan PEMASANGAN INI, bukan bawaan yang dipatok
     di kode: satu pemasangan MCS melayani Indonesia saja, yang lain mungkin
     melayani kawasan. Kosong berarti belum ditentukan, dan yang belum
     ditentukan memakai BAWAAN_DILAYANI. */

  /* ASEAN. Sepuluh di antaranya punya data wilayah; Singapura tidak, dan itu
     memang benar — Singapura tidak berprovinsi, jadi alamatnya diketik. */
  var BAWAAN_DILAYANI = ['ID', 'MY', 'SG', 'TH', 'VN', 'PH', 'BN', 'KH',
    'LA', 'MM', 'TL'];

  function konfigNegara() {
    var s = DB.raw.settings || (DB.raw.settings = {});
    if (!s.wilayah) s.wilayah = {};
    return s.wilayah;
  }

  /** Kode negara yang dilayani pemasangan ini. Selalu berisi. */
  function dilayani() {
    var c = konfigNegara();
    /* Kode yang tidak dikenali dibuang, bukan dibiarkan: satu salah ketik
       di setelan akan menjadi pilihan kosong yang tidak bisa dijelaskan. */
    var pilih = (c.negara || []).filter(function (k) { return !!negara(k); });
    return pilih.length ? pilih.slice() : BAWAAN_DILAYANI.slice();
  }

  /**
   * Simpan daftar negara yang dilayani.
   * Daftar KOSONG mengembalikannya ke bawaan — bukan menghilangkan seluruh
   * pilihan, yang akan membuat formulir alamat tidak bisa diisi sama sekali.
   */
  function simpanDilayani(daftar) {
    var bersih = (daftar || []).map(function (k) { return String(k).toUpperCase(); })
      .filter(function (k, i, a) { return !!negara(k) && a.indexOf(k) === i; });
    konfigNegara().negara = bersih;
    DB.save(true);
    return dilayani();
  }

  /**
   * Negara untuk kolom pilihan.
   *
   * @param {string} [terpakai] kode yang SUDAH tersimpan pada alamat yang
   *   sedang dibuka. Ia selalu ikut, walau tidak lagi dilayani — kalau tidak,
   *   membuka alamat lama lalu menekan Simpan akan diam-diam mengganti
   *   negaranya, dan tidak ada yang bersuara.
   */
  function daftarNegara(terpakai) {
    var boleh = dilayani();
    if (terpakai && boleh.indexOf(terpakai) < 0 && negara(terpakai)) {
      boleh.push(terpakai);
    }
    var pilihan = boleh.map(negara).filter(Boolean);
    return U.sortBy(pilihan, function (n) { return n.nama; });
  }

  /* Negara yang PUNYA data wilayah terstruktur di data/wilayah/.

     PETUNJUK saja, bukan aturan: yang tidak ada di sini tetap boleh dipilih,
     alamatnya cukup diketik manual — dan itu memang jalur yang sudah ada.
     Daftar ini diturunkan dari isi folder data/wilayah/, jadi ia BISA basi
     bila folder itu bertambah atau berkurang. Basi pun akibatnya hanya satu
     penanda yang keliru di layar setelan, bukan perilaku yang salah. */
  var PUNYA_DATA = [
    'AE', 'AT', 'BE', 'BG', 'BH', 'BN', 'BY', 'CH', 'CZ', 'DE',
    'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'ID',
    'IE', 'IL', 'IQ', 'IR', 'IS', 'IT', 'JO', 'JP', 'KH', 'KR',
    'KW', 'LA', 'LB', 'LT', 'LU', 'LV', 'MM', 'MY', 'NL', 'NO',
    'OM', 'PH', 'PL', 'PT', 'QA', 'RO', 'RS', 'RU', 'SA', 'SE',
    'SI', 'SK', 'TH', 'TL', 'TR', 'UA', 'VN'
  ];
  function punyaData(kode) { return PUNYA_DATA.indexOf(kode) >= 0; }

  /** Seluruh negara rujukan — untuk layar setelan, bukan untuk formulir alamat. */
  function semuaNegara() {
    return U.sortBy(NEGARA.slice(), function (n) { return n.nama; });
  }
  /* ============================================================ DATA RESMI
     Indonesia punya 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan
     83.762 desa/kelurahan lengkap dengan kode posnya. Angka sebanyak itu
     tidak ditulis di dalam berkas ini — ia disusun oleh
     app/tools/build-wilayah.js dari data Kemendagri (Kepmendagri No.
     300.2.2-2138 Tahun 2025) dan disimpan di data/wilayah/id/.

     Dimuat bertahap, bukan sekaligus:
       index.json      22 KB   sekali saat dibutuhkan — provinsi + kab/kota
       <kode>.json    ~4 KB    saat kab/kota dipilih — kecamatan + desa + pos

     Seluruh Indonesia berukuran 2 MB. Memaksa ponsel mengunduhnya hanya
     untuk memilih satu kelurahan adalah biaya yang ditanggung pengguna,
     bukan kita. */

  var DASAR_DATA = 'data/wilayah/';

  /* Cache seumur halaman, DIPISAH PER NEGARA. Kunci gabungan seperti
     'jp/0-24' dipakai supaya wilayah dari dua negara tidak pernah saling
     tertukar hanya karena nomor berkasnya kebetulan sama. */
  var simpanan = { index: {}, l2: {}, kab: {} };
  var sedang = {};

  function ambilJSON(jalur) {
    if (sedang[jalur]) return sedang[jalur];
    sedang[jalur] = fetch(DASAR_DATA + jalur).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) {
      /* Gagal memuat BUKAN alasan untuk menghentikan pengisian alamat:
         kolomnya tetap bisa diketik, dan itu lebih baik daripada pengguna
         terjebak di formulir yang tidak bisa dilanjutkan. */
      delete sedang[jalur];
      console.warn('[wilayah] gagal memuat ' + jalur + ' — kolom dialihkan ke ketik manual:', e.message);
      return null;
    });
    return sedang[jalur];
  }

  function dir(kodeNegara) { return String(kodeNegara || '').toLowerCase() + '/'; }

  /** Muat indeks sebuah negara. Aman dipanggil berkali-kali. */
  function muatIndex(kodeNegara) {
    if (!kodeNegara) return Promise.resolve(null);
    if (simpanan.index[kodeNegara]) return Promise.resolve(simpanan.index[kodeNegara]);
    return ambilJSON(dir(kodeNegara) + 'index.json').then(function (j) {
      if (j) simpanan.index[kodeNegara] = j;
      return j;
    });
  }

  /**
   * Muat daftar tingkat-2 sebuah wilayah tingkat-1.
   *
   * Sebagian besar negara menyimpannya langsung di dalam index; hanya negara
   * bertingkat-dua raksasa (Rusia, Rumania) yang dipecah agar indexnya tidak
   * ratusan kilobyte. Bendera "pisah" pada index yang menentukan.
   */
  function muatL2(kodeNegara, kodeL1) {
    var idx = simpanan.index[kodeNegara];
    if (!idx || !idx.pisah || kodeL1 == null) return Promise.resolve(null);
    var kunci = kodeNegara + '/' + kodeL1;
    if (simpanan.l2[kunci]) return Promise.resolve(simpanan.l2[kunci]);
    return ambilJSON(dir(kodeNegara) + 'l1-' + kodeL1 + '.json').then(function (j) {
      if (j) simpanan.l2[kunci] = j;
      return j;
    });
  }

  /** Muat rincian (tingkat 3 & 4) sebuah wilayah tingkat-2. */
  function muatKab(kodeNegara, berkas) {
    if (!berkas) return Promise.resolve(null);
    var kunci = kodeNegara + '/' + berkas;
    if (simpanan.kab[kunci]) return Promise.resolve(simpanan.kab[kunci]);
    return ambilJSON(dir(kodeNegara) + berkas + '.json').then(function (j) {
      if (j) simpanan.kab[kunci] = j;
      return j;
    });
  }

  /* ---------------------------------------------------- pencari di cache */

  function provRec(kodeNegara, nama) {
    var idx = simpanan.index[kodeNegara];
    if (!idx) return null;
    return idx.prov.filter(function (p) { return p.n === nama; })[0] || null;
  }

  /** Daftar tingkat-2 sebuah provinsi, dari index atau dari berkas pecahan. */
  function kabList(kodeNegara, namaL1) {
    var p = provRec(kodeNegara, namaL1);
    if (!p) return null;
    if (p.kab) return p.kab;
    var pecah = simpanan.l2[kodeNegara + '/' + p.k];
    return pecah ? pecah.kab : null;
  }

  function kabRec(kodeNegara, namaL1, namaL2) {
    var list = kabList(kodeNegara, namaL1);
    if (!list) return null;
    return list.filter(function (x) { return x.n === namaL2; })[0] || null;
  }

  function detail(kodeNegara, namaL1, namaL2) {
    var k = kabRec(kodeNegara, namaL1, namaL2);
    return (k && k.f) ? simpanan.kab[kodeNegara + '/' + k.f] || null : null;
  }

  function kecRec(kodeNegara, namaL1, namaL2, namaL3) {
    var d = detail(kodeNegara, namaL1, namaL2);
    if (!d || !d.kec) return null;
    return d.kec.filter(function (x) { return x.n === namaL3; })[0] || null;
  }

  /**
   * Siapkan seluruh data yang dibutuhkan sebuah alamat, lalu panggilan
   * daftarL* berikutnya sudah bisa menjawab tanpa menunggu.
   */
  function siapkan(a) {
    a = a || {};
    var neg = a.negara;
    if (!neg) return Promise.resolve(false);
    return muatIndex(neg).then(function () {
      var p = provRec(neg, a.l1);
      return p ? muatL2(neg, p.k) : null;
    }).then(function () {
      var k = kabRec(neg, a.l1, a.l2);
      return (k && k.f) ? muatKab(neg, k.f) : null;
    }).then(function () { return true; });
  }

  /* ------------------------------------------------ daftar per tingkat
     Semuanya SINKRON: menjawab dari cache, tidak pernah menunggu. Yang
     mengurus penungguan adalah pasang() dan siapkan(), supaya fields()
     tetap bisa dipakai untuk menggambar formulir dalam satu tarikan. */

  function daftarL1(kodeNegara) {
    var idx = simpanan.index[kodeNegara];
    if (idx) return idx.prov.map(function (p) { return p.n; });
    /* Daftar bawaan dipakai selagi berkasnya belum tiba — dan tetap dipakai
       untuk negara yang memang tidak punya berkas (mis. Singapura). */
    return (L1[kodeNegara] || []).slice();
  }

  function daftarL2(kodeNegara, l1) {
    var list = kabList(kodeNegara, l1);
    if (list) return list.map(function (k) { return k.n; });
    return (L2[kodeNegara + '|' + l1] || []).slice();
  }

  function daftarL3(kodeNegara, l1, l2) {
    var d = detail(kodeNegara, l1, l2);
    return (d && d.kec) ? d.kec.map(function (k) { return k.n; }) : [];
  }

  function daftarL4(kodeNegara, l1, l2, l3) {
    var k = kecRec(kodeNegara, l1, l2, l3);
    return (k && k.d) ? k.d.map(function (x) { return x[0]; }) : [];
  }

  /**
   * Kode pos untuk alamat sejauh yang sudah dipilih.
   *
   * Dicari dari tingkat TERDALAM ke atas: negara berbeda menaruh kode pos
   * pada tingkat yang berbeda — Indonesia di kelurahan, Malaysia di kota,
   * Jepang di machi. Yang dikembalikan hanya kode yang PASTI: bila satu
   * wilayah punya banyak kode pos, mengisikan salah satunya secara sepihak
   * lebih berbahaya daripada membiarkan kolomnya kosong.
   */
  function kodePosDesa(kodeNegara, l1, l2, l3, l4) {
    var kec = kecRec(kodeNegara, l1, l2, l3);
    if (kec && l4 && kec.d) {
      var d = kec.d.filter(function (x) { return x[0] === l4; })[0];
      if (d && d[1]) return d[1];
    }
    if (kec && kec.pos) return kec.pos;
    var kab = kabRec(kodeNegara, l1, l2);
    if (kab && kab.pos) return kab.pos;
    /* Negara berjenjang satu — Islandia, Serbia, Slovenia — menaruh kode
       posnya di tingkat teratas, karena di sana itulah tingkat terdalamnya. */
    var p = provRec(kodeNegara, l1);
    if (p && p.pos) return p.pos;
    return '';
  }

  /** Apakah tingkat ini punya daftar pilihan, atau harus diketik. */
  function punyaDaftar(tingkat, kodeNegara, l1, l2, l3) {
    if (tingkat === 1) return daftarL1(kodeNegara).length > 0;
    if (tingkat === 2) return daftarL2(kodeNegara, l1).length > 0;
    if (tingkat === 3) return daftarL3(kodeNegara, l1, l2).length > 0;
    if (tingkat === 4) return daftarL4(kodeNegara, l1, l2, l3).length > 0;
    return false;
  }

  /** Keterangan sumber data sebuah negara, untuk ditampilkan di formulir. */
  function sumberData(kodeNegara) {
    var idx = simpanan.index[kodeNegara];
    if (!idx) return null;
    return { dasar: idx.dasar, jumlah: idx.jumlah,
      tanpaKodePos: idx.tanpaKodePos === true, catatan: idx.catatan || null };
  }

  /* ================================================================ BENTUK ALAMAT */
  function kosong(kodeNegara) {
    return { negara: kodeNegara || 'ID', l1: '', l2: '', l3: '', l4: '',
             kodePos: '', jalan: '', patokan: '' };
  }

  /**
   * Rangkai alamat menjadi satu baris yang bisa dibaca kurir.
   * Urutannya dari yang paling khusus ke paling umum — itulah urutan yang
   * dipakai amplop pos di hampir semua negara, dan itu pula yang dipahami
   * pengemudi ketika membaca sekilas.
   */
  /**
   * Nama resmi Kemendagri untuk ditampilkan pada label kirim.
   *
   * Yang DISIMPAN selalu nama resmi lengkap — itu yang bisa ditelusuri ke
   * daftar pemerintah dan dicocokkan dengan sistem kurir. Yang DICETAK
   * diringkas, karena "Kota Administrasi Jakarta Selatan, Daerah Khusus
   * Ibukota Jakarta" pada satu baris alamat hanya memakan tempat tanpa
   * menambah kejelasan bagi kurir yang membacanya.
   */
  var RINGKASAN = [
    [/^Daerah Khusus Ibukota Jakarta$/i, 'DKI Jakarta'],
    [/^Daerah Khusus Jakarta$/i, 'DKI Jakarta'],
    [/^Daerah Istimewa Yogyakarta$/i, 'DI Yogyakarta'],
    [/^Kota Administrasi /i, ''],
    /* Satu-satunya di Indonesia: Kabupaten Administrasi Kepulauan Seribu.
       Awalannya dibuang seluruhnya — namanya sudah memuat "Kepulauan". */
    [/^Kabupaten Administrasi /i, ''],
    [/^Kabupaten /i, 'Kab. ']
  ];
  function pendek(nama) {
    var s = String(nama || '');
    for (var i = 0; i < RINGKASAN.length; i++) {
      if (RINGKASAN[i][0].test(s)) return s.replace(RINGKASAN[i][0], RINGKASAN[i][1]).trim();
    }
    return s;
  }

  function teks(a, opsi) {
    if (!a) return '';
    opsi = opsi || {};
    var n = negara(a.negara);
    var resmi = opsi.namaResmi === true;
    var rapikan = function (x) { return resmi ? x : pendek(x); };
    var bagian = [a.jalan, a.l4, a.l3, rapikan(a.l2), rapikan(a.l1)].filter(function (x) {
      return x && String(x).trim(); });
    var s = bagian.join(', ');
    if (a.kodePos) s += ' ' + a.kodePos;
    if (n && (opsi.denganNegara !== false)) s += ', ' + n.nama;
    if (a.patokan && opsi.denganPatokan) s += ' (' + a.patokan + ')';
    return s.trim();
  }

  /**
   * Ringkas untuk kartu dan daftar — tanpa jalan, hanya wilayahnya.
   *
   * Provinsi DIBUANG bila namanya sudah termuat di dalam nama kotanya.
   * “Kota Bandar Lampung, Lampung”, “Kota Bengkulu, Bengkulu”, “Kota Jambi,
   * Jambi” — separuh keduanya tidak menambahkan apa pun, hanya memakan
   * tempat pada baris yang justru sedang diperjuangkan supaya muat. Delapan
   * provinsi Indonesia bernama sama dengan ibukotanya.
   *
   * Syaratnya sengaja sempit — nama provinsi harus benar-benar TERMUAT di
   * dalam nama kotanya, bukan sekadar mirip. “Kota Batam, Kepulauan Riau”
   * tetap utuh karena Batam bukan Riau, dan “Jakarta Pusat, DKI Jakarta”
   * tetap utuh karena keduanya memang dua tingkat yang berbeda.
   */
  function ringkas(a) {
    if (!a) return '—';
    var kota = pendek(a.l2);
    var prov = pendek(a.l1);
    if (kota && prov) {
      /* Dibandingkan pada INTI namanya: “Kota Bengkulu” berinti “Bengkulu”. */
      var inti = kota.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '');
      if (inti.toLowerCase().indexOf(prov.toLowerCase()) >= 0) prov = '';
    }
    var bagian = [kota, prov].filter(Boolean);
    var n = negara(a.negara);
    if (n && n.kode !== 'ID') bagian.push(n.nama);
    return bagian.join(', ') || (n ? n.nama : '—');
  }

  /**
   * Periksa kelengkapan. Yang WAJIB hanya negara, tingkat 1, kota, dan alamat
   * jalan — tiga sisanya berbeda-beda keberadaannya antar negara, dan memaksa
   * mengisinya akan menghalangi orang yang wilayahnya memang tidak punya
   * tingkatan itu.
   */
  /**
   * @param opsi.wajib  false = alamat boleh dikosongkan SELURUHNYA.
   *
   * Yang tidak pernah diperbolehkan adalah setengah terisi: alamat dengan
   * provinsi tetapi tanpa kota tidak bisa dipakai menghitung ongkos, tidak
   * bisa dicari, dan tidak bisa dikirimi apa pun. Kosong jujur; separuh
   * menipu.
   */
  function periksa(a, opsi) {
    if (opsi && opsi.wajib === false && !terisi(a)) return null;
    if (!a || !a.negara) return 'Pilih negara lebih dulu.';
    var ist = istilah(a.negara);
    if (!String(a.l1 || '').trim()) return ist.l1 + ' wajib diisi.';
    if (!String(a.l2 || '').trim()) return ist.l2 + ' wajib diisi.';
    if (!String(a.jalan || '').trim()) return 'Alamat lengkap (jalan & nomor) wajib diisi.';
    if (a.kodePos && !/^[A-Za-z0-9][A-Za-z0-9 \-]{2,9}$/.test(String(a.kodePos).trim())) {
      return 'Kode pos tidak terlihat sah.';
    }
    return null;
  }

  /**
   * Terjemahkan alamat lama yang hanya berupa satu baris teks.
   * Data lama tidak boleh hilang hanya karena bentuk barunya lebih rapi;
   * yang tidak diketahui dibiarkan kosong dan bisa dilengkapi kapan saja.
   */
  /**
   * Urai alamat lama satu baris menjadi kolom.
   *
   * Yang bisa dipastikan hanyalah kode pos; sisanya masuk ke kolom jalan
   * untuk dirapikan pemiliknya sendiri. Tetapi ekor yang jelas-jelas BUKAN
   * bagian dari nama jalan dipangkas: kode pos di ujung, dan nama kota atau
   * provinsi yang nanti muncul lagi dari kolom wilayahnya. Tanpa ini alamat
   * hasil simpanan berbunyi "Jl. Sudirman, Jakarta Selatan, Tebet, Jakarta
   * Selatan" — dan yang membacanya menyangka datanya rusak.
   *
   * Ekor dibuang hanya bila ia BENAR-BENAR nama wilayah yang dikenal, bukan
   * ditebak dari panjang atau letak koma: "Jl. Melati, Blok C2" tidak boleh
   * kehilangan nomor bloknya.
   */
  function dariTeksLama(baris, kodeNegara) {
    var a = kosong(kodeNegara || 'ID');
    var s = String(baris || '').trim();
    var m = s.match(/\b(\d{5})\b/);
    if (m) {
      a.kodePos = m[1];
      s = s.replace(/,?\s*\b\d{5}\b\s*$/, '').trim();
    }
    var bagian = s.split(',');
    while (bagian.length > 1) {
      var ekor = bagian[bagian.length - 1].trim();
      if (!ekor || !namaWilayahDikenal(a.negara, ekor)) break;
      bagian.pop();
    }
    a.jalan = bagian.join(',').replace(/,\s*$/, '').trim();
    return a;
  }

  /**
   * Apakah teks ini nama provinsi atau kota di negara tersebut?
   *
   * Dibandingkan lewat pendek() supaya "Jakarta Selatan" cocok dengan
   * "Kota Administrasi Jakarta Selatan" — alamat lama ditulis manusia, bukan
   * disalin dari daftar resmi.
   */
  function namaWilayahDikenal(kodeNegara, teks) {
    var n = pendek(String(teks || '')).toLowerCase();
    if (!n) return false;
    var l1 = daftarL1(kodeNegara) || [];
    for (var i = 0; i < l1.length; i++) {
      if (pendek(l1[i]).toLowerCase() === n) return true;
      var l2 = daftarL2(kodeNegara, l1[i]) || [];
      for (var j = 0; j < l2.length; j++) {
        if (pendek(l2[j]).toLowerCase() === n) return true;
      }
    }
    return false;
  }

  /** Apakah sebuah alamat sudah berbentuk terstruktur. */
  /**
   * Apakah alamatnya benar-benar diisi?
   *
   * Negara SELALU punya nilai — ia terpilih sendiri sejak formulir dibuka —
   * jadi ia tidak boleh dihitung sebagai isian. Tanpa pengecualian ini,
   * formulir yang tidak disentuh sama sekali akan terbaca 'terisi sebagian'
   * dan menolak disimpan.
   */
  function terisi(a) {
    if (!a) return false;
    return ['l1', 'l2', 'l3', 'l4', 'jalan', 'kodePos', 'patokan'].some(function (k) {
      return String(a[k] || '').trim();
    });
  }

  function terstruktur(a) {
    return !!(a && a.negara && (a.l1 || a.l2));
  }

  /* ================================================================ FORMULIR
     Dibuat di sini supaya seluruh tempat yang meminta alamat — profil klien,
     alamat kirim, alamat toko mitra, alamat tinggal pegawai — memakai bentuk
     dan urutan yang persis sama. */
  function fields(a, opsi) {
    opsi = opsi || {};
    a = a || kosong();
    var pre = opsi.prefix || '';
    var ist = istilah(a.negara);
    /* Sebagian formulir memang boleh dikosongkan seluruhnya — admin yang
       mendaftarkan korporat dari kontrak belum tentu memegang alamatnya, dan
       memaksa mengisi hanya menghasilkan alamat karangan yang lebih buruk
       daripada kolom kosong. Yang WAJIB tetap wajib begitu satu kolom pun
       disentuh; itu diurus periksa(). */
    var wajib = opsi.wajib !== false;

    /**
     * Susun pilihan satu tingkat, dengan nilai tersimpan selalu ikut serta.
     *
     * Alamat lama memakai nama pendek — "DKI Jakarta", "Bandung" — sedangkan
     * daftar resmi Kemendagri menulis "Daerah Khusus Ibukota Jakarta" dan
     * "Kota Bandung". Bila nilai lama tidak diikutkan, peramban membuang
     * nilai yang tidak ada di antara <option> tanpa memberi tahu siapa pun,
     * dan alamat pengguna terhapus hanya karena formulirnya dibuka.
     *
     * Maka nilai lama tetap ditampilkan dan ditandai, bukan dihilangkan.
     */
    function pilihan(daftar, label, nilaiTersimpan) {
      if (!daftar.length) return null;
      var opsi = [{ value: '', label: '— ' + label + ' —' }]
        .concat(daftar.map(function (x) { return { value: x, label: x }; }));
      if (nilaiTersimpan && daftar.indexOf(nilaiTersimpan) < 0) {
        opsi.push({ value: nilaiTersimpan,
          label: nilaiTersimpan + ' — ' + I18N.t('data lama') });
      }
      return opsi;
    }

    function pilihanL1() { return pilihan(daftarL1(a.negara), ist.l1, a.l1); }
    function pilihanL2() { return pilihan(daftarL2(a.negara, a.l1), ist.l2, a.l2); }
    function pilihanL3() { return pilihan(daftarL3(a.negara, a.l1, a.l2), ist.l3, a.l3); }
    function pilihanL4() { return pilihan(daftarL4(a.negara, a.l1, a.l2, a.l3), ist.l4, a.l4); }

    var l1Opsi = pilihanL1(), l2Opsi = pilihanL2();
    var l3Opsi = pilihanL3(), l4Opsi = pilihanL4();

    return [
      /* KUNCINYA BAHASA INDONESIA, seperti seluruh basis kode ini.

         Ketiga label alamat di berkas ini sempat memakai kunci Inggris —
         'Country', 'Full address', 'Landmark' — sementara kamus menyimpan
         padanannya di bawah kunci Indonesia ('Negara', 'Alamat lengkap',
         'Patokan'). Akibatnya I18N.t() tidak menemukan apa-apa dan
         mengembalikan kuncinya apa adanya: formulir alamat berbahasa
         Indonesia menampilkan “Country” dan “Full address” di antara
         “Provinsi” dan “Kode pos”. Dalam bahasa Inggris kebetulan benar,
         dan itulah sebabnya ia bertahan lama. */
      { name: pre + 'negara', label: I18N.t('Negara'), type: 'select', value: a.negara,
        /* a.negara diteruskan supaya negara yang SUDAH tersimpan tetap bisa
           dipilih walau tidak lagi dilayani — lihat daftarNegara(). */
        options: daftarNegara(a.negara).map(function (n) {
          return { value: n.kode, label: n.bendera + '  ' + n.nama }; }) },

      l1Opsi
        ? { name: pre + 'l1', label: ist.l1, type: 'select', value: a.l1, options: l1Opsi }
        : { name: pre + 'l1', label: ist.l1, value: a.l1, required: wajib },

      l2Opsi
        ? { name: pre + 'l2', label: ist.l2, type: 'select', value: a.l2, options: l2Opsi }
        : { name: pre + 'l2', label: ist.l2, value: a.l2, required: wajib },

      l3Opsi
        ? { name: pre + 'l3', label: ist.l3, type: 'select', value: a.l3, options: l3Opsi }
        : { name: pre + 'l3', label: ist.l3, value: a.l3 },

      l4Opsi
        ? { name: pre + 'l4', label: ist.l4, type: 'select', value: a.l4, options: l4Opsi }
        : { name: pre + 'l4', label: ist.l4, value: a.l4 },

      /* Kode pos terisi sendiri dari desa/kelurahan yang dipilih, tetapi
         TETAP boleh disunting: perumahan baru kadang memakai kode pos yang
         belum masuk daftar resmi, dan mengunci kolomnya berarti memaksa
         penghuninya menulis alamat yang salah. */
      { name: pre + 'kodePos', label: ist.pos, value: a.kodePos,
        /* Sumbernya disebut, bukan disembunyikan: pengguna yang melihat nama
           wilayahnya salah tulis perlu tahu daftar mana yang sedang dipakai
           supaya bisa melaporkannya ke tempat yang benar. */
        hint: (function () {
          var s = sumberData(a.negara);
          if (!s) return null;
          if (s.tanpaKodePos) {
            return I18N.t('Kode pos diisi sendiri — daftar resmi untuk negara ini belum tersedia.') +
              ' ' + s.dasar;
          }
          return I18N.t('Kode pos terisi otomatis dari wilayah yang dipilih.') + ' ' + s.dasar;
        })() },

      { name: pre + 'jalan', label: I18N.t('Alamat lengkap'), type: 'textarea', rows: 2,
        value: a.jalan, required: wajib,
        hint: I18N.t('Street, building number, floor, unit.') },
      { name: pre + 'patokan', label: I18N.t('Patokan'), value: a.patokan,
        hint: I18N.t('Helps the crew and courier find the place faster.') }
    ];
  }

  /** Baca kembali hasil formulir menjadi objek alamat. */
  function dariForm(d, prefix) {
    var pre = prefix || '';
    return {
      negara: d[pre + 'negara'] || 'ID',
      l1: String(d[pre + 'l1'] || '').trim(),
      l2: String(d[pre + 'l2'] || '').trim(),
      l3: String(d[pre + 'l3'] || '').trim(),
      l4: String(d[pre + 'l4'] || '').trim(),
      kodePos: String(d[pre + 'kodePos'] || '').trim(),
      jalan: String(d[pre + 'jalan'] || '').trim(),
      patokan: String(d[pre + 'patokan'] || '').trim()
    };
  }

  /**
   * Pasang perilaku berjenjang pada formulir yang sedang terbuka: mengganti
   * negara menyusun ulang label dan pilihan di bawahnya, dan mengganti
   * provinsi menyusun ulang daftar kotanya.
   *
   * Nilai di bawahnya SENGAJA dikosongkan saat induknya berubah. Membiarkannya
   * berarti menyimpan "Jakarta Selatan, Selangor, Malaysia" — alamat yang
   * tidak pernah ada dan baru ketahuan salah ketika paketnya tidak sampai.
   */
  function pasang(root, prefix) {
    var pre = prefix || '';
    function el(n) { return root.querySelector('#f_' + pre + n); }

    function gambarUlangLabel() {
      var kode = el('negara').value;
      var ist = istilah(kode);
      [['l1', ist.l1], ['l2', ist.l2], ['l3', ist.l3], ['l4', ist.l4],
       ['kodePos', ist.pos]].forEach(function (p) {
        var lab = root.querySelector('label[for="f_' + pre + p[0] + '"]');
        if (lab) lab.innerHTML = U.esc(p[1]) +
          (p[0] === 'l1' || p[0] === 'l2' ? ' <span class="req">*</span>' : '');
      });
      gambarUlangSumber(kode);
    }

    /**
     * Keterangan sumber data ikut berganti bersama negaranya.
     *
     * Tanpa ini, keterangannya tetap milik negara yang tergambar pertama kali:
     * pengguna yang memilih Jepang membaca bahwa alamatnya bersumber dari
     * Kepmendagri Indonesia — keliru, dan justru merusak kepercayaan yang
     * hendak dibangun dengan menyebut sumbernya.
     */
    function gambarUlangSumber(kode) {
      var pos = el('kodePos');
      if (!pos) return;
      var bidang = pos.closest ? pos.closest('.field') : null;
      if (!bidang) return;
      var s = sumberData(kode);
      var teksHint = s
        ? (s.tanpaKodePos
            ? I18N.t('Kode pos diisi sendiri — daftar resmi untuk negara ini belum tersedia.')
            : I18N.t('Kode pos terisi otomatis dari wilayah yang dipilih.')) + ' ' + s.dasar
        : '';
      var hint = bidang.querySelector('.hint');
      if (!teksHint) { if (hint) hint.remove(); return; }
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'hint';
        bidang.appendChild(hint);
      }
      hint.textContent = teksHint;
    }

    /**
     * Ganti sebuah kolom menjadi select (bila ada daftar) atau input teks.
     * Isi daftar boleh berupa teks polos atau { v: nilai, t: tampilan } —
     * bentuk kedua dipakai untuk menandai nilai lama yang tidak ada pada
     * daftar resmi tanpa mengubah nilai yang tersimpan.
     */
    function jadikan(nama, daftar, label) {
      var lama = el(nama);
      if (!lama) return;
      var baru;
      if (daftar && daftar.length) {
        baru = document.createElement('select');
        baru.className = 'select';
        baru.innerHTML = '<option value="">— ' + U.esc(label) + ' —</option>' +
          daftar.map(function (x) {
            var v = (x && x.v !== undefined) ? x.v : x;
            var tampil = (x && x.t !== undefined) ? x.t : x;
            return '<option value="' + U.esc(v) + '">' + U.esc(tampil) + '</option>';
          }).join('');
      } else {
        baru = document.createElement('input');
        baru.className = 'input';
        baru.type = 'text';
      }
      baru.id = lama.id; baru.name = lama.name;
      lama.parentNode.replaceChild(baru, lama);
      return baru;
    }

    /** Kolom sementara saat datanya sedang diambil. */
    function tunggu(nama) {
      var lama = el(nama);
      if (!lama) return;
      var s = document.createElement('select');
      s.className = 'select';
      s.disabled = true;
      /* `value=""` WAJIB, bukan kerapian. <option> tanpa atribut value
         mengembalikan TEKSNYA sendiri ketika dibaca, jadi formulir yang
         disimpan selagi daftar ini belum tiba menyimpan alamat berbunyi
         “Jl. Basuki Rahmat No. 12, Memuat…, Kab. Sorong” — permanen, dan
         tidak ada yang gagal ketika itu terjadi. `disabled` tidak menolong:
         ia hanya membuat kolomnya dilewati saat <form> dikirim, sedangkan
         yang membaca di sini adalah .value langsung. */
      s.innerHTML = '<option value="">' + U.esc(I18N.t('Memuat…')) + '</option>';
      s.id = lama.id; s.name = lama.name;
      lama.parentNode.replaceChild(s, lama);
    }

    function kosongkanPos() { var p = el('kodePos'); if (p) { p.value = ''; p.removeAttribute('data-otomatis'); } }
    function reset(daftarNama) { daftarNama.forEach(function (n) { jadikan(n, [], ''); }); }

    function nilai() {
      function v(n) { var e = el(n); return e ? e.value : ''; }
      return { negara: v('negara') || 'ID', l1: v('l1'), l2: v('l2'), l3: v('l3'), l4: v('l4') };
    }

    if (!el('negara')) return;

    /* ------------------------------------------------------------ KASKADE
       Mengubah satu tingkat SELALU menyusun ulang tingkat di bawahnya dan
       mengosongkan isinya. Bukan demi kerapian: "Senayan, Coblong, Kota
       Bandung" adalah alamat yang tidak pernah ada, dan salahnya baru
       ketahuan ketika paketnya kembali ke gudang.

       Pendengarnya dipasang di akar, bukan di tiap kolom. Kolom-kolom ini
       berganti wujud antara input dan select sepanjang pengisian, dan
       pendengar yang menempel pada elemennya ikut terbuang setiap kali. */

    function onNegara() {
      var kode = el('negara').value;
      gambarUlangLabel();
      jadikan('l1', daftarL1(kode), istilah(kode).l1);
      reset(['l2', 'l3', 'l4']);
      kosongkanPos();
      if (simpanan.index[kode]) return;
      tunggu('l1');
      muatIndex(kode).then(function () {
        /* Pengguna bisa sudah berpindah negara lagi selagi berkasnya diambil. */
        if (el('negara').value !== kode) return;
        jadikan('l1', daftarL1(kode), istilah(kode).l1);
        gambarUlangSumber(kode);   /* sumbernya baru diketahui setelah index tiba */
      });
    }

    function onL1() {
      var a = nilai();
      jadikan('l2', daftarL2(a.negara, a.l1), istilah(a.negara).l2);
      reset(['l3', 'l4']);
      kosongkanPos();

      /* Rusia dan Rumania menyimpan daftar tingkat-2 di berkas terpisah
         supaya indexnya tidak ratusan kilobyte. */
      var idx = simpanan.index[a.negara];
      if (!idx || !idx.pisah || !a.l1) return;
      var p = provRec(a.negara, a.l1);
      if (!p || simpanan.l2[a.negara + '/' + p.k]) return;
      tunggu('l2');
      muatL2(a.negara, p.k).then(function () {
        var kini = nilai();
        if (kini.negara !== a.negara || kini.l1 !== a.l1) return;
        jadikan('l2', daftarL2(a.negara, a.l1), istilah(a.negara).l2);
      });
    }

    function onL2() {
      var a = nilai();
      reset(['l3', 'l4']);
      kosongkanPos();
      if (!a.l2) return;

      var k = kabRec(a.negara, a.l1, a.l2);
      /* Tanpa berkas rincian, tingkat ini adalah yang terdalam — kode posnya
         menempel di sini (Malaysia, Thailand, dan negara berjenjang dua). */
      if (!k || !k.f) { isiPos(); return; }

      tunggu('l3');
      muatKab(a.negara, k.f).then(function () {
        /* Pengguna bisa sudah berpindah pilihan selama berkas diambil.
           Menuliskan hasil yang sudah basi akan mengisi kolom dengan
           wilayah dari induk yang bukan lagi pilihannya. */
        var kini = nilai();
        if (kini.negara !== a.negara || kini.l1 !== a.l1 || kini.l2 !== a.l2) return;
        jadikan('l3', daftarL3(a.negara, a.l1, a.l2), istilah(a.negara).l3);
        isiPos();
      });
    }

    /**
     * Isikan kode pos untuk pilihan sejauh ini, bila kodenya PASTI.
     *
     * Dipanggil di setiap tingkat, bukan hanya yang terdalam: kode pos
     * menempel pada tingkat yang berbeda di tiap negara, dan menunggu
     * tingkat empat berarti pengguna Malaysia tidak pernah mendapatkannya.
     */
    function isiPos() {
      var a = nilai();
      var pos = kodePosDesa(a.negara, a.l1, a.l2, a.l3, a.l4);
      var p = el('kodePos');
      if (!p) return;
      if (!pos) { p.removeAttribute('data-otomatis'); return; }
      p.value = pos;
      p.setAttribute('data-otomatis', '1');   /* dipakai gaya, bukan logika */
    }

    function onL3() {
      var a = nilai();
      jadikan('l4', daftarL4(a.negara, a.l1, a.l2, a.l3), istilah(a.negara).l4);
      kosongkanPos();
      isiPos();
    }

    function onL4() { isiPos(); }

    var TANGANI = { negara: onNegara, l1: onL1, l2: onL2, l3: onL3, l4: onL4 };
    root.addEventListener('change', function (ev) {
      var id = ev.target && ev.target.id;
      if (!id || id.indexOf('f_' + pre) !== 0) return;
      var fn = TANGANI[id.slice(('f_' + pre).length)];
      if (fn) fn();
    });

    /* ------------------------------------------------- alamat yang sudah ada
       Formulir digambar sebelum datanya tiba, jadi kolomnya mula-mula berupa
       kotak ketik. Setelah data siap, kolom dinaikkan menjadi daftar pilihan
       dengan isi lama tetap terpilih. */
    function pulihkan(nama, daftar, lama, label) {
      if (!daftar.length) return;
      if (lama && daftar.indexOf(lama) < 0) {
        /* Nilai lama ditulis singkat ("Bandung" untuk "Kota Bandung").
           Ditandai, bukan dibuang: menghapusnya diam-diam berarti
           mengosongkan alamat orang tanpa mereka sadari. */
        daftar = daftar.concat([{ v: lama, t: lama + ' — ' + I18N.t('data lama') }]);
      }
      var baru = jadikan(nama, daftar, label);
      if (baru && lama) baru.value = lama;
    }

    (function awal() {
      var a = nilai();
      if (!a.negara) return;
      var ist = istilah(a.negara);
      siapkan(a).then(function () {
        var kini = nilai();
        if (kini.negara !== a.negara) return;
        /* NILAI SEKARANG, bukan nilai saat dialog dibuka.

           Kolom provinsi sudah bisa dipakai sejak dialog terbuka — ia berisi
           daftar cadangan yang ditanam di aplikasi, aktif, tidak menunggu
           apa pun. Yang mengisi bisa memilih provinsinya sebelum berkas
           resmi tiba, dan dulu pilihan itu dibuang begitu berkasnya sampai:
           baris di bawah menyusun ulang kolomnya dengan nilai yang dibaca
           SAAT DIALOG DIBUKA — kosong, untuk gedung baru.

           Yang terlihat oleh yang mengisi: provinsi yang barusan dipilih
           kembali kosong sendiri, tanpa pesan apa pun, dan kabupaten di
           bawahnya tetap terisi. Di server lokal jendela itu milidetik; di
           jaringan seluler ia hitungan detik.

           Daftar tiap tingkat ikut disusun dari nilai sekarang, bukan nilai
           lama — daftar kabupaten milik provinsi yang salah sama tidak
           bergunanya dengan daftar yang kosong. */
        var l1 = kini.l1 || a.l1;
        var l2 = kini.l2 || a.l2;
        var l3 = kini.l3 || a.l3;
        var l4 = kini.l4 || a.l4;
        pulihkan('l1', daftarL1(a.negara), l1, ist.l1);
        pulihkan('l2', daftarL2(a.negara, l1), l2, ist.l2);
        pulihkan('l3', daftarL3(a.negara, l1, l2), l3, ist.l3);
        pulihkan('l4', daftarL4(a.negara, l1, l2, l3), l4, ist.l4);
      });
    })();

    /* Pencarian wilayah dari backend pengiriman, bila tersambung. Sumber resmi
       selalu lebih benar daripada daftar yang ditanam di aplikasi. */
    var pos = el('kodePos');
    if (pos && window.KIRIM && KIRIM.siap()) {
      pos.setAttribute('placeholder', I18N.t('Type to search area…'));
      var tunda = null;
      pos.addEventListener('input', function () {
        if (tunda) clearTimeout(tunda);
        tunda = setTimeout(function () {
          KIRIM.cariArea(pos.value).then(function (areas) {
            if (!areas.length) return;
            var a = areas[0];
            if (!el('l4').value) el('l4').value = a.kelurahan || '';
            if (!el('l3').value) el('l3').value = a.kecamatan || '';
          });
        }, 400);
      });
    }
  }

  /* Indeks negara bawaan dimuat di muka, tanpa menunggu formulir dibuka:
     menundanya berarti formulir alamat PERTAMA selalu tampil dengan kolom
     ketik lalu berubah menjadi daftar pilihan di depan mata pengguna.

     HANYA satu negara. Memuat 56 indeks sekaligus akan menghabiskan kuota
     pengguna untuk 55 negara yang tidak akan pernah mereka pilih. */
  var NEGARA_BAWAAN = 'ID';
  if (typeof fetch === 'function') muatIndex(NEGARA_BAWAAN);

  return {
    NEGARA: NEGARA, ISTILAH: ISTILAH,
    negara: negara, daftarNegara: daftarNegara, istilah: istilah,
    dilayani: dilayani, simpanDilayani: simpanDilayani,
    semuaNegara: semuaNegara, BAWAAN_DILAYANI: BAWAAN_DILAYANI,
    punyaData: punyaData,
    daftarL1: daftarL1, daftarL2: daftarL2, daftarL3: daftarL3, daftarL4: daftarL4,
    kodePosDesa: kodePosDesa, punyaDaftar: punyaDaftar,
    siapkan: siapkan, muatIndex: muatIndex, muatKab: muatKab, sumberData: sumberData,
    kosong: kosong, teks: teks, ringkas: ringkas, pendek: pendek, periksa: periksa,
    terisi: terisi,
    dariTeksLama: dariTeksLama, terstruktur: terstruktur,
    fields: fields, dariForm: dariForm, pasang: pasang
  };
})();
