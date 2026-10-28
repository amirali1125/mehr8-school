// The grade-9 profile of Mehr-e Hashtom (js/data-mehr8-9-profile.js) drawn inside the counsellor's student file:
// each test chapter with its raw data, the summary and strategy, the session digest and last year's records.
// Read-only; mirrors the sections and labels of the profile site. The principal (ro) never sees parts marked
// hide: ['modir'] or the session digest, as on the site.
const Profile9 = (() => {
  const { esc, fa } = UI;
  const P = typeof PROFILE_MEHR8_9 === 'undefined' ? null : PROFILE_MEHR8_9;
  const norm = s => String(s || '').replace(/[‌‏\s]+/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const BY = P ? Object.fromEntries(Object.entries(P.students).map(([n, s]) => [norm(n), s])) : {};
  const byName = name => P && (P.students[name] || BY[norm(name)]) || null;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]).replace(/(\d|[۰-۹])\.(?=[۰-۹])/g, '$1٫');
  // Text of the profile: ==x== is a highlight, new lines stay.
  const tx = s => digits(esc(s ?? '')).replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\n/g, '<br>');
  const num = x => x == null || x === '' ? '—' : digits(typeof x === 'number' ? Math.round(x * 100) / 100 : x);
  const list = a => (a || []).length ? `<ul class="pf-list">${a.map(x => `<li>${tx(x)}</li>`).join('')}</ul>` : '';
  const TAG = { confirmed: ['ok', 'تأییدشده با چند منبع'], care: ['warn', 'جای مراقبت'], self: ['blue', 'از خودسنجی'] };
  const tags = a => (a || []).length ? `<div class="pf-tags">${a.map(t => { const k = TAG[t.kind] || (t.care ? TAG.care : null);
    return `<span class="tag ${k ? k[0] : 'grey'}"${k ? ` title="${k[1]}"` : ''}>${tx(t.t)}</span>`; }).join('')}</div>` : '';
  const SRC = '<span class="muted small"> · از پروفایل استعدادسنجی پاییز ۱۴۰۵</span>';
  const box = (title, inner, open = true, cls = '') => inner ? `<details class="card pf ${cls}" ${open ? 'open' : ''}><summary><h2 class="pf-title">${title}</h2>${SRC}</summary><div class="pf-body">${inner}</div></details>` : '';
  const kvTable = (rows, label) => rows.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(label)}"><table class="no-cards pf-kv">${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`).join('')}</table></div>` : '';
  const grid = (head, rows, label) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(label)}"><table class="no-cards pf-grid"><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr>
    ${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</table></div>`;

  // One analysis chapter (neo, gardner, holland, math, transcript), in the order of the profile site.
  function chapter(c, label, extra = '') {
    if (!c) return '';
    const three = [['قوت‌ها', c.strengths, 'ok'], ['جای مراقبت', c.cares, 'warn'], ['چه کنیم', c.actions, 'blue']].filter(x => (x[1] || []).length);
    const det = (c.details || []).map(x => `<details class="pf-det"><summary><b>${tx(x.h)}</b>${x.score != null ? ` <span class="num">${num(x.score)}${x.of ? ` از ${num(x.of)}` : ''}</span>` : ''}${x.sub ? ` <span class="muted small">${tx(x.sub)}</span>` : ''}</summary>
      ${(x.paras || []).map(p => `<p>${tx(p)}</p>`).join('')}${(x.cells || []).length ? `<dl class="pf-cells">${x.cells.map(k => `<div><dt>${tx(k.k)}</dt><dd>${tx(k.v)}</dd></div>`).join('')}</dl>` : ''}</details>`).join('');
    const secs = (c.sections || []).map(s => `<h3 class="pf-h">${tx(s.h)}</h3>${(s.items || []).map(i => `<div class="pf-item"><b>${tx(i.h)}</b><p>${tx(i.p)}</p></div>`).join('')}
      ${(s.fits || []).length ? `<ul class="pf-fits">${s.fits.map(f => `<li><b>${tx(f.name)}</b> <span class="tag ${FIT[f.fit] || 'grey'}">همخوانی ${tx(f.fit)}</span><div class="small">${tx(f.why)}</div></li>`).join('')}</ul>` : ''}`).join('');
    return box(`تحلیل ${label}`, `${c.headline ? `<p class="pf-lead">${tx(c.headline)}</p>` : ''}${tags(c.tags)}
      ${c.validity ? `<p class="note pf-valid"><b>اعتبار پاسخ‌ها:</b> ${tx(c.validity)}</p>` : ''}
      ${(c.glance || []).length ? `<h3 class="pf-h">در یک نگاه</h3><div class="pf-glance">${c.glance.map(g => `<div><b>${tx(g.h)}</b><p>${tx(g.p)}</p></div>`).join('')}</div>` : ''}
      ${three.length ? `<div class="pf-three">${three.map(([h, a, t]) => `<div class="pf-col tone-${t}"><h3>${h}</h3>${list(a)}</div>`).join('')}</div>` : ''}
      ${(c.combos || []).length ? `<h3 class="pf-h">${tx(c.combosTitle || 'ترکیب‌ها')}</h3><div class="pf-glance">${c.combos.map(x => `<div class="${x.care ? 'care' : ''}"><b>${tx(x.h)}</b><p>${tx(x.p)}</p></div>`).join('')}</div>` : ''}
      ${det ? `<h3 class="pf-h">${tx(c.detailTitle || 'جزئیات')}</h3>${det}` : ''}${secs}${extra}`, true, 'pf-chapter');
  }
  const FIT = { 'خوب': 'ok', 'متوسط': 'blue', 'کم': 'warn' };

  // Raw data of each test, every field the profile site keeps.
  const RIASEC = { R: 'واقع‌گرا (R)', I: 'جستجوگر (I)', A: 'هنری (A)', S: 'اجتماعی (S)', E: 'اقتصادی‌مدیریتی (E)', C: 'قراردادی (C)' };
  const NEO = { N: 'حساسیت هیجانی', E: 'برون‌گرایی', O: 'گشودگی', A: 'توافق‌پذیری', C: 'وجدان‌گرایی' };
  const answers = (obj, label) => `<div class="pf-ans" role="list" aria-label="${esc(label)}">${Object.entries(obj).map(([k, v]) => `<span role="listitem"><i>${num(+k + (Array.isArray(obj) ? 1 : 0))}</i>${v == null ? '—' : num(v)}</span>`).join('')}</div>`;
  function raw(key, r) {
    if (!r) return '';
    let html = '';
    if (key === 'neo') {
      html = grid(['عامل', 'نمره (۱۰ تا ۵۰)', 'سطح'], Object.keys(NEO).filter(k => r.scores?.[k] != null).map(k => [esc(NEO[k]), num(r.scores[k]), tx(r.levels?.[k] || '—')]), 'نمره‌های پنج عامل')
        + kvTable([['اعتبار', tx(r.validity || '—')], ['پرسش بی‌پاسخ', num(r.missing)], ['پاسخ‌های افراطی', num(r.extreme)], ['ناهمسانی پاسخ‌ها', num(r.inconsistency)],
          r.majorGuess && ['حدس رشته از نیمرخ', tx(r.majorGuess)], r.note && ['یادداشت', tx(r.note)]].filter(Boolean), 'اعتبار نئو')
        + (r.clusters ? `<h3 class="pf-h">خوشه‌های هر عامل (میانگین از ۵)</h3><div class="pf-clusters">${Object.entries(r.clusters).map(([k, a]) => `<div><b>${esc(NEO[k] || k)}</b>${a.map(x => `<div class="tbar"><span>${tx(x.label)}</span><div class="bar"><i style="width:${(x.mean - 1) / 4 * 100}%"></i></div><b class="num">${num(x.mean)}</b><span></span></div>`).join('')}</div>`).join('')}</div>` : '')
        + (r.items ? `<h3 class="pf-h">پاسخ به ${num(Object.keys(r.items).length)} پرسش (۱ تا ۵)</h3>${answers(r.items, 'پاسخ‌های نئو')}` : '');
    } else if (key === 'gardner') {
      html = grid(['هوش', 'خودسنجی', 'انتخاب در موقعیت‌ها'], Object.keys(r.scores || {}).map(k => [esc(k), num(r.scores[k]), num(r.choices?.[k])]), 'نمره‌های گاردنر')
        + kvTable([['میانگین خودسنجی', num(r.selfMean)], ['سه هوش برتر', tx(r.top3)], ['قوت نسبی', tx(r.relStrong)], ['ضعف نسبی', tx(r.relWeak)], ['شکل نیمرخ', tx(r.shape)], ['دقت خودشناسی', tx(r.accuracy)], r.note && ['یادداشت', tx(r.note)]].filter(Boolean), 'خلاصهٔ گاردنر');
    } else if (key === 'holland') {
      const P4 = [['activities', 'فعالیت‌ها'], ['abilities', 'توانایی‌ها'], ['jobs', 'شغل‌ها'], ['self', 'خودسنجی']].filter(([k]) => r.parts?.[k]);
      html = grid(['تیپ', 'جمع', ...P4.map(x => x[1])], Object.keys(RIASEC).map(k => [esc(RIASEC[k]), num(r.scores?.[k]), ...P4.map(([p]) => num(r.parts[p][k]))]), 'نمره‌های هالند')
        + kvTable([['کد', esc(r.code || '—')], ['تمایز', num(r.differentiation)], ...Object.entries(r.bullets || {}).map(([k, x]) => [k, tx(x)]),
          ...[['رشتهٔ مدنظر', r.wantedMajor], ['نظر خانواده', r.family], ['شغل‌هایی که نوشته', r.jobs], ['همخوانی', r.fit], ['اولویت جلسهٔ فردی', r.priority]]
            .filter(([k, x]) => x && !Object.values(r.bullets || {}).includes(x)).map(([k, x]) => [k, tx(x)])], 'خلاصهٔ هالند');
    } else if (key === 'math') {
      html = kvTable([['نمره از ۲۰', num(r.total)], ['نمرهٔ مباحث پایه', num(r.core)], ['درصد مباحث پایه', `${num(r.corePct)}٪`], ['سطح', tx(r.level)], ['پرسش بی‌پاسخ', num(r.blank)],
          ['پرسش‌های نیازمند بازبینی', tx(r.review)], ['اعتبار', tx(r.validity)], r.note && ['یادداشت', tx(r.note)]].filter(Boolean), 'خلاصهٔ پیش‌نیازسنج')
        + grid(['حوزه', 'نمره', 'از'], Object.entries(r.domains || {}).map(([k, [g, m]]) => [esc(k), num(g), num(m)]), 'حوزه‌های پیش‌نیازسنج')
        + (r.q ? `<h3 class="pf-h">نمرهٔ هر پرسش (۰، نیم یا ۱)</h3>${answers(r.q, 'نمرهٔ پرسش‌ها')}` : '');
    } else if (key === 'transcript') {
      const T = [['g7', 'هفتم'], ['g8s1', 'هشتم، نیمسال اول'], ['g8s2', 'هشتم، نیمسال دوم'], ['exam8', 'آزمون پایانی هشتم']].filter(([k]) => r[k] && Object.keys(r[k]).length);
      html = T.map(([k, l]) => `<h3 class="pf-h">${l}</h3>${grid(['', ...Object.keys(r[k])], [['نمره', ...Object.values(r[k]).map(num)]], l)}`).join('')
        + kvTable([['ریاضی آزمون پایانی (از ۲۰)', num(r.mathExam20)], ['فاصلهٔ نمرهٔ مدرسه و آزمون', num(r.gap)], ['تغییر ریاضی', num(r.mathChange)], ['روند ریاضی', tx(r.mathTrend)],
          ['شاخص درس‌های علمی', num(r.sciIndex)], ['شاخص درس‌های انسانی', num(r.humIndex)], ['انسانی منهای علمی', num(r.humMinusSci)], r.flag && ['هشدار', tx(r.flag)], r.source && ['منبع', tx(r.source)]].filter(Boolean), 'شاخص‌های کارنامه');
    }
    return html ? `<details class="pf-raw"><summary>داده‌های خام</summary>${html}</details>` : '';
  }

  // Everything of one test key: the analysis chapter and its raw data, as one card.
  const LABEL = { neo: 'نئو', gardner: 'گاردنر', holland: 'هالند', math: 'پیش‌نیازسنج ریاضی', transcript: 'کارنامه‌های هفتم و هشتم' };
  function test(p, key) {
    if (!p) return '';
    const c = p.content?.[key], r = p.raw?.[key];
    if (!c && !r) return '';
    return c ? chapter(c, LABEL[key], raw(key, r)) : box(`داده‌های ${LABEL[key]}`, raw(key, r).replace('<details class="pf-raw">', '<details class="pf-raw" open>'));
  }

  const EVID = ['شخصیت', 'هوش‌ها', 'علاقه‌ها', 'پیش‌نیاز ریاضی', 'کارنامه'];
  const EV = { yes: ['●', 'پشتیبانی می‌کند', 'ok'], part: ['◐', 'تا حدی', 'warn'], no: ['✕', 'خلاف آن را نشان می‌دهد', 'bad'], none: ['·', 'چیزی نمی‌گوید', 'grey'] };
  function summary(p, ro) {
    const s = p?.content?.summary; if (!s) return '';
    const dp = s.deep || {};
    const tri = [['آنچه دیگران در او می‌پسندند', s.liked], ['آنچه برایش مهم است', s.important], ['چطور حمایتش کنیم', s.support]];
    const tr = s.tree || {};
    const tree = `<div class="pf-tree"><p class="pf-horizon">${tx(tr.horizon)}</p>${[['شاخه‌ها', 'رشته‌ها و مسیرهای ممکن', tr.branches, 'teal'], ['میوه‌ها', 'آنچه تا امروز به بار آمده', tr.fruits, 'ok'],
      ['تنه', 'توان‌های پایدار', tr.trunk, 'violet'], ['طوفان‌ها', 'آنچه تهدیدش می‌کند', tr.storms, 'warn'], ['ریشه‌ها', 'خانواده و پشتوانه', tr.roots, 'amber']]
      .map(([h, sub, a, t]) => `<div class="pf-col tone-${t}"><h3>${h} <span class="muted small">${sub}</span></h3>${list(a)}</div>`).join('')}</div>`;
    const ev = (s.evidence || []).length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="شواهد از پنج منبع"><table class="no-cards pf-ev"><tr><th scope="col">ویژگی</th>${EVID.map(h => `<th scope="col">${h}</th>`).join('')}</tr>
      ${s.evidence.map(e => `<tr><th scope="row">${tx(e.t)}</th>${e.c.map(x => { const m = EV[x] || EV.none; return `<td><span class="pf-ev-${m[2]}" title="${m[1]}" aria-label="${m[1]}">${m[0]}</span></td>`; }).join('')}</tr>`).join('')}</table></div>
      <p class="muted small">${Object.values(EV).map(m => `<span class="pf-ev-${m[2]}">${m[0]}</span> ${m[1]}`).join(' · ')}</p>` : '';
    const fits = (s.fits || []).map(f => `<div class="pf-fit"><div class="spread"><b>${tx(f.name)}</b><span class="tag ${FIT[f.fit] || 'grey'}">همخوانی ${tx(f.fit)}</span></div><p>${tx(f.p)}</p>
      <div class="pf-two"><div><h4>موافق</h4>${list(f.pro)}</div><div><h4>مخالف</h4>${list(f.con)}</div></div>
      ${f.cond && f.cond !== '—' ? `<p><b>شرط موفقیت:</b> ${tx(f.cond)}</p>` : ''}<p class="note"><b>تا خرداد بسنجید:</b> ${tx(f.measure)}</p></div>`).join('');
    const road = (s.roadmap || []).length ? grid(['', 'از همین هفته', 'تا پایان نیمسال اول', 'تا انتخاب رشته'], s.roadmap.map(r => [tx(r.who), ...r.cols.map(tx)]), 'نقشهٔ راه') : '';
    const plans = (s.sessions || []).map(x => `<details class="pf-det"><summary><b>${tx(x.title)}</b> <span class="muted small">${tx(x.sub)}</span></summary>
      <p><b>هدف:</b> ${tx(x.goal)}</p>${(x.axes || []).map(a => `<div class="pf-item"><b>${tx(a.h)}</b><p>${tx(a.p)}</p></div>`).join('')}
      <div class="pf-two"><div><h4>پرسش‌هایی برای شروع</h4>${list(x.questions)}</div><div><h4>به این‌ها گوش بدهید</h4>${list(x.listen)}<h4>پرهیز کنید</h4>${list(x.avoid)}</div></div>
      ${(x.followup || []).length ? `<h4>پیگیری</h4>${x.followup.map(a => `<div class="pf-item"><b>${tx(a.h)}</b><p>${tx(a.p)}</p></div>`).join('')}` : ''}</details>`).join('');
    const agency = dp.agency ? `<div class="pf-item"><b>نقش خودش در تصمیم: <span class="tag blue">${tx(dp.agency.level)}</span></b><p>${tx(dp.agency.p)}</p></div>` : '';
    return box('جمع‌بندی پروفایل', `${p.content._priority ? `<p class="note"><b>اولویت پیگیری:</b> ${tx(p.content._priority)}</p>` : ''}<p class="pf-lead">${tx(s.headline)}</p>${tags(s.tags)}
      <p class="muted small">${Object.values(TAG).map(([t, l]) => `<span class="tag ${t}">${l}</span>`).join(' ')}</p>
      ${(dp.picture || []).length ? `<h3 class="pf-h">تصویر یکپارچه</h3>${dp.picture.map(x => `<p>${tx(x)}</p>`).join('')}` : ''}
      ${(dp.axes || []).length ? `<h3 class="pf-h">نگاه روان‌شناختی و تربیتی</h3>${dp.axes.map(a => `<div class="pf-item"><b>${tx(a.h)}</b><p>${tx(a.p)}</p></div>`).join('')}` : ''}
      ${dp.toTeachers ? `<h3 class="pf-h">به معلم‌هایش بگوییم</h3><p>${tx(dp.toTeachers)}</p>` : ''}
      ${dp.protect || dp.risk || dp.watch ? `<div class="pf-three"><div class="pf-col tone-ok"><h3>محافظ‌ها</h3>${list(dp.protect)}</div><div class="pf-col tone-warn"><h3>عوامل خطر</h3>${list(dp.risk)}</div><div class="pf-col tone-bad"><h3>نشانه‌های هشدار</h3>${list(dp.watch)}</div></div>` : ''}
      ${(dp.mismatch || []).length ? `<h3 class="pf-h">ناهمخوانی‌ها</h3>${dp.mismatch.map(a => `<div class="pf-item"><b>${tx(a.h)}</b><p>${tx(a.p)}</p></div>`).join('')}` : ''}${agency}
      <div class="pf-three">${tri.map(([h, a], i) => `<div class="pf-col tone-${['teal', 'violet', 'blue'][i]}"><h3>${h}</h3>${list(a)}</div>`).join('')}</div>
      <h3 class="pf-h">درخت زندگی تحصیلی</h3>${tree}
      ${[['ریاضی', s.mathNote], ['روند نمره‌ها', s.trendNote], ['علاقه‌ها', s.hollandNote]].filter(x => x[1]).map(([h, x]) => `<p><b>${h}:</b> ${tx(x)}</p>`).join('')}
      ${ev ? `<h3 class="pf-h">هر برداشت چقدر پشتوانه دارد؟</h3>${ev}` : ''}
      ${fits ? `<h3 class="pf-h">کدام رشته؟</h3>${fits}` : ''}
      ${road ? `<h3 class="pf-h">نقشهٔ راه</h3>${road}` : ''}
      ${plans ? `<h3 class="pf-h">طرح جلسه‌های پیشنهادی</h3>${plans}` : ''}`, true, 'pf-summary') + (ro ? '' : insight(p));
  }

  // What the sessions so far add up to; for the counsellor only, never the principal.
  function insight(p) {
    const s = p?.content?.sessionsInsight; if (!s) return '';
    const n = s.n || {};
    return box('جمع‌بندی جلسه‌ها تا امروز', `<p class="muted small">از روی شرح ${num((n.f || 0) + (n.t || 0) + (n.k || 0))} جلسه (فردی ${num(n.f || 0)}، تحصیلی ${num(n.t || 0)}، خانواده ${num(n.k || 0)}) تا ${num(s.asOf)} · فقط برای معلم راهنما؛ مدیر این بخش را نمی‌بیند.</p>
      <p>${tx(s.picture)}</p>${(s.themes || []).length ? `<div class="pf-tags">${s.themes.map(t => `<span class="tag violet">${tx(t)}</span>`).join('')}</div>` : ''}
      <h3 class="pf-h">نسبت با پروفایل آزمون‌ها</h3><p>${tx(s.vsProfile)}</p><h3 class="pf-h">کجا هستیم</h3><p>${tx(s.progress)}</p>
      <h3 class="pf-h">تمرکز جلسه‌های بعد</h3>${list(s.next)}`, true, 'pf-insight');
  }

  // Last year's description and family/personal sessions from the guidance notebook, with the photos of its pages.
  const SEED = { prev: ['سال قبل', 'amber'], khanevade: ['خانواده', 'rose'], fardi: ['فردی', 'teal'], tahsili: ['تحصیلی', 'violet'] };
  function seeds(p, ro) {
    const all = (p?.seed || []).map(r => ({ ...r, parts: (r.parts || []).filter(x => !(ro && (x.hide || []).includes('modir'))) }));
    const hidden = all.reduce((a, r) => a + ((p.seed.find(x => x.id === r.id).parts || []).length - r.parts.length), 0);
    if (!all.length) return '';
    const shown = all.filter(r => r.parts.length || r.text || (!ro && (r.imgs || []).length));
    return box('سوابق دفتر مشاوره (سال هشتم و مهر ۱۴۰۵)', `${ro && hidden ? `<p class="note">${num(hidden)} یادداشت محرمانه است و برای مدیر نمایش داده نمی‌شود.</p>` : ''}
      ${shown.length ? `<ul class="timeline">${shown.sort((a, b) => b.date.localeCompare(a.date)).map(r => { const t = SEED[r.type] || [r.type, 'grey'];
        return `<li><div><span class="tag" style="background:var(--${t[1]}-bg);color:var(--${t[1]})">${t[0]}</span> <b>${tx(r.title)}</b></div>
        <div class="meta">${num(r.date)}${r.by ? ` · ${tx(r.by)}` : ''}${r.who ? ` · حاضران: ${tx(r.who)}` : ''}</div>
        ${r.text ? `<p class="pf-p">${tx(r.text)}</p>` : ''}${r.parts.filter(x => x.f !== 'next').map(x => `<p class="pf-p">${tx(x.t)}</p>`).join('')}
        ${[r.next, ...r.parts.filter(x => x.f === 'next').map(x => x.t)].filter(Boolean).map(x => `<div class="next"><b>قدم بعدی:</b> ${tx(x)}</div>`).join('')}
        ${!ro && (r.imgs || []).length ? `<div class="pf-imgs">${r.imgs.map((src, i) => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="عکس صفحهٔ ${num(i + 1)} دفترچه، ${esc(r.title)}" loading="lazy"></a>`).join('')}</div>` : ''}</li>`; }).join('')}</ul>`
        : '<p class="muted">یادداشتی برای نمایش نیست.</p>'}`, true, 'pf-seed');
  }

  // Sessions held so far, by kind, as counted in the profile file (sessionsInsight.n: f individual, t academic, k family).
  const counts = p => { const n = p?.content?.sessionsInsight?.n || {}; return { fardi: n.f || 0, tahsili: n.t || 0, khanevade: n.k || 0 }; };
  return { byName, counts, photo: name => byName(name)?.photo || '', test, summary, insight, seeds, meta: P?.meta };
})();
