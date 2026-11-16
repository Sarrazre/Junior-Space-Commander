import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLS } from '../src/data/sols.js';
import { S, resetGame, startSol, snapshot, restore, solDef, endOfSol, change } from '../src/state.js';

const fresh = () => { resetGame(); S.sick = null; startSol(); return snapshot(); };
const science = () => S.tasks.find(task => task.science);

function legacyFirstDay(done = false) {
  const saved = fresh();
  delete saved.scienceOrder;
  saved.tasks.find(task => task.id === 'rover').id = 'rocks';
  saved.tasks.find(task => task.id === 'rocks').done = done;
  saved.tasks.find(task => task.id === 'gen').done = true;
  if (done) {
    saved.science = 10; saved.crisisDone = true;
    saved.journal.push({ sol: 1, title: 'Rock scanner', text: 'A rock discovery.', science: true, mastery: 3 });
  }
  return saved;
}

test('new campaigns start Charles at the airlock rover and keep one science mission per sol', () => {
  fresh();
  assert.equal(S.scienceOrder, 'rover-first');
  assert.equal(science().id, 'rover');
  assert.equal(science().station, 'airlock');
  assert.equal(science().params.dust, false);
  assert.equal(science().params.sites, 3);
  S.sol = 2; startSol();
  assert.equal(science().id, 'rocks');
  assert.equal(science().station, 'lab');
  assert.ok(solDef().brief.some(line => line.includes('rock scanner')));
  for (const sol of SOLS) assert.equal(sol.tasks.filter(task => task.science).length, 1);
});

test('an unfinished older Sol 1 scanner becomes the rover without losing other completed jobs', () => {
  const saved = legacyFirstDay(false);
  assert.equal(restore(saved), true);
  assert.equal(S.scienceOrder, 'rover-first');
  assert.equal(science().id, 'rover');
  assert.equal(science().done, false);
  assert.equal(S.science, 0);
  assert.equal(S.tasks.find(task => task.id === 'gen').done, true);
});

test('earned older scanner science retains its mission identity and the original two-day plan', () => {
  assert.equal(restore(legacyFirstDay(true)), true);
  assert.equal(S.scienceOrder, 'scanner-first');
  assert.equal(science().id, 'rocks');
  assert.equal(science().done, true);
  assert.equal(S.science, 10);
  assert.equal(S.tasks.some(task => task.id === 'rover'), false);
  assert.equal(S.journal[0].title, 'Rock scanner');
  const saved = snapshot();
  assert.equal(restore(saved), true);
  assert.deepEqual(snapshot(), saved);
  endOfSol(); S.sol = 2; startSol();
  assert.equal(science().id, 'rover');
  assert.equal(science().done, false);
  assert.equal(science().params.dust, true);
});

test('a completed older Sol 2 rover remains complete without granting the replacement scanner credit', () => {
  assert.equal(restore(legacyFirstDay(true)), true);
  endOfSol(); S.sol = 2; startSol();
  science().done = true; change({ science: 10 });
  const saved = snapshot(); delete saved.scienceOrder;
  resetGame();
  assert.equal(restore(saved), true);
  assert.equal(science().id, 'rover');
  assert.equal(science().done, true);
  assert.equal(S.science, 20);
  assert.equal(S.tasks.some(task => task.id === 'rocks'), false);
  const migrated = snapshot();
  assert.equal(restore(migrated), true);
  assert.deepEqual(snapshot(), migrated);
});

test('new Sol 2 scanner saves retain the rover-first plan and reject corrupt plan values', () => {
  fresh(); science().done = true; S.crisisDone = true; change({ science: 10 });
  endOfSol(); S.sol = 2; startSol(); science().done = true;
  const saved = snapshot();
  assert.equal(restore(saved), true);
  assert.equal(science().id, 'rocks');
  assert.equal(science().done, true);
  const bad = { ...saved, scienceOrder: 'unknown' };
  assert.equal(restore(bad), false);
  assert.deepEqual(snapshot(), saved);
});
