// Marks and report cards.
//   marks     enter marks per class and subject (counsellor and academic deputy: every subject; a teacher: their own),
//             five kinds of mark, Excel export of everything and Excel import from one fixed template.
//   mdash     marks dashboard: a card per student; a student's page shows each subject's marks with a progress
//             chart per kind (quiz, homework, class exam, oral, final exam).
//   cardDefs  the academic deputy defines a report card (term, dates, comparison) and the weights per grade and subject,
//             then announces it to teachers; until then counsellors and teachers do not see it.
//   cards     «ثبت نمرهٔ کارنامه»: teachers confirm each mark and write a description (text or voice);
//             «کارنامه‌ها»: the report card per student with continuous average, homework done, final exam,
//             rank in class and grade, a band within the grade, the comparable earlier card, notes, PDF.
// A subject's report-card mark = 20 × Σ(weight × average percentage of that kind) / Σ(weights of kinds that have marks).
const Grades = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { data, org, save, school, student, className, render, empty } = ctx;
  const d = () => data(), o = () => org();
  const today = J.todayIso();
  const TYPE = Object.fromEntries(D.MARK_TYPES);
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const r2 = n => n == null ? null : Math.round(n * 100) / 100;
  const show = n => n == null ? '—' : fa(r2(n));
  const state = { cls: '', subject: '', def: '', cardCls: '', cardSid: '', cardMode: '', dCls: '', dSub: '' };

  // Who may do what.
  const role = () => ctx.role(), actor = () => ctx.actor();
  const subjectsFor = () => role() === 'teacher' ? [D.TEACHER_SUBJECT] : d().termSubjects;
  const canEdit = () => !ctx.readOnly() && ['counselor', 'teacher', 'deputy'].includes(actor());
  const canNote = () => !ctx.readOnly() && ['counselor', 'deputy'].includes(actor());

  /* ---------------- computation ---------------- */
  const defs = () => o().reportCards;
  const def = id => defs().find(c => c.id === id);
  const activeDefs = () => defs().filter(c => !c.archived);
  // Counsellors and teachers see a report card only after the academic deputy announces it («اعلام به معلم‌ها»).
  const seesAll = () => ['deputy', 'principal'].includes(actor());
  const visibleDefs = () => seesAll() ? activeDefs() : activeDefs().filter(c => c.ready);
  const weightsFor = (c, g, sub) => ({ ...D.DEFAULT_WEIGHTS, ...(c.weights?.[g]?.[sub] || {}) });
  const inRange = (c, date) => (!c.from || date >= c.from) && (!c.to || date <= c.to);
  function computed(c, sid, sub, x = d()) {
    const s = x.students.find(y => y.id === sid); if (!s) return null;
    const w = weightsFor(c, x.grade, sub), items = x.grades.filter(i => i.cls === s.cls && i.subject === sub && inRange(c, i.date));
    let num = 0, den = 0;
    D.MARK_TYPES.forEach(([t]) => {
      const p = avg(items.filter(i => i.type === t && i.scores[sid] != null).map(i => i.scores[sid] / i.max));
      if (p == null || !w[t]) return;
      num += w[t] * p; den += w[t];
    });
    return den ? r2(20 * num / den) : null;
  }
  const entry = (c, sid, sub, x = d()) => x.cardMarks?.[c.id]?.[sid]?.[sub] || {};
  function finalMark(c, sid, sub, x = d()) {
    if (c.archived) return x.archive?.[c.id]?.[sid]?.[sub] ?? null;
    const e = entry(c, sid, sub, x);
    return e.mark != null && e.mark !== '' ? +e.mark : computed(c, sid, sub, x);
  }
  const gpa = (c, sid, x = d()) => r2(avg(x.termSubjects.map(s => finalMark(c, sid, s, x)).filter(v => v != null)));
  const gradeAvg = (c, sub, x = d()) => r2(avg(x.students.map(s => finalMark(c, s.id, sub, x)).filter(v => v != null)));
  const gradeGpa = (c, x = d()) => r2(avg(x.students.map(s => gpa(c, s.id, x)).filter(v => v != null)));

  /* ---------------- report-card detail ---------------- */
  const CONT = ['quiz', 'hw', 'exam', 'oral'];
  const itemsOf = (x, s, sub, c) => x.grades.filter(i => i.cls === s.cls && i.subject === sub && (!c || inRange(c, i.date)));
  // Average of the continuous marks (everything but the final exam), each item counting once, out of 20.
  function continuous(c, sid, sub, x = d()) {
    const s = x.students.find(y => y.id === sid); if (!s) return null;
    const p = avg(itemsOf(x, s, sub, c).filter(i => CONT.includes(i.type) && i.scores[sid] != null).map(i => i.scores[sid] / i.max));
    return p == null ? null : r2(20 * p);
  }
  function finalExam(c, sid, sub, x = d()) {
    const s = x.students.find(y => y.id === sid); if (!s) return null;
    const p = avg(itemsOf(x, s, sub, c).filter(i => i.type === 'final' && i.scores[sid] != null).map(i => i.scores[sid] / i.max));
    return p == null ? null : r2(20 * p);
  }
  // Homework done: of every homework recorded for the class, how many have a mark for this student.
  function homework(c, sid, sub, x = d()) {
    const s = x.students.find(y => y.id === sid); if (!s) return null;
    const hw = itemsOf(x, s, sub, c).filter(i => i.type === 'hw');
    return hw.length ? { done: hw.filter(i => i.scores[sid] != null).length, total: hw.length } : null;
  }
  // Rank among the students who have a value (1 = best; ties share a rank) and the band within the grade.
  function standing(val, others) {
    const vals = others.filter(v => v != null);
    if (val == null || !vals.length) return null;
    const above = vals.filter(v => v > val).length, below = vals.filter(v => v < val).length, same = vals.filter(v => v === val).length;
    const pct = vals.length > 1 ? Math.round((below + (same - 1) / 2) / (vals.length - 1) * 100) : 100;
    return { rank: above + 1, of: vals.length, pct };
  }
  // Band by where the student stands in the grade: A top 15%, B next 25%, C middle, D next 20%, E bottom 15%.
  const BANDS = [[85, 'A', 'عالی'], [60, 'B', 'خیلی خوب'], [35, 'C', 'خوب'], [15, 'D', 'قابل قبول'], [-1, 'E', 'نیازمند تلاش']];
  const band = pct => pct == null ? null : BANDS.find(([min]) => pct >= min);

  /* ---------------- marks entry ---------------- */
  function marks() {
    const x = d(), subs = subjectsFor();
    if (!x.classes.some(c => c.id === state.cls)) state.cls = x.classes[0].id;
    if (!subs.includes(state.subject)) state.subject = subs[0];
    const ss = x.students.filter(s => s.cls === state.cls);
    const items = x.grades.filter(i => i.cls === state.cls && i.subject === state.subject).sort((a, b) => a.date.localeCompare(b.date));
    const head = `<div class="card"><div class="spread"><div class="row" role="group" aria-label="کلاس"><span class="small muted">کلاس:</span>
        ${x.classes.map(k => `<button class="btn sm ${k.id === state.cls ? 'primary' : ''}" data-act="m-cls" data-id="${k.id}" aria-pressed="${k.id === state.cls}">${esc(k.name)}</button>`).join('')}</div>
        <div class="row"><button class="btn sm" data-act="x-export">خروجی اکسل همهٔ نمره‌ها</button><button class="btn sm" data-act="x-template">دریافت قالب اکسل</button>
        ${canEdit() ? '<label class="btn sm">ورود از اکسل<input type="file" id="x-import" accept=".xlsx,.xls" hidden></label>' : ''}</div></div>
      ${subs.length > 1 ? `<div class="subj-tabs" role="tablist" aria-label="درس">${subs.map(s => `<button role="tab" aria-selected="${s === state.subject}" class="${s === state.subject ? 'on' : ''}" data-act="m-sub" data-id="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}</div>`;
    const table = `<div class="card"><div class="card-head"><div><h2 style="margin:0">${esc(state.subject)} ـ ${esc(className(state.cls))}</h2>
        <div class="muted small">${fa(items.length)} نمره ثبت شده</div></div>
        ${canEdit() ? '<button class="btn primary add-mark" data-act="m-new" aria-label="نمرهٔ جدید"><span class="plus">+</span> نمرهٔ جدید</button>' : ''}</div>
      ${items.length ? `<div class="table-wrap"><table class="marks"><tr><th>ردیف</th><th>نام و نام خانوادگی</th>${items.map(i => `<th>${canEdit() ? `<button class="th-btn" data-act="m-edit" data-id="${i.id}">` : '<span>'}
          <b>${esc(i.title)}</b><span class="tag grey">${esc(TYPE[i.type])}</span><span class="small muted">از ${fa(i.max)} · ${esc(J.format(i.date, false))}</span>${canEdit() ? '</button>' : '</span>'}</th>`).join('')}
</tr>
        ${ss.map(s => `<tr><td class="num">${fa(s.row)}</td><td>${esc(s.name)}</td>${items.map(i => `<td>${canEdit()
          ? `<input class="input num mark-in" type="number" min="0" max="${i.max}" step="0.25" value="${i.scores[s.id] ?? ''}" data-item="${i.id}" data-sid="${s.id}" aria-label="${esc(s.name)}، ${esc(i.title)}">`
          : `<span class="num">${i.scores[s.id] != null ? fa(i.scores[s.id]) : '—'}</span>`}</td>`).join('')}
</tr>`).join('')}</table></div>`
        : `<div class="empty-state">${empty('هنوز نمره‌ای برای این درس ثبت نشده.')}${canEdit() ? '<p class="small muted">با «+ نمرهٔ جدید» شروع کنید یا فایل اکسل را وارد کنید.</p>' : ''}</div>`}</div>`;
    const sample = (x.grades.some(i => i.sample) || x.sessions.some(i => i.sample) || (x.sampleAtt || []).length) && !['student', 'parent'].includes(role())
      ? `<p class="note spread">نمره‌ها، جلسه‌ها، حضور و غیاب، موارد انضباطی و مشاهده‌های «نمونه» ساختگی‌اند و فقط برای دیدن نمودارها و وضعیت‌ها ساخته شده‌اند. با آمدن داده‌های واقعی پاکشان کنید.
          ${['principal', 'counselor', 'deputy'].includes(actor()) ? '<button class="btn sm" data-act="m-sample-clear">پاک‌کردن نمونه‌های این پایه</button>' : ''}</p>` : '';
    const ready = visibleDefs().slice(-1)[0];
    const hint = '';
    return head + sample + table + hint;
  }
  function itemModal(item) {
    modal(`<h2>${item ? 'ویرایش نمره' : 'نمرهٔ جدید'} ـ ${esc(state.subject)}، ${esc(className(state.cls))}</h2>
      <label class="field"><span>توضیح نمره (این نمره چیست؟)</span><input class="input" id="i-t" value="${esc(item?.title || '')}" placeholder="مثلاً آزمونک فصل ۲"></label>
      <fieldset class="seg-radio" style="margin-top:12px"><legend class="small muted">نوع</legend>${D.MARK_TYPES.map(([k, l]) => `<label><input type="radio" name="i-type" value="${k}" ${(item?.type || 'exam') === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>سقف نمره</span><input class="input num" type="number" id="i-max" min="1" step="0.5" value="${item?.max ?? 20}"></label>
        <div class="field"><span>تاریخ</span>${J.field('i-d', item?.date || today)}</div></div>
      <div class="def-mark"><label class="check"><input type="checkbox" id="i-def"> نمرهٔ پیش‌فرض برای همهٔ کلاس</label>
        <label class="def-box" hidden><span class="sr-only">نمرهٔ پیش‌فرض</span><input class="input num" type="number" id="i-defv" min="0" step="0.25" placeholder="نمره"></label></div>
      <p class="muted small" id="i-def-hint" hidden>${item ? 'به همهٔ دانش‌آموزانی داده می‌شود که هنوز در این نمره، نمره‌ای ندارند؛ نمره‌های ثبت‌شده عوض نمی‌شوند.' : 'به همهٔ دانش‌آموزان کلاس داده می‌شود؛ بعد در جدول می‌توانید نمرهٔ هر نفر را جدا تغییر دهید.'}</p>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">${item ? 'ذخیره' : 'ساختن و رفتن به جدول'}</button>${item ? '<button class="btn danger" id="del">حذف این نمره</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      // «Default mark»: ticking it opens a box; the mark goes to every student of the class who has none yet.
      const defOn = root.querySelector('#i-def'), defBox = root.querySelector('.def-box');
      defOn.onchange = () => { defBox.hidden = root.querySelector('#i-def-hint').hidden = !defOn.checked; if (defOn.checked) root.querySelector('#i-defv').focus(); };
      root.querySelector('#save').onclick = () => {
        const title = root.querySelector('#i-t').value.trim(), max = +root.querySelector('#i-max').value;
        if (!title) return UI.invalid('#i-t', 'توضیح نمره را بنویسید.'); if (!(max > 0)) return UI.invalid('#i-max', 'سقف نمره باید بیشتر از صفر باشد.');
        const dv = root.querySelector('#i-defv').value, def = defOn.checked ? +dv : null;
        if (defOn.checked && (dv === '' || !(def >= 0) || def > max)) return UI.invalid('#i-defv', `نمرهٔ پیش‌فرض باید بین ۰ و ${fa(max)} باشد.`);
        const rec = { title, max, type: root.querySelector('input[name=i-type]:checked').value, date: root.querySelector('#i-d').value };
        let it = item;
        if (it) { if (max < it.max) Object.keys(it.scores).forEach(k => { if (it.scores[k] > max) it.scores[k] = max; }); Object.assign(it, rec); }
        else { it = { id: D.uid('g'), cls: state.cls, subject: state.subject, scores: {}, ...rec }; d().grades.push(it); }
        if (def != null) d().students.filter(st => st.cls === state.cls && it.scores[st.id] == null).forEach(st => { it.scores[st.id] = def; });
        save(); close(); render(); toast(item ? 'ذخیره شد.' : 'نمره ساخته شد؛ نمره‌ها را در جدول بنویسید.');
        if (!item) setTimeout(() => document.querySelector('.mark-in:last-of-type')?.focus(), 50);
      };
      const del = root.querySelector('#del');
      if (del) del.onclick = () => { const back = UI.drop(d().grades, i => i.id === item.id); save(); close(); render(); UI.undo(`«${item.title}» و نمره‌هایش حذف شد.`, back, () => { save(); render(); }); };
    });
  }

  /* ---------------- Excel ---------------- */
  // Fixed template, the same for every file: B1 title, B2 kind, B3 maximum, B4 subject, B5 class; names from row 8 in column B, marks in column C.
  const norm = s => String(s ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏\s]+/g, ' ').trim();
  const rtl = wb => { wb.Workbook = { Views: [{ RTL: true }] }; return wb; };
  async function xlsx() { await UI.loadScript(XLSX_URL); return window.XLSX; }
  async function template() {
    try {
      const X = await xlsx(), ss = d().students.filter(s => s.cls === state.cls);
      const aoa = [['عنوان نمره', ''], ['نوع نمره', 'آزمون کلاسی', '', 'یکی از: کوییز، تکلیف، آزمون کلاسی، پرسش کلاسی'], ['سقف نمره', 20], ['درس', state.subject], ['کلاس', className(state.cls)], [],
        ['ردیف', 'نام و نام خانوادگی', 'نمره'], ...ss.map((s, i) => [i + 1, s.name, ''])];
      const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 40 }];
      const wb = rtl(X.utils.book_new()); X.utils.book_append_sheet(wb, ws, 'نمره');
      X.writeFile(wb, `قالب-نمره-${state.subject}-${className(state.cls)}.xlsx`);
    } catch (e) { toast('کتابخانهٔ اکسل بار نشد (اینترنت لازم است).'); }
  }
  async function exportAll() {
    try {
      const X = await xlsx(), x = d(), c = visibleDefs().slice(-1)[0], wb = rtl(X.utils.book_new());
      x.classes.forEach(k => subjectsFor().forEach(sub => {
        const items = x.grades.filter(i => i.cls === k.id && i.subject === sub).sort((a, b) => a.date.localeCompare(b.date));
        const head = ['ردیف', 'نام و نام خانوادگی', ...items.map(i => `${i.title} (${TYPE[i.type]}، از ${i.max})`), ...(c ? [`کارنامهٔ ${c.title}`] : [])];
        const rows = x.students.filter(s => s.cls === k.id).map(s => [s.row, s.name, ...items.map(i => i.scores[s.id] ?? ''), ...(c ? [finalMark(c, s.id, sub) ?? ''] : [])]);
        const ws = X.utils.aoa_to_sheet([head, ...rows]); ws['!cols'] = [{ wch: 6 }, { wch: 28 }, ...items.map(() => ({ wch: 18 }))];
        X.utils.book_append_sheet(wb, ws, `${k.name} ${sub}`.slice(0, 31));
      }));
      X.writeFile(wb, `نمره‌ها-پایهٔ-${D.GRADE_NAME[x.grade]}.xlsx`);
    } catch (e) { toast('کتابخانهٔ اکسل بار نشد (اینترنت لازم است).'); }
  }
  async function importFile(file) {
    let X; try { X = await xlsx(); } catch (e) { return toast('کتابخانهٔ اکسل بار نشد (اینترنت لازم است).'); }
    const wb = X.read(await file.arrayBuffer(), { type: 'array' }), x = d(), report = [];
    const typeOf = Object.fromEntries(D.MARK_TYPES.map(([k, l]) => [norm(l), k]));
    wb.SheetNames.forEach(name => {
      const rows = X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
      const cell = (r, c) => rows[r]?.[c];
      const title = norm(cell(0, 1)), type = typeOf[norm(cell(1, 1))], max = +cell(2, 1), sub = norm(cell(3, 1)), clsName = norm(cell(4, 1));
      const k = x.classes.find(c => norm(c.name) === clsName), subject = subjectsFor().find(s => norm(s) === sub);
      const problem = !title ? 'عنوان نمره (B1) خالی است' : !type ? 'نوع نمره (B2) باید یکی از چهار نوع باشد' : !(max > 0) ? 'سقف نمره (B3) عدد نیست'
        : !subject ? `درس «${sub}» در این پایه نیست یا اجازهٔ ثبتش را ندارید` : !k ? `کلاس «${clsName}» در این پایه نیست` : '';
      if (problem) { report.push(`برگهٔ «${name}»: ${problem}.`); return; }
      const scores = {}, missing = [];
      rows.slice(7).forEach(r => {
        const nm = norm(r[1]); if (!nm || r[2] === '' || r[2] == null) return;
        const s = x.students.find(y => y.cls === k.id && norm(y.name) === nm);
        if (!s) { missing.push(nm); return; }
        scores[s.id] = Math.max(0, Math.min(max, +r[2] || 0));
      });
      x.grades.push({ id: D.uid('g'), cls: k.id, subject, type, title, max, date: today, scores });
      report.push(`«${title}» (${subject}، ${k.name}): ${fa(Object.keys(scores).length)} نمره ثبت شد${missing.length ? `؛ این نام‌ها پیدا نشد: ${missing.join('، ')}` : ''}.`);
    });
    save(); render();
    modal(`<h2>نتیجهٔ ورود از اکسل</h2><ul>${report.map(l => `<li>${esc(l)}</li>`).join('')}</ul><div class="row" style="margin-top:12px"><button class="btn" data-close>بستن</button></div>`);
  }

  /* ---------------- report card definitions (academic deputy) ---------------- */
  function cardDefs() {
    const x = d(), list = defs();
    if (!def(state.def) || def(state.def).archived) state.def = activeDefs().slice(-1)[0]?.id || '';
    const c = def(state.def);
    return `<div class="spread" style="margin-bottom:12px"><span></span>
        <button class="btn primary" data-act="def-new">+ کارنامهٔ تازه</button></div>
      <div class="card"><div class="table-wrap"><table><tr><th>کارنامه</th><th>بازهٔ نمره‌ها</th><th>مقایسه با</th><th>وضعیت</th><th></th></tr>
        ${list.map(k => `<tr><td><b>${esc(k.title)}</b> <span class="muted small">${esc(k.year)}</span></td>
          <td class="small">${k.archived ? 'بایگانی سال‌های قبل' : `${esc(J.format(k.from))} تا ${esc(J.format(k.to))}`}</td>
          <td class="small">${k.compare && def(k.compare) ? `${esc(def(k.compare).title)} ${esc(def(k.compare).year)}` : '—'}</td>
          <td>${k.archived ? '<span class="tag grey">بایگانی</span>' : k.published ? '<span class="tag ok">منتشر شده</span>' : k.ready ? '<span class="tag blue">اعلام‌شده به معلم‌ها</span>' : '<span class="tag warn">پیش‌نویس، فقط معاون می‌بیند</span>'}</td>
          <td>${k.archived ? '' : `<div class="row"><button class="btn sm ${k.id === state.def ? 'primary' : ''}" data-act="def-pick" data-id="${k.id}">ضریب‌ها</button><button class="btn sm" data-act="def-edit" data-id="${k.id}">ویرایش</button>
            <button class="btn sm" data-act="def-ready" data-id="${k.id}">${k.ready ? 'پس گرفتن از معلم‌ها' : 'اعلام به معلم‌ها'}</button>
            <button class="btn sm" data-act="def-pub" data-id="${k.id}">${k.published ? 'برگرداندن به تکمیل' : 'انتشار'}</button></div>`}</td></tr>`).join('')}</table></div></div>
      ${c ? `<div class="card"><div class="card-head"><div><h2 style="margin:0">ضریب‌های «${esc(c.title)} ${esc(c.year)}» ـ پایهٔ ${esc(D.GRADE_NAME[x.grade])}</h2>
          <div class="muted small">برای هر درس، سهم هر نوع نمره از ۲۰. جمع هر ردیف باید ۲۰ باشد. پایه را از بالای صفحه عوض کنید.</div></div>
          <button class="btn primary" data-act="w-save">ذخیرهٔ ضریب‌ها</button></div>
        <div class="table-wrap"><table class="weights"><tr><th>درس</th>${D.MARK_TYPES.map(([, l]) => `<th>${esc(l)}</th>`).join('')}<th>جمع</th></tr>
          ${x.termSubjects.map(sub => { const w = weightsFor(c, x.grade, sub), sum = D.MARK_TYPES.reduce((a, [t]) => a + w[t], 0);
            return `<tr data-wsub="${esc(sub)}"><td>${esc(sub)}</td>${D.MARK_TYPES.map(([t]) => `<td><input class="input num" type="number" min="0" max="20" step="0.5" data-w="${t}" value="${w[t]}" style="width:80px" aria-label="${esc(sub)}، ${esc(TYPE[t])}"></td>`).join('')}
              <td class="num"><b class="wsum ${sum === 20 ? '' : 'bad-txt'}">${fa(sum)}</b></td></tr>`; }).join('')}</table></div></div>` : ''}`;
  }
  function defModal(c) {
    modal(`<h2>${c ? 'ویرایش کارنامه' : 'کارنامهٔ تازه'}</h2>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>عنوان</span><input class="input" id="k-t" list="k-titles" value="${esc(c?.title || 'نوبت دوم')}">
        <datalist id="k-titles"><option>نوبت اول</option><option>نوبت دوم</option><option>نیمسال اول</option><option>نیمسال دوم</option><option>پایان سال</option></datalist></label>
      <label class="field"><span>سال تحصیلی</span><input class="input" id="k-y" value="${esc(c?.year || '۱۴۰۶-۱۴۰۵')}"></label>
      <div class="field"><span>نمره‌ها از تاریخ</span>${J.field('k-from', c?.from || today)}</div><div class="field"><span>تا تاریخ</span>${J.field('k-to', c?.to || D.shift(90))}</div></div>
      <label class="field"><span>مقایسه با کارنامهٔ مشابه قبلی</span><select class="input" id="k-c"><option value="">— بدون مقایسه —</option>${defs().filter(k => k.id !== c?.id).map(k => `<option value="${k.id}" ${c?.compare === k.id ? 'selected' : ''}>${esc(k.title)} ${esc(k.year)}</option>`).join('')}</select></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const v = s => root.querySelector(s).value.trim();
        if (!v('#k-t')) return UI.invalid('#k-t', 'عنوان را بنویسید.'); if (v('#k-from') > v('#k-to')) return UI.invalid('#k-from', 'تاریخ شروع بعد از پایان است.');
        const rec = { title: v('#k-t'), year: v('#k-y'), from: v('#k-from'), to: v('#k-to'), compare: v('#k-c') || null };
        if (c) Object.assign(c, rec); else { const n = { id: D.uid('c'), weights: {}, published: false, ...rec }; defs().push(n); state.def = n.id; }
        save(); close(); render(); toast('کارنامه ذخیره شد.');
      };
    });
  }

  /* ---------------- report cards ---------------- */
  function cards() {
    const x = d(), list = visibleDefs();
    // The principal also answers objections here, in a tab of their own.
    const appealTab = actor() === 'principal' && !ctx.readOnly();
    if (appealTab && state.cardMode === 'obj') return cardSeg([['view', 'کارنامه‌ها'], ['obj', appealsLabel()]]) + ctx.appeals();
    if (!list.length) return (appealTab ? newCardBox() + cardSeg([['view', 'کارنامه‌ها'], ['obj', appealsLabel()]]) : '') + `<div class="card empty-state">${empty(seesAll() ? 'هنوز کارنامه‌ای تعریف نشده. معاون آموزشی از «تعریف کارنامه» می‌سازد.' : 'معاون آموزشی هنوز کارنامه‌ای اعلام نکرده. وقتی اعلام کند، ثبت نمرهٔ نهایی و توصیف همین‌جا باز می‌شود.')}</div>`;
    if (!list.some(k => k.id === state.def)) state.def = list.slice(-1)[0].id;
    // A teacher only enters marks; the others switch between entering and viewing.
    const modes = [...(canEdit() ? [['entry', 'ثبت نمرهٔ کارنامه']] : []), ...(role() === 'teacher' ? [] : [['view', 'کارنامه‌ها']]), ...(appealTab ? [['obj', appealsLabel()]] : [])];
    if (!modes.some(m => m[0] === state.cardMode)) state.cardMode = modes[0][0];
    return approvals(list) + cardSeg(modes) + (state.cardMode === 'entry' ? cardEntry(def(state.def), list) : cardView(x, list));
  }
  const cardSeg = modes => modes.length > 1 ? `<div class="seg" role="radiogroup" aria-label="بخش کارنامه" style="margin-bottom:12px">${modes.map(([k, l]) => `<button role="radio" aria-checked="${state.cardMode === k}" data-act="c-mode" data-id="${k}">${l}</button>`).join('')}</div>` : '';
  const appealsLabel = () => { const n = d().objections.filter(o => o.status === 'open').length; return `اعتراض‌ها${n ? ` (${fa(n)})` : ''}`; };
  // The principal can also define a report card, as the deputy does: the same form (title, year, date range, comparison).
  const newCardBox = () => `<button type="button" class="new-card-box" data-act="def-new"><span class="plus" aria-hidden="true">+</span><span><b>کارنامهٔ جدید</b><span class="muted small">عنوان، سال، بازهٔ نمره‌ها و مقایسه</span></span></button>`;
  // The principal approves each report card, then publishes it (to families, once their portal exists).
  function approvals(list) {
    if (actor() !== 'principal' || ctx.readOnly()) return '';
    const st = k => k.published ? '<span class="tag ok">منتشر شده</span>' : k.approved ? '<span class="tag blue">تأیید مدیر</span>' : k.ready ? '<span class="tag warn">در حال ثبت نمره</span>' : '<span class="tag grey">پیش‌نویس معاون</span>';
    return newCardBox() + `<div class="card"><div class="card-head"><h2 style="margin:0">تأیید و انتشار کارنامه‌ها</h2><span class="muted small">اول تأیید، بعد انتشار</span></div>
      <div class="table-wrap"><table class="no-cards"><tbody>${list.map(k => `<tr><td><b>${esc(k.title)}</b> <span class="muted small">${esc(k.year)}</span></td><td>${st(k)}</td>
        <td><div class="row"><button class="btn sm ${k.approved ? '' : 'primary'}" data-act="rc-approve" data-id="${k.id}" ${k.published ? 'disabled' : ''}>${k.approved ? 'پس گرفتن تأیید' : 'تأیید'}</button>
          <button class="btn sm ${k.approved && !k.published ? 'primary' : ''}" data-act="rc-publish" data-id="${k.id}" ${k.approved ? '' : 'disabled'}>${k.published ? 'برگرداندن از انتشار' : 'انتشار'}</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  // Final mark and description per student for one class and subject; the computed mark stays unless changed.
  function cardEntry(c, list) {
    const x = d(), subs = subjectsFor();
    if (!x.classes.some(k => k.id === state.cls)) state.cls = x.classes[0].id;
    if (!subs.includes(state.subject)) state.subject = subs[0];
    const ss = x.students.filter(s => s.cls === state.cls);
    return `<div class="card"><div class="row"><label class="small muted" for="c-def">کارنامه</label><select class="input" id="c-def">${list.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.title)} ${esc(k.year)}</option>`).join('')}</select>
        <span class="small muted">کلاس:</span>${x.classes.map(k => `<button class="btn sm ${k.id === state.cls ? 'primary' : ''}" data-act="m-cls" data-id="${k.id}" aria-pressed="${k.id === state.cls}">${esc(k.name)}</button>`).join('')}</div>
      ${subs.length > 1 ? `<div class="subj-tabs" role="tablist" aria-label="درس">${subs.map(su => `<button role="tab" aria-selected="${su === state.subject}" class="${su === state.subject ? 'on' : ''}" data-act="m-sub" data-id="${esc(su)}">${esc(su)}</button>`).join('')}</div>` : ''}</div>
      <div class="card rbox"><div class="card-head"><div><h2 style="margin:0">کارنامهٔ ${esc(c.title)} ${esc(c.year)} ـ ${esc(state.subject)}، ${esc(className(state.cls))}</h2>
        <div class="muted small">ضریب‌ها: ${D.MARK_TYPES.map(([t, l]) => `${l} ${fa(weightsFor(c, x.grade, state.subject)[t])}`).join('، ')} (از ۲۰)</div></div></div>
      <div class="table-wrap"><table><tr><th>دانش‌آموز</th><th>محاسبه‌شده</th><th>نمرهٔ نهایی (اگر تغییر می‌دهید)</th><th>توصیف برای کارنامه</th></tr>
        ${ss.map(s => { const e = entry(c, s.id, state.subject), tid = `desc-${s.id}`; return `<tr><td>${esc(s.name)}</td><td class="num"><b>${show(computed(c, s.id, state.subject))}</b></td>
          <td>${canEdit() ? `<input class="input num" style="width:96px" type="number" min="0" max="20" step="0.25" value="${e.mark ?? ''}" data-cm="${s.id}" aria-label="نمرهٔ نهایی ${esc(s.name)}">` : `<span class="num">${show(e.mark ?? null)}</span>`}</td>
          <td>${canEdit() ? `<textarea class="input desc-in" id="${tid}" rows="1" data-cd="${s.id}" aria-label="توصیف ${esc(s.name)}">${esc(e.desc || '')}</textarea>
            <button type="button" class="btn sm voice mini" data-voice="${tid}" aria-pressed="false" aria-label="تبدیل صوت به متن برای ${esc(s.name)}"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></svg><span class="sr-only">صدا</span></button>` : esc(e.desc || '—')}</td></tr>`; }).join('')}</table></div>
      <p class="muted small">نمرهٔ نهایی خالی بماند یعنی همان عدد محاسبه‌شده در کارنامه می‌آید. همه‌چیز خودکار ذخیره می‌شود. تبدیل صدا به متن صدا را به سرور مرورگر می‌فرستد.</p></div>`;
  }
  function cardView(x, list) {
    if (!x.classes.some(k => k.id === state.cardCls)) state.cardCls = x.classes[0].id;
    const ss = x.students.filter(s => s.cls === state.cardCls);
    if (!ss.some(s => s.id === state.cardSid)) state.cardSid = ss[0]?.id || '';
    const c = def(state.def);
    return `<div class="card"><div class="row"><label class="small muted" for="c-def">کارنامه</label><select class="input" id="c-def">${list.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.title)} ${esc(k.year)}</option>`).join('')}</select>
        <span class="small muted">کلاس:</span>${x.classes.map(k => `<button class="btn sm ${k.id === state.cardCls ? 'primary' : ''}" data-act="c-cls" data-id="${k.id}">${esc(k.name)}</button>`).join('')}
        ${c.published ? '<span class="tag ok">منتشر شده</span>' : '<span class="tag warn">در حال تکمیل</span>'}
        ${state.cardSid ? '<button class="btn primary" data-act="c-pdf" style="margin-inline-start:auto">دانلود PDF</button>' : ''}</div></div>
      <div class="cards-layout"><nav class="card clist" aria-label="دانش‌آموزان">${ss.map(s => `<button class="${s.id === state.cardSid ? 'on' : ''}" data-act="c-st" data-id="${s.id}">
          <span>${esc(s.name)}</span><b class="num">${show(gpa(c, s.id))}</b></button>`).join('')}</nav>
        <div>${state.cardSid ? sheet(c, state.cardSid) : empty('دانش‌آموزی نیست.')}</div></div>`;
  }
  function sheet(c, sid) {
    const x = d(), s = student(sid), cmp = c.compare && def(c.compare);
    const classmates = x.students.filter(y => y.cls === s.cls);
    const rows = x.termSubjects.map(sub => {
      const m = finalMark(c, sid, sub), gradeVals = x.students.map(y => finalMark(c, y.id, sub));
      const inClass = standing(m, classmates.map(y => finalMark(c, y.id, sub))), inGrade = standing(m, gradeVals);
      return { sub, m, cont: continuous(c, sid, sub), hw: homework(c, sid, sub), fin: finalExam(c, sid, sub), ga: gradeAvg(c, sub), inClass, inGrade, b: band(inGrade?.pct),
        prev: cmp ? finalMark(cmp, sid, sub) : null, desc: entry(c, sid, sub).desc || '' };
    });
    const g = gpa(c, sid), gClass = standing(g, classmates.map(y => gpa(c, y.id))), gGrade = standing(g, x.students.map(y => gpa(c, y.id))), gBand = band(gGrade?.pct);
    const note = x.cardNotes?.[c.id]?.[sid] || '';
    const rk = st => st ? `${fa(st.rank)} از ${fa(st.of)}` : '—';
    const bd = b => b ? `<b>${b[2]}</b>` : '—';
    const cols = 9 + (cmp ? 1 : 0);
    return `<div class="rc-sheet report" id="card-sheet">
      <div class="rc-top"><div class="rc-logo">${o().discReport?.logo ? `<img src="${esc(o().discReport.logo)}" alt="آرم مدرسه">` : Shell.logoImg(school(), '', esc(school().name.replace(/^مجتمع آموزشی\s*/, '').slice(0, 2)))}</div>
        <div><div class="rc-school">${esc(school().name)}</div><h2 class="rc-title">کارنامهٔ ${esc(c.title)}</h2><div class="small">سال تحصیلی ${esc(c.year)}</div></div>
        <div class="rc-date">تاریخ صدور<br><b>${esc(J.format(today))}</b></div></div>
      <div class="rc-info"><div>نام و نام خانوادگی: <b>${esc(s.name)}</b></div><div>کلاس: <b>${esc(className(s.cls))}</b></div><div>پایه: <b>${esc(D.GRADE_NAME[x.grade])}</b></div></div>
      <table class="rc-table adv"><thead><tr><th>درس</th><th>میانگین مستمر</th><th>تکالیف انجام‌شده</th><th>آزمون پایانی</th><th>نمرهٔ کارنامه</th><th>میانگین پایه</th><th>رتبه در کلاس</th><th>رتبه در پایه</th><th>سطح در پایه</th>
        ${cmp ? `<th>${esc(cmp.title)}<br><span style="font-weight:400">${esc(cmp.year)}</span></th>` : ''}</tr></thead>
        <tbody>${rows.map(r => `<tr><td>${esc(r.sub)}</td><td>${show(r.cont)}</td><td>${r.hw ? `${fa(Math.round(r.hw.done / r.hw.total * 100))}٪ <span class="rc-sub">(${fa(r.hw.done)} از ${fa(r.hw.total)})</span>` : '—'}</td>
          <td>${show(r.fin)}</td><td style="${r.m != null && r.m < 12 ? 'color:#b91c1c;font-weight:700' : 'font-weight:700'}">${show(r.m)}</td><td>${show(r.ga)}</td>
          <td>${rk(r.inClass)}</td><td>${rk(r.inGrade)}</td><td>${bd(r.b)}</td>
          ${cmp ? `<td>${show(r.prev)}${r.m != null && r.prev != null ? ` <span class="trend">${r.m > r.prev ? '▲' : r.m < r.prev ? '▼' : '='}</span>` : ''}</td>` : ''}</tr>
          ${r.desc ? `<tr class="rc-desc"><td colspan="${cols}"><b>توصیف معلم ${esc(r.sub)}:</b> ${esc(r.desc)}</td></tr>` : ''}`).join('')}</tbody>
        <tfoot><tr><td>معدل</td><td></td><td></td><td></td><td>${show(g)}</td><td>${show(gradeGpa(c))}</td><td>${rk(gClass)}</td><td>${rk(gGrade)}</td><td>${bd(gBand)}</td>${cmp ? `<td>${show(gpa(cmp, sid))}</td>` : ''}</tr></tfoot></table>
      <div class="rc-note"><b>توضیحات:</b>${canNote() ? `<textarea class="input" id="card-note" rows="3" data-cnote="${sid}" placeholder="توضیح برای این کارنامه…">${esc(note)}</textarea>` : `<p>${esc(note) || '&nbsp;'}</p>`}</div>
      <p class="rc-foot small">نمرهٔ کارنامه از ضریب‌های کوییز، تکلیف، آزمون کلاسی، پرسش کلاسی و آزمون پایانی (جمع ۲۰) محاسبه شده است. میانگین مستمر میانگین همهٔ نمره‌های طول نوبت به‌جز آزمون پایانی است.
        «سطح در پایه» جایگاه دانش‌آموز میان هم‌پایه‌هایش است: «عالی» پانزده درصد بالای پایه، «خیلی خوب» بیست‌وپنج درصد بعدی، «خوب» حدود میانه، «قابل قبول» بیست درصد بعدی، «نیازمند تلاش» پانزده درصد پایین.</p>
      <div class="rc-sign"><div>معلم راهنما<br><span>امضا</span></div><div>معاون آموزشی<br><span>امضا</span></div><div>مدیر مدرسه<br><span>امضا</span></div></div></div>`;
  }
  // The note box is turned into plain text before a PDF or print, so the page is not shown with a form field.
  function snapshot(id) {
    const el = document.getElementById(id).cloneNode(true);
    el.querySelectorAll('textarea').forEach(t => { const p = document.createElement('p'); p.textContent = t.value || ' '; t.replaceWith(p); });
    return el;
  }
  const pdf = (el, name) => UI.pdf(el, name);

  function printEl(el) {
    const w = window.open('', '_blank'); if (!w) return toast('اجازهٔ پنجرهٔ تازه را بدهید.');
    w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>کارنامه</title><link rel="stylesheet" href="assets/style.css"><link rel="stylesheet" href="assets/school.css"><link rel="stylesheet" href="assets/counselor.css"></head><body style="background:#fff;padding:16px">${el.outerHTML}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  /* ---------------- marks dashboard ---------------- */
  // Percentage of each marked item, in date order, for one student, subject and kind.
  const series = (x, s, sub, type) => x.grades.filter(i => i.cls === s.cls && i.subject === sub && i.type === type && i.scores[s.id] != null)
    .sort((a, b) => a.date.localeCompare(b.date)).map(i => ({ i, v: i.scores[s.id], p: i.scores[s.id] / i.max * 100 }));
  const subAvg = (x, s, sub) => { const p = avg(x.grades.filter(i => i.cls === s.cls && i.subject === sub && i.scores[s.id] != null).map(i => i.scores[s.id] / i.max)); return p == null ? null : r2(20 * p); };
  function mdash(sid) {
    if (sid) return studentMarks(sid);
    const x = d(), subs = subjectsFor();
    if (state.dSub && !subs.includes(state.dSub)) state.dSub = '';
    if (subs.length === 1) state.dSub = subs[0];
    const groups = x.classes.filter(c => !state.dCls || c.id === state.dCls).map((c, ci) => ({ c, ci, list: x.students.filter(s => s.cls === c.id) }));
    const val = s => state.dSub ? subAvg(x, s, state.dSub) : r2(avg(subs.map(su => subAvg(x, s, su)).filter(v => v != null)));
    const card = (s, ci) => { const v = val(s);
      return `<a class="scard mcard" href="${ctx.hrefOf('mdash', s.id)}" aria-label="${esc(s.name)}، ${esc(className(s.cls))}، میانگین ${v == null ? 'بدون نمره' : fa(v) + ' از ۲۰'}">
        <span class="sphoto tone-${['teal', 'violet', 'blue', 'amber'][ci % 4]}" aria-hidden="true">${D.photoOf(s) ? `<img src="${esc(D.photoOf(s))}" alt="" loading="lazy">` : esc(D.initials(s))}</span>
        <span class="sname">${esc(s.name)}</span><span class="mavg ${v != null && v < 12 ? 'low' : ''}">${v == null ? '—' : fa(v)}</span></a>`; };
    return `<div class="card"><div class="row"><span class="small muted">کلاس:</span>
        <button class="btn sm ${!state.dCls ? 'primary' : ''}" data-act="md-cls" data-id="" aria-pressed="${!state.dCls}">همه</button>${x.classes.map(k => `<button class="btn sm ${k.id === state.dCls ? 'primary' : ''}" data-act="md-cls" data-id="${k.id}" aria-pressed="${k.id === state.dCls}">${esc(k.name)}</button>`).join('')}
        ${subs.length > 1 ? `<label class="small muted" for="md-sub" style="margin-inline-start:12px">درس</label><select class="input" id="md-sub" style="width:auto"><option value="">میانگین همهٔ درس‌ها</option>${subs.map(su => `<option ${su === state.dSub ? 'selected' : ''}>${esc(su)}</option>`).join('')}</select>` : `<span class="tag grey">${esc(subs[0])}</span>`}</div>
        </div>
      ${groups.map(g => `<div class="group-head"><h2>${esc(g.c.name)}</h2><span class="muted small">${fa(g.list.length)} نفر</span></div><div class="sgrid">${g.list.map(s => card(s, g.ci)).join('')}</div>`).join('')}`;
  }
  // One small chart per kind of mark (small multiples): one line each, so no colour coding is needed.
  function miniChart(pts, label) {
    // Right to left, like the page: the first mark on the right, the latest on the left; the scale sits on the right.
    const W = 260, H = 120, L = 14, R = 30, T = 12, B = 22, w = W - L - R, h = H - T - B;
    const xAt = k => W - R - (pts.length === 1 ? w / 2 : k / (pts.length - 1) * w), yAt = p => T + h - p / 100 * h;
    const grid = [0, 50, 100].map(g => `<line x1="${L}" x2="${W - R}" y1="${yAt(g)}" y2="${yAt(g)}" class="mc-grid"/><text x="${W - R + 6}" y="${yAt(g) + 4}" class="mc-ax" text-anchor="start">${fa(g)}</text>`).join('');
    const line = pts.length > 1 ? `<polyline class="mc-line" points="${pts.map((q, k) => `${xAt(k)},${yAt(q.p)}`).join(' ')}"/>` : '';
    const dots = pts.map((q, k) => `<circle class="mc-dot" cx="${xAt(k)}" cy="${yAt(q.p)}" r="4.5"><title>${esc(q.i.title)} · ${esc(J.format(q.i.date, false))}: ${fa(q.v)} از ${fa(q.i.max)} (${fa(Math.round(q.p))}٪)</title></circle>`).join('');
    const last = pts[pts.length - 1];
    const tag = last ? `<text x="${Math.max(xAt(pts.length - 1), L + 14)}" y="${Math.max(yAt(last.p) - 9, 10)}" class="mc-val" text-anchor="middle">${fa(Math.round(last.p))}٪</text>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" class="mchart" role="img" aria-label="${esc(label)}">${grid}${line}${dots}${tag}</svg>`;
  }
  function studentMarks(sid, own) {
    const x = d(), s = student(sid); if (!s) return empty('این دانش‌آموز پیدا نشد.');
    const subs = subjectsFor(), c = visibleDefs().slice(-1)[0];
    const trendTxt = pts => { if (pts.length < 2) return ''; const dlt = Math.round(pts[pts.length - 1].p - pts[0].p); return dlt > 2 ? `<span class="up">▲ ${fa(dlt)}٪ پیشرفت</span>` : dlt < -2 ? `<span class="down">▼ ${fa(-dlt)}٪ افت</span>` : '<span class="muted">ثابت</span>'; };
    const block = sub => {
      const kinds = D.MARK_TYPES.map(([t, l]) => ({ t, l, pts: series(x, s, sub, t) })), any = kinds.some(k => k.pts.length);
      const hw = homework(null, sid, sub);
      const items = x.grades.filter(i => i.cls === s.cls && i.subject === sub).sort((a, b) => b.date.localeCompare(a.date));
      return `<section class="card subj-block" aria-label="${esc(sub)}"><div class="card-head"><h2 style="margin:0">${esc(sub)}</h2>
          <div class="row small"><span>میانگین کل: <b class="num">${show(subAvg(x, s, sub))}</b></span><span>مستمر: <b class="num">${show(continuous(null, sid, sub))}</b></span>
          <span>تکالیف: <b class="num">${hw ? `${fa(hw.done)} از ${fa(hw.total)}` : '—'}</b></span>${c ? `<span>کارنامهٔ ${esc(c.title)}: <b class="num">${show(finalMark(c, sid, sub))}</b></span>` : ''}</div></div>
        ${any ? `<div class="mc-grid-wrap">${kinds.map(k => `<figure class="mc"><figcaption><b>${esc(k.l)}</b>${k.pts.length ? `<span class="small">${fa(k.pts.length)} نمره${k.pts.length > 1 ? ' · ' + trendTxt(k.pts) : ''}</span>` : ''}</figcaption>
            ${k.pts.length ? miniChart(k.pts, `${k.l} ${sub}: ${k.pts.map(q => `${q.i.title} ${Math.round(q.p)} درصد`).join('، ')}`) : '<p class="muted small mc-none">نمره‌ای از این نوع نیست.</p>'}</figure>`).join('')}</div>
          <details><summary class="small">جدول همهٔ نمره‌ها (${fa(items.length)})</summary><div class="table-wrap"><table><tr><th>تاریخ</th><th>عنوان</th><th>نوع</th><th>نمره</th><th>درصد</th></tr>
            ${items.map(i => `<tr><td>${esc(J.format(i.date, false))}</td><td>${esc(i.title)}</td><td>${esc(TYPE[i.type])}</td><td class="num">${i.scores[sid] != null ? `${fa(i.scores[sid])} از ${fa(i.max)}` : '<span class="muted">ثبت نشده</span>'}</td>
              <td class="num">${i.scores[sid] != null ? fa(Math.round(i.scores[sid] / i.max * 100)) + '٪' : '—'}</td></tr>`).join('')}</table></div></details>`
          : empty('هنوز نمره‌ای در این درس ثبت نشده.')}</section>`;
    };
    return `${own ? '' : `<div class="card"><div class="row" style="justify-content:space-between"><div class="row"><span class="sphoto tone-teal" aria-hidden="true" style="width:48px;height:48px">${esc(D.initials(s))}</span>
        <div><h2 style="margin:0">${esc(s.name)}</h2><div class="muted small">${esc(className(s.cls))} · ${subs.length > 1 ? 'همهٔ درس‌ها' : esc(subs[0])}</div></div></div>
        <a class="btn sm" href="${ctx.hrefOf('mdash')}">‹ همهٔ دانش‌آموزان</a></div>
        <p class="muted small" style="margin:8px 0 0">هر نمودار یک نوع نمره است؛ محور عمودی درصد نمره (از ۰ تا ۱۰۰) و هر نقطه یک نمره به ترتیب تاریخ.</p></div>`}
      ${subs.map(block).join('')}`;
  }

  // Inbox item: a report card the academic deputy has announced, for the people who enter its marks.
  function feed() {
    if (!['counselor', 'teacher'].includes(role()) || ctx.readOnly()) return [];
    return activeDefs().filter(c => c.ready).map(c => ({ key: 'rc:' + c.id + ':' + (c.readyAt || ''), type: 'card', title: `کارنامهٔ ${c.title} ${c.year} اعلام شد`,
      text: 'نمرهٔ نهایی و توصیف هر درس را در «کارنامه‌ها › ثبت نمرهٔ کارنامه» ثبت کنید.', at: c.readyAt || today, href: ctx.hrefOf('cards'), unread: true, read: () => { state.cardMode = 'entry'; state.def = c.id; } }));
  }

  /* ---------------- wiring ---------------- */
  const act = {
    'm-cls': b => { state.cls = b.dataset.id; render(); },
    'm-sub': b => { state.subject = b.dataset.id; render(); },
    'm-new': () => itemModal(),
    'm-edit': b => itemModal(d().grades.find(i => i.id === b.dataset.id)),
    'm-sample-clear': async () => {
      if (!await UI.ask('پاک‌کردن نمونه‌ها', 'همهٔ داده‌های «نمونهٔ» این پایه (نمره، جلسه، حضور، انضباط، مشاهده، نوبت، تکلیف) پاک شود؟ آنچه خودتان ثبت کرده‌اید می‌ماند.', 'پاک کن')) return;
      const n = D.clearSample(ctx.school().id, d().grade); render(); toast(`${fa(n)} مورد نمونه پاک شد.`);
    },
    'x-template': template, 'x-export': exportAll,
    'def-new': () => defModal(), 'def-edit': b => defModal(def(b.dataset.id)),
    'def-pick': b => { state.def = b.dataset.id; render(); },
    'def-ready': b => { const c = def(b.dataset.id); c.ready = !c.ready; if (c.ready) c.readyAt = today; save(); render(); toast(c.ready ? 'به معلم‌ها و معلم راهنما اعلام شد؛ ثبت نمرهٔ کارنامه برایشان باز شد.' : 'از معلم‌ها پس گرفته شد.'); },
    'md-cls': b => { state.dCls = b.dataset.id; render(); },
    'rc-approve': b => { const c = def(b.dataset.id); c.approved = !c.approved; save(); render(); toast(c.approved ? 'تأیید شد؛ حالا می‌توانید منتشر کنید.' : 'تأیید پس گرفته شد.'); },
    'rc-publish': b => { const c = def(b.dataset.id); if (!c.approved) return; c.published = !c.published; if (c.published) c.publishedAt = today; save(); render(); toast(c.published ? 'کارنامه منتشر شد.' : 'از انتشار برگشت.'); },
    'c-mode': b => { state.cardMode = b.dataset.id; render(); },
    'def-pub': b => { const c = def(b.dataset.id); c.published = !c.published; save(); render(); toast(c.published ? 'منتشر شد.' : 'به حالت تکمیل برگشت.'); },
    'w-save': () => {
      const c = def(state.def), g = d().grade, bad = [];
      c.weights = c.weights || {}; c.weights[g] = c.weights[g] || {};
      document.querySelectorAll('[data-wsub]').forEach(tr => {
        const w = Object.fromEntries([...tr.querySelectorAll('[data-w]')].map(i => [i.dataset.w, Math.max(0, +i.value || 0)]));
        if (Object.values(w).reduce((a, y) => a + y, 0) !== 20) bad.push(tr.dataset.wsub);
        c.weights[g][tr.dataset.wsub] = w;
      });
      if (bad.length) return toast(`جمع ضریب‌ها باید ۲۰ باشد: ${bad.join('، ')}`);
      save(); render(); toast('ضریب‌ها ذخیره شد.');
    },
    'c-cls': b => { state.cardCls = b.dataset.id; state.cardSid = ''; render(); },
    'c-st': b => { state.cardSid = b.dataset.id; render(); },
    'c-pdf': () => pdf(snapshot('card-sheet'), `کارنامه-${student(state.cardSid).name}`),
    'c-print': () => printEl(snapshot('card-sheet')),
  };
  function bind() {
    document.querySelectorAll('.mark-in').forEach(i => i.onchange = () => {
      const item = d().grades.find(g => g.id === i.dataset.item);
      if (i.value === '') delete item.scores[i.dataset.sid];
      else { const n = +i.value; if (n < 0 || n > item.max) { toast(`نمره باید بین صفر و ${fa(item.max)} باشد.`); i.value = item.scores[i.dataset.sid] ?? ''; return; } item.scores[i.dataset.sid] = n; }
      save(); i.classList.add('saved'); setTimeout(() => i.classList.remove('saved'), 900);
    });
    const c = def(state.def) || visibleDefs().slice(-1)[0];
    const ensure = sid => { const x = d(); x.cardMarks = x.cardMarks || {}; x.cardMarks[c.id] = x.cardMarks[c.id] || {}; x.cardMarks[c.id][sid] = x.cardMarks[c.id][sid] || {}; return (x.cardMarks[c.id][sid][state.subject] = x.cardMarks[c.id][sid][state.subject] || {}); };
    document.querySelectorAll('[data-cm]').forEach(i => i.onchange = () => {
      const e = ensure(i.dataset.cm);
      if (i.value === '') delete e.mark; else e.mark = Math.max(0, Math.min(20, +i.value));
      save(); i.classList.add('saved'); setTimeout(() => i.classList.remove('saved'), 900);
    });
    document.querySelectorAll('[data-cd]').forEach(t => { t.onchange = t.oninput = () => { ensure(t.dataset.cd).desc = t.value; save(); }; });
    const ms = document.getElementById('md-sub'); if (ms) ms.onchange = () => { state.dSub = ms.value; render(); };
    const imp = document.getElementById('x-import'); if (imp) imp.onchange = () => { if (imp.files[0]) importFile(imp.files[0]); };
    const cd = document.getElementById('c-def'); if (cd) cd.onchange = () => { state.def = cd.value; render(); };
    const cn = document.getElementById('card-note');
    if (cn) cn.oninput = () => { const x = d(); x.cardNotes = x.cardNotes || {}; x.cardNotes[state.def] = x.cardNotes[state.def] || {}; x.cardNotes[state.def][cn.dataset.cnote] = cn.value; save(); };
    document.querySelectorAll('.weights [data-w]').forEach(i => i.oninput = () => {
      const tr = i.closest('tr'), sum = [...tr.querySelectorAll('[data-w]')].reduce((a, y) => a + (+y.value || 0), 0), b = tr.querySelector('.wsum');
      b.textContent = fa(sum); b.classList.toggle('bad-txt', sum !== 20);
    });
  }
  // For the student and the parent: their own marks, and only the report cards the school has published.
  const family = {
    marks: sid => studentMarks(sid, true),
    cards: () => activeDefs().filter(c => c.published),
    sheet: (c, sid) => sheet(c, sid),
    avg: sid => { const x = d(), s = student(sid); return s ? r2(avg(x.termSubjects.map(su => subAvg(x, s, su)).filter(v => v != null))) : null; },
    recent: (sid, n = 5) => { const s = student(sid); return s ? d().grades.filter(i => i.cls === s.cls && i.scores[sid] != null).sort((a, b) => b.date.localeCompare(a.date)).slice(0, n) : []; },
  };
  return { viewOf: { marks: 'marks', mdash: 'mdash', cards: 'cards', cardDefs: 'cardDefs' }, pages: { marks, mdash, cards, cardDefs }, act, bind, computed, finalMark, feed, family };
};
