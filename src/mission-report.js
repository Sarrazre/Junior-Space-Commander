import { h, modal, onAbort, G } from './ui.js';
import { scene } from './art.js';
import { voiceControls } from './voice-ui.js';
import './mission-report.css';

// A readable report remains part of the journey; continuing never requires a click.
export function showMissionReport({ points, cappedAt, fact }) {
  return new Promise(resolve => {
    let held = false, finished = false, elapsed = 0, last = null, frame;
    const duration = 10000;
    const status = h('small', { class: 'mission-report-status' }, 'Returning to the base shortly…');
    const progress = h('i');
    const keep = h('button', { class: 'btn small', 'aria-pressed': 'false', onclick: () => {
      held = !held; keep.textContent = held ? 'Resume journey' : 'Keep reading';
      keep.setAttribute('aria-pressed', String(held));
      status.textContent = held ? 'Take your time. Your mission is paused.' : 'Returning to the base shortly…';
    } }, 'Keep reading');
    const m = modal(
      h('small', { class: 'report-eyebrow' }, 'SCIENCE MISSION REPORT'),
      h('h2', {}, `Mission complete · +${points} science`),
      scene(fact.art, 560, 120), h('h3', {}, fact.title), h('p', {}, fact.text),
      cappedAt && h('p', { class: 'note' }, `Today’s power conditions limited this experiment to ${cappedAt} science points.`),
      h('a', { class: 'report-source', href: fact.url, target: '_blank', rel: 'noopener' }, fact.source),
      h('div', { class: 'mission-report-actions' }, voiceControls({ text: fact.text, speaker: 'control', owner: 'mission-report', automatic: true }), keep,
        h('button', { class: 'btn go', onclick: () => close(true) }, 'Back to base →')),
      status, h('div', { class: 'mission-report-progress', 'aria-hidden': 'true' }, progress));
    m.el.classList.add('mission-report');
    const unregister = onAbort(() => close(false));
    function close(result) {
      if (finished) return;
      finished = true; cancelAnimationFrame(frame); unregister(); m.close(); resolve(result);
    }
    function tick(now) {
      if (finished) return;
      if (!m.el.isConnected) { close(false); return; }
      const delta = last === null ? 0 : Math.min(100, now - last); last = now;
      if (!held && !G.paused && !document.hidden) elapsed += delta;
      progress.style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
      if (elapsed >= duration) { close(true); return; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
}
