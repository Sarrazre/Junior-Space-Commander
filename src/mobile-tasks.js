import { h, modal, onAbort, G } from './ui.js';
import { CREW } from './data/sols.js';
import { STATIONS } from './data/map.js';
import { drawAstro } from './art.js';
import './mobile-tasks.css';

export const compactTasks = () => matchMedia('(max-width: 760px)').matches;
export function crewPortrait(who) {
  const canvas = h('canvas', { width: 96, height: 112, class: 'task-portrait', 'aria-hidden': 'true' });
  drawAstro(canvas.getContext('2d'), 48, 108, 1, CREW[who].css, { t: 1 });
  return canvas;
}

export function openTaskSheet({ state, tasks, crisis, recommended, navigate, endSol, journal, rooms }) {
  const decision = { id: 'crisis', title: crisis.title, who: 'max', station: 'command', done: state.crisisDone };
  const all = [decision, ...tasks];
  const complete = all.filter(t => t.done), pending = all.filter(t => !t.done);
  const blocked = t => Boolean((t.science && !state.crisisDone) || t.requires?.some(id => state.tasks.some(task => task.id === id && !task.done)));
  pending.sort((a, b) => Number(b.id === recommended?.id) - Number(a.id === recommended?.id) || Number(blocked(a)) - Number(blocked(b)));
  const body = h('div', { class: 'task-sheet-scroll' });
  const m = modal(h('header', { class: 'task-sheet-heading' }, h('div', {}, h('small', {}, `SOL ${state.sol} · MISSION PLAN`), h('h2', {}, 'Your crew’s tasks')), h('button', { class: 'btn small', 'aria-label': 'Close tasks', onclick: close }, '✕')),
    h('div', { class: 'task-sheet-progress' }, h('span', {}, `${complete.length} of ${all.length} completed`), h('progress', { max: all.length, value: complete.length, 'aria-label': 'Tasks completed' })), body);
  m.el.classList.add('task-sheet');
  const cleanup = () => { window.removeEventListener('keydown', escape); };
  const unregister = onAbort(cleanup);
  function close() { cleanup(); unregister(); m.close(); }
  function escape(e) { if (e.code === 'Escape' && !G.paused) { e.preventDefault(); close(); } }
  window.addEventListener('keydown', escape);
  const run = action => { close(); action(); };
  for (const t of pending) {
    const prerequisite = t.requires?.map(id => state.tasks.find(task => task.id === id)).find(task => task && !task.done);
    const locked = t.science && !state.crisisDone;
    const destination = locked ? decision : prerequisite || t;
    const priority = recommended?.id === t.id;
    const status = locked ? 'First: today’s decision' : prerequisite ? `Needs ${CREW[prerequisite.who].name}: ${prerequisite.title}` : 'Ready to start';
    body.append(h('button', { class: 'task-sheet-row' + (priority ? ' recommended' : ''), 'data-priority': priority ? recommended.label : '', onclick: () => run(() => navigate(destination.who, destination.station)) },
      crewPortrait(t.who), h('span', { class: 'task-sheet-copy' }, priority && h('small', { class: 'task-sheet-badge' }, recommended.label), h('b', {}, t.title), h('small', {}, `${CREW[t.who].name} · ${STATIONS[t.station].label}`), h('span', { class: 'task-sheet-status' }, status)), h('span', { class: 'task-sheet-arrow', 'aria-hidden': 'true' }, '→')));
  }
  if (!pending.length) body.append(h('p', {}, 'All done! Your crew is ready to rest.'));
  if (complete.length) body.append(h('details', { class: 'tasks-completed' }, h('summary', {}, `Completed · ${complete.length}`), complete.map(t => h('p', {}, '✓ ', t.title, h('small', {}, `${CREW[t.who].name} · ${STATIONS[t.station].label}`)))));
  const science = state.tasks.find(t => t.science);
  const canRest = state.crisisDone && science?.done;
  body.append(h('section', { class: 'task-sheet-rest' }, h('button', { class: 'btn go', disabled: !canRest, onclick: () => run(endSol) }, state.sol === 5 ? 'Finish the mission' : 'End the sol'),
    h('p', {}, !state.crisisDone ? 'Make today’s decision first.' : !science?.done ? 'Complete the science mission before resting.' : pending.length ? 'Other crew tasks can still help tomorrow.' : 'Your crew has completed every task.')),
    h('nav', { class: 'task-sheet-links', 'aria-label': 'Explore your mission' }, h('button', { class: 'btn small', onclick: () => run(journal) }, 'Discoveries'), h('button', { class: 'btn small', onclick: () => run(rooms) }, 'Around the base')));
}
