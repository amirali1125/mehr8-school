// SMS to parents about a meeting (principal's family meetings, counsellor's family appointments).
// No SMS gateway is connected yet: messages wait in org.smsOutbox with their text and recipients,
// ready to be sent once the school's SMS panel is connected.
const Sms = (() => {
  const { esc, fa } = UI;
  const digits = x => String(x).replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]);
  const WD = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const weekday = iso => WD[(new Date(iso + 'T12:00:00').getDay() + 1) % 7];
  // The tick, the father/mother ticks (shown once it is on) and a preview of the text.
  function block(id, who = {}) {
    return `<div class="sms-box"><label class="share-line"><input type="checkbox" id="${id}-on"><span><b>ارسال پیامک به اولیا</b><span class="muted small"> · زمان، روز، تاریخ، موضوع و شرح جلسه</span></span></label>
      <div class="sms-more" hidden><fieldset class="sms-who" style="border:0;padding:0;margin:6px 0 0"><legend class="small muted">به چه کسی؟</legend><div class="row">
        <label class="chip"><input type="checkbox" id="${id}-f" ${who.father !== false ? 'checked' : ''}>پدر</label><label class="chip"><input type="checkbox" id="${id}-m" ${who.mother ? 'checked' : ''}>مادر</label></div></fieldset>
        <p class="sms-prev small" id="${id}-prev" aria-live="polite"></p></div></div>`;
  }
  const text = ({ name, host, date, time, topic, desc }) =>
    `اولیای محترم ${name}، جلسه با ${host} مدرسه در روز ${weekday(date)} ${JDate.format(date)} ساعت ${digits(time || '')} برگزار می‌شود. موضوع: ${topic}.${desc ? ' ' + desc : ''}`;
  // Wires the block inside a dialog: shows the ticks when on and keeps the preview current from read().
  function wire(root, id, read) {
    const on = root.querySelector(`#${id}-on`), more = root.querySelector('.sms-more'), prev = root.querySelector(`#${id}-prev`);
    const draw = () => { more.hidden = !on.checked; if (on.checked) { const d = read(); prev.textContent = d ? text(d) : 'تاریخ، ساعت و موضوع را کامل کنید.'; } };
    on.onchange = draw; root.addEventListener('input', draw); root.addEventListener('change', draw);
    return {
      // null when off; otherwise the chosen parents, or an error shown on the ticks.
      who() {
        if (!on.checked) return null;
        const to = [root.querySelector(`#${id}-f`).checked && 'father', root.querySelector(`#${id}-m`).checked && 'mother'].filter(Boolean);
        if (!to.length) { UI.invalid(root.querySelector('.sms-who'), 'پدر یا مادر یا هر دو را برای پیامک تیک بزنید.'); return false; }
        return to;
      },
    };
  }
  function queue(org, to, d) {
    const o = org(); o.smsOutbox = o.smsOutbox || [];
    // The roster has one mobile number per family; separate numbers for father and mother can be added later.
    o.smsOutbox.push({ id: 's' + Date.now().toString(36), to, phone: d.phone || '', grade: d.grade, sid: d.sid, ref: d.ref, text: text(d), at: new Date().toISOString(), status: 'queued' });
    return `پیامک برای ${to.map(k => k === 'father' ? 'پدر' : 'مادر').join(' و ')}${d.phone ? '' : ' (شمارهٔ خانواده در فهرست نیست)'} در صف ارسال قرار گرفت؛ درگاه پیامک هنوز وصل نشده.`;
  }
  const sentTo = (org, ref) => (org().smsOutbox || []).filter(s => s.ref === ref).flatMap(s => s.to);
  return { block, wire, queue, sentTo, text };
})();
