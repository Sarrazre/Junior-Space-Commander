// Junior Space Commander sound engine. Every note of music and every effect is synthesized live
// with the Web Audio API, so there are no audio files to load or license.
//
//   music.play('base')       cross-fades to a looping track (title, base, storm, rover, game)
//   sfx('ok')                plays a one-shot effect (see SFX below)
//   rockyTalk('Hello!')      Rocky's robot babble, length follows the text
//   engine / wind            continuous rover-motor and Mars-wind loops
//   settings + setVolume()   Music and Effects volume, mute; saved in localStorage

const KEY = 'jsc-audio';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
export const settings = { music: saved.music ?? 0.6, sfx: saved.sfx ?? 0.8, muted: !!saved.muted };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ } };

let ctx = null, unlocked = false, master, musicBus, musicTone, sfxBus, verb, noiseBuf, duck = 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function impulse(sec) {
  const n = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
  return buf;
}

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  if (new URLSearchParams(location.search).has('debug')) {      // ?debug: level meter for testing
    const an = ctx.createAnalyser(); an.fftSize = 4096; comp.connect(an);
    const buf = new Float32Array(an.fftSize);
    window.__audio = { ctx, music, sfx, rockyTalk, engine, wind, settings,
      level() { an.getFloatTimeDomainData(buf); let p = 0, s = 0; for (const v of buf) { p = Math.max(p, Math.abs(v)); s += v * v; } return { peak: +p.toFixed(3), rms: +Math.sqrt(s / buf.length).toFixed(4) }; } };
  }
  verb = ctx.createConvolver(); verb.buffer = impulse(2.4);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.32; verb.connect(verbOut).connect(master);
  musicBus = ctx.createGain(); musicTone = ctx.createBiquadFilter(); musicTone.type = 'lowpass'; musicTone.frequency.value = 20000;
  musicBus.connect(musicTone).connect(master);
  const mSend = ctx.createGain(); mSend.gain.value = 0.28; musicTone.connect(mSend).connect(verb);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  const sSend = ctx.createGain(); sSend.gain.value = 0.18; sfxBus.connect(sSend).connect(verb);
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  apply(true);
  setInterval(tick, 30);
  return ctx;
}

const musicLevel = () => (settings.muted ? 0 : settings.music * 0.85);
function apply(now = false) {
  if (!ctx) return;
  const t = ctx.currentTime, k = now ? 0.001 : 0.08;
  musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(musicLevel() * duck, t, k);
  sfxBus.gain.cancelScheduledValues(t); sfxBus.gain.setTargetAtTime(settings.muted ? 0 : settings.sfx, t, k);
}

/** Browsers only allow sound after a tap or key press, so the engine starts on the first one. */
function unlock() {
  if (!init()) return;
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  if (!unlocked) { unlocked = true; if (want && !cur) cur = startTrack(want); }
}
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => {
  if (!ctx || !unlocked) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});

// ---------- Building blocks ----------
function gain(v, dest) { const g = ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
function filt(type, f, q, dest) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (dest) b.connect(dest); return b; }
function osc(type, f, t, end, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end); return o; }
function noise(t, dur, dest) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; }
/** Percussive envelope: quick rise to `peak`, exponential fall over `dec` seconds. */
function hit(g, t, peak, dec, att = 0.004) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); }

// ---------- Instruments (used by the music and by the effects) ----------
const I = {
  /** Friendly cartoon lead: square + triangle, soft filter, gentle vibrato. */
  lead(out, t, m, d, v = 1) {
    const g = gain(0, out), f = filt('lowpass', 2400, 0.8, g), end = t + d + 0.35;
    const a = osc('square', mtof(m), t, end, f), b = osc('triangle', mtof(m), t, end, f);
    const depth = gain(0, null); osc('sine', 5.5, t, end, depth);             // vibrato fades in
    depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(mtof(m) * 0.006, t + 0.25);
    depth.connect(a.frequency); depth.connect(b.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.012);
    g.gain.setTargetAtTime(0.034 * v, t + 0.015, 0.09); g.gain.setTargetAtTime(0.0001, t + d, 0.07);
  },
  /** Glockenspiel / space bell. */
  bell(out, t, m, d = 0.9, v = 1) {
    const g = gain(0, out); hit(g, t, 0.07 * v, d);
    osc('sine', mtof(m), t, t + d + 0.1, g);
    const g2 = gain(0, out); hit(g2, t, 0.018 * v, d * 0.35); osc('sine', mtof(m) * 4.02, t, t + d, g2);
  },
  /** Marimba-like pluck. */
  pluck(out, t, m, d = 0.3, v = 1) {
    const g = gain(0, out); hit(g, t, 0.075 * v, d);
    osc('triangle', mtof(m), t, t + d + 0.05, g);
    const g2 = gain(0, out); hit(g2, t, 0.025 * v, 0.05); osc('sine', mtof(m) * 3.9, t, t + 0.08, g2);
  },
  bass(out, t, m, d, v = 1) {
    const g = gain(0, out), f = filt('lowpass', 700, 1.2, g), end = t + d + 0.1;
    osc('triangle', mtof(m), t, end, f); osc('square', mtof(m), t, end, gain(0.25, f));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.006);
    g.gain.setTargetAtTime(0.09 * v, t + 0.01, 0.08); g.gain.setTargetAtTime(0.0001, t + d * 0.85, 0.04);
  },
  pad(out, t, notes, d, v = 1) {
    const g = gain(0, out), f = filt('lowpass', 1100, 0.5, g);
    for (const m of notes) for (const det of [-8, 8]) { const o = osc('sawtooth', mtof(m), t, t + d + 0.6, f); o.detune.value = det; }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012 * v, t + d * 0.3);
    g.gain.setValueAtTime(0.012 * v, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.5);
  },
  brass(out, t, m, d, v = 1) {
    const g = gain(0, out), f = filt('lowpass', 600, 2, g), end = t + d + 0.3;
    f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2600, t + 0.06); f.frequency.setTargetAtTime(1400, t + 0.08, 0.2);
    for (const det of [-6, 6]) { const o = osc('sawtooth', mtof(m), t, end, f); o.detune.value = det; }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045 * v, t + 0.03); g.gain.setTargetAtTime(0.0001, t + d, 0.09);
  },
  kick(out, t, v = 1) {
    const g = gain(0, out); hit(g, t, 0.38 * v, 0.24, 0.002);
    const o = osc('sine', 150, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
  },
  snare(out, t, v = 1) {
    const g = gain(0, out); hit(g, t, 0.11 * v, 0.14, 0.002); noise(t, 0.2, filt('bandpass', 2200, 0.7, g));
    const g2 = gain(0, out); hit(g2, t, 0.08 * v, 0.07, 0.002); osc('triangle', 190, t, t + 0.1, g2);
  },
  hat(out, t, v = 1) { const g = gain(0, out); hit(g, t, 0.035 * v, 0.035, 0.001); noise(t, 0.06, filt('highpass', 8000, 0.7, g)); },
};

// ---------- Music ----------
const C = [60, 64, 67], Am = [57, 60, 64], F = [53, 57, 60], G = [55, 59, 62], Em = [52, 55, 59], Dm = [50, 53, 57], D = [50, 54, 57], Bb = [58, 62, 65];
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Melody text: one token per eighth note. "E5" = note, "-" = hold, "." = rest. */
function parseMel(str) {
  const toks = str.trim().split(/\s+/), out = Array(toks.length).fill(null);
  let last = null;
  toks.forEach((tk, i) => {
    if (tk === '-') { if (last) last.len++; return; }
    if (tk === '.') { last = null; return; }
    const [, n, acc, oct] = tk.match(/^([A-G])([#b]?)(\d)$/);
    last = out[i] = { m: 12 * (+oct + 1) + NOTE[n] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0), len: 1 };
  });
  return out;
}
const bassRoot = (ch) => 40 + ((ch[0] - 40) % 12 + 12) % 12;

// Each track loops 2 passes of its chords: pass 1 the lead sings the tune, pass 2 the bells answer.
// K/S/H = kick, snare and hat on 16th steps; B = bass on 8ths (semitones above the chord root).
const TRACKS = {
  title: { bpm: 118, vol: 1, chords: [C, F, G, C, Am, F, D, G], lead: 'lead', arp: 1, pad: true,
    mel: `G4 - C5 - E5 - G5 -   A5 - G5 - F5 - C5 -   D5 - G5 - B5 - D6 -   C6 - - - - - . .
          E5 - A5 - C6 - B5 A5  F5 - A5 - C6 - A5 -   F#5 - A5 - D6 - C6 A5 B5 - - - D6 - - .`,
    K: 'x...x...x...x...', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.', B: [0, null, 12, null, 7, null, 12, 7] },
  base: { bpm: 100, vol: 0.85, chords: [C, Am, F, G, C, Em, F, G], lead: 'lead', arp: 2, pad: true,
    mel: `E5 - G5 - C6 - B5 A5   G5 - E5 - - . C5 D5   F5 - A5 - C6 - D6 C6   B5 - - - G5 . . .
          E5 - G5 - C6 - E6 D6   B5 - G5 - E5 - . G5   A5 - C6 - A5 - G5 F5   G5 - - . D5 E5 F5 D5`,
    K: 'x.......x.x.....', S: '....x.......x...', H: '..x...x...x...x.', B: [0, null, 12, null, 7, null, 12, null] },
  storm: { bpm: 112, vol: 0.85, chords: [Am, F, C, G, Am, F, C, G], lead: 'lead', arp: 1, pad: true,
    mel: `A5 - - . E5 . A5 B5   C6 - - . A5 . F5 .   G5 - - . E5 . G5 C6   B5 - - - D5 . . .
          A5 . C6 . E6 - D6 C6   A5 . C6 . F6 - E6 D6   E6 - D6 - C6 - G5 -   B5 - - - D6 - - .`,
    K: 'x...x...x...x...', S: '....x.......x..x', H: 'xxxxxxxxxxxxxxxx', B: [0, 0, 12, 0, 0, 0, 12, 0] },
  rover: { bpm: 138, vol: 0.62, chords: [G, G, C, D, Em, C, D, D], lead: 'lead', arp: 0, pad: false,
    mel: `G5 . G5 A5 B5 . D6 .   B5 . A5 . G5 - D5 .   E5 . G5 . C6 . B5 A5   A5 - - . F#5 . D5 .
          G5 . B5 . E6 . D6 B5   C6 . B5 . A5 . G5 E5   F#5 . A5 . D6 . C6 A5   A5 - - - D5 E5 F#5 A5`,
    K: 'x.....x.x.......', S: '....x.......x...', H: 'xxxxxxxxxxxxxxxx', B: [0, 0, 0, 0, 0, 0, 7, 12] },
  game: { bpm: 112, vol: 0.95, chords: [F, Dm, Bb, C, F, Dm, Bb, C], lead: 'pluck', arp: 0, pad: true, rim: true,
    mel: `C6 . A5 . F5 . A5 C6   D6 . A5 . F5 . D5 .   D6 . Bb5 . F5 . D6 C6   C6 - E5 . G5 . Bb5 .
          A5 C6 F6 . E6 . C6 .   D6 . F6 . E6 D6 A5 .   Bb5 . D6 . F6 . D6 Bb5   C6 - - . G5 . E5 .`,
    K: 'x.......x.......', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.', B: [0, null, 7, null, 12, null, 7, null] },
};
for (const tr of Object.values(TRACKS)) tr.notes = parseMel(tr.mel);

let want = null, cur = null;
const live = new Set();
function startTrack(name) {
  const def = TRACKS[name];
  if (!def || !ctx) return null;
  const out = gain(0, musicBus), t = ctx.currentTime;
  out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(def.vol, t + 1.2);
  const tr = { name, def, out, step: 0, next: t + 0.08, stopAt: 0 };
  live.add(tr);
  return tr;
}
function stopTrack(tr, fade = 1.2) {
  if (!tr || tr.stopAt) return;
  const t = ctx.currentTime;
  tr.out.gain.cancelScheduledValues(t); tr.out.gain.setTargetAtTime(0.0001, t, fade / 4);
  tr.stopAt = t + fade + 0.3;
}
function tick() {
  const now = ctx.currentTime;
  for (const tr of live) {
    if (tr.stopAt) { if (now > tr.stopAt + 1.5) { tr.out.disconnect(); live.delete(tr); } continue; }
    if (tr.next < now - 0.2) tr.next = now + 0.05;            // tab was asleep: skip ahead instead of bursting
    const sp = 60 / tr.def.bpm / 4;
    while (tr.next < now + 0.15) { playStep(tr, tr.step, tr.next, sp); tr.step++; tr.next += sp; }
  }
}
function playStep(tr, step, t, sp) {
  const d = tr.def, out = tr.out, s = step % 16, nBars = d.chords.length;
  const loopBar = Math.floor(step / 16) % (nBars * 2), bar = loopBar % nBars, pass2 = loopBar >= nBars, ch = d.chords[bar];
  const intro = step < 16;                                    // first bar: no drums, eases in
  if (!intro) {
    if (d.K[s] === 'x') I.kick(out, t, 0.9);
    if (d.S[s] === 'x') I.snare(out, t, d.rim ? 0.45 : 0.8);
    if (d.H[s] === 'x') I.hat(out, t, s % 4 === 0 ? 1 : 0.55);
  }
  if (s % 2 === 0) {
    const e8 = s / 2, bo = d.B[e8];
    if (bo != null) I.bass(out, t, bassRoot(ch) + bo, sp * 1.7, 0.9);
    const n = d.notes[bar * 8 + e8];
    if (n && !intro) {
      if (pass2) I.bell(out, t, n.m, Math.max(0.5, n.len * sp * 2 + 0.3), 0.9);
      else I[d.lead](out, t, n.m, n.len * sp * 2 * 0.92, 1);
    }
  }
  if (s === 0 && d.pad) I.pad(out, t, ch, sp * 16, 1);
  if (d.arp && s % d.arp === 0) {
    const k = (s / d.arp) % 4;
    I.pluck(out, t, ch[[0, 1, 2, 1][k]] + 12, 0.18, pass2 ? 0.45 : 0.3);
  }
}

export const music = {
  get current() { return want; },
  /** Cross-fade to a track by name, or `null` to fade out. */
  play(name) {
    want = name || null;
    if (!ctx || !unlocked) return;
    if (cur && cur.name === want && !cur.stopAt) return;
    stopTrack(cur); cur = want ? startTrack(want) : null;
  },
  stop() { this.play(null); },
  /** Muffle the music (pause menu). */
  muffle(on) { if (ctx) musicTone.frequency.setTargetAtTime(on ? 650 : 20000, ctx.currentTime, 0.12); },
  /** Briefly lower the music so a fanfare or alarm can be heard. */
  duck(sec = 2, level = 0.3) {
    if (!ctx) return;
    const t = ctx.currentTime, base = musicLevel();
    duck = level; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(base * level, t, 0.05);
    clearTimeout(music._dt); music._dt = setTimeout(() => { duck = 1; musicBus.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.4); }, sec * 1000);
  },
};

// ---------- Sound effects ----------
function sweep(out, type, f0, f1, t, dur, v) {
  const g = gain(0, out); hit(g, t, v, dur);
  const o = osc(type, f0, t, t + dur + 0.05, g); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  return o;
}
function whoosh(out, t, dur, f0, f1, v, q = 1.2) {
  const g = gain(0, out), b = filt('bandpass', f0, q, g);
  b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noise(t, dur + 0.05, b);
}
const PENTA = [0, 2, 4, 7, 9];

const SFX = {
  tap(o, t) { sweep(o, 'sine', 1250, 1150, t, 0.05, 0.09); },
  ok(o, t) { I.bell(o, t, 88, 0.5, 0.8); I.bell(o, t + 0.08, 93, 0.7, 0.8); },
  bad(o, t) {                                                   // soft cartoon "bwomp", never harsh
    for (const [dt, f0, f1] of [[0, 330, 260], [0.16, 262, 196]]) {
      const g = gain(0, o), f = filt('lowpass', 900, 1, g); hit(g, t + dt, 0.12, 0.17, 0.01);
      const x = osc('triangle', f0, t + dt, t + dt + 0.22, f); x.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.17);
      osc('square', f0 / 2, t + dt, t + dt + 0.2, gain(0.3, f)).frequency.exponentialRampToValueAtTime(f1 / 2, t + dt + 0.17);
    }
  },
  win(o, t) { [72, 76, 79, 84].forEach((m, i) => I.bell(o, t + i * 0.09, m + 12, 0.9, 0.9)); SFX.sparkle(o, t + 0.36, 5); },
  alert(o, t) { [81, 76, 81, 76].forEach((m, i) => { const g = gain(0, o); hit(g, t + i * 0.16, 0.08, 0.13, 0.005); osc('square', mtof(m), t + i * 0.16, t + i * 0.16 + 0.15, filt('lowpass', 2500, 1, g)); }); },
  rocky(o, t) { babble(o, t, 3, '!'); },
  select(o, t) { sweep(o, 'sine', 600, 1100, t, 0.09, 0.08); I.bell(o, t + 0.07, 91, 0.4, 0.6); },
  near(o, t) { I.bell(o, t, 86, 0.35, 0.35); I.bell(o, t + 0.06, 93, 0.35, 0.3); },
  open(o, t) { sweep(o, 'sine', 220, 900, t, 0.22, 0.07); sweep(o, 'square', 110, 450, t, 0.2, 0.015); I.bell(o, t + 0.2, 84, 0.5, 0.6); I.bell(o, t + 0.26, 91, 0.5, 0.5); },
  close(o, t) { sweep(o, 'sine', 900, 240, t, 0.2, 0.06); },
  door(o, t) {                                                  // airlock: hiss, then a heavy clunk
    whoosh(o, t, 0.75, 3200, 500, 0.16, 0.8);
    I.kick(o, t + 0.7, 0.5); const g = gain(0, o); hit(g, t + 0.7, 0.05, 0.25); osc('square', 98, t + 0.7, t + 1, filt('lowpass', 500, 2, g));
  },
  power(o, t) {                                                 // station powering up
    const g = gain(0, o), f = filt('lowpass', 200, 4, g);
    f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.7);
    const x = osc('sawtooth', 55, t, t + 0.95, f); x.frequency.exponentialRampToValueAtTime(220, t + 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    I.bell(o, t + 0.7, 96, 0.6, 0.6);
  },
  sparkle(o, t, n = 7) { for (let i = 0; i < n; i++) I.bell(o, t + i * 0.055, 84 + 12 * (i % 2) + pick(PENTA), 0.45, 0.35); },
  zip(o, t) {                                                   // DNA zipping shut
    const g = gain(0, o), f = filt('bandpass', 1200, 2, g); hit(g, t, 0.11, 0.2, 0.01);
    const x = osc('square', 300, t, t + 0.25, f); for (let i = 0; i < 8; i++) x.frequency.setValueAtTime(300 + i * 160, t + i * 0.022);
    I.bell(o, t + 0.19, 96, 0.4, 0.5);
  },
  collect(o, t) { [84, 88, 91, 96, 100].forEach((m, i) => I.bell(o, t + i * 0.06, m, 0.7, 0.75)); SFX.sparkle(o, t + 0.3, 4); },
  fanfare(o, t) {                                               // end of a sol
    music.duck(2.6, 0.25);
    I.brass(o, t, 67, 0.12); I.brass(o, t, 72, 0.12); I.brass(o, t + 0.15, 67, 0.12); I.brass(o, t + 0.15, 72, 0.12);
    for (const m of [72, 76, 79, 84]) I.brass(o, t + 0.32, m, 1.1, 0.8);
    for (let i = 0; i < 6; i++) I.snare(o, t + i * 0.05, 0.25 + i * 0.08);
    I.kick(o, t + 0.32); SFX.sparkle(o, t + 0.5, 6);
  },
  finale(o, t) {                                                // mission complete
    music.duck(4.5, 0.2);
    [[60, 0], [64, 0.18], [67, 0.36], [72, 0.54]].forEach(([m, dt]) => { I.brass(o, t + dt, m, 0.16); I.brass(o, t + dt, m + 7, 0.16, 0.6); });
    for (const m of [65, 69, 72, 77]) I.brass(o, t + 0.8, m, 0.5, 0.7);
    for (const m of [67, 71, 74, 79]) I.brass(o, t + 1.35, m, 0.5, 0.7);
    for (const m of [72, 76, 79, 84, 88]) I.brass(o, t + 1.9, m, 1.6, 0.75);
    I.kick(o, t + 1.9); for (let i = 0; i < 10; i++) I.snare(o, t + 1.4 + i * 0.05, 0.2 + i * 0.05);
    SFX.sparkle(o, t + 2, 10); SFX.sparkle(o, t + 2.7, 8);
  },
  storm(o, t) {                                                 // solar storm: siren + radio static
    music.duck(3, 0.3);
    const g = gain(0, o), x = osc('sine', 620, t, t + 2.2, g), y = osc('triangle', 620, t, t + 2.2, gain(0.4, g));
    for (let i = 0; i < 3; i++) for (const n of [x, y]) { n.frequency.linearRampToValueAtTime(980, t + i * 0.66 + 0.33); n.frequency.linearRampToValueAtTime(620, t + i * 0.66 + 0.66); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.1); g.gain.setValueAtTime(0.07, t + 1.8); g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
    const sg = gain(0, o), b = filt('bandpass', 1600, 0.9, sg); noise(t, 2.2, b);
    sg.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 22; i++) sg.gain.setValueAtTime(Math.random() < 0.5 ? rnd(0.02, 0.07) : 0.003, t + i * 0.1);
    sg.gain.setValueAtTime(0.0001, t + 2.2);
  },
  dust(o, t) { whoosh(o, t, 1.8, 250, 1300, 0.14, 0.6); whoosh(o, t + 0.5, 1.6, 1300, 300, 0.1, 0.6); },
  bump(o, t) {
    const g = gain(0, o); hit(g, t, 0.35, 0.22, 0.002); osc('sine', 120, t, t + 0.3, g).frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const n = gain(0, o); hit(n, t, 0.12, 0.1, 0.002); noise(t, 0.15, filt('lowpass', 500, 1, n));
    const k = gain(0, o); hit(k, t + 0.02, 0.03, 0.3); osc('square', 233, t + 0.02, t + 0.35, filt('bandpass', 1200, 6, k));
  },
  drill(o, t) {                                                 // 1.4 s of rattling drill
    const dur = 1.4, g = gain(0, o), tg = gain(0.5, g), f = filt('lowpass', 1100, 3, tg);
    osc('sawtooth', 92, t, t + dur, f); osc('square', 184, t, t + dur, gain(0.4, f));
    const trem = gain(0.45, null); trem.connect(tg.gain); osc('square', 24, t, t + dur, trem);   // rattle
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.08); g.gain.setValueAtTime(0.06, t + dur - 0.15); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const n = gain(0, o); n.gain.setValueAtTime(0.0001, t); n.gain.linearRampToValueAtTime(0.05, t + 0.1); n.gain.linearRampToValueAtTime(0.0001, t + dur); noise(t, dur, filt('bandpass', 2600, 1.5, n));
  },
  scan(o, t) { const g = gain(0, o); hit(g, t, 0.08, 0.7, 0.003); osc('sine', 1568, t, t + 0.8, g); sweep(o, 'sine', 1568, 1760, t + 0.12, 0.25, 0.02); },
  step(o, t) {                                                  // boots on Mars dirt
    const g = gain(0, o); hit(g, t, rnd(0.09, 0.13), 0.07, 0.003); noise(t, 0.1, filt('lowpass', rnd(700, 1100), 1, g));
  },
  stepIn(o, t) {                                                // boots on the base floor
    const g = gain(0, o); hit(g, t, 0.035, 0.03, 0.002); noise(t, 0.05, filt('bandpass', rnd(2600, 3400), 2, g));
    const b = gain(0, o); hit(b, t, 0.04, 0.05, 0.002); osc('sine', rnd(160, 200), t, t + 0.07, b);
  },
  tick(o, t) { const g = gain(0, o); hit(g, t, 0.07, 0.12); osc('square', 880, t, t + 0.14, filt('lowpass', 2000, 1, g)); },
  liftoff(o, t) {
    music.duck(3, 0.3);
    const g = gain(0, o), f = filt('lowpass', 120, 1, g); noise(t, 3, f);
    f.frequency.setValueAtTime(120, t); f.frequency.exponentialRampToValueAtTime(900, t + 1.6); f.frequency.exponentialRampToValueAtTime(200, t + 2.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.6); g.gain.setValueAtTime(0.35, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    const r = gain(0, o); r.gain.setValueAtTime(0.0001, t); r.gain.linearRampToValueAtTime(0.06, t + 0.5); r.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); osc('sawtooth', 42, t, t + 2.7, filt('lowpass', 200, 1, r));
    I.brass(o, t + 0.15, 72, 0.5, 0.7); I.brass(o, t + 0.15, 79, 0.5, 0.6);
  },

  // --- Landing intro ---
  reveal(o, t) {                                                // logo card shimmers in
    whoosh(o, t, 1.1, 5000, 9000, 0.05, 0.8);
    [79, 84, 88, 91, 96].forEach((m, i) => I.bell(o, t + 0.1 + i * 0.09, m, 1.1, 0.7));
    I.pad(o, t, [60, 67, 76], 1.2, 1.4);
  },
  pan(o, t) { whoosh(o, t, 1.6, 2000, 400, 0.24, 0.7); },        // camera sweeps down to the base
  jet(o, t) {                                                   // Rocky's jetpack fly-in, ends with a boing
    const dur = 1.9, tg = gain(0.75, o), g = gain(0, tg), b = filt('bandpass', 900, 1.4, g);
    noise(t, dur, b);
    b.frequency.setValueAtTime(700, t); b.frequency.linearRampToValueAtTime(1800, t + dur * 0.55); b.frequency.exponentialRampToValueAtTime(500, t + dur);
    osc('square', 18, t, t + dur, gain(0.25, tg.gain));         // flame flutter
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.35); g.gain.setValueAtTime(0.16, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dg = gain(0, o); dg.gain.setValueAtTime(0.0001, t); dg.gain.linearRampToValueAtTime(0.035, t + 0.4); dg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const d = osc('sine', 520, t, t + dur, dg); d.frequency.linearRampToValueAtTime(760, t + dur * 0.45); d.frequency.exponentialRampToValueAtTime(330, t + dur);   // doppler
    sweep(o, 'sine', 260, 640, t + dur - 0.05, 0.16, 0.12); sweep(o, 'sine', 640, 420, t + dur + 0.11, 0.14, 0.08);
    I.bell(o, t + dur + 0.08, 91, 0.5, 0.6);
  },
  pop(o, t, i = 0) {                                            // crew member hops in
    const base = 420 * 2 ** ((i | 0) * 3 / 12);
    sweep(o, 'sine', base, base * 2.1, t, 0.12, 0.12);
    I.pluck(o, t + 0.05, 74 + (i | 0) * 3, 0.25, 0.8);
  },
  slide(o, t) { whoosh(o, t, 0.25, 400, 1600, 0.4, 1.4); },
  count(o, t, n = 0) { I.pluck(o, t, 79 + Math.min(14, n | 0), 0.12, 0.6); },
  ding(o, t) { for (const m of [84, 88, 91, 96]) I.bell(o, t, m, 1.3, 0.75); SFX.sparkle(o, t + 0.15, 5); },
  tada(o, t) {
    I.brass(o, t, 72, 0.1, 0.8); I.brass(o, t + 0.12, 79, 0.1, 0.8);
    for (const m of [72, 76, 79, 84]) I.brass(o, t + 0.26, m, 0.6, 0.7);
  },
  twinkle(o, t) { [96, 100, 103, 108].forEach((m, i) => I.bell(o, t + i * 0.05, m, 0.35, 0.18)); },
  syll(o, t, i = 0) { syllable(o, t, i | 0, 2); },
  syllEnd(o, t, end = '.') { endChirp(o, t, end, 2); },
};

/** Rocky's robot babble: chirpy square-wave syllables through a "mouth" filter. */
function syllable(o, t, i, v = 1) {
  const f = 560 * pick([1, 1.19, 1.33, 1.5, 0.89, 1.12, 1.26]), dur = rnd(0.05, 0.085);
  const g = gain(0, o), b = filt('bandpass', i % 2 ? 1500 : 950, 3.5, g);
  hit(g, t, 0.13 * v, dur, 0.006);
  const x = osc('square', f * 0.92, t, t + dur + 0.04, b); x.frequency.linearRampToValueAtTime(f * 1.06, t + dur);
  return dur;
}
function endChirp(o, t, end, v = 1) {
  const g = gain(0, o), b = filt('bandpass', 1300, 2.5, g); hit(g, t, 0.12 * v, 0.13, 0.006);
  const x = osc('square', end === '?' ? 640 : end === '!' ? 900 : 620, t, t + 0.18, b);
  x.frequency.exponentialRampToValueAtTime(end === '?' ? 1250 : end === '!' ? 1350 : 460, t + 0.13);
}
function babble(o, t, n, end) {
  for (let i = 0; i < n; i++) t += syllable(o, t, i) + rnd(0.02, 0.045) + (Math.random() < 0.15 ? 0.06 : 0);
  endChirp(o, t, end);
  return t + 0.15;
}
let talkUntil = 0;
/** Rocky "speaks" a line. Longer lines get a longer babble (capped so it never drags). */
export function rockyTalk(text = '') {
  if (settings.muted || !init() || !unlocked) return;
  const t = Math.max(ctx.currentTime + 0.02, talkUntil);
  if (t > ctx.currentTime + 0.5) return;                       // still talking: don't pile up
  const letters = text.replace(/[^\p{L}\p{N}]/gu, '').length;
  const end = /\?\s*\W*$/.test(text) ? '?' : /!\s*\W*$/.test(text) ? '!' : '.';
  talkUntil = babble(sfxBus, t, Math.max(3, Math.min(12, Math.round(letters / 8))), end);
}

/** Play a one-shot effect by name. */
export function sfx(name, arg) {
  if (settings.muted || !init() || !unlocked) return;
  try { (SFX[name] || SFX.tap)(sfxBus, ctx.currentTime + 0.01, arg); } catch { /* sound is optional */ }
}
/** One short pluck at a given pitch (the memory and puzzle games use this). */
export function tone(freq, dur = 0.15) {
  if (settings.muted || !init() || !unlocked) return;
  try {
    const t = ctx.currentTime + 0.005, g = gain(0, sfxBus); hit(g, t, 0.09, Math.max(0.08, dur), 0.004);
    osc('triangle', freq, t, t + dur + 0.1, g); const g2 = gain(0, sfxBus); hit(g2, t, 0.02, 0.05); osc('sine', freq * 3.9, t, t + 0.08, g2);
  } catch { /* sound is optional */ }
}

// ---------- Continuous loops ----------
/** Rover electric motor: pitch and brightness follow speed. */
export const engine = {
  n: null,
  start() {
    if (!init() || this.n) return;
    const t = ctx.currentTime, out = gain(0, sfxBus), lp = filt('lowpass', 300, 2, out);
    const a = osc('sawtooth', 38, t, t + 3600, lp), b = osc('square', 76, t, t + 3600, gain(0.35, lp));
    const wg = gain(0, out), w = osc('sine', 300, t, t + 3600, wg);
    this.n = { out, lp, a, b, wg, w };
  },
  /** spd and gas are 0..1. Pass spd < 0 to silence (paused). */
  set(spd, gas = 0) {
    const n = this.n; if (!n) return;
    const t = ctx.currentTime, k = 0.08;
    n.out.gain.setTargetAtTime(spd < 0 ? 0 : 0.05 + spd * 0.09 + gas * 0.03, t, k);
    if (spd < 0) return;
    n.a.frequency.setTargetAtTime(38 + spd * 60, t, k); n.b.frequency.setTargetAtTime(76 + spd * 120, t, k);
    n.lp.frequency.setTargetAtTime(260 + spd * 1000 + gas * 300, t, k);
    n.w.frequency.setTargetAtTime(320 + spd * 1100, t, k); n.wg.gain.setTargetAtTime(spd * 0.1, t, k);
  },
  stop() {
    const n = this.n; if (!n) return; this.n = null;
    const t = ctx.currentTime; n.out.gain.cancelScheduledValues(t); n.out.gain.setTargetAtTime(0, t, 0.1);
    for (const o of [n.a, n.b, n.w]) o.stop(t + 0.6);
  },
};
/** Mars wind: slowly breathing filtered noise. Strength 0..1 (1 = dust storm). */
export const wind = {
  n: null,
  start(strength = 0.35) {
    if (!init() || this.n) return;
    const t = ctx.currentTime, out = gain(0, sfxBus), gust = gain(0.65, out), bp = filt('bandpass', 450 + strength * 400, 0.7, gust);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.connect(bp); src.start(t);
    const o1 = osc('sine', 0.13, t, t + 3600, gain(280 + strength * 300, bp.frequency));   // whistle drifts
    const o2 = osc('sine', 0.21, t, t + 3600, gain(0.35, gust.gain));                      // gusts swell
    const level = 0.045 + strength * 0.15;
    out.gain.setTargetAtTime(level, t, 1);
    this.n = { out, src, o1, o2, level };
  },
  pause(on) { if (this.n) this.n.out.gain.setTargetAtTime(on ? 0 : this.n.level, ctx.currentTime, 0.15); },
  stop() {
    const n = this.n; if (!n) return; this.n = null;
    const t = ctx.currentTime; n.out.gain.cancelScheduledValues(t); n.out.gain.setTargetAtTime(0, t, 0.3);
    for (const o of [n.src, n.o1, n.o2]) o.stop(t + 1.5);
  },
};

// ---------- Settings ----------
export function setVolume(key, v) { settings[key] = Math.max(0, Math.min(1, v)); save(); apply(); }
export function setMuted(m) { settings.muted = !!m; save(); apply(); if (m) { engine.set(-1); wind.pause(true); } else wind.pause(false); }
/** Old API: `sound.on` is the opposite of mute. */
export const sound = { get on() { return !settings.muted; }, set on(v) { setMuted(!v); } };
