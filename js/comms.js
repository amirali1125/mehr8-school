// Communications, one page laid out like a work desk (#/comms/<tab>): a menu with the colleagues under it on one side,
// the open section in the middle, and on the desk the person's own card on the other side.
//   desk     میزکار: today's, late and followed-up tasks, colleagues to hand a task to, «کارهای من» and «پیگیری از دیگران»
//   notes    personal notes only the writer sees
//   letters  inbox, sent and new letter (subject, recipients, body with speech-to-text, reply)
//   notices  announcements to groups (principal, counsellors, teachers, students...); unread ones also show on the counsellor's overview
//   council  school council: a task given to someone, with description and due date; ticking it done tells the person who gave it
//   chat     group chat; by default «متوسطه اول» (principal + counsellors 7–9) and «متوسطه دوم» (principal + counsellors 10–12);
//            the principal makes new groups and changes members
// Everything lives in the school's org data, so every grade and role sees the same letters and groups.
// A person is a role id; a counsellor is 'counselor:<grade>' because each grade has its own.
const Comms = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { org, save, render, empty } = ctx;
  const today = J.todayIso();
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const now = () => { const t = new Date(); return J.todayIso() + 'T' + t.toTimeString().slice(0, 8); };
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const when = at => at ? `${J.format(at.slice(0, 10))}${at.length > 10 ? ' · ' + digits(at.slice(11, 16)) : ''}` : '';
  const TABS = [['desk', 'میزکار', 'home'], ['chat', 'گفتگو', 'chat'], ['council', 'کارها و پیگیری‌ها', 'check'], ['letters', 'نامه‌ها', 'mail'], ['notices', 'اطلاعیه‌ها', 'bell'], ['notes', 'یادداشت‌های من', 'layers']];
  const state = { box: 'in', open: '', group: '', cTab: 'mine' };

  /* ---------------- people ---------------- */
  const grades = () => D.gradesOf(ctx.school());
  function people() {
    return [['principal', 'مدیر مدرسه'], ['deputy', 'معاون آموزشی'], ['exec', 'معاون اجرایی'], ['nazem', 'ناظم'], ['finance', 'واحد مالی'],
      ...grades().map(g => [`counselor:${g}`, `معلم راهنمای پایهٔ ${D.GRADE_NAME[g]}`]), ['teacher', 'معلم ریاضی']];
  }
  const nameOf = id => (people().find(p => p[0] === id) || [id, id])[1];
  // A colleague's own name, with their salutation, where the school has a user for the role (e.g. «جناب آقای مؤمنی»), else the role.
  function personOf(id) {
    const [r, g] = id.split(':'), us = Auth.users(ctx.school().id).filter(u => u.active !== false && !u.owner);
    const u = r === 'counselor' ? us.find(x => x.roles.includes('counselor') && +x.grade === +g) : us.find(x => x.roles[0] === r) || us.find(x => x.roles.includes(r));
    const name = u?.name && u.name !== nameOf(id) ? (u.salute ? u.salute + ' ' : '') + u.name : (r === 'counselor' && D.guideOf(ctx.school().id, +g)) || '';
    return { name: name || nameOf(id), role: name ? nameOf(id) : '' };
  }
  // A colleague's photo from the teachers' résumé slides (js/site-staff.js), matched by surname; where two share it
  // (کبریایی, اسماعیلی), a guidance teacher is the one whose résumé names their grade, anyone else the one in management.
  const fold = t => t.replace(/ؤ/g, 'و').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, '').trim();
  function photoOf(id) {
    const staff = window.SITE_STAFF?.people; if (!staff) return '';
    const n = fold(personOf(id).name.replace(/^(جناب آقای|سرکار خانم)\s+/, '')), [r, g] = id.split(':');
    const hits = staff.filter(p => { const f = fold(p.n); return f === n || f.split(/\s+/).pop() === n; });
    const p = (r === 'counselor' && hits.find(h => h.r.includes(`پایهٔ ${D.GRADE_NAME[g]}`))) || hits.find(h => h.g.includes('lead')) || hits[0];
    return p ? `assets/site/staff/p${String(p.p).padStart(3, '0')}-a.jpg` : '';
  }
  const avatar = (id, cls = '') => { const n = personOf(id).name.replace(/^(جناب آقای|سرکار خانم)\s+/, ''), w = n.split(/\s+/).filter(Boolean);
    const tone = ['teal', 'violet', 'blue', 'amber', 'rose'][[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 5], ph = photoOf(id);
    if (ph) return `<img class="mz-av ${cls}" src="${ph}" alt="" loading="lazy">`;
    return `<span class="mz-av tone-${tone} ${cls}" aria-hidden="true">${esc(w.length > 1 ? w[0][0] + ' ' + w[w.length - 1][0] : (w[0] || '؟').slice(0, 2))}</span>`; };
  const me = () => ctx.actor() === 'counselor' ? `counselor:${ctx.grade()}` : ctx.actor();
  const groupOf = id => id.split(':')[0];
  const isBoss = () => me() === 'principal';
  // Announcement audiences; a person reads those sent to their group.
  const AUD = { principal: 'مدیر', deputy: 'معاونان', counselor: 'معلمان راهنما', teacher: 'معلمان', student: 'دانش‌آموزان', parent: 'اولیا', finance: 'واحد مالی' };
  const audOf = id => ({ exec: 'deputy', cultural: 'deputy' }[groupOf(id)] || groupOf(id));
  // Announcement recipients are keys: a whole group ('deputy', 'teacher', 'counselor') or one part of it
  // ('dep:exec', 'teacher:9', 'tch:ریاضی@9', 'counselor:9'). These are the keys that reach the signed-in person.
  function myKeys() {
    const m = me(), g = groupOf(m);
    if (g === 'counselor') return ['counselor', m];
    if (g === 'teacher') { const tg = D.teacherGrade(ctx.school()); return ['teacher', `teacher:${tg}`, `tch:${D.TEACHER_SUBJECT}@${tg}`]; }
    if (['deputy', 'exec', 'cultural'].includes(m)) return ['deputy', 'dep:' + m];
    return [m];
  }
  const forMe = n => n.to.some(k => myKeys().includes(k));
  // Subjects taught in a grade, from its class timetables.
  const subjectsOf = g => { const x = D.get(ctx.school().id, g); return [...new Set(x.classes.flatMap(c => x.timetable[c.id].flat()).filter(Boolean))]; };
  function keyLabel(k) {
    const [a, b] = k.split(':');
    if (k.startsWith('tch:')) { const [su, g] = k.slice(4).split('@'); return `معلم ${su} پایهٔ ${D.GRADE_NAME[g]}`; }
    if (a === 'dep') return nameOf(b);
    if (a === 'teacher' && b) return `معلمان پایهٔ ${D.GRADE_NAME[b]}`;
    if (a === 'counselor' && b) return nameOf(k);
    if ((a === 'student' || a === 'parent') && b) return `${AUD[a]} پایهٔ ${D.GRADE_NAME[b]}`;
    return { deputy: 'همهٔ معاونان', teacher: 'همهٔ معلمان', counselor: 'همهٔ معلمان راهنما' }[k] || AUD[k] || nameOf(k);
  }
  const canPublish = () => ['principal', 'deputy', 'exec', 'cultural'].includes(me());

  /* ---------------- data ---------------- */
  function C() {
    const o = org();
    if (!o.comms) o.comms = { letters: [], council: [], groups: [], seen: {} };
    const c = o.comms, gs = grades();
    if (!c.sample1) { c.sample1 = true; seedSample(c); }
    // The math teacher's desk too (demo account «معلم»).
    if (!c.sample2) { c.sample2 = true; const at = n => `${D.shift(n)}T10:20:00`;
      [['principal', 'teacher', 'خودارزیابی آینهٔ تدریس این نیمسال', 'تا پایان آبان در ستون راست ارتباطات.', 6, -2], ['counselor:9', 'teacher', 'کلاس جبرانی ریاضی گروه ضعیف نهم', 'فهرست هشت نفر در پیام بعدی.', 2, -1],
       ['deputy', 'teacher', 'ثبت نمره‌های کوییز دوم ریاضی', '', -1, -4], ['teacher', 'counselor:9', 'گزارش افت ریاضی سه دانش‌آموز نهم ب', '', 3, -1]].forEach(([from, to, title, desc, d, a]) =>
        c.council.push({ id: D.uid('k'), from, to, title, desc, due: D.shift(d), at: at(a), done: false, doneAt: '', doneSeen: false, seenBy: false, sample: true })); }
    // Two parents' meeting requests waiting for an answer, for a sales demonstration (7 Aban 1405), once.
    if (!o.meetReqDemo) { o.meetReqDemo = true; o.meetReq = o.meetReq || [];
      [['principal', 9, 0, 'وضعیت درسی', 'نمره‌های ریاضی این ماه پایین آمده؛ می‌خواهیم بدانیم چه کنیم.'], ['counselor:9', 9, 5, 'برنامه‌ریزی و مطالعه', ''],
       ['nazem', 8, 3, 'حضور و غیاب', 'دربارهٔ تأخیرهای صبح و سرویس مدرسه.'], ['deputy', 10, 1, 'انتخاب رشته', '']].forEach(([to, g, i, topic, text], n) => {
        const st = D.get(ctx.school().id, g).students[i]; if (st) o.meetReq.push({ id: D.uid('mr'), grade: g, sid: st.id, to, topic, text, at: new Date(Date.now() - (n + 1) * 5e6).toISOString(), status: 'new', date: '', time: '', reply: '', demo: true }); }); }
    [['stage1', 'متوسطه اول', [7, 8, 9]], ['stage2', 'متوسطه دوم', [10, 11, 12]]].forEach(([id, name, range]) => {
      const mine = gs.filter(g => range.includes(g));
      if (mine.length && !c.groups.some(g => g.id === id)) c.groups.push({ id, name, fixed: true, members: ['principal', ...mine.map(g => `counselor:${g}`)], msgs: [] });
    });
    return c;
  }
  // Sample tasks and letters between the staff for a sales demonstration (7 Aban 1405), once per school, so every
  // role's میزکار has its own work, late work and follow-ups. Each is sample: true.
  function seedSample(c) {
    const at = (n, h = 9) => `${D.shift(n)}T${String(h).padStart(2, '0')}:15:00`, due = n => D.shift(n);
    const T = [
      ['principal', 'deputy', 'تنظیم برنامهٔ آزمون‌های میان‌نوبت', 'برنامهٔ همهٔ پایه‌ها تا آخر هفته در تقویم بیاید.', 2, -3, false],
      ['principal', 'nazem', 'گزارش غیبت‌های تکراری این ماه', 'دانش‌آموزانی که بیش از سه غیبت دارند، با علت.', -1, -6, false],
      ['principal', 'exec', 'تعمیر پروژکتور کلاس نهم الف', '', 0, -2, false],
      ['principal', 'counselor:9', 'جمع‌بندی پروفایل استعدادسنجی نهم', 'خروجی برای جلسهٔ اولیا آماده شود.', 3, -4, false],
      ['principal', 'counselor:7', 'برنامهٔ جلسه با اولیای هفتم', '', 5, -1, false],
      ['principal', 'finance', 'فهرست شهریه‌های معوق', '', -2, -8, false],
      ['deputy', 'principal', 'تأیید ضریب‌های کارنامهٔ نوبت اول', 'ضریب‌ها در بخش کارنامه ثبت شده‌اند.', 1, -2, false],
      ['deputy', 'counselor:8', 'ثبت نمره‌های پرسش کلاسی هشتم', '', -1, -5, false],
      ['nazem', 'principal', 'تأیید برنامهٔ زنگ‌های هفتهٔ امتحان', '', 0, -1, false],
      ['nazem', 'counselor:9', 'پیگیری تأخیرهای مکرر دو دانش‌آموز نهم', 'نام‌ها در حضور و غیاب علامت خورده.', 2, -1, false],
      ['counselor:9', 'principal', 'دعوت از اولیای سه دانش‌آموز برای جلسه', '', 4, -2, false],
      ['counselor:9', 'nazem', 'گزارش رفتاری زنگ تفریح پایهٔ نهم', '', 1, -3, false],
      ['counselor:9', 'deputy', 'کلاس جبرانی ریاضی برای گروه ضعیف', 'هشت نفر از نهم الف و ب.', 6, -2, false],
      ['counselor:8', 'principal', 'هماهنگی اردوی علمی هشتم', '', 7, -3, false],
      ['counselor:10', 'counselor:9', 'تبادل تجربهٔ جلسهٔ انتخاب رشته', '', 3, -1, false],
      ['principal', 'counselor:9', 'گزارش جلسه‌های مشاورهٔ مهر', '', -5, -12, true],
      ['principal', 'deputy', 'به‌روزرسانی فهرست کلاس‌ها', '', -4, -10, true],
    ];
    T.forEach(([from, to, title, desc, d, a, done]) => c.council.push({ id: D.uid('k'), from, to, title, desc, due: due(d), at: at(a), done, doneAt: done ? at(d, 13) : '', doneSeen: done, seenBy: a < -2, sample: true }));
    const L = [
      ['principal', ['counselor:7', 'counselor:8', 'counselor:9', 'counselor:10', 'counselor:11'], 'جلسهٔ هماهنگی معلمان راهنما', 'جلسهٔ هماهنگی این ماه، سه‌شنبه زنگ پنجم در دفتر مدیر برگزار می‌شود. لطفاً گزارش کوتاه پایهٔ خود را بیاورید.', -3],
      ['deputy', ['principal'], 'گزارش پیشرفت ثبت نمره‌ها', 'تا امروز بیشتر نمره‌های پرسش کلاسی و کوییز ثبت شده‌اند. چند درس هنوز ناقص است.', -2],
      ['nazem', ['principal', 'deputy'], 'وضعیت حضور و غیاب هفته', 'میانگین حضور این هفته بالای ۹۵٪ بوده است. دو کلاس تأخیر بیشتری داشته‌اند.', -1],
      ['counselor:9', ['principal'], 'خروجی پروفایل استعدادسنجی نهم', 'پروفایل‌ها آماده شده و فردا تحویل داده می‌شود.', 0],
      ['exec', ['principal'], 'منوی غذای ماه آینده', 'منوی پیشنهادی در بخش تغذیه بارگذاری شد.', -4],
    ];
    L.forEach(([from, to, subject, body, a]) => c.letters.push({ id: D.uid('lt'), from, to, subject, body, at: at(a, 11), read: a < -2 ? [...to] : [], re: null, sample: true }));
  }
  const myGroups = () => C().groups.filter(g => g.members.includes(me()));
  const seenAt = gid => C().seen[me()]?.[gid] || '';
  const unreadIn = g => g.msgs.filter(m => m.from !== me() && m.at > seenAt(g.id)).length;
  const myNotices = () => org().notices.filter(n => n.by === me() || isBoss() || forMe(n));
  // Older notices recorded the reader as a bare role ('counselor'), so that still counts as read.
  const noticeUnread = n => n.by !== me() && !n.read.includes(me()) && !n.read.includes(groupOf(me())) && forMe(n);
  const counts = () => {
    const c = C(), m = me();
    return {
      letters: c.letters.filter(l => l.to.includes(m) && !l.read.includes(m)).length,
      notices: org().notices.filter(noticeUnread).length,
      council: c.council.filter(t => (t.to === m && !t.seenBy) || (t.from === m && t.done && !t.doneSeen)).length,
      chat: myGroups().reduce((a, g) => a + unreadIn(g), 0),
    };
  };
  const unread = () => { const n = counts(); return n.letters + n.council + n.chat + (org().meetReq || []).filter(r => r.to === me() && r.status === 'new').length; };

  /* ---------------- page ---------------- */
  const MOD = { desk: 'plat.workflow', letters: 'comm.letters', notices: 'core.notices', council: 'plat.workflow', chat: 'comm.messenger' };
  // The principal also approves colleagues' calendar events here.
  const tabsFor = () => me() === 'principal' ? [...TABS, ['events', 'تأیید رویدادها', 'calendar']] : TABS;
  function page(tab, lockedHtml = () => '') {
    const TB = tabsFor(), t = TB.some(x => x[0] === tab) ? tab : 'desk', n = { ...counts(), desk: 0, events: ctx.pendingEvents ? ctx.pendingEvents().length : 0 };
    const nav = `<nav class="mz-nav" aria-label="بخش‌های ارتباطات">${TB.map(([id, l, ic]) => `<a href="#/comms/${id}" class="${id === t ? 'on' : ''}" ${id === t ? 'aria-current="page"' : ''}>${Shell.icon(ic)}<span>${l}</span>${n[id] ? `<span class="badge">${fa(n[id])}</span>` : ''}</a>`).join('')}</nav>`;
    const mates = `<section class="mz-mates mz-panel" aria-label="همکارانم"><h2 class="mz-ph">همکارانم</h2><ul>${people().filter(p => p[0] !== me()).map(([id]) => { const p = personOf(id), last = lastWith(id);
      return `<li><button type="button" data-act="lt-to" data-to="${id}" aria-label="نامه به ${esc(p.name)}">${avatar(id)}<span><b>${esc(p.name)}</b><span class="muted small">${esc(last || p.role || '')}</span></span></button></li>`; }).join('')}</ul></section>`;
    const body = t === 'events' ? (lockedHtml('core.calendar') || ctx.eventApprovals()) : (MOD[t] && lockedHtml(MOD[t])) || { desk, letters, notices, council, chat, notes }[t]();
    return `<div class="mz ${t === 'desk' ? 'mz-desk' : ''}"><aside class="mz-side" aria-label="بخش‌ها و همکاران">${nav}${me() === 'teacher' && ctx.teSide ? ctx.teSide() : ''}${mates}${phones()}</aside><div class="mz-main">${body}</div>${t === 'desk' ? `<aside class="mz-left" aria-label="کارت من و یادداشت‌ها">${meCard()}${pinned()}</aside>` : ''}</div>`;
  }
  // Students' phone numbers, for calling home about an absence: the whole school for the principal, the deputies and
  // the ناظم, a guidance teacher's own grade. Today's absentees come first, marked; each line also shows the
  // student's absences in the last 30 days. The search box filters by name or class without re-rendering.
  const PHONE_ROLES = ['principal', 'deputy', 'exec', 'nazem'];
  function phoneList() {
    const m = me(), [r, g] = m.split(':'), gs = r === 'counselor' ? [g] : PHONE_ROLES.includes(r) ? grades() : [];
    const cut = D.shift(-30, today), out = [];
    gs.forEach(gr => { const x = D.get(ctx.school().id, gr), cn = Object.fromEntries(x.classes.map(c => [c.id, c.name]));
      x.students.forEach(s => { if (!s.phone) return;
        const now = x.attendance[s.cls + '|' + today]?.[s.id], abs = Object.entries(x.attendance).filter(([k, rec]) => k.startsWith(s.cls + '|') && k.slice(-10) >= cut && rec[s.id] === 'a').length;
        out.push({ name: s.name, cls: cn[s.cls] || '', phone: s.phone, now: now === 'a' ? 'غایب امروز' : now === 'l' ? 'تأخیر امروز' : '', abs }); }); });
    return out.sort((a, b) => (!!b.now - !!a.now) || b.abs - a.abs || a.name.localeCompare(b.name, 'fa'));
  }
  function phones() {
    const list = phoneList(); if (!list.length) return '';
    const tel = p => p.replace(/\D/g, ''), absent = list.filter(p => p.now).length;
    return `<section class="mz-panel mz-phones" aria-label="تلفن دانش‌آموزان"><h2 class="mz-ph"><span>تلفن دانش‌آموزان</span>${absent ? `<span class="mz-cnt num" title="غایب یا با تأخیر امروز">${fa(absent)}</span>` : ''}</h2>
      <label class="mz-ps"><span class="sr-only">جستجوی نام یا کلاس</span><input type="search" id="ph-q" placeholder="جستجوی نام یا کلاس" autocomplete="off"></label>
      <ul class="mz-scroll" id="ph-list">${list.map(p => `<li data-k="${esc(p.name + ' ' + p.cls)}"><span class="mz-pn"><b>${esc(p.name)}</b><span class="muted small">${esc(p.cls)}${p.abs ? ` · ${fa(p.abs)} غیبت در ۳۰ روز` : ''}</span>${p.now ? `<span class="mz-pnow">${p.now}</span>` : ''}</span>
        <a class="mz-tel num" href="tel:${tel(p.phone)}" dir="ltr" aria-label="تماس با خانهٔ ${esc(p.name)}، ${esc(digits(p.phone))}">${esc(digits(p.phone))}</a></li>`).join('')}</ul>
      <p class="mz-empty" id="ph-none" hidden>کسی با این نام پیدا نشد</p></section>`;
  }
  // The latest thing between me and a colleague: a letter or a task, as a short line.
  function lastWith(id) {
    const c = C(), m = me(), xs = [...c.letters.filter(l => (l.from === m && l.to.includes(id)) || (l.from === id && l.to.includes(m))).map(l => [l.at, l.subject]),
      ...c.council.filter(k => (k.from === m && k.to === id) || (k.from === id && k.to === m)).map(k => [k.at, k.title])].sort((a, b) => b[0].localeCompare(a[0]));
    return xs[0]?.[1] || '';
  }

  /* parents' meeting requests (asked from the parent's «جلسه‌ها با مدرسه», family.js) */
  const myReqs = () => (org().meetReq || []).filter(r => r.to === me() && r.status === 'new').sort((a, b) => a.at.localeCompare(b.at));
  const reqStudent = r => D.get(ctx.school().id, r.grade).students.find(s => s.id === r.sid);
  function requests() {
    const list = myReqs(); if (!list.length) return '';
    return `<section class="mz-panel mz-req" aria-label="درخواست جلسه از اولیا"><h2 class="mz-ph"><span>درخواست جلسه از اولیا</span><span class="mz-cnt num">${fa(list.length)}</span></h2>
      <ul class="mz-scroll">${list.map(r => { const s = reqStudent(r);
        return `<li><span class="mz-rq"><span class="mr-top"><b>ولی ${esc(s?.name || 'دانش‌آموز')} <span class="muted small">· پایهٔ ${esc(D.GRADE_NAME[r.grade])}</span></b>
          <button type="button" class="mr-more" data-act="mr-more" aria-expanded="false" aria-label="متن درخواست"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></span>
          <span class="mr-body"><span class="small">${esc(r.topic)}${r.text ? ` — ${esc(r.text)}` : ''}</span></span></span>
          <span class="mz-rq-b"><button type="button" class="btn sm primary" data-act="mr-set" data-id="${r.id}">تعیین وقت</button><button type="button" class="btn sm" data-act="mr-no" data-id="${r.id}">پاسخ</button></span></li>`; }).join('')}</ul></section>`;
  }
  // The same requests as a card for the person's own home page (school-app.js).
  function reqCard() {
    const list = myReqs(); if (!list.length) return '';
    return `<section class="card mr-card" aria-label="درخواست جلسه از اولیا"><div class="card-head"><h2>درخواست جلسه از اولیا <span class="pill num">${fa(list.length)}</span></h2><a class="small" href="#/comms">میزکار ارتباطات</a></div>
      <ul class="mr-list">${list.map(r => { const s = reqStudent(r);
        return `<li><span class="mz-rq"><span class="mr-top"><b>ولی ${esc(s?.name || 'دانش‌آموز')} <span class="muted small">· پایهٔ ${esc(D.GRADE_NAME[r.grade])} · ${esc(when(r.at.slice(0, 10)))}</span></b>
          <button type="button" class="mr-more" data-act="mr-more" aria-expanded="false" aria-label="متن درخواست"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></span>
          <span class="mr-body"><span class="small">${esc(r.topic)}${r.text ? ` — ${esc(r.text)}` : ''}</span></span></span>
          <span class="mz-rq-b"><button type="button" class="btn sm primary" data-act="mr-set" data-id="${r.id}">تعیین وقت</button><button type="button" class="btn sm" data-act="mr-no" data-id="${r.id}">پاسخ</button></span></li>`; }).join('')}</ul></section>`;
  }
  function answerReq(id, give) {
    const r = (org().meetReq || []).find(x => x.id === id), s = reqStudent(r);
    modal(`<h2>${give ? 'تعیین وقت جلسه' : 'پاسخ به درخواست'}</h2><p class="muted" style="margin-top:-6px">ولی ${esc(s?.name || '')} · ${esc(r.topic)}</p>
      ${give ? `<div class="grid g2" style="gap:0 12px"><div class="field"><span>روز</span>${J.field('mr-d', D.shift(1, today))}</div>
        <label class="field"><span>ساعت</span><input class="input" type="time" id="mr-h" value="10:00"></label></div>` : ''}
      <label class="field"><span>${give ? 'پیام به خانواده' : 'پاسخ'}</span><textarea class="input" id="mr-r" rows="3">${give ? '' : 'موضوع را تلفنی پیگیری کردم؛ نیازی به جلسه نیست.'}</textarea></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="mr-ok">${give ? 'ثبت و خبر به خانواده' : 'فرستادن پاسخ'}</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#mr-ok').onclick = () => {
        if (give) { const d = v(root, '#mr-d'); if (!d) return UI.invalid('#mr-d', 'روز جلسه را انتخاب کنید.');
          Object.assign(r, { status: 'set', date: d, time: v(root, '#mr-h') }); }
        else r.status = 'no';
        r.reply = v(root, '#mr-r'); r.answeredBy = me();
        done(give ? 'وقت جلسه ثبت شد و خانواده در صفحهٔ «جلسه‌ها با مدرسه» آن را می‌بیند.' : 'پاسخ برای خانواده فرستاده شد.');
      };
    });
  }

  /* desk */
  const myTasks = () => C().council.filter(k => k.to === me());
  const followUps = () => C().council.filter(k => k.from === me() && !k.done);
  function meCard() {
    const u = Auth.user() || {}, h = new Date().getHours(), p = personOf(me());
    const hello = h < 11 ? 'صبح بخیر' : h < 15 ? 'ظهر بخیر' : h < 19 ? 'عصر بخیر' : 'شب بخیر';
    return `<section class="mz-me mz-panel" aria-label="من">${avatar(me(), 'big')}<b>${esc(u.owner ? 'مالک سامانه' : [u.salute, u.name].filter(Boolean).join(' ') || p.name)}</b>
      <span class="muted small">${esc(p.role || nameOf(me()))}</span><span class="mz-hello">${hello}؛ ${esc(UI.weekday(today))} ${esc(J.format(today, false))}</span></section>`;
  }
  // My notes beside the desk, pinned first; a note opens for editing.
  function pinned() {
    const list = myNotes().slice().sort((a, b) => (b.pin - a.pin) || b.at.localeCompare(a.at));
    return `<section class="mz-panel mz-pins" aria-label="یادداشت‌های من"><h2 class="mz-ph"><span>یادداشت‌های من</span><button type="button" class="mz-ph-btn" data-act="mn-new" aria-label="یادداشت تازه">+</button></h2>
      ${list.length ? `<ul class="mz-scroll">${list.map(n => `<li><button type="button" data-act="mn-edit" data-id="${n.id}" aria-label="ویرایش یادداشت">${n.pin ? '<span class="mz-pin" aria-label="سنجاق‌شده"></span>' : ''}<span class="mz-pt">${esc(n.text)}</span><span class="muted small">${esc(when(n.at))}</span></button></li>`).join('')}</ul>`
        : '<p class="mz-empty">یادداشتی ندارید</p>'}</section>`;
  }
  function desk() {
    const mine = myTasks().filter(k => !k.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')), fol = followUps().sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    const todayN = mine.filter(k => k.due === today).length, late = mine.filter(k => k.due && k.due < today).length;
    const tile = (ic, tone, label, n) => `<div class="mz-tile tone-${tone}"><span class="mz-ic">${Shell.icon(ic)}</span><b>${label}</b><span class="mz-n num ${n ? '' : 'zero'}">${n ? fa(n) : 'هیچ'}</span></div>`;
    const col = (cls, label, list, given, none) => `<section class="mz-col mz-panel ${cls}" aria-label="${label}"><h3 class="mz-ph"><span>${label}</span>${list.length ? `<span class="mz-cnt num">${fa(list.length)}</span>` : ''}</h3>
      ${list.length ? `<ul class="mz-scroll">${list.map(k => row(k, given)).join('')}</ul>` : `<p class="mz-empty">${none}</p>`}</section>`;
    const dueTxt = k => k.due ? `<span class="${!k.done && k.due < today ? 'mz-late' : 'muted'} small">${k.due === today ? 'امروز' : esc(J.format(k.due, false))}</span>` : '';
    const row = (k, given) => `<li class="${k.due && k.due < today ? 'late' : ''}"><label class="mz-chk">${given ? '' : `<input type="checkbox" data-task="${k.id}" aria-label="انجام شد: ${esc(k.title)}">`}<span><b>${esc(k.title)}</b>${k.desc ? `<span class="muted small mz-desc">${esc(k.desc)}</span>` : ''}</span></label>
      <span class="mz-meta">${dueTxt(k)}${avatar(given ? k.to : k.from, 'sm')}<span class="sr-only">${given ? 'مسئول' : 'از'}: ${esc(personOf(given ? k.to : k.from).name)}</span></span></li>`;
    return `<div class="mz-head"><h2>میزکار «${esc(ctx.school().name.replace(/^مجتمع آموزشی\s*/, ''))}»</h2><div class="mz-acts"><button class="btn sm" data-act="lt-new">+ نامه</button><button class="btn sm primary" data-act="ct-new">+ کار تازه</button></div></div>
      <div class="mz-tiles">${tile('check', 'teal', 'کارهای امروز', todayN)}${tile('calendar', 'rose', 'دارای تأخیر', late)}${tile('bell', 'blue', 'در پیگیری', fol.length)}</div>
      <div class="mz-mates-row"><b>همکاران من</b>${people().filter(p => p[0] !== me() && !['finance', 'teacher', 'counselor:12'].includes(p[0])).map(([id]) => `<button type="button" class="mz-mate" data-act="ct-new" data-to="${id}" aria-label="کار تازه برای ${esc(personOf(id).name)}" title="کار تازه برای ${esc(personOf(id).name)}">${avatar(id)}</button>`).join('')}</div>
      ${requests()}
      <div class="mz-cols">${col('mine', 'کارهای من', mine, false, 'کاری برای انجام ندارید')}${col('fol', 'پیگیری از دیگران', fol, true, 'کاری را پیگیری نمی‌کنید')}</div>`;
  }

  /* notes: only the writer sees them */
  const myNotes = () => { const c = C(); c.notes = c.notes || {}; return (c.notes[me()] = c.notes[me()] || []); };
  function notes() {
    const list = myNotes().slice().sort((a, b) => (b.pin - a.pin) || b.at.localeCompare(a.at));
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">فقط خودتان این یادداشت‌ها را می‌بینید.</span><button class="btn primary" data-act="mn-new">+ یادداشت تازه</button></div>
      ${list.length ? `<div class="mz-notes">${list.map(n => `<div class="card mz-note ${n.pin ? 'pin' : ''}"><p>${esc(n.text).replace(/\n/g, '<br>')}</p>
        <div class="spread small"><span class="muted">${esc(when(n.at))}</span><span class="row"><button class="btn sm" data-act="mn-pin" data-id="${n.id}" aria-pressed="${!!n.pin}">${n.pin ? 'برداشتن سنجاق' : 'سنجاق'}</button>
        <button class="btn sm" data-act="mn-edit" data-id="${n.id}">ویرایش</button><button class="btn sm danger" data-act="mn-del" data-id="${n.id}">حذف</button></span></div></div>`).join('')}</div>`
        : `<div class="card">${empty('یادداشتی ندارید.')}</div>`}`;
  }
  function noteModal(n) {
    modal(`<h2>${n ? 'ویرایش یادداشت' : 'یادداشت تازه'}</h2><label class="field"><span>متن</span><textarea class="input" id="nt-x" rows="6">${esc(n?.text || '')}</textarea></label>${Voice.button('nt-x')}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { if (!v(root, '#nt-x')) return UI.invalid('#nt-x', 'چیزی بنویسید.');
        if (n) n.text = v(root, '#nt-x'); else myNotes().push({ id: D.uid('nt'), text: v(root, '#nt-x'), at: now(), pin: false }); done('یادداشت ذخیره شد.'); };
    });
  }

  /* letters */
  function letters() {
    const c = C(), m = me();
    const list = (state.box === 'in' ? c.letters.filter(l => l.to.includes(m)) : c.letters.filter(l => l.from === m)).slice().sort((a, b) => b.at.localeCompare(a.at));
    return `<div class="spread" style="margin-bottom:12px"><div class="seg" role="radiogroup" aria-label="صندوق">
        <button role="radio" aria-checked="${state.box === 'in'}" data-act="lt-box" data-id="in">دریافتی</button><button role="radio" aria-checked="${state.box === 'out'}" data-act="lt-box" data-id="out">ارسالی</button></div>
        <button class="btn primary" data-act="lt-new">+ نامهٔ تازه</button></div>
      ${list.map(l => {
        const unr = state.box === 'in' && !l.read.includes(m), open = state.open === l.id;
        return `<div class="card letter ${unr ? 'unread' : ''}"><button class="letter-head" data-act="lt-open" data-id="${l.id}" aria-expanded="${open}">
            <b>${esc(l.subject)}</b><span class="muted small">${state.box === 'in' ? 'از ' + esc(nameOf(l.from)) : 'به ' + l.to.map(x => esc(nameOf(x))).join('، ')} · ${esc(when(l.at))}</span></button>
          ${open ? `<div class="letter-body"><p>${esc(l.body).replace(/\n/g, '<br>')}</p>
            ${state.box === 'out' ? `<div class="muted small">خوانده‌شده توسط: ${l.read.length ? l.read.map(x => esc(nameOf(x))).join('، ') : 'هنوز کسی'}</div>` : `<button class="btn sm" data-act="lt-reply" data-id="${l.id}">پاسخ</button>`}</div>` : ''}</div>`;
      }).join('') || `<div class="card">${empty(state.box === 'in' ? 'نامه‌ای نرسیده.' : 'نامه‌ای نفرستاده‌اید.')}</div>`}`;
  }
  function letterModal(reply, to) {
    const others = people().filter(p => p[0] !== me());
    modal(`<h2>${reply ? 'پاسخ نامه' : 'نامهٔ تازه'}</h2>
      <label class="field"><span>موضوع</span><input class="input" id="l-s" value="${reply ? esc('پاسخ: ' + reply.subject) : ''}"></label>
      <fieldset class="field" style="border:0;padding:0"><legend class="small muted">گیرندگان</legend><div class="chips">
        ${others.map(([id, n]) => `<label class="chip"><input type="checkbox" value="${id}" ${(reply && reply.from === id) || to === id ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div></fieldset>
      <label class="field"><span>متن نامه</span><textarea class="input" id="l-b" rows="6"></textarea></label>${Voice.button('l-b')}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">فرستادن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const to = [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
        if (!v(root, '#l-s') || !v(root, '#l-b')) return UI.invalid(['#l-s', '#l-b'], 'موضوع و متن نامه را بنویسید.');
        if (!to.length) return UI.invalid(root.querySelector('fieldset'), 'دست‌کم یک گیرنده انتخاب کنید.');
        C().letters.push({ id: D.uid('lt'), from: me(), to, subject: v(root, '#l-s'), body: v(root, '#l-b'), at: now(), read: [], re: reply?.id || null });
        state.box = 'out'; done('نامه فرستاده شد.');
      };
    });
  }

  /* notices */
  function noticeCard(n, compact) {
    const unr = noticeUnread(n);
    return `<div class="card notice ${unr ? 'unread' : ''}"><div class="spread"><h2 style="margin:0">${esc(n.title)}</h2><span class="muted small">${esc(J.format(n.date))}</span></div>
      <p style="margin:8px 0">${esc(n.body)}</p>
      <div class="spread small"><span class="muted">از ${esc(nameOf(n.by))} · برای ${n.to.map(t => esc(keyLabel(t))).join('، ')}${!compact && n.by === me() ? ` · خوانده‌شده: ${fa(n.read.length)}` : ''}</span>
      ${unr ? `<button class="btn sm" data-act="nc-read" data-id="${n.id}">خواندم</button>` : ''}</div></div>`;
  }
  function notices() {
    const list = myNotices().slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="spread" style="margin-bottom:12px"><span class="muted">${fa(list.filter(noticeUnread).length)} خوانده‌نشده</span>
      ${canPublish() ? '<button class="btn primary" data-act="nc-new">+ اطلاعیهٔ تازه</button>' : ''}</div>
      ${list.map(n => noticeCard(n)).join('') || `<div class="card">${empty('اطلاعیه‌ای نیست.')}</div>`}`;
  }
  // Unread announcements, shown above the counsellor's reminders.
  function noticeStrip() {
    if (ctx.readOnly()) return '';
    const list = org().notices.filter(noticeUnread).reverse().sort((a, b) => b.date.localeCompare(a.date));
    return list.length ? `<section aria-label="اطلاعیه‌های تازه" style="margin-bottom:20px"><div class="sec-head"><h2>اطلاعیه‌های تازه</h2><a class="small" href="#/comms/notices">همهٔ اطلاعیه‌ها</a></div>
      ${list.slice(0, 2).map(n => noticeCard(n, true)).join('')}${list.length > 2 ? `<a class="btn sm" href="#/comms/notices">${fa(list.length - 2)} اطلاعیهٔ دیگر</a>` : ''}</section>` : '';
  }
  // Recipients as a tree of the school's people: a group opens into its parts (deputies → each deputy;
  // teachers → grade → each subject teacher; counsellors → each grade). Ticking a group ticks all of it.
  function recipientTree() {
    const gs = grades(), node = (key, label, kids = '') => `<li><div class="rt-row">${kids ? `<button type="button" class="rt-x" aria-expanded="false" aria-label="باز کردن ${esc(label)}">‹</button>` : '<span class="rt-sp"></span>'}
        <label><input type="checkbox" data-k="${esc(key)}">${esc(label)}</label></div>${kids ? `<ul hidden>${kids}</ul>` : ''}</li>`;
    const mineOut = k => k === me() || (me().startsWith('counselor') && k === me());
    return `<ul class="rtree">
      ${me() !== 'principal' ? node('principal', 'مدیر مدرسه') : ''}
      ${node('deputy', 'معاونان', [['deputy', 'معاون آموزشی'], ['exec', 'معاون اجرایی']].filter(([id]) => id !== me()).map(([id, l]) => node('dep:' + id, l)).join(''))}
      ${node('teacher', 'معلمان', gs.map(g => node(`teacher:${g}`, `پایهٔ ${D.GRADE_NAME[g]}`, subjectsOf(g).map(su => node(`tch:${su}@${g}`, `معلم ${su}`)).join(''))).join(''))}
      ${node('counselor', 'معلمان راهنما', gs.filter(g => !mineOut(`counselor:${g}`)).map(g => node(`counselor:${g}`, `پایهٔ ${D.GRADE_NAME[g]}`)).join(''))}
      ${node('nazem', 'ناظم')}${node('finance', 'واحد مالی')}
      ${node('student', 'دانش‌آموزان', gs.map(g => node(`student:${g}`, `پایهٔ ${D.GRADE_NAME[g]}`)).join(''))}
      ${node('parent', 'اولیا', gs.map(g => node(`parent:${g}`, `پایهٔ ${D.GRADE_NAME[g]}`)).join(''))}</ul>`;
  }
  function wireTree(root) {
    const kids = li => [...li.querySelectorAll(':scope > ul > li')];
    const box = li => li.querySelector(':scope > .rt-row input');
    const sync = li => { // a group is ticked when all its parts are, half-ticked when some are
      const ks = kids(li); if (!ks.length) return;
      ks.forEach(sync);
      const on = ks.filter(k => box(k).checked).length, part = ks.some(k => box(k).indeterminate);
      box(li).checked = on === ks.length; box(li).indeterminate = !box(li).checked && (on > 0 || part);
    };
    const tops = [...root.querySelectorAll('.rtree > li')];
    root.querySelector('.rtree').addEventListener('change', e => {
      const li = e.target.closest('li');
      li.querySelectorAll('ul input').forEach(i => { i.checked = e.target.checked; i.indeterminate = false; });
      tops.forEach(sync);
    });
    root.querySelector('.rtree').addEventListener('click', e => {
      const x = e.target.closest('.rt-x'); if (!x) return;
      const ul = x.closest('li').querySelector(':scope > ul'), open = ul.hidden; ul.hidden = !open; x.setAttribute('aria-expanded', String(open));
    });
    // The chosen keys: a fully ticked group counts as one key, otherwise its ticked parts.
    return () => { const out = []; const walk = li => { if (box(li).checked) out.push(box(li).dataset.k); else kids(li).forEach(walk); }; tops.forEach(walk); return out; };
  }
  function noticeModal() {
    modal(`<h2>اطلاعیهٔ تازه</h2><label class="field"><span>عنوان</span><input class="input" id="n-t"></label>${Voice.button('n-t')}
      <label class="field"><span>متن</span><textarea class="input" id="n-b" rows="4"></textarea></label>${Voice.button('n-b')}
      <fieldset class="field rt-box" style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">برای چه کسانی؟</legend>${recipientTree()}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">انتشار</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const chosen = wireTree(root);
      root.querySelector('#save').onclick = () => {
        const to = chosen();
        if (!v(root, '#n-t')) return UI.invalid('#n-t', 'عنوان را بنویسید.');
        if (!v(root, '#n-b')) return UI.invalid('#n-b', 'متن را بنویسید.');
        if (!to.length) return UI.invalid(root.querySelector('.rt-box'), 'دست‌کم یک گروه یا یک نفر را انتخاب کنید.');
        org().notices.push({ id: D.uid('t'), title: v(root, '#n-t'), body: v(root, '#n-b'), to, date: today, by: me(), read: [] });
        done('اطلاعیه منتشر شد.');
      };
    });
  }

  /* council */
  function council() {
    const c = C(), m = me();
    // The principal also sees what colleagues assigned to each other (read only).
    const boss = m === 'principal', others = boss ? c.council.filter(t => t.from !== m && t.to !== m) : [];
    if (state.cTab === 'others' && !boss) state.cTab = 'mine';
    const mine = c.council.filter(t => t.to === m), given = c.council.filter(t => t.from === m);
    const list = (state.cTab === 'mine' ? mine : state.cTab === 'others' ? others : given).slice().sort((a, b) => (a.done - b.done) || (a.due || '').localeCompare(b.due || ''));
    const row = t => {
      const late = !t.done && t.due && t.due < today, news = state.cTab === 'others' ? false : state.cTab === 'given' ? t.done && !t.doneSeen : !t.seenBy;
      return `<div class="card task ${t.done ? 'done' : ''} ${news ? 'unread' : ''}"><div class="spread"><div>
          <label class="act-line"><input type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''} ${state.cTab === 'mine' ? '' : 'disabled'}><b>${esc(t.title)}</b></label>
          <div class="muted small">${state.cTab === 'mine' ? 'از ' + esc(nameOf(t.from)) : state.cTab === 'others' ? `از ${esc(nameOf(t.from))} به ${esc(nameOf(t.to))}` : 'به ' + esc(nameOf(t.to))}${t.due ? ` · مهلت ${esc(J.format(t.due))}` : ''}${late ? ' <span class="tag bad">گذشته</span>' : ''}${t.done ? ` · <span class="tag ok">انجام شد ${esc(when(t.doneAt))}</span>` : ''}</div></div>
          ${state.cTab === 'given' && t.done && !t.doneSeen ? `<button class="btn sm" data-act="ct-seen" data-id="${t.id}">دیدم</button>` : ''}
          ${state.cTab === 'given' && !t.done ? `<button class="btn sm danger" data-act="ct-del" data-id="${t.id}">پس گرفتن</button>` : ''}</div>
        ${t.desc ? `<p style="margin:8px 0 0">${esc(t.desc)}</p>` : ''}</div>`;
    };
    const n1 = mine.filter(t => !t.done).length, n2 = given.filter(t => t.done && !t.doneSeen).length;
    return `<div class="spread" style="margin-bottom:12px"><div class="seg" role="radiogroup" aria-label="کارها">
        <button role="radio" aria-checked="${state.cTab === 'mine'}" data-act="ct-tab" data-id="mine">کارهای من${n1 ? ` (${fa(n1)})` : ''}</button>
        <button role="radio" aria-checked="${state.cTab === 'given'}" data-act="ct-tab" data-id="given">واگذارشده${n2 ? ` (${fa(n2)} انجام‌شدهٔ تازه)` : ''}</button>
        ${boss ? `<button role="radio" aria-checked="${state.cTab === 'others'}" data-act="ct-tab" data-id="others">کارهای همکاران${others.some(t => !t.done) ? ` (${fa(others.filter(t => !t.done).length)} باز)` : ''}</button>` : ''}</div>
        <button class="btn primary" data-act="ct-new">+ واگذاری کار</button></div>
      ${list.map(row).join('') || `<div class="card">${empty(state.cTab === 'mine' ? 'کاری به شما واگذار نشده.' : state.cTab === 'others' ? 'همکاران کاری به هم واگذار نکرده‌اند.' : 'کاری واگذار نکرده‌اید.')}</div>`}`;
  }
  function taskModal(to) {
    modal(`<h2>واگذاری کار</h2><label class="field"><span>کار</span><input class="input" id="k-t"></label>
      <label class="field"><span>مسئول</span><select class="input" id="k-to">${people().filter(p => p[0] !== me()).map(([id]) => { const p = personOf(id); return `<option value="${id}" ${id === to ? 'selected' : ''}>${esc(p.name)}${p.role ? ` (${esc(p.role)})` : ''}</option>`; }).join('')}</select></label>
      <label class="field"><span>توضیح</span><textarea class="input" id="k-d" rows="3"></textarea></label>${Voice.button('k-d')}
      <div class="field"><span>مهلت</span>${J.field('k-due', '')}</div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">واگذار کن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#k-t')) return UI.invalid('#k-t', 'کار را بنویسید.');
        C().council.push({ id: D.uid('k'), from: me(), to: v(root, '#k-to'), title: v(root, '#k-t'), desc: v(root, '#k-d'), due: v(root, '#k-due'), at: now(), done: false, doneAt: '', doneSeen: false, seenBy: false });
        state.cTab = 'given'; done('کار واگذار شد.');
      };
    });
  }

  /* chat */
  function chat() {
    const gs = myGroups();
    if (!gs.some(g => g.id === state.group)) state.group = gs[0]?.id || '';
    const g = gs.find(x => x.id === state.group);
    if (g && g.msgs.length && unreadIn(g)) { const c = C(); (c.seen[me()] = c.seen[me()] || {})[g.id] = g.msgs[g.msgs.length - 1].at; save(); }
    const side = `<aside class="chat-side" aria-label="گروه‌ها">${gs.map(x => { const n = x.id === state.group ? 0 : unreadIn(x);
        return `<button class="chat-g ${x.id === state.group ? 'on' : ''}" data-act="ch-group" data-id="${x.id}"><b>${esc(x.name)}</b><span class="muted small">${fa(x.members.length)} نفر</span>${n ? `<span class="badge">${fa(n)}</span>` : ''}</button>`; }).join('')
      || '<p class="muted small">عضو گروهی نیستید.</p>'}${isBoss() ? '<button class="btn sm" data-act="ch-new" style="margin-top:8px">+ گروه تازه</button>' : ''}</aside>`;
    if (!g) return `<div class="chat">${side}<div class="card">${empty('گروهی برای گفتگو نیست.')}</div></div>`;
    let last = '';
    const msgs = g.msgs.map(m => { const day = m.at.slice(0, 10), sep = day !== last ? `<div class="chat-day">${esc(J.format(day))}</div>` : ''; last = day;
      return sep + `<div class="msg ${m.from === me() ? 'mine' : ''}"><div class="who">${esc(nameOf(m.from))}</div><div>${esc(m.text).replace(/\n/g, '<br>')}</div><time>${digits(m.at.slice(11, 16))}</time></div>`; }).join('');
    return `<div class="chat">${side}<section class="card chat-main" aria-label="${esc(g.name)}"><div class="card-head"><div><h2 style="margin:0">${esc(g.name)}</h2>
        <div class="muted small">${g.members.map(x => esc(nameOf(x))).join('، ')}</div></div>${isBoss() ? `<button class="btn sm" data-act="ch-members">اعضا</button>` : ''}</div>
      <div class="chat-log" id="chat-log" tabindex="0" aria-live="polite">${msgs || '<p class="muted small" style="text-align:center">هنوز پیامی نیست.</p>'}</div>
      <div class="chat-send"><textarea class="input" id="ch-text" rows="2" placeholder="پیام… (Enter می‌فرستد، Shift+Enter خط تازه)"></textarea>${Voice.button('ch-text')}<button class="btn primary" data-act="ch-send">فرستادن</button></div></section></div>`;
  }
  function groupModal(g) {
    const cur = g ? g.members : ['principal'];
    modal(`<h2>${g ? 'اعضای ' + esc(g.name) : 'گروه تازه'}</h2>
      ${g && g.fixed ? '' : `<label class="field"><span>نام گروه</span><input class="input" id="g-n" value="${esc(g?.name || '')}"></label>`}
      <fieldset style="border:0;padding:0"><legend class="small muted">اعضا</legend><div class="chips">
        ${people().map(([id, n]) => `<label class="chip"><input type="checkbox" value="${id}" ${cur.includes(id) ? 'checked' : ''} ${id === 'principal' ? 'disabled' : ''}>${esc(n)}</label>`).join('')}</div></fieldset>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button>${g && !g.fixed ? '<button class="btn danger" id="del">حذف گروه</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const members = ['principal', ...[...root.querySelectorAll('fieldset input:checked:not(:disabled)')].map(i => i.value)];
        if (members.length < 2) return UI.invalid(root.querySelector('fieldset'), 'دست‌کم یک عضو دیگر انتخاب کنید.');
        if (g) { g.members = members; if (!g.fixed && v(root, '#g-n')) g.name = v(root, '#g-n'); done('اعضا ذخیره شد.'); return; }
        if (!v(root, '#g-n')) return UI.invalid('#g-n', 'نام گروه را بنویسید.');
        const ng = { id: D.uid('cg'), name: v(root, '#g-n'), fixed: false, members, msgs: [] }; C().groups.push(ng); state.group = ng.id; done('گروه ساخته شد.');
      };
      const del = root.querySelector('#del'); if (del) del.onclick = () => { const c = C(); c.groups = c.groups.filter(x => x.id !== g.id); state.group = ''; done('گروه حذف شد.'); };
    });
  }
  function send() {
    const t = document.getElementById('ch-text'), text = t.value.trim(); if (!text) return;
    const g = C().groups.find(x => x.id === state.group); if (!g) return;
    g.msgs.push({ id: D.uid('m'), from: me(), text, at: now() }); const c = C(); (c.seen[me()] = c.seen[me()] || {})[g.id] = g.msgs[g.msgs.length - 1].at;
    save(); render(); document.getElementById('ch-text')?.focus();
  }

  /* ---------------- wiring ---------------- */
  const act = {
    'lt-box': b => { state.box = b.dataset.id; state.open = ''; render(); },
    'lt-new': () => letterModal(null, null),
    'lt-open': b => {
      state.open = state.open === b.dataset.id ? '' : b.dataset.id;
      const l = C().letters.find(x => x.id === b.dataset.id);
      if (state.open && l.to.includes(me()) && !l.read.includes(me())) { l.read.push(me()); save(); }
      render();
    },
    'lt-reply': b => letterModal(C().letters.find(x => x.id === b.dataset.id)),
    'nc-new': noticeModal,
    'nc-read': b => { const n = org().notices.find(x => x.id === b.dataset.id); if (!n.read.includes(me())) n.read.push(me()); save(); render(); },
    'ct-tab': b => { state.cTab = b.dataset.id; if (b.dataset.id === 'mine') { C().council.forEach(t => { if (t.to === me()) t.seenBy = true; }); save(); } render(); },
    'ct-new': b => taskModal(b?.dataset?.to),
    'lt-to': b => letterModal(null, b.dataset.to),
    'mn-new': () => noteModal(null),
    'mn-edit': b => noteModal(myNotes().find(x => x.id === b.dataset.id)),
    'mn-pin': b => { const n = myNotes().find(x => x.id === b.dataset.id); n.pin = !n.pin; save(); render(); },
    'mn-del': async b => { if (!await UI.ask('حذف یادداشت', 'این یادداشت حذف شود؟', 'حذف')) return; const c = C(); c.notes[me()] = myNotes().filter(x => x.id !== b.dataset.id); save(); render(); },
    'ct-seen': b => { C().council.find(t => t.id === b.dataset.id).doneSeen = true; save(); render(); },
    'ct-del': async b => { if (await UI.ask('پس گرفتن کار', 'این کار از فهرست مسئولش برداشته شود؟', 'پس بگیر')) { const c = C(); c.council = c.council.filter(t => t.id !== b.dataset.id); save(); render(); } },
    'ch-group': b => { state.group = b.dataset.id; render(); },
    'ch-new': () => groupModal(null),
    'ch-members': () => groupModal(C().groups.find(x => x.id === state.group)),
    'ch-send': send,
    // The request's text stays folded under the parent's name until the arrow opens it.
    'mr-more': b => b.setAttribute('aria-expanded', String(b.closest('.mz-rq').classList.toggle('open'))),
    'mr-set': b => answerReq(b.dataset.id, true),
    'mr-no': b => answerReq(b.dataset.id, false),
  };
  function bind() {
    // Opening «کارهای من» counts as seeing newly given tasks.
    const tab = ctx.view() === 'comms' && (ctx.arg() || 'desk');
    if (tab === 'desk' || (tab === 'council' && state.cTab === 'mine')) {
      const fresh = C().council.filter(t => t.to === me() && !t.seenBy); if (fresh.length) { fresh.forEach(t => { t.seenBy = true; }); save(); }
    }
    document.querySelectorAll('[data-task]').forEach(c => c.onchange = () => {
      const t = C().council.find(x => x.id === c.dataset.task); t.done = c.checked; t.doneAt = c.checked ? now() : ''; t.doneSeen = false;
      save(); render(); if (c.checked) toast(`به ${nameOf(t.from)} خبر داده شد که انجام شد.`);
    });
    const ta = document.getElementById('ch-text'); if (ta) ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    const log = document.getElementById('chat-log'); if (log) log.scrollTop = log.scrollHeight;
    const q = document.getElementById('ph-q');
    if (q) q.oninput = () => { const t = q.value.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک'); let n = 0;
      document.querySelectorAll('#ph-list li').forEach(li => { const on = !t || li.dataset.k.includes(t); li.hidden = !on; n += on; });
      document.getElementById('ph-none').hidden = n > 0; };
    fitDesk();
  }
  // The desk fills the rest of the window, to the bottom edge, so everything is on one screen and each panel
  // scrolls inside itself. Below 760px it stacks and grows with its content instead.
  function fitDesk() {
    const el = document.querySelector('.mz-desk'); if (!el) return;
    if (innerWidth < 760) { el.style.height = ''; return; }
    el.style.height = Math.max(440, innerHeight - (el.getBoundingClientRect().top + window.scrollY) - 16) + 'px';
    // Whatever the page adds below the desk (its bottom padding) comes off too, so the window does not scroll.
    const over = document.documentElement.scrollHeight - innerHeight;
    if (over > 0) el.style.height = Math.max(440, el.offsetHeight - over) + 'px';
  }
  addEventListener('resize', fitDesk);
  // Items for the unified inbox (inbox.js).
  function feed() {
    const c = C(), m = me(), items = [];
    c.letters.filter(l => l.to.includes(m)).forEach(l => items.push({ key: 'lt:' + l.id, type: 'letter', title: `نامه از ${nameOf(l.from)}`, text: l.subject, at: l.at, href: '#/comms/letters',
      unread: !l.read.includes(m), read: () => { if (!l.read.includes(m)) l.read.push(m); state.box = 'in'; state.open = l.id; } }));
    org().notices.filter(n => n.by !== m && forMe(n)).forEach(n => items.push({ key: 'nt:' + n.id, type: 'notice', title: n.title, text: `اطلاعیه از ${nameOf(n.by)}`, at: n.date, href: '#/comms/notices',
      unread: noticeUnread(n), read: () => { if (!n.read.includes(m)) n.read.push(m); } }));
    c.council.forEach(t => {
      if (t.to === m) items.push({ key: 'ct:' + t.id, type: 'council', title: `کار تازه از ${nameOf(t.from)}`, text: t.title, at: t.at, href: '#/comms/council', unread: !t.seenBy, read: () => { t.seenBy = true; state.cTab = 'mine'; } });
      if (t.from === m && t.done) items.push({ key: 'cd:' + t.id, type: 'council', title: `${nameOf(t.to)} کار را انجام داد`, text: t.title, at: t.doneAt, href: '#/comms/council', unread: !t.doneSeen, read: () => { t.doneSeen = true; state.cTab = 'given'; } });
    });
    (org().meetReq || []).filter(r => r.to === m).forEach(r => { const s = reqStudent(r);
      items.push({ key: 'mr:' + r.id, type: 'council', title: `درخواست جلسه از ولی ${s?.name || ''}`, text: r.topic, at: r.at.slice(0, 19), href: '#/comms', unread: r.status === 'new', read: () => {} }); });
    myGroups().forEach(g => { const last = g.msgs[g.msgs.length - 1]; if (last && last.from !== m) items.push({ key: `ch:${g.id}:${last.at}`, type: 'chat', title: `گفتگوی ${g.name}`, text: `${nameOf(last.from)}: ${last.text}`, at: last.at, href: '#/comms/chat',
      unread: unreadIn(g) > 0, read: () => { state.group = g.id; } }); });
    return items;
  }
  return { page, noticeStrip, act, bind, unread, counts, me, nameOf, people, feed, reqCard };
};
