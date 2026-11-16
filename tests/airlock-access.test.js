import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIONS, STARTS, ROOMS, REACH, walkable, findPath } from '../src/data/map.js';
import { cameraScale, followFraming } from '../src/data/base-camera.js';

test('the rover airlock has a clear approach and a walking route from every crew start', () => {
  const target = STATIONS.airlock;
  assert.match(target.label, /Airlock.*Rover/);
  assert.ok(target.tapRadius >= REACH);
  assert.ok(target.y >= ROOMS.storage[1] && target.y <= ROOMS.storage[3]);
  assert.ok(walkable(target.x, target.y));
  for (const [id, start] of Object.entries(STARTS)) {
    const route = findPath(...start, target.x, target.y);
    assert.deepEqual(route.at(-1), { x: target.x, y: target.y }, id);
    assert.ok(route.every(p => walkable(p.x, p.y)), id);
  }
});

for (const [name, width, height, top, bottom] of [
  ['phone', 390, 844, 262, 613],
  ['small phone', 320, 568, 262, 337],
  ['desktop', 1440, 900, 100, 760],
]) {
  test(`${name}: bottom-edge airlock stays above the dock at every user zoom`, () => {
    for (const level of [.7, .9, 1.25]) {
      const zoom = cameraScale(level, width, height);
      const framing = followFraming(width, height, zoom, { top, bottom });
      const desired = STATIONS.airlock.y - framing.offsetY - height / (2 * zoom);
      const viewTop = Math.max(framing.boundsY, Math.min(framing.boundsY + framing.boundsHeight - height / zoom, desired));
      const feetY = (STATIONS.airlock.y - viewTop) * zoom;
      assert.ok((941 - viewTop) * zoom >= bottom - 1e-8, `${level}: terrain edge stays behind the controls`);
      assert.ok(-viewTop * zoom <= top + 1e-8, `${level}: terrain top stays behind the HUD`);
      assert.ok(feetY < bottom, `${level}: feet ${feetY} must clear ${bottom}`);
      assert.ok(feetY > top, `${level}: feet ${feetY} must stay below ${top}`);
      if (bottom - top >= 120 * zoom) assert.ok(feetY - 112 * zoom >= top - 1e-8, `${level}: crew label must clear the task card`);
    }
  });
}
