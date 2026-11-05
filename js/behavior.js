// «امتیاز رفتاری»: quick points from the teacher for how a student works in class, one tap each, in the classroom or
// in the online room. Positive skills give +1, things to work on give −1; the student and the parent see the week.
//   tab()        the class page's «امتیاز رفتاری» tab (classroom.js): a card per student, the whole class, several at once,
//                undo, and a report table by period.
//   giveModal()  the skill picker for one or more students (also from the online room's users menu, liveclass.js).
//   familyCard() this week's points on the student's and the parent's home page (family.js).
// Data: x.behavior = { log: [{ id, sid, k, v: 1 | -1, sub, cls, by, at, note }] }.
const Behavior = (() => {
  const { esc, fa, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const SV = p => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  // [key, label, +1 | −1, icon]
  const SKILLS = [
    ['coop', 'همکاری', 1, SV('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14.5 20a4.5 4.5 0 0 1 6.5-4"/>')],
    ['effort', 'تلاش و پشتکار', 1, SV('<path d="M4 19 10 9l4 5 6-9"/><path d="M15 5h5v5"/>')],
    ['part', 'مشارکت در کلاس', 1, SV('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7S5 17.5 4 15l-1.2-2.6a1.5 1.5 0 0 1 2.6-1.4L8 14"/>')],
    ['help', 'کمک به دیگران', 1, SV('<path d="M12 20s-7-4.4-9-9.2C1.8 7.6 4 4.5 7.2 4.5c2 0 3.6 1.2 4.8 3 1.2-1.8 2.8-3 4.8-3 3.2 0 5.4 3.1 4.2 6.3C19 15.6 12 20 12 20z"/>')],
    ['ready', 'نظم و آمادگی', 1, SV('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>')],
    ['idea', 'ایدهٔ خوب', 1, SV('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>')],
    ['focus', 'حواس‌پرتی', -1, SV('<path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.5M6.3 7.6C4.2 9.2 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.8-1"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1"/>')],
    ['talk', 'صحبت بی‌اجازه', -1, SV('<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M9 9l6 4M15 9l-6 4"/>')],
    ['unready', 'آماده نبودن', -1, SV('<path d="M4 8h16v12H4zM3 4h18v4H3zM10 12h4"/>')],
    ['respect', 'بی‌احترامی', -1, SV('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>')],
  ];
  const skill = k => SKILLS.find(s => s[0] === k) || ['', k, 0, ''];
  const log = x => (x.behavior = x.behavior || { log: [] }).log;
  const today = () => J.todayIso();
  const sign = n => n > 0 ? `+${fa(n)}` : n < 0 ? `−${fa(-n)}` : fa(0);
  const face = s => { const p = D.photoOf(s); return p ? `<img src="${esc(p)}" alt="" loading="lazy">` : esc(D.initials(s)); };
  const ago = iso => { const d = Math.round((new Date(today() + 'T12:00:00') - new Date(iso.slice(0, 10) + 'T12:00:00')) / 864e5); return d <= 0 ? 'امروز' : d === 1 ? 'دیروز' : `${fa(d)} روز پیش`; };

  /* ---------------- numbers ---------------- */
  const PERIODS = [['today', 'امروز'], ['week', 'این هفته'], ['month', 'این ماه'], ['all', 'همهٔ سال']];
  function range(p) {
    const t = today();
    if (p === 'today') return [t, t];
    if (p === 'week') return [D.weekStart(t), t];
    if (p === 'month') { const j = J.isoToJ(t); return [J.jToIso(j.jy, j.jm, 1), t]; }
    return ['0000', t];
  }
  function stats(x, sid, p, sub) {
    const [a, b] = range(p), list = log(x).filter(e => e.sid === sid && (!sub || e.sub === sub) && e.at.slice(0, 10) >= a && e.at.slice(0, 10) <= b);
    const by = {}; let pos = 0, neg = 0;
    list.forEach(e => { if (e.v > 0) pos++; else neg++; by[e.k] = (by[e.k] || 0) + 1; });
    const top = Object.entries(by).filter(([k]) => skill(k)[2] > 0).sort((p1, p2) => p2[1] - p1[1]);
    return { pos, neg, net: pos - neg, rate: pos + neg ? Math.round(pos / (pos + neg) * 100) : null, top, list: list.slice().reverse() };
  }

  /* ---------------- giving points ---------------- */
  // meta: { sub, cls, by, save, after(entries) }. A tap on a skill records it at once, as in class there is no time to spare.
  function giveModal(x, sids, meta) {
    const ss = sids.map(id => x.students.find(s => s.id === id)).filter(Boolean); if (!ss.length) return;
    const one = ss.length === 1 ? ss[0] : null, w = one && stats(x, one.id, 'week');
    const btn = ([k, l, v, ic]) => `<button type="button" class="bh-sk ${v > 0 ? 'pos' : 'neg'}" data-k="${k}"><span class="bh-ic">${ic}</span><span>${l}</span><b class="num">${v > 0 ? '+۱' : '−۱'}</b></button>`;
    const recent = one ? stats(x, one.id, 'all').list.slice(0, 5) : [];
    modal(`<div class="bh-mhead">${one ? `<span class="bh-av">${face(one)}</span><div><h2>${esc(one.name)}</h2><p class="muted small">این هفته: <b class="bh-pos">${fa(w.pos)}</b> آفرین · <b class="bh-neg">${fa(w.neg)}</b> نیاز به تلاش</p></div>`
        : `<div><h2>امتیاز به ${fa(ss.length)} دانش‌آموز</h2><p class="muted small">${esc(ss.slice(0, 6).map(s => s.name).join('، '))}${ss.length > 6 ? ` و ${fa(ss.length - 6)} نفر دیگر` : ''}</p></div>`}</div>
      <h3 class="bh-gh">آفرین برای</h3><div class="bh-grid">${SKILLS.filter(s => s[2] > 0).map(btn).join('')}</div>
      <h3 class="bh-gh">نیاز به تلاش بیشتر</h3><div class="bh-grid">${SKILLS.filter(s => s[2] < 0).map(btn).join('')}</div>
      <label class="field"><span>یادداشت کوتاه برای خانواده</span><input class="input" id="bh-note" maxlength="120" placeholder="مثلاً حل تمرین سخت روی تخته"></label>
      ${recent.length ? `<h3 class="bh-gh">آخرین امتیازها</h3><ul class="bh-recent">${recent.map(e => `<li><span class="bh-dot ${e.v > 0 ? 'pos' : 'neg'}">${e.v > 0 ? '+۱' : '−۱'}</span><span>${esc(skill(e.k)[1])}${e.note ? ` · ${esc(e.note)}` : ''}</span><span class="muted small">${esc(e.sub || '')} · ${ago(e.at)}</span>
          ${e.by === meta.by ? `<button type="button" class="btn sm" data-del="${e.id}" aria-label="حذف امتیاز ${esc(skill(e.k)[1])}">حذف</button>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="row" style="margin-top:16px"><button class="btn" data-close>بستن</button></div>`, root => {
      root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const [k, l, v] = skill(b.dataset.k), note = (root.querySelector('#bh-note').value || '').trim(), at = new Date().toISOString();
        const added = ss.map(s => ({ id: D.uid('bh'), sid: s.id, k, v, sub: meta.sub || '', cls: s.cls, by: meta.by || '', at, ...(note ? { note } : {}) }));
        log(x).push(...added); meta.save(); close();
        toast(`${v > 0 ? '+۱' : '−۱'} ${l} برای ${one ? one.name : `${fa(ss.length)} دانش‌آموز`}`);
        meta.after?.(added);
      });
      root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const L = log(x), i = L.findIndex(e => e.id === b.dataset.del); if (i >= 0) L.splice(i, 1); meta.save(); close(); toast('امتیاز حذف شد.'); meta.after?.([]); });
    });
  }

  /* ---------------- the class page tab ---------------- */
  const st = { cls: '', period: 'week', view: 'grid', multi: false, pick: new Set() };
  // o: { x, sub, ro, me, save, render, className }
  function tab(o) {
    const x = o.x;
    if (!x.classes.some(c => c.id === st.cls)) st.cls = x.classes[0]?.id || '';
    const ss = x.students.filter(s => s.cls === st.cls);
    const rows = ss.map(s => ({ s, t: stats(x, s.id, st.period, o.sub) }));
    const cls = rows.reduce((a, r) => ({ pos: a.pos + r.t.pos, neg: a.neg + r.t.neg }), { pos: 0, neg: 0 });
    const mine = log(x).filter(e => e.by === o.me && e.sub === o.sub), last = mine[mine.length - 1];
    const seg = (name, list, cur) => `<div class="seg" role="radiogroup" aria-label="${name}">${list.map(([k, l]) => `<button role="radio" aria-checked="${cur === k}" data-act="${name === 'بازه' ? 'bh-period' : 'bh-view'}" data-id="${k}">${l}</button>`).join('')}</div>`;
    const bar = `<div class="card bh-bar"><div class="row"><label class="small muted" for="bh-cls">کلاس</label><select class="input" id="bh-cls">${x.classes.map(c => `<option value="${c.id}" ${c.id === st.cls ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        ${seg('بازه', PERIODS, st.period)}${seg('نما', [['grid', 'کارت‌ها'], ['report', 'گزارش']], st.view)}</div>
      <div class="bh-sum"><span><b class="num bh-pos">${fa(cls.pos)}</b> آفرین</span><span><b class="num bh-neg">${fa(cls.neg)}</b> نیاز به تلاش</span>${cls.pos + cls.neg ? `<span><b class="num">${fa(Math.round(cls.pos / (cls.pos + cls.neg) * 100))}٪</b> مثبت</span>` : ''}</div>
      ${o.ro ? '' : `<div class="row bh-acts">${st.multi ? `<b>${fa(st.pick.size)} نفر انتخاب شده</b><button class="btn sm primary" data-act="bh-give-sel" ${st.pick.size ? '' : 'disabled'}>امتیاز به انتخاب‌شده‌ها</button><button class="btn sm" data-act="bh-pick-all">همه</button><button class="btn sm" data-act="bh-multi">پایان انتخاب</button>`
        : `<button class="btn sm primary" data-act="bh-all">امتیاز به همهٔ کلاس</button><button class="btn sm" data-act="bh-multi">انتخاب چندنفره</button>${last ? `<button class="btn sm" data-act="bh-undo" title="${esc(skill(last.k)[1])}">برگرداندن آخرین امتیاز</button>` : ''}`}</div>`}</div>`;
    if (!ss.length) return bar + `<div class="card empty-state"><p class="muted">این کلاس دانش‌آموزی ندارد.</p></div>`;
    if (st.view === 'report') {
      const sorted = rows.slice().sort((a, b) => b.t.net - a.t.net || a.s.name.localeCompare(b.s.name, 'fa'));
      return bar + `<div class="card bh-report"><div class="table-wrap"><table><thead><tr><th scope="col">دانش‌آموز</th><th scope="col">آفرین</th><th scope="col">نیاز به تلاش</th><th scope="col">جمع</th><th scope="col">درصد مثبت</th><th scope="col">بیشترین آفرین</th><th scope="col">آخرین</th></tr></thead>
        <tbody>${sorted.map(({ s, t }) => `<tr><th scope="row"><span class="bh-who"><span class="bh-av sm">${face(s)}</span>${esc(s.name)}</span></th><td class="num bh-pos">${fa(t.pos)}</td><td class="num bh-neg">${fa(t.neg)}</td><td class="num"><b>${sign(t.net)}</b></td>
          <td>${t.rate == null ? '—' : `<span class="bh-rate"><i style="width:${t.rate}%"></i></span> <span class="num small">${fa(t.rate)}٪</span>`}</td><td>${t.top[0] ? esc(skill(t.top[0][0])[1]) : '—'}</td><td class="small muted">${t.list[0] ? `${esc(skill(t.list[0].k)[1])} · ${ago(t.list[0].at)}` : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
    return bar + `<div class="bh-cards">${rows.map(({ s, t }) => `<button type="button" class="bh-card ${st.multi && st.pick.has(s.id) ? 'on' : ''}" data-act="bh-pick" data-id="${s.id}" ${o.ro ? 'disabled' : ''} ${st.multi ? `aria-pressed="${st.pick.has(s.id)}"` : ''} aria-label="${esc(s.name)}، ${PERIODS.find(p => p[0] === st.period)[1]}: ${fa(t.pos)} آفرین و ${fa(t.neg)} نیاز به تلاش">
        <span class="bh-av">${face(s)}</span><b class="bh-net num ${t.net > 0 ? 'pos' : t.net < 0 ? 'neg' : ''}">${sign(t.net)}</b><span class="bh-name">${esc(s.name)}</span><span class="small muted"><b class="bh-pos">${fa(t.pos)}</b> آفرین · <b class="bh-neg">${fa(t.neg)}</b> تذکر</span></button>`).join('')}</div>`;
  }
  const ACTS = ['bh-pick', 'bh-period', 'bh-view', 'bh-all', 'bh-multi', 'bh-pick-all', 'bh-give-sel', 'bh-undo'];
  function act(name, b, o) {
    const meta = { sub: o.sub, by: o.me, save: o.save, after: () => o.render() };
    const ids = () => o.x.students.filter(s => s.cls === st.cls).map(s => s.id);
    if (name === 'bh-period') { st.period = b.dataset.id; return o.render(); }
    if (name === 'bh-view') { st.view = b.dataset.id; return o.render(); }
    if (name === 'bh-multi') { st.multi = !st.multi; st.pick.clear(); return o.render(); }
    if (name === 'bh-pick-all') { ids().forEach(id => st.pick.add(id)); return o.render(); }
    if (name === 'bh-pick') { if (!st.multi) return giveModal(o.x, [b.dataset.id], meta); const id = b.dataset.id; st.pick.has(id) ? st.pick.delete(id) : st.pick.add(id); return o.render(); }
    if (name === 'bh-all') return giveModal(o.x, ids(), meta);
    if (name === 'bh-give-sel') return giveModal(o.x, [...st.pick], { ...meta, after: () => { st.multi = false; st.pick.clear(); o.render(); } });
    if (name === 'bh-undo') {
      const L = log(o.x), mine = L.filter(e => e.by === o.me && e.sub === o.sub), last = mine[mine.length - 1]; if (!last) return;
      const batch = L.filter(e => e.at === last.at && e.by === last.by && e.k === last.k);
      batch.forEach(e => L.splice(L.indexOf(e), 1)); o.save(); o.render();
      toast(`«${skill(last.k)[1]}» برای ${batch.length > 1 ? `${fa(batch.length)} نفر` : (o.x.students.find(s => s.id === last.sid)?.name || '')} برداشته شد.`);
    }
  }
  function bind(o) { const c = document.getElementById('bh-cls'); if (c) c.onchange = () => { st.cls = c.value; st.pick.clear(); o.render(); }; }

  /* ---------------- the student's and the parent's home ---------------- */
  function familyCard(x, sid, parent) {
    const t = stats(x, sid, 'week');
    const body = t.pos + t.neg ? `<div class="bh-fam"><div class="bh-fam-n"><b class="num ${t.net >= 0 ? 'bh-pos' : 'bh-neg'}">${sign(t.net)}</b><span class="small muted">${fa(t.pos)} آفرین · ${fa(t.neg)} نیاز به تلاش</span></div>
        <div class="bh-rate lg" role="img" aria-label="${fa(t.rate)} درصد امتیازها مثبت"><i style="width:${t.rate}%"></i></div></div>
      ${t.top.length ? `<div class="bh-chips">${t.top.slice(0, 3).map(([k, n]) => `<span class="bh-chip"><span class="bh-ic">${skill(k)[3]}</span>${esc(skill(k)[1])} <b class="num">${fa(n)}</b></span>`).join('')}</div>` : ''}
      <ul class="fm-list bh-flist">${t.list.slice(0, 4).map(e => `<li><span class="bh-dot ${e.v > 0 ? 'pos' : 'neg'}">${e.v > 0 ? '+۱' : '−۱'}</span><span class="fm-l"><b>${esc(skill(e.k)[1])}</b><span class="muted small">${esc(e.sub || '')}${e.by ? ` · ${esc(e.by)}` : ''} · ${ago(e.at)}${e.note ? ` · ${esc(e.note)}` : ''}</span></span></li>`).join('')}</ul>`
      : `<p class="muted" style="margin:0">این هفته هنوز امتیازی ثبت نشده.${parent ? '' : ' با همکاری و مشارکت در کلاس، از معلم‌ها آفرین بگیر.'}</p>`;
    return `<section class="card fm-card bh-fcard"><div class="card-head"><h2>امتیاز رفتاری این هفته</h2></div>${body}</section>`;
  }

  return { SKILLS, skill, stats, giveModal, tab, act, bind, ACTS, familyCard };
})();
