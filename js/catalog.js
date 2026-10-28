// The product catalog: every tool of the three Mehr-8 systems (LMS, Darsafzar ERP, profile site),
// de-duplicated into one list of sellable modules. Prices are samples and can be edited in the panel.
const CATALOG = (() => {
  const sources = {
    lms: { name: 'LMS (مودل)', short: 'LMS' },
    erp: { name: 'ERP درس‌افزار', short: 'ERP' },
    profile: { name: 'سایت پروفایل', short: 'پروفایل' },
    new: { name: 'تازه در سامانهٔ یکپارچه', short: 'تازه' },
  };

  // How a module is priced. per_use is charged per student for each administration (tests).
  const pricing = {
    included: { name: 'در اشتراک پایه', unit: '' },
    monthly: { name: 'اشتراک ماهانه', unit: 'ماهانه برای هر مدرسه' },
    per_student: { name: 'به‌ازای دانش‌آموز', unit: 'سالانه برای هر دانش‌آموز' },
    per_use: { name: 'به‌ازای اجرا', unit: 'برای هر دانش‌آموز در هر اجرا' },
  };

  // What it takes to build each module into the new platform.
  const build = {
    reuse: 'کد سایت پروفایل قابل استفاده است',
    integrate: 'اتصال به Moodle (متن‌باز)',
    new: 'ساخت تازه',
  };

  const groups = [
    { id: 'core', name: 'هسته', desc: 'همیشه فعال؛ پایهٔ همهٔ بخش‌ها' },
    { id: 'acad', name: 'آموزش', desc: 'برنامه، کلاس، نمره، آزمون و محتوای درسی' },
    { id: 'guid', name: 'تربیتی و مشاوره', desc: 'پروندهٔ مشاوره، مشاهده، انضباط و تحلیل' },
    { id: 'test', name: 'آزمون‌های استعدادیابی', desc: 'فروش به‌ازای اجرا برای هر دانش‌آموز' },
    { id: 'comm', name: 'ارتباطات', desc: 'پیام، مکاتبه، پیامک و درگاه اولیا' },
    { id: 'fin', name: 'ثبت‌نام و مالی', desc: 'متقاضیان، شهریه، پرداخت، تنخواه و بودجه' },
    { id: 'hr', name: 'اداری و پرسنلی', desc: 'استخدام، قرارداد، حقوق و بیمه' },
    { id: 'svc', name: 'خدمات و رفاه', desc: 'تغذیه، سرویس، میز خدمت و پویش‌ها' },
    { id: 'qual', name: 'سنجش کیفیت', desc: 'نظرسنجی، ارزیابی معلم و مدرسه' },
    { id: 'rep', name: 'گزارش و تحلیل', desc: 'داشبورد مدیریتی، گزارش‌ساز و لاگ' },
    { id: 'plat', name: 'زیرساخت', desc: 'امنیت، گردش‌کار، اپ و ورود یکپارچه' },
  ];

  // from: the original tools merged into the module, by source system.
  // users: main users of the module (a hint only; access rules come later).
  // deps: modules that must be active first.
  const m = (id, name, desc, from, price, buildHow, users, deps = []) => ({
    id, group: id.split('.')[0], name, desc, from, price, build: buildHow, users, deps,
  });
  const P = (model, amount = 0) => ({ model, amount });

  const modules = [
    // ---- core
    m('core.school', 'پروفایل مدرسه و چارت سازمانی', 'اطلاعات مدرسه، واحدها، مجموعه‌ها و چارت سازمانی.',
      [['erp', 'چارت سازمانی'], ['erp', 'مجموعه‌ها']], P('included'), 'new', ['principal']),
    m('core.users', 'کاربران، نقش‌ها و حساب‌ها', 'ساخت حساب برای هر نقش، مسدودسازی و تغییر نقش.',
      [['erp', 'مدیریت کاربران و نقش‌ها'], ['erp', 'کاربران مسدود'], ['lms', 'تغییر نقش به...'], ['profile', 'حساب‌های معلم/کمک/مدیر']],
      P('included'), 'new', ['principal']),
    m('core.students', 'پرونده و فهرست دانش‌آموزان', 'مشخصات، کلاس و پایه؛ پایهٔ مشترک همهٔ بخش‌ها.',
      [['erp', 'دانش‌آموزان'], ['profile', 'فهرست دانش‌آموزان'], ['lms', 'همگام‌سازی کارگروه (Cohort)']],
      P('included'), 'new', ['principal', 'edu_deputy', 'counselor', 'teacher']),
    m('core.desk', 'میزکار شخصی و جست‌وجو', 'خلاصهٔ روز هر کاربر: کلاس‌ها، نوبت‌ها، یادآورها و جست‌وجوی سراسری.',
      [['erp', 'میزکار'], ['lms', 'میز مدرسهٔ من'], ['profile', 'نمای کلی'], ['profile', 'جست‌وجو']],
      P('included'), 'reuse', ['all']),
    m('core.calendar', 'تقویم اجرایی و رویدادها', 'رویدادهای مدرسه، انواع رویداد و کارتابل تأیید.',
      [['erp', 'تقویم اجرایی'], ['erp', 'کارتابل تأیید رویداد'], ['lms', 'تقویم']],
      P('included'), 'new', ['all']),
    m('core.notices', 'اطلاعیه‌ها و اعلان‌ها', 'اطلاعیهٔ هدفمند به نقش‌ها و کلاس‌ها و صف اعلان.',
      [['erp', 'اطلاعیه‌ها'], ['erp', 'اعلان‌ها'], ['lms', 'اطلاعیه‌ها']],
      P('included'), 'new', ['all']),

    // ---- academic
    m('acad.timetable', 'برنامهٔ هفتگی', 'برنامهٔ کلاس‌ها، معلمان و مشاوران؛ نسخه‌های هفتگی و تغییر یک‌هفته‌ای؛ خروجی PDF.',
      [['erp', 'برنامه‌های هفتگی'], ['lms', 'برنامهٔ هفتگی (weeklyplanner)'], ['profile', 'برنامه‌های هفتگی']],
      P('monthly', 400000), 'reuse', ['edu_deputy', 'teacher', 'counselor']),
    m('acad.journal', 'دفتر کلاسی و حضور و غیاب', 'جلسات درسی، غیبت روزانه و گزارش روزانهٔ کلاس.',
      [['erp', 'جلسات درسی'], ['erp', 'گزارش روزانهٔ کلاس'], ['erp', 'غیبت روزانه'], ['lms', 'حضور و غیاب کلاس آنلاین']],
      P('per_student', 25000), 'new', ['teacher', 'edu_deputy'], ['acad.timetable']),
    m('acad.grades', 'نمره و ارزشیابی', 'ثبت نمره، دفتر نمره، ارزشیابی توصیفی و اهداف آموزشی.',
      [['erp', 'ثبت نمره'], ['erp', 'ثبت ارزیابی'], ['erp', 'دفترهای نمره'], ['lms', 'دفتر نمره']],
      P('per_student', 30000), 'new', ['teacher', 'edu_deputy']),
    m('acad.reportcard', 'کارنامه و اعتراض', 'چاپ و انتشار کارنامه، کارنامهٔ مادر و کارتابل اعتراضات.',
      [['erp', 'کارنامه‌ها'], ['erp', 'کارتابل اعتراضات کارنامه']],
      P('per_student', 15000), 'new', ['edu_deputy', 'principal'], ['acad.grades']),
    m('acad.assignments', 'تکالیف', 'تعریف، دریافت و نمره‌دهی تکلیف.',
      [['erp', 'تکالیف'], ['lms', 'تکلیف']],
      P('monthly', 300000), 'integrate', ['teacher', 'student']),
    m('acad.exams', 'آزمون‌ساز و بانک سؤال', 'ساخت آزمون، بانک سؤال، کارت آزمون و چاپ کارت صندلی.',
      [['erp', 'آزمون و نمونه‌سؤال'], ['erp', 'کارت آزمون'], ['lms', 'آزمون (Quiz)'], ['lms', 'بانک سؤال']],
      P('monthly', 600000), 'integrate', ['teacher', 'edu_deputy']),
    m('acad.lms', 'محتوای آموزشی و دوره‌های الکترونیکی', 'دوره‌ها، فایل و کتاب، تالار گفتگو، ویکی، H5P، SCORM، نشان‌ها و شایستگی‌ها.',
      [['erp', 'دوره‌های آموزشی'], ['erp', 'دوره‌های من'], ['lms', 'دوره‌ها و منابع'], ['lms', 'فعالیت‌ها (H5P، SCORM، ویکی...)'], ['lms', 'نشان‌ها و شایستگی‌ها']],
      P('per_student', 40000), 'integrate', ['teacher', 'student']),
    m('acad.live', 'کلاس آنلاین', 'کلاس زنده با BigBlueButton، گزارش زندهٔ کلاس‌ها و حضور.',
      [['erp', 'کلاس‌های آنلاین'], ['lms', 'کلاس آنلاین (BigBlueButton)'], ['lms', 'گزارش کلاس‌های آنلاین']],
      P('monthly', 1200000), 'integrate', ['teacher', 'student', 'edu_deputy']),
    m('acad.study', 'ردیاب مطالعه و الگوهای مطالعاتی', 'ثبت ساعت مطالعه، الگوی مطالعاتی و ارزیابی روزانه/هفتگی.',
      [['erp', 'الگوهای مطالعاتی'], ['lms', 'ساعات مطالعاتی (study-tracker)']],
      P('per_student', 20000), 'new', ['student', 'counselor', 'parent']),

    // ---- guidance
    m('guid.dossier', 'پروندهٔ مشاوره و جلسات', 'جلسهٔ فردی، تحصیلی و خانواده با شرح، اقدام بعدی، نسخه‌ها و بازگردانی.',
      [['erp', 'جلسات مشاوره'], ['profile', 'پروندهٔ مشاوره'], ['profile', 'تاریخچهٔ جلسات و نسخه‌ها']],
      P('monthly', 700000), 'reuse', ['counselor', 'counselor_asst', 'culture_deputy']),
    m('guid.appointments', 'نوبت‌دهی مشاوره', 'نوبت در برنامهٔ هفتگی، «آنچه پیش از جلسه خوب است بدانید» و ثبت شرح.',
      [['erp', 'نوبت‌دهی'], ['profile', 'نوبت‌ها و آمادگی پیش از جلسه']],
      P('monthly', 250000), 'reuse', ['counselor', 'counselor_asst'], ['guid.dossier', 'acad.timetable']),
    m('guid.followup', 'تابلوی پیگیری و یادآور', 'اقدام‌های بعدی همهٔ جلسه‌ها، سپردن کار به همکار و یادآور شخصی.',
      [['profile', 'تابلوی پیگیری'], ['profile', 'یادآورهای من']],
      P('monthly', 200000), 'reuse', ['counselor', 'counselor_asst', 'culture_deputy'], ['guid.dossier']),
    m('guid.observations', 'مشاهدات رفتاری', 'ثبت سریع مشاهدهٔ مثبت/خنثی/نگران‌کننده برای یک یا چند دانش‌آموز؛ «دیده‌نشده‌ها».',
      [['erp', 'مشاهدات عمومی'], ['erp', 'مشاهدات مشاور'], ['profile', 'مشاهدات رفتاری']],
      P('monthly', 250000), 'reuse', ['teacher', 'counselor', 'culture_deputy']),
    m('guid.discipline', 'انضباط و امتیاز رفتاری', 'دسته‌ها و موارد انضباطی، امتیاز و گزارش فعالیت‌ها.',
      [['erp', 'موارد انضباطی'], ['erp', 'گزارش امتیاز انضباطی']],
      P('monthly', 300000), 'new', ['culture_deputy', 'principal']),
    m('guid.analytics', 'تحلیل کل پایه', 'پیگیری فوری، نقشهٔ خطر هیجان×تحصیل، گروه‌های مشاورهٔ پیشنهادی و مقایسهٔ کلاس‌ها.',
      [['profile', 'تحلیل کل پایه'], ['erp', 'گزارش استعداد و مشاوره']],
      P('per_student', 30000), 'reuse', ['counselor', 'principal', 'culture_deputy'], ['guid.dossier']),
    // Uses the results of the tests the school has run; tests are credits, so they are not a dependency here.
    m('guid.career', 'هدایت تحصیلی و انتخاب رشته', 'مسیرهای همخوان، «کدام رشته؟» و نقشهٔ راه با پشتوانهٔ نتایج آزمون‌ها.',
      [['profile', 'کدام رشته؟ و نقشهٔ راه']],
      P('per_student', 50000), 'reuse', ['counselor', 'parent'], ['guid.dossier']),

    // ---- psychometric tests (sold per administration)
    m('test.neo', 'آزمون شخصیت نئو (پنج عامل)', 'نیمرخ پنج عامل، ریزنمرهٔ خوشه‌ها، اعتبار پاسخ و قوت/مراقبت/اقدام.',
      [['profile', 'فصل شخصیت (نئو)']], P('per_use', 60000), 'reuse', ['counselor']),
    m('test.gardner', 'هوش‌های چندگانه (گاردنر)', 'نیمرخ هشت هوش با راهنمای خواندن و اعتبار پاسخ.',
      [['profile', 'فصل هوش‌های چندگانه']], P('per_use', 40000), 'reuse', ['counselor']),
    m('test.holland', 'علاقه‌های شغلی (هالند)', 'شش‌ضلعی علاقه‌ها، کد سه‌حرفی و چهار نگاه به هر تیپ.',
      [['profile', 'فصل علاقه‌های شغلی']], P('per_use', 50000), 'reuse', ['counselor']),
    m('test.math', 'پیش‌نیازسنج ریاضی', 'شش حوزهٔ پیش‌نیاز، نقشهٔ سؤال‌به‌سؤال و الگوی خطا.',
      [['profile', 'فصل پیش‌نیاز ریاضی']], P('per_use', 30000), 'reuse', ['counselor', 'teacher']),
    m('test.profile', 'پروفایل تحلیلی دانش‌آموز', 'جمع‌بندی همهٔ آزمون‌ها و سوابق تحصیلی: تصویر یکپارچه، درخت زندگی تحصیلی و راهبرد.',
      [['profile', 'جمع‌بندی و راهبرد'], ['profile', 'سوابق تحصیلی'], ['profile', 'خروجی PDF پروفایل']],
      P('per_use', 150000), 'reuse', ['counselor', 'parent', 'principal']),

    // ---- communications
    m('comm.messenger', 'پیام‌رسان و تابلوی مدرسه', 'گفتگوی داخلی بین کاربران و تابلوی اعلانات.',
      [['erp', 'پیام‌رسان'], ['erp', 'تابلوی مدرسه']], P('monthly', 300000), 'new', ['all']),
    m('comm.letters', 'مکاتبات و دبیرخانه', 'نامهٔ ورودی/خروجی، پیش‌نویس، ارجاع و مخاطبین.',
      [['erp', 'نامه‌نگاری']], P('monthly', 500000), 'new', ['secretary', 'principal', 'exec_deputy']),
    m('comm.sms', 'پنل پیامک', 'قالب پیامک و ارسال گروهی؛ هزینهٔ پیامک جداگانه.',
      [['erp', 'پنل پیامک']], P('monthly', 200000), 'new', ['secretary', 'principal']),
    m('comm.social', 'شبکهٔ اجتماعی مدرسه', 'انتشار در شبکه‌های اجتماعی مدرسه.',
      [['erp', 'شبکهٔ اجتماعی']], P('monthly', 200000), 'new', ['culture_deputy']),
    m('comm.parents', 'درگاه اولیا', 'دیدن کارنامه، حضور، مطالعه و اطلاعیه‌ها توسط ولی.',
      [['erp', 'ورود سرپرست']], P('per_student', 20000), 'new', ['parent']),

    // ---- enrolment & finance
    m('fin.enrollment', 'ثبت‌نام و پذیرش', 'متقاضیان، گردش‌کار پذیرش، ظرفیت پایه‌ها و گزارش ثبت‌نام.',
      [['erp', 'متقاضیان ثبت‌نام'], ['erp', 'کارتابل ثبت‌نام'], ['erp', 'گزارش‌های ثبت‌نام']],
      P('monthly', 800000), 'new', ['exec_deputy', 'principal']),
    m('fin.tuition', 'شهریه و صورت‌حساب', 'شهریه، فاکتور، تخفیف و کوپن.',
      [['erp', 'امور مالی ثبت‌نام']], P('monthly', 700000), 'new', ['accountant', 'exec_deputy'], ['fin.enrollment']),
    m('fin.payments', 'دریافت و پرداخت', 'صندوق‌ها، درگاه پرداخت، چک، بدهکاران، اسناد و رسید.',
      [['erp', 'امور مالی'], ['erp', 'درگاه پرداخت']], P('monthly', 900000), 'new', ['accountant'], ['fin.tuition']),
    m('fin.imprest', 'تنخواه', 'هزینه‌ها، فاکتورها، کیف پول و تراکنش‌ها.',
      [['erp', 'تنخواه']], P('monthly', 300000), 'new', ['accountant', 'exec_deputy']),
    m('fin.budget', 'بودجه‌ریزی', 'قالب بودجه، هزینه‌ها، آیین‌نامه‌ها و کارتابل بررسی.',
      [['erp', 'بودجه‌ریزی']], P('monthly', 600000), 'new', ['principal', 'accountant']),

    // ---- HR
    m('hr.recruit', 'استخدام', 'گردش‌کار جذب و کارتابل مراحل استخدام.',
      [['erp', 'امور استخدام'], ['erp', 'کارتابل استخدام']], P('monthly', 400000), 'new', ['principal', 'exec_deputy']),
    m('hr.records', 'پروندهٔ پرسنلی، قرارداد و بیمه', 'فرم اطلاعات کارکنان، قرارداد و بیمه.',
      [['erp', 'فرم اطلاعات'], ['erp', 'قرارداد'], ['erp', 'بیمه']], P('monthly', 500000), 'new', ['exec_deputy', 'accountant']),
    m('hr.payroll', 'حقوق و فیش', 'محاسبهٔ حقوق و فیش کارکنان.',
      [['erp', 'حقوق و فیش']], P('monthly', 700000), 'new', ['accountant'], ['hr.records']),

    // ---- services
    m('svc.food', 'تغذیه و تعاونی', 'آشپزخانه، منو، رزرو غذا، فروشگاه تعاونی اقلام اساسی برای کارکنان، ژتون و کیف پول.',
      [['erp', 'تغذیه']], P('per_student', 15000), 'new', ['services', 'student', 'parent']),
    m('svc.transport', 'سرویس مدرسه', 'راننده، مسافر، گروه‌ها و متقاضیان سرویس.',
      [['erp', 'سرویس مدرسه']], P('monthly', 400000), 'new', ['services', 'parent']),
    m('svc.helpdesk', 'میز خدمت', 'ثبت و پیگیری درخواست‌ها و مدیریت خدمات.',
      [['erp', 'میز خدمت'], ['erp', 'مدیریت خدمات']], P('monthly', 300000), 'new', ['all']),
    m('svc.campaign', 'پویش‌ها و کمپین‌ها', 'تعریف پویش و مدیریت مشارکت‌کنندگان.',
      [['erp', 'کمپین']], P('monthly', 200000), 'new', ['culture_deputy']),

    // ---- quality
    m('qual.forms', 'فرم‌ساز و نظرسنجی', 'فرم و نظرسنجی دلخواه با قالب سؤال.',
      [['erp', 'فرم‌ها'], ['erp', 'نظرسنجی‌ها'], ['lms', 'بازخورد'], ['lms', 'سؤال چندگزینه‌ای (Choice)']],
      P('monthly', 300000), 'new', ['principal', 'edu_deputy', 'culture_deputy']),
    m('qual.teacher', 'ارزیابی معلمان', 'آینهٔ تدریس: خودارزیابی، بازدید کلاس و نظر بی‌نام دانش‌آموزان روی یک چارچوب، و هدف‌های رشد.',
      [['erp', 'ارزیابی معلمین'], ['erp', 'خودارزیابی معلمین'], ['erp', 'گزارش عملکرد معلم']],
      P('monthly', 400000), 'new', ['principal', 'edu_deputy', 'teacher', 'student']),
    m('qual.school', 'ارزیابی مدرسه', 'شاخص‌های ارزیابی مدرسه و گزارش.',
      [['erp', 'ارزیابی مدارس']], P('monthly', 300000), 'new', ['principal']),

    // ---- reports
    m('rep.dashboard', 'داشبورد مدیریتی', 'نمای یک‌جای آموزشی، تربیتی و مالی برای مدیر و معاونان.',
      [['new', 'داشبورد نقش‌محور']], P('monthly', 500000), 'new', ['principal', 'edu_deputy', 'culture_deputy', 'exec_deputy']),
    m('rep.builder', 'گزارش‌ساز و خروجی‌ها', 'گزارش دلخواه و خروجی Excel و PDF.',
      [['erp', 'گزارش‌ها'], ['lms', 'Report Builder'], ['profile', 'خروجی PDF']],
      P('monthly', 400000), 'new', ['principal', 'edu_deputy']),
    m('rep.audit', 'لاگ رویدادها و تحلیل کاربران', 'چه کسی، چه وقت، چه کاری کرد؛ آمار استفاده.',
      [['erp', 'لاگ رویدادها'], ['erp', 'تحلیل کاربران'], ['lms', 'نظارت بر رویدادها']],
      P('included'), 'new', ['principal']),

    // ---- platform
    m('plat.vault', 'خزانهٔ رمزنگاری‌شده', 'پرونده‌های محرمانه با رمزنگاری سرتاسری؛ سرور هم آن‌ها را نمی‌خواند.',
      [['profile', 'رمزنگاری سرتاسری (AES-GCM)']], P('monthly', 500000), 'reuse', ['counselor', 'principal']),
    m('plat.workflow', 'گردش‌کار و کارتابل‌ها', 'تعریف فرایند، مراحل و نقش‌آفرینان برای کارتابل‌ها.',
      [['erp', 'گردش‌کار (BPM)']], P('monthly', 600000), 'new', ['principal', 'exec_deputy']),
    m('plat.app', 'اپ موبایل و اعلان فوری', 'نصب روی گوشی (PWA) و اعلان لحظه‌ای.',
      [['erp', 'PWA و اپ موبایل']], P('included'), 'new', ['all']),
    m('plat.sso', 'ورود یکپارچه', 'یک حساب برای همهٔ بخش‌ها، از جمله محتوای آموزشی.',
      [['erp', 'اتصال به LMS']], P('included'), 'new', ['all']),
    m('plat.offline', 'نسخهٔ آفلاین و پشتیبان', 'دریافت فایل پشتیبان رمزشده و کار بدون اینترنت.',
      [['profile', 'نسخهٔ آفلاین HTML'], ['profile', 'ادغام جلسات از نسخهٔ دیگر']], P('monthly', 200000), 'reuse', ['counselor', 'principal']),
    m('plat.import', 'ورود داده از Excel', 'بارگذاری فهرست دانش‌آموزان، نمره‌ها و نتایج آزمون‌ها.',
      [['profile', 'ورود داده از اکسل/CSV'], ['erp', 'درون‌ریزی'], ['lms', 'ورود/صدور']], P('included'), 'reuse', ['principal', 'edu_deputy']),
  ];

  // School-side roles. Access to modules is decided in a later step.
  const roles = [
    { id: 'principal', name: 'مدیر مدرسه', desc: 'دید کامل بر مدرسه، تأییدها و گزارش‌های مدیریتی' },
    { id: 'edu_deputy', name: 'معاون آموزشی', desc: 'برنامه، کلاس، نمره، کارنامه و آزمون' },
    { id: 'culture_deputy', name: 'معاون پرورشی و تربیتی', desc: 'انضباط، مشاهدات، پویش‌ها و برنامه‌های تربیتی' },
    { id: 'exec_deputy', name: 'معاون اجرایی', desc: 'ثبت‌نام، امور اداری، پرسنل و خدمات' },
    { id: 'counselor', name: 'مشاور / معلم راهنما', desc: 'پروندهٔ مشاوره، آزمون‌ها و تحلیل پایه' },
    { id: 'counselor_asst', name: 'کمک معلم راهنما', desc: 'جلسه، نوبت و پیگیری در کنار معلم راهنما' },
    { id: 'teacher', name: 'معلم', desc: 'کلاس، حضور، نمره، تکلیف و مشاهده' },
    { id: 'secretary', name: 'دبیرخانه و منشی', desc: 'مکاتبات، پیامک و اطلاعیه' },
    { id: 'accountant', name: 'امور مالی', desc: 'شهریه، پرداخت، تنخواه و حقوق' },
    { id: 'services', name: 'مسئول خدمات', desc: 'تغذیه و سرویس مدرسه' },
    { id: 'student', name: 'دانش‌آموز', desc: 'کلاس، تکلیف، آزمون و مطالعه' },
    { id: 'parent', name: 'ولی', desc: 'کارنامه، حضور، اطلاعیه و پرداخت' },
  ];
  const roleName = id => id === 'all' ? 'همهٔ نقش‌ها' : (roles.find(r => r.id === id) || {}).name || id;

  // Ready-made bundles. Tests are never bundled: they are always sold per administration.
  const plans = [
    { id: 'base', name: 'اشتراک پایه', price: 1500000, desc: 'هسته و زیرساخت رایگان؛ لازمهٔ همهٔ بسته‌ها',
      modules: modules.filter(x => x.price.model === 'included').map(x => x.id) },
    { id: 'edu', name: 'بستهٔ آموزش', price: 4500000, desc: 'همهٔ ابزارهای آموزشی و کلاس آنلاین',
      modules: modules.filter(x => x.group === 'acad').map(x => x.id) },
    { id: 'guid', name: 'بستهٔ مشاوره و تربیتی', price: 2500000, desc: 'پرونده، نوبت، پیگیری، مشاهده، انضباط، تحلیل پایه و خزانهٔ رمزشده',
      modules: modules.filter(x => x.group === 'guid').map(x => x.id).concat(['plat.vault']) },
    { id: 'admin', name: 'بستهٔ اداری و مالی', price: 5000000, desc: 'ثبت‌نام، مالی، پرسنلی و مکاتبات',
      modules: modules.filter(x => x.group === 'fin' || x.group === 'hr').map(x => x.id).concat(['comm.letters']) },
    { id: 'full', name: 'بستهٔ کامل', price: 14000000, desc: 'همه چیز به‌جز آزمون‌های استعدادیابی',
      modules: modules.filter(x => x.price.model !== 'per_use').map(x => x.id) },
  ];

  // Draft access for the roles shown in the school view, in menu order. To be finalised with the owner.
  // A module a role can see but the school has not bought shows as locked.
  const access = {
    principal: ['core.desk', 'rep.dashboard', 'core.students', 'guid.analytics', 'guid.observations', 'guid.discipline',
      'acad.timetable', 'acad.journal', 'acad.grades', 'acad.reportcard', 'core.calendar', 'core.notices', 'qual.teacher', 'fin.enrollment'],
    counselor: ['core.desk', 'core.students', 'guid.dossier', 'guid.appointments', 'guid.followup', 'guid.observations',
      'guid.analytics', 'guid.career', 'acad.timetable', 'acad.study', 'plat.vault', 'core.calendar', 'core.notices'],
    teacher: ['core.desk', 'acad.timetable', 'acad.journal', 'acad.grades', 'acad.assignments', 'acad.exams', 'guid.observations', 'core.students',
      'core.calendar', 'core.notices'],
  };
  // Counselling sessions are confidential: only these roles read their text.
  const readsSessions = ['counselor', 'counselor_asst'];

  const byId = id => modules.find(x => x.id === id);
  return { sources, pricing, build, groups, modules, roles, roleName, plans, access, readsSessions, byId };
})();
