// Study and online learning.
//   splan    the homework calendar (fixed at the top) and each student's study plan, in one of three methods:
//            «زمان‌بندی دقیق» (time slots per weekday, each with a task to tick), «تایم‌باکسینگ» (N blocks a day, filled in by the student)
//            or «جدول فعالیت‌ها» (what the student did hour by hour each day of the week, in colour, with weekly totals; activity.js).
// The student builds and ticks their own plan on «برنامهٔ مطالعهٔ من» (mystudy, the same page locked to them); what they add
// waits for the guidance teacher's approval (plan.status 'draft' → 'pending' → 'approved' | 'returned', plan.review = { note, at }).
// What the guidance teacher adds is approved at once. The parent sees the same page read-only.
// Each slot is for this week only (item.week = <Saturday>) or lasting; a lasting slot can be skipped in single weeks (item.skip).
const Learning = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { data, save, student, className, render, empty } = ctx;
  const d = () => data();
  const today = J.todayIso();
  const ro = () => ctx.readOnly();
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const wday = iso => (new Date(iso + 'T12:00:00').getDay() + 1) % 7;
  const MAX_FILE = 500 * 1024;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const state = { month: null, day: today, sid: '', date: today, sub: '' };
  const subjectsFor = () => ctx.role() === 'teacher' ? [D.TEACHER_SUBJECT] : d().termSubjects;
  const readFile = file => new Promise((res, rej) => {
    if (file.size > MAX_FILE) { rej(new Error('size')); return; }
    const r = new FileReader(); r.onload = () => res({ name: file.name, size: file.size, data: r.result }); r.onerror = rej; r.readAsDataURL(file);
  });
  const fileLink = f => f ? `<a href="${esc(f.data)}" download="${esc(f.name)}" class="btn sm">دانلود ${esc(f.name)}</a>` : '';

  /* ---------------- homework calendar ---------------- */
  // Everything due: the homework list and the assignments and quizzes of the class pages (classroom.js).
  function dues() {
    const x = d(), out = [];
    (x.homework || []).forEach(h => out.push({ id: h.id, date: h.due, cls: h.cls, subject: h.subject, title: h.title, src: 'hw' }));
    return out.concat(Classroom.dues(x));
  }
  function homeworkCalendar() {
    const t = J.isoToJ(today);
    if (!state.month) state.month = { jy: t.jy, jm: t.jm };
    const { jy, jm } = state.month, len = J.monthLength(jy, jm), first = wday(J.jToIso(jy, jm, 1));
    const all = dues(), byDay = {};
    all.forEach(x => { (byDay[x.date] = byDay[x.date] || []).push(x); });
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let day = 1; day <= len; day++) {
      const iso = J.jToIso(jy, jm, day), n = (byDay[iso] || []).length;
      cells += `<button class="hw-day ${iso === state.day ? 'sel' : ''} ${iso === today ? 'today' : ''}" data-act="hwc-day" data-id="${iso}" aria-label="${esc(J.format(iso))}${n ? `، ${fa(n)} تکلیف` : ''}">
        <span>${fa(day)}</span>${n ? `<i>${fa(n)}</i>` : ''}</button>`;
    }
    const list = (byDay[state.day] || []);
    return `<section class="card hw-cal" aria-label="تقویم اجرای درسی"><div class="card-head"><h2 style="margin:0">تقویم اجرای درسی و تکالیف</h2>
        ${ro() ? '' : '<button class="btn sm primary" data-act="hwc-new">+ ثبت تکلیف</button>'}</div>
      <div class="hw-wrap"><div><div class="jcal-head"><button type="button" data-act="hwc-month" data-id="-1" aria-label="ماه قبل">‹</button><b>${J.MONTHS[jm - 1]} ${digits(jy)}</b>
          <button type="button" data-act="hwc-month" data-id="1" aria-label="ماه بعد">›</button></div>
        <div class="hw-grid">${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => `<span class="wd">${w}</span>`).join('')}${cells}</div></div>
        <div class="hw-list"><h3>${esc(J.format(state.day))}</h3>${list.length ? list.map(x => `<div class="hw-item"><b>${esc(x.title)}</b>
          <span class="muted small">${esc(x.subject)}${x.cls ? ` · ${esc(className(x.cls))}` : ''} · ${x.src === 'online' ? 'کلاس‌ها' : 'ثبت‌شده'}</span>
          ${x.src === 'hw' && !ro() ? `<button class="btn sm danger" data-act="hwc-del" data-id="${x.id}">حذف</button>` : ''}</div>`).join('') : empty('برای این روز تکلیفی نیست.')}</div></div>
      <p class="muted small">بعداً یکی از دانش‌آموزان «مسئول ثبت تکلیف» می‌شود؛ فعلاً معلم راهنما ثبت می‌کند.</p></section>`;
  }
  function homeworkModal() {
    modal(`<h2>ثبت تکلیف</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>کلاس</span><select class="input" id="h-c">${d().classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}<option value="">همهٔ کلاس‌ها</option></select></label>
      <label class="field"><span>درس</span><select class="input" id="h-s">${d().termSubjects.map(s => `<option>${esc(s)}</option>`).join('')}</select></label></div>
      <label class="field"><span>تکلیف</span><input class="input" id="h-t" placeholder="مثلاً تمرین‌های صفحهٔ ۴۲"></label>
      <div class="field"><span>روز تحویل</span>${J.field('h-d', state.day)}</div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#h-t')) return UI.invalid('#h-t', 'تکلیف را بنویسید.');
        const x = d(); x.homework = x.homework || [];
        x.homework.push({ id: D.uid('w'), cls: v(root, '#h-c') || null, subject: v(root, '#h-s'), title: v(root, '#h-t'), due: v(root, '#h-d'), by: ctx.actor() });
        state.day = v(root, '#h-d'); done('تکلیف ثبت شد.');
      };
    });
  }

  /* ---------------- study plan ---------------- */
  const plan = sid => (d().studyPlans = d().studyPlans || {})[sid] || null;
  const planW = sid => { const x = d(); x.studyPlans = x.studyPlans || {}; return (x.studyPlans[sid] = x.studyPlans[sid] || { method: 'schedule', schedule: {}, blocks: 4, log: {} }); };
  const METHODS = [['schedule', 'زمان‌بندی دقیق', 'blue'], ['timebox', 'تایم‌باکسینگ', 'violet'], ['activity', 'جدول فعالیت‌ها', 'ok']];
  const methodOf = k => METHODS.find(m => m[0] === k) || METHODS[0];
  const logFor = (p, date) => (p.log[date] = p.log[date] || { done: {}, boxes: [] });
  const fam = () => ['student', 'parent'].includes(ctx.role()), isStudent = () => ctx.role() === 'student';
  const liveIn = (i, ws) => i.week ? i.week === ws : !(i.skip || []).includes(ws);
  const itemsOn = (p, date) => (p.schedule[wday(date)] || []).filter(i => liveIn(i, D.weekStart(date))).sort((a, b) => a.from.localeCompare(b.from));
  const ST = { draft: ['هنوز فرستاده نشده', 'grey'], pending: ['در انتظار تأیید معلم راهنما', 'warn'], approved: ['تأیید معلم راهنما', 'ok'], returned: ['برگشت داده شد', 'bad'] };
  // A student's change makes the plan a draft again; the guidance teacher's change is approved as it is.
  const touched = p => { if (isStudent()) p.status = 'draft'; };
  // Today's study for the family home: the slots and the plan's state.
  function studyToday(sid) { const p = plan(sid); if (!p) return null; return { status: p.status || 'approved', review: p.review, items: p.method === 'schedule' ? itemsOn(p, today) : [], done: logFor(p, today).done, method: p.method }; }
  // Share of planned items ticked on a day, or null when nothing was planned.
  function rate(p, date) {
    // Activity table: hours of study against three hours a day.
    if (p.method === 'activity') { const m = ActivityLog.minutesOf(p, date, 'study'); return p.acts?.[date]?.length ? Math.min(1, m / 180) : null; }
    if (p.method === 'schedule') { const items = itemsOn(p, date); if (!items.length) return null; const l = p.log[date]; return items.filter(i => l?.done[i.id]).length / items.length; }
    const boxes = p.log[date]?.boxes || []; return p.blocks ? boxes.filter(b => b?.done).length / p.blocks : null;
  }
  // The guidance teacher's queue: plans students sent for approval.
  function pendingCard() {
    if (fam() || ro()) return '';
    const list = d().students.filter(s => plan(s.id)?.status === 'pending');
    if (!list.length) return '';
    return `<section class="card sp-queue"><div class="card-head"><h2 style="margin:0">برنامه‌های در انتظار تأیید</h2><span class="muted small">دانش‌آموز ساخته و برای شما فرستاده</span></div>
      <ul class="sp-q">${list.map(s => `<li><b>${esc(s.name)}</b><span class="muted small">${esc(className(s.cls))}${plan(s.id).sentAt ? ` · ${esc(J.format(plan(s.id).sentAt.slice(0, 10), false))}` : ''}</span>
        <div class="row"><button class="btn sm" data-act="sp-see" data-id="${s.id}">دیدن برنامه</button><button class="btn sm primary" data-act="sp-ok" data-id="${s.id}">تأیید</button><button class="btn sm" data-act="sp-back" data-id="${s.id}">برگرداندن با یادداشت</button></div></li>`).join('')}</ul></section>`;
  }
  // The plan's state, with what the student or the guidance teacher can do about it.
  function statusBar(sid, p) {
    if (!p || p.method !== 'schedule') return '';
    const st = p.status || 'approved', [l, t] = ST[st];
    const note = st === 'returned' && p.review?.note ? `<p class="sp-note"><b>یادداشت معلم راهنما:</b> ${esc(p.review.note)}</p>` : '';
    const btns = isStudent() ? (['draft', 'returned'].includes(st) ? '<button class="btn sm primary" data-act="sp-send">فرستادن برای معلم راهنما</button>' : '')
      : !fam() && !ro() && st === 'pending' ? `<button class="btn sm primary" data-act="sp-ok" data-id="${sid}">تأیید</button><button class="btn sm" data-act="sp-back" data-id="${sid}">برگرداندن با یادداشت</button>` : '';
    const help = isStudent() ? { draft: 'بازه‌ها را بسازید و بعد برای معلم راهنما بفرستید.', pending: 'معلم راهنما برنامه را می‌بیند و تأیید می‌کند.', approved: 'هر تغییر تازه دوباره به تأیید معلم راهنما می‌رسد.', returned: 'برنامه را با یادداشت معلم راهنما درست کنید و دوباره بفرستید.' }[st] : '';
    return `<div class="card sp-status st-${st}"><div class="row"><span class="tag ${t}">${l}</span>${help ? `<span class="small muted">${help}</span>` : ''}${btns ? `<span class="row sp-st-btns">${btns}</span>` : ''}</div>${note}</div>`;
  }
  // The subject teachers' suggested study for the week (classroom.js), with how much of it the plan holds and the student
  // has ticked. «چیدن در برنامه» opens a new slot on the next suggested day, already filled with the subject and the task.
  const minsOf = i => { const [a, b] = [i.from, i.to].map(t => { const [h, m] = t.split(':'); return +h * 60 + +m; }); return Math.max(0, b - a); };
  function adviceUse(p, a) {
    const ws = D.weekStart(state.date); let plan = 0, did = 0;
    if (p?.method === 'schedule') for (let k = 0; k < 7; k++) { const dt = D.shift(k, ws); itemsOn(p, dt).filter(i => i.subject === a.sub).forEach(i => { plan += minsOf(i); if (p.log[dt]?.done[i.id]) did += minsOf(i); }); }
    return { plan, did };
  }
  function adviceCard(sid, p) {
    const s = student(sid); if (!s) return '';
    const list = D.adviceFor(d(), s.cls, state.date); if (!list.length) return '';
    const ws = D.weekStart(state.date), sched = p?.method === 'schedule';
    return `<section class="card sp-advice" aria-labelledby="sa-h"><div class="card-head"><h2 id="sa-h" style="margin:0">مطالعهٔ پیشنهادی دبیرها</h2><span class="muted small">هفتهٔ ${esc(J.format(ws, false))} تا ${esc(J.format(D.shift(6, ws), false))}</span></div>
      <ul class="sa-list">${list.map(a => { const u = adviceUse(p, a), pct = Math.min(100, Math.round(u.did / a.mins * 100)), left = Math.max(0, a.mins - u.plan);
        return `<li><div class="sa-l"><b>${esc(a.sub)}</b><span class="muted small">${esc(a.by || '')}${a.once ? ' · فقط این هفته' : ''}</span>
            <span><b class="num">${fa(a.mins)}</b> دقیقه در هفته · ${a.days.map(i => esc(WEEK[i])).join('، ')}</span>${a.topic ? `<span class="small">${esc(a.topic)}</span>` : ''}</div>
          ${sched ? `<div class="sa-p"><div class="sa-bar" role="progressbar" aria-label="مطالعهٔ ${esc(a.sub)}" aria-valuemin="0" aria-valuemax="${a.mins}" aria-valuenow="${Math.min(a.mins, u.did)}"><i style="width:${pct}%"></i></div>
            <span class="small muted">${fa(u.did)} از ${fa(a.mins)} دقیقه انجام شد${left ? ` · ${fa(left)} دقیقه هنوز در برنامه نیست` : ' · همه در برنامه است'}</span></div>` : ''}
          ${sched && left && !ro() && !fam() || sched && left && isStudent() ? `<button class="btn sm primary" data-act="sp-advice" data-id="${esc(a.id)}">چیدن در برنامه</button>` : ''}</li>`; }).join('')}</ul>
      ${p && !sched ? '<p class="muted small" style="margin:6px 0 0">با روش «زمان‌بندی دقیق» این پیشنهادها با یک دکمه در برنامه می‌نشیند.</p>' : ''}</section>`;
  }
  // A slot for a suggestion: on the first suggested day from today (or this week's first) without that subject yet.
  function adviceSlot(id) {
    const s = student(state.sid), a = D.adviceFor(d(), s?.cls, state.date).find(x => x.id === id); if (!a) return;
    const p = planW(state.sid), ws = D.weekStart(state.date), dates = a.days.map(i => D.shift(i, ws));
    const free = dt => !itemsOn(p, dt).some(i => i.subject === a.sub);
    state.date = dates.find(dt => dt >= today && free(dt)) || dates.find(free) || dates[0];
    const per = Math.max(15, Math.min(180, Math.round(Math.max(0, a.mins - adviceUse(p, a).plan) / Math.max(1, dates.filter(free).length || 1) / 5) * 5));
    const end = 16 * 60 + per, pad = n => String(n).padStart(2, '0');
    render(); slotModal(null, { from: '16:00', to: `${pad(Math.min(23, Math.floor(end / 60)))}:${pad(end % 60)}`, subject: a.sub, task: a.topic || `مطالعهٔ ${a.sub}` });
  }
  function splan() {
    const x = d();
    if (fam()) state.sid = ctx.sid();
    if (!x.students.some(s => s.id === state.sid)) state.sid = x.students[0]?.id || '';
    const sid = state.sid, p = plan(sid), date = state.date;
    const head = `<div class="card"><div class="row">${fam() ? `<b>${esc(student(sid)?.name || '')}</b>` : `<label class="small muted" for="sp-st">دانش‌آموز</label><select class="input" id="sp-st" style="min-width:200px">${ctx.studentOptions(sid)}</select>`}
        <div class="field" style="margin:0;min-width:180px">${J.field('sp-date', date, 'روز')}</div>
        ${p ? `<span class="tag ${methodOf(p.method)[2]}">${methodOf(p.method)[1]}</span>` : ''}</div></div>`;
    const top = (fam() ? '' : pendingCard() + homeworkCalendar()) + head + adviceCard(sid, p);
    if (!p) return top + `<div class="card empty-state"><p class="muted">${isStudent() ? 'هنوز برنامهٔ مطالعه نساخته‌اید. ساعت‌های مطالعه‌تان را خودتان بچینید؛ معلم راهنما می‌بیند و تأیید می‌کند.' : fam() ? 'هنوز برنامهٔ مطالعه‌ای ساخته نشده.' : `برای ${esc(student(sid)?.name || '')} هنوز روش مطالعه تعیین نشده.`}</p>
      ${ro() ? '' : isStudent() ? '<div class="row" style="justify-content:center"><button class="btn primary" data-act="sp-method" data-id="schedule">ساختن برنامهٔ مطالعه (ساعت به ساعت)</button></div>' : '<div class="row" style="justify-content:center"><button class="btn primary" data-act="sp-method" data-id="schedule">زمان‌بندی دقیق (ساعت به ساعت)</button><button class="btn" data-act="sp-method" data-id="timebox">تایم‌باکسینگ (بلوک‌های درسی)</button><button class="btn" data-act="sp-method" data-id="activity">جدول فعالیت‌های روزانه</button></div>'}</div>`;
    const week = [...Array(7)].map((_, i) => D.shift(i - 6, date));
    const trend = `<div class="trend7">${week.map(dt => { const r = rate(p, dt); return `<div title="${esc(J.format(dt))}"><div class="tb"><i style="height:${r == null ? 0 : Math.round(r * 100)}%"></i></div><span>${esc(WEEK[wday(dt)].slice(0, 1))}</span></div>`; }).join('')}</div>`;
    let body;
    if (p.method === 'activity') body = ActivityLog.week(p, date, ro());
    else if (p.method === 'schedule') {
      const items = itemsOn(p, date), l = logFor(p, date);
      body = `<div class="card"><div class="card-head"><div><h2 style="margin:0">برنامهٔ ${esc(WEEK[wday(date)])} ـ زمان‌بندی دقیق</h2><div class="muted small">هر بازه یک کار مشخص؛ ${isStudent() ? 'انجام هر کدام را تیک بزنید و برای تغییر «ویرایش» را بزنید.' : 'دانش‌آموز انجام آن را تیک می‌زند.'}</div></div>
          ${ro() ? '' : `<div class="row"><button class="btn sm primary" data-act="sp-slot">+ بازهٔ تازه</button><button class="btn sm" data-act="sp-copy">کپی برای همهٔ روزها</button></div>`}</div>
        ${items.length ? items.map(i => `<div class="slot ${l.done[i.id] ? 'done' : ''}"><label class="act-line"><input type="checkbox" data-sp-done="${i.id}" ${l.done[i.id] ? 'checked' : ''} ${ro() ? 'disabled' : ''}>
            <b class="num">${digits(i.from)} تا ${digits(i.to)}</b>${i.subject ? `<span class="tag blue">${esc(i.subject)}</span>` : ''}<span>${esc(i.task)}</span>${i.week ? '<span class="tag amber">فقط این هفته</span>' : ''}${i.by === 'student' && !i.ok ? '<span class="tag warn">تأییدنشده</span>' : ''}</label>
            ${ro() ? '' : `<button class="btn sm" data-act="sp-slot-edit" data-id="${i.id}" aria-label="ویرایش بازهٔ ${digits(i.from)} تا ${digits(i.to)}">ویرایش</button>`}</div>`).join('')
          : empty('برای این روز بازه‌ای تعریف نشده.')}</div>`;
    } else {
      const l = logFor(p, date);
      body = `<div class="card"><div class="card-head"><div><h2 style="margin:0">بلوک‌های درسی ${esc(J.format(date))}</h2><div class="muted small">زمان ثابتی ندارد؛ دانش‌آموز ${fa(p.blocks)} بلوک را با درس و کار دلخواه پر می‌کند.</div></div>
          ${ro() ? '' : `<label class="row small">تعداد بلوک در روز <input class="input num" type="number" min="1" max="12" id="sp-blocks" value="${p.blocks}" style="width:70px"></label>`}</div>
        <div class="boxes">${[...Array(p.blocks)].map((_, i) => { const b = l.boxes[i] || {}; return `<div class="box ${b.done ? 'done' : ''}"><span class="bnum">${fa(i + 1)}</span>
          <select class="input" data-box-sub="${i}" aria-label="درس بلوک ${fa(i + 1)}" ${ro() ? 'disabled' : ''}><option value="">درس…</option>${d().termSubjects.map(su => `<option ${b.subject === su ? 'selected' : ''}>${esc(su)}</option>`).join('')}</select>
          <input class="input" data-box="${i}" value="${esc(b.text || '')}" placeholder="کار این بلوک" aria-label="کار بلوک ${fa(i + 1)}" ${ro() ? 'disabled' : ''}>
          <label class="small"><input type="checkbox" data-box-done="${i}" ${b.done ? 'checked' : ''} ${ro() ? 'disabled' : ''}> انجام شد</label></div>`; }).join('')}</div></div>`;
    }
    return top + statusBar(sid, p) + `<div class="card"><div class="card-head"><h2 style="margin:0">هفت روز گذشته</h2>
        ${ro() || isStudent() ? '' : `<div class="seg" role="radiogroup" aria-label="روش ثبت مطالعه">${METHODS.map(([k, l]) => `<button role="radio" aria-checked="${p.method === k}" data-act="sp-method" data-id="${k}">${l}</button>`).join('')}</div>`}</div>
      ${trend}${p.method === 'activity' ? '<p class="muted small" style="margin:6px 0 0">ستون هر روز: ساعت‌های «مشغول درس» نسبت به سه ساعت.</p>' : ''}</div>` + body;
  }
  // Add or edit one slot. Every change asks once: this week only, or from this week on.
  function slotModal(item, preset) {
    const p = planW(state.sid), w = wday(state.date), ws = D.weekStart(state.date), x = item || { from: '15:30', to: '16:30', subject: '', task: '', ...preset };
    const wk = `${J.format(ws, false)} تا ${J.format(D.shift(6, ws), false)}`;
    modal(`<h2>${item ? 'ویرایش بازه' : 'بازهٔ تازه'} ـ ${esc(WEEK[w])}</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>از ساعت</span><input class="input num" type="time" id="sl-f" value="${esc(x.from)}"></label><label class="field"><span>تا ساعت</span><input class="input num" type="time" id="sl-t" value="${esc(x.to)}"></label></div>
      <label class="field"><span>درس</span><select class="input" id="sl-s"><option value="">انتخاب درس…</option>${d().termSubjects.map(su => `<option ${su === x.subject ? 'selected' : ''}>${esc(su)}</option>`).join('')}</select></label>
      <label class="field"><span>کار این بازه</span><input class="input" id="sl-k" value="${esc(x.task)}" placeholder="مثلاً حل تمرین‌های جبر"></label>
      <fieldset class="scope"><legend class="small muted">این ${item ? 'تغییر' : 'بازه'} برای کی است؟</legend>
        <label class="scope-opt"><input type="radio" name="scope" value="week" ${x.week ? 'checked' : ''}><span><b>فقط همین هفته</b><span class="muted small">هفتهٔ ${esc(wk)}؛ هفتهٔ بعد برنامهٔ همیشگی برمی‌گردد.</span></span></label>
        <label class="scope-opt"><input type="radio" name="scope" value="on" ${x.week ? '' : 'checked'}><span><b>از این هفته به بعد</b><span class="muted small">هر ${esc(WEEK[w])}، از همین هفته.</span></span></label></fieldset>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">${item ? 'ذخیره' : 'افزودن'}</button>${item ? '<button class="btn danger" id="del">حذف</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      const scope = () => root.querySelector('input[name=scope]:checked').value, list = () => (p.schedule[w] = p.schedule[w] || []);
      const stamp = { by: isStudent() ? 'student' : 'counselor', ok: !isStudent() };
      root.querySelector('#save').onclick = () => {
        const f = v(root, '#sl-f'), t = v(root, '#sl-t');
        if (!v(root, '#sl-s')) return UI.invalid('#sl-s', 'درس این بازه را انتخاب کنید.');
        if (!v(root, '#sl-k')) return UI.invalid('#sl-k', 'کار این بازه را بنویسید.'); if (!f || !t || f >= t) return UI.invalid('#sl-t', 'پایان بازه باید بعد از شروع باشد.');
        const n = { from: f, to: t, subject: v(root, '#sl-s'), task: v(root, '#sl-k'), ...stamp }, sc = scope();
        const hit = itemsOn(p, state.date).find(o => o !== item && o.from < t && f < o.to);
        if (hit) return UI.invalid('#sl-f', `این ساعت با «${hit.subject} · ${hit.task}» (${digits(hit.from)} تا ${digits(hit.to)}) روی هم می‌افتد.`);
        if (!item) list().push({ id: D.uid('l'), ...n, ...(sc === 'week' ? { week: ws } : {}) });
        else if (item.week) { Object.assign(item, n); if (sc === 'on') delete item.week; }
        else if (sc === 'week') { item.skip = [...new Set([...(item.skip || []), ws])]; list().push({ id: D.uid('l'), ...n, week: ws }); }
        else Object.assign(item, n);
        touched(p); done(item ? 'بازه ذخیره شد.' : 'بازه افزوده شد.');
      };
      root.querySelector('#del')?.addEventListener('click', () => {
        const once = !item.week && scope() === 'week';
        if (once) item.skip = [...new Set([...(item.skip || []), ws])]; else p.schedule[w] = list().filter(i => i !== item);
        touched(p); done(once ? 'این بازه فقط در همین هفته برداشته شد.' : 'بازه حذف شد.');
      });
    });
  }
  function backModal(sid) {
    modal(`<h2>برگرداندن برنامهٔ ${esc(student(sid)?.name || '')}</h2>
      <label class="field"><span>یادداشت برای دانش‌آموز</span><textarea class="input" id="bk-n" rows="3" placeholder="مثلاً ریاضی کم است؛ دو بازهٔ ریاضی در هفته بگذار"></textarea></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">برگرداندن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const n = v(root, '#bk-n'); if (!n) return UI.invalid('#bk-n', 'بنویسید چه چیزی را درست کند.');
        const p = planW(sid); p.status = 'returned'; p.review = { note: n, at: new Date().toISOString() }; done('برنامه با یادداشت برگشت داده شد.');
      };
    });
  }

  /* ---------------- wiring ---------------- */
  const act = {
    'hwc-day': b => { state.day = b.dataset.id; render(); },
    'hwc-month': b => { let { jy, jm } = state.month; jm += +b.dataset.id; if (jm < 1) { jm = 12; jy--; } if (jm > 12) { jm = 1; jy++; } state.month = { jy, jm }; render(); },
    'hwc-new': homeworkModal,
    'hwc-del': b => { const back = UI.drop(d().homework || [], h => h.id === b.dataset.id); save(); render(); UI.undo('تکلیف از تقویم حذف شد.', back, () => { save(); render(); }); },
    'sp-method': b => { const p = planW(state.sid); p.method = b.dataset.id; touched(p); save(); render(); },
    'sp-slot': () => slotModal(null),
    'sp-advice': b => adviceSlot(b.dataset.id),
    'sp-slot-edit': b => { const p = planW(state.sid), it = (p.schedule[wday(state.date)] || []).find(i => i.id === b.dataset.id); if (it) slotModal(it); },
    'sp-send': () => { const p = planW(state.sid); if (!Object.values(p.schedule).flat().length) return toast('اول دست‌کم یک بازه بسازید.'); p.status = 'pending'; p.sentAt = new Date().toISOString(); p.review = null; save(); render(); toast('برنامه برای معلم راهنما فرستاده شد.'); },
    'sp-ok': b => { const p = planW(b.dataset.id); p.status = 'approved'; p.review = { note: '', at: new Date().toISOString() }; Object.values(p.schedule).flat().forEach(i => { i.ok = true; }); save(); render(); toast('برنامه تأیید شد.'); },
    'sp-back': b => backModal(b.dataset.id),
    'sp-see': b => { state.sid = b.dataset.id; render(); document.querySelector('.sp-status')?.scrollIntoView({ block: 'start' }); },
    'ac-new': () => ActivityLog.modal(planW(state.sid), state.date, d().termSubjects, done),
    'ac-edit': b => { const [day, id] = b.dataset.id.split('|'), p = planW(state.sid), item = (p.acts?.[day] || []).find(a => a.id === id); if (item) ActivityLog.modal(p, state.date, d().termSubjects, done, { day, item }); },
    'sp-copy': async () => {
      const p = planW(state.sid), w = wday(state.date), src = p.schedule[w] || [];
      if (!src.length) return toast('اول برای همین روز بازه بسازید.');
      if (!await UI.ask('کپی برنامه', `برنامهٔ ${WEEK[w]} جای برنامهٔ همهٔ روزهای دیگر بنشیند؟`, 'کپی کن')) return;
      WEEK.forEach((_, i) => { if (i !== w) p.schedule[i] = src.filter(s => !s.week).map(s => ({ ...s, id: D.uid('l'), skip: [] })); }); touched(p);
      save(); render(); toast('برای همهٔ روزها کپی شد.');
    },
  };
  function bind() {
    const st = document.getElementById('sp-st'); if (st) st.onchange = () => { state.sid = st.value; render(); };
    const dt = document.getElementById('sp-date'); if (dt) dt.onchange = () => { state.date = dt.value; render(); };
    document.querySelectorAll('[data-sp-done]').forEach(c => c.onchange = () => { logFor(planW(state.sid), state.date).done[c.dataset.spDone] = c.checked; save(); render(); });
    const bl = document.getElementById('sp-blocks'); if (bl) bl.onchange = () => { planW(state.sid).blocks = Math.max(1, Math.min(12, +bl.value || 4)); save(); render(); };
    document.querySelectorAll('[data-box]').forEach(i => i.onchange = () => { const l = logFor(planW(state.sid), state.date); l.boxes[+i.dataset.box] = { ...(l.boxes[+i.dataset.box] || {}), text: i.value }; save(); });
    document.querySelectorAll('[data-box-sub]').forEach(i => i.onchange = () => { const l = logFor(planW(state.sid), state.date); l.boxes[+i.dataset.boxSub] = { ...(l.boxes[+i.dataset.boxSub] || {}), subject: i.value }; save(); });
    document.querySelectorAll('[data-box-done]').forEach(c => c.onchange = () => { const l = logFor(planW(state.sid), state.date), k = +c.dataset.boxDone; l.boxes[k] = { ...(l.boxes[k] || {}), done: c.checked }; save(); render(); });
  }
  // The guidance teacher hears about plans waiting for approval.
  const feed = () => ctx.actor() !== 'counselor' || ctx.readOnly() ? [] : d().students.filter(s => plan(s.id)?.status === 'pending')
    .map(s => ({ key: `spq:${s.id}:${plan(s.id).sentAt}`, type: 'reminder', title: `برنامهٔ مطالعهٔ ${s.name}`, text: 'برای تأیید شما فرستاده شده', at: plan(s.id).sentAt, href: ctx.hrefOf('splan'), unread: true }));
  return { viewOf: { splan: 'splan', mystudy: 'splan' }, pages: { splan, mystudy: splan }, act, bind, dues, studyToday, ST, feed };
};
