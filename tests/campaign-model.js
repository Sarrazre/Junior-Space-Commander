// Economic/lifecycle diagnostic using real campaign data; no claims about player skill.
import assert from 'node:assert/strict';
import { S, resetGame, startSol, change, endOfSol, scienceCap, successPercent, visibleTasks, snapshot, restore } from '../src/state.js';
import { SOLS } from '../src/data/sols.js';
import { BAL } from '../src/data/balance.js';

export const paths = SOLS.reduce((paths, sol) => paths.flatMap(path => sol.crisis.options.map(option => [...path, option])), [[]]);
export const scenarios = [
  { name: 'All tasks, perfect puzzles', all: true, mistakes: 0, patient: null },
  { name: 'Essential tasks only', all: false, mistakes: 2, patient: 'lea' },
  { name: 'All tasks, learning through retries, scientist sick', all: true, mistakes: 4, patient: 'charles' },
];

export function simulate(choices, difficulty, scenario, verifyCheckpoints = false) {
  resetGame(difficulty);
  S.sick = scenario.patient ? { who: scenario.patient, name: scenario.patient, sol: 3, treated: false, applied: false } : null;
  const checkpoints = () => {
    if (!verifyCheckpoints) return;
    const saved = snapshot();
    assert.equal(restore(saved), true, `Valid ${difficulty} Sol ${S.sol} ${S.phase} checkpoint`);
    assert.deepEqual(snapshot(), saved, 'Resume preserves committed state exactly');
  };
  for (const [index, choice] of choices.entries()) {
    S.sol = index + 1; startSol(); checkpoints();
    change(choice.fx); Object.assign(S.solFlags, choice.flags || {}); S.crisisDone = true; checkpoints();
    const complete = id => {
      let task = S.tasks.find(t => t.id === id);
      if (task.done) return;
      for (const required of task.requires || []) complete(required);
      task = S.tasks.find(t => t.id === id);
      task.done = true;
      change(task.id === 'expedition' ? (S.solFlags.roverSites === 2 ? BAL.roverShortTrip : BAL.roverTrip) : task.fx);
      Object.assign(S.flags, task.flagsAfter || {});
      if (task.treat) { S.sick.treated = true; change(BAL.doctorVisit); change(BAL.doctorCost[S.sick.who]); }
      if (task.science) change({ science: Math.min(difficulty === 'explorer' ? 10 : BAL.scienceScore(scenario.mistakes), scienceCap()) });
      checkpoints();
    };
    for (const task of visibleTasks()) if (scenario.all || task.science) complete(task.id);
    assert(S.tasks.find(t => t.science).done, 'Every sol has a reachable science completion');
    endOfSol(); checkpoints();
    const once = snapshot(); endOfSol();
    assert.deepEqual(snapshot(), once, 'Summary cannot charge resources twice');
  }
  S.phase = 'final'; checkpoints();
  return { choices: choices.map(choice => choice.id), score: successPercent(), science: S.science, resources: { ...S.res } };
}
