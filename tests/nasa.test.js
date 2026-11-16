import test from 'node:test';
import assert from 'node:assert/strict';

test('space weather labels the strongest valid response as live', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => [
    { classType: 'M8.2', peakTime: '2026-11-01T10:00Z' },
    { classType: 'X2.1', peakTime: '2026-11-03T12:00Z', activeRegionNum: 12345 },
  ] }));
  const { getFlare } = await import('../src/nasa.js?live-test');
  const flare = await getFlare();
  assert.equal(flare.live, true); assert.equal(flare.classType, 'X2.1');
  assert.equal(flare.date, '3 November 2026');
});

test('unavailable or malformed NASA data is labelled as a historical example', async t => {
  for (const [name, json] of [['invalid', [{ classType: 'broken', peakTime: 'bad date' }]], ['empty', []]]) {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => json }));
    const { getFlare } = await import(`../src/nasa.js?${name}-test`);
    const flare = await getFlare();
    assert.equal(flare.live, false); assert.equal(flare.classType, 'X8.7');
  }
});

test('slow NASA requests abort after five seconds and safely fall back', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const { getFlare } = await import('../src/nasa.js?timeout-test');
  const pending = getFlare();
  t.mock.timers.tick(5000);
  assert.equal((await pending).live, false);
});
