// Shared drawing helpers and animated illustrations (all drawn in code, no image files).
// Used by the mini-games, the fact cards and the daily crisis cards.
import { G } from './ui.js';

export const INK = '#1d2547';
export const TAU = Math.PI * 2;

/** A sharp (2x) canvas you draw on in CSS pixels. It shrinks to fit narrow screens. */
export function cv(w, h, cls = 'art') {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2; c.className = cls;
  c.style.width = w + 'px'; c.style.maxWidth = '100%'; c.style.aspectRatio = `${w} / ${h}`;
  const g = c.getContext('2d');
  g.scale(2, 2); g.lineJoin = g.lineCap = 'round';
  return { c, g, w, h };
}

/** Animate a canvas: draw(g, seconds, dt). Stops by itself once the canvas leaves the page. */
export function loop(c, draw) {
  const g = c.getContext('2d');
  let seen = false, stopped = false, raf = 0;
  const t0 = performance.now(); let last = t0, elapsed = 0;
  const tick = (now) => {
    if (stopped) return;
    if (c.isConnected) seen = true; else if (seen || now - t0 > 10000) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    if (c.isConnected && !G.paused && !G.helpOpen && !document.hidden) { elapsed += dt; draw(g, elapsed, dt); }
    last = now;
  };
  draw(g, 0, 0);
  raf = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

/** Pointer position on a cv() canvas, in its drawing units. */
export function pointerOn(c, e, w) { const r = c.getBoundingClientRect(), k = w / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; }

export const rnd = (seed) => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export function ink(g, w = 3, col = INK) { g.lineWidth = w; g.strokeStyle = col; g.stroke(); }
export function lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; }
export function rg(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; }
export function label(g, text, x, y, { size = 15, col = '#fff', align = 'center', stroke = INK } = {}) {
  g.font = `700 ${size}px "Baloo 2", "Trebuchet MS", sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = 4; g.strokeStyle = stroke; g.strokeText(text, x, y); }
  g.fillStyle = col; g.fillText(text, x, y);
}
export function star(g, x, y, r, rot = 0, points = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / points, q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath();
}

/** Cartoon astronaut, feet at (x, y). mood: 'ok' | 'sick' | 'happy'. */
export function drawAstro(g, x, y, s, col, { t = 0, mood = 'ok', wave = false } = {}) {
  if (G.reducedMotion) { t = 0; wave = false; }
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const dx of [-9, 9]) { rr(g, dx - 6, -20, 12, 18, 5); g.fillStyle = '#f4f6fb'; g.fill(); ink(g, 2); rr(g, dx - 7, -8, 14, 9, 4); g.fillStyle = col; g.fill(); ink(g, 2); }
  g.translate(0, Math.sin(t * 2.2) * (mood === 'happy' ? 2.5 : 1.2));
  rr(g, -19, -50, 38, 26, 7); g.fillStyle = '#9aa7c4'; g.fill(); ink(g, 2);
  rr(g, -15, -52, 30, 34, 10); g.fillStyle = lg(g, -15, 0, 15, 0, ['#fff', '#d5dcee']); g.fill(); ink(g, 2);
  g.fillStyle = col; g.fillRect(-14, -29, 28, 5);
  rr(g, -8, -45, 16, 10, 3); g.fillStyle = '#2b3559'; g.fill();
  [['#58d66b', -6], ['#ffd23f', -1.5], ['#ff5a5a', 3]].forEach(([c, dx]) => { g.fillStyle = c; g.fillRect(dx, -42, 3, 4); });
  const arm = (dx, rot) => { g.save(); g.translate(dx, -48); g.rotate(rot); rr(g, -5, 0, 10, 20, 5); g.fillStyle = '#f4f6fb'; g.fill(); ink(g, 2); g.beginPath(); g.arc(0, 20, 5.5, 0, TAU); g.fillStyle = col; g.fill(); ink(g, 2); g.restore(); };
  arm(-18, 0.18 + Math.sin(t * 2) * 0.05);
  arm(18, wave || mood === 'happy' ? -2.5 + Math.sin(t * 9) * 0.35 : -0.18);
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(11, -88); g.lineTo(16, -97); g.stroke();
  g.beginPath(); g.arc(16, -98, 3.2, 0, TAU); g.fillStyle = col; g.fill(); ink(g, 1.5);
  g.beginPath(); g.arc(0, -70, 22, 0, TAU); g.fillStyle = lg(g, -18, -90, 18, -50, ['#fff', '#cfd7ea']); g.fill(); ink(g, 2);
  g.beginPath(); g.ellipse(0, -69, 16.5, 14, 0, 0, TAU); g.fillStyle = lg(g, 0, -83, 0, -55, ['#3156b8', '#0c1434']); g.fill(); ink(g, 2);
  const blink = (t % 3.2) < 0.12;
  g.fillStyle = '#fff';
  for (const dx of [-6, 6]) { g.beginPath(); g.ellipse(dx, -71, 2.7, blink ? 0.5 : mood === 'sick' ? 2 : 3.6, 0, 0, TAU); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.beginPath();
  if (mood === 'sick') g.arc(0, -59, 5, Math.PI * 1.15, Math.PI * 1.85); else g.arc(0, -67, mood === 'happy' ? 7 : 5.5, Math.PI * 0.18, Math.PI * 0.82);
  g.stroke();
  if (mood === 'sick') { g.fillStyle = '#9fe8ff'; g.beginPath(); g.ellipse(13, -76 + ((t * 14) % 10), 2, 3, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#ffffff88'; g.beginPath(); g.ellipse(-8, -78, 5, 2.4, -0.5, 0, TAU); g.fill();
  g.restore();
}

/** Small side-view rover for illustrations. */
export function drawRover(g, x, y, s, t = 0, dark = false) {
  g.save(); g.translate(x, y + Math.sin(t * 9) * 0.5); g.scale(s, s);
  const body = dark ? '#1a1320' : '#f2f4f8', acc = dark ? '#1a1320' : '#ff8a3c', wheel = dark ? '#1a1320' : '#2a2f3d';
  rr(g, -26, -22, 52, 12, 4); g.fillStyle = body; g.fill(); if (!dark) ink(g, 2);
  rr(g, -8, -34, 24, 14, 5); g.fillStyle = dark ? body : '#2c4aa3'; g.fill(); if (!dark) ink(g, 2);
  g.fillStyle = acc; g.fillRect(-25, -15, 50, 3);
  g.save(); g.translate(-18, -24); g.rotate(-0.25); rr(g, -14, -4, 24, 5, 1.5); g.fillStyle = dark ? body : '#2a64d8'; g.fill(); if (!dark) ink(g, 1.5); g.restore();
  g.strokeStyle = dark ? body : INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(20, -30); g.lineTo(20, -46); g.stroke();
  rr(g, 14, -52, 12, 8, 2); g.fillStyle = body; g.fill(); if (!dark) ink(g, 2);
  for (const dx of [-20, 0, 20]) {
    g.beginPath(); g.arc(dx, -5, 8, 0, TAU); g.fillStyle = wheel; g.fill(); if (!dark) ink(g, 2);
    if (!dark) { g.strokeStyle = '#9aa7c4'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; g.beginPath(); g.moveTo(dx, -5); g.lineTo(dx + Math.cos(a) * 6, -5 + Math.sin(a) * 6); g.stroke(); } }
  }
  g.restore();
}

function marsLand(g, w, h, { sky = ['#f7c896', '#ec9f66'], hills = '#a8432a', ground = ['#c7532f', '#9c3a22'], horizon = 0.66 } = {}) {
  const y0 = h * horizon;
  g.fillStyle = lg(g, 0, 0, 0, y0, sky); g.fillRect(0, 0, w, h);
  g.fillStyle = hills; g.beginPath(); g.moveTo(0, y0 + 2);
  for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 - 9 - Math.sin(x * 0.021) * 9 - Math.sin(x * 0.057 + 1) * 5);
  g.lineTo(w, y0 + 2); g.fill();
  g.fillStyle = lg(g, 0, y0, 0, h, ground); g.fillRect(0, y0, w, h - y0);
  return y0;
}

function stars(g, w, h, t, n = 60, seed = 7) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 3) + i); g.fillStyle = `rgba(255,255,255,${0.25 + tw * 0.7})`; g.fillRect(x, y, 1.6, 1.6); }
}

const SCENES = {
  title(g, w, h, t) {
    g.fillStyle = lg(g, 0, 0, 0, h, ['#070b22', '#1b1f55']); g.fillRect(0, 0, w, h); stars(g, w, h, t, 90);
    g.beginPath(); g.arc(w / 2, h + 150, 250, 0, TAU); g.fillStyle = rg(g, w / 2 - 70, h - 60, 20, 300, ['#ff9a5a', '#c2452d', '#6e2415']); g.fill();
    g.fillStyle = '#a5391f77'; [[-90, -22, 30, 9], [40, -40, 44, 12], [120, -8, 26, 8]].forEach(([dx, dy, a, b]) => { g.beginPath(); g.ellipse(w / 2 + dx, h + dy, a, b, 0, 0, TAU); g.fill(); });
    g.beginPath(); g.arc(w / 2 - 20, h - 92, 22, Math.PI, 0); g.fillStyle = '#9fe8ffaa'; g.fill(); ink(g, 2, '#e9eef7');
    g.fillStyle = rg(g, w / 2 - 20, h - 96, 2, 26, ['#fff6c8', '#fff6c800']); g.fillRect(w / 2 - 50, h - 124, 60, 40);
    const a = t * 0.5, ox = w / 2 + Math.cos(a) * 250, oy = 70 + Math.sin(a) * 26;
    g.save(); g.translate(ox, oy); g.rotate(Math.cos(a) * 0.3 + Math.PI / 2 * (Math.sin(a) > 0 ? -1 : 1));
    g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(-5, 12); g.lineTo(0, 22 + Math.sin(t * 30) * 4); g.lineTo(5, 12); g.fill();
    rr(g, -7, -14, 14, 28, 7); g.fillStyle = '#f2f4f8'; g.fill(); ink(g, 2); g.beginPath(); g.arc(0, -4, 3.5, 0, TAU); g.fillStyle = '#5fd4ff'; g.fill(); ink(g, 1.5);
    g.fillStyle = '#ff5a5a'; g.beginPath(); g.moveTo(-7, 6); g.lineTo(-13, 15); g.lineTo(-7, 13); g.fill(); g.beginPath(); g.moveTo(7, 6); g.lineTo(13, 15); g.lineTo(7, 13); g.fill();
    g.restore();
  },
  volcano(g, w, h, t) {
    const y0 = marsLand(g, w, h, { horizon: 0.8 });
    g.beginPath(); g.moveTo(40, y0 + 2); g.bezierCurveTo(170, y0 - 20, 230, 44, 290, 40); g.lineTo(310, 48); g.lineTo(340, 48); g.lineTo(360, 40);
    g.bezierCurveTo(430, 44, 500, y0 - 20, 610, y0 + 2); g.closePath(); g.fillStyle = lg(g, 0, 40, 0, y0, ['#d9774c', '#8f3a24']); g.fill(); ink(g, 3);
    g.strokeStyle = '#7a2f1c88'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(250 + i * 28, 62 + (i % 2) * 8); g.lineTo(200 + i * 50, y0 - 12); g.stroke(); }
    g.fillStyle = '#ffffff66'; for (let i = 0; i < 4; i++) { const x = ((t * 14 + i * 190) % (w + 160)) - 80; g.beginPath(); g.ellipse(x, 86 + i * 9, 46, 8, 0, 0, TAU); g.fill(); }
    const ex = 560, eh = (y0 - 40) * 8.8 / 22;
    g.beginPath(); g.moveTo(ex - 34, y0 + 2); g.lineTo(ex, y0 - eh); g.lineTo(ex + 34, y0 + 2); g.closePath(); g.fillStyle = '#6b7896'; g.fill(); ink(g, 2.5);
    g.beginPath(); g.moveTo(ex - 9, y0 - eh + 14); g.lineTo(ex, y0 - eh); g.lineTo(ex + 9, y0 - eh + 14); g.lineTo(ex + 3, y0 - eh + 10); g.lineTo(ex - 3, y0 - eh + 15); g.closePath(); g.fillStyle = '#fff'; g.fill();
    label(g, 'Olympus Mons · 22 km', 325, 22, { size: 17, col: '#ffd23f' }); label(g, 'Everest · 9 km', ex, y0 - eh - 14, { size: 13 });
    drawRover(g, 110 + Math.sin(t * 0.4) * 30, h - 8, 0.55, t);
  },
  storm(g, w, h, t) {
    const y0 = marsLand(g, w, h, { sky: ['#c98a55', '#b06a3e'], hills: '#8c4428', ground: ['#b5552f', '#8a3a22'] });
    g.beginPath(); g.arc(470, 46, 22, 0, TAU); g.fillStyle = '#ffe9b855'; g.fill(); g.beginPath(); g.arc(470, 46, 13, 0, TAU); g.fillStyle = '#fff2cfaa'; g.fill();
    drawRover(g, 250, y0 + 44, 1.1, 0);
    g.fillStyle = '#d9a06677'; rr(g, 222, y0 + 12, 30, 7, 2); g.fill();
    for (let l = 0; l < 5; l++) {
      g.fillStyle = `rgba(214,150,96,${0.2 + l * 0.05})`; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 14) g.lineTo(x, 40 + l * 26 + Math.sin(x * 0.018 + t * (0.8 + l * 0.35) + l * 2) * 16 + Math.sin(x * 0.05 - t * 1.4) * 5);
      g.lineTo(w, h); g.fill();
    }
    g.strokeStyle = '#f3c99a99'; g.lineWidth = 2; const r = rnd(5);
    for (let i = 0; i < 26; i++) { const x = (r() * w + t * (160 + r() * 200)) % (w + 60) - 30, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + r() * 20, y - 2); g.stroke(); }
  },
  salad(g, w, h, t) {
    g.fillStyle = lg(g, 0, 0, 0, h, ['#2a3566', '#141a3a']); g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3d4a85'; g.lineWidth = 2; for (let x = 40; x < w; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.save(); g.beginPath(); g.arc(110, 86, 58, 0, TAU); g.clip(); g.fillStyle = '#050818'; g.fillRect(40, 20, 140, 140); stars(g, 220, 160, t, 30, 3);
    g.beginPath(); g.arc(120, 180, 96, 0, TAU); g.fillStyle = rg(g, 100, 110, 10, 110, ['#7fd0ff', '#2a64d8']); g.fill();
    g.fillStyle = '#58d66baa'; g.beginPath(); g.ellipse(96 + Math.sin(t * 0.2) * 8, 122, 26, 12, 0.3, 0, TAU); g.fill(); g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(140, 104, 28, 6, -0.2, 0, TAU); g.fill();
    g.restore(); g.beginPath(); g.arc(110, 86, 58, 0, TAU); ink(g, 7, '#aab8dc'); ink(g, 2);
    for (let i = 0; i < 5; i++) { const x = 250 + i * 76; rr(g, x - 26, h - 46, 52, 24, 8); g.fillStyle = '#e9e3c9'; g.fill(); ink(g, 2.5);
      for (let k = -1; k <= 1; k++) { g.save(); g.translate(x + k * 9, h - 44); g.rotate(k * 0.5 + Math.sin(t * 1.6 + i + k) * 0.08); g.beginPath(); g.ellipse(0, -16, 8, 18, 0, 0, TAU); g.fillStyle = k ? '#3fc45a' : '#7be08a'; g.fill(); ink(g, 2); g.restore(); } }
    g.fillStyle = '#ff7ad566'; g.fillRect(224, 30, 392, 8); g.fillStyle = rg(g, 420, 34, 10, 240, ['#ff7ad533', '#ff7ad500']); g.fillRect(200, 30, 440, 130);
    for (let i = 0; i < 3; i++) { g.save(); g.translate(300 + i * 120 + Math.sin(t * 0.7 + i * 2) * 20, 82 + Math.cos(t * 0.9 + i) * 14); g.rotate(t * (0.5 + i * 0.2) + i);
      g.beginPath(); g.ellipse(0, 0, 18, 11, 0, 0, TAU); g.fillStyle = '#7be08a'; g.fill(); ink(g, 2); g.strokeStyle = '#2e8f43'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.restore(); }
  },
  radiation(g, w, h, t) {
    g.fillStyle = '#060818'; g.fillRect(0, 0, w, h); stars(g, w, h, t, 70, 11);
    const pulse = 1 + Math.sin(t * 3) * 0.06;
    g.fillStyle = rg(g, 0, h / 2, 30, 190 * pulse, ['#fff3b0', '#ffb347aa', '#ff5a0000']); g.fillRect(0, 0, 260, h);
    g.beginPath(); g.arc(-10, h / 2, 74, 0, TAU); g.fillStyle = rg(g, 10, h / 2 - 10, 5, 80, ['#fffbe0', '#ffc94a', '#ff8a3c']); g.fill();
    for (let i = 0; i < 7; i++) { const y = 22 + i * 24, ph = t * 5 + i; g.strokeStyle = `rgba(255,${150 + i * 10},80,.8)`; g.lineWidth = 2.5; g.beginPath();
      for (let x = 70; x < 480; x += 6) { const yy = y + Math.sin(x * 0.07 - ph) * 5; x === 70 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
    g.beginPath(); g.arc(560, h + 60, 150, 0, TAU); g.fillStyle = rg(g, 520, h - 40, 10, 170, ['#ff9a5a', '#c2452d', '#6e2415']); g.fill();
    g.beginPath(); g.arc(548, h - 84, 16, Math.PI, 0); g.fillStyle = '#e9eef7'; g.fill(); ink(g, 2);
    g.strokeStyle = `rgba(95,212,255,${0.55 + Math.sin(t * 8) * 0.3})`; g.lineWidth = 4; g.beginPath(); g.arc(548, h - 80, 46, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
    g.fillStyle = '#5fd4ff22'; g.beginPath(); g.arc(548, h - 80, 46, Math.PI, 0); g.fill();
    const r = rnd(9); g.fillStyle = '#fff6c8';
    for (let i = 0; i < 20; i++) { const x = 80 + ((r() * 420 + t * (120 + r() * 160)) % 420), y = 14 + r() * (h - 28); g.fillRect(x, y, 4, 1.6); }
  },
  sunset(g, w, h, t) {
    g.fillStyle = lg(g, 0, 0, 0, h * 0.72, ['#2c3550', '#6d6a78', '#b98e78']); g.fillRect(0, 0, w, h);
    const sx = 400, sy = h * 0.6 + Math.sin(t * 0.3) * 3;
    g.fillStyle = rg(g, sx, sy, 4, 150, ['#e6f4ff', '#7fb8f0cc', '#5a8ad000']); g.fillRect(sx - 160, sy - 160, 320, 320);
    g.beginPath(); g.arc(sx, sy, 9, 0, TAU); g.fillStyle = '#fff'; g.fill();
    g.fillStyle = '#3a2130'; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) g.lineTo(x, h * 0.72 - Math.sin(x * 0.013 + 2) * 16 - Math.sin(x * 0.04) * 6 - (x < 180 ? (180 - x) * 0.3 : 0));
    g.lineTo(w, h); g.fill();
    g.fillStyle = '#1a1320'; g.fillRect(0, h * 0.86, w, h);
    drawRover(g, 150 + Math.sin(t * 0.3) * 12, h * 0.86 + 2, 0.9, t, true);
    stars(g, w, h * 0.35, t, 24, 21);
  },
  power(g, w, h, t) {
    g.fillStyle = lg(g, 0, 0, 0, h, ['#1b2a5c', '#0d1535']); g.fillRect(0, 0, w, h);
    const lvl = 0.3 + Math.abs(Math.sin(t * 0.8)) * 0.25, flick = Math.sin(t * 23) > 0.2 || Math.sin(t * 3.1) > 0;
    rr(g, 60, 50, 170, 90, 12); g.fillStyle = '#0a0f24'; g.fill(); ink(g, 5, '#9fb4d8'); rr(g, 232, 78, 14, 34, 4); g.fillStyle = '#9fb4d8'; g.fill();
    rr(g, 70, 60, 150 * lvl, 70, 6); g.fillStyle = lvl < 0.4 ? '#ff5a5a' : '#ffd23f'; g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(152, 62); g.lineTo(128, 100); g.lineTo(146, 100); g.lineTo(136, 130); g.lineTo(166, 88); g.lineTo(148, 88); g.closePath(); g.fill(); ink(g, 2.5);
    g.strokeStyle = '#5fd4ff'; g.lineWidth = 3; g.setLineDash([8, 8]); g.lineDashOffset = -t * 40;
    [[h * 0.19], [h * 0.5], [h * 0.81]].forEach(([y]) => { g.beginPath(); g.moveTo(250, 95); g.bezierCurveTo(330, 95, 330, y, 410, y); g.stroke(); }); g.setLineDash([]);
    [['🌱', 'Greenhouse lights', h * 0.19], ['🔬', 'Science lab', h * 0.5], ['🏠', 'Base systems', h * 0.81]].forEach(([ic, name, y], i) => {
      rr(g, 410, y - 19, 190, 38, 12); g.fillStyle = flick || i === 2 ? '#24407a' : '#16224a'; g.fill(); ink(g, 3, '#5fd4ff');
      g.font = '22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ic, 436, y + 1); label(g, name, 458, y + 1, { size: 15, align: 'left', stroke: null });
    });
    if (Math.sin(t * 6) > 0) { g.beginPath(); g.moveTo(40, 30); g.lineTo(58, 60); g.lineTo(22, 60); g.closePath(); g.fillStyle = '#ffd23f'; g.fill(); ink(g, 2.5); label(g, '!', 40, 49, { size: 16, col: INK, stroke: null }); }
  },
  cold(g, w, h, t) {
    const y0 = marsLand(g, w, h, { sky: ['#0d1535', '#39406e'], hills: '#3d3050', ground: ['#6a4a66', '#3d2a45'] }); stars(g, w, y0 - 20, t, 60, 13);
    g.beginPath(); g.arc(210, y0 + 26, 62, Math.PI, 0); g.fillStyle = '#9fe8ff55'; g.fill(); ink(g, 3, '#e9eef7');
    g.fillStyle = '#3fc45a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(170 + i * 16, y0 + 20, 7, 14 + (i % 2) * 5, 0, 0, TAU); g.fill(); }
    rr(g, 290, y0 - 24, 150, 52, 12); g.fillStyle = '#e9eef7'; g.fill(); ink(g, 3);
    for (let i = 0; i < 3; i++) { rr(g, 304 + i * 44, y0 - 12, 30, 20, 5); g.fillStyle = `rgba(255,210,63,${0.65 + Math.sin(t * 2 + i) * 0.25})`; g.fill(); ink(g, 2); }
    g.fillStyle = '#e8f4ffcc'; const r = rnd(4);
    for (let i = 0; i < 40; i++) { const x = (r() * w + Math.sin(t + i) * 8), y = (r() * h + t * (14 + r() * 20)) % h, s = 1.5 + r() * 2.5; star(g, x, y, s * 1.6, t + i, 4, 0.3); g.fill(); }
    rr(g, 520, 26, 26, 120, 13); g.fillStyle = '#fff'; g.fill(); ink(g, 3); g.beginPath(); g.arc(533, 148, 20, 0, TAU); g.fillStyle = '#5fd4ff'; g.fill(); ink(g, 3);
    rr(g, 528, 112 + Math.sin(t * 2) * 3, 10, 30, 5); g.fillStyle = '#5fd4ff'; g.fill(); label(g, '−60 °C', 590, 60, { size: 20, col: '#9fe8ff' });
  },
  route(g, w, h, t) {
    g.fillStyle = lg(g, 0, 0, 0, h, ['#b5482a', '#8f3a24']); g.fillRect(0, 0, w, h);
    const r = rnd(8); for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 18, 4 + r() * 9, r(), 0, TAU); g.fillStyle = i % 3 ? '#a03f2555' : '#d2683f55'; g.fill(); }
    const base = [70, h - 50], sites = [[250, 60], [420, 130], [570, 50]];
    const path = (pts, col, off) => { g.strokeStyle = col; g.lineWidth = 5; g.setLineDash([12, 10]); g.lineDashOffset = -t * 40; g.beginPath(); g.moveTo(base[0], base[1] + off); pts.forEach(([x, y]) => g.lineTo(x, y + off)); g.stroke(); g.setLineDash([]); };
    path(sites, '#ffd23f', 0); path(sites.slice(0, 2), '#5fd4ff', 8);
    sites.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, 17, 0, TAU); g.fillStyle = '#1b2a5c'; g.fill(); ink(g, 4, '#5fd4ff'); label(g, String(i + 1), x, y + 1, { size: 18, stroke: null }); });
    rr(g, base[0] - 34, base[1] - 22, 68, 44, 12); g.fillStyle = '#e9eef7'; g.fill(); ink(g, 3); label(g, 'BASE', base[0], base[1] + 1, { size: 15, col: INK, stroke: null });
    label(g, 'Full route: 3 sites', 500, h - 44, { size: 15, col: '#ffd23f' }); label(g, 'Short trip: 2 sites', 500, h - 20, { size: 15, col: '#9fe8ff' });
    const all = [base, ...sites], seg = (t * 0.45) % 3, i = Math.floor(seg), f = seg - i;
    drawRover(g, all[i][0] + (all[i + 1][0] - all[i][0]) * f, all[i][1] + (all[i + 1][1] - all[i][1]) * f + 8, 0.5, t);
  },
};

/** An animated illustration for a fact card, crisis card or the title screen. */
export function scene(kind, w = 640, h = 180) {
  const { c } = cv(w, h, 'art scene');
  const draw = SCENES[kind] || SCENES.volcano;
  loop(c, (g, t) => { g.clearRect(0, 0, w, h); draw(g, w, h, G.reducedMotion ? 0 : t); });
  return c;
}

/** Confetti burst over an element (used on "task complete"). */
export function confetti(host) {
  if (G.reducedMotion) return;
  const w = host.clientWidth || 600, h = host.clientHeight || 400;
  const { c } = cv(w, h, 'confetti');
  c.style.width = '100%'; c.style.height = '100%';
  const cols = ['#ffd23f', '#5fd4ff', '#58d66b', '#ff5a7a', '#c77dff', '#ff8a3c'];
  const bits = Array.from({ length: 90 }, (_, i) => ({ x: w / 2 + (Math.random() - 0.5) * 80, y: h * 0.35, vx: (Math.random() - 0.5) * 520, vy: -180 - Math.random() * 360, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: 5 + Math.random() * 6, c: cols[i % cols.length], star: i % 4 === 0 }));
  host.append(c);
  const stop = loop(c, (g, t, dt) => {
    g.clearRect(0, 0, w, h);
    for (const b of bits) {
      b.vy += 620 * dt; b.vx *= 0.985; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.globalAlpha = Math.max(0, 1 - t / 2.6); g.fillStyle = b.c;
      if (b.star) { star(g, 0, 0, b.s); g.fill(); } else g.fillRect(-b.s / 2, -b.s / 3, b.s, b.s * 0.66);
      g.restore();
    }
    if (t > 2.7) { stop(); c.remove(); }
  });
}
