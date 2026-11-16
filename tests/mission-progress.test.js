import test from 'node:test';
import assert from 'node:assert/strict';
import { dayComplete, completedMission } from '../src/data/mission-progress.js';

test('a completed day waits for the decision and every visible task, including a sick crewmate', () => {
  const state = { phase: 'base', crisisDone: false };
  const tasks = [{ done: true, science: true }, { done: false, optional: true }];
  assert.equal(dayComplete(state, tasks), false);
  state.crisisDone = true;
  assert.equal(dayComplete(state, tasks), false);
  tasks[1].done = true;
  assert.equal(dayComplete(state, tasks), true);
  assert.equal(dayComplete(state, []), false);
});
test('saved summaries and final results cannot trigger another end-of-day calculation', () => {
  for (const phase of ['summary', 'final']) assert.equal(dayComplete({ phase, crisisDone: true }, [{ done: true }]), false);
});
test('completed save detection distinguishes a finished campaign from a playable fifth sol', () => {
  assert.equal(completedMission(null), false);
  assert.equal(completedMission({ phase: 'base', sol: 5 }), false);
  assert.equal(completedMission({ phase: 'summary', sol: 4 }), false);
  assert.equal(completedMission({ phase: 'summary', sol: 5 }), false);
  assert.equal(completedMission({ phase: 'final', sol: 5 }), true);
});
