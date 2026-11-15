// Max's tasks: wiring repairs, cleaning solar panels, sending the report to Earth.
import { h, shuffle } from '../ui.js';
import { cv, loop, pointerOn, rnd, rr, ink, lg, rg, label, star, TAU } from '../art.js';

const WIRES = [['#ff5a5a', '▲'], ['#ffd23f', '●'], ['#58d66b', '■'], ['#4aa8ff', '◆'], ['#c77dff', '★'], ['#ff8a3c', '✚']];
const svgEl = (tag, attrs = {}) => { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

export function wires(body, { pairs = 4, label: name = 'Generator' } = {}, api) {
  const set = shuffle(WIRES).slice(0, pairs);
  let sel = null, left = pairs, power = 0;
  const svg = svgEl('svg', { class: 'wire-svg' });
  const preview = svgEl('path', { fill: 'none', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '2 14', opacity: 0.9 });
  svg.append(preview);
  const msg = h('p', { class: 'msg' }, 'Tap a plug on the left, then its matching socket on the right.');
  const mk = (i, side) => h('button', { class: 'plug ' + side, style: `--c:${set[i][0]}`, 'data-i': i, 'data-side': side }, set[i][1]);
  const L = h('div', {}, set.map((_, i) => mk(i, 'L')));
  const R = h('div', {}, shuffle(set.map((_, i) => i)).map((i) => mk(i, 'R')));
  const lamps = h('div', { class: 'lamps' }, set.map(() => h('i')));
  // Power meter: the needle climbs as wires are connected.
  const { c: meter } = cv(170, 104, 'art plain');
  let shown = 0;
  loop(meter, (g, t, dt) => {
    shown += (power - shown) * Math.min(1, dt * 4);
    g.clearRect(0, 0, 170, 104);
    g.beginPath(); g.arc(85, 92, 74, Math.PI, 0); g.closePath(); g.fillStyle = '#0b1020'; g.fill(); ink(g, 4, '#9fb4d8');
    [['#ff5a5a', 0], ['#ffd23f', 1], ['#58d66b', 2]].forEach(([col, i]) => { g.beginPath(); g.arc(85, 92, 60, Math.PI + i * Math.PI / 3 + 0.04, Math.PI + (i + 1) * Math.PI / 3 - 0.04); g.lineWidth = 12; g.strokeStyle = col; g.lineCap = 'butt'; g.stroke(); g.lineCap = 'round'; });
    const a = Math.PI + (0.06 + shown * 0.88) * Math.PI + Math.sin(t * 17) * 0.015 * (1 + shown * 2);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(85, 92); g.lineTo(85 + Math.cos(a) * 54, 92 + Math.sin(a) * 54); g.stroke();
    g.beginPath(); g.arc(85, 92, 8, 0, TAU); g.fillStyle = '#dfe6f2'; g.fill(); ink(g, 2);
    label(g, `⚡ ${Math.round(shown * 100)}%`, 85, 66, { size: 15, col: shown > 0.95 ? '#9cffb3' : '#ffd23f', stroke: null });
  });
  const box = h('div', { class: 'wirebox' }, L, R, svg);
  const at = (el, side) => [side === 'L' ? el.offsetLeft + el.offsetWidth - 4 : el.offsetLeft + 4, el.offsetTop + el.offsetHeight / 2]; // offsets ignore the pop-in animation
  const curve = (x1, y1, x2, y2) => { const dx = Math.max(40, Math.abs(x2 - x1) * 0.45); return `M${x1} ${y1} C${x1 + dx} ${y1 + 34}, ${x2 - dx} ${y2 + 34}, ${x2} ${y2}`; };
  box.addEventListener('pointermove', (e) => {
    if (!sel) return;
    const bb = box.getBoundingClientRect(), [x1, y1] = at(sel, 'L');
    preview.setAttribute('d', curve(x1, y1, e.clientX - bb.left, e.clientY - bb.top));
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.side === 'L') { sel?.classList.remove('sel'); sel = b; b.classList.add('sel'); preview.setAttribute('stroke', set[b.dataset.i][0]); preview.setAttribute('d', ''); api.ok(); return; }
    if (!sel) { msg.textContent = 'Pick a plug on the left first.'; return; }
    if (sel.dataset.i === b.dataset.i) {
      const [x1, y1] = at(sel, 'L'), [x2, y2] = at(b, 'R'), d = curve(x1, y1, x2, y2), col = set[b.dataset.i][0];
      svg.append(svgEl('path', { d, fill: 'none', stroke: '#10152e', 'stroke-width': 15, 'stroke-linecap': 'round' }), svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': 10, 'stroke-linecap': 'round' }), svgEl('path', { d, fill: 'none', stroke: '#ffffff66', 'stroke-width': 3, 'stroke-linecap': 'round', transform: 'translate(0 -3)' }));
      const zap = h('span', { class: 'zap', style: `left:${x2}px;top:${y2}px` }); box.append(zap); api.later(() => zap.remove(), 500);
      sel.disabled = b.disabled = true; sel.classList.remove('sel'); sel = null; preview.setAttribute('d', ''); api.ok();
      lamps.children[pairs - left].classList.add('on'); left--; power = (pairs - left) / pairs;
      msg.textContent = left ? 'Connected! Power is rising.' : 'All wires connected. Full power!';
      if (left === 0) api.later(() => api.finish(`${name} wiring is safe. Engineers check their systems every day, because a small loose wire can become a big problem.`), 1100);
    } else { api.miss(); msg.textContent = 'Those do not match. Same colour AND same shape!'; }
  });
  body.replaceChildren(h('p', {}, `${name.toUpperCase()}: reconnect every wire to its matching socket.`), h('div', { class: 'row', style: 'align-items:center' }, meter, lamps), box, msg);
}

export function panels(body, params, api) {
  const W = 640, H = 340, TIME = 40;
  const { c: under } = cv(W, H); under.style.width = '100%';
  const dust = h('canvas', { width: W, height: H, style: 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:none;border-radius:12px' });
  const { c: fx } = cv(W, H, 'art plain'); Object.assign(fx.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  let finished = false, shine = 0;
  loop(under, (g, t) => {
    g.fillStyle = lg(g, 0, 0, 0, H, ['#c7532f', '#9c3a22']); g.fillRect(0, 0, W, H);
    for (let p = 0; p < 3; p++) {
      const x = 16 + p * 208, y = 18;
      rr(g, x, y, 192, 304, 10); g.fillStyle = '#dfe6f2'; g.fill(); ink(g, 4);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) { const cx = x + 8 + i * 45, cy = y + 8 + j * 41.5; rr(g, cx, cy, 41, 37.5, 4); g.fillStyle = lg(g, cx, cy, cx + 41, cy + 37, ['#3b7bea', '#173f9c', '#2460cf']); g.fill(); g.strokeStyle = '#7fb4ff44'; g.lineWidth = 1; g.strokeRect(cx + 7, cy + 7, 27, 23); }
      g.save(); rr(g, x, y, 192, 304, 10); g.clip();
      const sx = ((t * (finished ? 520 : 150) + p * 150) % 620) - 120;
      g.fillStyle = lg(g, x + sx - 60, 0, x + sx + 60, 0, ['#ffffff00', finished ? '#ffffffaa' : '#ffffff44', '#ffffff00']);
      g.beginPath(); g.moveTo(x + sx - 60, y); g.lineTo(x + sx + 20, y); g.lineTo(x + sx - 40, y + 304); g.lineTo(x + sx - 120, y + 304); g.fill(); g.restore();
    }
    if (finished) { shine += 0.02; for (let i = 0; i < 9; i++) { star(g, 60 + i * 66, 60 + ((i * 97) % 220), 9 + Math.sin(t * 6 + i) * 5, t, 4, 0.3); g.fillStyle = '#fff'; g.fill(); } }
  });
  const d = dust.getContext('2d'), r = rnd(3);
  d.fillStyle = '#d9a066'; d.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, s = 12 + r() * 46; const gr = d.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, r() > 0.5 ? '#c4854bcc' : '#eac08ecc'); gr.addColorStop(1, '#d9a06600'); d.fillStyle = gr; d.fillRect(x - s, y - s, s * 2, s * 2); }
  for (let i = 0; i < 900; i++) { d.fillStyle = r() > 0.5 ? '#b77a44' : '#f0cba0'; d.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 2); }
  d.globalCompositeOperation = 'destination-out';
  const puffs = []; let mouse = null;
  const wipe = (e) => {
    const p = pointerOn(dust, e, W); mouse = p;
    if (e.type === 'pointermove' && !e.buttons && e.pointerType === 'mouse') return;
    const gr = d.createRadialGradient(p.x, p.y, 8, p.x, p.y, 34); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = gr; d.beginPath(); d.arc(p.x, p.y, 34, 0, TAU); d.fill();
    if (Math.random() < 0.5) puffs.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 70, life: 0.7, s: 5 + Math.random() * 9 });
  };
  dust.addEventListener('pointerdown', wipe); dust.addEventListener('pointermove', wipe); dust.addEventListener('pointerleave', () => { mouse = null; });
  loop(fx, (g, t, dt) => {
    g.clearRect(0, 0, W, H);
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt; if (p.life <= 0) { puffs.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = `rgba(240,203,160,${p.life})`; g.beginPath(); g.arc(p.x, p.y, p.s * (1.6 - p.life), 0, TAU); g.fill(); }
    if (mouse && !finished) {                                                    // Max's glove with a sponge
      g.save(); g.translate(mouse.x, mouse.y); g.rotate(Math.sin(t * 10) * 0.12);
      rr(g, -22, -16, 44, 32, 9); g.fillStyle = '#ffd23f'; g.fill(); ink(g, 3); g.fillStyle = '#e0a800'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-13 + i * 7, -5 + (i % 2) * 9, 2.4, 0, TAU); g.fill(); }
      rr(g, -12, 12, 24, 22, 9); g.fillStyle = '#ff8a3c'; g.fill(); ink(g, 3);
      g.restore();
    }
  });
  const clean = h('i', { style: 'width:0%' }), air = h('i', { style: 'width:100%;background:linear-gradient(90deg,#2a8fd8,#9fe8ff)' });
  const msg = h('p', { class: 'msg' });
  let t = TIME;
  const timer = api.every(() => {
    if (finished) return;
    const px = d.getImageData(0, 0, W, H).data; let clear = 0, n = 0;
    for (let i = 3; i < px.length; i += 4 * 97) { n++; if (px[i] < 60) clear++; }
    const pct = Math.round(100 * clear / n);
    clean.style.width = pct + '%';
    t -= 0.25; air.style.width = Math.max(0, 100 * t / TIME) + '%';
    if (pct >= 90) { finished = true; d.clearRect(0, 0, W, H); clean.style.width = '100%'; msg.textContent = '✨ Sparkling clean!'; api.later(() => api.finish('The panels shine again and solar power is back to normal! Outdoor work on Mars is risky, so astronauts work quickly and carefully.', 'Mars fact: gravity on Mars is only 38% of Earth\'s. Source: NASA Mars facts.'), 1300); }
    else if (t <= 0) { api.miss(); t = TIME; msg.textContent = 'Suit air ran low! Max took a break to refill. Keep wiping!'; }
  }, 250);
  api.onCleanup(() => api.cancelTimer(timer));
  body.replaceChildren(
    h('p', {}, 'Wipe ALL the dust off the solar panels before the suit air runs out. Drag your finger or mouse!'),
    h('p', { style: 'color:#ffd23f' }, '💡 Super Jumps: Mars gravity is only 38% of Earth\'s, so Max bounces to the panels in big leaps!'),
    h('div', { style: 'position:relative' }, under, dust, fx),
    h('div', { class: 'slider' }, '✨ CLEAN', h('div', { class: 'gauge' }, clean), ''), h('div', { class: 'slider' }, '🫧 SUIT AIR', h('div', { class: 'gauge' }, air), ''), msg);
}

/** Mars on the left, Earth on the right, and the message travelling between them. `get()` returns progress 0..1. */
function signalScene(get) {
  const W = 600, H = 150, { c } = cv(W, H); c.style.width = '100%';
  const pt = (k) => [70 + k * 460, 96 - Math.sin(k * Math.PI) * 62];
  loop(c, (g, t) => {
    const p = get();
    g.fillStyle = '#050818'; g.fillRect(0, 0, W, H);
    const r = rnd(5); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * Math.abs(Math.sin(t * (0.5 + r()) + i))})`; g.fillRect(r() * W, r() * H, 1.6, 1.6); }
    g.beginPath(); g.arc(50, 104, 34, 0, TAU); g.fillStyle = rg(g, 40, 92, 4, 40, ['#ff9a5a', '#c2452d', '#7a2a18']); g.fill();
    g.strokeStyle = '#dfe6f2'; g.lineWidth = 3; g.beginPath(); g.moveTo(62, 74); g.lineTo(70, 62); g.stroke(); g.beginPath(); g.arc(74, 58, 9, 2.2, 5.3); g.stroke();
    g.beginPath(); g.arc(550, 104, 34, 0, TAU); g.fillStyle = rg(g, 540, 92, 4, 40, ['#8fd8ff', '#2a64d8', '#143a8a']); g.fill();
    g.fillStyle = '#58d66bcc'; g.beginPath(); g.ellipse(542, 98, 13, 9, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(562, 116, 8, 6, -0.4, 0, TAU); g.fill(); g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(556, 88, 14, 4, 0.2, 0, TAU); g.fill();
    label(g, 'MARS', 50, 14, { size: 13, col: '#ffb38a' }); label(g, 'EARTH', 550, 14, { size: 13, col: '#9fe8ff' });
    g.setLineDash([3, 9]); g.strokeStyle = '#5fd4ff55'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 1.001; k += 0.02) g.lineTo(...pt(k)); g.stroke(); g.setLineDash([]);
    if (p > 0) {
      g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= p; k += 0.02) g.lineTo(...pt(k)); g.stroke();
      for (let i = 0; i < 3; i++) { const k = p - i * 0.045; if (k < 0) continue; const [x, y] = pt(k); g.fillStyle = `rgba(255,210,63,${1 - i * 0.3})`; g.beginPath(); g.arc(x, y, 6 - i * 1.5, 0, TAU); g.fill(); }
      const [x, y] = pt(Math.min(1, p)); rr(g, x - 13, y - 26, 26, 17, 3); g.fillStyle = '#fff'; g.fill(); ink(g, 2); g.beginPath(); g.moveTo(x - 13, y - 26); g.lineTo(x, y - 15); g.lineTo(x + 13, y - 26); g.stroke();
    }
    for (let i = 0; i < 3; i++) { const q = ((t * 0.8 + i / 3) % 1); g.strokeStyle = `rgba(95,212,255,${(1 - q) * (p > 0 && p < 1 ? 0.9 : 0.25)})`; g.lineWidth = 2.5; g.beginPath(); g.arc(74, 58, 12 + q * 26, -1.2, 0.2); g.stroke(); }
    if (p >= 1) for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; star(g, 550 + Math.cos(a) * 48, 104 + Math.sin(a) * 40, 6, t * 2, 4, 0.3); g.fillStyle = '#ffd23f'; g.fill(); }
  });
  return c;
}

export function report(body, params, api) {
  const findings = params.discoveries?.length ? [...new Set(params.discoveries)] : ['Our crew recorded observations in the discovery cabinet.'];
  const items = shuffle([
    ...findings.map(text => [text, true]), ['🤖 Rocky told 14 robot jokes', false], ['🧦 Max lost one sock in the Airlock', false],
  ]);
  const picked = new Set();
  const msg = h('p', { class: 'msg' });
  let p = 0;
  const view = signalScene(() => p / 100);
  const cards = items.map(([text], i) => h('div', { class: 'card', style: `min-width:100%;text-align:left;animation-delay:${i * 0.06}s`, onclick: (e) => {
    picked.has(i) ? picked.delete(i) : picked.add(i); e.currentTarget.classList.toggle('sel');
  } }, text));
  const send = () => {
    const good = items.every(([, real], i) => picked.has(i) === real);
    if (!good) { api.miss(); msg.textContent = `Mission Control needs the ${findings.length} recorded science findings. Leave out the jokes!`; return; }
    api.ok();
    const bar = h('i', { style: 'width:0%' }), status = h('p', { class: 'msg' }, 'Signal leaving Mars...');
    body.replaceChildren(h('p', {}, '📡 SENDING REPORT TO EARTH'), view, h('div', { class: 'gauge', style: 'margin-top:10px' }, bar), status,
      h('p', { style: 'color:#ffd23f' }, 'A radio message takes 4 to 24 minutes to travel from Mars to Earth, depending on where the planets are. We are speeding it up!'));
    const timer = api.every(() => {
      p += 1.25; bar.style.width = p + '%';
      status.textContent = p < 50 ? `Signal travelling through space... ${Math.round(p * 0.24)} min` : p < 100 ? `Almost at Earth... ${Math.round(p * 0.24)} min` : 'Earth received the report!';
      if (p >= 100) { api.cancelTimer(timer); api.later(() => api.finish('Mission Control says: "Great work, Astro Base!" Because of the delay, Mars astronauts cannot chat live with Earth. They must solve many problems on their own.', 'Source: NASA Mars communications facts.'), 1300); }
    }, 60);
    api.onCleanup(() => api.cancelTimer(timer));
  };
  body.replaceChildren(h('p', {}, `Choose the ${findings.length} findings from YOUR discovery cabinet to send to Mission Control.`), view, h('div', { class: 'row' }, cards), msg,
    h('div', { class: 'row' }, h('button', { class: 'px-btn ok', onclick: send }, '📡 SEND REPORT')));
}
