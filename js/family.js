// The student's and the parent's pages (roles 'student' and 'parent' in NAV). Both see one student only: ctx.sid().
//   Student: امروز من، کلاس‌ها (classroom.js in the student's own view)، برنامهٔ هفتگی، نمره‌ها، کارنامه، حضور، اطلاعیه‌ها، انضباط.
//   Parent:  the same about their child, read-only, plus تکالیف و آزمون‌ها (status of each) and جلسه‌ها با مدرسه.
// Never shown here: other students, counselling notes, observations, test results, staff letters and chat.
// Notices reach them by audience keys 'student' / 'student:<grade>' and 'parent' / 'parent:<grade>' (comms.js).
const Family = ctx => {
  const { esc, fa, fdate, weekday, modal, close, toast } = UI;
  const D = SchoolData, J = JDate, icon = Shell.icon;
  const { data, org, save, school, student, className, hrefOf, kpi, empty, render } = ctx;
  const today = D.today();
  const BL = () => D.bellsOf(data().grade);  // this grade's bells
  const me = () => student(ctx.sid());
  const isParent = () => ctx.role() === 'parent';
  const GN = g => D.GRADE_NAME[g];
  const dg = t => String(t ?? '').replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);  // clock times such as «07:30»
  const subjIcon = su => TabIcons.forLabel(su) || icon('book');
  const TONES = ['blue', 'violet', 'teal', 'amber', 'rose'];
  const toneOf = su => TONES[[...String(su)].reduce((h, c) => h + c.charCodeAt(0), 0) % TONES.length];
  const ATT = { p: ['حاضر', 'ok'], a: ['غایب', 'bad'], l: ['تأخیر', 'warn'] };
  const card = (title, body, more = '') => `<section class="card fm-card"><div class="card-head"><h2>${esc(title)}</h2>${more}</div>${body}</section>`;
  const locked = id => !ctx.on(id);

  /* ---------------- data about this one student ---------------- */
  function attendance(s) {
    const x = data(), rows = Object.entries(x.attendance).filter(([k, v]) => k.startsWith(s.cls + '|') && v[s.id]).map(([k, v]) => ({ date: k.split('|')[1], v: v[s.id] }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { rows, todayV: rows.find(r => r.date === today)?.v || '', a: rows.filter(r => r.v === 'a').length, l: rows.filter(r => r.v === 'l').length, days: rows.length };
  }
  const myKeys = () => { const g = data().grade ?? ctx.grade?.(), r = ctx.role(); return [r, `${r}:${g}`]; };
  const readKey = () => `${ctx.role()}:${ctx.sid()}`;
  const notices = () => (org().notices || []).filter(n => (n.to || []).some(k => myKeys().includes(k))).sort((a, b) => b.date.localeCompare(a.date));
  const unread = () => locked('core.notices') || !me() ? 0 : notices().filter(n => !(n.read || []).includes(readKey())).length;
  function meetings(s) {
    const x = data(), g = x.grade, out = [];
    (org().familyAppts || []).filter(a => +a.grade === +g && a.sid === s.id).forEach(a => out.push({ date: a.date, time: a.time, host: 'مدیر مدرسه', topic: a.topic, who: a.who, done: a.done }));
    // The principal's meetings with this family (principal.js), and requests the school has given a time to.
    (org().fmeet || []).filter(m => +m.grade === +g && m.sid === s.id).forEach(m => out.push({ date: m.record?.date || m.date, time: m.time, host: 'مدیر مدرسه', topic: m.topic, done: m.status === 'done' }));
    myReqs(s).filter(r => r.status === 'set').forEach(r => out.push({ date: r.date, time: r.time, host: staffOf(r.to).role, topic: r.topic, done: r.date < today }));
    x.appts.filter(a => a.sid === s.id && a.type === 'khanevade').forEach(a => out.push({ date: a.date, time: BL().times[a.bell - 1], host: `معلم راهنمای پایهٔ ${GN(g)}${D.guideOf(school().id, g) ? ` (${D.guideOf(school().id, g)})` : ''}`, topic: a.topic || 'جلسه با خانواده', done: a.done }));
    return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
  }
  // A parent asks one of four people for a counselling meeting; the request reaches that person's «ارتباطات» desk
  // (comms.js), where they give a day and time or answer. Stored in org().meetReq:
  //   { id, grade, sid, to: 'principal' | 'deputy' | 'nazem' | 'counselor:<grade>', topic, text, at, status: 'new' | 'set' | 'no', date, time, reply }
  const REQ_TO = () => [['principal', 'مدیر مدرسه', 'building'], ['deputy', 'معاون آموزشی', 'book'], [`counselor:${data().grade}`, 'معلم راهنما', 'users'], ['nazem', 'ناظم', 'shield']];
  const REQ_TOPICS = ['وضعیت درسی', 'رفتار و انضباط', 'حضور و غیاب', 'برنامه‌ریزی و مطالعه', 'انتخاب رشته', 'موضوع دیگر'];
  function staffOf(to) {
    const [r, g] = to.split(':'), role = (REQ_TO().find(x => x[0].split(':')[0] === r) || [, 'مدرسه'])[1];
    const us = Auth.users(school().id).filter(u => u.active !== false && !u.owner);
    const u = r === 'counselor' ? us.find(x => x.roles.includes('counselor') && +x.grade === +g) : us.find(x => x.roles[0] === r);
    const name = u?.name ? [u.salute, u.name].filter(Boolean).join(' ') : r === 'counselor' ? D.guideOf(school().id, +g) || '' : '';
    return { role, name };
  }
  const myReqs = s => (org().meetReq || []).filter(r => r.sid === s.id && +r.grade === +data().grade);
  function requestBox(s) {
    const list = myReqs(s).slice().sort((a, b) => b.at.localeCompare(a.at));
    const st = r => r.status === 'set' ? `<span class="tag ok">وقت داده شد: ${esc(weekday(r.date))} ${esc(fdate(r.date))}${r.time ? ` · ساعت ${dg(r.time)}` : ''}</span>`
      : r.status === 'no' ? '<span class="tag grey">پاسخ داده شد</span>' : '<span class="tag warn">در انتظار پاسخ</span>';
    return card('درخواست جلسهٔ مشاوره', `<p class="muted small" style="margin:0 0 10px">با چه کسی می‌خواهید جلسه داشته باشید؟ درخواست به خود ایشان می‌رسد و وقت جلسه را همین‌جا می‌بینید.</p>
      <div class="mr-to">${REQ_TO().map(([id, l, ic]) => { const p = staffOf(id);
        return `<button type="button" class="mr-who" data-act="mr-new" data-to="${id}"><span class="tile tone-teal">${icon(ic)}</span><span><b>${esc(l)}</b><span class="muted small">${esc(p.name || 'درخواست وقت')}</span></span></button>`; }).join('')}</div>
      ${list.length ? `<h3 class="mr-h">درخواست‌های من</h3><ul class="fm-list">${list.map(r => `<li><span class="tile tone-violet">${icon('chat')}</span><span class="fm-l"><b>${esc(r.topic)} · با ${esc(staffOf(r.to).role)}</b>
        <span class="muted small">فرستاده‌شده ${esc(fdate(r.at.slice(0, 10)))}${r.reply ? ` · پاسخ: ${esc(r.reply)}` : ''}</span></span>${st(r)}</li>`).join('')}</ul>` : ''}`);
  }
  function newRequest(to) {
    const s = me(), p = staffOf(to);
    modal(`<h2>درخواست جلسه با ${esc(p.role)}</h2>${p.name ? `<p class="muted" style="margin-top:-6px">${esc(p.name)}</p>` : ''}
      <label class="field"><span>موضوع</span><select class="input" id="mr-t">${REQ_TOPICS.map(t => `<option>${t}</option>`).join('')}</select></label>
      <label class="field"><span>توضیح کوتاه</span><textarea class="input" id="mr-x" rows="3" placeholder="دربارهٔ چه چیزی می‌خواهید صحبت کنید؟"></textarea></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="mr-send">فرستادن درخواست</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#mr-send').onclick = () => {
        const o = org(); o.meetReq = o.meetReq || [];
        o.meetReq.push({ id: D.uid('mr'), grade: data().grade, sid: s.id, to, topic: root.querySelector('#mr-t').value, text: root.querySelector('#mr-x').value.trim(),
          at: new Date().toISOString(), status: 'new', date: '', time: '', reply: '' });
        save(); close(); render(); toast(`درخواست برای ${p.name || p.role} فرستاده شد.`);
      };
    });
  }
  const work = s => locked('acad.lms') ? [] : ctx.CL.workOf(s);
  const openWork = s => work(s).filter(w => !w.done && (!w.at || w.at.slice(0, 10) >= today));
  const lateWork = s => work(s).filter(w => !w.done && w.at && w.at.slice(0, 10) < today);
  const dueTxt = at => at ? `${weekday(at.slice(0, 10))} ${fdate(at.slice(0, 10))}${at.length > 10 ? ` · ساعت ${dg(at.slice(11, 16))}` : ''}` : 'بی‌مهلت';
  const todayClasses = s => { const di = D.dayIndex(today); if (di === null) return []; const ws = D.weekStart(today);
    return Array.from({ length: BL().n }, (_, b) => ({ b: b + 1, sub: D.clsCell(data(), s.cls, di, b, ws), who: D.clsTeacher(data(), s.cls, di, b, ws) })).filter(x => x.sub); };

  /* ---------------- the person card on top of every page ---------------- */
  const who = s => `<div class="fm-who"><span class="sphoto tone-teal" aria-hidden="true">${D.photoOf(s) ? `<img src="${esc(D.photoOf(s))}" alt="" loading="lazy">` : esc(D.initials(s))}</span>
    <div><b>${esc(s.name)}</b><div class="muted small">${isParent() ? 'فرزند شما · ' : ''}${esc(className(s.cls))} · پایهٔ ${esc(GN(data().grade))}</div></div></div>`;

  /* ---------------- home ---------------- */
  function home() {
    const s = me(); if (!s) return card('حساب', empty('این حساب به دانش‌آموزی وصل نشده. از مدیر مدرسه بخواهید آن را درست کند.'));
    const at = attendance(s), ow = openWork(s), late = lateWork(s), avg = ctx.GR.family.avg(s.id), disc = Disc.standing(data(), s.id);
    const attV = `<span class="v-txt">${locked('acad.journal') ? '—' : at.todayV ? ATT[at.todayV][0] : D.dayIndex(today) === null ? 'تعطیل' : 'ثبت نشده'}</span>`;
    const kpis = `<div class="grid g4 fm-kpis">
      ${kpi('حضور امروز', attV, at.days ? `${fa(at.a)} غیبت و ${fa(at.l)} تأخیر تا امروز` : '', hrefOf('myAtt'), at.todayV === 'a' ? 'rose' : 'teal')}
      ${kpi(isParent() ? 'تکالیف و آزمون‌های باز' : 'کارهای پیش رو', fa(ow.length), late.length ? `${fa(late.length)} کار مهلت‌گذشته` : 'کار عقب‌افتاده‌ای نیست', hrefOf(isParent() ? 'homework' : 'online'), late.length ? 'amber' : 'blue')}
      ${kpi('میانگین نمره‌ها', avg == null ? '—' : `${fa(avg)} <span class="v-unit">از ۲۰</span>`, 'همهٔ درس‌ها', hrefOf('myMarks'), 'violet')}
      ${locked('guid.discipline') ? '' : kpi('امتیاز انضباطی', Disc.sign(disc.total), disc.step ? 'مدرسه اقدامی برداشته؛ ببینید' : 'بدون اقدام انضباطی', hrefOf('myDisc'), disc.step ? 'rose' : 'teal')}</div>`;
    const tc = todayClasses(s);
    // The class going on now is marked; finished ones are dimmed.
    const now = new Date().toTimeString().slice(0, 5), when = b => now >= BL().ends[b - 1] ? 'past' : now >= BL().times[b - 1] ? 'now' : '';
    const classes = card('کلاس‌های امروز', tc.length ? `<ul class="fm-list fm-day">${tc.map(x => `<li class="${when(x.b)}"><span class="tile tone-${toneOf(x.sub)}">${subjIcon(x.sub)}</span>
        <span class="fm-l"><b>${esc(x.sub)}</b><span class="muted small">زنگ ${fa(x.b)}، ساعت ${dg(BL().times[x.b - 1])} تا ${dg(BL().ends[x.b - 1])}${x.who ? `، ${esc(x.who)}` : ''}</span></span>${when(x.b) === 'now' ? '<span class="tag blue">الان</span>' : ''}</li>`).join('')}</ul>`
      : empty(D.dayIndex(today) === null ? 'امروز مدرسه تعطیل است.' : 'امروز کلاسی در برنامه نیست.'), `<a class="small" href="${hrefOf('week')}">برنامهٔ هفته</a>`);
    const todo = card(isParent() ? 'تکالیف و آزمون‌های پیش رو' : 'کارهای پیش رو', locked('acad.lms') ? empty('کلاس‌های مجازی برای این مدرسه فعال نیست.') : [...late, ...ow].length
      ? `<ul class="fm-list">${[...late, ...ow].slice(0, 5).map(w => workLi(w)).join('')}</ul>` : empty('کار بازی نیست.'), `<a class="small" href="${hrefOf(isParent() ? 'homework' : 'online')}">همه</a>`);
    const recent = ctx.GR.family.recent(s.id, 5);
    const marks = card('آخرین نمره‌ها', locked('acad.grades') ? empty('نمره‌ها برای این مدرسه فعال نیست.') : recent.length ? `<ul class="fm-list">${recent.map(i => { const p = Math.round(i.scores[s.id] / i.max * 100);
        return `<li><span class="tile tone-${toneOf(i.subject)}">${subjIcon(i.subject)}</span><span class="fm-l"><b>${esc(i.subject)}</b><span class="muted small">${esc(i.title)} · ${esc(fdate(i.date))}</span></span>
          <span class="fm-score ${p < 60 ? 'low' : ''}"><b class="num">${fa(i.scores[s.id])}</b><span class="muted small">از ${fa(i.max)}</span></span></li>`; }).join('')}</ul>` : empty('هنوز نمره‌ای ثبت نشده.'), `<a class="small" href="${hrefOf('myMarks')}">همه</a>`);
    const ns = notices().slice(0, 3);
    const news = locked('core.notices') ? '' : card('اطلاعیه‌های تازه', ns.length ? ns.map(noticeItem).join('') : empty('اطلاعیه‌ای نیست.'), `<a class="small" href="${hrefOf('myNotices')}">همه</a>`);
    const up = isParent() ? meetings(s).filter(m => !m.done && m.date >= today) : [];
    const meet = isParent() && up.length ? card('جلسه‌های پیش رو با مدرسه', `<ul class="fm-list">${up.slice(0, 3).map(meetLi).join('')}</ul>`, `<a class="small" href="${hrefOf('meetings')}">همه</a>`) : '';
    const st = locked('acad.study') ? null : ctx.LR.studyToday(s.id), [sl, stone] = st ? ctx.LR.ST[st.status] || ctx.LR.ST.approved : [];
    const study = locked('acad.study') ? '' : card(isParent() ? 'برنامهٔ مطالعهٔ امروز' : 'مطالعهٔ امروز من', `${st ? `<p style="margin:0 0 8px"><span class="tag ${stone}">${esc(sl)}</span>${st.status === 'returned' && st.review?.note ? ` <span class="small">${esc(st.review.note)}</span>` : ''}</p>` : ''}
      ${st && st.items.length ? `<ul class="fm-list">${st.items.map(i => `<li class="${st.done[i.id] ? 'past' : ''}"><span class="tile tone-${toneOf(i.subject)}">${subjIcon(i.subject)}</span><span class="fm-l"><b>${esc(i.subject)}</b><span class="muted small">${dg(i.from)} تا ${dg(i.to)} · ${esc(i.task)}</span></span>${st.done[i.id] ? '<span class="tag ok">انجام شد</span>' : ''}</li>`).join('')}</ul>`
        : empty(!st ? (isParent() ? 'هنوز برنامهٔ مطالعه‌ای ساخته نشده.' : 'هنوز برنامهٔ مطالعه نساخته‌اید؛ ساعت‌های مطالعه‌تان را خودتان بچینید.') : 'برای امروز بازهٔ مطالعه‌ای نیست.')}`,
      `<a class="small" href="${hrefOf('mystudy')}">${isParent() ? 'همه' : st ? 'برنامهٔ من' : 'ساختن برنامه'}</a>`);
    const lv = isParent() || locked('acad.lms') || typeof LiveClass === 'undefined' ? [] : LiveClass.onAirFor(data(), s);
    const liveNow = lv.map(v => `<div class="card fm-live"><span class="tile tone-rose" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg></span>
      <div class="fm-l"><b><span class="fm-live-dot"></span>کلاس آنلاین ${esc(v.sub)} در حال برگزاری است</b><span class="muted small">${esc(v.title)}${v.startedAt ? ` · از ساعت ${dg(new Date(v.startedAt).toTimeString().slice(0, 5))}` : ''}</span></div>
      <button type="button" class="btn primary" data-act="fm-live" data-sub="${esc(v.sub)}" data-id="${esc(v.id)}">ورود سریع</button></div>`).join('');
    return who(s) + liveNow + kpis + meet + `<div class="grid g2">${classes}${todo}</div><div class="grid g2">${study}${marks}</div><div class="grid g2">${Behavior.familyCard(data(), s.id, isParent())}${news}</div>`;
  }
  function workLi(w) {
    const late = !w.done && w.at && w.at.slice(0, 10) < today;
    const st = w.grade ? `<span class="tag ok">نمره: ${esc(w.grade.text)}</span>` : w.done ? '<span class="tag ok">انجام شد</span>' : late ? '<span class="tag bad">مهلت گذشته</span>' : '<span class="tag warn">انجام نشده</span>';
    const title = isParent() ? `<b>${esc(w.it.title)}</b>` : `<button class="fm-link" data-act="fm-open" data-sub="${esc(w.sub)}" data-id="${esc(w.it.id)}">${esc(w.it.title)}</button>`;
    return `<li><span class="tile tone-${toneOf(w.sub)}">${subjIcon(w.sub)}</span><span class="fm-l">${title}<span class="muted small">${esc(w.sub)} · ${w.it.type === 'quiz' ? 'آزمون' : 'تکلیف'} · ${esc(dueTxt(w.at))}</span></span>${st}</li>`;
  }
  const meetLi = m => `<li><span class="tile tone-rose">${icon('users')}</span><span class="fm-l"><b>${esc(m.topic)}</b><span class="muted small">${esc(weekday(m.date))} ${esc(fdate(m.date))}${m.time ? ` · ساعت ${dg(m.time)}` : ''} · با ${esc(m.host)}</span></span>
    ${m.done ? '<span class="tag grey">برگزار شد</span>' : m.date === today ? '<span class="tag warn">امروز</span>' : ''}</li>`;
  function noticeItem(n, full) {
    const fresh = !(n.read || []).includes(readKey());
    return `<article class="fm-notice ${fresh ? 'new' : ''}"><div class="spread"><b>${esc(n.title)}</b><span class="muted small">${esc(fdate(n.date))}</span></div>
      <p class="${full ? '' : 'fm-clip'}">${esc(n.body)}</p><span class="muted small">از ${esc(ctx.nameOf(n.by))}${fresh ? ' · <span class="tag blue">تازه</span>' : ''}</span></article>`;
  }

  /* ---------------- pages ---------------- */
  const page = fn => () => { const s = me(); return s ? who(s) + fn(s) : card('حساب', empty('این حساب به دانش‌آموزی وصل نشده.')); };
  const week = page(s => {
    const x = data(), di = D.dayIndex(today), ws = D.weekStart(today);
    const head = `<tr><th></th>${BL().withBreak(Array.from({ length: BL().n }, (_, b) => `<th>زنگ ${fa(b + 1)}<div class="small muted">${dg(BL().times[b])}</div></th>`), `<th class="tt-break"><span class="sr-only">زنگ تفریح و ناهار از </span>${dg(BL().brk.from)}</th>`).join('')}</tr>`;
    const rows = D.DAYS.map((dn, day) => `<tr class="${day === di ? 'today' : ''}"><th scope="row">${dn}${day === di ? ' <span class="tag">امروز</span>' : ''}</th>${BL().withBreak(Array.from({ length: BL().n }, (_, b) => {
      const su = D.clsCell(x, s.cls, day, b, ws), who = D.clsTeacher(x, s.cls, day, b, ws); return su ? `<td class="fm-tt tone-${toneOf(su)}"><span class="fm-tt-i">${subjIcon(su)}</span>${esc(su)}${who ? `<span class="fm-tt-t">${esc(who)}</span>` : ''}</td>` : '<td class="muted">—</td>'; }), '<td class="tt-break"></td>').join('')}</tr>`).join('');
    return `<div class="card"><h2>برنامهٔ هفتگی ${esc(className(s.cls))}</h2><div class="table-wrap"><table class="tt fm-week no-cards">${head}${rows}</table></div></div>`;
  });
  const myMarks = page(s => '<p class="muted small fm-hint">هر نمودار یک نوع نمره است: محور عمودی درصد نمره و هر نقطه یک نمره به ترتیب تاریخ. جدول همهٔ نمره‌ها زیر هر درس است.</p>' + ctx.GR.family.marks(s.id));
  let cardId = '';
  const myCard = page(s => {
    const list = ctx.GR.family.cards();
    if (!list.length) return `<div class="card empty-state">${empty('هنوز کارنامه‌ای منتشر نشده. وقتی مدرسه کارنامه را منتشر کند، همین‌جا دیده و دانلود می‌شود.')}</div>`;
    if (!list.some(c => c.id === cardId)) cardId = list[list.length - 1].id;
    const c = list.find(k => k.id === cardId);
    return `<div class="card"><div class="row">${list.length > 1 ? `<label class="small muted" for="fm-card">کارنامه</label><select class="input" id="fm-card">${list.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.title)} ${esc(k.year)}</option>`).join('')}</select>` : `<b>${esc(c.title)} ${esc(c.year)}</b>`}
      <span class="tag ok">منتشر شده${c.publishedAt ? ` · ${esc(fdate(c.publishedAt))}` : ''}</span><button class="btn primary" data-act="fm-card-pdf" style="margin-inline-start:auto">دانلود PDF</button></div></div>
      <div class="rc-wrap">${ctx.GR.family.sheet(c, s.id)}</div>`;
  });
  const myAtt = page(s => {
    const at = attendance(s), off = at.rows.filter(r => r.v !== 'p');
    return `<div class="grid g3">${kpi('روزهای ثبت‌شده', fa(at.days), '', '', 'teal')}${kpi('غیبت', fa(at.a), '', '', at.a ? 'rose' : 'teal')}${kpi('تأخیر', fa(at.l), '', '', at.l ? 'amber' : 'teal')}</div>
      <div class="card"><h2>غیبت‌ها و تأخیرها</h2>${off.length ? `<div class="table-wrap"><table><tr><th>روز</th><th>تاریخ</th><th>وضعیت</th></tr>${off.map(r => `<tr><td>${esc(weekday(r.date))}</td><td class="num">${esc(fdate(r.date))}</td><td><span class="tag ${ATT[r.v][1]}">${ATT[r.v][0]}</span></td></tr>`).join('')}</table></div>`
        : empty(at.days ? 'در همهٔ روزهای ثبت‌شده حاضر بوده است.' : 'هنوز حضور و غیابی ثبت نشده.')}
        ${isParent() ? '<p class="muted small" style="margin:10px 0 0">اگر غیبتی موجه بوده، با معلم راهنمای پایه یا ناظم در میان بگذارید.</p>' : ''}</div>`;
  });
  const homework = page(s => {
    const all = work(s), late = all.filter(w => !w.done && w.at && w.at.slice(0, 10) < today), open = all.filter(w => !w.done && !late.includes(w)), done = all.filter(w => w.done);
    const block = (t, l, msg) => card(`${t} (${fa(l.length)})`, l.length ? `<ul class="fm-list">${l.map(workLi).join('')}</ul>` : empty(msg));
    return (late.length ? block('مهلت گذشته', late, '') : '') + block('در جریان', open, 'کار بازی نیست.') + block('انجام‌شده', done.slice().reverse(), 'هنوز کاری انجام نشده.');
  });
  const myDisc = page(s => {
    const x = data(), st = Disc.standing(x, s.id);
    const steps = `<details class="card fm-steps"><summary><b>آیین‌نامهٔ انضباطی مدرسه</b> <span class="muted small">هر مرحله با رسیدن جمع امتیاز به آن عدد</span></summary>
      <ol>${Disc.STEPS.map(([t, txt]) => `<li class="${st.step && st.step[0] === t ? 'on' : ''}"><span class="tag ${st.step && st.step[0] === t ? 'bad' : 'grey'} num">${Disc.sign(t)}</span> ${esc(txt)}</li>`).join('')}</ol>
      <p class="muted small">اگر بیش از ۱۵ روز مدرسه بین دو مورد فاصله باشد، هر روز اضافه نیم امتیاز مثبت دارد تا امتیازهای منفی جبران شود. امتیاز جدیت (تا +۱۰) هم تا وقتی جمع از −۹۰ پایین‌تر نرفته حساب می‌شود.</p></details>`;
    return `<div class="card">${Disc.summary(x, s.id)}</div>${steps}<div class="rc-wrap">${ctx.CN.discSheet(s.id)}</div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="fm-disc-pdf">دانلود PDF کارنامهٔ انضباطی</button></div>`;
  });
  const myNotices = page(() => {
    const list = notices();
    // Opening the page counts as reading what is on it.
    const fresh = list.filter(n => !(n.read || []).includes(readKey()));
    const out = list.length ? list.map(n => noticeItem(n, true)).join('') : `<div class="card">${empty('اطلاعیه‌ای برای شما نیست.')}</div>`;
    if (fresh.length) { fresh.forEach(n => { n.read = n.read || []; n.read.push(readKey()); }); save(); }
    return `<div class="fm-notices">${out}</div>`;
  });
  const meetingsPage = page(s => {
    const all = meetings(s), up = all.filter(m => !m.done && m.date >= today), past = all.filter(m => !up.includes(m)).reverse();
    return (isParent() ? requestBox(s) : '') + card('جلسه‌های پیش رو', up.length ? `<ul class="fm-list">${up.map(meetLi).join('')}</ul>` : empty('جلسه‌ای در پیش نیست.'))
      + card('جلسه‌های گذشته', past.length ? `<ul class="fm-list">${past.map(meetLi).join('')}</ul>` : empty('هنوز جلسه‌ای نبوده.'))
      + (isParent() ? '' : '<p class="muted small">برای گرفتن وقت جلسه با معلم راهنما یا مدیر، با دفتر مدرسه تماس بگیرید.</p>');
  });

  const act = {
    'mr-new': b => newRequest(b.dataset.to),
    'fm-live': b => ctx.CL.joinLive(b.dataset.sub, b.dataset.id),
    'fm-open': b => { ctx.CL.openItem(b.dataset.sub, b.dataset.id); location.hash = hrefOf('online'); },
    'fm-card-pdf': () => { const el = document.getElementById('card-sheet'); if (el) UI.pdf(el.cloneNode(true), `کارنامه-${me().name}`); },
    'fm-disc-pdf': () => { const el = document.getElementById('rc-sheet'); if (el) UI.pdf(el.cloneNode(true), `کارنامه-انضباطی-${me().name}`); },
  };
  function bind() {
    const c = document.getElementById('fm-card'); if (c) c.onchange = () => { cardId = c.value; render(); };
  }
  return { pages: { me: home, child: home, week, myMarks, myCard, myAtt, homework, myDisc, myNotices, meetings: meetingsPage }, act, bind, unread };
};
