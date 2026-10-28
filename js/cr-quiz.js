// The quiz of the class pages (Moodle's Quiz), used by classroom.js.
//   Settings: timing (open, close, time limit, what happens when time runs out, grace period), grade (category, pass, maximum,
//   attempts, grading method), layout (questions per page, free or sequential navigation), question behaviour (shuffle answers,
//   deferred / immediate / interactive feedback, each attempt builds on the last), review options (8 items × 4 moments),
//   appearance (student photo, decimals), Safe Exam Browser, extra restrictions (password, delays, browser security)
//   and overall feedback by grade boundaries.
//   Questions are multiple choice with a mark, per-option («ویژه») and general feedback; they can be copied from the question bank.
//   Teacher page: «سؤال‌ها» and «نتیجه‌ها» (attempts, grades, analysis of each question).
// Data on the item: qs: [{ id, text, mark, options: [{ t, fb }], answer, gfb }], att: { [sid]: [attempt] };
//   attempt: { id, n, start, end, state: inprogress | overdue | finished | abandoned, order, opt, ans, chk, sum, pct }.
const CRQuiz = api => {
  const { esc, fa, modal, toast } = UI;
  const { K, d, save, render, state, find, scope, ro, done, sync } = api;
  const REV = [['attempt', 'تلاش برای حل آزمون'], ['correct', 'درستی پاسخ'], ['maxmarks', 'نمرهٔ کامل'], ['marks', 'نمرات'], ['specific', 'بازخورد ویژه'], ['general', 'بازخورد عمومی'], ['right', 'پاسخ صحیح'], ['overall', 'بازخورد کلی']];
  const WHEN = [['during', 'در حین انجام آزمون'], ['immediately', 'بلافاصله بعد از انجام آزمون'], ['open', 'بعداً، هنگامی که آزمون هنوز باز است'], ['closed', 'بعد از بسته شدن آزمون']];
  const all = v => Object.fromEntries(REV.map(([k]) => [k, v]));
  const UNITS = [[3600, 'ساعت'], [60, 'دقیقه'], [1, 'ثانیه']];
  const METHOD = [['highest', 'بالاترین نمره'], ['avg', 'میانگین نمرات'], ['first', 'اولین تلاش'], ['last', 'آخرین تلاش']];
  const BEH = [['deferred', 'بازخورد تعویق‌افتاده'], ['immediate', 'بازخورد فوری'], ['interactive', 'حالت تعاملی با چند تلاش']];
  const TRIES = 3;
  let timer = null;

  const defaults = () => ({ open: null, close: null, limit: 0, overdue: 'autosubmit', grace: 0, attempts: 0,
    grade: { cat: 'quiz', pass: '', max: 20, method: 'highest' }, perPage: 1, nav: 'free', shuffle: true, behaviour: 'deferred', eachBuilds: false,
    review: { during: { ...all(true), overall: false }, immediately: all(true), open: all(true), closed: all(true) },
    photo: 'none', decimals: 2, qdecimals: -1, seb: false, password: '', delay1: 0, delay2: 0, browserSec: false,
    ofb: [{ min: 0, fb: '' }], qs: [], att: {}, comp: { mode: 'auto', view: true, minAtt: 1 } });

  /* ---------------- settings form ---------------- */
  const dur = (id, secs, label) => { const u = UNITS.find(([n]) => secs && secs % n === 0) || UNITS[1];
    return `<div class="row"><input class="input num" style="width:90px" id="${id}-n" value="${secs ? secs / u[0] : 0}" aria-label="${esc(label)}">${K.sel(id + '-u', UNITS, u[0], `واحد ${label}`)}</div>`; };
  const readDur = (root, id) => Math.round((K.num(K.v(root, id + '-n')) || 0) * +K.v(root, id + '-u'));
  const ofbRow = (r, i) => `<div class="ofb-row"><label class="small">حد نمره (٪) <input class="input num sm" style="width:70px" data-ob="${i}" value="${r.min}" aria-label="حد نمرهٔ ردیف ${fa(i + 1)}"></label>
    <textarea class="input" rows="2" data-of="${i}" aria-label="بازخورد ردیف ${fa(i + 1)}" placeholder="بازخورد برای نمرهٔ بالاتر از این حد">${esc(r.fb)}</textarea></div>`;
  function form(it, { generalHead }) {
    const r = it.review;
    return K.sec('عمومی', generalHead(it, 'نام'))
      + K.sec('زمان‌بندی', K.row('باز کردن آزمون', K.dt('q-open', it.open, 'باز کردن آزمون')) + K.row('بستن آزمون', K.dt('q-close', it.close, 'بستن آزمون'))
        + K.row('محدودیت زمانی', `<div class="row">${K.chk('q-lim-on', it.limit > 0, 'فعال‌سازی')}${dur('q-lim', it.limit || 1800, 'محدودیت زمانی')}</div>`)
        + K.row('هنگامی که زمان به پایان می‌رسد', K.sel('q-od', [['autosubmit', 'تلاش‌های باز برای حل آزمون به صورت خودکار ثبت می‌شود'], ['grace', 'یک دورهٔ مهلت وجود دارد که در آن تلاش‌های باز ثبت می‌شوند، اما به سؤال‌ها نمی‌توان پاسخ داد'],
          ['abandon', 'تلاش‌ها باید پیش از پایان زمان ثبت شوند، در غیر این صورت حساب نمی‌شوند']], it.overdue), '', 'q-od')
        + `<div class="q-grace" ${it.overdue === 'grace' ? '' : 'hidden'}>${K.row('دورهٔ مهلت ثبت', dur('q-gr', it.grace || 300, 'دورهٔ مهلت'))}</div>`)
      + K.sec('نمره', K.row('دستهٔ نمره', K.sel('q-cat', [['', 'دسته‌بندی نشده'], ...SchoolData.MARK_TYPES], it.grade.cat), 'نمرهٔ نهایی هر دانش‌آموز با همین نوع به «ثبت نمره» می‌رود.', 'q-cat')
        + K.row('حداکثر نمره', `<input class="input num" id="q-max" value="${it.grade.max}">`, 'جمع نمرهٔ سؤال‌ها به همین عدد تبدیل می‌شود.', 'q-max')
        + K.row('نمره برای موفقیت', `<input class="input num" id="q-pass" value="${esc(it.grade.pass)}">`, '', 'q-pass')
        + K.row('تلاش‌های پی در پی برای حل آزمون مجاز است', K.sel('q-att', [[0, 'نامحدود'], ...[...Array(10)].map((_, i) => [i + 1, fa(i + 1)])], it.attempts), '', 'q-att')
        + K.row('روش تصحیح', K.sel('q-gm', METHOD, it.grade.method), 'وقتی چند تلاش مجاز است، نمرهٔ نهایی کدام باشد.', 'q-gm'))
      + K.sec('ساختار', K.row('صفحهٔ جدید', K.sel('q-pp', [[1, 'هر سؤال'], ...[2, 3, 4, 5, 10].map(n => [n, `هر ${fa(n)} سؤال`]), [0, 'هرگز، همهٔ سؤال‌ها در یک صفحه']], it.perPage), '', 'q-pp')
        + K.row('روش پیمایش', K.sel('q-nav', [['free', 'آزاد'], ['seq', 'ترتیبی']], it.nav), 'ترتیبی: برگشت به صفحه‌های قبل ممکن نیست.', 'q-nav'), false)
      + K.sec('رفتار سؤال', K.row('به هم ریختن گزینه‌های داخل سؤال‌ها', K.yn('q-sh', it.shuffle), '', 'q-sh')
        + K.row('سؤال‌ها چطور رفتار می‌کنند', K.sel('q-beh', BEH, it.behaviour), 'فوری: دانش‌آموز هر سؤال را «بررسی» می‌کند و درستی را همان لحظه می‌بیند. تعاملی: تا سه بار دوباره امتحان می‌کند و هر تلاش نادرست یک‌سوم نمره را کم می‌کند.', 'q-beh')
        + K.row('هر تلاش بر پایهٔ تلاش قبلی ساخته شود', K.yn('q-eb', it.eachBuilds), 'پاسخ‌های تلاش قبلی در تلاش تازه آماده است.', 'q-eb'), false)
      + K.sec('تنظیمات مرور', `<p class="small muted" style="margin:0 0 8px">دانش‌آموز در هر زمان چه چیزهایی را در مرور تلاش خودش ببیند.</p><div class="q-rev">${WHEN.map(([w, wl]) => `<fieldset class="cr-fs q-rcol" data-when="${w}" ${w === 'during' && it.behaviour === 'deferred' ? 'disabled' : ''}><legend class="small"><b>${wl}</b></legend>
        ${REV.map(([k, l]) => `<label class="cr-chk small"><input type="checkbox" data-rv="${w}.${k}" ${r[w][k] ? 'checked' : ''} ${w === 'during' && (k === 'attempt' || k === 'overall') ? 'disabled' : ''}> ${l}</label>`).join('')}</fieldset>`).join('')}</div>`, false)
      + K.sec('ظاهر', K.row('نمایش عکس کاربر', K.sel('q-ph', [['none', 'بدون تصویر'], ['small', 'تصویر کوچک'], ['large', 'تصویر بزرگ']], it.photo), '', 'q-ph')
        + K.row('محل اعشار در نمرات', K.sel('q-dec', [0, 1, 2, 3, 4, 5].map(n => [n, fa(n)]), it.decimals), '', 'q-dec')
        + K.row('محل اعشار در نمرهٔ سؤال‌ها', K.sel('q-qdec', [[-1, 'مانند نمرات'], ...[0, 1, 2, 3, 4, 5, 6, 7].map(n => [n, fa(n)])], it.qdecimals), '', 'q-qdec'), false)
      + K.sec('Safe Exam Browser', K.row('نیاز به استفاده از مرورگر Safe Exam Browser', K.yn('q-seb', it.seb), 'آزمون فقط در مرورگر امن SEB شروع می‌شود (مرورگر از روی نشانی خودش شناخته می‌شود).', 'q-seb'), false)
      + K.sec('محدودیت‌های بیشتر روی تلاش‌ها', K.row('رمز عبور لازم است', `<div class="row"><input class="input" id="q-pw" type="password" value="${esc(it.password)}" autocomplete="off" style="flex:1"><button type="button" class="btn sm" data-pw-eye aria-pressed="false">نمایش</button></div>`, 'دانش‌آموز پیش از هر تلاش باید این رمز را وارد کند (مثلاً رمزی که سر جلسه اعلام می‌شود).', 'q-pw')
        + K.row('فاصلهٔ اجباری بین تلاش اول و دوم', dur('q-d1', it.delay1, 'فاصلهٔ تلاش اول و دوم')) + K.row('فاصلهٔ اجباری بین تلاش‌های بعدی', dur('q-d2', it.delay2, 'فاصلهٔ تلاش‌های بعدی'))
        + K.row('امنیت مرورگر', K.sel('q-bs', [['0', 'هیچ'], ['1', 'پنجرهٔ تمام‌صفحه با کمی امنیت جاوااسکریپت']], it.browserSec ? '1' : '0'), 'تمام‌صفحه، و کپی و کلیک راست هنگام آزمون بسته می‌شود.', 'q-bs'), false)
      + K.sec('بازخورد کلی', `<p class="small muted" style="margin:0 0 8px">متنی که دانش‌آموز پس از آزمون، بسته به درصد نمره‌اش، می‌بیند. ردیف با حد ۰٪ همیشه هست.</p>
        <div id="ofb-box">${it.ofb.slice().sort((a, b) => b.min - a.min).map(ofbRow).join('')}</div><button type="button" class="btn sm" data-ofb-add>افزودن فیلد بازخورد بیشتر</button>`, false);
  }
  function wireForm(root) {
    root.querySelector('#q-beh').addEventListener('change', e => { root.querySelector('[data-when="during"]').disabled = e.target.value === 'deferred'; });
    root.querySelector('#q-od').addEventListener('change', e => { root.querySelector('.q-grace').hidden = e.target.value !== 'grace'; });
    root.querySelector('[data-pw-eye]').addEventListener('click', e => { const i = root.querySelector('#q-pw'), sh = i.type === 'password'; i.type = sh ? 'text' : 'password'; e.target.setAttribute('aria-pressed', String(sh)); e.target.textContent = sh ? 'پنهان' : 'نمایش'; });
    root.querySelector('[data-ofb-add]').addEventListener('click', () => { const box = root.querySelector('#ofb-box'); box.insertAdjacentHTML('afterbegin', ofbRow({ min: 50, fb: '' }, box.children.length)); box.querySelector('input').focus(); });
  }
  function readForm(root, o) {
    const v = id => K.v(root, id);
    const open = K.readDt(root, 'q-open'), close = K.readDt(root, 'q-close');
    if (open && close && close <= open) return ['#q-close-t', 'بستن آزمون باید بعد از باز کردن آن باشد.'];
    const limit = K.on(root, 'q-lim-on') ? readDur(root, 'q-lim') : 0;
    if (K.on(root, 'q-lim-on') && limit < 60) return ['#q-lim-n', 'محدودیت زمانی دست‌کم یک دقیقه است.'];
    const max = K.num(v('q-max')); if (!(max > 0 && max <= 100)) return ['#q-max', 'حداکثر نمره بین ۱ و ۱۰۰.'];
    const pass = v('q-pass') === '' ? '' : K.num(v('q-pass')); if (pass !== '' && !(pass >= 0 && pass <= max)) return ['#q-pass', `نمرهٔ قبولی بین ۰ و ${fa(max)}.`];
    const ofb = [...root.querySelectorAll('.ofb-row')].map(r => ({ min: K.num(r.querySelector('[data-ob]').value), fb: r.querySelector('[data-of]').value.trim() }));
    const badB = ofb.find(r => !(r.min >= 0 && r.min <= 100)); if (badB) return [root.querySelector('[data-ob]'), 'حد نمره باید بین ۰ و ۱۰۰ باشد.'];
    if (!ofb.some(r => r.min === 0)) ofb.push({ min: 0, fb: '' });
    const review = Object.fromEntries(WHEN.map(([w]) => [w, Object.fromEntries(REV.map(([k]) => [k, !!root.querySelector(`[data-rv="${w}.${k}"]`).checked]))]));
    review.during.attempt = true;
    Object.assign(o, { open, close, limit, overdue: v('q-od'), grace: v('q-od') === 'grace' ? readDur(root, 'q-gr') : 0, attempts: +v('q-att'),
      grade: { cat: v('q-cat'), pass, max, method: v('q-gm') }, perPage: +v('q-pp'), nav: v('q-nav'), shuffle: v('q-sh') === '1', behaviour: v('q-beh'), eachBuilds: v('q-eb') === '1',
      review, photo: v('q-ph'), decimals: +v('q-dec'), qdecimals: +v('q-qdec'), seb: v('q-seb') === '1', password: root.querySelector('#q-pw').value, delay1: readDur(root, 'q-d1'), delay2: readDur(root, 'q-d2'),
      browserSec: v('q-bs') === '1', ofb: ofb.sort((a, b) => b.min - a.min) });
    return null;
  }

  /* ---------------- scoring ---------------- */
  const total = it => it.qs.reduce((a, q) => a + (q.mark || 1), 0);
  const qScore = (it, att, q) => {
    const a = att.ans[q.id]; if (a == null || a !== q.answer) return 0;
    if (it.behaviour === 'interactive') { const tr = att.chk?.[q.id]?.tries || 1; return (q.mark || 1) * Math.max(0, 1 - (tr - 1) / TRIES); }
    return q.mark || 1;
  };
  function finish(it, att, st = 'finished') {
    att.end = K.now(); att.state = st;
    const qs = att.order.map(id => it.qs.find(q => q.id === id)).filter(Boolean);
    att.sum = qs.reduce((a, q) => a + qScore(it, att, q), 0); att.pct = total(it) ? att.sum / total(it) * 100 : 0;
  }
  const finished = (it, sid) => (it.att?.[sid] || []).filter(a => a.state === 'finished');
  const used = (it, sid) => !!it.attempts && (it.att?.[sid] || []).filter(a => a.state !== 'inprogress').length >= it.attempts;
  const round = (n, dec) => Math.round(n * 10 ** dec) / 10 ** dec;
  function grade(it, sid) {
    const f = finished(it, sid); if (!f.length) return null;
    const ps = f.map(a => a.pct), m = it.grade.method;
    const pct = m === 'avg' ? ps.reduce((a, b) => a + b, 0) / ps.length : m === 'first' ? ps[0] : m === 'last' ? ps[ps.length - 1] : Math.max(...ps);
    const score = round(pct / 100 * it.grade.max, it.decimals);
    return { score, pct, text: `${fa(score)} از ${fa(it.grade.max)}` };
  }
  // When an attempt must end: the time limit or the quiz's closing, whichever is first.
  const deadline = (it, att) => { const lim = it.limit ? new Date(new Date(att.start).getTime() + it.limit * 1000) : null, cl = it.close ? new Date(it.close) : null;
    return lim && cl ? (lim < cl ? lim : cl) : lim || cl; };
  const durText = secs => { const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), x = secs % 60; return [h && `${fa(h)} ساعت`, m && `${fa(m)} دقیقه`, x && `${fa(x)} ثانیه`].filter(Boolean).join(' و '); };
  const clock = secs => { secs = Math.max(0, secs); const p2 = n => String(n).padStart(2, '0'); return K.digits(`${Math.floor(secs / 3600)}:${p2(Math.floor(secs % 3600 / 60))}:${p2(secs % 60)}`); };
  const graceEnd = (it, att) => { const dl = deadline(it, att); return dl && it.overdue === 'grace' ? new Date(dl.getTime() + it.grace * 1000) : null; };
  // Applies «when time runs out» to a running attempt; true when it changed.
  function expire(it, att) {
    if (att.state !== 'inprogress' && att.state !== 'overdue') return false;
    const dl = deadline(it, att), now = new Date(); if (!dl || now < dl) return false;
    if (it.overdue === 'autosubmit') { finish(it, att); return true; }
    if (it.overdue === 'grace') { if (now < graceEnd(it, att)) { if (att.state !== 'overdue') { att.state = 'overdue'; return true; } return false; } att.state = 'abandoned'; att.end = K.now(); return true; }
    att.state = 'abandoned'; att.end = K.now(); return true;
  }
  const slot = (it, att) => (Date.now() - new Date(att.end).getTime() < 120000) ? 'immediately' : (!it.close || K.now() < it.close ? 'open' : 'closed');
  const fmtQ = (it, n) => fa(round(n, it.qdecimals >= 0 ? it.qdecimals : it.decimals));

  /* ---------------- teacher ---------------- */
  function teacher(it) {
    const tab = state.qtab || 'qs';
    const tabs = `<div class="tabs" role="tablist" aria-label="آزمون">${[['qs', `سؤال‌ها (${fa(it.qs.length)})`], ['res', 'نتیجه‌ها'], ['ana', 'تحلیل سؤال‌ها']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="qz-tab" data-id="${k}">${l}</button>`).join('')}</div>`;
    const info = `<div class="card"><div class="row small" style="gap:6px 14px">${[it.open && `باز شدن: ${K.fdt(it.open)}`, it.close && `بسته شدن: ${K.fdt(it.close)}`, it.limit ? `محدودیت زمانی: ${durText(it.limit)}` : 'بدون محدودیت زمانی',
      `تلاش‌ها: ${it.attempts ? fa(it.attempts) : 'نامحدود'}`, `روش تصحیح: ${METHOD.find(m => m[0] === it.grade.method)[1]}`, BEH.find(b => b[0] === it.behaviour)[1], it.password && 'رمز دارد', it.seb && 'فقط با SEB'].filter(Boolean).map(t => `<span class="tag grey">${esc(t)}</span>`).join('')}</div></div>`;
    if (tab === 'res') return info + tabs + results(it);
    if (tab === 'ana') return info + tabs + analysis(it);
    const has = Object.values(it.att || {}).flat().length;
    return info + tabs + `<div class="card"><div class="card-head"><div><h2 style="margin:0">سؤال‌ها</h2><div class="muted small">جمع نمرهٔ سؤال‌ها: ${fmtQ(it, total(it))} · حداکثر نمرهٔ آزمون: ${fa(it.grade.max)}</div></div>
      ${ro() ? '' : `<div class="row"><button class="btn sm" data-act="qz-bank" data-id="${it.id}">افزودن از بانک سؤال</button><button class="btn sm primary" data-act="qz-new" data-id="${it.id}">+ سؤال تازه</button></div>`}</div>
      ${has ? '<p class="note">این آزمون تلاش ثبت‌شده دارد؛ تغییر سؤال‌ها نمرهٔ تلاش‌های قبلی را عوض نمی‌کند.</p>' : ''}
      ${it.perPage ? `<p class="small muted">${it.perPage === 1 ? 'هر سؤال در یک صفحه' : `هر ${fa(it.perPage)} سؤال در یک صفحه`}${it.shuffle ? ' · گزینه‌ها به هم ریخته می‌شوند' : ''}</p>` : ''}
      ${it.qs.map((q, i) => `<div class="qz-q"><div class="spread"><b>سؤال ${fa(i + 1)}</b><div class="row">
          ${ro() ? `<span class="small">نمره: ${fmtQ(it, q.mark || 1)}</span>` : `<label class="small">نمره <input class="input num sm" style="width:64px" data-qmark="${it.id}|${q.id}" value="${q.mark || 1}" aria-label="نمرهٔ سؤال ${fa(i + 1)}"></label>
          <button class="btn sm" data-act="qz-up" data-id="${it.id}|${q.id}" aria-label="سؤال ${fa(i + 1)} به بالا" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-act="qz-down" data-id="${it.id}|${q.id}" aria-label="سؤال ${fa(i + 1)} به پایین" ${i < it.qs.length - 1 ? '' : 'disabled'}>↓</button>
          <button class="btn sm" data-act="qz-edit" data-id="${it.id}|${q.id}">ویرایش</button><button class="btn sm danger" data-act="qz-del" data-id="${it.id}|${q.id}" aria-label="حذف سؤال ${fa(i + 1)}">حذف</button>`}</div></div>
        ${K.show(q.text)}<div class="row small" style="gap:6px;margin-top:4px">${q.options.map((o, k) => `<span class="tag ${k === q.answer ? 'ok' : 'grey'}">${fa(k + 1)}) ${esc(o.t)}</span>`).join('')}</div></div>`).join('') || '<p class="muted">هنوز سؤالی نیست. «سؤال تازه» بسازید یا از بانک سؤال بیاورید.</p>'}</div>`;
  }
  function results(it) {
    const ss = scope(it), rows = ss.map(s => [s, it.att?.[s.id] || []]), fin = rows.filter(([s]) => grade(it, s.id));
    const gs = fin.map(([s]) => grade(it, s.id).score), avg = gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null;
    const pass = it.grade.pass === '' ? null : fin.filter(([s]) => grade(it, s.id).score >= +it.grade.pass).length;
    return `<div class="grid g3 cr-kpi">${[['شرکت کرده', `${fa(fin.length)} از ${fa(ss.length)}`], ['میانگین', avg == null ? '—' : fa(round(avg, it.decimals))], ['بالاترین', gs.length ? fa(Math.max(...gs)) : '—'], pass != null && ['قبول', fa(pass)]].filter(Boolean)
        .map(([l, v]) => `<div class="card"><div class="muted small">${l}</div><b style="font-size:22px">${v}</b></div>`).join('')}</div>
      <div class="card"><h2>تلاش‌ها</h2><div class="table-wrap" tabindex="0" role="region" aria-label="جدول تلاش‌ها"><table><tr><th>دانش‌آموز</th><th>تلاش</th><th>وضعیت</th><th>شروع</th><th>زمان صرف‌شده</th><th>نمرهٔ تلاش</th><th>نمرهٔ نهایی</th><th><span class="sr-only">کارها</span></th></tr>
      ${rows.flatMap(([s, as]) => (as.length ? as : [null]).map((a, i) => `<tr><td>${i ? '' : esc(s.name)}</td><td class="num">${a ? fa(a.n) : '—'}</td>
        <td>${!a ? '<span class="tag grey">شرکت نکرده</span>' : a.state === 'finished' ? '<span class="tag ok">پایان یافته</span>' : a.state === 'abandoned' ? '<span class="tag bad">ثبت نشده</span>' : a.state === 'overdue' ? '<span class="tag warn">دیر شده</span>' : '<span class="tag blue">در حال انجام</span>'}</td>
        <td class="small">${a ? esc(K.fdt(a.start)) : ''}</td><td class="small">${a?.end ? esc(K.span(a.start, a.end).text) : ''}</td>
        <td class="num">${a?.state === 'finished' ? fa(round(a.pct / 100 * it.grade.max, it.decimals)) : '—'}</td><td class="num">${i ? '' : grade(it, s.id) ? `<b>${fa(grade(it, s.id).score)}</b>` : '—'}</td>
        <td>${a && !ro() ? `<div class="row">${a.state === 'inprogress' || a.state === 'overdue' ? `<button class="btn sm" data-act="qz-close-att" data-id="${it.id}|${s.id}|${a.id}">ثبت و بستن</button>` : ''}<button class="btn sm danger" data-act="qz-del-att" data-id="${it.id}|${s.id}|${a.id}">حذف تلاش</button></div>` : ''}</td></tr>`)).join('')}</table></div></div>`;
  }
  function analysis(it) {
    const atts = Object.values(it.att || {}).flat().filter(a => a.state === 'finished');
    if (!atts.length) return `<div class="card"><p class="muted">هنوز تلاش پایان‌یافته‌ای نیست.</p></div>`;
    return `<div class="card"><h2>تحلیل سؤال‌ها</h2><p class="small muted">درصد پاسخ درست هر سؤال و گزینه‌هایی که بیشتر انتخاب شده؛ سؤال‌های کم‌درصد را در کلاس مرور کنید.</p>
      ${it.qs.map((q, i) => { const seen = atts.filter(a => a.order.includes(q.id)), right = seen.filter(a => a.ans[q.id] === q.answer).length, p = seen.length ? right / seen.length * 100 : 0;
        return `<div class="qz-an"><div class="spread"><b>سؤال ${fa(i + 1)}: ${esc(K.plain(q.text).slice(0, 80))}</b><span class="tag ${p >= 70 ? 'ok' : p >= 40 ? 'warn' : 'bad'}">${fa(Math.round(p))}٪ درست</span></div>
          ${q.options.map((o, k) => { const n = seen.filter(a => a.ans[q.id] === k).length; return `<div class="cr-bar small"><div class="spread"><span>${k === q.answer ? '✓ ' : ''}${esc(o.t)}</span><span>${fa(n)}</span></div><div class="bar"><i style="width:${seen.length ? n / seen.length * 100 : 0}%"></i></div></div>`; }).join('')}</div>`; }).join('')}</div>`;
  }
  const optRow = (o, i, ans) => `<div class="qo-row"><label class="cr-chk"><input type="radio" name="qo-ans" value="${i}" ${i === ans ? 'checked' : ''} aria-label="گزینهٔ ${fa(i + 1)} درست است"> درست</label>
    <input class="input" data-qo="${i}" value="${esc(o.t)}" placeholder="گزینهٔ ${fa(i + 1)}" aria-label="متن گزینهٔ ${fa(i + 1)}" style="flex:2"><input class="input" data-qf="${i}" value="${esc(o.fb || '')}" placeholder="بازخورد ویژهٔ این گزینه" aria-label="بازخورد گزینهٔ ${fa(i + 1)}" style="flex:2"></div>`;
  function questionModal(it, q) {
    const fresh = !q; q = q || { id: '', text: '', mark: 1, options: [{ t: '' }, { t: '' }, { t: '' }, { t: '' }], answer: 0, gfb: '' };
    modal(`<h2>${fresh ? 'سؤال چندگزینه‌ای تازه' : 'ویرایش سؤال'}</h2><div class="field"><span>متن سؤال</span>${K.rich('qq-t', q.text, 'متن سؤال', 3)}</div>
      <label class="field"><span>نمرهٔ پیش‌فرض</span><input class="input num" id="qq-m" value="${q.mark || 1}" style="width:100px"></label>
      <fieldset class="cr-fs" style="margin-top:12px"><legend class="small muted">گزینه‌ها (گزینهٔ درست را علامت بزنید)</legend><div id="qo-box">${q.options.map((o, i) => optRow(o, i, q.answer)).join('')}</div>
        <button type="button" class="btn sm" data-qo-add>+ گزینهٔ دیگر</button></fieldset>
      <div class="field"><span>بازخورد عمومی (برای همه، پس از پاسخ)</span>${K.rich('qq-g', q.gfb, 'بازخورد عمومی', 2)}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('.modal').classList.add('cr-modal'); K.wire(root);
      root.querySelector('[data-qo-add]').onclick = () => { const box = root.querySelector('#qo-box'), n = box.children.length; box.insertAdjacentHTML('beforeend', optRow({ t: '' }, n, -1)); box.querySelector(`[data-qo="${n}"]`).focus(); };
      root.querySelector('#save').onclick = () => {
        const text = K.readRich(root, 'qq-t'); if (!K.plain(text)) return UI.invalid('#qq-t', 'متن سؤال را بنویسید.');
        const rows = [...root.querySelectorAll('.qo-row')].map((r, i) => ({ i, t: r.querySelector('[data-qo]').value.trim(), fb: r.querySelector('[data-qf]').value.trim() }));
        const ansI = +(root.querySelector('input[name=qo-ans]:checked')?.value ?? -1), kept = rows.filter(r => r.t);
        if (kept.length < 2) return UI.invalid('[data-qo="0"]', 'دست‌کم دو گزینه بنویسید.');
        if (!kept.some(r => r.i === ansI)) return UI.invalid(root.querySelector('input[name=qo-ans]'), 'گزینهٔ درست را علامت بزنید (و خالی نباشد).');
        const mark = K.num(K.v(root, 'qq-m')); if (!(mark > 0)) return UI.invalid('#qq-m', 'نمره باید بیشتر از صفر باشد.');
        Object.assign(q, { text, mark, options: kept.map(r => ({ t: r.t, fb: r.fb })), answer: kept.findIndex(r => r.i === ansI), gfb: K.readRich(root, 'qq-g') });
        if (fresh) { q.id = SchoolData.uid('qq'); it.qs.push(q); }
        done('سؤال ذخیره شد.');
      };
    });
  }
  function bankModal(it) {
    const bank = d().questions || [], topics = [...new Set(bank.map(q => q.topic))];
    if (!bank.length) return toast('بانک سؤال این پایه خالی است.');
    modal(`<h2>افزودن از بانک سؤال</h2><fieldset class="cr-fs"><legend class="small muted">سؤال‌ها را انتخاب کنید</legend>${topics.map(t => `<div class="small" style="margin-top:8px"><b>${esc(t)}</b></div>
      ${bank.filter(q => q.topic === t).map(q => `<label class="cr-chk small"><input type="checkbox" value="${q.id}" ${it.qs.some(x => x.src === q.id) ? 'disabled checked' : ''}> ${esc(q.text)}</label>`).join('')}`).join('')}</fieldset>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">افزودن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const ids = [...root.querySelectorAll('input:checked:not(:disabled)')].map(i => i.value);
        if (!ids.length) return UI.invalid(root.querySelector('fieldset input'), 'دست‌کم یک سؤال انتخاب کنید.');
        ids.forEach(id => { const b = bank.find(q => q.id === id); it.qs.push({ id: SchoolData.uid('qq'), src: id, text: `<p>${esc(b.text)}</p>`, mark: 1, options: b.options.map(t => ({ t, fb: '' })), answer: b.answer, gfb: '' }); });
        done(`${fa(ids.length)} سؤال افزوده شد.`);
      };
    });
  }

  /* ---------------- student ---------------- */
  const isSEB = () => /SEB/i.test(navigator.userAgent);
  function canStart(it, sid) {
    const t = K.now(), as = it.att?.[sid] || [], doneA = as.filter(a => a.state !== 'inprogress' && a.state !== 'overdue');
    if (it.open && t < it.open) return `آزمون از ${K.fdt(it.open)} باز می‌شود.`;
    if (it.close && t >= it.close) return 'آزمون بسته شده است.';
    if (!it.qs.length) return 'این آزمون هنوز سؤالی ندارد.';
    if (it.attempts && doneA.length >= it.attempts) return 'همهٔ تلاش‌های مجاز را انجام داده‌اید.';
    if (it.seb && !isSEB()) return 'این آزمون فقط در مرورگر Safe Exam Browser شروع می‌شود.';
    const last = doneA[doneA.length - 1], wait = doneA.length === 1 ? it.delay1 : doneA.length > 1 ? it.delay2 : 0;
    if (last && wait) { const ok = new Date(new Date(last.end).getTime() + wait * 1000); if (new Date() < ok) return `تلاش بعدی از ${K.fdt(localDt(ok))} ممکن است.`; }
    return '';
  }
  const pad = n => String(n).padStart(2, '0');
  const localDt = t => `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
  const overall = (it, pct) => (it.ofb || []).slice().sort((a, b) => b.min - a.min).find(r => pct >= r.min)?.fb || '';
  const photo = (it, s) => it.photo === 'none' ? '' : `<span class="avatar ${it.photo === 'large' ? 'qz-big' : ''}" aria-hidden="true">${esc(SchoolData.initials(s))}</span>`;
  function student(it, s) {
    const as = (it.att = it.att || {})[s.id] = it.att[s.id] || [];
    let changed = false; as.forEach(a => { if (expire(it, a)) changed = true; }); if (changed) { save(); sync(it); }
    const run = as.find(a => a.state === 'inprogress' || a.state === 'overdue');
    if (state.qr) { const a = as.find(x => x.id === state.qr); if (a) return review(it, s, a); state.qr = ''; }
    if (run && state.qa === run.id) return attemptView(it, s, run);
    const why = canStart(it, s.id), g = grade(it, s.id), lastF = finished(it, s.id).slice(-1)[0];
    const showMarks = a => it.review[slot(it, a)].marks, showAtt = a => it.review[slot(it, a)].attempt;
    return `<div class="card">${it.desc ? K.show(it.desc) : ''}
      <ul class="qz-info">${[it.open && `باز شده: ${K.fdt(it.open)}`, it.close && `بسته می‌شود: ${K.fdt(it.close)}`, it.limit && `محدودیت زمانی: ${durText(it.limit)}`,
        `روش تصحیح: ${METHOD.find(m => m[0] === it.grade.method)[1]}`, `تلاش‌های مجاز: ${it.attempts ? fa(it.attempts) : 'نامحدود'}`, it.password && 'برای شروع، رمز آزمون لازم است.', it.seb && 'فقط در مرورگر Safe Exam Browser.'].filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      ${as.length ? `<div class="card"><h2>خلاصهٔ تلاش‌های قبلی شما</h2><div class="table-wrap"><table><tr><th>تلاش</th><th>وضعیت</th><th>نمره / ${fa(it.grade.max)}</th><th>مرور</th></tr>
        ${as.map(a => `<tr><td class="num">${fa(a.n)}</td><td>${a.state === 'finished' ? `پایان یافته<div class="muted small">${esc(K.fdt(a.end))}</div>` : a.state === 'abandoned' ? 'ثبت نشد' : a.state === 'overdue' ? 'زمان تمام شده؛ هنوز ثبت نشده' : 'در حال انجام'}</td>
          <td class="num">${a.state === 'finished' && showMarks(a) ? fa(round(a.pct / 100 * it.grade.max, it.decimals)) : a.state === 'finished' ? '<span class="muted small">هنوز نمایش داده نمی‌شود</span>' : '—'}</td>
          <td>${a.state === 'finished' && showAtt(a) ? `<button class="btn sm" data-act="qz-rev" data-id="${a.id}">مرور</button>` : ''}</td></tr>`).join('')}</table></div>
        ${g && lastF && showMarks(lastF) ? `<p style="margin:10px 0 0"><b>نمرهٔ نهایی شما: ${esc(g.text)}</b>${it.grade.pass !== '' ? ` <span class="tag ${g.score >= +it.grade.pass ? 'ok' : 'bad'}">${g.score >= +it.grade.pass ? 'قبول' : 'نیاز به تلاش بیشتر'}</span>` : ''}</p>` : ''}
        ${g && lastF && it.review[slot(it, lastF)].overall && overall(it, g.pct) ? `<div class="note" style="margin-top:8px"><b>بازخورد کلی:</b> ${esc(overall(it, g.pct))}</div>` : ''}</div>` : ''}
      <div class="card">${run ? `<button class="btn primary" data-act="qz-cont" data-id="${it.id}">ادامهٔ تلاش قبلی</button>`
        : why ? `<p class="note" style="margin:0">${esc(why)}</p>`
        : `${it.password ? `<label class="field" style="max-width:320px"><span>رمز آزمون</span><input class="input" type="password" id="qz-pw" autocomplete="off"></label>` : ''}
          <button class="btn primary" data-act="qz-start" data-id="${it.id}">${as.length ? 'شروع تلاش دوباره' : 'شروع آزمون'}</button>
          ${it.limit ? `<p class="small muted" style="margin:6px 0 0">با شروع، شمارش ${esc(durText(it.limit))} زمان آغاز می‌شود و پس از آن ${it.overdue === 'autosubmit' ? 'تلاش خودکار ثبت می‌شود' : it.overdue === 'grace' ? `${esc(durText(it.grace))} برای ثبت فرصت دارید` : 'تلاش ثبت‌نشده حساب نمی‌شود'}.</p>` : ''}`}</div>`;
  }
  const pagesOf = (it, att) => { const per = it.perPage || att.order.length; const out = []; for (let i = 0; i < att.order.length; i += per) out.push(att.order.slice(i, i + per)); return out; };
  function attemptView(it, s, att) {
    const pages = pagesOf(it, att), pg = Math.min(state.qp || 0, pages.length - 1), over = att.state === 'overdue', inter = it.behaviour !== 'deferred', rv = it.review.during;
    if (state.qsum) return `<div class="card"><div class="spread"><h2>خلاصهٔ تلاش</h2><span class="qz-timer" id="qz-timer" role="timer"></span></div>
      <div class="table-wrap"><table><tr><th>سؤال</th><th>وضعیت</th></tr>${att.order.map((id, i) => `<tr><td>${it.nav === 'free' && !over ? `<button class="cr-name" data-act="qz-go" data-id="${pages.findIndex(p => p.includes(id))}">سؤال ${fa(i + 1)}</button>` : `سؤال ${fa(i + 1)}`}</td>
        <td>${att.ans[id] != null ? '<span class="tag ok">پاسخ ذخیره شد</span>' : '<span class="tag grey">پاسخ داده نشده</span>'}</td></tr>`).join('')}</table></div>
      ${over ? '<p class="note">زمان آزمون تمام شده؛ فقط می‌توانید تلاش را ثبت کنید.</p>' : ''}
      <div class="row" style="margin-top:12px">${over || it.nav === 'seq' ? '' : '<button class="btn" data-act="qz-back">بازگشت به تلاش</button>'}<button class="btn primary" data-act="qz-submit" data-id="${it.id}">ثبت همه و پایان</button></div></div>`;
    const qs = pages[pg].map(id => it.qs.find(q => q.id === id)).filter(Boolean);
    return `<div class="card qz-head"><div class="row">${photo(it, s)}<div><b>${esc(s.name)}</b><div class="muted small">تلاش ${fa(att.n)}</div></div></div><span class="qz-timer" id="qz-timer" role="timer"></span></div>
      <nav class="qz-nav card" aria-label="پیمایش آزمون">${att.order.map((id, i) => { const p = pages.findIndex(x => x.includes(id)); return `<button class="qz-nb ${att.ans[id] != null ? 'ans' : ''} ${p === pg ? 'cur' : ''}" data-act="qz-go" data-id="${p}" ${it.nav === 'seq' && p < pg || over ? 'disabled' : ''} aria-label="سؤال ${fa(i + 1)}${att.ans[id] != null ? '، پاسخ داده شده' : ''}" ${p === pg ? 'aria-current="page"' : ''}>${fa(i + 1)}</button>`; }).join('')}
        <button class="btn sm" data-act="qz-sum">پایان تلاش…</button></nav>
      ${over ? '<p class="note">زمان تمام شده؛ پاسخ‌ها دیگر تغییر نمی‌کند. تلاش را ثبت کنید.</p>' : ''}
      ${qs.map(q => { const no = att.order.indexOf(q.id) + 1, opts = att.opt[q.id] || q.options.map((_, k) => k), ch = att.chk?.[q.id], lock = over || (it.behaviour === 'immediate' && ch?.done) || (it.behaviour === 'interactive' && (ch?.right || ch?.tries >= TRIES));
        return `<fieldset class="card qz-qcard" ${lock ? 'disabled' : ''}><legend class="sr-only">سؤال ${fa(no)}</legend><div class="spread"><b>سؤال ${fa(no)}</b><span class="muted small">${att.ans[q.id] != null ? 'پاسخ ذخیره شد' : 'هنوز پاسخ داده نشده'}${rv.maxmarks ? ` · نمره از ${fmtQ(it, q.mark || 1)}` : ''}</span></div>
          ${K.show(q.text)}${opts.map(k => `<label class="cr-chk qz-opt"><input type="radio" name="qa-${q.id}" value="${k}" data-qa="${it.id}|${att.id}|${q.id}" ${att.ans[q.id] === k ? 'checked' : ''}> ${esc(q.options[k].t)}</label>`).join('')}
          ${inter && ch?.done ? feedbackHtml(it, q, att, rv) : ''}
          ${inter && !lock && att.ans[q.id] != null ? `<button class="btn sm" data-act="qz-check" data-id="${it.id}|${q.id}">بررسی${it.behaviour === 'interactive' ? ` (${fa(TRIES - (ch?.tries || 0))} فرصت)` : ''}</button>` : ''}
          ${it.behaviour === 'interactive' && ch?.done && !ch.right && ch.tries < TRIES ? '<p class="small muted">دوباره امتحان کنید؛ هر تلاش نادرست بخشی از نمرهٔ این سؤال را کم می‌کند.</p>' : ''}</fieldset>`; }).join('')}
      <div class="row">${pg > 0 && it.nav === 'free' && !over ? `<button class="btn" data-act="qz-go" data-id="${pg - 1}">صفحهٔ قبل</button>` : ''}
        ${pg < pages.length - 1 && !over ? `<button class="btn primary" data-act="qz-go" data-id="${pg + 1}">صفحهٔ بعد</button>` : `<button class="btn primary" data-act="qz-sum">پایان تلاش…</button>`}</div>`;
  }
  function feedbackHtml(it, q, att, rv) {
    const a = att.ans[q.id], right = a === q.answer, parts = [];
    if (rv.correct) parts.push(`<span class="tag ${right ? 'ok' : 'bad'}">${right ? 'درست' : a == null ? 'پاسخ داده نشده' : 'نادرست'}</span>`);
    if (rv.marks) parts.push(`<span class="small">نمره: ${fmtQ(it, qScore(it, att, q))} از ${fmtQ(it, q.mark || 1)}</span>`);
    const sp = a != null && q.options[a]?.fb;
    return `<div class="qz-fb">${parts.join(' ')}${rv.specific && sp ? `<p class="small" style="margin:6px 0 0">${esc(sp)}</p>` : ''}
      ${rv.general && q.gfb ? `<div class="small" style="margin-top:6px">${K.show(q.gfb)}</div>` : ''}${rv.right ? `<p class="small muted" style="margin:6px 0 0">پاسخ درست: ${esc(q.options[q.answer].t)}</p>` : ''}</div>`;
  }
  function review(it, s, att) {
    const rv = it.review[slot(it, att)];
    if (!rv.attempt) { state.qr = ''; return student(it, s); }
    return `<div class="card"><div class="spread"><h2>مرور تلاش ${fa(att.n)}</h2><button class="btn sm" data-act="qz-rev-x">پایان مرور</button></div>
      <div class="table-wrap"><table class="cr-st">${[['شروع', K.fdt(att.start)], ['پایان', K.fdt(att.end)], ['زمان صرف‌شده', K.span(att.start, att.end).text],
        rv.marks && ['نمره', `${fa(round(att.pct / 100 * it.grade.max, it.decimals))} از ${fa(it.grade.max)} (${fa(Math.round(att.pct))}٪)`]].filter(Boolean).map(([a, b]) => `<tr><th scope="row">${a}</th><td>${esc(b)}</td></tr>`).join('')}
        ${rv.overall && overall(it, att.pct) ? `<tr><th scope="row">بازخورد کلی</th><td>${esc(overall(it, att.pct))}</td></tr>` : ''}</table></div></div>
      ${att.order.map((id, i) => { const q = it.qs.find(x => x.id === id); if (!q) return ''; const opts = att.opt[q.id] || q.options.map((_, k) => k);
        return `<div class="card qz-qcard"><div class="spread"><b>سؤال ${fa(i + 1)}</b>${rv.maxmarks ? `<span class="muted small">نمره از ${fmtQ(it, q.mark || 1)}</span>` : ''}</div>${K.show(q.text)}
          ${opts.map(k => `<div class="qz-opt small ${att.ans[q.id] === k ? 'mine' : ''} ${rv.correct && att.ans[q.id] === k ? (k === q.answer ? 'right' : 'wrong') : ''}">${att.ans[q.id] === k ? '● ' : '○ '}${esc(q.options[k].t)}</div>`).join('')}
          ${feedbackHtml(it, q, att, rv)}</div>`; }).join('')}`;
  }
  function startAttempt(it, s) {
    const why = canStart(it, s.id); if (why) return toast(why);
    if (it.password && document.getElementById('qz-pw')?.value !== it.password) return UI.invalid('#qz-pw', 'رمز آزمون درست نیست.');
    const as = it.att[s.id], prev = as.filter(a => a.state === 'finished').slice(-1)[0];
    const order = it.qs.map(q => q.id), opt = {};
    if (it.shuffle) it.qs.forEach(q => { const o = q.options.map((_, k) => k); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } opt[q.id] = o; });
    // The start keeps its seconds for the timer; as local time it still sorts and prints like the other dates.
    const now = new Date(), att = { id: SchoolData.uid('qa'), n: as.length + 1, start: `${localDt(now)}:${pad(now.getSeconds())}`, end: null, state: 'inprogress', order, opt, ans: it.eachBuilds && prev ? { ...prev.ans } : {}, chk: {} };
    as.push(att); state.qa = att.id; state.qp = 0; state.qsum = false; save();
    if (it.browserSec) document.documentElement.requestFullscreen?.().catch(() => {});
    render();
  }
  function tick() {
    const el = document.getElementById('qz-timer'); if (!el) { stop(); return; }
    const it = find(state.item), att = it?.att?.[state.as]?.find(a => a.id === state.qa); if (!att) { stop(); return; }
    const dl = deadline(it, att); if (!dl) { el.textContent = ''; return; }
    const end = att.state === 'overdue' ? dl.getTime() + it.grace * 1000 : dl.getTime(), left = Math.round((end - Date.now()) / 1000);
    el.textContent = `${att.state === 'overdue' ? 'مهلت ثبت' : 'زمان باقی‌مانده'} ${clock(left)}`;
    el.classList.toggle('low', left < 60);
    if (left <= 0 && expire(it, att)) { save(); sync(it); if (att.state !== 'overdue') { state.qa = ''; state.qsum = false; toast(att.state === 'finished' ? 'زمان تمام شد و تلاش ثبت شد.' : 'زمان تمام شد؛ این تلاش ثبت نشد.'); } else state.qsum = true; render(); }
  }
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  function leave() { stop(); state.qa = ''; state.qr = ''; state.qsum = false; state.qp = 0; }
  const ids = b => b.dataset.id.split('|');
  const act = {
    'qz-tab': b => { state.qtab = b.dataset.id; render(); },
    'qz-new': b => questionModal(find(b.dataset.id)),
    'qz-bank': b => bankModal(find(b.dataset.id)),
    'qz-edit': b => { const [i, q] = ids(b), it = find(i); questionModal(it, it.qs.find(x => x.id === q)); },
    'qz-del': async b => { const [i, q] = ids(b), it = find(i); if (!await UI.ask('حذف سؤال', 'این سؤال از آزمون حذف شود؟', 'حذف کن')) return; it.qs = it.qs.filter(x => x.id !== q); save(); render(); },
    'qz-up': b => { const [i, q] = ids(b), it = find(i), k = it.qs.findIndex(x => x.id === q); [it.qs[k - 1], it.qs[k]] = [it.qs[k], it.qs[k - 1]]; save(); render(); },
    'qz-down': b => { const [i, q] = ids(b), it = find(i), k = it.qs.findIndex(x => x.id === q); [it.qs[k + 1], it.qs[k]] = [it.qs[k], it.qs[k + 1]]; save(); render(); },
    'qz-start': b => startAttempt(find(b.dataset.id), api.student(state.as)),
    'qz-cont': b => { const it = find(b.dataset.id), run = it.att[state.as].find(a => a.state === 'inprogress' || a.state === 'overdue'); state.qa = run.id; state.qsum = run.state === 'overdue'; render(); },
    'qz-go': b => { state.qp = +b.dataset.id; state.qsum = false; render(); scrollTo(0, 0); },
    'qz-sum': () => { state.qsum = true; render(); },
    'qz-back': () => { state.qsum = false; render(); },
    'qz-check': b => { const [i, q] = ids(b), it = find(i), att = it.att[state.as].find(a => a.id === state.qa), qq = it.qs.find(x => x.id === q);
      const c = att.chk[q] = att.chk[q] || { tries: 0 }; c.tries++; c.done = true; c.right = att.ans[q] === qq.answer; save(); render(); },
    'qz-submit': async b => { const it = find(b.dataset.id), att = it.att[state.as].find(a => a.id === state.qa);
      const empty = att.order.filter(id => att.ans[id] == null).length;
      if (!await UI.ask('ثبت و پایان', `${empty ? `${fa(empty)} سؤال بی‌پاسخ است. ` : ''}پس از ثبت، دیگر نمی‌توانید پاسخ‌ها را تغییر دهید.`, 'ثبت همه و پایان')) return;
      finish(it, att); stop(); if (document.fullscreenElement) document.exitFullscreen?.(); state.qa = ''; state.qsum = false; state.qr = it.review.immediately.attempt ? att.id : ''; sync(it); save(); render(); toast('تلاش ثبت شد.'); },
    'qz-rev': b => { state.qr = b.dataset.id; render(); },
    'qz-rev-x': () => { state.qr = ''; render(); },
    'qz-close-att': b => { const [i, sid, a] = ids(b), it = find(i), att = it.att[sid].find(x => x.id === a); finish(it, att); sync(it); save(); render(); toast('تلاش ثبت و بسته شد.'); },
    'qz-del-att': async b => { const [i, sid, a] = ids(b), it = find(i); if (!await UI.ask('حذف تلاش', 'این تلاش و نمره‌اش حذف شود؟', 'حذف کن')) return; it.att[sid] = it.att[sid].filter(x => x.id !== a); it.att[sid].forEach((x, k) => { x.n = k + 1; }); sync(it); save(); render(); },
  };
  function bind() {
    document.querySelectorAll('[data-qa]').forEach(r => r.onchange = () => { const [i, a, q] = r.dataset.qa.split('|'), it = find(i), att = it.att[state.as].find(x => x.id === a);
      if (att.state !== 'inprogress') return; att.ans[q] = +r.value; if (att.chk[q]) att.chk[q].done = false; save(); render(); });
    document.querySelectorAll('[data-qmark]').forEach(inp => inp.onchange = () => { const [i, q] = inp.dataset.qmark.split('|'), it = find(i), m = K.num(inp.value);
      if (!(m > 0)) { UI.invalid(inp, 'نمره باید بیشتر از صفر باشد.'); return; } it.qs.find(x => x.id === q).mark = m; save(); render(); });
    const view = document.getElementById('view');
    if (document.getElementById('qz-timer')) { if (!timer) timer = setInterval(tick, 1000); tick();
      const it = find(state.item); if (it?.browserSec && view && !view.dataset.qsec) { view.dataset.qsec = '1'; ['copy', 'cut', 'contextmenu'].forEach(ev => view.addEventListener(ev, e => { if (document.getElementById('qz-timer')) e.preventDefault(); })); } }
    else stop();
  }
  return { defaults, form, wireForm, readForm, teacher, student, act, bind, grade, used, finished, leave };
};
