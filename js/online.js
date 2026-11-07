// «جلسهٔ هماهنگی» (online.html): the live class room of liveclass.js for three people on separate devices.
// Sign-in: one of three names and that person's code (only its SHA-256 is kept here). The first one in hosts the
// room; the others join the host through PeerJS (o.relay). The room holds three people (o.max).
(() => {
  const { esc, toast } = UI;
  const USERS = [
    { id: 'u1', name: 'پوریا مخبریان', h: '0cd9684c4256aa337492c13c5ee946821eab7d482d9cf9e847ad38a1f9f5463d' },
    { id: 'u2', name: 'امیرحسین جاودانی', h: '6261c8cdfbf623428db75448c8ab7d5138a0b1c67e1e210d5ae78f97184692e6' },
    { id: 'u3', name: 'امیرعلی پیمان', h: 'a26e568e9db43c021b711bea788a774321ee2bc635318bb6f6c547b0dec7a516' },
  ];
  const ROOM = 'hamahangi-m8k4', TITLE = 'جلسهٔ هماهنگی';
  const KEY = 'mehr8-online';
  let S = {}; try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* no storage */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* no storage */ } };
  const me = () => USERS.find(u => u.id === S.user);
  const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const app = document.getElementById('app');
  const head = sub => `<div class="on-head"><img src="assets/logo-mehr8-tile.png" alt=""><div><h1>${TITLE}</h1><p>${sub}</p></div></div>`;

  const fresh = () => { const t = new Date(), p = n => String(n).padStart(2, '0');
    return { id: ROOM, title: TITLE, date: JDate.todayIso(), from: `${p(t.getHours())}:${p(t.getMinutes())}`, to: '', cls: null, status: 'planned', att: {}, chat: [], polls: [], recs: [], stats: {}, notes: '' }; };
  const o = { relay: true, tryHost: true, max: 3, sub: 'هماهنگی', ro: false,
    me: () => me()?.name || 'میزبان', students: () => USERS.filter(u => u.id !== S.user).map(u => ({ id: u.id, name: u.name, cls: null })),
    classes: () => [], className: () => '', save, render: () => view(),
    empty: t => `<p class="muted">${esc(t)}</p>`, kpi: (l, v) => `<div class="card"><b>${v}</b><div class="small">${esc(l)}</div></div>`, as: () => null,
    after: () => { view(); toast('جلسه تمام شد.'); } };

  function view() {
    if (LiveClass.active()) return;
    const u = me();
    if (!u) {
      app.innerHTML = `<form class="card on-card" id="on-in" novalidate>${head('ورود فقط برای سه نفر')}
        <fieldset class="on-who"><legend>شما کدام هستید؟</legend>${USERS.map(x => `<label><input type="radio" name="who" value="${x.id}"> ${esc(x.name)}</label>`).join('')}</fieldset>
        <label class="on-code">کد ورود<input id="on-code" type="password" inputmode="numeric" autocomplete="off" maxlength="12"></label>
        <p class="on-err" id="on-err" role="alert"></p>
        <button class="btn primary" type="submit">ورود</button></form>`;
      document.getElementById('on-in').onsubmit = async e => {
        e.preventDefault();
        const who = app.querySelector('[name=who]:checked')?.value, code = document.getElementById('on-code').value.trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        const err = document.getElementById('on-err');
        if (!who) { err.textContent = 'نام خود را انتخاب کنید.'; return; }
        const x = USERS.find(y => y.id === who);
        if (!code || await sha('mehr8|' + code) !== x.h) { err.textContent = 'کد ورود درست نیست.'; document.getElementById('on-code').focus(); return; }
        S.user = who; save(); view();
      };
      return;
    }
    app.innerHTML = `<div class="card on-card">${head(`سلام ${esc(u.name)}`)}
      <ul class="on-note"><li>اولین نفری که وارد شود میزبان جلسه است و بقیه به او وصل می‌شوند.</li>
        <li>ظرفیت جلسه ${fa(3)} نفر است.</li><li>برای صدا و تصویر، اجازهٔ میکروفون و دوربین را به مرورگر بدهید.</li></ul>
      <button class="btn primary" type="button" id="on-go">ورود به جلسه</button>
      <button class="btn" type="button" id="on-out">خروج از حساب</button></div>`;
    document.getElementById('on-out').onclick = () => { delete S.user; save(); view(); };
    document.getElementById('on-go').onclick = e => enter(e.currentTarget);
  }

  async function enter(b) {
    b.disabled = true; b.textContent = 'در حال اتصال…';
    if (!S.x || S.x.status === 'done') { S.x = fresh(); save(); }
    const c = { live: { sessions: [S.x] }, link: '' };
    let r = await LiveClass.room(c, o, S.x, null);
    if (r === 'unavailable-id') r = await LiveClass.room(c, o, { id: ROOM, title: TITLE }, { id: S.user, name: me().name });
    if (typeof r === 'string' && b.isConnected) { b.disabled = false; b.textContent = 'ورود به جلسه'; }
  }

  view();
})();
