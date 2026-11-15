import { S, on, emit, change, startSol, solDef, visibleTasks, scienceCap, endOfSol, successPercent, resetGame } from './state.js';
import { BAL } from './data/balance.js';
import { CREW, CREW_IDS, SOLS, STATION_FACTS, DATA_SOURCES } from './data/sols.js';
import { STATIONS } from './data/map.js';
import { $, h, toast, modal, modalOpen, sfx, G, abortAll, audioControls } from './ui.js';
import { music, rockyTalk, settings, setMuted } from './audio.js';
import { createBase } from './base.js';
import { runGame } from './minigames/index.js';
import { getFlare } from './nasa.js';
import { scene } from './art.js';
import { openDashboard } from './dashboard.js';
import { openCrewDashboard, solSummary, finalGauges } from './panels.js';
import { createLanding } from './landing.js';

let nearStation = null, busy = false, started = false;
const overlayOpen = () => !$('#overlay').classList.contains('hidden') || !$('#rover').classList.contains('hidden');
const rockyOpen = () => !$('#rocky').classList.contains('hidden');

// ---------- Rocky, the guide ----------
function say(lines) {
  lines = [].concat(lines);
  return new Promise((resolve) => {
    let i = 0;
    const many = lines.length > 1;
    // ◀ / ▶ (or the arrow keys) step through the lines, ✕ (or Esc) closes Rocky.
    const show = () => {
      $('#rocky-text').textContent = lines[i];
      $('#rocky-dots').replaceChildren(...(many ? lines.map((_, k) => h('i', { class: k === i ? 'on' : '' })) : []));
      $('#rocky-prev').classList.toggle('hidden', !many);
      $('#rocky-prev').disabled = i === 0;
      $('#rocky-next').textContent = i < lines.length - 1 ? '▶' : 'OK ✓';
      rockyTalk(lines[i]);
    };
    $('#rocky').classList.remove('hidden');
    const end = () => { $('#rocky').classList.add('hidden'); resolve(); };
    $('#rocky-next').onclick = () => { if (++i < lines.length) show(); else end(); };
    $('#rocky-prev').onclick = () => { if (i > 0) { i--; show(); } };
    $('#rocky-close').onclick = end;
    show();
  });
}

/** Sols 2 (dust storm) and 4 (solar storm) get the more urgent theme. */
const baseTrack = () => (S.sol === 2 || S.sol === 4 ? 'storm' : 'base');

const pending = (who) => visibleTasks().filter((t) => !t.done && (!who || t.who === who));
const scienceTask = () => S.tasks.find((t) => t.science);

function hint() {
  const me = CREW[S.current];
  if (!S.crisisDone) return say(`First things first: ${S.current === 'max' ? 'walk Max' : 'switch to Max and walk him'} to the Command Center 🖥️ to decide about today's problem: "${solDef().crisis.title}"`);
  const mine = pending(S.current);
  if (mine.length) return say(`${me.name}'s next job: "${mine[0].title}". Walk to the ${STATIONS[mine[0].station].label} ${STATIONS[mine[0].station].icon} and press Interact!`);
  const others = pending();
  if (others.length) return say(`${me.name} is all done! Switch to ${CREW[others[0].who].name} for: "${others[0].title}".`);
  return say('Everything is done for today! Press "End the sol" so the crew can sleep. Even robots need a recharge. Zzzt.');
}

// ---------- HUD ----------
function renderHud(what, detail) {
  $('#sol-label').textContent = `Sol ${S.sol} of 5 – ${solDef().title}`;
  for (const el of document.querySelectorAll('.res[data-res]')) {
    const k = el.dataset.res, v = Math.round(S.res[k]);
    $('b', el).textContent = v;
    const bar = $('.bar i', el);
    bar.style.width = v + '%';
    bar.style.background = v <= 20 ? 'var(--red)' : v <= 50 ? 'var(--yellow)' : 'var(--green)';
    el.classList.toggle('low', v <= 20);
  }
  $('#sci').textContent = `${S.science} / 50`;
  if (what === 'res' && detail) {
    const el = detail.key === 'science' ? $('.res.sci') : $(`.res[data-res="${detail.key}"]`);
    if (el) { const c = detail.delta > 0 ? 'flash-up' : 'flash-down'; el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add(c); }
    if (detail.key === 'power' && detail.delta < 0 && S.res.power <= BAL.lowPower && started) { toast('⚠️ Power is very low! Science is harder until power is back.'); sfx('alert'); }
  }
}

function renderTasks() {
  const body = $('#tasks-body');
  body.replaceChildren();
  const crisis = solDef().crisis;
  body.append(h('h4', {}, '⚠️ Today\'s problem'),
    h('div', { class: 'task' + (S.crisisDone ? ' done' : '') + (S.current === 'max' ? ' mine' : '') }, S.crisisDone ? '✅' : '⬜', h('span', {}, `${crisis.title} (Max, Command Center)`)));
  for (const id of CREW_IDS) {
    const list = visibleTasks().filter((t) => t.who === id);
    if (!list.length) continue;
    body.append(h('h4', { style: `color:${CREW[id].css}` }, `${CREW[id].name} – ${CREW[id].role}`));
    for (const t of list) {
      body.append(h('div', { class: 'task' + (t.done ? ' done' : '') + (id === S.current ? ' mine' : '') }, t.done ? '✅' : '⬜',
        h('span', {}, t.title, t.science && h('span', { class: 'tag' }, '🔬 science'), t.optional && h('span', { class: 'tag' }, 'optional'))));
    }
  }
  const sci = scienceTask();
  $('#btn-endsol').disabled = !(S.crisisDone && sci?.done);
  $('#btn-endsol').textContent = S.sol === 5 ? '🏁 Finish the mission' : '🌙 End the sol';
}

function renderCrew() {
  const nav = $('#crew');
  nav.replaceChildren();
  for (const id of CREW_IDS) {
    const c = CREW[id];
    let n = pending(id).length + (id === 'max' && !S.crisisDone ? 1 : 0);
    const sick = S.sick && S.sick.who === id && S.sick.sol <= S.sol && !S.sick.treated && S.sick.sol === S.sol;
    nav.append(h('button', { class: 'crew-btn' + (id === S.current ? ' active' : '') + (sick ? ' sick' : ''), onclick: () => select(id) },
      h('span', { class: 'dot', style: `background:${c.css}` }, c.emoji), c.name, h('small', {}, c.role), n > 0 && h('span', { class: 'n' }, n)));
  }
}

function renderAll(what, detail) { renderHud(what, detail); renderTasks(); renderCrew(); base.refresh(); updateInteract(); }
on(renderAll);

// ---------- Base scene bridge ----------
const base = createBase({
  paused: () => !started || G.paused || busy || overlayOpen() || modalOpen() || rockyOpen(),
  near: (id) => { if (id && started) sfx('near'); nearStation = id; updateInteract(); },
  select: (id) => select(id),
  ready: () => base.refresh(),
  stationState: (id) => {
    if (id === 'command' && !S.crisisDone) return S.current === 'max' ? 'mine' : 'other';
    const here = pending().filter((t) => t.station === id);
    if (!here.length) return id === 'command' || STATIONS[id].info ? 'info' : 'none';
    return here.some((t) => t.who === S.current) ? 'mine' : 'other';
  },
});

function select(id) {
  if (busy || overlayOpen() || modalOpen()) return;
  S.current = id; sfx('select');
  base.select(id);
  emit('all');
}

function updateInteract() {
  const btn = $('#btn-interact');
  const show = started && nearStation && !busy && !overlayOpen();
  btn.classList.toggle('hidden', !show);
  if (show) btn.firstChild.textContent = `✋ ${STATIONS[nearStation].label} `;
}

// ---------- Interacting with stations ----------
async function interact() {
  if (!started || busy || !nearStation || overlayOpen() || modalOpen() || rockyOpen()) return;
  const st = nearStation;
  busy = true; updateInteract();
  try {
    if (st === 'command') return await commandCenter();
    if (st === 'medbay') return await medicalBay();
    const here = pending().filter((t) => t.station === st);
    const mine = here.find((t) => t.who === S.current);
    if (mine) return await runTask(mine);
    if (here.length) return await say(`That is ${CREW[here[0].who].name}'s job: "${here[0].title}". Switch to ${CREW[here[0].who].name}!`);
    if (STATIONS[st].info) return await say(STATION_FACTS[st]);
    return await say('Nothing to do here right now. Press "Ask Rocky" if you are lost. I love being asked!');
  } finally { busy = false; emit('all'); }
}

// The Medical Bay station opens the crew health monitor. Elsa starts her medical jobs from it.
async function medicalBay() {
  for (;;) {
    const here = pending().filter((t) => t.station === 'medbay');
    const mine = here.filter((t) => t.who === S.current);
    const note = !mine.length && here.length ? `The medical jobs here are Doctor ${CREW[here[0].who].name}'s. Switch to ${CREW[here[0].who].name} to do them!` : null;
    const pick = await openCrewDashboard({ tasks: mine, note });
    if (!pick) return;
    await runTask(pick); emit('all');
    if (!pick.done) return;
  }
}

// The Command Center terminal opens the Mission Control dashboard. From there the commander
// can decide today's problem or do a job that belongs to this terminal, then sees the dials react.
async function commandCenter() {
  for (;;) {
    const here = pending().filter((t) => t.station === 'command');
    const mine = here.find((t) => t.who === S.current);
    const needMax = !S.crisisDone && S.current !== 'max';
    const note = needMax ? 'Only Commander Max can make today\'s decision. Switch to Max and bring him here!'
      : !mine && here.length ? `"${here[0].title}" is ${CREW[here[0].who].name}'s job.` : null;
    const what = await openDashboard({ canDecide: !S.crisisDone && S.current === 'max', taskTitle: mine?.title, note });
    if (what === 'crisis') { await doCrisis(); emit('all'); continue; }
    if (what === 'task') { await runTask(mine); emit('all'); if (mine.done) continue; }
    return;
  }
}

function doCrisis() {
  const c = solDef().crisis;
  sfx(S.sol === 4 ? 'storm' : S.sol === 2 ? 'dust' : 'alert');
  return new Promise((resolve) => {
    const m = modal(
      scene(c.art, 640, 170), h('h2', {}, '⚠️ ' + c.title), h('p', {}, c.text), h('p', { class: 'note' }, 'Every choice helps one thing and costs another. Choose wisely, Commander!'),
      c.options.map((o) => h('div', { class: 'choice', onclick: () => {
        m.close(); sfx('ok');
        change(o.fx); Object.assign(S.solFlags, o.flags || {});
        S.crisisDone = true; S.solFlags.crisisChoice = o.label; S.solFlags.crisisId = o.id;
        toast(`Decision: ${o.label}`);
        resolve();
      } }, h('b', {}, o.label), h('div', { class: 'good' }, '✅ ' + o.good), h('div', { class: 'bad' }, '❌ ' + o.bad))));
  });
}

async function runTask(t) {
  if (t.needsCrisis && !S.crisisDone) return say('Wait! Commander Max must choose the rover route at the Command Center first.');
  const params = { ...(t.params || {}) };
  if (t.game === 'rover') params.sites = S.solFlags.roverSites || params.sites || 3;
  const result = await runGame(t.game, params, { who: CREW[t.who].name, title: t.title });
  if (!result.done) { toast('Task not finished yet. Come back any time!'); return; }
  t.done = true; sfx('sparkle');
  let fx = t.fx;
  if (t.id === 'expedition') fx = params.sites === 2 ? BAL.roverShortTrip : BAL.roverTrip;
  change(fx);
  if (t.flagsAfter) Object.assign(S.flags, t.flagsAfter);
  if (t.treat) { S.sick.treated = true; change(BAL.doctorVisit); change(BAL.doctorCost[S.sick.who]); toast(`${S.sick.name} rests today and feels better.`); }
  if (t.science) {
    const cap = scienceCap(), raw = BAL.scienceScore(result.mistakes), pts = Math.min(cap, raw);
    change({ science: pts });
    await factCard(pts, raw > pts ? cap : null);
  } else {
    toast(`✅ ${t.title} – done!`);
  }
}

async function factCard(pts, cappedAt) {
  const f = solDef().fact;
  const extra = [];
  if (S.sol === 4) {
    const fl = await getFlare();
    extra.push(h('h3', {}, '☀️ Real space weather'),
      h('p', {}, `On ${fl.date}, the Sun produced a class ${fl.classType} solar flare${fl.region ? ' from ' + fl.region : ''}. Real astronauts have to think about this too!`),
      h('p', { class: 'note' }, fl.live ? '🟢 LIVE data: strongest flare of the last 30 days, fetched just now from NASA DONKI.' : '💾 SAVED data: a historical example stored inside the game (live NASA data was not reachable). Source: NASA DONKI.'));
  }
  return new Promise((resolve) => {
    const m = modal(
      h('h2', {}, `🔬 Science mission complete: +${pts} points!`),
      cappedAt && h('p', { class: 'note' }, `(Today's mission was limited to ${cappedAt} points because of a power decision or low power.)`),
      scene(f.art), h('h3', {}, '💡 ' + f.title), h('p', {}, f.text),
      h('p', { class: 'note' }, 'Source: ', h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.source)),
      extra,
      h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => { m.close(); resolve(); } }, 'Cool! ▶')));
  });
}

// ---------- End of sol ----------
async function endSol() {
  if (busy) return;
  busy = true;
  try { await endSolFlow(); } finally { busy = false; emit('all'); }
}

async function endSolFlow() {
  const left = pending().filter((t) => !t.optional);
  if (left.length) {
    const go = await new Promise((resolve) => {
      const m = modal(h('h2', {}, 'Some tasks are not finished'), h('ul', {}, left.map((t) => h('li', {}, `${CREW[t.who].name}: ${t.title}`))),
        h('p', {}, 'Unfinished tasks lower the mission success. End the sol anyway?'),
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { m.close(); resolve(false); } }, 'Keep working'), h('button', { class: 'btn warn', onclick: () => { m.close(); resolve(true); } }, 'End the sol')));
    });
    if (!go) return;
  }
  const before = { ...S.res };
  const sum = endOfSol();
  sfx('fanfare');
  const delta = (k) => { const d = Math.round(S.res[k] - S.startRes[k]); return `${Math.round(S.res[k])} (${d >= 0 ? '+' : ''}${d} today)`; };
  await new Promise((resolve) => {
    const m = modal(
      solSummary(sum, tipFor(sum)),
      h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => { m.close(); resolve(); } }, S.sol === 5 ? 'See final results ▶' : `Start Sol ${S.sol + 1} ▶`)));
    m.el.classList.add('mc', 'mc-sum');
  });
  if (S.sol === 5) return finalReport();
  S.sol++;
  base.resetPositions();
  startSol();
  music.play(baseTrack());
  if (solDef().onStart?.toast) { toast(solDef().onStart.toast); sfx('storm'); }
  await briefing();
}

function tipFor(sum) {
  if (sum.missed.length) return `We skipped "${sum.missed[0]}". Every astronaut's job helps the base, so try to finish them all next sol!`;
  if (S.res.power <= 30) return 'Power is getting low. Watch out for choices that cost power, and keep those solar panels clean!';
  if (S.res.shield < 40) return 'Shielding is low, so the crew loses health at night. Extra shielding costs power, but it keeps everyone safe.';
  if (S.res.food <= 30) return 'Food is running low. Lea\'s greenhouse tasks grow more food every sol.';
  if (S.res.health <= 50) return 'The crew is tired. Elsa\'s checkups bring Crew Health back up.';
  return 'Great balance, Commander! You are thinking like a real mission planner. Beep boop!';
}

async function briefing() {
  const d = solDef();
  const lines = [`☀️ Good morning! It is Sol ${S.sol}: ${d.title}.`, ...d.brief];
  if (S.sick && S.sick.sol === S.sol) lines.push(`Oh no, ${S.sick.name} woke up feeling sick (−10 Crew Health). Doctor Elsa can help in the Medical Bay, but ${S.sick.name} will need to rest.`);
  if (S.flags.panelsDirty && S.sol > 2) lines.push('The solar panels are still dusty, so we make less power. Max can clean them through the Airlock.');
  await say(lines);
}

// ---------- Final report ----------
function finalReport() {
  const pct = successPercent();
  const good = [], tips = [];
  const r = S.res;
  (S.science >= 40 ? good : tips).push(S.science >= 40 ? `Amazing science: ${S.science} of 50 points!` : `Science: ${S.science} of 50. Fewer mistakes in the science missions earn more points. Read every clue slowly.`);
  const tr = S.totals.total ? S.totals.done / S.totals.total : 1;
  (tr >= 0.9 ? good : tips).push(tr >= 0.9 ? `The crew finished ${S.totals.done} of ${S.totals.total} tasks.` : `Only ${S.totals.done} of ${S.totals.total} tasks were finished. Switch between all four astronauts each sol.`);
  for (const [k, name, tip] of [['power', 'Power', 'Clean the solar panels early and be careful with heating.'], ['shield', 'Shielding', 'Turn on extra shielding during the solar storm.'], ['food', 'Food', 'Do Lea\'s greenhouse tasks and heat the greenhouse when it is cold.'], ['health', 'Crew Health', 'Do Elsa\'s checkups and keep shielding and food high.']]) {
    if (r[k] >= 60) good.push(`${name} stayed healthy at ${Math.round(r[k])}.`); else tips.push(`${name} ended at ${Math.round(r[k])}. ${tip}`);
  }
  const title = pct >= 85 ? 'Legendary Space Commander!' : pct >= 65 ? 'Great mission, Commander!' : 'Mission complete: good try, Commander!';
  const m = modal(
    scene(pct >= 65 ? 'sunset' : 'title', 640, 150), h('h2', {}, '🏁 ' + title), finalGauges(pct),
    h('p', { class: 'note' }, 'How it is counted: 50% science points, 30% tasks completed, 20% average of the four resources.'),
    h('h3', {}, '🌟 What went well'), h('ul', {}, (good.length ? good : ['You finished five sols on Mars. That is not easy!']).map((x) => h('li', {}, x))),
    tips.length ? [h('h3', {}, '🚀 Rocky\'s tips for next time'), h('ul', {}, tips.map((x) => h('li', {}, x)))] : null,
    h('h3', {}, '🧠 What you learned'), h('ul', {}, h('li', {}, 'Every choice on a space mission is a trade-off.'), h('li', {}, 'Real experiments help us learn to live on Mars.'), h('li', {}, 'Mars is cold and dusty, with thin air and lots of radiation.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showSources(() => finalReport()) }, 'Data sources'), h('button', { class: 'btn', onclick: () => { m.close(); quitToTitle(); } }, '🏠 Title screen'), h('button', { class: 'btn go', onclick: () => { m.close(); newGame(); } }, 'Play again 🔁')));
  m.el.classList.add('mc', 'mc-sum');
  sfx('finale');
}

// ---------- Menus ----------
function showSources(back) {
  const m = modal(h('h2', {}, '🛰️ Data from NASA and CSA'),
    h('p', {}, 'Real science inspired this game. Game scores, costs and puzzles are simplified and invented for play. They are not NASA measurements.'),
    DATA_SOURCES.map(([name, url, note]) => h('p', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, name), h('br'), h('span', { class: 'note' }, note))),
    h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => { m.close(); back?.(); } }, 'Back')));
}

// ---------- Pause menu: resume, restart or quit from anywhere ----------
const pauseEl = $('#pause');
const pauseOpen = () => !pauseEl.classList.contains('hidden');

function showMenu() {
  if (!started) return;
  G.paused = true; sfx('tap'); music.muffle(true);
  pauseEl.replaceChildren(h('div', { class: 'panel' },
    h('h2', {}, '⏸ Mission paused'),
    h('p', { class: 'note' }, `Sol ${S.sol} of 5 · Science ${S.science} / 50`),
    h('div', { class: 'pz-main' },
      h('button', { class: 'btn go', onclick: resume }, '▶ Resume mission'),
      h('button', { class: 'btn', onclick: () => confirmPause('restart') }, '🔁 Restart mission'),
      h('button', { class: 'btn warn', onclick: () => confirmPause('quit') }, '🏠 Quit to title')),
    audioControls(),
    h('div', { class: 'pz-row' },
      !modalOpen() && !overlayOpen() && h('button', { class: 'btn', onclick: () => { resume(); showSources(showMenu); } }, '🛰️ Data sources')),
    h('details', {}, h('summary', {}, 'Controls'),
      h('ul', {}, h('li', {}, 'Walk: arrow keys or WASD, or tap/click where you want to go.'), h('li', {}, 'Interact: E or Space, or the green button.'), h('li', {}, 'Mission Control dashboard: interact with the Command terminal.'), h('li', {}, 'Switch astronaut: the buttons at the bottom, or keys 1 2 3 4.'), h('li', {}, 'Rover: W/S drive, A/D steer, E collect.'), h('li', {}, 'Pause: Esc or the ⏸ button, any time.')))));
  pauseEl.classList.remove('hidden');
}

function resume() { pauseEl.classList.add('hidden'); pauseEl.replaceChildren(); G.paused = false; music.muffle(false); }

function confirmPause(what) {
  const restart = what === 'restart';
  sfx('alert');
  pauseEl.replaceChildren(h('div', { class: 'panel' },
    h('h2', {}, restart ? '🔁 Restart the mission?' : '🏠 Quit to the title screen?'),
    h('p', {}, restart ? 'You will go back to Sol 1 with a fresh crew and full resources.' : 'You can start a brand-new mission from the title screen.'),
    h('p', { class: 'note' }, 'Your progress in this mission will be lost.'),
    h('div', { class: 'pz-row' },
      h('button', { class: 'btn', onclick: showMenu }, '◀ No, go back'),
      h('button', { class: 'btn warn', onclick: () => (restart ? restartMission() : quitToTitle()) }, restart ? 'Yes, restart' : 'Yes, quit'))));
}

/** Close every open screen and stop the current mission. */
function stopMission() {
  resume();
  abortAll();
  busy = false; nearStation = null; started = false;
  emit('all');
}

function restartMission() { stopMission(); toast('🔁 New mission: back to Sol 1!'); newGame(); }

function quitToTitle() {
  stopMission();
  $('#ui').classList.add('hidden'); $('#btn-menu').classList.add('hidden');
  resetGame(); base.resetPositions();
  titleScreen({ intro: false });
}

const landing = createLanding({ onStart: () => newGame(), onSources: () => showSources() });
function titleScreen(opts) { landing.show(opts); }

async function newGame() {
  resetGame();
  base.resetPositions();
  startSol();
  base.select(S.current);
  $('#ui').classList.remove('hidden'); $('#btn-menu').classList.remove('hidden');
  started = true;
  music.play(baseTrack());
  emit('all');
  await briefing();
}

// ---------- Wiring ----------
$('#btn-interact').onclick = interact;
$('#btn-hint').onclick = () => { if (!busy && !rockyOpen()) hint(); };
$('#btn-endsol').onclick = endSol;
$('#btn-menu').onclick = showMenu;
$('#tasks-toggle').onclick = () => $('#tasks').classList.toggle('closed');
if (window.innerWidth < 900) $('#tasks').classList.add('closed');
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) { setMuted(!settings.muted); toast(settings.muted ? '🔇 Sound off' : '🔊 Sound on'); if (pauseOpen()) showMenu(); return; }
  if (pauseOpen()) { if (e.code === 'Escape') { e.preventDefault(); resume(); } return; }
  if (started && e.code === 'Escape' && !modalOpen() && !rockyOpen()) { e.preventDefault(); showMenu(); return; }
  if (rockyOpen() && e.code === 'Escape') { $('#rocky-close').click(); return; }
  if (rockyOpen() && e.code === 'ArrowLeft') { e.preventDefault(); $('#rocky-prev').click(); return; }
  if (rockyOpen() && (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight')) { e.preventDefault(); $('#rocky-next').click(); return; }
  if (overlayOpen() || modalOpen()) return;
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); interact(); }
  const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
  if (n >= 0 && started) select(CREW_IDS[n]);
});

resetGame();
titleScreen();
if (new URLSearchParams(location.search).has('debug')) window.__game = { S, change, emit, runGame, SOLS };
