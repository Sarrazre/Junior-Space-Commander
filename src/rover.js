// Outdoor 3D rover mission (three.js). Built from small builder functions so the world can
// grow later: makeGround, buildScenery, buildBase, buildRover, buildSite, makeDust.
// The hands-on tasks at each sample site live in minigames/sites.js.
import * as THREE from 'three';
import { $, h, sfx, shuffle, G, onAbort } from './ui.js';
import { music, engine, wind } from './audio.js';
import { SITE_TASKS } from './minigames/sites.js';
import { EXPEDITION_TASKS, EXPEDITION_STOPS } from './minigames/expedition.js';
import { createGameClock } from './game-clock.js';
import { createCoach } from './voice-ui.js';
import { narration } from './narration.js';

// Two missions, two different worlds: where the stops are, and which terrain is generated.
const ROUTES = {
  samples: { pos: [[28, 60], [-34, 105], [18, 150]], seed: 42 },
  expedition: { pos: [[-44, 58], [46, 112], [-14, 172]], seed: 7 },
};
const BATTERY_RANGE = 620;      // metres the expedition rover drives on one charge
const PAD = [0, 17];            // parking pad in front of the rover garage
const SUSPENSION = 0.32;        // how far a wheel can move up or down from the chassis
const DOOR_Z = -2;             // garage door (the garage goes back to z = -11)
const TAU = Math.PI * 2;
const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const lit = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const box = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
const cyl = (a, b, hh, n = 12) => new THREE.CylinderGeometry(a, b, hh, n);
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function canvasTex(w, hh, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  draw(c.getContext('2d'), w, hh);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- Ground: gentle dunes and real craters. `at(x, z)` gives the height anywhere. ----------
function makeGround(scene, rand, SITE_POS) {
  const SIZE = 760, SEG = 220, CELL = SIZE / SEG, HALF = SIZE / 2, CZ = 100;
  const waves = Array.from({ length: 6 }, (_, i) => ({ a: rand() * TAU, f: 0.018 + rand() * 0.05, p: rand() * TAU, h: i < 2 ? 0.9 : 0.3 }));
  const craters = [];
  for (let tries = 0; craters.length < 9 && tries < 300; tries++) {
    const x = (rand() - 0.5) * 210, z = 34 + rand() * 175, r = 7 + rand() * 7;
    if (Math.abs(x) < 18 && z < 62) continue;                                             // keep the road home clear
    if (SITE_POS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < r + 11)) continue;
    if (craters.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r + 6)) continue;
    craters.push({ x, z, r, d: 1.1 + rand() * 1.1 });
  }
  const shape = (x, z) => {
    let y = 0;
    for (const w of waves) y += Math.sin((x * Math.cos(w.a) + z * Math.sin(w.a)) * w.f + w.p) * w.h;
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1.7) y += -c.d * Math.max(0, 1 - d * d) + 0.75 * Math.exp(-((d - 1) ** 2) / 0.07);
    }
    // Flat around the base, and flat far away where the mesas stand.
    return y * smooth(40, 62, Math.hypot(x, z + 6)) * (1 - smooth(300, 370, Math.hypot(x, z - CZ)));
  };
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, CZ);
  const pos = geo.attributes.position, heights = new Float32Array(pos.count), col = new Float32Array(pos.count * 3);
  const lo = new THREE.Color(0x9c3d26), mid = new THREE.Color(0xc4532e), hi = new THREE.Color(0xe07d4a), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = shape(x, z);
    heights[i] = y; pos.setY(i, y);
    const k = y * 0.3 + Math.sin(x * 0.11 + z * 0.07) * 0.16 + Math.sin(x * 0.031 - z * 0.05) * 0.16 + (rand() - 0.5) * 0.3;
    c.copy(mid).lerp(k > 0 ? hi : lo, Math.min(1, Math.abs(k)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true; scene.add(mesh);
  // The plain beyond the terrain is a ring, not a full sheet: a sheet under the map would cover the crater floors.
  const far = new THREE.Mesh(new THREE.RingGeometry(366, 2200, 64), mat(0xc4532e)); far.rotation.x = -Math.PI / 2; far.position.set(0, -0.05, CZ); scene.add(far);
  // Height of the actual mesh (so wheels, rocks and tracks sit exactly on it).
  const at = (x, z) => {
    const fx = Math.max(0, Math.min(SEG - 0.001, (x + HALF) / CELL)), fz = Math.max(0, Math.min(SEG - 0.001, (z - CZ + HALF) / CELL));
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, row = SEG + 1, i = iz * row + ix;
    return (heights[i] * (1 - tx) + heights[i + 1] * tx) * (1 - tz) + (heights[i + row] * (1 - tx) + heights[i + row + 1] * tx) * tz;
  };
  return { at, craters };
}

function buildScenery(scene, rand, ground, SITE_POS) {
  const obstacles = [];
  // Lumpy rocks: the same bump is applied to shared corners so no cracks appear.
  const lumpy = (geo, seed) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.22 * Math.sin(x * 12.9 + y * 78.2 + z * 37.7 + seed); p.setXYZ(i, x * k, y * k, z * k); } geo.computeVertexNormals(); return geo; };
  const rockGeos = [lumpy(new THREE.DodecahedronGeometry(1, 0), 1), lumpy(new THREE.IcosahedronGeometry(1, 0), 2), lumpy(new THREE.DodecahedronGeometry(1, 1), 3)];
  const rockMats = [0x8a3a24, 0x6e2f22, 0x9c4a2e, 0x5f2b22].map((cl) => mat(cl));
  for (let i = 0; i < 75; i++) {
    const x = (rand() - 0.5) * 210, z = 20 + rand() * 180, r = 1.2 + rand() * 2.6;
    if (SITE_POS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 12) || (Math.abs(x) < 10 && z < 52) || Math.hypot(x, z + 6) < 34) continue;
    const rock = new THREE.Mesh(rockGeos[i % 3], rockMats[i % 4]);
    rock.position.set(x, ground.at(x, z) + r * 0.28, z); rock.scale.set(r, r * (0.55 + rand() * 0.5), r * (0.8 + rand() * 0.4)); rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock); obstacles.push({ x, z, r: r * 0.95 });
  }
  // Pebbles (decoration only)
  const pebbles = new THREE.InstancedMesh(rockGeos[0], mat(0x86392a), 420), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 260, z = 6 + rand() * 215, s = 0.12 + rand() * 0.4;
    e.set(rand() * 3, rand() * 3, rand() * 3); q.setFromEuler(e); v.set(x, ground.at(x, z) + s * 0.3, z); sc.set(s, s * 0.7, s);
    if (Math.abs(x) < 5 && z < 28) v.y = -5;                                                // none on the driveway
    pebbles.setMatrixAt(i, m4.compose(v, q, sc));
  }
  scene.add(pebbles);
  // Layered mesas on the horizon
  const strata = [0xa84a30, 0x8f3d28, 0xb85a36, 0x7d3524].map((cl) => mat(cl));
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + rand() * 0.1, d = 262 + rand() * 70, tiers = 2 + Math.floor(rand() * 3), hgt = 22 + rand() * 52;
    let y = -1, r = 28 + rand() * 30;
    for (let k = 0; k < tiers; k++) {
      const th = (hgt / tiers) * (0.7 + rand() * 0.6), top = r * (0.72 + rand() * 0.15);
      const m = new THREE.Mesh(cyl(top, r, th, 7 + Math.floor(rand() * 3)), strata[(i + k) % 4]);
      m.position.set(Math.cos(a) * d, y + th / 2, 100 + Math.sin(a) * d); m.rotation.y = rand() * 3; scene.add(m);
      y += th; r = top * (0.78 + rand() * 0.15);
    }
  }
  return obstacles;
}

function buildSky(scene, dust, dusk) {
  const sunDir = new THREE.Vector3(-60, 38, 80).normalize();
  const horizon = new THREE.Color(dust ? 0xcf9463 : dusk ? 0xd8b8a8 : 0xf3c298), top = new THREE.Color(dust ? 0xb5723f : dusk ? 0x5d6f9c : 0xd98a5c);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: top }, horizon: { value: horizon }, sunDir: { value: sunDir }, sunPower: { value: dust ? 0.35 : dusk ? 1.3 : 1 } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform float sunPower; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = mix(horizon, top, pow(clamp(d.y, 0.0, 1.0), 0.5));
        float s = max(dot(d, sunDir), 0.0);
        c += (top.b > top.r ? vec3(0.75, 0.88, 1.0) : vec3(1.0, 0.93, 0.8)) * (pow(s, 600.0) * 2.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12) * sunPower;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1; scene.add(sky);
  scene.background = horizon; scene.fog = new THREE.Fog(horizon, dust ? 16 : 80, dust ? 125 : 430);
  scene.add(new THREE.HemisphereLight(0xffe2c4, 0x7a3520, dust ? 1.7 : 1.35));
  const sun = new THREE.DirectionalLight(dusk ? 0xffe0c8 : 0xfff1dd, dust ? 0.9 : dusk ? 1.8 : 2.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
  scene.add(sun, sun.target);
  return { sky, sun, sunDir };
}

// ---------- Soft dust particles (wheel dust, bumps, dust devils, storm wind) ----------
function makeDust(scene, max = 900) {
  const soft = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const pos = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
  const vel = new Float32Array(max * 3), life = new Float32Array(max), span = new Float32Array(max), s0 = new Float32Array(max), s1 = new Float32Array(max), a0 = new Float32Array(max);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0xf4cda6) }, uScale: { value: 600 }, uMap: { value: soft } },
    vertexShader: `attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
      void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform sampler2D uMap; varying float vA;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, material); points.frustumCulled = false; scene.add(points);
  let next = 0;
  return {
    material,
    emit(x, y, z, vx, vy, vz, from, to, secs, a) {
      const i = next; next = (next + 1) % max;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      life[i] = span[i] = secs; s0[i] = from; s1[i] = to; a0[i] = a;
    },
    update(dt) {
      const drag = Math.max(0, 1 - 1.4 * dt);
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { alpha[i] = 0; size[i] = 0; continue; }
        const p = 1 - life[i] / span[i];
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3] *= drag; vel[i * 3 + 1] *= drag; vel[i * 3 + 2] *= drag;
        size[i] = s0[i] + (s1[i] - s0[i]) * p; alpha[i] = a0[i] * (1 - p) * Math.min(1, p * 10);
      }
      geo.attributes.position.needsUpdate = geo.attributes.aSize.needsUpdate = geo.attributes.aAlpha.needsUpdate = true;
    },
  };
}

const solarTex = () => canvasTex(256, 160, (g, w, hh) => {
  g.fillStyle = '#dfe6f2'; g.fillRect(0, 0, w, hh);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = 6 + i * 41, y = 6 + j * 37, gr = g.createLinearGradient(x, y, x + 38, y + 34);
    gr.addColorStop(0, '#2f6ee0'); gr.addColorStop(0.5, '#173f9c'); gr.addColorStop(1, '#1f55c4');
    g.fillStyle = gr; g.fillRect(x, y, 38, 34); g.strokeStyle = '#7fb4ff55'; g.lineWidth = 1; g.strokeRect(x + 6, y + 6, 26, 22);
  }
});

// ---------- Astro Base seen from outside, with a clearly marked rover garage ----------
function buildBase(scene) {
  const g = new THREE.Group();
  const white = mat(0xeef2f9), grey = mat(0xb4bfd6), dark = mat(0x3a4563), navy = mat(0x1b2a5c), orange = mat(0xff8a3c);
  const cyan = lit(0x7fe4ff), warm = lit(0xfff0b0);
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const flat = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; g.add(o); return o; };

  // --- Rover garage (the way home) ---
  const hazard = canvasTex(64, 256, (c, w, hh) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, hh); c.fillStyle = '#1d2547'; for (let y = -64; y < hh + 64; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 40); c.lineTo(w, y + 64); c.lineTo(0, y + 24); c.fill(); } });
  for (const sx of [-1, 1]) {
    add(box(0.9, 5.8, 9.2), white, sx * 4.75, 2.9, -6.5);
    add(box(0.6, 5.6, 0.35), new THREE.MeshLambertMaterial({ map: hazard }), sx * 4.5, 2.8, DOOR_Z + 0.25);
    add(box(0.25, 0.25, 7.5), warm, sx * 4.1, 5.1, -6.5).castShadow = false;
  }
  add(box(10.4, 0.8, 9.6), grey, 0, 6.1, -6.4);
  add(box(10.6, 0.3, 0.4), orange, 0, 5.75, DOOR_Z + 0.3);
  add(box(8.6, 5.6, 0.6), dark, 0, 2.8, -10.9);
  flat(new THREE.PlaneGeometry(8.6, 9), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c) => { c.fillStyle = '#39415a'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#ffd23f'; c.lineWidth = 6; c.strokeRect(14, 14, 100, 100); c.fillStyle = '#ffd23f'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', 64, 68); }) }), 0, 0.04, -6.5);
  const garageLight = new THREE.PointLight(0xffe2a8, 70, 22); garageLight.position.set(0, 4.6, -6); g.add(garageLight);
  const door = add(box(8.6, 5.3, 0.25), new THREE.MeshLambertMaterial({ map: canvasTex(256, 160, (c, w, hh) => {
    c.fillStyle = '#c9d2e4'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#8f9bb8'; c.lineWidth = 2; for (let y = 10; y < hh; y += 13) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = '#ff8a3c'; c.fillRect(0, hh - 22, w, 22); c.fillStyle = '#1d2547'; for (let x = -20; x < w; x += 32) { c.beginPath(); c.moveTo(x, hh); c.lineTo(x + 16, hh - 22); c.lineTo(x + 30, hh - 22); c.lineTo(x + 14, hh); c.fill(); }
    c.fillStyle = '#1b2a5c'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ROVER', w / 2, 66);
  }) }), 0, 2.65, DOOR_Z);
  add(box(8, 1.7, 0.3), navy, 0, 7.35, DOOR_Z + 0.1);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.7, 1.45), lit(0xffffff, { map: canvasTex(512, 96, (c, w, hh) => {
    c.fillStyle = '#101a3c'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#5fd4ff'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, hh - 10);
    c.fillStyle = '#ffd23f'; c.font = 'bold 50px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('▼  ROVER GARAGE  ▼', w / 2, hh / 2 + 3);
  }) })); sign.position.set(0, 7.35, DOOR_Z + 0.27); g.add(sign);
  const beacons = [-1, 1].map((sx) => { const b = add(new THREE.SphereGeometry(0.42, 10, 8), lit(0xffa030), sx * 4.75, 7.1, DOOR_Z + 0.2); b.castShadow = false; return b; });

  // Driveway with moving arrows that point into the garage
  flat(new THREE.PlaneGeometry(8.6, 30), mat(0x54464c, { flatShading: false }), 0, 0.03, DOOR_Z + 15);
  const arrowTex = canvasTex(128, 128, (c) => { c.strokeStyle = '#ffd23f'; c.lineWidth = 14; c.lineJoin = 'miter'; c.beginPath(); c.moveTo(28, 92); c.lineTo(64, 46); c.lineTo(100, 92); c.stroke(); c.fillStyle = '#ffd23f'; c.fillRect(2, 0, 7, 128); c.fillRect(119, 0, 7, 128); });
  arrowTex.wrapT = THREE.RepeatWrapping; arrowTex.repeat.set(1, 5);
  const arrows = flat(new THREE.PlaneGeometry(8.2, 30), lit(0xffffff, { map: arrowTex, transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.06, DOOR_Z + 15);
  const studs = [];
  for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), lit(0x5fd4ff)); s.position.set(sx * 4.7, 0.08, 26 - i * 4.2); s.userData.i = i; g.add(s); studs.push(s); }
  const padTex = canvasTex(256, 256, (c) => {
    c.clearRect(0, 0, 256, 256); c.strokeStyle = '#fff'; c.fillStyle = 'rgba(255,255,255,.22)';
    c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.lineWidth = 12; c.stroke();
    c.setLineDash([22, 16]); c.lineWidth = 7; c.beginPath(); c.arc(128, 128, 92, 0, 7); c.stroke(); c.setLineDash([]);
    c.lineWidth = 18; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); c.moveTo(84, 138); c.lineTo(128, 82); c.lineTo(172, 138); c.moveTo(128, 88); c.lineTo(128, 182); c.stroke();
  });
  const pad = flat(new THREE.CircleGeometry(5.6, 40), lit(0x8fa2c4, { map: padTex, transparent: true, depthWrite: false }), PAD[0], 0.09, PAD[1]);
  const beamTex = canvasTex(4, 128, (c) => { const gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); c.fillStyle = gr; c.fillRect(0, 0, 4, 128); });
  const homeBeam = new THREE.Mesh(new THREE.CylinderGeometry(1, 2, 110, 14, 1, true), lit(0x35e07a, { map: beamTex, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  homeBeam.position.set(PAD[0], 55, PAD[1]); homeBeam.visible = false; g.add(homeBeam);

  // --- Habitat modules behind the garage (same family as the 2D base picture) ---
  add(cyl(9, 10, 5.6, 8), white, 0, 2.8, -21.5).rotation.y = Math.PI / 8;
  add(cyl(6.5, 9, 1.5, 8), grey, 0, 6.35, -21.5).rotation.y = Math.PI / 8;
  add(new THREE.SphereGeometry(4.2, 14, 7, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.7, shininess: 100, flatShading: true }), 0, 7, -21.5);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; if (Math.abs(Math.sin(a) - 1) < 0.1) continue; const w = add(box(2.2, 1.1, 0.25), cyan, Math.sin(a) * 9.35, 3.3, -21.5 + Math.cos(a) * 9.35); w.rotation.y = a; w.castShadow = false; }
  for (const sx of [-1, 1]) {
    const m = add(new THREE.CylinderGeometry(4.2, 4.2, 15, 14), white, sx * 17.5, 2.1, -21.5); m.rotation.z = Math.PI / 2;
    add(cyl(4.4, 4.4, 0.7, 14), grey, sx * 25, 2.1, -21.5).rotation.z = Math.PI / 2;
    add(cyl(4.4, 4.4, 0.7, 14), grey, sx * 10.2, 2.1, -21.5).rotation.z = Math.PI / 2;
    add(box(13.5, 0.5, 2.2), orange, sx * 17.5, 6.2, -21.5);
    for (let i = 0; i < 4; i++) add(box(1.7, 1.1, 0.3), cyan, sx * (12.5 + i * 3.3), 3.4, -17.55).castShadow = false;
  }
  // Greenhouse dome
  const gx = 34, gz = -19;
  add(cyl(7.6, 8, 1.1, 18), grey, gx, 0.55, gz); add(box(5, 3.2, 3.4), white, gx - 8.6, 1.6, -21);
  add(new THREE.SphereGeometry(7, 18, 9, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.32, shininess: 120, depthWrite: false }), gx, 1, gz).castShadow = false;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(7.05, 10, 4, 0, TAU, 0, Math.PI / 2)), new THREE.LineBasicMaterial({ color: 0xffffff })); frame.position.set(gx, 1, gz); g.add(frame);
  const leaf = mat(0x3fc45a), leaf2 = mat(0x6fdc7c), tomato = mat(0xff4a3c), pr = rng(77);
  for (let i = 0; i < 16; i++) { const a = pr() * TAU, r = pr() * 5.2, s = 0.7 + pr() * 0.8; add(new THREE.IcosahedronGeometry(s, 0), i % 2 ? leaf : leaf2, gx + Math.cos(a) * r, 1.4 + s * 0.6, gz + Math.sin(a) * r).castShadow = false; if (i % 3 === 0) add(new THREE.SphereGeometry(0.28, 8, 6), tomato, gx + Math.cos(a) * r + 0.5, 1.5 + s, gz + Math.sin(a) * r + 0.4).castShadow = false; }
  // Solar field
  const solar = new THREE.MeshLambertMaterial({ map: solarTex() });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const px = -15 - i * 7.5, pz = -2.5 - r * 7;
    add(cyl(0.18, 0.25, 2.2, 8), dark, px, 1.1, pz);
    const p = add(box(6.2, 0.18, 3.9), solar, px, 2.5, pz); p.rotation.x = 0.55;
    const f = add(box(6.5, 0.12, 4.2), grey, px, 2.42, pz - 0.06); f.rotation.x = 0.55;
  }
  // Tanks, antenna tower with a turning dish, flag
  for (const [tx, col] of [[-9.5, 0xff8a3c], [-12.4, 0xeef2f9]]) { add(cyl(1.3, 1.3, 3.6, 12), mat(col), tx, 1.8, -12.5); add(new THREE.SphereGeometry(1.3, 12, 6, 0, TAU, 0, Math.PI / 2), mat(col), tx, 3.6, -12.5); }
  add(cyl(0.3, 0.5, 10, 8), grey, 13, 5, -9);
  const dish = new THREE.Group(); dish.position.set(13, 10.3, -9); g.add(dish);
  const bowl = add(new THREE.SphereGeometry(3, 16, 6, 0, TAU, 0, 0.85), mat(0xeef2f9, { side: THREE.DoubleSide }), 0, 2.2, 0, dish); bowl.rotation.x = Math.PI;
  add(cyl(0.06, 0.06, 2.2, 6), dark, 0, 1.1, 0, dish); add(new THREE.SphereGeometry(0.25, 8, 6), orange, 0, 2.2, 0, dish);
  dish.rotation.x = 0.7;
  const blink = add(new THREE.SphereGeometry(0.3, 8, 6), lit(0xff3030), 0, 12, -21.5); blink.castShadow = false;
  add(cyl(0.1, 0.1, 7, 6), grey, 0, 9.5, -21.5);
  add(cyl(0.08, 0.08, 6, 6), grey, 7.5, 3, 1.5);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5, 6, 1), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: canvasTex(128, 80, (c) => { c.fillStyle = '#1b2a5c'; c.fillRect(0, 0, 128, 80); c.fillStyle = '#ff8a3c'; c.beginPath(); c.arc(64, 40, 20, 0, 7); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 5; c.beginPath(); c.ellipse(64, 40, 34, 9, -0.4, 0, 7); c.stroke(); }) }));
  flag.position.set(8.75, 5.2, 1.5); g.add(flag);
  // A sign that is always readable, so the way home is never lost
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, fog: false, sizeAttenuation: false, map: canvasTex(512, 128, (c) => {
    c.beginPath(); c.roundRect(6, 6, 500, 116, 58); c.fillStyle = '#101a3cee'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#6dff9a'; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 62px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏠 ASTRO BASE', 256, 68);
  }) }));
  label.position.set(0, 15, -8); label.scale.set(0.3, 0.075, 1); label.renderOrder = 10; g.add(label);
  scene.add(g);

  let open = 0;
  return {
    setDoor(target, dt) { open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 0.9); const s = 1 - open * 0.94; door.scale.y = s; door.position.y = 5.3 - 2.65 * s; return open; },
    update(now, dt, ready, docking, padDist) {
      arrowTex.offset.y -= dt * (ready ? 0.9 : 0.25); arrows.material.opacity = ready ? 0.95 : 0.4;
      const beat = Math.floor(now / 140) % 7;
      for (const s of studs) s.material.color.setHex(ready ? (s.userData.i === beat ? 0xffffff : 0x35c46a) : 0x3f78b8);
      pad.material.color.setHex(ready ? 0x6dff9a : 0x8fa2c4); pad.material.opacity = ready ? 0.75 + Math.sin(now / 200) * 0.25 : 0.55; pad.rotation.z += dt * (ready ? 0.6 : 0.1);
      const fadeIn = smooth(20, 48, padDist); homeBeam.visible = ready && fadeIn > 0.01; homeBeam.material.opacity = (0.45 + Math.sin(now / 300) * 0.15) * fadeIn;
      const on = Math.floor(now / (docking ? 160 : 600)) % 2;
      beacons.forEach((b, i) => b.material.color.setHex((on ^ i) && (ready || docking) ? 0xffd23f : 0x7a4a18));
      blink.material.color.setHex(Math.floor(now / 900) % 2 ? 0xff3030 : 0x501010);
      dish.rotation.y += dt * 0.25;
      const fp = flag.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(now / 180 + fp.getX(i) * 2.2) * 0.14 * (fp.getX(i) + 1.2)); fp.needsUpdate = true;
      label.visible = padDist > 60;
    },
  };
}

function buildRover() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.rotation.order = 'YXZ';
  const white = mat(0xf4f6fa), grey = mat(0xb8c2d6), orange = mat(0xff8a3c), dark = mat(0x2a2f3d), navy = mat(0x1b2a5c);
  const glass = new THREE.MeshPhongMaterial({ color: 0x24449c, transparent: true, opacity: 0.85, shininess: 110, flatShading: true });
  const add = (geo, m, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  add(box(2.5, 0.55, 4.4), white, 0, 1.3, 0); add(box(2.1, 0.32, 4), dark, 0, 0.95, 0);                       // chassis
  add(box(2.56, 0.16, 4.44), orange, 0, 1.6, 0);
  add(box(2.8, 0.34, 0.45), orange, 0, 1.1, 2.3); add(box(2.8, 0.3, 0.4), orange, 0, 1.1, -2.3);               // bumpers
  add(box(2.3, 1.15, 2.1), white, 0, 2.25, 0.7); add(box(2.45, 0.14, 2.3), grey, 0, 2.9, 0.7);                 // cabin + roof
  add(box(2, 0.78, 0.1), glass, 0, 2.32, 1.76); for (const sx of [-1, 1]) add(box(0.1, 0.72, 1.5), glass, sx * 1.16, 2.32, 0.7);
  add(box(1.3, 0.16, 0.25), lit(0xffd23f), 0, 3.05, 1.55).castShadow = false;
  for (const sx of [-1, 1]) { add(cyl(0.2, 0.2, 0.12, 10).rotateX(Math.PI / 2), lit(0xfff6c8), sx * 0.85, 1.36, 2.22).castShadow = false; add(box(0.36, 0.18, 0.08), lit(0xff4040), sx * 0.9, 1.36, -2.22).castShadow = false; add(box(0.5, 0.5, 1.3), grey, sx * 0.95, 1.83, -1.3); }
  const panel = add(box(2.3, 0.08, 1.8), new THREE.MeshLambertMaterial({ map: solarTex() }), 0, 2.16, -1.3); panel.rotation.x = 0.1;
  add(cyl(0.09, 0.09, 1.5, 8), dark, 0.75, 3.7, 0.1);                                                           // camera mast
  const cam = new THREE.Group(); cam.position.set(0.75, 4.55, 0.1); body.add(cam);
  add(box(0.9, 0.44, 0.5), white, 0, 0, 0, cam);
  for (const sx of [-1, 1]) { add(cyl(0.14, 0.14, 0.12, 10).rotateX(Math.PI / 2), navy, sx * 0.22, 0, 0.28, cam); add(new THREE.SphereGeometry(0.05, 6, 4), lit(0xffffff), sx * 0.22 + 0.04, 0.04, 0.35, cam).castShadow = false; }
  add(cyl(0.05, 0.05, 0.9, 6), dark, -0.8, 3.4, 0);                                                             // dish
  const dish = add(new THREE.SphereGeometry(0.6, 12, 5, 0, TAU, 0, 0.9), mat(0xf4f6fa, { side: THREE.DoubleSide }), -0.8, 4.3, 0); dish.rotation.x = Math.PI - 0.5;
  add(cyl(0.03, 0.03, 2.4, 5), dark, 1, 2.8, -2);                                                               // whip aerial + flag
  const flag = add(new THREE.PlaneGeometry(0.7, 0.4), lit(0xff5a5a, { side: THREE.DoubleSide }), 1.36, 3.8, -2);
  for (const sx of [-1, 1]) { const bar = new THREE.Mesh(box(0.16, 0.16, 3.5), dark); bar.position.set(sx * 1.3, 0.92, 0); root.add(bar); }
  // Six wheels with treads and hub caps (so you can see them spin)
  const wheels = [];
  const tire = cyl(0.78, 0.78, 0.62, 14).rotateZ(Math.PI / 2), hub = cyl(0.4, 0.4, 0.68, 10).rotateZ(Math.PI / 2), cleat = box(0.68, 0.14, 0.24), nut = box(0.72, 0.16, 0.16);
  for (const lx of [-1.6, 1.6]) for (const lz of [-1.6, 0, 1.6]) {
    const holder = new THREE.Group(), spin = new THREE.Group(); holder.position.set(lx, 0.78, lz); holder.add(spin); root.add(holder);
    add(tire, dark, 0, 0, 0, spin); add(hub, white, 0, 0, 0, spin).castShadow = false; add(nut, orange, 0, 0.2, 0, spin).castShadow = false;
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9, c = add(cleat, navy, 0, Math.cos(a) * 0.78, Math.sin(a) * 0.78, spin); c.rotation.x = a; c.castShadow = false; }
    wheels.push({ holder, spin, lx, lz, sus: 0 });
  }
  return { root, body, wheels, cam, flag };
}

function buildAstronaut(color = 0x4aa8ff) {
  const g = new THREE.Group(), white = mat(0xf4f6fa, { flatShading: false }), col = mat(color), visor = new THREE.MeshPhongMaterial({ color: 0x1b2a6c, shininess: 140 });
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  add(new THREE.CapsuleGeometry(0.42, 0.5, 4, 10), white, 0, 1.2, 0); add(box(0.72, 0.78, 0.36), mat(0x9aa7c4), 0, 1.3, -0.42);
  add(cyl(0.45, 0.45, 0.14, 12), col, 0, 0.95, 0);
  add(new THREE.SphereGeometry(0.47, 14, 10), white, 0, 2.02, 0);
  add(new THREE.SphereGeometry(0.36, 14, 10), visor, 0, 2.02, 0.2).scale.set(1, 0.85, 0.8);
  const limb = (x, y, len, r) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); add(new THREE.CapsuleGeometry(r, len, 3, 8), white, 0, -len / 2 - r * 0.4, 0, p); add(new THREE.SphereGeometry(r * 1.25, 8, 6), col, 0, -len - r, 0, p); return p; };
  const armL = limb(-0.6, 1.55, 0.5, 0.13), armR = limb(0.6, 1.55, 0.5, 0.13), legL = limb(-0.22, 0.75, 0.42, 0.17), legR = limb(0.22, 0.75, 0.42, 0.17);
  g.visible = false;
  return { group: g, armL, armR, legL, legR, walk: null, working: false };
}

function buildSite(scene, x, z, n, y, tint = 0x7fe4ff, glow = 0x2fb8ff) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const rock = mat(0x3a3f55), ice = new THREE.MeshPhongMaterial({ color: tint, emissive: new THREE.Color(glow).multiplyScalar(0.6), shininess: 120, flatShading: true });
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + (i % 3) * 0.25, 0), rock); r.position.set(Math.cos(i * 1.3) * 1.5, 0.4, Math.sin(i * 1.3) * 1.5); r.rotation.set(i, i * 2, i * 3); r.castShadow = true; g.add(r); }
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.3, 5), ice); s.position.set(Math.cos(i * 2.1) * 0.7, 0.7, Math.sin(i * 2.1) * 0.7); s.rotation.set(Math.cos(i * 2.1) * 0.4, 0, -Math.sin(i * 2.1) * 0.4); g.add(s); }
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.05), ice); crystal.position.y = 2.6; crystal.castShadow = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 7, 48), lit(glow, { transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.35;
  const beamTex = canvasTex(4, 128, (c) => { const gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); c.fillStyle = gr; c.fillRect(0, 0, 4, 128); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 60, 12, 1, true), lit(glow, { map: beamTex, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.y = 30;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, fog: false, sizeAttenuation: false, map: canvasTex(128, 128, (c) => {
    c.fillStyle = '#1b2a5c'; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill(); c.strokeStyle = '#5fd4ff'; c.lineWidth = 10; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 76px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, 64, 70);
  }) }));
  label.position.y = 7; label.scale.set(0.06, 0.06, 1); label.renderOrder = 10;
  const flag = new THREE.Group(); flag.visible = false;
  const pole = new THREE.Mesh(cyl(0.07, 0.07, 4, 6), mat(0xeef2f9)); pole.position.y = 2;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1), lit(0xffffff, { side: THREE.DoubleSide, map: canvasTex(128, 76, (c) => { c.fillStyle = '#35c46a'; c.fillRect(0, 0, 128, 76); c.strokeStyle = '#fff'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(40, 40); c.lineTo(58, 56); c.lineTo(92, 20); c.stroke(); }) })); cloth.position.set(0.9, 3.45, 0);
  flag.add(pole, cloth);
  g.add(crystal, ring, beam, label, flag); scene.add(g);
  return { x, z, y, n, group: g, crystal, ring, beam, label, flag, done: false, doneAt: 0 };
}

/** Same field instruments and learning goals, without a WebGL driving scene. */
export function runInstrumentMission({ sites = 3, mode = 'samples' } = {}) {
  return new Promise((resolve) => {
    const root = $('#rover');
    root.replaceChildren(); root.classList.remove('hidden'); document.body.classList.add('in-rover');
    let active = true, mistakes = 0;
    const finish = (done, cancelled = false) => {
      if (!active) return;
      active = false; unAbort();
      root.dispatchEvent(new Event('rover-stop'));
      root.replaceChildren(); root.classList.add('hidden'); document.body.classList.remove('in-rover');
      resolve({ done, mistakes, cancelled });
    };
    const unAbort = onAbort(() => finish(false, true));
    const tasks = (mode === 'expedition' ? EXPEDITION_TASKS : shuffle(SITE_TASKS)).slice(0, Math.max(1, Math.min(3, sites)));
    const status = h('div', { id: 'rv-mission', class: 'rv-box', role: 'status' });
    root.append(status, h('button', { id: 'rv-leave', class: 'btn small warn', onclick: () => finish(false) }, 'Back to base (leave unfinished)'));
    music.play('rover');
    (async () => {
      for (let i = 0; i < tasks.length; i++) {
        status.textContent = `Instrument mission · Stop ${i + 1} of ${tasks.length} · ${mode === 'expedition' ? EXPEDITION_STOPS[i] : 'Collect soil evidence'}`;
        const result = await tasks[i](root);
        if (!active) return;
        if (result == null) { finish(false); return; }
        mistakes += result;
      }
      finish(true);
    })().catch(error => { console.warn('Instrument mission stopped', error); finish(false); });
  });
}

export function runRover({ sites: nSites = 3, dust: storm = false, mode: missionMode = 'samples' } = {}) {
  return new Promise((resolve) => {
    const root = $('#rover');
    root.replaceChildren(); root.classList.remove('hidden'); document.body.classList.add('in-rover');
    const canvas = h('canvas', { class: 'three' }); root.append(canvas);
    const lowGraphics = !!G.lowGraphics;
    const reducedMotion = () => G.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowGraphics }); }
    catch (error) {
      console.warn('Rover graphics unavailable', error);
      let active = true;
      const leave = (cancelled = false) => {
        if (!active) return false;
        active = false; unAbortError(); root.replaceChildren(); root.classList.add('hidden'); document.body.classList.remove('in-rover');
        if (cancelled) resolve({ done: false, cancelled: true, mistakes: 0 });
        return true;
      };
      const unAbortError = onAbort(() => leave(true));
      root.replaceChildren(h('div', { class: 'rv-task' }, h('div', { class: 'term' },
        h('div', { class: 'term-body' }, h('h2', {}, 'The rover graphics could not start'),
          h('p', {}, 'Your mission progress is safe. You can complete the same field experiments in instrument mode, without 3D driving.'),
          h('button', { class: 'px-btn ok', onclick: () => { if (leave()) resolve(runInstrumentMission({ sites: nSites, mode: missionMode })); } }, 'Instrument mission (no 3D)'),
          h('button', { class: 'px-btn', onclick: () => { if (leave()) resolve({ done: false, mistakes: 0 }); } }, 'Back to base'),
          h('button', { class: 'px-btn ok', onclick: () => { if (leave()) resolve(runRover({ sites: nSites, dust: storm, mode: missionMode })); } }, 'Try again')))));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowGraphics ? 1 : 2));
    renderer.shadowMap.enabled = !lowGraphics; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1400);
    const expedition = missionMode === 'expedition', route = ROUTES[expedition ? 'expedition' : 'samples'], SITE_POS = route.pos;
    const { sky, sun } = buildSky(scene, storm, expedition);

    const rand = rng(route.seed);
    const ground = makeGround(scene, rand, SITE_POS);
    const obstacles = buildScenery(scene, rand, ground, SITE_POS);
    const base = buildBase(scene);
    const rover = buildRover(); scene.add(rover.root);
    const astro = buildAstronaut(); scene.add(astro.group);
    const sites = SITE_POS.slice(0, nSites).map(([sx, sz], i) => buildSite(scene, sx, sz, i + 1, ground.at(sx, sz), ...(expedition ? [0xffc46b, 0xff9a2e] : [])));
    const tasks = expedition ? EXPEDITION_TASKS : shuffle(SITE_TASKS);
    const stopName = (s) => (expedition ? EXPEDITION_STOPS[s.n - 1] : `Sample site ${s.n}`);
    for (const s of sites) obstacles.push({ x: s.x, z: s.z, r: 2.3 });
    const dust = makeDust(scene);
    const tracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 1.05).rotateX(-Math.PI / 2), lit(0x5e2415, { transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 800);
    tracks.count = 0; tracks.frustumCulled = false; scene.add(tracks);
    const devils = [[-62, 72], [74, 138], [-24, 188]].map(([dx, dz], i) => ({ x: dx, z: dz, a: i * 2, ph: i * 3 }));

    // --- HUD ---
    const mission = h('div', { id: 'rv-mission', class: 'rv-box' });
    const prompt = h('div', { id: 'rv-prompt', class: 'rv-box hidden' });
    const navArrow = h('span', { class: 'arrow' }, '⬆'), navText = h('span', {});
    const nav = h('div', { id: 'rv-nav', class: 'rv-box' }, navArrow, navText);
    const fade = h('div', { id: 'rv-fade' }, h('div', {}, '🏠 Welcome home!'));
    const battFill = h('i'), batt = h('div', { id: 'rv-batt', class: 'rv-box' + (expedition ? '' : ' hidden') }, '🔋', h('div', { class: 'gauge' }, battFill));
    const map = h('canvas', { width: 150, height: 150 });
    const keys = new Set();
    const coach = createCoach({ mission: missionMode === 'expedition' ? 'expedition' : 'samples', owner: 'rover-help', host: root, pause: () => keys.clear() });
    coach.setStage('drive');
    const hold = (code, label, cls = '') => { const b = h('button', { class: cls }, label); const on = (e) => { e.preventDefault(); keys.add(code); if (code === 'KeyE') act(); }, off = () => keys.delete(code); b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); return b; };
    const up = hold('KeyW', '▲'); up.style.gridColumn = '2';
    root.append(mission, prompt, nav, batt, h('div', { id: 'rv-map', class: 'rv-box' }, map),
      h('div', { id: 'rv-keys', class: 'rv-box', html: '<kbd>W</kbd> Drive &nbsp; <kbd>S</kbd> Brake / Reverse &nbsp; <kbd>A</kbd><kbd>D</kbd> Steer &nbsp; <kbd>E</kbd> Stop and work &nbsp; 🟢 Park on the green pad to go home' }),
      h('button', { id: 'rv-leave', class: 'btn small warn', onclick: () => finish(false) }, '✕ Back to base (give up)'),
      h('div', { id: 'rv-touch' }, up, hold('KeyE', 'E', 'e'), hold('KeyA', '◀'), hold('KeyS', '▼'), hold('KeyD', '▶')), fade);

    // mode: 'intro' (rolls out of the garage) -> 'drive' <-> 'task' -> 'dock' (auto-parks in the garage)
    let x = 0, z = -6, heading = 0, speed = 0, mistakes = 0, mode = 'intro', ended = false, raf = 0, last = performance.now(), elapsed = 0;
    const clock = createGameClock();
    let battery = 1, bumpAt = 0, near = null, shake = 0, trackDist = 0, dustAcc = 0, lastGas = 0, steerNow = 0, mapTick = 0, fov = 60, endAt = 0;
    const allDone = () => sites.every((s) => s.done);
    const renderMission = () => mission.replaceChildren(h('b', {}, expedition ? 'Final expedition' : 'Soil survey'),
      h('span', { class: 'rv-progress' }, `${sites.filter(s => s.done).length} / ${sites.length} stops`),
      ...(allDone() ? [h('small', { class: 'go' }, 'Return to the green garage pad')] : []));
    renderMission();

    const walkAstro = (from, to, ms) => new Promise((done) => {
      astro.group.visible = true; astro.walk = { from, to, t: 0, ms, done };
      for (let s = 0; s < ms - 150; s += 260) clock.schedule(() => { if (!ended) sfx('step'); }, s);
    });
    async function act() {
      if (ended || G.paused || G.helpOpen || document.hidden || mode !== 'drive' || !near || Math.abs(speed) >= 3) return;
      const site = near;
      mode = 'task'; speed = 0; keys.clear(); prompt.classList.add('hidden'); sfx('ok');
      coach.setVisible(false);
      const side = new THREE.Vector3(x + Math.cos(heading) * 2.8, 0, z - Math.sin(heading) * 2.8);
      const d = Math.hypot(x - site.x, z - site.z) || 1, spot = new THREE.Vector3(site.x + (x - site.x) / d * 2.6, 0, site.z + (z - site.z) / d * 2.6);
      await walkAstro(side, spot, 900);
      if (ended) return;
      astro.working = true;
      const result = await tasks[(site.n - 1) % tasks.length](root);
      if (ended) return;
      if (result == null) { finish(false); return; }
      mistakes += result;
      astro.working = false; site.done = true; site.doneAt = elapsed;
      for (const marker of [site.crystal, site.beam, site.label]) marker.visible = false;
      site.flag.visible = true; site.ring.material.color.setHex(0x35c46a);
      for (let i = 0; i < 24; i++) dust.emit(site.x, site.y + 1.5, site.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 0.6, 2.4, 1.2, 0.5);
      renderMission();
      await walkAstro(spot, side, 700);
      if (ended) return;
      astro.group.visible = false; near = null; mode = 'drive';
      coach.setVisible(true); coach.setStage('drive', sites.filter(s => s.done).length);
      if (allDone()) sfx('win');
    }
    const code = (e) => e.code.replace('ArrowUp', 'KeyW').replace('ArrowDown', 'KeyS').replace('ArrowLeft', 'KeyA').replace('ArrowRight', 'KeyD');
    const kd = (e) => {
      if (G.paused || G.helpOpen || mode !== 'drive' || e.target.closest?.('button,a,input,select,textarea,[role="button"],summary')) return;
      const c = code(e);
      if (!['KeyW','KeyA','KeyS','KeyD','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(c)) return;
      e.preventDefault(); keys.add(c);
      if ((c === 'KeyE' || c === 'Space') && !e.repeat) act();
    };
    const ku = (e) => keys.delete(code(e));
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const clearKeys = () => keys.clear();
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);

    function drawMap() {
      const g = map.getContext('2d'); const mx = (wx) => 75 - wx * 0.55, my = (wz) => 134 - wz * 0.6;
      g.fillStyle = '#8a3520'; g.fillRect(0, 0, 150, 150);
      g.strokeStyle = '#6e2a1a'; g.lineWidth = 2; for (const c of ground.craters) { g.beginPath(); g.arc(mx(c.x), my(c.z), c.r * 0.55, 0, 7); g.stroke(); }
      g.fillStyle = '#5a2418'; for (const o of obstacles) g.fillRect(mx(o.x) - 1, my(o.z) - 1, 2.5, 2.5);
      g.fillStyle = '#54464c'; g.fillRect(mx(0) - 3, my(27), 6, my(0) - my(27));
      g.fillStyle = allDone() ? (Math.floor(performance.now() / 300) % 2 ? '#6dff9a' : '#35c46a') : '#9fb4d8'; g.beginPath(); g.arc(mx(PAD[0]), my(PAD[1]), allDone() ? 7 : 5, 0, 7); g.fill();
      g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText('🏠', mx(0), my(-9));
      for (const s of sites) { g.fillStyle = s.done ? '#35c46a' : '#5fd4ff'; g.beginPath(); g.arc(mx(s.x), my(s.z), 9, 0, 7); g.fill(); g.fillStyle = '#000'; g.font = 'bold 13px sans-serif'; g.fillText(s.done ? '✓' : s.n, mx(s.x), my(s.z) + 5); }
      g.save(); g.translate(mx(x), my(z)); g.rotate(-heading + Math.PI); g.fillStyle = '#ffd23f'; g.strokeStyle = '#1d2547'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 10); g.lineTo(6.5, -7); g.lineTo(0, -3); g.lineTo(-6.5, -7); g.closePath(); g.fill(); g.stroke(); g.restore();
    }

    const camPos = new THREE.Vector3(11, 6.5, 30), camLook = new THREE.Vector3(0, 2, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up3 = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    camera.position.copy(camPos);

    function frame(time) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (time - last) / 1000); last = time;
      if (G.paused || G.helpOpen || document.hidden) { keys.clear(); if (!quiet) { quiet = true; engine.set(-1); wind.pause(true); } return; }
      elapsed += dt * 1000;
      const now = elapsed;
      clock.tick(dt * 1000);
      if (quiet) { quiet = false; wind.pause(false); }
      const w = root.clientWidth, hgt = root.clientHeight;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(hgt * renderer.getPixelRatio())) { renderer.setSize(w, hgt, false); camera.aspect = w / hgt; camera.updateProjectionMatrix(); }
      const ready = allDone();
      let gas = 0, steer = 0;

      if (mode === 'intro') {                                   // roll out of the garage by itself
        base.setDoor(1, dt * 3);
        speed = 6.5; z += speed * dt;
        if (z >= PAD[1] - 3) { mode = 'drive'; }
      } else if (mode === 'drive') {
        base.setDoor(0, dt);
        gas = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0); steer = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
        if (gas) speed += gas * (gas * speed < 0 ? 26 : 13) * dt; else speed -= Math.sign(speed) * Math.min(Math.abs(speed), 7 * dt);
        speed = Math.max(-6, Math.min(battery > 0 ? 17 : 7, speed));
        if (expedition) { battery = Math.max(0, battery - Math.abs(speed) * dt / BATTERY_RANGE); battFill.style.width = battery * 100 + '%'; battFill.style.background = battery > 0.5 ? '' : battery > 0.2 ? 'var(--yellow)' : 'var(--red)'; }
        heading += steer * 1.9 * dt * Math.max(-1, Math.min(1, speed / 5));
        x += Math.sin(heading) * speed * dt; z += Math.cos(heading) * speed * dt;
        x = Math.max(-115, Math.min(115, x)); z = Math.max(5, Math.min(205, z));
        for (const o of obstacles) {
          const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = o.r + 1.9;
          if (d < min) {
            x = o.x + dx / d * min; z = o.z + dz / d * min;
            if (Math.abs(speed) > 4 && now - bumpAt > 600) { sfx('bump'); bumpAt = now; shake = 0.5; for (let i = 0; i < 14; i++) dust.emit(x - dx / d * 1.6, ground.at(x, z) + 0.6, z - dz / d * 1.6, (Math.random() - 0.5) * 7, 1 + Math.random() * 3, (Math.random() - 0.5) * 7, 0.8, 3, 1, 0.45); }
            speed *= 0.4;
          }
        }
        near = sites.find((s) => !s.done && Math.hypot(s.x - x, s.z - z) < 8) || null;
        const padDist = Math.hypot(PAD[0] - x, PAD[1] - z);
        if (ready && padDist < 7) { mode = 'dock'; keys.clear(); sfx('door'); }
        const text = near ? (Math.abs(speed) < 3 ? `${stopName(near)}: press E to ${expedition ? 'start' : 'collect'}` : 'Slow down and stop here!')
          : expedition && battery <= 0 ? 'Battery empty! The rover crawls on solar power. Next time, drive straight to each stop.'
          : ready ? (expedition ? 'All goals done!' : 'All samples collected!') + ' Follow the green arrow to the rover garage and park on the green pad 🟢'
          : padDist < 7 && sites.some((s) => s.done) ? 'Finish all the stops first, then park here.' : '';
        if (prompt.textContent !== text) prompt.textContent = text;
        prompt.classList.toggle('hidden', !text);
      } else if (mode === 'dock') {                             // autopilot: line up with the door and drive in
        const open = base.setDoor(1, dt);
        const want = Math.atan2(-x, -8), dh = wrap(want - heading);
        heading += Math.sign(dh) * Math.min(Math.abs(dh), 1.9 * dt); steer = Math.sign(dh) * Math.min(1, Math.abs(dh) * 2);
        const target = Math.abs(dh) > 0.6 ? 2.6 : z < 9 && open < 0.85 ? 0 : 6;
        speed += Math.sign(target - speed) * Math.min(Math.abs(target - speed), 12 * dt);
        x += Math.sin(heading) * speed * dt; z += Math.cos(heading) * speed * dt;
        if (prompt.textContent !== 'Autopilot: parking in the rover garage…') prompt.textContent = 'Autopilot: parking in the rover garage…';
        prompt.classList.remove('hidden');
        if (z < 0.5) fade.classList.add('on');
        if (z < -6 && !endAt) { endAt = now + 900; speed = 0; sfx('win'); }
        if (endAt) { speed = 0; if (now > endAt) return finish(true); }
      } else speed = 0;
      steerNow += (steer - steerNow) * Math.min(1, dt * 8);

      // --- Rover on the ground: follow the slopes, lean in turns, spin and steer the wheels ---
      const sinH = Math.sin(heading), cosH = Math.cos(heading), spd = Math.abs(speed);
      engine.set(Math.min(1, spd / 17), Math.abs(gas));
      const gy = ground.at(x, z);
      // The ground under each of the six wheels decides the lean and the height, so the rover
      // never sinks into a crater rim: it rides on its wheels, not on one point under its middle.
      const hw = rover.wheels.map((wh) => ground.at(x + cosH * wh.lx + sinH * wh.lz, z - sinH * wh.lx + cosH * wh.lz));
      const pitch = Math.atan2((hw[0] + hw[3]) / 2 - (hw[2] + hw[5]) / 2, 3.2);
      const roll = Math.atan2((hw[3] + hw[4] + hw[5]) / 3 - (hw[0] + hw[1] + hw[2]) / 3, 3.2);
      const k = Math.min(1, dt * 14);
      rover.root.rotation.y = heading; rover.root.rotation.x += (pitch - rover.root.rotation.x) * k; rover.root.rotation.z += (roll - rover.root.rotation.z) * k;
      // How far each wheel hangs above or below the tilted chassis plane, and the lowest height that
      // keeps every wheel within its suspension travel and the belly and bumpers clear of the ground.
      const tiltX = Math.sin(rover.root.rotation.x), tiltZ = Math.sin(rover.root.rotation.z);
      let fit = 0, top = -Infinity;
      rover.wheels.forEach((wh, i) => { hw[i] -= wh.lx * tiltZ - wh.lz * tiltX; fit += hw[i] / 6; top = Math.max(top, hw[i]); });
      const want = Math.max(fit, top - SUSPENSION, gy - 0.45,
        ground.at(x + sinH * 2.5, z + cosH * 2.5) + 2.5 * tiltX - 0.7, ground.at(x - sinH * 2.5, z - cosH * 2.5) - 2.5 * tiltX - 0.7);
      const ry = rover.root.position.y + (want - rover.root.position.y) * Math.min(1, dt * (want > rover.root.position.y ? 30 : 12));
      rover.root.position.set(x, ry, z);
      const accel = gas && mode === 'drive' ? gas : 0; lastGas += (accel - lastGas) * Math.min(1, dt * 5);
      rover.body.rotation.z += (steerNow * spd / 17 * 0.09 - rover.body.rotation.z) * k;
      rover.body.rotation.x = -lastGas * 0.03 * (1 - spd / 20);
      rover.body.position.y = Math.sin(now / 45) * 0.012 * spd / 17 + Math.sin(now / 420) * 0.01;
      rover.cam.rotation.y = Math.sin(now / 1400) * 0.7; rover.flag.rotation.y = Math.sin(now / 130) * 0.35 * (0.3 + spd / 17);
      rover.wheels.forEach((wh, i) => {
        wh.spin.rotation.x += speed * dt / 0.78;
        wh.holder.rotation.y = wh.lz > 0 ? steerNow * 0.42 : wh.lz < 0 ? -steerNow * 0.22 : 0;
        wh.sus += (Math.max(-SUSPENSION, Math.min(SUSPENSION, hw[i] - ry)) - wh.sus) * Math.min(1, dt * 22);   // each wheel follows its own bump
        wh.holder.position.y = 0.78 + wh.sus + Math.sin(now / 60 + i * 1.7) * 0.025 * spd / 17;
      });

      // --- Dust from the wheels + tyre tracks ---
      const wheelAt = (lx, lz) => v3.set(x + cosH * lx + sinH * lz, 0, z - sinH * lx + cosH * lz);
      if (spd > 1.2) {
        dustAcc += spd * dt * 2.6 + (accel && spd < 6 ? dt * 30 : 0) + Math.abs(steerNow) * spd * dt * 1.2;
        while (dustAcc > 1) {
          dustAcc--;
          for (const lx of [-1.6, 1.6]) {
            const p = wheelAt(lx, speed > 0 ? -1.9 : 1.9), back = -Math.sign(speed);
            dust.emit(p.x + (Math.random() - 0.5) * 0.5, ground.at(p.x, p.z) + 0.25, p.z + (Math.random() - 0.5) * 0.5,
              sinH * back * spd * 0.22 + (Math.random() - 0.5) * 1.6 + cosH * Math.sign(lx) * 0.8, 0.7 + Math.random() * 1.4, cosH * back * spd * 0.22 + (Math.random() - 0.5) * 1.6 - sinH * Math.sign(lx) * 0.8,
              1.1, 3 + spd * 0.16, 0.9 + Math.random() * 0.8, storm ? 0.6 : 0.55);
          }
        }
        trackDist += spd * dt;
        if (trackDist > 1) {
          trackDist = 0; q.setFromAxisAngle(up3, heading);
          for (const lx of [-1.6, 1.6]) { const p = wheelAt(lx, 0); p.y = ground.at(p.x, p.z) + 0.05; tracks.setMatrixAt(trackI, m4.compose(p, q, one)); trackI = (trackI + 1) % 800; }
          tracks.count = Math.min(800, tracks.count + 2); tracks.instanceMatrix.needsUpdate = true;
        }
      }
      // Dust devils wander in the distance; in a storm the wind blows dust past the camera.
      for (const d of devils) {
        d.a += dt * 0.25; d.x += Math.cos(d.a + d.ph) * dt * 2.2; d.z += Math.sin(d.a * 0.7 + d.ph) * dt * 2.2;
        const hh = Math.random() * 11, r = 0.5 + hh * 0.24, a = now / 110 + hh * 0.9, by = ground.at(d.x, d.z);
        dust.emit(d.x + Math.cos(a) * r, by + hh, d.z + Math.sin(a) * r, -Math.sin(a) * 4, 1.5, Math.cos(a) * 4, 1.2, 2.8, 0.8, 0.3);
      }
      if (storm) for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = 6 + Math.random() * 46, px = camera.position.x + Math.cos(a) * r, pz = camera.position.z + Math.sin(a) * r; dust.emit(px, ground.at(px, pz) + Math.random() * 7, pz, 13 + Math.random() * 6, 0.4, -3, 2.2, 6, 2.2, 0.16); }
      dust.update(dt);
      dust.material.uniforms.uScale.value = canvas.height / (2 * Math.tan(camera.fov * Math.PI / 360));

      // --- Astronaut at a sample site ---
      if (astro.walk) {
        const wk = astro.walk; wk.t += dt * 1000;
        const p = Math.min(1, wk.t / wk.ms), s = Math.sin(now / 90);
        astro.group.position.lerpVectors(wk.from, wk.to, p); astro.group.position.y = ground.at(astro.group.position.x, astro.group.position.z) + Math.abs(s) * 0.12;
        astro.group.rotation.y = Math.atan2(wk.to.x - wk.from.x, wk.to.z - wk.from.z);
        astro.legL.rotation.x = s * 0.7; astro.legR.rotation.x = -s * 0.7; astro.armL.rotation.x = -s * 0.6; astro.armR.rotation.x = s * 0.6;
        if (p >= 1) { astro.walk = null; astro.legL.rotation.x = astro.legR.rotation.x = 0; wk.done(); }
      } else if (astro.working) { astro.armL.rotation.x = -1.1 + Math.sin(now / 120) * 0.35; astro.armR.rotation.x = -1.1 - Math.sin(now / 120) * 0.35; }

      for (const s of sites) {
        if (!s.done) { s.crystal.rotation.y += dt * 2; s.crystal.position.y = 2.6 + Math.sin(now / 300 + s.n) * 0.35; s.ring.scale.setScalar(1 + Math.sin(now / 260 + s.n) * 0.05); s.beam.material.opacity = 0.5 + Math.sin(now / 350 + s.n) * 0.15; }
        else s.flag.scale.setScalar(Math.min(1, (now - s.doneAt) / 400));
      }
      base.update(now, dt, ready, mode === 'dock', Math.hypot(PAD[0] - x, PAD[1] - z));

      // --- Camera: chase view while driving, a fixed film camera when leaving or entering the garage ---
      if (mode === 'intro' || mode === 'dock') { wantPos.set(11, 6.5, 30); wantLook.set(x, gy + 1.5, z); }
      else { wantPos.set(x - sinH * 12, gy + 6.5, Math.max(1.5, z - cosH * 12)); wantLook.set(x + sinH * 5, gy + 1.5, z + cosH * 5); }
      const ck = 1 - Math.pow(0.004, dt);
      camPos.lerp(wantPos, ck); camLook.lerp(wantLook, 1 - Math.pow(0.0005, dt));
      // Keep the camera above the ground, and lift it when a rim would hide the rover.
      camPos.y = Math.max(camPos.y, ground.at(camPos.x, camPos.z) + 2.2);
      for (const f of [0.2, 0.4, 0.6, 0.8]) {
        const need = (ground.at(camPos.x + (x - camPos.x) * f, camPos.z + (z - camPos.z) * f) + 0.9 - (gy + 1.5) * f) / (1 - f);
        if (need > camPos.y) camPos.y += (need - camPos.y) * Math.min(1, dt * 8);
      }
      shake = Math.max(0, shake - dt * 1.6);
      const cameraShake = reducedMotion() ? 0 : shake;
      camera.position.set(camPos.x + (Math.random() - 0.5) * cameraShake, camPos.y + (Math.random() - 0.5) * cameraShake, camPos.z);
      camera.lookAt(camLook);
      const wantFov = reducedMotion() ? 60 : 58 + spd * 0.75; if (Math.abs(wantFov - fov) > 0.05) { fov += (wantFov - fov) * Math.min(1, dt * 3); camera.fov = fov; camera.updateProjectionMatrix(); }
      sky.position.copy(camera.position);
      const sx = Math.round(x / 4) * 4, sz = Math.round(z / 4) * 4;
      sun.position.set(sx - 60, 38, sz + 80); sun.target.position.set(sx, 0, sz);

      // --- Compass: always points to the next thing to do ---
      const goal = sites.filter((s) => !s.done).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
      const gx = goal ? goal.x : PAD[0], gz = goal ? goal.z : PAD[1], dist = Math.round(Math.hypot(gx - x, gz - z));
      navArrow.style.transform = `rotate(${-wrap(Math.atan2(gx - x, gz - z) - heading)}rad)`;
      const navLabel = goal ? `${stopName(goal)} · ${dist} m` : `Rover garage · ${dist} m`;
      if (navText.textContent !== navLabel) { navText.textContent = navLabel; nav.classList.toggle('home', !goal); }

      renderer.render(scene, camera);
      if (++mapTick % 3 === 0) drawMap();
    }
    let trackI = 0;
    const debug = { warp: (wx, wz, wh = heading) => { x = wx; z = wz; heading = wh; speed = 0; }, collect: () => sites.forEach((s) => { s.done = true; s.doneAt = elapsed; for (const marker of [s.crystal, s.beam, s.label]) marker.visible = false; s.flag.visible = true; }) || renderMission() };
    if (new URLSearchParams(location.search).has('debug')) window.__rover = debug;
    let quiet = false;
    music.play('rover'); engine.start(); wind.start(storm ? 1 : 0.35); sfx('door');
    raf = requestAnimationFrame(frame);

    const unAbort = onAbort(() => finish(false, true));
    function finish(done, silent = false) {
      if (ended) return; ended = true; unAbort();
      coach.dispose(); narration.stop();
      clock.clear(); root.dispatchEvent(new Event('rover-stop'));
      if (astro.walk) { const walk = astro.walk; astro.walk = null; walk.done(); }
      cancelAnimationFrame(raf); engine.stop(); wind.stop();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', clearKeys); document.removeEventListener('visibilitychange', clearKeys);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const material of [].concat(o.material || [])) {
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          for (const uniform of Object.values(material.uniforms || {})) if (uniform.value?.isTexture) textures.add(uniform.value);
        }
        o.shadow?.dispose();
      });
      for (const resource of [...textures, ...materials, ...geometries]) resource.dispose();
      renderer.dispose(); renderer.forceContextLoss(); root.replaceChildren(); root.classList.add('hidden'); document.body.classList.remove('in-rover');
      if (window.__rover === debug) delete window.__rover;
      resolve({ done, mistakes, cancelled: silent });
    }
  });
}
