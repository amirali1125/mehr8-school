// The school bell's sounds, ported from the school's own desktop app («سامانه هوشمند زنگ مدرسه», src/utils/audioPlayer.ts):
//   sound1 = the gentle C-major chime of متوسطه اول, sound2 = the warm F–A–G–C chime of متوسطه دوم,
//   seq = sound1 then sound2 (the shared bells), rabbana = the recorded «ربنا» (assets/audio/rabbana.mp3), custom = a file URL.
// The notes, envelopes and filters are the app's; only the React/TypeScript shell around them is gone.
// BellAudio.on(cb) reports (playing, type, secondsLeft) once a second while something plays.
const BellAudio = (() => {
  let ctx = null, master = null, sources = [], el = null, timer = null, volume = 0.9;
  const subs = new Set();
  const notify = (on, type, left) => subs.forEach(cb => cb(on, type, left));

  function init() {
    if (!ctx || ctx.state === 'closed') {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.setValueAtTime(volume * 1.5, ctx.currentTime);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-14, ctx.currentTime); comp.knee.setValueAtTime(10, ctx.currentTime); comp.ratio.setValueAtTime(4.5, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime); comp.release.setValueAtTime(0.2, ctx.currentTime);
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // Browsers start audio only after a click or key press; any one of them unlocks it for the rest of the visit.
  const unlocked = () => !!ctx && ctx.state === 'running';
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, () => { try { init(); } catch (er) { /* no audio */ } }, { passive: true }));

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (el) { const a = el; el = null; try { a.pause(); a.currentTime = 0; } catch (e) { /* detached */ } }
    sources.forEach(s => { try { if (s.stop) s.stop(); s.disconnect(); } catch (e) { /* already stopped */ } });
    sources = []; notify(false, null, 0);
  }
  function countdown(type, sec) {
    if (timer) clearInterval(timer);
    let left = Math.round(sec); notify(true, type, left);
    timer = setInterval(() => { left -= 1; if (left <= 0) stop(); else notify(true, type, left); }, 1000);
  }

  // متوسطه اول: soft attack, singing sustain, octave overtone, a little delay for continuity.
  function warmNote(c, freq, t0, dur, g = 0.52) {
    const end = t0 + dur;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(Math.min(2800, freq * 3.5), t0); filt.Q.setValueAtTime(0.7, t0);
    const vg = c.createGain(); vg.gain.setValueAtTime(0.0001, t0); vg.gain.linearRampToValueAtTime(g, t0 + 0.045);
    vg.gain.exponentialRampToValueAtTime(g * 0.45, t0 + 0.5); vg.gain.exponentialRampToValueAtTime(0.0008, end);
    const f = c.createOscillator(); f.type = 'sine'; f.frequency.setValueAtTime(freq, t0);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 2, t0);
    const og = c.createGain(); og.gain.setValueAtTime(0.22, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + Math.min(1.2, dur * 0.7));
    o.connect(og); og.connect(vg); f.connect(vg); vg.connect(filt); filt.connect(master);
    const dl = c.createDelay(); dl.delayTime.setValueAtTime(0.22, t0);
    const dg = c.createGain(); dg.gain.setValueAtTime(0.24, t0); dg.gain.exponentialRampToValueAtTime(0.001, end + 0.3);
    filt.connect(dl); dl.connect(dg); dg.connect(master);
    f.start(t0); o.start(t0); f.stop(end); o.stop(end); sources.push(f, o, vg);
  }
  // متوسطه دوم: velvety mallet attack with a deep sub-note under each chime.
  function velvetNote(c, freq, t0, dur, v = 0.58, sub) {
    const end = t0 + dur;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(2400, t0); filt.Q.setValueAtTime(0.65, t0);
    const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t0); ng.gain.linearRampToValueAtTime(v, t0 + 0.038);
    ng.gain.exponentialRampToValueAtTime(v * 0.44, t0 + 0.55); ng.gain.exponentialRampToValueAtTime(0.0005, end);
    const f = c.createOscillator(); f.type = 'sine'; f.frequency.setValueAtTime(freq, t0);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 2, t0);
    const og = c.createGain(); og.gain.setValueAtTime(0.28, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + Math.min(dur, 1.8));
    f.connect(ng); o.connect(og); og.connect(ng); f.start(t0); f.stop(end); o.start(t0); o.stop(end); sources.push(f, o);
    if (sub) {
      const s = c.createOscillator(); s.type = 'sine'; s.frequency.setValueAtTime(sub, t0);
      const sg = c.createGain(); sg.gain.setValueAtTime(v * 0.52, t0); sg.gain.exponentialRampToValueAtTime(0.0008, end);
      s.connect(sg); sg.connect(filt); s.start(t0); s.stop(end); sources.push(s);
    }
    ng.connect(filt); filt.connect(master); sources.push(ng);
  }
  const M1 = [[523.25, 0, 1.6, 0.55], [659.25, 0.55, 1.6, 0.52], [783.99, 1.1, 1.7, 0.56], [880, 1.7, 1.8, 0.6], [783.99, 2.3, 1.7, 0.54], [659.25, 2.9, 1.8, 0.54], [523.25, 3.5, 2.4, 0.62], [261.63, 3.5, 2.4, 0.4]];
  const M2 = [[349.23, 0, 2.3, 0.58, 174.61], [440, 1.05, 2.2, 0.56, 261.63], [392, 2.1, 2.2, 0.58, 293.66], [523.25, 3.15, 2.6, 0.65, 261.63], [392, 3.18, 2.6, 0.36]];
  const part = (c, notes, t0, dur, velvet) => notes.forEach(([f, t, d, v, s]) => {
    if (t < dur) { const nd = Math.min(d, dur - t + 0.6); velvet ? velvetNote(c, f, t0 + t, nd, v, s) : warmNote(c, f, t0 + t, nd, v); }
  });

  function file(url, type, fallbackSec) {
    try { init(); } catch (e) { /* the file can still play */ }
    const a = new Audio(url); a.volume = volume; el = a;
    let sec = fallbackSec; countdown(type, sec);
    a.addEventListener('loadedmetadata', () => { if (a.duration > 0 && isFinite(a.duration)) { sec = Math.ceil(a.duration); countdown(type, sec); } });
    a.onended = () => { if (el === a) stop(); };
    a.play().catch(err => { if (err?.name !== 'AbortError' && el === a) { stop(); play('sound1', 5); } });
  }

  // type: sound1 | sound2 | seq | rabbana | custom; dur in seconds (seq: the whole, both halves).
  function play(type, dur, url) {
    stop();
    if (type === 'rabbana') return file(url || 'assets/audio/rabbana.mp3', 'rabbana', 175);
    if (type === 'custom' && url) return file(url, 'custom', dur || 30);
    const c = init(), t0 = c.currentTime;
    if (type === 'sound2') { part(c, M2, t0, dur || 5, true); return countdown('sound2', dur || 5); }
    if (type === 'seq') { const half = Math.max(5, Math.floor((dur || 10) / 2)); part(c, M1, t0, half, false); part(c, M2, t0 + half, half, true); return countdown('seq', half * 2); }
    part(c, M1, t0, dur || 5, false); countdown('sound1', dur || 5);
  }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && ctx) master.gain.setValueAtTime(volume * 1.5, ctx.currentTime); if (el) el.volume = volume; }

  return { play, stop, setVolume, unlocked, on: cb => { subs.add(cb); return () => subs.delete(cb); } };
})();
