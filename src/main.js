import { S, on, emit, change, startSol, solDef, visibleTasks, scienceCap, endOfSol, successPercent, resetGame, snapshot, restore } from './state.js';
import { BAL } from './data/balance.js';
import { CREW, CREW_IDS, SOLS, STATION_FACTS, DATA_SOURCES } from './data/sols.js';
import { STATIONS } from './data/map.js';
import { $, h, toast, modal, modalOpen, sfx, G, abortAll, onAbort, audioControls } from './ui.js';
import { createSaveStore, SAVE_KEY } from './save.js';
import './polish.css';
import { music, rockyTalk, settings, setMuted, ambience } from './audio.js';
import { createBase } from './base.js';
import { runGame } from './minigames/index.js';
import { getFlare } from './nasa.js';
import { scene } from './art.js';
import { openDashboard } from './dashboard.js';
import { openCrewDashboard, finalGauges } from './panels.js';
import { createLanding } from './landing.js';
import { narration } from './narration.js';
import { voiceControls } from './voice-ui.js';
import { createFirstFlight } from './first-flight.js';
import { chooseMissionCard } from './mission-choice.js';
import { createWalkthrough } from './walkthrough.js';
import { taskGuidance } from './data/task-guidance.js';
import './first-flight.css';
import { createEnvironment } from './environment.js';
import { dayComplete, completedMission } from './data/mission-progress.js';
import { playSolTransition, installSpaceAtmosphere } from './sol-transition.js';
import { showMissionReport } from './mission-report.js';
import { showDayReport } from './day-report.js';
import './mission-controls.css';
import { compactTasks, crewPortrait, openTaskSheet } from './mobile-tasks.js';
import './si-disclosure.css';

let nearStation = null, busy = false, started = false;
let missionEpoch = 0;
let tour = null;
let panoramaTasksClosed = null;
let advanceTimer = null;
const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
const firstFlight = createFirstFlight(storage);
const saves = createSaveStore(storage, crypto.randomUUID());
let saveBlocked = false;
function checkpoint(replace = false) {
  if (saveBlocked && !replace) return false;
  const result = saves.write(snapshot(), replace);
  $('#save-status').textContent = result.ok ? '✓ Progress saved on this device' : result.reason === 'conflict' ? 'Another tab has newer progress. Return to title to continue it.' : 'Saving unavailable — keep this tab open';
  if (result.reason === 'conflict') { saveBlocked = true; G.paused = true; showMenu(); }
  return result.ok;
}
const overlayOpen = () => !$('#overlay').classList.contains('hidden') || !$('#rover').classList.contains('hidden');
const rockyOpen = () => !$('#rocky').classList.contains('hidden');

// ---------- Rocky, the guide ----------
function say(lines, speaker = 'rocky', requested = false) {
  lines = [].concat(lines);
  return new Promise((resolve) => {
    let i = 0;
    const previousFocus = document.activeElement;
    const many = lines.length > 1;
    // ◀ / ▶ (or the arrow keys) step through the lines, ✕ (or Esc) closes Rocky.
    const show = () => {
      narration.stop();
      $('#rocky').querySelector('.voice-controls')?.remove();
      $('#rocky .rocky-extras')?.remove();
      $('#rocky-text').textContent = lines[i];
      $('#rocky .rocky-bubble > b').textContent = speaker === 'control' ? 'Mission Control' : 'Rocky';
      $('#rocky-dots').replaceChildren(...(many ? lines.map((_, k) => h('i', { class: k === i ? 'on' : '' })) : []));
      $('#rocky-prev').classList.toggle('hidden', !many);
      $('#rocky-prev').disabled = i === 0;
      $('#rocky-next').textContent = i < lines.length - 1 ? '▶' : 'OK ✓';
      $('#rocky-text').after(voiceControls({ text: lines[i], speaker, owner: 'rocky-dialogue', automatic: speaker === 'rocky' && (requested ? 'requested' : true) }));
      narration.preload(lines.slice(i + 1, i + 3), speaker);
    };
    $('#rocky').classList.remove('hidden');
    const end = () => { narration.stop(); $('#rocky').querySelector('.voice-controls')?.remove(); $('#rocky .rocky-extras')?.remove(); $('#rocky').classList.add('hidden'); if (previousFocus?.isConnected) previousFocus.focus(); resolve(); };
    $('#rocky-next').onclick = () => { if (++i < lines.length) show(); else end(); };
    $('#rocky-prev').onclick = () => { if (i > 0) { i--; show(); } };
    $('#rocky-close').onclick = end;
    show();
    if (requested) {
      const next = taskGuidance(S, visibleTasks(), solDef().crisis);
      $('#rocky-text').after(h('div', { class: 'rocky-extras' },
        next && h('button', { class: 'btn small', title: next.title, onclick: () => { end(); navigate(next.who, next.station); } }, `Show ${next.label === 'URGENT' ? 'urgent' : 'priority'} task →`),
        h('button', { class: 'btn small', onclick: () => { end(); showControls(); } }, 'Controls')));
    }
    $('#rocky-next').focus();
  });
}

/** Sols 2 (dust storm) and 4 (solar storm) get the more urgent theme. */
const baseTrack = () => (!S.crisisDone && (S.sol === 2 || S.sol === 4) ? 'storm' : 'base');

const pending = (who) => visibleTasks().filter((t) => !t.done && (!who || t.who === who));
const scienceTask = () => S.tasks.find((t) => t.science);

function hint() {
  const tell = text => say(text, 'rocky', true);
  const me = CREW[S.current];
  if (!S.crisisDone) return tell(`First things first: ${S.current === 'max' ? 'walk Max' : 'switch to Max and walk him'} to the Command Center 🖥️ to decide about today's problem: "${solDef().crisis.title}"`);
  const mine = pending(S.current);
  if (mine.length) {
    const prerequisite = mine[0].requires?.map(id => S.tasks.find(t => t.id === id)).find(t => t && !t.done);
    if (prerequisite) return tell(`First, ${CREW[prerequisite.who].name} needs to finish "${prerequisite.title}" at the ${STATIONS[prerequisite.station].label}. Then ${me.name} can continue.`);
    return tell(`${me.name}'s next job: "${mine[0].title}". Walk to the ${STATIONS[mine[0].station].label} ${STATIONS[mine[0].station].icon} and press Interact!`);
  }
  const others = pending();
  if (others.length) return tell(`${me.name} is all done! Switch to ${CREW[others[0].who].name} for: "${others[0].title}".`);
  return tell('Everything is done for today! Press "End the sol" so the crew can sleep. Even robots need a recharge. Zzzt.');
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
  const oldPriority = body.querySelector('[data-priority]')?.dataset.task;
  body.replaceChildren();
  const crisis = solDef().crisis;
  const recommended = taskGuidance(S, visibleTasks(), crisis);
  const priorityAttrs = id => recommended?.id === id ? { 'data-priority': recommended.label, 'data-task': id, class: ' priority-task' + (oldPriority !== id ? ' priority-enter' : '') } : { 'data-task': id, class: '' };
  const priorityCopy = id => recommended?.id === id ? [h('strong', { class: 'priority-badge' }, recommended.label), h('small', { class: 'priority-reason' }, recommended.reason)] : [];
  body.append(h('h4', {}, '⚠️ Today\'s problem'),
    h('button', { ...priorityAttrs('crisis'), class: 'task' + priorityAttrs('crisis').class + (S.crisisDone ? ' done' : '') + (S.current === 'max' ? ' mine' : ''), onclick: () => navigate('max', 'command') }, S.crisisDone ? '✅' : '➜', h('span', {}, ...priorityCopy('crisis'), `${crisis.title} (Max, Command Center)`)));
  for (const id of CREW_IDS) {
    const list = visibleTasks().filter((t) => t.who === id);
    if (!list.length) continue;
    body.append(h('h4', { style: `color:${CREW[id].css}` }, `${CREW[id].name} – ${CREW[id].role}`));
    for (const t of list) {
      const prerequisite = t.requires?.map(id => S.tasks.find(task => task.id === id)).find(task => task && !task.done);
      const needsDecision = t.science && !S.crisisDone;
      body.append(h('button', { ...priorityAttrs(t.id), class: 'task' + priorityAttrs(t.id).class + (t.done ? ' done' : '') + (id === S.current ? ' mine' : ''), onclick: () => needsDecision ? navigate('max', 'command') : navigate(prerequisite?.who || id, prerequisite?.station || t.station) }, t.done ? '✅' : prerequisite || needsDecision ? '🔗' : '➜',
        h('span', {}, ...priorityCopy(t.id), t.title, !t.done && (needsDecision ? h('small', {}, 'First: decide today’s problem') : prerequisite && h('small', {}, `First: ${prerequisite.title}`)), t.science && h('span', { class: 'tag' }, '🔬 science'), t.optional && h('span', { class: 'tag' }, 'optional'))));
    }
  }
  const sci = scienceTask();
  $('#btn-endsol').disabled = !(S.crisisDone && sci?.done);
  $('#btn-endsol').textContent = S.sol === 5 ? '🏁 Finish the mission' : '🌙 End the sol';
  $('#end-reason').textContent = !S.crisisDone ? 'Decide today’s problem to unlock the science mission.' : !sci?.done ? 'Complete today’s science mission before resting.' : 'Ready to rest. Other crew tasks help tomorrow.';
  $('#objective').replaceChildren(...(recommended ? [crewPortrait(recommended.who)] : []), h('span', { class: 'objective-copy' }, h('small', { class: 'objective-label' }, recommended?.label || 'READY TO REST'), h('span', { class: 'objective-title' }, recommended ? recommended.title : 'All tasks done — end the sol'), recommended && h('small', { class: 'objective-owner' }, CREW[recommended.who].name)), h('span', { class: 'objective-go', 'aria-hidden': 'true' }, 'Go →'));
  const listed = visibleTasks();
  $('#tasks-toggle').textContent = `Tasks · ${listed.filter(t => t.done).length + Number(S.crisisDone)}/${listed.length + 1}`;
  $('#objective').dataset.priority = recommended?.label || '';
  $('#objective').onclick = () => recommended ? navigate(recommended.who, recommended.station) : endSol();
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

function renderAll(what, detail) { renderHud(what, detail); renderTasks(); renderCrew(); base.refresh(); updateInteract(); syncViewButton(); scheduleDayReport(); }
on(renderAll);

// ---------- Base scene bridge ----------
const base = createBase({
  room: id => { if (started && !G.paused && !overlayOpen()) ambience.setRoom(id === 'engineering' ? 'generator' : id); else ambience.stop(); },
  hidden: () => !started || overlayOpen() || document.hidden,
  paused: () => !started || G.paused || busy || overlayOpen() || modalOpen() || rockyOpen() || !!tour?.blocking,
  canZoom: () => canUseDock(),
  cameraChanged: () => syncViewButton(),
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

tour = createWalkthrough({ navigate, interact, destination: () => base.stationRect('command'), arrived: () => nearStation === 'command', onFinish: () => firstFlight.finishTour() });
const environment = createEnvironment({ storage, canOpen: () => started && !busy && !G.paused && !overlayOpen() && !modalOpen() && !tour.active && !rockyOpen() });

function select(id) {
  if (busy || overlayOpen() || modalOpen()) return;
  S.current = id; sfx('select');
  base.select(id); syncViewButton();
  emit('all');
}

function navigate(who, station) {
  if (!started || busy || G.paused || overlayOpen() || modalOpen()) return;
  $('#rocky').classList.add('hidden');
  select(who); base.navigate(station);
  if (window.innerWidth < 900) $('#tasks').classList.add('closed');
  toast(`${CREW[who].name} is heading to ${STATIONS[station].label}. Press E or Interact on arrival.`);
}

function updateInteract() {
  const btn = $('#btn-interact');
  const show = started && nearStation && !busy && !overlayOpen();
  btn.classList.toggle('hidden', !show);
  if (show) btn.firstChild.textContent = `✋ ${STATIONS[nearStation].label} `;
}

// ---------- Interacting with stations ----------
async function interact() {
  if (!started || busy || G.paused || !nearStation || overlayOpen() || modalOpen() || rockyOpen()) return;
  const st = nearStation;
  const epoch = missionEpoch;
  busy = true; updateInteract();
  try {
    if (st === 'command') return await commandCenter();
    if (st === 'medbay') return await medicalBay();
    const here = pending().filter((t) => t.station === st);
    const mine = here.find((t) => t.who === S.current);
    if (mine) return await runTask(mine);
    if (here.length) return await say(`That is ${CREW[here[0].who].name}'s job: "${here[0].title}". Switch to ${CREW[here[0].who].name}!`);
    if (STATIONS[st].info) return await say(STATION_FACTS[st], 'control');
    return await say('Nothing to do here right now. Press "Ask Rocky" if you are lost. I love being asked!');
  } finally { if (epoch === missionEpoch) { busy = false; emit('all'); } }
}

// The Medical Bay station opens the crew health monitor. Elsa starts her medical jobs from it.
async function medicalBay() {
  const epoch = missionEpoch;
  for (;;) {
    const here = pending().filter((t) => t.station === 'medbay');
    const mine = here.filter((t) => t.who === S.current);
    const note = !mine.length && here.length ? `The medical jobs here are Doctor ${CREW[here[0].who].name}'s. Switch to ${CREW[here[0].who].name} to do them!` : null;
    const pick = await openCrewDashboard({ tasks: mine, note });
    if (epoch !== missionEpoch) return;
    if (!pick) return;
    await runTask(pick); emit('all');
    if (epoch !== missionEpoch) return;
    return;
  }
}

// The Command Center terminal opens the Mission Control dashboard. From there the commander
// can decide today's problem or do a job that belongs to this terminal, then sees the dials react.
async function commandCenter() {
  const epoch = missionEpoch;
  for (;;) {
    const here = pending().filter((t) => t.station === 'command');
    const mine = here.find((t) => t.who === S.current);
    const needMax = !S.crisisDone && S.current !== 'max';
    const note = needMax ? 'Only Commander Max can make today\'s decision. Switch to Max and bring him here!'
      : !mine && here.length ? `"${here[0].title}" is ${CREW[here[0].who].name}'s job.` : null;
    const what = await openDashboard({ canDecide: !S.crisisDone && S.current === 'max', taskTitle: mine?.title, note });
    if (epoch !== missionEpoch) return;
    if (what === 'crisis') { await doCrisis(); if (epoch !== missionEpoch) return; emit('all'); return; }
    if (what === 'task') { await runTask(mine); if (epoch !== missionEpoch) return; emit('all'); return; }
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
        base.taskComplete({ id: 'crisis', station: 'command', who: 'max', title: 'Mission plan updated' });
        checkpoint(); music.play(baseTrack());
        toast(`Decision: ${o.label}`);
        resolve();
      } }, h('b', {}, o.label), h('div', { class: 'good' }, '✅ ' + o.good), h('div', { class: 'bad' }, '❌ ' + o.bad), h('p', { class: 'choice-preview' }, forecast(o)))));
  });
}

function forecast(option) {
  const names = { power: 'Power', food: 'Food', health: 'Health', shield: 'Shield' };
  const r = { ...S.res };
  const immediate = Object.entries(option.fx || {}).filter(([k]) => k in r).map(([k, delta]) => {
    r[k] = Math.max(0, Math.min(100, r[k] + delta));
    return `${names[k]} ${S.res[k]} → ${r[k]}${r[k] === S.res[k] ? ' (already full)' : ''}`;
  });
  const solar = S.flags.panelsDirty ? BAL.daily.solarDusty : BAL.daily.solar;
  const power = Math.max(0, Math.min(100, r.power + solar) + BAL.daily.baseSystems);
  return `${immediate.join(' · ') || 'Effect follows the crew task.'} Tonight: about ${power} Power; ${r.shield < BAL.daily.lowShieldBelow ? 'low shielding will cost 10 health' : 'shielding is safe'}. Forecast excludes unfinished tasks.`;
}

async function runTask(t) {
  const epoch = missionEpoch;
  if (!t || t.done || S.phase !== 'base') return;
  if ((t.needsCrisis || t.science) && !S.crisisDone) return say('First, send Max to the Command Center to decide today’s problem. Then your science plan is ready!');
  const needed = t.requires?.map(id => S.tasks.find(x => x.id === id)).find(x => x && !x.done);
  if (needed) return say(`${CREW[needed.who].name} needs to finish “${needed.title}” first. Tap that task in the mission list to go there.`);
  const params = { ...(t.params || {}) };
  if (t.game === 'report') params.discoveries = S.journal.filter(j => j.science).map(j => j.text);
  if (t.game === 'rover') params.sites = S.solFlags.roverSites || params.sites || 3;
  const result = await runGame(t.game, params, { who: CREW[t.who].name, title: t.title, science: !!t.science });
  if (epoch !== missionEpoch) return;
  if (!result.done) { toast('Task not finished yet. Come back any time!'); return; }
  t.done = true; sfx('sparkle');
  let fx = t.fx;
  if (t.id === 'expedition') fx = params.sites === 2 ? BAL.roverShortTrip : BAL.roverTrip;
  change(fx);
  if (t.flagsAfter) Object.assign(S.flags, t.flagsAfter);
  if (t.treat) { S.sick.treated = true; change(BAL.doctorVisit); change(BAL.doctorCost[S.sick.who]); toast(`${S.sick.name} rests today and feels better.`); }
  const entry = { sol: S.sol, title: t.title, text: t.science ? solDef().fact.text : `${CREW[t.who].name} completed ${t.title}.`, science: !!t.science, mastery: result.mistakes === 0 ? 3 : result.mistakes <= 2 ? 2 : 1 };
  S.journal.push(entry);
  base.taskComplete(t);
  if (t.science) {
    const cap = scienceCap(), raw = S.difficulty === 'explorer' ? 10 : BAL.scienceScore(result.mistakes), pts = Math.min(cap, raw);
    change({ science: pts });
    checkpoint(); emit('all');
    toast(`🔬 Science complete · +${pts} points${raw > pts ? ' (today’s science limit)' : ''}. Saved to Discoveries.`);
    await showMissionReport({ points: pts, cappedAt: raw > pts ? cap : null, fact: solDef().fact });
  } else {
    checkpoint();
    toast(`✅ ${t.title} – done!`);
  }
}

// ---------- End of sol ----------
async function endSol() {
  if (busy || !started || G.paused || !S.crisisDone || !scienceTask()?.done || S.phase !== 'base') return;
  busy = true;
  const epoch = missionEpoch;
  try { await endSolFlow(); } finally { if (epoch === missionEpoch) { busy = false; emit('all'); } }
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
  const sum = endOfSol();
  checkpoint();
  await showSummary(sum);
}

function scheduleDayReport() {
  if (advanceTimer || !started || saveBlocked || !dayComplete(S, visibleTasks())) return;
  if (busy || G.paused || modalOpen() || overlayOpen() || rockyOpen() || tour?.active || document.hidden) return;
  const epoch = missionEpoch, sol = S.sol;
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    if (epoch === missionEpoch && sol === S.sol && !saveBlocked && !busy && !G.paused && !modalOpen() && !overlayOpen() && !rockyOpen() && !tour?.active && !document.hidden && dayComplete(S, visibleTasks())) endSol();
  }, 450);
}

async function showSummary(sum) {
  const epoch = missionEpoch;
  const accepted = await showDayReport(sum);
  if (!accepted || epoch !== missionEpoch) return;
  sfx(S.sol === 5 ? 'finale' : 'fanfare');
  const finished = await playSolTransition({ sol: S.sol, nextSol: S.sol + 1, science: S.science, tasksDone: S.totals.done, final: S.sol === 5, score: successPercent(), nextTitle: SOLS[S.sol]?.title });
  if (!finished || epoch !== missionEpoch) return;
  if (S.sol === 5) { S.phase = 'final'; checkpoint(); return finalReport(); }
  S.sol++;
  S.current = 'max';
  base.resetPositions();
  startSol();
  base.select(S.current);
  checkpoint();
  music.play(baseTrack());
  toast(`Sol ${S.sol} · ${solDef().title}. Your new tasks are ready.`);
  if (solDef().onStart?.toast) { toast(solDef().onStart.toast); sfx('storm'); }
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
  (S.science >= 40 ? good : tips).push(S.science >= 40 ? `Amazing science: ${S.science} of 50 points!` : `Science: ${S.science} of 50. Keep power available for your experiments and consider each decision’s science limit.${S.difficulty === 'commander' ? ' Fewer mistakes also earn more points in Advanced mode.' : ''}`);
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
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => showSources(() => finalReport()) }, 'Sources & SI use'), h('button', { class: 'btn', onclick: () => { m.close(); quitToTitle(); } }, '🏠 Title screen'), h('button', { class: 'btn go', onclick: () => { m.close(); newGame(); } }, 'Play again 🔁')));
  m.el.classList.add('mc', 'mc-sum');
  sfx('finale');
}

// ---------- Menus ----------
function showSources(back) {
  const m = modal(h('h2', {}, '🛰️ Sources & SI use'),
    h('h3', {}, 'Science references'),
    h('p', {}, 'Real science inspired this game. Game scores, costs and puzzles are simplified and invented for play. They are not NASA measurements.'),
    DATA_SOURCES.map(([name, url, note]) => h('p', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, name), h('br'), h('span', { class: 'note' }, note))),
    h('p', {}, h('a', { href: 'https://github.com/Sarrazre/Junior-Space-Commander/', target: '_blank', rel: 'noopener' }, 'GitHub repository'), ' · ', h('a', { href: `${import.meta.env.BASE_URL}LICENSE.txt`, target: '_blank', rel: 'noopener' }, 'MIT license'), ' · ', h('a', { href: `${import.meta.env.BASE_URL}THIRD-PARTY.txt`, target: '_blank', rel: 'noopener' }, 'Project credits')),
    h('p', {}, h('a', { href: `${import.meta.env.BASE_URL}assets/voice/NOTICE.txt`, target: '_blank', rel: 'noopener' }, 'Voice technology credits and licenses')),
    h('section', { class: 'si-credits', 'aria-label': 'AI and SI disclosure' },
      h('b', {}, 'Made with AI / SI assistance'),
      h('p', {}, 'SI-assisted code and game content; SI-generated artwork, intro video and narration.'),
      h('details', {}, h('summary', {}, 'Tools and credits'),
        h('ul', {},
          h('li', {}, 'OpenAI Codex and Anthropic Claude: code, design iteration, testing and documentation.'),
          h('li', {}, 'OpenAI image generation: fictional plant artwork and base lighting/damage variants.'),
          h('li', {}, 'Original base, menu background and mission logo: team-confirmed AI-generated artwork; original tools not recorded.'),
          h('li', {}, 'Kling: the opening video, identified by its generation metadata.'),
          h('li', {}, 'Tiny Voca / Dizione: SI-generated Rocky and Mission Control narration. No human voice cloning.'),
          h('li', {}, 'Mission rules, values and teaching scenarios include SI assistance. NASA/CSA source data is credited separately above.')),
        h('p', {}, h('a', { href: `${import.meta.env.BASE_URL}SI-USE.json`, target: '_blank', rel: 'noopener' }, 'Asset and generation metadata'), ' · ',
          h('a', { href: `${import.meta.env.BASE_URL}assets/voice/NOTICE.txt`, target: '_blank', rel: 'noopener' }, 'Narration credits')))),
    h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => { m.close(); back?.(); } }, 'Back')));
}

// ---------- Pause menu: resume, restart or quit from anywhere ----------
const pauseEl = $('#pause');
const pauseOpen = () => !pauseEl.classList.contains('hidden');

let pauseView = 'menu';
function pausePage(title, content, className = '') {
  pauseEl.replaceChildren(h('div', { class: 'panel pause-page ' + className }, ...content));
  pauseEl.classList.remove('hidden');
  pauseEl.setAttribute('role', 'dialog'); pauseEl.setAttribute('aria-modal', 'true');
  pauseEl.setAttribute('aria-label', title);
  pauseEl.querySelector('button:not(:disabled)')?.focus();
}
function showMenu() {
  if (!started) return;
  pauseView = 'menu';
  narration.stop();
  G.paused = true; sfx('tap'); music.muffle(true);
  tour?.suspend(true); ambience.stop();
  pausePage('Mission paused', [
    h('small', { class: 'pause-eyebrow' }, 'TAKE A BREATHER, COMMANDER'),
    h('h2', {}, 'Mission paused'),
    h('p', { class: 'note' }, `Sol ${S.sol} of 5 · Science ${S.science} / 50`),
    h('div', { class: 'pz-main' },
      h('button', { class: 'btn go', disabled: saveBlocked, onclick: resume }, '▶ Resume mission'),
      h('button', { class: 'btn', onclick: showSettings }, '⚙ Settings'),
      h('button', { class: 'btn', onclick: showHelp }, 'How to play')),
    saveBlocked && h('p', { role: 'alert' }, 'Another tab saved newer progress. Return to title and choose Continue mission to use that checkpoint.'),
    h('div', { class: 'pz-row pause-secondary' },
      h('button', { class: 'btn small', onclick: () => confirmPause('restart') }, 'Restart mission'),
      h('button', { class: 'btn small', onclick: () => confirmPause('quit') }, 'Quit to title')),
  ], 'pause-home');
}
function showSettings() {
  pauseView = 'settings';
  pausePage('Settings', [
    h('header', { class: 'pause-page-header' }, h('button', { class: 'btn small', onclick: showMenu }, '← Back'), h('h2', {}, 'Settings')),
    h('p', { class: 'note' }, 'Your mission stays paused. Preferences save automatically.'),
    h('div', { class: 'pause-page-scroll' },
      h('h3', {}, 'Sound & narration'), audioControls()),
  ], 'pause-settings');
}
function showHelp() {
  pauseView = 'help';
  pausePage('How to play', [
    h('header', { class: 'pause-page-header' }, h('button', { class: 'btn small', onclick: showMenu }, '← Back'), h('h2', {}, 'How to play')),
    h('div', { class: 'pause-page-scroll' },
      h('p', {}, 'Choose a task to send the right astronaut to their station, then use Interact when they arrive.'),
      h('p', {}, 'Pinch with two fingers to zoom the station, or use the − / + buttons and mouse wheel. Select the percentage to reset. Keyboard: − / + to zoom, 0 to reset. Whole base shows the full station.'),
      !busy && !overlayOpen() && !modalOpen() && h('button', { class: 'btn', onclick: () => { resume(); tour.start(); } }, '🤖 Replay guided tour'),
      h('ul', {}, h('li', {}, 'Walk: arrow keys or WASD, or tap the ground.'), h('li', {}, 'Interact: E or Space, or the green button.'), h('li', {}, 'Switch astronaut: crew portraits or keys 1–4.'), h('li', {}, 'Ask Rocky: R. Whole base: V. Control dashboard: C.'), h('li', {}, 'Rover: W/S drive, A/D steer, E collect.'), h('li', {}, 'Pause or go back: Esc. Mute: M.')),
      !modalOpen() && !overlayOpen() && h('button', { class: 'btn small', onclick: () => { resume(); showSources(() => { showMenu(); showHelp(); }); } }, '🛰️ Sources & SI use')),
  ], 'pause-help');
}

function resume(force = false) { if (saveBlocked && force !== true) return; pauseEl.classList.add('hidden'); pauseEl.replaceChildren(); G.paused = false; tour?.suspend(false); music.muffle(false); }

function confirmPause(what) {
  pauseView = 'confirm';
  const restart = what === 'restart';
  sfx('alert');
  pauseEl.replaceChildren(h('div', { class: 'panel' },
    h('h2', {}, restart ? '🔁 Restart the mission?' : '🏠 Quit to the title screen?'),
    h('p', {}, restart ? 'Start again at Sol 1? This replaces your saved mission.' : 'Your completed tasks and decisions are saved. An unfinished puzzle restarts when you return.'),
    h('div', { class: 'pz-row' },
      h('button', { class: 'btn', onclick: showMenu }, '◀ No, go back'),
      h('button', { class: 'btn warn', onclick: () => (restart ? restartMission() : quitToTitle()) }, restart ? 'Yes, restart' : 'Yes, quit'))));
}

/** Close every open screen and stop the current mission. */
function stopMission() {
  ambience.stop();
  tour?.stop();
  missionEpoch++;
  clearTimeout(advanceTimer); advanceTimer = null;
  resume(true);
  abortAll();
  busy = false; nearStation = null; started = false;
  emit('all');
}

function restartMission() { const mode = S.difficulty; stopMission(); toast('🔁 New mission: back to Sol 1!'); newGame(mode); }

function quitToTitle() {
  stopMission();
  $('#ui').classList.add('hidden'); $('#btn-menu').classList.add('hidden');
  resetGame(); base.resetPositions();
  titleScreen({ intro: true });
}

const landing = createLanding({ onStart: chooseMission, onSources: () => showSources(), hasSave: () => !!saves.read(), hasCompletedSave: () => completedMission(saves.read()?.data), onContinue: continueMission, onIntroComplete: () => firstFlight.finishIntro() });
function titleScreen(opts) { landing.show(opts); }

async function newGame(difficulty = 'explorer', guided = firstFlight.needsTour()) {
  tour?.stop();
  missionEpoch++; saveBlocked = false;
  resetGame(difficulty);
  base.resetPositions();
  startSol();
  base.select(S.current);
  $('#ui').classList.remove('hidden'); $('#btn-menu').classList.remove('hidden');
  started = true;
  checkpoint(true);
  music.play(baseTrack());
  emit('all');
  if (guided) tour.start(); else await briefing();
}

function chooseMission() {
  chooseMissionCard({ hasSave: !!saves.read(), guided: firstFlight.needsTour(), onStart: newGame, onBack: () => titleScreen({ intro: true }) });
}

function continueMission() {
  const saved = saves.read();
  if (completedMission(saved?.data)) { chooseMission(); return; }
  if (!saved || !restore(saved.data)) { toast('That checkpoint could not be read. Start a new mission to replace it.'); titleScreen({ intro: false }); return; }
  missionEpoch++; saveBlocked = false; saves.claim(saved.revision);
  base.resetPositions(); base.select(S.current);
  started = true; $('#ui').classList.remove('hidden'); $('#btn-menu').classList.remove('hidden');
  checkpoint(); music.play(baseTrack()); emit('all');
  if (S.phase === 'summary') { const epoch = missionEpoch; busy = true; showSummary(S.log.at(-1)).finally(() => { if (epoch === missionEpoch) { busy = false; emit('all'); } }); }
  else if (S.phase === 'final') finalReport();
  else toast(`Welcome back, Commander. Sol ${S.sol} is ready. Unfinished puzzles can be tried again.`);
}

function openJournal() {
  if (busy || G.paused || overlayOpen() || modalOpen()) return;
  const weather = h('section', { class: 'journal-entry hidden' });
  const m = modal(h('h2', {}, '🔬 Our discovery cabinet'), h('p', {}, 'Every completed task belongs to your crew’s story. Stars record mastery; Beginner mode protects your learning progress.'),
    S.journal.length ? S.journal.map(j => h('article', { class: 'journal-entry' }, h('small', {}, `Sol ${j.sol} · ${'★'.repeat(j.mastery || 1)}`), h('h3', {}, j.title), h('p', {}, j.text), j.science && h('a', { href: SOLS[j.sol - 1].fact.url, target: '_blank', rel: 'noopener' }, SOLS[j.sol - 1].fact.source))) : h('p', {}, 'Your first discovery is waiting. Complete a crew task to add it here.'),
    weather, h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => m.close() }, 'Back to the base')));
  if (S.journal.some(j => j.science && j.sol === 4)) getFlare().then(flare => {
    if (!weather.isConnected) return;
    weather.classList.remove('hidden');
    weather.append(h('h3', {}, '☀️ Real space weather'), h('p', {}, `On ${flare.date}, the Sun produced a class ${flare.classType} solar flare.`), h('small', {}, flare.live ? 'Live NASA DONKI data · strongest flare in the last 30 days' : 'Saved historical example · NASA DONKI'));
  });
}

function openRooms() {
  if (!started || busy || G.paused || overlayOpen() || modalOpen()) return;
  $('#rocky').classList.add('hidden');
  const descriptions = base.describeRooms();
  const m = modal(h('p', { class: 'room-eyebrow' }, 'ASTRO BASE · LIVE SYSTEMS'), h('h2', {}, 'Around the base'),
    h('p', {}, 'Your crew’s work changes these rooms. Choose a station to visit it.'),
    h('div', { class: 'room-directory' }, descriptions.map(room => {
      const station = room.id === 'engineering' ? 'generator' : room.id === 'solar' || room.id === 'storage' ? 'airlock' : room.id === 'hub' ? 'command' : room.id;
      const task = pending().find(t => t.station === station);
      const who = task?.who || (station === 'command' || station === 'generator' || station === 'air' || station === 'airlock' ? 'max' : station === 'greenhouse' || station === 'kitchen' ? 'lea' : station === 'medbay' || station === 'crew' ? 'elsa' : 'charles');
      return h('article', { class: 'room-directory-card', 'data-room': room.id }, h('span', { class: 'room-icon', 'aria-hidden': 'true' }, STATIONS[station]?.icon || '🛰️'), h('h3', {}, room.label), h('p', {}, room.text),
        h('button', { class: 'btn small', onclick: () => { m.close(); navigate(who, station); } }, `Visit with ${CREW[who].name} →`));
    })), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => { m.close(); base.overview(); syncViewButton(); } }, 'View whole base'), h('button', { class: 'btn go', onclick: () => m.close() }, 'Back to the base')));
}

// Direct views remain available without moving the crew or spending resources.
function canUseDock() { return started && !busy && !G.paused && !overlayOpen() && !modalOpen() && !rockyOpen() && !tour?.active; }
function syncViewButton() {
  const overview = base.isOverview();
  $('#ui').classList.toggle('panorama', overview);
  if (overview && panoramaTasksClosed === null) { panoramaTasksClosed = $('#tasks').classList.contains('closed'); $('#tasks').classList.add('closed'); }
  if (!overview && panoramaTasksClosed !== null) { $('#tasks').classList.toggle('closed', panoramaTasksClosed); panoramaTasksClosed = null; }
  $('#btn-panorama').setAttribute('aria-pressed', String(overview));
  $('#btn-panorama').firstChild.textContent = overview ? 'Follow crew ' : 'Whole base ';
  const zoom = base.zoomState();
  $('#zoom-out').disabled = overview || zoom.value <= zoom.min + .001;
  $('#zoom-in').disabled = !overview && zoom.value >= zoom.max - .001;
  $('#zoom-reset').textContent = overview ? 'Fit' : `${Math.round(zoom.value * 100)}%`;
  $('#zoom-reset').setAttribute('aria-label', overview ? 'Return to normal zoom' : `Reset zoom (currently ${Math.round(zoom.value * 100)}%)`);
}
function changeZoom(amount) { if (canUseDock()) base.zoomBy(amount); }
function resetZoom() { if (canUseDock()) base.resetZoom(); }
function togglePanorama() {
  if (!canUseDock()) return;
  if (base.isOverview()) base.select(S.current); else base.overview();
  syncViewButton();
}
async function remoteDashboard() {
  if (!canUseDock()) return;
  const epoch = missionEpoch;
  const result = await openDashboard({ note: 'Remote station overview. To make today’s decision, bring Max to the Command Center.', remote: true });
  if (epoch === missionEpoch && result === 'visit') navigate('max', 'command');
}
function showControls() {
  const m = modal(h('h2', {}, 'Your flight controls'), h('p', {}, 'Click the ground to walk, or use WASD / arrow keys. Tap a crew member to switch.'),
    h('p', {}, 'E / Space: interact · 1–4: choose crew · R: ask Rocky · V: whole base / follow crew · C: control dashboard · Esc: pause / close · M: mute'),
    h('p', {}, 'Use Tab to move between buttons and Enter to activate one. On touchscreens, every action has a button.'),
    h('button', { class: 'btn go', onclick: close }, 'Ready to explore'));
  const unregister = onAbort(() => window.removeEventListener('keydown', esc));
  function close() { unregister(); window.removeEventListener('keydown', esc); m.close(); }
  function esc(e) { if (e.code === 'Escape') close(); }
  window.addEventListener('keydown', esc);
}
// Reuse the game's own robot. He rests in the dock and flies to his speech bubble.
const dockedRobot = $('#rocky .rocky-face svg').cloneNode(true);
$('.rocky-docked').append(dockedRobot);
let rockyFlight;
let keyboardInteraction = false;
document.addEventListener('keydown', () => { keyboardInteraction = true; }, true);
document.addEventListener('pointerdown', () => { keyboardInteraction = false; }, true);
new MutationObserver(() => {
  const awake = rockyOpen();
  $('#btn-hint').toggleAttribute('data-awake', awake);
  rockyFlight?.cancel();
  if (!awake || G.reducedMotion || keyboardInteraction) return;
  const from = $('.rocky-docked').getBoundingClientRect(), face = $('#rocky .rocky-face'), to = face.getBoundingClientRect();
  rockyFlight = face.animate([{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(.4)`, opacity: .5 }, { transform: 'translate(0, 0) scale(1)', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
}).observe($('#rocky'), { attributes: true, attributeFilter: ['class'] });

// ---------- Wiring ----------
$('#btn-interact').onclick = interact;
$('#btn-hint').onclick = () => { if (canUseDock()) hint(); };
$('#btn-panorama').onclick = togglePanorama;
$('#zoom-out').onclick = () => changeZoom(-.1);
$('#zoom-in').onclick = () => changeZoom(.1);
$('#zoom-reset').onclick = resetZoom;
$('#btn-dashboard').onclick = remoteDashboard;
$('#btn-endsol').onclick = endSol;
$('#btn-menu').onclick = showMenu;
$('#btn-journal').onclick = openJournal;
$('#btn-rooms').onclick = openRooms;
$('#tasks-toggle').onclick = () => {
  {
    if (!canUseDock()) return;
    openTaskSheet({ state: S, tasks: visibleTasks(), crisis: solDef().crisis, recommended: taskGuidance(S, visibleTasks(), solDef().crisis), navigate, endSol, journal: openJournal, rooms: openRooms });
  }
};
// Keep the compact mission card below the actual HUD, including wrapped text.
const placeTasks = () => {
  const bottom = Math.max($('#hud').getBoundingClientRect().bottom, compactTasks() ? $('#planet-clock').getBoundingClientRect().bottom : 0);
  $('#tasks').style.setProperty('--tasks-top', `${Math.ceil(bottom + 8)}px`);
  $('#camera-zoom').style.setProperty('--zoom-top', `${Math.ceil($('#planet-clock').getBoundingClientRect().bottom + 10)}px`);
  $('#camera-zoom').style.setProperty('--zoom-bottom', `${Math.ceil(window.innerHeight - $('#mission-dock').getBoundingClientRect().top + 12)}px`);
};
const taskLayoutObserver = new ResizeObserver(placeTasks);
taskLayoutObserver.observe($('#hud')); taskLayoutObserver.observe($('#planet-clock'));
taskLayoutObserver.observe($('#mission-dock'));
window.addEventListener('resize', placeTasks);
if (window.innerWidth < 900) $('#tasks').classList.add('closed');
window.addEventListener('keydown', (e) => {
  if (pauseOpen() && e.code === 'Escape' && !e.repeat) { e.preventDefault(); pauseView === 'menu' ? resume() : showMenu(); return; }
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
  if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) { setMuted(!settings.muted); toast(settings.muted ? '🔇 Sound off' : '🔊 Sound on'); if (pauseOpen()) { if (pauseView === 'settings') showSettings(); else if (pauseView === 'menu') showMenu(); } return; }
  if (e.target.closest?.('[role="button"],button,a,summary') && ['Enter', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) return;
  if (pauseOpen()) { if (e.code === 'Escape') { e.preventDefault(); resume(); } return; }
  if (tour?.active) { if (e.code === 'Escape') { e.preventDefault(); showMenu(); } return; }
  if (started && e.code === 'Escape' && !modalOpen() && !rockyOpen()) { e.preventDefault(); showMenu(); return; }
  if (rockyOpen() && e.code === 'Escape') { $('#rocky-close').click(); return; }
  if (rockyOpen() && e.code === 'ArrowLeft') { e.preventDefault(); $('#rocky-prev').click(); return; }
  if (rockyOpen() && (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight')) { e.preventDefault(); $('#rocky-next').click(); return; }
  if (!started || G.paused || overlayOpen() || modalOpen() || rockyOpen()) return;
  if (['Minus', 'NumpadSubtract', 'Equal', 'NumpadAdd', 'Digit0', 'Numpad0'].includes(e.code)) {
    e.preventDefault();
    if (e.code === 'Digit0' || e.code === 'Numpad0') resetZoom();
    else changeZoom(e.code === 'Minus' || e.code === 'NumpadSubtract' ? -.1 : .1);
    return;
  }
  if (e.code === 'KeyR') { e.preventDefault(); if (canUseDock()) hint(); return; }
  if (e.code === 'KeyV') { e.preventDefault(); togglePanorama(); return; }
  if (e.code === 'KeyC') { e.preventDefault(); remoteDashboard(); return; }
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); interact(); }
  const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
  if (n >= 0 && started) select(CREW_IDS[n]);
});

const progressObserver = new MutationObserver(scheduleDayReport);
for (const id of ['modal', 'overlay', 'rocky', 'pause']) progressObserver.observe($('#' + id), { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', scheduleDayReport);
installSpaceAtmosphere($('#game'));
installSpaceAtmosphere($('#landing'));

resetGame();
titleScreen({ intro: firstFlight.needsIntro(!!saves.read()) });
window.addEventListener('storage', e => {
  if (e.key === SAVE_KEY && started && !saveBlocked) { saveBlocked = true; showMenu(); }
});
window.addEventListener('blur', () => { if (started && !pauseOpen()) showMenu(); });
if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) window.__game = { S, change, emit, runGame, SOLS, previewReport: () => showMissionReport({ points: 10, fact: solDef().fact }) };
