// Lea's tasks: plant care sliders, Contaminated Harvest (OSD-412),
// Save the Mars Greenhouse (OSD-581), DNA Repair Lab (OSD-658).
import { h, shuffle, sfx } from '../ui.js';
import { ask, SRC } from './index.js';
import { cv, loop, rnd, rr, ink, lg, rg, label, star, TAU } from '../art.js';

const mix = (a, b, k) => { const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16); return `rgb(${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k)).join(',')})`; };

/** Greenhouse view that reacts live to temperature, light and water. */
function plantScene(get) {
  const W = 560, H = 220, { c } = cv(W, H); c.style.width = '100%';
  let health = 0;
  loop(c, (g, t, dt) => {
    const s = get();                                           // { temp, light, water, good: [bool, bool, bool] }
    health += (s.good.filter(Boolean).length / 3 - health) * Math.min(1, dt * 3);
    const lit = s.light / 24;
    g.fillStyle = lg(g, 0, 0, 0, H, [mix('#101a3c', '#3a5a9a', lit), mix('#0a1026', '#27407a', lit)]); g.fillRect(0, 0, W, H);
    g.strokeStyle = '#9fe8ff33'; g.lineWidth = 2; for (let x = 70; x < W; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } g.beginPath(); g.moveTo(0, 70); g.lineTo(W, 70); g.stroke();
    // grow lamp
    rr(g, 150, 4, 260, 16, 6); g.fillStyle = '#3a4563'; g.fill(); ink(g, 3);
    rr(g, 162, 16, 236, 7, 3); g.fillStyle = mix('#3a2a44', '#ffd0f0', lit); g.fill();
    g.fillStyle = lg(g, 0, 22, 0, 190, [`rgba(255,190,235,${lit * 0.5})`, 'rgba(255,190,235,0)']); g.beginPath(); g.moveTo(166, 23); g.lineTo(394, 23); g.lineTo(470, 190); g.lineTo(90, 190); g.fill();
    if (s.light > 16) for (let i = 0; i < 5; i++) { star(g, 190 + i * 45, 44 + Math.sin(t * 5 + i) * 6, 7, t * 2, 4, 0.3); g.fillStyle = '#fff6c8'; g.fill(); }
    // thermometer
    rr(g, 34, 26, 22, 130, 11); g.fillStyle = '#fff'; g.fill(); ink(g, 3);
    const tc = s.temp < 18 ? '#5fd4ff' : s.temp > 24 ? '#ff5a5a' : '#58d66b';
    g.beginPath(); g.arc(45, 164, 17, 0, TAU); g.fillStyle = tc; g.fill(); ink(g, 3);
    rr(g, 40, 150 - s.temp * 2.9, 10, s.temp * 2.9 + 8, 5); g.fillStyle = tc; g.fill();
    g.fillStyle = '#58d66b55'; g.fillRect(58, 150 - 24 * 2.9, 8, 6 * 2.9); label(g, `${s.temp}°C`, 45, 198, { size: 15, col: tc });
    // water gauge
    rr(g, W - 58, 26, 26, 130, 9); g.fillStyle = '#0b1020'; g.fill(); ink(g, 3, '#dfe6f2');
    const wc = s.water < 40 ? '#d9a066' : s.water > 60 ? '#2a64d8' : '#5fd4ff';
    g.save(); rr(g, W - 55, 29, 20, 124, 7); g.clip(); g.fillStyle = wc; g.beginPath(); const wy = 153 - s.water * 1.24; g.moveTo(W - 56, 160);
    for (let x = 0; x <= 22; x += 2) g.lineTo(W - 56 + x, wy + Math.sin(t * 4 + x * 0.6) * 1.5); g.lineTo(W - 34, 160); g.fill(); g.restore();
    g.fillStyle = '#58d66b55'; g.fillRect(W - 68, 153 - 60 * 1.24, 8, 20 * 1.24); label(g, `💧${s.water}%`, W - 45, 198, { size: 15, col: wc });
    // planter
    rr(g, 180, 172, 200, 40, 10); g.fillStyle = lg(g, 0, 172, 0, 212, ['#eef2f9', '#b4bfd6']); g.fill(); ink(g, 3);
    rr(g, 188, 166, 184, 14, 6); g.fillStyle = mix('#b08458', '#3d2814', s.water / 100); g.fill(); ink(g, 2.5);
    if (s.water < 40) { g.strokeStyle = '#5a3d24'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(200 + i * 30, 168); g.lineTo(206 + i * 30, 174); g.lineTo(202 + i * 30, 178); g.stroke(); } }
    if (s.water > 60) for (let i = 0; i < 4; i++) { const q = (t * 1.3 + i * 0.25) % 1; g.fillStyle = '#5fd4ff'; g.beginPath(); g.ellipse(200 + i * 52, 212 + q * 10, 2.5, 4, 0, 0, TAU); g.fill(); }
    // face on the planter
    g.fillStyle = '#1d2547'; const blink = (t % 3) < 0.12;
    for (const dx of [-16, 16]) { g.beginPath(); g.ellipse(280 + dx, 190, 3, blink ? 0.6 : 4, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#1d2547'; g.lineWidth = 2.5; g.beginPath(); if (health > 0.8) g.arc(280, 192, 9, 0.15 * Math.PI, 0.85 * Math.PI); else if (health > 0.4) { g.moveTo(272, 199); g.lineTo(288, 199); } else g.arc(280, 205, 8, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
    // the lettuce: droopy and yellow when unhappy, big and green when everything is right
    const leaves = 7, col = mix('#b0a44a', '#4fd06a', health), col2 = mix('#8a7e30', '#2e9a48', health);
    for (let i = 0; i < leaves; i++) {
      const k = i / (leaves - 1) - 0.5, droop = (1 - health) * 0.9, len = 34 + health * 46 - Math.abs(k) * 18;
      const a = k * (1.5 + droop * 1.2) + Math.sin(t * 1.5 + i) * 0.04 * (0.5 + health);
      g.save(); g.translate(280 + k * 36, 170); g.rotate(a);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-len * 0.42, -len * 0.3, -len * 0.36, -len * 0.95, 0, -len); g.bezierCurveTo(len * 0.36, -len * 0.95, len * 0.42, -len * 0.3, 0, 0);
      g.fillStyle = i % 2 ? col : col2; g.fill(); ink(g, 2.5, '#1d5a2c');
      g.strokeStyle = '#ffffff55'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -len * 0.82); g.stroke(); g.restore();
    }
    if (s.temp < 18) for (let i = 0; i < 14; i++) { star(g, 90 + ((i * 97 + t * 12) % 380), 40 + ((i * 53 + t * 22) % 130), 4, t + i, 6, 0.3); g.fillStyle = '#cfefffcc'; g.fill(); }
    if (s.temp > 24) { g.strokeStyle = '#ff8a3c88'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); for (let y = 0; y <= 60; y += 6) g.lineTo(140 + i * 70 + Math.sin(y * 0.2 + t * 5 + i) * 5, 150 - y - ((t * 30) % 20)); g.stroke(); } }
    if (health > 0.95) for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * TAU / 6; star(g, 280 + Math.cos(a) * 96, 104 + Math.sin(a) * 52, 6, t, 4, 0.3); g.fillStyle = '#ffd23f'; g.fill(); }
  });
  return c;
}

export function plants(body, params, api) {
  const defs = [
    { key: '🌡️ Temperature', unit: '°C', min: 0, max: 40, lo: 18, hi: 24, start: 6, low: 'Too cold! Brrr', high: 'Too hot!' },
    { key: '💡 Light', unit: 'h/day', min: 0, max: 24, lo: 12, hi: 16, start: 4, low: 'Too dark', high: 'Too much light, no rest' },
    { key: '💧 Water', unit: '%', min: 0, max: 100, lo: 40, hi: 60, start: 90, low: 'Too dry', high: 'Too wet, roots drown' },
  ];
  const msg = h('p', { class: 'msg' });
  const state = defs.map((d) => d.start);
  const good = (i) => state[i] >= defs[i].lo && state[i] <= defs[i].hi;
  const view = plantScene(() => ({ temp: state[0], light: state[1], water: state[2], good: [0, 1, 2].map(good) }));
  const rows = defs.map((d, i) => {
    const out = h('span', {});
    const upd = () => { out.textContent = `${state[i]} ${d.unit} ${good(i) ? '✔' : state[i] < d.lo ? '▲' : '▼'}`; out.style.color = good(i) ? '#9cffb3' : '#ffb0a0'; };
    const inp = h('input', { type: 'range', min: d.min, max: d.max, value: d.start, oninput: (e) => { state[i] = +e.target.value; upd(); } });
    upd();
    return h('div', { class: 'slider' }, d.key, inp, out);
  });
  const check = () => {
    const bad = [0, 1, 2].filter((i) => !good(i));
    if (!bad.length) return api.finish('The plants are happy! Lettuce likes it mild: not too hot, enough light, and damp (not soggy) roots. Heating and lamps use power, so Lea balances carefully.', 'Greenhouse ideas from the CSA Food Production toolkit. The exact ranges are simplified for the game.');
    api.miss();
    msg.textContent = bad.map((i) => `${defs[i].key}: ${state[i] < defs[i].lo ? defs[i].low : defs[i].high}`).join(' | ');
  };
  body.replaceChildren(h('p', {}, 'GREENHOUSE CONTROLS. Move the three sliders until the lettuce is happy (▲ = turn it up, ▼ = turn it down), then lock the settings.'), view, ...rows, msg,
    h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: check }, '🔒 LOCK SETTINGS')));
}

function partIcon(kind) {
  const { c, g } = cv(110, 84, 'art plain');
  if (kind === 'leaf') {
    for (const [a, col] of [[-0.5, '#2e9a48'], [0.5, '#3fc45a'], [0, '#6fdc7c']]) { g.save(); g.translate(55, 80); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-34, -22, -28, -72, 0, -74); g.bezierCurveTo(28, -72, 34, -22, 0, 0); g.fillStyle = col; g.fill(); ink(g, 2.5, '#1d5a2c'); g.strokeStyle = '#ffffff66'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -62); g.stroke(); g.restore(); }
  } else if (kind === 'roots') {
    g.fillStyle = '#3fc45a'; g.beginPath(); g.ellipse(55, 12, 16, 9, 0, 0, TAU); g.fill(); ink(g, 2.5, '#1d5a2c');
    g.strokeStyle = '#f0e2c0'; const r = rnd(4);
    for (let i = 0; i < 9; i++) { g.lineWidth = 3.5 - (i % 3); g.beginPath(); let x = 55 + (i - 4) * 3, y = 18; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (i - 4) * 2.4 + (r() - 0.5) * 8; y += 11 + r() * 3; g.lineTo(x, y); } g.stroke(); }
  } else {
    rr(g, 14, 30, 82, 44, 14); g.fillStyle = lg(g, 0, 30, 0, 74, ['#f4efe0', '#cfc6a8']); g.fill(); ink(g, 3);
    g.strokeStyle = '#a89e80'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.strokeRect(22, 38, 66, 28); g.setLineDash([]);
    for (const dx of [-14, 0, 14]) { g.beginPath(); g.ellipse(55 + dx, 24, 5, 11, dx * 0.03, 0, TAU); g.fillStyle = '#6fdc7c'; g.fill(); ink(g, 2, '#1d5a2c'); }
  }
  return c;
}

/** A petri dish where `kinds` different microbe colonies grow in front of your eyes. */
function dish(kinds) {
  const S = 124, { c } = cv(S, S, 'art plain'), cols = ['#ffd23f', '#58d66b', '#ff8a3c', '#c77dff', '#5fd4ff', '#ff5a7a'], r = rnd(kinds * 13);
  const spots = Array.from({ length: kinds * 3 }, (_, i) => { const a = r() * TAU, d = Math.sqrt(r()) * 38; return [S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, 5 + r() * 5, cols[i % kinds], r() * 0.8]; });
  loop(c, (g, t) => {
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, 58, 0, TAU); g.fillStyle = '#dfe9f7aa'; g.fill(); ink(g, 3, '#dfe6f2');
    g.beginPath(); g.arc(S / 2, S / 2, 51, 0, TAU); g.fillStyle = rg(g, S / 2, S / 2, 6, 52, ['#f6efd2', '#e3d9b2']); g.fill(); ink(g, 2, '#b9ae88');
    for (const [x, y, s, col, delay] of spots) {
      const k = Math.max(0, Math.min(1, (t - delay) / 1.1)), q = s * (1 - (1 - k) ** 3);
      if (q <= 0) continue;
      g.beginPath(); g.arc(x, y, q + 3, 0, TAU); g.fillStyle = col + '44'; g.fill();
      g.beginPath(); for (let i = 0; i <= 12; i++) { const a = i * TAU / 12, w = q * (1 + Math.sin(i * 2.4 + x) * 0.14); g.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w); } g.fillStyle = col; g.fill(); ink(g, 1.2, '#00000055');
      g.fillStyle = '#ffffff77'; g.beginPath(); g.arc(x - q * 0.3, y - q * 0.3, q * 0.25, 0, TAU); g.fill();
    }
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, 54, 3.5, 4.4); g.stroke();
  });
  return c;
}

export async function harvest(body, params, api) {
  const samples = [['leaf', 'Lettuce leaf', 2], ['roots', 'Roots', 6], ['pillow', 'Growing pillow', 5]];
  await new Promise((resolve) => {
    let left = 3;
    const next = h('button', { class: 'px-btn ok hidden', onclick: resolve }, 'COMPARE THE DISHES ▶');
    const cards = samples.map(([icon, name, kinds]) => {
      const out = h('div', { style: 'min-height:160px;display:grid;place-items:center' }, h('button', { class: 'px-btn', onclick: () => { api.ok(); out.replaceChildren(h('div', {}, dish(kinds), h('div', { style: 'color:#ffd23f' }, `${kinds} kinds of microbes`))); if (--left === 0) next.classList.remove('hidden'); } }, '🧫 SWAB'));
      return h('div', { class: 'card', style: 'cursor:default' }, partIcon(icon), name, out);
    });
    body.replaceChildren(h('p', {}, 'HARVEST LAB. Before the crew eats the lettuce, swab each part of the plant and grow the microbes in a dish. Each colour is a different kind.'), h('div', { class: 'row' }, cards), h('div', { class: 'row' }, next));
  });
  await ask(body, api, 'Where did you find the MOST kinds of microbes?', [
    { node: partIcon('leaf'), label: 'On the leaves' }, { node: partIcon('roots'), label: 'On the roots and the growing pillow', correct: true, why: 'Yes, just like in the real study. And most microbes are harmless or even helpful!' }, { label: 'Everywhere the same', big: '🟰' },
  ], { cards: true });
  await ask(body, api, 'PRETEND ALERT: one leaf dish shows a strange fuzzy spot. What do you do?', shuffle([
    { label: '🔁 Test that leaf again before anyone eats it', correct: true, why: 'Smart! One odd result needs a second test before deciding.' },
    { label: '🍽️ Serve it anyway', why: 'Not yet! We should be sure first.' }, { label: '🗑️ Throw away the whole greenhouse', why: 'Too much! We would lose all our food. Check first.' },
  ]), { before: [h('div', { class: 'row' }, dish(3))] });
  await ask(body, api, 'Re-test result: CLEAN. The fuzzy spot was just a bit of dust. Can the crew eat the lettuce?', [
    { label: '🥗 Yes, serve the salad!', correct: true, why: 'Bon appétit, Astro Base!' }, { label: 'No, never eat space lettuce', why: 'The tests say it is safe!' },
  ], { before: [h('div', { class: 'row' }, partIcon('leaf'))] });
  api.finish('Real astronauts grew leafy greens on the Space Station. Scientists tested them for germs and found them safe to eat.',
    SRC('OSD-412', 'ISS VEG-03 leafy greens microbiome: roots and growing pillows had more kinds of microbes than leaves; the crops were safe to eat. The alert in this game is pretend.'));
}

/** A tray of ryegrass: healthy (green, upright) or stressed (yellow, drooping). */
function tray(stressed) {
  const W = 240, H = 160, { c } = cv(W, H), r = rnd(stressed ? 8 : 5);
  const count = stressed ? 16 : 24, blades = Array.from({ length: count }, (_, i) => [24 + (i + r() * 0.6) * (192 / count), 38 + r() * 26, r()]);
  loop(c, (g, t) => {
    g.fillStyle = lg(g, 0, 0, 0, H, ['#16224a', '#0a1026']); g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,190,235,.12)'; g.beginPath(); g.moveTo(60, 0); g.lineTo(180, 0); g.lineTo(230, 110); g.lineTo(10, 110); g.fill();
    for (const [x, len, k] of blades) {
      const sway = Math.sin(t * 1.6 + k * 9) * (stressed ? 2 : 4);
      g.lineWidth = 4.5; g.strokeStyle = stressed ? mix('#c9c04a', '#a8843a', k) : mix('#3fc45a', '#7be08a', k); g.beginPath(); g.moveTo(x, 112);
      if (stressed) g.bezierCurveTo(x + 2, 112 - len * 0.7, x + 10 + sway, 112 - len * 0.8, x + 20 + k * 10 + sway, 112 - len * 0.35);
      else g.quadraticCurveTo(x + (k - 0.5) * 6, 112 - len * 0.6, x + (k - 0.5) * 12 + sway, 112 - len - 22);
      g.stroke();
    }
    rr(g, 10, 108, 220, 40, 8); g.fillStyle = lg(g, 0, 108, 0, 148, ['#dfe6f2', '#9aa7c4']); g.fill(); ink(g, 3);
    rr(g, 16, 104, 208, 14, 5); g.fillStyle = stressed ? '#b5532f' : '#4a3424'; g.fill(); ink(g, 2.5);
    g.fillStyle = stressed ? '#8f3a24' : '#2e1f14'; for (let i = 0; i < 18; i++) g.fillRect(22 + i * 11.2, 108 + (i % 3) * 3, 4, 3);
    label(g, stressed ? 'Mars soil simulant' : 'Potting soil', W / 2, 134, { size: 13, col: '#1d2547', stroke: null });
  });
  return c;
}

export async function greenhouse(body, params, api) {
  await ask(body, api, 'MARS SOIL EXPERIMENT, day 14. Two trays of ryegrass got the same light and water. Which tray is STRESSED?', [
    { node: tray(false), label: 'Tray A', why: 'Tray A looks green and upright. Look at the other one!' },
    { node: tray(true), label: 'Tray B', correct: true, why: 'Yes. The grass is alive, but it is struggling in the Mars-like soil.' },
  ], { cards: true });
  // Pick the two symptoms you can see.
  await new Promise((resolve) => {
    const items = shuffle([['🟡 Yellow leaves', true], ['🥀 Drooping leaves', true], ['🌺 Giant red flowers', false], ['🟣 Purple polka dots', false]]);
    const picked = new Set(); const msg = h('p', { class: 'msg' });
    const cards = items.map(([t], i) => h('div', { class: 'card', style: `animation-delay:${i * 0.07}s`, onclick: (e) => { picked.has(i) ? picked.delete(i) : picked.add(i); e.currentTarget.classList.toggle('sel'); } }, t));
    body.replaceChildren(h('p', {}, 'Look closely at Tray B. Tap the TWO symptoms you can see, then confirm.'), h('div', { class: 'row' }, tray(true)), h('div', { class: 'row' }, cards), msg,
      h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: () => { if (items.every(([, ok], i) => picked.has(i) === ok)) { api.ok(); resolve(); } else { api.miss(); msg.textContent = 'Not quite. What colour are the leaves? Are they standing up?'; } } }, 'CONFIRM DIAGNOSIS')));
  });
  await ask(body, api, 'Mars soil has few nutrients and changes the soil chemistry. What could help the seedlings? (a game idea to test!)', shuffle([
    { label: '🌿 Mix in compost for nutrients and water carefully', correct: true, why: 'A good idea to test! Scientists are still studying how to make Mars soil plant-friendly.' },
    { label: '🏜️ Add even more Mars dust', why: 'That is what stressed them!' }, { label: '🚱 Stop watering completely', why: 'Plants need water to live.' },
  ]), { before: [h('div', { class: 'row' }, tray(true))] });
  api.finish('In a real experiment, ryegrass survived two weeks in Mars soil simulant, but its leaves drooped and yellowed and its roots changed.',
    SRC('OSD-581', 'Italian ryegrass grown on Earth in MMS-1 Mars regolith simulant versus potting soil for 14 days. The compost fix is a game idea, not a measured result.'));
}

const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' }, BCOL = { A: '#ff5a5a', T: '#ffd23f', C: '#4aa8ff', G: '#58d66b' };

/** A turning DNA double helix. Broken rungs spark until `fixed()` says they are repaired. */
function helix(top, gaps, fixed) {
  const W = 560, H = 96, { c } = cv(W, H); c.style.width = '100%';
  loop(c, (g, t) => {
    g.fillStyle = lg(g, 0, 0, 0, H, ['#131f48', '#080d20']); g.fillRect(0, 0, W, H);
    const n = top.length * 2, X = (i) => 30 + i * (W - 60) / (n - 1), ph = (i) => i * 0.62 + t * 1.3;
    for (const back of [true, false]) {
      for (let i = 0; i < n; i++) {
        const s = Math.sin(ph(i)), front = Math.cos(ph(i)) > 0;
        if (front === back) continue;
        const b = top[i % top.length], gi = gaps.indexOf(i % top.length), broken = gi >= 0 && gi >= fixed() && i < top.length;
        const y1 = H / 2 - s * 30, y2 = H / 2 + s * 30;
        g.lineWidth = 6; g.globalAlpha = front ? 1 : 0.45;
        if (broken) { g.strokeStyle = '#ff5a5a'; g.setLineDash([3, 7]); g.beginPath(); g.moveTo(X(i), y1); g.lineTo(X(i), H / 2 - s * 6); g.stroke(); g.setLineDash([]); if (Math.sin(t * 14 + i) > 0.3) { star(g, X(i), H / 2 + s * 8, 6, t * 5, 4, 0.3); g.fillStyle = '#fff6c8'; g.fill(); } }
        else { g.strokeStyle = BCOL[b]; g.beginPath(); g.moveTo(X(i), y1); g.lineTo(X(i), H / 2); g.stroke(); g.strokeStyle = BCOL[PAIR[b]]; g.beginPath(); g.moveTo(X(i), H / 2); g.lineTo(X(i), y2); g.stroke(); }
        g.globalAlpha = 1;
      }
      for (const sign of [1, -1]) {
        g.strokeStyle = back ? '#5a6ea8' : '#dfe6f2'; g.lineWidth = back ? 4 : 6; g.beginPath(); let pen = false;
        for (let x = 20; x <= W - 20; x += 4) { const p = ((x - 30) / ((W - 60) / (n - 1))) * 0.62 + t * 1.3, front = Math.cos(p) * sign > 0; if (front === back) { pen = false; continue; } const y = H / 2 - Math.sin(p) * 30 * sign; pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; }
        g.stroke();
      }
    }
  });
  return c;
}

export async function dna(body, params, api) {
  const top = Array.from({ length: 8 }, () => 'ATCG'[Math.floor(Math.random() * 4)]);
  const gaps = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4).sort((a, b) => a - b);
  await new Promise((resolve) => {
    let g = 0;
    const cell = (ch, cls = '') => h('span', { class: 'base ' + cls, style: ch ? `--c:${BCOL[ch]}` : '' }, ch || '?');
    const msg = h('p', { class: 'msg' }, 'Rule: A pairs with T. C pairs with G.');
    const strand = h('div', { class: 'strand' });
    const draw = () => {
      const bottom = top.map((b, i) => { const gi = gaps.indexOf(i); return gi >= 0 && gi >= g ? cell('', gi === g ? 'gap now' : 'gap') : cell(PAIR[b], gi >= 0 && gi === g - 1 ? 'fixed' : ''); });
      strand.replaceChildren(h('div', {}, top.map((b) => cell(b))), h('div', {}, bottom));
    };
    const btns = 'ATCG'.split('').map((b) => h('button', { class: 'px-btn dna-btn', style: `--c:${BCOL[b]}`, onclick: () => {
      if (g >= gaps.length) return;
      if (PAIR[top[gaps[g]]] === b) { g++; sfx('zip'); draw(); if (g === gaps.length) { sfx('sparkle'); msg.textContent = '✨ DNA repaired!'; setTimeout(resolve, 1200); } }
      else { api.miss(); msg.textContent = `Not ${b}. Look at the letter above the white box: A↔T, C↔G.`; }
    } }, b));
    draw();
    body.replaceChildren(h('p', {}, 'DNA REPAIR LAB. Space radiation broke this plant\'s DNA. Fill each gap (white box first) with the matching letter.'), helix(top, gaps, () => g), strand, h('div', { class: 'row' }, btns), msg);
  });
  const groups = [['Control (no radiation)', 12], ['Low dose (40 cGy)', 55], ['High dose (80 cGy)', 96]];
  const pick = Math.floor(Math.random() * 3);
  await ask(body, api, 'This seedling\'s "DNA repair crew" activity is shown on the gauge. Which group did it come from?',
    groups.map(([name], i) => ({ label: name, correct: i === pick, why: i === pick ? 'Right! More radiation = the plant switches on more DNA repair.' : 'Compare the gauge: empty = no radiation, full = high dose.' })),
    { before: [h('p', { style: 'color:#ffd23f' }, 'Plants cannot run away from radiation, so they turn on repair genes. The stronger the radiation, the harder the repair crew works.'), h('div', { class: 'slider' }, '🧬 REPAIR ACTIVITY', h('div', { class: 'gauge' }, h('i', { style: `width:${groups[pick][1]}%;background:linear-gradient(90deg,#58d66b,#ffd23f,#ff5a5a)` })), '')] });
  api.finish('Knowing how plants repair their DNA helps scientists choose crops that can grow under Mars radiation.',
    SRC('OSD-658', 'Arabidopsis seedlings exposed on Earth to simulated cosmic rays (control, 40 cGy, 80 cGy): stronger dose, more DNA-repair gene activity. The letter puzzle is a teaching model.'));
}
