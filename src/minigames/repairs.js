// Max's repair jobs that are NOT wiring, so every sol feels different:
// pipes (turn tiles to make a water path), sequence (remember the shield start-up lights),
// charge (add power packs to reach exactly the right charge).
import { h, shuffle, tone } from '../ui.js';
import { cv, loop, pointerOn, rr, ink, lg, rg, label, star, drawRover, TAU } from '../art.js';

// ---------- Pipes: rotate the tiles until water flows from the tank to the recycler ----------
const N = 1, E = 2, S = 4, W = 8, DIRS = [[N, -1, 0, S], [E, 0, 1, W], [S, 1, 0, N], [W, 0, -1, E]];
const turn = (mask, times) => { let m = mask; for (let i = 0; i < (times % 4 + 4) % 4; i++) m = ((m << 1) & 15) | (m >> 3); return m; };

export function pipes(body, { label: name = 'Water pipes' } = {}, api) {
  const COLS = 5, ROWS = 4, C = 78, OX = 62, W_ = OX * 2 + COLS * C, H_ = ROWS * C + 16, OY = 8;
  // 1) Make a real path from the left edge to the right edge.
  const start = Math.floor(Math.random() * ROWS), path = [[start, 0]];
  let r = start;
  for (let c = 0; c < COLS; c++) {
    const want = Math.floor(Math.random() * ROWS), step = Math.sign(want - r);
    while (c > 0 && c < COLS - 1 && r !== want) { r += step; path.push([r, c]); }
    if (c < COLS - 1) path.push([r, c + 1]);
  }
  const end = r, grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  path.forEach(([pr, pc], i) => {
    const dirTo = (q) => (!q ? 0 : q[0] < pr ? N : q[0] > pr ? S : q[1] > pc ? E : W);
    grid[pr][pc] = { mask: (i === 0 ? W : dirTo(path[i - 1])) | (i === path.length - 1 ? E : dirTo(path[i + 1])) };
  });
  // 2) Fill the rest with spare pipes, then give every tile a random turn.
  for (const row of grid) for (let c = 0; c < COLS; c++) { row[c] ||= { mask: [N | S, N | E, N | E | S][Math.floor(Math.random() * 3)] }; row[c].rot = 1 + Math.floor(Math.random() * 3); row[c].ang = row[c].rot * 90; }
  const now = (t) => turn(t.mask, t.rot);
  const flood = () => {
    const wet = new Set(); if (!(now(grid[start][0]) & W)) return wet;
    const todo = [[start, 0]]; wet.add(start + ',0');
    while (todo.length) {
      const [cr, cc] = todo.pop();
      for (const [d, dr, dc, back] of DIRS) {
        const nr = cr + dr, nc = cc + dc;
        if (!(now(grid[cr][cc]) & d) || nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || wet.has(nr + ',' + nc) || !(now(grid[nr][nc]) & back)) continue;
        wet.add(nr + ',' + nc); todo.push([nr, nc]);
      }
    }
    return wet;
  };
  let wet = flood(), won = false, turns = 0;
  const { c: canvas } = cv(W_, H_), msg = h('p', { class: 'msg' }, 'Tap a pipe to turn it.');
  const arm = (g, len) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len); };
  loop(canvas, (g, t, dt) => {
    g.fillStyle = lg(g, 0, 0, 0, H_, ['#16224a', '#0a1026']); g.fillRect(0, 0, W_, H_);
    const sy = OY + start * C + C / 2, ey = OY + end * C + C / 2;
    rr(g, 6, sy - 34, 50, 68, 12); g.fillStyle = lg(g, 0, sy - 34, 0, sy + 34, ['#9fe8ff', '#2a8fd8']); g.fill(); ink(g, 3); label(g, '💧', 31, sy, { size: 22, stroke: null });
    rr(g, W_ - 56, ey - 34, 50, 68, 12); g.fillStyle = won ? '#58d66b' : '#3a4563'; g.fill(); ink(g, 3); label(g, '♻️', W_ - 31, ey, { size: 22, stroke: null });
    g.strokeStyle = '#8fa3c8'; g.lineWidth = 18; g.beginPath(); g.moveTo(54, sy); g.lineTo(OX, sy); g.moveTo(W_ - OX, ey); g.lineTo(W_ - 54, ey); g.stroke();
    for (let rr_ = 0; rr_ < ROWS; rr_++) for (let c = 0; c < COLS; c++) {
      const tile = grid[rr_][c], x = OX + c * C, y = OY + rr_ * C, on = wet.has(rr_ + ',' + c);
      tile.ang += (tile.rot * 90 - tile.ang) * Math.min(1, dt * 14);
      rr(g, x + 3, y + 3, C - 6, C - 6, 10); g.fillStyle = on ? '#1c3a6e' : '#1a2448'; g.fill(); g.lineWidth = 2; g.strokeStyle = on ? '#5fd4ff' : '#34427a'; g.stroke();
      g.save(); g.translate(x + C / 2, y + C / 2); g.rotate(tile.ang * Math.PI / 180);
      for (const pass of [0, 1, 2]) for (let k = 0; k < 4; k++) {
        if (!(tile.mask & (1 << k))) continue;
        g.save(); g.rotate(k * Math.PI / 2); arm(g, C / 2 - 3);
        if (pass === 0) { g.lineWidth = 26; g.strokeStyle = '#10152e'; }
        if (pass === 1) { g.lineWidth = 20; g.strokeStyle = on ? '#3aa6ea' : '#9aa7c4'; }
        if (pass === 2) { g.lineWidth = 6; g.strokeStyle = on ? '#dff6ff' : '#ffffff55'; g.setLineDash(on ? [6, 10] : []); g.lineDashOffset = -t * 40; }
        g.stroke(); g.restore();
      }
      g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fillStyle = on ? '#3aa6ea' : '#9aa7c4'; g.fill(); ink(g, 3, '#10152e');
      g.restore();
    }
    if (won) for (let i = 0; i < 10; i++) { const q = (t * 0.9 + i / 10) % 1; g.fillStyle = `rgba(159,232,255,${1 - q})`; g.beginPath(); g.arc(W_ - 31 + Math.sin(i * 5) * 16, ey - 30 - q * 50, 4, 0, TAU); g.fill(); }
  });
  canvas.style.cursor = 'pointer';
  canvas.addEventListener('pointerdown', (e) => {
    if (won) return;
    const p = pointerOn(canvas, e, W_), c = Math.floor((p.x - OX) / C), rr_ = Math.floor((p.y - OY) / C);
    if (c < 0 || rr_ < 0 || c >= COLS || rr_ >= ROWS) return;
    grid[rr_][c].rot++; turns++; tone(380 + (turns % 5) * 40, 0.05); wet = flood();
    msg.textContent = `Turns: ${turns}. Blue pipes have water in them.`;
    if (wet.has(end + ',' + (COLS - 1)) && now(grid[end][COLS - 1]) & E) {
      won = true; api.ok(); msg.textContent = '💧 The water is flowing again!';
      api.later(() => api.finish(`${name} fixed in ${turns} turns! On a space base almost every drop of water is cleaned and used again, so the pipes must never leak or freeze.`, 'On the International Space Station, most of the water is recycled. Source: NASA.'), 1500);
    }
  });
  body.replaceChildren(h('p', {}, `${name.toUpperCase()}: the cold night knocked the pipes out of place. Turn the tiles to make ONE path from the water tank 💧 to the recycler ♻️.`), h('div', { class: 'row' }, canvas), msg);
}

// ---------- Sequence: watch the start-up lights, then repeat them ----------
export function sequence(body, { label: name = 'Shield generator', rounds = [3, 4, 5] } = {}, api) {
  const PADS = [['#ff5a5a', '▲', 330], ['#ffd23f', '●', 415], ['#58d66b', '■', 494], ['#4aa8ff', '◆', 587]];
  let round = 0, seq = [], input = 0, busy = true, lit = -1, charge = 0, timers = [];
  const later = (fn, ms) => timers.push(api.later(fn, ms));
  api.onCleanup(() => timers.forEach(api.cancelTimer));
  const msg = h('p', { class: 'msg' });
  const { c: view } = cv(520, 150);
  let shownCharge = 0;
  loop(view, (g, t, dt) => {
    shownCharge += (charge - shownCharge) * Math.min(1, dt * 3);
    g.fillStyle = lg(g, 0, 0, 0, 150, ['#0d1535', '#39406e']); g.fillRect(0, 0, 520, 150);
    g.fillStyle = '#6a4a66'; g.fillRect(0, 122, 520, 28);
    rr(g, 200, 92, 120, 34, 10); g.fillStyle = '#e9eef7'; g.fill(); ink(g, 3);
    g.beginPath(); g.arc(260, 96, 30, Math.PI, 0); g.fillStyle = '#9fe8ff88'; g.fill(); ink(g, 3);
    for (let i = 0; i < 3; i++) {                                   // one shield ring per finished round
      const k = Math.max(0, Math.min(1, shownCharge - i));
      if (k <= 0) continue;
      g.strokeStyle = `rgba(95,212,255,${k * (0.55 + Math.sin(t * 5 + i) * 0.25)})`; g.lineWidth = 5; g.beginPath(); g.arc(260, 124, 60 + i * 28, Math.PI, Math.PI + Math.PI * k); g.stroke();
      g.fillStyle = `rgba(95,212,255,${k * 0.06})`; g.beginPath(); g.arc(260, 124, 60 + i * 28, Math.PI, 0); g.fill();
    }
    for (let i = 0; i < 12; i++) { const x = (i * 97 + t * 60) % 560 - 20, y = 10 + (i * 37) % 80; g.strokeStyle = '#ffb34799'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y + 5); g.stroke(); }
    label(g, `Shield rings: ${Math.round(shownCharge)} of ${rounds.length}`, 260, 16, { size: 14, col: '#9fe8ff' });
  });
  const pads = PADS.map(([col, sym], i) => h('button', { class: 'pad', style: `--c:${col}`, onclick: () => press(i) }, sym));
  const flash = (i, ms = 320) => { lit = i; pads.forEach((p, k) => p.classList.toggle('lit', k === i)); tone(PADS[i][2], ms / 1000); later(() => pads[i].classList.remove('lit'), ms); };
  const play = () => {
    busy = true; input = 0; msg.textContent = `Round ${round + 1} of ${rounds.length}: watch the lights…`;
    seq.forEach((p, k) => later(() => flash(p), 700 + k * 620));
    later(() => { busy = false; msg.textContent = 'Your turn! Tap the lights in the same order.'; }, 700 + seq.length * 620);
  };
  const next = () => { seq = Array.from({ length: rounds[round] }, () => Math.floor(Math.random() * 4)); play(); };
  function press(i) {
    if (busy) return;
    flash(i, 200);
    if (seq[input] !== i) { api.miss(); busy = true; msg.textContent = 'Oops, not that one. Watch again!'; later(play, 900); return; }
    if (++input < seq.length) return;
    busy = true; round++; charge = round; api.ok();
    if (round === rounds.length) { msg.textContent = '🛡️ Shield at full strength!'; later(() => api.finish(`${name} is running perfectly. Machines must be switched on in the right order, so engineers follow checklists step by step, just like you did.`), 1500); }
    else { msg.textContent = 'Correct! A shield ring switched on.'; later(next, 1200); }
  }
  body.replaceChildren(h('p', {}, `${name.toUpperCase()}: start-up check. Watch the lights, then tap them in the SAME order. Three rounds, each one longer.`), h('div', { class: 'row' }, view), h('div', { class: 'row pads' }, pads), msg);
  next();
}

// ---------- Charge: add power packs to reach exactly the right charge ----------
export function charge(body, { label: name = 'Rover charger' } = {}, api) {
  const targets = shuffle([35, 45, 55, 65, 75, 85]).slice(0, 3), PACKS = [5, 10, 20, 50];
  let cell = 0, sum = 0, zap = 0, level = 0, locked = false;
  const msg = h('p', { class: 'msg' });
  const { c: view } = cv(560, 190);
  loop(view, (g, t, dt) => {
    zap = Math.max(0, zap - dt * 2.5);
    level += ((cell < 3 ? sum / targets[cell] : 1) - level) * Math.min(1, dt * 6);
    g.fillStyle = lg(g, 0, 0, 0, 190, ['#1b2a5c', '#0d1535']); g.fillRect(0, 0, 560, 190);
    g.fillStyle = '#39415a'; g.fillRect(0, 150, 560, 40); g.fillStyle = '#ffd23f'; for (let x = 0; x < 560; x += 40) g.fillRect(x, 152, 20, 4);
    drawRover(g, 110, 154, 2.1, cell >= 3 ? t : 0);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.setLineDash([8, 8]); g.lineDashOffset = -t * (sum ? 60 : 0); g.beginPath(); g.moveTo(170, 120); g.bezierCurveTo(230, 170, 250, 60, 300, 100); g.stroke(); g.setLineDash([]);
    targets.forEach((target, i) => {                               // three fuel cells
      const x = 300 + i * 84, done = i < cell, active = i === cell, k = done ? 1 : active ? Math.min(1.15, level) : 0;
      rr(g, x + 22, 18, 24, 12, 3); g.fillStyle = '#9fb4d8'; g.fill();
      rr(g, x, 28, 68, 118, 10); g.fillStyle = '#0a0f24'; g.fill(); ink(g, 4, active ? '#fff' : '#9fb4d8');
      g.save(); rr(g, x + 5, 33, 58, 108, 6); g.clip();
      g.fillStyle = k > 1.001 ? '#ff5a5a' : done ? '#58d66b' : '#ffd23f'; g.fillRect(x + 5, 141 - 108 * Math.min(1, k), 58, 108);
      g.fillStyle = '#ffffff33'; g.fillRect(x + 10, 33, 8, 108); g.restore();
      label(g, done ? '✔' : `${active ? sum : 0} / ${target}`, x + 34, 88, { size: 16 });
      label(g, `Cell ${i + 1}`, x + 34, 162, { size: 13, col: '#9fe8ff', stroke: null });
      if (active && zap > 0) for (let s = 0; s < 6; s++) { star(g, x + 34 + Math.cos(s + t * 20) * 44 * (1.2 - zap), 80 + Math.sin(s * 2 + t * 20) * 50 * (1.2 - zap), 9 * zap, s, 4, 0.3); g.fillStyle = '#fff6c8'; g.fill(); }
    });
  });
  const say = () => { msg.textContent = cell < 3 ? `Cell ${cell + 1} needs exactly ${targets[cell]}. You have ${sum}${sum ? `, so ${targets[cell] - sum} more to go` : ''}.` : '🔋 Rover fully charged!'; };
  const add = (n) => {
    if (cell >= 3 || locked) return;
    sum += n; tone(300 + sum * 6, 0.08);
    if (sum > targets[cell]) { api.miss(); zap = 1; locked = true; msg.textContent = `Too much! ${sum} is more than ${targets[cell]}. The cell reset itself. Try again.`; api.later(() => { sum = 0; locked = false; }, 700); return; }
    if (sum === targets[cell]) { api.ok(); cell++; sum = 0; if (cell === 3) api.later(() => api.finish(`${name}: all three fuel cells are full. A rover can only drive as far as its batteries allow, so engineers plan every trip around the energy they have.`), 1300); }
    say();
  };
  say();
  body.replaceChildren(h('p', {}, `${name.toUpperCase()}: fill each fuel cell with EXACTLY the right amount. Add power packs, but do not go over!`), h('div', { class: 'row' }, view),
    h('div', { class: 'row' }, PACKS.map((n) => h('button', { class: 'px-btn pack', onclick: () => add(n) }, `⚡ +${n}`)), h('button', { class: 'px-btn bad', style: 'animation:none', onclick: () => { if (!locked) { sum = 0; say(); } } }, '↺ Empty')), msg);
}
