// Goals of the FINAL rover expedition (Sol 5). They are different from the Sol 2 sample tasks:
// build a weather station, photograph a panorama, and hunt for a meteorite.
// Each returns a Promise of the mistakes made.
import { h, tone } from '../ui.js';
import { cv, loop, pointerOn, rnd, rr, ink, lg, rg, label, star, drawAstro, TAU } from '../art.js';
import { siteShell } from './sites.js';

export const EXPEDITION_STOPS = ['Weather station spot', 'Panorama point', 'Meteorite field'];

export const EXPEDITION_TASKS = [
  // 1) Put the weather station together, using the blueprint as a guide.
  (root) => siteShell(root, 'Build the weather station', (body, api) => {
    const PARTS = { base: ['🔺 Tripod base', []], mast: ['📏 Mast', ['base']], panel: ['🔆 Solar panel', ['mast']], sensors: ['🌬️ Wind + temperature sensors', ['mast']], power: ['🔛 Power switch', ['panel', 'sensors']] };
    const LABELS = { base: ['Tripod base', 150, 16], mast: ['Mast', 96, -70], panel: ['Solar panel', 84, 62], sensors: ['Sensors', 26, -62], power: ['Power switch', 60, 52] };
    const built = new Set(), W = 560, H = 230, BX = 122, SX = 430, GROUND = 190, { c } = cv(W, H), msg = h('p', { class: 'msg' }, 'Look at the blueprint. Which part has to go on the ground first?'), pop = {};
    let wrong = null, wrongT = 0;
    // One drawing routine for the three looks: 'plan' (white lines on blue), 'ghost' (dashed outline), 'real' (the built part).
    const part = (g, key, x, mode, s, t) => {
      const real = mode === 'real', line = mode === 'plan' ? '#ffffff' : '#ffffffaa';
      const paint = (fill) => { if (real) { g.fillStyle = fill; g.fill(); ink(g, 2.5); } else { g.lineWidth = 2; g.strokeStyle = line; g.stroke(); } };
      g.save(); g.translate(x, GROUND); g.setLineDash(mode === 'ghost' ? [5, 5] : []);
      if (key === 'base') { g.lineWidth = real ? 6 : 2; g.strokeStyle = real ? '#1d2547' : line; g.beginPath(); for (const dx of [-38, 0, 38]) { g.moveTo(0, -40 * s); g.lineTo(dx * s, 0); } g.stroke(); }
      if (key === 'mast') { rr(g, -4, -40 - 78 * s, 8, 78 * s, 3); paint('#dfe6f2'); }
      if (key === 'panel') { g.translate(8, -94); g.rotate(-0.35); g.scale(s, s); rr(g, 0, -14, 56, 28, 4); paint('#2a64d8'); if (real) { g.strokeStyle = '#7fb4ff'; g.lineWidth = 1.5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 14, -14); g.lineTo(i * 14, 14); g.stroke(); } } }
      if (key === 'sensors') {
        g.translate(0, -124); g.scale(s, s); const spin = real && built.has('power') ? t * 7 : 0.4;
        for (let i = 0; i < 3; i++) { const a = spin + i * TAU / 3; g.strokeStyle = real ? '#1d2547' : line; g.lineWidth = real ? 3 : 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 24, Math.sin(a) * 7); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * 24, Math.sin(a) * 7, 6, 0, TAU); paint('#ff8a3c'); }
        rr(g, -34, 4, 12, 26, 5); paint('#ffffff'); if (real) { g.fillStyle = '#ff5a5a'; g.fillRect(-30, 16, 4, 12); }
      }
      if (key === 'power') { g.translate(0, -62); g.scale(s, s); rr(g, -9, -9, 18, 18, 5); paint('#3a4563'); g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); paint(Math.sin(t * 8) > 0 ? '#58d66b' : '#1f6b33'); }
      g.restore();
    };
    loop(c, (g, t, dt) => {
      for (const k of built) pop[k] = Math.min(1, (pop[k] || 0) + dt * 3);
      wrongT = Math.max(0, wrongT - dt);
      // --- left: the blueprint ---
      g.fillStyle = '#1b4a9c'; g.fillRect(0, 0, 250, H); g.strokeStyle = '#ffffff22'; g.lineWidth = 1;
      for (let x = 0; x < 250; x += 15) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 15) { g.beginPath(); g.moveTo(0, y); g.lineTo(250, y); g.stroke(); }
      label(g, 'BLUEPRINT', 125, 14, { size: 14, stroke: null });
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(50, GROUND); g.lineTo(200, GROUND); g.stroke();
      for (const key of Object.keys(PARTS)) {
        part(g, key, BX, 'plan', 1, t);
        const [name, ly, side] = LABELS[key], done = built.has(key), bad = wrong === key && wrongT > 0, lx = BX + side;
        g.strokeStyle = done ? '#9cffb3' : bad ? '#ff8a8a' : '#ffffffaa'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(BX + Math.sign(side) * 10, ly + 14); g.lineTo(lx, ly + 14); g.stroke();
        label(g, (done ? '✔ ' : '') + name, lx + (side > 0 ? 2 : -2), ly + 4, { size: 11, col: done ? '#9cffb3' : bad ? '#ff8a8a' : '#fff', align: side > 0 ? 'left' : 'right', stroke: '#1b4a9c' });
      }
      // --- right: the building site, with dashed outlines where parts will go ---
      g.fillStyle = lg(g, 0, 0, 0, 170, ['#f7c896', '#ec9f66']); g.fillRect(250, 0, W - 250, H); g.fillStyle = lg(g, 0, GROUND - 14, 0, H, ['#c7532f', '#9c3a22']); g.fillRect(250, GROUND - 14, W - 250, H);
      for (let i = 0; i < 6; i++) { const wx = 250 + (i * 83 + t * 70) % 310; g.strokeStyle = '#fff5'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx, 26 + (i * 29) % 90); g.lineTo(wx + 16, 26 + (i * 29) % 90); g.stroke(); }
      for (const key of Object.keys(PARTS)) {
        if (!built.has(key)) { g.globalAlpha = wrong === key && wrongT > 0 ? 0.35 + Math.abs(Math.sin(t * 25)) * 0.6 : 0.75; part(g, key, SX, 'ghost', 1, t); g.globalAlpha = 1; continue; }
        const p = pop[key], s = 1 - (1 - p) ** 3;
        part(g, key, SX, 'real', s, t);
        if (p < 1) for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 3; star(g, SX + Math.cos(a) * 60 * p, GROUND - 80 + Math.sin(a) * 60 * p, 7 * (1 - p), a, 4, 0.3); g.fillStyle = '#fff6c8'; g.fill(); }
      }
      if (built.has('power')) for (let i = 0; i < 3; i++) { const q = (t * 0.8 + i / 3) % 1; g.strokeStyle = `rgba(95,212,255,${1 - q})`; g.lineWidth = 3; g.beginPath(); g.arc(SX, GROUND - 130, 16 + q * 40, -2.4, -0.7); g.stroke(); }
      drawAstro(g, 320, GROUND + 26, 0.8, '#4aa8ff', { t, mood: built.has('power') ? 'happy' : 'ok' });
      label(g, `${built.size} of 5 parts`, W - 60, 16, { size: 13 });
    });
    const btns = Object.entries(PARTS).sort(() => Math.random() - 0.5).map(([key, [name, needs]]) => h('button', { class: 'px-btn', onclick: (e) => {
      const missing = needs.filter((n) => !built.has(n));
      if (missing.length) { api.miss(); wrong = key; wrongT = 0.9; msg.textContent = `Not yet! The ${name.replace(/^\S+ /, '').toLowerCase()} would have nothing to hold it. Check the blueprint: what is underneath it?`; return; }
      built.add(key); e.target.disabled = true; e.target.classList.add('ok'); tone(400 + built.size * 70, 0.12);
      msg.textContent = `✔ ${name.replace(/^\S+ /, '')} in place! What can be added now?`;
      if (built.size === 5) { msg.textContent = '🌬️ It is measuring the wind!'; setTimeout(() => api.found('The weather station is sending data! The Perseverance rover carries a weather station too. It measures wind, temperature and dust on Mars every day.', '✔ STATION BUILT'), 1800); }
    } }, name));
    body.replaceChildren(h('p', {}, 'Build the weather station shown on the BLUEPRINT. The dashed shapes show where each part goes. Choose the parts in an order that works: nothing can float in the air!'), h('div', { class: 'row' }, c), h('div', { class: 'row' }, btns), msg);
  }),

  // 2) Pan the camera and photograph three things.
  (root) => siteShell(root, 'Photograph the panorama', (body, api) => {
    const W = 520, H = 220, WIDE = 1500, { c } = cv(W, H), msg = h('p', { class: 'msg' }, 'Drag the picture (or use ◀ ▶) to look around.');
    const targets = [{ name: 'the tall mesa', x: 300, icon: '⛰️' }, { name: 'the dust devil', x: 820, icon: '🌪️' }, { name: 'the big crater', x: 1260, icon: '🕳️' }];
    let cam = 520, drag = null, flash = 0;
    const list = h('div', { class: 'row' });
    const drawList = () => list.replaceChildren(...targets.map((t) => h('span', { class: 'chip' + (t.done ? ' done' : '') }, `${t.done ? '✅' : '⬜'} ${t.icon} ${t.name}`)));
    drawList();
    loop(c, (g, t, dt) => {
      flash = Math.max(0, flash - dt * 2.5); targets[1].x = 820 + Math.sin(t * 0.5) * 70;
      g.fillStyle = lg(g, 0, 0, 0, 150, ['#f7c896', '#ec9f66']); g.fillRect(0, 0, W, H);
      g.save(); g.translate(-cam, 0);
      g.fillStyle = '#b5553399'; g.beginPath(); g.moveTo(0, 150); for (let x = 0; x <= WIDE + W; x += 30) g.lineTo(x, 132 - Math.sin(x * 0.011) * 16 - Math.sin(x * 0.04) * 6); g.lineTo(WIDE + W, 150); g.fill();
      g.fillStyle = lg(g, 0, 150, 0, H, ['#c7532f', '#9c3a22']); g.fillRect(0, 150, WIDE + W, 70);
      g.beginPath(); g.moveTo(230, 152); g.lineTo(250, 70); g.lineTo(270, 62); g.lineTo(340, 62); g.lineTo(356, 78); g.lineTo(378, 152); g.closePath(); g.fillStyle = lg(g, 0, 60, 0, 152, ['#c8683f', '#8f3a24']); g.fill(); ink(g, 3);   // mesa
      g.strokeStyle = '#7a2f1c'; g.lineWidth = 2; for (const y of [88, 110, 130]) { g.beginPath(); g.moveTo(246 - (y - 70) * 0.2, y); g.lineTo(362 + (y - 70) * 0.2, y); g.stroke(); }
      const dx = targets[1].x; for (let i = 0; i < 16; i++) { const yy = 150 - i * 7, wv = 4 + i * 2.2; g.fillStyle = `rgba(240,203,160,${0.75 - i * 0.03})`; g.beginPath(); g.ellipse(dx + Math.sin(t * 6 + i * 0.7) * (3 + i * 0.6), yy, wv, 5, 0, 0, TAU); g.fill(); }                 // dust devil
      g.beginPath(); g.ellipse(1260, 178, 90, 20, 0, 0, TAU); g.fillStyle = '#7a2f1c'; g.fill(); ink(g, 3); g.beginPath(); g.ellipse(1260, 183, 70, 12, 0, 0, TAU); g.fillStyle = '#541f14'; g.fill();                                               // crater
      const r = rnd(9); for (let i = 0; i < 40; i++) { const x = r() * (WIDE + W), y = 160 + r() * 50, s = 3 + r() * 9; g.beginPath(); g.ellipse(x, y, s, s * 0.6, 0, 0, TAU); g.fillStyle = '#7d3524'; g.fill(); }
      g.restore();
      g.strokeStyle = '#fff'; g.lineWidth = 3; const bx = W / 2 - 80, by = 40;                                                                                                             // viewfinder
      for (const [x, y, sx, sy] of [[bx, by, 1, 1], [bx + 160, by, -1, 1], [bx, by + 150, 1, -1], [bx + 160, by + 150, -1, -1]]) { g.beginPath(); g.moveTo(x + 22 * sx, y); g.lineTo(x, y); g.lineTo(x, y + 22 * sy); g.stroke(); }
      g.beginPath(); g.moveTo(W / 2 - 8, 115); g.lineTo(W / 2 + 8, 115); g.moveTo(W / 2, 107); g.lineTo(W / 2, 123); g.stroke();
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
    });
    const move = (d) => { cam = Math.max(0, Math.min(WIDE, cam + d)); };
    c.style.cursor = 'grab'; c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => { drag = pointerOn(c, e, W).x; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (drag == null) return; const x = pointerOn(c, e, W).x; move(drag - x); drag = x; });
    c.addEventListener('pointerup', () => { drag = null; });
    const snap = () => {
      flash = 1; tone(900, 0.06);
      const hit = targets.find((t) => !t.done && Math.abs(t.x - (cam + W / 2)) < 75);
      if (!hit) { api.miss(); msg.textContent = 'Nothing new inside the white corners. Move until a target is in the middle.'; return; }
      hit.done = true; drawList(); msg.textContent = `📸 Got ${hit.name}!`;
      if (targets.every((t) => t.done)) setTimeout(() => api.found('Three great photos! Mars rovers build big panoramas by taking many small photos and joining them together, like a puzzle.', '✔ PANORAMA TAKEN'), 1000);
    };
    body.replaceChildren(h('p', {}, 'Mission Control wants 3 photos. Look around and put each target inside the white corners, then take the photo.'), list, h('div', { class: 'row' }, c),
      h('div', { class: 'row' }, h('button', { class: 'px-btn', onclick: () => move(-130) }, '◀'), h('button', { class: 'px-btn ok', onclick: snap }, '📸 TAKE PHOTO'), h('button', { class: 'px-btn', onclick: () => move(130) }, '▶')), msg);
  }),

  // 3) Find the buried meteorite with a metal detector that gets louder when you are closer.
  (root) => siteShell(root, 'Meteorite hunt', (body, api) => {
    const COLS = 7, ROWS = 5, C = 62, W = COLS * C + 20, H = ROWS * C + 20, FREE = 6, { c } = cv(W, H);
    const goal = [Math.floor(Math.random() * ROWS), Math.floor(Math.random() * COLS)], dug = new Map(), msg = h('p', { class: 'msg' }, 'Tap a square to scan it. More bars = closer!');
    let taps = 0, found = false, hover = null;
    const r0 = rnd(17), specks = Array.from({ length: 90 }, () => [r0() * W, r0() * H, r0()]);
    loop(c, (g, t) => {
      g.fillStyle = lg(g, 0, 0, 0, H, ['#c7532f', '#a8432a']); g.fillRect(0, 0, W, H);
      for (const [x, y, k] of specks) { g.fillStyle = k > 0.5 ? '#8a3520' : '#dd7443'; g.fillRect(x, y, 3, 2); }
      for (let rr_ = 0; rr_ < ROWS; rr_++) for (let cc = 0; cc < COLS; cc++) {
        const x = 10 + cc * C, y = 10 + rr_ * C, key = rr_ + ',' + cc, bars = dug.get(key);
        rr(g, x + 2, y + 2, C - 4, C - 4, 8); g.strokeStyle = hover === key ? '#fff' : '#ffffff33'; g.lineWidth = hover === key ? 3 : 1.5; g.stroke();
        if (bars == null) continue;
        g.fillStyle = '#00000033'; g.fill();
        if (found && rr_ === goal[0] && cc === goal[1]) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, q = 17 + Math.sin(i * 3.1) * 4; g.lineTo(x + C / 2 + Math.cos(a) * q, y + C / 2 + Math.sin(a) * q); } g.closePath(); g.fillStyle = rg(g, x + C / 2 - 5, y + C / 2 - 6, 2, 22, ['#c8d2e2', '#5a6272', '#2a2f3d']); g.fill(); ink(g, 3); for (let i = 0; i < 5; i++) { const a = t * 2 + i * TAU / 5; star(g, x + C / 2 + Math.cos(a) * 26, y + C / 2 + Math.sin(a) * 26, 5, t, 4, 0.3); g.fillStyle = '#ffd23f'; g.fill(); } continue; }
        for (let i = 0; i < 5; i++) { g.fillStyle = i < bars ? ['#4aa8ff', '#58d66b', '#ffd23f', '#ff8a3c', '#ff5a5a'][bars - 1] : '#00000055'; g.fillRect(x + 11 + i * 9, y + C - 14 - (i + 1) * 7, 6, (i + 1) * 7); }
      }
    });
    const cellAt = (e) => { const p = pointerOn(c, e, W), cc = Math.floor((p.x - 10) / C), rr_ = Math.floor((p.y - 10) / C); return cc < 0 || rr_ < 0 || cc >= COLS || rr_ >= ROWS ? null : [rr_, cc]; };
    c.style.cursor = 'crosshair';
    c.addEventListener('pointermove', (e) => { const k = cellAt(e); hover = k && k.join(','); });
    c.addEventListener('pointerdown', (e) => {
      const k = cellAt(e); if (!k || found || dug.has(k.join(','))) return;
      const dist = Math.max(Math.abs(k[0] - goal[0]), Math.abs(k[1] - goal[1])), bars = Math.max(1, 5 - dist);
      dug.set(k.join(','), bars); taps++;
      if (dist === 0) { found = true; tone(1047, 0.3); setTimeout(() => api.found('You found a meteorite: a rock that fell from space! In 2005 the Opportunity rover found the first meteorite ever seen on another planet. It was made of iron.', '✔ METEORITE FOUND'), 1500); msg.textContent = `☄️ Found it in ${taps} scans!`; return; }
      tone(300 + bars * 120, 0.1);
      if (taps > FREE) api.miss();
      msg.textContent = `${'▮'.repeat(bars)}${'▯'.repeat(5 - bars)}  ${['', 'Very far away.', 'Far.', 'Getting warmer…', 'Close!', 'Right next to it!'][bars]}${taps === FREE ? ' Careful: think before each scan now.' : ''}`;
    });
    body.replaceChildren(h('p', {}, `A meteorite is buried here. Scan squares with the metal detector: the signal has MORE BARS when you are closer. Try to find it in ${FREE} scans or fewer.`), h('div', { class: 'row' }, c), msg);
  }),
];
