// Owner-panel state: schools, active modules, test credits, requests and invoices.
// Prototype only: kept in this browser's localStorage. The real backend replaces this file.
const Store = (() => {
  const KEY = 'sp-owner-v1';
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const uid = p => p + Math.random().toString(36).slice(2, 8);

  function seed() {
    const t = today();
    const on = (ids, days = 365) => Object.fromEntries(ids.map(id => [id, { from: t, until: addDays(t, days) }]));
    const core = CATALOG.modules.filter(x => x.price.model === 'included').map(x => x.id);
    return {
      prices: {}, planPrices: {},
      schools: [
        // The school the platform is first meant for. Active modules mirror what the grade-9 profile site does today.
        { id: 'mehr8', name: 'مجتمع آموزشی مهر هشتم', city: '', level: '', students: null, sample: false, grades: [7, 8, 9, 10, 11, 12],
          created: t, contact: '',
          modules: on(CATALOG.modules.map(x => x.id)),
          credits: { 'test.neo': 0, 'test.gardner': 0, 'test.holland': 0, 'test.math': 0, 'test.profile': 0 },
          used: { 'test.neo': 30, 'test.gardner': 30, 'test.holland': 30, 'test.math': 30, 'test.profile': 30 },
          seats: { principal: 1, counselor: 1, counselor_asst: 1 } },
        { id: 'demo', name: 'مدرسهٔ نمونه (دادهٔ آزمایشی)', city: '—', level: 'متوسطهٔ اول', students: 240, sample: true, grades: [7, 8, 9],
          created: addDays(t, -60), contact: '',
          modules: { ...on(core), ...on(['acad.timetable', 'acad.grades', 'acad.reportcard', 'comm.parents'], 20) },
          credits: { 'test.neo': 0, 'test.holland': 40 }, used: {},
          seats: { principal: 1, edu_deputy: 1, teacher: 18 } },
      ],
      requests: [
        { id: uid('r'), school: 'demo', kind: 'credits', module: 'test.neo', qty: 80, note: 'برای پایهٔ نهم، دو کلاس', status: 'pending', at: addDays(t, -1) },
        { id: uid('r'), school: 'demo', kind: 'module', module: 'guid.dossier', qty: 0, note: '', status: 'pending', at: t },
      ],
      invoices: [
        { id: 'INV-1001', school: 'demo', at: addDays(t, -60), status: 'paid',
          items: [{ desc: 'اشتراک پایه — ۱۲ ماه', amount: 18000000 }, { desc: 'آزمون هالند — ۴۰ نفر', amount: 2000000 }] },
      ],
      productName: 'سامانهٔ جامع مدرسه',
    };
  }

  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S) S = seed();
  // The pilot school (Mehr-e Hashtom) gets every module, so the whole platform can be tried there. Once per saved state.
  if (!S.pilotAll) {
    const ms = S.schools.find(x => x.id === 'mehr8'), t = today(), until = addDays(t, 365);
    if (ms) CATALOG.modules.forEach(m => { if (!(ms.modules[m.id]?.until >= t)) ms.modules[m.id] = { from: t, until }; });
    S.pilotAll = true; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: changes last until reload */ } };
  // The owner panel and the school view share this state: a change in one tab reaches the other.
  window.addEventListener('storage', e => {
    if (e.key !== KEY || !e.newValue) return;
    try { S = JSON.parse(e.newValue); window.dispatchEvent(new Event('store-changed')); } catch (err) { /* ignore a bad write */ }
  });

  const price = id => { const mod = CATALOG.byId(id); return { model: mod.price.model, amount: S.prices[id] ?? mod.price.amount }; };
  const planPrice = id => S.planPrices[id] ?? CATALOG.plans.find(p => p.id === id).price;
  const school = id => S.schools.find(s => s.id === id);
  const isOn = (s, id) => { const a = s.modules[id]; return !!a && a.until >= today(); };

  // Monthly-equivalent revenue a school brings from its active modules (tests are counted from invoices).
  function monthly(s) {
    return Object.keys(s.modules).filter(id => isOn(s, id)).reduce((sum, id) => {
      const p = price(id);
      if (p.model === 'monthly') return sum + p.amount;
      if (p.model === 'per_student') return sum + p.amount * (s.students || 0) / 12;
      return sum;
    }, 0);
  }

  // Activating a module also needs its dependencies; returns the ids that are missing.
  const missingDeps = (s, id, seen = new Set()) => {
    const out = [];
    for (const d of CATALOG.byId(id).deps) {
      if (seen.has(d)) continue; seen.add(d);
      if (!isOn(s, d)) out.push(d, ...missingDeps(s, d, seen));
    }
    return [...new Set(out)];
  };
  const dependents = (s, id) => CATALOG.modules.filter(x => x.deps.includes(id) && isOn(s, x.id)).map(x => x.id);

  function activate(schoolId, ids, days = 365) {
    const s = school(schoolId), t = today();
    ids.forEach(id => { s.modules[id] = { from: t, until: addDays(t, days) }; });
    save();
  }
  function deactivate(schoolId, id) { delete school(schoolId).modules[id]; save(); }
  function addCredits(schoolId, id, n) { const s = school(schoolId); s.credits[id] = (s.credits[id] || 0) + n; save(); }

  function invoice(schoolId, items) {
    const n = 1001 + S.invoices.length;
    const inv = { id: 'INV-' + n, school: schoolId, at: today(), status: 'unpaid', items };
    S.invoices.unshift(inv); save(); return inv;
  }

  // Approving a request activates it and bills the school.
  function decide(reqId, ok) {
    const r = S.requests.find(x => x.id === reqId); if (!r || r.status !== 'pending') return;
    r.status = ok ? 'approved' : 'rejected'; r.decided = today();
    if (ok) {
      const mod = CATALOG.byId(r.module), p = price(r.module), s = school(r.school);
      if (r.kind === 'credits') {
        addCredits(r.school, r.module, r.qty);
        invoice(r.school, [{ desc: `${mod.name} — ${r.qty.toLocaleString('fa-IR')} نفر`, amount: p.amount * r.qty }]);
      } else {
        const ids = [r.module, ...missingDeps(s, r.module)];
        activate(r.school, ids);
        invoice(r.school, ids.map(id => {
          const q = price(id), m2 = CATALOG.byId(id);
          const amount = q.model === 'monthly' ? q.amount * 12 : q.model === 'per_student' ? q.amount * (s.students || 0) : 0;
          return { desc: `${m2.name} — ۱۲ ماه`, amount };
        }));
      }
    }
    save();
  }

  function addSchool(data) {
    const t = today();
    const core = CATALOG.modules.filter(x => x.price.model === 'included').map(x => x.id);
    const s = { id: uid('s'), created: t, sample: false, credits: {}, used: {}, seats: {}, modules: {}, grades: [7, 8, 9], ...data };
    core.forEach(id => { s.modules[id] = { from: t, until: addDays(t, 365) }; });
    S.schools.push(s); save(); return s;
  }

  return {
    get state() { return S; }, save, today, addDays,
    price, planPrice, school, isOn, monthly, missingDeps, dependents,
    activate, deactivate, addCredits, invoice, decide, addSchool,
    // A school asks for a module or for test credits; it shows up in the owner's requests.
    request(schoolId, moduleId, qty = 0, note = '') {
      const test = CATALOG.byId(moduleId).price.model === 'per_use';
      S.requests.push({ id: uid('r'), school: schoolId, kind: test ? 'credits' : 'module', module: moduleId, qty: test ? qty : 0, note, status: 'pending', at: today() });
      save();
    },
    // The owner decides, per school, which roles use which modules. No list for a role means every module.
    canUse(school, role, moduleId) { const a = school?.access?.[role]; return !moduleId || !a || a.includes(moduleId); },
    setAccess(schoolId, role, moduleId, on) {
      const s = S.schools.find(x => x.id === schoolId); if (!s) return;
      s.access = s.access || {};
      const all = [...new Set(Object.values(NAV).flatMap(r => r.hubs.flatMap(h => h.pages.map(p => p[2]).filter(Boolean))))];
      const list = new Set(s.access[role] || all);
      on ? list.add(moduleId) : list.delete(moduleId); s.access[role] = [...list]; save();
    },
    setPrice(id, amount) { S.prices[id] = amount; save(); },
    setPlanPrice(id, amount) { S.planPrices[id] = amount; save(); },
    reset() { S = seed(); save(); },
  };
})();
