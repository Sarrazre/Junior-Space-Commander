import { settings, speechAudio } from './audio.js';
import { createNarrator } from './voice-engine.js';
const BASE = `${import.meta.env.BASE_URL}assets/voice/`;
let manifestPromise;
const manifest = () => manifestPromise ||= fetch(BASE + 'manifest.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error('Missing voice manifest'); return r.json(); }).catch(e => { manifestPromise = null; throw e; });
export const narration = createNarrator({ preferences: () => settings, audio: speechAudio, manifest,
  fetchClip: async entry => { const r = await fetch(BASE + entry.file + '?v=' + entry.sha256, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw Error('Missing clip'); return speechAudio.decode(await r.arrayBuffer()); },
});
window.addEventListener('jsc-audio-settings', () => { if (settings.muted || settings.narration === 'off' || settings.voice === 0) narration.stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) narration.stop(); });
