import { paths, scenarios, simulate } from './campaign-model.js';
const reports = [];
for (const difficulty of ['explorer','commander']) for (const scenario of scenarios) {
  const results = paths.map(choices => simulate(choices, difficulty, scenario)).sort((a,b) => b.score - a.score);
  reports.push({ difficulty, scenario: scenario.name, paths: results.length, min: results.at(-1).score, max: results[0].score, best: results[0], worst: results.at(-1) });
}
console.log(JSON.stringify({ assumptions: 'Crisis before tasks; task definitions in listed order, dependencies first; sickness fixed to Sol 3 when included. Does not model traversal, timing, or player comprehension. Numeric playtest targets are not yet established.', reports }, null, 2));
