// The school's discipline rules (from the school, 1405): the points of each case, the two positive-point rules
// and the steps the school takes as a student's total falls. Used by the counsellor, the principal and the teachers.
const Disc = (() => {
  const { esc, fa } = UI;
  const D = SchoolData;
  const STEPS = [
    [-15, 'اخطار ۱ به دانش‌آموز توسط ناظم و ارجاع به معلم راهنما'],
    [-30, 'اخطار ۲ به دانش‌آموز و تماس با منزل، اطلاع به ولی'],
    [-45, 'اخطار ۳ به دانش‌آموز و تماس با منزل، اطلاع اول به ولی همراه با نامهٔ مکتوب'],
    [-60, 'دعوت از ولی برای جلسهٔ مشاوره با حضور معلم راهنما و ناظم و محرومیت از دو هفته نوبت بازی'],
    [-75, 'اطلاع دوم مکتوب به والدین، ثبت در پرونده و محرومیت از چهار هفته نوبت بازی'],
    [-90, 'دعوت از ولی برای جلسهٔ مشاوره با حضور معلم راهنما، معاون و ناظم و محرومیت از شش هفته نوبت بازی'],
    [-110, 'دعوت از ولی برای شرکت در شورای انضباطی (مدیر، معاون و معلم راهنما)'],
    [-130, 'دعوت از ولی برای شرکت در شورای انضباطی و اخذ تعهد کتبی جهت درج در پرونده'],
    [-150, 'تعلیق دانش‌آموز از مدرسه و بررسی ادامهٔ حضور وی توسط شورای مدرسه'],
  ];
  const GAP = 15, PER_DAY = 0.5, EFFORT_FLOOR = -90;
  // A signed number kept left-to-right inside Persian text («−۱۲»، «+۴»).
  const sign = n => `⁦${n > 0 ? '+' : n < 0 ? '−' : ''}${fa(Math.abs(n))}⁩`;
  // An item with a range (pts … to) gets its points chosen when the case is recorded.
  const range = c => c && c.to != null ? [Math.min(c.pts, c.to), Math.max(c.pts, c.to)] : null;
  const ptsText = c => range(c) ? `${sign(c.pts)} تا ${sign(c.to)}` : sign(c.pts);
  const catOf = (x, r) => x.discCats.find(c => c.id === r.cat) || { name: 'مورد حذف‌شده', pts: 0 };
  const recPts = (x, r) => r.pts != null ? r.pts : catOf(x, r).pts;
  // School days strictly after a and before b.
  const daysBetween = (a, b) => { let n = 0; for (let t = D.shift(1, a); t < b; t = D.shift(1, t)) if (D.dayIndex(t) !== null) n++; return n; };
  const stepOf = total => STEPS.filter(([t]) => total <= t).pop() || null;

  // A student's total under the school's rules:
  //  rule 1: when more than 15 school days pass between two cases, each day past the 15th gives +0.5;
  //          it only cancels negative points and never takes the total above 0;
  //  rule 2: diligence (up to +10 a case) counts only while the total is not below −90.
  function standing(x, sid, upto = JDate.todayIso()) {
    const recs = x.discipline.filter(r => r.sid === sid && r.date <= upto).sort((a, b) => a.date.localeCompare(b.date));
    let total = 0, neg = 0, auto = 0, effort = 0, held = 0, last = null, paid = 0;
    // Credits the days of the current gap not yet credited (a diligence record in the gap does not restart it).
    const rest = until => {
      if (!last) return;
      const earned = Math.max(0, daysBetween(last, until) - GAP) * PER_DAY, inc = earned - paid; paid = earned;
      if (inc > 0 && total < 0) { const add = Math.min(-total, inc); total += add; auto += add; }
    };
    recs.forEach(r => {
      const p = recPts(x, r);
      rest(r.date);
      if (p < 0) { total += p; neg += p; last = r.date; paid = 0; }
      else if (p > 0) { if (total >= EFFORT_FLOOR) { total += p; effort += p; } else held += p; }
    });
    rest(D.shift(1, upto));
    const step = stepOf(total), next = STEPS.find(([t]) => total > t);
    return { total, neg, auto, effort, held, step, next: next ? { at: next[0], left: total - next[0], text: next[1] } : null };
  }

  // The item list and the points field for a range item.
  function picker(id, cats, withPositive = true) {
    const opt = c => `<option value="${c.id}">${esc(c.name)} (${ptsText(c)})</option>`;
    const neg = cats.filter(c => c.pts < 0), pos = cats.filter(c => c.pts > 0);
    return `<label class="field"><span>مورد</span><select class="input" id="${id}">${withPositive && pos.length
        ? `<optgroup label="منفی">${neg.map(opt).join('')}</optgroup><optgroup label="مثبت">${pos.map(opt).join('')}</optgroup>` : neg.map(opt).join('')}</select></label>
      <label class="field" id="${id}-pf" hidden><span>امتیاز این مورد</span><input class="input num" type="number" step="1" id="${id}-p" aria-describedby="${id}-ph"><small class="muted small" id="${id}-ph"></small></label>`;
  }
  function wire(root, id, cats) {
    const sel = root.querySelector('#' + id), f = root.querySelector(`#${id}-pf`), inp = root.querySelector(`#${id}-p`), hint = root.querySelector(`#${id}-ph`);
    if (!sel) return;
    const draw = () => {
      const c = cats.find(k => k.id === sel.value), r = range(c); f.hidden = !r;
      if (!r) return;
      inp.min = r[0]; inp.max = r[1];
      if (inp.value === '' || +inp.value < r[0] || +inp.value > r[1]) inp.value = c.pts;
      hint.textContent = `بین ${sign(r[0])} و ${sign(r[1])}${c.pts > 0 ? '؛ فقط اگر جمع امتیازهای دانش‌آموز از −۹۰ کمتر نباشد حساب می‌شود' : ''}`;
    };
    sel.addEventListener('change', draw); draw();
  }
  // { cat, pts? } of the chosen item, or null with the error shown.
  function read(root, id, cats) {
    const c = cats.find(k => k.id === root.querySelector('#' + id).value), r = range(c);
    if (!c) return null;
    if (!r) return { cat: c.id };
    const inp = root.querySelector(`#${id}-p`), p = Math.round(+inp.value);
    if (inp.value === '' || isNaN(p) || p < r[0] || p > r[1]) { UI.invalid(inp, `امتیاز باید بین ${sign(r[0])} و ${sign(r[1])} باشد.`); return null; }
    return { cat: c.id, pts: p };
  }

  // The total, its parts and the step reached, as a short block.
  function summary(x, sid) {
    const s = standing(x, sid);
    const parts = [`منفی ${sign(s.neg)}`, s.auto && `مثبت فاصله‌دار ${sign(s.auto)}`, s.effort && `جدیت ${sign(s.effort)}`, s.held && `جدیتِ حساب‌نشده ${sign(s.held)} (جمع زیر −۹۰)`].filter(Boolean);
    return `<div class="disc-sum"><div class="spread"><span>جمع امتیاز انضباطی: <b class="num">${sign(s.total)}</b></span><span class="muted small">${parts.join(' · ')}</span></div>
      ${s.step ? `<p class="disc-step"><span class="tag bad num">${sign(s.step[0])}</span> ${esc(s.step[1])}</p>` : ''}
      ${s.next && s.neg < 0 ? `<p class="muted small" style="margin:4px 0 0">تا مرحلهٔ ${sign(s.next.at)}: ${fa(s.next.left)} امتیاز</p>` : ''}</div>`;
  }
  return { STEPS, range, ptsText, sign, catOf, recPts, standing, stepOf, picker, wire, read, summary };
})();
