// Pure policy shared by playback, asset generation, and tests.
export function voicePreferences(saved = {}) {
  return { narration: ['guided', 'request', 'off'].includes(saved.narration) ? saved.narration : saved.rocky === false ? 'off' : 'guided',
    voice: typeof saved.voice === 'number' && Number.isFinite(saved.voice) ? Math.max(0, Math.min(1, saved.voice)) : 0.8 };
}
export function normalizeSpeech(text) {
  return String(text).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/[✓✔▶◀➜⬜]/g, '')
    .replace(/\bkm\b/g, 'kilometers').replace(/\bDNA\b/g, 'D N A').replace(/−/g, ' minus ').replace(/\+/g, ' plus ').replace(/\s+/g, ' ').trim();
}
export const clipKey = (text, speaker = 'rocky') => `${speaker}|${normalizeSpeech(text)}`;
export function sentences(text) {
  if (typeof Intl.Segmenter === 'function') return [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(normalizeSpeech(text))].map(x => x.segment.trim()).filter(Boolean);
  return normalizeSpeech(text).split(/(?<=[!?])\s+|(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
}
export class ByteCache {
  constructor(limit = 32 * 1024 * 1024) { this.limit = limit; this.bytes = 0; this.entries = new Map(); }
  get(key) { const value = this.entries.get(key); if (value) { this.entries.delete(key); this.entries.set(key, value); } return value; }
  set(key, value) {
    const size = value.byteLength ?? value.length * value.numberOfChannels * 4;
    if (this.entries.has(key)) { const old = this.entries.get(key); this.bytes -= old.byteLength ?? old.length * old.numberOfChannels * 4; this.entries.delete(key); }
    if (size > this.limit) return;
    while (this.bytes + size > this.limit && this.entries.size) { const [k, v] = this.entries.entries().next().value; this.bytes -= v.byteLength ?? v.length * v.numberOfChannels * 4; this.entries.delete(k); }
    this.entries.set(key, value); this.bytes += size;
  }
}
export function createHintProgress() {
  let stage, index = -1;
  return { setStage(next) { if (stage !== next) { stage = next; index = -1; } }, next(hints) { index = Math.min(index + 1, hints.length - 1); return hints[index]; }, get index() { return index; } };
}
