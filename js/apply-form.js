// The two application forms of the portal: hiring (apply.html) and student enrolment (enroll.html), with their
// sections and fields from the school's current forms. Shared by the portal and the cartables, which show a sent form read only.
const ApplyForm = (() => {
  const { esc, fa } = UI;
  const yes = ['بله', 'خیر'];
  // Field: [key, label, type, options/extra]. Types: text, tel, num, date, select, textarea, file, yesno.
  // extra.check: 'mobile' | 'nid' | 'postal' is checked before sending; extra.accept narrows a file field.
  const SECTIONS = [
    { id: 'personal', title: 'مشخصات فردی', desc: 'نام و کد ملی از ورود شما آمده است.', fields: [
      ['first', 'نام', 'text', { req: true }], ['last', 'نام خانوادگی', 'text', { req: true }], ['gender', 'جنسیت', 'select', { req: true, opts: ['مرد', 'زن'] }],
      ['birth', 'تاریخ تولد', 'date', { req: true }], ['birthPlace', 'محل تولد', 'text', { req: true }], ['father', 'نام پدر', 'text', { req: true }],
      ['marital', 'وضعیت تأهل', 'select', { req: true, opts: ['مجرد', 'متأهل'] }], ['phone', 'تلفن همراه', 'tel', { req: true, ph: '۰۹۱۲۱۲۳۴۵۶۷' }],
      ['email', 'ایمیل', 'text', { ltr: true }], ['address', 'آدرس', 'textarea', { req: true, wide: true }]] },
    { id: 'family', title: 'اعضای خانواده', rows: true, add: 'افزودن عضو خانواده', fields: [
      ['relation', 'نسبت', 'select', { req: true, opts: ['پدر', 'مادر', 'همسر', 'فرزند', 'برادر', 'خواهر'] }], ['first', 'نام', 'text', { req: true }], ['last', 'نام خانوادگی', 'text', { req: true }],
      ['edu', 'مدرک تحصیلی', 'text'], ['job', 'شغل', 'text'], ['birth', 'تاریخ تولد', 'date'], ['alive', 'در قید حیات', 'yesno'], ['dependent', 'تحت تکفل', 'yesno']] },
    { id: 'edu', title: 'سوابق و مدارک تحصیلی', rows: true, min: 1, add: 'افزودن مدرک تحصیلی', fields: [
      ['title', 'مقطع', 'select', { req: true, opts: ['دیپلم', 'کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکتری', 'سطح حوزوی'] }], ['field', 'رشتهٔ تحصیلی', 'text', { req: true }],
      ['year', 'سال اخذ', 'num', { ph: '۱۴۰۰' }], ['school', 'دانشگاه یا محل تحصیل', 'text', { req: true }],
      ['type', 'نوع آموزشگاه', 'select', { opts: ['دولتی', 'غیرانتفاعی', 'آزاد', 'پیام نور', 'فرهنگیان', 'حوزه', 'خارج از کشور'] }],
      ['status', 'وضعیت تحصیل', 'select', { req: true, opts: ['فارغ‌التحصیل', 'در حال تحصیل', 'انصراف'] }], ['credits', 'واحد گذرانده (اگر در حال تحصیلید)', 'num'], ['file', 'تصویر مدرک', 'file']] },
    { id: 'work', title: 'سوابق کاری', rows: true, add: 'افزودن سابقهٔ کاری', fields: [
      ['title', 'عنوان شغلی', 'text', { req: true }], ['place', 'محل کار', 'text', { req: true }], ['from', 'سال شروع', 'num', { ph: '۱۳۹۸' }], ['to', 'سال پایان (خالی یعنی هنوز)', 'num'],
      ['address', 'آدرس محل کار', 'text'], ['desc', 'توضیحات', 'textarea', { wide: true }]] },
    { id: 'works', title: 'تألیفات و موفقیت‌ها', desc: 'علمی، فرهنگی و هنری', rows: true, add: 'افزودن تألیف یا موفقیت', fields: [
      ['title', 'عنوان', 'text', { req: true }], ['year', 'سال', 'num'], ['desc', 'توضیحات', 'textarea', { wide: true }]] },
    { id: 'training', title: 'آموزش ضمن خدمت', rows: true, add: 'افزودن دورهٔ آموزشی', fields: [
      ['title', 'عنوان دوره', 'text', { req: true }], ['year', 'سال', 'num'], ['hours', 'تعداد ساعت', 'num'], ['institute', 'آموزشگاه', 'text'],
      ['cert', 'گواهی‌نامه دارد؟', 'yesno'], ['file', 'فایل گواهی‌نامه', 'file'], ['desc', 'توضیحات', 'textarea', { wide: true }]] },
    { id: 'refs', title: 'معرف بیرونی', desc: 'سه نفر از معتمدین (غیر شاغل در مجموعه) که شناخت کافی از شما دارند؛ ترجیحاً در حوزهٔ آموزشی.', rows: true, min: 3, add: 'افزودن معرف', fields: [
      ['name', 'نام و نام خانوادگی', 'text', { req: true }], ['years', 'مدت آشنایی (سال)', 'num', { req: true }], ['phone', 'تلفن تماس', 'tel', { req: true }], ['address', 'آدرس', 'text']] },
    { id: 'interest', title: 'زمینه‌های علاقه‌مندی', desc: 'زمینه‌های همکاری با مجموعه را انتخاب کنید.', fields: [
      ['areas', 'زمینه‌ها', 'multi', { req: true, opts: ['تدریس', 'معلم راهنما', 'مشاوره', 'معاونت آموزشی', 'معاونت پرورشی', 'معاونت اجرایی', 'امور اداری', 'امور مالی', 'فناوری اطلاعات', 'کتابداری', 'آزمایشگاه', 'خدمات'] }],
      ['more', 'جزئیات بیشتر از تمایل به همکاری (اگر به تدریس علاقه دارید، حتماً درس‌های مورد نظر را بنویسید)', 'textarea', { wide: true }]] },
    { id: 'docs', title: 'اسناد و مدارک', desc: 'عکس یا اسکن خوانا؛ هر فایل حداکثر ۲ مگابایت.', fields: [
      ['photo', 'عکس پرسنلی', 'file'], ['id1', 'صفحهٔ اول شناسنامه', 'file', { req: true }], ['id2', 'صفحهٔ دوم شناسنامه', 'file'],
      ['card', 'کارت ملی', 'file', { req: true }], ['military', 'کارت پایان خدمت (آقایان)', 'file', { men: true }]] },
  ];
  // Student enrolment (the school's current form): the student, both parents, family, schooling, documents.
  const EDU = ['زیر دیپلم', 'دیپلم', 'کاردانی', 'کارشناسی', 'کارشناسی ارشد', 'دکتری', 'سطح حوزوی'];
  const GRADES = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'];
  const parent = (who, lastReq) => [
    ['first', `نام ${who}`, 'text', { req: true }], ['last', `نام خانوادگی ${who}`, 'text', { req: lastReq }], ['birth', `تاریخ تولد ${who}`, 'date', { req: true }],
    ['mobile', `تلفن همراه ${who}`, 'tel', { req: true, check: 'mobile', ph: '۰۹۱۲۱۲۳۴۵۶۷' }], ['nid', `کد ملی ${who}`, 'tel', { req: true, check: 'nid' }],
    ['job', `شغل ${who}`, 'text'], ['edu', `تحصیلات ${who}`, 'select', { req: true, opts: EDU }], ['field', `رشتهٔ تحصیلی ${who}`, 'text', { req: true }],
    ['uni', `دانشگاه ${who}`, 'text'], ['workPhone', `تلفن محل کار ${who}`, 'tel'], ['workAddress', `آدرس محل کار ${who}`, 'textarea', { wide: true }]];
  const ENROLL = [
    { id: 'student', title: 'اطلاعات دانش‌آموز', desc: 'کد ملی دانش‌آموز از ورود شما آمده است.', fields: [
      ['first', 'نام', 'text', { req: true }], ['last', 'نام خانوادگی', 'text', { req: true }], ['grade', 'پایهٔ درخواستی', 'select', { req: true, opts: GRADES.slice(6) }],
      ['birth', 'تاریخ تولد', 'date', { req: true }], ['birthPlace', 'محل تولد', 'text', { req: true }], ['gender', 'جنسیت', 'select', { req: true, opts: ['پسر', 'دختر'] }],
      ['phone', 'تلفن منزل', 'tel', { req: true }], ['postal', 'کد پستی منزل', 'tel', { req: true, check: 'postal', ph: '۱۰ رقم' }], ['address', 'آدرس', 'textarea', { req: true, wide: true }]] },
    { id: 'father', title: 'اطلاعات پدر دانش‌آموز', fields: parent('پدر', false) },
    { id: 'mother', title: 'اطلاعات مادر دانش‌آموز', fields: parent('مادر', true) },
    { id: 'family', title: 'مشخصات اعضای خانواده', desc: 'همهٔ کسانی که با دانش‌آموز زندگی می‌کنند، از جمله پدر و مادر.', rows: true, add: 'افزودن عضو جدید', fields: [
      ['relation', 'نسبت', 'select', { req: true, opts: ['پدر', 'مادر', 'برادر', 'خواهر', 'پدربزرگ', 'مادربزرگ', 'سایر'] }], ['first', 'نام', 'text', { req: true }], ['last', 'نام خانوادگی', 'text', { req: true }],
      ['edu', 'مدرک تحصیلی', 'text'], ['job', 'شغل', 'text'], ['birth', 'تاریخ تولد', 'date']] },
    { id: 'schools', title: 'سوابق تحصیلی', desc: 'مدرسه‌هایی که دانش‌آموز تاکنون در آن‌ها درس خوانده است.', rows: true, min: 1, add: 'افزودن سابقهٔ تحصیلی', fields: [
      ['fromYear', 'شروع سال تحصیلی از', 'text', { req: true, ph: '۱۳۹۹ - ۱۴۰۰' }], ['toYear', 'پایان سال تحصیلی تا', 'text', { req: true, ph: '۱۴۰۳ - ۱۴۰۴' }],
      ['fromGrade', 'از کلاس', 'select', { req: true, opts: GRADES.map(g => 'پایهٔ ' + g) }], ['toGrade', 'تا کلاس', 'select', { req: true, opts: GRADES.map(g => 'پایهٔ ' + g) }],
      ['school', 'نام مدرسه', 'text', { req: true }], ['address', 'آدرس مدرسه', 'text'], ['phone', 'تلفن مدرسه', 'tel']] },
    { id: 'docs', title: 'مدارک', desc: 'تصویر یا اسکن خوانا؛ هر فایل حداکثر ۲ مگابایت.', notes: [
        'عکس ۳×۴ رنگی و با زمینهٔ سفید باشد.', 'عکس اسکن‌شده با پسوند JPEG باشد.', 'رزولوشن عکس اسکن‌شده دست‌کم ۳۰۰ dpi باشد.',
        'عکس شفاف و واضح، از تمام صورت، مشخص و بدون اثر مهر، منگنه، لکه، حاشیهٔ زائد و کادر دور عکس باشد.', 'عکس چرخش یا زاویه نداشته باشد.',
        'عکس بدون عینک آفتابی، کلاه و مانند آن باشد.', 'در عکس فقط چهره و شانه‌ها دیده شود.', 'دانش‌آموز مستقیم به دوربین نگاه کند.'], fields: [
      ['photo', 'عکس ۳×۴ دانش‌آموز (JPEG)', 'file', { req: true, accept: 'image/jpeg' }], ['id1', 'صفحهٔ اول شناسنامهٔ دانش‌آموز', 'file', { req: true }],
      ['id2', 'صفحهٔ دوم شناسنامهٔ دانش‌آموز', 'file'], ['card', 'کارت ملی دانش‌آموز', 'file'], ['report', 'کارنامهٔ آخرین سال تحصیلی', 'file', { req: true }],
      ['fatherCard', 'کارت ملی پدر', 'file'], ['motherCard', 'کارت ملی مادر', 'file'], ['other', 'مدرک دیگر', 'file']] },
  ];
  const digits = x => String(x ?? '').replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const show = (f, v) => {
    const [, , type] = f;
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '<span class="muted">—</span>';
    if (type === 'date') return esc(JDate.format(v));
    if (type === 'file') return /^data:image/.test(v.data) ? `<img class="ap-thumb" src="${esc(v.data)}" alt="${esc(f[1])}">` : `<a href="${esc(v.data)}" download="${esc(v.name)}">${esc(v.name)}</a>`;
    if (type === 'multi') return v.map(x => `<span class="tag grey">${esc(x)}</span>`).join(' ');
    return esc(digits(v));
  };
  // What is still missing, per section: [sectionId, message].
  function missing(form, sections = SECTIONS) {
    const out = [], p = form.personal || {};
    sections.forEach(s => {
      if (s.rows) {
        const rows = form[s.id] || [];
        if (s.min && rows.length < s.min) out.push([s.id, s.min === 1 ? 'دست‌کم یک مورد لازم است.' : `${fa(s.min)} مورد لازم است (${fa(rows.length)} ثبت شده).`]);
      } else {
        const d = form[s.id] || {};
        s.fields.forEach(f => {
          const val = d[f[0]], c = f[3]?.check, n = normDigits(val);
          if (f[3]?.req && !(f[3]?.men && p.gender !== 'مرد') && (val == null || val === '' || (Array.isArray(val) && !val.length))) return out.push([s.id, `«${f[1]}» خالی است.`]);
          if (!val || !c) return;
          if (c === 'mobile' && !/^09\d{9}$/.test(n)) out.push([s.id, `«${f[1]}» باید ۱۱ رقم و با ۰۹ شروع شود.`]);
          if (c === 'nid' && !validNid(n)) out.push([s.id, `«${f[1]}» درست نیست.`]);
          if (c === 'postal' && !/^\d{10}$/.test(n)) out.push([s.id, `«${f[1]}» باید ۱۰ رقم باشد.`]);
        });
      }
    });
    if (p.phone && !/^09\d{9}$/.test(normDigits(p.phone))) out.push(['personal', 'تلفن همراه باید ۱۱ رقم و با ۰۹ شروع شود.']);
    return out;
  }
  const normDigits = s => String(s ?? '').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\s/g, '');
  // The whole form, read only (for the principal, and for the applicant after sending).
  function view(form, sections = SECTIONS) {
    return sections.map(s => {
      const body = s.rows
        ? ((form[s.id] || []).length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(s.title)}"><table class="no-cards ap-table"><thead><tr><th>ردیف</th>${s.fields.map(f => `<th>${esc(f[1])}</th>`).join('')}</tr></thead><tbody>
            ${(form[s.id] || []).map((r, i) => `<tr><td class="num">${fa(i + 1)}</td>${s.fields.map(f => `<td>${show(f, r[f[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted small">موردی ثبت نشده.</p>')
        : `<dl class="ap-dl">${s.fields.filter(f => !(f[3]?.men && form.personal?.gender !== 'مرد')).map(f => `<div class="${f[3]?.wide ? 'wide' : ''}"><dt>${esc(f[1])}</dt><dd>${show(f, (form[s.id] || {})[f[0]])}</dd></div>`).join('')}</dl>`;
      return `<section class="card ap-sec"><h2>${esc(s.title)}</h2>${body}</section>`;
    }).join('');
  }
  // Iranian national ID: ten digits with a check digit.
  function validNid(raw) {
    const s = normDigits(raw); if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false;
    const sum = [...s.slice(0, 9)].reduce((a, d, i) => a + +d * (10 - i), 0) % 11, c = +s[9];
    return sum < 2 ? c === sum : c === 11 - sum;
  }
  return { SECTIONS, ENROLL, missing, view, validNid, normDigits, show, digits };
})();
