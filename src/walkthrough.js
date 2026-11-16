import { $, h, G, toast } from './ui.js';
import { narration } from './narration.js';
import { voiceControls } from './voice-ui.js';
import { FIRST_FLIGHT_LINES } from './data/first-flight-lines.js';

// The highlighted controls are mirrored by an accessible action button. Everything
// else is inert, so a tap cannot accidentally start a different mission mid-tour.
export function createWalkthrough({ navigate, interact, destination, arrived, onFinish }) {
  let root = null, step = 0, raf = 0, priorFocus, taskWasClosed = false, suspended = false;
  let spot, card, pointer, next, heading, text, counter, controls;
  const steps = [
    ['.res[data-res="power"]', 'Keep your base alive', FIRST_FLIGHT_LINES[0], 'Meet the crew →'],
    ['#crew', 'Four astronauts. One team.', FIRST_FLIGHT_LINES[1], 'Show my first task →'],
    ['#objective', 'Start with the highlighted task', FIRST_FLIGHT_LINES[2], 'Send Max to Command →'],
    [null, 'Follow Max to Command', FIRST_FLIGHT_LINES[3], null],
    ['#btn-interact', 'You’re here. Open the terminal!', FIRST_FLIGHT_LINES[4], 'Open Command terminal →'],
  ];
  function finish(remember = true) {
    if (!root) return;
    narration.stop(); cancelAnimationFrame(raf); root.remove(); root = null;
    $('#ui').inert = false;
    if (taskWasClosed) $('#tasks').classList.add('closed');
    if (remember) onFinish();
    if (priorFocus?.isConnected && !priorFocus.closest('.hidden')) priorFocus.focus();
  }
  function advance() {
    if (!root || suspended) return;
    if (step === 4) { finish(); interact(); return; }
    if (step === 3) return;
    step++;
    show();
    if (step === 3) navigate('max', 'command');
  }
  function show() {
    narration.stop(); controls?.remove();
    const data = steps[step];
    counter.textContent = `FIRST FLIGHT · ${step + 1} / ${steps.length}`;
    heading.textContent = data[1]; text.textContent = data[2];
    next.textContent = data[3] || 'Walking to Command…'; next.disabled = step === 3;
    spot.disabled = step < 2 || step === 3;
    spot.setAttribute('aria-label', step === 2 ? 'Send Max to Command' : step === 4 ? 'Open Command terminal' : 'Highlighted game control');
    controls = voiceControls({ text: data[2], owner: 'first-flight', automatic: true });
    text.after(controls);
    root.classList.toggle('tour-travelling', step === 3);
    layout(); next.disabled ? card.focus() : next.focus();
  }
  function layout() {
    if (!root) return;
    if (step === 3 && arrived()) { step = 4; show(); return; }
    const target = steps[step][0] ? $(steps[step][0])?.getBoundingClientRect() : destination();
    const vw = window.innerWidth, vh = window.innerHeight;
    const fallback = { left: vw / 2 - 25, top: vh / 2 - 25, width: 50, height: 50 };
    const r = target?.width ? target : fallback;
    const x = Math.max(7, Math.min(vw - 40, r.left - 6)), y = Math.max(7, Math.min(vh - 40, r.top - 6));
    const w = Math.max(32, Math.min(r.width + 12, vw - x - 7)), ht = Math.max(32, Math.min(r.height + 12, vh - y - 7));
    Object.assign(spot.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: ht + 'px' });
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 25;
    let cx, cy;
    if (vw >= 760 && x + w + gap + cw < vw - 12) { cx = x + w + gap; cy = y + ht / 2 - ch / 2; }
    else if (vw >= 760 && x - gap - cw > 12) { cx = x - gap - cw; cy = y + ht / 2 - ch / 2; }
    else { cx = x + w / 2 - cw / 2; cy = y + ht + gap + ch < vh - 12 ? y + ht + gap : y - ch - gap; }
    cx = Math.max(12, Math.min(vw - cw - 12, cx)); cy = Math.max(12, Math.min(vh - ch - 12, cy));
    Object.assign(card.style, { left: Math.round(cx) + 'px', top: Math.round(cy) + 'px' });
    // A real arrow ends on the highlighted control, rather than a floating bubble.
    const tx = x + w / 2, ty = y + ht / 2;
    const sx = Math.max(cx + 18, Math.min(cx + cw - 18, tx));
    const sy = ty < cy ? cy : ty > cy + ch ? cy + ch : cy + ch / 2;
    const ex = tx < cx ? x + w + 4 : tx > cx + cw ? x - 4 : tx;
    const ey = ty < cy ? y + ht + 4 : ty > cy + ch ? y - 4 : ty;
    pointer.setAttribute('d', `M${sx},${sy} Q${sx},${ey} ${ex},${ey}`);
  }
  function frame() { if (!root) return; if (!suspended && !document.hidden) layout(); raf = requestAnimationFrame(frame); }
  function start() {
    finish(false); priorFocus = document.activeElement;
    $('#rocky-close').click(); narration.stop();
    $('#toast').replaceChildren();
    taskWasClosed = $('#tasks').classList.contains('closed'); $('#tasks').classList.remove('closed');
    $('#tasks').scrollTop = 0; $('#ui').inert = true;
    step = 0; suspended = false;
    spot = h('button', { class: 'tour-spot', onclick: advance });
    counter = h('small', { class: 'tour-counter' }); heading = h('h2', { id: 'tour-heading' }); text = h('p');
    next = h('button', { class: 'btn go', onclick: advance });
    const face = $('#rocky .rocky-face').cloneNode(true); face.className = 'tour-rocky'; face.setAttribute('aria-hidden', 'true');
    card = h('section', { class: 'tour-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-heading', tabindex: '-1' },
      h('div', { class: 'tour-heading-row' }, face, h('div', {}, counter, heading)), text,
      h('div', { class: 'tour-actions' }, h('button', { class: 'btn small', onclick: () => { finish(); toast('Tour skipped. Replay it from the pause menu whenever you like.'); } }, 'Skip tour'), next));
    const arrow = h('div', { class: 'tour-arrow', 'aria-hidden': 'true', html: '<svg width="100%" height="100%"><defs><marker id="tour-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="none" stroke="#ffe299" stroke-width="2"/></marker></defs><path class="tour-arrow-line" fill="none" stroke="#ffe299" stroke-width="3" marker-end="url(#tour-arrowhead)"/></svg>' });
    pointer = arrow.querySelector('.tour-arrow-line');
    root = h('div', { class: 'walkthrough' }, spot, arrow, card); document.body.append(root);
    show(); frame();
  }
  return { start, stop: () => finish(false), get active() { return !!root; }, get blocking() { return !!root && step !== 3; }, suspend(value) { suspended = value; root?.classList.toggle('tour-suspended', value); if (!value && root) next.disabled ? card.focus() : next.focus(); } };
}
