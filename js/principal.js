// The principal's own pages.
//   family      meetings with families: planned (grade, student, father/mother, Jalali date and time, topic, notes),
//               then once the time has passed a reminder asks for the record (date, who came, what was said, next steps)
//   attendance  attendance of every grade, the last day and the last school days
//   discCats    discipline items and their points, per grade, with «apply to every grade»
//   greport     a report on one grade: overview with charts, marks, study time, discipline
//   pdisc       discipline across the school: in every grade the three students with the most negative points
//               (the rest of the grade opens below), and the latest records; no recording from here
//   pobs        behaviour observations one grade at a time; an observation the principal records is sent to that
//               grade's counsellor as a reminder
const Principal = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { org, save, render, empty, school } = ctx;
  const today = J.todayIso();
  const GN = g => D.GRADE_NAME[g];
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const nowHM = () => new Date().toTimeString().slice(0, 5);
  const state = { grTab: 'all', grSub: '', grDrill: '', obsG: null, famG: null, famSid: '', wkEdit: false, wkSel: null };
  const gradeData = g => D.get(school().id, g);
  const stName = (g, sid) => gradeData(g).students.find(s => s.id === sid)?.name || '—';
  const studentOpts = (g, sel) => { const x = gradeData(g); return x.classes.map(c => `<optgroup label="${esc(c.name)}">${x.students.filter(s => s.cls === c.id)
    .map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join(''); };
  const gradeOpts = sel => D.gradesOf(school()).map(g => `<option value="${g}" ${g === sel ? 'selected' : ''}>پایهٔ ${esc(GN(g))}</option>`).join('');

  /* ---------------- family meetings ---------------- */
  // One list for planned and held meetings. Older saves kept them apart (family, familyAppts); merged once.
  function FM() {
    const o = org();
    if (!o.fmeet) {
      const parents = who => ({ father: /پدر/.test(who || ''), mother: /مادر/.test(who || '') });
      o.fmeet = [
        ...(o.family || []).map(m => ({ id: m.id, sample: m.sample !== false, grade: m.grade, sid: m.sid, ...parents(m.who), date: m.date, time: '', topic: m.topic, plan: '', status: 'done',
          record: { date: m.date, att: Object.fromEntries(Object.entries(parents(m.who)).filter(([, on]) => on).map(([k]) => [k, 'yes'])), text: m.text, actions: m.next ? [{ id: D.uid('fa'), text: m.next, done: false }] : [] } })),
        ...(o.familyAppts || []).filter(a => !a.done).map(a => ({ id: a.id, sample: a.sample !== false, grade: a.grade, sid: a.sid, ...parents(a.who), date: a.date, time: a.time || '', topic: a.topic, plan: '', status: 'planned' })),
      ];
      save();
    }
    // Sample meetings are dropped from grades that now hold real students.
    if (o.fmeet.some(m => m.sample && D.isReal(school().id, m.grade))) o.fmeet = o.fmeet.filter(m => !(m.sample && D.isReal(school().id, m.grade)));
    // Demo meetings with real students for a sales demonstration (7 Aban 1405), once: some held, some planned.
    // They are demo: true, not sample, so the line above keeps them.
    if (!o.fmeetDemo) { o.fmeetDemo = true; seedDemo(o); D.save(); }
    return o.fmeet;
  }
  function seedDemo(o) {
    let k = 5; const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; }, pick = l => l[Math.floor(r() * l.length)];
    const TOPIC = ['افت تحصیلی در ریاضی', 'غیبت‌های پشت سر هم', 'برنامه‌ریزی درسی در خانه', 'استفادهٔ زیاد از گوشی', 'انتخاب رشتهٔ سال بعد', 'رفتار در کلاس'];
    const TEXT = ['دربارهٔ وضعیت درسی و برنامهٔ خانه صحبت شد. خانواده همکاری خوبی دارند.', 'علت غیبت‌ها بیماری بوده است. قرار شد گواهی پزشک به مدرسه برسد.', 'ساعت مطالعه در خانه مشخص شد و پدر پیگیری می‌کند.'];
    const ACT = ['پیگیری دو هفتهٔ بعد', 'هماهنگی با معلم ریاضی', 'ارسال گزارش هفتگی به خانواده'];
    D.gradesOf(school()).forEach(g => { const x = D.get(school().id, g); if (!x.real) return;
      for (let i = 0; i < 2; i++) { const s = pick(x.students), held = i === 0, date = D.shift(held ? -3 - Math.floor(r() * 15) : 1 + Math.floor(r() * 8)), father = r() < 0.6, mother = !father || r() < 0.4;
        o.fmeet.push({ id: D.uid('fm'), demo: true, grade: g, sid: s.id, father, mother, date, time: pick(['08:30', '10:00', '12:45']), topic: pick(TOPIC), plan: '', status: held ? 'done' : 'planned',
          ...(held ? { record: { date, att: Object.fromEntries([['father', father], ['mother', mother]].filter(([, on]) => on).map(([kk]) => [kk, 'yes'])), text: pick(TEXT), actions: [{ id: D.uid('fa'), text: pick(ACT), done: r() < 0.4 }] } } : {}) }); }
    });
  }
  const whoTxt = m => [m.father && 'پدر', m.mother && 'مادر'].filter(Boolean).join(' و ') || '—';
  const isDue = m => m.status === 'planned' && (m.date < today || (m.date === today && (m.time || '00:00') <= nowHM()));
  const due = () => FM().filter(isDue).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = () => FM().filter(m => m.status === 'planned' && !isDue(m)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  // Next actions written in the principal's own meeting records whose date has passed and are not ticked done.
  const lateActions = () => FM().filter(m => m.status === 'done').flatMap(m => (m.record?.actions || []).filter(a => !a.done && a.due && a.due < today).map(a => ({ m, a })))
    .sort((x, y) => x.a.due.localeCompare(y.a.due));
  const when = m => `${J.format(m.date)}${m.time ? ' · ساعت ' + digits(m.time) : ''}`;

  // The page: what needs doing on top (records to write, meetings coming up), then one grade at a time:
  // compact chips of the students met, and the chosen student's meetings as a timeline.
  function family() {
    const gs = D.gradesOf(school()), d = due(), up = upcoming();
    if (!gs.includes(state.famG)) state.famG = ctx.grade();
    const g = state.famG, mine = FM().filter(m => m.grade === g);
    const studs = [...new Set(mine.map(m => m.sid))].map(sid => ({ sid, n: mine.filter(m => m.sid === sid).length, last: mine.filter(m => m.sid === sid).map(m => m.record?.date || m.date).sort().pop() }))
      .sort((a, b) => b.last.localeCompare(a.last));
    if (!studs.some(x => x.sid === state.famSid)) state.famSid = studs[0]?.sid || '';
    const slots = freeSlots().length;
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">${fa(up.length)} جلسهٔ پیش رو · ${fa(d.length)} منتظر شرح · ${fa(slots)} زمان آزاد جلسه با اولیا در دو هفتهٔ آینده</span>
</div>
      ${d.length ? `<div class="group-head"><h2>منتظر شرح جلسه</h2></div>${d.map(m => meetRow(m, true)).join('')}` : ''}
      ${lateActions().length ? `<div class="group-head"><h2>اقدام‌های عقب‌افتاده</h2></div><div class="card">${lateActions().map(({ m, a }) => `<label class="act-line"><input type="checkbox" data-fmact="${m.id}|${a.id}">
        <span>${esc(a.text)} <span class="muted small">· ${esc(stName(m.grade, m.sid))}، پایهٔ ${esc(GN(m.grade))} · مهلت ${esc(J.format(a.due, false))}</span></span></label>`).join('')}</div>` : ''}
      ${up.length ? `<div class="group-head"><h2>پیش رو</h2></div>${up.map(m => meetRow(m)).join('')}` : ''}
      <div class="group-head"><h2>جلسه‌ها به تفکیک پایه</h2></div>
      <div class="seg" role="radiogroup" aria-label="پایه" style="margin-bottom:10px">${gs.map(k => `<button role="radio" aria-checked="${k === g}" data-act="fm-g" data-id="${k}">${esc(GN(k))} ${FM().some(m => m.grade === k) ? `<span class="small">(${fa(new Set(FM().filter(m => m.grade === k).map(m => m.sid)).size)})</span>` : ''}</button>`).join('')}</div>
      ${studs.length ? `<div class="fm-chips" role="radiogroup" aria-label="دانش‌آموزان پایهٔ ${esc(GN(g))}">${studs.map(x => `<button role="radio" class="al-chip ${x.sid === state.famSid ? 'on' : ''}" aria-checked="${x.sid === state.famSid}" data-act="fm-st" data-id="${x.sid}">${esc(stName(g, x.sid))}<span>${fa(x.n)} جلسه</span></button>`).join('')}</div>
        ${studentTimeline(g, state.famSid)}` : `<div class="card">${empty(`در پایهٔ ${GN(g)} هنوز جلسه‌ای با خانواده‌ها نداشته‌اید.`)}</div>`}`;
  }
  function studentTimeline(g, sid) {
    const list = FM().filter(m => m.grade === g && m.sid === sid).sort((a, b) => (b.record?.date || b.date).localeCompare(a.record?.date || a.date));
    const attTag = (m, k) => { const a = m.record?.att?.[k]; return a ? `<span class="tag ${a === 'yes' ? 'ok' : 'bad'}">${k === 'father' ? 'پدر' : 'مادر'}: ${a === 'yes' ? 'حاضر شد' : 'نیامد'}</span>` : ''; };
    return `<div class="card"><div class="card-head"><h2 style="margin:0">${esc(stName(g, sid))}</h2><span class="muted small">پایهٔ ${esc(GN(g))} · ${fa(list.length)} جلسه</span></div>
      <ul class="timeline">${list.map(m => `<li><div class="spread"><div><b>${esc(m.topic)}</b> ${m.status === 'done' ? '' : `<span class="tag ${isDue(m) ? 'bad' : 'blue'}">${isDue(m) ? 'منتظر شرح' : 'پیش رو'}</span>`}
          ${m.record?.share ? '<span class="tag violet">برای معلم راهنما فرستاده شد</span>' : ''}</div>
          <div class="row">${m.status === 'done' ? `<button class="btn sm" data-act="fm-rec" data-id="${m.id}">ویرایش شرح</button><button class="btn sm" data-act="fm-note" data-id="${m.id}">+ نکته</button>` : `<button class="btn sm primary" data-act="fm-rec" data-id="${m.id}">ثبت شرح جلسه</button><button class="btn sm" data-act="fm-edit" data-id="${m.id}">ویرایش</button>`}</div></div>
        <div class="meta">${esc(J.format(m.record?.date || m.date))}${(m.record?.time || m.time) ? ' · ساعت ' + digits(m.record?.time || m.time) : ''} · با ${esc(whoTxt(m))} ${attTag(m, 'father')} ${attTag(m, 'mother')}</div>
        ${m.record ? `<p style="margin:6px 0 0;white-space:pre-line">${esc(m.record.text)}</p>` : m.plan ? `<p class="muted small" style="margin:6px 0 0">${esc(m.plan)}</p>` : ''}
        ${(m.record?.notes || []).map(n => `<div class="fm-note"><span class="muted small">نکته · ${esc(J.format(n.at.slice(0, 10), false))}</span> ${esc(n.text)}</div>`).join('')}
        ${(m.record?.actions || []).length ? `<div class="next"><b>اقدام‌های بعدی:</b>${m.record.actions.map(a => `<label class="act-line"><input type="checkbox" data-fmact="${m.id}|${a.id}" ${a.done ? 'checked' : ''}>
          <span style="${a.done ? 'text-decoration:line-through;color:var(--ink3)' : ''}">${esc(a.text)}${a.due ? ` <span class="muted small">(${esc(J.format(a.due, false))})</span>` : ''}</span></label>`).join('')}</div>` : ''}</li>`).join('')}</ul></div>`;
  }
  function meetRow(m, late) {
    return `<div class="card fm-row ${late ? 'late' : ''}"><div class="fm-when"><b>${esc(J.format(m.date, false))}</b><span class="muted small">${m.time ? digits(m.time) : ''}</span></div>
      <div class="fm-body"><b>${esc(stName(m.grade, m.sid))}</b> <span class="muted small">پایهٔ ${esc(GN(m.grade))} · با ${esc(whoTxt(m))}</span><div class="small">${esc(m.topic)}</div></div>
      <div class="row">${late ? `<button class="btn sm primary" data-act="fm-rec" data-id="${m.id}">ثبت شرح جلسه</button>` : `<button class="btn sm" data-act="fm-rec" data-id="${m.id}">برگزار شد</button>`}
        <button class="btn sm" data-act="fm-edit" data-id="${m.id}">ویرایش</button><button class="btn sm danger" data-act="fm-cancel" data-id="${m.id}">لغو</button></div></div>`;
  }

  /* the principal's own week: bells marked «جلسه با اولیا» become bookable slots */
  const PKINDS = { parents: ['جلسه با اولیا', 'teal'], council: ['جلسهٔ شورا', 'amber'], visit: ['بازدید کلاس', 'blue'], office: ['کار اداری', 'slate'], free: ['آزاد', 'slate'] };
  const PS = () => { const o = org(); if (!o.pSchedule) { o.pSchedule = D.DAYS.map(() => Array(D.BELLS).fill(null)); o.pSchedule[0][2] = { type: 'parents' }; o.pSchedule[2][3] = { type: 'parents' }; save(); } return o.pSchedule; };
  // Free «جلسه با اولیا» bells in the next two weeks (not already booked).
  function freeSlots(except) {
    const out = [], booked = new Set(FM().filter(m => m.status === 'planned' && m.id !== except).map(m => m.date + ' ' + m.time));
    for (let i = 0; i < 15; i++) {
      const date = D.shift(i, today), di = D.dayIndex(date); if (di == null) continue;
      PS()[di].forEach((c, b) => { const time = D.BELL_TIMES[b]; if (c?.type === 'parents' && !booked.has(date + ' ' + time) && (date > today || time > nowHM())) out.push({ date, time }); });
    }
    return out;
  }
  // Grid of the principal's week, editable cell by cell (pick a cell, then what goes in it).
  function myWeek() {
    const ps = PS(), edit = state.wkEdit;
    const opt = (k, [l, t], cur) => `<button type="button" class="pchip tone-${t}" data-act="pw-set" data-id="${k}" aria-pressed="${k === cur}">${l}</button>`;
    const sel = state.wkSel, cur = sel ? (ps[sel.d][sel.b]?.type || 'free') : '';
    return `<div class="spread" style="margin:12px 0 8px"><span class="muted small">خانه‌های «جلسه با اولیا» هنگام برنامه‌ریزی جلسه با خانواده‌ها، زمان آماده برای انتخاب می‌شوند.</span>
        <button class="btn sm ${edit ? 'primary' : ''}" data-act="pw-edit" aria-pressed="${!!edit}">${edit ? 'پایان ویرایش' : 'ویرایش برنامهٔ من'}</button></div>
      ${edit ? `<div class="palette card">${sel ? `<div class="prow"><b class="small">${esc(D.DAYS[sel.d])}، زنگ ${fa(sel.b + 1)} (${digits(D.BELL_TIMES[sel.b])}):</b></div><div class="prow">${Object.entries(PKINDS).map(([k, v2]) => opt(k, v2, cur)).join('')}</div>` : '<p class="small muted" style="margin:0">روی یک خانه بزنید.</p>'}</div>` : ''}
      <div class="table-wrap"><table class="tt"><tr><th></th>${D.withBreak(Array.from({ length: D.BELLS }, (_, b) => `<th>زنگ ${fa(b + 1)}<div class="small muted">${digits(D.BELL_TIMES[b])} تا ${digits(D.BELL_ENDS[b])}</div></th>`), `<th class="tt-break" scope="col"><span class="sr-only">زنگ تفریح و ناهار از </span>${digits(D.BREAK.from)}<br>تا<br>${digits(D.BREAK.to)}</th>`).join('')}</tr>
        ${D.DAYS.map((dn, d) => `<tr class="${d === D.dayIndex(today) ? 'tt-today' : ''}"><th scope="row">${dn}${d === D.dayIndex(today) ? ' <span class="tag blue">امروز</span>' : ''}</th>${D.withBreak(Array.from({ length: D.BELLS }, (_, b) => { const c = ps[d][b], [l, t] = c ? PKINDS[c.type] : ['', ''];
          const inner = c ? esc(l) : (edit ? '+' : '—'), on = sel && sel.d === d && sel.b === b;
          return `<td class="cell ${c ? 'tone-' + t : 'muted'} ${on ? 'sel' : ''}">${edit ? `<button type="button" class="cellbtn" data-act="pw-cell" data-d="${d}" data-b="${b}" aria-pressed="${!!on}" aria-label="${esc(dn)}، زنگ ${fa(b + 1)}: ${c ? esc(l) : 'خالی'}">${inner}</button>` : inner}</td>`; }), '<td class="tt-break"></td>').join('')}</tr>`).join('')}</table></div>`;
  }
  // Plan a meeting: grade, student, which parents (ticks), a free slot from the week or another day and time,
  // topic (speech-to-text) sent to the family, notes.
  function planModal(m) {
    let g = m?.grade || ctx.grade();
    const slots = freeSlots(m?.id), cur = m ? m.date + ' ' + m.time : '';
    const shown = slots.slice(0, 12), pick = m ? cur : (shown[0] ? shown[0].date + ' ' + shown[0].time : '');
    const other = !shown.some(s => s.date + ' ' + s.time === pick);
    const slotChips = shown.map(s => `<label class="chip"><input type="radio" name="fm-slot" value="${s.date} ${s.time}" ${s.date + ' ' + s.time === pick ? 'checked' : ''}>${esc(J.format(s.date, false))} · ${digits(s.time)}</label>`).join('');
    modal(`<h2>${m ? 'ویرایش جلسه' : 'جلسهٔ تازه با خانواده'}</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>پایه</span><select class="input" id="fm-g">${gradeOpts(g)}</select></label>
      <label class="field"><span>دانش‌آموز</span><select class="input" id="fm-s">${studentOpts(g, m?.sid)}</select></label></div>
      <fieldset class="field fm-who" style="border:0;padding:0"><legend class="small muted">با چه کسی (هر کدام لازم است تیک بزنید)</legend><div class="row">
        <label class="chip"><input type="checkbox" id="fm-f" ${m?.father ? 'checked' : ''}>پدر</label><label class="chip"><input type="checkbox" id="fm-m" ${m?.mother ? 'checked' : ''}>مادر</label></div></fieldset>
      <fieldset class="field fm-slot" style="border:0;padding:0"><legend class="small muted">زمان</legend><div class="chips" style="max-height:none">${slotChips}
        <label class="chip"><input type="radio" name="fm-slot" value="other" ${other ? 'checked' : ''}>زمان دیگر…</label></div>
        ${slots.length ? '' : '<p class="muted small" style="margin:4px 0 0">در دو هفتهٔ آینده زمان آزادِ «جلسه با اولیا» در برنامهٔ شما نیست؛ زمان دیگر را بزنید یا در برنامهٔ هفتگی‌تان زمان بگذارید.</p>'}</fieldset>
      <div class="grid g2 fm-other" style="gap:0 12px" ${other ? '' : 'hidden'}><div class="field"><span>روز</span>${J.field('fm-d', m?.date || D.shift(1, today))}</div>
        <label class="field"><span>ساعت</span><input class="input num" type="time" id="fm-t" value="${esc(m?.time || '10:00')}"></label></div>
      <label class="field"><span>موضوع</span><input class="input" id="fm-x" value="${esc(m?.topic || '')}"></label>${Voice.button('fm-x')}
      <label class="field"><span>توضیح برای خودتان</span><textarea class="input" id="fm-p" rows="2">${esc(m?.plan || '')}</textarea></label>
      <label class="share-line"><input type="checkbox" id="fm-fam" ${m ? (m.toFamily ? 'checked' : '') : 'checked'}><span><b>موضوع و زمان برای خانواده فرستاده شود</b><span class="muted small"> · در حساب خانواده (درگاه اولیا) دیده می‌شود؛ آن درگاه هنوز ساخته نشده و پیام تا آن موقع نگه داشته می‌شود.</span></span></label>
      ${Sms.block('fm-sms', { father: m ? m.father : true, mother: m?.mother })}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">${m ? 'ذخیره' : 'ثبت جلسه'}</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const slotOf = () => { const sl = root.querySelector('input[name=fm-slot]:checked')?.value; return !sl ? [] : sl === 'other' ? [v(root, '#fm-d'), v(root, '#fm-t')] : sl.split(' '); };
      const sms = Sms.wire(root, 'fm-sms', () => { const [date, time] = slotOf(); return date && v(root, '#fm-x') ? { name: stName(g, v(root, '#fm-s')), host: 'مدیر', date, time, topic: v(root, '#fm-x'), desc: v(root, '#fm-p') } : null; });
      root.querySelector('#fm-g').onchange = e => { g = +e.target.value; root.querySelector('#fm-s').innerHTML = studentOpts(g); };
      root.querySelectorAll('input[name=fm-slot]').forEach(r => r.onchange = () => { root.querySelector('.fm-other').hidden = root.querySelector('input[name=fm-slot]:checked')?.value !== 'other'; });
      root.querySelector('#save').onclick = () => {
        const father = root.querySelector('#fm-f').checked, mother = root.querySelector('#fm-m').checked, slot = root.querySelector('input[name=fm-slot]:checked')?.value;
        if (!v(root, '#fm-s')) return UI.invalid('#fm-s', 'دانش‌آموز را انتخاب کنید.');
        if (!father && !mother) return UI.invalid(root.querySelector('.fm-who'), 'پدر یا مادر یا هر دو را تیک بزنید.');
        if (!slot) return UI.invalid(root.querySelector('.fm-slot'), 'یک زمان یا «زمان دیگر» را انتخاب کنید.');
        if (!v(root, '#fm-x')) return UI.invalid('#fm-x', 'موضوع را بنویسید.');
        const [date, time] = slot === 'other' ? [v(root, '#fm-d'), v(root, '#fm-t')] : slot.split(' ');
        const toFamily = root.querySelector('#fm-fam').checked, smsTo = sms.who(); if (smsTo === false) return;
        const rec = { grade: g, sid: v(root, '#fm-s'), father, mother, date, time, topic: v(root, '#fm-x'), plan: v(root, '#fm-p'), toFamily };
        let meet = m; if (m) Object.assign(m, rec); else { meet = { id: D.uid('fm'), sample: false, status: 'planned', ...rec }; FM().push(meet); }
        // Kept for the family's account (the parents' portal).
        if (toFamily) { const o = org(); o.familyOutbox = (o.familyOutbox || []).filter(x => x.meet !== meet.id); o.familyOutbox.push({ id: D.uid('fo'), meet: meet.id, grade: g, sid: rec.sid, at: today, text: `دعوت به جلسه با مدیر مدرسه: ${rec.topic} · ${J.format(date)} ساعت ${digits(time)}` }); }
        state.famG = g; state.famSid = rec.sid;
        const smsMsg = smsTo ? Sms.queue(org, smsTo, { name: stName(g, rec.sid), host: 'مدیر', date, time, topic: rec.topic, desc: rec.plan, grade: g, sid: rec.sid, ref: meet.id, phone: gradeData(g).students.find(st => st.id === rec.sid)?.phone }) : '';
        save(); close(); render(); toast((m ? 'ذخیره شد.' : 'جلسه ثبت شد؛ بعد از برگزاری، شرح آن را در یادآورها از شما می‌خواهیم.') + (smsMsg ? ' ' + smsMsg : ''));
      };
    });
  }
  // The record of a held meeting, like a counsellor's session: date (planned by default), attendance of the
  // parents who were expected (only them), what was said (speech-to-text), next steps, and «send to the counsellor».
  function recordModal(id) {
    const m = FM().find(x => x.id === id); if (!m) return;
    const r = m.record || {}, acts = r.actions?.length ? r.actions : [{ text: '', due: '' }];
    const expected = [m.father && ['father', 'پدر'], m.mother && ['mother', 'مادر']].filter(Boolean);
    const actRow = (a, i) => `<div class="drow arow"><input class="input" data-a="text" value="${esc(a.text || '')}" placeholder="اقدام بعدی" aria-label="اقدام بعدی">
      ${J.field('fma-' + i + '-' + Date.now().toString(36), a.due || '')}<button type="button" class="btn sm" data-rm aria-label="حذف اقدام">×</button></div>`;
    modal(`<h2>شرح جلسه · ${esc(stName(m.grade, m.sid))}</h2><p class="muted small">پایهٔ ${esc(GN(m.grade))} · ${esc(m.topic)}${m.plan ? ' · ' + esc(m.plan) : ''}</p>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>تاریخ برگزاری</span>${J.field('fr-d', r.date || m.date)}</div>
        <label class="field"><span>ساعت</span><input class="input num" type="time" id="fr-t" value="${esc(r.time || m.time || '')}"></label></div>
      ${expected.map(([k, l]) => `<fieldset class="seg-radio" style="margin-top:10px"><legend class="small muted">حضور ${l}</legend>
        <label><input type="radio" name="att-${k}" value="yes" ${(r.att?.[k] || 'yes') === 'yes' ? 'checked' : ''}><span>حاضر شد</span></label>
        <label><input type="radio" name="att-${k}" value="no" ${r.att?.[k] === 'no' ? 'checked' : ''}><span>نیامد</span></label></fieldset>`).join('')}
      <label class="field"><span>شرح جلسه</span><textarea class="input" id="fr-x" rows="5">${esc(r.text || '')}</textarea></label>${Voice.button('fr-x')}
      <div class="field"><span>اقدام‌های بعدی</span><div id="fr-acts">${acts.map(actRow).join('')}</div>
        <button type="button" class="btn sm" id="fr-add" style="margin-top:6px;align-self:flex-start">+ اقدام دیگر</button></div>
      <label class="share-line"><input type="checkbox" id="fr-share" ${r.share ? 'checked' : ''}><span><b>انتشار به معلم راهنما</b><span class="muted small"> · شرح این جلسه برای معلم راهنمای پایهٔ ${esc(GN(m.grade))} یادآور می‌شود.</span></span></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت شرح جلسه</button><button class="btn" data-close>انصراف</button></div>`, root => {
      let n = 0;
      root.querySelector('#fr-add').onclick = () => root.querySelector('#fr-acts').insertAdjacentHTML('beforeend', actRow({ text: '', due: '' }, 'n' + n++));
      root.addEventListener('click', e => { if (e.target.closest('[data-rm]')) e.target.closest('.arow').remove(); });
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#fr-x')) return UI.invalid('#fr-x', 'شرح جلسه را بنویسید.');
        const old = r.actions || [], share = root.querySelector('#fr-share').checked;
        const actions = [...root.querySelectorAll('.arow')].map(row => ({ text: row.querySelector('[data-a=text]').value.trim(), due: row.querySelector('input[type=hidden]').value }))
          .filter(a => a.text).map(a => ({ id: old.find(o => o.text === a.text)?.id || D.uid('fa'), text: a.text, due: a.due, done: !!old.find(o => o.text === a.text)?.done }));
        m.record = { ...r, date: v(root, '#fr-d'), time: v(root, '#fr-t'), att: Object.fromEntries(expected.map(([k]) => [k, root.querySelector(`input[name=att-${k}]:checked`).value])), text: v(root, '#fr-x'), actions, share };
        m.status = 'done';
        if (share && (!r.share || r.text !== m.record.text)) sendToCounselor(m, `جلسهٔ مدیر با خانوادهٔ ${stName(m.grade, m.sid)} (${m.topic}): ${m.record.text}`);
        state.famG = m.grade; state.famSid = m.sid;
        save(); close(); render(); toast(share ? `ثبت شد و برای معلم راهنمای پایهٔ ${GN(m.grade)} فرستاده شد.` : 'شرح جلسه ثبت شد.');
      };
    });
  }
  const sendToCounselor = (m, text) => gradeData(m.grade).reminders.push({ id: D.uid('r'), text, date: today, sid: m.sid, done: false, from: 'principal' });
  // A later note on a held meeting (speech-to-text), optionally sent to the counsellor too.
  function noteModal(id) {
    const m = FM().find(x => x.id === id); if (!m) return;
    modal(`<h2>نکتهٔ تازه · ${esc(stName(m.grade, m.sid))}</h2><label class="field"><span>نکته</span><textarea class="input" id="fn-x" rows="3"></textarea></label>${Voice.button('fn-x')}
      <label class="share-line"><input type="checkbox" id="fn-share" ${m.record?.share ? 'checked' : ''}><span><b>برای معلم راهنما هم فرستاده شود</b></span></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">افزودن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#fn-x')) return UI.invalid('#fn-x', 'نکته را بنویسید.');
        m.record.notes = [...(m.record.notes || []), { at: new Date().toISOString(), text: v(root, '#fn-x') }];
        if (root.querySelector('#fn-share').checked) sendToCounselor(m, `نکتهٔ مدیر دربارهٔ ${stName(m.grade, m.sid)}: ${v(root, '#fn-x')}`);
        save(); close(); render(); toast('نکته افزوده شد.');
      };
    });
  }
  // Reminder cards for meetings whose time has passed (shown with the principal's other reminders).
  const dueCards = () => due().map(m => `<article class="rcard late"><div class="spread"><span class="tag bad">شرح جلسه</span><span class="muted small">${esc(J.format(m.date, false))}</span></div>
      <p>شرح جلسه با ${esc(whoTxt(m))} ${esc(stName(m.grade, m.sid))} را وارد کنید.</p><span class="muted small">پایهٔ ${esc(GN(m.grade))} · ${esc(m.topic)}</span>
      <div class="row"><button class="btn sm primary" data-act="fm-rec" data-id="${m.id}">ثبت شرح جلسه</button></div></article>`).join('');
  const upcomingRows = (n = 4) => { const up = upcoming().slice(0, n);
    return up.length ? up.map(m => meetRow(m)).join('') : `<div class="card">${empty('جلسهٔ پیش رویی با خانواده‌ها نیست.')}</div>`; };
  const heldLast30 = () => FM().filter(m => m.status === 'done' && (m.record?.date || m.date) >= D.shift(-30, today)).length;
  const feed = () => due().map(m => ({ key: 'fm:' + m.id, type: 'family', title: `شرح جلسه با خانوادهٔ ${stName(m.grade, m.sid)}`, text: `${m.topic} · پایهٔ ${GN(m.grade)}`, at: m.date + (m.time ? 'T' + m.time : ''), unread: true, open: () => recordModal(m.id) }));

  /* ---------------- attendance ---------------- */
  // Share present (present or late) per day for a grade, from the attendance journal ({ 'class|date': { sid: 'p'|'l'|'a' } }).
  function attDays(g) {
    const att = gradeData(g).attendance || {}, by = {};
    Object.entries(att).forEach(([k, marks]) => { const day = k.split('|')[1]; const vals = Object.values(marks); (by[day] = by[day] || { p: 0, n: 0 }); by[day].n += vals.length; by[day].p += vals.filter(x => x !== 'a').length; });
    return Object.entries(by).sort((a, b) => a[0].localeCompare(b[0])).map(([day, { p, n }]) => ({ day, pct: n ? Math.round(p / n * 100) : null }));
  }
  const lastPct = g => attDays(g).slice(-1)[0]?.pct ?? null;
  function attendance() {
    const gs = D.gradesOf(school());
    return `<div class="card"><h2 style="margin-top:0">حضور آخرین روز در هر پایه</h2><div class="hbars">${gs.map(g => { const p = lastPct(g);
        return `<a class="hbar" href="#/g/${g}/desk"><span class="hb-l">پایهٔ ${esc(GN(g))}</span><span class="hb-t"><i style="width:${p ?? 0}%"></i></span><b class="num">${p == null ? 'ثبت نشده' : fa(p) + '٪'}</b></a>`; }).join('')}</div></div>
      <div class="card"><h2 style="margin-top:0">روزهای اخیر</h2><div class="table-wrap"><table><thead><tr><th>پایه</th>${(() => { const days = [...new Set(gs.flatMap(g => attDays(g).slice(-5).map(x => x.day)))].sort().slice(-5); state.attDays = days;
        return days.map(dd => `<th>${esc(J.format(dd, false))}</th>`).join(''); })()}</tr></thead><tbody>
        ${gs.map(g => { const m = Object.fromEntries(attDays(g).map(x => [x.day, x.pct])); return `<tr><td>پایهٔ ${esc(GN(g))}</td>${state.attDays.map(dd => `<td class="num ${m[dd] != null && m[dd] < 90 ? 'bad-txt' : ''}">${m[dd] == null ? '—' : fa(m[dd]) + '٪'}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
        <p class="muted small">زیر ۹۰٪ قرمز است. «تأخیر» حاضر حساب می‌شود.</p></div>`;
  }

  /* ---------------- discipline items ---------------- */
  // The items-and-points editor. The principal saves for one grade or for all; a counsellor uses the same editor
  // for their own grade only (their personal list).
  function catEditor(x, forAll) {
    if (ctx.readOnly()) return `<div class="card"><div class="table-wrap"><table class="no-cards"><thead><tr><th>مورد</th><th>امتیاز</th></tr></thead><tbody>
      ${x.discCats.map(c => `<tr><td>${esc(c.name)}</td><td class="num">${Disc.ptsText(c)}</td></tr>`).join('')}</tbody></table></div></div>`;
    return `<div class="card"><div class="table-wrap"><table class="no-cards"><thead><tr><th>مورد</th><th>امتیاز (منفی برای تخلف)</th><th>تا (اگر بازه است)</th><th><span class="sr-only">حذف</span></th></tr></thead><tbody>
        ${x.discCats.map(c => `<tr data-dc="${c.id}"><td><input class="input" data-dc-n value="${esc(c.name)}" aria-label="نام مورد"></td>
          <td><input class="input num" type="number" step="1" data-dc-p value="${c.pts}" style="width:100px" aria-label="امتیاز ${esc(c.name)}"></td>
          <td><input class="input num" type="number" step="1" data-dc-to value="${c.to ?? ''}" style="width:100px" aria-label="سر دیگر بازهٔ امتیاز ${esc(c.name)}"></td>
          <td><button class="btn sm danger" data-act="dc2-del" data-id="${c.id}">حذف</button></td></tr>`).join('')}</tbody></table></div>
        <div class="row" style="margin-top:12px"><input class="input" id="dc-new-n" placeholder="مورد تازه، مثلاً استفاده از تلفن همراه در کلاس" style="flex:1;min-width:200px" aria-label="مورد تازه">
          <input class="input num" type="number" id="dc-new-p" placeholder="امتیاز" style="width:100px" aria-label="امتیاز مورد تازه"><button class="btn" data-act="dc2-add">افزودن</button></div>
        <div class="row" style="margin-top:12px"><button class="btn primary" data-act="dc2-save">ذخیره برای این پایه</button>${forAll ? '<button class="btn" data-act="dc2-all">ذخیره و اعمال در همهٔ پایه‌ها</button>' : ''}</div></div>`;
  }
  function discCats() {
    const x = ctx.data();
    return `<p class="note">موارد انضباطی و امتیاز هر کدام برای پایهٔ ${esc(GN(x.grade))}. پایه را از بالای صفحه عوض کنید؛ با «اعمال در همهٔ پایه‌ها» همین فهرست برای همهٔ پایه‌ها ثبت می‌شود. معلم راهنمای هر پایه هم می‌تواند فهرست پایهٔ خودش را تغییر دهد.</p>
      ${catEditor(x, true)}`;
  }
  // Read the table back; returns null (with the error shown) if something is wrong.
  function readCats() {
    const rows = [...document.querySelectorAll('[data-dc]')];
    for (const r of rows) {
      if (!r.querySelector('[data-dc-n]').value.trim()) { UI.invalid(r.querySelector('[data-dc-n]'), 'نام مورد خالی است.'); return null; }
      if (r.querySelector('[data-dc-p]').value === '' || isNaN(+r.querySelector('[data-dc-p]').value)) { UI.invalid(r.querySelector('[data-dc-p]'), 'امتیاز را بنویسید.'); return null; }
    }
    for (const r of rows) {
      const p = +r.querySelector('[data-dc-p]').value, t = r.querySelector('[data-dc-to]').value;
      if (t !== '' && (isNaN(+t) || Math.sign(+t) !== Math.sign(p))) { UI.invalid(r.querySelector('[data-dc-to]'), 'سر دیگر بازه هم‌علامت امتیاز باشد، یا خالی بماند.'); return null; }
    }
    return rows.map(r => { const t = r.querySelector('[data-dc-to]').value, p = Math.round(+r.querySelector('[data-dc-p]').value);
      return { id: r.dataset.dc, name: r.querySelector('[data-dc-n]').value.trim(), pts: p, to: t === '' || Math.round(+t) === p ? undefined : Math.round(+t) }; });
  }
  function saveCats(all) {
    const list = readCats(); if (!list) return;
    const x = ctx.data();
    const put = (c, n) => { c.name = n.name; c.pts = n.pts; if (n.to == null) delete c.to; else c.to = n.to; };
    list.forEach(n => put(x.discCats.find(c => c.id === n.id), n));
    if (all) D.gradesOf(school()).filter(g => g !== x.grade).forEach(g => {
      const y = gradeData(g);
      list.forEach(n => { const same = y.discCats.find(c => c.name === n.name) || y.discCats.find(c => c.id === n.id);
        if (same) put(same, n); else { const c = { id: D.uid('d') }; put(c, n); y.discCats.push(c); } });
    });
    save(); render(); toast(all ? 'برای همهٔ پایه‌ها ذخیره شد.' : 'ذخیره شد.');
  }

  /* ---------------- grade report ---------------- */
  const BLOCK_MIN = 45; // a timeboxing block counts as 45 minutes
  const mins = (a, b) => { const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number); return Math.max(0, h2 * 60 + m2 - h1 * 60 - m1); };
  const wday = iso => (new Date(iso + 'T12:00:00').getDay() + 1) % 7;
  // Minutes studied on a day, from the study plan: done time slots, or done blocks × 45.
  function studyMin(x, sid, day) {
    const p = x.studyPlans?.[sid]; if (!p) return null;
    if (p.method === 'activity') return ActivityLog.minutesOf(p, day, 'study');
    const l = p.log?.[day]; if (!l) return 0;
    if (p.method === 'schedule') return (p.schedule[wday(day)] || []).filter(i => l.done?.[i.id]).reduce((s, i) => s + mins(i.from, i.to), 0);
    return (l.boxes || []).filter(b => b?.done).length * BLOCK_MIN;
  }
  function report(x) {
    const week = [...Array(7)].map((_, i) => D.shift(i - 6, today)), cut = D.shift(-30, today);
    const cats = Object.fromEntries(x.discCats.map(c => [c.id, c]));
    return x.students.map(s => {
      const marks = x.grades.filter(i => i.cls === s.cls && i.scores[s.id] != null);
      const avg = marks.length ? Math.round(marks.reduce((a, i) => a + i.scores[s.id] / i.max, 0) / marks.length * 2000) / 100 : null;
      const subj = Object.fromEntries(x.termSubjects.map(su => { const ms = marks.filter(i => i.subject === su); return [su, ms.length ? ms.reduce((a, i) => a + i.scores[s.id] / i.max, 0) / ms.length * 20 : null]; }));
      const days = week.map(dd => studyMin(x, s.id, dd)), hasPlan = days.some(m => m != null);
      const recs = x.discipline.filter(r => r.sid === s.id && r.date >= cut);
      const neg = recs.reduce((a, r) => a + Math.min(0, Disc.recPts(x, r)), 0), pos = recs.reduce((a, r) => a + Math.max(0, Disc.recPts(x, r)), 0);
      return { s, avg, subj, week: hasPlan ? days.map(m => m || 0) : null, studyWeek: hasPlan ? days.reduce((a, m) => a + (m || 0), 0) : null,
        neg, pos, negObs: x.obs.filter(o => o.tone === 'neg' && o.date >= cut && o.sids.includes(s.id)).length, recs };
    });
  }
  // Horizontal bars in plain HTML: each bar carries its value as text, so nothing depends on colour alone.
  const bars = (rows, max, fmt) => `<div class="hbars">${rows.map(([label, val, href]) => `<${href ? `a href="${href}"` : 'div'} class="hbar"><span class="hb-l">${esc(label)}</span>
      <span class="hb-t"><i style="width:${max && val != null ? Math.max(2, Math.round(val / max * 100)) : 0}%"></i></span><b class="num">${val == null ? '—' : fmt(val)}</b></${href ? 'a' : 'div'}>`).join('')}</div>`;
  const vbars = (rows, max, fmt, label) => `<div class="vbars" role="img" aria-label="${esc(label)}: ${rows.map(([l, v]) => `${l} ${v == null ? 'بدون داده' : fmt(v)}`).join('، ')}">${rows.map(([l, v]) => `<div class="vb"><b class="num">${v == null ? '' : fmt(v)}</b>
      <span class="vb-t"><i style="height:${max && v ? Math.max(3, Math.round(v / max * 100)) : 0}%"></i></span><span class="vb-l">${esc(l)}</span></div>`).join('')}</div>`;
  // One subject at a time: its marks, the study logged for it, and discipline in its lessons.
  const TABS = [['all', 'وضعیت کلی پایه'], ['marks', 'نمره'], ['study', 'مطالعه'], ['disc', 'انضباط']];
  // The four kinds averaged in the report; every mark is first turned into a mark out of 20 (e.g. 5 of 6 → 16.67).
  const RTYPES = [['exam', 'آزمون فصلی'], ['quiz', 'کوییز'], ['oral', 'پرسش کلاسی'], ['hw', 'تکالیف']];
  const mean = vs => vs.length ? vs.reduce((a, v) => a + v, 0) / vs.length : null;
  const of20 = n => n == null ? '—' : fa(Math.round(n * 100) / 100);
  // A study slot or block belongs to a subject when tagged with it, or (older entries) when its text names it.
  const forSub = (item, su) => item.subject ? item.subject === su : String(item.task || item.text || '').includes(su);
  function studyMinSub(x, sid, day, su) {
    const p = x.studyPlans?.[sid]; if (!p) return null;
    if (p.method === 'activity') return ActivityLog.minutesOf(p, day, 'study', su);
    const l = p.log?.[day]; if (!l) return 0;
    if (p.method === 'schedule') return (p.schedule[wday(day)] || []).filter(i => l.done?.[i.id] && forSub(i, su)).reduce((t, i) => t + mins(i.from, i.to), 0);
    return (l.boxes || []).filter(bx => bx?.done && forSub(bx, su)).length * BLOCK_MIN;
  }
  // The lesson a discipline record happened in: the student's class timetable at that day and bell.
  const recSubject = (x, r, cls) => { if (r.subject) return r.subject; const di = D.dayIndex(r.date); return r.bell && di != null && cls ? D.clsCell(x, cls, di, r.bell - 1, D.weekStart(r.date)) : null; };
  // The grade at a glance. Each tile and each bar opens a detail view of who is behind the number.
  const BINS = [[0, 10, 'زیر ۱۰'], [10, 12, '۱۰ تا ۱۲'], [12, 14, '۱۲ تا ۱۴'], [14, 16, '۱۴ تا ۱۶'], [16, 18, '۱۶ تا ۱۸'], [18, 20.01, '۱۸ تا ۲۰']];
  // A tile is just a name and, when there is one, a big number (or an icon); a tap opens who is behind it.
  const tileBtn = (id, label, value, tone, ic) => `<button type="button" class="card kpi kpi-btn gr-tile tone-${tone}" data-act="gr-drill" data-id="${id}"><div class="l">${esc(label)}</div>${value != null ? `<div class="v">${value}</div>` : `<div class="gt-ic">${Shell.icon(ic)}</div>`}</button>`;
  // «Refer to the grade counsellor»: the principal flags a student at risk; it lands in that counsellor's reminders.
  const referred = (x, sid, kind) => x.reminders.some(r => r.from === 'principal' && r.risk === kind && r.sid === sid && !r.done);
  const referBtn = (x, sid, kind) => referred(x, sid, kind) ? '<span class="tag violet">ارجاع شد</span>'
    : `<button class="btn sm" data-act="gr-refer" data-id="${sid}" data-kind="${kind}">ارجاع به معلم راهنما</button>`;
  function riskText(x, r, kind) {
    if (kind === 'low') { const weak = x.termSubjects.filter(su => r.subj[su] != null && r.subj[su] < 12);
      return `ارجاع مدیر ـ خطر تحصیلی: ${r.s.name}، میانگین ${of20(r.avg)} از ۲۰${weak.length ? `؛ زیر ۱۲ در ${weak.join('، ')}` : ''}. لطفاً بررسی و پیگیری کنید.`; }
    const ng = r.recs.filter(rc => Disc.recPts(x, rc) < 0);
    return `ارجاع مدیر ـ خطر انضباطی: ${r.s.name}، ${fa(ng.length)} مورد منفی (${fa(r.neg)} امتیاز) در ۳۰ روز گذشته: ${[...new Set(ng.map(rc => Disc.catOf(x, rc).name))].join('، ')}. لطفاً بررسی و پیگیری کنید.`;
  }
  function refer(sids, kind) {
    const x = ctx.data(), rows = report(x), todo = sids.filter(sid => !referred(x, sid, kind));
    todo.forEach(sid => { const r = rows.find(o => o.s.id === sid); if (r) x.reminders.push({ id: D.uid('r'), text: riskText(x, r, kind), date: today, sid, done: false, from: 'principal', risk: kind }); });
    save(); render(); toast(todo.length ? `${fa(todo.length)} ارجاع برای معلم راهنمای پایهٔ ${GN(x.grade)} فرستاده شد؛ در یادآورهایش می‌آید.` : 'قبلاً ارجاع شده بود.');
  }
  const referAll = (list, kind) => list.length && !ctx.readOnly() ? `<button class="btn sm" data-act="gr-refer-all" data-kind="${kind}" data-ids="${list.map(r => r.s.id).join(',')}">ارجاع همه به معلم راهنما</button>` : '';
  function overview(x, rows, href) {
    const withMarks = rows.filter(r => r.avg != null), withStudy = rows.filter(r => r.studyWeek != null);
    const low = withMarks.filter(r => r.avg < 12), negRows = rows.filter(r => r.neg < 0);
    const need = rows.filter(r => (r.avg != null && r.avg < 12) || r.neg <= -5 || r.studyWeek === 0);
    const avgAll = mean(withMarks.map(r => r.avg));
    const subs = x.termSubjects, back = `<button class="btn sm" data-act="gr-drill" data-id="">‹ بازگشت به وضعیت کلی</button>`;
    const nameCell = r => `<td><a href="${href(r.s.id)}">${esc(r.s.name)}</a></td>`;
    const drill = state.grDrill || '';
    if (drill === 'avg' || drill === 'low') {
      const list = (drill === 'low' ? low : withMarks).slice().sort((a, b) => b.avg - a.avg);
      const title = drill === 'low' ? 'خطر تحصیلی: میانگین زیر ۱۲' : 'میانگین درس به درس دانش‌آموزان';
      const cell = v => `<td class="num ${v != null && v < 12 ? 'bad-txt' : ''}">${of20(v)}</td>`;
      const isLow = drill === 'low';
      return `<div class="spread" style="margin-bottom:10px"><h2 style="margin:0">${title}</h2><div class="row">${isLow ? referAll(list, 'low') : ''}${back}</div></div>
        <div class="card"><div class="table-wrap"><table class="gr-table"><thead><tr><th>نام</th>${subs.map(su => `<th>${esc(su)}</th>`).join('')}<th>میانگین کل</th>${isLow ? '<th></th>' : ''}</tr></thead><tbody>
          ${drill === 'avg' ? `<tr class="gr-total"><td>میانگین پایه</td>${subs.map(su => `<td class="num">${of20(mean(withMarks.map(r => r.subj[su]).filter(v => v != null)))}</td>`).join('')}<td class="num">${of20(avgAll)}</td></tr>` : ''}
          ${list.map(r => `<tr>${nameCell(r)}${subs.map(su => cell(r.subj[su])).join('')}<td class="num"><b>${of20(r.avg)}</b></td>${isLow ? `<td>${referBtn(x, r.s.id, 'low')}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${subs.length + 3}">${empty('کسی در این گروه نیست.')}</td></tr>`}</tbody></table></div>
          <p class="muted small">همه از ۲۰؛ نمره‌های زیر ۱۲ قرمزند. «—» یعنی هنوز نمره‌ای در آن درس ثبت نشده.</p></div>`;
    }
    if (drill === 'study') {
      const week = [...Array(7)].map((_, i) => D.shift(i - 6, today));
      const per = withStudy.map(r => ({ r, m: Object.fromEntries(subs.map(su => [su, week.reduce((a, dd) => a + (studyMinSub(x, r.s.id, dd, su) || 0), 0)])) })).sort((a, b) => b.r.studyWeek - a.r.studyWeek);
      const hrs = m => m ? `${fa(Math.round(m / 60 * 10) / 10)}` : '—';
      return `<div class="spread" style="margin-bottom:10px"><h2 style="margin:0">مطالعهٔ هفت روز گذشته، درس به درس (ساعت)</h2>${back}</div>
        <div class="card"><div class="table-wrap"><table class="gr-table"><thead><tr><th>نام</th>${subs.map(su => `<th>${esc(su)}</th>`).join('')}<th>جمع</th></tr></thead><tbody>
          ${per.map(({ r, m }) => `<tr>${nameCell(r)}${subs.map(su => `<td class="num">${hrs(m[su])}</td>`).join('')}<td class="num"><b>${hrs(r.studyWeek)}</b></td></tr>`).join('') || `<tr><td colspan="${subs.length + 2}">${empty('برنامهٔ مطالعه‌ای ثبت نشده.')}</td></tr>`}</tbody></table></div>
          <p class="muted small">${fa(rows.length - withStudy.length)} دانش‌آموز هنوز برنامهٔ مطالعه ندارند. مطالعهٔ بدون درس در ستون «جمع» حساب می‌شود.</p></div>`;
    }
    if (drill === 'disc') {
      const cats = Object.fromEntries(x.discCats.map(c => [c.id, c])), clsOf = sid => x.students.find(st => st.id === sid)?.cls;
      return `<div class="spread" style="margin-bottom:10px"><h2 style="margin:0">خطر انضباطی: موارد منفی ۳۰ روز گذشته</h2><div class="row">${referAll(negRows, 'disc')}${back}</div></div>
        <div class="card"><div class="table-wrap"><table class="gr-table"><thead><tr><th>نام</th><th>تعداد</th><th>امتیاز</th><th>موارد</th><th>در کلاس</th><th></th></tr></thead><tbody>
          ${negRows.slice().sort((a, b) => a.neg - b.neg).map(r => { const ng = r.recs.filter(rc => Disc.recPts(x, rc) < 0);
            const names = [...new Set(ng.map(rc => Disc.catOf(x, rc).name))], where = [...new Set(ng.map(rc => recSubject(x, rc, clsOf(r.s.id))).filter(Boolean))];
            return `<tr>${nameCell(r)}<td class="num">${fa(ng.length)}</td><td class="num"><b>${fa(r.neg)}</b></td><td class="small">${names.map(esc).join('، ')}</td><td class="small">${where.map(esc).join('، ') || '—'}</td><td>${referBtn(x, r.s.id, 'disc')}</td></tr>`; }).join('') || `<tr><td colspan="6">${empty('مورد منفی‌ای نیست.')}</td></tr>`}</tbody></table></div></div>`;
    }
    if (drill === 'dist') {
      if (!subs.includes(state.grSub)) state.grSub = subs.includes('ریاضی') ? 'ریاضی' : subs[0];
      const su = state.grSub, vals = rows.filter(r => r.subj[su] != null);
      const bins = BINS.map(([a, b, l]) => [l, vals.filter(r => r.subj[su] >= a && r.subj[su] < b).sort((p1, p2) => p2.subj[su] - p1.subj[su])]), bmax = Math.max(1, ...bins.map(b => b[1].length));
      const sel = state.grBin != null ? bins[state.grBin] : null;
      return `<div class="spread" style="margin-bottom:10px"><h2 style="margin:0">پراکندگی نمره‌های ${esc(su)} (از ۲۰)</h2>${back}</div>
        <div class="gr-subs" role="radiogroup" aria-label="درس">${subs.map(k => `<button type="button" role="radio" class="pchip ${k === su ? 'on' : ''}" aria-checked="${k === su}" data-act="gr-sub" data-id="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div class="card">${vals.length ? `<div class="vbars">${bins.map(([l, list], i) => `<button type="button" class="vb vb-btn ${state.grBin === i ? 'on' : ''}" data-act="gr-bin" data-id="${i}" aria-pressed="${state.grBin === i}" aria-label="${esc(l)}: ${fa(list.length)} دانش‌آموز"><b class="num">${fa(list.length)}</b>
            <span class="vb-t"><i style="height:${list.length ? Math.max(3, Math.round(list.length / bmax * 100)) : 0}%"></i></span><span class="vb-l">${esc(l)}</span></button>`).join('')}</div>` : empty(`هنوز برای ${su} نمره‌ای ثبت نشده.`)}</div>
        ${sel ? `<div class="card"><h2 style="margin-top:0">${esc(su)}: ${esc(sel[0])}</h2>${sel[1].length ? `<ul class="gr-list">${sel[1].map(r => `<li><a href="${href(r.s.id)}">${esc(r.s.name)}</a><b class="num">${of20(r.subj[su])}</b></li>`).join('')}</ul>` : empty('کسی در این بازه نیست.')}</div>` : ''}`;
    }
    if (drill === 'need') {
      return `<div class="spread" style="margin-bottom:10px"><h2 style="margin:0">نیازمند توجه</h2>${back}</div>
        <div class="card"><div class="table-wrap"><table class="gr-table"><thead><tr><th>نام</th><th>میانگین</th><th>درس‌های زیر ۱۲</th><th>امتیاز انضباطی</th><th>مطالعهٔ هفته</th></tr></thead><tbody>
          ${need.map(r => `<tr>${nameCell(r)}<td class="num ${r.avg != null && r.avg < 12 ? 'bad-txt' : ''}">${of20(r.avg)}</td><td class="small">${subs.filter(su => r.subj[su] != null && r.subj[su] < 12).map(esc).join('، ') || '—'}</td>
            <td class="num ${r.neg <= -5 ? 'bad-txt' : ''}">${fa(r.neg)}</td><td class="num">${r.studyWeek == null ? 'بدون برنامه' : r.studyWeek === 0 ? '<span class="bad-txt">هیچ</span>' : `${fa(Math.round(r.studyWeek / 60 * 10) / 10)} ساعت`}</td></tr>`).join('') || `<tr><td colspan="5">${empty('موردی نیست.')}</td></tr>`}</tbody></table></div>
          <p class="muted small">کسی اینجاست که میانگینش زیر ۱۲ باشد، امتیاز انضباطی‌اش ۵- یا کمتر باشد، یا در هفتهٔ گذشته اصلاً مطالعه ثبت نکرده باشد.</p></div>`;
    }
    return `<div class="grid g3 gr-tiles gr-six">
        ${tileBtn('avg', 'میانگین نمره', of20(avgAll), 'blue')}
        ${tileBtn('low', 'خطر تحصیلی', fa(low.length), 'rose')}
        ${tileBtn('study', 'مطالعهٔ هفتگی', null, 'teal', 'book')}
        ${tileBtn('disc', 'خطر انضباطی', fa(negRows.length), 'amber')}
        ${tileBtn('dist', 'پراکندگی میانگین‌ها', null, 'violet', 'layers')}
        ${tileBtn('need', 'نیازمند توجه', fa(need.length), 'slate')}</div>`;
  }
  function greport() {
    const x = ctx.data(), g = x.grade, href = sid => `#/g/${g}/student/${sid}`, subs = x.termSubjects;
    if (!TABS.some(t => t[0] === state.grTab)) state.grTab = 'all';
    if (!subs.includes(state.grSub)) state.grSub = subs.includes('ریاضی') ? 'ریاضی' : subs[0];
    const su = state.grSub;
    const head = `<p class="muted small" style="margin:0 0 10px">پایهٔ ${esc(GN(g))} · ${fa(x.students.length)} دانش‌آموز</p>
      <div class="seg" role="radiogroup" aria-label="بخش گزارش" style="margin-bottom:10px">${TABS.map(([k, l]) => `<button role="radio" aria-checked="${state.grTab === k}" data-act="gr-tab" data-id="${k}">${l}</button>`).join('')}</div>
      ${state.grTab === 'all' ? '' : `<div class="gr-subs" role="radiogroup" aria-label="درس">${subs.map(k => `<button type="button" role="radio" class="pchip ${k === su ? 'on' : ''}" aria-checked="${k === su}" data-act="gr-sub" data-id="${esc(k)}">${esc(k)}</button>`).join('')}</div>`}`;
    const tiles = list => `<div class="grid g4 gr-tiles">${list.map(([l, v, sub2, tone]) => ctx.kpi(l, v, sub2, '', tone)).join('')}</div>`;
    let body;
    if (state.grTab === 'all') body = overview(x, report(x), href);
    else if (state.grTab === 'marks') {
      const items = x.grades.filter(i => i.subject === su);
      const stAvg = (sid, cls, t) => mean(items.filter(i => i.cls === cls && i.type === t && i.scores[sid] != null).map(i => i.scores[sid] / i.max * 20));
      const rows = x.students.map(st => ({ st, v: Object.fromEntries(RTYPES.map(([t]) => [t, stAvg(st.id, st.cls, t)])) }));
      const avgOf = (rs, t) => mean(rs.map(r => r.v[t]).filter(v => v != null));
      body = !items.length ? `<div class="card">${empty(`هنوز برای ${su} در این پایه نمره‌ای ثبت نشده.`)}</div>` : tiles(RTYPES.map(([t, l], i) => [`میانگین ${l}`, of20(avgOf(rows, t)), 'از ۲۰ · کل پایه', ['blue', 'violet', 'teal', 'amber'][i]]))
        + `<div class="card"><h2 style="margin-top:0">${esc(su)} به تفکیک کلاس (از ۲۰)</h2><div class="table-wrap"><table class="gr-table"><thead><tr><th>کلاس</th>${RTYPES.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
          ${x.classes.map(c => { const rs = rows.filter(r => r.st.cls === c.id); return `<tr><td>${esc(c.name)}</td>${RTYPES.map(([t]) => `<td class="num">${of20(avgOf(rs, t))}</td>`).join('')}</tr>`; }).join('')}
          <tr class="gr-total"><td>کل پایه</td>${RTYPES.map(([t]) => `<td class="num">${of20(avgOf(rows, t))}</td>`).join('')}</tr></tbody></table></div></div>
        <div class="card"><h2 style="margin-top:0">دانش‌آموزان</h2><div class="table-wrap"><table class="gr-table"><thead><tr><th>نام</th><th>کلاس</th>${RTYPES.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
          ${rows.map(r => `<tr><td><a href="${href(r.st.id)}">${esc(r.st.name)}</a></td><td>${esc(x.classes.find(c => c.id === r.st.cls)?.name || '')}</td>${RTYPES.map(([t]) => `<td class="num">${of20(r.v[t])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <p class="muted small">هر نمره اول به نمرهٔ از ۲۰ تبدیل می‌شود (مثلاً ۵ از ۶ می‌شود ${fa(16.67)})، بعد میانگین گرفته می‌شود. «آزمون فصلی» همان نوع «آزمون کلاسی» در ثبت نمره است.</p></div>`;
    } else if (state.grTab === 'study') {
      const week = [...Array(7)].map((_, i) => D.shift(i - 6, today));
      const rows = x.students.map(st => { const days = week.map(dd => studyMinSub(x, st.id, dd, su)); return { st, days, has: days.some(m => m != null), tot: days.reduce((a, m) => a + (m || 0), 0) }; }).filter(r => r.has);
      const did = rows.filter(r => r.tot > 0), avgMin = mean(rows.map(r => r.tot));
      const day = i => mean(rows.map(r => r.days[i] || 0));
      body = !rows.length ? `<div class="card">${empty('هنوز برای دانش‌آموزان این پایه برنامهٔ مطالعه ثبت نشده.')}</div>` : tiles([
          ['دارای برنامهٔ مطالعه', fa(rows.length), `از ${fa(x.students.length)} دانش‌آموز`, 'blue'],
          [`مطالعهٔ ${su}`, fa(did.length), 'نفر در هفت روز گذشته', 'teal'],
          ['میانگین هفتگی', `${fa(Math.round((avgMin || 0) / 60 * 10) / 10)} ساعت`, 'برای هر دانش‌آموز دارای برنامه', 'violet'],
          ['بدون مطالعهٔ این درس', fa(rows.length - did.length), 'نفر در هفت روز گذشته', 'amber']])
        + `<div class="card"><h2 style="margin-top:0">مطالعهٔ ${esc(su)} در هفت روز گذشته (میانگین دقیقه)</h2>
          ${vbars(week.map((dd, i) => [J.format(dd, false).split(' ')[0], Math.round(day(i))]), Math.max(1, ...week.map((_, i) => day(i))), n => fa(n), `دقیقهٔ مطالعهٔ ${su} در روز`)}</div>
        <div class="card"><h2 style="margin-top:0">دانش‌آموزان</h2><ul class="gr-list">${rows.slice().sort((p1, p2) => p2.tot - p1.tot).map(r => `<li><a href="${href(r.st.id)}">${esc(r.st.name)}</a><b class="num">${r.tot ? `${fa(Math.round(r.tot / 60 * 10) / 10)} ساعت` : '—'}</b></li>`).join('')}</ul>
          <p class="muted small">بازه‌ها و بلوک‌هایی حساب می‌شوند که درسشان «${esc(su)}» انتخاب شده (یا در متن قدیمی‌شان نام این درس آمده).</p></div>`;
    } else {
      const cut = D.shift(-30, today), cats = Object.fromEntries(x.discCats.map(c => [c.id, c]));
      const recent = x.discipline.filter(r => r.date >= cut), clsOf = sid => x.students.find(st => st.id === sid)?.cls;
      const mine = recent.filter(r => recSubject(x, r, clsOf(r.sid)) === su), noBell = recent.filter(r => !r.bell && !r.subject).length;
      const negs = mine.filter(r => Disc.recPts(x, r) < 0), byCat = {};
      negs.forEach(r => { const n = Disc.catOf(x, r).name; byCat[n] = (byCat[n] || 0) + 1; });
      const top = Object.entries(byCat).sort((p1, p2) => p2[1] - p1[1]).slice(0, 6);
      const per = {}; mine.forEach(r => { (per[r.sid] = per[r.sid] || { n: 0, pts: 0 }); per[r.sid].n++; per[r.sid].pts += Disc.recPts(x, r); });
      body = tiles([
          [`موارد در کلاس ${su}`, fa(mine.length), '۳۰ روز گذشته', 'blue'],
          ['موارد منفی', fa(negs.length), `${fa(new Set(negs.map(r => r.sid)).size)} دانش‌آموز`, 'rose'],
          ['موارد مثبت', fa(mine.length - negs.length), 'تشویقی', 'teal'],
          ['جمع امتیاز منفی', fa(negs.reduce((a, r) => a + Disc.recPts(x, r), 0)), 'در این درس', 'amber']])
        + `<div class="card"><h2 style="margin-top:0">پرتکرارترین موارد منفی در کلاس ${esc(su)}</h2>${top.length ? bars(top, Math.max(...top.map(t => t[1])), n => `${fa(n)} بار`) : empty('موردی ثبت نشده.')}</div>
        <div class="card"><h2 style="margin-top:0">دانش‌آموزان</h2>${Object.keys(per).length ? `<ul class="gr-list">${Object.entries(per).sort((p1, p2) => p1[1].pts - p2[1].pts).map(([sid, v]) => `<li><a href="${href(sid)}">${esc(x.students.find(st => st.id === sid)?.name || '')}</a><span class="muted small">${fa(v.n)} مورد</span><b class="num">${fa(v.pts)} امتیاز</b></li>`).join('')}</ul>` : empty('موردی نیست.')}
          <p class="muted small">درسِ هر مورد از روی روز و زنگ ثبت‌شده و برنامهٔ کلاس پیدا می‌شود.${noBell ? ` ${fa(noBell)} مورد بدون زنگ ثبت شده و به درسی نسبت داده نشده.` : ''}</p></div>`;
    }
    return head + body;
  }

  /* ---------------- discipline across the school ---------------- */
  // A student's total under the school's rules (negatives, the 15-day rule and diligence).
  const negOf = (x, sid) => Disc.standing(x, sid).total;
  function pdisc() {
    const gs = D.gradesOf(school());
    const grade = g => {
      const x = gradeData(g), list = x.students.map(s => ({ s, n: negOf(x, s.id) })).filter(o => o.n < 0).sort((a, b) => a.n - b.n);
      const row = o => { const st = Disc.stepOf(o.n);
        return `<li><a href="#/g/${g}/student/${o.s.id}">${esc(o.s.name)}</a>${st ? `<span class="muted small" title="${esc(st[1])}">مرحلهٔ ${Disc.sign(st[0])}</span>` : ''}<span class="tag bad num">${Disc.sign(o.n)}</span></li>`; };
      return `<article class="card att-grade"><div class="spread"><h3 style="margin:0">پایهٔ ${esc(GN(g))}</h3><span class="muted small">${fa(list.length)} نفر با امتیاز منفی</span></div>
        ${list.length ? `<ul class="gr-list">${list.slice(0, 3).map(row).join('')}</ul>
          ${list.length > 3 ? `<details class="more"><summary class="small">بقیهٔ پایه (${fa(list.length - 3)} نفر)</summary><ul class="gr-list compact">${list.slice(3).map(row).join('')}</ul></details>` : ''}`
          : '<p class="muted small" style="margin:6px 0 0">موردی نیست.</p>'}</article>`;
    };
    // One grade at a time, chosen with the tabs; the list of the latest records follows the same grade.
    if (!gs.includes(state.pdG)) state.pdG = gs[0];
    const pg = state.pdG, px = gradeData(pg);
    const recent = px.discipline.map(r => ({ r, g: pg, x: px })).sort((a, b) => b.r.date.localeCompare(a.r.date)).slice(0, 15);
    return `<div class="spread" style="margin-bottom:12px"><div class="seg" role="radiogroup" aria-label="پایه">${gs.map(k => `<button role="radio" aria-checked="${k === pg}" data-act="pd-g" data-id="${k}">${esc(GN(k))}</button>`).join('')}</div>
        <a class="btn" href="#/discCats">موارد انضباطی و امتیازها</a></div>
      <p class="muted small" style="margin:0 0 10px">جمع امتیاز انضباطی امسال طبق قاعده‌های مدرسه</p>
      <div class="group-head"><h2>نیازمند توجه</h2><span class="muted small">سه نفر با بیشترین امتیاز منفی در پایهٔ ${esc(GN(pg))}</span></div>
      ${grade(pg)}
      <details class="card disc-steps"><summary><b>برخورد مدرسه در هر مرحله</b></summary><table class="no-cards"><tbody>${Disc.STEPS.map(([t, a]) => `<tr><td class="num" style="width:70px"><b>${Disc.sign(t)}</b></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table></details>
      <div class="group-head"><h2>آخرین موارد ثبت‌شده</h2><span class="muted small">پایهٔ ${esc(GN(pg))}</span></div>
      <div class="card">${recent.length ? `<div class="table-wrap"><table><thead><tr><th>روز</th><th>دانش‌آموز</th><th>مورد</th><th>امتیاز</th></tr></thead><tbody>
        ${recent.map(({ r, g, x }) => { const c = Disc.catOf(x, r), p = Disc.recPts(x, r);
          return `<tr><td class="small">${esc(J.format(r.date, false))}</td><td><a href="#/g/${g}/student/${r.sid}">${esc(stName(g, r.sid))}</a></td><td>${esc(c.name)}</td>
            <td><span class="tag ${p < 0 ? 'bad' : 'ok'} num">${Disc.sign(p)}</span></td></tr>`; }).join('')}</tbody></table></div>` : empty('هنوز موردی ثبت نشده.')}</div>`;
  }

  /* ---------------- observations, one grade at a time ---------------- */
  const PLACES = ['کلاس', 'حیاط', 'زنگ تفریح', 'نمازخانه', 'اردو', 'دیگر'];
  const TONES = { pos: ['مثبت', 'ok'], neu: ['خنثی', 'grey'], neg: ['نگران‌کننده', 'bad'] };
  function pobs() {
    const gs = D.gradesOf(school());
    if (!gs.includes(state.obsG)) state.obsG = gs[0];
    const g = state.obsG, x = gradeData(g), list = x.obs.slice().sort((a, b) => b.date.localeCompare(a.date));
    const names = o => o.sids.map(id => stName(g, id)).join('، ');
    return `<div class="spread" style="margin-bottom:12px"><div class="seg" role="radiogroup" aria-label="پایه">${gs.map(k => `<button role="radio" aria-checked="${k === g}" data-act="po-g" data-id="${k}">${esc(GN(k))}</button>`).join('')}</div>
        <button class="btn primary" data-act="po-new">+ ثبت مشاهده</button></div>
      <p class="muted small" style="margin:0 0 10px">مشاهده‌ای که شما ثبت کنید، برای معلم راهنمای همان پایه یادآور می‌شود.</p>
      <div class="card">${list.length ? `<div class="table-wrap"><table><thead><tr><th>روز</th><th>دانش‌آموز</th><th>مکان</th><th>شرح</th><th>لحن</th></tr></thead><tbody>
        ${list.map(o => `<tr><td class="small">${esc(J.format(o.date, false))}</td><td>${esc(names(o))}${o.by === 'principal' ? ' <span class="tag blue">مدیر</span>' : ''}</td><td class="small">${esc(o.place || '—')}</td>
          <td>${esc(o.text)}</td><td><span class="tag ${TONES[o.tone]?.[1] || 'grey'}">${TONES[o.tone]?.[0] || ''}</span></td></tr>`).join('')}</tbody></table></div>` : empty(`در پایهٔ ${GN(g)} مشاهده‌ای ثبت نشده.`)}</div>`;
  }
  function obsModal() {
    // Opened from another page (e.g. the «مرتبط‌ها» menu): the grade chosen there, else the current one.
    const g = state.obsG = state.obsG || state.pdG || ctx.grade(), x = gradeData(g);
    modal(`<h2>ثبت مشاهده · پایهٔ ${esc(GN(g))}</h2>
      <fieldset class="field" style="border:0;padding:0"><legend class="small muted">دانش‌آموز یا دانش‌آموزان</legend><div class="chips">${x.students.map(st => `<label class="chip"><input type="checkbox" value="${st.id}">${esc(st.name)}</label>`).join('')}</div></fieldset>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>روز</span>${J.field('po-d', today)}</div>
        <label class="field"><span>مکان</span><select class="input" id="po-p">${PLACES.map(pl => `<option>${pl}</option>`).join('')}</select></label></div>
      <fieldset class="seg-radio" style="margin-top:8px"><legend class="small muted">چگونه بود؟</legend>${Object.entries(TONES).map(([k, [l]]) => `<label><input type="radio" name="po-t" value="${k}" ${k === 'neu' ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <label class="field"><span>چه دیدید؟</span><textarea class="input" id="po-x" rows="3"></textarea></label>${Voice.button('po-x')}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت و خبر به معلم راهنما</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const sids = [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
        if (!sids.length) return UI.invalid(root.querySelector('.chips'), 'دست‌کم یک دانش‌آموز را انتخاب کنید.');
        if (!v(root, '#po-x')) return UI.invalid('#po-x', 'بنویسید چه دیدید.');
        const tone = root.querySelector('input[name=po-t]:checked').value, text = v(root, '#po-x');
        x.obs.push({ id: D.uid('o'), sids, date: v(root, '#po-d'), place: v(root, '#po-p'), tone, text, by: 'principal' });
        // The grade's counsellor gets it as a reminder.
        x.reminders.push({ id: D.uid('r'), text: `مشاهدهٔ مدیر (${TONES[tone][0]}) دربارهٔ ${sids.map(id => stName(g, id)).join('، ')}: ${text}`, date: today, sid: sids[0], done: false, from: 'principal' });
        save(); close(); render(); toast(`ثبت شد و برای معلم راهنمای پایهٔ ${GN(g)} یادآور فرستاده شد.`);
      };
    });
  }

  /* ---------------- wiring ---------------- */
  const act = {
    'fm-new': () => planModal(null),
    'fm-edit': b => planModal(FM().find(m => m.id === b.dataset.id)),
    'fm-rec': b => recordModal(b.dataset.id),
    'fm-note': b => noteModal(b.dataset.id),
    'fm-g': b => { state.famG = +b.dataset.id; state.famSid = ''; render(); },
    'fm-st': b => { state.famSid = b.dataset.id; render(); },
    'pw-edit': () => { state.wkEdit = !state.wkEdit; state.wkSel = null; render(); },
    'pw-cell': b => { state.wkSel = { d: +b.dataset.d, b: +b.dataset.b }; render(); setTimeout(() => document.querySelector('.palette .pchip[aria-pressed="true"]')?.focus(), 0); },
    'pw-set': b => { const { d, b: bell } = state.wkSel, k = b.dataset.id; PS()[d][bell] = k === 'free' ? null : { type: k }; save();
      state.wkSel = bell < D.BELLS - 1 ? { d, b: bell + 1 } : null; render(); setTimeout(() => document.querySelector('.palette .pchip[aria-pressed="true"]')?.focus(), 0); },
    'fm-cancel': async b => { const m = FM().find(x => x.id === b.dataset.id); if (!await UI.ask('لغو جلسه', `جلسه با خانوادهٔ ${stName(m.grade, m.sid)} لغو شود؟`, 'لغو جلسه')) return; const back = UI.drop(FM(), x => x.id === m.id); save(); render(); UI.undo('جلسه لغو شد.', back, () => { save(); render(); }); },
    'dc2-add': () => {
      const n = document.getElementById('dc-new-n').value.trim(), p = document.getElementById('dc-new-p').value;
      if (!n) return UI.invalid('#dc-new-n', 'نام مورد را بنویسید.'); if (p === '' || isNaN(+p)) return UI.invalid('#dc-new-p', 'امتیاز را بنویسید.');
      ctx.data().discCats.push({ id: D.uid('d'), name: n, pts: Math.round(+p) }); save(); render(); toast('افزوده شد.');
    },
    'dc2-del': b => { const back = UI.drop(ctx.data().discCats, c => c.id === b.dataset.id); save(); render(); UI.undo('مورد حذف شد؛ موارد قبلاً ثبت‌شده با نام «مورد حذف‌شده» می‌مانند.', back, () => { save(); render(); }); },
    'dc2-save': () => saveCats(false),
    'dc2-all': () => saveCats(true),
    'gr-tab': b => { state.grTab = b.dataset.id; state.grDrill = ''; render(); },
    'pd-g': b => { state.pdG = +b.dataset.id; render(); document.querySelector(`[data-act="pd-g"][data-id="${b.dataset.id}"]`)?.focus(); },
    'gr-refer': b => refer([b.dataset.id], b.dataset.kind),
    'gr-refer-all': b => refer(b.dataset.ids.split(','), b.dataset.kind),
    'gr-bin': b => { const i = +b.dataset.id; state.grBin = state.grBin === i ? null : i; render(); document.querySelector(`[data-act="gr-bin"][data-id="${i}"]`)?.focus(); },
    'gr-drill': b => { state.grDrill = b.dataset.id; state.grBin = null; render(); document.querySelector('#view h2, #view .kpi-btn')?.scrollIntoView({ block: 'nearest' }); },
    'gr-sub': b => { state.grSub = b.dataset.id; render(); document.querySelector(`[data-act="gr-sub"][data-id="${b.dataset.id}"]`)?.focus(); },
    'po-g': b => { state.obsG = +b.dataset.id; render(); },
    'po-new': obsModal,
  };
  function bind() {
    document.querySelectorAll('[data-fmact]').forEach(c => c.onchange = () => { const [mid, aid] = c.dataset.fmact.split('|'); const a = FM().find(m => m.id === mid).record.actions.find(x => x.id === aid); a.done = c.checked; save(); render(); });
  }
  return { pages: { family, attendance, discCats, greport, pdisc, pobs }, myWeek, act, bind, feed, dueCards, upcomingRows, heldLast30, upcoming, lastPct, recordModal, lateActions, catEditor };
};
