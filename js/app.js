// Owner panel: hash-routed views over CATALOG (what can be sold) and Store (who bought what).
(() => {
  if (!Auth.require('owner')) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = n => Number(n || 0).toLocaleString('fa-IR');
  const money = n => fa(Math.round(n)) + ' تومان';
  const fdate = iso => iso ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso)) : '—';
  const C = CATALOG, S = () => Store.state;

  const srcTag = s => `<span class="tag ${s}">${esc(C.sources[s].short)}</span>`;
  const groupName = id => C.groups.find(g => g.id === id).name;
  const priceText = id => {
    const p = Store.price(id);
    return p.model === 'included' ? '<span class="tag grey">در اشتراک پایه</span>'
      : `<span class="num">${money(p.amount)}</span> <span class="muted small">${esc(C.pricing[p.model].unit)}</span>`;
  };
  const sourcesOf = mod => [...new Set(mod.from.map(f => f[0]))];
  const buildTag = b => `<span class="tag ${b === 'reuse' ? 'profile' : b === 'integrate' ? 'lms' : 'grey'}">${esc(C.build[b])}</span>`;

  /* ---------------- modal & toast ---------------- */
  // Focus moves into the dialog, Tab stays inside it, and closing returns focus to where it was.
  let opener = null, onClose = null;
  const focusables = root => [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]')];
  function modal(html, bind, cancel) {
    closeModal(true);
    opener = document.activeElement; onClose = cancel || null;
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">${html}</div>`;
    const h = back.querySelector('h2'); if (h) h.id = 'm-title';
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) closeModal(); });
    back.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = focusables(back), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $('#modal-root').appendChild(back);
    bind && bind(back);
    (back.querySelector('input, select, .btn.primary') || focusables(back)[0])?.focus();
  }
  // silent: replaced by another dialog, so neither the cancel callback nor the focus return runs.
  function closeModal(silent) {
    if (!$('#modal-root').firstChild) return;
    $('#modal-root').innerHTML = '';
    if (silent === true) return;
    const cb = onClose; onClose = null; cb && cb();
    if (opener && document.contains(opener)) opener.focus();
  }
  function ask(title, body, okLabel = 'تأیید') {
    return new Promise(res => modal(`<h2>${esc(title)}</h2><p class="muted">${body}</p>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="ok">${esc(okLabel)}</button><button class="btn" id="no">انصراف</button></div>`, root => {
      root.querySelector('#ok').onclick = () => { onClose = null; closeModal(); res(true); };
      root.querySelector('#no').onclick = () => closeModal();
    }, () => res(false)));
  }
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.textContent = ''; }, 2800);
  }

  /* ---------------- dashboard ---------------- */
  function dashboard() {
    const schools = S().schools;
    const mrr = schools.reduce((a, s) => a + Store.monthly(s), 0);
    const active = schools.reduce((a, s) => a + Object.keys(s.modules).filter(id => Store.isOn(s, id) && Store.price(id).model !== 'included').length, 0);
    const pending = S().requests.filter(r => r.status === 'pending');
    const unpaid = S().invoices.filter(i => i.status === 'unpaid');
    const soon = [];
    schools.forEach(s => Object.entries(s.modules).forEach(([id, a]) => {
      if (Store.price(id).model === 'included') return;
      const left = (new Date(a.until) - new Date(Store.today())) / 864e5;
      if (left >= 0 && left <= 30) soon.push({ s, id, a, left });
    }));
    // How many schools use each paid module.
    const use = C.modules.filter(x => x.price.model !== 'included')
      .map(x => ({ x, n: schools.filter(s => Store.isOn(s, x.id) || (s.used[x.id] || 0) + (s.credits[x.id] || 0) > 0).length }))
      .sort((a, b) => b.n - a.n).slice(0, 8);
    const by = C.groups.map(g => ({ g, n: C.modules.filter(x => x.group === g.id).length }));

    return `
      <div class="grid g4">
        <div class="card kpi"><div class="l">مدرسه‌ها</div><div class="v">${fa(schools.length)}</div><div class="s">${fa(schools.filter(s => s.sample).length)} نمونهٔ آزمایشی</div></div>
        <div class="card kpi"><div class="l">درآمد ماهانهٔ تکرارشونده</div><div class="v num">${fa(Math.round(mrr / 1000))}<span class="small muted"> هزار تومان</span></div><div class="s">بر پایهٔ ماژول‌های فعال و قیمت‌های فعلی</div></div>
        <div class="card kpi"><div class="l">ماژول‌های پولی فعال</div><div class="v">${fa(active)}</div><div class="s">از ${fa(C.modules.filter(x => x.price.model !== 'included').length)} ماژول قابل فروش</div></div>
        <div class="card kpi"><div class="l">درخواست در انتظار</div><div class="v">${fa(pending.length)}</div><div class="s"><a href="#/requests">بررسی درخواست‌ها</a></div></div>
      </div>
      <div class="grid g2">
        <div class="card"><h2>درخواست‌های تازه</h2>${pending.length ? requestRows(pending.slice(0, 5), true) : '<div class="empty">درخواستی در انتظار نیست.</div>'}</div>
        <div class="card"><h2>نزدیک به پایان اشتراک (۳۰ روز)</h2>${soon.length ? `<div class="table-wrap"><table><tr><th>مدرسه</th><th>ماژول</th><th>پایان</th></tr>${soon.map(o =>
          `<tr><td><a href="#/schools/${o.s.id}">${esc(o.s.name)}</a></td><td>${esc(C.byId(o.id).name)}</td><td class="num">${fdate(o.a.until)} <span class="tag warn">${fa(Math.ceil(o.left))} روز</span></td></tr>`).join('')}</table></div>`
          : '<div class="empty">اشتراکی در ۳۰ روز آینده تمام نمی‌شود.</div>'}</div>
      </div>
      <div class="grid g2">
        <div class="card"><h2>پراستفاده‌ترین ماژول‌های پولی</h2>${use.map(o => `
          <div style="margin-bottom:10px"><div class="spread small"><span>${esc(o.x.name)}</span><span class="muted">${fa(o.n)} مدرسه</span></div>
          <div class="bar"><i style="width:${schools.length ? o.n / schools.length * 100 : 0}%"></i></div></div>`).join('')}</div>
        <div class="card"><h2>کاتالوگ در یک نگاه</h2>
          <p class="muted small">${fa(C.modules.length)} ماژول در ${fa(C.groups.length)} حوزه، ادغام‌شده از سه سامانه. <a href="#/map">نقشهٔ ادغام</a></p>
          <div class="row">${by.map(o => `<span class="tag grey">${esc(o.g.name)} · ${fa(o.n)}</span>`).join('')}</div>
          <h2 style="margin-top:18px">صورت‌حساب‌های پرداخت‌نشده</h2>
          <div class="spread"><span class="num"><b>${money(unpaid.reduce((a, i) => a + total(i), 0))}</b> <span class="muted small">در ${fa(unpaid.length)} فاکتور</span></span><a href="#/invoices">صورت‌حساب‌ها</a></div>
        </div>
      </div>`;
  }

  /* ---------------- modules ---------------- */
  let modFilter = { q: '', group: '', src: '' };
  function modulesView() {
    const f = modFilter;
    const list = C.modules.filter(x => (!f.group || x.group === f.group) && (!f.src || sourcesOf(x).includes(f.src)) &&
      (!f.q || (x.name + x.desc + x.from.map(t => t[1]).join(' ')).includes(f.q)));
    const html = C.groups.map(g => {
      const ms = list.filter(x => x.group === g.id); if (!ms.length) return '';
      return `<div class="group-head"><h2>${esc(g.name)}</h2><span class="muted small">${esc(g.desc)} · ${fa(ms.length)} ماژول</span></div>
        <div class="mods">${ms.map(x => `<div class="mod" data-mod="${x.id}">
          <div class="spread"><h3>${esc(x.name)}</h3><div class="row">${sourcesOf(x).map(srcTag).join('')}</div></div>
          <div class="desc">${esc(x.desc)}</div>
          <div class="foot"><span>${priceText(x.id)}</span><span class="muted">${fa(S().schools.filter(s => Store.isOn(s, x.id)).length)} مدرسه</span></div>
        </div>`).join('')}</div>`;
    }).join('');
    return `
      <div class="card"><div class="row">
        <input class="input" id="mq" placeholder="جست‌وجو در ماژول‌ها و ابزارهای اصلی…" value="${esc(f.q)}" style="flex:1;min-width:200px">
        <select class="input" id="mg"><option value="">همهٔ حوزه‌ها</option>${C.groups.map(g => `<option value="${g.id}" ${f.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <select class="input" id="ms"><option value="">همهٔ منبع‌ها</option>${Object.entries(C.sources).map(([k, v]) => `<option value="${k}" ${f.src === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
      </div><p class="muted small" style="margin:10px 0 0">قیمت‌ها نمونه‌اند؛ روی هر ماژول بزنید تا جزئیات، ابزارهای ادغام‌شده و قیمت را ببینید و ویرایش کنید.</p></div>
      ${html || '<div class="empty">ماژولی با این فیلتر پیدا نشد.</div>'}`;
  }
  function bindModules() {
    const re = () => { const y = scrollY; render(); scrollTo(0, y); };
    $('#mq').oninput = e => { modFilter.q = e.target.value; const pos = e.target.selectionStart; re(); const i = $('#mq'); i.focus(); i.setSelectionRange(pos, pos); };
    $('#mg').onchange = e => { modFilter.group = e.target.value; re(); };
    $('#ms').onchange = e => { modFilter.src = e.target.value; re(); };
  }

  function moduleModal(id) {
    const x = C.byId(id), p = Store.price(id);
    const users = S().schools.filter(s => Store.isOn(s, id));
    modal(`<div class="spread"><h2>${esc(x.name)}</h2><span class="tag">${esc(groupName(x.group))}</span></div>
      <p class="muted">${esc(x.desc)}</p>
      <h3 style="font-size:13px;margin-top:14px">از کدام ابزارها ادغام شده</h3>
      <div class="table-wrap"><table>${x.from.map(([s, t]) => `<tr><td style="width:90px">${srcTag(s)}</td><td>${esc(t)}</td></tr>`).join('')}</table></div>
      <dl class="kv">
        <dt>پیش‌نیاز</dt><dd>${x.deps.length ? x.deps.map(d => `<span class="tag grey">${esc(C.byId(d).name)}</span>`).join(' ') : '—'}</dd>
        <dt>کاربران اصلی</dt><dd>${x.users.map(r => esc(C.roleName(r))).join('، ')} <span class="muted small">(پیشنهادی؛ دسترسی‌ها بعداً تعیین می‌شود)</span></dd>
        <dt>ساخت</dt><dd>${buildTag(x.build)}</dd>
        <dt>مدرسه‌های دارای این ماژول</dt><dd>${users.length ? users.map(s => `<a href="#/schools/${s.id}" data-close>${esc(s.name)}</a>`).join('، ') : '—'}</dd>
      </dl>
      ${p.model === 'included' ? '<p class="note" style="margin-top:14px">این ماژول جزو اشتراک پایه است و جدا فروخته نمی‌شود.</p>' : `
      <div class="field"><span>قیمت (${esc(C.pricing[p.model].unit)}) — تومان</span>
        <div class="row"><input class="input num" id="pr" type="number" min="0" step="1000" value="${p.amount}" style="width:180px"><button class="btn primary" id="save">ذخیرهٔ قیمت</button></div></div>`}
      <div class="row" style="margin-top:18px"><button class="btn" data-close>بستن</button></div>`, root => {
      const b = root.querySelector('#save');
      if (b) b.onclick = () => { Store.setPrice(id, Math.max(0, +root.querySelector('#pr').value || 0)); closeModal(); render(); toast('قیمت ذخیره شد.'); };
    });
  }

  /* ---------------- merge map ---------------- */
  function mapView() {
    const rows = [];
    C.modules.forEach(x => x.from.forEach(([s, t]) => rows.push({ s, t, x })));
    const count = s => rows.filter(r => r.s === s).length;
    const multi = C.modules.filter(x => sourcesOf(x).filter(s => s !== 'new').length > 1);
    return `
      <div class="grid g4">
        ${['lms', 'erp', 'profile'].map(s => `<div class="card kpi"><div class="l">ابزار از ${esc(C.sources[s].name)}</div><div class="v">${fa(count(s))}</div></div>`).join('')}
        <div class="card kpi"><div class="l">ماژول نهایی</div><div class="v">${fa(C.modules.length)}</div><div class="s">${fa(rows.length)} ابزار → ${fa(C.modules.length)} ماژول</div></div>
      </div>
      <div class="card"><h2>ابزارهای تکراری که یکی شدند (${fa(multi.length)})</h2>
        <p class="muted small">این ماژول‌ها در بیش از یک سامانه وجود داشتند و در سامانهٔ تازه یک ماژول واحدند.</p>
        <div class="table-wrap"><table><tr><th>ماژول نهایی</th><th>LMS</th><th>ERP</th><th>سایت پروفایل</th></tr>
        ${multi.map(x => `<tr class="click" data-mod="${x.id}"><td><b>${esc(x.name)}</b></td>${['lms', 'erp', 'profile'].map(s =>
          `<td class="small">${x.from.filter(f => f[0] === s).map(f => esc(f[1])).join('<br>') || '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</table></div></div>
      <div class="card"><h2>همهٔ ابزارها و جای تازه‌شان</h2>
        <div class="table-wrap"><table><tr><th>منبع</th><th>ابزار در سامانهٔ فعلی</th><th>ماژول در سامانهٔ تازه</th><th>حوزه</th></tr>
        ${rows.sort((a, b) => a.s.localeCompare(b.s) || a.x.group.localeCompare(b.x.group)).map(r =>
          `<tr class="click" data-mod="${r.x.id}"><td>${srcTag(r.s)}</td><td>${esc(r.t)}</td><td>${esc(r.x.name)}</td><td class="muted small">${esc(groupName(r.x.group))}</td></tr>`).join('')}</table></div></div>`;
  }

  /* ---------------- plans ---------------- */
  function plansView() {
    const sumOf = ids => ids.reduce((a, id) => { const p = Store.price(id); return a + (p.model === 'monthly' ? p.amount : 0); }, 0);
    const tests = C.modules.filter(x => x.price.model === 'per_use');
    return `
      <p class="note">قیمت‌ها نمونه‌اند و با «ویرایش» عوض می‌شوند. ماژول‌های «به‌ازای دانش‌آموز» در جمع تک‌خرید بسته‌ها حساب نشده‌اند، چون به تعداد دانش‌آموز مدرسه بستگی دارند.</p>
      <div class="mods" style="margin-top:16px">${C.plans.map(pl => {
        const ala = sumOf(pl.modules), pp = Store.planPrice(pl.id);
        return `<div class="card" style="display:flex;flex-direction:column;gap:8px">
          <div class="spread"><h2 style="margin:0">${esc(pl.name)}</h2><span class="tag">${fa(pl.modules.length)} ماژول</span></div>
          <div class="muted small">${esc(pl.desc)}</div>
          <div><span class="kpi"><span class="v num" style="font-size:20px">${money(pp)}</span></span> <span class="muted small">ماهانه</span></div>
          ${ala && pl.id !== 'base' ? `<div class="small muted">جمع تک‌خرید ماژول‌های ماهانه: <span class="num">${money(ala)}</span>${ala > pp ? ` <span class="tag ok">${fa(Math.round((1 - pp / ala) * 100))}٪ ارزان‌تر</span>` : ''}</div>` : ''}
          <details><summary class="small" style="cursor:pointer">ماژول‌های بسته</summary><ul class="small" style="margin:6px 0 0;padding-right:18px">${pl.modules.map(id => `<li>${esc(C.byId(id).name)}</li>`).join('')}</ul></details>
          <button class="btn sm" data-plan="${pl.id}" style="align-self:flex-start">ویرایش قیمت</button>
        </div>`;
      }).join('')}</div>
      <div class="card"><h2>آزمون‌های استعدادیابی (فروش به‌ازای اجرا)</h2>
        <div class="table-wrap"><table><tr><th>آزمون</th><th>قیمت برای هر دانش‌آموز</th><th>اعتبار باقی‌ماندهٔ مدرسه‌ها</th><th>اجراشده</th></tr>
        ${tests.map(x => `<tr class="click" data-mod="${x.id}"><td>${esc(x.name)}</td><td class="num">${money(Store.price(x.id).amount)}</td>
          <td class="num">${fa(S().schools.reduce((a, s) => a + (s.credits[x.id] || 0), 0))}</td><td class="num">${fa(S().schools.reduce((a, s) => a + (s.used[x.id] || 0), 0))}</td></tr>`).join('')}</table></div></div>`;
  }
  function planModal(id) {
    const pl = C.plans.find(p => p.id === id);
    modal(`<h2>قیمت ${esc(pl.name)}</h2><div class="field"><span>ماهانه — تومان</span><input class="input num" id="pp" type="number" min="0" step="10000" value="${Store.planPrice(id)}"></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ذخیره</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => { Store.setPlanPrice(id, Math.max(0, +root.querySelector('#pp').value || 0)); closeModal(); render(); toast('قیمت بسته ذخیره شد.'); };
    });
  }

  /* ---------------- schools ---------------- */
  function schoolsView() {
    return `<div class="spread" style="margin-bottom:12px"><span class="muted">${fa(S().schools.length)} مدرسه</span><button class="btn primary" id="add-school">+ مدرسهٔ تازه</button></div>
      <div class="card"><div class="table-wrap"><table>
        <tr><th>مدرسه</th><th>دانش‌آموز</th><th>ماژول پولی فعال</th><th>اعتبار آزمون</th><th>درآمد ماهانه</th><th>از</th></tr>
        ${S().schools.map(s => {
          const paid = Object.keys(s.modules).filter(id => Store.isOn(s, id) && Store.price(id).model !== 'included').length;
          const cr = Object.values(s.credits).reduce((a, b) => a + b, 0);
          return `<tr class="click" data-school="${s.id}"><td><b>${esc(s.name)}</b> ${s.sample ? '<span class="tag grey">نمونه</span>' : ''}<div class="muted small">${esc([s.level, s.city].filter(Boolean).join(' · '))}</div></td>
            <td class="num">${s.students == null ? '<span class="muted">ثبت نشده</span>' : fa(s.students)}</td><td class="num">${fa(paid)}</td><td class="num">${fa(cr)}</td>
            <td class="num">${money(Store.monthly(s))}</td><td class="num small">${fdate(s.created)}</td></tr>`;
        }).join('')}</table></div></div>`;
  }
  function schoolForm(s = {}) {
    return `<div class="field"><span>نام مدرسه</span><input class="input" id="f-name" value="${esc(s.name || '')}"></div>
      <div class="grid g2" style="gap:0 12px"><div class="field"><span>شهر</span><input class="input" id="f-city" value="${esc(s.city || '')}"></div>
      <div class="field"><span>مقطع</span><input class="input" id="f-level" value="${esc(s.level || '')}" placeholder="مثلاً متوسطهٔ اول"></div>
      <div class="field"><span>تعداد دانش‌آموز</span><input class="input num" id="f-students" type="number" min="0" value="${s.students ?? ''}"></div>
      <div class="field"><span>تلفن یا رابط</span><input class="input" id="f-contact" value="${esc(s.contact || '')}"></div></div>`;
  }
  const readForm = root => ({
    name: root.querySelector('#f-name').value.trim(), city: root.querySelector('#f-city').value.trim(),
    level: root.querySelector('#f-level').value.trim(), contact: root.querySelector('#f-contact').value.trim(),
    students: root.querySelector('#f-students').value === '' ? null : Math.max(0, +root.querySelector('#f-students').value),
  });
  function addSchoolModal() {
    modal(`<h2>مدرسهٔ تازه</h2><p class="muted small">اشتراک پایه و ماژول‌های هسته خودکار برای یک سال فعال می‌شوند.</p>${schoolForm()}
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ساختن</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelector('#save').onclick = () => {
        const d = readForm(root); if (!d.name) return toast('نام مدرسه را بنویسید.');
        const s = Store.addSchool(d); closeModal(); location.hash = '#/schools/' + s.id;
      };
    });
  }

  let schoolTab = 'modules';
  function schoolView(id) {
    const s = Store.school(id); if (!s) return '<div class="empty">این مدرسه پیدا نشد.</div>';
    const tabs = [['modules', 'ماژول‌ها'], ['tests', 'آزمون‌ها'], ['seats', 'حساب‌ها'], ['billing', 'صورت‌حساب‌ها'], ['info', 'مشخصات']];
    let body = '';
    if (schoolTab === 'modules') {
      body = `<div class="spread" style="margin-bottom:6px"><span class="muted small">روشن‌کردن یک ماژول آن را یک سال فعال می‌کند؛ پیش‌نیازها هم پیشنهاد می‌شوند.</span>
        <div class="row"><select class="input" id="plan-pick">${C.plans.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button class="btn" id="apply-plan">اعمال بسته</button></div></div>
        ${C.groups.filter(g => g.id !== 'test').map(g => `<div class="group-head"><h2>${esc(g.name)}</h2></div>
        <div class="card" style="padding:4px 14px"><div class="table-wrap"><table>${C.modules.filter(x => x.group === g.id).map(x => {
          const a = s.modules[x.id], on = Store.isOn(s, x.id), core = x.price.model === 'included';
          const label = `${x.name}: ${core ? 'جزو اشتراک پایه، همیشه فعال' : on ? 'فعال' : 'غیرفعال'}`;
          return `<tr><td style="width:56px"><label class="switch"><input type="checkbox" role="switch" data-tog="${x.id}" aria-label="${esc(label)}" ${on ? 'checked' : ''} ${core ? 'disabled' : ''}><span></span></label></td>
            <td><a href="#" data-mod="${x.id}">${esc(x.name)}</a><div class="muted small">${priceText(x.id)}</div></td>
            <td class="small num">${a ? (on ? `تا ${fdate(a.until)}` : `<span class="tag bad">منقضی ${fdate(a.until)}</span>`) : '<span class="muted">غیرفعال</span>'}</td></tr>`;
        }).join('')}</table></div></div>`).join('')}`;
    } else if (schoolTab === 'tests') {
      body = `<div class="card"><div class="table-wrap"><table><tr><th>آزمون</th><th>اعتبار باقی‌مانده</th><th>اجراشده</th><th></th></tr>
        ${C.modules.filter(x => x.group === 'test').map(x => `<tr><td>${esc(x.name)}<div class="muted small">${priceText(x.id)}</div></td>
          <td class="num">${fa(s.credits[x.id] || 0)}</td><td class="num">${fa(s.used[x.id] || 0)}</td>
          <td><div class="row"><input class="input num" type="number" min="1" placeholder="تعداد" data-qty="${x.id}" style="width:90px"><button class="btn sm" data-credit="${x.id}">افزودن و صدور فاکتور</button></div></td></tr>`).join('')}
        </table></div><p class="muted small">اعتبار یعنی تعداد دانش‌آموزی که مدرسه می‌تواند آزمون را برایشان اجرا کند.</p></div>`;
    } else if (schoolTab === 'seats') {
      body = `<p class="note">دسترسی هر نقش به ماژول‌ها در مرحلهٔ بعد تعیین می‌شود. فعلاً تعداد حساب هر نقش را برای این مدرسه نگه می‌داریم.</p>
        <div class="card" style="margin-top:12px"><div class="table-wrap"><table><tr><th>نقش</th><th>کار</th><th>تعداد حساب</th></tr>
        ${C.roles.filter(r => r.id !== 'student' && r.id !== 'parent').map(r => `<tr><td><b>${esc(r.name)}</b></td><td class="muted small">${esc(r.desc)}</td>
          <td><input class="input num" type="number" min="0" data-seat="${r.id}" value="${s.seats[r.id] || 0}" style="width:80px"></td></tr>`).join('')}
        </table></div><p class="muted small">حساب دانش‌آموزان و اولیا از روی فهرست دانش‌آموزان ساخته می‌شود (${s.students == null ? 'تعداد ثبت نشده' : fa(s.students) + ' دانش‌آموز'}).</p></div>`;
    } else if (schoolTab === 'billing') {
      const inv = S().invoices.filter(i => i.school === id);
      body = `<div class="card">${inv.length ? invoiceTable(inv, false) : '<div class="empty">صورت‌حسابی ندارد.</div>'}</div>`;
    } else {
      body = `<div class="card">${schoolForm(s)}<div class="row" style="margin-top:16px"><button class="btn primary" id="save-info">ذخیره</button></div></div>`;
    }
    return `<div class="card spread" style="margin-bottom:16px"><div><a href="#/schools" class="small">‹ همهٔ مدرسه‌ها</a>
        <h2 style="font-size:19px;margin:2px 0 0">${esc(s.name)} ${s.sample ? '<span class="tag grey">نمونه</span>' : ''}</h2>
        <div class="muted small">درآمد ماهانه <b class="num">${money(Store.monthly(s))}</b></div></div>
        <button class="btn primary" data-enter-school="${s.id}">ورود به نمای این مدرسه ←</button></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${schoolTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  }
  function bindSchool(id) {
    const s = Store.school(id); if (!s) return;
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { schoolTab = b.dataset.tab; render(); });
    document.querySelectorAll('[data-tog]').forEach(i => i.onchange = async () => {
      const mid = i.dataset.tog, mod = C.byId(mid);
      if (i.checked) {
        const miss = Store.missingDeps(s, mid);
        if (miss.length && !await ask('پیش‌نیاز لازم است', `«${esc(mod.name)}» بدون این‌ها کار نمی‌کند: ${miss.map(d => '«' + esc(C.byId(d).name) + '»').join('، ')}. همه با هم فعال شوند؟`, 'فعال کن')) { i.checked = false; return; }
        Store.activate(id, [mid, ...miss]); toast('فعال شد.');
      } else {
        const dep = Store.dependents(s, mid);
        if (dep.length && !await ask('ماژول‌های وابسته', `این‌ها به «${esc(mod.name)}» وابسته‌اند و بی‌استفاده می‌مانند: ${dep.map(d => '«' + esc(C.byId(d).name) + '»').join('، ')}. باز هم غیرفعال شود؟`, 'غیرفعال کن')) { i.checked = true; return; }
        Store.deactivate(id, mid); toast('غیرفعال شد.');
      }
      render();
    });
    const ap = $('#apply-plan');
    if (ap) ap.onclick = async () => {
      const pl = C.plans.find(p => p.id === $('#plan-pick').value);
      const add = [...new Set(pl.modules.flatMap(m => [m, ...Store.missingDeps(s, m)]))].filter(m => !Store.isOn(s, m));
      if (!add.length) return toast('همهٔ ماژول‌های این بسته از قبل فعال‌اند.');
      if (!await ask(`اعمال ${pl.name}`, `${fa(add.length)} ماژول برای یک سال فعال می‌شود و فاکتور ${money(Store.planPrice(pl.id) * 12)} صادر می‌شود.`, 'اعمال و صدور فاکتور')) return;
      Store.activate(id, add); Store.invoice(id, [{ desc: `${pl.name} — ۱۲ ماه`, amount: Store.planPrice(pl.id) * 12 }]);
      toast('بسته اعمال شد.'); render();
    };
    document.querySelectorAll('[data-credit]').forEach(b => b.onclick = () => {
      const mid = b.dataset.credit, n = Math.floor(+document.querySelector(`[data-qty="${mid}"]`).value || 0);
      if (n < 1) return toast('تعداد را بنویسید.');
      Store.addCredits(id, mid, n);
      Store.invoice(id, [{ desc: `${C.byId(mid).name} — ${fa(n)} نفر`, amount: Store.price(mid).amount * n }]);
      toast('اعتبار افزوده شد و فاکتور صادر شد.'); render();
    });
    document.querySelectorAll('[data-seat]').forEach(i => i.onchange = () => { s.seats[i.dataset.seat] = Math.max(0, +i.value || 0); Store.save(); toast('ذخیره شد.'); });
    const si = $('#save-info');
    if (si) si.onclick = () => { const d = readForm(document); if (!d.name) return toast('نام مدرسه را بنویسید.'); Object.assign(s, d); Store.save(); toast('ذخیره شد.'); render(); };
  }

  /* ---------------- requests ---------------- */
  function requestRows(list, compact) {
    return `<div class="table-wrap"><table><tr><th>مدرسه</th><th>درخواست</th>${compact ? '' : '<th>تاریخ</th><th>یادداشت</th>'}<th>مبلغ تقریبی</th><th></th></tr>
      ${list.map(r => {
        const s = Store.school(r.school), x = C.byId(r.module), p = Store.price(r.module);
        const amt = r.kind === 'credits' ? p.amount * r.qty : p.model === 'monthly' ? p.amount * 12 : p.model === 'per_student' ? p.amount * (s.students || 0) : 0;
        const st = { pending: '', approved: '<span class="tag ok">تأیید شد</span>', rejected: '<span class="tag bad">رد شد</span>' }[r.status];
        return `<tr><td><a href="#/schools/${s.id}">${esc(s.name)}</a></td>
          <td>${r.kind === 'credits' ? `اعتبار «${esc(x.name)}» برای ${fa(r.qty)} نفر` : `فعال‌سازی «${esc(x.name)}»`}</td>
          ${compact ? '' : `<td class="small num">${fdate(r.at)}</td><td class="small muted">${esc(r.note) || '—'}</td>`}
          <td class="num">${money(amt)}</td>
          <td>${r.status === 'pending' ? `<div class="row"><button class="btn sm primary" data-ok="${r.id}">تأیید و فعال‌سازی</button><button class="btn sm danger" data-no="${r.id}">رد</button></div>` : st}</td></tr>`;
      }).join('')}</table></div>`;
  }
  function requestsView() {
    const all = [...S().requests].sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.at.localeCompare(a.at));
    return `<p class="note">در سامانهٔ واقعی، مدیر مدرسه از پنل خودش ماژول یا اعتبار آزمون درخواست می‌دهد و اینجا می‌بینید. با «تأیید»، ماژول یک سال فعال و فاکتور صادر می‌شود.</p>
      <div class="spread" style="margin:14px 0"><span class="muted">${fa(all.filter(r => r.status === 'pending').length)} درخواست در انتظار</span><button class="btn" id="new-req">+ ثبت درخواست دستی</button></div>
      <div class="card">${all.length ? requestRows(all, false) : '<div class="empty">درخواستی نیست.</div>'}</div>`;
  }
  function newRequestModal() {
    const paid = C.modules.filter(x => x.price.model !== 'included');
    modal(`<h2>ثبت درخواست</h2><p class="muted small">برای وقتی که مدرسه تلفنی یا حضوری درخواست داده است.</p>
      <div class="field"><span>مدرسه</span><select class="input" id="r-s">${S().schools.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><span>ماژول یا آزمون</span><select class="input" id="r-m">${C.groups.map(g => {
        const ms = paid.filter(x => x.group === g.id); return ms.length ? `<optgroup label="${esc(g.name)}">${ms.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</optgroup>` : '';
      }).join('')}</select></div>
      <div class="field" id="r-qf"><span>تعداد دانش‌آموز (برای آزمون)</span><input class="input num" id="r-q" type="number" min="1" value="30"></div>
      <div class="field"><span>یادداشت</span><input class="input" id="r-n"></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">ثبت</button><button class="btn" data-close>انصراف</button></div>`, root => {
      const sync = () => { root.querySelector('#r-qf').style.display = C.byId(root.querySelector('#r-m').value).price.model === 'per_use' ? '' : 'none'; };
      root.querySelector('#r-m').onchange = sync; sync();
      root.querySelector('#save').onclick = () => {
        const mid = root.querySelector('#r-m').value, test = C.byId(mid).price.model === 'per_use';
        S().requests.push({ id: 'r' + Date.now().toString(36), school: root.querySelector('#r-s').value, kind: test ? 'credits' : 'module', module: mid,
          qty: test ? Math.max(1, Math.floor(+root.querySelector('#r-q').value || 1)) : 0, note: root.querySelector('#r-n').value.trim(), status: 'pending', at: Store.today() });
        Store.save(); closeModal(); render(); toast('درخواست ثبت شد.');
      };
    });
  }
  function bindRequests() {
    document.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { Store.decide(b.dataset.ok, true); toast('فعال شد و فاکتور صادر شد.'); render(); });
    document.querySelectorAll('[data-no]').forEach(b => b.onclick = async () => { if (await ask('رد درخواست', 'این درخواست رد شود؟', 'رد کن')) { Store.decide(b.dataset.no, false); render(); } });
    const nr = $('#new-req'); if (nr) nr.onclick = newRequestModal;
  }

  /* ---------------- invoices ---------------- */
  const total = i => i.items.reduce((a, it) => a + it.amount, 0);
  function invoiceTable(list, withSchool = true) {
    return `<div class="table-wrap"><table><tr><th>شماره</th>${withSchool ? '<th>مدرسه</th>' : ''}<th>تاریخ</th><th>شرح</th><th>مبلغ</th><th>وضعیت</th></tr>
      ${list.map(i => `<tr><td class="num">${esc(i.id)}</td>${withSchool ? `<td><a href="#/schools/${i.school}">${esc(Store.school(i.school)?.name || '—')}</a></td>` : ''}
        <td class="num small">${fdate(i.at)}</td><td class="small">${i.items.map(it => esc(it.desc)).join('<br>')}</td><td class="num">${money(total(i))}</td>
        <td>${i.status === 'paid' ? '<span class="tag ok">پرداخت شد</span>' : `<span class="tag warn">پرداخت‌نشده</span> <button class="btn sm" data-paid="${i.id}">ثبت پرداخت</button>`}</td></tr>`).join('')}</table></div>`;
  }
  function invoicesView() {
    const all = S().invoices, paid = all.filter(i => i.status === 'paid');
    return `<div class="grid g3">
        <div class="card kpi"><div class="l">کل فاکتورها</div><div class="v">${fa(all.length)}</div></div>
        <div class="card kpi"><div class="l">دریافت‌شده</div><div class="v num" style="font-size:20px">${money(paid.reduce((a, i) => a + total(i), 0))}</div></div>
        <div class="card kpi"><div class="l">در انتظار پرداخت</div><div class="v num" style="font-size:20px">${money(all.filter(i => i.status !== 'paid').reduce((a, i) => a + total(i), 0))}</div></div></div>
      <div class="card">${all.length ? invoiceTable(all) : '<div class="empty">صورت‌حسابی صادر نشده.</div>'}</div>`;
  }
  const bindPaid = () => document.querySelectorAll('[data-paid]').forEach(b => b.onclick = () => {
    const i = S().invoices.find(x => x.id === b.dataset.paid); i.status = 'paid'; i.paidAt = Store.today(); Store.save(); toast('پرداخت ثبت شد.'); render();
  });

  /* ---------------- roles & settings ---------------- */
  // Which school roles may use which module, per school. Rows are the modules the school pages use;
  // a dash means that role has no page for that module.
  let accSchool = '';
  const SCHOOL_ROLE_IDS = ['principal', 'deputy', 'exec', 'nazem', 'counselor', 'teacher', 'finance'];
  function rolesView() {
    const schools = S().schools; if (!schools.some(x => x.id === accSchool)) accSchool = schools[0]?.id || '';
    const sc = Store.school(accSchool), roles = SCHOOL_ROLE_IDS.filter(r => NAV[r]);
    const uses = r => new Set(NAV[r].hubs.flatMap(h => h.pages.map(p => p[2]).filter(Boolean)));
    const mods = [...new Set(roles.flatMap(r => [...uses(r)]))].map(id => C.byId(id)).filter(Boolean);
    const groups = C.groups.filter(g => mods.some(m => m.group === g.id));
    return `<p class="note">برای هر مدرسه تعیین کنید هر نقش به کدام ماژول دسترسی دارد. تیک برداشته‌شده یعنی آن نقش آن بخش را نمی‌بیند (حتی اگر مدرسه آن را خریده باشد). «—» یعنی آن نقش صفحه‌ای برای آن ماژول ندارد.</p>
      <div class="row" style="margin:12px 0"><label class="small muted" for="acc-s">مدرسه</label><select class="input" id="acc-s" style="width:auto">${schools.map(x => `<option value="${x.id}" ${x.id === accSchool ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="card"><div class="table-wrap"><table class="acc-table"><thead><tr><th>ماژول</th>${roles.map(r => `<th>${esc(NAV[r].name)}</th>`).join('')}</tr></thead>
        ${groups.map(g => `<tbody><tr class="acc-g"><th colspan="${roles.length + 1}">${esc(g.name)}</th></tr>
          ${mods.filter(m => m.group === g.id).map(m => `<tr><td>${esc(m.name)}${Store.isOn(sc, m.id) ? '' : ' <span class="tag grey">خریده نشده</span>'}</td>${roles.map(r => uses(r).has(m.id)
            ? `<td><input type="checkbox" data-acc="${r}|${m.id}" ${Store.canUse(sc, r, m.id) ? 'checked' : ''} aria-label="${esc(NAV[r].name)}: ${esc(m.name)}"></td>` : '<td class="muted">—</td>').join('')}</tr>`).join('')}</tbody>`).join('')}</table></div></div>`;
  }
  function bindRoles() {
    const sel = document.getElementById('acc-s'); if (sel) sel.onchange = () => { accSchool = sel.value; render(); };
    document.querySelectorAll('[data-acc]').forEach(c => c.onchange = () => { const [r, m] = c.dataset.acc.split('|'); Store.setAccess(accSchool, r, m, c.checked); UI.toast(c.checked ? 'دسترسی داده شد.' : 'دسترسی برداشته شد.'); });
  }
  function settingsView() {
    return `<div class="card"><h2>نام محصول</h2><div class="row"><input class="input" id="pn" aria-label="نام محصول" value="${esc(S().productName)}" style="flex:1;min-width:200px"><button class="btn primary" id="save-pn">ذخیره</button></div>
        <p class="muted small">نام فعلی موقت است؛ هر وقت نام نهایی را انتخاب کردید اینجا عوضش کنید.</p></div>
      <div class="card"><h2>ورود</h2>
        <label class="row" style="cursor:pointer"><input type="checkbox" id="demo-on" ${S().demoLogin !== false ? 'checked' : ''}> ورود نمایشی (حساب‌های بی‌رمز برای معرفی سامانه) روشن باشد</label>
        <p class="muted small">پیش از تحویل به مدرسهٔ واقعی خاموشش کنید؛ آن وقت فقط حساب‌هایی که مدیر برایشان رمز گذاشته وارد می‌شوند.</p>
        <div class="grid g2" style="gap:0 12px;margin-top:8px"><label class="field"><span>رمز تازهٔ مالک (دست‌کم ۸ نویسه)</span><input class="input" type="password" id="op1" autocomplete="new-password" dir="ltr"></label>
          <label class="field"><span>تکرار رمز</span><input class="input" type="password" id="op2" autocomplete="new-password" dir="ltr"></label></div>
        <div class="row"><button class="btn primary" id="save-op">${S().ownerPass ? 'تغییر رمز مالک' : 'تعیین رمز مالک'}</button>${S().ownerPass ? '<span class="tag ok">رمز مالک تعیین شده</span>' : '<span class="tag warn">رمز مالک تعیین نشده</span>'}</div></div>
      <div class="card"><h2>داده‌های پنل</h2><p class="muted small">در این نمونهٔ اولیه همه چیز در همین مرورگر ذخیره می‌شود و با پاک‌کردن دادهٔ مرورگر از بین می‌رود.</p>
        <div class="row"><button class="btn" id="export">دریافت فایل پشتیبان (JSON)</button><button class="btn danger" id="reset">بازگشت به دادهٔ نمونه</button></div></div>`;
  }
  function bindSettings() {
    $('#demo-on').onchange = e => {
      if (!e.target.checked && !S().ownerPass) { e.target.checked = true; return UI.invalid('#op1', 'اول رمز مالک را تعیین کنید؛ بدون آن، ورود مالک بسته می‌شود.'); }
      S().demoLogin = e.target.checked; Store.save(); toast(e.target.checked ? 'ورود نمایشی روشن شد.' : 'ورود نمایشی خاموش شد.');
    };
    $('#save-op').onclick = async () => {
      const a = $('#op1').value, b = $('#op2').value;
      if (a.length < 8) return UI.invalid('#op1', 'رمز باید دست‌کم ۸ نویسه باشد.');
      if (a !== b) return UI.invalid('#op2', 'تکرار رمز یکی نیست.');
      S().ownerPass = await Auth.makePass(a); Store.save(); toast('رمز مالک ذخیره شد.'); render();
    };
    $('#save-pn').onclick = () => { S().productName = $('#pn').value.trim() || 'سامانهٔ جامع مدرسه'; Store.save(); toast('ذخیره شد.'); render(); };
    $('#export').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' }));
      a.download = 'owner-panel-backup.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    $('#reset').onclick = async () => { if (await ask('بازگشت به دادهٔ نمونه', 'همهٔ تغییرات قیمت، مدرسه‌ها، درخواست‌ها و فاکتورها پاک می‌شود.', 'پاک کن')) { Store.reset(); render(); toast('دادهٔ نمونه برگشت.'); } };
  }

  /* ---------------- router ---------------- */
  const routes = {
    dashboard: { t: 'داشبورد', v: dashboard },
    modules: { t: 'ماژول‌ها', v: modulesView, b: bindModules },
    map: { t: 'نقشهٔ ادغام سه سامانه', v: mapView },
    plans: { t: 'بسته‌ها و قیمت‌ها', v: plansView },
    schools: { t: 'مدرسه‌ها', v: schoolsView },
    requests: { t: 'درخواست‌ها', v: requestsView, b: bindRequests },
    invoices: { t: 'صورت‌حساب‌ها', v: invoicesView },
    roles: { t: 'دسترسی نقش‌ها به ماژول‌ها', v: rolesView, b: bindRoles },
    settings: { t: 'تنظیمات', v: settingsView, b: bindSettings },
  };
  let lastRoute = '';
  function render() {
    const [name = 'dashboard', arg] = location.hash.replace(/^#\//, '').split('/');
    const r = routes[name] || routes.dashboard;
    const key = name + '/' + (arg || '');
    if (key !== lastRoute && name === 'schools' && arg) schoolTab = lastRoute.startsWith('schools/' + arg) ? schoolTab : 'modules';
    lastRoute = key;
    // Shared frame: top bar with the four roles and the system map, the four-section rail, the section header with tabs.
    const view = routes[name] ? name : 'dashboard';
    const pend = S().requests.filter(x => x.status === 'pending').length;
    Shell.topbar({ role: 'owner', schoolId: Shell.pref().school });
    Shell.rail({ role: 'owner', view, noHome: true, homeHref: '#/dashboard', isHome: false, locked: () => false, hrefOf: v => '#/' + v,
      badges: { schools: pend } });
    const hub = Shell.hubOf('owner', view);
    $('#view').innerHTML = Shell.hubHeader({ role: 'owner', view, crumb: ['مالک سامانه', hub.label], locked: () => false, hrefOf: v => '#/' + v,
      title: hub.pages.length > 1 ? hub.label : r.t, badges: { requests: pend } }) + (name === 'schools' && arg ? schoolView(arg) : r.v());
    document.title = `${r.t} · پنل مالک`;
    UI.cardTables($('#view'));
    // Cards and table rows that open something work from the keyboard too (Enter or Space).
    document.querySelectorAll('#view .mod[data-mod], #view tr[data-mod], #view tr[data-school]').forEach(el => {
      el.tabIndex = 0; el.setAttribute('role', 'button');
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    });
    // Shared bindings: module details, plan prices, school rows, payments.
    document.querySelectorAll('#view [data-mod]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); moduleModal(el.dataset.mod); }));
    document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => planModal(b.dataset.plan));
    document.querySelectorAll('[data-school]').forEach(tr => tr.onclick = () => { location.hash = '#/schools/' + tr.dataset.school; });
    const as = $('#add-school'); if (as) as.onclick = addSchoolModal;
    const es = document.querySelector('[data-enter-school]');
    if (es) es.onclick = () => { Shell.setPref({ school: es.dataset.enterSchool, role: 'principal' }); location.href = 'school.html#/desk'; };
    bindPaid();
    if (name === 'schools' && arg) bindSchool(arg);
    else if (r.b) r.b();
    if (name === 'dashboard') bindRequests();
  }
  window.addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  // A school asked for something in the school view (another tab): show it, unless a dialog is open.
  window.addEventListener('store-changed', () => { if (!$('#modal-root').firstChild) render(); });
  render();
})();
