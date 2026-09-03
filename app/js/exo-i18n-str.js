/* ==========================================================================
   exo-i18n-str.js — kamus lengkap teks layar pelanggan EXOCLEAN App
   --------------------------------------------------------------------------
   Melengkapi EXO_I18N.STR (berkunci teks sumber Inggris). Dipakai dua cara:
     · tx('...') di kode layar, dan
     · penerjemah pasca-render di exo-core.js yang mencocokkan SETIAP simpul
       teks, placeholder, dan aria-label yang tampil dengan kamus ini —
       sehingga teks yang lahir dari data (ketentuan, notifikasi, riwayat
       dompet, catatan tahap) ikut berbahasa tanpa membungkus tiap baris.

   Cakupan (2 Sep 2026):
     · Bahasa Indonesia: LENGKAP untuk seluruh teks pelanggan.
     · 11 bahasa lain: label pendek, judul, tombol, dan pesan inti. Kalimat
       panjang (ketentuan layanan, kebijakan privasi, penjelasan) jatuh ke
       Inggris sampai diterjemahkan penerjemah manusia — lebih jujur daripada
       terjemahan mesin yang keliru pada dokumen yang mengikat.
   Sisi mitra sengaja tetap Bahasa Indonesia (rancangan): petugasnya
   berbahasa Indonesia.
   ========================================================================== */
(function (I) {
  'use strict';
  var S = I.STR;
  function L(en, semua) { S[en] = Object.assign(S[en] || {}, semua); }
  function id(en, terjemahan) { S[en] = Object.assign(S[en] || {}, { id: terjemahan }); }

  /* ------------------------------------------------ 12 bahasa: label inti */
  L('Back', {id:'Kembali', ja:'戻る', ko:'뒤로', zh:'返回', ar:'رجوع', ms:'Kembali', th:'กลับ', vi:'Quay lại', tl:'Bumalik', km:'ត្រឡប់', my:'နောက်သို့'});
  L('Close', {id:'Tutup', ja:'閉じる', ko:'닫기', zh:'关闭', ar:'إغلاق', ms:'Tutup', th:'ปิด', vi:'Đóng', tl:'Isara', km:'បិទ', my:'ပိတ်'});
  L('Call', {id:'Telepon', ja:'電話', ko:'전화', zh:'致电', ar:'اتصال', ms:'Telefon', th:'โทร', vi:'Gọi', tl:'Tawagan', km:'ហៅ', my:'ခေါ်ဆို'});
  L('Send', {id:'Kirim', ja:'送信', ko:'보내기', zh:'发送', ar:'إرسال', ms:'Hantar', th:'ส่ง', vi:'Gửi', tl:'Ipadala', km:'ផ្ញើ', my:'ပို့'});
  L('Less', {id:'Kurangi', ja:'減らす', ko:'줄이기', zh:'减少', ar:'أقل', ms:'Kurang', th:'ลด', vi:'Bớt', tl:'Bawasan', km:'ថយ', my:'လျှော့'});
  L('More', {id:'Tambah', ja:'増やす', ko:'늘리기', zh:'增加', ar:'أكثر', ms:'Tambah', th:'เพิ่ม', vi:'Thêm', tl:'Dagdagan', km:'បន្ថែម', my:'တိုး'});
  L('Free', {id:'Gratis', ja:'無料', ko:'무료', zh:'免费', ar:'مجاناً', ms:'Percuma', th:'ฟรี', vi:'Miễn phí', tl:'Libre', km:'ឥតគិតថ្លៃ', my:'အခမဲ့'});
  L('Total', {id:'Total', ja:'合計', ko:'합계', zh:'合计', ar:'الإجمالي', ms:'Jumlah', th:'รวม', vi:'Tổng', tl:'Kabuuan', km:'សរុប', my:'စုစုပေါင်း'});
  L('Voucher', {id:'Voucher', ja:'クーポン', ko:'쿠폰', zh:'优惠券', ar:'قسيمة', ms:'Baucar', th:'คูปอง', vi:'Phiếu giảm giá', tl:'Voucher', km:'គូប៉ុង', my:'ဗောက်ချာ'});
  L('Promo', {id:'Promo', ja:'プロモ', ko:'프로모', zh:'优惠', ar:'عرض', ms:'Promo', th:'โปรโมชั่น', vi:'Khuyến mãi', tl:'Promo', km:'ប្រូម៉ូ', my:'ပရိုမို'});
  L('Email', {id:'Email', ja:'メール', ko:'이메일', zh:'电子邮箱', ar:'البريد الإلكتروني', ms:'E-mel', th:'อีเมล', vi:'Email', tl:'Email', km:'អ៊ីមែល', my:'အီးမေးလ်'});
  L('Wallet', {id:'Dompet', ja:'ウォレット', ko:'지갑', zh:'钱包', ar:'المحفظة', ms:'Dompet', th:'กระเป๋าเงิน', vi:'Ví', tl:'Wallet', km:'កាបូប', my:'ပိုက်ဆံအိတ်'});
  L('Notifications', {id:'Notifikasi', ja:'通知', ko:'알림', zh:'通知', ar:'الإشعارات', ms:'Pemberitahuan', th:'การแจ้งเตือน', vi:'Thông báo', tl:'Mga abiso', km:'ការជូនដំណឹង', my:'အသိပေးချက်'});
  L('Search services', {id:'Cari layanan', ja:'サービスを検索', ko:'서비스 검색', zh:'搜索服务', ar:'ابحث عن خدمة', ms:'Cari perkhidmatan', th:'ค้นหาบริการ', vi:'Tìm dịch vụ', tl:'Maghanap ng serbisyo', km:'ស្វែងរកសេវា', my:'ဝန်ဆောင်မှုရှာ'});
  L('Chat', {id:'Chat', ja:'チャット', ko:'채팅', zh:'聊天', ar:'دردشة', ms:'Sembang', th:'แชท', vi:'Trò chuyện', tl:'Chat', km:'ជជែក', my:'ချက်'});
  L('Message', {id:'Pesan', ja:'メッセージ', ko:'메시지', zh:'消息', ar:'رسالة', ms:'Mesej', th:'ข้อความ', vi:'Tin nhắn', tl:'Mensahe', km:'សារ', my:'စာ'});
  L('Type a message', {id:'Tulis pesan', ja:'メッセージを入力', ko:'메시지 입력', zh:'输入消息', ar:'اكتب رسالة', ms:'Taip mesej', th:'พิมพ์ข้อความ', vi:'Nhập tin nhắn', tl:'Mag-type ng mensahe', km:'វាយសារ', my:'စာရိုက်ပါ'});
  L('Invite', {id:'Undang', ja:'招待', ko:'초대', zh:'邀请', ar:'دعوة', ms:'Jemput', th:'เชิญ', vi:'Mời', tl:'Imbitahan', km:'អញ្ជើញ', my:'ဖိတ်ခေါ်'});
  L('a cleaner', {id:'petugas', ja:'スタッフを', ko:'클리너', zh:'清洁师', ar:'عاملاً', ms:'petugas', th:'พนักงาน', vi:'nhân viên', tl:'tauhan', km:'អ្នកសម្អាត', my:'ဝန်ထမ်း'});
  L('Referral', {id:'Referral', ja:'紹介', ko:'추천', zh:'推荐', ar:'إحالة', ms:'Rujukan', th:'แนะนำเพื่อน', vi:'Giới thiệu', tl:'Referral', km:'ការណែនាំ', my:'မိတ်ဆက်'});
  L('Recommendation', {id:'Rekomendasi', ja:'おすすめ', ko:'추천', zh:'推荐', ar:'توصية', ms:'Cadangan', th:'คำแนะนำ', vi:'Đề xuất', tl:'Rekomendasyon', km:'អនុសាសន៍', my:'အကြံပြု'});
  L('Before / after', {id:'Sebelum / sesudah', ja:'作業前 / 後', ko:'전 / 후', zh:'清洁前 / 后', ar:'قبل / بعد', ms:'Sebelum / selepas', th:'ก่อน / หลัง', vi:'Trước / sau', tl:'Bago / pagkatapos', km:'មុន / ក្រោយ', my:'မတိုင်မီ / ပြီးနောက်'});
  L('Copy link', {id:'Salin tautan', ja:'リンクをコピー', ko:'링크 복사', zh:'复制链接', ar:'نسخ الرابط', ms:'Salin pautan', th:'คัดลอกลิงก์', vi:'Sao chép liên kết', tl:'Kopyahin ang link', km:'ចម្លងតំណ', my:'လင့်ကူးယူ'});
  L('Save image', {id:'Simpan gambar', ja:'画像を保存', ko:'이미지 저장', zh:'保存图片', ar:'حفظ الصورة', ms:'Simpan imej', th:'บันทึกรูป', vi:'Lưu ảnh', tl:'I-save ang larawan', km:'រក្សាទុករូប', my:'ပုံသိမ်း'});
  L('Prepaid', {id:'Prepaid', ja:'プリペイド', ko:'선불', zh:'预付', ar:'مسبق الدفع', ms:'Prabayar', th:'เติมเงิน', vi:'Trả trước', tl:'Prepaid', km:'បង់មុន', my:'ကြိုတင်ပေး'});
  L('Pick an amount', {id:'Pilih nominal', ja:'金額を選択', ko:'금액 선택', zh:'选择金额', ar:'اختر المبلغ', ms:'Pilih jumlah', th:'เลือกจำนวน', vi:'Chọn số tiền', tl:'Pumili ng halaga', km:'ជ្រើសចំនួន', my:'ပမာဏရွေး'});
  L('New date', {id:'Tanggal baru', ja:'新しい日付', ko:'새 날짜', zh:'新日期', ar:'تاريخ جديد', ms:'Tarikh baharu', th:'วันที่ใหม่', vi:'Ngày mới', tl:'Bagong petsa', km:'កាលបរិច្ឆេទថ្មី', my:'ရက်စွဲအသစ်'});
  L('New start time', {id:'Jam mulai baru', ja:'新しい開始時刻', ko:'새 시작 시간', zh:'新开始时间', ar:'وقت بدء جديد', ms:'Masa mula baharu', th:'เวลาเริ่มใหม่', vi:'Giờ bắt đầu mới', tl:'Bagong oras', km:'ម៉ោងចាប់ផ្តើមថ្មី', my:'စတင်ချိန်အသစ်'});
  L('Pick a new slot', {id:'Pilih jadwal baru', ja:'新しい枠を選択', ko:'새 시간 선택', zh:'选择新时段', ar:'اختر موعداً جديداً', ms:'Pilih slot baharu', th:'เลือกช่วงเวลาใหม่', vi:'Chọn khung giờ mới', tl:'Pumili ng bagong slot', km:'ជ្រើសម៉ោងថ្មី', my:'အချိန်အသစ်ရွေး'});
  L('Verify and continue', {id:'Verifikasi dan lanjutkan', ja:'認証して続行', ko:'인증 후 계속', zh:'验证并继续', ar:'تحقق وتابع', ms:'Sahkan dan teruskan', th:'ยืนยันและดำเนินการต่อ', vi:'Xác minh và tiếp tục', tl:'I-verify at magpatuloy', km:'ផ្ទៀងផ្ទាត់ និងបន្ត', my:'အတည်ပြုပြီးဆက်လုပ်'});
  L('Resend code', {id:'Kirim ulang kode', ja:'コードを再送', ko:'코드 재전송', zh:'重新发送验证码', ar:'إعادة إرسال الرمز', ms:'Hantar semula kod', th:'ส่งรหัสอีกครั้ง', vi:'Gửi lại mã', tl:'Ipadala ulit ang code', km:'ផ្ញើកូដម្តងទៀត', my:'ကုဒ်ပြန်ပို့'});
  L('Complete the captcha', {id:'Selesaikan captcha dulu', ja:'認証を完了してください', ko:'캡차를 완료하세요', zh:'请完成验证', ar:'أكمل التحقق', ms:'Lengkapkan captcha', th:'กรุณาทำแคปช่า', vi:'Hoàn tất captcha', tl:'Kumpletuhin ang captcha', km:'បំពេញ captcha', my:'captcha ပြီးအောင်လုပ်ပါ'});
  L('Accept the terms to continue', {id:'Setujui ketentuan untuk melanjutkan', ja:'続行するには規約に同意してください', ko:'계속하려면 약관에 동의하세요', zh:'请同意条款以继续', ar:'وافق على الشروط للمتابعة', ms:'Terima terma untuk teruskan', th:'ยอมรับข้อตกลงเพื่อดำเนินการต่อ', vi:'Chấp nhận điều khoản để tiếp tục', tl:'Tanggapin ang mga tuntunin', km:'ទទួលយកលក្ខខណ្ឌដើម្បីបន្ត', my:'ဆက်လုပ်ရန်စည်းကမ်းကိုလက်ခံပါ'});
  L('Send verification code', {id:'Kirim kode verifikasi', ja:'認証コードを送信', ko:'인증 코드 보내기', zh:'发送验证码', ar:'إرسال رمز التحقق', ms:'Hantar kod pengesahan', th:'ส่งรหัสยืนยัน', vi:'Gửi mã xác minh', tl:'Ipadala ang verification code', km:'ផ្ញើកូដផ្ទៀងផ្ទាត់', my:'အတည်ပြုကုဒ်ပို့'});
  L('Verify it is you', {id:'Pastikan ini Anda', ja:'本人確認', ko:'본인 확인', zh:'验证您的身份', ar:'تأكد أنه أنت', ms:'Sahkan ini anda', th:'ยืนยันตัวตน', vi:'Xác minh là bạn', tl:'Kumpirmahin na ikaw ito', km:'បញ្ជាក់ថាជាអ្នក', my:'သင်ဖြစ်ကြောင်းအတည်ပြုပါ'});
  L('Secure your money', {id:'Amankan uang Anda', ja:'お金を守る', ko:'자금 보호', zh:'保护您的资金', ar:'أمّن أموالك', ms:'Lindungi wang anda', th:'ปกป้องเงินของคุณ', vi:'Bảo vệ tiền của bạn', tl:'Protektahan ang pera mo', km:'ការពារលុយរបស់អ្នក', my:'သင့်ငွေကိုကာကွယ်ပါ'});
  L('Enter 6 digits', {id:'Masukkan 6 digit', ja:'6桁を入力', ko:'6자리 입력', zh:'输入6位数字', ar:'أدخل ٦ أرقام', ms:'Masukkan 6 digit', th:'กรอก 6 หลัก', vi:'Nhập 6 chữ số', tl:'Ilagay ang 6 na digit', km:'បញ្ចូល៦ខ្ទង់', my:'ဂဏန်း ၆ လုံးထည့်ပါ'});
  L('Finish and enable Face ID', {id:'Selesai dan aktifkan Face ID', ja:'完了してFace IDを有効化', ko:'완료 및 Face ID 사용', zh:'完成并启用面容ID', ar:'إنهاء وتفعيل Face ID', ms:'Selesai dan aktifkan Face ID', th:'เสร็จสิ้นและเปิด Face ID', vi:'Hoàn tất và bật Face ID', tl:'Tapusin at i-enable ang Face ID', km:'បញ្ចប់ និងបើក Face ID', my:'ပြီးဆုံးပြီး Face ID ဖွင့်'});
  L('Complete payment', {id:'Selesaikan pembayaran', ja:'支払いを完了', ko:'결제 완료', zh:'完成支付', ar:'أكمل الدفع', ms:'Lengkapkan pembayaran', th:'ชำระเงินให้เสร็จ', vi:'Hoàn tất thanh toán', tl:'Kumpletuhin ang bayad', km:'បញ្ចប់ការទូទាត់', my:'ငွေပေးချေမှုပြီးအောင်လုပ်'});
  L('Payment code', {id:'Kode bayar', ja:'支払いコード', ko:'결제 코드', zh:'付款码', ar:'رمز الدفع', ms:'Kod bayaran', th:'รหัสชำระเงิน', vi:'Mã thanh toán', tl:'Payment code', km:'កូដទូទាត់', my:'ငွေပေးချေကုဒ်'});
  L('Status:', {id:'Status:', ja:'状態:', ko:'상태:', zh:'状态:', ar:'الحالة:', ms:'Status:', th:'สถานะ:', vi:'Trạng thái:', tl:'Status:', km:'ស្ថានភាព:', my:'အခြေအနေ:'});
  L('Open payment page', {id:'Buka halaman pembayaran', ja:'支払いページを開く', ko:'결제 페이지 열기', zh:'打开支付页面', ar:'افتح صفحة الدفع', ms:'Buka halaman pembayaran', th:'เปิดหน้าชำระเงิน', vi:'Mở trang thanh toán', tl:'Buksan ang payment page', km:'បើកទំព័រទូទាត់', my:'ငွေပေးချေစာမျက်နှာဖွင့်'});
  L('I have paid · check now', {id:'Sudah bayar · cek sekarang', ja:'支払い済み・確認', ko:'결제했어요 · 확인', zh:'已支付 · 立即检查', ar:'دفعت · تحقق الآن', ms:'Sudah bayar · semak', th:'ชำระแล้ว · ตรวจสอบ', vi:'Đã thanh toán · kiểm tra', tl:'Nakabayad na · suriin', km:'បានបង់ · ពិនិត្យ', my:'ပေးပြီး · စစ်ဆေး'});
  L('Minimum order', {id:'Pesanan minimum', ja:'最低注文', ko:'최소 주문', zh:'最低订单', ar:'الحد الأدنى للطلب', ms:'Pesanan minimum', th:'ยอดสั่งขั้นต่ำ', vi:'Đơn tối thiểu', tl:'Minimum na order', km:'ការបញ្ជាទិញអប្បបរមា', my:'အနည်းဆုံးအော်ဒါ'});
  L('What is included', {id:'Yang termasuk', ja:'含まれるもの', ko:'포함 사항', zh:'包含内容', ar:'ما هو مشمول', ms:'Yang termasuk', th:'รวมอะไรบ้าง', vi:'Bao gồm', tl:'Kasama', km:'អ្វីដែលរួមបញ្ចូល', my:'ပါဝင်သည်'});
  L('What is not included', {id:'Yang tidak termasuk', ja:'含まれないもの', ko:'미포함 사항', zh:'不包含内容', ar:'ما هو غير مشمول', ms:'Yang tidak termasuk', th:'ไม่รวมอะไรบ้าง', vi:'Không bao gồm', tl:'Hindi kasama', km:'អ្វីដែលមិនរួមបញ្ចូល', my:'မပါဝင်သည်'});
  L('We bring', {id:'Kami bawa', ja:'当社が用意', ko:'저희가 준비', zh:'我们提供', ar:'نحن نحضر', ms:'Kami bawa', th:'เราเตรียม', vi:'Chúng tôi mang', tl:'Dala namin', km:'យើងយកមក', my:'ကျွန်ုပ်တို့ယူလာ'});
  L('You provide', {id:'Anda sediakan', ja:'お客様が用意', ko:'고객님이 준비', zh:'您提供', ar:'أنت توفر', ms:'Anda sediakan', th:'คุณเตรียม', vi:'Bạn chuẩn bị', tl:'Ikaw ang magbibigay', km:'អ្នកផ្តល់', my:'သင်ပြင်ဆင်'});
  L('Limits', {id:'Batasan', ja:'制限', ko:'제한', zh:'限制', ar:'الحدود', ms:'Had', th:'ข้อจำกัด', vi:'Giới hạn', tl:'Mga limitasyon', km:'ដែនកំណត់', my:'ကန့်သတ်ချက်'});
  L('Terms & policies', {id:'Ketentuan & kebijakan', ja:'規約とポリシー', ko:'약관 및 정책', zh:'条款与政策', ar:'الشروط والسياسات', ms:'Terma & dasar', th:'ข้อกำหนดและนโยบาย', vi:'Điều khoản & chính sách', tl:'Mga tuntunin at patakaran', km:'លក្ខខណ្ឌ និងគោលការណ៍', my:'စည်းကမ်းနှင့်မူဝါဒ'});
  L('Add a photo', {id:'Tambah foto', ja:'写真を追加', ko:'사진 추가', zh:'添加照片', ar:'أضف صورة', ms:'Tambah foto', th:'เพิ่มรูป', vi:'Thêm ảnh', tl:'Magdagdag ng larawan', km:'បន្ថែមរូប', my:'ဓာတ်ပုံထည့်'});
  L('add', {id:'tambah', ja:'追加', ko:'추가', zh:'添加', ar:'أضف', ms:'tambah', th:'เพิ่ม', vi:'thêm', tl:'idagdag', km:'បន្ថែម', my:'ထည့်'});
  L('photo', {id:'foto', ja:'写真', ko:'사진', zh:'照片', ar:'صورة', ms:'foto', th:'รูป', vi:'ảnh', tl:'larawan', km:'រូប', my:'ပုံ'});
  L('Paste code from WhatsApp', {id:'Tempel kode dari WhatsApp', ja:'WhatsAppのコードを貼り付け', ko:'WhatsApp 코드 붙여넣기', zh:'粘贴WhatsApp验证码', ar:'الصق الرمز من واتساب', ms:'Tampal kod dari WhatsApp', th:'วางรหัสจาก WhatsApp', vi:'Dán mã từ WhatsApp', tl:'I-paste ang code mula WhatsApp', km:'បិទភ្ជាប់កូដពី WhatsApp', my:'WhatsApp မှကုဒ်ကူးထည့်'});
  L('use authenticator instead', {id:'pakai aplikasi autentikator', ja:'認証アプリを使う', ko:'인증 앱 사용', zh:'改用验证器', ar:'استخدم تطبيق المصادقة', ms:'guna aplikasi pengesah', th:'ใช้แอปยืนยันตัวตนแทน', vi:'dùng ứng dụng xác thực', tl:'gumamit ng authenticator', km:'ប្រើកម្មវិធីផ្ទៀងផ្ទាត់', my:'authenticator သုံးပါ'});
  L('Step 1 of 3 · your details', {id:'Langkah 1 dari 3 · data Anda', ja:'ステップ1/3・お客様情報', ko:'1/3단계 · 정보 입력', zh:'第1步/共3步 · 您的信息', ar:'الخطوة ١ من ٣ · بياناتك', ms:'Langkah 1 dari 3 · butiran anda', th:'ขั้น 1 จาก 3 · ข้อมูลของคุณ', vi:'Bước 1/3 · thông tin của bạn', tl:'Hakbang 1 ng 3 · detalye mo', km:'ជំហាន ១/៣ · ព័ត៌មានអ្នក', my:'အဆင့် ၁/၃ · သင့်အချက်အလက်'});
  L('Step 2 of 3 · two-step verification', {id:'Langkah 2 dari 3 · verifikasi dua langkah', ja:'ステップ2/3・二段階認証', ko:'2/3단계 · 2단계 인증', zh:'第2步/共3步 · 两步验证', ar:'الخطوة ٢ من ٣ · التحقق بخطوتين', ms:'Langkah 2 dari 3 · pengesahan dua langkah', th:'ขั้น 2 จาก 3 · ยืนยันสองขั้นตอน', vi:'Bước 2/3 · xác minh hai bước', tl:'Hakbang 2 ng 3 · two-step verification', km:'ជំហាន ២/៣ · ផ្ទៀងផ្ទាត់ពីរជំហាន', my:'အဆင့် ၂/၃ · နှစ်ဆင့်အတည်ပြု'});
  L('Step 3 of 3 · transaction PIN', {id:'Langkah 3 dari 3 · PIN transaksi', ja:'ステップ3/3・取引PIN', ko:'3/3단계 · 거래 PIN', zh:'第3步/共3步 · 交易密码', ar:'الخطوة ٣ من ٣ · رمز المعاملات', ms:'Langkah 3 dari 3 · PIN transaksi', th:'ขั้น 3 จาก 3 · PIN ธุรกรรม', vi:'Bước 3/3 · mã PIN giao dịch', tl:'Hakbang 3 ng 3 · transaction PIN', km:'ជំហាន ៣/៣ · លេខសម្ងាត់', my:'အဆင့် ၃/၃ · ငွေပေးချေ PIN'});
  L('I am not a robot', {id:'Saya bukan robot', ja:'私はロボットではありません', ko:'로봇이 아닙니다', zh:'我不是机器人', ar:'أنا لست روبوتاً', ms:'Saya bukan robot', th:'ฉันไม่ใช่โปรแกรมอัตโนมัติ', vi:'Tôi không phải robot', tl:'Hindi ako robot', km:'ខ្ញុំមិនមែនជាមនុស្សយន្ត', my:'ကျွန်ုပ်စက်ရုပ်မဟုတ်ပါ'});
  L('Verified — you are human', {id:'Terverifikasi — Anda manusia', ja:'認証済み', ko:'인증됨', zh:'已验证', ar:'تم التحقق', ms:'Disahkan', th:'ยืนยันแล้ว', vi:'Đã xác minh', tl:'Na-verify', km:'បានផ្ទៀងផ្ទាត់', my:'အတည်ပြုပြီး'});
  L('Prove you are human', {id:'Buktikan Anda manusia', ja:'人間であることを証明', ko:'사람임을 확인', zh:'证明您是真人', ar:'أثبت أنك إنسان', ms:'Buktikan anda manusia', th:'ยืนยันว่าเป็นมนุษย์', vi:'Xác nhận bạn là người', tl:'Patunayan na tao ka', km:'បញ្ជាក់ថាជាមនុស្ស', my:'လူဖြစ်ကြောင်းသက်သေပြပါ'});
  L('Lock this slot', {id:'Kunci jadwal ini', ja:'この枠を確定', ko:'이 시간 확정', zh:'锁定此时段', ar:'ثبّت هذا الموعد', ms:'Kunci slot ini', th:'ล็อกเวลานี้', vi:'Giữ lịch này', tl:'I-lock ang slot na ito', km:'ចាក់សោម៉ោងនេះ', my:'ဤအချိန်ကိုသတ်မှတ်'});
  L('Enter PIN to pay', {id:'Masukkan PIN untuk membayar', ja:'PINを入力して支払う', ko:'PIN 입력 후 결제', zh:'输入密码支付', ar:'أدخل الرمز للدفع', ms:'Masukkan PIN untuk bayar', th:'กรอก PIN เพื่อชำระ', vi:'Nhập PIN để thanh toán', tl:'Ilagay ang PIN para magbayad', km:'បញ្ចូល PIN ដើម្បីបង់', my:'ပေးရန် PIN ထည့်ပါ'});
  L('Confirm payment', {id:'Konfirmasi pembayaran', ja:'支払いを確定', ko:'결제 확인', zh:'确认支付', ar:'تأكيد الدفع', ms:'Sahkan pembayaran', th:'ยืนยันการชำระ', vi:'Xác nhận thanh toán', tl:'Kumpirmahin ang bayad', km:'បញ្ជាក់ការទូទាត់', my:'ငွေပေးချေမှုအတည်ပြု'});
  L('Enter your 6-digit transaction PIN', {id:'Masukkan PIN transaksi 6 digit', ja:'6桁の取引PINを入力', ko:'6자리 거래 PIN 입력', zh:'输入6位交易密码', ar:'أدخل رمز المعاملات المكون من ٦ أرقام', ms:'Masukkan PIN transaksi 6 digit', th:'กรอก PIN ธุรกรรม 6 หลัก', vi:'Nhập mã PIN giao dịch 6 số', tl:'Ilagay ang 6-digit PIN', km:'បញ្ចូល PIN ៦ខ្ទង់', my:'ဂဏန်း ၆ လုံး PIN ထည့်ပါ'});
  L('Cancel', {id:'Batal', ja:'キャンセル', ko:'취소', zh:'取消', ar:'إلغاء', ms:'Batal', th:'ยกเลิก', vi:'Hủy', tl:'Kanselahin', km:'បោះបង់', my:'ပယ်ဖျက်'});
  L('Available cleaners', {ja:'対応可能なスタッフ', ko:'예약 가능한 클리너', zh:'可预约的清洁师', ar:'العمال المتاحون', ms:'Petugas tersedia', th:'พนักงานที่ว่าง', vi:'Nhân viên sẵn sàng', tl:'Mga available na tauhan', km:'អ្នកសម្អាតដែលអាចរកបាន', my:'ရရှိနိုင်သောဝန်ထမ်း'});
  L('Review & pay', {ja:'確認して支払う', ko:'확인 및 결제', zh:'确认并支付', ar:'راجع وادفع', ms:'Semak & bayar', th:'ตรวจสอบและชำระ', vi:'Xem lại & thanh toán', tl:'Suriin at magbayad', km:'ពិនិត្យ និងបង់', my:'စစ်ပြီးပေးချေ'});
  L('Best match', {ja:'おすすめ順', ko:'추천순', zh:'最匹配', ar:'الأنسب', ms:'Paling sesuai', th:'เหมาะที่สุด', vi:'Phù hợp nhất', tl:'Pinakabagay', km:'សមបំផុត', my:'အသင့်တော်ဆုံး'});
  L('Booked before', {ja:'利用履歴あり', ko:'이전 예약', zh:'曾预约', ar:'حجزت من قبل', ms:'Pernah ditempah', th:'เคยจอง', vi:'Đã từng đặt', tl:'Nauna nang na-book', km:'ធ្លាប់កក់', my:'ယခင်မှာဖူး'});
  L('Lowest rate', {ja:'料金が安い順', ko:'낮은 요금순', zh:'价格最低', ar:'الأقل سعراً', ms:'Kadar terendah', th:'ราคาต่ำสุด', vi:'Giá thấp nhất', tl:'Pinakamura', km:'តម្លៃទាបបំផុត', my:'နှုန်းအနိမ့်ဆုံး'});
  L('Nearest', {ja:'近い順', ko:'가까운 순', zh:'最近', ar:'الأقرب', ms:'Terdekat', th:'ใกล้ที่สุด', vi:'Gần nhất', tl:'Pinakamalapit', km:'ជិតបំផុត', my:'အနီးဆုံး'});
  L('jobs', {ja:'件', ko:'건', zh:'单', ar:'مهمة', ms:'kerja', th:'งาน', vi:'việc', tl:'trabaho', km:'ការងារ', my:'အလုပ်'});
  L('total', {ja:'合計', ko:'합계', zh:'合计', ar:'الإجمالي', ms:'jumlah', th:'รวม', vi:'tổng', tl:'kabuuan', km:'សរុប', my:'စုစုပေါင်း'});
  L('Platform fee', {ja:'プラットフォーム手数料', ko:'플랫폼 수수료', zh:'平台费', ar:'رسوم المنصة', ms:'Yuran platform', th:'ค่าธรรมเนียมแพลตฟอร์ม', vi:'Phí nền tảng', tl:'Platform fee', km:'ថ្លៃវេទិកា', my:'ပလက်ဖောင်းကြေး'});
  L('not applied', {ja:'適用なし', ko:'미적용', zh:'未使用', ar:'غير مطبق', ms:'tidak dikenakan', th:'ไม่ได้ใช้', vi:'không áp dụng', tl:'hindi ginamit', km:'មិនបានអនុវត្ត', my:'မသုံးပါ'});
  L('Add-ons', {ja:'オプション', ko:'추가 옵션', zh:'附加服务', ar:'إضافات', ms:'Tambahan', th:'บริการเสริม', vi:'Dịch vụ thêm', tl:'Mga dagdag', km:'សេវាបន្ថែម', my:'ထပ်ဆောင်း'});
  L('Payment methods', {ja:'支払い方法', ko:'결제 수단', zh:'支付方式', ar:'طرق الدفع', ms:'Kaedah pembayaran', th:'วิธีชำระเงิน', vi:'Phương thức thanh toán', tl:'Mga paraan ng bayad', km:'វិធីទូទាត់', my:'ငွေပေးချေနည်း'});
  L('Saved addresses', {ja:'保存済み住所', ko:'저장된 주소', zh:'已保存地址', ar:'العناوين المحفوظة', ms:'Alamat tersimpan', th:'ที่อยู่ที่บันทึก', vi:'Địa chỉ đã lưu', tl:'Mga naka-save na address', km:'អាសយដ្ឋានបានរក្សាទុក', my:'သိမ်းထားသောလိပ်စာ'});
  L('Favourite cleaners', {ja:'お気に入りスタッフ', ko:'즐겨찾는 클리너', zh:'常用清洁师', ar:'العمال المفضلون', ms:'Petugas kegemaran', th:'พนักงานคนโปรด', vi:'Nhân viên yêu thích', tl:'Mga paboritong tauhan', km:'អ្នកសម្អាតដែលចូលចិត្ត', my:'အကြိုက်ဆုံးဝန်ထမ်း'});
  L('Home', {ja:'自宅', ko:'집', zh:'家', ar:'المنزل', ms:'Rumah', th:'บ้าน', vi:'Nhà', tl:'Bahay', km:'ផ្ទះ', my:'အိမ်'});
  L('Office', {ja:'オフィス', ko:'사무실', zh:'办公室', ar:'المكتب', ms:'Pejabat', th:'ที่ทำงาน', vi:'Văn phòng', tl:'Opisina', km:'ការិយាល័យ', my:'ရုံး'});
  L('Default', {ja:'既定', ko:'기본', zh:'默认', ar:'افتراضي', ms:'Lalai', th:'ค่าเริ่มต้น', vi:'Mặc định', tl:'Default', km:'លំនាំដើម', my:'ပုံသေ'});
  L('Today', {ja:'今日', ko:'오늘', zh:'今天', ar:'اليوم', ms:'Hari ini', th:'วันนี้', vi:'Hôm nay', tl:'Ngayon', km:'ថ្ងៃនេះ', my:'ယနေ့'});
  L('Active', {ja:'有効', ko:'활성', zh:'有效', ar:'نشط', ms:'Aktif', th:'ใช้งานอยู่', vi:'Đang hoạt động', tl:'Aktibo', km:'សកម្ម', my:'အသက်ဝင်'});
  L('Track', {ja:'追跡', ko:'추적', zh:'追踪', ar:'تتبع', ms:'Jejak', th:'ติดตาม', vi:'Theo dõi', tl:'Subaybayan', km:'តាមដាន', my:'ခြေရာခံ'});
  L('Times follow', {id:'Waktu mengikuti', ja:'時刻の基準:', ko:'시간 기준:', zh:'时间以此为准:', ar:'التوقيت حسب', ms:'Waktu mengikut', th:'เวลาตาม', vi:'Giờ theo', tl:'Oras ayon sa', km:'ម៉ោងតាម', my:'အချိန်အခြေခံ'});
  L('on your phone', {id:'di ponsel Anda', ja:'お使いの端末では', ko:'내 휴대폰 기준', zh:'您的手机上为', ar:'على هاتفك', ms:'di telefon anda', th:'บนโทรศัพท์ของคุณ', vi:'trên điện thoại của bạn', tl:'sa telepono mo', km:'នៅលើទូរស័ព្ទអ្នក', my:'သင့်ဖုန်းတွင်'});
  L('Less than 4 hours before the start — moving it costs Rp50.000 per cleaner.', {id:'Kurang dari 4 jam sebelum mulai — memindahkannya dikenai Rp50.000 per petugas.', ja:'開始まで4時間未満のため、変更にはスタッフ1名につきRp50.000かかります。', ko:'시작까지 4시간 미만이라 변경 시 클리너 1명당 Rp50.000이 부과됩니다.', zh:'距开始不足4小时，改期每位清洁师收取Rp50.000。', ar:'أقل من 4 ساعات قبل البدء — التغيير يكلف Rp50.000 لكل عامل.', ms:'Kurang 4 jam sebelum mula — mengubahnya dikenakan Rp50.000 setiap petugas.', th:'เหลือไม่ถึง 4 ชั่วโมงก่อนเริ่ม — การเลื่อนคิดค่าธรรมเนียม Rp50.000 ต่อพนักงาน', vi:'Chưa đầy 4 giờ trước giờ bắt đầu — đổi lịch tính phí Rp50.000 mỗi nhân viên.', tl:'Wala pang 4 na oras bago magsimula — may bayad na Rp50.000 bawat tauhan ang paglipat.', km:'តិចជាង 4 ម៉ោងមុនចាប់ផ្ដើម — ការផ្លាស់ប្ដូរគិតថ្លៃ Rp50.000 ក្នុងអ្នកសម្អាតម្នាក់។', my:'စတင်ရန် ၄ နာရီမပြည့်တော့ပါ — ပြောင်းလျှင် ဝန်ထမ်းတစ်ဦးလျှင် Rp50.000 ကျသင့်ပါသည်။'});
  L('More than 4 hours before the start — moving it is free.', {id:'Lebih dari 4 jam sebelum mulai — memindahkannya gratis.', ja:'開始まで4時間以上あるため、変更は無料です。', ko:'시작까지 4시간 이상 남아 변경은 무료입니다.', zh:'距开始超过4小时，改期免费。', ar:'أكثر من 4 ساعات قبل البدء — التغيير مجاني.', ms:'Lebih 4 jam sebelum mula — mengubahnya percuma.', th:'เหลือมากกว่า 4 ชั่วโมงก่อนเริ่ม — เลื่อนได้ฟรี', vi:'Còn hơn 4 giờ trước giờ bắt đầu — đổi lịch miễn phí.', tl:'Mahigit 4 na oras pa bago magsimula — libre ang paglipat.', km:'លើសពី 4 ម៉ោងមុនចាប់ផ្ដើម — ការផ្លាស់ប្ដូរឥតគិតថ្លៃ។', my:'စတင်ရန် ၄ နာရီကျော်ကျန်သေးသည် — ပြောင်းခြင်း အခမဲ့ဖြစ်သည်။'});
  /* Alur transaksi per layanan (3 Sep 2026) */
  L('Instant booking', {id:'Pesanan instan', ja:'即時予約', ko:'즉시 예약', zh:'即时预约', ar:'حجز فوري', ms:'Tempahan segera', th:'จองทันที', vi:'Đặt ngay', tl:'Agarang booking', km:'កក់ភ្លាមៗ', my:'ချက်ချင်းမှာယူ'});
  L('Survey first', {id:'Survei dulu', ja:'まず現地調査', ko:'실사 먼저', zh:'先勘察', ar:'المعاينة أولاً', ms:'Tinjauan dahulu', th:'สำรวจก่อน', vi:'Khảo sát trước', tl:'Survey muna', km:'ស្ទង់មុន', my:'အရင်စစ်ဆေး'});
  L('Weigh at pickup', {id:'Timbang saat jemput', ja:'集荷時に計量', ko:'수거 시 계량', zh:'取件时称重', ar:'الوزن عند الاستلام', ms:'Timbang semasa ambil', th:'ชั่งตอนรับ', vi:'Cân khi nhận', tl:'Timbang sa pickup', km:'ថ្លឹងពេលមកយក', my:'လာယူချိန်ချိန်'});
  L('Contract', {id:'Kontrak', ja:'契約', ko:'계약', zh:'合同', ar:'عقد', ms:'Kontrak', th:'สัญญา', vi:'Hợp đồng', tl:'Kontrata', km:'កិច្ចសន្យា', my:'စာချုပ်'});
  L('Errand', {id:'Titip belanja', ja:'お使い', ko:'심부름', zh:'跑腿', ar:'مهمة', ms:'Suruhan', th:'ฝากธุระ', vi:'Việc vặt', tl:'Utos', km:'បញ្ជូន', my:'အလုပ်ကိစ္စ'});
  L('Lock this slot', {id:'Kunci jadwal ini', ja:'この枠を確定', ko:'이 시간 확정', zh:'锁定此时段', ar:'تثبيت الموعد', ms:'Kunci slot ini', th:'ล็อกช่วงเวลานี้', vi:'Khóa lịch này', tl:'I-lock ang slot', km:'ចាក់សោម៉ោងនេះ', my:'ဤအချိန်ကိုသေချာစေ'});
  L('Request free survey', {id:'Ajukan survei gratis', ja:'無料調査を依頼', ko:'무료 실사 요청', zh:'预约免费勘察', ar:'اطلب معاينة مجانية', ms:'Minta tinjauan percuma', th:'ขอสำรวจฟรี', vi:'Yêu cầu khảo sát miễn phí', tl:'Humiling ng libreng survey', km:'ស្នើស្ទង់ឥតគិតថ្លៃ', my:'အခမဲ့စစ်ဆေးရန်တောင်းဆို'});
  L('Schedule pickup', {id:'Jadwalkan penjemputan', ja:'集荷を予約', ko:'수거 예약', zh:'预约取件', ar:'جدولة الاستلام', ms:'Jadualkan pengambilan', th:'นัดรับผ้า', vi:'Đặt lịch lấy đồ', tl:'Iskedyul ang pickup', km:'កំណត់ពេលមកយក', my:'လာယူချိန်သတ်မှတ်'});
  L('Request proposal', {id:'Minta proposal', ja:'提案を依頼', ko:'제안서 요청', zh:'索取方案', ar:'اطلب عرضاً', ms:'Minta cadangan', th:'ขอข้อเสนอ', vi:'Yêu cầu đề xuất', tl:'Humiling ng proposal', km:'ស្នើសំណើ', my:'အဆိုပြုချက်တောင်းဆို'});
  L('Send shopping list', {id:'Kirim daftar belanja', ja:'買い物リストを送る', ko:'장보기 목록 보내기', zh:'发送购物清单', ar:'أرسل قائمة التسوق', ms:'Hantar senarai belanja', th:'ส่งรายการซื้อของ', vi:'Gửi danh sách mua', tl:'Ipadala ang listahan', km:'ផ្ញើបញ្ជីទិញ', my:'ဈေးဝယ်စာရင်းပို့'});
  L('Needs your decision', {id:'Perlu keputusan Anda', ja:'ご判断が必要です', ko:'결정이 필요합니다', zh:'需要您决定', ar:'بحاجة إلى قرارك', ms:'Perlu keputusan anda', th:'รอการตัดสินใจของคุณ', vi:'Cần bạn quyết định', tl:'Kailangan ng desisyon mo', km:'ត្រូវការការសម្រេចរបស់អ្នក', my:'သင့်ဆုံးဖြတ်ချက်လိုသည်'});
  L('How this service is settled', {id:'Cara layanan ini ditagih', ja:'この サービスの精算方法', ko:'이 서비스의 결제 방식', zh:'此服务如何结算', ar:'كيف تُسوّى هذه الخدمة', ms:'Cara perkhidmatan ini dibayar', th:'บริการนี้ชำระอย่างไร', vi:'Dịch vụ này thanh toán thế nào', tl:'Paano binabayaran ang serbisyong ito', km:'របៀបទូទាត់សេវានេះ', my:'ဤဝန်ဆောင်မှုငွေရှင်းပုံ'});
  L('Move time', {ja:'時間を変更', ko:'시간 변경', zh:'更改时间', ar:'تغيير الوقت', ms:'Tukar masa', th:'เลื่อนเวลา', vi:'Đổi giờ', tl:'Ilipat ang oras', km:'ផ្លាស់ម៉ោង', my:'အချိန်ပြောင်း'});
  L('Skip one', {ja:'1回スキップ', ko:'1회 건너뛰기', zh:'跳过一次', ar:'تخطي مرة', ms:'Langkau satu', th:'ข้ามหนึ่งครั้ง', vi:'Bỏ qua một lần', tl:'Laktawan ang isa', km:'រំលងមួយ', my:'တစ်ကြိမ်ကျော်'});
  L('Refund in progress', {ja:'返金処理中', ko:'환불 진행 중', zh:'退款处理中', ar:'الاسترداد قيد المعالجة', ms:'Bayaran balik diproses', th:'กำลังคืนเงิน', vi:'Đang hoàn tiền', tl:'Nire-refund', km:'កំពុងសងប្រាក់', my:'ပြန်အမ်းနေသည်'});
  L('Simulate next status', {ja:'次の状態をシミュレート', ko:'다음 상태 시뮬레이션', zh:'模拟下一状态', ar:'محاكاة الحالة التالية', ms:'Simulasi status seterusnya', th:'จำลองสถานะถัดไป', vi:'Mô phỏng trạng thái tiếp', tl:'I-simulate ang susunod', km:'ក្លែងធ្វើស្ថានភាពបន្ទាប់', my:'နောက်အခြေအနေတု'});
  L('Visit done · rate', {ja:'完了・評価する', ko:'완료 · 평가', zh:'已完成 · 评价', ar:'اكتملت · قيّم', ms:'Selesai · nilai', th:'เสร็จแล้ว · ให้คะแนน', vi:'Xong · đánh giá', tl:'Tapos · i-rate', km:'រួច · វាយតម្លៃ', my:'ပြီး · အဆင့်သတ်မှတ်'});
  L('Back to home', {ja:'ホームへ戻る', ko:'홈으로', zh:'返回首页', ar:'العودة للرئيسية', ms:'Kembali ke utama', th:'กลับหน้าแรก', vi:'Về trang chủ', tl:'Bumalik sa home', km:'ត្រឡប់ទៅដើម', my:'ပင်မသို့'});
  L('Share this to my friends', {ja:'友達に共有', ko:'친구에게 공유', zh:'分享给朋友', ar:'شارك مع أصدقائي', ms:'Kongsi dengan rakan', th:'แชร์ให้เพื่อน', vi:'Chia sẻ với bạn bè', tl:'Ibahagi sa mga kaibigan', km:'ចែករំលែកទៅមិត្ត', my:'သူငယ်ချင်းများသို့မျှဝေ'});
  L('Order', {ja:'注文', ko:'주문', zh:'订单', ar:'الطلب', ms:'Pesanan', th:'คำสั่ง', vi:'Đơn', tl:'Order', km:'ការបញ្ជាទិញ', my:'အော်ဒါ'});
  L('Paid with', {ja:'支払い方法', ko:'결제 수단', zh:'支付方式', ar:'دُفع عبر', ms:'Dibayar dengan', th:'ชำระด้วย', vi:'Thanh toán bằng', tl:'Binayaran gamit', km:'បង់ដោយ', my:'ဖြင့်ပေးချေ'});
  L('Warranty', {ja:'保証', ko:'보증', zh:'保修', ar:'الضمان', ms:'Jaminan', th:'การรับประกัน', vi:'Bảo hành', tl:'Garantiya', km:'ការធានា', my:'အာမခံ'});
  L('Anything else? (optional)', {ja:'その他（任意）', ko:'추가 의견 (선택)', zh:'其他意见（可选）', ar:'أي شيء آخر؟ (اختياري)', ms:'Ada lagi? (pilihan)', th:'เพิ่มเติม (ไม่บังคับ)', vi:'Còn gì nữa? (tùy chọn)', tl:'May iba pa? (opsyonal)', km:'អ្វីផ្សេងទៀត? (ជម្រើស)', my:'အခြား (ရွေးချယ်)'});
  L('What stood out', {ja:'良かった点', ko:'좋았던 점', zh:'亮点', ar:'ما الذي تميز', ms:'Yang menonjol', th:'จุดเด่น', vi:'Điểm nổi bật', tl:'Ano ang namukod-tangi', km:'អ្វីដែលលេចធ្លោ', my:'ထူးခြားချက်'});
  L('Add a tip — she keeps 100%', {ja:'チップを追加（全額スタッフへ）', ko:'팁 추가 — 전액 클리너에게', zh:'添加小费 — 全额归清洁师', ar:'أضف إكرامية — تحصل عليها كاملة', ms:'Tambah tip — 100% untuknya', th:'ให้ทิป — เธอได้ 100%', vi:'Thêm tiền tip — cô ấy nhận 100%', tl:'Magbigay ng tip — 100% sa kanya', km:'បន្ថែមប្រាក់ទឹកតែ — ១០០%', my:'တစ်ပ်ပေး — ၁၀၀% သူ့ရ'});
  L('No tip', {ja:'チップなし', ko:'팁 없음', zh:'不给小费', ar:'بدون إكرامية', ms:'Tiada tip', th:'ไม่ให้ทิป', vi:'Không tip', tl:'Walang tip', km:'គ្មានទឹកតែ', my:'တစ်ပ်မပေး'});
  L('Something went wrong instead', {ja:'問題があった場合はこちら', ko:'문제가 있었나요?', zh:'反而出了问题', ar:'حدث خطأ ما', ms:'Ada masalah pula', th:'มีปัญหาแทน', vi:'Có vấn đề xảy ra', tl:'May naging problema', km:'មានបញ្ហាវិញ', my:'ပြဿနာရှိခဲ့သည်'});
  L('Invite a friend', {ja:'友達を招待', ko:'친구 초대', zh:'邀请朋友', ar:'ادعُ صديقاً', ms:'Jemput rakan', th:'เชิญเพื่อน', vi:'Mời bạn bè', tl:'Mag-imbita ng kaibigan', km:'អញ្ជើញមិត្ត', my:'သူငယ်ချင်းဖိတ်'});
  L('My clean', {ja:'私の清掃', ko:'내 청소', zh:'我的清洁', ar:'تنظيفي', ms:'Pembersihan saya', th:'งานของฉัน', vi:'Buổi dọn của tôi', tl:'Ang linis ko', km:'ការសម្អាតរបស់ខ្ញុំ', my:'ကျွန်ုပ်၏သန့်ရှင်းရေး'});
  L('Recommend', {ja:'おすすめする', ko:'추천', zh:'推荐', ar:'أوصِ بـ', ms:'Cadangkan', th:'แนะนำ', vi:'Giới thiệu', tl:'Irekomenda', km:'ណែនាំ', my:'အကြံပြု'});
  L('Share', {ja:'共有', ko:'공유', zh:'分享', ar:'مشاركة', ms:'Kongsi', th:'แชร์', vi:'Chia sẻ', tl:'Ibahagi', km:'ចែករំលែក', my:'မျှဝေ'});
  L('General', {ja:'一般', ko:'일반', zh:'通用', ar:'عام', ms:'Umum', th:'ทั่วไป', vi:'Chung', tl:'Pangkalahatan', km:'ទូទៅ', my:'အထွေထွေ'});
  L('This service', {ja:'このサービス', ko:'이 서비스', zh:'本服务', ar:'هذه الخدمة', ms:'Perkhidmatan ini', th:'บริการนี้', vi:'Dịch vụ này', tl:'Serbisyong ito', km:'សេវានេះ', my:'ဤဝန်ဆောင်မှု'});
  L('in force', {id:'berlaku sejak', ja:'発効', ko:'시행', zh:'生效于', ar:'ساري منذ', ms:'berkuat kuasa', th:'มีผลตั้งแต่', vi:'có hiệu lực từ', tl:'may bisa mula', km:'មានប្រសិទ្ធភាពពី', my:'အသက်ဝင်သည်'});
  L('Privacy', {ja:'プライバシー', ko:'개인정보', zh:'隐私', ar:'الخصوصية', ms:'Privasi', th:'ความเป็นส่วนตัว', vi:'Quyền riêng tư', tl:'Privacy', km:'ឯកជនភាព', my:'ကိုယ်ရေးလုံခြုံမှု'});
  L('Withdraw', {ja:'出金', ko:'출금', zh:'提现', ar:'سحب', ms:'Keluarkan', th:'ถอน', vi:'Rút', tl:'Mag-withdraw', km:'ដក', my:'ထုတ်ယူ'});
  L('Includes Rp100.000 guarantee credit', {ja:'保証クレジットRp100.000を含む', ko:'보증 크레딧 Rp100.000 포함', zh:'含Rp100.000保障额度', ar:'يشمل رصيد ضمان Rp100.000', ms:'Termasuk kredit jaminan Rp100.000', th:'รวมเครดิตรับประกัน Rp100.000', vi:'Gồm Rp100.000 tín dụng bảo đảm', tl:'Kasama ang Rp100.000 guarantee credit', km:'រួមបញ្ចូលឥណទានធានា Rp100.000', my:'အာမခံခရက်ဒစ် Rp100,000 ပါဝင်'});
  L('5% off every visit', {ja:'毎回5%オフ', ko:'매 방문 5% 할인', zh:'每次服务9.5折', ar:'خصم ٥٪ في كل زيارة', ms:'Diskaun 5% setiap lawatan', th:'ลด 5% ทุกครั้ง', vi:'Giảm 5% mỗi lượt', tl:'5% off bawat bisita', km:'បញ្ចុះ៥%រាល់ដង', my:'လာတိုင်း ၅% လျှော့'});
  L('Sign up with email or phone', {ja:'メールまたは電話番号で登録', ko:'이메일 또는 전화로 가입', zh:'用邮箱或手机注册', ar:'سجّل بالبريد أو الهاتف', ms:'Daftar dengan e-mel atau telefon', th:'สมัครด้วยอีเมลหรือเบอร์', vi:'Đăng ký bằng email hoặc số điện thoại', tl:'Mag-sign up gamit email o telepono', km:'ចុះឈ្មោះដោយអ៊ីមែល ឬទូរស័ព្ទ', my:'အီးမေးလ်/ဖုန်းဖြင့်စာရင်းသွင်း'});
  L('Continue with Google', {ja:'Googleで続行', ko:'Google로 계속', zh:'使用Google继续', ar:'المتابعة عبر Google', ms:'Teruskan dengan Google', th:'ดำเนินการต่อด้วย Google', vi:'Tiếp tục với Google', tl:'Magpatuloy gamit Google', km:'បន្តជាមួយ Google', my:'Google ဖြင့်ဆက်လုပ်'});
  L('Continue with Facebook', {ja:'Facebookで続行', ko:'Facebook으로 계속', zh:'使用Facebook继续', ar:'المتابعة عبر Facebook', ms:'Teruskan dengan Facebook', th:'ดำเนินการต่อด้วย Facebook', vi:'Tiếp tục với Facebook', tl:'Magpatuloy gamit Facebook', km:'បន្តជាមួយ Facebook', my:'Facebook ဖြင့်ဆက်လုပ်'});
  L('or', {ja:'または', ko:'또는', zh:'或', ar:'أو', ms:'atau', th:'หรือ', vi:'hoặc', tl:'o', km:'ឬ', my:'သို့မဟုတ်'});
  L('simulated', {id:'simulasi', ja:'シミュレーション', ko:'시뮬레이션', zh:'模拟', ar:'محاكاة', ms:'simulasi', th:'จำลอง', vi:'mô phỏng', tl:'simulated', km:'ក្លែងធ្វើ', my:'တုပ'});
  L('Schedule-locked bookings', {ja:'予定確約の予約', ko:'일정 고정 예약', zh:'时间锁定预约', ar:'حجوزات بموعد ثابت', ms:'Tempahan jadual terkunci', th:'จองแบบล็อกเวลา', vi:'Đặt lịch được giữ chắc', tl:'Naka-lock na iskedyul', km:'ការកក់កាលវិភាគចាក់សោ', my:'အချိန်သတ်မှတ်ထားသောမှာယူမှု'});
  L('Refunds with a dated deadline', {ja:'期限付きの返金', ko:'기한이 명시된 환불', zh:'有明确期限的退款', ar:'استرداد بموعد محدد', ms:'Bayaran balik bertarikh', th:'คืนเงินมีกำหนดวัน', vi:'Hoàn tiền có hạn ngày', tl:'Refund na may petsa', km:'សងប្រាក់មានកាលកំណត់', my:'ရက်သတ်မှတ်ပြန်အမ်း'});
  L('A human on chat in 60 seconds', {ja:'60秒以内に人が対応', ko:'60초 안에 상담원 연결', zh:'60秒内真人客服', ar:'إنسان على الدردشة خلال ٦٠ ثانية', ms:'Manusia di sembang dalam 60 saat', th:'คนจริงตอบใน 60 วินาที', vi:'Người thật trả lời trong 60 giây', tl:'Tao sa chat sa loob ng 60 segundo', km:'មនុស្សឆ្លើយក្នុង៦០វិនាទី', my:'၆၀ စက္ကန့်အတွင်းလူဖြေ'});
  L('We clean', {ja:'私たちが', ko:'우리는', zh:'我们清洁', ar:'نحن ننظف', ms:'Kami bersihkan', th:'เราทำความสะอาด', vi:'Chúng tôi dọn', tl:'Nililinis namin', km:'យើងសម្អាត', my:'ကျွန်ုပ်တို့သန့်ရှင်း'});
  L('all purpose.', {ja:'すべてを清掃。', ko:'모든 것을 청소합니다.', zh:'一切。', ar:'كل شيء.', ms:'semuanya.', th:'ทุกอย่าง', vi:'mọi thứ.', tl:'lahat.', km:'គ្រប់យ៉ាង។', my:'အားလုံး။'});

  /* ---------------------------------------------- Bahasa Indonesia: sisanya */
  var ID = {
    'We clean all purpose':'Kami bersihkan segalanya',
    'By continuing you accept our':'Dengan melanjutkan, Anda menyetujui',
    'terms':'ketentuan', 'and privacy policy.':'dan kebijakan privasi kami.',
    'Available · shown to your cleaner instead of your full name':'Tersedia · ditampilkan ke petugas sebagai pengganti nama lengkap',
    'We verify this by WhatsApp OTP — it is also your login':'Diverifikasi lewat OTP WhatsApp — sekaligus nama masuk Anda',
    'Tap to run the challenge (simulated)':'Ketuk untuk menjalankan tantangan (simulasi)',
    'Simulated challenge · set turnstileSiteKey in exo-config.js for the real one':'Tantangan simulasi · isi turnstileSiteKey di exo-config.js untuk yang sungguhan',
    'Cloudflare Turnstile · no puzzles':'Cloudflare Turnstile · tanpa teka-teki',
    'I accept the EXOCLEAN terms of service and privacy policy (PT EXO POINT).':'Saya menyetujui ketentuan layanan dan kebijakan privasi EXOCLEAN (PT EXO POINT).',
    'Auth server is offline — simulation, tap paste below.':'Server autentikasi tidak aktif — simulasi, ketuk tempel di bawah.',
    'SMS provider is in log mode — read the code from the server console.':'Provider SMS masih mode log — baca kodenya di konsol server.',
    'After this, two-step verification stays on for new devices, password changes and any withdrawal — you can add an authenticator app in Profile.':'Setelah ini, verifikasi dua langkah tetap aktif untuk perangkat baru, ganti sandi, dan setiap penarikan — aplikasi autentikator bisa ditambahkan di Profil.',
    'Six digits, required for every payment, wallet top-up and refund — separate from your login.':'Enam digit, wajib untuk setiap pembayaran, isi saldo, dan refund — terpisah dari sandi masuk.',
    'Confirmed · we never show this to anyone, including support':'Terkonfirmasi · tidak pernah kami tampilkan ke siapa pun, termasuk CS',
    'Avoid 123456 or your birth date. Five wrong tries locks transactions for 30 minutes; unlock needs two-step verification.':'Hindari 123456 atau tanggal lahir. Lima kali salah mengunci transaksi 30 menit; membukanya butuh verifikasi dua langkah.',
    'Or use Face ID · PIN is never shared with support':'Atau pakai Face ID · PIN tidak pernah dibagikan ke CS',
    'new with EXOCLEAN':'baru di EXOCLEAN', 'away':'jauh', 'with EXOCLEAN':'bersama EXOCLEAN', 'new':'baru',
    'not rated yet':'belum dinilai',
    'No ratings yet — rate set by EXOCLEAN, not by bidding.':'Belum ada penilaian — tarif ditetapkan EXOCLEAN, bukan lelang.',
    'No cleaner has a rate yet, so there is nobody to show.':'Belum ada petugas yang bertarif, jadi belum ada yang bisa ditampilkan.',
    'No cleaners listed yet':'Belum ada petugas tayang',
    'Every cleaner needs a rate before they can appear here, and only a super admin sets it — in the EXOCLEAN admin app, under':'Setiap petugas butuh tarif sebelum tampil di sini, dan hanya super admin yang menetapkannya — di aplikasi admin EXOCLEAN, menu',
    'Good for a studio or 1BR':'Cocok untuk studio atau 1 kamar', 'Typical 2BR apartment':'Apartemen 2 kamar pada umumnya', 'House or post-party reset':'Rumah atau beres-beres pasca acara',
    'This code is paused by EXOCLEAN right now.':'Kode ini sedang dihentikan sementara oleh EXOCLEAN.',
    'Not valid under':'Tidak berlaku di bawah', 'your cart is':'keranjang Anda', 'We tell you now, not at payment.':'Kami beri tahu sekarang, bukan saat bayar.',
    'off':'potongan', 'Not eligible':'Tidak memenuhi', 'Applied ✓':'Dipakai ✓', 'Apply':'Pakai',
    'Map of the visit address':'Peta alamat kunjungan', 'Cleaner position':'Posisi petugas',
    'Map shows the visit address. Checking the position server…':'Peta menampilkan alamat kunjungan. Memeriksa server posisi…',
    'Confirmed 20:41 · only you can move it':'Dikonfirmasi 20:41 · hanya Anda yang bisa memindahkan',
    'Left 08:34 · arriving 08:56':'Berangkat 08:34 · tiba 08:56', 'Checklist updates live below':'Checklist diperbarui langsung di bawah',
    'Photos attached, warranty starts':'Foto terlampir, garansi mulai berjalan',
    'Rahma from support':'Rahma dari layanan pelanggan', 'Human, replies in ~40s · not a bot':'Manusia, membalas ~40 dtk · bukan bot',
    'Every Saturday · 09:00':'Setiap Sabtu · 09:00', 'Same cleaner held for you · 3h hourly':'Petugas yang sama dipegang untuk Anda · 3 jam',
    'Subscription price is fixed for 3 months. Pause any week without losing your cleaner.':'Harga langganan tetap selama 3 bulan. Jeda kapan saja tanpa kehilangan petugas Anda.',
    'Skipped ✓ · undo':'Dilewati ✓ · batalkan',
    'Step 2 of 3 — approved, sent to your bank.':'Langkah 2 dari 3 — disetujui, dikirim ke bank Anda.',
    'Money by Fri 28 Aug':'Dana masuk paling lambat Jum 28 Agu',
    '. If it misses that date we add Rp50.000 credit automatically.':'. Bila lewat tanggal itu, Rp50.000 kredit ditambahkan otomatis.',
    'Hourly cleaning · 3h':'Cleaning per jam · 3 jam', 'AC service · 2 units':'Cuci AC · 2 unit', 'Deep cleaning · 5h':'Deep cleaning · 5 jam',
    'Hourly cleaning · Sari W.':'Cleaning per jam · Sari W.', 'Guarantee credit · slot moved':'Kredit jaminan · jadwal dipindah',
    'Top up · BCA VA':'Isi saldo · VA BCA', 'Refund · AC re-visit':'Refund · kunjungan ulang AC', 'in progress · by 28 Aug':'diproses · paling lambat 28 Agu',
    'automatic':'otomatis', 'today · instant':'hari ini · seketika', 'today · by tomorrow':'hari ini · paling lambat besok',
    'Why the balance can\'t disappear':'Kenapa saldonya tidak bisa hilang',
    'Kitchen looked brand new.':'Dapurnya tampak seperti baru.',
    'Tell us what to improve below':'Ceritakan apa yang perlu diperbaiki di bawah',
    'We will call you — this triggers a review, not a penalty':'Kami akan menghubungi Anda — ini memicu peninjauan, bukan hukuman',
    'will be offered your Saturday slot first':'akan ditawari slot Sabtu Anda lebih dulu',
    'to friends':'ke teman',
    'Both of you get Rp50.000 when a friend books':'Anda berdua dapat Rp50.000 saat teman memesan',
    'Book your first clean on EXOCLEAN with my code and we both get wallet credit.':'Pesan pembersihan pertamamu di EXOCLEAN dengan kode saya, kita berdua dapat saldo dompet.',
    'Rp50.000 for you,\nRp50.000 for me.':'Rp50.000 untukmu,\nRp50.000 untukku.',
    '3 hours.\nWhole flat.\nZero chasing.':'3 jam.\nSatu unit tuntas.\nTanpa mengejar.',
    'cleans\nlike it is her own place.':'membersihkan\nseperti rumahnya sendiri.',
    'Picked my own cleaner, kept my slot, paid':'Pilih petugas sendiri, jadwal aman, bayar',
    'Photos from the visit attached.':'Foto kunjungan terlampir.',
    'Book her directly — her rate is her own, no surge.':'Pesan langsung — tarifnya milik dia sendiri, tanpa surge.',
    'Card is rendered at 1080×1350 for feed and 1080×1920 for Stories. Nothing about your address or cleaner\'s surname is ever printed on it.':'Kartu dirender 1080×1350 untuk feed dan 1080×1920 untuk Story. Alamat Anda dan nama belakang petugas tidak pernah dicetak di sana.',
    'Open':'Buka', 'Shared ✓':'Terbagikan ✓', 'Copy my link':'Salin tautan saya', 'Save to gallery':'Simpan ke galeri',
    'Image and caption are prepared for you; you can edit the caption in the app you pick.':'Gambar dan keterangan sudah disiapkan; keterangannya bisa diubah di aplikasi yang Anda pilih.',
    'Tracked to your code — credit lands when they finish their first visit.':'Terlacak ke kode Anda — kredit masuk setelah kunjungan pertama mereka selesai.',
    'friends joined':'teman bergabung', 'Rp150.000 earned · credited to wallet':'Rp150.000 terkumpul · masuk ke dompet',
    'You’re covered up to Rp100.000':'Anda dilindungi hingga Rp100.000', 'within warranty':'masih dalam garansi',
    'Pick what happened. We answer with a human in under 60 seconds and give you a decision date up front — no open-ended tickets.':'Pilih apa yang terjadi. Kami jawab dengan manusia dalam 60 detik dan beri tanggal keputusan di muka — tanpa tiket menggantung.',
    'What happens next:':'Yang terjadi selanjutnya:', 'Decision promised by tomorrow 17:00':'Keputusan dijanjikan besok 17:00',
    'Stored on this device only until you submit.':'Tersimpan di perangkat ini saja sampai Anda kirim.',
    'A re-clean is booked with the same cleaner in the next 24h, or Rp100.000 credit if you prefer.':'Pembersihan ulang dijadwalkan dengan petugas yang sama dalam 24 jam, atau kredit Rp100.000 bila Anda lebih suka.',
    'Rp25.000 per late 15 minutes is credited to your wallet tonight — no review needed.':'Rp25.000 per 15 menit keterlambatan masuk ke dompet Anda malam ini — tanpa peninjauan.',
    'A named claims officer calls you within 60 minutes, with a decision date confirmed in writing.':'Petugas klaim bernama menghubungi Anda dalam 60 menit, dengan tanggal keputusan tertulis.',
    'Rp100.000 has already landed in your wallet. You keep your original price on the new date.':'Rp100.000 sudah masuk ke dompet Anda. Harga awal tetap berlaku di tanggal baru.',
    'Refund approved within 24h and in your bank within 3 working days — tracked in Wallet with a date.':'Refund disetujui dalam 24 jam dan masuk rekening dalam 3 hari kerja — terlacak di Dompet dengan tanggal.',
    'PT EXO POINT · v2.3 · in force 1 Aug 2026':'PT EXO POINT · v2.3 · berlaku 1 Agu 2026',
    'General cleaning: minimum 1 hour with 2 cleaners, or 2 hours with 1 cleaner.':'General cleaning: minimal 1 jam dengan 2 petugas, atau 2 jam dengan 1 petugas.',
    'Ironing: minimum 2 hours with 1 cleaner.':'Setrika: minimal 2 jam dengan 1 petugas.',
    'Hydro cleaning minimum order Rp200.000; wet cleaning minimum Rp300.000.':'Hydro cleaning minimal Rp200.000; wet cleaning minimal Rp300.000.',
    'Cancellation, waiting and payment':'Pembatalan, waktu tunggu, dan pembayaran',
    'Cancelling or rescheduling within 4 hours of the start time costs Rp50.000 per cleaner.':'Membatalkan atau mengubah jadwal kurang dari 4 jam sebelum mulai dikenai Rp50.000 per petugas.',
    'The cleaner waits up to 45 minutes after arriving (30 minutes for AC). With no response the order is cancelled, a Rp50.000 per cleaner call-out fee applies and the rest is returned to your EXO Wallet.':'Petugas menunggu maksimal 45 menit setelah tiba (30 menit untuk AC). Tanpa respons, pesanan dibatalkan, biaya kunjungan Rp50.000 per petugas dikenakan, dan sisanya kembali ke EXO Wallet.',
    'If payment is not completed within 30 minutes of booking, the order cancels itself and you book again.':'Bila pembayaran tidak selesai dalam 30 menit sejak pemesanan, pesanan batal sendiri dan Anda memesan ulang.',
    'On site':'Di lokasi',
    'EXOCLEAN provides tools and cleaning fluids to EXOCLEAN standard. If you insist on your own fluids, we are not liable for damage they cause.':'EXOCLEAN menyediakan alat dan cairan pembersih sesuai standar EXOCLEAN. Bila Anda memaksa memakai cairan sendiri, kerusakan yang ditimbulkannya bukan tanggung jawab kami.',
    'Both sides check the area before work starts and after it finishes. Raise anything while the cleaner is still on site — after they leave we cannot process it.':'Kedua pihak memeriksa area sebelum mulai dan setelah selesai. Sampaikan keluhan selagi petugas masih di lokasi — setelah pulang tidak bisa diproses.',
    'Parking fees at apartments or office buildings are yours.':'Biaya parkir di apartemen atau gedung kantor ditanggung Anda.',
    'For Saturday, Sunday or public holiday work in apartments and offices, confirm with building management or provide a work permit letter.':'Untuk pekerjaan Sabtu, Minggu, atau hari libur di apartemen dan kantor, konfirmasi ke pengelola gedung atau sediakan surat izin kerja.',
    'Adding hours or items mid-visit goes through EXOCLEAN customer service, not the cleaner directly.':'Menambah jam atau item di tengah kunjungan lewat layanan pelanggan EXOCLEAN, bukan langsung ke petugas.',
    'Refunds and protection':'Refund dan perlindungan',
    'Refunds are returned to your EXO Wallet, within 3 working days at the latest.':'Refund dikembalikan ke EXO Wallet paling lambat 3 hari kerja.',
    'Book only through the official EXOCLEAN app, website or WhatsApp. We cannot accept complaints or accept liability for jobs arranged directly with a cleaner.':'Pesan hanya lewat aplikasi, situs, atau WhatsApp resmi EXOCLEAN. Keluhan dan tanggung jawab atas pekerjaan yang diatur langsung dengan petugas tidak bisa kami terima.',
    'Customer service on WhatsApp: 0821 1084 7595.':'Layanan pelanggan di WhatsApp: 0821 1084 7595.',
    'Transport from the nearest EXOCLEAN hub':'Transport dari hub EXOCLEAN terdekat', 'over 35 km':'di atas 35 km', 'not served':'tidak dilayani',
    'Maximum travel distance 35 km. The fee is shown in your cart before you pay, never added afterwards.':'Jarak tempuh maksimal 35 km. Biayanya tampil di keranjang sebelum bayar, tidak pernah ditambahkan belakangan.',
    'Terms may change at any time; the version in force when you booked is the one that applies to that order, and every version is kept here.':'Ketentuan dapat berubah sewaktu-waktu; versi yang berlaku saat Anda memesan adalah yang berlaku untuk pesanan itu, dan setiap versi tersimpan di sini.',
    'Minimum 2 hours with one cleaner, or 1 hour with two cleaners.':'Minimal 2 jam dengan satu petugas, atau 1 jam dengan dua petugas.',
    'Not for post-renovation, post-flood or long-empty homes. If we arrive to such a job, a Rp50.000 per cleaner call-out fee applies.':'Bukan untuk pasca renovasi, pasca banjir, atau rumah lama kosong. Bila kami tiba dan mendapati kondisi itu, biaya kunjungan Rp50.000 per petugas berlaku.',
    'Kitchen: stove, kitchen set, washing up':'Dapur: kompor, kitchen set, cuci piring', 'Bathroom: walls, toilet, basin, mirror, floor':'Kamar mandi: dinding, kloset, wastafel, cermin, lantai',
    'Bedrooms incl. changing sheets, living and dining rooms, terrace':'Kamar tidur termasuk ganti sprei, ruang keluarga dan makan, teras',
    'Windows and glass up to 1,5 m height':'Jendela dan kaca sampai tinggi 1,5 m', 'Dusting furniture, vacuuming and mopping floors':'Dusting furnitur, vakum dan pel lantai',
    'Water tanks, swimming pools, fish ponds':'Toren air, kolam renang, kolam ikan', 'Ironing, storerooms, fans, grease traps, exhaust fans':'Setrika, gudang, kipas, grease trap, exhaust',
    'Pet areas or pet waste, human waste, blood':'Area atau kotoran hewan, kotoran manusia, darah', 'Anything above 1,5 m, garden or tree trimming':'Apa pun di atas 1,5 m, taman atau pangkas pohon',
    'Inside the fridge, laundry or drying clothes':'Bagian dalam kulkas, cuci atau jemur pakaian', 'Vacuuming mattresses, curtains or sofas (floors and rugs only)':'Vakum kasur, gorden, atau sofa (hanya lantai dan karpet)',
    'Mop set, broom, microfiber cloths, chamois':'Set pel, sapu, lap microfiber, kanebo', 'Vacuum cleaner 1200 W, window squeegee, scouring pads':'Vacuum 1200 W, squeegee jendela, spons kasar',
    'Bucket and a power socket':'Ember dan stopkontak', 'Bathroom brush':'Sikat kamar mandi', 'Dish soap and sponge':'Sabun cuci piring dan spons',
    'Survey first for deep cleaning and deep toilet; the quote follows the survey.':'Survei dulu untuk deep cleaning dan deep toilet; penawaran menyusul survei.',
    'Heavy scale and yellowing removal in bathrooms':'Angkat kerak berat dan noda kuning kamar mandi', 'Degreasing kitchen, hood and tiles':'Degrease dapur, hood, dan keramik', 'Detailed dusting including high-touch points':'Dusting detail termasuk titik sering disentuh',
    'Structural repair or painting':'Perbaikan struktur atau pengecatan', 'Post-construction debris removal':'Angkut puing konstruksi',
    'Deep-clean chemicals, scrubbing machine where needed':'Chemical deep clean, mesin scrub bila perlu', 'Water and power access':'Akses air dan listrik',
    'Book a free survey when the condition is unknown — the price is agreed before work starts.':'Pesan survei gratis bila kondisinya belum diketahui — harga disepakati sebelum kerja dimulai.',
    'Cleaner waits a maximum of 30 minutes at the address for AC jobs.':'Petugas menunggu maksimal 30 menit di alamat untuk pekerjaan AC.',
    'Indoor and outdoor unit wash, drain line flush':'Cuci unit indoor dan outdoor, flush saluran pembuangan', 'Pressure and temperature check, report per unit':'Cek tekanan dan suhu, laporan per unit',
    'Freon top-up (billed separately after checking)':'Isi freon (ditagih terpisah setelah dicek)', 'Moving or re-piping units without a survey':'Pindah atau ganti pipa unit tanpa survei',
    'Jet pump, cover bag, cleaning chemicals':'Jet pump, cover bag, chemical pembersih', 'Water and power access, ladder space':'Akses air dan listrik, ruang tangga',
    '30-day warranty per unit serviced. Report inside the window and we return free.':'Garansi 30 hari per unit. Laporkan dalam masa itu dan kami datang lagi gratis.',
    'Items are priced per seat, per row or per m² of total area.':'Item dihitung per dudukan, per baris, atau per m² luas total.',
    'Sofa (excluding cushions), carpets, curtains':'Sofa (tanpa bantal), karpet, gorden', 'Mattress (excluding pillows, headboard and base)':'Kasur (tanpa bantal, headboard, dan dipan)',
    'Office and dining chairs, pillows, dolls':'Kursi kantor dan makan, bantal, boneka', 'Car seats except leather and suede':'Jok mobil kecuali kulit dan suede',
    'Wet or damp material — it must be dry':'Bahan basah atau lembap — harus kering', 'Removing permanent dye or structural damage':'Menghilangkan pewarna permanen atau kerusakan struktur',
    'Hydro machine 1000 W, extraction tools':'Mesin hydro 1000 W, alat ekstraksi', 'Power socket and a ventilated space':'Stopkontak dan ruang berventilasi',
    'Vacuuming is done at least twice. Carpets and curtains are measured by total area (2×2 m is entered as 4 m).':'Vakum dilakukan minimal dua kali. Karpet dan gorden diukur luas total (2×2 m dihitung 4 m).',
    'Pickup and return within the service area.':'Antar-jemput dalam area layanan.', 'Wash, dry and fold per kilo':'Cuci, kering, lipat per kilo', 'Choice of scent finish':'Pilihan pewangi',
    'Dry-clean-only garments, leather, wedding dresses':'Pakaian khusus dry clean, kulit, gaun pengantin', 'Pickup bags and weighing at your door':'Kantong jemput dan timbang di depan pintu Anda',
    'Sorted items and any special instructions':'Pakaian sudah dipilah dan instruksi khusus', 'Item cover up to Rp1.000.000 per order for loss or damage.':'Ganti rugi barang sampai Rp1.000.000 per pesanan untuk hilang atau rusak.',
    'Minimum 2 hours with one cleaner.':'Minimal 2 jam dengan satu petugas.', 'Standard output 20–30 pieces in about 2 hours, depending on fabric':'Hasil standar 20–30 potong dalam sekitar 2 jam, tergantung bahan',
    'Steam-iron equipment':'Setrika uap', 'Patterned brocade, silk, long dresses, tuxedos, curtains, sheets and bed covers':'Brokat bermotif, sutra, gaun panjang, tuksedo, gorden, sprei, dan bed cover',
    'Trained staff only — tools are yours':'Hanya tenaga terlatih — alatnya milik Anda', 'Iron, ironing board and chair':'Setrika, meja setrika, dan kursi', 'Starch and fragrance':'Pelicin dan pewangi',
    'Without an ironing board the result may be below standard, and that is outside our responsibility.':'Tanpa meja setrika hasilnya bisa di bawah standar, dan itu di luar tanggung jawab kami.',
    'Contract-based, minimum 3 months, scoped by survey.':'Berbasis kontrak, minimal 3 bulan, cakupan ditentukan survei.', 'Daily, weekly and monthly SOP-based cleaning':'Pembersihan harian, mingguan, bulanan berbasis SOP',
    'Supervisor inspection and monthly report':'Inspeksi supervisor dan laporan bulanan', 'Waste categorised as B3 without a separate agreement':'Limbah kategori B3 tanpa perjanjian terpisah',
    'Work above 1,5 m without approved equipment':'Kerja di atas 1,5 m tanpa peralatan yang disetujui', 'Machines, chemicals and PPE per SOP':'Mesin, chemical, dan APD sesuai SOP',
    'Storage space, water and power, building access':'Ruang penyimpanan, air dan listrik, akses gedung',
    'SOP and checklist codes are attached to your contract and visible in your monthly report.':'Kode SOP dan checklist dilampirkan ke kontrak Anda dan tampil di laporan bulanan.',
    'ULV fogging with sterilising fluid that is safe for people.':'Fogging ULV dengan cairan sterilisasi yang aman bagi manusia.', 'Full-room spraying with no area skipped':'Penyemprotan seluruh ruangan tanpa area terlewat',
    'Room usable again 2 hours after the process':'Ruangan bisa dipakai lagi 2 jam setelah proses', 'Removing bed bugs, insects or mosquitoes — that is pest control':'Membasmi kutu kasur, serangga, atau nyamuk — itu pest control',
    'ULV machine and certified fluid':'Mesin ULV dan cairan bersertifikat', 'Good air circulation; cover food, documents and electronics; move pets out; the room must be empty during work':'Sirkulasi udara baik; tutup makanan, dokumen, elektronik; keluarkan hewan; ruangan kosong selama pengerjaan',
    'Wash cutlery and change sheets after the process.':'Cuci alat makan dan ganti sprei setelah proses.',
    'Carpets and curtains are priced by total area; a 2×2 m rug is entered as 4 m².':'Karpet dan gorden dihitung luas total; karpet 2×2 m dihitung 4 m².',
    'Sofa (excluding cushions), carpets, curtains, mattress (excluding pillows, headboard and base)':'Sofa (tanpa bantal), karpet, gorden, kasur (tanpa bantal, headboard, dipan)',
    'Office and dining chairs, dolls, car seats except leather and suede':'Kursi kantor dan makan, boneka, jok mobil kecuali kulit dan suede', 'Material that is wet or damp':'Bahan basah atau lembap',
    'Removing permanent dye or fibre damage':'Menghilangkan pewarna permanen atau kerusakan serat',
    'Vacuuming is done at least twice. One-sided mattress work covers the top surface and two sides.':'Vakum minimal dua kali. Kasur satu sisi mencakup permukaan atas dan dua sisi.',
    'Priced per m², with a short survey to grade the floor condition first.':'Dihitung per m², dengan survei singkat menilai kondisi lantai dulu.', 'Marble and granite crystallisation':'Kristalisasi marmer dan granit',
    'Removing fine scratches and water marks':'Menghilangkan goresan halus dan noda air', 'Ordinary ceramic tile, vinyl, wooden parquet':'Keramik biasa, vinil, parket kayu', 'Repairing cracks or chips':'Memperbaiki retak atau gompal',
    'Polishing machine, pads, crystallisation compound':'Mesin poles, pad, bubuk kristalisasi', 'Water and power access, the area cleared':'Akses air dan listrik, area dikosongkan',
    'Heavy furniture must be moved out before work starts.':'Furnitur berat harus dipindahkan sebelum kerja dimulai.',
    'Per visit, covering one house unit or one office floor.':'Per kunjungan, satu unit rumah atau satu lantai kantor.', 'Cockroaches, ants, mosquitoes, termites and rodents':'Kecoa, semut, nyamuk, rayap, dan tikus',
    'A findings report with prevention advice':'Laporan temuan dengan saran pencegahan', 'Opening up structures for termite nests without separate approval':'Membongkar struktur untuk sarang rayap tanpa persetujuan terpisah',
    'Wasp nests above 3 m':'Sarang tawon di atas 3 m', 'Licensed chemicals and full PPE':'Chemical berizin dan APD lengkap', 'House empty for 2–4 hours, food covered, pets moved out':'Rumah kosong 2–4 jam, makanan ditutup, hewan dikeluarkan',
    '90-day warranty: if the pests return inside that window we re-treat free.':'Garansi 90 hari: bila hama kembali dalam masa itu, kami tangani ulang gratis.',
    'Per visit; a fixed-price weekly subscription is available.':'Per kunjungan; tersedia langganan mingguan harga tetap.', 'Brushing walls and floor, vacuuming, skimming the surface':'Sikat dinding dan dasar, vakum, angkat kotoran permukaan',
    'pH and chlorine testing and correction, with a chemical log':'Uji dan koreksi pH serta klorin, dengan log kimia', 'Leak, pump or pipework repair':'Perbaikan kebocoran, pompa, atau pipa',
    'Full draining without the owner’s approval':'Kuras total tanpa persetujuan pemilik', 'Brushes, pool vacuum, test kit, chemicals':'Sikat, vakum kolam, test kit, chemical', 'Power access and a clean water source':'Akses listrik dan sumber air bersih',
    'Test results are attached to the report and can be handed to building management.':'Hasil uji dilampirkan ke laporan dan bisa diserahkan ke pengelola gedung.',
    'Per tank up to 2,000 litres; larger tanks are quoted separately.':'Per toren sampai 2.000 liter; toren lebih besar ditawar terpisah.', 'Draining, scrubbing the tank walls, rinsing':'Kuras, sikat dinding toren, bilas',
    'Food-grade sterilisation and a lid inspection':'Sterilisasi food-grade dan cek tutup', 'Repairing leaks or replacing the float without approval':'Perbaiki bocor atau ganti pelampung tanpa persetujuan',
    'Roof tanks without safe ladder access':'Toren atap tanpa akses tangga yang aman', 'Pump, specialist brushes, food-grade solution':'Pompa, sikat khusus, cairan food-grade', 'Safe access to the tank and clean rinsing water':'Akses aman ke toren dan air bilas bersih',
    'Recommended every 6 months; we remind you automatically at the next due date.':'Disarankan tiap 6 bulan; kami ingatkan otomatis di jatuh tempo berikutnya.',
    'Priced per hour with a compulsory free survey first — condition varies too much to quote blind.':'Dihitung per jam dengan survei gratis wajib lebih dulu — kondisinya terlalu beragam untuk ditawar buta.',
    'Cement, paint, grout and adhesive spots on glass, tiles and frames':'Noda semen, cat, nat, dan lem di kaca, keramik, kusen', 'Fine construction dust from walls, ceilings, vents and light fittings':'Debu halus konstruksi dari dinding, plafon, ventilasi, dan lampu',
    'Final polish so the unit is ready to occupy or hand over':'Poles akhir supaya unit siap huni atau serah terima', 'Removing structural debris heavier than one pick-up load without the haul-away add-on':'Angkut puing lebih dari satu bak pikap tanpa add-on angkut puing',
    'Repainting, plastering or any repair work':'Pengecatan ulang, plester, atau perbaikan apa pun', 'Working while contractors are still on site':'Bekerja saat kontraktor masih di lokasi',
    'Industrial vacuum, scrapers, dust masks, safe solvents':'Vakum industri, scraper, masker debu, pelarut aman', 'Water and power, plus building permission for waste removal':'Air dan listrik, plus izin gedung untuk angkut sampah',
    'This replaces the old rule that turned post-renovation jobs away. Survey is free and the quote is fixed before work starts.':'Ini menggantikan aturan lama yang menolak pekerjaan pasca renovasi. Survei gratis dan harga tetap sebelum kerja dimulai.',
    'For building reservoirs above 2.000 litres; quoted per tank after a site check.':'Untuk reservoir gedung di atas 2.000 liter; ditawar per tangki setelah cek lokasi.',
    'Draining, high-pressure wash, sludge removal, food-grade sterilisation':'Kuras, semprot tekanan tinggi, angkat lumpur, sterilisasi food-grade', 'Before–after photo report and a chemical log for building management':'Laporan foto sebelum–sesudah dan log kimia untuk pengelola gedung',
    'Structural repair of the tank, pumps or valves':'Perbaikan struktur tangki, pompa, atau katup', 'Confined-space entry without the building’s written permit':'Masuk ruang terbatas tanpa izin tertulis gedung',
    'Industrial pump, confined-space kit, certified operators and full PPE':'Pompa industri, kit ruang terbatas, operator bersertifikat, APD lengkap', 'Written work permit, safe access, and a water supply for rinsing':'Izin kerja tertulis, akses aman, dan pasokan air untuk bilas',
    'Scheduled every 6 months by default and billed on the building contract, not per visit.':'Dijadwalkan tiap 6 bulan secara bawaan dan ditagih lewat kontrak gedung, bukan per kunjungan.',
    'A shaded, spacious spot with water and power access.':'Tempat teduh dan lapang dengan akses air dan listrik.', 'Exterior wash including underbody, all glass':'Cuci eksterior termasuk kolong, semua kaca',
    'Interior dusting with clean & shine, seat vacuuming':'Dusting interior dengan clean & shine, vakum jok', 'Car mat washing, tyre dressing':'Cuci karpet mobil, semir ban', 'Dry wash option for lightly soiled cars':'Opsi cuci kering untuk mobil sedikit kotor',
    'Heavy mud or thick dirt on the dry-wash option':'Lumpur berat atau kotoran tebal pada opsi cuci kering', 'Paint correction or body repair':'Koreksi cat atau perbaikan bodi', 'Wash tools, chemicals, vacuum':'Alat cuci, chemical, vakum',
    'Water and power near the parking spot':'Air dan listrik dekat tempat parkir', 'Direct sunlight affects the finish; please provide a shaded area.':'Sinar matahari langsung memengaruhi hasil; mohon sediakan area teduh.',
    'How prepaid works':'Cara kerja prepaid', 'Buy a prepaid package in the app, then book general cleaning or ironing straight away.':'Beli paket prepaid di aplikasi, lalu langsung pesan general cleaning atau setrika.',
    'Prepaid customers can choose the cleaner they want.':'Pelanggan prepaid bebas memilih petugas.', 'A package is valid for the period stated when you bought it; the quota only works inside that period.':'Paket berlaku selama masa yang tertera saat dibeli; kuota hanya berlaku dalam masa itu.',
    'A package cannot be sold or transferred to another person.':'Paket tidak bisa dijual atau dipindahkan ke orang lain.', 'Cancelling or rescheduling within 4 hours deducts 1 hour from your package.':'Membatalkan atau mengubah jadwal kurang dari 4 jam memotong 1 jam dari paket.',
    'On refund we deduct hours already used at the normal rate of Rp75.000 per hour, and the rest returns to your EXO Wallet.':'Saat refund, jam terpakai dihitung tarif normal Rp75.000 per jam, sisanya kembali ke EXO Wallet.',
    'Who holds your data':'Siapa yang memegang data Anda', 'PT EXO POINT operates EXOCLEAN and is responsible for the data you give us through the app and website.':'PT EXO POINT mengoperasikan EXOCLEAN dan bertanggung jawab atas data yang Anda berikan lewat aplikasi dan situs.',
    'This privacy policy is part of the terms of service and cannot be read separately from them.':'Kebijakan privasi ini bagian dari ketentuan layanan dan tidak bisa dibaca terpisah.',
    'What we collect and why':'Yang kami kumpulkan dan alasannya', 'Registration data, addresses, booking history, payments and chats — used to run the service and support you.':'Data pendaftaran, alamat, riwayat pesanan, pembayaran, dan chat — dipakai menjalankan layanan dan membantu Anda.',
    'Location is used while a booking is active, to route the cleaner and show live tracking.':'Lokasi dipakai selama pesanan aktif, untuk rute petugas dan pelacakan langsung.',
    'Your address and phone number are hidden from marketing and never printed on a share card.':'Alamat dan nomor HP Anda disembunyikan dari pemasaran dan tidak pernah dicetak di kartu bagikan.',
    'Your control':'Kendali Anda', 'You may correct or delete your data, and withdraw consent for marketing, from Profile at any time.':'Anda bisa memperbaiki atau menghapus data, dan menarik persetujuan pemasaran, dari Profil kapan saja.',
    'We keep the records that Indonesian tax and consumer-protection law requires us to keep, even after deletion.':'Kami menyimpan catatan yang diwajibkan hukum pajak dan perlindungan konsumen Indonesia, meski setelah penghapusan.',
    'languages · applies to the app, receipts and notifications':'bahasa · berlaku untuk aplikasi, struk, dan notifikasi',
    'Arabic switches the whole app to right-to-left. Prices stay in Rupiah, and your cleaner still receives instructions in Indonesian so nothing is lost in translation on site.':'Bahasa Arab mengubah seluruh aplikasi menjadi kanan-ke-kiri. Harga tetap Rupiah, dan petugas tetap menerima instruksi dalam Bahasa Indonesia supaya tidak ada yang hilang di lokasi.',
    'English · Default':'Inggris · Bawaan', 'Indonesian · Indonesia':'Indonesia · Indonesia', 'Japanese · Japan':'Jepang · Jepang', 'Korean · Korea':'Korea · Korea', 'Chinese · China':'Mandarin · Tiongkok',
    'Arabic · Middle East · RTL':'Arab · Timur Tengah · RTL', 'Malay · Malaysia · Brunei':'Melayu · Malaysia · Brunei', 'Thai · Thailand':'Thai · Thailand', 'Vietnamese · Vietnam':'Vietnam · Vietnam',
    'Filipino · Philippines':'Filipino · Filipina', 'Khmer · Cambodia':'Khmer · Kamboja', 'Burmese · Myanmar':'Burma · Myanmar',
    'Gold member':'Anggota Gold', 'visits':'kunjungan', 'visit':'kunjungan', 'Invite friends · code DEWI50':'Undang teman · kode DEWI50',
    'Rp50.000 each, both sides, after their first visit':'Rp50.000 masing-masing, dua sisi, setelah kunjungan pertama mereka',
    'Changing the address changes who is available — cleaners are listed by distance from it.':'Mengganti alamat mengubah siapa yang tersedia — petugas diurutkan menurut jarak dari alamat itu.',
    'Sari is on the way':'Sari dalam perjalanan', 'Rp100.000 guarantee credit':'Kredit jaminan Rp100.000',
    'We moved your 21 Aug slot, so the credit is already in your wallet.':'Kami memindahkan jadwal 21 Agu Anda, jadi kreditnya sudah masuk ke dompet.',
    'Refund step 2 of 3':'Refund langkah 2 dari 3', 'Approved and sent to your bank — money by Fri 28 Aug.':'Disetujui dan dikirim ke bank Anda — dana masuk paling lambat Jum 28 Agu.',
    'Notifications are switched off in Profile, so nothing new will reach you — including the ones about your slot being moved.':'Notifikasi dimatikan di Profil, jadi tidak ada yang sampai ke Anda — termasuk soal jadwal yang dipindah.',
    'Hi Dewi — Rahma here, a real person. What can I help with?':'Halo Dewi — ini Rahma, manusia sungguhan. Ada yang bisa dibantu?',
    'Got it — I have your booking open now. Give me half a minute.':'Siap — pesanan Anda sudah saya buka. Tunggu setengah menit ya.',
    'Rahma is typing…':'Rahma sedang mengetik…', 'Rahma · support':'Rahma · layanan pelanggan',
    'Lands instantly · no fee':'Masuk seketika · tanpa biaya', 'Wallet money is withdrawable to your bank at any time. Topping up never buys credit that expires.':'Saldo dompet bisa ditarik ke bank kapan saja. Isi saldo tidak pernah menjadi kredit yang hangus.',
    'Amounts above it are greyed out rather than failing after you tap.':'Nominal di atasnya dinonaktifkan, bukan gagal setelah ditekan.', 'Balance':'Saldo',
    'Dewi Anggraini · arrives in 1 working day':'Dewi Anggraini · masuk dalam 1 hari kerja', 'to bank':'ke bank',
    'keeps the job and the price. Only you can do this — we never move a confirmed booking, and if we ever did, Rp100.000 would already be in your wallet.':'tetap memegang job dan harganya. Hanya Anda yang bisa melakukan ini — kami tidak pernah memindahkan pesanan terkonfirmasi, dan bila itu terjadi, Rp100.000 sudah ada di dompet Anda.',
    'Move to':'Pindah ke', 'Cards and accounts are held by the payment provider, not by EXOCLEAN. We only ever see the last four digits.':'Kartu dan rekening dipegang penyedia pembayaran, bukan EXOCLEAN. Kami hanya melihat empat digit terakhir.',
    'Virtual account':'Virtual account', 'Transfer exactly':'Transfer tepat', 'The app polls the gateway every 5 seconds.':'Aplikasi memeriksa gateway tiap 5 detik.',
    'Scan with any bank or e-wallet app':'Pindai dengan aplikasi bank atau e-wallet mana pun', 'pending':'menunggu', 'paid':'lunas',
    'If payment is not completed within 30 minutes the order cancels itself.':'Bila pembayaran tidak selesai dalam 30 menit, pesanan batal sendiri.',
    'Paid ✓ · continue':'Lunas ✓ · lanjutkan', 'Nothing matches':'Tidak ada yang cocok', 'See all':'Lihat semua',
    'Arriving':'Tiba', 'in ~':'dalam ~', 'min':'mnt',
    'We clean':'Kami bersihkan', 'all purpose.':'segalanya.',
    'Code sent by WhatsApp to':'Kode dikirim lewat WhatsApp ke', 'Code sent by the EXOCLEAN auth server to':'Kode dikirim server autentikasi EXOCLEAN ke',
    'Aug · automatic':'Agu · otomatis', 'Aug · EXO-4390':'Agu · EXO-4390', 'Aug':'Agu', 'stars':'bintang',
    '30 Aug is skipped and you are not charged for it.':'30 Agu dilewati dan Anda tidak ditagih.',
    'still holds your 6 Sep slot — skipping never costs you the cleaner.':'tetap memegang slot 6 Sep Anda — melewati tidak pernah membuat Anda kehilangan petugas.',
    'Your control':'Kendali Anda', 'Lengkap':'Lengkap'
  };
  /* Layanan perawatan & pribadi (3 Sep 2026): add-on dan ketentuan. */
  var ID_CARE = {
    'Overnight shift':'Shift malam', 'Meal preparation':'Menyiapkan makanan', 'simple home cooking':'masakan rumah sederhana', 'Second caregiver':'Pengasuh kedua', 'for two people':'untuk dua orang',
    'Cold-chain bag':'Tas pendingin', 'frozen & chilled':'beku & dingin', 'Extra waiting time':'Waktu tunggu tambahan', 'per 30 min queue':'per 30 menit antre', 'Beyond 10 km':'Lebih dari 10 km', 'per extra 5 km':'per tambahan 5 km',
    'Extra 30 minutes':'Tambah 30 menit', 'same therapist':'terapis yang sama', 'Body scrub':'Lulur badan', 'Massage table':'Meja pijat', 'brought by the therapist':'dibawa terapis',
    'Minimum 4 hours per visit with one caregiver; 8- and 12-hour shifts are available.':'Minimal 4 jam per kunjungan dengan satu pengasuh; tersedia shift 8 dan 12 jam.',
    'Companionship, feeding, bathing and toileting help, mobility support':'Menemani, membantu makan, mandi, dan ke toilet, membantu berpindah',
    'Reminders for medication already prescribed, light tidying of the care area':'Mengingatkan obat yang sudah diresepkan, merapikan ringan area perawatan',
    'Child care: supervision, meals, homework help and play':'Pengasuhan anak: pengawasan, makan, bantu PR, dan bermain',
    'Injections, wound care or any medical procedure':'Suntik, perawatan luka, atau tindakan medis apa pun',
    'Heavy housework beyond the care area — book a cleaning service for that':'Pekerjaan rumah berat di luar area perawatan — pesan layanan cleaning untuk itu',
    'A vetted caregiver with first-aid training, ID checked and police clearance':'Pengasuh terverifikasi dengan pelatihan P3K, KTP dicek, dan SKCK',
    'A care plan, the medication list and an emergency contact':'Rencana perawatan, daftar obat, dan kontak darurat',
    'Meals, diapers and personal items of the person cared for':'Makanan, popok, dan perlengkapan pribadi orang yang dirawat',
    'Caregivers are not nurses. Medication is given only as written by a doctor, and no injections or medical procedures are done.':'Pengasuh bukan perawat medis. Obat diberikan hanya sesuai tulisan dokter, tanpa suntikan atau tindakan medis.',
    'Per trip within 10 km of your address; goods are paid at cost against the receipt.':'Per trip dalam 10 km dari alamat Anda; barang dibayar sesuai harga di struk.',
    'Grocery and market shopping from your list, with photos before checkout':'Belanja bahan makanan dan pasar sesuai daftar Anda, difoto sebelum bayar',
    'Pick up or drop off parcels, documents, laundry and keys':'Mengambil atau mengantar paket, dokumen, laundry, dan kunci',
    'Queueing for bills, permits and returns':'Mengantre untuk tagihan, perizinan, dan pengembalian barang',
    'Goods above Rp2.000.000 per trip without a deposit':'Barang di atas Rp2.000.000 per trip tanpa deposit',
    'Live animals, hazardous goods and anything illegal':'Hewan hidup, barang berbahaya, dan apa pun yang ilegal',
    'A runner with ID checked and an insulated bag for cold items':'Kurir dengan KTP dicek dan tas pendingin untuk barang dingin',
    'A receipt photo and an itemised total in the app':'Foto struk dan rincian total di aplikasi',
    'A clear list with brands and which substitutes are allowed':'Daftar yang jelas dengan merek dan pengganti yang boleh',
    'Payment for the goods, settled from your EXO Wallet on delivery':'Pembayaran barang, dipotong dari EXO Wallet saat diantar',
    'Alcohol, cigarettes, prescription medicines and cash withdrawals cannot be bought on your behalf.':'Alkohol, rokok, obat resep, dan tarik tunai tidak bisa dibelikan atas nama Anda.',
    'Per 60-minute session at your home; a therapist of the same gender can be requested at no charge.':'Per sesi 60 menit di rumah Anda; terapis sesama jenis bisa diminta tanpa biaya.',
    'Traditional, relaxation, deep-tissue and reflexology massage':'Pijat tradisional, relaksasi, deep-tissue, dan refleksi',
    'Body scrub and a warm compress after the massage':'Lulur badan dan kompres hangat setelah pijat',
    'Prenatal massage after week 12 with a trained therapist':'Pijat ibu hamil setelah minggu ke-12 dengan terapis terlatih',
    'Medical or physiotherapy treatment, wet cupping':'Terapi medis atau fisioterapi, bekam basah',
    'Any request outside wellness — the session ends and is charged in full':'Permintaan apa pun di luar kebugaran — sesi dihentikan dan ditagih penuh',
    'A certified therapist, fresh linen, massage oil and towels':'Terapis bersertifikat, sprei bersih, minyak pijat, dan handuk',
    'A folding massage table on request':'Meja pijat lipat bila diminta',
    'A quiet room or a clear space of about 2×2 m':'Ruang tenang atau area kosong sekitar 2×2 m',
    'Shower access before the session':'Akses kamar mandi sebelum sesi',
    'Wellness massage only. Not for acute injury, fever, pregnancy under 12 weeks or skin infections — tell us before booking.':'Hanya pijat kebugaran. Tidak untuk cedera akut, demam, kehamilan di bawah 12 minggu, atau infeksi kulit — beri tahu kami sebelum memesan.'
  };
  var ID_ALUR = {
    'Charged after the visit is confirmed done.':'Ditagih setelah kunjungan dikonfirmasi selesai.',
    'Nothing is charged now. You pay only after you accept the quote.':'Tidak ada yang ditagih sekarang. Anda membayar hanya setelah menyetujui penawaran.',
    'Estimate only. The final price is set when the courier weighs your bag, and charged before delivery.':'Baru perkiraan. Harga akhir ditetapkan saat kurir menimbang cucian Anda, dan ditagih sebelum diantar kembali.',
    'Nothing is charged now. Monthly invoice after the contract is signed.':'Tidak ada yang ditagih sekarang. Tagihan bulanan setelah kontrak ditandatangani.',
    'Runner fee charged now. Goods are settled from your receipt after delivery.':'Ongkos kurir ditagih sekarang. Barang dilunasi dari struk setelah diantar.',
    'Cancelling or rescheduling within 4 hours costs Rp50.000 per cleaner. Refunds go to your EXO Wallet within 3 working days.':'Membatalkan atau memindahkan jadwal kurang dari 4 jam dikenai Rp50.000 per petugas. Refund masuk ke EXO Wallet dalam 3 hari kerja.',
    'Booking locked':'Jadwal terkunci', 'Only you can move it':'Hanya Anda yang bisa memindahkannya', 'Cleaner confirmed':'Petugas mengonfirmasi', 'Confirms within 60 minutes, or we reassign':'Konfirmasi dalam 60 menit, atau kami ganti petugas',
    'On the way':'Dalam perjalanan', 'Live position from the partner app':'Posisi langsung dari aplikasi mitra', 'Work in progress':'Sedang dikerjakan', 'Checklist and photos update live':'Checklist dan foto diperbarui langsung',
    'Done & charged':'Selesai & ditagih', 'Photos attached, warranty starts, EXO Wallet charged':'Foto terlampir, garansi mulai, EXO Wallet ditagih',
    'Survey requested':'Survei diajukan', 'A supervisor visits free within 24 hours':'Supervisor datang gratis dalam 24 jam', 'Surveyor visited':'Surveyor sudah datang', 'Condition graded, scope agreed':'Kondisi dinilai, lingkup disepakati',
    'Quote sent':'Penawaran dikirim', 'Fixed price, valid 7 days — accept or decline in the app':'Harga tetap, berlaku 7 hari — setujui atau tolak di aplikasi', 'Schedule locked':'Jadwal terkunci', 'Paid on acceptance; crew booked':'Dibayar saat disetujui; tim dipesan',
    'Done & verified':'Selesai & terverifikasi', 'Photos attached, warranty starts':'Foto terlampir, garansi mulai',
    'Pickup scheduled':'Penjemputan dijadwalkan', 'Courier comes with pickup bags':'Kurir datang membawa kantong', 'Picked up & weighed':'Dijemput & ditimbang', 'Weight photographed at your door':'Berat difoto di depan pintu Anda',
    'Final price sent':'Harga akhir dikirim', 'kg × rate — approve in the app':'kg × tarif — setujui di aplikasi', 'Washing & drying':'Dicuci & dikeringkan', 'Progress updates from the hub':'Kabar kemajuan dari hub', 'Delivered & charged':'Diantar & ditagih', 'EXO Wallet charged on approval':'EXO Wallet ditagih saat disetujui',
    'Proposal requested':'Proposal diajukan', 'Account manager assigned':'Account manager ditunjuk', 'Site survey':'Survei lokasi', 'Scope, SOP codes and schedule agreed':'Lingkup, kode SOP, dan jadwal disepakati', 'Contract signed':'Kontrak ditandatangani', 'Minimum term per service terms':'Masa minimal sesuai ketentuan layanan', 'Visits running':'Kunjungan berjalan', 'Daily/weekly/monthly per SOP':'Harian/mingguan/bulanan sesuai SOP', 'Monthly invoice':'Tagihan bulanan', 'Photo report and chemical log attached':'Laporan foto dan log kimia terlampir',
    'List received':'Daftar diterima', 'Runner confirms brands and substitutes':'Kurir mengonfirmasi merek dan pengganti', 'Shopping':'Berbelanja', 'Photos before checkout':'Foto sebelum bayar', 'Receipt sent':'Struk dikirim', 'Approve the goods total in the app':'Setujui total barang di aplikasi', 'Delivered & settled':'Diantar & dilunasi', 'Goods charged to EXO Wallet on approval':'Barang ditagih ke EXO Wallet saat disetujui',
    'Step':'Tahap', 'Next:':'Berikutnya:', 'Pay later with':'Bayar nanti dengan', 'Estimate':'Perkiraan', 'not charged yet':'belum ditagih',
    'Quote is ready — accept to lock the schedule':'Penawaran siap — setujui untuk mengunci jadwal', 'Weight recorded — approve the final price':'Berat tercatat — setujui harga akhir', 'Receipt sent — approve the goods total':'Struk dikirim — setujui total barang', 'Extra work proposed on site — approve or decline':'Ada pekerjaan tambahan di lokasi — setujui atau tolak',
    'Waiting for your decision — open the card above.':'Menunggu keputusan Anda — buka kartu di atas.', 'Scope as surveyed':'Lingkup sesuai survei', 'Materials & machines':'Bahan & mesin', 'quote accepted':'penawaran disetujui', 'Quote accepted':'Penawaran disetujui', 'schedule locked to':'jadwal terkunci untuk',
    'Quote declined. Nothing is charged; the survey stays free.':'Penawaran ditolak. Tidak ada yang ditagih; survei tetap gratis.', 'Final price approved':'Harga akhir disetujui', 'Goods':'Barang', 'Goods total approved':'Total barang disetujui', 'Extra work':'Pekerjaan tambahan', 'Extra approved':'Tambahan disetujui', 'Extra declined — the cleaner sticks to the original scope.':'Tambahan ditolak — petugas mengerjakan lingkup awal saja.',
    'Quote':'Penawaran', 'No quote yet.':'Belum ada penawaran.', 'Fixed price from the survey, valid 7 days. Accepting pays from your chosen method and locks the schedule to':'Harga tetap dari survei, berlaku 7 hari. Menyetujui berarti membayar dengan metode pilihan Anda dan mengunci jadwal untuk', 'Declining costs nothing.':'Menolak tidak dikenai biaya.', 'Decline':'Tolak', 'Accept & pay':'Setujui & bayar', 'Quote declined':'Penawaran ditolak', 'Quote from the survey':'Penawaran dari survei',
    'Weigh result':'Hasil timbang', 'Not weighed yet.':'Belum ditimbang.', 'Weight at pickup':'Berat saat jemput', 'Rate':'Tarif', 'The estimate at booking was':'Perkiraan saat memesan', 'The final price follows the weight photographed at your door; approving charges it and the washing starts.':'Harga akhir mengikuti berat yang difoto di depan pintu Anda; menyetujui berarti menagihnya dan pencucian dimulai.', 'Approve & pay':'Setujui & bayar', 'Final price after weighing':'Harga akhir setelah ditimbang',
    'Receipt':'Struk', 'No receipt yet.':'Belum ada struk.', 'Goods on the receipt':'Barang di struk', 'Runner fee':'Ongkos kurir', 'paid at booking':'dibayar saat memesan', 'Goods are settled at cost against the photographed receipt — never marked up. Approving charges your EXO Wallet and the runner heads to you.':'Barang dilunasi sesuai harga di struk yang difoto — tanpa mark-up. Menyetujui berarti menagih EXO Wallet Anda dan kurir berangkat ke tempat Anda.', 'Approve goods total':'Setujui total barang', 'Shopping receipt':'Struk belanja',
    'No extra work proposed.':'Tidak ada pekerjaan tambahan yang diajukan.', 'Approve':'Setujui', 'Approved':'Disetujui', 'Declined':'Ditolak', 'Anything found on site beyond the original scope is priced here first. Nothing extra is done, or charged, until you approve it.':'Apa pun yang ditemukan di lokasi di luar lingkup awal diberi harga di sini dulu. Tidak ada tambahan yang dikerjakan, atau ditagih, sebelum Anda menyetujui.', 'Extra work on site':'Pekerjaan tambahan di lokasi',
    'Receipt photo attached':'Foto struk terlampir'
  };
  Object.keys(ID_ALUR).forEach(function (k) { ID[k] = ID_ALUR[k]; });
  var ID_COOK = {
    'Grocery run before cooking':'Belanja bahan sebelum memasak', 'Weekly meal-prep containers':'Wadah meal prep mingguan', '10 portions':'10 porsi', 'Special diet menu':'Menu diet khusus', 'low salt, diabetic, kids':'rendah garam, diabetes, anak',
    'Glass facade quarterly':'Kaca fasad tiap 3 bulan', 'up to 4 floors':'hingga 4 lantai', 'Pest control quarterly':'Pest control tiap 3 bulan', 'common areas':'area bersama', 'Garden & parking sweep':'Sapu taman & parkir', 'daily':'harian',
    'Minimum 2 hours per visit; ingredients are yours, or bought on the way with the grocery-run add-on.':'Minimal 2 jam per kunjungan; bahan dari Anda, atau dibelikan di jalan dengan tambahan belanja bahan.',
    'Daily home cooking for up to 6 people from your recipes or ours':'Masakan rumah harian untuk hingga 6 orang dari resep Anda atau kami',
    'Weekly meal prep, portioned and labelled for the fridge':'Meal prep mingguan, diporsi dan diberi label untuk kulkas',
    'Kitchen left clean: dishes washed, stove and counters wiped':'Dapur ditinggal bersih: piring dicuci, kompor dan meja dilap',
    'Catering for events above 10 people — book through customer service':'Katering acara di atas 10 orang — pesan lewat layanan pelanggan',
    'Cooking with ingredients that are spoiled or past their date':'Memasak dengan bahan yang rusak atau kedaluwarsa',
    'A cook with food-hygiene training, hairnet, apron and a food thermometer':'Juru masak terlatih higiene pangan, hairnet, apron, dan termometer makanan',
    'Ingredients, a working stove, cookware and containers':'Bahan, kompor yang berfungsi, alat masak, dan wadah',
    'Your menu or dietary notes, at the latest the evening before':'Menu atau catatan diet Anda, paling lambat malam sebelumnya',
    'Home cooking only. Tell us about allergies and diets before booking — the cook follows your list and does not diagnose.':'Hanya masakan rumah. Beri tahu alergi dan diet sebelum memesan — juru masak mengikuti daftar Anda dan tidak mendiagnosis.',
    'Monthly contract, minimum 6 months, priced per building after a survey.':'Kontrak bulanan, minimal 6 bulan, harga per gedung setelah survei.',
    'Daily lobby, lift and corridor cleaning with a supervisor on site':'Pembersihan harian lobi, lift, dan koridor dengan supervisor di lokasi',
    'Water tank cleaning every 6 months and weekly pool care included':'Cuci toren tiap 6 bulan dan perawatan kolam mingguan sudah termasuk',
    'Monthly report with photos, chemical log and a checklist per SOP':'Laporan bulanan dengan foto, log kimia, dan checklist sesuai SOP',
    'Structural repairs, painting and pest treatment without a separate order':'Perbaikan struktur, pengecatan, dan pest control tanpa pesanan terpisah',
    'Units inside residents\' apartments — those are booked by each resident':'Unit di dalam apartemen penghuni — dipesan oleh masing-masing penghuni',
    'A dedicated team, machines, chemicals and PPE per SOP':'Tim khusus, mesin, bahan kimia, dan APD sesuai SOP',
    'An account manager and a monthly review meeting':'Account manager dan rapat evaluasi bulanan',
    'Storage space, water and power, and building access permits':'Ruang simpan, air dan listrik, serta izin akses gedung',
    'One contact person for daily coordination':'Satu orang kontak untuk koordinasi harian',
    'One agreed schedule replaces separate bookings: water tanks every 6 months, pool weekly, lobby and lifts daily, with one monthly invoice.':'Satu jadwal yang disepakati menggantikan pesanan terpisah: toren tiap 6 bulan, kolam mingguan, lobi dan lift harian, dengan satu tagihan bulanan.'
  };
  Object.keys(ID_COOK).forEach(function (k) { ID[k] = ID_COOK[k]; });
  Object.keys(ID_CARE).forEach(function (k) { ID[k] = ID_CARE[k]; });
  Object.keys(ID).forEach(function (k) { id(k, ID[k]); });

  /* Pesan sekilas (toast) — Indonesia */
  var TOAST = {
    'Photo attached.':'Foto terlampir.', 'Photo removed.':'Foto dihapus.', 'Two photos is the limit.':'Maksimal dua foto.',
    'That file is not an image we can read.':'Berkas itu bukan gambar yang bisa dibaca.',
    'Not enough balance for that.':'Saldo tidak cukup.', 'added. Balance':'ditambahkan. Saldo', 'on the way to BCA ···4471.':'dalam perjalanan ke BCA ···4471.',
    '30 Aug skipped. Your cleaner still holds 6 Sep.':'30 Agu dilewati. Petugas Anda tetap memegang 6 Sep.', '30 Aug is back on. Nothing else changed.':'30 Agu kembali aktif. Tidak ada yang lain berubah.',
    'Same cleaner, same price.':'Petugas sama, harga sama.', 'Moved to':'Dipindah ke',
    'Notifications on — including slot changes and refunds.':'Notifikasi aktif — termasuk perubahan jadwal dan refund.', 'Notifications off. You will not hear about slot changes.':'Notifikasi mati. Anda tidak akan tahu bila jadwal berubah.',
    'Now booking for':'Sekarang memesan untuk', 'Welcome, Dewi. Two-step verification and your PIN are set.':'Selamat datang, Dewi. Verifikasi dua langkah dan PIN sudah aktif.',
    'Claim received. A human replies within 60 seconds; decision by tomorrow 17:00.':'Klaim diterima. Manusia membalas dalam 60 detik; keputusan besok 17:00.',
    'Thanks —':'Terima kasih —', 'gets your':'menerima', 'tip':'tip', 'saved to the database, her rating recomputes from it.':'tersimpan di basis data, ratingnya dihitung ulang dari sini.',
    'EXO Wallet is short by':'EXO Wallet kurang', 'Top up or pick another method.':'Isi saldo atau pilih metode lain.',
    'Payment server offline — simulated confirmation (start app/server/payment-server.js for real Midtrans sandbox).':'Server pembayaran tidak aktif — konfirmasi simulasi (jalankan app/server/payment-server.js untuk sandbox Midtrans sungguhan).',
    'Payment confirmed by the gateway.':'Pembayaran dikonfirmasi gateway.', 'Complete the payment, then check again.':'Selesaikan pembayaran, lalu cek lagi.',
    'Auth server offline — OTP simulated. Start app/server/auth-server.js for the real flow.':'Server autentikasi tidak aktif — OTP disimulasikan. Jalankan app/server/auth-server.js untuk alur sungguhan.',
    'Number verified by the auth server.':'Nomor diverifikasi server autentikasi.', 'Wrong code.':'Kode salah.',
    'Code sent by the auth server · valid':'Kode dikirim server autentikasi · berlaku',
    'login simulated — fill':'login disimulasikan — isi', 'in js/exo-config.js for the real flow.':'di js/exo-config.js untuk alur sungguhan.',
    'bought —':'dibeli —', 'hours ready to book.':'jam siap dipesan.',
    'Order':'Pesanan', 'written to the EXOCLEAN database · slot locked to':'tertulis di basis data EXOCLEAN · jadwal terkunci untuk',
    'Solve the Turnstile widget above — the checkbox is not a substitute.':'Selesaikan widget Turnstile di atas — kotak centang bukan penggantinya.'
  };
  Object.keys(TOAST).forEach(function (k) { id(k, TOAST[k]); });
})(EXO_I18N);
