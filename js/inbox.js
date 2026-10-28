// The unified inbox (#/inbox, the bell in the top bar): everything new for the signed-in person, from every module.
// Each module supplies a feed() of items { key, type, title, text, at, href | open, unread, read? }.
// An item counts as new while its source says it is unread and it has not been opened or cleared here;
// what was opened or cleared is kept per person in org.inboxSeen.
const Inbox = ctx => {
  const { esc, fa } = UI;
  const J = JDate, today = J.todayIso();
  const { org, save, render, empty } = ctx;
  const TYPES = {
    letter: ['نامه', 'blue', 'mail'], notice: ['اطلاعیه', 'rose', 'bell'], council: ['شورای مدرسه', 'amber', 'check'], chat: ['گفتگو', 'teal', 'users'],
    session: ['جلسهٔ مشاوره', 'violet', 'id'], follow: ['پیگیری', 'rose', 'shield'], reminder: ['یادآور', 'amber', 'calendar'], card: ['کارنامه', 'violet', 'book'],
    admit: ['پذیرش', 'rose', 'building'], finance: ['مالی', 'teal', 'wallet'], hire: ['استخدام', 'blue', 'users'], food: ['تغذیه', 'amber', 'food'], coop: ['تعاون', 'teal', 'services'], family: ['جلسه با خانواده', 'teal', 'users'],
  };
  // Three views: everything; what colleagues sent or assigned (letters, notices, council tasks, chat, reminders...);
  // and enrolment and hiring, whose status shows in each item.
  const GROUPS = [['', 'همه', null], ['staff', 'همکاران', ['letter', 'notice', 'council', 'chat', 'reminder', 'follow', 'session', 'card']], ['hr', 'پذیرش و استخدام', ['admit', 'hire', 'finance']]];
  const inGroup = (it, g) => { const k = GROUPS.find(x => x[0] === g)?.[2]; return !k || k.includes(it.type); };
  const state = { type: '' };
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const seen = () => { const o = org(); o.inboxSeen = o.inboxSeen || {}; return (o.inboxSeen[ctx.me()] = o.inboxSeen[ctx.me()] || {}); };
  const isNew = it => it.unread && !seen()[it.key];
  function items() {
    const all = ctx.sources.flatMap(f => { try { return f() || []; } catch (e) { return []; } });
    return all.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }
  const count = () => items().filter(isNew).length;
  const when = at => {
    if (!at) return '';
    const d = at.slice(0, 10), n = Math.round((new Date(today) - new Date(d)) / 864e5);
    const day = n === 0 ? 'امروز' : n === 1 ? 'دیروز' : n === -1 ? 'فردا' : n > 1 && n < 7 ? `${fa(n)} روز پیش` : J.format(d, false);
    return day + (at.length > 10 ? ' · ' + digits(at.slice(11, 16)) : '');
  };

  function page() {
    const all = items(), fresh = all.filter(isNew), old = all.filter(it => !isNew(it)).slice(0, 30);
    if (!GROUPS.some(g => g[0] === state.type)) state.type = '';
    const by = list => list.filter(it => inGroup(it, state.type));
    const row = it => { const [label, tone, ic] = TYPES[it.type] || [it.type, 'slate', 'bell'];
      return `<li><button type="button" class="ib-item ${isNew(it) ? 'new' : ''}" data-act="ib-open" data-key="${esc(it.key)}">
        <span class="rail-tile tone-${tone}" aria-hidden="true">${Shell.icon(ic)}</span>
        <span class="ib-body"><span class="ib-top"><span class="tag" style="background:var(--${tone}-bg);color:var(--${tone})">${esc(label)}</span><b>${esc(it.title)}</b></span>
          ${it.text ? `<span class="ib-text">${esc(it.text)}</span>` : ''}</span>
        <span class="ib-when muted small">${esc(when(it.at))}${isNew(it) ? '<span class="ib-dot" aria-hidden="true"></span><span class="sr-only">تازه</span>' : ''}</span></button></li>`; };
    const filters = `<div class="chips-row" role="radiogroup" aria-label="نوع اعلان">${GROUPS.map(([g, l]) => `<button role="radio" class="fchip" aria-checked="${state.type === g}" data-act="ib-type" data-id="${g}">${l} <b>${fa(fresh.filter(it => inGroup(it, g)).length)}</b></button>`).join('')}</div>`;
    const f = by(fresh), o = by(old);
    return `<div class="spread" style="margin-bottom:10px"><span class="muted">${fresh.length ? `${fa(fresh.length)} اعلان تازه` : 'اعلان تازه‌ای نیست'}</span>
        ${fresh.length ? '<button class="btn" data-act="ib-all">همه را خوانده‌شده کن</button>' : ''}</div>${filters}
      <section aria-label="اعلان‌های تازه"><div class="group-head"><h2>تازه</h2><span class="muted small">${fa(f.length)}</span></div>
        ${f.length ? `<ul class="ib-list">${f.map(row).join('')}</ul>` : `<div class="card">${empty('چیز تازه‌ای نیست.')}</div>`}</section>
      ${o.length ? `<section aria-label="اعلان‌های دیده‌شده"><div class="group-head"><h2>دیده‌شده</h2><span class="muted small">${fa(o.length)}</span></div><ul class="ib-list">${o.map(row).join('')}</ul></section>` : ''}`;
  }
  function open(key) {
    const it = items().find(x => x.key === key); if (!it) return render();
    seen()[key] = new Date().toISOString(); it.read?.(); save();
    if (it.open) { render(); it.open(); return; }
    if (location.hash === it.href) render(); else location.hash = it.href;
  }
  const act = {
    'ib-open': b => open(b.dataset.key),
    'ib-type': b => { state.type = b.dataset.id; render(); },
    'ib-all': () => {
      const s = seen(), stamp = new Date().toISOString();
      items().filter(isNew).filter(it => inGroup(it, state.type)).forEach(it => { s[it.key] = stamp; it.read?.(); });
      save(); render(); UI.toast('همه خوانده‌شده شد.');
    },
  };
  return { page, count, act };
};
