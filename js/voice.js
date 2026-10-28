// Speech to text for any textarea: Voice.button('textarea-id') draws the control.
// Uses the browser's own recogniser (Web Speech API, Persian «fa-IR»). In Chrome and Edge the audio is
// sent to the browser maker's servers to be transcribed, so the button says so; nothing is stored by us.
const Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MIC = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></svg>';
  let rec = null, btn = null;

  // Adds the control under every textarea in root that has an id and no control yet (skip with data-novoice).
  function auto(root) {
    root.querySelectorAll('textarea[id]:not([data-novoice]):not(.desc-in)').forEach(t => {
      if (root.querySelector(`[data-voice="${t.id}"]`) || document.querySelector(`[data-voice="${t.id}"]`)) return;
      (t.closest('.field') || t).insertAdjacentHTML('afterend', button(t.id));
    });
  }
  const button = target => `<div class="voice-row"><button type="button" class="btn sm voice" data-voice="${target}" aria-pressed="false">${MIC}<span>تبدیل صوت به متن</span></button>
    <span class="muted small">${SR ? 'صدا برای تبدیل به متن به سرور مرورگر فرستاده می‌شود.' : 'این مرورگر پشتیبانی نمی‌کند؛ Chrome یا Edge را امتحان کنید.'}</span></div>`;

  function stop() { if (rec) { rec.stop(); } }
  function reset() {
    if (btn) { btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); btn.querySelector('span').textContent = 'تبدیل صوت به متن'; }
    rec = null; btn = null;
  }
  function start(b) {
    const area = document.getElementById(b.dataset.voice); if (!area) return;
    if (!SR) { UI.toast('این مرورگر تبدیل صوت به متن ندارد؛ Chrome یا Edge را امتحان کنید.'); return; }
    rec = new SR(); btn = b;
    rec.lang = 'fa-IR'; rec.continuous = true; rec.interimResults = true;
    const base = area.value.trim();
    let finals = '';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += (finals ? ' ' : '') + t.trim(); else interim += t;
      }
      area.value = [base, finals, interim.trim()].filter(Boolean).join(' ');
    };
    rec.onerror = e => {
      UI.toast(e.error === 'not-allowed' ? 'اجازهٔ میکروفون داده نشد.' : e.error === 'network' ? 'تبدیل صوت به اینترنت نیاز دارد.' : 'تبدیل صوت متوقف شد.');
    };
    rec.onend = () => { area.dispatchEvent(new Event('input', { bubbles: true })); reset(); };
    try { rec.start(); } catch (err) { reset(); return; }
    b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'در حال شنیدن… (برای پایان بزنید)';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-voice]'); if (!b) return;
    if (rec && btn === b) { stop(); return; }
    if (rec) stop();
    start(b);
  });
  return { button, stop, supported: !!SR, auto };
})();
