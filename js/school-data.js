// A school's working data, split the way the school is organised:
//   get(school, grade)  one grade (7-12): its classes, students, counselling, discipline, marks, exams...
//   org(school)         school-wide: calendar, notices, teachers, enrolment, the principal's family meetings.
// Prototype only: invented sample students, kept in localStorage. The real backend replaces this file.
const SchoolData = (() => {
  const KEY = 'sp2:';
  const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
  // The school's day (from the weekly timetables, 6 Aban 1405): grades 7-9 have seven 45-minute bells and grades 10-12 six
  // longer ones, each with a midday break (prayer, lunch, play) after bell 4. These match the ناظم's bell lists (js/nazem.js).
  const BELL_SETS = {
    m1: { times: ['07:45', '08:45', '09:45', '10:45', '12:45', '13:45', '14:45'], ends: ['08:30', '09:30', '10:30', '11:30', '13:30', '14:30', '15:30'], brk: { after: 4, from: '11:30', to: '12:40' } },
    m2: { times: ['07:30', '08:45', '10:00', '11:15', '13:25', '14:35'], ends: ['08:25', '09:45', '11:00', '12:15', '14:20', '15:30'], brk: { after: 4, from: '12:15', to: '13:20' } },
  };
  // One grade's bells: n, times, ends, brk and withBreak(cells, gap), which puts the break column in its place.
  // A grade-less caller (the principal's own week) gets the grades 7-9 day.
  const bellsOf = g => { const s = BELL_SETS[+g >= 10 ? 'm2' : 'm1'];
    return { n: s.times.length, times: s.times, ends: s.ends, brk: s.brk, withBreak: (cells, gap) => [...cells.slice(0, s.brk.after), gap, ...cells.slice(s.brk.after)] }; };
  const { n: BELLS, times: BELL_TIMES, ends: BELL_ENDS, brk: BREAK, withBreak } = bellsOf(7);
  const SUBJECTS = ['ریاضی', 'علوم', 'ادبیات فارسی', 'عربی', 'زبان انگلیسی', 'مطالعات اجتماعی', 'قرآن و پیام‌ها', 'تفکر و سبک زندگی', 'ورزش', 'هنر'];
  const GRADE_NAME = { 7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  const FIRST = ['آرین', 'پارسا', 'سپهر', 'امیرحسین', 'محمدرضا', 'علی', 'حسین', 'مهدی', 'رضا', 'سینا', 'کیان', 'آرمان',
    'بردیا', 'یاسین', 'عرفان', 'نیما', 'پوریا', 'امید', 'دانیال', 'متین', 'آرش', 'میلاد', 'رادین', 'هومن'];
  const LAST = ['احمدی', 'رضایی', 'کریمی', 'حسینی', 'موسوی', 'جعفری', 'صادقی', 'نوری', 'رحیمی', 'کاظمی', 'قاسمی', 'مرادی',
    'باقری', 'شریفی', 'یزدانی', 'فرهادی', 'نظری', 'عباسی', 'سلیمانی', 'زارعی', 'طاهری', 'بهرامی', 'اکبری', 'سعیدی'];
  const TEACHER_SUBJECT = 'ریاضی';
  // The real rosters of Mehr-e Hashtom boys' secondary, used with the school's permission: grade 9 from the profile site,
  // grades 7, 8, 10, 11 and 12 from the school's student list (3 Aban 1405) with the family's mobile number for SMS.
  // Names, classes and phones only: no counselling notes, marks or test results are invented for these students.
  const REAL = {
    'mehr8:9': [
      ['نهم الف', [['مهدیار', 'ارسنجانی'], ['محمدهادی', 'اسلامی قرائتی'], ['علیرضا', 'حسابیان'], ['محمدطاها', 'حیدری'], ['علی', 'صالحی وزیری'],
        ['محمدآریان', 'عینی'], ['حسین', 'کاظمی'], ['محمدمهدی', 'متین'], ['صدرا', 'محسن‌زاده'], ['سید محمدطاها', 'مقصود همدان'],
        ['الیاس دانیال', 'مکنتایر'], ['مسیحا', 'میرباقری'], ['سید کیان', 'میرکریمی'], ['هیراد', 'نداف']]],
      ['نهم ب', [['علی', 'باقرزاده'], ['امیرعلی', 'بیرقی'], ['امیرعلی', 'پوران'], ['علی', 'تفضلی بروجردی'], ['محمدحسین', 'جعفری فرانی'],
        ['محمدحسین', 'حاجی ترخانی'], ['امیرصدرا', 'صابری انوار'], ['امیرعلی', 'صالحی'], ['کوروش', 'طباطبایی'], ['امیرحسین', 'کولیوند'],
        ['محمدجواد', 'محمدحسنی'], ['امیرحسین', 'ملامحمد'], ['ارمیا', 'ملائی'], ['امیررضا', 'میرجلیلی'], ['محمدحسین', 'نایبی'], ['علیرضا', 'نخستین تقوی']]],
    ],
    'mehr8:7': [
      ["هفتم الف", [["آرین", "ابراهیم", ""], ["عماد", "انصاری", ""], ["سید مصطفی", "حسینی", ""], ["احسان", "حیدری", ""], ["کارن", "رزمی", ""], ["روزبه", "رفیعی", ""], ["امیر", "زجاجی فر", ""], ["امیرحسین", "سلیمی", ""], ["محمد", "شایان شاکر", ""], ["مهدی", "صفرنژاد", ""], ["سید علی", "مداح", ""], ["سیدمحمد", "مداح", ""], ["سید صدرا", "مدنی", ""], ["محمد", "نوری", ""], ["مرنضی", "نوید کشکی", ""], ["سیدمحمدسجاد", "هادیان", ""], ["سید طاها", "هاشمی", ""], ["علی", "کبیری طامه", ""], ["امیر حسین", "کمالی", ""], ["صدرا", "گل کار", ""], ["طاها", "یمینی", ""]]],
      ["هفتم ب", [["علیرضا", "آل علی", ""], ["سید علیرضا", "آل مناف", ""], ["سید مهدیار", "احمدپناه", ""], ["پارسا", "امانی", ""], ["محمد مبین", "حیدری", ""], ["محمد صدرا", "زکریاپور", ""], ["محمد حسین", "سادات", ""], ["جانیار", "سرمدی", ""], ["محمد صادق", "شاه قلعه", ""], ["محمدایمان", "شیشه بری", ""], ["علی", "صبوری پور", ""], ["محمد حسین", "فرح زادی", ""], ["محمدعلی", "قربانی", ""], ["حسین", "مظاهریان", ""], ["سید امیر رضا", "موسوی نژاد", ""], ["سیدامیر سام", "میرطالب", ""], ["محمد سبحان", "نوروزی", ""], ["علی", "نوریان فرزام", ""], ["علی", "هاشمی", ""], ["محمد مهدی", "کاشف بهر", ""], ["ماهان", "کیهانیان", ""], ["طاها", "یاوری", ""]]],
    ],
    'mehr8:8': [
      ["هشتم الف", [["محمد علی", "تنها", ""], ["محمدطه", "حاجیانی", ""], ["علی", "دهقانی", ""], ["آریا", "سلیمانی", ""], ["محمد", "شایق", ""], ["سجاد", "شعبانی بناء", ""], ["پارسا", "شیعه", ""], ["محمدصادق", "صابری", ""], ["حسام الدین", "صادقی گل", ""], ["علی", "صالحی نجف آبادی", ""], ["حسین", "عبیری", ""], ["سورنا", "قنبری", ""], ["امیرسالار", "نقوی", ""], ["مصطفی", "وصال", ""], ["سید امیرطاها", "کاظمی طبائی", ""], ["محمد مهدی", "کُریوند", ""], ["علی اکبر", "یحیوی تبار", ""], ["سید علی", "یوسفی", ""]]],
      ["هشتم ب", [["محمد محسن", "اسماعیلی دهقی", ""], ["رادین", "باقری", ""], ["امیرمحمد", "بهارلوئی", ""], ["پارسا", "جاوید", ""], ["محمدرضا", "خودسوز", ""], ["سید رادین", "دعایی اسکویی", ""], ["امیر علی", "رئیس زاده", ""], ["کارن", "رفیعی", ""], ["پارسا", "سعادتیان", ""], ["امیرحسین", "شاهزمانی", ""], ["عماالدین", "صالحی یزدی", ""], ["امیر حسین", "صدیق رحیم ابادی", ""], ["علی", "قلندری", ""], ["محمدامین", "محمدزاده", ""], ["امیرسامان", "مسعودی فرد", ""], ["پدارم", "نژاد دهقان", ""], ["امیر حسین", "وصال", ""], ["کارن", "کاظمی", ""], ["پارسا", "یزدانمهر", ""]]],
    ],
    'mehr8:10': [
      ["دهم انسانی", [["امیرعلی", "اسدی", ""], ["علیرضا", "اسماعیلی دهقی", ""], ["محمد صدرا", "خانی", ""], ["امیرصدرا", "درودی", ""], ["امیرعلی", "سخندان", ""], ["امیرحسن", "سلطانی", ""], ["سیدمحمدامین", "علویان", ""], ["علیرضا", "قشقاوی", ""], ["محمد مهدی", "مظاهری", ""], ["محمد ارمیا", "نوروزی", ""]]],
      ["دهم ریاضی", [["ایمان", "اشرفی اصفهانی", ""], ["علی", "اعتمادی", ""], ["محمدرسول", "جماعتی", ""], ["پارسا", "حسن زاده", ""], ["محمدامین", "حمداوی", ""], ["امین محمد", "شاه زیدی", ""], ["سید شایان", "شریفی", ""], ["امیر محمد", "عباسی چقازردی", ""], ["آریا", "غفاری آذر", ""], ["سید امیرمهدی", "فاطمی", ""], ["سید امین", "مرادی محدث", ""], ["سید علی", "نصراللهی", ""], ["محمد پارسا", "یعقوبی فرانی", ""]]],
    ],
    'mehr8:11': [
      ["یازدهم انسانی", [["مهدی", "احمد خانبیگی", ""], ["سید امیر عباس", "افتخاری", ""], ["محمدامین", "حاجیان نصرآبادی", ""], ["محمدیاسین", "سلاسل", ""], ["کسری", "سلطانی", ""], ["محمدصدرا", "شهریار", ""], ["محمدرضا", "قربانی", ""], ["محمدهادی", "منسوبی حسینی", ""], ["محمدفواد", "کابلی", ""]]],
      ["یازدهم ریاضی", [["علی", "ابوالقاسمی دهاقانی", ""], ["حامد", "احمدی", ""], ["امیر عباس", "اریایی", ""], ["محمد علی", "استاد حسین", ""], ["فربد", "اسماعیل زاده", ""], ["امیر مهدی", "جاویدی", ""], ["آیدین", "حسن ساجدی", ""], ["سید محمد امین", "حسینی", ""], ["محمد", "زجاجی فر", ""], ["پویا", "زمردیان", ""], ["محمد حسین", "شکرالهی", ""], ["امیرحسین", "قنادی", ""], ["علی", "مرتضی بیگی", ""], ["مهدیار", "مقدسی", ""], ["علی", "مهدی پور", ""], ["ایلیا", "نصراللهی", ""], ["محمد سبحان", "نوروزی", ""], ["محمد مهدی", "گنجی دوست", ""]]],
    ],
    'mehr8:12': [
      ["دوازدهم انسانی", [["پارسا", "سعدوندی", ""], ["سیدمحمد طه", "شایسته", ""], ["هادی", "عطاری", ""], ["سید مهدی", "هجرتی", ""], ["سجاد", "یوسفی", ""]]],
      ["دوازدهم ریاضی", [["سید امیر علی", "آرامون", ""], ["محمدحسن", "اسلامی قرائتی", ""], ["سیدمحمد", "انجو", ""], ["محمد سبحان", "حسین پور", ""], ["طاها", "سعدوندی", ""], ["امیرصدرا", "غلامی", ""], ["علی", "فلاحی نیا", ""], ["علی", "محمدیاری کلور", ""], ["معراج مهدی", "مکنتایر", ""], ["علی", "نجفی", ""], ["امیرمحمد", "نصری", ""], ["محمدکمیل", "نظری علوم", ""], ["علی", "نوری داریان", ""], ["علی", "پوراحمد", ""], ["محمد حامی", "پیرایش نژاد", ""]]],
    ],
  };

  // Family mobile numbers for grade 9 (school's student list, 3 Aban 1405), added to the roster that was already saved.
  const PHONES = { 'mehr8:9': {"مهدیار ارسنجانی": "", "محمدهادی اسلامی قرائتی": "", "علیرضا حسابیان": "", "محمدطاها حیدری": "", "علی صالحی وزیری": "", "محمدآریان عینی": "", "حسین کاظمی": "", "محمدمهدی متین": "", "صدرا محسن‌زاده": "", "سید محمدطاها مقصود همدان": "", "الیاس دانیال مکنتایر": "", "مسیحا میرباقری": "", "سید کیان میرکریمی": "", "هیراد نداف": "", "علی باقرزاده": "", "امیرعلی بیرقی": "", "امیرعلی پوران": "", "علی تفضلی بروجردی": "", "محمدحسین جعفری فرانی": "", "محمدحسین حاجی ترخانی": "", "امیرصدرا صابری انوار": "", "امیرعلی صالحی": "", "کوروش طباطبایی": "", "امیرحسین کولیوند": "", "محمدجواد محمدحسنی": "", "امیرحسین ملامحمد": "", "ارمیا ملائی": "", "امیررضا میرجلیلی": "", "محمدحسین نایبی": "", "علیرضا نخستین تقوی": ""} };

  function rng(seed) {
    let a = seed;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const iso = d => d.toISOString().slice(0, 10);
  const shift = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const hash = s => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7);

  // Grades a school has; older saved schools did not store them.
  const gradesOf = s => s.grades || (s.id === 'mehr8' ? [7, 8, 9, 10, 11, 12] : [7, 8, 9]);
  // The sample maths teacher teaches grade 9 when the school has it.
  const teacherGrade = s => gradesOf(s).includes(9) ? 9 : gradesOf(s)[0];

  /* ---------------- one grade ---------------- */
  function seedGrade(schoolId, g) {
    return REAL[schoolId + ':' + g] ? realGrade(schoolId, g) : sampleGrade(schoolId, g);
  }
  // A grade with real students: the roster, a sample timetable and class-level material (question bank, exam);
  // every per-student record starts empty.
  function realGrade(schoolId, g) {
    const base = sampleGrade(schoolId, g);
    const classes = [], students = [];
    REAL[schoolId + ':' + g].forEach(([name, list], ci) => {
      const id = 'c' + g + 'abcdefgh'[ci];
      classes.push({ id, name });
      list.forEach(([first, last, phone], i) => students.push({ id: 's' + (students.length + 1), first, last, name: first + ' ' + last, cls: id, row: i + 1, ...(phone ? { phone } : {}) }));
    });
    const timetable = Object.fromEntries(classes.map((c, i) => [c.id, base.timetable[base.classes[i % base.classes.length].id]]));
    return { ...base, real: true, classes, students, timetable,
      sessions: [], follow: [], appts: [], obs: [], grades: [], tests: {}, attendance: {}, discipline: [], term: {}, objections: [], career: {}, study: {},
      assignments: [], exams: base.exams.map(e => ({ ...e, cls: classes[0].id })) };
  }
  function sampleGrade(schoolId, g) {
    const r = rng(hash(schoolId + ':' + g));
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const gn = GRADE_NAME[g];
    const classes = [{ id: 'c' + g + 'a', name: gn + ' الف' }, { id: 'c' + g + 'b', name: gn + ' ب' }];
    const students = Array.from({ length: 24 }, (_, i) => {
      const k = (g - 7) * 24 + i;
      return { id: 's' + (i + 1), name: FIRST[k % 24] + ' ' + LAST[(i * 7 + Math.floor(k / 24) * 5) % 24], cls: classes[i < 12 ? 0 : 1].id, row: (i % 12) + 1 };
    });
    const timetable = {};
    classes.forEach((c, ci) => {
      const grid = DAYS.map(() => Array.from({ length: bellsOf(g).n }, () => pick(SUBJECTS.slice(1))));
      [[0, ci ? 2 : 0], [1, ci ? 0 : 2], [3, ci ? 3 : 1], [4, ci ? 1 : 4]].forEach(([d, b]) => { grid[d][b] = TEACHER_SUBJECT; });
      timetable[c.id] = grid;
    });
    const sid = n => 's' + n;
    const some = n => 1 + Math.floor(r() * 24);
    const T = [
      ['fardi', 'جلسهٔ آشنایی', 'از برنامهٔ روزانه و درس‌ها حرف زدیم. در ریاضی اعتمادبه‌نفس پایینی دارد.', 'هماهنگی با معلم ریاضی برای تمرین تکمیلی'],
      ['khanevade', 'جلسه با مادر', 'مادر از ساعت خواب و استفادهٔ زیاد از گوشی نگران است. قرار شد ساعت گوشی شب محدود شود.', 'پیگیری دو هفته بعد'],
      ['tahsili', 'برنامه‌ریزی درسی', 'برنامهٔ هفتگی ساده با جعبه‌های زمانی نوشتیم.', 'بازخورد برنامه پس از یک هفته'],
      ['fardi', 'ارتباط با هم‌کلاسی‌ها', 'در زنگ تفریح تنهاست. پیشنهاد مسئولیت کوچک کلاسی داده شد.', ''],
      ['tahsili', 'افت نمرهٔ علوم', 'دلیل افت را خستگی از کلاس‌های فوق‌برنامه می‌داند.', 'گفت‌وگو با خانواده دربارهٔ کلاس‌های فوق‌برنامه'],
    ];
    const sessions = T.map(([type, title, text, next], i) => ({ id: uid('n'), sid: sid([3, 3, 8, 15, 20][i]), type, date: shift([-12, -5, -3, -40, -1][i]), title, text, next, by: 'counselor' }));
    const follow = [
      [3, 'هماهنگی با معلم ریاضی برای تمرین تکمیلی', 'teacher', 2, false], [3, 'پیگیری محدودیت گوشی با مادر', 'counselor', 9, false],
      [8, 'بازخورد برنامهٔ هفتگی', 'counselor', 4, false], [20, 'تماس با خانواده دربارهٔ کلاس‌های فوق‌برنامه', 'counselor', -1, false],
    ].map(([n, text, to, due, done]) => ({ id: uid('f'), sid: sid(n), text, to, from: 'counselor', due: shift(due), done }));
    const appts = [[5, 0, 2, 'fardi'], [14, 0, 5, 'tahsili'], [8, 1, 3, 'tahsili'], [22, 3, 1, 'fardi']]
      .map(([n, d, bell, type]) => ({ id: uid('a'), sid: sid(n), date: shift(d), bell, type, by: 'counselor', done: false }));
    const obs = [
      [[3], -2, 'کلاس', 'neg', 'سر کلاس ریاضی سرش روی میز بود و تمرین را شروع نکرد.', 'teacher'],
      [[8, 9], -1, 'حیاط', 'pos', 'به هم‌کلاسی جدید کمک کردند کلاس‌ها را پیدا کند.', 'teacher'],
      [[15], -1, 'حیاط', 'neg', 'زنگ تفریح باز هم تنها بود.', 'counselor'],
      [[some()], 0, 'کلاس', 'neu', 'دیر به کلاس رسید؛ گفت سرویس دیر آمده.', 'teacher'],
    ].map(([ns, d, place, tone, text, by]) => ({ id: uid('o'), sids: ns.map(sid), date: shift(d), place, tone, text, by }));
    const grades = classes.map(c => ({
      id: uid('g'), cls: c.id, subject: TEACHER_SUBJECT, title: 'پرسش کلاسی فصل ۱', date: shift(-7), max: 20,
      scores: Object.fromEntries(students.filter(s => s.cls === c.id).map(s => [s.id, Math.round((9 + r() * 11) * 4) / 4])),
    }));
    const assignments = [
      { id: uid('h'), cls: classes[0].id, subject: TEACHER_SUBJECT, title: 'تمرین‌های صفحهٔ ۱۲ تا ۱۴', due: shift(2), desc: 'همهٔ تمرین‌های زوج.' },
      { id: uid('h'), cls: classes[1].id, subject: TEACHER_SUBJECT, title: 'کاربرگ معادله‌ها', due: shift(4), desc: 'کاربرگ در گروه کلاس گذاشته شده.' },
    ];
    const tests = Object.fromEntries(students.map(s => [s.id, {
      neo: ['حساسیت هیجانی', 'برون‌گرایی', 'گشودگی', 'توافق‌پذیری', 'وجدان‌گرایی'].map(h => [h, Math.round(15 + r() * 32)]),
      holland: ['R', 'I', 'A', 'S', 'E', 'C'].map(h => [h, Math.round(10 + r() * 40)]),
    }]));
    const attendance = {};
    classes.forEach(c => {
      attendance[c.id + '|' + shift(-1)] = Object.fromEntries(students.filter(s => s.cls === c.id).map(s => [s.id, r() < 0.08 ? 'a' : r() < 0.06 ? 'l' : 'p']));
    });
    const discCats = schoolDisc();
    const discipline = Array.from({ length: 8 }, () => ({ id: uid('x'), sid: sid(some()), cat: pick(discCats.filter(c => c.pts < 0 && c.to == null)).id, date: shift(-Math.floor(r() * 12)), note: '', by: 'principal' }));
    const termSubjects = ['ریاضی', 'علوم', 'ادبیات فارسی', 'عربی', 'زبان انگلیسی', 'مطالعات اجتماعی', 'قرآن و پیام‌ها'];
    const term = Object.fromEntries(students.map(s => {
      const base = 12 + r() * 6;
      return [s.id, Object.fromEntries(termSubjects.map(t => [t, Math.min(20, Math.round((base + (r() - .5) * 6) * 4) / 4)]))];
    }));
    const objections = [
      { id: uid('j'), sid: sid(6), subject: 'علوم', text: 'نمرهٔ آزمون عملی در کارنامه نیامده است.', status: 'open', reply: '', date: shift(-1) },
      { id: uid('j'), sid: sid(19), subject: 'ریاضی', text: 'جمع نمره‌های پرسش کلاسی را دوباره بررسی کنید.', status: 'open', reply: '', date: shift(0) },
    ];
    const study = Object.fromEntries(students.map(s => [s.id, Array.from({ length: 7 }, () => Math.round(r() * 8) / 2)]));
    const questions = [
      ['عددهای صحیح', 'حاصل (−۳) × (−۴) چیست؟', ['−۱۲', '۱۲', '−۷', '۷'], 1],
      ['عددهای صحیح', 'قرینهٔ عدد −۵ کدام است؟', ['−۵', '۰', '۵', '۱/۵'], 2],
      ['جبر', 'ساده‌شدهٔ ۲x + ۳x کدام است؟', ['۵x', '۶x', '۵x²', '۶x²'], 0],
      ['جبر', 'اگر x + ۴ = ۱۰ باشد، x چند است؟', ['۴', '۶', '۱۴', '۴۰'], 1],
      ['جبر', 'x × x برابر است با…', ['۲x', 'x²', 'x + x', '۲x²'], 1],
      ['کسر و درصد', '۲۵٪ عدد ۸۰ چند است؟', ['۱۶', '۲۰', '۲۵', '۴۰'], 1],
      ['کسر و درصد', 'حاصل ۱/۲ + ۱/۴ کدام است؟', ['۲/۶', '۳/۴', '۱/۸', '۲/۴'], 1],
      ['هندسه', 'مجموع زاویه‌های داخلی مثلث چند درجه است؟', ['۹۰', '۱۸۰', '۲۷۰', '۳۶۰'], 1],
    ].map(([topic, text, options, answer]) => ({ id: uid('q'), topic, text, options, answer }));
    const exams = [{ id: uid('z'), title: 'آزمونک جبر', cls: classes[0].id, date: shift(5), minutes: 20, qids: questions.filter(q => q.topic === 'جبر').map(q => q.id) }];
    return { grade: g, classes, students, timetable, sessions, follow, appts, obs, grades, assignments, tests, attendance,
      discCats, discipline, termSubjects, term, objections, published: {}, career: {}, study, questions, exams };
  }

  /* ---------------- school-wide ---------------- */
  function seedOrg(schoolId) {
    const r = rng(hash(schoolId + ':org'));
    const events = [
      ['جلسهٔ اولیا و مربیان پایهٔ نهم', 6, '16:00', '18:00', 'جلسه', 'approved', 'principal'],
      ['آزمون میان‌نوبت ریاضی', 9, '08:00', '09:30', 'آزمون', 'approved', 'teacher'],
      ['اردوی یک‌روزهٔ علمی', 13, '07:30', '15:00', 'اردو', 'approved', 'principal'],
      ['مسابقهٔ کتاب‌خوانی', 17, '10:00', '12:00', 'فرهنگی', 'approved', 'principal'],
      ['کارگاه مهارت مطالعه', 4, '10:30', '12:00', 'کارگاه', 'pending', 'counselor'],
      ['آزمونک فصل ۲ ریاضی', 11, '08:00', '08:45', 'آزمون', 'pending', 'teacher'],
      ['تعطیلی رسمی', 21, '', '', 'تعطیل', 'approved', 'principal'],
    ].map(([title, day, start, end, type, status, by]) => ({ id: uid('e'), title, date: shift(day), start, end, type, status, by }));
    const notices = [
      ['برنامهٔ آزمون‌های میان‌نوبت', 'برنامهٔ آزمون‌ها در تقویم مدرسه ثبت شد. لطفاً به دانش‌آموزان یادآوری کنید.', ['teacher', 'counselor'], -2],
      ['جلسهٔ هماهنگی معلمان', 'چهارشنبه زنگ آخر در دفتر مدرسه.', ['teacher'], -1],
      ['نوبت‌های مشاورهٔ این ماه', 'دانش‌آموزان بی‌جلسه در اولویت نوبت‌دهی‌اند.', ['counselor'], 0],
    ].map(([title, body, to, d]) => ({ id: uid('t'), title, body, to, date: shift(d), by: 'principal', read: [] }));
    const teachers = [['معلم ریاضی', 'ریاضی'], ['معلم علوم', 'علوم'], ['معلم ادبیات', 'ادبیات فارسی'], ['معلم عربی', 'عربی'], ['معلم زبان', 'زبان انگلیسی'], ['معلم مطالعات', 'مطالعات اجتماعی']]
      .map(([name, subject], i) => ({ id: 't' + (i + 1), name: name + ' (نمونه)', subject }));
    const criteria = ['آمادگی و طرح درس', 'مدیریت کلاس', 'ارتباط با دانش‌آموزان', 'ارزشیابی منظم', 'همکاری با همکاران', 'نوآوری در تدریس'];
    const rate = () => Object.fromEntries(criteria.map(c => [c, 3 + Math.round(r() * 2)]));
    const applicants = [
      ['آرین پاکزاد', 7, 'interview', -6], ['سام رحمانی', 7, 'accepted', -12], ['کیارش فدایی', 7, 'new', -1], ['پرهام ملکی', 8, 'new', 0],
      ['امیرعباس توکلی', 7, 'enrolled', -20], ['ماهان شجاعی', 10, 'interview', -4], ['ایلیا وکیلی', 7, 'rejected', -15], ['طاها کرمانی', 8, 'accepted', -9],
    ].map(([name, grade, stage, d]) => ({ id: uid('p'), name, grade, stage, date: shift(d), note: '' }));
    // The principal's own meetings with families (separate from the counsellors' case files).
    const family = [
      { id: uid('m'), grade: 8, sid: 's3', who: 'مادر', date: shift(-6), topic: 'افت تحصیلی و استفاده از گوشی', text: 'نگرانی خانواده شنیده شد؛ قرار شد هماهنگی با معلم راهنمای پایه انجام شود.', next: 'گزارش معلم راهنما تا دو هفته' },
      { id: uid('m'), grade: 11, sid: 's7', who: 'پدر و مادر', date: shift(-2), topic: 'انتخاب درس‌های اختیاری', text: 'دربارهٔ رشته و درس‌های اختیاری سال بعد گفت‌وگو شد.', next: '' },
    ];
    const familyAppts = [
      { id: uid('k'), grade: 8, sid: 's12', who: 'پدر', date: shift(1), time: '10:30', topic: 'غیبت‌های پشت‌سرهم', done: false },
      { id: uid('k'), grade: 10, sid: 's4', who: 'مادر', date: shift(2), time: '12:00', topic: 'درخواست تغییر کلاس', done: false },
    ];
    return { events, notices, teachers, criteria, evals: Object.fromEntries(teachers.slice(0, 3).map(t => [t.id, rate()])), selfEvals: Object.fromEntries(teachers.map(t => [t.id, rate()])),
      capacity: { 7: 60, 8: 60, 9: 60, 10: 60, 11: 60, 12: 60 }, enrolled: { 7: 41, 8: 52, 9: 58, 10: 49, 11: 44, 12: 40 }, applicants, family, familyAppts };
  }

  const cache = {};
  function load(k, make) {
    if (cache[k]) return cache[k];
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY + k) || 'null'); } catch (e) { d = null; }
    return (cache[k] = d || make());
  }
  function get(schoolId, g) {
    const k = schoolId + ':' + g;
    let d = load(k, () => seedGrade(schoolId, g));
    // A grade saved with sample names before its real roster was added is replaced once.
    if (REAL[k] && !d.real) { d = cache[k] = seedGrade(schoolId, g); }
    if (!d.v2) { upgrade(d, schoolId, g); save(); }
    if (!d.v3) { upgrade3(d, schoolId, g); save(); }
    const ph = PHONES[k]; if (ph && d.real && !d.phones1) { d.students.forEach(st => { if (!st.phone && ph[st.name]) st.phone = ph[st.name]; }); d.phones1 = true; save(); }
    // v4: sample discipline records get a school day and a bell, so each can be traced to the lesson it happened in.
    if (!d.v4) { if (!d.real) { const r = rng(hash(schoolId + ':' + g + ':v4'));
      d.discipline.forEach(x => { if (!x.bell) { while (dayIndex(x.date) === null) x.date = shift(-1, x.date); x.bell = 1 + Math.floor(r() * bellsOf(g).n); } }); } d.v4 = true; save(); }
    // Mehr-e Hashtom's real weekly timetables (js/data-mehr8-timetable.js), once: subjects in x.timetable, teachers in
    // x.ttTeacher (same shape). Their subjects join the grade's subject list, so they can be picked when a cell is edited.
    // tt2: the teachers' names were corrected (two different teachers called سلطانی); only x.ttTeacher is written again,
    // so subjects changed by hand since tt1 are kept.
    if (schoolId === 'mehr8' && d.real && (!d.tt1 || !d.tt2) && typeof TT_MEHR8 !== 'undefined') {
      const first = !d.tt1;
      const n = bellsOf(g).n, subs = new Set(d.customSubjects || []);
      d.ttTeacher = d.ttTeacher || {};
      d.classes.forEach(c => { const rows = TT_MEHR8[c.name]; if (!rows) return;
        const grid = rows.map(row => row.split('|').slice(0, n).map(x => x.split('@')));
        grid.forEach(r => r.forEach((cell, b) => { if (!cell[1] && b && r[b - 1][0] === cell[0]) cell[1] = r[b - 1][1]; subs.add(cell[0]); }));
        if (first) d.timetable[c.id] = grid.map(r => r.map(x => x[0]));
        d.ttTeacher[c.id] = grid.map(r => r.map(x => x[1] || ''));
      });
      if (first) d.customSubjects = [...subs].filter(x => !SUBJECTS.includes(x));
      d.tt1 = d.tt2 = true; save();
    }
    // Grade 9 of Mehr-e Hashtom: the test results and earlier report cards from the guidance teacher's files, once.
    // A result already entered by hand is kept.
    if (k === 'mehr8:9' && d.real && !d.tests9b && typeof TESTS_MEHR8_9 !== 'undefined') {
      d.students.forEach(st => {
        const t = TESTS_MEHR8_9[st.name]; if (!t) return;
        const p = d.profiles[st.id] = d.profiles[st.id] || { prereq: [], records: [], prevDesc: '' };
        ['neo', 'holland', 'gardner'].forEach(key => { if (t[key] && !p[key]) p[key] = JSON.parse(JSON.stringify(t[key])); });
        if (t.neo?.lv && p.neo && p.neo.date === t.neo.date && !p.neo.lv && JSON.stringify(p.neo.s) === JSON.stringify(t.neo.s)) p.neo.lv = { ...t.neo.lv };
        ['neoNote', 'prereqNote'].forEach(key => { if (t[key] && !p[key]) p[key] = t[key]; });
        if (t.prereq && !(p.prereq || []).length) p.prereq = t.prereq.map(x => ({ id: uid('p'), ...JSON.parse(JSON.stringify(x)) }));
        if (t.records && !(p.records || []).length) p.records = t.records.map(x => ({ id: uid('k'), ...JSON.parse(JSON.stringify(x)) }));
      });
      d.tests9 = d.tests9b = true; save();
    }
    if (d.real && !d.sample1) { addSample(d, schoolId, g); d.sample1 = true; save(); }
    if (d.real && !d.sample2) { addSampleSessions(d, schoolId, g); d.sample2 = true; save(); }
    if (d.real && !d.sample3) { addSampleLife(d, schoolId, g); d.sample3 = true; save(); }
    if (d.real && !d.sample4) { addSamplePlans(d, schoolId, g); d.sample4 = true; save(); }
    // Students with a profile file have their real sessions counted from it, so their sample sessions go.
    if (d.real && !d.sample5 && typeof Profile9 !== 'undefined' && schoolId === 'mehr8' && g === 9) {
      d.sessions = d.sessions.filter(n => !(n.sample && Profile9.byName(d.students.find(s => s.id === n.sid)?.name))); d.sample5 = true; save(); }
    // v5: the school's own list of discipline items replaces the sample one; items the school added are kept,
    // and records of the sample items move to the nearest item of the school's list.
    if (!d.v5) {
      const OLD = { d1: ['p1', 2], d2: ['p1', 1], d3: ['p1', 1], d4: ['n2'], d5: ['n9'], d6: ['n6'], d7: ['n14', -5] };
      d.discipline.forEach(x => { const m = OLD[x.cat]; if (m) { x.cat = m[0]; if (m[1] != null) x.pts = m[1]; } });
      const ids = new Set(SCHOOL_DISC.map(c => c.id));
      d.discCats = [...schoolDisc(), ...d.discCats.filter(c => !OLD[c.id] && !ids.has(c.id))];
      d.v5 = true; save();
    }
    return d;
  }

  /* ---------------- counsellor workspace, test files, marks (v2) ---------------- */
  // Test definitions shared by data entry and display.
  const TESTS = {
    neo: { name: 'شخصیت نئو (پنج عامل)', min: 10, max: 50, keys: [['N', 'حساسیت هیجانی'], ['E', 'برون‌گرایی'], ['O', 'گشودگی'], ['A', 'توافق‌پذیری'], ['C', 'وجدان‌گرایی']] },
    holland: { name: 'علاقه‌های شغلی هالند', min: 0, max: 52, keys: [['R', 'واقع‌گرا'], ['I', 'جستجوگر'], ['A', 'هنری'], ['S', 'اجتماعی'], ['E', 'اقتصادی'], ['C', 'قراردادی']] },
    gardner: { name: 'هوش‌های چندگانهٔ گاردنر', min: 8, max: 40, keys: [['ling', 'زبانی'], ['logic', 'منطقی ـ ریاضی'], ['spatial', 'تجسمی ـ فضایی'], ['body', 'بدنی ـ حرکتی'],
      ['music', 'موسیقیایی'], ['inter', 'میان‌فردی'], ['intra', 'درون‌فردی'], ['nature', 'طبیعت‌گرا']] },
  };
  const MATH_DOMAINS = [['عدد و توان', 3], ['کسر، درصد، تناسب', 4], ['جبر و معادله', 5], ['هندسه و آمار', 4], ['رادیکال', 1], ['مباحث سال جاری', 3]];
  // The four kinds of mark; report-card weights are set per kind and add up to 20.
  // «آزمون پایانی» is the term's final exam; its weight is 0 until the academic deputy gives it one.
  const MARK_TYPES = [['quiz', 'کوییز'], ['hw', 'تکلیف'], ['exam', 'آزمون کلاسی'], ['oral', 'پرسش کلاسی'], ['final', 'آزمون پایانی']];
  const DEFAULT_WEIGHTS = { quiz: 3, hw: 3, exam: 10, oral: 4, final: 0 };

  // Adds what older saved grades lack. Sample grades get sample content; a grade with real students only empty structures.
  function upgrade(d, schoolId, g) {
    const r = rng(hash(schoolId + ':' + g + ':v2'));
    d.sessions.forEach(n => {
      if (n.topic !== undefined) return;
      n.topic = n.title || ''; n.actions = n.next ? [{ id: uid('x'), text: n.next, done: false }] : [];
      n.parents = n.type === 'khanevade' ? { mother: true, father: false } : {}; n.others = '';
    });
    d.reminders = d.real ? [] : d.follow.filter(f => !f.done).map(f => ({ id: uid('r'), text: f.text, date: f.due, sid: f.sid, done: false }));
    d.mySchedule = DAYS.map(() => Array(bellsOf(g).n).fill(null));
    d.profiles = {};
    d.grades.forEach(x => { x.type = x.type || 'oral'; });
    d.archive = {}; d.cardMarks = {}; d.cardNotes = {};
    if (!d.real) {
      d.appts.forEach(a => { const di = dayIndex(a.date); if (di !== null) d.mySchedule[di][a.bell - 1] = { type: a.type, sid: a.sid }; });
      d.mySchedule[0][3] = d.mySchedule[0][3] || { type: 'class', note: d.classes[0].name };
      d.mySchedule[2][1] = d.mySchedule[2][1] || { type: 'class', note: d.classes[1].name };
      d.mySchedule[3][5] = { type: 'meeting', note: 'جلسهٔ هماهنگی معلمان' };
      const date = shift(-30);
      d.students.forEach(s => {
        const t = d.tests[s.id]; if (!t) return;
        d.profiles[s.id] = {
          neo: { date, s: Object.fromEntries(t.neo.map(([, v], i) => [TESTS.neo.keys[i][0], v])) },
          holland: { date, s: Object.fromEntries(t.holland) },
          gardner: { date, s: Object.fromEntries(TESTS.gardner.keys.map(([k]) => [k, 8 + Math.round(r() * 32)])) },
          prereq: [{ id: uid('p'), subject: 'ریاضی', date, domains: MATH_DOMAINS.map(([n, max]) => ({ n, max, v: Math.round(r() * max) })) }],
          records: ['هفتم ـ پایان سال', 'هشتم ـ نیمسال اول'].map(term => ({ id: uid('k'), term,
            marks: Object.fromEntries(d.termSubjects.map(x => [x, Math.min(20, Math.round((13 + r() * 7) * 4) / 4)])), note: '' })),
          summary: null, prevDesc: '',
        };
      });
      // Marks of every kind in every subject, so report cards have something to compute.
      d.classes.forEach(c => d.termSubjects.forEach(sub => {
        [['quiz', 'کوییز ۱', 10, -40], ['hw', 'تکلیف فصل ۱', 20, -35], ['oral', 'پرسش کلاسی ۱', 20, -25], ['exam', 'آزمون کلاسی ۱', 20, -15]].forEach(([type, title, max, day]) => {
          if (sub === TEACHER_SUBJECT && type === 'oral') return; // the existing maths item is this one
          d.grades.push({ id: uid('g'), cls: c.id, subject: sub, type, title, date: shift(day), max,
            scores: Object.fromEntries(d.students.filter(s => s.cls === c.id).map(s => [s.id, Math.round(max * (0.45 + r() * 0.55) * 4) / 4])) });
        });
      }));
      // Last year's comparable report card, kept as archived marks.
      d.archive.prev = Object.fromEntries(d.students.map(s => [s.id, { ...d.term[s.id] }]));
    }
    d.v2 = true;
  }
  // v3: sample grades get a few more marks across the term, so the marks dashboard has progress to show.
  // Each sample student has a level and a drift; some homework is left undone. Real grades get nothing.
  function upgrade3(d, schoolId, g) {
    if (!d.real) {
      const r = rng(hash(schoolId + ':' + g + ':v3'));
      const who = Object.fromEntries(d.students.map(s => [s.id, { lvl: 0.5 + r() * 0.4, drift: (r() - 0.35) * 0.3 }]));
      const plan = [['quiz', 'کوییز ۲', 10, -28], ['quiz', 'کوییز ۳', 10, -8], ['hw', 'تکلیف فصل ۲', 20, -20], ['hw', 'تکلیف فصل ۳', 20, -3], ['oral', 'پرسش کلاسی ۲', 20, -12], ['exam', 'آزمون کلاسی ۲', 20, -5]];
      d.classes.forEach(c => d.termSubjects.forEach(sub => plan.forEach(([type, title, max, day]) => {
        const t = (day + 45) / 45, scores = {};
        d.students.filter(s => s.cls === c.id).forEach(s => {
          if (type === 'hw' && r() < 0.15) return;
          const p = Math.max(0.2, Math.min(1, who[s.id].lvl + who[s.id].drift * t + (r() - 0.5) * 0.15));
          scores[s.id] = Math.round(max * p * 4) / 4;
        });
        d.grades.push({ id: uid('g'), cls: c.id, subject: sub, type, title, date: shift(day), max, scores });
      })));
    }
    d.v3 = true;
  }
  // Sample marks for grades with real students (6 Aban 1405, asked for so the marks charts and overviews have something
  // to show): every term subject in every class gets quizzes, homework, oral questions and class tests across the term
  // so far. Each student has a level, a drift over the term and a lean per subject; some homework is not handed in and
  // not everyone is asked in class. Every item is sample: true and titled «(نمونه)»; clearSample removes them.
  function addSample(d, schoolId, g) {
    const r = rng(hash(schoolId + ':' + g + ':sample1'));
    const day = n => { let x = shift(n); while (dayIndex(x) === null) x = shift(-1, x); return x; };
    const who = Object.fromEntries(d.students.map(s => [s.id, { lvl: 0.5 + r() * 0.45, drift: (r() - 0.4) * 0.25,
      lean: Object.fromEntries(d.termSubjects.map(su => [su, (r() - 0.5) * 0.2])) }]));
    const plan = [['quiz', 'کوییز ۱', 10, -33], ['hw', 'تکلیف ۱', 20, -30], ['oral', 'پرسش کلاسی ۱', 20, -26], ['quiz', 'کوییز ۲', 10, -22],
      ['hw', 'تکلیف ۲', 20, -18], ['exam', 'آزمون کلاسی ۱', 20, -15], ['oral', 'پرسش کلاسی ۲', 20, -10], ['quiz', 'کوییز ۳', 10, -7],
      ['hw', 'تکلیف ۳', 20, -4], ['exam', 'آزمون کلاسی ۲', 20, -2]];
    d.classes.forEach(c => d.termSubjects.forEach(sub => plan.forEach(([type, title, max, n]) => {
      const t = (n + 35) / 35, scores = {};
      d.students.filter(s => s.cls === c.id).forEach(s => {
        if (type === 'hw' && r() < 0.1) return;
        if (type === 'oral' && r() < 0.35) return;
        const w = who[s.id], p = Math.max(0.15, Math.min(1, w.lvl + w.lean[sub] + w.drift * t + (r() - 0.5) * 0.18));
        scores[s.id] = Math.round(max * p * 4) / 4;
      });
      d.grades.push({ id: uid('g'), cls: c.id, subject: sub, type, title: `${title} (نمونه)`, date: day(n), max, scores, sample: true });
    })));
  }
  // Sample counselling sessions (asked for with the sample marks): every student gets an individual and an academic
  // session in the term so far, some a second one. The academic one is about the student's weakest subject in the
  // sample marks. A student who already has a session of that kind entered by hand gets no sample of it.
  function addSampleSessions(d, schoolId, g) {
    const r = rng(hash(schoolId + ':' + g + ':sample2')), pick = l => l[Math.floor(r() * l.length)], today = shift(0);
    const day = n => { let x = shift(n); while (dayIndex(x) === null) x = shift(-1, x); return x; };
    const FARDI = [
      ['آشنایی و شناخت', 'از علاقه‌ها، برنامهٔ روزانه و دوستانش در مدرسه حرف زدیم. فضای گفت‌وگو خوب بود.', 'جلسهٔ بعدی دو هفتهٔ دیگر'],
      ['ارتباط با هم‌کلاسی‌ها', 'گفت در زنگ تفریح بیشتر تنهاست. پیشنهاد یک مسئولیت کوچک کلاسی داده شد.', 'پیگیری مسئولیت کلاسی'],
      ['خواب و گوشی', 'شب‌ها دیر می‌خوابد و صبح خسته است. قرار شد گوشی ساعت ده شب کنار گذاشته شود.', 'پرسیدن از ساعت خواب در جلسهٔ بعد'],
      ['اضطراب امتحان', 'پیش از آزمون‌ها دلشوره دارد. تمرین تنفس و مرور کوتاه شب امتحان را با هم تمرین کردیم.', 'بررسی حالش بعد از آزمون بعدی'],
      ['انگیزه و هدف', 'دربارهٔ هدف‌های امسال حرف زدیم. سه هدف کوچک برای این ماه نوشت.', 'مرور هدف‌ها آخر ماه'],
      ['رفتار سر کلاس', 'دربارهٔ تذکرهای اخیر سر کلاس صحبت کردیم. خودش پیشنهاد داد در ردیف جلو بنشیند.', 'هماهنگی با معلم‌ها'],
    ];
    const TAHSILI = [
      ['افت نمرهٔ {s}', 'نمره‌های اخیر {s} پایین آمده. دلیلش را عقب‌ماندن از تمرین‌ها می‌داند. قرار شد هر روز بیست دقیقه {s} کار کند.', 'هماهنگی با معلم {s}'],
      ['برنامه‌ریزی درسی', 'برنامهٔ هفتگی ساده با جعبه‌های زمانی نوشتیم؛ {s} دو نوبت در هفته جای ثابت گرفت.', 'بازخورد برنامه پس از یک هفته'],
      ['روش مطالعه', 'روش خلاصه‌نویسی و مرور فاصله‌دار را با هم تمرین کردیم، با شروع از {s}.', 'دیدن دفتر خلاصه‌اش'],
      ['تکالیف عقب‌افتاده', 'چند تکلیف، بیشتر در {s}، تحویل نشده. فهرست کارهای مانده را با هم نوشتیم و مهلت گذاشتیم.', 'پیگیری تحویل تکالیف'],
      ['آمادگی آزمون', 'برای آزمون کلاسی {s} برنامهٔ مرور سه‌روزه نوشتیم.', 'بررسی نتیجهٔ آزمون'],
    ];
    const weakest = sid => { const by = {};
      d.grades.forEach(i => { const v = i.scores[sid]; if (v != null) (by[i.subject] = by[i.subject] || []).push(v / i.max); });
      const l = Object.entries(by).map(([su, vs]) => [su, vs.reduce((a, v) => a + v, 0) / vs.length]).sort((a, b) => a[1] - b[1]);
      return l[0]?.[0] || d.termSubjects[0]; };
    const add = (st, type, [topic, text, next], n, su) => {
      const date = day(n), due = shift(7, date), fill = t => t.replace(/\{s\}/g, su);
      d.sessions.push({ id: uid('n'), sid: st.id, type, date, topic: `${fill(topic)} (نمونه)`, title: `${fill(topic)} (نمونه)`, text: fill(text),
        actions: [{ id: uid('x'), text: fill(next), due, done: due < today && r() < 0.6 }], next: fill(next), parents: {}, others: '', share: false, by: 'counselor', sample: true });
    };
    d.students.forEach(st => {
      const has = t => d.sessions.some(n => n.sid === st.id && n.type === t && !n.sample), su = weakest(st.id);
      if (!has('fardi')) { add(st, 'fardi', pick(FARDI), -30 + Math.floor(r() * 14), su); if (r() < 0.3) add(st, 'fardi', pick(FARDI), -12 + Math.floor(r() * 10), su); }
      if (!has('tahsili')) { add(st, 'tahsili', r() < 0.5 ? TAHSILI[0] : pick(TAHSILI), -20 + Math.floor(r() * 18), su); if (r() < 0.25) add(st, 'tahsili', pick(TAHSILI), -6 + Math.floor(r() * 5), su); }
    });
  }
  // The rest of a school's daily life, for a grade with real students, so every role's pages have something to show
  // at a sales demonstration (7 Aban 1405): attendance for the last four weeks, discipline records and behaviour
  // notes, the guidance teacher's appointments and reminders, homework, mark objections, study hours and last term's
  // marks for comparison. Every record is sample: true (attendance: listed in d.sampleAtt) so clearSample removes it.
  function addSampleLife(d, schoolId, g) {
    const r = rng(hash(schoolId + ':' + g + ':sample3')), pick = l => l[Math.floor(r() * l.length)], today = shift(0);
    const school = []; for (let n = -1; school.length < 20; n--) { const x = shift(n); if (dayIndex(x) !== null) school.push(x); }
    const ahead = []; for (let n = 1; ahead.length < 5; n++) { const x = shift(n); if (dayIndex(x) !== null) ahead.push(x); }
    const nb = bellsOf(g).n, st = d.students, of = c => st.filter(s => s.cls === c);
    // A few students are absent or late more often, as in a real class.
    const lean = Object.fromEntries(st.map(s => [s.id, r() < 0.15 ? 3 : 1]));
    d.attendance = d.attendance || {}; d.attMeta = d.attMeta || {}; d.sampleAtt = [];
    const ABS = ['بیماری', 'سفر خانوادگی', 'نوبت دکتر', ''], LATE = ['سرویس دیر آمد', 'ترافیک', 'خواب ماند', ''];
    d.classes.forEach(c => school.forEach(date => {
      const k = c.id + '|' + date; if (d.attendance[k]) return;
      const rec = {}, meta = {};
      of(c.id).forEach(s => { const x = r();
        if (x < 0.025 * lean[s.id]) { rec[s.id] = 'a'; const n = pick(ABS); if (n) meta[s.id] = { note: n }; }
        else if (x < 0.06 * lean[s.id]) { rec[s.id] = 'l'; meta[s.id] = { min: 5 + Math.floor(r() * 4) * 5, note: pick(LATE), guide: r() < 0.3 }; }
        else rec[s.id] = 'p'; });
      meta._by = 'nazem'; meta._at = date + 'T08:05:00.000Z';
      d.attendance[k] = rec; d.attMeta[k] = meta; d.sampleAtt.push(k);
    }));
    // Discipline: most students have one or two small entries, a few have more; some get a positive one.
    const neg = (d.discCats || []).filter(c => c.pts < 0), pos = (d.discCats || []).filter(c => c.pts > 0);
    const NOTE = { n2: 'ده دقیقه بعد از زنگ', n3: 'کتاب و دفتر همراه نداشت', n6: 'صحبت مکرر سر کلاس', n8: 'بعد از زنگ اول رسید', n11: 'سه جلسهٔ پشت سر هم', n14: 'بعد از دو تذکر شفاهی' };
    const BY = ['nazem', 'nazem', 'teacher', 'counselor'];
    st.forEach(s => {
      const n = r() < 0.25 ? 0 : r() < 0.75 ? 1 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) { const c = pick(neg); if (!c) break;
        const by = pick(BY), pts = c.to != null ? c.pts + Math.round(r() * (c.to - c.pts)) : undefined;
        d.discipline.push({ id: uid('x'), sid: s.id, cat: c.id, ...(pts != null ? { pts } : {}), date: pick(school), bell: 1 + Math.floor(r() * nb), note: NOTE[c.id] || '', by,
          ...(by === 'teacher' ? { subject: pick(d.termSubjects) } : {}), sample: true }); }
      if (pos.length && r() < 0.2) { const c = pick(pos);
        d.discipline.push({ id: uid('x'), sid: s.id, cat: c.id, ...(c.to != null ? { pts: Math.max(c.pts, c.to) } : {}), date: pick(school), bell: 1 + Math.floor(r() * nb), note: 'مسئول نظم کتابخانهٔ کلاس', by: 'counselor', sample: true }); }
    });
    // Behaviour notes by teachers, the guidance teacher and the ناظم.
    const OBS = [
      ['pos', 'کلاس', 'در کار گروهی نقش هماهنگ‌کننده را خوب انجام داد.'], ['pos', 'کلاس', 'سؤال‌های دقیق می‌پرسد و به بحث کلاس عمق می‌دهد.'],
      ['pos', 'حیاط', 'به هم‌کلاسی‌ای که زمین خورده بود کمک کرد.'], ['pos', 'کلاس', 'تکلیف اضافه را داوطلبانه انجام داد.'],
      ['neg', 'کلاس', 'سر کلاس حواسش پرت بود و تمرین را شروع نکرد.'], ['neg', 'کلاس', 'چند بار وسط درس با بغل‌دستی صحبت کرد.'],
      ['neg', 'حیاط', 'زنگ تفریح تنها بود و با کسی حرف نزد.'], ['neg', 'راهرو', 'بعد از زنگ دیر به کلاس برگشت.'],
      ['neu', 'کلاس', 'خسته به نظر می‌رسید؛ گفت شب دیر خوابیده.'], ['neu', 'کلاس', 'برای امتحان هفتهٔ بعد نگران بود.'],
    ];
    for (let i = 0; i < Math.round(st.length * 0.7); i++) {
      const [tone, place, text] = pick(OBS), a = pick(st), two = r() < 0.15 ? pick(of(a.cls).filter(x => x.id !== a.id)) : null;
      d.obs.push({ id: uid('o'), sids: two ? [a.id, two.id] : [a.id], date: pick(school), place, tone, text, by: pick(['teacher', 'teacher', 'counselor', 'nazem']), sample: true });
    }
    // The guidance teacher's coming appointments (in free bells of their plan) and reminders.
    const pickSt = () => pick(st);
    for (let i = 0; i < 7; i++) { const s = pickSt(), date = pick(ahead), type = pick(['fardi', 'tahsili', 'tahsili', 'khanevade']);
      d.appts.push({ id: uid('a'), sid: s.id, date, bell: 1 + Math.floor(r() * nb), type, by: 'counselor', done: false, sample: true }); }
    [['تماس با خانوادهٔ {n} دربارهٔ غیبت‌ها', 1], ['دیدن دفتر برنامه‌ریزی {n}', 2], ['هماهنگی با معلم ریاضی دربارهٔ {n}', -1], ['پیگیری کار گروهی کلاس', 4], ['آماده‌کردن گزارش ماهانه برای مدیر', 6]]
      .forEach(([t, n]) => { const s = pickSt(); d.reminders.push({ id: uid('r'), text: t.replace('{n}', s.name), date: shift(n), sid: t.includes('{n}') ? s.id : '', done: false, sample: true }); });
    // Homework per class in a few subjects, due in the coming days.
    const HW = [['تمرین‌های پایان فصل', 'همهٔ تمرین‌های زوج.'], ['کاربرگ مرور', 'کاربرگ در گروه کلاس گذاشته شده.'], ['خلاصه‌نویسی درس', 'یک صفحه، با نمودار مفهومی.'], ['پروژهٔ کوچک', 'گروه‌های دونفره.']];
    d.classes.forEach(c => d.termSubjects.slice(0, 5).forEach((sub, i) => { const [t, desc] = HW[i % HW.length];
      d.assignments.push({ id: uid('h'), cls: c.id, subject: sub, title: `${t} ${sub}`, due: ahead[i % ahead.length], desc, sample: true }); }));
    // Two open objections to marks.
    [['آزمون کلاسی ۲', 'نمرهٔ سؤال آخر محاسبه نشده است.'], ['تکلیف ۳', 'تکلیف را تحویل داده بودم ولی نمره ثبت نشده.']].forEach(([what, text], i) => {
      const s = pickSt(); d.objections.push({ id: uid('j'), sid: s.id, subject: d.termSubjects[i], text: `${what}: ${text}`, status: 'open', reply: '', date: shift(-i), sample: true }); });
    // Study hours of the last week, and last term's marks for the report-card comparison.
    d.study = d.study || {}; d.archive = d.archive || {}; d.archive.prev = d.archive.prev || {};
    st.forEach(s => { const lvl = 0.5 + r() * 0.45;
      if (!d.study[s.id]) d.study[s.id] = Array.from({ length: 7 }, () => Math.round(r() * 8 * lvl) / 2);
      if (!d.archive.prev[s.id]) d.archive.prev[s.id] = Object.fromEntries(d.termSubjects.map(t => [t, Math.min(20, Math.round((10 + lvl * 9 + (r() - .5) * 4) * 4) / 4)])); });
    d.sampleStudy = true;
  }
  // Study plans for about two thirds of a grade's students (approved by the guidance teacher, a few waiting), with
  // last week ticked off, so the study pages and the parent's view have something to show. Listed in d.samplePlans.
  function addSamplePlans(d, schoolId, g) {
    const r = rng(hash(schoolId + ':' + g + ':sample4')), pick = l => l[Math.floor(r() * l.length)];
    const TASK = ['حل تمرین‌های کتاب', 'مرور درس امروز', 'خلاصه‌نویسی', 'تست‌زنی', 'حفظ لغت‌ها', 'آماده شدن برای کوییز'];
    const SLOTS = [['16:00', '17:00'], ['17:15', '18:15'], ['18:30', '19:30'], ['20:00', '20:45']];
    d.studyPlans = d.studyPlans || {}; d.samplePlans = [];
    d.students.forEach((s, i) => {
      if (d.studyPlans[s.id] || (i > 0 && r() < 0.35)) return;  // the first student (the demo family's child) always has one
      const schedule = {}, n = 2 + Math.floor(r() * 2);
      for (let w = 0; w < 6; w++) schedule[w] = SLOTS.slice(0, n).map(([from, to]) => ({ id: uid('l'), from, to, subject: pick(d.termSubjects), task: pick(TASK), by: 'student', ok: true, skip: [] }));
      const p = { method: 'schedule', schedule, blocks: 4, log: {}, status: r() < 0.15 ? 'pending' : 'approved', sentAt: shift(-6) }, lvl = 0.45 + r() * 0.5;
      for (let k = 1; k <= 7; k++) { const date = shift(-k), w = (new Date(date + 'T12:00:00').getDay() + 1) % 7, done = {};
        (schedule[w] || []).forEach(i => { if (r() < lvl) done[i.id] = true; }); p.log[date] = { done, boxes: [] }; }
      d.studyPlans[s.id] = p; d.samplePlans.push(s.id);
    });
  }
  // Removes the sample records of one grade; what was entered by hand stays. Returns how many records went.
  function clearSample(schoolId, g) {
    const d = get(schoolId, g), LISTS = ['grades', 'sessions', 'discipline', 'obs', 'appts', 'reminders', 'assignments', 'objections'];
    let n = 0;
    LISTS.forEach(k => { const before = (d[k] || []).length; d[k] = (d[k] || []).filter(i => !i.sample); n += before - d[k].length; });
    (d.sampleAtt || []).forEach(k => { if (d.attendance[k]) { delete d.attendance[k]; delete d.attMeta?.[k]; n++; } }); d.sampleAtt = [];
    if (d.sampleStudy) { d.study = {}; d.archive.prev = {}; d.sampleStudy = false; }
    (d.samplePlans || []).forEach(sid => { if (d.studyPlans?.[sid]) { delete d.studyPlans[sid]; n++; } }); d.samplePlans = [];
    save(); return n;
  }
  function upgradeOrg(o) {
    if (o.v2) return;
    o.reportCards = [
      { id: 'prev', title: 'نوبت دوم', year: '۱۴۰۴-۱۴۰۳', archived: true },
      { id: 'n1', title: 'نوبت اول', year: '۱۴۰۶-۱۴۰۵', from: shift(-60), to: shift(60), compare: 'prev', weights: {}, published: false },
    ];
    o.discReport = { title: 'کارنامهٔ انضباطی', logo: '', footer: '', signer: 'معلم راهنمای پایه' };
    o.v2 = true;
  }
  // Initials for the photo placeholder: first letter of the first name (after «سید») and of the surname.
  // A student's photo: their own, else the one in the grade-9 profile of Mehr-e Hashtom (js/profile9.js), never stored.
  const photoOf = s => s.photo || (typeof Profile9 !== 'undefined' && Profile9.photo(s.name)) || '';
  function initials(s) {
    const first = (s.first || s.name.split(' ')[0]).replace(/^سید\s+/, '');
    const last = s.last || s.name.split(' ').slice(-1)[0];
    return first[0] + ' ' + last[0];
  }
  function org(schoolId) {
    const d = load(schoolId + ':org', () => seedOrg(schoolId));
    // Sample family meetings must never point at a grade that now holds real students.
    ['family', 'familyAppts'].forEach(k => { d[k] = d[k].filter(m => !(REAL[schoolId + ':' + m.grade] && m.sample !== false)); });
    if (!d.v2) { upgradeOrg(d); save(); }
    // A published monthly report card for a sales demonstration (7 Aban 1405), once, from the sample marks of Mehr.
    if (REAL[schoolId + ':9'] && !d.cardsDemo) { d.cardsDemo = true;
      d.reportCards.push({ id: 'mehr05', title: 'کارنامهٔ مهرماه', year: '۱۴۰۶-۱۴۰۵', from: '2026-09-23', to: '2026-10-22', compare: null, weights: {}, ready: true, approved: true, published: true, publishedAt: shift(-3), sample: true });
      save(); }
    return d;
  }
  function save() { Object.entries(cache).forEach(([k, v]) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }); }
  function reset(schoolId) {
    Object.keys(cache).filter(k => k.startsWith(schoolId + ':')).forEach(k => delete cache[k]);
    try { Object.keys(localStorage).filter(k => k.startsWith(KEY + schoolId + ':')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
  }
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith(KEY)) return;
    delete cache[e.key.slice(KEY.length)];
    window.dispatchEvent(new Event('school-changed'));
  });

  // The school's discipline items (1405). A range (pts … to) is chosen when a case is recorded;
  // p1 is the diligence point, up to +10, given by the guidance teacher or the deputy.
  const SCHOOL_DISC = [
    ['n1', 'تاخیر ورود به کلاس مجازی', -1], ['n2', 'تاخیر ورود به کلاس', -5], ['n3', 'نقص ملزومات کلاس', -4], ['n4', 'عدم پیگیری مکاتبات', -4],
    ['n5', 'عدم مشارکت در نظافت عمومی', -4], ['n6', 'بی‌نظمی در کلاس', -5], ['n7', 'بازی خارج از نوبت', -4], ['n8', 'تاخیر ورود به مدرسه', -5],
    ['n9', 'عدم تحویل کاربرگ / ثبت در کارسنج', -2], ['n10', 'یک زنگ غیبت غیرموجه', -8], ['n11', 'نقص تکلیف مکرر', -10], ['n12', 'رونویسی تکالیف', -10],
    ['n13', 'ظاهر و پوشش نامناسب', -5, -10], ['n14', 'تذکر انضباطی', -3, -10], ['n15', 'تخلف امتحانی', -10], ['n16', 'موارد خاص', -5, -15],
    ['n17', 'اخراج از کلاس', -10], ['p1', 'جدیت در انجام مسئولیت‌های مدرسه', 10, 1],
  ].map(([id, name, pts, to]) => ({ id, name, pts, ...(to != null ? { to } : {}) }));
  function schoolDisc() { return SCHOOL_DISC.map(c => ({ ...c })); }
  const dayIndex = isoDate => { const g = new Date(isoDate).getDay(); return g === 6 ? 0 : g <= 3 ? g + 1 : null; };
  // Timetables: x.mySchedule and x.timetable are the year's plan; x.weekOver[<Saturday of a week>] holds changes
  // made for that week only, which win over the plan: { me: { [day]: { [bell]: cell } }, cls: { [classId]: { [day]: { [bell]: subject } } } }.
  const weekStart = isoDate => { const d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 1) % 7); return iso(d); };
  const own = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
  const meCell = (x, day, b, ws) => { const w = x.weekOver?.[ws]?.me?.[day]; return own(w, b) ? w[b] : x.mySchedule[day][b] || guideTeaching(x, day, b, ws); };
  const clsCell = (x, cid, day, b, ws) => { const w = x.weekOver?.[ws]?.cls?.[cid]?.[day]; return own(w, b) ? w[b] : x.timetable[cid][day][b]; };
  // Who teaches a class at a bell: the timetable's teacher, or '' when the cell was changed for the week or has no teacher.
  // A cell changed for one week keeps its teacher in weekOver[ws].tch (same shape as .cls).
  const clsTeacher = (x, cid, day, b, ws) => { const w = x.weekOver?.[ws]?.cls?.[cid]?.[day]; return own(w, b) ? x.weekOver[ws].tch?.[cid]?.[day]?.[b] || '' : x.ttTeacher?.[cid]?.[day]?.[b] || ''; };
  // Who teaches a subject, most bells first: in this class, then the grade's other classes, then the school's other
  // grades. A subject put in a cell by hand gets the first of them as its teacher.
  function teachersFor(x, cid, sub) {
    if (!sub) return [];
    const k = Object.keys(cache).find(k => cache[k] === x), schoolId = k ? k.split(':')[0] : '';
    const count = (y, only) => { const m = new Map();
      y.classes.forEach(c => { if (only && c.id !== only) return;
        (y.timetable[c.id] || []).forEach((row, day) => row.forEach((s, b) => { const t = y.ttTeacher?.[c.id]?.[day]?.[b]; if (s === sub && t) m.set(t, (m.get(t) || 0) + 1); })); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]); };
    const others = schoolId ? Object.keys(REAL).filter(r => r.startsWith(schoolId + ':') && cache[r] !== x).flatMap(r => count(get(schoolId, r.split(':')[1]))) : [];
    return [...new Set([...count(x, cid), ...count(x), ...others])];
  }
  // The guidance teacher's name for a grade, where the school has given it.
  const guideOf = (schoolId, g) => schoolId === 'mehr8' && typeof GUIDE_MEHR8 !== 'undefined' ? GUIDE_MEHR8[g] || '' : '';
  // A bell the guidance teacher's own plan leaves empty shows what the school timetable gives them then: their own
  // lessons and مشاوره periods, found by their name in every grade's x.ttTeacher (e.g. Momeni's عربی in grade 8 and
  // هندسه and مشاوره in grade 9). Grades 7-9 and 10-12 ring different bells, so classes are matched by clock time.
  function guideTeaching(x, day, b, ws) {
    const k = Object.keys(cache).find(k => cache[k] === x); if (!k) return null;
    const [schoolId, g] = k.split(':'), t = guideOf(schoolId, g); if (!t) return null;
    const bl = bellsOf(g), from = bl.times[b], to = bl.ends[b]; if (!from) return null;
    const hits = [];
    Object.keys(REAL).filter(r => r.startsWith(schoolId + ':')).forEach(r => {
      const g2 = r.split(':')[1], y = get(schoolId, g2), b2 = bellsOf(g2);
      y.classes.forEach(c => { for (let i = 0; i < b2.n; i++) if (b2.times[i] < to && from < b2.ends[i] && clsTeacher(y, c.id, day, i, ws) === t) hits.push([clsCell(y, c.id, day, i, ws), c.name]); });
    });
    if (!hits.length) return null;
    const subs = [...new Set(hits.map(h => h[0]))];
    return { type: 'class', note: `${subs.join('، ')} · ${hits.map(h => h[1]).join(' و ')}`, tt: true };
  }
  return { isReal: (schoolId, g) => !!REAL[schoolId + ':' + g], DAYS, BELLS, BELL_TIMES, BELL_ENDS, BREAK, withBreak, bellsOf, SUBJECTS, GRADE_NAME, TEACHER_SUBJECT, TESTS, MATH_DOMAINS, MARK_TYPES, DEFAULT_WEIGHTS,
    get, org, save, reset, uid, clearSample, teachersFor, shift, dayIndex, weekStart, meCell, clsCell, clsTeacher, guideOf, gradesOf, teacherGrade, initials, photoOf,
    today: () => iso(new Date()) };
})();
