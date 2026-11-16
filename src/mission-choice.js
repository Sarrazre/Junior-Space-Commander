import { h, modal } from './ui.js';
import { cv, drawAstro, drawRover, star } from './art.js';

function illustration(mode) {
  const { c, g } = cv(440, 180, 'mission-illustration');
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', mode === 'explorer' ? 'Lea and Charles exploring a bright Mars greenhouse' : 'Max leading a rover expedition beneath the stars');
  const sky = g.createLinearGradient(0, 0, 440, 180);
  sky.addColorStop(0, mode === 'explorer' ? '#173e59' : '#171d43'); sky.addColorStop(1, mode === 'explorer' ? '#608780' : '#795668');
  g.fillStyle = sky; g.fillRect(0, 0, 440, 180);
  g.fillStyle = '#d9efff';
  for (let i = 0; i < 20; i++) { star(g, (i * 113 + 21) % 440, (i * 37 + 13) % 105, i % 5 ? 1 : 3, 0, 4); g.fill(); }
  g.fillStyle = '#bd694b'; g.beginPath(); g.moveTo(0, 145); g.quadraticCurveTo(140, 60, 300, 150); g.lineTo(440, 110); g.lineTo(440, 180); g.lineTo(0, 180); g.fill();
  if (mode === 'explorer') {
    g.fillStyle = '#76e6df44'; g.strokeStyle = '#bef5ef'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(304, 130, 94, 80, 0, Math.PI, 0); g.lineTo(398, 153); g.quadraticCurveTo(304, 183, 210, 153); g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < 5; i++) {
      const x = 246 + i * 28;
      g.strokeStyle = '#b2e784'; g.beginPath(); g.moveTo(x, 152); g.lineTo(x, 116 - i % 2 * 12); g.stroke();
      for (const side of [-1, 1]) { g.fillStyle = side < 0 ? '#91dc71' : '#5ab875'; g.beginPath(); g.ellipse(x + side * 7, 124, 13, 6, side * -.7, 0, Math.PI * 2); g.fill(); }
    }
    drawAstro(g, 119, 170, 1.15, '#58d66b', { wave: true, t: 1 }); drawAstro(g, 183, 169, .87, '#4aa8ff', { t: 2 });
  } else {
    g.strokeStyle = '#e8c59199'; g.setLineDash([5, 7]); g.beginPath(); g.moveTo(150, 170); g.quadraticCurveTo(210, 125, 390, 135); g.stroke(); g.setLineDash([]);
    drawRover(g, 285, 162, 1.1, 0); drawAstro(g, 118, 172, 1.2, '#ff8a3c', { wave: true, t: 1 });
    g.strokeStyle = '#e8ebf9'; g.lineWidth = 3; g.beginPath(); g.moveTo(372, 60); g.lineTo(372, 132); g.stroke();
    g.fillStyle = '#edba62'; g.beginPath(); g.moveTo(373, 61); g.lineTo(410, 68); g.lineTo(373, 81); g.fill();
  }
  return c;
}

export function chooseMissionCard({ hasSave, guided, onStart, onBack }) {
  let selected = 'explorer';
  const toggle = h('input', { type: 'checkbox', checked: guided });
  const launch = h('button', { class: 'btn go mission-launch', onclick: () => { m.close(); onStart(selected, toggle.checked); } }, 'Start Beginner →');
  const cards = [];
  const grid = h('div', { class: 'mission-options', role: 'group', 'aria-label': 'Mission difficulty', 'aria-describedby': 'mission-score-note' });
  for (const [mode, name, level, supplies, scoring] of [
    ['explorer', 'Beginner', 1, 'More starting supplies', 'Mistakes don’t lower science points.'],
    ['commander', 'Advanced', 3, 'Fewer starting supplies', 'Mistakes lower science points.'],
  ]) {
    const art = illustration(mode);
    art.setAttribute('aria-hidden', 'true');
    const card = h('button', { class: `mission-option ${mode}`, type: 'button', 'aria-pressed': mode === selected, onclick: () => {
      selected = mode;
      cards.forEach(([key, el]) => el.setAttribute('aria-pressed', String(key === mode)));
      launch.textContent = `Start ${name} →`;
    } }, art, h('span', { class: 'mission-option-body' },
      h('span', { class: 'mission-mode-top' }, h('strong', { class: 'mission-mode-name' }, name), h('span', { class: 'mission-check', 'aria-hidden': 'true' }, '✓')),
      h('span', { class: 'mission-difficulty', role: 'img', 'aria-label': `Difficulty: ${level} of 3 stars` }, h('span', { 'aria-hidden': 'true' }, level === 1 ? '★☆☆' : '★★★'), h('small', { 'aria-hidden': 'true' }, level === 1 ? 'Gentle' : 'Challenging')),
      h('span', { class: 'mission-feature' }, supplies),
      h('span', { class: 'mission-feature' }, scoring)));
    cards.push([mode, card]); grid.append(card);
  }
  const m = modal(h('header', { class: 'mission-heading' }, h('h2', {}, 'Choose your difficulty'), h('p', {}, 'Same 5 sols. Two levels of challenge.')),
    h('div', { class: 'mission-picker-body' }, grid,
      h('p', { id: 'mission-score-note', class: 'mission-shared' }, 'Power and choices can limit points in both modes.'),
      h('label', { class: 'mission-tour-choice' }, toggle, h('span', {}, 'Guide me with Rocky')),
      hasSave && h('p', { class: 'mission-save-note' }, 'Starting a new mission replaces your saved progress.')),
    h('footer', { class: 'actions mission-actions' }, h('button', { class: 'btn', onclick: () => { m.close(); onBack(); } }, '← Back'), launch));
  m.el.classList.add('mission-picker');
}
