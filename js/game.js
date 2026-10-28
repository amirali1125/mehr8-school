// «دهکده دانش», the school's own learning game (games/dehkadeh, grades 7–9), shown inside the platform.
// The game reads window.SchoolBridgeInfo() and lets the signed-in person in without a second sign-in (see the bridge at
// the end of the game file): students play, the principal, guidance teachers and teachers enter as game admins, parents
// see their child's progress read-only.
const Game = ctx => {
  const { esc } = UI, D = SchoolData;
  const URL_ = 'games/dehkadeh/index.html';
  const GRADES = [7, 8, 9];
  window.SchoolBridgeInfo = () => {
    const me = Auth.user() || {}, r = ctx.role(), s = ctx.sid?.() && ctx.student(ctx.sid());
    // Every grade 7–9 student of the school, so the game's leaderboards, clans and admin panel show the real classmates.
    const sc = ctx.school(), roster = D.gradesOf(sc).filter(g => GRADES.includes(g)).flatMap(g => { const x = D.get(sc.id, g);
      return x.students.map(st => ({ key: `${sc.id}:st:${g}:${st.id}`, username: `${sc.id}-${g}-${st.id}`.toLowerCase(), name: st.name, grade: g, cls: (x.classes.find(c => c.id === st.cls) || {}).name || '' })); });
    return { school: sc.id, roster, role: r, name: me.owner ? 'مالک سامانه' : [me.salute, me.name].filter(Boolean).join(' ') || r, grade: ctx.grade?.() ?? me.grade, sid: s?.id, studentName: s?.name };
  };
  const intro = {
    student: 'درس‌های امسال را در دهکده بازی کن: هر ساختمان یک درس است. پیشرفتت را معلم راهنما، مدیر و خانواده‌ات می‌بینند.',
    parent: 'پیشرفت فرزندتان در بازی آموزشی مدرسه، فقط برای دیدن.',
    principal: 'شما با حساب مدیر وارد بازی می‌شوید: همهٔ پایه‌ها، همهٔ دانش‌آموزان، قبیله‌ها و تنظیمات.',
    counselor: 'با حساب مدیر بازی وارد می‌شوید تا پیشرفت دانش‌آموزان را ببینید و قبیله‌ها را بسازید.',
    teacher: 'با حساب مدیر بازی وارد می‌شوید تا پیشرفت دانش‌آموزان را ببینید.',
  };
  function game() {
    const r = ctx.role(), g = ctx.grade?.();
    if (['student', 'parent'].includes(r) && !GRADES.includes(+g)) return `<div class="card empty-state">${ctx.empty('«دهکده دانش» فعلاً برای پایه‌های هفتم، هشتم و نهم ساخته شده است.')}</div>`;
    return `<div class="card game-bar"><p class="muted" style="margin:0">${esc(intro[r] || '')}</p>
        <div class="row"><button class="btn" data-act="gm-full">تمام‌صفحه</button></div></div>
      <div class="game-wrap"><iframe id="game-frame" class="game-frame" src="${URL_}" title="بازی دهکده دانش" allow="fullscreen; autoplay" allowfullscreen></iframe></div>`;
  }
  const act = { 'gm-full': () => { const f = document.getElementById('game-frame'); (f.requestFullscreen || f.webkitRequestFullscreen)?.call(f); } };
  return { pages: { game }, act, bind: () => {} };
};
