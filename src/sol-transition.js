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

// ---------- The 3D scene: Astro Base as in the title painting. Night turns to sunrise; after Sol 5 the crew celebrates. ----------
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const rng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const noise3 = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), f = (t) => t * t * (3 - 2 * t), u = f(x - xi), v = f(y - yi), w = f(z - zi);
  return mix(mix(mix(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), mix(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    mix(mix(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), mix(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
};
const fbm = (x, y, z) => noise3(x, y, z) * 0.5 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.2;
const CREW_COLORS = [0xff8a3c, 0xff5a7a, 0x4aa8ff, 0x58d66b];   // Max, Elsa, Charles, Lea
const paint = (w, hh, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); return c; };

/** Builds the scene on `canvas`. Resolves to { render(seconds), resize(), dispose() }; rejects when WebGL is unavailable. */
async function buildScene(canvas, final, low) {
  const THREE = await import('three');
  const [{ RoundedBoxGeometry }, { mergeVertices }, post] = await Promise.all([
    import('three/addons/geometries/RoundedBoxGeometry.js'), import('three/addons/utils/BufferGeometryUtils.js'),
    low ? null : Promise.all([import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')]),
  ]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const ratio = Math.min(window.devicePixelRatio || 1, low ? 1 : 2);
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(46, 1, 0.3, 4000), rand = rng(31);
  scene.add(camera);
  const disposables = [];
  const texture = (c, repeat) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); } disposables.push(t); return t; };
  const add = (geo, m, x = 0, y = 0, z = 0, parent = scene, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = shadow; parent.add(o); return o; };
  const group = (x = 0, y = 0, z = 0, parent = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const cyl = (a, b, hh, n = 40) => new THREE.CylinderGeometry(a, b, hh, n), ball = (r, w = 32, hh = 24) => new THREE.SphereGeometry(r, w, hh);
  const dome = (r, n = 48) => new THREE.SphereGeometry(r, n, n / 2, 0, TAU, 0, Math.PI / 2), rbox = (w, hh, d, r = 0.12) => new RoundedBoxGeometry(w, hh, d, 4, r);
  const lathe = (pts, n = 56) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);

  // --- Materials: glossy painted shells, tinted glass and lamps that glow ---
  const shell = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25, ...o });
  const hull = shell(0xf5f2f8), hullGrey = shell(0xc9cfe0), blue = shell(0x2c6fe6, { metalness: 0.25 }), orange = shell(0xf58a26), darkMetal = shell(0x2a3152, { metalness: 0.5, roughness: 0.45 }), steel = shell(0x8f9bb8, { metalness: 0.6, roughness: 0.35 });
  const lamps = [];                                                     // every glowing part, so the night can turn them up
  const lamp = (color, power = 1) => { const m = new THREE.MeshStandardMaterial({ color: 0x0c1230, emissive: color, emissiveIntensity: 4, roughness: 0.4 }); lamps.push([m, power]); return m; };
  const glowBlue = lamp(0x39b0ff), glowCyan = lamp(0x7fe6ff, 0.8), glowWarm = lamp(0xffa53a, 1.1);
  const glass = (color, opacity) => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });

  // --- Sky: three bands of colour from the painting, a sun glow, stars, clouds and the big planet ---
  const skyUniforms = () => ({ top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, low: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0, -1) }, glowK: { value: 0 } });
  const skyMaterial = (uniforms) => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 glow; uniform vec3 sunDir; uniform float glowK; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir); float s = max(dot(d, normalize(sunDir)), 0.0);
        vec3 c = mix(low, mid, smoothstep(-0.02, 0.2, d.y)); c = mix(c, top, smoothstep(0.14, 0.62, d.y));
        c += glow * glowK * (pow(s, 80.0) * 0.9 + pow(s, 9.0) * 0.4);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const skyU = skyUniforms();
  const sky = add(new THREE.SphereGeometry(3000, 32, 20), skyMaterial(skyU), 0, 0, 0, scene, false); sky.renderOrder = -3;
  const glowTex = texture(paint(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }));
  const sprite = (map, scaleX, scaleY, o = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, ...o })); s.scale.set(scaleX, scaleY, 1); scene.add(s); return s; };
  const starField = group(), starMats = [];
  for (const [count, size, color] of [[900, 2.4, 0xdfe6ff], [140, 5, 0xfff0cc], [40, 8, 0xbfe0ff]]) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { const a = rand() * TAU, y = rand() * 2 - 1, r = Math.sqrt(1 - y * y); pos.set([Math.cos(a) * r * 2400, y * 2400, Math.sin(a) * r * 2400], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: glowTex, color, size: size * ratio, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    starMats.push(m); const points = new THREE.Points(geo, m); points.renderOrder = -2; starField.add(points);
  }
  const starAxis = new THREE.Vector3(0.25, 0.55, -0.8).normalize();
  const cloudTex = texture(paint(256, 128, (g) => {
    const r = rng(9);
    for (let i = 0; i < 26; i++) { const x = 40 + r() * 176, y = 52 + r() * 34 - Math.abs(x - 128) * 0.08, rad = 16 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  }));
  const clouds = [[-0.86, 0.3, -0.5, 620], [-0.5, 0.2, -0.86, 520], [-0.22, 0.34, -0.95, 420], [0.3, 0.27, -0.95, 560], [0.62, 0.16, -0.8, 480], [0.9, 0.3, -0.42, 600], [0.05, 0.13, -1, 380]].map(([x, y, z, size], i) => {
    const s = sprite(cloudTex, size, size * 0.36); s.userData = { base: new THREE.Vector3(x, y, z).normalize().multiplyScalar(2000), speed: 6 + (i % 3) * 3 }; s.renderOrder = -1; return s;
  });
  const planet = sprite(texture(paint(256, 256, (g) => {
    const gr = g.createRadialGradient(92, 88, 8, 128, 128, 124); gr.addColorStop(0, '#ffe4cc'); gr.addColorStop(0.55, '#f3ad8e'); gr.addColorStop(1, '#c97790');
    g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fillStyle = gr; g.fill(); g.save(); g.clip();
    const r = rng(5);
    for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 256, rad = 6 + r() * 26; g.fillStyle = `rgba(190,104,104,${0.1 + r() * 0.14})`; g.beginPath(); g.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,236,214,.14)'; g.beginPath(); g.ellipse(x - rad * 0.2, y - rad * 0.25, rad * 0.8, rad * 0.5, r() * 3, 0, TAU); g.fill(); }
    g.restore(); g.globalCompositeOperation = 'destination-out';                 // the far side melts into the haze
    const fade = g.createLinearGradient(110, 110, 240, 250); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = fade; g.fillRect(0, 0, 256, 256);
  })), 520, 520);
  planet.position.set(0.56, 0.4, -0.73).normalize().multiplyScalar(2100); planet.renderOrder = -1;
  const sunDisc = add(new THREE.CircleGeometry(34, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 4.6, 2.4), fog: false }), 0, 0, 0, scene, false);
  const sunGlow = sprite(glowTex, 620, 620, { color: 0xffb070, blending: THREE.AdditiveBlending });
  const meteor = sprite(glowTex, 260, 9, { blending: THREE.AdditiveBlending, rotation: -0.42, color: new THREE.Color(3, 3, 3.4) });

  // --- Ground: smooth dunes, flat around the base, hills on the horizon ---
  const groundAt = (x, z) => {
    const r = Math.hypot(x, z - 2);
    return ((fbm(x * 0.03, 0, z * 0.03) - 0.5) * 7 + (noise3(x * 0.13, 1, z * 0.13) - 0.5) * 0.7) * smooth(19, 44, r) + smooth(140, 330, r) * 22 * noise3(x * 0.009, 3, z * 0.009);
  };
  {
    const geo = new THREE.PlaneGeometry(1000, 1000, 240, 240); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), a = new THREE.Color(0xd24a22), b = new THREE.Color(0xf47a38), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundAt(x, z));
      c.copy(a).lerp(b, Math.min(1, Math.max(0, fbm(x * 0.045, 5, z * 0.045) * 1.5 - 0.25))); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const grain = texture(paint(256, 256, (g) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); const r = rng(3); for (let i = 0; i < 5200; i++) { const v = 90 + r() * 90; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); } }), 90);
    grain.colorSpace = THREE.NoColorSpace;
    add(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, bumpMap: grain, bumpScale: 0.6 }), 0, 0, 0, scene, false).receiveShadow = true;
    const far = add(new THREE.RingGeometry(480, 4000, 64), new THREE.MeshStandardMaterial({ color: 0xe2602c, roughness: 1 }), 0, -0.05, 0, scene, false); far.rotation.x = -Math.PI / 2;
  }
  // Rocks are chiselled spheres: flat cut faces with soft edges, lighter on top, like the painted boulders.
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const chiselled = (seed, { cuts = 10, rough = 0.2, mesa = false } = {}) => {
    let geo = new THREE.SphereGeometry(1, mesa ? 72 : 30, mesa ? 48 : 22); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo);
    const r = rng(seed), p = geo.attributes.position, v = new THREE.Vector3();
    const planes = Array.from({ length: cuts }, () => [new THREE.Vector3(r() * 2 - 1, mesa ? r() * 0.3 - 0.1 : r() * 1.5 - 0.4, r() * 2 - 1).normalize(), (mesa ? 0.62 : 0.5) + r() * 0.3]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (mesa) { v.x = Math.sign(v.x) * Math.abs(v.x) ** 0.6; v.z = Math.sign(v.z) * Math.abs(v.z) ** 0.6; const step = 1 - 0.1 * Math.floor((v.y + 0.3) * 5) / 5; v.x *= step; v.z *= step; if (v.y > 0.5) v.y = 0.5 + (v.y - 0.5) * 0.12; }
      v.multiplyScalar(1 + (fbm(v.x * 1.8 + seed, v.y * 1.8, v.z * 1.8) - 0.5) * rough * 2);
      for (const [n, d] of planes) { const k = v.dot(n) - d; if (k > 0) v.addScaledVector(n, -k); }
      if (v.y < -0.3) v.y = -0.3;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const n = geo.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color(), side = new THREE.Color(0xb8452a), topC = new THREE.Color(0xf58f52), under = new THREE.Color(0x7c2c22), band = new THREE.Color(0xe06a3c);
    for (let i = 0; i < p.count; i++) {
      const up = n.getY(i), y = p.getY(i);
      c.copy(side); if (mesa) c.lerp(band, Math.floor(y * 13 + fbm(p.getX(i) * 2, y, p.getZ(i) * 2) * 2) % 2 ? 0.75 : 0.1);
      if (up > 0) c.lerp(topC, up * 0.85); else c.lerp(under, -up);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  };
  const rockGeos = [1, 2, 3, 4, 5].map((s) => chiselled(s * 7));
  const rock = (x, z, r, i) => { const m = add(rockGeos[i % 5], rockMat, x, groundAt(x, z) + r * 0.22, z); m.scale.set(r, r * (0.7 + (i % 3) * 0.12), r * (0.85 + (i % 4) * 0.08)); m.rotation.y = i * 2.4; return m; };
  [[-14.5, 22, 3.3], [-18.5, 17, 2.3], [-11.5, 25, 1.2], [13, 20.5, 3.5], [17, 15.5, 2.5], [9.5, 24, 1.3], [-23, 9, 1.9], [22, 7, 1.6]].forEach(([x, z, r], i) => rock(x, z, r, i));
  for (let i = 0; i < 90; i++) {
    const x = (rand() - 0.5) * 130, z = -45 + rand() * 75, r = 0.18 + rand() * rand() * 1.5;
    if ((Math.abs(x) < 18 && z > -9 && z < 11) || (Math.abs(x) < 7 && z > 6 && z < 16)) continue;
    rock(x, z, r, i);
  }
  [[-150, -120, 80, 62, 60, 11], [-95, -210, 70, 44, 55, 12], [150, -150, 90, 58, 70, 13], [80, -250, 75, 38, 60, 14], [-10, -330, 110, 30, 60, 15], [230, -40, 80, 50, 80, 16], [-240, -10, 85, 56, 80, 17]].forEach(([x, z, sx, sy, sz, seed]) => {
    const m = add(chiselled(seed, { cuts: 12, rough: 0.12, mesa: true }), rockMat, x, sy * 0.3 - 2, z, scene, false); m.scale.set(sx, sy, sz); m.rotation.y = seed;
  });

  // --- Astro Base, left to right as in the painting: solar panels, dish, orange dome, tower, tunnel, habitat, greenhouse ---
  const solarTex = texture(paint(256, 160, (g, w, hh) => {
    g.fillStyle = '#0f2d86'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x = 6 + i * 41.5, y = 6 + j * 38, gr = g.createLinearGradient(x, y, x + 38, y + 34); gr.addColorStop(0, '#3f86ff'); gr.addColorStop(1, '#1848c4'); g.fillStyle = gr; g.fillRect(x, y, 37, 33); }
  }));
  const solarMat = new THREE.MeshPhysicalMaterial({ map: solarTex, roughness: 0.15, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  for (let i = 0; i < 4; i++) {
    const g = group(-16.2 + i * 2.55, 0, 4.6); g.rotation.y = 0.12;
    add(rbox(1.1, 0.3, 1.1, 0.08), hullGrey, 0, 0.15, 0, g); add(cyl(0.09, 0.11, 1.5, 12), darkMetal, 0, 0.95, 0, g);
    const panel = group(0, 1.75, 0, g); panel.rotation.x = 0.85; add(rbox(2.35, 0.1, 1.55, 0.04), hullGrey, 0, 0, 0, panel); add(new THREE.BoxGeometry(2.2, 0.03, 1.4), solarMat, 0, 0.055, 0, panel, false);
  }
  {
    const g = group(-11.6, 0, -1.6);
    add(cyl(0.7, 0.9, 0.5, 24), hullGrey, 0, 0.25, 0, g); add(cyl(0.3, 0.42, 2.5, 20), steel, 0, 1.6, 0, g); add(ball(0.5), darkMetal, 0, 2.95, 0, g);
    const dish = group(0, 3.25, 0, g); dish.rotation.set(0.55, 0, 0.7);
    add(lathe(Array.from({ length: 14 }, (_, i) => [i * 0.155, (i * 0.155) ** 2 * 0.2])), shell(0xf5f2f8, { side: THREE.DoubleSide }), 0, 0, 0, dish);
    add(cyl(0.04, 0.04, 1.5, 8), steel, 0, 0.85, 0, dish); add(ball(0.14, 16, 12), glowWarm, 0, 1.62, 0, dish, false);
  }
  add(cyl(2.45, 2.6, 0.7), hullGrey, -8.2, 0.35, -3.4); add(dome(2.3), orange, -8.2, 0.7, -3.4); add(new THREE.TorusGeometry(2.32, 0.1, 12, 56).rotateX(Math.PI / 2), steel, -8.2, 0.78, -3.4);
  add(cyl(0.3, 0.42, 0.5, 20), steel, -8.2, 3.1, -3.4); add(ball(0.26, 20, 16), glowBlue, -8.2, 3.5, -3.4, scene, false);
  {
    const g = group(-4.2, 0, -4.8);
    add(cyl(0.8, 1.05, 4.7, 32), hullGrey, 0, 2.35, 0, g); add(cyl(1.35, 1.15, 0.28, 32), steel, 0, 4.82, 0, g);
    add(cyl(0.92, 0.92, 1.15, 32), glowWarm, 0, 5.5, 0, g, false);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.12, 1.2, 0.12), steel, Math.sin(i * TAU / 6) * 0.93, 5.5, Math.cos(i * TAU / 6) * 0.93, g);
    add(cyl(1.1, 1.1, 0.14, 32), steel, 0, 6.12, 0, g); add(dome(1.05, 32), shell(0x4a6fb8, { metalness: 0.4 }), 0, 6.18, 0, g); add(cyl(0.03, 0.05, 1.5, 8), steel, 0, 7.9, 0, g);
  }
  {
    const g = group(-5.5, 1.75, 0.6);
    add(cyl(1.5, 1.5, 4.6, 48).rotateZ(Math.PI / 2), hull, 0, 0, 0, g);
    for (const x of [-2.1, -0.7, 0.7, 2.1]) add(new THREE.TorusGeometry(1.53, 0.1, 12, 56).rotateY(Math.PI / 2), x === -2.1 || x === 2.1 ? steel : blue, x, 0, 0, g);
    for (const x of [-1.4, 0, 1.4]) add(rbox(0.75, 0.42, 0.2, 0.09), glowCyan, x, 0.35, 1.42, g, false);
    for (const x of [-1.6, 1.6]) add(rbox(0.5, 0.5, 2.2, 0.08), darkMetal, x, -1.5, 0, g);
  }
  add(lathe([[4.05, 0], [4.3, 0.3], [4.3, 2.7], [4.1, 3.4], [3.4, 4], [2.5, 4.3], [2.5, 4.45], [0, 4.45]]), hull);
  add(cyl(4.36, 4.36, 0.34, 64), darkMetal, 0, 0.2, 0); add(new THREE.TorusGeometry(4.31, 0.13, 12, 72).rotateX(Math.PI / 2), blue, 0, 2.95, 0);
  add(dome(2.38), shell(0x2f7dff, { roughness: 0.12, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x1a55d0, emissiveIntensity: 0.5 }), 0, 4.45, 0);
  for (let i = 0; i < 6; i++) add(new THREE.TorusGeometry(2.4, 0.07, 8, 40, Math.PI), hull, 0, 4.45, 0).rotation.y = i * Math.PI / 6;
  add(cyl(0.3, 0.4, 0.3, 20), steel, 0, 6.9, 0); add(cyl(0.03, 0.04, 1.3, 8), steel, 0, 7.7, 0); add(ball(0.12, 12, 10), glowCyan, 0, 8.36, 0, scene, false);
  for (const a of [-1.25, -0.72, 0.72, 1.25]) { const w = add(rbox(1.2, 0.72, 0.24, 0.14), glowCyan, Math.sin(a) * 4.24, 1.95, Math.cos(a) * 4.24, scene, false); w.rotation.y = a; const f = add(rbox(1.45, 0.96, 0.2, 0.16), blue, Math.sin(a) * 4.2, 1.95, Math.cos(a) * 4.2); f.rotation.y = a; }
  add(rbox(2.9, 3.3, 1.5, 0.3), hull, 0, 1.6, 4.0); add(rbox(2.2, 2.7, 0.3, 0.2), blue, 0, 1.45, 4.68);
  for (const sx of [-1, 1]) { add(rbox(0.82, 2.15, 0.12, 0.08), glowBlue, sx * 0.47, 1.3, 4.84, scene, false); const l = add(rbox(0.52, 0.95, 0.3, 0.12), glowWarm, sx * 2.45, 1.8, 3.72, scene, false); l.rotation.y = sx * 0.58; }
  add(rbox(1.7, 0.2, 0.12, 0.06), glowCyan, 0, 2.95, 4.78, scene, false);
  for (let i = 0; i < 3; i++) add(rbox(2.6 - i * 0.1, 0.2, 0.55, 0.06), hullGrey, 0, 0.5 - i * 0.2, 5.25 + i * 0.5);
  add(cyl(1.3, 1.3, 2.4, 32).rotateZ(Math.PI / 2), hull, 5.2, 1.5, -0.2); add(new THREE.TorusGeometry(1.33, 0.09, 10, 48).rotateY(Math.PI / 2), blue, 5.2, 1.5, -0.2);
  {
    const g = group(8.9, 0, -0.3), ribs = shell(0xf5f2f8, { metalness: 0.2 });
    add(cyl(3.98, 4.15, 0.8, 64), hull, 0, 0.4, 0, g); add(new THREE.TorusGeometry(4.07, 0.1, 12, 72).rotateX(Math.PI / 2), blue, 0, 0.45, 0, g);
    add(cyl(3.7, 3.7, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x5a3626, roughness: 1 }), 0, 0.82, 0, g, false);
    const leaves = [new THREE.MeshStandardMaterial({ color: 0x38c44e, roughness: 0.65 }), new THREE.MeshStandardMaterial({ color: 0x7fe05a, roughness: 0.65 })], fruit = [new THREE.MeshStandardMaterial({ color: 0xff4a2e, roughness: 0.35, emissive: 0x7a1408 }), new THREE.MeshStandardMaterial({ color: 0xffa32e, roughness: 0.35, emissive: 0x7a3a06 })];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, r = Math.sqrt(i / 26) * 3.2, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.42 + (i % 4) * 0.12;
      add(ball(s, 14, 12), leaves[i % 2], x, 1.2 + s * 0.5, z, g, false).scale.y = 0.85 + (i % 3) * 0.2;
      if (i % 2) add(ball(0.17, 12, 10), fruit[i % 4 > 1 ? 1 : 0], x + 0.25, 1.15 + s * 0.3, z + s * 0.8, g, false);
    }
    add(dome(3.85), glass(0x9ff4e2, 0.22), 0, 0.8, 0, g, false);
    for (let i = 0; i < 6; i++) add(new THREE.TorusGeometry(3.87, 0.07, 8, 48, Math.PI), ribs, 0, 0.8, 0, g, false).rotation.y = i * Math.PI / 6;
    for (const hgt of [1.5, 2.8]) add(new THREE.TorusGeometry(Math.sqrt(3.87 ** 2 - hgt ** 2), 0.06, 8, 64).rotateX(Math.PI / 2), ribs, 0, 0.8 + hgt, 0, g, false);
    add(cyl(0.75, 0.95, 0.45, 32), hullGrey, 0, 4.72, 0, g); add(new THREE.TorusGeometry(0.55, 0.11, 10, 24, Math.PI), darkMetal, 0.2, 5, 0, g);
  }
  add(rbox(1.5, 1.6, 1.2, 0.15), hullGrey, 14.2, 0.8, 0.6); add(rbox(1.1, 0.5, 0.1, 0.05), darkMetal, 14.2, 1, 1.22); add(ball(0.16, 12, 10), glowWarm, 14.2, 1.74, 0.6, scene, false);

  // --- The crew: four astronauts with glossy visors in their own colours ---
  const visor = shell(0x121a44, { roughness: 0.06, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.03 });
  const crew = CREW_COLORS.map((color, i) => {
    const g = group(-3.3 + i * 2.2, 0, 9 + (i % 2) * 0.6), accent = shell(color), body = group(0, 0, 0, g);
    g.rotation.y = final ? (1.5 - i) * 0.1 : Math.PI + (i - 1.5) * 0.14;
    add(new THREE.CapsuleGeometry(0.42, 0.5, 8, 24), hull, 0, 1.02, 0, body); add(ball(0.52), hull, 0, 1.95, 0, body);
    add(ball(0.4), visor, 0, 1.96, 0.27, body, false).scale.set(1.02, 0.8, 0.68);
    add(new THREE.TorusGeometry(0.37, 0.075, 10, 32).rotateX(Math.PI / 2), accent, 0, 1.52, 0, body, false); add(new THREE.TorusGeometry(0.42, 0.06, 10, 32).rotateX(Math.PI / 2), accent, 0, 0.78, 0, body, false);
    add(rbox(0.36, 0.26, 0.14, 0.05), accent, 0, 1.14, 0.38, body, false); add(rbox(0.64, 0.78, 0.34, 0.12), hullGrey, 0, 1.18, -0.42, body);
    for (const sx of [-1, 1]) { add(new THREE.CapsuleGeometry(0.155, 0.28, 6, 14), hull, sx * 0.2, 0.42, 0, body); add(rbox(0.32, 0.22, 0.46, 0.09), darkMetal, sx * 0.2, 0.11, 0.05, body); }
    const arms = [-1, 1].map((sx) => { const pivot = group(sx * 0.52, 1.42, 0, body); add(new THREE.CapsuleGeometry(0.125, 0.4, 6, 14), hull, 0, -0.3, 0, pivot); add(ball(0.16, 16, 12), accent, 0, -0.62, 0, pivot, false); return pivot; });
    return { g, body, arms, i };
  });

  // --- Finale only: fireworks and confetti ---
  let fireworks = [], confetti = null;
  const dummy = new THREE.Object3D();
  if (final) {
    const colors = [0xffd23f, 0x5fd4ff, 0xff6fb5, 0x7dff9a, 0xff8a3c, 0xc9a2ff];
    fireworks = [[0.5, 10, 24, -34], [1.1, -16, 28, -42], [1.8, 24, 20, -30], [2.5, -4, 31, -46], [3.2, -28, 21, -32], [3.9, 15, 30, -44], [4.6, -12, 23, -30], [5.3, 30, 26, -40], [6, 2, 27, -36], [6.6, -22, 30, -44]].map(([at, x, y, z], k) => {
      const n = low ? 70 : 170, dirs = Array.from({ length: n }, (_, i) => { const a = rand() * TAU, u = rand() * 2 - 1, r = Math.sqrt(1 - u * u), sp = i % 3 ? 0.85 + rand() * 0.15 : 0.35 + rand() * 0.3; return [Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp]; });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const color = new THREE.Color(colors[k % colors.length]).multiplyScalar(2.6);
      const points = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color, size: 15 * ratio, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      points.frustumCulled = false; points.visible = false; scene.add(points);
      return { at, x, y, z, dirs, points, reach: 11 + (k % 3) * 2.5 };
    });
    const count = low ? 80 : 220, palette = [0xffd23f, 0x5fd4ff, 0xff5a7a, 0x58d66b, 0xff8a3c, 0xffffff].map((cl) => new THREE.Color(cl));
    confetti = { seeds: Array.from({ length: count }, () => [rand() * 20 - 10, 5.5 + rand() * 15, -7 - rand() * 7, 1.6 + rand() * 1.8, rand() * TAU, 2 + rand() * 5]),
      mesh: new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.32), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }), count) };
    for (let i = 0; i < count; i++) confetti.mesh.setColorAt(i, palette[i % palette.length]);
    confetti.mesh.frustumCulled = false; confetti.mesh.visible = false; camera.add(confetti.mesh);
  }
  // Dust motes hang in the air and catch the light.
  const motes = (() => {
    const n = low ? 60 : 200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(rand() - 0.5) * 50, 0.3 + rand() * 9, -4 + rand() * 30], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: 0xffc9a0, size: 0.16, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; scene.add(p); return p;
  })();

  // --- Light: a low sun behind the base, soft sky light from the front, a pink rim, and the base's own lamps ---
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0); sun.castShadow = !low; scene.add(sun, sun.target); sun.target.position.set(0, 0, 3);
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 320 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
  const fill = new THREE.DirectionalLight(0xffffff, 0); fill.position.set(-40, 50, 70); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff5fa8, 0); rim.position.set(80, 26, 12); scene.add(rim);
  const pointLight = (color, x, y, z, reach, power) => { const l = new THREE.PointLight(color, 0, reach, 1.7); l.position.set(x, y, z); l.userData.power = power; scene.add(l); return l; };
  const baseLights = [pointLight(0x4fb8ff, 0, 1.6, 6.4, 20, 1.1), pointLight(0xffa53a, -2.9, 1.9, 4.8, 13, 0.7), pointLight(0xffa53a, 2.9, 1.9, 4.8, 13, 0.7), pointLight(0xffb45a, -4.2, 5.5, -3.4, 18, 0.8), pointLight(0xc8ffd0, 8.9, 3, -0.3, 13, 0.6), pointLight(0x7fe6ff, -5.5, 2.4, 2.8, 10, 0.4)];
  scene.fog = new THREE.Fog(0x000000, 70, 900);
  const key = (...hexes) => hexes.map((hex) => new THREE.Color(hex));    // night, first light, the painting's sky
  const K = { top: key(0x04051a, 0x191a5c, 0x2b2580), mid: key(0x0d0e38, 0x55388f, 0xb65aa2), low: key(0x1b164e, 0xdc6c7c, 0xffa46a), glow: key(0x6f9cff, 0xffb08a, 0xffc890),
    hemiSky: key(0x3a48b0, 0x9a8ee6, 0xdcd8ff), hemiGround: key(0x16122e, 0x8a4c4a, 0xb07a78), sun: key(0xff9060, 0xffb078, 0xffdcb4), fill: key(0x5368ff, 0xe6c4dc, 0xffffff),
    cloud: key(0x222460, 0xd2609a, 0xff9ab8), planet: key(0x7078c8, 0xe0a0b8, 0xffffff) };
  const tone = (keys, d, out) => d < 0.5 ? out.copy(keys[0]).lerp(keys[1], d * 2) : out.copy(keys[1]).lerp(keys[2], d * 2 - 1);
  const sunDir = new THREE.Vector3(), camFrom = new THREE.Vector3(), camTo = new THREE.Vector3(), look = new THREE.Vector3();
  // Reflections come from the painting's own sky, so white hulls pick up its pink and blue.
  const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(), envU = skyUniforms();
  envU.top.value.copy(K.top[2]); envU.mid.value.copy(K.mid[2]); envU.low.value.copy(K.low[2]);
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 20), skyMaterial(envU)));
  for (const [x, y, z, r, color] of [[-20, 9, -38, 6, new THREE.Color(16, 10, 6)], [-14, 30, 26, 12, new THREE.Color(3, 2.6, 2.8)], [36, 12, 6, 7, new THREE.Color(3, 1, 2)]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); envScene.add(m); }
  { const floor = new THREE.Mesh(new THREE.CircleGeometry(50, 32), new THREE.MeshBasicMaterial({ color: 0xc8502a })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1; envScene.add(floor); }
  const envTarget = pmrem.fromScene(envScene, 0.03); scene.environment = envTarget.texture; pmrem.dispose();
  envScene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });

  // --- Bloom, so lamps, the sun and fireworks really glow ---
  let composer = null, bloom = null;
  if (post) {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = post;
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
    bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.38, 0.55, 1);
    composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
  }

  function render(T) {
    // How far the morning has come: 0 night, 0.5 first light, 1 the painting's glowing sky.
    const day = final ? 1 : smooth(1.2, 4.7, T), night = 1 - smooth(0.25, 0.9, day);
    const elevation = (final ? 9 : mix(-11, 9, smooth(1, 5.2, T))) * DEG;
    sunDir.set(-0.46 * Math.cos(elevation), Math.sin(elevation), -0.89 * Math.cos(elevation)).normalize();
    for (const name of ['top', 'mid', 'low', 'glow']) tone(K[name], day, skyU[name].value);
    skyU.sunDir.value.copy(sunDir); skyU.glowK.value = smooth(-12 * DEG, 4 * DEG, elevation) * 0.9;
    scene.fog.color.copy(skyU.low.value); scene.environmentIntensity = mix(0.12, 0.45, day);
    tone(K.hemiSky, day, hemi.color); tone(K.hemiGround, day, hemi.groundColor); hemi.intensity = mix(0.5, 0.9, day);
    tone(K.sun, day, sun.color); sun.intensity = 3.4 * smooth(-1 * DEG, 9 * DEG, elevation);
    sun.position.set(sunDir.x * 140, Math.max(Math.sin(5 * DEG), sunDir.y) * 140, sunDir.z * 140 + 3);
    tone(K.fill, day, fill.color); fill.intensity = mix(0.45, 2.1, day); rim.intensity = 0.45 * smooth(0.3, 1, day);
    for (const [m, power] of lamps) m.emissiveIntensity = power * mix(1.7, 2.4, night);
    for (const l of baseLights) l.intensity = l.userData.power * mix(4, 16, night) * (0.94 + Math.sin(T * 3 + l.position.x) * 0.06);
    starMats.forEach((m, i) => { m.opacity = mix(i ? 0.5 : 0.22, 1, night); });
    starField.quaternion.setFromAxisAngle(starAxis, 0.6 + (final ? T * 0.01 : 0.4 * T * (1 - 0.8 * smooth(1.2, 4.7, T))));
    for (const c of clouds) { tone(K.cloud, day, c.material.color); c.material.opacity = mix(0.35, 0.9, day); c.position.copy(c.userData.base); c.position.x += T * c.userData.speed; }
    tone(K.planet, day, planet.material.color); planet.material.opacity = mix(0.55, 0.95, day);
    sunDisc.position.copy(sunDir).multiplyScalar(2200); sunGlow.position.copy(sunDisc.position); sunGlow.material.opacity = 0.8 * smooth(-7 * DEG, 5 * DEG, elevation);
    const shoot = final ? -1 : (T - 0.5) / 0.75;
    meteor.visible = shoot > 0 && shoot < 1;
    if (meteor.visible) { meteor.position.set(300 - shoot * 620, 1150 - shoot * 290, -1900); meteor.material.opacity = Math.sin(shoot * Math.PI); }
    motes.position.set(Math.sin(T * 0.21) * 1.5, Math.sin(T * 0.33) * 0.4, 0); motes.material.opacity = mix(0.12, 0.45, day);

    // The crew: they watch the sun come up, hop and wave; after Sol 5 they jump and cheer.
    for (const { g, body, arms, i } of crew) {
      const greet = smooth(3.4, 3.8, T) * (1 - smooth(5.2, 5.7, T)), beat = T * 5.4 + i * 1.3;
      const jump = final ? Math.abs(Math.sin(beat)) : Math.max(0, Math.sin((T - 3.1 - i * 0.14) * 7)) * smooth(3.1, 3.3, T) * (1 - smooth(4.5, 5.3, T));
      g.position.y = jump * (final ? 0.75 : 0.45);
      body.scale.set(1 + (1 - jump) * 0.05 * (final ? 1 : 0), 1 - (1 - jump) * 0.06 * (final ? 1 : 0), 1); body.rotation.z = final ? Math.sin(beat * 0.5) * 0.08 : 0;
      const up = final ? 2.5 + Math.sin(T * 9 + i) * 0.35 : i === 2 ? 0.2 + greet * (2.4 + Math.sin(T * 10) * 0.3) : 0.2;
      arms[0].rotation.z = final ? -up : -0.2; arms[1].rotation.z = up;
    }

    // Camera: a slow crane move past the boulders towards the base; in the finale a gentle arc around the crew.
    if (final) {
      const p = smooth(-1, 9, T);
      camFrom.set(8.5, 2.3, 24); camTo.set(-5, 3.5, 19.5); camera.position.lerpVectors(camFrom, camTo, p); look.set(0, mix(3.3, 2.9, p), 2);
    } else {
      const p = smooth(0, 6.4, T);
      camFrom.set(-9.5, 1.7, 28); camTo.set(3, 3.7, 21.5); camera.position.lerpVectors(camFrom, camTo, p); look.set(mix(-1.5, 0.4, p), mix(4.6, 3.3, p), 0);
    }
    if (camera.aspect < 1.3) camera.position.z += (1.3 - camera.aspect) * 18;      // step back on tall screens so the base still fits
    camera.position.y = Math.max(camera.position.y, groundAt(camera.position.x, camera.position.z) + 1.2);
    camera.lookAt(look);
    sunDisc.lookAt(camera.position);

    if (final) {
      for (const f of fireworks) {
        const t = T - f.at; f.points.visible = t > -0.55 && t < 2.1;
        if (!f.points.visible) continue;
        const p = f.points.geometry.attributes.position;
        if (t < 0) { const u = 1 + t / 0.55, y = f.y * (1 - (1 - u) ** 2); for (let i = 0; i < f.dirs.length; i++) p.setXYZ(i, f.x * (0.7 + 0.3 * u), y - (i % 6) * 0.25, f.z); f.points.material.opacity = 0.5; }
        else { const reach = f.reach * (1 - Math.exp(-3.4 * t)); f.dirs.forEach(([dx, dy, dz], i) => p.setXYZ(i, f.x + dx * reach, f.y + dy * reach - 2.6 * t * t, f.z + dz * reach)); f.points.material.opacity = (1 - smooth(0.8, 2.1, t)) * (0.8 + Math.sin(T * 40 + f.at) * 0.2); }
        p.needsUpdate = true;
      }
      const t = T - 0.4; confetti.mesh.visible = t > 0;
      if (t > 0) {
        confetti.seeds.forEach(([x, y, z, fall, ph, spin], i) => {
          dummy.position.set(x + Math.sin(t * 1.7 + ph) * 0.5, y - t * fall, z); dummy.rotation.set(t * spin + ph, t * spin * 0.7, ph);
          dummy.updateMatrix(); confetti.mesh.setMatrixAt(i, dummy.matrix);
        });
        confetti.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function resize() {
    const w = canvas.clientWidth || 1, hh = canvas.clientHeight || 1;
    renderer.setSize(w, hh, false); composer?.setPixelRatio(ratio); composer?.setSize(w, hh); camera.aspect = w / hh;
    camera.fov = Math.min(78, 2 * Math.atan(Math.tan(23 * DEG) * Math.max(1, 1.55 / camera.aspect)) / DEG); camera.updateProjectionMatrix();
  }
  function dispose() {
    scene.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) m.dispose(); });
    for (const t of disposables) t.dispose();
    envTarget.dispose(); bloom?.dispose(); composer?.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
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
    const duration = reduced ? (final ? 3200 : 2200) : (final ? 8000 : 6400);
    const stillAt = final ? 2.4 : 12;      // the one picture shown when motion is reduced
    let settled = false, frame, elapsed = 0, last = null, exiting = false, exitTime = 0, view = null, loading = true, beat = 0;
    const completed = Math.max(0, Number(typeof tasksDone === 'object' ? tasksDone.done : tasksDone) || 0);
    const sciencePoints = Math.max(0, Number(science) || 0), percent = Number.isFinite(score) ? Math.round(score) : null;
    const earned = percent === null ? 3 : percent >= 85 ? 3 : percent >= 65 ? 2 : 1;
    // Each beat: when it starts (seconds), and the sound that lands with it. The finale is one celebration, start to end.
    const beats = final ? [[0.45, 'tada'], [1.4, 'ding'], [2.3, 'count']] : [[0.3, 'pop'], [2.9, 'reveal'], [3.5, 'pop'], [4.1, 'twinkle']];
    const countFrom = 2.3;

    const progress = h('span', { class: 'sol-progress-fill' });
    const track = !final && h('ol', { class: 'sol-track', 'aria-label': 'Five-sol mission progress' },
      Array.from({ length: 5 }, (_, i) => h('li', { class: i + 1 <= sol ? 'done' : i + 1 === nextSol ? 'next' : '', 'aria-current': i + 1 === sol ? 'step' : undefined },
        h('span', {}, i + 1 <= sol ? '✓' : String(i + 1)), h('small', {}, `Sol ${i + 1}`))));
    const stat = (label) => { const value = h('b', {}, '0'); return { value, el: h('span', {}, value, h('small', {}, label)) }; };
    const stats = [stat('crew tasks done'), stat('science points'), percent !== null && stat('mission success')].filter(Boolean);
    const ui = h('div', { class: 'sol-ui' },
      !final && h('div', { class: 'sol-ribbon' }, h('i', {}, '✓'), `Sol ${sol} complete`),
      !final && h('p', { class: 'sol-night' }, 'Good night, Astro Base…'),
      h('h2', { class: 'sol-title' },
        h('small', {}, final ? 'Five sols. One amazing crew.' : 'Good morning, Commander!'),
        final ? [h('span', { class: 'sol-big sol-big-final' }, 'Mission'), h('span', { class: 'sol-big sol-big-final' }, h('b', {}, 'accomplished!'))] : h('span', { class: 'sol-big' }, 'Sol ', h('b', {}, String(nextSol)))),
      !final && nextTitle && h('p', { class: 'sol-tag' }, nextTitle),
      final && h('div', { class: 'sol-stars', role: 'img', 'aria-label': `${earned} of 3 stars` }, Array.from({ length: 3 }, (_, i) => { const s = starIcon(); if (i < earned) s.classList.add('earned'); s.style.setProperty('--i', i); return s; })),
      final && h('div', { class: 'sol-stats' }, stats.map((s) => s.el)),
      !final && h('div', { class: 'sol-foot' }, track,
        h('p', { class: 'sol-fact' }, h('b', {}, 'Did you know? '), 'On Mars the sunrise glows blue around the Sun.')));
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
            if (final) setStats(smooth(countFrom, countFrom + 1.6, seconds));
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
