// «نظامت»: the ناظم's tools, also shown to the principal and the counsellor.
//   nzm    — نظامت امروز: the clock and the next bell, what is happening in each space right now, today's bells.
//   bells  — زنگ مدرسه: the school's bell app (Desktop\New folder\school-bell-source) moved into the site: bell programmes
//            (رسمی / متوسطه اول / متوسطه دوم), each bell's time, days, level, sound and length, the «ربنا» after chosen bells,
//            days off, a log of every ring, and a full-screen clock for the office monitor.
//            Sounds are the app's own (bell-audio.js). Only the computer marked «این دستگاه زنگ را پخش می‌کند» rings, so the
//            principal's or a counsellor's browser never rings by itself.
//   spaces — برنامهٔ فضاها: who uses the workshop, prayer hall, yard and hall in each bell (from «برنامه-فضاهای-مهرهشتم.pdf»).
// Data (school-wide, org()): o.bell = { on, active, profiles: [{ id, name, items: [bell] }], rabbana: { on, after, delay }, off: [iso], logs },
//   bell = { id, time 'HH:MM', title, level m1|m2|both, sound sound1|sound2|seq|rabbana, dur, on, days [0=شنبه..6=جمعه] };
//   o.spaces = [{ id, name, tone, cells: [{ id, day 0..4, slot 0..7, span, grade, title, note }] }].
const Nazem = ctx => {
  const { esc, fa, modal, close, toast } = UI;
  const { org, save, render, empty } = ctx;
  const can = () => ['nazem', 'principal', 'exec'].includes(ctx.role()) && !ctx.readOnly();
  const state = { tab: 'today', prof: '', sp: '' };
  const done = msg => { save(); close(); render(); if (msg) toast(msg); };
  const uid = p => p + Math.random().toString(36).slice(2, 9);
  const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const pd = n => String(n).padStart(2, '0');
  const dayOf = dt => (dt.getDay() + 1) % 7;
  const isoOf = dt => `${dt.getFullYear()}-${pd(dt.getMonth() + 1)}-${pd(dt.getDate())}`;
  const secs = hm => { const [h, m] = hm.split(':').map(Number); return h * 3600 + m * 60; };
  const nowSecs = dt => dt.getHours() * 3600 + dt.getMinutes() * 60 + dt.getSeconds();
  const fT = s => String(s).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const clockText = dt => fT(`${pd(dt.getHours())}:${pd(dt.getMinutes())}:${pd(dt.getSeconds())}`);
  const jDate = dt => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dt); } catch (e) { return DAYS[dayOf(dt)]; } };
  const left = s => s >= 3600 ? `${fa(Math.floor(s / 3600))} ساعت و ${fa(Math.floor(s % 3600 / 60))} دقیقه` : s >= 60 ? `${fa(Math.floor(s / 60))} دقیقه و ${fa(s % 60)} ثانیه` : `${fa(s)} ثانیه`;
  const SV = p => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    bell: SV('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    stop: SV('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    screen: SV('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    plus: SV('<path d="M12 5v14M5 12h14"/>'),
    print: SV('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    pin: SV('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  };

  /* ---------------- bell data ---------------- */
  const LEVEL = { m1: 'متوسطه اول', m2: 'متوسطه دوم', both: 'هر دو دوره' };
  const SOUND = { sound1: 'آهنگ متوسطه اول', sound2: 'آهنگ متوسطه دوم', seq: 'پشت سر هم: اول، بعد دوم', rabbana: 'صوت ربنا' };
  const WEEK = [0, 1, 2, 3, 4];
  const mk = (time, title, level, sound, dur = 5, note = '') => ({ id: uid('b'), time, title, level, sound, dur, on: true, days: WEEK.slice(), note });
  // The app's exact times (src/data/defaultSchedules.ts).
  const M2 = ['07:30', '08:25', '09:45', '09:58', '11:00', '11:13', '12:15', '13:00', '13:20', '13:25', '14:20', '14:33'];
  const M1 = ['07:43', '08:30', '09:30', '09:43', '10:30', '10:43', '11:30', '11:50', '12:43', '13:30', '13:43', '14:30', '14:43'];
  const SHARED = [['07:15', 'صبحگاه و ورود'], ['07:25', 'صف صبحگاه'], ['08:43', 'زنگ تفریح ۸:۴۳'], ['15:30', 'پایان شیفت و خروج']];
  const byTime = a => a.sort((x, y) => x.time.localeCompare(y.time));
  function seedBell() {
    const m1 = t => mk(t, 'زنگ متوسطه اول', 'm1', 'sound1', 5, t === '11:50' ? 'ناهار و نماز' : '');
    const m2 = t => mk(t, 'زنگ متوسطه دوم', 'm2', 'sound2');
    const seq = (t, title) => mk(t, title, 'both', 'seq', 10);
    return {
      on: true, active: 'regular',
      profiles: [
        { id: 'regular', name: 'برنامهٔ رسمی مدرسه (متوسطه اول و دوم)', items: byTime([...SHARED.map(([t, l]) => seq(t, l)), ...M1.map(m1), ...M2.map(m2)]) },
        { id: 'm2', name: 'فقط متوسطه دوم', items: byTime([...M2.map(m2), seq('08:43', 'زنگ ۸:۴۳ (اول متوسطه اول، بعد دوم)')]) },
        { id: 'm1', name: 'فقط متوسطه اول', items: byTime([...M1.map(m1), seq('08:43', 'زنگ ۸:۴۳ (اول متوسطه اول، بعد دوم)')]) },
      ],
      rabbana: { on: true, after: ['12:15', '13:00'], delay: 10 },
      off: [], logs: [],
    };
  }
  const B = () => { const o = org(); return (o.bell = o.bell || seedBell()); };
  const active = () => B().profiles.find(p => p.id === B().active) || B().profiles[0];
  const offToday = (dt = new Date()) => B().off.includes(isoOf(dt));
  const todays = (dt = new Date()) => active().items.filter(b => b.on && b.days.includes(dayOf(dt))).sort((a, b) => a.time.localeCompare(b.time));
  const nextBell = (dt = new Date()) => { if (!B().on || offToday(dt)) return null; const n = nowSecs(dt); return todays(dt).find(b => secs(b.time) > n) || null; };

  /* ---------------- the ringing: this computer only ---------------- */
  const DEV = 'bell-device';
  const device = () => { try { return localStorage.getItem(DEV) === (ctx.school?.().id || 'mehr8'); } catch (e) { return false; } };
  const setDevice = on => { try { if (on) localStorage.setItem(DEV, ctx.school?.().id || 'mehr8'); else localStorage.removeItem(DEV); } catch (e) { /* blocked */ } };
  const CATCH_UP = 30; // a bell checked late (a sleeping tab) still rings up to 30 seconds after its time
  const fired = new Set(JSON.parse(sessionStorage.getItem('bell-fired') || '[]'));
  const claim = key => { if (fired.has(key)) return false; fired.add(key); try { sessionStorage.setItem('bell-fired', JSON.stringify([...fired].slice(-80))); } catch (e) { /* blocked */ } return true; };
  let ringing = '';
  function ring(title, level, sound, dur, how) {
    BellAudio.play(sound, dur); ringing = title; // play() first: its stop() clears the bar's title
    document.querySelector('#bell-bar b')?.replaceChildren(title);
    const b = B(), dt = new Date();
    b.logs.unshift({ at: `${isoOf(dt)} ${pd(dt.getHours())}:${pd(dt.getMinutes())}:${pd(dt.getSeconds())}`, title, level, sound, how });
    b.logs.length = Math.min(b.logs.length, 300); save();
  }
  function check() {
    if (!device()) return;
    const b = B(), dt = new Date(), iso = isoOf(dt), n = nowSecs(dt);
    if (!b.on || offToday(dt)) return;
    const due = todays(dt).find(x => { const df = n - secs(x.time); return df >= 0 && df < CATCH_UP && !fired.has(`${iso}|${x.time}`); });
    if (due && claim(`${iso}|${due.time}`)) ring(due.title, due.level, due.sound, due.dur, 'خودکار');
    if (b.rabbana.on) for (const t of b.rabbana.after) {
      const df = n - secs(t) - b.rabbana.delay;
      if (df >= 0 && df < CATCH_UP && claim(`${iso}|rabbana|${t}`)) { ring('صوت ربنا', 'both', 'rabbana', 175, 'خودکار'); break; }
    }
  }
  // A worker keeps the one-second tick going when the tab is in the background (Chrome slows plain timers there).
  function ticker(fn) {
    try { const url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 1000);'], { type: 'text/javascript' })); new Worker(url).onmessage = fn; }
    catch (e) { setInterval(fn, 1000); }
  }

  // The bar at the bottom while a bell plays, on every page, with a stop button.
  function bar(on, type, sec) {
    let el = document.getElementById('bell-bar');
    if (!on) { if (el) el.remove(); ringing = ''; return; }
    if (!el) { el = document.createElement('div'); el.id = 'bell-bar'; el.className = 'bell-bar'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span class="bb-ic">${I.bell}</span><b>${esc(ringing || SOUND[type] || 'زنگ')}</b><span class="num">${fa(sec)} ثانیه</span><button class="btn sm" type="button" id="bb-stop">${I.stop} توقف</button>`;
    el.querySelector('#bb-stop').onclick = () => BellAudio.stop();
  }
  BellAudio.on(bar);

  // Live parts of the open page (clock, countdown, «now» in the spaces) and the kiosk refresh every second.
  function live() {
    const dt = new Date();
    document.querySelectorAll('[data-nz-clock]').forEach(e => { e.textContent = clockText(dt); });
    const nx = nextBell(dt);
    document.querySelectorAll('[data-nz-next]').forEach(e => { e.textContent = nx ? `${fT(nx.time)} · ${nx.title}` : (offToday(dt) ? 'امروز تعطیل است' : 'زنگ دیگری برای امروز نمانده'); });
    document.querySelectorAll('[data-nz-cd]').forEach(e => { e.textContent = nx ? left(secs(nx.time) - nowSecs(dt)) : '—'; });
    if (dt.getSeconds() === 0) document.querySelectorAll('[data-nz-min]').forEach(e => { e.innerHTML = e.dataset.nzMin === 'now' ? nowList() : todayList(); });
  }
  ticker(() => { check(); live(); });

  /* ---------------- shared bits ---------------- */
  const seg = (cur, list, act) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
  const lvTag = l => `<span class="tag nz-lv nz-${l}">${LEVEL[l]}</span>`;
  function clockCard(big) {
    const dt = new Date(), b = B();
    const status = !b.on ? '<span class="tag bad">زنگ‌ها خاموش است</span>' : offToday(dt) ? '<span class="tag warn">امروز تعطیل است</span>' : `<span class="tag ok">${esc(active().name)}</span>`;
    return `<div class="card nz-clock ${big ? 'big' : ''}">
      <div class="nz-time num" data-nz-clock>${clockText(dt)}</div><div class="muted">${esc(jDate(dt))}</div>
      <div class="nz-next"><span class="small muted">زنگ بعدی</span><b data-nz-next></b><span class="small">مانده: <b class="num" data-nz-cd></b></span></div>
      <div class="row" style="justify-content:center;flex-wrap:wrap">${status}${device() ? `<span class="tag ok">${I.bell} این دستگاه زنگ را پخش می‌کند</span>` : '<span class="tag grey">این دستگاه زنگ را پخش نمی‌کند</span>'}</div>
      ${can() ? `<div class="nz-ring">${[['sound1', 'متوسطه اول'], ['sound2', 'متوسطه دوم'], ['seq', 'پشت سر هم'], ['rabbana', 'ربنا']].map(([k, l]) => `<button class="btn sm" data-act="nz-ring" data-id="${k}">${I.bell} ${l}</button>`).join('')}<button class="btn sm" data-act="nz-stop">${I.stop} توقف</button></div>` : ''}
    </div>`;
  }
  function todayList() {
    const dt = new Date(), n = nowSecs(dt), list = todays(dt), nx = nextBell(dt);
    if (!B().on) return empty('زنگ‌ها خاموش است.');
    if (offToday(dt)) return empty('امروز در فهرست تعطیلی‌هاست؛ زنگی نمی‌خورد.');
    if (!list.length) return empty('امروز زنگی ندارد.');
    return `<ol class="nz-day" tabindex="0" aria-label="زنگ‌های امروز">${list.map(b => { const st = b === nx ? 'next' : secs(b.time) <= n ? 'past' : ''; return `<li class="${st}"><span class="num nz-t">${fT(b.time)}</span><span class="nz-tt">${esc(b.title)}${b.note ? ` <span class="muted small">· ${esc(b.note)}</span>` : ''}</span>${lvTag(b.level)}${st === 'next' ? '<span class="tag">بعدی</span>' : ''}</li>`; }).join('')}</ol>`;
  }

  /* ---------------- spaces ---------------- */
  // Bells of the spaces timetable (the PDF): seven 45-minute bells, the midday break after bell 4, and «بازی» after school.
  const SLOTS = [['زنگ ۱', '07:45', '08:30'], ['زنگ ۲', '08:45', '09:30'], ['زنگ ۳', '09:45', '10:30'], ['زنگ ۴', '10:45', '11:30'],
    ['زنگ ۵', '12:45', '13:30'], ['زنگ ۶', '13:45', '14:30'], ['زنگ ۷', '14:45', '15:30'], ['بازی', '15:35', '15:55']];
  const BRK = { after: 4, from: '11:30', to: '12:45', label: 'بازی | نماز | ناهار' };
  const WHO = { 7: ['هفتم', 'ok'], 8: ['هشتم', 'blue'], 9: ['نهم', 'violet'], 10: ['دهم', 'amber'], 11: ['یازدهم', 'rose'], 12: ['دوازدهم', 'teal'],
    m2: ['متوسطه دوم', 'amber'], m1: ['متوسطه اول', 'teal'], el: ['دبستان', 'slate'], all: ['همهٔ پایه‌ها', 'teal'] };
  const c = (day, slot, grade, title, note = 'الف و ب', span = 1) => ({ id: uid('sc'), day, slot, span, grade: String(grade), title, note });
  const yard = () => [c(0, 4, 'm2', 'ورزش', 'دهم و یازدهم · ۱۳:۲۰ تا ۱۵:۳۰', 3), c(1, 6, 9, 'بازی'), c(1, 7, 10, 'بازی', 'ریاضی و انسانی'),
    c(3, 6, 8, 'بازی'), c(3, 7, 11, 'بازی', 'ریاضی و انسانی'), c(4, 0, 8, 'ورزش', 'الف و ب', 2), c(4, 2, 9, 'ورزش', 'الف و ب', 2), c(4, 4, 7, 'ورزش', 'الف و ب', 2), c(4, 6, 7, 'بازی')];
  const seedSpaces = () => [
    { id: 'workshop', name: 'کارگاه', tone: 'amber', cells: [9, 9, 8, 8, 7, 7].map((g, i) => c(0, i, g, 'هنر تجسمی')) },
    { id: 'prayer', name: 'نمازخانه', tone: 'slate', cells: [...[9, 9, 8, 8, 7, 7].map((g, i) => c(0, i, g, 'تئاتر')), c(0, 6, 9, 'مشاوره'),
      ...[9, 9, 7, 7, 8, 8].map((g, i) => c(2, i, g, 'زبان · سطح A'))] },
    { id: 'yard', name: 'حیاط', tone: 'amber', cells: yard() },
    { id: 'hall', name: 'سالن', tone: 'rose', cells: [...yard(), c(1, 0, 'el', 'ورزش', '۸:۰۰ تا ۱۱:۳۰', 4), c(3, 0, 'el', 'ورزش', '۸:۰۰ تا ۱۱:۳۰', 4)] },
  ];
  const S = () => { const o = org(); return (o.spaces = o.spaces || seedSpaces()); };
  const space = () => S().find(s => s.id === state.sp) || S()[0];
  const covers = (x, slot) => slot >= x.slot && slot < x.slot + (x.span || 1);
  // Weeks: a cell is either for one week only (week: <Saturday>) or from a week on (from, until: Saturdays; until excluded),
  // and a lasting cell can be skipped in single weeks (skip: [Saturday]). Every booking is shared: whoever opens the
  // page sees the same cells, and a space or a grade can never be booked twice for the same bell.
  const thisWeek = () => SchoolData.weekStart(SchoolData.today());
  const curWs = () => state.wk || thisWeek();
  const liveIn = (x, ws) => x.week ? x.week === ws : (!x.from || x.from <= ws) && (!x.until || ws < x.until) && !(x.skip || []).includes(ws);
  const cellAt = (sp, day, slot, ws = curWs()) => sp.cells.find(x => x.day === day && covers(x, slot) && liveIn(x, ws));
  const me = () => { const u = Auth.user(); return { id: u?.id || ctx.actor(), name: u && !u.owner ? `${u.salute ? u.salute + ' ' : ''}${u.name}` : (NAV[ctx.actor()]?.name || '') }; };
  const ADMIN = ['nazem', 'principal', 'exec'];
  // Who may book: the ناظم, principal and executive deputy anything; a guidance teacher for their own grade; a teacher any grade.
  const canBook = () => !ctx.readOnly() && (ADMIN.includes(ctx.role()) || ['counselor', 'teacher'].includes(ctx.role()));
  const canEditCell = x => canBook() && (ADMIN.includes(ctx.role()) || x.by === me().id);
  const bookGrades = () => ctx.role() === 'counselor' ? [String(ctx.grade())] : ADMIN.includes(ctx.role()) ? Object.keys(WHO) : Object.keys(WHO).filter(k => /^\d+$/.test(k));
  const wkLabel = ws => `${JDate.format(ws, false)} تا ${JDate.format(SchoolData.shift(4, ws), false)}`;
  const logSpace = text => { const o = org(); o.spaceLog = o.spaceLog || []; o.spaceLog.unshift({ id: uid('sl'), at: new Date().toISOString(), by: me().id, byName: me().name, text }); o.spaceLog.length = Math.min(o.spaceLog.length, 200); };
  const slotNow = dt => { const n = nowSecs(dt); const i = SLOTS.findIndex(([, a, b]) => n >= secs(a) && n < secs(b)); if (i >= 0) return i; if (n >= secs(BRK.from) && n < secs(BRK.to)) return 'break'; return -1; };
  const who = g => WHO[g] || [g, 'slate'];
  const chip = x => `<span class="sp-g t-${who(x.grade)[1]}">${esc(who(x.grade)[0])}</span><b>${esc(x.title)}</b>`;
  function nowList() {
    const dt = new Date(), day = dayOf(dt), n = nowSecs(dt), sl = slotNow(dt);
    if (day > 4) return empty('امروز روز درسی نیست.');
    return `<ul class="sp-now">${S().map(sp => {
      const cur = typeof sl === 'number' && sl >= 0 ? cellAt(sp, day, sl, thisWeek()) : null;
      const nxt = SLOTS.map((s, i) => i).filter(i => secs(SLOTS[i][1]) > n).map(i => [i, cellAt(sp, day, i, thisWeek())]).find(([, x]) => x);
      return `<li><span class="sp-n tone-${sp.tone}">${I.pin}${esc(sp.name)}</span>
        <span>${sl === 'break' ? `<span class="muted">${BRK.label}</span>` : cur ? `الان: ${chip(cur)}` : '<span class="muted">الان آزاد است</span>'}</span>
        <span class="small muted">${nxt ? `بعد، ${esc(SLOTS[nxt[0]][0])} (${fT(SLOTS[nxt[0]][1])}): ${esc(who(nxt[1].grade)[0])} · ${esc(nxt[1].title)}` : 'امروز دیگر برنامه‌ای ندارد'}</span></li>`;
    }).join('')}</ul>`;
  }
  // The same grade booked in two spaces at once.
  function clashes() {
    const out = [];
    for (let day = 0; day < 5; day++) for (let sl = 0; sl < SLOTS.length; sl++) {
      const seen = {};
      S().forEach(sp => { const x = cellAt(sp, day, sl); if (x && /^\d+$/.test(x.grade)) (seen[x.grade] = seen[x.grade] || []).push(sp.name); });
      Object.entries(seen).forEach(([g, sps]) => { if (sps.length > 1) out.push(`${DAYS[day]}، ${SLOTS[sl][0]}: پایهٔ ${who(g)[0]} هم‌زمان در ${sps.join(' و ')}`); });
    }
    return [...new Set(out)];
  }
  function grid(sp) {
    const dt = new Date(), today = curWs() === thisWeek() ? dayOf(dt) : -1, sl = slotNow(dt);
    const head = SLOTS.map(([l, a, b], i) => `${i === BRK.after ? `<th class="sp-brk"><b>بین زنگ</b><span class="num">${fT(BRK.from)} تا ${fT(BRK.to)}</span></th>` : ''}<th class="${i === sl ? 'now' : ''}"><b>${l}</b><span class="num">${fT(a)} تا ${fT(b)}</span></th>`).join('');
    const rows = DAYS.slice(0, 5).map((d, day) => {
      let tds = '';
      for (let i = 0; i < SLOTS.length; i++) {
        if (i === BRK.after) tds += day === 0 ? `<td class="sp-brk" rowspan="5"><span>${BRK.label}</span></td>` : '';
        const x = cellAt(sp, day, i);
        if (x && x.slot !== i) continue;
        if (x) {
          const span = Math.min(x.span || 1, (x.slot < BRK.after ? BRK.after : SLOTS.length) - x.slot);
          const now = day === today && typeof sl === 'number' && covers(x, sl);
          const inner = `${chip(x)}${x.note ? `<span class="small">${esc(x.note)}</span>` : ''}${x.week ? '<span class="sp-wk">فقط این هفته</span>' : ''}${x.byName && !ADMIN.includes(x.byRole) ? `<span class="sp-by">${esc(x.byName)}</span>` : ''}`;
          tds += `<td colspan="${span}" class="sp-c t-${who(x.grade)[1]} ${now ? 'now' : ''} ${x.week ? 'wk' : ''}">${canEditCell(x) ? `<button type="button" data-act="nz-cell" data-id="${x.id}" aria-label="ویرایش: ${esc(d)}، ${esc(SLOTS[i][0])}، ${esc(who(x.grade)[0])} ${esc(x.title)}">${inner}</button>` : `<div>${inner}</div>`}</td>`;
        } else tds += `<td class="sp-e">${canBook() ? `<button type="button" data-act="nz-cell-new" data-day="${day}" data-slot="${i}" aria-label="گرفتن ${esc(sp.name)}: ${esc(d)}، ${esc(SLOTS[i][0])}">${I.plus}</button>` : ''}</td>`;
      }
      return `<tr class="${day === today ? 'today' : ''}"><th scope="row">${d}</th>${tds}</tr>`;
    }).join('');
    return `<div class="table-wrap sp-wrap"><table class="sp-grid no-cards"><caption class="sr-only">برنامهٔ هفتگی ${esc(sp.name)}</caption><thead><tr><th>روز / زنگ</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  // The scope question every schedule asks once per change: this week only, or from this week on.
  const scopeField = (def, ws) => `<fieldset class="scope"><legend class="small muted">این تغییر برای کی است؟</legend>
      <label class="scope-opt"><input type="radio" name="scope" value="week" ${def === 'week' ? 'checked' : ''}><span><b>فقط همین هفته</b><span class="muted small">هفتهٔ ${esc(wkLabel(ws))}؛ هفتهٔ بعد برنامهٔ همیشگی برمی‌گردد.</span></span></label>
      <label class="scope-opt"><input type="radio" name="scope" value="on" ${def === 'on' ? 'checked' : ''}><span><b>از این هفته به بعد</b><span class="muted small">برنامهٔ همیشگی از هفتهٔ ${esc(wkLabel(ws))} عوض می‌شود.</span></span></label></fieldset>`;
  function cellModal(x, day, slot) {
    const sp = space(), fresh = !x, ws = curWs(), grades = bookGrades();
    x = x || { day, slot, span: 1, grade: grades.includes('9') ? '9' : grades[0], title: '', note: 'الف و ب' };
    const def = x.week ? 'week' : ADMIN.includes(ctx.role()) ? 'on' : 'week';
    modal(`<h2>${fresh ? `گرفتن ${esc(sp.name)}` : 'ویرایش برنامه'} · ${esc(sp.name)}</h2>
      ${x.byName && !fresh ? `<p class="muted small" style="margin:0">ثبت‌شده به دست ${esc(x.byName)}</p>` : ''}
      <div class="grid g2" style="gap:0 12px">
        <label class="field"><span>روز</span><select class="input" id="sc-d">${DAYS.slice(0, 5).map((d, i) => `<option value="${i}" ${i === x.day ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field"><span>از زنگ</span><select class="input" id="sc-s">${SLOTS.map(([l], i) => `<option value="${i}" ${i === x.slot ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>چند زنگ پشت سر هم</span><input class="input num" id="sc-n" type="number" min="1" max="7" value="${x.span || 1}"></label>
        <label class="field"><span>پایه یا گروه</span><select class="input" id="sc-g">${grades.map(k => `<option value="${k}" ${k === x.grade ? 'selected' : ''}>${WHO[k][0]}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>برنامه</span><input class="input" id="sc-t" value="${esc(x.title)}" placeholder="مثلاً بازی، ورزش، تئاتر، هنر تجسمی"></label>
      <label class="field"><span>توضیح (کلاس‌ها یا ساعت دقیق)</span><input class="input" id="sc-x" value="${esc(x.note || '')}" placeholder="مثلاً الف و ب"></label>
      ${scopeField(def, ws)}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button>${fresh ? '' : '<button class="btn danger" id="del">حذف</button>'}<button class="btn" data-close>انصراف</button></div>`, root => {
      const v = id => root.querySelector('#' + id).value.trim(), scope = () => root.querySelector('input[name=scope]:checked').value;
      // Does a booking clash with anything in the weeks it covers? Checked for the chosen week, and for «on» also for the next 12 weeks.
      const clash = (n, weeks) => {
        for (const w of weeks) {
          const busy = sp.cells.find(o => o !== x && o.day === n.day && liveIn(o, w) && [...Array(n.span)].some((_, k) => covers(o, n.slot + k)));
          if (busy) return [`#sc-s`, `${sp.name} در ${DAYS[n.day]}، ${SLOTS[n.slot][0]}${w !== ws ? ` (هفتهٔ ${wkLabel(w)})` : ''} با «${who(busy.grade)[0]} · ${busy.title}» پر است${busy.byName ? ` (${busy.byName})` : ''}.`];
          if (/^\d+$/.test(n.grade)) for (const o of S()) if (o !== sp) {
            const twice = o.cells.find(c => c.grade === n.grade && c.day === n.day && liveIn(c, w) && [...Array(n.span)].some((_, k) => covers(c, n.slot + k)));
            if (twice) return ['#sc-g', `پایهٔ ${who(n.grade)[0]} در همین زمان در ${o.name} است («${twice.title}»)؛ یک پایه هم‌زمان دو جا نمی‌رود.`];
          }
        }
        return null;
      };
      root.querySelector('#save').onclick = () => {
        const t = v('sc-t'); if (!t) return UI.invalid('#sc-t', 'برنامه را بنویسید.');
        const n = { day: +v('sc-d'), slot: +v('sc-s'), span: Math.max(1, Math.min(7, +v('sc-n') || 1)), grade: v('sc-g'), title: t, note: v('sc-x') };
        const sc = scope(), weeks = sc === 'week' ? [ws] : Array.from({ length: 12 }, (_, i) => SchoolData.shift(i * 7, ws));
        const bad = clash(n, weeks); if (bad) return UI.invalid(bad[0], bad[1]);
        const stamp = { by: x.by || me().id, byName: x.byName || me().name, byRole: x.byRole || ctx.role() };
        if (fresh) sp.cells.push({ id: uid('sc'), ...n, ...stamp, ...(sc === 'week' ? { week: ws } : { from: ws }) });
        else if (x.week) { Object.assign(x, n); if (sc === 'on') { delete x.week; x.from = ws; } }
        else if (sc === 'week') { x.skip = [...new Set([...(x.skip || []), ws])]; sp.cells.push({ id: uid('sc'), ...n, ...stamp, week: ws }); }
        else if (x.from === ws) Object.assign(x, n);
        else { x.until = ws; sp.cells.push({ id: uid('sc'), ...n, ...stamp, from: ws, skip: (x.skip || []).filter(w => w > ws) }); }
        logSpace(`${sp.name}، ${DAYS[n.day]} ${SLOTS[n.slot][0]}: ${who(n.grade)[0]} · ${t} (${sc === 'week' ? 'فقط هفتهٔ ' + wkLabel(ws) : 'از هفتهٔ ' + wkLabel(ws) + ' به بعد'})`);
        done(sc === 'week' ? 'برای همین هفته ثبت شد؛ همه می‌بینند.' : 'از این هفته به بعد ثبت شد؛ همه می‌بینند.');
      };
      root.querySelector('#del')?.addEventListener('click', () => {
        const sc = scope();
        if (x.week) sp.cells.splice(sp.cells.indexOf(x), 1);
        else if (sc === 'week') x.skip = [...new Set([...(x.skip || []), ws])];
        else if (x.from === ws) sp.cells.splice(sp.cells.indexOf(x), 1);
        else x.until = ws;
        logSpace(`${sp.name}، ${DAYS[x.day]} ${SLOTS[x.slot][0]}: «${x.title}» برداشته شد (${sc === 'week' && !x.week ? 'فقط هفتهٔ ' + wkLabel(ws) : 'از هفتهٔ ' + wkLabel(ws)})`);
        done('حذف شد.');
      });
    });
  }
  function spaceModal(sp) {
    modal(`<h2>${sp ? 'تغییر نام فضا' : 'فضای تازه'}</h2><label class="field"><span>نام فضا</span><input class="input" id="sp-n" value="${esc(sp?.name || '')}" placeholder="مثلاً آزمایشگاه"></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button>${sp ? '<button class="btn danger" id="del">حذف این فضا</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const n = root.querySelector('#sp-n').value.trim(); if (!n) return UI.invalid('#sp-n', 'نام فضا را بنویسید.');
        if (sp) sp.name = n; else { const s = { id: uid('sp'), name: n, tone: 'teal', cells: [] }; S().push(s); state.sp = s.id; }
        done('ذخیره شد.');
      };
      root.querySelector('#del')?.addEventListener('click', async () => {
        close(); if (!await UI.ask('حذف فضا', `«${sp.name}» با همهٔ برنامه‌هایش حذف شود؟`, 'حذف کن')) return;
        S().splice(S().indexOf(sp), 1); state.sp = ''; save(); render(); toast('حذف شد.');
      });
    });
  }
  function spaces() {
    const sp = space(), cl = clashes(), ws = curWs(), log = (org().spaceLog || []).slice(0, 6);
    const wkNav = `<div class="sp-wknav" role="group" aria-label="هفته"><button type="button" class="btn sm" data-act="nz-wk" data-id="-7" aria-label="هفتهٔ قبل">›</button>
      <span class="sp-wkl"><b>${ws === thisWeek() ? 'این هفته' : ws > thisWeek() ? 'هفته‌های آینده' : 'هفتهٔ گذشته'}</b><span class="small muted num">${esc(wkLabel(ws))}</span></span>
      <button type="button" class="btn sm" data-act="nz-wk" data-id="7" aria-label="هفتهٔ بعد">‹</button>${ws !== thisWeek() ? '<button type="button" class="btn sm" data-act="nz-wk" data-id="0">برگشت به این هفته</button>' : ''}</div>`;
    return `<div class="card"><h2>فضاها، همین حالا</h2><div data-nz-min="now">${nowList()}</div></div>
      ${cl.length ? `<details class="card nz-warn"><summary><b>${fa(cl.length)} جا یک پایه هم‌زمان در دو فضاست</b> <span class="small">اگر کلاس‌ها نیم شده‌اند یا یکی از دو فضا جایگزین دیگری است، درست است؛ وگرنه یکی را جابه‌جا کنید.</span></summary><ul>${cl.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>` : ''}
      <div class="card"><div class="spread" style="flex-wrap:wrap;gap:8px">${seg(sp.id, S().map(s => [s.id, s.name]), 'nz-sp')}
        <div class="row">${can() ? `<button class="btn sm" data-act="nz-sp-edit">تغییر نام</button><button class="btn sm" data-act="nz-sp-new">${I.plus} فضای تازه</button>` : ''}<button class="btn sm" data-act="nz-print">${I.print} چاپ</button></div></div>
        <div class="spread" style="margin-top:12px;flex-wrap:wrap;gap:8px"><h2 style="margin:0">برنامهٔ هفتگی ${esc(sp.name)}</h2>${wkNav}</div>${grid(sp)}
        <div class="sp-legend">${[...new Set(sp.cells.filter(x => liveIn(x, ws)).map(x => x.grade))].map(g => `<span class="sp-g t-${who(g)[1]}">${esc(who(g)[0])}</span>`).join('')}<span class="sp-g sp-wk-l">فقط این هفته</span>
        ${canBook() ? `<span class="small muted">یک زنگ دو بار گرفته نمی‌شود.</span>` : ''}</div></div>
      ${log.length ? `<div class="card"><h2>تغییرهای تازه</h2><ul class="nzd-list">${log.map(l => `<li><span class="small muted num">${esc(UI.fdate(isoOf(new Date(l.at))))} · ${fT(`${pd(new Date(l.at).getHours())}:${pd(new Date(l.at).getMinutes())}`)}</span><b class="small">${esc(l.byName)}</b><span class="small">${esc(l.text)}</span></li>`).join('')}</ul></div>` : ''}`;
  }

  // Print: one A4 landscape page per space, in colour or in black and white, for the week on screen.
  function printModal() {
    const sp = space();
    modal(`<h2>چاپ برنامهٔ فضاها</h2><p class="muted small" style="margin:0">هفتهٔ ${esc(wkLabel(curWs()))} · هر فضا یک برگ A4 افقی</p>
      <fieldset class="scope"><legend class="small muted">کدام فضاها؟</legend><div class="chips">${S().map(s => `<label class="chip"><input type="checkbox" value="${s.id}" ${s.id === sp.id ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}</div>
        <button type="button" class="linkbtn small" id="pr-all">همهٔ فضاها</button></fieldset>
      <fieldset class="scope"><legend class="small muted">رنگ</legend>
        <label class="scope-opt"><input type="radio" name="pr-c" value="color" checked><span><b>رنگی</b><span class="muted small">هر پایه با رنگ خودش، مثل صفحه.</span></span></label>
        <label class="scope-opt"><input type="radio" name="pr-c" value="bw"><span><b>سیاه‌سفید</b><span class="muted small">بی‌رنگ و کم‌جوهر؛ پایه‌ها با نام و نقش‌مایه از هم جدا می‌شوند.</span></span></label></fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="go">${I.print} چاپ</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#pr-all').onclick = () => root.querySelectorAll('.chips input').forEach(i => { i.checked = true; });
      root.querySelector('#go').onclick = () => {
        const ids = [...root.querySelectorAll('.chips input:checked')].map(i => i.value);
        if (!ids.length) return UI.invalid(root.querySelector('.chips'), 'دست‌کم یک فضا را انتخاب کنید.');
        const bw = root.querySelector('input[name=pr-c]:checked').value === 'bw';
        close(); printSpaces(S().filter(s => ids.includes(s.id)), bw);
      };
    });
  }
  function printSpaces(list, bw) {
    const ws = curWs(), s = ctx.school(), logo = s.id === 'mehr8' ? 'assets/logo-mehr8.png' : (s.logo || '');
    const head = SLOTS.map(([l, a, b], i) => `${i === BRK.after ? `<th class="brk"><b>بین زنگ</b><span>${fT(BRK.from)} تا ${fT(BRK.to)}</span></th>` : ''}<th class="${i === SLOTS.length - 1 ? 'last' : ''}"><b>${l}</b><span>${fT(a)} تا ${fT(b)}</span></th>`).join('');
    const page = sp => {
      const rows = DAYS.slice(0, 5).map((d, day) => {
        let tds = '';
        for (let i = 0; i < SLOTS.length; i++) {
          if (i === BRK.after) tds += day === 0 ? `<td class="brk" rowspan="5"><span>${BRK.label}</span></td>` : '';
          const x = cellAt(sp, day, i, ws); if (x && x.slot !== i) continue;
          if (!x) { tds += '<td class="e"></td>'; continue; }
          const span = Math.min(x.span || 1, (x.slot < BRK.after ? BRK.after : SLOTS.length) - x.slot), [gl, tone] = who(x.grade);
          tds += `<td colspan="${span}" class="c t-${tone} p-${tone}"><div><span class="g">${esc(gl)}</span><b>${esc(x.title)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}${x.week ? '<i>فقط این هفته</i>' : ''}</div></td>`;
        }
        return `<tr><th class="day">${d}</th>${tds}</tr>`;
      }).join('');
      const gs = [...new Set(sp.cells.filter(x => liveIn(x, ws)).map(x => x.grade))];
      return `<section class="pg"><header>${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><h1>برنامهٔ هفتگی <em>${esc(sp.name)}</em></h1><p>${esc(s.name)} · هفتهٔ ${esc(wkLabel(ws))}</p></div></header>
        <table><thead><tr><th class="corner">روز / زنگ</th>${head}</tr></thead><tbody>${rows}</tbody></table>
        <footer><span class="leg">${gs.map(g => `<span class="t-${who(g)[1]} p-${who(g)[1]}"><i></i>${esc(who(g)[0])}</span>`).join('')}</span><span>چاپ: ${esc(JDate.format(SchoolData.today()))}</span></footer></section>`;
    };
    const css = `@page { size: A4 landscape; margin: 9mm; }
      * { box-sizing: border-box; } body { margin: 0; font-family: Vazirmatn, Tahoma, sans-serif; color: #1c2b2a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pg { page-break-after: always; height: 190mm; display: flex; flex-direction: column; } .pg:last-child { page-break-after: auto; }
      header { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; } header img { height: 58px; } h1 { margin: 0; font-size: 24px; } h1 em { font-style: normal; color: #b45309; } header p { margin: 2px 0 0; color: #5f7173; font-size: 13px; }
      table { width: 100%; flex: 1; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
      th { background: #f6a821; color: #241703; border-radius: 8px; padding: 5px 2px; font-size: 13px; } th b { display: block; font-size: 15px; } th span { font-size: 11px; }
      th.last { background: #c27803; color: #fff; } th.corner { background: none; color: #8a6a2a; font-size: 11px; font-weight: 400; width: 76px; } th.day { font-size: 16px; width: 76px; }
      th.brk b { font-size: 12px; } th.brk span { font-size: 10px; }
      th.brk, td.brk { width: 66px; background: repeating-linear-gradient(45deg, #fff8d6 0 8px, #fffbe9 8px 16px); color: #8a6a2a; } td.brk span { writing-mode: vertical-rl; font-size: 11px; }
      td { border-radius: 8px; text-align: center; vertical-align: middle; font-size: 12px; padding: 3px; }
      td.e { background: #f5f5f4; border: 1px dashed #ddd; }
      td.c div { display: flex; flex-direction: column; align-items: center; gap: 2px; } td.c b { font-size: 15px; } td.c small { font-size: 11px; opacity: .85; } td.c i { font-style: normal; font-size: 10px; border: 1px dashed currentColor; border-radius: 4px; padding: 0 4px; }
      .g { font-size: 10.5px; font-weight: 700; border-radius: 99px; padding: 1px 8px; color: #fff; }
      .t-ok { background: #d3ecd5; color: #1d5b24; border: 1px solid #a9d6ad; } .t-ok .g, .leg .t-ok i { background: #2e7d32; }
      .t-blue { background: #cfe4fb; color: #0d47a1; border: 1px solid #9cc5f2; } .t-blue .g, .leg .t-blue i { background: #1565c0; }
      .t-violet { background: #e9d5f3; color: #4a148c; border: 1px solid #cfa8e3; } .t-violet .g, .leg .t-violet i { background: #6a1b9a; }
      .t-amber { background: #ffe0b2; color: #8a3b00; border: 1px solid #ffc27a; } .t-amber .g, .leg .t-amber i { background: #e65100; }
      .t-rose { background: #f8d0d6; color: #8e1a2b; border: 1px solid #efa3ae; } .t-rose .g, .leg .t-rose i { background: #c62828; }
      .t-teal { background: #cdeee8; color: #0f5f59; border: 1px solid #9fdcd1; } .t-teal .g, .leg .t-teal i { background: #0f766e; }
      .t-slate { background: #e2e8f0; color: #334155; border: 1px solid #c4cdd8; } .t-slate .g, .leg .t-slate i { background: #475569; }
      footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 5px; font-size: 11px; color: #6b7280; }
      .leg { display: flex; flex-wrap: wrap; gap: 4px 12px; } .leg span { background: none !important; border: 0 !important; display: inline-flex; align-items: center; gap: 4px; } .leg i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
      ${bw ? `/* black and white: no fills, black lines; each grade keeps a different pattern so groups stay apart */
      body { color: #000; } h1 em { color: #000; text-decoration: underline; } header p, footer { color: #333; }
      th, th.last { background: #fff !important; color: #000 !important; border: 1.5px solid #000; } th.corner { border: 0; }
      th.brk, td.brk { background: repeating-linear-gradient(45deg, #fff 0 6px, #e6e6e6 6px 7px) !important; color: #000; border: 1px solid #000; }
      td.e { background: #fff; border: 1px dotted #999; }
      td.c { color: #000 !important; border: 1.5px solid #000 !important; background: #fff !important; }
      .g, .leg i { background: #fff !important; color: #000 !important; border: 1.2px solid #000; }
      .p-blue { background-image: repeating-linear-gradient(90deg, transparent 0 7px, #d4d4d4 7px 8px) !important; }
      .p-violet { background-image: radial-gradient(#bdbdbd 1px, transparent 1.2px) !important; background-size: 7px 7px !important; }
      .p-amber { background-image: repeating-linear-gradient(135deg, transparent 0 7px, #d4d4d4 7px 8px) !important; }
      .p-rose { background-image: repeating-linear-gradient(0deg, transparent 0 7px, #d4d4d4 7px 8px) !important; }
      .p-teal { background-image: repeating-linear-gradient(45deg, transparent 0 9px, #e0e0e0 9px 10px), repeating-linear-gradient(135deg, transparent 0 9px, #e0e0e0 9px 10px) !important; }
      .p-slate { background-image: linear-gradient(#ececec, #ececec) !important; }
      td.c div { background: #fff; border-radius: 6px; padding: 2px 6px; }` : ''}`;
    const fr = document.createElement('iframe'); fr.className = 'print-frame'; fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;width:0;height:0;border:0;inset-inline-start:-9999px';
    document.body.appendChild(fr);
    const doc = fr.contentDocument;
    doc.open(); doc.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><base href="${esc(location.href.replace(/[^/]*$/, ''))}"><title>برنامهٔ فضاها</title><style>${css}</style></head><body>${list.map(page).join('')}</body></html>`); doc.close();
    const go = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } finally { setTimeout(() => fr.remove(), 1500); } };
    const imgs = [...doc.images]; Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(go, 150));
  }
  // New and changed space bookings, for the ناظم, the principal, the executive deputy and the guidance teachers.
  const feed = () => {
    if (ctx.readOnly() || !['nazem', 'principal', 'exec', 'counselor'].includes(ctx.actor())) return [];
    const mine = me().id;
    return (org().spaceLog || []).filter(l => l.by !== mine).slice(0, 20).map(l => ({ key: 'sp:' + l.id, type: 'reminder', title: `برنامهٔ فضاها: ${l.byName}`, text: l.text, at: l.at, href: ctx.hrefOf('spaces'), unread: true }));
  };

  /* ---------------- bells page ---------------- */
  function bellModal(b) {
    const fresh = !b; b = b || mk('', '', 'm1', 'sound1');
    modal(`<h2>${fresh ? 'زنگ تازه' : 'ویرایش زنگ'}</h2><p class="muted small" style="margin:0">برنامه: ${esc(prof().name)}</p>
      <div class="grid g2" style="gap:0 12px">
        <label class="field"><span>ساعت</span><input class="input num" id="bl-t" type="time" value="${b.time}"></label>
        <label class="field"><span>عنوان</span><input class="input" id="bl-n" value="${esc(b.title)}" placeholder="مثلاً زنگ متوسطه اول"></label>
        <label class="field"><span>دوره</span><select class="input" id="bl-l">${Object.entries(LEVEL).map(([k, l]) => `<option value="${k}" ${k === b.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>صدا</span><select class="input" id="bl-s">${Object.entries(SOUND).map(([k, l]) => `<option value="${k}" ${k === b.sound ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>مدت (ثانیه)</span><input class="input num" id="bl-d" type="number" min="3" max="60" value="${b.dur}"></label>
        <label class="field"><span>یادداشت</span><input class="input" id="bl-x" value="${esc(b.note || '')}" placeholder="مثلاً ناهار و نماز"></label>
      </div>
      <fieldset class="nz-days"><legend class="small muted">روزها</legend>${DAYS.map((d, i) => `<label class="chip"><input type="checkbox" value="${i}" ${b.days.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" id="try">${I.bell} شنیدن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const v = id => root.querySelector('#' + id).value.trim();
      root.querySelector('#try').onclick = () => BellAudio.play(v('bl-s'), +v('bl-d') || 5);
      root.querySelector('#save').onclick = () => {
        if (!/^\d\d:\d\d$/.test(v('bl-t'))) return UI.invalid('#bl-t', 'ساعت زنگ را بنویسید.');
        const days = [...root.querySelectorAll('.nz-days input:checked')].map(i => +i.value);
        if (!days.length) return UI.invalid(root.querySelector('.nz-days'), 'دست‌کم یک روز را انتخاب کنید.');
        const dup = prof().items.find(o => o !== b && o.time === v('bl-t') && o.days.some(d => days.includes(d)));
        if (dup) return UI.invalid('#bl-t', `در همین ساعت «${dup.title}» هست؛ دو زنگ هم‌زمان پخش نمی‌شوند.`);
        Object.assign(b, { time: v('bl-t'), title: v('bl-n') || `زنگ ${LEVEL[v('bl-l')]}`, level: v('bl-l'), sound: v('bl-s'), dur: Math.max(3, Math.min(60, +v('bl-d') || 5)), note: v('bl-x'), days });
        if (fresh) prof().items.push(b); byTime(prof().items);
        done('زنگ ذخیره شد.');
      };
    });
  }
  const prof = () => B().profiles.find(p => p.id === state.prof) || active();
  function profTab() {
    const p = prof(), b = B(), isAct = p.id === b.active;
    return `<div class="card"><div class="spread" style="flex-wrap:wrap;gap:8px">${seg(p.id, b.profiles.map(x => [x.id, x.id === b.active ? `${x.name} ✓` : x.name]), 'nz-prof')}
      ${can() ? `<div class="row">${isAct ? '<span class="tag ok">برنامهٔ فعال</span>' : '<button class="btn sm primary" data-act="nz-prof-on">فعال کن</button>'}<button class="btn sm" data-act="nz-prof-copy">نسخهٔ دوم</button><button class="btn sm" data-act="nz-prof-name">تغییر نام</button>${b.profiles.length > 1 && !isAct ? '<button class="btn sm danger" data-act="nz-prof-del">حذف</button>' : ''}</div>` : ''}</div>
      <div class="spread" style="margin:12px 0 6px"><h2 style="margin:0">${esc(p.name)} <span class="muted small">· ${fa(p.items.length)} زنگ</span></h2>${can() ? `<button class="btn sm primary" data-act="nz-bell-new">${I.plus} زنگ تازه</button>` : ''}</div>
      <div class="table-wrap"><table><thead><tr><th>ساعت</th><th>عنوان</th><th>دوره</th><th>صدا</th><th>مدت</th><th>روزها</th><th>روشن</th>${can() ? '<th><span class="sr-only">کارها</span></th>' : ''}</tr></thead><tbody>
      ${p.items.map(x => `<tr class="${x.on ? '' : 'muted'}"><td class="num">${fT(x.time)}</td><td>${esc(x.title)}${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</td><td>${lvTag(x.level)}</td><td class="small">${SOUND[x.sound]}</td><td class="num">${fa(x.dur)}</td>
        <td class="small">${x.days.length === 5 && WEEK.every(d => x.days.includes(d)) ? 'شنبه تا چهارشنبه' : x.days.map(d => DAYS[d]).join('، ')}</td>
        <td>${can() ? `<label class="switch"><input type="checkbox" data-nz-on="${x.id}" ${x.on ? 'checked' : ''} aria-label="روشن بودن زنگ ${fT(x.time)}"><span></span></label>` : x.on ? 'بله' : 'خیر'}</td>
        ${can() ? `<td class="nowrap"><button class="btn sm" data-act="nz-try" data-id="${x.id}" aria-label="شنیدن زنگ ${fT(x.time)}">${I.bell}</button> <button class="btn sm" data-act="nz-bell" data-id="${x.id}">ویرایش</button> <button class="btn sm danger" data-act="nz-bell-del" data-id="${x.id}">حذف</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="8">${empty('این برنامه زنگی ندارد.')}</td></tr>`}
      </tbody></table></div></div>`;
  }
  function logTab() {
    const L = B().logs;
    return `<div class="card"><div class="spread"><h2>زنگ‌هایی که خورد</h2>${can() && L.length ? '<button class="btn sm" data-act="nz-log-clear">پاک کردن گزارش</button>' : ''}</div>
      ${L.length ? `<div class="table-wrap"><table><thead><tr><th>زمان</th><th>زنگ</th><th>دوره</th><th>چطور</th></tr></thead><tbody>${L.slice(0, 100).map(l => `<tr><td class="num small">${esc(UI.fdate(l.at.slice(0, 10)))} · ${fT(l.at.slice(11))}</td><td>${esc(l.title)}</td><td>${lvTag(l.level)}</td><td class="small">${esc(l.how)}</td></tr>`).join('')}</tbody></table></div>`
        : empty('هنوز زنگی از این سامانه پخش نشده.')}</div>`;
  }
  function setTab() {
    const b = B(), r = b.rabbana, e = !can() ? 'disabled' : '';
    return `<div class="grid g2">
      <div class="card"><h2>این دستگاه</h2><p class="muted small">زنگ فقط از رایانه‌ای پخش می‌شود که این گزینه رویش روشن است (معمولاً رایانهٔ دفتر که به بلندگو وصل است). صفحه باید روی آن رایانه باز بماند.</p>
        <label class="switch-row"><label class="switch"><input type="checkbox" id="nz-dev" ${device() ? 'checked' : ''} ${can() ? '' : 'disabled'}><span></span></label><span>این دستگاه زنگ را پخش می‌کند</span></label>
        <label class="field"><span>بلندی صدا</span><input type="range" id="nz-vol" min="0" max="100" value="${Math.round((b.volume ?? 0.9) * 100)}" aria-label="بلندی صدا"></label>
        <div class="row"><button class="btn" data-act="nz-ring" data-id="sound1">${I.bell} آزمایش صدا</button><button class="btn" data-act="nz-kiosk">${I.screen} ساعت تمام‌صفحه</button></div>
        ${device() && !BellAudio.unlocked() ? '<p class="nz-hint small">مرورگر صدا را فقط بعد از یک کلیک روی صفحه آزاد می‌کند. بعد از هر بار باز کردن صفحه یک بار جایی را کلیک کنید.</p>' : ''}</div>
      <div class="card"><h2>روشن و خاموش</h2>
        <label class="switch-row"><label class="switch"><input type="checkbox" id="nz-on" ${b.on ? 'checked' : ''} ${e}><span></span></label><span>زنگ‌های خودکار روشن است</span></label>
        <h3 style="margin:14px 0 6px">روزهای تعطیل</h3><p class="muted small" style="margin:0 0 8px">در این روزها هیچ زنگی نمی‌خورد.</p>
        <div class="chips">${b.off.slice().sort().map(d => `<span class="chip">${esc(UI.fdate(d))}${can() ? ` <button class="linkbtn" data-act="nz-off-del" data-id="${d}" aria-label="برداشتن ${esc(UI.fdate(d))}">×</button>` : ''}</span>`).join('') || '<span class="muted small">روز تعطیلی ثبت نشده.</span>'}</div>
        ${can() ? `<div class="row" style="margin-top:8px"><label class="field" style="margin:0"><span class="sr-only">روز تعطیل</span>${JDate.field('nz-off', JDate.todayIso())}</label><button class="btn sm" data-act="nz-off-add">افزودن روز تعطیل</button><button class="btn sm" data-act="nz-off-today">امروز تعطیل است</button></div>` : ''}</div>
      <div class="card"><h2>صوت ربنا</h2><p class="muted small">ربنا چند ثانیه پس از زنگ‌های ظهر کامل پخش می‌شود.</p>
        <label class="switch-row"><label class="switch"><input type="checkbox" id="nz-rb" ${r.on ? 'checked' : ''} ${e}><span></span></label><span>پخش خودکار ربنا</span></label>
        <div class="grid g2" style="gap:0 12px"><label class="field"><span>بعد از زنگ‌های (با ویرگول جدا کنید)</span><input class="input num" id="nz-rb-a" value="${esc(r.after.join('، '))}" ${e}></label>
        <label class="field"><span>چند ثانیه بعد</span><input class="input num" id="nz-rb-d" type="number" min="0" max="120" value="${r.delay}" ${e}></label></div>
        <div class="row">${can() ? '<button class="btn sm primary" data-act="nz-rb-save">ذخیرهٔ ربنا</button>' : ''}<button class="btn sm" data-act="nz-ring" data-id="rabbana">${I.bell} پخش ربنا</button></div></div>
    </div>`;
  }
  function bells() {
    const tabs = [['today', 'امروز'], ['prof', 'برنامه‌های زنگ'], ['log', 'گزارش زنگ‌ها'], ['set', 'تنظیمات']];
    const body = { today: () => `<div class="grid g2">${clockCard(false)}<div class="card"><h2>زنگ‌های امروز</h2><div data-nz-min="day">${todayList()}</div></div></div>`, prof: profTab, log: logTab, set: setTab }[state.tab]();
    return `<div class="spread" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">${seg(state.tab, tabs, 'nz-tab')}<button class="btn sm" data-act="nz-kiosk">${I.screen} ساعت تمام‌صفحه</button></div>${body}`;
  }
  // The ناظم's dashboard: what needs doing now, for the whole school, on one screen.
  //   top:    the clock and the next bell, and five numbers (present, absent, late, classes not yet recorded, cases today)
  //   middle: every class of every grade as a tile (recorded or not, with its absences and latenesses), and the spaces now
  //   bottom: today's absent and late students with their notes, today's discipline cases, today's bells
  const SD = SchoolData;
  function schoolToday() {
    const s = ctx.school(), dt = SD.today(), out = { grades: [], absent: [], late: [], cases: [], present: 0, total: 0, missing: 0 };
    SD.gradesOf(s).forEach(g => {
      const x = SD.get(s.id, g), row = { g, classes: [] };
      x.classes.forEach(c => {
        const k = c.id + '|' + dt, rec = x.attendance[k], meta = x.attMeta?.[k] || {}, ss = x.students.filter(st => st.cls === c.id);
        const a = rec ? ss.filter(st => rec[st.id] === 'a') : [], l = rec ? ss.filter(st => rec[st.id] === 'l') : [];
        if (rec) { out.total += ss.length; out.present += ss.length - a.length; } else out.missing++;
        a.forEach(st => out.absent.push({ g, st, c, m: meta[st.id] || {} })); l.forEach(st => out.late.push({ g, st, c, m: meta[st.id] || {} }));
        row.classes.push({ c, rec: !!rec, a: a.length, l: l.length, n: ss.length });
      });
      (x.discipline || []).filter(r => r.date === dt).forEach(r => out.cases.push({ g, r, st: x.students.find(st => st.id === r.sid) }));
      out.grades.push(row);
    });
    return out;
  }
  const gName = g => SD.GRADE_NAME[g];
  function today() {
    const t = schoolToday(), dt = new Date(), pct = t.total ? Math.round(t.present / t.total * 100) : null, school = SD.dayIndex(SD.today()) !== null;
    const k = (label, value, sub, tone, act = '') => `<${act ? `button type="button" ${act}` : 'div'} class="nzd-k tone-${tone}"><span class="nzd-kl">${label}</span><b class="nzd-kv num ${value === fa(0) || value === '—' ? 'zero' : ''}">${value === fa(0) ? 'هیچ' : value === '—' ? 'ثبت نشده' : value}</b><span class="nzd-ks">${sub}</span></${act ? 'button' : 'div'}>`;
    const kpis = `<div class="nzd-kpis">
      <div class="nzd-k nzd-clock"><span class="nzd-kl">${esc(jDate(dt))}</span><b class="nzd-kv num" data-nz-clock>${clockText(dt)}</b><span class="nzd-ks">زنگ بعدی: <b data-nz-next></b> · <b class="num" data-nz-cd></b></span></div>
      ${k('حاضر امروز', pct == null ? '—' : `${fa(pct)}٪`, t.total ? `${fa(t.present)} از ${fa(t.total)} دانش‌آموز` : 'حضور و غیابی نیامده', 'teal')}
      ${k('غایب', fa(t.absent.length), t.absent.length ? 'برای معلم راهنما رفته' : 'غایبی نیست', t.absent.length ? 'rose' : 'teal', 'data-act="nzd-jump" data-id="nzd-abs"')}
      ${k('تأخیر', fa(t.late.length), t.late.length ? `${fa(t.late.filter(x => x.m.guide).length)} به معلم راهنما رفته` : 'تأخیری نیست', t.late.length ? 'amber' : 'teal', 'data-act="nzd-jump" data-id="nzd-abs"')}
      ${k('کلاس ثبت‌نشده', fa(t.missing), t.missing ? 'حضور و غیابشان مانده' : 'همه ثبت شده', t.missing ? 'amber' : 'teal', 'data-act="nzd-jump" data-id="nzd-cls"')}
      ${k('مورد انضباطی امروز', fa(t.cases.length), 'در همهٔ پایه‌ها', t.cases.length ? 'violet' : 'teal', 'data-act="nzd-jump" data-id="nzd-cases"')}</div>`;
    const classes = `<section class="card" id="nzd-cls" tabindex="-1"><div class="card-head"><h2>حضور و غیاب امروز، کلاس به کلاس</h2></div>
      ${school ? `<div class="nzd-gr">${t.grades.map(r => `<div class="nzd-row"><b class="nzd-g">${esc(gName(r.g))}</b><div class="nzd-cs">${r.classes.map(x => `<button type="button" class="nzd-c ${x.rec ? (x.a ? 'bad' : x.l ? 'warn' : 'ok') : 'todo'}" data-act="nzd-go" data-g="${r.g}" data-id="${x.c.id}" aria-label="کلاس ${esc(x.c.name)}: ${x.rec ? `${fa(x.a)} غایب، ${fa(x.l)} تأخیر` : 'ثبت نشده'}">
          <span>${esc(x.c.name)}</span><small>${x.rec ? (x.a || x.l ? `${x.a ? `${fa(x.a)} غایب` : ''}${x.a && x.l ? ' · ' : ''}${x.l ? `${fa(x.l)} تأخیر` : ''}` : 'همه حاضر') : 'ثبت نشده'}</small></button>`).join('')}</div></div>`).join('')}</div>
        <div class="nzd-leg small"><span class="nzd-c ok"></span>همه حاضر <span class="nzd-c warn"></span>تأخیر <span class="nzd-c bad"></span>غیبت <span class="nzd-c todo"></span>ثبت نشده</div>` : empty('امروز روز درسی نیست.')}</section>`;
    const who = x => `<b>${esc(x.st.name)}</b> <span class="muted small">${esc(x.c.name)}</span>`;
    const absent = `<section class="card" id="nzd-abs" tabindex="-1"><div class="card-head"><h2>غایب‌ها و تأخیرهای امروز</h2></div>
      ${t.absent.length || t.late.length ? `<ul class="nzd-list">${t.absent.map(x => `<li><span class="tag bad">غایب</span>${who(x)}${x.m.note ? `<span class="small nzd-note">${esc(x.m.note)}</span>` : '<span class="small muted">بی‌توضیح</span>'}</li>`).join('')}
        ${t.late.map(x => `<li><span class="tag warn">تأخیر${x.m.min ? ` ${fa(x.m.min)} دقیقه` : ''}</span>${who(x)}${x.m.note ? `<span class="small nzd-note">${esc(x.m.note)}</span>` : ''}${x.m.guide ? '<span class="tag grey">به معلم راهنما رفت</span>' : ''}</li>`).join('')}</ul>` : empty(t.total ? 'امروز غایب یا تأخیری ثبت نشده.' : 'هنوز حضور و غیابی ثبت نشده.')}</section>`;
    const cases = `<section class="card" id="nzd-cases" tabindex="-1"><div class="card-head"><h2>موارد انضباطی امروز</h2><a class="small" href="${ctx.hrefOf('discipline')}">همهٔ موارد ←</a></div>
      ${t.cases.length ? `<ul class="nzd-list">${t.cases.slice(0, 8).map(x => `<li><span class="tag grey">${esc(gName(x.g))}</span><b>${esc(x.st?.name || '')}</b><span class="small">${esc(x.r.name || x.r.title || '')}</span>${x.r.note ? `<span class="small muted">${esc(x.r.note)}</span>` : ''}</li>`).join('')}</ul>` : empty('امروز موردی ثبت نشده.')}</section>`;
    return `${kpis}
      <div class="nzd-main">${classes}<section class="card"><div class="card-head"><h2>فضاها، همین حالا</h2><a class="small" href="${ctx.hrefOf('spaces')}">برنامهٔ فضاها ←</a></div><div data-nz-min="now">${nowList()}</div></section></div>
      <div class="nzd-main">${absent}<div class="nzd-side">${cases}
        <section class="card"><div class="card-head"><h2>زنگ‌های امروز</h2><a class="small" href="${ctx.hrefOf('bells')}">برنامه‌های زنگ ←</a></div><div data-nz-min="day">${todayList()}</div>
          ${can() ? `<details class="nzd-man"><summary>زنگ دستی</summary><div class="nz-ring">${[['sound1', 'متوسطه اول'], ['sound2', 'متوسطه دوم'], ['seq', 'پشت سر هم'], ['rabbana', 'ربنا']].map(([k2, l]) => `<button class="btn sm" data-act="nz-ring" data-id="${k2}">${I.bell} ${l}</button>`).join('')}<button class="btn sm" data-act="nz-stop">${I.stop} توقف</button></div></details>` : ''}</section></div></div>`;
  }

  // Full-screen clock for the office monitor, like the app's «نمایش تمام‌صفحه».
  function kiosk() {
    const k = document.createElement('div'); k.className = 'nz-kiosk'; k.setAttribute('role', 'dialog'); k.setAttribute('aria-label', 'ساعت زنگ مدرسه');
    const logo = document.documentElement.style.getPropertyValue('--wm') ? '<img src="assets/logo-mehr8.png" alt="" class="nk-logo" onerror="this.remove()">' : '';
    k.innerHTML = `${logo}<div class="nk-time num" data-nz-clock>${clockText(new Date())}</div><div class="nk-date">${esc(jDate(new Date()))}</div>
      <div class="nk-next"><span>زنگ بعدی</span><b data-nz-next></b><span>مانده: <b class="num" data-nz-cd></b></span></div>
      <button class="btn" type="button" id="nk-x">بستن (Esc)</button>`;
    document.body.appendChild(k); live();
    const shut = () => { document.removeEventListener('keydown', esc1); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); k.remove(); };
    const esc1 = e => { if (e.key === 'Escape') shut(); };
    document.addEventListener('keydown', esc1); k.querySelector('#nk-x').onclick = shut; k.querySelector('#nk-x').focus();
    k.requestFullscreen?.().catch(() => {});
    document.addEventListener('fullscreenchange', function f() { if (!document.fullscreenElement && document.body.contains(k)) { document.removeEventListener('fullscreenchange', f); shut(); } });
  }

  const find = id => prof().items.find(x => x.id === id);
  const act = {
    'nz-tab': b => { state.tab = b.dataset.id; render(); },
    'nz-prof': b => { state.prof = b.dataset.id; render(); },
    'nz-sp': b => { state.sp = b.dataset.id; render(); },
    'nz-wk': b => { const n = +b.dataset.id; state.wk = n ? SchoolData.shift(n, curWs()) : ''; if (state.wk === thisWeek()) state.wk = ''; render(); },
    'nz-ring': b => { const k = b.dataset.id; ring(k === 'rabbana' ? 'صوت ربنا' : `زنگ دستی: ${SOUND[k]}`, k === 'sound2' ? 'm2' : k === 'sound1' ? 'm1' : 'both', k, k === 'seq' ? 10 : k === 'rabbana' ? 175 : 5, 'دستی'); },
    'nz-stop': () => BellAudio.stop(),
    'nz-try': b => { const x = find(b.dataset.id); BellAudio.play(x.sound, x.dur); },
    'nz-kiosk': kiosk,
    'nz-bell-new': () => bellModal(null),
    'nz-bell': b => bellModal(find(b.dataset.id)),
    'nz-bell-del': async b => {
      const x = find(b.dataset.id), list = prof().items, i = list.indexOf(x);
      if (!await UI.ask('حذف زنگ', `زنگ ${fT(x.time)} («${x.title}») حذف شود؟`, 'حذف کن')) return;
      list.splice(i, 1); save(); render(); UI.undo('زنگ حذف شد.', () => list.splice(i, 0, x), () => { save(); render(); });
    },
    'nz-prof-on': () => { B().active = prof().id; save(); render(); toast(`«${prof().name}» برنامهٔ فعال زنگ شد.`); },
    'nz-prof-copy': () => { const p = prof(), n = { id: uid('p'), name: `${p.name} (نسخهٔ دوم)`, items: JSON.parse(JSON.stringify(p.items)).map(x => ({ ...x, id: uid('b') })) }; B().profiles.push(n); state.prof = n.id; save(); render(); toast('نسخهٔ دوم ساخته شد؛ برای روزهای خاص (امتحان، نیمه‌وقت) ویرایشش کنید.'); },
    'nz-prof-name': () => modal(`<h2>تغییر نام برنامه</h2><label class="field"><span>نام</span><input class="input" id="pn" value="${esc(prof().name)}"></label><div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { const n = root.querySelector('#pn').value.trim(); if (!n) return UI.invalid('#pn', 'نام را بنویسید.'); prof().name = n; done('ذخیره شد.'); };
    }),
    'nz-prof-del': async () => { const p = prof(); if (!await UI.ask('حذف برنامه', `«${p.name}» با ${fa(p.items.length)} زنگش حذف شود؟`, 'حذف کن')) return; B().profiles.splice(B().profiles.indexOf(p), 1); state.prof = ''; save(); render(); toast('حذف شد.'); },
    'nz-log-clear': async () => { if (!await UI.ask('پاک کردن گزارش', 'همهٔ گزارش زنگ‌ها پاک شود؟', 'پاک کن')) return; B().logs = []; save(); render(); },
    'nz-off-add': () => { const d = document.getElementById('nz-off')?.value; if (!d) return; if (!B().off.includes(d)) B().off.push(d); save(); render(); toast(`${UI.fdate(d)} تعطیل ثبت شد.`); },
    'nz-off-today': () => { const d = isoOf(new Date()); if (!B().off.includes(d)) B().off.push(d); save(); render(); toast('امروز زنگی نمی‌خورد.'); },
    'nz-off-del': b => { B().off = B().off.filter(d => d !== b.dataset.id); save(); render(); },
    'nz-rb-save': () => {
      const raw = document.getElementById('nz-rb-a').value.replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).split(/[,،\s]+/).filter(Boolean);
      const bad = raw.find(t => !/^\d{1,2}:\d\d$/.test(t)); if (bad) return UI.invalid('#nz-rb-a', `«${bad}» ساعت درستی نیست؛ مثل ۱۲:۱۵ بنویسید.`);
      Object.assign(B().rabbana, { after: raw.map(t => t.padStart(5, '0')), delay: Math.max(0, Math.min(120, +document.getElementById('nz-rb-d').value || 0)) });
      save(); render(); toast('تنظیم ربنا ذخیره شد.');
    },
    'nz-cell': b => cellModal(space().cells.find(x => x.id === b.dataset.id)),
    'nz-cell-new': b => cellModal(null, +b.dataset.day, +b.dataset.slot),
    'nz-sp-new': () => spaceModal(null),
    'nz-sp-edit': () => spaceModal(space()),
    'nz-print': () => printModal(),
    'nzd-go': b => { Shell.setPref({ pGrade: +b.dataset.g }); location.hash = `#/journal/${b.dataset.id}`; },
    'nzd-jump': b => { const el = document.getElementById(b.dataset.id); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); el?.focus({ preventScroll: true }); },
  };
  function bind() {
    document.querySelectorAll('[data-nz-on]').forEach(cb => cb.onchange = () => { const x = find(cb.dataset.nzOn); x.on = cb.checked; save(); render(); toast(`زنگ ${fT(x.time)} ${x.on ? 'روشن' : 'خاموش'} شد.`); });
    const on = document.getElementById('nz-on'); if (on) on.onchange = () => { B().on = on.checked; save(); render(); toast(on.checked ? 'زنگ‌های خودکار روشن شد.' : 'زنگ‌های خودکار خاموش شد.'); };
    const rb = document.getElementById('nz-rb'); if (rb) rb.onchange = () => { B().rabbana.on = rb.checked; save(); toast(rb.checked ? 'ربنا پخش می‌شود.' : 'ربنا پخش نمی‌شود.'); };
    const dev = document.getElementById('nz-dev'); if (dev) dev.onchange = () => { setDevice(dev.checked); render(); toast(dev.checked ? 'از این پس این رایانه زنگ‌ها را پخش می‌کند.' : 'این رایانه دیگر زنگ پخش نمی‌کند.'); };
    const vol = document.getElementById('nz-vol'); if (vol) vol.onchange = () => { B().volume = vol.value / 100; BellAudio.setVolume(B().volume); save(); };
    live();
  }
  BellAudio.setVolume(B().volume ?? 0.9);

  return { pages: { nzm: today, bells, spaces }, act, bind, feed };
};
