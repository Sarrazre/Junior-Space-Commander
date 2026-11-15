import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_W, WORLD_H, DEFAULT_ZOOM, MAX_ZOOM, followScale, zoomLimits, clampZoom, cameraScale } from '../src/data/base-camera.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

for (const [name, width, height] of [
  ['small phone', 320, 568], ['phone', 390, 844], ['landscape phone', 844, 390],
  ['tablet', 768, 1024], ['laptop', 1440, 900], ['wide monitor', 2560, 1080], ['small landscape', 320, 240],
]) {
  test(`${name}: zooming out reveals more station without revealing outside the world`, () => {
    const limits = zoomLimits(width, height);
    assert.ok(limits.min > 0 && limits.min <= DEFAULT_ZOOM);
    assert.equal(limits.max, MAX_ZOOM);
    const scale = cameraScale(-100, width, height);
    assert.ok(width / scale <= WORLD_W + 1e-9);
    assert.ok(height / scale <= WORLD_H + 1e-9);
    close(scale, Math.max(width / WORLD_W, height / WORLD_H));
    assert.ok(scale < cameraScale(DEFAULT_ZOOM, width, height));
    assert.equal(clampZoom(100, width, height), MAX_ZOOM);
    close(cameraScale(100, width, height), followScale(width, height) * MAX_ZOOM);
  });
}

test('relative zoom remains stable through an orientation change when within both bounds', () => {
  const zoom = 0.85;
  assert.equal(clampZoom(zoom, 390, 844), zoom);
  assert.equal(clampZoom(zoom, 844, 390), zoom);
  close(cameraScale(zoom, 390, 844) / followScale(390, 844), zoom);
  close(cameraScale(zoom, 844, 390) / followScale(844, 390), zoom);
});

test('continuous gesture factors progress monotonically and stop at both limits', () => {
  const values = [0.001, 0.5, 0.7, 0.85, 1, 1.1, 1.25, 2, 100].map(value => cameraScale(value, 390, 844));
  assert.deepEqual([...values].sort((a, b) => a - b), values);
  assert.equal(values[0], values[1]);
  assert.equal(values.at(-1), values.at(-2));
});

test('missing viewport dimensions and invalid preferences return a usable default view', () => {
  assert.equal(followScale(), 1);
  assert.equal(clampZoom(NaN, 390, 844), DEFAULT_ZOOM);
  assert.equal(cameraScale(NaN, 0, -1), DEFAULT_ZOOM);
});

test('new missions and reset use the requested 90 percent framing', () => {
  assert.equal(DEFAULT_ZOOM, 0.9);
  close(cameraScale(DEFAULT_ZOOM, 1440, 900), followScale(1440, 900) * .9);
  close(cameraScale(DEFAULT_ZOOM, 390, 844), followScale(390, 844) * .9);
});
