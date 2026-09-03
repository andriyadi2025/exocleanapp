/* ==========================================================================
   exo-data.js — data rancangan EXOCLEAN App
   --------------------------------------------------------------------------
   Semua angka dan kalimat di sini berasal dari paket desain (blok skrip
   "EXOCLEAN App.dc.html"). Layanan, tarif, satuan, add-on, SOP per layanan,
   wilayah administratif, cakupan radius, paket prepaid, dan ketentuan.

   Yang di bawah ini adalah DATA CONTOH yang dibaca layar. Saat disambungkan
   ke server, yang diganti hanya berkas ini — exo.js tidak melihat dari mana
   angkanya datang. Roster juru bersih SUNGGUHAN sudah dibaca dari basis data
   EXOCLEAN lewat pasar.js bila basisnya ada (lihat daftarJuru() di exo.js).
   ========================================================================== */
var EXO_DATA = (function () {
  'use strict';

  /* ------------------------------------------------------------ layanan
     16 layanan. `rate` = tarif dasar; tarif yang dibayar = rate × faktor
     juru bersih terpilih (aturan bisnis #2). `unit` menentukan default
     kuantitas, langkah, dan batas (aturan #3). */
  var SERVICES = {
    hourly:   { name:'Hourly cleaning',          rate:78000,   unit:'/hour',  warranty:'48-hour free redo' },
    deep:     { name:'Deep cleaning',            rate:140000,  unit:'/hour',  warranty:'7-day free redo' },
    ac:       { name:'AC service',               rate:85000,   unit:'/unit',  warranty:'30-day warranty' },
    sofa:     { name:'Sofa & mattress',          rate:150000,  unit:'/seat',  warranty:'14-day free redo' },
    laundry:  { name:'Laundry & pickup',         rate:12000,   unit:'/kg',    warranty:'Item cover up to Rp1jt' },
    office:   { name:'Office cleaning',          rate:95000,   unit:'/hour',  warranty:'Contract SLA' },
    iron:     { name:'Ironing service',          rate:60000,   unit:'/hour',  warranty:'48-hour free redo' },
    disinfect:{ name:'Disinfection & fogging',   rate:290000,  unit:'/room',  warranty:'7-day free redo' },
    car:      { name:'Car wash at home',         rate:120000,  unit:'/car',   warranty:'48-hour free redo' },
    hydro:    { name:'Hydro cleaning',           rate:95000,   unit:'/m²',    warranty:'14-day free redo' },
    poles:    { name:'Floor polishing & crystallisation', rate:65000, unit:'/m²', warranty:'30-day warranty' },
    pest:     { name:'Pest control',             rate:450000,  unit:'/visit', warranty:'90-day re-treatment' },
    pool:     { name:'Swimming pool care',       rate:550000,  unit:'/visit', warranty:'7-day water check' },
    toren:    { name:'Water tank cleaning',      rate:350000,  unit:'/tank',  warranty:'6-month schedule' },
    postreno: { name:'Post-renovation cleaning', rate:135000,  unit:'/hour',  warranty:'7-day free redo' },
    tankbig:  { name:'Building tank & reservoir',rate:2400000, unit:'/tank',  warranty:'6-month schedule' },
    /* Ditambahkan 3 Sep 2026: layanan perawatan & pribadi. */
    care:     { name:'Elderly, child & patient care', rate:55000, unit:'/hour',    warranty:'Vetted caregiver, free replacement' },
    errand:   { name:'Shopping & errands',        rate:35000,   unit:'/trip',    warranty:'Receipt-matched, cover up to Rp1jt' },
    massage:  { name:'Massage & body care',       rate:150000,  unit:'/session', warranty:'Certified therapist' },
    cook:     { name:'Cooking & meal prep',       rate:65000,   unit:'/hour',    warranty:'Hygiene-trained cook' },
    building: { name:'Building periodic package', rate:4500000, unit:'/month',   warranty:'Contract SLA' }
  };

  var DEFAULT_QTY = { '/hour':3, '/unit':2, '/seat':3, '/kg':5, '/room':2, '/car':1, '/visit':1, '/m²':12, '/tank':1, '/trip':1, '/session':1, '/month':1 };
  /* Kuantitas awal per LAYANAN, mengalahkan DEFAULT_QTY per unit: perawatan minimal 4 jam. */
  var MIN_QTY = { postreno:6, care:4, cook:2 };
  var STEP_QTY    = { '/m²':4 };
  var SURVEY_FIRST = { postreno:true, tankbig:true, deep:true, building:true };

  var CATALOG_GROUPS = [
    { key:'grpHome', keys:['hourly','deep','iron','laundry','sofa','hydro'] },
    { key:'grpTech', keys:['ac','disinfect','pest','toren','poles','pool','car'] },
    { key:'grpBiz',  keys:['office','postreno','tankbig','building'] },
    { key:'grpCare', keys:['care','errand','massage','cook'] }
  ];

  /* Sembilan ubin cepat di beranda. `daun` = nada hijau kedua. */
  var HOME_TILES = [
    { id:'hourly',   d:'<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>' },
    { id:'deep',     d:'<path d="M3 21h18"/><path d="M7 21V11l5-6 5 6v10"/><path d="M12 21v-5"/>' },
    { id:'ac',       daun:true, d:'<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>' },
    { id:'sofa',     daun:true, d:'<path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 14a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5H2Z"/>' },
    { id:'laundry',  d:'<rect x="4" y="3" width="16" height="18" rx="4"/><circle cx="12" cy="14" r="3.5"/><path d="M8 7h2"/>' },
    { id:'iron',     d:'<path d="M3 17h18a8 8 0 0 0-8-8H8Z"/><path d="M8 9V7a3 3 0 0 1 3-3h6"/>' },
    { id:'office',   daun:true, d:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M10 7h4M10 12h4M10 17h4"/><path d="M3 22h18"/>' },
    { id:'disinfect',daun:true, d:'<path d="M8 21h8V9H8Z"/><path d="M10 9V5h4v4"/><path d="M18 5h.01M20 8h.01M18 11h.01"/>' },
    { id:'car',      d:'<path d="M5 17h14"/><path d="M4 17v-4l2-5h12l2 5v4"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>' },
    /* Perawatan & pribadi (3 Sep 2026) — ikut ubin cepat supaya terlihat dari beranda. */
    { id:'care',     daun:true, d:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' },
    { id:'errand',   d:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { id:'massage',  daun:true, d:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6.5"/>' }
  ];

  /* ---------------------------------------------------- roster cadangan
     Dipakai HANYA bila basis data EXOCLEAN tidak ada di asal ini. Faktor:
     Sari 0,92 · Nurul 0,85 · Ayu 1,04 · Dian 0,76 (aturan bisnis #2). */
  var CLEANERS = [
    { id:'sw', name:'Sari Wulandari', initials:'SW', rating:'4,9', jobs:'1.284', factor:0.92, distance:'2,1 km', years:'4 yrs',
      tags:['Booked by you 3×','Brings own tools','Speaks English'], note:'Holds your Saturday slot · confirms in 2 min' },
    { id:'nf', name:'Nurul Fadhilah', initials:'NF', rating:'4,9', jobs:'812',   factor:0.85, distance:'3,4 km', years:'3 yrs',
      tags:['Top rated','Pet friendly'], note:'Free at 09:00 · 98% on-time over 6 months' },
    { id:'ai', name:'Ayu Indriani',   initials:'AI', rating:'4,8', jobs:'2.106', factor:1.04, distance:'1,4 km', years:'6 yrs',
      tags:['Deep-clean certified','Fastest to accept'], note:'Nearest to you · arrives 10 min early on average' },
    { id:'ds', name:'Dian Saputri',   initials:'DS', rating:'4,7', jobs:'344',   factor:0.76, distance:'5,2 km', years:'1 yr',
      tags:['New on EXOCLEAN','Trained Jul 2026'], note:'Lower rate while building reviews · fully background-checked' }
  ];
  var MIN_FACTOR = 0.76;   /* label "from" di katalog memakai faktor terendah di pasar */

  var ADDON_SETS = {
    hourly:[{id:'fridge', name:'Inside the fridge', note:'+30 min', price:45000},
            {id:'window', name:'Windows & balcony glass', note:'+40 min', price:60000},
            {id:'laundry', name:'Fold laundry', note:'up to 2 loads', price:35000}],
    deep:[{id:'oven', name:'Oven & range hood degrease', note:'+45 min', price:85000},
          {id:'grout', name:'Bathroom grout scrub', note:'+40 min', price:70000},
          {id:'balcony', name:'Balcony & window tracks', note:'+30 min', price:55000}],
    ac:[{id:'chem', name:'Deep chemical wash', note:'per unit · heavy dust', price:95000},
        {id:'freon', name:'Freon pressure check', note:'top-up billed separately', price:35000},
        {id:'drain', name:'Drain line flush', note:'stops water dripping', price:40000}],
    sofa:[{id:'stain', name:'Stain treatment', note:'per stubborn spot', price:45000},
          {id:'anti', name:'Anti-bacterial finish', note:'pet & baby safe', price:60000}],
    laundry:[{id:'express', name:'Express 8 hours', note:'same-day return', price:25000},
             {id:'iron', name:'Ironing included', note:'per kg', price:8000},
             {id:'perfume', name:'Perfume finish', note:'choose scent', price:10000}],
    office:[{id:'pantry', name:'Pantry deep clean', note:'+1 hour', price:120000},
            {id:'glass', name:'Interior glass partitions', note:'+45 min', price:90000}],
    iron:[{id:'fold', name:'Fold & wardrobe sort', note:'+30 min', price:30000}],
    disinfect:[{id:'uv', name:'UV lamp pass', note:'per room', price:80000},
               {id:'cert', name:'Disinfection certificate', note:'for offices & schools', price:50000}],
    hydro:[{id:'anti2', name:'Anti-mite finish', note:'per item', price:55000},
           {id:'dry', name:'Fast-dry blower', note:'usable in 2 hours', price:40000}],
    poles:[{id:'seal', name:'Marble sealer coating', note:'per m²', price:25000},
           {id:'night', name:'Night shift work', note:'office hours untouched', price:150000}],
    pest:[{id:'follow', name:'Follow-up visit in 30 days', note:'included in warranty', price:150000},
          {id:'rodent', name:'Rodent bait stations', note:'per 5 points', price:120000}],
    pool:[{id:'chem', name:'Full chemical rebalance', note:'test log attached', price:180000},
          {id:'filter', name:'Filter cartridge clean', note:'per unit', price:95000}],
    toren:[{id:'sterile', name:'Food-grade sterilisation', note:'safe for drinking water', price:90000},
           {id:'pump', name:'Pump & float check', note:'report attached', price:70000}],
    postreno:[{id:'debris', name:'Debris haul-away', note:'up to 1 pick-up truck', price:450000},
              {id:'paint', name:'Paint & cement spot removal', note:'glass, tiles, frames', price:180000},
              {id:'duct', name:'Dust purge of AC & vents', note:'per unit', price:120000}],
    tankbig:[{id:'lab', name:'Laboratory water test', note:'certificate for management', price:750000},
             {id:'pipe', name:'Distribution pipe flush', note:'per riser', price:900000}],
    car:[{id:'interior', name:'Interior vacuum & wipe', note:'+30 min', price:60000},
         {id:'wax', name:'Wax & polish', note:'+40 min', price:95000},
         {id:'engine', name:'Engine bay clean', note:'dry method', price:70000}],
    care:[{id:'night', name:'Overnight shift', note:'20:00–08:00', price:250000},
          {id:'meal', name:'Meal preparation', note:'simple home cooking', price:45000},
          {id:'twocare', name:'Second caregiver', note:'for two people', price:180000}],
    errand:[{id:'cold', name:'Cold-chain bag', note:'frozen & chilled', price:15000},
            {id:'wait', name:'Extra waiting time', note:'per 30 min queue', price:20000},
            {id:'far', name:'Beyond 10 km', note:'per extra 5 km', price:15000}],
    massage:[{id:'ext30', name:'Extra 30 minutes', note:'same therapist', price:60000},
             {id:'scrub', name:'Body scrub', note:'+30 min', price:85000},
             {id:'table', name:'Massage table', note:'brought by the therapist', price:30000}],
    cook:[{id:'grocer', name:'Grocery run before cooking', note:'+45 min', price:35000},
          {id:'prep', name:'Weekly meal-prep containers', note:'10 portions', price:120000},
          {id:'diet', name:'Special diet menu', note:'low salt, diabetic, kids', price:40000}],
    building:[{id:'facade', name:'Glass facade quarterly', note:'up to 4 floors', price:900000},
              {id:'pestq', name:'Pest control quarterly', note:'common areas', price:450000},
              {id:'garden', name:'Garden & parking sweep', note:'daily', price:1200000}]
  };

  var TIMES = ['08:00','09:00','10:00','13:00','15:00','17:00'];
  var VOUCHER = { code:'CLEAN25', amount:25000, min:150000 };
  var PLATFORM_FEE = 3000;
  var CREW_FEE = 15000;

  var PAYMENTS = [
    { id:'wallet',  name:'EXO Wallet',         note:null,                       mark:'EXO' },
    { id:'qris',    name:'QRIS',               note:'Any bank or e-wallet app', mark:'QRIS' },
    { id:'ewallet', name:'GoPay / OVO / DANA', note:'Linked: OVO ···8817',      mark:'e-w' },
    { id:'va',      name:'Bank transfer (VA)', note:'BCA, Mandiri, BNI',        mark:'VA' },
    { id:'card',    name:'Credit card',        note:'Visa ···4471',             mark:'CARD' }
  ];

  var STAGES = [
    { title:'Booking locked',      note:'Confirmed 20:41 · only you can move it' },
    { title:'Cleaner on the way',  note:'Left 08:34 · arriving 08:56' },
    { title:'Cleaning in progress',note:'Checklist updates live below' },
    { title:'Done & verified',     note:'Photos attached, warranty starts' }
  ];
  var CHECK_IDS = ['kitchen','bath','bed','trash'];
  var CHECK_KEYS = ['ckKitchen','ckBath','ckBed','ckTrash'];
  var CHECK_ID_LABELS = ['Dapur & wastafel','Kamar mandi ×2','Kamar tidur & lantai','Buang sampah & foto akhir'];
  var CHECK_TIMES = ['09:38','10:22','—','—'];

  var ISSUES = [
    { id:'quality',    label:'Something was missed',  note:'Free re-clean within 48 hours', out:'A re-clean is booked with the same cleaner in the next 24h, or Rp100.000 credit if you prefer.' },
    { id:'late',       label:'Cleaner was late',      note:'Auto credit per 15 minutes',    out:'Rp25.000 per late 15 minutes is credited to your wallet tonight — no review needed.' },
    { id:'damage',     label:'Something was damaged', note:'Covered up to Rp5jt',           out:'A named claims officer calls you within 60 minutes, with a decision date confirmed in writing.' },
    { id:'reschedule', label:'My slot was moved',     note:'Rp100.000, automatic',          out:'Rp100.000 has already landed in your wallet. You keep your original price on the new date.' },
    { id:'refund',     label:'I want a refund',       note:'Dated deadline, tracked',       out:'Refund approved within 24h and in your bank within 3 working days — tracked in Wallet with a date.' }
  ];
  var PRAISE = ['Spotless finish','On time','Careful with things','Friendly','Great with pets'];
  var TIPS = [0, 10000, 20000, 50000];

  var PAST_ORDERS = [
    { initials:'SW', service:'Hourly cleaning · 3h',  meta:'Sari W. · 23 Aug · Home',   price:'Rp 237.000', stars:'★ 5,0', svc:'hourly' },
    { initials:'AI', service:'AC service · 2 units',  meta:'Ayu I. · 12 Aug · Home',    price:'Rp 173.000', stars:'★ 4,0', svc:'ac' },
    { initials:'NF', service:'Deep cleaning · 5h',    meta:'Nurul F. · 2 Aug · Office', price:'Rp 703.000', stars:'★ 5,0', svc:'deep' }
  ];

  /* Mutasi dompet dalam ANGKA — isi ulang dan penarikan menambah baris di
     sini dan harus dijumlahkan dengan cara yang sama. */
  var TXNS = [
    { label:'Hourly cleaning · Sari W.',     date:'23 Aug · EXO-4390',       amount:-237000 },
    { label:'Guarantee credit · slot moved', date:'21 Aug · automatic',      amount: 100000 },
    { label:'Top up · BCA VA',               date:'18 Aug',                  amount: 500000 },
    { label:'Refund · AC re-visit',          date:'in progress · by 28 Aug', amount: 180000 }
  ];

  var ADDRESSES = [
    { id:'home',   label:'Home',   short:'Kemang Residence 12B',
      full:'Kemang Residence 12B, Jakarta Selatan · gate code 4471 · “please ring, dog inside”',
      brief:'Kemang Residence 12B · gate 4471 · dog inside',
      point:{ lat:-6.26073, lng:106.81403 } },
    { id:'office', label:'Office', short:'SCBD Tower 2, 18F',
      full:'SCBD Tower 2, 18th floor, Jakarta Selatan · access card at lobby',
      brief:'SCBD Tower 2, 18th floor · access card at lobby',
      point:{ lat:-6.22585, lng:106.80939 } }
  ];

  var NOTIFS = [
    { title:'Sari is on the way',          body:'Left 08:34 · arriving 08:56', time:'08:34' },
    { title:'Rp100.000 guarantee credit',  body:'We moved your 21 Aug slot, so the credit is already in your wallet.', time:'21 Aug' },
    { title:'Refund step 2 of 3',          body:'Approved and sent to your bank — money by Fri 28 Aug.', time:'25 Aug' }
  ];
  var CHAT_START = [{ from:'them', text:'Hi Dewi — Rahma here, a real person. What can I help with?', time:'09:12' }];

  var SETTINGS = [
    { label:'Payment methods',           value:'saved',  sheet:'bayarTersimpan' },
    { label:'Notifications',             value:null,     act:'notifAktif' },
    { label:'Language',                  value:'lang',   go:'lang' },
    { label:'Terms of service & privacy',value:'v2.3',   go:'terms' },
    { label:'Help — human in 60s',       value:'Chat',   sheet:'obrol' }
  ];

  var SHARE_TARGETS = [
    { id:'wa', label:'WhatsApp', short:'WA', app:'WhatsApp' },
    { id:'ig', label:'IG Story', short:'IG', app:'Instagram Stories' },
    { id:'igp', label:'IG Post', short:'IG+', app:'Instagram' },
    { id:'tt', label:'TikTok', short:'TT', app:'TikTok' },
    { id:'fb', label:'Facebook', short:'FB', app:'Facebook' },
    { id:'x', label:'X', short:'X', app:'X' },
    { id:'link', label:'Copy link', short:'↗' },
    { id:'save', label:'Save image', short:'↓' }
  ];

  var PREPAID = [
    { id:'p10', nameKey:'pack10', hours:10, price:680000,  badge:'',          detailKey:'pack10d', saveKey:'pack10s' },
    { id:'p20', nameKey:'pack20', hours:20, price:1290000, badge:'badgeTop',  detailKey:'pack20d', saveKey:'pack20s' },
    { id:'p40', nameKey:'pack40', hours:40, price:2380000, badge:'badgeSave', detailKey:'pack40d', saveKey:'pack40s' }
  ];

  var TRANSPORT = [
    { range:'0–17 km', fee:'Free' }, { range:'17–20 km', fee:'Rp 10.000' }, { range:'20–30 km', fee:'Rp 15.000' },
    { range:'30–35 km', fee:'Rp 20.000' }, { range:'over 35 km', fee:'not served' }
  ];

  /* ------------------------------------------------------- ketentuan */
  var SERVICE_TERMS = {
    hourly:{min:'Minimum 2 hours with one cleaner, or 1 hour with two cleaners.',
      can:['Kitchen: stove, kitchen set, washing up','Bathroom: walls, toilet, basin, mirror, floor','Bedrooms incl. changing sheets, living and dining rooms, terrace','Windows and glass up to 1,5 m height','Dusting furniture, vacuuming and mopping floors'],
      cant:['Water tanks, swimming pools, fish ponds','Ironing, storerooms, fans, grease traps, exhaust fans','Pet areas or pet waste, human waste, blood','Anything above 1,5 m, garden or tree trimming','Inside the fridge, laundry or drying clothes','Vacuuming mattresses, curtains or sofas (floors and rugs only)'],
      weBring:['Mop set, broom, microfiber cloths, chamois','Vacuum cleaner 1200 W, window squeegee, scouring pads'],
      youBring:['Bucket and a power socket','Bathroom brush','Dish soap and sponge'],
      note:'Not for post-renovation, post-flood or long-empty homes. If we arrive to such a job, a Rp50.000 per cleaner call-out fee applies.'},
    deep:{min:'Survey first for deep cleaning and deep toilet; the quote follows the survey.',
      can:['Heavy scale and yellowing removal in bathrooms','Degreasing kitchen, hood and tiles','Detailed dusting including high-touch points'],
      cant:['Structural repair or painting','Post-construction debris removal'],
      weBring:['Deep-clean chemicals, scrubbing machine where needed'], youBring:['Water and power access'],
      note:'Book a free survey when the condition is unknown — the price is agreed before work starts.'},
    ac:{min:'Cleaner waits a maximum of 30 minutes at the address for AC jobs.',
      can:['Indoor and outdoor unit wash, drain line flush','Pressure and temperature check, report per unit'],
      cant:['Freon top-up (billed separately after checking)','Moving or re-piping units without a survey'],
      weBring:['Jet pump, cover bag, cleaning chemicals'], youBring:['Water and power access, ladder space'],
      note:'30-day warranty per unit serviced. Report inside the window and we return free.'},
    sofa:{min:'Items are priced per seat, per row or per m² of total area.',
      can:['Sofa (excluding cushions), carpets, curtains','Mattress (excluding pillows, headboard and base)','Office and dining chairs, pillows, dolls','Car seats except leather and suede'],
      cant:['Wet or damp material — it must be dry','Removing permanent dye or structural damage'],
      weBring:['Hydro machine 1000 W, extraction tools'], youBring:['Power socket and a ventilated space'],
      note:'Vacuuming is done at least twice. Carpets and curtains are measured by total area (2×2 m is entered as 4 m).'},
    laundry:{min:'Pickup and return within the service area.',
      can:['Wash, dry and fold per kilo','Choice of scent finish'],
      cant:['Dry-clean-only garments, leather, wedding dresses'],
      weBring:['Pickup bags and weighing at your door'], youBring:['Sorted items and any special instructions'],
      note:'Item cover up to Rp1.000.000 per order for loss or damage.'},
    iron:{min:'Minimum 2 hours with one cleaner.',
      can:['Standard output 20–30 pieces in about 2 hours, depending on fabric'],
      cant:['Steam-iron equipment','Patterned brocade, silk, long dresses, tuxedos, curtains, sheets and bed covers'],
      weBring:['Trained staff only — tools are yours'], youBring:['Iron, ironing board and chair','Starch and fragrance'],
      note:'Without an ironing board the result may be below standard, and that is outside our responsibility.'},
    office:{min:'Contract-based, minimum 3 months, scoped by survey.',
      can:['Daily, weekly and monthly SOP-based cleaning','Supervisor inspection and monthly report'],
      cant:['Waste categorised as B3 without a separate agreement','Work above 1,5 m without approved equipment'],
      weBring:['Machines, chemicals and PPE per SOP'], youBring:['Storage space, water and power, building access'],
      note:'SOP and checklist codes are attached to your contract and visible in your monthly report.'},
    disinfect:{min:'ULV fogging with sterilising fluid that is safe for people.',
      can:['Full-room spraying with no area skipped','Room usable again 2 hours after the process'],
      cant:['Removing bed bugs, insects or mosquitoes — that is pest control'],
      weBring:['ULV machine and certified fluid'],
      youBring:['Good air circulation; cover food, documents and electronics; move pets out; the room must be empty during work'],
      note:'Wash cutlery and change sheets after the process.'},
    hydro:{min:'Carpets and curtains are priced by total area; a 2×2 m rug is entered as 4 m².',
      can:['Sofa (excluding cushions), carpets, curtains, mattress (excluding pillows, headboard and base)','Office and dining chairs, dolls, car seats except leather and suede'],
      cant:['Material that is wet or damp','Removing permanent dye or fibre damage'],
      weBring:['Hydro machine 1000 W, extraction tools'], youBring:['Power socket and a ventilated space'],
      note:'Vacuuming is done at least twice. One-sided mattress work covers the top surface and two sides.'},
    poles:{min:'Priced per m², with a short survey to grade the floor condition first.',
      can:['Marble and granite crystallisation','Removing fine scratches and water marks'],
      cant:['Ordinary ceramic tile, vinyl, wooden parquet','Repairing cracks or chips'],
      weBring:['Polishing machine, pads, crystallisation compound'], youBring:['Water and power access, the area cleared'],
      note:'Heavy furniture must be moved out before work starts.'},
    pest:{min:'Per visit, covering one house unit or one office floor.',
      can:['Cockroaches, ants, mosquitoes, termites and rodents','A findings report with prevention advice'],
      cant:['Opening up structures for termite nests without separate approval','Wasp nests above 3 m'],
      weBring:['Licensed chemicals and full PPE'], youBring:['House empty for 2–4 hours, food covered, pets moved out'],
      note:'90-day warranty: if the pests return inside that window we re-treat free.'},
    pool:{min:'Per visit; a fixed-price weekly subscription is available.',
      can:['Brushing walls and floor, vacuuming, skimming the surface','pH and chlorine testing and correction, with a chemical log'],
      cant:['Leak, pump or pipework repair','Full draining without the owner’s approval'],
      weBring:['Brushes, pool vacuum, test kit, chemicals'], youBring:['Power access and a clean water source'],
      note:'Test results are attached to the report and can be handed to building management.'},
    toren:{min:'Per tank up to 2,000 litres; larger tanks are quoted separately.',
      can:['Draining, scrubbing the tank walls, rinsing','Food-grade sterilisation and a lid inspection'],
      cant:['Repairing leaks or replacing the float without approval','Roof tanks without safe ladder access'],
      weBring:['Pump, specialist brushes, food-grade solution'], youBring:['Safe access to the tank and clean rinsing water'],
      note:'Recommended every 6 months; we remind you automatically at the next due date.'},
    postreno:{min:'Priced per hour with a compulsory free survey first — condition varies too much to quote blind.',
      can:['Cement, paint, grout and adhesive spots on glass, tiles and frames','Fine construction dust from walls, ceilings, vents and light fittings','Final polish so the unit is ready to occupy or hand over'],
      cant:['Removing structural debris heavier than one pick-up load without the haul-away add-on','Repainting, plastering or any repair work','Working while contractors are still on site'],
      weBring:['Industrial vacuum, scrapers, dust masks, safe solvents'], youBring:['Water and power, plus building permission for waste removal'],
      note:'This replaces the old rule that turned post-renovation jobs away. Survey is free and the quote is fixed before work starts.'},
    care:{min:'Minimum 4 hours per visit with one caregiver; 8- and 12-hour shifts are available.',
      can:['Companionship, feeding, bathing and toileting help, mobility support','Reminders for medication already prescribed, light tidying of the care area','Child care: supervision, meals, homework help and play'],
      cant:['Injections, wound care or any medical procedure','Heavy housework beyond the care area — book a cleaning service for that'],
      weBring:['A vetted caregiver with first-aid training, ID checked and police clearance'],
      youBring:['A care plan, the medication list and an emergency contact','Meals, diapers and personal items of the person cared for'],
      note:'Caregivers are not nurses. Medication is given only as written by a doctor, and no injections or medical procedures are done.'},
    errand:{min:'Per trip within 10 km of your address; goods are paid at cost against the receipt.',
      can:['Grocery and market shopping from your list, with photos before checkout','Pick up or drop off parcels, documents, laundry and keys','Queueing for bills, permits and returns'],
      cant:['Goods above Rp2.000.000 per trip without a deposit','Live animals, hazardous goods and anything illegal'],
      weBring:['A runner with ID checked and an insulated bag for cold items','A receipt photo and an itemised total in the app'],
      youBring:['A clear list with brands and which substitutes are allowed','Payment for the goods, settled from your EXO Wallet on delivery'],
      note:'Alcohol, cigarettes, prescription medicines and cash withdrawals cannot be bought on your behalf.'},
    massage:{min:'Per 60-minute session at your home; a therapist of the same gender can be requested at no charge.',
      can:['Traditional, relaxation, deep-tissue and reflexology massage','Body scrub and a warm compress after the massage','Prenatal massage after week 12 with a trained therapist'],
      cant:['Medical or physiotherapy treatment, wet cupping','Any request outside wellness — the session ends and is charged in full'],
      weBring:['A certified therapist, fresh linen, massage oil and towels','A folding massage table on request'],
      youBring:['A quiet room or a clear space of about 2×2 m','Shower access before the session'],
      note:'Wellness massage only. Not for acute injury, fever, pregnancy under 12 weeks or skin infections — tell us before booking.'},
    cook:{min:'Minimum 2 hours per visit; ingredients are yours, or bought on the way with the grocery-run add-on.',
      can:['Daily home cooking for up to 6 people from your recipes or ours','Weekly meal prep, portioned and labelled for the fridge','Kitchen left clean: dishes washed, stove and counters wiped'],
      cant:['Catering for events above 10 people — book through customer service','Cooking with ingredients that are spoiled or past their date'],
      weBring:['A cook with food-hygiene training, hairnet, apron and a food thermometer'],
      youBring:['Ingredients, a working stove, cookware and containers','Your menu or dietary notes, at the latest the evening before'],
      note:'Home cooking only. Tell us about allergies and diets before booking — the cook follows your list and does not diagnose.'},
    building:{min:'Monthly contract, minimum 6 months, priced per building after a survey.',
      can:['Daily lobby, lift and corridor cleaning with a supervisor on site','Water tank cleaning every 6 months and weekly pool care included','Monthly report with photos, chemical log and a checklist per SOP'],
      cant:['Structural repairs, painting and pest treatment without a separate order','Units inside residents\' apartments — those are booked by each resident'],
      weBring:['A dedicated team, machines, chemicals and PPE per SOP','An account manager and a monthly review meeting'],
      youBring:['Storage space, water and power, and building access permits','One contact person for daily coordination'],
      note:'One agreed schedule replaces separate bookings: water tanks every 6 months, pool weekly, lobby and lifts daily, with one monthly invoice.'},
    tankbig:{min:'For building reservoirs above 2.000 litres; quoted per tank after a site check.',
      can:['Draining, high-pressure wash, sludge removal, food-grade sterilisation','Before–after photo report and a chemical log for building management'],
      cant:['Structural repair of the tank, pumps or valves','Confined-space entry without the building’s written permit'],
      weBring:['Industrial pump, confined-space kit, certified operators and full PPE'], youBring:['Written work permit, safe access, and a water supply for rinsing'],
      note:'Scheduled every 6 months by default and billed on the building contract, not per visit.'},
    car:{min:'A shaded, spacious spot with water and power access.',
      can:['Exterior wash including underbody, all glass','Interior dusting with clean & shine, seat vacuuming','Car mat washing, tyre dressing','Dry wash option for lightly soiled cars'],
      cant:['Heavy mud or thick dirt on the dry-wash option','Paint correction or body repair'],
      weBring:['Wash tools, chemicals, vacuum'], youBring:['Water and power near the parking spot'],
      note:'Direct sunlight affects the finish; please provide a shaded area.'}
  };

  var GENERAL_TERMS = [
    { title:'Minimum order', items:[
      ['ok','General cleaning: minimum 1 hour with 2 cleaners, or 2 hours with 1 cleaner.'],
      ['ok','Ironing: minimum 2 hours with 1 cleaner.'],
      ['ok','Hydro cleaning minimum order Rp200.000; wet cleaning minimum Rp300.000.']] },
    { title:'Cancellation, waiting and payment', items:[
      ['warn','Cancelling or rescheduling within 4 hours of the start time costs Rp50.000 per cleaner.'],
      ['warn','The cleaner waits up to 45 minutes after arriving (30 minutes for AC). With no response the order is cancelled, a Rp50.000 per cleaner call-out fee applies and the rest is returned to your EXO Wallet.'],
      ['warn','If payment is not completed within 30 minutes of booking, the order cancels itself and you book again.']] },
    { title:'On site', items:[
      ['ok','EXOCLEAN provides tools and cleaning fluids to EXOCLEAN standard. If you insist on your own fluids, we are not liable for damage they cause.'],
      ['ok','Both sides check the area before work starts and after it finishes. Raise anything while the cleaner is still on site — after they leave we cannot process it.'],
      ['ok','Parking fees at apartments or office buildings are yours.'],
      ['ok','For Saturday, Sunday or public holiday work in apartments and offices, confirm with building management or provide a work permit letter.'],
      ['ok','Adding hours or items mid-visit goes through EXOCLEAN customer service, not the cleaner directly.']] },
    { title:'Refunds and protection', items:[
      ['warn','Refunds are returned to your EXO Wallet, within 3 working days at the latest.'],
      ['warn','Book only through the official EXOCLEAN app, website or WhatsApp. We cannot accept complaints or accept liability for jobs arranged directly with a cleaner.'],
      ['ok','Customer service on WhatsApp: 0821 1084 7595.']] }
  ];
  var PREPAID_TERMS = [
    { title:'How prepaid works', items:[
      ['ok','Buy a prepaid package in the app, then book general cleaning or ironing straight away.'],
      ['ok','Prepaid customers can choose the cleaner they want.'],
      ['ok','A package is valid for the period stated when you bought it; the quota only works inside that period.']] },
    { title:'Limits', items:[
      ['warn','A package cannot be sold or transferred to another person.'],
      ['warn','Cancelling or rescheduling within 4 hours deducts 1 hour from your package.'],
      ['warn','On refund we deduct hours already used at the normal rate of Rp75.000 per hour, and the rest returns to your EXO Wallet.']] }
  ];
  var PRIVACY_TERMS = [
    { title:'Who holds your data', items:[
      ['ok','PT EXO POINT operates EXOCLEAN and is responsible for the data you give us through the app and website.'],
      ['ok','This privacy policy is part of the terms of service and cannot be read separately from them.']] },
    { title:'What we collect and why', items:[
      ['ok','Registration data, addresses, booking history, payments and chats — used to run the service and support you.'],
      ['ok','Location is used while a booking is active, to route the cleaner and show live tracking.'],
      ['ok','Your address and phone number are hidden from marketing and never printed on a share card.']] },
    { title:'Your control', items:[
      ['ok','You may correct or delete your data, and withdraw consent for marketing, from Profile at any time.'],
      ['warn','We keep the records that Indonesian tax and consumer-protection law requires us to keep, even after deletion.']] }
  ];

  /* ------------------------------------------------------------ mitra */
  var PARTNER_JOBS = [
    { service:'Deep cleaning · 5 jam',   meta:'Senopati · Sab 29 Agu 08:00', pay:'Rp 700.000', keep:'Rp 697.000', distance:'3,1 km', when:'Sab 08:00', repeat:'Pelanggan lama' },
    { service:'Cuci AC · 3 unit',        meta:'Kemang · Min 30 Agu 10:00',   pay:'Rp 255.000', keep:'Rp 252.000', distance:'1,8 km', when:'Min 10:00', repeat:'Pelanggan baru' },
    { service:'Cleaning per jam · 3 jam',meta:'Cipete · Sen 31 Agu 13:00',   pay:'Rp 234.000', keep:'Rp 231.000', distance:'4,6 km', when:'Sen 13:00', repeat:'Jadwal mingguan' }
  ];
  var PEAK_DAY = 520000;
  var BARS = [['Sen',34,'Cleaning per jam · 3 jam'],['Sel',58,'Deep cleaning · 4 jam'],['Rab',44,'Cuci AC · 3 unit'],['Kam',72,'Deep cleaning · 5 jam'],['Jum',88,'Per jam ×2 · 6 jam'],['Sab',100,'Deep cleaning · 5 jam + sofa'],['Min',26,'Setrika · 2 jam']];
  var STANDING = [
    { label:'Rating (30 job terakhir)', value:'4,9' },
    { label:'Ketepatan waktu tiba',     value:'98%' },
    { label:'Job dibatalkan oleh Anda', value:'0' }
  ];
  var PARTNER_ISSUES = [
    { id:'akses',  label:'Tidak bisa masuk',          note:'Kode gerbang salah, tidak ada yang menjawab' },
    { id:'alat',   label:'Peralatan tidak ada',       note:'Pelanggan bilang akan menyediakan' },
    { id:'lingkup',label:'Job lebih besar dari pesanan', note:'Minta ops menghitung ulang sebelum mulai' },
    { id:'aman',   label:'Saya merasa tidak aman',    note:'Keluar dulu, baru tekan ini — Anda tetap dibayar penuh' }
  ];
  var WD_HISTORY = [
    { amount:1420000, meta:'Senin 25 Agu · BCA ···4471 · mingguan', state:'Masuk',   ok:true },
    { amount:300000,  meta:'21 Agu · instan · biaya Rp2.500',        state:'Masuk',   ok:true },
    { amount:1650000, meta:'Senin 18 Agu · BCA ···4471',             state:'Masuk',   ok:true },
    { amount:250000,  meta:'14 Agu · rekening salah nama',           state:'Ditolak', ok:false }
  ];
  var BANKS = ['BCA','Mandiri','BNI','BRI','CIMB','Permata','BSI'];
  var WD_METHODS = [
    { id:'weekly',  name:'Transfer mingguan', note:'Masuk setiap Senin pagi', fee:0 },
    { id:'instant', name:'Instan',            note:'Masuk dalam 15 menit',   fee:2500 }
  ];

  var REG_DOCS = [
    { id:'ktp',    label:'Foto KTP',                        note:'Sisi depan, terbaca jelas',                      state:'Wajib' },
    { id:'skck',   label:'SKCK',                            note:'Maksimal 6 bulan terakhir',                      state:'Wajib' },
    { id:'selfie', label:'Swafoto memegang KTP',            note:'Untuk pencocokan wajah',                         state:'Wajib' },
    { id:'bank',   label:'Rekening bank atas nama sendiri', note:'Tujuan pembayaran mingguan',                     state:'Wajib' },
    { id:'vaksin', label:'Sertifikat vaksin',               note:'Opsional, memperbesar peluang job kantor',       state:'Opsional' }
  ];
  var REG_REQUIRED = ['ktp','skck','selfie','bank'];
  var REG_TIMELINE = [
    { title:'Data diri & kontak darurat diterima',    note:'Baru saja', done:true },
    { title:'Verifikasi dokumen oleh Partner Ops',    note:'Tenggat besok 17:00', done:false },
    { title:'Uji keterampilan di hub terdekat',       note:'Dijadwalkan otomatis · dibayar Rp75.000', done:false },
    { title:'Akun mitra aktif & orientasi SOP',       note:'Kontrak digital dikirim ke WhatsApp', done:false }
  ];
  var KIN_RELS = ['Pasangan','Orang tua','Saudara','Anak','Teman dekat'];
  var RADII = [3,5,10,15,25];
  var RADIUS_JOBS = { 3:'4–6', 5:'8–11', 10:'14–18', 15:'18–23', 25:'20–26' };
  var RADIUS_TRAVEL = { 3:'9 menit', 5:'14 menit', 10:'24 menit', 15:'34 menit', 25:'52 menit' };

  var REPORT_AREAS = [
    { id:'kitchen', key:'arKitchen', name:'Dapur & wastafel',     note:'Foto sudut yang sama sebelum dan sesudah', t:1 },
    { id:'bath',    key:'arBath',    name:'Kamar mandi',          note:'Sertakan kloset, wastafel, lantai',       t:0 },
    { id:'bed',     key:'arBed',     name:'Kamar tidur & lantai', note:'Termasuk sprei bila diganti',             t:1 },
    { id:'living',  key:'arLiving',  name:'Ruang keluarga',       note:'Sudut lebar agar perbedaan terlihat',     t:2 }
  ];

  /* ------------------------------------------------ SOP per layanan
     ppe = APD wajib (aturan #8) — semuanya harus dicentang sebelum langkah
     kerja terbuka. steps = [label, detail, wajibFoto]; berurutan (aturan #9). */
  var SOP_META = {
    hourly:{code:'D-001', title:'General Cleaning', ppe:['gloves','shoes'],
      alat:[['Mop set + ember','kode warna per area'],['Sapu & dustpan',''],['Lap microfiber',''],['Vacuum 1200 W','']],
      chem:[['Pembersih lantai multi-purpose','1:40'],['Pembersih kaca','semprot ke lap']],
      steps:[['Cek area bersama pelanggan','foto kondisi awal',true],['Dusting furnitur & permukaan','atas ke bawah',false],['Dapur: kompor, kitchen set, cuci piring','',true],['Kamar mandi: dinding, kloset, wastafel','',true],['Vakum & pel seluruh lantai','',false],['Cek akhir bersama pelanggan','foto hasil',true]]},
    deep:{code:'D-002', title:'Deep Cleaning', ppe:['gloves','mask','shoes','goggles'],
      alat:[['Sikat nat & scraper',''],['Steam cleaner',''],['Tangga 1,5 m','maksimal jangkauan aman'],['Vacuum basah-kering','']],
      chem:[['Degreaser dapur','1:10 · kontak 5 menit'],['Penghilang kerak kamar mandi','asam ringan'],['Desinfektan permukaan','1:100']],
      steps:[['Survei ulang & foto area kritis','',true],['Degrease dapur, hood, backsplash','',true],['Angkat kerak & noda kuning kamar mandi','',true],['Detail dusting plafon, ventilasi, lampu','',false],['Cuci lantai menyeluruh','',false],['Verifikasi bersama pelanggan','foto sesudah',true]]},
    ac:{code:'D-014', title:'Cuci & Servis AC', ppe:['gloves','mask','shoes','goggles'],
      alat:[['Jet pump bertekanan',''],['Cover bag AC','wajib, cegah cipratan'],['Terpal pelindung lantai',''],['Multimeter & termometer','']],
      chem:[['Cairan pembersih evaporator','khusus AC'],['Desinfektan coil','']],
      steps:[['Matikan listrik unit & pasang cover','',true],['Foto kondisi filter & coil','',true],['Cuci indoor: filter, evaporator, blower','',true],['Cuci outdoor & bilas condenser','',false],['Flush saluran pembuangan','cek tidak menetes',false],['Uji suhu & tekanan, catat di laporan','',true]]},
    sofa:{code:'D-016', title:'Cuci Sofa, Kasur & Karpet', ppe:['gloves','mask','shoes'],
      alat:[['Mesin wet vacuum',''],['Sikat upholstery lembut',''],['Blower pengering','']],
      chem:[['Sampo upholstery','1:20'],['Penghilang noda enzimatik','uji di area tersembunyi']],
      steps:[['Uji bahan di area tersembunyi','',true],['Vakum kering menyeluruh','',false],['Aplikasi sampo & sikat','',true],['Ekstraksi wet vacuum minimal 2×','',false],['Pengeringan dengan blower','',false],['Serah terima, ingatkan waktu kering','',true]]},
    laundry:{code:'D-020', title:'Laundry & Penanganan Linen', ppe:['gloves','mask'],
      alat:[['Timbangan digital',''],['Kantong terpisah per pelanggan','cegah tercampur'],['Label barcode','']],
      chem:[['Deterjen cair','sesuai jenis kain'],['Pelembut & pewangi','opsional']],
      steps:[['Timbang & foto di depan pelanggan','',true],['Pilah warna, bahan, dan noda khusus','',false],['Cuci sesuai program mesin','',false],['Keringkan & lipat','',false],['Cek kelengkapan terhadap daftar awal','',true],['Antar & serah terima','foto',true]]},
    iron:{code:'D-022', title:'Layanan Setrika', ppe:['gloves'],
      alat:[['Alat setrika (disediakan pelanggan)',''],['Meja setrika (pelanggan)',''],['Hanger','']],
      chem:[['Pelicin pakaian (pelanggan)','']],
      steps:[['Hitung & catat jumlah potong','',true],['Pisahkan bahan sensitif','tolak brukat, sutra, gaun pesta',false],['Setrika sesuai suhu bahan','',false],['Gantung atau lipat rapi','',false],['Serah terima sesuai hitungan awal','foto',true]]},
    office:{code:'D-005', title:'Cleaning Kantor & Lobby', ppe:['gloves','shoes'],
      alat:[['Dry mop & wet mop biru',''],['Trolley cleaning',''],['Window squeegee',''],['Vacuum 1200 W','']],
      chem:[['Pembersih lantai multi-purpose',''],['Glass cleaner',''],['Polish lantai marmer/granit','']],
      steps:[['Pasang rambu & amankan area','',false],['Kosongkan tempat sampah & ganti liner','',false],['Dusting meja, partisi, pegangan','',false],['Bersihkan kaca & pintu utama','',true],['Pel lantai lobby & koridor','',true],['Inspeksi supervisor & tanda tangan','',true]]},
    disinfect:{code:'B-004', title:'Fogging Disinfektan (ULV)', ppe:['gloves','mask','shoes','goggles','coverall','respirator'],
      alat:[['Mesin ULV fogger',''],['Corong & gelas ukur',''],['Rambu larangan masuk','']],
      chem:[['Cairan sterilisasi berizin','dosis sesuai volume ruangan']],
      steps:[['Pastikan ruangan kosong dari orang & hewan','',true],['Tutup makanan, dokumen, elektronik','',true],['Atur dosis sesuai volume ruangan','',false],['Fogging menyeluruh tanpa area terlewat','',true],['Pasang rambu: ruangan dipakai 2 jam lagi','',true],['Catat dosis & waktu di laporan','',false]]},
    car:{code:'D-026', title:'Cuci Mobil di Lokasi', ppe:['gloves','shoes'],
      alat:[['Ember & mitt microfiber',''],['Vacuum interior',''],['Kanebo & lap kering','']],
      chem:[['Sabun mobil pH netral',''],['Clean & shine interior',''],['Semir ban','']],
      steps:[['Foto kondisi awal termasuk goresan lama','',true],['Cuci eksterior termasuk kolong','',false],['Bersihkan seluruh kaca','',false],['Vakum interior & cuci karpet','',true],['Semir ban & lap kering','',false],['Serah terima bersama pemilik','foto',true]]},
    hydro:{code:'D-031', title:'Hydro Cleaning (Vakum Tungau)', ppe:['gloves','mask','shoes'],
      alat:[['Mesin hydro 1000 W',''],['Head ekstraksi kasur & sofa',''],['Blower cepat kering','']],
      chem:[['Cairan anti-tungau','aman untuk bayi'],['Deodorizer kain','']],
      steps:[['Ukur luas item & catat','karpet/gorden per m²',true],['Pastikan material kering','tolak bila lembap',false],['Vakum kering putaran pertama','',false],['Ekstraksi hydro putaran kedua','minimal 2×',true],['Aplikasi anti-tungau & blower','',false],['Foto sesudah & catat waktu kering','',true]]},
    poles:{code:'D-032', title:'Poles Lantai & Kristalisasi', ppe:['gloves','mask','shoes','goggles','earmuff'],
      alat:[['Mesin poles lantai',''],['Pad putih, merah, hitam',''],['Wet vacuum',''],['Rambu & barikade','']],
      chem:[['Bubuk kristalisasi marmer',''],['Stripper lantai','hanya bila diinstruksikan'],['Sealer','opsional']],
      steps:[['Kosongkan area & pasang barikade','',true],['Foto goresan & kerusakan awal','',true],['Grinding/pad kasar bila perlu','',false],['Aplikasi bubuk kristalisasi & poles','',true],['Angkat residu dengan wet vacuum','',false],['Foto hasil kilap & serah terima','',true]]},
    pest:{code:'B-009', title:'Pest Control & Pestisida Berizin', ppe:['gloves','mask','shoes','goggles','coverall','respirator'],
      alat:[['Sprayer bertekanan',''],['Umpan & bait station',''],['Senter & cermin inspeksi',''],['Rambu larangan masuk','']],
      chem:[['Insektisida berizin Kemenkes','catat nomor izin & dosis'],['Rodentisida','hanya di bait station terkunci'],['Gel kecoa','']],
      steps:[['Inspeksi & petakan titik temuan','foto',true],['Pastikan penghuni & hewan keluar','',true],['Aplikasi sesuai dosis per titik','catat volume',true],['Pasang bait station di titik aman','',false],['Pasang rambu & jelaskan waktu aman masuk','',true],['Jadwalkan kunjungan ulang 30 hari','',false]]},
    pool:{code:'D-033', title:'Perawatan Kolam & Log Kimia', ppe:['gloves','goggles','shoes','apron'],
      alat:[['Sikat dinding kolam',''],['Vacuum kolam & selang',''],['Jaring skimmer',''],['Test kit pH & klorin','']],
      chem:[['Klorin granul/cair','dosis per volume air'],['pH plus / pH minus',''],['Algasida','']],
      steps:[['Uji pH & klorin, catat di log','',true],['Angkat kotoran permukaan','',false],['Sikat dinding & dasar kolam','',false],['Vakum dasar kolam','',true],['Sesuaikan dosis kimia','tunggu sirkulasi',true],['Uji ulang & lampirkan log ke laporan','',true]]},
    toren:{code:'D-034', title:'Pembersihan Toren & Tangki Air', ppe:['gloves','mask','shoes','boots','harness'],
      alat:[['Pompa kuras',''],['Sikat tangki khusus',''],['Selang bilas',''],['Tangga & pengaman','']],
      chem:[['Cairan sterilisasi food-grade','aman air minum']],
      steps:[['Matikan pompa & tutup jalur masuk','',true],['Foto kondisi dalam tangki','',true],['Kuras & angkat endapan','',false],['Sikat dinding & dasar tangki','',true],['Sterilisasi food-grade & bilas','',true],['Isi ulang, cek tutup & pelampung','',false]]},
    postreno:{code:'D-035', title:'Pembersihan Pasca Renovasi', ppe:['gloves','mask','shoes','goggles','helmet'],
      alat:[['Vacuum industri HEPA',''],['Scraper & silet kaca',''],['Tangga & terpal',''],['Karung puing','']],
      chem:[['Pelarut noda cat & semen','uji dulu di sudut'],['Degreaser umum','']],
      steps:[['Pastikan kontraktor sudah selesai','',true],['Angkat puing & sisa material','',true],['Kerok noda cat, semen, lem','kaca, keramik, kusen',true],['Vakum HEPA debu halus 2 putaran','',false],['Purge debu AC & ventilasi','',false],['Pel akhir & foto serah terima','',true]]},
    tankbig:{code:'B-010', title:'Tangki Gedung · Ruang Terbatas', ppe:['gloves','mask','shoes','goggles','coverall','harness','gasdetect'],
      alat:[['Pompa industri',''],['Kit ruang terbatas & tali',''],['Blower ventilasi',''],['Lampu kerja tahan air','']],
      chem:[['Sterilisasi food-grade skala besar',''],['Penetral endapan','']],
      steps:[['Izin kerja tertulis dari gedung','tanpa ini pekerjaan batal',true],['Uji gas & ventilasi paksa','',true],['Petugas pengawas berjaga di luar','wajib',true],['Kuras, semprot tekanan tinggi, angkat lumpur','',true],['Sterilisasi & bilas menyeluruh','',true],['Ambil sampel air & tutup izin kerja','',true]]},
    care:{code:'C-001', title:'Perawatan Lansia, Anak & Pasien', ppe:['gloves','mask'],
      alat:[['Kartu identitas & sertifikat P3K','tunjukkan saat tiba'],['Termometer & tensimeter','catat di laporan'],['Sarung tangan sekali pakai','']],
      chem:[['Hand sanitizer','sebelum & sesudah kontak'],['Sabun cuci tangan','']],
      steps:[['Serah terima dengan keluarga','baca rencana perawatan, foto daftar obat',true],['Cek kondisi & kebutuhan awal','suhu, tekanan darah bila diminta',false],['Bantu makan & minum sesuai jadwal','',false],['Bantu mandi, ganti pakaian, toileting','jaga privasi',false],['Ingatkan obat sesuai resep','catat jam & dosis',true],['Laporan akhir & serah terima kembali','foto catatan harian',true]]},
    errand:{code:'C-002', title:'Belanja & Titip Barang', ppe:['mask'],
      alat:[['Tas belanja & tas pendingin',''],['Ponsel berkamera','foto struk'],['Helm & jas hujan','']],
      chem:[],
      steps:[['Konfirmasi daftar belanja lewat chat','sebut merek & pengganti yang boleh',false],['Foto barang sebelum bayar','',true],['Foto struk & total','',true],['Antar ke alamat','kabari saat 5 menit lagi',false],['Serah terima & cocokkan struk','foto barang diterima',true]]},
    massage:{code:'C-003', title:'Pijat & Perawatan Tubuh', ppe:['mask'],
      alat:[['Sprei & handuk bersih','satu set per pelanggan'],['Minyak pijat & lulur','tanya alergi dulu'],['Meja pijat lipat','bila dipesan']],
      chem:[['Hand sanitizer','sebelum & sesudah'],['Minyak pijat hipoalergenik','']],
      steps:[['Tanya riwayat kesehatan & area yang dihindari','catat',false],['Siapkan ruang, sprei, handuk','foto',true],['Sesi pijat sesuai pilihan','jaga batas profesional',false],['Kompres hangat & air minum','',false],['Rapikan & serah terima','foto ruang rapi',true]]},
    cook:{code:'C-004', title:'Memasak & Meal Prep', ppe:['gloves','mask','apron'],
      alat:[['Hairnet & apron','pakai sebelum masuk dapur'],['Termometer makanan','daging ≥ 75 °C'],['Wadah & label tanggal','untuk meal prep']],
      chem:[['Sabun cuci tangan','20 detik sebelum mulai'],['Sabun cuci piring',''],['Sanitizer talenan','setelah daging mentah']],
      steps:[['Cek menu, alergi, dan bahan bersama pelanggan','foto bahan',true],['Cuci tangan, pakai hairnet & apron','',false],['Pisahkan talenan daging & sayur','',false],['Masak sesuai menu, cek suhu','catat suhu daging',false],['Porsi & label wadah meal prep','tanggal masak',true],['Cuci alat, lap kompor & meja','foto dapur bersih',true]]},
    building:{code:'B-011', title:'Paket Berkala Gedung', ppe:['gloves','mask','shoes','goggles'],
      alat:[['Mesin polisher & wet vacuum',''],['Pompa toren & alat kolam',''],['Checklist harian per lantai','ditandatangani supervisor']],
      chem:[['Pembersih lantai multi-purpose','1:40'],['Desinfektan handrail & tombol lift','1:100'],['Kaporit & pH kolam','sesuai log']],
      steps:[['Briefing tim & cek jadwal bulan ini','foto papan jadwal',true],['Lobi, lift, koridor: sapu, pel, lap','harian',false],['Kolam: sikat, vakum, cek pH','mingguan, catat log',true],['Toren: kuras & sterilisasi','tiap 6 bulan, foto sebelum–sesudah',true],['Inspeksi supervisor & temuan','',false],['Laporan bulanan ke pengelola','foto & log kimia',true]]},
    'default':{code:'D-012', title:'Pembersihan Toilet & Urinal', ppe:['gloves','mask','shoes'],
      alat:[['Sikat toilet & sikat nat','kode warna biru'],['Wet mop + ember biru','khusus area toilet'],['Lap microfiber biru','ganti tiap 2 bilik'],['Spray bottle berlabel','tidak boleh tanpa label'],['Rambu lantai basah','pasang sebelum mulai']],
      chem:[['Pembersih porselen (asam ringan)','1:20 · kontak 3 menit'],['Desinfektan permukaan','1:100 · jangan dicampur'],['Pembersih kaca/cermin','semprot ke lap'],['Pewangi ruangan','setelah lantai kering']],
      steps:[['Pasang rambu “sedang dibersihkan”','tutup akses, pastikan ventilasi',false],['Buang sampah & ganti liner','pilah sesuai B-003',false],['Semprot & sikat urinal dan kloset','kimia biru, kontak 3 menit',true],['Bersihkan wastafel dan cermin','lap microfiber biru',true],['Isi ulang sabun, tisu, pengharum','catat di H-002',false],['Pel lantai & angkat rambu','pastikan kering',true]]}
  };
  var PPE_LABELS = { gloves:'Sarung tangan', mask:'Masker', shoes:'Sepatu safety', goggles:'Kacamata',
    coverall:'Coverall', respirator:'Respirator', earmuff:'Pelindung telinga', apron:'Apron kimia',
    boots:'Sepatu boot', harness:'Harness', helmet:'Helm', gasdetect:'Detektor gas' };
  var FINDINGS = [['none','Tidak ada'],['damage','Kerusakan fasilitas'],['complaint','Keluhan pengguna'],['stock','Stok habis']];

  /* --------------------------------------------- wilayah administratif
     11 negara ASEAN + 38 provinsi Indonesia, dimuat sebagian. Di produksi
     diganti API Kemendagri — SIMPAN KODE WILAYAH, BUKAN NAMANYA. */
  var WILAYAH = {
    negara:['Indonesia','Malaysia','Singapura','Brunei Darussalam','Thailand','Vietnam','Filipina','Kamboja','Laos','Myanmar','Timor-Leste'],
    provinsi:{
      'Indonesia':['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Bengkulu','Sumatera Selatan','Kepulauan Bangka Belitung','Lampung','Banten','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Gorontalo','Sulawesi Tengah','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tenggara','Maluku','Maluku Utara','Papua','Papua Barat','Papua Barat Daya','Papua Tengah','Papua Pegunungan','Papua Selatan'],
      'Malaysia':['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu','WP Kuala Lumpur','WP Labuan','WP Putrajaya'],
      'Singapura':['Central Region','East Region','North Region','North-East Region','West Region'],
      'Brunei Darussalam':['Brunei-Muara','Belait','Tutong','Temburong'],
      'Thailand':['Bangkok','Chiang Mai','Chon Buri','Khon Kaen','Nonthaburi','Phuket','Samut Prakan','Songkhla'],
      'Vietnam':['Hà Nội','TP Hồ Chí Minh','Đà Nẵng','Hải Phòng','Cần Thơ','Bình Dương','Đồng Nai','Khánh Hòa'],
      'Filipina':['Metro Manila (NCR)','Calabarzon','Central Luzon','Central Visayas','Western Visayas','Davao Region','Northern Mindanao','Ilocos Region'],
      'Kamboja':['Phnom Penh','Siem Reap','Battambang','Kandal','Preah Sihanouk'],
      'Laos':['Vientiane Prefecture','Vientiane Province','Luang Prabang','Savannakhet','Champasak'],
      'Myanmar':['Yangon','Mandalay','Naypyidaw','Bago','Ayeyarwady'],
      'Timor-Leste':['Díli','Baucau','Bobonaro','Ermera','Liquiçá'] },
    kabkota:{
      'Banten':['Kota Tangerang Selatan','Kota Tangerang','Kota Serang','Kota Cilegon','Kabupaten Tangerang','Kabupaten Serang','Kabupaten Lebak','Kabupaten Pandeglang'],
      'DKI Jakarta':['Kota Jakarta Pusat','Kota Jakarta Utara','Kota Jakarta Barat','Kota Jakarta Selatan','Kota Jakarta Timur','Kabupaten Kepulauan Seribu'],
      'Jawa Barat':['Kota Bandung','Kota Bekasi','Kota Bogor','Kota Cimahi','Kota Cirebon','Kota Depok','Kota Sukabumi','Kota Tasikmalaya','Kota Banjar','Kabupaten Bandung','Kabupaten Bandung Barat','Kabupaten Bekasi','Kabupaten Bogor','Kabupaten Ciamis','Kabupaten Cianjur','Kabupaten Cirebon','Kabupaten Garut','Kabupaten Indramayu','Kabupaten Karawang','Kabupaten Kuningan','Kabupaten Majalengka','Kabupaten Pangandaran','Kabupaten Purwakarta','Kabupaten Subang','Kabupaten Sukabumi','Kabupaten Sumedang','Kabupaten Tasikmalaya'],
      'Jawa Tengah':['Kota Semarang','Kota Surakarta','Kota Salatiga','Kota Magelang','Kota Pekalongan','Kota Tegal','Kabupaten Banyumas','Kabupaten Cilacap','Kabupaten Kudus','Kabupaten Sukoharjo'],
      'DI Yogyakarta':['Kota Yogyakarta','Kabupaten Sleman','Kabupaten Bantul','Kabupaten Kulon Progo','Kabupaten Gunungkidul'],
      'Jawa Timur':['Kota Surabaya','Kota Malang','Kota Batu','Kota Kediri','Kota Madiun','Kota Mojokerto','Kota Pasuruan','Kota Probolinggo','Kota Blitar','Kabupaten Sidoarjo','Kabupaten Gresik','Kabupaten Jember','Kabupaten Banyuwangi'],
      'Bali':['Kota Denpasar','Kabupaten Badung','Kabupaten Gianyar','Kabupaten Tabanan','Kabupaten Buleleng','Kabupaten Klungkung','Kabupaten Bangli','Kabupaten Karangasem','Kabupaten Jembrana'],
      'Sumatera Utara':['Kota Medan','Kota Binjai','Kota Pematangsiantar','Kota Tebing Tinggi','Kabupaten Deli Serdang','Kabupaten Karo','Kabupaten Langkat'],
      'Sumatera Barat':['Kota Padang','Kota Bukittinggi','Kota Payakumbuh','Kabupaten Agam','Kabupaten Tanah Datar'],
      'Riau':['Kota Pekanbaru','Kota Dumai','Kabupaten Kampar','Kabupaten Siak','Kabupaten Bengkalis'],
      'Kepulauan Riau':['Kota Batam','Kota Tanjungpinang','Kabupaten Bintan','Kabupaten Karimun'],
      'Sumatera Selatan':['Kota Palembang','Kota Lubuklinggau','Kota Prabumulih','Kabupaten Banyuasin','Kabupaten Ogan Ilir'],
      'Lampung':['Kota Bandar Lampung','Kota Metro','Kabupaten Lampung Selatan','Kabupaten Pesawaran'],
      'Kalimantan Timur':['Kota Samarinda','Kota Balikpapan','Kota Bontang','Kabupaten Kutai Kartanegara','Kabupaten Penajam Paser Utara'],
      'Kalimantan Selatan':['Kota Banjarmasin','Kota Banjarbaru','Kabupaten Banjar','Kabupaten Tanah Laut'],
      'Kalimantan Barat':['Kota Pontianak','Kota Singkawang','Kabupaten Kubu Raya','Kabupaten Sambas'],
      'Sulawesi Selatan':['Kota Makassar','Kota Parepare','Kota Palopo','Kabupaten Gowa','Kabupaten Maros'],
      'Sulawesi Utara':['Kota Manado','Kota Bitung','Kota Tomohon','Kabupaten Minahasa'],
      'Papua':['Kota Jayapura','Kabupaten Jayapura','Kabupaten Keerom','Kabupaten Sarmi'] },
    kecamatan:{ 'Kota Tangerang Selatan':['Pondok Aren','Ciputat','Serpong'],
      'Kota Tangerang':['Karawaci','Cipondoh','Batuceper'],
      'Kabupaten Tangerang':['Kelapa Dua','Curug','Pagedangan'],
      'Kota Jakarta Selatan':['Kebayoran Baru','Mampang Prapatan','Cilandak'],
      'Kota Jakarta Pusat':['Menteng','Tanah Abang','Senen'],
      'Kota Jakarta Barat':['Kebon Jeruk','Palmerah','Grogol Petamburan'],
      'Kota Depok':['Beji','Cinere','Sawangan'],
      'Kota Bekasi':['Bekasi Selatan','Jatiasih','Pondok Gede'],
      'Kota Bogor':['Bogor Tengah','Tanah Sareal','Bogor Utara'] },
    desa:{ 'Pondok Aren':['Pondok Karya','Pondok Betung','Pondok Jaya'],
      'Ciputat':['Cipayung','Sawah Baru','Serua'],
      'Serpong':['Buaran','Ciater','Rawa Mekar Jaya'],
      'Kebayoran Baru':['Gunung','Kramat Pela','Melawai'],
      'Mampang Prapatan':['Bangka','Pela Mampang','Tegal Parang'],
      'Cilandak':['Cipete Selatan','Gandaria Selatan','Lebak Bulus'] },
    pos:{ 'Pondok Karya':['15225'],'Pondok Betung':['15221'],'Pondok Jaya':['15224'],
      'Cipayung':['15411'],'Sawah Baru':['15413'],'Serua':['15414'],
      'Buaran':['15310'],'Ciater':['15311'],'Rawa Mekar Jaya':['15310'],
      'Gunung':['12120'],'Kramat Pela':['12130'],'Melawai':['12160'],
      'Bangka':['12720'],'Pela Mampang':['12720'],'Tegal Parang':['12790'],
      'Cipete Selatan':['12410'],'Gandaria Selatan':['12420'],'Lebak Bulus':['12440'] }
  };
  var ADDR_ORDER = ['negara','provinsi','kabkota','kecamatan','desa','pos'];
  var ADDR_LABELS = { negara:'Negara', provinsi:'Provinsi', kabkota:'Kabupaten / Kota', kecamatan:'Kecamatan', desa:'Desa / Kelurahan', pos:'Kode pos' };

  var COVERAGE = {
    'Pondok Aren':{3:['Pondok Aren','Bintaro','Pondok Karya'],
      5:['Pondok Aren','Bintaro','Ciputat','Rempoa','Pesanggrahan'],
      10:['Pondok Aren','Ciputat','Kebayoran Lama','Pesanggrahan','Serpong','Cirendeu'],
      15:['Pondok Aren','Ciputat','Kebayoran Baru','Cilandak','Serpong','Pamulang','Cinere'],
      25:['Jakarta Selatan','Tangerang Selatan','Tangerang','Depok','Jakarta Barat','Kabupaten Tangerang']},
    'Ciputat':{3:['Ciputat','Ciputat Timur','Pamulang'],
      5:['Ciputat','Pamulang','Pondok Aren','Cirendeu'],
      10:['Ciputat','Pamulang','Pondok Aren','Cinere','Lebak Bulus','Serpong'],
      15:['Ciputat','Pamulang','Cilandak','Kebayoran Lama','Serpong','Sawangan','Cinere'],
      25:['Tangerang Selatan','Jakarta Selatan','Depok','Tangerang','Kabupaten Bogor']},
    'Kebayoran Baru':{3:['Kebayoran Baru','Mampang Prapatan','Kebayoran Lama'],
      5:['Kebayoran Baru','Cilandak','Mampang Prapatan','Pancoran','Setiabudi'],
      10:['Kebayoran Baru','Cilandak','Tebet','Pesanggrahan','Jagakarsa','Tanah Abang'],
      15:['Jakarta Selatan','Jakarta Pusat','Pondok Aren','Ciputat','Jakarta Timur'],
      25:['Jakarta Selatan','Jakarta Pusat','Jakarta Barat','Jakarta Timur','Tangerang Selatan','Depok']},
    'Cilandak':{3:['Cilandak','Pasar Minggu','Kebayoran Baru'],
      5:['Cilandak','Jagakarsa','Kebayoran Baru','Cinere'],
      10:['Cilandak','Jagakarsa','Pasar Minggu','Ciputat','Cinere','Kebayoran Lama'],
      15:['Jakarta Selatan','Tangerang Selatan','Depok','Kebayoran Baru'],
      25:['Jakarta Selatan','Depok','Tangerang Selatan','Jakarta Timur','Bogor']}
  };

  var TABS_CUSTOMER = [
    { id:'home',    key:'home',    d:'m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' },
    { id:'orders',  key:'orders',  d:'M6 2h12v20l-3-2-3 2-3-2-3 2ZM9 8h6M9 13h6' },
    { id:'wallet',  key:'wallet',  d:'M2 10a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z' },
    { id:'profile', key:'profile', d:'M20 21a8 8 0 0 0-16 0M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8' }
  ];
  var TABS_PARTNER = [
    { id:'pjobs',   label:'Job',         d:'M3 6h18M3 12h18M3 18h12' },
    { id:'pjob',    label:'Berjalan',    d:'m5 13 4 4L19 7' },
    { id:'pearn',   label:'Penghasilan', d:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { id:'profile', label:'Profil',      d:'M20 21a8 8 0 0 0-16 0M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8' }
  ];
  var TAB_SCREENS = ['home','orders','wallet','profile','pjobs','pearn'];
  var PARTNER_SCREENS = ['pjobs','pjob','proute','psop','pearn','preg','preport','pwallet'];

  var JUMP_CUSTOMER = [['onboard','Onboarding'],['signup','Sign up'],['home','Home'],['catalog','All services'],['prepaid','Prepaid'],['svc','Book 1'],['cleaner','Book 2'],['review','Book 3'],['success','Confirmed'],['track','Track'],['orders','Orders'],['wallet','Wallet'],['rate','Rate'],['share','Share'],['issue','Claim'],['report','Before-after'],['terms','Terms'],['lang','Language'],['profile','Profile']];
  var JUMP_PARTNER  = [['preg','Daftar mitra'],['pjobs','Job feed'],['pjob','Active job'],['proute','Route'],['psop','SOP checklist'],['preport','Before-after'],['pearn','Earnings'],['pwallet','Dompet mitra']];

  return {
    SERVICES: SERVICES, DEFAULT_QTY: DEFAULT_QTY, MIN_QTY: MIN_QTY, STEP_QTY: STEP_QTY, SURVEY_FIRST: SURVEY_FIRST,
    CATALOG_GROUPS: CATALOG_GROUPS, HOME_TILES: HOME_TILES, CLEANERS: CLEANERS, MIN_FACTOR: MIN_FACTOR,
    ADDON_SETS: ADDON_SETS, TIMES: TIMES, VOUCHER: VOUCHER, PLATFORM_FEE: PLATFORM_FEE, CREW_FEE: CREW_FEE,
    PAYMENTS: PAYMENTS, STAGES: STAGES, CHECK_IDS: CHECK_IDS, CHECK_KEYS: CHECK_KEYS, CHECK_ID_LABELS: CHECK_ID_LABELS, CHECK_TIMES: CHECK_TIMES,
    ISSUES: ISSUES, PRAISE: PRAISE, TIPS: TIPS, PAST_ORDERS: PAST_ORDERS, TXNS: TXNS, ADDRESSES: ADDRESSES,
    NOTIFS: NOTIFS, CHAT_START: CHAT_START, SETTINGS: SETTINGS, SHARE_TARGETS: SHARE_TARGETS, PREPAID: PREPAID, TRANSPORT: TRANSPORT,
    SERVICE_TERMS: SERVICE_TERMS, GENERAL_TERMS: GENERAL_TERMS, PREPAID_TERMS: PREPAID_TERMS, PRIVACY_TERMS: PRIVACY_TERMS,
    PARTNER_JOBS: PARTNER_JOBS, PEAK_DAY: PEAK_DAY, BARS: BARS, STANDING: STANDING, PARTNER_ISSUES: PARTNER_ISSUES,
    WD_HISTORY: WD_HISTORY, BANKS: BANKS, WD_METHODS: WD_METHODS,
    REG_DOCS: REG_DOCS, REG_REQUIRED: REG_REQUIRED, REG_TIMELINE: REG_TIMELINE, KIN_RELS: KIN_RELS,
    RADII: RADII, RADIUS_JOBS: RADIUS_JOBS, RADIUS_TRAVEL: RADIUS_TRAVEL, REPORT_AREAS: REPORT_AREAS,
    SOP_META: SOP_META, PPE_LABELS: PPE_LABELS, FINDINGS: FINDINGS,
    WILAYAH: WILAYAH, ADDR_ORDER: ADDR_ORDER, ADDR_LABELS: ADDR_LABELS, COVERAGE: COVERAGE,
    TABS_CUSTOMER: TABS_CUSTOMER, TABS_PARTNER: TABS_PARTNER, TAB_SCREENS: TAB_SCREENS, PARTNER_SCREENS: PARTNER_SCREENS,
    JUMP_CUSTOMER: JUMP_CUSTOMER, JUMP_PARTNER: JUMP_PARTNER
  };
})();
