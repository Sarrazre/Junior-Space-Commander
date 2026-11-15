// Two more Mission-Control-style screens that share the dashboard's gauges and bars:
// the Medical Bay crew health monitor, and the simpler end-of-sol / end-of-mission summary.
import { h, modal, sfx, onAbort } from './ui.js';
import { cv, loop, drawAstro, TAU } from './art.js';
import { gauge, bar, shown, WORD } from './dashboard.js';
import { readCrew } from './telemetry.js';
import { S, solDef, visibleTasks } from './state.js';
import { CREW } from './data/sols.js';

function portrait(c) {
  const { c: el } = cv(84, 96, 'art plain');
  loop(el, (g, t) => { g.clearRect(0, 0, 84, 96); g.beginPath(); g.ellipse(42, 90, 30, 6, 0, 0, TAU); g.fillStyle = '#5fd4ff44'; g.fill(); drawAstro(g, 42, 90, 0.82, c.css, { t, mood: c.sick ? 'sick' : c.status === 'ok' ? 'happy' : 'ok' }); });
  return el;
}

/** Medical Bay monitor. Resolves with the task the doctor chose to start, or null when closed. */
export function openCrewDashboard({ tasks = [], note = null } = {}) {
  return new Promise((resolve) => {
    const data = readCrew();
    sfx(data.overall === 'crit' ? 'alert' : 'ok');
    const unAbort = onAbort(() => window.removeEventListener('keydown', esc));
    const done = (what) => { unAbort(); window.removeEventListener('keydown', esc); m.close(); resolve(what); };
    const esc = (e) => { if (e.code === 'Escape') done(null); };
    window.addEventListener('keydown', esc);
    const m = modal(
      h('div', { class: 'mc-head ' + data.overall }, h('span', { class: 'mc-master' }), h('div', {}, h('b', {}, 'MEDICAL BAY · CREW HEALTH'), h('small', {}, `Sol ${S.sol} of 5 – Doctor Elsa's monitor`)), h('span', { class: 'mc-state' }, `CREW ${WORD[data.overall]}`)),
      h('div', { class: 'mc-key' }, h('span', { class: 'ok' }, '● Healthy'), h('span', { class: 'warn' }, '● Caution: keep an eye on it'), h('span', { class: 'crit' }, '● Critical: act now')),
      h('div', { class: 'mc-crew' }, data.crew.map((c) => h('section', { class: 'mc-card ' + c.status },
        h('div', { class: 'mc-who' }, portrait(c), h('div', {}, h('b', { style: `color:${c.css}` }, c.name), h('small', {}, c.role), h('span', { class: 'mc-chip ' + c.status }, c.sick ? 'SICK' : WORD[c.status]), h('span', { class: 'mc-temp ' + c.tempStatus }, `🌡️ ${c.temp.toFixed(1)} °C`)),
          c.gauges.map((g) => gauge(g, 112))),
        c.bars.map(bar)))),
      h('h4', {}, 'HEALTH RISKS TO WATCH'),
      h('div', { class: 'mc-alerts' }, data.alerts.map((a, i) => h('div', { class: 'mc-alert ' + a.level, style: `animation-delay:${i * 0.05}s` }, h('span', {}, a.icon), h('div', {}, h('b', {}, a.title), h('small', {}, a.text))))),
      note && h('p', { class: 'note', style: 'text-align:center' }, note),
      h('div', { class: 'actions' }, tasks.map((t) => h('button', { class: 'btn go', onclick: () => done(t) }, `▶ ${t.title}`)), h('button', { class: 'btn', onclick: () => done(null) }, 'Close')));
    m.el.classList.add('mc');
  });
}

const lvl = (v, crit, warn) => (v < crit ? 'crit' : v < warn ? 'warn' : 'ok');

/** The body of the end-of-sol report: two dials, four resource bars, tonight's events, the job list. */
export function solSummary(sum, tip) {
  const pct = sum.total ? Math.round(100 * sum.done / sum.total) : 100, sci = sum.scienceGain;
  const res = [['power', '⚡', 'Power'], ['shield', '🛡️', 'Shielding'], ['food', '🥬', 'Food'], ['health', '❤️', 'Crew health']].map(([k, icon, name]) => {
    const v = Math.round(S.res[k]), d = Math.round(S.res[k] - S.startRes[k]);
    shown['sum-' + k] = S.startRes[k];                               // the bar slides from this morning's value to tonight's
    return bar({ key: 'sum-' + k, icon, label: name, value: v, status: lvl(v, 21, 51), text: `${v} (${d >= 0 ? '+' : ''}${d})`, marks: [20, 50] });
  });
  delete shown['sum-tasks']; delete shown['sum-sci'];
  const jobs = visibleTasks().filter((t) => !t.optional || t.done);
  const overall = sum.missed.length || ['power', 'shield', 'food', 'health'].some((k) => S.res[k] <= 20) ? (['power', 'shield', 'food', 'health'].some((k) => S.res[k] <= 20) ? 'crit' : 'warn') : 'ok';
  return [
    h('div', { class: 'mc-head ' + overall }, h('span', { class: 'mc-master' }), h('div', {}, h('b', {}, `SOL ${S.sol} REPORT`), h('small', {}, solDef().title)), h('span', { class: 'mc-state' }, overall === 'ok' ? 'GREAT SOL!' : overall === 'warn' ? 'GOOD, WITH WARNINGS' : 'NEEDS ATTENTION')),
    h('div', { class: 'mc-sumgrid' },
      h('div', { class: 'mc-gauges two' },
        gauge({ key: 'sum-tasks', label: `Jobs done: ${sum.done} of ${sum.total}`, value: pct, min: 0, max: 100, unit: '%', status: lvl(pct, 50, 100), zones: [[0, 50, 'crit'], [50, 99, 'warn'], [99, 100, 'ok']] }),
        gauge({ key: 'sum-sci', label: `Science today (total ${S.science}/50)`, value: sci, min: 0, max: 10, unit: 'pts', status: lvl(sci, 5, 8), zones: [[0, 5, 'crit'], [5, 8, 'warn'], [8, 10, 'ok']] })),
      h('div', {}, h('h4', {}, 'RESOURCES: THIS MORNING ➜ TONIGHT'), res)),
    h('h4', {}, 'TONIGHT AT ASTRO BASE'),
    h('div', { class: 'mc-lamps' }, sum.lines.map((l) => h('div', { class: /[−-]\d/.test(l) ? (/Health/.test(l) ? 'crit' : 'warn') : 'ok' }, h('span', { class: 'lamp' }), l))),
    h('h4', {}, 'TODAY\'S JOBS'),
    h('div', { class: 'mc-jobs' }, jobs.map((t, i) => h('span', { class: 'mc-job ' + (t.done ? 'ok' : 'crit'), style: `animation-delay:${i * 0.06}s` }, `${t.done ? '✅' : '❌'} ${CREW[t.who].name}: ${t.title}`))),
    h('div', { class: 'mc-tip' }, h('span', {}, '🤖'), h('div', {}, h('b', {}, 'Rocky\'s tip'), tip)),
  ];
}

/** End of the mission: one big success dial and the three things that make up the score. */
export function finalGauges(pct) {
  const avg = Math.round((S.res.power + S.res.shield + S.res.food + S.res.health) / 4), jobs = S.totals.total ? Math.round(100 * S.totals.done / S.totals.total) : 100;
  ['fin-pct', 'fin-sci', 'fin-jobs', 'fin-res'].forEach((k) => delete shown[k]);
  return h('div', { class: 'mc-sumgrid' },
    h('div', { class: 'mc-gauges two' }, gauge({ key: 'fin-pct', label: 'Mission success', value: pct, min: 0, max: 100, unit: '%', status: lvl(pct, 40, 65), zones: [[0, 40, 'crit'], [40, 65, 'warn'], [65, 100, 'ok']] }, 190)),
    h('div', {}, h('h4', {}, 'HOW THE SCORE IS BUILT'),
      bar({ key: 'fin-sci', icon: '🔬', label: 'Science (half the score)', value: S.science * 2, status: lvl(S.science, 20, 40), text: `${S.science}/50`, marks: [] }),
      bar({ key: 'fin-jobs', icon: '📋', label: 'Jobs finished', value: jobs, status: lvl(jobs, 50, 90), text: `${S.totals.done}/${S.totals.total}`, marks: [] }),
      bar({ key: 'fin-res', icon: '🏠', label: 'Base resources', value: avg, status: lvl(avg, 40, 60), text: avg + '%', marks: [] })));
}
