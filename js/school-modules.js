// Second batch of school-view pages: calendar, notices, discipline, report cards, teacher evaluation,
// enrolment, career guidance, study tracker, encrypted vault and exam builder.
// school-app.js calls SchoolModules(ctx) and merges the pages, routes and button actions it returns.
const SchoolModules = ctx => {
  const { esc, fa, fdate, weekday, modal, close, toast } = UI;
  const { data, org, save, actor, readOnly, today, student, className, sLink, sAvatar, studentOptions, kpi, empty, render, WHO } = ctx;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const o = () => org();
  const GN = g => ctx.D.GRADE_NAME[g];
  const d = () => data();
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const f1 = n => fa(n.toFixed(1));
  const mark = n => n == null ? '—' : fa(n);
  const tabs = (cur, list, act) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
  const classSelect = (id, sel) => `<label class="sr-only" for="${id}">کلاس</label><select class="input" id="${id}">${d().classes.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const state = { evTab: 'up', rcTab: 'cards', rcCls: '', exTab: 'exams', crCls: '', stCls: '', vaultLocked: false };

  /* ---------------- calendar ---------------- */
  const EV_TYPES = ['جلسه', 'آزمون', 'اردو', 'فرهنگی', 'کارگاه', 'ورزشی', 'تعطیل'];
  // The school's events calendar, one month at a time: a small calendar with a red dot on each event day,
  // and beside it the month's events as slim rows. Approving colleagues' proposals happens in «ارتباطات».
  const WD7 = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const satIdx = iso => (new Date(iso + 'T12:00:00').getDay() + 1) % 7;
  function calendar() {
    const t = JDate.isoToJ(today);
    state.calM = state.calM || { jy: t.jy, jm: t.jm };
    const { jy, jm } = state.calM, len = JDate.monthLength(jy, jm), first = JDate.jToIso(jy, jm, 1), last = JDate.jToIso(jy, jm, len);
    const seen = e => e.status === 'approved' || e.by === actor();
    const evs = o().events.filter(e => seen(e) && e.date >= first && e.date <= last).sort((p1, p2) => (p1.date + (p1.start || '')).localeCompare(p2.date + (p2.start || '')));
    const days = new Set(evs.map(e => e.date));
    if (state.calDay && !days.has(state.calDay)) state.calDay = '';
    let cells = '';
    for (let i = 0; i < satIdx(first); i++) cells += '<span></span>';
    for (let d = 1; d <= len; d++) {
      const iso = JDate.jToIso(jy, jm, d), has = days.has(iso), lbl = `${fa(d)} ${JDate.MONTHS[jm - 1]}${has ? `، ${fa(evs.filter(e => e.date === iso).length)} رویداد` : ''}`;
      cells += has ? `<button type="button" class="mc-d has ${iso === today ? 'today' : ''} ${iso === state.calDay ? 'sel' : ''}" data-act="cal-day" data-id="${iso}" aria-pressed="${iso === state.calDay}" aria-label="${lbl}">${fa(d)}<i aria-hidden="true"></i></button>`
        : `<span class="mc-d ${iso === today ? 'today' : ''}">${fa(d)}</span>`;
    }
    const shown = state.calDay ? evs.filter(e => e.date === state.calDay) : evs;
    const row = e => `<li class="ev-row"><div class="ev-when"><b>${esc(weekday(e.date))}</b><span>${esc(fdate(e.date, { day: 'numeric', month: 'long' }))}</span></div>
      <div class="ev-what"><b>${esc(e.title)}</b><span class="muted small">${e.start ? esc(digits(e.start) + (e.end ? ' تا ' + digits(e.end) : '')) : 'تمام روز'}</span></div>
      <span class="tag grey">${esc(e.type)}</span>${e.status === 'pending' ? '<span class="tag warn">در انتظار تأیید</span>' : e.status === 'rejected' ? '<span class="tag bad">رد شد</span>' : ''}</li>`;
    return `<div class="spread" style="margin-bottom:12px"><div class="mpick" role="group" aria-label="ماه">
        <button type="button" class="btn sm" data-act="cal-m" data-id="-1" aria-label="ماه قبل">›</button><b>${JDate.MONTHS[jm - 1]} ${digits(jy)}</b><button type="button" class="btn sm" data-act="cal-m" data-id="1" aria-label="ماه بعد">‹</button>
        ${jy !== t.jy || jm !== t.jm ? '<button type="button" class="btn sm" data-act="cal-m" data-id="0">این ماه</button>' : ''}</div>
        <button class="btn primary" data-act="ev-new">+ رویداد تازه</button></div>
      <div class="cal-wrap"><div class="card mini-cal"><div class="mc-grid">${WD7.map(w => `<span class="mc-w">${w}</span>`).join('')}${cells}</div>
          <p class="muted small" style="margin:8px 0 0">نقطهٔ قرمز یعنی آن روز رویداد دارد؛ روی روز بزنید.</p></div>
        <div class="card ev-card">${state.calDay ? `<div class="spread" style="margin-bottom:6px"><b class="small">${esc(fdate(state.calDay))}</b><button class="btn sm" data-act="cal-day" data-id="${state.calDay}">همهٔ ماه</button></div>` : ''}
          ${shown.length ? `<ul class="ev-list">${shown.map(row).join('')}</ul>` : empty(`در ${JDate.MONTHS[jm - 1]} رویدادی نیست.`)}</div></div>`;
  }
  // Colleagues' proposed events, for the principal to approve; shown in «ارتباطات».
  const pendingEvents = () => o().events.filter(e => e.status === 'pending');
  function eventApprovals() {
    const pend = pendingEvents().sort((p1, p2) => p1.date.localeCompare(p2.date));
    return `<p class="muted small" style="margin:0 0 10px">رویدادهایی که همکاران پیشنهاد داده‌اند؛ پس از تأیید در تقویم اجرایی می‌آیند.</p>
      <div class="card">${pend.length ? `<ul class="ev-list">${pend.map(e => `<li class="ev-row"><div class="ev-when"><b>${esc(weekday(e.date))}</b><span>${esc(fdate(e.date, { day: 'numeric', month: 'long' }))}</span></div>
        <div class="ev-what"><b>${esc(e.title)}</b><span class="muted small">پیشنهاد ${esc(WHO[e.by] || e.by)} · ${e.start ? esc(digits(e.start) + (e.end ? ' تا ' + digits(e.end) : '')) : 'تمام روز'}</span></div>
        <span class="tag grey">${esc(e.type)}</span><div class="row"><button class="btn sm primary" data-act="ev-ok" data-id="${e.id}">تأیید</button><button class="btn sm danger" data-act="ev-no" data-id="${e.id}">رد</button></div></li>`).join('')}</ul>` : empty('رویدادی در انتظار تأیید نیست.')}</div>`;
  }
  function eventModal() {
    modal(`<h2>رویداد تازه</h2><label class="field"><span>عنوان</span><input class="input" id="e-t"></label>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>نوع</span><select class="input" id="e-y">${EV_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
      <label class="field"><span>روز</span>${JDate.field('e-d', today)}</label>
      <label class="field"><span>از ساعت</span><input class="input num" id="e-s" type="time" value="08:00"></label>
      <label class="field"><span>تا ساعت</span><input class="input num" id="e-e" type="time" value="10:00"></label></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">${actor() === 'principal' ? 'ثبت در تقویم' : 'فرستادن برای تأیید'}</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#e-t')) return UI.invalid('#e-t', 'عنوان را بنویسید.');
        o().events.push({ id: ctx.uid('e'), title: v(root, '#e-t'), type: v(root, '#e-y'), date: v(root, '#e-d'), start: v(root, '#e-s'), end: v(root, '#e-e'), status: actor() === 'principal' ? 'approved' : 'pending', by: actor() });
        done(actor() === 'principal' ? 'رویداد در تقویم ثبت شد.' : 'برای تأیید مدیر فرستاده شد.');
      };
    });
  }

  /* ---------------- notices ---------------- */
  const AUD = { teacher: 'معلمان', counselor: 'معلم راهنما', principal: 'مدیر' };
  function notices() {
    const list = o().notices.filter(n => actor() === 'principal' || n.to.includes(actor())).sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="spread" style="margin-bottom:12px"><span class="muted">${fa(list.filter(n => !n.read.includes(actor())).length)} خوانده‌نشده</span>
      ${actor() === 'principal' ? '<button class="btn primary" data-act="nt-new">+ اطلاعیهٔ تازه</button>' : ''}</div>
      ${list.map(n => {
        const unread = !n.read.includes(actor()) && n.by !== actor();
        return `<div class="card" style="${unread ? 'border-inline-start:4px solid var(--brand-fill)' : ''}"><div class="spread"><h2 style="margin:0">${esc(n.title)}</h2><span class="muted small">${esc(fdate(n.date))}</span></div>
          <p style="margin:8px 0">${esc(n.body)}</p>
          <div class="spread small"><span class="muted">برای: ${n.to.map(t => esc(AUD[t])).join('، ')}${actor() === 'principal' ? ` · خوانده‌شده: ${n.read.length ? n.read.map(t => esc(AUD[t])).join('، ') : 'هنوز کسی'}` : ''}</span>
          ${unread ? `<button class="btn sm" data-act="nt-read" data-id="${n.id}">خواندم</button>` : ''}</div></div>`;
      }).join('') || `<div class="card">${empty('اطلاعیه‌ای نیست.')}</div>`}`;
  }
  function noticeModal() {
    modal(`<h2>اطلاعیهٔ تازه</h2><label class="field"><span>عنوان</span><input class="input" id="n-t"></label>
      <label class="field"><span>متن</span><textarea class="input" id="n-b" rows="4"></textarea></label>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">برای چه کسانی؟</legend><div class="row">
        ${['teacher', 'counselor'].map(k => `<label class="chip"><input type="checkbox" value="${k}" checked>${AUD[k]}</label>`).join('')}</div></fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">انتشار</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const to = [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
        if (!v(root, '#n-t') || !v(root, '#n-b')) return UI.invalid(['#n-t', '#n-b'], 'عنوان و متن را بنویسید.');
        if (!to.length) return UI.invalid(root.querySelector('fieldset'), 'دست‌کم یک گروه را انتخاب کنید.');
        o().notices.push({ id: ctx.uid('t'), title: v(root, '#n-t'), body: v(root, '#n-b'), to, date: today, by: actor(), read: [] });
        done('اطلاعیه منتشر شد.');
      };
    });
  }

  /* ---------------- discipline ---------------- */
  const points = sid => Disc.standing(d(), sid).total;
  function discipline() {
    const cats = d().discCats, recs = d().discipline.slice().sort((a, b) => b.date.localeCompare(a.date));
    const ranked = d().students.map(s => ({ s, p: points(s.id) })).filter(x => x.p !== 0).sort((a, b) => b.p - a.p);
    const pt = n => `<span class="tag ${n > 0 ? 'ok' : n < 0 ? 'bad' : 'grey'} num">${Disc.sign(n)}</span>`;
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">امتیاز هر مورد طبق فهرست مدرسه؛ جمع امتیاز با قاعده‌های امتیاز مثبت مدرسه حساب می‌شود.</span>
        ${readOnly() ? '' : '<div class="row"><button class="btn" data-act="dc-cat">دسته‌ها</button><button class="btn primary" data-act="dc-new">+ ثبت مورد</button></div>'}</div>
      <div class="grid g2"><div class="card"><h2>بیشترین امتیاز</h2>${ranked.filter(x => x.p > 0).slice(0, 5).map(x => `<div class="spread" style="padding:5px 0">${sAvatar(x.s)}${pt(x.p)}</div>`).join('') || empty('هنوز امتیاز مثبتی نیست.')}</div>
        <div class="card"><h2>نیازمند توجه</h2>${ranked.filter(x => x.p < 0).reverse().slice(0, 5).map(x => `<div class="spread" style="padding:5px 0">${sAvatar(x.s)}${pt(x.p)}</div>`).join('') || empty('موردی نیست.')}</div></div>
      <div class="card"><h2>آخرین موارد</h2><div class="table-wrap"><table><tr><th>روز</th><th>دانش‌آموز</th><th>مورد</th><th>امتیاز</th></tr>
        ${recs.map(x => { const c = Disc.catOf(d(), x); return `<tr><td class="small">${esc(fdate(x.date))}</td><td>${sLink(x.sid)}</td><td>${esc(c.name)}${x.note ? `<div class="muted small">${esc(x.note)}</div>` : ''}</td><td>${pt(Disc.recPts(d(), x))}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function discModal() {
    const cats = d().discCats;
    modal(`<h2>ثبت مورد انضباطی</h2>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">دانش‌آموز یا دانش‌آموزان</legend>
      <div class="chips">${d().students.map(s => `<label class="chip"><input type="checkbox" value="${s.id}">${esc(s.name)}</label>`).join('')}</div></fieldset>
      <div class="grid g2" style="gap:0 12px">${Disc.picker('x-c', cats, actor() !== 'teacher')}
      <label class="field"><span>روز</span>${JDate.field('x-d', today)}</label></div>
      <label class="field"><span>توضیح</span><input class="input" id="x-n"></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      Disc.wire(root, 'x-c', cats);
      root.querySelector('#save').onclick = () => {
        const sids = [...root.querySelectorAll('.chips input:checked')].map(i => i.value);
        if (!sids.length) return UI.invalid(root.querySelector('.chips'), 'دست‌کم یک دانش‌آموز را انتخاب کنید.');
        const pick = Disc.read(root, 'x-c', cats); if (!pick) return;
        sids.forEach(sid => d().discipline.push({ id: ctx.uid('x'), sid, ...pick, date: v(root, '#x-d'), note: v(root, '#x-n'), by: actor(), ...(actor() === 'teacher' ? { subject: ctx.D.TEACHER_SUBJECT } : {}) }));
        done(`${fa(sids.length)} مورد ثبت شد.`);
      };
    });
  }
  function catModal() {
    modal(`<h2>دسته‌های انضباطی</h2><div class="table-wrap"><table>${d().discCats.map(c => `<tr><td>${esc(c.name)}</td><td class="num">${Disc.ptsText(c)}</td></tr>`).join('')}</table></div>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>دستهٔ تازه</span><input class="input" id="k-n"></label>
      <label class="field"><span>امتیاز (منفی برای تخلف)</span><input class="input num" id="k-p" type="number" min="-20" max="10" value="-1"></label></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">افزودن</button><button class="btn" data-close>بستن</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#k-n')) return UI.invalid('#k-n', 'نام دسته را بنویسید.');
        d().discCats.push({ id: ctx.uid('d'), name: v(root, '#k-n'), pts: Math.max(-20, Math.min(10, Math.round(+v(root, '#k-p') || 0))) });
        save(); catModal(); toast('دسته افزوده شد.');
      };
    });
  }

  /* ---------------- report cards ---------------- */
  const absences = sid => Object.values(d().attendance).filter(x => x[sid] === 'a').length;
  function card(sid) {
    const t = d().term[sid] || {}, subs = d().termSubjects;
    const marks = subs.map(s => t[s]).filter(x => x != null), a = marks.length ? avg(marks) : null;
    const mates = d().students.filter(s => s.cls === student(sid).cls).map(s => ({ id: s.id, m: subs.map(k => d().term[s.id]?.[k]).filter(x => x != null) }))
      .filter(m => m.m.length).map(m => ({ id: m.id, a: avg(m.m) })).sort((x, y) => y.a - x.a);
    return { t, subs, a, rank: a == null ? null : mates.findIndex(m => m.id === sid) + 1, of: mates.length };
  }
  // Objections to report-card marks; the principal answers them in «کارنامه‌ها › اعتراض‌ها».
  const openAppeals = () => d().objections.filter(o => o.status === 'open').length;
  function appeals() {
    const objs = d().objections;
    return objs.length ? objs.map(o => `
      <div class="card"><div class="spread"><b>${sLink(o.sid)} · ${esc(o.subject)}</b><span>${o.status === 'open' ? '<span class="tag warn">باز</span>' : o.status === 'accepted' ? '<span class="tag ok">پذیرفته شد</span>' : '<span class="tag bad">رد شد</span>'}</span></div>
      <p style="margin:8px 0">${esc(o.text)}</p><div class="muted small">${esc(fdate(o.date))}</div>
      ${o.status === 'open' && !readOnly() ? `<label class="field"><span>پاسخ</span><input class="input" data-reply="${o.id}"></label>
        <div class="row" style="margin-top:10px"><button class="btn sm primary" data-act="ob-ok" data-id="${o.id}">پذیرفتن</button><button class="btn sm danger" data-act="ob-no" data-id="${o.id}">رد</button></div>`
        : o.reply ? `<div class="next" style="margin-top:8px;background:var(--bg);border-radius:8px;padding:6px 10px">پاسخ: ${esc(o.reply)}</div>` : ''}</div>`).join('') : `<div class="card">${empty('اعتراضی نیست.')}</div>`;
  }
  function cardHtml(sid) {
    const s = student(sid), c = card(sid);
    return `<div style="font-family:inherit"><div class="spread"><h2 style="margin:0">کارنامهٔ نوبت اول</h2><span class="muted small">${esc(ctx.school().name)}</span></div>
      <p style="margin:6px 0 12px"><b>${esc(s.name)}</b> · ${esc(className(s.cls))} · ردیف ${fa(s.row)}</p>
      <div class="table-wrap"><table>${c.subs.map(k => `<tr><td>${esc(k)}</td><td class="num"><b>${mark(c.t[k])}</b></td></tr>`).join('')}
      <tr><td><b>معدل</b></td><td class="num"><b>${c.a == null ? '—' : fa(c.a.toFixed(2))}</b></td></tr></table></div>
      <dl class="kv"><dt>رتبه در کلاس</dt><dd>${c.rank ? `${fa(c.rank)} از ${fa(c.of)}` : '—'}</dd><dt>غیبت</dt><dd>${fa(absences(sid))} روز</dd><dt>امتیاز انضباطی</dt><dd>${fa(points(sid))}</dd></dl></div>`;
  }

  /* ---------------- teacher evaluation ---------------- */
  // To be designed together with the school; the old principal/self rating is set aside.
  function teval() {
    return '<div class="card teval-blank"></div>';
  }
  function tevalOld() {
    const t = o().teachers, ev = o().evals, se = o().selfEvals;
    const mean = o => o ? avg(Object.values(o)) : null;
    return `<p class="note">مدیر هر معلم را در ${fa(o().criteria.length)} شاخص از ۱ تا ۵ ارزیابی می‌کند؛ خودارزیابی معلم کنار آن دیده می‌شود تا تفاوت‌ها گفت‌وگو شود.</p>
      <div class="card" style="margin-top:12px"><div class="table-wrap"><table><tr><th>معلم</th><th>درس</th><th>ارزیابی مدیر</th><th>خودارزیابی</th><th>فاصله</th><th></th></tr>
      ${t.map(x => { const a = mean(ev[x.id]), b = mean(se[x.id]); return `<tr><td>${esc(x.name)}</td><td>${esc(x.subject)}</td>
        <td class="num">${a == null ? '<span class="tag warn">ارزیابی نشده</span>' : f1(a)}</td><td class="num">${b == null ? '—' : f1(b)}</td>
        <td class="num">${a == null || b == null ? '—' : `<span class="tag ${Math.abs(a - b) >= 1 ? 'warn' : 'grey'}">${f1(Math.abs(a - b))}</span>`}</td>
        <td><button class="btn sm ${a == null ? 'primary' : ''}" data-act="te-open" data-id="${x.id}">${a == null ? 'ارزیابی' : 'ویرایش'}</button></td></tr>`; }).join('')}</table></div></div>`;
  }
  function tevalModal(id) {
    const t = o().teachers.find(x => x.id === id), cur = o().evals[id] || {}, self = o().selfEvals[id] || {};
    modal(`<h2>ارزیابی ${esc(t.name)}</h2><p class="muted small">${esc(t.subject)} · عدد کنار هر شاخص، خودارزیابی معلم است.</p>
      <div class="table-wrap"><table>${o().criteria.map((c, i) => `<tr><td>${esc(c)}</td><td class="muted small num">خود: ${fa(self[c] ?? '—')}</td>
        <td><label class="sr-only" for="c${i}">${esc(c)}</label><select class="input" id="c${i}" data-crit="${esc(c)}">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${(cur[c] ?? 3) === n ? 'selected' : ''}>${fa(n)}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        o().evals[id] = Object.fromEntries([...root.querySelectorAll('[data-crit]')].map(s => [s.dataset.crit, +s.value]));
        done('ارزیابی ذخیره شد.');
      };
    });
  }

  /* ---------------- enrolment ---------------- */
  const STAGES = [['new', 'ثبت اولیه'], ['interview', 'مصاحبه'], ['accepted', 'پذیرفته'], ['enrolled', 'ثبت‌نام قطعی']];
  function enroll() {
    const ap = o().applicants, cap = o().capacity, en = o().enrolled;
    return `<div class="grid g3">${ctx.D.gradesOf(ctx.school()).map(g => {
        const n = en[g] || 0, wait = ap.filter(a => +a.grade === g && ['new', 'interview', 'accepted'].includes(a.stage)).length;
        return `<div class="card kpi tone-rose"><div class="l">پایهٔ ${esc(GN(g))}</div><div class="v num">${fa(n)} <span class="small muted">از ${fa(cap[g])}</span></div>
          <div class="bar" style="margin:6px 0"><i style="width:${Math.min(100, n / cap[g] * 100)}%;${n >= cap[g] ? 'background:var(--bad)' : ''}"></i></div><div class="s">${fa(cap[g] - n)} جای خالی · ${fa(wait)} متقاضی در جریان</div></div>`;
      }).join('')}</div>
      <div class="spread" style="margin:16px 0 4px"><h2 style="font-size:16px">متقاضیان</h2><button class="btn primary" data-act="ap-new">+ متقاضی تازه</button></div>
      ${STAGES.map(([k, l], i) => {
        const list = ap.filter(a => a.stage === k);
        return `<div class="group-head"><h2>${esc(l)}</h2><span class="muted small">${fa(list.length)} نفر</span></div><div class="card" style="padding:4px 14px">${list.length ? `<div class="table-wrap"><table>${list.map(a => `
          <tr><td><b>${esc(a.name)}</b><div class="muted small">پایهٔ ${esc(GN(a.grade))} · ${esc(fdate(a.date))}</div></td>
          <td><div class="row">${i < STAGES.length - 1 ? `<button class="btn sm primary" data-act="ap-next" data-id="${a.id}">${esc(STAGES[i + 1][1])} ←</button>` : '<span class="tag ok">دانش‌آموز مدرسه</span>'}
          ${k !== 'enrolled' ? `<button class="btn sm danger" data-act="ap-reject" data-id="${a.id}">رد</button>` : ''}</div></td></tr>`).join('')}</table></div>` : empty('کسی در این مرحله نیست.')}</div>`;
      }).join('')}
      ${ap.some(a => a.stage === 'rejected') ? `<details style="margin-top:14px"><summary class="small" style="cursor:pointer">ردشده‌ها (${fa(ap.filter(a => a.stage === 'rejected').length)})</summary>
        <div class="card" style="margin-top:8px">${ap.filter(a => a.stage === 'rejected').map(a => `<div class="small" style="padding:3px 0">${esc(a.name)} · پایهٔ ${esc(GN(a.grade))}</div>`).join('')}</div></details>` : ''}`;
  }

  /* ---------------- career guidance ---------------- */
  const HL = { R: 'واقع‌گرا', I: 'جستجوگر', A: 'هنری', S: 'اجتماعی', E: 'اقتصادی', C: 'قراردادی' };
  const FIELDS = ['ریاضی و فیزیک', 'علوم تجربی', 'علوم انسانی', 'هنر', 'فنی و حرفه‌ای', 'کاردانش'];
  // A first suggestion from interests and marks; the counsellor and the family decide.
  function suggest(sid) {
    if (!d().tests[sid]) return null;
    const h = Object.fromEntries(d().tests[sid].holland), t = d().term[sid] || {};
    const sc = {
      'ریاضی و فیزیک': h.I * 0.6 + h.R * 0.4 + ((t['ریاضی'] ?? 10) - 10) * 3,
      'علوم تجربی': h.I * 0.7 + h.S * 0.3 + ((t['علوم'] ?? 10) - 10) * 3,
      'علوم انسانی': h.S * 0.5 + h.A * 0.2 + h.E * 0.3 + ((t['ادبیات فارسی'] ?? 10) - 10) * 3,
      'هنر': h.A * 1.1,
      'فنی و حرفه‌ای': h.R * 1.0 + 5,
      'کاردانش': h.C * 0.6 + h.E * 0.5,
    };
    const top = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    const code = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join('');
    return { code, first: top[0][0], second: top[1][0] };
  }
  function career() {
    state.crCls = state.crCls || d().classes[0].id;
    const ss = d().students.filter(s => s.cls === state.crCls), rec = d().career;
    return `<p class="note">پیشنهاد از ترکیب علاقه‌های شغلی (هالند) و نمره‌های نوبت اول ساخته می‌شود و فقط نقطهٔ شروع گفت‌وگوست؛ تصمیم با دانش‌آموز، خانواده و معلم راهنماست.</p>
      <div class="card" style="margin-top:12px"><div class="row">${classSelect('cr-cls', state.crCls)}</div></div>
      <div class="card"><div class="table-wrap"><table><tr><th>دانش‌آموز</th><th>کد هالند</th><th>ریاضی</th><th>علوم</th><th>پیشنهاد</th><th>نظر معلم راهنما</th><th></th></tr>
        ${ss.map(s => { const g = suggest(s.id), r = rec[s.id], t = d().term[s.id] || {}; return `<tr><td>${esc(s.name)}</td>
          <td>${g ? `<span class="tag profile" title="${esc(g.code.split('').map(c => HL[c]).join('، '))}">${esc(g.code)}</span>` : '<span class="muted small">آزمون نداده</span>'}</td><td class="num">${mark(t['ریاضی'])}</td><td class="num">${mark(t['علوم'])}</td>
          <td class="small">${g ? `${esc(g.first)}<div class="muted">بعدی: ${esc(g.second)}</div>` : '<span class="muted">پس از آزمون هالند</span>'}</td>
          <td class="small">${r ? `<b>${esc(r.field)}</b><div class="muted">${esc(r.note)}</div>` : '<span class="muted">—</span>'}</td>
          <td>${actor() === 'counselor' ? `<button class="btn sm" data-act="cr-open" data-id="${s.id}">${r ? 'ویرایش' : 'ثبت نظر'}</button>` : ''}</td></tr>`; }).join('')}</table></div></div>`;
  }
  function careerModal(sid) {
    const g = suggest(sid), r = d().career[sid] || {};
    modal(`<h2>هدایت تحصیلی ${esc(student(sid).name)}</h2><p class="muted small">${g ? `پیشنهاد سامانه: ${esc(g.first)}، سپس ${esc(g.second)} · کد هالند ${esc(g.code)}` : 'هنوز نتیجهٔ آزمون هالند ندارد؛ پیشنهاد خودکاری نیست.'}</p>
      <label class="field"><span>رشتهٔ پیشنهادی معلم راهنما</span><select class="input" id="c-f">${FIELDS.map(f => `<option ${f === (r.field || g?.first) ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>دلیل و توضیح</span><textarea class="input" id="c-n" rows="3">${esc(r.note || '')}</textarea></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { d().career[sid] = { field: v(root, '#c-f'), note: v(root, '#c-n') }; done('نظر ثبت شد.'); };
    });
  }

  /* ---------------- study tracker ---------------- */
  function study() {
    state.stCls = state.stCls || d().classes[0].id;
    const logged = h => h.filter(n => n != null);
    const ss = d().students.filter(s => s.cls === state.stCls).map(s => ({ s, h: d().study[s.id] || Array(7).fill(null) }))
      .map(x => ({ ...x, a: logged(x.h).length ? avg(logged(x.h)) : null }));
    const withData = ss.filter(x => x.a != null), low = withData.filter(x => x.a < 1.5);
    const days = [...Array(7)].map((_, i) => ctx.shift(i - 6, today));
    return `<div class="card"><div class="row">${classSelect('st-cls', state.stCls)}${readOnly() ? '' : '<button class="btn primary" data-act="st-log">+ ثبت ساعت مطالعه</button>'}</div></div>
      <div class="grid g3">${kpi('میانگین روزانهٔ کلاس', withData.length ? f1(avg(withData.map(x => x.a))) + ' <span class="small muted">ساعت</span>' : '—', withData.length ? `${fa(withData.length)} نفر ثبت کرده‌اند` : 'هنوز ساعتی ثبت نشده')}
        ${kpi('کمتر از ۱٫۵ ساعت در روز', fa(low.length), 'نیازمند برنامه‌ریزی')}
        ${kpi('بیشترین میانگین', withData.length ? f1(Math.max(...withData.map(x => x.a))) + ' <span class="small muted">ساعت</span>' : '—')}</div>
      <div class="card"><h2>هفت روز گذشته</h2><div class="table-wrap"><table><tr><th>دانش‌آموز</th>${days.map(x => `<th class="small" style="text-align:center">${esc(weekday(x).replace('‌شنبه', 'ش'))}</th>`).join('')}<th>میانگین</th></tr>
        ${ss.sort((a, b) => (a.a ?? 99) - (b.a ?? 99)).map(x => `<tr><td>${esc(x.s.name)} ${x.a != null && x.a < 1.5 ? '<span class="tag warn">کم</span>' : ''}</td>
          ${x.h.map(n => n == null ? '<td style="text-align:center" class="muted small">—</td>' : `<td style="vertical-align:bottom;text-align:center"><div title="${fa(n)} ساعت" style="margin:auto;width:14px;height:${4 + n * 7}px;border-radius:4px;background:${n < 1 ? 'var(--line)' : 'var(--brand-fill)'}"></div><div class="small muted num">${fa(n)}</div></td>`).join('')}
          <td class="num">${x.a == null ? '<span class="muted small">ثبت نشده</span>' : `<b>${f1(x.a)}</b>`}</td></tr>`).join('')}</table></div>
        <p class="muted small">در سامانهٔ کامل، دانش‌آموز خودش ساعت‌ها را ثبت می‌کند؛ اینجا معلم راهنما هم می‌تواند.</p></div>`;
  }
  function studyModal() {
    const days = [...Array(7)].map((_, i) => ctx.shift(i - 6, today));
    modal(`<h2>ثبت ساعت مطالعه</h2><label class="field"><span>دانش‌آموز</span><select class="input" id="y-s">${studentOptions()}</select></label>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>روز</span><select class="input" id="y-d">${days.map((x, i) => `<option value="${i}" ${i === 6 ? 'selected' : ''}>${esc(weekday(x))} ${esc(fdate(x))}</option>`).join('')}</select></label>
      <label class="field"><span>ساعت</span><input class="input num" id="y-h" type="number" min="0" max="16" step="0.5" value="2"></label></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const sid = v(root, '#y-s'); d().study[sid] = d().study[sid] || Array(7).fill(null);
        d().study[sid][+v(root, '#y-d')] = Math.max(0, Math.min(16, +v(root, '#y-h') || 0));
        done('ساعت مطالعه ثبت شد.');
      };
    });
  }

  /* ---------------- encrypted vault ---------------- */
  function vault() {
    const x = d();
    if (state.vaultLocked) {
      return `<div class="card locked-card">${UI.LOCK.replace('lock', 'lock" style="width:36px;height:36px')}<h2>خزانه قفل است</h2>
        <p class="muted">پرونده‌های محرمانه تا باز کردن دوباره، روی این دستگاه خوانده نمی‌شوند.</p>
        <button class="btn primary" data-act="vt-unlock">باز کردن</button><p class="muted small" style="margin-top:10px">در سامانهٔ واقعی با رمز معلم راهنما باز می‌شود.</p></div>`;
    }
    const rows = [['جلسه‌های مشاوره', x.sessions.length], ['پیگیری‌ها', x.follow.length], ['مشاهده‌ها', x.obs.length], ['نتیجهٔ آزمون‌ها', Object.keys(x.tests).length], ['نظر هدایت تحصیلی', Object.keys(x.career).length]];
    return `<div class="card"><div class="spread"><h2 style="margin:0">رمزنگاری سرتاسری فعال است</h2><span class="tag ok">امن</span></div>
        <p class="muted" style="margin:8px 0 0">این پرونده‌ها پیش از رفتن به سرور، در همین مرورگر رمز می‌شوند. سرور فقط دادهٔ رمزشده را نگه می‌دارد و خودش نمی‌تواند آن را بخواند.</p></div>
      <div class="grid g2"><div class="card"><h2>چه چیزهایی رمزشده‌اند</h2><div class="table-wrap"><table>${rows.map(([l, n]) => `<tr><td>${esc(l)}</td><td class="num">${fa(n)} مورد</td></tr>`).join('')}</table></div></div>
        <div class="card"><h2>جزئیات فنی</h2><dl class="kv"><dt>رمزنگاری</dt><dd>AES-GCM با کلید ۲۵۶ بیتی</dd><dt>کلید هر حساب</dt><dd>از رمز کاربر با PBKDF2 (۳۱۰ هزار دور)</dd>
          <dt>محل کلید</dt><dd>فقط در مرورگر؛ هرگز روی سرور نیست</dd><dt>قفل خودکار</dt><dd>پس از ۲۰ دقیقه بی‌کاری</dd>
          <dt>دارندگان کلید</dt><dd>${C_READ()}</dd></dl></div></div>
      <div class="card"><div class="spread"><span>کار با این دستگاه تمام شد؟ خزانه را قفل کنید.</span><button class="btn" data-act="vt-lock">قفل کردن همین حالا</button></div></div>`;
  }
  const C_READ = () => CATALOG.readsSessions.map(r => esc(CATALOG.roleName(r))).join('، ');

  /* ---------------- exam builder ---------------- */
  function exams() {
    const ex = d().exams, qs = d().questions;
    const head = tabs(state.exTab, [['exams', `آزمون‌ها (${fa(ex.length)})`], ['bank', `بانک سؤال (${fa(qs.length)})`]], 'ex-tab');
    if (state.exTab === 'bank') {
      const topics = [...new Set(qs.map(q => q.topic))];
      return head + `<div class="spread" style="margin-bottom:8px"><span class="muted small">سؤال‌های چهارگزینه‌ای ${esc(ctx.D.TEACHER_SUBJECT)}</span><button class="btn primary" data-act="q-new">+ سؤال تازه</button></div>
        ${topics.map(t => `<div class="group-head"><h2>${esc(t)}</h2><span class="muted small">${fa(qs.filter(q => q.topic === t).length)} سؤال</span></div>
          <div class="card">${qs.filter(q => q.topic === t).map((q, i) => `<div style="padding:8px 0;${i ? 'border-top:1px solid var(--line)' : ''}"><div>${esc(q.text)}</div>
            <div class="row small" style="margin-top:4px">${q.options.map((o, k) => `<span class="tag ${k === q.answer ? 'ok' : 'grey'}">${fa(k + 1)}) ${esc(o)}</span>`).join('')}</div></div>`).join('')}</div>`).join('')}`;
    }
    return head + `<div class="spread" style="margin-bottom:12px"><span class="muted small">آزمون را از بانک سؤال بسازید؛ پیش‌نمایش و کارت صندلی آماده می‌شود.</span><button class="btn primary" data-act="ex-new">+ آزمون تازه</button></div>
      <div class="card">${ex.length ? `<div class="table-wrap"><table><tr><th>آزمون</th><th>کلاس</th><th>روز</th><th>سؤال</th><th></th></tr>${ex.map(e => `<tr><td><b>${esc(e.title)}</b><div class="muted small">${fa(e.minutes)} دقیقه</div></td>
        <td>${esc(className(e.cls))}</td><td class="small">${esc(weekday(e.date))} ${esc(fdate(e.date))}</td><td class="num">${fa(e.qids.length)}</td>
        <td><div class="row"><button class="btn sm" data-act="ex-prev" data-id="${e.id}">پیش‌نمایش</button><button class="btn sm" data-act="ex-seat" data-id="${e.id}">کارت صندلی</button></div></td></tr>`).join('')}</table></div>` : empty('آزمونی ساخته نشده.')}</div>`;
  }
  function examModal() {
    const qs = d().questions, topics = [...new Set(qs.map(q => q.topic))];
    modal(`<h2>آزمون تازه</h2><label class="field"><span>عنوان</span><input class="input" id="z-t"></label>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>کلاس</span><select class="input" id="z-c">${d().classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field"><span>روز</span>${JDate.field('z-d', ctx.shift(7, today))}</label>
      <label class="field"><span>زمان (دقیقه)</span><input class="input num" id="z-m" type="number" min="5" max="120" value="30"></label></div>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">سؤال‌ها</legend>${topics.map(t => `<div class="small" style="margin-top:8px"><b>${esc(t)}</b></div>
        ${qs.filter(q => q.topic === t).map(q => `<label class="row small" style="padding:3px 0;cursor:pointer"><input type="checkbox" value="${q.id}"> ${esc(q.text)}</label>`).join('')}`).join('')}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ساختن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const qids = [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
        if (!v(root, '#z-t')) return UI.invalid('#z-t', 'عنوان را بنویسید.');
        if (!qids.length) return UI.invalid(root.querySelector('fieldset'), 'دست‌کم یک سؤال انتخاب کنید.');
        d().exams.push({ id: ctx.uid('z'), title: v(root, '#z-t'), cls: v(root, '#z-c'), date: v(root, '#z-d'), minutes: Math.max(5, +v(root, '#z-m') || 30), qids });
        done('آزمون ساخته شد.');
      };
    });
  }
  function questionModal() {
    const topics = [...new Set(d().questions.map(q => q.topic))];
    modal(`<h2>سؤال تازه</h2><label class="field"><span>مبحث</span><input class="input" id="q-t" list="q-topics"><datalist id="q-topics">${topics.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
      <label class="field"><span>متن سؤال</span><textarea class="input" id="q-x" rows="2"></textarea></label>
      <fieldset style="border:0;padding:0;margin:12px 0 0"><legend class="small muted">گزینه‌ها (گزینهٔ درست را علامت بزنید)</legend>
      ${[0, 1, 2, 3].map(i => `<div class="row" style="margin-top:6px"><input type="radio" name="ans" value="${i}" ${i ? '' : 'checked'} aria-label="گزینهٔ ${fa(i + 1)} درست است"><input class="input" data-opt="${i}" placeholder="گزینهٔ ${fa(i + 1)}" style="flex:1"></div>`).join('')}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">افزودن به بانک</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const options = [...root.querySelectorAll('[data-opt]')].map(i => i.value.trim());
        if (!v(root, '#q-t') || !v(root, '#q-x')) return UI.invalid(['#q-t', '#q-x'], 'مبحث و متن سؤال را بنویسید.');
        if (options.some(o => !o)) return UI.invalid([...root.querySelectorAll('[data-opt]')].find(i => !i.value.trim()), 'هر چهار گزینه را بنویسید.');
        d().questions.push({ id: ctx.uid('q'), topic: v(root, '#q-t'), text: v(root, '#q-x'), options, answer: +root.querySelector('input[name=ans]:checked').value });
        done('سؤال به بانک افزوده شد.');
      };
    });
  }

  /* ---------------- wiring ---------------- */
  const act = {
    'cal-m': b => { const st = +b.dataset.id, t = JDate.isoToJ(today); if (!st) state.calM = { jy: t.jy, jm: t.jm }; else { let m = state.calM.jm + st, y = state.calM.jy; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } state.calM = { jy: y, jm: m }; } state.calDay = ''; render(); },
    'cal-day': b => { state.calDay = state.calDay === b.dataset.id ? '' : b.dataset.id; render(); },
    'ev-new': eventModal,
    'ev-ok': b => { o().events.find(e => e.id === b.dataset.id).status = 'approved'; save(); render(); toast('رویداد تأیید شد و در تقویم آمد.'); },
    'ev-no': b => { o().events.find(e => e.id === b.dataset.id).status = 'rejected'; save(); render(); toast('رد شد.'); },
    'nt-new': noticeModal,
    'nt-read': b => { o().notices.find(n => n.id === b.dataset.id).read.push(actor()); save(); render(); },
    'dc-new': discModal, 'dc-cat': catModal,
    'rc-tab': b => { state.rcTab = b.dataset.id; render(); },
    'rc-pub': () => { d().published[state.rcCls] = today; save(); render(); toast('کارنامه‌ها منتشر شد.'); },
    'rc-open': b => modal(cardHtml(b.dataset.id) + `<div class="row" style="margin-top:16px"><button class="btn primary" id="print">چاپ</button><button class="btn" data-close>بستن</button></div>`, root => {
      root.querySelector('#print').onclick = () => {
        const w = window.open('', '_blank'); if (!w) return toast('مرورگر پنجرهٔ چاپ را بست؛ اجازهٔ پنجرهٔ تازه را بدهید.');
        w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>کارنامه</title><link rel="stylesheet" href="assets/style.css"></head><body style="padding:24px;background:#fff">${cardHtml(b.dataset.id)}</body></html>`);
        w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
      };
    }),
    'ob-ok': b => decide(b.dataset.id, 'accepted'), 'ob-no': b => decide(b.dataset.id, 'rejected'),
    'te-open': b => tevalModal(b.dataset.id),
    'ap-new': () => modal(`<h2>متقاضی تازه</h2><label class="field"><span>نام و نام خانوادگی</span><input class="input" id="p-n"></label>
        <label class="field"><span>پایه</span><select class="input" id="p-g">${ctx.gradeOptions(ctx.D.gradesOf(ctx.school())[0])}</select></label>
        <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
        root.querySelector('#save').onclick = () => {
          if (!v(root, '#p-n')) return UI.invalid('#p-n', 'نام را بنویسید.');
          o().applicants.push({ id: ctx.uid('p'), name: v(root, '#p-n'), grade: +v(root, '#p-g'), stage: 'new', date: today, note: '' });
          done('متقاضی ثبت شد.');
        };
      }),
    'ap-next': b => {
      const a = o().applicants.find(x => x.id === b.dataset.id), i = STAGES.findIndex(s => s[0] === a.stage);
      const next = STAGES[i + 1][0];
      if (next === 'enrolled' && (o().enrolled[a.grade] || 0) >= o().capacity[a.grade]) return toast(`ظرفیت پایهٔ ${GN(a.grade)} پر است.`);
      a.stage = next; if (next === 'enrolled') o().enrolled[a.grade] = (o().enrolled[a.grade] || 0) + 1;
      save(); render(); toast(`${a.name}: ${STAGES[i + 1][1]}`);
    },
    'ap-reject': b => { o().applicants.find(x => x.id === b.dataset.id).stage = 'rejected'; save(); render(); toast('رد شد.'); },
    'cr-open': b => careerModal(b.dataset.id),
    'st-log': studyModal,
    'vt-lock': () => { state.vaultLocked = true; render(); toast('خزانه قفل شد.'); },
    'vt-unlock': () => { state.vaultLocked = false; render(); },
    'ex-tab': b => { state.exTab = b.dataset.id; render(); },
    'ex-new': examModal, 'q-new': questionModal,
    'ex-prev': b => {
      const e = d().exams.find(x => x.id === b.dataset.id), qs = e.qids.map(id => d().questions.find(q => q.id === id)).filter(Boolean);
      modal(`<h2>${esc(e.title)}</h2><p class="muted small">${esc(className(e.cls))} · ${fa(e.minutes)} دقیقه · ${fa(qs.length)} سؤال</p>
        <ol style="padding-right:20px">${qs.map(q => `<li style="margin-bottom:10px">${esc(q.text)}<div class="row small" style="margin-top:4px">${q.options.map((o, k) => `<span class="tag grey" data-ans="${k === q.answer}">${fa(k + 1)}) ${esc(o)}</span>`).join('')}</div></li>`).join('')}</ol>
        <div class="row"><button class="btn" id="show">نمایش پاسخ‌ها</button><button class="btn" data-close>بستن</button></div>`, root => {
        root.querySelector('#show').onclick = () => root.querySelectorAll('[data-ans="true"]').forEach(t => { t.className = 'tag ok'; });
      });
    },
    'ex-seat': b => {
      const e = d().exams.find(x => x.id === b.dataset.id), ss = d().students.filter(s => s.cls === e.cls);
      modal(`<h2>کارت صندلی · ${esc(e.title)}</h2><p class="muted small">${esc(weekday(e.date))} ${esc(fdate(e.date))}</p>
        <div class="mods" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${ss.map((s, i) => `<div class="card" style="padding:10px;text-align:center"><div class="kpi"><div class="v num" style="font-size:22px">${fa(i + 1)}</div></div><div class="small">${esc(s.name)}</div></div>`).join('')}</div>
        <div class="row" style="margin-top:14px"><button class="btn" data-close>بستن</button></div>`);
    },
  };
  function decide(id, status) {
    const o = d().objections.find(x => x.id === id);
    o.reply = document.querySelector(`[data-reply="${id}"]`)?.value.trim() || ''; o.status = status;
    save(); render(); toast(status === 'accepted' ? 'اعتراض پذیرفته شد.' : 'اعتراض رد شد.');
  }
  // Class pickers on these pages.
  function bind() {
    [['#rc-cls', 'rcCls'], ['#cr-cls', 'crCls'], ['#st-cls', 'stCls']].forEach(([sel, k]) => {
      const el = document.querySelector(sel); if (el) el.onchange = () => { state[k] = el.value; render(); document.querySelector(sel)?.focus(); };
    });
  }

  return {
    viewOf: { 'core.calendar': 'calendar', 'core.notices': 'notices', 'guid.discipline': 'discipline', 'acad.reportcard': 'reportcard', 'qual.teacher': 'teval',
      'fin.enrollment': 'enroll', 'guid.career': 'career', 'acad.study': 'study', 'plat.vault': 'vault', 'acad.exams': 'exams' },
    pages: { calendar, notices, discipline, teval, enroll, career, study, vault, exams },
    act, bind, appeals, openAppeals, eventApprovals, pendingEvents,
    // Unread notices for the menu badge.
    unread: who => o().notices.filter(n => n.to.includes(who) && !n.read.includes(who)).length,
  };
};
