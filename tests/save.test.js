import test from 'node:test';
import assert from 'node:assert/strict';
import { S, resetGame, startSol, snapshot, restore, endOfSol, change } from '../src/state.js';
import { createSaveStore, SAVE_KEY } from '../src/save.js';

const fresh = () => { resetGame(); startSol(); return snapshot(); };
const advanceTo = sol => { while (S.sol < sol) { S.crisisDone = true; S.tasks.find(task => task.science).done = true; change({ science: 10 }); endOfSol(); S.sol++; startSol(); } };
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('checkpoint restores progress without replaying start-of-sol penalties', () => {
  fresh(); S.sick = { who: 'max', name: 'Max', sol: 4, treated: false, applied: false }; advanceTo(4);
  S.crisisDone = true; S.tasks[0].done = true;
  const saved = snapshot(); resetGame();
  assert.equal(restore(saved), true);
  assert.deepEqual(snapshot(), saved);
  assert.equal(typeof S.tasks[0].game, 'string');
  assert.equal(S.sick.applied, true);
});

test('late panel cleaning remains completed after its persistent dirty flag clears', () => {
  fresh(); advanceTo(3);
  S.tasks.find(task => task.id === 'panels-late').done = true;
  S.flags.panelsDirty = false;
  const saved = snapshot(); resetGame();
  assert.equal(restore(saved), true);
  assert.equal(S.tasks.find(task => task.id === 'panels-late').done, true);
  assert.equal(S.flags.panelsDirty, false);
});

test('end-of-sol processing is idempotent before and after restoring its summary', () => {
  fresh(); S.tasks[0].done = true; change({ science: 10 });
  const first = endOfSol(), saved = snapshot();
  assert.deepEqual(endOfSol(), first);
  assert.deepEqual(snapshot(), saved);
  resetGame(); assert.equal(restore(saved), true);
  assert.deepEqual(endOfSol(), first);
  assert.deepEqual(snapshot(), saved);
});

test('save store reports unavailable storage and ignores malformed envelopes', () => {
  const memory = storage(), store = createSaveStore(memory, 'test');
  for (const raw of ['{', 'null', '[]', '{"version":2,"revision":"x","data":{}}']) {
    memory.setItem(SAVE_KEY, raw); assert.equal(store.read(), null);
  }
  const blocked = createSaveStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }, 'test');
  assert.equal(blocked.read(), null);
  assert.deepEqual(blocked.write(fresh()), { ok: false, reason: 'unavailable' });
});

test('a stale tab cannot overwrite a newer checkpoint until it claims that revision', () => {
  const memory = storage(), a = createSaveStore(memory, 'a'), b = createSaveStore(memory, 'b');
  a.claim(); b.claim();
  assert.deepEqual(a.write({ step: 1 }), { ok: true });
  assert.deepEqual(b.write({ step: 2 }), { ok: false, reason: 'conflict' });
  assert.deepEqual(a.read().data, { step: 1 });
  b.claim(b.read().revision); assert.deepEqual(b.write({ step: 3 }), { ok: true });
  assert.deepEqual(a.write({ step: 4 }), { ok: false, reason: 'conflict' });
});

test('resuming an older read cannot claim a checkpoint written by another tab meanwhile', () => {
  const memory = storage(), a = createSaveStore(memory, 'a'), b = createSaveStore(memory, 'b');
  a.write({ step: 1 });
  const loaded = b.read();
  a.write({ step: 2 });
  b.claim(loaded.revision);
  assert.deepEqual(b.write(loaded.data), { ok: false, reason: 'conflict' });
  assert.deepEqual(a.read().data, { step: 2 });
});

test('invalid discovery medals and sol numbers cannot crash the cabinet on resume', () => {
  const saved = fresh();
  const valid = { sol: 1, title: 'Experiment', text: 'A finding', mastery: 3, science: true };
  for (const change of [{ mastery: -1 }, { mastery: 1.5 }, { mastery: 1e9 }, { sol: 0 }, { sol: 6 }, { science: 'yes' }]) {
    const bad = structuredClone(saved); bad.journal = [{ ...valid, ...change }];
    assert.equal(restore(bad), false);
    assert.deepEqual(snapshot(), saved);
  }
});

test('corrupt checkpoint arrays are rejected without throwing or changing current state', () => {
  const saved = fresh();
  for (const field of ['tasks', 'journal', 'log']) {
    const bad = structuredClone(saved); bad[field] = [null];
    assert.equal(restore(bad), false, field);
    assert.deepEqual(snapshot(), saved);
  }
});

test('inconsistent summary phases and invalid science caps cannot be resumed', () => {
  const saved = fresh();
  const badCap = structuredClone(saved); badCap.solFlags.scienceCap = 'not a number';
  assert.equal(restore(badCap), false);
  endOfSol(); const summary = snapshot();
  const falseBase = structuredClone(summary); falseBase.phase = 'base';
  assert.equal(restore(falseBase), false);
  const duplicate = structuredClone(summary); duplicate.log.push(structuredClone(duplicate.log[0]));
  assert.equal(restore(duplicate), false);
  const earlyFinal = structuredClone(summary); earlyFinal.phase = 'final';
  assert.equal(restore(earlyFinal), false);
});
