// Astro Base walkable map, in pixels of public/assets/base.webp.
// The picture is only a background: everything the game needs (where you can walk,
// doors, stations) is described here, so the art can later be swapped for tiles
// without touching the game code. Open the game with ?debug=1 to see these shapes.

// Rooms: rectangles of floor you can walk on [x1, y1, x2, y2].
export const ROOMS = {
  command: [628, 300, 932, 372],
  lab: [300, 318, 566, 366],
  medbay: [1000, 318, 1272, 366],
  hub: [640, 420, 920, 640],
  engineering: [262, 556, 592, 612],
  crew: [958, 556, 1284, 612],
  air: [296, 800, 600, 852],
  storage: [652, 836, 900, 878],
  kitchen: [948, 822, 1270, 866],
  greenhouse: [1376, 540, 1640, 596],
};

// Doors/corridors: a walkable line from point a (inside room `from`) to point b (inside room `to`).
export const LINKS = [
  { from: 'command', to: 'hub', a: [780, 360], b: [780, 430], w: 34 },
  { from: 'lab', to: 'hub', a: [545, 352], b: [660, 440], w: 26 },
  { from: 'medbay', to: 'hub', a: [1018, 352], b: [900, 440], w: 26 },
  { from: 'engineering', to: 'hub', a: [580, 572], b: [655, 540], w: 28 },
  { from: 'crew', to: 'hub', a: [970, 572], b: [905, 540], w: 28 },
  { from: 'air', to: 'hub', a: [585, 812], b: [665, 625], w: 26 },
  { from: 'storage', to: 'hub', a: [775, 850], b: [775, 630], w: 30 },
  { from: 'kitchen', to: 'hub', a: [965, 834], b: [895, 625], w: 26 },
  { from: 'crew', to: 'greenhouse', a: [1272, 578], b: [1388, 574], w: 24 },
];

// Work stations: where the astronaut must stand to interact.
export const STATIONS = {
  command: { x: 780, y: 318, icon: '🖥️', label: 'Command terminal' },
  lab: { x: 470, y: 340, icon: '🔬', label: 'Science scanner' },
  medbay: { x: 1150, y: 342, icon: '🩺', label: 'Medical station' },
  generator: { x: 380, y: 584, icon: '⚡', label: 'Generator' },
  greenhouse: { x: 1500, y: 572, icon: '🌱', label: 'Greenhouse' },
  airlock: { x: 775, y: 862, icon: '🚪', label: 'Airlock' },
  kitchen: { x: 1090, y: 846, icon: '🍽️', label: 'Kitchen', info: true },
  air: { x: 450, y: 828, icon: '💧', label: 'Air & Water', info: true },
  crew: { x: 1110, y: 590, icon: '🛏️', label: 'Crew Quarters', info: true },
};

export const STARTS = { max: [470, 588], elsa: [1080, 348], charles: [380, 345], lea: [1440, 574] };
export const REACH = 62;

const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
function distToSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function walkable(x, y) {
  for (const r of Object.values(ROOMS)) if (inRect(r, x, y)) return true;
  for (const l of LINKS) if (distToSeg(x, y, l.a, l.b) <= l.w) return true;
  return false;
}

export function roomAt(x, y) {
  for (const [id, r] of Object.entries(ROOMS)) if (inRect(r, x, y)) return id;
  return null;
}

function nearestRoom(x, y) {
  let best = null, bd = Infinity;
  for (const [id, r] of Object.entries(ROOMS)) {
    const cx = Math.max(r[0], Math.min(r[2], x)), cy = Math.max(r[1], Math.min(r[3], y));
    const d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = { id, x: cx, y: cy }; }
  }
  return best;
}

/** Waypoints from (sx,sy) to (tx,ty), walking through doors. */
export function findPath(sx, sy, tx, ty) {
  let target = { x: tx, y: ty }, goal = roomAt(tx, ty);
  if (!goal) { const n = nearestRoom(tx, ty); goal = n.id; if (!walkable(tx, ty)) target = { x: n.x, y: n.y }; }
  const start = roomAt(sx, sy) || nearestRoom(sx, sy).id;
  if (start === goal) return [target];
  // Breadth-first search over rooms.
  const prev = { [start]: null }, queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === goal) break;
    for (const l of LINKS) {
      const nxt = l.from === cur ? l.to : l.to === cur ? l.from : null;
      if (nxt && !(nxt in prev)) { prev[nxt] = { room: cur, link: l }; queue.push(nxt); }
    }
  }
  const steps = [];
  for (let r = goal; prev[r]; r = prev[r].room) steps.unshift({ ...prev[r], to: r });
  const pts = [];
  for (const s of steps) {
    const forward = s.link.from === s.room;
    const [p1, p2] = forward ? [s.link.a, s.link.b] : [s.link.b, s.link.a];
    pts.push({ x: p1[0], y: p1[1] }, { x: p2[0], y: p2[1] });
  }
  pts.push(target);
  return pts;
}
