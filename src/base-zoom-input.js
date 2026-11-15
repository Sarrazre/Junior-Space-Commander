// Keep multi-touch gestures separate from single-finger walk / select taps.
export function attachBaseZoomInput(canvas, { canTap, canZoom, getZoom, setZoom, tap }) {
  const fingers = new Map();
  let hadPinch = false, pinchDistance = 0, pinchZoom = 1, safariZoom = 1;
  const distance = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const clear = () => { fingers.clear(); hadPinch = false; pinchDistance = 0; };
  function down(e) {
    if (e.pointerType !== 'touch' || !canTap()) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
    canvas.setPointerCapture?.(e.pointerId);
    if (fingers.size >= 2) { hadPinch = true; pinchDistance = distance(); pinchZoom = getZoom(); }
  }
  function move(e) {
    const finger = fingers.get(e.pointerId);
    if (!finger) return;
    finger.x = e.clientX; finger.y = e.clientY;
    finger.moved ||= Math.hypot(finger.x - finger.startX, finger.y - finger.startY) > 12;
    if (fingers.size >= 2 && pinchDistance > 0 && canZoom()) {
      e.preventDefault(); setZoom(pinchZoom * distance() / pinchDistance);
    }
  }
  function up(e) {
    const finger = fingers.get(e.pointerId);
    if (!finger) return;
    fingers.delete(e.pointerId);
    const moved = finger.moved || Math.hypot(e.clientX - finger.startX, e.clientY - finger.startY) > 12;
    if (e.type === 'pointerup' && !hadPinch && !moved && canTap()) tap(e.clientX, e.clientY);
    if (fingers.size === 0) clear();
    else if (fingers.size >= 2) { pinchDistance = distance(); pinchZoom = getZoom(); }
    else pinchDistance = 0;
  }
  function wheel(e) {
    if (!canZoom()) return;
    e.preventDefault();
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1);
    setZoom(getZoom() * Math.exp(-Math.max(-120, Math.min(120, pixels)) * (e.ctrlKey ? .006 : .0015)));
  }
  function gesture(e) {
    if (!canZoom()) return;
    e.preventDefault();
    if (e.type === 'gesturestart') safariZoom = getZoom();
    else if (e.type === 'gesturechange') setZoom(safariZoom * e.scale);
  }
  const listeners = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, lostpointercapture: up, wheel, gesturestart: gesture, gesturechange: gesture, gestureend: gesture };
  for (const [type, listener] of Object.entries(listeners)) canvas.addEventListener(type, listener, { passive: false });
  const view = canvas.ownerDocument?.defaultView;
  view?.addEventListener('blur', clear);
  return () => { clear(); for (const [type, listener] of Object.entries(listeners)) canvas.removeEventListener(type, listener); view?.removeEventListener('blur', clear); };
}
