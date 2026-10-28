// «آینهٔ تدریس»: teacher evaluation for growth, not ranking. Each teacher is seen in three mirrors on one rubric
// (five domains, four levels, adapted from Danielson's Framework for Teaching): their own self-assessment, the
// principal's short class visits (one strength, one suggestion, and the teacher's reply), and an anonymous student
// survey shown only once five students have answered. Where the mirrors disagree, the page says «talk about it»; the
// end product is one or two growth goals agreed for the term. Teachers come from the school's real timetable.
// Pages: teval (principal: overview and each teacher), mirror (the teacher's own), tsurvey (the student's survey).
const TeacherEval = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { org, save, school, kpi, empty, render, hrefOf, role } = ctx;
  const o = () => org();
  const today = J.todayIso();
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]).replace('.', '٫');
  const f1 = n => n == null ? '—' : digits((Math.round(n * 10) / 10).toFixed(1));
  const MIN = 5;  // fewest student answers before the survey is shown, so no answer can be traced to one student

  const LEVELS = ['آغازین', 'در حال رشد', 'توانمند', 'الگو'];
  const LV_TONE = ['bad', 'warn', 'blue', 'ok'];
  const DOMAINS = [
    ['طراحی و آمادگی', ['هدف جلسه روشن نیست و درس بیشتر از روی کتاب پیش می‌رود.', 'هدف جلسه معلوم است، اما فعالیت‌ها همیشه به آن وصل نیستند.',
      'هدف روشن، فعالیت‌های هم‌راستا و منابع آماده؛ زمان جلسه حساب‌شده است.', 'برای سطح‌های مختلف کلاس راه‌های متفاوت آماده کرده و درس را به درس‌های قبل و به زندگی وصل می‌کند.']],
    ['فضای کلاس', ['نظم کلاس بیشتر با تذکر حفظ می‌شود و بخشی از زمان هدر می‌رود.', 'قاعده‌ها هست، اما یکسان اجرا نمی‌شود؛ رابطه با بیشتر دانش‌آموزان خوب است.',
      'فضا محترمانه و امن است، قاعده‌ها روشن‌اند و زمان کلاس به یادگیری می‌گذرد.', 'دانش‌آموزان خودشان مراقب نظم و احترام‌اند و بی‌ترس می‌پرسند و اشتباه می‌کنند.']],
    ['تدریس و درگیر کردن', ['بیشتر معلم حرف می‌زند و چند نفر محدود مشارکت دارند.', 'توضیح روشن است، اما پرسش‌ها بیشتر یادآوری‌اند تا فکر کردن.',
      'توضیح روشن، پرسش‌های فکری و فعالیتی که بیشتر کلاس را درگیر می‌کند.', 'دانش‌آموزان خودشان توضیح می‌دهند، می‌پرسند و به هم یاد می‌دهند.']],
    ['ارزشیابی و بازخورد', ['ارزشیابی بیشتر پایانی است و بازخورد به نمره خلاصه می‌شود.', 'گاهی فهم کلاس را در میان درس می‌سنجد؛ بازخوردها کلی‌اند.',
      'فهم را در میان درس می‌سنجد، بازخورد مشخص و به‌موقع می‌دهد و نمره‌ها را منظم ثبت می‌کند.', 'از نتیجهٔ ارزشیابی برای تغییر تدریس استفاده می‌کند و دانش‌آموزان کار خودشان را می‌سنجند.']],
    ['مسئولیت حرفه‌ای', ['همکاری و ارتباط با خانواده‌ها و همکاران کم است.', 'در کارهای خواسته‌شده همکاری می‌کند.',
      'با معلم راهنما و خانواده‌ها ارتباط منظم دارد، در جلسه‌های گروه فعال است و کارش را بازبینی می‌کند.', 'تجربه‌اش را با همکاران در میان می‌گذارد و در بهبود مدرسه پیش‌قدم است.']],
  ];
  // The student survey: each statement belongs to a domain. Answers: 3 most of the time, 2 sometimes, 1 rarely.
  const SURVEY = [['می‌دانم در این درس چه چیزی از من انتظار می‌رود.', 0], ['وقت کلاس به یادگیری می‌گذرد.', 1], ['در این کلاس می‌توانم راحت بپرسم یا اشتباه کنم.', 1],
    ['معلم با همهٔ ما محترمانه رفتار می‌کند.', 1], ['درس را طوری توضیح می‌دهد که می‌فهمم.', 2], ['ما را به فکر کردن و مشارکت وامی‌دارد.', 2],
    ['دربارهٔ کار و برگه‌هایم توضیح و راهنمایی می‌گیرم.', 3], ['نمره دادنش منصفانه است.', 3]];
  const ANS = [[3, 'بیشتر وقت‌ها'], [2, 'گاهی'], [1, 'به‌ندرت']];

  // School year terms: the first from Mehr to Dey, the second from Bahman to Khordad.
  const termOf = iso => { const j = J.isoToJ(iso), y = j.jm >= 7 ? j.jy : j.jy - 1; return `${y}-${j.jm >= 7 && j.jm <= 10 ? 1 : 2}`; };
  const termName = t => { const [y, n] = t.split('-'); return `نیمسال ${n === '1' ? 'اول' : 'دوم'} ${digits(y)}–${digits(+y + 1)}`; };
  const TERM = termOf(today);
  const tm = () => { const x = o().tm = o().tm || {}; ['obs', 'resp', 'goals'].forEach(k => { x[k] = x[k] || []; }); x.self = x.self || {}; x.done = x.done || {};
    if (!x.sample1) { x.sample1 = true; seedSample(x); }
    return x; };
  // Sample reviews for a sales demonstration (7 Aban 1405), once per school: for most of the timetable's teachers a
  // self-assessment, a class visit and students' answers this term, and a growth goal for some. Each is sample: true.
  function seedSample(x) {
    let k = 11; const r = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; }, pick = l => l[Math.floor(r() * l.length)];
    const GLOW = ['شروع کلاس با یک سؤال درگیرکننده', 'مدیریت زمان دقیق و بی‌وقفه', 'بازخورد فوری و دقیق به پاسخ‌ها', 'مشارکت دادن دانش‌آموزان ساکت', 'مثال‌های ملموس از زندگی روزمره'];
    const GROW = ['جمع‌بندی پایان کلاس کوتاه بود', 'سؤال‌ها بیشتر به چند نفر خاص می‌رسید', 'زمان کار گروهی کم بود', 'هدف جلسه در ابتدا گفته نشد', 'بررسی تکلیف‌ها وقت زیادی گرفت'];
    const GOAL = ['هر جلسه با بیان هدف شروع شود', 'دست‌کم یک فعالیت گروهی در هفته', 'سه دقیقه جمع‌بندی پایانی', 'بازخورد نوشتاری روی برگه‌ها'];
    const day = n => Math.floor(Date.now() / 864e5) - n, clamp = v => Math.max(1, Math.min(4, v));
    roster().filter(t => !t.name.startsWith('گروه')).forEach((t, i) => {
      if (r() < 0.25) return;
      const base = 2 + Math.floor(r() * 2) - (r() < 0.2 ? 1 : 0), lv = () => Object.fromEntries(DOMAINS.map((_, d) => [d, clamp(base + Math.round(r() * 2 - 1))]));
      if (r() < 0.8) x.self[TERM + '|' + t.id] = { lv: lv(), note: '', at: Date.now() - i * 36e5, sample: true };
      if (r() < 0.7) { const date = D.shift(-1 - Math.floor(r() * 25));
        x.obs.push({ id: D.uid('tv'), tid: t.id, by: 'principal', seen: r() < 0.6, reply: '', at: Date.now() - i * 36e5, date, cls: t.cls[0] || '', lv: lv(), glow: pick(GLOW), grow: pick(GROW), term: termOf(date), sample: true }); }
      const n = r() < 0.7 ? 5 + Math.floor(r() * 14) : Math.floor(r() * 4);
      for (let j = 0; j < n; j++) x.resp.push({ term: TERM, tid: t.id, a: SURVEY.map(() => Math.max(1, Math.min(3, Math.round(base * 0.6 + r() * 1.4)))), text: '', at: day(Math.floor(r() * 20)), sample: true });
      if (r() < 0.35) x.goals.push({ id: D.uid('tg'), tid: t.id, term: TERM, status: 'open', review: '', by: 'principal', at: Date.now(), dom: Math.floor(r() * DOMAINS.length), text: pick(GOAL), step: '', due: D.shift(20 + Math.floor(r() * 20)), sample: true });
    });
    D.save();
  }

  /* ---------------- teachers, from the timetable ---------------- */
  const norm = s => String(s || '').replace(/[‌\s]+/g, '').replace(/ؤ/g, 'و').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/^(سید|سیده)/, '');
  function roster() {
    const s = school(), m = new Map();
    D.gradesOf(s).forEach(g => { const x = D.get(s.id, g);
      Object.entries(x.ttTeacher || {}).forEach(([cid, days]) => { const cls = x.classes.find(c => c.id === cid)?.name || '';
        days.forEach((row, day) => row.forEach((name, b) => { if (!name) return;
          const r = m.get(name) || { id: 'n:' + name, name, subs: new Set(), cls: new Set(), bells: 0 };
          r.subs.add(x.timetable[cid]?.[day]?.[b] || ''); r.cls.add(cls); r.bells++; m.set(name, r); })); }); });
    const list = m.size ? [...m.values()] : o().teachers.map(t => ({ id: t.id, name: t.name, subs: new Set([t.subject]), cls: new Set(), bells: 0 }));
    return list.map(r => ({ ...r, subs: [...r.subs].filter(Boolean), cls: [...r.cls].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fa')) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }
  const byId = id => roster().find(t => t.id === id);
  // The signed-in teacher: matched by name to the timetable; a demo account picks a name to try the page.
  function me() {
    const u = Auth.user() || {}, list = roster();
    const hit = !u.owner && list.find(t => norm(t.name) === norm(u.name) || (norm(u.name).endsWith(norm(t.name)) && t.name.length > 2));
    return { t: hit || list.find(t => t.id === Shell.pref().tmMe) || null, linked: !!hit, list };
  }

  /* ---------------- the three mirrors ---------------- */
  const selfOf = tid => tm().self[TERM + '|' + tid];
  const obsOf = tid => tm().obs.filter(x => x.tid === tid && x.term === TERM).sort((a, b) => b.date.localeCompare(a.date));
  const respOf = tid => tm().resp.filter(x => x.tid === tid && x.term === TERM);
  const goalsOf = tid => tm().goals.filter(x => x.tid === tid).sort((a, b) => (a.status === 'done') - (b.status === 'done') || b.at - a.at);
  // A level from 1 to 4 per domain from each mirror (null where it has nothing).
  function mirrors(tid) {
    const s = selfOf(tid), obs = obsOf(tid), resp = respOf(tid);
    return DOMAINS.map((_, i) => {
      const so = obs.map(x => x.lv?.[i]).filter(Boolean);
      const sv = resp.length >= MIN ? avg(resp.flatMap(r => SURVEY.map(([, d], k) => d === i ? r.a[k] : null)).filter(Boolean)) : null;
      return { self: s?.lv?.[i] || null, obs: avg(so), stu: sv == null ? null : 1 + (sv - 1) * 1.5 };
    });
  }
  const chip = n => n == null ? '<span class="muted">—</span>' : `<span class="tag ${LV_TONE[Math.min(3, Math.max(0, Math.round(n) - 1))]}">${LEVELS[Math.min(3, Math.max(0, Math.round(n) - 1))]} (${f1(n)})</span>`;
  function hint(m) {
    const xs = [m.self, m.obs, m.stu].filter(x => x != null);
    if (xs.length < 2) return `<span class="muted small">${xs.length ? 'هنوز یک آینه' : 'هنوز داده‌ای نیست'}</span>`;
    const gap = Math.max(...xs) - Math.min(...xs);
    if (gap >= 1) return `<span class="tag warn">دیدها فرق دارد؛ گفت‌وگو کنید</span>`;
    return Math.min(...xs) >= 3 ? '<span class="tag ok">قوت</span>' : Math.max(...xs) < 2.5 ? '<span class="tag rose">جای رشد</span>' : '<span class="tag grey">هم‌سو</span>';
  }

  /* ---------------- one teacher's mirror ---------------- */
  function mirrorView(t, who) {
    const ms = mirrors(t.id), obs = obsOf(t.id), resp = respOf(t.id), s = selfOf(t.id), goals = goalsOf(t.id), P = who === 'principal';
    const rubric = `<details class="tm-rubric"><summary>راهنمای سطح‌ها در هر حوزه</summary><div class="table-wrap" tabindex="0" role="region" aria-label="راهنمای سطح‌ها">
      <table class="no-cards"><tr><th scope="col">حوزه</th>${LEVELS.map((l, i) => `<th scope="col">${fa(i + 1)}. ${l}</th>`).join('')}</tr>
      ${DOMAINS.map(([n, ds]) => `<tr><th scope="row">${n}</th>${ds.map(x => `<td class="small">${x}</td>`).join('')}</tr>`).join('')}</table></div></details>`;
    const survey = resp.length < MIN ? `<p class="muted">${fa(resp.length)} پاسخ از دانش‌آموزان. نتیجه وقتی نشان داده می‌شود که دست‌کم ${fa(MIN)} نفر پاسخ داده باشند تا هیچ پاسخی به یک نفر برنگردد.</p>`
      : `<p class="muted small">${fa(resp.length)} پاسخ بی‌نام در ${termName(TERM)}</p>${SURVEY.map(([q], k) => { const n = ANS.map(([a]) => resp.filter(r => r.a[k] === a).length), tot = n.reduce((x, y) => x + y, 0) || 1;
          return `<div class="tm-q"><span>${q}</span><div class="tm-stack" role="img" aria-label="${ANS.map(([, l], i) => `${l} ${fa(Math.round(n[i] / tot * 100))}٪`).join('، ')}">${n.map((c, i) => c ? `<i class="a${i}" style="width:${c / tot * 100}%"></i>` : '').join('')}</div></div>`; }).join('')}
        <p class="small tm-legend">${ANS.map(([, l], i) => `<span><i class="a${i}"></i>${l}</span>`).join('')}</p>
        ${resp.filter(r => r.text).length ? `<h3 class="tm-h">یک چیز که بماند، یک پیشنهاد</h3><ul class="tm-quotes">${resp.filter(r => r.text).sort((a, b) => (a.text > b.text) - (a.text < b.text)).map(r => `<li>${esc(r.text)}</li>`).join('')}</ul>` : ''}`;
    return `<div class="card tm-head"><div class="card-head"><div><h2 style="margin:0">${esc(t.name)}</h2>
        <div class="muted small">${esc(t.subs.join('، ') || '—')}${t.cls.length ? ` · کلاس‌های ${esc(t.cls.join('، '))}` : ''}${t.bells ? ` · ${fa(t.bells)} زنگ در هفته` : ''}</div></div>
        <div class="row">${P ? `<button class="btn sm primary" data-act="tm-obs" data-id="${esc(t.id)}">ثبت بازدید کلاس</button>` : `<button class="btn sm primary" data-act="tm-self" data-id="${esc(t.id)}">${s ? 'ویرایش خودارزیابی' : 'خودارزیابی'}</button>`}
          <button class="btn sm" data-act="tm-goal" data-id="${esc(t.id)}">+ هدف رشد</button></div></div>
      <p class="muted small" style="margin:0">${termName(TERM)} · سه آینه روی یک چارچوب پنج‌حوزه‌ای؛ سطح‌ها از ۱ (آغازین) تا ۴ (الگو).</p></div>
      <div class="card"><h2>سه آینه</h2><div class="table-wrap" tabindex="0" role="region" aria-label="سه آینه"><table class="no-cards tm-mirror"><tr><th scope="col">حوزه</th><th scope="col">خودارزیابی</th>
        <th scope="col">بازدید کلاس${obs.length ? ` (${fa(obs.length)})` : ''}</th><th scope="col">صدای دانش‌آموزان${resp.length >= MIN ? ` (${fa(resp.length)})` : ''}</th><th scope="col">نکته</th></tr>
        ${DOMAINS.map(([n], i) => `<tr><th scope="row">${n}</th><td>${chip(ms[i].self)}</td><td>${chip(ms[i].obs)}</td><td>${i === 4 ? '<span class="muted small">پرسیده نمی‌شود</span>' : chip(ms[i].stu)}</td><td>${hint(ms[i])}</td></tr>`).join('')}</table></div>
        ${s?.note ? `<p class="small"><b>نکتهٔ خودارزیابی:</b> ${esc(s.note)}</p>` : ''}${rubric}</div>
      <div class="card"><div class="card-head"><h2 style="margin:0">هدف‌های رشد</h2></div>
        ${goals.length ? `<ul class="tm-goals">${goals.map(g => `<li class="${g.status === 'done' ? 'done' : ''}"><div class="spread"><span><span class="tag violet">${DOMAINS[g.dom]?.[0] || ''}</span> <b>${esc(g.text)}</b></span>
          <span class="row">${g.status === 'done' ? '<span class="tag ok">انجام شد</span>' : `<button class="btn sm" data-act="tm-gdone" data-id="${g.id}">ثبت نتیجه</button>`}<button class="btn sm" data-act="tm-gedit" data-id="${g.id}">ویرایش</button></span></div>
          <div class="muted small">${g.step ? `قدم اول: ${esc(g.step)} · ` : ''}${g.due ? `بازبینی: ${esc(J.format(g.due, false))} · ` : ''}${esc(termName(g.term))}</div>${g.review ? `<p class="small" style="margin:4px 0 0"><b>نتیجه:</b> ${esc(g.review)}</p>` : ''}</li>`).join('')}</ul>`
          : empty(P ? 'هنوز هدفی ثبت نشده. بعد از بازدید و دیدن سه آینه، یک یا دو هدف را با خود معلم انتخاب کنید.' : 'هنوز هدفی ثبت نشده. یک یا دو هدف برای این نیمسال بنویسید.')}</div>
      <div class="card"><h2>بازدیدهای کلاس</h2>${obs.length ? `<ul class="timeline">${obs.map(x => `<li><div class="spread"><b>${esc(J.format(x.date))}${x.cls ? ` · کلاس ${esc(x.cls)}` : ''}</b>
          ${P ? `<span class="row"><button class="btn sm" data-act="tm-obs-edit" data-id="${x.id}">ویرایش</button><button class="btn sm danger" data-act="tm-obs-del" data-id="${x.id}">حذف</button></span>` : x.seen ? '' : '<span class="tag blue">تازه</span>'}</div>
          <div class="tm-lv">${DOMAINS.map(([n], i) => x.lv?.[i] ? `<span class="small">${n}: ${chip(x.lv[i])}</span>` : '').join('')}</div>
          ${x.glow ? `<p class="tm-glow"><b>درخشش:</b> ${esc(x.glow)}</p>` : ''}${x.grow ? `<p class="tm-grow"><b>پیشنهاد:</b> ${esc(x.grow)}</p>` : ''}
          ${x.reply ? `<div class="next"><b>پاسخ معلم:</b> ${esc(x.reply)}</div>` : P ? '<div class="muted small">معلم هنوز پاسخی ننوشته.</div>' : `<button class="btn sm" data-act="tm-reply" data-id="${x.id}">نوشتن پاسخ</button>`}</li>`).join('')}</ul>`
        : empty(P ? 'هنوز بازدیدی در این نیمسال ثبت نشده.' : 'هنوز بازدیدی از کلاس شما ثبت نشده.')}</div>
      <div class="card"><h2>صدای دانش‌آموزان</h2>${survey}</div>`;
  }

  /* ---------------- principal: everyone ---------------- */
  const state = { q: '', only: false };
  // The guidance teacher sees the same page for their own grade's teachers, read only (no visits, goals or edits).
  const guide = () => role() === 'counselor';
  const readOnly = html => guide() ? html.replace(/<button[^>]*data-act="tm-[^"]*"[^>]*>[\s\S]*?<\/button>/g, '') : html;
  function gradeRoster() {
    if (!guide()) return roster();
    const names = D.get(school().id, ctx.grade()).classes.map(c => c.name);
    return roster().filter(t => t.cls.some(c => names.includes(c)));
  }
  function teval(arg) { return readOnly(tevalAll(arg)); }
  function tevalAll(arg) {
    const list = gradeRoster();
    if (arg) { const t = list.find(x => x.id === decodeURIComponent(arg)); return t ? `<a class="btn sm" href="${hrefOf('teval')}">بازگشت به همهٔ معلم‌ها</a><div style="margin-top:12px">${mirrorView(t, 'principal')}</div>` : empty('این معلم پیدا نشد.'); }
    const rows = list.map(t => ({ t, s: selfOf(t.id), obs: obsOf(t.id), n: respOf(t.id).length, g: goalsOf(t.id).filter(g => g.term === TERM) }));
    const shown = rows.filter(r => (!state.q || norm(r.t.name + r.t.subs.join('')).includes(norm(state.q))) && (!state.only || !r.obs.length));
    const next = rows.filter(r => !r.obs.length).sort((a, b) => b.t.bells - a.t.bells).slice(0, 4);
    return `
      <div class="grid g4" style="margin-top:12px">${kpi('معلم‌ها', fa(list.length), 'از برنامهٔ هفتگی')}${kpi('بازدید کلاس', fa(rows.filter(r => r.obs.length).length), `از ${fa(list.length)} معلم در این نیمسال`, '', 'teal')}
        ${kpi('خودارزیابی', fa(rows.filter(r => r.s).length), 'انجام شده', '', 'violet')}${kpi('هدف‌های رشد', fa(rows.reduce((a, r) => a + r.g.filter(g => g.status !== 'done').length, 0)), `${fa(rows.reduce((a, r) => a + r.g.filter(g => g.status === 'done').length, 0))} انجام شده`, '', 'amber')}</div>
      ${next.length ? `<div class="card"><h2>پیشنهاد بازدید</h2><p class="muted small">بیشترین زنگ در هفته، هنوز بی‌بازدید در این نیمسال</p><div class="row">${next.map(r => `<a class="btn sm" href="${hrefOf('teval', encodeURIComponent(r.t.id))}">${esc(r.t.name)} <span class="muted">· ${fa(r.t.bells)} زنگ</span></a>`).join('')}</div></div>` : ''}
      <div class="card"><div class="row tm-filter"><label class="sr-only" for="tm-q">جست‌وجوی معلم</label><input class="input" id="tm-q" placeholder="جست‌وجوی نام یا درس…" value="${esc(state.q)}">
        <label class="row small"><input type="checkbox" id="tm-only" ${state.only ? 'checked' : ''}> فقط بی‌بازدیدها</label></div>
        <div class="table-wrap"><table><tr><th>معلم</th><th>درس‌ها</th><th>زنگ در هفته</th><th>خودارزیابی</th><th>بازدید</th><th>دانش‌آموزان</th><th>هدف‌ها</th><th></th></tr>
        ${shown.map(({ t, s, obs, n, g }) => `<tr><td><b>${esc(t.name)}</b></td><td class="small">${esc(t.subs.join('، '))}</td><td class="num">${fa(t.bells)}</td>
          <td>${s ? '<span class="tag ok">✓</span>' : '<span class="tag grey">—</span>'}</td><td>${obs.length ? `${fa(obs.length)} <span class="muted small">آخرین ${esc(J.format(obs[0].date, false))}</span>` : '<span class="tag warn">بی‌بازدید</span>'}</td>
          <td>${n >= MIN ? `<span class="tag ok">${fa(n)} پاسخ</span>` : `<span class="muted small">${fa(n)} از ${fa(MIN)}</span>`}</td><td class="small">${g.length ? `${fa(g.filter(x => x.status !== 'done').length)} باز · ${fa(g.filter(x => x.status === 'done').length)} انجام` : '—'}</td>
          <td><a class="btn sm" href="${hrefOf('teval', encodeURIComponent(t.id))}">آینه</a></td></tr>`).join('') || `<tr><td colspan="8">${empty('معلمی با این جست‌وجو نیست.')}</td></tr>`}</table></div></div>`;
  }

  /* ---------------- teacher: their own mirror ---------------- */
  function mirror() {
    const { t, linked, list } = me();
    const pick = linked ? '' : `<div class="card"><label class="field"><span>این حساب به نام هیچ معلمی در برنامهٔ هفتگی وصل نیست. برای دیدن صفحه، یک معلم را انتخاب کنید:</span>
      <select class="input" id="tm-me"><option value="">— انتخاب —</option>${list.map(x => `<option value="${esc(x.id)}" ${t?.id === x.id ? 'selected' : ''}>${esc(x.name)} (${esc(x.subs.join('، '))})</option>`).join('')}</select></label></div>`;
    if (!t) return pick;
    const fresh = obsOf(t.id).filter(x => !x.seen);
    if (fresh.length && linked) { fresh.forEach(x => { x.seen = true; }); save(); }
    return `${pick}
      <div style="margin-top:12px">${mirrorView(t, 'teacher')}</div>`;
  }
  // The teacher's own mirror in the right column of ارتباطات: this term's self-assessment (do or edit it here), new
  // class visits and open growth goals, with a link to the whole mirror.
  function sidePanel() {
    const { t } = me(), link = `<a class="mz-tm-all" href="${hrefOf('mirror')}">دیدن آینهٔ کامل</a>`;
    const head = '<h2 class="mz-ph"><span>خودارزیابی من</span></h2>';
    if (!t) return `<section class="mz-panel mz-tm" aria-label="خودارزیابی من">${head}<p class="mz-empty">برای شروع، نام خود را در آینهٔ تدریس انتخاب کنید.</p>${link}</section>`;
    const s = selfOf(t.id), fresh = obsOf(t.id).filter(x => !x.seen).length, open = goalsOf(t.id).filter(g => g.status !== 'done' && g.term === TERM).length;
    const avgSelf = s ? avg(Object.values(s.lv || {}).filter(Boolean)) : null;
    return `<section class="mz-panel mz-tm" aria-label="خودارزیابی من">${head}
      <div class="mz-tm-b"><span class="muted small">${termName(TERM)}</span>
        ${s ? `<b>انجام شد ${chip(avgSelf)}</b>` : '<b class="mz-late">هنوز انجام نشده</b>'}
        <button type="button" class="btn sm ${s ? '' : 'primary'}" data-act="tm-self" data-id="${esc(t.id)}">${s ? 'ویرایش خودارزیابی' : 'شروع خودارزیابی'}</button>
        ${fresh || open ? `<span class="small">${[fresh && `${fa(fresh)} بازدید تازه`, open && `${fa(open)} هدف رشد باز`].filter(Boolean).join(' · ')}</span>` : ''}</div>${link}</section>`;
  }
  // A line for the teacher's desk: what is waiting in their mirror.
  function deskCard() {
    const { t } = me(); if (!t) return `<a class="card tm-desk" href="${hrefOf('mirror')}"><b>آینهٔ تدریس من</b><span class="muted small">خودارزیابی، بازدیدهای کلاس و هدف‌های رشد</span></a>`;
    const fresh = obsOf(t.id).filter(x => !x.seen).length, s = selfOf(t.id), open = goalsOf(t.id).filter(g => g.status !== 'done' && g.term === TERM).length;
    return `<a class="card tm-desk" href="${hrefOf('mirror')}"><b>آینهٔ تدریس من</b><span class="muted small">${[fresh && `${fa(fresh)} بازدید تازه`, !s && 'خودارزیابی این نیمسال مانده', open && `${fa(open)} هدف رشد باز`].filter(Boolean).join(' · ') || 'خودارزیابی، بازدیدها و هدف‌های رشد'}</span></a>`;
  }

  /* ---------------- student: the anonymous survey ---------------- */
  function tsurvey() {
    const sid = ctx.sid(), g = ctx.grade(), x = D.get(school().id, g), st = x.students.find(s => s.id === sid);
    if (!st) return empty('دانش‌آموز پیدا نشد.');
    // This class's teachers and what each teaches it, from the class timetable.
    const here = new Map();
    (x.ttTeacher?.[st.cls] || []).forEach((row, day) => row.forEach((n, b) => { if (n) here.set(n, (here.get(n) || new Set()).add(x.timetable[st.cls]?.[day]?.[b] || '')); }));
    const list = roster().filter(t => !here.size || here.has(t.name)).map(t => here.has(t.name) ? { ...t, subs: [...here.get(t.name)].filter(Boolean) } : t);
    const key = t => `${TERM}|${t.id}|${g}:${sid}`;
    return `<p class="note">نظرت به معلم‌ها کمک می‌کند بهتر درس بدهند. نامت کنار پاسخ ذخیره نمی‌شود و معلم فقط وقتی نتیجه را می‌بیند که دست‌کم ${fa(MIN)} نفر پاسخ داده باشند. هر معلم یک بار در هر نیمسال.</p>
      <div class="grid g3" style="margin-top:12px">${list.map(t => `<div class="card tm-sv"><b>${esc(t.name)}</b><span class="muted small">${esc(t.subs.join('، '))}</span>
        ${tm().done[key(t)] ? '<span class="tag ok">پاسخ دادی؛ ممنون</span>' : `<button class="btn sm primary" data-act="tm-answer" data-id="${esc(t.id)}">پاسخ دادن</button>`}</div>`).join('') || empty('معلمی برای کلاست پیدا نشد.')}</div>`;
  }

  /* ---------------- forms ---------------- */
  const lvPick = (i, cur, none) => `<fieldset class="tm-pick"><legend>${DOMAINS[i][0]}</legend><div class="tm-opts">${none ? `<label><input type="radio" name="lv${i}" value="" ${!cur ? 'checked' : ''}><span>دیده نشد</span></label>` : ''}
    ${LEVELS.map((l, k) => `<label title="${esc(DOMAINS[i][1][k])}"><input type="radio" name="lv${i}" value="${k + 1}" ${cur === k + 1 ? 'checked' : ''}><span>${fa(k + 1)}. ${l}</span></label>`).join('')}</div>
    <p class="muted small tm-desc" data-desc="${i}">${cur ? esc(DOMAINS[i][1][cur - 1]) : ''}</p></fieldset>`;
  const readLv = root => Object.fromEntries(DOMAINS.map((_, i) => [i, +(root.querySelector(`[name="lv${i}"]:checked`)?.value || 0)]).filter(([, x]) => x));
  const liveDesc = root => root.addEventListener('change', e => { const m = e.target.name?.match(/^lv(\d)$/); if (!m) return; const p = root.querySelector(`[data-desc="${m[1]}"]`); if (p) p.textContent = e.target.value ? DOMAINS[m[1]][1][e.target.value - 1] : ''; });
  function selfModal(tid) {
    const s = selfOf(tid) || { lv: {} };
    modal(`<h2>خودارزیابی · ${termName(TERM)}</h2>
      ${DOMAINS.map((_, i) => lvPick(i, s.lv[i], false)).join('')}
      <label class="field"><span>شاهد یا توضیح</span><textarea class="input" id="tm-sn" rows="3">${esc(s.note || '')}</textarea></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      liveDesc(root);
      root.querySelector('#save').onclick = () => { const lv = readLv(root);
        if (Object.keys(lv).length < DOMAINS.length) return UI.invalid(root.querySelector(`[name="lv${DOMAINS.findIndex((_, i) => !lv[i])}"]`), 'برای هر حوزه یک سطح بزنید.');
        tm().self[TERM + '|' + tid] = { lv, note: v(root, '#tm-sn'), at: Date.now() }; done('خودارزیابی ذخیره شد.'); };
    });
  }
  function obsModal(tid, id) {
    const t = byId(tid), cur = tm().obs.find(x => x.id === id) || { lv: {}, date: today };
    modal(`<h2>بازدید کلاس · ${esc(t.name)}</h2><p class="muted small">پانزده دقیقه کافی است. فقط حوزه‌هایی را که دیدید علامت بزنید.</p>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>تاریخ</span>${J.field('tm-d', cur.date)}</div>
      <label class="field"><span>کلاس</span><select class="input" id="tm-c"><option value="">—</option>${t.cls.map(c => `<option ${c === cur.cls ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>
      ${DOMAINS.map((_, i) => lvPick(i, cur.lv[i], true)).join('')}
      <label class="field"><span>درخشش: یک چیز خوب که دیدید</span><textarea class="input" id="tm-glow" rows="2">${esc(cur.glow || '')}</textarea></label>
      <label class="field"><span>پیشنهاد: یک چیز برای قدم بعد</span><textarea class="input" id="tm-grow" rows="2">${esc(cur.grow || '')}</textarea></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      liveDesc(root);
      root.querySelector('#save').onclick = () => { const lv = readLv(root);
        if (!Object.keys(lv).length && !v(root, '#tm-glow')) return UI.invalid(root.querySelector('[name="lv0"]'), 'دست‌کم یک حوزه یا یک درخشش بنویسید.');
        const rec = { date: v(root, '#tm-d') || today, cls: v(root, '#tm-c'), lv, glow: v(root, '#tm-glow'), grow: v(root, '#tm-grow') };
        rec.term = termOf(rec.date);
        if (id) Object.assign(cur, rec); else tm().obs.push({ id: D.uid('tv'), tid, by: 'principal', seen: false, reply: '', at: Date.now(), ...rec });
        done('بازدید ثبت شد؛ معلم آن را در آینهٔ خود می‌بیند.'); };
    });
  }
  function goalModal(tid, id) {
    const g = tm().goals.find(x => x.id === id) || {};
    const best = mirrors(tid).map((m, i) => ({ i, x: avg([m.self, m.obs, m.stu].filter(y => y != null)) })).filter(y => y.x != null).sort((a, b) => a.x - b.x)[0];
    modal(`<h2>${id ? 'ویرایش' : 'تازه'} · هدف رشد</h2>${!id && best ? `<p class="note small">پیشنهاد از سه آینه: «${DOMAINS[best.i][0]}» پایین‌ترین سطح را دارد.</p>` : ''}
      <label class="field"><span>حوزه</span><select class="input" id="tm-gd">${DOMAINS.map(([n], i) => `<option value="${i}" ${(g.dom ?? best?.i ?? 0) === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>هدف</span><input class="input" id="tm-gt" value="${esc(g.text || '')}" placeholder="مثلاً در هر جلسه دو پرسش فکری از همهٔ کلاس"></label>
      <label class="field"><span>قدم اول</span><input class="input" id="tm-gs" value="${esc(g.step || '')}"></label>
      <div class="field"><span>تاریخ بازبینی</span>${J.field('tm-gdue', g.due || D.shift(30, today))}</div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">ذخیره</button>${id ? '<button class="btn danger" id="del">حذف</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { if (!v(root, '#tm-gt')) return UI.invalid('#tm-gt', 'هدف را بنویسید.');
        const rec = { dom: +v(root, '#tm-gd'), text: v(root, '#tm-gt'), step: v(root, '#tm-gs'), due: v(root, '#tm-gdue') };
        if (id) Object.assign(g, rec); else tm().goals.push({ id: D.uid('tg'), tid, term: TERM, status: 'open', review: '', by: role(), at: Date.now(), ...rec });
        done('هدف رشد ذخیره شد.'); };
      const del = root.querySelector('#del'); if (del) del.onclick = () => { tm().goals = tm().goals.filter(x => x.id !== id); done('هدف حذف شد.'); };
    });
  }
  function textModal(title, label, cur, onSave) {
    modal(`<h2>${title}</h2><label class="field"><span>${label}</span><textarea class="input" id="tm-x" rows="4">${esc(cur || '')}</textarea></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { if (!v(root, '#tm-x')) return UI.invalid('#tm-x', 'چیزی بنویسید.'); onSave(v(root, '#tm-x')); };
    });
  }
  function answerModal(tid) {
    const t = byId(tid), sid = ctx.sid(), g = ctx.grade(), key = `${TERM}|${tid}|${g}:${sid}`;
    modal(`<h2>نظر دربارهٔ کلاس ${esc(t.name)}</h2><p class="muted small">بی‌نام است. هر جمله چقدر دربارهٔ این کلاس درست است؟</p>
      ${SURVEY.map(([q], k) => `<fieldset class="tm-pick"><legend>${q}</legend><div class="tm-opts">${ANS.map(([a, l]) => `<label><input type="radio" name="q${k}" value="${a}"><span>${l}</span></label>`).join('')}</div></fieldset>`).join('')}
      <label class="field"><span>یک چیز که دوست داری بماند، یا یک پیشنهاد (چیزی ننویس که نشان دهد کی هستی)</span><textarea class="input" id="tm-st" rows="2" data-novoice></textarea></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">فرستادن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { const a = SURVEY.map((_, k) => +(root.querySelector(`[name="q${k}"]:checked`)?.value || 0)), miss = a.findIndex(x => !x);
        if (miss >= 0) return UI.invalid(root.querySelector(`[name="q${miss}"]`), 'به همهٔ جمله‌ها پاسخ بده.');
        tm().resp.push({ term: TERM, tid, a, text: v(root, '#tm-st'), at: Math.floor(Date.now() / 864e5) });  // the day only, not the minute
        tm().done[key] = 1; done('پاسخت ثبت شد. ممنون!'); };
    });
  }

  const obsById = id => tm().obs.find(x => x.id === id);
  const act = {
    'tm-self': b => selfModal(b.dataset.id),
    'tm-obs': b => obsModal(b.dataset.id),
    'tm-obs-edit': b => obsModal(obsById(b.dataset.id).tid, b.dataset.id),
    'tm-obs-del': async b => { if (!await UI.ask('حذف بازدید', 'این بازدید حذف شود؟', 'حذف')) return; tm().obs = tm().obs.filter(x => x.id !== b.dataset.id); save(); render(); toast('بازدید حذف شد.'); },
    'tm-reply': b => textModal('پاسخ به بازدید', 'برداشت شما از این بازدید و پیشنهادش', obsById(b.dataset.id).reply, x => { obsById(b.dataset.id).reply = x; done('پاسخ ثبت شد.'); }),
    'tm-goal': b => goalModal(b.dataset.id),
    'tm-gedit': b => goalModal(tm().goals.find(x => x.id === b.dataset.id).tid, b.dataset.id),
    'tm-gdone': b => { const g = tm().goals.find(x => x.id === b.dataset.id); textModal('نتیجهٔ هدف رشد', `«${esc(g.text)}» چطور پیش رفت؟`, g.review, x => { g.review = x; g.status = 'done'; done('نتیجه ثبت شد.'); }); },
    'tm-answer': b => answerModal(b.dataset.id),
  };
  function bind() {
    const q = document.getElementById('tm-q'); if (q) q.oninput = () => { state.q = q.value; render(); const el = document.getElementById('tm-q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
    const only = document.getElementById('tm-only'); if (only) only.onchange = () => { state.only = only.checked; render(); document.getElementById('tm-only')?.focus(); };
    const pick = document.getElementById('tm-me'); if (pick) pick.onchange = () => { Shell.setPref({ tmMe: pick.value }); render(); };
  }
  return { pages: { teval, mirror, tsurvey }, act, bind, deskCard, sidePanel };
};
