// The frame every page shares: top bar (role switcher, school, notices, calendar, system map),
// the icon rail (at most four sections per role) and the section header with its tabs.
// NAV is the single source of truth for how the platform is organised; the system-map tree is drawn from it.
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
  id: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.8-1.8 2-2.5 3.5-2.5s2.7.7 3.5 2.5M15 9h3M15 13h3"/>',
  food: '<path d="M7 2v9M4 2v5a3 3 0 0 0 6 0V2M7 11v11M17 2c-2 2-3 5-3 8h3v12"/>',
  services: '<path d="M3 18h18M5 18a7 7 0 0 1 14 0"/><path d="M12 11V8M10 8h4"/><path d="M4 21h16"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2M2 10h20"/>',
  sitemap: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  check: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="m9 13 2 2 4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  tree: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-2.5h14V17M12 12v2.5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  back: '<path d="m9 18 6-6-6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  cap: '<path d="m22 10-10-5L2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
};
const icon = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// Sections per role. Each page: [route, label, module id]; a page whose module the school has not bought shows locked.
const NAV = {
  owner: { name: 'مالک سامانه', short: 'مالک', home: 'dashboard', hubs: [
    { id: 'overview', label: 'نمای کلی', icon: 'home', tone: 'teal', desc: 'وضعیت فروش، درخواست‌ها و اشتراک‌ها در یک نگاه', pages: [['dashboard', 'داشبورد']] },
    { id: 'catalog', label: 'کاتالوگ', icon: 'layers', tone: 'violet', desc: 'آنچه می‌فروشید: ماژول‌ها، بسته‌ها و قیمت‌ها', pages: [['modules', 'ماژول‌ها'], ['plans', 'بسته‌ها و قیمت‌ها'], ['map', 'نقشهٔ ادغام سه سامانه']] },
    { id: 'schools', label: 'مدرسه‌ها', icon: 'building', tone: 'blue', desc: 'مشتری‌ها، فعال‌سازی ماژول، درخواست‌ها و صورت‌حساب', pages: [['schools', 'مدرسه‌ها'], ['requests', 'درخواست‌ها'], ['invoices', 'صورت‌حساب‌ها']] },
    { id: 'settings', label: 'تنظیمات', icon: 'settings', tone: 'amber', desc: 'نقش‌های مدرسه و تنظیمات سامانه', pages: [['roles', 'دسترسی نقش‌ها'], ['settings', 'تنظیمات']] },
  ] },
  principal: { name: 'مدیر مدرسه', short: 'مدیر', home: 'desk', hubs: [
    { id: 'edu', label: 'آموزشی', icon: 'book', tone: 'blue', desc: 'برنامه، حضور، کارنامه و کیفیت تدریس در همهٔ پایه‌ها',
      pages: [['timetable', 'برنامهٔ هفتگی', 'acad.timetable'], ['journal', 'حضور و غیاب', 'acad.journal'], ['cards', 'کارنامه‌ها', 'acad.reportcard'], ['greport', 'گزارش وضعیت پایه', 'acad.grades'], ['teval', 'ارزیابی معلمان', 'qual.teacher'], ['game', 'دهکده دانش']] },
    { id: 'disc', label: 'نظامت', icon: 'shield', tone: 'amber', desc: 'انضباط و مشاهده‌های رفتاری، زنگ‌های مدرسه و برنامهٔ فضاها',
      pages: [['pdisc', 'انضباط مدرسه', 'guid.discipline'], ['pobs', 'مشاهدات رفتاری', 'guid.observations'], ['discCats', 'موارد و امتیازها', 'guid.discipline'], ['bells', 'زنگ مدرسه'], ['spaces', 'برنامهٔ فضاها']] },
    { id: 'family', label: 'مشاورهٔ خانواده', icon: 'users', tone: 'teal', desc: 'جلسه‌ها و نوبت‌های مدیر با خانواده‌ها',
      pages: [['family', 'جلسه با خانواده‌ها', 'guid.dossier']] },
    { id: 'admin', label: 'اداری و مالی', icon: 'building', tone: 'rose', desc: 'پذیرش دانش‌آموز و امور استخدام',
      pages: [['enroll', 'پذیرش دانش‌آموز', 'fin.enrollment'], ['hire', 'امور استخدام', 'hr.recruit']] },
    // Opened from the user menu (beside sign-out), not from the rail.
    { id: 'settings', label: 'تنظیمات مدرسه', icon: 'settings', tone: 'slate', rail: false, desc: 'نمودار سازمانی، کاربران و نقش‌ها، اشتراک ماژول‌ها',
      pages: [['orgchart', 'نمودار سازمانی'], ['users', 'کاربران و نقش‌ها'], ['subscription', 'اشتراک و ماژول‌ها']] },
  ] },
  counselor: { name: 'معلم راهنما', short: 'معلم راهنما', home: 'overview', noHome: true, hubs: [
    { id: 'overview', label: 'نمای کلی', icon: 'home', tone: 'teal', desc: 'یادآورهای من و برنامهٔ روز من و کلاس‌ها',
      pages: [['overview', 'نمای کلی'], ['cweek', 'برنامهٔ هفتگی']] },
    { id: 'profile', label: 'پروفایل تربیتی', icon: 'id', tone: 'violet', desc: 'پروندهٔ هر دانش‌آموز: آزمون‌ها، سوابق، جمع‌بندی و جلسات مشاوره',
      pages: [['students', 'دانش‌آموزان', 'core.students'], ['ureq', 'درخواست آزمون و ماژول']] },
    { id: 'behavior', label: 'نظامت', icon: 'shield', tone: 'amber', desc: 'مشاهده‌های رفتاری، موارد و کارنامهٔ انضباطی، زنگ‌ها و برنامهٔ فضاها',
      pages: [['cobs', 'مشاهدات رفتاری', 'guid.observations'], ['discReg', 'ثبت مورد انضباطی', 'guid.discipline'], ['discCard', 'کارنامهٔ انضباطی', 'guid.discipline'], ['discSettings', 'تنظیمات انضباطی', 'guid.discipline'], ['spaces', 'برنامهٔ فضاها'], ['bells', 'زنگ مدرسه']] },
    { id: 'marks', label: 'آموزش', icon: 'book', tone: 'blue', desc: 'نمره‌ها، کارنامه‌ها، برنامهٔ مطالعه و تقویم تکالیف، کلاس‌های هر درس',
      pages: [['marks', 'ثبت نمرات', 'acad.grades'], ['mdash', 'داشبورد نمرات', 'acad.grades'], ['cards', 'کارنامه‌ها', 'acad.reportcard'], ['splan', 'ثبت مطالعه', 'acad.study'], ['online', 'کلاس‌ها', 'acad.lms'], ['teval', 'آینهٔ تدریس معلمان پایه', 'qual.teacher'], ['game', 'دهکده دانش']] },
  ] },
  deputy: { name: 'معاون آموزشی', short: 'معاون آموزشی', home: 'cardDefs', noHome: true, hubs: [
    { id: 'cards', label: 'کارنامه', icon: 'check', tone: 'violet', desc: 'تعریف کارنامه، ضریب‌های هر درس و دیدن کارنامه‌ها',
      pages: [['cardDefs', 'تعریف کارنامه و ضریب‌ها', 'acad.reportcard'], ['cards', 'کارنامه‌ها', 'acad.reportcard']] },
    { id: 'marks', label: 'نمرات', icon: 'book', tone: 'blue', desc: 'نمره‌های همهٔ درس‌ها و کلاس‌ها',
      pages: [['marks', 'نمره‌ها', 'acad.grades'], ['mdash', 'داشبورد نمرات', 'acad.grades']] },
    { id: 'admit', label: 'پذیرش', icon: 'building', tone: 'rose', desc: 'کارتابل پذیرش دانش‌آموزان تازه',
      pages: [['enroll', 'پذیرش دانش‌آموز', 'fin.enrollment']] },
    { id: 'plan', label: 'برنامه و حضور', icon: 'calendar', tone: 'teal', desc: 'برنامهٔ هفتگی کلاس‌ها و حضور و غیاب همهٔ پایه‌ها',
      pages: [['timetable', 'برنامهٔ هفتگی', 'acad.timetable'], ['journal', 'حضور و غیاب', 'acad.journal']] },
  ] },
  exec: { name: 'معاون اجرایی', short: 'معاون اجرایی', home: 'foodTrack', noHome: true, hubs: [
    { id: 'food', label: 'خدمات', icon: 'services', tone: 'amber', desc: 'تغذیه (منو و پیگیری سفارش‌ها) و تعاونی (اقلام، موجودی و سفارش‌ها)',
      pages: [['foodTrack', 'پیگیری تغذیه', 'svc.food'], ['foodMenu', 'منوی غذا', 'svc.food'], ['coopAdmin', 'مدیریت تعاون', 'svc.food']] },
    { id: 'admit', label: 'پذیرش', icon: 'building', tone: 'rose', desc: 'کارتابل پذیرش دانش‌آموزان تازه',
      pages: [['enroll', 'پذیرش دانش‌آموز', 'fin.enrollment']] },
    { id: 'att', label: 'نظامت و حضور', icon: 'check', tone: 'blue', desc: 'حضور و غیاب کلاس‌ها، زنگ‌های مدرسه و برنامهٔ فضاها',
      pages: [['journal', 'حضور و غیاب', 'acad.journal'], ['bells', 'زنگ مدرسه'], ['spaces', 'برنامهٔ فضاها']] },
    { id: 'org', label: 'سازمان', icon: 'sitemap', tone: 'slate', desc: 'نمودار سازمانی مدرسه',
      pages: [['orgchart', 'نمودار سازمانی']] },
  ] },
  nazem: { name: 'ناظم', short: 'ناظم', home: 'nzm', noHome: true, hubs: [
    { id: 'today', label: 'نظامت امروز', icon: 'home', tone: 'teal', desc: 'داشبورد امروز: حضور همهٔ کلاس‌ها، غایب‌ها و تأخیرها، موارد انضباطی، فضاها و زنگ‌ها در یک نگاه',
      pages: [['nzm', 'نظامت امروز']] },
    { id: 'att', label: 'حضور و غیاب', icon: 'check', tone: 'blue', desc: 'حضور و غیاب کلاس‌های همهٔ پایه‌ها',
      pages: [['journal', 'حضور و غیاب', 'acad.journal']] },
    { id: 'disc', label: 'انضباطی', icon: 'shield', tone: 'amber', desc: 'ثبت مورد انضباطی و مشاهدهٔ رفتاری در همهٔ پایه‌ها',
      pages: [['discipline', 'موارد انضباطی', 'guid.discipline'], ['obs', 'مشاهدات رفتاری', 'guid.observations']] },
    { id: 'bell', label: 'زنگ و فضاها', icon: 'bell', tone: 'violet', desc: 'زنگ‌های خودکار مدرسه و برنامهٔ حیاط، سالن، نمازخانه و کارگاه',
      pages: [['bells', 'زنگ مدرسه'], ['spaces', 'برنامهٔ فضاها']] },
  ] },
  finance: { name: 'واحد مالی', short: 'مالی', home: 'fees', noHome: true, hubs: [
    { id: 'fees', label: 'پذیرفته‌شدگان', icon: 'id', tone: 'teal', desc: 'هزینه‌های دانش‌آموزان ارجاع‌شده از پذیرش، با اکسل',
      pages: [['fees', 'هزینه‌ها', 'fin.tuition']] },
    { id: 'wallets', label: 'کیف پول', icon: 'wallet', tone: 'blue', desc: 'شارژ کیف پول کارکنان و دانش‌آموزان',
      pages: [['wallets', 'کیف پول‌ها', 'fin.payments']] },
  ] },
  teacher: { name: 'معلم', short: 'معلم', home: 'desk', hubs: [
    { id: 'class', label: 'کلاس و نمره', icon: 'book', tone: 'blue', desc: 'کلاس هر درس (تکلیف، آزمون، فایل، پیوند، سؤال)، نمره و کارنامه، گرفتن حیاط و سالن و دیگر فضاها',
      pages: [['online', 'کلاس‌ها', 'acad.lms'], ['marks', 'ثبت نمره', 'acad.grades'], ['mdash', 'داشبورد نمرات', 'acad.grades'], ['cards', 'کارنامه', 'acad.reportcard'], ['spaces', 'برنامهٔ فضاها'], ['game', 'دهکده دانش']] },
    // Opened from the desk's «کلاس‌های امروز», not from the rail.
    { id: 'att', label: 'حضور و غیاب', icon: 'check', tone: 'blue', rail: false, desc: 'حضور و غیاب کلاس‌های امروز',
      pages: [['journal', 'حضور و غیاب', 'acad.journal']] },
    // Opened from «آینهٔ تدریس من» in the right column of ارتباطات, not from the rail.
    { id: 'growth', label: 'آینهٔ تدریس', icon: 'award', tone: 'teal', rail: false, desc: 'خودارزیابی، بازدیدهای کلاس، نظر بی‌نام دانش‌آموزان و هدف‌های رشد',
      pages: [['mirror', 'آینهٔ تدریس من', 'qual.teacher']] },
    { id: 'exam', label: 'آزمون', icon: 'check', tone: 'violet', desc: 'ساختن آزمون از بانک سؤال',
      pages: [['exams', 'آزمون‌ها و بانک سؤال', 'acad.exams']] },
    { id: 'disc', label: 'انضباطی', icon: 'shield', tone: 'amber', desc: 'ثبت مشاهده و مورد انضباطی',
      pages: [['obs', 'مشاهدات رفتاری', 'guid.observations'], ['discipline', 'موارد انضباطی', 'guid.discipline']] },
    { id: 'profile', label: 'دانش‌آموزان', icon: 'id', tone: 'teal', desc: 'فهرست و پروندهٔ دانش‌آموزان کلاس‌ها',
      pages: [['students', 'دانش‌آموزان', 'core.students']] },
  ] },
  // Students and parents: only their own (their child's) classes, marks, report card, attendance, discipline and notices.
  // Nothing about other students, counselling notes, observations or test results; family.js draws these pages.
  student: { name: 'دانش‌آموز', short: 'دانش‌آموز', home: 'me', noHome: true, family: true, hubs: [
    { id: 'me', label: 'امروز من', icon: 'home', tone: 'teal', desc: 'کلاس‌های امروز، کارهای پیش رو، برنامهٔ مطالعه‌ای که خودم می‌چینم و معلم راهنما تأیید می‌کند، اطلاعیه‌ها و بازی دهکده دانش',
      pages: [['me', 'امروز من'], ['mystudy', 'برنامهٔ مطالعهٔ من', 'acad.study'], ['game', 'دهکده دانش']] },
    { id: 'learn', label: 'کلاس‌ها', icon: 'book', tone: 'blue', desc: 'صفحهٔ هر درس (تکلیف، آزمون، جزوه و لینک کلاس آنلاین) و برنامهٔ هفتگی کلاس',
      pages: [['online', 'کلاس‌ها', 'acad.lms'], ['week', 'برنامهٔ هفتگی', 'acad.timetable']] },
    { id: 'marks', label: 'نمره و کارنامه', icon: 'award', tone: 'violet', desc: 'نمره‌ها و نمودار پیشرفت هر درس، کارنامه‌های منتشرشده و حضور و غیاب',
      pages: [['myMarks', 'نمره‌های من', 'acad.grades'], ['myCard', 'کارنامه', 'acad.reportcard'], ['myAtt', 'حضور و غیاب', 'acad.journal']] },
    { id: 'school', label: 'مدرسه', icon: 'mail', tone: 'amber', desc: 'اطلاعیه‌های مدرسه، امتیاز انضباطی من و نظر بی‌نام دربارهٔ کلاس‌ها',
      pages: [['myNotices', 'اطلاعیه‌ها', 'core.notices'], ['myDisc', 'انضباط من', 'guid.discipline'], ['tsurvey', 'نظر دربارهٔ کلاس‌ها', 'qual.teacher']] },
  ] },
  parent: { name: 'ولی دانش‌آموز', short: 'ولی', home: 'child', noHome: true, family: true, hubs: [
    { id: 'child', label: 'نمای کلی', icon: 'home', tone: 'teal', desc: 'وضعیت امروز فرزندتان: حضور، نمره‌های تازه، کارهای پیش رو، انضباط، جلسه‌ها و پیشرفت در بازی',
      pages: [['child', 'نمای کلی'], ['game', 'دهکده دانش']] },
    { id: 'edu', label: 'آموزش', icon: 'book', tone: 'blue', desc: 'نمره‌ها، کارنامه، حضور و غیاب، تکالیف و برنامهٔ هفتگی فرزندتان',
      pages: [['myMarks', 'نمره‌ها', 'acad.grades'], ['myCard', 'کارنامه', 'acad.reportcard'], ['myAtt', 'حضور و غیاب', 'acad.journal'], ['homework', 'تکالیف و آزمون‌ها', 'acad.lms'], ['week', 'برنامهٔ هفتگی', 'acad.timetable'], ['mystudy', 'برنامهٔ مطالعه', 'acad.study']] },
    { id: 'disc', label: 'انضباط', icon: 'shield', tone: 'amber', desc: 'کارنامهٔ انضباطی فرزندتان و مرحله‌ای که مدرسه بر پایهٔ آیین‌نامه برمی‌دارد',
      pages: [['myDisc', 'کارنامهٔ انضباطی', 'guid.discipline']] },
    { id: 'school', label: 'ارتباط با مدرسه', icon: 'mail', tone: 'rose', desc: 'اطلاعیه‌های مدرسه برای اولیا و جلسه‌هایی که با شما گذاشته شده',
      pages: [['myNotices', 'اطلاعیه‌ها', 'core.notices'], ['meetings', 'جلسه‌ها با مدرسه']] },
  ] },
};
const ROLE_ORDER = ['owner', 'principal', 'deputy', 'exec', 'nazem', 'counselor', 'teacher', 'finance', 'student', 'parent'];

const Shell = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = n => Number(n || 0).toLocaleString('fa-IR');
  const PREF = 'sp-view';
  const pref = () => { try { return { role: 'principal', school: 'mehr8', cGrade: 9, pGrade: 9, ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch (e) { return { role: 'principal', school: 'mehr8', cGrade: 9, pGrade: 9 }; } };
  const setPref = p => { try { localStorage.setItem(PREF, JSON.stringify({ ...pref(), ...p })); } catch (e) { /* storage blocked */ } };
  // The school's logo: a file the school gives (mehr8: assets/logo-mehr8.png). While the file is missing the image
  // hides itself and the fallback (initials) shows.
  const logoSrc = s => s?.logo || (s?.id === 'mehr8' ? 'assets/logo-mehr8.png' : '');
  const logoImg = (s, cls, fallback = '') => logoSrc(s) ? `<img class="${cls}" src="${esc(logoSrc(s))}" alt="آرم ${esc(s.name)}" onerror="this.hidden=true;if(this.nextElementSibling)this.nextElementSibling.hidden=false">${fallback ? `<span hidden>${fallback}</span>` : ''}` : fallback ? `<span>${fallback}</span>` : '';
  // The logo as a faint wallpaper instead of a picture in the top bar. mehr8 has ready-made staggered tiles;
  // another school's logo is tiled as it is. Where it shows (page or top bar) is html[data-wm].
  const WM_AT = 'page';
  function wallpaper(s) {
    const root = document.documentElement, src = logoSrc(s);
    if (!src) { delete root.dataset.wm; return; }
    // Absolute URLs: a url() inside a custom property resolves against the stylesheet that uses it.
    const tile = s.id === 'mehr8' && !s.logo, abs = p => new URL(p, location.href).href;
    root.style.setProperty('--wm', `url("${abs(tile ? 'assets/logo-mehr8-tile.png' : src)}")`);
    root.style.setProperty('--wm-w', `url("${abs(tile ? 'assets/logo-mehr8-tile-white.png' : src)}")`);
    root.style.setProperty('--wm-size', tile ? '200px' : '110px');
    root.dataset.wm = root.dataset.wmTry || WM_AT;
  }
  const hubOf = (role, view) => NAV[role].hubs.find(h => h.pages.some(p => p[0] === view));
  const settingsOf = role => NAV[role]?.hubs.find(h => h.id === 'settings');
  // Where a role/page lives. Owner pages are in panel.html; school pages in school.html.
  const href = (role, view, grade) => role === 'owner' ? `panel.html#/${view}` : `school.html#/${grade ? `g/${grade}/` : ''}${view}`;

  /* ---------------- top bar ---------------- */
  // opts: { role, schoolId, onSchool(id), grade (counsellor), onGrade(g), notices: n, onRole }
  function topbar(opts) {
    const p = pref(), schools = Store.state.schools, school = Store.school(opts.schoolId) || schools[0];
    const grades = SchoolData.gradesOf(school);
    // What the signed-in person may switch between: the owner previews every role, everyone else only their own.
    const me = typeof Auth !== 'undefined' ? Auth.user() : null, owner = !me || me.owner;
    const roles = owner ? ROLE_ORDER : ROLE_ORDER.filter(r => me.roles.includes(r));
    wallpaper(opts.role === 'owner' ? null : school);
    const roleCtl = roles.length > 1
      ? `<label class="tb-select tb-role"><span class="tb-role-l">${owner && opts.role !== 'owner' ? 'پیش‌نمایش' : 'نقش'}</span><select id="tb-role" aria-label="نقش">${roles.map(r => `<option value="${r}" ${opts.role === r ? 'selected' : ''}>${esc(NAV[r].name)}</option>`).join('')}</select></label>`
      : `<span class="tb-role tb-role-one">${esc(NAV[opts.role].name)}</span>`;
    $('#topbar').innerHTML = `
      <a class="tb-brand" href="${href(opts.role, NAV[opts.role].home)}" aria-label="خانه">
        ${opts.role !== 'owner' && logoSrc(school) ? `<span class="tb-logo tb-logo-img" aria-hidden="true">${logoImg(school, '', icon('layers'))}</span>` : `<span class="tb-logo" aria-hidden="true">${icon('layers')}</span>`}<span class="tb-name">${esc(Store.state.productName)}</span></a>
      ${roleCtl}
      ${opts.role === 'counselor' && owner ? `<label class="tb-select"><span class="sr-only">پایه</span><select id="tb-grade">${grades.map(g => `<option value="${g}" ${g === opts.grade ? 'selected' : ''}>پایهٔ ${esc(SchoolData.GRADE_NAME[g])}</option>`).join('')}</select></label>` : ''}
      ${opts.role !== 'owner' && owner ? `<label class="tb-select tb-school"><span class="sr-only">مدرسه</span><select id="tb-school">${schools.map(s => `<option value="${s.id}" ${s.id === school.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
      <div class="tb-dock" role="group" aria-label="ابزارها">
        ${NAV[opts.role].family ? `<a class="tb-icon" href="school.html#/myNotices" aria-label="اطلاعیه‌ها${opts.notices ? `، ${fa(opts.notices)} تازه` : ''}" title="اطلاعیه‌ها">${icon('bell')}${opts.notices ? `<span class="tb-dot">${fa(opts.notices)}</span>` : ''}</a>` : ''}
        ${opts.role !== 'owner' && !NAV[opts.role].family ? `<a class="tb-icon tb-opt" href="school.html#/calendar" aria-label="تقویم مدرسه" title="تقویم مدرسه">${icon('calendar')}</a>
          <a class="tb-icon tb-opt" href="school.html#/services/food" aria-label="خدمات: تغذیه و تعاون" title="خدمات: تغذیه و تعاون">${icon('services')}</a>
          <a class="tb-icon" href="school.html#/inbox" aria-label="اعلان‌ها${opts.notices ? `، ${fa(opts.notices)} تازه` : ''}" title="اعلان‌ها">${icon('bell')}${opts.notices ? `<span class="tb-dot">${fa(opts.notices)}</span>` : ''}</a>
          <a class="tb-icon" href="school.html#/comms/desk" aria-label="ارتباطات: میزکار، گفتگو، کارها، نامه و اطلاعیه" title="نامه‌ها، اطلاعیه‌ها، شورای مدرسه و گفتگو">${icon('mail')}${opts.mail ? `<span class="tb-dot">${fa(opts.mail)}</span>` : ''}</a>` : ''}
        <button class="tb-icon" id="tb-search" aria-label="${NAV[opts.role].family ? 'جست‌وجوی صفحه' : 'جست‌وجوی دانش‌آموز یا صفحه'} (Ctrl+K)" title="جست‌وجو (Ctrl+K)" aria-keyshortcuts="Control+K">${icon('search')}</button>
        <button class="tb-icon tb-map" id="tb-map" aria-expanded="false" aria-controls="sysmap" aria-label="نقشهٔ سامانه" title="نقشهٔ سامانه">${icon('tree')}</button></div>
      <div class="tb-tools">
        ${me ? `<span class="tb-user">${settingsOf(opts.role) ? `<a class="tb-icon" href="${href(opts.role, settingsOf(opts.role).pages[0][0])}" aria-label="${esc(settingsOf(opts.role).label)}" title="${esc(settingsOf(opts.role).label)}">${icon('settings')}</a>` : ''}<button class="tb-icon" id="tb-out" aria-label="خروج از حساب ${esc(me.name)}" title="خروج">${icon('logout')}</button></span>` : ''}
      </div>
      <div class="sysmap" id="sysmap" hidden role="dialog" aria-label="نقشهٔ سامانه">
        ${opts.role !== 'owner' && owner ? `<label class="field sm-school"><span>مدرسه</span><select class="input" id="sm-school">${schools.map(s => `<option value="${s.id}" ${s.id === school.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : ''}
        ${opts.role !== 'owner' && !NAV[opts.role].family ? `<div class="sm-links"><a class="btn sm" href="school.html#/calendar">${icon('calendar')} تقویم مدرسه</a><a class="btn sm" href="school.html#/services/food">${icon('services')} خدمات</a><button type="button" class="btn sm" id="sm-search">${icon('search')} جست‌وجو</button></div>` : ''}
        ${tree(opts.role, school, roles)}</div>`;
    $('#topbar').onclick = e => {
      if (e.target.closest('#tb-map')) { toggleMap(); return; }
      const leaf = e.target.closest('[data-go-role]');
      if (leaf) { e.preventDefault(); go(leaf.dataset.goRole, leaf.dataset.goView, leaf.dataset.goGrade); }
    };
    const out = $('#tb-out'); if (out) out.onclick = () => Auth.logout();
    searchCtx = { role: opts.role, roles, school, grade: opts.grade };
    $('#tb-search').onclick = openSearch;
    const sms = $('#sm-search'); if (sms) sms.onclick = () => { toggleMap(false); openSearch(); };
    const rs = $('#tb-role'); if (rs) rs.onchange = () => {
      const r = rs.value; if (r === opts.role) return;
      if (r === 'owner') { location.href = 'panel.html#/dashboard'; return; }
      setPref({ role: r }); location.href = 'school.html#/desk';
      if (location.pathname.endsWith('school.html')) opts.onRole && opts.onRole(r);
    };
    const gs = $('#tb-grade'); if (gs) gs.onchange = () => opts.onGrade(+gs.value);
    const ss = $('#tb-school'); if (ss) ss.onchange = () => opts.onSchool(ss.value);
    const ss2 = $('#sm-school'); if (ss2) ss2.onchange = () => opts.onSchool(ss2.value);
    const q = $('#sysmap-q');
    if (q) q.oninput = () => filterTree(q.value.trim());
  }
  /* ---------------- global search (Ctrl+K or «/») ---------------- */
  // One box for every student the current role may open and every page of the person's own roles.
  let searchCtx = null;
  const norm = t => String(t || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f]/g, ' ').replace(/\s+/g, ' ').trim();
  function searchItems() {
    const { role, roles, school } = searchCtx, items = [];
    roles.forEach(r => NAV[r].hubs.forEach(h => h.pages.forEach(([v, l]) => items.push({ kind: 'page', label: h.pages.length > 1 ? `${h.label} › ${l}` : l, sub: roles.length > 1 ? NAV[r].name : '', go: () => go(r, v) }))));
    if (role === 'owner' || !location.pathname.endsWith('school.html')) return items;
    const gs = SchoolData.gradesOf(school), p = pref();
    // Where a student opens depends on the role: the file for counsellor/teacher, the grade space for the principal, the marks for the deputy.
    const plan = { principal: gs.map(g => [g, sid => `#/g/${g}/student/${sid}`]), counselor: [[searchCtx.grade || p.cGrade, sid => `#/student/${sid}`]],
      teacher: [[SchoolData.teacherGrade(school), sid => `#/student/${sid}`]], deputy: gs.map(g => [g, sid => `#/mdash/${sid}`, { dGrade: g }]) }[role] || [];
    plan.forEach(([g, to, prefs]) => SchoolData.get(school.id, g).students.forEach(st => items.push({ kind: 'student', label: st.name, sub: `پایهٔ ${SchoolData.GRADE_NAME[g]}`,
      go: () => { if (prefs) setPref(prefs); location.hash = to(st.id); window.dispatchEvent(new Event('shell-pref')); } })));
    return items;
  }
  function openSearch() {
    if (!searchCtx || typeof UI === 'undefined') return;
    const all = searchItems();
    UI.modal(`<h2>جست‌وجو</h2><input class="input" id="gs-q" placeholder="نام دانش‌آموز یا صفحه…" aria-label="نام دانش‌آموز یا صفحه" aria-describedby="gs-hint" autocomplete="off">
      <p class="muted small" id="gs-hint">با کلیدهای بالا و پایین بین نتیجه‌ها بروید و Enter بزنید.</p><div id="gs-res" class="gs-res" aria-live="polite"></div>`, root => {
      const q = root.querySelector('#gs-q'), res = root.querySelector('#gs-res');
      const draw = () => {
        const t = norm(q.value);
        const hits = t ? all.filter(it => norm(it.label).includes(t)) : all.filter(it => it.kind === 'page');
        const st = hits.filter(h => h.kind === 'student').slice(0, 8), pg = hits.filter(h => h.kind === 'page').slice(0, 8), shown = [...st, ...pg];
        res.innerHTML = shown.length ? [[st, 'دانش‌آموزان'], [pg, 'صفحه‌ها']].filter(([l]) => l.length).map(([l, title]) => `<div class="gs-group">${title}</div>${l.map(h => `<button type="button" class="gs-item" data-i="${shown.indexOf(h)}">
            <span>${esc(h.label)}</span><span class="muted small">${esc(h.sub || '')}</span></button>`).join('')}`).join('')
          : `<p class="muted">چیزی با «${esc(q.value)}» پیدا نشد.</p>`;
        res.querySelectorAll('.gs-item').forEach(b => b.onclick = () => { UI.close(true); shown[+b.dataset.i].go(); });
      };
      q.oninput = draw; draw();
      root.addEventListener('keydown', e => {
        if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
        const list = [...res.querySelectorAll('.gs-item')]; if (!list.length) return;
        const i = list.indexOf(document.activeElement);
        if (e.key === 'Enter' && document.activeElement === q) { e.preventDefault(); list[0].click(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); list[Math.min(i + 1, list.length - 1)].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? q.focus() : list[i - 1].focus(); }
      });
    });
  }
  document.addEventListener('keydown', e => {
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
      if (typeof UI !== 'undefined' && UI.isOpen()) return;
      e.preventDefault(); openSearch();
    }
  });
  function go(role, view, grade) {
    toggleMap(false);
    if (role === 'owner') { location.href = href('owner', view); return; }
    setPref({ role: grade ? 'principal' : role });
    const target = href(role, view, grade);
    if (location.pathname.endsWith('school.html')) { location.hash = target.split('#')[1]; window.dispatchEvent(new Event('shell-pref')); }
    else location.href = target;
  }
  function toggleMap(force) {
    const m = $('#sysmap'), b = $('#tb-map'); if (!m) return;
    const open = force ?? m.hidden;
    m.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => $('#sysmap-q')?.focus(), 0);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMap(false); });
  document.addEventListener('click', e => { if (!e.target.closest('#sysmap, #tb-map')) toggleMap(false); });

  // The whole platform as a tree: role -> section -> page. Locked pages are marked.
  function tree(current, school, roles = ROLE_ORDER) {
    const leaf = (role, view, label, mod, grade) => {
      const locked = mod && school && !Store.isOn(school, mod);
      return `<li><a href="${href(role, view, grade)}" data-go-role="${role}" data-go-view="${view}" ${grade ? `data-go-grade="${grade}"` : ''} class="${locked ? 'locked' : ''}">${esc(label)}${locked ? icon('lock', 'icon xs') : ''}</a></li>`;
    };
    const hubs = (role, grade) => NAV[role].hubs.map(h => `<li><details ${role === current ? 'open' : ''}><summary><span class="dot tone-${h.tone}"></span>${esc(h.label)}</summary>
      <ul>${h.pages.map(([v, l, m]) => leaf(role, v, l, m, grade)).join('')}</ul></details></li>`).join('');
    const grades = school ? SchoolData.gradesOf(school) : [];
    return `<div class="sysmap-head"><b>نقشهٔ سامانه</b><span class="muted small">${roles.length > 1 ? 'همهٔ بخش‌ها و صفحه‌های نقش‌های شما' : 'همهٔ بخش‌ها و صفحه‌های شما'}</span>
        <input class="input" id="sysmap-q" placeholder="جست‌وجوی صفحه…" aria-label="جست‌وجو در نقشهٔ سامانه"></div>
      <ul class="tree">${roles.map(r => `<li><details ${r === current ? 'open' : ''}><summary class="tree-role">${esc(NAV[r].name)}</summary><ul>
        ${r === 'owner' || NAV[r].noHome ? '' : `<li><a href="${href(r, 'desk')}" data-go-role="${r}" data-go-view="desk">میز امروز</a></li>`}
        ${hubs(r)}
        ${r === 'principal' && grades.length ? `<li><details><summary><span class="dot tone-teal"></span>پایه‌ها (فضای معلم راهنما)</summary><ul>
          ${grades.map(g => `<li><details><summary>پایهٔ ${esc(SchoolData.GRADE_NAME[g])}</summary><ul>
            ${NAV.counselor.hubs.flatMap(h => h.pages.map(([v, l, m]) => leaf('counselor', v, h.pages.length > 1 ? `${h.label} › ${l}` : l, m, g))).join('')}</ul></details></li>`).join('')}</ul></details></li>` : ''}
      </ul></details></li>`).join('')}</ul>`;
  }
  function filterTree(q) {
    $('#sysmap').querySelectorAll('.tree a').forEach(a => { a.parentElement.hidden = !!q && !a.textContent.includes(q); });
    $('#sysmap').querySelectorAll('.tree details').forEach(d => {
      const any = [...d.querySelectorAll('a')].some(a => !a.parentElement.hidden);
      d.parentElement.hidden = !!q && !any; if (q && any) d.open = true;
    });
  }

  /* ---------------- rail ---------------- */
  // opts: { role, view, homeHref, isHome, locked(mod)->bool, extra: html, hrefOf(view) }
  function rail(opts) {
    const active = hubOf(opts.role, opts.view);
    const badge = n => n ? `<span class="rail-badge">${fa(n)}</span>` : '';
    $('#rail').innerHTML = `<nav aria-label="بخش‌ها">
      ${opts.noHome ? '' : `<a class="rail-item ${opts.isHome ? 'on' : ''}" href="${opts.homeHref}" ${opts.isHome ? 'aria-current="page"' : ''}><span class="rail-tile tone-slate">${icon('home')}</span><span>امروز</span></a>`}
      ${NAV[opts.role].hubs.filter(h => h.rail !== false).map(h => {
        const on = active && active.id === h.id && !opts.isHome;
        const allLocked = h.pages.every(p => p[2] && opts.locked(p[2]));
        return `<a class="rail-item ${on ? 'on' : ''}" href="${opts.hrefOf(h.pages[0][0])}" ${on ? 'aria-current="page"' : ''}>
          <span class="rail-tile tone-${h.tone}">${icon(h.icon)}${allLocked ? `<span class="rail-lock">${icon('lock', 'icon xs')}</span>` : ''}${badge(opts.badges?.[h.id])}</span><span>${esc(h.label)}</span></a>`;
      }).join('')}</nav>${opts.extra || ''}`;
  }

  /* ---------------- section header ---------------- */
  // A section's title, where you are, and its pages as tabs. tools: html on the left (e.g. grade picker).
  function hubHeader({ role, view, crumb, locked, hrefOf, tools = '', title, badges = {} }) {
    const h = hubOf(role, view); if (!h) return '';
    return `<header class="hub tone-${h.tone}">
      <div class="hub-top"><span class="hub-tile">${icon(h.icon)}</span>
        <div class="hub-text"><div class="crumb">${crumb.map(esc).join(' <span aria-hidden="true">›</span> ')}</div>
          <h1 id="title">${esc(title || h.label)}</h1><p>${esc(h.desc)}</p></div>
        <div class="hub-tools">${tools}</div></div>
      ${h.pages.length > 1 ? `<nav class="hub-tabs" aria-label="صفحه‌های ${esc(h.label)}">${h.pages.map(([v, l, m]) =>
        `<a href="${hrefOf(v)}" class="${v === view ? 'on' : ''}" ${v === view ? 'aria-current="page"' : ''}>${esc(l)}${m && locked(m) ? icon('lock', 'icon xs') : ''}${badges[v] ? `<span class="pill">${fa(badges[v])}</span>` : ''}</a>`).join('')}</nav>` : ''}
    </header>`;
  }
  // Simple page header for pages outside a section (home, student file, calendar...).
  const pageHeader = ({ crumb, title, desc = '', tone = 'slate', iconName = 'home', tools = '' }) => `<header class="hub page tone-${tone}">
    <div class="hub-top"><span class="hub-tile">${icon(iconName)}</span><div class="hub-text"><div class="crumb">${crumb.map(esc).join(' <span aria-hidden="true">›</span> ')}</div>
      <h1 id="title">${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ''}</div><div class="hub-tools">${tools}</div></div></header>`;

  function $(s) { return document.querySelector(s); }
  return { topbar, rail, hubHeader, pageHeader, hubOf, pref, setPref, href, icon, logoImg };
})();
