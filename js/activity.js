// «جدول فعالیت‌های روزانه»: the third way of logging study. For each day of the week the student fills the hours
// with what they were doing (study, rest, sleep, TV, games, phone, personal things, family, meals); each activity has
// a colour on the week table, and the hours of each are added up under it. Times are chosen on a turning wheel,
// like a phone alarm clock. A span that ends before it starts runs past midnight into the next day.
// Kept in studyPlans[sid].acts = { isoDate: [{ id, from: 'HH:MM', to: 'HH:MM' (or '24:00'), kind, subject? }] }.
const ActivityLog = (() => {
  const { esc, fa } = UI;
  const D = SchoolData;
  const ACTS = [
    ['study', 'مشغول درس', '#2563eb'], ['rest', 'استراحت', '#65a30d'], ['sleep', 'خواب', '#6d28d9'],
    ['tv', 'پای تلویزیون', '#ea580c'], ['game', 'پای بازی', '#dc2626'], ['phone', 'پای موبایل', '#db2777'],
    ['personal', 'کار شخصی', '#0d9488'], ['family', 'در فضای خانواده', '#ca8a04'], ['food', 'غذا خوردن', '#78716c'],
  ];
  const ACT = Object.fromEntries(ACTS.map(([k, l, c]) => [k, { l, c }]));
  const WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const pad = n => String(n).padStart(2, '0');
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const hrs = m => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${fa(h)} ساعت و ${fa(r)} دقیقه` : h ? `${fa(h)} ساعت` : `${fa(r)} دقیقه`; };
  const hrsShort = m => fa(Math.round(m / 60 * 10) / 10);
  const days = date => { const s = D.weekStart(date); return WEEK.map((_, i) => D.shift(i, s)); };
  const listOf = (p, day) => (p.acts = p.acts || {})[day] = (p.acts[day] || []);
  const minutesOf = (p, day, kind, subject) => (p?.acts?.[day] || []).filter(a => a.kind === kind && (!subject || a.subject === subject)).reduce((s, a) => s + toMin(a.to) - toMin(a.from), 0);

  // Puts a span on a day; whatever was there in that time is cut back.
  function place(list, item) {
    const f = toMin(item.from), t = toMin(item.to), out = [];
    list.forEach(e => {
      const ef = toMin(e.from), et = toMin(e.to);
      if (et <= f || ef >= t) return out.push(e);
      if (ef < f) out.push({ ...e, id: D.uid('a'), to: item.from });
      if (et > t) out.push({ ...e, id: D.uid('a'), from: item.to });
    });
    out.push(item); out.sort((a, b) => toMin(a.from) - toMin(b.from));
    list.splice(0, list.length, ...out);
  }
  // Adds a span from..to of one activity to a day; past midnight, the rest goes on the next day.
  function add(p, day, from, to, kind, subject) {
    const base = { kind, ...(kind === 'study' && subject ? { subject } : {}) };
    if (toMin(to) > toMin(from)) return place(listOf(p, day), { id: D.uid('a'), from, to, ...base });
    place(listOf(p, day), { id: D.uid('a'), from, to: '24:00', ...base });
    if (toMin(to) > 0) place(listOf(p, D.shift(1, day)), { id: D.uid('a'), from: '00:00', to, ...base });
  }

  /* ---------------- the week table ---------------- */
  function week(p, date, ro) {
    const ds = days(date), pct = m => m / 1440 * 100;
    const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];
    const head = `<div class="ac-row ac-head" aria-hidden="true"><span class="ac-day"></span><div class="ac-track">${ticks.map(h => `<i class="ac-tick" style="inset-inline-start:${pct(h * 60)}%">${digits(pad(h))}</i>`).join('')}</div></div>`;
    const rows = ds.map((day, i) => {
      const list = p.acts?.[day] || [], tracked = list.reduce((s, a) => s + toMin(a.to) - toMin(a.from), 0);
      return `<div class="ac-row ${day === date ? 'on' : ''}"><span class="ac-day"><b>${WEEK[i]}</b><span class="muted small">${esc(JDate.format(day, false))}</span>${tracked ? `<span class="small">${hrsShort(tracked)} ساعت ثبت‌شده</span>` : ''}</span>
        <div class="ac-track">${ticks.slice(1, -1).map(h => `<i class="ac-grid" style="inset-inline-start:${pct(h * 60)}%"></i>`).join('')}
          ${list.map(a => { const f = toMin(a.from), t = toMin(a.to), lab = `${ACT[a.kind].l}${a.subject ? ` (${a.subject})` : ''}، ${WEEK[i]} ${digits(a.from)} تا ${digits(a.to)}`;
            return `<button type="button" class="ac-seg" style="inset-inline-start:${pct(f)}%;width:${pct(t - f)}%;background:${ACT[a.kind].c}" title="${esc(lab)}" aria-label="${esc(lab)}"
              ${ro ? 'disabled' : `data-act="ac-edit" data-id="${day}|${a.id}"`}>${t - f >= 90 ? `<span>${esc(ACT[a.kind].l)}</span>` : ''}</button>`; }).join('')}</div></div>`;
    }).join('');
    const tot = Object.fromEntries(ACTS.map(([k]) => [k, ds.reduce((s, day) => s + minutesOf(p, day, k), 0)]));
    const all = Object.values(tot).reduce((a, b) => a + b, 0);
    return `<div class="card"><div class="card-head"><div><h2 style="margin:0">جدول فعالیت‌های هفته</h2><div class="muted small">هفتهٔ ${esc(JDate.format(ds[0], false))} تا ${esc(JDate.format(ds[6], false))} · روی هر بازه بزنید تا ویرایش یا حذف شود.</div></div>
        ${ro ? '' : '<button class="btn primary" data-act="ac-new">+ افزودن فعالیت</button>'}</div>
      <div class="ac-wrap" tabindex="0" role="region" aria-label="جدول فعالیت‌های هفته">${head}${rows}</div>
      <ul class="ac-legend" aria-label="راهنمای رنگ‌ها">${ACTS.map(([k, l, c]) => `<li><i style="background:${c}"></i>${esc(l)}</li>`).join('')}</ul></div>
    <div class="card"><div class="card-head"><h2 style="margin:0">مجموع ساعت‌های هر فعالیت در این هفته</h2><span class="muted small">${all ? `${hrsShort(all)} ساعت از ${fa(168)} ساعت هفته ثبت شده` : 'هنوز چیزی ثبت نشده'}</span></div>
      <div class="ac-totals">${ACTS.map(([k, l, c]) => `<div class="ac-tot"><span class="ac-tot-l"><i style="background:${c}"></i>${esc(l)}</span><b class="num">${hrsShort(tot[k])}</b><span class="muted small">ساعت</span>
        <span class="ac-tot-bar"><i style="width:${all ? tot[k] / all * 100 : 0}%;background:${c}"></i></span></div>`).join('')}</div></div>`;
  }

  /* ---------------- the time wheel ---------------- */
  const ITEM = 40;
  const col = (kind, label, max, step, val) => {
    const vals = Array.from({ length: max / step }, (_, i) => i * step);
    return `<div class="wh-col" data-wh="${kind}" data-step="${step}" tabindex="0" role="spinbutton" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max - step}" aria-valuenow="${val}" aria-valuetext="${digits(pad(val))}">
      <div class="wh-pad"></div>${vals.map(v => `<div class="wh-it" data-v="${v}">${digits(pad(v))}</div>`).join('')}<div class="wh-pad"></div></div>`;
  };
  function wheel(id, label, time) {
    const [h, m] = time.split(':').map(Number);
    return `<div class="field"><span id="${id}-l">${esc(label)}</span><div class="wheel" id="${id}" role="group" aria-labelledby="${id}-l" dir="ltr">
      <div class="wh-band" aria-hidden="true"></div>${col('h', `${label}، ساعت`, 24, 1, h)}<span class="wh-sep" aria-hidden="true">:</span>${col('m', `${label}، دقیقه`, 60, 5, m - m % 5)}</div></div>`;
  }
  // Wires the wheels in root; returns { get(id) → 'HH:MM' }. onChange runs after every turn.
  function wireWheels(root, onChange) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('.wh-col').forEach(c => {
      const items = [...c.querySelectorAll('.wh-it')], step = +c.dataset.step;
      const idxOf = () => Math.max(0, Math.min(items.length - 1, Math.round(c.scrollTop / ITEM)));
      // The turning look: items above and below the middle tilt away and fade.
      const paint = () => { const mid = c.scrollTop / ITEM; items.forEach((it, i) => { const d = i - mid, a = Math.abs(d);
        it.style.transform = reduce ? '' : `rotateX(${Math.max(-70, Math.min(70, -d * 22))}deg) scale(${1 - Math.min(.25, a * .07)})`;
        it.style.opacity = String(Math.max(.2, 1 - a * .28)); it.classList.toggle('on', a < .5); }); };
      const set = (i, smooth) => { c.scrollTo({ top: i * ITEM, behavior: smooth && !reduce ? 'smooth' : 'auto' }); };
      const sync = () => { const v = +items[idxOf()].dataset.v; c.setAttribute('aria-valuenow', v); c.setAttribute('aria-valuetext', digits(pad(v))); onChange && onChange(); };
      let t; c.addEventListener('scroll', () => { requestAnimationFrame(paint); clearTimeout(t); t = setTimeout(sync, 90); }, { passive: true });
      c.addEventListener('keydown', e => {
        const k = { ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[e.key]; if (k == null && !['Home', 'End'].includes(e.key)) return;
        e.preventDefault(); set(e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, idxOf() + k)), true);
      });
      items.forEach((it, i) => it.onclick = () => set(i, true));
      requestAnimationFrame(() => { set(Math.round(+c.getAttribute('aria-valuenow') / step), false); paint(); });
    });
    return { get: id => { const w = root.querySelector('#' + id); const v = k => +w.querySelector(`[data-wh="${k}"]`).getAttribute('aria-valuenow'); return `${pad(v('h'))}:${pad(v('m'))}`; } };
  }

  /* ---------------- add / edit ---------------- */
  // cur: { day, item } when editing one span.
  function modal(p, date, subjects, done, cur) {
    const ds = days(date), it = cur?.item, kind0 = it?.kind || 'study';
    UI.modal(`<h2>${it ? 'ویرایش فعالیت' : 'افزودن فعالیت'}</h2>
      ${it ? `<p class="muted small" style="margin-top:0">${WEEK[ds.indexOf(cur.day)] ?? ''} ${esc(JDate.format(cur.day, false))}</p>` : `<fieldset class="ac-fs"><legend class="small muted">روز یا روزها</legend><div class="chips">${ds.map((day, i) => `<label class="chip"><input type="checkbox" value="${day}" ${day === date ? 'checked' : ''}>${WEEK[i]}</label>`).join('')}</div></fieldset>`}
      <fieldset class="ac-fs"><legend class="small muted">چه کاری؟</legend><div class="ac-kinds">${ACTS.map(([k, l, c]) => `<label class="ac-kind"><input type="radio" name="ac-k" value="${k}" ${k === kind0 ? 'checked' : ''}><span><i style="background:${c}"></i>${esc(l)}</span></label>`).join('')}</div></fieldset>
      <label class="field" id="ac-sub-f"><span>کدام درس؟</span><select class="input" id="ac-sub"><option value="">—</option>${subjects.map(su => `<option ${it?.subject === su ? 'selected' : ''}>${esc(su)}</option>`).join('')}</select></label>
      <div class="ac-wheels">${wheel('ac-from', 'ساعت شروع', it?.from || '16:00')}${wheel('ac-to', 'ساعت پایان', it ? (it.to === '24:00' ? '00:00' : it.to) : '17:00')}</div>
      <p class="ac-prev" id="ac-prev" aria-live="polite"></p>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="save">${it ? 'ذخیره' : 'افزودن'}</button>${it ? '<button class="btn danger" id="del">حذف</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      const kind = () => root.querySelector('input[name=ac-k]:checked').value;
      const showSub = () => { root.querySelector('#ac-sub-f').hidden = kind() !== 'study'; };
      const prev = () => { const f = w.get('ac-from'), t = w.get('ac-to'), len = (toMin(t) - toMin(f) + 1440) % 1440;
        root.querySelector('#ac-prev').textContent = len ? `${ACT[kind()].l} از ⁦${digits(f)}⁩ تا ⁦${digits(t)}⁩${toMin(t) <= toMin(f) ? ' (تا روز بعد)' : ''} · ${hrs(len)}` : 'ساعت شروع و پایان یکی است.'; };
      const w = wireWheels(root, prev);
      root.querySelectorAll('input[name=ac-k]').forEach(r => r.onchange = () => { showSub(); prev(); });
      showSub(); setTimeout(prev, 60);
      if (it) root.querySelector('#del').onclick = () => { const l = listOf(p, cur.day), i = l.findIndex(a => a.id === it.id); if (i >= 0) l.splice(i, 1); done('حذف شد.'); };
      root.querySelector('#save').onclick = () => {
        const f = w.get('ac-from'), t = w.get('ac-to');
        if (f === t) return UI.invalid(root.querySelector('#ac-to .wh-col'), 'ساعت پایان را با ساعت شروع یکی نگذارید.');
        const sel = it ? [cur.day] : [...root.querySelectorAll('.chips input:checked')].map(c => c.value);
        if (!sel.length) return UI.invalid(root.querySelector('.ac-fs .chips'), 'دست‌کم یک روز را انتخاب کنید.');
        if (it) { const l = listOf(p, cur.day), i = l.findIndex(a => a.id === it.id); if (i >= 0) l.splice(i, 1); }
        sel.forEach(day => add(p, day, f, t, kind(), root.querySelector('#ac-sub').value));
        done(it ? 'ذخیره شد.' : `${fa(sel.length)} روز ثبت شد.`);
      };
    });
  }
  return { ACTS, week, modal, minutesOf, toMin, wheel, wireWheels };
})();
