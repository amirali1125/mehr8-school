/* The school's public website (site.html).
   Layout follows what most school sites share: sign-in and enrolment in the header on every screen,
   quick links by audience, about, programmes, a school day, events, news, gallery, FAQ for families, contact.
   Everything the page says lives in SITE below; a value left null shows a dashed «draft» box naming the
   data still needed, as long as SITE.draft is true. Set draft to false to hide those boxes on the real site. */
(() => {
  const SITE = {
    draft: true,
    schoolId: 'mehr8',
    // From mehr8.ir (the complex's site, read 2026-10-27): only the boys' secondary school is used here.
    name: 'متوسطهٔ پسرانهٔ مهر هشتم',
    short: 'مهر هشتم',
    parent: { name: 'مجتمع آموزشی مهر هشتم', url: 'https://www.mehr8.ir' },
    motto: 'یادگیری برای زندگی معنوی',
    kind: 'دبیرستان پسرانه، دورهٔ اول و دوم متوسطه',
    lead: 'از مدارس مجتمع آموزشی مهر هشتم؛ برای رشد هم‌زمان دانش، منش و استعداد، با کلاس‌های حضوری و برخط، مشاورهٔ تحصیلی از پایهٔ هفتم و ارتباط روزانهٔ خانه و مدرسه در سامانهٔ یکپارچه.',
    login: 'login.html?school=mehr8&from=site',
    lms: 'https://lms.mehr8.ir',
    stages: [
      { name: 'دورهٔ اول متوسطه', grades: ['هفتم', 'هشتم', 'نهم'], text: 'پایه‌گذاری عادت‌های یادگیری، کشف علاقه‌ها و آزمون‌های استعدادیابی در پایهٔ نهم برای انتخاب رشته.' },
      { name: 'دورهٔ دوم متوسطه', grades: ['دهم', 'یازدهم', 'دوازدهم'], fields: ['ریاضی و فیزیک', 'علوم انسانی'], text: 'برنامه‌ریزی درسی و آمادگی کنکور، کلاس‌های تقویتی و همراهی مشاور در هر پایه.' },
    ],
    // From the school's bell profiles (js/nazem.js) and the 1405 timetables.
    day: {
      first: [['۰۷:۴۵ – ۰۸:۳۰', 'زنگ اول'], ['۰۸:۴۵ – ۰۹:۳۰', 'زنگ دوم'], ['۰۹:۴۵ – ۱۰:۳۰', 'زنگ سوم'], ['۱۰:۴۵ – ۱۱:۳۰', 'زنگ چهارم'],
        ['۱۱:۳۰ – ۱۲:۴۰', 'نماز، ناهار و بازی', 1], ['۱۲:۴۵ – ۱۳:۳۰', 'زنگ پنجم'], ['۱۳:۴۵ – ۱۴:۳۰', 'زنگ ششم'], ['۱۴:۴۵ – ۱۵:۳۰', 'زنگ هفتم']],
      second: [['۰۷:۳۰ – ۰۸:۲۵', 'زنگ اول'], ['۰۸:۴۵ – ۰۹:۴۵', 'زنگ دوم'], ['۱۰:۰۰ – ۱۱:۰۰', 'زنگ سوم'], ['۱۱:۱۵ – ۱۲:۱۵', 'زنگ چهارم'],
        ['۱۲:۱۵ – ۱۳:۲۰', 'نماز و ناهار', 1], ['۱۳:۲۵ – ۱۴:۲۰', 'زنگ پنجم'], ['۱۴:۳۵ – ۱۵:۳۰', 'زنگ ششم']],
    },
    features: [
      ['compass', 'مشاوره و هدایت تحصیلی', 'هر پایه معلم راهنمای خود را دارد؛ پروندهٔ رشد، جلسه‌های مشاوره و پیگیری با خانواده.'],
      ['spark', 'استعدادیابی', 'آزمون‌های شخصیت، علاقهٔ شغلی و هوش‌های چندگانه برای انتخاب آگاهانهٔ رشته.'],
      ['screen', 'کلاس برخط', 'محتوای درس، تکلیف و آزمون هر کلاس در سامانهٔ آموزش مجازی، در دسترس در خانه.'],
      ['users', 'خانه و مدرسه', 'اولیا نمره، حضور، کارنامه و اطلاعیه‌ها را در سامانه می‌بینند و با مدرسه قرار ملاقات می‌گذارند.'],
      ['gamepad', 'دهکده دانش', 'بازی آموزشی مدرسه برای دورهٔ اول که یادگیری را با رقابت سالم همراه می‌کند.'],
      ['shield', 'انضباط شفاف', 'آیین‌نامهٔ روشن، کارنامهٔ انضباطی و گفت‌وگو با خانواده پیش از هر تصمیم.'],
    ],
    // Fill these from the school; null keeps a draft box.
    stats: null,        // e.g. [['۳۵۰', 'دانش‌آموز'], ['۴۵', 'دبیر'], ['۱۳۸۵', 'سال تأسیس']]
    about: 'باور ما این است که هر دانش‌آموز استعدادهایی ویژهٔ خودش دارد که باید کشف، تقویت و حمایت شود. می‌خواهیم نسلی متفکر، مسئولیت‌پذیر و خلاق تربیت کنیم؛ با تعادل میان آموزش علمی، مهارت‌های عملی و ارزش‌های اخلاقی، در محیطی امن و دوستانه و در کنار خانواده‌ها.',
    principal: { name: 'آقای وحید کبریایی', role: 'مدیر متوسطهٔ پسرانه',
      text: 'کارشناسی ارشد روان‌شناسی تربیتی؛ با سابقهٔ دبیری، مشاوره، معاونت و مدیریت در مدارس و معاونت آموزشی اتحادیهٔ انجمن‌های دانش‌آموزی.', msg: null },
    // From the complex's executive calendar for Aban 1405 (تقویم اجرایی): only the secondary school's
    // public events; primary-school items and staff-only ones (council meetings, payroll) are left out.
    // m/d (and «to» for a trip of several days) in the Jalali calendar; past events hide themselves.
    events: [
      { m: 8, d: 7, wd: 'پنجشنبه', t: 'آغاز فعالیت‌های فوق‌برنامه', time: '۸:۰۰ تا ۱۲:۰۰', note: 'کلاس قرآن، کلاس جبرانی زبان، فوتبال، رزمی و…' },
      { m: 8, d: 5, to: 8, wd: 'سه‌شنبه تا جمعه', t: 'اردوی کرمان', who: 'پایهٔ یازدهم' },
      { m: 8, d: 9, wd: 'شنبه', t: 'آغاز ملاقات‌های فردی معلم راهنما با والدین', who: 'همهٔ پایه‌ها' },
      { m: 8, d: 10, wd: 'یکشنبه', t: 'افتتاحیهٔ جشنوارهٔ پژوهش‌های دانش‌آموزی', time: '۸:۰۰ تا ۱۲:۰۰', who: 'دورهٔ اول' },
      { m: 8, d: 12, wd: 'سه‌شنبه', t: 'برنامهٔ روز دانش‌آموز', time: '۸:۰۰ تا ۱۲:۰۰', note: 'دورهٔ اول اردو بیرون از مدرسه، دورهٔ دوم برنامه در مدرسه' },
      { m: 8, d: 13, wd: 'چهارشنبه', t: 'جشن روز دانش‌آموز و اختتامیهٔ المپیاد ورزشی', time: '۸:۰۰ تا ۱۳:۰۰', note: 'دورهٔ دوم در مجموعهٔ ورزشی بیرون از مدرسه؛ همراه با شرکت در راه‌پیمایی ۱۳ آبان' },
      { m: 8, d: 15, wd: 'جمعه', t: 'آزمون جامع مرحلهٔ ۱', time: '۸:۰۰ تا ۱۲:۰۰', who: 'دورهٔ دوم', kind: 'exam' },
      { m: 8, d: 20, wd: 'چهارشنبه', t: 'مراسم شهادت حضرت زهرا (س)', time: '۱۲:۰۰ تا ۱۴:۰۰', note: 'از ۸:۰۰ برنامهٔ مناسبتی در کلاس‌ها' },
      { m: 8, d: 21, wd: 'پنجشنبه', t: 'هیئت دانش‌آموزی در امامزاده صالح', time: '۱۲:۰۰ تا ۱۴:۰۰', note: 'به مناسبت شهادت حضرت زهرا (س)' },
      { m: 8, d: 22, wd: 'جمعه', t: 'شهادت حضرت فاطمه زهرا (س)', kind: 'off' },
      { m: 8, d: 24, wd: 'یکشنبه', t: 'روز کتاب و کتاب‌خوانی' },
      { m: 8, d: 26, to: 29, wd: 'سه‌شنبه تا جمعه', t: 'اردوی یزد', who: 'پایهٔ دهم' },
      { m: 8, d: 29, wd: 'جمعه', t: 'آزمون جامع قلم‌چی', time: '۸:۰۰ تا ۱۲:۰۰', who: 'پایهٔ دوازدهم', kind: 'exam' },
      { m: 8, d: 30, wd: 'شنبه', t: 'اردوی تفریحی', time: '۸:۰۰ تا ۱۲:۰۰', who: 'پایهٔ دوازدهم' },
      { m: 8, d: 30, wd: 'شنبه', t: 'جلسهٔ اولیا و مربیان', time: '۱۶:۰۰ تا ۱۸:۰۰', who: 'پایهٔ نهم', kind: 'meet' },
    ],
    eventsYear: 1405,
    eventsShow: 6,      // the rest open under «همهٔ رویدادهای ماه»
    news: [             // titles and dates from mehr8.ir; each links to the full story there
      { date: '۵ مهر ۱۴۰۵', title: 'بازدید معلمان عراقی از مهر هشتم', text: 'هیئتی از معلمان و فعالان تربیتی عراق با فضاها و برنامه‌های مجتمع آشنا شدند و راه‌های تبادل تجربه بررسی شد.', img: 'assets/site/n-iraq.jpg', url: 'https://mehr8.ir/%d8%a8%d8%a7%d8%b2%d8%af%db%8c%d8%af-%d9%85%d8%b9%d9%84%d9%85%db%8c%d9%86-%d8%b9%d8%b1%d8%a7%d9%82-%d8%a7%d8%b2-%d9%85%d8%af%d8%a7%d8%b1%d8%b3-%d9%85%d9%87%d8%b1%d9%87%d8%b4%d8%aa%d9%85/' },
      { date: '۴ مهر ۱۴۰۵', title: 'به یاد میناب', text: 'کلاس‌های پایهٔ هفتم امسال به یاد دانش‌آموزان مینابی نام‌گذاری شد.', img: 'assets/site/n-minab.jpg', imgPos: 'top', url: 'https://mehr8.ir/%d8%a8%d9%87-%db%8c%d8%a7%d8%af-%d9%85%db%8c%d9%86%d8%a7%d8%a8/' },
      { date: '۴ مهر ۱۴۰۵', title: 'آغاز یک سال تازه', text: 'دانش‌آموزان و معلمان مدارس مهر هشتم سال تحصیلی ۱۴۰۵–۱۴۰۶ را آغاز کردند.', img: 'assets/site/n-year.jpg', url: 'https://mehr8.ir/%d8%a2%d8%ba%d8%a7%d8%b2-%db%8c%da%a9-%d8%b3%d8%a7%d9%84-%d8%aa%d8%a7%d8%b2%d9%87/' },
    ],
    newsMore: 'https://www.mehr8.ir/%d8%ae%d8%a7%d9%86%d9%87/blog/',
    // Photos of the boys' secondary school from mehr8.ir (its gallery and the Mehr 1405 posts), used with
    // the families' consent. Each has a small «-s» copy for the grid; the full size opens on tap.
    hero: { src: 'assets/site/hero.jpg', alt: 'دانش‌آموزان مهر هشتم در اردوی طبیعت‌گردی' },
    gallery: [
      ['g01', 'دانش‌آموزان پشت پنجرهٔ کلاس'], ['g02', 'کلاس درس'], ['g03', 'کارگاه فنی و ابزار'], ['g04', 'کارگاه رایانه'],
      ['g05', 'کلاس هنر و نقاشی'], ['g06', 'برنامهٔ پیشاهنگی'], ['g07', 'اردوی زیارتی'], ['g08', 'کلاس درس'],
      ['g10', 'گفت‌وگو در حیاط مدرسه'], ['g12', 'مراسم آغاز سال تحصیلی'],
    ],
    contact: { address: 'تهران، سعادت‌آباد، انتهای بلوار سعادت‌آباد، کنارگذر یادگار امام (خیابان اوین)، خیابان بهزاد، بن‌بست حلاجیان، پلاک ۷',
      phone: '۰۲۱-۲۲۳۵۰۳۷۸', tel: '+982122350378', email: 'info@mehr8.ir', hours: 'شنبه تا چهارشنبه، ۷:۳۰ تا ۱۵:۳۰', map: null,
      // Neshan map (neshan.org): the web key is meant for pages; limit it to the school's domain in the Neshan panel.
      geo: { lat: 35.7893, lng: 51.3762, label: 'متوسطهٔ پسرانهٔ مهر هشتم', key: 'web.9e67456c5a954dfebbfa48d07b72a1a2' },
      social: [['بله (مدرسه)', 'https://ble.ir/mehr8hsb'], ['اینستاگرام (مدرسه)', 'https://www.instagram.com/mehr8sch'], ['ایتا', 'https://eitaa.com/s/mehr8ir'], ['تلگرام', 'https://t.me/Mehr8ir'], ['آپارات', 'https://www.aparat.com/mehr8ir']] },
    faq: [
      ['ثبت‌نام دانش‌آموز جدید چطور انجام می‌شود؟', 'فرم ثبت‌نام را برخط پر کنید؛ پس از بررسی، برای مصاحبه و تکمیل پرونده با شما تماس می‌گیریم.'],
      ['اولیا چطور نمره و حضور فرزندشان را ببینند؟', 'با حساب «ولی دانش‌آموز» وارد سامانه شوید. نام کاربری و رمز را مدرسه در آغاز سال به شما می‌دهد.'],
      ['ساعت کلاس‌ها چیست؟', 'دورهٔ اول از ۷:۴۵ و دورهٔ دوم از ۷:۳۰ آغاز می‌شود و هر دو تا ۱۵:۳۰ ادامه دارد؛ جزئیات در بخش «یک روز در مدرسه» آمده است.'],
      ['رمز ورودم را فراموش کرده‌ام.', 'به دفتر مدرسه یا معلم راهنمای پایه خبر دهید تا رمز تازه برایتان بسازند.'],
    ],
  };

  const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.4 3-5.5 6-5.5s5.5 2.1 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6.2 4.4 2 5 5"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    hand: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7-2.6 0-4-1.3-5.6-3.6L3.7 13.8a1.5 1.5 0 0 1 2.4-1.8L8 14"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    gamepad: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="13.5" r=".8" fill="currentColor"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    prev: '<path d="M15 6l-6 6 6 6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  };
  const icon = n => `<svg class="icon" viewBox="0 0 24 24" ${P} aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const draft = need => SITE.draft ? `<div class="card ph"><p>این بخش هنوز داده ندارد.</p><span class="need">داده لازم: ${esc(need)}</span></div>` : '';

  const STAFF = window.SITE_STAFF;
  const NAV = [['about', 'درباره ما'], ['stages', 'دوره‌ها'], ['staff', 'کادر آموزشی'], ['life', 'زندگی در مدرسه'], ['news', 'اخبار و رویدادها'], ['contact', 'تماس']];
  // The three things a visitor does here, as buttons that open their own page. On phones only sign-in
  // stays in the bar; the other two move into the menu.
  const ACTS = [['apply.html', 'brief', 'همکاری با ما', 'ghost'], ['enroll.html', 'pen', 'ثبت‌نام دانش‌آموز', 'gold'], [SITE.login, 'login', 'ورود به سامانه', 'primary']];
  document.getElementById('top').innerHTML = `<div class="wrap">
      <a class="st-brand" href="#top-of-page" aria-label="${esc(SITE.name)}، بالای صفحه"><img src="assets/logo-mehr8.png" alt=""></a>
      <nav class="st-nav" id="st-nav" aria-label="بخش‌های سایت"><ul>${NAV.map(([id, l]) => `<li><a href="#${id}">${l}</a></li>`).join('')}
        ${ACTS.slice(0, 2).map(([href, ic, l]) => `<li class="m-only"><a href="${href}">${icon(ic)}${l}</a></li>`).join('')}</ul></nav>
      <div class="st-act">${ACTS.map(([href, ic, l, tone]) => `<a class="btn ${tone} ${tone === 'primary' ? 'st-login' : 'alt'}" href="${href}" aria-label="${l}">${icon(ic)}<span>${l}</span></a>`).join('')}</div>
      <button class="st-menu" type="button" aria-expanded="false" aria-controls="st-nav" aria-label="فهرست بخش‌ها">${icon('menu')}</button>
    </div>
    <div class="st-progress" aria-hidden="true"><i></i></div>`;

  // Upcoming events: today's Jalali date decides what is still ahead (a trip stays until its last day).
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const today = (() => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, +x.value || x.value]));
    return parseInt(p.year) * 10000 + p.month * 100 + p.day; })();
  const KIND = { exam: ['آزمون', 'gold'], off: ['تعطیل', 'off'], meet: ['جلسهٔ اولیا', 'teal'] };
  function eventsList() {
    const key = (e, d) => SITE.eventsYear * 10000 + e.m * 100 + d;
    const list = SITE.events.filter(e => key(e, e.to || e.d) >= today).sort((a, b) => key(a, a.d) - key(b, b.d));
    if (!list.length) return '<div class="card"><p>رویداد پیش‌رویی ثبت نشده است.</p></div>';
    const item = e => { const [kl, kt] = KIND[e.kind] || [];
      const now = key(e, e.d) <= today;
      return `<li class="ev ${e.kind === 'off' ? 'off' : ''}">
        <div class="ev-date" aria-hidden="true"><b>${fa(e.d)}${e.to ? `<small>تا ${fa(e.to)}</small>` : ''}</b><span>${MONTHS[e.m - 1]}</span></div>
        <div class="ev-body"><h4>${esc(e.t)}</h4>
          <p class="ev-meta"><span class="vh">${fa(e.d)}${e.to ? ' تا ' + fa(e.to) : ''} ${MONTHS[e.m - 1]}، </span>${esc(e.wd)}${e.time ? `، ساعت ${esc(e.time)}` : ''}</p>
          ${e.note ? `<p class="ev-note">${esc(e.note)}</p>` : ''}
          <div class="ev-tags">${now ? '<span class="chip live">در جریان</span>' : ''}${kl ? `<span class="chip ${kt}">${kl}</span>` : ''}${e.who ? `<span class="chip">${esc(e.who)}</span>` : ''}</div></div></li>`; };
    const n = SITE.eventsShow;
    return `<ol class="evs">${list.slice(0, n).map(item).join('')}</ol>${list.length > n ? `<details class="ev-more"><summary>همهٔ رویدادهای ماه (${fa(list.length - n)} رویداد دیگر)</summary><ol class="evs">${list.slice(n).map(item).join('')}</ol></details>` : ''}`;
  }
  const dayList = rows => `<ol class="day">${rows.map(([t, l, brk]) => `<li class="${brk ? 'brk' : ''}"><time>${t}</time><span>${esc(l)}</span></li>`).join('')}</ol>`;
  const c = SITE.contact;
  const contactRow = (ic, label, val, need) => `<div><dt>${icon(ic)}${label}</dt><dd>${val ? esc(val) : (SITE.draft ? `<span class="need" style="color:var(--gold);font-weight:700">داده لازم: ${esc(need)}</span>` : '—')}</dd></div>`;

  document.getElementById('main').innerHTML = `
    <section class="hero" id="top-of-page" aria-labelledby="h-title"><div class="wrap">
      <div>
        <h1 id="h-title">${esc(SITE.name)}</h1>
        <p class="motto">${esc(SITE.motto)}</p>
        <p class="lead">${esc(SITE.kind)}. ${esc(SITE.lead)}</p>
      </div>
      ${SITE.hero ? `<figure class="hero-photo"><img src="${SITE.hero.src}" alt="${esc(SITE.hero.alt)}" width="800" height="600" fetchpriority="high"></figure>` : '<div class="hero-art"><img src="assets/logo-mehr8.png" alt="نشان مجتمع آموزشی مهر هشتم"></div>'}
    </div></section>


    <section class="sec" id="about" aria-labelledby="t-about"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">درباره ما</span><h2 id="t-about">${esc(SITE.motto)}</h2>
        <p>${SITE.about ? esc(SITE.about) : 'در مهر هشتم درس، تربیت و مشاوره کنار هم پیش می‌روند تا هر دانش‌آموز راه خودش را بشناسد.'}</p></div></div>
      ${SITE.stats ? `<div class="grid g4" style="margin-bottom:16px">${SITE.stats.map(([n, l]) => `<div class="card"><b style="font-size:30px;color:var(--teal-d)">${esc(n)}</b><p>${esc(l)}</p></div>`).join('')}</div>` : draft('آمار مدرسه: تعداد دانش‌آموز، دبیر، سال تأسیس، افتخارات')}
      <div class="grid g2" style="margin-top:16px">
        ${SITE.principal ? `<div class="card"><h3>${icon('users')}${esc(SITE.principal.role)}: ${esc(SITE.principal.name)}</h3><p>${esc(SITE.principal.text)}</p></div>` : ''}
        ${SITE.principal?.msg ? `<div class="card"><h3>سخن مدیر</h3><p>${esc(SITE.principal.msg)}</p></div>` : draft('پیام کوتاه مدیر به خانواده‌ها و عکس ایشان')}
      </div>
    </div></section>

    <section class="sec alt" id="stages" aria-labelledby="t-stages"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">دوره‌ها و پایه‌ها</span><h2 id="t-stages">${esc(SITE.kind)}</h2></div></div>
      <div class="grid g2">${SITE.stages.map(s => `<div class="card stage"><h3>${icon('cap')}${esc(s.name)}</h3>
        <div class="chips">${s.grades.map(g => `<span class="chip">پایهٔ ${esc(g)}</span>`).join('')}${(s.fields || []).map(f => `<span class="chip gold">${esc(f)}</span>`).join('')}</div>
        <p>${esc(s.text)}</p></div>`).join('')}</div>
    </div></section>

    ${STAFF ? `<section class="sec staff" id="staff" aria-labelledby="t-staff"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">کادر آموزشی</span><h2 id="t-staff">معلمان و دبیران ما</h2>
        <p>رزومهٔ مدیران، معلمان راهنما و دبیران متوسطهٔ پسرانه در سال تحصیلی ۱۴۰۵–۱۴۰۶. برای دیدن رزومهٔ کامل روی هر نفر بزنید.</p></div></div>
      <div class="staff-f" role="group" aria-label="نمایش دبیران بر اساس پایه">${[...STAFF.groups, ['all', 'همه']].map(([g, l]) => `<button type="button" class="fchip" data-g="${g}" aria-pressed="false">${esc(l)}</button>`).join('')}
        <span class="muted" id="staff-count" role="status"></span></div>
      <ul class="staff-list" id="staff-list"></ul>
    </div></section>` : ''}

    <section class="sec alt" id="life" aria-labelledby="t-life"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">زندگی در مدرسه</span><h2 id="t-life">آنچه مهر هشتم را متفاوت می‌کند</h2></div></div>
      <div class="grid g3">${SITE.features.map(([ic, t, d]) => `<div class="card feat"><span class="tile">${icon(ic)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
      <h3 style="margin:40px 0 14px;font-size:22px">یک روز در مدرسه</h3>
      <div class="grid g2">
        <div class="card"><h3>${icon('clock')}دورهٔ اول (هفتم تا نهم)</h3>${dayList(SITE.day.first)}</div>
        <div class="card"><h3>${icon('clock')}دورهٔ دوم (دهم تا دوازدهم)</h3>${dayList(SITE.day.second)}</div>
      </div>
    </div></section>

    <section class="sec news" id="news" aria-labelledby="t-news"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">اخبار و رویدادها</span><h2 id="t-news">تازه‌های مدرسه</h2></div></div>
      <h3 style="font-size:19px">${icon('cal')} رویدادهای پیش‌رو</h3>
      ${SITE.events ? eventsList() : draft('تقویم رویدادهای سال: جلسهٔ اولیا، امتحانات، اردوها، جشن‌ها (تاریخ، عنوان، مکان)')}
      <h3 style="font-size:19px;margin-top:28px">خبرها</h3>
      ${SITE.news ? `<div class="grid g3">${SITE.news.map(n => `<article class="card">${n.img ? `<img class="news-img" src="${esc(n.img)}" alt="" loading="lazy" style="object-position:${n.imgPos || 'center'}">` : ''}<span class="date">${esc(n.date)}</span><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p>${n.url ? `<a class="more" href="${esc(n.url)}" target="_blank" rel="noopener">ادامهٔ خبر<span class="vh">: ${esc(n.title)}</span></a>` : ''}</article>`).join('')}</div>${SITE.newsMore ? `<p style="margin-top:14px"><a class="more" href="${esc(SITE.newsMore)}" target="_blank" rel="noopener">همهٔ خبرهای مجتمع</a></p>` : ''}` : draft('سه تا شش خبر اخیر مدرسه با تاریخ، متن کوتاه و یک عکس')}
      <h3 style="font-size:19px;margin-top:28px">${icon('img')} نگارخانه</h3>
      ${SITE.gallery ? `<ul class="gal-grid">${SITE.gallery.map(([f, cap], i) => `<li><button type="button" class="gal-item" data-i="${i}" aria-label="بزرگ‌کردن عکس: ${esc(cap)}"><img src="assets/site/${f}-s.jpg" alt="${esc(cap)}" loading="lazy" width="640" height="427"></button></li>`).join('')}</ul>` : (SITE.draft ? `<div class="grid g4">${[1, 2, 3, 4].map(() => `<div class="card ph gal">عکس فضای مدرسه</div>`).join('')}</div>${draft('۸ تا ۱۲ عکس از ساختمان، کلاس‌ها، آزمایشگاه و برنامه‌ها، بدون چهرهٔ دانش‌آموزان یا با رضایت اولیا')}` : '')}
    </div></section>

    <section class="sec alt" id="admission" aria-labelledby="t-adm"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">ثبت‌نام</span><h2 id="t-adm">پیوستن به مهر هشتم</h2><p>سه گام: فرم برخط، مصاحبه با خانواده و دانش‌آموز، تکمیل پرونده.</p></div></div>
      <div class="grid g3">
        <div class="card feat"><span class="tile gold">${icon('pen')}</span><h3>۱. فرم برخط</h3><p>مشخصات دانش‌آموز و خانواده را در فرم ثبت‌نام وارد کنید.</p></div>
        <div class="card feat"><span class="tile gold">${icon('users')}</span><h3>۲. مصاحبه</h3><p>برای آشنایی و گفت‌وگو با شما تماس می‌گیریم.</p></div>
        <div class="card feat"><span class="tile gold">${icon('shield')}</span><h3>۳. تکمیل پرونده</h3><p>مدارک را تحویل دهید و حساب سامانهٔ خود را بگیرید.</p></div>
      </div>
      <div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px"><a class="btn gold" href="enroll.html">${icon('pen')}شروع ثبت‌نام</a><a class="btn ghost" href="apply.html">${icon('brief')}درخواست همکاری</a></div>
    </div></section>

    <section class="sec faq" aria-labelledby="t-faq"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">پرسش‌های خانواده‌ها</span><h2 id="t-faq">پرسش‌های پرتکرار</h2></div></div>
      ${SITE.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
    </div></section>

    <section class="sec alt contact" id="contact" aria-labelledby="t-contact"><div class="wrap">
      <div class="sec-head"><div><span class="kicker">تماس</span><h2 id="t-contact">با ما در ارتباط باشید</h2></div></div>
      <div class="grid g2">
        <div class="card"><dl>
          ${contactRow('pin', 'نشانی', c.address, 'نشانی کامل مدرسه')}
          ${c.phone ? `<div><dt>${icon('phone')}تلفن</dt><dd><a href="tel:${c.tel}" dir="ltr">${esc(c.phone)}</a></dd></div>` : contactRow('phone', 'تلفن', null, 'شمارهٔ دفتر مدرسه')}
          ${c.email ? `<div><dt>${icon('mail')}رایانامه</dt><dd><a href="mailto:${esc(c.email)}" dir="ltr">${esc(c.email)}</a></dd></div>` : contactRow('mail', 'رایانامه', null, 'نشانی ایمیل')}
          ${contactRow('clock', 'ساعت پاسخ‌گویی', c.hours, 'ساعت کاری دفتر')}
        </dl>${c.social ? `<div class="social">${c.social.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div>` : ''}</div>
        ${c.geo ? `<div class="card map nmap"><div id="nmap" role="region" aria-label="نقشهٔ مدرسه: ${esc(c.geo.label)}"><p class="muted">نقشه در حال بارگذاری…</p></div>
          <div class="nmap-go">
            <a class="btn alt" href="https://balad.ir/location?latitude=${c.geo.lat.toFixed(6)}&longitude=${c.geo.lng.toFixed(6)}&zoom=17" target="_blank" rel="noopener">${icon('pin')}مسیر در بلد</a>
            <a class="btn alt" href="https://neshan.org/maps/routing/car/destination/${c.geo.lat.toFixed(6)},${c.geo.lng.toFixed(6)}" target="_blank" rel="noopener">${icon('pin')}مسیریابی با نشان</a>
          </div></div>`
        : c.map ? `<iframe class="card map" src="${esc(c.map)}" title="نقشهٔ مدرسه" loading="lazy" style="padding:0;width:100%;border:0"></iframe>` : (SITE.draft ? `<div class="card ph map"><p>نقشهٔ مدرسه<br><span class="need">داده لازم: پیوند نقشه (نشان یا بلد)</span></p></div>` : '')}
      </div>
      <div class="band" style="margin-top:32px"><div><h2>سامانهٔ یکپارچهٔ مدرسه</h2><p>دانش‌آموزان، اولیا و همکاران با حساب خود وارد شوند.</p></div>
        <a class="btn gold" href="${SITE.login}">${icon('login')}ورود به سامانه</a></div>
    </div></section>`;

  const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date());
  document.getElementById('foot').innerHTML = `<div class="wrap"><div class="cols">
      <div><div class="brand"><img src="assets/logo-mehr8.png" alt=""><b style="color:#fff">${esc(SITE.name)}</b></div><p>${esc(SITE.motto)}</p><p>از مدارس <a href="${SITE.parent.url}" target="_blank" rel="noopener">${esc(SITE.parent.name)}</a></p></div>
      <nav aria-label="پیوندهای سایت"><h2>بخش‌ها</h2><ul>${NAV.map(([id, l]) => `<li><a href="#${id}">${l}</a></li>`).join('')}</ul></nav>
      <nav aria-label="سامانه‌ها"><h2>سامانه‌ها</h2><ul>
        <li><a href="${SITE.login}">ورود به سامانهٔ مدرسه</a></li><li><a href="${SITE.login}&as=student">ورود دانش‌آموز</a></li><li><a href="${SITE.login}&as=parent">ورود اولیا</a></li><li><a href="${SITE.lms}" target="_blank" rel="noopener">کلاس برخط (LMS)</a></li>
        <li><a href="enroll.html">ثبت‌نام دانش‌آموز</a></li><li><a href="apply.html">همکاری با ما</a></li></ul>
        ${c.social ? `<h2 style="margin-top:18px">ما را دنبال کنید</h2><ul>${c.social.map(([l, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul>` : ''}</nav>
    </div><p class="copy">© ${year} ${esc(SITE.name)}. همهٔ حقوق محفوظ است.</p></div>`;

  // Viewer for the gallery photos and the teachers' résumé slides: a native <dialog> with the image, its caption,
  // previous/next (arrow keys too) and close; focus goes back to the button that opened it.
  const viewer = (() => {
    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.innerHTML = `<figure><img alt=""><figcaption></figcaption></figure>
      <button type="button" class="lb-btn lb-close" aria-label="بستن">${icon('close')}</button>
      <button type="button" class="lb-btn lb-prev" aria-label="قبلی">${icon('next')}</button>
      <button type="button" class="lb-btn lb-next" aria-label="بعدی">${icon('prev')}</button>`;
    document.getElementById('foot').appendChild(dlg);
    let items = [], cur = 0, back = null;
    const show = i => { cur = (i + items.length) % items.length; const { src, cap } = items[cur];
      const img = dlg.querySelector('img'); img.src = src; img.alt = cap;
      dlg.querySelector('figcaption').textContent = items.length > 1 ? `${cap} (${fa(cur + 1)} از ${fa(items.length)})` : cap; };
    dlg.querySelector('.lb-close').onclick = () => dlg.close();
    dlg.querySelector('.lb-prev').onclick = () => show(cur - 1);
    dlg.querySelector('.lb-next').onclick = () => show(cur + 1);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur - 1); if (e.key === 'ArrowLeft') show(cur + 1); });
    dlg.addEventListener('close', () => back?.focus());
    return (list, i, label, from) => { items = list; back = from; dlg.setAttribute('aria-label', label);
      dlg.classList.toggle('one', list.length < 2); show(i); dlg.showModal(); };
  })();
  if (SITE.gallery) {
    const photos = SITE.gallery.map(([f, cap]) => ({ src: `assets/site/${f}.jpg`, cap }));
    document.querySelector('.gal-grid').addEventListener('click', e => { const b = e.target.closest('.gal-item'); if (b) viewer(photos, +b.dataset.i, 'نمایش عکس', b); });
  }

  // Teachers: filter by group (management and guidance teachers by default); a card opens the résumé slide,
  // and previous/next walk through the teachers shown.
  if (STAFF) {
    const box = document.getElementById('staff-list');
    let group = 'lead';
    const shown = () => STAFF.people.filter(x => group === 'all' || x.g.includes(group));
    const card = (x, i) => `<li><button type="button" class="tc" data-i="${i}">
        <img src="assets/site/staff/p${String(x.p).padStart(3, '0')}-a.jpg" alt="" loading="lazy" width="80" height="80">
        <span class="tc-b"><b>آقای ${esc(x.n)}</b><span class="tc-r">${esc(x.r)}</span>
          <span class="tc-c">${x.c.map(c => `<span>${esc(c)}</span>`).join('')}</span>
          <span class="tc-more">مشاهدهٔ رزومه</span></span></button></li>`;
    const draw = () => { const list = shown();
      box.innerHTML = list.map(card).join('');
      document.getElementById('staff-count').textContent = `${fa(list.length)} نفر`;
      document.querySelectorAll('.staff-f button').forEach(b => b.setAttribute('aria-pressed', b.dataset.g === group)); };
    document.querySelector('.staff-f').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; group = b.dataset.g; draw(); });
    box.addEventListener('click', e => { const b = e.target.closest('.tc'); if (!b) return;
      const slides = shown().map(x => ({ src: `assets/site/staff/p${String(x.p).padStart(3, '0')}.jpg`, cap: `رزومهٔ آقای ${x.n}، ${x.r}` }));
      viewer(slides, +b.dataset.i, 'رزومهٔ دبیر', b); });
    draw();
  }

  // The school on a Neshan map, loaded when the contact section comes near (its library is large).
  const geo = SITE.contact.geo, mapEl = document.getElementById('nmap');
  if (geo && mapEl) {
    // Neshan's own server is quickest from Iran; the same build on jsDelivr is the fallback.
    const NS = ['https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index', 'https://cdn.jsdelivr.net/npm/@neshan-maps-platform/leaflet@1.0.8/dist/leaflet'];
    const fail = () => { mapEl.innerHTML = `<p>${esc(SITE.contact.address)}</p><p class="muted small">نقشه بارگذاری نشد؛ از دکمهٔ «مسیریابی با نشان» استفاده کنید.</p>`; };
    let wait;
    const draw = () => {
      clearTimeout(wait);
      try {
        mapEl.innerHTML = '';
        const map = new L.Map(mapEl, { key: geo.key, maptype: 'neshan', poi: true, traffic: false, center: [geo.lat, geo.lng], zoom: 16, scrollWheelZoom: false });
        const pin = L.divIcon({ className: 'nmap-pin', html: `<span class="nmap-lbl">${esc(geo.label)}</span><svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true"><path d="M12 31s-11-9.6-11-18a11 11 0 0 1 22 0c0 8.4-11 18-11 18z" fill="#0f766e" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12.5" r="4.2" fill="#fff"/></svg>`, iconSize: [220, 76], iconAnchor: [110, 76] });
        L.marker([geo.lat, geo.lng], { icon: pin, title: geo.label, alt: geo.label }).addTo(map);
      } catch { fail(); }
    };
    const load = (i = 0) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = NS[i] + '.css'; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = NS[i] + '.js'; js.onload = draw; js.onerror = () => { css.remove(); if (NS[i + 1]) load(i + 1); else fail(); }; document.head.appendChild(js);
      if (i) return;
      wait = setTimeout(() => { if (typeof L === 'undefined') fail(); }, 10000);
    };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '400px' }); io.observe(mapEl);
  }

  // Mobile menu: a disclosure button; closes after a link is chosen or on Escape.
  const btn = document.querySelector('.st-menu'), nav = document.getElementById('st-nav');
  const setOpen = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); btn.innerHTML = icon(open ? 'close' : 'menu'); };
  btn.onclick = () => setOpen(!nav.classList.contains('open'));
  nav.onclick = e => { if (e.target.closest('a')) setOpen(false); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); } });

  // Where am I: the nav marks the section in view, a bar under the header fills as the page scrolls,
  // and a «بالای صفحه» button appears once the hero is out of sight.
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const mark = id => links.forEach(a => a.setAttribute('aria-current', a.hash === '#' + id));
  const watch = (el, id) => new IntersectionObserver(([en]) => { if (en.isIntersecting) mark(id); }, { rootMargin: '-40% 0px -55% 0px' }).observe(el);
  NAV.forEach(([id]) => { const el = document.getElementById(id); if (el) watch(el, id); });
  watch(document.getElementById('admission'), '');
  watch(document.getElementById('top-of-page'), '');
  links.forEach(a => a.addEventListener('click', () => mark(a.hash.slice(1))));
  const bar = document.querySelector('.st-progress i');
  const up = document.createElement('a');
  up.className = 'st-up'; up.href = '#top-of-page'; up.innerHTML = `${icon('up')}<span class="vh">بالای صفحه</span>`;
  document.getElementById('foot').appendChild(up);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    up.classList.toggle('show', scrollY > innerHeight * .8);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
