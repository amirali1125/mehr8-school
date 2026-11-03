// The live online class («کلاس آنلاین») of a course page (classroom.js): sessions planned ahead or started at once, and a
// room shaped like BigBlueButton / Skyroom — a stage (whiteboard with pages, a slide or file, the teacher's camera or
// screen), a side panel (chat, participants with raised hands, polls), a control bar (mic, camera, screen, board, slide,
// recording, end) and, afterwards, a report of the session (attendance with minutes, chat, polls, board pages).
// Live sync: the teacher's tab is the host. Every tab of the same browser that opens the room joins through a
// BroadcastChannel: chat, hands, polls, board strokes, slides and the attendance travel over it, and the teacher's camera
// or screen reaches the students as WebRTC video signalled over the same channel. Between different devices the same
// protocol needs a relay server; until then the course's own link (BigBlueButton / Skyroom, in «تنظیمات») carries
// video and sound, and the room offers it as «تصویر و صدا از سرور مدرسه». Only the host saves the session.
// Data: course.live = { sessions: [{ id, title, date, from, to, cls, status: planned|live|done, startedAt, endedAt,
//   att: { sid: { first, last, mins } }, chat: [{ who, sid, text, at }], polls: [{ q, opts, votes: { key: i } }],
//   boards: [[stroke]], recs: [{ at, secs }], sample }] }.
const LiveClass = (() => {
  const { esc, fa, modal, close, toast } = UI;
  const J = JDate, D = SchoolData;
  const pad = n => String(n).padStart(2, '0');
  const dg = s => String(s || '').replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const nowIso = () => new Date().toISOString();
  const hm = () => { const t = new Date(); return `${pad(t.getHours())}:${pad(t.getMinutes())}`; };
  const today = () => J.todayIso();
  const SV = (p, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = {
    cam: SV('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
    camOff: SV('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3M2 2l20 20"/>'),
    mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    micOff: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18"/>'),
    screen: SV('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M12 13V7M9 10l3-3 3 3"/>'),
    board: SV('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 20l2-4M17 20l-2-4M7 12l3-3 2 2 4-4"/>'),
    slide: SV('<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="m3 14 5-4 4 3 3-2 6 4"/><circle cx="16" cy="8" r="1.5"/>'),
    rec: SV('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>'),
    hand: SV('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L2.6 15.4a1.6 1.6 0 0 1 2.4-2.1L8 16"/>'),
    chat: SV('<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    users: SV('<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.4M18 14a6 6 0 0 1 3 6"/>'),
    poll: SV('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
    leave: SV('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>'),
    end: SV('<path d="M3 15c5-4 13-4 18 0l-2 3-4-1.5v-2.5a10 10 0 0 0-6 0v2.5L5 18z"/>'),
    link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    pen: SV('<path d="M4 20l4-1 10-10-3-3L5 16z"/>'), marker: SV('<path d="M9 15 4 20h5l2-2M14 4l6 6-8 8-6-6z"/>'),
    eraser: SV('<path d="M4 16 13 7l6 6-7 7H8zM9 20h11"/>'), line: SV('<path d="M5 19 19 5"/>'), rect: SV('<rect x="4" y="6" width="16" height="12" rx="1"/>'),
    ellipse: SV('<ellipse cx="12" cy="12" rx="8" ry="6"/>'), text: SV('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'), undo: SV('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    trash: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'), prev: SV('<path d="m9 6 6 6-6 6"/>'), next: SV('<path d="m15 6-6 6 6 6"/>'), plus: SV('<path d="M12 5v14M5 12h14"/>'),
    lock: SV('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'), unlock: SV('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    send: SV('<path d="M20 4 3 11l7 2 2 7z"/><path d="m10 13 4-4"/>'), live: SV('<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>'),
    report: SV('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  };
  const COLORS = ['#1f2937', '#b91c1c', '#1d4ed8', '#047857', '#b45309', '#6d28d9'];

  /* ======================= sessions ======================= */
  const live = c => (c.live = c.live || { sessions: [] });
  const sessOf = (c, id) => live(c).sessions.find(s => s.id === id);
  const clsName = (o, id) => id ? o.className(id) : 'همهٔ کلاس‌ها';
  const roster = (o, s) => o.students().filter(x => !s.cls || x.cls === s.cls);
  const fdate = iso => J.format(iso);
  const mins = s => s.startedAt && s.endedAt ? Math.max(1, Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000)) : 0;
  const present = s => Object.keys(s.att || {}).length;
  // Sorted: the live one, then upcoming by date and time, then past ones newest first.
  const sorted = c => { const l = live(c).sessions;
    return [...l.filter(s => s.status === 'live'), ...l.filter(s => s.status === 'planned').sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from)),
      ...l.filter(s => s.status === 'done').sort((a, b) => (b.date + b.from).localeCompare(a.date + a.from))]; };

  // Two past sessions and one for today in the demo teacher's subject, so the tab and the report have something to show.
  function seed(c, o) {
    if (live(c).seeded || o.sub !== D.TEACHER_SUBJECT) return;
    const ss = o.students(), cls = o.classes()[0]?.id || null, mine = ss.filter(x => !cls || x.cls === cls);
    const day = n => { let x = D.shift(n); while (D.dayIndex(x) === null) x = D.shift(-1, x); return x; };
    const past = (n, title, from, to, polls) => { const date = day(n), att = {}, start = new Date(`${date}T${from}:00`);
      mine.forEach((x, i) => { if (i % 7 === 3) return; const m = 40 - (i % 5) * 4; att[x.id] = { first: new Date(+start + (i % 4) * 60000).toISOString(), last: new Date(+start + m * 60000).toISOString(), mins: m }; });
      return { id: D.uid('lv'), title: `${title} (نمونه)`, date, from, to, cls, status: 'done', startedAt: start.toISOString(), endedAt: new Date(+start + 45 * 60000).toISOString(), att,
        chat: [{ who: o.me(), text: 'سلام بچه‌ها، صدای من را دارید؟', at: start.toISOString() }, ...mine.slice(0, 3).map((x, i) => ({ who: x.name, sid: x.id, text: ['بله آقا، صدا خوبه', 'سلام، بله', 'آقا تمرین ۳ رو هم حل می‌کنید؟'][i], at: new Date(+start + (i + 1) * 60000).toISOString() }))],
        polls, boards: [[{ k: 'text', x: .06, y: .12, s: title, c: '#1d4ed8', w: .045 }, { k: 'line', p: [[.06, .2], [.6, .2]], c: '#b45309', w: .004 }]], recs: [], sample: true }; };
    const votes = {}; mine.slice(0, 18).forEach((x, i) => { votes[x.id] = i % 3 === 0 ? 1 : 0; });
    live(c).sessions.push(
      past(-7, 'معادله‌های درجهٔ اول', '10:00', '10:45', []),
      past(-2, 'حل تمرین فصل سوم', '10:00', '10:45', [{ q: 'تمرین‌های فصل را حل کرده‌اید؟', opts: ['بله، همه را', 'نه هنوز'], votes, closed: true }]),
      { id: D.uid('lv'), title: 'رفع اشکال پیش از آزمون (نمونه)', date: today(), from: '16:00', to: '16:45', cls, status: 'planned', att: {}, chat: [], polls: [], boards: [[]], recs: [], sample: true });
    live(c).seeded = true; o.save();
  }

  // The course page's card: the class going on now, or the next one, and the way in.
  function card(c, o, s) {
    seed(c, o);
    const l = sorted(c), cur = l.find(x => x.status === 'live'), next = l.find(x => x.status === 'planned' && (!s || !x.cls || x.cls === s.cls));
    const done = l.filter(x => x.status === 'done' && (!s || !x.cls || x.cls === s.cls));
    const target = cur && (!s || !cur.cls || cur.cls === s.cls) ? cur : next;
    const canJoin = target && (target.status === 'live' || target.date === today());
    const when = x => `${fdate(x.date)}، ساعت ${dg(x.from)}${x.to ? ` تا ${dg(x.to)}` : ''}`;
    const mine = s ? done.filter(x => x.att?.[s.id]).length : 0;
    return `<div class="card lv-card ${target?.status === 'live' ? 'is-live' : ''}"><div class="card-head"><div class="row"><span class="tile lv-ic">${IC.cam}</span><div><h2 style="margin:0">کلاس آنلاین</h2>
        <span class="small muted">${target ? `${target.status === 'live' ? '<b class="lv-dot">در حال برگزاری</b> · ' : ''}${esc(target.title)} · ${when(target)}` : 'جلسه‌ای در برنامه نیست.'}</span></div></div>
      <div class="row">${target ? `<button type="button" class="btn ${canJoin ? 'primary' : ''}" data-act="lv-join" data-id="${target.id}" ${canJoin ? '' : 'disabled'}>${s ? 'ورود به کلاس' : target.status === 'live' ? 'بازگشت به کلاس' : 'شروع کلاس'}</button>` : ''}
        ${!s && !o.ro ? '<button type="button" class="btn" data-act="lv-now">شروع فوری</button>' : ''}${c.link ? `<a class="btn" href="${esc(c.link)}" target="_blank" rel="noopener">${IC.link} سرور مدرسه</a>` : ''}</div></div>
      ${s && done.length ? `<p class="small muted" style="margin:0">در ${fa(mine)} جلسه از ${fa(done.length)} جلسهٔ برگزارشده حاضر بوده‌ای.</p>` : ''}</div>`;
  }

  // The «کلاس آنلاین» tab: sessions ahead, the live one and past ones with their reports.
  function tab(c, o) {
    seed(c, o);
    const l = sorted(c), up = l.filter(x => x.status !== 'done'), past = l.filter(x => x.status === 'done');
    const row = x => `<tr class="${x.status === 'live' ? 'lv-row-live' : ''}"><td><b>${esc(x.title)}</b>${x.status === 'live' ? ' <span class="tag bad">زنده</span>' : x.date === today() ? ' <span class="tag warn">امروز</span>' : ''}</td>
      <td>${esc(fdate(x.date))}</td><td class="num">${dg(x.from)}${x.to ? `–${dg(x.to)}` : ''}</td><td>${esc(clsName(o, x.cls))}</td>
      <td class="lv-acts">${o.ro ? '' : `<button type="button" class="btn sm primary" data-act="lv-join" data-id="${x.id}">${x.status === 'live' ? 'بازگشت به کلاس' : 'شروع'}</button>
        <button type="button" class="btn sm" data-act="lv-edit" data-id="${x.id}">ویرایش</button><button type="button" class="btn sm danger" data-act="lv-del" data-id="${x.id}" aria-label="حذف ${esc(x.title)}">حذف</button>`}</td></tr>`;
    const prow = x => { const r = roster(o, x).length;
      return `<tr><td><b>${esc(x.title)}</b></td><td>${esc(fdate(x.date))}</td><td class="num">${fa(mins(x))} دقیقه</td><td class="num">${fa(present(x))} از ${fa(r)}</td>
        <td class="num">${fa((x.chat || []).length)}</td><td><button type="button" class="btn sm" data-act="lv-report" data-id="${x.id}">${IC.report} گزارش</button></td></tr>`; };
    const totalP = past.reduce((a, x) => a + present(x), 0), totalR = past.reduce((a, x) => a + roster(o, x).length, 0);
    return `<div class="grid g3 lv-kpis">${o.kpi('جلسه‌های برگزارشده', fa(past.length), past.length ? `${fa(past.reduce((a, x) => a + mins(x), 0))} دقیقه کلاس` : 'هنوز جلسه‌ای نبوده', '', 'blue')}
        ${o.kpi('میانگین حضور', totalR ? `${fa(Math.round(totalP / totalR * 100))}٪` : '—', 'در جلسه‌های آنلاین', '', 'teal')}
        ${o.kpi('جلسه‌های پیش رو', fa(up.filter(x => x.status === 'planned').length), up[0] ? `بعدی: ${fdate(up[0].date)}` : '', '', 'violet')}</div>
      <div class="card"><div class="card-head"><h2 style="margin:0">جلسه‌های پیش رو</h2>${o.ro ? '' : `<div class="row"><button type="button" class="btn primary" data-act="lv-now">${IC.live} شروع فوری کلاس</button><button type="button" class="btn" data-act="lv-new">+ برنامه‌ریزی جلسه</button></div>`}</div>
        ${up.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="جلسه‌های پیش رو"><table><tr><th>عنوان</th><th>روز</th><th>ساعت</th><th>کلاس</th><th></th></tr>${up.map(row).join('')}</table></div>` : o.empty('جلسه‌ای برنامه‌ریزی نشده. با «شروع فوری» همین حالا کلاس را باز کنید.')}</div>
      <div class="card"><h2>جلسه‌های برگزارشده</h2>${past.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="جلسه‌های برگزارشده"><table><tr><th>عنوان</th><th>روز</th><th>مدت</th><th>حاضر</th><th>پیام</th><th></th></tr>${past.map(prow).join('')}</table></div>` : o.empty('هنوز کلاسی برگزار نشده.')}</div>`;
  }

  function sessionModal(c, o, x) {
    modal(`<h2>${x ? 'ویرایش جلسه' : 'برنامه‌ریزی جلسهٔ آنلاین'}</h2>
      <label class="field"><span>عنوان جلسه</span><input class="input" id="lv-t" value="${esc(x?.title || '')}" placeholder="مثلاً حل تمرین فصل چهارم"></label>
      <div class="grid g3" style="gap:0 12px"><div class="field"><span>روز</span>${J.field('lv-d', x?.date || today())}</div>
        <label class="field"><span>از ساعت</span><input class="input" type="time" id="lv-f" value="${esc(x?.from || hm())}"></label>
        <label class="field"><span>تا ساعت</span><input class="input" type="time" id="lv-e" value="${esc(x?.to || '')}"></label></div>
      <label class="field"><span>کلاس</span><select class="input" id="lv-c"><option value="">همهٔ کلاس‌ها</option>${o.classes().map(k => `<option value="${k.id}" ${x?.cls === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="lv-ok">${x ? 'ذخیره' : 'ثبت جلسه'}</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#lv-ok').onclick = () => {
        const title = root.querySelector('#lv-t').value.trim(); if (!title) return UI.invalid('#lv-t', 'عنوان جلسه را بنویسید.');
        const rec = { title, date: root.querySelector('#lv-d').value || today(), from: root.querySelector('#lv-f').value, to: root.querySelector('#lv-e').value, cls: root.querySelector('#lv-c').value || null };
        if (rec.to && rec.from && rec.to <= rec.from) return UI.invalid('#lv-e', 'پایان باید بعد از شروع باشد.');
        if (x) Object.assign(x, rec); else live(c).sessions.push({ id: D.uid('lv'), ...rec, status: 'planned', att: {}, chat: [], polls: [], boards: [[]], recs: [] });
        o.save(); close(); o.render(); toast(x ? 'جلسه ویرایش شد.' : 'جلسه ثبت شد.');
      };
    });
  }

  // The report of a held session: attendance with minutes, the chat, the polls and the board pages.
  function report(c, o, x) {
    const r = roster(o, x), pr = r.filter(s => x.att?.[s.id]).length;
    const boards = (x.boards || []).filter(p => p.length);
    modal(`<h2>گزارش جلسه: ${esc(x.title)}</h2><p class="muted" style="margin-top:-6px">${esc(fdate(x.date))} · ${fa(mins(x))} دقیقه · ${esc(clsName(o, x.cls))}</p>
      <div class="grid g3 lv-kpis">${o.kpi('حاضر', `${fa(pr)} از ${fa(r.length)}`, '', '', 'teal')}${o.kpi('پیام‌ها', fa((x.chat || []).length), '', '', 'blue')}${o.kpi('نظرسنجی', fa((x.polls || []).length), '', '', 'violet')}</div>
      <h3 class="lv-h3">حضور</h3><div class="table-wrap lv-rep" tabindex="0" role="region" aria-label="حضور جلسه"><table><tr><th>دانش‌آموز</th><th>کلاس</th><th>ورود</th><th>مدت</th></tr>
        ${[...r].sort((a, b) => !x.att?.[a.id] - !x.att?.[b.id]).map(s => { const a = x.att?.[s.id]; return `<tr><td>${esc(s.name)}</td><td>${esc(o.className(s.cls))}</td><td class="num">${a ? dg(new Date(a.first).toTimeString().slice(0, 5)) : '<span class="tag bad">غایب</span>'}</td><td class="num">${a ? `${fa(a.mins || 0)} دقیقه` : '—'}</td></tr>`; }).join('')}</table></div>
      ${(x.polls || []).length ? `<h3 class="lv-h3">نظرسنجی‌ها</h3>${x.polls.map(p => pollResult(p)).join('')}` : ''}
      ${(x.chat || []).length ? `<h3 class="lv-h3">گفت‌وگو</h3><div class="lv-replog">${x.chat.map(m => `<p><b>${esc(m.who)}</b> <span class="muted small num">${dg(new Date(m.at).toTimeString().slice(0, 5))}</span><br>${esc(m.text)}</p>`).join('')}</div>` : ''}
      ${boards.length ? `<h3 class="lv-h3">صفحه‌های تخته</h3><div class="lv-thumbs">${boards.map((_, i) => `<canvas class="lv-thumb" width="320" height="180" data-pg="${i}" role="img" aria-label="صفحهٔ ${fa(i + 1)} تخته"></canvas>`).join('')}</div>` : ''}
      ${(x.recs || []).length ? `<p class="small muted">${fa(x.recs.length)} ضبط در همین جلسه روی رایانهٔ معلم ذخیره شد.</p>` : ''}
      <div class="row" style="margin-top:16px"><button class="btn" data-close>بستن</button></div>`, root => {
      root.querySelectorAll('.lv-thumb').forEach(cv => paint(cv.getContext('2d'), boards[+cv.dataset.pg], cv.width, cv.height));
    });
  }
  const pollResult = p => { const n = Object.keys(p.votes || {}).length, cnt = p.opts.map((_, i) => Object.values(p.votes || {}).filter(v => v === i).length);
    return `<div class="lv-poll-r"><b>${esc(p.q)}</b> <span class="muted small">${fa(n)} رأی</span>${p.opts.map((op, i) => `<div class="lv-bar"><span>${esc(op)}</span><i style="--w:${n ? cnt[i] / n * 100 : 0}%"></i><b class="num">${fa(cnt[i])}</b></div>`).join('')}</div>`; };

  /* ======================= the board ======================= */
  // Strokes are in board units (0..1 across, 0..9/16 down), so every screen draws them the same.
  function paint(g, strokes, W, H) {
    g.save(); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.lineCap = 'round'; g.lineJoin = 'round';
    (strokes || []).forEach(s => drawStroke(g, s, W)); g.restore();
  }
  function drawStroke(g, s, W) {
    g.save(); g.strokeStyle = g.fillStyle = s.c; g.lineWidth = Math.max(1, s.w * W); g.globalAlpha = s.k === 'marker' ? .35 : 1;
    if (s.k === 'eraser') { g.strokeStyle = '#fff'; g.globalAlpha = 1; }
    const P = (s.p || []).map(([x, y]) => [x * W, y * W]);
    if (s.k === 'text') { g.font = `600 ${s.w * W}px Vazirmatn, Tahoma, sans-serif`; g.textBaseline = 'top'; g.direction = 'rtl'; g.textAlign = 'right'; g.fillText(s.s, s.x * W, s.y * W); }
    else if (s.k === 'line' && P.length > 1) { g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[P.length - 1]); g.stroke(); }
    else if (s.k === 'rect' && P.length > 1) { const [a, b] = [P[0], P[P.length - 1]]; g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
    else if (s.k === 'ellipse' && P.length > 1) { const [a, b] = [P[0], P[P.length - 1]]; g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2); g.stroke(); }
    else if (P.length) { g.beginPath(); g.moveTo(...P[0]); P.slice(1).forEach(p => g.lineTo(...p)); if (P.length === 1) g.lineTo(P[0][0] + .1, P[0][1]); g.stroke(); }
    g.restore();
  }

  /* ======================= the room ======================= */
  let R = null;
  function open(c, o, x, as) {
    if (R) leave(false);
    const host = !as;
    const me = host ? { key: 'host', name: o.me() } : { key: 's:' + as.id + ':' + Math.random().toString(36).slice(2, 6), sid: as.id, name: as.name };
    if (host && x.status !== 'live') { x.status = 'live'; x.startedAt = x.startedAt || nowIso(); x.boards = x.boards?.length ? x.boards : [[]]; o.save(); }
    R = { c, o, x, host, me, page: 0, boards: host ? x.boards : [[]], view: 'board', slide: null, chat: host ? x.chat || (x.chat = []) : [], poll: null, polls: x.polls || (x.polls = []),
      hands: new Map(), people: new Map(), canWrite: false, tool: 'pen', color: COLORS[0], width: .004, cam: null, screen: null, mic: null, remote: null,
      peers: new Map(), pc: null, rec: null, recAt: 0, started: Date.now(), waiting: !host, side: 'chat', unread: 0, ended: false };
    R.chan = new BroadcastChannel('mehr8-live:' + x.id);
    R.chan.onmessage = e => onMsg(e.data);
    shell(); paintBoard(); renderSide(); tick(); R.tickT = setInterval(tick, 1000);
    if (host) send({ t: 'host-here', title: x.title });
    else send({ t: 'hello', from: me.key, sid: me.sid, name: me.name });
    addEventListener('beforeunload', unload);
  }
  const unload = () => { if (!R) return; send({ t: R.host ? 'host-away' : 'bye', from: R.me.key, sid: R.me.sid }); };
  const send = m => { try { R?.chan.postMessage(m); } catch { /* channel closed */ } };
  const $r = s => document.querySelector('#lv-room ' + s);

  function shell() {
    const { x, host } = R;
    const el = document.createElement('div'); el.id = 'lv-room'; el.className = 'lv-room'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'کلاس آنلاین: ' + x.title);
    const tb = (act, ic, label, extra = '') => `<button type="button" class="lv-ctl" data-lv="${act}" aria-label="${label}" title="${label}" ${extra}>${ic}<span>${label}</span></button>`;
    el.innerHTML = `<header class="lv-top"><div class="lv-ttl"><span class="lv-live">${IC.live} زنده</span><b>${esc(x.title)}</b><span class="lv-sub">${esc(R.o.sub)} · ${esc(clsName(R.o, x.cls))}</span></div>
        <div class="lv-meta"><span class="lv-rec-on" hidden>${IC.rec} در حال ضبط</span><span class="lv-clock num" aria-label="مدت کلاس">۰۰:۰۰</span><span class="lv-count">${IC.users}<b class="num">۰</b></span></div></header>
      <div class="lv-body"><main class="lv-stage" aria-label="صفحهٔ کلاس">
          <div class="lv-wait" ${R.waiting ? '' : 'hidden'}><div class="lv-spin" aria-hidden="true"></div><b>منتظر ورود معلم…</b><span class="muted small">کلاس هنوز شروع نشده؛ به محض شروع، این صفحه خودش باز می‌شود.</span></div>
          <div class="lv-boardwrap" data-v="board"><canvas class="lv-board" aria-label="تختهٔ کلاس" role="img"></canvas><input class="lv-txt" hidden aria-label="نوشتن روی تخته" placeholder="بنویسید و Enter بزنید"></div>
          <div class="lv-slidewrap" data-v="slide" hidden></div>
          <video class="lv-video" data-v="video" playsinline autoplay muted hidden aria-label="تصویر کلاس"></video>
          <video class="lv-pip" playsinline autoplay muted hidden aria-label="تصویر معلم"></video>
          <div class="lv-bt" role="toolbar" aria-label="ابزار تخته">
            ${['pen', 'marker', 'eraser', 'line', 'rect', 'ellipse', 'text'].map(k => `<button type="button" class="lv-tool ${k === 'pen' ? 'on' : ''}" data-tool="${k}" aria-label="${{ pen: 'قلم', marker: 'ماژیک', eraser: 'پاک‌کن', line: 'خط', rect: 'مستطیل', ellipse: 'بیضی', text: 'متن' }[k]}" title="${{ pen: 'قلم', marker: 'ماژیک', eraser: 'پاک‌کن', line: 'خط', rect: 'مستطیل', ellipse: 'بیضی', text: 'متن' }[k]}">${IC[k]}</button>`).join('')}
            <span class="lv-sep"></span>${COLORS.map((k, i) => `<button type="button" class="lv-color ${i ? '' : 'on'}" data-color="${k}" style="--c:${k}" aria-label="رنگ ${i + 1}"></button>`).join('')}
            <span class="lv-sep"></span><button type="button" class="lv-tool" data-lv="undo" aria-label="برگرداندن" title="برگرداندن">${IC.undo}</button>
            ${host ? `<button type="button" class="lv-tool" data-lv="clear" aria-label="پاک کردن صفحه" title="پاک کردن صفحه">${IC.trash}</button>
            <span class="lv-sep"></span><button type="button" class="lv-tool" data-lv="pg-prev" aria-label="صفحهٔ قبل" title="صفحهٔ قبل">${IC.prev}</button><b class="lv-pg num">۱/۱</b><button type="button" class="lv-tool" data-lv="pg-next" aria-label="صفحهٔ بعد" title="صفحهٔ بعد">${IC.next}</button>
            <button type="button" class="lv-tool" data-lv="pg-add" aria-label="صفحهٔ تازه" title="صفحهٔ تازه">${IC.plus}</button>
            <span class="lv-sep"></span><button type="button" class="lv-tool lv-perm" data-lv="perm" aria-label="اجازهٔ نوشتن دانش‌آموزان" title="اجازهٔ نوشتن دانش‌آموزان">${IC.lock}</button>` : '<b class="lv-pg num">۱/۱</b>'}
          </div>
        </main>
        <aside class="lv-side" aria-label="گفت‌وگو و شرکت‌کنندگان"><div class="lv-stabs" role="tablist">
            <button type="button" role="tab" data-side="chat" aria-selected="true">${IC.chat}<span>گفت‌وگو</span><i class="lv-badge" hidden></i></button>
            <button type="button" role="tab" data-side="people" aria-selected="false">${IC.users}<span>${host ? 'شرکت‌کنندگان' : 'حاضران'}</span><i class="lv-hbadge" hidden></i></button>
            <button type="button" role="tab" data-side="poll" aria-selected="false">${IC.poll}<span>نظرسنجی</span></button></div>
          <div class="lv-spanel" role="tabpanel"></div></aside></div>
      <footer class="lv-ctrls" role="toolbar" aria-label="کنترل‌های کلاس">
        ${host ? tb('mic', IC.micOff, 'میکروفون') + tb('cam', IC.camOff, 'دوربین') + tb('screen', IC.screen, 'اشتراک صفحه') + tb('v-board', IC.board, 'تخته', 'aria-pressed="true"') + tb('slide', IC.slide, 'اسلاید و فایل') + tb('rec', IC.rec, 'ضبط')
          : tb('hand', IC.hand, 'بالا بردن دست', 'aria-pressed="false"')}
        ${R.c.link ? `<a class="lv-ctl" href="${esc(R.c.link)}" target="_blank" rel="noopener" title="تصویر و صدا از سرور مدرسه">${IC.link}<span>سرور مدرسه</span></a>` : ''}
        <span class="lv-grow"></span>${host ? tb('leave', IC.leave, 'خروج موقت') + `<button type="button" class="lv-ctl lv-end" data-lv="end">${IC.end}<span>پایان کلاس</span></button>`
          : `<button type="button" class="lv-ctl lv-end" data-lv="leave">${IC.leave}<span>خروج از کلاس</span></button>`}
      </footer>`;
    document.body.appendChild(el); document.body.classList.add('lv-open');
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && !$r('.lv-txt:not([hidden])')) { e.preventDefault(); host ? leave(true) : leave(true); } });
    wireBoard(); setTool(R.tool);
    if (!host) el.querySelector('.lv-bt').classList.add('ro');
    R.ro = new ResizeObserver(() => paintBoard()); R.ro.observe($r('.lv-boardwrap'));
    setTimeout(() => (el.querySelector('.lv-ctl') || el).focus(), 50);
  }

  function tick() {
    if (!R) return;
    const s = Math.floor((Date.now() - (R.host && R.x.startedAt ? new Date(R.x.startedAt) : R.started)) / 1000);
    const c = $r('.lv-clock'); if (c) c.textContent = dg(`${pad(Math.floor(s / 60))}:${pad(s % 60)}`);
    const n = $r('.lv-count b'); if (n) n.textContent = fa(R.people.size + (R.host ? 1 : R.waiting ? 0 : 2));
  }

  function setView(v) {
    R.view = v;
    document.querySelectorAll('#lv-room [data-v]').forEach(e => { e.hidden = e.dataset.v !== v; });
    $r('.lv-bt').hidden = v !== 'board';
    document.querySelectorAll('#lv-room [data-lv="v-board"]').forEach(b => b.setAttribute('aria-pressed', String(v === 'board')));
    pip();
    if (v === 'board') paintBoard();
  }
  // The teacher's camera stays in a corner while the board or a slide is shown.
  function pip() {
    const p = $r('.lv-pip'); if (!p) return;
    const src = R.host ? R.cam : (R.remote && R.view !== 'video' ? R.remote : null);
    p.srcObject = src || null; p.hidden = !src || (R.host && R.view === 'video' && !R.screen);
  }

  /* ---- board ---- */
  function paintBoard() {
    if (!R) return;
    const cv = $r('.lv-board'), wrap = $r('.lv-boardwrap'); if (!cv || wrap.hidden) return;
    const W = wrap.clientWidth, H = wrap.clientHeight, w = Math.min(W, H * 16 / 9), h = w * 9 / 16, dpr = devicePixelRatio || 1;
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); paint(g, R.boards[R.page], w, h);
    R.bw = w;
    const pg = $r('.lv-pg'); if (pg) pg.textContent = dg(`${R.page + 1}/${R.boards.length}`);
  }
  const mayDraw = () => R.host || R.canWrite;
  function wireBoard() {
    const cv = $r('.lv-board'); let cur = null;
    const pt = e => { const b = cv.getBoundingClientRect(); return [+((e.clientX - b.left) / b.width).toFixed(4), +((e.clientY - b.top) / b.width).toFixed(4)]; };
    cv.addEventListener('pointerdown', e => {
      if (!mayDraw() || R.view !== 'board') return;
      if (R.tool === 'text') return textAt(pt(e));
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      cur = { k: R.tool, c: R.color, w: R.tool === 'marker' ? .018 : R.tool === 'eraser' ? .03 : R.width, p: [pt(e)], by: R.me.key };
    });
    cv.addEventListener('pointermove', e => {
      if (!cur) return; const p = pt(e);
      if (['line', 'rect', 'ellipse'].includes(cur.k)) cur.p = [cur.p[0], p]; else cur.p.push(p);
      paintBoard(); const g = cv.getContext('2d'); g.save(); g.lineCap = g.lineJoin = 'round'; drawStroke(g, cur, R.bw); g.restore();
    });
    const up = () => { if (!cur) return; addStroke(cur, true); cur = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const inp = $r('.lv-txt');
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const s = inp.value.trim(); if (s) addStroke({ k: 'text', x: R.txtAt[0], y: R.txtAt[1], s, c: R.color, w: .032, by: R.me.key }, true); inp.hidden = true; inp.value = ''; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inp.hidden = true; inp.value = ''; }
    });
    inp.addEventListener('blur', () => { setTimeout(() => { inp.hidden = true; }, 150); });
  }
  function textAt(p) {
    const inp = $r('.lv-txt'), cv = $r('.lv-board'), b = cv.getBoundingClientRect(), wb = $r('.lv-boardwrap').getBoundingClientRect();
    R.txtAt = p; inp.hidden = false; inp.style.top = (b.top - wb.top + p[1] * b.width) + 'px'; inp.style.right = Math.max(0, wb.right - (b.left + p[0] * b.width)) + 'px'; inp.focus();
  }
  function addStroke(s, mine) {
    (R.boards[R.page] = R.boards[R.page] || []).push(s); paintBoard();
    if (mine) send({ t: 'stroke', page: R.page, s });
    if (R.host) R.o.save();
  }
  function setTool(t) { R.tool = t; document.querySelectorAll('#lv-room .lv-tool[data-tool]').forEach(b => { b.classList.toggle('on', b.dataset.tool === t); b.setAttribute('aria-pressed', String(b.dataset.tool === t)); }); }

  /* ---- media (host) ---- */
  async function toggleCam() {
    if (R.cam) { R.cam.getTracks().forEach(t => t.stop()); R.cam = null; }
    else { try { R.cam = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } }); } catch (e) { return toast('دوربین در دسترس نیست یا اجازه داده نشد.'); } }
    btn('cam', R.cam ? IC.cam : IC.camOff, !!R.cam); outgoing();
  }
  async function toggleMic() {
    if (R.mic) { R.mic.getTracks().forEach(t => t.stop()); R.mic = null; }
    else { try { R.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return toast('میکروفون در دسترس نیست یا اجازه داده نشد.'); } }
    btn('mic', R.mic ? IC.mic : IC.micOff, !!R.mic); outgoing();
  }
  async function toggleScreen() {
    if (R.screen) { R.screen.getTracks().forEach(t => t.stop()); R.screen = null; btn('screen', IC.screen, false); setView('board'); send({ t: 'view', view: 'board' }); return outgoing(); }
    try { R.screen = await navigator.mediaDevices.getDisplayMedia({ video: true }); } catch { return toast('اشتراک صفحه لغو شد.'); }
    R.screen.getVideoTracks()[0].onended = () => { if (R?.screen) toggleScreen(); };
    btn('screen', IC.screen, true); const v = $r('.lv-video'); v.srcObject = R.screen; setView('video'); send({ t: 'view', view: 'video' }); outgoing();
  }
  const btn = (k, ic, on) => { const b = $r(`[data-lv="${k}"]`); if (!b) return; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.firstElementChild.outerHTML = ic; };
  // What the students receive: the screen if shared, else the camera; and the microphone. A change renegotiates every peer.
  function outgoing() {
    pip();
    if (R.view === 'video' && !R.screen && R.cam) $r('.lv-video').srcObject = R.cam;
    R.peers.forEach((_, key) => offer(key));
  }
  const tracks = () => [...(R.screen || R.cam)?.getVideoTracks() || [], ...(R.mic?.getAudioTracks() || [])];
  async function offer(key) {
    R.peers.get(key)?.pc?.close();
    const t = tracks(); if (!t.length) { send({ t: 'nomedia', to: key }); R.peers.set(key, {}); return; }
    const pc = new RTCPeerConnection(); R.peers.set(key, { pc });
    const ms = new MediaStream(t); t.forEach(tr => pc.addTrack(tr, ms));
    pc.onicecandidate = e => e.candidate && send({ t: 'ice', to: key, c: e.candidate.toJSON() });
    await pc.setLocalDescription(await pc.createOffer());
    send({ t: 'offer', to: key, sdp: pc.localDescription.toJSON(), kind: R.screen ? 'screen' : 'cam' });
  }

  /* ---- slide (host) ---- */
  function slidePick() {
    const files = R.c.items.filter(i => i.type === 'file').flatMap(i => (i.files || []).map(f => ({ ...f, item: i.title })))
      .filter(f => /^(image\/|application\/pdf)/.test(f.type || '') || /\.(png|jpe?g|gif|webp|pdf)$/i.test(f.name));
    modal(`<h2>نمایش اسلاید یا فایل</h2><p class="muted small" style="margin-top:-6px">عکس یا PDF؛ همه همان را می‌بینند.</p>
      ${files.length ? `<div class="lv-files">${files.map((f, i) => `<button type="button" class="lv-file" data-i="${i}"><b>${esc(f.name)}</b><span class="small muted">${esc(f.item)}</span></button>`).join('')}</div>` : '<p class="muted">در صفحهٔ این درس فایل عکس یا PDF نیست.</p>'}
      <label class="field"><span>یا یک فایل از رایانه</span><input class="input" type="file" id="lv-up" accept="image/*,application/pdf"></label>
      <div class="row" style="margin-top:14px">${R.slide ? '<button class="btn" id="lv-unslide">برگشت به تخته</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelectorAll('.lv-file').forEach(b => b.onclick = () => { const f = files[+b.dataset.i]; showSlide({ name: f.name, type: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/*'), data: f.data }, true); close(); });
      root.querySelector('#lv-up').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 8 * 1048576) return toast('فایل بزرگ‌تر از ۸ مگابایت است.');
        const r = new FileReader(); r.onload = () => { showSlide({ name: f.name, type: f.type, data: r.result }, true); close(); }; r.readAsDataURL(f); };
      const u = root.querySelector('#lv-unslide'); if (u) u.onclick = () => { R.slide = null; setView('board'); send({ t: 'view', view: 'board' }); close(); };
    });
  }
  function showSlide(sl, mine) {
    R.slide = sl; const w = $r('.lv-slidewrap');
    if (R.slideUrl) URL.revokeObjectURL(R.slideUrl);
    fetch(sl.data).then(r => r.blob()).then(b => {
      R.slideUrl = URL.createObjectURL(b);
      w.innerHTML = /pdf/.test(sl.type) ? `<iframe src="${R.slideUrl}" title="${esc(sl.name)}"></iframe>` : `<img src="${R.slideUrl}" alt="${esc(sl.name)}">`;
    });
    setView('slide'); if (mine) send({ t: 'slide', slide: sl });
  }

  /* ---- recording (host): the class tab with the microphone, saved to the teacher's computer ---- */
  async function toggleRec() {
    if (R.rec) { R.rec.stop(); return; }
    let st; try { st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true }); } catch { return toast('ضبط لغو شد.'); }
    const all = new MediaStream([...st.getVideoTracks(), ...st.getAudioTracks(), ...(R.mic?.getAudioTracks() || [])]);
    const type = ['video/webm;codecs=vp9,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(all, type ? { mimeType: type } : {}), parts = [];
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => {
      st.getTracks().forEach(t => t.stop());
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(parts, { type: 'video/webm' }));
      a.download = `کلاس-${R?.x.title || 'آنلاین'}-${today()}.webm`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      if (R) { (R.x.recs = R.x.recs || []).push({ at: nowIso(), secs: Math.round((Date.now() - R.recAt) / 1000) }); R.o.save(); R.rec = null; btn('rec', IC.rec, false); $r('.lv-rec-on').hidden = true; }
      toast('ضبط کلاس در پوشهٔ دانلود ذخیره شد.');
    };
    st.getVideoTracks()[0].onended = () => { if (rec.state === 'recording') rec.stop(); };
    rec.start(1000); R.rec = rec; R.recAt = Date.now(); btn('rec', IC.rec, true); $r('.lv-rec-on').hidden = false;
  }

  /* ---- side panel ---- */
  function renderSide() {
    if (!R) return;
    document.querySelectorAll('#lv-room [data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === R.side)));
    const p = $r('.lv-spanel');
    if (R.side === 'chat') {
      R.unread = 0;
      p.innerHTML = `<div class="lv-chat" aria-live="polite">${R.chat.length ? R.chat.map(m => `<div class="lv-msg ${m.who === R.me.name && (R.host ? !m.sid : m.sid === R.me.sid) ? 'me' : ''} ${m.sid ? '' : 'host'}"><b>${esc(m.who)}</b><span class="num">${dg(new Date(m.at).toTimeString().slice(0, 5))}</span><p>${esc(m.text)}</p></div>`).join('') : '<p class="muted small lv-empty">هنوز پیامی نیست.</p>'}</div>
        <form class="lv-send"><input class="input" id="lv-msg" placeholder="پیام به کلاس…" aria-label="پیام به کلاس" autocomplete="off" maxlength="400"><button class="btn primary" aria-label="فرستادن">${IC.send}</button></form>`;
      const ch = p.querySelector('.lv-chat'); ch.scrollTop = ch.scrollHeight;
      p.querySelector('.lv-send').onsubmit = e => { e.preventDefault(); const i = p.querySelector('#lv-msg'), t = i.value.trim(); if (!t) return;
        const m = { who: R.me.name, sid: R.me.sid, text: t, at: nowIso() }; addChat(m); send({ t: 'chat', m }); i.value = ''; i.focus(); };
    } else if (R.side === 'people') {
      const hands = [...R.hands.values()];
      if (R.host) {
        const ros = roster(R.o, R.x), on = new Set([...R.people.values()].map(v => v.sid));
        const st = s => on.has(s.id) ? 'on' : R.x.att?.[s.id] ? 'left' : 'off';
        p.innerHTML = `${hands.length ? `<div class="lv-hands"><b>${IC.hand} دست بالا (${fa(hands.length)})</b>${hands.map(h => `<div class="lv-hrow"><span>${esc(h.name)}</span><button type="button" class="btn sm" data-lv="hand-down" data-key="${esc(h.key)}">پایین آوردن</button></div>`).join('')}</div>` : ''}
          <p class="small muted lv-pc">${fa(on.size)} آنلاین · ${fa(ros.filter(s => st(s) === 'left').length)} رفته · ${fa(ros.filter(s => st(s) === 'off').length)} وارد نشده</p>
          <ul class="lv-people">${ros.sort((a, b) => ['on', 'left', 'off'].indexOf(st(a)) - ['on', 'left', 'off'].indexOf(st(b))).map(s => `<li class="lv-p-${st(s)}"><i aria-hidden="true"></i><span>${esc(s.name)}</span><span class="small muted">${st(s) === 'on' ? 'آنلاین' : st(s) === 'left' ? `${fa(R.x.att[s.id].mins || 0)} دقیقه` : 'وارد نشده'}</span></li>`).join('')}</ul>`;
      } else {
        p.innerHTML = `<ul class="lv-people"><li class="lv-p-on lv-p-host"><i aria-hidden="true"></i><span>${esc(R.hostName || 'معلم')}</span><span class="small muted">معلم</span></li>
          ${[...R.people.values()].map(v => `<li class="lv-p-on"><i aria-hidden="true"></i><span>${esc(v.name)}</span>${R.hands.has(v.key) ? IC.hand : ''}</li>`).join('')}</ul>`;
      }
    } else {
      const pl = R.poll;
      if (R.host) {
        p.innerHTML = pl && !pl.closed ? `${pollResult(pl)}<button type="button" class="btn primary" data-lv="poll-close">پایان نظرسنجی و نمایش نتیجه</button>`
          : `${pl ? pollResult(pl) : ''}<form class="lv-pform"><label class="field"><span>پرسش</span><input class="input" id="lv-pq" placeholder="مثلاً درس امروز روشن بود؟"></label>
            <div class="field"><span>گزینه‌ها</span>${[0, 1, 2, 3].map(i => `<input class="input lv-po" placeholder="${['بله', 'نه', 'گزینهٔ سوم (اگر لازم است)', 'گزینهٔ چهارم'][i]}" value="${i < 2 ? ['بله', 'نه'][i] : ''}" aria-label="گزینهٔ ${fa(i + 1)}">`).join('')}</div>
            <button class="btn primary">شروع نظرسنجی</button></form>`;
        const f = p.querySelector('.lv-pform'); if (f) f.onsubmit = e => { e.preventDefault(); const q = f.querySelector('#lv-pq').value.trim(), opts = [...f.querySelectorAll('.lv-po')].map(i => i.value.trim()).filter(Boolean);
          if (!q) return UI.invalid('#lv-pq', 'پرسش را بنویسید.'); if (opts.length < 2) return toast('دست‌کم دو گزینه لازم است.');
          R.poll = { q, opts, votes: {}, closed: false }; R.polls.push(R.poll); R.o.save(); send({ t: 'poll', poll: R.poll }); renderSide(); };
      } else {
        const mine = pl?.votes?.[R.me.sid];
        p.innerHTML = !pl ? '<p class="muted small lv-empty">نظرسنجی‌ای در جریان نیست.</p>' : pl.closed ? pollResult(pl)
          : `<div class="lv-pvote"><b>${esc(pl.q)}</b>${pl.opts.map((op, i) => `<button type="button" class="btn ${mine === i ? 'primary' : ''}" data-lv="vote" data-i="${i}">${esc(op)}</button>`).join('')}${mine != null ? '<p class="small muted">رأی شما ثبت شد؛ تا پایان می‌توانید عوضش کنید.</p>' : ''}</div>`;
      }
    }
    const bd = $r('.lv-badge'); if (bd) { bd.hidden = !R.unread; bd.textContent = fa(R.unread); }
    const hb = $r('.lv-hbadge'); if (hb) { hb.hidden = !R.hands.size; hb.textContent = fa(R.hands.size); }
    tick();
  }
  function addChat(m) {
    R.chat.push(m); if (R.host) { if (R.chat.length > 400) R.chat.splice(0, R.chat.length - 400); R.o.save(); }
    if (R.side !== 'chat') { R.unread++; } renderSide();
  }

  /* ---- attendance (host) ---- */
  function arrive(v) {
    R.people.set(v.key, v);
    if (R.host && v.sid) { const a = R.x.att[v.sid] = R.x.att[v.sid] || { first: nowIso(), mins: 0 }; a.since = Date.now(); R.o.save(); }
  }
  function depart(key) {
    const v = R.people.get(key); if (!v) return; R.people.delete(key); R.hands.delete(key); R.peers.get(key)?.pc?.close(); R.peers.delete(key);
    if (R.host && v.sid && R.x.att[v.sid]?.since) { const a = R.x.att[v.sid]; a.mins = (a.mins || 0) + Math.max(1, Math.round((Date.now() - a.since) / 60000)); a.last = nowIso(); delete a.since; R.o.save(); }
  }

  /* ---- messages ---- */
  async function onMsg(m) {
    if (!R) return;
    const { host } = R;
    if (host) {
      if (m.t === 'hello') { arrive({ key: m.from, sid: m.sid, name: m.name });
        send({ t: 'state', to: m.from, title: R.x.title, hostName: R.me.name, boards: R.boards, page: R.page, view: R.view === 'video' && !tracks().length ? 'board' : R.view, slide: R.slide, chat: R.chat, poll: R.poll, canWrite: R.canWrite, people: [...R.people.values()] });
        send({ t: 'people', people: [...R.people.values()] }); offer(m.from); renderSide(); toast(`${m.name} وارد کلاس شد.`); }
      else if (m.t === 'bye') { depart(m.from); send({ t: 'people', people: [...R.people.values()] }); renderSide(); }
      else if (m.t === 'answer') R.peers.get(m.from)?.pc?.setRemoteDescription(m.sdp);
      else if (m.t === 'ice' && m.from) R.peers.get(m.from)?.pc?.addIceCandidate(m.c).catch(() => {});
      else if (m.t === 'hand') { if (m.up) R.hands.set(m.from, { key: m.from, name: m.name }); else R.hands.delete(m.from); send({ t: 'hands', keys: [...R.hands.keys()] }); renderSide(); if (m.up) toast(`${m.name} دستش را بالا برد.`); }
      else if (m.t === 'vote' && R.poll && !R.poll.closed) { R.poll.votes[m.sid] = m.i; R.o.save(); send({ t: 'poll', poll: R.poll }); renderSide(); }
      else if (m.t === 'chat') addChat(m.m);
      else if (m.t === 'stroke' && R.canWrite) { (R.boards[m.page] = R.boards[m.page] || []).push(m.s); if (m.page === R.page) paintBoard(); R.o.save(); }
      else if (m.t === 'undo') undoBy(m.by, m.page);
      return;
    }
    // student
    if (m.to && m.to !== R.me.key) return;
    if (m.t === 'host-here') { R.waiting = true; send({ t: 'hello', from: R.me.key, sid: R.me.sid, name: R.me.name }); }
    else if (m.t === 'state') { R.waiting = false; $r('.lv-wait').hidden = true; R.hostName = m.hostName; R.boards = m.boards; R.page = m.page; R.chat = m.chat || []; R.poll = m.poll; R.canWrite = m.canWrite;
      (m.people || []).forEach(v => v.key !== R.me.key && R.people.set(v.key, v)); setPerm(); if (m.slide) showSlide(m.slide); setView(m.view === 'slide' && !m.slide ? 'board' : m.view); renderSide(); }
    else if (m.t === 'people') { R.people.clear(); m.people.forEach(v => v.key !== R.me.key && R.people.set(v.key, v)); renderSide(); }
    else if (m.t === 'hands') { R.hands = new Map(m.keys.map(k => [k, {}])); const up = R.hands.has(R.me.key); btn('hand', IC.hand, up); renderSide(); }
    else if (m.t === 'stroke') { (R.boards[m.page] = R.boards[m.page] || []).push(m.s); if (m.page === R.page) paintBoard(); }
    else if (m.t === 'undo') undoBy(m.by, m.page, true);
    else if (m.t === 'clear') { R.boards[m.page] = []; paintBoard(); }
    else if (m.t === 'page') { R.page = m.page; while (R.boards.length < m.count) R.boards.push([]); paintBoard(); }
    else if (m.t === 'view') { if (m.view !== 'slide') R.slide = null; setView(m.view); }
    else if (m.t === 'slide') showSlide(m.slide);
    else if (m.t === 'chat') addChat(m.m);
    else if (m.t === 'poll') { R.poll = m.poll; if (R.side !== 'poll' && !m.poll.closed && m.poll.votes[R.me.sid] == null) { R.side = 'poll'; toast('نظرسنجی تازه'); } renderSide(); }
    else if (m.t === 'perm') { R.canWrite = m.canWrite; setPerm(); toast(m.canWrite ? 'معلم اجازهٔ نوشتن روی تخته را داد.' : 'نوشتن روی تخته بسته شد.'); }
    else if (m.t === 'offer') { R.pc?.close(); const pc = R.pc = new RTCPeerConnection();
      pc.ontrack = e => { R.remote = e.streams[0]; const v = $r('.lv-video'); v.srcObject = R.remote; v.muted = false; v.play?.().catch(() => { v.muted = true; v.play?.(); }); if (m.kind === 'screen') setView('video'); pip(); };
      pc.onicecandidate = e => e.candidate && send({ t: 'ice', from: R.me.key, c: e.candidate.toJSON() });
      await pc.setRemoteDescription(m.sdp); await pc.setLocalDescription(await pc.createAnswer()); send({ t: 'answer', from: R.me.key, sdp: pc.localDescription.toJSON() }); }
    else if (m.t === 'ice') R.pc?.addIceCandidate(m.c).catch(() => {});
    else if (m.t === 'nomedia') { R.pc?.close(); R.pc = null; R.remote = null; if (R.view === 'video') setView('board'); pip(); }
    else if (m.t === 'host-away') { R.waiting = true; $r('.lv-wait').hidden = false; $r('.lv-wait b').textContent = 'معلم موقتاً از کلاس بیرون رفت…'; }
    else if (m.t === 'end') { const o = R.o; leave(false); o.render(); modal(`<h2>کلاس تمام شد</h2><p>معلم کلاس «${esc(m.title)}» را به پایان رساند. ممنون که آمدی!</p><div class="row" style="margin-top:14px"><button class="btn primary" data-close>باشه</button></div>`); }
  }
  function undoBy(by, page, remote) {
    const l = R.boards[page] || []; for (let i = l.length - 1; i >= 0; i--) if (l[i].by === by) { l.splice(i, 1); break; }
    if (page === R.page) paintBoard(); if (R.host) R.o.save(); if (!remote && R.host) send({ t: 'undo', by, page });
  }
  function setPerm() {
    const bt = $r('.lv-bt'); if (!R.host && bt) bt.classList.toggle('ro', !R.canWrite);
    const b = $r('[data-lv="perm"]'); if (b) { b.classList.toggle('on', R.canWrite); b.setAttribute('aria-pressed', String(R.canWrite)); b.innerHTML = R.canWrite ? IC.unlock : IC.lock; }
  }

  /* ---- clicks ---- */
  async function onClick(e) {
    const t = e.target.closest('[data-tool]'); if (t) return setTool(t.dataset.tool);
    const col = e.target.closest('[data-color]'); if (col) { R.color = col.dataset.color; document.querySelectorAll('#lv-room .lv-color').forEach(b => b.classList.toggle('on', b === col)); if (R.tool === 'eraser') setTool('pen'); return; }
    const sd = e.target.closest('[data-side]'); if (sd) { R.side = sd.dataset.side; return renderSide(); }
    const b = e.target.closest('[data-lv]'); if (!b) return;
    const k = b.dataset.lv;
    if (k === 'mic') toggleMic(); else if (k === 'cam') toggleCam(); else if (k === 'screen') toggleScreen(); else if (k === 'rec') toggleRec(); else if (k === 'slide') slidePick();
    else if (k === 'v-board') { setView('board'); send({ t: 'view', view: 'board' }); }
    else if (k === 'undo') undoBy(R.me.key, R.page, !R.host) || (!R.host && send({ t: 'undo', by: R.me.key, page: R.page }));
    else if (k === 'clear') { if (!(R.boards[R.page] || []).length) return; if (!await UI.ask('پاک کردن تخته', 'همهٔ نوشته‌های این صفحه پاک شود؟', 'پاک کن')) return; R.boards[R.page] = []; paintBoard(); R.o.save(); send({ t: 'clear', page: R.page }); }
    else if (k === 'pg-add') { R.boards.push([]); R.page = R.boards.length - 1; paintBoard(); R.o.save(); send({ t: 'page', page: R.page, count: R.boards.length }); }
    else if (k === 'pg-prev' || k === 'pg-next') { const n = R.page + (k === 'pg-next' ? 1 : -1); if (n < 0 || n >= R.boards.length) return; R.page = n; paintBoard(); send({ t: 'page', page: n, count: R.boards.length }); }
    else if (k === 'perm') { R.canWrite = !R.canWrite; setPerm(); send({ t: 'perm', canWrite: R.canWrite }); toast(R.canWrite ? 'دانش‌آموزان می‌توانند روی تخته بنویسند.' : 'نوشتن دانش‌آموزان بسته شد.'); }
    else if (k === 'hand') { const up = b.getAttribute('aria-pressed') !== 'true'; btn('hand', IC.hand, up); send({ t: 'hand', from: R.me.key, name: R.me.name, up }); toast(up ? 'دستت بالا رفت؛ معلم می‌بیند.' : 'دستت پایین آمد.'); }
    else if (k === 'hand-down') { R.hands.delete(b.dataset.key); send({ t: 'hands', keys: [...R.hands.keys()] }); renderSide(); }
    else if (k === 'vote') { const i = +b.dataset.i; R.poll.votes[R.me.sid] = i; send({ t: 'vote', sid: R.me.sid, i }); renderSide(); }
    else if (k === 'poll-close') { R.poll.closed = true; R.o.save(); send({ t: 'poll', poll: R.poll }); renderSide(); }
    else if (k === 'leave') leave(true);
    else if (k === 'end') { if (!await UI.ask('پایان کلاس', 'کلاس برای همه بسته شود؟ حضور، گفت‌وگو و تخته در گزارش جلسه می‌ماند.', 'پایان کلاس')) return; end(); }
  }

  function end() {
    const { x, o } = R;
    [...R.people.keys()].forEach(depart);
    Object.values(x.att).forEach(a => { delete a.since; });
    x.status = 'done'; x.endedAt = nowIso(); x.boards = R.boards; o.save();
    send({ t: 'end', title: x.title });
    leave(false); o.render(); toast(`کلاس تمام شد · ${fa(present(x))} نفر حاضر بودند.`);
  }
  function leave(announce) {
    if (!R) return;
    if (R.rec?.state === 'recording') R.rec.stop();
    if (announce) unload();
    [R.cam, R.mic, R.screen].forEach(s => s?.getTracks().forEach(t => t.stop()));
    R.peers.forEach(p => p.pc?.close()); R.pc?.close();
    clearInterval(R.tickT); R.ro?.disconnect(); R.chan.close(); if (R.slideUrl) URL.revokeObjectURL(R.slideUrl);
    removeEventListener('beforeunload', unload);
    document.getElementById('lv-room')?.remove(); document.body.classList.remove('lv-open');
    const o = R.o; R = null; if (announce) o.render();
  }

  /* ======================= course page actions ======================= */
  function act(name, b, c, o) {
    if (name === 'lv-new') return sessionModal(c, o);
    if (name === 'lv-edit') return sessionModal(c, o, sessOf(c, b.dataset.id));
    if (name === 'lv-report') return report(c, o, sessOf(c, b.dataset.id));
    if (name === 'lv-del') { const x = sessOf(c, b.dataset.id);
      return UI.ask('حذف جلسه', `جلسهٔ «${x.title}» حذف شود؟`, 'حذف کن').then(ok => { if (!ok) return; live(c).sessions = live(c).sessions.filter(y => y.id !== x.id); o.save(); o.render(); }); }
    if (name === 'lv-now') { const x = { id: D.uid('lv'), title: `کلاس ${o.sub}`, date: today(), from: hm(), to: '', cls: null, status: 'planned', att: {}, chat: [], polls: [], boards: [[]], recs: [] };
      live(c).sessions.push(x); o.save(); return open(c, o, x, null); }
    if (name === 'lv-join') { const x = sessOf(c, b.dataset.id); return open(c, o, x, o.as()); }
  }

  return { card, tab, act, active: () => !!R };
})();
