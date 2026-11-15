import { h, modal, onAbort } from './ui.js';
import { solSummary } from './panels.js';
import { S } from './state.js';
import './day-report.css';

function tipFor(summary) {
  if (summary.missed.length) return `Every astronaut’s job helps the base. Try to finish all crew tasks next sol.`;
  if (S.res.power <= 30) return 'Power is getting low. Keep the solar panels clean and watch choices that cost power.';
  if (S.res.shield < 40) return 'Shielding is low, so the crew loses health at night. Extra shielding costs power, but keeps everyone safe.';
  if (S.res.food <= 30) return 'Food is running low. Lea’s greenhouse tasks grow more food every sol.';
  if (S.res.health <= 50) return 'The crew is tired. Elsa’s checkups, food and shielding help keep everyone healthy.';
  return 'Great balance, Commander! Every crew member helped Astro Base through another sol.';
}

// No timer: the next sol can begin only after the player accepts this report.
export function showDayReport(summary) {
  return new Promise(resolve => {
    let settled = false;
    const m = modal(h('h2', { class: 'day-report-title' }, `Sol ${S.sol} report`),
      h('div', { class: 'day-report-body' }, solSummary(summary, tipFor(summary))),
      h('footer', { class: 'day-report-footer' },
        h('small', {}, 'Take your time. Continue when you’re ready.'),
        h('button', { class: 'btn go', onclick: () => close(true) }, S.sol === 5 ? 'Finish the mission →' : `Start Sol ${S.sol + 1} →`)));
    m.el.classList.add('mc', 'mc-sum', 'day-report');
    const unregister = onAbort(() => close(false));
    function close(accepted) {
      if (settled) return;
      settled = true; unregister(); m.close(); resolve(accepted);
    }
  });
}
