// An icon for every tab and sub-section in the platform, chosen by the tab's label, so new pages get one by naming alone.
// Line icons on a 24 grid, 1.9 stroke, round caps (the same family as Shell's ICONS). The label always stays: the icon
// is decoration (aria-hidden) and never the only cue.
//   Section tabs (.hub-tabs) get a small tinted tile in the section's colour; the open tab's tile is filled.
//   In-page tabs and segments (.tabs, .seg, .ftabs) get the bare icon before the label.
//   Grade segments («هفتم» … «دوازدهم») get a numbered badge: متوسطه اول teal, متوسطه دوم amber.
// TabIcons.watch(root) decorates what is there now and anything rendered into root later.
const TabIcons = (() => {
  const P = {
    calendarClock: '<rect x="3" y="4" width="13" height="16" rx="2"/><path d="M7 2v4M12 2v4M3 9h13"/><circle cx="17.5" cy="16.5" r="4.5"/><path d="M17.5 14.5v2l1.3 1"/>',
    userCheck: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-1a6 6 0 0 1 9.5-4.9"/><path d="m15 18 2 2 4-4"/>',
    award: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7"/><path d="M14 2v5h5v3"/><circle cx="17.5" cy="15" r="3"/><path d="m16 17.6-1 4.4 2.5-1.3 2.5 1.3-1-4.4"/><path d="M8 9h3M8 13h4"/>',
    barChart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6" width="3" height="12" rx="1"/><rect x="16" y="13" width="3" height="5" rx="1"/>',
    lineChart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-6"/><circle cx="19" cy="7" r="1.2"/>',
    starPerson: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 11-5.7"/><path d="m18 13 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>',
    alertMsg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4M12 14h.01"/>',
    penScore: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/><path d="m15 5 3 3"/>',
    bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    bookClock: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H12"/><path d="M6.5 2H20v9M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22H12"/><circle cx="17.5" cy="17.5" r="4.5"/><path d="M17.5 15.5v2l1.3 1"/>',
    shieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 15.5h.01"/>',
    shieldDoc: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 9h6M9 12.5h6M9 16h3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    plusMinusList: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="M4 6h4M6 4v4M4 18h4"/><path d="M4 12h4" opacity=".5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    mapPin: '<path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    listClock: '<path d="M3 6h10M3 12h7M3 18h6"/><circle cx="17" cy="15" r="5"/><path d="M17 12.5V15l1.6 1"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="6.8" r="1.2"/><circle cx="15" cy="6.8" r="1.2"/>',
    mosque: '<path d="M4 22V12M2 22h20"/><path d="M4 12l-1-2h2z"/><path d="M8 22v-6a4 4 0 0 1 8 0v6"/><path d="M7 14a5 5 0 0 1 10 0"/><path d="M12 7V4"/><path d="M12 4a1.5 1.5 0 1 0 1.2.6"/><path d="M20 22V12M20 12l-1-2h2z"/>',
    tree: '<path d="M12 22v-6"/><path d="M12 2 6 10h3l-4 6h14l-4-6h3z"/>',
    court: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="3"/><path d="M2 9.5h3v5H2M22 9.5h-3v5h3"/>',
    userPlus: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-1a7 7 0 0 1 11.4-5.4"/><path d="M19 14v6M16 17h6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/><path d="M11 13h2v2h-2z"/>',
    fileSign: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 17c1.5-2 2.5-2 3 0s1.5 1 2.5-.5 1.5-.5 2.5.5"/>',
    sitemap: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
    usersKey: '<circle cx="8" cy="7" r="4"/><path d="M1 21v-1a7 7 0 0 1 11-5.7"/><circle cx="17" cy="15" r="2.5"/><path d="m18.8 16.8 3.2 3.2M20.5 18.5 22 17"/>',
    puzzle: '<path d="M10 3h4v2.5a1.5 1.5 0 0 0 3 0V3h4v7h-2.5a1.5 1.5 0 0 0 0 3H21v8h-7v-2.5a1.5 1.5 0 0 0-3 0V21H3v-8h2.5a1.5 1.5 0 0 0 0-3H3V3z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/><path d="M8 15v4.5"/>',
    council: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="12" cy="20.5" r="1.5"/><circle cx="3.5" cy="12" r="1.5"/><circle cx="20.5" cy="12" r="1.5"/>',
    chats: '<path d="M14 9a2 2 0 0 1-2 2H6l-3 3V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z"/><path d="M18 9h1a2 2 0 0 1 2 2v10l-3-3h-6a2 2 0 0 1-2-2v-1"/>',
    calendarCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/><path d="M12 2v6M9.5 5.5 12 8l2.5-2.5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    utensils: '<path d="M7 2v9M4 2v5a3 3 0 0 0 6 0V2M7 11v11"/><path d="M17 2c-2 2-3 5-3 8h3v12"/>',
    basket: '<path d="m5 11 4-7M19 11l-4-7"/><path d="M2 11h20l-2 9a2 2 0 0 1-2 1.6H6A2 2 0 0 1 4 20z"/><path d="M9 15v3M15 15v3"/>',
    store: '<path d="M3 9 4.5 3h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/><path d="M10 21v-5h4v5"/>',
    truck: '<rect x="2" y="6" width="12" height="11" rx="1"/><path d="M14 10h4l4 4v3h-8"/><circle cx="6.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    menuCard: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 6v4M7.5 6v2a1.5 1.5 0 0 0 3 0V6M9 10v7"/><path d="M14 7h3M14 11h3M14 15h3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
    sigma: '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
    flask: '<path d="M9 2h6M10 2v6L4.5 18.5A2.3 2.3 0 0 0 6.5 22h11a2.3 2.3 0 0 0 2-3.5L14 8V2"/><path d="M7 15h10"/>',
    feather: '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2 22M17.5 15H9"/>',
    letters: '<path d="M4 20 8.5 6l4.5 14"/><path d="M5.6 15h5.8"/><path d="M15 9h6M18 6v3"/><path d="M16 17c2.5 0 4-1.5 4-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
    mapFold: '<path d="M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5z"/><path d="M9 3v15.5M15 5.5V21"/>',
    quran: '<path d="M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4zM20 4h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5z"/><path d="M16 8.5l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.3 1 2.3h6c0-1 .3-1.7 1-2.3A7 7 0 0 0 12 2z"/>',
    ball: '<circle cx="12" cy="12" r="10"/><path d="m12 7 4 3-1.5 5h-5L8 10z"/><path d="M12 7V2M16 10l5-2M14.5 15l3 4.5M9.5 15l-3 4.5M8 10 3 8"/>',
    cap: '<path d="m22 10-10-5L2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
    filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15h6"/>',
    board: '<rect x="2" y="3" width="20" height="13" rx="2"/><path d="M12 16v3M8 21l4-2 4 2"/><path d="m7 11 3-3 2 2 4-4"/>',
    radar: '<path d="m12 2 9.5 7-3.6 11H6.1L2.5 9z"/><path d="m12 7 5 3.6-1.9 5.9H8.9L7 10.6z" opacity=".55"/><path d="M12 2v10M21.5 9 12 12M17.9 20 12 12M6.1 20 12 12M2.5 9 12 12"/>',
    hexagon: '<path d="m12 2 8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/>',
    sparkles: '<path d="m12 3 1.8 4.8L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.7z"/><path d="M19 15v4M17 17h4M5 3v3M3.5 4.5h3"/>',
    stairs: '<path d="M3 21h5v-5h5v-5h5V6h3"/><path d="m14 3 4 0 0 4" /><path d="m18 3-5 5"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    clipboard: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 11h6M9 15h4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    groups: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="16" r="3"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 14h2"/><path d="M6 6V5a2 2 0 0 1 2-2h10"/>',
    receipt: '<path d="M5 2v20l2.5-1.5L10 22l2-1.5 2 1.5 2.5-1.5L19 22V2l-2.5 1.5L14 2l-2 1.5L10 2 7.5 3.5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    notebook: '<rect x="5" y="2" width="15" height="20" rx="2"/><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><path d="M10 7h6M10 11h4"/>',
    gamepad: '<path d="M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5.4 1.8L15 15H9l-1.6 1.8A3 3 0 0 1 2 15v-3a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.5" cy="13.5" r=".9"/>',
    approve: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  };
  // Label → icon. Exact labels first; KEYS (a word in the label) catch variants and pages added later.
  const L = {
    'برنامهٔ هفتگی': 'calendarClock', 'حضور و غیاب': 'userCheck', 'حضور و نمره': 'userCheck', 'حضور همهٔ پایه‌ها': 'userCheck',
    'کارنامه‌ها': 'award', 'کارنامه': 'award', 'ثبت نمرهٔ کارنامه': 'award', 'تعریف کارنامه و ضریب‌ها': 'sliders',
    'گزارش وضعیت پایه': 'barChart', 'وضعیت کلی پایه': 'barChart', 'ارزیابی معلمان': 'starPerson', 'اعتراض‌ها': 'alertMsg',
    'نمره': 'penScore', 'نمره‌ها': 'penScore', 'ثبت نمره': 'penScore', 'ثبت نمرات': 'penScore', 'داشبورد نمرات': 'lineChart',
    'مطالعه': 'bookClock', 'ثبت مطالعه': 'bookClock',
    'انضباط': 'shieldAlert', 'انضباط مدرسه': 'shieldAlert', 'موارد انضباطی': 'shieldAlert', 'ثبت مورد انضباطی': 'shieldAlert',
    'کارنامهٔ انضباطی': 'shieldDoc', 'تنظیمات انضباطی': 'sliders', 'موارد و امتیازها': 'plusMinusList',
    'مشاهدات رفتاری': 'eye', 'مشاهده‌ها': 'eye',
    'زنگ مدرسه': 'bell', 'برنامهٔ فضاها': 'mapPin', 'نظامت امروز': 'sun', 'امروز': 'sun', 'نمای کلی': 'home', 'خلاصه': 'fileText',
    'برنامه‌های زنگ': 'listClock', 'گزارش زنگ‌ها': 'history', 'تنظیمات': 'gear',
    'کارگاه': 'palette', 'نمازخانه': 'mosque', 'حیاط': 'tree', 'سالن': 'court',
    'پذیرش دانش‌آموز': 'userPlus', 'امور استخدام': 'briefcase', 'کارتابل استخدام': 'briefcase', 'قراردادها': 'fileSign',
    'نمودار سازمانی': 'sitemap', 'کاربران و نقش‌ها': 'usersKey', 'اشتراک و ماژول‌ها': 'puzzle',
    'نامه‌ها': 'mail', 'اطلاعیه‌ها': 'megaphone', 'شورای مدرسه': 'council', 'گفتگو': 'chats', 'تأیید رویدادها': 'calendarCheck',
    'دریافتی': 'inbox', 'ارسالی': 'send', 'تغذیه': 'utensils', 'تعاون': 'basket',
    'پیگیری تغذیه': 'truck', 'منوی غذا': 'menuCard', 'مدیریت تعاون': 'store',
    'ریاضی': 'sigma', 'علوم': 'flask', 'ادبیات فارسی': 'feather', 'عربی': 'letters', 'زبان انگلیسی': 'globe',
    'مطالعات اجتماعی': 'mapFold', 'قرآن و پیام‌ها': 'quran', 'تفکر و سبک زندگی': 'bulb', 'ورزش': 'ball', 'هنر': 'palette',
    'دانش‌آموزان': 'cap', 'درخواست آزمون و ماژول': 'filePlus', 'کلاس‌ها': 'board',
    'تست نئو': 'radar', 'تست هالند': 'hexagon', 'تست گاردنر': 'sparkles', 'پیش‌نیازها': 'stairs', 'سوابق تحصیلی': 'archive',
    'جمع‌بندی و راهبرد': 'compass', 'جلسات مشاوره': 'chats',
    'آزمون‌ها': 'clipboard', 'بانک سؤال': 'database', 'آزمون‌ها و بانک سؤال': 'clipboard',
    'درس': 'bookOpen', 'شرکت‌کنندگان': 'users', 'فعالیت‌ها': 'activity', 'تکمیل فعالیت‌ها': 'checkCircle', 'گروه‌ها': 'groups',
    'سؤال‌ها': 'help', 'نتیجه‌ها': 'trophy', 'تحلیل سؤال‌ها': 'pie',
    'دهکده دانش': 'gamepad', 'امروز من': 'sun', 'نمره‌های من': 'penScore', 'تکالیف و آزمون‌ها': 'clipboard', 'انضباط من': 'shieldAlert', 'جلسه‌ها با مدرسه': 'chats',
    'کیف پول‌ها': 'wallet', 'هزینه‌ها': 'receipt', 'جلسه با خانواده‌ها': 'chats', 'تأیید و انتشار': 'approve',
  };
  const KEYS = [['انضباط', 'shieldAlert'], ['مشاهد', 'eye'], ['نمره', 'penScore'], ['کارنامه', 'award'], ['حضور', 'userCheck'], ['زنگ', 'bell'],
    ['فضا', 'mapPin'], ['آزمون', 'clipboard'], ['تنظیم', 'gear'], ['گزارش', 'barChart'], ['برنامه', 'calendarClock'], ['جلسه', 'chats'],
    ['نامه', 'mail'], ['کلاس', 'board'], ['تعاون', 'basket'], ['تغذیه', 'utensils'], ['پذیرش', 'userPlus'], ['استخدام', 'briefcase'], ['کاربر', 'usersKey']];
  const GRADES = { 'هفتم': 7, 'هشتم': 8, 'نهم': 9, 'دهم': 10, 'یازدهم': 11, 'دوازدهم': 12 };
  const svg = (k, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[k]}</svg>`;
  // The tab's own words: its text without counts, badges or brackets.
  const label = el => [...el.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('.pill, .badge, b, svg, .ti-grade'))).map(n => n.textContent).join(' ')
    .replace(/[()\d۰-۹✓]/g, '').replace(/\s+/g, ' ').trim();
  const pick = t => L[t] || KEYS.find(([w]) => t.includes(w))?.[1];

  // A tab row wider than its box fades at the far (left) edge until scrolled to the end; the wheel scrolls it sideways.
  function fades(root) {
    root.querySelectorAll('.hub-tabs').forEach(n => {
      const upd = () => n.classList.toggle('more', n.scrollWidth - n.clientWidth - Math.abs(n.scrollLeft) > 4);
      if (!n.dataset.tf) { n.dataset.tf = '1'; n.addEventListener('scroll', upd, { passive: true });
        n.addEventListener('wheel', e => { if (n.scrollWidth > n.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { n.scrollLeft -= e.deltaY; e.preventDefault(); } }, { passive: false }); }
      upd();
      // Keep the open tab in sight when the row is scrolled (phones), once per page.
      const on = n.querySelector('.on');
      if (on && n.dataset.tfOn !== on.getAttribute('href')) { n.dataset.tfOn = on.getAttribute('href'); const r = on.getBoundingClientRect(), b = n.getBoundingClientRect();
        if (r.left < b.left || r.right > b.right) n.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2); upd(); }
    });
  }
  function decorate(root) {
    root.querySelectorAll('.hub-tabs a, .tabs [role=tab], .tabs > button, .seg > button, .ftabs > a, .ftabs > button').forEach(el => {
      if (el.dataset.ti) return; el.dataset.ti = '1';
      const t = label(el);
      if (GRADES[t]) { el.insertAdjacentHTML('afterbegin', `<span class="ti-grade ${GRADES[t] > 9 ? 'g2' : 'g1'}" aria-hidden="true">${GRADES[t].toLocaleString('fa-IR')}</span>`); return; }
      if (el.querySelector('svg')) return;
      const k = pick(t); if (!k) return;
      el.insertAdjacentHTML('afterbegin', el.closest('.hub-tabs') ? `<span class="ti-tile" aria-hidden="true">${svg(k, 'icon')}</span>` : svg(k, 'icon ti'));
    });
    fades(root); // after the icons, so the row's widths are final
  }
  function watch(root) {
    decorate(root); addEventListener('resize', () => fades(root));
    let queued = false;
    new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; decorate(root); }); }).observe(root, { childList: true, subtree: true });
  }
  return { watch, decorate, icon: (k, cls = 'icon') => P[k] ? svg(k, cls) : '', forLabel: (t, cls = 'icon') => { const k = pick(t); return k ? svg(k, cls) : ''; } };
})();
