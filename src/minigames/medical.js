// Elsa's tasks: bone scans (OSD-980) and crew checkups.
import { h, shuffle } from '../ui.js';
import { ask, SRC } from './index.js';
import { cv, loop, rnd, rr, ink, lg, rg, label, drawAstro, TAU } from '../art.js';
import { CREW } from '../data/sols.js';

/** A bone cross-section as the scanner shows it: outer ring thickness `wall`, `dots` inner supports. */
function boneCanvas(wall, dots) {
  const S = 136, { c } = cv(S, S, 'art mini'), seed = Math.floor(Math.random() * 999) + 1, spin = Math.random() * 6;
  loop(c, (g, t) => {
    g.fillStyle = rg(g, S / 2, S / 2, 6, S * 0.7, ['#10204a', '#050a18']); g.fillRect(0, 0, S, S);
    g.strokeStyle = '#5fd4ff22'; g.lineWidth = 1; for (let i = 16; i < S; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    const R = 54, inner = R - wall, r = rnd(seed);
    g.shadowColor = '#bfefff'; g.shadowBlur = 12;
    g.beginPath(); g.arc(S / 2, S / 2, R, 0, TAU); g.fillStyle = rg(g, S / 2 - 14, S / 2 - 14, 6, R + 8, ['#fffdf0', '#e8e2c8', '#bdb69a']); g.fill(); g.shadowBlur = 0;
    g.beginPath(); g.arc(S / 2, S / 2, inner, 0, TAU); g.fillStyle = rg(g, S / 2, S / 2, 2, inner, ['#5a2030', '#2c0f18']); g.fill();
    g.save(); g.clip(); g.strokeStyle = '#e8e2c8'; g.lineCap = 'round';
    const pts = Array.from({ length: dots }, () => { const a = r() * TAU, d = Math.sqrt(r()) * inner; return [S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d]; });
    pts.forEach(([x, y], i) => { const [x2, y2] = pts[(i + 3) % pts.length]; g.lineWidth = 3 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x2 - x) * 0.55, y + (y2 - y) * 0.55); g.stroke(); g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fillStyle = '#e8e2c8'; g.fill(); });
    g.restore();
    const a = t * 1.6 + spin;                                               // scanner sweep
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, R + 6, 0, TAU); g.clip();
    g.fillStyle = '#5fd4ff2e'; g.beginPath(); g.moveTo(S / 2, S / 2); g.arc(S / 2, S / 2, R + 8, a - 0.7, a); g.fill();
    g.strokeStyle = '#9fe8ffcc'; g.lineWidth = 2; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + Math.cos(a) * (R + 8), S / 2 + Math.sin(a) * (R + 8)); g.stroke(); g.restore();
    g.strokeStyle = '#5fd4ff'; g.lineWidth = 2; for (const [x, y, sx, sy] of [[6, 6, 1, 1], [S - 6, 6, -1, 1], [6, S - 6, 1, -1], [S - 6, S - 6, -1, -1]]) { g.beginPath(); g.moveTo(x + 12 * sx, y); g.lineTo(x, y); g.lineTo(x, y + 12 * sy); g.stroke(); }
  });
  return c;
}

export async function bones(body, params, api) {
  const intro = h('p', {}, 'BONE SCANNER. Without enough weight on them, bones get thinner. Strong bone has a THICK pale ring and lots of little supports inside.');
  for (let round = 1; round <= 2; round++) {
    const weak = Math.floor(Math.random() * 4);
    const opts = [0, 1, 2, 3].map((i) => ({
      node: i === weak ? boneCanvas(9, 5) : boneCanvas(20 + Math.floor(Math.random() * 5), 14),
      label: 'Scan ' + 'ABCD'[i], correct: i === weak,
      why: i === weak ? 'Yes! Thin ring and few supports: this bone is getting weak.' : 'That bone looks strong: thick ring, many supports.',
    }));
    await ask(body, api, `Scan ${round} of 2: tap the bone that is getting WEAK.`, opts, { cards: true, before: [intro] });
  }
  await ask(body, api, 'Two habitats were compared. Look at the scans: in which habitat did the bone ring get thinner?', [
    { node: boneCanvas(10, 8), label: '❄️ Cool habitat (22 °C)', correct: true, why: 'Right! In the mouse study, bones lost more of their outer ring in the cooler home.' },
    { node: boneCanvas(15, 8), label: '☀️ Warm habitat (32 °C)', why: 'Compare the pale rings again. Which one is thinner?' },
  ], { cards: true });
  api.finish('Elsa\'s advice: astronauts exercise every day to keep their bones strong, and the habitat temperature may matter too.',
    SRC('OSD-980', 'Mice whose back legs carried no weight lost bone, more at 22 °C than at 32 °C. Mouse results are not the same as astronaut results.'));
}

const CASES = {
  dust: { who: 'Max', story: 'Max worked outside in the dust storm. He is coughing and feels tired.',
    readings: [['🫁 Breathing', 'Fast, with coughing', true], ['🌡️ Temperature', '36.8 °C (normal)'], ['💓 Heart rate', '72 beats/min (normal)']],
    cures: [['Rest, fresh filtered air and water', true, 'Good care! Mars dust is very fine and must be kept out of the base and the lungs.'], ['Send him back outside right now'], ['Tell him to hold his breath all day']] },
  nutrition: { who: 'Lea', story: 'Lea feels weak and a little dizzy after the cold night.',
    readings: [['🍽️ Energy from food', 'LOW', true], ['🌡️ Temperature', '36.7 °C (normal)'], ['💓 Heart rate', '70 beats/min (normal)']],
    cures: [['A balanced meal with fresh greens from the greenhouse', true, 'Yes! Fresh food gives vitamins and also cheers the crew up.'], ['Skip lunch to save food'], ['Only eat candy this week']] },
  radiation: { who: 'Charles', story: 'After the solar storm, Elsa checks everyone\'s radiation badge.',
    readings: [['☢️ Radiation badge', 'HIGHER than usual', true], ['🌡️ Temperature', '36.9 °C (normal)'], ['💓 Heart rate', '74 beats/min (normal)']],
    cures: [['Stay in the shielded area and keep tracking the dose', true, 'Correct. Doctors track each astronaut\'s radiation dose during the whole mission.'], ['Go for a walk outside in the storm'], ['Throw the badge away']] },
  clearance: { who: 'Charles', story: 'Charles wants to drive the rover. Is he fit for the expedition?',
    readings: [['💧 Hydration', 'LOW: needs water', true], ['🌡️ Temperature', '36.8 °C (normal)'], ['💓 Heart rate', '68 beats/min (normal)']],
    cures: [['Drink water, rest ten minutes, then he is cleared to go', true, 'Cleared for exploration! Spacesuit work is sweaty, so astronauts drink plenty first.'], ['Cancel all exploration forever'], ['Leave now without drinking']] },
  sick: { who: null, story: 'has a sore throat and feels warm.',
    readings: [['🌡️ Temperature', '38.2 °C: a small fever', true], ['💓 Heart rate', '76 beats/min (normal)'], ['💧 Hydration', 'OK']],
    cures: [['Rest in bed, drink fluids, and another checkup tomorrow', true, 'Good doctoring. Resting means some work waits, but a healthy crew matters most.'], ['Work twice as hard today'], ['Ignore it']] },
};

/** Medical bay view: the patient on the scanner bed plus a live monitor that fills in as you measure. */
function patientView(who, state) {
  const W = 600, H = 170, { c } = cv(W, H); c.style.width = '100%';
  const col = Object.values(CREW).find((x) => x.name === who)?.css || '#9aa7c4';
  loop(c, (g, t) => {
    g.fillStyle = lg(g, 0, 0, 0, H, ['#dfe9ff', '#b9c8ee']); g.fillRect(0, 0, W, H);
    g.fillStyle = '#9fb0dc'; g.fillRect(0, H - 34, W, 34); g.fillStyle = '#8496c8'; g.fillRect(0, H - 34, W, 4);
    rr(g, 26, 20, 46, 46, 10); g.fillStyle = '#fff'; g.fill(); ink(g, 3); g.fillStyle = '#ff5a5a'; g.fillRect(43, 28, 12, 30); g.fillRect(34, 37, 30, 12);
    g.beginPath(); g.ellipse(150, H - 30, 62, 12, 0, 0, TAU); g.fillStyle = '#5fd4ff66'; g.fill(); ink(g, 3, '#2a8fd8');           // scanner pad
    const scanY = 30 + ((t * 60) % 110);
    if (!state.healed) { g.fillStyle = lg(g, 0, scanY - 10, 0, scanY + 10, ['#5fd4ff00', '#5fd4ffaa', '#5fd4ff00']); g.fillRect(96, scanY - 10, 108, 20); }
    drawAstro(g, 150, H - 30, 1.15, col, { t, mood: state.healed ? 'happy' : 'sick' });
    label(g, who, 150, 16, { size: 15, col: '#1d2547', stroke: null });
    rr(g, 250, 14, 330, 142, 14); g.fillStyle = '#0b1020'; g.fill(); ink(g, 4, '#3a4563');                                       // monitor
    g.strokeStyle = '#58d66b22'; g.lineWidth = 1; for (let x = 262; x < 570; x += 14) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 70); g.stroke(); }
    g.strokeStyle = state.healed ? '#58d66b' : '#ffd23f'; g.lineWidth = 2.5; g.shadowColor = g.strokeStyle; g.shadowBlur = 8; g.beginPath();
    for (let x = 0; x <= 300; x += 2) { const k = ((x + t * 90) % 75) / 75, y = 48 - (k > 0.42 && k < 0.5 ? Math.sin((k - 0.42) / 0.08 * Math.PI) * 22 : k > 0.5 && k < 0.56 ? -Math.sin((k - 0.5) / 0.06 * Math.PI) * 9 : Math.sin(k * 30) * 1); x ? g.lineTo(264 + x, y) : g.moveTo(264 + x, y); }
    g.stroke(); g.shadowBlur = 0;
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '18px VT323, monospace';
    state.lines.forEach(([name, value, bad], i) => { g.fillStyle = bad ? '#ffb0a0' : '#9cffb3'; g.fillText(`${name}: ${value}`.slice(0, 44), 264, 88 + i * 21); });
    if (!state.lines.length) { g.fillStyle = '#6b7bb5'; g.fillText('Waiting for measurements' + '.'.repeat(1 + Math.floor(t * 2) % 3), 264, 100); }
    if (state.healed) { label(g, '✔ TREATMENT OK', 500, 30, { size: 13, col: '#9cffb3', stroke: null }); }
  });
  return c;
}

export async function medical(body, { kase = 'dust', patient } = {}, api) {
  const c = CASES[kase];
  const who = c.who || patient || 'The astronaut';
  const story = h('p', {}, `PATIENT: ${who.toUpperCase()}. ${c.who ? c.story : `${who} ${c.story}`}`);
  const state = { lines: [], healed: false }, view = patientView(who, state);
  // Step 1: run every instrument to reveal its reading.
  await new Promise((resolve) => {
    let left = c.readings.length;
    const row = h('div', { class: 'row' }, shuffle(c.readings).map(([name, value, bad]) => {
      const out = h('div', { style: 'color:#ffd23f;min-height:52px' }, '???');
      const card = h('div', { class: 'card', onclick: () => { if (card.dataset.done) return; card.dataset.done = 1; card.classList.add('flip', 'sel'); setTimeout(() => { out.textContent = value; }, 220); state.lines.push([name, value, bad]); api.ok(); if (--left === 0) next.classList.remove('hidden'); } }, h('span', { class: 'big' }, name.split(' ')[0]), name.slice(name.indexOf(' ') + 1), out);
      return card;
    }));
    const next = h('button', { class: 'px-btn ok hidden', onclick: resolve }, 'READ THE RESULTS ▶');
    body.replaceChildren(story, view, h('p', {}, 'Step 1: tap each instrument to take a measurement.'), row, h('div', { class: 'row' }, next));
  });
  await ask(body, api, 'Step 2: which reading is NOT normal?', shuffle(c.readings).map(([name, value, bad]) => ({ label: `${name}: ${value}`, correct: !!bad, why: bad ? 'Yes, that reading explains the symptoms.' : 'That one is normal. Look for the unusual reading.' })), { before: [story, view] });
  const cure = ask(body, api, 'Step 3: choose the safest treatment.', shuffle(c.cures).map(([label2, ok, why]) => ({ label: label2, correct: !!ok, why: ok ? why : 'That would not be safe. Try again!' })), { before: [story, view] });
  const watch = setInterval(() => { if (body.querySelector('.px-btn.ok')) { state.healed = true; clearInterval(watch); } }, 150);
  api.onCleanup(() => clearInterval(watch));
  await cure;
  api.finish(`${who} is in good hands. The flight doctor keeps the whole crew healthy so the mission can go on.`, 'Symptoms and treatments here are simplified for the game, not medical advice.');
}
