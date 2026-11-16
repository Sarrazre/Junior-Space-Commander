import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirstFlight } from '../src/first-flight.js';
import { taskGuidance } from '../src/data/task-guidance.js';
import { EARTH_DAY_MS, MARS_SOL_MS, clockFraction, clockLabel, nightAmount, createTeachingClock } from '../src/data/planet-time.js';
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
test('homepage intro is offered on every visit while the guided tour stays a one-time preference', () => {
  const storage = memory(), flight = createFirstFlight(storage);
  assert.equal(flight.needsIntro(false), true); assert.equal(flight.needsIntro(true), true);
  flight.finishIntro(); assert.equal(createFirstFlight(storage).needsIntro(false), true);
  assert.equal(flight.needsTour(), true); flight.finishTour(); assert.equal(createFirstFlight(storage).needsTour(), false);
});
test('first-flight preferences survive malformed or unavailable storage without blocking launch', () => {
  const storage = { getItem: () => '{broken', setItem: () => { throw Error('blocked'); } };
  const flight = createFirstFlight(storage); flight.finishIntro(); flight.finishTour();
  assert.equal(flight.needsIntro(false), true); assert.equal(flight.needsTour(), false);
});
const initial = () => ({ crisisDone: false, res: { power: 70, health: 80, food: 65, shield: 70 }, tasks: [
  { id: 'repair', title: 'Repair water', who: 'max', station: 'air', fx: { power: 5 } },
  { id: 'plants', title: 'Rescue plants', who: 'lea', station: 'greenhouse', science: true, requires: ['repair'] },
  { id: 'scan', title: 'Crew checkup', who: 'elsa', station: 'medbay', fx: { health: 5 } },
] });
const guidance = state => taskGuidance(state, state.tasks, { title: 'Power overload!' });
test('priority follows the decision, science prerequisite, science, then crew tasks', () => {
  const state = initial(); assert.equal(guidance(state).id, 'crisis');
  state.crisisDone = true; assert.equal(guidance(state).id, 'repair'); assert.equal(guidance(state).label, 'DO FIRST');
  state.tasks[0].done = true; assert.equal(guidance(state).id, 'plants');
  state.tasks[1].done = true; assert.equal(guidance(state).id, 'scan');
  state.tasks[2].done = true; assert.equal(guidance(state), null);
});
test('low supplies recommend an available repair, never a finished or locked task', () => {
  const state = initial(); state.crisisDone = true; state.res.health = 30;
  assert.equal(guidance(state).id, 'scan'); assert.equal(guidance(state).label, 'URGENT');
  state.tasks[2].done = true; assert.equal(guidance(state).id, 'repair');
  state.res.power = 12; assert.equal(guidance(state).label, 'URGENT');
  state.tasks[0].done = true; assert.equal(guidance(state).id, 'plants');
});
test('Earth and Mars solar-day clocks drift correctly and wrap independently', () => {
  assert.equal(clockLabel(clockFraction(EARTH_DAY_MS, 0, EARTH_DAY_MS)), '00:00');
  assert.equal(clockLabel(clockFraction(EARTH_DAY_MS, 0, MARS_SOL_MS)), '23:21');
  assert.equal(clockLabel(clockFraction(MARS_SOL_MS, 0, MARS_SOL_MS)), '00:00');
  assert.equal(clockLabel(clockFraction(MARS_SOL_MS, 0, EARTH_DAY_MS), true), '00:39:35');
  assert.equal(clockLabel(-.25), '18:00');
  assert.equal(nightAmount(0), 1); assert.equal(nightAmount(.5), 0); assert.ok(Math.abs(nightAmount(19 / 24) - .5) < 1e-10);
});
test('the teaching clock keeps its epoch on reload and handles unavailable storage', () => {
  const storage = memory(), now = Date.UTC(2026, 10, 15, 12);
  const clock = createTeachingClock(storage, now), reload = createTeachingClock(storage, now + 100000);
  assert.equal(clock.epoch, reload.epoch);
  assert.equal(clock.fraction(now + MARS_SOL_MS), clock.fraction(now));
  const broken = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  assert.ok(Number.isFinite(createTeachingClock(broken, now).fraction(now)));
});
