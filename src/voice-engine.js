import { ByteCache, clipKey } from './voice-core.js';

// Prepared recordings are optional; cancellation keeps stale audio off closed screens.
export function createNarrator({ preferences, audio, manifest, fetchClip }) {
  const cache = new ByteCache(), listeners = new Set();
  const segments = new WeakMap();
  let epoch = 0, playback, state = { status: 'idle', owner: null };
  const publish = next => { state = next; listeners.forEach(fn => fn(state)); };
  const stop = owner => {
    if (owner && state.owner !== owner) return;
    epoch++; playback?.stop(); playback = null;
    publish({ status: 'idle', owner: null });
  };
  async function prepared(text, speaker) {
    const key = clipKey(text, speaker), hit = cache.get(key);
    if (hit) return hit;
    const entry = (await manifest()).clips[key];
    if (!entry) return null;
    const buffer = await fetchClip(entry); segments.set(buffer, entry.segments || []); cache.set(key, buffer); return buffer;
  }
  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    stop,
    async prepare(text, speaker = 'rocky') { try { return !!await prepared(text, speaker); } catch { return false; } },
    async preload(lines, speaker = 'rocky') { for (const text of lines.slice(0, 4)) { try { await prepared(text, speaker); } catch {} } },
    async speak({ text, speaker = 'rocky', owner = 'dialogue', automatic = false, fallback }) {
      stop();
      const id = epoch, prefs = preferences();
      if (prefs.muted || prefs.voice === 0 || prefs.narration === 'off' || automatic && prefs.narration !== 'guided') return false;
      if (!audio.ready() && !await audio.waitUntilReady?.()) { publish({ status: 'unavailable', owner, speaker, text }); return false; }
      if (id !== epoch) return false;
      publish({ status: 'loading', owner, speaker, text });
      try {
        let buffer;
        try { buffer = await prepared(text, speaker); } catch {}
        if (id !== epoch) return false;
        const play = async (b, sentence = text) => {
          if (id !== epoch || !audio.ready()) return false;
          publish({ status: 'speaking', owner, speaker, text, sentence });
          playback = audio.play(b);
          const timers = (segments.get(b) || []).map(segment => setTimeout(() => { if (id === epoch) publish({ status: 'speaking', owner, speaker, text, sentence: segment.text }); }, segment.start * 1000));
          await playback.ended; timers.forEach(clearTimeout);
          return id === epoch;
        };
        if (buffer) { if (!await play(buffer)) return false; }
        else if (fallback) {
          buffer = await prepared(fallback, speaker);
          if (!buffer || !await play(buffer, fallback)) throw new Error('Voice unavailable');
        } else throw new Error('Voice unavailable');
        if (id !== epoch) return false;
        playback = null; publish({ status: 'done', owner, speaker, text }); return true;
      } catch {
        if (id === epoch && fallback) {
          try {
            const b = await prepared(fallback, speaker);
            if (b && id === epoch && audio.ready()) {
              publish({ status: 'speaking', owner, speaker, text, sentence: fallback });
              playback = audio.play(b); await playback.ended;
              if (id === epoch) { playback = null; publish({ status: 'done', owner, speaker, text }); return true; }
            }
          } catch {}
        }
        if (id === epoch) { playback?.stop(); playback = null; publish({ status: 'unavailable', owner, speaker, text }); }
        return false;
      }
    },
  };
}
