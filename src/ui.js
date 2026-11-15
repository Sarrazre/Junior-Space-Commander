// Small DOM + sound helpers shared by the whole game.
export const $ = (s, root = document) => root.querySelector(s);

/** h('div', { class: 'x', onclick: fn }, 'text', child) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  if (tag === 'div' && attrs.onclick) {
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.addEventListener('keydown', (e) => {
      if (e.target === el && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); e.stopPropagation(); el.click();
      }
    });
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
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
  narration.stop();
  const box = $('#modal');
  const previous = document.activeElement;
  const panel = h('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, ...content);
  const heading = panel.querySelector('h2');
  if (heading) { heading.id = 'dialog-title'; panel.setAttribute('aria-labelledby', heading.id); }
  box.replaceChildren(panel);
  box.classList.remove('hidden');
  queueMicrotask(() => { if (panel.isConnected) panel.focus(); });
  return { el: panel, close: () => { if (!panel.isConnected) return; narration.stop(); box.classList.add('hidden'); box.replaceChildren(); if (previous?.isConnected) previous.focus(); } };
}
export const modalOpen = () => !$('#modal').classList.contains('hidden');

// --- Sound: all music and effects are synthesized in src/audio.js ---
import { sfx, tone, sound, settings, setVolume, setMuted, setAudioPreference } from './audio.js';
import { setVoicePreference } from './audio.js';
import { narration } from './narration.js';
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
  box.append(slider('🎵', 'Music', 'music'), slider('🔔', 'Effects', 'sfx'), slider('🗣', 'Voice', 'voice'), mute);
  for (const [key, label] of [['quietAlerts', 'Quieter alerts']]) box.append(h('label', {}, h('input', { type: 'checkbox', checked: settings[key], onchange: e => setAudioPreference(key, e.target.checked) }), ' ' + label));
  const mode = h('select', { 'aria-label': 'Narration', onchange: e => { narration.stop(); setVoicePreference('narration', e.target.value); } },
    [['guided', 'Guided companion'], ['request', 'On request'], ['off', 'Off']].map(([value, label]) => h('option', { value, selected: settings.narration === value }, label)));
  box.append(h('div', { class: 'voice-settings' }, h('label', {}, 'Narration ', mode)));
  return box;
}

// --- Pause + abort: lets the player restart or quit from anywhere ---
/** Shared game state flags read by the base scene and the rover. */
const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
// Retired graphics preferences never leave returning players in an old fallback mode.
export const G = { paused: false, reducedMotion: motionPreference?.matches ?? false, lowGraphics: false, instrumentMode: false };
motionPreference?.addEventListener?.('change', event => {
  G.reducedMotion = event.matches;
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('reduce-motion', event.matches);
});
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('reduce-motion', G.reducedMotion);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const pauseLayer = document.getElementById('pause');
    const layer = pauseLayer && !pauseLayer.classList.contains('hidden') ? pauseLayer : document.querySelector('.walkthrough:not(.tour-suspended), .coach-help') || ['modal','overlay','rocky','rover'].map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
    if (!layer) return;
    const elements = [...layer.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!elements.length) return;
    const first = elements[0], last = elements.at(-1), current = document.activeElement;
    if (!layer.contains(current) || e.shiftKey && (current === first || !elements.includes(current))) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (!e.shiftKey && (current === last || !elements.includes(current))) { e.preventDefault(); first.focus(); }
  }, true);
}
const aborters = new Set();
/** Register a silent teardown for something that is open right now. Returns an unregister function. */
export function onAbort(fn) { aborters.add(fn); return () => aborters.delete(fn); }
/** Tear down every open game screen without resolving it (used by Restart / Quit). */
export function abortAll() {
  narration.stop();
  for (const fn of [...aborters]) { try { fn(); } catch (e) { console.warn(e); } }
  aborters.clear();
  for (const id of ['#overlay', '#modal']) { const el = $(id); el.classList.add('hidden'); el.replaceChildren(); }
  $('#rocky').classList.add('hidden');
  $('#toast').replaceChildren();
}
