import { $, h, modal } from './ui.js';
import { S } from './state.js';
import { EARTH_DAY_MS, MARS_SOL_MS, clockFraction, clockLabel, nightAmount, createTeachingClock } from './data/planet-time.js';
import './environment.css';

export const atmosphere = { night: 0, storm: false };

export function createEnvironment({ storage, canOpen }) {
  const clock = createTeachingClock(storage);
  let mode = 'auto';
  try { const saved = storage.getItem('jsc-base-lighting'); if (['auto', 'day', 'night'].includes(saved)) mode = saved; } catch {}
  const earth = h('b'), mars = h('b'), weather = h('small');
  const button = h('button', { id: 'planet-clock', 'aria-label': 'Earth and Mars clocks, lighting and weather', onclick: open },
    h('span', {}, h('small', {}, '🌍 Earth · local'), earth), h('span', {}, h('small', {}, '🔴 Mars · demo'), mars), weather);
  $('#ui').append(button);
  function update() {
    const now = Date.now(), fraction = clock.fraction(now);
    earth.textContent = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    mars.textContent = clockLabel(fraction);
    atmosphere.night = mode === 'night' ? 1 : mode === 'day' ? 0 : nightAmount(fraction);
    atmosphere.storm = S.sol === 2;
    weather.textContent = `${atmosphere.night > .5 ? '☾ Night' : '☀ Day'} · ${atmosphere.storm ? 'Dust storm' : 'Light wind'} ↗`;
    button.dataset.lighting = mode;
  }
  update();
  const timer = setInterval(() => { if (!document.hidden) update(); }, 1000);
  document.addEventListener('visibilitychange', update);
  function open() {
    if (!canOpen()) return;
    const comparison = h('div', { class: 'planet-comparison', role: 'status' });
    const elapsed = h('output', { for: 'clock-demo-hours' });
    const slider = h('input', { id: 'clock-demo-hours', type: 'range', min: 0, max: 48, step: 1, value: 24, 'aria-label': 'Earth hours since both clocks started at midnight', oninput: drawComparison });
    function drawComparison() {
      const hours = Number(slider.value), delta = hours * 3_600_000;
      elapsed.textContent = `${hours} Earth hours later`;
      comparison.replaceChildren(...[['🌍 Earth', EARTH_DAY_MS, '24 hours'], ['🔴 Mars', MARS_SOL_MS, '24 h 39 min 35 sec']].map(([label, day, duration]) => {
        const fraction = clockFraction(delta, 0, day), turns = Math.floor(delta / day);
        return h('div', { class: 'planet-dial-card' }, h('div', { class: 'planet-dial', style: `--turn:${fraction * 360}deg` }, h('b', {}, clockLabel(fraction))), h('h3', {}, label), h('p', {}, `One solar day: ${duration}`), h('small', {}, `${turns} full ${label.includes('Mars') ? 'sols' : 'days'} + ${clockLabel(fraction)} into the next`));
      }));
    }
    drawComparison();
    const lighting = h('div', { class: 'lighting-options', role: 'group', 'aria-label': 'Base lighting' });
    for (const [key, label] of [['auto', 'Follow Mars clock'], ['day', '☀ Day'], ['night', '☾ Night']]) {
      lighting.append(h('button', { class: 'btn small', 'aria-pressed': mode === key, onclick: () => {
        mode = key; try { storage.setItem('jsc-base-lighting', key); } catch {}
        for (const child of lighting.children) child.setAttribute('aria-pressed', child.dataset.mode === mode);
        update();
      }, 'data-mode': key }, label));
    }
    const m = modal(h('p', { class: 'room-eyebrow' }, 'ROCKY’S FIELD NOTES'), h('h2', {}, 'Two planets. Two kinds of day.'),
      h('p', {}, 'A day on Mars is called a sol. It lasts about 40 minutes longer than an Earth day, so a 24-hour Mars clock ticks a little slower.'),
      comparison, h('label', { class: 'clock-experiment', for: 'clock-demo-hours' }, 'Try it: start both clocks at midnight, then move forward.', slider, elapsed),
      h('p', { class: 'note' }, 'The live Earth clock uses your device’s local time. Our Mars teaching clock starts beside it on your first visit, then runs at the Mars rate. It is not the time at a real Mars landing site. The slider is a separate demonstration.'),
      h('h3', {}, 'Light up Astro Base'), lighting,
      h('p', { class: 'note' }, 'Lighting is for atmosphere. It does not spend supplies or advance your mission. You choose when to end each sol.'),
      h('h3', {}, 'Wind, dust… but rain?'), h('p', {}, 'Mars has a thin atmosphere. Wind can lift its fine dust into storms. Liquid water cannot last long on the surface today, so our base gets drifting dust rather than ordinary rain. Sol 2 brings a stronger dust storm; Sol 4’s solar storm is a radiation event, not rain.'),
      h('p', { class: 'note' }, 'Weather here follows the story, not a live Mars forecast. Daylight uses a simplified 12-hour day, without seasons or a landing-site latitude.'),
      h('p', { class: 'note' }, h('a', { href: 'https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/', target: '_blank', rel: 'noopener' }, 'NASA/JPL: Mars day length'), ' · ', h('a', { href: 'https://science.nasa.gov/mars/facts/', target: '_blank', rel: 'noopener' }, 'NASA: water and weather')),
      h('div', { class: 'actions' }, h('button', { class: 'btn go', onclick: () => m.close() }, 'Back to the base')));
    m.el.classList.add('planet-panel');
  }
  return { update, destroy() { clearInterval(timer); document.removeEventListener('visibilitychange', update); button.remove(); } };
}
