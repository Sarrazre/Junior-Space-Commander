// Zoom is relative to the familiar crew-follow view, so it survives a resize.
export const WORLD_W = 1672;
export const WORLD_H = 941;
export const DEFAULT_ZOOM = 0.9;
export const MAX_ZOOM = 1.25;

const dimension = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

export function followScale(width, height) {
  return Math.max(dimension(width, 1150) / 1150, dimension(height, 660) / 660, 0.6);
}

export function zoomLimits(width, height) {
  const w = dimension(width, 1150), h = dimension(height, 660);
  // At the lower limit, the world still fills both axes of the viewport.
  // Fitting the entire station with margins remains the separate overview mode.
  return { min: Math.min(DEFAULT_ZOOM, Math.max(w / WORLD_W, h / WORLD_H) / followScale(w, h)), max: MAX_ZOOM };
}

export function clampZoom(value, width, height) {
  const { min, max } = zoomLimits(width, height);
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : DEFAULT_ZOOM));
}

export function cameraScale(value, width, height) {
  return followScale(width, height) * clampZoom(value, width, height);
}

// Keep the whole astronaut in the usable window, including at the world edges.
// Padding is hidden behind the fixed HUD/dock rather than forcing the crew under them.
export function followFraming(width, height, zoom, { top = 0, bottom = height, edgeY = WORLD_H - 100 } = {}) {
  const h = dimension(height, 660), scale = dimension(zoom, 1);
  const safeTop = Math.max(0, Math.min(h - 80, Number.isFinite(top) ? top : 0));
  const safeBottom = Math.max(safeTop + 80, Math.min(h, Number.isFinite(bottom) ? bottom : h));
  const topOfRig = 112 * scale, footRoom = 8 * scale;
  const lower = safeTop + topOfRig, upper = safeBottom - footRoom;
  const ideal = (safeTop + safeBottom) / 2 + 48 * scale;
  const feetY = lower <= upper ? Math.max(lower, Math.min(upper, ideal)) : upper;
  const topPadding = safeTop / scale;
  // On a short phone the playable strip can be narrower than the distance from
  // the airlock to the image edge. In that case keep the image edge behind the
  // dock, so the airlock remains visible rather than being clamped under Tasks.
  const bottomPadding = Math.max(0, Math.min((h - safeBottom) / scale, (h - feetY) / scale - (WORLD_H - edgeY)));
  return { feetY, offsetY: (feetY - h / 2) / scale, boundsY: -topPadding, boundsHeight: WORLD_H + topPadding + bottomPadding };
}
