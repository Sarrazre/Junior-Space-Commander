import { h, G } from '../ui.js';
import '../greenhouse.css';

const POD = `${import.meta.env.BASE_URL}assets/greenhouse/lettuce-pod.png`;
const WILTED_POD = `${import.meta.env.BASE_URL}assets/greenhouse/lettuce-wilted.png`;
const FACTS = [
  { id: 'leaf', icon: '🌿', title: 'Inspect the leaves', finding: 'The test plant is drooping. The reference plant stands upright.' },
  { id: 'root', icon: '💧', title: 'Check the water', finding: 'The supply tank is full, but the test tray is dry. Its connector is loose.' },
  { id: 'lamp', icon: '☀️', title: 'Compare the light', finding: 'Both plants have the same working grow light. Only the test plant is struggling.' },
];
const TOOLS = [
  { id: 'connector', title: 'Flow connector', subtitle: 'Reconnect the tray to its water supply', icon: 'connector' },
  { id: 'lamp', title: 'Extra grow light', subtitle: 'Add more light above the leaves', icon: 'lamp' },
  { id: 'nutrients', title: 'Nutrient pack', subtitle: 'Change the plant food in the tank', icon: 'nutrients' },
];

function toolIcon(kind) {
  const shapes = {
    connector: '<path d="M12 51h20V29h22v22h14" fill="none" stroke="#153050" stroke-width="19" stroke-linejoin="round"/><path d="M12 51h20V29h22v22h14" fill="none" stroke="#c8f6ff" stroke-width="12" stroke-linejoin="round"/><path d="M32 43V29h22v14" fill="none" stroke="#4ed8ef" stroke-width="5"/><path d="M13 40v22M67 40v22" stroke="#ffc45b" stroke-width="8"/>',
    lamp: '<path d="M21 20h38l7 19H14z" fill="#d8e8ee" stroke="#153050" stroke-width="4"/><path d="M22 42h36" stroke="#ffd770" stroke-width="6"/><path d="M25 51l-5 14m20-14v16m15-16 5 14" stroke="#ffd770" stroke-width="4" stroke-linecap="round"/>',
    nutrients: '<path d="M22 17h36l5 48H17z" fill="#d8e8ee" stroke="#153050" stroke-width="4"/><path d="M23 29h34v27H23z" fill="#23936b"/><path d="M40 50V35m0 9c-12-1-12-9-12-9 10 0 12 9 12 9m0-4c10-1 11-9 11-9-10 1-11 9-11 9" fill="none" stroke="#d4ffb7" stroke-width="3"/>',
  };
  return h('span', { class: 'gh-tool-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 80 80" fill="none">${shapes[kind]}</svg>` });
}

/** A self-contained experiment. It owns no global rewards or persistent state. */
export function greenhouseRescue(body, params, api) {
  let alive = true, selected = null, phase = 0, recovering = false;
  let ghost = null, releaseDrag = null;
  const inspected = new Set();
  const root = h('section', { class: 'gh-rescue', 'aria-label': 'Greenhouse rescue experiment' });
  const message = h('p', { class: 'gh-message', role: 'status', 'aria-live': 'polite' });
  const content = h('div');
  const steps = h('ol', { class: 'gh-steps', 'aria-label': 'Experiment progress' }, ['Inspect', 'Repair', 'Verify'].map((text, i) => h('li', {}, h('span', {}, String(i + 1)), text)));
  const heading = h('h2', { tabindex: '-1' });
  root.append(h('p', { class: 'gh-eyebrow' }, 'LEA’S FIELD LAB · SOL 3'), heading, steps, content, message,
    h('p', { class: 'gh-disclaimer' }, 'A simplified plant-care experiment. Readings and the time-lapse are invented for this game.'));
  body.replaceChildren(root);

  function announce(text) { message.textContent = text; }
  function advance(index, title) {
    api.setCoachStage?.(['inspect', 'repair', 'verify'][index]);
    selected = null; phase = index; heading.textContent = title;
    [...steps.children].forEach((step, i) => { step.classList.toggle('current', i === index); step.classList.toggle('complete', i < index); if (i === index) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current'); });
    heading.focus({ preventScroll: true });
    announce('');
  }
  function pod(stressed = false, alt = '') {
    return h('span', { class: 'gh-pod' + (stressed ? ' stressed' : ''), role: 'img', 'aria-label': alt },
      h('img', { src: WILTED_POD, alt: '', draggable: 'false', class: 'gh-leaf-state gh-leaf-wilted', width: '240', height: '240' }),
      h('img', { src: POD, alt: '', draggable: 'false', class: 'gh-leaf-state gh-leaf-healthy', width: '240', height: '240' }));
  }
  function specimen(label, stressed, detail) {
    return h('figure', { class: 'gh-specimen' }, pod(stressed, stressed ? 'Drooping test plant in its hydroponic pod' : 'Upright green plant in its hydroponic pod'), h('figcaption', {}, h('b', {}, label), h('span', {}, detail)));
  }
  function comparison(restored = false) {
    return h('div', { class: 'gh-comparison' }, specimen('TEST PLANT', !restored, restored ? 'Leaves upright · water flowing' : 'Drooping leaves · dry tray'),
      specimen('REFERENCE PLANT', false, 'Unchanged · water flowing'));
  }
  function select(id, button) {
    if (!alive || G.paused) return;
    selected = id;
    root.querySelectorAll('[data-gh-item]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    announce(`${button.dataset.itemName} selected. Choose its destination, or drag it there.`);
  }
  function clearGhost() {
    ghost?.remove(); ghost = null;
    root.querySelectorAll('.gh-drop-ready').forEach(el => el.classList.remove('gh-drop-ready'));
  }
  // Pointer capture supports mouse, pen and touch. The same action is available
  // with native buttons: select the item, then activate its destination.
  function draggableItem(id, name, art, onPlace) {
    const button = h('button', { type: 'button', class: 'gh-item', 'aria-pressed': 'false', 'data-gh-item': id, 'data-item-name': name }, art, h('b', {}, name), h('small', {}, 'Drag or select'));
    let drag = null, suppressClick = false;
    button.addEventListener('click', () => { if (suppressClick) { suppressClick = false; return; } select(id, button); });
    button.addEventListener('pointerdown', e => {
      if (e.button !== 0 || G.paused || !alive) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moving: false };
      button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId || G.paused) return;
      if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
        drag.moving = true; select(id, button);
        ghost = art.cloneNode(true); ghost.classList.add('gh-drag-ghost'); ghost.setAttribute('aria-hidden', 'true'); document.body.append(ghost);
      }
      if (ghost) {
        ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-gh-slot]');
        root.querySelectorAll('[data-gh-slot]').forEach(el => el.classList.toggle('gh-drop-ready', el === target));
      }
    });
    const endDrag = e => {
      if (!drag || (e && drag.id !== e.pointerId)) return;
      const current = drag; drag = null;
      if (button.hasPointerCapture(current.id)) button.releasePointerCapture(current.id);
      if (current.moving) {
        suppressClick = true;
        const target = e?.type === 'pointerup' && document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-gh-slot]');
        if (alive && !G.paused && target && root.contains(target)) onPlace(id, target.dataset.ghSlot);
        else if (alive) announce(`${name} returned to the bench. Select it, then choose a destination to try again.`);
      }
      clearGhost();
    };
    button.addEventListener('pointerup', endDrag);
    button.addEventListener('pointercancel', endDrag);
    button.addEventListener('lostpointercapture', () => { if (drag) { drag = null; clearGhost(); } });
    releaseDrag = endDrag;
    return button;
  }
  api.onCleanup(() => { alive = false; releaseDrag?.(); clearGhost(); });

  function inspectBench() {
    advance(0, 'A small plant. A big clue.');
    api.setCoachStage?.('dock');
    const place = (item, slot) => {
      if (!alive || G.paused) return;
      if (item === 'specimen' && slot === 'scanner') {
        if (recovering) return;
        recovering = true; api.ok(); dock.classList.add('gh-seated'); dock.replaceChildren(pod(true, 'Test plant placed in the observation dock'), h('b', {}, 'Specimen seated'));
        content.querySelector('[data-gh-item="specimen"]').disabled = true;
        api.later(() => { recovering = false; inspectEvidence(); }, 220);
      }
      else announce('Select the test plant first, then choose the observation dock.');
    };
    const item = draggableItem('specimen', 'Test plant', pod(true, 'Test plant with drooping leaves'), place);
    const dock = h('button', { type: 'button', class: 'gh-dock', 'data-gh-slot': 'scanner', onclick: () => place(selected, 'scanner') }, h('span', { 'aria-hidden': 'true' }, '⌖'), h('b', {}, 'Observation dock'), h('small', {}, 'Place the test plant here'));
    content.replaceChildren(h('p', { class: 'gh-lead' }, 'Max restored the main water pipes, but one lettuce plant still looks unhappy. Bring it to your bench to find out why.'), h('div', { class: 'gh-workbench' }, item, dock), h('p', { class: 'gh-help' }, 'Drag the plant to the dock — or select the plant, then select the dock. Keyboard: Tab, then Enter.'));
  }
  function inspectEvidence() {
    announce('Specimen docked. Inspect the leaves, water supply and light.');
    api.setCoachStage?.('inspect');
    selected = null;
    const evidence = h('div', { class: 'gh-evidence' });
    const next = h('button', { type: 'button', class: 'gh-primary', disabled: true, onclick: chooseHypothesis }, 'Gather all 3 clues');
    const controls = FACTS.map(fact => {
      const button = h('button', { type: 'button', class: 'gh-inspect', onclick: () => {
        if (G.paused || inspected.has(fact.id)) return;
        inspected.add(fact.id); api.ok(); button.textContent = `✓ ${fact.title}`; button.setAttribute('aria-pressed', 'true');
        evidence.append(h('p', {}, h('b', {}, fact.icon + ' '), fact.finding));
        announce(fact.finding);
        if (inspected.size === FACTS.length) { next.disabled = false; next.textContent = 'Make a hypothesis →'; }
      }, 'aria-pressed': 'false' }, fact.icon + ' ' + fact.title);
      return button;
    });
    content.replaceChildren(comparison(), h('p', { class: 'gh-lead' }, 'Compare the test plant with the reference plant. Collect all three clues before choosing a repair.'), h('div', { class: 'gh-inspect-row' }, controls), evidence, next);
    controls[0].focus({ preventScroll: true });
  }
  function chooseHypothesis() {
    if (!alive || G.paused || inspected.size !== FACTS.length) return;
    advance(1, 'What explains the evidence?');
    api.setCoachStage?.('hypothesis');
    content.replaceChildren(h('div', { class: 'gh-evidence' }, FACTS.map(f => h('p', {}, f.finding))),
      h('p', { class: 'gh-lead' }, 'Pick an idea to test. You can revise your idea after reading the clues.'),
      h('div', { class: 'gh-choices' }, [
        ['Water cannot reach the test tray', 'The tank is full but the tray is dry. A disconnected supply fits all the clues.', true],
        ['Both plants need stronger lights', 'The reference plant has the same light and is healthy. Look for something different about the test tray.', false],
        ['The plants need more plant food', 'We have not found evidence about missing nutrients. First investigate the loose connector and dry tray.', false],
      ].map(([title, explanation, correct]) => h('button', { type: 'button', class: 'gh-choice', onclick: () => {
        if (!alive || G.paused) return;
        if (correct) { api.ok(); repairBench(); } else announce(explanation);
      } }, title))));
  }
  function repairBench() {
    advance(1, 'Change one thing. Test your idea.');
    const place = (item, slot) => {
      if (!alive || G.paused || recovering) return;
      if (!item) return announce('Choose a tool first, then choose the tray’s water inlet.');
      if (item !== 'connector' || slot !== 'inlet') return announce('That tool is back on the bench. The light works and the supply is full — reconnect the dry tray to the water first.');
      recovering = true; api.ok(); selected = null; showRecovery();
    };
    const tools = TOOLS.map(tool => draggableItem(tool.id, tool.title, toolIcon(tool.icon), place));
    const inlet = h('button', { type: 'button', class: 'gh-dock', 'data-gh-slot': 'inlet', onclick: () => place(selected, 'inlet') }, h('span', { 'aria-hidden': 'true' }, '💧'), h('b', {}, 'Tray water inlet'), h('small', {}, 'A connector is missing'));
    content.replaceChildren(h('p', { class: 'gh-lead' }, 'Leave the light and plant food unchanged. Choose the tool that tests your water-supply idea.'), h('div', { class: 'gh-repair-view' }, specimen('TEST PLANT', true, 'Dry tray · water disconnected'), inlet), h('div', { class: 'gh-tools' }, tools), h('p', { class: 'gh-help' }, 'Drag a tool onto the water inlet, or select the tool and then the inlet. A wrong tool always returns safely.'));
  }
  function showRecovery() {
    announce('Connector seated. Watch the model’s water flow and compare the plants.');
    const progress = h('progress', { max: '100', value: '0', 'aria-label': 'Simulated recovery observation' });
    const view = comparison();
    view.querySelector('figcaption span').textContent = 'Water reconnected · observing leaves';
    const status = h('p', { class: 'gh-time-label' }, 'WATER CONNECTED · STARTING TIME-LAPSE');
    const water = h('i');
    const reading = h('b', {}, '0%');
    const flow = h('div', { class: 'gh-flow-system', role: 'status' },
      h('span', { class: 'gh-flow-connector', 'aria-hidden': 'true' }, toolIcon('connector')),
      h('div', {}, h('small', {}, 'CONNECTOR SEATED · WATER REACHING ROOTS'), h('div', { class: 'gh-flow-pipe', 'aria-hidden': 'true' }, water)), reading);
    content.replaceChildren(flow, view, status, progress, h('p', { class: 'gh-lead' }, 'The tray is receiving water again. We are fast-forwarding our model to observe the plant’s response. Real plant recovery is not instant.'));
    let amount = 0;
    const timer = api.every(() => {
      if (!alive) return;
      amount = Math.min(100, amount + 10); progress.value = amount;
      water.style.transform = `scaleX(${amount / 100})`; reading.textContent = `${amount}%`;
      if (amount >= 50) { const plant = view.querySelector('.gh-pod'); plant.classList.remove('stressed'); plant.setAttribute('aria-label', 'Test plant recovering with leaves upright'); view.querySelector('figcaption span').textContent = 'Leaves recovering · water flowing'; status.textContent = 'SIMULATED TIME-LAPSE · LEAVES RECOVERING'; }
      if (amount === 100) { api.cancelTimer(timer); verifyResult(); }
    }, 200);
  }
  function verifyResult() {
    if (!alive) return;
    advance(2, 'Did our change help?');
    content.replaceChildren(comparison(true), h('div', { class: 'gh-result-grid' }, h('p', {}, h('b', {}, 'Before'), 'Dry tray · drooping leaves'), h('p', {}, h('b', {}, 'After'), 'Water flowing · leaves upright')),
      h('p', { class: 'gh-lead' }, 'The test plant recovered in our model. The reference plant stayed healthy. What can we conclude?'),
      h('div', { class: 'gh-choices' }, [
        ['Restoring the water supply helped this plant', true, ''],
        ['Every unhappy plant needs extra water', false, 'This experiment tested one dry tray. Another plant might have too much water, too little light, or another problem. Inspect it first.'],
        ['Changing every control at once is the best test', false, 'If we change everything at once, we cannot tell which change helped. We changed one thing and compared the result.'],
      ].map(([text, correct, explanation]) => h('button', { type: 'button', class: 'gh-choice', onclick: () => {
        if (!alive || G.paused) return;
        if (!correct) { api.miss(); announce(explanation); return; }
        api.ok(); finishExperiment();
      } }, text))));
  }
  function finishExperiment() {
    if (!alive) return;
    content.replaceChildren(comparison(true), h('p', { class: 'gh-success' }, '✓ GREENHOUSE RESCUED'),
      h('p', { class: 'gh-lead' }, 'Max restored the main supply. Lea found the loose tray connection. Together, the crew brought the greenhouse back to life.'),
      h('div', { class: 'gh-evidence' }, h('b', {}, 'FIELD JOURNAL · HOW TO TEST AN IDEA'), h('p', {}, 'Observe → compare → change one thing → check the result.'), h('p', {}, 'A healthy reference plant helped us separate a water problem from a lighting problem.')),
      h('button', { type: 'button', class: 'gh-primary', onclick: () => {
        if (!alive || G.paused) return;
        api.finish('You followed the evidence, restored the water connection and checked the result against a reference plant. Good scientists test an idea before deciding it explains the problem.', 'Inspired by plant-growing experiments and the CSA Food Production toolkit. This lettuce rescue, readings and recovery time-lapse are a teaching model, not NASA measurements.');
      } }, 'Record discovery →'));
    announce('Greenhouse rescued. Record the discovery to finish the task.');
    content.querySelector('button').focus({ preventScroll: true });
  }

  inspectBench();
}
