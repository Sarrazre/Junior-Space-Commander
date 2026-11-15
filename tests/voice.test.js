import test from 'node:test';
import assert from 'node:assert/strict';
import { ByteCache, voicePreferences, normalizeSpeech, createHintProgress, clipKey } from '../src/voice-core.js';
import { createNarrator } from '../src/voice-engine.js';
import { COACHING } from '../src/data/coaching.js';
import { GREETINGS } from '../src/data/greetings.js';
import { FIRST_FLIGHT_LINES } from '../src/data/first-flight-lines.js';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function harness(extra = {}) {
  const played = [], prefs = { ...voicePreferences(), muted: false };
  let stopped = 0;
  const narrator = createNarrator({ preferences: () => prefs,
    audio: { ready: () => true, pcm: samples => samples, play(buffer) { const d = deferred(); played.push(buffer); return { ended: d.promise, stop() { stopped++; d.resolve(); }, finish: d.resolve }; } },
    manifest: async () => ({ clips: { [clipKey('first')]: { file: 'first' }, [clipKey('second')]: { file: 'second' } } }),
    fetchClip: async entry => ({ byteLength: 4, file: entry.file }), ...extra });
  return { narrator, played, prefs, get stopped() { return stopped; } };
}
test('existing Rocky-off preference migrates; voice preferences validate', () => {
  assert.equal(voicePreferences({ rocky: false }).narration, 'off');
  assert.equal(voicePreferences({ voice: NaN }).voice, 0.8);
  assert.equal(voicePreferences({ narration: 'request', rocky: false }).narration, 'request');
});
test('normalization preserves numeric content without decorative emoji', () => {
  assert.equal(normalizeSpeech('☀️ Sol 4: +10 Power, −5 Health; 22 km.'), 'Sol 4: plus 10 Power, minus 5 Health; 22 kilometers.');
});
test('hint replay is stable and new stages reset progression', () => {
  const p = createHintProgress(); p.setStage('inspect');
  assert.equal(p.next(['look', 'reason', 'act']), 'look'); assert.equal(p.index, 0);
  p.setStage('inspect'); assert.equal(p.next(['look', 'reason', 'act']), 'reason');
  p.setStage('repair'); assert.equal(p.index, -1);
  for (const mission of Object.values(COACHING)) for (const hints of Object.values(mission.stages)) assert.equal(hints.length, 3);
});
test('PCM cache evicts least recently used entries within its byte budget', () => {
  const cache = new ByteCache(8); cache.set('a', new Float32Array(1)); cache.set('b', new Float32Array(1)); cache.get('a'); cache.set('c', new Float32Array(1));
  assert.equal(cache.get('b'), undefined); assert.equal(cache.bytes, 8);
});
test('closing during download discards the eventual clip', async () => {
  const d = deferred(); const h = harness({ fetchClip: () => d.promise });
  const speaking = h.narrator.speak({ text: 'first', owner: 'screen' });
  h.narrator.stop(); d.resolve({ byteLength: 4 });
  assert.equal(await speaking, false); assert.equal(h.played.length, 0);
});
test('replacing speech stops current playback and stale completion cannot update status', async () => {
  const h = harness(); const first = h.narrator.speak({ text: 'first' });
  await new Promise(r => setImmediate(r));
  const second = h.narrator.speak({ text: 'second' });
  await new Promise(r => setImmediate(r));
  assert.equal(h.stopped, 1); assert.equal(await first, false);
  assert.equal(h.narrator.state.text, 'second'); h.narrator.stop(); await second;
});
test('on-request mode suppresses automatic speech; missing assets remain optional', async () => {
  const h = harness(); h.prefs.narration = 'request';
  assert.equal(await h.narrator.speak({ text: 'first', automatic: true }), false);
  assert.equal(await h.narrator.speak({ text: 'missing' }), false);
  assert.equal(h.narrator.state.status, 'unavailable');
});
test('legacy personalized preferences cannot enable synthesis or a model download', async () => {
  assert.equal('personalized' in voicePreferences({ personalized: true }), false);
  let generated = false;
  const h = harness({ generate: async () => { generated = true; return { audio: new Float32Array(5), sampleRate: 24000 }; } });
  h.prefs.personalized = true;
  assert.equal(await h.narrator.speak({ text: 'dynamic text with no recording' }), false);
  assert.equal(generated, false); assert.equal(h.played.length, 0);
});
test('an explicit prepared fallback still plays when the requested recording is missing', async () => {
  const h = harness();
  const speaking = h.narrator.speak({ text: 'missing', fallback: 'first' });
  await new Promise(r => setImmediate(r));
  assert.equal(h.played.length, 1); assert.equal(h.played[0].file, 'first');
  h.narrator.stop(); assert.equal(await speaking, false);
});
test('the public release contains recordings without synthesis workers or model payloads', () => {
  const root = new URL('../public/assets/voice/', import.meta.url);
  for (const path of ['worker.js', 'model.onnx', 'runtime/', 'python/', 'phonemizer/']) assert.equal(existsSync(new URL(path, root)), false, path);
  const assets = JSON.parse(readFileSync(new URL('../public/source-assets.json', import.meta.url)));
  assert.equal(assets.some(asset => /assets\/voice\/(worker\.js|model\.onnx|runtime\/|python\/|phonemizer\/)/.test(asset.path)), false);
});
test('prepared voice manifest has matching audio for every authored coaching line', () => {
  const root = new URL('../public/assets/voice/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root)));
  for (const text of FIRST_FLIGHT_LINES) assert.ok(manifest.clips[clipKey(text)], 'Missing tour recording: ' + text);
  for (const greeting of Object.values(GREETINGS)) assert.ok(manifest.clips[clipKey(greeting.text, greeting.speaker)], 'Missing homepage recording: ' + greeting.text);
  for (const entry of Object.values(manifest.clips)) {
    const bytes = readFileSync(new URL(entry.file, root));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
  for (const c of Object.values(COACHING)) {
    assert.ok(manifest.clips[clipKey(c.goal)]);
    assert.ok(manifest.clips[clipKey(c.explain, 'control')]);
    for (const line of Object.values(c.stages).flat()) assert.ok(manifest.clips[clipKey(line)], line);
  }
});
