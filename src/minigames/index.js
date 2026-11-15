// Mini-game shell: opens the lab terminal, runs one game, returns { done, mistakes }.
// Every game is a function (body, params, api) that builds its own screen inside `body`.
import { $, h, sfx } from '../ui.js';
import { cv, loop, star, rg, drawAstro, confetti, TAU } from '../art.js';
import { CREW } from '../data/sols.js';
import { wires, panels, report } from './engineering.js';
import { pipes, sequence, charge } from './repairs.js';
import { bones, medical } from './medical.js';
import { rocks, gravity, biosensor } from './science.js';
import { plants, harvest, greenhouse, dna } from './botany.js';
import { runRover } from '../rover.js';

const GAMES = { wires, panels, report, pipes, sequence, charge, bones, medical, rocks, gravity, biosensor, plants, harvest, greenhouse, dna };

export function runGame(id, params = {}, meta = {}) {
  if (id === 'rover') return runRover(params);
  return new Promise((resolve) => {
    const ov = $('#overlay');
    let mistakes = 0;
    const cleanups = [];
    const colour = Object.values(CREW).find((c) => c.name === meta.who)?.css || '#4aa8ff';
    const body = h('div', { class: 'term-body' });
    const close = (done) => { cleanups.forEach((f) => f()); ov.classList.add('hidden'); ov.replaceChildren(); resolve({ done, mistakes }); };
    const term = h('div', { class: 'term' },
      h('div', { class: 'term-bar' }, h('span', { class: 'leds' }, h('i'), h('i'), h('i')), h('span', { class: 'who', style: `background:${colour}` }, meta.who || ''), h('span', { class: 'title' }, meta.title || ''), h('button', { class: 'x', onclick: () => close(false) }, '✕ LEAVE')),
      body);
    ov.replaceChildren(term);
    ov.classList.remove('hidden');
    const api = {
      miss() { mistakes++; sfx('bad'); term.classList.remove('oops'); void term.offsetWidth; term.classList.add('oops'); },
      ok() { sfx('ok'); },
      onCleanup(f) { cleanups.push(f); },
      /** Show the "complete" screen with what was learned and where the science comes from. */
      finish(text, source) {
        sfx('win');
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        const { c } = cv(170, 130);
        loop(c, (g, t) => {
          g.clearRect(0, 0, 170, 130);
          g.fillStyle = rg(g, 85, 66, 6, 80, ['#ffd23f55', '#ffd23f00']); g.fillRect(0, 0, 170, 130);
          g.save(); g.translate(85, 66); g.rotate(t * 0.4); g.fillStyle = '#ffd23f22'; for (let i = 0; i < 10; i++) { g.rotate(TAU / 10); g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -80); g.lineTo(9, -80); g.fill(); } g.restore();
          for (let i = 0; i < 5; i++) { const a = t * 1.2 + i * TAU / 5; star(g, 85 + Math.cos(a) * 62, 60 + Math.sin(a) * 40, 5 + Math.sin(t * 5 + i) * 2, t + i, 4, 0.35); g.fillStyle = '#fff6c8'; g.fill(); }
          drawAstro(g, 85, 124, 1.05, colour, { t, mood: 'happy' });
        });
        body.replaceChildren(
          h('div', { class: 'row' }, c),
          h('p', { class: 'done-title' }, '✔ TASK COMPLETE'),
          h('div', { class: 'stars' }, [0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '', style: `animation-delay:${0.15 + i * 0.2}s` }, '★'))),
          h('p', { style: 'text-align:center' }, mistakes === 0 ? 'Perfect, no mistakes!' : `Mistakes: ${mistakes}. Scientists learn from mistakes too.`),
          text && h('p', {}, text),
          source && h('p', { class: 'src' }, source),
          h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: () => close(true) }, 'CONTINUE ▶')));
        confetti(term);
      },
    };
    GAMES[id](body, params, api);
  });
}

/** Ask one multiple-choice question. Wrong answers count as mistakes; resolves after the right one + Next. */
export function ask(body, api, prompt, options, { cards = false, clear = true, before = [] } = {}) {
  return new Promise((resolve) => {
    let locked = false;
    const msg = h('p', { class: 'msg' });
    const next = h('div', { class: 'row' });
    const row = h('div', { class: 'row' }, options.map((o, i) => {
      const b = h(cards ? 'div' : 'button', { class: cards ? 'card' : 'px-btn', style: `animation-delay:${i * 0.07}s`, onclick: () => {
        if (locked) return;
        if (o.correct) {
          locked = true; b.classList.add('ok'); api.ok();
          msg.textContent = '✔ ' + (o.why || 'Correct!');
          next.append(h('button', { class: 'px-btn ok', onclick: () => resolve(o) }, 'NEXT ▶'));
        } else {
          b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); api.miss();
          msg.textContent = '✖ ' + (o.why || 'Not quite. Look at the clues and try again!');
        }
      } }, o.node || null, o.big && h('span', { class: 'big' }, o.big), o.label);
      return b;
    }));
    const nodes = [...before, h('p', { class: 'q' }, prompt), row, msg, next];
    if (clear) body.replaceChildren(...nodes); else body.append(...nodes);
  });
}

export const SRC = (id, note) => `Inspired by NASA study ${id} (osdr.nasa.gov). ${note} Game scores and puzzles are invented.`;
