// Each teacher's week across all of the school's grades, built from the teachers named in the real timetables (x.ttTeacher).
// Grades 7-9 and 10-12 ring different bells (SchoolData.bellsOf), so classes are placed and compared by clock time, not bell number.
// Used by the guidance teacher's overview (counselor.js) and the principal's «برنامهٔ هفتگی» (school-app.js).
const TeacherWeek = (() => {
  const D = SchoolData, { esc, fa } = UI;
  const dg = t => String(t).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  // «گروه زبان», «گروه هنر»… are departments, not one person: they teach several classes at once and are left out.
  const person = t => t && !t.startsWith('گروه');

  // name → [{ g, cid, cls, day, b, sub, from, to }], sorted by day and time.
  function all(schoolId, grades) {
    const ws = D.weekStart(D.today()), by = new Map();
    grades.forEach(g => {
      const x = D.get(schoolId, g), bl = D.bellsOf(g);
      if (!x.ttTeacher) return;
      x.classes.forEach(c => D.DAYS.forEach((_, day) => {
        for (let b = 0; b < bl.n; b++) {
          const t = D.clsTeacher(x, c.id, day, b, ws); if (!person(t)) continue;
          if (!by.has(t)) by.set(t, []);
          by.get(t).push({ g, cid: c.id, cls: c.name, day, b, sub: D.clsCell(x, c.id, day, b, ws), from: bl.times[b], to: bl.ends[b] });
        }
      }));
    });
    by.forEach(list => list.sort((a, b) => a.day - b.day || a.from.localeCompare(b.from)));
    return by;
  }
  const gradesIn = list => [...new Set(list.map(e => e.g))].sort((a, b) => a - b);
  // Two classes of one teacher at overlapping clock times on the same day. The same subject at the same time is one
  // joint lesson for both classes (e.g. grade 9's مشاوره on Saturday), not a clash.
  const together = (a, b) => b.day === a.day && b.cid !== a.cid && a.from < b.to && b.from < a.to;
  const clashes = list => list.flatMap((a, i) => list.slice(i + 1).filter(b => together(a, b) && b.sub !== a.sub).map(b => [a, b]));
  const joint = list => new Set(list.filter((a, i) => list.some((b, j) => i !== j && together(a, b) && b.sub === a.sub)));
  const gn = gs => gs.map(g => D.GRADE_NAME[g]).join('، ');
  const when = e => `${D.DAYS[e.day]} ${dg(e.from)} تا ${dg(e.to)}`;

  // The teachers of one grade, each with the other grades they also teach and any clash. A button opens the full week.
  function card(schoolId, grades, g) {
    const by = all(schoolId, grades);
    const here = [...by.entries()].filter(([, l]) => l.some(e => e.g === g)).sort((a, b) => a[0].localeCompare(b[0], 'fa'));
    if (!here.length) return '';
    const rows = here.map(([t, l]) => {
      const mine = l.filter(e => e.g === g), others = gradesIn(l).filter(x => x !== g), cl = clashes(l);
      const subs = [...new Set(mine.map(e => e.sub))].join('، ');
      return `<li class="tw-row"><div class="tw-who"><b>${esc(t)}</b><span class="muted small">${esc(subs)} · ${fa(mine.length)} زنگ در این پایه</span>
          ${others.length ? `<span class="small tw-also">با پایهٔ ${esc(gn(others))} هم کلاس دارد (${fa(l.length - mine.length)} زنگ)</span>` : ''}
          ${cl.length ? `<span class="small tw-clash">هم‌زمانی: ${esc(when(cl[0][0]))}، ${esc(cl[0][0].cls)} و ${esc(cl[0][1].cls)}</span>` : ''}</div>
        <button class="btn sm" data-act="tw-open" data-id="${esc(t)}" aria-label="برنامهٔ هفتگی ${esc(t)}">برنامهٔ هفته</button></li>`;
    }).join('');
    return `<section class="card tw-card" aria-label="معلمان پایه"><div class="card-head"><h2>معلمان پایهٔ ${esc(D.GRADE_NAME[g])}</h2>
        <span class="muted small">${fa(here.filter(([, l]) => gradesIn(l).length > 1).length)} معلم با پایه‌های دیگر هم کلاس دارند</span></div>
      <ul class="tw-list">${rows}</ul></section>`;
  }

  // One teacher's whole week, day by day, every grade together. g (optional) marks this grade's classes.
  function week(schoolId, grades, t, g) {
    const l = all(schoolId, grades).get(t) || [], cl = clashes(l), hit = new Set(cl.flat()), jt = joint(l);
    const days = D.DAYS.map((dn, day) => {
      const es = l.filter(e => e.day === day);
      return `<li class="tw-day"><b class="tw-dn">${esc(dn)}</b>${es.length ? `<ul class="tw-slots">${es.map(e => `<li class="tw-slot ${e.g === g ? 'here' : ''} ${hit.has(e) ? 'clash' : ''}">
          <span class="tw-time">${dg(e.from)} تا ${dg(e.to)}</span><span><b>${esc(e.sub)}</b> · ${esc(e.cls)}</span>${hit.has(e) ? '<span class="tag bad">هم‌زمان</span>' : jt.has(e) ? '<span class="tag">کلاس مشترک</span>' : ''}</li>`).join('')}</ul>`
        : '<span class="muted small">کلاسی ندارد</span>'}</li>`;
    }).join('');
    const gs = gradesIn(l);
    return `<p class="muted small" style="margin:0 0 8px">${fa(l.length)} زنگ در هفته، در پایهٔ ${esc(gn(gs))}. ساعت‌ها ساعت واقعی هر پایه است؛ زنگ‌های هفتم تا نهم و دهم تا دوازدهم هم‌ساعت نیستند.</p>
      ${cl.length ? `<p class="tw-clash small" style="margin:0 0 8px">${fa(cl.length)} هم‌زمانی در برنامه: ${cl.map(([a, b]) => esc(`${when(a)}: ${a.cls} و ${b.cls}`)).join(' · ')}</p>` : ''}
      <ul class="tw-week">${days}</ul>`;
  }
  function open(schoolId, grades, t, g) {
    UI.modal(`<h2>برنامهٔ هفتگی ${esc(t)}</h2>${week(schoolId, grades, t, g)}<div class="row" style="margin-top:12px"><button class="btn" data-close>بستن</button></div>`);
  }
  return { all, clashes, gradesIn, card, week, open };
})();
