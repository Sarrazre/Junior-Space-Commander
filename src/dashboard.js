// Mission Control: the station monitoring dashboard opened at the Command Center.
// It only DISPLAYS readings from telemetry.js (which reads the real game state).
import { h, modal, sfx } from './ui.js';
import { cv, loop, lg, rg, rr, TAU } from './art.js';
import { readTelemetry } from './telemetry.js';
import { S, solDef } from './state.js';

const COL = { ok: '#58d66b', warn: '#ffd23f', crit: '#ff5a5a', info: '#5fd4ff' };
const WORD = { ok: 'NOMINAL', warn: 'CAUTION', crit: 'CRITICAL', info: 'INFO' };
const shown = {};   // last value each dial showed, so needles and bars sweep to the new reading

function gauge(m) {
  const W = 168, H = 152, cx = W / 2, cy = 80, R = 62, A0 = Math.PI * 0.75, SWEEP = Math.PI * 1.5;
  const f = (v) => Math.max(0, Math.min(1, (v - m.min) / (m.max - m.min)));
  const { c } = cv(W, H, 'art plain');
  let cur = shown[m.key] ?? m.min;
  loop(c, (g, t, dt) => {
    cur += (m.value - cur) * Math.min(1, dt * 2.4); shown[m.key] = cur;
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(cx, cy, R + 11, 0, TAU); g.fillStyle = lg(g, 0, 0, 0, H, ['#5a6ea8', '#1a2348']); g.fill();
    g.beginPath(); g.arc(cx, cy, R + 6, 0, TAU); g.fillStyle = rg(g, cx, cy - 24, 4, R + 12, ['#1a285a', '#050816']); g.fill();
    g.lineCap = 'butt';
    for (const [a, b, s] of m.zones) { g.beginPath(); g.arc(cx, cy, R - 3, A0 + f(a) * SWEEP + 0.015, A0 + f(b) * SWEEP - 0.015); g.lineWidth = 9; g.strokeStyle = COL[s]; g.globalAlpha = s === m.status ? 1 : 0.45; g.stroke(); }
    g.globalAlpha = 1; g.lineCap = 'round';
    for (let i = 0; i <= 20; i++) { const a = A0 + (i / 20) * SWEEP, big = i % 5 === 0, r1 = R - 12, r2 = R - (big ? 22 : 17); g.strokeStyle = big ? '#fff' : '#8fa3c8'; g.lineWidth = big ? 2.2 : 1; g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
    g.font = '13px VT323, monospace'; g.fillStyle = '#8fa3c8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(m.min, cx + Math.cos(A0) * (R - 32), cy + Math.sin(A0) * (R - 32)); g.fillText(m.max, cx + Math.cos(A0 + SWEEP) * (R - 32), cy + Math.sin(A0 + SWEEP) * (R - 32));
    const a = A0 + (f(cur) + Math.sin(t * 9 + m.key.length) * 0.005 + Math.sin(t * 23) * 0.003) * SWEEP;   // tiny live flutter
    g.shadowColor = COL[m.status]; g.shadowBlur = 10; g.strokeStyle = '#fff'; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); g.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); g.stroke(); g.shadowBlur = 0;
    g.beginPath(); g.arc(cx, cy, 7, 0, TAU); g.fillStyle = '#dfe6f2'; g.fill(); g.beginPath(); g.arc(cx, cy, 3, 0, TAU); g.fillStyle = '#1d2547'; g.fill();
    rr(g, cx - 38, cy + 24, 76, 26, 6); g.fillStyle = '#02040c'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = COL[m.status]; g.stroke();
    g.font = '24px VT323, monospace'; g.fillStyle = COL[m.status]; g.fillText(`${cur.toFixed(m.dec || 0)} ${m.unit}`, cx, cy + 38);
    const blink = m.status !== 'crit' || Math.sin(t * 9) > 0;                                                // warning light
    g.beginPath(); g.arc(cx, cy - 30, 6, 0, TAU); g.fillStyle = blink ? COL[m.status] : '#3a1414'; g.shadowColor = COL[m.status]; g.shadowBlur = blink ? 12 : 0; g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#ffffff12'; g.beginPath(); g.ellipse(cx - 16, cy - 34, 34, 14, -0.5, 0, TAU); g.fill();
  });
  return h('div', { class: 'mc-gauge ' + m.status }, c, h('b', {}, m.label), h('small', {}, WORD[m.status]));
}

function bar(m) {
  const from = shown[m.key] ?? 0; shown[m.key] = m.value;
  const fill = h('i', { style: `width:${from}%` });
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = Math.max(0, Math.min(100, m.value)) + '%'; }));
  return h('div', { class: 'mc-bar ' + m.status }, h('span', { class: 'lamp' }), h('label', {}, `${m.icon} ${m.label}`),
    h('div', { class: 'track' }, fill, m.marks.map((p) => h('em', { style: `left:${p}%` }))), h('b', {}, m.text));
}

/** Scrolling live traces. The middle of each trace is the real reading; the wiggle is sensor noise. */
function traces(tm) {
  const W = 900, H = 96, { c } = cv(W, H, 'art plain'); c.style.width = '100%';
  const rows = [['POWER BUS', tm.gauges[0]], ['O₂ FLOW', tm.gauges[1]], ['RADIATION', { ...tm.bars[3], min: 0, max: 100 }]];
  loop(c, (g, t) => {
    g.fillStyle = '#02040c'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#5fd4ff1c'; g.lineWidth = 1; for (let x = -((t * 40) % 30); x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    rows.forEach(([name, m], i) => {
      const y0 = 8 + i * 30, k = (m.value - m.min) / (m.max - m.min), col = COL[m.status], rough = m.status === 'crit' ? 2.4 : m.status === 'warn' ? 1.5 : 0.8;
      g.strokeStyle = '#5fd4ff22'; g.beginPath(); g.moveTo(0, y0 + 26); g.lineTo(W, y0 + 26); g.stroke();
      g.strokeStyle = col; g.lineWidth = 2; g.shadowColor = col; g.shadowBlur = 6; g.beginPath();
      for (let x = 110; x <= W; x += 4) { const p = x * 0.05 + t * 4 + i * 9, y = y0 + 24 - k * 20 + (Math.sin(p) * 2 + Math.sin(p * 2.7) * 1.4 + Math.sin(p * 7.1)) * rough; x === 110 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke(); g.shadowBlur = 0;
      g.font = '15px VT323, monospace'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(name, 8, y0 + 14);
    });
  });
  return c;
}

/** How the four real resources changed sol by sol. */
function trend(history) {
  const W = 300, H = 110, { c, g } = cv(W, H, 'art plain'); c.style.width = '100%';
  g.fillStyle = '#02040c'; rr(g, 0, 0, W, H, 8); g.fill();
  const X = (i) => 26 + i * (W - 44) / 5, Y = (v) => H - 20 - v * (H - 34) / 100;
  g.font = '13px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) { g.strokeStyle = '#5fd4ff22'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(i), 8); g.lineTo(X(i), H - 18); g.stroke(); g.fillStyle = '#8fa3c8'; g.fillText(i === 0 ? 'start' : 'sol ' + i, X(i), H - 8); }
  [['power', '#ffd23f'], ['shield', '#5fd4ff'], ['food', '#58d66b'], ['health', '#ff5a7a']].forEach(([key, col]) => {
    g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath();
    history.forEach((r, i) => { const x = i === history.length - 1 ? X(i - 1) + (X(i) - X(i - 1)) * 0.5 : X(i); i ? g.lineTo(x, Y(r[key])) : g.moveTo(x, Y(r[key])); });
    g.stroke();
  });
  return h('div', {}, c, h('div', { class: 'mc-legend' }, h('span', { style: 'color:#ffd23f' }, '— power'), h('span', { style: 'color:#5fd4ff' }, '— shield'), h('span', { style: 'color:#58d66b' }, '— food'), h('span', { style: 'color:#ff5a7a' }, '— health')));
}

/**
 * Open the dashboard. Resolves with 'crisis' (commander wants to decide), 'task' (do the job at this terminal) or 'close'.
 * opts: { canDecide, taskTitle, note }
 */
export function openDashboard({ canDecide = false, taskTitle = null, note = null } = {}) {
  return new Promise((resolve) => {
    const tm = readTelemetry();
    if (tm.overall === 'crit') sfx('alert'); else sfx('ok');
    const clock = h('span', { class: 'mc-clock' });
    const t0 = Date.now(), tick = () => { const s = Math.floor((Date.now() - t0) / 1000) + S.sol * 3600 + 7 * 60; clock.textContent = `MET ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    tick(); const timer = setInterval(tick, 1000);
    const done = (what) => { clearInterval(timer); window.removeEventListener('keydown', esc); m.close(); resolve(what); };
    const esc = (e) => { if (e.code === 'Escape') done('close'); };
    window.addEventListener('keydown', esc);
    const count = (lvl) => tm.alerts.filter((a) => a.level === lvl).length;
    const m = modal(
      h('div', { class: 'mc-head ' + tm.overall },
        h('span', { class: 'mc-master' }), h('div', {}, h('b', {}, 'MISSION CONTROL · ASTRO BASE'), h('small', {}, `Sol ${S.sol} of 5 – ${solDef().title}`)),
        clock, h('span', { class: 'mc-state' }, `STATION ${WORD[tm.overall]}`)),
      h('div', { class: 'mc-key' }, h('span', { class: 'ok' }, '● Nominal: working normally'), h('span', { class: 'warn' }, '● Caution: needs attention'), h('span', { class: 'crit' }, '● Critical: act now')),
      h('div', { class: 'mc-grid' },
        h('section', {},
          h('h4', {}, 'CRITICAL SYSTEMS'), h('div', { class: 'mc-gauges' }, tm.gauges.map(gauge)),
          h('h4', {}, 'RESERVES'), h('div', {}, tm.bars.map(bar)),
          h('h4', {}, 'LIVE TELEMETRY'), traces(tm)),
        h('section', {},
          h('h4', {}, `ALERTS  ·  ${count('crit')} critical  ·  ${count('warn')} caution`),
          h('div', { class: 'mc-alerts' }, tm.alerts.map((a, i) => h('div', { class: 'mc-alert ' + a.level, style: `animation-delay:${i * 0.05}s` }, h('span', {}, a.icon), h('div', {}, h('b', {}, a.title), h('small', {}, a.text))))),
          h('h4', {}, 'SUBSYSTEMS'), h('div', { class: 'mc-lamps' }, tm.lamps.map((l) => h('div', { class: l.status }, h('span', { class: 'lamp' }), l.name))),
          h('h4', {}, 'TONIGHT\'S FORECAST'), h('div', { class: 'mc-forecast' }, tm.forecast.map(([name, delta, lvl]) => h('div', { class: lvl }, name, h('b', {}, delta)))),
          h('h4', {}, 'MISSION TREND'), trend(tm.history))),
      note && h('p', { class: 'note', style: 'text-align:center' }, note),
      h('div', { class: 'actions' },
        canDecide && h('button', { class: 'btn warn mc-pulse', onclick: () => done('crisis') }, '🚨 Decide today\'s problem'),
        taskTitle && h('button', { class: 'btn go', onclick: () => done('task') }, `▶ ${taskTitle}`),
        h('button', { class: 'btn', onclick: () => done('close') }, 'Close')));
    m.el.classList.add('mc');
  });
}
