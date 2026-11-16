import { deriveRoomVisualState, describeRoomVisuals } from './data/room-visual-state.js';

const W = 1672, H = 941, NAVY = '#162b42', CYAN = '#79e8f5', GREEN = '#a7f3c0', AMBER = '#ffc66b';
const POINTS = { command: [780, 232], lab: [453, 284], medbay: [1150, 285], generator: [314, 537], greenhouse: [1506, 506], air: [450, 765], crew: [1120, 493], kitchen: [1100, 747], airlock: [775, 792] };

// One cached foreground plate plus a handful of animated instruments. The base
// remains an illustrated room; repairs become physical foreground state changes.
export function createRoomVisuals(scene) {
  const texture = scene.textures.createCanvas('room-foreground', W, H), g = texture.getContext();
  const plate = scene.add.image(0, 0, 'room-foreground').setOrigin(0).setDepth(1.1);
  const motion = scene.add.graphics().setDepth(1.4);
  const result = scene.add.graphics().setDepth(3900);
  const resultText = scene.add.text(0, 0, '', { fontFamily: 'Trebuchet MS', fontSize: '15px', fontStyle: 'bold', color: '#eaffef', backgroundColor: '#142c40', padding: { x: 12, y: 7 } }).setOrigin(.5).setDepth(3901).setVisible(false);
  // Keep the original healthy illustration. The alternate state is an aligned
  // edit of that same dome, not freestanding plants on an opaque replacement bed.
  const damaged = scene.add.image(0, 0, 'base-wilted').setOrigin(0).setDisplaySize(W, H).setDepth(.04).setCrop(1340, 294, 331, 322).setAlpha(0);
  // Compose the night crop before fading the whole scene. Independently fading
  // two overlapping pictures would reveal healthy leaves and a rectangular seam.
  const nightTexture = scene.textures.createCanvas('base-night-state', W, H), nightContext = nightTexture.getContext();
  const nightSource = scene.textures.get('base-night').getSourceImage();
  const nightWilted = scene.textures.get('base-night-wilted').getSourceImage();
  function redrawNight() {
    nightContext.clearRect(0, 0, W, H);
    nightContext.drawImage(nightSource, 0, 0, W, H);
    nightContext.globalAlpha = damaged.alpha;
    nightContext.drawImage(nightWilted, 1340, 294, 331, 322, 1340 * W / 1671, 294, 331 * W / 1671, 322);
    nightContext.globalAlpha = 1; nightTexture.refresh();
  }
  redrawNight(); scene.night.setTexture('base-night-state').setDisplaySize(W, H);
  let current = null, signature = '', elapsed = 0, pending = [], active = null, cropTransition = null;

  function box(x, y, w, h, fill = NAVY, radius = 7, stroke = '#81acc3') {
    g.beginPath(); g.roundRect(x, y, w, h, radius); g.fillStyle = fill; g.fill();
    if (stroke) { g.lineWidth = 2; g.strokeStyle = stroke; g.stroke(); }
  }
  function text(label, x, y, color = '#dff7fa', size = 10, align = 'left') {
    g.font = `bold ${size}px "Trebuchet MS", sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(label, x, y);
  }
  function line(points, color, width = 3) {
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  }
  function circle(x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  function capsule(x, y, color = CYAN) {
    box(x - 8, y - 14, 16, 28, '#102a3b', 5, '#c9e6ed');
    box(x - 5, y - 5, 10, 15, color, 2, null); box(x - 8, y - 15, 16, 5, '#d5e5ef', 2, null);
    line([[x - 3, y - 8], [x - 3, y + 4]], '#ffffffbb', 2);
  }
  function redraw(v) {
    g.clearRect(0, 0, W, H);
    // Command: the actual central monitor reports the decision and shield state.
    box(695, 165, 163, 72, '#0b253a', 4, '#68dff0');
    circle(729, 198, 23, v.command === 'resolved' ? '#184d4a' : '#533e2c');
    g.strokeStyle = v.command === 'resolved' ? GREEN : AMBER; g.lineWidth = 3; g.beginPath();
    if (v.command === 'resolved') { g.moveTo(716, 198); g.lineTo(726, 208); g.lineTo(743, 186); }
    else { g.moveTo(729, 184); g.lineTo(729, 200); g.moveTo(729, 207); g.lineTo(729, 210); } g.stroke();
    text(v.command === 'resolved' ? 'PLAN RECORDED' : 'DECISION NEEDED', 762, 181, v.command === 'resolved' ? GREEN : AMBER, 9);
    text(v.shield === 'safe' ? 'SHIELD SECURE' : 'SHIELD LOW', 762, 198, v.shield === 'safe' ? '#9ccedf' : AMBER, 9);
    for (let i = 0; i < 6; i++) box(762 + i * 12, 213 - i * 2, 7, 7 + i * 2, i < 4 || v.shield === 'safe' ? '#55c5d4' : '#54402b', 1, null);

    // Science: collected discoveries remain as physical sealed specimens.
    box(310, 265, 96, 46, '#203b54', 5, '#789ab4');
    for (let i = 0; i < 5; i++) {
      if (i < v.lab) capsule(322 + i * 18, 286, ['#9be8ef','#e4b487','#a9ebad','#d9b8fa','#ffd670'][i]);
      else { box(316 + i * 18, 274, 11, 27, '#122a3c', 3, '#54768c'); line([[319 + i * 18, 295],[324 + i * 18,295]], '#6e8999', 2); }
    }
    text('FIELD SAMPLES', 358, 317, '#c3e9f2', 8, 'center');

    // Medical monitor: completed scan adds a visible record by the bed.
    box(1158, 230, 71, 42, '#081e27', 3, '#97b6c3');
    const ecg = v.medical === 'attention' ? AMBER : GREEN;
    line([[1164,254],[1174,254],[1179,244],[1185,262],[1193,237],[1199,254],[1222,254]], ecg, 2);
    if (v.medical === 'checked') { box(1091, 277, 29, 35, '#d5e6eb', 3, '#34516b'); line([[1097,292],[1103,298],[1114,284]], '#248c68', 3); }

    // Engineering: replace a blank cabinet face with an output turbine and cells.
    box(277, 501, 69, 77, '#3c617b', 6, '#b6d0da');
    box(283, 507, 57, 58, '#112c43', 4, '#6f9eac');
    circle(311, 536, 22, '#244e62'); circle(311, 536, 17, '#0d2539'); circle(311, 536, 5, '#b5dce3');
    const output = v.engineering === 'low-power' ? 2 : v.engineering === 'serviced' ? 6 : 4;
    for (let i = 0; i < 6; i++) box(283 + i * 9, 570, 6, 4, i < output ? v.engineering === 'low-power' ? AMBER : '#9becba' : '#172b3e', 1, null);

    // Water: a repaired connector is a solid circuit; a frozen one has a gap.
    line([[423,731],[448,731],[448,775],[465,775]], '#12324d', 13);
    line([[423,731],[448,731],[448,775],[465,775]], '#a8c7d4', 8);
    if (v.water === 'frozen') { box(437, 747, 22, 17, '#b4dce8', 3, '#eafcff'); line([[440,748],[454,761]], '#5a839b', 2); text('FROZEN', 450, 789, AMBER, 8, 'center'); }
    else { box(440, 746, 16, 19, '#1d756f', 3, '#b2edec'); text('FLOW', 449, 789, GREEN, 8, 'center'); }

    // Greenhouse geometry, crops and glass stay in the original illustration.

    // Crew quarters: shutters and a lamp signal rest without moving readable UI.
    if (v.crew === 'resting') { box(991,453,202,93,'#10234488',7,null); text('REST CYCLE', 1100, 535, '#acd2ec', 9, 'center'); }
    else if (v.crew === 'tired') { box(1227, 468, 33, 26, '#2a344d', 5, AMBER); text('REST', 1243,481, AMBER,8,'center'); }
    circle(1240, 455, 5, v.crew === 'resting' ? '#8cbddd' : '#ffe2a6');

    // Kitchen: a real tray fills and empties with available supplies.
    box(1083, 742, 51, 21, '#bacbd1', 5, '#426078');
    if (v.kitchen !== 'low') for (const [i,x] of [1095,1110,1122].entries()) { circle(x,750,7,i === 2 ? '#edc05a' : '#e7633e'); line([[x-3,744],[x,747],[x+3,744]], '#70c56c',2); }
    else { text('LOW',1108,752, '#6c4734',8,'center'); }
    if (v.kitchen === 'fresh') { g.beginPath(); g.ellipse(1099,743,8,4,-.5,0,Math.PI*2); g.fillStyle='#92d783';g.fill(); }

    // Airlock/storage: returning samples are sealed onto a rack by the crates.
    box(680, 756, 87, 34, '#1b344c', 5, '#7798ae');
    for (let i = 0; i < 3; i++) if (i < v.cargo) capsule(698 + i * 25, 772, ['#d3af83','#87c6dc','#c5cbd3'][i]);
    else box(689 + i * 25,764,17,20,'#132a3c',3,'#45677d');
    text(v.cargo ? 'RETURNED SAMPLES' : 'FIELD KIT READY', 724, 800, '#d7ecf1', 8, 'center');

    // The hub records the campaign arc as five physical mission lights.
    for (let i = 0; i < 5; i++) { circle(736 + i * 21, 620, 7, i < v.milestones ? '#87d5c1' : '#365471'); circle(736 + i * 21, 618, 3, i < v.milestones ? '#e4fff1' : '#56718a'); }
    // Dust is a layer over the actual two panel banks, not a generic screen tint.
    if (v.solar === 'dusty') {
      g.fillStyle = '#d79c6c88';
      for (const points of [[[30,193],[183,141],[223,237],[70,278]],[[23,336],[175,285],[216,381],[61,426]]]) {
        g.beginPath(); points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
      }
      for (let i = 0; i < 45; i++) { const x=50+(i*31%138),y=(i%2?320:179)+(i*17%59);circle(x,y,2+i%3,'#c18b66aa'); }
    }
    texture.refresh();
  }

  function setState(state) {
    const next = deriveRoomVisualState(state), key = JSON.stringify(next);
    if (key === signature) return;
    const rescued = current?.greenhouse === 'wilting' && next.greenhouse === 'recovered';
    current = next; signature = key; redraw(next);
    if (rescued) cropTransition = 0;
    else { cropTransition = null; damaged.setAlpha(next.greenhouse === 'wilting' ? 1 : 0); }
    redrawNight();
  }

  function update(dt, paused, reduced) {
    if (!current || paused) return;
    elapsed += dt;
    motion.clear();
    const t = reduced ? 0 : elapsed / 1000;
    if (cropTransition != null) {
      cropTransition += dt;
      const p = Math.min(1, cropTransition / (reduced ? 120 : 260));
      damaged.setAlpha(1-p);
      redrawNight();
      if (p===1) cropTransition = null;
    }
    // Slow, causal motion: turbine blades, water in pipes and a scanner sweep.
    const col = current.engineering === 'low-power' ? 0xffc66b : 0x83e3dc;
    motion.lineStyle(4,col,.8);
    for (let i=0;i<4;i++) { const angle=t*(current.engineering==='low-power'?.4:1.3)+i*Math.PI/2;motion.lineBetween(311+Math.cos(angle)*7,536+Math.sin(angle)*7,311+Math.cos(angle+.3)*16,536+Math.sin(angle+.3)*16); }
    if (current.water !== 'frozen') {
      motion.fillStyle(0xa8ffef,.95);
      for(let i=0;i<3;i++) {const p=(t*.23+i/3)%1; const x=p<.35?423+p/.35*25:448;const y=p<.35?731:731+(p-.35)/.65*44;motion.fillCircle(x,y,2.4);}
    }
    if (current.medical === 'checked') {motion.lineStyle(1,0xafffce,.4);const x=1161+(t*18%64);motion.lineBetween(x,234,x,268);}

    if (!active && pending.length) {
      active = { ...pending.shift(), time: 0 };
      resultText.setText(active.label).setPosition(active.x, active.y - 64).setVisible(true);
      if (!reduced) {
        const crew = scene.astros?.[active.who]; if (crew) { crew.wave = 900; crew.nextWave = 6500; }
      }
    }
    result.clear();
    if (active) {
      active.time += dt;
      const duration = reduced ? 900 : 1200, p = Math.min(1,active.time/duration), opacity = Math.min(1,p*8,(1-p)*5);
      resultText.setAlpha(opacity);
      resultText.y = active.y - 64 - (reduced ? 0 : Math.min(1,p*3)*7);
      result.lineStyle(3,0xc1ffe0,opacity*.85);result.strokeEllipse(active.x,active.y,reduced?64:50+p*70,reduced?22:18+p*23);
      if(p>=1){active=null;resultText.setVisible(false);result.clear();}
    }
  }
  function complete(task) {
    const [x,y] = POINTS[task.station] || [780,530];
    const labels = { generator:'OUTPUT STEADY', greenhouse:'CROP CARE COMPLETE', air:'WATER FLOW RESTORED', command:'TRANSMISSION SENT', lab:'EVIDENCE STORED', medbay:'SCAN RECORDED', airlock:'SAMPLES SECURED', kitchen:'SUPPLIES READY', crew:'CREW READY' };
    // Identical accepted tasks cannot produce stacked repeat celebrations.
    const key = `${task.id}:${task.title}`;
    if (pending.some(item=>item.key===key) || active?.key===key) return;
    pending.push({x,y,who:task.who,key,label:task.id === 'crisis' ? 'MISSION PLAN UPDATED' : labels[task.station]||'TASK COMPLETE'});
  }
  function reset() { pending=[];active=null;cropTransition=null;signature='';result.clear();resultText.setVisible(false); }
  return { setState, update, complete, reset, describe:()=>current?describeRoomVisuals(current):[], destroy:()=>{plate.destroy();motion.destroy();result.destroy();resultText.destroy();damaged.destroy();nightTexture.destroy();texture.destroy();} };
}
