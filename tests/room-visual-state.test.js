import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRoomVisualState, describeRoomVisuals } from '../src/data/room-visual-state.js';
const state = (overrides = {}) => ({ sol: 1, phase: 'base', res: { power: 78, health: 85, food: 72, shield: 70 }, flags: {}, tasks: [], journal: [], log: [], crisisDone: false, ...overrides });

test('Sol 3 crop and water faults persist until their own repair is committed', () => {
  const initial = state({ sol: 3 });
  assert.equal(deriveRoomVisualState(initial).greenhouse, 'wilting');
  assert.equal(deriveRoomVisualState(initial).water, 'frozen');
  initial.flags.pipesRepaired = true;
  assert.equal(deriveRoomVisualState(initial).water, 'restored');
  assert.equal(deriveRoomVisualState(initial).greenhouse, 'wilting');
  initial.flags.greenhouseRestored = true;
  assert.equal(deriveRoomVisualState(initial).greenhouse, 'recovered');
  initial.sol = 4;
  assert.equal(deriveRoomVisualState(initial).greenhouse, 'recovered');
  assert.equal(deriveRoomVisualState(state({ sol: 4 })).greenhouse, 'wilting');
});

test('reconstructed journal and log preserve visual discoveries and returned cargo', () => {
  const restored = state({ sol: 5, journal: [{ science: true, sol: 1 }, { science: true, sol: 2 }], log: [{ sol: 1 }, { sol: 2 }], flags: { panelsDirty: true } });
  const visual = deriveRoomVisualState(restored);
  assert.equal(visual.lab, 2); assert.equal(visual.cargo, 2); assert.equal(visual.milestones, 2); assert.equal(visual.solar, 'dusty');
  assert.deepEqual(deriveRoomVisualState(JSON.parse(JSON.stringify(restored))), visual);
});

test('visual supply and equipment states follow resources without pretending completed repairs', () => {
  const initial = state();
  assert.equal(deriveRoomVisualState(initial).engineering, 'running');
  initial.tasks.push({ id: 'gen', station: 'generator', done: true });
  assert.equal(deriveRoomVisualState(initial).engineering, 'serviced');
  initial.res.power = 12; initial.res.health = 35; initial.res.food = 20;
  const visual = deriveRoomVisualState(initial);
  assert.equal(visual.engineering, 'low-power'); assert.equal(visual.medical, 'attention'); assert.equal(visual.kitchen, 'low');
  assert.match(describeRoomVisuals(visual).map(room=>room.text).join(' '), /low power/);
  initial.phase = 'summary'; assert.equal(deriveRoomVisualState(initial).crew, 'resting');
});
