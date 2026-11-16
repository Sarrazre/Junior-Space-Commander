import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameClock } from '../src/game-clock.js';
import { S, resetGame, change, on } from '../src/state.js';

test('pause preserves the remaining time of a puzzle cue', () => {
  const clock = createGameClock(); let calls = 0;
  clock.schedule(() => calls++, 700);
  clock.tick(300); clock.tick(5000, true);
  assert.equal(calls, 0);
  clock.tick(399); assert.equal(calls, 0);
  clock.tick(1); assert.equal(calls, 1);
  clock.tick(1000); assert.equal(calls, 1);
});

test('leaving a game cancels delayed completion and repeating work', () => {
  const clock = createGameClock(); let calls = 0;
  clock.schedule(() => calls++, 100);
  clock.schedule(() => calls++, 60, true);
  clock.clear(); clock.tick(5000);
  assert.equal(calls, 0);
});

test('callbacks can cancel another due callback or their own repeating job', () => {
  const clock = createGameClock(); let calls = 0;
  clock.schedule(() => clock.cancel(second), 10);
  const second = clock.schedule(() => calls++, 10);
  const repeating = clock.schedule(() => { calls++; clock.cancel(repeating); }, 10, true);
  clock.tick(10); clock.tick(100);
  assert.equal(calls, 1);
});

test('resource feedback reports actual capped gains and ignores unknown keys', () => {
  resetGame(); const events = [];
  S.res.power = 100;
  on((type, detail) => { if (type === 'res') events.push(detail); });
  change({ power: 15, unknown: 9 });
  assert.deepEqual(events, []);
  S.res.power = 98; change({ power: 15 });
  assert.equal(S.res.power, 100);
  assert.deepEqual(events, [{ key: 'power', delta: 2 }]);
});
