// Readings for the Mission Control dashboard.
// Everything here is READ from the real game state (resources, flags, tasks, today's decision).
// Nothing here changes the game. Some dials (oxygen, cabin pressure, temperature, rover charge)
// are not separate game resources: they are worked out from the four real ones with the simple
// formulas below, so they always move when the player's choices move the real numbers.
// These display formulas are proposals: tune them freely.
import { S, solDef, visibleTasks, scienceCap } from './state.js';
import { BAL } from './data/balance.js';
import { CREW } from './data/sols.js';
import { STATIONS } from './data/map.js';

const RANK = { ok: 0, info: 0, warn: 1, crit: 2 };
const level = (v, crit, warn) => (v < crit ? 'crit' : v < warn ? 'warn' : 'ok');
const worst = (list) => list.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok');
const round1 = (v) => Math.round(v * 10) / 10;

export function readTelemetry() {
  const { power, shield, food, health } = S.res, d = BAL.daily, crisis = solDef().crisis;
  const pending = visibleTasks().filter((t) => !t.done);
  const done = (id) => S.tasks.some((t) => t.id === id && t.done);
  const sick = S.sick && S.sick.sol === S.sol && !S.sick.treated ? S.sick : null;

  // --- The four real resources ---
  const sPower = level(power, BAL.lowPower + 1, 51);              // red at the real "low power" rule
  const sShield = level(shield, d.lowShieldBelow, 60);           // red where the crew loses health at night
  const sFood = level(food, d.lowFoodBelow, 51);
  const sHealth = level(health, 21, 51);

  // --- Worked-out readings (display only) ---
  const oxygen = round1(21 * (0.8 + 0.12 * power / 100 + 0.08 * food / 100));   // the air recycler needs power; plants help
  const sOxygen = level(oxygen, 18, 19.5);
  const pressure = round1(93 + shield * 0.08);                                   // hull protection keeps the cabin sealed
  let temp = 22;                                                                 // heating: Sol 3 cold night + power
  if (S.sol === 3) temp = !S.crisisDone ? 15 : ['heatL', 'heatB'].includes(S.solFlags.crisisId) ? 22 : 17;
  if (power <= BAL.lowPower) temp -= 3;
  const sTemp = temp < 16 || temp > 28 ? 'crit' : temp < 19 || temp > 25 ? 'warn' : 'ok';
  const roverUsed = S.tasks.some((t) => t.game === 'rover' && t.done);
  const fuel = roverUsed ? 30 : S.sol === 5 && !done('roverprep') ? 45 : 100;    // rover battery
  const sFuel = level(fuel, 25, 50);
  const radiation = Math.round(100 - shield);                                    // what gets past the shielding
  const life = Math.round((power + shield + food + health) / 4);                 // same average the final score uses
  const sLife = level(life, 40, 60);

  const gauges = [
    { key: 'power', label: 'Power reserves', value: power, min: 0, max: 100, unit: '%', status: sPower, zones: [[0, 20, 'crit'], [20, 50, 'warn'], [50, 100, 'ok']] },
    { key: 'oxygen', label: 'Oxygen', value: oxygen, min: 16, max: 22, unit: '%', dec: 1, status: sOxygen, zones: [[16, 18, 'crit'], [18, 19.5, 'warn'], [19.5, 22, 'ok']] },
    { key: 'pressure', label: 'Cabin pressure', value: pressure, min: 92, max: 102, unit: 'kPa', dec: 1, status: sShield, zones: [[92, 96.2, 'crit'], [96.2, 97.8, 'warn'], [97.8, 102, 'ok']] },
    { key: 'temp', label: 'Temperature', value: temp, min: 10, max: 34, unit: '°C', status: sTemp, zones: [[10, 16, 'crit'], [16, 19, 'warn'], [19, 25, 'ok'], [25, 28, 'warn'], [28, 34, 'crit']] },
  ];
  const bars = [
    { key: 'life', icon: '🫧', label: 'Life-support health', value: life, status: sLife, text: life + '%', marks: [40, 60] },
    { key: 'fuel', icon: '🔋', label: 'Rover fuel cells', value: fuel, status: sFuel, text: fuel + '%', marks: [25, 50] },
    { key: 'shield', icon: '🛡️', label: 'Shielding', value: shield, status: sShield, text: Math.round(shield) + '%', marks: [40, 60] },
    { key: 'rad', icon: '☢️', label: 'Radiation exposure', value: radiation, status: sShield, text: radiation + '%', marks: [40, 60], badHigh: true },
    { key: 'food', icon: '🥬', label: 'Food stores', value: food, status: sFood, text: Math.round(food) + '%', marks: [20, 50] },
    { key: 'health', icon: '❤️', label: 'Crew health', value: health, status: sHealth, text: Math.round(health) + '%', marks: [20, 50] },
    { key: 'science', icon: '🔬', label: 'Science collected', value: S.science * 2, status: 'info', text: `${S.science} / 50`, marks: [] },
  ];

  const sSolar = S.flags.panelsDirty ? (sPower === 'crit' ? 'crit' : 'warn') : 'ok';
  const reportWaiting = pending.some((t) => t.id === 'report');
  const lamps = [
    ['Solar array', sSolar], ['Power core', sPower], ['Air recycler', sOxygen], ['Hull seal', sShield], ['Heating', sTemp],
    ['Rad shield', sShield], ['Greenhouse', sFood], ['Medical bay', sick ? worst(['warn', sHealth]) : sHealth], ['Rover', sFuel], ['Comms to Earth', reportWaiting ? 'warn' : 'ok'],
  ].map(([name, status]) => ({ name, status }));

  // --- Alerts: what needs the commander's attention, most urgent first ---
  const alerts = [];
  const add = (lvl, icon, title, text) => alerts.push({ level: lvl, icon, title, text });
  if (!S.crisisDone) add('crit', '🚨', `Decision needed: ${crisis.title}`, 'Commander Max must choose what to do at this terminal.');
  if (sPower === 'crit') add('crit', '⚡', 'Power is critical', `Science missions are limited to ${BAL.lowPowerScienceCap} points until power is above ${BAL.lowPower}. Avoid choices that cost power.`);
  else if (sPower === 'warn') add('warn', '⚡', 'Power is getting low', 'Be careful with heating and extra shielding. Max\'s repair jobs add a little power.');
  if (S.flags.panelsDirty) add('warn', '🌪️', 'Solar panels are dusty', `They make only +${d.solarDusty} power each sol instead of +${d.solar}. ${pending.some((t) => t.game === 'panels') ? 'Max can clean them through the Airlock.' : 'Max can clean them next sol.'}`);
  if (sShield === 'crit') add('crit', '☢️', 'Shielding too low: radiation is getting in', `The crew will lose ${-d.lowShieldHealth} health tonight unless shielding is back above ${d.lowShieldBelow}.`);
  else if (sShield === 'warn') add('warn', '🛡️', 'Shielding is weakened', 'One more hit and radiation becomes dangerous.');
  if (sFood === 'crit') add('crit', '🥬', 'Food is almost gone', `The crew will lose ${-d.lowFoodHealth} health tonight. Do Lea's greenhouse task now.`);
  else if (sFood === 'warn') add('warn', '🥬', 'Food stores are shrinking', 'Lea\'s greenhouse task doubles tonight\'s harvest.');
  if (sHealth === 'crit') add('crit', '❤️', 'The crew is exhausted', 'Send Elsa to the Medical Bay for checkups right away.');
  else if (sHealth === 'warn') add('warn', '❤️', 'The crew is getting tired', 'Elsa\'s checkups bring crew health back up.');
  if (sTemp === 'crit') add('crit', '🥶', `Cabin temperature is ${temp} °C`, 'The heating cannot keep up. Decide where to send heat.');
  else if (sTemp === 'warn') add('warn', '🌡️', `Cabin temperature is ${temp} °C`, 'The living area is chilly today.');
  if (sick) add('warn', '🤒', `${sick.name} is sick`, 'Elsa can treat them in the Medical Bay (optional task).');
  if (sFuel === 'warn' && !roverUsed) add('warn', '🔋', 'Rover is not fully charged', 'Max can charge and check it at the Generator.');
  const science = pending.find((t) => t.science);
  if (science) add('warn', '🔬', `Science mission waiting: ${science.title}`, `${CREW[science.who].name} at the ${STATIONS[science.station].label}. Worth up to ${scienceCap()} points today.`);
  for (const t of pending.filter((x) => !x.science)) add('info', '📋', `${CREW[t.who].name}: ${t.title}`, `At the ${STATIONS[t.station].label}${t.optional ? ' (optional)' : ''}.`);
  if (!alerts.length) add('ok', '✅', 'All systems nominal', 'Every job is done. You can end the sol.');
  alerts.sort((a, b) => RANK[b.level] - RANK[a.level]);

  // --- What will happen tonight if nothing else changes (same rules as the end of the sol) ---
  const solar = S.flags.panelsDirty ? d.solarDusty : d.solar, tended = S.tasks.some((t) => t.tend && t.done), grow = tended ? d.harvestTended : d.harvest;
  const foodAfter = Math.max(0, Math.min(100, food + d.crewEats + grow));
  const healthDelta = (shield < d.lowShieldBelow ? d.lowShieldHealth : 0) + (foodAfter < d.lowFoodBelow ? d.lowFoodHealth : 0);
  const sign = (n) => (n > 0 ? '+' : '') + n;
  const forecast = [
    ['⚡ Power', sign(solar + d.baseSystems), solar + d.baseSystems < 0 ? 'warn' : 'ok'],
    ['🥬 Food', sign(d.crewEats + grow), d.crewEats + grow < 0 ? 'warn' : 'ok'],
    ['❤️ Crew health', sign(healthDelta), healthDelta < 0 ? 'crit' : 'ok'],
  ];

  const history = [BAL.start, ...S.log.map((l) => l.res), S.res];
  return { gauges, bars, lamps, alerts, forecast, history, overall: worst([...gauges, ...bars, ...alerts].map((x) => x.status || x.level)) };
}

// ---------- Crew health (Medical Bay dashboard) ----------
// The game has ONE real "Crew Health" number. The per-astronaut readings below are worked out
// from it plus things that really happened today: tasks done, outdoor work, sickness, shielding,
// food and power. Display only: tune freely.
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
export function readCrew() {
  const { power, shield, food, health } = S.res;
  const oxygen = 21 * (0.8 + 0.12 * power / 100 + 0.08 * food / 100);
  const crew = Object.keys(CREW).map((id, i) => {
    const mine = S.tasks.filter((t) => t.who === id), jobs = mine.filter((t) => t.done).length;
    const outside = mine.some((t) => t.done && (t.game === 'rover' || t.game === 'panels'));
    const ill = !!(S.sick && S.sick.who === id && S.sick.sol === S.sol), sick = ill && !S.sick.treated;
    const overall = clamp(health - (sick ? 20 : ill ? 8 : 0));
    const hydration = clamp(58 + food * 0.42 - jobs * 6 - (outside ? 10 : 0));
    const fatigue = clamp((100 - health) * 0.6 + jobs * 14 + (outside ? 10 : 0) + (sick ? 20 : 0));
    const radiation = clamp(100 - shield + (outside ? 10 : 0));
    const heart = Math.round(64 + i * 2 + fatigue * 0.28 + (sick ? 10 : 0));
    const spo2 = Math.round(92 + ((oxygen - 16.8) / 4.2) * 7);
    const temp = sick ? 38.2 : 36.6 + i * 0.1;
    const s = {
      overall: level(overall, 21, 51), hydration: level(hydration, 40, 60), fatigue: level(100 - fatigue, 30, 50), radiation: level(100 - radiation, 40, 60),
      heart: heart > 110 ? 'crit' : heart > 95 ? 'warn' : 'ok', spo2: level(spo2, 93, 95), temp: temp > 37.5 ? 'warn' : 'ok',
    };
    const risks = [];
    if (sick) risks.push(['warn', '🤒', `${CREW[id].name} is sick (${temp} °C)`, 'Treat them in the Medical Bay so they recover.']);
    if (s.fatigue !== 'ok') risks.push([s.fatigue, '😴', `${CREW[id].name} is very tired`, 'Tired astronauts make mistakes. Raise Crew Health with checkups, food and shielding.']);
    if (s.hydration !== 'ok') risks.push([s.hydration, '💧', `${CREW[id].name} needs more water and food`, 'Food stores are low. Lea\'s greenhouse jobs help everyone.']);
    if (s.radiation !== 'ok') risks.push([s.radiation, '☢️', `${CREW[id].name}: radiation exposure is high`, 'Shielding is weak. Keep outdoor work short and raise the shielding.']);
    if (s.spo2 !== 'ok') risks.push([s.spo2, '🫁', `${CREW[id].name}: blood oxygen is low`, 'The air recycler needs more power.']);
    return {
      id, name: CREW[id].name, role: CREW[id].role, css: CREW[id].css, sick, status: worst(Object.values(s)), risks,
      gauges: [
        { key: 'hr-' + id, label: 'Heart rate', value: heart, min: 40, max: 140, unit: 'bpm', status: s.heart, zones: [[40, 95, 'ok'], [95, 110, 'warn'], [110, 140, 'crit']] },
        { key: 'o2-' + id, label: 'Blood oxygen', value: spo2, min: 88, max: 100, unit: '%', status: s.spo2, zones: [[88, 93, 'crit'], [93, 95, 'warn'], [95, 100, 'ok']] },
      ],
      temp, tempStatus: s.temp,
      bars: [
        { key: 'ov-' + id, icon: '❤️', label: 'Overall health', value: overall, status: s.overall, text: overall + '%', marks: [20, 50] },
        { key: 'hy-' + id, icon: '💧', label: 'Hydration', value: hydration, status: s.hydration, text: hydration + '%', marks: [40, 60] },
        { key: 'fa-' + id, icon: '😴', label: 'Fatigue', value: fatigue, status: s.fatigue, text: fatigue + '%', marks: [50, 70] },
        { key: 'ra-' + id, icon: '☢️', label: 'Radiation', value: radiation, status: s.radiation, text: radiation + '%', marks: [40, 60] },
      ],
    };
  });
  const alerts = crew.flatMap((c) => c.risks).map(([lvl, icon, title, text]) => ({ level: lvl, icon, title, text })).sort((a, b) => RANK[b.level] - RANK[a.level]);
  if (!alerts.length) alerts.push({ level: 'ok', icon: '✅', title: 'No health risks found', text: 'The whole crew is in good shape. Keep checking every sol!' });
  return { crew, alerts, overall: worst(crew.map((c) => c.status)) };
}
