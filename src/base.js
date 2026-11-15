// The 2D Astro Base: background picture + walkable map + animated astronauts + stations.
// All sprites are drawn in code (canvas textures), so nothing here depends on extra image files.
import Phaser from 'phaser';
import { S } from './state.js';
import { sfx } from './audio.js';
import { CREW, CREW_IDS } from './data/sols.js';
import { ROOMS, LINKS, STATIONS, STARTS, REACH, walkable, findPath } from './data/map.js';

const WORLD_W = 1672, WORLD_H = 941, SPEED = 190, K = 2; // K = texture resolution (2x for crisp zoom)
const QUERY = new URLSearchParams(location.search);
const DEBUG = QUERY.has('debug');
const SHAPES = ['map', 'shapes'].includes(QUERY.get('debug')); // walkable-area overlay, only on request
const INK = '#1d2547', TAU = Math.PI * 2;

/** Make a canvas texture once. `draw` works in 1x pixels. */
function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, Math.ceil(w * K), Math.ceil(h * K));
  const g = t.getContext();
  g.scale(K, K); g.lineJoin = g.lineCap = 'round';
  draw(g); t.refresh();
  return key;
}
const outline = (g, w = 2) => { g.lineWidth = w; g.strokeStyle = INK; g.stroke(); };
const lin = (g, x0, y0, x1, y1, a, b) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };

function softDot(scene, key, color, size = 64) {
  return tex(scene, key, size, size, (g) => {
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, color + 'ff'); gr.addColorStop(0.45, color + '66'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  });
}

function astroTextures(scene, id, col) {
  const suit = (g, x0, x1) => lin(g, x0, 0, x1, 0, '#ffffff', '#d5dcee');
  tex(scene, 'leg-' + id, 14, 21, (g) => {
    g.beginPath(); g.roundRect(2, 1, 10, 14, 4); g.fillStyle = suit(g, 2, 12); g.fill(); outline(g);
    g.beginPath(); g.roundRect(1, 11, 12, 9, 3.5); g.fillStyle = col; g.fill(); outline(g);
  });
  tex(scene, 'arm-' + id, 12, 23, (g) => {
    g.beginPath(); g.roundRect(2, 1, 8, 16, 4); g.fillStyle = suit(g, 2, 10); g.fill(); outline(g);
    g.beginPath(); g.arc(6, 17, 4.5, 0, TAU); g.fillStyle = col; g.fill(); outline(g);
  });
  tex(scene, 'torsoF-' + id, 38, 34, (g) => {
    g.beginPath(); g.roundRect(1, 4, 36, 22, 6); g.fillStyle = '#9aa7c4'; g.fill(); outline(g);          // backpack edges
    g.beginPath(); g.roundRect(5, 1, 28, 32, 9); g.fillStyle = suit(g, 5, 33); g.fill();
    g.save(); g.clip(); g.fillStyle = col; g.fillRect(5, 23, 28, 5); g.restore();                          // colour belt
    g.beginPath(); g.roundRect(5, 1, 28, 32, 9); outline(g);
    g.beginPath(); g.roundRect(11, 8, 16, 10, 3); g.fillStyle = '#2b3559'; g.fill();                       // chest panel
    [['#58d66b', 13.5], ['#ffd23f', 17.7], ['#ff5a5a', 21.9]].forEach(([c, x]) => { g.fillStyle = c; g.fillRect(x, 11, 2.8, 4); });
  });
  tex(scene, 'torsoB-' + id, 38, 34, (g) => {
    g.beginPath(); g.roundRect(5, 1, 28, 32, 9); g.fillStyle = suit(g, 5, 33); g.fill(); outline(g);
    g.beginPath(); g.roundRect(7, 3, 24, 24, 6); g.fillStyle = lin(g, 7, 0, 31, 0, '#b4bfd8', '#8693b3'); g.fill(); outline(g); // life-support pack
    g.fillStyle = col; g.beginPath(); g.roundRect(11, 7, 6, 15, 3); g.fill(); g.beginPath(); g.roundRect(21, 7, 6, 15, 3); g.fill();
    g.fillStyle = '#9cffb3'; g.beginPath(); g.arc(19, 24, 1.6, 0, TAU); g.fill();
  });
  const helmet = (g) => {
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(31, 13); g.lineTo(35, 5); g.stroke();   // antenna
    g.beginPath(); g.arc(35, 4.5, 3, 0, TAU); g.fillStyle = col; g.fill(); outline(g, 1.5);
    g.fillStyle = col; g.beginPath(); g.roundRect(0.8, 24, 6, 11, 3); g.fill(); outline(g); g.beginPath(); g.roundRect(37.2, 24, 6, 11, 3); g.fill(); outline(g); // ear caps
    g.beginPath(); g.arc(22, 29, 19, 0, TAU); g.fillStyle = lin(g, 6, 12, 38, 46, '#ffffff', '#cfd7ea'); g.fill(); outline(g);
  };
  tex(scene, 'headF-' + id, 44, 50, (g) => {
    helmet(g);
    g.beginPath(); g.ellipse(22, 30, 14.5, 12, 0, 0, TAU); g.fillStyle = lin(g, 0, 18, 0, 42, '#3156b8', '#0c1434'); g.fill(); outline(g);
    g.fillStyle = '#ffffff99'; g.beginPath(); g.ellipse(14.5, 23.5, 5, 2.4, -0.55, 0, TAU); g.fill();
    g.strokeStyle = '#ffffffcc'; g.lineWidth = 1.6; g.beginPath(); g.arc(22, 33, 4.5, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); // smile
  });
  tex(scene, 'headB-' + id, 44, 50, (g) => {
    helmet(g);
    g.beginPath(); g.roundRect(13, 24, 18, 13, 4); g.fillStyle = '#d0d8eb'; g.fill(); outline(g, 1.5);
    g.fillStyle = col; g.fillRect(16, 28, 12, 3);
  });
  tex(scene, 'tag-' + id, 80, 22, (g) => {
    g.font = 'bold 13px "Baloo 2", "Trebuchet MS", sans-serif';
    const name = CREW[id].name, w = Math.min(76, g.measureText(name).width + 18);
    g.beginPath(); g.roundRect(40 - w / 2, 2, w, 18, 9); g.fillStyle = col; g.fill(); outline(g);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#1d254799';
    g.strokeText(name, 40, 11.5); g.fillText(name, 40, 11.5);
  });
}

function sharedTextures(scene) {
  tex(scene, 'eyes', 20, 9, (g) => { g.fillStyle = '#fff'; for (const x of [4.5, 15.5]) { g.beginPath(); g.ellipse(x, 4.5, 2.5, 3.4, 0, 0, TAU); g.fill(); } });
  tex(scene, 'pick', 20, 16, (g) => { g.beginPath(); g.moveTo(2, 2); g.lineTo(18, 2); g.lineTo(10, 14); g.closePath(); g.fillStyle = '#ffd23f'; g.fill(); outline(g); });
  for (const [name, c] of [['yellow', '#ffd23f'], ['cyan', '#5fd4ff'], ['white', '#ffffff']]) {
    tex(scene, 'pad-' + name, 76, 34, (g) => {
      g.beginPath(); g.ellipse(38, 17, 30, 11, 0, 0, TAU); g.fillStyle = c + '33'; g.fill();
      g.shadowColor = c; g.shadowBlur = 8; g.lineWidth = 3.5; g.strokeStyle = c; g.stroke();
      g.shadowBlur = 0; g.setLineDash([5, 7]); g.lineWidth = 2; g.beginPath(); g.ellipse(38, 17, 21, 7, 0, 0, TAU); g.stroke();
    });
    tex(scene, 'badge-' + name, 50, 58, (g) => {
      g.beginPath(); g.moveTo(17, 40); g.lineTo(25, 55); g.lineTo(33, 40); g.closePath(); g.fillStyle = c; g.fill(); outline(g);
      g.beginPath(); g.arc(25, 24, 21, 0, TAU); g.fillStyle = c; g.fill(); outline(g);
      g.beginPath(); g.arc(25, 24, 16.5, 0, TAU); g.fillStyle = lin(g, 0, 6, 0, 42, '#22346e', '#0f1838'); g.fill();
    });
  }
  softDot(scene, 'dot-white', '#ffffff', 32); softDot(scene, 'dot-dust', '#f0b98a', 48); softDot(scene, 'dot-steam', '#e8f4ff', 48);
  tex(scene, 'bubble', 12, 12, (g) => { g.beginPath(); g.arc(6, 6, 4, 0, TAU); g.fillStyle = '#ffffff55'; g.fill(); g.lineWidth = 1.3; g.strokeStyle = '#ffffffdd'; g.stroke(); });
  tex(scene, 'spark', 20, 20, (g) => { g.fillStyle = '#fffbe0'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 2.2 : 9, a = i * Math.PI / 4; g.lineTo(10 + Math.cos(a) * r, 10 + Math.sin(a) * r); } g.fill(); });
  tex(scene, 'wave', 60, 60, (g) => { g.strokeStyle = '#bfefff'; g.lineWidth = 3; g.beginPath(); g.arc(30, 30, 26, -2.2, -0.9); g.stroke(); });
  tex(scene, 'ripple', 60, 28, (g) => { g.beginPath(); g.ellipse(30, 14, 26, 10, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); });
  // Hub floor emblem: gives the empty hub a centre piece.
  tex(scene, 'emblem', 220, 220, (g) => {
    const gr = g.createRadialGradient(110, 110, 10, 110, 110, 108);
    gr.addColorStop(0, '#e9efff'); gr.addColorStop(0.7, '#c3cdea'); gr.addColorStop(1, '#a9b6dc');
    g.beginPath(); g.arc(110, 110, 106, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = '#6f80b8'; g.stroke();
    g.beginPath(); g.arc(110, 110, 78, 0, TAU); g.lineWidth = 2.5; g.strokeStyle = '#5fd4ffaa'; g.stroke();
    g.fillStyle = '#8fa2d6';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(110 + Math.cos(a) * 74, 110 + Math.sin(a) * 74); g.lineTo(110 + Math.cos(a + 0.09) * 48, 110 + Math.sin(a + 0.09) * 48); g.lineTo(110 + Math.cos(a - 0.09) * 48, 110 + Math.sin(a - 0.09) * 48); g.fill(); }
    g.beginPath(); g.arc(110, 110, 30, 0, TAU); g.fillStyle = lin(g, 85, 80, 135, 140, '#ff9a5a', '#c2452d'); g.fill(); outline(g, 3); // little Mars
    g.fillStyle = '#a5391f88'; g.beginPath(); g.ellipse(100, 104, 9, 5, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(121, 121, 6, 3.5, -0.3, 0, TAU); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3.5; g.beginPath(); g.ellipse(110, 110, 44, 12, -0.4, 0.25, Math.PI - 0.25); g.stroke();
  });
  tex(scene, 'emblem-ring', 220, 220, (g) => { g.setLineDash([14, 12]); g.lineWidth = 4; g.strokeStyle = '#5fd4ff'; g.beginPath(); g.arc(110, 110, 93, 0, TAU); g.stroke(); });
}

// Lights, screens and machines in the background picture that get a soft animated glow: [x, y, colour, size, min, max, ms]
const GLOWS = [
  [775, 196, '#7fe4ff', 230, 0.10, 0.34, 1700], [483, 256, '#7fe4ff', 140, 0.08, 0.3, 1300], [1190, 252, '#6dff9a', 110, 0.1, 0.42, 620],
  [307, 543, '#ffe066', 150, 0.12, 0.5, 900], [500, 762, '#6dff9a', 120, 0.1, 0.4, 1500], [1195, 748, '#ffe066', 90, 0.08, 0.3, 1100],
  [1500, 480, '#d8ffd0', 330, 0.05, 0.2, 2600], [775, 72, '#ffd23f', 90, 0.1, 0.45, 1000], [770, 657, '#ffd23f', 90, 0.1, 0.4, 1200],
  [432, 157, '#ffd23f', 70, 0.1, 0.4, 1400], [1130, 157, '#ffd23f', 70, 0.1, 0.4, 1600], [770, 890, '#ffd23f', 90, 0.1, 0.4, 1300],
];

export function createBase(bridge) {
  let scene;

  class BaseScene extends Phaser.Scene {
    constructor() { super('base'); }
    preload() { this.load.image('base', 'assets/base.webp'); }

    create() {
      scene = this;
      this.add.image(0, 0, 'base').setOrigin(0).setDisplaySize(WORLD_W, WORLD_H);
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
      sharedTextures(this);
      this.fx = []; this.emitters = [];
      this.buildAmbience();

      // Stations: a glowing floor pad + a floating icon badge.
      this.markers = {};
      for (const [id, st] of Object.entries(STATIONS)) {
        const pad = this.add.image(st.x, st.y + 2, 'pad-yellow').setScale(1 / K).setDepth(2);
        const bg = this.add.image(0, 0, 'badge-yellow').setScale(1 / K).setOrigin(0.5, 0.95);
        const icon = this.add.text(0, -31, st.icon, { fontSize: '19px' }).setOrigin(0.5);
        const badge = this.add.container(st.x, st.y - 44, [bg, icon]).setDepth(4000);
        this.markers[id] = { pad, bg, badge, st, seed: Math.random() * 6, state: 'none' };
      }

      // Astronauts
      this.astros = {};
      for (const id of CREW_IDS) this.astros[id] = this.makeAstro(id);

      this.input.on('pointerdown', (p) => {
        if (bridge.paused()) return;
        const w = p.positionToCamera(this.cameras.main);
        if (DEBUG) console.log('map point', Math.round(w.x), Math.round(w.y));
        const a = this.astros[S.current];
        // Tapping a station walks next to it (never teleports, never auto-completes).
        let tx = w.x, ty = w.y;
        for (const st of Object.values(STATIONS)) if (Math.hypot(st.x - w.x, st.y - w.y) < 40 || Math.hypot(st.x - w.x, st.y - 62 - w.y) < 26) { tx = st.x; ty = st.y; }
        a.path = findPath(a.c.x, a.c.y, tx, ty);
        const end = a.path[a.path.length - 1];
        this.spawn('ripple', end.x, end.y, { life: 500, s0: 0.15, s1: 0.75, a: 0.9, depth: 3 });
      });

      if (SHAPES) {
        const g = this.add.graphics().setDepth(5000);
        g.fillStyle(0x00ff88, 0.3);
        for (const r of Object.values(ROOMS)) g.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
        for (const l of LINKS) { g.lineStyle(l.w * 2, 0x00aaff, 0.3); g.lineBetween(...l.a, ...l.b); }
      }

      this.scale.on('resize', () => this.fitCamera());
      this.fitCamera();
      this.select(S.current);
      this.refresh();
      bridge.ready();
    }

    fitCamera() {
      const { width, height } = this.scale;
      if (QUERY.get('debug') === 'map') return this.cameras.main.setZoom(Math.min(width / WORLD_W, height / WORLD_H));
      this.cameras.main.setZoom(Math.max(width / 1150, height / 660, 0.6));
    }

    // ---------- Astronaut rig: separate legs, arms, body and helmet so they can be animated ----------
    makeAstro(id) {
      const crew = CREW[id];
      astroTextures(this, id, crew.css);
      const [x, y] = STARTS[id];
      const img = (key, px, py, ox = 0.5, oy = 0.5) => this.add.image(px, py, key).setOrigin(ox, oy).setScale(1 / K);
      const ring = img('pad-yellow', 0, 0).setVisible(false);
      const shadow = this.add.ellipse(0, 1, 36, 12, 0x000000, 0.28);
      const legL = img('leg-' + id, -7, -19, 0.5, 0.08), legR = img('leg-' + id, 7, -19, 0.5, 0.08);
      const torso = img('torsoF-' + id, 0, -32);
      const armL = img('arm-' + id, -16, -43, 0.5, 0.08), armR = img('arm-' + id, 16, -43, 0.5, 0.08);
      const head = img('headF-' + id, 0, -58, 0.5, 0.58);
      const eyes = img('eyes', 0, -60);
      const upper = this.add.container(0, 0, [torso, armL, armR, head, eyes]);
      const rig = this.add.container(0, 0, [legL, legR, upper]);
      const tag = img('tag-' + id, 0, -94);
      const pick = img('pick', 0, -112).setVisible(false);
      const c = this.add.container(x, y, [ring, shadow, rig, tag, pick]);
      c.setSize(52, 90).setInteractive(new Phaser.Geom.Rectangle(-26, -86, 52, 90), Phaser.Geom.Rectangle.Contains);
      c.on('pointerdown', (p, lx, ly, ev) => { if (id !== S.current) { ev.stopPropagation(); bridge.select(id); } });
      return { id, c, rig, upper, legL, legR, armL, armR, torso, head, eyes, ring, shadow, pick, path: null,
        ph: 0, walk: 0, face: 'down', back: false, idle: 0, wave: 0, nextWave: 2500 + Math.random() * 6000, blink: 0, nextBlink: 1500 + Math.random() * 2500, hop: 0, seed: Math.random() * 10 };
    }

    animate(o, time, dt, vx, vy) {
      const moving = !!(vx || vy), selected = o.id === S.current;
      o.walk += ((moving ? 1 : 0) - o.walk) * Math.min(1, dt / 110);
      if (moving) {
        o.ph += dt * 0.0125; o.idle = 0; o.wave = 0;
        const stepN = Math.floor(o.ph / Math.PI); if (stepN !== o.stepN) { o.stepN = stepN; if (selected) sfx('stepIn'); }
        o.face = Math.abs(vx) > Math.abs(vy) * 0.8 ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      } else if ((o.idle += dt) > 900) o.face = 'down';
      const back = o.face === 'up';
      if (back !== o.back) { o.back = back; o.torso.setTexture((back ? 'torsoB-' : 'torsoF-') + o.id); o.head.setTexture((back ? 'headB-' : 'headF-') + o.id); }
      const s = Math.sin(o.ph), w = o.walk, side = o.face === 'left' ? -1 : o.face === 'right' ? 1 : 0;
      o.legL.rotation = s * 0.62 * w; o.legR.rotation = -s * 0.62 * w;
      let aL = -s * 0.6 * w + 0.08, aR = s * 0.6 * w - 0.08;
      // Crew members who are waiting wave now and then.
      if (o.wave > 0) { o.wave -= dt; aR = -2.45 + Math.sin(time / 75) * 0.38; }
      else if (!moving && !selected && (o.nextWave -= dt) < 0) { o.wave = 1300; o.nextWave = 5000 + Math.random() * 8000; }
      o.armL.rotation = aL; o.armR.rotation = aR;
      o.upper.y = -Math.abs(s) * 2.6 * w + Math.sin(time / 650 + o.seed) * 0.9 * (1 - w);
      o.upper.rotation = side * 0.07 * w;
      o.head.rotation = side * 0.05 * w + Math.sin(time / 1700 + o.seed) * 0.03 * (1 - w);
      o.shadow.scaleX = 1 - Math.abs(s) * 0.12 * w;
      // Eyes: look where we walk, and blink.
      if ((o.nextBlink -= dt) < 0) { o.blink = 130; o.nextBlink = 1800 + Math.random() * 3200; }
      o.blink -= dt;
      o.eyes.setVisible(!back); o.eyes.x = side * 4.5; o.eyes.scaleY = (o.blink > 0 ? 0.15 : 1) / K;
      // Small hop when selected.
      o.hop = Math.max(0, o.hop - dt);
      o.rig.y = -Math.sin((o.hop / 260) * Math.PI) * 10;
      o.ring.setVisible(selected); o.pick.setVisible(selected);
      if (selected) { o.ring.setScale((1 + Math.sin(time / 260) * 0.08) / K); o.pick.y = -112 + Math.sin(time / 220) * 3; }
      o.c.setDepth(o.c.y);
    }

    select(id) {
      for (const [k, a] of Object.entries(this.astros)) if (k !== id) a.path = null;
      this.astros[id].hop = 260;
      this.cameras.main.startFollow(this.astros[id].c, true, 0.1, 0.1, 0, 30);
      this.lastNear = undefined;
    }

    refresh() {
      for (const [id, m] of Object.entries(this.markers)) {
        const state = bridge.stationState(id); // 'mine' | 'other' | 'info' | 'none'
        m.state = state;
        const col = state === 'mine' ? 'yellow' : state === 'other' ? 'cyan' : 'white';
        m.pad.setTexture('pad-' + col).setVisible(state === 'mine' || state === 'other');
        m.bg.setTexture('badge-' + col);
      }
    }

    // ---------- Ambient life: glows, bubbles, steam, sparkles, dust ----------
    spawn(key, x, y, o = {}) {
      const img = this.add.image(x, y, key).setDepth(o.depth ?? 3);
      if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
      this.fx.push({ img, t: 0, life: 1000, s0: 1, s1: 1, a: 1, vx: 0, vy: 0, spin: 0, ...o });
    }

    every(ms, fn) { this.emitters.push({ ms, acc: Math.random() * ms, fn }); }

    buildAmbience() {
      const R = Phaser.Math.FloatBetween;
      // Hub centre piece
      const ringImg = this.add.image(0, 0, 'emblem-ring').setScale(1 / K);
      this.add.container(778, 530, [this.add.image(0, 0, 'emblem').setScale(1 / K), ringImg]).setScale(0.92, 0.76).setDepth(1).setAlpha(0.95);
      this.tweens.add({ targets: ringImg, rotation: TAU, duration: 24000, repeat: -1 });
      // Glowing screens and lights
      for (const [x, y, col, size, min, max, ms] of GLOWS) {
        const key = softDot(this, 'glow-' + col, col, 64);
        const img = this.add.image(x, y, key).setDisplaySize(size, size * 0.7).setAlpha(min).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
        this.tweens.add({ targets: img, alpha: max, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * ms });
      }
      // Water tanks: rising bubbles
      this.every(260, () => { const x = [333, 395][Math.random() * 2 | 0] + R(-14, 14); this.spawn('bubble', x, 792, { life: 1500, vy: -34, vx: R(-4, 4), s0: 0.35, s1: 0.6, a: 0.9, depth: 1 }); });
      // Engineering: steam from the pipes
      this.every(520, () => this.spawn('dot-steam', 437 + R(-3, 3), 452, { life: 1700, vy: -20, vx: R(-6, 10), s0: 0.2, s1: 0.75, a: 0.5, depth: 1 }));
      // Greenhouse: sparkles on the leaves
      this.every(330, () => { const a = Math.random() * TAU, r = Math.sqrt(Math.random()); this.spawn('spark', 1500 + Math.cos(a) * r * 125, 486 + Math.sin(a) * r * 56, { life: 900, s0: 0.1, s1: 0.5, a: 0.9, spin: 1.2, pop: true, add: true, depth: 1 }); });
      // Antenna: radio waves going up to Earth
      this.every(1100, () => this.spawn('wave', 1447, 62, { life: 1600, s0: 0.25, s1: 1.1, a: 0.85, vy: -14, vx: 9, depth: 1 }));
      // Solar panels: glints of sunlight
      this.every(1400, () => this.spawn('spark', R(40, 215), R(190, 395), { life: 700, s0: 0.1, s1: 0.75, a: 0.95, spin: 2, pop: true, add: true, depth: 1 }));
      // Outside: dust blowing over the ground
      const zones = [[0, 430, 170, 510], [0, 640, 230, 300], [1330, 650, 340, 290], [1340, 0, 330, 250]];
      this.every(170, () => { const [zx, zy, zw, zh] = zones[Math.random() * zones.length | 0]; this.spawn('dot-dust', zx + Math.random() * zw * 0.7, zy + Math.random() * zh, { life: R(2200, 3600), vx: R(16, 34), vy: R(-5, 3), s0: 0.25, s1: 0.9, a: 0.3, pop: true, depth: 1 }); });
    }

    update(time, dt) {
      dt = Math.min(dt, 50);
      const a = this.astros[S.current];
      let vx = 0, vy = 0, free = false;
      if (!bridge.paused()) {
        const k = this.keys;
        vx = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown);
        vy = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown);
        if (vx || vy) { a.path = null; free = true; const n = Math.hypot(vx, vy); vx /= n; vy /= n; }
        else if (a.path?.length) {
          const p = a.path[0], dx = p.x - a.c.x, dy = p.y - a.c.y, d = Math.hypot(dx, dy);
          if (d < 5) { a.path.shift(); } else { vx = dx / d; vy = dy / d; }
        }
      }
      const step = SPEED * dt / 1000;
      let moved = false;
      if (vx || vy) {
        const nx = a.c.x + vx * step, ny = a.c.y + vy * step;
        if (!free || walkable(nx, ny)) { a.c.x = nx; a.c.y = ny; moved = true; }
        else if (walkable(nx, a.c.y)) { a.c.x = nx; moved = true; }
        else if (walkable(a.c.x, ny)) { a.c.y = ny; moved = true; }
      }
      for (const o of Object.values(this.astros)) this.animate(o, time, dt, o === a && moved ? vx : 0, o === a && moved ? vy : 0);

      let near = null, best = REACH;
      for (const [id, st] of Object.entries(STATIONS)) {
        const d = Math.hypot(st.x - a.c.x, st.y - a.c.y);
        if (d < best) { best = d; near = id; }
      }
      if (near !== this.lastNear) { this.lastNear = near; bridge.near(near); }

      // Station badges float; the one you stand at fades so it never hides the astronaut.
      for (const [id, m] of Object.entries(this.markers)) {
        const mine = m.state === 'mine', amp = mine ? 6 : 2.5;
        m.badge.y = m.st.y - 44 + Math.sin(time / (mine ? 240 : 520) + m.seed) * amp;
        const base = mine ? 1 : m.state === 'other' ? 0.85 : m.state === 'info' ? 0.7 : 0.4;
        const want = id === near ? 0.2 : base;
        m.badge.alpha += (want - m.badge.alpha) * 0.15;
        m.badge.setScale(mine ? 1 + Math.sin(time / 240 + m.seed) * 0.05 : m.state === 'other' ? 0.85 : 0.68);
        if (m.pad.visible) { m.pad.setScale((1 + Math.sin(time / 330 + m.seed) * 0.1) / K); m.pad.alpha = 0.75 + Math.sin(time / 330 + m.seed) * 0.25; }
      }

      for (const e of this.emitters) { e.acc += dt; if (e.acc >= e.ms) { e.acc = 0; e.fn(); } }
      for (let i = this.fx.length - 1; i >= 0; i--) {
        const f = this.fx[i]; f.t += dt;
        const p = f.t / f.life;
        if (p >= 1) { f.img.destroy(); this.fx.splice(i, 1); continue; }
        f.img.x += f.vx * dt / 1000; f.img.y += f.vy * dt / 1000; f.img.rotation += f.spin * dt / 1000;
        f.img.setScale(f.s0 + (f.s1 - f.s0) * (f.pop ? Math.sin(p * Math.PI) : p));
        f.img.alpha = f.a * (f.pop ? Math.sin(p * Math.PI) : 1 - p * p);
      }
    }
  }

  new Phaser.Game({
    // Canvas renderer: plenty for one picture + a few sprites, and it leaves WebGL to the 3D rover.
    type: Phaser.CANVAS, parent: 'game', backgroundColor: '#c2452d',
    scale: { mode: Phaser.Scale.RESIZE, width: Math.max(320, window.innerWidth), height: Math.max(240, window.innerHeight) },
    scene: BaseScene, render: { antialias: true },
  });

  return {
    select: (id) => scene?.select(id),
    refresh: () => scene?.refresh(),
    resetPositions: () => { if (scene) for (const id of CREW_IDS) { const a = scene.astros[id]; [a.c.x, a.c.y] = STARTS[id]; a.path = null; a.face = 'down'; } },
  };
}
