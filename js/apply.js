// The applicant portal: people outside the school apply for a job (apply.html) or enrol a student (enroll.html,
// <body data-kind="enroll">; the student's national ID signs in, and the form goes to the admissions cartable in org.enrollApps).
// Sign-in is the national ID; the first time, the password is the national ID too and the account is made on the spot.
// The form is filled step by step, saved as a draft on every change, and sent once; then it is read only and
// appears in the principal's hiring cartable (stage «درخواست از سایت»). Kept in org.hireApps[nationalId].
// As with the rest of the prototype this lives in the browser; a real deployment checks sign-in on a server.
(() => {
  const { esc, fa, modal, close, toast } = UI, F = ApplyForm, $ = s => document.querySelector(s);
  const ENR = document.body.dataset.kind === 'enroll', S = ENR ? F.ENROLL : F.SECTIONS;
  const TXT = ENR ? { kind: 'ثبت‌نام دانش‌آموز', signin: 'ورود متقاضیان ثبت‌نام', nid: 'کد ملی دانش‌آموز', title: 'فرم ثبت‌نام دانش‌آموز', who: 'متقاضی ثبت‌نام' }
    : { kind: 'درخواست همکاری', signin: 'ورود متقاضیان همکاری', nid: 'کد ملی', title: 'فرم اطلاعات متقاضیان همکاری', who: 'متقاضی' };
  const KEY = ENR ? 'sp-enroll' : 'sp-apply', MAX = 2 * 1024 * 1024;
  const session = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const setSession = v => { try { v ? sessionStorage.setItem(KEY, JSON.stringify(v)) : sessionStorage.removeItem(KEY); } catch (e) { /* blocked */ } };
  const apps = sid => { const o = SchoolData.org(sid); return ENR ? (o.enrollApps = o.enrollApps || {}) : (o.hireApps = o.hireApps || {}); };
  const me = () => { const s = session(); return s && apps(s.school)[s.nid] ? { s, a: apps(s.school)[s.nid] } : null; };
  const save = () => SchoolData.save();
  async function hash(salt, pw) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + pw)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const state = { step: 0, saved: '' };
  const brand = () => { const s = Store.school(session()?.school || Shell.pref().school) || Store.state.schools[0];
    $('#ap-brand').innerHTML = `${Shell.logoImg(s, 'ap-logo')}<b>${esc(s.name)}</b><span class="muted small">${TXT.kind}</span>`; };

  /* ---------------- sign-in ---------------- */
  function signin() {
    const schools = Store.state.schools.filter(s => !s.sample), pref = Shell.pref().school;
    $('#ap-who').innerHTML = '';
    $('#view').innerHTML = `<section class="card ap-signin" aria-labelledby="si-t"><h1 id="si-t">${TXT.signin}</h1>
      <p class="muted">با ${TXT.nid} وارد شوید. <b>بار اول، رمز همان کد ملی شماست</b> و حسابتان با همین ورود ساخته می‌شود.</p>
      <form id="si" novalidate>${schools.length > 1 ? `<label class="field"><span>مدرسه</span><select class="input" id="si-s">${schools.map(s => `<option value="${s.id}" ${s.id === pref ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>` : `<input type="hidden" id="si-s" value="${schools[0]?.id || 'mehr8'}">`}
        <label class="field"><span>${TXT.nid}</span><input class="input num" id="si-n" inputmode="numeric" autocomplete="username" dir="ltr" maxlength="10" placeholder="۱۰ رقم"></label>
        <label class="field"><span>رمز عبور</span><input class="input" id="si-p" type="password" autocomplete="current-password" dir="ltr"></label>
        <button class="btn primary login-btn" type="submit">ورود</button></form>
      <p class="muted small" style="margin-top:12px">همکاران فعلی مدرسه از <a href="login.html">صفحهٔ ورود سامانه</a> وارد شوند.</p></section>`;
    $('#si').onsubmit = async e => {
      e.preventDefault();
      const sid = $('#si-s').value, nid = F.normDigits($('#si-n').value), pw = F.normDigits($('#si-p').value);
      if (!F.validNid(nid)) return UI.invalid('#si-n', 'کد ملی درست نیست؛ ۱۰ رقم را دوباره بررسی کنید.');
      if (!pw) return UI.invalid('#si-p', 'رمز عبور را بنویسید (بار اول همان کد ملی).');
      const all = apps(sid); let a = all[nid];
      if (!a) {
        if (pw !== nid) return UI.invalid('#si-p', 'برای ورود اول، رمز همان کد ملی است.');
        const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
        a = all[nid] = { nid, pass: { salt, hash: await hash(salt, pw) }, created: new Date().toISOString(), status: 'draft', form: { [S[0].id]: {} } }; save();
      } else if (await hash(a.pass.salt, pw) !== a.pass.hash) { $('#si-p').value = ''; return UI.invalid('#si-p', 'رمز درست نیست.'); }
      setSession({ school: sid, nid }); Shell.setPref({ school: sid }); state.step = a.step || 0; render();
    };
  }

  /* ---------------- the form ---------------- */
  const fieldId = k => 'ap-' + k;
  function input(f, val) {
    const [k, label, type, o = {}] = f, id = fieldId(k), req = o.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
    const wrap = inner => `<div class="field ${o.wide ? 'wide' : ''}"><span>${esc(label)}${req}</span>${inner}</div>`;
    if (type === 'date') return wrap(JDate.field(id, val || '', label));
    if (type === 'select') return `<label class="field ${o.wide ? 'wide' : ''}"><span>${esc(label)}${req}</span><select class="input" id="${id}" data-k="${k}"><option value="">انتخاب کنید…</option>${o.opts.map(x => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
    if (type === 'yesno') return `<fieldset class="field seg-radio"><legend class="small muted">${esc(label)}</legend>${['بله', 'خیر'].map(x => `<label><input type="radio" name="${id}" value="${x}" data-k="${k}" ${x === val ? 'checked' : ''}><span>${x}</span></label>`).join('')}</fieldset>`;
    if (type === 'textarea') return `<label class="field wide"><span>${esc(label)}${req}</span><textarea class="input" id="${id}" data-k="${k}" rows="3">${esc(val || '')}</textarea></label>${Voice.button(id)}`;
    if (type === 'multi') return `<fieldset class="field wide"><legend class="small muted">${esc(label)}${req}</legend><div class="chips">${o.opts.map(x => `<label class="chip"><input type="checkbox" value="${esc(x)}" data-multi="${k}" ${(val || []).includes(x) ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div></fieldset>`;
    if (type === 'file') return `<div class="field ap-file"><span>${esc(label)}${req}</span>${val ? `<div class="ap-file-has">${F.show(f, val)}<button type="button" class="btn sm danger" data-del-file="${k}">حذف</button></div>` : ''}
      <label class="btn sm">${val ? 'جایگزینی' : '+ انتخاب فایل'}<input type="file" accept="${o.accept || 'image/*,.pdf'}" hidden data-file="${k}" aria-label="${esc(label)}"></label></div>`;
    return `<label class="field ${o.wide ? 'wide' : ''}"><span>${esc(label)}${req}</span><input class="input ${['num', 'tel'].includes(type) ? 'num' : ''}" id="${id}" data-k="${k}" ${type === 'num' ? 'inputmode="numeric"' : type === 'tel' ? 'inputmode="tel" dir="ltr"' : o.ltr ? 'dir="ltr"' : ''} value="${esc(val ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}></label>`;
  }
  // Reads the fields inside root into obj (files are written when chosen).
  function read(root, fields, obj) {
    fields.forEach(([k, , type]) => {
      if (type === 'file') return;
      if (type === 'multi') obj[k] = [...root.querySelectorAll(`[data-multi="${k}"]:checked`)].map(c => c.value);
      else if (type === 'yesno') obj[k] = root.querySelector(`input[name="${fieldId(k)}"]:checked`)?.value || '';
      else { const el = root.querySelector('#' + fieldId(k)); if (el) obj[k] = type === 'num' || type === 'tel' ? F.normDigits(el.value) : el.value.trim(); }
    });
    return obj;
  }
  // A step is ticked once it has content and nothing in it is missing.
  const done = (a, s) => !F.missing(a.form, S).some(m => m[0] === s.id) && (s.rows ? (a.form[s.id] || []).length >= (s.min || 1) : Object.values(a.form[s.id] || {}).some(v => v && v.length !== 0));
  function stamp(a) { a.updated = new Date().toISOString(); a.step = state.step; save(); state.saved = new Date().toTimeString().slice(0, 5); const el = $('#ap-saved'); if (el) el.textContent = `پیش‌نویس ذخیره شد · ${F.digits(state.saved)}`; }

  function page() {
    const { s, a } = me(), total = S.length;
    const p = a.form[S[0].id] || {};
    $('#ap-who').innerHTML = `<span class="small">${esc([p.first, p.last].filter(Boolean).join(' ') || TXT.who)} · ${TXT.nid} ${esc(F.digits(a.nid))}</span><button class="btn sm" id="ap-out">خروج</button>`;
    $('#ap-out').onclick = () => { setSession(null); render(); };
    if (a.status === 'sent') return sentPage(s, a);
    const step = Math.min(state.step, total), sec = S[step];
    const nav = `<nav class="ap-steps" aria-label="مراحل فرم"><ol>${S.map((x, i) => `<li><button type="button" class="${i === step ? 'on' : ''} ${done(a, x) ? 'ok' : ''}" data-go="${i}" ${i === step ? 'aria-current="step"' : ''}>
        <span class="n">${done(a, x) ? '✓' : fa(i + 1)}</span><span>${esc(x.title)}</span></button></li>`).join('')}
      <li><button type="button" class="${step === total ? 'on' : ''}" data-go="${total}" ${step === total ? 'aria-current="step"' : ''}><span class="n">${fa(total + 1)}</span><span>بازبینی و ارسال</span></button></li></ol></nav>`;
    const pct = Math.round(S.filter(x => done(a, x)).length / total * 100);
    let body;
    if (step === total) {
      const miss = F.missing(a.form, S);
      body = `<h2>بازبینی و ارسال</h2>${miss.length ? `<div class="note"><b>پیش از ارسال این موارد را کامل کنید:</b><ul class="ap-miss">${miss.map(([id, m]) => `<li><button type="button" class="link" data-go="${S.findIndex(x => x.id === id)}">${esc(S.find(x => x.id === id).title)}</button>: ${esc(m)}</li>`).join('')}</ul></div>`
        : '<p class="note ok-note">همه چیز کامل است. یک بار دیگر مرور کنید و فرم را بفرستید.</p>'}
        <div class="ap-review">${F.view(a.form, S)}</div>
        <p class="note small">پس از «تکمیل و ارسال فرم» امکان تغییر اطلاعات نیست. اگر هنوز کامل نیست، فقط از «ذخیرهٔ موقت» استفاده کنید.</p>`;
    } else if (sec.rows) {
      const rows = a.form[sec.id] || [];
      body = `<h2>${esc(sec.title)}</h2>${sec.desc ? `<p class="muted">${esc(sec.desc)}</p>` : ''}
        ${rows.length ? `<ul class="ap-rows">${rows.map((r, i) => `<li class="card"><div><b>${esc(F.digits(r[sec.fields[0][0]] || ''))}</b> <span class="muted small">${sec.fields.slice(1, 4).map(f => r[f[0]] ? esc(f[2] === 'date' ? JDate.format(r[f[0]]) : F.digits(r[f[0]])) : '').filter(Boolean).join(' · ')}</span></div>
            <div class="row"><button type="button" class="btn sm" data-row-edit="${i}">ویرایش</button><button type="button" class="btn sm danger" data-row-del="${i}">حذف</button></div></li>`).join('')}</ul>` : `<p class="muted">${sec.min ? 'هنوز موردی ثبت نشده.' : 'اگر موردی ندارید، به مرحلهٔ بعد بروید.'}</p>`}
        <button type="button" class="btn ap-add" data-row-new>+ ${esc(sec.add)}</button>`;
    } else {
      body = `<h2>${esc(sec.title)}</h2>${sec.desc ? `<p class="muted">${esc(sec.desc)}</p>` : ''}
        ${sec.notes ? `<details class="ap-notes" open><summary><b>شرایط عکس</b></summary><ul>${sec.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
        <div class="ap-grid" id="ap-sec">${sec.fields.filter(f => !(f[3]?.men && p.gender === 'زن')).map(f => input(f, (a.form[sec.id] || {})[f[0]])).join('')}</div>`;
    }
    $('#view').innerHTML = `<div class="ap-head"><div><h1>${TXT.title}</h1><span class="tag warn">در انتظار تکمیل</span> <span class="muted small" id="ap-saved">${state.saved ? `پیش‌نویس ذخیره شد · ${F.digits(state.saved)}` : 'هر تغییر خودکار ذخیره می‌شود'}</span></div>
        <div class="ap-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت فرم"><span class="bar"><i style="width:${pct}%"></i></span><b>${fa(pct)}٪</b></div></div>
      <div class="ap-layout">${nav}<section class="card ap-body">${body}</section></div>
      <div class="ap-bar"><button type="button" class="btn" data-go="${step - 1}" ${step === 0 ? 'disabled' : ''}>قبلی</button>
        <button type="button" class="btn" id="ap-save">ذخیرهٔ موقت</button>
        ${step === total ? '<button type="button" class="btn primary" id="ap-send">تکمیل و ارسال فرم</button>' : `<button type="button" class="btn primary" data-go="${step + 1}">بعدی</button>`}</div>`;
    Voice.auto($('#view'));
    wire(a, sec, step === total);
  }
  function wire(a, sec, review) {
    const v = $('#view');
    const keep = () => { if (sec && !sec.rows && !review) { const box = $('#ap-sec'); a.form[sec.id] = read(box, sec.fields, a.form[sec.id] || {}); } stamp(a); };
    if (sec && !sec.rows && !review) { v.oninput = e => { if (e.target.closest('#ap-sec')) keep(); }; v.onchange = e => { if (e.target.closest('#ap-sec') && !e.target.dataset.file) keep(); }; } else { v.oninput = v.onchange = null; }
    v.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (sec && !sec.rows && !review) keep(); state.step = Math.max(0, +b.dataset.go); a.step = state.step; save(); page(); scrollTo({ top: 0 }); });
    $('#ap-save').onclick = () => { keep(); toast('پیش‌نویس ذخیره شد؛ هر وقت برگردید از همین‌جا ادامه می‌دهید.'); };
    v.querySelectorAll('[data-file]').forEach(inp => inp.onchange = () => { const file = inp.files[0]; if (!file) return;
      if (file.size > MAX) { inp.value = ''; return toast('فایل بزرگ‌تر از ۲ مگابایت است؛ عکس کوچک‌تری انتخاب کنید.'); }
      if (inp.accept === 'image/jpeg' && !/^image\/jpe?g$/.test(file.type)) { inp.value = ''; return toast('این عکس باید با پسوند JPEG باشد.'); }
      const r = new FileReader(); r.onload = () => { keep(); (a.form[sec.id] = a.form[sec.id] || {})[inp.dataset.file] = { name: file.name, data: r.result }; stamp(a); page(); }; r.readAsDataURL(file); });
    v.querySelectorAll('[data-del-file]').forEach(b => b.onclick = () => { keep(); delete a.form[sec.id][b.dataset.delFile]; stamp(a); page(); });
    v.querySelector('[data-row-new]') && (v.querySelector('[data-row-new]').onclick = () => rowModal(a, sec, -1));
    v.querySelectorAll('[data-row-edit]').forEach(b => b.onclick = () => rowModal(a, sec, +b.dataset.rowEdit));
    v.querySelectorAll('[data-row-del]').forEach(b => b.onclick = async () => { if (!await UI.ask('حذف', 'این مورد حذف شود؟', 'حذف')) return; a.form[sec.id].splice(+b.dataset.rowDel, 1); stamp(a); page(); });
    const send = $('#ap-send'); if (send) send.onclick = () => submit(a);
  }
  // One row of a list section (family member, degree, job...) in a dialog.
  function rowModal(a, sec, i) {
    const r = i >= 0 ? a.form[sec.id][i] : {}, files = {};
    modal(`<h2>${esc(i >= 0 ? 'ویرایش' : sec.add)}</h2><div class="ap-grid">${sec.fields.map(f => input(f, r[f[0]])).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="save">${i >= 0 ? 'ذخیره' : 'افزودن'}</button><button class="btn" data-close>انصراف</button></div>`, root => {
      root.querySelectorAll('[data-file]').forEach(inp => inp.onchange = () => { const file = inp.files[0]; if (!file) return;
        if (file.size > MAX) { inp.value = ''; return toast('فایل بزرگ‌تر از ۲ مگابایت است.'); }
        const fr = new FileReader(); fr.onload = () => { files[inp.dataset.file] = { name: file.name, data: fr.result }; inp.closest('label').firstChild.textContent = '✓ ' + file.name; }; fr.readAsDataURL(file); });
      root.querySelectorAll('[data-del-file]').forEach(b => b.onclick = () => { files[b.dataset.delFile] = null; b.parentElement.remove(); });
      root.querySelector('#save').onclick = () => {
        const row = read(root, sec.fields, { ...r });
        Object.entries(files).forEach(([k, val]) => { if (val) row[k] = val; else delete row[k]; });
        const empty = sec.fields.find(f => f[3]?.req && !row[f[0]]);
        if (empty) return UI.invalid(root.querySelector('#' + fieldId(empty[0])) || root.querySelector(`[name="${fieldId(empty[0])}"]`)?.closest('fieldset'), `«${empty[1]}» را کامل کنید.`);
        if (row.phone && sec.id === 'refs' && !/^0\d{9,10}$/.test(row.phone)) return UI.invalid('#ap-phone', 'شمارهٔ تلفن درست نیست.');
        a.form[sec.id] = a.form[sec.id] || []; if (i >= 0) a.form[sec.id][i] = row; else a.form[sec.id].push(row);
        stamp(a); close(); page();
      };
    });
  }
  async function submit(a) {
    const miss = F.missing(a.form, S);
    if (miss.length) { state.step = S.findIndex(x => x.id === miss[0][0]); page(); return toast('فرم هنوز کامل نیست؛ موارد خواسته‌شده را کامل کنید.'); }
    if (!await UI.ask('ارسال فرم', 'پس از ارسال امکان تغییر اطلاعات نیست. فرم فرستاده شود؟', 'تکمیل و ارسال')) return;
    const { s } = me(), o = SchoolData.org(s.school), p = a.form.personal;
    if (ENR) {
      // Into the admissions cartable (stage «درخواست از سایت»).
      const st = a.form.student, fa_ = a.form.father || {}, gi = ['هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'].indexOf(st.grade);
      o.applicants = o.applicants || [];
      const e = { id: 'p' + Date.now().toString(36), name: `${st.first} ${st.last}`, grade: gi + 7, parent: [fa_.first, fa_.last || st.last].filter(Boolean).join(' '), phone: F.normDigits(fa_.mobile || a.form.mother?.mobile || ''),
        stage: 'new', date: new Date().toISOString().slice(0, 10), source: 'portal', nid: a.nid, history: [{ at: new Date().toISOString().slice(0, 16), by: 'portal', text: 'ارسال فرم ثبت‌نام از پورتال' }] };
      o.applicants.push(e);
      Object.assign(a, { status: 'sent', sentAt: new Date().toISOString(), appId: e.id }); save(); page(); scrollTo({ top: 0 }); return;
    }
    // Into the principal's hiring cartable.
    o.hire = o.hire || { applicants: [] };
    const h = { id: 'h' + Date.now().toString(36), name: `${p.first} ${p.last}`, position: (a.form.interest?.areas || []).join('، ') || 'همکاری', phone: p.phone, date: new Date().toISOString().slice(0, 10), stage: 'new', source: 'portal', nid: a.nid, history: [] };
    o.hire.applicants.push(h);
    Object.assign(a, { status: 'sent', sentAt: new Date().toISOString(), hireId: h.id }); save(); page(); scrollTo({ top: 0 });
  }
  const STAGE = { new: 'دریافت شد؛ در انتظار بررسی', meeting: 'دعوت به جلسه', review: 'در حال بررسی', finance: 'در حال بررسی نهایی', approved: 'پذیرفته شد', rejected: 'نتیجه: پذیرفته نشد' };
  const ESTAGE = { new: 'دریافت شد؛ در انتظار بررسی', meeting: 'دعوت به جلسه با خانواده', exam: 'دعوت به آزمون ورودی', passed: 'قبول در آزمون ورودی', family: 'در حال بررسی', finance: 'در حال بررسی نهایی', final: 'پذیرفته شد', rejected: 'نتیجه: پذیرفته نشد' };
  function sentPage(s, a) {
    if (ENR) {
      const e = (SchoolData.org(s.school).applicants || []).find(x => x.id === a.appId);
      $('#view').innerHTML = `<section class="card ap-sent"><h1>فرم ثبت‌نام فرستاده شد</h1><p>از اعتماد شما سپاسگزاریم. وضعیت: <span class="tag ${e?.stage === 'final' ? 'ok' : e?.stage === 'rejected' ? 'bad' : 'blue'}">${esc(ESTAGE[e?.stage] || 'دریافت شد')}</span></p>
          ${['meeting', 'exam'].includes(e?.stage) && (e.meetAt || e.examAt) ? `<p>زمان: <b>${esc(JDate.format((e.examAt || e.meetAt).slice(0, 10)))} ساعت ${esc(F.digits((e.examAt || e.meetAt).slice(11, 16)))}</b></p>` : ''}
          <p class="muted small">تاریخ ارسال: ${esc(JDate.format(a.sentAt.slice(0, 10)))}</p></section>
        <div class="ap-review">${F.view(a.form, S)}</div>`;
      return;
    }
    const h = SchoolData.org(s.school).hire?.applicants.find(x => x.id === a.hireId);
    $('#view').innerHTML = `<section class="card ap-sent"><h1>فرم شما فرستاده شد</h1><p>از علاقهٔ شما به همکاری سپاسگزاریم. وضعیت درخواست: <span class="tag ${h?.stage === 'approved' ? 'ok' : h?.stage === 'rejected' ? 'bad' : 'blue'}">${esc(STAGE[h?.stage] || 'دریافت شد')}</span></p>
        ${h?.stage === 'meeting' && h.meetAt ? `<p>زمان جلسه: <b>${esc(JDate.format(h.meetAt.slice(0, 10)))} ساعت ${esc(F.digits(h.meetAt.slice(11, 16)))}</b></p>` : ''}
        <p class="muted small">تاریخ ارسال: ${esc(JDate.format(a.sentAt.slice(0, 10)))}</p></section>
      <div class="ap-review">${F.view(a.form)}</div>`;
  }
  // Coming back (or reloading) opens the step the applicant was on.
  function render() { brand(); const m = me(); if (m && state.step === 0) state.step = m.a.step || 0; m ? page() : signin(); }
  render();
})();
