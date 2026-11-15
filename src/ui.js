// Small DOM + sound helpers shared by the whole game.
export const $ = (s, root = document) => root.querySelector(s);

/** h('div', { class: 'x', onclick: fn }, 'text', child) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

export const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function toast(text) {
  const d = h('div', {}, text);
  $('#toast').append(d);
  setTimeout(() => d.remove(), 3300);
}

/** Cartoon modal. Returns { el, close }. */
export function modal(...content) {
  const box = $('#modal');
  const panel = h('div', { class: 'panel' }, ...content);
  box.replaceChildren(panel);
  box.classList.remove('hidden');
  return { el: panel, close: () => { box.classList.add('hidden'); box.replaceChildren(); } };
}
export const modalOpen = () => !$('#modal').classList.contains('hidden');

// --- Sound: tiny synth beeps, no audio files needed ---
let ctx = null;
export const sound = { on: true };
const TUNES = {
  ok: [[660, 0.08], [880, 0.12]], bad: [[200, 0.18]], tap: [[520, 0.04]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.22]], alert: [[440, 0.12], [330, 0.12], [440, 0.12]],
  rocky: [[900, 0.05], [1200, 0.05], [1000, 0.07]],
};
/** One short beep at a given pitch (used by the memory and puzzle games). */
export function tone(freq, dur = 0.15) {
  if (!sound.on) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  } catch { /* sound is optional */ }
}
export function sfx(name) {
  if (!sound.on) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of TUNES[name] || TUNES.tap) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = name === 'bad' ? 'sawtooth' : 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
      t += dur;
    }
  } catch { /* sound is optional */ }
}
