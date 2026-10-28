// Sign-in for the prototype. Each school keeps its own accounts (org.users); a person has one or more roles and
// switches only between their own. The owner signs in to the owner panel and may preview any school in any role.
// Demo accounts have no password and sign in with one click from login.html, for sales demos; the owner can turn
// them off. Passwords are stored as salted SHA-256. This is all in the browser: a real deployment must check
// sign-in on a server, because anyone can edit localStorage.
const Auth = (() => {
  const KEY = 'sp-auth';
  const SCHOOL_ROLES = ['principal', 'deputy', 'exec', 'nazem', 'counselor', 'teacher', 'finance', 'student', 'parent'];
  // Students and parents see one student only: the account's sid (and grade).
  const FAMILY = ['student', 'parent'];
  const ROLE_NAME = { owner: 'مالک سامانه', principal: 'مدیر مدرسه', deputy: 'معاون آموزشی', exec: 'معاون اجرایی', nazem: 'ناظم', counselor: 'معلم راهنما', teacher: 'معلم', finance: 'واحد مالی', student: 'دانش‌آموز', parent: 'ولی دانش‌آموز' };
  const session = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const setSession = s => { try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };

  // Demo accounts, made once per school: one per role and grade, plus one person with two roles.
  function users(schoolId) {
    const o = SchoolData.org(schoolId);
    // Made first, so a new browser gets the named accounts below on its very first visit.
    if (!o.users) {
      const s = Store.school(schoolId), gs = SchoolData.gradesOf(s), tg = SchoolData.teacherGrade(s);
      const u = (id, name, roles, grade, salute = '') => ({ id, name, salute, username: id, roles, grade: grade || null, pass: null, demo: true, active: true });
      o.users = [
        u('principal', schoolId === 'mehr8' ? 'کبریایی' : 'مدیر مدرسه', ['principal'], null, schoolId === 'mehr8' ? 'جناب آقای' : ''),
        u('deputy', 'معاون آموزشی', ['deputy']),
        u('exec', 'معاون اجرایی', ['exec']),
        u('finance', 'کارشناس واحد مالی', ['finance']),
        u('nazem', 'ناظم', ['nazem']),
        ...gs.map(g => u(`counselor${g}`, `معلم راهنمای پایهٔ ${SchoolData.GRADE_NAME[g]}`, ['counselor'], g)),
        u('teacher', 'معلم ریاضی', ['teacher']),
        u('teacher-counselor', `معلم ریاضی و معلم راهنمای پایهٔ ${SchoolData.GRADE_NAME[tg]}`, ['teacher', 'counselor'], tg),
        ...familyDemo(schoolId),
      ];
      SchoolData.save();
    }
    // Accounts made before salutations existed: the pilot school's principal gets a name and salutation.
    // The ناظم role came later: add its demo account once.
    if (o.users && !o.users.some(x => x.id === 'nazem')) { o.users.splice(4, 0, { id: 'nazem', name: 'ناظم', salute: '', username: 'nazem', roles: ['nazem'], grade: null, pass: null, demo: true, active: true }); SchoolData.save(); }
    // Student and parent came later: one demo pair, linked to the first student of the guidance teacher's grade.
    if (o.users && !o.users.some(x => x.id === 'student')) { o.users.push(...familyDemo(schoolId)); SchoolData.save(); }
    if (o.users && !o.usersV2) { const p = o.users.find(x => x.id === 'principal' && x.demo); if (p && schoolId === 'mehr8' && p.name === 'مدیر مدرسه') { p.name = 'مؤمنی'; p.salute = 'جناب آقای'; } o.usersV2 = true; SchoolData.save(); }
    // Mehr-e Hashtom's guidance teachers by name (6 Aban 1405). This step once made Momeni both principal and grade 9's
    // guidance teacher and switched off the separate grade-9 accounts; usersV4 below undoes that.
    if (o.users && !o.usersV3 && schoolId === 'mehr8' && typeof GUIDE_MEHR8 !== 'undefined') {
      o.users.forEach(x => { const g = x.demo && /^counselor\d+$/.test(x.id) ? +x.id.slice(9) : 0;
        if (g && GUIDE_MEHR8[g] && x.name.startsWith('معلم راهنمای پایهٔ')) x.name = GUIDE_MEHR8[g]; });
      const p = o.users.find(x => x.id === 'principal' && x.demo);
      if (p && !p.roles.includes('counselor')) { p.roles = [...p.roles, 'counselor']; p.grade = 9; }
      o.users.filter(x => x.demo && ['counselor9', 'teacher-counselor'].includes(x.id)).forEach(x => { x.active = false; });
      o.usersV3 = true; SchoolData.save();
    }
    // 7 Aban 1405: the principal is Kebriyaei; Momeni is only grade 9's guidance teacher, on his own account again.
    if (o.users && !o.usersV4 && schoolId === 'mehr8') {
      const p = o.users.find(x => x.id === 'principal' && x.demo);
      if (p) { p.name = 'کبریایی'; p.salute = 'جناب آقای'; p.roles = ['principal']; p.grade = null; }
      const c = o.users.find(x => x.id === 'counselor9' && x.demo);
      if (c) { c.name = 'مؤمنی'; c.salute = 'جناب آقای'; c.active = true; }
      o.usersV4 = true; SchoolData.save();
    }
    // 7 Aban 1405: the staff by name, each «جناب آقای»; the guidance teachers too.
    if (o.users && !o.usersV5 && schoolId === 'mehr8') {
      const NAMES = { deputy: 'سلماسی', exec: 'رادمنش', nazem: 'صبوری', finance: 'فلاح‌پور' };
      o.users.filter(x => x.demo).forEach(x => {
        if (NAMES[x.id]) x.name = NAMES[x.id];
        if (NAMES[x.id] || (x.roles.includes('counselor') && !x.name.startsWith('معلم'))) x.salute = 'جناب آقای';
      });
      o.usersV5 = true; SchoolData.save();
    }
    // The demo teacher is the grade's math teacher in the timetable, so «آینهٔ تدریس» and the self-assessment open as his.
    if (o.users && !o.usersV6 && schoolId === 'mehr8') {
      const t = o.users.find(x => x.demo && x.id === 'teacher'); if (t && t.name === 'معلم ریاضی') { t.name = 'کاروان'; t.salute = 'جناب آقای'; }
      o.usersV6 = true; SchoolData.save();
    }
    return o.users;
  }
  function familyDemo(schoolId) {
    const s = Store.school(schoolId), g = SchoolData.teacherGrade(s), x = SchoolData.get(schoolId, g), st = x.students.find(y => y.cls === x.classes[0]?.id) || x.students[0];
    if (!st) return [];
    const u = (id, name, roles) => ({ id, name, salute: '', username: id, roles, grade: g, sid: st.id, pass: null, demo: true, active: true });
    return [u('student', `دانش‌آموز نمونهٔ پایهٔ ${SchoolData.GRADE_NAME[g]}`, ['student']), u('parent', `ولی دانش‌آموز نمونهٔ پایهٔ ${SchoolData.GRADE_NAME[g]}`, ['parent'])];
  }
  const demoOn = () => Store.state.demoLogin !== false;

  // The signed-in person, or null. The owner gets every role.
  function user() {
    const s = session(); if (!s) return null;
    if (s.owner) return { id: 'owner', name: 'مالک سامانه', roles: ['owner', ...SCHOOL_ROLES], owner: true, school: null };
    if (!Store.school(s.school)) return null;
    const u = users(s.school).find(x => x.id === s.uid && x.active !== false);
    if (!u || (u.demo && !u.pass && !demoOn())) return null;
    return { ...u, school: s.school };
  }
  const roles = () => (user()?.roles || []).filter(r => SCHOOL_ROLES.includes(r));

  async function hash(salt, pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + pw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function makePass(pw) { const salt = crypto.getRandomValues(new Uint32Array(2)).join('-'); return { salt, hash: await hash(salt, pw) }; }

  // Returns an error message, or '' on success.
  async function login(schoolId, username, pw) {
    const u = users(schoolId).find(x => x.username === username.trim() && x.active !== false);
    if (!u || !u.pass || await hash(u.pass.salt, pw) !== u.pass.hash) return 'نام کاربری یا رمز درست نیست.';
    setSession({ school: schoolId, uid: u.id }); return '';
  }
  async function ownerLogin(pw) {
    const p = Store.state.ownerPass;
    if (p ? await hash(p.salt, pw) !== p.hash : !demoOn()) return p ? 'رمز مالک درست نیست.' : 'ورود نمایشی خاموش است و رمز مالک تعیین نشده.';
    setSession({ owner: true }); return '';
  }
  function demoLogin(schoolId, uid) {
    if (!demoOn()) return false;
    if (uid === 'owner') { if (Store.state.ownerPass) return false; setSession({ owner: true }); return true; }
    const u = users(schoolId).find(x => x.id === uid && x.demo && !x.pass); if (!u) return false;
    setSession({ school: schoolId, uid }); return true;
  }
  function logout() { setSession(null); location.href = 'login.html'; }

  // Pages call this first; it sends a signed-out visitor (or a non-owner on the owner panel) to the sign-in page.
  function require(kind) {
    const u = user();
    if (u && (kind !== 'owner' || u.owner)) return u;
    location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash));
    return null;
  }
  return { SCHOOL_ROLES, FAMILY, ROLE_NAME, users, user, roles, login, ownerLogin, demoLogin, logout, require, makePass, demoOn };
})();
