// Shared pieces of the class pages (classroom.js, cr-quiz.js), modelled on Moodle's activity settings:
//   the form frame (collapsible sections with «باز/جمع شدن همه»), a small rich-text editor, date-and-time fields with «فعال‌سازی»,
//   the common module settings, restrict access (date, grade, profile, group and nested sets), activity completion and tags;
//   and the rules that decide whether a student may open an item.
// Dates with a time are kept as local 'YYYY-MM-DDTHH:MM' strings, so they compare as text.
const CRKit = (() => {
  const { esc, fa } = UI;
  const J = JDate;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const pad = n => String(n).padStart(2, '0');
  const now = () => { const t = new Date(); return `${J.todayIso()}T${pad(t.getHours())}:${pad(t.getMinutes())}`; };
  const fdt = dt => dt ? `${J.format(dt.slice(0, 10))}، ساعت ${digits(dt.slice(11, 16))}` : '—';
  // «۲ روز و ۳ ساعت» between two date-times.
  function span(from, to) {
    let m = Math.round((new Date(to) - new Date(from)) / 6e4); const neg = m < 0; m = Math.abs(m);
    const dd = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = m % 60;
    const parts = [dd && `${fa(dd)} روز`, hh && `${fa(hh)} ساعت`, !dd && mm && `${fa(mm)} دقیقه`].filter(Boolean);
    return { neg, text: parts.join(' و ') || 'کمتر از یک دقیقه' };
  }

  /* ---------- rich text: only simple tags survive, links only to http(s) ---------- */
  const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'DIV', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE']);
  function clean(html) {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const walk = node => [...node.childNodes].map(n => {
      if (n.nodeType === 3) return esc(n.textContent);
      if (n.nodeType !== 1) return '';
      const inner = walk(n), t = n.tagName;
      if (!KEEP.has(t)) return inner;
      if (t === 'BR') return '<br>';
      if (t === 'A') { const h = n.getAttribute('href') || ''; return /^https?:\/\//i.test(h) ? `<a href="${esc(h)}" target="_blank" rel="noopener">${inner}</a>` : inner; }
      return `<${t.toLowerCase()}>${inner}</${t.toLowerCase()}>`;
    }).join('');
    return walk(doc.body.firstChild).replace(/^(<br>|<div><br><\/div>)+|(<br>|<div><br><\/div>)+$/g, '').trim();
  }
  const plain = html => new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html').body.textContent.trim();
  const words = html => (plain(html).match(/\S+/g) || []).length;
  const RT = [['bold', 'پررنگ', '<b>ب</b>'], ['italic', 'کج', '<i>ک</i>'], ['underline', 'زیرخط', '<u>ز</u>'],
    ['insertUnorderedList', 'فهرست نقطه‌ای', '•'], ['insertOrderedList', 'فهرست شماره‌دار', '۱.'], ['createLink', 'افزودن پیوند', 'پیوند'], ['removeFormat', 'پاک کردن قالب', 'ساده']];
  const rich = (id, html, label, rows = 4) => `<div class="rt"><div class="rt-bar" role="toolbar" aria-label="قالب‌بندی ${esc(label)}">
      ${RT.map(([c, l, i]) => `<button type="button" class="rt-b" data-rt="${c}" data-for="${id}" aria-label="${l}" title="${l}">${i}</button>`).join('')}</div>
    <div class="rt-link" hidden><input class="input" dir="ltr" placeholder="https://" aria-label="نشانی پیوند"><button type="button" class="btn sm" data-rt-ok="${id}">افزودن</button></div>
    <div class="input rt-ed" id="${id}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(label)}" style="min-height:${rows * 1.7}em">${clean(html)}</div>
    <div class="rt-wc muted small" aria-live="polite" data-wc="${id}">${fa(words(html))} واژه</div></div>`;
  const readRich = (root, id) => clean(root.querySelector('#' + id)?.innerHTML || '');
  const show = html => `<div class="rt-view">${clean(html)}</div>`;

  /* ---------- small form helpers ---------- */
  const row = (label, control, help, forId) => `<div class="cr-row">${forId ? `<label class="cr-l" for="${forId}">${label}</label>` : `<span class="cr-l">${label}</span>`}
    <div class="cr-c">${control}${help ? `<small class="muted cr-help">${help}</small>` : ''}</div></div>`;
  const sel = (id, opts, val, label) => `<select class="input" id="${id}"${label ? ` aria-label="${esc(label)}"` : ''}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const YN = [['0', 'خیر'], ['1', 'بله']];
  const yn = (id, val, label) => sel(id, YN, val ? '1' : '0', label);
  const chk = (id, on, label) => `<label class="cr-chk"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}</label>`;
  const sec = (title, body, open = true) => `<details class="cr-sec" ${open ? 'open' : ''}><summary><h3>${title}</h3></summary><div class="cr-sb">${body}</div></details>`;
  const v = (root, id) => (root.querySelector('#' + id)?.value || '').trim();
  const on = (root, id) => !!root.querySelector('#' + id)?.checked;
  const num = s => +String(s).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٫,]/g, '.');
  // A date-and-time with «فعال‌سازی»; off means «no such date».
  function dt(id, val, label, def) {
    const x = val || def || now();
    return `<div class="cr-dt ${val ? '' : 'off'}"><label class="cr-chk"><input type="checkbox" id="${id}-on" data-dt-on ${val ? 'checked' : ''}> فعال‌سازی</label>
      ${J.field(id + '-d', x.slice(0, 10), label)}<input class="input num cr-time" type="time" id="${id}-t" value="${x.slice(11, 16) || '08:00'}" aria-label="${esc(label)}، ساعت"></div>`;
  }
  const readDt = (root, id) => on(root, id + '-on') ? `${v(root, id + '-d')}T${v(root, id + '-t') || '00:00'}` : null;
  function readFiles(input, maxKB = 500) {
    return Promise.all([...(input?.files || [])].map(f => new Promise((res, rej) => {
      if (f.size > maxKB * 1024) { rej(new Error(f.name)); return; }
      const r = new FileReader(); r.onload = () => res({ name: f.name, size: f.size, type: f.type, at: now(), data: r.result }); r.onerror = rej; r.readAsDataURL(f);
    })));
  }
  const kb = n => n >= 1048576 ? `${fa(Math.round(n / 104857.6) / 10)} مگابایت` : `${fa(Math.max(1, Math.round(n / 1024)))} کیلوبایت`;
  const ext = name => (name.split('.').pop() || '').toLowerCase();
  const fileLink = f => `<a class="btn sm" href="${esc(f.data)}" download="${esc(f.name)}">دانلود ${esc(f.name)}</a>`;
  // Existing files with a remove box, then a picker for more.
  const filesField = (id, files, accept, multiple = true) => `${(files || []).length ? `<ul class="cr-files">${files.map((f, i) => `<li><span>${esc(f.name)} <span class="muted small">(${kb(f.size)})</span></span>
      <label class="cr-chk small"><input type="checkbox" data-keep="${id}" value="${i}" checked> نگه‌داشتن</label></li>`).join('')}</ul>` : ''}
    <input class="input" type="file" id="${id}" ${multiple ? 'multiple' : ''} ${accept ? `accept="${esc(accept)}"` : ''}>`;
  async function readFilesField(root, id, old, maxKB) {
    const keep = [...root.querySelectorAll(`[data-keep="${id}"]`)].filter(c => c.checked).map(c => old[+c.value]);
    return [...keep, ...await readFiles(root.querySelector('#' + id), maxKB)];
  }

  /* ---------- common module settings ---------- */
  const VIS = [['show', 'نمایش در صفحهٔ درس'], ['hide', 'پنهان از دانش‌آموزان'], ['stealth', 'در دسترس اما نمایش داده نشود']];
  const LANGS = [['', 'اجباری نباشد'], ['fa', 'فارسی'], ['en', 'English'], ['ar', 'العربیة']];
  const GMODE = [['none', 'بدون گروه‌بندی'], ['separate', 'گروه‌های جداگانه'], ['visible', 'گروه‌های قابل مشاهده']];
  const common = (it, opt) => sec('تنظیمات مشترک ماژول', row('در دسترس بودن', sel('c-vis', VIS, it.vis || 'show'), '«در دسترس اما نمایش داده نشود»: در فهرست درس نیست، ولی با پیوند مستقیم باز می‌شود.', 'c-vis')
    + row('مشخصه', `<input class="input" id="c-idn" value="${esc(it.idnum || '')}" dir="ltr">`, 'شناسه‌ای برای شناختن این فعالیت در محاسبه‌ها و کاربرگ نمره.', 'c-idn')
    + row('اجبار زبان', sel('c-lang', LANGS, it.lang || ''), 'صفحهٔ این فعالیت برای دانش‌آموز با همین زبان و جهت نوشته می‌شود.', 'c-lang')
    + (opt.groups ? row('حالت گروه', sel('c-gm', GMODE, it.gmode || 'none'), 'جداگانه: هر معلم و دانش‌آموز فقط گروه خود را می‌بیند؛ قابل مشاهده: گروه‌های دیگر هم دیده می‌شوند.', 'c-gm')
      + `<div class="cr-row"><span class="cr-l"></span><div class="cr-c"><button type="button" class="btn sm" data-rs-group>افزودن محدودیت دسترسی گروه</button></div></div>` : ''), false);
  const readCommon = root => ({ vis: v(root, 'c-vis'), idnum: v(root, 'c-idn'), lang: v(root, 'c-lang'), gmode: v(root, 'c-gm') || 'none' });

  /* ---------- restrict access ---------- */
  // A set: { op: 'all' | 'any', list: [cond] }; a cond: date {dir, at}, grade {item, min, max} (percent), profile {field, op, val},
  // group {gid}, or a nested set; every cond may be negated («نباید»).
  const COND = [['date', 'تاریخ', 'جلوگیری از دسترسی تا (یا از) یک تاریخ و زمان مشخص.'], ['grade', 'نمره', 'دانش‌آموز باید در فعالیت دیگری نمرهٔ مشخصی بگیرد.'],
    ['profile', 'پروفایل کاربر', 'کنترل دسترسی با فیلدهای پروفایل دانش‌آموز (کلاس، نام).'], ['group', 'گروه', 'فقط اعضای یک گروه.'],
    ['set', 'مجموعهٔ محدودیت‌ها', 'مجموعه‌ای از محدودیت‌ها در دل هم، برای منطق‌های پیچیده.']];
  const node = (rs, path) => path === '' ? rs : String(path).split('.').reduce((n, i) => n.list[+i], rs);
  const pid = path => 'rs' + String(path).replace(/\./g, '_');
  function rsSet(set, path, env) {
    const pre = path === '' ? '' : path + '.';
    const list = set.list.map((c, i) => {
      const p = pre + i, id = pid(p);
      const neg = `<select class="input sm" data-rp="${p}" data-rk="neg" aria-label="باید یا نباید"><option value="">باید</option><option value="1" ${c.neg ? 'selected' : ''}>نباید</option></select>`;
      let body = '';
      if (c.t === 'date') body = `${sel('', [['from', 'از'], ['until', 'تا قبلِ']], c.dir).replace('<select class="input"', `<select class="input sm" data-rp="${p}" data-rk="dir" aria-label="جهت تاریخ"`)}
        ${J.field(id + '-d', c.at.slice(0, 10), 'تاریخ محدودیت')}<input class="input num cr-time" type="time" value="${c.at.slice(11, 16)}" data-rp="${p}" data-rk="time" aria-label="ساعت محدودیت">`;
      else if (c.t === 'grade') body = `<select class="input sm" data-rp="${p}" data-rk="item" aria-label="فعالیت">${env.gradable.map(g => `<option value="${g.id}" ${g.id === c.item ? 'selected' : ''}>${esc(g.title)}</option>`).join('') || '<option value="">فعالیت نمره‌داری نیست</option>'}</select>
        <label class="cr-chk small"><input type="checkbox" data-rp="${p}" data-rk="minOn" ${c.min != null ? 'checked' : ''}> باید ≥</label><input class="input num sm" style="width:70px" data-rp="${p}" data-rk="min" value="${c.min ?? ''}" aria-label="کمترین درصد">٪
        <label class="cr-chk small"><input type="checkbox" data-rp="${p}" data-rk="maxOn" ${c.max != null ? 'checked' : ''}> باید &lt;</label><input class="input num sm" style="width:70px" data-rp="${p}" data-rk="max" value="${c.max ?? ''}" aria-label="بیشترین درصد">٪`;
      else if (c.t === 'profile') body = `<select class="input sm" data-rp="${p}" data-rk="field" aria-label="فیلد پروفایل"><option value="cls" ${c.field === 'cls' ? 'selected' : ''}>کلاس</option><option value="name" ${c.field === 'name' ? 'selected' : ''}>نام</option></select>
        ${c.field === 'cls' ? `<span class="small">برابر است با</span><select class="input sm" data-rp="${p}" data-rk="val" aria-label="کلاس">${env.classes.map(k => `<option value="${k.id}" ${k.id === c.val ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>`
          : `<span class="small">شامل</span><input class="input sm" data-rp="${p}" data-rk="val" value="${esc(c.val || '')}" aria-label="بخشی از نام">`}`;
      else if (c.t === 'group') body = `<span class="small">عضو گروه</span><select class="input sm" data-rp="${p}" data-rk="gid" aria-label="گروه">${env.groups.map(g => `<option value="${g.id}" ${g.id === c.gid ? 'selected' : ''}>${esc(g.name)}</option>`).join('') || '<option value="">گروهی ساخته نشده</option>'}</select>`;
      else body = rsSet(c, p, env);
      return `<div class="rs-c ${c.t === 'set' ? 'rs-nest' : ''}"><div class="rs-head"><b class="small">${COND.find(k => k[0] === c.t)[1]}</b>${neg}${c.t === 'set' ? '' : body}
        <button type="button" class="btn sm danger" data-rx="${p}" aria-label="حذف این محدودیت">×</button></div>${c.t === 'set' ? body : ''}</div>`;
    }).join('');
    const op = set.list.length > 1 ? `<div class="small rs-op">دانش‌آموز باید با <select class="input sm" data-rp="${path}" data-rk="op" aria-label="همه یا هر یک"><option value="all">همهٔ</option><option value="any" ${set.op === 'any' ? 'selected' : ''}>هر یک از</option></select> شرایط زیر مطابقت داشته باشد</div>` : '';
    return `<div class="rs-set">${op}${list || (path === '' ? '<p class="muted small" style="margin:0">هیچ</p>' : '')}
      <button type="button" class="btn sm" data-ra="${path}">ایجاد محدودیت</button><div class="rs-pick" data-pick="${path}" hidden>
      ${COND.filter(k => k[0] !== 'group' || env.groups.length).map(([t, l, d]) => `<button type="button" class="btn sm" data-rt-add="${t}" data-at="${path}">${l}</button><span class="small muted">${d}</span>`).join('')}
      <button type="button" class="btn sm" data-ra-x="${path}">انصراف</button></div></div>`;
  }
  const restrict = () => sec('دسترسی محدود', '<div class="cr-row"><span class="cr-l">محدودیت‌های دسترسی</span><div class="cr-c" id="rs-box"></div></div>', false);
  // Keeps the restriction tree in a closure and redraws it on every structural change.
  function wireRestrict(root, rs, env) {
    const box = root.querySelector('#rs-box'); if (!box) return;
    const draw = () => { box.innerHTML = rsSet(rs, '', env); };
    const make = t => t === 'date' ? { t, dir: 'from', at: now() } : t === 'grade' ? { t, item: env.gradable[0]?.id || '', min: 50, max: null }
      : t === 'profile' ? { t, field: 'cls', val: env.classes[0]?.id || '' } : t === 'group' ? { t, gid: env.groups[0]?.id || '' } : { t: 'set', op: 'all', list: [] };
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ra != null) { box.querySelector(`[data-pick="${b.dataset.ra}"]`).hidden = false; return; }
      if (b.dataset.raX != null) { box.querySelector(`[data-pick="${b.dataset.raX}"]`).hidden = true; return; }
      if (b.dataset.rtAdd) { node(rs, b.dataset.at).list.push(make(b.dataset.rtAdd)); draw(); return; }
      if (b.dataset.rx != null) { const parts = b.dataset.rx.split('.'), i = +parts.pop(); node(rs, parts.join('.')).list.splice(i, 1); draw(); }
    });
    box.addEventListener('change', e => {
      const t = e.target;
      const m = t.id && t.id.match(/^rs([\d_]+)-d$/);
      if (m) { const c = node(rs, m[1].replace(/_/g, '.')); c.at = t.value + c.at.slice(10); return; }
      const p = t.dataset.rp, k = t.dataset.rk; if (p == null || !k) return;
      const c = node(rs, p);
      if (k === 'neg') c.neg = !!t.value;
      else if (k === 'time') c.at = c.at.slice(0, 11) + (t.value || '00:00');
      else if (k === 'minOn' || k === 'maxOn') { const f = k.slice(0, 3); c[f] = t.checked ? (num(t.nextElementSibling.value) || 0) : null; }
      else if (k === 'min' || k === 'max') { if (c[k] != null || t.value) c[k] = t.value === '' ? null : num(t.value); draw(); }
      else { c[k] = t.value; if (k === 'field') { c.val = t.value === 'cls' ? env.classes[0]?.id || '' : ''; draw(); } }
    });
    root.querySelector('[data-rs-group]')?.addEventListener('click', () => {
      if (!env.groups.length) { UI.toast('اول در زبانهٔ «گروه‌ها» گروه بسازید.'); return; }
      rs.list.push(make('group')); draw(); root.querySelector('#rs-box').closest('details').open = true;
    });
    draw();
  }
  // env: { now, s (student), pct(itemId) → percent or null, inGroup(gid) }
  function evalCond(c, env) {
    let ok;
    if (c.t === 'date') ok = c.dir === 'from' ? env.now >= c.at : env.now < c.at;
    else if (c.t === 'grade') { const p = env.pct(c.item); ok = p != null && (c.min == null || p >= c.min) && (c.max == null || p < c.max); }
    else if (c.t === 'profile') ok = c.field === 'cls' ? env.s.cls === c.val : String(env.s.name).includes(c.val || '');
    else if (c.t === 'group') ok = env.inGroup(c.gid);
    else ok = evalSet(c, env);
    return c.neg ? !ok : ok;
  }
  const evalSet = (set, env) => !set?.list?.length || (set.op === 'any' ? set.list.some(c => evalCond(c, env)) : set.list.every(c => evalCond(c, env)));
  // The «در دسترس نیست مگر…» text a student sees.
  function describe(set, names) {
    const one = c => {
      let t;
      if (c.t === 'date') t = c.dir === 'from' ? `از ${fdt(c.at)}` : `تا پیش از ${fdt(c.at)}`;
      else if (c.t === 'grade') t = `در «${names.item(c.item)}» ${c.min != null ? `دست‌کم ${fa(c.min)}٪` : ''}${c.min != null && c.max != null ? ' و ' : ''}${c.max != null ? `کمتر از ${fa(c.max)}٪` : ''}${c.min == null && c.max == null ? 'نمره‌ای' : ''} بگیرید`;
      else if (c.t === 'profile') t = c.field === 'cls' ? `کلاس شما «${names.cls(c.val)}» باشد` : `نام شما «${c.val}» را داشته باشد`;
      else if (c.t === 'group') t = `عضو گروه «${names.group(c.gid)}» باشید`;
      else t = `(${describe(c, names)})`;
      return c.neg ? `نه: ${t}` : t;
    };
    return set.list.map(one).join(set.op === 'any' ? ' یا ' : ' و ');
  }

  /* ---------- activity completion ---------- */
  // caps lists what this kind of item can require: view, submit, grade, pass, minAtt, answer.
  const CAPS_L = { view: 'دانش‌آموز باید فعالیت را ببیند تا آن را تکمیل کند', submit: 'دانش‌آموزان برای تکمیل این فعالیت باید یک راه حل برای آن ارسال کنند',
    answer: 'دانش‌آموز باید به سؤال پاسخ دهد', grade: 'دانش‌آموزان باید یک نمره کسب کنند تا این فعالیت تکمیل شود', pass: 'دانش‌آموز باید نمرهٔ قبولی بگیرد' };
  function completion(cp, caps) {
    cp = cp || { mode: 'none' };
    return sec('«خاتمه یافتن» فعالیت‌ها', `<fieldset class="cr-fs"><legend class="sr-only">نوع خاتمه یافتن</legend>
      ${[['none', 'وضعیت «خاتمه یافته» بودن فعالیت را نشان نده'], ['manual', 'دانش‌آموزان می‌توانند به صورت دستی فعالیت را به عنوان «خاتمه یافته» علامت بزنند'], ['auto', 'هنگامی که شرایط محقق شد، فعالیت را به عنوان خاتمه یافته نشان بده']]
        .map(([k, l]) => `<label class="cr-chk"><input type="radio" name="cp-mode" value="${k}" ${(cp.mode || 'none') === k ? 'checked' : ''}> ${l}</label>`).join('')}</fieldset>
      <div class="cp-auto" ${cp.mode === 'auto' ? '' : 'hidden'}><p class="small muted" style="margin:8px 0 4px">فعالیت زمانی تکمیل می‌شود که دانش‌آموز همهٔ کارهای زیر را انجام دهد:</p>
        ${caps.map(k => k === 'minAtt' ? `<div class="cr-chk"><input type="checkbox" id="cp-minAttOn" aria-label="حداقل تعداد تلاش" ${cp.minAtt ? 'checked' : ''}> حداقل تعداد تلاش: <input class="input num sm" style="width:60px" id="cp-minAtt" value="${cp.minAtt || 1}" aria-label="تعداد تلاش"></div>`
          : chk('cp-' + k, cp[k], CAPS_L[k])).join('')}
        ${caps.includes('pass') ? chk('cp-passOrAll', cp.passOrAll, 'یا همهٔ تلاش‌های مجاز تمام شده باشد') : ''}</div>
      ${row('انتظار می‌رود در تاریخ روبرو تکمیل شود', dt('cp-exp', cp.expect, 'تاریخ مورد انتظار تکمیل'))}`, false);
  }
  function readCompletion(root, caps) {
    const mode = root.querySelector('input[name=cp-mode]:checked')?.value || 'none';
    const cp = { mode, expect: readDt(root, 'cp-exp') };
    if (mode === 'auto') caps.forEach(k => { cp[k] = k === 'minAtt' ? (on(root, 'cp-minAttOn') ? Math.max(1, num(v(root, 'cp-minAtt')) || 1) : 0) : on(root, 'cp-' + k); });
    if (mode === 'auto' && caps.includes('pass')) cp.passOrAll = on(root, 'cp-passOrAll');
    return cp;
  }
  const tags = it => sec('برچسب‌ها', row('برچسب‌ها', `<input class="input" id="c-tags" value="${esc((it.tags || []).join('، '))}" placeholder="مثلاً فصل ۲، تمرین">`, 'با ویرگول جدا کنید.', 'c-tags'), false);
  const readTags = root => v(root, 'c-tags').split(/[،,]/).map(s => s.trim()).filter(Boolean);

  // Wires one settings form: rich editors, date toggles, «باز/جمع شدن همه», the completion radios.
  function wire(root) {
    let range = null;
    root.addEventListener('mousedown', e => { if (e.target.closest('.rt-b')) e.preventDefault(); });
    root.addEventListener('click', e => {
      const b = e.target.closest('.rt-b'), ok = e.target.closest('[data-rt-ok]'), all = e.target.closest('[data-cr-all]');
      if (b) {
        const ed = root.querySelector('#' + b.dataset.for); ed.focus();
        if (b.dataset.rt === 'createLink') { const s = getSelection(); range = s.rangeCount ? s.getRangeAt(0).cloneRange() : null; const box = b.closest('.rt').querySelector('.rt-link'); box.hidden = false; box.querySelector('input').focus(); return; }
        document.execCommand(b.dataset.rt, false, null); return;
      }
      if (ok) {
        const box = ok.closest('.rt-link'), url = box.querySelector('input').value.trim(), ed = root.querySelector('#' + ok.dataset.rtOk);
        if (!/^https?:\/\/\S+$/i.test(url)) { UI.invalid(box.querySelector('input'), 'نشانی باید با http:// یا https:// شروع شود.'); return; }
        ed.focus(); if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
        if (getSelection().isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>`); else document.execCommand('createLink', false, url);
        box.hidden = true; box.querySelector('input').value = ''; return;
      }
      if (all) { const open = all.dataset.crAll === 'open'; root.querySelectorAll('.cr-sec').forEach(d => { d.open = open; }); all.dataset.crAll = open ? 'close' : 'open'; all.textContent = open ? 'جمع شدن همه' : 'باز شدن همه'; }
    });
    root.addEventListener('input', e => { const ed = e.target.closest('.rt-ed'); if (ed) { const w = root.querySelector(`[data-wc="${ed.id}"]`); if (w) w.textContent = `${fa(words(ed.innerHTML))} واژه`; } });
    root.addEventListener('change', e => {
      if (e.target.matches('[data-dt-on]')) e.target.closest('.cr-dt').classList.toggle('off', !e.target.checked);
      if (e.target.name === 'cp-mode') root.querySelector('.cp-auto').hidden = e.target.value !== 'auto';
    });
  }
  const frame = (title, body) => `<div class="spread"><h2>${title}</h2><button type="button" class="btn sm" data-cr-all="open">باز شدن همه</button></div>${body}`;

  return { digits, now, fdt, span, clean, plain, words, rich, readRich, show, row, sel, yn, chk, sec, v, on, num, dt, readDt, readFiles, kb, ext, fileLink,
    filesField, readFilesField, common, readCommon, restrict, wireRestrict, evalSet, describe, completion, readCompletion, tags, readTags, wire, frame, VIS, GMODE };
})();
