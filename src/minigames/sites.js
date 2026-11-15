// The small hands-on task at each rover sample site. Each returns a Promise of the mistakes made.
import { h, sfx, shuffle } from '../ui.js';
import { cv, loop, pointerOn, rnd, rr, ink, lg, rg, label, star, drawAstro, drawRover, TAU } from '../art.js';

export function siteShell(root, title, build) {
  return new Promise((resolve) => {
    let mistakes = 0;
    const body = h('div', { class: 'term-body' });
    const box = h('div', { class: 'rv-task' }, h('div', { class: 'term' }, h('div', { class: 'term-bar' }, h('span', { class: 'leds' }, h('i'), h('i'), h('i')), h('span', { class: 'who' }, 'Charles'), title), body));
    root.append(box);
    build(body, {
      miss: () => { mistakes++; sfx('bad'); },
      found: (text, doneTitle = '✔ SAMPLE COLLECTED') => {
        sfx('win');
        const { c } = cv(150, 120);
        loop(c, (g, t) => { g.clearRect(0, 0, 150, 120); g.fillStyle = rg(g, 75, 60, 4, 70, ['#5fd4ff66', '#5fd4ff00']); g.fillRect(0, 0, 150, 120); for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * TAU / 6; star(g, 75 + Math.cos(a) * 52, 52 + Math.sin(a) * 34, 5 + Math.sin(t * 4 + i) * 2, t, 4, 0.35); g.fillStyle = '#ffd23f'; g.fill(); } drawAstro(g, 75, 112, 0.95, '#4aa8ff', { t, mood: 'happy' }); });
        body.replaceChildren(h('div', { class: 'row' }, c), h('p', { class: 'done-title' }, doneTitle), h('p', {}, text), h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: () => { box.remove(); resolve(mistakes); } }, 'BACK TO THE ROVER ▶')));
      },
    });
  });
}

const SPECTRUM = ['#ff5a5a', '#ffd23f', '#58d66b', '#4aa8ff', '#c77dff'];
function spectrum(pattern, w = 150, hh = 66) {
  const { c, g } = cv(w, hh, 'art mini');
  rr(g, 0, 0, w, hh, 8); g.fillStyle = '#060a16'; g.fill();
  pattern.forEach((col, i) => {
    const bw = (w - 24) / pattern.length, x = 12 + i * bw, bh = 22 + SPECTRUM.indexOf(col) * 6;
    g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = col; rr(g, x + 3, hh - 8 - bh, bw - 6, bh, 3); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#ffffff55'; g.fillRect(x + 5, hh - 6 - bh, 3, bh - 4);
  });
  return c;
}

export const SITE_TASKS = [
  (root) => siteShell(root, 'Drill a core sample', (body, api) => {
    const W = 520, H = 230, SURF = 84, zone = 14 + Math.random() * 54, X = (p) => 40 + p * 4.4;
    let pos = 0, dir = 1, state = 'aim', depth = 0, spark = 0;
    const { c } = cv(W, H), r = rnd(12), debris = [];
    const stones = Array.from({ length: 46 }, () => [r() * W, SURF + 10 + r() * (H - SURF - 14), 2 + r() * 5, r()]);
    const msg = h('p', { class: 'msg' });
    loop(c, (g, t, dt) => {
      if (state === 'aim') { pos += dir * 82 * dt; if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } }
      if (state === 'drill') {
        depth = Math.min(1, depth + dt * 0.75);
        if (Math.random() < 0.6) debris.push({ x: X(pos), y: SURF, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 120, life: 0.7 });
        if (depth >= 1) { state = 'done'; setTimeout(() => api.found('Core sample safely stored! Rovers drill because rock under the surface is protected from the Sun\'s radiation, so clues about the past survive there.'), 350); }
      }
      spark = Math.max(0, spark - dt * 3);
      g.fillStyle = lg(g, 0, 0, 0, SURF, ['#f7c896', '#ec9f66']); g.fillRect(0, 0, W, SURF);
      g.fillStyle = '#b5553388'; g.beginPath(); g.moveTo(0, SURF); for (let x = 0; x <= W; x += 20) g.lineTo(x, SURF - 14 - Math.sin(x * 0.02) * 10); g.lineTo(W, SURF); g.fill();
      g.fillStyle = lg(g, 0, SURF, 0, H, ['#8a3a24', '#541f14']); g.fillRect(0, SURF, W, H - SURF);
      const zx = X(zone), zw = 18 * 4.4;
      g.fillStyle = lg(g, 0, SURF, 0, H, ['#e6b07a', '#c58450']); g.fillRect(zx, SURF, zw, H - SURF);
      for (const [x, y, s, k] of stones) { const soft = x > zx && x < zx + zw; g.beginPath(); g.ellipse(x, y, s * (soft ? 0.5 : 1), s * (soft ? 0.35 : 0.7), k * 3, 0, TAU); g.fillStyle = soft ? '#b9783f' : k > 0.5 ? '#3d1810' : '#a04a30'; g.fill(); }
      g.strokeStyle = '#2e120c'; g.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const x = (i * 67 + 20) % W; if (x > zx - 10 && x < zx + zw + 10) continue; g.beginPath(); g.moveTo(x, SURF + 20 + (i % 3) * 30); g.lineTo(x + 14, SURF + 40 + (i % 3) * 30); g.lineTo(x + 6, SURF + 62 + (i % 3) * 30); g.stroke(); }
      g.fillStyle = '#58d66b'; rr(g, zx, SURF - 5, zw, 9, 4); g.fill(); ink(g, 2);
      label(g, 'SOFT ROCK', zx + zw / 2, SURF - 18, { size: 13, col: '#9cffb3' });
      const dx = X(pos) + (state === 'drill' ? Math.sin(t * 90) * 1.2 : 0), tip = SURF - 6 + depth * 118;
      g.strokeStyle = '#9aa7c4'; g.lineWidth = 5; g.beginPath(); g.moveTo(dx, 46); g.lineTo(dx, tip); g.stroke();                       // drill bit
      g.strokeStyle = '#1d2547'; g.lineWidth = 1.5; for (let y = 50 + ((t * (state === 'drill' ? 120 : 20)) % 9); y < tip; y += 9) { g.beginPath(); g.moveTo(dx - 3, y); g.lineTo(dx + 3, y + 4); g.stroke(); }
      g.beginPath(); g.moveTo(dx - 4, tip); g.lineTo(dx, tip + 9); g.lineTo(dx + 4, tip); g.fillStyle = '#dfe6f2'; g.fill();
      g.strokeStyle = '#1d2547'; g.lineWidth = 4; g.beginPath(); g.moveTo(dx - 26, SURF); g.lineTo(dx - 8, 34); g.moveTo(dx + 26, SURF); g.lineTo(dx + 8, 34); g.stroke();   // tripod
      rr(g, dx - 15, 18, 30, 28, 6); g.fillStyle = '#ff8a3c'; g.fill(); ink(g, 2.5);
      g.beginPath(); g.arc(dx, 32, 6, 0, TAU); g.fillStyle = state === 'drill' ? '#58d66b' : '#ffd23f'; g.fill(); ink(g, 2);
      if (spark > 0) for (let i = 0; i < 6; i++) { star(g, dx + Math.cos(i * 1.1 + t * 20) * 16 * (1.2 - spark), SURF - 4 - Math.abs(Math.sin(i * 2)) * 16 * (1.2 - spark), 5 * spark, i, 4, 0.3); g.fillStyle = '#fff6c8'; g.fill(); }
      for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.life -= dt; d.vy += 420 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.life <= 0) { debris.splice(i, 1); continue; } g.fillStyle = '#e6b07a'; g.fillRect(d.x, d.y, 4, 4); }
    });
    body.replaceChildren(h('p', {}, 'Stop the drill above the SOFT ROCK (green mark), where the rock is soft enough to drill.'), h('div', { class: 'row' }, c), h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: () => {
      if (state !== 'aim') return;
      if (pos >= zone && pos <= zone + 18) { state = 'drill'; sfx('ok'); msg.textContent = 'Drilling…'; }
      else { api.miss(); spark = 1; msg.textContent = 'Clang! Too hard there. Try again and watch the drill.'; }
    } }, '⛏️ DRILL!')), msg);
  }),

  (root) => siteShell(root, 'Read the rock layers', (body, api) => {
    const W = 520, H = 250, TOP = 44, BAND = 62;
    const bands = [['A', ['#f0c690', '#e0a36b']], ['B', ['#d58f58', '#c27444']], ['C', ['#a85f3a', '#864326']]];
    let hover = -1, wrong = -1, wrongT = 0, right = false;
    const { c } = cv(W, H), r = rnd(31), msg = h('p', { class: 'msg' });
    const bits = Array.from({ length: 60 }, () => [60 + r() * (W - 150), r(), r()]);
    loop(c, (g, t, dt) => {
      wrongT = Math.max(0, wrongT - dt);
      g.fillStyle = lg(g, 0, 0, 0, H, ['#f7c896', '#ec9f66']); g.fillRect(0, 0, W, H);
      g.beginPath(); g.arc(450, 28, 13, 0, TAU); g.fillStyle = '#fff2cf'; g.fill();
      bands.forEach(([name, cols], i) => {
        const y = TOP + i * BAND, shake = wrong === i && wrongT > 0 ? Math.sin(t * 60) * 4 : 0;
        g.save(); g.translate(shake, 0);
        g.beginPath(); g.moveTo(40, y); for (let x = 40; x <= W - 70; x += 20) g.lineTo(x, y + Math.sin(x * 0.05 + i * 2) * 3); g.lineTo(W - 62 + i * 5, y + BAND); for (let x = W - 70; x >= 40; x -= 20) g.lineTo(x, y + BAND + Math.sin(x * 0.05 + (i + 1) * 2) * 3); g.lineTo(34 - i * 4, y + BAND); g.closePath();
        g.fillStyle = lg(g, 0, y, 0, y + BAND, cols); g.fill();
        g.save(); g.clip();
        bits.forEach(([x, k, m], n) => {
          if (n % 3 !== i) return;
          const yy = y + 10 + k * (BAND - 20);
          if (i === 0) { g.beginPath(); g.ellipse(x, yy, 3 + m * 5, 2 + m * 3, m * 3, 0, TAU); g.fillStyle = '#c98b52'; g.fill(); }
          if (i === 1) { g.strokeStyle = '#a85f3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 16, yy + 5); g.quadraticCurveTo(x, yy - 6, x + 18, yy + 5); g.stroke(); }
          if (i === 2) { g.strokeStyle = '#5a2a18'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20, yy); g.bezierCurveTo(x - 8, yy - 5, x + 6, yy + 5, x + 20, yy); g.stroke(); }
        });
        if (hover === i && !right) { g.fillStyle = '#ffffff33'; g.fillRect(0, y - 4, W, BAND + 8); }
        if (right && i === 2) { g.fillStyle = `rgba(156,255,179,${0.25 + Math.sin(t * 6) * 0.15})`; g.fillRect(0, y - 4, W, BAND + 8); }
        g.restore(); ink(g, 3);
        g.beginPath(); g.arc(22, y + BAND / 2, 15, 0, TAU); g.fillStyle = hover === i ? '#ffd23f' : '#1b2a5c'; g.fill(); ink(g, 3, '#fff'); label(g, name, 22, y + BAND / 2 + 1, { size: 17, col: hover === i ? '#1d2547' : '#fff', stroke: null });
        g.restore();
      });
      drawAstro(g, W - 30, H - 6, 0.62, '#4aa8ff', { t });
    });
    const pick = (e) => Math.floor((pointerOn(c, e, W).y - TOP) / BAND);
    c.style.cursor = 'pointer';
    c.addEventListener('pointermove', (e) => { const i = pick(e); hover = i >= 0 && i < 3 ? i : -1; });
    c.addEventListener('pointerleave', () => { hover = -1; });
    c.addEventListener('pointerdown', (e) => {
      const i = pick(e); if (right || i < 0 || i > 2) return;
      if (i === 2) { right = true; sfx('ok'); setTimeout(() => api.found('Right! New layers pile on top of old ones, like pancakes, so the bottom layer is the oldest. Layers on Mars tell the story of ancient lakes and rivers.'), 900); }
      else { api.miss(); wrong = i; wrongT = 0.4; msg.textContent = 'Think of a stack of pancakes: which one was made first?'; }
    });
    body.replaceChildren(h('p', {}, 'This cliff has three layers. Tap the OLDEST layer to sample it.'), h('div', { class: 'row' }, c), msg);
  }),

  (root) => siteShell(root, 'Laser mineral scan', (body, api) => {
    const target = shuffle(SPECTRUM), W = 520, H = 120;
    const swap = (p, i, j) => { const q = [...p]; [q[i], q[j]] = [q[j], q[i]]; return q; };
    const msg = h('p', { class: 'msg' });
    const { c } = cv(W, H);
    loop(c, (g, t) => {
      g.fillStyle = lg(g, 0, 0, 0, 86, ['#f7c896', '#ec9f66']); g.fillRect(0, 0, W, H); g.fillStyle = lg(g, 0, 86, 0, H, ['#c7532f', '#9c3a22']); g.fillRect(0, 86, W, H - 86);
      drawRover(g, 90, 104, 1.25, 0);
      g.beginPath(); g.moveTo(380, 100); g.lineTo(372, 66); g.lineTo(404, 44); g.lineTo(450, 50); g.lineTo(470, 78); g.lineTo(462, 100); g.closePath(); g.fillStyle = '#6b4a44'; g.fill(); ink(g, 3);
      g.fillStyle = '#8a625a'; g.beginPath(); g.moveTo(378, 68); g.lineTo(404, 48); g.lineTo(432, 52); g.lineTo(400, 74); g.fill();
      const on = (t % 1.4) < 1, col = target[Math.floor(t * 6) % 5];
      if (on) {
        g.strokeStyle = '#ff5a5a'; g.lineWidth = 5; g.shadowColor = '#ff5a5a'; g.shadowBlur = 12; g.beginPath(); g.moveTo(121, 44); g.lineTo(398, 70); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); g.shadowBlur = 0;
        g.fillStyle = rg(g, 398, 70, 1, 26, [col, col + '00']); g.fillRect(366, 38, 64, 64);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 9; star(g, 398 + Math.cos(a) * (10 + (t * 40 + i * 7) % 16), 70 + Math.sin(a) * (8 + (t * 40 + i * 7) % 14), 4, a, 4, 0.3); g.fillStyle = target[i % 5]; g.fill(); }
      }
    });
    const opts = shuffle([[target, true, 'Olivine'], [swap(target, 0, 2), false, 'Quartz'], [swap(target, 1, 4), false, 'Gypsum']]);
    body.replaceChildren(h('p', {}, 'The laser zapped the rock. Find the mineral whose colour pattern is EXACTLY the same.'), h('div', { class: 'row' }, c),
      h('div', { class: 'row', style: 'align-items:center' }, h('span', {}, 'LASER READING ▶'), spectrum(target, 190, 76)),
      h('div', { class: 'row' }, opts.map(([p, ok, name]) => { const card = h('div', { class: 'card', onclick: () => { if (ok) { card.classList.add('ok'); api.found(`It matches ${name}! The Curiosity rover really does this: its laser zaps a rock, and the colours of the spark show what the rock is made of.`); } else { card.classList.remove('bad'); void card.offsetWidth; card.classList.add('bad'); api.miss(); msg.textContent = 'One bar is in a different place. Compare bar by bar.'; } } }, spectrum(p), name); return card; })), msg);
  }),
];
