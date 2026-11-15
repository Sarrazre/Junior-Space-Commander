// Landing page: a short, skippable briefing where Rocky flies in and explains the game,
// then the title lockup with Start. Background picture, mission logo and landing video live in public/assets.
import { $, h, sfx, sound } from './ui.js';
import { music } from './audio.js';
import { INK, TAU, rr, ink, lg, rg, label, star, drawAstro, rnd } from './art.js';
import { CREW, CREW_IDS } from './data/sols.js';

const LOGO = 'assets/space-apps-logo.png';
const MISSION_LOGO = 'assets/mission-logo.webp';
const VIDEO = 'assets/intro.mp4';
const BEAT_MS = 3900;

const LINES = [
  "Hi, I'm Rocky, the robot of Astro Base! Welcome to Mars! This is Astro Base, our home.",
  'You are the Commander! Meet your crew: Max, Elsa, Charles and Lea.',
  'Every sol: solve a problem, finish the crew jobs and keep power, shielding, food and health up.',
  'Five sols. Fifty science points. Ready for launch, Commander?',
];

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- Drawing ----------
/** Rocky, centred on his body. pose: { talk, wave, salute, flame, tilt } */
export function drawRocky(g, x, y, s, t, { talk = false, wave = false, salute = false, flame = 0, tilt = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s); g.translate(-42, -52);
  if (flame > 0) {
    for (const [fx, k] of [[32, 1], [52, 0.9]]) {
      const len = (16 + Math.sin(t * 40 + fx) * 5) * flame * k;
      g.beginPath(); g.moveTo(fx - 6, 88); g.quadraticCurveTo(fx, 88 + len * 1.4, fx + 6, 88); g.fillStyle = '#ff8a3c'; g.fill();
      g.beginPath(); g.moveTo(fx - 3, 88); g.quadraticCurveTo(fx, 88 + len * 0.9, fx + 3, 88); g.fillStyle = '#fff3a0'; g.fill();
    }
    g.fillStyle = rg(g, 42, 96, 2, 34 * flame, ['#ffb34766', '#ffb34700']); g.fillRect(0, 70, 84, 70);
  }
  g.lineWidth = 3; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(42, 16); g.lineTo(42, 6); g.stroke();
  const blink = Math.sin(t * 5) > 0;
  g.beginPath(); g.arc(42, 6, 4.5, 0, TAU); g.fillStyle = blink ? '#ffd23f' : '#ff8a3c'; g.fill(); ink(g, 3);
  if (blink) { g.fillStyle = rg(g, 42, 6, 1, 14, ['#ffd23f88', '#ffd23f00']); g.fillRect(28, -8, 28, 28); }
  const arm = (px, rot) => { g.save(); g.translate(px, 60); g.rotate(rot); rr(g, -6, -2, 12, 22, 6); g.fillStyle = '#b8c2d6'; g.fill(); ink(g, 3); g.restore(); };
  arm(10, 0.1 + Math.sin(t * 2) * 0.05);
  arm(74, salute ? -2.55 : wave ? -2.3 + Math.sin(t * 10) * 0.45 : -0.1 - Math.sin(t * 2) * 0.05);
  rr(g, 18, 54, 48, 34, 12); g.fillStyle = lg(g, 18, 54, 66, 88, ['#ffffff', '#d4dcea']); g.fill(); ink(g, 3);
  rr(g, 30, 64, 24, 14, 5); g.fillStyle = '#1b2a5c'; g.fill(); ink(g, 2);
  [['#58d66b', 36], ['#ffd23f', 42], ['#ff5a5a', 48]].forEach(([c, cx], i) => { g.beginPath(); g.arc(cx, 71, 2.5, 0, TAU); g.fillStyle = Math.sin(t * 4 + i * 2) > -0.3 ? c : '#2b3559'; g.fill(); });
  rr(g, 10, 16, 64, 42, 16); g.fillStyle = lg(g, 10, 16, 74, 58, ['#ffffff', '#d4dcea']); g.fill(); ink(g, 3);
  rr(g, 18, 24, 48, 26, 11); g.fillStyle = lg(g, 0, 24, 0, 50, ['#24397a', '#0e1838']); g.fill(); ink(g, 3);
  const bl = (t % 3.4) < 0.12;
  g.fillStyle = '#5fd4ff';
  for (const ex of [32, 52]) { g.beginPath(); g.ellipse(ex, 36, 5, bl ? 0.8 : 6.5, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#5fd4ff55'; g.beginPath(); g.ellipse(42, 37, 22, 10, 0, 0, TAU); g.fill();
  if (talk && Math.sin(t * 18) > -0.2) { g.beginPath(); g.ellipse(42, 45.5, 5, 2 + Math.abs(Math.sin(t * 18)) * 2.5, 0, 0, TAU); g.fillStyle = '#5fd4ff'; g.fill(); }
  else { g.strokeStyle = '#5fd4ff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(36, 45); g.quadraticCurveTo(42, 50, 48, 45); g.stroke(); }
  g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(24, 28, 6, 2.6, -0.4, 0, TAU); g.fill();
  g.restore();
}

function drawIcon(g, kind, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.lineWidth = 2.2; g.strokeStyle = INK;
  g.beginPath();
  if (kind === 'power') { g.moveTo(2, -12); g.lineTo(-7, 2); g.lineTo(-1, 2); g.lineTo(-3, 12); g.lineTo(7, -3); g.lineTo(1, -3); g.lineTo(4, -12); g.closePath(); }
  if (kind === 'shield') { g.moveTo(0, -12); g.lineTo(10, -8); g.quadraticCurveTo(10, 6, 0, 12); g.quadraticCurveTo(-10, 6, -10, -8); g.closePath(); }
  if (kind === 'food') { g.moveTo(-8, 10); g.quadraticCurveTo(-12, -10, 10, -11); g.quadraticCurveTo(10, 8, -8, 10); }
  if (kind === 'health') { g.moveTo(0, 11); g.bezierCurveTo(-16, 0, -9, -15, 0, -6); g.bezierCurveTo(9, -15, 16, 0, 0, 11); }
  if (kind === 'science') { g.moveTo(-4, -12); g.lineTo(4, -12); g.lineTo(4, -3); g.lineTo(11, 9); g.quadraticCurveTo(12, 12, 8, 12); g.lineTo(-8, 12); g.quadraticCurveTo(-12, 12, -11, 9); g.lineTo(-4, -3); g.closePath(); }
  g.fill(); g.stroke();
  if (kind === 'food') { g.beginPath(); g.moveTo(-8, 10); g.quadraticCurveTo(0, -2, 8, -8); g.strokeStyle = '#1d6b30'; g.stroke(); }
  if (kind === 'science') { g.fillStyle = '#ffffffaa'; g.beginPath(); g.arc(-2, 6, 2, 0, TAU); g.arc(4, 3, 1.5, 0, TAU); g.fill(); }
  g.restore();
}

const GAUGES = [['power', 'Power', '#ffd23f'], ['shield', 'Shielding', '#5fd4ff'], ['food', 'Food', '#58d66b'], ['health', 'Crew Health', '#ff5a7a']];

// ---------- Background picture: Astro Base on Mars ----------
// Everything placed "on" the picture uses picture coordinates (0..1), so it stays in place on any screen.
const BG = { src: 'assets/landing-bg.webp', w: 1672, h: 941 };
const SKY_BOTTOM = 0.34;           // stars only live above this line of the picture
const DOOR = [0.548, 0.63];        // the launch zoom flies into the main door
const GLOWS = [                    // lamps in the picture that gently pulse: x, y, radius, colour, speed
  [0.352, 0.437, 0.022, '159,216,255', 2.4], [0.42, 0.405, 0.03, '255,190,90', 1.1], [0.548, 0.478, 0.03, '120,220,255', 1.7],
  [0.548, 0.615, 0.045, '120,200,255', 1.3], [0.27, 0.405, 0.016, '255,170,70', 3.1], [0.85, 0.6, 0.075, '120,255,150', 0.9],
  [0.862, 0.583, 0.012, '255,190,60', 4.2], [0.512, 0.5, 0.01, '255,190,60', 2.2], [0.592, 0.5, 0.01, '255,190,60', 2.6],
];
const CREW_SPOTS = { wide: [[0.40, 0.705], [0.465, 0.7], [0.635, 0.7], [0.70, 0.705]], narrow: [[0.45, 0.705], [0.49, 0.7], [0.61, 0.7], [0.65, 0.705]] };

function makeStars(n, seed) {
  const r = rnd(seed);
  return Array.from({ length: n }, () => ({ x: r(), y: Math.pow(r(), 1.3) * SKY_BOTTOM, s: 0.6 + r() * 1.5, sp: 0.5 + r() * 2.5, ph: r() * TAU, depth: 0.2 + r() * 0.8, big: r() < 0.07 }));
}

// ---------- Landing controller ----------
export function createLanding({ onStart, onSources }) {
  const root = $('#landing');
  const canvas = h('canvas', { class: 'ld-sky' });
  const g = canvas.getContext('2d');
  const stars = makeStars(170, 11);
  const dust = Array.from({ length: 40 }, (_, i) => ({ x: Math.random(), y: 0.62 + Math.random() * 0.38, s: 0.6 + Math.random() * 1.8, sp: 0.004 + Math.random() * 0.012, ph: i }));
  const bg = new Image(); bg.src = BG.src;

  const bubbleText = h('p'), dots = h('div', { class: 'ld-dots' }, LINES.map(() => h('i')));
  const backBtn = h('button', { class: 'btn small', onclick: (e) => { e.stopPropagation(); prevBeat(); } }, '◀ Back');
  const nextBtn = h('button', { class: 'btn small go', onclick: (e) => { e.stopPropagation(); sfx('tap'); nextBeat(); } }, 'Next ▶');
  const bubble = h('div', { class: 'ld-bubble hidden' }, h('b', {}, 'Rocky'), bubbleText, h('div', { class: 'ld-brow' }, dots, h('span', { class: 'ld-nav' }, backBtn, nextBtn)));
  const presents = h('div', { class: 'ld-presents hidden' }, h('img', { src: LOGO, alt: 'NASA Space Apps Challenge' }), h('p', {}, 'Space Apps Challenge 2026 presents'));
  const video = h('video', { class: 'ld-video hidden', playsinline: '', preload: 'auto' });
  const skip = h('button', { class: 'btn small ld-skip hidden', onclick: (e) => { e.stopPropagation(); if (beat === 0.5) endVideo(); else toTitle(); } }, 'Skip intro ⏭');
  const soundBtn = h('button', { class: 'btn ld-sec', onclick: () => { sound.on = !sound.on; soundBtn.textContent = sound.on ? '🔊 Sound on' : '🔇 Sound off'; video.muted = !sound.on; sfx('ok'); } }, sound.on ? '🔊 Sound on' : '🔇 Sound off');
  const rocket = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#1d2547" stroke-width="2.2" stroke-linejoin="round"><path d="M9 21 4 23l3-7 4-1z" fill="#ff5a5a"/><path d="M11 23l-2 5 7-3 1-4z" fill="#ff5a5a"/><path d="M11 21C12 12 18 5 28 4c-1 10-8 16-17 17z" fill="#f4f8ff"/><circle cx="20" cy="12" r="3" fill="#5fd4ff"/></g><path d="M8 24c-2 1-3 3-4 4 1-1 3-2 4-4z" fill="#ffd23f"/></svg>`;
  const startBtn = h('button', { class: 'btn go ld-start', onclick: () => launch() }, h('span', { class: 'ld-rocket', html: rocket }), 'Start mission');
  const title = h('div', { class: 'ld-title hidden' },
    h('div', { class: 'ld-patch' },
      h('div', { class: 'ld-ribbon' }, 'Astro Base · Mars · 5 Sols'),
      h('div', { class: 'ld-logo' }, h('img', { src: MISSION_LOGO, alt: 'Junior Space Commander mission logo' })),
      h('div', { class: 'ld-words' },
        h('h1', {}, h('span', { class: 'ld-jr' }, 'Junior'), h('span', { class: 'ld-big' }, 'Space Commander')),
        h('div', { class: 'ld-sub' }, 'Five sols at Astro Base, Mars'),
        h('p', {}, 'Lead four astronauts, solve problems, make smart trade-offs and collect 50 science points!'))),
    h('div', { class: 'ld-actions' }, startBtn,
      h('div', { class: 'ld-row' },
        h('button', { class: 'btn ld-sec', onclick: () => { sfx('tap'); playIntro({ fromTitle: true }); } }, "🤖 Rocky's instructions"),
        h('button', { class: 'btn ld-sec', onclick: () => onSources() }, '🛰️ Data sources'),
        soundBtn)));
  const foot = h('footer', { class: 'ld-foot hidden' }, h('img', { src: LOGO, alt: 'NASA Space Apps Challenge' }), h('span', {}, 'Made for the NASA Space Apps Challenge 2026'));
  const count = h('div', { class: 'ld-count' });
  const soundHint = h('button', { class: 'btn small ld-sound-hint hidden', onclick: (e) => { e.stopPropagation(); unmuteVideo(); } }, '🔊 Tap for sound');
  root.replaceChildren(canvas, video, presents, bubble, title, foot, skip, soundHint, count);

  // The landing video plays on every visit, if public/assets/intro.mp4 exists and the connection
  // is not known to be slow (data saver or 2G). If it does not start within START_LIMIT, or stalls
  // for longer than STALL_LIMIT, the intro moves on to the logo card by itself.
  const START_LIMIT = 3000, STALL_LIMIT = 1500;
  const slowNet = () => { const c = navigator.connection; return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')); };
  let hasVideo = false;
  const videoCheck = slowNet() ? Promise.resolve() : fetch(VIDEO, { method: 'HEAD' }).then((r) => { hasVideo = r.ok && (r.headers.get('content-type') || '').startsWith('video'); if (hasVideo) video.src = VIDEO; }).catch(() => {});
  let startTimer = 0, stallTimer = 0;
  video.addEventListener('playing', () => { clearTimeout(startTimer); clearTimeout(stallTimer); if (beat === 0.5) video.classList.add('on'); });
  video.addEventListener('waiting', () => { if (beat !== 0.5) return; clearTimeout(stallTimer); stallTimer = setTimeout(() => endVideo(), STALL_LIMIT); });
  video.addEventListener('ended', () => endVideo());
  video.muted = true;
  video.addEventListener('error', () => { if (beat === 0.5) endVideo(); });
  video.addEventListener('click', () => endVideo());

  let W = 0, H = 0, dpr = 1, raf = 0, t0 = 0, last = 0, running = false;
  let phase = 'off', beat = -1, beatAt = 0, typed = 0, launchAt = 0, autoTimer = 0;
  const v = { rise: 0, crew: 0, gauges: 0, sci: 0, rx: 0, ry: 0 };
  const crewIn = CREW_IDS.map(() => 0);
  let rockyEntry = null, crewDue = null, shoot = { at: 2 }, sciStep = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth; H = root.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  const narrow = () => W < 720;
  const titleish = () => phase === 'title' || phase === 'launch';

  /** Where the picture sits on screen right now: scale + offset. v.rise pans from the sky down to the base. */
  function cam(t) {
    const cover = Math.max(W / BG.w, H / BG.h);
    const zoom = lerp(1.4, 1, v.rise) * (1.02 + 0.02 * Math.sin(t * 0.12));
    const s = cover * zoom, iw = BG.w * s, ih = BG.h * s;
    const fy = lerp(0.1, 0.6, v.rise), anchor = titleish() ? (narrow() ? 0.6 : 0.56) : 0.55;
    const ox = Math.min(0, Math.max(W - iw, W / 2 - 0.56 * iw));
    const oy = Math.min(0, Math.max(H - ih, H * anchor - fy * ih));
    return { s, ox, oy, iw, ih, P: (x, y) => [ox + x * iw, oy + y * ih] };
  }

  const rockyHome = () => {
    if (titleish()) return narrow() ? [W * 0.84, H * 0.5] : [W - Math.max(90, W * 0.1), H * 0.5];
    return narrow() ? [W * 0.2, H * 0.17] : [W * 0.22, H * 0.3];
  };

  // ---------- Scene ----------
  function drawBackground(t, c) {
    g.fillStyle = '#1a1446'; g.fillRect(0, 0, W, H);
    if (bg.complete && bg.naturalWidth) g.drawImage(bg, c.ox, c.oy, c.iw, c.ih);
    // stars: twinkle and drift slowly across the sky part of the picture
    const drift = t * 0.006;
    for (const s of stars) {
      const [x, y] = c.P(((s.x - drift * s.depth) % 1 + 1) % 1, s.y);
      const fade = Math.pow(1 - s.y / SKY_BOTTOM, 1.2), tw = 0.45 + 0.55 * Math.sin(t * s.sp + s.ph);
      if (s.big) { star(g, x, y, (2.5 + tw * 2.5) * Math.max(0.8, c.s), 0, 4, 0.25); g.fillStyle = `rgba(255,246,220,${(0.45 + tw * 0.55) * fade})`; g.fill(); }
      else { g.fillStyle = `rgba(255,255,255,${(0.2 + tw * 0.75) * fade})`; g.fillRect(x, y, s.s, s.s); }
    }
    // shooting stars in the upper sky
    if (t > shoot.at) { shoot = { at: t + 3 + Math.random() * 4, born: t, x: 0.25 + Math.random() * 0.6, y: Math.random() * 0.16 }; if (phase === 'intro' || phase === 'title') sfx('twinkle'); }
    if (shoot.born != null && t - shoot.born < 0.9) {
      const k = (t - shoot.born) / 0.9, [bx, by] = c.P(shoot.x, shoot.y), sx = bx - k * 260, sy = by + k * 120;
      g.strokeStyle = lg(g, sx, sy, sx + 80, sy - 37, [`rgba(255,255,255,${1 - k})`, 'rgba(255,255,255,0)']); g.lineWidth = 2;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 80, sy - 37); g.stroke();
    }
    // the base lights pulse softly
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col, sp] of GLOWS) {
      const [px, py] = c.P(x, y), rad = r * c.iw * (0.85 + 0.15 * Math.sin(t * sp)), a = 0.22 + 0.18 * Math.sin(t * sp + x * 9);
      g.fillStyle = rg(g, px, py, 1, rad, [`rgba(${col},${a})`, `rgba(${col},0)`]); g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    g.restore();
    // wind-blown dust over the ground
    for (const d of dust) {
      const [x, y] = c.P((d.x + t * d.sp) % 1, d.y + Math.sin(t * 0.8 + d.ph) * 0.006);
      g.fillStyle = `rgba(255,214,170,${0.25 + 0.2 * Math.sin(t * 2 + d.ph)})`; g.beginPath(); g.arc(x, y, d.s * Math.max(1, c.s), 0, TAU); g.fill();
    }
    // darken the sky while the "presents" card shows, so the logo reads well
    const dim = (1 - v.rise) * 0.55;
    if (dim > 0.01) { g.fillStyle = `rgba(4,6,26,${dim})`; g.fillRect(0, 0, W, H); }
  }

  function drawCrew(t, c) {
    const spots = narrow() ? CREW_SPOTS.narrow : CREW_SPOTS.wide;
    const sc = (0.095 * c.ih) / 100;
    CREW_IDS.forEach((id, i) => {
      const k = crewIn[i]; if (k <= 0.01) return;
      const [x, y] = c.P(...spots[i]);
      const hop = Math.sin(Math.min(1, k) * Math.PI) * 40 * (k < 1 ? 1 : 0) + Math.max(0, Math.sin(t * 3 + i)) * 3 * (phase === 'intro' ? 1 : 0.3);
      g.save(); g.globalAlpha = Math.min(1, k * 2);
      g.fillStyle = '#3a120855'; g.beginPath(); g.ellipse(x, y + 1, 16 * sc, 5 * sc, 0, 0, TAU); g.fill();
      drawAstro(g, x, y - hop, sc, CREW[id].css, { t: t + i, wave: phase === 'intro' ? beat === 2 : ((t + i * 1.7) % 6) < 1.2, mood: 'happy' });
      if (phase === 'intro' && v.crew > 0.5) label(g, CREW[id].name, x, y - 112 * sc, { size: Math.max(13, 15 * sc), col: CREW[id].css });
      g.restore();
    });
  }

  function drawGauges(t) {
    if (v.gauges < 0.01) return;
    const n = 5, gap = 10, pw = Math.min(150, (W - 32 - (n - 1) * gap) / n), ph = pw * 0.62;
    const total = n * pw + (n - 1) * gap, x0 = (W - total) / 2, y0 = H - ph - (narrow() ? 76 : 70);
    g.save(); g.globalAlpha = Math.min(1, v.gauges);
    for (let i = 0; i < n; i++) {
      const k = back(v.gauges * 1.6 - i * 0.15), x = x0 + i * (pw + gap), y = y0 + (1 - k) * 40;
      if (k <= 0) continue;
      rr(g, x, y, pw, ph, 14); g.fillStyle = lg(g, 0, y, 0, y + ph, ['#1b2a5cf2', '#0d1535f2']); g.fill(); ink(g, 3, i === 4 ? '#ffd23f' : '#5fd4ff');
      const s = pw / 120;
      if (i < 4) {
        const [kind, name, col] = GAUGES[i];
        drawIcon(g, kind, x + 22 * s, y + ph * 0.36, 1.15 * s, col);
        label(g, name, x + pw / 2 + 12 * s, y + ph * 0.36, { size: Math.max(11, 14 * s), stroke: null });
        const fill = Math.min(1, Math.max(0, (v.gauges - 0.35 - i * 0.12) * 1.6)) * (0.8 + 0.2 * Math.sin(t * 2 + i));
        rr(g, x + 10 * s, y + ph * 0.66, pw - 20 * s, 10 * s, 5 * s); g.fillStyle = '#0008'; g.fill();
        rr(g, x + 10 * s, y + ph * 0.66, (pw - 20 * s) * fill, 10 * s, 5 * s); g.fillStyle = col; g.fill();
      } else {
        drawIcon(g, 'science', x + 22 * s, y + ph * 0.36, 1.15 * s, '#c77dff');
        label(g, 'Science', x + pw / 2 + 12 * s, y + ph * 0.36, { size: Math.max(11, 14 * s), stroke: null });
        label(g, `${Math.round(v.sci)} / 50`, x + pw / 2, y + ph * 0.72, { size: Math.max(13, 20 * s), col: '#ffd23f' });
      }
    }
    g.restore();
  }

  function rockyPose(t) {
    const [hx, hy] = rockyHome();
    let x, y, tilt = Math.sin(t * 1.6) * 0.05, flame = 0.45 + Math.sin(t * 7) * 0.1;
    if (rockyEntry != null && t - rockyEntry < 1.9) {
      const u = (t - rockyEntry) / 1.9, e = ease(u);
      x = lerp(W + 120, hx, e) + Math.sin(u * TAU) * 90 * (1 - u); y = lerp(-80, hy, e) - Math.cos(u * TAU) * 70 * (1 - u) + 70 * (1 - u);
      tilt = -0.5 * (1 - u) + Math.sin(u * TAU * 1.5) * 0.25 * (1 - u); flame = 1;
      v.rx = x; v.ry = y;
    } else {
      const k = 1 - Math.pow(0.02, last);
      v.rx = lerp(v.rx, hx, k); v.ry = lerp(v.ry, hy, k);
      if (Math.abs(v.rx - hx) + Math.abs(v.ry - hy) > 20) flame = 1;
      x = v.rx; y = v.ry + Math.sin(t * 2.2) * 7;
    }
    return { x, y, tilt, flame };
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - (frame.prev || now)) / 1000); frame.prev = now; last = dt;
    const k = 1 - Math.pow(0.04, dt);
    const intro = phase === 'intro';
    v.rise = lerp(v.rise, intro && beat < 1 ? 0 : 1, k * 0.7);
    v.gauges = lerp(v.gauges, intro && beat === 3 ? 1.3 : 0, k * (intro && beat === 3 ? 0.6 : 1.4));
    if (intro && beat === 3) {
      v.sci = Math.min(50, v.sci + dt * 22);
      const step = Math.floor(v.sci / 5);                       // tick every 5 points, ding at 50
      if (step > sciStep) { sciStep = step; sfx(step === 10 ? 'ding' : 'count', step); }
    }
    v.crew = lerp(v.crew, !intro || beat >= 2 ? 1 : 0, k);
    if (intro && beat >= 2) crewDue ??= performance.now() + 300;
    CREW_IDS.forEach((_, i) => { const due = intro ? (crewDue != null ? crewDue + i * 380 : Infinity) : 0; if (now >= due) { if (intro && crewIn[i] === 0) sfx('pop', i); crewIn[i] = Math.min(1.2, crewIn[i] + dt * 2.2); } });

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = cam(t);
    let shake = 0, zoom = 1;
    if (phase === 'launch') { const u = (now - launchAt) / 1000; shake = u < 2 ? 2 + u * 3 : 0; zoom = u > 1.9 ? 1 + ease((u - 1.9) / 0.9) * 7 : 1; }
    g.save();
    if (shake) g.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
    if (zoom > 1) { const [dx, dy] = c.P(...DOOR); g.translate(dx, dy); g.scale(zoom, zoom); g.translate(-dx, -dy); }
    drawBackground(t, c);
    drawCrew(t, c);
    drawGauges(t);
    if (phase !== 'off' && rockyEntry != null && t >= rockyEntry) {
      const p = rockyPose(t), s = Math.min(1.5, Math.max(0.85, Math.min(W, H) / 520));
      const talking = intro && beat >= 1 && typed < LINES[beat - 1].length;
      drawRocky(g, p.x, p.y, s * (titleish() && narrow() ? 0.8 : 1), t, { talk: talking, wave: (intro && beat === 1 && (now - beatAt) < 1600) || (phase === 'title' && (t % 7) < 1.4), salute: intro && beat === 4, flame: p.flame, tilt: p.tilt });
      placeBubble(p.x, p.y, s);
    }
    g.restore();
    if (phase === 'launch') { const u = (now - launchAt) / 1000; if (u > 2.1) { g.fillStyle = `rgba(5,10,28,${Math.min(1, (u - 2.1) / 0.6)})`; g.fillRect(0, 0, W, H); } }
    if (intro && beat >= 1) {
      const line = LINES[beat - 1], want = Math.min(line.length, Math.max(0, Math.floor((now - beatAt) / 26)));
      if (want !== typed) {
        // Rocky's voice follows the typing: a chirp every few letters, an end chirp on the last one.
        if (want === line.length) sfx('syllEnd', /\?\s*$/.test(line) ? '?' : /!\s*$/.test(line) ? '!' : '.');
        else if (want - typed < 4 && (want >> 2) !== (typed >> 2) && /\w/.test(line[want - 1])) sfx('syll', want >> 2);
        typed = want; bubbleText.textContent = line.slice(0, typed);
      }
    }
  }

  function placeBubble(rx, ry, s) {
    if (bubble.classList.contains('hidden')) return;
    if (narrow()) { bubble.style.left = '16px'; bubble.style.right = '16px'; bubble.style.top = `${ry + 70 * s}px`; bubble.dataset.tail = 'up'; }
    else { bubble.style.left = `${rx + 70 * s}px`; bubble.style.right = 'auto'; bubble.style.top = `${ry - 70 * s}px`; bubble.dataset.tail = 'left'; }
  }

  // ---------- Flow ----------
  // Order: landing video (beat 0.5, if any) -> "presents" logo card (beat 0) -> Rocky's lines (1..4).
  // -0.5 = waiting to learn whether the video exists.
  function setBeat(n) {
    beat = n; beatAt = performance.now(); typed = 0;
    clearTimeout(autoTimer);
    if (n === 0) { music.play('title'); sfx('reveal'); presents.classList.remove('hidden'); bubble.classList.add('hidden'); skip.textContent = 'Skip intro ⏭'; autoTimer = setTimeout(() => setBeat(1), 2600); return; }
    presents.classList.add('hidden');
    skip.textContent = 'Skip intro ⏭';
    if (n === 1 && rockyEntry == null) {
      rockyEntry = (performance.now() - t0) / 1000; beatAt += 1500;
      sfx('pan'); sfx('jet');
      bubble.classList.add('hidden'); setTimeout(() => { if (phase === 'intro' && beat === 1) { bubble.classList.remove('hidden'); pop(); } }, 1500);
    } else { bubble.classList.remove('hidden'); pop(); }
    if (n === 3) { v.sci = 0; sciStep = 0; for (let i = 0; i < 5; i++) setTimeout(() => { if (phase === 'intro' && beat === 3) sfx('slide'); }, 120 + i * 90); }
    if (n === 4) setTimeout(() => { if (phase === 'intro' && beat === 4) sfx('tada'); }, 250);
    bubbleText.textContent = '';
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === n - 1));
    backBtn.disabled = n <= 1;
    nextBtn.textContent = n === LINES.length ? "Let's go! ▶" : 'Next ▶';
    autoTimer = setTimeout(nextBeat, Math.max(0, beatAt - performance.now()) + BEAT_MS + LINES[n - 1].length * 12);
  }
  const pop = () => { bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); };

  // The video opens the intro. Near its end it fades out with a gentle push while the logo card
  // fades in over the dimmed sky; the logo card then pans down to the base where Rocky arrives.
  let videoTimer = 0;
  function playVideo() {
    clearTimeout(autoTimer); clearTimeout(videoTimer);
    beat = 0.5; v.rise = 0;
    skip.textContent = 'Skip video ⏭';
    video.classList.remove('hidden', 'out', 'on'); video.currentTime = 0;
    video.muted = !sound.on; music.stop();
    // fade in only once frames really play (see the 'playing' listener); give up if it never starts
    clearTimeout(startTimer); startTimer = setTimeout(() => endVideo(), START_LIMIT);
    video.play().catch(() => {
      // Browsers block sound before the first tap: play muted and offer "Tap for sound".
      video.muted = true; video.play().then(() => { if (sound.on && beat === 0.5) soundHint.classList.remove('hidden'); }, () => endVideo());
    });
  }
  /** The first tap or key press during a muted video turns its sound on. */
  function unmuteVideo() {
    if (beat !== 0.5 || !video.muted || !sound.on) return;
    video.muted = false; soundHint.classList.add('hidden');
  }
  window.addEventListener('pointerdown', unmuteVideo, true);
  window.addEventListener('keydown', unmuteVideo, true);
  function endVideo() {
    if (beat !== 0.5) return;
    clearTimeout(startTimer); clearTimeout(stallTimer); soundHint.classList.add('hidden');
    video.classList.remove('on'); video.classList.add('out');
    setBeat(0);
    clearTimeout(videoTimer);
    videoTimer = setTimeout(() => { video.pause(); video.classList.add('hidden'); video.classList.remove('out'); }, 1300);
  }
  video.addEventListener('timeupdate', () => { if (beat === 0.5 && video.duration && video.duration - video.currentTime < 0.7) endVideo(); });

  function nextBeat() {
    if (phase !== 'intro' || beat < 1) return;
    // first tap finishes the typing, second moves on
    if (typed < LINES[beat - 1].length && performance.now() > beatAt) { beatAt = -1e9; return; }
    if (beat >= LINES.length) return toTitle();
    setBeat(beat + 1);
  }
  function prevBeat() {
    if (phase !== 'intro' || beat <= 1) return;
    sfx('tap'); setBeat(beat - 1);
  }

  function toTitle() {
    clearTimeout(autoTimer);
    clearTimeout(videoTimer); soundHint.classList.add('hidden'); video.pause(); video.classList.add('hidden'); video.classList.remove('on', 'out');
    phase = 'title'; beat = -1;
    CREW_IDS.forEach((_, i) => { crewIn[i] = Math.max(crewIn[i], 1); });
    if (rockyEntry == null) { rockyEntry = (performance.now() - t0) / 1000 - 5; const [hx, hy] = rockyHome(); v.rx = hx; v.ry = hy - 300; }
    presents.classList.add('hidden'); bubble.classList.add('hidden'); skip.classList.add('hidden');
    title.classList.remove('hidden'); foot.classList.remove('hidden');
    title.classList.remove('in'); void title.offsetWidth; title.classList.add('in');
    music.play('title');
    sfx('reveal');
  }

  /** From the title, "Rocky's instructions" goes straight to Rocky (no logo card or video). */
  function playIntro({ fromTitle = false } = {}) {
    phase = 'intro'; crewDue = null; v.sci = 0; CREW_IDS.forEach((_, i) => { crewIn[i] = 0; });
    title.classList.add('hidden'); foot.classList.add('hidden'); skip.classList.remove('hidden');
    if (fromTitle) { music.play('title'); return setBeat(1); }
    rockyEntry = null; v.rise = 0; beat = -0.5; bubble.classList.add('hidden');
    videoCheck.then(() => { if (phase === 'intro' && beat === -0.5) { if (hasVideo) playVideo(); else setBeat(0); } });
  }

  function launch() {
    if (phase !== 'title') return;
    phase = 'launch'; launchAt = performance.now();
    title.classList.add('hidden'); foot.classList.add('hidden');
    music.stop(); sfx('tick');
    ['3', '2', '1', 'LIFT-OFF!'].forEach((n, i) => setTimeout(() => {
      count.textContent = n; count.classList.remove('go'); void count.offsetWidth; count.classList.add('go');
      sfx(i === 3 ? 'liftoff' : 'tick');
    }, i * 600));
    setTimeout(() => { count.textContent = ''; hide(); onStart(); }, 2800);
  }

  canvas.addEventListener('click', () => { if (phase === 'intro' && beat >= 1) nextBeat(); });
  const onKey = (e) => {
    if (root.classList.contains('hidden') || e.repeat) return;
    if (phase === 'intro') {
      if (e.code === 'Escape') { e.preventDefault(); toTitle(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); prevBeat(); }
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (beat === 0.5) endVideo(); else if (beat === 0) setBeat(1); else if (beat >= 1) nextBeat();
      }
    } else if (phase === 'title' && e.code === 'Enter' && document.activeElement?.tagName !== 'BUTTON' && $('#modal').classList.contains('hidden')) launch();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { if (running) resize(); });

  function show({ intro = true } = {}) {
    root.classList.remove('hidden');
    resize();
    v.gauges = 0; v.crew = 0;
    if (!running) { running = true; t0 = performance.now(); frame.prev = 0; raf = requestAnimationFrame(frame); }
    if (intro) playIntro(); else { phase = 'title'; v.rise = 1; rockyEntry = null; toTitle(); }
  }
  function hide() {
    phase = 'off'; clearTimeout(autoTimer); video.pause();
    root.classList.add('hidden'); running = false; cancelAnimationFrame(raf);
  }
  return { show, hide };
}
