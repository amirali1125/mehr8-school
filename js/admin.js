// Administration and services, all school-wide (org data):
//   services   «خدمات»: the food tab (meal ordering) and the co-op tab (basic goods for staff, paid from the wallet)
//   coopAdmin  executive deputy: co-op goods, prices, stock and orders
//   enroll     enrolment cartable: website request → meeting with the family → entrance exam → passed → family accepts → referred to finance
//   fees       finance unit: the referred students and their costs, entered by hand or from one fixed Excel template
//   wallets    finance unit: charge anyone's wallet (staff and students)
//   hire       hiring cartable: website request → meeting → résumé review → approve/reject; approved people get a contract
//   food       anyone orders from the day's menu; the price comes off their wallet
//   foodMenu   executive deputy: the menu of each day
//   foodTrack  executive deputy: «پیگیری تغذیه», the orders of a day
//   orgchart   editable organisation chart
// The website feed, the finance rules and the contract terms are still to come from the school; the pages say so.
const Admin = ctx => {
  const { esc, fa, money, modal, close, toast } = UI;
  const D = SchoolData, J = JDate;
  const { org, save, render, empty } = ctx;
  const today = J.todayIso();
  const v = (root, sel) => (root.querySelector(sel)?.value || '').trim();
  const done = msg => { save(); close(); render(); toast(msg); };
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const nowIso = () => today + 'T' + new Date().toTimeString().slice(0, 8);
  const GN = g => D.GRADE_NAME[g];
  const me = () => ctx.me(), nameOf = id => ctx.nameOf(id);
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const xlsx = async () => { await UI.loadScript(XLSX_URL); return window.XLSX; };
  const MAX_FILE = 500 * 1024;
  const readFile = file => new Promise((res, rej) => {
    if (file.size > MAX_FILE) { rej(new Error('size')); return; }
    const r = new FileReader(); r.onload = () => res({ name: file.name, size: file.size, data: r.result }); r.onerror = rej; r.readAsDataURL(file);
  });
  const WEEK = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const wday = iso => (new Date(iso + 'T12:00:00').getDay() + 1) % 7;
  const state = { stage: 'all', hTab: 'cart', month: null, day: today, trackDay: today, edit: false, wGrade: null, forWho: '', cart: {}, coF: 'open' };
  const note = t => `<p class="note">${t}</p>`;

  /* ---------------- data ---------------- */
  // Earlier saves have the four-step enrolment and no admin data; this brings them up to date once.
  function O() {
    const o = org();
    if (o.v3) return o;
    const map = { interview: 'meeting', accepted: 'family', enrolled: 'finance' };
    o.applicants.forEach(a => { a.stage = map[a.stage] || a.stage; a.history = a.history || []; a.source = a.source || 'site'; a.sample = true; });
    o.finance = { students: {} };
    o.wallets = {};
    o.hire = { applicants: [
      { id: 'h1', name: 'مریم رستمی', position: 'دبیر ریاضی متوسطه دوم', phone: '', date: D.shift(-6), stage: 'new', sample: true, history: [] },
      { id: 'h2', name: 'حامد نیک‌پور', position: 'معلم راهنما', phone: '', date: D.shift(-12), stage: 'meeting', meetAt: D.shift(2) + 'T10:00', sample: true, history: [] },
      { id: 'h3', name: 'سارا کامرانی', position: 'کارشناس واحد مالی', phone: '', date: D.shift(-20), stage: 'approved', sample: true, history: [], contract: null },
    ] };
    const menu = {};
    for (let i = -3; i < 25; i++) { const iso = D.shift(i); if (wday(iso) < 5) menu[iso] = [
      { id: D.uid('f'), name: ['چلو خورش قیمه', 'ماکارونی', 'عدس‌پلو', 'چلو کباب کوبیده', 'زرشک‌پلو با مرغ'][(i + 30) % 5], price: 95000 },
      { id: D.uid('f'), name: 'ساندویچ مرغ و سالاد', price: 70000 }] ; }
    o.food = { menu, orders: [] };
    o.chart = { id: 'root', title: 'مدیر مدرسه', people: [], children: [
      { id: D.uid('c'), title: 'معاون آموزشی', people: [], children: [{ id: D.uid('c'), title: 'مدیر دروس', people: [], children: [] }] },
      { id: D.uid('c'), title: 'معاون اجرایی', people: [], children: [{ id: D.uid('c'), title: 'ناظم', people: [], children: [] }, { id: D.uid('c'), title: 'نظافت', people: [], children: [] }] },
      ...D.gradesOf(ctx.school()).map(g => ({ id: D.uid('c'), title: `معلم راهنمای پایهٔ ${GN(g)}`, people: [], children: [{ id: D.uid('c'), title: 'کمک معلم راهنما', people: [], children: [] }] })),
    ] };
    o.v3 = true; save();
    return o;
  }

  /* ---------------- enrolment ---------------- */
  const ST = [['new', 'درخواست از سایت'], ['meeting', 'جلسه با خانواده'], ['exam', 'آزمون ورودی'], ['passed', 'قبول در آزمون'], ['family', 'پذیرش خانواده'], ['finance', 'ارجاع به واحد مالی'], ['final', 'تأیید نهایی مدیر']];
  const stIdx = s => ST.findIndex(x => x[0] === s);
  const canAdmit = () => ['principal', 'deputy', 'exec'].includes(ctx.actor());
  const isBoss = () => ctx.actor() === 'principal';
  const when = at => at ? `${J.format(at.slice(0, 10))}${at.length > 10 ? ' ساعت ' + digits(at.slice(11, 16)) : ''}` : '';
  function timeline(a) {
    const cur = stIdx(a.stage), rej = a.stage === 'rejected', last = rej ? stIdx(a.rejectedAt || 'new') : cur;
    return `<ol class="tl-steps" aria-label="مراحل">${ST.map(([k, l], i) => `<li class="${rej && i === last ? 'rej' : i < last || (!rej && i === cur && k === 'final') ? 'done' : i === last ? 'cur' : ''}"><span></span><em>${l}</em></li>`).join('')}</ol>`;
  }
  // What finance has done with a referred applicant.
  const finTag = a => { const f = O().finance.students[a.id];
    return f ? `<span class="tag ${f.paid >= total(f) && total(f) > 0 ? 'ok' : 'warn'}">مالی: ${f.paid >= total(f) && total(f) > 0 ? 'تسویه شد' : `مانده ${money(total(f) - (f.paid || 0))}`}</span>` : '<span class="tag warn">در انتظار برآورد هزینه در واحد مالی</span>'; };
  function nextAction(a) {
    const r = `<button class="btn sm danger" data-act="ad-reject" data-id="${a.id}">رد</button>`;
    switch (a.stage) {
      case 'new': return isBoss() ? `<button class="btn sm primary" data-act="ad-time" data-id="${a.id}" data-k="meet">تعیین وقت جلسه</button>${r}` : '<span class="muted small">منتظر تعیین وقت جلسه توسط مدیر</span>';
      case 'meeting': return `<span class="small">جلسه: <b>${esc(when(a.meetAt))}</b></span>${isBoss() ? `<button class="btn sm primary" data-act="ad-time" data-id="${a.id}" data-k="exam">جلسه برگزار شد؛ وقت آزمون</button>` : ''}${r}`;
      case 'exam': return `<span class="small">آزمون: <b>${esc(when(a.examAt))}</b></span><button class="btn sm primary" data-act="ad-result" data-id="${a.id}">ثبت نتیجهٔ آزمون</button>`;
      case 'passed': return `<button class="btn sm primary" data-act="ad-step" data-id="${a.id}" data-to="family">خانواده پذیرفت</button><button class="btn sm danger" data-act="ad-reject" data-id="${a.id}" data-why="انصراف خانواده">انصراف خانواده</button>`;
      case 'family': return `<button class="btn sm primary" data-act="ad-step" data-id="${a.id}" data-to="finance">ارجاع به واحد مالی</button>${r}`;
      case 'finance': return finTag(a) + (isBoss() ? `<button class="btn sm primary" data-act="ad-step" data-id="${a.id}" data-to="final">تأیید نهایی</button>` : '<span class="muted small">منتظر تأیید نهایی مدیر</span>');
      case 'final': return `<span class="tag ok">پذیرش نهایی شد</span>${finTag(a)}`;
      default: return `<span class="tag bad">رد شد${a.why ? ' · ' + esc(a.why) : ''}</span>`;
    }
  }
  function enroll() {
    const o = O(), ap = o.applicants, cap = o.capacity, en = o.enrolled;
    const kpis = `<div class="grid g3">${D.gradesOf(ctx.school()).map(g => {
      const n = en[g] || 0, wait = ap.filter(a => +a.grade === g && !['finance', 'final', 'rejected'].includes(a.stage)).length;
      return `<div class="card kpi tone-rose"><div class="l">پایهٔ ${esc(GN(g))}</div><div class="v num">${fa(n)} <span class="small muted">از ${fa(cap[g])}</span></div>
        <div class="bar" style="margin:6px 0"><i style="width:${Math.min(100, n / cap[g] * 100)}%;${n >= cap[g] ? 'background:var(--bad)' : ''}"></i></div><div class="s">${fa(cap[g] - n)} جای خالی · ${fa(wait)} متقاضی در جریان</div></div>`;
    }).join('')}</div>`;
    const counts = Object.fromEntries([...ST.map(s => s[0]), 'rejected'].map(k => [k, ap.filter(a => a.stage === k).length]));
    const filt = `<div class="chips-row" role="radiogroup" aria-label="مرحله">${[['all', 'همه', ap.length], ...ST.map(([k, l]) => [k, l, counts[k]]), ['rejected', 'ردشده', counts.rejected]]
      .map(([k, l, n]) => `<button role="radio" aria-checked="${state.stage === k}" class="fchip" data-act="ad-filter" data-id="${k}">${l} <b>${fa(n)}</b></button>`).join('')}</div>`;
    const list = ap.filter(a => state.stage === 'all' ? a.stage !== 'rejected' : a.stage === state.stage).slice().sort((a, b) => stIdx(a.stage) - stIdx(b.stage) || b.date.localeCompare(a.date));
    return `<div class="note spread"><span>خانواده‌ها فرم ثبت‌نام و مدارک را در <b>پورتال ثبت‌نام</b> می‌فرستند (ورود با کد ملی دانش‌آموز) و پرونده همین‌جا می‌آید. متقاضی را دستی هم می‌شود افزود؛ نام‌های قدیمی این فهرست نمونه‌اند.</span>
        <span class="row"><a class="btn sm" href="enroll.html" target="_blank" rel="noopener">باز کردن پورتال</a><button class="btn sm" data-act="ad-link">کپی نشانی</button></span></div>`
      + kpis + `<div class="spread" style="margin:18px 0 8px"><h2 style="font-size:16px;margin:0">کارتابل پذیرش</h2>${canAdmit() ? '<button class="btn primary" data-act="ad-new">+ متقاضی (دستی)</button>' : ''}</div>` + filt
      + (list.map(a => `<article class="card appl"><div class="spread"><div><b>${esc(a.name)}</b> <span class="muted small">پایهٔ ${esc(GN(a.grade))} · ${a.source === 'portal' ? 'از پورتال' : a.source === 'site' ? 'از سایت' : 'دستی'} · ${esc(J.format(a.date))}</span>
          ${a.parent ? `<div class="muted small">ولی: ${esc(a.parent)}${a.phone ? ' · ' + esc(digits(a.phone)) : ''}</div>` : ''}</div><span class="row">${a.source === 'portal' ? `<button class="btn sm" data-act="ad-form" data-id="${a.id}">فرم و مدارک</button>` : ''}<button class="btn sm" data-act="ad-open" data-id="${a.id}">پرونده</button></span></div>
        ${timeline(a)}<div class="row appl-act">${canAdmit() ? nextAction(a) : ''}</div></article>`).join('') || `<div class="card">${empty('کسی در این مرحله نیست.')}</div>`);
  }
  const log = (a, text) => { a.history = a.history || []; a.history.push({ at: nowIso(), by: me(), text }); };
  function applicantModal() {
    modal(`<h2>متقاضی تازه</h2><label class="field"><span>نام دانش‌آموز</span><input class="input" id="p-n"></label>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>پایه</span><select class="input" id="p-g">${D.gradesOf(ctx.school()).map(g => `<option value="${g}">${esc(GN(g))}</option>`).join('')}</select></label>
      <label class="field"><span>نام ولی</span><input class="input" id="p-p"></label></div>
      <label class="field"><span>تلفن ولی</span><input class="input num" id="p-t" inputmode="tel" dir="ltr"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">افزودن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#p-n')) return UI.invalid('#p-n', 'نام را بنویسید.');
        const a = { id: D.uid('p'), name: v(root, '#p-n'), grade: +v(root, '#p-g'), parent: v(root, '#p-p'), phone: v(root, '#p-t'), stage: 'new', date: today, source: 'manual', history: [] };
        log(a, 'ثبت دستی درخواست'); O().applicants.push(a); done('متقاضی افزوده شد.');
      };
    });
  }
  function timeModal(a, kind) {
    const t = kind === 'meet' ? 'وقت جلسه با خانواده' : 'وقت آزمون ورودی';
    modal(`<h2>${t} ـ ${esc(a.name)}</h2><div class="grid g2" style="gap:0 12px"><div class="field"><span>روز</span>${J.field('t-d', D.shift(3))}</div>
      <label class="field"><span>ساعت</span><input class="input num" type="time" id="t-h" value="10:00"></label></div>
      <p class="muted small">پیامک یا تماس با خانواده بعداً از پنل پیامک فرستاده می‌شود.</p>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const at = v(root, '#t-d') + 'T' + (v(root, '#t-h') || '10:00');
        if (kind === 'meet') { a.meetAt = at; a.stage = 'meeting'; log(a, `وقت جلسه: ${when(at)}`); }
        else { a.examAt = at; a.stage = 'exam'; log(a, `جلسه برگزار شد؛ وقت آزمون: ${when(at)}`); }
        done('ثبت شد.');
      };
    });
  }
  function resultModal(a) {
    modal(`<h2>نتیجهٔ آزمون ـ ${esc(a.name)}</h2><label class="field"><span>نمره (از ۱۰۰)</span><input class="input num" type="number" min="0" max="100" id="r-s"></label>
      <label class="field"><span>توضیح</span><textarea class="input" id="r-n" rows="2"></textarea></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="ok">قبول شد</button><button class="btn danger" id="no">قبول نشد</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const fin = pass => { a.examScore = v(root, '#r-s'); if (pass) { a.stage = 'passed'; } else { a.stage = 'rejected'; a.rejectedAt = 'exam'; a.why = 'قبول نشدن در آزمون'; }
        log(a, `${pass ? 'قبول' : 'رد'} در آزمون${a.examScore ? ` (نمره ${digits(a.examScore)})` : ''}${v(root, '#r-n') ? ' · ' + v(root, '#r-n') : ''}`); done(pass ? 'قبول در آزمون ثبت شد.' : 'رد ثبت شد.'); };
      root.querySelector('#ok').onclick = () => fin(true); root.querySelector('#no').onclick = () => fin(false);
    });
  }
  function applicantFile(a) {
    modal(`<h2>${esc(a.name)}</h2><p class="muted small">پایهٔ ${esc(GN(a.grade))} · درخواست ${esc(J.format(a.date))}${a.examScore ? ` · نمرهٔ آزمون ${fa(a.examScore)}` : ''}</p>${timeline(a)}
      <h3 style="font-size:15px;margin:16px 0 6px">سابقه</h3>${(a.history || []).slice().reverse().map(h => `<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)">${esc(h.text)}<div class="muted">${esc(nameOf(h.by))} · ${esc(when(h.at.slice(0, 16)))}</div></div>`).join('') || '<p class="muted small">سابقه‌ای ثبت نشده.</p>'}
      <div class="row" style="margin-top:18px"><button class="btn" data-close>بستن</button></div>`);
  }

  /* ---------------- finance ---------------- */
  const LINES = [['tuition', 'شهریهٔ آموزشی'], ['extra', 'فوق‌برنامه و خدمات'], ['books', 'کتاب و لوازم'], ['transport', 'سرویس'], ['food', 'تغذیه']];
  const total = f => LINES.reduce((s, [k]) => s + (+f[k] || 0), 0) - (+f.discount || 0);
  const referred = () => O().applicants.filter(a => ['finance', 'final'].includes(a.stage));
  function fees() {
    const fin = O().finance.students, list = referred();
    const sum = list.reduce((s, a) => { const f = fin[a.id]; if (f) { s.t += total(f); s.p += +f.paid || 0; } return s; }, { t: 0, p: 0 });
    return note('ستون‌های هزینه فعلاً پیش‌فرض‌اند؛ شیوه‌نامه و قالب اکسل واحد مالی را که بفرستید، دقیقاً مطابق آن می‌شود.')
      + `<div class="grid g3"><div class="card kpi tone-teal"><div class="l">ارجاع‌شده از پذیرش</div><div class="v num">${fa(list.length)}</div><div class="s">${fa(list.filter(a => !fin[a.id]).length)} نفر بی‌برآورد</div></div>
        <div class="card kpi tone-blue"><div class="l">جمع هزینه‌ها</div><div class="v num" style="font-size:20px">${money(sum.t)}</div></div>
        <div class="card kpi tone-amber"><div class="l">مانده</div><div class="v num" style="font-size:20px">${money(sum.t - sum.p)}</div></div></div>
      <div class="card" style="margin-top:16px"><div class="card-head"><h2 style="margin:0">پذیرفته‌شدگان و هزینه‌ها</h2><div class="row">
        <button class="btn sm" data-act="fn-template">دانلود قالب اکسل</button><label class="btn sm primary">بارگذاری اکسل<input type="file" id="fn-import" accept=".xlsx,.xls" hidden></label></div></div>
        ${list.length ? `<div class="table-wrap"><table><thead><tr><th>دانش‌آموز</th>${LINES.map(([, l]) => `<th>${l}</th>`).join('')}<th>تخفیف</th><th>جمع</th><th>پرداخت‌شده</th><th>وضعیت</th><th></th></tr></thead><tbody>
          ${list.map(a => { const f = fin[a.id]; const t = f ? total(f) : 0;
            return `<tr><td><b>${esc(a.name)}</b><div class="muted small">پایهٔ ${esc(GN(a.grade))}</div></td>${f ? LINES.map(([k]) => `<td class="num">${fa(+f[k] || 0)}</td>`).join('') + `<td class="num">${fa(+f.discount || 0)}</td><td class="num"><b>${fa(t)}</b></td><td class="num">${fa(+f.paid || 0)}</td>
              <td>${t > 0 && (+f.paid || 0) >= t ? '<span class="tag ok">تسویه</span>' : `<span class="tag warn">مانده ${fa(t - (+f.paid || 0))}</span>`}</td>` : `<td colspan="${LINES.length + 4}" class="muted small">هنوز برآورد نشده</td>`}
              <td><button class="btn sm" data-act="fn-edit" data-id="${a.id}">${f ? 'جزئیات' : 'برآورد'}</button></td></tr>`; }).join('')}</tbody></table></div><p class="muted small">مبالغ به تومان.</p>` : empty('هنوز کسی از پذیرش ارجاع نشده.')}</div>`;
  }
  function feeModal(a) {
    const f = O().finance.students[a.id] || {};
    modal(`<h2>هزینه‌های ${esc(a.name)}</h2><p class="muted small">پایهٔ ${esc(GN(a.grade))} · به تومان؛ همین ریز هزینه برای خانواده شفاف نمایش داده می‌شود.</p>
      <div class="grid g2" style="gap:0 12px">${[...LINES, ['discount', 'تخفیف'], ['paid', 'پرداخت‌شده']].map(([k, l]) => `<label class="field"><span>${l}</span><input class="input num" type="number" min="0" step="1000" data-fee="${k}" value="${+f[k] || ''}"></label>`).join('')}</div>
      <label class="field"><span>توضیح</span><input class="input" id="f-n" value="${esc(f.note || '')}"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const n = { note: v(root, '#f-n') }; root.querySelectorAll('[data-fee]').forEach(i => { n[i.dataset.fee] = Math.max(0, +i.value || 0); });
        O().finance.students[a.id] = n; log(a, `برآورد هزینه در واحد مالی: ${money(total(n))}`); done('ذخیره شد.');
      };
    });
  }
  // Fixed template: row 1 headers; column A the applicant code, B name, C grade, then the cost columns in LINES order, discount, paid.
  const HEAD = ['کد', 'نام', 'پایه', ...LINES.map(l => l[1]), 'تخفیف', 'پرداخت‌شده'];
  async function feeTemplate() {
    let X; try { X = await xlsx(); } catch (e) { return toast('کتابخانهٔ اکسل بار نشد (اینترنت لازم است).'); }
    const fin = O().finance.students;
    const rows = [HEAD, ...referred().map(a => { const f = fin[a.id] || {}; return [a.id, a.name, GN(a.grade), ...LINES.map(([k]) => +f[k] || 0), +f.discount || 0, +f.paid || 0]; })];
    const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = HEAD.map((_, i) => ({ wch: i === 1 ? 24 : 14 }));
    const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; X.utils.book_append_sheet(wb, ws, 'هزینه‌ها');
    X.writeFile(wb, 'قالب-هزینه‌های-پذیرفته‌شدگان.xlsx');
  }
  async function feeImport(file) {
    let X; try { X = await xlsx(); } catch (e) { return toast('کتابخانهٔ اکسل بار نشد (اینترنت لازم است).'); }
    const wb = X.read(await file.arrayBuffer()), rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const norm = s => String(s ?? '').trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    if (norm(rows[0]?.[0]) !== 'کد') return toast('این فایل با قالب واحد مالی نمی‌خواند؛ قالب را از همین صفحه بگیرید.');
    const list = referred(), fin = O().finance.students, miss = []; let n = 0;
    rows.slice(1).filter(r => r.length).forEach(r => {
      const a = list.find(x => x.id === norm(r[0])) || list.find(x => norm(x.name) === norm(r[1]));
      if (!a) { if (norm(r[1])) miss.push(norm(r[1])); return; }
      const f = { note: fin[a.id]?.note || '' }; LINES.forEach(([k], i) => { f[k] = Math.max(0, +r[3 + i] || 0); });
      f.discount = Math.max(0, +r[3 + LINES.length] || 0); f.paid = Math.max(0, +r[4 + LINES.length] || 0);
      fin[a.id] = f; log(a, `هزینه از اکسل: ${money(total(f))}`); n++;
    });
    save(); render(); toast(`${fa(n)} ردیف وارد شد${miss.length ? `؛ پیدا نشد: ${miss.join('، ')}` : ''}.`);
  }

  /* ---------------- wallets ---------------- */
  const W = key => { const o = O(); return (o.wallets[key] = o.wallets[key] || { balance: 0, tx: [] }); };
  const bal = key => O().wallets[key]?.balance || 0;
  const stKey = (g, sid) => `st:${g}:${sid}`;
  const keyName = key => { if (!key.startsWith('st:')) return nameOf(key); const [, g, sid] = key.split(':'); return D.get(ctx.school().id, +g).students.find(s => s.id === sid)?.name || sid; };
  function charge(key, amount, noteText) { const w = W(key); w.balance += amount; w.tx.unshift({ at: nowIso(), amount, note: noteText, by: me() }); }
  function chargeModal(key, self) {
    modal(`<h2>شارژ کیف پول ـ ${esc(keyName(key))}</h2><p class="muted small">موجودی: ${money(bal(key))}</p>
      <div class="row" style="margin-bottom:8px">${[200000, 500000, 1000000].map(n => `<button class="btn sm" type="button" data-amt="${n}">${money(n)}</button>`).join('')}</div>
      <label class="field"><span>مبلغ (تومان)</span><input class="input num" type="number" min="1000" step="1000" id="w-a"></label>
      ${self ? '<p class="muted small">در نسخهٔ واقعی این دکمه به درگاه پرداخت می‌رود؛ اینجا فقط ثبت می‌شود.</p>' : ''}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">شارژ</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { root.querySelector('#w-a').value = b.dataset.amt; });
      root.querySelector('#save').onclick = () => {
        const a = Math.round(+v(root, '#w-a')); if (!(a >= 1000)) return UI.invalid('#w-a', 'مبلغ را دست‌کم ۱٬۰۰۰ تومان بنویسید.');
        charge(key, a, self ? 'شارژ توسط خود فرد' : 'شارژ توسط مدرسه'); done('کیف پول شارژ شد.');
      };
    });
  }
  function wallets() {
    const gs = D.gradesOf(ctx.school()); if (!gs.includes(state.wGrade)) state.wGrade = gs[0];
    const staff = ctx.people().map(p => p[0]), ss = D.get(ctx.school().id, state.wGrade).students;
    const row = key => `<tr><td>${esc(keyName(key))}</td><td class="num">${money(bal(key))}</td><td class="muted small">${esc(O().wallets[key]?.tx[0] ? J.format(O().wallets[key].tx[0].at.slice(0, 10)) : '—')}</td>
      <td><button class="btn sm" data-act="wl-charge" data-id="${key}">شارژ</button></td></tr>`;
    return `<div class="grid g2" style="align-items:start"><div class="card"><h2>کارکنان</h2><div class="table-wrap"><table><thead><tr><th>نام</th><th>موجودی</th><th>آخرین تراکنش</th><th></th></tr></thead><tbody>${staff.map(row).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-head"><h2 style="margin:0">دانش‌آموزان</h2><select class="input" id="wl-g" style="width:auto" aria-label="پایه">${gs.map(g => `<option value="${g}" ${g === state.wGrade ? 'selected' : ''}>پایهٔ ${esc(GN(g))}</option>`).join('')}</select></div>
        <div class="table-wrap" style="max-height:520px"><table><thead><tr><th>نام</th><th>موجودی</th><th>آخرین تراکنش</th><th></th></tr></thead><tbody>${ss.map(s => row(stKey(state.wGrade, s.id))).join('')}</tbody></table></div></div></div>`;
  }

  /* ---------------- hiring ---------------- */
  const HS = [['new', 'درخواست از سایت'], ['meeting', 'جلسه'], ['review', 'بررسی رزومه'], ['finance', 'ارجاع به واحد مالی'], ['approved', 'تأیید نهایی مدیر']];
  const hIdx = s => HS.findIndex(x => x[0] === s);
  function hire() {
    const H = O().hire.applicants;
    const tabs = `<div class="seg" role="radiogroup" aria-label="بخش" style="margin-bottom:12px"><button role="radio" aria-checked="${state.hTab === 'cart'}" data-act="hr-tab" data-id="cart">کارتابل استخدام</button>
      <button role="radio" aria-checked="${state.hTab === 'contract'}" data-act="hr-tab" data-id="contract">قراردادها (${fa(H.filter(h => h.stage === 'approved').length)})</button></div>`;
    if (state.hTab === 'contract') {
      const ok = H.filter(h => h.stage === 'approved');
      const editing = state.cEdit && ok.find(h => h.id === state.cEdit);
      if (editing) return tabs + contractEditor(editing);
      return tabs + note('شرایط و بندهای قرارداد را که بفرستید، به فرم قرارداد اضافه می‌شود.') + (ok.map(h => { const c = h.contract;
        return `<div class="card"><div class="card-head"><div><h2 style="margin:0">${esc(h.name)}</h2><div class="muted small">${esc(h.position)}</div></div>
          ${c ? `<span class="tag ${c.signed ? 'ok' : 'warn'}">${c.signed ? 'امضا شد' : 'پیش‌نویس'}</span>` : '<span class="tag grey">بدون قرارداد</span>'}</div>
          ${c?.v === 2 ? (() => { const k = contractCalc(c); return `<div class="small">${c.teach.on ? `تدریس ${fa(k.tw)} ساعت در هفته` : ''}${c.teach.on && c.work.on ? ' · ' : ''}${c.work.on ? `${esc(c.work.job)} ${fa(k.ww)} ساعت در هفته` : ''} · از ${esc(J.format(c.from))}${c.to ? ` تا ${esc(J.format(c.to))}` : ''}</div>
            <div class="small">جمع کل قرارداد: <b>${rial(k.total)}</b> · ${INS[c.ins.status]}</div>${c.note ? `<p class="small" style="white-space:pre-wrap">${esc(c.note)}</p>` : ''}`; })()
          : c ? `<div class="small">${esc(c.type)} · از ${esc(J.format(c.from))}${c.to ? ` تا ${esc(J.format(c.to))}` : ''} · ${money(+c.pay || 0)} ${esc(c.payUnit)}${c.hours ? ` · ${fa(c.hours)} ساعت در هفته` : ''}</div>${c.terms ? `<p class="small" style="white-space:pre-wrap">${esc(c.terms)}</p>` : ''}` : ''}
          <div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="hr-contract" data-id="${h.id}">${c ? 'ویرایش قرارداد' : 'تنظیم قرارداد'}</button>${c && !c.signed ? `<button class="btn sm" data-act="hr-sign" data-id="${h.id}">ثبت امضا</button>` : ''}</div></div>`; }).join('')
        || `<div class="card">${empty('هنوز کسی تأیید نشده.')}</div>`);
    }
    const open = H.filter(h => h.stage !== 'rejected').sort((a, b) => hIdx(a.stage) - hIdx(b.stage));
    return tabs + `<div class="note spread"><span>متقاضیان فرم همکاری را در <b>پورتال متقاضیان</b> پر می‌کنند (ورود با کد ملی) و فرمشان همین‌جا می‌آید. نشانی را برای آن‌ها بفرستید یا روی سایت مدرسه بگذارید.</span>
        <span class="row"><a class="btn sm" href="apply.html" target="_blank" rel="noopener">باز کردن پورتال</a><button class="btn sm" data-act="hr-link">کپی نشانی</button></span></div>`
      + `<div class="spread" style="margin-bottom:8px"><span class="muted small">${fa(open.length)} پرونده در جریان</span>${isBoss() ? '<button class="btn primary" data-act="hr-new">+ متقاضی (دستی)</button>' : ''}</div>`
      + (open.map(h => `<article class="card appl"><div class="spread"><div><b>${esc(h.name)}</b> <span class="muted small">${esc(h.position)} · ${esc(J.format(h.date))}</span></div>
          <span class="row">${h.source === 'portal' ? '<span class="tag blue">از پورتال</span><button class="btn sm" data-act="hr-form" data-id="' + h.id + '">فرم کامل</button>' : ''}${h.resume ? `<a class="btn sm" href="${esc(h.resume.data)}" download="${esc(h.resume.name)}">رزومه</a>` : ''}</span></div>
        <ol class="tl-steps">${HS.map(([k, l], i) => `<li class="${i < hIdx(h.stage) || h.stage === 'approved' ? 'done' : i === hIdx(h.stage) ? 'cur' : ''}"><span></span><em>${l}</em></li>`).join('')}</ol>
        <div class="row appl-act">${isBoss() ? hireAction(h) : ''}</div></article>`).join('') || `<div class="card">${empty('پرونده‌ای نیست.')}</div>`)
      + (H.some(h => h.stage === 'rejected') ? `<details style="margin-top:12px"><summary class="small" style="cursor:pointer">ردشده‌ها (${fa(H.filter(h => h.stage === 'rejected').length)})</summary><div class="card" style="margin-top:8px">${H.filter(h => h.stage === 'rejected').map(h => `<div class="small">${esc(h.name)} · ${esc(h.position)}</div>`).join('')}</div></details>` : '');
  }
  function hireAction(h) {
    const r = `<button class="btn sm danger" data-act="hr-reject" data-id="${h.id}">رد</button>`;
    const cv = `<label class="btn sm">${h.resume ? 'رزومهٔ تازه' : 'بارگذاری رزومه'}<input type="file" hidden data-cv="${h.id}" accept=".pdf,.doc,.docx,.jpg,.png"></label>`;
    if (h.stage === 'new') return `<button class="btn sm primary" data-act="hr-meet" data-id="${h.id}">تعیین وقت جلسه</button>${cv}${r}`;
    if (h.stage === 'meeting') return `<span class="small">جلسه: <b>${esc(when(h.meetAt))}</b></span><button class="btn sm primary" data-act="hr-step" data-id="${h.id}" data-to="review">جلسه برگزار شد</button>${cv}${r}`;
    if (h.stage === 'review') return `${cv}<button class="btn sm primary" data-act="hr-step" data-id="${h.id}" data-to="finance">ارجاع به واحد مالی</button>${r}`;
    if (h.stage === 'finance') return `<span class="tag warn">نزد واحد مالی</span><button class="btn sm primary" data-act="hr-step" data-id="${h.id}" data-to="approved">تأیید نهایی و رفتن به قرارداد</button>${r}`;
    return `<span class="tag ok">تأیید نهایی شد</span><button class="btn sm" data-act="hr-tab" data-id="contract">قرارداد ←</button>`;
  }
  function hireNewModal() {
    modal(`<h2>متقاضی همکاری</h2><label class="field"><span>نام</span><input class="input" id="h-n"></label><label class="field"><span>سمت درخواستی</span><input class="input" id="h-p"></label>
      <label class="field"><span>تلفن</span><input class="input num" id="h-t" dir="ltr" inputmode="tel"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">افزودن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#h-n') || !v(root, '#h-p')) return UI.invalid(['#h-n', '#h-p'], 'نام و سمت را بنویسید.');
        O().hire.applicants.push({ id: D.uid('h'), name: v(root, '#h-n'), position: v(root, '#h-p'), phone: v(root, '#h-t'), date: today, stage: 'new', history: [] }); done('افزوده شد.');
      };
    });
  }
  function hireMeetModal(h) {
    modal(`<h2>وقت جلسه ـ ${esc(h.name)}</h2><div class="grid g2" style="gap:0 12px"><div class="field"><span>روز</span>${J.field('m-d', D.shift(2))}</div>
      <label class="field"><span>ساعت</span><input class="input num" type="time" id="m-h" value="10:00"></label></div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { h.meetAt = v(root, '#m-d') + 'T' + (v(root, '#m-h') || '10:00'); h.stage = 'meeting'; done('وقت جلسه ثبت شد.'); };
    });
  }
  /* ---------------- hiring contract: pay sheet ---------------- */
  // The school's contract sheet (from its current system): teaching pay, work pay, a summary, insurance by year,
  // and the totals. Amounts in rials. Monthly pay = hourly rate × weekly hours × 4; the contract total adds each part
  // over its months. Insurance: 7% staff and 23% school of (insured salary + housing + food allowance).
  // The hourly rate is entered for now; it comes from «امتیاز جذب» and «ضریب کارایی» once the finance unit sends the formula.
  const JOBS = ['معلم راهنما', 'معاون آموزشی', 'معاون اجرایی', 'معاون پرورشی', 'ناظم', 'کارمند واحد مالی', 'کارمند اداری', 'خدمات'];
  const INS = { none: 'بدون بیمه', floor: 'کف بیمه', full: 'بیمهٔ کامل' };
  const rial = n => `${fa(Math.round(n || 0))} ریال`;
  function blankContract(h) {
    const t = J.isoToJ(today);
    return { v: 2, from: today, to: '', signed: false, note: '',
      teach: { on: true, grade: 7, set: 'متوسطه پسرانه مهر هشتم', resp: 0, eff: 80, points: 0, hours: 0, pract: 0, practF: 1, hourly: 0, months: 9 },
      work: { on: false, job: h?.position && JOBS.includes(h.position) ? h.position : JOBS[0], set: 'متوسطه پسرانه مهر هشتم', resp: 0, eff: 80, points: 0, remote: 0, hours: 0, hourly: 0, months: 12 },
      prev: { teach: 0, work: 0 },
      ins: { status: 'none', days: 30, payer: 'staff', sev: 0,
        rows: [{ year: digitsEn(t.jy), kind: 'واقعی', months: 9, salary: 0, housing: 0, food: 0, child: 0, tax: 0, deduct: 0 },
          { year: digitsEn(t.jy + 1), kind: 'تخمین', months: 3, salary: 0, housing: 0, food: 0, child: 0, tax: 0, deduct: 0 }] } };
  }
  const digitsEn = n => String(n);
  function contractCalc(c) {
    const tw = c.teach.on ? (+c.teach.hours || 0) + (+c.teach.pract || 0) * (+c.teach.practF || 1) : 0, ww = c.work.on ? (+c.work.hours || 0) + (+c.work.remote || 0) : 0;
    const tm = (+c.teach.hourly || 0) * tw * 4, wm = (+c.work.hourly || 0) * ww * 4;
    const inc = (now, before) => before > 0 && now > 0 ? Math.round((now / before - 1) * 1000) / 10 : null;
    const rows = c.ins.rows.map(r => { const base = (+r.salary || 0) + (+r.housing || 0) + (+r.food || 0), month = base + (+r.child || 0);
      const on = c.ins.status !== 'none', emp = on ? base * 0.07 : 0, sch = on ? base * 0.23 : 0;
      return { month, emp, sch, year: month * (+r.months || 0), net: month - emp - (+r.tax || 0) - (+r.deduct || 0) }; });
    const total = tm * (c.teach.on ? +c.teach.months || 0 : 0) + wm * (c.work.on ? +c.work.months || 0 : 0);
    const insured = c.ins.status === 'none' ? 0 : rows.reduce((a, r) => a + r.year, 0);
    return { tw, ww, tm, wm, ti: inc(+c.teach.hourly, +c.prev.teach), wi: inc(+c.work.hourly, +c.prev.work), rows, total, insured, contractor: total - insured,
      avgH: tw + ww ? (tm + wm) / 4 / (tw + ww) : 0 };
  }
  // Inputs carry their path in data-cf («teach.hours», «ins.rows.0.salary»); outputs carry data-out.
  const num = (path, val, attrs = '') => `<input class="input num" type="number" min="0" data-cf="${path}" value="${esc(val ?? '')}" ${attrs}>`;
  function contractEditor(h) {
    const c = h.contract?.v === 2 ? h.contract : blankContract(h), gs = D.gradesOf(ctx.school());
    state.cDraft = JSON.parse(JSON.stringify(c));
    const out = k => `<span data-out="${k}"></span>`;
    return `<div class="card" id="ce-form"><div class="card-head"><h2 style="margin:0">قرارداد ${esc(h.name)}</h2><span class="muted small">${esc(h.position)} · مبلغ‌ها به ریال</span></div>
        <div class="grid g3" style="gap:0 12px"><div class="field"><span>شروع قرارداد</span>${J.field('ce-from', c.from)}</div><div class="field"><span>پایان قرارداد</span>${J.field('ce-to', c.to || '')}</div></div></div>
      <div class="card"><div class="card-head"><h2 style="margin:0"><label class="act-line"><input type="checkbox" data-cf="teach.on" ${c.teach.on ? 'checked' : ''}> تعیین حقوق تدریس</label></h2></div>
        <div class="table-wrap"><table class="no-cards ce-table"><thead><tr><th>پایهٔ تحصیلی</th><th>مجموعه</th><th>حق مسئولیت</th><th>ضریب کارایی</th><th>امتیاز جذب</th><th>ساعات تدریس</th><th>ساعات تدریس عملی</th><th>ضریب عملی</th><th>حقوق ساعتی</th><th>حقوق تدریس ماهانه</th><th>ماه</th></tr></thead>
          <tbody><tr><td><select class="input" data-cf="teach.grade" aria-label="پایه">${gs.map(g => `<option value="${g}" ${+c.teach.grade === g ? 'selected' : ''}>پایهٔ ${esc(D.GRADE_NAME[g])}</option>`).join('')}</select></td>
            <td><input class="input" data-cf="teach.set" value="${esc(c.teach.set)}" aria-label="مجموعه"></td><td>${num('teach.resp', c.teach.resp, 'aria-label="حق مسئولیت"')}</td><td>${num('teach.eff', c.teach.eff, 'aria-label="ضریب کارایی"')}</td>
            <td>${num('teach.points', c.teach.points, 'aria-label="امتیاز جذب"')}</td><td>${num('teach.hours', c.teach.hours, 'aria-label="ساعات تدریس در هفته"')}</td><td>${num('teach.pract', c.teach.pract, 'aria-label="ساعات تدریس عملی"')}</td>
            <td>${num('teach.practF', c.teach.practF, 'step="0.1" aria-label="ضریب عملی"')}</td><td>${num('teach.hourly', c.teach.hourly, 'step="1000" aria-label="حقوق ساعتی تدریس"')}</td><td class="num ce-key">${out('tm')}</td><td>${num('teach.months', c.teach.months, 'max="12" aria-label="ماه‌های تدریس"')}</td></tr></tbody></table></div></div>
      <div class="card"><div class="card-head"><h2 style="margin:0"><label class="act-line"><input type="checkbox" data-cf="work.on" ${c.work.on ? 'checked' : ''}> تعیین حقوق کار</label></h2></div>
        <div class="table-wrap"><table class="no-cards ce-table"><thead><tr><th>رستهٔ شغلی</th><th>مجموعه</th><th>حق مسئولیت</th><th>ضریب کارایی</th><th>امتیاز جذب</th><th>ساعات دورکاری</th><th>ساعات کار</th><th>حقوق ساعتی</th><th>حقوق ماهانه</th><th>ماه</th></tr></thead>
          <tbody><tr><td><select class="input" data-cf="work.job" aria-label="رستهٔ شغلی">${JOBS.map(x => `<option ${x === c.work.job ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></td>
            <td><input class="input" data-cf="work.set" value="${esc(c.work.set)}" aria-label="مجموعه"></td><td>${num('work.resp', c.work.resp, 'aria-label="حق مسئولیت"')}</td><td>${num('work.eff', c.work.eff, 'aria-label="ضریب کارایی"')}</td>
            <td>${num('work.points', c.work.points, 'aria-label="امتیاز جذب"')}</td><td>${num('work.remote', c.work.remote, 'aria-label="ساعات دورکاری در هفته"')}</td><td>${num('work.hours', c.work.hours, 'aria-label="ساعات کار در هفته"')}</td>
            <td>${num('work.hourly', c.work.hourly, 'step="1000" aria-label="حقوق ساعتی کار"')}</td><td class="num ce-key">${out('wm')}</td><td>${num('work.months', c.work.months, 'max="12" aria-label="ماه‌های کار"')}</td></tr></tbody></table></div>
        <p class="muted small">حقوق ساعتی فعلاً دستی وارد می‌شود؛ فرمول محاسبه از امتیاز جذب و ضریب کارایی را که واحد مالی بفرستد، خودکار می‌شود.</p></div>
      <div class="card"><h2 style="margin-top:0">جمع‌بندی حقوق و دستمزد</h2>
        <div class="table-wrap"><table class="no-cards ce-table"><thead><tr><th></th><th colspan="4">تدریس</th><th colspan="4">کار</th><th colspan="2">جمع کل</th></tr>
          <tr><th></th><th>ساعات هفتگی</th><th>حقوق ساعتی</th><th>درصد افزایش</th><th>حقوق ماهانه</th><th>ساعات هفتگی</th><th>حقوق ساعتی</th><th>درصد افزایش</th><th>حقوق ماهانه</th><th>جمع ساعات هفتگی</th><th>حقوق ماهانه</th></tr></thead>
          <tbody><tr><td>قرارداد فعلی</td><td class="num">${out('tw')}</td><td class="num">${out('th')}</td><td class="num">${out('ti')}</td><td class="num">${out('tm2')}</td><td class="num">${out('ww')}</td><td class="num">${out('wh')}</td><td class="num">${out('wi')}</td><td class="num">${out('wm2')}</td><td class="num">${out('sw')}</td><td class="num ce-key">${out('sm')}</td></tr></tbody></table></div>
        <div class="row small" style="margin-top:8px"><span class="muted">برای درصد افزایش، حقوق ساعتی قرارداد قبلی:</span><label>تدریس ${num('prev.teach', c.prev.teach, 'step="1000" style="width:130px" aria-label="حقوق ساعتی تدریس قرارداد قبلی"')}</label><label>کار ${num('prev.work', c.prev.work, 'step="1000" style="width:130px" aria-label="حقوق ساعتی کار قرارداد قبلی"')}</label></div>
        <p class="muted small">حقوق ماهانه بر اساس دورهٔ قرارداد است: حقوق ماهانهٔ هر بخش × ماه‌های آن ÷ ۱۲.</p></div>
      <div class="card"><h2 style="margin-top:0">قرارداد بیمه‌ای</h2>
        <div class="grid g4" style="gap:0 12px"><label class="field"><span>وضعیت بیمه</span><select class="input" data-cf="ins.status">${Object.entries(INS).map(([k, l]) => `<option value="${k}" ${c.ins.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>تعداد روز بیمه در ماه</span>${num('ins.days', c.ins.days, 'max="31"')}</label>
          <label class="field"><span>هزینهٔ بیمه (مابه‌التفاوت)</span><select class="input" data-cf="ins.payer"><option value="staff" ${c.ins.payer === 'staff' ? 'selected' : ''}>توسط کارمند</option><option value="school" ${c.ins.payer === 'school' ? 'selected' : ''}>توسط کارفرما</option></select></label>
          <label class="field"><span>حق سنوات روزانه</span>${num('ins.sev', c.ins.sev, 'step="1000"')}</label></div>
        <div class="table-wrap ce-ins"><table class="no-cards ce-table"><thead><tr><th>سال</th><th>تعداد ماه</th><th>حقوق ماهانه (بیمه)</th><th>حق مسکن</th><th>بن خواربار</th><th>حق اولاد</th><th>جمع حقوق و مزایا (ماهانه)</th><th>مالیات</th><th>هزینهٔ بیمه (کارمند)</th><th>کسورات مازاد حقوق</th><th>جمع حقوق و مزایا (سالانه)</th><th>هزینهٔ بیمه (کارفرما)</th><th>خالص دریافتی</th></tr></thead><tbody>
          ${c.ins.rows.map((r, i) => `<tr><td>${esc(r.kind)} ${num(`ins.rows.${i}.year`, r.year, 'style="width:76px" aria-label="سال"')}</td><td>${num(`ins.rows.${i}.months`, r.months, 'max="12" style="width:64px" aria-label="تعداد ماه"')}</td>
            ${['salary', 'housing', 'food', 'child'].map(k => `<td>${num(`ins.rows.${i}.${k}`, r[k], 'step="1000" aria-label="' + { salary: 'حقوق ماهانه بیمه', housing: 'حق مسکن', food: 'بن خواربار', child: 'حق اولاد' }[k] + '"')}</td>`).join('')}
            <td class="num">${out(`r${i}month`)}</td><td>${num(`ins.rows.${i}.tax`, r.tax, 'step="1000" aria-label="مالیات"')}</td><td class="num">${out(`r${i}emp`)}</td><td>${num(`ins.rows.${i}.deduct`, r.deduct, 'step="1000" aria-label="کسورات"')}</td>
            <td class="num">${out(`r${i}year`)}</td><td class="num">${out(`r${i}sch`)}</td><td class="num ce-key">${out(`r${i}net`)}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small">هزینهٔ بیمه: ۷٪ سهم کارمند و ۲۳٪ سهم کارفرما از (حقوق بیمه + حق مسکن + بن خواربار).</p></div>
      <div class="card"><div class="grid g3 ce-totals"><div><span class="muted small">مجموع حقوق کل قرارداد</span><b>${out('total')}</b></div><div><span class="muted small">مجموع حقوق بیمه‌ای</span><b>${out('insured')}</b></div><div><span class="muted small">مجموع حقوق پیمانکاری</span><b class="ok-txt">${out('contractor')}</b></div></div></div>
      <div class="card"><label class="field" style="margin:0"><span>سایر توضیحات مدیر</span><textarea class="input" id="ce-note" rows="3">${esc(c.note || '')}</textarea></label></div>
      <div class="row" style="margin-bottom:16px"><button class="btn primary" data-act="ce-save" data-id="${h.id}">ذخیرهٔ قرارداد</button><button class="btn" data-act="ce-cancel">بازگشت به قراردادها</button></div>`;
  }
  function contractRead(root) {
    const c = state.cDraft;
    root.querySelectorAll('[data-cf]').forEach(el => {
      const path = el.dataset.cf.split('.'), last = path.pop(); let o = c; path.forEach(k => { o = o[k]; });
      o[last] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
    });
    c.from = root.querySelector('#ce-from')?.value || c.from; c.to = root.querySelector('#ce-to')?.value || ''; c.note = root.querySelector('#ce-note')?.value || '';
    return c;
  }
  function contractShow(root) {
    const c = contractRead(root), k = contractCalc(c), pct = n => n == null ? '—' : `${fa(n)}٪`, h = n => n ? fa(Math.round(n)) : '—';
    const vals = { tm: h(k.tm), wm: h(k.wm), tw: fa(k.tw), ww: fa(k.ww), th: h(c.teach.on ? c.teach.hourly : 0), wh: h(c.work.on ? c.work.hourly : 0), ti: pct(k.ti), wi: pct(k.wi),
      // The summary spreads each part over the year (pay × months ÷ 12), as the school's sheet does; × 12 gives the contract total.
      tm2: h(k.tm * (c.teach.on ? +c.teach.months || 0 : 0) / 12), wm2: h(k.wm * (c.work.on ? +c.work.months || 0 : 0) / 12), sw: fa(k.tw + k.ww), sm: h(k.total / 12), total: rial(k.total), insured: c.ins.status === 'none' ? '—' : rial(k.insured), contractor: rial(k.contractor) };
    k.rows.forEach((r, i) => Object.assign(vals, { [`r${i}month`]: h(r.month), [`r${i}emp`]: h(r.emp), [`r${i}year`]: h(r.year), [`r${i}sch`]: h(r.sch), [`r${i}net`]: h(r.net) }));
    root.querySelectorAll('[data-out]').forEach(el => { el.textContent = vals[el.dataset.out] ?? ''; });
    root.querySelector('.ce-ins').hidden = c.ins.status === 'none';
  }

  /* ---------------- food ---------------- */
  const F = () => O().food;
  const canOrderFor = () => ctx.actor() === 'counselor' ? D.get(ctx.school().id, ctx.grade()).students : [];
  const forKey = () => state.forWho || me();
  function monthCal(act, sel, marks) {
    const t = J.isoToJ(today); if (!state.month) state.month = { jy: t.jy, jm: t.jm };
    const { jy, jm } = state.month, len = J.monthLength(jy, jm), first = wday(J.jToIso(jy, jm, 1));
    let cells = ''; for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let day = 1; day <= len; day++) { const iso = J.jToIso(jy, jm, day), n = marks(iso);
      cells += `<button class="hw-day ${iso === sel ? 'sel' : ''} ${iso === today ? 'today' : ''}" data-act="${act}" data-id="${iso}" aria-label="${esc(J.format(iso))}${n ? `، ${fa(n)}` : ''}"><span>${digits(day)}</span>${n ? `<i>${fa(n)}</i>` : ''}</button>`; }
    return `<div class="jcal-head"><button type="button" data-act="fd-month" data-id="-1" aria-label="ماه قبل">‹</button><b>${J.MONTHS[jm - 1]} ${digits(jy)}</b><button type="button" data-act="fd-month" data-id="1" aria-label="ماه بعد">›</button></div>
      <div class="hw-grid">${WEEK.map(w => `<span class="wd">${w}</span>`).join('')}${cells}</div>`;
  }
  function food() {
    const f = F(), day = state.day, items = f.menu[day] || [], k = forKey();
    const mine = f.orders.filter(o => o.who === k).sort((a, b) => b.date.localeCompare(a.date));
    const dayOrders = mine.filter(o => o.date === day), already = dayOrders.length > 0;
    const qtyOf = id => dayOrders.filter(o => o.item === id).reduce((t, o) => t + (o.qty || 1), 0);
    const canOrder = !already && day >= today;
    const forSel = canOrderFor().length ? `<label class="small muted" for="fd-for">سفارش برای</label><select class="input" id="fd-for" style="width:auto"><option value="">خودم</option>${canOrderFor().map(s => `<option value="${stKey(ctx.grade(), s.id)}" ${state.forWho === stKey(ctx.grade(), s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : '';
    return `<div class="card"><div class="row" style="justify-content:space-between"><div class="row">${forSel}<span>کیف پول ${esc(keyName(k))}: <b class="num">${money(bal(k))}</b></span></div>
        <button class="btn sm" data-act="wl-self" data-id="${k}">شارژ کیف پول</button></div></div>
      <div class="hw-wrap" style="margin-top:16px"><div class="card">${monthCal('fd-day', day, iso => (f.menu[iso] || []).length)}</div>
        <div class="card"><h2>منوی ${esc(J.format(day))}</h2>${items.length ? items.map(i => `<div class="slot"><span style="flex:1"><b>${esc(i.name)}</b></span><span class="num">${money(i.price)}</span>
            ${canOrder ? `<label class="fd-qty"><span class="sr-only">تعداد ${esc(i.name)}</span><input class="input num" type="number" min="0" max="20" step="1" value="0" data-fq="${i.id}" data-price="${i.price}"></label>`
              : qtyOf(i.id) ? `<span class="tag ok">سفارش شما: ${fa(qtyOf(i.id))} عدد</span>` : ''}</div>`).join('')
            + (canOrder ? `<div class="fd-sum"><span>جمع</span><b class="num" id="fd-sum" aria-live="polite">${money(0)}</b><button class="btn primary" data-act="fd-order">ثبت سفارش</button></div>` : '')
          : empty('برای این روز منویی ثبت نشده.')}
          ${already ? `<div class="fd-sum"><span>جمع سفارش این روز</span><b class="num">${money(dayOrders.reduce((t, o) => t + o.price, 0))}</b>${day >= today ? `<button class="btn sm danger" data-act="fd-cancel" data-id="${day}">لغو سفارش و برگشت پول</button>` : ''}</div>` : ''}${day < today ? '<p class="muted small">سفارش برای روزهای گذشته ممکن نیست.</p>' : ''}</div></div>
      <div class="card"><h2>سفارش‌های ${esc(keyName(k))}</h2>${mine.length ? `<div class="table-wrap"><table>${mine.slice(0, 20).map(o => `<tr><td>${esc(J.format(o.date))}</td><td>${esc(o.name)}${(o.qty || 1) > 1 ? ` × ${fa(o.qty)}` : ''}</td><td class="num">${money(o.price)}</td></tr>`).join('')}</table></div>` : empty('سفارشی نیست.')}</div>`;
  }
  // Orders every dish with a quantity above zero; the whole total comes off the wallet at once.
  // Each dish is one order line whose price is the line total (unit price × quantity).
  function order() {
    const f = F(), k = forKey(), menu = f.menu[state.day] || [];
    if (state.day < today) return toast('روز گذشته است.');
    if (f.orders.some(o => o.who === k && o.date === state.day)) return toast('برای این روز سفارش ثبت شده.');
    const lines = [...document.querySelectorAll('[data-fq]')].map(inp => ({ i: menu.find(x => x.id === inp.dataset.fq), qty: Math.max(0, Math.floor(+inp.value || 0)) })).filter(l => l.i && l.qty > 0);
    if (!lines.length) return UI.invalid(document.querySelector('[data-fq]'), 'تعداد دست‌کم یک غذا را بنویسید.');
    const total = lines.reduce((t, l) => t + l.i.price * l.qty, 0);
    if (bal(k) < total) return toast(`موجودی کافی نیست؛ ${money(total - bal(k))} کم دارد.`);
    charge(k, -total, `غذای ${J.format(state.day)}: ${lines.map(l => `${l.i.name} × ${fa(l.qty)}`).join('، ')}`);
    lines.forEach(l => f.orders.push({ id: D.uid('o'), date: state.day, item: l.i.id, name: l.i.name, unit: l.i.price, qty: l.qty, price: l.i.price * l.qty, who: k, by: me(), at: nowIso() }));
    save(); render(); toast(`سفارش ثبت شد؛ ${money(total)} از کیف پول کم شد.`);
  }
  function foodMenu() {
    const f = F(), day = state.day, items = f.menu[day] || [];
    return `<div class="hw-wrap"><div class="card">${monthCal('fd-day', day, iso => (f.menu[iso] || []).length)}</div>
      <div class="card"><div class="card-head"><h2 style="margin:0">منوی ${esc(J.format(day))}</h2><button class="btn sm" data-act="fm-copy">کپی برای هفتهٔ بعد</button></div>
        ${items.map(i => `<div class="slot"><b style="flex:1">${esc(i.name)}</b><span class="num">${money(i.price)}</span><span class="muted small">${fa(f.orders.filter(o => o.item === i.id).reduce((t, o) => t + (o.qty || 1), 0))} پرس</span>
          <button class="btn sm danger" data-act="fm-del" data-id="${i.id}" aria-label="حذف ${esc(i.name)}">×</button></div>`).join('') || empty('منویی نیست.')}
        <div class="row" style="margin-top:10px"><input class="input" id="fm-n" placeholder="نام غذا" style="flex:1;min-width:140px"><input class="input num" id="fm-p" type="number" min="0" step="1000" placeholder="قیمت (تومان)" style="width:140px">
          <button class="btn primary" data-act="fm-add">افزودن</button></div></div></div>`;
  }
  function foodTrack() {
    const f = F(), day = state.trackDay, list = f.orders.filter(o => o.date === day);
    const by = {}; list.forEach(o => { (by[o.name] = by[o.name] || []).push(o); });
    const sum = list.reduce((s, o) => s + o.price, 0);
    return `<div class="card"><div class="row"><div class="field" style="margin:0;min-width:200px">${J.field('ft-d', day, 'روز')}</div>
        <span class="tag blue">${fa(list.length)} سفارش</span><span class="tag grey">${money(sum)}</span><button class="btn sm" data-act="ft-print">چاپ</button></div></div>
      <div id="ft-sheet">${Object.keys(by).length ? Object.entries(by).map(([n, os]) => `<div class="card"><div class="card-head"><h2 style="margin:0">${esc(n)}</h2><b class="num">${fa(os.reduce((t, o) => t + (o.qty || 1), 0))} پرس</b></div>
        <div class="small">${os.map(o => esc(keyName(o.who)) + ((o.qty || 1) > 1 ? ` (${fa(o.qty)})` : '')).join('، ')}</div></div>`).join('') : `<div class="card">${empty('برای این روز سفارشی نیست.')}</div>`}</div>
      <div class="card"><h2>هفت روز آینده</h2><div class="table-wrap"><table>${[...Array(7)].map((_, i) => { const d = D.shift(i, today), n = f.orders.filter(o => o.date === d).reduce((t, o) => t + (o.qty || 1), 0);
        return `<tr><td>${esc(J.format(d))}</td><td class="num">${fa(n)} پرس</td><td class="num">${fa((f.menu[d] || []).length)} غذا در منو</td></tr>`; }).join('')}</table></div></div>`;
  }

  /* ---------------- services: food and the co-op shop ---------------- */
  // «خدمات» (#/services/<tab>): the food tab is the meal ordering above; the co-op tab sells basic goods to staff.
  const SV_TABS = [['food', 'تغذیه'], ['coop', 'تعاون']];
  function services(tab) {
    const t = SV_TABS.some(x => x[0] === tab) ? tab : 'food';
    return `<nav class="ftabs ctabs" aria-label="بخش‌های خدمات">${SV_TABS.map(([id, l]) => `<a href="#/services/${id}" class="${id === t ? 'on' : ''}" ${id === t ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div style="margin-top:16px">${t === 'coop' ? coop() : food()}</div>`;
  }
  // Co-op data, made once: sample goods (prices are placeholders until the school sets its own).
  // The school's co-op list (from the school, 3 Aban 1405). Prices: Mehr News weekly basics table (week to 1 Aban 1405)
  // and price trackers (nabzgheymat, torob, Mehr 1405); items marked «est» had no 1405 price and are estimates.
  // The executive deputy corrects prices and stock in «مدیریت تعاون».
  const COOP_ITEMS = [
    ['برنج ایرانی', 'کیسهٔ ۱ کیلویی', 520000, 'برنج و غلات'], ['ماکارونی', 'بستهٔ ۷۰۰ گرمی', 120000, 'برنج و غلات', 'est'],
    ['گوشت قرمز', '۱ کیلو', 1545000, 'گوشت و پروتئین'], ['مرغ', '۱ کیلو', 360000, 'گوشت و پروتئین'], ['تخم‌مرغ', 'شانهٔ ۳۰ عددی', 495000, 'گوشت و پروتئین'],
    ['کنسرو ماهی تن', 'قوطی ۱۸۰ گرمی', 170000, 'گوشت و پروتئین'],
    ['عدس', 'بستهٔ ۱ کیلویی', 210000, 'حبوبات'], ['لوبیا قرمز', 'بستهٔ ۱ کیلویی', 280000, 'حبوبات'], ['لوبیا چیتی', 'بستهٔ ۱ کیلویی', 380000, 'حبوبات'],
    ['لوبیا سفید', 'بستهٔ ۱ کیلویی', 300000, 'حبوبات', 'est'], ['نخود', 'بستهٔ ۱ کیلویی', 490000, 'حبوبات'], ['لپه', 'بستهٔ ۱ کیلویی', 330000, 'حبوبات'], ['ماش', 'بستهٔ ۱ کیلویی', 168000, 'حبوبات'],
    ['شیر', 'بطری ۹۴۶ گرمی کم‌چرب', 120000, 'لبنیات'], ['ماست', 'سطل ۲٫۵ کیلویی کم‌چرب', 285000, 'لبنیات'], ['پنیر', 'بستهٔ ۴۰۰ گرمی', 195000, 'لبنیات'], ['کره', 'بستهٔ ۱۰۰ گرمی', 120000, 'لبنیات'],
    ['روغن مایع', 'بطری ۸۱۰ گرمی', 450000, 'روغن، قند و چای'], ['روغن جامد', 'حلب ۹۰۰ گرمی', 480000, 'روغن، قند و چای', 'est'],
    ['شکر', 'بستهٔ ۱ کیلویی', 150000, 'روغن، قند و چای', 'est'], ['قند', 'بستهٔ ۱ کیلویی', 200000, 'روغن، قند و چای', 'est'], ['چای', 'بستهٔ ۴۵۰ گرمی ایرانی', 775000, 'روغن، قند و چای'],
    ['رب گوجه‌فرنگی', 'قوطی ۸۰۰ گرمی', 330000, 'چاشنی و کنسرو'], ['نمک', 'بستهٔ ۱ کیلویی', 40000, 'چاشنی و کنسرو', 'est'], ['سویا', 'بستهٔ ۲۵۰ گرمی', 90000, 'چاشنی و کنسرو', 'est'],
    ['پودر لباسشویی', 'بستهٔ ۵۰۰ گرمی', 96000, 'شوینده و بهداشتی'], ['مایع لباسشویی', 'بطری ۲٫۷ کیلویی', 720000, 'شوینده و بهداشتی'], ['مایع ظرفشویی', 'بطری ۷۵۰ گرمی', 170000, 'شوینده و بهداشتی'],
    ['صابون', 'بستهٔ ۴ عددی', 150000, 'شوینده و بهداشتی', 'est'], ['شامپو', 'بطری ۴۰۰ میلی‌لیتری', 200000, 'شوینده و بهداشتی', 'est'], ['مایع دستشویی', 'بطری ۵۰۰ گرمی', 110000, 'شوینده و بهداشتی'],
    ['سفیدکننده (وایتکس)', 'بطری ۲ لیتری', 376000, 'شوینده و بهداشتی'], ['جرم‌گیر', 'بطری ۷۵۰ گرمی', 90000, 'شوینده و بهداشتی', 'est'], ['شیشه‌پاک‌کن', 'بطری ۵۰۰ میلی‌لیتری', 110000, 'شوینده و بهداشتی', 'est'],
  ];
  function CO() {
    const o = O();
    // The school's real list replaces the first sample list once; orders of sample goods stay as history.
    if (!o.coop || !o.coop.real) {
      const it = ([name, unit, price, cat, est]) => ({ id: D.uid('ci'), name, unit, price, stock: 30, cat, active: true, ...(est ? { est: true } : {}) });
      o.coop = { items: COOP_ITEMS.map(it), orders: o.coop?.orders || [], real: true };
      save();
    }
    return o.coop;
  }
  const ST_CO = { new: ['ثبت‌شده', 'warn'], ready: ['آماده تحویل', 'blue'], done: ['تحویل شد', 'ok'], cancelled: ['لغو شد', 'grey'] };
  const cartTotal = () => Object.entries(state.cart).reduce((s, [id, q]) => { const i = CO().items.find(x => x.id === id); return s + (i ? i.price * q : 0); }, 0);
  function coop() {
    const c = CO(), k = me(), items = c.items.filter(i => i.active);
    const cats = [...new Set(items.map(i => i.cat))];
    const mine = c.orders.filter(o => o.who === k).sort((a, b) => b.at.localeCompare(a.at));
    const lines = Object.entries(state.cart).filter(([, q]) => q > 0);
    const card = i => { const q = state.cart[i.id] || 0, out = i.stock <= 0;
      return `<div class="co-item ${q ? 'in' : ''}"><b>${esc(i.name)}</b><span class="muted small">${esc(i.unit)}</span><span class="num co-price">${money(i.price)}</span>
        <span class="small ${out ? 'bad-txt' : 'muted'}">${out ? 'تمام شد' : `موجودی: ${fa(i.stock)}`}</span>
        <div class="co-qty" role="group" aria-label="تعداد ${esc(i.name)}"><button type="button" class="btn sm" data-act="co-dec" data-id="${i.id}" aria-label="یکی کمتر" ${q ? '' : 'disabled'}>−</button>
          <span class="num" aria-live="polite">${fa(q)}</span><button type="button" class="btn sm" data-act="co-inc" data-id="${i.id}" aria-label="یکی بیشتر" ${q >= i.stock ? 'disabled' : ''}>+</button></div></div>`; };
    return note('اقلام و قیمت‌ها نمونه‌اند؛ مسئول تعاون (معاون اجرایی) فهرست، قیمت و موجودی را تعیین می‌کند. پول سفارش از کیف پول خودتان کم می‌شود.')
      + `<div class="card"><div class="row" style="justify-content:space-between"><span>کیف پول ${esc(keyName(k))}: <b class="num">${money(bal(k))}</b></span>
        <button class="btn sm" data-act="wl-self" data-id="${k}">شارژ کیف پول</button></div></div>
      <div class="co-layout"><div>${cats.map(ct => `<div class="group-head"><h2>${esc(ct)}</h2></div><div class="co-grid">${items.filter(i => i.cat === ct).map(card).join('')}</div>`).join('') || `<div class="card">${empty('فعلاً چیزی برای فروش نیست.')}</div>`}</div>
        <aside class="card co-cart" aria-label="سبد خرید"><h2 style="margin-top:0">سبد خرید</h2>
          ${lines.length ? `<ul class="co-lines">${lines.map(([id, q]) => { const i = c.items.find(x => x.id === id); return `<li><span>${esc(i.name)} × ${fa(q)}</span><span class="num">${money(i.price * q)}</span></li>`; }).join('')}</ul>
            <div class="spread co-total"><b>جمع</b><b class="num">${money(cartTotal())}</b></div>
            ${cartTotal() > bal(k) ? `<p class="small bad-txt" style="margin:6px 0 0">موجودی کیف پول ${money(cartTotal() - bal(k))} کم است.</p>` : ''}
            <div class="row" style="margin-top:10px"><button class="btn primary" data-act="co-order" ${cartTotal() > bal(k) ? 'disabled' : ''}>ثبت سفارش</button><button class="btn" data-act="co-clear">خالی کردن</button></div>`
          : '<p class="muted small" style="margin:0">با دکمهٔ + اقلام را به سبد بیفزایید.</p>'}</aside></div>
      <div class="card"><h2>سفارش‌های من</h2>${mine.length ? mine.map(o => `<div class="co-order"><div class="spread"><span><span class="tag ${ST_CO[o.status][1]}">${ST_CO[o.status][0]}</span> <span class="muted small">${esc(J.format(o.at.slice(0, 10)))}</span></span>
          <b class="num">${money(o.total)}</b></div><div class="small">${o.lines.map(l => `${esc(l.name)} × ${fa(l.qty)}`).join('، ')}</div>
          ${o.status === 'new' ? `<button class="btn sm danger" data-act="co-cancel" data-id="${o.id}">لغو سفارش و برگشت پول</button>` : ''}</div>`).join('') : empty('هنوز از تعاون سفارشی نداده‌اید.')}</div>`;
  }
  function coopOrder() {
    const c = CO(), k = me(), lines = Object.entries(state.cart).filter(([, q]) => q > 0).map(([id, q]) => ({ i: c.items.find(x => x.id === id), q }));
    if (!lines.length) return;
    const short = lines.find(l => l.q > l.i.stock); if (short) return toast(`از «${short.i.name}» فقط ${fa(short.i.stock)} عدد مانده.`);
    const total = lines.reduce((s, l) => s + l.i.price * l.q, 0);
    if (bal(k) < total) return toast(`موجودی کافی نیست؛ ${money(total - bal(k))} کم دارد.`);
    lines.forEach(l => { l.i.stock -= l.q; });
    charge(k, -total, 'خرید از تعاون');
    c.orders.push({ id: D.uid('co'), who: k, at: nowIso(), status: 'new', total, lines: lines.map(l => ({ item: l.i.id, name: l.i.name, unit: l.i.unit, qty: l.q, price: l.i.price })) });
    state.cart = {}; save(); render(); toast('سفارش ثبت شد و از کیف پول کم شد؛ وقتی آماده شد خبر می‌دهیم.');
  }
  // Cancelling gives the money back and returns the goods to stock.
  function coopCancel(o, by) {
    o.status = 'cancelled'; o.cancelledBy = by;
    o.lines.forEach(l => { const i = CO().items.find(x => x.id === l.item); if (i) i.stock += l.qty; });
    charge(o.who, o.total, 'لغو سفارش تعاون');
  }

  // Executive deputy: the goods (price, stock, on sale) and the orders, moved from «ثبت‌شده» to «آماده» to «تحویل شد».
  function coopAdmin() {
    const c = CO(), f = state.coF || 'open';
    const orders = c.orders.filter(o => f === 'all' || (f === 'open' ? ['new', 'ready'].includes(o.status) : o.status === f)).sort((a, b) => b.at.localeCompare(a.at));
    const n = s => c.orders.filter(o => o.status === s).length;
    return `<div class="card"><div class="card-head"><h2 style="margin:0">سفارش‌ها</h2><span class="muted small">جمع سفارش‌های باز: ${money(c.orders.filter(o => ['new', 'ready'].includes(o.status)).reduce((s, o) => s + o.total, 0))}</span></div>
        <div class="chips-row" role="radiogroup" aria-label="وضعیت">${[['open', 'باز', n('new') + n('ready')], ['new', 'ثبت‌شده', n('new')], ['ready', 'آماده تحویل', n('ready')], ['done', 'تحویل شد', n('done')], ['all', 'همه', c.orders.length]]
          .map(([k, l, m]) => `<button role="radio" class="fchip" aria-checked="${f === k}" data-act="ca-f" data-id="${k}">${l} <b>${fa(m)}</b></button>`).join('')}</div>
        ${orders.length ? orders.map(o => `<div class="co-order"><div class="spread"><span><b>${esc(keyName(o.who))}</b> <span class="tag ${ST_CO[o.status][1]}">${ST_CO[o.status][0]}</span> <span class="muted small">${esc(J.format(o.at.slice(0, 10)))}</span></span><b class="num">${money(o.total)}</b></div>
          <div class="small">${o.lines.map(l => `${esc(l.name)} (${esc(l.unit)}) × ${fa(l.qty)}`).join('، ')}</div>
          <div class="row">${o.status === 'new' ? `<button class="btn sm primary" data-act="ca-st" data-id="${o.id}" data-to="ready">آماده شد</button>` : ''}${o.status === 'ready' ? `<button class="btn sm primary" data-act="ca-st" data-id="${o.id}" data-to="done">تحویل شد</button>` : ''}
            ${['new', 'ready'].includes(o.status) ? `<button class="btn sm danger" data-act="ca-cancel" data-id="${o.id}">لغو و برگشت پول</button>` : ''}</div></div>`).join('') : empty('سفارشی در این وضعیت نیست.')}</div>
      <div class="card"><div class="card-head"><h2 style="margin:0">اقلام فروش</h2><button class="btn primary" data-act="ca-item">+ قلم تازه</button></div>
        <div class="table-wrap"><table><thead><tr><th>قلم</th><th>واحد</th><th>دسته</th><th>قیمت</th><th>موجودی</th><th>فروش</th><th></th></tr></thead><tbody>
        ${c.items.map(i => `<tr><td><b>${esc(i.name)}</b></td><td>${esc(i.unit)}</td><td>${esc(i.cat)}</td><td class="num">${money(i.price)}</td><td class="num ${i.stock <= 5 ? 'bad-txt' : ''}">${fa(i.stock)}</td>
          <td>${i.active ? '<span class="tag ok">در فروش</span>' : '<span class="tag grey">متوقف</span>'}</td><td><button class="btn sm" data-act="ca-item" data-id="${i.id}">ویرایش</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function coopItemModal(i) {
    const cats = [...new Set(CO().items.map(x => x.cat))];
    modal(`<h2>${i ? 'ویرایش ' + esc(i.name) : 'قلم تازه'}</h2><div class="grid g2" style="gap:0 12px">
      <label class="field"><span>نام</span><input class="input" id="ci-n" value="${esc(i?.name || '')}"></label>
      <label class="field"><span>واحد (مثلاً بطری ۱٫۵ لیتری)</span><input class="input" id="ci-u" value="${esc(i?.unit || '')}"></label>
      <label class="field"><span>قیمت (تومان)</span><input class="input num" type="number" min="0" step="1000" id="ci-p" value="${i?.price ?? ''}"></label>
      <label class="field"><span>موجودی</span><input class="input num" type="number" min="0" step="1" id="ci-s" value="${i?.stock ?? ''}"></label></div>
      <label class="field"><span>دسته</span><input class="input" id="ci-c" list="ci-cats" value="${esc(i?.cat || '')}"><datalist id="ci-cats">${cats.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
      <label class="row" style="cursor:pointer;margin-top:8px"><input type="checkbox" id="ci-a" ${!i || i.active ? 'checked' : ''}> در فهرست فروش باشد</label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#ci-n')) return UI.invalid('#ci-n', 'نام قلم را بنویسید.');
        if (!v(root, '#ci-u')) return UI.invalid('#ci-u', 'واحد را بنویسید.');
        const price = Math.round(+v(root, '#ci-p')), stock = Math.round(+v(root, '#ci-s'));
        if (!(price > 0)) return UI.invalid('#ci-p', 'قیمت را بنویسید.');
        if (!(stock >= 0) || v(root, '#ci-s') === '') return UI.invalid('#ci-s', 'موجودی را بنویسید (صفر هم می‌شود).');
        const rec = { name: v(root, '#ci-n'), unit: v(root, '#ci-u'), price, stock, cat: v(root, '#ci-c') || 'سایر', active: root.querySelector('#ci-a').checked };
        if (i) Object.assign(i, rec); else CO().items.push({ id: D.uid('ci'), ...rec });
        done('ذخیره شد.');
      };
    });
  }

  /* ---------------- org chart ---------------- */
  const findNode = (n, id, parent = null) => { if (n.id === id) return { n, parent }; for (const c of n.children) { const r = findNode(c, id, n); if (r) return r; } return null; };
  function orgchart() {
    const canEdit = ctx.actor() === 'principal';
    const box = n => `<li><${state.edit ? `button type="button" data-act="oc-node" data-id="${n.id}"` : 'div'} class="oc-box ${n.id === 'root' ? 'root' : ''}">
        <b>${esc(n.title)}</b>${n.people.length ? `<span>${n.people.map(esc).join('، ')}</span>` : state.edit ? '<span class="muted">+ افزودن نام</span>' : ''}</${state.edit ? 'button' : 'div'}>
      ${n.children.length ? `<ul>${n.children.map(box).join('')}</ul>` : ''}</li>`;
    return `<div class="spread" style="margin-bottom:12px"><span class="muted small">ساختار سازمانی مدرسه</span>
        ${canEdit ? `<button class="btn ${state.edit ? 'primary' : ''}" data-act="oc-edit">${state.edit ? 'پایان ویرایش' : 'ویرایش'}</button>` : ''}</div>
      <div class="card oc-wrap"><ul class="oc">${box(O().chart)}</ul></div>`;
  }
  function nodeModal(id) {
    const { n, parent } = findNode(O().chart, id);
    modal(`<h2>${esc(n.title)}</h2><label class="field"><span>عنوان</span><input class="input" id="o-t" value="${esc(n.title)}"></label>
      <label class="field"><span>افراد (هر نام در یک خط)</span><textarea class="input" id="o-p" rows="3">${esc(n.people.join('\n'))}</textarea></label>
      <label class="field"><span>شاخهٔ تازه زیر این جعبه</span><input class="input" id="o-c" placeholder="مثلاً مسئول آزمایشگاه"></label>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button>${parent ? '<button class="btn danger" id="del">حذف این شاخه</button>' : ''}<button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        if (!v(root, '#o-t')) return UI.invalid('#o-t', 'عنوان را بنویسید.');
        n.title = v(root, '#o-t'); n.people = v(root, '#o-p').split('\n').map(s => s.trim()).filter(Boolean);
        if (v(root, '#o-c')) n.children.push({ id: D.uid('c'), title: v(root, '#o-c'), people: [], children: [] });
        done('ذخیره شد.');
      };
      const del = root.querySelector('#del'); if (del) del.onclick = async () => {
        if (!await UI.ask('حذف شاخه', `«${n.title}»${n.children.length ? ' و زیرشاخه‌هایش' : ''} حذف شود؟`, 'حذف')) return;
        parent.children = parent.children.filter(c => c.id !== n.id); save(); render(); toast('حذف شد.');
      };
    });
  }

  /* ---------------- accounts ---------------- */
  const RN = Auth.ROLE_NAME;
  function users() {
    const list = Auth.users(ctx.school().id), self = Auth.user();
    const status = u => u.active === false ? '<span class="tag grey">غیرفعال</span>' : u.pass ? '<span class="tag ok">رمزدار</span>' : '<span class="tag warn">نمایشی، بی‌رمز</span>';
    return note(`هر نفر فقط بین نقش‌های خودش جابه‌جا می‌شود. حساب‌های «نمایشی» تا وقتی مالک سامانه ورود نمایشی را خاموش نکرده بی‌رمز وارد می‌شوند${Auth.demoOn() ? ' (الان روشن است)' : ''}؛ برای هر کس رمز بگذارید تا حساب واقعی شود.`)
      + `<div class="card"><div class="card-head"><h2 style="margin:0">کاربران مدرسه</h2><button class="btn primary" data-act="us-new">+ کاربر تازه</button></div>
      <div class="table-wrap"><table><thead><tr><th>نام</th><th>نام کاربری</th><th>نقش‌ها</th><th>وضعیت</th><th></th></tr></thead><tbody>
      ${list.map(u => `<tr><td><b>${esc([u.salute, u.name].filter(Boolean).join(' '))}</b>${self && self.id === u.id ? ' <span class="tag blue">شما</span>' : ''}</td><td dir="ltr" style="text-align:right">${esc(u.username)}</td>
        <td>${u.roles.map(r => `<span class="tag grey">${esc(RN[r])}${r === 'counselor' && u.grade ? ` · ${esc(GN(u.grade))}` : ''}${Auth.FAMILY.includes(r) && u.sid ? ` · ${esc(D.get(ctx.school().id, u.grade).students.find(x => x.id === u.sid)?.name || '—')}` : ''}</span>`).join(' ')}</td><td>${status(u)}</td>
        <td><button class="btn sm" data-act="us-edit" data-id="${u.id}">ویرایش</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function userModal(u) {
    const gs = D.gradesOf(ctx.school()), self = Auth.user();
    modal(`<h2>${u ? 'ویرایش ' + esc(u.name) : 'کاربر تازه'}</h2>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>عنوان خطاب (برای خوش‌آمد)</span><select class="input" id="u-sal">${['', 'جناب آقای', 'سرکار خانم', 'آقای', 'خانم', 'دکتر'].map(x => `<option value="${x}" ${(u?.salute || '') === x ? 'selected' : ''}>${x || '— بدون عنوان —'}</option>`).join('')}</select></label>
        <label class="field"><span>نام (همان که در خوش‌آمد می‌آید)</span><input class="input" id="u-n" value="${esc(u?.name || '')}"></label>
        <label class="field"><span>نام کاربری (لاتین)</span><input class="input" id="u-u" dir="ltr" autocomplete="off" value="${esc(u?.username || '')}"></label></div>
      <fieldset class="field" style="border:0;padding:0"><legend class="small muted">نقش‌ها (یک نفر می‌تواند چند نقش داشته باشد)</legend><div class="chips" style="max-height:none">
        ${Auth.SCHOOL_ROLES.map(r => `<label class="chip"><input type="checkbox" value="${r}" ${u?.roles.includes(r) ? 'checked' : ''}>${esc(RN[r])}</label>`).join('')}</div></fieldset>
      <label class="field" id="u-gbox" ${u?.roles.includes('counselor') ? '' : 'hidden'}><span>پایهٔ معلم راهنما</span><select class="input" id="u-g">${gs.map(g => `<option value="${g}" ${u?.grade === g ? 'selected' : ''}>${esc(GN(g))}</option>`).join('')}</select></label>
      <div class="grid g2" id="u-sbox" style="gap:0 12px" ${u?.roles.some(r => Auth.FAMILY.includes(r)) ? '' : 'hidden'}>
        <label class="field"><span>پایهٔ دانش‌آموز</span><select class="input" id="u-sg">${gs.map(g => `<option value="${g}" ${(u?.grade || gs[0]) === g ? 'selected' : ''}>${esc(GN(g))}</option>`).join('')}</select></label>
        <label class="field"><span>دانش‌آموز (حساب دانش‌آموز یا ولیِ او)</span><select class="input" id="u-s"></select></label></div>
      <div class="grid g2" style="gap:0 12px"><label class="field"><span>${u?.pass ? 'رمز تازه (خالی یعنی بدون تغییر)' : 'رمز (دست‌کم ۸ نویسه)'}</span><input class="input" type="password" id="u-p" autocomplete="new-password" dir="ltr"></label>
        <label class="field"><span>تکرار رمز</span><input class="input" type="password" id="u-p2" autocomplete="new-password" dir="ltr"></label></div>
      ${u ? `<label class="row" style="cursor:pointer;margin-top:8px"><input type="checkbox" id="u-a" ${u.active !== false ? 'checked' : ''} ${self && self.id === u.id ? 'disabled' : ''}> حساب فعال است</label>` : ''}
      <div class="row" style="margin-top:18px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const roleBoxes = () => [...root.querySelectorAll('fieldset input:checked')].map(i => i.value);
      const fillS = () => { const x = D.get(ctx.school().id, +v(root, '#u-sg')); root.querySelector('#u-s').innerHTML = x.classes.map(c => `<optgroup label="${esc(c.name)}">${x.students.filter(st => st.cls === c.id).map(st => `<option value="${st.id}" ${st.id === u?.sid ? 'selected' : ''}>${esc(st.name)}</option>`).join('')}</optgroup>`).join(''); };
      fillS(); root.querySelector('#u-sg').onchange = fillS;
      root.querySelector('fieldset').onchange = () => { root.querySelector('#u-gbox').hidden = !roleBoxes().includes('counselor'); root.querySelector('#u-sbox').hidden = !roleBoxes().some(r => Auth.FAMILY.includes(r)); };
      root.querySelector('#save').onclick = async () => {
        const list = Auth.users(ctx.school().id), name = v(root, '#u-n'), un = v(root, '#u-u').toLowerCase(), roles = roleBoxes();
        const pw = root.querySelector('#u-p').value, pw2 = root.querySelector('#u-p2').value, active = u ? root.querySelector('#u-a').checked : true;
        if (!name) return UI.invalid('#u-n', 'نام را بنویسید.');
        if (!/^[a-z0-9._-]{3,30}$/.test(un)) return UI.invalid('#u-u', 'نام کاربری ۳ تا ۳۰ نویسهٔ لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.');
        if (un === 'owner' || list.some(x => x.username === un && x.id !== u?.id)) return UI.invalid('#u-u', 'این نام کاربری گرفته شده است.');
        if (!roles.length) return UI.invalid(root.querySelector('fieldset'), 'دست‌کم یک نقش انتخاب کنید.');
        // A student or parent account sees one student's data only, so it cannot also hold a staff role.
        const fam = roles.filter(r => Auth.FAMILY.includes(r));
        if (fam.length && roles.length > fam.length) return UI.invalid(root.querySelector('fieldset'), 'حساب دانش‌آموز یا ولی نمی‌تواند نقش کارکنان هم داشته باشد؛ برای کار در مدرسه حساب جدا بسازید.');
        if (fam.length && !v(root, '#u-s')) return UI.invalid('#u-s', 'دانش‌آموز این حساب را انتخاب کنید.');
        if (!u?.pass && !u?.demo && !pw) return UI.invalid('#u-p', 'برای کاربر تازه رمز بگذارید.');
        if (pw && pw.length < 8) return UI.invalid('#u-p', 'رمز باید دست‌کم ۸ نویسه باشد.');
        if (pw !== pw2) return UI.invalid('#u-p2', 'تکرار رمز یکی نیست.');
        // The school must keep at least one active principal.
        const others = list.filter(x => x.id !== u?.id && x.active !== false && x.roles.includes('principal'));
        if (!others.length && !(active && roles.includes('principal'))) return UI.invalid(root.querySelector('fieldset'), 'مدرسه باید دست‌کم یک مدیر فعال داشته باشد.');
        const rec = { name, salute: v(root, '#u-sal'), username: un, roles, grade: roles.includes('counselor') ? +v(root, '#u-g') : fam.length ? +v(root, '#u-sg') : null, sid: fam.length ? v(root, '#u-s') : null, active };
        if (pw) { rec.pass = await Auth.makePass(pw); rec.demo = false; }
        if (u) Object.assign(u, rec); else list.push({ id: D.uid('u'), pass: null, demo: false, ...rec });
        done(u ? 'کاربر ذخیره شد.' : 'کاربر ساخته شد.');
      };
    });
  }

  // Inbox items: new applicants (enrolment, hiring), students waiting for a cost estimate, today's food orders.
  function feed() {
    const o = O(), r = ctx.actor(), items = [];
    if (['principal', 'deputy', 'exec'].includes(r)) o.applicants.filter(a => a.stage === 'new').forEach(a => items.push({ key: 'ap:' + a.id, type: 'admit', title: `درخواست ثبت‌نام · ${a.name}`,
      text: `پایهٔ ${GN(a.grade)}${r === 'principal' ? ' · وقت جلسه با خانواده را تعیین کنید' : ''}`, at: a.date, href: '#/enroll', unread: true, read: () => { state.stage = 'new'; } }));
    if (r === 'finance') o.applicants.filter(a => a.stage === 'finance' && !o.finance.students[a.id]).forEach(a => items.push({ key: 'fe:' + a.id, type: 'finance', title: `ارجاع از پذیرش · ${a.name}`,
      text: 'هزینه‌ها هنوز برآورد نشده.', at: (a.history || []).slice(-1)[0]?.at || a.date, href: '#/fees', unread: true }));
    if (r === 'principal') o.applicants.filter(a => a.stage === 'finance').forEach(a => items.push({ key: 'af:' + a.id, type: 'admit', title: `تأیید نهایی پذیرش · ${a.name}`,
      text: `پایهٔ ${GN(a.grade)} · ارجاع شده به واحد مالی`, at: (a.history || []).slice(-1)[0]?.at || a.date, href: '#/enroll', unread: true, read: () => { state.stage = 'finance'; } }));
    if (r === 'principal') o.hire.applicants.filter(h => h.stage === 'finance').forEach(h => items.push({ key: 'hf:' + h.id, type: 'hire', title: `تأیید نهایی استخدام · ${h.name}`,
      text: h.position, at: h.date, href: '#/hire', unread: true, read: () => { state.hTab = 'cart'; } }));
    if (r === 'principal') o.hire.applicants.filter(h => h.stage === 'new').forEach(h => items.push({ key: 'hr:' + h.id, type: 'hire', title: `درخواست همکاری · ${h.name}`,
      text: h.position, at: h.date, href: '#/hire', unread: true, read: () => { state.hTab = 'cart'; } }));
    if (r === 'exec') CO().orders.filter(o => o.status === 'new').forEach(o => items.push({ key: 'co:' + o.id, type: 'coop', title: `سفارش تعاون · ${keyName(o.who)}`,
      text: o.lines.map(l => `${l.name} × ${fa(l.qty)}`).join('، '), at: o.at, href: '#/coopAdmin', unread: true, read: () => { state.coF = 'new'; } }));
    // Staff: their co-op order is ready to collect.
    CO().orders.filter(o => o.who === me() && o.status === 'ready').forEach(o => items.push({ key: 'cr:' + o.id, type: 'coop', title: 'سفارش تعاون شما آماده تحویل است',
      text: o.lines.map(l => l.name).join('، '), at: o.readyAt || o.at, href: '#/services/coop', unread: true }));
    if (r === 'exec') { const n = F().orders.filter(x => x.date === today).length;
      if (n) items.push({ key: 'fd:' + today, type: 'food', title: `${fa(n)} سفارش غذا برای امروز`, text: 'فهرست در «پیگیری تغذیه».', at: today, href: '#/foodTrack', unread: true, read: () => { state.trackDay = today; } }); }
    return items;
  }

  /* ---------------- wiring ---------------- */
  const appl = b => O().applicants.find(x => x.id === b.dataset.id);
  const hireOf = b => O().hire.applicants.find(x => x.id === b.dataset.id);
  const act = {
    'us-new': () => userModal(null),
    'us-edit': b => userModal(Auth.users(ctx.school().id).find(x => x.id === b.dataset.id)),
    'ad-filter': b => { state.stage = b.dataset.id; render(); },
    'ad-new': applicantModal,
    'ad-open': b => applicantFile(appl(b)),
    // The enrolment form and documents a family sent from the portal, read only.
    'ad-form': b => { const a = appl(b), f = (O().enrollApps || {})[a.nid];
      if (!f) return toast('فرم این متقاضی پیدا نشد.');
      modal(`<h2>فرم ثبت‌نام · ${esc(a.name)}</h2><p class="muted small">کد ملی دانش‌آموز ${esc(ApplyForm.digits(f.nid))} · ارسال ${esc(J.format(f.sentAt.slice(0, 10)))}</p><div class="ap-review">${ApplyForm.view(f.form, ApplyForm.ENROLL)}</div>
        <div class="row" style="margin-top:12px"><button class="btn" data-close>بستن</button></div>`); },
    'ad-link': () => { const url = new URL('enroll.html', location.href).href; (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('نشانی پورتال ثبت‌نام کپی شد.'), () => toast(url)); },
    'ad-time': b => timeModal(appl(b), b.dataset.k),
    'ad-result': b => resultModal(appl(b)),
    'ad-step': b => {
      const a = appl(b), to = b.dataset.to, o = O();
      if (to === 'finance') { if ((o.enrolled[a.grade] || 0) >= o.capacity[a.grade]) return toast(`ظرفیت پایهٔ ${GN(a.grade)} پر است.`); o.enrolled[a.grade] = (o.enrolled[a.grade] || 0) + 1; }
      a.stage = to; log(a, ST[stIdx(to)][1]); save(); render(); toast(`${a.name}: ${ST[stIdx(to)][1]}`);
    },
    'ad-reject': async b => {
      const a = appl(b); if (!await UI.ask('رد متقاضی', `${a.name} از روند پذیرش خارج شود؟`, 'رد')) return;
      a.rejectedAt = a.stage; a.stage = 'rejected'; a.why = b.dataset.why || ''; log(a, b.dataset.why || 'رد شد'); save(); render();
    },
    'fn-edit': b => feeModal(appl(b)),
    'fn-template': feeTemplate,
    'wl-charge': b => chargeModal(b.dataset.id, false),
    'wl-self': b => chargeModal(b.dataset.id, b.dataset.id === me()),
    'hr-tab': b => { state.hTab = b.dataset.id; render(); },
    'hr-new': hireNewModal,
    // The application an applicant sent from the portal, read only.
    'hr-form': b => { const h = hireOf(b), a = (O().hireApps || {})[h.nid];
      if (!a) return toast('فرم این متقاضی پیدا نشد.');
      modal(`<h2>فرم همکاری · ${esc(h.name)}</h2><p class="muted small">کد ملی ${esc(ApplyForm.digits(a.nid))} · ارسال ${esc(J.format(a.sentAt.slice(0, 10)))}</p><div class="ap-review">${ApplyForm.view(a.form)}</div>
        <div class="row" style="margin-top:12px"><button class="btn" data-close>بستن</button></div>`); },
    'hr-link': () => { const url = new URL('apply.html', location.href).href; (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('نشانی پورتال کپی شد.'), () => toast(url)); },
    'hr-meet': b => hireMeetModal(hireOf(b)),
    'hr-step': b => { hireOf(b).stage = b.dataset.to; save(); render(); },
    'hr-reject': async b => { const h = hireOf(b); if (await UI.ask('رد درخواست', `درخواست ${h.name} رد شود؟`, 'رد')) { h.stage = 'rejected'; save(); render(); } },
    'hr-contract': b => { state.hTab = 'contract'; state.cEdit = b.dataset.id; render(); document.getElementById('ce-form')?.scrollIntoView({ block: 'start' }); },
    'ce-cancel': () => { state.cEdit = ''; render(); },
    'ce-save': b => { const h = O().hire.applicants.find(x => x.id === b.dataset.id), root = document.getElementById('view');
      const c = contractRead(root); if (c.to && c.to < c.from) return UI.invalid('#ce-to', 'پایان قرارداد پیش از شروع آن است.');
      h.contract = { ...c, signed: false }; state.cEdit = ''; save(); render(); toast('قرارداد ذخیره شد.'); },
    'hr-sign': b => { hireOf(b).contract.signed = true; save(); render(); toast('امضای قرارداد ثبت شد.'); },
    'fd-day': b => { state.day = b.dataset.id; render(); },
    'fd-month': b => { let { jy, jm } = state.month; jm += +b.dataset.id; if (jm < 1) { jm = 12; jy--; } if (jm > 12) { jm = 1; jy++; } state.month = { jy, jm }; render(); },
    'fd-order': () => order(),
    'fd-cancel': async b => {
      const f = F(), k = forKey(), day = b.dataset.id, os = f.orders.filter(x => x.who === k && x.date === day), sum = os.reduce((t, o) => t + o.price, 0);
      if (!os.length || !await UI.ask('لغو سفارش', `سفارش ${J.format(day)} لغو و ${money(sum)} به کیف پول برگردد؟`, 'لغو سفارش')) return;
      f.orders = f.orders.filter(x => !os.includes(x)); charge(k, sum, `لغو سفارش ${J.format(day)}`); save(); render(); toast('لغو شد و پول برگشت.');
    },
    'fm-add': () => {
      const n = document.getElementById('fm-n').value.trim(), p = Math.round(+document.getElementById('fm-p').value);
      if (!n || !(p > 0)) return UI.invalid(!n ? '#fm-n' : '#fm-p', !n ? 'نام غذا را بنویسید.' : 'قیمت غذا را بنویسید.');
      const f = F(); (f.menu[state.day] = f.menu[state.day] || []).push({ id: D.uid('f'), name: n, price: p }); save(); render();
    },
    'fm-del': async b => {
      const f = F(), n = f.orders.filter(o => o.item === b.dataset.id).length;
      if (n && !await UI.ask('حذف غذا', `${fa(n)} سفارش برای این غذا ثبت شده و پولشان برمی‌گردد. حذف شود؟`, 'حذف')) return;
      f.orders.filter(o => o.item === b.dataset.id).forEach(o => charge(o.who, o.price, `حذف غذا از منو: ${o.name}`));
      f.orders = f.orders.filter(o => o.item !== b.dataset.id); f.menu[state.day] = f.menu[state.day].filter(i => i.id !== b.dataset.id); save(); render();
    },
    'fm-copy': () => {
      const f = F(), src = f.menu[state.day] || []; if (!src.length) return toast('منوی این روز خالی است.');
      const to = D.shift(7, state.day); f.menu[to] = src.map(i => ({ ...i, id: D.uid('f') })); save(); render(); toast(`برای ${J.format(to)} کپی شد.`);
    },
    'ft-print': () => {
      const w = window.open('', '_blank'); if (!w) return toast('پنجرهٔ چاپ باز نشد.');
      w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>تغذیه ${esc(J.format(state.trackDay))}</title><link rel="stylesheet" href="assets/style.css"></head><body style="padding:24px"><h1>سفارش‌های غذای ${esc(J.format(state.trackDay))}</h1>${document.getElementById('ft-sheet').innerHTML}</body></html>`);
      w.document.close(); w.onload = () => w.print();
    },
    'oc-edit': () => { state.edit = !state.edit; render(); },
    'oc-node': b => nodeModal(b.dataset.id),
    'co-inc': b => { const i = CO().items.find(x => x.id === b.dataset.id); state.cart[i.id] = Math.min(i.stock, (state.cart[i.id] || 0) + 1); render(); },
    'co-dec': b => { const k = b.dataset.id; state.cart[k] = Math.max(0, (state.cart[k] || 0) - 1); if (!state.cart[k]) delete state.cart[k]; render(); },
    'co-clear': () => { state.cart = {}; render(); },
    'co-order': coopOrder,
    'co-cancel': async b => {
      const o = CO().orders.find(x => x.id === b.dataset.id);
      if (!await UI.ask('لغو سفارش', `سفارش لغو و ${money(o.total)} به کیف پول برگردد؟`, 'لغو سفارش')) return;
      coopCancel(o, me()); save(); render(); toast('لغو شد و پول برگشت.');
    },
    'ca-f': b => { state.coF = b.dataset.id; render(); },
    'ca-st': b => { const o = CO().orders.find(x => x.id === b.dataset.id); o.status = b.dataset.to; if (o.status === 'ready') o.readyAt = nowIso(); save(); render(); toast(o.status === 'ready' ? 'آماده شد؛ به سفارش‌دهنده خبر داده شد.' : 'تحویل ثبت شد.'); },
    'ca-cancel': async b => {
      const o = CO().orders.find(x => x.id === b.dataset.id);
      if (!await UI.ask('لغو سفارش', `سفارش ${keyName(o.who)} لغو و ${money(o.total)} به کیف پولش برگردد؟`, 'لغو سفارش')) return;
      coopCancel(o, me()); save(); render(); toast('لغو شد و پول برگشت.');
    },
    'ca-item': b => coopItemModal(b.dataset.id ? CO().items.find(x => x.id === b.dataset.id) : null),
  };
  function bind() {
    const imp = document.getElementById('fn-import'); if (imp) imp.onchange = () => { if (imp.files[0]) feeImport(imp.files[0]); };
    const wg = document.getElementById('wl-g'); if (wg) wg.onchange = () => { state.wGrade = +wg.value; render(); };
    const ce = document.getElementById('ce-form');
    if (ce) { const root = document.getElementById('view'); contractShow(root); root.oninput = root.onchange = e => { if (e.target.closest('[data-cf], #ce-from, #ce-to')) contractShow(root); }; }
    const ff = document.getElementById('fd-for'); if (ff) ff.onchange = () => { state.forWho = ff.value; render(); };
    // Running total of the menu as quantities change.
    const qs = [...document.querySelectorAll('[data-fq]')], sumEl = document.getElementById('fd-sum');
    if (sumEl) qs.forEach(q => q.oninput = () => { sumEl.textContent = money(qs.reduce((t, x) => t + Math.max(0, Math.floor(+x.value || 0)) * +x.dataset.price, 0)); });
    const td = document.getElementById('ft-d'); if (td) td.onchange = () => { state.trackDay = td.value; render(); };
    document.querySelectorAll('[data-cv]').forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; let file; try { file = await readFile(f); } catch (e) { return toast('رزومه باید کمتر از ۵۰۰ کیلوبایت باشد.'); }
      const h = O().hire.applicants.find(x => x.id === inp.dataset.cv); h.resume = file; if (h.stage === 'new') h.stage = 'review'; save(); render(); toast('رزومه بارگذاری شد.');
    });
  }
  return { pages: { enroll, fees, wallets, hire, food, foodMenu, foodTrack, coopAdmin, services, orgchart, users }, act, bind, feed };
};
