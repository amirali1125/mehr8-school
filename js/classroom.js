// Class pages, the «کلاس‌ها» section: one page per subject, shaped like a Moodle course.
//   A page has the online-class link and sections («عمومی» plus any the teacher adds, e.g. one per chapter). A section holds
//   five kinds of item, each with Moodle's settings form (cr-kit.js): تکلیف (assignment: submission types, feedback types,
//   attempts, group submission, notifications, grade with scale/rubric/marking guide, blind marking, marking workflow),
//   آزمون (cr-quiz.js), سؤال چندگزینه‌ای (Moodle's Choice: one question, many options), فایل and پیوند.
//   Every item also has the common module settings, restrict access, activity completion and tags.
//   Tabs: درس، نمره‌ها (grade book of the page), تکمیل فعالیت‌ها (completion report), گروه‌ها (student groups of this subject).
//   «از نگاه دانش‌آموز» shows the page as one student sees it; what is done there is saved as that student's, until students sign in.
//   Graded items with a «دستهٔ نمره» send released grades to «ثبت نمره» (x.grades, linked by src).
// Data: x.classroom[subject] = { link, secs: [{ id, title }], items: [...], groups: [{ id, name, sids }] }.
const Classroom = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const K = CRKit, D = SchoolData, J = JDate;
  const { data, save, student, className, render, empty } = ctx;
  const d = () => data();
  const ro = () => ctx.readOnly();
  const today = J.todayIso();
  const state = { sub: '', tab: 'course', item: '', as: '', edit: false, grp: '', gbCls: '', col: new Set(), bulk: false, picked: new Set() };
  const done = msg => { save(); close(); render(); if (msg) toast(msg); };
  const subjectsFor = () => ctx.role() === 'teacher' ? [D.TEACHER_SUBJECT] : d().termSubjects;
  const C = (sub = state.sub) => Classroom.course(d(), sub);
  const items = () => C().items;
  const find = id => items().find(i => i.id === id);
  const me = () => (typeof Auth !== 'undefined' && Auth.user()?.name) || 'معلم';
  const scope = it => d().students.filter(s => !it.cls || s.cls === it.cls);
  const groups = () => C().groups;
  const groupOf = sid => groups().find(g => g.sids.includes(sid));
  const gName = id => groups().find(g => g.id === id)?.name || '—';
  const SV = p => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const TYPES = {
    assign: ['تکلیف', 'rose', SV('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3"/>'), 'دانش‌آموز پاسخ را به صورت متن یا فایل می‌فرستد و نمره و بازخورد می‌گیرد.'],
    quiz: ['آزمون', 'violet', SV('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h3M8 12h3M8 16h3M14 8l1.2 1.2L17.5 7M14 12l1.2 1.2 2.3-2.2M14 16l1.2 1.2 2.3-2.2"/>'), 'آزمون چندگزینه‌ای با زمان‌بندی، چند تلاش، تصحیح خودکار و تنظیمات مرور.'],
    choice: ['سؤال چندگزینه‌ای', 'amber', SV('<path d="M12 21v-8M12 13 6 7M12 13l6-6M6 7V3.5M3.5 6 6 3.5 8.5 6M18 7V3.5M15.5 6 18 3.5 20.5 6"/>'), 'یک سؤال با چند گزینه (نظرسنجی کلاس)؛ نتیجه را با یا بدون نام می‌بینید.'],
    file: ['فایل', 'teal', SV('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 17v-6M9 14h6"/>'), 'جزوه، کتاب، تصویر، صدا یا هر فایلی برای دانش‌آموزان.'],
    url: ['پیوند', 'blue', SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'), 'نشانی یک صفحه، ویدیو یا منبع در اینترنت.'],
  };
  const tile = t => `<span class="tile cr-ic" style="--tone-bg:var(--${TYPES[t][1]}-bg);--tone-ink:var(--${TYPES[t][1]})">${TYPES[t][2]}</span>`;
  const SCALES = { desc4: ['نیاز به تلاش بیشتر', 'قابل قبول', 'خوب', 'خیلی خوب'], pass2: ['ناتمام', 'تمام'] };
  const WF = [['notmarked', 'تصحیح نشده'], ['inmarking', 'در حال تصحیح'], ['readyforreview', 'تصحیح تمام شده'], ['inreview', 'در حال بازبینی'], ['readyforrelease', 'آمادهٔ انتشار'], ['released', 'منتشر شده']];
  const FTYPES = [['اسناد', '.pdf .doc .docx .odt .txt .rtf'], ['تصویر', '.jpg .jpeg .png .gif .webp'], ['صوت', '.mp3 .m4a .ogg .wav'], ['ویدیو', '.mp4 .webm .mov'],
    ['صفحه‌گسترده', '.xls .xlsx .csv .ods'], ['ارائه', '.ppt .pptx .odp'], ['فشرده', '.zip .rar .7z']];

  /* ---------------- grades and completion ---------------- */
  const blindName = (it, sid) => { const ids = scope(it).map(s => s.id).sort((a, b) => ((a + it.id).split('').reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7)) - ((b + it.id).split('').reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7))); return `شرکت‌کنندهٔ ${fa(ids.indexOf(sid) + 1)}`; };
  const who = (it, sid) => it.grade?.blind && !it.revealed ? blindName(it, sid) : student(sid)?.name || '—';
  const subKey = (it, sid) => it.group && groupOf(sid) ? 'g:' + groupOf(sid).id : sid;
  const subOf = (it, sid) => it.subs?.[subKey(it, sid)] || null;
  const released = m => m && (m.score != null) && (!m.wfOn || m.wf === 'released');
  // The assignment grade a student may see, as { score, pct, text } — or null.
  function aGrade(it, sid, teacher) {
    const m = it.marks?.[sid]; if (!m || m.score == null || (!teacher && it.grade.workflow && m.wf !== 'released')) return null;
    if (it.grade.type === 'scale') { const sc = SCALES[it.grade.scale]; return { score: m.score, pct: sc.length > 1 ? m.score / (sc.length - 1) * 100 : 100, text: sc[m.score] }; }
    return { score: m.score, pct: m.score / it.grade.max * 100, text: `${fa(Math.round(m.score * 100) / 100)} از ${fa(it.grade.max)}` };
  }
  const gradeOf = (it, sid, teacher) => it.type === 'assign' ? aGrade(it, sid, teacher) : it.type === 'quiz' ? Q.grade(it, sid) : null;
  const pct = (it, sid) => gradeOf(it, sid)?.pct ?? null;
  const passed = (it, sid) => {
    const g = gradeOf(it, sid); if (!g || it.grade.pass === '' || it.grade.pass == null) return !!g;
    return it.type === 'assign' && it.grade.type === 'scale' ? g.score + 1 >= +it.grade.pass : g.score >= +it.grade.pass;
  };
  function completed(it, sid) {
    const cp = it.comp || {}; if (cp.mode === 'manual') return !!it.done?.[sid]; if (cp.mode !== 'auto') return null;
    const c = [];
    if (cp.view) c.push(!!it.views?.[sid]);
    if (cp.submit) c.push(subOf(it, sid)?.status === 'submitted');
    if (cp.answer) c.push(!!(it.resp?.[sid] || []).length);
    if (cp.grade) c.push(!!gradeOf(it, sid));
    if (cp.pass) c.push(passed(it, sid) || (cp.passOrAll && Q.used(it, sid)));
    if (cp.minAtt) c.push(Q.finished(it, sid).length >= cp.minAtt);
    return c.every(Boolean);
  }
  const envFor = s => ({ now: K.now(), s, pct: id => { const it = find(id); return it ? pct(it, s.id) : null; }, inGroup: gid => !!groups().find(g => g.id === gid)?.sids.includes(s.id) });
  const names = { item: id => find(id)?.title || 'فعالیت حذف‌شده', cls: id => className(id), group: gName };
  const open = (it, s) => K.evalSet(it.restrict, envFor(s));
  const listedFor = (it, s) => it.vis === 'show' && (!it.cls || it.cls === s.cls);
  // Released grades of a graded item go to «ثبت نمره», one grade item per class.
  function sync(it) {
    const cat = it.grade?.cat; if (!cat || (it.type === 'assign' && it.grade.type !== 'point')) return;
    const x = d(), by = {};
    scope(it).forEach(s => { const g = gradeOf(it, s.id); if (g) (by[s.cls] = by[s.cls] || {})[s.id] = Math.round(g.pct / 100 * it.grade.max * 100) / 100; });
    Object.entries(by).forEach(([cls, scores]) => {
      let g = x.grades.find(i => i.src === it.id && i.cls === cls);
      if (!g) { g = { id: D.uid('g'), src: it.id, cls, subject: state.sub, scores: {} }; x.grades.push(g); }
      Object.assign(g, { type: cat, title: it.title, max: it.grade.max, date: (it.due || it.close || K.now()).slice(0, 10), scores });
    });
  }

  /* ---------------- item forms ---------------- */
  const BASE = () => ({ sec: 'gen', desc: '', showDesc: false, cls: '', vis: 'show', idnum: '', lang: '', gmode: 'none', restrict: { op: 'all', list: [] }, comp: { mode: 'none' }, tags: [], views: {}, done: {} });
  const plus = (days, time) => `${D.shift(days, today)}T${time}`;
  const DEF = {
    assign: () => ({ activity: '', files: [], filesOnSubmit: false, allowFrom: plus(0, '08:00'), due: plus(7, '23:59'), cutoff: null, gradeBy: plus(14, '23:59'), alwaysDesc: true,
      st: { text: false, words: 0, file: true, maxFiles: 1, maxKB: 500, types: '' }, fb: { comments: true, offline: false, files: false, inline: false },
      submitBtn: false, statement: false, attempts: 1, reopen: 'none', group: false, groupReq: false, groupAll: false, notify: { graders: false, late: false, students: true },
      grade: { type: 'point', max: 20, scale: 'desc4', method: 'simple', criteria: [], cat: 'hw', pass: '', blind: false, hideGrader: false, workflow: false }, subs: {}, marks: {}, comp: { mode: 'auto', submit: true } }),
    quiz: () => Q.defaults(),
    choice: () => ({ options: ['', '', ''], limits: [0, 0, 0], limit: false, allowUpdate: false, multi: false, layout: 'v', open: null, close: null, preview: false, showRes: 'after', names: 'anon', unanswered: false, resp: {} }),
    file: () => ({ files: [], display: 'auto', popW: 620, popH: 450, showSize: false, showType: false, showDate: false, showRDesc: true, comp: { mode: 'auto', view: true } }),
    url: () => ({ url: '', display: 'auto', popW: 620, popH: 450, showRDesc: true, comp: { mode: 'auto', view: true } }),
  };
  const CAPS = { assign: ['view', 'submit', 'grade', 'pass'], quiz: ['view', 'minAtt', 'grade', 'pass'], choice: ['view', 'answer'], file: ['view'], url: ['view'] };
  const where = it => K.row('کلاس', K.sel('f-cls', [['', 'همهٔ کلاس‌ها'], ...d().classes.map(c => [c.id, c.name])], it.cls || ''), '', 'f-cls')
    + K.row('بخش درس', K.sel('f-sec', secOpts(), it.sec || 'gen'), '', 'f-sec');
  const secOpts = () => C().secs.filter(k => !k.parent).flatMap(k => [[k.id, k.title], ...C().secs.filter(x => x.parent === k.id).map(x => [x.id, `— ${x.title}`])]);
  const generalHead = (it, nameL) => K.row(`${nameL} <span class="req" aria-hidden="true">*</span>`, `<input class="input" id="f-t" value="${esc(it.title || '')}" required>`, '', 'f-t') + where(it)
    + K.row(it.type === 'file' || it.type === 'url' ? 'توصیف' : it.type === 'quiz' ? 'معرفی' : it.type === 'assign' ? 'توضیح تکلیف' : 'توضیح', K.rich('f-desc', it.desc, 'توضیح'))
    + K.row('', K.chk('f-sd', it.showDesc, 'نمایش شرح در صفحهٔ درس'));
  const display = (it, opts) => K.row('نمایش', K.sel('f-disp', opts, it.display), 'خودکار: تصویر و PDF درون صفحه، بقیه برای دانلود.', 'f-disp')
    + `<div class="cr-pop" ${it.display === 'popup' ? '' : 'hidden'}>${K.row('عرض پنجره (پیکسل)', `<input class="input num" id="f-pw" value="${it.popW}">`, '', 'f-pw')}${K.row('ارتفاع پنجره (پیکسل)', `<input class="input num" id="f-ph" value="${it.popH}">`, '', 'f-ph')}</div>`;
  const DISP_F = [['auto', 'خودکار'], ['embed', 'جاسازی'], ['download', 'دانلود اجباری'], ['open', 'باز کردن'], ['popup', 'در پنجرهٔ بازشو']];
  const DISP_U = [['auto', 'خودکار'], ['embed', 'جاسازی'], ['open', 'باز کردن'], ['popup', 'در پنجرهٔ بازشو']];
  function formBody(it) {
    const t = it.type;
    if (t === 'file') return K.sec('عمومی', generalHead(it, 'نام') + K.row('انتخاب فایل‌ها', K.filesField('f-files', it.files), 'حداکثر اندازهٔ هر فایل در نسخهٔ نمایشی ۵۰۰ کیلوبایت است؛ در نسخهٔ واقعی سقف را سرور تعیین می‌کند.'))
      + K.sec('ظاهر', display(it, DISP_F) + K.row('', K.chk('f-size', it.showSize, 'نمایش اندازه') + K.chk('f-type', it.showType, 'نمایش نوع فایل') + K.chk('f-date', it.showDate, 'نمایش تاریخ ارسال/تغییر') + K.chk('f-rd', it.showRDesc, 'نمایش توصیف منبع')));
    if (t === 'url') return K.sec('عمومی', K.row('نام <span class="req" aria-hidden="true">*</span>', `<input class="input" id="f-t" value="${esc(it.title || '')}">`, '', 'f-t')
        + K.row('نشانی خارجی <span class="req" aria-hidden="true">*</span>', `<input class="input" id="f-url" dir="ltr" value="${esc(it.url)}" placeholder="https://">`, '', 'f-url') + where(it)
        + K.row('توصیف', K.rich('f-desc', it.desc, 'توصیف')) + K.row('', K.chk('f-sd', it.showDesc, 'نمایش شرح در صفحهٔ درس')))
      + K.sec('ظاهر', display(it, DISP_U) + K.row('', K.chk('f-rd', it.showRDesc, 'نمایش توصیف منبع')));
    if (t === 'choice') return K.sec('عمومی', generalHead(it, 'نام سؤال') + K.row('نمایش گزینه‌ها', K.sel('f-lay', [['v', 'عمودی'], ['h', 'افقی']], it.layout), '', 'f-lay'))
      + K.sec('گزینه‌ها', K.row('اجازهٔ تغییر انتخاب', K.yn('f-upd', it.allowUpdate), '', 'f-upd') + K.row('انتخاب بیش از یک گزینه', K.yn('f-multi', it.multi), '', 'f-multi')
        + K.row('محدود کردن تعداد پاسخ‌ها', K.yn('f-lim', it.limit), 'اگر روشن باشد، وقتی گزینه‌ای پر شد دیگر انتخاب نمی‌شود.', 'f-lim')
        + `<div id="opt-box">${it.options.map((o, i) => optRow(o, it.limits[i], i)).join('')}</div><div class="cr-row"><span class="cr-l"></span><div class="cr-c"><button type="button" class="btn sm" data-opt-add>+ گزینهٔ دیگر</button></div></div>`)
      + K.sec('در دسترس بودن', K.row('اجازهٔ پاسخ از', K.dt('f-open', it.open, 'باز شدن')) + K.row('تا', K.dt('f-close', it.close, 'بسته شدن'))
        + K.row('نمایش پیش‌نمایش', K.yn('f-prev', it.preview), 'دانش‌آموز پیش از باز شدن، گزینه‌ها را می‌بیند.', 'f-prev'))
      + K.sec('نتیجه‌ها', K.row('انتشار نتایج برای دانش‌آموزان', K.sel('f-res', [['never', 'هرگز'], ['after', 'پس از پاسخ دادن'], ['close', 'پس از بسته شدن'], ['always', 'همیشه']], it.showRes), '', 'f-res')
        + K.row('حریم خصوصی نتایج', K.sel('f-names', [['anon', 'بدون نام'], ['names', 'با نام دانش‌آموزان']], it.names), '', 'f-names')
        + K.row('نمایش ستون «پاسخ نداده‌ها»', K.yn('f-una', it.unanswered), '', 'f-una'));
    if (t === 'quiz') return Q.form(it, { generalHead, where });
    // assignment
    const st = it.st, g = it.grade, typesSel = (st.types || '').split(/\s+/).filter(Boolean);
    return K.sec('عمومی', generalHead(it, 'نام تکلیف')
        + K.row('فعالیت', K.rich('f-act', it.activity, 'فعالیت'), 'دستورالعمل کار؛ فقط در صفحهٔ ارسال پاسخ دیده می‌شود.')
        + K.row('فایل‌های اضافی', K.filesField('f-files', it.files), 'مثلاً کاربرگ یا نمونه.') + K.row('', K.chk('f-fos', it.filesOnSubmit, 'فقط در حین ارسال فایل‌ها نمایش داده شود')))
      + K.sec('در دسترس بودن', K.row('اجازهٔ ارسال حل از تاریخ', K.dt('f-from', it.allowFrom, 'اجازهٔ ارسال از')) + K.row('مهلت تحویل', K.dt('f-due', it.due, 'مهلت تحویل'), 'ارسال پس از این زمان «با تأخیر» ثبت می‌شود.')
        + K.row('تاریخ بسته شدن سیستم', K.dt('f-cut', it.cutoff, 'بسته شدن سیستم'), 'پس از این زمان دیگر ارسالی پذیرفته نمی‌شود.') + K.row('برای نمره‌دهی یادآوری‌ام کن تا', K.dt('f-gby', it.gradeBy, 'یادآوری نمره‌دهی'))
        + K.row('', K.chk('f-ad', it.alwaysDesc, 'نمایش همیشگی توصیف'), 'اگر خاموش باشد، توضیح تکلیف از «اجازهٔ ارسال» به بعد دیده می‌شود.'))
      + K.sec('انواع حل', K.row('انواع حل', K.chk('f-st-text', st.text, 'متن آنلاین') + K.chk('f-st-file', st.file, 'ارسال فایل'))
        + K.row('محدودیت تعداد واژه', `<div class="row">${K.chk('f-wl', st.words > 0, 'فعال‌سازی')}<input class="input num" style="width:90px" id="f-wn" value="${st.words || 200}" aria-label="بیشترین تعداد واژه"></div>`)
        + K.row('سقف مجاز برای تعداد فایل‌های ارسال‌شده', K.sel('f-mf', [...Array(20)].map((_, i) => [i + 1, fa(i + 1)]), st.maxFiles), '', 'f-mf')
        + K.row('سقف مجاز برای حجم مطلب ارسالی', K.sel('f-mkb', [[500, 'محدودیت بارگذاری سایت (۵۰۰ کیلوبایت در نسخهٔ نمایشی)'], [200, '۲۰۰ کیلوبایت'], [100, '۱۰۰ کیلوبایت'], [50, '۵۰ کیلوبایت']], st.maxKB), '', 'f-mkb')
        + K.row('انواع فایل‌های مورد پذیرش', `<fieldset class="cr-fs"><legend class="sr-only">انواع فایل</legend>${FTYPES.map(([l, e], i) => `<label class="cr-chk"><input type="checkbox" data-ft="${i}" ${e.split(' ').every(x => typesSel.includes(x)) ? 'checked' : ''}> ${l} <span class="muted small" dir="ltr">${e}</span></label>`).join('')}</fieldset>
          <input class="input" id="f-ftx" dir="ltr" placeholder=".psd .dwg" aria-label="پسوندهای دیگر" value="${esc(typesSel.filter(x => !FTYPES.some(([, e]) => e.split(' ').includes(x))).join(' '))}">`, 'هیچ‌کدام انتخاب نشود یعنی همهٔ انواع پذیرفته است.'))
      + K.sec('انواع بازخورد', K.row('انواع بازخورد', K.chk('f-fb-c', it.fb.comments, 'توضیحات بازخورد') + K.chk('f-fb-o', it.fb.offline, 'کاربرگ نمره‌دهی آفلاین') + K.chk('f-fb-f', it.fb.files, 'فایل‌های بازخورد'))
        + K.row('توضیحات درخط', K.yn('f-fb-i', it.fb.inline), 'متن آنلاین دانش‌آموز هنگام نمره‌دهی کپی می‌شود تا معلم لابه‌لای آن توضیح بنویسد.', 'f-fb-i'), false)
      + K.sec('تنظیمات ارسال', K.row('دانش‌آموزان باید دکمهٔ ارسال را فشار دهند', K.yn('f-sb', it.submitBtn), 'تا آن زمان ارسال «پیش‌نویس» است و نمره داده نمی‌شود.', 'f-sb')
        + K.row('دانش‌آموزان باید تعهدنامهٔ ارسال را قبول کنند', K.yn('f-stm', it.statement), '«این کار خودم است و از کار دیگران بدون ذکر منبع استفاده نکرده‌ام.»', 'f-stm')
        + K.row('تعداد دفعات مجاز برای حل', K.sel('f-att', [[0, 'نامحدود'], ...[...Array(10)].map((_, i) => [i + 1, fa(i + 1)])], it.attempts), '', 'f-att')
        + K.row('بازگشایی تلاش‌ها', K.sel('f-reo', [['none', 'هرگز'], ['manual', 'به دست معلم'], ['untilpass', 'خودکار تا قبولی']], it.reopen), '', 'f-reo'), false)
      + K.sec('تنظیمات حل گروهی', K.row('تحویل گروهی تکلیف', K.yn('f-grp', it.group), 'یک ارسال برای همهٔ اعضای گروه؛ گروه‌ها در زبانهٔ «گروه‌ها» ساخته می‌شوند.', 'f-grp')
        + K.row('برای ارسال، عضویت در گروه لازم است', K.yn('f-greq', it.groupReq), '', 'f-greq') + K.row('همهٔ اعضای گروه باید ارسال را تأیید کنند', K.yn('f-gall', it.groupAll), 'فقط وقتی «دکمهٔ ارسال» روشن است.', 'f-gall'), false)
      + K.sec('تذکرها', K.row('فرد نمره‌دهنده را از ارسال‌ها مطلع کن', K.yn('f-n-g', it.notify.graders), '', 'f-n-g') + K.row('فرد نمره‌دهنده را از ارسال‌های با تأخیر مطلع کن', K.yn('f-n-l', it.notify.late), '', 'f-n-l')
        + K.row('تنظیم پیش‌فرض برای اطلاع‌رسانی به دانش‌آموزان', K.yn('f-n-s', it.notify.students), '', 'f-n-s'), false)
      + K.sec('نمره', K.row('نوع', K.sel('f-gt', [['point', 'امتیاز'], ['scale', 'مقیاس'], ['none', 'هیچ']], g.type), '', 'f-gt')
        + `<div class="g-point" ${g.type === 'point' ? '' : 'hidden'}>${K.row('حداکثر امتیاز', `<input class="input num" id="f-gmax" value="${g.max}">`, '', 'f-gmax')}</div>
        <div class="g-scale" ${g.type === 'scale' ? '' : 'hidden'}>${K.row('مقیاس', K.sel('f-gsc', Object.entries(SCALES).map(([k, s]) => [k, s.join(' / ')]), g.scale), '', 'f-gsc')}</div>
        ${K.row('روش نمره‌دهی', K.sel('f-gm', [['simple', 'نمره‌دهی مستقیم ساده'], ['guide', 'راهنمای نمره‌دهی'], ['rubric', 'روبریک']], g.method), '', 'f-gm')}
        <div class="cr-row"><span class="cr-l"></span><div class="cr-c" id="crit-box"></div></div>
        ${K.row('دستهٔ نمره', K.sel('f-gcat', [['', 'دسته‌بندی نشده'], ...D.MARK_TYPES], g.cat), 'نمره‌های منتشرشده با همین نوع به «ثبت نمره» می‌رود.', 'f-gcat')}
        ${K.row('نمره برای موفقیت', `<input class="input num" id="f-gpass" value="${esc(g.pass)}">`, 'در مقیاس: شمارهٔ کمترین سطح قبولی.', 'f-gpass')}
        ${K.row('نمره‌دهی بدون دانستن هویت فرد', K.yn('f-gbl', g.blind), 'نام دانش‌آموز تا «آشکارسازی هویت‌ها» پنهان است.', 'f-gbl')}
        ${K.row('پنهان کردن هویت تصحیح‌کننده از شاگردان', K.yn('f-ghg', g.hideGrader), '', 'f-ghg')}
        ${K.row('استفاده از روند نمره‌دهی', K.yn('f-gwf', g.workflow), 'نمره از «تصحیح نشده» تا «منتشر شده» پیش می‌رود و فقط نمرهٔ منتشرشده دیده می‌شود.', 'f-gwf')}`);
  }
  const optRow = (o, lim, i) => `<div class="cr-row opt-row"><label class="cr-l" for="f-o${i}">گزینهٔ ${fa(i + 1)}</label><div class="cr-c row"><input class="input" id="f-o${i}" data-opt value="${esc(o)}" style="flex:1">
    <label class="small">سقف <input class="input num sm" style="width:64px" data-olim value="${lim || 0}" aria-label="سقف پاسخ گزینهٔ ${fa(i + 1)}"></label></div></div>`;
  // The criteria of a rubric or marking guide, kept in a closure while the form is open.
  function wireCrit(root, crit) {
    const box = root.querySelector('#crit-box'); if (!box) return;
    const m = () => root.querySelector('#f-gm').value;
    const draw = () => {
      const mode = m();
      if (mode === 'simple') { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="crit">${crit.map((c, i) => `<div class="crit-c"><div class="row"><input class="input" data-cn="${i}" value="${esc(c.name)}" placeholder="نام معیار" aria-label="نام معیار ${fa(i + 1)}" style="flex:1">
        ${mode === 'guide' ? `<label class="small">بیشینه <input class="input num sm" style="width:64px" data-cm="${i}" value="${c.max ?? 5}" aria-label="بیشینهٔ معیار ${fa(i + 1)}"></label>` : ''}
        <button type="button" class="btn sm danger" data-cx="${i}" aria-label="حذف معیار ${fa(i + 1)}">×</button></div>
        ${mode === 'guide' ? `<input class="input" data-cd="${i}" value="${esc(c.desc || '')}" placeholder="توضیح برای نمره‌دهنده" aria-label="توضیح معیار ${fa(i + 1)}">`
          : `<div class="crit-lv">${(c.levels || []).map((l, k) => `<span class="crit-l"><input class="input sm" data-ll="${i}.${k}" value="${esc(l.l)}" aria-label="سطح ${fa(k + 1)}" placeholder="سطح">
            <input class="input num sm" style="width:56px" data-lp="${i}.${k}" value="${l.p}" aria-label="امتیاز سطح ${fa(k + 1)}"></span>`).join('')}<button type="button" class="btn sm" data-la="${i}">+ سطح</button></div>`}</div>`).join('')}
        <button type="button" class="btn sm" data-ca>+ معیار</button></div>`;
    };
    root.querySelector('#f-gm').addEventListener('change', () => { if (!crit.length) crit.push(m() === 'guide' ? { name: '', max: 5, desc: '' } : { name: '', levels: [{ l: 'ضعیف', p: 0 }, { l: 'خوب', p: 3 }, { l: 'عالی', p: 5 }] }); draw(); });
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ca != null) crit.push(m() === 'guide' ? { name: '', max: 5, desc: '' } : { name: '', levels: [{ l: 'ضعیف', p: 0 }, { l: 'خوب', p: 3 }, { l: 'عالی', p: 5 }] });
      else if (b.dataset.cx != null) crit.splice(+b.dataset.cx, 1);
      else if (b.dataset.la != null) (crit[+b.dataset.la].levels = crit[+b.dataset.la].levels || []).push({ l: '', p: 0 });
      else return;
      draw();
    });
    box.addEventListener('input', e => {
      const t = e.target, at = k => t.dataset[k].split('.').map(Number);
      if (t.dataset.cn) crit[+t.dataset.cn].name = t.value; else if (t.dataset.cm) crit[+t.dataset.cm].max = K.num(t.value) || 0; else if (t.dataset.cd) crit[+t.dataset.cd].desc = t.value;
      else if (t.dataset.ll) { const [i, k] = at('ll'); crit[i].levels[k].l = t.value; } else if (t.dataset.lp) { const [i, k] = at('lp'); crit[i].levels[k].p = K.num(t.value) || 0; }
    });
    draw();
  }

  function itemModal(type, it, secId) {
    const fresh = !it;
    it = it || { id: '', type, title: '', ...BASE(), ...DEF[type](), sec: secId || 'gen' };
    const rs = JSON.parse(JSON.stringify(it.restrict || { op: 'all', list: [] })), crit = JSON.parse(JSON.stringify(it.grade?.criteria || []));
    const gradable = items().filter(i => i.id !== it.id && (i.type === 'quiz' || (i.type === 'assign' && i.grade.type !== 'none'))).map(i => ({ id: i.id, title: i.title }));
    const html = K.frame(`${fresh ? 'اضافه کردن' : 'به‌روزرسانی'} ${fresh ? 'یک ' : ''}${TYPES[type][0]}${fresh ? ' جدید' : ''}`, formBody(it)
      + K.common(it, { groups: type === 'assign' || type === 'quiz' || type === 'choice' }) + K.restrict() + K.completion(it.comp, CAPS[type]) + K.tags(it))
      + `<div class="row cr-foot"><button class="btn primary" id="save-back">ذخیره و بازگشت به درس</button><button class="btn" id="save-show">ذخیره و نمایش</button><button class="btn" data-close>انصراف</button></div>`;
    modal(html, root => {
      root.querySelector('.modal').classList.add('cr-modal');
      K.wire(root); K.wireRestrict(root, rs, { gradable, classes: d().classes, groups: groups() }); wireCrit(root, crit);
      root.querySelector('#f-disp')?.addEventListener('change', e => { root.querySelector('.cr-pop').hidden = e.target.value !== 'popup'; });
      root.querySelector('#f-gt')?.addEventListener('change', e => { root.querySelector('.g-point').hidden = e.target.value !== 'point'; root.querySelector('.g-scale').hidden = e.target.value !== 'scale'; });
      root.querySelector('[data-opt-add]')?.addEventListener('click', () => { const box = root.querySelector('#opt-box'), n = box.querySelectorAll('.opt-row').length; box.insertAdjacentHTML('beforeend', optRow('', 0, n)); box.querySelector(`#f-o${n}`).focus(); });
      if (type === 'quiz') Q.wireForm(root, it);
      const go = async show => {
        const v = id => K.v(root, id), o = {};
        if (!v('f-t')) return UI.invalid('#f-t', 'نام را بنویسید.');
        Object.assign(o, { title: v('f-t'), cls: v('f-cls'), sec: v('f-sec') || 'gen', desc: K.readRich(root, 'f-desc'), showDesc: K.on(root, 'f-sd') });
        try {
          if (type === 'file') {
            o.files = await K.readFilesField(root, 'f-files', it.files);
            if (!o.files.length) return UI.invalid('#f-files', 'دست‌کم یک فایل انتخاب کنید.');
            Object.assign(o, { display: v('f-disp'), popW: K.num(v('f-pw')) || 620, popH: K.num(v('f-ph')) || 450, showSize: K.on(root, 'f-size'), showType: K.on(root, 'f-type'), showDate: K.on(root, 'f-date'), showRDesc: K.on(root, 'f-rd') });
          } else if (type === 'url') {
            if (!/^https?:\/\/\S+\.\S+/i.test(v('f-url'))) return UI.invalid('#f-url', 'نشانی باید با http:// یا https:// شروع شود.');
            Object.assign(o, { url: v('f-url'), display: v('f-disp'), popW: K.num(v('f-pw')) || 620, popH: K.num(v('f-ph')) || 450, showRDesc: K.on(root, 'f-rd') });
          } else if (type === 'choice') {
            const rows = [...root.querySelectorAll('.opt-row')].map(r => [r.querySelector('[data-opt]').value.trim(), K.num(r.querySelector('[data-olim]').value) || 0]).filter(r => r[0]);
            if (rows.length < 2) return UI.invalid('#f-o0', 'دست‌کم دو گزینه بنویسید.');
            const open = K.readDt(root, 'f-open'), cl = K.readDt(root, 'f-close');
            if (open && cl && cl <= open) return UI.invalid('#f-close-t', 'پایان باید بعد از شروع باشد.');
            Object.assign(o, { options: rows.map(r => r[0]), limits: rows.map(r => r[1]), layout: v('f-lay'), allowUpdate: v('f-upd') === '1', multi: v('f-multi') === '1', limit: v('f-lim') === '1',
              open, close: cl, preview: v('f-prev') === '1', showRes: v('f-res'), names: v('f-names'), unanswered: v('f-una') === '1' });
          } else if (type === 'quiz') {
            const err = Q.readForm(root, o); if (err) return UI.invalid(err[0], err[1]);
          } else {
            const from = K.readDt(root, 'f-from'), due = K.readDt(root, 'f-due'), cut = K.readDt(root, 'f-cut');
            if (from && due && due < from) return UI.invalid('#f-due-t', 'مهلت تحویل نمی‌تواند پیش از «اجازهٔ ارسال» باشد.');
            if (cut && due && cut < due) return UI.invalid('#f-cut-t', 'بسته شدن سیستم نمی‌تواند پیش از مهلت تحویل باشد.');
            const st = { text: K.on(root, 'f-st-text'), file: K.on(root, 'f-st-file'), words: K.on(root, 'f-wl') ? Math.max(1, K.num(v('f-wn')) || 0) : 0, maxFiles: +v('f-mf'), maxKB: +v('f-mkb'),
              types: [...FTYPES.filter((_, i) => root.querySelector(`[data-ft="${i}"]`).checked).flatMap(([, e]) => e.split(' ')), ...v('f-ftx').split(/[\s,،]+/).filter(Boolean).map(x => x.startsWith('.') ? x.toLowerCase() : '.' + x.toLowerCase())].join(' ') };
            const max = K.num(v('f-gmax'));
            if (v('f-gt') === 'point' && !(max > 0 && max <= 100)) return UI.invalid('#f-gmax', 'حداکثر امتیاز باید بین ۱ و ۱۰۰ باشد.');
            const method = v('f-gm');
            if (method !== 'simple' && (!crit.length || crit.some(c => !c.name.trim()))) return UI.invalid(root.querySelector('#crit-box input') || '#f-gm', 'هر معیار نام بخواهد و دست‌کم یک معیار لازم است.');
            if (method === 'rubric' && crit.some(c => !(c.levels || []).length)) return UI.invalid('#f-gm', 'هر معیار روبریک دست‌کم یک سطح می‌خواهد.');
            Object.assign(o, { activity: K.readRich(root, 'f-act'), files: await K.readFilesField(root, 'f-files', it.files), filesOnSubmit: K.on(root, 'f-fos'),
              allowFrom: from, due, cutoff: cut, gradeBy: K.readDt(root, 'f-gby'), alwaysDesc: K.on(root, 'f-ad'), st,
              fb: { comments: K.on(root, 'f-fb-c'), offline: K.on(root, 'f-fb-o'), files: K.on(root, 'f-fb-f'), inline: v('f-fb-i') === '1' },
              submitBtn: v('f-sb') === '1', statement: v('f-stm') === '1', attempts: +v('f-att'), reopen: v('f-reo'), group: v('f-grp') === '1', groupReq: v('f-greq') === '1', groupAll: v('f-gall') === '1',
              notify: { graders: v('f-n-g') === '1', late: v('f-n-l') === '1', students: v('f-n-s') === '1' },
              grade: { type: v('f-gt'), max: max || 20, scale: v('f-gsc'), method, criteria: method === 'simple' ? [] : crit, cat: v('f-gcat'), pass: v('f-gpass') === '' ? '' : K.num(v('f-gpass')),
                blind: v('f-gbl') === '1', hideGrader: v('f-ghg') === '1', workflow: v('f-gwf') === '1' } });
          }
        } catch (e) { return UI.invalid(root.querySelector('input[type=file]'), `«${e.message}» از سقف حجم بزرگ‌تر است.`); }
        Object.assign(o, K.readCommon(root), { restrict: rs, comp: K.readCompletion(root, CAPS[type]), tags: K.readTags(root) });
        if (fresh) { it.id = D.uid('ci'); it.created = K.now(); Object.assign(it, o); items().push(it); } else Object.assign(it, o);
        if (it.grade) sync(it);
        if (show) state.item = it.id;
        done(fresh ? `${TYPES[type][0]} افزوده شد.` : 'تغییرها ذخیره شد.');
      };
      root.querySelector('#save-back').onclick = () => go(false);
      root.querySelector('#save-show').onclick = () => go(true);
    });
  }
  function chooser(secId) {
    modal(`<h2>افزودن فعالیت یا منبع</h2><div class="cr-pick">${Object.entries(TYPES).map(([k, [l, , , info]]) => `<button class="cr-pk" data-pick="${k}">${tile(k)}<b>${l}</b><span class="small muted">${info}</span></button>`).join('')}</div>
      ${C().secs.find(k => k.id === secId)?.parent ? '' : `<p class="small muted" style="margin:14px 0 6px">یا یک زیربخش در همین بخش:</p><button class="cr-pk cr-pk-sub" data-subsec><span class="tile cr-ic" style="--tone-bg:var(--slate-bg);--tone-ink:var(--ink)">${SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>')}</span><b>زیربخش</b><span class="small muted">یک بخش کوچک‌تر درون همین بخش، مثلاً «درس ۱» درون «فصل ۲».</span></button>`}
      <div class="row" style="margin-top:14px"><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => itemModal(b.dataset.pick, null, secId));
      root.querySelector('[data-subsec]')?.addEventListener('click', () => secModal(null, secId));
    });
  }

  /* ---------------- course page ---------------- */
  function metaOf(it, s) {
    const m = [];
    if (it.type === 'assign') { if (it.allowFrom && K.now() < it.allowFrom) m.push(`باز می‌شود: ${K.fdt(it.allowFrom)}`); if (it.due) m.push(`مهلت: ${K.fdt(it.due)}`); }
    if (it.type === 'quiz') { if (it.open) m.push(`باز شدن: ${K.fdt(it.open)}`); if (it.close) m.push(`بسته شدن: ${K.fdt(it.close)}`); }
    if (it.type === 'choice' && it.close) m.push(`تا ${K.fdt(it.close)}`);
    if (it.type === 'file') { const f = it.files[0]; if (f) m.push([it.showSize && K.kb(it.files.reduce((a, x) => a + x.size, 0)), it.showType && `فایل ${K.ext(f.name).toUpperCase()}`, it.showDate && `بارگذاری ${K.fdt(f.at || it.created)}`].filter(Boolean).join(' · ')); }
    if (it.type === 'url') { try { m.push(new URL(it.url).hostname); } catch (e) { /* kept as typed */ } }
    if (!s) {
      if (it.type === 'assign') { const subs = Object.values(it.subs || {}), n = subs.filter(x => x.status === 'submitted').length; m.push(`${fa(n)} ارسال · ${fa(needGrading(it).length)} نیازمند نمره`); }
      if (it.type === 'quiz') m.push(`${fa(Object.values(it.att || {}).flat().filter(a => a.state !== 'inprogress').length)} تلاش`);
      if (it.type === 'choice') m.push(`${fa(Object.keys(it.resp || {}).length)} پاسخ`);
      if (it.cls) m.push(className(it.cls));
    }
    return m.filter(Boolean).join(' · ');
  }
  // A ⋮ menu: a disclosure with plain buttons, closed again by the re-render that every action ends in.
  const kebab = (label, btns) => `<details class="cr-menu"><summary aria-label="${esc(label)}" title="${esc(label)}"><span aria-hidden="true">⋮</span></summary>
    <div class="cr-mpop">${btns.filter(Boolean).map(([a, id, l, cls]) => `<button type="button" class="${cls || ''}" data-act="${a}" data-id="${esc(id)}">${l}</button>`).join('')}</div></details>`;
  const set = () => C().set;
  const secHidden = sc => sc.hidden || (sc.parent && C().secs.find(p => p.id === sc.parent)?.hidden);
  function itemRow(it, s, first, last) {
    const hid = it.vis !== 'show', locked = s && !open(it, s), cp = s ? completed(it, s.id) : null, title = esc(it.title);
    const tagsH = [!s && it.vis === 'hide' && '<span class="tag grey">پنهان از دانش‌آموزان</span>', !s && it.vis === 'stealth' && '<span class="tag grey">فقط با پیوند</span>',
      !s && it.restrict?.list?.length && '<span class="tag warn">دسترسی محدود</span>', ...(it.tags || []).map(t => `<span class="tag blue">${esc(t)}</span>`)].filter(Boolean).join('');
    const meta = s && !set().showDates ? '' : metaOf(it, s);
    const needs = !s && it.type === 'assign' ? needGrading(it).length : 0;
    return `<div class="cr-it ${hid ? 'dim' : ''} ${locked ? 'locked' : ''}">${state.bulk && !s ? `<input type="checkbox" class="cr-bk" data-bk="${it.id}" aria-label="انتخاب «${title}»" ${state.picked.has(it.id) ? 'checked' : ''}>` : ''}${tile(it.type)}<div class="cr-main">
        ${locked ? `<b>${title}</b>` : `<button class="cr-name" data-act="cl-open" data-id="${it.id}">${title}</button>`}<span class="sr-only"> (${TYPES[it.type][0]})</span>
        ${needs ? `<span class="tag warn">${fa(needs)} نیازمند نمره</span>` : ''}
        ${meta ? `<div class="muted small">${esc(meta)}</div>` : ''}${tagsH ? `<div class="row" style="gap:4px;margin-top:4px">${tagsH}</div>` : ''}
        ${it.showDesc && it.desc && !locked ? K.show(it.desc) : ''}
        ${locked ? `<div class="cr-lock small">در دسترس نیست مگر: ${esc(K.describe(it.restrict, names))}</div>` : ''}
        ${s && cp === false && set().showCond && it.comp.mode === 'auto' ? `<div class="muted small">برای خاتمه: ${esc(condText(it))}</div>` : ''}</div>
      ${s ? (cp == null ? '' : it.comp.mode === 'manual' && !locked ? `<button class="btn sm ${cp ? 'ok' : ''}" data-act="cl-done" data-id="${it.id}" aria-pressed="${cp}">${cp ? '✓ انجام شد' : 'علامت «انجام شد»'}</button>`
          : `<span class="tag ${cp ? 'ok' : 'grey'}">${cp ? '✓ خاتمه یافته' : 'خاتمه نیافته'}</span>`)
        : ro() ? '' : `<div class="row cr-tools"><button class="btn sm cr-pen" data-act="cl-edit" data-id="${it.id}" aria-label="ویرایش «${title}»" title="ویرایش">${PEN}</button>
          ${kebab(`کارهای «${it.title}»`, [['cl-edit', it.id, 'ویرایش تنظیمات'], ['cl-vis', it.id, it.vis === 'show' ? 'پنهان از دانش‌آموزان' : 'نمایش برای دانش‌آموزان'],
            !first && ['cl-up', it.id, 'جابه‌جایی به بالا'], !last && ['cl-down', it.id, 'جابه‌جایی به پایین'], ['cl-move', it.id, 'انتقال به بخش دیگر'], ['cl-dup', it.id, 'تکثیر'], ['cl-del', it.id, 'حذف', 'danger']])}</div>`}</div>`;
  }
  const condText = it => { const cp = it.comp, t = []; if (cp.view) t.push('دیدن'); if (cp.submit) t.push('ارسال'); if (cp.answer) t.push('پاسخ دادن'); if (cp.minAtt) t.push(`${fa(cp.minAtt)} تلاش`); if (cp.grade) t.push('گرفتن نمره'); if (cp.pass) t.push('نمرهٔ قبولی'); return t.join('، '); };
  const PEN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  // One section (or sub-section) with its items, its sub-sections and the «+» at the bottom.
  function secBlock(sc, s, depth = 0) {
    const c = C(), list = c.items.filter(i => (i.sec || 'gen') === sc.id && (!s || listedFor(i, s))), kids = c.secs.filter(k => k.parent === sc.id && (!s || !k.hidden));
    if (s && !list.length && !kids.some(k => c.items.some(i => i.sec === k.id && listedFor(i, s)))) return '';
    const col = state.col.has(sc.id), top = c.secs.filter(k => !k.parent), sibs = sc.parent ? c.secs.filter(k => k.parent === sc.parent) : top, idx = sibs.indexOf(sc);
    const tools = s || ro() ? '' : `<button class="btn sm cr-pen" data-act="cl-sec-ren" data-id="${sc.id}" aria-label="تغییر نام «${esc(sc.title)}»" title="تغییر نام">${PEN}</button>`;
    const menu = s || ro() ? '' : kebab(`کارهای بخش «${sc.title}»`, [['cl-sec-ren', sc.id, 'تغییر نام'], sc.id !== 'gen' && ['cl-sec-vis', sc.id, sc.hidden ? 'نمایش برای دانش‌آموزان' : 'پنهان از دانش‌آموزان'],
      idx > (sc.parent ? 0 : 1) && ['cl-sec-up', sc.id, 'جابه‌جایی به بالا'], sc.id !== 'gen' && idx < sibs.length - 1 && ['cl-sec-down', sc.id, 'جابه‌جایی به پایین'],
      !sc.parent && ['cl-subsec', sc.id, 'افزودن زیربخش'], state.bulk && ['cl-bk-sec', sc.id, 'انتخاب همهٔ فعالیت‌های این بخش'], sc.id !== 'gen' && ['cl-sec-del', sc.id, 'حذف بخش', 'danger']]);
    const hTag = depth ? 'h3' : 'h2';
    return `<section class="${depth ? 'cl-subsec' : 'card cr-secc'} ${!s && secHidden(sc) ? 'dim' : ''}" aria-labelledby="sh-${sc.id}">
      <div class="cr-sh"><button type="button" class="cr-tog" data-act="cl-col" data-id="${sc.id}" aria-expanded="${!col}" aria-controls="sb-${sc.id}" aria-label="${col ? 'باز کردن' : 'جمع کردن'} «${esc(sc.title)}»">${CHEV}</button>
        <${hTag} id="sh-${sc.id}">${esc(sc.title)}</${hTag}>${tools}${!s && sc.hidden ? '<span class="tag grey">پنهان از دانش‌آموزان</span>' : ''}
        <span class="muted small cr-cnt">${fa(list.length)} مورد</span>${menu}</div>
      <div id="sb-${sc.id}" class="cr-sbody" ${col ? 'hidden' : ''}>${sc.summary ? K.show(sc.summary) : ''}
        ${list.map((i, k) => itemRow(i, s, k === 0, k === list.length - 1)).join('')}${!list.length && !kids.length && !s ? `<p class="muted small" style="margin:6px 0">این بخش خالی است.</p>` : ''}
        ${kids.map(k => secBlock(k, s, depth + 1)).join('')}
        ${s || ro() ? '' : `<div class="cr-plus-row"><button type="button" class="cr-plus" data-act="cl-add" data-id="${sc.id}" aria-label="افزودن فعالیت یا منبع به «${esc(sc.title)}»" title="افزودن فعالیت یا منبع">+</button></div>`}</div></section>`;
  }
  const TABS = [['course', 'درس'], ['settings', 'تنظیمات'], ['people', 'شرکت‌کنندگان'], ['grades', 'نمره‌ها'], ['acts', 'فعالیت‌ها'], ['comp', 'تکمیل فعالیت‌ها'], ['groups', 'گروه‌ها']];
  function coursePage() {
    const c = C(), s = state.as ? student(state.as) : null;
    const asSel = `<label class="row small cr-as">از نگاه دانش‌آموز <select class="input" id="cr-as"><option value="">نمای معلم</option>${ctx.studentOptions(state.as)}</select></label>`;
    const head = `<div class="spread" style="margin-bottom:12px"><div class="row"><button class="btn sm" data-act="cl-back">‹ همهٔ درس‌ها</button><h2 style="margin:0;font-size:20px">${esc(state.sub)}</h2></div>${ro() || state.forced ? '' : asSel}</div>`;
    if (s && state.forced) return head + studentCourse(s);
    if (s) return head + `<p class="note">صفحه را از نگاه <b>${esc(s.name)}</b> (${esc(className(s.cls))}) می‌بینید؛ کاری که اینجا انجام شود به نام او ثبت می‌شود.</p>` + studentCourse(s);
    const tabs = `<div class="tabs cr-tabs" role="tablist" aria-label="بخش‌های درس">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${state.tab === k}" data-act="cl-tab" data-id="${k}">${l}${k === 'groups' ? ` (${fa(c.groups.length)})` : ''}</button>`).join('')}</div>`;
    let body;
    if (state.tab === 'grades') body = gradeBook();
    else if (state.tab === 'comp') body = compReport();
    else if (state.tab === 'groups') body = groupsTab();
    else if (state.tab === 'settings') body = settingsTab();
    else if (state.tab === 'people') body = peopleTab();
    else if (state.tab === 'acts') body = actsTab();
    else {
      const ng = items().filter(i => i.type === 'assign').reduce((a, i) => a + needGrading(i).length, 0), allCol = c.secs.every(k => state.col.has(k.id));
      const bar = ro() ? '' : `<div class="spread cr-bar0"><div class="row">${ng ? `<span class="tag warn">${fa(ng)} ارسال نیازمند نمره</span>` : ''}<button class="btn sm" data-act="cl-col-all">${allCol ? 'باز شدن همه' : 'جمع شدن همه'}</button></div>
        <button class="btn sm ${state.bulk ? 'primary' : ''}" data-act="cl-bulk" aria-pressed="${state.bulk}">${PEN} عملیات گروهی</button></div>`;
      const bulk = state.bulk ? `<div class="cr-bulkbar" role="toolbar" aria-label="عملیات گروهی"><b>${fa(state.picked.size)} مورد انتخاب شده</b>
        <button class="btn sm" data-act="cl-bk-all">انتخاب همه</button><button class="btn sm" data-act="cl-bk-none">لغو انتخاب</button>
        <button class="btn sm" data-act="cl-bk-show" ${state.picked.size ? '' : 'disabled'}>نمایش</button><button class="btn sm" data-act="cl-bk-hide" ${state.picked.size ? '' : 'disabled'}>پنهان</button>
        <button class="btn sm" data-act="cl-bk-dup" ${state.picked.size ? '' : 'disabled'}>تکثیر</button><button class="btn sm" data-act="cl-bk-move" ${state.picked.size ? '' : 'disabled'}>انتقال</button>
        <button class="btn sm danger" data-act="cl-bk-del" ${state.picked.size ? '' : 'disabled'}>حذف</button><button class="btn sm" data-act="cl-bulk">پایان</button></div>` : '';
      body = bar + bulk + (c.set.summary ? `<div class="card">${K.show(c.set.summary)}</div>` : '') + linkCard(c) + c.secs.filter(k => !k.parent).map(k => secBlock(k, null)).join('')
        + (ro() ? '' : '<div class="cr-plus-row"><button class="btn" data-act="cl-sec-new">+ بخش تازه (مثلاً یک فصل)</button></div>');
    }
    return head + tabs + body;
  }
  const linkCard = c => `<div class="card cr-link"><div class="card-head"><div class="row"><span class="tile cr-ic" style="--tone-bg:var(--slate-bg);--tone-ink:var(--ink)">${SV('<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>')}</span><h2 style="margin:0">کلاس آنلاین</h2></div>
      ${c.link ? `<a class="btn primary" href="${esc(c.link)}" target="_blank" rel="noopener">ورود به کلاس آنلاین ←</a>` : ''}</div>
    ${c.link ? '' : `<p class="muted small" style="margin:0">${state.as ? 'لینک کلاس هنوز ثبت نشده.' : 'لینک کلاس را در زبانهٔ «تنظیمات» بگذارید.'}</p>`}</div>`;
  function studentCourse(s) {
    const c = C(), mine = c.items.filter(i => listedFor(i, s) && !secHidden(c.secs.find(k => k.id === (i.sec || 'gen')) || {}));
    const cps = mine.map(i => completed(i, s.id)).filter(x => x != null), dn = cps.filter(Boolean).length;
    const soon = mine.filter(i => open(i, s)).map(i => [i, i.type === 'assign' ? i.due : i.type === 'quiz' ? i.close : i.type === 'choice' ? i.close : null]).filter(([i, at]) => at && at >= K.now() && !completed(i, s.id))
      .sort((a, b) => a[1].localeCompare(b[1])).slice(0, 5);
    const top = `<div class="grid g2 cr-stop">${cps.length ? `<div class="card"><h2>پیشرفت من</h2><div class="bar" role="progressbar" aria-valuenow="${dn}" aria-valuemin="0" aria-valuemax="${cps.length}" aria-label="پیشرفت"><i style="width:${dn / cps.length * 100}%"></i></div>
        <p class="small muted" style="margin:6px 0 0">${fa(dn)} از ${fa(cps.length)} فعالیت خاتمه یافته</p></div>` : ''}
      ${soon.length ? `<div class="card"><h2>کارهای پیش رو</h2>${soon.map(([i, at]) => `<div class="row small" style="padding:3px 0">${tile(i.type)}<button class="cr-name" data-act="cl-open" data-id="${i.id}">${esc(i.title)}</button><span class="muted">${esc(K.fdt(at))}</span></div>`).join('')}</div>` : ''}</div>`;
    const grades = set().showGrades ? mine.filter(i => gradeOf(i, s.id)) : [];
    return top + (c.set.summary ? `<div class="card">${K.show(c.set.summary)}</div>` : '') + linkCard(c) + c.secs.filter(k => !k.parent && !k.hidden).map(k => secBlock(k, s)).join('')
      + (grades.length ? `<div class="card"><h2>نمره‌های من</h2><div class="table-wrap"><table><tr><th>فعالیت</th><th>نمره</th></tr>${grades.map(i => `<tr><td>${esc(i.title)}</td><td class="num">${esc(gradeOf(i, s.id).text)}</td></tr>`).join('')}</table></div></div>` : '')
      || `<div class="card">${empty('هنوز چیزی برای این دانش‌آموز گذاشته نشده.')}</div>`;
  }
  function settingsTab() {
    const c = C(), st = c.set;
    return `<div class="card"><h2>تنظیمات درس ${esc(state.sub)}</h2>
      ${K.row('لینک کلاس آنلاین', `<input class="input" id="cs-link" value="${esc(c.link)}" placeholder="لینک اسکای‌روم یا BigBlueButton" dir="ltr">`, '', 'cs-link')}
      ${K.row('معرفی درس', K.rich('cs-sum', st.summary, 'معرفی درس'), 'بالای صفحهٔ درس برای همه نمایش داده می‌شود.')}
      ${K.row('نمایش نمره‌ها به دانش‌آموزان', K.yn('cs-gr', st.showGrades), '', 'cs-gr')}
      ${K.row('نمایش تاریخ فعالیت‌ها', K.yn('cs-dt', st.showDates), 'تاریخ باز شدن و مهلت زیر نام هر فعالیت.', 'cs-dt')}
      ${K.row('نمایش شرایط خاتمه یافتن', K.yn('cs-cd', st.showCond), 'دانش‌آموز ببیند برای خاتمهٔ هر فعالیت چه کاری لازم است.', 'cs-cd')}
      ${ro() ? '' : '<div class="row" style="margin-top:14px"><button class="btn primary" data-act="cl-set-save">ذخیرهٔ تنظیمات</button></div>'}</div>`;
  }
  function peopleTab() {
    const ss = d().students, its = items();
    return `<div class="card"><h2>شرکت‌کنندگان (${fa(ss.length)})</h2><div class="table-wrap" tabindex="0" role="region" aria-label="جدول شرکت‌کنندگان"><table><tr><th>دانش‌آموز</th><th>کلاس</th><th>گروه‌ها</th><th>آخرین بازدید از درس</th><th>فعالیت‌های خاتمه‌یافته</th></tr>
      ${ss.map(s => { const last = its.map(i => i.views?.[s.id]).filter(Boolean).sort().pop(), mine = its.filter(i => !i.cls || i.cls === s.cls), cps = mine.map(i => completed(i, s.id)).filter(x => x != null);
        return `<tr><td>${esc(s.name)}</td><td>${esc(className(s.cls))}</td><td class="small">${groups().filter(g => g.sids.includes(s.id)).map(g => esc(g.name)).join('، ') || '—'}</td>
          <td class="small">${last ? esc(K.fdt(last)) : '<span class="muted">هرگز</span>'}</td><td class="num">${cps.length ? `${fa(cps.filter(Boolean).length)} از ${fa(cps.length)}` : '—'}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function actsTab() {
    const its = items();
    return Object.entries(TYPES).map(([t, [l]]) => { const list = its.filter(i => i.type === t); if (!list.length) return '';
      return `<div class="card"><div class="card-head"><div class="row">${tile(t)}<h2 style="margin:0">${l} (${fa(list.length)})</h2></div></div><div class="table-wrap"><table><tr><th>نام</th><th>بخش</th><th>تاریخ</th><th>وضعیت</th></tr>
        ${list.map(i => `<tr><td><button class="cr-name" data-act="cl-open" data-id="${i.id}">${esc(i.title)}</button></td><td class="small">${esc(C().secs.find(k => k.id === (i.sec || 'gen'))?.title || '')}</td>
          <td class="small">${esc((i.type === 'assign' ? i.due && `مهلت: ${K.fdt(i.due)}` : (i.type === 'quiz' || i.type === 'choice') ? i.close && `بسته شدن: ${K.fdt(i.close)}` : '') || '—')}</td>
          <td class="small">${esc(metaOf(i, null))}</td></tr>`).join('')}</table></div></div>`; }).join('') || `<div class="card">${empty('هنوز فعالیتی ساخته نشده.')}</div>`;
  }
  function gradeBook() {
    const gi = items().filter(i => i.type === 'quiz' || (i.type === 'assign' && i.grade.type !== 'none'));
    if (!state.gbCls) state.gbCls = d().classes[0]?.id || '';
    const ss = d().students.filter(s => s.cls === state.gbCls);
    return `<div class="card"><div class="card-head"><h2 style="margin:0">نمره‌های کلاس</h2><label class="row small">کلاس <select class="input" id="cr-gbc">${d().classes.map(k => `<option value="${k.id}" ${k.id === state.gbCls ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label></div>
      ${gi.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="جدول نمره‌ها"><table><tr><th>دانش‌آموز</th>${gi.map(i => `<th>${esc(i.title)}<div class="muted small">${TYPES[i.type][0]}</div></th>`).join('')}<th>میانگین (٪)</th></tr>
        ${ss.map(s => { const ps = gi.map(i => gradeOf(i, s.id, true)); const got = ps.filter(Boolean); return `<tr><td>${esc(s.name)}</td>${ps.map(g => `<td class="num">${g ? esc(g.text) : '—'}</td>`).join('')}
          <td class="num"><b>${got.length ? fa(Math.round(got.reduce((a, g) => a + g.pct, 0) / got.length)) : '—'}</b></td></tr>`; }).join('')}</table></div>` : empty('هنوز تکلیف یا آزمون نمره‌داری نیست.')}</div>`;
  }
  function compReport() {
    const ci = items().filter(i => i.comp?.mode && i.comp.mode !== 'none');
    if (!state.gbCls) state.gbCls = d().classes[0]?.id || '';
    const ss = d().students.filter(s => s.cls === state.gbCls);
    return `<div class="card"><div class="card-head"><h2 style="margin:0">گزارش خاتمه یافتن فعالیت‌ها</h2><label class="row small">کلاس <select class="input" id="cr-gbc">${d().classes.map(k => `<option value="${k.id}" ${k.id === state.gbCls ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label></div>
      ${ci.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="جدول خاتمهٔ فعالیت‌ها"><table><tr><th>دانش‌آموز</th>${ci.map(i => `<th>${esc(i.title)}${i.comp.expect ? `<div class="muted small">تا ${esc(K.fdt(i.comp.expect))}</div>` : ''}</th>`).join('')}<th>انجام‌شده</th></tr>
        ${ss.map(s => { const r = ci.map(i => (!i.cls || i.cls === s.cls) ? completed(i, s.id) : null); return `<tr><td>${esc(s.name)}</td>${r.map((x, k) => `<td>${x == null ? '<span class="muted">—</span>' : x ? '<span class="tag ok">✓</span>' : ci[k].comp.expect && ci[k].comp.expect < K.now() ? '<span class="tag bad">دیر شده</span>' : '<span class="tag grey">نه</span>'}</td>`).join('')}
          <td class="num">${fa(r.filter(Boolean).length)} از ${fa(r.filter(x => x != null).length)}</td></tr>`; }).join('')}</table></div>` : empty('برای هیچ فعالیتی «خاتمه یافتن» روشن نیست.')}</div>`;
  }
  function groupsTab() {
    const gs = groups();
    return `<div class="spread" style="margin-bottom:10px"><span class="muted small">گروه‌های همین درس، برای تحویل گروهی تکلیف، حالت گروه و محدودیت دسترسی.</span>${ro() ? '' : `<div class="row"><button class="btn" data-act="cl-g-auto">ساخت از روی کلاس‌ها</button><button class="btn primary" data-act="cl-g-new">+ گروه تازه</button></div>`}</div>
      ${gs.length ? gs.map(g => `<div class="card"><div class="card-head"><h2 style="margin:0">${esc(g.name)} <span class="muted small">(${fa(g.sids.length)} نفر)</span></h2>${ro() ? '' : `<div class="row"><button class="btn sm" data-act="cl-g-edit" data-id="${g.id}">ویرایش</button><button class="btn sm danger" data-act="cl-g-del" data-id="${g.id}">حذف</button></div>`}</div>
        <div class="row" style="gap:6px">${g.sids.map(id => `<span class="tag grey">${esc(student(id)?.name || '—')}</span>`).join('') || '<span class="muted small">عضوی ندارد.</span>'}</div></div>`).join('') : `<div class="card">${empty('گروهی ساخته نشده.')}</div>`}`;
  }
  function groupModal(g) {
    const fresh = !g; g = g || { id: '', name: '', sids: [] };
    modal(`<h2>${fresh ? 'گروه تازه' : 'ویرایش گروه'}</h2><label class="field"><span>نام گروه</span><input class="input" id="g-n" value="${esc(g.name)}"></label>
      <fieldset class="cr-fs" style="margin-top:12px"><legend class="small muted">اعضا</legend>${d().classes.map(k => `<div class="small" style="margin-top:8px"><b>${esc(k.name)}</b></div><div class="cr-grid">
        ${d().students.filter(s => s.cls === k.id).map(s => `<label class="cr-chk"><input type="checkbox" value="${s.id}" ${g.sids.includes(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div>`).join('')}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const name = K.v(root, 'g-n'); if (!name) return UI.invalid('#g-n', 'نام گروه را بنویسید.');
        g.name = name; g.sids = [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
        if (fresh) { g.id = D.uid('cg'); groups().push(g); }
        done('گروه ذخیره شد.');
      };
    });
  }

  /* ---------------- item pages ---------------- */
  function itemPage() {
    const it = find(state.item); if (!it) { state.item = ''; return coursePage(); }
    const s = state.as ? student(state.as) : null;
    const head = `<div class="row" style="margin-bottom:12px"><button class="btn sm" data-act="cl-item-back">‹ بازگشت به درس ${esc(state.sub)}</button>${s && !state.forced ? `<span class="tag violet">از نگاه ${esc(s.name)}</span>` : ''}</div>`;
    if (s) {
      if (it.cls && it.cls !== s.cls || it.vis === 'hide' || secHidden(C().secs.find(k => k.id === (it.sec || 'gen')) || {})) return head + `<div class="card">${empty('این فعالیت برای این دانش‌آموز در دسترس نیست.')}</div>`;
      if (!open(it, s)) return head + `<div class="card"><h2>${esc(it.title)}</h2><p class="cr-lock">در دسترس نیست مگر: ${esc(K.describe(it.restrict, names))}</p></div>`;
      if (!it.views?.[s.id]) { it.views = it.views || {}; it.views[s.id] = K.now(); save(); }
      const lang = it.lang ? ` lang="${it.lang}" dir="${it.lang === 'en' ? 'ltr' : 'rtl'}"` : '';
      const cp = completed(it, s.id), cpH = cp == null ? '' : it.comp.mode === 'manual' ? `<button class="btn sm ${cp ? 'ok' : ''}" data-act="cl-done" data-id="${it.id}" aria-pressed="${cp}">${cp ? '✓ انجام شد' : 'علامت «انجام شد»'}</button>` : `<span class="tag ${cp ? 'ok' : 'grey'}">${cp ? '✓ خاتمه یافته' : 'خاتمه نیافته'}</span>`;
      return head + `<div${lang}><div class="card"><div class="card-head"><div class="row">${tile(it.type)}<h2 style="margin:0">${esc(it.title)}</h2></div>${cpH}</div>
        ${it.comp?.expect ? `<p class="small muted" style="margin:0">انتظار می‌رود تا ${esc(K.fdt(it.comp.expect))} تکمیل شود.</p>` : ''}</div>
        ${it.type === 'assign' ? assignStudent(it, s) : it.type === 'quiz' ? Q.student(it, s) : it.type === 'choice' ? choiceStudent(it, s) : resourceStudent(it)}</div>`;
    }
    const top = `<div class="card"><div class="card-head"><div class="row">${tile(it.type)}<div><h2 style="margin:0">${esc(it.title)}</h2><div class="muted small">${TYPES[it.type][0]}${it.idnum ? ` · مشخصه: ${esc(it.idnum)}` : ''}</div></div></div>
      ${ro() ? '' : `<button class="btn sm" data-act="cl-edit" data-id="${it.id}">ویرایش تنظیمات</button>`}</div>${it.desc ? K.show(it.desc) : ''}</div>`;
    const body = it.type === 'assign' ? assignTeacher(it) : it.type === 'quiz' ? Q.teacher(it) : it.type === 'choice' ? choiceTeacher(it) : resourceTeacher(it);
    return head + top + body;
  }
  // File and link, as students open them; «نمایش» decides embed, download, open or popup.
  function fileView(it, f) {
    const e = K.ext(f.name), img = /^(png|jpe?g|gif|webp|svg)$/.test(e), pdf = e === 'pdf', aud = /^(mp3|m4a|ogg|wav)$/.test(e), vid = /^(mp4|webm)$/.test(e);
    const mode = it.display === 'auto' ? (img || pdf ? 'embed' : 'download') : it.display;
    if (mode === 'embed') {
      if (img) return `<img class="cr-embed" src="${esc(f.data)}" alt="${esc(f.name)}">`;
      if (pdf) return `<object class="cr-embed cr-pdf" data="${esc(f.data)}" type="application/pdf" aria-label="${esc(f.name)}">${K.fileLink(f)}</object>`;
      if (aud) return `<audio controls src="${esc(f.data)}" aria-label="${esc(f.name)}"></audio>`;
      if (vid) return `<video class="cr-embed" controls src="${esc(f.data)}" aria-label="${esc(f.name)}"></video>`;
    }
    if (mode === 'open' || mode === 'popup') return `<button class="btn" data-act="cl-fopen" data-id="${it.id}|${it.files.indexOf(f)}">باز کردن ${esc(f.name)}${mode === 'popup' ? ' در پنجرهٔ تازه' : ''}</button>`;
    return K.fileLink(f);
  }
  const resourceStudent = it => `<div class="card">${it.showRDesc && it.desc ? K.show(it.desc) : ''}
    ${it.type === 'file' ? it.files.map(f => `<div class="cr-fv">${fileView(it, f)}<div class="muted small">${[it.showSize && K.kb(f.size), it.showType && K.ext(f.name).toUpperCase(), it.showDate && K.fdt(f.at || it.created)].filter(Boolean).join(' · ')}</div></div>`).join('')
      : it.display === 'embed' ? `<iframe class="cr-embed cr-frame" src="${esc(it.url)}" title="${esc(it.title)}" sandbox="allow-scripts allow-same-origin allow-popups"></iframe><p class="small muted">اگر صفحه نمایش داده نشد، آن سایت اجازهٔ جاسازی نمی‌دهد: <a href="${esc(it.url)}" target="_blank" rel="noopener">باز کردن در زبانهٔ تازه</a></p>`
      : it.display === 'popup' ? `<button class="btn primary" data-act="cl-upop" data-id="${it.id}">باز کردن پیوند در پنجرهٔ تازه</button>`
      : `<a class="btn primary" href="${esc(it.url)}" target="_blank" rel="noopener">باز کردن ${esc(it.title)} ←</a><div class="muted small" dir="ltr" style="margin-top:6px">${esc(it.url)}</div>`}</div>`;
  function resourceTeacher(it) {
    const ss = scope(it), seen = ss.filter(s => it.views?.[s.id]);
    return `<div class="card">${it.type === 'file' ? it.files.map(f => `<div class="row" style="padding:4px 0">${K.fileLink(f)}<span class="muted small">${K.kb(f.size)}</span></div>`).join('') : `<a href="${esc(it.url)}" target="_blank" rel="noopener" dir="ltr">${esc(it.url)}</a>`}</div>
      <div class="card"><h2>بازدیدها: ${fa(seen.length)} از ${fa(ss.length)}</h2><div class="row" style="gap:6px">${ss.map(s => `<span class="tag ${it.views?.[s.id] ? 'ok' : 'grey'}">${esc(s.name)}</span>`).join('')}</div></div>`;
  }

  /* ---------------- choice ---------------- */
  const counts = it => it.options.map((_, i) => Object.values(it.resp || {}).filter(r => r.includes(i)).length);
  const resultsOpen = (it, sid) => it.showRes === 'always' || (it.showRes === 'after' && (it.resp?.[sid] || []).length) || (it.showRes === 'close' && it.close && K.now() >= it.close);
  const bars = (it, withNames) => { const n = counts(it), tot = Object.keys(it.resp || {}).length || 1;
    return it.options.map((o, i) => `<div class="cr-bar"><div class="spread small"><span>${esc(o)}</span><b>${fa(n[i])} (${fa(Math.round(n[i] / tot * 100))}٪)</b></div><div class="bar"><i style="width:${n[i] / tot * 100}%"></i></div>
      ${withNames ? `<div class="muted small">${Object.entries(it.resp || {}).filter(([, r]) => r.includes(i)).map(([sid]) => esc(student(sid)?.name || '')).join('، ')}</div>` : ''}</div>`).join(''); };
  function choiceStudent(it, s) {
    const mine = it.resp?.[s.id] || [], t = K.now(), before = it.open && t < it.open, after = it.close && t >= it.close, n = counts(it);
    const canAnswer = !before && !after && (!mine.length || it.allowUpdate);
    const opts = it.options.map((o, i) => { const full = it.limit && it.limits[i] && n[i] >= it.limits[i] && !mine.includes(i);
      return `<label class="cr-chk ${it.layout === 'h' ? 'inline' : ''}"><input type="${it.multi ? 'checkbox' : 'radio'}" name="ch-${it.id}" value="${i}" ${mine.includes(i) ? 'checked' : ''} ${!canAnswer || full ? 'disabled' : ''}> ${esc(o)}${full ? ' <span class="tag grey">پر شد</span>' : it.limit && it.limits[i] ? ` <span class="muted small">(${fa(it.limits[i] - n[i])} جای خالی)</span>` : ''}</label>`; }).join('');
    return `<div class="card">${it.desc ? K.show(it.desc) : ''}
      ${before ? `<p class="note">این سؤال از ${esc(K.fdt(it.open))} باز می‌شود.</p>${it.preview ? `<fieldset class="cr-fs" disabled><legend class="small muted">پیش‌نمایش گزینه‌ها</legend>${opts}</fieldset>` : ''}`
        : `<fieldset class="cr-fs ${it.layout === 'h' ? 'cl-hz' : ''}"><legend class="small muted">${it.multi ? 'یک یا چند گزینه' : 'یک گزینه'} را انتخاب کنید</legend>${opts}</fieldset>
        ${canAnswer ? `<div class="row" style="margin-top:10px"><button class="btn primary" data-act="cl-ch-save" data-id="${it.id}">ذخیرهٔ انتخاب من</button>${mine.length && it.allowUpdate ? `<button class="btn" data-act="cl-ch-del" data-id="${it.id}">پس گرفتن انتخاب</button>` : ''}</div>` : ''}
        ${mine.length ? `<p class="small muted">انتخاب شما: ${mine.map(i => esc(it.options[i])).join('، ')}</p>` : ''}${after ? '<p class="small muted">این سؤال بسته شده است.</p>' : ''}`}</div>
      ${resultsOpen(it, s.id) ? `<div class="card"><h2>نتیجه‌ها</h2>${bars(it, it.names === 'names')}</div>` : ''}`;
  }
  function choiceTeacher(it) {
    const ss = scope(it), no = ss.filter(s => !(it.resp?.[s.id] || []).length);
    return `<div class="card"><div class="card-head"><h2 style="margin:0">پاسخ‌ها: ${fa(Object.keys(it.resp || {}).length)} از ${fa(ss.length)}</h2><span class="muted small">${it.close ? `بسته شدن: ${esc(K.fdt(it.close))}` : 'بدون زمان بسته شدن'}</span></div>${bars(it, true)}</div>
      ${it.unanswered || true ? `<div class="card"><h2>پاسخ نداده‌ها (${fa(no.length)})</h2><div class="row" style="gap:6px">${no.map(s => `<span class="tag grey">${esc(s.name)}</span>`).join('') || '<span class="muted small">همه پاسخ داده‌اند.</span>'}</div></div>` : ''}`;
  }

  /* ---------------- assignment: student ---------------- */
  function canSubmit(it, s) {
    const t = K.now(), sb = subOf(it, s.id);
    if (it.allowFrom && t < it.allowFrom) return [false, `ارسال از ${K.fdt(it.allowFrom)} باز می‌شود.`];
    if (it.cutoff && t >= it.cutoff) return [false, 'زمان ارسال تمام شده و سیستم بسته است.'];
    if (it.group && it.groupReq && !groupOf(s.id)) return [false, 'برای ارسال باید عضو یک گروه باشید؛ به معلم بگویید.'];
    if (sb?.status === 'submitted' && (it.submitBtn || it.grade.workflow && it.marks?.[s.id])) return [false, ''];
    if (sb?.status === 'submitted' && it.marks?.[s.id]?.score != null) return [false, ''];
    return [true, ''];
  }
  const attemptsLeft = (it, sb) => !it.attempts || (sb?.att || 1) < it.attempts;
  function statusRows(it, s) {
    const sb = subOf(it, s.id), t = K.now(), g = aGrade(it, s.id);
    const st = !sb || sb.status === 'new' ? 'بدون ارسال' : sb.status === 'draft' ? 'پیش‌نویس (ارسال نشده)' : sb.status === 'reopened' ? 'تلاش تازه باز است' : it.groupAll && it.group && !groupDone(it, s.id) ? 'منتظر تأیید دیگر اعضای گروه' : 'برای نمره‌دهی ارسال شده';
    let left = '—';
    if (it.due) { if (sb?.status === 'submitted') { const sp = K.span(it.due, sb.at); left = sp.neg ? `تکلیف ${sp.text} زودتر ارسال شد` : `تکلیف ${sp.text} با تأخیر ارسال شد`; } else { const sp = K.span(t, it.due); left = sp.neg ? `تکلیف ${sp.text} دیر شده است` : sp.text; } }
    const rowsH = [['شمارهٔ تلاش', `این تلاش ${fa(sb?.att || 1)} است${it.attempts ? ` (${fa(it.attempts)} تلاش مجاز)` : ''}.`], it.group && ['گروه', groupOf(s.id)?.name || 'بدون گروه'],
      ['وضعیت ارسال', st], ['وضعیت نمره‌دهی', g ? 'نمره داده شده' : 'نمره داده نشده'], ['مهلت تحویل', it.due ? K.fdt(it.due) : '—'], it.cutoff && ['بسته شدن سیستم', K.fdt(it.cutoff)], ['زمان باقی‌مانده', left],
      ['آخرین تغییر', sb?.at ? K.fdt(sb.at) : '—']].filter(Boolean);
    return `<div class="table-wrap"><table class="cr-st"><caption class="sr-only">وضعیت ارسال</caption>${rowsH.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${esc(b)}</td></tr>`).join('')}
      ${it.st.text && sb?.text ? `<tr><th scope="row">متن آنلاین</th><td>${K.show(sb.text)}<div class="muted small">${fa(K.words(sb.text))} واژه</div></td></tr>` : ''}
      ${sb?.files?.length ? `<tr><th scope="row">فایل‌های ارسال‌شده</th><td><div class="row">${sb.files.map(K.fileLink).join('')}</div></td></tr>` : ''}</table></div>`;
  }
  const members = (it, sid) => it.group && groupOf(sid) ? groupOf(sid).sids : [sid];
  const groupDone = (it, sid) => { const sb = subOf(it, sid); return !it.groupAll || members(it, sid).every(m => sb?.acc?.[m]); };
  function assignStudent(it, s) {
    const sb = subOf(it, s.id), t = K.now(), [can, why] = canSubmit(it, s), g = aGrade(it, s.id), m = it.marks?.[s.id];
    const descOk = it.alwaysDesc || !it.allowFrom || t >= it.allowFrom;
    const files = !it.filesOnSubmit && it.files.length ? `<div class="row" style="margin-top:8px">${it.files.map(K.fileLink).join('')}</div>` : '';
    if (state.edit && can) return `<div class="card">${descOk && it.desc ? K.show(it.desc) : ''}</div>` + submitForm(it, s);
    const failed = g && it.grade.pass !== '' && !passed(it, s.id);
    const again = sb?.status === 'submitted' && it.reopen === 'untilpass' && failed && attemptsLeft(it, sb);
    return `<div class="card">${descOk ? (it.desc ? K.show(it.desc) : '') + files : '<p class="muted">توضیح تکلیف از زمان باز شدن ارسال نمایش داده می‌شود.</p>'}</div>
      <div class="card"><h2>وضعیت ارسال</h2>${statusRows(it, s)}
        ${why ? `<p class="note" style="margin-top:10px">${esc(why)}</p>` : ''}
        <div class="row" style="margin-top:12px">${can ? `<button class="btn primary" data-act="cl-a-edit">${sb && sb.status !== 'new' && (sb.text || sb.files?.length) ? 'ویرایش ارسال' : 'افزودن ارسال'}</button>` : ''}
          ${can && sb && (sb.text || sb.files?.length) ? `<button class="btn" data-act="cl-a-rm" data-id="${it.id}">حذف ارسال</button>` : ''}
          ${it.submitBtn && sb?.status === 'draft' && can ? `<button class="btn primary" data-act="cl-a-submit" data-id="${it.id}">ارسال برای نمره‌دهی</button>` : ''}
          ${it.groupAll && it.group && sb?.status === 'submitted' && !sb.acc?.[s.id] ? `<button class="btn primary" data-act="cl-a-submit" data-id="${it.id}">تأیید ارسال گروه</button>` : ''}
          ${again ? `<button class="btn" data-act="cl-a-again" data-id="${it.id}">شروع تلاش تازه</button>` : ''}</div>
        ${it.submitBtn && sb?.status === 'draft' && it.statement ? `<label class="cr-chk" style="margin-top:8px"><input type="checkbox" id="a-stm2"> این کار خودم است و از کار دیگران بدون ذکر منبع استفاده نکرده‌ام.</label>` : ''}</div>
      ${g ? `<div class="card"><h2>بازخورد</h2><div class="table-wrap"><table class="cr-st"><tr><th scope="row">نمره</th><td><b>${esc(g.text)}</b>${it.grade.pass !== '' ? ` <span class="tag ${passed(it, s.id) ? 'ok' : 'bad'}">${passed(it, s.id) ? 'قبول' : 'نیاز به تلاش دوباره'}</span>` : ''}</td></tr>
        <tr><th scope="row">نمره‌دهی در</th><td>${esc(K.fdt(m.at))}</td></tr>${it.grade.hideGrader ? '' : `<tr><th scope="row">نمره‌دهی شده توسط</th><td>${esc(m.by)}</td></tr>`}
        ${critView(it, m)}${m.fb ? `<tr><th scope="row">توضیحات بازخورد</th><td>${K.show(m.fb)}</td></tr>` : ''}${m.inline ? `<tr><th scope="row">توضیحات درخط</th><td>${K.show(m.inline)}</td></tr>` : ''}
        ${m.fbFiles?.length ? `<tr><th scope="row">فایل‌های بازخورد</th><td><div class="row">${m.fbFiles.map(K.fileLink).join('')}</div></td></tr>` : ''}</table></div></div>` : ''}`;
  }
  const critView = (it, m) => it.grade.method === 'simple' || !m.crit ? '' : `<tr><th scope="row">${it.grade.method === 'rubric' ? 'روبریک' : 'راهنمای نمره‌دهی'}</th><td>${it.grade.criteria.map((c, i) => {
    const x = m.crit[i]; if (x == null) return '';
    return `<div class="small"><b>${esc(c.name)}:</b> ${it.grade.method === 'rubric' ? `${esc(c.levels[x.lv]?.l || '')} (${fa(c.levels[x.lv]?.p ?? 0)})` : `${fa(x.p)} از ${fa(c.max)}`}${x.r ? ` — ${esc(x.r)}` : ''}</div>`; }).join('')}</td></tr>`;
  function submitForm(it, s) {
    const sb = subOf(it, s.id) || {}, st = it.st;
    return `<div class="card"><h2>${sb.text || sb.files?.length ? 'ویرایش ارسال' : 'افزودن ارسال'}</h2>
      ${it.activity ? `<div class="cr-actv">${K.show(it.activity)}</div>` : ''}${it.filesOnSubmit && it.files.length ? `<div class="row" style="margin:8px 0">${it.files.map(K.fileLink).join('')}</div>` : ''}
      ${st.text ? `<div class="field"><span>متن آنلاین${st.words ? ` (حداکثر ${fa(st.words)} واژه)` : ''}</span>${K.rich('a-text', sb.text || '', 'متن آنلاین', 6)}</div>` : ''}
      ${st.file ? `<div class="field"><span>فایل‌ها (حداکثر ${fa(st.maxFiles)} فایل، هر کدام تا ${K.kb(st.maxKB * 1024)}${st.types ? `؛ انواع: <span dir="ltr">${esc(st.types)}</span>` : ''})</span>${K.filesField('a-files', sb.files || [], st.types.replace(/ /g, ','), st.maxFiles > 1)}</div>` : ''}
      ${!st.text && !st.file ? '<p class="muted">این تکلیف ارسال آنلاین ندارد؛ کار را در کلاس تحویل دهید.</p>' : ''}
      ${it.statement && !it.submitBtn ? `<label class="cr-chk" style="margin-top:10px"><input type="checkbox" id="a-stm"> این کار خودم است و از کار دیگران بدون ذکر منبع استفاده نکرده‌ام.</label>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn primary" data-act="cl-a-save" data-id="${it.id}">ذخیرهٔ تغییرات</button><button class="btn" data-act="cl-a-cancel">انصراف</button></div></div>`;
  }
  async function saveSubmission(it, s, root) {
    const st = it.st, key = subKey(it, s.id), old = it.subs?.[key] || {};
    const text = st.text ? K.readRich(root, 'a-text') : '';
    if (st.text && st.words && K.words(text) > st.words) return UI.invalid('#a-text', `متن از ${fa(st.words)} واژه بیشتر است.`);
    let files = [];
    if (st.file) {
      try { files = await K.readFilesField(root, 'a-files', old.files || [], st.maxKB); } catch (e) { return UI.invalid('#a-files', `«${e.message}» از سقف ${K.kb(st.maxKB * 1024)} بزرگ‌تر است.`); }
      if (files.length > st.maxFiles) return UI.invalid('#a-files', `حداکثر ${fa(st.maxFiles)} فایل مجاز است.`);
      const ok = st.types.split(' ').filter(Boolean); const bad = ok.length && files.find(f => !ok.includes('.' + K.ext(f.name)));
      if (bad) return UI.invalid('#a-files', `نوع «${bad.name}» پذیرفته نیست.`);
    }
    if (!K.plain(text) && !files.length) return UI.invalid(st.text ? '#a-text' : '#a-files', 'چیزی برای ارسال نیست.');
    if (it.statement && !it.submitBtn && !root.querySelector('#a-stm')?.checked) return UI.invalid('#a-stm', 'برای ارسال، تعهدنامه را بپذیرید.');
    it.subs = it.subs || {};
    it.subs[key] = { ...old, text, files, at: K.now(), by: s.id, att: old.att || 1, status: it.submitBtn ? 'draft' : 'submitted', acc: it.submitBtn ? {} : { [s.id]: true } };
    state.edit = false; save(); render(); toast(it.submitBtn ? 'پیش‌نویس ذخیره شد؛ برای نمره‌دهی «ارسال» را بزنید.' : it.due && K.now() > it.due ? 'ارسال با تأخیر ثبت شد.' : 'ارسال ثبت شد.');
  }

  /* ---------------- assignment: teacher ---------------- */
  const needGrading = it => scope(it).filter(s => { const sb = subOf(it, s.id), m = it.marks?.[s.id]; return sb?.status === 'submitted' && groupDone(it, s.id) && (!m || m.score == null || m.at < sb.at); });
  function assignTeacher(it) {
    let ss = scope(it);
    const gm = it.gmode && it.gmode !== 'none' && groups().length;
    if (gm && state.grp) ss = ss.filter(s => groups().find(g => g.id === state.grp)?.sids.includes(s.id));
    const subs = ss.map(s => subOf(it, s.id)), sent = subs.filter(x => x?.status === 'submitted').length, drafts = subs.filter(x => x?.status === 'draft').length;
    const left = it.due ? K.span(K.now(), it.due) : null;
    const sum = [['پنهان از دانش‌آموزان', it.vis === 'show' ? 'خیر' : 'بله'], ['شرکت‌کنندگان', fa(ss.length)], ['پیش‌نویس', fa(drafts)], ['ارسال‌شده', fa(sent)], ['نیازمند نمره‌دهی', fa(needGrading(it).filter(s => ss.includes(s)).length)],
      ['مهلت تحویل', it.due ? K.fdt(it.due) : '—'], ['زمان باقی‌مانده', left ? (left.neg ? 'مهلت تمام شده' : left.text) : '—'], it.cutoff && ['بسته شدن سیستم', K.fdt(it.cutoff)], it.gradeBy && ['یادآوری نمره‌دهی تا', K.fdt(it.gradeBy)]].filter(Boolean);
    return `<div class="card"><h2>خلاصهٔ نمره‌دهی</h2><div class="table-wrap"><table class="cr-st">${sum.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${esc(b)}</td></tr>`).join('')}</table></div></div>
      <div class="card"><div class="card-head"><h2 style="margin:0">ارسال‌ها</h2><div class="row">
        ${gm ? `<label class="row small">${it.gmode === 'separate' ? 'گروه‌های جداگانه' : 'گروه‌های قابل مشاهده'} <select class="input" id="cr-grp"><option value="">همهٔ شرکت‌کنندگان</option>${groups().map(g => `<option value="${g.id}" ${g.id === state.grp ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>` : ''}
        ${it.fb.offline ? `<button class="btn sm" data-act="cl-ws-get" data-id="${it.id}">دانلود کاربرگ نمره‌دهی</button><label class="btn sm">بارگذاری کاربرگ<input type="file" hidden accept=".csv" data-ws="${it.id}"></label>` : ''}
        ${it.grade.blind && !it.revealed && !ro() ? `<button class="btn sm" data-act="cl-reveal" data-id="${it.id}">آشکارسازی هویت‌ها</button>` : ''}</div></div>
        <div class="table-wrap" tabindex="0" role="region" aria-label="جدول ارسال‌ها"><table><tr><th>${it.grade.blind && !it.revealed ? 'شرکت‌کننده' : 'دانش‌آموز'}</th>${it.group ? '<th>گروه</th>' : ''}<th>وضعیت</th><th>نمره</th>${it.grade.workflow ? '<th>روند نمره‌دهی</th>' : ''}<th>آخرین تغییر</th><th>ارسال</th><th>بازخورد</th><th><span class="sr-only">کارها</span></th></tr>
        ${ss.map(s => { const sb = subOf(it, s.id), m = it.marks?.[s.id], g = aGrade(it, s.id, true), late = sb?.status === 'submitted' && it.due && sb.at > it.due;
          return `<tr><td>${esc(who(it, s.id))}${it.grade.blind && !it.revealed ? '' : `<div class="muted small">${esc(className(s.cls))}</div>`}</td>${it.group ? `<td class="small">${esc(groupOf(s.id)?.name || '—')}</td>` : ''}
            <td>${!sb || sb.status === 'new' ? '<span class="tag grey">بدون ارسال</span>' : sb.status === 'draft' ? '<span class="tag warn">پیش‌نویس</span>' : sb.status === 'reopened' ? '<span class="tag blue">تلاش تازه</span>' : '<span class="tag ok">ارسال شده</span>'}
              ${late ? `<span class="tag bad">${esc(K.span(it.due, sb.at).text)} تأخیر</span>` : ''}${sb?.att > 1 ? `<span class="tag grey">تلاش ${fa(sb.att)}</span>` : ''}</td>
            <td class="num">${g ? esc(g.text) : '—'}</td>${it.grade.workflow ? `<td class="small">${esc(WF.find(w => w[0] === (m?.wf || 'notmarked'))[1])}</td>` : ''}
            <td class="small">${sb?.at ? esc(K.fdt(sb.at)) : '—'}</td>
            <td>${sb?.text ? `<details><summary class="small">متن (${fa(K.words(sb.text))} واژه)</summary>${K.show(sb.text)}</details>` : ''}${(sb?.files || []).map(K.fileLink).join(' ')}</td>
            <td class="small">${m?.fb ? esc(K.plain(m.fb).slice(0, 60)) : ''}</td>
            <td>${ro() ? '' : `<div class="row"><button class="btn sm primary" data-act="cl-grade" data-id="${it.id}|${s.id}">نمره‌دهی</button>
              ${it.reopen === 'manual' && sb?.status === 'submitted' && attemptsLeft(it, sb) ? `<button class="btn sm" data-act="cl-reopen" data-id="${it.id}|${s.id}">اجازهٔ تلاش دوباره</button>` : ''}
              ${it.submitBtn && sb?.status === 'submitted' ? `<button class="btn sm" data-act="cl-todraft" data-id="${it.id}|${s.id}">بازگرداندن به پیش‌نویس</button>` : ''}</div>`}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function gradeModal(it, sid) {
    const sb = subOf(it, sid), m = it.marks?.[sid] || {}, g = it.grade, sc = SCALES[g.scale];
    const crit = g.method === 'simple' ? '' : g.criteria.map((c, i) => g.method === 'rubric'
      ? `<fieldset class="cr-fs rub"><legend><b>${esc(c.name)}</b></legend>${c.levels.map((l, k) => `<label class="rub-l"><input type="radio" name="rb${i}" value="${k}" ${m.crit?.[i]?.lv === k ? 'checked' : ''}> ${esc(l.l)} <b>${fa(l.p)}</b></label>`).join('')}
        <input class="input sm" data-rr="${i}" value="${esc(m.crit?.[i]?.r || '')}" placeholder="توضیح" aria-label="توضیح معیار ${esc(c.name)}"></fieldset>`
      : `<div class="field"><span><b>${esc(c.name)}</b> (از ${fa(c.max)})${c.desc ? ` — <span class="muted">${esc(c.desc)}</span>` : ''}</span><div class="row"><input class="input num" style="width:90px" data-gp="${i}" value="${m.crit?.[i]?.p ?? ''}" aria-label="امتیاز ${esc(c.name)}">
        <input class="input" style="flex:1" data-gr="${i}" value="${esc(m.crit?.[i]?.r || '')}" placeholder="توضیح" aria-label="توضیح ${esc(c.name)}"></div></div>`).join('');
    const gIn = g.type === 'none' ? '<p class="muted small">این تکلیف نمره ندارد؛ فقط بازخورد.</p>' : g.method !== 'simple' ? `${crit}<p class="small muted">نمره از جمع معیارها به ${g.type === 'point' ? `${fa(g.max)}` : 'مقیاس'} تبدیل می‌شود.</p>`
      : g.type === 'scale' ? `<label class="field"><span>نمره</span>${K.sel('gr-s', [['', 'بدون نمره'], ...sc.map((l, i) => [i, l])], m.score ?? '')}</label>`
      : `<label class="field"><span>نمره (از ${fa(g.max)})</span><input class="input num" id="gr-s" value="${m.score ?? ''}"></label>`;
    modal(`<h2>نمره‌دهی: ${esc(it.title)}</h2><p class="muted" style="margin:0">${esc(who(it, sid))}${sb?.at ? ` · ارسال: ${esc(K.fdt(sb.at))}` : ' · بدون ارسال'}</p>
      ${sb?.text ? `<div class="cr-sub"><b class="small">متن آنلاین</b>${K.show(sb.text)}</div>` : ''}${sb?.files?.length ? `<div class="row" style="margin-top:6px">${sb.files.map(K.fileLink).join('')}</div>` : ''}
      ${gIn}
      ${it.fb.inline && it.st.text && sb?.text ? `<div class="field"><span>توضیحات درخط (متن دانش‌آموز را ویرایش و توضیح اضافه کنید)</span>${K.rich('gr-in', m.inline || sb.text, 'توضیحات درخط', 5)}</div>` : ''}
      ${it.fb.comments ? `<div class="field"><span>توضیحات بازخورد</span>${K.rich('gr-fb', m.fb || '', 'توضیحات بازخورد', 3)}</div>` : ''}
      ${it.fb.files ? `<div class="field"><span>فایل‌های بازخورد</span>${K.filesField('gr-ff', m.fbFiles || [])}</div>` : ''}
      ${g.workflow ? `<label class="field"><span>روند نمره‌دهی</span>${K.sel('gr-wf', WF, m.wf || 'inmarking')}</label>` : ''}
      ${it.group && groupOf(sid) ? K.chk('gr-all', true, `اعمال نمره و بازخورد برای همهٔ اعضای «${groupOf(sid).name}»`) : ''}
      ${K.chk('gr-ntf', it.notify.students, 'اطلاع به دانش‌آموز')}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیرهٔ نمره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('.modal').classList.add('cr-modal'); K.wire(root);
      root.querySelector('#save').onclick = async () => {
        const o = { by: me(), at: K.now(), wfOn: g.workflow, wf: g.workflow ? K.v(root, 'gr-wf') : 'released', notified: K.on(root, 'gr-ntf') };
        if (g.type !== 'none') {
          if (g.method === 'simple') {
            const raw = K.v(root, 'gr-s');
            if (raw === '') o.score = null; else { const n = K.num(raw); if (g.type === 'point' && !(n >= 0 && n <= g.max)) return UI.invalid('#gr-s', `نمره باید بین ۰ و ${fa(g.max)} باشد.`); o.score = n; }
          } else {
            o.crit = {}; let sum = 0, top = 0;
            for (let i = 0; i < g.criteria.length; i++) {
              const c = g.criteria[i];
              if (g.method === 'rubric') { const r = root.querySelector(`input[name=rb${i}]:checked`); if (!r) return UI.invalid(root.querySelector(`input[name=rb${i}]`), `سطح «${c.name}» را انتخاب کنید.`);
                o.crit[i] = { lv: +r.value, r: root.querySelector(`[data-rr="${i}"]`).value.trim() }; sum += c.levels[+r.value].p; top += Math.max(...c.levels.map(l => l.p)); }
              else { const p = K.num(root.querySelector(`[data-gp="${i}"]`).value); if (!(p >= 0 && p <= c.max)) return UI.invalid(root.querySelector(`[data-gp="${i}"]`), `امتیاز «${c.name}» بین ۰ و ${fa(c.max)}.`);
                o.crit[i] = { p, r: root.querySelector(`[data-gr="${i}"]`).value.trim() }; sum += p; top += c.max; }
            }
            const f = top ? sum / top : 0;
            o.score = g.type === 'scale' ? Math.round(f * (sc.length - 1)) : Math.round(f * g.max * 100) / 100;
          }
        }
        if (it.fb.comments) o.fb = K.readRich(root, 'gr-fb');
        if (root.querySelector('#gr-in')) o.inline = K.readRich(root, 'gr-in');
        if (it.fb.files) { try { o.fbFiles = await K.readFilesField(root, 'gr-ff', m.fbFiles || []); } catch (e) { return UI.invalid('#gr-ff', `«${e.message}» از ۵۰۰ کیلوبایت بزرگ‌تر است.`); } }
        it.marks = it.marks || {};
        (K.on(root, 'gr-all') ? members(it, sid) : [sid]).forEach(x => { it.marks[x] = { ...(it.marks[x] || {}), ...o }; });
        sync(it); done('نمره ذخیره شد.');
      };
    });
  }
  // The offline grading worksheet: one CSV row per participant; the edited file brings grades and comments back.
  function worksheet(it) {
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = [['شناسه', 'نام', 'وضعیت', 'نمره', 'حداکثر', 'بازخورد'], ...scope(it).map(s => { const m = it.marks?.[s.id]; return [s.id, who(it, s.id), subOf(it, s.id)?.status === 'submitted' ? 'ارسال شده' : 'بدون ارسال', m?.score ?? '', it.grade.max, K.plain(m?.fb || '')]; })];
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `کاربرگ-${it.title}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function parseCsv(text) {
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); out.push(row); row = []; cell = ''; } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out;
  }

  /* ---------------- landing ---------------- */
  function online() {
    // A signed-in student always sees the pages as themself; nobody else keeps that view after leaving the role.
    const self = ctx.role() === 'student' && ctx.sid?.();
    if (self) { state.as = self; state.forced = true; } else if (state.forced) { state.as = ''; state.forced = false; }
    const subs = subjectsFor();
    if (state.sub && !subs.includes(state.sub)) state.sub = '';
    const TONES = ['blue', 'violet', 'teal', 'amber', 'rose'];
    if (!state.sub) return `<div class="subj-cards">${subs.map((s, k) => { const c = Classroom.peek(d(), s), n = c.items.length, due = c.items.filter(i => i.type === 'assign' && i.due && i.due >= K.now()).length;
      return `<button class="subj-card" data-act="cl-sub" data-id="${esc(s)}"><span class="tile tone-${TONES[k % TONES.length]}">${TabIcons.forLabel(s) || Shell.icon('book')}</span><b>${esc(s)}</b>
        <span class="small muted">${n ? `${fa(n)} فعالیت و منبع` : 'هنوز خالی'}${c.link ? ' · لینک کلاس آماده' : ''}</span>${due ? `<span class="tag warn">${fa(due)} تکلیف باز</span>` : ''}</button>`; }).join('')}</div>`;
    return state.item ? itemPage() : coursePage();
  }

  /* ---------------- notifications ---------------- */
  function feed() {
    if (ro() || !['teacher', 'counselor'].includes(ctx.role())) return [];
    const out = [];
    Object.entries(d().classroom || {}).forEach(([sub, c]) => c.items.forEach(it => {
      if (it.type !== 'assign') return;
      Object.entries(it.subs || {}).forEach(([k, sb]) => {
        if (sb.status !== 'submitted') return;
        const late = it.due && sb.at > it.due;
        if (!(it.notify?.graders || (late && it.notify?.late))) return;
        const nm = k.startsWith('g:') ? (c.groups.find(g => 'g:' + g.id === k)?.name || 'گروه') : (it.grade?.blind && !it.revealed ? 'یک شرکت‌کننده' : student(k)?.name || '');
        out.push({ key: `cr:${it.id}:${k}:${sb.at}`, type: 'reminder', title: `${late ? 'ارسال با تأخیر' : 'ارسال تازه'}: ${it.title}`, text: `${nm} · ${sub}`, at: sb.at, href: ctx.hrefOf('online'), unread: true });
      });
      if (it.gradeBy && it.gradeBy <= K.now()) {
        const n = Object.values(it.subs || {}).filter(x => x.status === 'submitted').length - Object.values(it.marks || {}).filter(m => m.score != null).length;
        if (n > 0) out.push({ key: `crg:${it.id}:${it.gradeBy}`, type: 'reminder', title: `یادآوری نمره‌دهی: ${it.title}`, text: `${fa(n)} ارسال منتظر نمره · ${sub}`, at: it.gradeBy, href: ctx.hrefOf('online'), unread: true });
      }
    }));
    return out;
  }

  /* ---------------- quiz ---------------- */
  const Q = CRQuiz({ K, d, save, render, state, find, scope, student, className, me, ro, done, sync, groups, who, items });

  /* ---------------- wiring ---------------- */
  const pick = b => b.dataset.id.split('|');
  const act = {
    // The desk's «تکلیف تازه»: open the teacher's class page and the assignment form.
    'cl-quick': () => { state.sub = subjectsFor()[0]; state.item = ''; state.as = ''; state.tab = 'course'; location.hash = ctx.hrefOf('online'); setTimeout(() => itemModal('assign'), 60); },
    'cl-sub': b => { state.sub = b.dataset.id; state.item = ''; state.tab = 'course'; render(); },
    'cl-back': () => { state.sub = ''; state.item = ''; render(); },
    'cl-tab': b => { state.tab = b.dataset.id; render(); },
    'cl-link': () => {
      const link = document.getElementById('on-link').value.trim();
      if (link && !/^https?:\/\//i.test(link)) return UI.invalid('#on-link', 'لینک باید با http:// یا https:// شروع شود.');
      C().link = link; save(); render(); toast('لینک ذخیره شد.');
    },
    'cl-add': b => chooser(b.dataset.id),
    'cl-edit': b => { const it = find(b.dataset.id); if (it) itemModal(it.type, it); },
    'cl-open': b => { state.item = b.dataset.id; state.edit = false; render(); scrollTo(0, 0); },
    'cl-item-back': () => { state.item = ''; state.edit = false; render(); },
    'cl-vis': b => { const it = find(b.dataset.id); it.vis = it.vis === 'show' ? 'hide' : 'show'; save(); render(); toast(it.vis === 'show' ? 'برای دانش‌آموزان نمایش داده می‌شود.' : 'از دانش‌آموزان پنهان شد.'); },
    'cl-del': async b => {
      const it = find(b.dataset.id); if (!await UI.ask('حذف', `«${it.title}» و همهٔ ارسال‌ها و پاسخ‌هایش حذف شود؟`, 'حذف کن')) return;
      const back = UI.drop(items(), i => i.id === it.id); save(); render(); UI.undo('حذف شد.', back, () => { save(); render(); });
    },
    'cl-up': b => move(b.dataset.id, -1), 'cl-down': b => move(b.dataset.id, 1),
    'cl-sec-new': () => secModal(),
    'cl-subsec': b => secModal(null, b.dataset.id),
    'cl-sec-vis': b => { const sc = C().secs.find(k => k.id === b.dataset.id); sc.hidden = !sc.hidden; save(); render(); toast(sc.hidden ? `«${sc.title}» از دانش‌آموزان پنهان شد.` : `«${sc.title}» برای دانش‌آموزان نمایش داده می‌شود.`); },
    'cl-sec-up': b => secMove(b.dataset.id, -1), 'cl-sec-down': b => secMove(b.dataset.id, 1),
    'cl-col': b => { const id = b.dataset.id; if (state.col.has(id)) state.col.delete(id); else state.col.add(id); render(); },
    'cl-col-all': () => { const all = C().secs.every(k => state.col.has(k.id)); C().secs.forEach(k => { if (all) state.col.delete(k.id); else state.col.add(k.id); }); render(); },
    'cl-move': b => moveModal([b.dataset.id]),
    'cl-dup': b => { const it = find(b.dataset.id), list = items(); list.splice(list.indexOf(it) + 1, 0, dup(it)); save(); render(); toast('نسخهٔ دوم ساخته شد (پنهان از دانش‌آموزان).'); },
    'cl-bulk': () => { state.bulk = !state.bulk; state.picked.clear(); render(); },
    'cl-bk-all': () => { items().forEach(i => state.picked.add(i.id)); render(); },
    'cl-bk-none': () => { state.picked.clear(); render(); },
    'cl-bk-sec': b => { items().filter(i => (i.sec || 'gen') === b.dataset.id).forEach(i => state.picked.add(i.id)); render(); },
    'cl-bk-show': () => { items().forEach(i => { if (state.picked.has(i.id)) i.vis = 'show'; }); save(); render(); toast('برای دانش‌آموزان نمایش داده می‌شوند.'); },
    'cl-bk-hide': () => { items().forEach(i => { if (state.picked.has(i.id)) i.vis = 'hide'; }); save(); render(); toast('از دانش‌آموزان پنهان شدند.'); },
    'cl-bk-dup': () => { const list = items(), sel = list.filter(i => state.picked.has(i.id)); sel.forEach(i => list.splice(list.indexOf(i) + 1, 0, dup(i))); state.picked.clear(); save(); render(); toast(`${fa(sel.length)} نسخهٔ دوم ساخته شد.`); },
    'cl-bk-move': () => moveModal([...state.picked]),
    'cl-bk-del': async () => {
      const n = state.picked.size; if (!await UI.ask('حذف گروهی', `${fa(n)} مورد با همهٔ ارسال‌ها و پاسخ‌هایشان حذف شود؟`, 'حذف کن')) return;
      const list = items(), before = list.slice(); list.splice(0, list.length, ...list.filter(i => !state.picked.has(i.id))); state.picked.clear(); save(); render();
      UI.undo(`${fa(n)} مورد حذف شد.`, () => list.splice(0, list.length, ...before), () => { save(); render(); });
    },
    'cl-set-save': () => {
      const link = document.getElementById('cs-link').value.trim();
      if (link && !/^https?:\/\//i.test(link)) return UI.invalid('#cs-link', 'لینک باید با http:// یا https:// شروع شود.');
      const c = C(), val = id => document.getElementById(id).value === '1'; c.link = link;
      Object.assign(c.set, { summary: K.readRich(document, 'cs-sum'), showGrades: val('cs-gr'), showDates: val('cs-dt'), showCond: val('cs-cd') });
      save(); render(); toast('تنظیمات درس ذخیره شد.');
    },
    'cl-sec-ren': b => secModal(C().secs.find(s => s.id === b.dataset.id)),
    'cl-sec-del': async b => {
      const c = C(), sc = c.secs.find(s => s.id === b.dataset.id), to = sc.parent || 'gen', kids = c.secs.filter(k => k.parent === sc.id).map(k => k.id);
      if (!await UI.ask('حذف بخش', `«${sc.title}» حذف شود؟ فعالیت‌هایش${kids.length ? ' و فعالیت‌های زیربخش‌هایش' : ''} به «${c.secs.find(k => k.id === to).title}» می‌روند.`, 'حذف کن')) return;
      c.items.forEach(i => { if (i.sec === sc.id || kids.includes(i.sec)) i.sec = to; }); c.secs = c.secs.filter(s => s.id !== sc.id && !kids.includes(s.id)); save(); render();
    },
    'cl-g-new': () => groupModal(), 'cl-g-edit': b => groupModal(groups().find(g => g.id === b.dataset.id)),
    'cl-g-del': async b => { const g = groups().find(x => x.id === b.dataset.id); if (!await UI.ask('حذف گروه', `گروه «${g.name}» حذف شود؟`, 'حذف کن')) return; C().groups = groups().filter(x => x.id !== g.id); save(); render(); },
    'cl-g-auto': () => { const c = C(); let n = 0; d().classes.forEach(k => { if (!c.groups.some(g => g.name === k.name)) { c.groups.push({ id: D.uid('cg'), name: k.name, sids: d().students.filter(s => s.cls === k.id).map(s => s.id) }); n++; } }); save(); render(); toast(n ? `${fa(n)} گروه ساخته شد.` : 'گروه همهٔ کلاس‌ها از قبل هست.'); },
    'cl-done': b => { const it = find(b.dataset.id); it.done = it.done || {}; it.done[state.as] = !it.done[state.as]; save(); render(); },
    'cl-fopen': b => { const [id, i] = pick(b), it = find(id), f = it.files[+i];
      fetch(f.data).then(r => r.blob()).then(bl => { const u = URL.createObjectURL(bl); window.open(u, '_blank', it.display === 'popup' ? `popup,width=${it.popW},height=${it.popH}` : ''); setTimeout(() => URL.revokeObjectURL(u), 60000); }); },
    'cl-upop': b => { const it = find(b.dataset.id); window.open(it.url, '_blank', `popup,noopener,width=${it.popW},height=${it.popH}`); },
    'cl-ch-save': b => {
      const it = find(b.dataset.id), pickd = [...document.querySelectorAll(`input[name="ch-${it.id}"]:checked`)].map(i => +i.value);
      if (!pickd.length) return UI.invalid(document.querySelector(`input[name="ch-${it.id}"]`), 'یک گزینه انتخاب کنید.');
      it.resp = it.resp || {}; it.resp[state.as] = pickd; save(); render(); toast('انتخاب ثبت شد.');
    },
    'cl-ch-del': b => { const it = find(b.dataset.id); delete it.resp[state.as]; save(); render(); toast('انتخاب پس گرفته شد.'); },
    'cl-a-edit': () => { state.edit = true; render(); },
    'cl-a-cancel': () => { state.edit = false; render(); },
    'cl-a-save': b => saveSubmission(find(b.dataset.id), student(state.as), document.getElementById('view') || document),
    'cl-a-rm': async b => { const it = find(b.dataset.id), k = subKey(it, state.as); if (!await UI.ask('حذف ارسال', 'متن و فایل‌های ارسال‌شده پاک شود؟', 'پاک کن')) return; it.subs[k] = { ...it.subs[k], text: '', files: [], status: 'new', at: K.now() }; save(); render(); },
    'cl-a-submit': b => {
      const it = find(b.dataset.id), k = subKey(it, state.as), sb = it.subs[k];
      if (it.statement && sb.status === 'draft' && !document.getElementById('a-stm2')?.checked) return UI.invalid('#a-stm2', 'برای ارسال، تعهدنامه را بپذیرید.');
      sb.acc = { ...(sb.acc || {}), [state.as]: true }; sb.status = 'submitted'; sb.at = sb.status === 'submitted' && sb.at ? sb.at : K.now(); save(); render(); toast('برای نمره‌دهی ارسال شد.');
    },
    'cl-a-again': b => reopen(find(b.dataset.id), state.as),
    'cl-grade': b => { const [id, sid] = pick(b); gradeModal(find(id), sid); },
    'cl-reopen': b => { const [id, sid] = pick(b); reopen(find(id), sid); toast('تلاش تازه برای دانش‌آموز باز شد.'); },
    'cl-todraft': b => { const [id, sid] = pick(b), it = find(id), sb = subOf(it, sid); sb.status = 'draft'; sb.acc = {}; save(); render(); toast('به پیش‌نویس برگشت.'); },
    'cl-reveal': async b => { const it = find(b.dataset.id); if (!await UI.ask('آشکارسازی هویت‌ها', 'پس از آشکارسازی، نام‌ها دیگر پنهان نمی‌شود. ادامه می‌دهید؟', 'آشکار کن')) return; it.revealed = true; save(); render(); },
    'cl-ws-get': b => worksheet(find(b.dataset.id)),
    ...Q.act,
  };
  function reopen(it, sid) {
    const k = subKey(it, sid), sb = it.subs[k];
    it.subs[k] = { status: 'reopened', att: (sb.att || 1) + 1, text: sb.text, files: sb.files, at: K.now(), acc: {}, hist: [...(sb.hist || []), { ...sb, hist: undefined }] };
    members(it, sid).forEach(x => { const m = it.marks?.[x]; if (m) it.marks[x] = { hist: [...(m.hist || []), { ...m, hist: undefined }] }; });
    save(); render();
  }
  function move(id, dir) {
    const list = items(), i = list.findIndex(x => x.id === id), it = list[i];
    let j = i + dir; while (j >= 0 && j < list.length && (list[j].sec || 'gen') !== (it.sec || 'gen')) j += dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; save(); render();
  }
  function secModal(sc, parent) {
    const kind = sc?.parent || parent ? 'زیربخش' : 'بخش';
    modal(`<h2>${sc ? `ویرایش ${kind}` : `${kind} تازه`}</h2><label class="field"><span>نام ${kind}</span><input class="input" id="sc-t" value="${esc(sc?.title || '')}" placeholder="${parent || sc?.parent ? 'مثلاً درس ۱: سرعت' : 'مثلاً فصل ۲: معادله‌ها'}"></label>
      <div class="field"><span>خلاصه</span>${K.rich('sc-s', sc?.summary || '', 'خلاصهٔ بخش', 2)}</div>
      ${sc ? '' : K.chk('sc-h', false, 'فعلاً از دانش‌آموزان پنهان باشد')}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      K.wire(root);
      root.querySelector('#save').onclick = () => {
        const t = K.v(root, 'sc-t'); if (!t) return UI.invalid('#sc-t', `نام ${kind} را بنویسید.`);
        if (sc) Object.assign(sc, { title: t, summary: K.readRich(root, 'sc-s') });
        else { const n = { id: D.uid('cs'), title: t, summary: K.readRich(root, 'sc-s'), hidden: K.on(root, 'sc-h'), parent: parent || null }, secs = C().secs;
          if (parent) { let i = secs.findIndex(k => k.id === parent); while (secs[i + 1]?.parent === parent) i++; secs.splice(i + 1, 0, n); } else secs.push(n); }
        done('ذخیره شد.');
      };
    });
  }
  // Moves a section among its siblings («عمومی» stays first); sub-sections stay right after their parent.
  function secMove(id, dir) {
    const secs = C().secs, sc = secs.find(k => k.id === id), sib = secs.filter(k => (k.parent || null) === (sc.parent || null) && k.id !== 'gen');
    const j = sib.indexOf(sc) + dir; if (j < 0 || j >= sib.length) return;
    const a = secs.indexOf(sc), b = secs.indexOf(sib[j]); [secs[a], secs[b]] = [secs[b], secs[a]];
    const order = secs.filter(k => !k.parent).flatMap(k => [k, ...secs.filter(x => x.parent === k.id)]); secs.splice(0, secs.length, ...order);
    save(); render();
  }
  const dup = it => { const c = JSON.parse(JSON.stringify(it)); Object.assign(c, { id: D.uid('ci'), title: `${it.title} (نسخهٔ دوم)`, created: K.now(), subs: {}, marks: {}, resp: {}, att: {}, views: {}, done: {}, vis: 'hide', revealed: false }); return c; };
  function moveModal(ids) {
    modal(`<h2>انتقال به بخش دیگر</h2><label class="field"><span>بخش مقصد</span>${K.sel('mv-s', secOpts(), '')}</label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">انتقال</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const to = K.v(root, 'mv-s'), its = items(), moving = its.filter(i => ids.includes(i.id)), rest = its.filter(i => !ids.includes(i.id));
        moving.forEach(i => { i.sec = to; }); let at = -1; rest.forEach((i, k) => { if ((i.sec || 'gen') === to) at = k; });
        rest.splice(at + 1, 0, ...moving); its.splice(0, its.length, ...rest); state.picked.clear(); done(`${fa(moving.length)} مورد منتقل شد.`);
      };
    });
  }
  function bind() {
    const as = document.getElementById('cr-as'); if (as) as.onchange = () => { state.as = as.value; state.edit = false; Q.leave(); render(); };
    const gb = document.getElementById('cr-gbc'); if (gb) gb.onchange = () => { state.gbCls = gb.value; render(); };
    document.querySelectorAll('[data-bk]').forEach(cb => cb.onchange = () => { if (cb.checked) state.picked.add(cb.dataset.bk); else state.picked.delete(cb.dataset.bk); render(); });
    const gp = document.getElementById('cr-grp'); if (gp) gp.onchange = () => { state.grp = gp.value; render(); };
    const view = document.querySelector('.rt-ed') && document.getElementById('view'); if (view && !view.dataset.crw) { view.dataset.crw = '1'; K.wire(view); }
    document.querySelectorAll('[data-ws]').forEach(inp => inp.onchange = () => {
      const it = find(inp.dataset.ws), f = inp.files[0]; if (!f) return;
      f.text().then(t => {
        const rows = parseCsv(t.replace(/^﻿/, '')).slice(1); let n = 0;
        rows.forEach(r => { const [sid, , , score, , fb] = r; if (!student(sid) || score === undefined) return; const sc = score.trim() === '' ? null : K.num(score);
          if (sc != null && !(sc >= 0 && sc <= it.grade.max)) return;
          it.marks = it.marks || {}; it.marks[sid] = { ...(it.marks[sid] || {}), score: sc, fb: fb ? K.clean(UI.esc(fb)) : it.marks[sid]?.fb || '', by: me(), at: K.now(), wfOn: it.grade.workflow, wf: it.grade.workflow ? it.marks[sid]?.wf || 'inmarking' : 'released' }; n++; });
        sync(it); save(); render(); toast(`${fa(n)} نمره از کاربرگ وارد شد.`);
      });
    });
    Q.bind();
  }
  // One student's assignments and quizzes in every subject, for the student's and the parent's pages:
  // [{ it, sub, at (due or close), done, grade: { text, pct } | null, sent }], soonest first.
  function workOf(s) {
    const keep = state.sub, out = [];
    Object.keys(d().classroom || {}).forEach(sub => {
      state.sub = sub; const c = C();
      c.items.filter(it => ['assign', 'quiz'].includes(it.type) && listedFor(it, s) && !secHidden(c.secs.find(k => k.id === (it.sec || 'gen')) || {})).forEach(it => {
        const at = it.type === 'assign' ? it.due : it.close, sb = it.type === 'assign' ? subOf(it, s.id) : null, g = gradeOf(it, s.id);
        out.push({ it, sub, at: at || '', grade: g, sent: sb?.status === 'submitted', done: !!g || sb?.status === 'submitted' || (it.type === 'quiz' && Q.finished(it, s.id).length > 0) || completed(it, s.id) === true });
      });
    });
    state.sub = keep;
    return out.sort((a, b) => (a.at || '9').localeCompare(b.at || '9'));
  }
  // Opens one item of a subject in the student's view (from the student's home page).
  const openItem = (sub, id) => { state.sub = sub; state.item = id; state.tab = 'course'; };
  return { viewOf: { online: 'online' }, pages: { online }, act, bind, feed, workOf, openItem };
};

// The course of one subject, made on first use. Older data moves in once: each subject's online-class link and assignments
// (x.online) and the teacher's homework list (x.assignments) become assignment items of the «عمومی» section.
Classroom.course = (x, sub) => {
  Classroom.migrate(x);
  x.classroom = x.classroom || {};
  const c = (x.classroom[sub] = x.classroom[sub] || { link: '', secs: [{ id: 'gen', title: 'عمومی' }], items: [], groups: [] });
  c.set = c.set || { summary: '', showGrades: true, showDates: true, showCond: true };
  return c;
};

Classroom.peek = (x, sub) => { Classroom.migrate(x); return x.classroom?.[sub] || { link: '', secs: [], items: [], groups: [] }; };
Classroom.migrate = x => {
  if (x.cr1) return;
  x.classroom = x.classroom || {};
  const course = sub => (x.classroom[sub] = x.classroom[sub] || { link: '', secs: [{ id: 'gen', title: 'عمومی' }], items: [], groups: [] });
  const assign = (id, title, desc, cls, due, files, created) => ({ id, type: 'assign', title, sec: 'gen', desc: desc ? `<p>${UI.esc(desc)}</p>` : '', showDesc: true, cls: cls || '', vis: 'show', idnum: '', lang: '', gmode: 'none',
    restrict: { op: 'all', list: [] }, comp: { mode: 'auto', submit: true }, tags: [], views: {}, done: {}, activity: '', files, filesOnSubmit: false, allowFrom: null, due: due ? due + 'T23:59' : null, cutoff: null, gradeBy: null, alwaysDesc: true,
    st: { text: false, words: 0, file: true, maxFiles: 1, maxKB: 500, types: '' }, fb: { comments: true, offline: false, files: false, inline: false }, submitBtn: false, statement: false, attempts: 1, reopen: 'none',
    group: false, groupReq: false, groupAll: false, notify: { graders: false, late: false, students: true },
    grade: { type: 'point', max: 20, scale: 'desc4', method: 'simple', criteria: [], cat: 'hw', pass: '', blind: false, hideGrader: false, workflow: false }, subs: {}, marks: {}, created: (created || '') + 'T08:00' });
  Object.entries(x.online || {}).forEach(([sub, o]) => {
    const c = course(sub); if (o.link) c.link = o.link;
    (o.items || []).forEach(i => { const a = assign(i.id, i.title, i.desc, '', i.due, i.file ? [i.file] : [], i.created);
      Object.entries(i.subs || {}).forEach(([sid, s]) => { a.subs[sid] = { status: 'submitted', at: s.at, text: '', files: s.file ? [s.file] : [], att: 1, acc: { [sid]: true } }; });
      c.items.push(a); });
  });
  (x.assignments || []).forEach(h => course(h.subject).items.push(assign(h.id, h.title, h.desc, h.cls, h.due, [], h.due)));
  x.assignments = []; delete x.online;
  x.cr1 = true;
  SchoolData.save();
};
// Everything due in the class pages, for the homework calendar of «ثبت مطالعه».
Classroom.dues = x => {
  Classroom.migrate(x);
  const out = [];
  Object.entries(x.classroom || {}).forEach(([sub, c]) => c.items.forEach(i => {
    if (i.vis === 'hide') return;
    const at = i.type === 'assign' ? i.due : i.type === 'quiz' ? i.close : null;
    if (at) out.push({ id: i.id, date: at.slice(0, 10), cls: i.cls || null, subject: sub, title: `${i.type === 'quiz' ? 'آزمون: ' : ''}${i.title}`, src: 'online' });
  }));
  return out;
};
