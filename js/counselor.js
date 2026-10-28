// The guidance teacher's workspace: overview (reminders + day schedule), the student file (tests, records,
// AI summary, counselling sessions), behaviour observations, and discipline with a printable/PDF discipline card.
// school-app.js calls Counselor(ctx) and merges the pages and button actions it returns.
const Counselor = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const digitsC = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const D = SchoolData, T = D.TESTS, J = JDate;
  const { data, org, save, school, student, className, hrefOf, readOnly, render, empty, kpi } = ctx;
  const d = () => data();
  const BL = () => D.bellsOf(d().grade);  // this grade's bells
  const today = J.todayIso();
  const ro = () => readOnly();
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const f1 = n => fa(Math.round(n * 10) / 10);
  const daysTo = iso => Math.round((new Date(iso) - new Date(today)) / 864e5);
  const rel = iso => { const n = daysTo(iso); return n === 0 ? 'امروز' : n === 1 ? 'فردا' : n === -1 ? 'دیروز' : n > 0 ? `${fa(n)} روز دیگر` : `${fa(-n)} روز گذشته`; };
  const studentSelect = (id, sel = '', allowNone = true) => `<select class="input" id="${id}">${allowNone ? '<option value="">— بدون دانش‌آموز —</option>' : ''}${ctx.studentOptions(sel)}</select>`;
  const chips = (name = 'st', sel = []) => d().classes.map(c => `<div class="chip-group"><div class="small muted">${esc(c.name)}
      <button type="button" class="linkbtn" data-chipall="${c.id}">همه</button></div><div class="chips">${d().students.filter(s => s.cls === c.id)
      .map(s => `<label class="chip"><input type="checkbox" name="${name}" value="${s.id}" data-cls="${c.id}" ${sel.includes(s.id) ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}</div></div>`).join('');
  const state = { day: null, alertOpen: '', edit: false, sel: null, focusPal: false, draft: {}, tab: 'neo', editSession: null, obsTone: '', cardSid: '' };

  /* ======================= overview ======================= */
  // Kinds of schedule cell. The school's own list will replace these.
  const KINDS = { class: ['کلاس', 'blue'], fardi: ['مشاورهٔ فردی', 'teal'], tahsili: ['مشاورهٔ تحصیلی', 'violet'], khanevade: ['جلسه با خانواده', 'rose'],
    group: ['مشاورهٔ گروهی', 'teal'], meeting: ['جلسهٔ هماهنگی', 'amber'], free: ['آزاد', 'slate'] };
  const WITH_STUDENT = ['fardi', 'tahsili', 'khanevade'];

  function overview() {
    const x = d(), ws = D.weekStart(today);
    const rem = x.reminders.filter(r => !r.done).sort((a, b) => a.date.localeCompare(b.date));
    const di0 = D.dayIndex(today);
    if (state.day === null) state.day = di0 ?? 0;
    const day = state.day;
    const strip = `<section aria-label="یادآورها"><div class="sec-head"><h2>یادآورهای من</h2><span class="muted small">${fa(rem.length)} یادآور باز</span></div>
      <div class="rstrip" tabindex="0">
        ${ro() ? '' : '<button class="rcard rnew" data-act="rem-new"><span class="plus">+</span><b>یادآور تازه</b><span class="muted small">با تاریخ از تقویم</span></button>'}
        ${rem.map(r => {
          const n = daysTo(r.date), cls = n < 0 ? 'late' : n === 0 ? 'now' : '';
          return `<article class="rcard ${cls}"><div class="spread"><span class="tag ${n < 0 ? 'bad' : n === 0 ? 'warn' : 'grey'}">${esc(rel(r.date))}</span><span class="muted small">${esc(J.format(r.date, false))}</span></div>
            <p>${esc(r.text)}</p>${r.sid && student(r.sid) ? `<a class="small" href="${hrefOf('student', r.sid)}">${esc(student(r.sid).name)}</a>` : '<span></span>'}
            ${ro() ? '' : `<div class="row"><button class="btn sm" data-act="rem-done" data-id="${r.id}">انجام شد</button><button class="btn sm" data-act="rem-edit" data-id="${r.id}">ویرایش</button></div>`}</article>`;
        }).join('') || (ro() ? `<div class="empty">یادآوری نیست.</div>` : '')}
      </div></section>`;
    // A dashboard that fits the window (school-app.js fitDash): parents' requests and reminders on the right, alerts and
    // new notices beside them. The day's schedule is too wide for a panel, so it runs the full width below. (Who teaches
    // the grade shows in the marks pages; a teacher's own week opens from «برنامهٔ هفتگی», teacherPick.)
    const dp = (html, k) => html ? `<div class="dp ${k}">${html}</div>` : '';
    return `<div class="dash dash-2">
      <div class="dcol"><!--dash-req-->${dp(strip, 'grow')}</div>
      <div class="dcol dmain">${dp(alerts(), 'whole')}${dp(ctx.noticeStrip?.() || '', 'grow')}</div></div>
      <div class="dash-below">${schedule(x, ws, day, di0)}</div>`;
  }

  /* ---------------- alerts ---------------- */
  // What needs the counsellor's attention, worked out from what is already recorded. Nothing here is stored.
  const NEO_HIGH = 65, PREREQ_GAP = 45, MONTH = 30;
  const pct100 = (v, t) => (v - t.min) / (t.max - t.min) * 100;
  function alerts() {
    const x = d(), cut = D.shift(-MONTH, today);
    const sessOf = sid => x.sessions.filter(n => n.sid === sid);
    const lastSess = sid => sessOf(sid).map(n => n.date).sort().pop();
    const noSess = x.students.filter(s => { const l = lastSess(s.id); return !l || l < cut; }).map(s => ({ s, why: lastSess(s.id) ? `آخرین جلسه ${rel(lastSess(s.id))}` : 'هنوز جلسه نداشته' }));
    // In the principal's read-only view only sessions shared with the principal count.
    const overdue = x.sessions.filter(n => !ro() || n.share).flatMap(n => (n.actions || []).filter(a => a.due && a.due < today && !a.done).map(a => ({ n, a, s: student(n.sid) }))).filter(o => o.s)
      .sort((p, q) => p.a.due.localeCompare(q.a.due));
    const special = [];
    x.students.forEach(s => {
      const p = x.profiles?.[s.id] || {};
      if (p.neo?.s?.N != null && pct100(p.neo.s.N, T.neo) > NEO_HIGH) special.push({ s, why: 'حساسیت هیجانی بالا در تست نئو' });
      (p.prereq || []).forEach(pr => { const t = pr.domains.reduce((a, m) => a + (+m.max || 0), 0), v = pr.domains.reduce((a, m) => a + (+m.v || 0), 0);
        if (t && v / t * 100 < PREREQ_GAP) special.push({ s, why: `شکاف جدی در پیش‌نیاز ${pr.subject || 'ریاضی'} (${fa(Math.round(v / t * 100))}٪)` }); });
    });
    const neg = x.students.map(s => ({ s, n: x.obs.filter(o => o.tone === 'neg' && o.date >= cut && o.sids.includes(s.id)).length })).filter(o => o.n >= 2)
      .map(({ s, n }) => ({ s, why: `${fa(n)} مشاهدهٔ نگران‌کننده در یک ماه` }));
    // A student whose total has reached one of the school's steps (−15, −30, ...), with the action it calls for.
    const disc = x.students.map(s => ({ s, st: Disc.standing(x, s.id) })).filter(o => o.st.step)
      .map(({ s, st }) => ({ s, why: `${Disc.sign(st.total)} امتیاز انضباطی؛ ${st.step[1]}` }));
    // One line per student, with every reason joined.
    const merge = list => [...list.reduce((m, o) => m.set(o.s.id, m.has(o.s.id) ? { s: o.s, why: m.get(o.s.id).why + '؛ ' + o.why } : o), new Map()).values()];
    const NO_SESS = 'هنوز جلسه نداشته';
    // Square cards side by side; a card opens its list in a drawer below the row with a smooth slide
    // (opened in place, without redrawing the page, so the motion is kept).
    const chips = list => list.length ? `<div class="al-chips">${list.map(o => `<a class="al-chip" href="${hrefOf('student', o.s.id)}" title="${esc(o.why)}">${esc(o.s.name)}${o.why !== NO_SESS ? `<span>${esc(o.why)}</span>` : ''}</a>`).join('')}</div>` : '';
    const follow = `<ul class="al-follow">${overdue.map(o => `<li><label class="act-line"><input type="checkbox" data-actdone="${o.n.id}|${o.a.id}" ${ro() ? 'disabled' : ''}>
        <span>${esc(o.a.text)}</span></label><span class="muted small"><a href="${hrefOf('student', o.s.id)}">${esc(o.s.name)}</a> · سررسید ${esc(rel(o.a.due))}</span></li>`).join('')}</ul>`;
    const cards = [
      ['follow', 'bad', 'calendar', 'پیگیری عقب‌افتاده', overdue.length, overdue.length ? follow : '', 'پیگیری عقب‌افتاده‌ای نیست.'],
      ['nosess', 'warn', 'users', 'یک ماه ندیده‌ام', merge(noSess).length, chips(merge(noSess)), 'با همه در یک ماه گذشته جلسه داشته‌اید.'],
      ['tests', 'warn', 'id', 'موارد ویژهٔ تست‌ها', merge(special).length, chips(merge(special)), 'در تست‌های ثبت‌شده مورد ویژه‌ای نیست.'],
      ['behave', 'bad', 'shield', 'رفتار و انضباط', merge([...neg, ...disc]).length, chips(merge([...neg, ...disc])), 'مورد نگران‌کننده‌ای در یک ماه گذشته نیست.'],
    ];
    if (!cards.some(c => c[0] === state.alertOpen)) state.alertOpen = '';
    return `<section class="alerts2" aria-label="هشدارها و پیگیری‌ها"><div class="sec-head"><h2>هشدارها و پیگیری‌ها</h2></div>
      <div class="al-tiles">${cards.map(([k, tone, ic, title, n]) => `<button type="button" class="al-tile ${n ? tone : 'calm'}" data-act="al-open" data-id="${k}" aria-expanded="${state.alertOpen === k}" aria-controls="al-d-${k}">
          <span class="al-ic" aria-hidden="true">${Shell.icon(n ? ic : 'check')}</span><span class="al-n">${n ? fa(n) : 'هیچ'}</span><span class="al-t">${title}</span></button>`).join('')}</div>
      ${cards.map(([k, tone, , title, n, body, calmTxt]) => `<div class="al-drawer ${state.alertOpen === k ? 'open' : ''}" id="al-d-${k}" role="region" aria-label="${title}"><div class="al-drawer-in"><div class="al-drawer-body ${n ? tone : 'calm'}">
          ${n ? body : `<p class="muted small" style="margin:0">${calmTxt}</p>`}</div></div></div>`).join('')}</section>`;
  }

  /* ---------------- day schedule ---------------- */
  // Editing: tap a cell, then pick what goes in it from the options for that row (subjects for a class,
  // kinds for «برنامهٔ من»); the selection then moves to the next bell. Nothing is saved until «ذخیره»,
  // which asks whether the change is for this week only or from this week on.
  const bells = () => Array.from({ length: BL().n }, (_, b) => b);
  // A day's unsaved changes: me[bell], cls[class][bell] = subject, tch[class][bell] = that subject's teacher.
  const draftOf = day => { const dd = (state.draft[day] = state.draft[day] || { me: {}, cls: {} }); dd.tch = dd.tch || {}; return dd; };
  const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
  const draftCount = () => Object.values(state.draft || {}).reduce((a, dd) => a + Object.keys(dd.me).length + Object.values(dd.cls).reduce((s, c) => s + Object.keys(c).length, 0), 0);
  const sessCount = sid => d().sessions.filter(n => n.sid === sid).length;
  // One cell of «برنامهٔ من» or of a class, for a day and a bell; the day view and the week page share them.
  // A selected cell is { row, day, b }.
  const isSel = (row, day, b) => !!state.sel && state.sel.row === row && state.sel.day === day && state.sel.b === b;
  const weekly = (x, ws, row, day, b) => has(row === 'me' ? x.weekOver?.[ws]?.me?.[day] : x.weekOver?.[ws]?.cls?.[row]?.[day], b);
  const cellWrap = (edit, inner, row, day, b, label) => edit ? `<button type="button" class="cellbtn" data-act="cell-pick" data-row="${row}" data-day="${day}" data-b="${b}" aria-pressed="${isSel(row, day, b)}" aria-label="${esc(label)}">${inner}</button>` : inner;
  function meTd(x, ws, day, b, edit) {
    const dd = edit ? draftOf(day) : { me: {} }, changed = has(dd.me, b), c = changed ? dd.me[b] : D.meCell(x, day, b, ws);
    const [label, tone] = c ? (KINDS[c.type] || [c.type, 'slate']) : ['', ''];
    const who = c?.sid && student(c.sid) ? student(c.sid).name : '';
    const inner = c ? `<b>${esc(label)}</b>${who ? `<div class="small">${esc(who)}</div>` : ''}${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ''}` : (edit ? '+' : '—');
    return `<td class="cell ${c ? 'tone-' + tone : 'empty-cell'} ${changed ? 'changed' : ''} ${weekly(x, ws, 'me', day, b) ? 'wk' : ''} ${isSel('me', day, b) ? 'sel' : ''}">${cellWrap(edit, inner, 'me', day, b, `برنامهٔ من، ${D.DAYS[day]}، زنگ ${fa(b + 1)}: ${c ? label + (who ? ' ' + who : '') : 'خالی'}`)}</td>`;
  }
  function clsTd(x, ws, cid, day, b, edit) {
    const dd = edit ? draftOf(day) : { cls: {} }, changed = has(dd.cls[cid], b), sub = changed ? dd.cls[cid][b] : D.clsCell(x, cid, day, b, ws), who = changed ? dd.tch?.[cid]?.[b] || '' : D.clsTeacher(x, cid, day, b, ws);
    return `<td class="cell ${sub ? 'subj' : 'empty-cell'} ${changed ? 'changed' : ''} ${weekly(x, ws, cid, day, b) ? 'wk' : ''} ${isSel(cid, day, b) ? 'sel' : ''}">${cellWrap(edit, esc(sub || (edit ? '+' : '—')) + (sub && who ? `<div class="small muted">${esc(who)}</div>` : ''), cid, day, b, `کلاس ${className(cid)}، ${D.DAYS[day]}، زنگ ${fa(b + 1)}: ${sub || 'خالی'}`)}</td>`;
  }
  const bellHead = () => BL().withBreak(Array.from({ length: BL().n }, (_, b) => `<th>زنگ ${fa(b + 1)}<div class="small muted">${digitsC(BL().times[b])} تا ${digitsC(BL().ends[b])}</div></th>`), `<th class="tt-break" scope="col"><span class="sr-only">زنگ تفریح و ناهار از </span>${digitsC(BL().brk.from)}<br>تا<br>${digitsC(BL().brk.to)}</th>`).join('');
  const legend = () => `<div class="row small" style="margin-top:10px">${Object.values(KINDS).map(([l, t]) => `<span class="legend tone-${t}"><i></i>${esc(l)}</span>`).join('')}<span class="legend wk-legend"><i></i>تغییر فقط برای این هفته</span></div>`;
  // The options for the selected cell (kinds for «برنامهٔ من», subjects for a class), with save and cancel.
  function palette(x, ws, edit) {
    if (!edit) return '';
    let options = '';
    if (state.sel) {
      const { row, day, b } = state.sel, dd = draftOf(day);
      const cur = row === 'me' ? ((has(dd.me, b) ? dd.me[b] : D.meCell(x, day, b, ws))?.type || 'free') : (has(dd.cls[row], b) ? dd.cls[row][b] : D.clsCell(x, row, day, b, ws));
      const opt = (v, label, tone) => `<button type="button" class="pchip ${tone ? 'tone-' + tone : ''}" data-act="cell-set" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(label)}</button>`;
      const subjects = [...new Set([...D.SUBJECTS, ...(x.customSubjects || [])])];
      const where = `${row === 'me' ? 'برنامهٔ من' : `کلاس ${className(row)}`}، ${D.DAYS[day]}، زنگ ${fa(b + 1)}`;
      // A class cell with a subject also shows who teaches it, to change the teacher without changing the subject.
      const tNow = row === 'me' || !cur ? '' : has(dd.cls[row], b) ? dd.tch?.[row]?.[b] || '' : D.clsTeacher(x, row, day, b, ws);
      const tList = row === 'me' || !cur ? [] : [...new Set([tNow, ...D.teachersFor(x, row, cur)].filter(Boolean))];
      const topt = (t, label) => `<button type="button" class="pchip" data-act="cell-tch" data-v="${esc(t)}" aria-pressed="${t === tNow}">${esc(label)}</button>`;
      options = `<div class="prow"><b class="small">${esc(where)}:</b></div>
        <div class="prow" role="group" aria-label="گزینه‌های ${esc(where)}">${row === 'me'
          ? Object.entries(KINDS).map(([k, [l, t]]) => opt(k, l, t)).join('')
          : subjects.map(su => opt(su, su, '')).join('') + '<button type="button" class="pchip" data-act="cell-other">+ درس دیگر</button>'}
          <button type="button" class="pchip erase" data-act="cell-set" data-v="">خالی کردن</button></div>
        ${row !== 'me' && cur ? `<div class="prow" role="group" aria-label="معلم ${esc(cur)}"><b class="small">معلم ${esc(cur)}:</b>
          ${tList.map(t => topt(t, t)).join('')}<button type="button" class="pchip" data-act="cell-tch-other">+ معلم دیگر</button>${topt('', 'بدون معلم')}</div>` : ''}`;
    }
    return `<div class="palette card" role="region" aria-label="ویرایش برنامه">${options}
        <div class="row" style="margin-top:8px"><button class="btn primary" data-act="sched-save" ${draftCount() ? '' : 'disabled'}>ذخیرهٔ تغییرات${draftCount() ? ` (${fa(draftCount())})` : ''}</button><button class="btn" data-act="sched-cancel">انصراف</button></div></div>`;
  }
  const editBtn = () => ro() ? '' : `<button class="btn sm ${state.edit ? 'primary' : ''}" data-act="sched-edit" aria-pressed="${state.edit}">${state.edit ? 'در حال ویرایش' : 'ویرایش برنامه'}</button>`;
  // The day view; each row's title opens that row's whole week («برنامهٔ هفتگی»).
  function schedule(x, ws, day, di0) {
    const edit = state.edit && !ro(), dates = D.DAYS.map((_, i) => D.shift(i, ws));
    const rowHead = (id, label) => `<th scope="row"><a class="sched-row" href="${hrefOf('cweek', id)}" title="برنامهٔ هفتگی ${esc(label)}">${esc(label)}</a></th>`;
    return `<section aria-label="برنامهٔ روز"><div class="sec-head"><h2>برنامهٔ روز</h2>
        <div class="row">${D.DAYS.map((n, i) => `<button class="btn sm ${i === day ? 'primary' : ''}" data-act="day" data-id="${i}" aria-pressed="${i === day}" title="${esc(J.format(dates[i], false))}">${n} <span class="small">${esc(J.format(dates[i], false))}</span>${i === di0 ? ' · امروز' : ''}</button>`).join('')}
        ${editBtn()}</div></div>
      ${palette(x, ws, edit)}
      <div class="card"><div class="table-wrap"><table class="sched ${edit ? 'editing' : ''}"><tr><th></th>${bellHead()}</tr>
        <tr>${rowHead('me', 'برنامهٔ من')}${BL().withBreak(bells().map(b => meTd(x, ws, day, b, edit)), '<td class="tt-break"></td>').join('')}</tr>
        ${x.classes.map(c => `<tr>${rowHead(c.id, `کلاس ${c.name}`)}${BL().withBreak(bells().map(b => clsTd(x, ws, c.id, day, b, edit)), '<td class="tt-break"></td>').join('')}</tr>`).join('')}
      </table></div>
      <p class="small muted" style="margin:8px 0 0">برای دیدن و ویرایش برنامهٔ کامل هفته، روی «برنامهٔ من» یا نام هر کلاس بزنید.</p>${legend()}</div></section>`;
  }
  // One row's whole week (rows are days), on its own page: «برنامهٔ من» or a class. Same editing as the day view.
  function week(arg) {
    const x = d(), ws = D.weekStart(today), di0 = D.dayIndex(today), edit = state.edit && !ro();
    const row = x.classes.some(c => c.id === arg) ? arg : 'me', dates = D.DAYS.map((_, i) => D.shift(i, ws));
    const rows = [['me', 'برنامهٔ من'], ...x.classes.map(c => [c.id, `کلاس ${c.name}`])];
    const title = row === 'me' ? 'برنامهٔ هفتگی من' : `برنامهٔ هفتگی کلاس ${className(row)}`;
    return `<section aria-label="${esc(title)}"><div class="sec-head"><h2>${esc(title)}</h2>${editBtn()}</div>
      <nav class="wk-pick" aria-label="برنامهٔ کدام">${rows.map(([id, l]) => `<a class="${id === row ? 'on' : ''}" href="${hrefOf('cweek', id)}" ${id === row ? 'aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>
      ${teacherPick(x)}
      ${palette(x, ws, edit)}
      <div class="card"><div class="table-wrap"><table class="sched sched-week ${edit ? 'editing' : ''}"><tr><th></th>${bellHead()}</tr>
        ${D.DAYS.map((n, day) => `<tr class="${day === di0 ? 'is-today' : ''}"><th scope="row">${esc(n)}<div class="small muted">${esc(J.format(dates[day], false))}${day === di0 ? ' · امروز' : ''}</div></th>
          ${BL().withBreak(bells().map(b => row === 'me' ? meTd(x, ws, day, b, edit) : clsTd(x, ws, row, day, b, edit)), '<td class="tt-break"></td>').join('')}</tr>`).join('')}
      </table></div>${legend()}</div></section>`;
  }
  function pickCell(b) { state.sel = { row: b.dataset.row, day: +b.dataset.day, b: +b.dataset.b }; state.focusPal = true; render(); }
  // Put a value in the selected cell, then move to the next bell of the same row and day.
  function setCell(val) {
    if (!state.sel) return;
    const { row, day, b } = state.sel, dd = draftOf(day);
    const next = () => { if (b < BL().n - 1) state.sel = { row, day, b: b + 1 }; state.focusPal = true; render(); };
    if (row === 'me') {
      if (!val || val === 'free') { dd.me[b] = null; return next(); }
      if (WITH_STUDENT.includes(val)) return pickStudent(val, sid => { dd.me[b] = { type: val, sid, note: '' }; next(); });
      dd.me[b] = { type: val, sid: '', note: '' }; return next();
    }
    (dd.cls[row] = dd.cls[row] || {})[b] = val;
    (dd.tch[row] = dd.tch[row] || {})[b] = val ? D.teachersFor(d(), row, val)[0] || '' : '';
    next();
  }
  // Change only the teacher of the selected class cell; the selection stays on it.
  function setTeacher(t) {
    if (!state.sel || state.sel.row === 'me') return;
    const { row, day, b } = state.sel, dd = draftOf(day), x = d(), ws = D.weekStart(today);
    if (!has(dd.cls[row], b)) (dd.cls[row] = dd.cls[row] || {})[b] = D.clsCell(x, row, day, b, ws);
    (dd.tch[row] = dd.tch[row] || {})[b] = t; state.focusPal = true; render();
  }
  function otherTeacher() {
    modal(`<h2>معلم دیگر</h2><label class="field"><span>نام معلم</span><input class="input" id="ot-n" placeholder="مثلاً جناب آقای ..."></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { const n = v(root, '#ot-n'); if (!n) return UI.invalid('#ot-n', 'نام معلم را بنویسید.'); close(); setTeacher(n); };
    });
  }
  // Every student in roster order (no ranking), each with how many sessions they have had.
  function pickStudent(kind, onPick) {
    const x = d();
    modal(`<h2>${esc(KINDS[kind][0])} با کدام دانش‌آموز؟</h2><input class="input" id="ps-q" placeholder="جست‌وجوی نام…" aria-label="جست‌وجوی دانش‌آموز">
      <div class="pick-list" role="list">${x.classes.map(c => `<div class="small muted pick-cls">${esc(c.name)}</div>${x.students.filter(s => s.cls === c.id).map(s => { const n = sessCount(s.id);
        return `<button type="button" class="pick-st" role="listitem" data-sid="${s.id}" data-name="${esc(s.name)}"><span>${esc(s.name)}</span><span class="tag ${n ? 'grey' : 'warn'}">${n ? `${fa(n)} جلسه` : 'بدون جلسه'}</span></button>`; }).join('')}`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#ps-q').oninput = e => { const q = e.target.value.trim(); root.querySelectorAll('.pick-st').forEach(bt => { bt.hidden = !!q && !bt.dataset.name.includes(q); }); };
      root.querySelectorAll('.pick-st').forEach(bt => bt.onclick = () => { close(); onPick(bt.dataset.sid); });
    });
  }
  function otherSubject() {
    modal(`<h2>درس دیگر</h2><label class="field"><span>نام درس</span><input class="input" id="os-n" placeholder="مثلاً کارگاه رباتیک"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">افزودن به ابزارها</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const n = v(root, '#os-n'); if (!n) return UI.invalid('#os-n', 'نام درس را بنویسید.');
        const x = d(); x.customSubjects = [...new Set([...(x.customSubjects || []), n])]; save(); close(); setCell(n); toast(`«${n}» به فهرست درس‌ها افزوده شد.`);
      };
    });
  }
  function saveSchedule() {
    const n = draftCount(); if (!n) return;
    modal(`<h2>ذخیرهٔ ${fa(n)} تغییر</h2>
      <fieldset class="scope"><legend class="small muted">این تغییر برای کی است؟</legend>
        <label class="scope-opt"><input type="radio" name="scope" value="week" checked><span><b>فقط همین هفته</b><span class="muted small">هفتهٔ ${esc(J.format(D.weekStart(today)))}؛ از هفتهٔ بعد برنامهٔ همیشگی برمی‌گردد.</span></span></label>
        <label class="scope-opt"><input type="radio" name="scope" value="year"><span><b>از این هفته به بعد</b><span class="muted small">تا آخر سال، برنامهٔ همیشگی عوض می‌شود.</span></span></label></fieldset>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const x = d(), ws = D.weekStart(today), scope = root.querySelector('input[name=scope]:checked').value;
        x.weekOver = x.weekOver || {};
        Object.entries(state.draft).forEach(([day, dd]) => {
          if (scope === 'week') {
            const w = (x.weekOver[ws] = x.weekOver[ws] || { me: {}, cls: {} });
            Object.entries(dd.me).forEach(([b, c]) => { ((w.me = w.me || {})[day] = w.me[day] || {})[b] = c; });
            Object.entries(dd.cls).forEach(([cid, cells]) => Object.entries(cells).forEach(([b, s]) => { (((w.cls = w.cls || {})[cid] = w.cls[cid] || {})[day] = w.cls[cid][day] || {})[b] = s;
              (((w.tch = w.tch || {})[cid] = w.tch[cid] || {})[day] = w.tch[cid][day] || {})[b] = dd.tch?.[cid]?.[b] || ''; }));
          } else {
            Object.entries(dd.me).forEach(([b, c]) => { x.mySchedule[day][b] = c; });
            Object.entries(dd.cls).forEach(([cid, cells]) => Object.entries(cells).forEach(([b, s]) => { x.timetable[cid][day][b] = s;
              x.ttTeacher = x.ttTeacher || {}; x.ttTeacher[cid] = x.ttTeacher[cid] || D.DAYS.map(() => Array(BL().n).fill(''));
              x.ttTeacher[cid][day][b] = dd.tch?.[cid]?.[b] || ''; }));
            // From this week on, the plan wins: drop this and later weeks' one-off changes to the same cells.
            Object.keys(x.weekOver).filter(k => k >= ws).forEach(k => {
              const w = x.weekOver[k];
              Object.keys(dd.me).forEach(b => { if (w.me?.[day]) delete w.me[day][b]; });
              Object.entries(dd.cls).forEach(([cid, cells]) => Object.keys(cells).forEach(b => { if (w.cls?.[cid]?.[day]) delete w.cls[cid][day][b]; if (w.tch?.[cid]?.[day]) delete w.tch[cid][day][b]; }));
            });
          }
        });
        state.draft = {}; state.edit = false; state.sel = null;
        done(scope === 'week' ? 'تغییرها فقط برای همین هفته ذخیره شد.' : 'برنامه از این هفته به بعد عوض شد.');
      };
    });
  }
  function reminderModal(r = {}, sid = '') {
    modal(`<h2>${r.id ? 'ویرایش یادآور' : 'یادآور تازه'}</h2>
      <label class="field"><span>چه چیزی را یادآوری کنم؟</span><textarea class="input" id="r-t" rows="2">${esc(r.text || '')}</textarea></label>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>تاریخ</span>${J.field('r-d', r.date || today)}</div>
      <label class="field"><span>دربارهٔ دانش‌آموز</span>${studentSelect('r-s', r.sid || sid)}</label></div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button>${r.id ? '<button class="btn danger" id="del">حذف</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#r-t')) return UI.invalid('#r-t', 'متن یادآور را بنویسید.');
        const rec = { text: v(root, '#r-t'), date: v(root, '#r-d'), sid: v(root, '#r-s') };
        if (r.id) Object.assign(r, rec); else d().reminders.push({ id: D.uid('r'), done: false, ...rec });
        done('یادآور ذخیره شد.');
      };
      const del = root.querySelector('#del');
      if (del) del.onclick = () => { const back = UI.drop(d().reminders, x => x.id === r.id); save(); close(); render(); UI.undo('یادآور حذف شد.', back, () => { save(); render(); }); };
    });
  }

  /* ======================= student file ======================= */
  const TABS = [['neo', 'تست نئو'], ['holland', 'تست هالند'], ['gardner', 'تست گاردنر'], ['prereq', 'پیش‌نیازها'], ['records', 'سوابق تحصیلی'], ['summary', 'جمع‌بندی و راهبرد'], ['sessions', 'جلسات مشاوره']];
  const prof = sid => d().profiles[sid] || {};
  const profW = sid => (d().profiles[sid] = d().profiles[sid] || { prereq: [], records: [], prevDesc: '' });
  // The grade-9 profile of Mehr-e Hashtom (js/profile9.js), matched by name; null elsewhere.
  const pf = sid => typeof Profile9 === 'undefined' || school().id !== 'mehr8' || d().grade !== 9 ? null : Profile9.byName(student(sid)?.name);
  const PF_KEY = { neo: 'neo', holland: 'holland', gardner: 'gardner', prereq: 'math', records: 'transcript' };
  const pfTest = (sid, key) => pf(sid) ? Profile9.test(pf(sid), PF_KEY[key]) : '';
  function studentFile(sid) {
    if (!student(sid)) return empty('این دانش‌آموز پیدا نشد.');
    const p9 = pf(sid), c9 = p9?.content || {};
    const has = { neo: !!prof(sid).neo || !!c9.neo, holland: !!prof(sid).holland || !!c9.holland, gardner: !!prof(sid).gardner || !!c9.gardner, prereq: (prof(sid).prereq || []).length || !!c9.math,
      records: (prof(sid).records || []).length || !!c9.transcript, summary: !!prof(sid).summary || !!c9.summary, sessions: d().sessions.filter(n => n.sid === sid).length || (p9?.seed || []).length };
    const intro = p9 ? `<div class="pf-intro card">${p9.photo ? `<img class="pf-photo" src="${esc(p9.photo)}" alt="عکس ${esc(student(sid).name)}">` : ''}
      <div><div class="muted small">پروفایل استعدادسنجی پاییز ۱۴۰۵${p9.class ? ` · کلاس ${esc(p9.class)}` : ''}</div>${c9.summary?.headline ? `<p class="pf-lead">${esc(c9.summary.headline).replace(/==(.+?)==/g, '<mark>$1</mark>')}</p>` : ''}</div></div>` : '';
    const body = { neo: () => testTab(sid, 'neo'), holland: () => testTab(sid, 'holland'), gardner: () => testTab(sid, 'gardner'),
      prereq: () => prereqTab(sid), records: () => recordsTab(sid), summary: () => summaryTab(sid), sessions: () => sessionsTab(sid) }[state.tab]();
    return `${intro}<nav class="ftabs" aria-label="بخش‌های پرونده">${TABS.map(([k, l]) => `<button class="${state.tab === k ? 'on' : ''}" data-act="file-tab" data-id="${k}" aria-current="${state.tab === k ? 'page' : 'false'}">
      ${esc(l)}${has[k] ? '<i class="ok-dot" role="img" aria-label="ثبت شده"></i>' : ''}</button>`).join('')}</nav>${body}`;
  }
  // Big Five level from a 10-50 domain score: normalised to 0-100, low <= 35, high > 65
  // (thresholds from KatherineGuoGuo/bigfive-open, MIT).
  const neoLevel = val => { const n = (val - 10) / 40 * 100; return n <= 35 ? ['پایین', 'grey'] : n <= 65 ? ['میانه', 'blue'] : ['بالا', 'ok']; };
  // The full report of a test from the school's files (grade 9 of Mehr-e Hashtom, js/data-mehr8-9-tests.js):
  // headings, paragraphs and tables, shown under the scores. A result edited by hand no longer matches it, so it is hidden then.
  function reportOf(sid, key) {
    if (typeof TESTS_MEHR8_9 === 'undefined' || school().id !== 'mehr8' || d().grade !== 9) return null;
    const t = TESTS_MEHR8_9[student(sid)?.name]; if (!t?.reports?.[key]) return null;
    const p = prof(sid)[key];
    if (['neo', 'holland', 'gardner'].includes(key) && p && t[key] && p.date !== t[key].date) return null;
    return t.reports[key];
  }
  const repCell = (c, th) => th ? `<th scope="col">${esc(digitsC(c))}</th>` : `<td>${esc(digitsC(c))}</td>`;
  const blocksHtml = (bs, title) => { let n = 0; return bs.map(b => b.h ? `<h3 class="rep-h">${esc(digitsC(b.h))}</h3>` : b.p ? `<p>${esc(digitsC(b.p))}</p>`
    : `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(title)}، جدول ${fa(++n)}"><table class="no-cards rep-t">${b.table.map((r, i) => `<tr>${r.map(c => repCell(c, i === 0 && b.table.length > 1)).join('')}</tr>`).join('')}</table></div>`).join(''); };
  const REP_TITLE = { neo: 'کارنامهٔ کامل نئو', holland: 'کارنامهٔ کامل هالند', gardner: 'کارنامهٔ کامل گاردنر', prereq: 'جزئیات کامل پیش‌نیازسنج ریاضی', records: 'جزئیات کامل کارنامه‌های هفتم و هشتم' };
  const reportCard = (sid, key) => { const r = reportOf(sid, key);
    return r ? `<details class="card rep" open><summary><h2 class="rep-title">${REP_TITLE[key]}</h2><span class="muted small"> · از فایل‌های آزمون مهر ۱۴۰۵</span></summary><div class="rep-body">${blocksHtml(r, REP_TITLE[key])}</div></details>` : ''; };
  function testTab(sid, key) {
    const t = T[key], p = prof(sid)[key];
    if (!p) return `<div class="card empty-state"><h2>${esc(t.name)}</h2><p class="muted">${prof(sid)[key + 'Note'] ? `برگهٔ این آزمون ثبت نشد: ${esc(prof(sid)[key + 'Note'])}` : 'هنوز نتیجه‌ای ثبت نشده. بعد از برگزاری آزمون، نمره‌ها را اینجا وارد کنید.'}</p>
      ${ro() ? '' : `<button class="btn primary" data-act="test-edit" data-id="${key}">ثبت نتیجهٔ آزمون</button>`}</div>${pfTest(sid, key)}${reportCard(sid, key)}`;
    const rows = t.keys.map(([k, l]) => ({ k, l, val: p.s[k] }));
    const top = rows.slice().sort((a, b) => b.val - a.val);
    const head = key === 'holland' ? `کد هالند: <b>${top.slice(0, 3).map(r => r.k).join('')}</b> (${top.slice(0, 3).map(r => esc(r.l)).join('، ')})`
      : key === 'gardner' ? `برجسته‌ترین‌ها: <b>${top.slice(0, 2).map(r => esc(r.l)).join('، ')}</b>`
      : `بالاترین: <b>${esc(top[0].l)}</b> · پایین‌ترین: <b>${esc(top[top.length - 1].l)}</b>`;
    return `<div class="card"><div class="card-head"><div><h2 style="margin:0">${esc(t.name)}</h2><div class="muted small">تاریخ آزمون: ${esc(J.format(p.date))} · بازهٔ نمره ${fa(t.min)} تا ${fa(t.max)}</div></div>
        ${ro() ? '' : `<div class="row"><button class="btn sm" data-act="test-edit" data-id="${key}">ویرایش</button><button class="btn sm danger" data-act="test-del" data-id="${key}">حذف</button></div>`}</div>
      <p style="margin:0 0 14px">${head}</p>
      ${rows.map(r => {
        const pct = Math.max(0, Math.min(100, (r.val - t.min) / (t.max - t.min) * 100)), lv = key === 'neo' ? (p.lv?.[r.k] ? [p.lv[r.k], { 'پایین': 'grey', 'میانه': 'blue', 'بالا': 'ok' }[p.lv[r.k]] || 'blue'] : neoLevel(r.val)) : null;
        return `<div class="tbar"><span>${esc(r.l)}</span><div class="bar"><i style="width:${pct}%"></i></div><b class="num">${fa(r.val)}</b>${lv ? `<span class="tag ${lv[1]}">${lv[0]}</span>` : '<span></span>'}</div>`;
      }).join('')}
      ${p.note ? `<p class="muted small" style="margin-top:12px">${esc(p.note)}</p>` : ''}
      ${key === 'neo' ? `<p class="muted small">${p.lv ? 'سطح‌ها از تحلیل خود آزمون (نسبت به هم‌پایه‌ها) آمده‌اند؛ نُرم ایرانی نیست.' : 'سطح پایین/میانه/بالا با تبدیل نمره به صد و مرزهای ۳۵ و ۶۵ تعیین می‌شود؛ نُرم ایرانی نیست.'}</p>` : ''}</div>${pfTest(sid, key)}${reportCard(sid, key)}`;
  }
  function testModal(sid, key) {
    const t = T[key], p = prof(sid)[key] || { s: {} };
    modal(`<h2>${esc(t.name)} ـ ${esc(student(sid).name)}</h2><p class="muted small">نمرهٔ هر بخش بین ${fa(t.min)} و ${fa(t.max)}</p>
      <div class="field"><span>تاریخ آزمون</span>${J.field('t-d', p.date || today)}</div>
      <div class="grid g2" style="gap:0 12px">${t.keys.map(([k, l]) => `<label class="field"><span>${esc(l)}</span><input class="input num" type="number" data-k="${k}" min="${t.min}" max="${t.max}" value="${p.s[k] ?? ''}"></label>`).join('')}</div>
      <label class="field"><span>یادداشت</span><input class="input" id="t-n" value="${esc(p.note || '')}" placeholder="مثلاً اعتبار پاسخ‌ها"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const s = {}; let bad = false;
        root.querySelectorAll('[data-k]').forEach(i => { const n = +i.value; if (i.value === '' || n < t.min || n > t.max) bad = true; s[i.dataset.k] = n; });
        if (bad) return UI.invalid([...root.querySelectorAll('[data-k]')].find(i => i.value === '' || +i.value < t.min || +i.value > t.max), `هر بخش باید بین ${fa(t.min)} و ${fa(t.max)} باشد.`);
        profW(sid)[key] = { date: v(root, '#t-d'), s, note: v(root, '#t-n') };
        done('نتیجه ثبت شد.');
      };
    });
  }
  const prereqLevel = pct => pct < 45 ? ['شکاف جدی', 'bad'] : pct < 70 ? ['پایهٔ نیمه‌کاره', 'warn'] : ['پایهٔ محکم', 'ok'];
  function prereqTab(sid) {
    const list = prof(sid).prereq || [];
    return `${prof(sid).prereqNote && !list.length ? `<p class="note">پیش‌نیازسنج ریاضی مهر: ${esc(prof(sid).prereqNote)}</p>` : ''}<div class="spread" style="margin-bottom:12px"><span class="muted small">پیش‌نیازسنج ریاضی و هر درس دیگر؛ هر آزمون با حوزه‌هایش.</span>
        ${ro() ? '' : '<button class="btn primary" data-act="pre-new">+ ثبت آزمون پیش‌نیاز</button>'}</div>
      ${list.map(p => {
        const got = p.domains.reduce((a, x) => a + (+x.v || 0), 0), max = p.domains.reduce((a, x) => a + (+x.max || 0), 0), pct = max ? got / max * 100 : 0, lv = prereqLevel(pct);
        return `<div class="card"><div class="card-head"><div><h2 style="margin:0">پیش‌نیاز ${esc(p.subject)}</h2><div class="muted small">${esc(J.format(p.date))} · ${fa(got)} از ${fa(max)} (${fa(Math.round(pct))}٪)</div></div>
          <div class="row"><span class="tag ${lv[1]}">${lv[0]}</span>${ro() ? '' : `<button class="btn sm" data-act="pre-edit" data-id="${p.id}">ویرایش</button><button class="btn sm danger" data-act="pre-del" data-id="${p.id}">حذف</button>`}</div></div>
          ${p.note ? `<p class="muted small" style="margin:0 0 10px">${esc(p.note)}</p>` : ''}${p.domains.map(x => `<div class="tbar"><span>${esc(x.n)}</span><div class="bar"><i style="width:${x.max ? x.v / x.max * 100 : 0}%"></i></div><b class="num">${fa(x.v)} از ${fa(x.max)}</b><span></span></div>`).join('')}</div>`;
      }).join('') || `<div class="card empty-state">${empty('هنوز آزمون پیش‌نیازی ثبت نشده.')}</div>`}
      <p class="muted small">مرزها: کمتر از ۴۵٪ شکاف جدی، ۴۵ تا ۶۹٪ نیمه‌کاره، ۷۰٪ به بالا محکم.</p>${pfTest(sid, 'prereq')}${reportCard(sid, 'prereq')}`;
  }
  function prereqModal(sid, id) {
    const cur = (prof(sid).prereq || []).find(p => p.id === id);
    const rows = cur ? cur.domains : D.MATH_DOMAINS.map(([n, max]) => ({ n, max, v: '' }));
    const row = (x = { n: '', max: '', v: '' }) => `<div class="drow"><input class="input" data-f="n" value="${esc(x.n)}" placeholder="حوزه" aria-label="نام حوزه">
      <input class="input num" type="number" data-f="v" value="${x.v}" placeholder="نمره" aria-label="نمره"><span class="muted">از</span>
      <input class="input num" type="number" data-f="max" value="${x.max}" placeholder="سقف" aria-label="سقف"><button type="button" class="btn sm" data-rm aria-label="حذف حوزه">×</button></div>`;
    modal(`<h2>${cur ? 'ویرایش' : 'ثبت'} آزمون پیش‌نیاز ـ ${esc(student(sid).name)}</h2>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>درس</span><input class="input" id="p-s" value="${esc(cur?.subject || 'ریاضی')}"></label>
      <div class="field"><span>تاریخ</span>${J.field('p-d', cur?.date || today)}</div></div>
      <div class="field"><span>حوزه‌ها</span><div id="drows">${rows.map(row).join('')}</div>
        <button type="button" class="btn sm" id="add" style="margin-top:6px;align-self:flex-start">+ حوزهٔ دیگر</button></div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#add').onclick = () => root.querySelector('#drows').insertAdjacentHTML('beforeend', row());
      root.addEventListener('click', e => { if (e.target.closest('[data-rm]')) e.target.closest('.drow').remove(); });
      root.querySelector('#save').onclick = () => {
        const domains = [...root.querySelectorAll('.drow')].map(r => ({ n: r.querySelector('[data-f=n]').value.trim(), v: +r.querySelector('[data-f=v]').value || 0, max: +r.querySelector('[data-f=max]').value || 0 }))
          .filter(x => x.n && x.max > 0);
        if (!domains.length) return UI.invalid(root.querySelector('#drows [data-f=n]') || '#drows', 'دست‌کم یک حوزه با سقف نمره بنویسید.');
        if (domains.some(x => x.v > x.max || x.v < 0)) return UI.invalid([...root.querySelectorAll('.drow')].map(r => r.querySelector('[data-f=v]')).find(i => +i.value < 0 || +i.value > +i.closest('.drow').querySelector('[data-f=max]').value), 'نمرهٔ هر حوزه باید بین صفر و سقف آن باشد.');
        const rec = { subject: v(root, '#p-s') || 'ریاضی', date: v(root, '#p-d'), domains };
        if (cur) Object.assign(cur, rec); else profW(sid).prereq.push({ id: D.uid('p'), ...rec });
        done('آزمون پیش‌نیاز ثبت شد.');
      };
    });
  }
  function recordsTab(sid) {
    const recs = prof(sid).records || [], subs = d().termSubjects;
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">نمره‌های کارنامه‌های سال‌های قبل و نظر معلم‌ها.</span>
        ${ro() ? '' : '<button class="btn primary" data-act="rec-new">+ افزودن کارنامهٔ قبلی</button>'}</div>
      ${recs.length ? `<div class="card"><div class="table-wrap"><table><tr><th>دوره</th>${subs.map(s => `<th>${esc(s)}</th>`).join('')}<th>معدل</th><th><span class="sr-only">کارها</span></th></tr>
        ${recs.map(r => { const vals = subs.map(s => r.marks[s]).filter(x => x != null && x !== ''); return `<tr><td><b>${esc(r.term)}</b></td>${subs.map(s => `<td class="num" style="${r.marks[s] < 12 ? 'color:var(--bad);font-weight:700' : ''}">${r.marks[s] != null && r.marks[s] !== '' ? fa(r.marks[s]) : '—'}</td>`).join('')}
          <td class="num"><b>${vals.length ? fa(avg(vals).toFixed(2)) : '—'}</b></td><td>${ro() ? '' : `<div class="row"><button class="btn sm" data-act="rec-edit" data-id="${r.id}">ویرایش</button><button class="btn sm danger" data-act="rec-del" data-id="${r.id}">حذف</button></div>`}</td></tr>`; }).join('')}</table></div></div>
        ${recs.filter(r => r.note).map(r => `<div class="card"><h2>نظر معلم‌ها ـ ${esc(r.term)}</h2><p style="margin:0;white-space:pre-line">${esc(r.note)}</p></div>`).join('')}`
        : `<div class="card empty-state">${empty('هنوز سابقهٔ تحصیلی‌ای ثبت نشده.')}</div>`}${pfTest(sid, 'records')}${reportCard(sid, 'records')}`;
  }
  function recordModal(sid, id) {
    const cur = (prof(sid).records || []).find(r => r.id === id), subs = d().termSubjects;
    modal(`<h2>${cur ? 'ویرایش' : 'افزودن'} کارنامهٔ قبلی ـ ${esc(student(sid).name)}</h2>
      <label class="field"><span>دوره</span><input class="input" id="k-t" value="${esc(cur?.term || '')}" placeholder="مثلاً هشتم ـ نیمسال دوم"></label>
      <div class="grid g3" style="gap:0 12px">${subs.map(s => `<label class="field"><span>${esc(s)}</span><input class="input num" type="number" min="0" max="20" step="0.25" data-sub="${esc(s)}" value="${cur?.marks[s] ?? ''}"></label>`).join('')}</div>
      <label class="field"><span>نظر معلم‌ها</span><textarea class="input" id="k-n" rows="3">${esc(cur?.note || '')}</textarea></label>${Voice.button('k-n')}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#k-t')) return UI.invalid('#k-t', 'دوره را بنویسید.');
        const marks = {};
        root.querySelectorAll('[data-sub]').forEach(i => { if (i.value !== '') marks[i.dataset.sub] = Math.max(0, Math.min(20, +i.value)); });
        const rec = { term: v(root, '#k-t'), marks, note: v(root, '#k-n') };
        if (cur) Object.assign(cur, rec); else profW(sid).records.push({ id: D.uid('k'), ...rec });
        done('سابقه ثبت شد.');
      };
    });
  }

  /* ---------------- summary & strategy ---------------- */
  const SECTIONS = [['picture', 'تصویر یکپارچه'], ['strengths', 'قوت‌ها'], ['cares', 'جای مراقبت'], ['study', 'پیشنهاد برای جلسهٔ تحصیلی'],
    ['personal', 'پیشنهاد برای جلسهٔ فردی'], ['career', 'هدایت تحصیلی و رشته'], ['family', 'پیام برای خانواده']];
  const SOURCES = [['neo', 'نئو'], ['holland', 'هالند'], ['gardner', 'گاردنر'], ['prereq', 'پیش‌نیازها'], ['records', 'سوابق تحصیلی']];
  const hasSrc = (sid, k) => k === 'prereq' || k === 'records' ? (prof(sid)[k] || []).length > 0 : !!prof(sid)[k];
  function summaryTab(sid) {
    const s = prof(sid).summary;
    return `${pf(sid) ? Profile9.summary(pf(sid), ro()) : ''}<div class="card"><div class="card-head"><div><h2 style="margin:0">جمع‌بندی و راهبرد</h2>
        <div class="row small" style="margin-top:6px">${SOURCES.map(([k, l]) => `<span class="tag ${hasSrc(sid, k) ? 'ok' : 'grey'}">${hasSrc(sid, k) ? '✓' : '—'} ${l}</span>`).join('')}</div></div>
        ${ro() ? '' : `<div class="row"><button class="btn sm primary" data-act="sum-draft">ساخت پیش‌نویس از نتایج</button><button class="btn sm" data-act="sum-prompt">کپی درخواست برای هوش مصنوعی</button>
          <button class="btn sm" data-act="sum-paste">چسباندن پاسخ هوش مصنوعی</button></div>`}</div>
      ${s ? `<p class="muted small" style="margin:0">${esc(s.source === 'ai' ? 'متن از پاسخ هوش مصنوعی' : s.source === 'draft' ? 'پیش‌نویس خودکار از نتایج؛ ویرایش کنید' : 'نوشتهٔ معلم راهنما')} · ${esc(J.format(s.date))}</p>` : ''}</div>
      ${s ? SECTIONS.map(([k, l], i) => `<details class="sec card" ${i === 0 ? 'open' : ''}><summary><b>${esc(l)}</b>${ro() ? '' : `<button class="btn sm" data-act="sum-edit" data-id="${k}">ویرایش</button>`}</summary>
          <div class="sec-body">${s.sections[k] ? esc(s.sections[k]).replace(/\n/g, '<br>') : '<span class="muted">خالی</span>'}</div></details>`).join('')
        : `<div class="card empty-state">${empty('هنوز جمع‌بندی ساخته نشده. وقتی نتیجهٔ آزمون‌ها ثبت شد، پیش‌نویس بسازید یا پاسخ هوش مصنوعی را بچسبانید.')}</div>`}`;
  }
  const lvl = (val, t) => (val - t.min) / (t.max - t.min);
  // A rule-based first draft from the recorded results. Replaced by the AI's text when one is pasted.
  function draft(sid) {
    const p = prof(sid), name = student(sid).name.split(' ')[0], out = {};
    const neo = p.neo && T.neo.keys.map(([k, l]) => ({ k, l, x: lvl(p.neo.s[k], T.neo) }));
    const hol = p.holland && T.holland.keys.map(([k, l]) => ({ k, l, x: p.holland.s[k] })).sort((a, b) => b.x - a.x);
    const gar = p.gardner && T.gardner.keys.map(([k, l]) => ({ l, x: p.gardner.s[k] })).sort((a, b) => b.x - a.x);
    const pre = (p.prereq || []).map(q => ({ q, weak: q.domains.filter(x => x.max && x.v / x.max < 0.5).map(x => x.n),
      pct: q.domains.reduce((a, x) => a + x.v, 0) / Math.max(1, q.domains.reduce((a, x) => a + x.max, 0)) * 100 }));
    const rec = (p.records || []).slice(-1)[0];
    const recSorted = rec ? Object.entries(rec.marks).sort((a, b) => b[1] - a[1]) : [];
    const hi = neo ? neo.filter(x => x.x > 0.65).map(x => x.l) : [], low = neo ? neo.filter(x => x.x <= 0.35).map(x => x.l) : [];
    out.picture = [neo && `در نیمرخ نئو ${hi.length ? `«${hi.join('، ')}» بالاست` : 'هیچ عاملی خیلی بالا نیست'}${low.length ? ` و «${low.join('، ')}» پایین است` : ''}.`,
      hol && `کد هالند ${name} «${hol.slice(0, 3).map(x => x.k).join('')}» است (${hol.slice(0, 3).map(x => x.l).join('، ')}).`,
      gar && `در هوش‌های چندگانه «${gar[0].l}» و «${gar[1].l}» برجسته‌ترند.`,
      pre.length && `پیش‌نیاز ${pre.map(x => `${x.q.subject} ${Math.round(x.pct)}٪`).join('، ')}.`,
      rec && `در آخرین کارنامه (${rec.term}) بهترین نمره‌ها در ${recSorted.slice(0, 2).map(x => x[0]).join(' و ')} است.`].filter(Boolean).join(' ');
    const C = neo && neo.find(x => x.k === 'C'), N = neo && neo.find(x => x.k === 'N'), E = neo && neo.find(x => x.k === 'E');
    out.strengths = [C && C.x > 0.65 && 'منظم و مسئولیت‌پذیر است.', E && E.x > 0.65 && 'در جمع راحت و پیش‌قدم است.',
      gar && `توان «${gar[0].l}» را می‌شود در کلاس به کار گرفت.`, rec && recSorted.length && `در ${recSorted[0][0]} قوی است.`].filter(Boolean).join('\n') || '—';
    out.cares = [N && N.x > 0.65 && 'حساسیت هیجانی بالاست؛ نوسان حال و نگرانی را گاه‌به‌گاه بپرسید.', C && C.x <= 0.35 && 'نظم و برنامه را در خودش کم می‌بیند.',
      ...pre.filter(x => x.weak.length).map(x => `در پیش‌نیاز ${x.q.subject} این حوزه‌ها ضعیف‌اند: ${x.weak.join('، ')}.`),
      rec && recSorted.length && recSorted[recSorted.length - 1][1] < 14 && `${recSorted[recSorted.length - 1][0]} ضعیف‌ترین درس آخرین کارنامه است.`].filter(Boolean).join('\n') || '—';
    out.study = [...pre.filter(x => x.weak.length).map(x => `ترمیم ${x.weak.join(' و ')} در ${x.q.subject} با تمرین کوتاه و منظم.`),
      C && C.x <= 0.35 && 'برنامهٔ هفتگی ساده با کارهای کوچک و تیک‌زدنی.', 'یک هدف قابل‌اندازه‌گیری برای چهار هفتهٔ آینده.'].filter(Boolean).join('\n');
    out.personal = [N && N.x > 0.65 && 'از چیزهایی بپرسید که حالش را بالا و پایین می‌برد.', E && E.x <= 0.35 && 'گفت‌وگو را با موضوع‌های مورد علاقه‌اش شروع کنید.',
      'یک مسئولیت کوچک کلاسی که خودش انتخاب کند.'].filter(Boolean).join('\n');
    out.career = hol ? `علاقه‌های اصلی: ${hol.slice(0, 3).map(x => x.l).join('، ')}. پیش از انتخاب رشته، با نمره‌های پایه و نظر خانواده سنجیده شود.` : 'پس از آزمون هالند تکمیل می‌شود.';
    out.family = `${name} ${hi.length ? `در «${hi[0]}» قوی است` : 'توانایی‌های خوبی دارد'}؛ همراهی خانه با برنامهٔ منظم و گفت‌وگوی آرام کمک می‌کند.`;
    return out;
  }
  function prompt(sid) {
    const p = prof(sid), s = student(sid);
    const lines = [`جمع‌بندی و راهبرد مشاوره برای دانش‌آموز پایهٔ ${D.GRADE_NAME[d().grade]} (${className(s.cls)}) بنویس. به فارسی، کوتاه و کاربردی.`,
      'خروجی دقیقاً با این عنوان‌ها و هر عنوان در یک خط که با ## شروع شود:', ...SECTIONS.map(([, l]) => `## ${l}`), '', 'داده‌ها:'];
    if (p.neo) lines.push('نئو (۱۰ تا ۵۰): ' + T.neo.keys.map(([k, l]) => `${l} ${p.neo.s[k]}`).join('، '));
    if (p.holland) lines.push('هالند (۰ تا ۵۲): ' + T.holland.keys.map(([k, l]) => `${l}(${k}) ${p.holland.s[k]}`).join('، '));
    if (p.gardner) lines.push('گاردنر (۸ تا ۴۰): ' + T.gardner.keys.map(([k, l]) => `${l} ${p.gardner.s[k]}`).join('، '));
    (p.prereq || []).forEach(q => lines.push(`پیش‌نیاز ${q.subject}: ` + q.domains.map(x => `${x.n} ${x.v} از ${x.max}`).join('، ')));
    (p.records || []).forEach(r => lines.push(`کارنامهٔ ${r.term}: ` + Object.entries(r.marks).map(([k, x]) => `${k} ${x}`).join('، ') + (r.note ? ` | نظر معلم‌ها: ${r.note}` : '')));
    lines.push('', 'نام دانش‌آموز را ننویس؛ فقط «دانش‌آموز».');
    return lines.join('\n');
  }
  function parseAi(text) {
    const out = {}; let cur = null;
    text.split(/\r?\n/).forEach(line => {
      const h = line.replace(/^#+\s*/, '').replace(/[:：]\s*$/, '').trim();
      const sec = /^#|^\*\*/.test(line.trim()) && SECTIONS.find(([, l]) => h.replace(/\*/g, '').includes(l));
      if (sec) { cur = sec[0]; out[cur] = ''; return; }
      if (cur) out[cur] += (out[cur] ? '\n' : '') + line;
    });
    Object.keys(out).forEach(k => { out[k] = out[k].trim(); });
    return out;
  }

  /* ---------------- counselling sessions ---------------- */
  const SESS = { tahsili: ['تحصیلی', 'violet'], fardi: ['فردی', 'teal'], khanevade: ['خانواده', 'rose'] };
  // Sessions of each kind: those in the profile file (grade 9 of Mehr-e Hashtom) plus those entered here.
  function sessCounts(sid) {
    const c = pf(sid) ? Profile9.counts(pf(sid)) : { fardi: 0, tahsili: 0, khanevade: 0 };
    d().sessions.forEach(n => { if (n.sid === sid && n.type in c) c[n.type]++; });
    return c;
  }
  function sessionsTab(sid) {
    const all = d().sessions.filter(n => n.sid === sid).sort((a, b) => b.date.localeCompare(a.date));
    // The principal sees a session only after the counsellor ticks «مدیر ببیند».
    const list = ro() ? all.filter(n => n.share) : all, hidden = all.length - list.length;
    const c = sessCounts(sid), asOf = pf(sid)?.content?.sessionsInsight?.asOf;
    const stat = t => { const l = all.filter(n => n.type === t); return kpi(`جلسهٔ ${SESS[t][0]}`, fa(c[t]), l.length ? `آخرین: ${J.format(l[0].date)}` : c[t] ? `تا ${esc(fa(asOf || ''))}` : 'هنوز نداشته', '', SESS[t][1]); };
    const p = prof(sid), editing = state.editSession && list.find(n => n.id === state.editSession);
    return `<div class="grid g3">${stat('tahsili')}${stat('fardi')}${stat('khanevade')}</div>${pf(sid) && !ro() ? Profile9.insight(pf(sid)) : ''}
      <div class="card"><div class="card-head"><h2 style="margin:0">توصیف معلم راهنمای سال قبل</h2>${ro() ? '' : '<button class="btn sm" data-act="prev-edit">ویرایش</button>'}</div>
        <p style="margin:0;white-space:pre-line" class="${p.prevDesc ? '' : 'muted'}">${p.prevDesc ? esc(p.prevDesc) : 'هنوز ثبت نشده.'}</p></div>
      ${ro() ? '' : `<div class="row" style="margin-top:16px"><button class="btn" data-act="rem-new" data-sid="${sid}">ثبت یادآور جلسه</button></div>${sessionForm(sid, editing)}`}
      <div class="sec-head" style="margin-top:22px"><h2>تاریخچهٔ جلسه‌ها</h2><span class="muted small">جدیدترین بالا</span></div>
      ${ro() && hidden ? `<p class="note">${fa(hidden)} جلسه محرمانه است؛ فقط جلسه‌هایی دیده می‌شوند که معلم راهنما «مدیر ببیند» را برایشان زده باشد.</p>` : ''}
      ${list.length ? `<ul class="timeline card">${list.map(n => `<li>
        <div class="spread"><div><span class="tag" style="background:var(--${SESS[n.type][1]}-bg);color:var(--${SESS[n.type][1]})">${SESS[n.type][0]}</span> <b>${esc(n.topic || n.title || 'بدون موضوع')}</b>${n.share && !ro() ? ` <span class="tag ${n.shareSeen ? 'ok' : 'blue'}">${n.shareSeen ? 'مدیر دید' : 'برای مدیر فرستاده شد'}</span>` : ''}</div>
          ${ro() ? '' : `<div class="row"><button class="btn sm" data-act="ses-edit" data-id="${n.id}">ویرایش</button><button class="btn sm danger" data-act="ses-del" data-id="${n.id}">حذف</button></div>`}</div>
        <div class="meta">${esc(J.format(n.date))}${n.type === 'khanevade' ? ` · حاضران: ${[n.parents?.father && 'پدر', n.parents?.mother && 'مادر', n.others].filter(Boolean).map(esc).join('، ') || '—'}` : ''}</div>
        <p style="margin:6px 0 0;white-space:pre-line">${esc(n.text)}</p>
        ${(n.actions || []).length ? `<div class="next"><b>اقدام‌های بعدی:</b>${n.actions.map(a => `<label class="act-line"><input type="checkbox" ${a.done ? 'checked' : ''} ${ro() ? 'disabled' : ''} data-actdone="${n.id}|${a.id}">
          <span style="${a.done ? 'text-decoration:line-through;color:var(--ink3)' : ''}">${esc(a.text)}${a.due ? ` <span class="muted small">(${esc(J.format(a.due, false))})</span>` : ''}</span></label>`).join('')}</div>` : ''}
      </li>`).join('')}</ul>` : `<div class="card">${empty('هنوز جلسه‌ای ثبت نشده.')}</div>`}${pf(sid) ? Profile9.seeds(pf(sid), ro()) : ''}`;
  }
  function sessionForm(sid, n) {
    const type = n?.type || 'tahsili', acts = n?.actions?.length ? n.actions : [{ text: '', due: '' }];
    const actRow = (a, i) => `<div class="drow arow"><input class="input" data-a="text" value="${esc(a.text || '')}" placeholder="اقدام بعدی" aria-label="اقدام بعدی">
      <label class="small muted"><input type="checkbox" data-a="rem" ${a.due ? 'checked' : ''}> یادآور</label>${J.field('a-due-' + i + '-' + Date.now().toString(36), a.due || D.shift(7))}
      <button type="button" class="btn sm" data-rm aria-label="حذف اقدام">×</button></div>`;
    return `<form class="card sform" id="sform" data-sid="${sid}" data-edit="${n?.id || ''}" style="margin-top:12px" onsubmit="return false">
      <div class="card-head"><h2 style="margin:0">${n ? 'ویرایش جلسه' : 'جلسهٔ تازه'}</h2>${n ? '<button type="button" class="btn sm" data-act="ses-cancel">انصراف از ویرایش</button>' : ''}</div>
      <fieldset class="seg-radio"><legend class="small muted">نوع جلسه</legend>${Object.entries(SESS).map(([k, [l]]) => `<label><input type="radio" name="s-type" value="${k}" ${k === type ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <div class="fam" ${type === 'khanevade' ? '' : 'hidden'}><div class="row" style="margin-top:10px"><span class="small muted">حاضران:</span>
        <label class="chip"><input type="checkbox" id="s-father" ${n?.parents?.father ? 'checked' : ''}>پدر</label><label class="chip"><input type="checkbox" id="s-mother" ${n?.parents?.mother ? 'checked' : ''}>مادر</label>
        <input class="input" id="s-others" value="${esc(n?.others || '')}" placeholder="حاضران دیگر (مثلاً پدربزرگ، برادر)" style="flex:1;min-width:180px"></div></div>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>تاریخ جلسه</span>${J.field('s-date', n?.date || today)}</div>
        <label class="field"><span>موضوع</span><input class="input" id="s-topic" value="${esc(n?.topic || '')}"></label></div>
      <label class="field"><span>شرح جلسه</span><textarea class="input" id="s-text" rows="5">${esc(n?.text || '')}</textarea></label>${Voice.button('s-text')}
      <div class="field"><span>اقدام‌های بعدی و پیگیری</span><div id="arows">${acts.map(actRow).join('')}</div>
        <button type="button" class="btn sm" id="add-act" style="margin-top:6px;align-self:flex-start">+ اقدام دیگر</button></div>
      <label class="share-line"><input type="checkbox" id="s-share" ${n?.share ? 'checked' : ''}><span><b>مدیر هم ببیند</b><span class="muted small"> · فقط اگر لازم است؛ جلسه در بخش یادآورهای مدیر می‌آید. بدون این تیک، مدیر متن جلسه را نمی‌بیند.</span></span></label>
      <div class="row" style="margin-top:16px"><button type="button" class="btn primary" data-act="ses-save">${n ? 'ذخیرهٔ تغییرات' : 'ثبت جلسه'}</button></div>
      <template id="arow-tpl">${actRow({ text: '', due: '' }, 'n')}</template></form>`;
  }
  function saveSession() {
    const f = document.getElementById('sform'), sid = f.dataset.sid, id = f.dataset.edit;
    const text = v(f, '#s-text'); if (!text) return UI.invalid('#s-text', 'شرح جلسه را بنویسید.');
    const type = f.querySelector('input[name=s-type]:checked').value;
    const actions = [...f.querySelectorAll('.arow')].map(r => ({ text: r.querySelector('[data-a=text]').value.trim(), rem: r.querySelector('[data-a=rem]').checked, due: r.querySelector('input[type=hidden]').value }))
      .filter(a => a.text).map(a => ({ id: D.uid('x'), text: a.text, due: a.rem ? a.due : '', done: false }));
    const rec = { type, date: v(f, '#s-date'), topic: v(f, '#s-topic'), title: v(f, '#s-topic'), text, actions, next: actions[0]?.text || '',
      parents: type === 'khanevade' ? { father: f.querySelector('#s-father').checked, mother: f.querySelector('#s-mother').checked } : {},
      others: type === 'khanevade' ? v(f, '#s-others') : '', share: f.querySelector('#s-share').checked };
    const x = d();
    const prev = id && x.sessions.find(s => s.id === id);
    // Newly shared, or changed after sharing: it shows again as unseen in the principal's reminders.
    if (rec.share && (!prev || !prev.share || prev.text !== rec.text)) { rec.shareSeen = false; rec.sharedAt = today; }
    if (id) { const n = x.sessions.find(s => s.id === id); rec.actions = rec.actions.map(a => ({ ...a, done: (n.actions || []).some(o => o.text === a.text && o.done) })); Object.assign(n, rec); }
    else x.sessions.push({ id: D.uid('n'), sid, by: ctx.actor(), ...rec });
    // Actions with a date also become reminders on the overview.
    actions.filter(a => a.due).forEach(a => { if (!x.reminders.some(r => r.text === a.text && r.sid === sid && !r.done)) x.reminders.push({ id: D.uid('r'), text: a.text, date: a.due, sid, done: false }); });
    state.editSession = null; save(); render(); toast(id ? 'جلسه ویرایش شد.' : 'جلسه ثبت شد.');
  }

  /* ---------------- sessions shared with the principal ---------------- */
  // Every grade's sessions that a counsellor marked «مدیر ببیند», unseen first; shown on the principal's desk.
  function sharedSessions() {
    const s = school();
    return D.gradesOf(s).flatMap(g => { const x = D.get(s.id, g); return x.sessions.filter(n => n.share).map(n => ({ n, g, st: x.students.find(t => t.id === n.sid) })); })
      .sort((a, b) => (a.n.shareSeen - b.n.shareSeen) || (b.n.sharedAt || b.n.date).localeCompare(a.n.sharedAt || a.n.date));
  }
  // extra: the principal's own reminder cards (e.g. a family meeting waiting for its record), shown first.
  function principalReminders(extra = '') {
    const list = sharedSessions(), unseen = list.filter(x => !x.n.shareSeen).length;
    // Nothing to remind: no empty box on top of the desk.
    if (!list.length && !extra) return '';
    return `<section aria-label="یادآورهای مدیر" style="margin-bottom:20px"><div class="sec-head"><h2>یادآورها</h2><span class="muted small">${fa(unseen)} جلسهٔ دیده‌نشده از معلمان راهنما</span></div>
      ${list.length || extra ? `<div class="rstrip" tabindex="0">${extra}${list.slice(0, 12).map(({ n, g, st }) => `<article class="rcard ${n.shareSeen ? '' : 'now'}"><div class="spread">
          <span class="tag" style="background:var(--${SESS[n.type][1]}-bg);color:var(--${SESS[n.type][1]})">${SESS[n.type][0]}</span><span class="muted small">${esc(J.format(n.date))}</span></div>
          <b>${esc(st?.name || '')}</b><span class="muted small">پایهٔ ${esc(D.GRADE_NAME[g])}${n.topic ? ' · ' + esc(n.topic) : ''}</span>
          <div class="row"><button class="btn sm primary" data-act="shr-open" data-id="${g}|${n.id}">خواندن</button>${n.shareSeen ? '<span class="tag ok">دیده شد</span>' : ''}</div></article>`).join('')}</div>`
        : '<div class="card"><p class="muted" style="margin:0">یادآوری نیست. جلسه‌هایی که معلم راهنما با تیک «مدیر ببیند» بفرستد و شرح جلسه‌های شما با خانواده‌ها این‌جا می‌آید.</p></div>'}</section>`;
  }
  function sharedModal(key) {
    const [g, id] = key.split('|'), x = D.get(school().id, +g), n = x.sessions.find(s => s.id === id), st = x.students.find(t => t.id === n.sid);
    if (!n.shareSeen) { n.shareSeen = true; save(); }
    modal(`<h2>جلسهٔ ${SESS[n.type][0]} · ${esc(st?.name || '')}</h2><p class="muted small">پایهٔ ${esc(D.GRADE_NAME[g])} · ${esc(J.format(n.date))}${n.topic ? ' · ' + esc(n.topic) : ''}</p>
      <p style="white-space:pre-line">${esc(n.text)}</p>
      ${(n.actions || []).length ? `<div class="next"><b>اقدام‌های بعدی:</b><ul>${n.actions.map(a => `<li>${esc(a.text)}${a.done ? ' ✓' : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="row" style="margin-top:16px"><a class="btn" href="#/g/${g}/student/${n.sid}">پروندهٔ دانش‌آموز</a><button class="btn primary" data-close>بستن</button></div>`, null, () => render());
  }

  // Items for the unified inbox: sessions shared with the principal; the counsellor's overdue follow-ups and due reminders.
  function feed() {
    if (ro()) return [];
    const items = [];
    if (ctx.actor() === 'principal') sharedSessions().forEach(({ n, g, st }) => items.push({ key: `sh:${g}:${n.id}:${n.sharedAt || n.date}`, type: 'session',
      title: `جلسهٔ ${SESS[n.type][0]} ${st?.name || ''}`, text: `از معلم راهنمای پایهٔ ${D.GRADE_NAME[g]}${n.topic ? ' · ' + n.topic : ''}`, at: n.sharedAt || n.date, unread: !n.shareSeen, open: () => sharedModal(`${g}|${n.id}`) }));
    if (ctx.role() === 'counselor') {
      const x = d();
      x.sessions.forEach(n => (n.actions || []).filter(a => a.due && a.due < today && !a.done).forEach(a => items.push({ key: `fu:${n.id}:${a.id}`, type: 'follow',
        title: `پیگیری عقب‌افتاده · ${student(n.sid)?.name || ''}`, text: a.text, at: a.due, href: hrefOf('student', n.sid), unread: true, read: () => { state.tab = 'sessions'; } })));
      x.reminders.filter(r => !r.done && r.date <= today).forEach(r => items.push({ key: `rm:${r.id}:${r.date}`, type: 'reminder', title: r.date < today ? 'یادآور گذشته' : 'یادآور امروز', text: r.text, at: r.date, href: hrefOf('overview'), unread: true }));
    }
    return items;
  }

  /* ======================= behaviour observations ======================= */
  const PLACES = ['کلاس', 'حیاط', 'زنگ تفریح', 'نمازخانه', 'اردو', 'دیگر'];
  const TONES = { pos: ['مثبت', 'ok'], neu: ['خنثی', 'grey'], neg: ['نگران‌کننده', 'bad'] };
  function cobs() {
    const x = d(), list = x.obs.filter(o => !state.obsTone || o.tone === state.obsTone).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const cnt = t => x.obs.filter(o => o.tone === t).length;
    return `${ro() ? '' : `<form class="card" id="oform" onsubmit="return false"><h2>ثبت مشاهدهٔ تازه</h2>
      <fieldset style="border:0;padding:0;margin:0"><legend class="small muted">دانش‌آموز یا دانش‌آموزان</legend>${chips('ost')}</fieldset>
      <div class="grid g4" style="gap:0 12px"><div class="field"><span>تاریخ</span>${J.field('o-date', today)}</div>
        <label class="field"><span>ساعت</span><input class="input num" type="time" id="o-time" value="${new Date().toTimeString().slice(0, 5)}"></label>
        <label class="field"><span>زنگ</span><select class="input" id="o-bell"><option value="">—</option>${Array.from({ length: BL().n }, (_, i) => `<option value="${i + 1}">زنگ ${fa(i + 1)}</option>`).join('')}</select></label>
        <label class="field"><span>مکان</span><select class="input" id="o-place">${PLACES.map(p => `<option>${p}</option>`).join('')}</select></label></div>
      <fieldset class="seg-radio" style="margin-top:12px"><legend class="small muted">ارزیابی</legend>${Object.entries(TONES).map(([k, [l]]) => `<label><input type="radio" name="o-tone" value="${k}" ${k === 'neu' ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <label class="field"><span>چه دیدید؟</span><textarea class="input" id="o-text" rows="3"></textarea></label>${Voice.button('o-text')}
      <div class="row" style="margin-top:14px"><button type="button" class="btn primary" data-act="obs-save">ثبت مشاهده</button></div></form>`}
      <div class="sec-head" style="margin-top:22px"><h2>مشاهده‌های ثبت‌شده</h2>
        <div class="row" role="group" aria-label="فیلتر">${[['', `همه (${fa(x.obs.length)})`], ...Object.entries(TONES).map(([k, [l]]) => [k, `${l} (${fa(cnt(k))})`])].map(([k, l]) =>
          `<button class="btn sm ${state.obsTone === k ? 'primary' : ''}" data-act="obs-filter" data-id="${k}" aria-pressed="${state.obsTone === k}">${l}</button>`).join('')}</div></div>
      <div class="card">${list.length ? `<div class="table-wrap"><table>${list.map(o => `<tr><td style="width:130px" class="small"><b>${esc(J.format(o.date, false))}</b><div class="muted">${[o.time, o.bell && `زنگ ${fa(o.bell)}`, o.place].filter(Boolean).map(esc).join(' · ')}</div></td>
        <td>${o.sids.map(id => student(id) ? `<a href="${hrefOf('student', id)}">${esc(student(id).name)}</a>` : '—').join('، ')}<div style="margin-top:2px">${esc(o.text)}</div></td>
        <td><span class="tag ${TONES[o.tone][1]}">${TONES[o.tone][0]}</span></td><td>${ro() ? '' : `<button class="btn sm danger" data-act="obs-del" data-id="${o.id}" aria-label="حذف">حذف</button>`}</td></tr>`).join('')}</table></div>` : empty('مشاهده‌ای ثبت نشده.')}</div>`;
  }

  /* ======================= discipline ======================= */
  const rep = () => org().discReport;
  function discReg() {
    const x = d(), recs = x.discipline.slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<p class="note">فهرست موارد و امتیازهای مدرسه. هر ۱۵ روز مدرسه بدون مورد تازه، از روز شانزدهم روزی ۰٫۵ امتیاز از منفی‌ها کم می‌شود (تا صفر)؛ امتیاز جدیت فقط وقتی حساب می‌شود که جمع دانش‌آموز از −۹۰ کمتر نباشد.</p>
      ${ro() ? '' : `<form class="card" id="dform" onsubmit="return false" style="margin-top:16px"><h2>ثبت مورد انضباطی</h2>
        <fieldset style="border:0;padding:0;margin:0"><legend class="small muted">دانش‌آموز یا دانش‌آموزان</legend>${chips('dst')}</fieldset>
        <div class="grid g3" style="gap:0 12px">${Disc.picker('d-cat', x.discCats)}
          <div class="field"><span>تاریخ</span>${J.field('d-date', today)}</div>
          <label class="field"><span>زنگ</span><select class="input" id="d-bell"><option value="">—</option>${Array.from({ length: BL().n }, (_, i) => `<option value="${i + 1}">زنگ ${fa(i + 1)}</option>`).join('')}</select></label></div>
        <label class="field"><span>توضیح</span><input class="input" id="d-note"></label>
        <div class="row" style="margin-top:14px"><button type="button" class="btn primary" data-act="disc-save">ثبت</button></div></form>`}
      <div class="sec-head" style="margin-top:22px"><h2>موارد ثبت‌شده</h2><span class="muted small">${fa(recs.length)} مورد</span></div>
      <div class="card">${recs.length ? `<div class="table-wrap"><table><tr><th>تاریخ</th><th>دانش‌آموز</th><th>مورد</th><th>امتیاز</th><th><span class="sr-only">حذف</span></th></tr>${recs.map(r => {
        const c = Disc.catOf(x, r), p = Disc.recPts(x, r);
        return `<tr><td class="small">${esc(J.format(r.date, false))}${r.bell ? ` · زنگ ${fa(r.bell)}` : ''}</td><td>${student(r.sid) ? esc(student(r.sid).name) : '—'}</td>
          <td>${esc(c.name)}${r.note ? `<div class="muted small">${esc(r.note)}</div>` : ''}</td><td><span class="tag ${p < 0 ? 'bad' : 'ok'} num">${Disc.sign(p)}</span></td>
          <td>${ro() ? '' : `<button class="btn sm danger" data-act="disc-del" data-id="${r.id}">حذف</button>`}</td></tr>`;
      }).join('')}</table></div>` : empty('موردی ثبت نشده.')}</div>`;
  }
  function cardSheet(sid) {
    const s = student(sid), x = d(), r = rep();
    const recs = x.discipline.filter(q => q.sid === sid).map(q => ({ q, c: Disc.catOf(x, q), p: Disc.recPts(x, q) })).sort((a, b) => a.q.date.localeCompare(b.q.date));
    const st = Disc.standing(x, sid);
    return `<div class="rc-sheet" id="rc-sheet">
      <div class="rc-top"><div class="rc-logo">${r.logo ? `<img src="${esc(r.logo)}" alt="آرم مدرسه">` : Shell.logoImg(school(), '', esc(school().name.replace(/^مجتمع آموزشی\s*/, '').slice(0, 2)))}</div>
        <div><div class="rc-school">${esc(school().name)}</div><h2 class="rc-title">${esc(r.title || 'کارنامهٔ انضباطی')}</h2></div><div class="rc-date">تاریخ صدور<br><b>${esc(J.format(today))}</b></div></div>
      <div class="rc-info"><div>نام و نام خانوادگی: <b>${esc(s.name)}</b></div><div>کلاس: <b>${esc(className(s.cls))}</b></div><div>پایه: <b>${esc(D.GRADE_NAME[x.grade])}</b></div></div>
      <table class="rc-table"><thead><tr><th style="width:50px">ردیف</th><th style="width:130px">تاریخ</th><th>مورد انضباطی</th><th style="width:110px">امتیاز</th></tr></thead>
        <tbody>${recs.map((o, i) => `<tr><td>${fa(i + 1)}</td><td>${esc(J.format(o.q.date))}</td><td>${esc(o.c.name)}${o.q.note ? ` ـ ${esc(o.q.note)}` : ''}</td><td>${Disc.sign(o.p)}</td></tr>`).join('')
          || '<tr><td colspan="4" style="text-align:center">موردی ثبت نشده است.</td></tr>'}</tbody>
        <tfoot>${st.auto ? `<tr><td colspan="3">امتیاز مثبت فاصلهٔ بیش از ۱۵ روز بین موارد</td><td>${Disc.sign(st.auto)}</td></tr>` : ''}
          ${st.held ? `<tr><td colspan="3">امتیاز جدیتِ حساب‌نشده (جمع زیر −۹۰)</td><td>(${Disc.sign(st.held)})</td></tr>` : ''}
          <tr><td colspan="3">جمع امتیاز انضباطی</td><td>${Disc.sign(st.total)}</td></tr>
          ${st.step ? `<tr><td colspan="4">برخورد مدرسه (${Disc.sign(st.step[0])}): ${esc(st.step[1])}</td></tr>` : ''}</tfoot></table>
      ${r.footer ? `<p class="rc-foot">${esc(r.footer)}</p>` : ''}
      <div class="rc-sign"><div>${esc(r.signer || 'معلم راهنما')}<br><span>امضا</span></div><div>مدیر مدرسه<br><span>امضا</span></div></div></div>`;
  }
  function discCard() {
    const x = d();
    if (!state.cardSid || !student(state.cardSid)) state.cardSid = x.students[0]?.id || '';
    return `<div class="card"><div class="row"><label class="sr-only" for="dc-st">دانش‌آموز</label><select class="input" id="dc-st" style="min-width:220px">${ctx.studentOptions(state.cardSid)}</select>
        <button class="btn primary" data-act="disc-pdf">دانلود PDF</button><button class="btn" data-act="disc-print">چاپ</button>
        </div></div>

      ${state.cardSid ? `<div class="card" style="margin-top:12px">${Disc.summary(x, state.cardSid)}</div>` : ''}
      <div class="rc-wrap">${state.cardSid ? cardSheet(state.cardSid) : empty('دانش‌آموزی نیست.')}</div>`;
  }
  function discSettings() {
    const r = rep();
    return `<div class="grid g2"><div class="card"><h2>کارنامهٔ انضباطی</h2>
        <label class="field"><span>عنوان کارنامه</span><input class="input" id="ds-title" value="${esc(r.title)}"></label>
        <label class="field"><span>امضاکننده</span><input class="input" id="ds-signer" value="${esc(r.signer)}"></label>
        <label class="field"><span>متن پایین کارنامه</span><textarea class="input" id="ds-footer" rows="2">${esc(r.footer)}</textarea></label>
        <div class="field"><span>آرم مدرسه</span><div class="row">${r.logo ? `<img src="${esc(r.logo)}" alt="آرم فعلی" style="width:56px;height:56px;object-fit:contain;border-radius:10px;border:1px solid var(--line)">` : '<span class="muted small">آرمی بارگذاری نشده</span>'}
          <label class="btn sm">انتخاب تصویر<input type="file" accept="image/*" id="ds-logo" hidden></label>${r.logo ? '<button class="btn sm danger" data-act="logo-del">حذف آرم</button>' : ''}</div></div>
        ${ro() ? '' : '<div class="row" style="margin-top:16px"><button class="btn primary" data-act="ds-save">ذخیره</button></div>'}</div>
      <div><h2 style="margin:0 0 8px">موارد انضباطی و امتیازهای پایهٔ ${esc(D.GRADE_NAME[d().grade])}</h2>${ctx.catEditor(d(), false)}</div></div>`;
  }
  // PDF of the discipline card through html2pdf (loaded on first use); falls back to the print dialog.
  const pdf = (el, name) => UI.pdf(el, name);

  function printEl(el) {
    const w = window.open('', '_blank'); if (!w) return toast('اجازهٔ پنجرهٔ تازه را بدهید.');
    w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>چاپ</title><link rel="stylesheet" href="assets/style.css"><link rel="stylesheet" href="assets/school.css"><link rel="stylesheet" href="assets/counselor.css"></head><body style="background:#fff;padding:16px">${el.outerHTML}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  /* ======================= wiring ======================= */
  const findS = id => d().sessions.find(n => n.id === id);
  const act = {
    'tw-open': b => TeacherWeek.open(school().id, D.gradesOf(school()), b.dataset.id, d().grade),
    'rem-new': b => reminderModal({}, b.dataset.sid || ''),
    'rem-edit': b => reminderModal(d().reminders.find(r => r.id === b.dataset.id)),
    'rem-done': b => { d().reminders.find(r => r.id === b.dataset.id).done = true; save(); render(); toast('انجام شد.'); },
    'day': b => { state.day = +b.dataset.id; render(); },
    'sched-edit': () => { if (!state.edit) { state.edit = true; state.draft = {}; render(); } },
    'sched-cancel': async () => {
      if (draftCount() && !await UI.ask('انصراف از ویرایش', `${fa(draftCount())} تغییر ذخیره‌نشده کنار گذاشته شود؟`, 'کنار بگذار')) return;
      state.edit = false; state.draft = {}; state.sel = null; render();
    },
    'sched-save': saveSchedule,
    'al-open': b => {
      const k = b.dataset.id, open = state.alertOpen !== k; state.alertOpen = open ? k : '';
      document.querySelectorAll('.al-tile').forEach(t => t.setAttribute('aria-expanded', String(open && t.dataset.id === k)));
      document.querySelectorAll('.al-drawer').forEach(dr => dr.classList.toggle('open', open && dr.id === 'al-d-' + k));
    },
    'cell-pick': pickCell,
    'cell-tch': b => setTeacher(b.dataset.v),
    'cell-tch-other': otherTeacher,
    'cell-set': b => setCell(b.dataset.v),
    'cell-other': otherSubject,
    'file-tab': b => { state.tab = b.dataset.id; state.editSession = null; render(); },
    'test-edit': b => testModal(ctx.arg(), b.dataset.id),
    'test-del': b => { const p = profW(ctx.arg()), k = b.dataset.id, old = p[k]; delete p[k]; save(); render(); UI.undo('نتیجهٔ آزمون حذف شد.', () => { p[k] = old; }, () => { save(); render(); }); },
    'pre-new': () => prereqModal(ctx.arg()),
    'pre-edit': b => prereqModal(ctx.arg(), b.dataset.id),
    'pre-del': b => { const back = UI.drop(profW(ctx.arg()).prereq, x => x.id === b.dataset.id); save(); render(); UI.undo('آزمون پیش‌نیاز حذف شد.', back, () => { save(); render(); }); },
    'rec-new': () => recordModal(ctx.arg()),
    'rec-edit': b => recordModal(ctx.arg(), b.dataset.id),
    'rec-del': b => { const back = UI.drop(profW(ctx.arg()).records, x => x.id === b.dataset.id); save(); render(); UI.undo('کارنامهٔ قبلی حذف شد.', back, () => { save(); render(); }); },
    'sum-draft': async () => {
      const sid = ctx.arg();
      if (!SOURCES.some(([k]) => hasSrc(sid, k))) return toast('هنوز نتیجه‌ای برای ساخت پیش‌نویس ثبت نشده.');
      if (prof(sid).summary && !await UI.ask('ساخت دوباره', 'جمع‌بندی فعلی با پیش‌نویس تازه جایگزین شود؟', 'جایگزین کن')) return;
      profW(sid).summary = { date: today, source: 'draft', sections: draft(sid) }; save(); render(); toast('پیش‌نویس ساخته شد.');
    },
    'sum-prompt': async () => {
      const text = prompt(ctx.arg());
      try { await navigator.clipboard.writeText(text); toast('درخواست کپی شد؛ در هوش مصنوعی بچسبانید و پاسخ را برگردانید.'); }
      catch (e) { modal(`<h2>درخواست برای هوش مصنوعی</h2><textarea class="input" rows="12" style="width:100%" readonly>${esc(text)}</textarea><div class="row" style="margin-top:12px"><button class="btn" data-close>بستن</button></div>`); }
    },
    'sum-paste': () => modal(`<h2>پاسخ هوش مصنوعی</h2><p class="muted small">پاسخ را با همان عنوان‌های ## بچسبانید.</p><textarea class="input" id="ai" rows="12" style="width:100%"></textarea>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="save">جایگزین کن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const s = parseAi(root.querySelector('#ai').value);
        if (!Object.keys(s).length) return toast('عنوان‌ها پیدا نشد؛ هر بخش باید با ## و نام بخش شروع شود.');
        profW(ctx.arg()).summary = { date: today, source: 'ai', sections: s }; done(`${fa(Object.keys(s).length)} بخش ثبت شد.`);
      };
    }),
    'sum-edit': b => {
      const sid = ctx.arg(), key = b.dataset.id, s = profW(sid).summary, label = SECTIONS.find(x => x[0] === key)[1];
      modal(`<h2>${esc(label)}</h2><textarea class="input" id="se" rows="8" style="width:100%">${esc(s.sections[key] || '')}</textarea>${Voice.button('se')}
        <div class="row" style="margin-top:12px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
        root.querySelector('#save').onclick = () => { s.sections[key] = root.querySelector('#se').value.trim(); s.source = s.source === 'ai' ? 'ai' : 'manual'; done('ذخیره شد.'); };
      });
    },
    'prev-edit': () => {
      const p = profW(ctx.arg());
      modal(`<h2>توصیف معلم راهنمای سال قبل</h2><textarea class="input" id="pd" rows="7" style="width:100%">${esc(p.prevDesc || '')}</textarea>${Voice.button('pd')}
        <div class="row" style="margin-top:12px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
        root.querySelector('#save').onclick = () => { p.prevDesc = root.querySelector('#pd').value.trim(); done('ذخیره شد.'); };
      });
    },
    'ses-save': saveSession,
    'shr-open': b => sharedModal(b.dataset.id),
    'ses-edit': b => { state.editSession = b.dataset.id; render(); document.getElementById('sform')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'ses-cancel': () => { state.editSession = null; render(); },
    'ses-del': b => { const back = UI.drop(d().sessions, n => n.id === b.dataset.id); save(); render(); UI.undo('جلسه حذف شد.', back, () => { save(); render(); }); },
    'obs-save': () => {
      const f = document.getElementById('oform'), sids = [...f.querySelectorAll('input[name=ost]:checked')].map(i => i.value);
      if (!sids.length) return UI.invalid(f.querySelector('input[name=ost]')?.closest('.chips, fieldset'), 'دست‌کم یک دانش‌آموز را انتخاب کنید.');
      if (!v(f, '#o-text')) return UI.invalid('#o-text', 'بنویسید چه دیدید.');
      d().obs.push({ id: D.uid('o'), sids, date: v(f, '#o-date'), time: v(f, '#o-time'), bell: +v(f, '#o-bell') || null, place: v(f, '#o-place'),
        tone: f.querySelector('input[name=o-tone]:checked').value, text: v(f, '#o-text'), by: ctx.actor() });
      save(); render(); toast('مشاهده ثبت شد.');
    },
    'obs-filter': b => { state.obsTone = b.dataset.id; render(); },
    'obs-del': b => { const back = UI.drop(d().obs, o => o.id === b.dataset.id); save(); render(); UI.undo('مشاهده حذف شد.', back, () => { save(); render(); }); },
    'disc-save': () => {
      const f = document.getElementById('dform'), sids = [...f.querySelectorAll('input[name=dst]:checked')].map(i => i.value);
      if (!sids.length) return UI.invalid(f.querySelector('input[name=dst]')?.closest('.chips, fieldset'), 'دست‌کم یک دانش‌آموز را انتخاب کنید.');
      const pick = Disc.read(f, 'd-cat', d().discCats); if (!pick) return;
      sids.forEach(sid => d().discipline.push({ id: D.uid('x'), sid, ...pick, date: v(f, '#d-date'), bell: +v(f, '#d-bell') || null, note: v(f, '#d-note'), by: ctx.actor() }));
      save(); render(); toast(`${fa(sids.length)} مورد ثبت شد.`);
    },
    'disc-del': b => { const back = UI.drop(d().discipline, r => r.id === b.dataset.id); save(); render(); UI.undo('مورد انضباطی حذف شد.', back, () => { save(); render(); }); },
    'disc-pdf': () => pdf(document.getElementById('rc-sheet'), `کارنامه-انضباطی-${student(state.cardSid).name}`),
    'disc-print': () => printEl(document.getElementById('rc-sheet')),
    'ds-save': () => {
      Object.assign(rep(), { title: document.getElementById('ds-title').value.trim() || 'کارنامهٔ انضباطی', signer: document.getElementById('ds-signer').value.trim(), footer: document.getElementById('ds-footer').value.trim() });
      save(); toast('تنظیمات ذخیره شد.');
    },
    'logo-del': () => { rep().logo = ''; save(); render(); },
    'cat-add': () => {
      const name = document.getElementById('nc-name').value.trim(), pts = +document.getElementById('nc-pts').value;
      if (!name) return UI.invalid('#nc-name', 'نام مورد را بنویسید.'); if (!(pts < 0)) return UI.invalid('#nc-pts', 'نمره باید منفی باشد.');
      d().discCats.push({ id: D.uid('d'), name, pts }); save(); render(); toast('به فهرست افزوده شد.');
    },
    'cat-del': async b => {
      const used = d().discipline.some(r => r.cat === b.dataset.id);
      if (used) return toast('این مورد برای دانش‌آموزانی ثبت شده و حذف نمی‌شود.');
      d().discCats = d().discCats.filter(c => c.id !== b.dataset.id); save(); render();
    },
  };
  // On the weekly page: any of the grade's teachers, to see their week across all grades (TeacherWeek.open).
  function teacherPick(x) {
    const by = TeacherWeek.all(school().id, D.gradesOf(school()));
    const here = [...by.entries()].filter(([, l]) => l.some(e => e.g === x.grade)).map(([t]) => t).sort((a, b) => a.localeCompare(b, 'fa'));
    if (!here.length) return '';
    return `<label class="wk-tch"><span>برنامهٔ هفتگی یک معلم پایه</span><select class="input" id="wk-tch"><option value="">انتخاب معلم…</option>${here.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>`;
  }
  function bind() {
    const wt = document.getElementById('wk-tch'); if (wt) wt.onchange = () => { if (wt.value) TeacherWeek.open(school().id, D.gradesOf(school()), wt.value, d().grade); wt.value = ''; };
    const df = document.getElementById('dform'); if (df) Disc.wire(df, 'd-cat', d().discCats);
    // After a cell is picked (or filled), move the keyboard to its options.
    if (state.focusPal) { state.focusPal = false; (document.querySelector('.palette .pchip[aria-pressed="true"]') || document.querySelector('.palette .pchip'))?.focus({ preventScroll: true }); }
    // Session form: family-only fields, extra action rows.
    const f = document.getElementById('sform');
    if (f) {
      f.querySelectorAll('input[name=s-type]').forEach(i => i.onchange = () => { f.querySelector('.fam').hidden = i.value !== 'khanevade' || !i.checked; });
      f.querySelector('#add-act').onclick = () => {
        const html = f.querySelector('#arow-tpl').innerHTML.replace(/a-due-n-[a-z0-9]+/g, 'a-due-' + Date.now().toString(36));
        f.querySelector('#arows').insertAdjacentHTML('beforeend', html);
      };
      f.addEventListener('click', e => { if (e.target.closest('[data-rm]') && f.querySelectorAll('.arow').length > 1) e.target.closest('.arow').remove(); });
    }
    document.querySelectorAll('[data-actdone]').forEach(c => c.onchange = () => {
      const [nid, aid] = c.dataset.actdone.split('|'), a = findS(nid).actions.find(x => x.id === aid);
      a.done = c.checked; save(); render();
    });
    document.querySelectorAll('[data-chipall]').forEach(b => b.onclick = () => {
      const boxes = [...b.closest('form').querySelectorAll(`input[data-cls="${b.dataset.chipall}"]`)], all = boxes.every(x => x.checked);
      boxes.forEach(x => { x.checked = !all; });
    });
    const dc = document.getElementById('dc-st'); if (dc) dc.onchange = () => { state.cardSid = dc.value; render(); };
    const lg = document.getElementById('ds-logo');
    if (lg) lg.onchange = () => {
      const file = lg.files[0]; if (!file) return;
      if (file.size > 400 * 1024) return toast('تصویر آرم باید کمتر از ۴۰۰ کیلوبایت باشد.');
      const r = new FileReader(); r.onload = () => { rep().logo = r.result; save(); render(); toast('آرم ذخیره شد.'); }; r.readAsDataURL(file);
    };
  }
  return {
    viewOf: { overview: 'overview', cobs: 'cobs', discReg: 'discReg', discCard: 'discCard', discSettings: 'discSettings' },
    pages: { overview, cweek: week, cobs, discReg, discCard, discSettings },
    studentFile, sessCounts, principalReminders, feed, discSheet: sid => cardSheet(sid), kinds: KINDS, act, bind, resetFile: () => { state.tab = 'neo'; state.editSession = null; },
  };
};
