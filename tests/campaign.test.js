import test from 'node:test';
import assert from 'node:assert/strict';
import { paths, scenarios, simulate } from './campaign-model.js';

for (const difficulty of ['explorer','commander']) for (const scenario of scenarios) {
  test(`${difficulty}: all 96 decision paths finish and survive every checkpoint — ${scenario.name}`, () => {
    assert.equal(paths.length, 96);
    for (const choices of paths) {
      const result = simulate(choices, difficulty, scenario, true);
      assert(result.score >= 0 && result.score <= 100);
      assert(result.science >= 0 && result.science <= 50);
      for (const resource of Object.values(result.resources)) assert(resource >= 0 && resource <= 100);
    }
  });
}
