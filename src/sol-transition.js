import { h, modal, onAbort, G, sfx } from './ui.js';
import './sol-transition.css';

const stars = () => Array.from({ length: 36 }, (_, i) => h('i', {
  class: 'space-star',
  style: `left:${(i * 73 + 11) % 100}%;top:${(i * 41 + 7) % 100}%;width:${i % 4 === 0 ? 3 : 2}px;height:${i % 4 === 0 ? 3 : 2}px;animation-delay:${-(i % 7)}s;animation-duration:${3 + i % 5}s`,
}));

/** Decorative atmosphere only: place it in a positioned landing/space scene. */
export function installSpaceAtmosphere(host) {
  const layer = h('div', { class: 'space-atmosphere', 'aria-hidden': 'true' },
    h('div', { class: 'space-aurora' }), h('div', { class: 'space-starfield' }, stars()),
    h('span', { class: 'space-satellite' }));
  host.prepend(layer);
  const sync = () => {
    const isGame = host.id === 'game';
    const covered = isGame && ['landing', 'overlay', 'rover'].some(id => {
      const element = document.getElementById(id);
      return element && !element.classList.contains('hidden');
    });
    layer.hidden = !!covered;
    layer.classList.toggle('space-suspended', document.hidden || G.paused || !!covered || !host.getClientRects().length);
  };
  const observer = new MutationObserver(sync);
  observer.observe(host, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  const pause = document.getElementById('pause');
  if (pause) observer.observe(pause, { attributes: true, attributeFilter: ['class'] });
  if (host.id === 'game') for (const id of ['landing', 'overlay', 'rover']) {
    const element = document.getElementById(id);
    if (element) observer.observe(element, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('visibilitychange', sync);
  sync();
  return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); layer.remove(); };
}

// ---------- The 3D scene: Astro Base at night, then sunrise (or, after Sol 5, the rocket lifting off) ----------
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const rng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const CREW_COLORS = [0xff8a3c, 0xff5a7a, 0x4aa8ff, 0x58d66b];   // Max, Elsa, Charles, Lea
const ROCKET = [-15, -3], IGNITE = 1, LIFTOFF = 1.9;
const rocketHeight = (T) => T < LIFTOFF ? 0 : 4.5 * (T - LIFTOFF) ** 2;

/** Builds the scene on `canvas`. Resolves to { render(seconds), resize(), dispose() }; rejects when WebGL is unavailable. */
async function buildScene(canvas, final, low) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2));
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(46, 1, 0.5, 3000), rand = rng(31);
  scene.add(camera);
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
  const lit = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  const box = (w, hh, d) => new THREE.BoxGeometry(w, hh, d), cyl = (a, b, hh, n = 10) => new THREE.CylinderGeometry(a, b, hh, n);
  const add = (geo, m, x, y, z, parent = scene, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = shadow; parent.add(o); return o; };
  const white = mat(0xf4f6fa), grey = mat(0xb8c2d6), orange = mat(0xff8a3c), dark = mat(0x2a2f3d), navy = mat(0x1b2a5c);

  // --- Sky: a colour gradient that turns from night to day, with a glow around the sun ---
  const skyU = { top: { value: new THREE.Color() }, low: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0, -1) }, glowK: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 24, 14), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 low; uniform vec3 glow; uniform vec3 sunDir; uniform float glowK; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir); float up = pow(clamp(d.y * 1.5 + 0.03, 0.0, 1.0), 0.6), s = max(dot(d, normalize(sunDir)), 0.0);
        vec3 c = mix(low, top, up) + glow * glowK * (pow(s, 70.0) * 0.8 + pow(s, 8.0) * 0.4);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -2; scene.add(sky);
  const starField = new THREE.Group(), starMats = [];
  for (const [count, size] of [[620, 1.7], [90, 3.2]]) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { const a = rand() * TAU, y = rand() * 2 - 1, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 1500, y * 1500, Math.sin(a) * r * 1500], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: size > 2 ? 0xfff2d0 : 0xdfe8ff, size: size * renderer.getPixelRatio(), sizeAttenuation: false, transparent: true, depthWrite: false, fog: false });
    starMats.push(m); const points = new THREE.Points(geo, m); points.renderOrder = -1; starField.add(points);
  }
  scene.add(starField);
  const starAxis = new THREE.Vector3(0.25, 0.55, -0.8).normalize();
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowSprite = (color, scale) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); s.scale.setScalar(scale); scene.add(s); return s; };
  const sunDisc = add(new THREE.CircleGeometry(26, 32), lit(0xfff4dc, { fog: false }), 0, 0, 0, scene, false);
  const sunGlow = glowSprite(0xffd9a0, 300);
  const meteor = glowSprite(0xffffff, 1); meteor.scale.set(120, 5, 1); meteor.material.rotation = -0.42;

  // --- Ground: flat around the base, dunes and craters further out, mesas on the horizon ---
  const waves = Array.from({ length: 6 }, (_, i) => ({ a: rand() * TAU, f: 0.02 + rand() * 0.05, p: rand() * TAU, h: i < 2 ? 1.1 : 0.35 }));
  const craters = [[-27, 17, 7, 1.3], [26, 21, 5.5, 1], [36, -15, 9, 1.6], [-40, -22, 8, 1.4], [8, 44, 6, 1.1]];
  const groundAt = (x, z) => {
    let y = 0;
    for (const w of waves) y += Math.sin((x * Math.cos(w.a) + z * Math.sin(w.a)) * w.f + w.p) * w.h;
    for (const [cx, cz, r, d] of craters) { const k = Math.hypot(x - cx, z - cz) / r; if (k < 1.7) y += -d * Math.max(0, 1 - k * k) + 0.6 * Math.exp(-((k - 1) ** 2) / 0.07); }
    return y * smooth(21, 40, Math.hypot(x, z - 3)) * (1 - smooth(150, 190, Math.hypot(x, z)));
  };
  {
    const geo = new THREE.PlaneGeometry(700, 700, 120, 120); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color(0x9c3d26), mid = new THREE.Color(0xc4532e), hi = new THREE.Color(0xe07d4a), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = groundAt(x, z); pos.setY(i, y);
      const k = y * 0.3 + Math.sin(x * 0.11 + z * 0.07) * 0.16 + Math.sin(x * 0.031 - z * 0.05) * 0.16 + (rand() - 0.5) * 0.3;
      c.copy(mid).lerp(k > 0 ? hi : lo, Math.min(1, Math.abs(k))); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); ground.receiveShadow = true; scene.add(ground);
    const far = new THREE.Mesh(new THREE.RingGeometry(200, 3000, 64), mat(0xc4532e)); far.rotation.x = -Math.PI / 2; far.position.y = -0.05; scene.add(far);   // a ring, so it cannot cover the crater floors
    const strata = [0xa84a30, 0x8f3d28, 0xb85a36, 0x7d3524].map((cl) => mat(cl));
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + rand() * 0.1, d = 190 + rand() * 70, tiers = 2 + Math.floor(rand() * 3), hgt = 12 + rand() * 30;
      let y = -1, r = 22 + rand() * 26;
      for (let k = 0; k < tiers; k++) {
        const th = (hgt / tiers) * (0.7 + rand() * 0.6), topR = r * (0.72 + rand() * 0.15);
        add(cyl(topR, r, th, 7 + Math.floor(rand() * 3)), strata[(i + k) % 4], Math.cos(a) * d, y + th / 2, Math.sin(a) * d, scene, false).rotation.y = rand() * 3;
        y += th; r = topR * (0.78 + rand() * 0.15);
      }
    }
    const rockGeo = new THREE.DodecahedronGeometry(1, 0), rockMats = [0x8a3a24, 0x6e2f22, 0x9c4a2e].map((cl) => mat(cl));
    for (let i = 0; i < 70; i++) {
      const x = (rand() - 0.5) * 150, z = (rand() - 0.5) * 120, r = 0.4 + rand() * 1.7;
      if (Math.hypot(x, z - 3) < 19 || (z > 12 && Math.abs(x) < 11) || Math.hypot(x - ROCKET[0], z - ROCKET[1]) < 7) continue;
      const rock = add(rockGeo, rockMats[i % 3], x, groundAt(x, z) + r * 0.3, z); rock.scale.set(r, r * (0.55 + rand() * 0.5), r * (0.8 + rand() * 0.4)); rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    }
  }

  // --- Astro Base: habitat, greenhouse, solar panels, dish, flag, a parked rover and the crew ---
  const windowMat = lit(0xffd98a);
  add(cyl(5, 5.5, 3.2, 12), white, 0, 1.6, 0); add(new THREE.SphereGeometry(5, 12, 5, 0, TAU, 0, Math.PI / 2), white, 0, 3.2, 0);
  add(cyl(5.08, 5.08, 0.42, 12), orange, 0, 3.1, 0); add(box(2.6, 2.9, 1.2), grey, 0, 1.45, 5.2); add(box(1.7, 2.2, 0.2), navy, 0, 1.1, 5.85);
  add(box(1.9, 0.18, 0.12), windowMat, 0, 2.5, 5.84, scene, false);
  for (const a of [-1.15, -0.62, 0.62, 1.15]) add(box(1.15, 0.8, 0.2), windowMat, Math.sin(a) * 5.3, 2, Math.cos(a) * 5.3, scene, false).rotation.y = a;
  add(cyl(1.1, 1.1, 4.2, 8).rotateZ(Math.PI / 2), grey, 5.9, 1.2, -0.6);
  add(cyl(4.3, 4.5, 0.6, 12), grey, 10.5, 0.3, -1);
  add(new THREE.SphereGeometry(4.2, 12, 6, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.3, shininess: 90, flatShading: true, depthWrite: false }), 10.5, 0.6, -1, scene, false);
  const leaf = mat(0x3fc45a), tomato = mat(0xff4a3c);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? 0.9 + (i % 3) * 0.9 : 0, x = 10.5 + Math.cos(a) * r, z = -1 + Math.sin(a) * r; add(new THREE.ConeGeometry(0.42, 1.3 + (i % 2) * 0.5, 6), leaf, x, 1.3, z, scene, false); if (i % 2) add(new THREE.SphereGeometry(0.16, 6, 5), tomato, x + 0.3, 1.5, z + 0.2, scene, false); }
  for (let i = 0; i < 3; i++) {
    const x = 9.5 + i * 4.3; add(cyl(0.12, 0.14, 1.7, 6), dark, x, 0.85, 8);
    const panel = add(box(3.5, 0.12, 2.1), navy, x, 1.8, 8); panel.rotation.x = -0.5;
    for (const dz of [-0.5, 0.5]) add(box(3.3, 0.02, 0.06), lit(0x5fd4ff), 0, 0.08, dz, panel, false);
  }
  add(cyl(0.15, 0.22, 3, 6), dark, -7, 1.5, 2.5);
  const dish = add(new THREE.SphereGeometry(1.6, 10, 4, 0, TAU, 0, 0.9), mat(0xf4f6fa, { side: THREE.DoubleSide }), -7, 3.6, 2.5); dish.rotation.set(Math.PI - 0.8, 0, 0.3);
  const beacon = add(new THREE.SphereGeometry(0.16, 6, 5), lit(0xff4040), -7, 3.05, 2.5, scene, false);
  add(cyl(0.06, 0.06, 4.4, 5), dark, 6, 2.2, 9);
  const flagPole = new THREE.Group(); flagPole.position.set(6, 3.8, 9); scene.add(flagPole);
  add(new THREE.PlaneGeometry(1.6, 0.95), lit(0xffd23f, { side: THREE.DoubleSide }), 0.8, 0, 0, flagPole, false);
  const buggy = new THREE.Group(); buggy.position.set(-10.5, 0, 7.5); buggy.rotation.y = 2.3; scene.add(buggy);
  add(box(1.7, 0.5, 2.8), white, 0, 0.95, 0, buggy); add(box(1.74, 0.14, 2.84), orange, 0, 1.24, 0, buggy); add(box(1.5, 0.75, 1.3), white, 0, 1.65, 0.4, buggy); add(box(1.3, 0.5, 0.1), navy, 0, 1.7, 1.06, buggy, false);
  for (const sx of [-1, 1]) for (const lz of [-1.05, 0, 1.05]) add(cyl(0.45, 0.45, 0.36, 10).rotateZ(Math.PI / 2), dark, sx * 1.05, 0.45, lz, buggy);
  const crew = CREW_COLORS.map((color, i) => {
    const g = new THREE.Group(); g.position.set(-3.3 + i * 2.2, 0, 10 + (i % 2) * 0.5); g.rotation.y = final ? 0 : Math.PI + (i - 1.5) * 0.12; scene.add(g);
    add(new THREE.CapsuleGeometry(0.42, 0.55, 3, 8), white, 0, 1.05, 0, g); add(new THREE.SphereGeometry(0.47, 10, 8), white, 0, 1.9, 0, g);
    add(box(0.62, 0.36, 0.3), navy, 0, 1.92, 0.3, g, false); add(cyl(0.445, 0.445, 0.17, 8), mat(color), 0, 1.15, 0, g, false); add(box(0.62, 0.72, 0.3), grey, 0, 1.2, -0.42, g);
    for (const sx of [-1, 1]) add(cyl(0.16, 0.16, 0.62, 6), white, sx * 0.2, 0.31, 0, g);
    const arms = [-1, 1].map((sx) => { const pivot = new THREE.Group(); pivot.position.set(sx * 0.52, 1.45, 0); g.add(pivot); add(cyl(0.12, 0.12, 0.7, 6), white, 0, -0.35, 0, pivot); return pivot; });
    return { g, arms, i };
  });

  // --- The rocket on its pad (it stays parked between sols and lifts off after Sol 5) ---
  add(cyl(3.6, 3.9, 0.3, 10), grey, ROCKET[0], 0.15, ROCKET[1]);
  const rocket = new THREE.Group(); rocket.position.set(ROCKET[0], 0.3, ROCKET[1]); scene.add(rocket);
  add(cyl(1.25, 1.45, 6.4, 12), white, 0, 4.6, 0, rocket); add(new THREE.ConeGeometry(1.25, 2.6, 12), orange, 0, 9.1, 0, rocket);
  add(cyl(1.33, 1.38, 0.5, 12), orange, 0, 5.6, 0, rocket); add(cyl(0.75, 1.05, 0.9, 10), dark, 0, 1, 0, rocket);
  add(cyl(0.52, 0.52, 0.2, 12).rotateX(Math.PI / 2), lit(0x5fd4ff), 0, 6.6, 1.3, rocket, false); add(cyl(0.66, 0.66, 0.16, 12).rotateX(Math.PI / 2), navy, 0, 6.6, 1.26, rocket, false);
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5, fin = add(box(0.2, 2.6, 1.7), orange, Math.sin(a) * 1.75, 1.6, Math.cos(a) * 1.75, rocket); fin.rotation.y = a; }
  const flame = new THREE.Group(); flame.position.y = 0.6; flame.visible = false; rocket.add(flame);
  add(new THREE.ConeGeometry(0.95, 5, 10).rotateX(Math.PI).translate(0, -2.5, 0), lit(0xff9a3c, { transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 0, 0, 0, flame, false);
  add(new THREE.ConeGeometry(0.5, 3, 8).rotateX(Math.PI).translate(0, -1.5, 0), lit(0xfff3c0, { fog: false }), 0, 0, 0, flame, false);
  const engineLight = new THREE.PointLight(0xff9a4a, 0, 120, 1.4); engineLight.position.set(ROCKET[0], 2, ROCKET[1]); scene.add(engineLight);
  const engineGlow = glowSprite(0xffb060, 1); engineGlow.visible = false;

  // --- Finale only: exhaust smoke, fireworks and confetti ---
  let smoke = null, fireworks = [], confetti = null;
  const dummy = new THREE.Object3D();
  if (final) {
    const N = low ? 90 : 220, seeds = Array.from({ length: N }, () => [rand() * TAU, 0.4 + rand() * 0.6, rand()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    smoke = { seeds, points: new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: 0xffd9b8, size: 7, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })) };
    smoke.points.frustumCulled = false; scene.add(smoke.points);
    fireworks = [[4, 14, 42, -70, 0xffd23f], [4.9, -30, 50, -80, 0x5fd4ff], [5.7, 40, 36, -60, 0xff7ad0], [6.6, -6, 56, -90, 0x7dff9a], [7.5, 24, 46, -75, 0xffd23f]].map(([at, x, y, z, color]) => {
      const n = 80, dirs = Array.from({ length: n }, () => { const a = rand() * TAU, u = rand() * 2 - 1, r = Math.sqrt(1 - u * u), sp = 0.7 + rand() * 0.3; return [Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp]; });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const points = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color, size: 9 * renderer.getPixelRatio(), sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      points.frustumCulled = false; points.visible = false; scene.add(points);
      return { at, x, y, z, dirs, points };
    });
    const count = low ? 70 : 170, palette = [0xffd23f, 0x5fd4ff, 0xff5a7a, 0x58d66b, 0xff8a3c, 0xffffff].map((cl) => new THREE.Color(cl));
    confetti = { seeds: Array.from({ length: count }, () => [rand() * 18 - 9, 6 + rand() * 13, -7 - rand() * 6, 1.8 + rand() * 1.8, rand() * TAU, 2 + rand() * 5]),
      mesh: new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.32), lit(0xffffff, { side: THREE.DoubleSide, fog: false }), count) };
    for (let i = 0; i < count; i++) confetti.mesh.setColorAt(i, palette[i % palette.length]);
    confetti.mesh.frustumCulled = false; confetti.mesh.visible = false; camera.add(confetti.mesh);
  }

  // --- Light ---
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0); sun.castShadow = !low; scene.add(sun, sun.target); sun.target.position.set(0, 0, 4);
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 1, far: 260 }); sun.shadow.bias = -0.0006;
  const doorLight = new THREE.PointLight(0xffc27a, 0, 30, 1.5); doorLight.position.set(0, 2.6, 8); scene.add(doorLight);
  scene.fog = new THREE.Fog(0x000000, 130, 720);
  const fill = new THREE.DirectionalLight(0xffffff, 0); fill.position.set(-30, 40, 80); scene.add(fill);   // soft light from the camera side, so the base is not a silhouette
  const key = (n, d, day) => [new THREE.Color(n), new THREE.Color(d), new THREE.Color(day)];
  const K = { top: key(0x050920, 0x2f2c78, 0xc98654), low: key(0x1d1850, 0xff8f5e, 0xf4bf86), hemiSky: key(0x5266d0, 0xffb090, 0xffe2c4), hemiGround: key(0x24163f, 0x6a2c2a, 0x7a3520),
    sun: key(0xff8a50, 0xffa25e, 0xfff1dd), fill: key(0x6f86ff, 0xffc4a8, 0xfff4e6), glow: key(0x7fb4ff, 0x9fd0ff, 0xffe6c0), window: key(0xffd98a, 0xffd98a, 0x8fd8ff) };
  const tone = (keys, d, out) => d < 0.5 ? out.copy(keys[0]).lerp(keys[1], d * 2) : out.copy(keys[1]).lerp(keys[2], d * 2 - 1);
  const sunDir = new THREE.Vector3(), camFrom = new THREE.Vector3(), camTo = new THREE.Vector3(), look = new THREE.Vector3();

  function render(T) {
    // How far the day has come (0 night, 0.5 sunrise, 1 day) and how high the sun stands.
    const day = final ? 0.4 + 0.14 * smooth(0, 8, T) : smooth(1.1, 4.2, T);
    const elevation = (final ? mix(-3, 3, smooth(0, 8, T)) : mix(-12, 15, smooth(0.9, 4.8, T))) * DEG;
    sunDir.set(0.34 * Math.cos(elevation), Math.sin(elevation), -Math.cos(elevation)).normalize();
    tone(K.top, day, skyU.top.value); tone(K.low, day, skyU.low.value); tone(K.glow, day, skyU.glow.value);
    skyU.sunDir.value.copy(sunDir); skyU.glowK.value = smooth(-11 * DEG, 3 * DEG, elevation) * mix(1.25, 0.7, day);
    scene.fog.color.copy(skyU.low.value);
    tone(K.hemiSky, day, hemi.color); tone(K.hemiGround, day, hemi.groundColor); hemi.intensity = mix(1.05, 1.35, day);
    tone(K.sun, day, sun.color); sun.intensity = 2.3 * smooth(0, 11 * DEG, elevation);
    sun.position.set(sunDir.x * 120, Math.max(Math.sin(4 * DEG), sunDir.y) * 120, sunDir.z * 120 + 4);
    tone(K.fill, day, fill.color); fill.intensity = final ? 0.7 : mix(0.3, 1.25, day);
    tone(K.window, day, windowMat.color); doorLight.intensity = 60 * (1 - smooth(0.35, 0.75, day));
    for (const m of starMats) m.opacity = 1 - smooth(0.2, 0.62, day);
    starField.quaternion.setFromAxisAngle(starAxis, 0.6 + (final ? T * 0.012 : 0.42 * T * (1 - 0.75 * smooth(1.1, 4.2, T))));
    sunDisc.position.copy(sunDir).multiplyScalar(900); sunGlow.position.copy(sunDisc.position); sunGlow.material.opacity = 0.75 * smooth(-6 * DEG, 4 * DEG, elevation);
    const shoot = final ? -1 : (T - 0.55) / 0.7;
    meteor.visible = shoot > 0 && shoot < 1;
    if (meteor.visible) { meteor.position.set(-420 - shoot * 300, 430 - shoot * 135, -900); meteor.material.opacity = Math.sin(shoot * Math.PI); }
    beacon.visible = Math.sin(T * 5) > 0.2; flagPole.rotation.y = Math.sin(T * 3.1) * 0.25 + 0.3;

    // The crew: they watch the sunrise and hop when it arrives; after Sol 5 they jump and cheer.
    for (const { g, arms, i } of crew) {
      const cheer = final ? smooth(2, 2.6, T) : 0, greet = smooth(3.3, 3.7, T);
      g.position.y = final ? Math.abs(Math.sin(T * 5.2 + i * 1.3)) * 0.7 * cheer : Math.max(0, Math.sin((T - 3 - i * 0.14) * 7)) * 0.45 * smooth(3, 3.2, T) * (1 - smooth(4.4, 5.2, T));
      const up = final ? mix(0.2, 2.5 + Math.sin(T * 9 + i) * 0.35, cheer) : i === 2 ? 0.2 + greet * (2.4 + Math.sin(T * 10) * 0.3) : 0.2;
      arms[0].rotation.z = final ? -up : -0.2; arms[1].rotation.z = up;
    }

    // Camera: a slow crane move between sols; after Sol 5 it follows the rocket up, then comes back to the crew.
    const lift = final ? rocketHeight(T) : 0;
    if (final) {
      const follow = smooth(LIFTOFF, 3.4, T) * (1 - smooth(5.4, 7.4, T));
      camFrom.set(6, 2.6, 31); camTo.set(1, 4.6, 27); camera.position.lerpVectors(camFrom, camTo, smooth(0, 9, T));
      look.set(mix(-2, -10, follow), 6.5 + Math.min(lift * 0.5, 24) * follow, 0);
      const rumble = smooth(IGNITE, 1.4, T) * (1 - smooth(2.6, 4, T)) * 0.12;
      camera.position.x += Math.sin(T * 61) * rumble; camera.position.y += Math.sin(T * 47 + 1) * rumble;
    } else {
      const p = smooth(0, 6, T);
      camFrom.set(-7, 2.1, 32); camTo.set(4, 4.4, 25); camera.position.lerpVectors(camFrom, camTo, p);
      look.set(1.2, mix(6.2, 4.3, p), 0);
    }
    if (camera.aspect < 1.3) camera.position.z += (1.3 - camera.aspect) * 16;      // step back on tall screens so the base still fits
    camera.lookAt(look);
    sunDisc.lookAt(camera.position);

    // Rocket: ignition, liftoff, smoke, then fireworks and confetti.
    rocket.position.y = 0.3 + lift;
    if (final) {
      const burn = smooth(IGNITE, 1.5, T);
      flame.visible = burn > 0; flame.scale.set(burn * (1 + Math.sin(T * 43) * 0.12), burn * (1 + Math.sin(T * 31) * 0.2 + smooth(LIFTOFF, 3, T) * 0.6), burn * (1 + Math.cos(T * 37) * 0.12));
      engineLight.position.y = 2 + lift; engineLight.intensity = 900 * burn * (1 - smooth(20, 90, lift)) * (0.85 + Math.sin(T * 50) * 0.15);
      engineGlow.visible = burn > 0; engineGlow.position.set(ROCKET[0], 0.6 + lift, ROCKET[1]); engineGlow.scale.setScalar(Math.max(0.01, burn * (15 + Math.sin(T * 40) * 2))); engineGlow.material.opacity = 0.8 * burn;
      const pos = smoke.points.geometry.attributes.position, n = smoke.seeds.length;
      for (let i = 0; i < n; i++) {
        const [a, sp, ph] = smoke.seeds[i], age = ((T * 0.7 + ph) % 1) * 1.7, born = T - age;
        if (born < IGNITE) { pos.setXYZ(i, 0, -50, 0); continue; }
        const fall = 1 + rocketHeight(born) - age * 9, onGround = fall < 0.5, r = onGround ? sp * (2 + (0.5 - fall) * 0.9) : sp * age * 1.4;
        pos.setXYZ(i, ROCKET[0] + Math.cos(a) * r, onGround ? 0.5 + sp * age * 1.2 : fall, ROCKET[1] + Math.sin(a) * r);
      }
      pos.needsUpdate = true; smoke.points.material.opacity = 0.5 * burn * (1 - smooth(60, 160, lift));
      for (const f of fireworks) {
        const t = T - f.at; f.points.visible = t > 0 && t < 1.9;
        if (!f.points.visible) continue;
        const p = f.points.geometry.attributes.position, reach = 26 * (1 - Math.exp(-3.2 * t));
        f.dirs.forEach(([dx, dy, dz], i) => p.setXYZ(i, f.x + dx * reach, f.y + dy * reach - 5 * t * t, f.z + dz * reach));
        p.needsUpdate = true; f.points.material.opacity = 1 - smooth(0.9, 1.9, t);
      }
      const t = T - 2.7; confetti.mesh.visible = t > 0;
      if (t > 0) {
        confetti.seeds.forEach(([x, y, z, fall, ph, spin], i) => {
          dummy.position.set(x + Math.sin(t * 1.7 + ph) * 0.5, y - t * fall, z); dummy.rotation.set(t * spin + ph, t * spin * 0.7, ph);
          dummy.updateMatrix(); confetti.mesh.setMatrixAt(i, dummy.matrix);
        });
        confetti.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    renderer.render(scene, camera);
  }
  function resize() {
    const w = canvas.clientWidth || 1, hh = canvas.clientHeight || 1;
    renderer.setSize(w, hh, false); camera.aspect = w / hh;
    camera.fov = Math.min(78, 2 * Math.atan(Math.tan(23 * DEG) * Math.max(1, 1.55 / camera.aspect)) / DEG); camera.updateProjectionMatrix();
  }
  function dispose() {
    scene.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) m.dispose(); });
    glowTex.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
  }
  resize();
  return { render, resize, dispose };
}

// ---------- The words on top of the scene ----------
const starIcon = () => h('span', { class: 'sol-star', html: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 5l8.2 17.2 18.8 2.5-13.8 13 3.5 18.8L32 47.3 15.3 56.5l3.5-18.8L5 24.7l18.8-2.5z" stroke-linejoin="round"/></svg>' });

/** Resolves true after the celebration or Skip; false when cancelled by quit/restart. */
export function playSolTransition({ sol, nextSol = sol + 1, science = 0, tasksDone = 0, final = false, nextTitle = '', score, signal } = {}) {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const reduced = G.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? (final ? 3200 : 2200) : (final ? 9500 : 6000);
    const stillAt = final ? 7.2 : 12;      // the one picture shown when motion is reduced
    let settled = false, frame, elapsed = 0, last = null, exiting = false, exitTime = 0, view = null, loading = true, beat = 0;
    const completed = Math.max(0, Number(typeof tasksDone === 'object' ? tasksDone.done : tasksDone) || 0);
    const sciencePoints = Math.max(0, Number(science) || 0), percent = Number.isFinite(score) ? Math.round(score) : null;
    const earned = percent === null ? 3 : percent >= 85 ? 3 : percent >= 65 ? 2 : 1;
    // Each beat: when it starts (seconds), and the sound that lands with it.
    const beats = final ? [[0.3, 'pop'], [1, 'liftoff'], [2.7, 'tada'], [3.6, 'ding'], [4.4, 'count']] : [[0.3, 'pop'], [2.7, 'reveal'], [3.3, 'pop'], [3.9, 'twinkle']];

    const progress = h('span', { class: 'sol-progress-fill' });
    const track = h('ol', { class: 'sol-track', 'aria-label': 'Five-sol mission progress' },
      Array.from({ length: 5 }, (_, i) => h('li', { class: i + 1 <= sol ? 'done' : i + 1 === nextSol && !final ? 'next' : '', 'aria-current': i + 1 === sol ? 'step' : undefined },
        h('span', {}, i + 1 <= sol ? '✓' : String(i + 1)), h('small', {}, `Sol ${i + 1}`))));
    const stat = (label) => { const value = h('b', {}, '0'); return { value, el: h('span', {}, value, h('small', {}, label)) }; };
    const stats = [stat('crew tasks done'), stat('science points'), percent !== null && stat('mission success')].filter(Boolean);
    const ui = h('div', { class: 'sol-ui' },
      h('div', { class: 'sol-ribbon' }, h('i', {}, '✓'), final ? 'All 5 sols complete' : `Sol ${sol} complete`),
      !final && h('p', { class: 'sol-night' }, 'Good night, Astro Base…'),
      h('h2', { class: 'sol-title' },
        h('small', {}, final ? 'Five sols. One amazing crew.' : 'Good morning, Commander!'),
        final ? [h('span', { class: 'sol-big sol-big-final' }, 'Mission'), h('span', { class: 'sol-big sol-big-final' }, h('b', {}, 'accomplished!'))] : h('span', { class: 'sol-big' }, 'Sol ', h('b', {}, String(nextSol)))),
      !final && nextTitle && h('p', { class: 'sol-tag' }, nextTitle),
      final && h('div', { class: 'sol-stars', role: 'img', 'aria-label': `${earned} of 3 stars` }, Array.from({ length: 3 }, (_, i) => { const s = starIcon(); if (i < earned) s.classList.add('earned'); s.style.setProperty('--i', i); return s; })),
      final && h('div', { class: 'sol-stats' }, stats.map((s) => s.el)),
      h('div', { class: 'sol-foot' }, track,
        !final && h('p', { class: 'sol-fact' }, h('b', {}, 'Did you know? '), 'On Mars the sunrise glows blue around the Sun.')));
    const skip = h('button', { class: 'btn sol-skip', type: 'button', onclick: () => finish(true, true) }, final ? 'Skip to results →' : 'Skip animation →');
    const canvas = h('canvas', { class: 'sol-canvas', 'aria-hidden': 'true' });
    const m = modal(canvas, h('div', { class: 'sol-shade', 'aria-hidden': 'true' }), ui, skip,
      h('div', { class: 'sol-progress', role: 'progressbar', 'aria-label': final ? 'Opening mission report' : `Starting Sol ${nextSol}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, progress));
    m.el.classList.add('sol-transition', final ? 'sol-finale' : 'sol-dawn', 'sol-loading');
    if (reduced) m.el.classList.add('sol-gentle');
    const setStats = (k) => { [completed, sciencePoints, percent].slice(0, stats.length).forEach((n, i) => { stats[i].value.textContent = Math.round(n * k) + (i === 1 ? ' / 50' : i === 2 ? '%' : ''); }); };
    const showBeat = (n) => { while (beat < n) m.el.classList.add(`sol-b${++beat}`); };
    setStats(reduced ? 1 : 0);
    if (reduced) showBeat(beats.length);

    const ready = (scene) => {
      if (settled) { scene?.dispose(); return; }
      view = scene; loading = false; last = null;
      m.el.classList.remove('sol-loading'); if (!view) m.el.classList.add('sol-flat');
      view?.render(reduced ? stillAt : 0);
    };
    buildScene(canvas, final, G.lowGraphics).then(ready, () => ready(null));
    const onResize = () => { if (view) { view.resize(); view.render(reduced ? stillAt : elapsed / 1000); } };
    window.addEventListener('resize', onResize);

    const unregister = onAbort(() => finish(false));
    function finish(result, animate = false) {
      if (settled) return;
      if (result && animate && !exiting) {
        exiting = true; exitTime = 0; m.el.classList.add('sol-leaving'); return;
      }
      settled = true; cancelAnimationFrame(frame); unregister(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', onResize);
      signal?.removeEventListener('abort', abort);
      view?.dispose(); m.close(); resolve(result);
    }
    function abort() { finish(false); }
    function visibility() { last = null; syncPause(); }
    function syncPause() { m.el.classList.toggle('sol-suspended', document.hidden || G.paused); }
    const observer = new MutationObserver(() => { last = null; syncPause(); });
    const pause = document.getElementById('pause');
    if (pause) observer.observe(pause, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', visibility);
    signal?.addEventListener('abort', abort, { once: true });
    syncPause();
    function tick(now) {
      if (settled) return;
      if (!m.el.isConnected) { finish(false); return; }
      const delta = last === null ? 0 : Math.min(100, now - last); last = now;
      if (!document.hidden && !G.paused && !loading) {
        if (exiting) { exitTime += delta; if (exitTime >= 320) { finish(true); return; } }
        else {
          elapsed += delta;
          const seconds = elapsed / 1000, ratio = Math.min(1, elapsed / duration);
          if (!reduced) {
            while (beat < beats.length && seconds >= beats[beat][0]) { sfx(beats[beat][1]); showBeat(beat + 1); }
            if (final) setStats(smooth(4.4, 6, seconds));
            view?.render(seconds);
          }
          progress.style.transform = `scaleX(${ratio})`;
          progress.parentElement.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
          if (elapsed >= duration) finish(true, true);
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  });
}
