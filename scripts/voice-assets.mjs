// Export the finite authored narration script. No inference models or browser runtimes are downloaded.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SOLS, STATION_FACTS, CREW } from '../src/data/sols.js';
import { STATIONS } from '../src/data/map.js';
import { GREETINGS } from '../src/data/greetings.js';
import { COACHING, INTRO_LINES, CELEBRATION, GENERIC_HINT } from '../src/data/coaching.js';
import { FIRST_FLIGHT_LINES } from '../src/data/first-flight-lines.js';
import { clipKey, normalizeSpeech, sentences } from '../src/voice-core.js';
const root = new URL('../public/assets/voice/', import.meta.url).pathname;
const records = new Map();
function add(text, speaker = 'rocky') { if (!text) return; const key = clipKey(text, speaker); records.set(key, { key, text, normalized: normalizeSpeech(text), sentences: sentences(text), speaker, voice: speaker === 'control' ? 'F2' : 'M2', file: 'clips/' + createHash('sha256').update(key).digest('hex').slice(0, 20) + '.mp3' }); }
INTRO_LINES.forEach(t => add(t)); add(CELEBRATION); add(GENERIC_HINT);
FIRST_FLIGHT_LINES.forEach(t => add(t));
Object.values(GREETINGS).forEach(g => add(g.text, g.speaker));
// Every finite campaign direction is prepared as a whole recording, so new
// players can hear contextual guidance using the prepared recordings.
for (const sol of SOLS) {
  for (const current of Object.keys(CREW)) {
    const me = CREW[current];
    add(`First things first: ${current === 'max' ? 'walk Max' : 'switch to Max and walk him'} to the Command Center 🖥️ to decide about today's problem: "${sol.crisis.title}"`);
    for (const task of sol.tasks) {
      add(`${me.name} is all done! Switch to ${CREW[task.who].name} for: "${task.title}".`);
      for (const required of task.requires || []) {
        const prior = sol.tasks.find(t => t.id === required);
        if (prior) add(`First, ${CREW[prior.who].name} needs to finish "${prior.title}" at the ${STATIONS[prior.station].label}. Then ${me.name} can continue.`);
      }
    }
  }
  for (const task of sol.tasks) {
    add(`${CREW[task.who].name}'s next job: "${task.title}". Walk to the ${STATIONS[task.station].label} ${STATIONS[task.station].icon} and press Interact!`);
    add(`That is ${CREW[task.who].name}'s job: "${task.title}". Switch to ${CREW[task.who].name}!`);
    add(`${CREW[task.who].name} needs to finish “${task.title}” first. Tap that task in the mission list to go there.`);
    add(`We skipped "${task.title}". Every astronaut's job helps the base, so try to finish them all next sol!`);
  }
}
for (const { name } of Object.values(CREW)) add(`Oh no, ${name} woke up feeling sick (−10 Crew Health). Doctor Elsa can help in the Medical Bay, but ${name} will need to rest.`);
add('The solar panels are still dusty, so we make less power. Max can clean them through the Airlock.');
add('Nothing to do here right now. Press "Ask Rocky" if you are lost. I love being asked!');
add('First, send Max to the Command Center to decide today’s problem. Then your science plan is ready!');
[
  'Everything is done for today! Press "End the sol" so the crew can sleep. Even robots need a recharge. Zzzt.',
  'Power is getting low. Watch out for choices that cost power, and keep those solar panels clean!',
  'Shielding is low, so the crew loses health at night. Extra shielding costs power, but it keeps everyone safe.',
  "Food is running low. Lea's greenhouse tasks grow more food every sol.",
  "The crew is tired. Elsa's checkups bring Crew Health back up.",
  'Great balance, Commander! You are thinking like a real mission planner. Beep boop!',
].forEach(t => add(t));
for (const sol of SOLS) { add(`☀️ Good morning! It is Sol ${sol.n}: ${sol.title}.`); sol.brief.forEach(t => add(t)); add(sol.fact.text, 'control'); }
Object.values(STATION_FACTS).forEach(t => add(t, 'control'));
for (const c of Object.values(COACHING)) { add(c.goal); add(c.explain, 'control'); Object.values(c.stages).flat().forEach(t => add(t)); }
await mkdir(root, { recursive: true });
await writeFile(root + 'script.json', JSON.stringify([...records.values()], null, 2));
console.log('Authored narration script exported. The game uses prepared MP3 recordings only.');
