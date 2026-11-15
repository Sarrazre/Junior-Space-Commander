import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBaseZoomInput } from '../src/base-zoom-input.js';
import { clampZoom, zoomLimits } from '../src/data/base-camera.js';

class Canvas extends EventTarget {
  clientHeight = 844;
  ownerDocument = { defaultView: new EventTarget() };
  setPointerCapture() {}
}

function fixture({ boundZoom = false } = {}) {
  const canvas = new Canvas(), taps = [], zooms = [];
  const state = { tapAllowed: true, zoomAllowed: true, zoom: 1 };
  const detach = attachBaseZoomInput(canvas, {
    canTap: () => state.tapAllowed,
    canZoom: () => state.zoomAllowed,
    getZoom: () => state.zoom,
    setZoom: value => {
      state.zoom = boundZoom ? clampZoom(value, 390, 844) : value;
      zooms.push(state.zoom);
    },
    tap: (x, y) => taps.push([x, y]),
  });
  function event(type, props = {}) {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, { pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 50, ...props });
    canvas.dispatchEvent(e);
    return e;
  }
  return { canvas, taps, zooms, state, event, detach };
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

test('single-finger touch activates on release and tolerates small hand movement', () => {
  const f = fixture();
  f.event('pointerdown');
  assert.deepEqual(f.taps, []);
  f.event('pointermove', { clientX: 55, clientY: 54 });
  f.event('pointerup', { clientX: 55, clientY: 54 });
  assert.deepEqual(f.taps, [[55, 54]]);
  assert.deepEqual(f.zooms, []);
});

test('single-finger drag never becomes a walk tap, even if the finger returns to its origin', () => {
  const f = fixture();
  f.event('pointerdown');
  f.event('pointermove', { clientX: 80 });
  f.event('pointermove');
  f.event('pointerup');
  assert.deepEqual(f.taps, []);
  assert.deepEqual(f.zooms, []);
});

test('release displacement still distinguishes a drag when no move event was delivered', () => {
  const f = fixture();
  f.event('pointerdown');
  f.event('pointerup', { clientX: 90 });
  assert.deepEqual(f.taps, []);
});

test('two-finger spread zooms in, closing fingers zooms out, and neither release activates a task', () => {
  const f = fixture();
  f.event('pointerdown', { pointerId: 1, clientX: 50 });
  f.event('pointerdown', { pointerId: 2, clientX: 150 });
  f.event('pointermove', { pointerId: 2, clientX: 200 });
  close(f.state.zoom, 1.5);
  f.event('pointermove', { pointerId: 2, clientX: 100 });
  close(f.state.zoom, 0.5);
  f.event('pointerup', { pointerId: 2, clientX: 100 });
  f.event('pointermove', { pointerId: 1, clientX: 51 });
  f.event('pointerup', { pointerId: 1, clientX: 51 });
  assert.deepEqual(f.taps, []);
  f.event('pointerdown');
  f.event('pointerup');
  assert.deepEqual(f.taps, [[50, 50]]);
});

for (const cancelled of ['pointercancel', 'lostpointercapture']) {
  test(`${cancelled} abandons a single-finger action`, () => {
    const f = fixture();
    f.event('pointerdown');
    f.event(cancelled);
    f.event('pointerup');
    assert.deepEqual(f.taps, []);
  });
  test(`${cancelled} during a pinch cannot activate the remaining finger on release`, () => {
    const f = fixture();
    f.event('pointerdown');
    f.event('pointerdown', { pointerId: 2, clientX: 150 });
    f.event(cancelled, { pointerId: 2, clientX: 150 });
    f.event('pointerup');
    assert.deepEqual(f.taps, []);
  });
}

test('blur abandons held gestures and a later independent tap still works', () => {
  const f = fixture();
  f.event('pointerdown');
  f.event('pointerdown', { pointerId: 2, clientX: 150 });
  f.canvas.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
  f.event('pointermove', { pointerId: 2, clientX: 250 });
  f.event('pointerup', { pointerId: 2, clientX: 250 });
  f.event('pointerup');
  assert.deepEqual(f.taps, []);
  assert.deepEqual(f.zooms, []);
  f.event('pointerdown');
  f.event('pointerup');
  assert.deepEqual(f.taps, [[50, 50]]);
});

test('blocked taps never activate, including a pause between press and release', () => {
  const f = fixture();
  f.state.tapAllowed = false;
  f.event('pointerdown');
  f.event('pointerup');
  f.state.tapAllowed = true;
  f.event('pointerdown');
  f.state.tapAllowed = false;
  f.event('pointerup');
  assert.deepEqual(f.taps, []);
});

test('blocking zoom suppresses pinch, wheel, and Safari gestures without turning a pinch into a tap', () => {
  const f = fixture();
  f.state.zoomAllowed = false;
  f.event('pointerdown');
  f.event('pointerdown', { pointerId: 2, clientX: 150 });
  f.event('pointermove', { pointerId: 2, clientX: 250 });
  const wheel = f.event('wheel', { deltaY: -120, deltaMode: 0 });
  f.event('gesturestart');
  f.event('gesturechange', { scale: 1.5 });
  f.event('pointerup', { pointerId: 2, clientX: 250 });
  f.event('pointerup');
  assert.deepEqual(f.zooms, []);
  assert.deepEqual(f.taps, []);
  assert.equal(wheel.defaultPrevented, false);
});

test('mouse and pen pointer events are left to the scene input handler', () => {
  const f = fixture();
  for (const pointerType of ['mouse', 'pen']) {
    f.event('pointerdown', { pointerType });
    f.event('pointermove', { pointerType, clientX: 100 });
    f.event('pointerup', { pointerType, clientX: 100 });
  }
  assert.deepEqual(f.taps, []);
  assert.deepEqual(f.zooms, []);
});

test('wheel zoom routes through the caller bounds and stops at the supported camera range', () => {
  const f = fixture({ boundZoom: true }), limits = zoomLimits(390, 844);
  for (let i = 0; i < 20; i++) assert.equal(f.event('wheel', { deltaY: -120, deltaMode: 0 }).defaultPrevented, true);
  assert.equal(f.state.zoom, limits.max);
  for (let i = 0; i < 20; i++) f.event('wheel', { deltaY: 120, deltaMode: 0 });
  assert.equal(f.state.zoom, limits.min);
  assert.deepEqual(f.taps, []);
});

test('line and page wheel units have the same direction as pixel scrolling', () => {
  const f = fixture();
  f.event('wheel', { deltaY: -1, deltaMode: 1 });
  assert.ok(f.state.zoom > 1);
  f.state.zoom = 1;
  f.event('wheel', { deltaY: 1, deltaMode: 2 });
  assert.ok(f.state.zoom < 1);
});

test('Safari gesture scale zooms around the scale at gesture start', () => {
  const f = fixture();
  f.event('gesturestart');
  f.event('gesturechange', { scale: 1.2 });
  close(f.state.zoom, 1.2);
  f.event('gesturechange', { scale: 0.8 });
  close(f.state.zoom, 0.8);
  assert.deepEqual(f.taps, []);
});

test('detaching stops all canvas input callbacks', () => {
  const f = fixture();
  f.event('pointerdown');
  f.detach();
  f.event('pointerup');
  f.event('pointerdown');
  f.event('pointerup');
  f.event('wheel', { deltaY: -120, deltaMode: 0 });
  assert.deepEqual(f.taps, []);
  assert.deepEqual(f.zooms, []);
});
