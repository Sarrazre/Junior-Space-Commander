import { narration } from './narration.js';
import { COACHING } from './data/coaching.js';
import { createHintProgress } from './voice-core.js';
import './voice.css';
import { G } from './ui.js';
import { settings, setVoicePreference } from './audio.js';

const node = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text || ''; if (cls) e.className = cls; return e; };
const button = (text, fn) => { const b = node('button', text, 'btn small'); b.type = 'button'; b.onclick = fn; return b; };
let lastNarrationMode = settings.narration === 'off' ? 'guided' : settings.narration;
export function voiceControls({ text, speaker = 'rocky', owner, automatic = false, fallback, transcript = false }) {
  const el = node('div', '', 'voice-controls' + (transcript ? ' with-transcript' : ''));
  el.dataset.voiceOwner = owner;
  if (transcript) el.append(node('p', text, 'voice-transcript'));
  const request = { text, speaker, owner, fallback };
  const toggle = button('', () => {
    const enable = settings.narration === 'off';
    if (!enable) lastNarrationMode = settings.narration;
    setVoicePreference('narration', enable ? lastNarrationMode : 'off');
    if (enable) narration.speak(request);
  });
  toggle.className = 'voice-toggle';
  function sync() {
    const enabled = settings.narration !== 'off';
    if (enabled) lastNarrationMode = settings.narration;
    toggle.textContent = enabled ? '🔊' : '🔇';
    toggle.setAttribute('aria-label', enabled ? 'Mute narration' : 'Enable narration');
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.title = enabled ? 'Mute narration' : 'Enable narration';
  }
  sync();
  el.append(toggle);
  window.addEventListener('jsc-audio-settings', sync);
  const unsubscribe = narration.subscribe(s => el.classList.toggle('speaking', s.owner === owner && s.status === 'speaking'));
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true; unsubscribe(); window.removeEventListener('jsc-audio-settings', sync);
    if (![...document.querySelectorAll('[data-voice-owner]')].some(other => other !== el && other.dataset.voiceOwner === owner)) narration.stop(owner);
    observer.disconnect();
  };
  const observer = new MutationObserver(() => { if (!el.isConnected) dispose(); });
  queueMicrotask(async () => {
    if (disposed || !el.isConnected) { dispose(); return; }
    // Speech bubbles share their navigation row rather than growing a second panel.
    if (!transcript) {
      const bubble = el.closest('.rocky-bubble, .ld-bubble, .tour-card');
      const nav = bubble?.querySelector('.rocky-nav, .ld-nav, .tour-actions');
      if (nav) nav.prepend(el);
    }
    observer.observe(document.body, { childList: true, subtree: true });
    if (!automatic) return;
    const available = await narration.prepare(text, speaker);
    if (disposed || !el.isConnected || !available) return;
    narration.speak({ ...request, fallback: undefined, automatic: automatic !== 'requested' });
  });
  el.dispose = dispose;
  return el;
}

export function createCoach({ mission, owner, host, pause }) {
  const content = COACHING[mission];
  if (!content) return { setStage() {}, dispose() {} };
  const progress = createHintProgress();
  let stage = Object.keys(content.stages)[0], panel, previousFocus;
  progress.setStage(stage);
  const bar = node('div', '', 'coach-bar');
  function close() {
    if (!panel) return;
    narration.stop(owner); panel.remove(); panel = null; G.helpOpen = false; pause(false);
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function show(text, speaker, hint = false) {
    if (!panel) { previousFocus = document.activeElement; G.helpOpen = true; pause(true); panel = node('div', '', 'coach-help'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', hint ? 'Rocky hint' : 'Mission help'); host.append(panel); }
    panel.replaceChildren(voiceControls({ text, speaker, owner, transcript: true }));
    const actions = node('div', '', 'coach-actions');
    if (hint) actions.append(button('Next hint', () => show(progress.next(content.stages[stage]), 'rocky', true)));
    actions.append(button('Instructions', () => show(content.goal, 'rocky')), button('Science', () => show(content.explain, 'control')), button('Back to mission', close));
    panel.append(actions);
    panel.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      if (e.key === 'Tab') { const all = [...panel.querySelectorAll('button')]; const first = all[0], last = all.at(-1); if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last) { e.preventDefault(); (e.shiftKey ? last : first).focus(); } }
    };
    panel.querySelector('button').focus();
    narration.speak({ text, speaker, owner });
  }
  bar.append(button('Ask Rocky', () => show(progress.next(content.stages[stage]), 'rocky', true)));
  host.append(bar);
  narration.preload([content.goal]);
  return { setStage(next, context = '') { close(); stage = content.stages[next] ? next : stage; progress.setStage(`${stage}:${context}`); }, setVisible(visible) { if (!visible) close(); bar.hidden = !visible; }, dispose() { close(); narration.stop(owner); bar.remove(); } };
}
