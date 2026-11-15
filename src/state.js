import { BAL } from './data/balance.js';
import { SOLS } from './data/sols.js';

const listeners = new Set();
export const on = (fn) => listeners.add(fn);
export const emit = (what = 'all', detail) => listeners.forEach((fn) => fn(what, detail));

export const S = {
  sol: 1,
  res: { ...BAL.start },
  science: 0,
  current: 'max',
  flags: {},          // long-lived flags (panelsDirty, ...)
  solFlags: {},       // reset every sol (scienceCap, cleanPanels, roverSites, ...)
  crisisDone: false,
  tasks: [],          // today's tasks: { ...def, done }
  sick: null,         // { who, sol, treated }
  log: [],            // per-sol summaries
  totals: { done: 0, total: 0 },
  startRes: null,
};

const clamp = (v) => Math.max(0, Math.min(100, v));

/** Apply resource changes, e.g. change({ power: -10, food: 5 }). */
export function change(fx = {}) {
  for (const [k, v] of Object.entries(fx)) {
    if (!v) continue;
    if (k === 'science') S.science = Math.max(0, Math.min(50, S.science + v));
    else if (k in S.res) S.res[k] = clamp(S.res[k] + v);
    emit('res', { key: k, delta: v });
  }
}

export const solDef = () => SOLS[S.sol - 1];

export function visibleTasks() {
  return S.tasks.filter((t) => !t.when || t.when({ ...S.flags, ...S.solFlags }));
}

export function startSol() {
  const def = solDef();
  S.solFlags = {};
  S.crisisDone = false;
  S.startRes = { ...S.res, science: S.science };
  if (def.onStart?.flags) Object.assign(S.flags, def.onStart.flags);
  if (def.onStart?.fx) change(def.onStart.fx);
  S.tasks = def.tasks.map((t) => ({ ...t, done: false }));
  // Panels still dusty from an earlier sol: Max can clean them today.
  if (S.flags.panelsDirty && S.sol > 2) {
    S.tasks.push({ id: 'panels-late', who: 'max', station: 'airlock', title: 'Clean the dusty solar panels', game: 'panels', fx: BAL.cleanPanels, flagsAfter: { panelsDirty: false }, done: false });
  }
  // One random astronaut (never the doctor) gets sick once per game.
  if (S.sick && S.sick.sol === S.sol) {
    change(BAL.sickness);
    S.tasks.push({ id: 'treat', who: 'elsa', station: 'medbay', title: `Treat ${S.sick.name} (feeling sick)`, game: 'medical', params: { kase: 'sick', patient: S.sick.name }, optional: true, treat: true, done: false });
  }
  emit('all');
}

export function scienceCap() {
  let cap = 10;
  if (S.solFlags.scienceCap) cap = Math.min(cap, S.solFlags.scienceCap);
  if (S.res.power <= BAL.lowPower) cap = Math.min(cap, BAL.lowPowerScienceCap);
  return cap;
}

/** End-of-sol automatic changes. Returns a list of lines for Rocky's report. */
export function endOfSol() {
  const d = BAL.daily, lines = [];
  const add = (fx, text) => { change(fx); lines.push(text); };
  const solar = S.flags.panelsDirty ? d.solarDusty : d.solar;
  add({ power: solar }, `☀️ Solar panels made +${solar} Power${S.flags.panelsDirty ? ' (dusty panels!)' : ''}`);
  add({ power: d.baseSystems }, `🏠 Base systems used ${d.baseSystems} Power`);
  add({ food: d.crewEats }, `🍽️ The crew ate: ${d.crewEats} Food`);
  const tended = S.tasks.some((t) => t.tend && t.done);
  const grow = tended ? d.harvestTended : d.harvest;
  add({ food: grow }, `🥬 Greenhouse harvest: +${grow} Food${tended ? ' (well tended by Lea)' : ''}`);
  if (S.res.shield < d.lowShieldBelow) add({ health: d.lowShieldHealth }, `☢️ Shielding was low: ${d.lowShieldHealth} Crew Health`);
  if (S.res.food < d.lowFoodBelow) add({ health: d.lowFoodHealth }, `😟 Food was low: ${d.lowFoodHealth} Crew Health`);
  const vis = visibleTasks().filter((t) => !t.optional);
  const done = vis.filter((t) => t.done).length;
  S.totals.done += done; S.totals.total += vis.length;
  const summary = { sol: S.sol, lines, done, total: vis.length, missed: vis.filter((t) => !t.done).map((t) => t.title), scienceGain: S.science - S.startRes.science, res: { ...S.res } };
  S.log.push(summary);
  return summary;
}

export function successPercent() {
  return BAL.success({ science: S.science, tasksDone: S.totals.done, tasksTotal: S.totals.total, res: S.res });
}

export function resetGame() {
  Object.assign(S, { sol: 1, res: { ...BAL.start }, science: 0, current: 'max', flags: {}, solFlags: {}, crisisDone: false, tasks: [], log: [], totals: { done: 0, total: 0 } });
  const who = ['max', 'charles', 'lea'][Math.floor(Math.random() * 3)];
  S.sick = { who, name: who[0].toUpperCase() + who.slice(1), sol: 2 + Math.floor(Math.random() * 4), treated: false };
}
