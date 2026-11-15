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

// --- Sound: all music and effects are synthesized in src/audio.js ---
import { sfx, tone, sound, settings, setVolume, setMuted } from './audio.js';
export { sfx, tone, sound };

/** Music + Effects volume sliders and a mute button (pause menu). */
export function audioControls() {
  const slider = (icon, label, key) => {
    const out = h('output', {}, Math.round(settings[key] * 100) + '%');
    const input = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(settings[key] * 100), 'aria-label': label + ' volume',
      oninput: (e) => { setVolume(key, e.target.value / 100); out.textContent = e.target.value + '%'; },
      onchange: () => { if (key === 'sfx') sfx('ok'); } });
    return h('label', { class: 'vol' }, h('span', {}, icon + ' ' + label), input, out);
  };
  const box = h('div', { class: 'vol-box' + (settings.muted ? ' muted' : '') });
  const mute = h('button', { class: 'btn small', onclick: () => {
    setMuted(!settings.muted); box.classList.toggle('muted', settings.muted);
    mute.textContent = settings.muted ? '🔇 Unmute (M)' : '🔊 Mute all (M)'; sfx('ok');
  } }, settings.muted ? '🔇 Unmute (M)' : '🔊 Mute all (M)');
  box.append(slider('🎵', 'Music', 'music'), slider('🔔', 'Effects', 'sfx'), mute);
  return box;
}

// --- Pause + abort: lets the player restart or quit from anywhere ---
/** Shared game state flags read by the base scene and the rover. */
export const G = { paused: false };
const aborters = new Set();
/** Register a silent teardown for something that is open right now. Returns an unregister function. */
export function onAbort(fn) { aborters.add(fn); return () => aborters.delete(fn); }
/** Tear down every open game screen without resolving it (used by Restart / Quit). */
export function abortAll() {
  for (const fn of [...aborters]) { try { fn(); } catch (e) { console.warn(e); } }
  aborters.clear();
  for (const id of ['#overlay', '#modal']) { const el = $(id); el.classList.add('hidden'); el.replaceChildren(); }
  $('#rocky').classList.add('hidden');
  $('#toast').replaceChildren();
}
