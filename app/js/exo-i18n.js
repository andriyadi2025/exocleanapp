/* ==========================================================================
   exo-i18n.js — kamus 12 bahasa EXOCLEAN App
   --------------------------------------------------------------------------
   Disalin dari blok skrip "EXOCLEAN App.dc.html" (this.T, this.STR,
   SERVICE_NAMES, WARRANTY, UNIT_LABELS, UNIT_COUNT, LOCALES, LANGS).

   Dua mekanisme, seperti di rancangan:
     t('quickBook')            — kamus berkunci semantik, untuk label UI
     tx('Available cleaners')  — kamus berkunci teks sumber Inggris, untuk
                                 teks yang datang dari array data
   Keduanya jatuh ke Inggris bila terjemahannya belum ada. Nama hari dan
   tanggal dibentuk lewat Intl.DateTimeFormat dengan peta LOCALES, bukan
   literal. Bahasa Arab memakai tata letak kanan-ke-kiri.

   Saat produksi, pindahkan tiap bahasa ke berkas JSON sendiri dan pakai
   pustaka i18n standar; bentuk kuncinya sudah siap dipindahkan.
   ========================================================================== */
var EXO_I18N = (function () {
  'use strict';

  var LANGS = [
    { code:'en', label:'English',    native:'English',          region:'Default' },
    { code:'id', label:'Indonesian', native:'Bahasa Indonesia', region:'Indonesia' },
    { code:'ja', label:'Japanese',   native:'日本語',            region:'Japan' },
    { code:'ko', label:'Korean',     native:'한국어',            region:'Korea' },
    { code:'zh', label:'Chinese',    native:'中文（简体）',        region:'China' },
    { code:'ar', label:'Arabic',     native:'العربية',           region:'Middle East · RTL' },
    { code:'ms', label:'Malay',      native:'Bahasa Melayu',    region:'Malaysia · Brunei' },
    { code:'th', label:'Thai',       native:'ไทย',              region:'Thailand' },
    { code:'vi', label:'Vietnamese', native:'Tiếng Việt',       region:'Vietnam' },
    { code:'tl', label:'Filipino',   native:'Filipino',         region:'Philippines' },
    { code:'km', label:'Khmer',      native:'ភាសាខ្មែរ',          region:'Cambodia' },
    { code:'my', label:'Burmese',    native:'မြန်မာ',            region:'Myanmar' }
  ];

  var LOCALES = { en:'en-GB', id:'id-ID', ja:'ja-JP', ko:'ko-KR', zh:'zh-CN', ar:'ar-EG', ms:'ms-MY', th:'th-TH', vi:'vi-VN', tl:'fil-PH', km:'km-KH', my:'my-MM' };

  var T = {
    home:      {en:'Home', id:'Beranda', ja:'ホーム', ko:'홈', zh:'首页', ar:'الرئيسية', ms:'Utama', th:'หน้าแรก', vi:'Trang chủ', tl:'Home', km:'ទំព័រដើម', my:'ပင်မ'},
    orders:    {en:'Orders', id:'Pesanan', ja:'注文', ko:'주문', zh:'订单', ar:'الطلبات', ms:'Pesanan', th:'คำสั่ง', vi:'Đơn hàng', tl:'Mga order', km:'ការបញ្ជាទិញ', my:'အော်ဒါ'},
    wallet:    {en:'Wallet', id:'Dompet', ja:'ウォレット', ko:'지갑', zh:'钱包', ar:'المحفظة', ms:'Dompet', th:'กระเป๋าเงิน', vi:'Ví', tl:'Wallet', km:'កាបូប', my:'ပိုက်ဆံအိတ်'},
    profile:   {en:'Profile', id:'Profil', ja:'プロフィール', ko:'프로필', zh:'我的', ar:'الحساب', ms:'Profil', th:'โปรไฟล์', vi:'Hồ sơ', tl:'Profile', km:'ប្រវត្តិរូប', my:'ကိုယ်ရေး'},
    cleaningAt:{en:'Cleaning at', id:'Bersih-bersih di', ja:'清掃場所', ko:'청소 위치', zh:'清洁地点', ar:'مكان التنظيف', ms:'Pembersihan di', th:'ทำความสะอาดที่', vi:'Dọn dẹp tại', tl:'Lilinisin sa', km:'សម្អាតនៅ', my:'သန့်ရှင်းရေးနေရာ'},
    whatNeeds: {en:'What needs cleaning?', id:'Mau bersihkan apa?', ja:'何を掃除しますか？', ko:'무엇을 청소할까요?', zh:'需要清洁什么？', ar:'ما الذي تريد تنظيفه؟', ms:'Apa yang perlu dibersihkan?', th:'ต้องการทำความสะอาดอะไร', vi:'Bạn cần dọn gì?', tl:'Ano ang lilinisin?', km:'ត្រូវសម្អាតអ្វី?', my:'ဘာသန့်ရှင်းမလဲ'},
    nextVisit: {en:'Your next visit', id:'Kunjungan berikutnya', ja:'次回の訪問', ko:'다음 방문', zh:'下次服务', ar:'زيارتك القادمة', ms:'Lawatan seterusnya', th:'การเข้าครั้งถัดไป', vi:'Lượt tới', tl:'Susunod na bisita', km:'ការមកលើកក្រោយ', my:'နောက်လာမည့်'},
    nearYou:   {en:'Cleaners near you', id:'Petugas di dekat Anda', ja:'近くのスタッフ', ko:'가까운 클리너', zh:'附近的清洁师', ar:'عمال قريبون منك', ms:'Petugas berdekatan', th:'พนักงานใกล้คุณ', vi:'Nhân viên gần bạn', tl:'Mga malapit', km:'អ្នកសម្អាតជិតអ្នក', my:'အနီးအနားဝန်ထမ်း'},
    seeAll:    {en:'See all', id:'Lihat semua', ja:'すべて見る', ko:'전체 보기', zh:'查看全部', ar:'عرض الكل', ms:'Lihat semua', th:'ดูทั้งหมด', vi:'Xem tất cả', tl:'Tingnan lahat', km:'មើលទាំងអស់', my:'အားလုံးကြည့်'},
    trackLive: {en:'Track live', id:'Lacak langsung', ja:'追跡', ko:'실시간 추적', zh:'实时追踪', ar:'تتبع مباشر', ms:'Jejak langsung', th:'ติดตามสด', vi:'Theo dõi', tl:'Subaybayan', km:'តាមដាន', my:'တိုက်ရိုက်'},
    searchHint:{en:'Search “AC service”, “deep clean”…', id:'Cari “cuci AC”, “deep cleaning”…', ja:'「エアコン清掃」を検索', ko:'“에어컨 청소” 검색', zh:'搜索“空调清洗”', ar:'ابحث عن «تنظيف المكيف»', ms:'Cari “cuci AC”…', th:'ค้นหา “ล้างแอร์”', vi:'Tìm “vệ sinh máy lạnh”', tl:'Maghanap ng “AC service”', km:'ស្វែងរក “សម្អាតម៉ាស៊ីនត្រជាក់”', my:'“AC သန့်ရှင်းရေး” ရှာပါ'},
    guarantee: {en:'Schedule-locked promise', id:'Jaminan jadwal terkunci', ja:'予定確約の約束', ko:'일정 고정 약속', zh:'时间锁定承诺', ar:'وعد بموعد ثابت', ms:'Jaminan jadual terkunci', th:'สัญญาล็อกเวลา', vi:'Cam kết giữ lịch', tl:'Nakalock na iskedyul', km:'ការធានាកាលវិភាគ', my:'အချိန်အာမခံ'},
    beforeAfter:{en:'Before & after report', id:'Laporan sebelum–sesudah', ja:'作業前後レポート', ko:'전후 리포트', zh:'前后对比报告', ar:'تقرير قبل وبعد', ms:'Laporan sebelum–selepas', th:'รายงานก่อน–หลัง', vi:'Báo cáo trước–sau', tl:'Before at after', km:'របាយការណ៍មុន–ក្រោយ', my:'မတိုင်မီ–ပြီးနောက်'},
    reportProof:{en:'Photos are stamped with time and location and cannot be edited by the cleaner. If anything is not right, raise a claim straight from this report.',
      id:'Foto berstempel waktu dan lokasi, tidak bisa diedit petugas. Jika ada yang tidak sesuai, ajukan klaim langsung dari laporan ini.',
      ja:'写真には時刻と位置が記録され、スタッフは編集できません。不備があれば、このレポートから直接申請できます。',
      ko:'사진에는 시간과 위치가 기록되며 클리너가 수정할 수 없습니다. 문제가 있으면 이 리포트에서 바로 청구하세요.',
      zh:'照片带有时间和位置戳记，清洁师无法修改。如有不妥，可直接从本报告发起申请。',
      ar:'الصور مختومة بالوقت والموقع ولا يمكن للعامل تعديلها. إذا كان هناك خطأ، قدّم مطالبة من هذا التقرير مباشرة.',
      ms:'Foto dicap dengan masa dan lokasi serta tidak boleh diedit petugas. Jika ada yang tidak kena, buat tuntutan terus dari laporan ini.',
      th:'รูปมีตราเวลาและตำแหน่ง พนักงานแก้ไขไม่ได้ หากมีสิ่งใดไม่ถูกต้อง ยื่นเคลมได้จากรายงานนี้',
      vi:'Ảnh có dấu thời gian và vị trí, nhân viên không thể chỉnh sửa. Nếu có gì chưa ổn, hãy gửi yêu cầu ngay từ báo cáo này.',
      tl:'May time at location stamp ang mga larawan at hindi ito maaaring baguhin ng tauhan. Kung may mali, mag-claim mula rito.',
      km:'រូបថតមានពេលវេលា និងទីតាំង មិនអាចកែបាន។ បើមានបញ្ហា សូមដាក់ពាក្យពីរបាយការណ៍នេះ។',
      my:'ဓာတ်ပုံများတွင် အချိန်နှင့်တည်နေရာ မှတ်တမ်းပါပြီး ဝန်ထမ်းပြင်၍မရပါ။ မမှန်ကန်ပါက ဤအစီရင်ခံစာမှတိုက်ရိုက်တောင်းဆိုပါ။'},
    howMany:{en:'How many', id:'Berapa', ja:'数量', ko:'수량', zh:'数量', ar:'كم عدد', ms:'Berapa', th:'จำนวน', vi:'Số lượng', tl:'Ilan', km:'ចំនួន', my:'ဘယ်နှစ်'},
    howLong:{en:'How long', id:'Berapa lama', ja:'作業時間', ko:'작업 시간', zh:'时长', ar:'كم المدة', ms:'Berapa lama', th:'นานเท่าไร', vi:'Bao lâu', tl:'Gaano katagal', km:'រយៈពេលប៉ុន្មាន', my:'ဘယ်လောက်ကြာ'},
    crew1:{en:'1 cleaner', id:'1 petugas', ja:'スタッフ1名', ko:'1명', zh:'1位清洁师', ar:'عامل واحد', ms:'1 petugas', th:'1 คน', vi:'1 nhân viên', tl:'1 tauhan', km:'១ នាក់', my:'၁ ဦး'},
    crew2:{en:'2 cleaners', id:'2 petugas', ja:'スタッフ2名', ko:'2명', zh:'2位清洁师', ar:'عاملان', ms:'2 petugas', th:'2 คน', vi:'2 nhân viên', tl:'2 tauhan', km:'២ នាក់', my:'၂ ဦး'},
    onSite:{en:'on site', id:'di lokasi', ja:'現地作業', ko:'현장 작업', zh:'现场', ar:'في الموقع', ms:'di lokasi', th:'ที่หน้างาน', vi:'tại chỗ', tl:'sa lugar', km:'នៅទីតាំង', my:'နေရာတွင်'},
    standardPace:{en:'standard pace', id:'kecepatan standar', ja:'標準ペース', ko:'표준 속도', zh:'常规节奏', ar:'وتيرة عادية', ms:'kelajuan biasa', th:'ความเร็วปกติ', vi:'tốc độ chuẩn', tl:'karaniwang bilis', km:'ល្បឿនធម្មតា', my:'ပုံမှန်နှုန်း'},
    samePrice:{en:'same price', id:'harga sama', ja:'同じ料金', ko:'같은 가격', zh:'价格相同', ar:'نفس السعر', ms:'harga sama', th:'ราคาเท่ากัน', vi:'cùng giá', tl:'parehong presyo', km:'តម្លៃដូចគ្នា', my:'စျေးတူ'},
    halfTime:{en:'finishes in half the time', id:'selesai dua kali lebih cepat', ja:'半分の時間で完了', ko:'절반 시간에 완료', zh:'用时减半', ar:'ينتهي في نصف الوقت', ms:'siap separuh masa', th:'เสร็จเร็วขึ้นเท่าตัว', vi:'xong nhanh gấp đôi', tl:'kalahating oras lang', km:'បញ្ចប់លឿនទ្វេដង', my:'တစ်ဝက်အချိန်ဖြင့်ပြီး'},
    quickBook:{en:'Quick book', id:'Pesan cepat', ja:'かんたん予約', ko:'빠른 예약', zh:'快速预约', ar:'حجز سريع', ms:'Tempah pantas', th:'จองด่วน', vi:'Đặt nhanh', tl:'Mabilis mag-book', km:'កក់រហ័ស', my:'အမြန်မှာ'},
    quickNote:{en:'3-hour clean tomorrow 09:00 · best cleaner picked for you', id:'Cleaning 3 jam besok 09:00 · petugas terbaik dipilihkan', ja:'明日9時に3時間清掃・最適なスタッフを自動選択', ko:'내일 09:00 3시간 청소 · 최적 클리너 자동 선택', zh:'明天09:00三小时清洁 · 自动为你选择清洁师', ar:'تنظيف ٣ ساعات غداً ٩:٠٠ · نختار لك الأفضل', ms:'Cleaning 3 jam esok 09:00 · petugas terbaik dipilih', th:'ทำความสะอาด 3 ชม. พรุ่งนี้ 09:00 · เลือกพนักงานให้', vi:'Dọn 3 giờ ngày mai 09:00 · chọn sẵn nhân viên tốt nhất', tl:'3 oras bukas 09:00 · pinili na ang tauhan', km:'សម្អាត៣ម៉ោងស្អែក ០៩:០០', my:'မနက်ဖြန် ၀၉:၀၀ ၃ နာရီ'},
    prepaidTtl:{en:'Prepaid packages', id:'Paket prepaid', ja:'プリペイドパック', ko:'선불 패키지', zh:'预付套餐', ar:'باقات مدفوعة مسبقاً', ms:'Pakej prabayar', th:'แพ็กเกจเติมเงิน', vi:'Gói trả trước', tl:'Prepaid packages', km:'កញ្ចប់បង់មុន', my:'ကြိုတင်ပက်ကေ့ဂျ်'},
    prepaidSub:{en:'Pay up front, lower hourly rate', id:'Bayar di muka, harga per jam lebih murah', ja:'前払いで時間単価が下がる', ko:'선불로 시간당 요금 절감', zh:'预付更省，每小时更便宜', ar:'ادفع مقدماً بسعر ساعة أقل', ms:'Bayar dahulu, kadar sejam lebih rendah', th:'จ่ายล่วงหน้า ราคาต่อชั่วโมงถูกลง', vi:'Trả trước, giá theo giờ rẻ hơn', tl:'Bayad muna, mas mura kada oras', km:'បង់មុន តម្លៃម៉ោងទាប', my:'ကြိုပေးလျှင်နာရီနှုန်းသက်သာ'},
    prepaidSave:{en:'Save up to 21% an hour', id:'Hemat sampai 21% per jam', ja:'1時間あたり最大21%お得', ko:'시간당 최대 21% 절약', zh:'每小时最高省21%', ar:'وفّر حتى ٢١٪ للساعة', ms:'Jimat sehingga 21% sejam', th:'ประหยัดสูงสุด 21% ต่อชม.', vi:'Tiết kiệm tới 21%/giờ', tl:'Makatipid ng hanggang 21%', km:'សន្សំដល់២១%', my:'၂၁% အထိသက်သာ'},
    buyPack:{en:'Buy package', id:'Beli paket', ja:'パックを購入', ko:'패키지 구매', zh:'购买套餐', ar:'شراء الباقة', ms:'Beli pakej', th:'ซื้อแพ็กเกจ', vi:'Mua gói', tl:'Bumili ng package', km:'ទិញកញ្ចប់', my:'ဝယ်ယူရန်'},
    packTerms:{en:'Short terms', id:'Ketentuan singkat', ja:'主な条件', ko:'주요 약관', zh:'简要条款', ar:'الشروط باختصار', ms:'Terma ringkas', th:'เงื่อนไขโดยย่อ', vi:'Điều khoản ngắn', tl:'Mga tuntunin', km:'លក្ខខណ្ឌសង្ខេប', my:'စည်းကမ်းအကျဉ်း'},
    packTermsBody:{en:'Valid for general cleaning and ironing · you still choose your own cleaner · the quota only works inside the package period · rescheduling within 4 hours deducts 1 hour · on refund we count hours used at the normal Rp75.000 rate and return the rest to your EXO Wallet.',
      id:'Berlaku untuk general cleaning dan setrika · Anda tetap bebas memilih petugas · kuota hanya berlaku dalam masa aktif paket · reschedule kurang dari 4 jam memotong 1 jam · refund menghitung jam terpakai pada tarif normal Rp75.000 dan sisanya kembali ke EXO Wallet.',
      ja:'一般清掃とアイロンに有効・スタッフは自分で選択可・有効期間内のみ利用可・4時間以内の変更は1時間控除・返金は通常料金Rp75.000で使用分を差し引きEXOウォレットへ返却。',
      ko:'일반 청소와 다림질에 사용 · 클리너 직접 선택 가능 · 유효 기간 내에만 사용 · 4시간 이내 변경 시 1시간 차감 · 환불 시 사용 시간을 정상요금 Rp75.000으로 계산 후 EXO 지갑으로 반환.',
      zh:'适用于日常清洁与熨烫 · 仍可自选清洁师 · 仅在有效期内使用 · 4小时内改期扣1小时 · 退款按正常价Rp75.000扣除已用时数，余额退回EXO钱包。',
      ar:'صالحة للتنظيف العام والكي · تختار عاملك بنفسك · الرصيد يعمل داخل مدة الباقة فقط · التغيير خلال ٤ ساعات يخصم ساعة · عند الاسترداد تُحسب الساعات المستخدمة بسعر Rp75.000 ويعاد الباقي إلى محفظتك.',
      ms:'Sah untuk general cleaning dan seterika · anda tetap pilih petugas · kuota hanya dalam tempoh pakej · tukar jadual bawah 4 jam potong 1 jam · refund kira jam terpakai pada Rp75.000 dan baki masuk EXO Wallet.',
      th:'ใช้ได้กับทำความสะอาดทั่วไปและรีดผ้า · เลือกพนักงานเองได้ · ใช้ได้ในระยะเวลาแพ็กเกจ · เลื่อนภายใน 4 ชม. หัก 1 ชม. · คืนเงินหักชั่วโมงที่ใช้ที่ Rp75.000 ส่วนที่เหลือเข้า EXO Wallet',
      vi:'Áp dụng cho dọn dẹp chung và ủi đồ · bạn vẫn tự chọn nhân viên · hạn mức chỉ dùng trong thời hạn gói · đổi lịch dưới 4 giờ trừ 1 giờ · hoàn tiền tính giờ đã dùng theo giá Rp75.000, phần còn lại về EXO Wallet.',
      tl:'Para sa general cleaning at pamamalantsa · ikaw pa rin ang pumipili ng tauhan · gamit lang sa loob ng bisa ng package · pag-reschedule sa loob ng 4 oras, may bawas na 1 oras · sa refund, binibilang ang nagamit sa Rp75.000 at ibabalik ang natira sa EXO Wallet.',
      km:'ប្រើសម្រាប់សម្អាតទូទៅ និងអ៊ុត · អ្នកនៅតែជ្រើសអ្នកសម្អាតបាន · ប្រើបានតែក្នុងអំឡុងកញ្ចប់ · ផ្លាស់ម៉ោងក្រោម៤ម៉ោងកាត់១ម៉ោង · សងប្រាក់គិតម៉ោងប្រើតម្លៃធម្មតា Rp75.000។',
      my:'အထွေထွေသန့်ရှင်းရေးနှင့် မီးပူတိုက်အတွက် · ဝန်ထမ်းကိုယ်တိုင်ရွေးနိုင် · ပက်ကေ့ဂျ်သက်တမ်းအတွင်းသာ · ၄ နာရီအတွင်းပြောင်းလျှင် ၁ နာရီနုတ် · ပြန်အမ်းငွေကို Rp75.000 နှုန်းဖြင့်တွက်။'},
    reportShort:{en:'Report', id:'Laporan', ja:'レポート', ko:'리포트', zh:'报告', ar:'التقرير', ms:'Laporan', th:'รายงาน', vi:'Báo cáo', tl:'Report', km:'របាយការណ៍', my:'အစီရင်ခံ'},
    beforeLbl: {en:'before', id:'sebelum', ja:'作業前', ko:'전', zh:'清洁前', ar:'قبل', ms:'sebelum', th:'ก่อน', vi:'trước', tl:'bago', km:'មុន', my:'မတိုင်မီ'},
    afterLbl:  {en:'after', id:'sesudah', ja:'作業後', ko:'후', zh:'清洁后', ar:'بعد', ms:'selepas', th:'หลัง', vi:'sau', tl:'pagkatapos', km:'ក្រោយ', my:'ပြီးနောက်'},
    doneAt:    {en:'done', id:'selesai', ja:'完了', ko:'완료', zh:'完成', ar:'اكتمل', ms:'siap', th:'เสร็จ', vi:'xong', tl:'tapos', km:'រួចរាល់', my:'ပြီးစီး'},
    logAccept: {en:'Cleaner accepted', id:'Petugas menerima job', ja:'スタッフが受注', ko:'클리너 수락', zh:'清洁师已接单', ar:'قبل العامل الطلب', ms:'Petugas terima job', th:'พนักงานรับงาน', vi:'Nhân viên nhận việc', tl:'Tinanggap ng tauhan', km:'អ្នកសម្អាតបានទទួល', my:'ဝန်ထမ်းလက်ခံ'},
    logAcceptN:{en:'Slot locked to her only', id:'Jadwal terkunci hanya untuknya', ja:'枠は本人に固定', ko:'해당 클리너로 고정', zh:'时段锁定给她', ar:'الموعد محجوز لها', ms:'Jadual dikunci untuknya', th:'ล็อกเวลาให้เธอ', vi:'Khung giờ khóa cho cô ấy', tl:'Naka-lock sa kanya', km:'ម៉ោងបានចាក់សោ', my:'သူ့အတွက်သတ်မှတ်'},
    logLeft:   {en:'Left the hub', id:'Berangkat dari hub', ja:'拠点を出発', ko:'허브 출발', zh:'从站点出发', ar:'غادر المركز', ms:'Bertolak dari hab', th:'ออกจากฮับ', vi:'Rời hub', tl:'Umalis sa hub', km:'ចាកចេញពីមជ្ឈមណ្ឌល', my:'ဟပ်မှထွက်'},
    logLeftN:  {en:'Live location on', id:'Lokasi langsung aktif', ja:'位置情報オン', ko:'실시간 위치 켜짐', zh:'实时定位开启', ar:'الموقع المباشر مفعّل', ms:'Lokasi langsung aktif', th:'เปิดตำแหน่งสด', vi:'Vị trí trực tiếp bật', tl:'Naka-on ang live location', km:'ទីតាំងផ្ទាល់', my:'တည်နေရာဖွင့်'},
    logArrive: {en:'Arrived at your address', id:'Tiba di alamat Anda', ja:'ご住所に到着', ko:'주소에 도착', zh:'抵达您的地址', ar:'وصل إلى عنوانك', ms:'Tiba di alamat anda', th:'ถึงที่อยู่ของคุณ', vi:'Đã tới địa chỉ', tl:'Dumating sa address', km:'មកដល់អាសយដ្ឋាន', my:'လိပ်စာသို့ရောက်'},
    logArriveN:{en:'Confirmed inside the 100 m zone, gate photo attached', id:'Terkonfirmasi dalam radius 100 m, foto gerbang terlampir', ja:'100m圏内で確認、門の写真添付', ko:'100m 반경 확인, 정문 사진 첨부', zh:'在100米范围内确认，附门口照片', ar:'تم التأكيد ضمن 100 متر مع صورة البوابة', ms:'Disahkan dalam 100 m, foto pagar dilampirkan', th:'ยืนยันในรัศมี 100 ม. แนบรูปประตู', vi:'Xác nhận trong 100 m, kèm ảnh cổng', tl:'Nakumpirma sa loob ng 100 m', km:'បញ្ជាក់ក្នុង១០០ម៉ែត្រ', my:'၁၀၀ မီတာအတွင်းအတည်ပြု'},
    logDone:   {en:'Work finished & verified', id:'Pekerjaan selesai & terverifikasi', ja:'作業完了・検証済み', ko:'작업 완료·검증', zh:'工作完成并已核验', ar:'اكتمل العمل وتم التحقق', ms:'Kerja siap & disahkan', th:'งานเสร็จและตรวจสอบแล้ว', vi:'Hoàn tất & xác minh', tl:'Tapos at na-verify', km:'បញ្ចប់និងផ្ទៀងផ្ទាត់', my:'ပြီးစီးပြီးအတည်ပြု'},
    logDoneN:  {en:'Checklist closed with photo evidence', id:'Checklist ditutup dengan bukti foto', ja:'写真付きでチェックリスト完了', ko:'사진 증빙과 함께 마감', zh:'带照片证据关闭清单', ar:'أُغلقت القائمة بأدلة مصورة', ms:'Senarai semak ditutup dengan bukti foto', th:'ปิดเช็กลิสต์พร้อมรูป', vi:'Đóng checklist kèm ảnh', tl:'Sarado na may larawan', km:'បិទបញ្ជីជាមួយរូបថត', my:'ဓာတ်ပုံနှင့်ပိတ်'},
    arKitchen: {en:'Kitchen & sink', id:'Dapur & wastafel', ja:'キッチン・流し', ko:'주방·싱크대', zh:'厨房与水槽', ar:'المطبخ والحوض', ms:'Dapur & sinki', th:'ครัวและอ่างล้าง', vi:'Bếp & bồn rửa', tl:'Kusina at lababo', km:'ផ្ទះបាយ', my:'မီးဖိုချောင်'},
    arBath:    {en:'Bathroom', id:'Kamar mandi', ja:'浴室', ko:'욕실', zh:'卫生间', ar:'الحمام', ms:'Bilik air', th:'ห้องน้ำ', vi:'Phòng tắm', tl:'Banyo', km:'បន្ទប់ទឹក', my:'ရေချိုးခန်း'},
    arBed:     {en:'Bedroom & floors', id:'Kamar tidur & lantai', ja:'寝室・床', ko:'침실·바닥', zh:'卧室与地板', ar:'غرفة النوم والأرضيات', ms:'Bilik tidur & lantai', th:'ห้องนอนและพื้น', vi:'Phòng ngủ & sàn', tl:'Kwarto at sahig', km:'បន្ទប់គេង', my:'အိပ်ခန်း'},
    arLiving:  {en:'Living room', id:'Ruang keluarga', ja:'リビング', ko:'거실', zh:'客厅', ar:'غرفة المعيشة', ms:'Ruang tamu', th:'ห้องนั่งเล่น', vi:'Phòng khách', tl:'Sala', km:'បន្ទប់ទទួលភ្ញៀវ', my:'ဧည့်ခန်း'},
    arrivalLog:{en:'Arrival log', id:'Catatan kedatangan', ja:'到着記録', ko:'도착 기록', zh:'到达记录', ar:'سجل الوصول', ms:'Log ketibaan', th:'บันทึกการมาถึง', vi:'Nhật ký đến', tl:'Log ng pagdating', km:'កំណត់ត្រាមកដល់', my:'ရောက်ရှိမှတ်တမ်း'},
    ckKitchen: {en:'Kitchen & sink', id:'Dapur & wastafel', ja:'キッチン・流し', ko:'주방·싱크대', zh:'厨房与水槽', ar:'المطبخ والحوض', ms:'Dapur & sinki', th:'ครัวและอ่างล้าง', vi:'Bếp & bồn rửa', tl:'Kusina at lababo', km:'ផ្ទះបាយ', my:'မီးဖိုချောင်'},
    ckBath:    {en:'Bathrooms ×2', id:'Kamar mandi ×2', ja:'浴室 ×2', ko:'욕실 ×2', zh:'卫生间 ×2', ar:'حمامان', ms:'Bilik air ×2', th:'ห้องน้ำ ×2', vi:'Phòng tắm ×2', tl:'Banyo ×2', km:'បន្ទប់ទឹក ×2', my:'ရေချိုးခန်း ×2'},
    ckBed:     {en:'Bedrooms & floors', id:'Kamar tidur & lantai', ja:'寝室・床', ko:'침실·바닥', zh:'卧室与地板', ar:'غرف النوم والأرضيات', ms:'Bilik tidur & lantai', th:'ห้องนอนและพื้น', vi:'Phòng ngủ & sàn', tl:'Kwarto at sahig', km:'បន្ទប់គេង', my:'အိပ်ခန်းနှင့်ကြမ်းပြင်'},
    ckTrash:   {en:'Trash out & final photos', id:'Buang sampah & foto akhir', ja:'ゴミ出し・最終写真', ko:'쓰레기 배출·최종 사진', zh:'倒垃圾与收尾照片', ar:'إخراج القمامة وصور نهائية', ms:'Buang sampah & foto akhir', th:'ทิ้งขยะและถ่ายรูป', vi:'Đổ rác & ảnh cuối', tl:'Basura at huling larawan', km:'ចោលសំរាម', my:'အမှိုက်နှင့်ဓာတ်ပုံ'},
    services9: {en:'{n} services', id:'{n} layanan', ja:'{n}サービス', ko:'서비스 {n}개', zh:'{n} 项服务', ar:'{n} خدمات', ms:'{n} perkhidmatan', th:'{n} บริการ', vi:'{n} dịch vụ', tl:'{n} serbisyo', km:'សេវា {n}', my:'ဝန်ဆောင်မှု {n} ခု'},
    catalogSub:{en:'{n} services · lowest rate in your area', id:'{n} layanan · tarif terendah di pasar Anda', ja:'{n}サービス・お住まいの地域の最安値', ko:'{n}개 서비스 · 지역 최저가', zh:'{n} 项服务 · 您所在区域最低价', ar:'{n} خدمة · أقل سعر في منطقتك', ms:'{n} perkhidmatan · kadar terendah di kawasan anda', th:'{n} บริการ · ราคาต่ำสุดในพื้นที่', vi:'{n} dịch vụ · giá thấp nhất khu vực', tl:'{n} serbisyo · pinakamababang presyo', km:'សេវា {n} · តម្លៃទាបបំផុត', my:'ဝန်ဆောင်မှု {n} ခု'},
    grpHome:{en:'Home & routine', id:'Rumah & rutin', ja:'住まい・定期', ko:'집·정기', zh:'家居与日常', ar:'المنزل والروتين', ms:'Rumah & rutin', th:'บ้านและงานประจำ', vi:'Nhà & định kỳ', tl:'Bahay at rutin', km:'ផ្ទះ និងទម្លាប់', my:'အိမ်နှင့်ပုံမှန်'},
    grpTech:{en:'Technical & periodic', id:'Teknis & berkala', ja:'技術・定期点検', ko:'기술·정기', zh:'技术与定期', ar:'تقني ودوري', ms:'Teknikal & berkala', th:'เทคนิคและตามรอบ', vi:'Kỹ thuật & định kỳ', tl:'Teknikal at pana-panahon', km:'បច្ចេកទេស', my:'နည်းပညာနှင့်အချိန်ပိုင်း'},
    grpCare:{en:'Care & personal', id:'Perawatan & pribadi', ja:'ケア・パーソナル', ko:'돌봄·개인', zh:'照护与个人', ar:'رعاية وخدمات شخصية', ms:'Penjagaan & peribadi', th:'ดูแลและส่วนตัว', vi:'Chăm sóc & cá nhân', tl:'Pangangalaga at personal', km:'ថែទាំ និងផ្ទាល់ខ្លួន', my:'စောင့်ရှောက်မှုနှင့် ကိုယ်ပိုင်'},
    grpBiz:{en:'Business', id:'Bisnis', ja:'法人', ko:'비즈니스', zh:'企业', ar:'الأعمال', ms:'Perniagaan', th:'ธุรกิจ', vi:'Doanh nghiệp', tl:'Negosyo', km:'អាជីវកម្ម', my:'စီးပွားရေး'},
    fromPrefix:{en:'from', id:'dari', ja:'最安', ko:'최저', zh:'起', ar:'من', ms:'dari', th:'เริ่ม', vi:'từ', tl:'mula', km:'ចាប់ពី', my:'စ'},
    perHour:{en:'/ hour', id:'/ jam', ja:'/ 時間', ko:'/ 시간', zh:'/ 小时', ar:'/ ساعة', ms:'/ jam', th:'/ ชม.', vi:'/ giờ', tl:'/ oras', km:'/ ម៉ោង', my:'/ နာရီ'},
    pack10:{en:'10-hour package', id:'Paket 10 jam', ja:'10時間パック', ko:'10시간 패키지', zh:'10 小时套餐', ar:'باقة ١٠ ساعات', ms:'Pakej 10 jam', th:'แพ็กเกจ 10 ชม.', vi:'Gói 10 giờ', tl:'10-oras na package', km:'កញ្ចប់១០ម៉ោង', my:'၁၀ နာရီပက်ကေ့ဂျ်'},
    pack20:{en:'20-hour package', id:'Paket 20 jam', ja:'20時間パック', ko:'20시간 패키지', zh:'20 小时套餐', ar:'باقة ٢٠ ساعة', ms:'Pakej 20 jam', th:'แพ็กเกจ 20 ชม.', vi:'Gói 20 giờ', tl:'20-oras na package', km:'កញ្ចប់២០ម៉ោង', my:'၂၀ နာရီပက်ကေ့ဂျ်'},
    pack40:{en:'40-hour package', id:'Paket 40 jam', ja:'40時間パック', ko:'40시간 패키지', zh:'40 小时套餐', ar:'باقة ٤٠ ساعة', ms:'Pakej 40 jam', th:'แพ็กเกจ 40 ชม.', vi:'Gói 40 giờ', tl:'40-oras na package', km:'កញ្ចប់៤០ម៉ោង', my:'၄၀ နာရီပက်ကေ့ဂျ်'},
    pack10d:{en:'Valid 3 months · general cleaning or ironing', id:'Masa aktif 3 bulan · general cleaning atau setrika', ja:'有効3か月・一般清掃またはアイロン', ko:'3개월 유효 · 일반 청소 또는 다림질', zh:'有效期3个月 · 日常清洁或熨烫', ar:'صالحة ٣ أشهر · تنظيف عام أو كي', ms:'Sah 3 bulan · general cleaning atau seterika', th:'ใช้ได้ 3 เดือน · ทำความสะอาดหรือรีดผ้า', vi:'Hiệu lực 3 tháng · dọn dẹp hoặc ủi', tl:'3 buwan · general cleaning o plantsa', km:'មានសុពលភាព៣ខែ', my:'၃ လသက်တမ်း'},
    pack20d:{en:'Valid 6 months · lock in your favourite cleaner', id:'Masa aktif 6 bulan · petugas favorit bisa dikunci', ja:'有効6か月・お気に入りスタッフを確保', ko:'6개월 유효 · 선호 클리너 고정', zh:'有效期6个月 · 可锁定常用清洁师', ar:'صالحة ٦ أشهر · احجز عاملك المفضل', ms:'Sah 6 bulan · kunci petugas kegemaran', th:'ใช้ได้ 6 เดือน · ล็อกพนักงานคนโปรด', vi:'Hiệu lực 6 tháng · giữ nhân viên yêu thích', tl:'6 buwan · i-lock ang paboritong tauhan', km:'មានសុពលភាព៦ខែ', my:'၆ လသက်တမ်း'},
    pack40d:{en:'Valid 12 months · weekend priority', id:'Masa aktif 12 bulan · prioritas jadwal akhir pekan', ja:'有効12か月・週末優先', ko:'12개월 유효 · 주말 우선 예약', zh:'有效期12个月 · 周末优先', ar:'صالحة ١٢ شهراً · أولوية عطلة الأسبوع', ms:'Sah 12 bulan · keutamaan hujung minggu', th:'ใช้ได้ 12 เดือน · สิทธิ์จองสุดสัปดาห์', vi:'Hiệu lực 12 tháng · ưu tiên cuối tuần', tl:'12 buwan · priority sa weekend', km:'មានសុពលភាព១២ខែ', my:'၁၂ လသက်တမ်း'},
    pack10s:{en:'Save Rp70.000 against the normal Rp75.000/hour', id:'Hemat Rp70.000 dibanding tarif normal Rp75.000/jam', ja:'通常Rp75.000/時よりRp70.000お得', ko:'정상가 Rp75.000/시간 대비 Rp70.000 절약', zh:'比正常价Rp75.000/小时省Rp70.000', ar:'وفّر Rp70.000 مقابل السعر العادي', ms:'Jimat Rp70.000 berbanding kadar biasa', th:'ประหยัด Rp70.000 จากราคาปกติ', vi:'Tiết kiệm Rp70.000 so với giá thường', tl:'Save Rp70.000 kumpara sa normal', km:'សន្សំ Rp70.000', my:'Rp70,000 သက်သာ'},
    pack20s:{en:'Save Rp210.000 · about 2,8 hours free', id:'Hemat Rp210.000 · setara 2,8 jam gratis', ja:'Rp210.000お得・約2.8時間無料', ko:'Rp210.000 절약 · 약 2.8시간 무료', zh:'省Rp210.000 · 约2.8小时免费', ar:'وفّر Rp210.000 · نحو ٢٫٨ ساعة مجاناً', ms:'Jimat Rp210.000 · kira-kira 2,8 jam percuma', th:'ประหยัด Rp210.000 · ราว 2.8 ชม. ฟรี', vi:'Tiết kiệm Rp210.000 · khoảng 2,8 giờ miễn phí', tl:'Save Rp210.000 · halos 2.8 oras libre', km:'សន្សំ Rp210.000', my:'Rp210,000 သက်သာ'},
    pack40s:{en:'Save Rp620.000 · about 8,3 hours free', id:'Hemat Rp620.000 · setara 8,3 jam gratis', ja:'Rp620.000お得・約8.3時間無料', ko:'Rp620.000 절약 · 약 8.3시간 무료', zh:'省Rp620.000 · 约8.3小时免费', ar:'وفّر Rp620.000 · نحو ٨٫٣ ساعة مجاناً', ms:'Jimat Rp620.000 · kira-kira 8,3 jam percuma', th:'ประหยัด Rp620.000 · ราว 8.3 ชม. ฟรี', vi:'Tiết kiệm Rp620.000 · khoảng 8,3 giờ miễn phí', tl:'Save Rp620.000 · halos 8.3 oras libre', km:'សន្សំ Rp620.000', my:'Rp620,000 သက်သာ'},
    badgeTop:{en:'Most popular', id:'Terlaris', ja:'人気', ko:'인기', zh:'最受欢迎', ar:'الأكثر طلباً', ms:'Paling laris', th:'ยอดนิยม', vi:'Phổ biến nhất', tl:'Pinakasikat', km:'ពេញនិយម', my:'လူကြိုက်များ'},
    badgeSave:{en:'Best value', id:'Paling hemat', ja:'最もお得', ko:'최고 가성비', zh:'最超值', ar:'الأوفر', ms:'Paling berbaloi', th:'คุ้มที่สุด', vi:'Tiết kiệm nhất', tl:'Pinakasulit', km:'សន្សំបំផុត', my:'အတန်ဆုံး'},
    createAcc: {en:'Create your account', id:'Buat akun Anda', ja:'アカウント作成', ko:'계정 만들기', zh:'创建账户', ar:'أنشئ حسابك', ms:'Cipta akaun anda', th:'สร้างบัญชี', vi:'Tạo tài khoản', tl:'Gumawa ng account', km:'បង្កើតគណនី', my:'အကောင့်ဖွင့်ရန်'},
    fullName:  {en:'Full name', id:'Nama lengkap', ja:'氏名', ko:'이름', zh:'姓名', ar:'الاسم الكامل', ms:'Nama penuh', th:'ชื่อ-นามสกุล', vi:'Họ và tên', tl:'Buong pangalan', km:'ឈ្មោះពេញ', my:'အမည်အပြည့်'},
    username:  {en:'Username', id:'Nama pengguna', ja:'ユーザー名', ko:'사용자 이름', zh:'用户名', ar:'اسم المستخدم', ms:'Nama pengguna', th:'ชื่อผู้ใช้', vi:'Tên người dùng', tl:'Username', km:'ឈ្មោះអ្នកប្រើ', my:'အသုံးပြုသူအမည်'},
    email:     {en:'Email', id:'Email', ja:'メール', ko:'이메일', zh:'电子邮箱', ar:'البريد الإلكتروني', ms:'E-mel', th:'อีเมล', vi:'Email', tl:'Email', km:'អ៊ីមែល', my:'အီးမေးလ်'},
    mobile:    {en:'Mobile number', id:'Nomor HP', ja:'携帯番号', ko:'휴대폰 번호', zh:'手机号码', ar:'رقم الجوال', ms:'Nombor telefon', th:'เบอร์มือถือ', vi:'Số điện thoại', tl:'Numero ng telepono', km:'លេខទូរស័ព្ទ', my:'ဖုန်းနံပါတ်'},
    twoStep:   {en:'Two-step verification', id:'Verifikasi dua langkah', ja:'二段階認証', ko:'2단계 인증', zh:'两步验证', ar:'التحقق بخطوتين', ms:'Pengesahan dua langkah', th:'ยืนยันสองขั้นตอน', vi:'Xác minh hai bước', tl:'Two-step verification', km:'ការផ្ទៀងផ្ទាត់ពីរជំហាន', my:'နှစ်ဆင့်အတည်ပြုခြင်း'},
    createPin: {en:'Create your transaction PIN', id:'Buat PIN transaksi', ja:'取引用PINを作成', ko:'거래 PIN 만들기', zh:'设置交易密码', ar:'أنشئ رمز المعاملات', ms:'Cipta PIN transaksi', th:'ตั้งรหัส PIN ธุรกรรม', vi:'Tạo mã PIN giao dịch', tl:'Gumawa ng PIN', km:'បង្កើតលេខសម្ងាត់', my:'ငွေပေးချေ PIN'},
    onTheWay:  {en:'On the way', id:'Dalam perjalanan', ja:'向かっています', ko:'이동 중', zh:'正在前往', ar:'في الطريق', ms:'Dalam perjalanan', th:'กำลังเดินทาง', vi:'Đang đến', tl:'Papunta na', km:'កំពុងធ្វើដំណើរ', my:'လမ်းမှာ'},
    liveCheck: {en:'Live checklist', id:'Checklist langsung', ja:'進行状況', ko:'실시간 체크리스트', zh:'实时清单', ar:'قائمة مباشرة', ms:'Senarai semak langsung', th:'เช็กลิสต์สด', vi:'Danh sách trực tiếp', tl:'Live checklist', km:'បញ្ជីផ្ទាល់', my:'တိုက်ရိုက်စာရင်း'},
    reportIss: {en:'Report an issue', id:'Laporkan masalah', ja:'問題を報告', ko:'문제 신고', zh:'反馈问题', ar:'الإبلاغ عن مشكلة', ms:'Laporkan masalah', th:'แจ้งปัญหา', vi:'Báo sự cố', tl:'Mag-ulat', km:'រាយការណ៍បញ្ហា', my:'ပြဿနာတင်ပြ'},
    howWasIt:  {en:'How did it go?', id:'Bagaimana hasilnya?', ja:'いかがでしたか？', ko:'어떠셨나요?', zh:'服务如何？', ar:'كيف كانت الخدمة؟', ms:'Bagaimana hasilnya?', th:'เป็นอย่างไรบ้าง', vi:'Bạn thấy thế nào?', tl:'Kumusta?', km:'តើយ៉ាងណាដែរ?', my:'ဘယ်လိုလဲ'},
    submitRt:  {en:'Submit rating', id:'Kirim penilaian', ja:'評価を送信', ko:'평가 제출', zh:'提交评价', ar:'إرسال التقييم', ms:'Hantar penilaian', th:'ส่งคะแนน', vi:'Gửi đánh giá', tl:'Isumite ang rating', km:'ដាក់ការវាយតម្លៃ', my:'အဆင့်သတ်မှတ်ပို့'},
    shareTo:   {en:'Share to', id:'Bagikan ke', ja:'共有先', ko:'공유하기', zh:'分享到', ar:'المشاركة عبر', ms:'Kongsi ke', th:'แชร์ไปยัง', vi:'Chia sẻ tới', tl:'Ibahagi sa', km:'ចែករំលែកទៅ', my:'မျှဝေရန်'},
    topUp:     {en:'Top up', id:'Isi saldo', ja:'チャージ', ko:'충전', zh:'充值', ar:'شحن الرصيد', ms:'Tambah nilai', th:'เติมเงิน', vi:'Nạp tiền', tl:'Mag-top up', km:'បញ្ចូលទឹកប្រាក់', my:'ငွေဖြည့်'},
    history:   {en:'History', id:'Riwayat', ja:'履歴', ko:'내역', zh:'记录', ar:'السجل', ms:'Sejarah', th:'ประวัติ', vi:'Lịch sử', tl:'Kasaysayan', km:'ប្រវត្តិ', my:'မှတ်တမ်း'},
    activity:  {en:'Activity', id:'Aktivitas', ja:'利用履歴', ko:'활동', zh:'交易明细', ar:'النشاط', ms:'Aktiviti', th:'กิจกรรม', vi:'Hoạt động', tl:'Aktibidad', km:'សកម្មភាព', my:'လှုပ်ရှားမှု'},
    points:    {en:'Exo points', id:'Poin Exo', ja:'Exoポイント', ko:'Exo 포인트', zh:'Exo 积分', ar:'نقاط Exo', ms:'Mata Exo', th:'คะแนน Exo', vi:'Điểm Exo', tl:'Exo points', km:'ពិន្ទុ Exo', my:'Exo အမှတ်'},
    upcoming:  {en:'Upcoming', id:'Akan datang', ja:'予定', ko:'예정', zh:'即将进行', ar:'القادمة', ms:'Akan datang', th:'ที่จะถึง', vi:'Sắp tới', tl:'Paparating', km:'នឹងមកដល់', my:'လာမည့်'},
    past:      {en:'Past', id:'Selesai', ja:'過去', ko:'지난', zh:'历史', ar:'السابقة', ms:'Lepas', th:'ที่ผ่านมา', vi:'Đã qua', tl:'Nakaraan', km:'កន្លងមក', my:'ပြီးခဲ့သော'},
    rebook:    {en:'Rebook', id:'Pesan lagi', ja:'再予約', ko:'다시 예약', zh:'再次预约', ar:'احجز مجدداً', ms:'Tempah semula', th:'จองอีกครั้ง', vi:'Đặt lại', tl:'Mag-book ulit', km:'កក់ម្តងទៀត', my:'ပြန်မှာရန်'},
    claimW:    {en:'Claim warranty', id:'Klaim garansi', ja:'保証を申請', ko:'보증 신청', zh:'申请保修', ar:'المطالبة بالضمان', ms:'Tuntut jaminan', th:'เคลมการรับประกัน', vi:'Yêu cầu bảo hành', tl:'Mag-claim', km:'ទាមទារធានា', my:'အာမခံတောင်းရန်'},
    claimTtl:  {en:'Claim the guarantee', id:'Ajukan klaim jaminan', ja:'保証を請求する', ko:'보증 청구', zh:'申请保障', ar:'المطالبة بالضمان', ms:'Tuntut jaminan', th:'ขอรับการรับประกัน', vi:'Yêu cầu bảo đảm', tl:'I-claim ang garantiya', km:'ទាមទារការធានា', my:'အာမခံတောင်းခံရန်'},
    photos:    {en:'Photos', id:'Foto', ja:'写真', ko:'사진', zh:'照片', ar:'الصور', ms:'Foto', th:'รูปภาพ', vi:'Ảnh', tl:'Mga larawan', km:'រូបថត', my:'ဓာတ်ပုံများ'},
    submitCl:  {en:'Submit claim', id:'Kirim klaim', ja:'申請を送信', ko:'청구 제출', zh:'提交申请', ar:'إرسال المطالبة', ms:'Hantar tuntutan', th:'ส่งเคลม', vi:'Gửi yêu cầu', tl:'Isumite', km:'ដាក់ស្នើ', my:'တင်သွင်းရန်'},
    crewSize:  {en:'Crew size', id:'Jumlah petugas', ja:'作業人数', ko:'인원 수', zh:'人员数量', ar:'عدد العمال', ms:'Bilangan petugas', th:'จำนวนพนักงาน', vi:'Số nhân viên', tl:'Bilang ng tauhan', km:'ចំនួនបុគ្គលិក', my:'ဝန်ထမ်းအရေအတွက်'},
    dateLbl:   {en:'Date', id:'Tanggal', ja:'日付', ko:'날짜', zh:'日期', ar:'التاريخ', ms:'Tarikh', th:'วันที่', vi:'Ngày', tl:'Petsa', km:'កាលបរិច្ឆេទ', my:'ရက်စွဲ'},
    startTime: {en:'Start time', id:'Jam mulai', ja:'開始時刻', ko:'시작 시간', zh:'开始时间', ar:'وقت البدء', ms:'Masa mula', th:'เวลาเริ่ม', vi:'Giờ bắt đầu', tl:'Oras ng simula', km:'ម៉ោងចាប់ផ្តើម', my:'စတင်ချိန်'},
    addonsLbl: {en:'Add-ons', id:'Layanan tambahan', ja:'オプション', ko:'추가 옵션', zh:'附加服务', ar:'خدمات إضافية', ms:'Tambahan', th:'บริการเสริม', vi:'Dịch vụ thêm', tl:'Mga dagdag', km:'សេវាបន្ថែម', my:'ထပ်ဆောင်း'},
    chooseCl:  {en:'Choose a cleaner', id:'Pilih petugas', ja:'スタッフを選ぶ', ko:'클리너 선택', zh:'选择清洁师', ar:'اختر عاملاً', ms:'Pilih petugas', th:'เลือกพนักงาน', vi:'Chọn nhân viên', tl:'Pumili ng tauhan', km:'ជ្រើសអ្នកសម្អាត', my:'ဝန်ထမ်းရွေးပါ'},
    reviewBk:  {en:'Review booking', id:'Tinjau pesanan', ja:'内容を確認', ko:'예약 확인', zh:'确认订单', ar:'مراجعة الحجز', ms:'Semak tempahan', th:'ตรวจสอบการจอง', vi:'Xem lại đơn', tl:'Suriin ang booking', km:'ពិនិត្យការកក់', my:'စာရင်းစစ်ရန်'},
    payWith:   {en:'Pay with', id:'Bayar dengan', ja:'支払い方法', ko:'결제 수단', zh:'支付方式', ar:'ادفع عبر', ms:'Bayar dengan', th:'ชำระด้วย', vi:'Thanh toán bằng', tl:'Bayaran gamit', km:'បង់ដោយ', my:'ငွေပေးချေမှု'},
    totalLbl:  {en:'Total', id:'Total', ja:'合計', ko:'합계', zh:'合计', ar:'الإجمالي', ms:'Jumlah', th:'รวม', vi:'Tổng', tl:'Kabuuan', km:'សរុប', my:'စုစုပေါင်း'},
    fromLbl:   {en:'From', id:'Mulai dari', ja:'最安', ko:'최저', zh:'起价', ar:'ابتداءً من', ms:'Dari', th:'เริ่มต้น', vi:'Từ', tl:'Mula sa', km:'ចាប់ពី', my:'စတင်'},
    voucherLbl:{en:'Voucher', id:'Voucher', ja:'クーポン', ko:'쿠폰', zh:'优惠券', ar:'قسيمة', ms:'Baucar', th:'คูปอง', vi:'Phiếu giảm giá', tl:'Voucher', km:'គូប៉ុង', my:'ဗောက်ချာ'},
    slotLocked:{en:'Slot locked', id:'Jadwal terkunci', ja:'予約確定', ko:'예약 확정', zh:'时段已锁定', ar:'تم تثبيت الموعد', ms:'Jadual terkunci', th:'ล็อกเวลาแล้ว', vi:'Đã giữ lịch', tl:'Naka-lock ang slot', km:'បានចាក់សោម៉ោង', my:'အချိန်သတ်မှတ်ပြီး'},
    trackVisit:{en:'Track the visit', id:'Lacak kunjungan', ja:'訪問を追跡', ko:'방문 추적', zh:'追踪服务', ar:'تتبع الزيارة', ms:'Jejak lawatan', th:'ติดตามการเข้า', vi:'Theo dõi lượt', tl:'Subaybayan', km:'តាមដានការមក', my:'လာရောက်မှုကြည့်'},
    language:  {en:'Language', id:'Bahasa', ja:'言語', ko:'언어', zh:'语言', ar:'اللغة', ms:'Bahasa', th:'ภาษา', vi:'Ngôn ngữ', tl:'Wika', km:'ភាសា', my:'ဘာသာစကား'}
  };

  var SERVICE_NAMES = {
    hourly:{en:'Hourly cleaning', id:'Cleaning per jam', ja:'時間制清掃', ko:'시간제 청소', zh:'按小时清洁', ar:'تنظيف بالساعة', ms:'Cleaning sejam', th:'ทำความสะอาดรายชั่วโมง', vi:'Dọn theo giờ', tl:'Oras-oras', km:'សម្អាតតាមម៉ោង', my:'နာရီအလိုက်'},
    deep:{en:'Deep cleaning', id:'Deep cleaning', ja:'ディープクリーニング', ko:'딥 클리닝', zh:'深度清洁', ar:'تنظيف عميق', ms:'Deep cleaning', th:'ทำความสะอาดล้ำลึก', vi:'Vệ sinh sâu', tl:'Deep cleaning', km:'សម្អាតស៊ីជម្រៅ', my:'အနက်သန့်ရှင်း'},
    ac:{en:'AC service', id:'Cuci & servis AC', ja:'エアコン清掃', ko:'에어컨 청소', zh:'空调清洗', ar:'خدمة المكيف', ms:'Servis penghawa dingin', th:'ล้างแอร์', vi:'Vệ sinh máy lạnh', tl:'AC service', km:'សម្អាតម៉ាស៊ីនត្រជាក់', my:'AC ဝန်ဆောင်မှု'},
    sofa:{en:'Sofa & mattress', id:'Cuci sofa & kasur', ja:'ソファ・マットレス', ko:'소파·매트리스', zh:'沙发与床垫', ar:'الأريكة والمرتبة', ms:'Sofa & tilam', th:'โซฟาและที่นอน', vi:'Sofa & nệm', tl:'Sofa at kutson', km:'សាឡុង និងពូក', my:'ဆိုဖာနှင့်မွေ့ရာ'},
    laundry:{en:'Laundry & pickup', id:'Laundry antar-jemput', ja:'ランドリー集配', ko:'세탁 수거', zh:'洗衣取送', ar:'غسيل مع الاستلام', ms:'Dobi ambil-hantar', th:'ซักรีดรับส่ง', vi:'Giặt ủi tận nơi', tl:'Laundry pickup', km:'បោកគក់', my:'အဝတ်လျှော်'},
    iron:{en:'Ironing service', id:'Jasa setrika', ja:'アイロン', ko:'다림질', zh:'熨烫服务', ar:'خدمة الكي', ms:'Perkhidmatan seterika', th:'บริการรีดผ้า', vi:'Dịch vụ ủi', tl:'Pamamalantsa', km:'អ៊ុតសម្លៀកបំពាក់', my:'အဝတ်မီးပူတိုက်'},
    office:{en:'Office cleaning', id:'Cleaning kantor', ja:'オフィス清掃', ko:'사무실 청소', zh:'办公室清洁', ar:'تنظيف المكاتب', ms:'Pembersihan pejabat', th:'ทำความสะอาดสำนักงาน', vi:'Vệ sinh văn phòng', tl:'Office cleaning', km:'សម្អាតការិយាល័យ', my:'ရုံးသန့်ရှင်းရေး'},
    disinfect:{en:'Disinfection & fogging', id:'Disinfeksi & fogging', ja:'消毒・噴霧', ko:'방역·소독', zh:'消毒喷雾', ar:'التعقيم والتضبيب', ms:'Disinfeksi & fogging', th:'พ่นฆ่าเชื้อ', vi:'Khử khuẩn', tl:'Disinfection', km:'សម្លាប់មេរោគ', my:'ပိုးသတ်ဆေးဖျန်း'},
    hydro:{en:'Hydro cleaning', id:'Hydro cleaning (vakum tungau)', ja:'ハイドロ清掃', ko:'하이드로 클리닝', zh:'除螨深层清洗', ar:'تنظيف هيدرو', ms:'Hydro cleaning', th:'ไฮโดรคลีนนิ่ง', vi:'Hydro cleaning', tl:'Hydro cleaning', km:'សម្អាតហ៊ីដ្រូ', my:'ဟိုက်ဒရိုသန့်စင်'},
    poles:{en:'Floor polishing', id:'Poles lantai & kristalisasi', ja:'床研磨', ko:'바닥 광택', zh:'地板抛光结晶', ar:'تلميع الأرضيات', ms:'Penggilap lantai', th:'ขัดเงาพื้น', vi:'Đánh bóng sàn', tl:'Floor polishing', km:'រំលោងឥដ្ឋ', my:'ကြမ်းပြင်တိုက်ချွတ်'},
    pest:{en:'Pest control', id:'Pest control', ja:'害虫駆除', ko:'방역 해충', zh:'虫害防治', ar:'مكافحة الآفات', ms:'Kawalan perosak', th:'กำจัดแมลง', vi:'Diệt côn trùng', tl:'Pest control', km:'កម្ចាត់សត្វល្អិត', my:'ပိုးမွှားနှိမ်နင်း'},
    pool:{en:'Pool care', id:'Perawatan kolam renang', ja:'プール管理', ko:'수영장 관리', zh:'泳池养护', ar:'العناية بالمسبح', ms:'Penjagaan kolam', th:'ดูแลสระว่ายน้ำ', vi:'Chăm sóc hồ bơi', tl:'Pool care', km:'ថែទាំអាងហែល', my:'ရေကူးကန်ထိန်း'},
    toren:{en:'Water tank cleaning', id:'Cuci toren air', ja:'貯水タンク清掃', ko:'물탱크 청소', zh:'水塔清洗', ar:'تنظيف خزان المياه', ms:'Cuci tangki air', th:'ล้างถังน้ำ', vi:'Vệ sinh bồn nước', tl:'Linis ng tangke', km:'សម្អាតធុងទឹក', my:'ရေတိုင်ကီသန့်စင်'},
    postreno:{en:'Post-renovation cleaning', id:'Pembersihan pasca renovasi', ja:'リフォーム後清掃', ko:'리모델링 후 청소', zh:'装修后清洁', ar:'تنظيف بعد التجديد', ms:'Pembersihan pasca renovasi', th:'ทำความสะอาดหลังรีโนเวท', vi:'Vệ sinh sau sửa chữa', tl:'Linis pagkatapos ng renovation', km:'សម្អាតក្រោយជួសជុល', my:'ပြင်ဆင်ပြီးသန့်ရှင်းရေး'},
    care:{en:'Elderly, child & patient care', id:'Perawatan lansia, anak & pasien', ja:'高齢者・子ども・患者ケア', ko:'노인·아동·환자 돌봄', zh:'老人、儿童与病患照护', ar:'رعاية المسنين والأطفال والمرضى', ms:'Penjagaan warga emas, kanak-kanak & pesakit', th:'ดูแลผู้สูงอายุ เด็ก และผู้ป่วย', vi:'Chăm sóc người già, trẻ em & bệnh nhân', tl:'Pag-aalaga sa matanda, bata at pasyente', km:'ថែទាំមនុស្សចាស់ កុមារ និងអ្នកជំងឺ', my:'သက်ကြီး၊ ကလေး၊ လူနာ စောင့်ရှောက်မှု'},
    errand:{en:'Shopping & errands', id:'Belanja & titip barang', ja:'買い物・お使い代行', ko:'장보기·심부름', zh:'代购与跑腿', ar:'التسوق والمهمات', ms:'Beli-belah & suruhan', th:'ซื้อของและฝากธุระ', vi:'Đi chợ & việc vặt', tl:'Pamimili at pag-uutos', km:'ទិញទំនិញ និងបញ្ជូនរបស់', my:'ဈေးဝယ်ခြင်းနှင့် အလုပ်ကိစ္စ'},
    massage:{en:'Massage & body care', id:'Pijat & perawatan tubuh', ja:'マッサージ・ボディケア', ko:'마사지·바디케어', zh:'按摩与身体护理', ar:'التدليك والعناية بالجسم', ms:'Urut & penjagaan badan', th:'นวดและดูแลร่างกาย', vi:'Massage & chăm sóc cơ thể', tl:'Masahe at pangangalaga sa katawan', km:'ម៉ាស្សា និងថែទាំរាងកាយ', my:'အနှိပ်နှင့် ခန္ဓာကိုယ်စောင့်ရှောက်မှု'},
    cook:{en:'Cooking & meal prep', id:'Memasak & meal prep', ja:'料理・作り置き', ko:'요리·밀프렙', zh:'烹饪与备餐', ar:'الطبخ وتحضير الوجبات', ms:'Memasak & penyediaan makanan', th:'ทำอาหารและเตรียมมื้ออาหาร', vi:'Nấu ăn & chuẩn bị bữa', tl:'Pagluluto at meal prep', km:'ចម្អិនអាហារ និងរៀបចំម្ហូប', my:'ချက်ပြုတ်ခြင်းနှင့် အစားအစာပြင်ဆင်ခြင်း'},
    building:{en:'Building periodic package', id:'Paket kebersihan berkala gedung', ja:'ビル定期清掃パッケージ', ko:'건물 정기 패키지', zh:'楼宇定期清洁套餐', ar:'باقة صيانة المبنى الدورية', ms:'Pakej berkala bangunan', th:'แพ็กเกจดูแลอาคารตามรอบ', vi:'Gói định kỳ tòa nhà', tl:'Panaka-nakang package ng gusali', km:'កញ្ចប់ថែទាំអគារតាមកាលកំណត់', my:'အဆောက်အအုံ ပုံမှန်ပက်ကေ့ချ်'},
    tankbig:{en:'Building tank & reservoir', id:'Tangki & reservoir gedung', ja:'ビル貯水槽清掃', ko:'건물 저수조 청소', zh:'楼宇水箱与蓄水池', ar:'خزانات المباني', ms:'Tangki & takungan bangunan', th:'ถังเก็บน้ำอาคาร', vi:'Bể chứa tòa nhà', tl:'Tangke ng gusali', km:'អាងស្តុកទឹកអគារ', my:'အဆောက်အအုံရေကန်'},
    car:{en:'Car wash at home', id:'Cuci mobil di rumah', ja:'出張洗車', ko:'출장 세차', zh:'上门洗车', ar:'غسيل السيارة منزلياً', ms:'Cuci kereta di rumah', th:'ล้างรถถึงบ้าน', vi:'Rửa xe tại nhà', tl:'Car wash sa bahay', km:'លាងឡានដល់ផ្ទះ', my:'အိမ်ရောက်ကားဆေး'}
  };

  var WARRANTY = {
    'Vetted caregiver, free replacement':{en:'Vetted caregiver, free replacement', id:'Pengasuh terverifikasi, ganti gratis', ja:'審査済みケアラー・無料交代', ko:'검증된 돌봄인, 무료 교체', zh:'经审核的看护，免费更换', ar:'مقدم رعاية موثق، استبدال مجاني', ms:'Penjaga disemak, ganti percuma', th:'ผู้ดูแลผ่านการตรวจสอบ เปลี่ยนฟรี', vi:'Người chăm sóc đã xác minh, thay miễn phí', tl:'Beripikadong tagapag-alaga, libreng palit', km:'អ្នកថែទាំបានផ្ទៀងផ្ទាត់ ប្ដូរឥតគិតថ្លៃ', my:'စိစစ်ပြီးစောင့်ရှောက်သူ၊ အခမဲ့အစားထိုး'},
    'Receipt-matched, cover up to Rp1jt':{en:'Receipt-matched, cover up to Rp1jt', id:'Sesuai struk, jaminan hingga Rp1jt', ja:'レシート照合・Rp1jtまで補償', ko:'영수증 대조, Rp1jt까지 보상', zh:'凭小票核对，最高赔付Rp1jt', ar:'مطابق للإيصال، تغطية حتى Rp1jt', ms:'Padan resit, lindungan hingga Rp1jt', th:'ตรวจกับใบเสร็จ คุ้มครองถึง Rp1jt', vi:'Đối chiếu hóa đơn, bồi thường đến Rp1jt', tl:'Tugma sa resibo, sagot hanggang Rp1jt', km:'ផ្ទៀងតាមវិក្កយបត្រ ធានាដល់ Rp1jt', my:'ပြေစာနှင့်တိုက်ဆိုင်၊ Rp1jt အထိ အာမခံ'},
    'Hygiene-trained cook':{en:'Hygiene-trained cook', id:'Juru masak terlatih higiene', ja:'衛生研修済みの料理人', ko:'위생 교육 이수 요리사', zh:'受过卫生培训的厨师', ar:'طاهٍ مدرب على النظافة', ms:'Tukang masak terlatih higiene', th:'พ่อครัวผ่านอบรมสุขอนามัย', vi:'Đầu bếp được đào tạo vệ sinh', tl:'Kusinerong sinanay sa kalinisan', km:'ចុងភៅបានបណ្ដុះបណ្ដាលអនាម័យ', my:'သန့်ရှင်းရေးသင်တန်းဆင်း ထမင်းချက်'},
    'Certified therapist':{en:'Certified therapist', id:'Terapis bersertifikat', ja:'認定セラピスト', ko:'공인 테라피스트', zh:'持证理疗师', ar:'معالج معتمد', ms:'Terapis bertauliah', th:'นักบำบัดมีใบรับรอง', vi:'Kỹ thuật viên có chứng chỉ', tl:'Sertipikadong therapist', km:'អ្នកព្យាបាលមានវិញ្ញាបនបត្រ', my:'အသိအမှတ်ပြု အနှိပ်ဆရာ'},
    '48-hour free redo':{en:'48-hour free redo', id:'Ulang gratis 48 jam', ja:'48時間以内やり直し無料', ko:'48시간 무료 재작업', zh:'48小时免费返工', ar:'إعادة مجانية خلال ٤٨ ساعة', ms:'Ulang percuma 48 jam', th:'ทำซ้ำฟรีใน 48 ชม.', vi:'Làm lại miễn phí 48 giờ', tl:'Libreng ulit sa 48 oras', km:'ធ្វើឡើងវិញឥតគិតថ្លៃ៤៨ម៉ោង', my:'၄၈ နာရီအခမဲ့ပြန်လုပ်'},
    '7-day free redo':{en:'7-day free redo', id:'Ulang gratis 7 hari', ja:'7日以内やり直し無料', ko:'7일 무료 재작업', zh:'7天免费返工', ar:'إعادة مجانية خلال ٧ أيام', ms:'Ulang percuma 7 hari', th:'ทำซ้ำฟรีใน 7 วัน', vi:'Làm lại miễn phí 7 ngày', tl:'Libreng ulit sa 7 araw', km:'ធ្វើឡើងវិញ៧ថ្ងៃ', my:'၇ ရက်အခမဲ့ပြန်လုပ်'},
    '14-day free redo':{en:'14-day free redo', id:'Ulang gratis 14 hari', ja:'14日以内やり直し無料', ko:'14일 무료 재작업', zh:'14天免费返工', ar:'إعادة مجانية خلال ١٤ يوماً', ms:'Ulang percuma 14 hari', th:'ทำซ้ำฟรีใน 14 วัน', vi:'Làm lại miễn phí 14 ngày', tl:'Libreng ulit sa 14 araw', km:'ធ្វើឡើងវិញ១៤ថ្ងៃ', my:'၁၄ ရက်အခမဲ့ပြန်လုပ်'},
    '30-day warranty':{en:'30-day warranty', id:'Garansi 30 hari', ja:'30日保証', ko:'30일 보증', zh:'30天保修', ar:'ضمان ٣٠ يوماً', ms:'Jaminan 30 hari', th:'รับประกัน 30 วัน', vi:'Bảo hành 30 ngày', tl:'30-araw na garantiya', km:'ធានា៣០ថ្ងៃ', my:'၃၀ ရက်အာမခံ'},
    '90-day re-treatment':{en:'90-day re-treatment', id:'Penanganan ulang 90 hari', ja:'90日以内再施工', ko:'90일 재방역', zh:'90天内免费再处理', ar:'إعادة معالجة خلال ٩٠ يوماً', ms:'Rawatan semula 90 hari', th:'พ่นซ้ำภายใน 90 วัน', vi:'Xử lý lại trong 90 ngày', tl:'Ulit na treatment sa 90 araw', km:'ព្យាបាលឡើងវិញ៩០ថ្ងៃ', my:'၉၀ ရက်ပြန်လည်ကုသ'},
    'Item cover up to Rp1jt':{en:'Item cover up to Rp1jt', id:'Ganti rugi barang sampai Rp1jt', ja:'物品補償Rp1百万まで', ko:'물품 보상 최대 Rp1백만', zh:'物品赔偿最高Rp100万', ar:'تغطية الأغراض حتى مليون روبية', ms:'Perlindungan barang hingga Rp1jt', th:'คุ้มครองสินค้าถึง Rp1 ล้าน', vi:'Bồi thường tới Rp1 triệu', tl:'Saklaw hanggang Rp1M', km:'ធានារ៉ាប់រងដល់១លាន', my:'Rp၁သန်းအထိအာမခံ'},
    'Contract SLA':{en:'Contract SLA', id:'SLA kontrak', ja:'契約SLA', ko:'계약 SLA', zh:'合同SLA', ar:'اتفاقية مستوى الخدمة', ms:'SLA kontrak', th:'SLA ตามสัญญา', vi:'SLA hợp đồng', tl:'SLA ng kontrata', km:'SLA កិច្ចសន្យា', my:'စာချုပ် SLA'},
    '6-month schedule':{en:'6-month reminder', id:'Pengingat tiap 6 bulan', ja:'6か月ごとの通知', ko:'6개월 알림', zh:'每6个月提醒', ar:'تذكير كل ٦ أشهر', ms:'Peringatan setiap 6 bulan', th:'เตือนทุก 6 เดือน', vi:'Nhắc mỗi 6 tháng', tl:'Paalala kada 6 buwan', km:'រំលឹករៀងរាល់៦ខែ', my:'၆ လတစ်ကြိမ်သတိပေး'},
    '7-day water check':{en:'7-day water check', id:'Cek air ulang 7 hari', ja:'7日後の水質確認', ko:'7일 수질 재점검', zh:'7天水质复检', ar:'فحص المياه بعد ٧ أيام', ms:'Semakan air 7 hari', th:'ตรวจน้ำซ้ำใน 7 วัน', vi:'Kiểm tra nước sau 7 ngày', tl:'Water check sa 7 araw', km:'ពិនិត្យទឹក៧ថ្ងៃ', my:'၇ ရက်ရေစစ်ဆေး'}
  };

  var UNIT_LABELS = {
    '/hour':{en:'per hour', id:'per jam', ja:'1時間あたり', ko:'시간당', zh:'每小时', ar:'للساعة', ms:'sejam', th:'ต่อชั่วโมง', vi:'mỗi giờ', tl:'kada oras', km:'ក្នុងមួយម៉ោង', my:'တစ်နာရီ'},
    '/unit':{en:'per unit', id:'per unit', ja:'1台あたり', ko:'대당', zh:'每台', ar:'للوحدة', ms:'seunit', th:'ต่อเครื่อง', vi:'mỗi máy', tl:'kada unit', km:'ក្នុងមួយគ្រឿង', my:'တစ်လုံး'},
    '/seat':{en:'per seat', id:'per dudukan', ja:'1席あたり', ko:'좌석당', zh:'每座', ar:'للمقعد', ms:'setiap tempat duduk', th:'ต่อที่นั่ง', vi:'mỗi chỗ', tl:'kada upuan', km:'ក្នុងមួយកៅអី', my:'တစ်နေရာ'},
    '/kg':{en:'per kg', id:'per kg', ja:'1kgあたり', ko:'kg당', zh:'每公斤', ar:'للكيلو', ms:'sekilogram', th:'ต่อกิโล', vi:'mỗi kg', tl:'kada kilo', km:'ក្នុងមួយគីឡូ', my:'တစ်ကီလို'},
    '/room':{en:'per room', id:'per ruangan', ja:'1部屋あたり', ko:'방당', zh:'每间', ar:'للغرفة', ms:'setiap bilik', th:'ต่อห้อง', vi:'mỗi phòng', tl:'kada kwarto', km:'ក្នុងមួយបន្ទប់', my:'တစ်ခန်း'},
    '/car':{en:'per car', id:'per mobil', ja:'1台あたり', ko:'차량당', zh:'每辆', ar:'للسيارة', ms:'sebuah kereta', th:'ต่อคัน', vi:'mỗi xe', tl:'kada sasakyan', km:'ក្នុងមួយឡាន', my:'တစ်စီး'},
    '/visit':{en:'per visit', id:'per kunjungan', ja:'1回あたり', ko:'방문당', zh:'每次上门', ar:'للزيارة', ms:'setiap lawatan', th:'ต่อครั้ง', vi:'mỗi lần', tl:'kada bisita', km:'ក្នុងមួយដង', my:'တစ်ကြိမ်'},
    '/m²':{en:'per m²', id:'per m²', ja:'1㎡あたり', ko:'㎡당', zh:'每平方米', ar:'للمتر المربع', ms:'setiap m²', th:'ต่อ ตร.ม.', vi:'mỗi m²', tl:'kada m²', km:'ក្នុងមួយម²', my:'တစ်စတုရန်းမီတာ'},
    '/trip':{en:'per trip', id:'per trip', ja:'1回あたり', ko:'1회당', zh:'每趟', ar:'للرحلة', ms:'setiap trip', th:'ต่อเที่ยว', vi:'mỗi chuyến', tl:'kada biyahe', km:'ក្នុងមួយជើង', my:'တစ်ခေါက်'},
    '/month':{en:'per month', id:'per bulan', ja:'月あたり', ko:'월당', zh:'每月', ar:'شهرياً', ms:'sebulan', th:'ต่อเดือน', vi:'mỗi tháng', tl:'kada buwan', km:'ក្នុងមួយខែ', my:'တစ်လ'},
    '/session':{en:'per session', id:'per sesi', ja:'1回あたり', ko:'세션당', zh:'每次', ar:'للجلسة', ms:'setiap sesi', th:'ต่อครั้ง', vi:'mỗi buổi', tl:'kada sesyon', km:'ក្នុងមួយវគ្គ', my:'တစ်ကြိမ်'},
    '/tank':{en:'per tank', id:'per toren', ja:'1基あたり', ko:'탱크당', zh:'每个水塔', ar:'للخزان', ms:'setiap tangki', th:'ต่อถัง', vi:'mỗi bồn', tl:'kada tangke', km:'ក្នុងមួយធុង', my:'တစ်လုံး'}
  };

  var UNIT_COUNT = {
    '/hour':{en:'hours', id:'jam', ja:'時間', ko:'시간', zh:'小时', ar:'ساعات', ms:'jam', th:'ชม.', vi:'giờ', tl:'oras', km:'ម៉ោង', my:'နာရီ'},
    '/unit':{en:'units', id:'unit', ja:'台', ko:'대', zh:'台', ar:'وحدات', ms:'unit', th:'เครื่อง', vi:'máy', tl:'unit', km:'គ្រឿង', my:'လုံး'},
    '/seat':{en:'seats', id:'dudukan', ja:'席', ko:'좌석', zh:'座', ar:'مقاعد', ms:'tempat duduk', th:'ที่นั่ง', vi:'chỗ', tl:'upuan', km:'កៅអី', my:'နေရာ'},
    '/kg':{en:'kg', id:'kg', ja:'kg', ko:'kg', zh:'公斤', ar:'كجم', ms:'kg', th:'กก.', vi:'kg', tl:'kilo', km:'គីឡូ', my:'ကီလို'},
    '/room':{en:'rooms', id:'ruangan', ja:'部屋', ko:'개 방', zh:'间', ar:'غرف', ms:'bilik', th:'ห้อง', vi:'phòng', tl:'kwarto', km:'បន្ទប់', my:'ခန်း'},
    '/car':{en:'cars', id:'mobil', ja:'台', ko:'대', zh:'辆', ar:'سيارات', ms:'kereta', th:'คัน', vi:'xe', tl:'sasakyan', km:'ឡាន', my:'စီး'},
    '/visit':{en:'visits', id:'kunjungan', ja:'回', ko:'회', zh:'次', ar:'زيارات', ms:'lawatan', th:'ครั้ง', vi:'lần', tl:'bisita', km:'ដង', my:'ကြိမ်'},
    '/m²':{en:'m²', id:'m²', ja:'㎡', ko:'㎡', zh:'㎡', ar:'م²', ms:'m²', th:'ตร.ม.', vi:'m²', tl:'m²', km:'ម²', my:'စ.မီ'},
    '/trip':{en:'trips', id:'trip', ja:'回', ko:'회', zh:'趟', ar:'رحلات', ms:'trip', th:'เที่ยว', vi:'chuyến', tl:'biyahe', km:'ជើង', my:'ခေါက်'},
    '/month':{en:'months', id:'bulan', ja:'か月', ko:'개월', zh:'个月', ar:'أشهر', ms:'bulan', th:'เดือน', vi:'tháng', tl:'buwan', km:'ខែ', my:'လ'},
    '/session':{en:'sessions', id:'sesi', ja:'回', ko:'세션', zh:'次', ar:'جلسات', ms:'sesi', th:'ครั้ง', vi:'buổi', tl:'sesyon', km:'វគ្គ', my:'ကြိမ်'},
    '/tank':{en:'tanks', id:'toren', ja:'基', ko:'개 탱크', zh:'个', ar:'خزانات', ms:'tangki', th:'ถัง', vi:'bồn', tl:'tangke', km:'ធុង', my:'လုံး'}
  };

  /* Kamus berkunci teks sumber. Rancangan hanya membawa padanan Indonesia
     untuk kelompok ini; bahasa lain jatuh ke Inggris. */
  var STR = {
    'Step 1 of 3 · what & when':{id:'Langkah 1 dari 3 · layanan & waktu'},
    'Step 2 of 3':{id:'Langkah 2 dari 3'}, 'Step 3 of 3':{id:'Langkah 3 dari 3'},
    'Available cleaners':{id:'Petugas tersedia'}, 'Review & pay':{id:'Tinjau & bayar'},
    'Best match':{id:'Paling cocok'}, 'Booked before':{id:'Pernah dipesan'}, 'Lowest rate':{id:'Tarif terendah'}, 'Nearest':{id:'Terdekat'},
    'jobs':{id:'job'}, 'yrs':{id:'thn'}, 'total':{id:'total'},
    'Booked by you 3×':{id:'Pernah Anda pesan 3×'}, 'Brings own tools':{id:'Bawa alat sendiri'}, 'Speaks English':{id:'Bisa bahasa Inggris'},
    'Top rated':{id:'Rating tertinggi'}, 'Pet friendly':{id:'Ramah hewan'}, 'Deep-clean certified':{id:'Bersertifikat deep clean'},
    'Fastest to accept':{id:'Paling cepat menerima'}, 'New on EXOCLEAN':{id:'Baru di EXOCLEAN'}, 'Trained Jul 2026':{id:'Dilatih Jul 2026'},
    'Holds your Saturday slot · confirms in 2 min':{id:'Memegang slot Sabtu Anda · konfirmasi 2 menit'},
    'Free at 09:00 · 98% on-time over 6 months':{id:'Kosong pukul 09:00 · 98% tepat waktu selama 6 bulan'},
    'Nearest to you · arrives 10 min early on average':{id:'Paling dekat · rata-rata datang 10 menit lebih awal'},
    'Lower rate while building reviews · fully background-checked':{id:'Tarif lebih murah sambil mengumpulkan ulasan · latar belakang terverifikasi'},
    'EXO Wallet':{id:'EXO Wallet'}, 'instant refunds here':{id:'refund masuk seketika'},
    'QRIS':{id:'QRIS'}, 'Any bank or e-wallet app':{id:'Semua bank atau e-wallet'},
    'GoPay / OVO / DANA':{id:'GoPay / OVO / DANA'}, 'Linked: OVO ···8817':{id:'Tertaut: OVO ···8817'},
    'Bank transfer (VA)':{id:'Transfer bank (VA)'}, 'BCA, Mandiri, BNI':{id:'BCA, Mandiri, BNI'},
    'Credit card':{id:'Kartu kredit'}, 'Visa ···4471':{id:'Visa ···4471'},
    'Add-ons':{id:'Layanan tambahan'}, '2-cleaner coordination':{id:'Koordinasi 2 petugas'},
    'not applied':{id:'tidak dipakai'}, 'Platform fee':{id:'Biaya platform'},
    'Transport · 12 km from Kemang hub':{id:'Transport · 12 km dari hub Kemang'}, 'Free':{id:'Gratis'},
    'Inside the fridge':{id:'Bagian dalam kulkas'}, '+30 min':{id:'+30 menit'}, '+40 min':{id:'+40 menit'}, '+45 min':{id:'+45 menit'},
    'Windows & balcony glass':{id:'Jendela & kaca balkon'}, 'Fold laundry':{id:'Lipat cucian'}, 'up to 2 loads':{id:'maksimal 2 muatan'},
    'Oven & range hood degrease':{id:'Bersihkan lemak oven & cooker hood'}, 'Bathroom grout scrub':{id:'Sikat nat kamar mandi'},
    'Balcony & window tracks':{id:'Balkon & rel jendela'}, 'Deep chemical wash':{id:'Cuci kimia menyeluruh'},
    'per unit · heavy dust':{id:'per unit · debu tebal'}, 'Freon pressure check':{id:'Cek tekanan freon'},
    'top-up billed separately':{id:'isi ulang ditagih terpisah'}, 'Drain line flush':{id:'Bilas saluran pembuangan'},
    'stops water dripping':{id:'menghentikan tetesan air'}, 'Stain treatment':{id:'Perawatan noda'},
    'per stubborn spot':{id:'per noda membandel'}, 'Anti-bacterial finish':{id:'Lapisan antibakteri'},
    'pet & baby safe':{id:'aman untuk hewan & bayi'}, 'Express 8 hours':{id:'Ekspres 8 jam'},
    'same-day return':{id:'kembali hari yang sama'}, 'Ironing included':{id:'Termasuk setrika'}, 'per kg':{id:'per kg'},
    'Perfume finish':{id:'Sentuhan pewangi'}, 'choose scent':{id:'pilih aroma'}, 'Pantry deep clean':{id:'Deep clean pantry'},
    '+1 hour':{id:'+1 jam'}, 'Interior glass partitions':{id:'Sekat kaca interior'}, 'Fold & wardrobe sort':{id:'Lipat & tata lemari'},
    'UV lamp pass':{id:'Penyinaran lampu UV'}, 'per room':{id:'per ruangan'}, 'Disinfection certificate':{id:'Sertifikat disinfeksi'},
    'for offices & schools':{id:'untuk kantor & sekolah'}, 'Interior vacuum & wipe':{id:'Vakum & lap interior'},
    'Wax & polish':{id:'Wax & poles'}, 'Engine bay clean':{id:'Bersihkan ruang mesin'}, 'dry method':{id:'metode kering'},
    'Anti-mite finish':{id:'Lapisan anti-tungau'}, 'per item':{id:'per item'}, 'Fast-dry blower':{id:'Blower cepat kering'},
    'usable in 2 hours':{id:'bisa dipakai 2 jam lagi'}, 'Marble sealer coating':{id:'Pelapis sealer marmer'},
    'per m²':{id:'per m²'}, 'Night shift work':{id:'Pengerjaan shift malam'}, 'office hours untouched':{id:'jam kantor tidak terganggu'},
    'Follow-up visit in 30 days':{id:'Kunjungan ulang 30 hari'}, 'included in warranty':{id:'termasuk garansi'},
    'Rodent bait stations':{id:'Umpan tikus'}, 'per 5 points':{id:'per 5 titik'}, 'Full chemical rebalance':{id:'Penyeimbangan kimia menyeluruh'},
    'test log attached':{id:'log uji dilampirkan'}, 'Filter cartridge clean':{id:'Cuci katrid filter'},
    'Food-grade sterilisation':{id:'Sterilisasi food-grade'}, 'safe for drinking water':{id:'aman untuk air minum'},
    'Pump & float check':{id:'Cek pompa & pelampung'}, 'report attached':{id:'laporan dilampirkan'},
    'Debris haul-away':{id:'Angkut puing'}, 'up to 1 pick-up truck':{id:'sampai 1 bak pikap'},
    'Paint & cement spot removal':{id:'Hilangkan noda cat & semen'}, 'glass, tiles, frames':{id:'kaca, keramik, kusen'},
    'Dust purge of AC & vents':{id:'Purge debu AC & ventilasi'},
    'Laboratory water test':{id:'Uji air laboratorium'}, 'certificate for management':{id:'sertifikat untuk pengelola'},
    'Distribution pipe flush':{id:'Flush pipa distribusi'}, 'per riser':{id:'per riser'},
    'Free survey first':{id:'Survei gratis dulu'},
    'A supervisor visits free within 24 hours, agrees a fixed price with you, and only then do we book the crew. The figure below is an estimate until the survey is signed.':
      {id:'Supervisor datang gratis dalam 24 jam, menyepakati harga tetap bersama Anda, baru tim dijadwalkan. Angka di bawah masih perkiraan sampai survei disepakati.'},
    'from':{id:'mulai'}, 'each, rate set by the cleaner':{id:'per satuan, tarif ditentukan petugas'},
    'Not happy? Raise it while the cleaner is still on site and we re-clean free, or refund to your EXO Wallet within 3 working days.':
      {id:'Tidak puas? Sampaikan selagi petugas masih di lokasi — kami bersihkan ulang gratis, atau refund ke EXO Wallet dalam 3 hari kerja.'},
    'What is and is not included →':{id:'Yang termasuk dan tidak termasuk →'},
    'Kemang Residence 12B, Jakarta Selatan · gate code 4471 · “please ring, dog inside”':
      {id:'Kemang Residence 12B, Jakarta Selatan · kode gerbang 4471 · “tolong bunyikan bel, ada anjing”'},
    'SCBD Tower 2, 18th floor, Jakarta Selatan · access card at lobby':
      {id:'SCBD Tower 2, lantai 18, Jakarta Selatan · kartu akses di lobi'},
    'Rates are set by each cleaner. EXOCLEAN adds a Rp3.000 platform fee — nothing else, no surge.':
      {id:'Tarif ditentukan tiap petugas. EXOCLEAN menambahkan biaya platform Rp3.000 — tidak ada biaya lain, tanpa surge.'},
    'Rates are set by EXOCLEAN, the same for every customer — no surge, no bidding. The Rp3.000 platform fee is the only thing added.':
      {id:'Tarif ditetapkan EXOCLEAN, sama untuk semua pelanggan — tanpa surge, tanpa lelang. Biaya platform Rp3.000 satu-satunya tambahan.'},
    'Something was missed':{id:'Ada yang terlewat'}, 'Free re-clean within 48 hours':{id:'Bersihkan ulang gratis dalam 48 jam'},
    'Cleaner was late':{id:'Petugas terlambat'}, 'Auto credit per 15 minutes':{id:'Kredit otomatis per 15 menit'},
    'Something was damaged':{id:'Ada yang rusak'}, 'Covered up to Rp5jt':{id:'Ditanggung sampai Rp5jt'},
    'My slot was moved':{id:'Jadwal saya dipindah'}, 'Rp100.000, automatic':{id:'Rp100.000, otomatis'},
    'I want a refund':{id:'Saya mau refund'}, 'Dated deadline, tracked':{id:'Tenggat bertanggal, terlacak'},
    'Spotless finish':{id:'Hasil kinclong'}, 'On time':{id:'Tepat waktu'}, 'Careful with things':{id:'Hati-hati dengan barang'},
    'Friendly':{id:'Ramah'}, 'Great with pets':{id:'Ramah hewan'}, 'No tip':{id:'Tanpa tip'},
    'Booking locked':{id:'Pesanan terkunci'}, 'Cleaner on the way':{id:'Petugas dalam perjalanan'},
    'Cleaning in progress':{id:'Pembersihan berlangsung'}, 'Done & verified':{id:'Selesai & terverifikasi'},
    'Home':{id:'Rumah'}, 'Office':{id:'Kantor'}, 'Default':{id:'Utama'}, 'Saved addresses':{id:'Alamat tersimpan'},
    'Favourite cleaners':{id:'Petugas favorit'}, 'Payment methods':{id:'Metode pembayaran'}, 'Notifications':{id:'Notifikasi'},
    'Terms of service & privacy':{id:'Ketentuan layanan & privasi'}, 'Help — human in 60s':{id:'Bantuan — manusia dalam 60 dtk'},
    'Chat':{id:'Chat'}, 'On':{id:'Aktif'}, 'Off':{id:'Nonaktif'}, 'saved':{id:'tersimpan'},
    'Open the partner app →':{id:'Buka aplikasi mitra →'}, 'Track':{id:'Lacak'}, 'Move time':{id:'Ubah jadwal'},
    'Today':{id:'Hari ini'}, 'Active':{id:'Aktif'}, 'Skip one':{id:'Lewati satu'}, 'Refund in progress':{id:'Refund diproses'},
    'Simulate next status':{id:'Simulasikan status berikutnya'}, 'Visit done · rate':{id:'Selesai · nilai'},
    'Back to home':{id:'Kembali ke beranda'}, 'Share this to my friends':{id:'Bagikan ke teman'},
    'Order':{id:'Pesanan'}, 'Paid with':{id:'Dibayar dengan'}, 'Warranty':{id:'Garansi'},
    'Anything else? (optional)':{id:'Ada lagi? (opsional)'}, 'What stood out':{id:'Yang paling berkesan'},
    'Add a tip — she keeps 100%':{id:'Tambah tip — 100% untuknya'}, 'Something went wrong instead':{id:'Ada yang tidak beres'},
    'Sign up with email or phone':{id:'Daftar dengan email atau nomor HP'}, 'Continue with Google':{id:'Lanjutkan dengan Google'},
    'Continue with Facebook':{id:'Lanjutkan dengan Facebook'}, 'or':{id:'atau'},
    'Schedule-locked bookings':{id:'Jadwal terkunci'}, 'Refunds with a dated deadline':{id:'Refund dengan tenggat bertanggal'},
    'A human on chat in 60 seconds':{id:'Manusia di chat dalam 60 detik'},
    'Real profiles, real rates, a schedule only you can change — and a Rp100.000 promise if we break it.':
      {id:'Profil nyata, tarif nyata, jadwal yang hanya bisa Anda ubah — dan janji Rp100.000 bila kami melanggarnya.'},
    'Once confirmed, only you can move the time. If we ever reschedule you, Rp100.000 credit lands in your wallet the same minute — no ticket, no chasing.':
      {id:'Setelah dikonfirmasi, hanya Anda yang bisa memindahkan jadwal. Bila kami yang memindahkan, Rp100.000 masuk ke dompet Anda di menit yang sama — tanpa tiket, tanpa mengejar.'},
    'Includes Rp100.000 guarantee credit':{id:'Termasuk kredit jaminan Rp100.000'},
    '5% off every visit':{id:'Diskon 5% tiap kunjungan'}, 'Withdraw':{id:'Tarik'},
    'Why the balance can\'t disappear':{id:'Kenapa saldonya tidak bisa hilang'},
    'Refunds land here within 3 working days, and every guarantee credit shows the order it came from. Balance never expires, and the refund tracker always carries a date.':
      {id:'Refund masuk ke sini dalam 3 hari kerja, dan tiap kredit jaminan menunjukkan pesanan asalnya. Saldo tidak pernah hangus, dan pelacak refund selalu bertanggal.'},
    'Charged after the visit is confirmed done. Cancelling or rescheduling within 4 hours costs Rp50.000 per cleaner. Refunds go to your EXO Wallet within 3 working days.':
      {id:'Ditagih setelah kunjungan dikonfirmasi selesai. Batal atau reschedule kurang dari 4 jam dikenai Rp50.000 per petugas. Refund masuk ke EXO Wallet dalam 3 hari kerja.'},
    'Lock this slot':{id:'Kunci jadwal ini'}, 'Enter PIN to pay':{id:'Masukkan PIN untuk membayar'}, 'Confirm payment':{id:'Konfirmasi pembayaran'},
    'Enter your 6-digit transaction PIN':{id:'Masukkan PIN transaksi 6 digit'}, 'Cancel':{id:'Batal'},
    'Not eligible':{id:'Tidak memenuhi'}, 'Applied ✓':{id:'Dipakai ✓'}, 'Apply':{id:'Pakai'},
    'Tap apply and we validate it before you pay.':{id:'Tekan pakai — kami validasi sebelum Anda bayar.'},
    'Checked against this cart — valid, applied. No surprises at payment.':{id:'Dicek terhadap keranjang ini — sah, dipakai. Tanpa kejutan saat bayar.'},
    'Good for a studio or 1BR':{id:'Cocok untuk studio atau 1 kamar'}, 'Typical 2BR apartment':{id:'Apartemen 2 kamar pada umumnya'},
    'House or post-party reset':{id:'Rumah atau beres-beres pasca acara'},
    'Arriving':{id:'Tiba'}, 'Working':{id:'Bekerja'}, 'left':{id:'lagi'}, 'Finished':{id:'Selesai'},
    'Rahma from support':{id:'Rahma dari layanan pelanggan'}, 'Human, replies in ~40s · not a bot':{id:'Manusia, membalas ~40 dtk · bukan bot'},
    'General':{id:'Umum'}, 'This service':{id:'Layanan ini'}, 'Prepaid':{id:'Prepaid'}, 'Privacy':{id:'Privasi'},
    'Terms & policies':{id:'Ketentuan & kebijakan'}, 'Share':{id:'Bagikan'},
    'Invite a friend':{id:'Undang teman'}, 'My clean':{id:'Hasil saya'}, 'Recommend':{id:'Rekomendasikan'}
  };

  /* -------------------------------------------------------------- helper */
  var lang = 'en';
  function set(code) { lang = LANGS.some(function (l) { return l.code === code; }) ? code : 'en'; return lang; }
  function get() { return lang; }

  function t(key) { var e = T[key] || {}; return e[lang] || e.en || key; }
  function tx(s) { var e = STR[s]; return (e && e[lang]) || s; }
  function svcName(key) { var e = SERVICE_NAMES[key] || {}; return e[lang] || e.en || key; }
  function warrantyText(w) { var e = WARRANTY[w]; return e ? (e[lang] || e.en) : w; }
  function unitLabel(u) { var e = UNIT_LABELS[u]; return e ? (e[lang] || e.en) : u; }
  function countWord(u) { var e = UNIT_COUNT[u]; return e ? (e[lang] || e.en) : ''; }
  function locale() { return LOCALES[lang] || 'en-GB'; }

  function fmt(d, opt) {
    try { return new Intl.DateTimeFormat(locale(), opt).format(d); }
    catch (e) { return new Intl.DateTimeFormat('en-GB', opt).format(d); }
  }
  function dowShort(d) { return fmt(d, { weekday:'short' }); }
  function dayMonth(d) { return fmt(d, { day:'numeric', month:'short' }); }

  function isRtl() { return lang === 'ar'; }

  return {
    LANGS: LANGS, LOCALES: LOCALES, T: T, STR: STR,
    SERVICE_NAMES: SERVICE_NAMES, WARRANTY: WARRANTY, UNIT_LABELS: UNIT_LABELS, UNIT_COUNT: UNIT_COUNT,
    set: set, get: get, t: t, tx: tx, svcName: svcName, warrantyText: warrantyText,
    unitLabel: unitLabel, countWord: countWord, locale: locale, dowShort: dowShort, dayMonth: dayMonth, isRtl: isRtl
  };
})();
