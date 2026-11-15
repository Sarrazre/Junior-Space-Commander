import { BAL } from './data/balance.js';
import { SOLS, LEGACY_OPENING_SOLS } from './data/sols.js';

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
  phase: 'base',
  difficulty: 'explorer',
  scienceOrder: 'rover-first',
  journal: [],
};

const clamp = (v) => Math.max(0, Math.min(100, v));

/** Apply resource changes, e.g. change({ power: -10, food: 5 }). */
export function change(fx = {}) {
  for (const [k, v] of Object.entries(fx)) {
    if (!v) continue;
    const before = k === 'science' ? S.science : S.res[k];
    if (k === 'science') S.science = Math.max(0, Math.min(50, S.science + v));
    else if (k in S.res) S.res[k] = clamp(S.res[k] + v);
    else continue;
    const delta = (k === 'science' ? S.science : S.res[k]) - before;
    if (delta) emit('res', { key: k, delta });
  }
}

export const solDef = () => S.scienceOrder === 'scanner-first' && S.sol <= 2 ? LEGACY_OPENING_SOLS[S.sol - 1] : SOLS[S.sol - 1];

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
  S.tasks = tasksForSol();
  S.phase = 'base';
  if (S.sick && S.sick.sol === S.sol && !S.sick.applied) {
    S.sick.applied = true;
    change(BAL.sickness);
  }
  emit('all');
}

function tasksForSol() {
  const tasks = solDef().tasks.map((t) => ({ ...t, done: false }));
  // Panels still dusty from an earlier sol: Max can clean them today.
  if (S.flags.panelsDirty && S.sol > 2) {
    tasks.push({ id: 'panels-late', who: 'max', station: 'airlock', title: 'Clean the dusty solar panels', game: 'panels', fx: BAL.cleanPanels, flagsAfter: { panelsDirty: false }, done: false });
  }
  // One random astronaut (never the doctor) gets sick once per game.
  if (S.sick && S.sick.sol === S.sol) {
    tasks.push({ id: 'treat', who: 'elsa', station: 'medbay', title: `Treat ${S.sick.name} (feeling sick)`, game: 'medical', params: { kase: 'sick', patient: S.sick.name }, optional: true, treat: true, done: false });
  }
  return tasks;
}

export function scienceCap() {
  let cap = 10;
  if (S.solFlags.scienceCap) cap = Math.min(cap, S.solFlags.scienceCap);
  if (S.res.power <= BAL.lowPower) cap = Math.min(cap, BAL.lowPowerScienceCap);
  return cap;
}

/** End-of-sol automatic changes. Returns a list of lines for Rocky's report. */
export function endOfSol() {
  const existing = S.log.find(entry => entry.sol === S.sol);
  if (existing) return existing;
  const d = BAL.daily, lines = [];
  const names = { power: 'Power', food: 'Food', health: 'Crew Health' };
  const add = (fx, text) => {
    const before = { ...S.res }; change(fx);
    const deltas = Object.entries(fx).map(([key, requested]) => {
      const actual = S.res[key] - before[key];
      return `${actual >= 0 ? '+' : '−'}${Math.abs(actual)} ${names[key]}${actual !== requested ? ' (limit reached)' : ''}`;
    });
    lines.push(`${text}: ${deltas.join(', ')}`);
  };
  const solar = S.flags.panelsDirty ? d.solarDusty : d.solar;
  add({ power: solar }, `☀️ Solar panels${S.flags.panelsDirty ? ' (dusty panels!)' : ''}`);
  add({ power: d.baseSystems }, '🏠 Base systems');
  add({ food: d.crewEats }, '🍽️ Crew meals');
  const tended = S.tasks.some((t) => t.tend && t.done);
  const grow = tended ? d.harvestTended : d.harvest;
  add({ food: grow }, `🥬 Greenhouse harvest${tended ? ' (well tended by Lea)' : ''}`);
  if (S.res.shield < d.lowShieldBelow) add({ health: d.lowShieldHealth }, '☢️ Shielding was low');
  if (S.res.food < d.lowFoodBelow) add({ health: d.lowFoodHealth }, '😟 Food was low');
  const vis = visibleTasks().filter((t) => !t.optional);
  const done = vis.filter((t) => t.done).length;
  S.totals.done += done; S.totals.total += vis.length;
  const summary = { sol: S.sol, lines, done, total: vis.length, missed: vis.filter((t) => !t.done).map((t) => t.title), scienceGain: S.science - S.startRes.science, res: { ...S.res } };
  S.log.push(summary);
  S.phase = 'summary';
  return summary;
}

export function successPercent() {
  return BAL.success({ science: S.science, tasksDone: S.totals.done, tasksTotal: S.totals.total, res: S.res });
}

export function resetGame(difficulty = 'explorer') {
  Object.assign(S, { sol: 1, res: { ...(difficulty === 'commander' ? BAL.commanderStart : BAL.start) }, science: 0, current: 'max', flags: {}, solFlags: {}, crisisDone: false, tasks: [], log: [], totals: { done: 0, total: 0 }, startRes: null, phase: 'base', difficulty, scienceOrder: 'rover-first', journal: [] });
  const who = ['max', 'charles', 'lea'][Math.floor(Math.random() * 3)];
  S.sick = { who, name: who[0].toUpperCase() + who.slice(1), sol: 2 + Math.floor(Math.random() * 3), treated: false, applied: false };
}

export function snapshot() {
  return JSON.parse(JSON.stringify({ ...S, tasks: S.tasks.map(({ id, done }) => ({ id, done })) }));
}

export function restore(data) {
  const bounded = (n, max = 100) => Number.isFinite(n) && n >= 0 && n <= max;
  const resources = r => r && ['power', 'shield', 'food', 'health'].every(k => bounded(r[k]));
  const record = r => r && typeof r === 'object' && !Array.isArray(r);
  if (!data || !Number.isInteger(data.sol) || data.sol < 1 || data.sol > 5 || !resources(data.res) || !resources(data.startRes) || !bounded(data.startRes.science, 50) || !bounded(data.science, 50)) return false;
  if (!['max','elsa','charles','lea'].includes(data.current) || !['base','summary','final'].includes(data.phase) || !['explorer','commander'].includes(data.difficulty)) return false;
  if (data.scienceOrder !== undefined && !['rover-first', 'scanner-first'].includes(data.scienceOrder)) return false;
  if (!record(data.flags) || !record(data.solFlags) || typeof data.crisisDone !== 'boolean') return false;
  if (!Object.values(data.flags).every(v => v === undefined || typeof v === 'boolean')) return false;
  for (const [key, value] of Object.entries(data.solFlags)) {
    if (key === 'scienceCap' && !bounded(value, 10)) return false;
    if (key === 'roverSites' && ![2,3].includes(value)) return false;
    if (['crisisChoice','crisisId'].includes(key) && typeof value !== 'string') return false;
    if (!['scienceCap','roverSites','crisisChoice','crisisId'].includes(key) && typeof value !== 'boolean') return false;
  }
  if (!Array.isArray(data.tasks) || !data.tasks.every(t => record(t) && typeof t.id === 'string' && typeof t.done === 'boolean') || new Set(data.tasks.map(t => t.id)).size !== data.tasks.length) return false;
  if (!Array.isArray(data.journal) || !data.journal.every(j => record(j) && typeof j.title === 'string' && Number.isInteger(j.sol) && j.sol >= 1 && j.sol <= data.sol && typeof j.text === 'string' && typeof j.science === 'boolean' && Number.isInteger(j.mastery) && j.mastery >= 1 && j.mastery <= 3)) return false;
  if (!Array.isArray(data.log) || !data.log.every((l,i) => record(l) && l.sol === i + 1 && l.sol <= data.sol && Array.isArray(l.lines) && l.lines.every(x => typeof x === 'string') && Array.isArray(l.missed) && l.missed.every(x => typeof x === 'string') && bounded(l.done, 20) && bounded(l.total, 20) && bounded(l.scienceGain, 50) && resources(l.res))) return false;
  if (data.log.length !== data.sol - (data.phase === 'base' ? 1 : 0)) return false;
  if (data.phase === 'final' && data.sol !== 5) return false;
  if (!data.totals || !bounded(data.totals.done, 100) || !bounded(data.totals.total, 100) || data.totals.done > data.totals.total) return false;
  if (data.sick && (!['max','charles','lea'].includes(data.sick.who) || !Number.isInteger(data.sick.sol) || data.sick.sol < 2 || data.sick.sol > 4 || typeof data.sick.name !== 'string' || typeof data.sick.treated !== 'boolean' || typeof data.sick.applied !== 'boolean')) return false;
  if (data.phase !== 'base' && !data.log.some(l => l.sol === data.sol)) return false;
  const clean = JSON.parse(JSON.stringify(data));
  // An unfinished first-day scanner can become the new rover mission. Once a
  // previous-edition campaign earned science, retain its plan and earned credit.
  const scienceOrder = clean.scienceOrder || (clean.sol === 1 && !clean.tasks.some(task => task.id === 'rocks' && task.done) ? 'rover-first' : 'scanner-first');
  Object.assign(S, { sol: clean.sol, res: clean.res, startRes: clean.startRes, science: clean.science, current: clean.current, phase: clean.phase, difficulty: clean.difficulty, scienceOrder, journal: clean.journal, flags: clean.flags, solFlags: clean.solFlags, crisisDone: clean.crisisDone, log: clean.log, totals: clean.totals, sick: clean.sick });
  const done = new Map(clean.tasks.map(t => [t.id, t.done]));
  // A cleaned late panel task must still exist on resume even though the flag cleared.
  const dirty = S.flags.panelsDirty;
  if (done.has('panels-late')) S.flags.panelsDirty = true;
  S.tasks = tasksForSol().map(t => ({ ...t, done: done.get(t.id) === true }));
  S.flags.panelsDirty = dirty;
  return true;
}
