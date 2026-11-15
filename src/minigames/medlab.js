// Elsa's medical science jobs, one different activity per sol:
// vitals (routine checkup), cells (blood sample under the microscope),
// dose (radiation badges), fitness (what Mars gravity does to the body).
import { h, shuffle, tone } from '../ui.js';
import { ask } from './index.js';
import { cv, loop, pointerOn, rnd, rr, ink, lg, rg, label, star, drawAstro, TAU } from '../art.js';
import { CREW } from '../data/sols.js';
import { S } from '../state.js';

/** A small meter: green band = normal range, the marker = this reading. */
function meter(value, { min, max, lo, hi, unit, icon, name }) {
  const W = 190, H = 96, { c } = cv(W, H, 'art mini'), X = (v) => 14 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * (W - 28);
  const ok = value >= lo && value <= hi;
  loop(c, (g, t) => {
    g.fillStyle = '#060a16'; g.fillRect(0, 0, W, H);
    label(g, `${icon} ${name}`, W / 2, 16, { size: 14, stroke: null });
    rr(g, 14, 50, W - 28, 14, 7); g.fillStyle = '#ff5a5a55'; g.fill();
    rr(g, X(lo), 50, X(hi) - X(lo), 14, 4); g.fillStyle = '#58d66b'; g.fill();
    const x = X(value) + Math.sin(t * 7 + value) * 1.2;
    g.beginPath(); g.moveTo(x, 46); g.lineTo(x - 7, 34); g.lineTo(x + 7, 34); g.closePath(); g.fillStyle = '#fff'; g.fill(); ink(g, 2);
    g.fillStyle = '#fff'; g.fillRect(x - 1.5, 46, 3, 22);
    g.font = '22px VT323, monospace'; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText(`${value} ${unit}`, W / 2, 84);
  });
  return { c, ok };
}

const VITALS = {
  heart: { min: 40, max: 140, lo: 60, hi: 100, unit: 'bpm', icon: '💓', name: 'Heart rate' },
  temp: { min: 35, max: 40, lo: 36, hi: 37.5, unit: '°C', icon: '🌡️', name: 'Temperature' },
  oxy: { min: 85, max: 100, lo: 95, hi: 100, unit: '%', icon: '🫁', name: 'Blood oxygen' },
};

// ---------- Routine checkup: compare each reading with the normal range ----------
export async function vitals(body, params, api) {
  const chart = h('p', { class: 'tip' }, '📋 NORMAL RANGES (the green band): heart 60–100 beats per minute · temperature 36–37.5 °C · blood oxygen 95–100 %');
  const cases = shuffle([
    { who: 'max', v: { heart: 74, temp: 36.8, oxy: 98 }, odd: null },
    { who: 'charles', v: { heart: 118, temp: 36.9, oxy: 97 }, odd: 'heart', fix: ['Rest for ten minutes, then measure again', 'He just ran on the treadmill! A fast heart after exercise is normal, and it slows down with rest.'], wrong: ['Give him medicine right away', 'Send him to bed for a week'] },
    { who: 'lea', v: { heart: 70, temp: 36.6, oxy: 91 }, odd: 'oxy', fix: ['Check the air in her room and measure again', 'Good thinking! Low blood oxygen can mean the air recycler needs attention. Finding it early stops a bigger problem.'], wrong: ['Tell her to hold her breath', 'Nothing, 91 is fine'] },
  ]);
  for (let i = 0; i < cases.length; i++) {
    const k = cases[i], crew = CREW[k.who], { c: face } = cv(110, 120, 'art plain');
    loop(face, (g, t) => { g.clearRect(0, 0, 110, 120); g.beginPath(); g.ellipse(55, 110, 42, 8, 0, 0, TAU); g.fillStyle = '#5fd4ff55'; g.fill(); drawAstro(g, 55, 110, 1, crew.css, { t }); });
    const head = [chart, h('div', { class: 'row', style: 'align-items:center' }, face, h('p', { style: 'flex:1;min-width:200px' }, `CHECKUP ${i + 1} of 3: ${crew.name.toUpperCase()}. Is every marker inside its green band? Tap the reading that is OUTSIDE, or tap "all normal".`))];
    const opts = Object.keys(VITALS).map((key) => { const m = meter(k.v[key], VITALS[key]); return { node: m.c, label: '', correct: k.odd === key, why: k.odd === key ? 'Yes! That marker is outside the green band.' : 'That marker is inside the green band, so it is normal.' }; });
    opts.push({ big: '✅', label: 'All readings are normal', correct: !k.odd, why: k.odd ? 'Look again: one marker is outside its green band.' : `Right! ${crew.name} is perfectly healthy.` });
    await ask(body, api, '', opts, { cards: true, before: head });
    if (k.odd) await ask(body, api, `${crew.name}'s ${VITALS[k.odd].name.toLowerCase()} is ${k.v[k.odd]} ${VITALS[k.odd].unit}. What should Doctor Elsa do first?`, shuffle([{ label: k.fix[0], correct: true, why: k.fix[1] }, ...k.wrong.map((w) => ({ label: w, why: 'Too much or too little! A good doctor checks again before deciding.' }))]), { before: [chart, h('div', { class: 'row' }, meter(k.v[k.odd], VITALS[k.odd]).c)] });
  }
  api.finish('Checkup done! Flight doctors look at the crew\'s numbers every day. Spotting a small change early stops it from becoming an emergency.', 'The normal ranges are typical values for healthy people at rest. Simplified for the game, not medical advice.');
}

// ---------- Blood sample: find the white blood cells ----------
export async function cells(body, params, api) {
  await new Promise((resolve) => {
    const W = 420, H = 300, R = 138, { c } = cv(W, H), r = rnd(Date.now() % 9999), NEED = 5;
    const mk = (white) => ({ a: r() * TAU, d: Math.sqrt(r()) * (R - 22), va: (r() - 0.5) * 0.25, vd: (r() - 0.5) * 6, s: white ? 15 : 10 + r() * 3, white, hit: 0, ph: r() * 6 });
    const list = [...Array.from({ length: 34 }, () => mk(false)), ...Array.from({ length: NEED }, () => mk(true))];
    let found = 0, oops = 0;
    const msg = h('p', { class: 'msg' }, `White blood cells found: 0 of ${NEED}`);
    const pos = (o) => [W / 2 + Math.cos(o.a) * o.d, H / 2 + Math.sin(o.a) * o.d];
    loop(c, (g, t, dt) => {
      oops = Math.max(0, oops - dt * 3);
      g.fillStyle = '#060a16'; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.arc(W / 2, H / 2, R, 0, TAU); g.clip();
      g.fillStyle = rg(g, W / 2, H / 2, 10, R, ['#ffe9e0', '#ffc9b8']); g.fillRect(0, 0, W, H);
      for (const o of list) {
        o.a += o.va * dt; o.d += o.vd * dt; if (o.d > R - 20 || o.d < 4) o.vd *= -1;
        const [x, y] = pos(o), wob = 1 + Math.sin(t * 2 + o.ph) * 0.05;
        if (o.white) {
          g.beginPath(); for (let i = 0; i <= 14; i++) { const a = i * TAU / 14, q = o.s * (1 + Math.sin(a * 3 + t * 2 + o.ph) * 0.08); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
          g.fillStyle = o.hit ? '#b6ffc4' : '#e9dcff'; g.fill(); ink(g, 2, o.hit ? '#1f9d45' : '#7a5ac8');
          g.fillStyle = o.hit ? '#1f9d45' : '#7a5ac8'; g.beginPath(); g.arc(x - 4, y - 2, 5.5, 0, TAU); g.arc(x + 4, y + 3, 5, 0, TAU); g.fill();
          if (o.hit) label(g, '✔', x, y - o.s - 8, { size: 14, col: '#1f9d45', stroke: '#fff' });
        } else {
          g.beginPath(); g.ellipse(x, y, o.s * wob, o.s * 0.9 * wob, o.ph, 0, TAU); g.fillStyle = '#e8483f'; g.fill(); ink(g, 1.5, '#9c241f');
          g.beginPath(); g.ellipse(x, y, o.s * 0.45, o.s * 0.38, o.ph, 0, TAU); g.fillStyle = '#c93a32'; g.fill();
        }
      }
      if (oops > 0) { g.fillStyle = `rgba(255,90,90,${oops * 0.35})`; g.fillRect(0, 0, W, H); }
      g.restore();
      g.beginPath(); g.arc(W / 2, H / 2, R, 0, TAU); ink(g, 12, '#2b3559'); ink(g, 3, '#9fb4d8');
      label(g, '×400', W - 40, H - 18, { size: 14, col: '#9fe8ff', stroke: null });
    });
    c.style.cursor = 'crosshair';
    c.addEventListener('pointerdown', (e) => {
      const p = pointerOn(c, e, W), near = list.map((o) => { const [x, y] = pos(o); return [Math.hypot(x - p.x, y - p.y) - o.s, o]; }).sort((a, b) => a[0] - b[0])[0];
      if (!near || near[0] > 8) return;
      const o = near[1];
      if (!o.white) { api.miss(); oops = 1; msg.textContent = 'That is a red blood cell. White ones are bigger, pale purple, with dark spots inside.'; return; }
      if (o.hit) return;
      o.hit = 1; found++; tone(500 + found * 90, 0.12); msg.textContent = `White blood cells found: ${found} of ${NEED}`;
      if (found === NEED) setTimeout(resolve, 1100);
    });
    body.replaceChildren(h('p', {}, 'BLOOD SAMPLE LAB. Elsa put a drop of blood under the microscope. Red cells carry oxygen. WHITE cells fight germs: they are bigger and pale purple with dark spots. Tap all 5 white cells!'), h('div', { class: 'row' }, c), msg);
  });
  await ask(body, api, 'There were 5 white cells among many red ones. That is a normal number. What does it tell Doctor Elsa?', shuffle([
    { label: '🙂 The body is not fighting a big infection right now', correct: true, why: 'Exactly. Lots of extra white cells would mean the body is busy fighting germs.' },
    { label: '🩸 The astronaut has no blood', why: 'There is plenty of blood here!' }, { label: '🦠 The astronaut is very sick', why: 'A normal count is a good sign.' },
  ]));
  api.finish('Sample analysed! On the Space Station, astronauts take blood samples so scientists can study how living in space changes the body\'s defences.', 'Real astronaut blood studies look at the immune system in space. The count in this game is simplified.');
}

// ---------- Radiation badges: who needs the shelter? ----------
export async function dose(body, params, api) {
  const baseDose = Math.round(20 + (100 - S.res.shield) * 0.5);                       // weaker shield today = bigger readings
  const extra = shuffle([0, 6, 14, 34]), ids = ['max', 'elsa', 'charles', 'lea'], doses = Object.fromEntries(ids.map((id, i) => [id, Math.min(98, baseDose + extra[i])]));
  const top = ids.reduce((a, b) => (doses[b] > doses[a] ? b : a)), LIMIT = Math.min(90, baseDose + 24);
  const badge = (id) => {
    const W = 120, H = 170, { c } = cv(W, H, 'art plain'); let lvl = 0;
    loop(c, (g, t, dt) => {
      lvl += (doses[id] - lvl) * Math.min(1, dt * 2.5); g.clearRect(0, 0, W, H);
      rr(g, 34, 6, 52, 126, 12); g.fillStyle = '#0b1020'; g.fill(); ink(g, 4, CREW[id].css);
      g.save(); rr(g, 39, 11, 42, 116, 8); g.clip(); const y = 127 - lvl * 1.16;
      g.fillStyle = lg(g, 0, 127, 0, 11, ['#58d66b', '#ffd23f', '#ff5a5a']); g.fillRect(39, y, 42, 127 - y); g.restore();
      const ly = 127 - LIMIT * 1.16; g.strokeStyle = '#fff'; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(24, ly); g.lineTo(96, ly); g.stroke(); g.setLineDash([]);
      label(g, 'limit', 104, ly - 8, { size: 10, stroke: null }); label(g, '☢️', 60, 24, { size: 14, stroke: null });
      label(g, `${Math.round(lvl)}`, 60, 148, { size: 20, col: '#ffd23f' });
    });
    return c;
  };
  const intro = h('p', { style: 'color:#ffd23f' }, 'RADIATION BADGES. Every astronaut wears a badge that adds up the radiation they receive. The white dashed line is today\'s safe limit. Today\'s readings depend on how strong our shielding is.');
  await ask(body, api, 'Read the four badges. Who received the MOST radiation today?', ids.map((id) => ({ node: badge(id), label: CREW[id].name, correct: id === top, why: id === top ? `Yes, ${CREW[id].name}'s badge is the fullest.` : 'Compare the heights of the coloured bars.' })), { cards: true, before: [intro] });
  await ask(body, api, `${CREW[top].name}'s badge is above the limit line. What is the best plan?`, shuffle([
    { label: `🛡️ ${CREW[top].name} works in the shielded area for the rest of the sol`, correct: true, why: 'Right! Doctors cannot remove radiation, but they can limit how much more someone gets.' },
    { label: '🧼 Wash the badge so the number goes down', why: 'The badge only counts. Cleaning it changes nothing.' }, { label: '🚪 Everyone goes outside for fresh air', why: 'Outside there is even less protection!' },
  ]), { before: [intro, h('div', { class: 'row' }, badge(top))] });
  api.finish('Dose check done. On real missions each astronaut\'s radiation is tracked for their whole career, so nobody ever gets too much.', 'Badge numbers are game values linked to the base shielding, not real measurements. Source for the idea: NASA space radiation monitoring.');
}

// ---------- Mars gravity and the body ----------
export async function fitness(body, params, api) {
  const W = 520, H = 210, { c } = cv(W, H), st = { jump: false, t0: null };
  loop(c, (g, t) => {
    if (st.jump && st.t0 == null) st.t0 = t;
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, W, H);
    [['EARTH · 1 g', 0, ['#8fd0ff', '#dff2ff'], '#58a65a', 1], ['MARS · 0.38 g', W / 2, ['#f7c896', '#ec9f66'], '#c7532f', 2.6]].forEach(([name, x, sky, ground, k], i) => {
      g.fillStyle = lg(g, 0, 0, 0, 170, sky); g.fillRect(x + 4, 4, W / 2 - 8, H - 8); g.fillStyle = ground; g.fillRect(x + 4, 172, W / 2 - 8, H - 176);
      label(g, name, x + W / 4, 20, { size: 15 });
      const cycle = st.jump ? ((t - st.t0) % (1.2 * Math.sqrt(k) + 0.5)) / (1.2 * Math.sqrt(k)) : 0, air = cycle > 0 && cycle < 1 ? 4 * cycle * (1 - cycle) : 0, hgt = 42 * k * air;
      for (let m = 1; m <= 3; m++) { const y = 172 - m * 36; g.strokeStyle = '#1d254744'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + 60, y); g.stroke(); label(g, `${(m * 0.4).toFixed(1)} m`, x + 44, y - 8, { size: 11, col: '#1d2547', stroke: null }); }
      g.fillStyle = '#00000033'; g.beginPath(); g.ellipse(x + W / 4 + 20, 176, 24 - hgt * 0.08, 6, 0, 0, TAU); g.fill();
      drawAstro(g, x + W / 4 + 20, 174 - hgt, 0.8, i ? '#ff5a7a' : '#4aa8ff', { t, mood: st.jump ? 'happy' : 'ok' });
    });
  });
  const view = h('div', { class: 'row' }, c);
  const q1 = ask(body, api, 'Mars pulls on your body with only 38% of Earth\'s gravity. With the SAME push from your legs, how high will Elsa jump on Mars?', [
    { label: 'About 2½ times higher than on Earth', correct: true, why: 'Yes! Watch the two jumps: less gravity pulling down means a much higher jump.' },
    { label: 'Exactly the same height', why: 'Gravity is weaker on Mars. What does that do to a jump?' }, { label: 'Lower than on Earth', why: 'It is the other way round: weaker gravity holds you down less.' },
  ], { before: [h('p', { style: 'color:#ffd23f' }, 'MARS GRAVITY LAB. Before the expedition, Doctor Elsa tests how the crew\'s bodies cope with Mars gravity.'), view] });
  const watch = setInterval(() => { if (body.querySelector('.px-btn.ok')) { clearInterval(watch); st.jump = true; } }, 100);
  api.onCleanup(() => clearInterval(watch));
  await q1;
  await ask(body, api, 'A backpack weighs 40 kg on the scale on Earth. What does the same scale show on Mars?', shuffle([
    { label: 'About 15 kg', correct: true, why: 'Right: 38% of 40 is about 15. The backpack is the same, it is just pulled down less.' }, { label: '40 kg, nothing changes', why: 'The backpack is the same, but the scale feels less pull.' }, { label: 'About 100 kg', why: 'Mars has LESS gravity than Earth.' },
  ]), { before: [view] });
  await ask(body, api, 'Everything feels light, so muscles and bones do less work and slowly get weaker. What keeps the crew strong?', shuffle([
    { label: '🏋️ Exercise every day, pulling and pushing against something heavy', correct: true, why: 'Yes! Space Station astronauts exercise about two hours every day for exactly this reason.' },
    { label: '🛌 Staying in bed to save energy', why: 'Resting all day makes muscles weaker even faster.' }, { label: '🍬 Eating more sweets', why: 'Tasty, but it does not build muscle or bone.' },
  ]), { before: [view] });
  api.finish('The crew is fit for the expedition! Doctors study low gravity carefully, because a long mission can weaken muscles, bones and even the heart.', 'Mars gravity is 38% of Earth\'s (NASA Mars facts). Space Station crews exercise about 2 hours a day (NASA). The jump is a simple model.');
}
