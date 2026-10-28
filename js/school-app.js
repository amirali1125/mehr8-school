// School view. Each role sees at most four sections (NAV in shell.js), each section shows its pages as tabs.
// The principal also reaches every grade's guidance-teacher space through the grade buttons (#/g/<grade>/<page>).
// Data: one dataset per grade (SchoolData.get) plus school-wide data (SchoolData.org). Module state comes from Store.
(() => {
  if (!Auth.require()) return;
  const { $, esc, fa, money, fdate, weekday, initials, modal, close, isOpen, toast } = UI;
  const C = CATALOG, D = SchoolData, icon = Shell.icon;
  const WHO = { principal: 'مدیر', counselor: 'معلم راهنما', teacher: 'معلم ریاضی' };
  const SESS = { fardi: 'فردی', tahsili: 'تحصیلی', khanevade: 'خانواده' };
  const TONE = { pos: ['مثبت', 'ok'], neu: ['خنثی', 'grey'], neg: ['نگران‌کننده', 'bad'] };
  const PLACES = ['کلاس', 'حیاط', 'نمازخانه', 'آزمایشگاه', 'اردو', 'دیگر'];
  const GN = g => D.GRADE_NAME[g];
  // Pages of the principal's own sections that work on one grade at a time (a grade picker shows in the header).
  const GRADE_SCOPED = ['timetable', 'journal', 'reportcard', 'discipline', 'obs', 'cards', 'greport', 'discCats'];

  /* ---------------- where am I ---------------- */
  let cx = {};
  function parse() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const p = Shell.pref(), s = school(), gs = D.gradesOf(s), me = Auth.user() || {};
    // Only the signed-in person's own roles (the owner previews all of them).
    const mine = me.owner ? Auth.SCHOOL_ROLES : Auth.SCHOOL_ROLES.filter(r => (me.roles || []).includes(r));
    const role = mine.includes(p.role) ? p.role : mine[0];
    if (parts[0] === 'g') {
      const g = +parts[1];
      if (role === 'principal' && gs.includes(g)) return { role: 'counselor', actor: 'principal', grade: g, space: true, view: parts[2] || 'overview', arg: parts[3] };
      parts.splice(0, 2);
    }
    const pick = v => gs.includes(+v) ? +v : gs[0];
    // A student or parent sees one student: their account's. The owner previews any student (chosen in the header).
    if (Auth.FAMILY.includes(role)) {
      const g = me.owner ? pick(p.fGrade) : pick(me.grade), x = D.get(s.id, g);
      const sid = me.owner ? (x.students.some(y => y.id === p.fSid) ? p.fSid : x.students[0]?.id) : me.sid;
      return { role, actor: role, grade: g, sid, space: false, view: parts[0] || 'desk', arg: parts[1] };
    }
    const grade = role === 'counselor' ? (me.grade && !me.owner ? pick(me.grade) : pick(p.cGrade)) : role === 'teacher' ? D.teacherGrade(s) : role === 'deputy' ? pick(p.dGrade) : pick(p.pGrade);
    return { role, actor: role, grade, space: false, view: parts[0] || 'desk', arg: parts[1] };
  }
  // A school's own staff always work in their own school; the owner picks any.
  const school = () => { const me = Auth.user(); return Store.school(me && !me.owner ? me.school : Shell.pref().school) || Store.state.schools[0]; };
  const role = () => cx.role;
  const data = () => D.get(school().id, cx.grade);
  const BL = () => D.bellsOf(cx.grade);  // this grade's bells
  const org = () => D.org(school().id);
  const save = () => D.save();
  const on = id => !id || Store.isOn(school(), id);
  const today = D.today();
  const digitsFa = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const readsSessions = () => C.readsSessions.includes(cx.actor);
  const hrefOf = (view, arg) => `#/${cx.space ? `g/${cx.grade}/` : ''}${view}${arg ? '/' + arg : ''}`;
  const modOf = (r, view) => { for (const h of NAV[r].hubs) for (const p of h.pages) if (p[0] === view) return p[2] || null; return null; };

  const student = id => data().students.find(s => s.id === id);
  const className = id => (data().classes.find(c => c.id === id) || {}).name || '';
  const sLink = id => { const s = student(id); return s ? `<a href="${hrefOf('student', s.id)}">${esc(s.name)}</a>` : '—'; };
  const sAvatar = s => `<span class="who"><span class="avatar" aria-hidden="true">${esc(D.initials(s))}</span><span><a href="${hrefOf('student', s.id)}">${esc(s.name)}</a><div class="muted small">${esc(className(s.cls))}</div></span></span>`;
  const daysAgo = iso => Math.round((new Date(today) - new Date(iso)) / 864e5);
  const lastSession = sid => data().sessions.filter(n => n.sid === sid).map(n => n.date).sort().pop();
  const toneTag = t => `<span class="tag ${TONE[t][1]}">${TONE[t][0]}</span>`;
  const empty = msg => `<div class="empty">${esc(msg)}</div>`;
  const studentOptions = (sel, d = data()) => d.classes.map(c => `<optgroup label="${esc(c.name)}">${d.students.filter(s => s.cls === c.id)
    .map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
  function kpi(label, value, sub = '', href = '', tone = '') {
    // With a link, the whole card opens the page (like the attendance card), not just its small line.
    const inner = `<div class="l">${esc(label)}</div><div class="v">${value}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}`;
    return href ? `<a class="card kpi kpi-link ${tone ? 'tone-' + tone : ''}" href="${href}">${inner}</a>` : `<div class="card kpi ${tone ? 'tone-' + tone : ''}">${inner}</div>`;
  }
  // A big, plain-language shortcut for the role's everyday tasks.
  const action = (tone, ic, title, sub, attrs) => `<button class="action tone-${tone}" ${attrs}><span class="tile">${icon(ic)}</span><span><b>${esc(title)}</b>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</span></button>`;
  const actionLink = (tone, ic, title, sub, href) => `<a class="action tone-${tone}" href="${href}"><span class="tile">${icon(ic)}</span><span><b>${esc(title)}</b><span class="muted">${esc(sub)}</span></span></a>`;

  /* ---------------- locked ---------------- */
  function lockedHtml(id, compact) {
    const x = C.byId(id), p = Store.price(id);
    const pending = Store.state.requests.some(r => r.school === school().id && r.module === id && r.status === 'pending');
    const act = cx.actor === 'principal'
      ? (pending ? '<span class="tag warn">درخواست فرستاده شده؛ منتظر فعال‌سازی</span>' : `<button class="btn primary" data-act="request" data-id="${id}">درخواست فعال‌سازی</button>`)
      : cx.actor === 'counselor' && !cx.space ? (ureqOpen(id) ? '<span class="tag warn">درخواست شما نزد مدیر است</span>' : `<button class="btn primary" data-act="ureq-new" data-id="${id}">درخواست از مدیر</button>`)
      : '<span class="muted small">برای فعال‌شدن، از مدیر مدرسه بخواهید.</span>';
    if (compact) return `<div class="note spread"><span>«${esc(x.name)}» برای این مدرسه فعال نیست.</span>${act}</div>`;
    return `<div class="card locked-card"><div class="lock-tile">${icon('lock')}</div><h2>«${esc(x.name)}» فعال نیست</h2><p class="muted">${esc(x.desc)}</p>
      <p class="small muted">${p.model === 'included' ? 'در اشتراک پایه' : `${money(p.amount)} — ${esc(C.pricing[p.model].unit)}`}</p><div style="margin-top:14px">${act}</div></div>`;
  }

  /* ---------------- homes ---------------- */
  const todayAppts = () => data().appts.filter(a => a.date === today && !a.done).sort((a, b) => a.bell - b.bell);
  const openFollow = to => data().follow.filter(f => !f.done && (!to || f.to === to));

  function counselorDesk() {
    const d = data(), never = d.students.filter(s => !lastSession(s.id));
    const mine = openFollow('counselor'), late = mine.filter(f => f.due < today);
    const worry = d.obs.filter(o => o.tone === 'neg' && daysAgo(o.date) <= 7);
    const ro = cx.space;
    return `${ro ? '' : `<div class="actions">
        ${action('teal', 'chat', 'ثبت جلسهٔ مشاوره', 'شرح جلسه و اقدام بعدی', 'data-act="session"')}
        ${action('teal', 'calendar', 'نوبت تازه', 'برای یک دانش‌آموز', 'data-act="appt-new"')}
        ${action('amber', 'shield', 'ثبت مشاهده', 'رفتار مثبت یا نگران‌کننده', 'data-act="obs-new"')}
        ${actionLink('violet', 'id', 'پروندهٔ دانش‌آموزان', `${fa(d.students.length)} دانش‌آموز پایه`, hrefOf('students'))}</div>`}
      <div class="grid g4" style="margin-top:16px">
        ${kpi('نوبت‌های امروز', fa(todayAppts().length), 'همهٔ نوبت‌ها', hrefOf('appts'), 'teal')}
        ${kpi('پیگیری‌های باز', fa(mine.length), late.length ? `${fa(late.length)} سررسیده` : 'سررسیده‌ای نیست', hrefOf('follow'), 'amber')}
        ${kpi('هنوز بی‌جلسه', fa(never.length), `از ${fa(d.students.length)} دانش‌آموز`, hrefOf('analytics'), 'violet')}
        ${kpi('مشاهدهٔ نگران‌کننده', fa(worry.length), '۷ روز گذشته', hrefOf('obs'), 'rose')}
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-head"><h2>نوبت‌های امروز</h2><span class="muted small">${esc(weekday(today))}</span></div>
          ${!on('guid.appointments') ? lockedHtml('guid.appointments', true) : todayAppts().length ? apptRows(todayAppts()) : empty('امروز نوبتی نیست.')}</div>
        <div class="card"><div class="card-head"><h2>پیگیری‌های باز</h2><a href="${hrefOf('follow')}" class="small">همه</a></div>
          ${!on('guid.followup') ? lockedHtml('guid.followup', true) : mine.length ? followRows(mine.slice(0, 5)) : empty('کار بازی نیست.')}</div>
      </div>`;
  }
  function teacherDesk() {
    const d = data(), di = D.dayIndex(today);
    const classesToday = di === null ? [] : d.classes.flatMap(c => Array.from({ length: BL().n }, (_, b) => ({ c, b: b + 1, sub: D.clsCell(d, c.id, di, b, D.weekStart(today)) })).filter(x => x.sub === D.TEACHER_SUBJECT)).sort((a, b) => a.b - b.b);
    const tasks = openFollow('teacher');
    // With no class today, say when the next one is instead of leaving the card empty.
    const mine = day => d.classes.flatMap(c => Array.from({ length: BL().n }, (_, b) => ({ c, b: b + 1, sub: D.clsCell(d, c.id, day, b, D.weekStart(today)) })).filter(x => x.sub === D.TEACHER_SUBJECT)).sort((a, b) => a.b - b.b);
    const nextDay = [1, 2, 3, 4, 5].map(k => ((di ?? -1) + k) % D.DAYS.length).find(day => mine(day).length);
    const nextTxt = nextDay === undefined ? 'امروز کلاسی ندارید.' : (() => { const x = mine(nextDay)[0]; return `امروز کلاسی ندارید. کلاس بعدی: ${D.DAYS[nextDay]}، زنگ ${fa(x.b)}، ${x.c.name}.`; })();
    return `<div class="actions">
        ${actionLink('blue', 'check', 'حضور و غیاب', 'کلاس امروز', hrefOf('journal'))}
        ${actionLink('blue', 'book', 'ثبت نمره', 'ارزشیابی کلاس', hrefOf('grades'))}
        ${action('violet', 'layers', 'تکلیف تازه', 'در صفحهٔ کلاس درس', 'data-act="hw-new"')}
        ${action('amber', 'shield', 'ثبت مشاهده', 'رفتار دانش‌آموز', 'data-act="obs-new"')}</div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h2>کلاس‌های امروز</h2><div class="row"><span class="muted small">${di === null ? 'امروز تعطیل است' : esc(weekday(today))}</span><a class="btn sm" href="${hrefOf('timetable')}">برنامهٔ هفته</a></div></div>
          ${classesToday.length ? `<div class="table-wrap"><table>${classesToday.map(x => `
            <tr><td class="num" style="width:70px">زنگ ${fa(x.b)}</td><td><b>${esc(x.c.name)}</b><div class="muted small">${esc(x.sub)}</div></td>
            <td><div class="row"><a class="btn sm primary" href="${hrefOf('journal', x.c.id)}">حضور و غیاب</a><a class="btn sm" href="${hrefOf('grades', x.c.id)}">نمره</a></div></td></tr>`).join('')}</table></div>` : empty(nextTxt)}</div>
        <div class="card"><h2>کارهایی که به شما سپرده شده</h2>${tasks.length ? tasks.map(f => `
          <div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)"><div>${esc(f.text)}<div class="muted small">${sLink(f.sid)} · مهلت ${esc(fdate(f.due))}</div></div>
          <button class="btn sm" data-act="follow-done" data-id="${f.id}">انجام شد</button></div>`).join('') : empty('کاری به شما سپرده نشده.')}</div>
      </div>`;
  }
  // Whole-school numbers, summed over every grade.
  function gradeStats(g) {
    const d = D.get(school().id, g);
    const lastKey = Object.keys(d.attendance).map(k => k.split('|')[1]).sort().pop();
    const att = Object.entries(d.attendance).filter(([k]) => k.endsWith('|' + lastKey)).flatMap(([, v]) => Object.values(v));
    return { g, d, students: d.students.length, present: att.filter(x => x !== 'a').length, attN: att.length,
      sessions: d.sessions.filter(n => daysAgo(n.date) <= 30).length, never: d.students.filter(s => !d.sessions.some(n => n.sid === s.id)).length,
      worry: d.obs.filter(o => o.tone === 'neg' && daysAgo(o.date) <= 7).length, late: d.follow.filter(f => !f.done && f.due < today).length };
  }
  function principalDesk() {
    const s = school(), st = D.gradesOf(s).map(gradeStats), sum = k => st.reduce((a, x) => a + x[k], 0);
    const pending = Store.state.requests.filter(r => r.school === s.id && r.status === 'pending');
    // A dashboard (fitDash): what is due on the right, the day's numbers and the grades beside it; my week is a wide
    // table, so it runs the full width below.
    const dp = (html, k) => html ? `<div class="dp ${k}">${html}</div>` : '';
    const right = `<!--dash-req-->${dp(CN.principalReminders(PR.dueCards()), 'fix')}
      ${dp(`<div class="sec-head"><h2>جلسه‌های پیش روی اولیا</h2><a class="small" href="#/family">همه</a></div>${PR.upcomingRows(6)}`, 'grow')}`;
    const main = `<div class="actions duo">
        ${action('teal', 'users', 'جلسه با خانواده', '', 'data-act="fm-new"')}
        ${action('rose', 'bell', 'اطلاعیهٔ تازه', '', 'data-act="nc-new"')}</div>
      <div class="grid g4 kpi-center">
        <a class="card kpi kpi-duo tone-teal kpi-link" href="#/attendance" aria-label="${fa(sum('students'))} دانش‌آموز، ${fa(sum('present'))} دانش‌آموز حاضر در مدرسه؛ جزئیات حضور پایه‌ها">
          <div class="kd-total"><div class="l">دانش‌آموزان مدرسه</div><div class="v">${fa(sum('students'))}</div><div class="s">${fa(st.length)} پایه</div></div>
          <div class="kd-att"><div class="l">دانش‌آموزان حاضر در مدرسه</div><div class="v">${fa(sum('present'))}</div>
            <div class="att-mini">${st.map(x => `<span>${esc(GN(x.g))} <b>${x.attN ? (x.attN - x.present ? `${fa(x.attN - x.present)} غایب` : 'بدون غایب') : 'ثبت نشده'}</b></span>`).join('')}</div></div></a>
        ${kpi('جلسه‌های من با خانواده‌ها', `${fa(PR.upcoming().length)} <span class="v-unit">جلسهٔ پیش رو</span>`, '', '#/family', 'blue')}
        ${kpi('اقدام‌های عقب‌افتاده', fa(PR.lateActions().length), 'از جلسه‌های من با خانواده‌ها', '#/family', 'amber')}
      </div>`;
    const grades = `${dp(`<div class="sec-head"><h2>پایه‌ها</h2></div>
      <div class="mods gmini">${st.map(x => `<a class="grade-card mini" href="#/g/${x.g}/desk"><span class="gnum">${fa(x.g)}</span>
        <span class="gm-t"><b><span class="sr-only">پایهٔ </span>${esc(GN(x.g))}</b><span class="muted small">${fa(x.students)} دانش‌آموز</span></span></a>`).join('')}</div>`, 'whole')}
      <a class="card kpi-link sub-card" href="#/subscription" aria-label="اشتراک مدرسه؛ دیدن ماژول‌ها"><h2>اشتراک مدرسه</h2>
        <p style="margin:0">${fa(Object.keys(s.modules).filter(id => Store.isOn(s, id)).length)} ماژول فعال</p>
        ${pending.length ? `<p class="small"><span class="tag warn">${fa(pending.length)} درخواست در انتظار تأیید</span></p>` : '<p class="muted small">درخواستی در انتظار نیست.</p>'}</a>`;
    return `<div class="dash dash-2">
      <div class="dcol">${right}</div>
      <div class="dcol dmain">${dp(main, 'whole dp-plain')}${grades}</div></div>
      <div class="card dash-below" id="my-week"><h2 style="margin:0">برنامهٔ هفتگی من</h2>${PR.myWeek()}</div>`;
  }

  /* ---------------- students ---------------- */
  let sFilter = { q: '', cls: '' };
  // Compact profile cards: photo (or initials), name and class only, grouped by class; a tap opens the student's file.
  function students() {
    const d = data();
    const match = s => (!sFilter.cls || s.cls === sFilter.cls) && (!sFilter.q || s.name.includes(sFilter.q));
    const groups = d.classes.map((c, ci) => ({ c, ci, list: d.students.filter(s => s.cls === c.id && match(s)) })).filter(x => x.list.length);
    const card = (s, ci) => `<a class="scard" href="${hrefOf('student', s.id)}" aria-label="${esc(s.name)}، ${esc(className(s.cls))}">
        <span class="sphoto tone-${['teal', 'violet', 'blue', 'amber'][ci % 4]}" aria-hidden="true">${D.photoOf(s) ? `<img src="${esc(D.photoOf(s))}" alt="" loading="lazy">` : esc(D.initials(s))}</span>
        <span class="sname">${esc(s.name)}</span><span class="tag grey">${esc(className(s.cls))}</span>${sc ? sessLine(s.id) : ''}</a>`;
    const sc = on('guid.dossier') && role() !== 'teacher';
    const sessLine = sid => { const c = CN.sessCounts(sid); return `<span class="s-sess num"><span>فردی ${fa(c.fardi)}</span><span>تحصیلی ${fa(c.tahsili)}</span><span>خانواده ${fa(c.khanevade)}</span></span>`; };
    const n = groups.reduce((a, x) => a + x.list.length, 0);
    return `<div class="card"><div class="row"><input class="input" id="s-q" placeholder="جست‌وجوی نام…" value="${esc(sFilter.q)}" style="flex:1;min-width:180px" aria-label="جست‌وجوی دانش‌آموز">
        <select class="input" id="s-cls" aria-label="کلاس"><option value="">همهٔ کلاس‌ها</option>${d.classes.map(c => `<option value="${c.id}" ${sFilter.cls === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <span class="muted small">${fa(n)} دانش‌آموز</span></div></div>
      ${groups.map(x => `<div class="group-head"><h2>${esc(x.c.name)}</h2><span class="muted small">${fa(x.list.length)} نفر</span></div>
        <div class="sgrid">${x.list.map(s => card(s, x.ci)).join('')}</div>`).join('') || `<div class="card">${empty('دانش‌آموزی پیدا نشد.')}</div>`}`;
  }

  let sTab = 'summary';
  function studentPage(id) {
    const s = student(id); if (!s) return empty('این دانش‌آموز پیدا نشد.');
    const d = data();
    const tabs = [['summary', 'خلاصه'], ...(role() !== 'teacher' ? [['sessions', 'جلسات مشاوره']] : []), ['obs', 'مشاهده‌ها'], ['school', 'حضور و نمره'], ...(role() !== 'teacher' ? [['tests', 'آزمون‌ها']] : [])];
    if (!tabs.some(t => t[0] === sTab)) sTab = 'summary';
    const mySess = d.sessions.filter(n => n.sid === id).sort((a, b) => b.date.localeCompare(a.date));
    const myObs = d.obs.filter(o => o.sids.includes(id)).sort((a, b) => b.date.localeCompare(a.date));
    const myFollow = d.follow.filter(f => f.sid === id && !f.done);
    let body = '';
    if (sTab === 'summary') {
      const ls = lastSession(id);
      body = `<div class="grid g3">${kpi('جلسه‌های مشاوره', fa(mySess.length), ls ? `آخرین: ${fdate(ls)}` : 'هنوز جلسه‌ای نداشته', '', 'teal')}
        ${kpi('مشاهده‌ها', fa(myObs.length), myObs.some(o => o.tone === 'neg') ? 'مشاهدهٔ نگران‌کننده دارد' : '', '', 'amber')}
        ${kpi('پیگیری‌های باز', fa(myFollow.length), '', '', 'violet')}</div>
        ${myFollow.length && role() !== 'teacher' ? `<div class="card"><h2>پیگیری‌های باز</h2>${followRows(myFollow)}</div>` : ''}
        <div class="card"><div class="card-head"><h2>آخرین مشاهده‌ها</h2>${on('guid.observations') && !cx.space ? `<button class="btn sm" data-act="obs-new" data-sid="${id}">+ مشاهده</button>` : ''}</div>${myObs.length ? obsList(myObs.slice(0, 3)) : empty('مشاهده‌ای ثبت نشده.')}</div>`;
    } else if (sTab === 'sessions') {
      body = !on('guid.dossier') ? lockedHtml('guid.dossier') : !readsSessions()
        ? `<div class="card"><p class="private">${icon('lock')} متن جلسه‌های مشاوره محرمانه است و فقط معلم راهنما آن را می‌خواند.</p>
            ${mySess.length ? `<div class="table-wrap" style="margin-top:12px"><table><tr><th>روز</th><th>نوع</th><th>موضوع</th><th>اقدام بعدی</th></tr>${mySess.map(n => `<tr><td class="small">${esc(fdate(n.date))}</td><td><span class="tag grey">${SESS[n.type]}</span></td><td>${esc(n.title)}</td><td class="small muted">${esc(n.next) || '—'}</td></tr>`).join('')}</table></div>` : empty('هنوز جلسه‌ای نداشته.')}</div>`
        : `<div class="card"><div class="card-head"><h2>پروندهٔ مشاوره</h2><button class="btn primary sm" data-act="session" data-sid="${id}">+ ثبت جلسه</button></div>
            ${mySess.length ? sessionTimeline(mySess) : empty('هنوز جلسه‌ای ثبت نشده.')}</div>`;
    } else if (sTab === 'obs') {
      body = !on('guid.observations') ? lockedHtml('guid.observations')
        : `<div class="card"><div class="card-head"><h2>مشاهده‌ها</h2>${cx.space ? '' : `<button class="btn sm" data-act="obs-new" data-sid="${id}">+ مشاهده</button>`}</div>${myObs.length ? obsList(myObs) : empty('مشاهده‌ای ثبت نشده.')}</div>`;
    } else if (sTab === 'school') {
      const abs = Object.entries(d.attendance).filter(([, v]) => v[id] && v[id] !== 'p').map(([k, v]) => [k.split('|')[1], v[id]]);
      const gr = d.grades.filter(g => g.scores[id] != null);
      body = `<div class="grid g2"><div class="card"><h2>غیبت و تأخیر</h2>${!on('acad.journal') ? lockedHtml('acad.journal', true) : abs.length
          ? abs.map(([dt, v]) => `<div class="spread small" style="padding:4px 0"><span>${esc(weekday(dt))} ${esc(fdate(dt))}</span>${v === 'a' ? '<span class="tag bad">غایب</span>' : '<span class="tag warn">تأخیر</span>'}</div>`).join('')
          : empty('غیبت یا تأخیری ثبت نشده.')}</div>
        <div class="card"><h2>نمره‌ها</h2>${!on('acad.grades') ? lockedHtml('acad.grades', true) : gr.length
          ? gr.map(g => `<div class="spread small" style="padding:4px 0"><span>${esc(g.subject)} — ${esc(g.title)}</span><b class="num">${fa(g.scores[id])} از ${fa(g.max)}</b></div>`).join('')
          : empty('نمره‌ای ثبت نشده.')}</div></div>`;
    } else body = testCards(id);
    return `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${sTab === k}" data-act="stab" data-id="${k}" class="${sTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  }
  function testCards(id) {
    const s = school(), t = data().tests[id];
    const ran = m => (s.used[m] || 0) + (s.credits[m] || 0) > 0;
    const bars = rows => rows.map(([h, v]) => `<div class="hbar"><span>${esc(h)}</span><div class="bar"><i style="width:${v / 50 * 100}%"></i></div><span class="num">${fa(v)}</span></div>`).join('');
    const card = (m, inner) => `<div class="card"><h2>${esc(C.byId(m).name)}</h2>${!ran(m) ? lockedHtml(m, true) : t ? inner + '<p class="muted small">دادهٔ نمونه برای نمایش شکل گزارش.</p>' : empty('هنوز نتیجه‌ای برای این دانش‌آموز ثبت نشده.')}</div>`;
    const HL = { R: 'واقع‌گرا', I: 'جستجوگر', A: 'هنری', S: 'اجتماعی', E: 'اقتصادی', C: 'قراردادی' };
    return `<div class="grid g2">${card('test.neo', t && bars(t.neo))}${card('test.holland', t && bars(t.holland.map(([h, v]) => [HL[h], v])))}</div>`;
  }

  /* ---------------- counselling ---------------- */
  function sessionTimeline(list) {
    return `<ul class="timeline">${list.map(n => `<li><div class="spread"><b>${esc(n.title || SESS[n.type])}</b><span class="tag grey">${SESS[n.type]}</span></div>
      <div class="meta">${esc(weekday(n.date))} ${esc(fdate(n.date))} · ${esc(WHO[n.by] || n.by)}</div>
      <p style="margin:6px 0 0">${esc(n.text)}</p>${n.next ? `<div class="next"><b>اقدام بعدی:</b> ${esc(n.next)}</div>` : ''}</li>`).join('')}</ul>`;
  }
  let sessQ = '';
  function sessions() {
    const list = data().sessions.filter(n => !sessQ || student(n.sid)?.name.includes(sessQ)).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="card"><div class="row"><input class="input" id="sess-q" placeholder="نام دانش‌آموز…" value="${esc(sessQ)}" style="flex:1;min-width:180px" aria-label="فیلتر بر پایهٔ نام">
        ${cx.space ? '' : '<button class="btn primary" data-act="session">+ ثبت جلسه</button>'}</div>
        ${readsSessions() ? '' : `<p class="private" style="margin-top:12px">${icon('lock')} متن جلسه‌ها محرمانه است؛ فقط موضوع و اقدام بعدی دیده می‌شود.</p>`}</div>
      <div class="card"><div class="table-wrap"><table><tr><th>روز</th><th>دانش‌آموز</th><th>نوع</th><th>موضوع</th><th>اقدام بعدی</th></tr>
      ${list.map(n => `<tr><td class="small num">${esc(fdate(n.date))}</td><td>${sLink(n.sid)}</td><td><span class="tag grey">${SESS[n.type]}</span></td>
        <td>${esc(n.title)}</td><td class="small muted">${esc(n.next) || '—'}</td></tr>`).join('') || `<tr><td colspan="5">${empty('جلسه‌ای پیدا نشد.')}</td></tr>`}</table></div></div>`;
  }
  function sessionModal({ sid = '', type = 'fardi', appt = '' } = {}) {
    modal(`<h2>ثبت جلسهٔ مشاوره</h2><p class="muted small">متن جلسه فقط برای معلم راهنما دیده می‌شود.</p>
      <div class="grid g2" style="gap:0 12px">
        <label class="field"><span>دانش‌آموز</span><select class="input" id="f-sid">${studentOptions(sid)}</select></label>
        <label class="field"><span>نوع جلسه</span><select class="input" id="f-type">${Object.entries(SESS).map(([k, v]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span>روز</span>${JDate.field('f-date', today)}</label>
        <label class="field"><span>موضوع</span><input class="input" id="f-title" placeholder="مثلاً برنامه‌ریزی درسی"></label></div>
      <label class="field"><span>شرح جلسه</span><textarea class="input" id="f-text" rows="4"></textarea></label>
      <label class="field"><span>اقدام بعدی</span><input class="input" id="f-next"></label>
      ${on('guid.followup') ? `<div class="grid g2" style="gap:0 12px"><label class="field"><span>پیگیری با</span><select class="input" id="f-to"><option value="">پیگیری لازم نیست</option>
        <option value="counselor">خودم</option><option value="teacher">معلم ریاضی</option><option value="principal">مدیر</option></select></label>
        <label class="field"><span>مهلت</span>${JDate.field('f-due', D.shift(7, today))}</label></div>` : ''}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت جلسه</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const v = k => root.querySelector(k)?.value.trim() || '';
        if (!v('#f-text')) return UI.invalid('#f-text', 'شرح جلسه را بنویسید.');
        const d = data();
        d.sessions.push({ id: D.uid('n'), sid: v('#f-sid'), type: v('#f-type'), date: v('#f-date'), title: v('#f-title'), text: v('#f-text'), next: v('#f-next'), by: cx.actor });
        if (v('#f-to') && v('#f-next')) d.follow.push({ id: D.uid('f'), sid: v('#f-sid'), text: v('#f-next'), to: v('#f-to'), from: cx.actor, due: v('#f-due'), done: false });
        if (appt) { const a = d.appts.find(x => x.id === appt); if (a) a.done = true; }
        save(); close(); render(); toast('جلسه ثبت شد.');
      };
    });
  }
  function appts() {
    const d = data();
    const up = d.appts.filter(a => !a.done && a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.bell - b.bell);
    const missed = d.appts.filter(a => !a.done && a.date < today);
    const days = [...new Set(up.map(a => a.date))];
    return `<div class="spread" style="margin-bottom:12px"><span class="muted">${fa(up.length)} نوبت پیش رو</span>${cx.space ? '' : '<button class="btn primary" data-act="appt-new">+ نوبت تازه</button>'}</div>
      ${missed.length ? `<div class="card"><h2>نوبت‌های گذشته بدون شرح</h2>${apptRows(missed)}</div>` : ''}
      ${days.map(dt => `<div class="card"><h2>${esc(weekday(dt))} ${esc(fdate(dt))}${dt === today ? ' <span class="tag">امروز</span>' : ''}</h2>${apptRows(up.filter(a => a.date === dt))}</div>`).join('') || `<div class="card">${empty('نوبتی نیست.')}</div>`}`;
  }
  const apptRows = list => `<div class="table-wrap"><table>${list.map(a => `<tr><td class="num" style="width:70px">زنگ ${fa(a.bell)}</td><td>${sAvatar(student(a.sid))}</td>
    <td><span class="tag grey">${SESS[a.type]}</span></td><td>${cx.space ? '' : `<div class="row">${on('guid.dossier') ? `<button class="btn sm primary" data-act="session" data-sid="${a.sid}" data-type="${a.type}" data-appt="${a.id}">نوشتن شرح</button>` : ''}
    <button class="btn sm danger" data-act="appt-cancel" data-id="${a.id}">لغو</button></div>`}</td></tr>`).join('')}</table></div>`;
  function apptModal() {
    modal(`<h2>نوبت تازه</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>دانش‌آموز</span><select class="input" id="a-sid">${studentOptions()}</select></label>
      <label class="field"><span>نوع</span><select class="input" id="a-type">${Object.entries(SESS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="field"><span>روز</span>${JDate.field('a-date', today)}</label>
      <label class="field"><span>زنگ</span><select class="input" id="a-bell">${Array.from({ length: BL().n }, (_, i) => `<option value="${i + 1}">زنگ ${fa(i + 1)} (${digitsFa(BL().times[i])})</option>`).join('')}</select></label></div>
      <div class="a-fam" hidden><label class="field"><span>موضوع جلسه با خانواده</span><input class="input" id="a-topic"></label>
        <label class="field"><span>شرح</span><textarea class="input" id="a-desc" rows="2"></textarea></label>${Sms.block('a-sms')}</div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت نوبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const v = k => root.querySelector(k).value, fam = () => v('#a-type') === 'khanevade';
      const syncFam = () => { root.querySelector('.a-fam').hidden = !fam(); }; root.querySelector('#a-type').onchange = syncFam; syncFam();
      const sms = Sms.wire(root, 'a-sms', () => v('#a-topic').trim() ? { name: student(v('#a-sid'))?.name || '', host: `معلم راهنمای پایهٔ ${GN(cx.grade)}${D.guideOf(school().id, cx.grade) ? ` (${D.guideOf(school().id, cx.grade)})` : ''}`, date: v('#a-date'), time: BL().times[+v('#a-bell') - 1], topic: v('#a-topic').trim(), desc: v('#a-desc').trim() } : null);
      root.querySelector('#save').onclick = () => {
        if (fam() && !v('#a-topic').trim()) return UI.invalid('#a-topic', 'موضوع جلسه را بنویسید.');
        const smsTo = fam() ? sms.who() : null; if (smsTo === false) return;
        const a = { id: D.uid('a'), sid: v('#a-sid'), date: v('#a-date'), bell: +v('#a-bell'), type: v('#a-type'), by: cx.actor, done: false, ...(fam() ? { topic: v('#a-topic').trim(), desc: v('#a-desc').trim() } : {}) };
        data().appts.push(a);
        const msg = smsTo ? Sms.queue(org, smsTo, { name: student(a.sid)?.name || '', host: `معلم راهنمای پایهٔ ${GN(cx.grade)}${D.guideOf(school().id, cx.grade) ? ` (${D.guideOf(school().id, cx.grade)})` : ''}`, date: a.date, time: BL().times[a.bell - 1], topic: a.topic, desc: a.desc, grade: cx.grade, sid: a.sid, ref: a.id, phone: student(a.sid)?.phone }) : '';
        save(); close(); render(); toast('نوبت ثبت شد.' + (msg ? ' ' + msg : ''));
      };
    });
  }
  let fTab = 'mine';
  function followRows(list) {
    return `<div class="table-wrap"><table>${list.map(f => `<tr><td>${esc(f.text)}<div class="muted small">${sLink(f.sid)} · با ${esc(WHO[f.to])}</div></td>
      <td class="small num">${f.done ? '<span class="tag ok">انجام شد</span>' : `مهلت ${esc(fdate(f.due))}${f.due < today ? ' <span class="tag bad">گذشته</span>' : ''}`}</td>
      <td>${f.done || cx.space ? '' : `<button class="btn sm" data-act="follow-done" data-id="${f.id}">انجام شد</button>`}</td></tr>`).join('')}</table></div>`;
  }
  function follow() {
    const d = data();
    const sets = { mine: openFollow('counselor'), others: openFollow().filter(f => f.to !== 'counselor'), done: d.follow.filter(f => f.done) };
    const labels = { mine: 'کارهای معلم راهنما', others: 'سپرده به همکاران', done: 'انجام‌شده' };
    return `<div class="tabs" role="tablist">${Object.keys(sets).map(k => `<button role="tab" aria-selected="${fTab === k}" class="${fTab === k ? 'on' : ''}" data-act="ftab" data-id="${k}">${labels[k]} (${fa(sets[k].length)})</button>`).join('')}</div>
      <div class="card">${sets[fTab].length ? followRows(sets[fTab].sort((a, b) => a.due.localeCompare(b.due))) : empty('موردی نیست.')}</div>`;
  }
  let obsTone = '';
  function obsList(list) {
    return list.length ? `<div class="table-wrap"><table>${list.map(o => `<tr><td style="width:110px" class="small">${esc(fdate(o.date))}<div class="muted">${esc(o.place)}</div></td>
      <td>${o.sids.map(sLink).join('، ')}<div style="margin-top:2px">${esc(o.text)}</div><div class="muted small">${esc(WHO[o.by] || o.by)}</div></td><td>${toneTag(o.tone)}</td></tr>`).join('')}</table></div>` : empty('مشاهده‌ای نیست.');
  }
  function obsView() {
    const list = data().obs.filter(o => !obsTone || o.tone === obsTone).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="spread" style="margin-bottom:12px"><div class="row" role="group" aria-label="فیلتر">
        ${[['', 'همه'], ['pos', 'مثبت'], ['neu', 'خنثی'], ['neg', 'نگران‌کننده']].map(([k, l]) => `<button class="btn sm" aria-pressed="${obsTone === k}" data-act="obs-tone" data-id="${k}" ${obsTone === k ? 'style="border-color:var(--brand);color:var(--brand-ink);font-weight:700"' : ''}>${l}</button>`).join('')}</div>
        ${cx.space ? '' : '<button class="btn primary" data-act="obs-new">+ ثبت مشاهده</button>'}</div>
      <div class="card">${obsList(list)}</div><p class="muted small">مشاهده‌ها برای همهٔ همکاران دیده می‌شود.</p>`;
  }
  function obsModal({ sid = '', cls = '' } = {}) {
    const d = data();
    modal(`<h2>ثبت مشاهده</h2><p class="muted small">پایهٔ ${esc(GN(cx.grade))}</p>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">دربارهٔ چه کسی؟</legend>
      <div class="chips">${d.students.filter(s => !cls || s.cls === cls).map(s => `<label class="chip"><input type="checkbox" value="${s.id}" ${s.id === sid ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}</div></fieldset>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>کجا</span><select class="input" id="o-place">${PLACES.map(p => `<option>${p}</option>`).join('')}</select></label>
      <label class="field"><span>روز</span>${JDate.field('o-date', today)}</label></div>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">چگونه بود؟</legend><div class="row">
        ${Object.entries(TONE).map(([k, [l]]) => `<label class="chip"><input type="radio" name="tone" value="${k}" ${k === 'neu' ? 'checked' : ''}>${l}</label>`).join('')}</div></fieldset>
      <label class="field"><span>چه دیدید؟</span><textarea class="input" id="o-text" rows="3"></textarea></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const sids = [...root.querySelectorAll('.chips input:checked')].map(i => i.value);
        const text = root.querySelector('#o-text').value.trim();
        if (!sids.length) return UI.invalid(root.querySelector('.chips'), 'دست‌کم یک دانش‌آموز را انتخاب کنید.');
        if (!text) return UI.invalid('#o-text', 'بنویسید چه دیدید.');
        data().obs.push({ id: D.uid('o'), sids, date: root.querySelector('#o-date').value, place: root.querySelector('#o-place').value, tone: root.querySelector('input[name=tone]:checked').value, text, by: cx.actor });
        save(); close(); render(); toast('مشاهده ثبت شد.');
      };
    });
  }
  function analytics() {
    const d = data();
    const rows = d.students.map(s => {
      const ls = lastSession(s.id), worry = d.obs.filter(o => o.tone === 'neg' && o.sids.includes(s.id) && daysAgo(o.date) <= 30).length;
      return { s, ls, gap: ls ? daysAgo(ls) : null, worry };
    });
    const need = rows.filter(r => r.worry && (r.gap === null || r.gap > 14)).concat(rows.filter(r => !r.worry && r.gap === null)).slice(0, 10);
    const bucket = [['هنوز هیچ جلسه‌ای', r => r.gap === null], ['بیش از ۳۰ روز', r => r.gap > 30], ['۱۵ تا ۳۰ روز', r => r.gap >= 15 && r.gap <= 30], ['کمتر از ۱۵ روز', r => r.gap !== null && r.gap < 15]];
    return `<div class="grid g2"><div class="card"><h2>از آخرین جلسه چقدر گذشته؟</h2>${bucket.map(([l, f]) => {
        const n = rows.filter(f).length;
        return `<div class="hbar"><span>${esc(l)}</span><div class="bar"><i style="width:${n / rows.length * 100}%"></i></div><span class="num">${fa(n)}</span></div>`;
      }).join('')}</div>
      <div class="card"><h2>مقایسهٔ کلاس‌ها</h2><div class="table-wrap"><table><tr><th>کلاس</th><th>با جلسه</th><th>نگران‌کننده (۳۰ روز)</th></tr>${d.classes.map(c => {
        const r = rows.filter(x => x.s.cls === c.id);
        return `<tr><td>${esc(c.name)}</td><td class="num">${fa(r.filter(x => x.ls).length)} از ${fa(r.length)}</td><td class="num">${fa(r.filter(x => x.worry).length)}</td></tr>`;
      }).join('')}</table></div></div></div>
      <div class="card"><h2>نیازمند توجه</h2><p class="muted small">مشاهدهٔ نگران‌کننده بدون جلسهٔ تازه، یا هنوز بی‌جلسه.</p>
        <div class="table-wrap"><table>${need.map(r => `<tr><td>${sAvatar(r.s)}</td><td class="small">${r.gap === null ? '<span class="tag warn">بی‌جلسه</span>' : `آخرین جلسه ${fa(r.gap)} روز پیش`}</td>
          <td>${r.worry ? `<span class="tag bad">${fa(r.worry)} مشاهدهٔ نگران‌کننده</span>` : ''}</td>
          <td>${!cx.space && on('guid.appointments') ? '<button class="btn sm" data-act="appt-new">نوبت بده</button>' : ''}</td></tr>`).join('') || `<tr><td>${empty('همه پوشش داده شده‌اند.')}</td></tr>`}</table></div></div>`;
  }

  /* ---------------- teaching ---------------- */
  let ttSel = '', ttEdit = false, ttDraft = {}, ttPick = null;
  // The principal and the academic deputy change a class's timetable bell by bell; «ذخیره» asks: this week only, or from this week on.
  const ttCanEdit = () => !cx.space && ['principal', 'deputy'].includes(cx.role);
  function ttSave() {
    const d = data(), ws = D.weekStart(today), cid = ttSel, n = Object.values(ttDraft).reduce((a, o) => a + Object.keys(o).length, 0); if (!n) return;
    modal(`<h2>ذخیرهٔ ${fa(n)} تغییر در برنامهٔ ${esc(className(cid))}</h2>
      <fieldset class="scope"><legend class="small muted">این تغییر برای کی است؟</legend>
        <label class="scope-opt"><input type="radio" name="scope" value="week" checked><span><b>فقط همین هفته</b><span class="muted small">هفتهٔ ${esc(JDate.format(ws))}؛ هفتهٔ بعد برنامهٔ همیشگی برمی‌گردد.</span></span></label>
        <label class="scope-opt"><input type="radio" name="scope" value="year"><span><b>از این هفته به بعد</b><span class="muted small">برنامهٔ همیشگی کلاس تا آخر سال عوض می‌شود.</span></span></label></fieldset>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const scope = root.querySelector('input[name=scope]:checked').value;
        d.weekOver = d.weekOver || {};
        Object.entries(ttDraft).forEach(([day, cells]) => Object.entries(cells).forEach(([b, su]) => {
          const t = su ? D.teachersFor(d, cid, su)[0] || '' : '';
          if (scope === 'week') { const w = (d.weekOver[ws] = d.weekOver[ws] || { me: {}, cls: {} }); (((w.cls = w.cls || {})[cid] = w.cls[cid] || {})[day] = w.cls[cid][day] || {})[b] = su;
            (((w.tch = w.tch || {})[cid] = w.tch[cid] || {})[day] = w.tch[cid][day] || {})[b] = t; return; }
          d.timetable[cid][day][b] = su;
          if (d.ttTeacher?.[cid]?.[day]) d.ttTeacher[cid][day][b] = t;
          Object.keys(d.weekOver).filter(k => k >= ws).forEach(k => { const c = d.weekOver[k].cls?.[cid]?.[day]; if (c) delete c[b]; });
        }));
        ttDraft = {}; ttEdit = false; ttPick = null; save(); close(); render();
        toast(scope === 'week' ? 'برنامهٔ کلاس فقط برای همین هفته عوض شد.' : 'برنامهٔ کلاس از این هفته به بعد عوض شد.');
      };
    });
  }
  function timetable() {
    const d = data(), di = D.dayIndex(today), ws = D.weekStart(today), sub = (cid, day, b) => D.clsCell(d, cid, day, b, ws);
    const mine = role() !== 'principal' && !cx.space;
    // The principal also sees the grade's counsellor and each subject teacher: when they are at school.
    const subjectsHere = [...new Set(d.classes.flatMap(c => D.DAYS.flatMap((_, day) => Array.from({ length: BL().n }, (_, b) => sub(c.id, day, b)))).filter(Boolean))];
    const teacherOf = su => (org().teachers.find(t => t.subject === su)?.name || `معلم ${su}`).replace(/\s*\(نمونه\)/, '');
    // A grade with the school's real timetable lists its teachers by name; otherwise one sample teacher per subject.
    const who = (cid, day, b) => D.clsTeacher(d, cid, day, b, ws);
    const named = [...new Set(d.classes.flatMap(c => D.DAYS.flatMap((_, day) => Array.from({ length: BL().n }, (_, b) => who(c.id, day, b)))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fa'));
    const guide = D.guideOf(school().id, cx.grade), tw = TeacherWeek.all(school().id, D.gradesOf(school()));
    const alsoIn = t => { const gs = TeacherWeek.gradesIn(tw.get(t) || []).filter(g => g !== cx.grade); return gs.length ? ` · پایهٔ ${gs.map(GN).join('، ')} هم` : ''; };
    const staff = role() === 'principal' || cx.space ? [['counselor', `برنامهٔ معلم راهنما${guide ? ` (${guide})` : ''}`],
      ...(named.length ? named.map(t => ['tch:' + t, t + alsoIn(t)]) : subjectsHere.map(su => ['sub:' + su, `${teacherOf(su)} (${su})`]))] : [];
    const options = [...(mine ? [['me', 'برنامهٔ من']] : []), ...d.classes.map(c => [c.id, c.name]), ...staff];
    if (!ttSel || !options.some(o => o[0] === ttSel)) ttSel = mine ? 'me' : d.classes[0].id;
    const cell = (day, b) => {
      if (ttSel === 'counselor') { const c = D.meCell(d, day, b, ws); if (!c) return '<td class="muted">—</td>'; const [l, t] = CN.kinds[c.type] || [c.type, 'slate'];
        return `<td class="tt-k tone-${t}">${esc(l)}${c.sid && student(c.sid) ? `<div class="small">${esc(student(c.sid).name)}</div>` : ''}</td>`; }
      if (ttSel.startsWith('tch:')) { const t = ttSel.slice(4), cs = d.classes.filter(c => who(c.id, day, b) === t);
        return cs.length ? `<td class="mine">${esc(sub(cs[0].id, day, b))}<div class="small">${cs.map(c => esc(c.name)).join('، ')}</div></td>` : '<td class="muted">—</td>'; }
      if (ttSel.startsWith('sub:')) { const su = ttSel.slice(4), cs = d.classes.filter(c => sub(c.id, day, b) === su);
        return cs.length ? `<td class="mine">${cs.map(c => esc(c.name)).join('، ')}</td>` : '<td class="muted">—</td>'; }
      if (ttSel !== 'me') {
        const changed = ttEdit && Object.prototype.hasOwnProperty.call(ttDraft[day] || {}, b), s = changed ? ttDraft[day][b] : sub(ttSel, day, b), t = changed ? '' : who(ttSel, day, b);
        const wk = Object.prototype.hasOwnProperty.call(d.weekOver?.[ws]?.cls?.[ttSel]?.[day] || {}, b), sel = ttEdit && ttPick && ttPick.day === day && ttPick.b === b;
        const inner = `${esc(s || (ttEdit ? '+' : ''))}${s && t ? `<div class="small muted">${esc(t)}</div>` : ''}`;
        return `<td class="${s === D.TEACHER_SUBJECT && role() === 'teacher' ? 'mine' : ''} ${changed ? 'tt-changed' : ''} ${wk ? 'tt-wk' : ''} ${sel ? 'tt-sel' : ''}">${ttEdit ? `<button type="button" class="tt-cellbtn" data-act="tt-pick" data-day="${day}" data-b="${b}" aria-pressed="${sel}" aria-label="${esc(D.DAYS[day])}، زنگ ${fa(b + 1)}: ${esc(s || 'خالی')}">${inner}</button>` : inner}</td>`;
      }
      if (role() === 'teacher') {
        const cs = d.classes.filter(c => sub(c.id, day, b) === D.TEACHER_SUBJECT);
        return cs.length ? `<td class="mine">${esc(D.TEACHER_SUBJECT)}<div class="small">${cs.map(c => esc(c.name)).join('، ')}</div></td>` : '<td class="muted">—</td>';
      }
      const dates = [...Array(7)].map((_, i) => D.shift(i - (di ?? 0), today)).filter(x => D.dayIndex(x) === day);
      const a = d.appts.find(x => dates.includes(x.date) && x.bell === b + 1 && !x.done);
      return a ? `<td class="appt">نوبت<div class="small">${esc(student(a.sid).name)}</div></td>` : '<td class="muted">—</td>';
    };
    const isCls = d.classes.some(c => c.id === ttSel), editable = isCls && ttCanEdit();
    if (!isCls) ttEdit = false;
    const subjects = [...new Set([...D.SUBJECTS, ...(d.customSubjects || [])])], nDraft = Object.values(ttDraft).reduce((a, o) => a + Object.keys(o).length, 0);
    const palette = ttEdit ? `<div class="palette card" role="region" aria-label="ویرایش برنامهٔ کلاس">${ttPick ? `<div class="prow"><b class="small">${esc(className(ttSel))}، ${esc(D.DAYS[ttPick.day])}، زنگ ${fa(ttPick.b + 1)}:</b></div>
        <div class="prow" role="group" aria-label="درس این زنگ">${subjects.map(su => `<button type="button" class="pchip" data-act="tt-set" data-v="${esc(su)}" aria-pressed="${su === (Object.prototype.hasOwnProperty.call(ttDraft[ttPick.day] || {}, ttPick.b) ? ttDraft[ttPick.day][ttPick.b] : sub(ttSel, ttPick.day, ttPick.b))}">${esc(su)}</button>`).join('')}
          <button type="button" class="pchip erase" data-act="tt-set" data-v="">خالی کردن</button></div>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn primary" data-act="tt-save" ${nDraft ? '' : 'disabled'}>ذخیرهٔ تغییرات${nDraft ? ` (${fa(nDraft)})` : ''}</button><button class="btn" data-act="tt-cancel">انصراف</button></div></div>` : '';
    return `<div class="card"><div class="row"><label class="sr-only" for="tt-sel">برنامه</label><select class="input" id="tt-sel">${options.map(([k, l]) => `<option value="${k}" ${k === ttSel ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <span class="muted small">${ttSel === 'me' && role() === 'counselor' ? 'نوبت‌های مشاورهٔ این هفته' : ''}</span>
        ${editable ? `<button class="btn sm ${ttEdit ? 'primary' : ''}" data-act="tt-edit" aria-pressed="${ttEdit}">${ttEdit ? 'در حال ویرایش' : 'ویرایش زنگ‌ها'}</button>` : ''}
        ${isCls ? '<span class="legend wk-legend small"><i></i>تغییر فقط برای این هفته</span>' : ''}</div>${palette}
      <div class="table-wrap" style="margin-top:12px"><table class="tt"><tr><th></th>${BL().withBreak(Array.from({ length: BL().n }, (_, b) => `<th>زنگ ${fa(b + 1)}<div class="small muted">${digitsFa(BL().times[b])} تا ${digitsFa(BL().ends[b])}</div></th>`), `<th class="tt-break" scope="col"><span class="sr-only">زنگ تفریح و ناهار از </span>${digitsFa(BL().brk.from)}<br>تا<br>${digitsFa(BL().brk.to)}</th>`).join('')}</tr>
      ${D.DAYS.map((dn, day) => `<tr><th scope="row" style="${day === di ? 'color:var(--brand)' : ''}">${dn}${day === di ? ' · امروز' : ''}</th>${BL().withBreak(Array.from({ length: BL().n }, (_, b) => cell(day, b)), '<td class="tt-break"></td>').join('')}</tr>`).join('')}
      </table></div>${ttSel.startsWith('tch:') ? `<h3 style="margin:16px 0 8px">برنامهٔ هفتگی ${esc(ttSel.slice(4))} در همهٔ پایه‌ها</h3>${TeacherWeek.week(school().id, D.gradesOf(school()), ttSel.slice(4), cx.grade)}` : ''}</div>`;
  }
  // Attendance of one class on one day, the whole class on one screen (a grid of small tiles, no scrolling).
  // d.attendance['cls|date'] = { sid: 'p'|'a'|'l' }; d.attMeta['cls|date'] = { sid: { min, note, guide } }:
  // minutes late, an explanation for an absence or lateness, and whether a lateness goes to the guidance teacher.
  // Absences always reach the grade's guidance teacher (attFeed), not the class teachers; a lateness only when «به معلم راهنما» is ticked.
  let jCls = '', jDate = '', jDraft = null, jMeta = null;
  const metaOf = k => { const d = data(); d.attMeta = d.attMeta || {}; return d.attMeta[k] || {}; };
  function journal(arg) {
    const d = data();
    if (arg && d.classes.some(c => c.id === arg)) jCls = arg;
    if (!d.classes.some(c => c.id === jCls)) jCls = d.classes[0].id;
    jDate = jDate || today;
    const k = jCls + '|' + jDate, rec = { ...(d.attendance[k] || {}), ...(jDraft || {}) }, meta = { ...metaOf(k), ...(jMeta || {}) };
    const ss = d.students.filter(s => s.cls === jCls);
    const cnt = t => ss.filter(s => (rec[s.id] || 'p') === t).length;
    const dirty = (jDraft && Object.keys(jDraft).length) || (jMeta && Object.keys(jMeta).length);
    const tile = s => {
      const v = rec[s.id] || 'p', m = meta[s.id] || {};
      return `<li class="jt ${v}"><div class="jt-top"><span class="jt-n num">${fa(s.row)}</span><b class="jt-name" title="${esc(s.name)}">${esc(s.name)}</b>
          <div class="att jt-att" role="group" aria-label="${esc(s.name)}">${[['p', 'حاضر'], ['a', 'غایب'], ['l', 'تأخیر']].map(([t, l]) => `<button class="${t}" aria-pressed="${v === t}" data-act="att" data-sid="${s.id}" data-id="${t}">${l}</button>`).join('')}</div></div>
        ${v === 'p' ? '' : `<div class="jt-more">${v === 'l' ? `<label class="jt-min"><input class="input num" type="number" min="1" max="240" inputmode="numeric" value="${m.min || ''}" data-att-min="${s.id}" aria-label="دقیقهٔ تأخیر ${esc(s.name)}"><span>دقیقه</span></label>
            <label class="jt-guide"><input type="checkbox" data-att-guide="${s.id}" ${m.guide ? 'checked' : ''}><span>به معلم راهنما</span></label>` : '<span class="jt-sent small">برای معلم راهنما می‌رود</span>'}
          <button type="button" class="jt-note ${m.note ? 'has' : ''}" data-act="att-note" data-sid="${s.id}" title="${esc(m.note || 'نوشتن توضیح')}" aria-label="${m.note ? `توضیح: ${esc(m.note)}` : `نوشتن توضیح برای ${esc(s.name)}`}">${icon('chat', 'icon xs')}${m.note ? esc(m.note) : 'توضیح'}</button></div>`}</li>`;
    };
    return `<div class="card jt-bar"><div class="row">
        <label class="sr-only" for="j-cls">کلاس</label><select class="input" id="j-cls">${d.classes.map(c => `<option value="${c.id}" ${c.id === jCls ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        ${JDate.field('j-date', jDate, 'روز حضور و غیاب')}
        <span class="jt-sum"><span class="tag ok">حاضر ${fa(cnt('p'))}</span><span class="tag bad">غایب ${fa(cnt('a'))}</span><span class="tag warn">تأخیر ${fa(cnt('l'))}</span></span>
        <span class="muted small">${dirty ? '<b class="jt-dirty">تغییر ثبت‌نشده دارید</b>' : d.attendance[k] ? 'ثبت شده' : 'هنوز ثبت نشده؛ پیش‌فرض همه حاضرند'}</span>
        ${readOnlyAtt() ? '' : `<button class="btn primary jt-save" data-act="att-save">ثبت حضور و غیاب</button>`}</div>
        </div>
      <ul class="jt-grid" aria-label="حضور و غیاب ${esc(className(jCls))}">${ss.map(tile).join('')}</ul>`;
  }
  const readOnlyAtt = () => cx.space;
  let gCls = '', gId = '';
  function grades(arg) {
    const d = data();
    if (arg && d.classes.some(c => c.id === arg)) gCls = arg;
    if (!d.classes.some(c => c.id === gCls)) gCls = d.classes[0].id;
    const list = d.grades.filter(g => g.cls === gCls);
    if (!list.some(g => g.id === gId)) gId = list[0]?.id || '';
    const g = list.find(x => x.id === gId), ss = d.students.filter(s => s.cls === gCls);
    const vals = g ? ss.map(s => g.scores[s.id]).filter(v => v != null) : [];
    return `<div class="card"><div class="row">
        <label class="sr-only" for="g-cls">کلاس</label><select class="input" id="g-cls">${d.classes.map(c => `<option value="${c.id}" ${c.id === gCls ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <label class="sr-only" for="g-id">ارزشیابی</label><select class="input" id="g-id">${list.map(x => `<option value="${x.id}" ${x.id === gId ? 'selected' : ''}>${esc(x.subject)} — ${esc(x.title)}</option>`).join('') || '<option>ارزشیابی‌ای نیست</option>'}</select>
        ${role() === 'teacher' ? '<button class="btn primary" data-act="grade-new">+ ارزشیابی تازه</button>' : ''}</div></div>
      ${g ? `<div class="card"><div class="card-head"><h2>${esc(g.title)} <span class="muted small">از ${fa(g.max)} · ${esc(fdate(g.date))}</span></h2>
        <span class="small">میانگین کلاس: <b class="num">${vals.length ? fa((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : '—'}</b></span></div>
        <div class="table-wrap"><table><tr><th>ردیف</th><th>دانش‌آموز</th><th>نمره</th></tr>${ss.map(s => `<tr><td class="num" style="width:50px">${fa(s.row)}</td><td>${esc(s.name)}</td>
          <td>${role() === 'teacher' ? `<input class="input num" type="number" min="0" max="${g.max}" step="0.25" value="${g.scores[s.id] ?? ''}" data-score="${s.id}" aria-label="نمرهٔ ${esc(s.name)}" style="width:100px">`
            : `<span class="num">${g.scores[s.id] != null ? fa(g.scores[s.id]) : '—'}</span>`}</td></tr>`).join('')}</table></div>
        ${role() === 'teacher' ? '<p class="muted small">هر نمره با خروج از خانه ذخیره می‌شود.</p>' : ''}</div>` : `<div class="card">${empty('برای این کلاس ارزشیابی‌ای ثبت نشده.')}</div>`}`;
  }


  /* ---------------- principal: family counselling ---------------- */
  const famStudent = (g, sid) => (D.get(school().id, g).students.find(s => s.id === sid) || {}).name || '—';
  const gradeOptions = sel => D.gradesOf(school()).map(g => `<option value="${g}" ${g === sel ? 'selected' : ''}>پایهٔ ${esc(GN(g))}</option>`).join('');
  function family() {
    const list = org().family.slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<p class="note">این‌ها گفت‌وگوهای خود شما با خانواده‌هاست و از پروندهٔ معلم راهنما جداست. برای دیدن کار معلم راهنمای هر پایه، از دکمه‌های «پایه‌ها» در نوار کناری وارد شوید.</p>
      <div class="spread" style="margin:16px 0 12px"><span class="muted">${fa(list.length)} جلسه</span><button class="btn primary" data-act="family-new">+ جلسهٔ تازه با خانواده</button></div>
      ${list.length ? `<div class="card"><ul class="timeline">${list.map(m => `<li><div class="spread"><b>${esc(m.topic)}</b><span class="tag grey">پایهٔ ${esc(GN(m.grade))}</span></div>
        <div class="meta">${esc(weekday(m.date))} ${esc(fdate(m.date))} · ${esc(famStudent(m.grade, m.sid))} · با ${esc(m.who)}</div>
        <p style="margin:6px 0 0">${esc(m.text)}</p>${m.next ? `<div class="next"><b>اقدام بعدی:</b> ${esc(m.next)}</div>` : ''}</li>`).join('')}</ul></div>` : `<div class="card">${empty('هنوز جلسه‌ای ثبت نشده.')}</div>`}`;
  }
  function familyModal() {
    let g = cx.grade;
    modal(`<h2>جلسه با خانواده</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>پایه</span><select class="input" id="m-g">${gradeOptions(g)}</select></label>
      <label class="field"><span>دانش‌آموز</span><select class="input" id="m-s">${studentOptions('', D.get(school().id, g))}</select></label>
      <label class="field"><span>با چه کسی</span><select class="input" id="m-w"><option>مادر</option><option>پدر</option><option>پدر و مادر</option><option>سرپرست</option></select></label>
      <label class="field"><span>روز</span>${JDate.field('m-d', today)}</label></div>
      <label class="field"><span>موضوع</span><input class="input" id="m-t"></label>
      <label class="field"><span>شرح گفت‌وگو</span><textarea class="input" id="m-x" rows="3"></textarea></label>
      <label class="field"><span>اقدام بعدی</span><input class="input" id="m-n"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#m-g').onchange = e => { g = +e.target.value; root.querySelector('#m-s').innerHTML = studentOptions('', D.get(school().id, g)); };
      root.querySelector('#save').onclick = () => {
        const v = k => root.querySelector(k).value.trim();
        if (!v('#m-t') || !v('#m-x')) return UI.invalid(['#m-t', '#m-x'], 'موضوع و شرح را بنویسید.');
        org().family.push({ id: D.uid('m'), sample: false, grade: g, sid: v('#m-s'), who: v('#m-w'), date: v('#m-d'), topic: v('#m-t'), text: v('#m-x'), next: v('#m-n') });
        save(); close(); render(); toast('جلسه ثبت شد.');
      };
    });
  }
  const famApptRows = list => `<div class="table-wrap"><table>${list.map(a => `<tr><td class="small" style="width:150px"><b>${esc(weekday(a.date))}</b> ${esc(fdate(a.date))}<div class="muted num">${esc(a.time)}</div></td>
    <td>${esc(famStudent(a.grade, a.sid))} <span class="muted small">· پایهٔ ${esc(GN(a.grade))} · با ${esc(a.who)}</span><div class="small">${esc(a.topic)}</div></td>
    <td><div class="row"><button class="btn sm primary" data-act="fappt-done" data-id="${a.id}">برگزار شد</button><button class="btn sm danger" data-act="fappt-cancel" data-id="${a.id}">لغو</button></div></td></tr>`).join('')}</table></div>`;
  function familyAppts() {
    const up = org().familyAppts.filter(a => !a.done).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return `<div class="spread" style="margin-bottom:12px"><span class="muted">${fa(up.length)} نوبت</span><button class="btn primary" data-act="fappt-new">+ نوبت تازه</button></div>
      <div class="card">${up.length ? famApptRows(up) : empty('نوبتی با خانواده‌ها نیست.')}</div>`;
  }
  function famApptModal() {
    let g = cx.grade;
    modal(`<h2>نوبت دیدار با خانواده</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>پایه</span><select class="input" id="k-g">${gradeOptions(g)}</select></label>
      <label class="field"><span>دانش‌آموز</span><select class="input" id="k-s">${studentOptions('', D.get(school().id, g))}</select></label>
      <label class="field"><span>با چه کسی</span><select class="input" id="k-w"><option>مادر</option><option>پدر</option><option>پدر و مادر</option></select></label>
      <label class="field"><span>روز</span>${JDate.field('k-d', D.shift(1, today))}</label>
      <label class="field"><span>ساعت</span><input class="input num" type="time" id="k-t" value="10:00"></label></div>
      <label class="field"><span>موضوع</span><input class="input" id="k-x"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت نوبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#k-g').onchange = e => { g = +e.target.value; root.querySelector('#k-s').innerHTML = studentOptions('', D.get(school().id, g)); };
      root.querySelector('#save').onclick = () => {
        const v = k => root.querySelector(k).value.trim();
        if (!v('#k-x')) return UI.invalid('#k-x', 'موضوع را بنویسید.');
        org().familyAppts.push({ id: D.uid('k'), sample: false, grade: g, sid: v('#k-s'), who: v('#k-w'), date: v('#k-d'), time: v('#k-t'), topic: v('#k-x'), done: false });
        save(); close(); render(); toast('نوبت ثبت شد.');
      };
    });
  }

  /* ---------------- counsellors' requests: counsellor → principal → system owner ---------------- */
  // A counsellor asks for a psychological test (credits for N students) or a module. Only the principal sees it;
  // once approved it goes to the system owner as an ordinary school request. Kept in org.ureqs.
  const UR = () => { const o = org(); return (o.ureqs = o.ureqs || []); };
  const meC = () => `counselor:${cx.grade}`;
  const ureqOpen = id => UR().some(r => r.by === meC() && r.module === id && ['pending', 'sent'].includes(r.status));
  const UR_ST = { pending: ['نزد مدیر', 'warn'], sent: ['تأیید مدیر؛ فرستاده به مالک سامانه', 'blue'], done: ['فعال شد', 'ok'], rejected: ['رد شد', 'bad'] };
  // A request sent on is «done» once the owner has activated it.
  const urStatus = r => r.status === 'sent' && Store.state.requests.find(q => q.id === r.ownerReq)?.status === 'approved' ? 'done' : r.status;
  const urLabel = r => `${C.byId(r.module).name}${r.qty ? ` · ${fa(r.qty)} دانش‌آموز` : ''}`;
  function ureqPage() {
    const mine = UR().filter(r => r.by === meC()).slice().sort((a, b) => b.at.localeCompare(a.at));
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">درخواست برای مدیر فرستاده می‌شود؛ پس از تأیید مدیر به مالک سامانه می‌رود.</span>
        <button class="btn primary" data-act="ureq-new">+ درخواست تازه</button></div>
      <div class="card">${mine.length ? `<ul class="ev-list">${mine.map(r => { const [l, t] = UR_ST[urStatus(r)];
        return `<li class="ev-row"><div class="ev-what"><b>${esc(urLabel(r))}</b><span class="muted small">${esc(fdate(r.at))}${r.note ? ' · ' + esc(r.note) : ''}${r.reply ? ` · پاسخ مدیر: ${esc(r.reply)}` : ''}</span></div><span class="tag ${t}">${l}</span></li>`; }).join('')}</ul>`
        : empty('هنوز درخواستی نداده‌اید.')}</div>`;
  }
  function ureqModal(pre) {
    const s = school(), tests = C.modules.filter(x => x.price.model === 'per_use'), mods = C.modules.filter(x => !['included', 'per_use'].includes(x.price.model) && !Store.isOn(s, x.id));
    modal(`<h2>درخواست از مدیر</h2>
      <label class="field"><span>چه چیزی لازم دارید؟</span><select class="input" id="u-m">
        <optgroup label="آزمون‌های روان‌شناختی و استعدادیابی">${tests.map(x => `<option value="${x.id}" ${x.id === pre ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>
        ${mods.length ? `<optgroup label="ماژول‌های غیرفعال">${mods.map(x => `<option value="${x.id}" ${x.id === pre ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : ''}</select></label>
      <label class="field" id="u-qf"><span>برای چند دانش‌آموز؟</span><input class="input num" id="u-q" type="number" min="1" value="${data().students.length}"></label>
      <label class="field"><span>توضیح برای مدیر</span><textarea class="input" id="u-n" rows="2" placeholder="مثلاً برای هدایت تحصیلی پایه"></textarea></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">فرستادن برای مدیر</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const sel = root.querySelector('#u-m'), qf = root.querySelector('#u-qf'), sync = () => { qf.hidden = C.byId(sel.value).price.model !== 'per_use'; };
      sel.onchange = sync; sync();
      root.querySelector('#save').onclick = () => {
        const id = sel.value, test = C.byId(id).price.model === 'per_use', qty = Math.floor(+root.querySelector('#u-q').value || 0);
        if (test && !(qty > 0)) return UI.invalid('#u-q', 'تعداد دانش‌آموز را بنویسید.');
        if (ureqOpen(id)) return UI.invalid(sel, 'برای این مورد درخواست باز دارید.');
        UR().push({ id: D.uid('u'), by: meC(), grade: cx.grade, module: id, qty: test ? qty : 0, note: root.querySelector('#u-n').value.trim(), status: 'pending', at: new Date().toISOString() });
        save(); close(); render(); toast('درخواست برای مدیر فرستاده شد.');
      };
    });
  }
  // The principal's queue, at the top of «اشتراک و ماژول‌ها».
  function ureqQueue() {
    const list = UR().filter(r => r.status === 'pending');
    if (!list.length) return '';
    return `<div class="card"><div class="card-head"><h2 style="margin:0">درخواست‌های معلمان راهنما</h2><span class="muted small">پس از تأیید شما برای مالک سامانه فرستاده می‌شود</span></div>
      <ul class="ev-list">${list.map(r => `<li class="ev-row"><div class="ev-what"><b>${esc(urLabel(r))}</b><span class="muted small">معلم راهنمای پایهٔ ${esc(GN(r.grade))} · ${esc(fdate(r.at))}${r.note ? ' · ' + esc(r.note) : ''}</span></div>
        <div class="row"><button class="btn sm primary" data-act="ureq-ok" data-id="${r.id}">تأیید و فرستادن</button><button class="btn sm danger" data-act="ureq-no" data-id="${r.id}">رد</button></div></li>`).join('')}</ul></div>`;
  }
  const ureqFeed = () => {
    if (cx.space) return [];
    if (cx.actor === 'principal') return UR().filter(r => r.status === 'pending').map(r => ({ key: 'ur:' + r.id, type: 'admit', title: `درخواست معلم راهنمای پایهٔ ${GN(r.grade)}`, text: urLabel(r), at: r.at, href: '#/subscription', unread: true }));
    if (cx.actor === 'counselor') return UR().filter(r => r.by === meC() && r.status !== 'pending').map(r => ({ key: `ud:${r.id}:${urStatus(r)}`, type: 'reminder', title: `درخواست شما: ${UR_ST[urStatus(r)][0]}`, text: urLabel(r), at: r.decidedAt || r.at, href: '#/ureq', unread: true }));
    return [];
  };
  // Attendance news from the last week, for the grade's guidance teacher only (not the class teachers):
  // every absence, and a lateness only when the person recording it ticked «به معلم راهنما».
  const attFeed = () => {
    if (cx.space || cx.actor !== 'counselor') return [];
    const x = data(), out = [], since = D.shift(-7, today);
    Object.entries(x.attendance).forEach(([k, rec]) => {
      const [cid, date] = k.split('|'); if (date < since || !x.classes.some(c => c.id === cid)) return;
      const meta = x.attMeta?.[k] || {}, at = meta._at || date + 'T08:00';
      const nameOf = sid => student(sid)?.name || '';
      const abs = Object.keys(rec).filter(sid => rec[sid] === 'a');
      if (abs.length) out.push({ key: `att:${k}:${abs.join(',')}`, type: 'follow', title: `غیبت ${className(cid)}، ${weekday(date)}`, text: abs.map(sid => nameOf(sid) + (meta[sid]?.note ? ` (${meta[sid].note})` : '')).join('، '), at, href: hrefOf('journal', cid), unread: date >= D.shift(-1, today) });
      Object.entries(meta).filter(([sid, m]) => sid[0] !== '_' && rec[sid] === 'l' && m.guide).forEach(([sid, m]) => out.push({ key: `late:${k}:${sid}`, type: 'follow',
        title: `تأخیر ${nameOf(sid)}${m.min ? `، ${fa(m.min)} دقیقه` : ''}`, text: `${className(cid)} · ${weekday(date)} ${fdate(date)}${m.note ? ` · ${m.note}` : ''}`, at, href: hrefOf('student', sid), unread: true }));
    });
    return out;
  };

  /* ---------------- principal: subscription ---------------- */
  function subscription() {
    const s = school();
    const paid = C.modules.filter(x => x.price.model !== 'included' && x.price.model !== 'per_use');
    const pending = id => Store.state.requests.some(r => r.school === s.id && r.module === id && r.status === 'pending');
    return ureqQueue() + `<p class="note">ماژول یا اعتبار آزمون را از اینجا درخواست کنید؛ پس از تأیید مالک سامانه همین‌جا فعال می‌شود.</p>
      <div class="card" style="margin-top:16px"><h2>آزمون‌های استعدادیابی</h2><div class="table-wrap"><table><tr><th>آزمون</th><th>اعتبار</th><th>اجراشده</th><th></th></tr>
        ${C.modules.filter(x => x.price.model === 'per_use').map(x => `<tr><td>${esc(x.name)}<div class="muted small">${money(Store.price(x.id).amount)} برای هر دانش‌آموز</div></td>
          <td class="num">${fa(s.credits[x.id] || 0)}</td><td class="num">${fa(s.used[x.id] || 0)}</td>
          <td>${pending(x.id) ? '<span class="tag warn">در انتظار</span>' : `<div class="row"><input class="input num" type="number" min="1" value="30" data-qty="${x.id}" style="width:80px" aria-label="تعداد دانش‌آموز"><button class="btn sm" data-act="request" data-id="${x.id}">درخواست</button></div>`}</td></tr>`).join('')}
      </table></div></div>
      ${C.groups.filter(g => paid.some(x => x.group === g.id)).map(g => `<div class="group-head"><h2>${esc(g.name)}</h2></div>
        <div class="card" style="padding:6px 16px"><div class="table-wrap"><table>${paid.filter(x => x.group === g.id).map(x => {
          const a = s.modules[x.id], isOn = Store.isOn(s, x.id);
          return `<tr><td>${esc(x.name)}<div class="muted small">${esc(x.desc)}</div></td><td class="small num">${money(Store.price(x.id).amount)}<div class="muted">${esc(C.pricing[x.price.model].unit)}</div></td>
            <td style="width:160px">${isOn ? `<span class="tag ok">فعال تا ${esc(fdate(a.until))}</span>` : pending(x.id) ? '<span class="tag warn">در انتظار تأیید</span>' : `<button class="btn sm" data-act="request" data-id="${x.id}">درخواست فعال‌سازی</button>`}</td></tr>`;
        }).join('')}</table></div></div>`).join('')}`;
  }

  /* ---------------- frame ---------------- */
  const PAGES = { students, sessions, appts, follow, obs: obsView, analytics, timetable, journal, grades, family, familyAppts, subscription, ureq: ureqPage };
  const EXT = SchoolModules({ data, org, save, role, today, school, student, className, sLink, sAvatar, studentOptions, kpi, empty,
    render: () => render(), WHO, uid: D.uid, shift: D.shift, D, actor: () => cx.actor, readOnly: () => cx.space, gradeOptions });
  Object.assign(PAGES, EXT.pages);
  const MOD_CTX = { data, org, save, school, student, className, hrefOf, studentOptions, kpi, empty, render: () => render(), appeals: () => EXT.appeals(),
    readOnly: () => cx.space || cx.role === 'parent', actor: () => cx.actor, role: () => cx.role, arg: () => cx.arg, sid: () => cx.sid, grade: () => cx.grade, on };
  const CM = Comms({ ...MOD_CTX, grade: () => cx.grade, view: () => cx.view, eventApprovals: () => EXT.eventApprovals(), pendingEvents: () => EXT.pendingEvents(),
    teSide: () => on('qual.teacher') ? TE.sidePanel() : '' });
  MOD_CTX.noticeStrip = () => CM.noticeStrip();
  const CN = Counselor(MOD_CTX), GR = Grades(MOD_CTX), LR = Learning(MOD_CTX), CL = Classroom(MOD_CTX), NZ = Nazem(MOD_CTX);
  const AD = Admin({ ...MOD_CTX, grade: () => cx.grade, me: () => CM.me(), nameOf: id => CM.nameOf(id), people: () => CM.people() });
  Object.assign(PAGES, CN.pages, GR.pages, LR.pages, CL.pages, NZ.pages, AD.pages);
  const PR = Principal({ ...MOD_CTX, grade: () => cx.grade, data, kpi });
  MOD_CTX.catEditor = (x, forAll) => PR.catEditor(x, forAll);
  Object.assign(PAGES, PR.pages);
  const FM = Family({ ...MOD_CTX, GR, CN, CL, LR, nameOf: id => CM.nameOf(id) });
  Object.assign(PAGES, FM.pages);
  const GM = Game(MOD_CTX);
  Object.assign(PAGES, GM.pages);
  const TE = TeacherEval(MOD_CTX);  // «آینهٔ تدریس» replaces the blank teval page
  Object.assign(PAGES, TE.pages);
  const IB = Inbox({ org, save, empty, render: () => render(), me: () => CM.me(), sources: [CM.feed, CN.feed, GR.feed, CL.feed, AD.feed, NZ.feed, LR.feed, ureqFeed, attFeed, () => cx.actor === 'principal' && !cx.space ? PR.feed() : []] });

  /* ---------------- related pages and actions ---------------- */
  // Sections that belong together. A page shows the others of its groups in the «مرتبط‌ها ←» menu of its header:
  // pages the role can open ({ v }) and quick actions ({ act, roles }) such as recording a new case.
  const RELATED = [
    [{ v: 'nzm', l: 'نظامت امروز' }, { v: 'bells', l: 'زنگ مدرسه' }, { v: 'spaces', l: 'برنامهٔ فضاها' }, { v: 'discipline', l: 'موارد انضباطی' }, { v: 'pdisc', l: 'انضباط مدرسه' }, { v: 'journal', l: 'حضور و غیاب' }],
    [{ v: 'pdisc', l: 'انضباط مدرسه' }, { v: 'pobs', l: 'مشاهدات رفتاری' }, { act: 'po-new', l: 'ثبت مشاهدهٔ رفتاری', roles: ['principal'] }, { v: 'discCats', l: 'افزودن مورد به فهرست انضباطی' },
      { v: 'cobs', l: 'مشاهدات رفتاری' }, { act: 'obs-new', l: 'ثبت مشاهدهٔ رفتاری', roles: ['counselor', 'teacher'] }, { v: 'discReg', l: 'ثبت مورد انضباطی' }, { v: 'discCard', l: 'کارنامهٔ انضباطی' },
      { v: 'discSettings', l: 'افزودن مورد به فهرست انضباطی' }, { v: 'obs', l: 'مشاهدات رفتاری' }, { v: 'discipline', l: 'موارد انضباطی' }, { act: 'dc-new', l: 'ثبت مورد انضباطی', roles: ['teacher'] },
      { v: 'greport', l: 'گزارش وضعیت پایه' }],
    [{ v: 'marks', l: 'ثبت نمره' }, { v: 'mdash', l: 'داشبورد نمرات' }, { v: 'cards', l: 'کارنامه‌ها' }, { v: 'cardDefs', l: 'تعریف کارنامه و ضریب‌ها' }, { v: 'greport', l: 'گزارش وضعیت پایه' },
      { v: 'exams', l: 'آزمون‌ها و بانک سؤال' }, { v: 'splan', l: 'ثبت مطالعه' }, { v: 'online', l: 'کلاس‌ها (تکلیف، آزمون، منبع)' }],
    [{ v: 'splan', l: 'ثبت مطالعه' }, { v: 'mdash', l: 'داشبورد نمرات' }, { v: 'greport', l: 'گزارش وضعیت پایه' }, { v: 'online', l: 'کلاس‌ها (تکلیف، آزمون، منبع)' }],
    [{ v: 'journal', l: 'حضور و غیاب' }, { v: 'attendance', l: 'حضور همهٔ پایه‌ها' }, { v: 'timetable', l: 'برنامهٔ هفتگی' }, { v: 'greport', l: 'گزارش وضعیت پایه' }, { v: 'students', l: 'دانش‌آموزان' }],
    [{ v: 'family', l: 'جلسه با خانواده‌ها' }, { act: 'fm-new', l: 'جلسهٔ تازه با خانواده', roles: ['principal'] }, { v: 'desk', l: 'برنامهٔ هفتگی من' }, { v: 'greport', l: 'گزارش وضعیت پایه' }, { v: 'pobs', l: 'مشاهدات رفتاری' }],
    [{ v: 'students', l: 'دانش‌آموزان' }, { act: 'session', l: 'ثبت جلسهٔ مشاوره', roles: ['counselor'] }, { act: 'appt-new', l: 'نوبت تازه', roles: ['counselor'] }, { v: 'cobs', l: 'مشاهدات رفتاری' },
      { v: 'discCard', l: 'کارنامهٔ انضباطی' }, { v: 'mdash', l: 'داشبورد نمرات' }, { v: 'splan', l: 'ثبت مطالعه' }, { v: 'ureq', l: 'درخواست آزمون و ماژول' }, { v: 'overview', l: 'نمای کلی' }],
    [{ v: 'ureq', l: 'درخواست آزمون و ماژول' }, { v: 'subscription', l: 'اشتراک و ماژول‌ها' }, { v: 'students', l: 'دانش‌آموزان' }],
    [{ v: 'enroll', l: 'پذیرش دانش‌آموز' }, { v: 'hire', l: 'امور استخدام' }, { v: 'fees', l: 'هزینه‌ها' }, { v: 'wallets', l: 'کیف پول‌ها' }, { v: 'orgchart', l: 'نمودار سازمانی' }, { v: 'users', l: 'کاربران و نقش‌ها' }, { v: 'subscription', l: 'اشتراک و ماژول‌ها' }],
    [{ v: 'foodTrack', l: 'پیگیری تغذیه' }, { v: 'foodMenu', l: 'منوی غذا' }, { v: 'coopAdmin', l: 'مدیریت تعاون' }, { v: 'services', l: 'خدمات (سفارش خودم)' }, { v: 'wallets', l: 'کیف پول‌ها' }],
    [{ v: 'comms', l: 'ارتباطات' }, { v: 'calendar', l: 'تقویم اجرایی' }, { v: 'inbox', l: 'اعلان‌ها' }],
    [{ v: 'timetable', l: 'برنامهٔ هفتگی' }, { v: 'journal', l: 'حضور و غیاب' }, { v: 'calendar', l: 'تقویم اجرایی' }],
    [{ v: 'teval', l: 'ارزیابی معلمان' }, { v: 'greport', l: 'گزارش وضعیت پایه' }, { v: 'timetable', l: 'برنامهٔ هفتگی' }],
  ];
  function relatedMenu(view, allowed) {
    const seen = new Set(), items = RELATED.filter(g => g.some(i => i.v === view)).flat()
      .filter(i => i.v ? i.v !== view && allowed.has(i.v) : !cx.space && i.roles.includes(cx.role))
      .filter(i => { const k = i.l; if (seen.has(k)) return false; seen.add(k); return true; });
    if (!items.length) return '';
    const acts = items.filter(i => i.act), links = items.filter(i => i.v);
    return `<div class="rel"><button type="button" class="btn sm rel-btn" aria-expanded="false" aria-controls="rel-pop">مرتبط‌ها <span aria-hidden="true">←</span></button>
      <div class="rel-pop" id="rel-pop" hidden>${acts.length ? `<div class="rel-h">کار سریع</div>${acts.map(i => `<button type="button" class="rel-i act" data-act="${i.act}"><span class="rel-ic plus" aria-hidden="true">+</span><span>${esc(i.l)}</span></button>`).join('')}` : ''}
        ${links.length ? `<div class="rel-h">بخش‌های مرتبط</div>${links.map(i => `<a class="rel-i" href="${hrefOf(i.v)}">${relIcon(i)}<span>${esc(i.l)}</span></a>`).join('')}` : ''}</div></div>`;
  }
  // Each item's icon, from its label as on the section tabs (else its section's), in a tile of its section's colour.
  function relIcon(i) {
    let h = null; try { h = i.v ? Shell.hubOf(cx.role, i.v) : null; } catch (e) { /* role without a NAV entry */ }
    const svg = TabIcons.forLabel(i.l) || (h ? Shell.icon(h.icon) : '') || Shell.icon('grid');
    return `<span class="rel-ic tone-${h?.tone || 'slate'}" aria-hidden="true">${svg}</span>`;
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('.rel-btn'), pop = document.getElementById('rel-pop'); if (!pop) return;
    if (btn) { const open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) pop.querySelector('.rel-i')?.focus(); return; }
    if (!e.target.closest('.rel-pop') || e.target.closest('.rel-i')) { pop.hidden = true; document.querySelector('.rel-btn')?.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', e => { const pop = document.getElementById('rel-pop'); if (e.key === 'Escape' && pop && !pop.hidden) { pop.hidden = true; const b = document.querySelector('.rel-btn'); b?.setAttribute('aria-expanded', 'false'); b?.focus(); } });

  function render() {
    cx = parse();
    const s = school(), view = cx.view;
    if (view === 'desk' && NAV[cx.role].noHome) { history.replaceState(null, '', hrefOf(NAV[cx.role].home)); return render(); }
    if (view === 'notices') { history.replaceState(null, '', '#/comms/notices'); return render(); }
    if (view === 'food') { history.replaceState(null, '', '#/services/food'); return render(); }
    // Older links: the two family pages and the principal's discipline/observation pages were merged or renamed.
    const moved = cx.role === 'principal' && !cx.space && { familyAppts: 'family', discipline: 'pdisc', obs: 'pobs', reportcard: 'cards' }[view];
    if (moved) { history.replaceState(null, '', '#/' + moved); return render(); }
    // The teacher's weekly timetable opens from the desk instead of a tab.
    const family = !!NAV[cx.role].family;
    const allowed = new Set([...(NAV[cx.role].noHome ? [] : ['desk']), ...(family ? [] : ['student', 'calendar', 'comms', 'services', 'inbox']), ...(cx.role === 'teacher' ? ['timetable'] : []), ...(cx.role === 'principal' ? ['attendance'] : []), ...NAV[cx.role].hubs.flatMap(h => h.pages.map(p => p[0]))]);
    if (!allowed.has(view) || (cx.space && ['calendar', 'comms', 'services', 'inbox'].includes(view))) { history.replaceState(null, '', hrefOf(allowed.has(view) ? view : NAV[cx.role].home).replace(/^#\/g\/\d+\//, '#/')); return render(); }

    Shell.topbar({ role: cx.actor, schoolId: s.id, grade: cx.actor === 'counselor' ? cx.grade : null, notices: family ? FM.unread() : IB.count(),
      onRole: () => render(), onGrade: g => { Shell.setPref({ cGrade: g }); render(); },
      onSchool: id => { Shell.setPref({ school: id }); location.hash = '#/desk'; render(); } });
    const locked = id => !on(id);
    // The principal reaches the grade spaces from the «پایه‌ها» cards on the desk, so the rail has no grade buttons.
    Shell.rail({ role: cx.role, view, noHome: NAV[cx.role].noHome, homeHref: hrefOf('desk'), isHome: view === 'desk', locked, hrefOf: v => hrefOf(v) });

    const who = cx.space ? `مدیر › پایهٔ ${GN(cx.grade)}` : NAV[cx.role].name;
    const mod = modOf(cx.role, view);
    const gradePicker = (cx.role === 'principal' && GRADE_SCOPED.includes(view)) || (cx.role === 'deputy' && view !== 'enroll') || (['exec', 'nazem'].includes(cx.role) && view === 'journal') || (cx.role === 'nazem' && GRADE_SCOPED.includes(view))
      ? `<div class="gpick" role="radiogroup" aria-label="پایه"><span class="gpick-l" aria-hidden="true">پایه</span>${D.gradesOf(s).map(g => `<button type="button" role="radio" aria-checked="${g === cx.grade}" aria-label="پایهٔ ${esc(GN(g))}" title="پایهٔ ${esc(GN(g))}" data-act="pgrade" data-id="${g}">${fa(g)}</button>`).join('')}</div>` : '';
    const famPick = family && Auth.user()?.owner ? `<label class="sr-only" for="fm-g">پایه</label><select class="input sm" id="fm-g">${D.gradesOf(s).map(g => `<option value="${g}" ${g === cx.grade ? 'selected' : ''}>پایهٔ ${esc(GN(g))}</option>`).join('')}</select>
      <label class="sr-only" for="fm-s">دانش‌آموز</label><select class="input sm" id="fm-s">${studentOptions(cx.sid)}</select>` : '';
    let header, body;
    const rel = family ? '' : view === 'desk' ? '' : relatedMenu(view === 'student' ? 'students' : view, allowed);
    if (view === 'desk') {
      // Greet the signed-in person by salutation and name when their account has them («جناب آقای مؤمنی، خوش آمدید»).
      const me = Auth.user(), hello = me && !me.owner && me.salute ? `${me.salute} ${me.name}، خوش آمدید` : null;
      const greet = { principal: hello || 'میز امروز مدیر', counselor: cx.space ? `فضای معلم راهنمای پایهٔ ${GN(cx.grade)}` : `میز امروز · معلم راهنمای پایهٔ ${GN(cx.grade)}`, teacher: 'میز امروز معلم' }[cx.role];
      header = Shell.pageHeader({ crumb: [s.name, who], title: greet, tone: 'teal', iconName: 'home',
        tools: hdrDate(today) });
      body = { principal: principalDesk, counselor: counselorDesk, teacher: teacherDesk }[cx.role]();
    } else if (view === 'student') {
      const st = student(cx.arg);
      header = Shell.pageHeader({ crumb: [who, 'دانش‌آموزان'], title: st ? st.name : 'دانش‌آموز', desc: st ? `${className(st.cls)} · ردیف ${fa(st.row)}` : '', tone: 'violet', iconName: 'id',
        tools: `<a class="btn sm" href="${hrefOf('students')}">بازگشت به فهرست</a>` + rel });
      body = cx.role === 'counselor' ? CN.studentFile(cx.arg) : studentPage(cx.arg);
    } else if (view === 'calendar') {
      header = Shell.pageHeader({ crumb: [s.name, who], title: C.byId('core.calendar').name, tone: 'blue', iconName: 'calendar', tools: rel });
      body = on('core.calendar') ? PAGES.calendar(cx.arg) : lockedHtml('core.calendar');
    } else if (view === 'inbox') {
      header = Shell.pageHeader({ crumb: [s.name, who], title: 'اعلان‌ها', desc: 'هر چیز تازه از همهٔ بخش‌ها، در یک جا', tone: 'rose', iconName: 'bell', tools: rel });
      body = IB.page();
    } else if (view === 'attendance') {
      header = Shell.pageHeader({ crumb: [s.name, who], title: 'حضور و غیاب پایه‌ها', desc: 'آخرین روز و روزهای اخیر، از هفتم تا دوازدهم', tone: 'teal', iconName: 'check', tools: `<a class="btn sm" href="#/desk">بازگشت به امروز</a>` + rel });
      body = PR.pages.attendance();
    } else if (view === 'services') {
      header = Shell.pageHeader({ crumb: [s.name, who], title: 'خدمات', desc: 'تغذیه و تعاونی؛ پول هر سفارش از کیف پول خودتان کم می‌شود', tone: 'amber', iconName: 'services', tools: rel });
      body = on('svc.food') ? PAGES.services(cx.arg) : lockedHtml('svc.food');
    } else if (view === 'comms') {
      header = Shell.pageHeader({ crumb: [s.name, who], title: 'ارتباطات', desc: 'میزکار، گفتگو، کارها و پیگیری‌ها، نامه‌ها، اطلاعیه‌ها و یادداشت‌های من', tone: 'rose', iconName: 'mail', tools: rel });
      body = CM.page(cx.arg, m => on(m) ? '' : lockedHtml(m));
    } else if (view === 'timetable' && !Shell.hubOf(cx.role, view)) {
      header = Shell.pageHeader({ crumb: [s.name, who], title: 'برنامهٔ هفتگی من', desc: 'برنامهٔ واقعی همین هفته', tone: 'blue', iconName: 'calendar',
        tools: `<a class="btn sm" href="${hrefOf('desk')}">بازگشت به امروز</a>` + rel });
      body = on('acad.timetable') ? PAGES.timetable(cx.arg) : lockedHtml('acad.timetable');
    } else {
      const offRail = Shell.hubOf(cx.role, view).rail === false && !NAV[cx.role].noHome;
      const newMeet = cx.role === 'principal' && !cx.space && view === 'family' ? '<button class="btn primary" data-act="fm-new">+ جلسهٔ تازه با خانواده</button>' : '';
      header = Shell.hubHeader({ role: cx.role, view, crumb: [s.name, who], locked, hrefOf: v => hrefOf(v), tools: famPick + gradePicker + newMeet + (offRail ? `<a class="btn sm" href="${hrefOf('desk')}">بازگشت به امروز</a>` : '') + rel,
        title: Shell.hubOf(cx.role, view).pages.length > 1 ? Shell.hubOf(cx.role, view).label : Shell.hubOf(cx.role, view).pages[0][1] });
      body = mod && !on(mod) ? lockedHtml(mod) : !Store.canUse(s, cx.role, mod) ? `<div class="card locked-card"><div class="lock-tile">${icon('lock')}</div><h2>دسترسی ندارید</h2><p class="muted">دسترسی نقش «${esc(NAV[cx.role].name)}» به این بخش را مالک سامانه برای این مدرسه بسته است.</p></div>` : PAGES[view](cx.arg);
    }
    // Parents' meeting requests (family.js) wait on the home page of the person they were sent to, and on the
    // principal's «جلسه با خانواده‌ها»; they are answered there or on the ارتباطات desk.
    const REQ_HOME = { principal: ['desk', 'family'], deputy: ['cardDefs'], nazem: ['nzm'], counselor: ['overview'] };
    if (!cx.space && REQ_HOME[cx.role]?.includes(view)) body = body.includes('<!--dash-req-->') ? body.replace('<!--dash-req-->', CM.reqCard()) : CM.reqCard() + body;
    const banner = cx.space ? `<div class="ctx-banner">${icon('users')} شما (مدیر) در فضای معلم راهنمای پایهٔ ${esc(GN(cx.grade))} هستید؛ این نما فقط برای دیدن است.<a href="#/desk">بازگشت به میز مدیر</a></div>` : '';
    $('#view').innerHTML = header + banner + `<div style="margin-top:${banner ? 16 : 0}px">${body}</div>`;
    // Regions that scroll must be reachable by keyboard (WCAG 2.1.1).
    const focusScrollers = () => $('#view').querySelectorAll('.table-wrap, .oc-wrap, .chat-log, .card, .ftabs, .chips-row').forEach(el => {
      const cs = getComputedStyle(el), scrolls = (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) || (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1);
      if (scrolls && !el.hasAttribute('tabindex')) { el.tabIndex = 0; if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'ناحیهٔ قابل پیمایش'); }
    });
    document.title = `${$('#title')?.textContent || ''} · ${s.name}`;
    Voice.auto($('#view')); UI.cardTables($('#view')); bindInputs(); focusScrollers();
    // A column of buttons often has no heading; screen readers still need one (WCAG 1.3.1).
    $('#view').querySelectorAll('th').forEach(th => { if (!th.textContent.trim()) th.insertAdjacentHTML('beforeend', '<span class="sr-only">کارها</span>'); });
  }

  // Today as a small desk calendar: the month on a coloured band, the day large, the weekday and year under it.
  function hdrDate(iso) {
    const j = JDate.isoToJ(iso), full = fdate(iso, { day: 'numeric', month: 'long', year: 'numeric' });
    return `<div class="hdr-date" role="img" aria-label="امروز ${esc(weekday(iso))} ${esc(full)}"><span class="hd-m" aria-hidden="true">${esc(JDate.MONTHS[j.jm - 1])}</span>
      <b class="hd-d num" aria-hidden="true">${fa(j.jd)}</b><span class="hd-w" aria-hidden="true">${esc(weekday(iso))} · ${fa(j.jy).replace(/٬/g, '')}</span></div>`;
  }

  function bindInputs() {
    const keep = (id, fn) => { const el = $(id); if (!el) return; el.oninput = el.onchange = e => { fn(e.target.value); const pos = e.target.selectionStart; render(); const n = $(id); n?.focus(); if (n?.setSelectionRange && pos != null) n.setSelectionRange(pos, pos); }; };
    keep('#s-q', v => { sFilter.q = v; }); keep('#s-cls', v => { sFilter.cls = v; });
    keep('#sess-q', v => { sessQ = v; });
    keep('#tt-sel', v => { ttSel = v; ttEdit = false; ttDraft = {}; ttPick = null; });
    keep('#j-cls', v => { jCls = v; jDraft = null; jMeta = null; });
    keep('#j-date', v => { jDate = v; jDraft = null; jMeta = null; });
    const metaSet = (sid, o) => { const k = jCls + '|' + jDate; jMeta = jMeta || {}; jMeta[sid] = { ...(metaOf(k)[sid] || {}), ...(jMeta[sid] || {}), ...o }; };
    document.querySelectorAll('[data-att-min]').forEach(i => i.onchange = () => { metaSet(i.dataset.attMin, { min: Math.max(0, Math.min(240, Math.round(+i.value) || 0)) || null }); });
    document.querySelectorAll('[data-att-guide]').forEach(c => c.onchange = () => { metaSet(c.dataset.attGuide, { guide: c.checked }); render(); });
    keep('#g-cls', v => { gCls = v; gId = ''; });
    keep('#g-id', v => { gId = v; });
    keep('#fm-g', v => { Shell.setPref({ fGrade: +v, fSid: '' }); });
    keep('#fm-s', v => { Shell.setPref({ fSid: v }); });
    keep('#pgrade', v => { Shell.setPref(cx.role === 'deputy' ? { dGrade: +v } : { pGrade: +v }); jDraft = null; jMeta = null; });
    document.querySelectorAll('[data-score]').forEach(i => i.onchange = () => {
      const g = data().grades.find(x => x.id === gId), v = i.value === '' ? null : Math.min(g.max, Math.max(0, +i.value));
      if (v == null) delete g.scores[i.dataset.score]; else g.scores[i.dataset.score] = v;
      save(); toast('نمره ذخیره شد.');
    });
    EXT.bind(); TE.bind(); CN.bind(); GR.bind(); LR.bind(); CL.bind(); NZ.bind(); CM.bind(); AD.bind(); PR.bind(); FM.bind();
    fitDash();
  }
  // A dashboard page (.dash) fills the window to its bottom edge from 1200px up, so everything is on one screen and
  // each panel scrolls inside itself; narrower, it stacks and grows with its content.
  function fitDash() {
    const el = document.querySelector('#view .dash'); if (!el) return;
    el.style.height = ''; if (innerWidth < 1200) return;
    // Never shorter than what must show whole: .whole panels in full, a .fix panel up to 200px, a .grow list 140px.
    const need = Math.max(560, ...[...el.querySelectorAll(':scope > .dcol')].map(c => [...c.children].reduce((a, ch) =>
      a + (ch.classList.contains('grow') ? 140 : ch.classList.contains('fix') ? Math.min(ch.scrollHeight, 200) : ch.offsetHeight), 0) + 12 * (c.children.length - 1)));
    el.style.height = Math.max(need, innerHeight - el.getBoundingClientRect().top - 16) + 'px';
    const over = document.documentElement.scrollHeight - innerHeight;
    if (over > 0) el.style.height = Math.max(need, el.offsetHeight - over) + 'px';
  }
  addEventListener('resize', fitDash);

  document.addEventListener('click', e => {
    const b = e.target.closest('#view [data-act], #modal-root [data-act]'); if (!b) return;
    const { act, id } = b.dataset, d = data();
    switch (act) {
      case 'session': sessionModal({ sid: b.dataset.sid, type: b.dataset.type, appt: b.dataset.appt }); break;
      case 'appt-new': apptModal(); break;
      case 'appt-cancel': d.appts = d.appts.filter(a => a.id !== id); save(); render(); toast('نوبت لغو شد.'); break;
      case 'follow-done': { const f = d.follow.find(x => x.id === id); f.done = true; save(); render(); toast('انجام شد.'); break; }
      case 'ftab': fTab = id; render(); break;
      case 'pgrade': Shell.setPref(cx.role === 'deputy' ? { dGrade: +id } : { pGrade: +id }); jDraft = null; jMeta = null; render(); document.querySelector(`.gpick [data-id="${id}"]`)?.focus(); break;
      case 'stab': sTab = id; render(); break;
      case 'obs-new': obsModal({ sid: b.dataset.sid, cls: b.dataset.cls }); break;
      case 'obs-tone': obsTone = id; render(); break;
      case 'att': {
        if (readOnlyAtt()) break;
        jDraft = jDraft || {}; jDraft[b.dataset.sid] = id;
        render(); document.querySelector(`[data-act="att"][data-sid="${b.dataset.sid}"][data-id="${id}"]`)?.focus();
        if (id === 'l') document.querySelector(`[data-att-min="${b.dataset.sid}"]`)?.focus();
        break;
      }
      case 'att-note': {
        const sid = b.dataset.sid, k = jCls + '|' + jDate, cur = ({ ...metaOf(k), ...(jMeta || {}) })[sid] || {}, st = student(sid);
        modal(`<h2>توضیح برای ${esc(st?.name || '')}</h2><p class="muted small" style="margin:0">${esc(className(jCls))} · ${esc(weekday(jDate))} ${esc(fdate(jDate))}</p>
          <label class="field"><span>توضیح</span><textarea class="input" id="an-t" rows="3" placeholder="مثلاً با تماس پدر: بیمار است؛ یا: با سرویس دیر رسید">${esc(cur.note || '')}</textarea></label>
          <div class="row" style="margin-top:16px"><button class="btn primary" id="save">نگه داشتن</button><button class="btn" data-close>انصراف</button></div>`, root => {
          root.querySelector('#save').onclick = () => { jMeta = jMeta || {}; jMeta[sid] = { ...cur, ...(jMeta[sid] || {}), note: root.querySelector('#an-t').value.trim() }; close(); render(); toast('توضیح نگه داشته شد؛ «ثبت حضور و غیاب» را بزنید.'); };
        }); break;
      }
      case 'att-save': {
        const k = jCls + '|' + jDate, rec = { ...Object.fromEntries(d.students.filter(s => s.cls === jCls).map(s => [s.id, 'p'])), ...(d.attendance[k] || {}), ...(jDraft || {}) };
        d.attendance[k] = rec; d.attMeta = d.attMeta || {};
        // Only absent or late students keep their minutes and notes.
        const meta = { ...(d.attMeta[k] || {}) }; Object.entries(jMeta || {}).forEach(([sid, m]) => { meta[sid] = { ...(meta[sid] || {}), ...m }; });
        Object.keys(meta).forEach(sid => { if (rec[sid] === 'p') delete meta[sid]; else if (rec[sid] === 'a') { delete meta[sid].min; delete meta[sid].guide; } });
        meta._by = cx.actor; meta._at = new Date().toISOString(); d.attMeta[k] = meta;
        const a = Object.values(rec).filter(v => v === 'a').length, g = Object.entries(meta).filter(([sid, m]) => sid[0] !== '_' && rec[sid] === 'l' && m.guide).length;
        jDraft = null; jMeta = null; save(); render();
        toast(`حضور و غیاب ثبت شد.${a ? ` ${fa(a)} غیبت برای معلم راهنما رفت.` : ''}${g ? ` ${fa(g)} تأخیر برای معلم راهنما رفت.` : ''}`); break;
      }
      case 'tt-edit': ttEdit = !ttEdit; ttDraft = {}; ttPick = null; render(); break;
      case 'tt-cancel': ttEdit = false; ttDraft = {}; ttPick = null; render(); break;
      case 'tt-pick': ttPick = { day: +b.dataset.day, b: +b.dataset.b }; render(); document.querySelector('.palette .pchip')?.focus(); break;
      case 'tt-set': if (ttPick) { (ttDraft[ttPick.day] = ttDraft[ttPick.day] || {})[ttPick.b] = b.dataset.v; if (ttPick.b < BL().n - 1) ttPick = { ...ttPick, b: ttPick.b + 1 }; render(); document.querySelector('.palette .pchip[aria-pressed="true"], .palette .pchip')?.focus(); } break;
      case 'tt-save': ttSave(); break;
      case 'grade-new': modal(`<h2>ارزشیابی تازه</h2><label class="field"><span>عنوان</span><input class="input" id="gt" placeholder="مثلاً آزمونک فصل ۲"></label>
          <label class="field"><span>نمرهٔ کل</span><input class="input num" id="gm" type="number" min="1" value="20"></label>
          <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ساختن</button><button class="btn" data-close>انصراف</button></div>`, root => {
          root.querySelector('#save').onclick = () => {
            const t = root.querySelector('#gt').value.trim(); if (!t) return UI.invalid('#gt', 'عنوان را بنویسید.');
            const g = { id: D.uid('g'), cls: gCls, subject: D.TEACHER_SUBJECT, title: t, date: today, max: Math.max(1, +root.querySelector('#gm').value || 20), scores: {} };
            d.grades.push(g); gId = g.id; save(); close(); render(); toast('ارزشیابی ساخته شد؛ نمره‌ها را وارد کنید.');
          };
        }); break;
      case 'hw-new': CL.act['cl-quick'](); break;
      case 'family-new': familyModal(); break;
      case 'fappt-new': famApptModal(); break;
      case 'fappt-done': { org().familyAppts.find(a => a.id === id).done = true; save(); render(); toast('برگزار شد؛ شرح را در «جلسه با خانواده‌ها» بنویسید.'); break; }
      case 'fappt-cancel': org().familyAppts = org().familyAppts.filter(a => a.id !== id); save(); render(); toast('نوبت لغو شد.'); break;
      case 'ureq-new': ureqModal(id); break;
      case 'ureq-ok': {
        const r = UR().find(x => x.id === id), test = C.byId(r.module).price.model === 'per_use';
        Store.request(school().id, r.module, r.qty || 0, `درخواست معلم راهنمای پایهٔ ${GN(r.grade)}${r.note ? ': ' + r.note : ''}`);
        r.ownerReq = Store.state.requests.slice(-1)[0].id; r.status = 'sent'; r.decidedAt = new Date().toISOString(); save(); render();
        toast(test ? 'تأیید شد و برای مالک سامانه فرستاده شد.' : 'تأیید شد و درخواست فعال‌سازی برای مالک سامانه فرستاده شد.'); break;
      }
      case 'ureq-no': {
        const r = UR().find(x => x.id === id);
        UI.ask('رد درخواست', `درخواست «${urLabel(r)}» رد شود؟`, 'رد').then(ok => { if (!ok) return; r.status = 'rejected'; r.decidedAt = new Date().toISOString(); save(); render(); toast('رد شد؛ معلم راهنما در اعلان‌هایش می‌بیند.'); }); break;
      }
      case 'request': {
        const qty = Math.max(1, Math.floor(+($(`[data-qty="${id}"]`)?.value) || 30));
        Store.request(school().id, id, qty, 'از نمای مدرسه');
        render(); toast('درخواست برای مالک سامانه فرستاده شد.'); break;
      }
      default: (TE.act[act] || GM.act[act] || FM.act[act] || EXT.act[act] || CN.act[act] || GR.act[act] || LR.act[act] || CL.act[act] || NZ.act[act] || CM.act[act] || AD.act[act] || PR.act[act] || IB.act[act])?.(b);
    }
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
  window.addEventListener('shell-pref', () => render());
  ['store-changed', 'school-changed'].forEach(ev => window.addEventListener(ev, () => { if (!isOpen()) render(); }));
  render();
  TabIcons.watch($('#view'));
})();
